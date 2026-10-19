// Nível 13 (Morro): gente fazendo coisas nos espaços que o bairro já tem.
// - Campinho (quadra no alto): pelada 3 × 3 ("com camisa × sem camisa", goleiro de cada lado) com bola de verdade:
//   quem está com ela domina, conduz, olha, passa ou chuta; quem recebe corre até onde a bola vai chegar, para e domina;
//   o adversário mais perto aperta e às vezes desarma; gol tem comemoração, goleiro busca a bola no fundo da rede e repõe;
//   bola pela linha de fundo vira tiro de meta; uma ou outra falta para o jogo e vira reclamação. Dois meninos esperam a vez
//   no banco. Nada é sincronizado: cada menino tem ritmo, pé, paciência e fôlego próprios.
// - Pracinha: quatro senhores no dominó (pensa, bate a pedra na mesa, passa a vez batendo na mesa, embaralha no fim da mão)
//   e um palpiteiro em pé.
// - Mercadinho: o dono arruma as frutas, varre a calçada e fica na porta; uma freguesa vem, escolhe, conversa, paga e vai.
// Pessoas no estilo dos moradores (cabeção redondo, olhos de ponto, bochechas, tronco cilíndrico), roupa de calor (camiseta,
// regata, bermuda, chinelo/tênis). Cada pessoa é UMA malha com esqueleto (mesma técnica e animações de
// models/medievalPeople.js: animatePerson, reach). Nada aqui é sólido, destino, pista ou missão. Longe do jogador (> ~95)
// cada grupo some e para.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PEOPLE_MAT, animatePerson, reach, buildItem } from './models/medievalPeople.js';
import { FAV, DOMINO, DOMINO_ROW as ROW, courtBench as BENCH } from './favelaPlan.js';

const EYES = '#2a1d14', CHEEK = '#f29a8a', MOUTH = '#5a2018';
const HY = 0.34, LA = 0.25;
const FAR = 95, SHADOW = 45;
const sin = Math.sin, cos = Math.cos, hyp = Math.hypot;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;
const wrap = a => Math.atan2(sin(a), cos(a));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- pessoas ----
const GEO = new Map();
const gget = (key, make) => { let x = GEO.get(key); if (!x) { x = make(); GEO.set(key, x); } return x; };
const up = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n * 2)));
const G = {
  box: (w, h, d) => gget(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 8) => gget(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, up(s, 14, 24))),
  sph: (r, ws = 8, hs = 6) => gget(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, up(ws, 14, 24), up(hs, 10, 16))),
  hemi: (r, ws = 10, hs = 4) => gget(`h${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, up(ws, 16, 24), up(hs, 6, 10), 0, Math.PI * 2, 0, Math.PI / 2)),
  torus: (r, t, rs = 4, ts = 12, arc = Math.PI * 2) => gget(`t${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, up(rs, 6, 10), up(ts, 16, 28), arc)),
};
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _c = new THREE.Color();
const tm = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
const shade = (hex, k) => '#' + _c.set(hex).multiplyScalar(k).getHexString();
function bake(parts, boneMats) {
  const geos = parts.map(p => {
    const ge = p.geo.clone(); ge.deleteAttribute('uv');
    ge.applyMatrix4(new THREE.Matrix4().multiplyMatrices(boneMats[p.bone], p.m));
    const n = ge.attributes.position.count, col = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    _c.set(p.color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; si[i * 4] = p.bone; sw[i * 4] = 1; }
    ge.setAttribute('color', new THREE.BufferAttribute(col, 3));
    ge.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); ge.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    return ge;
  });
  const out = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
  return out;
}

export const SKINS = ['#f0c49a', '#e8b48a', '#d9a074', '#c08560', '#a8714c', '#8d5a3b', '#6b4430', '#5a3a28'];
const HAIRS = ['#1d1d1f', '#2a1d14', '#3a2a1a', '#5a3a22', '#2b2522', '#6b3e26', '#c98a4a'];

/**
 * Morador do Morro (frente +Z, pés em y = 0), roupa de calor. L: { k, skin, hair, hairStyle ('short' | 'buzz' | 'curly' |
 * 'long' | 'bun' | 'braids' | 'bald'), top (camisa; null = sem camisa), sleeve ('short' | 'tank' | 'long'), collar, stripe,
 * shorts (bermuda) ou pants (calça), shoes, flip (chinelo), socks, cap, glasses, mustache, kid, old, gloves }.
 * Devolve P no mesmo formato das pessoas do Medieval (b = juntas, hand, give/drop) para usar animatePerson/reach.
 */
export function buildPerson(L) {
  const bones = [];
  const B = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const body = B('body', null, 0, 0, 0);
  const hipL = B('hipL', body, -0.14, 0.62, 0), kneeL = B('kneeL', hipL, 0, -0.3, 0);
  const hipR = B('hipR', body, 0.14, 0.62, 0), kneeR = B('kneeR', hipR, 0, -0.3, 0);
  const waist = B('waist', body, 0, 0.6, 0);
  const head = B('head', waist, 0, 0.58, 0);
  const mouth = B('mouth', head, 0, HY - 0.175, 0.37);
  const shL = B('shL', waist, -0.4, 0.52, 0), elL = B('elL', shL, 0, -0.27, 0);
  const shR = B('shR', waist, 0.4, 0.52, 0), elR = B('elR', shR, 0, -0.27, 0);
  const parts = [];
  const P = (bone, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ bone: bones.indexOf(bone), geo, color, m: tm(x, y, z, rx, ry, rz, sx, sy, sz) });
  const skin = L.skin, top = L.top || skin, bare = !L.top, low = L.pants || L.shorts || '#3d4a66';
  // pernas: coxa (quadril), canela + calçado (joelho)
  for (const [hip, knee] of [[hipL, kneeL], [hipR, kneeR]]) {
    if (L.pants) { P(hip, G.box(0.22, 0.32, 0.24), L.pants, 0, -0.15, 0); P(knee, G.box(0.2, 0.22, 0.22), L.pants, 0, -0.11, 0); }
    else {
      P(hip, G.box(0.24, 0.21, 0.26), low, 0, -0.085, 0);                     // perna da bermuda
      P(hip, G.box(0.19, 0.15, 0.2), skin, 0, -0.24, 0);
      P(knee, G.box(0.17, 0.22, 0.18), skin, 0, -0.11, 0);
      if (L.socks) P(knee, G.box(0.18, 0.07, 0.19), L.socks, 0, -0.17, 0);
    }
    if (L.flip) { P(knee, G.box(0.17, 0.1, 0.27), skin, 0, -0.265, 0.04); P(knee, G.box(0.22, 0.035, 0.34), L.flip, 0, -0.302, 0.04); P(knee, G.box(0.03, 0.03, 0.12), L.flip, 0, -0.262, 0.1); }
    else { P(knee, G.box(0.26, 0.12, 0.34), L.shoes || '#f2f2f2', 0, -0.255, 0.04); P(knee, G.box(0.27, 0.035, 0.35), L.sole || '#e9e4da', 0, -0.302, 0.04); }
  }
  // bermuda/calça (quadris, presa ao corpo)
  P(body, G.cyl(0.37, 0.39, 0.17, 10), low, 0, 0.545, 0);
  // tronco (cintura): camiseta, regata ou sem camisa
  const T = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(waist, geo, color, x, y - 0.6, z, rx, ry, rz, sx, sy, sz);
  T(G.cyl(0.34, 0.37, 0.62, 10), top, 0, 0.88, 0);
  if (!bare) {
    T(G.cyl(0.377, 0.383, 0.07, 10), shade(top, 0.9), 0, 0.6, 0);             // barra da camiseta por cima da bermuda
    T(G.torus(0.25, 0.04, 4, 12), L.collar || shade(top, 0.82), 0, 1.175, 0, Math.PI / 2, 0, 0);
    if (L.stripe) T(G.cyl(0.376, 0.379, 0.1, 10), L.stripe, 0, 0.9, 0);
  } else T(G.cyl(0.378, 0.385, 0.06, 10), shade(low, 0.8), 0, 0.615, 0);       // elástico da bermuda à mostra
  // braços: ombro + manga (ombro), antebraço + mão (cotovelo)
  for (const [sh, el] of [[shL, elL], [shR, elR]]) {
    const sleeveC = bare || L.sleeve === 'tank' ? skin : top;
    P(sh, G.sph(0.13, 8, 6), sleeveC, 0, 0, 0);
    if (!bare && L.sleeve !== 'tank' && L.sleeve !== 'long') { P(sh, G.cyl(0.108, 0.104, 0.15, 8), top, 0, -0.07, 0); P(sh, G.cyl(0.092, 0.088, 0.16, 8), skin, 0, -0.2, 0); }
    else P(sh, G.cyl(0.1, 0.095, 0.29, 8), L.sleeve === 'long' && !bare ? top : skin, 0, -0.135, 0);
    P(el, G.cyl(0.09, 0.082, 0.2, 8), L.sleeve === 'long' && !bare ? top : skin, 0, -0.1, 0);
    P(el, G.sph(L.gloves ? 0.12 : 0.1, 8, 6), L.gloves || skin, 0, -LA, 0);
  }
  // cabeça
  const H = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(head, geo, color, x, y, z, rx, ry, rz, sx, sy, sz);
  H(G.sph(0.4, 10, 8), skin, 0, HY, 0);
  const hair = L.hair, hs = L.hairStyle || 'short';
  if (hs === 'curly') { H(G.sph(0.47, 10, 8), hair, 0, HY + 0.14, -0.08, 0, 0, 0, 1.04, 0.82, 1.0); H(G.box(0.74, 0.36, 0.24), hair, 0, HY - 0.02, -0.26); }
  else if (hs === 'buzz') { H(G.sph(0.425, 10, 7), hair, 0, HY + 0.11, -0.05, 0, 0, 0, 1, 0.74, 1); H(G.box(0.7, 0.3, 0.2), hair, 0, HY - 0.02, -0.25); }   // cabelo raspado (rente)
  else if (hs === 'bald') H(G.torus(0.37, 0.085, 4, 12, Math.PI), hair, 0, HY - 0.03, -0.02, -Math.PI / 2, 0, 0);   // careca: só a coroa de cabelo atrás e dos lados
  else {
    H(G.sph(0.43, 10, 7), hair, 0, HY + 0.12, -0.06, 0, 0, 0, 1, 0.72, 1);
    if (hs === 'long') { H(G.box(0.74, 0.66, 0.24), hair, 0, HY - 0.12, -0.25); for (const sd of [-1, 1]) H(G.box(0.12, 0.46, 0.22), hair, sd * 0.37, HY - 0.08, -0.04); }
    else H(G.box(0.72, 0.4, 0.22), hair, 0, HY - 0.02, -0.26);
    if (hs === 'bun') H(G.sph(0.16, 8, 6), hair, 0, HY + 0.26, -0.36);
    if (hs === 'braids') for (const sd of [-1, 1]) { H(G.cyl(0.07, 0.05, 0.42, 6), hair, sd * 0.24, HY - 0.32, -0.3, 0.2, 0, -sd * 0.15); H(G.sph(0.055, 6, 4), L.tie || '#e84a5f', sd * 0.27, HY - 0.52, -0.34); }
  }
  for (const s of [-1, 1]) { H(G.sph(0.065, 6, 4), EYES, s * 0.15, HY + 0.05, 0.36); H(G.sph(0.065, 6, 4), CHEEK, s * 0.25, HY - 0.08, 0.31); }
  H(G.sph(0.06, 6, 4), skin, 0, HY - 0.04, 0.4);
  H(G.box(0.15, 0.04, 0.05), EYES, 0, HY - 0.18, 0.36);
  if (L.old) for (const s of [-1, 1]) H(G.box(0.16, 0.045, 0.05), hair, s * 0.15, HY + 0.16, 0.355, 0, 0, s * 0.18);
  if (L.mustache) H(G.box(0.28, 0.065, 0.07), L.mustache, 0, HY - 0.115, 0.375);
  if (L.glasses) { for (const s of [-1, 1]) H(G.box(0.17, 0.11, 0.03), L.glasses, s * 0.15, HY + 0.05, 0.395); H(G.box(0.08, 0.03, 0.03), L.glasses, 0, HY + 0.08, 0.4); }
  if (L.cap) { H(G.hemi(0.45, 10, 4), L.cap, 0, HY + 0.1, -0.03, 0, 0, 0, 1, 0.8, 1); H(G.box(0.48, 0.05, 0.34), L.cap, 0, HY + 0.17, 0.36, -0.12, 0, 0); }
  P(mouth, G.box(0.14, 0.1, 0.05), MOUTH, 0, 0, 0);
  // pose de ligação
  const tmp = new THREE.Group(); tmp.add(body); tmp.updateMatrixWorld(true);
  const geom = bake(parts, bones.map(b => b.matrixWorld.clone()));
  tmp.remove(body);
  const mesh = new THREE.SkinnedMesh(geom, PEOPLE_MAT);
  mesh.add(body); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const root = new THREE.Group(); root.name = 'morro:' + (L.name || 'pessoa'); root.add(mesh);
  if (L.kid) { root.scale.setScalar(0.66); head.scale.setScalar(1.14); }
  const handL = new THREE.Object3D(), handR = new THREE.Object3D();
  handL.position.set(0, -LA, 0); handR.position.set(0, -LA, 0); elL.add(handL); elR.add(handR);
  return {
    root, mesh, look: L, child: !!L.kid, k: L.k || 0, stoop: L.old ? 0.1 : 0, b: { body, hipL, kneeL, hipR, kneeR, waist, head, mouth, shL, elL, shR, elR },
    hand: { L: handL, R: handR }, items: {}, held: [],
    give(name, where = 'R', o = {}) {
      let it = this.items[name]; if (!it) it = this.items[name] = buildItem(name, { k: this.k, ...o });
      if (it.userData.setFull && o.full != null) it.userData.setFull(o.full);
      (where === 'body' ? body : where === 'L' ? handL : handR).add(it);
      it.userData.where = where; it.userData.tilt = 0; it.visible = true;
      if (!this.held.includes(it)) this.held.push(it);
      return it;
    },
    drop(name) { for (const it of this.held.slice()) if (!name || it.name === 'item:' + name) { if (it.parent) it.parent.remove(it); this.held.splice(this.held.indexOf(it), 1); } },
    setShadow(on) { mesh.castShadow = on; },
  };
}

