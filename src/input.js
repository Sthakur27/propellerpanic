import { S, keys } from './state.js';
import { initAudio, sfx, toggleMusic, toggleSfx } from './audio.js';
import { startGame, useBoost, pause, resume, toMenu, press } from './game.js';
import { boostBtn, pauseBtn, musicBtn, sfxBtn, btnSurvive, btnClimb, resumeBtn, restartBtn, menuBtn, retryBtn, switchBtn } from './ui.js';

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

// ----- touch: hold left / right half of the screen to steer -----
function touchUpdate(touches){
  keys.left = keys.right = false;
  for (const t of touches){
    if (t.clientX < innerWidth*0.5) keys.left = true;
    else keys.right = true;
  }
}
addEventListener('touchstart', e => { e.preventDefault(); if (S.phase === 'over') press(); touchUpdate(e.touches); }, { passive:false });
addEventListener('touchmove',  e => { e.preventDefault(); touchUpdate(e.touches); }, { passive:false });
addEventListener('touchend',   e => { touchUpdate(e.touches); }, { passive:false });
addEventListener('mousedown',  e => { if (S.phase === 'over') press(); });

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
