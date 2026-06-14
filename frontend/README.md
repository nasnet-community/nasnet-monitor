# Nasnet Monitor — Frontend

A satellite-dish monitoring dashboard (Starlink-style) for the **Nasnet Mini Kit**.
Recreates the design comp in `../samples/Nasnet Monitor.dc.html` as a real React app:
six screens, a live 3D device scene, hand-rolled SVG charts/dials, and a dark/light
theme — all driven by typed hooks over mock telemetry that's ready to swap for a real API.

## Stack

- **Vite + React 18 + TypeScript** (strict)
- **Tailwind CSS + shadcn/ui** (Radix primitives) — the comp's palette is wired as CSS
  variables in `src/index.css`, switched by `[data-theme]` on `<html>`
- **react-three-fiber + three.js** for the 3D hero (the comp's terminal/beam/router scene)
- **react-router-dom** for the six routes
- **Zustand** (persisted) for shared state: theme, simulated device state, settings
- **Vitest + Testing Library** for tests

> Note: the original brief mentioned `expo-gl`. That's a React-Native-only WebGL API and
> doesn't run on the web; this is a web target, so the 3D scene uses react-three-fiber /
> three.js — the direct web equivalent the comp itself uses. A native build would be a
> separate Expo project.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

### Scripts

| Script           | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Start the Vite dev server                     |
| `npm run build`  | Type-check (`tsc -b`) + production build      |
| `npm run preview`| Preview the production build                  |
| `npm run lint`   | ESLint                                        |
| `npm run format` | Prettier write                                |
| `npm run test`   | Run the Vitest suite                          |

## Project structure

```
src/
  components/
    ui/         shadcn/ui primitives (button, card, switch, progress, dropdown-menu, …)
    layout/     AppShell, Sidebar, Header
    stats/      StatCard
    charts/     Sparkline, ThroughputChart, LatencyChart, UptimeRing, SkyView,
                AlignmentDial, CompassOverlay, HeadingArrow   (responsive SVG)
    three/      DeviceScene (R3F canvas) + DishPanel, UplinkBeam, PulseRings,
                CompanionRouter, GroundCable, Lights, deviceStateConfig
  screens/      Home, Statistics, Network, Obstructions, Alignment, Settings
  hooks/        useTheme, useDeviceState, useStats, useDevices,
                useObstructions, useAlignment, useSettings
  store/        appStore.ts  (Zustand, persisted to localStorage)
  data/         types.ts, mock.ts            ← the only source of mock data
  constants/    navigation.ts
  index.css     Tailwind layers + design tokens (dark default + light)
```

## How it works

- **Theme** lives in the Zustand store and is reflected onto `<html data-theme>`, which
  flips the CSS-variable palette. Tailwind's `darkMode` selector targets the same attribute.
- **Device state** (`online | booting | sleeping | stowed | obstructed | offline`) is a
  single store value. Changing it from the header menu re-drives the headline stats *and*
  the 3D scene (panel tilt, beam color/visibility, LED/cable color, the obstructed flicker)
  via `components/three/deviceStateConfig.ts`.
- **Going live:** every screen reads through a hook in `src/hooks/`. Today those hooks
  return values from `src/data/mock.ts`; point them at a real REST/WebSocket feed and the
  views update with no further changes.

## Swapping in real data

Replace the bodies of the hooks (or the functions in `data/mock.ts`) with API calls. For
live telemetry, have `useStats` / `useDeviceState` subscribe to a WebSocket and push updates
into the store — the rest of the UI already reacts to those values.