/** Ponto do mundo → espaço do corpo (frente +Z) de quem está em (x, y, z) virado para ry, com escala sc. */
function toLocal(x, y, z, ry, sc, w) {
  const dx = w.x - x, dz = w.z - z, c = cos(ry), s = sin(ry);
  return [(dx * c - dz * s) / sc, (w.y - y) / sc, (dx * s + dz * c) / sc];
}
const newState = () => ({ mode: 'idle', ph: 0, amp: 0, t: 0, ev: [], lookYaw: 0, lookPitch: 0, talk: 0, act: null, at: 0, work: null, seat: 0.45 });

// ---------------------------------------------------------------- bola ----
function ballMesh(r) {
  const g = new THREE.IcosahedronGeometry(r, 2).toNonIndexed(), pos = g.attributes.position, n = pos.count;
  const ico = new THREE.IcosahedronGeometry(1, 0), ip = ico.attributes.position, poles = [];
  for (let i = 0; i < ip.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ip, i).normalize(); if (!poles.some(p => p.distanceTo(v) < 0.01)) poles.push(v); }
  const col = new Float32Array(n * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let f = 0; f < n; f += 3) {
    a.fromBufferAttribute(pos, f); b.fromBufferAttribute(pos, f + 1); c.fromBufferAttribute(pos, f + 2);
    const m = a.add(b).add(c).normalize(), dark = poles.some(p => p.dot(m) > 0.955);
    for (let k = 0; k < 3; k++) col.set(dark ? [0.08, 0.08, 0.09] : [0.97, 0.97, 0.95], (f + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
  m.castShadow = true; m.name = 'morro:bola';
  return m;
}

// ---------------------------------------------------------------- pelada ----
const KID_SCALE = 0.66;
const TEAM_SHIRT = '#f2c230';
/** Visual dos 8 meninos: 4 de camisa amarela (time "com camisa") e 4 sem camisa. */
function kidLooks() {
  const L = [];
  const shorts = ['#1f4fa0', '#2f7a3f', '#2b2b2b', '#c8402f', '#5a5f6e', '#1f3a68', '#7a4a2a', '#2f9a8a'];
  const styles = ['buzz', 'curly', 'short', 'buzz', 'curly', 'short', 'buzz', 'braids'];
  for (let i = 0; i < 8; i++) {
    const team = i < 4 ? 0 : 1;
    L.push({ name: 'menino' + i, k: i * 3 + 1, kid: true, skin: SKINS[(i * 5 + 2) % SKINS.length], hair: ['#1d1d1f', '#2a1d14', '#3a2a1a', '#1d1d1f', '#2b2522', '#5a3a22', '#1d1d1f', '#2a1d14'][i], hairStyle: styles[i],
      top: team === 0 ? TEAM_SHIRT : null, collar: '#2f7a3f', shorts: shorts[i], shoes: i % 3 === 2 ? null : ['#f2f2f2', '#2b2b2b', '#c8402f', '#1f78d1'][i % 4],
      flip: i % 3 === 2 ? ['#1f78d1', '#2f9a4a', '#ffd23f'][i % 3] : null, socks: i % 4 === 0 ? '#f2f2f2' : null, team });
  }
  return L;
}

function createPelada(F) {
  const C = F.court, Y = C.y + 0.14, cx = (C.x0 + C.x1) / 2, GZ = (C.z0 + C.z1) / 2;
  const GL = [C.x0 + 1.2, C.x1 - 1.2], GH = 1.5, BAR = 2.0, NET = 0.95, R = 0.13;
  const FX0 = C.x0 + 0.18, FX1 = C.x1 - 0.18, FZ0 = C.z0 + 0.18, FZ1 = C.z1 - 0.18;      // face de dentro do alambrado
  const PZ0 = C.z0 + 1.2, PZ1 = C.z1 - 0.6;                                                // onde os meninos costumam ficar (posições)
  const group = new THREE.Group(); group.name = 'morro-pelada';
  const kids = kidLooks().map((L, i) => {
    const P = buildPerson(L); group.add(P.root);
    return { i, P, team: L.team, s: newState(), seed: Math.random() * 10 };
  });
  const ball = { mesh: ballMesh(R), x: cx, z: GZ, y: Y + R, vx: 0, vz: 0, vy: 0, owner: null, held: null, kind: 'loose', to: null, last: null, inNet: -1, rest: 0 };
  group.add(ball.mesh);
  const bench = BENCH(C);                                                                  // banco de dentro, junto ao alambrado norte
  let players = [], subs = [], phase = 'play', phT = 0, t = 0, path = [], walkerPrev = null, score = [0, 0], log = [], stuckT = 0;
  const goalX = team => GL[team === 0 ? 1 : 0];                                             // gol que o time ataca
  const ownX = team => GL[team];                                                            // gol que o time defende
  const dirOf = team => (team === 0 ? 1 : -1);
  const ev = (type, k) => { log.push({ t: +t.toFixed(2), type, k: k ? k.i : -1 }); if (log.length > 400) log.shift(); };

  // ---- elenco da partida ----
  function reset() {
    const cam = kids.filter(k => k.team === 0).sort(() => Math.random() - 0.5), sem = kids.filter(k => k.team === 1).sort(() => Math.random() - 0.5);
    players = [...cam.slice(0, 3), ...sem.slice(0, 3)]; subs = [cam[3], sem[3]];
    for (const team of [0, 1]) {
      const tm = players.filter(k => k.team === team);
      tm.forEach((k, j) => {
        Object.assign(k, { gk: j === 0, sub: false, role: j, x: j === 0 ? ownX(team) + dirOf(team) * 0.9 : lerp(ownX(team), cx, j === 1 ? 0.45 : 0.85), z: GZ + (j === 0 ? 0 : j === 1 ? -3 : 3) + rnd(-1, 1),
          vx: 0, vz: 0, v: 0, act: 'free', at: 0, dec: rnd(0, 0.6), foot: Math.random() < 0.25 ? -1 : 1, pace: rnd(0.88, 1.08), skill: rnd(0.65, 1), patience: rnd(0.25, 1.3), aggr: rnd(0.3, 0.9),
          stamina: rnd(0.7, 1), cele: Math.floor(Math.random() * 3), react: rnd(0.2, 0.38), spot: null, spotT: 0, call: 0, pressT: 0, rest: 0, look: null, kick: null, hold: 0, ph: Math.random() * 6 });
        k.hd = dirOf(team) > 0 ? Math.PI / 2 : -Math.PI / 2;
        k.P.root.visible = true;
      });
    }
    subs.forEach((k, j) => Object.assign(k, { gk: false, sub: true, x: lerp(bench.x0, bench.x1, j ? 0.74 : 0.26), z: bench.z, hd: 0, v: 0, vx: 0, vz: 0, act: 'sit', at: 0, ph: 0, cheer: 0, stamina: 1 }));
    Object.assign(ball, { x: cx, z: GZ, y: Y + R, vx: 0, vz: 0, vy: 0, owner: null, held: null, kind: 'loose', to: null, last: null, inNet: -1 });
    // começa com o goleiro de um dos times repondo a bola
    const t0 = Math.random() < 0.5 ? 0 : 1, gk = players.find(k => k.gk && k.team === t0);
    giveHands(gk); gk.act = 'gkhold'; gk.at = 0; gk.hold = rnd(1.2, 2.2);
    phase = 'play'; phT = 0; score = [0, 0]; log = [];
  }

  // ---- utilidades ----
  const fwd = k => [sin(k.hd), cos(k.hd)];
  const footPt = (k, d = 0.33) => { const [fx, fz] = fwd(k); return { x: k.x + fx * d + cos(k.hd) * 0.05 * k.foot, z: k.z + fz * d - sin(k.hd) * 0.05 * k.foot }; };
  const mates = k => players.filter(o => o.team === k.team && o !== k);
  const opps = k => players.filter(o => o.team !== k.team);
  const bSpeed = () => hyp(ball.vx, ball.vz);
  const inField = (x, z, m = 0.5) => ({ x: clamp(x, GL[0] + m, GL[1] - m), z: clamp(z, PZ0 + m * 0.3, PZ1 - m * 0.3) });
  function giveHands(k) { ball.held = k; ball.owner = k; ball.kind = 'held'; ball.to = null; ball.vx = ball.vz = ball.vy = 0; }
  function release() { ball.held = null; ball.owner = null; }
  /** Caminho previsto da bola rolando (posições a cada 0,05 s, até 3 s). */
  function predict() {
    path.length = 0;
    let x = ball.x, z = ball.z, vx = ball.vx, vz = ball.vz, y = ball.y, vy = ball.vy;
    for (let i = 0; i < 60; i++) {
      const air = y > Y + R + 0.02 || vy > 0;
      if (air) { vy -= 9.8 * 0.05; y += vy * 0.05; if (y < Y + R) { y = Y + R; vy = Math.abs(vy) > 1.2 ? -vy * 0.45 : 0; } }
      else { const sp = hyp(vx, vz), ns = Math.max(0, (sp + 1.4) * Math.exp(-0.55 * 0.05) - 1.4); if (sp > 1e-4) { vx *= ns / sp; vz *= ns / sp; } }
      x += vx * 0.05; z += vz * 0.05;
      if (x < FX0 + R || x > FX1 - R) vx = -vx * 0.45; if (z < FZ0 + R || z > FZ1 - R) vz = -vz * 0.45;
      x = clamp(x, FX0 + R, FX1 - R); z = clamp(z, FZ0 + R, FZ1 - R);
      path.push({ x, z, y, t: (i + 1) * 0.05, sp: hyp(vx, vz) });
    }
  }
  /** Primeiro ponto do caminho que o menino alcança antes da bola (ou o último). */
  function intercept(k, margin = 0.12) {
    const vmax = 3.4 * k.pace * KID_SCALE / 0.66;
    for (const p of path) {
      if (p.y > Y + R + 0.55 && !k.gk) continue;
      const d = Math.max(0, hyp(p.x - k.x, p.z - k.z) - 0.35);
      if (d / vmax + 0.18 <= p.t + margin) return { x: p.x, z: p.z, t: p.t, d };
    }
    const p = path[path.length - 1] || ball; return { x: p.x, z: p.z, t: 3, d: hyp(p.x - k.x, p.z - k.z) };
  }
  /** Velocidade inicial para a bola rasteira percorrer d e chegar com va (mesmo atrito do passo). */
  function passSpeed(d, va) {
    let lo = va, hi = 16;
    for (let i = 0; i < 24; i++) {
      const v0 = (lo + hi) / 2, A = 1.4 / 0.55, e = (va + A) / (v0 + A), tt = -Math.log(e) / 0.55, s = (v0 - va) / 0.55 - A * tt;
      if (s < d) lo = v0; else hi = v0;
    }
    return (lo + hi) / 2;
  }
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1); return hyp(px - ax - dx * u, pz - az - dz * u); };

  // ---- decisões ----
  function setMove(k, x, z, spd, act = 'move') {
    if (act === 'chase' || act === 'receive' || act === 'gkget' || act === 'press') { k.tx = clamp(x, GL[0] + 0.25, GL[1] - 0.25); k.tz = clamp(z, FZ0 + 0.3, FZ1 - 0.3); }   // atrás da bola: até o alambrado
    else { const p = inField(x, z, k.gk ? 0.1 : 0.5); k.tx = p.x; k.tz = p.z; }
    k.spd = spd; k.act = act;
  }
  function startKick(k, tx, tz, speed, loft, kind, to) {
    k.act = 'kick'; k.at = 0; k.kick = { tx, tz, speed, loft, kind, to, turned: false, hd0: k.hd };
    ev(kind === 'shot' ? 'chute' : kind === 'pass' ? 'passe' : 'chutão', k);
  }
  function ownerDecide(k) {
    const g = goalX(k.team), dg = hyp(g - k.x, GZ - k.z), op = opps(k), field = op.filter(o => !o.gk);
    const near = field.slice().sort((a, b) => hyp(a.x - k.x, a.z - k.z) - hyp(b.x - k.x, b.z - k.z))[0], pressure = near ? hyp(near.x - k.x, near.z - k.z) : 99;
    // chute: perto do gol, com algum ângulo e a linha não muito fechada
    const ang = Math.abs(Math.atan2(GZ - k.z, (g - k.x) * dirOf(k.team)));
    if (dg < 9.5 && ang < 1.0) {
      const block = field.some(o => segDist(o.x, o.z, k.x, k.z, g, GZ) < 0.6);
      const p = (dg < 5.5 ? 0.75 : 0.42) * (block ? 0.35 : 1) + (k.hold > 1.6 ? 0.25 : 0);
      if (Math.random() < p) {
        const gk = op.find(o => o.gk), side = gk && gk.z > GZ + 0.2 ? -1 : gk && gk.z < GZ - 0.2 ? 1 : pick([-1, 1]);
        const aimZ = GZ + side * rnd(0.75, 1.3) + rnd(-0.4, 0.4) * (1.2 - k.skill);
        startKick(k, g, aimZ, rnd(7.5, 10.5) * (0.85 + 0.15 * k.skill), Math.random() < 0.3 ? rnd(1.2, 2.4) : 0, 'shot', null);
        return;
      }
    }
    // passe: companheiro (o goleiro só se apertado) com a linha livre (a bola não pode passar no pé de ninguém)
    let best = null, bs = -1e9, alt = null, as = -1e9;
    if (pressure > 2.6) k.shield = 0;                                                       // saiu da marcação: pode voltar a proteger depois
    for (const m of mates(k)) {
      if (m.gk && (pressure > 1.4 || (k.x - ownX(k.team)) * dirOf(k.team) > 9)) continue;   // recuar para o goleiro só apertado e perto do próprio gol
      // passe no pé ou um pouco à frente de quem corre (onde ele vai estar quando a bola chegar), nunca no lugar para onde
      // ele ainda vai longe
      const lead = m.act === 'move' && m.tx !== undefined && hyp(m.tx - m.x, m.tz - m.z) < 2.5, d0 = hyp(m.x - k.x, m.z - k.z), ta = clamp(d0 / 6, 0.3, 1.2);
      const tg = lead ? { x: m.tx, z: m.tz } : inField(m.x + m.vx * ta, m.z + m.vz * ta, 0.3), d = hyp(tg.x - k.x, tg.z - k.z);
      if (d < 2.6 || d > 14) continue;
      const lane = Math.min(...op.map(o => segDist(o.x, o.z, k.x, k.z, tg.x, tg.z))), open = Math.min(...op.map(o => hyp(o.x - tg.x, o.z - tg.z)));
      const sc = Math.min(lane, 3) * 1.3 + Math.min(open, 4) * 0.6 + (tg.x - k.x) * dirOf(k.team) * 0.22 - d * 0.08 - (m.gk ? 3.5 : 0) + rnd(0, 0.8);
      if (lane >= 0.5 && sc > as) { as = sc; alt = { m, tg, d }; }                         // (arriscado: a linha passa perto de alguém)
      if (lane < 0.85) continue;
      if (sc > bs) { bs = sc; best = { m, tg, d }; }
    }
    const wantPass = best && (bs > 1.6 || pressure < 1.6) && (k.hold > 0.35 * k.patience || pressure < 1.3);
    if (wantPass) {
      const { m, tg, d } = best, err = (1.05 - k.skill) * 0.6;
      const tx = tg.x + rnd(-err, err), tz = tg.z + rnd(-err, err);
      startKick(k, tx, tz, passSpeed(hyp(tx - k.x, tz - k.z), rnd(1.8, 2.8)), d > 10 && Math.random() < 0.35 ? rnd(1.5, 2.4) : 0, 'pass', m);
      return;
    }
    // apertado e sem passe: protege a bola saindo de lado (de costas para quem marca) ou, no próprio campo, dá um chutão
    if (pressure < 1.7) {
      const own = (k.x - cx) * dirOf(k.team) < -2, wall = Math.min(k.z - FZ0, FZ1 - k.z) < 2.4 || Math.min(k.x - GL[0], GL[1] - k.x) < 1.6;
      const done = (k.shield || 0) >= (k.patience > 1 && !wall ? 2 : 1);
      if (done || (own && Math.random() < 0.3) || (wall && (k.shield || 0) >= 1)) {
        k.shield = 0;
        if (alt && Math.random() < 0.75) {                                                   // toca assim mesmo, por onde der
          const { m, tg } = alt, err = (1.1 - k.skill) * 0.7, tx = tg.x + rnd(-err, err), tz = tg.z + rnd(-err, err);
          startKick(k, tx, tz, passSpeed(hyp(tx - k.x, tz - k.z), rnd(2.0, 3.0)), 0, 'pass', m);
          return;
        }
        if (dg < 11 && ang < 1.2 && !field.some(o => segDist(o.x, o.z, k.x, k.z, g, GZ) < 0.7)) { startKick(k, g, GZ + rnd(-1.3, 1.3), rnd(7, 9.5), Math.random() < 0.4 ? rnd(1, 2) : 0, 'shot', null); return; }
        const tz = clamp(lerp(k.z, GZ, 0.6) + rnd(-3, 3), PZ0 + 1.5, PZ1 - 1.5);             // chutão: para a frente e para longe da parede
        startKick(k, clamp(k.x + dirOf(k.team) * rnd(5, 9), GL[0] + 2, GL[1] - 2), tz, rnd(7, 9), rnd(1.6, 2.8), 'clear', null);
        return;
      }
      let ax = k.x - near.x, az = k.z - near.z; const L0 = hyp(ax, az) || 1; ax /= L0; az /= L0;
      const toMid = clamp((GZ - k.z) * 0.3, -1, 1);                                         // protege girando para o lado aberto (o meio), não para o canto
      const sd = Math.abs(toMid) > 0.4 ? Math.sign(toMid) : Math.abs(az) > 0.3 ? Math.sign(az) : pick([-1, 1]), run = rnd(1.6, 2.6);
      let dx = ax * 0.6 + dirOf(k.team) * 0.25 + clamp((cx - k.x) * 0.15, -0.5, 0.5), dz = az * 0.5 + sd * 0.55 + toMid * 0.4; const L = hyp(dx, dz) || 1;
      const p = inField(k.x + dx / L * run, k.z + dz / L * run, 2.2);
      k.shield = (k.shield || 0) + 1;
      k.act = 'dribble'; k.at = 0; k.dur = rnd(0.7, 1.3); k.tx = p.x; k.tz = p.z; k.spd = rnd(1.7, 2.3) * k.pace; ev('protege', k);
      return;
    }
    // conduzir para frente, fugindo do adversário mais perto (ou segurar e olhar)
    if (Math.random() < 0.55 + 0.3 * (1 - k.patience)) {
      let dx = dirOf(k.team), dz = clamp((GZ - k.z) * (Math.min(k.z - FZ0, FZ1 - k.z) < 3 ? 0.3 : 0.12) + rnd(-0.6, 0.6), -0.9, 0.9);
      if (near && pressure < 3.5) dz += (k.z - near.z > 0 ? 1 : -1) * 0.8;
      const L = hyp(dx, dz), run = rnd(2.2, 4.5);
      k.act = 'dribble'; k.at = 0; k.dur = rnd(1.0, 2.6); k.tx = k.x + dx / L * run; k.tz = k.z + dz / L * run;
      const p = inField(k.tx, k.tz, 1.8); k.tx = p.x; k.tz = p.z; k.spd = rnd(1.6, 2.4) * k.pace;
      return;
    }
    k.act = 'hold'; k.at = 0; k.dur = rnd(0.35, 0.9) * (0.6 + k.patience);
  }
  /** Lugar para receber: aberto, nem colado nem longe de quem tem a bola, um pouco à frente. */
  function supportSpot(k, own) {
    const op = opps(k), mt = mates(k).filter(m => m !== own && !m.gk);
    let best = null, bs = -1e9;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + k.seed, r = rnd(4, 8.5), p = inField(own.x + cos(a) * r, own.z + sin(a) * r, 1.0);
      const open = Math.min(...op.map(o => hyp(o.x - p.x, o.z - p.z))), lane = Math.min(...op.map(o => segDist(o.x, o.z, own.x, own.z, p.x, p.z)));
      const sc = Math.min(open, 4) * 0.7 + Math.min(lane, 3) * 0.9 + (p.x - own.x) * dirOf(k.team) * 0.18 - (mt.some(m => hyp(m.x - p.x, m.z - p.z) < 3.5) ? 3 : 0) - hyp(p.x - k.x, p.z - k.z) * 0.12;
      if (sc > bs) { bs = sc; best = p; }
    }
    const cur = { x: k.x, z: k.z }, curOpen = Math.min(...op.map(o => hyp(o.x - cur.x, o.z - cur.z)));
    if (k.spot && hyp(k.spot.x - best.x, k.spot.z - best.z) < 2) return k.spot;              // não troca por quase nada
    if (curOpen > 3 && hyp(own.x - k.x, own.z - k.z) < 9 && hyp(own.x - k.x, own.z - k.z) > 3.5 && Math.random() < 0.5) return cur;
    return best;
  }
  function think(k) {
    if (k.act !== 'fetchball') k.relax = false;
    if (k.sub || ['kick', 'trap', 'tackle', 'stumble', 'complain', 'gkhold', 'gkthrow', 'dive', 'celebrate', 'sulk', 'fetch', 'rest', 'protest', 'fetchball'].includes(k.act)) return;
    if (ball.owner === k) { if (k.act !== 'dribble' && k.act !== 'hold') ownerDecide(k); return; }
    if (phase !== 'play') {                                                                 // gol, fundo ou falta: ninguém disputa a bola
      if (k.gk) { if (phase === 'foul') setMove(k, ownX(k.team) + dirOf(k.team) * 0.7, GZ, 1.2, 'gk'); return; }
      if (phase === 'foul') { if (k.v > 0.3) setMove(k, k.x + k.vx * 0.3, k.z + k.vz * 0.3, 0.8, 'move'); return; }
      if (!k.backT && phT > 1.0) { k.backT = 1; setMove(k, lerp(ownX(k.team), cx, k.role === 1 ? 0.45 : 0.82) + rnd(-1, 1), GZ + (k.role === 1 ? -3 : 3) + rnd(-1.2, 1.2), rnd(1.2, 1.7), 'move'); }
      return;
    }
    if (k.gk) return gkThink(k);
    const own = ball.owner, toMe = ball.kind === 'pass' && ball.to === k;
    const myBall = (own && own.team === k.team) || (ball.kind === 'pass' && ball.to && ball.to.team === k.team);
    const free = !own && ball.kind !== 'held';
    if (toMe) { const ip = intercept(k, 0.25); setMove(k, ip.x, ip.z, 3.2 * k.pace, 'receive'); return; }
    if (free) {
      // o mais rápido de cada time vai na bola; o outro se posiciona
      const team = players.filter(o => o.team === k.team && !o.gk);
      const mine = intercept(k), others = team.filter(o => o !== k).map(o => intercept(o).t);
      if (others.every(t2 => mine.t <= t2 + 0.05) && !(ball.kind === 'pass' && ball.to && ball.to.team === k.team)) {
        const theirs = Math.min(...opps(k).filter(o => !o.gk).map(o => intercept(o).t));
        if (ball.kind !== 'pass' || mine.t < theirs - 0.15 || Math.random() < 0.3 * k.aggr) { setMove(k, mine.x, mine.z, 3.4 * k.pace, 'chase'); return; }
      }
    }
    if (own && own.team !== k.team && ball.held) {                                         // goleiro com a bola na mão: ninguém tira; cada um marca o seu
      const mark = opps(k).filter(o => !o.gk).sort((a, b) => hyp(a.x - k.x, a.z - k.z) - hyp(b.x - k.x, b.z - k.z))[k.role === 1 ? 0 : 1] || opps(k).find(o => !o.gk);
      const gx = ownX(k.team), L = hyp(gx - mark.x, GZ - mark.z) || 1; setMove(k, mark.x + (gx - mark.x) / L * 2.2, mark.z + (GZ - mark.z) / L * 2.2, 1.8 * k.pace); return;
    }
    if (own && own.team !== k.team) {
      const team = players.filter(o => o.team === k.team && !o.gk), dMe = hyp(own.x - k.x, own.z - k.z);
      if (team.every(o => o === k || hyp(own.x - o.x, own.z - o.z) >= dMe - 0.3)) {             // aperta quem está com a bola, pelo lado do próprio gol
        const gx = ownX(k.team), L = hyp(gx - own.x, GZ - own.z) || 1, d = dMe > 2.5 ? 1.1 : 0.85;
        setMove(k, own.x + (gx - own.x) / L * d, own.z + (GZ - own.z) / L * d, dMe > 3 ? 3.3 * k.pace : 1.6, 'press');
        return;
      }
      const mark = opps(k).filter(o => !o.gk && o !== own)[0];                                // marca o outro, um pouco à frente do gol
      if (mark) { const gx = ownX(k.team), L = hyp(gx - mark.x, GZ - mark.z) || 1; setMove(k, mark.x + (gx - mark.x) / L * 1.8, mark.z + (GZ - mark.z) / L * 1.8, 2.4 * k.pace); return; }
    }
    if (myBall && own && own !== k) {
      k.spotT -= 0.25;
      if (!k.spot || k.spotT <= 0) { k.spot = supportSpot(k, own); k.spotT = rnd(1.0, 2.4); }
      const d = hyp(k.spot.x - k.x, k.spot.z - k.z);
      setMove(k, k.spot.x, k.spot.z, d > 3 ? 2.8 * k.pace : 1.4, 'move');
      return;
    }
    // sem nada para fazer: volta para a sua faixa (meio do campo, do seu lado), devagar
    if (k.act !== 'move' || hyp(k.tx - k.x, k.tz - k.z) < 0.3) {
      const hx = lerp(ownX(k.team), cx, k.role === 1 ? 0.5 : 0.85) + (ball.x - cx) * 0.35, hz = lerp(GZ + (k.role === 1 ? -2.5 : 2.5), ball.z, 0.35);
      if (hyp(hx - k.x, hz - k.z) > 1.5) setMove(k, hx, hz, 1.3, 'move');
    }
  }
  function gkThink(k) {
    const gx = ownX(k.team), d = dirOf(k.team);
    // bola vindo para o meu gol (chute): vai para onde ela cruza a linha
    if (!ball.owner && ball.kind === 'shot' && (ball.vx * d) < -1) {
      const tt = (gx - ball.x) / (ball.vx || 1e-3);
      if (tt > 0 && tt < 2.5) {
        if (t - ball.kickT < k.react) { k.act = 'gk'; return; }                         // goleiro menino demora um pouco para reagir
        const zc = ball.z + ball.vz * tt; setMove(k, gx + d * 0.25, clamp(zc, GZ - GH - 0.4, GZ + GH + 0.4), 3.0, 'save'); return;
      }
    }
    // bola solta perto do meu gol: pega com a mão
    const toMate = ball.kind === 'pass' && ball.to && ball.to !== k && ball.to.team === k.team;   // (não rouba o passe do companheiro)
    if (!ball.owner && ball.kind !== 'held' && !toMate && Math.abs(ball.x - gx) < 3.4 && Math.abs(ball.z - GZ) < 3.4 && bSpeed() < 6) { const ip = intercept(k); setMove(k, ip.x, ip.z, 3.2, 'gkget'); return; }
    // posição: na frente do gol, entre a bola e o meio do gol
    const L = hyp(ball.x - gx, ball.z - GZ) || 1, out = clamp(0.5 + (12 - Math.abs(ball.x - gx)) * 0.06, 0.5, 1.4);
    setMove(k, gx + (ball.x - gx) / L * out, clamp(GZ + (ball.z - GZ) / L * out, GZ - 1.3, GZ + 1.3), 2.2, 'gk');
  }

  // ---- toques ----
  function trap(k) {
    ball.owner = k; ball.kind = 'own'; ball.to = null; ball.last = k; ball.vy = 0;
    if (phase === 'foul') { phase = 'play'; phT = 0; }                                      // cobrou a falta: o jogo volta
    k.act = 'trap'; k.at = 0; k.hold = 0; k.spot = null; k.shield = 0;
    for (const o of players) if (o.act === 'receive' || o.act === 'chase') { if (o !== k) { o.act = 'free'; o.dec = rnd(0.1, 0.35); } }
    ev('domina', k);
  }
  function kickBall(k) {
    const K = k.kick, f = footPt(k), dx = K.tx - f.x, dz = K.tz - f.z, L = hyp(dx, dz) || 1;
    ball.x = f.x; ball.z = f.z; ball.y = Y + R;
    ball.vx = dx / L * K.speed; ball.vz = dz / L * K.speed; ball.vy = K.loft;
    ball.owner = null; ball.kind = K.kind === 'clear' ? 'loose' : K.kind; ball.to = K.to; ball.last = k; ball.from = k; ball.kickT = t;
    if (K.to) { K.to.act = 'free'; K.to.dec = 0; }
    for (const o of players) if (o !== K.to && o.team !== k.team) o.dec = Math.min(o.dec, rnd(0.08, 0.3));   // os adversários reagem ao passe
  }
  function gkThrow(k) {
    const op = opps(k);
    let best = null, bs = -1e9;
    for (const m of mates(k)) { const o = Math.min(...op.map(q => hyp(q.x - m.x, q.z - m.z))), sc = o + rnd(0, 1.5); if (sc > bs) { bs = sc; best = m; } }
    const d = hyp(best.x - k.x, best.z - k.z), lob = d > 8;
    k.act = 'gkthrow'; k.at = 0; k.kick = { tx: best.x, tz: best.z, to: best, lob, speed: lob ? 0 : passSpeed(d, 2.2), d };
    ev('reposição', k);
  }
  function releaseThrow(k) {
    const K = k.kick, [fx, fz] = fwd(k);
    ball.held = null; ball.owner = null; ball.last = k; ball.from = k; ball.to = K.to; ball.kind = 'pass';
    ball.x = k.x + fx * 0.35; ball.z = k.z + fz * 0.35;
    const dx = K.tx - ball.x, dz = K.tz - ball.z, L = hyp(dx, dz) || 1;
    if (K.lob) { ball.y = Y + (K.over ? 1.4 : 0.9); const T = clamp(L / 7, 0.7, 1.4); ball.vx = dx / T * 0.82; ball.vz = dz / T * 0.82; ball.vy = 9.8 * T / 2 - (ball.y - Y - R) / T; }
    else { ball.y = Y + R; ball.vx = dx / L * K.speed; ball.vz = dz / L * K.speed; ball.vy = 0; }
    if (K.to) { K.to.act = 'free'; K.to.dec = 0; }
  }

  // ---- gol, fundo e falta ----
  function goal(team) {                                                                     // team = quem fez
    score[team]++; phase = 'goal'; phT = 0; ev('gol', ball.last);
    for (const k of players) k.backT = 0;
    const scorer = ball.last && ball.last.team === team ? ball.last : players.find(k => k.team === team && !k.gk);
    for (const k of players) {
      k.spot = null; k.kick = null;
      if (k.team === team) {
        if (k === scorer) { k.act = 'celebrate'; k.at = 0; k.dur = rnd(2.6, 3.4); const sideZ = k.z > GZ ? PZ1 - 0.8 : PZ0 + 0.8; k.tx = clamp(k.x - dirOf(team) * 2.5, GL[0] + 2, GL[1] - 2); k.tz = sideZ; }
        else if (!k.gk) { k.act = 'celebrate'; k.at = -rnd(0.3, 0.8); k.dur = rnd(2.0, 2.8); k.tx = scorer.x - dirOf(team) * 1.0; k.tz = scorer.z; k.mate = scorer; }
        else { k.act = 'celebrate'; k.at = -rnd(0.1, 0.4); k.dur = 1.4; k.tx = k.x; k.tz = k.z; }
      } else if (k.gk) { k.act = 'sulk'; k.at = 0; k.dur = rnd(0.9, 1.4); k.next = 'fetch'; }
      else { k.act = 'sulk'; k.at = 0; k.dur = rnd(1.2, 2.2); k.next = null; }
    }
    for (const s of subs) s.cheer = rnd(1.6, 2.4);
  }
  function deadBall(side) {                                                                 // saiu pela linha de fundo do gol `side`
    phase = 'dead'; phT = 0; ev('fundo', null);
    for (const k of players) k.backT = 0;
    const gk = players.find(k => k.gk && k.team === side);
    gk.act = 'fetch'; gk.at = 0;
    for (const k of players) if (!k.gk && k.act !== 'kick') { k.act = 'free'; k.spot = null; }
  }

  // ---- passo do jogo ----
  function update(dt, walker) {
    t += dt; phT += dt;
    // personagem a pé dentro da quadra: obstáculo para os meninos e para a bola; encostando, chuta
    let wv = null;
    if (walker && walker.x > C.x0 - 0.5 && walker.x < C.x1 + 0.5 && walker.z > C.z0 - 0.5 && walker.z < C.z1 + 0.5) {
      wv = { x: walker.x, z: walker.z, vx: 0, vz: 0 };
      if (walkerPrev && dt > 0) { wv.vx = (walker.x - walkerPrev.x) / dt; wv.vz = (walker.z - walkerPrev.z) / dt; }
    }
    walkerPrev = walker ? { x: walker.x, z: walker.z } : null;
    predict();
    // decisões (cada menino no seu tempo de reação)
    for (const k of players) { k.dec -= dt; if (k.dec <= 0) { think(k); k.dec = k.gk ? rnd(0.12, 0.22) : rnd(0.18, 0.42); } }
    // vigia: bola parada onde ninguém vai (ou fase especial que não acaba) → alguém resolve
    if (phase === 'play' && !ball.owner && ball.kind !== 'held' && bSpeed() < 0.05) { stuckT += dt; if (stuckT > 6) { stuckT = 0; const k = players.filter(o => !o.gk).sort((a, b) => hyp(a.x - ball.x, a.z - ball.z) - hyp(b.x - ball.x, b.z - ball.z))[0]; k.act = 'fetchball'; k.at = 0; } } else stuckT = 0;
    if (phase !== 'play' && phT > 14) { const gk = players.find(o => o.gk); release(); giveHands(gk); gk.act = 'gkhold'; gk.at = 0; gk.hold = 0.5; phase = 'play'; ball.inNet = -1; }
    for (const k of players) {
      k.at += dt;
      act(k, dt, wv);
      if (k.act !== 'dive') steer(k, dt, wv);
    }
    for (const s of subs) subAct(s, dt);
    ballStep(dt, wv);
    touches(wv);
  }
  function act(k, dt) {
    if ((k.act === 'trap' || k.act === 'hold' || k.act === 'dribble' || (k.act === 'kick' && !k.kick.done)) && ball.owner !== k) { k.act = 'free'; k.kick = null; k.dec = rnd(0.05, 0.2); }   // perdeu a bola no meio
    switch (k.act) {
      case 'trap': {                                                                      // amortece: a bola vem para o pé
        const f = footPt(k), u = Math.min(1, k.at / 0.3);
        ball.x = lerp(ball.x, f.x, Math.min(1, dt * 14)); ball.z = lerp(ball.z, f.z, Math.min(1, dt * 14)); ball.vx = ball.vz = 0; ball.y = Y + R;
        if (u >= 1) { k.act = 'free'; k.hold = 0; ownerDecide(k); }
        break;
      }
      case 'hold': {                                                                      // pisa na bola e olha
        const f = footPt(k); ball.x = f.x; ball.z = f.z; ball.vx = ball.vz = 0; ball.y = Y + R; k.hold += dt;
        const press = opps(k).some(o => !o.gk && hyp(o.x - k.x, o.z - k.z) < 1.15);
        if (k.at > k.dur || (press && k.at > 0.25)) ownerDecide(k);
        break;
      }
      case 'dribble': {                                                                   // conduz: toquinhos para a frente
        k.hold += dt;
        const f = footPt(k, 0.3), d = hyp(ball.x - f.x, ball.z - f.z);
        if (d > 2.2) { ball.owner = null; ball.kind = 'loose'; k.act = 'free'; break; }
        if (d < 0.32 && bSpeed() < k.v + 0.4) {
          const dx = k.tx - k.x, dz = k.tz - k.z, L = hyp(dx, dz) || 1, sp = k.v + rnd(0.9, 1.4);
          ball.vx = dx / L * sp; ball.vz = dz / L * sp; k.touchT = 0.16;
        }
        const press = opps(k).some(o => !o.gk && hyp(o.x - k.x, o.z - k.z) < 1.2);
        if (k.at > k.dur || hyp(k.tx - k.x, k.tz - k.z) < 0.6 || (press && Math.random() < dt * 2.5)) {
          if (d < 0.6) { k.act = 'hold'; k.at = 0; k.dur = rnd(0.15, 0.5); } else { k.act = 'free'; ball.owner = null; ball.kind = 'loose'; }
        }
        break;
      }
      case 'kick': {
        const K = k.kick, f = footPt(k), want = Math.atan2(K.tx - k.x, K.tz - k.z);
        if (!K.turned) {                                                                  // vira com a bola no pé
          k.hd += clamp(wrap(want - k.hd), -dt * 9, dt * 9);
          ball.x = f.x; ball.z = f.z; ball.vx = ball.vz = 0; ball.y = Y + R;
          if (Math.abs(wrap(want - k.hd)) < 0.12 || k.at > 0.45) { K.turned = true; k.at = 0; }
          break;
        }
        if (!K.done) { ball.x = f.x; ball.z = f.z; ball.y = Y + R; }
        const strike = K.kind === 'shot' ? 0.27 : 0.25;
        if (!K.done && k.at >= strike) { K.done = true; kickBall(k); }
        if (k.at > strike + 0.42) { k.act = 'free'; k.kick = null; k.dec = rnd(0.1, 0.3); if (K.kind === 'pass' && Math.random() < 0.45) { k.spot = null; k.spotT = 0; } }
        break;
      }
      case 'tackle': {
        if (k.at > 0.18 && !k.tk) {
          k.tk = true;
          const own = ball.owner, f = footPt(k, 0.45);
          if (own && own.team !== k.team && !ball.held && hyp(ball.x - f.x, ball.z - f.z) < 0.75) {
            if (Math.random() < 0.5 + 0.2 * k.aggr - 0.2 * own.skill) {
              const a = k.hd + rnd(-1.1, 1.1), sp = rnd(2.5, 4.5);
              ball.owner = null; ball.kind = 'loose'; ball.vx = sin(a) * sp; ball.vz = cos(a) * sp; ball.last = k;
              ev('desarme', k);
              if (Math.random() < 0.22) { own.act = 'complain'; own.at = 0; own.dur = rnd(1.8, 2.6); k.act = 'protest'; k.at = 0; k.dur = own.dur; phase = 'foul'; phT = 0; ev('falta', own); return; }
              own.act = 'stumble'; own.at = 0;
            } else { ev('drible', own); k.act = 'stumble'; k.at = 0; k.tk = false; return; }
          }
        }
        if (k.at > 0.55) { k.act = 'free'; k.tk = false; }
        break;
      }
      case 'press': {
        const own = ball.owner;
        if (own && own.team !== k.team && hyp(own.x - k.x, own.z - k.z) < 1.4) {
          k.pressT += dt;
          if (k.pressT > rnd(0.9, 2.4) && Math.random() < dt * (0.6 + k.aggr)) { k.act = 'tackle'; k.at = 0; k.tk = false; k.pressT = 0; }
        } else k.pressT = Math.max(0, k.pressT - dt);
        break;
      }
      case 'stumble': if (k.at > 0.6) k.act = 'free'; break;
      case 'complain': case 'protest':
        if (k.at > k.dur) {
          if (k.act === 'complain') { k.act = 'fetchball'; k.at = 0; }                  // cobra a falta: vai até a bola, ajeita e passa
          else k.act = 'free';
        }
        break;
      case 'fetchball': {                                                                 // vai até a bola parada e domina
        k.tx = clamp(ball.x - sin(k.hd) * 0.3, FX0 + 0.3, FX1 - 0.3); k.tz = clamp(ball.z - cos(k.hd) * 0.3, FZ0 + 0.3, FZ1 - 0.3); k.spd = 1.8;
        k.relax = true;
        if (hyp(ball.x - k.x, ball.z - k.z) < 0.55 && !ball.owner) { trap(k); k.act = 'hold'; k.at = 0; k.dur = rnd(0.6, 1.2); k.relax = false; phase = 'play'; }
        break;
      }
      case 'gkhold': {                                                                    // goleiro com a bola nas mãos: olha e repõe
        if (k.at > k.hold && (phase === 'play' || phT > 3.4)) { phase = 'play'; gkThrow(k); }
        break;
      }
      case 'gkthrow': {
        if (k.at >= (k.kick.lob ? 0.42 : 0.38) && ball.held === k) releaseThrow(k);
        if (k.at > 0.85) { k.act = 'free'; k.kick = null; }
        break;
      }
      case 'save': case 'gkget': case 'gk': break;
      case 'dive': if (k.at > 1.5) { k.act = 'free'; k.dove = false; } break;
      case 'celebrate':
        if (k.at > k.dur) { k.act = 'free'; k.backT = 0; }
        break;
      case 'sulk':
        if (k.at > k.dur) { k.act = k.next || 'free'; k.at = 0; k.backT = 0; }
        break;
      case 'fetch': {                                                                     // goleiro busca a bola (no fundo da rede ou atrás do gol)
        const gx = ownX(k.team), d = dirOf(k.team);
        if (ball.held === k) {
          setMove(k, gx + d * 1.4, GZ, 2.3, 'fetch'); k.act = 'fetch';
          if (hyp(k.tx - k.x, k.tz - k.z) < 0.35) { k.act = 'gkhold'; k.at = 0; k.hold = rnd(0.6, 1.2); }
        } else {
          k.tx = ball.x + d * 0.3; k.tz = ball.z; k.spd = hyp(ball.x - k.x, ball.z - k.z) > 2.5 ? 2.6 : 1.5;
          if (hyp(ball.x - k.x, ball.z - k.z) < 0.55 && k.at > 0.4) { giveHands(k); ball.inNet = -1; k.pick = 0.35; }
        }
        break;
      }
      case 'rest': if (k.at > k.dur) k.act = 'free'; break;
    }
    if (k.touchT > 0) k.touchT -= dt;
    // fôlego: corrida cansa; parado, recupera. Cansado e longe da jogada: mãos nos joelhos
    k.stamina = clamp(k.stamina + (k.v > 2.6 ? -0.05 : 0.04) * dt, 0, 1);
    if (!k.gk && k.stamina < 0.42 && k.act === 'move' && hyp(ball.x - k.x, ball.z - k.z) > 7 && Math.random() < dt * 0.5) { k.act = 'rest'; k.at = 0; k.dur = rnd(1.0, 2.0); }
    // chamando a bola: livre e o companheiro segurando
    const own = ball.owner;
    k.call = !k.gk && own && own !== k && own.team === k.team && own.act === 'hold' && k.v < 0.8 && Math.min(...opps(k).map(o => hyp(o.x - k.x, o.z - k.z))) > 2.6 ? Math.min(1, (k.call || 0) + dt * 3) : Math.max(0, (k.call || 0) - dt * 3);
  }
  function steer(k, dt, wv) {
    const busy = ['trap', 'hold', 'kick', 'gkhold', 'gkthrow', 'complain', 'protest', 'rest', 'sulk', 'stumble', 'dive'].includes(k.act);
    let dvx = 0, dvz = 0;
    if (!busy && k.tx !== undefined) {
      const dx = k.tx - k.x, dz = k.tz - k.z, d = hyp(dx, dz);
      const vmax = (k.act === 'celebrate' ? 3.4 : k.spd || 1.5) * (k.stamina < 0.3 ? 0.8 : 1), arrive = Math.min(vmax, Math.sqrt(2 * 5 * Math.max(0, d - 0.05)));
      if (d > 0.08) { dvx = dx / d * arrive; dvz = dz / d * arrive; }
    } else if (k.act === 'stumble') { dvx = k.vx * 0.5; dvz = k.vz * 0.5; }
    // afastamento dos outros (e do personagem a pé)
    for (const o of players) if (o !== k) { const dx = k.x - o.x, dz = k.z - o.z, d = hyp(dx, dz); if (d < 0.75 && d > 1e-3) { dvx += dx / d * (0.75 - d) * 4; dvz += dz / d * (0.75 - d) * 4; } }
    if (wv) { const dx = k.x - wv.x, dz = k.z - wv.z, d = hyp(dx, dz); if (d < 1.1 && d > 1e-3) { dvx += dx / d * (1.1 - d) * 5; dvz += dz / d * (1.1 - d) * 5; } }
    const acc = (hyp(dvx, dvz) > k.v ? 6 : 8) * dt, ex = dvx - k.vx, ez = dvz - k.vz, el = hyp(ex, ez);
    if (el > acc) { k.vx += ex / el * acc; k.vz += ez / el * acc; } else { k.vx = dvx; k.vz = dvz; }
    k.x += k.vx * dt; k.z += k.vz * dt;
    if (k.act === 'fetch' || k.relax) k.x = clamp(k.x, FX0 + 0.3, FX1 - 0.3);             // buscando a bola: até o alambrado
    else k.x = clamp(k.x, GL[0] + (k.gk ? -0.25 : 0.25), GL[1] - (k.gk ? -0.25 : 0.25));
    const zMin = k.x > bench.x0 - 0.4 && k.x < bench.x1 + 0.4 ? bench.front + 0.3 : FZ0 + 0.3;
    k.z = clamp(k.z, zMin, FZ1 - 0.3);
    k.v = hyp(k.vx, k.vz);
    // direção: andando, para onde vai; parado, para a bola
    let want = k.hd;
    if (k.act === 'kick' || k.act === 'gkthrow') want = k.hd;
    else if (k.v > 0.5 && k.act !== 'press' && k.act !== 'gk' && k.act !== 'save') want = Math.atan2(k.vx, k.vz);
    else if (k.act === 'celebrate' && k.mate) want = Math.atan2(k.mate.x - k.x, k.mate.z - k.z);
    else want = Math.atan2(ball.x - k.x, ball.z - k.z);
    if (k.act === 'dribble') want = Math.atan2(k.tx - k.x, k.tz - k.z);
    if (k.act !== 'kick') k.hd += clamp(wrap(want - k.hd), -dt * (k.v > 2 ? 6 : 8), dt * (k.v > 2 ? 6 : 8));
    k.ph += (k.v * dt) / (KID_SCALE * (k.v > 2.1 ? 0.85 : 0.6)) * Math.PI;
  }
  function subAct(s, dt) {                                                                  // os que esperam a vez no banco
    s.at += dt; s.cheer = Math.max(0, (s.cheer || 0) - dt * 0.35);
    s.hd += clamp(wrap(0 - s.hd), -dt * 3, dt * 3);
  }
  function ballStep(dt, wv) {
    const pre = { x: ball.x, z: ball.z };
    if (ball.held) {                                                                        // nas mãos do goleiro (à frente do peito)
      const k = ball.held, [fx, fz] = fwd(k), up = k.act === 'gkthrow' ? (k.kick.lob ? 1.65 : 0.6) : k.pick > 0 ? 0.3 : 0.9;
      if (k.pick > 0) k.pick -= dt;
      ball.x = k.x + fx * 0.32; ball.z = k.z + fz * 0.32; ball.y = Y + up * KID_SCALE + (k.act === 'gkthrow' && k.kick.lob ? 0 : 0.08);
      ball.vx = ball.vz = ball.vy = 0;
    } else if (!(ball.owner && ['trap', 'hold', 'kick'].includes(ball.owner.act))) {
      const air = ball.y > Y + R + 0.01 || ball.vy > 0;
      if (air) { ball.vy -= 9.8 * dt; ball.y += ball.vy * dt; if (ball.y < Y + R) { ball.y = Y + R; if (ball.vy < -1.2) { ball.vy = -ball.vy * 0.45; ball.vx *= 0.88; ball.vz *= 0.88; } else ball.vy = 0; } }
      else { const sp = bSpeed(), ns = Math.max(0, (sp + 1.4) * Math.exp(-0.55 * dt) - 1.4); if (sp > 1e-4) { ball.vx *= ns / sp; ball.vz *= ns / sp; } }
      ball.x += ball.vx * dt; ball.z += ball.vz * dt;
      // traves
      for (const gx of GL) for (const pz of [GZ - GH, GZ + GH]) {
        const dx = ball.x - gx, dz = ball.z - pz, d = hyp(dx, dz);
        if (d < R + 0.08 && ball.y - Y < BAR + R) { const nx = dx / d, nz = dz / d, vn = ball.vx * nx + ball.vz * nz; if (vn < 0) { ball.vx -= 1.55 * vn * nx; ball.vz -= 1.55 * vn * nz; ev('trave', ball.last); } ball.x = gx + nx * (R + 0.08); ball.z = pz + nz * (R + 0.08); }
      }
      // gol: cruzou a linha entre as traves e abaixo do travessão
      for (const [side, gx] of [[0, GL[0]], [1, GL[1]]]) {
        const crossed = side === 0 ? pre.x >= gx && ball.x < gx : pre.x <= gx && ball.x > gx;
        if (crossed && ball.inNet < 0) {
          if (Math.abs(ball.z - GZ) < GH - R * 0.5 && ball.y - Y < BAR) { ball.inNet = side; if (phase === 'play') goal(1 - side); }
          else if (phase === 'play' && !ball.owner) { ball.out = side; }
        }
      }
      if (ball.inNet >= 0 && (ball.x - GL[ball.inNet]) * (ball.inNet === 0 ? 1 : -1) > R + 0.2) ball.inNet = -1;   // saiu do gol (alguém tirou de lá)
      if (ball.inNet >= 0) {                                                                // rede: fundo e laterais seguram a bola
        const gx = GL[ball.inNet], d = ball.inNet === 0 ? -1 : 1, back = gx + d * (NET - 0.45 * clamp((ball.y - Y) / BAR, 0, 1) - R);   // fundo da rede inclinado
        if ((ball.x - back) * d > 0) { ball.x = back; ball.vx *= -0.12; ball.vz *= 0.5; ball.vy *= 0.5; }
        if (Math.abs(ball.z - GZ) > GH - R) { ball.z = GZ + Math.sign(ball.z - GZ) * (GH - R); ball.vz *= -0.2; }
        if (ball.y - Y > BAR - R) { ball.y = Y + BAR - R; ball.vy = Math.min(0, ball.vy); }
      }
      // alambrado
      if (ball.x < FX0 + R) { ball.x = FX0 + R; ball.vx = Math.abs(ball.vx) * 0.45; }
      if (ball.x > FX1 - R) { ball.x = FX1 - R; ball.vx = -Math.abs(ball.vx) * 0.45; }
      const zb = ball.x > bench.x0 - 0.1 && ball.x < bench.x1 + 0.1 ? bench.front + R : FZ0 + R;   // a tábua da frente do banco segura a bola
      if (ball.z < zb) { ball.z = zb; ball.vz = Math.abs(ball.vz) * 0.45; }
      if (ball.z > FZ1 - R) { ball.z = FZ1 - R; ball.vz = -Math.abs(ball.vz) * 0.45; }
      // personagem a pé: a bola bate nele; andando contra ela, ele chuta
      if (wv && ball.y < Y + 1.0) {
        const dx = ball.x - wv.x, dz = ball.z - wv.z, d = hyp(dx, dz), ws = hyp(wv.vx, wv.vz);
        if (d < R + 0.42 && d > 1e-3) {
          const nx = dx / d, nz = dz / d, vn = (ball.vx - wv.vx) * nx + (ball.vz - wv.vz) * nz;
          ball.x = wv.x + nx * (R + 0.42); ball.z = wv.z + nz * (R + 0.42);
          if (ws > 0.4 && (wv.vx * nx + wv.vz * nz) > 0.2) { const sp = 2.2 + ws * 1.3; ball.vx = nx * sp * 0.6 + wv.vx / ws * sp * 0.4; ball.vz = nz * sp * 0.6 + wv.vz / ws * sp * 0.4; ball.owner = null; ball.kind = 'loose'; ball.last = null; ev('jogador', null); }
          else if (vn < 0) { ball.vx -= 1.5 * vn * nx; ball.vz -= 1.5 * vn * nz; ball.owner = null; ball.kind = 'loose'; }
        }
      }
      // fundo: bola parou (ou quase) atrás da linha, fora do gol
      if (ball.out !== undefined && ball.out >= 0) {
        const gx = GL[ball.out];
        if ((ball.out === 0 ? ball.x < gx : ball.x > gx) && phase === 'play' && bSpeed() < 2.5) { const side = ball.out; ball.out = -1; deadBall(side); }
        else if (ball.out === 0 ? ball.x > gx + 0.3 : ball.x < gx - 0.3) ball.out = -1;   // voltou (bateu no alambrado e voltou para o campo)
      }
      if (ball.kind === 'pass' || ball.kind === 'shot') { if (bSpeed() < 0.9 && ball.y < Y + R + 0.05) { ball.kind = 'loose'; ball.to = null; } }
    }
    // giro da bola rolando
    const mx = ball.x - pre.x, mz = ball.z - pre.z, ml = hyp(mx, mz);
    if (ml > 1e-5) { _ax.set(mz / ml, 0, -mx / ml); _qr.setFromAxisAngle(_ax, ml / R); ball.mesh.quaternion.premultiply(_qr); }
    ball.mesh.position.set(ball.x, ball.y, ball.z);
  }
  const _ax = new THREE.Vector3(), _qr = new THREE.Quaternion();
  function touches() {
    if (ball.held || phase === 'goal' && ball.inNet >= 0) return;
    const low = ball.y < Y + R + 0.5, sp = bSpeed();
    // goleiro: mãos (chute ou bola por perto)
    if (phase === 'play') for (const k of players) if (k.gk && ['save', 'gkget', 'gk', 'free', 'move'].includes(k.act) && !ball.owner) {
      const [fx, fz] = fwd(k), hx = k.x + fx * 0.25, hz = k.z + fz * 0.25, d = hyp(ball.x - hx, ball.z - hz);
      if (Math.abs(ball.x - ownX(k.team)) > 4) continue;
      const shot = ball.kind === 'shot';
      if (d < (shot ? 0.42 : 0.55) && ball.y < Y + 1.55 && (!shot || d < 0.28 || Math.random() < 0.55)) { giveHands(k); k.act = 'gkhold'; k.at = 0; k.hold = rnd(1.0, 2.0); ev(shot ? 'defesa' : 'pega', k); ball.last = k; return; }
      if (shot && d < 1.3 && ball.y < Y + 1.7 && k.act === 'save' && !k.dove) {           // ponte: às vezes espalma, às vezes não alcança
        k.dove = true; k.act = 'dive'; k.at = 0; k.diveSide = Math.sign((ball.x - k.x) * cos(k.hd) - (ball.z - k.z) * sin(k.hd)) || 1;   // lado da bola (x local)
        if (Math.random() < 0.45) { ball.vx = -ball.vx * 0.35; ball.vz = ball.vz * 0.6 + rnd(-2, 2); ball.vy = Math.abs(ball.vy) * 0.3 + 1; ball.kind = 'loose'; ball.last = k; ev('espalma', k); }
        return;
      }
    }
    if (ball.owner || !low) return;
    for (const k of players) {
      if (phase !== 'play' && k.act !== 'fetchball') continue;
      if (k.gk || ['kick', 'stumble', 'complain', 'protest', 'sulk', 'celebrate', 'rest'].includes(k.act)) continue;
      if (ball.from === k && ball.kind !== 'loose' && hyp(ball.x - k.x, ball.z - k.z) < 1.5) continue;
      const f = footPt(k, 0.25), d = hyp(ball.x - f.x, ball.z - f.z);
      if (d < 0.42) {
        if (ball.kind === 'shot' && ball.from && ball.from.team !== k.team && sp > 4.5) {      // bloqueio: a bola bate na perna e espirra
          const a = Math.atan2(ball.vx, ball.vz) + Math.PI + rnd(-1.2, 1.2), v = sp * rnd(0.3, 0.5);
          ball.vx = sin(a) * v; ball.vz = cos(a) * v; ball.vy = rnd(0, 1.5); ball.kind = 'loose'; ball.to = null; ball.last = k; ball.from = null;
          k.act = 'stumble'; k.at = 0.25; ev('bloqueio', k); return;
        }
        if ((ball.kind === 'pass' && ball.to === k) || (['receive', 'chase', 'move', 'press', 'free', 'fetchball'].includes(k.act) && sp < 8.5)) { trap(k); return; }
        if (sp > 1) { const dx = ball.x - k.x, dz = ball.z - k.z, L = hyp(dx, dz) || 1; ball.vx = dx / L * sp * 0.4; ball.vz = dz / L * sp * 0.4; ball.kind = 'loose'; ball.last = k; ball.to = null; }
      }
    }
  }

  // ---- animação ----
  function pose(k, tt) {
    const P = k.P, s = k.s, b = P.b;
    const run = k.v > 2.1, walking = k.v > 0.18;
    s.mode = run ? 'run' : walking ? 'walk' : 'idle'; s.amp = run ? clamp(k.v / 3.4, 0.5, 1) : clamp(k.v / 1.2, 0.3, 1); s.ph = k.ph; s.t = tt + k.seed;
    const look = Math.atan2(ball.x - k.x, ball.z - k.z), dB = hyp(ball.x - k.x, ball.z - k.z);
    s.lookYaw = clamp(wrap(look - k.hd), -1.2, 1.2); s.lookPitch = dB < 3 ? 0.28 : dB < 7 ? 0.12 : 0;
    s.act = null; s.talk = 0; s.hands = null; s.mode = k.sub ? 'sit' : s.mode; s.seat = 0.48;
    if (k.call > 0.5 || k.act === 'complain' || (k.act === 'celebrate' && k.at > 0)) s.talk = 1;
    animatePerson(P, s);
    let rootY = 0;
    const L = k.foot < 0, hip = L ? b.hipL : b.hipR, knee = L ? b.kneeL : b.kneeR, hip2 = L ? b.hipR : b.hipL, knee2 = L ? b.kneeR : b.kneeL;
    const armO = L ? b.shR : b.shL, armS = L ? b.shL : b.shR, so = L ? 1 : -1;
    if (k.sub) {                                                                            // no banco: cotovelos nos joelhos, levanta no gol
      const ch = smooth(0, 0.25, k.cheer) * (1 - smooth(0.85, 1, 1 - k.cheer));
      if (k.cheer > 0.05) { b.body.position.y += 0.25 * ch; b.shL.rotation.set(-2.6 * ch, 0, -0.25); b.shR.rotation.set(-2.6 * ch, 0, 0.25); b.elL.rotation.set(-0.4, 0, 0); b.elR.rotation.set(-0.4, 0, 0); }
      else { b.waist.rotation.x = 0.35; reach(P, -1, -0.12, 0.62, 0.36, -0.6, -0.5, 0.2); reach(P, 1, 0.12, 0.62, 0.36, 0.6, -0.5, 0.2); }
    } else if (k.act === 'kick') {
      const K = k.kick, st = K.kind === 'shot' ? 0.27 : 0.25, u = K.turned ? k.at : 0, big = K.kind === 'pass' ? 1 : 1.25;
      if (K.turned) {
        let hx, kx;
        if (u < st - 0.08) { const e = smooth(0, st - 0.08, u); hx = 0.7 * big * e; kx = 1.35 * e; }
        else if (u < st + 0.06) { const e = smooth(st - 0.08, st + 0.06, u); hx = lerp(0.7 * big, -1.05 * big, e); kx = lerp(1.35, 0.08, e); }
        else { const e = smooth(st + 0.06, st + 0.42, u); hx = lerp(-1.05 * big, -0.05, e); kx = lerp(0.08, 0.15, e); }
        hip.rotation.set(hx, 0, 0); knee.rotation.set(kx, 0, 0);
        hip2.rotation.set(-0.15, 0, 0); knee2.rotation.set(0.3, 0, 0);
        b.body.position.y = -0.04; b.waist.rotation.x = -0.12 * big + 0.1;
        armO.rotation.set(-0.5, 0, so * (0.4 + 0.5 * big)); armS.rotation.set(0.6, 0, -so * 0.3);
        b.body.rotation.y = -so * 0.18 * Math.max(0, -hx / big);
      }
    } else if (k.act === 'trap') {
      const e = sin(clamp(k.at / 0.3, 0, 1) * Math.PI);
      hip.rotation.set(-0.55 * e, 0, 0); knee.rotation.set(0.5 * e, 0, 0); knee2.rotation.x = 0.2 * e;
      armO.rotation.z += so * 0.3 * e; s.lookPitch = 0.35;
    } else if (k.act === 'hold') {
      hip.rotation.set(-0.32, 0, 0); knee.rotation.set(0.12, 0, 0); knee2.rotation.x = 0.12;
      b.head.rotation.y = 0.9 * sin(k.at * 2.1 + k.seed);                                   // olha em volta procurando alguém
    } else if (k.act === 'dribble' && k.touchT > 0) {
      const e = sin(k.touchT / 0.16 * Math.PI);
      hip.rotation.x = lerp(hip.rotation.x, -0.55, e); knee.rotation.x = lerp(knee.rotation.x, 0.35, e);
    } else if (k.act === 'tackle') {
      const e = smooth(0, 0.18, k.at) * (1 - smooth(0.35, 0.55, k.at));
      hip.rotation.set(-1.0 * e, 0, 0); knee.rotation.set(0.1, 0, 0); knee2.rotation.set(0.8 * e, 0, 0); hip2.rotation.set(-0.3 * e, 0, 0);
      b.body.position.y -= 0.18 * e; b.waist.rotation.x += 0.15 * e; armO.rotation.set(-0.3, 0, so * 0.9 * e);
    } else if (k.act === 'stumble') {
      const e = sin(clamp(k.at / 0.6, 0, 1) * Math.PI);
      b.waist.rotation.x += 0.35 * e; b.shL.rotation.set(-0.8 * e, 0, -0.9 * e); b.shR.rotation.set(-0.8 * e, 0, 0.9 * e);
    } else if (k.act === 'complain') {                                                      // braços abertos: "foi falta!"
      const e = smooth(0, 0.3, k.at);
      b.shL.rotation.set(-0.7 * e, 0, -0.8 * e); b.shR.rotation.set(-0.7 * e, 0, 0.8 * e); b.elL.rotation.set(-0.7 * e, 0, 0); b.elR.rotation.set(-0.7 * e, 0, 0);
      b.head.rotation.y += 0.35 * sin(k.at * 7) * e;
    } else if (k.act === 'protest') {                                                       // mãos para cima: "nem encostei"
      const e = smooth(0, 0.35, k.at);
      b.shL.rotation.set(-1.9 * e, 0, -0.35); b.shR.rotation.set(-1.9 * e, 0, 0.35); b.elL.rotation.set(-1.1 * e, 0, 0); b.elR.rotation.set(-1.1 * e, 0, 0);
      b.head.rotation.x += 0.15 * sin(k.at * 3);
    } else if (k.act === 'celebrate') {
      const u = Math.max(0, k.at), e = smooth(0, 0.3, u) * (1 - smooth(k.dur - 0.4, k.dur, u));
      if (k.cele === 0 || k.gk) {                                                           // pula com os braços para cima
        b.shL.rotation.set(-2.7 * e, 0, -0.3); b.shR.rotation.set(-2.7 * e, 0, 0.3); b.elL.rotation.set(-0.3, 0, 0); b.elR.rotation.set(-0.3, 0, 0);
        if (k.v < 0.6) rootY = Math.max(0, sin(u * 7.5 + k.seed)) * 0.28 * e;
      } else if (k.cele === 1) {                                                            // aviãozinho
        b.shL.rotation.set(0.1, 0, -1.45 * e); b.shR.rotation.set(0.1, 0, 1.45 * e); b.elL.rotation.set(0, 0, 0); b.elR.rotation.set(0, 0, 0);
        b.body.rotation.z += 0.25 * e * sin(u * 2.2);
      } else {                                                                              // soco no ar
        b.shR.rotation.set(-2.9 * e, 0, 0.2); b.elR.rotation.set(-0.6 * e - 0.6 * Math.max(0, sin(u * 9)) * e, 0, 0);
        if (k.v < 0.6) rootY = Math.max(0, sin(u * 6 + 1)) * 0.2 * e;
      }
    } else if (k.act === 'sulk') {                                                          // mãos na cabeça
      const e = smooth(0, 0.35, k.at) * (1 - smooth(k.dur - 0.3, k.dur, k.at));
      if (e > 0.02) { reach(P, -1, -0.45, 1.58, -0.04, -0.9, 0.4, 0.1); reach(P, 1, 0.45, 1.58, -0.04, 0.9, 0.4, 0.1); b.head.rotation.x += 0.25 * e; }
    } else if (k.act === 'rest') {                                                          // mãos nos joelhos, respirando
      const e = smooth(0, 0.3, k.at) * (1 - smooth(k.dur - 0.3, k.dur, k.at));
      b.waist.rotation.x += 0.6 * e; b.hipL.rotation.x = b.hipR.rotation.x = -0.32 * e; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.42 * e; b.body.position.y -= 0.06 * e;
      if (e > 0.3) { reach(P, -1, -0.17, 0.45, 0.28, -0.6, -0.2, 0.3); reach(P, 1, 0.17, 0.45, 0.28, 0.6, -0.2, 0.3); }
      b.waist.rotation.x += 0.03 * sin(tt * 5 + k.seed);
    }
    if (k.gk && !['celebrate', 'sulk', 'fetch', 'gkthrow'].includes(k.act) && ball.held !== k) {   // goleiro: base, joelhos dobrados, mãos à frente
      const near = clamp(1 - (Math.abs(ball.x - ownX(k.team)) - 3) / 7, 0, 1);
      if (k.act === 'dive') {                                                               // ponte: voa de lado com os braços esticados, cai e levanta
        const up = smooth(0, 0.18, k.at), fall = smooth(0.32, 0.6, k.at), e = up * (1 - smooth(1.0, 1.5, k.at)), sd = k.diveSide || 1;
        b.body.rotation.z = -sd * 1.4 * e; b.body.position.y = (0.5 * (1 - fall) + 0.2 * fall) * e; b.body.position.x = sd * 0.6 * e;
        b.shL.rotation.set(0, 0, -2.84 * e - 0.1); b.shR.rotation.set(0, 0, 2.84 * e + 0.1); b.elL.rotation.set(-0.15, 0, 0); b.elR.rotation.set(-0.15, 0, 0);
        b.hipL.rotation.x = -0.25 * e; b.kneeL.rotation.x = 0.5 * e; b.kneeR.rotation.x = 0.2 * e;
      } else if (near > 0.05 && k.v < 2) {
        b.body.position.y -= 0.08 * near; b.hipL.rotation.x += -0.35 * near; b.hipR.rotation.x += -0.35 * near; b.kneeL.rotation.x += 0.7 * near; b.kneeR.rotation.x += 0.7 * near;
        b.waist.rotation.x += 0.25 * near;
        if (near > 0.4) { reach(P, -1, -0.34, 0.95, 0.32, -0.8, -0.4, 0); reach(P, 1, 0.34, 0.95, 0.32, 0.8, -0.4, 0); }
      }
    }
    if (ball.held === k) {                                                                  // bola nas mãos
      if (k.act === 'gkthrow') {
        const u = k.at, lob = k.kick.lob, rel = lob ? 0.42 : 0.38;
        if (lob) { const e = u < rel ? smooth(0, rel, u) : 1; const sx = lerp(-2.2, -3.0, e); b.shL.rotation.set(sx, 0, -0.2); b.shR.rotation.set(sx, 0, 0.2); b.elL.rotation.set(-1.2 * e, 0, 0); b.elR.rotation.set(-1.2 * e, 0, 0); b.waist.rotation.x = -0.25 * e; }
        else { const e = smooth(0, rel, u); b.waist.rotation.x = 0.55 * e; b.hipL.rotation.x = -0.4 * e; b.kneeL.rotation.x = 0.6 * e; b.kneeR.rotation.x = 0.5 * e; b.body.position.y = -0.1 * e; reach(P, 1, 0.1, 0.7 - 0.35 * e, 0.45, 0.6, -0.5, 0); }
      } else { const cy = k.pick > 0 ? 0.35 : 0.92; if (k.pick > 0) { b.waist.rotation.x = 0.8; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.7; b.hipL.rotation.x = b.hipR.rotation.x = -0.4; b.body.position.y = -0.12; } reach(P, -1, -0.22, cy, 0.46, -0.7, -0.4, 0); reach(P, 1, 0.22, cy, 0.46, 0.7, -0.4, 0); }
    } else if (k.act === 'gkthrow' && k.at > (k.kick.lob ? 0.42 : 0.38)) {                // depois de soltar: braços acompanham
      const e = 1 - smooth(0.42, 0.85, k.at); b.shL.rotation.set(-1.4 * e, 0, -0.2); b.shR.rotation.set(-1.4 * e, 0, 0.2);
    }
    if (k.call > 0.05 && !['kick', 'celebrate', 'sulk', 'rest'].includes(k.act)) {          // pede a bola com o braço erguido
      const e = smooth(0, 1, k.call); b.shR.rotation.set(lerp(b.shR.rotation.x, -2.6, e), 0, lerp(b.shR.rotation.z, 0.3, e)); b.elR.rotation.set(-0.3 * e, 0, 0);
    }
    P.root.position.set(k.x, Y + rootY, k.z); P.root.rotation.y = k.hd;
  }

  return {
    group, reset, center: { x: cx, z: GZ }, ball, get players() { return players; }, get subs() { return subs; }, get phase() { return phase; }, get score() { return score; }, get log() { return log; },
    update(dt, walker) { update(dt, walker); },
    draw(tt, near) { for (const k of players) { pose(k, tt); k.P.setShadow(near); } for (const s of subs) { pose(s, tt); s.P.root.position.set(s.x, C.y + 0.14, s.z); s.P.setShadow(near); } },
    show(on) { group.visible = on; },
  };
}

