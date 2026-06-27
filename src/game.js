import {
  GRAV, FALL_TERMINAL, SLOW_FALL, FAST_FALL, MAX_VX, ACCEL, DRAG, BOUNCE, BOOST, POWERUP_INTERVAL,
  GAME_SPEED, H_BASE, CLIMB_H, CLIMB_CAM_OFFSET, R,
  STAMINA_MAX, STAMINA_DRAIN, STAMINA_REGEN,
} from './config.js';
import { S, keys } from './state.js';
import { clamp, rand } from './util.js';
import { scene, camera, updateCamera, targetZoom } from './scene.js';
import { initAudio, sfx, pauseMusic, resumeMusic } from './audio.js';
import {
  player, prop, particles, setPlayerMood,
  bullets, warnings, realizeSpawn, scheduleSpawn, spawnRescue, clearBullets, clearWarnings,
  powerups, spawnPowerup, clearPowerups,
  platforms, makePlatform, clearPlatforms, collidePlatforms,
  burst,
} from './entities.js';
import {
  scoreEl, startEl, overEl, pauseEl, chargesEl, chargeNum, boostBtn, boostNum, pauseBtn,
  finalScore, bestScore, staminaEl, staminaFill,
} from './ui.js';

export function updateCharges(){
  chargeNum.textContent = S.boostCharges;
  boostNum.textContent  = S.boostCharges;
  chargesEl.classList.toggle('has', S.boostCharges > 0);
  boostBtn.classList.toggle('ready', S.boostCharges > 0);
}

function setScore(v){
  S.score = v; scoreEl.textContent = v;
  scoreEl.classList.add('pop');
  setTimeout(() => scoreEl.classList.remove('pop'), 90);
}

export function startGame(m){
  S.mode = m || S.lastMode || 'survive';
  S.lastMode = S.mode;
  clearBullets(); clearWarnings(); clearPowerups(); clearPlatforms();
  particles.forEach(p => scene.remove(p.m)); particles.length = 0;
  S.score = 0; S.homingChance = 0;
  S.H = (S.mode === 'climb') ? CLIMB_H : H_BASE; updateCamera();
  player.rotation.z = 0;
  setPlayerMood(false, false, 0);
  if (S.mode === 'survive'){
    camera.position.y = 0;
    player.position.set(0, S.H * 0.72, 1);
  } else {                                   // climb
    player.position.set(0, 0, 1);
    camera.position.y = player.position.y + S.H * CLIMB_CAM_OFFSET;
    S.startY = player.position.y; S.maxClimbY = player.position.y;
    S.nextPlatformY = player.position.y + 11;
  }
  S.vy = FALL_TERMINAL; S.vx = 0; S.prevY = player.position.y; S.time = 0;
  S.boostCharges = 0; S.rescueArmed = true; S.stamina = STAMINA_MAX;
  scoreEl.textContent = S.mode === 'climb' ? '0m' : '0';
  updateCharges();
  startEl.classList.add('hidden');
  overEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  chargesEl.style.display = 'block';
  boostBtn.style.display = 'flex';
  pauseBtn.style.display = 'flex';
  staminaEl.style.display = 'block';
  staminaFill.style.width = '100%'; staminaEl.classList.remove('low');
  resumeMusic();                   // in case we're restarting from a paused state
  S.phase = 'playing';
  // give the player something to bounce on right away
  scheduleSpawn(6.5, {}, 0.6);
  if (S.mode === 'climb') scheduleSpawn(7, {}, 1.0);
  S.spawnTimer = 0.7;
  S.powerupTimer = POWERUP_INTERVAL - 3;     // first power-up fairly soon
}

export function die(){
  if (S.phase !== 'playing') return;
  S.phase = 'over';
  S.best[S.mode] = Math.max(S.best[S.mode], S.score);
  const suffix = S.mode === 'climb' ? 'm' : '';
  finalScore.textContent = S.score + suffix;
  bestScore.textContent = S.best[S.mode] + suffix;
  burst(player.position.x, player.position.y, 0xff5a5a, 22);
  sfx('die');
  overEl.classList.remove('hidden');
  chargesEl.style.display = 'none';
  boostBtn.style.display = 'none';
  pauseBtn.style.display = 'none';
  staminaEl.style.display = 'none';
}

export function useBoost(){
  if (S.phase !== 'playing' || S.boostCharges <= 0) return;
  S.boostCharges--; updateCharges();
  S.vy = BOOST;
  burst(player.position.x, player.position.y - R, 0x2bd96b, 18);
  sfx('boost');
}

