# 🚁 Propeller Panic

A fast, minimal 2D arcade game built with [three.js](https://threejs.org/) (orthographic / 2D).
You're a propeller character in constant gentle free-fall — **land on a Bullet Bill's head to
bounce**, ride the bounces, and don't fall off the bottom of the screen.

Two modes:

- **🛡️ Survive** — A fixed arena that zooms out as your score climbs. Stomp Bills for points,
  dodge the ones you can't land on, and survive as long as you can.
- **🧗 Climb** — Doodle-Jump-style vertical ascent. The camera follows your highest point and
  never descends. Bounce ever upward off Bills, thread the gaps in solid platforms, and score by
  height climbed.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer left / right | `A` `D` (or `←` `→`) | hold the left / right half of the screen |
| Fall slower | hold `W` / `↑` / `Space` | — |
| Fall faster | hold `S` / `↓` | — |
| Use boost charge | `E` | tap the ⚡ button |
| Pause / resume | `P` / `Esc` | tap the ⏸ button |
| Music on / off | tap 🎵 | tap 🎵 |
| SFX on / off | tap 🔊 | tap 🔊 |
| Start / retry | `Space` (or `R` on game over) | tap |

You glide down automatically — your only way up is **bouncing off a Bill's head**. Hold the
slow-fall key to brake your descent and line up landings. Collect green **⚡ power-ups** to bank a
one-time boost charge (fire it with `E` / the ⚡ button) for a big launch.
Landing a bounce while low in the screen gives a stronger "save" bounce. Watch for **red homing
Bills** that track you, and the **red strip at the bottom edge** — fall into it and it's over.

## Running locally

The game loads `three` as an ES module via an import map, so it must be served over HTTP
(opening `index.html` from `file://` won't work). From the project root:

```sh
python3 -m http.server 8791
```

Then open <http://localhost:8791/index.html>. (Any static file server works — e.g.
`npx serve`.)

## Project structure

```
index.html        markup, import map, and the <script type="module"> entry
styles.css        all UI / HUD / overlay styling
src/
  config.js       tunable gameplay constants (physics, pacing, zoom)
  state.js        the single shared mutable game-state object (S) + held keys
  util.js         math + three.js shape helpers (clamp, rand, roundedRect, …)
  scene.js        three.js scene / camera / renderer, resize, zoom levels
  audio.js        tiny WebAudio blip synth (no asset files)
  entities.js     player, Bullet Bills, power-ups, platforms, clouds, particles
  ui.js           cached DOM element references
  game.js         state machine (start/pause/die/menu) + the per-frame tick()
  input.js        keyboard / touch / mouse + button wiring
  main.js         entry point: the requestAnimationFrame loop
```

All mutable game state lives on the single `S` object in `state.js`, so modules share and mutate
it without reassigning imported bindings (which ES modules forbid). three.js objects (scene,
camera, player, entity arrays) are exported as constants and mutated in place.

## Tuning

Most of the feel lives in `src/config.js`:

- `GAME_SPEED` — global pace multiplier (`<1` slows everything uniformly).
- `GRAV`, `FALL_TERMINAL` — gravity and the capped glide-down speed.
- `BOUNCE`, `BOOST` — bounce and power-up launch strength.
- `MAX_VX`, `ACCEL`, `DRAG` — horizontal steering momentum.
- `H_BASE` / `H_MAX` — camera zoom range (Survive zooms out at score 5 / 15 / 25).
- `WARN_DELAY` — lead time on the incoming-Bill warning arrows.

Spawn rates, homing-Bill frequency, and platform spacing/gaps scale with score/height inside
`src/game.js` (`tick`) and `src/entities.js`.

## Tech

- [three.js](https://threejs.org/) `0.160.0` (via jsDelivr CDN + import map)
- Vanilla ES modules — no build step, no dependencies to install
