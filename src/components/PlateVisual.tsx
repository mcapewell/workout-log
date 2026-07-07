import type { Loadout } from '../domain/types';

const PLATE_COLORS: Record<number, string> = {
  20: 'bg-blue-600',
  10: 'bg-green-600',
  5: 'bg-yellow-500 text-black',
  1.25: 'bg-slate-300 text-black',
  0.5: 'bg-slate-500',
};

/** Renders the per-side plate breakdown for a bar load. */
export function PlateVisual({ loadout, barWeight }: { loadout: Loadout; barWeight: number }) {
  if (loadout.perSide.length === 0) {
    return <div className="text-sm text-slate-400">Empty bar ({barWeight}kg)</div>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-slate-400 mr-1">per side:</span>
      {loadout.perSide.map((p, i) => (
        <span
          key={i}
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            PLATE_COLORS[p.weight] ?? 'bg-slate-600'
          }`}
        >
          {p.count}×{p.weight}
        </span>
      ))}
    </div>
  );
}
