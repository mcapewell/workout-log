import { useApp } from '../../store/appStore';
import type { MainLiftId } from '../../domain/types';

/** Minimal inline sparkline — no chart lib needed for a handful of points. */
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-slate-500 text-xs">not enough data</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" />
    </svg>
  );
}

export function Stats() {
  const history = useApp((s) => s.history);
  const lifts = useApp((s) => s.config.mainLifts);

  const byLift = (id: MainLiftId) =>
    history
      .filter((h) => h.liftId === id && h.estimated1RM)
      .map((h) => h.estimated1RM!)
      .reverse();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Stats</h1>
      <p className="text-sm text-slate-400">Estimated 1RM trend (from your AMRAP sets).</p>
      {lifts.map((l) => {
        const series = byLift(l.id);
        const best = series.length ? Math.max(...series) : undefined;
        return (
          <div key={l.id} className="rounded-xl bg-surface p-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{l.name}</div>
                <div className="text-xs text-slate-400">
                  TM {l.trainingMax}kg{best ? ` · best est. 1RM ${best}kg` : ''}
                </div>
              </div>
              <Spark values={series} />
            </div>
          </div>
        );
      })}
      <div className="rounded-xl bg-surface p-3 text-sm text-slate-400">
        <div className="flex justify-between">
          <span>Total workouts</span>
          <strong className="text-slate-200">{history.length}</strong>
        </div>
        <div className="flex justify-between mt-1">
          <span>Total volume</span>
          <strong className="text-slate-200">
            {Math.round(history.reduce((s, h) => s + h.totalVolumeKg, 0)).toLocaleString()} kg
          </strong>
        </div>
      </div>
    </div>
  );
}
