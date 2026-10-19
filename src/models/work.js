// Nível 21 (Operário): casa geminada (uma unidade da fileira: largura 8, paredes laterais encostadas nas vizinhas) no estilo
// das casas do ADRESS (house.js): telhado de duas águas com fileiras de telhas e cumeeira ao longo da rua, oitões, barrado,
// porta com almofadas, degrau e luminária, janelas de moldura branca com cruz e peitoril, jardinzinho da frente com cerca de
// estacas brancas, portão e caminho de pedras, divisas de madeira e quintal dos fundos. Oficina/comércio (largura 16: portão
// largo ou vitrine, toldo, placa, pátio com veículo, pneus, ferramentas), veículos do trânsito (caminhões, vans e carros) e o
// cenário fixo (ruas, calçadas, cruzamentos, postes, pracinhas, pátios de serviço, árvores). Lote centrado, frente em +z.
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, at, mat, mesh, textTexture, bakeStatic, vcMerge } from './kit.js';
import { FORESTV, SOLIDS } from '../layout.js';
import { createCrowd, crowdWalkTo, crowdStand, crowdTurn } from './medievalPeople.js';
import { ROW_COL } from '../data.js';
import { WORK, UNIT, SHOPW } from '../workPlan.js';
import { autumnTree } from './forest.js';
import { buildCar, CAR_COLORS } from '../barriers.js';

const G = 0.12;                                     // topo da grama (como GROUND_Y em house.js)
const C = { grass: '#95cc68', path: '#e2d9c5', trim: '#cdc2aa', frame: '#3b2c1e', brass: '#ffdf6e', step: '#cdc2aa', win: '#ffffff', glass: '#8fc6e8',
  post: '#7d5a35', rail: '#a57a4c', picket: '#fbf8f1', pave: '#c9c3b6', pilaster: '#ece4d4', mailDark: '#233f6e', flag: '#e63946' };
const BRICK = '#a5553a';
const shade = (hex, p) => {                         // escurece (p < 0) ou clareia (p > 0), como em house.js
  const n = parseInt(hex.slice(1), 16), t = p < 0 ? 0 : 255, a = Math.abs(p);
  const ch = s => Math.round(((n >> s) & 255) + (t - ((n >> s) & 255)) * a);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
};
let brickTex = null;
const brickMats = new Map();
function brickMat(w, h) {
  if (!brickTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#d8cdbd'; g.fillRect(0, 0, 128, 64);
    for (let r = 0; r < 4; r++) for (let k = -1; k < 4; k++) {
      const x = k * 32 + (r % 2) * 16, y = r * 16;
      g.fillStyle = ['#a5553a', '#9a4c34', '#b05e40', '#984a30'][(r + k + 4) % 4]; g.fillRect(x + 1, y + 1, 30, 14);
    }
    brickTex = new THREE.CanvasTexture(c); brickTex.colorSpace = THREE.SRGBColorSpace; brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  }
  const key = w.toFixed(2) + 'x' + h.toFixed(2);
  if (!brickMats.has(key)) { const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(w / 1.6, h / 0.8); brickMats.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); }
  return brickMats.get(key);
}
const facCol = fac => fac === 'brick' ? BRICK : ROW_COL.fac[fac];
/** Corpo do prédio (paredes) + face da frente com tijolinhos quando a fachada é de tijolo. */
function walls(P, g, fac, w, y0, y1, zb, zf) {
  P(box(w, y1 - y0, zf - zb, facCol(fac)), 0, (y0 + y1) / 2, (zb + zf) / 2);
  if (fac === 'brick') { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), brickMat(w, y1 - y0)); m.position.set(0, (y0 + y1) / 2, zf + 0.02); m.receiveShadow = true; g.add(m); }
}
const geoCache = new Map();
const cached = (k, make) => { let v = geoCache.get(k); if (!v) geoCache.set(k, v = make()); return v; };
/** Prisma: polígono no plano XY extrudado em Z (centrado em z = 0). */
const prismGeo = (key, pts, depth) => cached(key, () => { const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false }); g.translate(0, 0, -depth / 2); return g; });
const prism = (key, pts, depth, color) => mesh(prismGeo(key, pts, depth), color);
const picketMat = () => mat(C.picket, { emissive: '#505048' });   // estacas brancas como em house.js

/** Janela do ADRESS: moldura branca, vidro, cruz e peitoril (virada para +z, encostada em z). */
function windowAt(P, x, y, z, s = 1) {
  P(box(1.9 * s, 1.45 * s, 0.1, C.win), x, y, z + 0.05);
  P(box(1.6 * s, 1.15 * s, 0.06, C.glass), x, y, z + 0.11);
  P(box(0.09, 1.15 * s, 0.05, C.win), x, y, z + 0.15);
  P(box(1.6 * s, 0.09, 0.05, C.win), x, y + 0.02, z + 0.15);
  P(box(2.1 * s, 0.1, 0.26, C.win), x, y - 0.76 * s, z + 0.12);
}
/** Telhado de duas águas do ADRESS (cumeeira ao longo de x, em z = hz): laje escura, fileiras de telhas, juntas na água da
 *  frente e cumeeira. Sem beiral nas laterais: as unidades vizinhas continuam o mesmo telhado. */
function gableRoof(g, w, top, hz, half, rise, col) {
  const T = 0.2, TH = Math.atan2(rise, half), COS = Math.cos(TH), SIN = Math.sin(TH), RIDGE = top + rise, dark = shade(col, -0.42), RW = w;   // (largura exata: telhados vizinhos não se sobrepõem)
  for (const front of [true, false]) {
    const f = new THREE.Group(), len = (half + (front ? 0.2 : 0.5)) / COS;
    f.position.set(0, RIDGE + T * COS, hz + (front ? 1 : -1) * T * SIN);
    if (front) f.rotation.set(TH, 0, 0); else f.rotation.set(-TH, Math.PI, 0);
    f.add(at(box(RW, T, len, dark), 0, -T / 2, len / 2));
    const n = Math.floor((len - 0.12) / 0.62);
    for (let i = 0; i < n; i++) {
      const s0 = 0.1 + i * 0.62, s1 = i === n - 1 ? len - 0.07 : s0 + 0.68, d = +(s1 - s0).toFixed(3);
      const row = new THREE.Group(); row.position.set(0, 0.035, (s0 + s1) / 2); row.rotation.x = -0.09;
      row.add(box(RW, 0.07, d, col));
      if (front) for (let x = -w / 2 + 0.5 + (i % 2) * 0.5; x < w / 2 - 0.3; x += 1.0) row.add(at(box(0.07, 0.03, d - 0.08, dark), x, 0.04, 0.02));
      f.add(row);
    }
    g.add(f);
  }
  g.add(at(box(RW, 0.34, 0.34, dark), 0, RIDGE + T / COS - 0.04, hz, Math.PI / 4, 0, 0));
}
/** Cerca de estacas brancas (pontudas) de x0 a x1 em z, com as duas travessas por trás. */
function pickets(P, g, x0, x1, z) {
  const geo = prismGeo('wpicket', [[-0.21, 0], [0.21, 0], [0.21, 0.76], [0, 0.92], [-0.21, 0.76]], 0.08);
  for (let x = x0 + 0.25; x < x1 - 0.2; x += 0.5) g.add(at(mesh(geo, picketMat()), x, G, z));
  for (const y of [0.26, 0.62]) P(box(x1 - x0, 0.1, 0.06, C.rail), (x0 + x1) / 2, G + y, z - 0.08);
}
/** Divisa de madeira (postes + 2 travessas) ao longo de z, em x. */
function woodRun(P, x, z0, z1) {
  const n = Math.max(1, Math.round((z1 - z0) / 2.6));
  for (let i = 0; i <= n; i++) P(box(0.16, 0.95, 0.16, C.post), x, G + 0.47, z0 + (z1 - z0) * i / n);
  for (const y of [0.35, 0.72]) P(box(0.07, 0.1, z1 - z0, C.rail), x, G + y, (z0 + z1) / 2);
}

