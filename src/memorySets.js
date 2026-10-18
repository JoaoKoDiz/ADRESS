// Os quatro cenários das lembranças (história completa). Os MESMOS cenários servem aos níveis extras, aos fragmentos da
// batalha (as duas passagens) e às imagens dentro dos cacos de vidro — mesmo lugar, mesmo enquadramento; o que muda entre
// uma passagem e outra é o que o K faz.
// Linguagem visual das lembranças: tudo o que é lembrança recebe um contorno de luz na cor da experiência e perde um pouco
// de saturação (memoryize). O que está presente (o jogador branco, o K no fim do extra 4, a figura) não recebe.
import * as THREE from 'three';
import { buildStandingReader, buildPewReader } from './models/reader.js';
import { buildBody } from './models/driver.js';
import { smoothCharacter } from './models/kit.js';
import { buildWorkshop } from './models/workshop.js';
import { COL, VOID, makeChair, makeTable, makeFloorPiece, makeLampPost, makeCandle, makePiece, SEAT, sitPose } from './storyKit.js';

// ---------- a "luz de lembrança" ----------
/** O segmento a→b cruza a caixa? (teste das placas) */
function segBox(a, b, box) {
  let t0 = 0, t1 = 1;
  for (const k of ['x', 'y', 'z']) {
    const d = b[k] - a[k];
    if (Math.abs(d) < 1e-6) { if (a[k] < box.min[k] || a[k] > box.max[k]) return false; continue; }
    let u0 = (box.min[k] - a[k]) / d, u1 = (box.max[k] - a[k]) / d; if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false;
  }
  return true;
}
/** Clona os materiais do objeto (nunca mexe nos compartilhados) e acrescenta contorno colorido + leve dessaturação.
 *  Devolve { set(k) } para apagar (0) ou acender (1) o aspecto de lembrança, e { flicker(t) } para um tremor sutil. */
export function memoryize(root, hex, { rim = 0.55, desat = 0.28 } = {}) {
  const U = { uRim: { value: rim }, uRimColor: { value: new THREE.Color(hex) }, uDesat: { value: desat } };
  const done = new Map();
  root.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    const m0 = o.material;
    if (!(m0.isMeshStandardMaterial || m0.isMeshPhysicalMaterial)) return;
    let m = done.get(m0);
    if (!m) {
      m = m0.clone(); m.userData = Object.assign({}, m0.userData, { memory: true });
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, U);
        sh.fragmentShader = 'uniform float uRim; uniform vec3 uRimColor; uniform float uDesat;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
          'outgoingLight = mix(outgoingLight, vec3(dot(outgoingLight, vec3(0.299, 0.587, 0.114))), uDesat);\n' +
          'outgoingLight += uRimColor * uRim * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.2);\n#include <opaque_fragment>');
      };
      m.customProgramCacheKey = () => 'memory';
      done.set(m0, m);
    }
    o.material = m;
  });
  return {
    mats: [...done.values()],
    set(k) { U.uRim.value = rim * k; U.uDesat.value = desat * k; },
    flicker(t) { U.uRim.value = rim * (0.85 + 0.15 * Math.sin(t * 2.3) * Math.sin(t * 0.77 + 1)); },
    color(hex2) { U.uRimColor.value.set(hex2); },
  };
}

// ---------- pessoas das lembranças ----------
const PM = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, transparent: true, opacity: 1 });
/** Pessoa das lembranças (silhueta de uma cor, corpo antigo), com um traço que a distingue:
 *  'M' (quem acolheu: alta, xale), 'N' (a pessoa acolhida: capuz e alça de bolsa), 'A' (coque), 'B' (simples),
 *  'helper' (mão estendida; casaco longo), 'R' (azul, cabelo comprido e saia). */
