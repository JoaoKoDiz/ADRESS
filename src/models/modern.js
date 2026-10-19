// Nível 18 (Modernista): casas geométricas (volumes retangulares deslocados, laje plana, marquise, vidro azulado, garagem
// integrada) e lojas de arquitetura parecida; cenário fixo (calçadas contínuas, rotatórias com ilha, balões, postes simples).
// Lote centrado na origem, frente em +z (z = 8,6), como as casas do Jardins.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, textTexture, bakeStatic, vcMerge } from './kit.js';
import { MDH_COL } from '../data.js';
import { MODERN } from '../modernPlan.js';
import { autumnTree } from './forest.js';
import { FORESTV, SOLIDS } from '../layout.js';
import { createCrowd, crowdStep } from './medievalPeople.js';

const LAWN = '#7fc45c', PAVE = '#d9d6cf', GLASS = '#8cc2e8', ROOFC = '#ecebe6', DARK = '#3a3d44', WOOD = '#b07a44', CONC = '#c9c6bd';
const glassMat = () => mat(GLASS, { roughness: 0.2, metalness: 0.15, emissive: '#2a4a6a', emissiveIntensity: 0.18 });

export function buildModernLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const G = 0.12, fac = MDH_COL.fac[h.fac];
  P(box(17.0, 0.12, 17.1, LAWN), 0, 0.06, -0.05);
  for (const [x, z, w, d] of [[0, 8.45, 17.2, 0.3], [-8.45, 0, 0.3, 17.2], [8.45, 0, 0.3, 17.2]]) P(box(w, 0.16, d, '#e2e0da'), x, 0.08, z);   // meio-fio do jardim aberto
  const vol = (x0, x1, z0, z1, y0, y1, c = fac, roof = true) => {
    P(box(x1 - x0, y1 - y0, z1 - z0, c), (x0 + x1) / 2, G + (y0 + y1) / 2, (z0 + z1) / 2);
    if (roof) {
      P(box(x1 - x0 + 0.5, 0.24, z1 - z0 + 0.5, ROOFC), (x0 + x1) / 2, G + y1 + 0.12, (z0 + z1) / 2);
      P(box(x1 - x0 + 0.54, 0.07, z1 - z0 + 0.54, DARK), (x0 + x1) / 2, G + y1 + 0.015, (z0 + z1) / 2);   // friso escuro sob a laje (a linha fina da arquitetura modernista)
    }
  };
  const win = (x0, x1, y0, y1, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), glassMat()); m.position.set((x0 + x1) / 2, G + (y0 + y1) / 2, z); g.add(m);
    P(box(x1 - x0 + 0.16, 0.1, 0.14, DARK), (x0 + x1) / 2, G + y0 - 0.02, z);
    P(box(x1 - x0 + 0.1, 0.07, 0.12, DARK), (x0 + x1) / 2, G + y1 + 0.02, z);                       // verga
    const n = Math.max(1, Math.round((x1 - x0) / 1.35));                                              // caixilhos verticais
    for (let k = 0; k <= n; k++) P(box(0.07, y1 - y0, 0.12, DARK), x0 + (x1 - x0) * k / n, G + (y0 + y1) / 2, z);
    if (y1 - y0 > 1.6) P(box(x1 - x0, 0.05, 0.11, DARK), (x0 + x1) / 2, G + y0 + (y1 - y0) * 0.62, z); };   // travessa
  if (h.kind === 'mds') return bakeStatic(buildModernShop(g, P, h, fac, win, G));   // (assado: o bairro funde todos os lotes por material)
  const two = h.floors === 2, H = 3.0;
  let fz;
  // volumes (formas diferentes: L com garagem, andar de cima em balanço, barra comprida com bloco alto atrás, dois blocos desencontrados)
  if (h.shape === 0) { fz = 0.5; vol(-7.4, 3.1, -7.5, fz, 0, two ? 2 * H : H); win(-6.6, -2.3, 0.5, 2.6, fz + 0.04); if (two) win(-6.6, 2.4, 3.6, 5.4, fz + 0.04); }
  else if (h.shape === 1) {
    fz = 0.5; vol(-7.0, 3.1, -7.0, fz, 0, H, fac, !two); win(-6.4, -2.3, 0.5, 2.6, fz + 0.04);
    if (two) { vol(-6.0, 3.6, -6.5, 2.2, H, 2 * H, h.fac === 'white' ? '#d9dadc' : '#f4f3ef'); win(-5.4, 3.0, 3.6, 5.5, 2.24); }   // andar de cima em balanço
    else vol(-8.0, 3.6, -7.6, 1.6, H, H + 0.01, ROOFC);                                           // laje que avança (marquise grande)
  } else if (h.shape === 2) {
    fz = 0.0; vol(-7.6, 3.1, -6.0, fz, 0, H); win(-7.0, -2.3, 0.5, 2.6, fz + 0.04);
    vol(-6.6, -2.2, -7.6, -1.0, 0, two ? 2 * H : H + 1.4, h.fac === 'gray' ? '#e3d4b8' : '#9aa0a8'); win(-6.0, -2.8, two ? 3.6 : 3.1, two ? 5.4 : 4.0, -0.96);
  } else {
    fz = 1.2; vol(-7.4, 0.6, -7.0, fz, 0, two ? 2 * H : H); win(-6.6, -2.3, 0.5, 2.6, fz + 0.04); if (two) win(-6.6, 0.0, 3.6, 5.4, fz + 0.04);
    vol(0.6, 3.1, -5.6, -0.4, 0, 2.6, h.fac === 'beige' ? '#f4f3ef' : '#e3d4b8'); win(1.0, 2.7, 0.6, 2.2, -0.36);
  }
  // floreira de concreto sob a janela da sala (baixa: não se confunde com os vasos altos da porta) e plantas; as peças de cores
  // novas (terra, flores, luz dos balizadores, caixa de correio) vão numa malha só com cor por vértice (1 desenho no bairro)
  const vc = new THREE.Group(), PV = (m, x, y, z) => vc.add(at(m, x, y, z));
  { const x0 = (h.shape === 2 ? -7.0 : h.shape === 1 ? -6.4 : -6.6) + 0.15, x1 = h.vase ? -2.95 : -2.45, cx = (x0 + x1) / 2;
    P(box(x1 - x0, 0.42, 0.55, CONC), cx, G + 0.21, fz + 0.36);
    PV(box(x1 - x0 - 0.1, 0.05, 0.45, '#5a4632'), cx, G + 0.42, fz + 0.36);
    let k = 0; for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.5, k++) {
      P(sphere(0.22 + (k % 3) * 0.03, k % 2 ? '#3f8a3a' : '#4f9a45', 7, 5), x, G + 0.55, fz + 0.36 + (k % 2 ? 0.06 : -0.06));
      if (k % 2 === 0) PV(box(0.13, 0.13, 0.13, (h.index + k) % 3 ? '#f2d24e' : '#d8455a'), x + 0.12, G + 0.74, fz + 0.48);
    } }
  // porta, marquise e caminho
  const D = -1.0;
  P(box(1.3, 2.35, 0.1, MDH_COL.door[h.doorc]), D, G + 1.18, fz + 0.06); P(box(0.06, 0.6, 0.06, '#d8d8d8'), D + 0.45, G + 1.2, fz + 0.14);
  P(box(2.8, 0.16, 1.7, DARK), D, G + 2.75, fz + 0.85);
  P(box(1.4, 0.05, 8.6 - fz, PAVE), D, 0.15, (fz + 8.6) / 2);
  for (const z of [fz + 2.7, fz + 5.5]) { P(cyl(0.07, 0.08, 0.5, DARK, 8), D - 0.95, G + 0.25, z); PV(cyl(0.085, 0.085, 0.08, '#fff2c8', 8), D - 0.95, G + 0.52, z); }   // balizadores de luz do caminho
  P(box(0.34, 1.05, 0.3, CONC), D + 1.15, G + 0.52, 7.85); P(box(0.24, 0.17, 0.03, DARK), D + 1.15, G + 0.82, 8.01); PV(box(0.22, 0.03, 0.03, '#1c1c1c'), D + 1.15, G + 0.55, 8.01);   // pilarete com número e caixa de correio
  g.add(vcMerge(vc));
  // garagem integrada (à direita) com portão variado + entrada de carro
  if (h.gar) {
    vol(3.3, 7.9, -6.6, -0.2, 0, H, h.fac === 'gray' ? '#9aa0a8' : '#bfc3c8');
    const gc = MDH_COL.gar[h.gar];
    P(box(3.6, 2.4, 0.1, gc), 5.6, G + 1.2, -0.12);
    if (h.gar === 'roll') for (let y = 0.3; y < 2.4; y += 0.3) P(box(3.6, 0.04, 0.03, '#7a8088'), 5.6, G + y, -0.05);
    else if (h.gar === 'wood') for (let x = 4.0; x < 7.3; x += 0.35) P(box(0.05, 2.4, 0.03, '#7a4e26'), x, G + 1.2, -0.05);
    else P(box(3.6, 0.1, 0.03, '#5a5d63'), 5.6, G + 1.2, -0.05);
    P(box(4.4, 0.05, 8.8, '#bdbab2'), 5.6, 0.15, 4.2);
  }
  // detalhes (tags m*)
  if (h.wood) for (let x = 0.15; x <= 1.85; x += 0.24) P(box(0.16, 2.8, 0.08, WOOD), x, G + 1.45, fz + 0.06);
  if (h.vase) for (const s of [-1, 1]) { P(cyl(0.42, 0.32, 0.9, '#5a5d63', 10), D + s * 1.15, G + 0.45, fz + 0.55); P(sphere(0.48, '#3f8a3a', 7, 5), D + s * 1.15, G + 1.15, fz + 0.55); }
  if (h.perg) {
    for (const [x, z] of [[-7.3, fz + 2.8], [-3.6, fz + 2.8]]) P(box(0.16, 2.7, 0.16, WOOD), x, G + 1.35, z);
    for (let x = -7.4; x <= -3.4; x += 0.45) P(box(0.1, 0.12, 3.0, WOOD), x, G + 2.75, fz + 1.4);
    for (const [x, z] of [[-6.6, fz + 0.8], [-5.2, fz + 2.0], [-4.2, fz + 1.0], [-7.2, fz + 2.6]]) P(sphere(0.55, '#4f9a45', 7, 5), x, G + 2.95, z);   // plantas por cima
    P(box(0.25, 2.6, 0.35, '#3f8a3a'), -7.3, G + 1.3, fz + 2.5);
  }
  if (h.stone) {
    P(box(4.6, 0.08, 2.8, '#eeece6'), -5.4, 0.16, 6.6);
    for (const [x, z, r] of [[-6.6, 6.0, 0.4], [-4.8, 7.2, 0.3], [-5.6, 7.4, 0.22], [-4.0, 5.9, 0.26]]) { const m = sphere(r, '#a9a59c', 6, 4); m.scale.y = 0.6; P(m, x, 0.22, z); }
    P(cyl(0.12, 0.12, 0.9, '#3f8a3a', 5), -6.0, 0.6, 6.8); P(sphere(0.35, '#4f9a45', 6, 4), -6.0, 1.1, 6.8);
  }
  if (h.pool) { P(box(2.8, 0.14, 2.4, '#e2e0da'), 1.6, 0.17, 4.0); P(box(2.4, 0.06, 2.0, '#5aa9d6', { roughness: 0.1, metalness: 0.2 }), 1.6, 0.24, 4.0); }
  if (h.bench) { P(box(1.9, 0.12, 0.55, WOOD), 1.6, G + 0.5, 7.2); for (const s of [-0.75, 0.75]) P(box(0.18, 0.45, 0.5, CONC), 1.6 + s, G + 0.22, 7.2); }
  const root = bakeStatic(g);
  root.userData.update = (t, dt) => { const L = LIFE || (LIFE = createModernLife()); if (L) L.lot(root, h, fz, t, dt); };   // vida do condomínio (abaixo)
  return root;
}

