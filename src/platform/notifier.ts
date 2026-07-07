// Device feedback for the rest timer. On iOS Safari the Vibration API is absent
// and background timers are throttled, so the reliable channel is *loud audio*
// plus an on-screen flash (handled in the timer UI) plus a Wake Lock so the
// screen stays on. Vibration is used opportunistically where supported (Android).
//
// Everything here is behind a small module so a future native (Capacitor) build
// can provide real haptics/notifications without touching UI code.

let audioCtx: AudioContext | null = null;

/** Must be called from a user gesture (e.g. "Start workout") to unlock audio on iOS. */
export function unlockAudio(): void {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor) audioCtx = new Ctor();
  }
  if (audioCtx?.state === 'suspended') void audioCtx.resume();
}

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function vibrate(pattern: number | number[]): void {
  if (canVibrate()) navigator.vibrate(pattern);
}

/** A short chime made of three rising beeps — audible in a noisy gym. */
export function playAlarm(): void {
  unlockAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const freqs = [660, 880, 1180];
  freqs.forEach((f, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = 'square';
    osc.frequency.value = f;
    const start = now + i * 0.22;
    const end = start + 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.6, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(start);
    osc.stop(end + 0.02);
  });
  // Best-effort haptic on supporting devices.
  vibrate([200, 100, 200, 100, 400]);
}

// ---- Wake Lock (keep the screen awake during a workout) ---------------------

let wakeLock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<void> {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as Navigator & {
        wakeLock: { request(type: 'screen'): Promise<WakeLockSentinel> };
      }).wakeLock.request('screen');
    }
  } catch {
    // Non-fatal: some browsers reject when not visible/charging.
  }
}

export function releaseWakeLock(): void {
  void wakeLock?.release();
  wakeLock = null;
}
