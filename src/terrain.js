// Cenário especial dos Bairros 9 (Encostas: áreas elevadas, ladeiras e escadarias) e 10 (Travessia: canal, pontes,
// passarelas e placas LADO LESTE / LADO OESTE). Só visual: a colisão está em layout.js (SOLIDS) e a altura em TERRAIN.h.
import * as THREE from 'three';
import { box, at, mesh, textTexture } from './models/kit.js';
import { cobble, gableRoof } from './models/venice.js';
import { buildRail } from './train.js';
import { RAIL as RAIL_PATH, VENICE, TERRAIN, CANAL, slotOrigin, doorPoint, lotX, lotZ, GRID, MAP, HEDGE, ROAD, LOT, roadCenter } from './layout.js';

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
  const V = VENICE, W = MAP - 2 * HEDGE, rand = (() => { let k = 7; return () => (k = (k * 16807) % 2147483647) / 2147483647; })();
  g.add(at(box(W, 0.06, W, '#3f8fb0'), MAP / 2, 0.02, MAP / 2));                                // água (as ilhas ficam por cima)
  for (let k = 0; k < 120; k++) g.add(at(box(1.8, 0.07, 0.18, '#8cc6ea'), HEDGE + rand() * W, 0.03, HEDGE + rand() * W));   // reflexos
  // muro baixo de pedra em volta (no lugar da sebe), aberto no canto sudeste: a entrada da lancha
  const E = MAP - HEDGE, gap = lotX(7) - 0.4;
  g.add(at(box(W + 3.2, 1.2, 1.6, '#cfc6b4'), MAP / 2, 0.4, HEDGE / 2));
  g.add(at(box(1.6, 1.2, W + 3.2, '#cfc6b4'), HEDGE / 2, 0.4, MAP / 2));
  g.add(at(box(gap, 1.2, 1.6, '#cfc6b4'), gap / 2, 0.4, E + 0.8));
  g.add(at(box(1.6, 1.2, gap, '#cfc6b4'), E + 0.8, 0.4, gap / 2));
  for (const [x, z] of [[gap, E + 0.8], [E + 0.8, gap]]) {                                     // postes listrados da entrada
    for (let k = 0; k < 5; k++) g.add(at(cylLike(0.3, 0.7, k % 2 ? '#ffffff' : '#c8402f'), x, 0.35 + k * 0.7, z));
  }
  // praças: base de pedra; laranja = pedregulhos, roxo = mesas com sombrinhas, verde = café/restaurante
  for (const r of V.plazaNE.concat(V.plazaSW)) {
    g.add(at(box(r.x1 - r.x0 + 0.6, 0.9, r.z1 - r.z0 + 0.6, '#8d877c'), (r.x0 + r.x1) / 2, -0.3, (r.z0 + r.z1) / 2));   // base (rejunte escuro)
  }
  const cell = (r, c) => ({ x: lotX(c), z: lotZ(r) });
  // pedregulhos de verdade: pedrinhas baixas (quadradas e retangulares), tamanhos e cinzas variados, em fileiras — instanciadas
  {
    const lands = V.houses.map(s => { const o = slotOrigin(s); return { x0: o.x - 0.3, z0: o.z - 0.3, x1: o.x + LOT + 0.3, z1: o.z + LOT + 0.3, house: o }; })
      .concat(V.plazaNE.concat(V.plazaSW).map(r => ({ x0: r.x0 - 0.3, z0: r.z0 - 0.3, x1: r.x1 + 0.3, z1: r.z1 + 0.3 })));
    const T = [];
    for (const r of lands) for (let z = r.z0 + 0.3; z < r.z1 - 0.2; ) {
      const dz = 0.42 + rand() * 0.38;
      for (let x = r.x0 + 0.1 + rand() * 0.4; x < r.x1 - 0.3; ) {
        const dx = rand() < 0.45 ? dz * (0.9 + rand() * 0.2) : dz * (1.3 + rand() * 0.9), cx = x + dx / 2, cz = z + dz / 2;
        x += dx + 0.07;
        if (cx > r.x1 - 0.2 || cz > r.z1 - 0.2) continue;
        const o = r.house;
        if (o && cx > o.x + 1.4 && cx < o.x + 15.8 && cz > o.z + 2.0 && cz < o.z + 12.0) continue;   // embaixo das casas
        if (!o && !V.walkable(cx, cz)) continue;                                                // dentro do café
        T.push([cx, cz, dx, dz]);
      }
      z += dz + 0.07;
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), T.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    T.forEach(([x, z, dx, dz], i) => {
      const h = 0.05 + rand() * 0.05;
      q.setFromAxisAngle(up, (rand() - 0.5) * 0.12);
      m4.compose(new THREE.Vector3(x, 0.15 + h / 2, z), q, new THREE.Vector3(dx, h, dz));
      im.setMatrixAt(i, m4);
      const t = 0.5 + rand() * 0.32; c.setRGB(t, t * 0.985, t * 0.95); im.setColorAt(i, c);
    });
    im.receiveShadow = true; im.castShadow = false; im.userData.dynamic = true;                 // (fora da fusão de malhas)
    g.add(im);
  }
  // laranja: espaço aberto, só o pedregulho
  const UMB = ['#c8402f', '#3c8f52', '#2f6fb0', '#efbf2a', '#fff3d6'];
  for (const [r, c] of V.zones.purple) {                                                       // mesas, cadeiras e sombrinhas (maiores)
    const o = cell(r, c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = o.x + 3.0 + i * 5.6, z = o.z + 3.0 + j * 5.6, col = UMB[(i + j * 2 + r) % UMB.length];
      g.add(at(cylLike(0.85, 0.1, '#f2efe6'), x, 1.2, z)); g.add(at(box(0.16, 1.1, 0.16, '#444'), x, 0.7, z));
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        g.add(at(box(0.62, 0.1, 0.62, '#8a5a36'), x + dx * 1.35, 0.75, z + dz * 1.35));
        g.add(at(box(0.62, 0.7, 0.08, '#8a5a36'), x + dx * 1.65, 1.1, z + dz * 1.65, 0, dx ? Math.PI / 2 : 0, 0));
        for (const [lx, lz] of [[-0.25, -0.25], [0.25, 0.25]]) g.add(at(box(0.07, 0.6, 0.07, '#5a3c22'), x + dx * 1.35 + lx, 0.45, z + dz * 1.35 + lz));
      }
      g.add(at(box(0.1, 3.4, 0.1, '#e8e8e8'), x, 1.85, z));
      const um = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.9, 8), new THREE.MeshLambertMaterial({ color: col }));
      um.position.set(x, 3.75, z); g.add(um);
    }
  }
  for (const cf of V.cafes) {                                                                   // café / restaurante: maior, girado na diagonal (alinhado com a ponte)
    const k = new THREE.Group(); k.position.set(cf.cx, 0, cf.cz); k.rotation.y = cf.ang; g.add(k);
    const w = cf.w, d = cf.d;
    k.add(at(box(w, 7.0, d, '#e9c98f'), 0, 3.65, 0));
    gableRoof(k, { cx: 0, cz: 0, y: 7.15, len: w + 0.9, depth: d, rise: 2.0, over: 0.45, color: '#b5532f', wall: '#e9c98f' });
    for (const fz of [-1, 1]) {                                                               // as duas frentes (dos dois lados)
      k.add(at(box(w - 1.2, 0.18, 2.2, '#3c8f52'), 0, 3.3, fz * (d / 2 + 0.95), fz * -0.3, 0, 0));
      for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2.4) {
        if (Math.abs(x) > 1.8) k.add(at(box(1.4, 2.3, 0.08, '#2e3a46'), x, 1.45, fz * (d / 2 + 0.04)));   // vitrines (o meio é a porta)
        k.add(at(box(1.2, 1.3, 0.08, '#2e3a46'), x, 5.6, fz * (d / 2 + 0.04)));                         // janelas de cima (acima da placa)
      }
      k.add(at(box(2.3, 2.9, 0.1, '#e8dfcc'), 0, 1.6, fz * (d / 2 + 0.05)));                        // porta de entrada: moldura,
      k.add(at(box(1.8, 2.6, 0.14, '#6b3f22'), 0, 1.45, fz * (d / 2 + 0.08)));                       // folhas de madeira com vidro
      for (const sx of [-0.45, 0.45]) k.add(at(box(0.6, 1.3, 0.16, '#9fc3d8'), sx, 1.85, fz * (d / 2 + 0.09)));
      k.add(at(box(2.4, 0.18, 1.0, '#cfc6b4'), 0, 0.24, fz * (d / 2 + 0.5)));                        // degrau
      const tex = textTexture('CAFFÈ · RISTORANTE', { width: 768, height: 128, bg: '#2a5a3a', fg: '#fff3d6', font: 'bold 60px "Trebuchet MS", sans-serif' });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, 0.85), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      sign.position.set(0, 4.25, fz * (d / 2 + 0.07));                                             // entre o toldo e as janelas de cima
      if (fz < 0) sign.rotation.y = Math.PI; k.add(sign);
      for (const dx of [-4.5, 0, 4.5]) { k.add(at(cylLike(0.75, 0.1, '#f2efe6'), dx, 1.2, fz * (d / 2 + 3.6))); k.add(at(box(0.14, 1.1, 0.14, '#444'), dx, 0.7, fz * (d / 2 + 3.6))); }
    }
  }

  // Ponte de Rialto em diagonal (de uma praça à outra): pedra clara, grande arco, degraus e lojinhas cobertas
  const R = V.rialto, rg = new THREE.Group();
  rg.position.set(R.cx, 0, R.cz); rg.rotation.y = Math.atan2(R.ux, R.uz); g.add(rg);
  deckSteps(rg, 'z', -R.len / 2, R.len / 2, 0, R.w, R.rise, 36, '#ece4d2');
  const yAt = z => 0.15 + R.rise * 4 * ((z + R.len / 2) / R.len) * (1 - (z + R.len / 2) / R.len);
  for (const sx of [-1, 1]) for (const z of [-26, -21, -16, -11, 11, 16, 21, 26]) {
    const y = yAt(z);
    rg.add(at(box(2.2, 2.4, 4.4, '#f2ead8'), sx * 3.1, y + 1.2, z));
    rg.add(at(box(0.08, 1.5, 2.6, '#5b3a22'), sx * 1.98, y + 1.0, z));
    gableRoof(rg, { cx: sx * 3.1, cz: z, y: y + 2.4, len: 4.4 + 0.3, depth: 2.2, rise: 0.8, over: 0.2, t: 0.16, color: '#b5532f', wall: '#f2ead8', ridge: 'z' });
  }
  const yTop = 0.15 + R.rise;
  rg.add(at(box(R.w, 0.7, 3.0, '#f2ead8'), 0, yTop + 3.6, 0));                                   // pórtico central
  for (const sx of [-1, 1]) rg.add(at(box(0.9, 3.4, 3.0, '#f2ead8'), sx * (R.w / 2 - 0.45), yTop + 1.7, 0));
  rg.add(at(box(R.w + 0.4, 0.9, 3.6, '#b5532f'), 0, yTop + 4.3, 0));
  signPost(g, 'PONTE DE RIALTO', V.rialto.cx + 32 * R.ux * -1 + 4, V.rialto.cz - 32 * R.uz + 2, Math.PI / 4, '#7a2f2a');
  for (const b of V.bridges) deckSteps(g, 'x', b.x0, b.x1, b.z, b.w, b.rise, 10, '#e2dacb');     // pontes menores
  // entregas a pé: placa na porta (praça) e "ATRACAR AQUI" na borda das praças
  for (const s of V.footOnly) { const d = doorPoint(s); signPost(g, '▼ ENTREGA A PÉ', d.x + 3.0, d.z + 1.2, 0, '#c8402f'); }
  for (const p of V.piers) {                                                                  // píeres de madeira com poste na ponta
    const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    g.add(at(box(w, 0.16, d, '#8a6440'), cx, 0.28, cz));
    for (let z = p.z0 + 0.35; z < p.z1; z += 0.7) g.add(at(box(w + 0.1, 0.04, 0.08, '#6b4a2c'), cx, 0.37, z));
    for (const x of [p.x0 + 0.25, p.x1 - 0.25]) for (const z of [p.z0 + 1.5, cz, p.z1 - 0.3]) g.add(at(box(0.3, 1.2, 0.3, '#5a3c22'), x, -0.2, z));
    g.add(at(box(0.36, 2.4, 0.36, '#6b4a2c'), p.post.x, 0.9, p.post.z));                       // poste de amarrar
    g.add(at(box(0.5, 0.12, 0.5, '#4a3020'), p.post.x, 2.12, p.post.z));
  }
  signPost(g, '⚓ ATRACAR AQUI', lotX(4) + 2, lotZ(2) + LOT - 0.4, 0, '#c8402f');
  signPost(g, '⚓ ATRACAR AQUI', lotX(3) + LOT - 2, lotZ(5) + 0.4, Math.PI, '#c8402f');
}
function cylLike(r, h, color) { return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), new THREE.MeshLambertMaterial({ color })); }
