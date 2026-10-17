// Nível 21 (Operário): casa geminada (uma unidade da fileira: largura 8, paredes laterais encostadas nas vizinhas) no estilo
// das casas do ADRESS (house.js): telhado de duas águas com fileiras de telhas e cumeeira ao longo da rua, oitões, barrado,
// porta com almofadas, degrau e luminária, janelas de moldura branca com cruz e peitoril, jardinzinho da frente com cerca de
// estacas brancas, portão e caminho de pedras, divisas de madeira e quintal dos fundos. Oficina/comércio (largura 16: portão
// largo ou vitrine, toldo, placa, pátio com veículo, pneus, ferramentas), veículos do trânsito (caminhões, vans e carros) e o
// cenário fixo (ruas, calçadas, cruzamentos, postes, pracinhas, pátios de serviço, árvores). Lote centrado, frente em +z.
import * as THREE from 'three';
import { box, cyl, sphere, torus, at, mat, mesh, textTexture, bakeStatic } from './kit.js';
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
  return bakeStatic(g);
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
  return bakeStatic(g);
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
  return g;
}
