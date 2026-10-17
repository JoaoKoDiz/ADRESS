// Nível 13 (Morro): casas de laje (destinos de entrega), casas de enchimento e o cenário fixo do morro: faixas de altura
// com muros de contenção, rua sinuosa, ladeiras, escadarias, vagas, becos, mercadinho, pracinha e quadra.
// Estilo do jogo: caixas simples, cores chapadas. A colisão fica em layout.js; a altura do chão em favelaPlan.js.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, bakeStatic, textTexture } from './kit.js';
import { FAV_FACADE, FAV_AWNING } from '../data.js';
import { FAV } from '../favelaPlan.js';

export const FAV_FLOOR = 2.8;
const SLAB = '#a7a39b', WIN = '#2d3640', FRAME = '#e9e2d2', DOOR = '#6a4a2c', TANK = '#1f78d1', MORTAR = '#d9b49a';
const ASPHALT = '#5d6470', CONC = '#b3a993', WALLC = '#9a9285', CAP = '#cfc6b4', ALLEY = '#d2c8b4', STEP = '#c9bfab';

/** Medidas de uma casa do Morro (a planta cabe em 6.4 × 6.4; com escada lateral, a casa é mais estreita). */
export function favSize(h) {
  const st = h.items.includes('stairs');
  return { w: st ? 5.0 : 5.6 + (h.index % 3) * 0.35, d: 5.4 + (h.index % 2) * 0.6, n: h.floors, st };
}

