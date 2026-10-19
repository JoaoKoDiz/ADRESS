// Nível 15 (Colheita): propriedade rural (terreno 28 × 26 centrado na origem, porteira para +Z): cerca de madeira,
// porteira colorida que abre (dynamic, userData.gate), caminho de terra até a construção (casa com ou sem varanda,
// celeiro ou galpão), plantação (milharal, horta, pomar ou pasto com vacas) e extras (caixa-d'água, feno, ferramentas).
// Também o cenário fixo (estradas de terra, lavouras, pastos, árvores) e o trator.
import * as THREE from 'three';
import { box, cyl, sphere, cone, at, mat, bakeStatic, dynamic, vcMerge } from './kit.js';
import { buildFigure } from '../grillbyInside.js';
import { gableRoof } from './venice.js';
import { FARM_COL, FARM_ROOF, FARM_GATE } from '../data.js';
import { FARM, FARM_LOCAL as L } from '../farmPlan.js';

const WOOD = '#8a6a44', DIRT = '#b8956a', DIRT2 = '#c9a77c', CORN = '#7fae3a', CORN2 = '#e8c84a', LEAF = '#3f8f3a';
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function fenceLine(add, x0, z0, x1, z1) {                     // postes + 2 travessas
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.4)), ry = Math.atan2(x1 - x0, z1 - z0);
  for (let k = 0; k <= n; k++) add(box(0.22, 1.3, 0.22, WOOD), x0 + (x1 - x0) * k / n, 0.65, z0 + (z1 - z0) * k / n);
  for (const y of [0.55, 1.05]) add(box(0.1, 0.14, len, '#a5835a'), (x0 + x1) / 2, y, (z0 + z1) / 2, 0, ry, 0);
}
/** Vaca (frente +X). Com `anims` (lote), a cabeça e o rabo ficam soltos: ela pasta (baixa a cabeça, mastiga, levanta e
 *  olha em volta) e espanta mosca com o rabo, cada uma no seu tempo; sem `anims` (cenário), fica parada. */
