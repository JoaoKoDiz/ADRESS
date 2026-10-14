// Nível 23 (Cachoeira): desfiladeiro fundo entre as duas margens (colunas 4–5), ponte alta na rua 5, mirantes nas cabeceiras
// e a cachoeira gigante no fim sul do desfiladeiro. buildCanyonScene = parte fixa (fundida em terrain.js);
// createCanyonFx = água correndo (rio do alto, cortina, rio lá embaixo), espuma, névoa, objetos levados pela correnteza e o som.
// A colisão (abismo, mirantes, maciço e os degraus dos lados) está em layout.js (rebuildBaseSolids); a mata das margens, fora
// do bairro, em world.js (buildOutskirts, com os troncos em SOLIDS).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, mesh, at, textTexture } from './models/kit.js';
import { CANAL, MAP, HEDGE, ROAD, roadCenter } from './layout.js';

const ROCK = ['#8c7b66', '#7d6d5a', '#9a8a72', '#86745f'], MOSS = '#5f8a3e', LEAF = ['#4f8f3a', '#3f7d34', '#6aa046'];
const PINE = ['#2f6f3f', '#3a8a50'], TRUNK = '#6b4526';
const CONC = '#b8b2a6', RAILC = '#5b6168', PAVE = '#c9bea8';
export const RIVER_Y = -40;
const SHELF = 8;            // degrau de pedra no alto das paredes (para dentro da borda)
const SHELF_Y = -0.06;      // topo do degrau: logo abaixo da rua, do tabuleiro da ponte e do piso dos mirantes (nada atravessa)
const DH = ROAD / 2 + 0.8;  // meia largura do tabuleiro da ponte (pista + calçadinhas)
const PO = ROAD / 2 + 0.6;  // face de fora das muretas da ponte (as muretas da borda encostam nela)
const mkRnd = seed => { let k = seed; return () => (k = (k * 16807) % 2147483647) / 2147483647; };
let rnd = mkRnd(23);
/** Pedras do rio e bases dos pilares da ponte ({ x, z, hx, hz }): os objetos levados pela água desviam delas. */
export const RIVER_OBST = [];

export function canyonGeo() {
  const C = CANAL, zc = roadCenter(C.bridges[0]), hr = ROAD / 2;
  return { X0: C.x0, X1: C.x1, W: C.x1 - C.x0, cx: (C.x0 + C.x1) / 2, ZN: -320, ZS: MAP + 44, zc, zb0: zc - hr, zb1: zc + hr, TOP: 64 };
}
const inset = k => 0.6 + k * 1.55;            // (largura do rio lá embaixo)

