import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dexieStorage } from '../platform/storage';
import { DEFAULT_INVENTORY } from '../domain/plates';
import { estimate1RM } from '../domain/fiveThreeOne';
import { evaluateCycle, progressAccessory } from '../domain/progression';
import type {
  AccessoryExercise,
  BBBConfig,
  MainLift,
  MainLiftId,
  PlateInventory,
} from '../domain/types';

export interface RestDefaults {
  main: number;
  bbb: number;
  accessory: number;
}

/** A logged accessory result for one session. */
export interface AccessoryLog {
  id: string;
  name: string;
  weight: number;
  reps: number[];
}

export interface SessionRecord {
  id: string;
  date: string;
  cycle: number;
  week: number;
  liftId: MainLiftId;
  liftName: string;
  /** AMRAP reps on the top set (undefined on deload weeks). */
  amrapReps?: number;
  amrapWeight?: number;
  estimated1RM?: number;
  totalReps: number;
  totalVolumeKg: number;
  accessories: AccessoryLog[];
}

export interface ProgramState {
  cycle: number;
  week: number; // 1..4
  dayIndex: number; // 0..dayOrder.length-1
  /** Per-lift AMRAP reps accumulated over the current cycle's weeks 1-3. */
  liftCycleAmrap: Partial<Record<MainLiftId, { week: number; reps: number }[]>>;
}

export interface AppConfig {
  mainLifts: MainLift[];
  dayOrder: MainLiftId[];
  inventory: PlateInventory;
  bbb: BBBConfig;
  accessories: AccessoryExercise[];
  rest: RestDefaults;
  includeWarmups: boolean;
}

interface FinishPayload {
  amrapReps?: number;
  amrapWeight?: number;
  totalReps: number;
  totalVolumeKg: number;
  accessories: AccessoryLog[];
}

interface AppState {
  setupComplete: boolean;
  config: AppConfig;
  program: ProgramState;
  history: SessionRecord[];

  completeSetup: (config: AppConfig) => void;
  updateConfig: (partial: Partial<AppConfig>) => void;
  currentLift: () => MainLift;
  finishWorkout: (payload: FinishPayload) => SessionRecord;
  importState: (data: Partial<AppState>) => void;
  resetAll: () => void;
}

const DEFAULT_LIFTS: MainLift[] = [
  { id: 'ohp', name: 'Overhead Press', category: 'upper', trainingMax: 62, increment: 2.5 },
  { id: 'deadlift', name: 'Deadlift', category: 'lower', trainingMax: 140, increment: 5 },
  { id: 'bench', name: 'Bench Press', category: 'upper', trainingMax: 83, increment: 2.5 },
  { id: 'squat', name: 'Squat', category: 'lower', trainingMax: 132, increment: 5 },
];

const DEFAULT_ACCESSORIES: AccessoryExercise[] = [
  { id: 'row', name: 'Cable Row', sets: 3, repMin: 10, repMax: 15, weight: 20, increment: 2.5, failStreak: 0 },
  { id: 'pushdown', name: 'Tricep Pushdown', sets: 3, repMin: 12, repMax: 15, weight: 15, increment: 2.5, failStreak: 0 },
  { id: 'curl', name: 'Cable Curl', sets: 3, repMin: 12, repMax: 15, weight: 12.5, increment: 2.5, failStreak: 0 },
  { id: 'facepull', name: 'Face Pull', sets: 3, repMin: 15, repMax: 20, weight: 10, increment: 2.5, failStreak: 0 },
];

export const DEFAULT_CONFIG: AppConfig = {
  mainLifts: DEFAULT_LIFTS,
  dayOrder: ['ohp', 'deadlift', 'bench', 'squat'],
  inventory: DEFAULT_INVENTORY,
  bbb: { percentOfTM: 50, sets: 5, reps: 10, useOppositeLift: false },
  accessories: DEFAULT_ACCESSORIES,
  rest: { main: 180, bbb: 90, accessory: 75 },
  includeWarmups: true,
};

