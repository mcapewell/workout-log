import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../store/appStore';
import { canVibrate } from '../../platform/notifier';
import { health } from '../../platform/health';
import type { AccessoryExercise } from '../../domain/types';

/** Temporary layout diagnostics for the iOS PWA bottom-gap investigation.
 * Reports the viewport heights and safe-area insets iOS actually resolves so we
 * can see why the app shell doesn't reach the physical bottom of the screen. */
function useLayoutDiagnostics() {
  const [info, setInfo] = useState<Record<string, string>>({});
  useEffect(() => {
    const read = () => {
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;visibility:hidden;padding:' +
        'env(safe-area-inset-top) env(safe-area-inset-right) ' +
        'env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(probe);
      const cs = getComputedStyle(probe);
      const insets = {
        top: cs.paddingTop,
        right: cs.paddingRight,
        bottom: cs.paddingBottom,
        left: cs.paddingLeft,
      };
      probe.remove();
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS-specific flag
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setInfo({
        'display-mode standalone': String(standalone),
        'window.innerHeight': `${window.innerHeight}px`,
        'screen.height': `${window.screen.height}px`,
        'visualViewport.height': window.visualViewport
          ? `${Math.round(window.visualViewport.height)}px`
          : 'n/a',
        'safe-area top/bottom': `${insets.top} / ${insets.bottom}`,
        'safe-area left/right': `${insets.left} / ${insets.right}`,
      });
    };
    read();
    window.visualViewport?.addEventListener('resize', read);
    window.addEventListener('resize', read);
    return () => {
      window.visualViewport?.removeEventListener('resize', read);
      window.removeEventListener('resize', read);
    };
  }, []);
  return info;
}

export function Settings() {
  const { config, program, history, setupComplete } = useApp();
  const updateConfig = useApp((s) => s.updateConfig);
  const importState = useApp((s) => s.importState);
  const resetAll = useApp((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const diagnostics = useLayoutDiagnostics();

  const setTM = (id: string, tm: number) =>
    updateConfig({
      mainLifts: config.mainLifts.map((l) => (l.id === id ? { ...l, trainingMax: tm } : l)),
    });

  const setRest = (key: 'warmup' | 'main' | 'bbb' | 'accessory', v: number) =>
    updateConfig({ rest: { ...config.rest, [key]: v } });

  const patchGroup = (groupId: string, patch: { name: string }) =>
    updateConfig({
      accessoryGroups: config.accessoryGroups.map((g) =>
        g.id === groupId ? { ...g, ...patch } : g,
      ),
    });

  const patchExercise = (
    groupId: string,
    exId: string,
    patch: Partial<AccessoryExercise>,
  ) =>
    updateConfig({
      accessoryGroups: config.accessoryGroups.map((g) =>
        g.id === groupId
          ? { ...g, exercises: g.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }
          : g,
      ),
    });

  const exportBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ setupComplete, config, program, history }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-log-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importState(JSON.parse(String(reader.result)));
        alert('Backup restored.');
      } catch {
        alert('Could not read that backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6 pb-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-300">Training Maxes</h2>
        {config.mainLifts.map((l) => (
          <div key={l.id} className="flex items-center justify-between rounded-lg bg-surface p-3">
            <span>{l.name}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                value={l.trainingMax}
                onChange={(e) => setTM(l.id, Number(e.target.value))}
                className="w-24 rounded bg-base text-right px-2 py-1"
              />
              <span className="text-slate-400 text-sm">kg</span>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-300">Boring But Big</h2>
        <div className="grid grid-cols-3 gap-2">
          <LabeledNum
            label="% of TM"
            value={config.bbb.percentOfTM}
            onChange={(v) => updateConfig({ bbb: { ...config.bbb, percentOfTM: v } })}
          />
          <LabeledNum
            label="Sets"
            value={config.bbb.sets}
            onChange={(v) => updateConfig({ bbb: { ...config.bbb, sets: v } })}
          />
          <LabeledNum
            label="Reps"
            value={config.bbb.reps}
            onChange={(v) => updateConfig({ bbb: { ...config.bbb, reps: v } })}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-300">Rest timers (seconds)</h2>
        <div className="grid grid-cols-4 gap-2">
          <LabeledNum
            label="Warmup"
            value={config.rest.warmup ?? 90}
            onChange={(v) => setRest('warmup', v)}
          />
          <LabeledNum label="Main" value={config.rest.main} onChange={(v) => setRest('main', v)} />
          <LabeledNum label="BBB" value={config.rest.bbb} onChange={(v) => setRest('bbb', v)} />
          <LabeledNum
            label="Accessory"
            value={config.rest.accessory}
            onChange={(v) => setRest('accessory', v)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-slate-300">Accessory workouts (alternated A/B)</h2>
        {config.accessoryGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <input
              value={group.name}
              onChange={(e) => patchGroup(group.id, { name: e.target.value })}
              className="w-full rounded bg-base px-2 py-2 font-semibold text-accent"
              aria-label="accessory workout name"
            />
            {group.exercises.map((ex) => (
              <div key={ex.id} className="rounded-lg bg-surface p-3 space-y-2">
                <input
                  value={ex.name}
                  onChange={(e) => patchExercise(group.id, ex.id, { name: e.target.value })}
                  className="w-full rounded bg-base px-2 py-1 font-semibold"
                />
                <div className="grid grid-cols-4 gap-2">
                  {(['sets', 'repMin', 'repMax', 'weight'] as const).map((k) => (
                    <LabeledNum
                      key={k}
                      label={k}
                      value={ex[k]}
                      onChange={(v) => patchExercise(group.id, ex.id, { [k]: v })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-300">Backup</h2>
        <div className="flex gap-2">
          <button onClick={exportBackup} className="flex-1 rounded-lg bg-surface py-3">
            Export
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-lg bg-surface py-3">
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
          />
        </div>
      </section>

      <section className="rounded-lg bg-surface/60 p-3 text-xs text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300">Device notes</div>
        <div>Vibration on this device: {canVibrate() ? 'supported' : 'not supported (iPhone uses sound + screen flash)'}</div>
        <div>Apple Health: {health.isSupported() ? 'connected' : 'available in the future native build'}</div>
        <div className="mt-2 border-t border-slate-700 pt-2 font-semibold text-slate-300">
          Layout diagnostics
        </div>
        {Object.entries(diagnostics).map(([k, v]) => (
          <div key={k} className="flex justify-between tabular-nums">
            <span>{k}</span>
            <span className="text-slate-300">{v}</span>
          </div>
        ))}
      </section>

      <button
        onClick={() => confirm('Erase all data and start over?') && resetAll()}
        className="w-full rounded-lg bg-danger/20 text-danger py-3"
      >
        Reset everything
      </button>
    </div>
  );
}

function LabeledNum({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col text-xs text-slate-400">
      {label}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 rounded bg-base px-2 py-1 text-slate-100 text-base"
      />
    </label>
  );
}