function buildModernShop(g, P, h, fac, win, G) {
  const fz = 2.5;
  P(box(13.4, 4.0, 9.0, fac), 0, G + 2.0, fz - 4.5);
  P(box(14.2, 0.3, 10.6, ROOFC), 0, G + 4.15, fz - 4.0);                                // laje + marquise na frente
  win(-6.2, -1.0, 0.2, 3.0, fz + 0.04); win(1.0, 6.2, 0.2, 3.0, fz + 0.04);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.08), glassMat()); door.position.set(0, G + 1.3, fz + 0.05); g.add(door);
  P(box(13.4, 0.7, 0.12, h.accent), 0, G + 3.55, fz + 0.08);
  const tex = textTexture(h.label, { width: 512, height: 128, bg: h.accent, fg: '#ffffff' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(0, G + 4.9, fz + 0.4); g.add(sign);
  P(box(4.6, 1.2, 0.1, h.accent), 0, G + 4.9, fz + 0.33);
  P(box(15.6, 0.05, 5.4, '#bdbab2'), 0, 0.15, 5.8);                                     // estacionamento na frente
  for (const x of [-5.2, -1.8, 1.8, 5.2]) P(box(0.12, 0.02, 4.0, '#f4f4f4'), x, 0.19, 6.0);
  for (const s of [-1, 1]) { P(cyl(0.45, 0.35, 0.8, '#5a5d63', 10), s * 1.6, G + 0.4, fz + 0.6); P(sphere(0.5, '#3f8a3a', 7, 5), s * 1.6, G + 1.1, fz + 0.6); }
  return g;
}

/** Cenário fixo do Modernista. */
export function buildModernScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW, ISLAND } = MODERN, SW = '#d6d3cc', ASPH = '#5d6470';
  for (const s of V.segs) {                                                         // calçada contínua + asfalto + faixa
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    add(box(RW + 3.4, 0.08, len, SW), cx, 0.04, cz, 0, ry, 0);
    add(box(RW, 0.06, len, ASPH), cx, 0.09, cz, 0, ry, 0);
    if (s.type !== 'cul') for (let t = 4; t < len - 4; t += 3.4) add(box(0.22, 0.02, 1.6, '#f2f2f2'), ax + (bx - ax) * t / len, 0.13, az + (bz - az) * t / len, 0, ry, 0);
  }
  for (const [k, [x, z]] of Object.entries(V.N)) {
    if (k === 'n0') continue;                                                       // a rua de entrada termina reta na abertura do muro
    const r = V.nodeR(k);
    add(cyl(r + 1.7, r + 1.7, 0.08, SW, 28), x, 0.04, z); add(cyl(r, r, 0.06, ASPH, 28), x, 0.092, z);
  }
  for (const i of V.islands) {                                                      // ilha da rotatória: meio-fio, grama e escultura geométrica
    add(cyl(i.r, i.r, 0.3, '#e2e0da', 24), i.x, 0.15, i.z); add(cyl(i.r - 0.4, i.r - 0.4, 0.34, LAWN, 24), i.x, 0.17, i.z);
    add(box(0.8, 3.2, 0.8, '#f4f3ef'), i.x - 0.6, 1.9, i.z); add(box(2.4, 0.6, 0.6, '#ec7a26'), i.x + 0.2, 2.6, i.z + 0.4, 0, 0.6, 0); add(box(0.6, 1.6, 0.6, '#2f6fb0'), i.x + 0.9, 1.1, i.z - 0.5);
  }
  for (const t of V.trees) autumnTree(g, t.x, 0, t.z, t.s, t.type, 'green', t.k);
  const led = mat('#ffffff', { emissive: '#fff6dc', emissiveIntensity: 0.6 });
  for (const l of V.lamps) {                                                         // poste simples: haste fina e braço com luminária reta
    add(cyl(0.09, 0.11, 5.2, '#5a5d63', 6), l.x, 2.6, l.z);
    const arm = new THREE.Group(); arm.position.set(l.x, 5.15, l.z); arm.rotation.y = l.ry; g.add(arm);
    arm.add(at(box(1.6, 0.1, 0.14, '#5a5d63'), 0.75, 0, 0)); const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), led); m.position.set(1.2, -0.08, 0); arm.add(m);
  }
  for (const b of V.benches) {
    const bg = new THREE.Group(); bg.position.set(b.x, 0, b.z); bg.rotation.y = b.ry; g.add(bg);
    bg.add(at(box(2.0, 0.12, 0.6, WOOD), 0, 0.5, 0)); for (const d of [-0.8, 0.8]) bg.add(at(box(0.2, 0.45, 0.55, CONC), d, 0.22, 0));
  }
  buildCondoWall(add, V);
  condoOutskirts(g, V, { roofs: 'flat', seed: 1818 });
  return g;
}

