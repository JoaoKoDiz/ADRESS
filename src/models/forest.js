// Nível 22 (Bosque): cenário fixo (patamar, ruas curvas, ladeiras, árvores de outono, postes e bancos) e os detalhes de
// outono das casas (pilha de folhas, ancinho, cesto de maçãs, lenha coberta, guirlanda, banco, varanda, árvore na entrada).
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, at, mat, bakeStatic } from './kit.js';
import { LOT, LOT_ANCHORS as A } from '../layout.js';
import { FOREST } from '../forestPlan.js';

const ASPH = '#5d6470', GRASS = '#93a256', EARTH = '#8a7152', STONE = '#9c8f7a';
export const AUTUMN = {
  orange: ['#ec7f22', '#de6c18', '#f39236'], gold: ['#eaa82a', '#f2bb3a', '#d99424'], yellow: ['#e8c23a', '#f2d24e', '#d8ae2a'], red: ['#c63a24', '#b3301e', '#d24a2c'],
  brown: ['#9a6232', '#8a552a', '#a8703e'], green: ['#5e8f3a', '#6c9a40', '#4f7f34'], pine: ['#2f5f3a', '#3a6b42', '#2f5f3a'],
};
const leafMat = c => mat(c, { flatShading: true });
const blob = new THREE.IcosahedronGeometry(1, 0);
function crown(g, c, x, y, z, sx, sy = sx, sz = sx) { const m = new THREE.Mesh(blob, leafMat(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); return m; }

/** Uma árvore de outono (y = chão). type: 'round' | 'tall' | 'pine' | 'wide'. */
export function autumnTree(g, x, y, z, s, type, color, k = 0.5) {
  const C = AUTUMN[color] || AUTUMN.orange, c = i => C[(i + Math.floor(k * 3)) % 3];
  const add = (m, px, py, pz) => g.add(at(m, px, py, pz));
  if (type === 'pine') {
    add(cyl(0.2 * s, 0.28 * s, 1.4 * s, '#5b3b22', 6), x, y + 0.7 * s, z);
    for (const [r, yy, hh] of [[1.9, 1.6, 2.4], [1.5, 2.9, 2.1], [1.0, 4.0, 1.8]]) add(cone(r * s, hh * s, c(0), 7), x, y + yy * s, z);
  } else if (type === 'tall') {                                     // bétula: tronco claro e copa alta
    add(cyl(0.16 * s, 0.22 * s, 3.4 * s, '#e6dfcf', 6), x, y + 1.7 * s, z);
    for (const yy of [1.2, 2.3]) add(box(0.24 * s, 0.08 * s, 0.24 * s, '#3a332c'), x, y + yy * s, z);
    crown(g, c(0), x, y + 4.4 * s, z, 1.25 * s, 2.0 * s, 1.25 * s); crown(g, c(1), x + 0.5 * s, y + 3.6 * s, z + 0.3 * s, 0.8 * s);
  } else if (type === 'wide') {                                     // copa baixa e larga
    add(cyl(0.3 * s, 0.4 * s, 1.8 * s, '#6b4526', 6), x, y + 0.9 * s, z);
    crown(g, c(0), x, y + 2.6 * s, z, 2.3 * s, 1.2 * s, 2.0 * s); crown(g, c(1), x - 1.0 * s, y + 3.0 * s, z + 0.6 * s, 1.2 * s); crown(g, c(2), x + 1.1 * s, y + 2.9 * s, z - 0.4 * s, 1.1 * s);
  } else {
    add(cyl(0.26 * s, 0.36 * s, 2.2 * s, '#6b4526', 6), x, y + 1.1 * s, z);
    crown(g, c(0), x, y + 3.0 * s, z, 1.75 * s); crown(g, c(1), x + 0.9 * s, y + 2.6 * s, z + 0.4 * s, 1.15 * s); crown(g, c(2), x - 0.7 * s, y + 3.7 * s, z - 0.3 * s, 1.05 * s);
  }
}

/** Cenário fixo do Bosque. */
export function buildForestScene(g, V, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { MIDH, RW } = FOREST, X1 = MAP - HEDGE, P = V.MID;
  const slab = (x0, x1, z0, z1) => {
    if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
    add(box(x1 - x0, MIDH - 0.04, z1 - z0, EARTH), (x0 + x1) / 2, (MIDH - 0.04) / 2, (z0 + z1) / 2);
    add(box(x1 - x0, 0.06, z1 - z0, GRASS), (x0 + x1) / 2, MIDH - 0.03, (z0 + z1) / 2);
  };
  // patamar com recorte nas ladeiras
  const cuts = V.ramps.map(r => ({ x0: r.x0 - 0.6, x1: r.x1 + 0.6, z0: r.z0 - 0.6, z1: r.z1 + 0.6 }));
  const zs = [P.z0, X1, ...cuts.flatMap(c => [Math.max(P.z0, c.z0), Math.min(X1, c.z1)])].filter(z => z >= P.z0 && z <= X1).sort((a, b) => a - b);
  for (let k = 0; k < zs.length - 1; k++) {
    const z0 = zs[k], z1 = zs[k + 1]; if (z1 - z0 < 0.05) continue;
    const xs = cuts.filter(c => c.z0 < z1 - 0.01 && c.z1 > z0 + 0.01).sort((a, b) => a.x0 - b.x0);
    let x = P.x0; for (const c of xs) { slab(x, Math.max(x, c.x0), z0, z1); x = Math.max(x, c.x1); } slab(x, X1, z0, z1);
  }
  // borda do patamar: mureta baixa de pedra (aberta nas ladeiras)
  const wall = (x0, x1, z0, z1) => { if (x1 - x0 > 0.05 && z1 - z0 > 0.05) add(box(x1 - x0, 0.7, z1 - z0, STONE), (x0 + x1) / 2, MIDH + 0.35, (z0 + z1) / 2); };
  let a = P.x0; for (const c of cuts.filter(c => c.z0 < P.z0 && c.z1 > P.z0).sort((p, q) => p.x0 - q.x0)) { wall(a, c.x0, P.z0 - 0.35, P.z0 + 0.35); a = c.x1; } wall(a, X1, P.z0 - 0.35, P.z0 + 0.35);
  a = P.z0; for (const c of cuts.filter(c => c.x0 < P.x0 && c.x1 > P.x0).sort((p, q) => p.z0 - q.z0)) { wall(P.x0 - 0.35, P.x0 + 0.35, a, c.z0); a = c.z1; } wall(P.x0 - 0.35, P.x0 + 0.35, a, X1);
  // ruas (asfalto) com meio-fio de folhas: trechos retos + discos nos nós = curvas suaves
  for (const s of V.segs) {
    if (s.type === 'ramp') continue;
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), y = V.h((ax + bx) / 2, (az + bz) / 2);
    add(box(RW, 0.06, len, ASPH), (ax + bx) / 2, y + 0.035, (az + bz) / 2, 0, ry, 0);
    for (let t = 3; t < len - 3; t += 3.2) add(box(0.2, 0.02, 1.4, '#f2d45c'), ax + (bx - ax) * t / len, y + 0.07, az + (bz - az) * t / len, 0, ry, 0);   // faixa central tracejada
  }
  for (const [x, z] of Object.values(V.N)) add(cyl(RW / 2, RW / 2, 0.06, ASPH, 18), x, V.h(x, z) + 0.034, z);
  for (const r of V.ramps) {
    const along = r.axis === 'z' ? r.z1 - r.z0 : r.x1 - r.x0, len = Math.hypot(along, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, along);
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, ym = (r.h0 + r.h1) / 2;
    if (r.axis === 'z') { add(box(r.x1 - r.x0, 0.3, len, ASPH), cx, ym - 0.12, cz, -ang, 0, 0); for (const x of [r.x0 - 0.3, r.x1 + 0.3]) add(box(0.6, r.h1 + 0.6, r.z1 - r.z0, STONE), x, (r.h1 + 0.6) / 2 - 0.3, cz); }
    else { add(box(len, 0.3, r.z1 - r.z0, ASPH), cx, ym - 0.12, cz, 0, 0, ang); for (const z of [r.z0 - 0.3, r.z1 + 0.3]) add(box(r.x1 - r.x0, r.h1 + 0.6, 0.6, STONE), cx, (r.h1 + 0.6) / 2 - 0.3, z); }
  }
  // (as árvores do bosque são instanciadas em forestFx.js: copas que ficam transparentes quando escondem a van ou o destino)
  // postes antigos (verde-escuro, luz quente) e bancos de madeira à beira das ruas do mato
  const bulb = mat('#fff1c8', { emissive: '#ffcf7a', emissiveIntensity: 0.9 });
  for (const l of V.lamps) { add(cyl(0.11, 0.15, 4.6, '#2f3d32', 6), l.x, l.y + 2.3, l.z); add(box(0.5, 0.5, 0.5, '#2f3d32'), l.x, l.y + 4.75, l.z); add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), bulb), l.x, l.y + 4.6, l.z); }
  for (const b of V.benches) {
    const bg = new THREE.Group(); bg.position.set(b.x, b.y, b.z); bg.rotation.y = b.ry; g.add(bg);
    bg.add(at(box(2.0, 0.1, 0.6, '#9a6a3c'), 0, 0.5, 0)); bg.add(at(box(2.0, 0.5, 0.1, '#9a6a3c'), 0, 0.85, -0.28));
    for (const d of [-0.85, 0.85]) bg.add(at(box(0.12, 0.5, 0.5, '#3a3d44'), d, 0.25, 0));
  }
  return g;
}

