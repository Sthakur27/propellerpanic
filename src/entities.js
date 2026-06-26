import * as THREE from 'three';
import { R, WARN_DELAY, BOUNCE } from './config.js';
import { S } from './state.js';
import { clamp, rand, roundedRect, shapeMesh, circle } from './util.js';
import { scene, camera } from './scene.js';
import { sfx } from './audio.js';

// ---------- background clouds ----------
export const clouds = [];
for (let i = 0; i < 6; i++){
  const c = new THREE.Group();
  const col = 0xffffff;
  const a = shapeMesh(roundedRect(3.4,1.4,0.7), col);
  const b = shapeMesh(roundedRect(2.2,1.0,0.5), col); b.position.set(-1.2,0.3,0);
  const d = shapeMesh(roundedRect(2.0,0.9,0.45),col); d.position.set(1.2,0.2,0);
  [a,b,d].forEach(m => { m.material.transparent = true; m.material.opacity = 0.55; c.add(m); });
  c.position.set(rand(-S.W, S.W), rand(-S.H+2, S.H-1), -5);
  c.userData.spd = rand(0.3, 0.9);
  scene.add(c); clouds.push(c);
}

// ---------- death zone (soft red strip pinned to the bottom edge) ----------
export const dangerBar = shapeMesh(roundedRect(120, 2.2, 0.0), 0xff3b3b);
dangerBar.material.transparent = true; dangerBar.material.opacity = 0.24;
dangerBar.position.z = 0.45;
scene.add(dangerBar);

// ---------- player (yellow body + eyes + spinning propeller) ----------
export const player = new THREE.Group();
export const prop = new THREE.Group();
{
  const body  = circle(R, 0xffd23f);
  const belly = circle(R*0.62, 0xfff0b8); belly.position.set(0,-0.05,0.01);
  player.add(body, belly);
  const eye = (x) => {
    const g = new THREE.Group();
    const wht = circle(0.17, 0xffffff);
    const pup = circle(0.085, 0x232634); pup.position.set(0.04,-0.01,0.01);
    g.add(wht, pup); g.position.set(x, 0.16, 0.02); return g;
  };
  player.add(eye(-0.20), eye(0.20));

  const blade = shapeMesh(roundedRect(1.7,0.22,0.11), 0xff5a5a);
  const hub   = circle(0.16, 0x444a5c); hub.position.z = 0.01;
  prop.add(blade, hub);
  prop.position.set(0, R+0.18, 0.05);
  player.add(prop);
}
player.position.set(0, 5, 1);
scene.add(player);

