// Nível 17 (Bairro Jardins): casa do condomínio (lote centrado na origem, frente +Z, como os outros pontos), o cenário fixo
// (muro com portaria, ruas curvas, rotatórias, balões de retorno, parque, lago, clube, árvores) e as partes animadas
// (cancela, portãozinho de pedestres e patinhos no lago).
// As casas seguem a linguagem das casas dos Bairros 1–6 (house.js): telhado de telhas em fileiras com cumeeira, janelas de
// moldura branca com cruz, porta com almofadas e luminária, cerca de estacas na frente e de madeira em volta, caixa de
// correio de bandeirinha. Modelos: 'classic' (duas águas de lado), 'chalet' (bico do telhado para a rua), 'ell' (em L) e
// 'garage' (com garagem ao lado).
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, at, mat, mesh, bakeStatic, dynamic, textTexture } from './kit.js';
import { GARD_COL } from '../data.js';
import { GARD } from '../gardenPlan.js';

const GRASS = '#86c25e', HEDGE = '#3f7d3a', PATH = '#e2d8c4', ASPH = '#5d6470', WOOD = '#8a5a36';
const HC = { lawn: '#95cc68', tuft: '#74ab4b', walk: '#e2d9c5', stone: '#e2d9c5', post: '#7d5a35', rail: '#a57a4c', picket: '#fbf8f1',
  trim: '#cdc2aa', frame: '#3b2c1e', brass: '#ffdf6e', winFrame: '#ffffff', glass: '#8fc6e8', mailDark: '#233f6e', flag: '#e63946',
  garage: '#ece8df', garageLine: '#c4beb2', drive: '#cfc8b8' };
const G0 = 0.12;                                    // topo da grama do lote

function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const geoCache = new Map();
/** Prisma: polígono no plano XY extrudado em Z (centrado em z = 0). */
function prism(pts, depth, color) {
  const key = pts.join(';') + '|' + depth;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); geoCache.set(key, g); }
  return mesh(g, color);
}

// ---------- peças da casa (como em house.js) ----------
/** Telhado de duas águas com telhas em fileiras, laje escura na borda, cumeeira e oitões fechando as pontas.
 *  Referencial local: cumeeira ao longo de X (rot = π/2 deixa a cumeeira ao longo de Z). */
function tiledRoof(root, { cx, cz, rot = 0, len, half, rise, top, overEnd = 0.45, overA = 0.45, overB = 0.45, color, wall }) {
  const r = new THREE.Group(); r.position.set(cx, 0, cz); r.rotation.y = rot; root.add(r);
  const dark = shade(color, -0.42), T = 0.2, TH = Math.atan2(rise, half), COS = Math.cos(TH), SIN = Math.sin(TH), RY = top + rise, W = len + 2 * overEnd, ROW = 0.62;
  r.add(at(prism([[-half, 0], [half, 0], [0, rise]], len, wall), 0, top, 0, 0, Math.PI / 2, 0));   // oitões
  for (const south of [true, false]) {
    const f = new THREE.Group();
    f.position.set(0, RY + T * COS, south ? T * SIN : -T * SIN);
    if (south) f.rotation.set(TH, 0, 0); else f.rotation.set(-TH, Math.PI, 0);
    const sl = (half + (south ? overA : overB)) / COS;
    f.add(at(box(W, T, sl, dark), 0, -T / 2, sl / 2));
    const n = Math.floor((sl - 0.12) / ROW);
    for (let i = 0; i < n; i++) {
      const s0 = 0.1 + i * ROW, s1 = i === n - 1 ? sl - 0.07 : s0 + ROW + 0.06, d = +(s1 - s0).toFixed(3);
      const row = new THREE.Group(); row.position.set(0, 0.035, (s0 + s1) / 2); row.rotation.x = -0.09;
      row.add(box(W - 0.16, 0.07, d, color));
      for (let x = -W / 2 + 0.7 + (i % 2) * 0.8; x < W / 2 - 0.3; x += 1.6) row.add(at(box(0.07, 0.03, d - 0.08, dark), x, 0.04, 0.02));
      f.add(row);
    }
    r.add(f);
  }
  r.add(at(box(W + 0.06, 0.34, 0.34, dark), 0, RY + T / COS - 0.04, 0, Math.PI / 4, 0, 0));        // cumeeira
  return RY + T / COS;
}
function windowAt(root, x, y, z, ry = 0, s = 1) {
  const w = new THREE.Group();
  w.add(at(box(1.9 * s, 1.45 * s, 0.1, HC.winFrame), 0, 0, 0.05));
  w.add(at(box(1.6 * s, 1.15 * s, 0.06, HC.glass), 0, 0, 0.11));
  w.add(at(box(0.09, 1.15 * s, 0.05, HC.winFrame), 0, 0, 0.15));
  w.add(at(box(1.6 * s, 0.09, 0.05, HC.winFrame), 0, 0.02, 0.15));
  w.add(at(box(2.1 * s, 0.1, 0.26, HC.winFrame), 0, -0.76 * s, 0.12));
  w.position.set(x, y, z); w.rotation.y = ry; root.add(w);
}
function doorAt(root, x, z, col) {
  const W = 1.6, H = 2.25, y = G0 + 0.16;
  root.add(at(box(W + 0.3, H + 0.16, 0.1, HC.frame), x, y + (H + 0.16) / 2 - 0.08, z + 0.05));
  root.add(at(box(W, H, 0.12, col), x, y + H / 2, z + 0.1));
  root.add(at(box(W - 0.5, 0.75, 0.06, col), x, y + 1.55, z + 0.18));
  root.add(at(box(W - 0.5, 0.75, 0.06, col), x, y + 0.62, z + 0.18));
  root.add(at(sphere(0.1, HC.brass, 8, 6), x + W / 2 - 0.22, y + 1.08, z + 0.2));
  root.add(at(box(W + 1.0, 0.16, 0.8, HC.trim), x, G0 + 0.08, z + 0.4));                      // degrau
  root.add(at(box(0.12, 0.12, 0.2, HC.frame), x - W / 2 - 0.45, y + 1.7, z + 0.1));            // luminária
  root.add(at(box(0.26, 0.34, 0.26, HC.frame), x - W / 2 - 0.45, y + 1.58, z + 0.25));
  root.add(at(box(0.18, 0.24, 0.28, HC.brass), x - W / 2 - 0.45, y + 1.58, z + 0.25));
}
/** Corpo (paredes + barrado) de x0..x1 × z0..z1, n andares. */
function body(root, x0, x1, z0, z1, h, wall) {
  root.add(at(box(x1 - x0, h, z1 - z0, wall), (x0 + x1) / 2, G0 + h / 2, (z0 + z1) / 2));
  root.add(at(box(x1 - x0 + 0.1, 0.28, z1 - z0 + 0.1, HC.trim), (x0 + x1) / 2, G0 + 0.14, (z0 + z1) / 2));
}
function mailbox(root, x, z, col) {
  const g = new THREE.Group(); g.position.set(x, G0, z); g.scale.setScalar(1.25);
  const postH = 1.25, bl = 1.25, bw = 0.66, bh = 0.4, r = bw / 2;
  g.add(at(box(0.2, postH, 0.2, HC.post), 0, postH / 2, 0));
  g.add(at(box(0.6, 0.08, 0.34, HC.post), 0, postH + 0.04, 0));
  g.add(at(box(bl, bh, bw, col), 0, postH + 0.08 + bh / 2, 0));
  let dome = geoCache.get('mailDome');
  if (!dome) geoCache.set('mailDome', dome = new THREE.CylinderGeometry(r, r, bl, 12, 1, false, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2));
  g.add(at(mesh(dome, col), 0, postH + 0.08 + bh, 0));
  g.add(at(box(0.06, bh + r, bw + 0.04, HC.mailDark), -bl / 2 - 0.03, postH + 0.08 + (bh + r) / 2, 0));
  g.add(at(box(0.08, 0.72, 0.06, HC.flag), bl / 2 - 0.25, postH + 0.55, bw / 2 + 0.05));
  g.add(at(box(0.36, 0.26, 0.06, HC.flag), bl / 2 - 0.45, postH + 0.79, bw / 2 + 0.05));
  root.add(g);
}
const PICKET_W = 0.46, PITCH = 0.55, FENCE_H = 1.0;
const picket = () => prism([[-PICKET_W / 2, 0], [PICKET_W / 2, 0], [PICKET_W / 2, FENCE_H - 0.17], [0, FENCE_H], [-PICKET_W / 2, FENCE_H - 0.17]], 0.08, mat(HC.picket, { emissive: '#505048' }));