// ---------------------------------------------------------------- dominó ----
const TILE = { L: 0.15, W: 0.075, H: 0.032 };
function tileGeo() {
  const parts = [[new THREE.BoxGeometry(TILE.W, TILE.H, TILE.L), '#f6f3ea', 0, 0, 0], [new THREE.BoxGeometry(TILE.W + 0.002, TILE.H + 0.002, 0.008), '#2a2a2a', 0, 0, 0]];
  for (const [x, z] of [[-0.018, -0.04], [0.018, -0.02], [0, 0.035], [-0.018, 0.05], [0.018, 0.05]]) parts.push([new THREE.BoxGeometry(0.014, 0.004, 0.014), '#2a2a2a', x, TILE.H / 2, z]);
  return mergeGeometries(parts.map(([g, c, x, y, z]) => { g.translate(x, y, z); const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(c); for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('uv'); return g; }), false);
}
function createDomino(F) {
  const q = F.square, Y0 = q.y + 0.16, cx = (q.x0 + q.x1) / 2 + DOMINO.dx, cz = (q.z0 + q.z1) / 2 + DOMINO.dz, TY = Y0 + DOMINO.top;
  const group = new THREE.Group(); group.name = 'morro-domino';
  const looks = [
    { name: 'seu-dito', k: 2, skin: SKINS[6], hair: '#d8d4cc', hairStyle: 'bald', top: '#ffffff', sleeve: 'tank', shorts: '#5a5f6e', flip: '#1f78d1', old: true, mustache: '#d8d4cc' },
    { name: 'seu-ze', k: 5, skin: SKINS[1], hair: '#b9b4ac', hairStyle: 'short', top: '#3fa7d6', stripe: '#ffffff', shorts: '#2b2b2b', flip: '#2b2b2b', old: true, glasses: '#2a2a2a', cap: '#d23a2e' },
    { name: 'seu-bira', k: 8, skin: SKINS[4], hair: '#2a1d14', hairStyle: 'buzz', top: '#e84a5f', shorts: '#3d4a66', flip: '#ffd23f', mustache: '#2a1d14' },
    { name: 'seu-careca', k: 11, skin: SKINS[3], hair: '#9e9e9e', hairStyle: 'bald', top: '#7bc950', shorts: '#7a4a2a', flip: '#2b2b2b', old: true },
  ];
  const seats = [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2; return { x: cx + cos(a) * DOMINO.stoolR, z: cz + sin(a) * DOMINO.stoolR, ry: Math.atan2(cx - (cx + cos(a)), cz - (cz + sin(a))) }; });
  const men = looks.map((L, i) => { const P = buildPerson(L); group.add(P.root); P.root.position.set(seats[i].x, Y0, seats[i].z); P.root.rotation.y = seats[i].ry; return { P, i, s: newState(), seed: Math.random() * 10, ...seats[i], tiles: 6, think: rnd(0.8, 2.5), talky: [0.15, 0.5, 0.35, 0.05][i] }; });
  // palpiteiro em pé atrás de um dos jogadores
  const kib = { P: buildPerson({ name: 'palpiteiro', k: 14, skin: SKINS[5], hair: '#1d1d1f', hairStyle: 'short', top: '#f2d34f', sleeve: 'short', pants: '#3d4a66', shoes: '#2b2522', sole: '#2b2522' }), s: newState(), seed: 3.3, behind: 2, at: 0, pt: 0 };
  group.add(kib.P.root);
  // pedras: 6 em pé na frente de cada um + a fila da mesa
  const im = new THREE.InstancedMesh(tileGeo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), 28);
  im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; group.add(im);
  const chain = [];                                                                         // posições das pedras jogadas (local da mesa)
  // fila da mesa: cresce para os dois lados a partir do meio e dobra nas pontas (sem chegar nas pedras em pé de ninguém)
  const SNAKE = [[0.08, 0, 1], [0.24, 0, 1], [0.33, 0.13, 0], [0.33, 0.29, 0], [0.19, 0.33, 1], [0.03, 0.33, 1], [-0.13, 0.33, 1], [-0.29, 0.33, 1], [-0.33, 0.17, 0]];
  const slot = n => { const sd = n % 2 ? 1 : -1, [x, z, h] = SNAKE[Math.min(SNAKE.length - 1, Math.floor(n / 2))]; return { x: sd * x, z: sd * z, ry: h ? Math.PI / 2 : 0 }; };
  let turn = 0, phase = 'think', ph = 0, played = 0, round = 0, hand = null, M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), E = new THREE.Euler();
  function reset() { for (const m of men) m.tiles = 6; chain.length = 0; turn = Math.floor(Math.random() * 4); phase = 'think'; ph = 0; played = 0; men[turn].think = rnd(0.8, 2.6); writeTiles(); }
  function writeTiles(shuffleT = -1) {
    let n = 0;
    for (const m of men) {
      const c = cos(m.ry), s = sin(m.ry);
      for (let j = 0; j < m.tiles; j++) {
        const lx = (j - (m.tiles - 1) / 2) * 0.085, lz = ROW;                          // em pé, de frente para o dono
        const wx = m.x + lx * c + lz * s, wz = m.z - lx * s + lz * c;
        M.compose(V.set(wx, TY + TILE.L / 2, wz), Q.setFromEuler(E.set(Math.PI / 2 - 0.12, m.ry, 0, 'YXZ')), S1); im.setMatrixAt(n++, M);
      }
    }
    chain.forEach((p, j) => {
      let x = p.x, z = p.z, ry = p.ry;
      if (shuffleT >= 0) { x = sin(j * 2.1 + shuffleT * 3) * 0.3; z = cos(j * 1.7 + shuffleT * 2.6) * 0.3; ry = j + shuffleT * 2; }
      M.compose(V.set(cx + x, TY + TILE.H / 2, cz + z), Q.setFromEuler(E.set(0, ry, 0)), S1); im.setMatrixAt(n++, M);
    });
    if (hand) { M.compose(V.copy(hand), Q.setFromEuler(E.set(0, men[turn].ry + Math.PI / 2, 0)), S1); im.setMatrixAt(n++, M); }
    im.count = n; im.instanceMatrix.needsUpdate = true;
  }
  function update(dt, tt) {
    ph += dt;
    const m = men[turn];
    if (phase === 'think') { if (ph > m.think) { ph = 0; phase = Math.random() < 0.14 && played > 2 ? 'pass' : 'pick'; } }
    else if (phase === 'pick') { if (ph > 0.35) { ph = 0; phase = 'place'; m.tiles--; } }
    else if (phase === 'place') { if (ph > 0.45) { ph = 0; phase = 'slam'; } }
    else if (phase === 'slam') { if (ph > 0.12 && !m.slammed) { m.slammed = true; chain.push(slot(chain.length)); played++; hand = null; } if (ph > 0.6) { m.slammed = false; ph = 0; next(m.tiles === 0 || played >= 18); } }
    else if (phase === 'pass') { if (ph > 1.0) { ph = 0; next(false); } }
    else if (phase === 'end') { if (ph > 2.6) { ph = 0; phase = 'shuffle'; } }
    else if (phase === 'shuffle') { if (ph > 3.2) { ph = 0; for (const q of men) q.tiles = 6; chain.length = 0; round++; turn = (turn + 1) % 4; phase = 'think'; men[turn].think = rnd(1, 2.4); } }
    if (phase === 'place' || phase === 'slam') {                                            // pedra na mão (até cair na mesa)
      const tgt = slot(chain.length), from = { x: m.x + sin(m.ry) * ROW, z: m.z + cos(m.ry) * ROW }, u = phase === 'place' ? smooth(0, 0.45, ph) : 1;
      hand = hand || new THREE.Vector3();
      hand.set(lerp(from.x, cx + tgt.x, u), TY + 0.06 + 0.16 * sin(u * Math.PI) + (phase === 'slam' ? 0.08 * (1 - smooth(0, 0.12, ph)) : 0), lerp(from.z, cz + tgt.z, u));
    }
    writeTiles(phase === 'shuffle' ? ph : -1);
    function next(end) { if (end) { phase = 'end'; ph = 0; men.forEach(q => { q.react = q === m ? 'win' : pick(['head', 'shrug', 'laugh']); }); return; } turn = (turn + 1) % 4; phase = 'think'; men[turn].think = rnd(0.7, 3.0) * (turn === 1 ? 1.4 : 1); }
  }
  function draw(tt, near) {
    const cur = men[turn];
    for (const m of men) {
      const P = m.P, s = m.s, b = P.b, me = m === cur;
      s.mode = 'sit'; s.seat = DOMINO.seat; s.t = tt + m.seed; s.act = null; s.hands = null; s.talk = 0;
      // olham a mesa; de vez em quando, quem fala olha para alguém
      const talking = !me && (sin(tt * 0.45 + m.seed * 3) > 1 - m.talky * 0.9);
      s.lookPitch = 0.35; s.lookYaw = talking ? 0.6 * sin(m.seed) : 0;
      s.talk = talking ? 1 : 0;
      animatePerson(P, s);
      const lean = 0.26 + (me && (phase === 'place' || phase === 'slam' || phase === 'pick') ? 0.25 : 0) + (phase === 'shuffle' ? 0.3 : 0);
      b.waist.rotation.x = lean;
      const rowL = [-0.18, 0.8, ROW - 0.05], rowR = [0.18, 0.8, ROW - 0.05];
      if (phase === 'shuffle') {                                                            // embaralha: as mãos rodam no meio da mesa
        const a = tt * 3 + m.seed, cL = toLocal(m.x, Y0, m.z, m.ry, 1, { x: cx + 0.2 * cos(a), y: TY + 0.04, z: cz + 0.2 * sin(a) }), cR = toLocal(m.x, Y0, m.z, m.ry, 1, { x: cx - 0.2 * cos(a * 1.3), y: TY + 0.04, z: cz - 0.2 * sin(a * 1.3) });
        reach(P, -1, ...cL, -0.7, -0.5, -0.2); reach(P, 1, ...cR, 0.7, -0.5, -0.2);
      } else if (me && (phase === 'pick' || phase === 'place' || phase === 'slam') && hand) {
        reach(P, 1, ...toLocal(m.x, Y0, m.z, m.ry, 1, { x: hand.x, y: hand.y + 0.05, z: hand.z }), 0.7, -0.5, -0.2); reach(P, -1, ...rowL, -0.6, -0.6, 0);
        if (phase === 'slam') b.waist.rotation.x += 0.08 * sin(clamp(ph / 0.12, 0, 1) * Math.PI);
      } else if (me && phase === 'pick') { reach(P, 1, 0.05, 0.86, ROW - 0.05, 0.6, -0.6, 0); reach(P, -1, ...rowL, -0.6, -0.6, 0); }
      else if (me && phase === 'pass') {                                                    // passa: duas batidas na mesa
        const kn = Math.abs(sin(clamp(ph / 0.6, 0, 1) * Math.PI * 2));
        reach(P, 1, 0.12, 0.8 + 0.12 * kn, ROW, 0.6, -0.6, 0); reach(P, -1, ...rowL, -0.6, -0.6, 0); s.talk = 1;
      } else if (phase === 'end') {
        const e = smooth(0, 0.4, ph) * (1 - smooth(2.2, 2.6, ph));
        if (m.react === 'win') { b.waist.rotation.x = 0.05; b.shL.rotation.set(-2.4 * e, 0, -0.4); b.shR.rotation.set(-2.4 * e, 0, 0.4); b.elL.rotation.set(-0.4, 0, 0); b.elR.rotation.set(-0.4, 0, 0); b.mouth.scale.set(1, 0.3 + 0.7 * Math.abs(sin(tt * 9)), 1); }
        else if (m.react === 'head') { reach(P, -1, -0.41, 1.55, -0.04, -0.9, 0.4, 0.1); reach(P, 1, 0.41, 1.55, -0.04, 0.9, 0.4, 0.1); b.head.rotation.y += 0.3 * sin(tt * 5); }
        else if (m.react === 'shrug') { b.shL.rotation.set(-0.6 * e, 0, -0.7 * e); b.shR.rotation.set(-0.6 * e, 0, 0.7 * e); b.elL.rotation.set(-1.2 * e, 0, 0); b.elR.rotation.set(-1.2 * e, 0, 0); }
        else { b.head.rotation.x -= 0.35 * e; b.mouth.scale.set(1, 0.3 + 0.7 * Math.abs(sin(tt * 10)), 1); reach(P, -1, ...rowL, -0.6, -0.6, 0); reach(P, 1, ...rowR, 0.6, -0.6, 0); }
      } else {                                                                              // segurando as pedras / mão no queixo pensando
        if (me && phase === 'think' && m.i % 2 === 0) { reach(P, 1, 0.04, 1.1, 0.33, 0.7, -0.6, 0); reach(P, -1, ...rowL, -0.6, -0.6, 0); b.head.rotation.x -= 0.1; }
        else { reach(P, -1, ...rowL, -0.6, -0.6, 0); reach(P, 1, ...rowR, 0.6, -0.6, 0); }
      }
      P.setShadow(near);
    }
    // palpiteiro: atrás de um jogador, mãos para trás; às vezes aponta para a mesa e fala
    const k = kib, P = k.P, b = P.b, host = men[k.behind], bx = host.x - sin(host.ry) * 0.85 + cos(host.ry) * 0.35, bz = host.z - cos(host.ry) * 0.85 - sin(host.ry) * 0.35;
    k.at += 1 / 60;
    k.s.mode = 'idle'; k.s.t = tt + k.seed; k.s.act = null; k.s.lookPitch = 0.45; k.s.lookYaw = 0; k.s.talk = 0;
    const pointing = sin(tt * 0.31 + 1.3) > 0.82;
    if (pointing) k.s.talk = 1;
    animatePerson(P, k.s);
    b.waist.rotation.x = 0.22;
    if (pointing) { reach(P, 1, ...toLocal(bx, Y0, bz, host.ry, 1, { x: cx, y: TY + 0.15, z: cz }), 0.6, -0.5, 0); reach(P, -1, -0.12, 0.68, -0.28, -0.4, -0.6, -0.6); }
    else { reach(P, -1, -0.1, 0.7, -0.28, -0.4, -0.6, -0.6); reach(P, 1, 0.1, 0.7, -0.28, 0.4, -0.6, -0.6); }
    P.root.position.set(bx, Y0, bz); P.root.rotation.y = host.ry; P.setShadow(near);
  }
  reset();
  return { group, reset, update, draw, center: { x: cx, z: cz }, get state() { return { phase, turn, played, round, chain: chain.length, tiles: men.map(m => m.tiles) }; }, show(on) { group.visible = on; } };
}