function cow(add, x, z, r, anims, ph = 0) {
  const g = new THREE.Group();
  const a = (m, X, Y, Z) => g.add(at(m, X, Y, Z));
  a(box(1.8, 0.9, 0.9, '#f4f1ea'), 0, 1.15, 0); a(box(0.6, 0.5, 0.92, '#2b2b2b'), -0.3, 1.25, 0); a(box(0.5, 0.4, 0.92, '#2b2b2b'), 0.5, 1.0, 0);
  for (const [lx, lz] of [[-0.65, -0.3], [-0.65, 0.3], [0.65, -0.3], [0.65, 0.3]]) a(box(0.2, 0.7, 0.2, '#f4f1ea'), lx, 0.35, lz);
  a(box(0.3, 0.12, 0.4, '#e8a7a0'), -0.45, 0.68, 0);                                       // úbere
  const head = new THREE.Group(), hg = new THREE.Group(); head.position.set(0.85, 1.4, 0);
  hg.add(at(box(0.55, 0.55, 0.55, '#f4f1ea'), 0.25, 0.05, 0), at(box(0.3, 0.25, 0.5, '#e8a7a0'), 0.55, -0.1, 0));
  for (const s of [-1, 1]) { hg.add(at(box(0.08, 0.18, 0.08, '#e8dcc0'), 0.18, 0.38, s * 0.2)); hg.add(at(box(0.08, 0.14, 0.24, '#2b2b2b'), 0.12, 0.18, s * 0.36)); hg.add(at(box(0.05, 0.08, 0.04, '#1d1d1d'), 0.5, 0.15, s * 0.2)); }
  const tail = new THREE.Group(), tg = new THREE.Group(); tail.position.set(-0.9, 1.5, 0);
  tg.add(at(box(0.08, 0.75, 0.08, '#f4f1ea'), 0, -0.38, 0), at(box(0.14, 0.18, 0.14, '#2b2b2b'), 0, -0.8, 0));
  if (anims) {
    head.add(vcMerge(hg)); tail.add(vcMerge(tg)); g.add(dynamic(head), dynamic(tail));
    let graze = 0, next = 2 + (ph * 7) % 6, down = (ph * 3) % 2 < 1;
    anims.push((t, dt) => {
      if ((next -= dt) <= 0) { down = !down; next = down ? 5 + Math.random() * 7 : 2 + Math.random() * 4; }
      graze += ((down ? 1 : 0) - graze) * Math.min(1, dt * 1.6);
      head.rotation.z = -0.95 * graze + Math.sin(t * 7 + ph) * 0.03 * graze;               // pastando (mastiga)
      head.rotation.y = (1 - graze) * Math.sin(t * 0.4 + ph) * 0.5;                          // de cabeça erguida, olha em volta
      tail.rotation.x = Math.sin(t * 2.3 + ph) * 0.25 + Math.max(0, Math.sin(t * 0.9 + ph * 2) - 0.7) * 1.6 * Math.sin(t * 11);
    });
  } else { for (const c of [...hg.children]) head.add(c); for (const c of [...tg.children]) tail.add(c); g.add(head, tail); }
  add(g, x, 0, z, 0, r, 0);
}
function tree(add, x, z, s = 1, fruit = null) {
  add(cyl(0.18 * s, 0.24 * s, 1.8 * s, '#6b4526', 6), x, 0.9 * s, z);
  add(sphere(1.4 * s, LEAF, 8, 6), x, 2.4 * s, z);
  if (fruit) for (let k = 0; k < 6; k++) { const a = k * 1.05; add(sphere(0.18, fruit, 5, 4), x + Math.cos(a) * 1.1 * s, 2.2 * s + (k % 2) * 0.5, z + Math.sin(a) * 1.1 * s); }
}
/** Lavoura/pasto/pomar num retângulo (x0..x1, z0..z1), em coordenadas do grupo. */
function crop(add, type, x0, x1, z0, z1, anims = null, ph = 0) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (type === 'corn') {
    add(box(w, 0.08, d, '#8a6a3c'), cx, 0.04, cz);
    for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.2) for (let z = z0 + 0.5; z < z1 - 0.3; z += 1.0) {
      add(box(0.18, 2.2, 0.18, CORN), x, 1.1, z); add(box(0.5, 0.12, 0.5, CORN), x, 1.7, z, 0, 0.7, 0);
      if ((x * 7 + z * 3) % 2 < 1) add(box(0.16, 0.4, 0.16, CORN2), x + 0.15, 1.4, z);
    }
  } else if (type === 'garden') {
    add(box(w, 0.06, d, '#7a5a34'), cx, 0.03, cz);
    for (let z = z0 + 1; z < z1 - 0.8; z += 2.2) {
      add(box(w - 1, 0.35, 1.2, '#6b4a2a'), cx, 0.18, z);
      for (let x = x0 + 1; x < x1 - 0.8; x += 0.9) add(sphere(0.32, (Math.round(z) % 3) ? '#4fae4a' : '#2f8a3a', 5, 4), x, 0.55, z);
      if (Math.round(z) % 2) for (let x = x0 + 1.4; x < x1 - 0.8; x += 1.8) add(sphere(0.18, '#e0402a', 5, 4), x, 0.75, z);
    }
  } else if (type === 'orchard') {
    add(box(w, 0.06, d, '#79b85a'), cx, 0.03, cz);
    for (let x = x0 + 2.2; x < x1 - 1; x += 4.2) for (let z = z0 + 2.2; z < z1 - 1; z += 4.2) tree(add, x, z, 0.85, ['#ff8c1a', '#e0402a', '#ffd23f'][Math.floor(Math.abs(x + z)) % 3]);
  } else {                                                          // pasto com vacas e cocho
    add(box(w, 0.06, d, '#a7cf6a'), cx, 0.03, cz);
    fenceLine(add, x0, z0, x1, z0); fenceLine(add, x0, z1, x1, z1); fenceLine(add, x0, z0, x0, z1); fenceLine(add, x1, z0, x1, z1);
    cow(add, x0 + w * 0.3, z0 + d * 0.35, 0.4, anims, ph); cow(add, x0 + w * 0.7, z0 + d * 0.7, 2.2, anims, ph + 2.7);
    add(box(2.0, 0.5, 0.7, '#7a7f86'), x1 - 2, 0.25, z0 + 1.4);
  }
}

