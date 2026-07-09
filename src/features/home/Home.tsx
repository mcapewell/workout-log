import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../store/appStore';
import { getWeekTemplate } from '../../domain/fiveThreeOne';

export function Home() {
  const config = useApp((s) => s.config);
  const program = useApp((s) => s.program);
  const currentLift = useApp((s) => s.currentLift)();
  const accessoryGroup = useApp((s) => s.currentAccessoryGroup)();
  const activeWorkout = useApp((s) => s.activeWorkout);
  const clearActiveWorkout = useApp((s) => s.clearActiveWorkout);
  const template = getWeekTemplate(program.week);

  // Live-tick the elapsed time shown on the resume banner.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeWorkout) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeWorkout]);

  const resumeLiftName =
    config.mainLifts.find((l) => l.id === activeWorkout?.liftId)?.name ?? currentLift.name;
  const elapsed = activeWorkout ? Math.max(0, Math.floor((now - activeWorkout.startedAt) / 1000)) : 0;
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div className="p-4 space-y-5">
      <header>
        <div className="text-slate-400 text-sm">
          Cycle {program.cycle} · Week {program.week} · {template.label}
        </div>
        <h1 className="text-3xl font-bold mt-1">Today: {currentLift.name}</h1>
      </header>

      {activeWorkout && (
        <div className="rounded-xl border border-accent bg-surface p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="font-semibold">Workout in progress</div>
            <div className="text-accent font-semibold tabular-nums">⏱ {elapsedLabel}</div>
          </div>
          <div className="text-sm text-slate-400">{resumeLiftName}</div>
          <div className="flex gap-2">
            <Link
              to="/workout"
              className="flex-1 text-center rounded-lg bg-accent text-black font-semibold py-3"
            >
              Resume →
            </Link>
            <button
              onClick={() => {
                if (confirm('Discard this workout? Your logged progress will be lost.')) {
                  clearActiveWorkout();
                }
              }}
              className="rounded-lg bg-base px-4 py-3 text-sm text-slate-400"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-surface p-4 space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-400">Training Max</span>
          <span className="font-semibold">{currentLift.trainingMax} kg</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Main sets</span>
          <span className="font-semibold">
            {template.mainSets.map((s) => `${s.percent}%×${s.reps}${s.isAmrap ? '+' : ''}`).join('  ')}
          </span>
        </div>
        {!template.isDeload && (
          <div className="flex justify-between">
            <span className="text-slate-400">BBB</span>
            <span className="font-semibold">
              {config.bbb.sets}×{config.bbb.reps} @ {config.bbb.percentOfTM}%
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-400">Accessories</span>
          <span className="font-semibold">
            {accessoryGroup.name} · {accessoryGroup.exercises.length} exercises
          </span>
        </div>
      </div>

      <Link
        to="/workout"
        className="block text-center rounded-xl bg-accent text-black font-bold text-xl py-5"
      >
        {activeWorkout ? 'Resume workout →' : 'Start workout →'}
      </Link>

      <p className="text-xs text-slate-500 text-center">
        Progressive overload is automatic — hit your AMRAP target to move up, miss it and the app
        backs you off next cycle.
      </p>
    </div>
  );
}
