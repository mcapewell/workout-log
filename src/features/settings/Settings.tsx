import { useRef } from 'react';
import { useApp } from '../../store/appStore';
import { canVibrate } from '../../platform/notifier';
import { health } from '../../platform/health';

export function Settings() {
  const { config, program, history, setupComplete } = useApp();
  const updateConfig = useApp((s) => s.updateConfig);
  const importState = useApp((s) => s.importState);
  const resetAll = useApp((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);

  const setTM = (id: string, tm: number) =>
    updateConfig({
      mainLifts: config.mainLifts.map((l) => (l.id === id ? { ...l, trainingMax: tm } : l)),
    });

  const setRest = (key: 'main' | 'bbb' | 'accessory', v: number) =>
    updateConfig({ rest: { ...config.rest, [key]: v } });

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
        <div className="grid grid-cols-3 gap-2">
          <LabeledNum label="Main" value={config.rest.main} onChange={(v) => setRest('main', v)} />
          <LabeledNum label="BBB" value={config.rest.bbb} onChange={(v) => setRest('bbb', v)} />
          <LabeledNum
            label="Accessory"
            value={config.rest.accessory}
            onChange={(v) => setRest('accessory', v)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-300">Accessories</h2>
        {config.accessories.map((ex) => (
          <div key={ex.id} className="rounded-lg bg-surface p-3 space-y-2">
            <input
              value={ex.name}
              onChange={(e) =>
                updateConfig({
                  accessories: config.accessories.map((a) =>
                    a.id === ex.id ? { ...a, name: e.target.value } : a,
                  ),
                })
              }
              className="w-full rounded bg-base px-2 py-1 font-semibold"
            />
            <div className="grid grid-cols-4 gap-2">
              {(['sets', 'repMin', 'repMax', 'weight'] as const).map((k) => (
                <LabeledNum
                  key={k}
                  label={k}
                  value={ex[k]}
                  onChange={(v) =>
                    updateConfig({
                      accessories: config.accessories.map((a) =>
                        a.id === ex.id ? { ...a, [k]: v } : a,
                      ),
                    })
                  }
                />
              ))}
            </div>
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