export function makePerson(kind) {
  const colors = { M: '#77737c', N: '#6e6a66', A: '#5f5e68', B: '#666470', helper: '#706c68', R: COL.azul };
  const mat = kind === 'R' ? new THREE.MeshStandardMaterial({ color: COL.azul, roughness: 0.85, transparent: true }) : PM(colors[kind] || '#666');
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.scale.setScalar(kind === 'M' ? 0.98 : kind === 'N' ? 0.86 : kind === 'R' ? 0.86 : 0.92);
  const B = buildBody(body, { classic: true });
  const cap = root.getObjectByName('cap'); if (cap) cap.visible = false;
  const add = (g, p, x, y, z, s = [1, 1, 1], r = [0, 0, 0]) => { const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.scale.set(...s); m.rotation.set(...r); p.add(m); return m; };
  if (kind === 'M') {                                                    // xale caindo pelos ombros
    add(new THREE.TorusGeometry(0.3, 0.09, 8, 18), B.torso, 0, 0.55, 0, [1, 0.7, 1.15], [Math.PI / 2, 0, 0]);
    add(new THREE.BoxGeometry(0.08, 0.5, 0.36), B.torso, 0.18, 0.25, 0.1, [1, 1, 1], [0, 0, 0.08]);
    add(new THREE.CapsuleGeometry(0.3, 0.3, 4, 8), B.head, -0.16, 0.24, 0, [0.72, 1, 1.12]);
  } else if (kind === 'N') {                                             // capuz e alça de bolsa atravessada
    add(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, 1.9), B.head, -0.06, 0.42, 0, [1.05, 1.0, 1.08], [0, 0, 0.25]);
    add(new THREE.TorusGeometry(0.36, 0.025, 6, 22), B.torso, 0, 0.32, 0, [1, 1.35, 0.9], [0, 0, 0.6]);
    add(new THREE.BoxGeometry(0.16, 0.22, 0.26), B.pelvis, -0.05, 0.05, -0.28);
  } else if (kind === 'A') {
    add(new THREE.SphereGeometry(0.16, 10, 8), B.head, -0.3, 0.78, 0);
  } else if (kind === 'helper') {
    add(new THREE.CylinderGeometry(0.27, 0.36, 0.6, 12, 1, true), B.pelvis, 0, -0.12, 0);
  } else if (kind === 'R') {
    const hr = 0.45;
    add(new THREE.SphereGeometry(hr * 1.07, 10, 7, 0, Math.PI * 2, 0, 1.5), B.head, 0, 0.46, 0);
    add(new THREE.CapsuleGeometry(hr * 0.78, 0.5, 4, 8), B.head, -0.2, 0.25, 0, [0.7, 1, 1.15]);
    add(new THREE.CylinderGeometry(0.24, 0.42, 0.42, 9, 1, true), B.pelvis, 0, -0.12, 0);
    B.arms.forEach((a, i) => { a.sh.rotation.z = 0.05; a.sh.rotation.x = (i ? -1 : 1) * 0.1; a.elbow.rotation.z = 0.16; });
  }
  root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } }); smoothCharacter(root);
  root.userData = { B, mat, kind };
  return root;
}
/** K das lembranças (em pé e sentado): os mesmos modelos do K, com materiais próprios. */
export function makeMemoryK() { const k = buildStandingReader(); k.traverse(o => { if (o.isMesh) o.castShadow = false; }); return k; }
export function makeMemoryKSeated(seat = SEAT) { const k = buildPewReader(seat + 0.04); k.traverse(o => { if (o.isMesh) o.castShadow = false; }); return k; }

// ---------- R: a despedida (o mesmo cubo de céu e campo do extra 1, menor) ----------
const SKY_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_F = `uniform float uOp; varying vec3 vW;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main(){ vec3 d = normalize(vW - cameraPosition); float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(vec3(0.70, 0.84, 0.97), vec3(0.18, 0.45, 0.88), smoothstep(-0.02, 0.65, h));
  vec2 q = d.xz / (abs(d.y) + 0.25) * 1.6; float cl = n2(q) * 0.55 + n2(q * 2.1 + 3.1) * 0.3 + n2(q * 4.3 + 7.7) * 0.15;
  c = mix(c, vec3(0.97, 0.98, 1.0), smoothstep(0.58, 0.82, cl) * smoothstep(0.02, 0.25, h) * 0.85);
  gl_FragColor = vec4(c, uOp); }`;