export function buildRowLot(h) {
  if (h.kind === 'wsh') return buildWorkshopLot(h);
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const W = WORK.UW, D = WORK.UD, { ZB, ZF, DX } = UNIT, WH = h.floors === 2 ? 5.6 : 3.0, TOP = G + WH, HZ = (ZB + ZF) / 2, FZ = D / 2 - 0.25, R = ROW_COL;
  // chão: grama do lote inteiro e caminho de pedras do portão à porta
  P(box(W, 0.14, D, C.grass), 0, G - 0.07, 0);
  for (let i = 0; i < 3; i++) P(box(1.2, 0.07, 0.82, C.path), DX, G + 0.02, ZF + 0.85 + i * 0.95);
  // casa: paredes, barrado, pilastras nas divisas (separam as unidades na fachada), friso entre os andares
  walls(P, g, h.fac, W, G, TOP, ZB, ZF);
  P(box(W + 0.1, 0.28, ZF - ZB + 0.1, C.trim), 0, G + 0.14, HZ);
  for (const sx of [-1, 1]) P(box(0.3, WH, 0.16, C.pilaster), sx * (W / 2 - 0.15), G + WH / 2, ZF + 0.06);
  if (h.floors === 2) P(box(W, 0.16, 0.14, C.pilaster), 0, G + 2.9, ZF + 0.06);
  // oitões e telhado (cor do telhado = pista)
  P(prism('wgable' + (ZF - ZB), [[-(ZF - ZB) / 2, 0], [(ZF - ZB) / 2, 0], [0, 2.2]], W, facCol(h.fac)), 0, TOP, HZ, 0, Math.PI / 2, 0);
  gableRoof(g, W, TOP, HZ, (ZF - ZB) / 2, 2.2, R.roof[h.roofc]);
  // porta: moldura (escura; branca e larga no estilo "frame"), folha com almofadas (ou visor de vidro), maçaneta, degrau e luminária
  const dc = R.door[h.doorc], dw = 1.3, dh = 2.2, dy = G + 0.16;
  if (h.dstyle === 'frame') { P(box(dw + 0.6, dh + 0.34, 0.1, '#ffffff'), DX, dy + (dh + 0.34) / 2 - 0.1, ZF + 0.05); P(box(dw + 0.9, 0.2, 0.26, '#ffffff'), DX, dy + dh + 0.32, ZF + 0.12); }
  else P(box(dw + 0.3, dh + 0.16, 0.1, C.frame), DX, dy + (dh + 0.16) / 2 - 0.08, ZF + 0.05);
  P(box(dw, dh, 0.12, dc), DX, dy + dh / 2, ZF + 0.1);
  if (h.dstyle === 'visor') { P(box(0.9, 0.7, 0.05, '#ffffff'), DX, dy + 1.55, ZF + 0.17); P(box(0.72, 0.52, 0.05, C.glass), DX, dy + 1.55, ZF + 0.2); }
  else P(box(dw - 0.45, 0.72, 0.06, dc), DX, dy + 1.52, ZF + 0.18);
  P(box(dw - 0.45, 0.72, 0.06, dc), DX, dy + 0.6, ZF + 0.18);
  P(sphere(0.09, C.brass, 8, 6), DX + dw / 2 - 0.2, dy + 1.06, ZF + 0.2);
  P(box(dw + 0.8, 0.16, 0.7, C.step), DX, G + 0.08, ZF + 0.35);
  P(box(0.12, 0.12, 0.2, C.frame), DX - 1.05, dy + 1.7, ZF + 0.1); P(box(0.26, 0.34, 0.26, C.frame), DX - 1.05, dy + 1.58, ZF + 0.25); P(box(0.18, 0.24, 0.28, C.brass), DX - 1.05, dy + 1.58, ZF + 0.25);
  // janelas (frente; fundos simples)
  const wins = [[1.75, G + 1.45]].concat(h.floors === 2 ? [[DX, G + 4.25], [1.75, G + 4.25]] : []);
  for (const [x, y] of wins) windowAt(P, x, y, ZF);
  for (const y of h.floors === 2 ? [G + 1.6, G + 4.25] : [G + 1.6]) { P(box(1.5, 1.2, 0.08, C.win), 1.2, y, ZB - 0.04); P(box(1.25, 0.95, 0.06, C.glass), 1.2, y, ZB - 0.08); }
  if (h.flower) for (const [x, y] of wins) {                                                 // floreiras sob as janelas
    P(box(1.8, 0.3, 0.42, '#7a4a2a'), x, y - 0.95, ZF + 0.32);
    for (let k = 0; k < 5; k++) P(sphere(0.15, ['#e0402a', '#f2c23a', '#ff7ab0', '#9b5de5', '#e0402a'][k], 6, 4), x - 0.68 + k * 0.34, y - 0.72, ZF + 0.34);
  }
  if (h.awn) {                                                                                // toldo listrado sobre a porta
    const ac = R.awn[h.awn];
    for (let k = 0; k < 5; k++) P(box(0.4, 0.06, 0.95, k % 2 ? '#f4f1ea' : ac), DX - 0.8 + k * 0.4, dy + dh + 0.32, ZF + 0.48, 0.35, 0, 0);
    P(box(2.05, 0.18, 0.06, ac), DX, dy + dh + 0.1, ZF + 0.94);
  }
  // jardim da frente: cerca de estacas com o portão, divisas de madeira; fundos com cerca de madeira
  pickets(P, g, -W / 2, DX - 0.75, FZ); pickets(P, g, DX + 0.75, W / 2, FZ);
  for (const x of [DX - 0.75, DX + 0.75]) { P(box(0.22, 1.15, 0.22, C.post), x, G + 0.57, FZ); P(sphere(0.15, picketMat(), 8, 6), x, G + 1.24, FZ); }
  for (const sx of [-1, 1]) { woodRun(P, sx * W / 2, ZF + 0.3, FZ - 0.1); woodRun(P, sx * W / 2, -D / 2 + 0.25, ZB - 0.1); }   // (a divisa coincide com a da vizinha)
  for (let x = -W / 2 + 0.1; x < W / 2; x += 2.6) P(box(0.16, 0.95, 0.16, C.post), Math.min(x, W / 2 - 0.1), G + 0.47, -D / 2 + 0.25);
  for (const y of [0.35, 0.72]) P(box(W, 0.1, 0.07, C.rail), 0, G + y, -D / 2 + 0.25);
  if (h.mail) {                                                                               // caixa de correio (como a do ADRESS), à direita do portão
    const mx = DX + 1.3, mz = FZ - 0.55, mc = R.mail[h.mail];
    P(box(0.16, 1.05, 0.16, C.post), mx, G + 0.52, mz);
    P(box(0.5, 0.06, 0.3, C.post), mx, G + 1.07, mz); P(box(0.95, 0.32, 0.5, mc), mx, G + 1.26, mz);
    P(mesh(cached('wmailDome', () => new THREE.CylinderGeometry(0.25, 0.25, 0.95, 10, 1, false, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2)), mc), mx, G + 1.42, mz);
    P(box(0.05, 0.5, 0.54, C.mailDark), mx - 0.5, G + 1.32, mz);
    P(box(0.06, 0.55, 0.05, C.flag), mx + 0.28, G + 1.5, mz + 0.27); P(box(0.28, 0.2, 0.05, C.flag), mx + 0.15, G + 1.68, mz + 0.27);
  }
  if (h.bench) {                                                                              // banquinho de madeira no jardim
    const bx = 1.75, bz = ZF + 1.05;
    P(box(1.6, 0.1, 0.48, '#8a5a36'), bx, G + 0.46, bz); P(box(1.6, 0.42, 0.08, '#8a5a36'), bx, G + 0.78, bz - 0.22);
    for (const d of [-0.65, 0.65]) P(box(0.1, 0.42, 0.42, '#5a3a22'), bx + d, G + 0.21, bz);
  }
  if (h.bike) {                                                                               // bicicleta encostada na cerca, por dentro
    const bx = 2.1, bz = FZ - 0.45;
    for (const dx of [-0.55, 0.55]) P(torus(0.34, 0.045, '#2b2b2b', 5, 12), bx + dx, G + 0.36, bz);
    P(box(1.1, 0.06, 0.06, '#d8473a'), bx, G + 0.62, bz); P(box(0.06, 0.4, 0.06, '#d8473a'), bx - 0.2, G + 0.5, bz, 0, 0, 0.3);
    P(box(0.3, 0.05, 0.12, '#2b2b2b'), bx - 0.25, G + 0.8, bz); P(box(0.06, 0.06, 0.5, '#2b2b2b'), bx + 0.5, G + 0.86, bz);
  }
  const root = bakeStatic(g);
  root.userData.update = (t, dt) => { const L = WLIFE || (WLIFE = createWorkLife()); if (L) L.lot(root, h, t, dt); };   // vida do bairro (abaixo)
  return root;
}

function buildWorkshopLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const W = WORK.WW, D = WORK.WD, { ZB, ZF, DX } = SHOPW, H = 4.6, R = ROW_COL, shop = h.wtype === 'tools' || h.wtype === 'market', gc = R.gate[h.gate];
  P(box(W, 0.14, D, '#b9b3a6'), 0, 0.07, 0);                                             // pátio de concreto aberto para a calçada
  P(box(W, 0.16, 0.3, C.trim), 0, 0.08, D / 2 - 0.15);                                    // meio-fio do pátio
  if (!shop) for (const [x, z, r] of [[-1.6, ZF + 3.2, 0.9], [1.4, ZF + 4.4, 0.6]]) P(cyl(r, r, 0.02, '#8a857a', 10), x, 0.15, z);   // manchas de óleo
  walls(P, g, h.fac, W, G, G + H, ZB, ZF);
  P(box(W + 0.1, 0.28, ZF - ZB + 0.1, C.trim), 0, G + 0.14, (ZB + ZF) / 2);                    // barrado
  for (const sx of [-1, 1]) P(box(0.34, H + 0.4, 0.2, C.pilaster), sx * (W / 2 - 0.17), G + H / 2 + 0.2, ZF + 0.1);
  P(box(W, 0.6, 0.3, C.pilaster), 0, G + H + 0.25, ZF + 0.12);                           // platibanda
  P(box(W - 0.2, 0.16, ZF - ZB - 0.2, '#7a7f86'), 0, G + H + 0.05, (ZB + ZF) / 2 + 0.1);
  P(box(W, 0.7, 0.2, facCol(h.fac)), 0, G + H + 0.3, ZB + 0.1);
  if (!shop) {                                                                              // portão largo de enrolar + porta do escritório
    P(box(6.6, 3.4, 0.1, C.frame), -2.8, G + 1.7, ZF + 0.04);
    P(box(6.2, 3.2, 0.1, gc), -2.8, G + 1.6, ZF + 0.08);
    for (let y = 0.3; y < 3.2; y += 0.32) P(box(6.2, 0.05, 0.05, shade(gc, -0.3)), -2.8, G + y, ZF + 0.14);
  } else {                                                                                  // loja: vitrine emoldurada na cor do "portão"
    P(box(6.2, 2.5, 0.06, C.glass), -3.2, G + 1.55, ZF + 0.05);
    for (const y of [0.25, 2.85]) P(box(6.5, 0.22, 0.16, gc), -3.2, G + y, ZF + 0.1);
    for (const x of [-6.35, -3.2, -0.05]) P(box(0.2, 2.8, 0.16, gc), x, G + 1.55, ZF + 0.1);
    if (h.wtype === 'market') for (let k = 0; k < 4; k++) { P(box(0.9, 0.5, 0.7, '#a8743e'), -5.0 + k * 1.2, G + 0.25, ZF + 0.8); for (let j = 0; j < 3; j++) P(sphere(0.17, ['#d22a24', '#f2b43a', '#5ea84e', '#ec7a26'][k], 6, 4), -5.25 + k * 1.2 + j * 0.25, G + 0.6, ZF + 0.8); }
  }
  // porta (do escritório ou da loja), com moldura e degrau; janela ao lado (ou o painel de ferramentas)
  P(box(1.5, 2.4, 0.1, shop ? '#f4f1ea' : C.frame), DX, G + 1.2, ZF + 0.05); P(box(1.2, 2.25, 0.12, gc), DX, G + 1.2, ZF + 0.1);
  if (shop) P(box(0.8, 1.3, 0.05, C.glass), DX, G + 1.45, ZF + 0.18); else P(box(0.8, 0.7, 0.06, gc), DX, G + 1.55, ZF + 0.18);
  P(sphere(0.08, C.brass, 8, 6), DX + 0.4, G + 1.1, ZF + 0.2); P(box(2.0, 0.16, 0.7, C.step), DX, G + 0.08, ZF + 0.35);
  if (!h.tools) windowAt(P, 5.6, G + 1.6, ZF);
  const tex = textTexture(h.sign, { width: 1024, height: 128, bg: '#f4f1ea', fg: '#2b2d33', font: 'bold 64px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(0, G + 4.0, ZF + 0.16); g.add(sign);
  P(box(8.7, 1.25, 0.08, gc), 0, G + 4.0, ZF + 0.1);
  if (h.awn) { const ac = R.awn[h.awn], x0 = shop ? -6.25 : 0.95; for (let k = 0; k < 8; k++) P(box(0.75, 0.06, 1.3, k % 2 ? '#f4f1ea' : ac), x0 + k * 0.75, G + 3.2, ZF + 0.62, 0.32, 0, 0); }
  if (h.tires) for (const [x, n] of [[-7.1, 5], [-6.0, 3]]) for (let k = 0; k < n; k++) P(cyl(0.45, 0.45, 0.28, '#1f2023', 12), x, G + 0.16 + k * 0.29, ZF + 1.3);   // pilhas de pneus
  if (h.tools) {                                                                            // ferramentas e peças expostas (bancada + painel)
    P(box(2.4, 0.9, 0.7, '#6b6f76'), 5.6, G + 0.45, ZF + 0.55); P(box(2.4, 1.4, 0.08, '#c9a46a'), 5.6, G + 1.85, ZF + 0.08);
    for (let k = 0; k < 5; k++) P(box(0.08, 0.5, 0.05, ['#d8473a', '#3a78d4', '#efbf2a', '#5a5d63', '#3c9d55'][k]), 4.8 + k * 0.4, G + 1.95, ZF + 0.14, 0, 0, (k % 2) * 0.5);
    for (let k = 0; k < 3; k++) P(cyl(0.18, 0.18, 0.12, '#9aa0a8', 8), 5.0 + k * 0.6, G + 0.96, ZF + 0.55);
  }
  if (h.car) { const c = buildCar(); c.userData.body.material = mat(CAR_COLORS[h.index % CAR_COLORS.length]); c.position.set(-2.8, 0.1, ZF + 3.4); c.rotation.y = Math.PI / 2; g.add(c); }   // veículo parado no pátio
  const root = bakeStatic(g);
  root.userData.update = (t, dt) => { const L = WLIFE || (WLIFE = createWorkLife()); if (L) L.lot(root, h, t, dt); };
  return root;
}

/** Veículos do trânsito (frente em +X, como buildCar): 'truck' (caminhão baú), 'flat' (caminhão de carroceria com carga),
 *  'van' (furgão de entregas) e 'car'. userData.len / userData.wid: medidas para a colisão e a distância de quem vem atrás. */
export function buildWorkVehicle(type, color) {
  if (type === 'car') { const m = buildCar(); m.userData.body.material = mat(color); m.userData.len = 4.6; m.userData.wid = 2.0; return m; }
  const g = new THREE.Group(), a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const wheel = (x, z, r = 0.45) => a(cyl(r, r, 0.32, '#1f2023', 10), x, r, z, Math.PI / 2, 0, 0);
  const brake = mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.1 }), head = mat('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.4 });
  const lights = (xf, xr, y, zz) => { for (const s of [-1, 1]) { a(new THREE.Mesh(cached('wlamp', () => new THREE.BoxGeometry(0.08, 0.24, 0.36)), head), xf, y, s * zz); a(new THREE.Mesh(cached('wlamp', () => new THREE.BoxGeometry(0.08, 0.24, 0.36)), brake), xr, y, s * zz); } };
  if (type === 'van') {                                     // furgão: cabine com capô curto, baú do mesmo corpo, faixa lateral
    const L = 5.0, W = 2.1;
    a(box(3.7, 1.9, W, color), -0.55, 1.45, 0); a(box(1.3, 1.05, W - 0.05, color), 1.95, 0.98, 0);
    a(box(0.9, 0.85, W - 0.15, '#2b4a6e'), 1.4, 1.95, 0, 0, 0, -0.45);                    // para-brisa inclinado
    for (const s of [-1, 1]) { a(box(0.9, 0.6, 0.04, '#2b4a6e'), 1.0, 1.85, s * (W / 2 + 0.01)); a(box(2.5, 0.42, 0.04, '#e8b02a'), -0.8, 1.35, s * (W / 2 + 0.01)); }
    a(box(L, 0.3, W + 0.04, '#2e3036'), 0, 0.55, 0);                                        // para-choques e saia
    for (const x of [-1.6, 1.75]) for (const s of [-1, 1]) wheel(x, s * 0.95, 0.42);
    lights(2.62, -2.44, 0.95, 0.7);
    g.userData.len = L; g.userData.wid = W;
  } else {                                                   // caminhão: cabine na frente, baú (ou carroceria de madeira com carga) atrás
    const L = 6.8, W = 2.4;
    a(box(L - 0.2, 0.3, 1.6, '#2e3036'), -0.1, 0.62, 0);                                    // chassi
    a(box(1.8, 2.0, W, color), 2.4, 1.55, 0); a(box(0.08, 0.9, W - 0.3, '#2b4a6e'), 3.31, 2.05, 0);   // cabine e para-brisa
    for (const s of [-1, 1]) a(box(0.8, 0.6, 0.04, '#2b4a6e'), 2.6, 2.05, s * (W / 2 + 0.01));
    a(box(0.25, 0.4, W, '#2e3036'), 3.32, 0.75, 0);                                         // para-choque
    if (type === 'truck') {
      a(box(4.5, 2.7, W, '#f4f1ea'), -0.95, 2.15, 0); a(box(4.52, 0.2, W + 0.02, color), -0.95, 3.45, 0);
      for (const s of [-1, 1]) a(box(3.6, 0.5, 0.04, color), -0.95, 2.2, s * (W / 2 + 0.01));
    } else {
      a(box(4.5, 0.25, W, '#8a5a36'), -0.95, 0.95, 0);
      for (const s of [-1, 1]) a(box(4.5, 0.55, 0.1, '#a57a4c'), -0.95, 1.35, s * (W / 2 - 0.05));
      a(box(0.1, 0.55, W, '#a57a4c'), -3.17, 1.35, 0);
      for (const [x, z, s, c] of [[-2.2, -0.5, 1.0, '#c9a46a'], [-2.2, 0.55, 0.9, '#b08a5a'], [-0.9, 0, 1.1, '#c9a46a'], [0.3, -0.45, 0.85, '#d8b67a'], [0.3, 0.5, 0.8, '#b08a5a'], [-1.5, 0.1, 0.7, '#d8b67a']])
        a(box(s, s * 0.85, s, c), x, 1.1 + s * 0.42 + (x === -1.5 ? 0.85 : 0), z);
    }
    for (const x of [-2.6, -1.5, 2.4]) for (const s of [-1, 1]) wheel(x, s * 1.1, 0.5);
    lights(L / 2 - 0.05, -L / 2 + 0.1, 0.9, 0.85);
    g.userData.len = L; g.userData.wid = W;
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Cenário fixo do Operário. */
export function buildWorkScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW, SIDE } = WORK, SW = '#cfcac0', ASPH = '#5d6470';
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    add(box(RW + SIDE * 2, 0.1, len + RW + SIDE * 2, SW), cx, 0.05, cz, 0, ry, 0);
    add(box(RW, 0.06, len, ASPH), cx, 0.11, cz, 0, ry, 0);
    if (s.type !== 'lane') for (let t = 4; t < len - 4; t += 2.8) add(box(0.2, 0.02, 1.3, '#f2d45c'), ax + (bx - ax) * t / len, 0.15, az + (bz - az) * t / len, 0, ry, 0);
  }
  for (const [x, z] of Object.values(V.N)) add(box(RW, 0.06, RW, ASPH), x, 0.112, z);
  const bulb = mat('#fff1c8', { emissive: '#ffd36b', emissiveIntensity: 0.7 });
  for (const l of V.lamps) { add(cyl(0.1, 0.13, 5, '#3a3d44', 6), l.x, 2.5, l.z); add(box(0.9, 0.12, 0.3, '#3a3d44'), l.x, 5.0, l.z); add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.22), bulb), l.x, 4.92, l.z); }
  for (const p of V.plazas) {                                                       // pracinha: piso, canteiros, árvore no meio, bancos
    add(cyl(p.r, p.r, 0.1, '#d8cfbd', 16), p.x, 0.06, p.z);
    for (const a of [Math.PI / 2, -Math.PI / 2]) add(box(2.4, 0.4, 1.0, '#7a5434'), p.x + Math.cos(a) * 3.2, 0.25, p.z + Math.sin(a) * 3.2);
    for (const a of [Math.PI / 2, -Math.PI / 2]) for (let k = 0; k < 4; k++) add(sphere(0.22, ['#e0402a', '#f2c23a', '#ff7ab0', '#f4f4f4'][k], 6, 4), p.x + Math.cos(a) * 3.2 - 0.8 + k * 0.55, 0.55, p.z + Math.sin(a) * 3.2);
  }
  for (const b of V.benches) { const bg = new THREE.Group(); bg.position.set(b.x, 0, b.z); bg.rotation.y = b.ry; g.add(bg); bg.add(at(box(2.0, 0.1, 0.55, '#8a5a36'), 0, 0.5, 0)); bg.add(at(box(2.0, 0.5, 0.1, '#8a5a36'), 0, 0.85, -0.25)); for (const d of [-0.85, 0.85]) bg.add(at(box(0.1, 0.5, 0.5, '#3a3d44'), d, 0.25, 0)); }
  for (const y of V.yards) {                                                        // pátio de serviço: piso de concreto, paletes, caixas, tambores
    add(box(y.r * 2, 0.1, y.r * 2, '#b9b3a6'), y.x, 0.06, y.z);
    for (let k = 0; k < 3; k++) add(box(1.2, 0.15, 1.0, '#b08a5a'), y.x - 2 + k * 1.3, 0.2, y.z - 2);
    for (let k = 0; k < 3; k++) add(box(0.8, 0.8, 0.8, '#c9a46a'), y.x - 2 + k * 1.3, 0.65, y.z - 2);
    for (let k = 0; k < 3; k++) add(cyl(0.4, 0.4, 1.0, ['#2f6fb0', '#c8402f', '#3f8a4a'][k], 10), y.x + 1.6 + (k % 2) * 0.9, 0.6, y.z + 1.2 + k * 0.6);
  }
  for (const t of V.trees) autumnTree(g, t.x, 0, t.z, t.s, t.type, 'green', t.k);
  workOutskirts(g, V);
  return g;
}