// ---------------------------------------------------------------- mercadinho ----
/** Caminho a pé (A* numa grade de 0,5, 8 vizinhos) entre dois pontos, fora dos sólidos (blocked) e do asfalto; depois só os
 *  cantos necessários (linha de visada). null se não houver. */
function walkRoute(F, blocked, a, b) {
  const G = 0.5, x0 = Math.min(a.x, b.x) - 14, z0 = Math.min(a.z, b.z) - 14, nx = Math.ceil((Math.max(a.x, b.x) + 14 - x0) / G), nz = Math.ceil((Math.max(a.z, b.z) + 14 - z0) / G);
  const hw = FAV.RW / 2 + 0.2, road = (x, z) => F.segs.some(s => { const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, u = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return hyp(x - ax - dx * u, z - az - dz * u) < hw; });
  const ok = (x, z) => !blocked(x, z) && !road(x, z);
  const free = new Uint8Array(nx * nz); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) free[j * nx + i] = ok(x0 + i * G, z0 + j * G) ? 1 : 0;
  const id = (x, z) => Math.round((z - z0) / G) * nx + Math.round((x - x0) / G), s0 = id(a.x, a.z), s1 = id(b.x, b.z);
  if (!free[s0] || !free[s1]) return null;
  const gs = new Float32Array(nx * nz).fill(1e9), from = new Int32Array(nx * nz).fill(-1), open = [s0]; gs[s0] = 0;
  const hx = c => hyp((c % nx) - (s1 % nx), Math.floor(c / nx) - Math.floor(s1 / nx));
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (gs[open[i]] + hx(open[i]) < gs[open[bi]] + hx(open[bi])) bi = i;
    const c = open.splice(bi, 1)[0]; if (c === s1) break;
    const ci = c % nx, cj = Math.floor(c / nx);
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
      const n = j * nx + i; if (!free[n] || (di && dj && (!free[cj * nx + i] || !free[j * nx + ci]))) continue;
      const g = gs[c] + (di && dj ? 1.414 : 1); if (g < gs[n]) { if (gs[n] >= 1e9) open.push(n); gs[n] = g; from[n] = c; }
    }
  }
  if (from[s1] < 0) return null;
  const cells = []; for (let c = s1; c >= 0; c = from[c]) cells.unshift({ x: x0 + (c % nx) * G, z: z0 + Math.floor(c / nx) * G });
  cells[0] = { x: a.x, z: a.z }; cells[cells.length - 1] = { x: b.x, z: b.z };
  const see = (p, q) => { const L = hyp(q.x - p.x, q.z - p.z), n = Math.ceil(L / 0.25); for (let k = 1; k < n; k++) if (!ok(lerp(p.x, q.x, k / n), lerp(p.z, q.z, k / n))) return false; return true; };
  const out = [cells[0]]; let i = 0;
  while (i < cells.length - 1) { let j = cells.length - 1; while (j > i + 1 && !see(cells[i], cells[j])) j--; out.push(cells[j]); i = j; }
  return out;
}

