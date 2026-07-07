import { getWeekTemplate, roundToHalf } from './fiveThreeOne';
import type { AccessoryExercise, MainLift } from './types';

// ---- Main lift (5/3/1) progression ------------------------------------------

export type MainAction = 'increase' | 'reset' | 'hold';

export interface MainProgressionResult {
  action: MainAction;
  newTrainingMax: number;
  reason: string;
}

/** The base rep target of a given week's AMRAP set (what you must at least hit). */
export function amrapBaseReps(week: number): number {
  const t = getWeekTemplate(week);
  const amrap = t.mainSets.find((s) => s.isAmrap);
  return amrap ? amrap.reps : 0;
}

/**
 * Did the lifter meet the minimum on a week's AMRAP set? Missing it is the
 * signal to back off rather than add weight.
 */
export function hitAmrapMinimum(week: number, amrapReps: number): boolean {
  return amrapReps >= amrapBaseReps(week);
}

/**
 * Decide the next Training Max at the end of a cycle.
 *
 * @param cycleAmrapReps AMRAP reps recorded on weeks 1,2,3 (deload has no AMRAP).
 *   Any missed minimum triggers a Wendler reset (TM -> 90%). Otherwise the TM
 *   increases by the lift's configured increment. TMs are rounded to 0.5 kg;
 *   the actual working weights are snapped to loadable when the sets are built.
 */
export function evaluateCycle(
  lift: MainLift,
  cycleAmrapReps: { week: number; reps: number }[],
): MainProgressionResult {
  const missed = cycleAmrapReps.find((r) => !hitAmrapMinimum(r.week, r.reps));

  if (missed) {
    return {
      action: 'reset',
      newTrainingMax: roundToHalf(lift.trainingMax * 0.9),
      reason: `Missed the ${amrapBaseReps(missed.week)}-rep minimum in week ${missed.week}; resetting Training Max to 90%.`,
    };
  }

  return {
    action: 'increase',
    newTrainingMax: roundToHalf(lift.trainingMax + lift.increment),
    reason: `Hit all AMRAP minimums; +${lift.increment}kg to Training Max.`,
  };
}

// ---- Accessory (double progression) -----------------------------------------

export type AccessoryAction = 'increase' | 'hold' | 'decrease';

export interface AccessoryProgressionResult {
  action: AccessoryAction;
  exercise: AccessoryExercise;
  reason: string;
}

/**
 * Double progression: hit the top of the rep range on every set -> add weight and
 * reset toward the bottom of the range. Fall below the bottom -> hold, and back off
 * after two consecutive failing sessions. Otherwise keep the weight and chase reps.
 */
export function progressAccessory(
  ex: AccessoryExercise,
  sessionReps: number[],
): AccessoryProgressionResult {
  const completedAllSets = sessionReps.length >= ex.sets;
  const allHitTop = completedAllSets && sessionReps.every((r) => r >= ex.repMax);
  const anyBelowMin = sessionReps.some((r) => r < ex.repMin);

  if (allHitTop) {
    return {
      action: 'increase',
      exercise: { ...ex, weight: ex.weight + ex.increment, failStreak: 0 },
      reason: `All sets reached ${ex.repMax} reps; +${ex.increment}kg next time.`,
    };
  }

  if (anyBelowMin) {
    const failStreak = ex.failStreak + 1;
    if (failStreak >= 2) {
      return {
        action: 'decrease',
        exercise: {
          ...ex,
          weight: Math.max(0, ex.weight - ex.increment),
          failStreak: 0,
        },
        reason: `Below ${ex.repMin} reps two sessions running; backing weight down ${ex.increment}kg.`,
      };
    }
    return {
      action: 'hold',
      exercise: { ...ex, failStreak },
      reason: `Below ${ex.repMin} reps; holding weight (back off if it happens again).`,
    };
  }

  return {
    action: 'hold',
    exercise: { ...ex, failStreak: 0 },
    reason: 'In range; hold weight and add reps next session.',
  };
}
