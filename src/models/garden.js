// Nível 17 (Bairro Jardins): casa de condomínio (lote centrado na origem, frente +Z, como os outros pontos) e o cenário fixo
// (ruas curvas, rotatórias, balões de retorno, parque com coreto/playground/jardim de flores/quadra, portaria com guarita).
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, at, mat, bakeStatic, dynamic, textTexture } from './kit.js';
import { gableRoof } from './venice.js';
import { GARD_COL } from '../data.js';
import { GARD } from '../gardenPlan.js';

const GRASS = '#86c25e', GRASS2 = '#7ab454', HEDGE = '#3f7d3a', PATH = '#e2d8c4', ASPH = '#5d6470', WOOD = '#8a5a36';

/** Casa do condomínio: corpo de 1 ou 2 andares, telhado de duas águas, porta, janelas, jardim da frente com cerca viva baixa,
 *  portão, caixa de correio, flores, pergolado, banco na varanda e enfeite na entrada (o que a casa tiver). */
export function buildGardLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const C = GARD_COL, wall = C.wall[h.wall], roof = C.roof[h.roofc], W = 9.6, D = 7.6, H = 3.0 * h.floors, Z0 = -6.6, FZ = Z0 + D;   // frente em z = 1
  P(box(17.2, 0.12, 17.2, GRASS), 0, 0.06, 0);
  P(box(1.6, 0.04, 8.6 - FZ - 0.6, PATH), 0, 0.14, (FZ + 8.0) / 2);                      // caminho do portão até a porta
  // cerca viva baixa em volta (abertura do portão)
  for (const [x0, x1] of [[-8.4, -1.3], [1.3, 8.4]]) P(box(x1 - x0, 0.8, 0.6, HEDGE), (x0 + x1) / 2, 0.52, 8.2);
  for (const sx of [-1, 1]) P(box(0.6, 0.8, 16.4, HEDGE), sx * 8.2, 0.52, 0);
  P(box(16.4, 0.8, 0.6, HEDGE), 0, 0.52, -8.2);
  // portão (aberto para dentro) e pilaretes
  const gc = C.gate[h.gate];
  for (const sx of [-1, 1]) P(box(0.35, 1.25, 0.35, '#d9d2c4'), sx * 1.35, 0.7, 8.2);
  P(box(1.15, 0.95, 0.1, gc), -0.75, 0.62, 7.65, 0, -1.2, 0); P(box(1.15, 0.95, 0.1, gc), 0.75, 0.62, 7.65, 0, 1.2, 0);
  // caixa de correio (à direita do portão)
  const mc = C.mail[h.mail];
  P(box(0.12, 1.0, 0.12, '#4a4a4a'), 2.4, 0.6, 8.85); P(box(0.5, 0.45, 0.75, mc), 2.4, 1.25, 8.85); P(cyl(0.25, 0.25, 0.75, mc, 10, ), 2.4, 1.47, 8.85, Math.PI / 2, 0, 0);
  // corpo, telhado, porta e janelas
  P(box(W, H, D, wall), 0, H / 2 + 0.12, Z0 + D / 2);
  gableRoof(g, { cx: 0, cz: Z0 + D / 2, y: H + 0.12, len: W, depth: D, rise: 1.9, over: 0.45, color: roof, wall });
  P(box(1.2, 2.2, 0.1, C.door[h.doorc]), 0, 1.22, FZ + 0.05); P(sphere(0.07, '#f2c14a', 6, 4), 0.42, 1.2, FZ + 0.12);
  for (let f = 0; f < h.floors; f++) for (const sx of [-1, 1]) {
    const y = 1.75 + f * 3; P(box(1.6, 1.1, 0.08, '#5b7c99'), sx * 3, y, FZ + 0.05); P(box(1.8, 0.12, 0.2, '#f4f1ea'), sx * 3, y - 0.62, FZ + 0.1);
  }
  if (h.floors === 2) P(box(1.6, 1.1, 0.08, '#5b7c99'), 0, 4.75, FZ + 0.05);
  // varanda com banco (casas com banco)
  if (h.bench) {
    P(box(W, 0.22, 2.0, '#bfa98a'), 0, 0.23, FZ + 1.0);
    for (const x of [-4.4, 4.4]) P(box(0.2, 2.7, 0.2, '#f4f1ea'), x, 1.45, FZ + 1.85);
    P(box(W + 0.3, 0.12, 2.3, roof), 0, 2.85, FZ + 1.05, 0.15, 0, 0);
    P(box(1.8, 0.12, 0.55, WOOD), -2.6, 0.75, FZ + 0.6); P(box(1.8, 0.5, 0.1, WOOD), -2.6, 1.05, FZ + 0.35);
    for (const dx of [-0.75, 0.75]) P(box(0.1, 0.4, 0.5, '#5a3a22'), -2.6 + dx, 0.5, FZ + 0.6);
  }
  // canteiros de flores dos dois lados do caminho
  if (h.flower) {
    const fc = C.flower[h.flower];
    for (const sx of [-1, 1]) {
      P(box(3.6, 0.3, 1.4, '#7a5434'), sx * 3.4, 0.27, FZ + 3.3);
      for (let k = 0; k < 6; k++) { P(cyl(0.04, 0.04, 0.4, '#3f8a3a', 4), sx * 3.4 - 1.4 + k * 0.56, 0.6, FZ + 3.1 + (k % 2) * 0.4); P(sphere(0.22, fc, 7, 5), sx * 3.4 - 1.4 + k * 0.56, 0.86, FZ + 3.1 + (k % 2) * 0.4); }
    }
  }
  // pergolado (lado direito do jardim)
  if (h.pergola) {
    const x = 6.1, z = FZ + 2.4;
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) P(box(0.18, 2.4, 0.18, WOOD), x + dx, 1.32, z + dz);
    for (const dz of [-1.2, 1.2]) P(box(3.0, 0.16, 0.16, WOOD), x, 2.56, z + dz);
    for (let k = -2; k <= 2; k++) P(box(0.12, 0.12, 3.0, '#a8743f'), x + k * 0.6, 2.7, z);
    P(sphere(0.6, '#4f9a3a', 7, 5), x - 1.2, 2.55, z - 1.2);
  }
  // enfeite junto à entrada
  if (h.deco === 'statue') { P(box(0.7, 0.5, 0.7, '#cfcac0'), -2.0, 0.37, 7.4); P(sphere(0.38, '#dcd7cc', 8, 6), -2.0, 0.95, 7.4); P(sphere(0.22, '#dcd7cc', 8, 6), -2.0, 1.45, 7.4); }
  else if (h.deco === 'vases') for (const sx of [-1, 1]) { P(cyl(0.32, 0.24, 0.6, '#b85c38', 8), sx * 1.9, 0.42, 7.5); P(sphere(0.38, '#4f9a3a', 7, 5), sx * 1.9, 0.92, 7.5); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.position.y > 0.3; o.receiveShadow = true; } });
  return bakeStatic(g);
}