let _grass = null;
function grassTex() {
  if (_grass) return _grass;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#6fae4a'; g.fillRect(0, 0, 128, 128);
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1400; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(80,140,50,0.55)' : v < 0.85 ? 'rgba(140,196,96,0.5)' : 'rgba(230,220,120,0.6)'; g.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 3); }
  _grass = new THREE.CanvasTexture(c); _grass.wrapS = _grass.wrapT = THREE.RepeatWrapping; _grass.repeat.set(3, 3); _grass.colorSpace = THREE.SRGBColorSpace; return _grass;
}
/** O cubo da despedida: céu e campo por dentro, aberto na frente (+Z). A frente é a "moldura" que se estreita
 *  (duas folhas escuras que deslizam das laterais). K e R são cortados nos limites do cubo (as faces de trás e dos lados
 *  continuam sendo o fim do mundo dela). Origem: centro do chão do cubo. */
export function buildFarewellSet({ E = 6.3 } = {}) {
  const g = new THREE.Group(); g.name = 'set-farewell';
  const H = E / 2;
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, uniforms: { uOp: { value: 1 } }, side: THREE.BackSide });
  const sky = new THREE.Mesh(new THREE.BoxGeometry(E, E, E), skyMat); sky.position.y = H;
  // a face da frente não existe: recorta a caixa (só os 5 lados de dentro)
  { const ix = sky.geometry.index.array, keep = []; const pos = sky.geometry.attributes.position;
    for (let i = 0; i < ix.length; i += 3) { const z = (pos.getZ(ix[i]) + pos.getZ(ix[i + 1]) + pos.getZ(ix[i + 2])) / 3; if (z < H - 1e-3) keep.push(ix[i], ix[i + 1], ix[i + 2]); }
    sky.geometry.setIndex(keep); }
  g.add(sky);
  const field = new THREE.Mesh(new THREE.PlaneGeometry(E, E).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: grassTex(), roughness: 1 }));
  field.position.y = 0.003; g.add(field);
  // a moldura da frente: borda fina clara + duas folhas escuras que deslizam das laterais
  const edgeM = new THREE.LineBasicMaterial({ color: '#eef3ff', transparent: true, opacity: 0.75 });
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-H, 0], [H, 0], [H, E], [-H, E]].map(([x, y]) => new THREE.Vector3(x, y, H + 0.01))), edgeM); g.add(edge);
  const leafM = new THREE.MeshBasicMaterial({ color: VOID, side: THREE.DoubleSide });
  const leafEdgeM = new THREE.LineBasicMaterial({ color: COL.azul, transparent: true, opacity: 0.9 });
  const leaves = [-1, 1].map(s => {
    const l = new THREE.Group(); const m = new THREE.Mesh(new THREE.PlaneGeometry(E / 2, E), leafM); m.position.set(s * E / 4, H, 0); l.add(m);   // (aberta: a folha fica para fora do cubo)
    const e = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(0, E, 0.01)]), leafEdgeM); l.add(e);
    l.position.z = H + 0.02; g.add(l); return { l, s };
  });
  const clip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), H), new THREE.Plane(new THREE.Vector3(1, 0, 0), H),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), H), new THREE.Plane(new THREE.Vector3(0, -1, 0), E)];
  const K = makeMemoryK(), R = makePerson('R');
  g.add(K, R);
  const set = {
    g, sky, field, edge, leaves, K, R, E, H,
    /** Largura da passagem que ainda existe na frente (E = toda aberta, 0 = fechada). */
    setOpen(w) { w = Math.max(0, Math.min(E, w)); for (const { l, s } of leaves) l.position.x = s * (w / 2); set.open = w; },
    open: E,
    /** Recorta K/R nos limites do cubo (a frente nunca corta o K: ele pode sair). Chamar depois de posicionar o grupo no mundo. */
    applyClip() {
      g.updateMatrixWorld(true);
      const m = g.matrixWorld, planes = clip.map(p => p.clone().applyMatrix4(m));
      for (const o of [K, R]) o.traverse(c => { if (c.isMesh) c.material.clippingPlanes = planes; });   // (materiais já próprios: memoryize clonou)
    },
  };
  set.memory = memoryize(K, COL.azul, { rim: 0.5, desat: 0.2 }); memoryize(R, COL.azul, { rim: 0.35, desat: 0 });
  set.setOpen(E);
  return set;
}