/** Arredores dos condomínios (Modernista e Jardins): fileiras de árvores acompanham a estrada de acesso (palmeiras e ipês nos Jardins);
 *  quebra-ventos de eucaliptos ao longo dos muros de fora; condomínios vizinhos (o muro e as casas aparecendo por cima) dos
 *  lados e ao sul. Tudo numa malha só com cor por vértice (1 desenho); colisão nos troncos e nos muros dos vizinhos (somados a
 *  V.solids, marcados `out`: a câmera também desvia). Nada perto das árvores de fora que já existem (troncos em SOLIDS), da
 *  estrada de acesso nem do corredor da cena do monstro. o.roofs: 'flat' (modernista) ou 'gable' (telhado de duas águas). */
export function condoOutskirts(g, V, o = {}) {
  const M = V.MAP, CX = M / 2, gable = o.roofs === 'gable';
  let seed = o.seed || 77; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const G = new THREE.Group(), add = (m, x, y, z, ry = 0) => G.add(at(m, x, y, z, 0, ry, 0)), solids = [];
  const old = SOLIDS.filter(b => (b.x1 < -2 || b.x0 > M + 2 || b.z1 < -2 || b.z0 > M + 2) && b.x1 - b.x0 < 2.5).map(b => ({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, r: (b.x1 - b.x0) / 0.6 }));
  const mine = [], freeOf = (x, z, r) => old.every(t => Math.hypot(t.x - x, t.z - z) > t.r + r) && mine.every(t => Math.hypot(t.x - x, t.z - z) > t.r + r);
  const trunk = (x, z, r) => { mine.push({ x, z, r }); solids.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3, out: true }); };
  const roundTree = (x, z, s, c) => {
    add(cyl(0.2 * s, 0.28 * s, 2.4 * s, '#6b4a2e', 6), x, 1.2 * s, z);
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat(c)); b.scale.set(1.9 * s, 1.6 * s, 1.9 * s); add(b, x, 3.4 * s, z, rnd() * 3);
    const b2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat(c)); b2.scale.setScalar(1.15 * s); add(b2, x + 0.8 * s, 2.9 * s, z + 0.5 * s, rnd() * 3);
  };
  const eucalyptus = (x, z, s) => {
    add(cyl(0.16 * s, 0.26 * s, 8.6 * s, '#d6cfc0', 6), x, 4.3 * s, z);
    add(box(0.05, 2.2 * s, 0.4 * s, '#a89f8c'), x + 0.2 * s, 2.0 * s, z);                                            // casca soltando
    for (const [dy, r, dx] of [[7.2, 1.5, 0.3], [8.8, 1.25, -0.25], [10.1, 0.9, 0.1]]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat(dy > 8 ? '#6f9a80' : '#5f8a70')); b.scale.set(r * s, r * 1.35 * s, r * s); add(b, x + dx * s, dy * s, z, rnd() * 3);
    }
  };
  const palm = (x, z, s) => {
    for (let k = 0; k < 5; k++) add(cyl(0.2 * s, 0.24 * s, 1.3 * s, k % 2 ? '#8a7356' : '#9a8363', 6), x + k * 0.04 * s, (0.65 + k * 1.25) * s, z, 0);
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, l = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.06 * s, 2.6 * s), mat('#4f8a3c')); l.position.set(x + Math.sin(a) * 1.1 * s, 6.4 * s, z + Math.cos(a) * 1.1 * s); l.rotation.set(0.45, a, 0, 'YXZ'); G.add(l); }
  };
  // ---- fileiras de árvores dos dois lados da estrada de acesso (fora do corredor de 20 m da cena do monstro) ----
  for (let z = -12, k = 0; z > -230; z -= 14, k++) for (const sd of [-1, 1]) {
    const x = CX + sd * (22.5 + (rnd() - 0.5) * 1.2), zz = z + (sd > 0 ? 7 : 0);
    if (!freeOf(x, zz, 2.4)) continue;
    if (gable && k % 3 !== 1) palm(x, zz, 0.95 + rnd() * 0.2); else roundTree(x, zz, 0.85 + rnd() * 0.25, gable ? (k % 2 ? '#d86aa0' : '#e8c03a') : (k % 2 ? '#4f8a3c' : '#5f9a45'));
    trunk(x, zz, 2.2);
  }
  // ---- quebra-vento de eucaliptos ao longo dos muros de fora (oeste, leste e sul) ----
  const rows = [[-18, null, -10, M + 10], [M + 18, null, -10, M + 10], [null, M + 20, -10, M + 10]];
  for (const [X, Z, a, b] of rows) for (let u = a; u <= b; u += 6.5) {
    const x = X ?? u, z = Z ?? u, j = (rnd() - 0.5) * 1.4;
    if (rnd() < 0.12 || !freeOf(x + (X == null ? 0 : j), z + (Z == null ? 0 : j), 1.6)) continue;
    eucalyptus(x + (X == null ? 0 : j), z + (Z == null ? 0 : j), 0.85 + rnd() * 0.35); trunk(x + (X == null ? 0 : j), z + (Z == null ? 0 : j), 1.6);
  }
  // ---- condomínios vizinhos: muro (com pilares) e as casas aparecendo por cima ----
  const WALLC = gable ? '#efe6d6' : '#e9e6df', PIL = gable ? '#d8cbb4' : '#d2cec5', CAP = gable ? '#a8553a' : '#6f737a';
  const FAC = gable ? ['#f2e6cf', '#e8d2b0', '#dfe6d6', '#f4f1ea', '#e6c8b8'] : ['#ece9e2', '#d9d4c8', '#c9ccd1', '#e3d4b8', '#f4f3ef'];
  const ROOF = ['#b8553a', '#8a8f98', '#5a7a5a', '#a86a3a', '#6a5a7a'];
  const neighbors = [
    { x0: -200, x1: -48, z0: -150, z1: 110 }, { x0: M + 48, x1: M + 200, z0: -80, z1: 170 }, { x0: -20, x1: M + 30, z0: M + 52, z1: M + 170 },
  ];
  for (const N of neighbors) {
    const H = 2.4;
    for (const [x0, z0, x1, z1] of [[N.x0, N.z0, N.x1, N.z0 + 0.5], [N.x0, N.z1 - 0.5, N.x1, N.z1], [N.x0, N.z0, N.x0 + 0.5, N.z1], [N.x1 - 0.5, N.z0, N.x1, N.z1]]) {
      const w = x1 - x0, d = z1 - z0;
      add(box(w, H, d, WALLC), (x0 + x1) / 2, H / 2, (z0 + z1) / 2); add(box(w + 0.16, 0.12, d + 0.16, CAP), (x0 + x1) / 2, H + 0.06, (z0 + z1) / 2);
      const L = Math.max(w, d), n = Math.round(L / 12);
      for (let k = 0; k <= n; k++) { const u = k / n; add(box(w > d ? 0.7 : w + 0.24, H + 0.25, w > d ? d + 0.24 : 0.7, PIL), w > d ? x0 + w * u : (x0 + x1) / 2, (H + 0.25) / 2, w > d ? (z0 + z1) / 2 : z0 + d * u); }
      solids.push({ x0, x1, z0, z1, out: true, top: H + 0.3 });
    }
    for (let x = N.x0 + 13; x < N.x1 - 9; x += 19) for (let z = N.z0 + 12; z < N.z1 - 8; z += 17) {
      if (rnd() < 0.18 || !freeOf(x, z, 6)) continue;
      const w = 7.5 + rnd() * 3, d = 6.5 + rnd() * 2.5, two = rnd() < 0.45, h = two ? 5.8 : 3.0, f = FAC[Math.floor(rnd() * FAC.length)], ry = rnd() < 0.5 ? 0 : Math.PI / 2;
      add(box(w, h, d, f), x, h / 2, z, ry);
      if (gable) {
        const sh = new THREE.Shape([new THREE.Vector2(-(d + 0.9) / 2, 0), new THREE.Vector2((d + 0.9) / 2, 0), new THREE.Vector2(0, 2.1)]);
        const rg = new THREE.ExtrudeGeometry(sh, { depth: w + 0.6, bevelEnabled: false }); rg.translate(0, 0, -(w + 0.6) / 2); rg.rotateY(Math.PI / 2);   // duas águas, cumeeira ao longo da largura
        const r = new THREE.Mesh(rg, mat(ROOF[Math.floor(rnd() * ROOF.length)])); r.rotation.y = ry; r.position.set(x, h, z); G.add(r);
      } else {
        add(box(w + 0.5, 0.24, d + 0.5, '#ecebe6'), x, h + 0.12, z, ry); add(box(w + 0.54, 0.07, d + 0.54, DARK), x, h + 0.015, z, ry);
        if (rnd() < 0.5) add(box(w * 0.55, 2.6, d * 0.6, f), x - w * 0.15, h + 1.3 + 0.24, z, ry);
      }
      if (rnd() < 0.5) { const tx = x + 6 * (rnd() < 0.5 ? -1 : 1), tz = z + 5; if (freeOf(tx, tz, 2)) roundTree(tx, tz, 0.8 + rnd() * 0.3, rnd() < 0.5 ? '#4f8a3c' : '#5f9a45'); }
    }
  }
  const m = vcMerge(G); m.name = 'condo-outskirts'; g.add(m);
  V.solids.push(...solids);                                                // (o plano fica em cache: layout.js soma V.solids às colisões sempre que o bairro volta)
  SOLIDS.push(...solids.map(b => ({ ...b })));                             // (e já nesta 1ª montagem: as colisões do bairro foram feitas antes da cena)
  return m;
}

