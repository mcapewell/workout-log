// Core domain types. Pure data — no framework, no persistence concerns.

export type Unit = 'kg';

export type MainLiftId = 'ohp' | 'deadlift' | 'bench' | 'squat';
export type LiftCategory = 'upper' | 'lower';

export interface MainLift {
  id: MainLiftId;
  name: string;
  category: LiftCategory;
  /** Training Max in kg (typically 90% of true 1RM). All main %s are of this. */
  trainingMax: number;
  /** kg added to the Training Max after a successful cycle (2.5 upper / 5 lower). */
  increment: number;
}

/** A physical plate the user owns. `count` is the TOTAL owned (per-side = floor(count/2)). */
export interface Plate {
  weight: number;
  count: number;
}

export interface PlateInventory {
  barWeight: number;
  plates: Plate[];
}

/** One plate placed on one side of the bar, with how many of that plate. */
export interface LoadoutEntry {
  weight: number;
  count: number;
}

export interface Loadout {
  /** Actual total bar weight achieved (may differ from the requested target). */
  weight: number;
  /** Plates per side, heaviest first. */
  perSide: LoadoutEntry[];
}

export interface BBBConfig {
  percentOfTM: number;
  sets: number;
  reps: number;
  /** false = same lift as the main work; true = the opposing lift. */
  useOppositeLift: boolean;
}

/** A named set of accessory exercises (e.g. "Arms" / "Back & Shoulders") that
 * the user alternates between on successive workouts. */
export interface AccessoryGroup {
  id: string;
  name: string;
  exercises: AccessoryExercise[];
}

export type AccessoryEquipment = 'cable' | 'barbell' | 'dumbbell';

export interface AccessoryExercise {
  id: string;
  name: string;
  sets: number;
  repMin: number;
  repMax: number;
  /** Current working weight in kg. */
  weight: number;
  /** Smallest weight step for this exercise's equipment (e.g. cable stack pin). */
  increment: number;
  /** Consecutive sessions that fell below repMin — used to back off after 2. */
  failStreak: number;
  /** How this exercise is loaded. Drives the plate calculator: cable = stack
   * only (no plates), barbell/dumbbell = per-side plate breakdown. Legacy
   * persisted data may omit this — treat missing as 'cable'. */
  equipment?: AccessoryEquipment;
  /** Bar/handle weight in kg for barbell & dumbbell loading; ignored for cable. */
  barWeight?: number;
}

/** One prescribed set the app tells the user to perform. */
export interface PrescribedSet {
  label: string;
  targetWeight: number;
  targetReps: number;
  isAmrap: boolean;
  /** True for 5/3/1 warm-up sets (they rest less than working sets). */
  isWarmup?: boolean;
  loadout: Loadout;
}

export interface MainSetTemplate {
  percent: number;
  reps: number;
  isAmrap: boolean;
}

export interface WeekTemplate {
  week: number;
  label: string;
  isDeload: boolean;
  mainSets: MainSetTemplate[];
}