/** Propriedade de entrega. */
export function buildFarmLot(h) {
  const root = new THREE.Group(); root.name = 'farm:' + h.name;
  const P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const { PW, PD } = FARM, hw = PW / 2, hd = PD / 2, G = L.gate;
  // chão: terreno, caminho de terra da porteira até a porta e pátio para manobrar
  P(box(PW, 0.05, PD, '#93c463'), 0, 0.025, 0);
  P(box(G.x1 - G.x0 - 0.4, 0.07, hd - 0.4, DIRT2), (G.x0 + G.x1) / 2, 0.04, hd / 2 + 0.6);
  P(box(14, 0.06, 10.6, DIRT2), -6, 0.035, 6.6);
  // cerca (com o vão da porteira) e a porteira
  const F = (x0, z0, x1, z1) => fenceLine((m, x, y, z, rx, ry, rz) => P(m, x, y, z, rx, ry, rz), x0, z0, x1, z1);
  F(-hw, hd, G.x0, hd); F(G.x1, hd, hw, hd); F(-hw, -hd, hw, -hd); F(-hw, -hd, -hw, hd); F(hw, -hd, hw, hd);
  const gc = FARM_GATE[h.gate];
  for (const x of [G.x0, G.x1]) { P(box(0.4, 2.0, 0.4, WOOD), x, 1.0, hd); P(box(0.5, 0.18, 0.5, gc), x, 2.05, hd); }
  const leaf = dynamic(new THREE.Group()); leaf.position.set(G.x0 + 0.2, 0, hd); leaf.name = 'gate'; root.add(leaf);
  const W = G.x1 - G.x0 - 0.45;
  for (const y of [0.45, 0.9, 1.35]) leaf.add(at(box(W, 0.16, 0.12, gc), W / 2, y, 0));
  for (const x of [0.1, W / 2, W - 0.1]) leaf.add(at(box(0.16, 1.2, 0.14, gc), x, 0.9, 0));
  leaf.add(at(box(Math.hypot(W, 0.9), 0.14, 0.1, gc), W / 2, 0.9, 0, 0, 0, Math.atan2(0.9, W)));
  root.userData.gate = leaf;
  // construção
  const bx = L.bld.x, bz = L.bld.z, wall = FARM_COL[h.wall], roof = FARM_ROOF[h.roofc];
  if (h.type === 'house') {
    const w = 9, d = 7, H = 3.2, fz = bz + d / 2 + 0.5;                        // frente em z ≈ -0.5
    P(box(w, H, d, wall), bx, H / 2, bz + 0.5);
    gableRoof(root, { cx: bx, cz: bz + 0.5, y: H, len: w, depth: d, rise: 1.9, over: 0.5, color: roof, wall });
    P(box(1.1, 2.1, 0.14, '#6b4428'), bx, 1.05, fz + 0.07);
    for (const s of [-1, 1]) { P(box(1.3, 1.1, 0.1, '#2e3a46'), bx + s * 2.7, 1.8, fz + 0.06); P(box(1.5, 0.14, 0.14, '#f4f1ea'), bx + s * 2.7, 1.2, fz + 0.1); }
    P(box(w + 0.2, 0.2, d + 0.2, '#a99f8f'), bx, 0.1, bz + 0.5);
    if (h.porch) {                                                         // varanda: piso, pilares e cobertura
      P(box(w, 0.25, 1.9, '#a5835a'), bx, 0.13, fz + 0.95);
      for (const x of [-4.2, -1.4, 1.4, 4.2]) P(box(0.2, 2.6, 0.2, '#f4f1ea'), bx + x, 1.4, fz + 1.75);
      P(box(w + 0.4, 0.14, 2.3, roof), bx, 2.8, fz + 1.0, 0.18, 0, 0);
      P(box(1.3, 0.5, 0.6, '#8a5a36'), bx - 2.6, 0.5, fz + 0.9);           // banco
    }
  } else if (h.type === 'barn') {
    const w = 10, d = 9, H = 5.2, fz = bz + 0.2 + d / 2;
    P(box(w, H, d, wall), bx, H / 2, bz + 0.2);
    gableRoof(root, { cx: bx, cz: bz + 0.2, y: H, len: d, depth: w, rise: 3.2, over: 0.5, color: roof, wall, ridge: 'z' });
    P(box(4.2, 3.8, 0.12, '#5a2a22'), bx, 1.9, fz + 0.06);
    for (const s of [-1, 1]) P(box(0.18, 5.4, 0.14, '#f4f1ea'), bx, 1.9, fz + 0.12, 0, 0, s * Math.atan2(4.2, 3.8));   // X na porta
    for (const [x, y, w2, h2] of [[0, 3.85, 4.4, 0.18], [0, 0.05, 4.4, 0.18], [-2.1, 1.9, 0.18, 3.8], [2.1, 1.9, 0.18, 3.8]]) P(box(w2, h2, 0.14, '#f4f1ea'), bx + x, y, fz + 0.12);
    P(box(1.4, 1.4, 0.12, '#f4f1ea'), bx, 4.7, fz + 0.06); P(box(1.1, 1.1, 0.14, '#3a2a20'), bx, 4.7, fz + 0.08);
  } else {                                                                  // galpão: metálico, porta de enrolar
    const w = 11, d = 8, H = 4.4, fz = bz + d / 2;
    P(box(w, H, d, wall), bx, H / 2, bz);
    gableRoof(root, { cx: bx, cz: bz, y: H, len: w, depth: d, rise: 1.2, over: 0.4, color: roof, wall });
    P(box(5.2, 3.4, 0.12, '#d8d2c4'), bx, 1.7, fz + 0.06);
    for (let y = 0.3; y < 3.4; y += 0.35) P(box(5.16, 0.05, 0.14, '#a9a397'), bx, y, fz + 0.1);
    for (let x = -5; x <= 5; x += 1) P(box(0.06, H, 0.06, '#7d838b'), bx + x, H / 2, fz + 0.04);
  }
  // plantação e extras
  const anims = [], ph = h.index * 1.31;
  crop(P, h.crop, L.crop.x0, L.crop.x1, L.crop.z0, L.crop.z1, anims, ph);
  fieldWork(root, h, anims, ph);
  const E = L.extra, ex = (E.x0 + E.x1) / 2, ez = (E.z0 + E.z1) / 2;
  if (h.extra === 'tank') {                                                // caixa-d'água no alto
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(box(0.2, 4, 0.2, WOOD), ex + 2 + x * 1.1, 2, ez + z * 1.1);
    P(cyl(1.5, 1.5, 1.8, '#2f78c4', 12), ex + 2, 4.9, ez); P(cone(1.6, 0.6, '#2a5f9a', 12), ex + 2, 6.1, ez);
  } else if (h.extra === 'hay') {                                          // fardos de feno redondos
    for (const [x, z] of [[-3, 0], [-0.6, 0.4], [1.8, -0.3], [-1.8, -1.5]]) P(cyl(1.0, 1.0, 1.3, '#e6c35a', 12), ex + x, 1.0, ez + z + 0.4, 0, 0, Math.PI / 2);
  } else {                                                                  // lenha e carrinho de mão
    for (let k = 0; k < 3; k++) P(box(3, 0.4, 1.2, '#7a5434'), ex - 2, 0.2 + k * 0.4, ez);
    P(box(1.2, 0.5, 0.8, '#3f8a4a'), ex + 2.5, 0.6, ez); P(cyl(0.3, 0.3, 0.12, '#2b2b2b', 8), ex + 3.2, 0.3, ez, Math.PI / 2, 0, 0);
  }
  for (const k of [0, 1]) P(box(0.08, 1.8, 0.08, '#7a5434'), E.x1 - 0.6 - k * 0.5, 0.9, E.z0 + 0.3, 0.2, 0, 0);   // ferramentas encostadas
  // detalhes rurais (2 por propriedade, nas pistas): faixa da esquerda do pátio (galinheiro, lenha, espantalho), direita (carrinho, hortinha),
  // junto à porta (botas, vasos e regador) — sempre fora do caminho da porteira até a porta (x −9…−3)
  const FZ = h.type === 'house' ? -0.5 : h.type === 'barn' ? 0.2 : -0.5, FY = h.type === 'house' && h.porch ? 0.26 : 0;
  for (const r of h.rural || []) {
    if (r === 'scarecrow') {
      const x = -12.2, z = 10.4;
      P(box(0.16, 2.6, 0.16, WOOD), x, 1.3, z); P(box(2.0, 0.14, 0.14, WOOD), x, 2.0, z);
      P(box(0.9, 1.0, 0.45, '#c8402f'), x, 1.75, z); for (const s2 of [-1, 1]) P(box(0.5, 0.3, 0.32, '#c8402f'), x + s2 * 0.7, 2.0, z);
      P(box(0.6, 0.7, 0.4, '#3a5f8f'), x, 1.0, z);
      P(sphere(0.38, '#d9c08a', 8, 6), x, 2.6, z); P(cyl(0.75, 0.75, 0.06, '#e6c35a', 12), x, 2.85, z); P(cone(0.4, 0.45, '#e6c35a', 10), x, 3.08, z);
      for (const s2 of [-1, 1]) P(box(0.08, 0.08, 0.04, '#2b2b2b'), x + s2 * 0.13, 2.65, z + 0.36);
    } else if (r === 'coop') {
      const x = -11.9, z = 4.2;
      P(box(2.4, 1.3, 1.7, '#9a4a2a'), x, 0.95, z); P(box(2.7, 0.12, 1.2, '#5a3a22'), x, 1.78, z - 0.45, 0.45, 0, 0); P(box(2.7, 0.12, 1.2, '#5a3a22'), x, 1.78, z + 0.45, -0.45, 0, 0);
      for (const [dx, dz] of [[-1.1, -0.75], [1.1, -0.75], [-1.1, 0.75], [1.1, 0.75]]) P(box(0.12, 0.3, 0.12, WOOD), x + dx, 0.15, z + dz);
      P(box(0.5, 0.6, 0.06, '#3a2a20'), x + 0.5, 0.95, z + 0.86); P(box(0.5, 0.08, 1.1, WOOD), x + 0.5, 0.35, z + 1.35, -0.5, 0, 0);
      for (const [dx, dz] of [[-0.6, 1.5], [0.9, 1.9]]) { P(sphere(0.25, '#ffffff', 7, 5), x + dx, 0.28, z + dz); P(sphere(0.14, '#ffffff', 6, 4), x + dx + 0.18, 0.5, z + dz); P(box(0.06, 0.12, 0.1, '#e0402a'), x + dx + 0.2, 0.66, z + dz); }
    } else if (r === 'wood') {
      const x = -12.0, z = 7.4;
      for (let k = 0; k < 3; k++) for (let j = 0; j < 5 - k; j++) P(cyl(0.2, 0.2, 1.5, k % 2 ? '#8a5a34' : '#6b4526', 6), x - 0.8 + j * 0.42 + k * 0.21, 0.22 + k * 0.36, z, Math.PI / 2, 0, 0);
      P(box(0.6, 0.5, 0.6, '#7a5434'), x + 1.6, 0.25, z + 0.2); P(box(0.06, 0.7, 0.06, '#5a3a22'), x + 1.6, 0.85, z + 0.2, 0, 0, 0.5);   // toco com machado
    } else if (r === 'barrow') {
      const x = -0.9, z = FZ + 2.4;
      P(box(1.1, 0.4, 0.8, '#3f8a4a'), x, 0.7, z); P(cyl(0.3, 0.3, 0.12, '#2b2b2b', 10), x + 0.75, 0.3, z, Math.PI / 2, 0, 0);
      for (const s2 of [-1, 1]) { P(box(1.2, 0.08, 0.08, '#8a5a36'), x - 0.8, 0.55, z + s2 * 0.32, 0, 0, -0.25); P(box(0.08, 0.5, 0.08, '#3a3a3a'), x - 0.3, 0.25, z + s2 * 0.32); }
      P(box(0.9, 0.2, 0.6, '#c98a4a'), x, 0.92, z);
    } else if (r === 'veg') {
      const x = -0.9, z = 6.3;
      P(box(2.4, 0.35, 3.0, '#6b4526'), x, 0.18, z); P(box(2.2, 0.06, 2.8, '#5a3a22'), x, 0.37, z);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) P(cone(0.2, 0.42, i === 1 ? '#e8742a' : '#4f9a3a', 5), x - 0.7 + i * 0.7, 0.6, z - 1.05 + j * 0.7);
    } else if (r === 'boots') {
      for (const [dx, c] of [[-0.18, '#3f6a3a'], [0.18, '#3f6a3a']]) { P(box(0.24, 0.5, 0.26, c), -7.4 + dx, FY + 0.25, FZ + 0.45); P(box(0.24, 0.14, 0.42, c), -7.4 + dx, FY + 0.07, FZ + 0.55); }
    } else if (r === 'pots') {
      for (const dx of [0, 0.7]) { P(cyl(0.28, 0.2, 0.45, '#b85c38', 8), -4.4 + dx, FY + 0.23, FZ + 0.5); P(sphere(0.3, dx ? '#e04a6a' : '#4f9a3a', 7, 5), -4.4 + dx, FY + 0.6, FZ + 0.5); }
      P(cyl(0.2, 0.22, 0.4, '#3f8a8a', 8), -3.4, FY + 0.2, FZ + 0.65); P(cyl(0.04, 0.05, 0.5, '#3f8a8a', 5), -3.15, FY + 0.35, FZ + 0.65, 0, 0, -0.9);   // regador
    }
  }
  bakeStatic(root);
  if (anims.length) root.userData.update = (t, dt) => { if (root.visible) for (const f of anims) f(t, dt); };
  return root;
}

