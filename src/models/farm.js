// Nível 15 (Colheita): propriedade rural (terreno 28 × 26 centrado na origem, porteira para +Z): cerca de madeira,
// porteira colorida que abre (dynamic, userData.gate), caminho de terra até a construção (casa com ou sem varanda,
// celeiro ou galpão), plantação (milharal, horta, pomar ou pasto com vacas) e extras (caixa-d'água, feno, ferramentas).
// Também o cenário fixo (estradas de terra, lavouras, pastos, árvores) e o trator.
import * as THREE from 'three';
import { box, cyl, sphere, cone, at, mat, bakeStatic, dynamic } from './kit.js';
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
function cow(add, x, z, r) {
  const g = new THREE.Group();
  const a = (m, X, Y, Z) => g.add(at(m, X, Y, Z));
  a(box(1.8, 0.9, 0.9, '#f4f1ea'), 0, 1.15, 0); a(box(0.6, 0.5, 0.92, '#2b2b2b'), -0.3, 1.25, 0); a(box(0.5, 0.4, 0.92, '#2b2b2b'), 0.5, 1.0, 0);
  a(box(0.55, 0.55, 0.55, '#f4f1ea'), 1.1, 1.45, 0); a(box(0.3, 0.25, 0.5, '#e8a7a0'), 1.4, 1.3, 0);
  for (const [lx, lz] of [[-0.65, -0.3], [-0.65, 0.3], [0.65, -0.3], [0.65, 0.3]]) a(box(0.2, 0.7, 0.2, '#f4f1ea'), lx, 0.35, lz);
  add(g, x, 0, z, 0, r, 0);
}
function tree(add, x, z, s = 1, fruit = null) {
  add(cyl(0.18 * s, 0.24 * s, 1.8 * s, '#6b4526', 6), x, 0.9 * s, z);
  add(sphere(1.4 * s, LEAF, 8, 6), x, 2.4 * s, z);
  if (fruit) for (let k = 0; k < 6; k++) { const a = k * 1.05; add(sphere(0.18, fruit, 5, 4), x + Math.cos(a) * 1.1 * s, 2.2 * s + (k % 2) * 0.5, z + Math.sin(a) * 1.1 * s); }
}
/** Lavoura/pasto/pomar num retângulo (x0..x1, z0..z1), em coordenadas do grupo. */
function crop(add, type, x0, x1, z0, z1) {
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
    cow(add, x0 + w * 0.3, z0 + d * 0.35, 0.4); cow(add, x0 + w * 0.7, z0 + d * 0.7, 2.2);
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
    P(box(1.1, 2.1, 0.1, '#6b4428'), bx, 1.05, fz + 0.05);
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
    for (let y = 0.3; y < 3.4; y += 0.35) P(box(5.2, 0.05, 0.14, '#a9a397'), bx, y, fz + 0.1);
    for (let x = -5; x <= 5; x += 1) P(box(0.06, H, 0.06, '#7d838b'), bx + x, H / 2, fz + 0.04);
  }
  // plantação e extras
  crop(P, h.crop, L.crop.x0, L.crop.x1, L.crop.z0, L.crop.z1);
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
  return bakeStatic(root);
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

/** Trator (frente para +X): rodas grandes atrás, cabine e escapamento. */
export function buildTractor(color = '#c8402f') {
  const g = new THREE.Group();
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  a(box(3.0, 1.0, 1.4, color), 0.2, 1.2, 0);
  a(box(1.4, 0.7, 1.2, color), 1.6, 1.05, 0);
  a(box(1.3, 1.5, 1.5, '#dfe6ee'), -0.7, 2.4, 0); a(box(1.5, 0.12, 1.7, color), -0.7, 3.2, 0);
  a(cyl(0.09, 0.09, 1.2, '#2b2b2b', 6), 1.3, 2.2, 0.4);
  for (const s of [-1, 1]) { a(cyl(1.0, 1.0, 0.55, '#1f2023', 12), -0.9, 1.0, s * 1.0, Math.PI / 2, 0, 0); a(cyl(0.5, 0.5, 0.58, '#e8c23a', 10), -0.9, 1.0, s * 1.0, Math.PI / 2, 0, 0);
    a(cyl(0.55, 0.55, 0.4, '#1f2023', 10), 1.7, 0.55, s * 0.85, Math.PI / 2, 0, 0); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
