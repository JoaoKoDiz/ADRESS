// Nível extra 1 (história secundária, depois da queda do 4º sino): só a introdução.
// Vazio quase preto, o jogador a pé (fica branco no 1º passo de verdade), um cubo de céu/campo com o K e a R,
// aproximação travada, câmera de dentro atrás da R, o K sai pela esquerda dela, o cubo se quebra como vidro,
// aparece a figura preta gigante e a cena volta para a tela inicial. Nada é salvo como concluído.
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { buildStandingReader } from './models/reader.js';
import { buildBody } from './models/driver.js';

export const EXTRA_DONE_KEY = 'adress.extra.done';     // os 4 níveis extras concluídos (fim da chuva) — ainda nunca gravado

const BG = new THREE.Color('#0b0b0e');                  // o vazio
const E = 6.3, HALF = E / 2, CZ = -14, FRONT = CZ + HALF, BACK = CZ - HALF;   // cubo: aresta ≈ 3× a altura do jogador
const K0 = new THREE.Vector3(-1.1, 0, -12.3), R0 = new THREE.Vector3(1.0, 0, -14.7);
const FAR_VAN = { x: 1e9, z: 1e9 };
const T = { hold: 5, kWalk: 5.2, kAfter: 1.1, crack: 0.75, fall: 3.0, empty: 1.4, rise: 3.0, look: 4.6, out: 1.6 };

const SKY_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_F = `uniform float uOp; varying vec3 vW;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(vec3(0.70, 0.84, 0.97), vec3(0.18, 0.45, 0.88), smoothstep(-0.02, 0.65, h));
  vec2 q = d.xz / (abs(d.y) + 0.25) * 1.6;
  float cl = n2(q) * 0.55 + n2(q * 2.1 + 3.1) * 0.3 + n2(q * 4.3 + 7.7) * 0.15;
  c = mix(c, vec3(0.97, 0.98, 1.0), smoothstep(0.58, 0.82, cl) * smoothstep(0.02, 0.25, h) * 0.85);
  gl_FragColor = vec4(c, uOp);
}`;

function grassTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#6fae4a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(80,140,50,0.55)' : v < 0.85 ? 'rgba(140,196,96,0.5)' : 'rgba(230,220,120,0.6)'; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Faces do cubo (só as de dentro; a da frente, virada para o jogador, não existe): centro, eixos u/v e normal para dentro. */
const FACES = [
  { name: 'back', c: [0, HALF, BACK], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], div: 5 },
  { name: 'left', c: [-HALF, HALF, CZ], u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0], div: 4 },
  { name: 'right', c: [HALF, HALF, CZ], u: [0, 0, 1], v: [0, 1, 0], n: [-1, 0, 0], div: 4 },
  { name: 'top', c: [0, E, CZ], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0], div: 4 },
  { name: 'plain', c: [0, 0.002, CZ], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], div: 5 },
];