// ---------- M: a mesa ----------
/** Pedaços de chão, mesa redonda, cinco cadeiras e as pessoas. Origem: centro da mesa. Assentos (graus): */
export const TABLE_SEATS = { K: 200, M: 325, A: 268, B: 30, N: 125 };
export function seatPos(deg, r = 1.55) { const a = deg * Math.PI / 180; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }
export function buildTableSet() {
  const g = new THREE.Group(); g.name = 'set-table';
  const floor = new THREE.Group(); g.add(floor);
  for (const [x, z, w, d, r] of [[0, 0, 4.6, 4.4, 0], [-3.2, 1.6, 1.8, 2.2, 0.15], [3.0, -1.6, 1.6, 2.0, -0.2], [2.4, 3.4, 2.6, 1.6, 0.1], [-2.2, -2.6, 2.0, 1.4, -0.1]]) {
    const p = makeFloorPiece(w, d); p.position.set(x, 0, z); p.rotation.y = r; floor.add(p);
  }
  const table = makeTable(); g.add(table);
  const chairs = {}, people = {};
  for (const [id, deg] of Object.entries(TABLE_SEATS)) {
    const c = makeChair(id === 'K' ? '#82593a' : '#6b4a2e'); c.position.copy(seatPos(deg)); c.rotation.y = Math.atan2(-(0 - c.position.z), 0 - c.position.x); chairs[id] = c; g.add(c);
  }
  for (const id of ['M', 'A', 'B', 'N']) { const p = makePerson(id); people[id] = p; g.add(p); }
  const K = makeMemoryK(), KS = makeMemoryKSeated(); g.add(K, KS); KS.visible = false;
  const set = {
    g, floor, table, chairs, people, K, KS,
    home(id) { const c = chairs[id]; c.position.copy(seatPos(TABLE_SEATS[id])); c.rotation.y = Math.atan2(c.position.z, -c.position.x); c.visible = true; },
    /** Senta alguém na própria cadeira (ou levanta). */
    seat(id, on = true) {
      const c = chairs[id];
      if (id === 'K') { KS.visible = false; K.visible = true; if (on) { K.position.copy(c.position); K.rotation.y = c.rotation.y; } poseKSit(K, on ? 1 : 0); return; }
      const p = people[id]; if (on) { p.position.copy(c.position); p.rotation.y = c.rotation.y; } posePersonSit(p, on ? 1 : 0);
    },
    reset() { for (const id of Object.keys(TABLE_SEATS)) set.home(id); for (const id of ['M', 'A', 'B', 'N']) { set.seat(id); people[id].visible = true; } set.seat('K'); },
  };
  const mem = new THREE.Group(); mem.add(table, K, KS, ...Object.values(chairs), ...Object.values(people));   // (só para aplicar a luz de lembrança)
  set.memory = memoryize(mem, COL.verde, { rim: 0.5, desat: 0.25 }); for (const o of mem.children.slice()) g.add(o);
  set.reset();
  return set;
}