// roupa de roça (como os moradores da Colheita: xadrez ou lisa, jardineira, chapéu de palha ou boné, botas)
const WORK_LOOKS = [
  { shirt: '#c8402f', stripes: '#2b2b2b', pants: '#3a5f8f', overalls: true, hat: 'straw', hair: '#5a3a22', boots: true, shoes: '#5a3b22' },
  { shirt: '#f1ece0', pants: '#5a4a3a', hat: 'cap', hatColor: '#3f8a4a', hair: '#2a1d14', boots: true, shoes: '#5a3b22', skin: '#c98d62' },
  { shirt: '#9fc0de', pants: '#2f4a6e', overalls: true, hat: 'straw', hatBand: '#c8402f', hair: '#c9a46a', boots: true, shoes: '#5a3b22' },
  { shirt: '#e8d27a', pants: '#6b5a3a', hat: 'kerchief', hatColor: '#c8402f', hair: '#3a2a1a', longHair: true, boots: true, shoes: '#5a3b22', skin: '#8d5a3b' },
];
/** Trabalho no campo (uma pessoa por propriedade com lavoura, cada uma no seu ritmo): capinando a horta com a enxada,
 *  colhendo fruta no pomar (cesto no chão), quebrando milho no milharal. Fica na beira da plantação, longe do caminho
 *  da porteira à porta; o corpo vai junto com o lote assado, só braços e cabeça mexem. */
