import { S, keys } from './state.js';
import { initAudio, sfx, toggleMusic, toggleSfx } from './audio.js';
import { gameEl } from './scene.js';
import { startGame, useBoost, pause, resume, toMenu, press } from './game.js';
import { boostBtn, pauseBtn, musicBtn, sfxBtn, padLeft, padRight, padUp, padDown,
         btnSurvive, btnClimb, resumeBtn, restartBtn, menuBtn, retryBtn, switchBtn } from './ui.js';

// ----- keyboard -----
addEventListener('keydown', e => {
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){
    e.preventDefault();
    if (S.phase === 'playing')      keys.slow = true;              // hold to fall slower
    else if (S.phase === 'paused')  resume();
    else                            press();                       // start / restart
  }
  if (e.code === 'ArrowDown' || e.code === 'KeyS'){ e.preventDefault(); if (S.phase === 'playing') keys.fast = true; }   // hold to fall faster
  if (e.code === 'KeyE' && S.phase === 'playing'){ initAudio(); useBoost(); }   // spend a charge for a boost
  if (e.code === 'KeyP' || e.code === 'Escape'){
    e.preventDefault();
    if (S.phase === 'playing') pause();
    else if (S.phase === 'paused') resume();
  }
  if (e.code === 'KeyR' && S.phase === 'over') press();
});
addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.slow = false;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.fast = false;
});

// ----- tapping the screen retries on the game-over screen (steering is on the pad buttons) -----
addEventListener('touchstart', () => { if (S.phase === 'over') press(); }, { passive:true });
addEventListener('mousedown',  () => { if (S.phase === 'over') press(); });

// ----- on-screen gamepad: hold buttons set the same key flags as the keyboard -----
function holdButton(el, key){
  const set = on => e => { e.preventDefault(); e.stopPropagation(); if (on) initAudio(); keys[key] = on; };
  el.addEventListener('touchstart', set(true),  { passive:false });
  el.addEventListener('touchend',   set(false), { passive:false });
  el.addEventListener('touchcancel',set(false), { passive:false });
  el.addEventListener('mousedown',  set(true));
  el.addEventListener('mouseup',    set(false));
  el.addEventListener('mouseleave', set(false));
}
holdButton(padLeft,  'left');
holdButton(padRight, 'right');
holdButton(padUp,    'slow');   // flutter
holdButton(padDown,  'fast');   // dive

// reveal the gamepad on touch devices. Check several signals at load, AND flip it on the
// first touch anywhere — capture phase, so it runs even though buttons stopPropagation
// (this also covers Chrome's device-mode being toggled on after load).
function enableTouch(){ gameEl.classList.add('touch'); }
if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 || 'ontouchstart' in window){
  enableTouch();
}
addEventListener('touchstart', enableTouch, { capture:true, passive:true });

// ----- buttons (stopPropagation so they don't also hit the window handlers) -----
function boostTap(e){ e.preventDefault(); e.stopPropagation(); initAudio(); useBoost(); }
boostBtn.addEventListener('touchstart', boostTap, { passive:false });
boostBtn.addEventListener('mousedown', boostTap);

// independent music / SFX toggles (work before audio starts — flags applied on init)
function musicTap(e){ e.preventDefault(); e.stopPropagation(); musicBtn.classList.toggle('off', !toggleMusic()); }
musicBtn.addEventListener('mousedown', musicTap);
musicBtn.addEventListener('touchstart', musicTap, { passive:false });
function sfxTap(e){ e.preventDefault(); e.stopPropagation(); const on = toggleSfx(); sfxBtn.textContent = on ? '🔊' : '🔇'; sfxBtn.classList.toggle('off', !on); }
sfxBtn.addEventListener('mousedown', sfxTap);
sfxBtn.addEventListener('touchstart', sfxTap, { passive:false });

function pickMode(m){ return e => { e.preventDefault(); e.stopPropagation(); initAudio(); sfx('select'); startGame(m); }; }
btnSurvive.addEventListener('mousedown',  pickMode('survive'));
btnSurvive.addEventListener('touchstart', pickMode('survive'), { passive:false });
btnClimb.addEventListener('mousedown',  pickMode('climb'));
btnClimb.addEventListener('touchstart', pickMode('climb'), { passive:false });

function tap(el, fn){
  const h = e => { e.preventDefault(); e.stopPropagation(); initAudio(); sfx('select'); fn(); };
  el.addEventListener('mousedown', h);
  el.addEventListener('touchstart', h, { passive:false });
}
tap(pauseBtn, pause);
tap(resumeBtn, resume);
tap(restartBtn, () => startGame(S.lastMode));
tap(menuBtn,   toMenu);
tap(retryBtn,  () => startGame(S.lastMode));
tap(switchBtn, toMenu);
