import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, type AccessoryLog } from '../../store/appStore';
import { generateMainSets, generateBBB, getWeekTemplate } from '../../domain/fiveThreeOne';
import { PlateVisual } from '../../components/PlateVisual';
import { RestTimer } from '../../components/RestTimer';
import { acquireWakeLock, releaseWakeLock, unlockAudio } from '../../platform/notifier';
import type { PrescribedSet } from '../../domain/types';

interface BarRowState {
  reps: string;
  done: boolean;
}

export function Workout() {
  const navigate = useNavigate();
  const config = useApp((s) => s.config);
  const program = useApp((s) => s.program);
  const lift = useApp((s) => s.currentLift)();
  const accessoryGroup = useApp((s) => s.currentAccessoryGroup)();
  const finishWorkout = useApp((s) => s.finishWorkout);

  const template = getWeekTemplate(program.week);

  const mainSets = useMemo(
    () => generateMainSets(lift, program.week, config.inventory, config.includeWarmups),
    [lift, program.week, config.inventory, config.includeWarmups],
  );
  const bbbSets = useMemo(
    () => (template.isDeload ? [] : generateBBB(lift, config.bbb, config.inventory)),
    [lift, template.isDeload, config.bbb, config.inventory],
  );

  const barSets: (PrescribedSet & { rest: number })[] = useMemo(
    () => [
      ...mainSets.map((s) => ({ ...s, rest: config.rest.main })),
      ...bbbSets.map((s) => ({ ...s, rest: config.rest.bbb })),
    ],
    [mainSets, bbbSets, config.rest],
  );

  const [rows, setRows] = useState<BarRowState[]>(() =>
    barSets.map((s) => ({ reps: String(s.targetReps), done: false })),
  );
  const [accReps, setAccReps] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(accessoryGroup.exercises.map((a) => [a.id, Array(a.sets).fill('')])),
  );
  const [rest, setRest] = useState<number | null>(null);

  // Keep the screen awake and audio unlocked for the whole session.
  useEffect(() => {
    unlockAudio();
    void acquireWakeLock();
    return () => releaseWakeLock();
  }, []);

  const logRow = (i: number, rest: number) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, done: true } : row)));
    setRest(rest);
  };

  const setAcc = (id: string, idx: number, value: string) =>
    setAccReps((a) => ({
      ...a,
      [id]: a[id].map((v, j) => (j === idx ? value : v)),
    }));

  const finish = () => {
    const amrapIndex = barSets.findIndex((s) => s.isAmrap);
    const amrapReps =
      amrapIndex >= 0 ? Number(rows[amrapIndex]?.reps) || 0 : undefined;
    const amrapWeight = amrapIndex >= 0 ? barSets[amrapIndex].targetWeight : undefined;

    let totalReps = 0;
    let totalVolumeKg = 0;
    barSets.forEach((s, i) => {
      const reps = Number(rows[i].reps) || 0;
      totalReps += reps;
      totalVolumeKg += reps * s.targetWeight;
    });

    const accessories: AccessoryLog[] = accessoryGroup.exercises.map((ex) => {
      const reps = (accReps[ex.id] ?? []).map((r) => Number(r) || 0).filter((r) => r > 0);
      reps.forEach((r) => {
        totalReps += r;
        totalVolumeKg += r * ex.weight;
      });
      return { id: ex.id, name: ex.name, weight: ex.weight, reps };
    });

    finishWorkout({ amrapReps, amrapWeight, totalReps, totalVolumeKg, accessories });
    navigate('/');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">
            Cycle {program.cycle} · Week {program.week} · {template.label}
          </div>
          <h1 className="text-2xl font-bold">{lift.name}</h1>
        </div>
        <button onClick={() => navigate('/')} className="text-slate-400 text-sm">
          Cancel
        </button>
      </header>

      <section className="space-y-3">
        {barSets.map((s, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 ${rows[i].done ? 'bg-surface/50' : 'bg-surface'} ${
              s.isAmrap ? 'ring-2 ring-accent' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">{s.label}</div>
                <div className="text-xl font-bold">
                  {s.targetWeight}kg × {s.targetReps}
                  {s.isAmrap && <span className="text-accent"> + (AMRAP)</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={rows[i].reps}
                  onChange={(e) =>
                    setRows((r) => r.map((row, j) => (j === i ? { ...row, reps: e.target.value } : row)))
                  }
                  className="w-16 rounded bg-base text-center text-xl py-2"
                  aria-label="reps done"
                />
                <button
                  onClick={() => logRow(i, s.rest)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    rows[i].done ? 'bg-success/30 text-success' : 'bg-accent text-black'
                  }`}
                >
                  {rows[i].done ? '✓' : 'Log'}
                </button>
              </div>
            </div>
            <div className="mt-2">
              <PlateVisual loadout={s.loadout} barWeight={config.inventory.barWeight} />
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Accessories · <span className="text-accent">{accessoryGroup.name}</span>
        </h2>
        {accessoryGroup.exercises.map((ex) => (
          <div key={ex.id} className="rounded-xl bg-surface p-3">
            <div className="flex justify-between items-baseline">
              <div className="font-semibold">{ex.name}</div>
              <div className="text-sm text-slate-400">
                {ex.weight}kg · {ex.repMin}–{ex.repMax} reps
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              {Array.from({ length: ex.sets }).map((_, idx) => (
                <input
                  key={idx}
                  type="number"
                  inputMode="numeric"
                  placeholder={`S${idx + 1}`}
                  value={accReps[ex.id]?.[idx] ?? ''}
                  onChange={(e) => setAcc(ex.id, idx, e.target.value)}
                  className="w-full rounded bg-base text-center text-lg py-2"
                  aria-label={`${ex.name} set ${idx + 1} reps`}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      <button
        onClick={finish}
        className="w-full rounded-xl bg-success text-black font-bold text-xl py-4"
      >
        Finish workout
      </button>

      {rest !== null && (
        <RestTimer
          seconds={rest}
          onDone={() => {}}
          onClose={() => setRest(null)}
        />
      )}
    </div>
  );
}