/** Casa do condomínio (dados em data.js: fachada, telhado, porta, andares, modelo, flores, pergolado, banco na varanda,
 *  portão, caixa de correio e enfeite na entrada). */
export function buildGardLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const C = GARD_COL, wall = C.wall[h.wall], roof = C.roof[h.roofc], doorC = C.door[h.doorc], fl = h.floors, WH = 3.0, H = WH * fl, top = G0 + H;
  const model = h.model || 'classic', rand = rng(h.index * 977 + 31);
  const F = 8.35;                                                        // linha da cerca da frente
  // ---- chão: grama, calçada em volta ----
  P(box(17.2, 0.14, 17.2, HC.lawn), 0, G0 - 0.07, 0);
  for (const [w, d, x, z] of [[18, 0.4, 0, -8.8], [18, 0.4, 0, 8.8], [0.4, 17.2, -8.8, 0], [0.4, 17.2, 8.8, 0]]) P(box(w, 0.19, d, HC.walk), x, 0.08, z);
  // ---- volumes do modelo ----
  let doorX = 0, doorZ = 0.2, gx = 0;
  const facades = [];                                                    // trechos de fachada para os canteiros: [x0, x1, z]
  const porch = { x0: -3.9, x1: 3.9, z: 0.2 };
  if (model === 'ell') {                                                 // em L: corpo atrás + ala avançada à esquerda
    body(g, -4.6, 4.6, -7.2, -2.0, H, wall); body(g, -4.6, -0.4, -2.0, 1.4, H, wall);
    tiledRoof(g, { cx: 0, cz: -4.6, len: 9.2, half: 2.6, rise: 1.8, top, overA: 0.3, color: roof, wall });
    tiledRoof(g, { cx: -2.5, cz: -1.3, rot: Math.PI / 2, len: 5.4, half: 2.1, rise: 1.8, top, overEnd: 0.35, color: roof, wall });
    doorX = 1.0; doorZ = -2.0;
    for (let f = 0; f < fl; f++) { windowAt(g, -2.5, G0 + 1.3 + f * WH, 1.4); windowAt(g, 3.3, G0 + 1.3 + f * WH, -2.0); if (f) windowAt(g, 1.0, G0 + 1.3 + f * WH, -2.0); }
    facades.push([-4.3, -0.7, 1.4], [2.2, 4.3, -2.0]);
    Object.assign(porch, { x0: -0.2, x1: 4.4, z: -2.0 });
  } else if (model === 'garage') {                                       // garagem térrea à esquerda, laje com platibanda
    body(g, -1.4, 4.6, -7.2, 0.2, H, wall);
    tiledRoof(g, { cx: 1.6, cz: -3.5, len: 6.0, half: 3.7, rise: 2.0, top, overA: 0.25, color: roof, wall });
    body(g, -4.7, -1.4, -6.6, 0.2, 2.7, wall);
    P(box(3.5, 0.3, 7.0, HC.trim), -3.05, G0 + 2.85, -3.2);                // platibanda
    P(box(2.6, 2.2, 0.08, HC.garage), -3.05, G0 + 1.1, 0.25);              // portão basculante
    for (let k = 1; k < 5; k++) P(box(2.6, 0.05, 0.1, HC.garageLine), -3.05, G0 + k * 0.44, 0.27);
    P(box(2.6, 0.06, 7.9, HC.drive), -3.0, G0 + 0.02, 4.4);                // entrada de carro
    doorX = 0.3; gx = 1.0;
    for (let f = 0; f < fl; f++) { windowAt(g, 2.9, G0 + 1.3 + f * WH, 0.2); if (f) windowAt(g, 0.3, G0 + 1.3 + f * WH, 0.2); }
    facades.push([1.5, 4.3, 0.2]);
    Object.assign(porch, { x0: -1.2, x1: 4.4 });
  } else {                                                               // clássica (cumeeira de lado) ou chalé (bico para a rua)
    body(g, -4.6, 4.6, -7.2, 0.2, H, wall);
    if (model === 'chalet') {
      tiledRoof(g, { cx: 0, cz: -3.5, rot: Math.PI / 2, len: 7.4, half: 4.6, rise: 3.4, top, overEnd: 0.4, color: roof, wall });
      windowAt(g, 0, top + 1.25, 0.2, 0, 0.6);                            // janelinha do sótão no bico
    } else tiledRoof(g, { cx: 0, cz: -3.5, len: 9.2, half: 3.7, rise: 2.2, top, overA: 0.25, color: roof, wall });
    for (let f = 0; f < fl; f++) { for (const sx of [-1, 1]) windowAt(g, sx * 2.85, G0 + 1.3 + f * WH, 0.2); if (f) windowAt(g, 0, G0 + 1.3 + f * WH, 0.2); }
    facades.push([-4.3, -1.3, 0.2], [1.3, 4.3, 0.2]);
  }
  doorAt(g, doorX, doorZ, doorC);
  // janelas dos lados e dos fundos
  for (let f = 0; f < fl; f++) {
    const y = G0 + 1.5 + f * WH;
    windowAt(g, 4.6, y, -4.4, Math.PI / 2); if (model !== 'garage') windowAt(g, -4.6, y, -4.4, -Math.PI / 2);
    for (const wx of model === 'garage' ? [1.6] : [-2.2, 2.2]) windowAt(g, wx, y, -7.2, Math.PI);
  }
  // ---- varanda com banco (casas com banco) ----
  let pz = 0;
  if (h.bench) {
    const w = porch.x1 - porch.x0, cx = (porch.x0 + porch.x1) / 2, z = porch.z; pz = 1.8;
    P(box(w, 0.22, 1.8, '#bfa98a'), cx, G0 + 0.11, z + 0.9);
    for (const x of [porch.x0 + 0.2, porch.x1 - 0.2]) P(box(0.2, 2.7, 0.2, HC.winFrame), x, G0 + 1.45, z + 1.65);
    P(box(w + 0.3, 0.12, 2.2, roof), cx, G0 + 2.85, z + 1.05, 0.15, 0, 0);
    const bx = model === 'ell' ? 3.3 : model === 'garage' ? 2.9 : -2.4;
    P(box(1.8, 0.12, 0.55, WOOD), bx, G0 + 0.65, z + 0.6); P(box(1.8, 0.5, 0.1, WOOD), bx, G0 + 0.95, z + 0.35);
    for (const dx of [-0.75, 0.75]) P(box(0.1, 0.4, 0.5, '#5a3a22'), bx + dx, G0 + 0.4, z + 0.6);
  }
  // ---- canteiros de flores junto à fachada ----
  if (h.flower) {
    const fc = C.flower[h.flower];
    for (const [x0, x1, z] of facades) {
      const zz = z + (h.bench && x1 > porch.x0 && x0 < porch.x1 && z === porch.z ? pz + 0.2 : 0.3) + 0.65, w = x1 - x0;
      P(box(w, 0.3, 1.3, '#7a5434'), (x0 + x1) / 2, G0 + 0.15, zz);
      P(box(w - 0.2, 0.06, 1.1, '#5e3f25'), (x0 + x1) / 2, G0 + 0.31, zz);
      for (let k = 0; x0 + 0.35 + k * 0.5 < x1 - 0.2; k++) {
        const x = x0 + 0.35 + k * 0.5, z2 = zz + (k % 2 ? 0.25 : -0.25);
        P(cyl(0.04, 0.04, 0.4, '#3f8a3a', 4), x, G0 + 0.52, z2); P(sphere(0.24, fc, 6, 4), x, G0 + 0.78, z2);
      }
    }
  }
  // ---- caminho de pedras do portão até a porta ----
  { const ax = gx, az = F - 0.3, bx = doorX, bz = doorZ + (h.bench && doorZ === porch.z ? pz : 0) + 0.85, len = Math.hypot(bx - ax, bz - az), n = Math.max(3, Math.round(len / 1.05)), ry = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; P(box(1.3, 0.07, len / n - 0.14, HC.stone), ax + (bx - ax) * t, G0 + 0.02, az + (bz - az) * t, 0, ry, 0); } }
  // ---- cercas: estacas brancas na frente (com o portão) e madeira dos lados e no fundo ----
  const pk = picket(), skip = x => Math.abs(x - gx) < 1.55 || (model === 'garage' && x > -4.55 && x < -1.45);
  for (let x = -8.2; x < 8.3; x += PITCH) if (!skip(x)) g.add(at(pk.clone(), x, G0, F));
  const railSeg = (x0, x1) => { if (x1 - x0 > 0.2) for (const ry of [0.28, 0.66]) P(box(x1 - x0, 0.1, 0.06, HC.rail), (x0 + x1) / 2, G0 + ry, F - 0.08); };
  if (model === 'garage') { railSeg(-8.35, -4.55); railSeg(-1.45, gx - 1.5); } else railSeg(-8.35, gx - 1.5);
  railSeg(gx + 1.5, 8.35);
  const woodRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.8)), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (let i = 0; i <= n; i++) P(box(0.18, FENCE_H + 0.05, 0.18, HC.post), x0 + (x1 - x0) * i / n, G0 + (FENCE_H + 0.05) / 2, z0 + (z1 - z0) * i / n);
    for (const ry of [0.35, 0.75]) P(box(alongX ? len : 0.07, 0.11, alongX ? 0.07 : len, HC.rail), (x0 + x1) / 2, G0 + ry, (z0 + z1) / 2);
  };
  woodRun(-8.35, -8.35, 8.35, -8.35); woodRun(-8.35, -8.35, -8.35, F); woodRun(8.35, -8.35, 8.35, F);
  // portão (aberto para dentro) entre pilaretes brancos
  const gc = C.gate[h.gate];
  for (const sx of [-1, 1]) { P(box(0.26, 1.25, 0.26, HC.post), gx + sx * 1.38, G0 + 0.625, F); P(sphere(0.17, mat(HC.picket, { emissive: '#505048' }), 8, 6), gx + sx * 1.38, G0 + 1.36, F); }
  for (const sx of [-1, 1]) {
    const leaf = new THREE.Group(); leaf.position.set(gx + sx * 1.25, G0, F); leaf.rotation.y = -sx * 1.15;   // abertas para dentro
    leaf.add(at(box(1.15, 0.1, 0.08, gc), -sx * 0.575, 0.25, 0), at(box(1.15, 0.1, 0.08, gc), -sx * 0.575, 0.95, 0));
    for (let k = 0; k < 5; k++) leaf.add(at(box(0.09, 0.85, 0.07, gc), -sx * (0.1 + k * 0.24), 0.6, 0));
    g.add(leaf);
  }
  mailbox(g, gx + 2.65, 7.65, C.mail[h.mail]);
  // ---- pergolado (lado direito do jardim) ----
  if (h.pergola) {
    const x = 6.4, z = 4.4;
    for (const [dx, dz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) P(box(0.18, 2.4, 0.18, WOOD), x + dx, G0 + 1.2, z + dz);
    for (const dz of [-1.1, 1.1]) P(box(2.8, 0.16, 0.16, WOOD), x, G0 + 2.44, z + dz);
    for (let k = -2; k <= 2; k++) P(box(0.12, 0.12, 2.8, '#a8743f'), x + k * 0.55, G0 + 2.58, z);
    P(sphere(0.6, '#4f9a3a', 7, 5), x - 1.1, G0 + 2.45, z - 1.1); P(sphere(0.45, '#5aa842', 7, 5), x + 1.1, G0 + 2.5, z + 1.1);
    P(box(1.0, 0.08, 1.0, WOOD), x, G0 + 0.75, z); P(cyl(0.08, 0.08, 0.7, WOOD, 6), x, G0 + 0.4, z);   // mesinha
  }
  // ---- enfeite junto à entrada ----
  if (h.deco === 'statue') { const x = gx - 2.25; P(box(0.7, 0.5, 0.7, '#cfcac0'), x, G0 + 0.25, 7.3); P(sphere(0.38, '#dcd7cc', 8, 6), x, G0 + 0.85, 7.3); P(sphere(0.22, '#dcd7cc', 8, 6), x, G0 + 1.35, 7.3); }
  else if (h.deco === 'vases') for (const sx of [-1, 1]) { P(cyl(0.32, 0.24, 0.6, '#b85c38', 8), gx + sx * 1.8, G0 + 0.3, 7.45); P(sphere(0.38, '#4f9a3a', 7, 5), gx + sx * 1.8, G0 + 0.8, 7.45); }
  // ---- tufinhos de grama nos lados e no fundo ----
  for (let k = 0, n = 0; k < 60 && n < 9; k++) {
    const x = (rand() - 0.5) * 16, z = -8 + rand() * 15;
    if (Math.abs(x) < 5.4 && z < 2.6 || Math.abs(x - 6.4) < 2 && z > 2.8 && z < 6 || Math.abs(x - gx) < 2.4 && z > 5 || z > 7.2 || model === 'garage' && x < -1.2 && x > -4.8) continue;
    for (let j = 0; j < 3; j++) P(cone(0.09, 0.34, HC.tuft, 4), x + (j - 1) * 0.13, G0 + 0.15, z + (j % 2) * 0.08, (j - 1) * 0.25, rand() * 3, (j - 1) * 0.3);
    n++;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.position.y > 0.3 || !!o.parent && o.parent !== g; o.receiveShadow = true; } });
  return bakeStatic(g);
}

