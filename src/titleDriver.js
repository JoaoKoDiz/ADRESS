// Tela inicial → "Jogar": à direita, o motorista na van (janela aberta, óculos escuros, braço para fora),
// balançando a cabeça no ritmo da música. Cena própria, pequena, com fundo transparente.
import * as THREE from 'three';
import { createVan } from './van.js';
import { createHeli } from './heli.js';
import { box, sphere, cyl, at, mat, mesh } from './models/kit.js';

import { CHAR_MATS } from './models/driver.js';
import { buildHead, shirtTorso, limb, hand } from './models/driver.js';
const SKIN = CHAR_MATS.skin, SHIRT = CHAR_MATS.shirt;   // pele e camisa seguem o Shop
const BEAT = 1.8;   // batidas por segundo (~108 bpm)

export function createTitleDriver(container, audio) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff6e0', '#6a8a50', 1.6));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-4, 8, -6);
  scene.add(sun);

  // a van do jogo, de lado (lado do motorista = −Z, virado para a câmera)
  const van = createVan(scene);
  van.teleport(0, 0, 0);
  van.setGhost(true);                         // a van da tela inicial não colide com o bairro
  const heli = createHeli(van, audio);        // "Livre": vira helicóptero e decola

  // janela aberta: o vão escuro da cabine por cima do vidro lateral esquerdo
  const win = new THREE.Shape();
  [[0.55, 1.5], [1.42, 1.5], [0.95, 2.06], [0.55, 2.06]].forEach(([x, y], i) => (i ? win.lineTo(x, y) : win.moveTo(x, y)));
  const opening = new THREE.Mesh(new THREE.ShapeGeometry(win), mat('#2a2622', { side: THREE.DoubleSide }));
  opening.position.z = -1.29;
  opening.rotation.y = Math.PI;
  opening.scale.x = -1;                       // espelha de volta (a rotação inverte o x)
  van.object.add(opening);

  // motorista sentado DENTRO da cabine: tronco atrás da porta, cabeça no vão da janela,
  // cotovelo apoiado na borda da janela e só o antebraço para fora
  const S = 0.65;
  const driver = new THREE.Group();
  van.object.add(driver);
  const torso = shirtTorso(SHIRT); torso.scale.multiplyScalar(S); torso.position.set(0.85, 1.04, -0.95); driver.add(torso);
  const head = new THREE.Group();
  head.position.set(0.85, 1.5, -1.1);
  driver.add(head);
  head.add(at(limb(0.065, 0.07, 0.1, SKIN), 0, 0.08, -0.02));                       // pescoço
  head.add(at(buildHead(0.26), 0, 0.28, -0.07, 0, 1.15, 0));                        // rosto virado para a câmera (−Z) e um pouco para a frente
  const shoulder = new THREE.Vector3(0.85, 1.04 + 0.56 * S, -0.95 - 0.31 * S), elbowAt = new THREE.Vector3(1.1, 1.57, -1.37);
  const upper = new THREE.Group(); upper.position.copy(shoulder); driver.add(upper);
  const dirArm = elbowAt.clone().sub(shoulder), L = dirArm.length();
  upper.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirArm.normalize());
  upper.add(limb(0.09, 0.078, 0.09, SHIRT), limb(0.056, 0.05, L, SKIN));          // manga + braço até o cotovelo
  const forearm = new THREE.Group();
  forearm.position.copy(elbowAt);
  forearm.rotation.z = 0.7;                                                          // antebraço para fora, caindo junto à porta
  driver.add(forearm);
  forearm.add(limb(0.05, 0.042, 0.27, SKIN), at(hand(SKIN, 0.68), 0, -0.27, 0));
  driver.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const look = new THREE.Vector3(0.55, 1.45, 0);

  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // enquadra a van inteira (≈ 6 de largura) qualquer que seja a proporção
    const halfW = 2.5, halfH = 1.6;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(halfH / t, halfW / (t * camera.aspect)) + 2.5;
    camera.position.set(look.x - 1.0, look.y + 0.8, -dist);
    camera.lookAt(look);
    camera.updateProjectionMatrix();
    camBase.copy(camera.position);
  }

  const camBase = new THREE.Vector3();
  let running = false, t0 = 0, last = 0;
  let mode = 'idle', mt = 0, onDone = null;   // transições: 'drive' (Carreira) e 'fly' (Livre)
  function finish() { if (onDone) { const cb = onDone; onDone = null; cb(); } }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    tick(dt, (now - t0) / 1000);
    requestAnimationFrame(frame);
  }
  function tick(dt, t) {
    const b = t * BEAT * Math.PI * 2;
    head.rotation.x = Math.sin(b) * 0.14;                     // acena no ritmo
    head.rotation.z = Math.sin(b / 2) * 0.07;                 // e balança de lado
    forearm.rotation.z = 0.7 + Math.max(0, Math.sin(b)) * 0.12; // a mão bate na porta
    if (mode === 'idle') van.object.position.y = Math.abs(Math.sin(b / 2)) * 0.03; // a suspensão acompanha
    else if (mode === 'drive') {
      mt += dt;
      if (mt < 0.45) van.object.position.y = Math.random() * 0.06;   // dá a partida: o motor faz a van tremer
      else van.update(dt * 1.4, { x: 0, z: -1 }, 'car');          // acelera (física do jogo) e sai da tela
      if (mt > 1.6) finish();
    } else if (mode === 'fly') {
      mt += dt;
      heli.update(dt, 0);                                            // rotor, cauda, esquis e decolagem
      const up = van.object.position.y * 0.85;                       // a câmera sobe quase junto (o helicóptero fica no quadro)
      camera.position.set(camBase.x, camBase.y + up, camBase.z);
      camera.lookAt(look.x, look.y + up, look.z);
      if (mt > 1.8) finish();
    }
    renderer.render(scene, camera);
  }

  addEventListener('resize', () => running && resize());
  return {
    start() {
      if (running) return;
      running = true; t0 = last = performance.now();
      resize();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    },
    stop() { running = false; },
    /** Volta ao estado parado (depois de uma transição), pronto para começar de novo. */
    reset() { mode = 'idle'; mt = 0; onDone = null; heli.reset(); van.teleport(0, 0, 0); },
    /** Testes: avança n quadros de dt segundos. */
    _tick(n, dt = 1 / 60) { let t = 0; for (let i = 0; i < n; i++) { t += dt; tick(dt, t); } },
    /** Carreira: a van dá a partida e sai dirigindo; cb ao terminar. */
    drive(cb) { if (mode !== 'idle') return; mode = 'drive'; mt = 0; onDone = cb; audio && audio.ignition && audio.ignition(); },
    /** Livre: a van vira helicóptero e decola; cb ao terminar. */
    fly(cb) { if (mode !== 'idle') return; mode = 'fly'; mt = 0; onDone = cb; heli.toggle(); },
  };
}