// ---------- Bullet Bills ----------
export const bullets = [];
export function makeBullet(type){          // 'L' left→right, 'R' right→left, 'U' bottom→up, 'HOMING' chases
  const homing = type === 'HOMING';
  const horiz  = (type === 'L' || type === 'R');
  const w = homing ? 1.9 : (horiz ? 2.5 : 1.3);
  const h = homing ? 1.9 : (horiz ? 1.3 : 2.5);
  const g = new THREE.Group();
  const shell = shapeMesh(roundedRect(w,h,Math.min(w,h)/2), homing ? 0x9e1f30 : 0x2a2d3a);
  g.add(shell);
  // eyes near the leading edge (homing keeps them up front)
  let off;
  if (homing){
    off = [[0.34,0.16],[-0.34,0.16]];
  } else {
    let ex = 0, ey = 0;
    if (type === 'L') ex =  w*0.22;
    if (type === 'R') ex = -w*0.22;
    if (type === 'U') ey =  h*0.22;
    off = horiz ? [[ex,0.28],[ex,-0.28]] : [[0.28,ey],[-0.28,ey]];
  }
  const e1 = circle(0.17,0xffffff), e2 = circle(0.17,0xffffff);
  const p1 = circle(0.085,0x222222), p2 = circle(0.085,0x222222);
  e1.position.set(off[0][0],off[0][1],0.02); e2.position.set(off[1][0],off[1][1],0.02);
  p1.position.set(off[0][0],off[0][1],0.03); p2.position.set(off[1][0],off[1][1],0.03);
  g.add(e1,e2,p1,p2);
  if (homing){                             // a target ring to read as "locked on"
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(w*0.5, w*0.6, 28),
      new THREE.MeshBasicMaterial({ color:0xffd23f, transparent:true, opacity:0.9 }));
    ring.position.z = 0.04;
    g.add(ring);
  }
  g.userData = { type, homing, hw:w/2, hh:h/2, vx:0, vy:0, hit:false, shell, life:9 };
  return g;
}
// Decide a spawn (type / off-screen position / velocity / entry edge) without creating it yet.
export function resolveSpawn(speed, opts){
  opts = opts || {};
  let type = opts.type;
  if (!type){
    if (Math.random() < S.homingChance) type = 'HOMING';
    else if (S.mode === 'climb') type = 'U';                 // climb: vertical (rising) Bills only
    else { const r = Math.random(); type = r < 0.25 ? 'L' : r < 0.5 ? 'R' : 'U'; }  // 50% horizontal / 50% vertical
  }
  const cy = camera.position.y;                                // view follows the camera
  const yLo = opts.yLo !== undefined ? opts.yLo : cy - S.H + 2.5;
  const yHi = opts.yHi !== undefined ? opts.yHi : cy + S.H - 2;
  const bottomY = cy - S.H - 2;                                // off-screen below
  let pos, edge, vx = 0, vy = 0;
  if (type === 'HOMING'){
    const e = Math.floor(rand(0,3));
    if      (e === 0){ pos = [-S.W-2, rand(yLo,yHi)]; edge = 'L'; }
    else if (e === 1){ pos = [ S.W+2, rand(yLo,yHi)]; edge = 'R'; }
    else             { pos = [rand(-S.W+2, S.W-2), bottomY]; edge = 'U'; }
  }
  else if (type === 'L'){ pos = [-S.W-2, rand(yLo,yHi)]; vx =  speed; edge = 'L'; }
  else if (type === 'R'){ pos = [ S.W+2, rand(yLo,yHi)]; vx = -speed; edge = 'R'; }
  else                  { pos = [rand(-S.W+2, S.W-2), bottomY]; vy =  speed; edge = 'U'; }
  return { type, pos, vx, vy, edge, speed };
}
export function realizeSpawn(p){
  const b = makeBullet(p.type), u = b.userData;
  b.position.set(p.pos[0], p.pos[1], 0.4);
  if (p.type === 'HOMING') u.speed = Math.min(p.speed * 0.78, 8.5);   // a touch slower so it's dodgeable
  else { u.vx = p.vx; u.vy = p.vy; }
  bullets.push(b); scene.add(b);
}

// ---------- spawn telegraphs: flash a warning at the edge before the Bill enters ----------
export const warnings = [];
function makeWarning(){
  const g = new THREE.Group();
  const tri = new THREE.Shape();                 // arrow, apex toward +x by default
  tri.moveTo(0.62,0); tri.lineTo(-0.45,0.58); tri.lineTo(-0.45,-0.58);
  const m = shapeMesh(tri, 0xff3b3b); m.material.transparent = true;
  g.add(m);
  g.userData = { mat: m.material };
  return g;
}
export function scheduleSpawn(speed, opts, delay){
  const p = resolveSpawn(speed, opts);
  const w = makeWarning();
  let wx, wy, rot;
  if      (p.edge === 'L'){ wx = -S.W + 1.0; wy = p.pos[1]; rot = 0; }
  else if (p.edge === 'R'){ wx =  S.W - 1.0; wy = p.pos[1]; rot = Math.PI; }
  else                    { wx = p.pos[0]; wy = camera.position.y - S.H + 1.0; rot = Math.PI / 2; }
  w.position.set(wx, wy, 0.7);
  w.rotation.z = rot;
  w.userData.t = 0;
  w.userData.delay = delay !== undefined ? delay : WARN_DELAY;
  w.userData.params = p;
  scene.add(w); warnings.push(w);
}
// Rescue drop into the bottom 10% of the screen when the player sinks too low (short warning).
export function spawnRescue(speed){
  const r = Math.random();
  const type = r < 0.4 ? 'L' : r < 0.8 ? 'R' : 'U';
  scheduleSpawn(speed, { type, yLo: -S.H + 0.4, yHi: -S.H + 0.2 * S.H }, 0.5);
}
export function clearBullets(){ bullets.forEach(b => scene.remove(b)); bullets.length = 0; }
export function clearWarnings(){ warnings.forEach(w => scene.remove(w)); warnings.length = 0; }

