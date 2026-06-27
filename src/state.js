import { H_BASE } from './config.js';

// All mutable game state lives on this single object so modules can share and
// mutate it without reassigning imported bindings (which ES modules forbid).
export const S = {
  phase: 'start',          // 'start' | 'playing' | 'paused' | 'over'
  mode: 'survive',         // 'survive' | 'climb'
  lastMode: 'survive',
  score: 0,
  best: { survive: 0, climb: 0 },
  vy: 0, vx: 0, prevY: 0, time: 0,
  spawnTimer: 0, powerupTimer: 0,
  boostCharges: 0,
  stamina: 1,              // slow-fall stamina (0..STAMINA_MAX)
  rescueArmed: true,
  homingChance: 0,         // set per-frame; read by resolveSpawn
  startY: 0, maxClimbY: 0, nextPlatformY: 0,   // climb-mode tracking
  H: H_BASE, W: H_BASE,    // current camera half-extents (W recomputed on resize)
  last: 0,                 // loop timestamp (ms)
};

// Held input keys, mutated in place by input handlers.
export const keys = { left: false, right: false, slow: false, fast: false };
