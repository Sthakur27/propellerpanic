import * as THREE from 'three';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand  = (a, b) => a + Math.random() * (b - a);

// Rounded-rectangle path, centered on the origin.
export function roundedRect(w, h, r){
  r = Math.min(r, w/2, h/2);
  const s = new THREE.Shape();
  const x = -w/2, y = -h/2;
  s.moveTo(x+r, y);
  s.lineTo(x+w-r, y);             s.absarc(x+w-r, y+r,   r, -Math.PI/2, 0);
  s.lineTo(x+w,   y+h-r);         s.absarc(x+w-r, y+h-r, r, 0, Math.PI/2);
  s.lineTo(x+r,   y+h);           s.absarc(x+r,   y+h-r, r, Math.PI/2, Math.PI);
  s.lineTo(x,     y+r);           s.absarc(x+r,   y+r,   r, Math.PI, Math.PI*1.5);
  return s;
}
export function shapeMesh(shape, color){
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color }));
}
export function circle(r, color){
  return new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color }));
}
