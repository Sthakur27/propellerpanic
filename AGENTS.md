# AGENTS.md

Working notes for AI agents (and humans) editing this repo. Gameplay/controls are in
[README.md](./README.md); this file is about **how the code is organized and how to work in it.**

## What this is

Propeller Panic — a 2D arcade game on three.js (orthographic). **No build step, no package
manager, no dependencies to install.** `three` is loaded from a CDN via an import map in
`index.html`. You edit files and reload the browser.

## Run & verify

```sh
python3 -m http.server 8791      # any static server works
```
Open <http://localhost:8791/index.html>.

- **Must be served over HTTP.** Opening `index.html` from `file://` fails — the ES module
  import map / module scripts won't load.
- **Hard-refresh (Cmd/Ctrl-Shift-R)** after edits; the browser caches the modules aggressively.
- There are no automated tests. After changes, sanity-check statically:
  - `for f in src/*.js; do node --check "$f"; done` (syntax)
  - confirm every named import resolves to a real export (a quick script, or just eyeball)
- When testing in a headless/automation browser, note that `requestAnimationFrame` **throttles
  while the tab is backgrounded**, so time-based things (spawns, zoom lerp) appear frozen
  between captures. That's an artifact of the harness, not a bug.

## Architecture

```
index.html      markup + import map + <script type="module" src="./src/main.js">
styles.css      all styling
src/
  config.js     tunable constants (physics, pacing, zoom)   ← tweak feel here
  state.js      the shared mutable state object `S` + `keys`
  util.js       clamp, rand, roundedRect, shapeMesh, circle
  scene.js      scene / camera / renderer, resize, targetZoom (zoom levels)
  audio.js      WebAudio blip synth (sfx)
  entities.js   player, Bills, power-ups, platforms, clouds, particles + their make/spawn/update fns
  ui.js         cached DOM element references
  game.js       state machine (start/die/pause/resume/toMenu) + per-frame tick()
  input.js      keyboard / touch / mouse + button wiring (runs on import)
  main.js       entry point: the requestAnimationFrame loop
```

Rough import direction (no cycles): `config`/`state` ← `util`/`scene`/`audio` ← `entities` ←
`game` ← `input`; `main` pulls in `game` + `entities` + `scene` and side-imports `input`.

## The one rule that matters: state lives on `S`

ES modules **cannot reassign an imported binding**. So every piece of mutable game state lives on
the single object `S` in `state.js`, and code mutates `S.vy`, `S.score`, `S.phase`, `S.H`, etc.

- ✅ `S.vy -= GRAV * dt;`  `S.phase = 'over';`
- ❌ a bare module-level `let vy` shared across files — you can't mutate it from another module.
- three.js objects and entity arrays (`scene`, `camera`, `player`, `bullets`, `platforms`, …) are
  exported as **`const` and mutated in place** (`player.position.set(...)`, `bullets.push(...)`).
- `keys` (held steering) is likewise an exported const object, mutated in place by `input.js`.
- Bullet/particle/powerup *local* velocities are `u.vx` / `p.vy` on their `userData` — those are
  per-entity, not the player's `S.vx` / `S.vy`. Don't confuse them.

When adding state, add a field to `S` — don't introduce shared module-level `let`s.

## Common changes — where they go

- **Tune feel** (gravity, bounce, speed, zoom, pacing): `src/config.js`. `GAME_SPEED` is a global
  pace multiplier applied to `dt` at the top of `tick`.
- **New entity type**: build the mesh + array + `spawn/clear` (and `update`/`collide`) functions in
  `entities.js`, then call its update from `tick()` in `game.js`.
- **New Bill behavior / spawn rule**: `resolveSpawn` in `entities.js` (type selection, positions);
  per-frame steering/cleanup in the bullets loop in `tick`.
- **Per-mode differences**: branch on `S.mode === 'survive' | 'climb'` in `tick` (difficulty,
  camera, lose condition) and in `resolveSpawn` (which Bill types spawn).
- **UI element**: add markup in `index.html`, style in `styles.css`, cache a ref in `ui.js`, wire
  events in `input.js`.

## Loop & timing

`main.js` runs the rAF loop. It updates cosmetic things (clouds, `dangerBar`, particles) every
frame at real `dt`, and calls `tick(dt)` (in `game.js`) **only when `S.phase === 'playing'`**.
`tick` scales `dt` by `GAME_SPEED` first, so gameplay slows uniformly while cosmetics don't.

## Conventions

- Plain ES modules, no transpilation — stick to syntax that runs directly in modern browsers.
- Keep `index.html` markup-only; logic goes in `src/`, styling in `styles.css`.
- Match the existing terse, comment-light style.
- Commits go to `main` (solo repo). End commit messages with the project's `Co-Authored-By` trailer.
