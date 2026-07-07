import { bestLoadout } from './plates';
import type {
  BBBConfig,
  MainLift,
  PlateInventory,
  PrescribedSet,
  WeekTemplate,
} from './types';

/**
 * Standard 5/3/1 weekly progression. Week 4 is the deload (no AMRAP).
 * The final set of weeks 1-3 is the AMRAP ("+") set that drives progression.
 */
export const WEEK_TEMPLATES: WeekTemplate[] = [
  {
    week: 1,
    label: "5's week",
    isDeload: false,
    mainSets: [
      { percent: 65, reps: 5, isAmrap: false },
      { percent: 75, reps: 5, isAmrap: false },
      { percent: 85, reps: 5, isAmrap: true },
    ],
  },
  {
    week: 2,
    label: "3's week",
    isDeload: false,
    mainSets: [
      { percent: 70, reps: 3, isAmrap: false },
      { percent: 80, reps: 3, isAmrap: false },
      { percent: 90, reps: 3, isAmrap: true },
    ],
  },
  {
    week: 3,
    label: '5/3/1 week',
    isDeload: false,
    mainSets: [
      { percent: 75, reps: 5, isAmrap: false },
      { percent: 85, reps: 3, isAmrap: false },
      { percent: 95, reps: 1, isAmrap: true },
    ],
  },
  {
    week: 4,
    label: 'Deload',
    isDeload: true,
    mainSets: [
      { percent: 40, reps: 5, isAmrap: false },
      { percent: 50, reps: 5, isAmrap: false },
      { percent: 60, reps: 5, isAmrap: false },
    ],
  },
];

/** Wendler-recommended warmups, applied before work sets on non-deload weeks. */
export const WARMUP_SETS = [
  { percent: 40, reps: 5 },
  { percent: 50, reps: 5 },
  { percent: 60, reps: 3 },
];

export function getWeekTemplate(week: number): WeekTemplate {
  const t = WEEK_TEMPLATES.find((w) => w.week === week);
  if (!t) throw new Error(`Invalid 5/3/1 week: ${week}`);
  return t;
}

/** Estimated one-rep max via the Epley formula. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Build the prescribed main work sets (optionally including warmups) for a lift + week. */
export function generateMainSets(
  lift: MainLift,
  week: number,
  inv: PlateInventory,
  includeWarmups = true,
): PrescribedSet[] {
  const template = getWeekTemplate(week);
  const sets: PrescribedSet[] = [];

  if (includeWarmups && !template.isDeload) {
    for (const w of WARMUP_SETS) {
      const loadout = bestLoadout((w.percent / 100) * lift.trainingMax, inv);
      sets.push({
        label: `Warmup ${w.percent}%`,
        targetWeight: loadout.weight,
        targetReps: w.reps,
        isAmrap: false,
        loadout,
      });
    }
  }

  template.mainSets.forEach((s, i) => {
    const loadout = bestLoadout((s.percent / 100) * lift.trainingMax, inv);
    sets.push({
      label: `Main ${i + 1} · ${s.percent}%`,
      targetWeight: loadout.weight,
      targetReps: s.reps,
      isAmrap: s.isAmrap,
      loadout,
    });
  });

  return sets;
}

/** Build the Boring But Big supplemental sets. */
export function generateBBB(
  lift: MainLift,
  bbb: BBBConfig,
  inv: PlateInventory,
): PrescribedSet[] {
  const loadout = bestLoadout((bbb.percentOfTM / 100) * lift.trainingMax, inv);
  return Array.from({ length: bbb.sets }, (_, i) => ({
    label: `BBB ${i + 1}/${bbb.sets} · ${bbb.percentOfTM}%`,
    targetWeight: loadout.weight,
    targetReps: bbb.reps,
    isAmrap: false,
    loadout,
  }));
}
