// Tela inicial → "Jogar": à direita, o motorista na van (janela aberta, óculos escuros, braço para fora),
// balançando a cabeça no ritmo da música. Cena própria, pequena, com fundo transparente.
import * as THREE from 'three';
import { createVan } from './van.js';
import { createHeli } from './heli.js';
import { buildSeatedDriver } from './models/seatedDriver.js';
const BEAT = 1.8;   // batidas por segundo (~108 bpm)

export function createTitleDriver(container, audio) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true });
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

  // janela aberta de verdade + motorista sentado dentro da cabine (models/seatedDriver.js)
  const seated = buildSeatedDriver(van.body), { head } = seated;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const look = new THREE.Vector3(0.55, 1.45, 0);
  const DIR = new THREE.Vector3(0.5, 0.28, -1).normalize();   // de frente e de lado (lado do motorista), um pouco de cima

  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // enquadra a van INTEIRA (com o bagageiro escolhido no Shop, que pode ser alto) qualquer que seja a proporção
    van.object.position.y = 0; van.object.updateMatrixWorld(true);
    const sph = new THREE.Box3().setFromObject(van.object).getBoundingSphere(new THREE.Sphere());
    look.copy(sph.center);
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), r = sph.radius * 0.92;
    const dist = Math.max(r / t, r / (t * camera.aspect)) * 1.04;
    camera.position.copy(look).addScaledVector(DIR, dist);
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
    head.rotation.z = -Math.sin(b) * 0.09;                    // acena no ritmo (em volta do pescoço)
    head.rotation.x = Math.sin(b / 2) * 0.05;                 // e balança de lado
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
    /** Reenquadra (a customização da van mudou no Shop). */
    refit() { if (mode === 'idle') resize(); },
    start() {
      if (running) { resize(); return; }
      running = true; t0 = last = performance.now();
      resize();
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    },
    stop() { running = false; },
    /** Volta ao estado parado (depois de uma transição), pronto para começar de novo. */
    reset() { mode = 'idle'; mt = 0; onDone = null; heli.reset(); van.teleport(0, 0, 0); },
    /** Testes: avança n quadros de dt segundos. */
    /** Testes: o motorista sentado (juntas e malhas). */
    _seated: seated,
    /** Testes: renderiza de outro ponto de vista (a próxima resize/tela volta à câmera do menu). */
    _view(p, l) { camera.position.set(...p); camera.lookAt(...l); renderer.render(scene, camera); },
    _tick(n, dt = 1 / 60) { let t = 0; for (let i = 0; i < n; i++) { t += dt; tick(dt, t); } },
    /** Carreira: a van dá a partida e sai dirigindo; cb ao terminar. */
    drive(cb) { if (mode !== 'idle') return; mode = 'drive'; mt = 0; onDone = cb; audio && audio.ignition && audio.ignition(); },
    /** Livre: a van vira helicóptero e decola; cb ao terminar. */
    fly(cb) { if (mode !== 'idle') return; mode = 'fly'; mt = 0; onDone = cb; heli.toggle(); },
  };
}
