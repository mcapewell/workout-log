import { useState } from 'react';
import { useApp, DEFAULT_CONFIG } from '../../store/appStore';
import { roundToHalf } from '../../domain/fiveThreeOne';

export function Setup() {
  const completeSetup = useApp((s) => s.completeSetup);
  const [asOneRM, setAsOneRM] = useState(false);
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(DEFAULT_CONFIG.mainLifts.map((l) => [l.id, l.trainingMax])),
  );

  const start = () => {
    const mainLifts = DEFAULT_CONFIG.mainLifts.map((l) => {
      const entered = values[l.id] || l.trainingMax;
      // If the user entered a true 1RM, the Training Max is 90% of it.
      const tm = asOneRM ? entered * 0.9 : entered;
      return { ...l, trainingMax: roundToHalf(tm) };
    });
    completeSetup({ ...DEFAULT_CONFIG, mainLifts });
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header>
        <h1 className="text-3xl font-bold">Welcome 💪</h1>
        <p className="text-slate-400 mt-2">
          Let's set your starting numbers. You can fine-tune plates, BBB, accessories and rest
          times later in Settings.
        </p>
      </header>

      <label className="flex items-center gap-3 rounded-lg bg-surface p-3">
        <input
          type="checkbox"
          checked={asOneRM}
          onChange={(e) => setAsOneRM(e.target.checked)}
          className="h-5 w-5"
        />
        <span>
          I'm entering my <strong>1-rep max</strong> (app will use 90% as the Training Max)
        </span>
      </label>

      <div className="space-y-3">
        {DEFAULT_CONFIG.mainLifts.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
            <div>
              <div className="font-semibold">{l.name}</div>
              <div className="text-xs text-slate-400">
                {asOneRM ? '1RM' : 'Training Max'} · {l.category} · +{l.increment}kg/cycle
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                value={values[l.id]}
                onChange={(e) => setValues((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
                className="w-24 rounded bg-base text-right text-xl px-2 py-2"
              />
              <span className="text-slate-400">kg</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={start}
        className="w-full rounded-xl bg-accent text-black font-bold text-xl py-4"
      >
        Start training →
      </button>
    </div>
  );
}
