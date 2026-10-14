// Nível 24 (Medieval): moradores do burgo no estilo do ADRESS (cabeção redondo, olhos de ponto, bochechas, tronco
// cilíndrico) com roupas medievais: túnica ou vestido, colete, capa curta, avental, capuz/touca/chapéu, cinto com bolsinha
// e botas; idades (criança, adulto, idoso) e papéis variados (guarda, padeiro, ferreiro, tecelã, comerciante…).
// Cada pessoa é UMA malha com esqueleto (SkinnedMesh: peças rígidas presas às juntas, cores por vértice num material
// compartilhado → 1 desenho por pessoa). Juntas: quadris/joelhos, cintura, cabeça (+ boca), ombros/cotovelos; pontos de
// mão (onde os objetos ficam presos). Objetos (cesto, balde, vassoura, pá de lixo, martelo, caixote, saco, regador,
// tecido dobrado, lança, caneca…) são malhas pequenas presas à mão (ficam em pé, com o ponto de pegar na mão) ou ao
// corpo (as mãos vão até as alças: IK de 2 ossos). Frente da pessoa = +Z local; pés em y = 0.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const PEOPLE_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });

// ---- paleta (pedra, madeira, linho, tingimentos de planta: cores calmas) ----
export const MED_PAL = {
  skin: ['#f0c49a', '#e8b48a', '#d9a074', '#c08560', '#f5d2b0', '#a8714c'],
  hair: ['#3b2a1a', '#6b3e26', '#a0522d', '#d9b46a', '#222222', '#8a5a36', '#c98a4a', '#5a3a22'],
  gray: ['#d9d9d9', '#b9b4ac', '#efefe8', '#9e9e9e'],
  tunic: ['#7a8f5a', '#9a5a3a', '#5a6f8f', '#b08a4a', '#8a4a5a', '#6b7a6a', '#a8754a', '#4f6a78', '#c9b48a', '#7a5a8a', '#8f6f4a', '#5f7a52'],
  dress: ['#6f8a9a', '#9a4a3a', '#5f7a4a', '#8a6a9a', '#b88a5a', '#4a5f7f', '#a85a4a', '#7a8a5a', '#8a5a6a'],
  linen: ['#ece3cc', '#e2d6bc', '#f2ead8'],
  hose: ['#5a4a3a', '#4a4a52', '#6b5a42', '#3f4a3a', '#6a4a3a', '#5a5a4a'],
  boots: ['#4a3022', '#5a3b22', '#3a2a20', '#6b4428'],
  belt: ['#4a3022', '#6b4428', '#3a2a20'],
  apron: ['#e8e0cc', '#d9ccb0', '#c9b89a', '#ddd3bd'],
  cloak: ['#6b3a2a', '#3f5a3f', '#5a4a6a', '#7a6a4a', '#4a5568', '#8a5a3a', '#7a3a3a'],
  felt: ['#5a4632', '#6f5a3a', '#4a3a2a', '#7a3a2a', '#3f4a5a'],
  kerchief: ['#c8402f', '#d9a441', '#3f7a4a', '#2f6fb0', '#e8dcc0', '#8a4a6a'],
  straw: '#e3c77a', coif: '#f1ece0', leather: '#7a4a2a', metal: '#9aa0a8', tabard: '#2f4f8f', trim: '#d9a62a',
};
const EYES = '#2a1d14', CHEEK = '#f29a8a', MOUTH = '#5a2018', GOLD = '#c9a85a';
const HY = 0.34;                                     // centro da cabeça acima do pescoço
const UA = 0.27, LA = 0.25;                          // braço: ombro→cotovelo, cotovelo→mão

