import { describe, it, expect } from 'vitest';
import { evaluateCycle, progressAccessory, hitAmrapMinimum } from './progression';
import type { AccessoryExercise, MainLift } from './types';

const bench: MainLift = {
  id: 'bench',
  name: 'Bench Press',
  category: 'upper',
  trainingMax: 80,
  increment: 2.5,
};

describe('5/3/1 cycle progression', () => {
  it('increases the Training Max when all AMRAP minimums are met', () => {
    const r = evaluateCycle(bench, [
      { week: 1, reps: 8 },
      { week: 2, reps: 5 },
      { week: 3, reps: 3 },
    ]);
    expect(r.action).toBe('increase');
    expect(r.newTrainingMax).toBe(82.5);
  });

  it('honours a configured (smaller) increment on a lower lift', () => {
    const squat: MainLift = {
      id: 'squat',
      name: 'Squat',
      category: 'lower',
      trainingMax: 130,
      increment: 2.5, // user lowered it from the +5 lower default
    };
    const r = evaluateCycle(squat, [
      { week: 1, reps: 8 },
      { week: 2, reps: 5 },
      { week: 3, reps: 3 },
    ]);
    expect(r.action).toBe('increase');
    expect(r.newTrainingMax).toBe(132.5);
  });

  it('resets to ~90% when a minimum is missed', () => {
    const r = evaluateCycle(bench, [
      { week: 1, reps: 5 },
      { week: 2, reps: 3 },
      { week: 3, reps: 0 }, // failed the 1+ set
    ]);
    expect(r.action).toBe('reset');
    // 80 * 0.9 = 72 (TM is rounded to 0.5, not snapped to loadable)
    expect(r.newTrainingMax).toBe(72);
  });

  it('knows week-by-week AMRAP minimums', () => {
    expect(hitAmrapMinimum(1, 5)).toBe(true);
    expect(hitAmrapMinimum(3, 0)).toBe(false);
    expect(hitAmrapMinimum(3, 1)).toBe(true);
  });
});

describe('accessory double progression', () => {
  const ex: AccessoryExercise = {
    id: 'a1',
    name: 'Cable Row',
    sets: 3,
    repMin: 10,
    repMax: 15,
    weight: 20,
    increment: 2.5,
    failStreak: 0,
  };

  it('adds weight when every set hits the top of the range', () => {
    const r = progressAccessory(ex, [15, 15, 15]);
    expect(r.action).toBe('increase');
    expect(r.exercise.weight).toBe(22.5);
  });

  it('holds and adds reps while inside the range', () => {
    const r = progressAccessory(ex, [12, 11, 10]);
    expect(r.action).toBe('hold');
    expect(r.exercise.weight).toBe(20);
  });

  it('holds on first failure, then backs off on the second', () => {
    const first = progressAccessory(ex, [9, 8, 8]);
    expect(first.action).toBe('hold');
    expect(first.exercise.failStreak).toBe(1);

    const second = progressAccessory(first.exercise, [9, 8, 7]);
    expect(second.action).toBe('decrease');
    expect(second.exercise.weight).toBe(17.5);
    expect(second.exercise.failStreak).toBe(0);
  });
});
