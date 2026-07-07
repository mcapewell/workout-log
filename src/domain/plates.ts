import type { Loadout, LoadoutEntry, PlateInventory } from './types';

// All plate math is done in integer "quarter-kilograms" to avoid floating point
// error, since the smallest meaningful increment across common plates (0.5, 1.25)
// divides evenly into 0.25 kg.
const QUARTER = 0.25;
const toQ = (kg: number) => Math.round(kg / QUARTER);
const fromQ = (q: number) => q * QUARTER;

/** The user's default plate set, expressed as TOTAL plates owned (per-side = count/2). */
export const DEFAULT_INVENTORY: PlateInventory = {
  barWeight: 15,
  plates: [
    { weight: 20, count: 4 },
    { weight: 10, count: 2 },
    { weight: 5, count: 4 },
    { weight: 1.25, count: 8 },
    { weight: 0.5, count: 2 },
  ],
};

interface Reachable {
  /** per-side sum in quarter-kg */
  sumQ: number;
  perSide: LoadoutEntry[];
  totalPlates: number;
}

/**
 * Enumerate every per-side load reachable from the inventory. Inventories are tiny
 * (a handful of plate types, low counts), so exhaustive enumeration is cheap and
 * exact — no greedy-denomination pitfalls. Deduplicates by achieved weight, keeping
 * the combination that uses the fewest plates (nicest to actually load).
 */
function reachableLoads(inv: PlateInventory): Reachable[] {
  // Heaviest first so reconstructed loadouts read big->small and fewer-plate combos win ties.
  const types = [...inv.plates]
    .filter((p) => p.weight > 0 && p.count > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((p) => ({ wQ: toQ(p.weight), perSide: Math.floor(p.count / 2) }));

  const best = new Map<number, Reachable>();

  const consider = (sumQ: number, perSide: LoadoutEntry[], total: number) => {
    const prev = best.get(sumQ);
    if (!prev || total < prev.totalPlates) {
      best.set(sumQ, { sumQ, perSide, totalPlates: total });
    }
  };

  const recurse = (i: number, sumQ: number, perSide: LoadoutEntry[], total: number) => {
    if (i === types.length) {
      consider(sumQ, perSide, total);
      return;
    }
    const t = types[i];
    for (let n = 0; n <= t.perSide; n++) {
      const next = n > 0 ? [...perSide, { weight: fromQ(t.wQ), count: n }] : perSide;
      recurse(i + 1, sumQ + n * t.wQ, next, total + n);
    }
  };

  recurse(0, 0, [], 0);
  return [...best.values()];
}

/**
 * Given a target bar weight, return the closest weight actually loadable with the
 * owned plates, plus the per-side plate breakdown. Ties (equidistant) prefer the
 * lighter option, then fewer plates.
 */
export function bestLoadout(target: number, inv: PlateInventory): Loadout {
  const bar = inv.barWeight;
  if (target <= bar) {
    return { weight: bar, perSide: [] };
  }
  const targetSideQ = (toQ(target) - toQ(bar)) / 2;
  const loads = reachableLoads(inv);

  let best = loads[0];
  let bestDist = Math.abs(best.sumQ - targetSideQ);
  for (const l of loads) {
    const dist = Math.abs(l.sumQ - targetSideQ);
    if (
      dist < bestDist ||
      (dist === bestDist && l.sumQ < best.sumQ) ||
      (dist === bestDist && l.sumQ === best.sumQ && l.totalPlates < best.totalPlates)
    ) {
      best = l;
      bestDist = dist;
    }
  }

  return { weight: fromQ(toQ(bar) + best.sumQ * 2), perSide: best.perSide };
}

/** Nearest loadable bar weight for a prescribed (often fractional %) target. */
export function nearestLoadable(target: number, inv: PlateInventory): number {
  return bestLoadout(target, inv).weight;
}
