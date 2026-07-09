import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, type AccessoryLog } from '../../store/appStore';
import { generateMainSets, generateBBB, getWeekTemplate } from '../../domain/fiveThreeOne';
import { bestLoadout } from '../../domain/plates';
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
  const history = useApp((s) => s.history);
  const lift = useApp((s) => s.currentLift)();
  const accessoryGroup = useApp((s) => s.currentAccessoryGroup)();
  const finishWorkout = useApp((s) => s.finishWorkout);
  const startWorkout = useApp((s) => s.startWorkout);
  const updateActiveWorkout = useApp((s) => s.updateActiveWorkout);
  const clearActiveWorkout = useApp((s) => s.clearActiveWorkout);
  // Persisted timers for the in-progress workout. Reading them reactively keeps
  // the total timer and rest overlay in sync across resume / reload.
  const startedAt = useApp((s) => s.activeWorkout?.startedAt ?? null);
  const restEndsAt = useApp((s) => s.activeWorkout?.restEndsAt ?? null);

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
      ...mainSets.map((s) => ({
        ...s,
        rest: s.isWarmup ? config.rest.warmup ?? 90 : config.rest.main,
      })),
      ...bbbSets.map((s) => ({ ...s, rest: config.rest.bbb })),
    ],
    [mainSets, bbbSets, config.rest],
  );

  // Seed local state either from a resumable in-progress workout (matching this
  // lift/week) or from fresh defaults. Runs once on mount.
  const initial = useMemo(() => {
    const aw = useApp.getState().activeWorkout;
    const resumable =
      aw &&
      aw.liftId === lift.id &&
      aw.week === program.week &&
      aw.rows.length === barSets.length;
    if (resumable) {
      return {
        rows: aw.rows,
        accReps: Object.fromEntries(
          accessoryGroup.exercises.map((a) => [a.id, aw.accReps[a.id] ?? Array(a.sets).fill('')]),
        ),
        accDone: Object.fromEntries(
          accessoryGroup.exercises.map((a) => [a.id, aw.accDone?.[a.id] ?? Array(a.sets).fill(false)]),
        ),
      };
    }
    return {
      rows: barSets.map((s) => ({ reps: String(s.targetReps), done: false })),
      accReps: Object.fromEntries(accessoryGroup.exercises.map((a) => [a.id, Array(a.sets).fill('')])),
      accDone: Object.fromEntries(accessoryGroup.exercises.map((a) => [a.id, Array(a.sets).fill(false)])),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [rows, setRows] = useState<BarRowState[]>(initial.rows);
  const [accReps, setAccReps] = useState<Record<string, string[]>>(initial.accReps);
  const [accDone, setAccDone] = useState<Record<string, boolean[]>>(initial.accDone);

  // Ensure an activeWorkout exists (stamps startedAt) for a fresh session.
  useEffect(() => {
    const aw = useApp.getState().activeWorkout;
    const resumable =
      aw && aw.liftId === lift.id && aw.week === program.week && aw.rows.length === barSets.length;
    if (!resumable) {
      startWorkout({
        liftId: lift.id,
        week: program.week,
        rows: initial.rows,
        accReps: initial.accReps,
        accDone: initial.accDone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress back to the store so it survives navigation, lock, or kill.
  useEffect(() => {
    updateActiveWorkout({ rows, accReps, accDone });
  }, [rows, accReps, accDone, updateActiveWorkout]);

  // Keep the screen awake and audio unlocked for the whole session.
  useEffect(() => {
    unlockAudio();
    void acquireWakeLock();
    return () => releaseWakeLock();
  }, []);

  // Tick the total workout timer once a second.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  const logRow = (i: number, rest: number) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, done: true } : row)));
    updateActiveWorkout({ restEndsAt: Date.now() + rest * 1000 });
  };

  const setAcc = (id: string, idx: number, value: string) =>
    setAccReps((a) => ({
      ...a,
      [id]: a[id].map((v, j) => (j === idx ? value : v)),
    }));

  // Complete an accessory set (green tick) and start the rest timer, mirroring
  // the main-set Log button. Tapping a done set again just restarts the rest.
  const logAcc = (id: string, idx: number) => {
    setAccDone((d) => ({
      ...d,
      [id]: (d[id] ?? []).map((v, j) => (j === idx ? true : v)),
    }));
    updateActiveWorkout({ restEndsAt: Date.now() + config.rest.accessory * 1000 });
  };

  // Last logged reps per accessory exercise, taken from the most recent session
  // that recorded any reps for it. Gives the user a target to aim for (#20).
  const prevAccReps = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const ex of accessoryGroup.exercises) {
      const last = history.find((s) =>
        s.accessories.some((a) => a.id === ex.id && a.reps.length > 0),
      );
      const logged = last?.accessories.find((a) => a.id === ex.id);
      if (logged) map[ex.id] = logged.reps;
    }
    return map;
  }, [history, accessoryGroup]);

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

  const cancel = () => {
    if (!confirm('Discard this workout? Your logged progress will be lost.')) return;
    clearActiveWorkout();
    navigate('/');
  };

  return (
    <>
    <div className="p-4 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">
            Cycle {program.cycle} · Week {program.week} · {template.label}
          </div>
          <h1 className="text-2xl font-bold">{lift.name}</h1>
          <div className="mt-1 text-sm font-semibold tabular-nums text-accent">
            ⏱ {elapsedLabel}
          </div>
        </div>
        <button onClick={cancel} className="text-slate-400 text-sm">
          Cancel
        </button>
      </header>

      <section className="space-y-3">
        {barSets.map((s, i) => {
          const done = rows[i].done;
          const failed = done && (Number(rows[i].reps) || 0) < s.targetReps;
          return (
            <div
              key={i}
              className={`rounded-xl p-3 ${
                failed ? 'bg-danger/20' : done ? 'bg-surface/50' : 'bg-surface'
              } ${s.isAmrap ? 'ring-2 ring-accent' : ''}`}
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
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) =>
                      setRows((r) => r.map((row, j) => (j === i ? { ...row, reps: e.target.value } : row)))
                    }
                    className="w-16 rounded bg-base text-center text-xl py-2"
                    aria-label="reps done"
                  />
                  <button
                    onClick={() => logRow(i, s.rest)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                      failed
                        ? 'bg-danger/30 text-danger'
                        : done
                          ? 'bg-success/30 text-success'
                          : 'bg-accent text-black'
                    }`}
                  >
                    {failed ? '✗' : done ? '✓' : 'Log'}
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <PlateVisual loadout={s.loadout} barWeight={config.inventory.barWeight} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Accessories · <span className="text-accent">{accessoryGroup.name}</span>
        </h2>
        {accessoryGroup.exercises.map((ex) => {
          const equipment = ex.equipment ?? 'cable';
          const prev = prevAccReps[ex.id];
          // Plate breakdown only applies to plate-loaded equipment; cables use a
          // pin stack, so we show the working weight without a loadout (#18).
          const loadout =
            equipment === 'cable'
              ? null
              : bestLoadout(ex.weight, { ...config.inventory, barWeight: ex.barWeight ?? 0 });
          return (
            <div key={ex.id} className="rounded-xl bg-surface p-3">
              <div className="flex justify-between items-baseline">
                <div className="font-semibold">{ex.name}</div>
                <div className="text-sm text-slate-400">
                  {ex.weight}kg · {ex.repMin}–{ex.repMax} reps
                </div>
              </div>
              {prev && prev.length > 0 && (
                <div className="mt-0.5 text-xs text-slate-400">Last: {prev.join(' / ')}</div>
              )}
              {loadout && (
                <div className="mt-2">
                  <PlateVisual loadout={loadout} barWeight={ex.barWeight ?? 0} />
                  {equipment === 'dumbbell' && (
                    <div className="mt-0.5 text-xs text-slate-500">per dumbbell</div>
                  )}
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {Array.from({ length: ex.sets }).map((_, idx) => {
                  const done = accDone[ex.id]?.[idx] ?? false;
                  return (
                    <div key={idx} className="flex flex-1 flex-col gap-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={prev?.[idx] !== undefined ? String(prev[idx]) : `S${idx + 1}`}
                        value={accReps[ex.id]?.[idx] ?? ''}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setAcc(ex.id, idx, e.target.value)}
                        className="w-full rounded bg-base text-center text-lg py-2"
                        aria-label={`${ex.name} set ${idx + 1} reps`}
                      />
                      <button
                        type="button"
                        onClick={() => logAcc(ex.id, idx)}
                        className={`rounded py-1 text-sm font-semibold ${
                          done ? 'bg-success/30 text-success' : 'bg-base text-slate-400'
                        }`}
                        aria-label={
                          done
                            ? `${ex.name} set ${idx + 1} done, rest again`
                            : `complete ${ex.name} set ${idx + 1} and rest`
                        }
                      >
                        {done ? '✓' : '⏱ rest'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      <button
        onClick={finish}
        className="w-full rounded-xl bg-success text-black font-bold text-xl py-4"
      >
        Finish workout
      </button>
    </div>

    {/* Rendered outside the space-y-* flow so no injected top margin offsets
        the full-screen fixed overlay (see issue #11). */}
    {restEndsAt !== null && (
      <RestTimer
        endsAt={restEndsAt}
        onDone={() => {}}
        onClose={() => updateActiveWorkout({ restEndsAt: null })}
        onAdjust={(endsAt) => updateActiveWorkout({ restEndsAt: endsAt })}
      />
    )}
    </>
  );
}
