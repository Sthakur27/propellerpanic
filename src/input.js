import { S, keys } from './state.js';
import { initAudio, sfx, toggleMute } from './audio.js';
import { startGame, useBoost, pause, resume, toMenu, press } from './game.js';
import { boostBtn, pauseBtn, muteBtn, btnSurvive, btnClimb, resumeBtn, menuBtn, retryBtn, switchBtn } from './ui.js';

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

// mute toggle (works even before audio has started — flag is applied on init)
function muteTap(e){ e.preventDefault(); e.stopPropagation(); muteBtn.textContent = toggleMute() ? '🔇' : '🔊'; }
muteBtn.addEventListener('mousedown', muteTap);
muteBtn.addEventListener('touchstart', muteTap, { passive:false });

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
tap(menuBtn,   toMenu);
tap(retryBtn,  () => startGame(S.lastMode));
tap(switchBtn, toMenu);