/** Casa de laje, centrada na origem, frente para +Z. */
export function buildFavelaLot(h) {
  const root = new THREE.Group(); root.name = 'fav:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const { w, d, n, st } = favSize(h), col = FAV_FACADE[h.fac], H = n * FAV_FLOOR, ox = st ? -0.6 : 0;
  const brick = h.fac === 'brick';
  // andares (o de cima às vezes um pouco recuado: a casa "cresceu" aos poucos)
  for (let f = 0; f < n; f++) {
    const inset = f > 0 && (h.index + f) % 3 === 0 ? 0.35 : 0;
    add(box(w - inset, FAV_FLOOR, d - inset, col), ox, FAV_FLOOR * (f + 0.5), -inset / 2);
    add(box(w + 0.1, 0.16, d + 0.1, SLAB), ox, FAV_FLOOR * (f + 1) - 0.02, 0);          // laje de cada andar
    if (brick) for (let k = 1; k < 6; k++) add(box(w - inset + 0.02, 0.05, 0.04, MORTAR), ox, FAV_FLOOR * f + k * 0.46, d / 2 - inset + 0.01);
    // janelas da frente (1 ou 2 por andar) com moldura
    const wins = f === 0 ? [w * 0.28] : (h.index + f) % 2 ? [-w * 0.24, w * 0.24] : [0];
    for (const x of wins) {
      add(box(1.15, 1.0, 0.08, FRAME), ox + x, FAV_FLOOR * f + 1.6, d / 2 + 0.03);
      add(box(0.95, 0.82, 0.1, WIN), ox + x, FAV_FLOOR * f + 1.6, d / 2 + 0.05);
    }
    if (f > 0) add(box(0.9, 0.7, 0.08, WIN), ox + (w / 2 + 0.03) * (f % 2 ? 1 : -1), FAV_FLOOR * f + 1.6, 0, 0, Math.PI / 2, 0);   // janela lateral
  }
  // porta
  add(box(1.05, 2.05, 0.1, DOOR), ox - w * 0.2, 1.03, d / 2 + 0.05);
  add(box(1.3, 0.14, 0.5, CAP), ox - w * 0.2, 0.07, d / 2 + 0.25);                     // degrau
  // mureta da laje (parapeito baixo) e ferros de espera nos cantos
  const yT = H + 0.06;
  for (const [x, z, ww, dd] of [[0, d / 2, w, 0.16], [0, -d / 2, w, 0.16], [-w / 2, 0, 0.16, d], [w / 2, 0, 0.16, d]]) add(box(ww, 0.5, dd, SLAB), ox + x, yT + 0.25, z);
  if (h.index % 2 === 0) for (const [x, z] of [[-1, -1], [1, -1]]) add(box(0.06, 0.9, 0.06, '#5a3b2c'), ox + x * (w / 2 - 0.2), yT + 0.45, z * (d / 2 - 0.2));
  // caixas-d'água azuis (grandes, bem visíveis na laje)
  for (let k = 0; k < h.tanks; k++) {
    const x = ox + (h.tanks === 1 ? w * 0.18 : (k ? 1 : -1) * w * 0.22), z = -d * 0.18;
    add(cyl(0.8, 0.72, 1.25, TANK, 14), x, yT + 0.65, z);
    add(cyl(0.86, 0.86, 0.14, '#3d8fe0', 14), x, yT + 1.33, z);
  }
  // varal na laje: postes, corda e roupas coloridas
  if (h.items.includes('laundry')) {
    const z = d / 2 - 0.9;
    for (const s of [-1, 1]) add(box(0.1, 1.9, 0.1, '#6b6b6b'), ox + s * (w / 2 - 0.35), yT + 0.95, z);
    add(box(w - 0.7, 0.04, 0.04, '#eeeeee'), ox, yT + 1.85, z);
    ['#e84a5f', '#ffd23f', '#3fa7d6', '#ffffff', '#7bc950'].forEach((c, i) => {
      const x = ox - w / 2 + 0.75 + i * (w - 1.5) / 4;
      add(box(0.7, i % 2 ? 0.9 : 0.65, 0.05, c), x, yT + 1.85 - (i % 2 ? 0.47 : 0.35), z);
    });
  }
  // vasos com plantas dos dois lados da porta
  if (h.items.includes('pots')) for (const s of [-1, 1]) {
    const x = ox - w * 0.2 + s * 1.05;
    add(cyl(0.34, 0.26, 0.55, '#b5532f', 8), x, 0.28, d / 2 + 0.45);
    add(sphere(0.48, '#3f8f3a', 7, 5), x, 0.85, d / 2 + 0.45);
  }
  // toldo sobre a porta
  if (h.awning) {
    const c = FAV_AWNING[h.awning];
    add(box(2.4, 0.12, 1.3, c), ox - w * 0.2, 2.45, d / 2 + 0.6, 0.32, 0, 0);
    for (let k = -1; k <= 1; k++) add(box(0.7, 0.32, 0.05, k % 2 ? c : '#ffffff'), ox - w * 0.2 + k * 0.8, 2.15, d / 2 + 1.22);
  }
  // escada externa até a laje (na lateral direita), com corrimão
  if (st) {
    const sx = ox + w / 2 + 0.6, nSt = Math.round(H / 0.32), run = d - 0.4;
    for (let k = 0; k < nSt; k++) {
      const y = (k + 1) * H / nSt;
      add(box(1.1, 0.16, run / nSt + 0.05, STEP), sx, y - 0.08, d / 2 - 0.2 - (k + 0.5) * run / nSt);
    }
    add(box(0.08, 0.08, Math.hypot(H, run), '#8a8a8a'), sx + 0.55, H / 2 + 0.9, 0, Math.atan2(H, run), 0, 0);   // corrimão
    add(box(1.1, 0.16, 0.9, STEP), sx, H - 0.08, -d / 2 + 0.25);
  }
  return bakeStatic(root);
}