// ---------- C: a rua com neve ----------
/** Trecho curto de rua suspenso no vazio (ao longo de −Z), em placas que podem ruir; poste laranja; abrigo aquecido no fim.
 *  Origem: começo da rua. Placas de 2 m (tiles[i] cobre z de −2i a −2i−2). */
export function buildStreetSet({ len = 26, postZ = -12, shelterZ = -24.5 } = {}) {
  const g = new THREE.Group(); g.name = 'set-street';
  const snowM = new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 1 });
  const roadM = new THREE.MeshStandardMaterial({ color: '#b6bcc6', roughness: 1 });
  const tiles = [];
  for (let i = 0; i < len / 2; i++) {
    const t = new THREE.Group(); t.position.set(0, 0, -1 - i * 2); g.add(t);
    const s = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 1.98), snowM); s.position.y = -0.09; t.add(s);
    const r = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.98).rotateX(-Math.PI / 2), roadM); r.position.y = 0.004; t.add(r);
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.42 + ((i * 7 + (sx + 1) * 3) % 5) * 0.08, 10, 6), snowM); m.scale.y = 0.35; m.position.set(sx * (2.9 + (i % 3) * 0.2), 0, (i % 2) * 0.4 - 0.2); t.add(m); }
    tiles.push({ t, i, z0: -i * 2, z1: -i * 2 - 2, fall: 0 });
  }
  const post = makeLampPost(); post.position.set(1.7, 0, postZ); post.rotation.y = Math.PI; g.add(post);
  // o abrigo: uma fachada pequena com porta e janela acesas
  const shelter = new THREE.Group(); shelter.position.set(-0.3, 0, shelterZ); g.add(shelter);
  const wallM = new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.9 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4, 0.5), wallM); wall.position.y = 2; shelter.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7, 0.45, 1.5), snowM); roof.position.set(0, 4.2, 0.3); shelter.add(roof);
  const litM = new THREE.MeshBasicMaterial({ color: '#ffb066', toneMapped: false });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), litM); door.position.set(0, 1.1, 0.26); shelter.add(door);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.95), litM); win.position.set(2.0, 2.2, 0.26); shelter.add(win);
  const warm = new THREE.PointLight('#ff9a4a', 18, 14, 1.4); warm.position.set(0, 1.6, 1.4); shelter.add(warm);
  // neve caindo (em volta de um ponto que o usuário move: snow.center)
  const N = 800, sp = new Float32Array(N * 3), sGeo = new THREE.BufferGeometry();
  for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 24; sp[i * 3 + 1] = Math.random() * 11; sp[i * 3 + 2] = (Math.random() - 0.5) * 24; }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const flakes = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.06, transparent: true, opacity: 0.85, depthWrite: false }));
  flakes.frustumCulled = false; g.add(flakes);
  const helper = makePerson('helper'); helper.visible = false; g.add(helper);
  const K = makeMemoryK(); g.add(K);
  // pegadas (instâncias) e vapor
  const stepGeo = new THREE.PlaneGeometry(0.15, 0.27).rotateX(-Math.PI / 2), stepM = new THREE.MeshBasicMaterial({ color: '#8f97a3', transparent: true, opacity: 0.75, depthWrite: false });
  const steps = new THREE.InstancedMesh(stepGeo, stepM, 120); steps.count = 0; steps.frustumCulled = false; g.add(steps);
  let stepN = 0; const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
  const puffM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  const puffs = Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), puffM.clone()); m.visible = false; g.add(m); return { m, t: 9 }; });
  const set = {
    g, tiles, post, shelter, door, win, litM, warm, flakes, helper, K, postZ, shelterZ,
    /** Uma pegada (coordenadas locais da rua). */
    footprint(x, z, h) { _e.set(0, -h, 0); _q.setFromEuler(_e); steps.setMatrixAt(stepN % 120, _m.compose(new THREE.Vector3(x, 0.012, z), _q, _s)); stepN++; steps.count = Math.min(120, stepN); steps.instanceMatrix.needsUpdate = true; },
    clearSteps() { stepN = 0; steps.count = 0; },
    puff(x, y, z) { const p = puffs.find(q => q.t > 1.5); if (!p) return; p.t = 0; p.m.position.set(x, y, z); p.m.visible = true; },
    /** Luz do abrigo (1 acesa, 0 apagada). */
    setShelter(k) { litM.color.setRGB(1 * (0.08 + 0.92 * k), 0.69 * (0.06 + 0.94 * k), 0.4 * (0.05 + 0.95 * k)); warm.intensity = 18 * k; },
    /** Placa i ruindo (0 inteira → 1 caiu no vazio). */
    setTile(i, k) { const T = tiles[i]; if (!T) return; T.fall = k; T.t.position.y = -k * k * 9; T.t.rotation.x = k * 0.5 * ((i % 2) ? 1 : -1); T.t.visible = k < 0.999; },
    update(dt, cx, cz, gust = 0.5) {
      const pos = sGeo.attributes.position;
      for (let i = 0; i < N; i++) {
        let x = pos.getX(i) + dt * (1.2 + 2.6 * gust), y = pos.getY(i) - dt * 1.5, z = pos.getZ(i) + dt * 0.6;
        if (y < 0) y += 11; if (x - cx > 12) x -= 24; if (x - cx < -12) x += 24; if (z - cz > 12) z -= 24; if (z - cz < -12) z += 24;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
      for (const p of puffs) { if (!p.m.visible) continue; p.t += dt; p.m.position.y += dt * 0.25; p.m.position.x += dt * 0.5; p.m.scale.setScalar(1 + p.t * 2.2); p.m.material.opacity = Math.max(0, 0.33 * (1 - p.t / 1.4)); if (p.t > 1.4) p.m.visible = false; }
    },
    reset() { for (const T of tiles) set.setTile(T.i, 0); set.setShelter(1); set.clearSteps(); helper.visible = false; post.userData.set(1); },
  };
  set.memory = memoryize(K, COL.laranja, { rim: 0.5, desat: 0.2 }); set.helperMem = memoryize(helper, COL.laranja, { rim: 0.45, desat: 0 });
  memoryize(post, COL.laranja, { rim: 0.3, desat: 0.15 }); memoryize(shelter, COL.laranja, { rim: 0.25, desat: 0.2 });
  return set;
}

