// Nível 12 (Trilhos): a cena do dilema do bonde, num cenário separado (grama verde). Um trilho se divide em dois na
// bifurcação: num ramo, 5 moradores; no outro, o K (da igreja). O jogador está na alavanca: E alterna o ramo até o bonde
// passar pela bifurcação (aí a escolha trava). O bonde começa indo para o lado do K. Quem é atingido sai voando (cômico).
import * as THREE from 'three';
import { box, cyl, at, mat } from './models/kit.js';
import { buildTram } from './train.js';
import { buildResident } from './models/resident.js';
import { buildPewReader } from './models/reader.js';
import { buildBody } from './models/driver.js';

const FORK = 0, START = -38, END = 70, SPLIT = 16, SPREAD = 6, HIT_X = 25, SPEED = 3.3;   // ~10 s até a bifurcação
const zAt = (x, side) => x <= FORK ? 0 : side * SPREAD * (t => t * t * (3 - 2 * t))(Math.min(1, (x - FORK) / SPLIT));

const CSS = `
.trolley-ui { position: fixed; inset: 0; z-index: 40; pointer-events: none; display: none; font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.trolley-ui.on { display: block; }
.trolley-ui .q { position: absolute; top: 9vh; left: 50%; transform: translateX(-50%); padding: .35em 1.2em; background: #fff3d6; color: #2e1d10;
  border: 4px solid #ff7a1a; border-radius: 18px; font-weight: 900; font-size: clamp(26px, min(4vw, 6vh), 56px); box-shadow: 0 6px 18px rgba(0,0,0,.3); }
.trolley-ui .k { position: absolute; bottom: 9vh; left: 50%; transform: translateX(-50%); padding: .4em 1em; background: rgba(46,29,16,.82); color: #fff8ea;
  border-radius: 999px; font-weight: 800; font-size: clamp(16px, min(2vw, 3.2vh), 28px); transition: opacity .3s; }
.trolley-ui .k b { display: inline-block; min-width: 1.4em; text-align: center; background: #ff7a1a; color: #fff; border-radius: 6px; padding: 0 .3em; margin-right: .3em; }
.trolley-ui .k.off { opacity: 0; }
`;

