// Cenário especial dos Bairros 9 (Encostas: áreas elevadas, ladeiras e escadarias) e 10 (Travessia: canal, pontes,
// passarelas e placas LADO LESTE / LADO OESTE). Só visual: a colisão está em layout.js (SOLIDS) e a altura em TERRAIN.h.
import * as THREE from 'three';
import { box, at, mesh, textTexture } from './models/kit.js';
import { TERRAIN, CANAL, GRID, MAP, HEDGE, ROAD, LOT, roadCenter } from './layout.js';

const ASPHALT = '#5d6470', WALLC = '#b9ad98', CAP = '#d8cfbe', RAIL = '#e8e2d4', STEPC = '#cfc6b4';
const WATER = '#3d8fc4', WATER_DEEP = '#2f78ad', STONE = '#a99f8f', WOOD = '#8a6a44';
const hr = ROAD / 2, rc = roadCenter;

export function buildTerrain() {
  const g = new THREE.Group();
  if (TERRAIN.kind === 'hill') buildHill(g);
  if (CANAL) buildCanal(g);
  return g;
}

/** Bloco elevado de x0..x1 × z0..z1, de y0 até y1: muro de pedra e asfalto por cima. */
function block(g, x0, x1, z0, z1, y0, y1) {
  if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
  const h = y1 - y0;
  g.add(at(box(x1 - x0, h - 0.04, z1 - z0, WALLC), (x0 + x1) / 2, y0 + (h - 0.04) / 2, (z0 + z1) / 2));
  g.add(at(box(x1 - x0, 0.06, z1 - z0, ASPHALT), (x0 + x1) / 2, y1 - 0.03, (z0 + z1) / 2));
}
/** Faixa ao longo de x (z0..z1) com buracos nas colunas de rua `gaps`. */
function bandWithGaps(g, xa, xb, z0, z1, y0, y1, gaps) {
  let x = xa;
  for (const j of gaps.slice().sort((a, b) => a - b)) {
    const a = rc(j) - hr, b = rc(j) + hr;
    if (b <= xa || a >= xb) continue;
    block(g, x, Math.max(x, a), z0, z1, y0, y1);
    x = Math.max(x, b);
  }
  block(g, x, xb, z0, z1, y0, y1);
}
function rampMesh(g, r) {
  const z0 = rc(r.i) + hr, z1 = rc(r.i + 1) - hr, len = Math.hypot(LOT, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, LOT);
  const y = (r.h0 + r.h1) / 2;
  g.add(at(box(ROAD, 0.3, len, ASPHALT), rc(r.j), y - 0.15, (z0 + z1) / 2, -ang, 0, 0));
  // faixas laterais claras (guia) e faixa central tracejada na rampa
  for (const s of [-1, 1]) g.add(at(box(0.3, 0.42, len, CAP), rc(r.j) + s * (hr - 0.15), y + 0.02, (z0 + z1) / 2, -ang, 0, 0));
  for (let k = 0.08; k < 0.95; k += 0.16) g.add(at(box(0.22, 0.32, 1.3, '#f2d45c'), rc(r.j), r.h0 + (r.h1 - r.h0) * k - 0.13, z0 + LOT * k, -ang, 0, 0));
}
function stairsMesh(g, st) {
  const z0 = rc(st.i) + hr, n = 16, d = LOT / n, x = rc(st.j);
  for (let k = 0; k < n; k++) {
    const top = st.h0 + (st.h1 - st.h0) * (k + 1) / n;
    g.add(at(box(ROAD - 1.2, top - st.h0 + 0.02, d, k % 2 ? STEPC : CAP), x, st.h0 + (top - st.h0) / 2, z0 + d * (k + 0.5)));
  }
  // corrimãos nas laterais (inclinados)
  const len = Math.hypot(LOT, st.h1 - st.h0), ang = Math.atan2(st.h1 - st.h0, LOT);
  for (const s of [-1, 1]) {
    g.add(at(box(0.6, (st.h1 - st.h0) + 0.4, LOT, WALLC), x + s * (hr - 0.3), st.h0 + (st.h1 - st.h0) / 2, z0 + LOT / 2));
    g.add(at(box(0.12, 0.12, len, RAIL), x + s * (hr - 0.9), (st.h0 + st.h1) / 2 + 1.0, z0 + LOT / 2, -ang, 0, 0));
  }
  // placa "ESCADARIA" (só a pé) na base
  sign(g, 'ESCADARIA', x + hr - 0.6, st.h0, z0 - 0.6, 0, 3.2);
}
/** Placa com texto num poste (y = chão). */
function sign(g, text, x, y, z, ry = 0, w = 4.2) {
  const tex = textTexture(text, { width: 512, height: 128, bg: '#2f5f8a', fg: '#ffffff' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  const p = new THREE.Group();
  p.add(at(box(0.16, 2.6, 0.16, '#6b6f76'), 0, 1.3, 0));
  p.add(at(box(w + 0.2, w / 4 + 0.2, 0.08, '#e9e9e9'), 0, 2.6 + w / 8, -0.06));
  m.position.set(0, 2.6 + w / 8, 0); p.add(m);
  p.position.set(x, y, z); p.rotation.y = ry;
  g.add(p);
}
function parapetX(g, x0, x1, z, y) { g.add(at(box(x1 - x0, 0.8, 0.5, CAP), (x0 + x1) / 2, y + 0.4, z)); }
function parapetZ(g, z0, z1, x, y) { g.add(at(box(0.5, 0.8, z1 - z0, CAP), x, y + 0.4, (z0 + z1) / 2)); }

function buildHill(g) {
  const T = TERRAIN, E = HEDGE, W = MAP - HEDGE;
  const gapsAt = i => T.ramps.concat(T.stairs).filter(r => r.i === i).map(r => r.j);
  // nível 1: tudo ao sul da rua 4 (a faixa das ladeiras tem buracos onde elas ficam)
  bandWithGaps(g, E, W, rc(4) + hr, rc(5) - hr, 0, T.H1, gapsAt(4));
  block(g, E, W, rc(5) - hr, W, 0, T.H1);
  // nível 2: linhas 6–7, colunas 4–7
  const x2 = rc(4) + hr;
  bandWithGaps(g, x2, W, rc(6) + hr, rc(7) - hr, T.H1, T.H2, gapsAt(6));
  block(g, x2, W, rc(7) - hr, W, T.H1, T.H2);
  for (const r of T.ramps) rampMesh(g, r);
  for (const s of T.stairs) stairsMesh(g, s);
  // muretas nas bordas dos desníveis (onde a rua termina num paredão) e em volta do alto
  for (let j = 0; j <= GRID; j++) if (!gapsAt(4).includes(j)) parapetX(g, rc(j) - hr, rc(j) + hr, rc(4) + hr + 0.25, T.H1);
  for (let j = 5; j <= GRID; j++) if (!gapsAt(6).includes(j)) parapetX(g, rc(j) - hr, rc(j) + hr, rc(6) + hr + 0.25, T.H2);
  for (const i of [7, 8]) parapetZ(g, rc(i) - hr, rc(i) + hr, x2 + 0.25, T.H2);
  parapetX(g, E, x2, W - 0.25, T.H1); parapetX(g, x2, W, W - 0.25, T.H2);
  parapetZ(g, rc(4) + hr, W, E + 0.25, T.H1);
  parapetZ(g, rc(4) + hr, rc(6) + hr, W - 0.25, T.H1); parapetZ(g, rc(6) + hr, W, W - 0.25, T.H2);
  // faixas centrais tracejadas nas ruas do alto
  const dash = (x, y, z, along) => g.add(at(box(along ? 1.4 : 0.22, 0.02, along ? 0.22 : 1.4, '#f2d45c'), x, y + 0.01, z));
  for (let i = 5; i <= GRID; i++) for (let x = E + 2; x < W - 2; x += 2.6) {
    const near = Array.from({ length: GRID + 1 }, (_, j) => rc(j)).some(c => Math.abs(x - c) < hr + 0.5);
    if (!near) dash(x, T.h(x, rc(i)), rc(i), true);
  }
}

function buildCanal(g) {
  const C = CANAL, z0 = HEDGE, z1 = MAP - HEDGE, cx = (C.x0 + C.x1) / 2, w = C.x1 - C.x0;
  // água (um pouco acima do asfalto) com faixas mais escuras nas margens e muretas de pedra
  g.add(at(box(w, 0.06, z1 - z0, WATER), cx, 0.02, (z0 + z1) / 2));
  for (const s of [-1, 1]) g.add(at(box(1.4, 0.07, z1 - z0, WATER_DEEP), cx + s * (w / 2 - 0.7), 0.03, (z0 + z1) / 2));
  // reflexos (faixas claras) espalhados
  for (let z = z0 + 6; z < z1 - 4; z += 9) g.add(at(box(2.2, 0.075, 0.25, '#8cc6ea'), cx + Math.sin(z) * w * 0.3, 0.035, z));
  const breaks = C.bridges.map(i => [rc(i) - hr, rc(i) + hr]).concat(C.foot.map(z => [z - 1.3, z + 1.3])).sort((a, b) => a[0] - b[0]);
  let z = z0;
  for (const [a, b] of breaks.concat([[z1, z1]])) {
    if (a > z) for (const x of [C.x0 + 0.25, C.x1 - 0.25]) g.add(at(box(0.5, 0.5, a - z, STONE), x, 0.25, (z + a) / 2));
    z = b;
  }
  // pontes de carro: tabuleiro, guarda-corpos e placas nas saídas
  for (const i of C.bridges) {
    const zc = rc(i);
    g.add(at(box(w + 1, 0.2, ROAD + 0.6, '#8d8a84'), cx, 0.0, zc));
    g.add(at(box(w + 1, 0.04, ROAD - 0.4, ASPHALT), cx, 0.11, zc));
    for (const s of [-1, 1]) {
      const zz = zc + s * (hr + 0.1);
      g.add(at(box(w + 1, 0.9, 0.35, CAP), cx, 0.55, zz));
      for (let x = C.x0; x <= C.x1 + 0.01; x += w / 4) g.add(at(box(0.5, 1.3, 0.5, STONE), x, 0.65, zz));
    }
    // placas: quem sai da ponte para leste vê LADO LESTE; para oeste, LADO OESTE
    sign(g, 'LADO LESTE', C.x1 + 1.6, 0, zc - hr - 0.7, 0);
    sign(g, 'LADO OESTE', C.x0 - 1.6, 0, zc + hr + 0.7, Math.PI);
  }
  // passarelas (só a pé): estreitas, de madeira, com corrimão
  for (const fz of C.foot) {
    g.add(at(box(w + 0.8, 0.14, 2.4, WOOD), cx, 0.08, fz));
    for (let x = C.x0; x < C.x1; x += 1.2) g.add(at(box(0.08, 0.02, 2.2, '#6f5434'), x, 0.16, fz));
    for (const s of [-1, 1]) {
      g.add(at(box(w + 0.8, 0.1, 0.1, RAIL), cx, 1.05, fz + s * 1.15));
      for (let x = C.x0; x <= C.x1 + 0.01; x += w / 6) g.add(at(box(0.1, 1.0, 0.1, RAIL), x, 0.55, fz + s * 1.15));
    }
    // frade de concreto nas pontas: a van não passa
    for (const x of [C.x0 + 0.3, C.x1 - 0.3]) g.add(at(box(0.5, 0.9, 0.5, '#e0b43a'), x, 0.45, fz));
  }
}