export function buildCanyonScene(g) {
  rnd = mkRnd(23);
  const { X0, X1, W, cx, ZN, ZS, zc, TOP } = canyonGeo(), LAY = 6, LH = (-RIVER_Y + 2) / LAY;
  const C = CANAL, [bw, be] = C.bays;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const blob = new THREE.IcosahedronGeometry(1, 0);
  const bush = (x, y, z, r) => { const m = at(mesh(blob, LEAF[Math.floor(rnd() * 3)]), x, y, z, 0, rnd() * 3, 0); m.scale.set(r, r * 0.75, r); g.add(m); };
  // trechos do degrau ocupados (ponte e mirantes): sem arbusto nem cipó
  const busy = (s, z, m) => Math.abs(z - zc) < DH + m || (s < 0 ? z > bw.z0 - m && z < bw.z1 + m : z > be.z0 - m && z < be.z1 + m);
  // paredes de pedra: camadas com a face de dentro no mesmo alinhamento (variação mínima entre camadas e fileiras vizinhas, para
  // as faces não ficarem no mesmo plano); o topo da 1ª camada é o degrau. Arbustos em cima do degrau e cipós pendurados na face.
  let row = 0;
  for (let z = ZN; z < ZS; z += 6, row++) for (const s of [-1, 1]) {
    const edge = s < 0 ? X0 : X1, inn = -s;    // inn: para dentro do desfiladeiro
    for (let k = 0; k < LAY; k++) {
      const face = SHELF + ((row + k) % 3) * 0.06, o = rnd() * 1.4, w = face + o;
      const top = k ? -k * LH + 0.15 : SHELF_Y - (row & 1) * 0.02, bot = -(k + 1) * LH - 0.15;
      add(box(w, top - bot, 6.3, ROCK[(k + Math.floor(z / 6)) & 3]), edge + inn * (face - w / 2), (top + bot) / 2, z + 3);
      if (k && rnd() < 0.12 && !busy(s, z + 3, 3)) {                // musgo na face (dentro da camada)
        const h = 2 + rnd() * 2.5, y = bot + 0.4 + h / 2 + rnd() * (top - bot - h - 0.8), dz = 1.4 + rnd() * 1.8;
        add(box(0.24, h, dz, MOSS), edge + inn * (face + 0.12), y, z + 3 + (rnd() - 0.5) * (5.6 - dz));
      }
    }
    const face0 = SHELF + (row % 3) * 0.06;
    if (rnd() < 0.4 && !busy(s, z + 3, 3.5)) {                       // arbusto apoiado no degrau (entre a mureta/cerca e o abismo)
      const r = 0.7 + rnd() * 0.6, d = 0.9 + r + rnd() * (face0 - 1.6 - 2 * r);
      bush(edge + inn * d, SHELF_Y + r * 0.3, z + 1.2 + rnd() * 3.6, r);
    }
    if (rnd() < 0.45 && !busy(s, z + 3, 1.5)) {                      // cipó pendurado da beira do degrau
      const len = 2.5 + rnd() * 3.5;
      add(box(0.24, len, 0.5 + rnd() * 0.5, MOSS), edge + inn * (face0 + 0.12), SHELF_Y - len / 2, z + 0.8 + rnd() * 4.4);
    }
  }
  // margens fora do bairro (ao norte e ao sul da sebe): cerquinha de madeira em cima do degrau (a mata fica em world.js)
  for (const s of [-1, 1]) {
    const edge = s < 0 ? X0 : X1;
    for (const [a, b] of [[ZN, -0.5], [MAP + 0.5, ZS - 0.6]]) {
      add(box(0.12, 0.12, b - a, '#8a6a44'), edge - s * 0.4, 0.9, (a + b) / 2); add(box(0.12, 0.12, b - a, '#8a6a44'), edge - s * 0.4, 0.5, (a + b) / 2);
      for (let z = a; z <= b; z += 3) add(box(0.18, 1.1, 0.18, '#6f5434'), edge - s * 0.4, 0.55, z);
    }
  }
  // mureta de concreto na beira das ruas (dentro do bairro): termina encostada nas muretas da ponte e nas balaustradas dos mirantes
  const wall = (x, a, b) => { if (b - a > 0.2) { add(box(0.6, 0.95, b - a, CONC), x, 0.47, (a + b) / 2); add(box(0.75, 0.12, b - a, '#d6d0c4'), x, 1.0, (a + b) / 2); } };
  wall(X0 + 0.3, HEDGE, bw.z0 + 0.15); wall(X0 + 0.3, zc + PO, MAP - HEDGE);
  wall(X1 - 0.3, HEDGE, zc - PO); wall(X1 - 0.3, be.z1 - 0.15, MAP - HEDGE);
  // mirantes: laje com piso de pedra em cima do degrau, balaustrada (lado do abismo e fundo), banco, luneta e placa (dos dois lados)
  const bal = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    add(box(ax ? len : 0.3, 0.14, ax ? 0.3 : len, '#e2dacb'), (x0 + x1) / 2, 1.05, (z0 + z1) / 2);
    const n = Math.max(1, Math.round(len / 0.55));
    for (let i = 0; i <= n; i++) add(box(0.16, 0.95, 0.16, '#e2dacb'), x0 + (x1 - x0) * i / n, 0.5, z0 + (z1 - z0) * i / n); };
  const plate = (text, w, h, bg, fg, x, y, z, ry) => {                  // placa com o texto legível dos dois lados
    const tex = textTexture(text, { width: 512, height: 128, bg, fg }), p = new THREE.Group();
    p.add(box(w, h, 0.06, bg));                                                 // chapa (as duas faces de texto encostam nela)
    for (const r2 of [0, Math.PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex })); m.position.z = r2 ? -0.05 : 0.05; m.rotation.y = r2; p.add(m); }
    p.position.set(x, y, z); p.rotation.y = ry; g.add(p);
  };
  for (const b of [bw, be]) {
    const sx = b.sx, xm = (b.x0 + b.x1) / 2, wx = b.x1 - b.x0, zm = (b.vz0 + b.vz1) / 2, wz = b.vz1 - b.vz0;
    const xc = sx > 0 ? b.x1 - 0.2 : b.x0 + 0.2, xr = sx > 0 ? b.x0 : b.x1;      // xc: balaustrada do lado do abismo; xr: beira da rua
    add(box(wx, 1.2, wz, CONC), xm, -0.6, zm); add(box(wx - 0.1, 0.06, wz - 0.1, PAVE), xm, 0.03, zm);
    const zNear = sx > 0 ? b.vz1 + 0.2 : b.vz0 - 0.2, zFar = sx > 0 ? b.vz0 : b.vz1;   // ponta da ponte (encosta na mureta dela) e o fundo
    bal(xc, zFar, xc, zNear); bal(xr + sx * 0.7, zFar, xc - sx * 0.4, zFar);
    const [bx, bz] = b.bench;                                                    // banco (encosto do lado da rua)
    add(box(0.6, 0.1, 2.4, '#8a5a34'), bx, 0.5, bz); add(box(0.1, 0.5, 2.4, '#8a5a34'), bx - sx * 0.3, 0.8, bz);
    for (const d of [-1, 1]) add(box(0.5, 0.45, 0.1, '#4a4d52'), bx, 0.25, bz + d);
    const [lx, lz] = b.scope;                                                    // luneta de moedas
    add(cyl(0.08, 0.1, 1.1, RAILC, 6), lx, 0.55, lz); add(box(0.4, 0.35, 0.8, '#2f6fae'), lx, 1.25, lz, 0.2, 0, 0); add(cyl(0.12, 0.12, 0.4, '#1d1d1f', 8), lx, 1.3, lz - 0.5, Math.PI / 2, 0, 0);
    const [px, pz] = b.sign;                                                     // placa MIRANTE (virada para a ponte)
    add(box(0.12, 1.87, 0.12, '#5a3a22'), px, 0.935, pz); plate('MIRANTE', 2.2, 0.55, '#5a3a22', '#ffe9c2', px, 2.15, pz, 0);   // (o poste acaba embaixo da chapa)
  }
  // ponte alta: tabuleiro (de borda a borda), mureta + guarda-corpo metálico, postes por fora das muretas, arco de concreto com
  // montantes e 2 pilares até o rio
  const hr = ROAD / 2;
  add(box(W, 1.6, 2 * DH, '#a7a196'), cx, -0.8, zc);
  add(box(W, 0.04, ROAD - 0.3, '#5d6470'), cx, 0.02, zc);
  for (let x = X0 + 1.5; x < X1 - 1; x += 2.6) add(box(1.4, 0.03, 0.22, '#f2d45c'), x, 0.05, zc);
  for (const s of [-1, 1]) {
    const z = zc + s * (hr + 0.35), a = s < 0 ? bw.x1 : X0, b = s < 0 ? X1 : be.x0, L = b - a, m = (a + b) / 2;   // (abertas para os mirantes)
    add(box(L, 1.0, 0.5, CONC), m, 0.5, z);
    add(box(L, 0.1, 0.12, RAILC), m, 1.55, z); add(box(L, 0.08, 0.1, RAILC), m, 1.25, z);
    const n = Math.round(L / 1.4);
    for (let i = 0; i <= n; i++) add(box(0.08, 0.6, 0.08, RAILC), a + 0.1 + (L - 0.2) * i / n, 1.28, z);
    const zp = zc + s * (DH + 0.14);                                            // poste preso por fora do tabuleiro; braço por cima da mureta
    for (const x of [X0 + W * 0.2, cx, X0 + W * 0.8]) {
      add(cyl(0.1, 0.12, 6.8, '#3a3d44', 6), x, 2.2, zp); add(box(0.14, 0.12, 1.5, '#3a3d44'), x, 5.55, zp - s * 0.75);
      add(box(0.5, 0.16, 0.45, '#fff2c0'), x, 5.42, zp - s * 1.4);
    }
  }
  const archY = x => -18 + 15.5 * (1 - ((x - cx) / (W / 2 - 1)) ** 2);
  for (let x = X0 - 0.5; x < X1 + 0.5; x += 1.5) {
    const y = archY(x + 0.75);
    add(box(1.6, 1.6, ROAD - 1, '#9d978b'), x + 0.75, y, zc);
    if (Math.round((x - X0) / 1.5) % 3 === 0 && y < -2.6) add(box(0.7, -1.6 - y, ROAD - 2, '#a7a196'), x + 0.75, (y - 1.6) / 2, zc);
  }
  RIVER_OBST.length = 0;
  for (const x of [cx - W * 0.2, cx + W * 0.2]) {
    const top = archY(x), h = top - RIVER_Y;
    add(box(3.2, h, ROAD - 0.6, '#9d978b'), x, RIVER_Y + h / 2, zc); add(box(4.4, 3, ROAD + 0.6, '#8f897d'), x, RIVER_Y + 1.5, zc);
    RIVER_OBST.push({ x, z: zc, hx: 2.2, hz: ROAD / 2 + 0.3 });
  }
  // placas LADO LESTE / LADO OESTE: em cima da mureta da borda, logo depois da ponte, à esquerda de quem sai dela; legíveis dos dois
  // lados (quem sai da ponte para leste lê LADO LESTE; para oeste, LADO OESTE)
  const sign = (text, x, z, ry) => {                                        // 2 postes em cima da tampa da mureta, até a chapa
    for (const d of [-1.2, 1.2]) add(box(0.12, 1.8, 0.12, '#6b6f76'), x, 1.06 + 0.9, z + d);
    plate(text, 3.4, 1.0, '#2f5f8a', '#ffffff', x, 3.36, z, ry);
  };
  sign('LADO LESTE', X1 - 0.3, zc - PO - 2.4, -Math.PI / 2);
  sign('LADO OESTE', X0 + 0.3, zc + PO + 2.4, Math.PI / 2);
  // maciço da cachoeira: paredão de pedra, degraus de pedra dos lados (CANAL.rock), rio no alto entre margens de pedra
  const D = -RIVER_Y + 2;
  add(box(W + 92, TOP + D, 90, ROCK[1]), cx, (TOP - D) / 2, ZS + 45);
  C.rock.slice(1).forEach((b, i) => add(box(b.x1 - b.x0, b.top, b.z1 - b.z0, [ROCK[0], ROCK[2], '#a3937a'][i >> 1]), (b.x0 + b.x1) / 2, b.top / 2, (b.z0 + b.z1) / 2));
  for (const s of [-1, 1]) add(box(10, TOP + 6, 89.7, ROCK[3]), cx + s * 17, TOP / 2 + 3, ZS + 45.15);   // margens do rio lá em cima (um pouco atrás da face do paredão)
  for (let k = 0; k < 140; k++) {                                       // saliências e blocos no paredão (fora da cortina d'água e sem sair do paredão)
    const s = 2 + rnd() * 5, x = cx + (rnd() - 0.5) * (W + 90), y = RIVER_Y + rnd() * (TOP - RIVER_Y), dx = Math.abs(x - cx);
    if (dx - s * 0.8 < 14.5 || dx + s * 0.8 > W / 2 + 45.5 || y + s / 2 > TOP - 0.5 || y - s / 2 < 0.3) continue;   // (abaixo do chão seria só pedra dentro de pedra)
    add(box(s * 1.6, s, s, ROCK[k & 3]), x, y, ZS - s * 0.3, 0, rnd() * 0.4 - 0.2, 0);
    if (rnd() < 0.4) { const r = Math.min(0.8 + rnd() * 0.9, s * 0.45); bush(x + (rnd() - 0.5) * s * 0.6, y + s * 0.5 + r * 0.3, ZS - s * 0.3, r); }   // em cima do bloco
  }
  add(box(26, 0.4, 90, '#2f6f9a'), cx, TOP + 0.2, ZS + 45);            // leito do rio no alto (a água corre por cima: createCanyonFx)
  // mata no alto do maciço e dos degraus: cada árvore com o tronco no chão do patamar em que está, longe das beiradas
  const blocks = [{ x0: cx - W / 2 - 46, x1: cx - 22, z0: ZS, z1: ZS + 90, top: TOP }, { x0: cx + 22, x1: cx + W / 2 + 46, z0: ZS, z1: ZS + 90, top: TOP }]
    .concat(C.rock.slice(1));
  const higher = (b, x, z, m) => C.rock.some(o => o.top > b.top && x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m);
  const tree = (x, y, z, s, pine) => {
    if (pine) { add(cyl(0.22 * s, 0.32 * s, 1.4 * s, TRUNK, 6), x, y + 0.7 * s, z); add(cone(1.9 * s, 2.8 * s, PINE[0], 7), x, y + 2.5 * s, z); add(cone(1.4 * s, 2.3 * s, PINE[1], 7), x, y + 3.9 * s, z); return; }
    add(cyl(0.26 * s, 0.36 * s, 2.0 * s, TRUNK, 6), x, y + 1.0 * s, z);
    for (const [dx, dy, dz, r] of [[0, 2.7, 0, 1.7], [0.9, 2.3, 0.4, 1.15], [-0.7, 3.4, -0.3, 1.05]]) {
      const m = at(mesh(blob, LEAF[Math.floor(rnd() * 3)]), x + dx * s, y + dy * s, z + dz * s, rnd() * 3, rnd() * 3, 0); m.scale.setScalar(r * s); g.add(m);
    }
  };
  for (const b of blocks) {
    const area = (b.x1 - b.x0) * (b.z1 - b.z0), want = Math.round(area / (b.top > 50 ? 52 : b.top > 30 ? 64 : 78)), placed = [];
    for (let n = 0, t = 0; n < want && t < want * 30; t++) {
      const s = 1.5 + rnd() * 1.2, m = 1.2 + s * 1.3, x = b.x0 + m + rnd() * (b.x1 - b.x0 - 2 * m), z = b.z0 + m + rnd() * (b.z1 - b.z0 - 2 * m);
      if (higher(b, x, z, m) || placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + s * 1.6)) continue;
      placed.push([x, z, s * 1.6]); tree(x, b.top, z, s, rnd() < 0.6); n++;
    }
  }
  // pedras no rio e na bacia da queda (sem encostar nos pilares da ponte nem umas nas outras)
  for (let k = 0, n = 0; k < 80 && n < 24; k++) {
    const z = ZN + rnd() * (ZS - ZN), x = cx + (rnd() - 0.5) * (W - 22), a = 1.5 + rnd() * 3, b2 = 1.5 + rnd() * 3, ry = rnd() * 3, r = Math.hypot(a, b2) / 2;
    if (RIVER_OBST.some(o => Math.abs(o.x - x) < o.hx + r + 1.5 && Math.abs(o.z - z) < o.hz + r + 1.5)) continue;
    add(box(a, 1.0, b2, '#9a948a'), x, RIVER_Y + 0.3, z, 0, ry, 0); RIVER_OBST.push({ x, z, hx: r, hz: r }); n++;
  }
  // fundo do desfiladeiro (embaixo da água)
  add(box(W, 1, ZS - ZN, '#4a5248'), cx, RIVER_Y - 1.2, (ZN + ZS) / 2);
}

