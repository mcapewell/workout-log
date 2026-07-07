# Workout Log

A phone-first **PWA** for running a 5/3/1 + BBB program with **automatic
progressive overload**, a **plate calculator** tuned to your exact plate set, and
a **rest timer** with audible + on-screen alerts. All data lives on-device.

## Features (base app)

- **5/3/1 with BBB** — generates each session's warmups, main sets (with the
  AMRAP "+" top set), and Boring But Big supplemental work from your Training
  Maxes.
- **Automatic progression & failure handling** — hit your AMRAP minimums and the
  app raises your Training Max at cycle end (+2.5 kg upper / +5 kg lower); miss
  them and it resets to 90% (Wendler reset). Deload week is built in.
- **Plate calculator** — snaps every prescribed weight to the nearest weight
  actually loadable with *your* plates, and shows the per-side breakdown.
- **Auto double-progression accessories** — define exercises + rep ranges; the
  app bumps the weight when you top the range and backs off after two failures.
- **Rest timer** — wall-clock accurate, keeps the screen awake, and fires a loud
  chime + full-screen flash (plus vibration where supported) when time's up.
- **History, stats, and JSON export/import** backup.

## Your equipment (defaults, editable in Settings)

15 kg bar; plates: 4×20, 2×10, 4×5, 8×1.25, 2×0.5 kg. The plate math accounts for
the finite inventory, so unloadable targets snap to the true nearest weight.

## Running it

```bash
npm install
npm run dev        # local dev at http://localhost:5173 (add VITE_BASE=/ for root)
npm test           # domain unit tests (plate math + progression)
npm run build      # production build into dist/
```

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`.
On your iPhone, open the deployed URL in Safari → Share → **Add to Home Screen**
to install it as an app.

## iPhone notes & roadmap

- iOS Safari has **no Vibration API** and throttles background timers, so rest
  alerts rely on **sound + screen flash + Wake Lock**. This is by design.
- **Apple Health** and **TAG Heuer E4 rep-counting** need native code and are
  **future work**. All device capabilities sit behind adapters in `src/platform/`
  so a Capacitor wrapper can add real haptics, notifications, and HealthKit
  without touching the UI or domain logic. The watch rep-counting is exploratory
  (no public rep API on the E4).

## Architecture

- `src/domain/` — pure, unit-tested logic: `plates`, `fiveThreeOne`,
  `progression`, `accessories`. No framework, no I/O.
- `src/platform/` — device ports: `storage` (Dexie/IndexedDB), `notifier`
  (audio/vibration/wake-lock), `health` (Apple Health stub).
- `src/store/` — Zustand state, persisted to IndexedDB.
- `src/features/` — screens: setup, workout, history, stats, settings.