const INITIAL_PROGRAM: ProgramState = {
  cycle: 1,
  week: 1,
  dayIndex: 0,
  liftCycleAmrap: {},
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      setupComplete: false,
      config: DEFAULT_CONFIG,
      program: INITIAL_PROGRAM,
      history: [],

      completeSetup: (config) => set({ config, setupComplete: true }),

      updateConfig: (partial) =>
        set((s) => ({ config: { ...s.config, ...partial } })),

      currentLift: () => {
        const { config, program } = get();
        const liftId = config.dayOrder[program.dayIndex];
        return config.mainLifts.find((l) => l.id === liftId) ?? config.mainLifts[0];
      },

      finishWorkout: (payload) => {
        const state = get();
        const { config, program } = state;
        const lift = config.dayOrder[program.dayIndex];
        const liftObj = config.mainLifts.find((l) => l.id === lift)!;
        const isDeload = program.week === 4;

        const record: SessionRecord = {
          id: `${Date.now()}`,
          date: new Date().toISOString(),
          cycle: program.cycle,
          week: program.week,
          liftId: lift,
          liftName: liftObj.name,
          amrapReps: isDeload ? undefined : payload.amrapReps,
          amrapWeight: isDeload ? undefined : payload.amrapWeight,
          estimated1RM:
            !isDeload && payload.amrapReps && payload.amrapWeight
              ? Math.round(estimate1RM(payload.amrapWeight, payload.amrapReps) * 10) / 10
              : undefined,
          totalReps: payload.totalReps,
          totalVolumeKg: payload.totalVolumeKg,
          accessories: payload.accessories,
        };

        // 1) Record AMRAP for the cycle (weeks 1-3 only).
        const liftCycleAmrap = { ...program.liftCycleAmrap };
        if (!isDeload && payload.amrapReps !== undefined) {
          const prior = liftCycleAmrap[lift] ?? [];
          liftCycleAmrap[lift] = [...prior, { week: program.week, reps: payload.amrapReps }];
        }

        // 2) Apply accessory double-progression using this session's reps.
        const accessories = config.accessories.map((ex) => {
          const logged = payload.accessories.find((a) => a.id === ex.id);
          if (!logged || logged.reps.length === 0) return ex;
          return progressAccessory(ex, logged.reps).exercise;
        });

        // 3) Advance the schedule; roll the cycle over after the deload week.
        let { cycle, week, dayIndex } = program;
        let mainLifts = config.mainLifts;
        let finalCycleAmrap = liftCycleAmrap;

        dayIndex += 1;
        if (dayIndex >= config.dayOrder.length) {
          dayIndex = 0;
          week += 1;
          if (week > 4) {
            // Cycle complete: progress or reset each lift's Training Max.
            mainLifts = config.mainLifts.map((l) => {
              const reps = liftCycleAmrap[l.id] ?? [];
              const result = evaluateCycle(l, reps);
              return { ...l, trainingMax: result.newTrainingMax };
            });
            week = 1;
            cycle += 1;
            finalCycleAmrap = {};
          }
        }

        set({
          history: [record, ...state.history],
          config: { ...config, accessories, mainLifts },
          program: { cycle, week, dayIndex, liftCycleAmrap: finalCycleAmrap },
        });

        return record;
      },

      importState: (data) =>
        set((s) => ({
          setupComplete: data.setupComplete ?? s.setupComplete,
          config: data.config ?? s.config,
          program: data.program ?? s.program,
          history: data.history ?? s.history,
        })),

      resetAll: () =>
        set({
          setupComplete: false,
          config: DEFAULT_CONFIG,
          program: INITIAL_PROGRAM,
          history: [],
        }),
    }),
    {
      name: 'workout-log-state',
      storage: createJSONStorage(() => dexieStorage),
      partialize: (s) => ({
        setupComplete: s.setupComplete,
        config: s.config,
        program: s.program,
        history: s.history,
      }),
    },
  ),
);