function streakTex(fall) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = fall ? 'rgba(200,232,250,0.78)' : '#3f86b4'; x.fillRect(0, 0, 128, 256);
  for (let k = 0; k < (fall ? 140 : 70); k++) {
    const px = Math.random() * 128, len = fall ? 30 + Math.random() * 90 : 6 + Math.random() * 16, py = Math.random() * 256;
    x.fillStyle = fall ? `rgba(255,255,255,${0.35 + Math.random() * 0.6})` : `rgba(190,228,250,${0.25 + Math.random() * 0.45})`;
    if (fall) x.fillRect(px, py, 1 + Math.random() * 3, len); else x.fillRect(px, py, len, 1.5);
    if (py + len > 256 && fall) x.fillRect(px, py - 256, 2, len);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Perfil da queda (no plano z–y): o rio do alto corre até a borda, faz a curva por cima dela e desce rente ao paredão.
const LIP_R = 1.6, FALL_V0 = 7, FALL_G = 26, FALL_VMAX = 46, FALL_SIGMA = 1.2;
function fallProfile(ZS, y0, yEnd) {
  const P = [], push = (z, y) => P.push({ z, y });
  for (let i = 0; i <= 6; i++) push(ZS + 5 - i * 0.8, y0);                       // em cima, ainda no rio (z = ZS+5 … ZS+0,2)
  for (let i = 1; i <= 10; i++) { const a = i / 10 * Math.PI / 2; push(ZS + 0.2 - LIP_R * Math.sin(a), y0 - LIP_R * (1 - Math.cos(a))); }   // a curva da borda
  const zA = ZS + 0.2 - LIP_R, yA = y0 - LIP_R;
  for (let i = 1; i <= 28; i++) { const f = (i / 28) ** 1.35; push(zA - 1.2 * f, yA + (yEnd - yA) * f); }   // descida (abre um pouco para fora)
  let s = 0;
  P.forEach((p, i) => {                                                         // comprimento, normal (para fora/para cima) e queda
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], tz = b.z - a.z, ty = b.y - a.y, l = Math.hypot(tz, ty);
    if (i) s += Math.hypot(p.z - P[i - 1].z, p.y - P[i - 1].y);
    p.s = s; p.nz = ty / l; p.ny = -tz / l; p.drop = y0 - p.y;
  });
  return P;
}
/** Faixa da água caindo: mesma textura do começo ao fim, a coordenada v acompanha a velocidade (devagar no rio, acelerando na queda),
 *  então a textura parece correr e acelerar sem emenda. alphaAt(p) dá a transparência de cada ponto (entra suave em cima do rio). */