function fieldWork(root, h, anims, ph) {
  if (h.crop === 'pasture') return;
  const C = L.crop, look = WORK_LOOKS[h.index % WORK_LOOKS.length];
  const f = buildFigure({ ...look, moving: h.crop === 'garden' ? ['armL', 'armR'] : h.crop === 'corn' ? ['armR', 'head'] : ['armL', 'armR', 'head'],
    headPose: { x: 0.35 }, armPose: h.crop === 'corn' ? { L: [-0.2, 0, -0.25] } : null });   // (na horta, olha para a enxada; no milharal, o braço do saco fica parado)
  root.add(f.root);
  const tool = new THREE.Group();
  if (h.crop === 'garden') {                                                                  // capinando entre os canteiros
    f.root.position.set(C.x0 + 0.8, 0, C.z0 + 13.1); f.root.rotation.y = Math.PI / 2;   // (no corredor entre os canteiros da frente)
    // enxada: o cabo sai da mão para a frente e para baixo e a lâmina fica na ponta (em repouso, encostada na terra)
    tool.add(at(cyl(0.035, 0.035, 1.5, '#8a5a36', 5), 0, -0.58, 0.14, 2.9, 0, 0), at(box(0.34, 0.05, 0.24, '#6b6f76'), 0, -1.33, 0.33, 2.9, 0, 0));
    tool.position.set(0, -0.52, 0); f.armR.add(dynamic(tool));
    anims.push(t => {
      const k = (t * 0.9 + ph) % 1;                                                       // sobe devagar, desce de uma vez e puxa a terra
      const lift = k < 0.55 ? Math.sin(k / 0.55 * Math.PI / 2) : k < 0.7 ? Math.cos((k - 0.55) / 0.15 * Math.PI / 2) : 0;
      f.armR.rotation.set(-0.5 - lift * 1.0, 0, -0.08); f.armL.rotation.set(-0.45 - lift * 0.9, 0, 0.3);
      tool.rotation.x = -0.3 - lift * 0.15;
    });
  } else if (h.crop === 'orchard') {                                                          // colhendo fruta do pé, cesto no chão
    const tx = C.x0 + 2.2, tz = C.z0 + 2.2 + 4.2 * 3;                                     // (pé da fileira da frente)
    f.root.position.set(tx - 1.1, 0, tz + 0.2); f.root.rotation.y = Math.PI / 2;
    root.add(at(cyl(0.38, 0.3, 0.42, '#b8804a', 10), tx - 1.3, 0.21, tz + 1.05));
    for (const [dx, dz, c] of [[-0.12, 0, '#e0402a'], [0.1, 0.1, '#ff8c1a'], [0.05, -0.12, '#e0402a']]) root.add(at(sphere(0.12, c, 6, 4), tx - 1.3 + dx, 0.44, tz + 1.05 + dz));
    anims.push(t => {
      const k = Math.sin(t * 0.8 + ph), reach = Math.max(0, k);
      f.armR.rotation.set(-1.4 - reach * 1.3, 0, 0.15); f.armL.rotation.set(-0.3 + Math.min(0, k) * 0.4, 0, -0.15);
      f.head.rotation.x = -0.45 * reach + 0.25 * (1 - reach); f.head.rotation.y = 0.2 * Math.sin(t * 0.3 + ph);
      f.body.rotation.y = Math.min(0, k) * -0.7;                                              // vira para pôr no cesto
    });
  } else {                                                                                    // quebrando milho na beira do milharal
    f.root.position.set(C.x0 + 0.1, 0, C.z1 - 1.2); f.root.rotation.y = Math.PI / 2;
    f.body.add(at(box(0.5, 0.6, 0.3, '#c9b48a'), -0.55, 0.42, 0.25, 0, 0, -0.2));         // saco pendurado no braço (vai junto com o lote assado)
    anims.push(t => {
      const k = (t * 0.55 + ph) % 1, pull = k < 0.3 ? k / 0.3 : k < 0.45 ? 1 : Math.max(0, 1 - (k - 0.45) / 0.25);
      f.armR.rotation.set(-1.2 - pull * 0.5, 0, 0.1 + pull * 0.25);
      f.head.rotation.x = -0.15; f.head.rotation.y = Math.sin(t * 0.25 + ph) * 0.35;
    });
  }
  f.body.userData.dynamic = h.crop === 'orchard';                                              // (no pomar o corpo gira: fica solto)
}