export function pause(){
  if (S.phase !== 'playing') return;
  S.phase = 'paused';
  pauseEl.classList.remove('hidden');
  pauseBtn.style.display = 'none';
  pauseMusic();
}
export function resume(){
  if (S.phase !== 'paused') return;
  pauseEl.classList.add('hidden');
  pauseBtn.style.display = 'flex';
  S.last = performance.now();      // avoid a one-frame dt spike after a long pause
  S.phase = 'playing';
  resumeMusic();
}
export function toMenu(){
  clearBullets(); clearWarnings(); clearPowerups(); clearPlatforms();
  particles.forEach(p => scene.remove(p.m)); particles.length = 0;
  S.H = H_BASE; camera.position.y = 0; updateCamera();
  player.position.set(0, S.H*0.72, 1); player.rotation.z = 0;
  setPlayerMood(false, false, 0);
  pauseEl.classList.add('hidden');
  overEl.classList.add('hidden');
  startEl.classList.remove('hidden');
  pauseBtn.style.display = 'none';
  chargesEl.style.display = 'none';
  boostBtn.style.display = 'none';
  staminaEl.style.display = 'none';
  S.phase = 'start';
}

export function press(){
  initAudio();
  if (S.phase === 'playing' || S.phase === 'paused') return;
  startGame(S.lastMode);           // restart the mode you were playing
}