/** Arredores do bairro operário: a zona industrial em volta. A leste, fábricas de tijolo com telhado de dentes de serra,
 *  chaminés altas (a fumaça sai em createWorkLife), caixa-d'água, docas com contêineres; a oeste, a linha do trem com um
 *  cargueiro parado e a plataforma do pátio de cargas; ao sul, a vila operária continua (fileiras de casas geminadas mais
 *  simples, de cores apagadas, sem destino de entrega) e um gasômetro ao longe. Tudo numa malha só com cor por vértice;
 *  colisão nas construções e no trem (marcadas `out`; a câmera também desvia). Nada perto das árvores de fora que já
 *  existem, da estrada de acesso nem do corredor da cena do monstro. */
const WORK_STACKS = [];                                   // bocas das chaminés (para a fumaça)
function workOutskirts(g, V) {
  const M = V.MAP, CX = M / 2, G2 = new THREE.Group(), add = (m, x, y, z, ry = 0) => G2.add(at(m, x, y, z, 0, ry, 0)), solids = [];
  let seed = 2121; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const old = SOLIDS.filter(b => (b.x1 < -2 || b.x0 > M + 2 || b.z1 < -2 || b.z0 > M + 2) && b.x1 - b.x0 < 2.5).map(b => ({ x: (b.x0 + b.x1) / 2, z: (b.z0 + b.z1) / 2, r: (b.x1 - b.x0) / 0.6 }));
  const clearRect = (x0, z0, x1, z1) => old.every(t => t.x < x0 - t.r || t.x > x1 + t.r || t.z < z0 - t.r || t.z > z1 + t.r) && !(x1 > CX - 20 && x0 < CX + 20 && z0 < 0);
  const solid = (x0, z0, x1, z1, top) => solids.push({ x0, z0, x1, z1, out: true, top });
  const BR = ['#9a4c34', '#a5553a', '#8a4632'], ROOFG = '#7a7f86';
  // fábrica: corpo de tijolo, telhado em dentes de serra (as águas de vidro viradas para o norte), janelas altas, portões
  const factory = (x0, z0, w, d, h) => {
    const cx = x0 + w / 2, cz = z0 + d / 2, bc = BR[Math.floor(rnd() * BR.length)];
    add(box(w, h, d, bc), cx, h / 2, cz); add(box(w + 0.3, 0.5, d + 0.3, '#cfc6b4'), cx, h + 0.25, cz);
    const n = Math.max(3, Math.round(d / 6)), tz = d / n;
    for (let k = 0; k < n; k++) {
      const z = z0 + k * tz, sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(tz, 0), new THREE.Vector2(0, 3.4)]);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: w - 0.4, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); geo.translate(x0 + w - 0.2, h + 0.5, z);
      const m = new THREE.Mesh(geo, mat(k % 2 ? ROOFG : '#8a9098')); G2.add(m);
      add(box(w - 0.5, 2.9, 0.08, '#b8d4e6'), cx, h + 2.0, z + 0.05);                                         // vidraça do dente (virada para o norte)
    }
    for (let x = x0 + 3; x < x0 + w - 2; x += 4.5) for (const zz of [z0 - 0.06, z0 + d + 0.06]) add(box(2.2, 3.2, 0.12, '#3a4a5a'), x, h * 0.55, zz);   // janelões
    add(box(5, 4.4, 0.2, '#5a6a72'), x0 + w * 0.3, 2.2, z0 + d + 0.1); add(box(5, 4.4, 0.2, '#5a6a72'), x0 - 0.1 + 0.0, 2.2, cz, Math.PI / 2);   // portões
    solid(x0, z0, x0 + w, z0 + d, h + 3);
  };
  const chimney = (x, z, hgt) => {
    add(cyl(1.0, 1.5, hgt, '#9a4c34', 12), x, hgt / 2, z); for (let y = 4; y < hgt - 1; y += 5) add(cyl(1.55 - y / hgt * 0.5, 1.6 - y / hgt * 0.5, 0.35, '#7a3a28', 12), x, y, z);
    add(cyl(1.15, 1.05, 0.8, '#3a3d44', 12), x, hgt + 0.2, z); WORK_STACKS.push({ x, y: hgt + 0.7, z });
    solid(x - 1.5, z - 1.5, x + 1.5, z + 1.5, hgt);
  };
  // ---- leste: duas fábricas, chaminés, caixa-d'água e docas ----
  const taken = [], free2 = (x0, z0, x1, z1) => clearRect(x0, z0, x1, z1) && taken.every(r => x1 < r.x0 - 8 || x0 > r.x1 + 8 || z1 < r.z0 - 8 || z0 > r.z1 + 8);
  for (const [w, d, h] of [[44, 54, 9], [52, 62, 10], [40, 46, 8]]) {
    let ok = null;
    for (const ex of [M + 46, M + 62, M + 80, M + 100]) { for (let fz = 10; fz < M + 30 && !ok; fz += 9) if (free2(ex - 3, fz - 3, ex + w + 9, fz + d + 3)) ok = [ex, fz]; if (ok) break; }
    if (!ok) continue;
    taken.push({ x0: ok[0], z0: ok[1], x1: ok[0] + w + 6, z1: ok[1] + d });
    factory(ok[0], ok[1], w, d, h); chimney(ok[0] + w + 4.5, ok[1] + 8 + rnd() * 10, 24 + rnd() * 8);
  }
  { const x = M + 30, z = -26; if (clearRect(x - 5, z - 5, x + 5, z + 5)) {                                    // caixa-d'água no alto
    for (const [dx, dz] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) add(box(0.4, 16, 0.4, '#5a5d63'), x + dx, 8, z + dz);
    add(cyl(4.2, 4.2, 5, '#c9ccd1', 16), x, 18.5, z); add(cone(4.5, 2, '#9aa0a8', 16), x, 22, z); add(box(5.2, 0.3, 0.3, '#5a5d63'), x, 9, z); add(box(0.3, 0.3, 5.2, '#5a5d63'), x, 9, z);
    solid(x - 2.8, z - 2.8, x + 2.8, z + 2.8, 24); } }
  for (let k = 0; k < 10; k++) {                                                                                // contêineres empilhados no pátio da fábrica
    const x = M + 24 + (k % 5) * 3.0, z = 150 + Math.floor(k / 5) * 13, c = ['#c8402f', '#2f6fb0', '#e8a23a', '#3f8a4a', '#8a8f98'][k % 5];
    if (!clearRect(x - 1.5, z - 6, x + 1.5, z + 6)) continue;
    add(box(2.5, 2.6, 12, c), x, 1.3, z); if (k % 3 === 0) add(box(2.5, 2.6, 12, ['#2f6fb0', '#c8402f'][k % 2]), x, 3.9, z);
    for (let r = -5; r <= 5; r += 1) add(box(2.52, 2.2, 0.06, shade(c, -0.22)), x, 1.3, z + r);                   // nervuras
    solid(x - 1.25, z - 6, x + 1.25, z + 6, 3.2);
  }
  // ---- oeste: a linha do trem (lastro, dormentes, trilhos) com um cargueiro parado ----
  const RX = -36;
  add(box(4.4, 0.12, 900, '#8a8072'), RX, 0.02, CX); for (const s of [-0.75, 0.75]) add(box(0.12, 0.14, 900, '#6b6f76'), RX + s, 0.19, CX);
  for (let z = CX - 450; z < CX + 450; z += 0.9) add(box(2.6, 0.08, 0.26, '#5a4632'), RX, 0.11, z);
  { let z0 = 40; while (z0 < 70 && !clearRect(RX - 2, z0, RX + 2, z0 + 110)) z0 += 6;
    const wc = ['#7a3a28', '#8a4a2a', '#5a6a72', '#7a3a28', '#3f6a5a', '#8a4a2a', '#5a6a72', '#7a3a28'];
    add(box(2.9, 3.6, 13, '#2f5a8a'), RX, 2.2, z0 + 6.5); add(box(2.6, 1.2, 4, '#2f5a8a'), RX, 4.6, z0 + 2.5); add(box(2.0, 0.9, 0.2, '#f2d45c'), RX, 2.2, z0 - 0.05);   // locomotiva
    for (let k = 0; k < 7; k++) { const z = z0 + 14.5 + k * 13; add(box(2.9, k % 3 === 2 ? 2.6 : 3.4, 12, wc[k]), RX, k % 3 === 2 ? 1.9 : 2.3, z + 6); if (k % 3 === 2) add(box(2.7, 0.6, 11, '#3a3d44'), RX, 3.4, z + 6); }
    solid(RX - 1.5, z0, RX + 1.5, z0 + 14.5 + 7 * 13, 4.5);
    const PX = RX + 5.2; add(box(4.4, 1.0, 40, '#b9b3a6'), PX, 0.5, z0 + 40); add(box(4.6, 0.12, 40.2, '#e2d9c5'), PX, 1.02, z0 + 40);   // plataforma de cargas
    for (let k = 0; k < 6; k++) add(box(1.2, 0.9, 1.0, '#c9a46a'), PX - 0.8 + (k % 2) * 1.4, 1.5, z0 + 26 + k * 4.5);
    add(box(4.4, 3.6, 10, '#a5553a'), PX + 4.9, 1.8, z0 + 40); add(box(5.0, 0.3, 10.6, '#7a7f86'), PX + 4.9, 3.75, z0 + 40);
    solid(PX - 2.2, z0 + 20, PX + 7.4, z0 + 60, 4); }
  // ---- sul: a vila operária continua (fileiras simples) e o gasômetro ao longe ----
  const FAC = ['#c9b89a', '#b8a888', '#d8c8a8', '#a8988a', '#c4a88a'], RF = ['#8a4632', '#6a5a52', '#7a4a3a'];
  for (const [zr, ry] of [[M + 40, Math.PI], [M + 74, 0]]) for (let x = 14; x < M - 14; x += 44) {
    const n = 4 + Math.floor(rnd() * 2), w = 8, x0 = x, x1 = x + n * w, d = 9, zc = zr + (ry ? -d / 2 - 3 : d / 2 + 3);
    if (!clearRect(x0 - 1, zc - d / 2 - 1, x1 + 1, zc + d / 2 + 1)) continue;
    for (let k = 0; k < n; k++) { const cx = x0 + w / 2 + k * w; add(box(w, 3, d, FAC[(k + Math.floor(x)) % FAC.length]), cx, 1.5, zc);
      const sh = new THREE.Shape([new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, 2.0)]);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); rg.rotateY(Math.PI / 2); rg.translate(cx - w / 2, 3, zc); G2.add(new THREE.Mesh(rg, mat(RF[(k + 1) % RF.length])));
      add(box(1.1, 2.0, 0.1, '#5a4632'), cx - 1.6, 1.0, zc + (ry ? -d / 2 - 0.05 : d / 2 + 0.05)); add(box(1.4, 1.1, 0.1, '#e8e2d4'), cx + 1.6, 1.7, zc + (ry ? -d / 2 - 0.05 : d / 2 + 0.05)); }
    solid(x0, zc - d / 2, x1, zc + d / 2, 5);
  }
  add(box(M + 80, 0.06, 7, '#6a6f78'), CX, 0.02, M + 57);                                                         // a rua dessas fileiras
  { const x = M + 110, z = M + 90; if (clearRect(x - 14, z - 14, x + 14, z + 14)) { add(cyl(12, 12, 16, '#8a9098', 24), x, 8, z); for (let y = 3; y < 16; y += 4) add(cyl(12.3, 12.3, 0.4, '#5a5d63', 24), x, y, z); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; add(box(0.5, 17, 0.5, '#5a5d63'), x + Math.cos(a) * 12.5, 8.5, z + Math.sin(a) * 12.5); } solid(x - 12, z - 12, x + 12, z + 12, 17); } }
  const m = vcMerge(G2); m.name = 'work-outskirts'; g.add(m);
  for (const b of solids) V.cuts.push({ box: b });                     // (layout.js soma `cuts[].box` às colisões sempre que o bairro volta; o plano fica em cache)
  SOLIDS.push(...solids.map(b => ({ ...b })));                          // (e já nesta 1ª montagem)
}