/** Cenário fixo: estradas de terra e decoração (lavouras, pastos, pomares, grupos de árvores). */
export function buildFarmScene(g, F) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const RW = FARM.RW;
  for (const s of F.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
    add(box(RW, 0.06, len, DIRT), (ax + bx) / 2, 0.035, (az + bz) / 2, 0, ry, 0);
    for (const o of [-1.6, 1.6]) add(box(0.6, 0.065, len, '#a8845a'), (ax + bx) / 2 + Math.cos(ry) * o, 0.06, (az + bz) / 2 - Math.sin(ry) * o, 0, ry, 0);   // trilhas das rodas
  }
  for (const r of F.roads) for (const [x, z] of r) add(cyl(RW / 2, RW / 2, 0.06, DIRT, 18), x, 0.034, z);
  seed = 99;
  for (const d of F.decor) {
    if (d.type === 'trees') { const n = 5 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) tree(add, d.x0 + 2 + rnd() * (d.x1 - d.x0 - 4), d.z0 + 2 + rnd() * (d.z1 - d.z0 - 4), 1.1 + rnd() * 0.5); }
    else crop((m, x, y, z, rx, ry, rz) => add(m, x, y, z, rx, ry, rz), d.type, d.x0, d.x1, d.z0, d.z1);
  }
  return g;
}