function createMarket(F, blocked) {
  const m = F.market, cx = (m.x0 + m.x1) / 2, Y0 = 0.02, front = m.z1;
  const group = new THREE.Group(); group.name = 'morro-mercadinho';
  const owner = { P: buildPerson({ name: 'dono-mercadinho', k: 21, skin: SKINS[2], hair: '#2a1d14', hairStyle: 'short', top: '#ffffff', sleeve: 'short', pants: '#3d4a66', shoes: '#2b2522', sole: '#2b2522', mustache: '#2a1d14' }), s: newState(), seed: 1.7 };
  const buyer = { P: buildPerson({ name: 'freguesa', k: 24, skin: SKINS[5], hair: '#1d1d1f', hairStyle: 'bun', top: '#e84a5f', sleeve: 'short', shorts: '#2f4a6e', flip: '#ffd23f' }), s: newState(), seed: 4.2 };
  owner.P.give('broom', 'R'); owner.P.drop('broom');
  group.add(owner.P.root, buyer.P.root);
  const crate = side => ({ x: cx + side * 3.9, y: Y0 + 0.62, z: front + 0.8 });
  const door = { x: cx - 0.9, z: front + 0.75 };
  // freguesa: vem de um lado da calçada, para na frente das frutas e vai para o outro (só pontos livres)
  const zW = front + 2.6, ends = [-1, 1].map(sd => { let x = cx + sd * 4.5; while (Math.abs(x - cx) < 11 && !blocked(x + sd * 0.6, zW)) x += sd * 0.5; return x; });
  // ela mora numa casa ali perto: sai pela porta, vai às frutas pela calçada e volta para casa (rota calculada no plano;
  // sem rota, vem e vai pela calçada como antes)
  let home = null;
  for (const sd of [-1, 1]) {
    const stand = { x: cx + sd * 3.9, z: zW };
    for (const sp of F.spots) {
      if (sp.foot) continue;
      const door = { x: sp.cx + sp.fx * (FAV.HALF + 0.75), z: sp.cz + sp.fz * (FAV.HALF + 0.75) }, dd = hyp(door.x - stand.x, door.z - stand.z);
      if (dd < 8 || dd > 26 || (home && dd > home.len)) continue;
      const path = walkRoute(F, blocked, door, stand);
      if (path) { let len = 0; for (let k = 1; k < path.length; k++) len += hyp(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z); if (!home || len < home.len) home = { sd, path, len, ry: Math.atan2(sp.fx, sp.fz) }; }
    }
  }
  let leg = null, legI = 0;                                                                 // trecho da rota sendo percorrido
  const walkLeg = (dt, sp) => {
    const q = leg[legI], dx = q.x - bx, dz = q.z - bz, d = hyp(dx, dz), v = Math.min(d, sp * dt);
    if (d > 1e-4) { bx += dx / d * v; bz += dz / d * v; bry += clamp(wrap(Math.atan2(dx, dz) - bry), -dt * 5, dt * 5); }
    if (d < 0.03) legI++;
    return legI >= leg.length;
  };
  let ot = 0, oStep = 0, bt = 0, bStep = 0, oSide = 1;
  const O = [{ a: 'stand', d: [5, 9] }, { a: 'arrange', d: [6, 10] }, { a: 'stand', d: [3, 6] }, { a: 'sweep', d: [7, 10] }, { a: 'arrange', d: [5, 8] }];
  let oCur = { ...O[0], dur: 6 }, ox = door.x, oz = door.z, ory = 0, bx = ends[0], bz = zW, bry = Math.PI / 2, bDir = 1, bState = 'away', bDur = rnd(6, 14);
  function update(dt, van) {
    // a van parada ou andando perto: quem está na calçada espera ela passar (olhando para ela)
    const vanNear = (x, z, r) => van && hyp(van.x - x, van.z - z) < r && Math.abs(van.speed || 0) > 0.4;
    const bWait = (bState === 'come' || bState === 'go') && vanNear(bx, bz, 5.5);
    ot += dt; if (!bWait) bt += dt;
    // freguesa
    if (bState === 'away') { buyer.P.root.visible = false; if (bt > bDur) { bState = 'come'; bt = 0; if (home) { bDir = -home.sd; leg = home.path; legI = 1; bx = leg[0].x; bz = leg[0].z; bry = home.ry; } else { bx = ends[bDir > 0 ? 0 : 1]; bz = zW; } buyer.P.root.visible = true; buyer.P.drop(); buyer.P.give('basket', 'L', { full: false }); } }
    else if (bWait) { bry += clamp(wrap(Math.atan2(van.x - bx, van.z - bz) - bry), -dt * 4, dt * 4); }
    else if (bState === 'come' && home) { if (walkLeg(dt, 1.05)) { bState = 'choose'; bt = 0; } }
    else if (bState === 'come') { const tx = cx + (bDir > 0 ? -3.9 : 3.9), d = tx - bx; bx += Math.sign(d) * Math.min(Math.abs(d), 1.05 * dt); bry = Math.sign(d || 1) * Math.PI / 2; if (Math.abs(d) < 0.02) { bState = 'choose'; bt = 0; } }
    else if (bState === 'choose') { bry += clamp(wrap(Math.PI - bry), -dt * 3, dt * 3); if (bt > 6) { bState = 'talk'; bt = 0; } }
    else if (bState === 'talk') { const want = Math.atan2(ox - bx, oz - bz); bry += clamp(wrap(want - bry), -dt * 3, dt * 3); if (bt > 7) { bState = 'pay'; bt = 0; } }
    else if (bState === 'pay') { if (bt > 1.6) { bState = 'go'; bt = 0; buyer.P.items.basket && buyer.P.items.basket.userData.setFull(true); if (home) { leg = home.path.slice().reverse(); legI = 1; } } }
    else if (bState === 'go' && home) { if (walkLeg(dt, 0.95)) { bState = 'away'; bt = 0; bDur = rnd(16, 34); } }   // entra em casa
    else if (bState === 'go') { const tx = ends[bDir > 0 ? 1 : 0], d = tx - bx; bx += Math.sign(d) * Math.min(Math.abs(d), 1.0 * dt); bry = Math.sign(d || 1) * Math.PI / 2; if (Math.abs(d) < 0.02) { bState = 'away'; bt = 0; bDur = rnd(14, 32); bDir = -bDir; } }
    // dono
    const serving = bState === 'talk' || bState === 'pay' || bState === 'choose';
    let tx = door.x, tz = door.z, want = 0;
    if (serving) { tx = cx + (bDir > 0 ? -3.9 : 3.9) + (bDir > 0 ? 1.3 : -1.3); tz = front + 1.6; want = Math.atan2(bx - ox, bz - oz); }
    else {
      if (ot > oCur.dur) { ot = 0; oStep = (oStep + 1) % O.length; oCur = { ...O[oStep], dur: rnd(...O[oStep].d) }; oSide = -oSide; if (oCur.a === 'sweep') owner.P.give('broom', 'body'); else owner.P.drop('broom'); }
      if (oCur.a === 'arrange') { const c = crate(oSide); tx = c.x; tz = front + 1.65; want = Math.PI; }
      else if (oCur.a === 'sweep') { tx = cx + 2.5 * sin(ot * 0.25); tz = front + 2.4; want = Math.PI / 2 * Math.sign(cos(ot * 0.25)); }
      else { tx = door.x; tz = door.z; want = 0; }
    }
    if (vanNear(tx, tz, 4.5)) { tx = ox; tz = oz; }
    const dx = tx - ox, dz = tz - oz, d = hyp(dx, dz), v = Math.min(d, 1.1 * dt);
    owner.v = d > 0.05 ? 1.1 : 0;
    if (d > 0.02) { ox += dx / d * v; oz += dz / d * v; }
    const face = d > 0.15 ? Math.atan2(dx, dz) : want;
    ory += clamp(wrap(face - ory), -dt * 4, dt * 4);
    owner.ph = (owner.ph || 0) + (owner.v * dt) / 0.6 * Math.PI;
    buyer.v = (bState === 'come' || bState === 'go') && !bWait ? 1.0 : 0; buyer.ph = (buyer.ph || 0) + buyer.v * dt / 0.6 * Math.PI;
  }
  function draw(tt, near) {
    const serving = bState === 'talk' || bState === 'pay' || bState === 'choose';
    // dono
    { const P = owner.P, s = owner.s, b = P.b; s.t = tt + owner.seed; s.mode = owner.v > 0 ? 'walk' : 'idle'; s.amp = 1; s.ph = owner.ph; s.act = null; s.work = null; s.talk = 0; s.lookYaw = 0; s.lookPitch = 0; s.hands = null; s.at = ot;
      if (serving && bState === 'talk') { s.act = sin(tt * 0.9) > 0 ? 'talk' : 'listen'; s.talk = s.act === 'talk' ? 1 : 0; }
      else if (!serving && oCur.a === 'arrange' && owner.v === 0) { s.act = 'arrange'; const c = crate(oSide); s.work = new THREE.Vector3(...toLocal(ox, Y0, oz, ory, 1, c)); }
      else if (!serving && oCur.a === 'sweep') s.act = 'sweep';
      animatePerson(P, s);
      if (!serving && oCur.a === 'stand' && owner.v === 0) { reach(P, -1, 0.16, 0.95, 0.3, -0.6, -0.6, 0.3); reach(P, 1, -0.16, 0.9, 0.33, 0.6, -0.6, 0.3); b.head.rotation.y = 0.5 * sin(tt * 0.3 + 1); }   // braços cruzados olhando a rua
      if (bState === 'pay') reach(P, 1, 0.05, 1.0, 0.5, 0.6, -0.6, 0);
      P.root.position.set(ox, Y0, oz); P.root.rotation.y = ory; P.setShadow(near); }
    // freguesa
    if (buyer.P.root.visible) { const P = buyer.P, s = buyer.s, b = P.b; s.t = tt + buyer.seed; s.mode = buyer.v > 0 ? 'walk' : 'idle'; s.amp = 1; s.ph = buyer.ph; s.act = null; s.work = null; s.talk = 0; s.lookYaw = 0; s.lookPitch = 0; s.at = bt;
      if (bState === 'choose') { s.act = 'arrange'; const c = crate(bDir > 0 ? -1 : 1); s.work = new THREE.Vector3(...toLocal(bx, Y0, bz, bry, 1, c)); }
      if (bState === 'talk') { s.act = sin(tt * 0.9) > 0 ? 'listen' : 'talk'; s.talk = s.act === 'talk' ? 1 : 0; }
      animatePerson(P, s);
      if (bState === 'pay') reach(P, 1, 0.05, 1.0, 0.5, 0.6, -0.6, 0);
      void b;
      P.root.position.set(bx, Y0, bz); P.root.rotation.y = bry; P.setShadow(near); }
  }
  return { group, update, draw, center: { x: cx, z: front + 2 }, reset() { bState = 'away'; bt = 0; bDur = rnd(2, 8); }, show(on) { group.visible = on; }, get state() { return { owner: oCur.a, buyer: bState, x: bx, z: bz, home: home && home.path }; } };
}