function fallGeo(P, cx, hwAt, offAt, alphaAt) {
  const n = P.length, pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), col = new Float32Array(n * 8), idx = [];
  let v = 0; const vs = [0];
  for (let i = 1; i < n; i++) { const sp = Math.min(FALL_VMAX, Math.sqrt(FALL_V0 ** 2 + 2 * FALL_G * Math.max(0, (P[i].drop + P[i - 1].drop) / 2))); v += FALL_SIGMA / sp * (P[i].s - P[i - 1].s); vs.push(v); }
  P.forEach((p, i) => {
    const hw = hwAt(p), o = offAt(p), z = p.z + p.nz * o, y = p.y + p.ny * o, a = alphaAt(p), vv = v - vs[i];
    pos.set([cx - hw, y, z, cx + hw, y, z], i * 6); uv.set([0, vv, hw / 6.5, vv], i * 4); col.set([1, 1, 1, a, 1, 1, 1, a], i * 8);
    if (i < n - 1) { const q = i * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.setIndex(idx); return g;
}
/** Geometria com cor por vértice a partir de peças [geometria, cor, x, y, z, rx, ry, rz] (objetos levados pela água). */
function colored(parts) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  return mergeGeometries(parts.map(([geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0]) => {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(m.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e.set(rx, ry, rz)), one));
    const cl = new THREE.Color(c), arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) { arr[i] = cl.r; arr[i + 1] = cl.g; arr[i + 2] = cl.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); g.deleteAttribute('uv'); return g;
  }));
}

