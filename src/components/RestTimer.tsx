import { useEffect, useRef, useState } from 'react';
import { playAlarm } from '../platform/notifier';

interface Props {
  seconds: number;
  onDone: () => void;
  onClose: () => void;
}

/**
 * Countdown rest timer. Uses wall-clock time (not tick counting) so it stays
 * accurate even when iOS throttles background timers. When it reaches zero it
 * fires the audible alarm + on-screen flash (the reliable iOS feedback channel).
 */
export function RestTimer({ seconds, onDone, onClose }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [flash, setFlash] = useState(false);
  const endAt = useRef(Date.now() + seconds * 1000);
  const fired = useRef(false);

  useEffect(() => {
    endAt.current = Date.now() + seconds * 1000;
    fired.current = false;
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
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
  }, [onDone]);

  const adjust = (delta: number) => {
    endAt.current += delta * 1000;
    setRemaining(Math.max(0, Math.round((endAt.current - Date.now()) / 1000)));
    fired.current = false;
  };

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-base/95 ${
        flash ? 'timer-flash' : ''
      }`}
    >
      <div className="text-sm uppercase tracking-widest text-slate-400 mb-2">Rest</div>
      <div className="text-7xl font-bold tabular-nums mb-8">
        {mm}:{ss}
      </div>
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