/** Roda (eixo em Z, gira em torno dele): pneu, aro colorido, cubo e, nas grandes, as garras do pneu. */
function wheel(r, w, hub, lugs) {
  const g = new THREE.Group();
  g.add(at(cyl(r, r, w, '#1f2023', 14), 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(at(cyl(r * 0.55, r * 0.55, w + 0.04, hub, 10), 0, 0, 0, Math.PI / 2, 0, 0));
  g.add(at(cyl(r * 0.18, r * 0.18, w + 0.1, '#5a5a5a', 8), 0, 0, 0, Math.PI / 2, 0, 0));
  for (let k = 0; k < lugs; k++) { const a = k / lugs * Math.PI * 2; g.add(at(box(0.16, 0.12, w * 0.92, '#2a2b2e'), Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), 0, 0, 0, a)); }
  const m = vcMerge(g); m.castShadow = true; m.receiveShadow = true;
  const pv = new THREE.Group(); pv.add(m); return pv;
}
const DRIVERS = [
  { shirt: '#c8402f', stripes: '#2b2b2b', pants: '#3a5f8f', overalls: true, hat: 'straw', hair: '#5a3a22' },
  { shirt: '#f1ece0', pants: '#5a4a3a', hat: 'cap', hatColor: '#2f6fb0', hair: '#2a1d14' },
  { shirt: '#3f8a4a', stripes: '#1f3a28', pants: '#2f4a6e', hat: 'straw', hatBand: '#c8402f', hair: '#c9a46a', skin: '#c98d62' },
  { shirt: '#e8d27a', pants: '#3d4a66', overalls: true, hat: 'cap', hatColor: '#c8402f', hair: '#3a2a1a', skin: '#8d5a3b' },
];
let tractorN = 0;
/** Trator (frente para +X): capô com grade e faróis, arco de proteção com toldo (dá para ver o tratorista), paralamas
 *  sobre as rodas grandes de trás (com garras), rodas da frente menores e escapamento. As partes fixas viram uma malha só;
 *  as rodas giram e o tratorista olha em volta e mexe o volante (userData.drive(dt, v), chamado por quem move o trator). */
export function buildTractor(color = '#c8402f') {
  const g = new THREE.Group(), fixed = new THREE.Group(), n = tractorN++;
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => fixed.add(at(m, x, y, z, rx, ry, rz));
  a(box(2.6, 0.5, 0.95, '#38393d'), 0.35, 0.95, 0);                                        // chassi
  a(box(1.9, 0.92, 1.0, color), 1.15, 1.48, 0); for (const s of [-1, 1]) a(box(1.7, 0.07, 0.04, '#f4f1ea'), 1.2, 1.72, s * 0.51);   // capô (com friso claro)
  a(box(0.08, 0.66, 0.84, '#2b2b2b'), 2.12, 1.42, 0);                                      // grade
  for (let y = 1.2; y < 1.7; y += 0.14) a(box(0.1, 0.04, 0.8, '#6b6b6b'), 2.14, y, 0);
  for (const s of [-1, 1]) a(box(0.08, 0.18, 0.22, '#fff6c8', { emissive: '#fff0a0', emissiveIntensity: 0.4 }), 2.15, 1.82, s * 0.36);   // faróis
  a(box(0.8, 0.6, 1.05, color), -1.05, 1.42, 0);                                          // tanque, sob o assento
  a(box(1.0, 0.08, 1.15, '#4a4b50'), -0.25, 1.46, 0);                                       // plataforma dos pés
  for (const s of [-1, 1]) {                                                              // paralamas e degrau
    a(box(1.75, 0.1, 0.66, color), -0.9, 2.14, s * 1.0); a(box(0.1, 0.5, 0.66, color), -1.8, 1.9, s * 1.0, 0, 0, -0.3); a(box(0.1, 0.42, 0.66, color), 0.0, 1.95, s * 1.0, 0, 0, 0.35);
    a(box(0.5, 0.06, 0.3, '#5a5a5a'), 0.3, 0.85, s * 0.62);
  }
  for (const [x, z] of [[-1.42, -0.6], [-1.42, 0.6], [-0.05, -0.6], [-0.05, 0.6]]) a(box(0.09, 1.5, 0.09, '#2b2b2b'), x, 2.6, z);   // arco de proteção
  a(box(1.7, 0.1, 1.55, color), -0.72, 3.38, 0); a(box(1.74, 0.06, 1.59, '#f4f1ea'), -0.72, 3.3, 0);   // toldo
  a(box(0.52, 0.12, 0.56, '#2b2b2b'), -1.02, 1.78, 0); a(box(0.1, 0.55, 0.56, '#2b2b2b'), -1.3, 2.05, 0, 0, 0, 0.12);   // assento
  a(cyl(0.035, 0.035, 0.75, '#2b2b2b', 5), -0.13, 1.88, 0, 0, 0, 1.05); a(cyl(0.22, 0.22, 0.04, '#2b2b2b', 12), -0.47, 2.1, 0, 0, 0, 1.15);   // volante
  a(cyl(0.07, 0.08, 1.0, '#3a3a3a', 6), 1.55, 2.45, 0.32); a(cyl(0.1, 0.1, 0.12, '#2b2b2b', 6), 1.55, 2.98, 0.32);   // escapamento
  const body = vcMerge(fixed); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const wheels = [];
  for (const s of [-1, 1]) {
    const big = wheel(1.0, 0.55, '#e8c23a', 12); big.position.set(-0.9, 1.0, s * 1.0); g.add(big); wheels.push([big, 1.0]);
    const sm = wheel(0.55, 0.36, '#e8c23a', 0); sm.position.set(1.65, 0.55, s * 0.84); g.add(sm); wheels.push([sm, 0.55]);
  }
  const d = buildFigure({ ...DRIVERS[n % DRIVERS.length], sit: 0.42, moving: ['head', 'armL', 'armR'] });
  d.root.position.set(-1.0, 1.46, 0); d.root.rotation.y = Math.PI / 2; d.root.scale.setScalar(0.86); g.add(d.root);
  for (const arm of [d.armL, d.armR]) arm.rotation.set(-1.05, 0, 0);
  let T = n * 1.7, look = 0, lookT = 2 + (n % 3), steer = 0;
  g.userData.drive = (dt, v) => {
    T += dt;
    for (const [w, r] of wheels) w.rotation.z -= v * dt / r;
    if ((lookT -= dt) <= 0) { look = (Math.random() - 0.5) * 1.6; lookT = 2.5 + Math.random() * 5; }      // olha para o lado de vez em quando
    d.head.rotation.y += (look - d.head.rotation.y) * Math.min(1, dt * 2.5);
    d.head.rotation.x = Math.sin(T * 7.3) * 0.03 * Math.min(1, v);                              // sacolejo da estrada de terra
    steer += ((Math.sin(T * 0.6) * 0.5 + Math.sin(T * 1.9) * 0.2) * Math.min(1, v) - steer) * Math.min(1, dt * 3);
    d.armL.rotation.z = steer * 0.25; d.armR.rotation.z = steer * 0.25;
    d.body.position.y = 0.42 + 0.02 - 0.6 + Math.abs(Math.sin(T * 7.3)) * 0.025 * Math.min(1, v);
    body.position.y = Math.abs(Math.sin(T * 5.1)) * 0.02 * Math.min(1, v);
  };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return g;
}