/** Muro do condomínio (no lugar da sebe): concreto claro com pilares e capa escura; portaria com guarita e placa. */
function buildCondoWall(add, V) {
  const { WALL_H } = MODERN, WALLC = '#e9e6df', PIL = '#d2cec5', CAPC = '#6f737a';
  for (const w of V.walls) {
    const lx = w.x1 - w.x0, lz = w.z1 - w.z0, cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2, alongX = lx > lz, len = alongX ? lx : lz;
    add(box(lx, WALL_H, lz, WALLC), cx, WALL_H / 2, cz);
    add(box(alongX ? lx : lx + 0.2, 0.14, alongX ? lz + 0.2 : lz, CAPC), cx, WALL_H + 0.07, cz);
    // pilares a cada ~12, salientes só para fora (por dentro, a face fica rente à colisão)
    const out = Math.sign((alongX ? cz : cx) - V.MAP / 2) * 0.14, n = Math.max(1, Math.round(len / 12)), a0 = alongX ? w.x0 : w.z0;
    for (let k = 0; k <= n; k++) {
      const u = Math.min(a0 + len - 0.45, Math.max(a0 + 0.45, a0 + len * k / n));
      add(box(alongX ? 0.9 : lx + 0.3, WALL_H + 0.3, alongX ? lz + 0.3 : 0.9, PIL), alongX ? u : cx + out, (WALL_H + 0.3) / 2, alongX ? cz + out : u);
    }
  }
  // portaria: pilares largos dos dois lados da abertura (a cancela sai do pilar oeste), guarita e placa
  const G = V.GATE;
  for (const x of [G.x0 - 0.6, G.x1 + 0.6]) { add(box(1.2, WALL_H + 0.9, 1.2, PIL), x, (WALL_H + 0.9) / 2, V.HEDGE - 0.6); add(box(1.4, 0.16, 1.4, CAPC), x, WALL_H + 0.98, V.HEDGE - 0.7); }
  const B = V.BOOTH, bx = (B.x0 + B.x1) / 2, bz = (B.z0 + B.z1) / 2, bw = B.x1 - B.x0, bd = B.z1 - B.z0;
  add(box(bw, 2.8, bd, '#f4f3ef'), bx, 1.4, bz);
  add(box(bw + 1.4, 0.24, bd + 1.0, CAPC), bx - 0.5, 2.92, bz);                       // laje com beiral (mais larga do lado da rua)
  add(box(0.08, 1.1, bd - 1.2, GLASS, { roughness: 0.2, metalness: 0.15, emissive: '#2a4a6a', emissiveIntensity: 0.18 }), B.x0 - 0.02, 1.75, bz);   // janela para a rua
  add(box(bw - 1.0, 1.1, 0.08, GLASS, { roughness: 0.2, metalness: 0.15, emissive: '#2a4a6a', emissiveIntensity: 0.18 }), bx, 1.75, B.z0 - 0.02);  // janela para a entrada
  add(box(1.0, 2.1, 0.08, '#2b2d33'), bx + 0.8, 1.05, B.z1 + 0.02);                  // porta (fundos)
  add(box(0.5, 0.06, bd - 1.2, CONC), B.x0 - 0.3, 1.18, bz);                          // balcão da janela
  const tex = textTexture('RESIDENCIAL MODERNISTA', { width: 1024, height: 128, bg: '#2b2d33', fg: '#f4f3ef', font: 'bold 70px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.125), new THREE.MeshBasicMaterial({ map: tex }));
  const wz = V.walls[0].z0;                                                           // face de fora do muro norte (quem chega vê)
  add(sign, G.x0 - 7.0, 1.55, wz - 0.03, 0, Math.PI, 0);
}

// ---------- Vida do condomínio ----------
// O porteiro na frente da guarita, o jardineiro do condomínio cortando a grama da entrada em faixas, alguém correndo na
// calçada da rua de entrada (vai e volta, para no fim para olhar o relógio), alguém passeando com o cachorro (que para nos
// postes para cheirar), vizinhos conversando na calçada, um morador regando as plantas da frente de casa e uma criança
// chutando bola no próprio gramado; robôs cortadores de grama em alguns jardins (batem na borda e mudam de rumo) e um
// irrigador oscilante no gramado da portaria. Tudo instanciado/fundido (a multidão inteira: 8 desenhos). Dirigido pelo
// update dos lotes (o primeiro lote chamado no quadro move todo mundo; cada lote cuida do próprio robô).
let LIFE = null;
const rr = (a, b) => a + Math.random() * (b - a);
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const turnTo = (p, ry, dt, rate = 5) => { p.ry += Math.max(-rate * dt, Math.min(rate * dt, wrapA(ry - p.ry))); };
function lotToWorld(root, lx, lz) { const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y); return { x: root.position.x + lx * c + lz * s, z: root.position.z - lx * s + lz * c }; }

function buildMower() {
  const g = new THREE.Group();
  g.add(at(box(0.62, 0.28, 0.72, '#d8452a'), 0, 0.3, 0), at(box(0.66, 0.06, 0.76, '#3a3d44'), 0, 0.18, 0), at(box(0.3, 0.16, 0.3, '#2b2d33'), 0, 0.5, -0.05));
  for (const [x, z] of [[-0.33, 0.28], [0.33, 0.28], [-0.33, -0.28], [0.33, -0.28]]) g.add(at(cyl(0.12, 0.12, 0.08, '#222222', 10), x, 0.12, z, 0, 0, Math.PI / 2));
  g.add(at(box(0.4, 0.3, 0.3, '#3f8a3a'), 0, 0.42, -0.5));                                     // saco da grama
  for (const sx of [-0.24, 0.24]) g.add(at(cyl(0.025, 0.025, 0.8, '#5a5d63', 6), sx, 0.55, -0.635, -0.895, 0, 0));   // cabo: sobe da traseira para trás, até as mãos
  g.add(at(cyl(0.03, 0.03, 0.56, '#2b2d33', 6), 0, 0.8, -0.95, 0, 0, Math.PI / 2));                                       // manopla
  const m = vcMerge(g); m.castShadow = false; return m;
}
function buildRobot() {
  const g = new THREE.Group();
  g.add(at(box(0.56, 0.16, 0.74, '#e9e7e2'), 0, 0.14, 0), at(box(0.5, 0.08, 0.5, '#4f8a54'), 0, 0.25, -0.06), at(box(0.48, 0.07, 0.08, '#2b2d33'), 0, 0.12, 0.38));
  g.add(at(sphere(0.045, '#7fe08a', 6, 4), 0.14, 0.24, 0.3), at(cyl(0.012, 0.012, 0.22, '#5a5d63', 4), -0.16, 0.36, -0.2));
  for (const [x, z] of [[-0.29, -0.22], [0.29, -0.22]]) g.add(at(cyl(0.11, 0.11, 0.06, '#2b2b2b', 10), x, 0.11, z, 0, 0, Math.PI / 2));
  return vcMerge(g).geometry;
}
function buildDogGeo() {
  const g = new THREE.Group(), C = '#c8925a', D = '#8a5a36';
  g.add(at(box(0.3, 0.3, 0.66, C), 0, 0.42, 0), at(box(0.26, 0.26, 0.3, C), 0, 0.62, 0.42), at(box(0.16, 0.14, 0.16, '#e6c9a0'), 0, 0.56, 0.62), at(box(0.06, 0.06, 0.04, '#1c1c1c'), 0, 0.6, 0.71));
  for (const sx of [-1, 1]) g.add(at(box(0.08, 0.16, 0.1, D), sx * 0.13, 0.74, 0.36));
  for (const [x, z] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) g.add(at(box(0.08, 0.3, 0.08, C), x, 0.15, z));
  g.add(at(box(0.06, 0.06, 0.26, D), 0, 0.56, -0.42, 0.7, 0, 0), at(box(0.32, 0.06, 0.06, '#d8312a'), 0, 0.66, 0.3));
  return vcMerge(g).geometry;
}

function createModernLife() {
  const V = FORESTV; if (!V || !V.modern) return null;
  const root = new THREE.Group(); root.name = 'modern-life';
  const crowd = createCrowd(8, { name: 'modern-crowd' }); root.add(crowd.object);
  const P = crowd.people, CX = V.MAP / 2, B = V.BOOTH, hw = MODERN.RW / 2;
  // ---- quem é quem ----
  const LOOKS = [
    { shirt: '#2f4a7a', pants: '#2b2f3a', shoes: '#1c1c1c', hat: '#22344f', skin: '#c08560', hair: '#2a2420' },   // 0 porteiro (uniforme e quepe)
    { shirt: '#3f7a4a', pants: '#5a5048', shoes: '#3a2a20', hat: '#e3c77a', skin: '#d9a074', hair: '#3b2a1a' },   // 1 jardineiro do condomínio
    { shirt: '#e8402a', pants: '#2b2f3a', shoes: '#f4f4f4', hat: '#f4f4f4', skin: '#f0c49a', hair: '#6b3e26' },   // 2 corredora
    { shirt: '#d9c27a', pants: '#4a5a6e', shoes: '#5a3b22', skin: '#a8714c', hair: '#222222' },                    // 3 passeio com o cachorro
    { shirt: '#8a6a9a', pants: '#3d4a66', shoes: '#2b2522', skin: '#f5d2b0', hair: '#d8d4cc', long: true },        // 4 moradora regando as plantas
    { shirt: '#2f9ad0', pants: '#3a3d44', shoes: '#f4f4f4', skin: '#e8b48a', hair: '#a0522d' },                    // 5 criança com a bola
    { shirt: '#f2efe6', pants: '#6a5a4a', shoes: '#3a2a20', skin: '#d9a074', hair: '#5a3a22', long: true },        // 6 vizinha
    { shirt: '#5f7a52', pants: '#2b2f3a', shoes: '#2b2522', skin: '#8a5a3c', hair: '#d8d4cc' },                    // 7 vizinho
  ];
  LOOKS.forEach((o, i) => crowd.look(i, o));
  // ---- objetos ----
  const mower = buildMower(); root.add(mower);
  const can = new THREE.Group(); can.matrixAutoUpdate = false;
  can.add(vcMerge(new THREE.Group().add(at(cyl(0.16, 0.18, 0.3, '#3f8a9a', 10), 0, 0, 0), at(cyl(0.03, 0.03, 0.42, '#3f8a9a', 6), 0, 0.02, 0.28, 1.1, 0, 0), at(box(0.04, 0.2, 0.2, '#3f8a9a'), 0, 0.2, -0.05))));
  can.userData.grip = new THREE.Matrix4().makeTranslation(0, -0.62, 0.05); root.add(can);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), mat('#f4f4f4')); root.add(ball);
  const dogs = new THREE.InstancedMesh(buildDogGeo(), mat('#ffffff', { vertexColors: true }), 1); dogs.frustumCulled = false; root.add(dogs);
  const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#2b2d33' })); leash.frustumCulled = false; root.add(leash);
  const robots = new THREE.InstancedMesh(buildRobot(), mat('#ffffff', { vertexColors: true }), 8); robots.frustumCulled = false; root.add(robots);
  const NS = 70, NC = 14, sprPos = new Float32Array((NS + NC) * 3).fill(-50);   // gotas do irrigador + o fio d'água do regador
  const sprGeo = new THREE.BufferGeometry(); sprGeo.setAttribute('position', new THREE.BufferAttribute(sprPos, 3));
  const spray = new THREE.Points(sprGeo, new THREE.PointsMaterial({ color: '#d8efff', size: 0.13, transparent: true, opacity: 0.75, depthWrite: false })); spray.frustumCulled = false; root.add(spray);
  const SPR = { x: CX + 12.5, z: 22 };                                 // (faixa sem árvores da portaria)
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V3 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
  // ---- lugares fixos ----
  const guard = { x: B.x0 - 0.75, z: (B.z0 + B.z1) / 2 + 1.4 };
  const MOW = { x0: CX - 13.4, x1: CX - 8.6, z0: 4.6, z1: 29 };
  const JOG = { x: CX + hw + 0.55, z0: 11, z1: 42 };
  for (const l of V.lamps) if (Math.abs(l.x - JOG.x) < 1.1 && l.z > JOG.z0 && l.z < JOG.z1 + 1.2) JOG.z1 = Math.min(JOG.z1, l.z - 1.3);   // (vira antes do poste da calçada)
  const seg = V.segs.find(s => s.na === 'c1' && s.nb === 'r4') || V.segs[6];
  const sd = (() => { const [ax, az] = seg.a, [bx, bz] = seg.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, o = hw + 0.55;
    const t0 = V.nodeR(seg.na) + 3, t1 = L - V.nodeR(seg.nb) - 3;
    return { a: { x: ax + ux * t0 + uz * o, z: az + uz * t0 - ux * o }, b: { x: ax + ux * t1 + uz * o, z: az + uz * t1 - ux * o }, ux, uz }; })();
  const dogLamps = V.lamps.filter(l => { const dx = l.x - sd.a.x, dz = l.z - sd.a.z, along = dx * sd.ux + dz * sd.uz, side = Math.abs(dx * sd.uz - dz * sd.ux); return side < 1.5 && along > 1 && along < Math.hypot(sd.b.x - sd.a.x, sd.b.z - sd.a.z) - 1; })
    .map(l => ({ x: l.x, z: l.z }));
  // ---- estado ----
  let T = 0, lastT = -1, attached = false;
  const mowS = { x: MOW.x0, z: MOW.z0, dir: 1, mode: 'mow', w: 0, turnTo: 0 };
  P[1].x = mowS.x; P[1].z = mowS.z; P[1].ry = 0;
  const jog = { dir: 1, z: JOG.z0 + 8, pause: 0 };
  const dw = { u: 0.3, dir: 1, pause: 0, lampDone: new Set() };
  const dog = { x: 0, z: 0, ry: 0, sniff: 0 };
  const lotLife = { water: null, kid: null, chat: null };            // lotes escolhidos nesta partida (por casa)
  const st = { water: { ph: 'out', t: 0, k: 0 }, kid: { bx: 0, bz: 0, vx: 0, vz: 0, t: 0 }, chat: { t: 0 } };
  const robotsOf = new Map();
  for (let i = 0; i < 8; i++) P[i].on = true;
  function stand(p, dt, look) { p.amp = Math.max(0, p.amp - dt * 4); if (look !== undefined) p.yaw += (look - p.yaw) * Math.min(1, dt * 2); }
  function walkTo(p, x, z, v, dt, run = false) {
    const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { stand(p, dt); return true; }
    turnTo(p, Math.atan2(dx, dz), dt, 6);
    const step = Math.min(d, v * dt); p.x += Math.sin(p.ry) * step; p.z += Math.cos(p.ry) * step;
    p.amp += ((run ? 1.35 : 1) - p.amp) * Math.min(1, dt * 6); crowdStep(p, step, run);
    return false;
  }
  function frame(dt) {
    T += dt;
    const t = T;
    // 0 porteiro: olha a rua, de vez em quando acena para quem entra e confere a prancheta
    { const p = P[0]; p.x = guard.x; p.z = guard.z; p.ry = -Math.PI / 2; p.amp = 0;
      const c = t % 23; p.yaw = c < 7 ? Math.sin(t * 0.5) * 0.7 : c < 9 ? -0.9 : c < 15 ? 0.15 : 0.6 * Math.sin(t * 0.3);
      const wave = c > 7.2 && c < 8.8; p.arms[2] = wave ? -2.6 + Math.sin(t * 9) * 0.25 : -0.15; p.arms[3] = wave ? 0.45 : 0.16;
      p.arms[0] = c > 15 && c < 20 ? -0.9 : 0; p.arms[1] = c > 15 && c < 20 ? -0.1 : 0.16; p.pitch = c > 15 && c < 20 ? 0.35 : 0; }
    // 1 jardineiro: corta a grama da entrada em faixas, empurrando o cortador; no fim, passa o braço na testa e recomeça
    { const p = P[1], m = mowS;
      if (m.mode === 'mow') {
        const zt = m.dir > 0 ? MOW.z1 : MOW.z0;
        if (walkTo(p, m.x, zt, 0.75, dt)) { m.mode = 'turn'; m.x += 0.9; m.dir = -m.dir; if (m.x > MOW.x1) { m.mode = 'rest'; m.w = 0; } }
      } else if (m.mode === 'turn') { if (walkTo(p, m.x, p.z + m.dir * 0.4, 0.5, dt)) m.mode = 'mow'; }
      else if (m.mode === 'rest') { m.w += dt; stand(p, dt, 0.4); p.arms[2] = m.w > 1 && m.w < 3 ? -2.3 : -0.3; p.arms[3] = m.w > 1 && m.w < 3 ? 0.9 : 0.1; if (m.w > 6) { m.mode = 'back'; } }
      else if (m.mode === 'back') { if (walkTo(p, MOW.x0, MOW.z0, 0.85, dt)) { m.mode = 'mow'; m.x = MOW.x0; m.dir = 1; } }
      const pushing = m.mode === 'mow' || m.mode === 'turn' || m.mode === 'back';
      if (pushing) { p.arms[0] = p.arms[2] = -0.75; p.arms[1] = p.arms[3] = 0.04; p.lean = 0.12; } else p.lean = 0;
      mower.position.set(p.x + Math.sin(p.ry) * 1.35, 0, p.z + Math.cos(p.ry) * 1.35); mower.rotation.y = p.ry;   // (a manopla fica nas mãos dele)
      mower.position.y = pushing && p.amp > 0.3 ? Math.abs(Math.sin(t * 17)) * 0.012 : 0; }
    // 2 corredora: vai e volta pela calçada da rua de entrada; no fim confere o relógio e alonga
    { const p = P[2];
      if (!p.init) { p.x = JOG.x; p.z = jog.z; p.init = true; }
      if (jog.pause > 0) { jog.pause -= dt; stand(p, dt); const k = jog.pause; p.arms[0] = k > 2.2 ? -1.6 : 0; p.arms[1] = k > 2.2 ? -0.5 : 0.16; p.pitch = k > 2.2 ? 0.45 : 0; p.lean = k < 1.6 && k > 0.4 ? 0.45 : 0; if (jog.pause <= 0) { jog.dir = -jog.dir; p.pitch = 0; p.lean = 0; } }
      else { p.arms[0] = p.arms[2] = -0.35; p.arms[1] = p.arms[3] = 0.22; const z = jog.dir > 0 ? JOG.z1 : JOG.z0; if (walkTo(p, JOG.x, z, 2.6, dt, true)) jog.pause = rr(3.5, 5); } }
    // 3 passeio com o cachorro: vai e volta pela calçada; o cachorro anda na frente e para nos postes para cheirar
    { const p = P[3];
      if (!p.init) { p.x = sd.a.x + (sd.b.x - sd.a.x) * dw.u; p.z = sd.a.z + (sd.b.z - sd.a.z) * dw.u; p.init = true; dog.x = p.x; dog.z = p.z; }
      if (dw.pause > 0) { dw.pause -= dt; stand(p, dt, -0.4); p.arms[2] = -0.5; dog.sniff = 1; }
      else {
        dog.sniff = 0;
        const tgt = dw.dir > 0 ? sd.b : sd.a;
        if (walkTo(p, tgt.x, tgt.z, 0.95, dt)) { dw.dir = -dw.dir; dw.lampDone.clear(); dw.pause = 1.5; }
        p.arms[2] = -0.55;
        for (const l of dogLamps) if (!dw.lampDone.has(l) && Math.hypot(l.x - p.x, l.z - p.z) < 1.9) { dw.lampDone.add(l); if (Math.random() < 0.75) dw.pause = rr(2.5, 4.5); }
      }
      const fx = Math.sin(p.ry), fz = Math.cos(p.ry), gx = p.x + fx * 1.25 + fz * 0.55, gz = p.z + fz * 1.25 - fx * 0.55;   // (do lado da guia: mão esquerda)
      const d = Math.hypot(gx - dog.x, gz - dog.z); if (d > 0.02) { const k = Math.min(1, dt * 3.5); dog.ry += wrapA(Math.atan2(gx - dog.x, gz - dog.z) - dog.ry) * Math.min(1, dt * 5) * (d > 0.15 ? 1 : 0); dog.x += (gx - dog.x) * k; dog.z += (gz - dog.z) * k; }
      const moving = d > 0.12 && !dog.sniff;
      M4.compose(V3.set(dog.x, moving ? Math.abs(Math.sin(t * 11)) * 0.04 : 0, dog.z), Q.setFromEuler(E.set(dog.sniff ? 0.32 : 0, dog.ry + (dog.sniff ? Math.sin(t * 3) * 0.3 : 0), 0)), ONE); dogs.setMatrixAt(0, M4); dogs.instanceMatrix.needsUpdate = true;
      const la = leash.geometry.attributes.position, hx = p.x + fx * 0.25 + fz * 0.5, hz = p.z + fz * 0.25 - fx * 0.5;
      la.setXYZ(0, hx, 0.72, hz); la.setXYZ(1, dog.x + Math.sin(dog.ry) * 0.3, 0.64, dog.z + Math.cos(dog.ry) * 0.3); la.needsUpdate = true; }
    // irrigador oscilante na grama da portaria
    { for (let i = 0; i < NS; i++) {
        const life = 1.15, k = ((t + i * life / NS) % life), born = t - k, a = Math.sin(born * 0.55) * 1.0 + ((i * 7) % 5 - 2) * 0.04, vel = 6.2 + ((i * 13) % 7) * 0.12;
        const dx = Math.sin(a + Math.PI / 2) * vel * 0.55, dz = Math.cos(a + Math.PI / 2) * vel * 0.55, vy = vel * 0.75;
        sprPos[i * 3] = SPR.x + dx * k; sprPos[i * 3 + 1] = 0.35 + vy * k - 4.9 * k * k; sprPos[i * 3 + 2] = SPR.z + dz * k;
        if (sprPos[i * 3 + 1] < 0.05) sprPos[i * 3 + 1] = -5;
      }
      sprGeo.attributes.position.needsUpdate = true; }
  }
  // ---- vida presa aos lotes: robôs; moradora regando, criança com a bola, vizinhos conversando ----
  function lotWork(rootLot, h, fz, dt) {
    const vis = rootLot.visible;
    // robô cortador (casas sem jardim de pedras nem pergolado, 1 em cada 3 ou 4): gramado da esquerda
    if (!h.stone && !h.perg && h.index % 3 === 1) {
      let R = robotsOf.get(h.index);
      if (!R) { R = { i: robotsOf.size % 8, x: rr(-7, -3), z: rr(fz + 2, 7), ry: rr(0, 6.28), turn: 0, wait: 0 }; robotsOf.set(h.index, R); }
      if (!vis) robots.setMatrixAt(R.i, ZERO);
      else {
        const z0 = fz + 1.5 + (h.shape === 1 && h.floors !== 2 ? 1.2 : 0), X0 = -7.6, X1 = -2.5, Z1 = 7.7;
        if (R.wait > 0) R.wait -= dt;
        else if (R.turn !== 0) { const d = wrapA(R.turn - R.ry), s = Math.sign(d) * Math.min(Math.abs(d), 1.4 * dt); R.ry += s; if (Math.abs(d) < 0.02) R.turn = 0; }
        else {
          const nx = R.x + Math.sin(R.ry) * 0.32 * dt, nz = R.z + Math.cos(R.ry) * 0.32 * dt;
          if (nx < X0 || nx > X1 || nz < z0 || nz > Z1) { R.wait = rr(0.3, 0.9); R.turn = Math.atan2((X0 + X1) / 2 - R.x + rr(-2, 2), (z0 + Z1) / 2 - R.z + rr(-2, 2)); }
          else { R.x = nx; R.z = nz; }
        }
        const w = lotToWorld(rootLot, R.x, R.z);
        M4.compose(V3.set(w.x, 0.12, w.z), Q.setFromEuler(E.set(0, R.ry + rootLot.rotation.y, 0)), ONE); robots.setMatrixAt(R.i, M4);
      }
      robots.instanceMatrix.needsUpdate = true;
    }
    if (!vis) { for (const k of ['water', 'kid', 'chat']) if (lotLife[k] && lotLife[k].h === h.index) lotLife[k] = null; return; }
    // escolhe os lotes desta partida (o primeiro lote visível que serve; trocado se ele sumir)
    if (!lotLife.water && h.vase) lotLife.water = { h: h.index, root: rootLot, fz };
    if (!lotLife.kid && !h.pool && !h.bench && !h.stone && h.index % 3 !== 1 && (!lotLife.water || lotLife.water.h !== h.index)) lotLife.kid = { h: h.index, root: rootLot, fz };
    if (!lotLife.chat && h.gar && h.index % 2 === 0 && [lotLife.water, lotLife.kid].every(o => !o || o.h !== h.index)) lotLife.chat = { h: h.index, root: rootLot, fz };
  }
  function lotPeople(dt) {
    const t = T;
    // 4 moradora regando: rega um vaso, o outro, olha o jardim, entra e volta depois
    { const p = P[4], L = lotLife.water, S = st.water;
      if (!L) { p.on = false; can.visible = false; }
      else {
        const D = -1.0, door = lotToWorld(L.root, D, L.fz + 0.45), sp = [lotToWorld(L.root, D - 1.15, L.fz + 1.45), lotToWorld(L.root, D + 1.15, L.fz + 1.45)], ry = L.root.rotation.y + Math.PI;
        S.t += dt;
        if (S.ph === 'out' && !p.on) { p.on = true; p.x = door.x; p.z = door.z; p.ry = ry + Math.PI; S.k = 0; S.ph = 'go'; }
        if (S.ph === 'go') { if (walkTo(p, sp[S.k].x, sp[S.k].z, 0.8, dt)) { S.ph = 'pour'; S.t = 0; } }
        else if (S.ph === 'pour') { turnTo(p, ry, dt); p.arms[2] = -0.95 + Math.sin(t * 0.8) * 0.05; p.pitch = 0.4; if (S.t > rr(4.5, 4.6)) { S.k++; p.pitch = 0; p.arms[2] = -0.25; S.ph = S.k < 2 ? 'go' : 'admire'; S.t = 0; } }
        else if (S.ph === 'admire') { stand(p, dt, Math.sin(t * 0.6) * 0.5); turnTo(p, ry + Math.PI, dt, 2); if (S.t > 4) { S.ph = 'in'; } }
        else if (S.ph === 'in') { if (walkTo(p, door.x, door.z, 0.8, dt)) { p.on = false; S.ph = 'away'; S.t = 0; } }
        else if (S.ph === 'away' && S.t > 25) { S.ph = 'out'; }
        can.visible = p.on;
        const pour = S.ph === 'pour' && S.t > 0.5; can.updateMatrixWorld(); const tip = V3.set(0, 0.1, 0.5).applyMatrix4(can.matrix);
        for (let j = 0; j < NC; j++) { const u = (T * 2.4 + j / NC) % 1, o = (NS + j) * 3; sprPos[o] = pour ? tip.x : 0; sprPos[o + 1] = pour ? tip.y - u * 0.75 : -50; sprPos[o + 2] = pour ? tip.z : 0; }
        p.hold = [null, can];
      }
    }
    // 5 criança: chuta a bola no gramado, corre atrás, às vezes comemora
    { const p = P[5], L = lotLife.kid, S = st.kid; p.scale = 0.72;
      if (!L) { p.on = false; ball.visible = false; }
      else {
        p.on = true; ball.visible = true;
        const X0 = -7.4, X1 = 7.4, Z0 = L.fz + 2.2, Z1 = 7.8;
        if (!S.init || S.h !== L.h) { S.init = true; S.h = L.h; S.bx = -4; S.bz = 5; S.vx = S.vz = 0; const w = lotToWorld(L.root, -5, 6); p.x = w.x; p.z = w.z; }
        S.bx += S.vx * dt; S.bz += S.vz * dt; const fr = Math.pow(0.45, dt); S.vx *= fr; S.vz *= fr;
        if (S.bx < X0 || S.bx > X1) { S.vx = -S.vx * 0.6; S.bx = Math.max(X0, Math.min(X1, S.bx)); }
        if (S.bz < Z0 || S.bz > Z1) { S.vz = -S.vz * 0.6; S.bz = Math.max(Z0, Math.min(Z1, S.bz)); }
        const bw = lotToWorld(L.root, S.bx, S.bz), sp = Math.hypot(S.vx, S.vz);
        ball.position.set(bw.x, 0.32, bw.z); ball.rotation.x += sp * dt / 0.2;
        S.t += dt;
        if (S.cheer > 0) { S.cheer -= dt; stand(p, dt); p.arms[0] = p.arms[2] = -2.7; p.arms[1] = p.arms[3] = 0.3; p.bob = Math.abs(Math.sin(t * 9)) * 0.18; }
        else {
          p.bob = 0; p.arms[0] = p.arms[2] = 0; p.arms[1] = p.arms[3] = 0.16;
          // fica atrás da bola (do lado oposto ao alvo) e chuta
          if (!S.aim || S.kicked) { S.aim = { x: S.bx > 0 ? rr(-6, -2) : rr(2, 6), z: rr(Z0 + 0.5, Z1 - 0.5) }; S.kicked = false; }
          const ax = S.aim.x - S.bx, az = S.aim.z - S.bz, al = Math.hypot(ax, az) || 1;
          const behind = lotToWorld(L.root, S.bx - ax / al * 0.55, S.bz - az / al * 0.55);
          if (sp < 0.4 && walkTo(p, behind.x, behind.z, 2.2, dt, true)) { turnTo(p, Math.atan2(bw.x - p.x, bw.z - p.z), 1, 9); const k = rr(3.2, 4.6); S.vx = ax / al * k; S.vz = az / al * k; S.kicked = true; if (Math.random() < 0.25) S.cheer = 1.6; }
          else if (sp >= 0.4) stand(p, dt, 0);
        }
      }
    }
    // 6 e 7 vizinhos conversando na calçada, entre a casa dele e a do lado
    { const L = lotLife.chat, a = P[6], b = P[7];
      if (!L) { a.on = b.on = false; }
      else {
        a.on = b.on = true;
        const pa = lotToWorld(L.root, 6.9, 9.4), pb = lotToWorld(L.root, 8.6, 10.2);
        a.x = pa.x; a.z = pa.z; b.x = pb.x; b.z = pb.z; a.amp = b.amp = 0;
        a.ry = Math.atan2(pb.x - pa.x, pb.z - pa.z); b.ry = a.ry + Math.PI;
        const c = (t + 3) % 14, aTalk = c < 6, laugh = c > 12.2;
        a.arms[2] = aTalk ? -0.6 + Math.sin(t * 4.1) * 0.35 : -0.1; a.arms[3] = aTalk ? 0.3 + Math.sin(t * 2.3) * 0.15 : 0.16; a.yaw = aTalk ? Math.sin(t * 1.3) * 0.15 : 0; a.pitch = laugh ? -0.25 : 0;
        b.arms[0] = !aTalk && !laugh ? -0.7 + Math.sin(t * 3.7) * 0.4 : 0; b.arms[1] = !aTalk ? 0.35 : 0.16; b.pitch = aTalk ? 0.12 + Math.sin(t * 1.1) * 0.05 : laugh ? -0.3 : 0; b.lean = laugh ? -0.12 : 0;
        a.yaw += c > 9 && c < 11 ? -0.9 : 0; b.yaw = c > 9 && c < 11 ? 0.9 : 0;      // os dois olham a rua por um instante
      }
    }
  }
  root.userData.api = { people: P, lotLife, robots: robotsOf, get t() { return T; } };   // (testes: world.scene.getObjectByName('modern-life'))
  return {
    lot(rootLot, h, fz, t, dt) {
      if (!attached && rootLot.parent) { rootLot.parent.add(root); attached = true; }
      if (t !== lastT) { lastT = t; frame(dt); lotPeople(dt); crowd.update(); }
      lotWork(rootLot, h, fz, dt);
    },
  };
}
