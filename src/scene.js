import * as THREE from 'three';
import { H_BASE, H_MAX } from './config.js';
import { S } from './state.js';

export const gameEl = document.getElementById('game');
export const scene  = new THREE.Scene();
export const camera = new THREE.OrthographicCamera(-S.W, S.W, S.H, -S.H, -100, 100);
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
gameEl.appendChild(renderer.domElement);

export function updateCamera(){
  const aspect = gameEl.clientWidth / gameEl.clientHeight;
  S.W = S.H * aspect;
  camera.left = -S.W; camera.right = S.W; camera.top = S.H; camera.bottom = -S.H;
  camera.updateProjectionMatrix();
}
export function resize(){
  renderer.setSize(gameEl.clientWidth, gameEl.clientHeight);
  updateCamera();
}
addEventListener('resize', resize);
resize();

// Stepped, exponentially-decaying zoom-out (Survive): 3 steps at score 5 / 15 / 25, then max.
export function targetZoom(){
  if (S.score >= 25) return H_MAX;   // 24
  if (S.score >= 15) return 22;
  if (S.score >= 5)  return 19;
  return H_BASE;                     // 14
}
