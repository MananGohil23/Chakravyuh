# The Battlefield — Round 3

A single-device, admin-operated territory-control quiz game for a live event. Two
teams (Team A / Team B) capture and hold regions on a shared 15-territory map by
answering Mahabharata questions. The admin runs both sides from one screen; the
winner is the team controlling the most territories at the end.

No accounts, no backend, no network. Works offline.

## Features

- **Admin console** — one operator plays both teams; illegal moves are blocked and
  only legal actions are offered.
- **Animated spin-the-wheel** setup draw (6 territories, no replacement). The
  recorded result is derived from where the wheel actually stops, so it always
  matches the pointer.
- **Real map artwork** — the 15 territory outlines are traced from `public/map.jpeg`
  into SVG polygons, tinted by owner with the region name rendered on top.
- **Full rules engine** — a pure, unit-tested state machine: Move, Conquer, Travel
  (deferred marker), Fortify, War (5-question scoring), end-game and sudden death.
- **War room theme** — aged-parchment/leather palette, gilded type, faction banners.
- **Crash-proof** — every state change is persisted to `localStorage`; a refresh
  restores the game exactly.
- **Event log with multi-level Undo** and a confirmed Reset.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Vitest for engine tests
- Fonts self-hosted via `@fontsource` (Rozha One, Mukta) — no CDN, offline-safe

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm run build      # type-check + production build (outputs to dist/)
npm run preview    # preview the production build
npm test           # run the engine test suite
npm run typecheck  # tsc --noEmit
```

Open the printed local URL (default http://localhost:5173). For the event, run the
production build (`npm run build` then `npm run preview`, or serve `dist/`) so it
works without the dev server.

## How to play (admin flow)

1. **Setup draw** — spin the wheel six times; results alternate A, B, A, B, A, B,
   giving each team three territories. Use *Undo* to re-spin a misclick.
2. **Place markers** — each team picks one of its three territories.
3. **First move** — choose who starts, set the question cap, then *Sound the War Horn*.
4. **Turns** — the acting team calls an action; select it in the Orders panel or click
   a highlighted territory:
   - **Move** — to an adjacent territory you own.
   - **Conquer** — adjacent neutral; ask a question, mark Correct/Wrong.
   - **Travel** — to a distant owned territory; the marker relocates at the start of
     your next turn.
   - **Fortify** — raise a fort on the current territory.
   - **War** — adjacent enemy; 5 questions to both teams. The higher score takes the
     contested territory (the losing team's territory only — no extra neutral land).
5. The round ends at the question cap, when no progress is possible, or when no
   neutrals remain and no War is available. A tie goes to sudden death.

Questions are asked **verbally** — the app only records the verdict and counts.

## Project structure

```
public/
  map.jpeg                  # the organizer's map artwork
scripts/
  extract-regions.mjs       # one-off: traces territory outlines -> regions.ts
src/
  engine/                   # pure, UI-free rules engine
    types.ts                # GameState, Config, actions, phases
    data.ts                 # territory metadata + adjacency (+ validation)
    regions.ts              # AUTO-GENERATED SVG polygons per territory
    geometry.ts             # polygon parsing, centroid, bbox
    core.ts                 # helpers, end-game, endTurn (resolves deferred Travel)
    engine.ts               # apply() / replay() / undo()
    legal.ts                # legalActions(), turnOptions()
    engine.test.ts          # acceptance scenarios
    scenarios.test.ts       # extended war/travel/endgame scenarios
  state/
    game.tsx                # React context + reducer + localStorage persistence
  components/
    MapView.tsx             # SVG overlay on the map, owner fills, markers, forts
    SetupPanel.tsx          # wheel draw, marker placement, first team
    SpinWheel.tsx           # animated wheel (RNG result derived from final angle)
    ActionPanel.tsx         # Move / Conquer / Travel / Fortify / War
    QuestionPanel.tsx       # Correct / Wrong capture
    WarPanel.tsx            # 5-question scoring, spoils, relocation
    Scoreboard.tsx          # territory counts, war status, turn counts
    EventLog.tsx            # append-only log + Undo / Reset
  App.tsx                   # layout + phase routing
  index.css                 # theme (panels, buttons, grain, fonts)
```

## Rules engine

The game is a pure reducer: `nextState = apply(state, action)`. Randomness (the
wheel) is injected through the action, so the reducer is deterministic and every
action is validated. `legalActions(state)` drives the UI so illegal moves are
impossible. Undo replays the action log from a fresh state.

Ambiguous organizer rules are implemented behind a `Config` object (`src/engine/types.ts`,
`DEFAULT_CONFIG`) so they can be flipped without touching the engine — e.g.
`questionCap`, `turnCap`, `adjacencyBasis`, `wheelAssignOrder`, `warTieBreak`.

## Map & regions

`src/engine/regions.ts` is generated, not hand-edited. To regenerate after changing
the artwork or tuning the tracer:

```bash
node scripts/extract-regions.mjs
```

It thresholds the map linework, seals outline gaps, flood-fills each region from a
seed, traces the boundary with marching squares, and writes SVG paths plus a debug
overlay to the temp folder for inspection.

Adjacency (which territories touch which) lives in `src/engine/data.ts` and is
validated (symmetric, complete, connected) by a test.

## Offline / event notes

- All assets (map, fonts) are bundled; the app runs with no network.
- State auto-saves to `localStorage` on every change and restores on load.
- Built for a projector: large, high-contrast map and scoreboard.

## Non-goals

Team-side devices/login, online multiplayer, more than two teams, and any rules
beyond those implemented in the engine.
