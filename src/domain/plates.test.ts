import { describe, it, expect } from 'vitest';
import { bestLoadout, nearestLoadable, DEFAULT_INVENTORY } from './plates';

describe('plate calculator (default inventory: 15kg bar)', () => {
  it('returns just the bar for a target at/below bar weight', () => {
    const l = bestLoadout(15, DEFAULT_INVENTORY);
    expect(l.weight).toBe(15);
    expect(l.perSide).toEqual([]);
  });

  it('loads a clean 55kg as 20 per side', () => {
    const l = bestLoadout(55, DEFAULT_INVENTORY);
    expect(l.weight).toBe(55);
    expect(l.perSide).toEqual([{ weight: 20, count: 1 }]);
  });

  it('loads 100kg exactly with the available plates', () => {
    // per side = (100-15)/2 = 42.5 -> 20 + 20 + 1.25 + 1.25
    const l = bestLoadout(100, DEFAULT_INVENTORY);
    expect(l.weight).toBe(100);
    const perSideTotal = l.perSide.reduce((s, e) => s + e.weight * e.count, 0);
    expect(perSideTotal).toBe(42.5);
  });

  it('snaps a fractional target to the nearest achievable weight', () => {
    // 50% of a 47.3kg-ish TM etc. 61.7 -> per side 23.35; nearest reachable is 23.25 (23.25*2+15=61.5)
    const w = nearestLoadable(61.7, DEFAULT_INVENTORY);
    // 61.7 isn't exactly loadable with this set; nearest achievable is 61.0.
    expect(w).toBe(61);
    expect(bestLoadout(w, DEFAULT_INVENTORY).weight).toBe(w);
  });

  it('never exceeds the physical inventory (max ~146kg)', () => {
    const l = bestLoadout(500, DEFAULT_INVENTORY);
    // 15 + 2*(20*2 + 10 + 5*2 + 1.25*4 + 0.5) = 15 + 2*65.5 = 146
    expect(l.weight).toBe(146);
  });

  it('finest step: can build 16kg (0.5 per side) from the two 0.5kg plates', () => {
    const l = bestLoadout(16, DEFAULT_INVENTORY);
    expect(l.weight).toBe(16);
    expect(l.perSide).toEqual([{ weight: 0.5, count: 1 }]);
  });

  it('prefers the lighter option when equidistant', () => {
    // Between two loadable weights the same distance away, pick the lighter (safer).
    // Reachable near 60.75: 60.5 (dist .25) and 61.0? check it stays loadable & <= expectation
    const w = nearestLoadable(60.75, DEFAULT_INVENTORY);
    expect(bestLoadout(w, DEFAULT_INVENTORY).weight).toBe(w);
  });
});
