// Tela inicial → "Jogar": à direita, o motorista na van (janela aberta, óculos escuros, braço para fora),
// balançando a cabeça no ritmo da música. Cena própria, pequena, com fundo transparente.
import * as THREE from 'three';
import { createVan } from './van.js';
import { createHeli } from './heli.js';
import { buildBody } from './models/driver.js';
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

  // janela aberta de verdade: o vão escuro marca o stencil e "apaga" a profundidade da lataria só ali,
  // então o motorista DENTRO da cabine aparece pela janela e a porta continua escondendo o resto do corpo
  const win = new THREE.Shape();
  [[0.55, 1.5], [1.42, 1.5], [0.95, 2.06], [0.55, 2.06]].forEach(([x, y], i) => (i ? win.lineTo(x, y) : win.moveTo(x, y)));
  const winGeo = new THREE.ShapeGeometry(win);
  const portal = (m, order) => { const o = new THREE.Mesh(winGeo, m); o.position.z = -1.27; o.rotation.y = Math.PI; o.scale.x = -1; o.renderOrder = order; van.object.add(o); return o; };
  portal(new THREE.MeshBasicMaterial({ color: '#2a2622', side: THREE.DoubleSide, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }), 1);
  portal(new THREE.ShaderMaterial({
    vertexShader: 'void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); p.z = p.w * 0.99999; gl_Position = p; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
    colorWrite: false, depthFunc: THREE.AlwaysDepth, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
  }), 2);

  // motorista sentado: o MESMO esqueleto do personagem (buildBody), menor por igual, girado um pouco para a janela.
  // Tronco e pescoço atrás da porta; pela janela aparecem cabeça, pescoço e o ombro (atrás e abaixo da cabeça);
  // o braço sai desse ombro, desce para a frente até o cotovelo no peitoril e o antebraço fica pendurado por fora da porta.
  const S = 0.4, PSI = 0.5, DOOR_Z = -1.25, SILL_Y = 1.5;
  const driver = new THREE.Group();
  driver.position.set(0.86, 1.35 - 0.78 * S, DOOR_Z + 0.125);      // base do tronco em y = 1,35; lado do tronco rente à porta, por dentro
  driver.rotation.y = PSI;
  driver.scale.setScalar(S);
  van.object.add(driver);
  const rig = buildBody(driver, { flatHands: true });
  const head = rig.head;
  head.rotation.order = 'YXZ';
  const HEAD_YAW = 1.15 - PSI;                                     // rosto virado para a câmera (−Z) e um pouco para a frente
  head.rotation.y = HEAD_YAW;
  for (const l of rig.legs) { l.hip.rotation.order = 'YXZ'; l.hip.rotation.set(0, -PSI, Math.PI / 2); l.knee.rotation.z = -Math.PI / 2; }   // sentado, pernas para a frente da van (escondidas pela porta)
  const [near, far] = rig.arms;                                    // near = lado −Z (janela)
  far.sh.rotation.z = 0.15; far.elbow.rotation.z = 0.6;            // outra mão no colo (abaixo da janela, escondida pela porta)
  // braço da janela: orienta ombro e cotovelo pelos pontos reais (sem peças soltas)
  van.object.updateMatrixWorld(true);
  const toLocal = (obj, worldQ) => obj.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ);
  const aim = down => {                                            // quaternion cujo −Y aponta para `down` e o X fica para a frente (+X)
    const y = down.clone().normalize().negate(), x = new THREE.Vector3(1, 0, 0).addScaledVector(y, -y.x).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const vanInv = new THREE.Matrix4().copy(van.object.matrixWorld).invert();
  const sh = near.sh.getWorldPosition(new THREE.Vector3()).applyMatrix4(vanInv);   // ombro (coordenadas da van)
  const LU = 0.28 * S, RF = 0.074 * S, RS = 0.118 * S;            // braço, antebraço e ponta da manga (raios do buildBody)
  const EZ = DOOR_Z - RF - 0.006;                                  // cotovelo logo por fora da porta (antebraço não atravessa a lataria)
  const EY = SILL_Y + RS + 0.004;                                  // manga e cotovelo deitados sobre a borda de baixo da janela
  const EX = sh.x + Math.sqrt(Math.max(0, LU * LU - (EZ - sh.z) ** 2 - (EY - sh.y) ** 2));   // o resto do comprimento vai para a frente
  const elbowAt = new THREE.Vector3(EX, EY, EZ);
  near.sh.quaternion.copy(toLocal(near.sh, aim(elbowAt.clone().sub(sh))));
  near.sh.updateMatrixWorld(true);
  near.elbow.quaternion.copy(toLocal(near.elbow, aim(new THREE.Vector3(0.06, -1, -0.1))));   // antebraço pendurado por fora da porta
  driver.userData.elbow = elbowAt;
  driver.traverse(o => { if (o.isMesh) o.renderOrder = 3; });     // desenhado depois do "vão" da janela
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
    /** Testes: renderiza de outro ponto de vista (a próxima resize/tela volta à câmera do menu). */
    _view(p, l) { camera.position.set(...p); camera.lookAt(...l); renderer.render(scene, camera); },
    _tick(n, dt = 1 / 60) { let t = 0; for (let i = 0; i < n; i++) { t += dt; tick(dt, t); } },
    /** Carreira: a van dá a partida e sai dirigindo; cb ao terminar. */
    drive(cb) { if (mode !== 'idle') return; mode = 'drive'; mt = 0; onDone = cb; audio && audio.ignition && audio.ignition(); },
    /** Livre: a van vira helicóptero e decola; cb ao terminar. */
    fly(cb) { if (mode !== 'idle') return; mode = 'fly'; mt = 0; onDone = cb; heli.toggle(); },
  };
}