// ---------- árvores (InstancedMesh por parte e tipo: poucas chamadas de desenho para centenas de árvores) ----------
const CANOPY = ['#3f8f3a', '#4f9f45', '#367f33'], IPE = ['#e889c4', '#f2c93a', '#e889c4'];
function buildTrees(V) {
  const g = new THREE.Group();
  const sph = new THREE.SphereGeometry(1, 8, 6), trunk = new THREE.CylinderGeometry(0.72, 1, 1, 6), coneG = new THREE.ConeGeometry(1, 1, 7);
  const parts = new Map(), o = new THREE.Object3D(), col = new THREE.Color();
  const put = (key, geo, color, x, y, z, sx, sy, sz, ry = 0) => {
    let p = parts.get(key); if (!p) parts.set(key, p = { geo, list: [] });
    p.list.push([x, y, z, sx, sy, sz, ry, color]);
  };
  for (const t of V.trees) {
    const s = t.s, { x, z } = t;
    if (t.type === 'palm') {                                     // palmeira: tronco fino e alto, folhas em leque
      put('trunkP', trunk, '#8a6a44', x, 2.6 * s, z, 0.2 * s, 5.2 * s, 0.2 * s);
      for (let k = 0; k < 6; k++) put('frond', coneG, '#4c9a3c', x + Math.cos(k * 1.047) * 1.1 * s, 5.0 * s, z + Math.sin(k * 1.047) * 1.1 * s, 0.5 * s, 2.4 * s, 0.22 * s, -k * 1.047);
      put('canopy', sph, '#6b4526', x, 5.25 * s, z, 0.35 * s, 0.3 * s, 0.35 * s);
      continue;
    }
    put('trunk', trunk, '#6b4526', x, 0.8 * s, z, 0.28 * s, 1.6 * s, 0.28 * s);
    if (t.type === 'tall') {                                     // copa alta e estreita
      put('canopy', sph, '#2f7a32', x, 2.6 * s, z, 1.2 * s, 1.5 * s, 1.2 * s); put('canopy', sph, '#367f33', x, 4.0 * s, z, 0.85 * s, 1.1 * s, 0.85 * s);
    } else if (t.type === 'willow') {                            // chorão (beira do lago)
      put('canopy', sph, '#7fb84f', x, 3.0 * s, z, 1.7 * s, 1.1 * s, 1.7 * s); put('cone', coneG, '#8cc45a', x, 1.9 * s, z, 1.9 * s, 2.0 * s, 1.9 * s, 0);
    } else {
      const c = t.type === 'ipe' ? IPE[t.c] : CANOPY[t.c];
      put('canopy', sph, c, x, 2.4 * s, z, 1.5 * s, 1.35 * s, 1.5 * s); put('canopy', sph, t.type === 'ipe' ? shade(c, 0.15) : '#4f9f45', x + 0.6 * s, 3.0 * s, z - 0.3 * s, 1.0 * s, 0.9 * s, 1.0 * s);
    }
  }
  for (const [key, p] of parts) {
    const im = dynamic(new THREE.InstancedMesh(p.geo, mat('#ffffff'), p.list.length));
    p.list.forEach(([x, y, z, sx, sy, sz, ry, c], i) => {
      o.position.set(x, y, z); o.rotation.set(key === 'frond' ? 0 : 0, ry, key === 'frond' ? -1.2 : 0); o.scale.set(sx, sy, sz); o.updateMatrix();
      im.setMatrixAt(i, o.matrix); im.setColorAt(i, col.set(c));
    });
    im.castShadow = true; im.receiveShadow = true; im.name = 'trees:' + key;
    g.add(im);
  }
  return g;
}