// ---------- power-ups (collect → one-time boost charge) ----------
export const powerups = [];
function makePowerup(){
  const g = new THREE.Group();
  const glow = circle(1.0, 0x2bd96b); glow.material.transparent = true; glow.material.opacity = 0.22;
  const disc = circle(0.62, 0x16a34a);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 28),
                              new THREE.MeshBasicMaterial({ color:0xeafff1 }));
  const tri = new THREE.Shape(); tri.moveTo(0,0.36); tri.lineTo(-0.28,0.0); tri.lineTo(0.28,0.0);
  const arrow = shapeMesh(tri, 0xffffff); arrow.position.z = 0.02;
  const stem  = shapeMesh(roundedRect(0.16,0.34,0.05), 0xffffff); stem.position.set(0,-0.18,0.02);
  ring.position.z = 0.01; disc.position.z = 0.01;
  g.add(glow, disc, ring, arrow, stem);
  g.userData = { vx:0, t:0 };
  return g;
}
export function spawnPowerup(){
  const p = makePowerup();
  const fromLeft = Math.random() < 0.5;
  const y = camera.position.y + rand(-S.H*0.25, S.H*0.6);
  if (fromLeft){ p.position.set(-S.W-1, y, 1.5); p.userData.vx =  rand(1.6, 2.6); }
  else         { p.position.set( S.W+1, y, 1.5); p.userData.vx = -rand(1.6, 2.6); }
  powerups.push(p); scene.add(p);
}
export function clearPowerups(){ powerups.forEach(p => scene.remove(p)); powerups.length = 0; }

// ---------- platforms (Climb mode: solid bars with a gap to steer through) ----------
export const platforms = [];
export function makePlatform(y){
  const g = new THREE.Group();
  const gap = clamp(4.4 - S.score*0.005, 2.9, 4.4);          // narrows a little as you climb
  const gapCenter = rand(-S.W + gap/2 + 1.2, S.W - gap/2 - 1.2);
  const th = 0.85, ext = S.W + 2;
  const segs = [];
  const mkBar = (x0, x1) => {
    if (x1 - x0 < 0.3) return;
    const w = x1 - x0, cx = (x0 + x1) / 2;
    const bar = shapeMesh(roundedRect(w, th, 0.2), 0x8a5a3c);  bar.position.set(cx, 0, 0);
    const cap = shapeMesh(roundedRect(w, 0.24, 0.1), 0xb37c52); cap.position.set(cx, th/2 - 0.09, 0.01);
    g.add(bar, cap);
    segs.push({ x0, x1 });
  };
  mkBar(-ext, gapCenter - gap/2);
  mkBar(gapCenter + gap/2, ext);
  g.position.set(0, y, 0.6);
  g.userData = { segs, yc:y, hh:th/2 };
  platforms.push(g); scene.add(g);
  return g;
}
export function clearPlatforms(){ platforms.forEach(p => scene.remove(p)); platforms.length = 0; }
export function collidePlatforms(){
  for (const pf of platforms){
    const { yc, hh, segs } = pf.userData;
    if (Math.abs(player.position.y - yc) > hh + R + 0.2) continue;   // vertical reject
    for (const s of segs){
      const sx0 = s.x0 - R, sx1 = s.x1 + R, sy0 = yc - hh - R, sy1 = yc + hh + R;
      const px = player.position.x, py = player.position.y;
      if (px > sx0 && px < sx1 && py > sy0 && py < sy1){
        const pushL = px - sx0, pushR = sx1 - px, pushD = py - sy0, pushU = sy1 - py;
        if (Math.min(pushL, pushR) < Math.min(pushD, pushU)){
          player.position.x += (pushL < pushR ? -pushL : pushR); S.vx = 0;   // blocked sideways
        } else if (pushU < pushD){
          player.position.y += pushU;                              // landed on top → bounce
          if (S.vy < 0){
            const lowThird = player.position.y < camera.position.y - S.H / 3;
            S.vy = BOUNCE * (lowThird ? 1.25 : 1);
            burst(player.position.x, player.position.y - R, 0xffe08a, 12);
            sfx('bounce');
          }
        } else {
          player.position.y -= pushD; if (S.vy > 0) S.vy = 0;       // bonk from below
        }
      }
    }
  }
}

// ---------- particles ----------
export const particles = [];
export function burst(x, y, color, n = 14){
  for (let i = 0; i < n; i++){
    const m = circle(rand(0.08,0.18), color);
    m.material.transparent = true;
    m.position.set(x, y, 2);
    const a = Math.random()*Math.PI*2, sp = rand(3,8);
    particles.push({ m, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp+2, life:rand(0.4,0.7) });
    scene.add(m);
  }
}
export function updateParticles(dt){
  for (let i = particles.length-1; i >= 0; i--){
    const p = particles[i];
    p.life -= dt;
    p.vy -= 14*dt;
    p.m.position.x += p.vx*dt;
    p.m.position.y += p.vy*dt;
    p.m.material.opacity = Math.max(0, p.life*1.6);
    p.m.scale.multiplyScalar(1 - 1.2*dt);
    if (p.life <= 0){ scene.remove(p.m); particles.splice(i,1); }
  }
}
