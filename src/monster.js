// Final secreto: destruir as 16 casas desperta o DEVORADOR DE BAIRROS.
// Fases: driveOut (a van sai sozinha e se vira para o bairro) → rise (o monstro sobe do chão) →
// bar (barra de chefe) → kill (ataque inevitável) → dead ("VOCÊ MORREU") → done (main reinicia a partida).
import * as THREE from 'three';
import { mat, box, sphere, cone, cyl, at } from './models/kit.js';
import { MAP } from './layout.js';

const CX = MAP / 2, CZ = MAP / 2;
const OUT = { x: MAP / 2, z: -48 };          // onde a van para, fora do bairro
const RISE_FROM = -230;

const CSS = `
.boss-wrap { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); width: min(70%, 900px); z-index: 5;
  display: none; text-align: center; font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; pointer-events: none; }
.boss-wrap.on { display: block; animation: bossIn .5s ease-out; }
.boss-name { color: #fff; font-weight: 900; font-size: clamp(16px, 1.8vw, 28px); letter-spacing: .12em;
  text-shadow: 0 3px 0 #000, 0 0 18px #ff2a2a; margin-bottom: 6px; }
.boss-bar { height: clamp(14px, 1.6vw, 24px); border: 3px solid #111; border-radius: 6px; background: #2a0508; overflow: hidden;
  box-shadow: 0 0 20px rgba(255,0,0,.6); }
.boss-fill { height: 100%; width: 0%; background: linear-gradient(#ff5a4a, #c4101c); }
.boss-dead { position: absolute; inset: 0; z-index: 6; display: none; align-items: center; justify-content: center; pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(120,0,0,.35), rgba(60,0,0,.85)); }
.boss-dead.on { display: flex; }
.boss-dead span { color: #ff2a2a; font: 900 clamp(48px, 9vw, 140px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;
  letter-spacing: .08em; text-shadow: 0 6px 0 #000, 0 0 40px #ff0000; animation: bossIn .6s ease-out; }
.boss-tip { margin-top: 10px; color: #ffe07a; font-weight: 900; font-size: clamp(15px, 1.6vw, 24px); letter-spacing: .06em;
  text-shadow: 0 3px 0 #000, 0 0 12px #ff8a00; min-height: 1.3em; }
.boss-flash { position: absolute; inset: 0; z-index: 6; background: #fff; opacity: 0; pointer-events: none; }
@keyframes bossIn { from { transform: translateX(-50%) scale(1.4); opacity: 0; } to { opacity: 1; } }
.boss-dead span { animation-name: deadIn; }
@keyframes deadIn { from { transform: scale(2.2); opacity: 0; } to { transform: scale(1); opacity: 1; } }
`;

