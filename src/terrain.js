// Cenário especial dos Bairros 9 (Encostas: áreas elevadas, ladeiras e escadarias) e 10 (Travessia: canal, pontes,
// passarelas e placas LADO LESTE / LADO OESTE). Só visual: a colisão está em layout.js (SOLIDS) e a altura em TERRAIN.h.
import * as THREE from 'three';
import { box, at, mesh, textTexture } from './models/kit.js';
import { buildRail } from './train.js';
import { RAIL as RAIL_PATH, VENICE, TERRAIN, CANAL, slotOrigin, doorPoint, GRID, MAP, HEDGE, ROAD, LOT, roadCenter } from './layout.js';

const ASPHALT = '#5d6470', WALLC = '#b9ad98', CAP = '#d8cfbe', RAIL = '#e8e2d4', STEPC = '#cfc6b4';
const WATER = '#3d8fc4', WATER_DEEP = '#2f78ad', STONE = '#a99f8f', WOOD = '#8a6a44';
const hr = ROAD / 2, rc = roadCenter;

export function buildTerrain() {
  const g = new THREE.Group();
  if (TERRAIN.kind === 'hill') buildHill(g);
  if (CANAL) buildCanal(g);
  if (RAIL_PATH) buildRail(g);
  if (VENICE) buildVenice(g);
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

// ---------- Nível 12 (Veneza): água, vielas, pracinha, Ponte de Rialto, pontes menores e placas de atracar ----------
function deckSteps(g, along, from, to, cross, width, rise, n, color, side = true) {   // ponte em degraus (perfil em arco)
  const L = to - from, d = L / n;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, y = 0.15 + rise * 4 * t * (1 - t), a = from + d * (k + 0.5);
    const p = along === 'z' ? [cross, y, a] : [a, y, cross], sz = along === 'z' ? [width, 0.5, d + 0.02] : [d + 0.02, 0.5, width];
    g.add(at(box(sz[0], sz[1], sz[2], color), p[0], p[1] - 0.25, p[2]));
    const und = along === 'z' ? [width - 0.6, 0.9, d + 0.02] : [d + 0.02, 0.9, width - 0.6];   // arco (espessura por baixo)
    g.add(at(box(und[0], und[1], und[2], '#cfc6b4'), p[0], p[1] - 0.95, p[2]));
    if (side) for (const s of [-1, 1]) {                                                       // parapeito
      const q = along === 'z' ? [cross + s * (width / 2 - 0.15), y + 0.45, a] : [a, y + 0.45, cross + s * (width / 2 - 0.15)];
      const qs = along === 'z' ? [0.3, 0.9, d + 0.02] : [d + 0.02, 0.9, 0.3];
      g.add(at(box(qs[0], qs[1], qs[2], '#e2dacb'), q[0], q[1], q[2]));
    }
  }
}
function signPost(g, text, x, z, ry = 0, bg = '#1f4f8a') {
  const tex = textTexture(text, { width: 640, height: 128, bg, fg: '#ffffff', font: 'bold 54px "Trebuchet MS", sans-serif' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.72), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  const p = new THREE.Group(); p.position.set(x, 0.15, z); p.rotation.y = ry;
  p.add(at(box(0.14, 2.6, 0.14, '#5a3c22'), 0, 1.3, 0)); m.position.set(0, 2.5, 0.09); p.add(m);
  g.add(p);
}
function buildVenice(g) {
  const V = VENICE, W = MAP - 2 * HEDGE;
  g.add(at(box(W, 0.06, W, '#3f8fb0'), MAP / 2, 0.02, MAP / 2));                                // água dos canais (as ilhas ficam por cima)
  for (let k = 0; k < 120; k++) {                                                              // reflexos
    const x = HEDGE + ((k * 37) % 97) / 97 * W, z = HEDGE + ((k * 53) % 89) / 89 * W;
    g.add(at(box(1.8, 0.07, 0.18, '#8cc6ea'), x, 0.03, z));
  }
  for (const w of V.walkways) {                                                                // vielas de pedra (só a pé)
    g.add(at(box(w.x1 - w.x0 + 0.6, 0.6, w.z1 - w.z0, '#d6cdbb'), (w.x0 + w.x1) / 2, -0.15, (w.z0 + w.z1) / 2));
    for (let x = w.x0 + 0.8; x < w.x1; x += 1.6) g.add(at(box(0.05, 0.02, w.z1 - w.z0 - 0.4, '#bfb5a2'), x, 0.16, (w.z0 + w.z1) / 2));
  }
  for (const s of V.campo) {                                                                   // pracinha: piso, poço e bancos
    const o = slotOrigin(s);
    g.add(at(box(LOT + 0.6, 0.9, LOT + 0.6, '#bfb5a2'), o.x + LOT / 2, -0.3, o.z + LOT / 2));
    g.add(at(box(LOT, 0.04, LOT, '#e2dacb'), o.x + LOT / 2, 0.15, o.z + LOT / 2));
    g.add(at(box(2.4, 1.0, 2.4, '#cfc6b4'), o.x + LOT / 2, 0.65, o.z + LOT / 2));
    g.add(at(box(1.6, 0.1, 1.6, '#2e3a46'), o.x + LOT / 2, 1.16, o.z + LOT / 2));
    for (const [dx, dz] of [[-5, 0], [5, 0], [0, -5], [0, 5]]) g.add(at(box(dz ? 2.2 : 0.6, 0.45, dz ? 0.6 : 2.2, '#8a5a36'), o.x + LOT / 2 + dx, 0.4, o.z + LOT / 2 + dz));
    for (const [dx, dz] of [[-6.5, -6.5], [6.5, 6.5]]) { g.add(at(box(0.4, 1.6, 0.4, '#5a3c22'), o.x + LOT / 2 + dx, 0.9, o.z + LOT / 2 + dz)); }
  }
  // Ponte de Rialto: pedra clara, grande arco, escadarias nas pontas e duas fileiras de lojinhas cobertas
  const R = V.rialto;
  deckSteps(g, 'z', R.z0 - 1.2, R.z1 + 1.2, R.x, R.w, R.rise, 28, '#ece4d2');
  const lojas = (sx) => {
    for (const z of [R.z0 + 4.6, R.z0 + 8.0, R.z0 + 11.4, R.z1 - 11.4, R.z1 - 8.0, R.z1 - 4.6]) {
      const t = (z - R.z0 + 1.2) / (R.z1 - R.z0 + 2.4), y = 0.15 + R.rise * 4 * t * (1 - t);
      g.add(at(box(2.0, 2.4, 3.0, '#f2ead8'), R.x + sx * 2.9, y + 1.2, z));
      g.add(at(box(0.08, 1.5, 1.8, '#5b3a22'), R.x + sx * 1.88, y + 1.0, z));
      g.add(at(box(2.4, 0.3, 3.4, '#b5532f'), R.x + sx * 2.9, y + 2.55, z, 0, 0, sx * 0.25));
    }
  };
  lojas(-1); lojas(1);
  const mid = (R.z0 + R.z1) / 2, yTop = 0.15 + R.rise;
  g.add(at(box(R.w, 0.6, 2.4, '#f2ead8'), R.x, yTop + 3.4, mid));                               // pórtico central
  for (const sx of [-1, 1]) g.add(at(box(0.8, 3.2, 2.4, '#f2ead8'), R.x + sx * (R.w / 2 - 0.4), yTop + 1.6, mid));
  g.add(at(box(R.w + 0.4, 0.8, 3.0, '#b5532f'), R.x, yTop + 4.0, mid));
  for (const z of [R.z0 - 0.4, R.z1 + 0.4]) for (const sx of [-1, 1]) g.add(at(box(1.6, 1.4, 1.6, '#cfc6b4'), R.x + sx * (R.w / 2 + 0.3), 0.6, z));   // pegões
  signPost(g, 'PONTE DE RIALTO', R.x + R.w / 2 + 1.4, R.z0 - 2.2, 0, '#7a2f2a');
  for (const b of V.bridges) deckSteps(g, 'x', b.x0, b.x1, b.z, b.w, b.rise, 10, '#e2dacb');     // pontes menores
  // entregas a pé: placa no ponto de entrega (viela) e "ATRACAR" nos cais de onde se chega a pé
  for (const s of [41, 42, 5]) { const d = doorPoint(s); signPost(g, '▼ ENTREGA A PÉ', d.x + 2.8, d.z - 1.4, 0, '#c8402f'); }
  for (const s of [49, 50, 13]) { const o = slotOrigin(s); signPost(g, '⚓ ATRACAR AQUI', o.x + 3.4, o.z + LOT - 0.6, 0, '#c8402f'); }
}
