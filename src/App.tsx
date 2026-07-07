import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useHydrated } from './hooks/useHydrated';
import { useApp } from './store/appStore';
import { Home } from './features/home/Home';
import { Workout } from './features/workout/Workout';
import { Setup } from './features/setup/Setup';
import { History } from './features/history/History';
import { Stats } from './features/stats/Stats';
import { Settings } from './features/settings/Settings';

const NAV = [
  { to: '/', label: 'Today', icon: '🏋️' },
  { to: '/history', label: 'History', icon: '📖' },
  { to: '/stats', label: 'Stats', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function BottomNav() {
  return (
    <nav className="sticky bottom-0 grid grid-cols-4 border-t border-slate-700 bg-base">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center py-2 text-xs ${
              isActive ? 'text-accent' : 'text-slate-400'
            }`
          }
        >
          <span className="text-lg">{n.icon}</span>
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  const hydrated = useHydrated();
  const setupComplete = useApp((s) => s.setupComplete);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>
    );
  }

  if (!setupComplete) {
    return (
      <Routes>
        <Route path="*" element={<Setup />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/history" element={<History />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}
