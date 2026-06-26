import * as THREE from 'three';
import { H_MAX } from './config.js';
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

// Fixed max zoom-out (no progression).
export function targetZoom(){ return H_MAX; }