function buildMonster() {
  const g = new THREE.Group();
  const SKIN = '#4b2371', SKIN2 = '#6d3a9e', BELLY = '#9a6ccd', HORN = '#eadfc2', CLAW = '#f2ead6';
  const eye = { emissive: '#ff1a1a', emissiveIntensity: 2.2 };
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { at(m, x, y, z, rx, ry, rz); m.scale.set(sx, sy, sz); g.add(m); return m; };
  // corpo e barriga
  add(sphere(1, SKIN, 14, 10), 0, 70, 0, 0, 0, 0, 58, 78, 48);
  add(sphere(1, BELLY, 14, 10), 0, 62, 24, 0, 0, 0, 40, 55, 30);
  // pernas
  for (const s of [1, -1]) add(sphere(1, SKIN2, 10, 8), s * 34, 16, 0, 0, 0, 0, 22, 26, 22);
  // cabeça
  const head = new THREE.Group(); head.position.set(0, 160, 6); g.add(head);
  const hadd = (m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { at(m, x, y, z, rx, ry, rz); m.scale.set(sx, sy, sz); head.add(m); return m; };
  hadd(sphere(1, SKIN, 14, 10), 0, 0, 0, 0, 0, 0, 44, 36, 38);
  for (const s of [1, -1]) {
    hadd(sphere(1, '#1a0a0a', 10, 8), s * 16, 10, 30, 0, 0, 0, 11, 9, 6);
    hadd(sphere(1, '#ff2a2a', 10, 8, eye), s * 16, 10, 34, 0, 0, 0, 8, 6.5, 4);
    hadd(sphere(1, '#ffe07a', 8, 6, eye), s * 16, 10, 37.5, 0, 0, 0, 2.6, 4.5, 1.2);
    hadd(box(20, 4, 4, '#1a0a0a'), s * 16, 21, 30, 0, 0, s * -0.35);          // sobrancelha brava
    hadd(cone(7, 38, HORN, 8), s * 30, 34, 0, 0, 0, s * -0.6);               // chifres
  }
  hadd(box(50, 16, 10, '#2a0610'), 0, -14, 32);                               // boca
  for (let i = 0; i < 7; i++) {
    hadd(cone(2.8, 9, '#ffffff', 6), -21 + i * 7, -8, 36, Math.PI, 0, 0);    // dentes de cima
    if (i % 2 === 0) hadd(cone(2.4, 7, '#ffffff', 6), -18 + i * 6, -20, 36);  // dentes de baixo
  }
  // braços com garras
  const arms = [];
  for (const s of [1, -1]) {
    const arm = new THREE.Group(); arm.position.set(s * 55, 110, 0); g.add(arm);
    const a = (m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { at(m, x, y, z, rx, ry, rz); m.scale.set(sx, sy, sz); arm.add(m); return m; };
    a(sphere(1, SKIN2, 10, 8), 0, 0, 0, 0, 0, 0, 16, 16, 16);
    a(cyl(9, 11, 70, SKIN, 10), s * 12, -34, 8, 0.25, 0, s * 0.35);
    a(sphere(1, SKIN2, 10, 8), s * 24, -68, 18, 0, 0, 0, 16, 13, 16);
    for (let k = -1; k <= 1; k++) a(cone(3, 16, CLAW, 6), s * 24 + k * 8, -80, 26, Math.PI - 0.4, 0, 0);
    arms.push(arm);
  }
  // espinhos nas costas
  for (let i = 0; i < 6; i++) add(cone(7, 26, HORN, 6), 0, 50 + i * 20, -44 + i * 2, -0.9, 0, 0);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  g.rotation.y = Math.PI;              // olha para o norte, onde a van está
  return { g, head, arms };
}

/** Robô estilo "transformers" feito das peças da van (frente = +Z). */
function buildRobot() {
  const ORANGE = "#ff7a1a", DARK = "#3a3d44", CREAM = "#fff3dc", GLASS = "#2b4a6e", TIRE = "#1f2023";
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const legs = [], arms = [];
  for (const s of [1, -1]) {
    const leg = new THREE.Group(); leg.position.set(s * 0.8, 3.3, 0); body.add(leg);
    leg.add(at(box(1.0, 3.2, 1.0, DARK), 0, -1.6, 0));
    leg.add(at(box(1.3, 0.45, 1.8, ORANGE), 0, -3.1, 0.2));
    leg.add(at(cyl(0.55, 0.55, 0.4, TIRE, 12), s * 0.62, -1.9, 0, 0, 0, Math.PI / 2));
    legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(s * 2.0, 6.1, 0); body.add(arm);
    arm.add(at(box(0.85, 2.9, 0.85, ORANGE), 0, -1.45, 0));
    arm.add(at(box(1.0, 1.0, 1.0, DARK), 0, -3.2, 0));
    arms.push(arm);
    body.add(at(cyl(0.7, 0.7, 0.45, TIRE, 12), s * 1.95, 6.5, 0, 0, 0, Math.PI / 2));   // rodas nos ombros
  }
  body.add(at(box(2.4, 0.8, 1.3, DARK), 0, 3.5, 0));                     // quadril
  body.add(at(box(3.2, 2.8, 1.9, ORANGE), 0, 5.2, 0));                   // tronco (a carroceria)
  body.add(at(box(2.6, 1.0, 0.1, GLASS), 0, 5.8, 0.96));                 // para-brisa no peito
  body.add(at(box(3.22, 0.3, 1.92, CREAM), 0, 4.3, 0));                  // faixa creme
  for (const s of [1, -1]) body.add(at(box(0.5, 0.3, 0.1, "#fff7b0", { emissive: "#fff2a0", emissiveIntensity: 0.8 }), s * 1.0, 4.75, 0.96));
  body.add(at(box(1.1, 1.0, 1.0, CREAM), 0, 7.1, 0));                    // cabeça
  body.add(at(box(0.9, 0.25, 0.06, "#29e0ff", { emissive: "#29e0ff", emissiveIntensity: 1.5 }), 0, 7.2, 0.52));
  for (const s of [1, -1]) body.add(at(box(0.1, 0.7, 0.1, DARK), s * 0.45, 7.9, 0));
  body.add(at(box(1.4, 1.1, 0.9, "#c98a4a"), 0, 5.3, -1.3));             // a encomenda nas costas
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, body, legs, arms };
}

export function createMonster(scene, stageEl, audio) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'boss-wrap';
  wrap.innerHTML = '<div class="boss-name">O DEVORADOR DE BAIRROS</div><div class="boss-bar"><div class="boss-fill"></div></div><div class="boss-tip"></div>';
  const tip = wrap.querySelector('.boss-tip');
  let tipText = '';
  const setTip = s => { if (s !== tipText) { tipText = s; tip.textContent = s; } };
  const fill = wrap.querySelector('.boss-fill');
  const dead = document.createElement('div');
  dead.className = 'boss-dead';
  dead.innerHTML = '<span>VOCÊ MORREU</span>';
  const flash = document.createElement('div');
  flash.className = 'boss-flash';
  stageEl.append(wrap, dead, flash);

  const { g: monster, head, arms } = buildMonster();

  // ---- Robô (a van "transformers"): só anda. T durante a contagem final. ----
  const GRACE = 10;
  const robot = buildRobot();
  robot.root.visible = false;
  scene.add(robot.root);
  let robotOn = false, formT = 0, walkPh = 0, rx = 0, rz = 0, ryaw = Math.PI / 2;
  monster.visible = false;
  monster.position.set(CX, RISE_FROM, CZ);
  scene.add(monster);

  let phase = 'idle', t = 0, rumbleT = 0, shake = 0;
  let van = null, path = [], startHeading = 0;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), closePos = new THREE.Vector3(), closeLook = new THREE.Vector3(), m4 = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  const setPhase = p => { phase = p; t = 0; };

  function transform() {
    robotOn = true; formT = 0;
    rx = van.x; rz = van.z; ryaw = 0;
    van.object.visible = false;
    robot.root.visible = true;
    audio.transform && audio.transform();
  }

  function walkRobot(dt, input) {
    formT = Math.min(1, formT + dt / 0.8);
    const k = 1 - (1 - formT) * (1 - formT);
    robot.root.scale.setScalar(Math.max(0.05, k));
    let mx = 0, mz = 0;
    if (formT >= 1 && input) {
      const a = input.axis();                  // câmera olha para o sul: W = sul, D = oeste
      mx = -a.x; mz = -a.z;
    }
    const len = Math.hypot(mx, mz);
    if (len > 0) {
      rx += mx / len * 9 * dt; rz += mz / len * 9 * dt;
      rx = Math.max(-200, Math.min(MAP + 200, rx)); rz = Math.max(-200, Math.min(MAP + 200, rz));
      const want = Math.atan2(mx, mz);
      let d = want - ryaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ryaw += d * Math.min(1, dt * 10);
      walkPh += dt * 9;
    } else walkPh *= 0.9;
    robot.root.position.set(rx, 0, rz);
    robot.root.rotation.y = ryaw + (1 - k) * Math.PI * 4;   // gira enquanto se transforma
    const sw = Math.sin(walkPh) * (len > 0 ? 0.7 : 0);
    robot.legs[0].rotation.x = sw; robot.legs[1].rotation.x = -sw;
    robot.arms[0].rotation.x = -sw * 0.8; robot.arms[1].rotation.x = sw * 0.8;
    robot.body.position.y = Math.abs(Math.sin(walkPh)) * (len > 0 ? 0.25 : 0);
  }

  function start(v) {
    van = v;
    const x0 = v.x, z0 = v.z;
    // se estiver dentro do bairro, passa pela rua central até a entrada; senão vai direto
    const inside = x0 > 0 && x0 < MAP && z0 > 0 && z0 < MAP;
    path = inside ? [{ x: CX, z: Math.min(z0, MAP - 6) }, { x: CX, z: 4 }, OUT] : [OUT];
    if (inside && Math.abs(x0 - CX) < 1) path.shift();
    startHeading = v.heading;
    monster.visible = false;
    monster.position.set(CX, RISE_FROM, CZ);
    monster.rotation.x = 0;
    setPhase('driveOut');
  }

  function driveOut(dt) {
    const target = path[0];
    if (!target) {
      // chegou: vira de frente para o bairro
      let h = van.heading, d = Math.PI / 2 - h;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      h += Math.sign(d) * Math.min(Math.abs(d), 2.5 * dt);
      van.teleport(van.x, van.z, h);
      if (Math.abs(d) < 0.02 && t > 0.3) { monster.visible = true; setPhase('rise'); audio.rumble && audio.rumble(); }
      return;
    }
    const dx = target.x - van.x, dz = target.z - van.z, dist = Math.hypot(dx, dz), step = 26 * dt;
    let h = Math.atan2(dz, dx);
    if (dist <= step) { van.teleport(target.x, target.z, h); path.shift(); t = 0; }
    else van.teleport(van.x + dx / dist * step, van.z + dz / dist * step, h);
  }

  return {
    start,
    update(dt, input) {
      if (phase === 'idle' || phase === 'done') return phase;
      t += dt;
      shake = Math.max(0, shake - dt * 0.6);
      if (phase === 'driveOut') driveOut(dt);
      else if (phase === 'rise') {
        const k = Math.min(1, t / 6);
        monster.position.y = RISE_FROM * (1 - (1 - (1 - k) * (1 - k)));   // sobe desacelerando
        shake = 1.2;
        rumbleT -= dt;
        if (rumbleT <= 0 && k < 1) { rumbleT = 1.2; audio.rumble && audio.rumble(); }
        if (k >= 1) { setPhase('bar'); wrap.classList.add('on'); audio.roar && audio.roar(); shake = 1.5; }
      } else if (phase === 'bar') {
        fill.style.width = Math.min(100, t / 1.6 * 100).toFixed(1) + '%';
        head.rotation.z = Math.sin(t * 6) * 0.08;
        arms.forEach((a, i) => { a.rotation.z = Math.sin(t * 3 + i) * 0.15; });
        if (t > 1.8) setPhase('grace');
      } else if (phase === 'grace') {
        // últimos segundos: T vira robô e dá para andar; no fim ele ataca de qualquer jeito
        head.rotation.z = Math.sin(t * 6) * 0.08;
        arms.forEach((a, i) => { a.rotation.z = Math.sin(t * 3 + i) * 0.15; });
        if (!robotOn && input && input.hint()) transform();
        if (robotOn) walkRobot(dt, input);
        const left = Math.max(0, GRACE - t);
        setTip(robotOn ? `Ande com W A S D…  ${Math.ceil(left)}` : `Aperte T para se transformar!  ${Math.ceil(left)}`);
        if (t > GRACE) { setTip(''); setPhase('kill'); audio.roar && audio.roar(); }
      } else if (phase === 'kill') {
        // inclina sobre a van e esmaga
        const k = Math.min(1, t / 1.1);
        monster.rotation.x = -k * k * 0.75;
        arms.forEach(a => { a.rotation.x = -k * 1.6; });
        if (t > 1.1 && t - dt <= 1.1) { audio.boom && audio.boom(); shake = 2.5; flash.style.opacity = '1'; }
        if (t > 1.1) flash.style.opacity = String(Math.max(0, 1 - (t - 1.1) * 2.5));
        if (t > 1.5) { setPhase('dead'); dead.classList.add('on'); wrap.classList.remove('on'); }
      } else if (phase === 'dead') {
        if (t > 3) setPhase('done');
      }
      // piscar dos olhos / respiração
      if (monster.visible) monster.scale.setScalar(1 + Math.sin(performance.now() / 400) * 0.01);
      return phase;
    },
    /** Durante o chefe, a câmera enquadra a van e o monstro inteiro. Chamar depois do rig.update. */
    applyCamera(camera) {
      if (phase === 'idle' || phase === 'driveOut') return;
      // plano geral (intro e ataque final)
      camPos.set(OUT.x, 6, OUT.z - 78);
      camLook.set(CX, 96, CZ);
      if (phase === 'kill' || phase === 'dead') camLook.y = 70;
      let fov = 76;
      if (phase === 'grace') {
        // contagem final: a câmera volta para trás da van/robô (olhando para o monstro, ao sul)
        const sx = robotOn ? rx : van.x, sz = robotOn ? rz : van.z;
        const k = Math.min(1, t / 0.9), e = k * k * (3 - 2 * k);
        closePos.set(sx, robotOn ? 11 : 6.5, sz - (robotOn ? 24 : 14));
        closeLook.set(sx, robotOn ? 10 : 8, sz + 30);
        camPos.lerp(closePos, e);
        camLook.lerp(closeLook, e);
        fov = 76 + (60 - 76) * e;
      }
      camera.position.copy(camPos);
      camera.quaternion.setFromRotationMatrix(m4.lookAt(camPos, camLook, UP));
      camera.fov = fov; camera.updateProjectionMatrix();
      if (shake > 0) {
        const s = shake * shake * 0.8;
        camera.position.x += (Math.random() - 0.5) * s;
        camera.position.y += (Math.random() - 0.5) * s;
      }
    },
    reset() {
      robotOn = false; formT = 0; robot.root.visible = false; if (van) van.object.visible = true; setTip('');
      phase = 'idle'; t = 0; shake = 0;
      monster.visible = false; monster.position.set(CX, RISE_FROM, CZ); monster.rotation.x = 0;
      head.rotation.z = 0; arms.forEach(a => { a.rotation.x = 0; a.rotation.z = 0; });
      wrap.classList.remove('on'); dead.classList.remove('on'); flash.style.opacity = '0'; fill.style.width = '0%';
    },
    get phase() { return phase; },
    get robot() { return robotOn; },
    get active() { return phase !== 'idle' && phase !== 'done'; },
  };
}