// ---------------------------------------------------------------- tudo junto ----
/** Vida do Morro. reset(F, blocked) monta (uma vez) e recomeça; update(dt, ouvinte, walker) anda e desenha. */
export function createFavelaLife() {
  const root = new THREE.Group(); root.name = 'favela-life';
  let acts = null, t = 0;
  return {
    object: root,
    get pelada() { return acts && acts.pelada; }, get domino() { return acts && acts.domino; }, get market() { return acts && acts.market; },
    reset(F, blocked) {
      if (!F) return;
      if (!acts) {
        acts = { pelada: createPelada(F), domino: createDomino(F), market: createMarket(F, blocked) };
        for (const a of Object.values(acts)) root.add(a.group);
      }
      for (const a of Object.values(acts)) a.reset();
    },
    /** ear: {x, z} de quem joga (ou null = tudo ligado); walker: {x, z} a pé (ou null). */
    update(dt, ear, walker, van) {
      if (!acts) return;
      t += dt;
      for (const a of Object.values(acts)) {
        const d = ear ? hyp(a.center.x - ear.x, a.center.z - ear.z) : 0, on = d < FAR;
        a.show(on);
        if (!on) continue;
        a.update(dt, a === acts.pelada ? walker : a === acts.market ? van : t);
        a.draw(t, d < SHADOW);
      }
    },
  };
}
