import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../../store/appStore';

/**
 * End-of-cycle confirmation. Shows each lift's proposed Training Max change
 * (an increase, or a Wendler reset after a missed AMRAP) and lets the user edit
 * the value before it's committed. TMs are not applied until "Apply" is tapped.
 */
export function CycleReview() {
  const pending = useApp((s) => s.pendingCycleReview);
  const applyCycleReview = useApp((s) => s.applyCycleReview);
  const navigate = useNavigate();

  // Editable proposed TM per lift, seeded from the staged proposals.
  const [edited, setEdited] = useState<Record<string, string>>(() =>
    pending
      ? Object.fromEntries(pending.lifts.map((l) => [l.liftId, String(l.proposedTrainingMax)]))
      : {},
  );

  if (!pending) return <Navigate to="/" replace />;

  const apply = () => {
    applyCycleReview(
      pending.lifts.map((l) => ({
        liftId: l.liftId,
        trainingMax: Number(edited[l.liftId]) || l.proposedTrainingMax,
      })),
    );
    navigate('/', { replace: true });
  };

  return (
    <div className="p-4 space-y-5 pb-10">
      <header>
        <div className="text-slate-400 text-sm">Cycle {pending.cycle} complete</div>
        <h1 className="text-2xl font-bold mt-1">Review new Training Maxes</h1>
        <p className="text-sm text-slate-400 mt-1">
          Approve or adjust each Training Max before your next cycle starts.
        </p>
      </header>

      <section className="space-y-3">
        {pending.lifts.map((l) => (
          <div key={l.liftId} className="rounded-xl bg-surface p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{l.name}</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                  l.action === 'reset' ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent'
                }`}
              >
                {l.action === 'reset' ? 'Reset to 90%' : 'Increase'}
              </span>
            </div>
            <div className="text-xs text-slate-400">{l.reason}</div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {l.currentTrainingMax} kg →
              </span>
              <label className="flex items-center gap-1 text-sm text-slate-400">
                <input
                  type="number"
                  inputMode="decimal"
                  value={edited[l.liftId] ?? String(l.proposedTrainingMax)}
                  onChange={(e) =>
                    setEdited((s) => ({ ...s, [l.liftId]: e.target.value }))
                  }
                  className="w-24 rounded bg-base text-right px-2 py-1 text-slate-100"
                  aria-label={`${l.name} new training max`}
                />
                kg
              </label>
            </div>
          </div>
        ))}
      </section>

      <button
        onClick={apply}
        className="block w-full text-center rounded-xl bg-accent text-black font-bold text-lg py-4"
      >
        Apply new Training Maxes
      </button>
    </div>
  );
}
