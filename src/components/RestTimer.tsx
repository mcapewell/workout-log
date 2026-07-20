import { useEffect, useRef, useState } from 'react';
import { playAlarm } from '../platform/notifier';
import { PlateVisual } from './PlateVisual';
import type { RestLoad } from '../domain/types';

interface Props {
  /** Absolute wall-clock end time (ms epoch). Owned by the caller so the
   * countdown can be persisted and resumed across navigation / lock / reload. */
  endsAt: number;
  /** Plate breakdown to load next, shown under the countdown (#27). Null = none. */
  load?: RestLoad | null;
  onDone: () => void;
  onClose: () => void;
  /** Report a new end time when the user taps −15s / +15s so the caller can
   * persist the adjustment. */
  onAdjust: (endsAt: number) => void;
}

const remainingSecs = (endsAt: number) =>
  Math.max(0, Math.round((endsAt - Date.now()) / 1000));

/**
 * Countdown rest timer. Uses wall-clock time (not tick counting) so it stays
 * accurate even when iOS throttles background timers or the screen is locked.
 * When it reaches zero it fires the audible alarm + on-screen flash (the
 * reliable iOS feedback channel).
 */
export function RestTimer({ endsAt, load, onDone, onClose, onAdjust }: Props) {
  const [remaining, setRemaining] = useState(() => remainingSecs(endsAt));
  const [flash, setFlash] = useState(false);
  const fired = useRef(false);

  // A fresh or adjusted end time in the future re-arms the alarm.
  useEffect(() => {
    if (endsAt - Date.now() > 0) fired.current = false;
    setRemaining(remainingSecs(endsAt));
  }, [endsAt]);

  useEffect(() => {
    const tick = () => {
      const left = remainingSecs(endsAt);
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        playAlarm();
        setFlash(true);
        setTimeout(() => setFlash(false), 3000);
        onDone();
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt, onDone]);

  const adjust = (delta: number) => onAdjust(endsAt + delta * 1000);

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-base ${
        flash ? 'timer-flash' : ''
      }`}
    >
      <div className="text-sm uppercase tracking-widest text-slate-400 mb-2">Rest</div>
      <div className="text-7xl font-bold tabular-nums mb-8">
        {mm}:{ss}
      </div>
      {load && (
        <div className="mb-8 w-full max-w-xs rounded-xl bg-surface px-4 py-3">
          {load.complete ? (
            <div className="py-1 text-center text-lg font-semibold">🎉 Workout complete</div>
          ) : (
            <>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-slate-400">
                {load.label}
              </div>
              {load.loadout ? (
                <PlateVisual loadout={load.loadout} barWeight={load.barWeight ?? 0} />
              ) : (
                <div className="text-sm text-slate-400">Cable / stack — no plates</div>
              )}
            </>
          )}
        </div>
      )}
      <div className="flex gap-3 mb-8">
        <button onClick={() => adjust(-15)} className="px-4 py-3 rounded-lg bg-surface text-lg">
          −15s
        </button>
        <button onClick={() => adjust(15)} className="px-4 py-3 rounded-lg bg-surface text-lg">
          +15s
        </button>
      </div>
      <button
        onClick={onClose}
        className="px-8 py-4 rounded-xl bg-accent text-black font-semibold text-lg"
      >
        {remaining <= 0 ? 'Done' : 'Skip rest'}
      </button>
    </div>
  );
}