// ---- geometrias compartilhadas ----
const GEO = new Map();
const gget = (key, make) => { let x = GEO.get(key); if (!x) { x = make(); GEO.set(key, x); } return x; };
const G = {
  box: (w, h, d) => gget(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 8) => gget(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s)),
  sph: (r, ws = 8, hs = 6) => gget(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs)),
  hemi: (r, ws = 10, hs = 4) => gget(`h${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, Math.PI / 2)),
  apron: (rt, rb, h) => gget(`ap${rt},${rb},${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 6, 1, true, -0.62, 1.24)),   // frente (+Z) de um cone aberto
  hood: r => gget(`hd${r}`, () => new THREE.SphereGeometry(r, 10, 6, Math.PI * 0.8, Math.PI * 1.4, 0, Math.PI * 0.62)),   // aberto na frente (+Z)
  cone: (r, h, s = 8) => gget(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  torus: (r, t, rs = 4, ts = 12, arc = Math.PI * 2) => gget(`t${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const tm = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
/** Funde as peças ({geo, color, m, bone}) numa geometria com cor por vértice (e pesos de osso, se boneMats). */
function bake(parts, boneMats) {
  const geos = parts.map(p => {
    const ge = p.geo.clone(); ge.deleteAttribute('uv');
    ge.applyMatrix4(boneMats ? new THREE.Matrix4().multiplyMatrices(boneMats[p.bone], p.m) : p.m);
    const n = ge.attributes.position.count, col = new Float32Array(n * 3); _c.set(p.color);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    ge.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (boneMats) {
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = p.bone; sw[i * 4] = 1; }
      ge.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); ge.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    }
    return ge;
  });
  const out = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
  return out;
}
const shade = (hex, k) => '#' + _c.set(hex).multiplyScalar(k).getHexString();

// ---- visual de cada papel (cores escolhidas pelo índice k) ----
const pick = (a, k, m = 1, o = 0) => a[Math.abs(k * m + o) % a.length];
/** Opções de aparência para um papel: guard, merchant, baker, smith, weaver, keeper, porter, gardener, sweeper, water,
 *  buyer, walker, elder, child, driver. */
export function medLook(role, k = 0) {
  const P = MED_PAL, f = role === 'weaver' || role === 'keeper' ? true : role === 'smith' || role === 'guard' || role === 'porter' || role === 'baker' || role === 'driver' ? false : k % 2 === 1;
  const o = { role, k, sex: f ? 'f' : 'm', age: role === 'child' ? 'child' : role === 'elder' ? 'old' : 'adult', skin: pick(P.skin, k, 5, 1), hair: pick(P.hair, k, 3, 2),
    hairStyle: f ? pick(['long', 'bun', 'braid', 'bun'], k, 7) : pick(['short', 'short', 'bald', 'short'], k, 5), top: pick(P.tunic, k, 7, 3), dress: f ? pick(P.dress, k, 3, 1) : null,
    sleeve: null, rolled: false, hose: pick(P.hose, k, 5), boots: pick(P.boots, k, 3), belt: pick(P.belt, k, 2), apron: null, bib: false, vest: null, cape: null,
    hat: null, hatColor: null, beard: null, tabard: null, mail: false };
  if (o.age === 'old') { o.hair = pick(P.gray, k); o.hairStyle = f ? 'bun' : 'bald'; o.cape = pick(P.cloak, k, 3); if (!f) o.beard = o.hair; }
  if (!f && o.age === 'adult' && k % 4 === 2) o.beard = shade(o.hair, 0.95);
  switch (role) {
    case 'guard': Object.assign(o, { top: '#5a5e66', tabard: P.tabard, mail: true, hat: 'helmet', hatColor: P.metal, hose: '#3f4a5a', boots: '#3a2a20', beard: k % 2 ? o.hair : null }); break;
    case 'merchant': if (f) Object.assign(o, { apron: pick(P.apron, k), hat: k % 4 === 1 ? 'kerchief' : 'coif', hatColor: pick(P.kerchief, k, 3) }); else Object.assign(o, { apron: pick(P.apron, k), hat: k % 3 ? 'felt' : 'beret', hatColor: pick(P.felt, k), vest: k % 2 ? null : pick(P.cloak, k, 5) }); break;
    case 'baker': Object.assign(o, { top: '#e9dfc6', apron: '#f6f1e4', bib: true, hat: 'baker', hatColor: '#f6f1e4', rolled: true, hose: '#6b5a42' }); break;
    case 'smith': Object.assign(o, { top: '#4a4a52', apron: P.leather, bib: true, hairStyle: 'bald', rolled: true, beard: o.hair, hose: '#3f3a36', boots: '#2b2420' }); break;
    case 'weaver': Object.assign(o, { dress: '#8a4a5a', top: '#8a4a5a', apron: '#e8e0cc', hat: 'kerchief', hatColor: '#d9a441' }); break;
    case 'keeper': Object.assign(o, { dress: '#5f7a4a', top: '#5f7a4a', apron: '#f2ead8', bib: true, hat: 'coif', hatColor: P.coif, rolled: true }); break;
    case 'porter': Object.assign(o, { top: pick(['#8f6f4a', '#6b7a6a', '#9a5a3a'], k), rolled: true, hat: 'cap', hatColor: pick(P.felt, k, 2), vest: '#6b4428' }); break;
    case 'gardener': Object.assign(o, { hat: 'straw', hatColor: P.straw, apron: f ? pick(P.apron, k) : null }); break;
    case 'sweeper': Object.assign(o, { hat: f ? 'kerchief' : 'cap', hatColor: pick(P.kerchief, k, 2, 1), apron: pick(P.apron, k, 3) }); break;
    case 'water': Object.assign(o, { hat: k % 2 ? 'hood' : 'coif', hatColor: k % 2 ? pick(P.cloak, k) : P.coif }); break;
    case 'buyer': Object.assign(o, { hat: f ? 'coif' : 'felt', hatColor: f ? P.coif : pick(P.felt, k, 3), cape: k % 3 === 0 ? pick(P.cloak, k, 2) : null }); break;
    case 'walker': Object.assign(o, { hat: pick(['hood', 'felt', null, 'beret'], k), hatColor: pick(P.cloak, k, 3, 1), cape: k % 2 ? pick(P.cloak, k, 5) : null }); break;
    case 'elder': Object.assign(o, { hat: k % 2 ? 'hood' : 'felt', hatColor: k % 2 ? o.cape : pick(P.felt, k) }); break;
    case 'child': Object.assign(o, { dress: f ? pick(P.dress, k, 2) : null, top: pick(P.tunic, k, 5, 1), hat: k % 3 === 0 ? 'cap' : null, hatColor: pick(P.kerchief, k), hairStyle: f ? 'braid' : 'short' }); break;
    case 'driver': Object.assign(o, { hat: 'felt', hatColor: pick(P.felt, k, 2), cape: pick(P.cloak, k), beard: k % 2 ? o.hair : null }); break;
    default: break;
  }
  return o;
}

/** Uma pessoa. opts: ver medLook (ou { role, k } para usar o visual do papel). Devolve P = { root, mesh, b (juntas), hand, … }. */
export function buildMedPerson(opts = {}) {
  const L = opts.top ? opts : { ...medLook(opts.role || 'walker', opts.k || 0), ...opts };
  const bones = [];
  const B = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const body = B('body', null, 0, 0, 0);
  const hipL = B('hipL', body, -0.14, 0.62, 0), kneeL = B('kneeL', hipL, 0, -0.3, 0);
  const hipR = B('hipR', body, 0.14, 0.62, 0), kneeR = B('kneeR', hipR, 0, -0.3, 0);
  const waist = B('waist', body, 0, 0.6, 0);
  const head = B('head', waist, 0, 0.58, 0);
  const mouth = B('mouth', head, 0, HY - 0.175, 0.37);
  const shL = B('shL', waist, -0.4, 0.52, 0), elL = B('elL', shL, 0, -UA, 0);
  const shR = B('shR', waist, 0.4, 0.52, 0), elR = B('elR', shR, 0, -UA, 0);
  const parts = [];
  const P = (bone, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ bone: bones.indexOf(bone), geo, color, m: tm(x, y, z, rx, ry, rz, sx, sy, sz) });
  const f = L.sex === 'f', top = L.top, dress = L.dress, skin = L.skin, hair = L.hair, W0 = 0.6;
  // pernas: coxa (osso do quadril), canela + bota (osso do joelho)
  for (const [hip, knee] of [[hipL, kneeL], [hipR, kneeR]]) {
    P(hip, G.box(0.22, 0.32, 0.24), L.hose, 0, -0.15, 0);
    P(knee, G.box(0.2, 0.22, 0.22), L.hose, 0, -0.11, 0);
    P(knee, G.box(0.26, 0.14, 0.34), L.boots, 0, -0.25, 0.04);
    P(knee, G.box(0.245, 0.06, 0.255), shade(L.boots, 0.8), 0, -0.165, 0);
  }
  // parte de baixo da roupa (presa ao corpo: não dobra com a cintura): cinto, barra da túnica ou saia, avental
  if (dress) {
    P(body, G.cyl(0.38, 0.56, 0.56, 12), dress, 0, 0.36, 0);
    P(body, G.cyl(0.565, 0.565, 0.05, 12), shade(dress, 0.75), 0, 0.11, 0);
  } else {
    P(body, G.cyl(0.375, 0.43, 0.3, 10), top, 0, 0.47, 0);
    P(body, G.cyl(0.435, 0.435, 0.045, 10), shade(top, 0.78), 0, 0.335, 0);
  }
  P(body, G.cyl(0.39, 0.39, 0.08, 10), L.belt, 0, W0, 0);
  P(body, G.box(0.1, 0.07, 0.03), GOLD, 0, W0, 0.395);
  if (L.role !== 'guard') P(body, G.box(0.14, 0.16, 0.08), MED_PAL.leather, 0.3, 0.52, 0.25, 0, 0.6, 0);   // bolsinha
  if (L.apron) {                                                         // avental: faixa de pano que acompanha a saia/túnica (só na frente)
    if (dress) P(body, G.apron(0.395, 0.575, 0.5), L.apron, 0, 0.39, 0); else P(body, G.apron(0.39, 0.46, 0.46), L.apron, 0, 0.4, 0);
    P(body, G.box(0.5, 0.05, 0.05), shade(L.apron, 0.85), 0, W0 + 0.01, 0.38);
  }
  if (L.tabard) { P(body, G.box(0.5, 0.34, 0.04), L.tabard, 0, 0.45, 0.43, -0.14, 0, 0); P(body, G.box(0.5, 0.34, 0.04), L.tabard, 0, 0.45, -0.43, 0.14, 0, 0); }
  // tronco (osso da cintura)
  const T = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(waist, geo, color, x, y - W0, z, rx, ry, rz, sx, sy, sz);   // y em altura absoluta
  T(G.cyl(0.34, 0.37, 0.62, 10), top, 0, 0.88, 0);
  T(G.torus(0.25, 0.04, 4, 12), shade(L.tabard ? '#5a5e66' : top, 0.8), 0, 1.175, 0, Math.PI / 2, 0, 0);             // gola
  if (dress) for (let i = 0; i < 3; i++) T(G.box(0.15, 0.025, 0.03), shade(top, 0.55), 0, 0.82 + i * 0.09, 0.375, 0, 0, (i % 2 ? 1 : -1) * 0.4);   // cordão do corpete
  if (L.vest) { for (const sd of [-1, 1]) T(G.box(0.22, 0.56, 0.05), L.vest, sd * 0.18, 0.88, 0.35, 0, sd * 0.38, 0); T(G.box(0.62, 0.56, 0.05), L.vest, 0, 0.88, -0.36); }
  if (L.apron && L.bib) { T(G.box(0.38, 0.3, 0.04), L.apron, 0, 0.94, 0.37); for (const sd of [-1, 1]) T(G.box(0.05, 0.26, 0.04), L.apron, sd * 0.15, 1.1, 0.31, -0.3, 0, 0); }
  if (L.tabard) {
    T(G.box(0.54, 0.62, 0.04), L.tabard, 0, 0.88, 0.385); T(G.box(0.54, 0.62, 0.04), L.tabard, 0, 0.88, -0.385);
    T(G.box(0.08, 0.38, 0.02), MED_PAL.trim, 0, 0.9, 0.41); T(G.box(0.3, 0.08, 0.02), MED_PAL.trim, 0, 0.96, 0.41);   // cruz amarela
  }
  if (L.cape) { T(G.cyl(0.31, 0.53, 0.42, 12), L.cape, 0, 1.0, -0.02); T(G.sph(0.05, 6, 4), GOLD, 0, 1.14, 0.33); }
  if (L.hat === 'hood') T(G.cyl(0.3, 0.5, 0.34, 12), L.hatColor, 0, 1.06, 0);                               // capuz com capinha nos ombros
  // braços: manga (ombro), antebraço + mão (cotovelo)
  const sleeve = L.mail ? MED_PAL.metal : L.sleeve || top, fore = L.rolled ? skin : sleeve;
  for (const [sh, el] of [[shL, elL], [shR, elR]]) {
    P(sh, G.sph(0.13, 8, 6), L.cape && !L.mail ? L.cape : top, 0, 0, 0);
    P(sh, G.cyl(0.1, 0.095, 0.29, 8), sleeve, 0, -0.135, 0);
    if (L.rolled) P(el, G.cyl(0.108, 0.108, 0.06, 8), sleeve, 0, -0.01, 0);
    P(el, G.cyl(0.092, 0.084, 0.2, 8), fore, 0, -0.1, 0);
    P(el, G.sph(0.1, 8, 6), skin, 0, -LA, 0);
  }
  // cabeça
  const H = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(head, geo, color, x, y, z, rx, ry, rz, sx, sy, sz);
  H(G.sph(0.4, 10, 8), skin, 0, HY, 0);
  const hs = L.hairStyle;
  if (hs !== 'bald') H(G.sph(0.43, 10, 7), hair, 0, HY + 0.12, -0.06, 0, 0, 0, 1, 0.72, 1);
  if (hs === 'bald') { H(G.box(0.74, 0.2, 0.22), hair, 0, HY - 0.06, -0.27); for (const sd of [-1, 1]) H(G.box(0.1, 0.22, 0.24), hair, sd * 0.37, HY, -0.08); }
  else if (hs === 'long') { H(G.box(0.74, 0.66, 0.24), hair, 0, HY - 0.12, -0.25); for (const sd of [-1, 1]) H(G.box(0.12, 0.46, 0.22), hair, sd * 0.37, HY - 0.08, -0.04); }
  else H(G.box(0.72, 0.4, 0.22), hair, 0, HY - 0.02, -0.26);
  if (hs === 'bun') H(G.sph(0.16, 8, 6), hair, 0, HY + 0.24, -0.38);
  if (hs === 'braid') { H(G.cyl(0.075, 0.05, 0.5, 6), hair, 0, HY - 0.36, -0.38, 0.25, 0, 0); H(G.sph(0.06, 6, 4), '#c8402f', 0, HY - 0.6, -0.44); }
  for (const s of [-1, 1]) { H(G.sph(0.065, 6, 4), EYES, s * 0.15, HY + 0.05, 0.36); H(G.sph(0.065, 6, 4), CHEEK, s * 0.25, HY - 0.08, 0.31); }
  H(G.sph(0.06, 6, 4), skin, 0, HY - 0.04, 0.4);
  H(G.box(0.15, 0.04, 0.05), EYES, 0, HY - 0.18, 0.36);
  if (L.age === 'old' || L.role === 'smith') for (const s of [-1, 1]) H(G.box(0.16, 0.045, 0.05), L.age === 'old' ? hair : shade(hair, 0.8), s * 0.15, HY + 0.16, 0.355, 0, 0, s * 0.18);
  if (L.beard) { H(G.sph(0.24, 8, 6), L.beard, 0, HY - 0.23, 0.2, 0, 0, 0, 1.25, 0.85, 0.75); H(G.box(0.26, 0.06, 0.07), L.beard, 0, HY - 0.11, 0.38); }
  const hc = L.hatColor;
  switch (L.hat) {
    case 'coif': H(G.hemi(0.445, 10, 4), hc, 0, HY + 0.03, -0.03, 0, 0, 0, 1.02, 1.0, 1.05); H(G.box(0.8, 0.46, 0.22), hc, 0, HY - 0.08, -0.25); break;
    case 'kerchief': H(G.hemi(0.45, 10, 4), hc, 0, HY + 0.07, -0.04); H(G.sph(0.1, 6, 4), hc, 0, HY + 0.02, -0.45); H(G.box(0.08, 0.2, 0.04), hc, 0.05, HY - 0.1, -0.47, 0.2, 0, 0.3); break;
    case 'hood': H(G.hood(0.5), hc, 0, HY - 0.02, -0.04, 0, 0, 0, 1.02, 1.08, 1.06); H(G.box(0.84, 0.5, 0.3), hc, 0, HY - 0.24, -0.28); H(G.cone(0.09, 0.55, 6), hc, 0, HY - 0.35, -0.52, -2.75, 0, 0); break;
    case 'felt': H(G.cyl(0.58, 0.58, 0.04, 14), hc, 0, HY + 0.36, -0.03); H(G.cyl(0.32, 0.37, 0.3, 12), hc, 0, HY + 0.5, -0.03); H(G.cyl(0.375, 0.375, 0.06, 12), shade(hc, 0.6), 0, HY + 0.41, -0.03);
      if (L.k % 2) H(G.box(0.04, 0.34, 0.1), '#f1ece0', 0.3, HY + 0.58, -0.1, 0, 0, -0.5); break;
    case 'straw': H(G.cyl(0.66, 0.66, 0.04, 14), hc, 0, HY + 0.37, -0.03); H(G.cyl(0.36, 0.4, 0.24, 12), hc, 0, HY + 0.49, -0.03); H(G.cyl(0.405, 0.405, 0.06, 12), '#6b4428', 0, HY + 0.41, -0.03); break;
    case 'cap': H(G.hemi(0.45, 10, 4), hc, 0, HY + 0.1, -0.03, 0, 0, 0, 1, 0.8, 1); H(G.cyl(0.03, 0.04, 0.12, 5), shade(hc, 0.7), 0, HY + 0.5, -0.03); break;
    case 'beret': H(G.cyl(0.47, 0.44, 0.12, 12), hc, 0.03, HY + 0.38, -0.04, 0, 0, 0.14); break;
    case 'baker': H(G.cyl(0.42, 0.4, 0.3, 12), hc, 0, HY + 0.42, -0.02); H(G.sph(0.46, 10, 6), hc, 0, HY + 0.58, -0.02, 0, 0, 0, 1, 0.42, 1); break;
    case 'helmet': H(G.hemi(0.47, 10, 4), hc, 0, HY + 0.1, -0.02); H(G.cyl(0.66, 0.68, 0.05, 14), shade(hc, 0.85), 0, HY + 0.11, -0.02); H(G.sph(0.06, 6, 4), shade(hc, 0.8), 0, HY + 0.57, -0.02); break;
    default: break;
  }
  P(mouth, G.box(0.14, 0.1, 0.05), MOUTH, 0, 0, 0);
  // pose de ligação: as juntas na posição de repouso, sem rotação
  const tmp = new THREE.Group(); tmp.add(body); tmp.updateMatrixWorld(true);
  const geom = bake(parts, bones.map(b => b.matrixWorld.clone()));
  tmp.remove(body);
  const mesh = new THREE.SkinnedMesh(geom, PEOPLE_MAT);
  mesh.add(body); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  const root = new THREE.Group(); root.name = 'med:' + (L.role || 'person');
  root.add(mesh);
  const child = L.age === 'child';
  if (child) { root.scale.setScalar(0.66); head.scale.setScalar(1.14); }
  const handL = new THREE.Object3D(), handR = new THREE.Object3D();
  handL.position.set(0, -LA, 0); handR.position.set(0, -LA, 0); elL.add(handL); elR.add(handR);
  const person = {
    root, mesh, look: L, child, k: L.k || 0, stoop: L.age === 'old' ? 0.14 : 0, speed: child ? 1.6 : L.age === 'old' ? 0.8 : 1.15,
    b: { body, hipL, kneeL, hipR, kneeR, waist, head, mouth, shL, elL, shR, elR }, hand: { L: handL, R: handR },
    items: {}, held: [],
    /** Pega um objeto (cria uma vez por pessoa): where = 'R' | 'L' (na mão, em pé) ou 'body' (posto pela atividade). */
    give(name, where = 'R', o = {}) {
      let it = this.items[name];
      if (!it) { it = this.items[name] = buildItem(name, { k: this.k, ...o }); }
      if (it.userData.setFull && o.full != null) it.userData.setFull(o.full);
      (where === 'body' ? body : where === 'L' ? handL : handR).add(it);
      it.userData.where = where; it.userData.tilt = 0; it.visible = true;
      if (!this.held.includes(it)) this.held.push(it);
      return it;
    },
    /** Larga um objeto (ou todos). */
    drop(name) {
      for (const it of this.held.slice()) if (!name || it.name === 'item:' + name) { if (it.parent) it.parent.remove(it); this.held.splice(this.held.indexOf(it), 1); }
    },
    has(name) { return this.held.some(it => it.name === 'item:' + name); },
    setShadow(on) { mesh.castShadow = on; for (const it of this.held) it.traverse(o => { if (o.isMesh) o.castShadow = on; }); },
  };
  restPose(person);
  return person;
}

// ---- objetos ----
/** Objetos que as pessoas carregam. userData.grip = ponto de pegar (local); setFull(b) quando tem conteúdo. */
export function buildItem(name, o = {}) {
  const parts = [], P = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ geo, color, m: tm(x, y, z, rx, ry, rz, sx, sy, sz) });
  const grp = new THREE.Group(); grp.name = 'item:' + name;
  const sub = list => { const m = new THREE.Mesh(bake(list), PEOPLE_MAT); m.castShadow = true; m.receiveShadow = true; grp.add(m); return m; };
  let extra = null, extraParts = null;
  const k = o.k || 0, WOOD = '#8a6038', DARK = '#4a4e56';
  grp.userData.grip = new THREE.Vector3();
  switch (name) {
    case 'basket': {                                           // cesto de vime pela alça (alça no ponto de pegar)
      P(G.cyl(0.25, 0.19, 0.24, 10), '#b58a4e', 0, -0.42, 0); P(G.cyl(0.24, 0.24, 0.03, 10), '#94683a', 0, -0.42, 0);
      P(G.torus(0.25, 0.03, 4, 14), '#94683a', 0, -0.3, 0, Math.PI / 2, 0, 0); P(G.torus(0.24, 0.022, 4, 10, Math.PI), '#94683a', 0, -0.3, 0);
      extraParts = []; const E = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => extraParts.push({ geo, color, m: tm(x, y, z, rx, ry, rz, sx, sy, sz) });
      E(G.sph(0.22, 8, 5), '#ece3cc', 0, -0.3, 0, 0, 0, 0, 1, 0.3, 1);
      E(G.sph(0.09, 7, 5), '#c98a3c', -0.07, -0.24, 0.05, 0, 0.4, 0.2, 1.8, 0.8, 1); E(G.sph(0.09, 7, 5), '#b8782e', 0.08, -0.24, -0.06, 0, 1.2, 0, 1.7, 0.8, 1);
      E(G.sph(0.07, 6, 5), '#b8322a', 0.13, -0.25, 0.1); E(G.sph(0.07, 6, 5), '#7aa83a', -0.12, -0.25, -0.1);
      grp.userData.grip.set(0, -0.06, 0); break;
    }
    case 'bucket': {                                           // balde de madeira com aros de ferro
      P(G.cyl(0.19, 0.16, 0.3, 10), WOOD, 0, -0.42, 0); for (const y of [-0.32, -0.52]) P(G.cyl(0.197, 0.197, 0.035, 10), DARK, 0, y, 0);
      P(G.torus(0.19, 0.018, 4, 10, Math.PI), DARK, 0, -0.27, 0);
      extraParts = [{ geo: G.cyl(0.176, 0.176, 0.02, 10), color: '#6aa4c4', m: tm(0, -0.3, 0) }];
      grp.userData.grip.set(0, -0.08, 0); grp.userData.handle = [new THREE.Vector3(-0.07, -0.09, 0), new THREE.Vector3(0.07, -0.09, 0)]; break;
    }
    case 'broom': {                                            // vassoura de palha (origem no pé das cerdas)
      P(G.cyl(0.03, 0.03, 1.4, 6), '#9a7448', 0, 0.95, 0); P(G.cyl(0.08, 0.17, 0.34, 8), '#d8b866', 0, 0.17, 0, 0, 0, 0, 1, 1, 0.45);
      P(G.cyl(0.085, 0.085, 0.05, 8), '#6b4428', 0, 0.33, 0, 0, 0, 0, 1, 1, 0.5);
      grp.userData.grip.set(0, 1.05, 0); break;
    }
    case 'pan': {                                              // pá de lixo (no chão, boca para +Z)
      P(G.box(0.34, 0.02, 0.28), '#5a5048', 0, 0.01, 0.14); P(G.box(0.34, 0.12, 0.02), '#5a5048', 0, 0.06, 0); for (const s of [-1, 1]) P(G.box(0.02, 0.08, 0.26), '#5a5048', s * 0.17, 0.04, 0.13);
      P(G.cyl(0.022, 0.022, 0.38, 6), WOOD, 0, 0.21, -0.02);
      grp.userData.grip.set(0, 0.38, -0.02); break;
    }
    case 'hammer': {                                           // martelo: cabo para +Z a partir da mão, cabeça na ponta
      P(G.cyl(0.028, 0.028, 0.44, 6), WOOD, 0, 0, 0.13, Math.PI / 2, 0, 0); P(G.box(0.1, 0.22, 0.1), DARK, 0, -0.02, 0.34); break;
    }
    case 'tongs': {                                            // tenaz com a peça em brasa na ponta
      for (const sd of [-1, 1]) P(G.box(0.025, 0.025, 0.46), '#3a3c42', sd * 0.02, 0, 0.2, 0, sd * 0.05, 0);
      P(G.box(0.1, 0.03, 0.05), '#ff8a3a', 0, 0, 0.44); P(G.box(0.06, 0.035, 0.03), '#ffd27a', 0, 0.005, 0.44); break;
    }
    case 'crate': {                                            // caixote de ripas
      P(G.box(0.6, 0.42, 0.44), '#b0804e', 0, 0, 0);
      for (const y of [-0.15, 0.15]) for (const z of [-0.225, 0.225]) P(G.box(0.62, 0.08, 0.02), '#8a5e36', 0, y, z);
      for (const x of [-0.31, 0.31]) P(G.box(0.02, 0.44, 0.46), '#8a5e36', x, 0, 0);
      P(G.sph(0.08, 6, 5), '#b8322a', -0.12, 0.23, 0.05); P(G.sph(0.08, 6, 5), '#d9a441', 0.1, 0.23, -0.06);
      grp.userData.grips = [new THREE.Vector3(-0.31, -0.02, 0.02), new THREE.Vector3(0.31, -0.02, 0.02)]; break;
    }
    case 'sack': {                                             // saco de farinha
      P(G.sph(0.3, 9, 7), '#e6d8b4', 0, 0, 0, 0, 0, 0, 1.3, 0.68, 0.82); P(G.cyl(0.06, 0.1, 0.12, 6), '#d8c89e', -0.4, 0.02, 0, 0, 0, Math.PI / 2);
      P(G.box(0.18, 0.12, 0.02), '#c8a86a', 0.05, 0.02, 0.245); break;
    }
    case 'can': {                                              // regador (alça em cima no ponto de pegar; bico para +Z)
      P(G.cyl(0.15, 0.17, 0.26, 10), '#7d8b93', 0, -0.3, 0); P(G.cyl(0.155, 0.155, 0.03, 10), '#5f6b72', 0, -0.18, 0);
      P(G.torus(0.11, 0.02, 4, 10, Math.PI), '#5f6b72', 0, -0.17, -0.02, 0, Math.PI / 2, 0);
      P(G.cyl(0.024, 0.034, 0.44, 6), '#7d8b93', 0, -0.25, 0.27, 0.95, 0, 0); P(G.cyl(0.055, 0.03, 0.06, 7), '#5f6b72', 0, -0.11, 0.44, 0.95, 0, 0);
      extraParts = [{ geo: G.cyl(0.018, 0.012, 0.7, 5), color: '#a8d4ec', m: tm(0, -0.35, 0) }];
      grp.userData.grip.set(0, -0.05, -0.02); break;
    }
    case 'cloth': {                                            // pilha de tecido dobrado
      const C = ['#a8322a', '#2f6fb0', '#d9a441', '#3f7a4a', '#7a4fa0', '#e8dcc0'];
      for (let i = 0; i < 3; i++) P(G.box(0.44, 0.06, 0.32), C[(k + i * 2) % C.length], 0, i * 0.065, 0, 0, (i - 1) * 0.04, 0);
      grp.userData.grips = [new THREE.Vector3(-0.23, 0.04, 0), new THREE.Vector3(0.23, 0.04, 0)]; break;
    }
    case 'sheet': {                                            // tecido aberto (a tecelã dobra; escala x)
      const C = ['#a8322a', '#2f6fb0', '#d9a441', '#3f7a4a', '#7a4fa0'];
      P(G.box(1.0, 0.02, 0.46), C[k % C.length], 0, 0, 0); P(G.box(1.0, 0.025, 0.05), shade(C[k % C.length], 0.7), 0, 0, 0.2); break;
    }
    case 'spear': {                                            // lança do guarda (ponto de pegar na origem; pé quase no chão)
      P(G.cyl(0.032, 0.036, 2.4, 6), '#7a5a3a', 0, 0.33, 0); P(G.cone(0.065, 0.3, 6), '#b8bcc4', 0, 1.68, 0); P(G.cyl(0.042, 0.042, 0.12, 6), DARK, 0, 1.5, 0);
      P(G.box(0.02, 0.2, 0.34), MED_PAL.tabard, 0, 1.3, 0.18); P(G.box(0.022, 0.06, 0.34), MED_PAL.trim, 0, 1.3, 0.18); break;
    }
    case 'mug': {                                              // caneca de madeira com espuma
      P(G.cyl(0.075, 0.068, 0.16, 8), WOOD, 0, 0, 0); P(G.cyl(0.078, 0.078, 0.025, 8), DARK, 0, 0.05, 0); P(G.torus(0.05, 0.016, 4, 8), WOOD, 0.085, 0, 0);
      P(G.cyl(0.072, 0.072, 0.03, 8), '#f2ead8', 0, 0.085, 0); break;
    }
    case 'rag': P(G.box(0.16, 0.035, 0.14), '#e9dfc6', 0, 0, 0, 0.2, 0.3, 0.1); break;
    case 'bread': P(G.sph(0.1, 7, 5), '#c98a3c', 0, 0, 0, 0, 0, 0, 1.8, 0.8, 1); break;
    default: P(G.box(0.2, 0.2, 0.2), '#888888', 0, 0, 0);
  }
  sub(parts);
  if (extraParts) { extra = sub(extraParts); extra.visible = false; }
  if (name === 'basket' || name === 'bucket') grp.userData.setFull = on => { extra.visible = !!on; grp.userData.full = !!on; };
  if (name === 'can') grp.userData.stream = extra;
  return grp;
}

// ---- animação ----
const DOWN = new THREE.Vector3(0, -1, 0);
const _T = new THREE.Vector3(), _U = new THREE.Vector3(), _W = new THREE.Vector3(), _E = new THREE.Vector3(), _F = new THREE.Vector3();
const _Mi = new THREE.Matrix4(), _qi = new THREE.Quaternion(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
const sin = Math.sin, cos = Math.cos, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

/** Pose de repouso (só rotações; as posições das juntas não mudam). */
export function restPose(P) {
  const b = P.b;
  b.body.position.set(0, 0, 0); b.body.rotation.set(0, 0, 0);
  b.hipL.rotation.set(0, 0, 0); b.hipR.rotation.set(0, 0, 0); b.kneeL.rotation.set(0, 0, 0); b.kneeR.rotation.set(0, 0, 0);
  b.kneeL.scale.y = b.kneeR.scale.y = 1;
  b.waist.rotation.set(P.stoop, 0, 0);
  b.head.rotation.set(-0.2 - P.stoop * 0.9, 0, 0);
  b.shL.rotation.set(0.02, 0, -0.1); b.shR.rotation.set(0.02, 0, 0.1);
  b.elL.rotation.set(-0.15, 0, 0); b.elR.rotation.set(-0.15, 0, 0);
  b.mouth.scale.setScalar(0.001);
}

/** IK de 2 ossos: leva a mão `side` (−1 esquerda, 1 direita) até (x, y, z) no espaço do corpo. pole: para onde o cotovelo aponta. */
export function reach(P, side, x, y, z, px = side * 0.45, py = -0.6, pz = -0.5) {
  const b = P.b, sh = side < 0 ? b.shL : b.shR, el = side < 0 ? b.elL : b.elR;
  b.waist.updateMatrix(); _Mi.copy(b.waist.matrix).invert();
  _T.set(x, y, z).applyMatrix4(_Mi).sub(sh.position);
  let d = _T.length(); if (d < 1e-4) return;
  _U.copy(_T).divideScalar(d); d = clamp(d, Math.abs(UA - LA) + 0.02, UA + LA - 0.002);
  const a = (UA * UA - LA * LA + d * d) / (2 * d), h = Math.sqrt(Math.max(0, UA * UA - a * a));
  _W.set(px, py, pz); _W.addScaledVector(_U, -_W.dot(_U)); if (_W.lengthSq() < 1e-6) _W.set(0, -1, 0); _W.normalize();
  _E.copy(_U).multiplyScalar(a).addScaledVector(_W, h);
  sh.quaternion.setFromUnitVectors(DOWN, _F.copy(_E).divideScalar(UA));
  _F.copy(_U).multiplyScalar(d).sub(_E).divideScalar(LA);
  _qi.copy(sh.quaternion).invert(); _F.applyQuaternion(_qi);
  el.quaternion.setFromUnitVectors(DOWN, _F.normalize());
}
/** Puxa o ponto (espaço do corpo) para dentro do alcance da mão `side`, com a cintura inclinada `bend`. */
function fit(side, p, bend) {
  const sx = side * 0.4, sy = 0.6 + 0.52 * cos(bend), sz = 0.52 * sin(bend), dx = p[0] - sx, dy = p[1] - sy, dz = p[2] - sz, d = Math.hypot(dx, dy, dz);
  if (d <= 0.49) return p;
  const k = 0.49 / d; return [sx + dx * k, sy + dy * k, sz + dz * k];
}
/** Recua (em z) um objeto seguro pelas duas mãos (pegas em ±half) até as duas alcançarem. */
function fitZ(y, z, half, bend) {
  const sy = 0.6 + 0.52 * cos(bend), sz = 0.52 * sin(bend), dx = Math.abs(half - 0.4), dy = y - sy, r = 0.49 * 0.49 - dx * dx - dy * dy;
  return r <= 0 ? sz : Math.min(z, sz + Math.sqrt(r));
}
/** Objeto preso à mão: fica com a orientação pedida no espaço do corpo (em pé = identidade) e o ponto de pegar na mão. */
function settleHandItem(P, it) {
  const b = P.b, sh = it.userData.where === 'L' ? b.shL : b.shR, el = it.userData.where === 'L' ? b.elL : b.elR;
  _qa.copy(b.waist.quaternion).multiply(sh.quaternion).multiply(el.quaternion).invert();
  _qb.setFromEuler(_e.set(it.userData.tilt || 0, it.userData.yaw || 0, 0));
  it.quaternion.copy(_qa).multiply(_qb);
  it.position.copy(it.userData.grip).applyQuaternion(it.quaternion).negate();
}

/** Pernas andando/correndo: fase ph (rad), amp 0..1. */
function legsWalk(P, ph, amp, run) {
  const b = P.b, A = (run ? 0.8 : 0.5) * amp, s = sin(ph), c = cos(ph);
  b.hipL.rotation.x = -A * s; b.hipR.rotation.x = A * s;
  b.kneeL.rotation.x = Math.max(0, c) * (run ? 1.3 : 0.75) * amp; b.kneeR.rotation.x = Math.max(0, -c) * (run ? 1.3 : 0.75) * amp;
  b.body.position.y = (run ? 0.07 : 0.035) * amp * (1 - Math.abs(s)) - 0.01 * amp;
  b.body.rotation.z = 0.035 * amp * s; b.body.rotation.y = 0.05 * amp * s;
  if (run) b.waist.rotation.x += 0.18 * amp;
}
function armsSwing(P, ph, amp, run, L = true, R = true) {
  const b = P.b, A = (run ? 0.8 : 0.42) * amp, s = sin(ph);
  if (L) { b.shL.rotation.set(A * s, 0, -0.1); b.elL.rotation.set(run ? -1.3 : -0.2 - 0.15 * Math.max(0, -s) * amp, 0, 0); }
  if (R) { b.shR.rotation.set(-A * s, 0, 0.1); b.elR.rotation.set(run ? -1.3 : -0.2 - 0.15 * Math.max(0, s) * amp, 0, 0); }
}
function legsSit(P, seat) {
  const b = P.b, hipY = seat + 0.1;
  b.body.position.y = hipY - 0.62;
  b.hipL.rotation.x = b.hipR.rotation.x = -1.42; b.kneeL.rotation.x = b.kneeR.rotation.x = 1.42;
  b.kneeL.scale.y = b.kneeR.scale.y = clamp((hipY - 0.3 * cos(1.42)) / 0.32, 1, 1.3);   // canela um pouco mais longa até perto do chão
}

/**
 * Anima a pessoa num quadro. s = { mode: 'idle'|'walk'|'run'|'sit', ph, amp, act, at (s na atividade), work: Vector3 (espaço do
 * corpo), lookYaw, lookPitch, talk, seat, t (relógio), ev: [] (eventos: 'strike', 'swish', 'knock', 'fill') }.
 */
export function animatePerson(P, s) {
  const b = P.b, t = s.t || 0, at = s.at || 0, k = P.k * 1.37;
  restPose(P);
  const run = s.mode === 'run', walking = s.mode === 'walk' || run, amp = walking ? (s.amp ?? 1) : 0;
  if (walking) legsWalk(P, s.ph, amp, run);
  else if (s.mode === 'sit') legsSit(P, s.seat ?? 0.45);
  else { b.body.position.x = 0.015 * sin(t * 0.5 + k); b.body.rotation.z = 0.012 * sin(t * 0.5 + k); }
  b.waist.rotation.x += 0.012 * sin(t * 2.1 + k);                                       // respiração
  let armsBusy = false, head = 0;
  const held = P.held, inR = held.find(it => it.userData.where === 'R'), inL = held.find(it => it.userData.where === 'L'), onBody = held.find(it => it.userData.where === 'body');
  const W = s.work, act = s.act;
  // ---- atividades ----
  if (act === 'talk') {
    const g = P.k % 2 ? -1 : 1, sh = g < 0 ? b.shL : b.shR, el = g < 0 ? b.elL : b.elR;
    if (!(g > 0 ? inR : inL)) { const a = Math.max(0, sin(t * 1.9 + k)); sh.rotation.set(-0.25 - 0.3 * a, g * 0.2, g * (0.22 + 0.1 * sin(t * 2.7))); el.rotation.set(-1.0 - 0.25 * sin(t * 2.3 + k), 0, 0); }
    head += 0.06 * sin(t * 3.8);
  } else if (act === 'listen') {
    if (!inR && !inL && !onBody && s.mode !== 'sit') { reach(P, -1, -0.07, 0.68, 0.36, -0.6, -0.6, 0); reach(P, 1, 0.07, 0.68, 0.36, 0.6, -0.6, 0); armsBusy = true; }
    head += 0.12 * Math.pow(Math.max(0, sin(t * 1.6 + k)), 3);
  } else if (act === 'wave') {
    b.shR.rotation.set(-0.3, 0, 2.45 + 0.3 * sin(t * 9)); b.elR.rotation.set(-0.5, 0, 0); armsBusy = true;
  } else if (act === 'knock') {                                                             // 3 batidas, pausa
    const u = at % 2.2, n = Math.floor(u / 0.3), kn = u < 0.9 ? Math.abs(sin((u % 0.3) / 0.3 * Math.PI)) : 0;
    b.shR.rotation.set(-1.4, 0, 0.12); b.elR.rotation.set(-0.7 - 0.55 * kn, 0, 0); armsBusy = true;
    if (u < 0.9 && s._kn !== n + Math.floor(at / 2.2) * 3 && (u % 0.3) > 0.15) { s._kn = n + Math.floor(at / 2.2) * 3; s.ev && s.ev.push('knock'); }
  } else if (act === 'arrange' && W) {                                                      // mãos arrumando coisas sobre a mesa/balcão
    const bend = 0.22 + 0.06 * sin(t * 0.7 + k);
    const r = fit(1, [W.x + 0.2 + 0.18 * sin(t * 1.3 + k), W.y + 0.06 + 0.07 * Math.max(0, sin(t * 2.6 + k)), W.z - 0.2 + 0.1 * sin(t * 0.9)], bend);
    const l = fit(-1, [W.x - 0.22 + 0.14 * sin(t * 1.1 + 1 + k), W.y + 0.05 + 0.06 * Math.max(0, sin(t * 2.2 + 2)), W.z - 0.22 + 0.08 * cos(t * 1.4)], bend);
    b.waist.rotation.x = bend; b.body.rotation.y = 0.12 * sin(t * 0.6 + k);
    reach(P, 1, ...r, 0.5, -0.8, -0.2); reach(P, -1, ...l, -0.5, -0.8, -0.2); armsBusy = true; head += 0.18;
  } else if (act === 'hammer' && W) {                                                       // martelo sobe devagar e desce rápido na bigorna
    const T = 1.05, u = (at % T) / T, ham = P.items.hammer;
    const up = u < 0.55 ? smooth(0, 0.55, u) : u < 0.62 ? 1 : u < 0.72 ? 1 - smooth(0.62, 0.72, u) : 0.08 * (1 - smooth(0.72, 1, u));
    const bend = 0.3 + 0.06 * (1 - up), hit = fit(1, [W.x + 0.06, W.y + 0.24, W.z - 0.32], bend), top = [0.22, 1.5, 0.12];
    const hr = [hit[0] + (top[0] - hit[0]) * up, hit[1] + (top[1] - hit[1]) * up, hit[2] + (top[2] - hit[2]) * up];
    const lh = fit(-1, [W.x - 0.18, W.y + 0.12, W.z - 0.3], bend), tg = P.items.tongs;
    b.waist.rotation.x = bend;
    reach(P, 1, ...hr, 0.7, -0.3, -0.5); reach(P, -1, ...lh, -0.5, -0.8, -0.2); armsBusy = true; head += 0.22;
    if (ham) ham.userData.tilt = 0.35 - 1.9 * up;
    if (tg) { tg.userData.tilt = clamp(Math.atan2(lh[1] - W.y - 0.05, Math.max(0.1, W.z - lh[2])), -0.2, 1.2); tg.userData.yaw = 0.25; }
    const cyc = Math.floor(at / T);
    if (u >= 0.72 && s._hit !== cyc) { s._hit = cyc; s.ev && s.ev.push('strike'); }
  } else if (act === 'inspect' && W) {                                                      // segura a peça e olha
    b.waist.rotation.x = 0.1; reach(P, -1, -0.14, 1.0, 0.4, -0.5, -0.8, -0.2); b.shR.rotation.set(-0.3, 0, 0.15); b.elR.rotation.set(-0.6, 0, 0);
    if (P.items.hammer) P.items.hammer.userData.tilt = 1.2;
    if (P.items.tongs) { P.items.tongs.userData.tilt = -0.5; P.items.tongs.userData.yaw = 0.5; }
    armsBusy = true; head += 0.12 + 0.05 * sin(t * 1.3); b.head.rotation.y = -0.3 + 0.15 * sin(t * 0.8);
  } else if (act === 'sweep' && onBody) {                                                   // vassoura nas duas mãos, cerdas varrendo o chão
    const w = 2.2, sw = sin(at * w), bx = 0.38 * sw, bz = 0.66 + 0.06 * cos(2 * at * w);
    const B0 = _T.set(bx, 0.02, bz), Tp = _W.set(0.04 + 0.08 * sw, 1.16, 0.16);
    onBody.position.copy(B0); _F.copy(Tp).sub(B0).normalize(); onBody.quaternion.setFromUnitVectors(_U.set(0, 1, 0), _F);
    const len = Tp.distanceTo(B0), gL = B0.clone().addScaledVector(_F, len), gR = B0.clone().addScaledVector(_F, len - 0.4);
    b.waist.rotation.x = 0.2; b.body.rotation.y = 0.14 * sw;
    reach(P, -1, gL.x, gL.y, gL.z, -0.6, -0.4, -0.3); reach(P, 1, gR.x, gR.y, gR.z, 0.6, -0.6, -0.3); armsBusy = true; head += 0.18;
    const dir = cos(at * w) > 0 ? 1 : -1; if (s._sw !== dir) { s._sw = dir; s.ev && s.ev.push('swish'); }
  } else if (act === 'gather') {                                                            // abaixa com a pá e junta a sujeira
    const pan = P.items.pan, broom = P.items.broom;
    b.waist.rotation.x = 0.75; b.hipL.rotation.x = b.hipR.rotation.x = -0.45; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.85; b.body.position.y = -0.1;
    if (pan) { pan.position.set(-0.12, 0.1, 0.62); pan.rotation.set(0, 0.25, 0); const g = _E.copy(pan.userData.grip).applyEuler(pan.rotation).add(pan.position); reach(P, -1, g.x, g.y, g.z, -0.5, 0.2, -0.6); }
    if (broom) {
      const bx = 0.16 + 0.1 * sin(at * 6), B0 = _T.set(bx, 0.1, 0.9), Tp = _W.set(0.22, 0.92, 0.42);
      broom.position.copy(B0); _F.copy(Tp).sub(B0).normalize(); broom.quaternion.setFromUnitVectors(_U.set(0, 1, 0), _F);
      const g = B0.clone().addScaledVector(_F, Tp.distanceTo(B0)); reach(P, 1, g.x, g.y, g.z, 0.6, -0.2, -0.6);
    }
    armsBusy = true; head += 0.2;
    if (Math.floor(at * 6 / Math.PI) !== s._g) { s._g = Math.floor(at * 6 / Math.PI); s.ev && s.ev.push('swish'); }
  } else if (act === 'fill' && onBody) {                                                    // abaixa o balde sob a bica, espera encher e levanta
    const down = smooth(0.1, 0.9, at) * (1 - smooth(3.0, 3.8, at)), bend = 0.15 + 0.45 * down, hd = onBody.userData.handle;
    const by = 0.98 - 0.22 * down, bz = fitZ(by - 0.09, 0.42 + 0.3 * down, 0.07, bend);
    onBody.position.set(0, by, bz); onBody.quaternion.identity();
    const pl = [hd[0].x, by + hd[0].y, bz], pr = [hd[1].x, by + hd[1].y, bz];
    b.waist.rotation.x = bend;
    b.hipL.rotation.x = b.hipR.rotation.x = -0.3 * down; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.55 * down; b.body.position.y = -0.09 * down;
    reach(P, -1, ...pl, -0.6, -0.5, -0.3); reach(P, 1, ...pr, 0.6, -0.5, -0.3); armsBusy = true; head += 0.2;
  } else if (act === 'pour') {                                                              // rega os vasos/floreiras
    b.shR.rotation.set(-1.05 - 0.08 * sin(t * 1.7), 0, 0.12); b.elR.rotation.set(-0.35, 0, 0); armsBusy = true;
    b.shL.rotation.set(0.1, 0, -0.35); b.elL.rotation.set(-1.6, 0, 0);
    if (inR) inR.userData.tilt = 0.75 + 0.1 * sin(t * 1.7);
    head += 0.15;
  } else if (act === 'fold' && W && onBody) {                                               // pega o tecido, abre, sacode, dobra e põe na pilha
    const u = at % 4, lift = smooth(0, 0.8, u) * (1 - smooth(3.0, 3.8, u)), open = smooth(0.4, 1.2, u) * (1 - smooth(2.2, 3.0, u));
    const bend = 0.2 - 0.1 * lift, y = W.y + 0.06 + 0.2 * lift + 0.04 * sin(u * 12) * (u > 1.2 && u < 2.2 ? 1 : 0), half = 0.2 + 0.24 * open;
    const z = fitZ(y + 0.03, W.z - 0.15, half, bend);
    onBody.position.set(W.x, y, z + 0.12); onBody.scale.set(0.45 + 0.55 * open, 1, 1); onBody.rotation.set(0, 0, 0);
    b.waist.rotation.x = bend;
    reach(P, -1, W.x - half, y + 0.03, z, -0.6, -0.6, -0.2); reach(P, 1, W.x + half, y + 0.03, z, 0.6, -0.6, -0.2); armsBusy = true; head += 0.15;
  } else if (act === 'adjust') {                                                            // ajeita os tecidos pendurados (braços para cima)
    const a = sin(t * 1.4 + k);
    b.shL.rotation.set(-2.35 - 0.25 * a, 0, -0.15); b.shR.rotation.set(-2.35 + 0.25 * a, 0, 0.15); b.elL.rotation.set(-0.4, 0, 0); b.elR.rotation.set(-0.4, 0, 0);
    b.waist.rotation.x = -0.06; armsBusy = true; head -= 0.35;
  } else if (act === 'wipe') {                                                              // enxuga a caneca com o pano
    const mx = -0.04, my = 0.86, mz = 0.38;
    reach(P, -1, mx - 0.06, my - 0.02, mz, -0.6, -0.6, -0.1);
    reach(P, 1, mx + 0.08 + 0.05 * cos(t * 6), my + 0.05 + 0.04 * sin(t * 6), mz + 0.05, 0.6, -0.6, -0.1); armsBusy = true; head += 0.3;
  } else if (act === 'put' && W && onBody) {                                                // põe o que carrega sobre a mesa
    const u = smooth(0, 1, at), bend = 0.3 * u, x = W.x * u, y = 0.9 + (W.y + 0.4 - 0.9) * u, z = fitZ(y - 0.06, 0.42 + (W.z - 0.42) * u, 0.07, bend);
    onBody.position.set(x, y, z); onBody.quaternion.identity();
    b.waist.rotation.x = bend;
    reach(P, -1, x - 0.07, y - 0.06, z, -0.6, -0.6, -0.2); reach(P, 1, x + 0.07, y - 0.06, z, 0.6, -0.6, -0.2); armsBusy = true; head += 0.15;
  } else if (act === 'stretch') {
    const u = smooth(0, 0.8, at) * (1 - smooth(2.2, 3, at));
    b.shL.rotation.set(-2.8 * u, 0, -0.1 - 0.3 * u); b.shR.rotation.set(-2.8 * u, 0, 0.1 + 0.3 * u); b.elL.rotation.set(-0.15 - 0.5 * u, 0, 0); b.elR.rotation.set(-0.15 - 0.5 * u, 0, 0);
    armsBusy = true; head -= 0.3 * u;
  }
  // ---- sentado: mãos nos joelhos ----
  if (s.mode === 'sit' && !armsBusy && act !== 'talk') {
    const hipY = 0.78;
    reach(P, -1, -0.17, hipY, 0.24, -0.6, -0.4, -0.4); reach(P, 1, 0.17, hipY, 0.24, 0.6, -0.4, -0.4); armsBusy = true;
  }
  // ---- objetos carregados (andando ou parado) ----
  if (!armsBusy) {
    const crate = onBody && (onBody.name === 'item:crate' || onBody.name === 'item:cloth');
    if (crate) {                                                                               // caixote/tecido nas duas mãos, na frente do peito
      const g = onBody.userData.grips, cy = onBody.name === 'item:crate' ? 0.94 : 0.8, cz = onBody.name === 'item:crate' ? 0.42 : 0.36;
      onBody.position.set(0, cy, cz); onBody.rotation.set(0, 0, 0); onBody.scale.set(1, 1, 1);
      b.waist.rotation.x -= 0.06;
      reach(P, -1, g[0].x, cy + g[0].y, cz + g[0].z, -0.7, -0.6, -0.1); reach(P, 1, g[1].x, cy + g[1].y, cz + g[1].z, 0.7, -0.6, -0.1);
    } else if (onBody && onBody.name === 'item:sack') {                                       // saco no ombro direito
      onBody.position.set(0.24, 1.42, -0.02); onBody.rotation.set(0, 0.25, 0.15);
      reach(P, 1, 0.3, 1.36, 0.2, 0.7, -0.6, 0.2);
      if (walking) armsSwing(P, s.ph, amp, run, true, false); b.waist.rotation.z = -0.05;
    } else {
      armsSwing(P, s.ph || 0, amp, run, !inL, !inR);
      if (!walking) { b.shL.rotation.z -= 0.03 * sin(t * 1.1 + k); b.shR.rotation.z += 0.03 * sin(t * 1.1 + k + 1); }
      for (const [it, sd] of [[inR, 1], [inL, -1]]) {
        if (!it) continue;
        const sh = sd > 0 ? b.shR : b.shL, el = sd > 0 ? b.elR : b.elL, nm = it.name, sw = walking ? sin(s.ph) * amp * sd : 0;
        if (nm === 'item:spear') { sh.rotation.set(-0.32 - 0.1 * sw, 0, sd * 0.22); el.rotation.set(-0.95, 0, 0); }
        else if (nm === 'item:broom') { sh.rotation.set(-0.25 - 0.1 * sw, 0, sd * 0.14); el.rotation.set(-0.55, 0, 0); }
        else if (nm === 'item:mug') { sh.rotation.set(-0.25, 0, sd * 0.12); el.rotation.set(-1.3, 0, 0); }
        else {                                                                                  // balde, cesto, regador: braço quase reto, para fora
          const heavy = it.userData.full && nm === 'item:bucket';
          sh.rotation.set(-0.12 * sw, 0, sd * (heavy ? 0.3 : 0.22)); el.rotation.set(-0.08, 0, 0);
          if (heavy) b.body.rotation.z -= sd * 0.06;
        }
      }
    }
  }
  // ---- cabeça: olhar, falar ----
  b.head.rotation.x += head + (s.lookPitch || 0);
  b.head.rotation.y += clamp(s.lookYaw || 0, -1.25, 1.25);
  if (s.talk) { const o = Math.abs(sin(t * 11 + k)) * (0.55 + 0.45 * sin(t * 1.9 + k)); b.mouth.scale.set(1, Math.max(0.05, o), 1); }
  // ---- objetos nas mãos: em pé (ou inclinados), com o ponto de pegar na mão ----
  for (const it of held) if (it.userData.where !== 'body') settleHandItem(P, it);
  const can = P.items.can; if (can && can.userData.stream) {
    const st = can.userData.stream, on = act === 'pour' && can.parent;
    st.visible = !!on; if (on) { st.rotation.x = -can.userData.tilt; st.position.set(0, -0.11, 0.46); }        // fio d'água sempre para baixo
  }
}