const FILL = ['#c9b8a6', '#bdb5a6', '#d3cbbb', '#a8b0ad', '#c7a99a', '#b9a58a', '#a9a49b'];   // tons apagados (as cores vivas são das casas de entrega)
/** Casa de enchimento (sem entrega): reboco cinza ou caiada, laje, janela e porta; às vezes uma caixa-d'água cinza. */
function filler(g, f, k) {
  const add = (m, x, y, z, ry = 0) => g.add(at(m, x, y, z, 0, ry, 0));
  const w = f.x1 - f.x0, d = f.z1 - f.z0, cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, H = f.floors * FAV_FLOOR, c = FILL[f.tone];
  const rawTop = f.raw && f.floors > 1;                               // último andar ainda no bloco (obra parada)
  add(box(w, H - (rawTop ? FAV_FLOOR : 0), d, c), cx, f.y + (H - (rawTop ? FAV_FLOOR : 0)) / 2, cz);
  if (rawTop) add(box(w - 0.1, FAV_FLOOR, d - 0.1, '#8e8a83'), cx, f.y + H - FAV_FLOOR / 2, cz);
  add(box(w + 0.1, 0.16, d + 0.1, SLAB), cx, f.y + H + 0.06, cz);
  const face = k % 4;                                                 // janelas numa face qualquer (o casario fica virado para todo lado)
  for (let fl = 0; fl < f.floors; fl++) {
    const y = f.y + fl * FAV_FLOOR + 1.6;
    if (face === 0) add(box(0.95, 0.8, 0.08, WIN), cx, y, f.z1 + 0.04);
    else if (face === 1) add(box(0.95, 0.8, 0.08, WIN), cx, y, f.z0 - 0.04);
    else add(box(0.08, 0.8, 0.95, WIN), face === 2 ? f.x1 + 0.04 : f.x0 - 0.04, y, cz);
  }
  if (f.tank) add(cyl(0.6, 0.55, 0.9, '#8c9196', 10), cx + w * 0.2, f.y + H + 0.6, cz - d * 0.15);
}