export function createTrolley(stageEl) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  const ui = document.createElement('div'); ui.className = 'trolley-ui';
  ui.innerHTML = '<div class="q">Quem você salva?</div><div class="k"><b>E</b> Mudar o trajeto</div>';
  (stageEl || document.body).appendChild(ui);
  const keyHint = ui.querySelector('.k');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe3f2');
  scene.add(new THREE.HemisphereLight('#fff6e0', '#7aa35a', 1.4));
  const sun = new THREE.DirectionalLight('#ffffff', 1.9); sun.position.set(-30, 60, 40); scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), mat('#7fb158')); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const camera = new THREE.PerspectiveCamera(44, 16 / 9, 0.5, 900);   // fixa, do alto em 3/4 (como a ilustração clássica):
  camera.position.set(11, 35, 31.5); camera.lookAt(-2, 0, 1.5);        // bonde à esquerda, trilho descendo até a bifurcação, K em cima à direita, os 5 embaixo

  // trilhos: tronco e os dois ramos (dormentes + 2 trilhos que acompanham a curva)
  const track = new THREE.Group(); scene.add(track);
  const lay = (side, x0, x1) => {
    for (let x = x0; x < x1; x += 0.9) {
      const z = zAt(x, side), dz = zAt(x + 0.5, side) - zAt(x - 0.5, side), ry = -Math.atan2(dz, 1);
      track.add(at(box(0.32, 0.12, 2.5, '#5a4330'), x, 0.08, z, 0, ry, 0));
      for (const o of [-0.72, 0.72]) track.add(at(box(0.95, 0.14, 0.12, '#9aa1a8'), x, 0.24, z + o / Math.cos(ry), 0, ry, 0));
    }
  };
  lay(1, START - 10, FORK); lay(-1, FORK, END + 20); lay(1, FORK, END + 20);
  // agulha (pedaço de trilho que muda de lado) e a alavanca com o jogador
  const needle = new THREE.Group(); needle.position.set(FORK + 0.6, 0.3, 0); scene.add(needle);
  needle.add(at(box(5, 0.14, 0.14, '#d8a43a'), 2.5, 0, 0));
  const lever = new THREE.Group(); lever.position.set(-3, 0, -6.5); scene.add(lever);
  lever.add(at(box(1.2, 0.5, 0.9, '#6b6f76'), 0, 0.25, 0));
  const arm = new THREE.Group(); arm.position.set(0, 0.5, 0); lever.add(arm);
  arm.add(at(cyl(0.07, 0.07, 1.6, '#3f4a52', 8), 0, 0.8, 0)); arm.add(at(cyl(0.16, 0.16, 0.3, '#c8402f', 10), 0, 1.65, 0, Math.PI / 2, 0, 0));
  const player = new THREE.Group(); player.position.set(-3, 0, -7.6); scene.add(player);
  const joints = buildBody(player);
  player.rotation.y = -Math.PI / 2;                                    // olhando para a alavanca/trilhos (+z)
  const a1 = joints.arms[1], ag = a1 && (a1.isObject3D ? a1 : a1.shoulder || a1.upper); if (ag) ag.rotation.z = 1.2;   // mão na alavanca

  // vítimas deitadas atravessadas no trilho: K num ramo (-1), 5 moradores no outro (+1)
  const victims = [];
  const lie = (obj, x, side) => { obj.position.set(x, 0.32, zAt(x, side)); obj.rotation.set(-Math.PI / 2, 0, 0); scene.add(obj); victims.push({ obj, side, x, fly: null }); };
  const k = buildPewReader(0.62); k.rotation.order = 'YXZ'; lie(k, HIT_X, -1);
  k.rotation.set(0, Math.PI / 2, -Math.PI / 2); k.position.y = 0.2;    // deitado de costas, atravessado
  [3, 8, 13, 21, 27].forEach((h, i) => lie(buildResident(h), HIT_X - 4 + i * 2, 1));

  const tram = buildTram(); scene.add(tram);
  let x = START, side = -1, locked = false, t = 0, active = false, doneT = -1;
  const place = () => {
    const z = zAt(x, side), z2 = zAt(x + 1, side);
    tram.position.set(x, 0.25, z); tram.rotation.y = -Math.atan2(z2 - z, 1);
    needle.rotation.y = side < 0 ? 0.08 : -0.08;
    arm.rotation.z = side < 0 ? 0.6 : -0.6;
  };
  return {
    scene, camera,
    get active() { return active; },
    get done() { return doneT >= 0 && t - doneT > 2.6; },
    get side() { return side; }, get locked() { return locked; }, get x() { return x; },
    start() {
      x = START; side = -1; locked = false; t = 0; doneT = -1; active = true;
      for (const v of victims) { v.fly = null; v.obj.visible = true; }
      victims.forEach(v => { v.obj.position.set(v.x, v.obj === k ? 0.2 : 0.32, zAt(v.x, v.side)); });
      k.rotation.set(0, Math.PI / 2, -Math.PI / 2);
      for (const v of victims) if (v.obj !== k) v.obj.rotation.set(-Math.PI / 2, 0, 0);
      keyHint.classList.remove('off'); ui.classList.add('on'); document.body.classList.add('title-on'); place();   // (a barra e os botões da partida somem)
    },
    stop() { active = false; ui.classList.remove('on'); document.body.classList.remove('title-on'); },
    resize(w, h) { camera.aspect = w / h; camera.updateProjectionMatrix(); },
    /** toggle: E apertado neste quadro. */
    update(dt, toggle) {
      if (!active) return;
      t += dt;
      if (toggle && !locked) side = -side;                              // alavanca: alterna o ramo
      x += SPEED * dt;
      if (!locked && x + 4 > FORK + 1) { locked = true; keyHint.classList.add('off'); }   // frente passou da bifurcação: escolha feita
      place();
      for (const v of victims) {                                        // atingidos: saem voando (sem nada de sangue)
        if (!v.fly && v.side === side && x + 4 >= v.x - 0.8) {
          v.fly = { vx: 9 + Math.random() * 7, vy: 16 + Math.random() * 8, vz: side * (3 + Math.random() * 6), sx: 6 + Math.random() * 8, sz: 5 + Math.random() * 8 };
          if (doneT < 0) doneT = t;
        }
        if (v.fly) {
          const f = v.fly; f.vy -= 14 * dt;
          v.obj.position.x += f.vx * dt; v.obj.position.y += f.vy * dt; v.obj.position.z += f.vz * dt;
          v.obj.rotation.x += f.sx * dt; v.obj.rotation.z += f.sz * dt;
          if (f.vy < 0 && v.obj.position.y < 3) v.obj.visible = false;    // some antes de cair (nada de corpos no chão)
        }
      }
    },
  };
}
