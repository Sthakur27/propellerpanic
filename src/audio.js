// Tiny WebAudio blip synth — no asset files. Created lazily on first user gesture.
let actx = null;

export function initAudio(){
  if (!actx){ try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
}

export function sfx(type){
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.connect(g); g.connect(actx.destination);
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
  } else { // die
    o.type='sawtooth'; o.frequency.setValueAtTime(320,t);
    o.frequency.exponentialRampToValueAtTime(55,t+0.5);
    g.gain.setValueAtTime(0.22,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.55);
    o.start(t); o.stop(t+0.6);
  }
}