/** Cenário do Morro (tudo estático). F = plano (favelaPlan.js), MAP e HEDGE do layout. */
export function buildFavelaScene(g, F, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { B1, B2, H1, H2, RW } = FAV, X0 = HEDGE, X1 = MAP - HEDGE;
  const slab = (x0, x1, z0, z1, y0, y1, side = WALLC, top = CONC) => {
    if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
    add(box(x1 - x0, y1 - y0 - 0.06, z1 - z0, side), (x0 + x1) / 2, y0 + (y1 - y0 - 0.06) / 2, (z0 + z1) / 2);
    add(box(x1 - x0, 0.06, z1 - z0, top), (x0 + x1) / 2, y1 - 0.03, (z0 + z1) / 2);
  };
  // faixas do morro: blocos com buracos nas ladeiras/escadarias (no trecho em que elas cortam a faixa)
  const cuts = F.ramps.concat(F.stairs);
  for (const [B, y0, y1] of [[B1, 0, H1], [B2, H1, H2]]) {
    const across = cuts.filter(r => r.z0 < B && r.z1 > B), zc = Math.max(...across.map(r => r.z1));
    slab(X0, X1, zc, MAP - HEDGE, y0, y1);
    let x = X0;
    for (const r of across.sort((a, b) => a.x0 - b.x0)) { slab(x, r.x0 - 0.6, B, zc, y0, y1); x = r.x1 + 0.6; }
    slab(x, X1, B, zc, y0, y1);
    // muro de contenção: faixas horizontais na face e parapeito no alto (aberto nas ladeiras e escadarias)
    let px = X0;
    for (const r of across) {
      if (r.x0 - 0.6 > px) { add(box(r.x0 - 0.6 - px, 0.9, 0.35, CAP), (px + r.x0 - 0.6) / 2, y1 + 0.45, B + 0.18); add(box(r.x0 - 0.6 - px, 0.14, 0.06, '#857d70'), (px + r.x0 - 0.6) / 2, (y0 + y1) / 2, B - 0.02); }
      px = r.x1 + 0.6;
    }
    add(box(X1 - px, 0.9, 0.35, CAP), (px + X1) / 2, y1 + 0.45, B + 0.18);
    add(box(X1 - px, 0.14, 0.06, '#857d70'), (px + X1) / 2, (y0 + y1) / 2, B - 0.02);
    for (let x2 = X0 + 4; x2 < X1; x2 += 9) if (!across.some(r => x2 > r.x0 - 1.5 && x2 < r.x1 + 1.5)) add(box(0.5, y1 - y0, 0.4, '#8f877a'), x2, (y0 + y1) / 2, B - 0.15);   // pilaretes do muro
  }
  // ruas: trechos retos de asfalto + discos nas curvas (a rua faz curvas de verdade, sem grade)
  for (const s of F.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, L = Math.hypot(bx - ax, bz - az), y = F.bandY(s.band) + 0.03;
    add(box(RW, 0.06, L, ASPHALT), (ax + bx) / 2, y, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    for (let t = 2; t < L - 2; t += 4) add(box(0.22, 0.07, 1.4, '#f2d45c'), ax + (bx - ax) * t / L, y + 0.01, az + (bz - az) * t / L, 0, Math.atan2(bx - ax, bz - az), 0);
  }
  for (const r of F.roads) for (const [x, z] of r.pts.slice(1, -1)) add(cyl(RW / 2, RW / 2, 0.06, ASPHALT, 20), x, F.bandY(r.band) + 0.031, z);   // (nas pontas das ladeiras, não)
  // ladeiras (a van sobe): rampa de asfalto, muretas laterais e faixas
  for (const r of F.ramps) {
    const len = Math.hypot(r.z1 - r.z0, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, r.z1 - r.z0), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, y = (r.h0 + r.h1) / 2;
    add(box(r.x1 - r.x0, 0.3, len, ASPHALT), cx, y - 0.12, cz, -ang, 0, 0);
    for (const x of [r.x0 - 0.3, r.x1 + 0.3]) {
      add(box(0.6, Math.max(r.h0, r.h1) + 1, r.z1 - r.z0, WALLC), x, (Math.max(r.h0, r.h1) + 1) / 2 - 0.5 + Math.min(r.h0, r.h1) * 0, cz);
    }
    for (let k = 0.06; k < 0.95; k += 0.12) add(box(0.22, 0.32, 1.3, '#f2d45c'), cx, r.h0 + (r.h1 - r.h0) * k + 0.05, r.z0 + (r.z1 - r.z0) * k, -ang, 0, 0);
    // base sólida embaixo da rampa (para não ver o vão)
    const n = 8;
    for (let k = 0; k < n; k++) { const z0 = r.z0 + (r.z1 - r.z0) * k / n, z1 = r.z0 + (r.z1 - r.z0) * (k + 1) / n, top = r.h0 + (r.h1 - r.h0) * k / n - 0.3;
      if (top - r.h0 > 0.1) add(box(r.x1 - r.x0, top - Math.min(r.h0, 0), z1 - z0, WALLC), cx, (top + Math.min(r.h0, 0)) / 2, (z0 + z1) / 2); }
  }
  // escadarias (só a pé): degraus coloridos de cimento, muretas e corrimão
  for (const st of F.stairs) {
    const n = 20, dz = (st.z1 - st.z0) / n, cx = (st.x0 + st.x1) / 2;
    for (let k = 0; k < n; k++) {
      const top = st.h0 + (st.h1 - st.h0) * (k + 1) / n;
      add(box(st.x1 - st.x0, top - st.h0 + 0.02, dz, k % 2 ? STEP : CAP), cx, st.h0 + (top - st.h0) / 2, st.z0 + dz * (k + 0.5));
    }
    const len = Math.hypot(st.z1 - st.z0, st.h1 - st.h0), ang = Math.atan2(st.h1 - st.h0, st.z1 - st.z0);
    for (const s of [-1, 1]) {
      const x = s < 0 ? st.x0 - 0.3 : st.x1 + 0.3;
      add(box(0.6, st.h1 - st.h0 + 0.8, st.z1 - st.z0, WALLC), x, st.h0 + (st.h1 - st.h0 + 0.8) / 2 - 0.4, (st.z0 + st.z1) / 2);
      add(box(0.12, 0.12, len, '#e8e2d4'), x - s * 0.5, (st.h0 + st.h1) / 2 + 1.0, (st.z0 + st.z1) / 2, -ang, 0, 0);
    }
    sign(g, 'ESCADARIA ▲', cx + 3.8 * 0 + (st.x1 - st.x0) / 2 + 1.6, st.h0, st.z0 - 2.2, '#c8402f');
  }
  // estacionamentos ao pé das escadarias: asfalto e vagas pintadas
  for (const p of F.pads) {
    add(box(p.x1 - p.x0, 0.06, p.z1 - p.z0, ASPHALT), (p.x0 + p.x1) / 2, p.y + 0.035, (p.z0 + p.z1) / 2);
    for (let x = p.x0 + 1.5; x <= p.x1 - 1.4; x += 3.4) add(box(0.16, 0.08, 4.4, '#ffffff'), x, p.y + 0.06, p.z1 - 2.6);
    sign(g, 'P  VAGAS', p.x1 - 1.2, p.y, p.z1 - 0.6, '#2a64c2');
  }
  // becos de cimento entre a rua/vaga e a escadaria
  for (const a of F.alleys) add(box(a.x1 - a.x0, 0.07, a.z1 - a.z0, ALLEY), (a.x0 + a.x1) / 2, a.y + 0.04, (a.z0 + a.z1) / 2);
  // mercadinho: fachada amarela, letreiro, toldo listrado e caixotes de frutas na frente
  {
    const m = F.market, cx = (m.x0 + m.x1) / 2, w = m.x1 - m.x0, dd = m.z1 - m.z0;
    add(box(w, 4.2, dd, '#f4d35e'), cx, 2.1, (m.z0 + m.z1) / 2);
    add(box(w + 0.2, 0.2, dd + 0.2, SLAB), cx, 4.25, (m.z0 + m.z1) / 2);
    add(box(4.2, 2.6, 0.1, '#3a3a3a'), cx, 1.3, m.z1 + 0.05);
    for (let k = 0; k < 8; k++) add(box(w / 8, 0.12, 1.8, k % 2 ? '#ffffff' : '#d23a2e'), m.x0 + w / 16 + k * w / 8, 3.2, m.z1 + 0.85, 0.3, 0, 0);
    const tex = textTexture('MERCADINHO', { width: 512, height: 110, bg: '#2f9a4a', fg: '#ffffff', font: 'bold 68px "Trebuchet MS", sans-serif' });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.9), new THREE.MeshLambertMaterial({ map: tex }));
    add(plate, cx, 4.35 + 0.95 - 0.2 + 0.2, m.z1 + 0.06);
    add(box(9.2, 2.1, 0.12, '#2f9a4a'), cx, 4.45 + 0.6, m.z1 - 0.02);
    for (const [x, c] of [[-4.5, '#ff8c1a'], [-3.3, '#e8312f'], [3.3, '#ffd23f'], [4.5, '#7bc950']]) {
      add(box(1.0, 0.6, 0.8, '#a0703d'), cx + x, 0.3, m.z1 + 0.8);
      for (let k = -1; k <= 1; k++) add(sphere(0.2, c, 6, 4), cx + x + k * 0.28, 0.7, m.z1 + 0.8);
    }
  }
  // pracinha (área de convivência): piso, bancos, árvore, poste e mesa de dominó
  {
    const q = F.square, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, y = q.y;
    add(box(q.x1 - q.x0, 0.16, q.z1 - q.z0, '#cdbf9f'), cx, y + 0.08, cz);
    for (const [x, z, r] of [[-9, -6, 0], [9, -6, 0], [-9, 6, 0], [9, 6, 0], [0, -8, 0]]) {
      add(box(3.2, 0.14, 0.8, '#8a5a36'), cx + x, y + 0.6, cz + z, 0, r, 0);
      add(box(3.2, 0.7, 0.12, '#8a5a36'), cx + x, y + 0.95, cz + z - 0.4, 0, r, 0);
      for (const s of [-1, 1]) add(box(0.14, 0.55, 0.6, '#555555'), cx + x + s * 1.4, y + 0.28, cz + z, 0, r, 0);
    }
    add(cyl(0.35, 0.45, 3.2, '#6b4526', 8), cx, y + 1.6, cz); add(sphere(3.0, '#3f8f3a', 9, 6), cx, y + 4.6, cz);
    add(cyl(1.0, 1.0, 0.1, '#e8e2d4', 12), cx + 5, y + 0.9, cz + 1); add(cyl(0.15, 0.15, 0.85, '#777777', 6), cx + 5, y + 0.45, cz + 1);
    for (const a of [0, 1.6, 3.2, 4.8]) add(cyl(0.35, 0.35, 0.5, '#d23a2e', 8), cx + 5 + Math.cos(a) * 1.5, y + 0.25, cz + 1 + Math.sin(a) * 1.5);
    add(cyl(0.1, 0.12, 4.5, '#4a4a4a', 6), cx - 12, y + 2.25, cz + 8); add(box(0.9, 0.3, 0.5, '#fff3c4'), cx - 12, y + 4.5, cz + 8);
  }
  // quadra: piso verde, linhas brancas, traves e alambrado baixo
  {
    const c = F.court, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, y = c.y, W = c.x1 - c.x0, D = c.z1 - c.z0;
    add(box(W, 0.12, D, '#3f9a5a'), cx, y + 0.06, cz);
    add(box(W - 2, 0.14, D - 2, '#4fb06a'), cx, y + 0.07, cz);
    for (const [w, d, x, z] of [[W - 2, 0.16, 0, -(D / 2 - 1)], [W - 2, 0.16, 0, D / 2 - 1], [0.16, D - 2, -(W / 2 - 1), 0], [0.16, D - 2, W / 2 - 1, 0], [0.16, D - 2, 0, 0]]) add(box(w, 0.16, d, '#ffffff'), cx + x, y + 0.1, cz + z);
    add(cyl(2.2, 2.2, 0.15, '#ffffff', 20), cx, y + 0.08, cz); add(cyl(2.0, 2.0, 0.17, '#4fb06a', 20), cx, y + 0.09, cz);
    for (const s of [-1, 1]) {
      const x = cx + s * (W / 2 - 1.2);
      for (const z of [-1.5, 1.5]) add(box(0.14, 2.0, 0.14, '#ffffff'), x, y + 1.0, cz + z);
      add(box(0.14, 0.14, 3.1, '#ffffff'), x, y + 2.0, cz);
    }
    for (const [w, d, x, z] of [[W, 0.08, 0, -D / 2], [W, 0.08, 0, D / 2], [0.08, D, -W / 2, 0], [0.08, D, W / 2, 0]]) add(box(w, 1.6, d, '#7d858c'), cx + x, y + 0.8, cz + z);
  }
  // postes com fios emaranhados ao longo das ruas
  // (cada poste fica na calçada, fora do asfalto; fios bem acima da câmera)
  F.roads.forEach((r, ri) => {
    const y = F.bandY(r.band), ps = F.poles[ri];                     // (posições no plano: os bichos também desviam deles)
    for (const [x, z] of ps) { add(cyl(0.14, 0.18, 9, '#7a7a7a', 6), x, y + 4.5, z); add(box(1.4, 0.12, 0.12, '#5a5a5a'), x, y + 8.6, z); }
    for (let i = 0; i < ps.length - 1; i++) {
      const [ax, az] = ps[i], [bx, bz] = ps[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (const o of [-0.3, 0, 0.35]) add(box(0.04, 0.04, L, '#222222'), (ax + bx) / 2 + o, y + 8.4 - Math.abs(o), (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    }
  });
  // casario de enchimento
  F.fillers.forEach((f, k) => filler(g, f, k));
  return g;
}

/** Placa num poste (texto curto), base no chão y. */
function sign(g, text, x, y, z, bg) {
  const tex = textTexture(text, { width: 512, height: 128, bg, fg: '#ffffff', font: 'bold 64px "Trebuchet MS", sans-serif' });
  for (const ry of [0, Math.PI]) g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshLambertMaterial({ map: tex })), x, y + 2.4, z + (ry ? -0.02 : 0.02), 0, ry, 0));
  g.add(at(cyl(0.07, 0.07, 2.4, '#555555', 6), x, y + 1.2, z - 0.04));
}

