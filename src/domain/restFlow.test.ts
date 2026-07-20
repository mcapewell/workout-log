import { describe, it, expect } from 'vitest';
import { buildRestFlow } from './restFlow';
import { DEFAULT_INVENTORY } from './plates';
import type { AccessoryExercise, Loadout, PrescribedSet } from './types';

const loadout = (weight: number): Loadout => ({ weight, perSide: [] });

const barSet = (targetWeight: number, targetReps: number): PrescribedSet => ({
  label: 'set',
  targetWeight,
  targetReps,
  isAmrap: false,
  loadout: loadout(targetWeight),
});

const accessory = (
  id: string,
  name: string,
  weight: number,
  sets: number,
  equipment: AccessoryExercise['equipment'] = 'cable',
  barWeight = 0,
): AccessoryExercise => ({
  id,
  name,
  sets,
  repMin: 10,
  repMax: 15,
  weight,
  increment: 2.5,
  failStreak: 0,
  equipment,
  barWeight,
});

describe('buildRestFlow', () => {
  const barSets = [barSet(90, 5), barSet(60, 10)]; // main + last BBB
  const exercises = [
    accessory('pushdown', 'Tricep Pushdown', 22.5, 3, 'cable'),
    accessory('curl', 'EZ Bar Curl', 30, 2, 'barbell', 7),
  ];
  const { restAfter, accOffset } = buildRestFlow(barSets, exercises, DEFAULT_INVENTORY);

  it('points a mid-bar set at the next bar set', () => {
    expect(restAfter[0]).toMatchObject({
      label: 'Up next · 60kg × 10',
      barWeight: DEFAULT_INVENTORY.barWeight,
    });
    expect(restAfter[0].loadout).toEqual(loadout(60));
  });

  it('points the last bar set at the first accessory set', () => {
    // flat index 1 is the final bar set; next is the first accessory.
    expect(restAfter[1]).toMatchObject({ label: 'Up next · Tricep Pushdown · 22.5kg' });
    expect(restAfter[1].loadout).toBeNull(); // cable → no plate breakdown
  });

  it('records accessory flat offsets after the bar sets', () => {
    expect(accOffset).toEqual({ pushdown: 2, curl: 5 });
  });

  it('points a mid-accessory set at the next set of the same exercise', () => {
    const idx = accOffset['pushdown'] + 0; // pushdown set 1
    expect(restAfter[idx]).toMatchObject({ label: 'Up next · Tricep Pushdown · 22.5kg' });
  });

  it('points the last set of an accessory at the first set of the next exercise', () => {
    const idx = accOffset['pushdown'] + 2; // pushdown final (3rd) set
    expect(restAfter[idx]).toMatchObject({ label: 'Up next · EZ Bar Curl · 30kg' });
  });

  it('gives plate-loaded accessories a computed loadout', () => {
    const idx = accOffset['pushdown'] + 2; // rests into the barbell curl
    expect(restAfter[idx].loadout).not.toBeNull();
    expect(restAfter[idx].barWeight).toBe(7);
  });

  it('marks the final set of the final accessory as workout complete', () => {
    const last = restAfter[restAfter.length - 1];
    expect(last).toEqual({ label: 'Workout complete', complete: true });
    expect(restAfter).toHaveLength(barSets.length + 3 + 2);
  });
});
