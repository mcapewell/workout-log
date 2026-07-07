import { Link } from 'react-router-dom';
import { useApp } from '../../store/appStore';
import { getWeekTemplate } from '../../domain/fiveThreeOne';

export function Home() {
  const config = useApp((s) => s.config);
  const program = useApp((s) => s.program);
  const currentLift = useApp((s) => s.currentLift)();
  const accessoryGroup = useApp((s) => s.currentAccessoryGroup)();
  const template = getWeekTemplate(program.week);

  return (
    <div className="p-4 space-y-5">
      <header>
        <div className="text-slate-400 text-sm">
          Cycle {program.cycle} · Week {program.week} · {template.label}
        </div>
        <h1 className="text-3xl font-bold mt-1">Today: {currentLift.name}</h1>
      </header>

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
        Start workout →
      </Link>

      <p className="text-xs text-slate-500 text-center">
        Progressive overload is automatic — hit your AMRAP target to move up, miss it and the app
        backs you off next cycle.
      </p>
    </div>
  );
}
