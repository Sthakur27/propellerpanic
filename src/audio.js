// All sound is synthesized with WebAudio — no asset files.
//   master ── destination
//     ├─ musicGain   (looping chiptune)
//     └─ sfxGain     (one-shot effects)
// The context is created lazily on the first user gesture (initAudio).

let actx = null, master = null, musicGain = null, sfxGain = null;
let musicOn = true, sfxOn = true;
const MUSIC_VOL = 0.13, SFX_VOL = 0.9;

export function initAudio(){
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ return; }
  master = actx.createGain();    master.gain.value = 1;                      master.connect(actx.destination);
  musicGain = actx.createGain(); musicGain.gain.value = musicOn ? MUSIC_VOL : 0; musicGain.connect(master);
  sfxGain = actx.createGain();   sfxGain.gain.value = sfxOn ? SFX_VOL : 0;       sfxGain.connect(master);
  startMusic();
}

// Independent toggles — each returns its new ON state (true = audible).
export function toggleMusic(){ musicOn = !musicOn; if (musicGain) musicGain.gain.value = musicOn ? MUSIC_VOL : 0; return musicOn; }
export function toggleSfx(){   sfxOn   = !sfxOn;   if (sfxGain)   sfxGain.gain.value   = sfxOn   ? SFX_VOL   : 0; return sfxOn; }

// ---------- one-shot sound effects ----------
export function sfx(type){
  if (!actx) return;
  const dest = sfxGain || actx.destination;
  const o = actx.createOscillator(), g = actx.createGain();
  o.connect(g); g.connect(dest);
  const t = actx.currentTime;
  if (type === 'bounce'){
    o.type='square'; o.frequency.setValueAtTime(420,t);
    o.frequency.exponentialRampToValueAtTime(900,t+0.12);
    g.gain.setValueAtTime(0.18,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.18);
    o.start(t); o.stop(t+0.2);
  } else if (type === 'power'){
    o.type='triangle'; o.frequency.setValueAtTime(620,t);
    o.frequency.setValueAtTime(820,t+0.08); o.frequency.setValueAtTime(1040,t+0.16);
    g.gain.setValueAtTime(0.16,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.26);
    o.start(t); o.stop(t+0.28);
  } else if (type === 'boost'){
    o.type='sawtooth'; o.frequency.setValueAtTime(480,t);
    o.frequency.exponentialRampToValueAtTime(1300,t+0.22);
    g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
    o.start(t); o.stop(t+0.32);
  } else if (type === 'select'){
    o.type='square'; o.frequency.setValueAtTime(680,t);
    o.frequency.setValueAtTime(920,t+0.05);
    g.gain.setValueAtTime(0.12,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
    o.start(t); o.stop(t+0.11);
  } else { // die
    o.type='sawtooth'; o.frequency.setValueAtTime(320,t);
    o.frequency.exponentialRampToValueAtTime(55,t+0.5);
    g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.55);
    o.start(t); o.stop(t+0.6);
  }
}

// ---------- looping chiptune (procedural) ----------
// vi–IV–I–V in C major (Am F C G), one chord per 4 steps → 16-step loop.
const CHORDS = [
  { root: 110.00, arp: [220.00, 261.63, 329.63] },  // Am  (A3 C4 E4)
  { root:  87.31, arp: [174.61, 220.00, 261.63] },  // F   (F3 A3 C4)
  { root: 130.81, arp: [261.63, 329.63, 392.00] },  // C   (C4 E4 G4)
  { root:  98.00, arp: [196.00, 246.94, 293.66] },  // G   (G3 B3 D4)
];
const TEMPO = 112, STEP = 60 / TEMPO / 2;   // eighth notes
let musicTimer = null, nextNoteTime = 0, step = 0;

function note(freq, time, dur, type, peak){
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, time);
  o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(peak, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.start(time); o.stop(time + dur + 0.02);
}
function kick(time){
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(130, time);
  o.frequency.exponentialRampToValueAtTime(45, time + 0.11);
  o.connect(g); g.connect(musicGain);
  g.gain.setValueAtTime(0.55, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
  o.start(time); o.stop(time + 0.16);
}
function scheduleStep(s, time){
  const ch = CHORDS[Math.floor(s / 4) % CHORDS.length];
  const inBlock = s % 4;
  if (inBlock === 0) note(ch.root, time, STEP * 3.6, 'triangle', 0.5);   // bass on chord change
  if (s % 2 === 0) kick(time);                                          // beat
  const lead = ch.arp[[0, 1, 2, 1][inBlock]];                           // arpeggio
  note(lead, time, STEP * 0.9, 'square', 0.22);
}
function pump(){
  if (!actx) return;
  while (nextNoteTime < actx.currentTime + 0.12){
    scheduleStep(step, nextNoteTime);
    nextNoteTime += STEP;
    step = (step + 1) % (CHORDS.length * 4);
  }
}
export function startMusic(){
  if (musicTimer || !actx) return;
  nextNoteTime = actx.currentTime + 0.06;
  musicTimer = setInterval(pump, 25);   // lookahead scheduler
}
export function pauseMusic(){ if (musicTimer){ clearInterval(musicTimer); musicTimer = null; } }
export function resumeMusic(){
  if (!actx || musicTimer) return;
  nextNoteTime = actx.currentTime + 0.06;
  musicTimer = setInterval(pump, 25);
}
