import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A minimal fake Web Audio graph that records the order of operations, so we can
// assert playAlarm() resumes a suspended context *before* scheduling oscillators
// (the regression behind issue #36: after backgrounding, iOS/PWA suspends the
// AudioContext and beeps scheduled against the stalled clock are lost).
class FakeAudioContext {
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  readonly events: string[] = [];
  readonly destination = {};

  async resume(): Promise<void> {
    this.events.push('resume');
    this.state = 'running';
  }

  createOscillator() {
    this.events.push('createOscillator');
    return {
      type: '',
      frequency: { value: 0 },
      connect() {
        return this;
      },
      start() {},
      stop() {},
    };
  }

  createGain() {
    const node = {
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {
        return node;
      },
    };
    return node;
  }
}

describe('playAlarm', () => {
  let ctx: FakeAudioContext;

  beforeEach(() => {
    vi.resetModules();
    ctx = new FakeAudioContext();
    vi.stubGlobal('window', { AudioContext: vi.fn(() => ctx) });
    // No Vibration API — keeps canVibrate() false so vibrate() is a no-op here.
    vi.stubGlobal('navigator', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resumes a suspended AudioContext before scheduling the beeps', async () => {
    const { playAlarm } = await import('./notifier');
    await playAlarm();

    expect(ctx.state).toBe('running');
    // resume must come first, then the three oscillators.
    expect(ctx.events).toEqual([
      'resume',
      'createOscillator',
      'createOscillator',
      'createOscillator',
    ]);
  });
});