/** Casa (ou loja) do Bosque: o lote de sempre, centrado no ponto, com os detalhes de outono (tags fo:*). */
export function forestLot(base, tags) {
  const wrap = new THREE.Group();
  base.position.set(-LOT / 2, 0, -LOT / 2); wrap.add(base);
  const ex = new THREE.Group(); ex.position.set(-LOT / 2, 0, -LOT / 2);
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => ex.add(at(m, x, y, z, rx, ry, rz));
  const HS = A.house, FZ = HS.z1, G = 0.12, D = A.doorX, porch = tags.includes('fo:porch'), PY = porch ? 0.3 : 0;
  const WD = '#9a6a3c', WL = '#c08a52', WK = '#6f4a2a';
  for (const t of tags) {
    if (t === 'fo:porch') {                                          // varanda de madeira na frente, com guarda-corpo aberto na porta
      add(box(8.2, 0.26, 1.9, WD), (HS.x0 + HS.x1) / 2, G + 0.13, FZ + 0.95);
      for (let x = HS.x0 + 0.6; x < HS.x1; x += 0.55) add(box(0.04, 0.02, 1.8, WK), x, G + 0.27, FZ + 0.95);
      for (const x of [HS.x0 + 0.65, HS.x1 - 0.65]) add(box(0.18, 2.6, 0.18, WK), x, G + 1.55, FZ + 1.8);
      add(box(8.2, 0.18, 0.18, WK), (HS.x0 + HS.x1) / 2, G + 2.8, FZ + 1.8);
      for (const [x0, x1] of [[HS.x0 + 0.65, D - 1.0], [D + 1.0, HS.x1 - 0.65]]) {
        add(box(x1 - x0, 0.08, 0.08, WL), (x0 + x1) / 2, G + 1.15, FZ + 1.8);
        for (let x = x0; x <= x1 + 0.01; x += 0.45) add(box(0.06, 0.8, 0.06, WL), x, G + 0.7, FZ + 1.8);
      }
      add(box(2.0, 0.14, 0.5, WD), D, G + 0.07, FZ + 2.1);           // degrau
    } else if (t === 'fo:wreath') {                                  // guirlanda de folhas na porta
      add(torus(0.36, 0.11, '#c8641e', 6, 14), D, G + 1.95, FZ + 0.2);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; add(sphere(0.1, ['#d24a2c', '#e8c23a', '#9a6232'][k % 3], 5, 4), D + Math.cos(a) * 0.36, G + 1.95 + Math.sin(a) * 0.36, FZ + 0.27); }
      add(box(0.18, 0.18, 0.06, '#b3301e'), D, G + 1.6, FZ + 0.27);
    } else if (t === 'fo:rake') {                                    // ancinho encostado na fachada, à direita da porta
      add(cyl(0.035, 0.035, 2.0, '#8a5a36', 5), D + 1.45, G + PY + 1.0, FZ + 0.3, -0.22, 0, 0);
      add(box(0.6, 0.06, 0.08, '#5a5d63'), D + 1.45, G + PY + 1.95, FZ + 0.1);
      for (let k = 0; k < 6; k++) add(box(0.03, 0.22, 0.03, '#5a5d63'), D + 1.2 + k * 0.1, G + PY + 2.07, FZ + 0.08);
    } else if (t === 'fo:apples') {                                  // cesto de maçãs à esquerda da porta
      const x = D - 1.4, z = FZ + 0.6;
      add(cyl(0.38, 0.3, 0.4, '#b0773a', 10), x, G + PY + 0.2, z);
      for (let k = 0; k < 7; k++) add(sphere(0.12, k % 3 ? '#d22a24' : '#e8b030', 6, 4), x + Math.cos(k) * 0.18 * (k % 2 + 0.3), G + PY + 0.45 + (k > 4 ? 0.08 : 0), z + Math.sin(k) * 0.18 * (k % 2 + 0.3));
      add(torus(0.3, 0.025, '#8a5a2c', 4, 12), x, G + PY + 0.5, z, 0, 0, Math.PI / 2);
    } else if (t === 'fo:bench') {                                   // banco de madeira na frente (embaixo da janela da esquerda)
      const x = HS.x0 + 1.4, z = FZ + 0.6;
      add(box(1.8, 0.1, 0.5, WD), x, G + PY + 0.48, z); add(box(1.8, 0.45, 0.08, WD), x, G + PY + 0.8, z - 0.22);
      for (const d of [-0.75, 0.75]) add(box(0.1, 0.45, 0.45, WK), x + d, G + PY + 0.22, z);
    } else if (t === 'fo:leaves') {                                  // pilha de folhas no quintal (perto da cerca, à esquerda do portão)
      const x = 6.2, z = 15.6;
      for (const [dx, dz, r, c] of [[0, 0, 0.75, '#d9701c'], [0.45, 0.2, 0.5, '#c63a24'], [-0.4, 0.25, 0.5, '#e8c23a'], [0.1, -0.35, 0.45, '#9a6232']]) { const m = sphere(r, c, 6, 4); m.scale.y = 0.55; add(m, x + dx, G + r * 0.3, z + dz); }
    } else if (t === 'fo:wood') {                                    // lenha empilhada sob uma coberturinha (lateral direita da casa)
      const x = HS.x1 + 1.3, z = (HS.z0 + HS.z1) / 2 + 0.6;
      for (let k = 0; k < 3; k++) for (let j = 0; j < 5 - k; j++) add(cyl(0.17, 0.17, 1.1, k % 2 ? '#8a5a34' : '#6b4526', 6), x, 0.28 + k * 0.3, z - 0.68 + j * 0.34 + k * 0.17, 0, 0, Math.PI / 2);
      for (const dz of [-0.9, 0.9]) add(box(0.1, 1.6, 0.1, '#5a3a22'), x + 0.55, 0.9, z + dz);
      add(box(1.4, 0.1, 2.3, '#7a4a2a'), x, 1.7, z, 0, 0, 0.2);
    } else if (t.startsWith('fo:tree:')) {                           // árvore colorida perto da entrada (canto da frente, à direita)
      autumnTree(ex, 15.9, G, 15.9, 0.85, 'round', t.split(':')[2], 0.2);
    }
  }
  if (ex.children.length) { wrap.add(ex); bakeStatic(ex); }
  wrap.userData = base.userData;
  wrap.name = 'forestlot';
  return wrap;
}