/** Cenário fixo dos Jardins. */
export function buildGardenScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW } = GARD, MAP = V.MAP, HD = V.HEDGE;
  const strip = (pts, w, color, y, closed = false) => {            // faixa ao longo de uma polilinha (caminhos, bordas)
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n], len = Math.hypot(bx - ax, bz - az);
      add(box(w, y.h, len + w * 0.35, color), (ax + bx) / 2, y.y, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    }
  };
  // ---- ruas, rotatórias (com ilha florida) e balões de retorno ----
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
    add(box(RW, 0.06, len, ASPH), (ax + bx) / 2, 0.035, (az + bz) / 2, 0, ry, 0);
    for (let t = 3; t < len - 3; t += 4) {
      const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
      if (V.rounds.some(r => Math.hypot(x - r.x, z - r.z) < r.r + 1) || V.culs.some(c => Math.hypot(x - c.x, z - c.z) < c.r + 1)) continue;
      add(box(0.18, 0.07, 1.8, '#f2efe6'), x, 0.04, z, 0, ry, 0);   // faixa tracejada
    }
  }
  for (const [x, z] of Object.values(V.N)) add(cyl(RW / 2, RW / 2, 0.06, ASPH, 18), x, 0.034, z);
  for (const r of V.rounds) {
    add(cyl(r.r, r.r, 0.06, ASPH, 32), r.x, 0.036, r.z);
    add(cyl(r.island, r.island, 0.4, '#d9d2c4', 24), r.x, 0.2, r.z); add(cyl(r.island - 0.3, r.island - 0.3, 0.42, GRASS, 24), r.x, 0.22, r.z);
    for (let k = 0; k < 10; k++) { const a = k * 0.628; add(sphere(0.35, ['#e0402a', '#f2c23a', '#ff7ab0'][k % 3], 6, 4), r.x + Math.cos(a) * 2.2, 0.6, r.z + Math.sin(a) * 2.2); }
    add(cyl(0.2, 0.26, 1.4, '#6b4526', 6), r.x, 1.1, r.z); add(sphere(1.3, '#3f8f3a', 8, 6), r.x, 2.4, r.z);
  }
  for (const c of V.culs) {
    add(cyl(c.r, c.r, 0.06, ASPH, 28), c.x, 0.036, c.z);
    add(cyl(2.2, 2.2, 0.3, '#d9d2c4', 16), c.x, 0.15, c.z); add(cyl(1.9, 1.9, 0.32, GRASS, 16), c.x, 0.16, c.z);   // ilhinha gramada
  }
  // ---- muro em volta (pilares, base e capa) com hera aqui e ali ----
  const WALLC = '#efe6d2', BASE = '#b9ab90', CAP = '#d7cbb1', IVY = '#4f8f3c';
  let wr = 3; const wrand = () => (wr = (wr * 16807) % 2147483647) / 2147483647;
  for (const w of V.walls) {
    const alongX = w.x1 - w.x0 > w.z1 - w.z0, len = alongX ? w.x1 - w.x0 : w.z1 - w.z0, cx = (w.x0 + w.x1) / 2, cz = (w.z0 + w.z1) / 2;
    const T = 1.0, H = 2.6;
    add(box(alongX ? len : T + 0.2, 0.5, alongX ? T + 0.2 : len, BASE), cx, 0.25, cz);
    add(box(alongX ? len : T, H, alongX ? T : len, WALLC), cx, H / 2, cz);
    add(box(alongX ? len : T + 0.3, 0.16, alongX ? T + 0.3 : len, CAP), cx, H + 0.08, cz);
    const n = Math.max(1, Math.round(len / 8));
    for (let k = 0; k <= n; k++) {
      const u = (alongX ? w.x0 : w.z0) + len * k / n, x = alongX ? u : cx, z = alongX ? cz : u;
      add(box(1.5, H + 0.4, 1.5, CAP), x, (H + 0.4) / 2, z); add(box(1.75, 0.2, 1.75, BASE), x, H + 0.5, z);
      if (k < n && wrand() < 0.3) {                              // hera na face de dentro
        const v = u + len / n * (0.3 + wrand() * 0.4), side = alongX ? (cz < MAP / 2 ? 1 : -1) : (cx < MAP / 2 ? 1 : -1), hh = 1.2 + wrand() * 1.2, ww = 2 + wrand() * 2.5;
        add(box(alongX ? ww : 0.2, hh, alongX ? 0.2 : ww, IVY), alongX ? v : cx + side * (T / 2 + 0.1), H - hh / 2 + 0.1, alongX ? cz + side * (T / 2 + 0.1) : v);
      }
    }
  }
  // ---- portaria: portal, guarita, cancela (fora da fusão), passagem de pedestres, muro do nome, lombada ----
  const CX = V.CX, B = V.BOOTH, bx = (B.x0 + B.x1) / 2, bz = (B.z0 + B.z1) / 2;
  for (const x of [CX - 4.6, CX + 4.6]) {                         // pilares do portal com luminárias
    add(box(1.6, 3.6, 1.8, CAP), x, 1.8, HD / 2); add(box(1.9, 0.25, 2.1, BASE), x, 3.72, HD / 2);
    add(cyl(0.14, 0.2, 0.3, '#3b2c1e', 8), x, 4.0, HD / 2); add(sphere(0.32, '#fff3b0', 8, 6, { emissive: '#ffe9a0', emissiveIntensity: 0.6 }), x, 4.35, HD / 2);
  }
  add(box(B.x1 - B.x0, 0.3, B.z1 - B.z0, BASE), bx, 0.15, bz);                               // guarita
  add(box(B.x1 - B.x0, 2.9, B.z1 - B.z0, '#f4f1ea'), bx, 1.6, bz);
  add(box(0.08, 1.3, 4.2, HC.glass), B.x0 - 0.02, 1.9, bz); add(box(3.2, 1.3, 0.08, HC.glass), bx, 1.9, B.z0 - 0.02);   // vidros (rua e chegada)
  add(box(0.1, 0.1, 4.4, '#ffffff'), B.x0 - 0.06, 1.22, bz); add(box(3.4, 0.1, 0.1, '#ffffff'), bx, 1.22, B.z0 - 0.06);
  add(box(0.6, 0.08, 2.4, '#8a5a36'), B.x0 - 0.3, 1.2, bz);                                    // balcãozinho
  add(box(1.0, 2.2, 0.08, '#2f5a3a'), bx + 1, 1.25, B.z1 + 0.02);                              // porta (lado de dentro)
  add(box(B.x1 - B.x0 + 2.2, 0.28, B.z1 - B.z0 + 2.2, '#5f646c'), bx - 0.4, 3.2, bz);          // laje com beiral
  add(box(B.x1 - B.x0 + 2.25, 0.4, 0.1, '#8a5a36'), bx - 0.4, 3.2, B.z0 - 1.12);
  const plate = (text, w, h, x, y, z, ry, bg = '#2f5a3a') => {
    const H = Math.round(768 * h / w), px = Math.min(Math.round(H * 0.62), Math.floor(768 * 1.7 / text.length));   // (a letra cabe na placa)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, { width: 768, height: H, bg, fg: '#fff3d6', font: `bold ${px}px "Trebuchet MS", sans-serif` }) }));
    m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
  };
  plate('PORTARIA', 4.4, 0.8, bx, 3.75, B.z0 - 0.2, Math.PI);
  add(box(0.4, 0.5, 0.4, '#5f646c'), bx - 0.4, 3.55, B.z0 - 0.2);
  add(box(0.7, 1.25, 0.7, '#5f646c'), V.GATE.post, 0.62, V.GATE.z);                           // poste da cancela
  add(box(0.5, 0.18, 0.5, '#f2c23a'), V.GATE.post, 1.3, V.GATE.z);
  for (let k = 0; k < 8; k++) add(box(1.0, 0.1, 1.2, k % 2 ? '#2b2b2b' : '#f2c23a'), CX - 3.5 + k, 0.08, 22.6);   // lombada
  for (const p of V.pedPath) add(box(p.x1 - p.x0, 0.08, p.z1 - p.z0, PATH), (p.x0 + p.x1) / 2, 0.05, (p.z0 + p.z1) / 2);
  { const P = V.PED, cx = (P.x0 + P.x1) / 2;                       // passagem de pedestres: pilaretes e cobertura
    for (const x of [P.x0 - 0.45, P.x1 + 0.45]) add(box(0.9, 3.0, 1.8, CAP), x, 1.5, HD / 2);
    add(box(P.x1 - P.x0 + 2.2, 0.22, 2.6, '#5f646c'), cx, 3.1, HD / 2 + 0.3);
    plate('PEDESTRES', 2.6, 0.45, cx, 2.75, -0.05, Math.PI, '#5f646c');
    for (const dx of [0.3, P.x1 - P.x0 - 0.3]) add(cyl(0.11, 0.11, 0.85, '#d8d2c4', 8), P.x0 + dx, 0.43, HD + 0.3);   // balizadores (só a van)
  }
  { const S = V.SIGN, cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;   // muro baixo com o nome, do lado de fora
    add(box(S.x1 - S.x0, 1.6, S.z1 - S.z0, '#b9ab90'), cx, 0.8, cz); add(box(S.x1 - S.x0 + 0.3, 0.14, S.z1 - S.z0 + 0.3, CAP), cx, 1.67, cz);
    plate('RESIDENCIAL JARDINS', 9.2, 1.0, cx, 0.95, S.z0 - 0.02, Math.PI);
    for (let k = 0; k < 14; k++) add(sphere(0.3, ['#e0402a', '#f2c23a', '#ff7ab0', '#9b5de5'][k % 4], 6, 4), S.x0 + 0.4 + k * 0.7, 0.3, S.z0 - 0.7);
    add(box(S.x1 - S.x0, 0.2, 1.0, '#7a5434'), cx, 0.1, S.z0 - 0.7);
  }
  for (const r of V.islands) {                                     // jardins dos lados da faixa até a cancela: meio-fio e cerca viva baixa
    const west = r.x1 < CX, lx = west ? r.x1 : r.x0;
    add(box(0.3, 0.16, r.z1 - r.z0, '#cfcac0'), lx + (west ? -0.15 : 0.15), 0.08, (r.z0 + r.z1) / 2);
    if (west) add(box(0.8, 0.8, r.z1 - r.z0 - 0.3, HEDGE), lx - 0.7, 0.4, (r.z0 + r.z1) / 2 + 0.15);
    const cuts = west ? [] : [[V.GATE.post - 0.6, V.GATE.post + 0.6], [V.PED.x0 - 0.3, V.PED.x1 + 0.3]];
    let a0 = west ? r.x0 : r.x0 + 0.1;
    for (const [c0, c1] of cuts.concat([[r.x1, r.x1]])) { if (c0 > a0) add(box(c0 - a0, 0.8, 0.8, HEDGE), (a0 + c0) / 2, 0.4, r.z1 - 0.4); a0 = Math.max(a0, c1); }
  }
  for (const [x0, x1] of [[CX - 22, CX - 6], [CX + 15, CX + 22.5]]) for (const z of [6, 10.5]) {   // canteiros do jardim da portaria
    add(box(x1 - x0, 0.25, 2.2, '#7a5434'), (x0 + x1) / 2, 0.13, z);
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.7) add(sphere(0.3, ['#e0402a', '#f2c23a', '#ff7ab0', '#f4f4f4'][Math.floor(x * 3) % 4], 6, 4), x, 0.45, z + (Math.floor(x * 2) % 2 ? 0.4 : -0.4));
  }
  // ---- parque: gramado mais claro, cerca viva baixa (aberturas com balizadores), caminhos, praça do chafariz ----
  const PK = V.PARK;
  add(box(PK.x1 - PK.x0, 0.05, PK.z1 - PK.z0, '#7ab454'), (PK.x0 + PK.x1) / 2, 0.03, (PK.z0 + PK.z1) / 2);
  for (const h of V.hedges) add(box(h.x1 - h.x0, 0.9, h.z1 - h.z0, HEDGE), (h.x0 + h.x1) / 2, 0.45, (h.z0 + h.z1) / 2);
  for (const b of V.bollards) { const L = b.alongX ? b.x1 - b.x0 : b.z1 - b.z0; for (const d of [0.25, L / 2, L - 0.25]) add(cyl(0.12, 0.12, 0.9, '#d8d2c4', 8), b.alongX ? b.x0 + d : (b.x0 + b.x1) / 2, 0.45, b.alongX ? (b.z0 + b.z1) / 2 : b.z0 + d); }
  for (const p of V.parkPaths) add(box(p.x1 - p.x0, 0.06, p.z1 - p.z0, PATH), (p.x0 + p.x1) / 2, 0.05, (p.z0 + p.z1) / 2);
  { const pl = V.plaza;
    add(cyl(pl.r, pl.r, 0.07, PATH, 28), pl.x, 0.055, pl.z); add(torus(pl.r - 2.6, 0.5, '#7a5434', 4, 24), pl.x, 0.12, pl.z, Math.PI / 2, 0, 0);
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; add(sphere(0.3, ['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0'][k % 4], 6, 4), pl.x + Math.cos(a) * (pl.r - 2.6), 0.45, pl.z + Math.sin(a) * (pl.r - 2.6)); }
    add(cyl(1.8, 2.0, 0.6, '#cfcac0', 16), pl.x, 0.3, pl.z); add(cyl(1.6, 1.6, 0.1, '#6fb3e0', 16), pl.x, 0.62, pl.z);
    add(cyl(0.22, 0.28, 1.4, '#cfcac0', 8), pl.x, 1.2, pl.z); add(cyl(0.7, 0.5, 0.25, '#cfcac0', 12), pl.x, 1.9, pl.z); add(sphere(0.25, '#8fd0ff', 8, 6), pl.x, 2.15, pl.z);
  }
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
    } else if (a.k === 'flowers') {                            // jardim de flores em canteiros redondos
      for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; add(cyl(1.5, 1.5, 0.3, '#7a5434', 14), a.x + Math.cos(q) * 5, 0.15, a.z + Math.sin(q) * 5);
        for (let j = 0; j < 6; j++) add(sphere(0.3, ['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0', '#f4f4f4', '#ff9a3a'][k], 6, 4), a.x + Math.cos(q) * 5 + Math.cos(j) * 0.8, 0.5, a.z + Math.sin(q) * 5 + Math.sin(j) * 0.8); }
      add(cyl(1.4, 1.4, 0.3, '#7a5434', 14), a.x, 0.15, a.z); add(sphere(0.9, '#5aa842', 7, 5), a.x, 0.7, a.z);
    } else if (a.k === 'court') {                              // quadra com linhas, traves e alambrado na frente e no fundo
      add(box(17, 0.05, 11, '#3f8a8a'), a.x, 0.05, a.z); add(box(0.15, 0.06, 11, '#f4f4f4'), a.x, 0.08, a.z); add(torus(1.6, 0.07, '#f4f4f4', 4, 20), a.x, 0.08, a.z, Math.PI / 2, 0, 0);
      for (const sx of [-1, 1]) { add(box(0.12, 1.8, 3, '#f4f4f4'), a.x + sx * 8.2, 0.9, a.z); add(box(0.12, 0.12, 3, '#f4f4f4'), a.x + sx * 8.2, 1.8, a.z); }
      for (const sd of [-1, 1]) { add(box(18, 2.4, 0.06, '#8a9099', { transparent: true, opacity: 0.45 }), a.x, 1.2, a.z + sd * 6); for (let x = -9; x <= 9; x += 3) add(cyl(0.06, 0.06, 2.5, '#5a5f66', 5), a.x + x, 1.25, a.z + sd * 6); }
    }
  }
  // ---- lago: água (mais escura no meio), borda de pedras, passeio, juncos, vitórias-régias e a casinha dos patos ----
  const L = V.lake, shape = pts => { const s = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))); const geo = new THREE.ShapeGeometry(s, 4); geo.rotateX(-Math.PI / 2); return geo; };
  g.add(at(mesh(shape(L.shore), mat('#4aa3d8', { roughness: 0.35 })), 0, 0.05, 0));
  g.add(at(mesh(shape(L.inner), mat('#3a8cc6', { roughness: 0.35 })), 0, 0.06, 0));
  strip(L.shore, 0.8, '#b8b0a2', { h: 0.34, y: 0.17 }, true);
  strip(L.promenade, 2.2, PATH, { h: 0.06, y: 0.05 }, true);
  { const [px] = L.promenade.reduce((a, p) => p[0] > a[0] ? p : a, [-1e9, 0]); add(box(78 - px + 0.6, 0.06, 2.4, PATH), (px + 78) / 2, 0.05, V.PZ); }   // passeio ↔ abertura oeste do parque
  for (const r of L.reeds) for (let k = 0; k < r.n; k++) {
    const x = r.x + Math.cos(k * 2.3) * 0.45, z = r.z + Math.sin(k * 2.3) * 0.45, hh = 1.1 + (k % 3) * 0.25;
    add(cyl(0.04, 0.05, hh, '#5f8f3a', 4), x, hh / 2, z, (k % 2 ? 0.1 : -0.08), 0, (k % 3 - 1) * 0.08); if (k % 2) add(cyl(0.09, 0.09, 0.32, '#6b4526', 6), x, hh - 0.1, z);
  }
  for (const p of L.pads) { add(cyl(p.r, p.r, 0.04, '#4f9a3a', 10), p.x, 0.09, p.z); if (p.flower) add(sphere(0.18, '#ff9ccf', 6, 4), p.x + p.r * 0.3, 0.2, p.z); }
  { const x = L.x + 2, z = L.z - L.rz * 0.32;                       // casinha dos patos numa plataforma flutuante
    add(box(2.6, 0.25, 2.6, '#9a7046'), x, 0.15, z); add(box(1.5, 1.0, 1.3, '#d8b48a'), x, 0.8, z);
    add(cone(1.25, 0.8, '#b5402f', 4), x, 1.7, z, 0, Math.PI / 4, 0); add(box(0.55, 0.55, 0.06, '#3b2c1e'), x, 0.6, z + 0.66);
    add(box(0.9, 0.08, 1.4, '#9a7046'), x, 0.12, z + 1.8, -0.25, 0, 0);
  }
  // ---- clube: salão, estacionamento e piscina cercada ----
  const CL = V.club, hall = CL.hall, hx = (hall.x0 + hall.x1) / 2, hz = (hall.z0 + hall.z1) / 2, hw = hall.x1 - hall.x0, hd = hall.z1 - hall.z0;
  add(box(hw, 3.6, hd, '#f4f2ec'), hx, 1.8, hz); add(box(hw + 0.1, 0.3, hd + 0.1, HC.trim), hx, 0.15, hz);
  add(box(hw + 2.4, 0.35, hd + 2.4, '#5f646c'), hx, 3.78, hz);                                 // laje com beiral
  for (let x = hall.x0 + 2; x < hall.x1 - 1; x += 3.2) add(box(2.4, 2.3, 0.08, HC.glass), x, 1.45, hall.z1 + 0.02);   // vidros para a piscina
  for (let z = hall.z0 + 2; z < hall.z1 - 1; z += 3.2) add(box(0.08, 2.3, 2.4, HC.glass), hall.x1 + 0.02, 1.45, z);   // e para o estacionamento
  for (let x = hall.x0 + 1; x < hall.x1; x += 1.4) add(box(0.18, 0.18, 4.4, WOOD), x, 3.3, hall.z1 + 2.1);           // pergolado
  for (const x of [hall.x0 + 0.6, hall.x1 - 0.6]) add(box(0.25, 3.3, 0.25, WOOD), x, 1.65, hall.z1 + 4.1);
  plate('CLUBE JARDINS', 7, 1.1, hall.x1 + 0.08, 3.05, hz, Math.PI / 2);
  const lot = CL.lot;
  add(box(lot.x1 - lot.x0, 0.06, lot.z1 - lot.z0, ASPH), (lot.x0 + lot.x1) / 2, 0.036, (lot.z0 + lot.z1) / 2);
  for (let z = lot.z0 + 2; z <= lot.z1 - 2; z += 3.2) add(box(5, 0.07, 0.14, '#f4f1ea'), lot.x0 + 3, 0.045, z);
  const dk = CL.deck, pool = CL.pool;
  add(box(dk.x1 - dk.x0, 0.12, dk.z1 - dk.z0, '#e8dcc4'), (dk.x0 + dk.x1) / 2, 0.06, (dk.z0 + dk.z1) / 2);
  add(box(pool.x1 - pool.x0 + 1.0, 0.18, pool.z1 - pool.z0 + 1.0, '#f4f4f4'), (pool.x0 + pool.x1) / 2, 0.1, (pool.z0 + pool.z1) / 2);
  add(box(pool.x1 - pool.x0, 0.06, pool.z1 - pool.z0, '#3fc0e8', { roughness: 0.3 }), (pool.x0 + pool.x1) / 2, 0.17, (pool.z0 + pool.z1) / 2);
  for (let z = pool.z0 + 3; z < pool.z1 - 2; z += 4) add(box(pool.x1 - pool.x0 - 0.5, 0.02, 0.1, '#f4f4f4'), (pool.x0 + pool.x1) / 2, 0.21, z);   // raias
  for (let k = 0; k < 4; k++) {                                   // espreguiçadeiras e guarda-sóis
    const z = pool.z0 + 3 + k * 5.5, x = pool.x1 + 2.2;
    add(box(0.8, 0.3, 2.0, '#ffffff'), x, 0.35, z); add(box(0.8, 0.1, 0.8, '#ffffff'), x, 0.65, z - 0.8, -0.6, 0, 0);
    if (k % 2 === 0) { add(cyl(0.05, 0.05, 2.4, '#5a5f66', 5), x + 1.3, 1.25, z + 1.2); add(cone(1.4, 0.6, k % 4 ? '#e0402a' : '#2f78d0', 8), x + 1.3, 2.5, z + 1.2); }
  }
  for (const [x0, z0, x1, z1] of [[dk.x0, dk.z0, dk.x1, dk.z0], [dk.x0, dk.z1, dk.x1, dk.z1], [dk.x0, dk.z0, dk.x0, dk.z1], [dk.x1, dk.z0, dk.x1, dk.z1]]) {   // grade baixa (vidro e pilaretes)
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = x1 !== x0;
    add(box(alongX ? len : 0.06, 1.0, alongX ? 0.06 : len, '#bfe3f0', { transparent: true, opacity: 0.4 }), (x0 + x1) / 2, 0.62, (z0 + z1) / 2);
    for (let u = 0; u <= len + 0.01; u += 2) add(box(0.12, 1.15, 0.12, '#f4f4f4'), alongX ? x0 + u : x0, 0.6, alongX ? z0 : z0 + u);
  }
  // ---- vagas perto das passagens para as casas do parque ----
  for (const p of V.parking) for (const dx of [-5, -2.5, 0, 2.5, 5]) add(box(0.12, 0.07, 2.6, '#f4f1ea'), p.x + dx, 0.045, p.z + p.n * 1.4);
  // ---- árvores ----
  g.add(buildTrees(V));
  return g;
}