// ---------- Vida do bairro operário ----------
// Nas oficinas: o mecânico ajoelhado ao lado do carro do pátio (aperta, levanta, limpa as mãos, olha a rua), o serralheiro
// soldando o pé do portão de enrolar (faíscas), e quem cuida da loja arrumando a mercadoria na porta. Nas casas: alguém
// varrendo a calçada da frente e duas vizinhas conversando no portão. Nas pracinhas, dois meninos jogando bola; nos pátios de
// serviço, dois carregadores levando caixas de uma pilha para a outra; e alguém voltando do turno com a marmita. Uma multidão
// instanciada (6 desenhos) + vassoura, caixas, bola e faíscas. Dirigido pelo update dos lotes (como no Modernista).
let WLIFE = null;
const lotW = (root, lx, lz) => { const c = Math.cos(root.rotation.y), s = Math.sin(root.rotation.y); return { x: root.position.x + lx * c + lz * s, z: root.position.z - lx * s + lz * c }; };
function createWorkLife() {
  const V = FORESTV; if (!V || !V.work) return null;
  const root = new THREE.Group(); root.name = 'work-life';
  const N = 16, crowd = createCrowd(N, { name: 'work-crowd' }); root.add(crowd.object);
  const P = crowd.people;
  const LOOKS = [
    { shirt: '#3a5a8a', pants: '#2b3a5a', shoes: '#1c1c1c', hat: null, skin: '#c08560', hair: '#222222', belt: '#2b3a5a' },     // 0–2 mecânicos (macacão)
    { shirt: '#5a6a3a', pants: '#4a5530', shoes: '#2b2522', skin: '#e8b48a', hair: '#6b3e26', belt: '#4a5530' },
    { shirt: '#8a4a2a', pants: '#3a3d44', shoes: '#1c1c1c', skin: '#a8714c', hair: '#3b2a1a' },
    { shirt: '#5a5d63', pants: '#3a3d44', shoes: '#2b2522', hat: '#2b2d33', skin: '#d9a074', hair: '#3b2a1a' },                    // 3–4 serralheiros (máscara)
    { shirt: '#6a5040', pants: '#3a3d44', shoes: '#2b2522', hat: '#2b2d33', skin: '#f0c49a', hair: '#8a5a36' },
    { shirt: '#f2efe6', pants: '#5a5048', shoes: '#3a2a20', skin: '#d9a074', hair: '#3b2a1a', long: true },                       // 5–6 lojistas
    { shirt: '#c9a46a', pants: '#4a4a52', shoes: '#3a2a20', skin: '#f5d2b0', hair: '#5a3a22' },
    { shirt: '#9a5a6a', pants: '#4a4a52', shoes: '#3a2a20', skin: '#c08560', hair: '#d8d4cc', long: true },                       // 7 varredora
    { shirt: '#6f8a5a', pants: '#5a4a3a', shoes: '#3a2a20', skin: '#f0c49a', hair: '#a0522d', long: true },                       // 8–9 vizinhas
    { shirt: '#e8c03a', pants: '#3d4a66', shoes: '#2b2522', skin: '#8a5a3c', hair: '#222222', long: true },
    { shirt: '#d8312a', pants: '#2b2f3a', shoes: '#f4f4f4', skin: '#e8b48a', hair: '#3b2a1a' },                                    // 10–11 meninos com a bola
    { shirt: '#2f9ad0', pants: '#2b2f3a', shoes: '#f4f4f4', skin: '#a8714c', hair: '#222222' },
    { shirt: '#e8a23a', pants: '#3a4a5a', shoes: '#2b2522', hat: '#e8c03a', skin: '#d9a074', hair: '#3b2a1a' },                   // 12–13 carregadores (capacete)
    { shirt: '#e8a23a', pants: '#3a4a5a', shoes: '#2b2522', hat: '#e8c03a', skin: '#c08560', hair: '#222222' },
    { shirt: '#4a6a8a', pants: '#2b3a5a', shoes: '#1c1c1c', hat: '#5a5d63', skin: '#f0c49a', hair: '#6b3e26' },                   // 14 voltando do turno
    { shirt: '#7a8a9a', pants: '#3a3d44', shoes: '#2b2522', skin: '#c08560', hair: '#d8d4cc' },                                    // 15 aposentado olhando a rua
  ];
  LOOKS.forEach((o, i) => crowd.look(i, o));
  P[10].scale = P[11].scale = 0.74;
  // ---- objetos ----
  const broom = vcMerge(new THREE.Group().add(at(cyl(0.025, 0.025, 1.3, '#a8743e', 5), 0, 0.55, 0), at(box(0.42, 0.1, 0.12, '#d9b46a'), 0, -0.12, 0.05)));
  broom.matrixAutoUpdate = false; broom.userData.grip = new THREE.Matrix4().makeRotationX(0.9).setPosition(0, -0.55, 0.05); root.add(broom);
  const crateG = vcMerge(new THREE.Group().add(at(box(0.7, 0.55, 0.55, '#c9a46a'), 0, 0, 0), at(box(0.72, 0.06, 0.57, '#a8743e'), 0, 0.15, 0), at(box(0.72, 0.06, 0.57, '#a8743e'), 0, -0.15, 0))).geometry;
  const crates = new THREE.InstancedMesh(crateG, mat('#ffffff', { vertexColors: true }), 2); crates.frustumCulled = false; root.add(crates);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mat('#f4f4f4')); root.add(ball);
  const lunch = vcMerge(new THREE.Group().add(at(box(0.36, 0.22, 0.2, '#9aa0a8'), 0, 0, 0), at(box(0.2, 0.05, 0.05, '#3a3d44'), 0, 0.14, 0)));
  lunch.matrixAutoUpdate = false; lunch.userData.grip = new THREE.Matrix4().makeTranslation(0, -0.6, 0.02); root.add(lunch);
  const NSP = 60, spPos = new Float32Array(NSP * 3).fill(-50), spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
  const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: '#ffd36b', size: 0.12, transparent: true, opacity: 0.95, depthWrite: false })); sparks.frustumCulled = false; root.add(sparks);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#cfe6ff' })); root.add(flash);
  // fumaça das chaminés da zona industrial (arredores): baforadas que sobem, crescem com o vento e somem
  const PUFF = 22, NSM = WORK_STACKS.length * PUFF, smPos = new Float32Array(Math.max(1, NSM) * 3), smCol = new Float32Array(Math.max(1, NSM) * 4);
  const smGeo = new THREE.BufferGeometry(); smGeo.setAttribute('position', new THREE.BufferAttribute(smPos, 3)); smGeo.setAttribute('color', new THREE.BufferAttribute(smCol, 4));
  const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const smoke = new THREE.Points(smGeo, new THREE.PointsMaterial({ size: 7, map: puffTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true })); smoke.frustumCulled = false; root.add(smoke);
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V3 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  // ---- quem trabalha onde (escolhido entre as oficinas e casas desta partida, na ordem em que os lotes chamam) ----
  const slots = { mech: [null, null, null], weld: [null, null], shop: [null, null], sweep: null, chat: null };
  const st = new Map(), S = i => st.get(i) || (st.set(i, {}), st.get(i));
  const claim = (key, root, h) => { const arr = slots[key]; if (Array.isArray(arr)) { if (arr.some(o => o && o.root === root)) return; const k = arr.findIndex(o => !o); if (k >= 0) arr[k] = { root, h, fresh: true }; } else if (!slots[key]) slots[key] = { root, h, fresh: true }; };
  const release = root => { for (const k of Object.keys(slots)) { const v = slots[k]; if (Array.isArray(v)) v.forEach((o, i) => { if (o && o.root === root) v[i] = null; }); else if (v && v.root === root) slots[k] = null; } };
  // ---- pracinha, pátio e caminho de volta do turno ----
  const plaza = V.plazas[0], yard = V.yards[0];
  const longSeg = V.segs.filter(s => s.a[1] === s.b[1] && s.type !== 'lane').sort((a, b) => Math.abs(b.b[0] - b.a[0]) - Math.abs(a.b[0] - a.a[0]))[1] || V.segs[0];
  const walkZ = longSeg.a[1] + WORK.RW / 2 + WORK.SIDE * 0.5, walkX = [Math.min(longSeg.a[0], longSeg.b[0]) + 8, Math.max(longSeg.a[0], longSeg.b[0]) - 8];
  let T = 0, lastT = -1, attached = false;
  const kick = { bx: 0, bz: 0, vx: 0, vz: 0, turn: 0, init: false }, carry = { k: 0, load: [false, false], pause: [0, 0] }, home = { dir: 1, pause: 0 };
  for (const i of [10, 11, 12, 13, 14]) P[i].on = true;
  if (plaza) { P[10].x = plaza.x - 1.5; P[10].z = plaza.z + 1; P[11].x = plaza.x + 1.5; P[11].z = plaza.z - 1; kick.bx = plaza.x; kick.bz = plaza.z; } else P[10].on = P[11].on = false;
  if (yard) { P[12].x = yard.x - 2; P[12].z = yard.z - 0.6; P[13].x = yard.x + 1.5; P[13].z = yard.z + 0.4; } else P[12].on = P[13].on = false;
  P[14].x = walkX[0]; P[14].z = walkZ; P[14].hold = [null, lunch];
  function frame(dt) {
    T += dt; const t = T;
    WORK_STACKS.forEach((st0, j) => { for (let i = 0; i < PUFF; i++) {               // fumaça (o vento leva para leste)
      const u = ((t * 0.07 + i / PUFF + j * 0.37) % 1), o = (j * PUFF + i) * 3, c = (j * PUFF + i) * 4, wob = Math.sin(t * 0.6 + i * 1.7) * 1.2 * u;
      smPos[o] = st0.x + u * 26 + wob; smPos[o + 1] = st0.y + u * 16 + Math.sin(i * 2.3) * 0.6; smPos[o + 2] = st0.z + u * 8 + Math.cos(t * 0.5 + i) * 0.9 * u;
      const g0 = 0.82 + 0.1 * u; smCol[c] = g0; smCol[c + 1] = g0; smCol[c + 2] = g0 + 0.02; smCol[c + 3] = Math.min(1, u * 8) * (1 - u) * 0.75;
    } });
    if (NSM) { smGeo.attributes.position.needsUpdate = true; smGeo.attributes.color.needsUpdate = true; }
    // meninos com a bola na pracinha (passam a bola um para o outro; às vezes um dribla em volta da árvore)
    if (plaza) {
      const k = kick, R = 3.9;
      k.bx += k.vx * dt; k.bz += k.vz * dt; const fr = Math.pow(0.5, dt); k.vx *= fr; k.vz *= fr;
      const d0 = Math.hypot(k.bx - plaza.x, k.bz - plaza.z); if (d0 > R) { const nx = (k.bx - plaza.x) / d0, nz = (k.bz - plaza.z) / d0, vn = k.vx * nx + k.vz * nz; if (vn > 0) { k.vx -= 1.6 * vn * nx; k.vz -= 1.6 * vn * nz; } k.bx = plaza.x + nx * R; k.bz = plaza.z + nz * R; }
      if (d0 < 1.7) { const nx = (k.bx - plaza.x) / (d0 || 1), nz = (k.bz - plaza.z) / (d0 || 1); k.bx = plaza.x + nx * 1.7; k.bz = plaza.z + nz * 1.7; k.vx += nx * 0.5; k.vz += nz * 0.5; }   // (a árvore do meio: a bola bate e volta, e sobra lugar para quem chuta)
      const sp = Math.hypot(k.vx, k.vz), me = P[10 + k.turn], other = P[11 - k.turn];
      ball.position.set(k.bx, 0.3, k.bz); ball.rotation.x += sp * dt / 0.22;
      const ax = other.x - k.bx, az = other.z - k.bz, al = Math.hypot(ax, az) || 1;
      let kx = k.bx - ax / al * 0.5, kz = k.bz - az / al * 0.5; { const dx = kx - plaza.x, dz = kz - plaza.z, d = Math.hypot(dx, dz); if (d < 1.45) { kx = plaza.x + dx / (d || 1) * 1.45; kz = plaza.z + dz / (d || 1) * 1.45; } }
      if (sp < 0.5 && crowdWalkTo(me, kx, kz, 2.4, dt, true)) { crowdTurn(me, Math.atan2(ax, az), 1, 9); const v = 3.2 + Math.random() * 1.6; k.vx = ax / al * v; k.vz = az / al * v; k.turn = 1 - k.turn; }
      crowdStand(other, dt); crowdTurn(other, Math.atan2(k.bx - other.x, k.bz - other.z), dt, 4);
      for (const q of [me, other]) { const dx = q.x - plaza.x, dz = q.z - plaza.z, d = Math.hypot(dx, dz); if (d < 1.4) { q.x = plaza.x + dx / (d || 1) * 1.4; q.z = plaza.z + dz / (d || 1) * 1.4; } }   // (contornam a árvore do meio)
      other.arms[0] = other.arms[2] = sp > 1 ? -0.3 : 0; if (sp < 0.5 && me.amp < 0.2) crowdStand(me, dt);
    }
    // carregadores: levam uma caixa por vez de uma pilha à outra do pátio, e voltam
    if (yard) for (const [j, i] of [[0, 12], [1, 13]]) {
      const p = P[i], A = { x: yard.x - 2 + j * 1.3, z: yard.z - 0.9 }, B = { x: yard.x + 1.2 + j * 0.8, z: yard.z + 0.2 + j * 0.9 };
      if (carry.pause[j] > 0) { carry.pause[j] -= dt; crowdStand(p, dt, Math.sin(t * 0.7 + j) * 0.5); p.lean = carry.pause[j] > 1 ? 0.5 : 0; }
      else { p.lean = 0; const tgt = carry.load[j] ? B : A; if (crowdWalkTo(p, tgt.x, tgt.z, carry.load[j] ? 0.75 : 1.0, dt)) { carry.load[j] = !carry.load[j]; carry.pause[j] = 1.6 + Math.random(); } }
      p.arms[0] = p.arms[2] = carry.load[j] ? -1.2 : 0; p.arms[1] = p.arms[3] = carry.load[j] ? -0.12 : 0.16;
      if (carry.load[j]) { M4.compose(V3.set(p.x + Math.sin(p.ry) * 0.62, 1.05, p.z + Math.cos(p.ry) * 0.62), Q.setFromEuler(E.set(0, p.ry, 0)), ONE); crates.setMatrixAt(j, M4); } else crates.setMatrixAt(j, ZERO);
    }
    crates.instanceMatrix.needsUpdate = true;
    // voltando do turno: anda pela calçada com a marmita; para, olha o relógio, segue (e volta pelo outro lado)
    { const p = P[14], h0 = home;
      if (h0.pause > 0) { h0.pause -= dt; crowdStand(p, dt); p.arms[0] = h0.pause > 1.2 ? -1.5 : 0; p.arms[1] = h0.pause > 1.2 ? -0.45 : 0.16; p.pitch = h0.pause > 1.2 ? 0.4 : 0; }
      else { p.pitch = 0; p.arms[0] = 0; p.arms[1] = 0.16; const x = walkX[h0.dir > 0 ? 1 : 0]; if (crowdWalkTo(p, x, walkZ, 1.05, dt)) { h0.dir = -h0.dir; h0.pause = 3; } else if (Math.random() < dt * 0.04) h0.pause = 2.5; } }
  }
  function lotPeople(dt) {
    const t = T;
    // mecânicos: ajoelhado ao lado do carro, mexendo; de vez em quando levanta, limpa as mãos e olha a rua
    slots.mech.forEach((o, k) => { const p = P[k]; if (!o) { p.on = false; return; } p.on = true; const c = (t + k * 7) % 26;
      const w = lotW(o.root, -1.05, SHOPW.ZF + 3.4 + (k - 1) * 0.6); p.x = w.x; p.z = w.z; const face = o.root.rotation.y - Math.PI / 2;
      if (c < 18) { p.kneel = Math.min(1, (p.kneel || 0) + dt * 2); p.ry = face; p.arms[0] = -1.05 + Math.sin(t * 6 + k) * 0.18; p.arms[2] = -0.9 + Math.sin(t * 5.3 + k) * 0.12; p.arms[1] = p.arms[3] = 0.05; p.pitch = 0.45; p.yaw = 0; }
      else { p.kneel = Math.max(0, (p.kneel || 0) - dt * 2); crowdTurn(p, o.root.rotation.y, dt, 3); p.pitch = 0; const wipe = c < 21; p.arms[0] = wipe ? -0.7 + Math.sin(t * 8) * 0.15 : 0; p.arms[2] = wipe ? -0.7 - Math.sin(t * 8) * 0.15 : 0; p.arms[1] = p.arms[3] = wipe ? -0.25 : 0.16; p.yaw = wipe ? 0 : Math.sin(t * 0.6) * 0.5; }
      });
    // serralheiros: soldando o pé do portão de enrolar (máscara abaixada), faíscas e clarão em rajadas
    let spk = 0;
    slots.weld.forEach((o, k) => { const p = P[3 + k]; if (!o) { p.on = false; return; } p.on = true; const c = (t + k * 5) % 15;
      const w = lotW(o.root, -2.8 + (k ? 1.2 : -1.2), SHOPW.ZF + 1.0); p.x = w.x; p.z = w.z; p.ry = o.root.rotation.y + Math.PI;
      const on = c < 10 && (Math.sin(t * 3.1 + k) > -0.4); p.kneel = 1; p.pitch = on ? 0.5 : 0.1; p.arms[0] = -1.1; p.arms[2] = -0.95; p.arms[1] = p.arms[3] = -0.05;
      if (on && spk === 0) { const f = lotW(o.root, -2.8 + (k ? 1.2 : -1.2), SHOPW.ZF + 0.35); flash.position.set(f.x, 0.55, f.z); flash.visible = Math.random() < 0.7; flash.scale.setScalar(0.6 + Math.random() * 0.8);
        for (let i = 0; i < NSP; i++) { const u = ((t * 1.7 + i / NSP) % 1), a = i * 2.4, sp = 1.2 + (i % 5) * 0.35; spPos[i * 3] = f.x + Math.cos(a) * sp * u; spPos[i * 3 + 1] = Math.max(0.16, 0.55 + 1.6 * u - 4.5 * u * u); spPos[i * 3 + 2] = f.z + Math.sin(a) * sp * u * 0.6 + o.root.rotation.y * 0; }
        spk = 1; } });
    if (!spk) { flash.visible = false; spPos.fill(-50); }
    spGeo.attributes.position.needsUpdate = true;
    // lojistas: arrumam a mercadoria na porta e olham quem passa
    slots.shop.forEach((o, k) => { const p = P[5 + k]; if (!o) { p.on = false; return; } p.on = true; const c = (t + k * 4) % 20;
      const bx = o.h.car ? 0.8 : -3.2, amp = o.h.car ? 0.7 : 1.5;                    // (com o carro no pátio, na frente da vitrine ele não cabe: fica entre o carro e a porta)
      const w = lotW(o.root, bx + (c < 12 ? Math.sin(t * 0.3) * amp : 0), SHOPW.ZF + 1.4); if (o.fresh) { o.fresh = false; p.x = w.x; p.z = w.z; } crowdWalkTo(p, w.x, w.z, 0.6, dt);
      if (p.amp < 0.2) { crowdTurn(p, o.root.rotation.y + (c < 12 ? Math.PI : 0), dt, 3); p.arms[0] = p.arms[2] = c < 12 ? -0.8 + Math.sin(t * 2.5 + k) * 0.2 : 0; p.pitch = c < 12 ? 0.35 : 0; p.yaw = c >= 12 ? Math.sin(t * 0.5) * 0.6 : 0; } });
    // varredora: a calçada da frente da casa, de um lado para o outro
    { const p = P[7], o = slots.sweep; if (!o) { p.on = false; broom.visible = false; } else { p.on = true; broom.visible = true; const s = S('sw');
      s.u = s.u ?? 0; s.dir = s.dir || 1; s.u += s.dir * dt * 0.35; if (s.u > 3 || s.u < -3.5) s.dir = -s.dir;
      const w = lotW(o.root, UNIT.DX + s.u, WORK.UD / 2 + 0.75); if (o.fresh) { o.fresh = false; p.x = w.x; p.z = w.z; } crowdWalkTo(p, w.x, w.z, 0.5, dt); crowdTurn(p, o.root.rotation.y + (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2), dt, 3);
      p.arms[2] = -0.55 + Math.sin(t * 3.4) * 0.35; p.arms[0] = -0.35 + Math.sin(t * 3.4) * 0.3; p.arms[1] = p.arms[3] = -0.1; p.pitch = 0.3; p.hold = [null, broom]; } }
    // vizinhas no portão: uma por dentro (apoiada), outra na calçada
    { const a = P[8], b = P[9], o = slots.chat; if (!o) { a.on = b.on = false; } else { a.on = b.on = true;
      const pa = lotW(o.root, UNIT.DX, WORK.UD / 2 - 0.85), pb = lotW(o.root, UNIT.DX + 0.2, WORK.UD / 2 + 0.85); a.x = pa.x; a.z = pa.z; b.x = pb.x; b.z = pb.z;
      a.ry = o.root.rotation.y; b.ry = a.ry + Math.PI; const c = (t + 2) % 12, aT = c < 5;
      a.arms[0] = a.arms[2] = -0.9; a.arms[1] = a.arms[3] = -0.25; a.lean = 0.18; a.pitch = aT ? Math.sin(t * 1.6) * 0.08 : 0.1;
      b.arms[2] = !aT ? -0.6 + Math.sin(t * 4) * 0.35 : -0.15; b.arms[3] = !aT ? 0.35 : 0.16; b.pitch = c > 10.5 ? -0.25 : 0; a.yaw = c > 10.5 ? 0.4 : 0; } }
  }
  function lotWork(rootLot, h) {
    if (!rootLot.visible) { release(rootLot); return; }
    if (h.kind === 'wsh') {
      const shop = h.wtype === 'tools' || h.wtype === 'market';
      if (shop) claim('shop', rootLot, h); else if (h.car) claim('mech', rootLot, h); else claim('weld', rootLot, h);
    } else if (h.index % 5 === 2) claim('sweep', rootLot, h); else if (h.index % 7 === 4) claim('chat', rootLot, h);
  }
  root.userData.api = { people: P, slots };
  return {
    lot(rootLot, h, t, dt) {
      if (!attached && rootLot.parent) { rootLot.parent.add(root); attached = true; }
      lotWork(rootLot, h);
      if (t !== lastT) { lastT = t; frame(dt); lotPeople(dt); crowd.update(); }
    },
  };
}