// ---------- per-frame simulation ----------
export function tick(dt){
  dt *= GAME_SPEED;                // slow the whole simulation uniformly
  S.time += dt;

  // ----- difficulty + spawns (mode-aware) -----
  let spawnInterval, speed;
  if (S.mode === 'survive'){
    const tz = targetZoom();                       // smooth zoom-out at score thresholds
    if (Math.abs(S.H - tz) > 0.001){ S.H += (tz - S.H) * Math.min(1, 2.5 * dt); updateCamera(); }
    S.homingChance = clamp((S.score - 4) * 0.03, 0, 0.35);   // from ~score 5, ramps to 35%
    spawnInterval = Math.max(0.45, 0.95 - S.score*0.015 - S.time*0.004);
    speed = 6.5 + S.score*0.12 + S.time*0.05;
  } else {                                          // climb: difficulty scales with height
    S.homingChance = clamp((S.score - 15) * 0.006, 0, 0.30);
    spawnInterval = Math.max(0.5, 0.92 - S.score*0.003);
    speed = 6.5 + S.score*0.04;
  }
  S.spawnTimer += dt;
  if (S.spawnTimer >= spawnInterval){ S.spawnTimer = 0; scheduleSpawn(speed + rand(0,2.5)); }

  // Climb: follow the player's peak upward (never down) + lay platforms ahead, cull below
  if (S.mode === 'climb'){
    const camTarget = player.position.y + S.H * CLIMB_CAM_OFFSET;
    if (camTarget > camera.position.y) camera.position.y = camTarget;
    while (S.nextPlatformY < camera.position.y + S.H + 6){ makePlatform(S.nextPlatformY); S.nextPlatformY += rand(8, 13); }
    for (let i = platforms.length-1; i >= 0; i--){
      if (platforms[i].userData.yc < camera.position.y - S.H - 4){ scene.remove(platforms[i]); platforms.splice(i,1); }
    }
  }

  // telegraphed spawns: flash the warning, then realize the Bill when it expires
  for (let i = warnings.length-1; i >= 0; i--){
    const w = warnings[i], u = w.userData;
    u.t += dt;
    u.mat.opacity = 0.35 + 0.65 * Math.abs(Math.sin(u.t * 12));
    w.scale.setScalar(0.85 + 0.5 * (u.t / u.delay));
    if (u.t >= u.delay){ realizeSpawn(u.params); scene.remove(w); warnings.splice(i,1); }
  }

  // power-ups drift in periodically
  S.powerupTimer += dt;
  if (S.powerupTimer >= POWERUP_INTERVAL){ S.powerupTimer = 0; spawnPowerup(); }

  // slow-fall costs stamina (fast-fall is free); regens over time, refills on a bounce
  const slowing = keys.slow && S.stamina > 0;
  S.stamina = slowing
    ? Math.max(0, S.stamina - STAMINA_DRAIN * dt)
    : Math.min(STAMINA_MAX, S.stamina + STAMINA_REGEN * dt);
  staminaFill.style.width = (S.stamina / STAMINA_MAX * 100) + '%';
  staminaEl.classList.toggle('low', S.stamina < STAMINA_MAX * 0.25);

  // player physics — gravity (doubled while fast-falling), capped to a glide
  S.vy -= GRAV * (keys.fast ? 2 : 1) * dt;
  const termFall = slowing ? SLOW_FALL : (keys.fast ? FAST_FALL : FALL_TERMINAL);
  if (S.vy < termFall) S.vy = termFall;
  S.prevY = player.position.y;
  player.position.y += S.vy * dt;

  // horizontal momentum: accelerate while steering, coast to a stop on release
  let dir = 0;
  if (keys.left)  dir -= 1;
  if (keys.right) dir += 1;
  if (dir !== 0){
    S.vx += dir * ACCEL * dt;
  } else {
    const d = DRAG * dt;
    S.vx = Math.abs(S.vx) <= d ? 0 : S.vx - Math.sign(S.vx) * d;
  }
  S.vx = clamp(S.vx, -MAX_VX, MAX_VX);
  let nx = player.position.x + S.vx * dt;
  if (nx < -S.W + R){ nx = -S.W + R; S.vx = 0; }    // bonk the walls, kill momentum
  if (nx >  S.W - R){ nx =  S.W - R; S.vx = 0; }
  player.position.x = nx;
  player.rotation.z = -clamp(S.vx / MAX_VX, -1, 1) * 0.3;   // lean into the drift

  // survive has a ceiling; climb is open upward
  if (S.mode === 'survive' && player.position.y > S.H-R){ player.position.y = S.H-R; if (S.vy>0) S.vy = 0; }

  // propeller always spins; faster while shooting upward or braking a fall
  prop.rotation.z -= (13 + Math.max(0, S.vy) * 1.1 + (slowing ? 16 : 0)) * dt;

  // expression: angry/red while diving, sweaty while braking
  setPlayerMood(keys.fast, slowing, dt);

  if (S.mode === 'survive'){
    // rescue: if you sink past the screen midpoint, drop a Bill into the bottom band
    if (player.position.y < 0 && S.rescueArmed){ spawnRescue(7); S.rescueArmed = false; }
    if (player.position.y > S.H * 0.25) S.rescueArmed = true;
  } else {
    collidePlatforms();              // resolve solid platform collisions after the move
  }

  // Bullet Bills
  for (let i = bullets.length-1; i >= 0; i--){
    const b = bullets[i], u = b.userData;

    if (u.homing && !u.hit){          // steer velocity toward the player
      const dx = player.position.x - b.position.x;
      const dy = player.position.y - b.position.y;
      const len = Math.hypot(dx, dy) || 1;
      const turn = Math.min(1, 2.4 * dt);
      u.vx += (dx/len * u.speed - u.vx) * turn;
      u.vy += (dy/len * u.speed - u.vy) * turn;
    }

    b.position.x += u.vx*dt;
    b.position.y += u.vy*dt;

    if (u.hit){                       // defeated: shrink & spin out
      b.scale.multiplyScalar(1 - 3*dt);
      b.rotation.z += 12*dt;
      b.position.y += 4*dt;
      if (b.scale.x < 0.06){ scene.remove(b); bullets.splice(i,1); }
      continue;
    }

    // cleanup — homing Bills despawn on a timer; the rest when they leave the view
    const cy = camera.position.y;
    if (u.homing){
      u.life -= dt;
      if (u.life <= 0 || b.position.y < cy-S.H-6 || Math.abs(b.position.x) > S.W+6){
        scene.remove(b); bullets.splice(i,1); continue;
      }
    } else if (b.position.x < -S.W-4 || b.position.x > S.W+4 || b.position.y > cy+S.H+4 || b.position.y < cy-S.H-8){
      scene.remove(b); bullets.splice(i,1); continue;
    }

    // collision (AABB)
    const px = player.position.x, py = player.position.y;
    const ox = Math.abs(px - b.position.x) < (u.hw + R*0.75);
    const oy = Math.abs(py - b.position.y) < (u.hh + R*0.75);
    if (ox && oy){
      const top = b.position.y + u.hh;
      if (S.vy < 0 && (S.prevY - R) >= top - 0.5){     // landed on the head
        const lowThird = player.position.y < camera.position.y - S.H / 3;   // bottom third of view
        S.vy = BOUNCE * (lowThird ? 1.25 : 1);         // stronger save when you're low
        S.stamina = STAMINA_MAX;                       // bounce refills slow-fall stamina
        u.hit = true;
        u.shell.material.color.set(u.homing ? 0xc98a92 : 0x6b7287);
        burst(px, top, 0xfff176, 14);
        sfx('bounce');
        if (S.mode === 'survive') setScore(S.score + 1);   // climb scores by height instead
      } else {
        die();
      }
    }
  }

  // power-ups: bob across, collect on contact → +1 boost charge
  for (let i = powerups.length-1; i >= 0; i--){
    const p = powerups[i], u = p.userData;
    u.t += dt;
    p.position.x += u.vx * dt;
    p.position.y += Math.sin(u.t * 2.0) * 0.8 * dt;
    p.rotation.z  = Math.sin(u.t * 3.0) * 0.15;
    if (p.position.x < -S.W-3 || p.position.x > S.W+3 || p.position.y < camera.position.y-S.H-3){ scene.remove(p); powerups.splice(i,1); continue; }
    if (Math.abs(p.position.x - player.position.x) < (0.7 + R) &&
        Math.abs(p.position.y - player.position.y) < (0.7 + R)){
      scene.remove(p); powerups.splice(i,1);
      S.boostCharges++; updateCharges();
      burst(p.position.x, p.position.y, 0x2bd96b, 16);
      sfx('power');
    }
  }

  // climb height score
  if (S.mode === 'climb'){
    S.maxClimbY = Math.max(S.maxClimbY, player.position.y);
    const h = Math.max(0, Math.floor(S.maxClimbY - S.startY));
    if (h !== S.score){ S.score = h; scoreEl.textContent = h + 'm'; }
  }
  // lose: fall below the bottom edge of the screen (both modes)
  if (player.position.y + R < camera.position.y - S.H) die();
}