/** Cancela da portaria (fica fora da fusão de malhas do cenário: gira em main.js). Nos Jardins o poste fica do lado da guarita
 *  (leste) e o braço atravessa a rua para oeste (rotation.y = π: o rotation.z de main.js continua levantando a ponta). */
export function buildGateArm(V) {
  const east = V.GATE.post != null;                 // (sem `post`, como no Modernista: poste a oeste e braço para leste)
  const arm = new THREE.Group(); arm.position.set(east ? V.GATE.post : V.GATE.x0 - 0.5, 1.1, V.GATE.z); if (east) arm.rotation.y = Math.PI;
  for (let k = 0; k < 8; k++) arm.add(at(box(1.0, 0.16, 0.16, k % 2 ? '#d8312a' : '#f4f4f4'), (east ? 0.45 : 0.5) + k * 1.0, 0, 0));
  return arm;
}

/** Partes animadas dos Jardins: portãozinho de pedestres (abre sozinho para o personagem) e patinhos dando a volta no lago.
 *  userData.update(dt, t, walker|null). Os patos não têm colisão. */
export function buildGardLive(V) {
  const g = new THREE.Group(); g.name = 'garden-live';
  // portãozinho: folha de grade presa no pilarete oeste, abre para dentro
  const P = V.PED, leaf = new THREE.Group(); leaf.position.set(P.x0, 0, P.z); g.add(leaf);
  const W = P.x1 - P.x0, IRON = '#2f4a3a';
  leaf.add(at(box(W, 0.1, 0.08, IRON), W / 2, 0.3, 0), at(box(W, 0.1, 0.08, IRON), W / 2, 1.9, 0));
  for (let x = 0.12; x < W; x += 0.28) leaf.add(at(box(0.06, 1.7, 0.06, IRON), x, 1.1, 0));
  leaf.add(at(sphere(0.07, '#e8b02a', 6, 4), W - 0.2, 1.1, 0.06));
  let open = 0;
  // patos: corpo, bico e olhos em 3 InstancedMesh (cor do corpo por pato)
  const bodyG = new THREE.SphereGeometry(1, 9, 6); bodyG.scale(0.3, 0.2, 0.42);
  const parts = [
    [bodyG, 0, 0.16, 0], [new THREE.SphereGeometry(0.16, 8, 6), 0, 0.42, 0.28], [new THREE.ConeGeometry(0.1, 0.24, 6).rotateX(-0.9), 0, 0.3, -0.38],
  ];
  const whiteG = mergeParts(parts);
  const beakG = new THREE.BoxGeometry(0.12, 0.05, 0.16).translate(0, 0.4, 0.47);
  const eyeG = mergeParts([[new THREE.SphereGeometry(0.03, 5, 4), 0.1, 0.46, 0.36], [new THREE.SphereGeometry(0.03, 5, 4), -0.1, 0.46, 0.36]]);
  const D = [{ s: 1.8, c: '#f6f4ee', lap: 0 }, { s: 0.9, c: '#f2d24e', lap: 0.016 }, { s: 0.9, c: '#f2d24e', lap: 0.028 }, { s: 0.9, c: '#f2d24e', lap: 0.04 }, { s: 0.9, c: '#f2d24e', lap: 0.052 },
    { s: 1.7, c: '#8a6a4a', lap: 0.5, rev: true }, { s: 1.7, c: '#f6f4ee', lap: 0.535, rev: true }];
  const ims = [[whiteG, '#ffffff'], [beakG, '#f0a020'], [eyeG, '#1d1d1d']].map(([geo, c]) => { const m = dynamic(new THREE.InstancedMesh(geo, mat(c), D.length)); m.castShadow = true; m.frustumCulled = false; g.add(m); return m; });
  D.forEach((d, i) => ims[0].setColorAt(i, new THREE.Color(d.c)));
  const path = V.lake.duckPath, n = path.length, cum = [0];
  for (let i = 0; i < n; i++) { const [ax, az] = path[i], [bx, bz] = path[(i + 1) % n]; cum.push(cum[i] + Math.hypot(bx - ax, bz - az)); }
  const total = cum[n], o = new THREE.Object3D();
  const at2 = s => { s = ((s % total) + total) % total; let i = 0; while (cum[i + 1] < s) i++; const [ax, az] = path[i], [bx, bz] = path[(i + 1) % n], f = (s - cum[i]) / (cum[i + 1] - cum[i]); return [ax + (bx - ax) * f, az + (bz - az) * f, Math.atan2(bx - ax, bz - az)]; };
  g.userData.update = (dt, t, walker) => {
    const near = walker && Math.hypot(walker.x - (P.x0 + P.x1) / 2, walker.z - P.z) < 3.6;
    open += ((near ? 1 : 0) - open) * Math.min(1, dt * 4);
    leaf.rotation.y = -open * 1.45;
    const v = 0.55;                                               // velocidade (unidades por segundo)
    D.forEach((d, i) => {
      const [x, z, h] = at2(d.rev ? -t * v + d.lap * total : t * v - d.lap * total);   // os filhotes vêm logo atrás da mãe
      o.position.set(x, 0.07 + Math.sin(t * 3 + i * 1.7) * 0.025, z);
      o.rotation.set(Math.sin(t * 2.4 + i) * 0.05, h + (d.rev ? Math.PI : 0) + Math.sin(t * 1.3 + i) * 0.12, 0);
      o.scale.setScalar(d.s); o.updateMatrix();
      for (const m of ims) m.setMatrixAt(i, o.matrix);
    });
    for (const m of ims) m.instanceMatrix.needsUpdate = true;
  };
  g.userData.update(0, 0, null);
  return g;
}
function mergeParts(list) {
  const geos = list.map(([geo, x, y, z]) => { const q = (geo.index ? geo.toNonIndexed() : geo.clone()); q.deleteAttribute('uv'); return q.translate(x, y, z); });
  let pos = 0; for (const q of geos) pos += q.attributes.position.count;
  const out = new THREE.BufferGeometry(), P = new Float32Array(pos * 3), N = new Float32Array(pos * 3); let k = 0;
  for (const q of geos) { if (!q.attributes.normal) q.computeVertexNormals(); P.set(q.attributes.position.array, k * 3); N.set(q.attributes.normal.array, k * 3); k += q.attributes.position.count; }
  out.setAttribute('position', new THREE.BufferAttribute(P, 3)); out.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  return out;
}