export function createExtraStory(ctx) {
  const { walker, input, audio } = ctx;
  const scene = new THREE.Scene(); scene.background = BG.clone();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#2a3020', 1.1));
  const sun = new THREE.DirectionalLight('#fff6e6', 1.7); sun.position.set(6, 12, 9); scene.add(sun);

  // ---- o cubo: céu (shader pela direção do olhar) e campo, cortados nos limites ----
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, uniforms: { uOp: { value: 1 } }, transparent: true, depthWrite: true });
  const grass = grassTex();
  const plainMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: grass, roughness: 1, transparent: true });
  const shardSky = skyMat.clone(); shardSky.side = THREE.DoubleSide; shardSky.uniforms = { uOp: { value: 1 } };
  const shardPlain = plainMat.clone(); shardPlain.side = THREE.DoubleSide;
  const cube = new THREE.Group(); scene.add(cube);
  const V3 = a => new THREE.Vector3(...a);
  // malha de cada face (pontos internos levemente deslocados): a mesma divisão vira as rachaduras e os cacos
  const faceTris = [];
  for (const f of FACES) {
    const c = V3(f.c), u = V3(f.u), v = V3(f.v), n = f.div, pts = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      let a = i / n - 0.5, b = j / n - 0.5;
      if (i > 0 && i < n) a += (Math.random() - 0.5) * 0.6 / n;
      if (j > 0 && j < n) b += (Math.random() - 0.5) * 0.6 / n;
      pts.push(c.clone().addScaledVector(u, a * E).addScaledVector(v, b * E));
    }
    const P = (i, j) => pts[j * (n + 1) + i], tris = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const d = Math.random() < 0.5;
      tris.push(d ? [P(i, j), P(i + 1, j), P(i + 1, j + 1)] : [P(i, j), P(i + 1, j), P(i, j + 1)]);
      tris.push(d ? [P(i, j), P(i + 1, j + 1), P(i, j + 1)] : [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]);
    }
    // face inteira (antes de quebrar): virada para dentro (de fora, só se vê o interior pela frente aberta)
    const geo = new THREE.BufferGeometry(), pos = [], uv = [], N = V3(f.n);
    for (const t of tris) {
      const e1 = t[1].clone().sub(t[0]), e2 = t[2].clone().sub(t[0]), flip = e1.cross(e2).dot(N) < 0;
      for (const p of flip ? [t[0], t[2], t[1]] : t) { pos.push(p.x, p.y, p.z); uv.push(p.x / E + 0.5, p.z / E + 0.5); }
      if (flip) { const s = t[1]; t[1] = t[2]; t[2] = s; }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    cube.add(new THREE.Mesh(geo, f.name === 'plain' ? plainMat : skyMat));
    for (const t of tris) faceTris.push({ t, plain: f.name === 'plain', n: N });
  }
  // rachaduras: as arestas dos cacos, um tiquinho para dentro
  const crackPos = [];
  for (const { t, n } of faceTris) for (let k = 0; k < 3; k++) { const a = t[k].clone().addScaledVector(n, 0.01), b = t[(k + 1) % 3].clone().addScaledVector(n, 0.01); crackPos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const crackGeo = new THREE.BufferGeometry(); crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPos, 3));
  const crackMat = new THREE.LineBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0, depthWrite: false });
  const cracks = new THREE.LineSegments(crackGeo, crackMat); cracks.renderOrder = 2; cube.add(cracks);
  // cacos (montados na hora da quebra)
  const shards = new THREE.Group(); scene.add(shards);

  // ---- K e R (cortados nos limites do cubo) ----
  const clip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), HALF), new THREE.Plane(new THREE.Vector3(1, 0, 0), HALF),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -BACK), new THREE.Plane(new THREE.Vector3(0, 0, -1), FRONT), new THREE.Plane(new THREE.Vector3(0, -1, 0), E)];
  const K = buildStandingReader();
  K.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = clip; o.castShadow = false; } });
  scene.add(K);
  const R = new THREE.Group(); const rBody = new THREE.Group(); rBody.scale.setScalar(0.86); R.add(rBody);
  const RB = buildBody(rBody);
  const rMat = new THREE.MeshStandardMaterial({ color: '#003EFF', roughness: 0.85, flatShading: true, clippingPlanes: clip, transparent: true });
  const capSlot = R.getObjectByName('cap'); if (capSlot) capSlot.visible = false;
  // cabelo comprido e saia (mesmo estilo facetado), tudo da mesma cor
  const hr = 0.45;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 10, 7, 0, Math.PI * 2, 0, 1.5), rMat); crown.position.y = 0.46; RB.head.add(crown);
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.78, 0.5, 4, 8), rMat); back.position.set(-0.2, 0.25, 0); back.scale.set(0.7, 1, 1.15); RB.head.add(back);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.42, 9, 1, true), rMat); skirt.position.y = -0.12; RB.pelvis.add(skirt);
  R.traverse(o => { if (o.isMesh) { o.material = rMat; o.castShadow = false; } });
  RB.arms.forEach((a, i) => { a.sh.rotation.z = 0.05; a.sh.rotation.x = (i ? 1 : -1) * 0.06; a.elbow.rotation.z = 0.12; });
  scene.add(R);

  // ---- a figura: humanoide inteiro preto, bem maior ----
  const figMat = new THREE.MeshBasicMaterial({ color: BG.clone() });
  const fig = buildStandingReader(); fig.traverse(o => { if (o.isMesh) { o.material = figMat; o.castShadow = false; } });
  fig.scale.set(4.6, 5.0, 4.6); fig.rotation.y = -Math.PI / 2; fig.position.set(0.4, 0, -19.5); fig.visible = false;
  const fh = fig.userData.head; scene.add(fig);

  // ---- som (efeitos): estalos do vidro e a quebra ----
  function glass(kind) {
    const ac = audio.ctx; if (!ac || !audio.out) return;
    const now = ac.currentTime + 0.01, out = ac.createGain(); out.gain.value = kind === 'crack' ? 0.35 : 0.8; out.connect(audio.out);
    const len = Math.floor(ac.sampleRate * (kind === 'crack' ? 0.5 : 1.6)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const tt = i / ac.sampleRate; d[i] = (Math.random() * 2 - 1) * (kind === 'crack' ? (Math.random() < 0.004 ? 1 : 0.05) * Math.exp(-tt * 5) : Math.exp(-tt * 3.2) * (0.6 + 0.4 * Math.random())); }
    const s = ac.createBufferSource(); s.buffer = buf; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'crack' ? 1800 : 2600;
    s.connect(hp); hp.connect(out); s.start(now);
    if (kind === 'crack') return;
    for (let i = 0; i < 14; i++) {                                          // tilintar dos cacos
      const o = ac.createOscillator(), g = ac.createGain(), t0 = now + Math.random() * 1.2;
      o.type = 'sine'; o.frequency.value = 2400 + Math.random() * 4200;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.25 + Math.random() * 0.4);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.8);
    }
  }

  // ---- câmera em 3ª pessoa (botão direito gira/inclina e fica onde o jogador deixou) ----
  const C = { yaw: 0, pitch: 0.28, oy: 0, op: 0, hold: false, dist: 6.2 };
  addEventListener('mousedown', e => { if (S && S.phase === 'walk' && e.button === 2) { C.hold = true; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 2) C.hold = false; });
  addEventListener('mousemove', e => { if (C.hold && S && S.phase === 'walk' && (e.buttons & 2)) { C.oy -= e.movementX * 0.005; C.op = Math.max(-0.2, Math.min(1.0, C.op + e.movementY * 0.004)); } });
  addEventListener('contextmenu', e => { if (S) e.preventDefault(); });
  const _l = new THREE.Vector3();
  function chaseCam(dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    let d = walker.heading - C.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; C.yaw += d * k;
    const yaw = C.yaw + C.oy, p = C.pitch + C.op;
    camera.position.set(walker.x - Math.cos(yaw) * Math.cos(p) * C.dist, 1.5 + Math.sin(p) * C.dist, walker.z - Math.sin(yaw) * Math.cos(p) * C.dist);
    camera.lookAt(_l.set(walker.x, 1.35, walker.z));
  }
  const shot = (p, l) => { camera.position.set(...p); camera.lookAt(_l.set(...l)); };

  let S = null;
  function reset() {
    for (const m of cube.children) if (m !== cracks) m.visible = true;
    cube.visible = true; cracks.visible = false; crackMat.opacity = 0;
    skyMat.uniforms.uOp.value = 1; plainMat.opacity = 1; rMat.opacity = 1; rMat.transparent = false; rMat.needsUpdate = true;
    while (shards.children.length) { const s = shards.children.pop(); s.geometry.dispose(); }
    K.position.copy(K0); K.rotation.y = -Math.PI / 2; K.visible = true; K.userData.legs.forEach(l => { l.rotation.z = 0; l.userData.knee.rotation.z = 0; });
    R.position.copy(R0); R.rotation.y = -Math.PI / 2; R.visible = true;
    fig.visible = false; figMat.color.copy(BG); if (fh) fh.rotation.set(0, 0, 0);
  }
  function breakCube() {
    for (const m of cube.children) m.visible = false;
    shardSky.uniforms.uOp.value = 1; shardPlain.opacity = 1;
    const c0 = new THREE.Vector3(0, HALF, CZ);
    for (const { t, plain, n } of faceTris) {
      const ctr = t[0].clone().add(t[1]).add(t[2]).multiplyScalar(1 / 3), geo = new THREE.BufferGeometry(), pos = [], uv = [];
      for (const p of t) { pos.push(p.x - ctr.x, p.y - ctr.y, p.z - ctr.z); uv.push(p.x / E + 0.5, p.z / E + 0.5); }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, plain ? shardPlain : shardSky); m.position.copy(ctr);
      const out = ctr.clone().sub(c0).normalize();
      m.userData = { v: out.multiplyScalar(0.6 + Math.random() * 1.2).add(new THREE.Vector3(0, plain ? -0.5 : 0.4 * Math.random(), 0)), w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5), delay: (plain ? 0.25 : 0) + Math.random() * 0.35 + (E - ctr.y) * 0.02 };
      shards.add(m);
    }
  }

  /** Começa a cena (o jogador já foi passado para cá pelo main). */
  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(0, 0, -Math.PI / 2); walker.show(true);
    C.yaw = walker.heading; C.oy = 0; C.op = 0; C.hold = false;
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, stopK: 1, ph: 0 };
    chaseCam(0, true);
    ctx.renderer.localClippingEnabled = true;
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();                     // a customização nunca foi tocada: só devolve os materiais
    walker.setSpeedMul(1);
    S = null; ctx.renderer.localClippingEnabled = false;
  }
  const go = (p) => { S.phase = p; S.t = 0; };

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt;
    const ax = S.phase === 'walk' ? input.axis() : { x: 0, z: 0 };
    // aproximação: perto do cubo (antes de entrar), o passo para suave e trava
    if (S.phase === 'walk') {
      S.fade = Math.max(0, S.fade - dt / 1.0);
      const bx = Math.max(0, Math.abs(walker.x) - HALF), bz = Math.max(0, walker.z - FRONT, BACK - walker.z);
      if (Math.hypot(bx, bz) < 2.5) { go('stop'); S.stopAx = { x: ax.x, z: ax.z || -1 }; }
    }
    const box = [{ x0: -HALF, x1: HALF, z0: BACK, z1: FRONT }];
    if (S.phase === 'stop') { S.stopK = Math.max(0, 1 - S.t / 0.7); walker.setSpeedMul(S.stopK); walker.update(dt, S.stopK > 0.02 ? S.stopAx : { x: 0, z: 0 }, 'car', box, FAR_VAN); }
    else walker.update(dt, ax, 'car', box, FAR_VAN);
    // branco: só depois do 1º deslocamento de verdade (girar a câmera não conta)
    if (!S.white && Math.hypot(walker.x, walker.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(S.wk * S.wk * (3 - 2 * S.wk)); }
    // R: respira; K: parado olhando para fora, depois sai andando
    const t = S.t;
    RB.torso.scale.y = 1 + 0.01 * Math.sin(performance.now() * 0.002);
    switch (S.phase) {
      case 'walk': chaseCam(dt); break;
      case 'stop':
        chaseCam(dt);
        if (S.t >= 0.95) { walker.setSpeedMul(1); go('hold'); }
        break;
      case 'hold':                                         // câmera de dentro, atrás da R, um pouco à esquerda dela
        shot([2.35 + t * 0.01, 2.55, BACK + 0.25], [-0.7, 1.0, FRONT + 2.5]);
        if (t >= T.hold) go('kexit');
        break;
      case 'kexit': {                                     // o K sai andando pela esquerda da R e some no corte do cubo
        shot([2.4, 2.55, BACK + 0.25], [-0.7, 1.0, FRONT + 2.5]);
        const want = 0.25, tr = Math.min(1, t / 0.7);
        K.rotation.y = -Math.PI / 2 + (want + Math.PI / 2) * (tr * tr * (3 - 2 * tr));
        if (t > 0.5) {
          const v = 1.25 * Math.min(1, (t - 0.5) / 0.4), hd = -K.rotation.y;
          K.position.x += Math.cos(hd) * v * dt; K.position.z += Math.sin(hd) * v * dt;
          S.ph += dt * 6.2;
          K.userData.legs.forEach((l, i) => { const a = Math.sin(S.ph + i * Math.PI); l.rotation.z = 0.45 * a; l.userData.knee.rotation.z = -0.55 * Math.max(0, -a) - 0.08; });
        }
        if (K.position.x > HALF + 0.9) { K.visible = false; if (!S.kGone) S.kGone = t; }
        if (S.kGone && t - S.kGone > T.kAfter) { go('crack'); glass('crack'); }
        break;
      }
      case 'crack':                                        // fora do cubo: o jogador (branco) e o cubo inteiro; a imagem racha
        shot([-4.6, 2.7, -3.4], [0.4, 2.7, CZ]);
        cracks.visible = true; crackMat.opacity = Math.min(0.85, t / T.crack);
        if (t >= T.crack) { breakCube(); glass('shatter'); go('fall'); }
        break;
      case 'fall': {                                       // os cacos caem no vazio e somem (sem chão)
        shot([-4.6, 2.7, -3.4], [0.4, 2.4 - t * 0.2, CZ]);
        rMat.transparent = true; rMat.opacity = Math.max(0, 1 - t / 1.1); R.visible = rMat.opacity > 0.01;
        for (const m of shards.children) {
          const ud = m.userData, tt = t - ud.delay; if (tt <= 0) continue;
          ud.v.y -= 9.8 * dt; m.position.addScaledVector(ud.v, dt);
          m.rotation.x += ud.w.x * dt; m.rotation.y += ud.w.y * dt; m.rotation.z += ud.w.z * dt;
        }
        const op = Math.max(0, 1 - Math.max(0, t - 1.2) / 1.5);
        shardSky.uniforms.uOp.value = op; shardPlain.opacity = op;
        if (t >= T.fall) { shards.visible = true; while (shards.children.length) { const s = shards.children.pop(); s.geometry.dispose(); } go('empty'); }
        break;
      }
      case 'empty':
        shot([-4.6, 2.7, -3.4], [0.4, 2.1, CZ]);
        if (t >= T.empty) { fig.visible = true; go('rise'); }
        break;
      case 'rise':                                         // a figura aparece (sem brilho, só um preto mais fundo que o vazio)
      case 'look': {
        const k = S.phase === 'rise' ? Math.min(1, t / T.rise) : 1;
        figMat.color.copy(BG).lerp(new THREE.Color(0, 0, 0), k * k * (3 - 2 * k));
        const u = S.phase === 'rise' ? t / (T.rise + T.look) : (T.rise + t) / (T.rise + T.look);
        const ue = u * u * (3 - 2 * u);
        shot([-4.6 + 0.9 * ue, 1.3 + 0.2 * ue, -1.8 + 0.6 * ue], [0.2, 5.6, -16]);
        if (fh && S.phase === 'look') fh.rotation.y = -0.18 * Math.min(1, t / 2.5);   // a cabeça se inclina de leve para o jogador
        if (S.phase === 'rise' && t >= T.rise) go('look');
        if (S.phase === 'look' && t >= T.look) go('out');
        break;
      }
      case 'out':
        S.fade = Math.min(1, t / T.out);
        if (t >= T.out + 0.25) { const cb = ctx.onEnd; stop(); cb && cb(); return; }
        break;
    }
  }

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && S.phase !== 'walk'; },
    _K: K, _R: R, _fig: fig, _shards: shards, _cube: cube,
    _jump(p) { if (!S) return; if (p !== 'walk' && !S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } go(p); S.fade = 0; },
  };
}