// ---- Entorno (fora da sebe; favelaPlan.js → outside) ----
const OUT_TONES = ['#c9b8a6', '#bdb5a6', '#d3cbbb', '#a8b0ad', '#c7a99a', '#b9a58a', '#a9a49b', '#b5654a', '#a85a42', '#d9c27a', '#8fb0b8', '#c98f7a', '#9fb38f'];
const TALL_TONES = ['#cfc7b8', '#b7b2a8', '#d8cfae', '#a9b6bd', '#c4a58e'];
const GROUND_TONES = ['#b3a993', '#a8957a', '#9c8a6e', '#98a564'];      // topo dos terraços: cimento, terra; os de fora puxam para o verde
const CLOTHES = ['#e84a5f', '#ffd23f', '#3fa7d6', '#ffffff', '#7bc950'];
/** Entorno do Morro: aterro sobre a sebe (onde o morro está alto), terraços descendo até a planície, casas decorativas,
 *  prédios mais altos e algumas árvores. Tudo instanciado (poucas chamadas de desenho) e sem sombras; nada aqui é destino,
 *  pista ou SPOT. Os sólidos e as caixas da câmera vêm do plano. */
export function buildFavelaOutside(F) {
  const O = F.outside, g = new THREE.Group(); g.name = 'favela-outside';
  const L = {};
  const put = (k, x, y, z, sx, sy, sz, c, ry = 0) => (L[k] = L[k] || []).push([x, y, z, sx, sy, sz, c, ry]);   // y = base (as caixas nascem no chão; as vidraças, no centro)
  for (const f of O.fills) put('box', (f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2, f.x1 - f.x0, f.y, f.z1 - f.z0, CONC);
  for (const c of O.cells) put('box', (c.x0 + c.x1) / 2, -0.02, (c.z0 + c.z1) / 2, c.x1 - c.x0, Math.max(0.06, c.t + 0.02), c.z1 - c.z0, GROUND_TONES[c.tone]);
  for (const h of O.houses) {
    const w = h.x1 - h.x0, d = h.z1 - h.z0, cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2, H = h.floors * FAV_FLOOR, y = h.y, rawH = h.raw ? FAV_FLOOR : 0;
    put('box', cx, y, cz, w, H - rawH, d, h.tall ? TALL_TONES[h.tone % TALL_TONES.length] : OUT_TONES[h.tone]);
    if (rawH) put('box', cx, y + H - rawH, cz, w - 0.1, rawH, d - 0.1, '#8e8a83');            // último andar ainda no bloco
    put('box', cx, y + H - 0.04, cz, w + 0.12, 0.16, d + 0.12, SLAB);                         // laje
    // janelas (e a porta) numa face: normal (fx, fz), deslocamento ao longo da face (um plano só, rente à parede)
    const win = (fx, fz, yy, off, c = WIN, ww = 0.95, hh = 0.8) => {
      if (fx) put('pane', fx > 0 ? h.x1 + 0.02 : h.x0 - 0.02, yy + hh / 2, cz + off, ww, hh, 1, c, fx * Math.PI / 2);
      else put('pane', cx + off, yy + hh / 2, fz > 0 ? h.z1 + 0.02 : h.z0 - 0.02, ww, hh, 1, c, fz > 0 ? 0 : Math.PI);
    };
    const along = (fx) => (fx ? d : w);
    if (h.tall) {                                                    // prédio: janelas em grade nas quatro faces, caixa-d'água e antena no topo
      for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = Math.max(1, Math.floor(along(fx) / 2.1));
        for (let f = 0; f < h.floors; f++) for (let k = 0; k < n; k++) win(fx, fz, y + f * FAV_FLOOR + 1.1, (k - (n - 1) / 2) * along(fx) / n, (f + k + h.k) % 7 ? WIN : '#e9d9a6');
      }
      put('box', cx - w * 0.25, y + H + 0.12, cz, 0.08, 2.6, 0.08, '#6b6b6b');
    } else {
      const sx = h.k % 2 ? 1 : -1;                                   // a face de dentro (virada para o morro) e uma lateral
      for (let f = 0; f < h.floors; f++) {
        const yy = y + f * FAV_FLOOR + 1.2, a = along(h.fx);
        if (f === 0) { win(h.fx, h.fz, y, -a * 0.2, DOOR, 1.0, 2.0); win(h.fx, h.fz, yy, a * 0.25); }
        else if ((h.k + f) % 2) { win(h.fx, h.fz, yy, -a * 0.24); win(h.fx, h.fz, yy, a * 0.24); }
        else win(h.fx, h.fz, yy, 0);
        if (h.fx) win(0, sx, yy, 0); else win(sx, 0, yy, 0);
        if ((h.k + f) % 3 === 0) win(-h.fx, -h.fz, yy, 0);       // de vez em quando, uma janela para fora também
      }
      if (h.laundry) {                                               // varal na laje
        const yt = y + H + 0.12, zz = h.fz ? cz + h.fz * (d / 2 - 0.8) : cz, xx = h.fx ? cx + h.fx * (w / 2 - 0.8) : cx;
        const span = (h.fx ? d : w) - 1.2;
        for (let k = 0; k < 4; k++) {
          const o = -span / 2 + 0.6 + k * (span - 1.2) / 3;
          if (h.fx) put('box', xx, yt + 1.0, cz + o, 0.05, k % 2 ? 0.8 : 0.6, 0.6, CLOTHES[(h.k + k) % 5]);
          else put('box', cx + o, yt + 1.0, zz, 0.6, k % 2 ? 0.8 : 0.6, 0.05, CLOTHES[(h.k + k) % 5]);
        }
        for (const s of [-1, 1]) put('box', h.fx ? xx : cx + s * span / 2, yt, h.fx ? cz + s * span / 2 : zz, 0.08, 1.9, 0.08, '#6b6b6b');
      }
    }
    if (h.tank) put('tank', cx + w * 0.2, y + H + 0.04, cz - d * 0.15, 1, 1, 1, h.tank === 1 ? TANK : '#8c9196');
  }
  for (const t of O.trees) {
    put('trunk', t.x, t.y, t.z, t.s, t.s, t.s, '#7a5230');
    put('crown', t.x, t.y + 2.6 * t.s, t.z, 1.7 * t.s, 1.5 * t.s, 1.7 * t.s, ['#4f9a45', '#5ea84e', '#3f8a3c', '#6db256'][Math.floor(t.x * 7 + t.z) & 3]);
  }
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    pane: new THREE.PlaneGeometry(1, 1),
    tank: new THREE.CylinderGeometry(0.75, 0.68, 1.15, 8).translate(0, 0.575, 0),
    trunk: new THREE.CylinderGeometry(0.22, 0.32, 2.0, 6).translate(0, 1.0, 0),
    crown: new THREE.IcosahedronGeometry(1, 0),
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  for (const k of Object.keys(L)) {
    const list = L[k], im = new THREE.InstancedMesh(geo[k], new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, c, ry], i) => { M.compose(V.set(x, y, z), Q.setFromAxisAngle(Y, ry), S.set(sx, sy, sz)); im.setMatrixAt(i, M); im.setColorAt(i, C.set(c)); });
    im.castShadow = false; im.receiveShadow = false; im.computeBoundingSphere();
    g.add(im);
  }
  return g;
}
