// Entry point: wires the render loop and pulls in the input handlers.
import { S } from './state.js';
import { rand } from './util.js';
import { scene, camera, renderer } from './scene.js';
import { clouds, dangerBar, prop, updateParticles } from './entities.js';
import { tick } from './game.js';
import './input.js';   // side-effect: registers all event listeners

S.last = performance.now();
function loop(now){
  requestAnimationFrame(loop);
  let dt = (now - S.last) / 1000; S.last = now;
  dt = Math.min(dt, 0.033);

  const cy = camera.position.y;
  dangerBar.position.y = cy - S.H + 0.4;     // hug the bottom edge of the view
  clouds.forEach(c => {
    c.position.x -= c.userData.spd * dt;
    if (c.position.x < -S.W-4){ c.position.x = S.W+4; c.position.y = cy + rand(-S.H+2, S.H-1); }
    if (c.position.y < cy - S.H - 3){ c.position.y = cy + S.H + 2; c.position.x = rand(-S.W, S.W); }  // recycle below→above while climbing
  });

  if (S.phase === 'playing'){ tick(dt); }
  else { prop.rotation.z -= 4 * dt; }        // idle propeller on menus

  updateParticles(dt);
  renderer.render(scene, camera);
}
requestAnimationFrame(loop);
