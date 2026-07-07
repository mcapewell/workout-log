import { useApp } from '../../store/appStore';

export function History() {
  const history = useApp((s) => s.history);

  if (history.length === 0) {
    return (
      <div className="p-4 text-slate-400">
        No workouts logged yet. Finish a session and it'll show up here.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">History</h1>
      {history.map((s) => (
        <div key={s.id} className="rounded-xl bg-surface p-3">
          <div className="flex justify-between">
            <span className="font-semibold">{s.liftName}</span>
            <span className="text-sm text-slate-400">
              {new Date(s.date).toLocaleDateString()} · C{s.cycle} W{s.week}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-300 flex flex-wrap gap-x-4">
            {s.amrapReps !== undefined && (
              <span>
                AMRAP: <strong>{s.amrapReps}</strong> @ {s.amrapWeight}kg
              </span>
            )}
            {s.estimated1RM && <span>est. 1RM: {s.estimated1RM}kg</span>}
            <span>{s.totalReps} reps</span>
            <span>{Math.round(s.totalVolumeKg)}kg volume</span>
          </div>
          {s.accessories.some((a) => a.reps.length > 0) && (
            <div className="mt-1 text-xs text-slate-400">
              {s.accessoryGroupName && (
                <span className="text-slate-300 font-medium">{s.accessoryGroupName}: </span>
              )}
              {s.accessories
                .filter((a) => a.reps.length > 0)
                .map((a) => `${a.name} ${a.reps.join('/')}`)
                .join(' · ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