// ---------- S: a oficina destruída (a de verdade, do Bairro 24, em pedaços no vazio) ----------
/** A oficina do Bairro 24 no estado em que o temporal a deixou (setStage 5 + ruin), separada em pedaços que flutuam um
 *  pouco no vazio; a bancada fica no centro. Mais: vela roxa, uma viga escorada (a que o K tenta segurar), ferramenta e
 *  caderno na bancada, uma pedra firme. Origem: na frente da bancada (a bancada fica em z ≈ −1). */
export function buildWorkshopSet() {
  const g = new THREE.Group(); g.name = 'set-workshop';
  const ws = buildWorkshop(); ws.setStage(5); ws.ruin(Infinity);
  const root = ws.root; root.position.set(0.5, 0, 4.9); g.add(root);
  // sem chão de terra (o vazio aparece pelos vãos); peças agrupadas em blocos de 3,5 m que se afastam um pouco
  root.children[0].visible = false; root.children[1].visible = false;
  const chunks = new Map(), _p = new THREE.Vector3();
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const all = [];
  const fixed = new Set([ws.bench, ws.phone, ws.roof, ws.chair, ws.doorPivot, ws.ruinGroup, root.children[0], root.children[1]]);
  for (const o of root.children) if (!fixed.has(o) && !o.isLight && !o.isSprite) all.push(o);
  if (ws.ruinGroup) for (const o of ws.ruinGroup.children) all.push(o);
  for (const o of all) {
    o.getWorldPosition(_p);
    const k = Math.floor(_p.x / 3.5) + ',' + Math.floor(_p.z / 3.5);
    if (!chunks.has(k)) chunks.set(k, { off: new THREE.Vector3((rnd() - 0.5) * 0.9, 0.15 + rnd() * 0.7, (rnd() - 0.5) * 0.9), rot: (rnd() - 0.5) * 0.12, ph: rnd() * 6, items: [] });
    const c = chunks.get(k); c.items.push({ o, p0: o.position.clone(), r0: o.rotation.clone() });
  }
  // chão em placas onde se anda (dentro da oficina)
  const floor = new THREE.Group(); g.add(floor);
  for (const [x, z, w, d] of [[0, 2.5, 4.4, 3.2], [-3.4, 4.6, 3.2, 3.0], [3.4, 4.2, 3.0, 3.0], [0, 6.6, 3.4, 2.4], [-3.0, 0.6, 2.4, 2.4], [3.2, 0.6, 2.6, 2.4], [0, -0.2, 6.6, 1.4]]) {
    const p = makeFloorPiece(w, d, '#5b4a38'); p.position.set(x, 0, z); floor.add(p);
  }
  const candle = makeCandle(0.5); candle.position.set(2.2, 0.98, -1.05); g.add(candle);
  // a viga escorada: um esteio que cede e a viga presa nele (a ponta livre fica onde o K a segura)
  const beamG = new THREE.Group(); beamG.position.set(-1.6, 0, 1.4); g.add(beamG);
  const postM = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 });
  const prop = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), postM); prop.geometry.translate(0, 1.25, 0); prop.position.set(-1.6, 0, 0); beamG.add(prop);
  const beamPivot = new THREE.Group(); beamPivot.position.set(-1.6, 2.5, 0); beamG.add(beamPivot);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 0.22), postM); beam.position.set(1.7, 0, 0); beamPivot.add(beam);
  const tool = makePiece('tool'), book = makePiece('notebook'), stone = makePiece('stone');
  tool.position.set(0.9, 0.04, 2.2); tool.rotation.set(0, 0.6, Math.PI / 2); g.add(tool);
  book.position.set(-0.6, 1.0, -1.0); book.rotation.y = 0.2; g.add(book);
  stone.position.set(3.4, 0, 2.6); g.add(stone);
  const set = {
    g, ws, root, chunks, floor, candle, beamG, prop, beamPivot, beam, tool, book, stone,
    /** Pedaços flutuando (amp 0 = encaixados, 1 = separados). */
    float(t, amp = 1) {
      for (const c of chunks.values()) {
        const bob = Math.sin(t * 0.6 + c.ph) * 0.06;
        for (const it of c.items) { it.o.position.set(it.p0.x + c.off.x * amp, it.p0.y + (c.off.y + bob) * amp, it.p0.z + c.off.z * amp); it.o.rotation.set(it.r0.x, it.r0.y + c.rot * amp, it.r0.z); }
      }
    },
    /** Viga: k = quanto cedeu (0 escorada → 1 no chão). */
    setBeam(k) { prop.rotation.z = -1.25 * k * k; beamPivot.position.set(-1.6 + 1.0 * k, 2.5 - 2.3 * k, 0); beamPivot.rotation.z = -0.4 * k; },
    beamTip(out = new THREE.Vector3()) { beam.updateMatrixWorld(true); return beam.localToWorld(out.set(1.5, -0.12, 0)); },
    reset() { set.setBeam(0); candle.userData.set(1); tool.visible = book.visible = true; for (const c of chunks.values()) { c.alpha = 1; applyAlpha(c); } },
    /** Pedaço entre a câmera e o jogador fica translúcido (cada bloco com os próprios materiais, criados na 1ª vez). */
    occlude(cam, target, dt) {
      for (const c of chunks.values()) {
        if (!c.box) { c.box = new THREE.Box3(); c.loc = new THREE.Box3(); for (const it of c.items) c.loc.expandByObject(it.o); c.ref = c.items[0].o.position.clone(); }
        const d = c.items[0].o.position; c.box.copy(c.loc).translate(_p.copy(d).sub(c.ref));   // (o bloco inteiro flutua junto)
        const hit = segBox(cam, target, c.box);
        const want = hit ? 0.16 : 1; c.alpha = c.alpha === undefined ? 1 : c.alpha + (want - c.alpha) * Math.min(1, dt * 7);
        if (Math.abs(c.alpha - (c.shown === undefined ? 1 : c.shown)) > 0.01) applyAlpha(c);
      }
    },
  };
  function applyAlpha(c) {
    const a = c.alpha === undefined ? 1 : c.alpha; c.shown = a;
    if (a > 0.995 && !c.mats) return;
    if (!c.mats) { c.mats = new Map(); for (const it of c.items) it.o.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material)) { let m = c.mats.get(o.material); if (!m) { m = o.material.clone(); m.onBeforeCompile = o.material.onBeforeCompile; m.customProgramCacheKey = o.material.customProgramCacheKey; m.userData.op0 = o.material.opacity; c.mats.set(o.material, m); } o.material = m; } }); }
    for (const m of c.mats.values()) { m.transparent = a < 0.995 || m.userData.op0 < 1; m.opacity = m.userData.op0 * a; m.depthWrite = a > 0.6; }
  }
  set.memory = memoryize(root, COL.roxo, { rim: 0.03, desat: 0.32 }); memoryize(beamG, COL.roxo, { rim: 0.22, desat: 0.2 });
  set.float(0, 1);
  return set;
}

