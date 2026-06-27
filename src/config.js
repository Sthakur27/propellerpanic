// Tunable gameplay constants.
export const H_BASE = 24, H_MAX = 24;     // start fully zoomed out (no progressive zoom)
export const CLIMB_H = 24;                 // Climb zoom (fixed, also max)
export const CLIMB_CAM_OFFSET = 0.10;      // camera sits this fraction of H above the player
                                           // (small → player rides high in view → more room below)
export const GRAV = 24, FALL_TERMINAL = -4.4;
export const SLOW_FALL = -1.8;             // capped descent while holding slow-fall (W / ↑ / Space)
export const FAST_FALL = -9;               // capped descent while holding fast-fall (S / ↓)
// Slow-fall stamina: drains while braking, regens over time, refills fully on a bounce. (Fast-fall is free.)
export const STAMINA_MAX = 1, STAMINA_DRAIN = 0.7, STAMINA_REGEN = 0.35;
export const MAX_VX = 13, ACCEL = 70, DRAG = 42, BOUNCE = 18, BOOST = 29;
export const POWERUP_INTERVAL = 9;        // seconds between power-up spawns
export const GAME_SPEED = 0.65;           // global pace: <1 slows everything uniformly
export const WARN_DELAY = 0.75;           // seconds a spawn warning shows before the Bill enters
export const HOMING_LIFE = 7;             // homing Bills despawn after this many seconds
export const R = 0.6;                      // player radius
