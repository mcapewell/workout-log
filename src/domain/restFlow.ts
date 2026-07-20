// Derives what to load next on the rest timer from a single ordered view of the
// whole workout (main + BBB bar sets, then accessory sets in order). Pure — no
// framework, no store. See issue #29: completing any set should surface the load
// for the genuinely-next set, crossing the bar→accessory and exercise boundaries,
// and the final set has no next set so it reports "workout complete".

import { bestLoadout } from './plates';
import type {
  AccessoryExercise,
  PlateInventory,
  PrescribedSet,
  RestLoad,
} from './types';

export interface RestFlow {
  /** `restAfter[k]` is what to show while resting after completing flat set `k`
   * (i.e. the load for set `k + 1`, or a "workout complete" marker for the last). */
  restAfter: RestLoad[];
  /** Flat index where each accessory exercise's sets begin, keyed by exercise id.
   * Map an accessory (exerciseId, setIndex) to its flat position with
   * `accOffset[exerciseId] + setIndex`. */
  accOffset: Record<string, number>;
}

/** The load hint for one upcoming bar set. */
function barLoad(set: PrescribedSet, inventory: PlateInventory): RestLoad {
  return {
    label: `Up next · ${set.targetWeight}kg × ${set.targetReps}`,
    loadout: set.loadout,
    barWeight: inventory.barWeight,
  };
}

/** The load hint for an upcoming accessory set. Cable exercises use a pin stack,
 * so they carry no plate breakdown — just the label with the working weight. */
function accessoryLoad(ex: AccessoryExercise, inventory: PlateInventory): RestLoad {
  const isCable = (ex.equipment ?? 'cable') === 'cable';
  return {
    label: `Up next · ${ex.name} · ${ex.weight}kg`,
    loadout: isCable
      ? null
      : bestLoadout(ex.weight, { ...inventory, barWeight: ex.barWeight ?? 0 }),
    barWeight: ex.barWeight ?? 0,
  };
}

/**
 * Build the ordered rest-flow for a workout: every bar set followed by every
 * accessory set, with each position mapped to the load of the *following* set.
 */
export function buildRestFlow(
  barSets: PrescribedSet[],
  exercises: AccessoryExercise[],
  inventory: PlateInventory,
): RestFlow {
  // Load hint for each set in workout order (what to load when it's "next").
  const loads: RestLoad[] = [
    ...barSets.map((s) => barLoad(s, inventory)),
    ...exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, () => accessoryLoad(ex, inventory)),
    ),
  ];

  // Resting after set k points at set k+1; the final set has no successor.
  const restAfter: RestLoad[] = loads.map(
    (_, k) => loads[k + 1] ?? { label: 'Workout complete', complete: true },
  );

  const accOffset: Record<string, number> = {};
  let offset = barSets.length;
  for (const ex of exercises) {
    accOffset[ex.id] = offset;
    offset += ex.sets;
  }

  return { restAfter, accOffset };
}