function tree(add, x, z, s = 1) {
  add(cyl(0.2 * s, 0.28 * s, 1.6 * s, '#6b4526', 6), x, 0.8 * s, z);
  add(sphere(1.5 * s, '#3f8f3a', 8, 6), x, 2.4 * s, z); add(sphere(1.0 * s, '#4f9f45', 7, 5), x + 0.6 * s, 3.0 * s, z - 0.3 * s);
}

/** Cenário fixo dos Jardins. */
export function buildGardenScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW } = GARD;
  // ruas, rotatórias (com ilha florida) e balões de retorno
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
    add(box(RW, 0.06, len, ASPH), (ax + bx) / 2, 0.035, (az + bz) / 2, 0, ry, 0);
    for (let t = 2; t < len - 2; t += 4) add(box(0.18, 0.07, 1.8, '#f2efe6'), ax + (bx - ax) * t / len, 0.04, az + (bz - az) * t / len, 0, ry, 0);   // faixa tracejada
  }
  for (const [x, z] of Object.values(V.N)) add(cyl(RW / 2, RW / 2, 0.06, ASPH, 18), x, 0.034, z);
  for (const r of V.rounds) {
    add(cyl(r.r, r.r, 0.06, ASPH, 32), r.x, 0.036, r.z);
    add(cyl(r.island, r.island, 0.4, '#d9d2c4', 24), r.x, 0.2, r.z); add(cyl(r.island - 0.3, r.island - 0.3, 0.42, GRASS, 24), r.x, 0.22, r.z);
    for (let k = 0; k < 10; k++) { const a = k * 0.628; add(sphere(0.35, ['#e0402a', '#f2c23a', '#ff7ab0'][k % 3], 6, 4), r.x + Math.cos(a) * 2, 0.6, r.z + Math.sin(a) * 2); }
    tree(add, r.x, r.z, 0.8);
  }
  for (const c of V.culs) add(cyl(c.r, c.r, 0.06, ASPH, 28), c.x, 0.036, c.z);
  // parque: gramado mais claro, cerca viva baixa (aberturas com balizadores), caminhos
  const P = V.PARK;
  add(box(P.x1 - P.x0, 0.05, P.z1 - P.z0, GRASS2), (P.x0 + P.x1) / 2, 0.03, (P.z0 + P.z1) / 2);
  for (const h of V.hedges) add(box(h.x1 - h.x0, 0.9, h.z1 - h.z0, HEDGE), (h.x0 + h.x1) / 2, 0.45, (h.z0 + h.z1) / 2);
  for (const b of V.bollards) for (const dx of [0.25, (b.x1 - b.x0) / 2, b.x1 - b.x0 - 0.25]) add(cyl(0.12, 0.12, 0.9, '#d8d2c4', 8), b.x0 + dx, 0.45, (b.z0 + b.z1) / 2);
  for (const p of V.parkPaths) add(box(p.x1 - p.x0, 0.06, p.z1 - p.z0, PATH), (p.x0 + p.x1) / 2, 0.05, (p.z0 + p.z1) / 2);
  for (const t of V.trees) tree(add, t.x, t.z, t.s);
  for (const b of V.benches) { const gb = new THREE.Group(); gb.position.set(b.x, 0, b.z); gb.rotation.y = b.ry; g.add(gb); gb.add(at(box(1.8, 0.12, 0.55, WOOD), 0, 0.5, 0)); gb.add(at(box(1.8, 0.5, 0.1, WOOD), 0, 0.8, -0.25)); for (const dx of [-0.75, 0.75]) gb.add(at(box(0.1, 0.5, 0.5, '#3a3a3a'), dx, 0.25, 0)); }
  const bulb = mat('#fff1b8', { emissive: '#ffd36b', emissiveIntensity: 0.6 });
  for (const l of V.lamps) { add(cyl(0.1, 0.13, 4, '#3a3d44', 6), l.x, 2, l.z); add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), bulb), l.x, 4.1, l.z); }
  // equipamentos
  for (const a of V.amen) {
    if (a.k === 'gazebo') {                                      // coreto: base, colunas, telhado octogonal
      add(cyl(4.4, 4.6, 0.6, '#d9d2c4', 8), a.x, 0.3, a.z);
      for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4; add(cyl(0.15, 0.15, 3, '#f4f1ea', 6), a.x + Math.cos(q) * 3.8, 2.1, a.z + Math.sin(q) * 3.8); }
      add(cone(5, 2.2, '#b5402f', 8), a.x, 4.7, a.z); add(sphere(0.3, '#e8b02a', 6, 4), a.x, 5.9, a.z);
    } else if (a.k === 'playground') {                         // escorregador, balanço, gangorra, caixa de areia
      add(box(9, 0.04, 9, '#e6d39a'), a.x, 0.04, a.z);
      add(box(1.4, 2.2, 1.4, '#3f8ad0'), a.x - 4, 1.1, a.z - 3); add(box(1.2, 0.12, 3.2, '#e0402a'), a.x - 2.6, 1.0, a.z - 3, 0, 0, -0.55);
      for (const dx of [-1.2, 1.2]) add(box(0.14, 2.6, 0.14, '#f2c23a'), a.x + 3 + dx, 1.3, a.z - 3); add(box(2.6, 0.14, 0.14, '#f2c23a'), a.x + 3, 2.6, a.z - 3);
      for (const dx of [-0.5, 0.5]) add(box(0.5, 0.08, 0.3, '#e0402a'), a.x + 3 + dx, 0.7, a.z - 3);
      add(box(4, 0.12, 0.4, '#3f8a3a'), a.x - 3, 0.6, a.z + 4, 0, 0, 0.12); add(box(0.4, 0.5, 0.4, '#8a5a36'), a.x - 3, 0.25, a.z + 4);
      add(box(1.6, 0.3, 1.6, '#c8a05a'), a.x + 4, 0.15, a.z + 4);
    } else if (a.k === 'flowers') {                            // jardim de flores em canteiros redondos + chafariz
      for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; add(cyl(1.5, 1.5, 0.3, '#7a5434', 14), a.x + Math.cos(q) * 5, 0.15, a.z + Math.sin(q) * 5);
        for (let j = 0; j < 6; j++) add(sphere(0.3, ['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0', '#f4f4f4', '#ff9a3a'][k], 6, 4), a.x + Math.cos(q) * 5 + Math.cos(j) * 0.8, 0.5, a.z + Math.sin(q) * 5 + Math.sin(j) * 0.8); }
      add(cyl(1.6, 1.8, 0.6, '#cfcac0', 16), a.x, 0.3, a.z); add(cyl(1.4, 1.4, 0.1, '#6fb3e0', 16), a.x, 0.62, a.z); add(cyl(0.2, 0.25, 1.2, '#cfcac0', 8), a.x, 1.1, a.z);
    } else if (a.k === 'court') {                              // quadra com linhas, traves e alambrado na frente e no fundo
      add(box(17, 0.05, 11, '#3f8a8a'), a.x, 0.05, a.z); add(box(0.15, 0.06, 11, '#f4f4f4'), a.x, 0.08, a.z); add(torus(1.6, 0.07, '#f4f4f4', 4, 20), a.x, 0.08, a.z, Math.PI / 2, 0, 0);
      for (const sx of [-1, 1]) { add(box(0.12, 1.8, 3, '#f4f4f4'), a.x + sx * 8.2, 0.9, a.z); add(box(0.12, 0.12, 3, '#f4f4f4'), a.x + sx * 8.2, 1.8, a.z); }
      for (const sd of [-1, 1]) { add(box(18, 2.4, 0.06, '#8a9099', { transparent: true, opacity: 0.45 }), a.x, 1.2, a.z + sd * 6); for (let x = -9; x <= 9; x += 3) add(cyl(0.06, 0.06, 2.5, '#5a5f66', 5), a.x + x, 1.25, a.z + sd * 6); }
    }
  }
  // vagas das casas do parque
  for (const p of V.parking) for (const dx of [-5, -2.5, 0, 2.5, 5]) add(box(0.12, 0.07, 3.4, '#f4f1ea'), p.x + dx, 0.045, p.z + p.n * 2.2);
  // portaria: guarita, placa e cancela
  const B = V.BOOTH, bx = (B.x0 + B.x1) / 2, bz = (B.z0 + B.z1) / 2;
  add(box(B.x1 - B.x0, 2.8, B.z1 - B.z0, '#f1ede2'), bx, 1.4, bz); add(box(B.x1 - B.x0 + 0.6, 0.25, B.z1 - B.z0 + 0.6, '#5f646c'), bx, 2.95, bz);
  add(box(0.08, 1.1, 2.6, '#7fb2d8'), B.x0 - 0.01, 1.7, bz);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.2), new THREE.MeshBasicMaterial({ map: textTexture('RESIDENCIAL JARDINS', { width: 768, height: 150, bg: '#2f5a3a', fg: '#fff3d6', font: 'bold 74px "Trebuchet MS", sans-serif' }) }));
  sign.position.set(bx + 1.5, 3.9, B.z0 - 0.05); sign.rotation.y = Math.PI; g.add(sign);
  for (const dx of [-1.5, 4.5]) add(box(0.2, 3.4, 0.2, '#5f646c'), bx + dx, 1.7, B.z0 - 0.1);
  add(box(0.6, 1.2, 0.6, '#5f646c'), V.GATE.x0 - 0.5, 0.6, V.GATE.z);   // poste da cancela
  return g;
}
/** Cancela da portaria (fica fora da fusão de malhas do cenário: gira em main.js). */
export function buildGateArm(V) {
  const arm = new THREE.Group(); arm.position.set(V.GATE.x0 - 0.5, 1.1, V.GATE.z);
  for (let k = 0; k < 8; k++) arm.add(at(box(1.0, 0.16, 0.16, k % 2 ? '#d8312a' : '#f4f4f4'), 0.5 + k * 1.0, 0, 0));
  return arm;
}