/** Foto de um cenário (para os cacos de vidro): renderiza a cena numa textura uma vez. */
export function renderSetImage(renderer, scene, camera, w = 384, h = 512) {
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prev = renderer.getRenderTarget(), a = camera.aspect; camera.aspect = w / h; camera.updateProjectionMatrix();
  const lc = renderer.localClippingEnabled; renderer.localClippingEnabled = true;
  renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(prev);
  renderer.localClippingEnabled = lc; camera.aspect = a; camera.updateProjectionMatrix();
  return rt;
}

// ---------- poses (sentar/levantar com o mesmo modelo, para a transição ser contínua) ----------
/** K em pé (buildStandingReader) → sentado (k = 1): coxas para a frente, joelhos dobrados, quadril baixa. */
export function poseKSit(K, k, seat = SEAT) {
  const u = K.userData; if (!u.legs) return;
  const e = k * k * (3 - 2 * k), drop = 0.91 * 0.9 - (seat + 0.15);
  u.legs.forEach(l => { l.rotation.z = (Math.PI / 2 - 0.08) * e; l.userData.knee.rotation.z = -(Math.PI / 2 - 0.25) * e; l.userData.foot.rotation.z = -0.15 * e; });
  u.body.position.y = -drop * e; u.body.position.x = -0.08 * e;
  u.sit = k;
}
/** Pessoa das lembranças (corpo antigo) em pé → sentada (k = 1). */
export function posePersonSit(p, k, seat = SEAT) {
  const B = p.userData.B; if (!B) return; const e = k * k * (3 - 2 * k), sc = p.children[0].scale.y;
  B.legs.forEach(l => { l.hip.rotation.z = (Math.PI / 2) * e; l.knee.rotation.z = -(Math.PI / 2) * e; });
  B.pelvis.position.y = 0.64 + ((seat / sc + 0.13) - 0.64) * e;
  p.userData.sit = k;
}
/** Braço de uma pessoa das lembranças erguido para a frente (0..1), com o cotovelo um pouco dobrado (oferecer a mão, chamar). */
export function personReach(p, side, k, lift = 1.25) {
  const B = p.userData.B; if (!B) return; const a = B.arms[side > 0 ? 1 : 0]; if (!a) return;
  if (a.r0 === undefined) a.r0 = a.sh.rotation.z;
  a.sh.rotation.z = a.r0 + lift * k; a.elbow.rotation.z = 0.25 * k;
}