/** Partes animadas: rio do alto correndo até a borda e virando a cortina da cachoeira, rio lá embaixo correndo para o norte, espuma,
 *  névoa, galhos/folhas/caixotes levados pela correnteza e, de vez em quando, um barril que cai pela cachoeira e some na espuma;
 *  som contínuo pela distância. */
export function createCanyonFx(audio) {
  const root = new THREE.Group(); root.name = 'canyon-fx';
  root.userData.debug = () => ({ items, ups, obst: RIVER_OBST, rw, G });   // (testes)
  let built = false, river, top, sheets = [], foam = [], mist = [], splash = [], t = 0, src = null, G, rw;
  const items = [], ups = [];                   // lá embaixo (InstancedMesh) e no rio do alto (barril + galhos que caem)
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function build() {
    G = canyonGeo(); const { W, cx, ZN, ZS, TOP } = G; rw = W - 2 * inset(5) - 1.2; const len = ZS - ZN;
    const rt = streakTex(false); rt.repeat.set(1, len / 24);
    river = new THREE.Mesh(new THREE.PlaneGeometry(rw, len), new THREE.MeshLambertMaterial({ map: rt, color: '#ffffff' }));
    river.rotation.x = -Math.PI / 2; river.position.set(cx, RIVER_Y, (ZN + ZS) / 2); root.add(river);
    // rio do alto: corre para o norte até a borda (z = ZS), por cima do leito
    const tt = streakTex(false); tt.repeat.set(1, 90 / 24);
    top = new THREE.Mesh(new THREE.PlaneGeometry(24, 90), new THREE.MeshLambertMaterial({ map: tt, color: '#ffffff' }));
    top.rotation.x = -Math.PI / 2; top.position.set(cx, TOP + 0.47, ZS + 45); root.add(top);
    // cortina: 2 faixas que começam em cima do rio (transparentes no começo), passam pela curva da borda e descem até a bacia
    const y0 = TOP + 0.5, P = fallProfile(ZS, y0, RIVER_Y + 0.3), sArc = P[6].s, sEnd = P[P.length - 1].s;
    const ramp = (x, a, b) => Math.min(1, Math.max(0, (x - a) / (b - a)));
    const mk = (hw0, hw1, off, alpha, opacity, rep) => {
      const tex = streakTex(true); tex.repeat.set(rep, 1);
      const m = new THREE.Mesh(fallGeo(P, cx, p => hw0 + (hw1 - hw0) * p.s / sEnd, off, alpha),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, vertexColors: true }));
      m.frustumCulled = false; root.add(m); sheets.push(m);
    };
    mk(11.9, 13.2, () => 0, p => ramp(p.s, 0, 3.6), 1, 1);
    mk(10.2, 11.6, p => 1.0 * ramp(p.s, sArc, sArc + 6), p => 0.8 * ramp(p.s, sArc + 0.5, sArc + 3), 0.85, 0.7);
    const pt = puffTex();
    for (let k = 0; k < 26; k++) {                                       // espuma na bacia
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#ffffff', transparent: true, depthWrite: false, opacity: 0.9 }));
      m.userData = { x: cx + (Math.random() - 0.5) * 26, z: ZS - 2 - Math.random() * 12, ph: Math.random() * 6, s: 5 + Math.random() * 6 }; root.add(m); foam.push(m);
    }
    for (let k = 0; k < 18; k++) {                                       // névoa subindo
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#eef6ff', transparent: true, depthWrite: false, opacity: 0.4 }));
      m.userData = { x: cx + (Math.random() - 0.5) * 34, z: ZS - 4 - Math.random() * 20, u: Math.random() }; root.add(m); mist.push(m);
    }
    for (let k = 0; k < 6; k++) {                                        // borrifo do barril caindo na bacia
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 }));
      m.visible = false; m.userData = { life: 0 }; root.add(m); splash.push(m);
    }
    buildDebris();
    src = { x: cx, z: ZS - 10 };
    built = true;
  }
  // ---- objetos levados pela água ----
  const L = new THREE.MeshLambertMaterial({ flatShading: true }), LV = new THREE.MeshLambertMaterial({ flatShading: true, vertexColors: true });
  let leafM, branchM, crateM, barrel;
  function buildDebris() {
    const { cx, ZN, ZS, TOP } = G;
    const leaf = new THREE.CylinderGeometry(0.42, 0.42, 0.04, 5);
    const leafGeo = colored([[leaf, '#ffffff', 0, 0, 0, 0, 0.3, 0], [leaf, '#ffffff', 0.55, 0.03, 0.2, 0, 1.2, 0], [leaf, '#ffffff', -0.2, 0.05, 0.5, 0, 2.2, 0]]);
    leafGeo.scale(1.5, 1, 1);
    const stick = new THREE.CylinderGeometry(0.09, 0.12, 2.6, 5), twig = new THREE.CylinderGeometry(0.04, 0.06, 0.9, 4), tuft = new THREE.IcosahedronGeometry(0.28, 0);
    const branchGeo = colored([[stick, '#6b4526', 0, 0, 0, 0, 0, Math.PI / 2], [twig, '#7a5230', 0.5, 0, 0.3, Math.PI / 2, 0, 0.9], [twig, '#7a5230', -0.6, 0, -0.28, -Math.PI / 2, 0, -0.8],
      [tuft, '#4f8f3a', 0.75, 0.08, 0.68], [tuft, '#6aa046', -0.85, 0.06, -0.62], [tuft, '#3f7d34', 1.25, 0.05, 0.05]]);
    const plank = new THREE.BoxGeometry(1, 1, 1), edge = new THREE.BoxGeometry(1.04, 0.12, 0.12), post = new THREE.BoxGeometry(0.12, 1.04, 0.12);
    const cp = [[plank, '#b07a44']];
    for (const a of [-0.48, 0.48]) for (const b of [-0.48, 0.48]) { cp.push([edge, '#7a5230', 0, a, b], [edge, '#7a5230', a, b, 0, 0, Math.PI / 2, 0], [post, '#7a5230', a, 0, b]); }
    const crateGeo = colored(cp);
    const mkI = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(m); return m; };
    const NL = 10, NB = 8, NC = 5;
    leafM = mkI(leafGeo, L, NL); branchM = mkI(branchGeo, LV, NB + 2); crateM = mkI(crateGeo, LV, NC);
    const LC = ['#5fa043', '#d9b43a', '#d7742f', '#8fb83f', '#c8572d'];
    for (let i = 0; i < NL; i++) leafM.setColorAt(i, new THREE.Color(LC[i % LC.length]));
    leafM.instanceColor.needsUpdate = true;
    const spread = (i, n) => ZN + 20 + (ZS - 18 - ZN - 20) * ((i + Math.random() * 0.8) / n);
    const add = (mesh, i, r, y, spd, k, n) => items.push({ mesh, i, r, y, spd, x: cx + (Math.random() - 0.5) * 12, z: spread(k, n), lane: (Math.random() - 0.5) * 12, ph: Math.random() * 6, yaw: Math.random() * 6, spin: (Math.random() - 0.5) * 0.5, fade: 1 });
    const all = NL + NB + NC; let k = 0;
    for (let i = 0; i < NL; i++) add(leafM, i, 0.9, 0.06, 8.0, k++, all);
    for (let i = 0; i < NB; i++) add(branchM, i, 1.45, 0.08, 8.2, k++, all);
    for (let i = 0; i < NC; i++) add(crateM, i, 0.8, 0.12, 7.8, k++, all);
    items.sort(() => Math.random() - 0.5).forEach((it, j) => { it.z = spread(j, all); });
    // barril (no rio do alto) e 2 galhos que também descem pela cachoeira
    const bodyG = new THREE.CylinderGeometry(0.72, 0.72, 1.7, 12), hoop = new THREE.CylinderGeometry(0.76, 0.76, 0.12, 12), lid = new THREE.CylinderGeometry(0.6, 0.6, 0.04, 12);
    barrel = new THREE.Mesh(colored([[bodyG, '#9a6234'], [hoop, '#4a4d52', 0, 0.55, 0], [hoop, '#4a4d52', 0, -0.55, 0], [lid, '#7a4a26', 0, 0.86, 0], [lid, '#7a4a26', 0, -0.86, 0]]), LV);
    barrel.rotation.order = 'YXZ'; barrel.visible = false; root.add(barrel);   // (rola em volta do próprio eixo)
    ups.push({ kind: 'barrel', obj: barrel, r: 0.8, ph: 'wait', wait: 6 + Math.random() * 6, every: [22, 40] });
    for (let i = 0; i < 2; i++) ups.push({ kind: 'branch', i: NB + i, r: 1.4, ph: 'wait', wait: 3 + Math.random() * 14, every: [9, 20] });
    for (const it of items) place(it, 0);
    for (const u of ups) hideUp(u);
  }
  // posição/rotação de um objeto lá embaixo
  function place(it, dt) {
    const { cx, ZN, ZS } = G, half = rw / 2;
    it.z -= it.spd * dt; it.fade = Math.min(1, it.fade + dt * 0.8);
    if (it.z < ZN + 12) { it.z = ZS - 15 - Math.random() * 5; it.lane = (Math.random() - 0.5) * 12; it.x = cx + it.lane; it.fade = 0; }
    // desvio das pedras e dos pilares: o alvo lateral sai da frente de cada obstáculo que está chegando (até 2 passadas)
    let tx = cx + it.lane + 0.9 * Math.sin(t * 0.35 + it.ph);
    for (let pass = 0; pass < 2; pass++) for (const o of RIVER_OBST) {
      const dz = it.z - o.z, need = o.hx + it.r + 0.7;
      if (dz > -(o.hz + it.r + 0.6) && dz < o.hz + it.r + 14 && Math.abs(tx - o.x) < need) tx = o.x + (tx >= o.x ? need + 0.05 : -need - 0.05);
    }
    tx = Math.max(cx - half + it.r + 0.4, Math.min(cx + half - it.r - 0.4, tx));
    const dx = tx - it.x, mv = 4.2 * dt; it.x += Math.abs(dx) < mv ? dx : Math.sign(dx) * mv;
    it.yaw += it.spin * dt;
    const s = it.fade < 1 ? Math.max(0.001, it.fade) : 1;
    E.set(0.06 * Math.sin(t * 1.7 + it.ph), it.yaw, 0.06 * Math.cos(t * 1.3 + it.ph));
    M4.compose(V.set(it.x, RIVER_Y + it.y + 0.07 * Math.sin(t * 2 + it.ph), it.z), Q.setFromEuler(E), S.set(s, s, s));
    it.mesh.setMatrixAt(it.i, M4);
  }
  function hideUp(u) { if (u.obj) u.obj.visible = false; else branchM.setMatrixAt(u.i, ZERO); }
  // barril e galhos no rio do alto → borda → queda livre na frente da cortina → afundam na espuma e somem
  function stepUp(u, dt) {
    const { cx, ZS, TOP } = G, yR = TOP + 0.47;
    if (u.ph === 'wait') { u.wait -= dt; if (u.wait > 0) return hideUp(u); u.ph = 'river'; u.x = cx + (Math.random() - 0.5) * 12; u.z = ZS + 70 + Math.random() * 15; u.rot = 0; u.yaw = (Math.random() - 0.5) * 0.4; }
    let y, rx = 0, rz = 0, s = 1;
    if (u.ph === 'river') {
      u.z -= 7 * dt; u.rot += 7 * dt / u.r;                                   // rola devagar com a água
      y = yR + (u.kind === 'barrel' ? 0.38 : 0.08) + 0.06 * Math.sin(t * 2.2 + u.x);
      if (u.z <= ZS + 0.2) { u.ph = 'fall'; u.ft = 0; u.z0 = u.z; u.y0 = y; }
    }
    if (u.ph === 'fall') {
      u.ft += dt; const f = u.ft;
      u.z = u.z0 - 4.5 * f; y = u.y0 + 0.5 * f - 0.5 * FALL_G * f * f; u.rot += dt * 3.2;
      if (y <= RIVER_Y + 0.45) { u.ph = 'sink'; u.st = 0; u.ys = RIVER_Y + 0.45; if (u.kind === 'barrel') burst(u.x, u.z); }
    }
    if (u.ph === 'sink') {                                                    // afunda e some na espuma
      u.st += dt; y = u.ys - u.st * 2.2; s = Math.max(0.001, 1 - u.st / 0.7);
      if (u.st > 0.7) { u.ph = 'wait'; u.wait = u.every[0] + Math.random() * (u.every[1] - u.every[0]); return hideUp(u); }
    }
    if (u.kind === 'barrel') {                                                // deitado, atravessado na correnteza (eixo em x)
      u.obj.visible = true; u.obj.position.set(u.x, y, u.z); u.obj.rotation.set(u.rot, u.yaw, Math.PI / 2 + (u.ph === 'fall' ? u.ft * 1.3 : 0)); u.obj.scale.setScalar(s);
    } else {
      E.set(u.ph === 'fall' ? u.rot : 0, u.yaw + (u.ph === 'fall' ? u.ft * 2 : 0), 0);
      M4.compose(V.set(u.x, y, u.z), Q.setFromEuler(E), S.set(s, s, s)); branchM.setMatrixAt(u.i, M4);
    }
  }
  function burst(x, z) {
    splash.forEach((m, k) => { const a = k / splash.length * Math.PI * 2; m.visible = true; m.userData = { life: 1, x: x + Math.cos(a) * 1.2, z: z + Math.sin(a) * 1.2, vx: Math.cos(a) * 2.5, vz: Math.sin(a) * 2.5, vy: 6 + k % 3 * 2.5, y: RIVER_Y + 0.5 }; });
  }
  return {
    object: root,
    attach(scene) { if (!built) build(); scene.add(root); },
    detach() { if (root.parent) root.parent.remove(root); if (audio && audio.waterfall) audio.waterfall(0); },
    update(dt, ear) {
      if (!built || !root.parent) return;
      t += dt;
      river.material.map.offset.y -= dt * 0.35;                        // correnteza lá embaixo: para o norte (v = 1 fica ao norte)
      top.material.map.offset.y -= dt * 0.29;                          // rio do alto: para o norte, até a borda (~7 por segundo)
      for (const m of sheets) m.material.map.offset.y += dt * FALL_SIGMA;   // cortina: desce (acelerando, pela coordenada v)
      for (const f of foam) { const u = f.userData, s = u.s * (0.85 + 0.2 * Math.sin(t * 3 + u.ph)); f.scale.set(s, s * 0.55, 1); f.position.set(u.x, RIVER_Y + 1 + 0.4 * Math.sin(t * 2 + u.ph), u.z); }
      for (const m of mist) { const u = m.userData; u.u = (u.u + dt * 0.06) % 1; const s = 10 + u.u * 26; m.scale.set(s, s, 1); m.position.set(u.x + Math.sin(t * 0.3 + u.z) * 3, RIVER_Y + 2 + u.u * 46, u.z - u.u * 6); m.material.opacity = 0.42 * Math.sin(u.u * Math.PI); }
      for (const m of splash) { const u = m.userData; if (!(u.life > 0)) continue; u.life -= dt * 1.1; u.vy -= 14 * dt; u.x += u.vx * dt; u.z += u.vz * dt; u.y = Math.max(RIVER_Y + 0.5, u.y + u.vy * dt);
        const s = 3 + (1 - u.life) * 6; m.scale.set(s, s, 1); m.position.set(u.x, u.y, u.z); m.material.opacity = 0.85 * Math.max(0, u.life); if (u.life <= 0) m.visible = false; }
      const d = Math.min(dt, 0.1);
      for (const it of items) place(it, d);
      for (const u of ups) stepUp(u, d);
      leafM.instanceMatrix.needsUpdate = branchM.instanceMatrix.needsUpdate = crateM.instanceMatrix.needsUpdate = true;
      if (audio && audio.waterfall) {
        if (!ear) audio.waterfall(0);
        else { const dd = Math.hypot(ear.x - src.x, ear.z - src.z); audio.waterfall(Math.min(1, Math.pow(60 / Math.max(60, dd), 1.3)) * 0.92 + 0.08); }
      }
    },
  };
}
