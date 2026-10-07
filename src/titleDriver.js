// Tela inicial → "Jogar": à direita, o motorista na van (janela aberta, óculos escuros, braço para fora),
// balançando a cabeça no ritmo da música. Cena própria, pequena, com fundo transparente.
import * as THREE from 'three';
import { createVan } from './van.js';
import { createHeli } from './heli.js';
import { box, sphere, cyl, at, mat } from './models/kit.js';

const SKIN = '#e8b48a', SHIRT = '#2a9df4', CAP = '#e3262e', GLASSES = '#111216';
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

  // motorista: ombro na janela, cabeça para fora, braço apoiado na porta
  const driver = new THREE.Group();
  driver.position.set(0.9, 0, -1.25);
  van.object.add(driver);
  driver.add(at(sphere(0.3, SHIRT, 10, 8), 0, 1.5, 0.05));                    // ombro/tronco no vão
  const head = new THREE.Group();
  head.position.set(0, 1.62, -0.05);
  driver.add(head);
  head.add(at(sphere(0.34, SKIN, 14, 10), 0, 0.3, 0));
  const cap = at(sphere(0.36, CAP, 12, 8), 0, 0.42, 0.03); cap.scale.set(1, 0.6, 1); head.add(cap);
  head.add(at(box(0.5, 0.06, 0.3, CAP), 0.08, 0.42, -0.3, -0.15, 0, 0));       // aba do boné
  for (const s of [-1, 1]) head.add(at(box(0.2, 0.12, 0.05, GLASSES, { metalness: 0.4, roughness: 0.25 }), s * 0.13, 0.34, -0.3));
  head.add(at(box(0.08, 0.03, 0.04, GLASSES), 0, 0.36, -0.31));
  head.add(at(box(0.16, 0.04, 0.04, '#7a2e1a'), 0, 0.17, -0.31, 0, 0, 0));       // sorriso
  for (const s of [-1, 1]) head.add(at(box(0.06, 0.035, 0.04, '#7a2e1a'), s * 0.09, 0.19, -0.3, 0, 0, s * -0.6));
  // braço para fora da janela: sai do ombro, apoia o cotovelo na porta e o antebraço desce pelo lado de fora
  const arm = new THREE.Group();
  arm.position.set(0.25, 1.48, 0);
  driver.add(arm);
  arm.add(at(cyl(0.11, 0.1, 0.5, SHIRT, 8), 0, 0, -0.22, Math.PI / 2, 0, 0));
  const forearm = new THREE.Group();
  forearm.position.set(0, 0, -0.47);
  arm.add(forearm);
  forearm.add(at(sphere(0.11, SKIN, 8, 6), 0, 0, 0));
  forearm.add(at(cyl(0.09, 0.08, 0.5, SKIN, 8), 0, -0.25, 0));
  forearm.add(at(sphere(0.11, SKIN, 8, 6), 0, -0.52, 0));
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
    forearm.rotation.x = Math.max(0, Math.sin(b)) * 0.12;     // a mão bate na porta
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
