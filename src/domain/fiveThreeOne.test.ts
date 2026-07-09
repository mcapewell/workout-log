import { describe, it, expect } from 'vitest';
import { generateMainSets, WARMUP_SETS } from './fiveThreeOne';
import { DEFAULT_INVENTORY } from './plates';
import type { MainLift } from './types';

const squat: MainLift = {
  id: 'squat',
  name: 'Squat',
  category: 'lower',
  trainingMax: 130,
  increment: 5,
};

describe('generateMainSets warm-up flagging', () => {
  it('flags exactly the warm-up sets and leaves working sets unflagged', () => {
    const sets = generateMainSets(squat, 1, DEFAULT_INVENTORY, true);
    const warmups = sets.filter((s) => s.isWarmup);
    const working = sets.filter((s) => !s.isWarmup);

    expect(warmups).toHaveLength(WARMUP_SETS.length);
    expect(warmups.every((s) => s.label.startsWith('Warmup'))).toBe(true);
    expect(working.every((s) => s.label.startsWith('Main'))).toBe(true);
    expect(working.some((s) => s.isWarmup)).toBe(false);
  });

  it('produces no warm-up sets when includeWarmups is false', () => {
    const sets = generateMainSets(squat, 1, DEFAULT_INVENTORY, false);
    expect(sets.some((s) => s.isWarmup)).toBe(false);
  });

  it('produces no warm-up sets on the deload week', () => {
    const sets = generateMainSets(squat, 4, DEFAULT_INVENTORY, true);
    expect(sets.some((s) => s.isWarmup)).toBe(false);
  });
});
