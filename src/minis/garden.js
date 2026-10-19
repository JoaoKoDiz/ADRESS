// Maquete do Bairro 17 (Jardins), desenhada a partir do plano real (gardenPlan.js) em escala de miniatura:
// muro contínuo com a portaria (pilares, guarita, cancela, palmeiras), rotatórias, ramais com balão e o anel; lago orgânico
// com passeio, borda de pedra, juncos, vitórias-régias, deque e uma fila de patinhos (exagerados para aparecer pequeno);
// parque com cerca viva, caminhos, chafariz, coreto, playground, quadra e flores; clube (salão, piscina, estacionamento);
// casas nos 4 modelos do bairro (clássica, chalé, em L, garagem) viradas para a rua, com jardim, cerca branca e caminho;
// árvores do plano (copas variadas, ipês e chorões), menos onde esconderiam ruas e casas.
import { planGarden } from '../gardenPlan.js';

const MAP = 1.6 * 2 + 7.6 * 11 + 17.2 * 10, HEDGE = 1.6;   // área 10×10 do bairro (layout.js)
const F = 14 / MAP;                                          // metros do bairro → unidades da maquete
const Y = 0.4;                                               // topo do gramado da base
const HS = 1.22 * F, VS = 2.1 * F;                           // casas: um pouco maiores e mais altas que a escala (leitura em miniatura)

export const signY = 9;
export const thumb = { dir: [-6, 24, 27], k: 0.82, dy: 0 };

let prismGeo = null;
function prism(THREE) {                                      // telhado de duas águas unitário: cumeeira ao longo de x, base em y 0
  if (prismGeo) return prismGeo;
  const v = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5], [-0.5, 1, 0], [0.5, 1, 0]];
  const t = [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [0, 3, 4], [2, 1, 5]];
  const pos = []; for (const tri of t) for (const i of tri) pos.push(...v[i]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return (prismGeo = g);
}

export function build(ctx) {
  const { THREE, g, add, G, box, cyl, sphere, cone, mat } = ctx;
  const V = planGarden(MAP, HEDGE), CX = V.CX;
  const mx = x => (x - CX) * F, mz = z => (z - CX) * F;
  const M = (geo, c) => new THREE.Mesh(geo, mat(c));
  const ASF = G('#5d6470', '#6e6e6e'), SW = G('#d9d3c4', '#c2c2c2'), PAVE = G('#e6dcc6', '#c8c8c8'), GRASS = G('#8fca62', '#a8a8a8');
  const HEDGEC = G('#3f7d3a', '#7f7f7f'), LAWN = G('#9ed46e', '#b0b0b0');
  const flat = (pts, y, h, c) => {                           // polígono plano (contorno em metros do bairro) com espessura h
    const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(mx(x), -mz(z))));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 });
    geo.rotateX(-Math.PI / 2);                               // (x, y) do contorno → (x, −z) no chão; extrusão para cima
    g.add(ctx.at(M(geo, c), 0, y, 0));
  };

  // ---- base: borda creme, gramado ----
  add(box(15, 0.3, 15, G('#d4cdbb', '#b9b9b9')), 0, 0.15, 0);
  add(box(14.4, 0.1, 14.4, GRASS), 0, 0.35, 0);

  // ---- ruas: calçada + asfalto; rotatórias com ilha florida; balões com ilhinha ----
  const RW = 8 * F, SWW = RW + 2.2 * F;
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az) * F, ry = Math.atan2(bx - ax, bz - az);
    const x = mx((ax + bx) / 2), z = mz((az + bz) / 2);
    add(box(SWW, 0.03, len, SW), x, Y + 0.015, z, 0, ry, 0);
    add(box(RW, 0.03, len, ASF), x, Y + 0.035, z, 0, ry, 0);
  }
  for (const [x, z] of Object.values(V.N)) { add(cyl(SWW / 2, SWW / 2, 0.03, SW, 12), mx(x), Y + 0.016, mz(z)); add(cyl(RW / 2, RW / 2, 0.03, ASF, 12), mx(x), Y + 0.036, mz(z)); }
  for (const r of V.rounds) {
    add(cyl(r.r * F + 0.08, r.r * F + 0.08, 0.03, SW, 22), mx(r.x), Y + 0.017, mz(r.z)); add(cyl(r.r * F, r.r * F, 0.03, ASF, 22), mx(r.x), Y + 0.037, mz(r.z));
    add(cyl(r.island * F, r.island * F, 0.06, G('#e2d8c4', '#c4c4c4'), 14), mx(r.x), Y + 0.08, mz(r.z));
    add(cyl(r.island * F - 0.03, r.island * F - 0.03, 0.03, LAWN, 14), mx(r.x), Y + 0.12, mz(r.z));
    for (let k = 0; k < 5; k++) { const a = k * 1.2566; add(sphere(0.045, G(['#e0402a', '#f2c23a', '#ff7ab0'][k % 3], '#b8b8b8'), 5, 3), mx(r.x) + Math.cos(a) * 0.13, Y + 0.16, mz(r.z) + Math.sin(a) * 0.13); }
  }
  for (const c of V.culs) {
    add(cyl(c.r * F + 0.08, c.r * F + 0.08, 0.03, SW, 18), mx(c.x), Y + 0.017, mz(c.z)); add(cyl(c.r * F, c.r * F, 0.03, ASF, 18), mx(c.x), Y + 0.037, mz(c.z));
    add(cyl(0.12, 0.12, 0.05, LAWN, 10), mx(c.x), Y + 0.07, mz(c.z));
  }

  // ---- muro contínuo (no lugar da sebe), pilares e capa ----
  const WALLC = G('#efe6d2', '#cdcdcd'), CAP = G('#cbbd9f', '#b3b3b3'), WH = 0.5, WT = 0.24;
  const wallRun = (x0, x1, z0, z1) => {                      // em coordenadas da maquete
    const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (len < 0.05) return;
    add(box(alongX ? len : WT, WH, alongX ? WT : len, WALLC), cx, Y + WH / 2, cz);
    add(box(alongX ? len : WT + 0.06, 0.05, alongX ? WT + 0.06 : len, CAP), cx, Y + WH + 0.025, cz);
    const n = Math.max(1, Math.round(len / 1.4));
    for (let k = 0; k <= n; k++) { const u = (alongX ? x0 : z0) + len * k / n; add(box(0.3, WH + 0.1, 0.3, CAP), alongX ? u : cx, Y + (WH + 0.1) / 2, alongX ? cz : u); }
  };
  const E = 7.05, gx0 = -(RW / 2 + 0.15), gx1 = RW / 2 + 0.15, px0 = mx(V.PED.x0), px1 = mx(V.PED.x1);
  wallRun(-E, gx0, -E, -E); wallRun(gx1, px0, -E, -E); wallRun(px1, E, -E, -E);
  wallRun(-E, E, E, E); wallRun(-E, -E, -E, E); wallRun(E, E, -E, E);

  // ---- portaria: pilares do portal com luminária, guarita, cancela, jardins, palmeiras e o muro do nome do lado de fora ----
  for (const x of [gx0, gx1]) {
    add(box(0.24, 0.8, 0.4, CAP), x, Y + 0.4, -E); add(box(0.3, 0.05, 0.46, G('#b9ab90', '#a8a8a8')), x, Y + 0.82, -E);
    add(sphere(0.07, G('#fff3b0', '#e0e0e0'), 6, 4), x, Y + 0.9, -E);
  }
  for (const x of [px0, px1]) add(box(0.14, 0.62, 0.3, CAP), x, Y + 0.31, -E);   // vão de pedestres
  { const B = V.BOOTH, bx = mx((B.x0 + B.x1) / 2), bz = mz((B.z0 + B.z1) / 2);
    add(box(0.42, 0.34, 0.5, G('#f4f1ea', '#d6d6d6')), bx + 0.04, Y + 0.17, bz);
    add(box(0.03, 0.12, 0.36, G('#8fc6e8', '#9a9a9a')), bx - 0.18, Y + 0.24, bz);
    add(box(0.56, 0.05, 0.64, G('#5f646c', '#8a8a8a')), bx + 0.04, Y + 0.365, bz); }
  { const gz = mz(V.GATE.z), x0 = mx(V.GATE.x0), x1 = mx(V.GATE.x1), post = mx(V.GATE.post);
    add(box(0.07, 0.24, 0.07, G('#5f646c', '#8a8a8a')), post, Y + 0.12, gz);
    for (let k = 0; k < 4; k++) add(box((x1 - x0) / 4, 0.04, 0.04, G(k % 2 ? '#f4f4f4' : '#d8312a', k % 2 ? '#dddddd' : '#8a8a8a')), x1 - (k + 0.5) * (x1 - x0) / 4, Y + 0.22, gz); }
  for (const r of V.islands) { const w = (r.x1 - r.x0) * F, d = (r.z1 - r.z0) * F;   // canteiros com cerca viva baixa dos dois lados da faixa
    add(box(w, 0.05, d, LAWN), mx((r.x0 + r.x1) / 2), Y + 0.025, mz((r.z0 + r.z1) / 2));
    add(box(w, 0.09, 0.08, HEDGEC), mx((r.x0 + r.x1) / 2), Y + 0.07, mz(r.z1) - 0.04); }
  { const S = V.SIGN; add(box((S.x1 - S.x0) * F, 0.26, 0.12, WALLC), mx((S.x0 + S.x1) / 2), 0.43, -7.32);   // muro baixo do nome, na borda de fora
    add(box((S.x1 - S.x0) * F - 0.08, 0.06, 0.02, G('#3f7d3a', '#8a8a8a')), mx((S.x0 + S.x1) / 2), 0.47, -7.39); }
  add(box(RW, 0.03, 0.4, ASF), 0, 0.31, -7.3);                // a rua sai pela borda da base

  // ---- lago: passeio, borda de pedra, água, juncos, vitórias-régias, deque e patinhos ----
  const L = V.lake;
  flat(L.promenade, Y, 0.025, PAVE);
  flat(L.shore.map(([x, z]) => [L.x + (x - L.x) * 1.06, L.z + (z - L.z) * 1.04]), Y + 0.025, 0.04, G('#b8b0a2', '#b8b8b8'));
  flat(L.shore, Y + 0.065, 0.02, G('#4aa3d8', '#a0a0a0'));
  flat(L.inner.map(([x, z]) => [L.x + (x - L.x) * 0.8, L.z + (z - L.z) * 0.8]), Y + 0.085, 0.005, G('#62b4e2', '#a8a8a8'));
  for (const r of L.reeds.slice(0, 10)) add(cone(0.035, 0.16, G('#5f8f3a', '#8a8a8a'), 4), mx(r.x), Y + 0.15, mz(r.z));
  for (const p of L.pads.slice(0, 7)) { add(cyl(0.05, 0.05, 0.01, G('#4f9a45', '#8f8f8f'), 6), mx(p.x), Y + 0.095, mz(p.z)); if (p.flower) add(sphere(0.02, G('#ff9ac0', '#d0d0d0'), 4, 3), mx(p.x), Y + 0.11, mz(p.z)); }
  { const D = L.deck; add(box(D.w * F + 0.04, 0.03, D.d * F + 0.04, G('#a8743e', '#8f8f8f')), mx(D.x), Y + 0.1, mz(D.z)); }
  { const dp = L.duckPath, n = dp.length;                     // pata branca e 4 filhotes amarelos em fila
    const duck = (i, s, body, head) => {
      const [x, z] = dp[i % n], [x2, z2] = dp[(i + 1) % n], ry = Math.atan2(mx(x2) - mx(x), mz(z2) - mz(z));
      const p = new THREE.Group(); p.position.set(mx(x), Y + 0.09, mz(z)); p.rotation.y = ry; g.add(p);
      const b = sphere(0.06 * s, body, 6, 4); b.scale.set(0.8, 0.7, 1.2); p.add(ctx.at(b, 0, 0.035 * s, 0));
      p.add(ctx.at(sphere(0.04 * s, head, 6, 4), 0, 0.09 * s, 0.055 * s));
      p.add(ctx.at(box(0.03 * s, 0.015 * s, 0.04 * s, G('#f08a24', '#9a9a9a')), 0, 0.085 * s, 0.1 * s));
    };
    const s0 = 30; duck(s0, 2.3, G('#fbfbf6', '#e4e4e4'), G('#fbfbf6', '#e4e4e4'));
    for (let k = 1; k <= 4; k++) duck(s0 - 3 - 4 * k, 1.45, G('#f6d44a', '#d2d2d2'), G('#f6d44a', '#d2d2d2'));
    duck(72, 2.1, G('#8a6a44', '#9a9a9a'), G('#3f8a4a', '#9a9a9a')); duck(77, 2.1, G('#fbfbf6', '#e4e4e4'), G('#fbfbf6', '#e4e4e4')); }
  { const DH = { x: L.x - L.rx * 0.62, z: L.z + L.rz * 0.55 };   // casinha dos patos na margem
    add(box(0.14, 0.1, 0.12, G('#d8b48a', '#bdbdbd')), mx(DH.x) - 0.05, Y + 0.13, mz(DH.z));
    const r = M(prism(THREE), G('#b5402f', '#8c8c8c')); r.scale.set(0.18, 0.07, 0.16); g.add(ctx.at(r, mx(DH.x) - 0.05, Y + 0.18, mz(DH.z))); }

  // ---- parque: gramado, caminhos, cerca viva, praça do chafariz, coreto, playground, quadra, flores ----
  const P = V.PARK;
  add(box((P.x1 - P.x0) * F, 0.02, (P.z1 - P.z0) * F, LAWN), mx((P.x0 + P.x1) / 2), Y + 0.01, mz((P.z0 + P.z1) / 2));
  for (const p of V.parkPaths) add(box((p.x1 - p.x0) * F, 0.02, (p.z1 - p.z0) * F, PAVE), mx((p.x0 + p.x1) / 2), Y + 0.022, mz((p.z0 + p.z1) / 2));
  for (const h of V.hedges) add(box(Math.max(0.07, (h.x1 - h.x0) * F), 0.11, Math.max(0.07, (h.z1 - h.z0) * F), HEDGEC), mx((h.x0 + h.x1) / 2), Y + 0.055, mz((h.z0 + h.z1) / 2));
  { const pl = V.plaza, x = mx(pl.x), z = mz(pl.z);
    add(cyl(pl.r * F, pl.r * F, 0.02, PAVE, 16), x, Y + 0.034, z);
    add(cyl(0.15, 0.17, 0.07, G('#cfcac0', '#bbbbbb'), 10), x, Y + 0.08, z); add(cyl(0.12, 0.12, 0.02, G('#6fb3e0', '#a5a5a5'), 10), x, Y + 0.115, z);
    add(cyl(0.025, 0.03, 0.12, G('#cfcac0', '#bbbbbb'), 6), x, Y + 0.16, z); add(sphere(0.04, G('#9fd6ff', '#c8c8c8'), 5, 3), x, Y + 0.23, z); }
  for (const a of V.amen) {
    const x = mx(a.x), z = mz(a.z);
    if (a.k === 'gazebo') {                                    // coreto: base, colunas, telhado octogonal
      add(cyl(0.24, 0.26, 0.05, G('#e8e2d4', '#c8c8c8'), 8), x, Y + 0.035, z);
      for (let k = 0; k < 6; k++) add(box(0.025, 0.2, 0.025, G('#f4f1ea', '#dddddd')), x + Math.cos(k * 1.047) * 0.19, Y + 0.16, z + Math.sin(k * 1.047) * 0.19);
      add(cone(0.29, 0.17, G('#b5402f', '#8c8c8c'), 8), x, Y + 0.345, z);
    } else if (a.k === 'playground') {                         // areia, escorregador, balanço e trepa-trepa coloridos
      add(box(0.62, 0.02, 0.5, G('#ecd9a0', '#c8c8c8')), x, Y + 0.02, z);
      add(box(0.14, 0.18, 0.14, G('#3f8ad0', '#8a8a8a')), x - 0.16, Y + 0.12, z - 0.12); add(cone(0.12, 0.1, G('#e0402a', '#8a8a8a'), 4), x - 0.16, Y + 0.26, z - 0.12, 0, 0.785, 0);
      add(box(0.06, 0.03, 0.22, G('#f2c23a', '#a8a8a8')), x - 0.16, Y + 0.09, z + 0.05, 0.55, 0, 0);
      for (const dx of [0.08, 0.28]) add(box(0.025, 0.18, 0.025, G('#e0402a', '#8a8a8a')), x + dx, Y + 0.11, z - 0.12);
      add(box(0.24, 0.025, 0.025, G('#e0402a', '#8a8a8a')), x + 0.18, Y + 0.2, z - 0.12);
      add(box(0.15, 0.12, 0.15, G('#3fae5a', '#8a8a8a')), x + 0.17, Y + 0.08, z + 0.17);
    } else if (a.k === 'court') {                              // quadra com linhas
      add(box(18 * F, 0.02, 11 * F, G('#3f8a8a', '#9a9a9a')), x, Y + 0.025, z);
      add(box(18 * F - 0.08, 0.005, 0.02, G('#f4f4f4', '#dddddd')), x, Y + 0.037, z - 11 * F / 2 + 0.05); add(box(18 * F - 0.08, 0.005, 0.02, G('#f4f4f4', '#dddddd')), x, Y + 0.037, z + 11 * F / 2 - 0.05);
      add(box(0.02, 0.005, 11 * F - 0.1, G('#f4f4f4', '#dddddd')), x, Y + 0.037, z);
      for (const sd of [-1, 1]) add(box(18 * F, 0.12, 0.015, G('#6f737a', '#8a8a8a')), x, Y + 0.08, z + sd * 6 * F);
    } else if (a.k === 'flowers') {                            // jardim de flores: canteiros em anel
      add(cyl(a.r * F * 0.85, a.r * F * 0.85, 0.03, G('#7a5434', '#8a8a8a'), 12), x, Y + 0.03, z);
      for (let k = 0; k < 12; k++) { const r = k < 8 ? 0.27 : 0.11, a2 = k * (k < 8 ? 0.785 : 1.57) + 0.3;
        add(sphere(0.055, G(['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0', '#f4f4f4', '#ff9a3a'][k % 6], '#b0b0b0'), 5, 3), x + Math.cos(a2) * r, Y + 0.08, z + Math.sin(a2) * r); }
    }
  }

  // ---- clube: salão com laje e pergolado, deck com piscina cercada, estacionamento aberto para o anel ----
  { const C = V.club, rc = (b, h, y, c) => add(box((b.x1 - b.x0) * F, h, (b.z1 - b.z0) * F, c), mx((b.x0 + b.x1) / 2), y + h / 2, mz((b.z0 + b.z1) / 2));
    rc(C.deck, 0.03, Y, G('#e8dcc4', '#c8c8c8'));
    rc(C.pool, 0.012, Y + 0.03, G('#3fc0e8', '#a5a5a5'));
    rc(C.lot, 0.02, Y + 0.005, ASF);
    for (let k = 1; k < 4; k++) add(box(0.6, 0.004, 0.015, G('#f4f4f4', '#dddddd')), mx((C.lot.x0 + C.lot.x1) / 2), Y + 0.027, mz(C.lot.z0) + k * 0.4);
    for (const [x, z, c] of [[-0.12, 0.2, '#d8473a'], [0.12, 0.6, '#3a78d4']]) add(box(0.18, 0.08, 0.3, G(c, '#9a9a9a')), mx((C.lot.x0 + C.lot.x1) / 2) + x, Y + 0.065, mz(C.lot.z0) + z);
    rc(C.hall, 0.28, Y, G('#f4f2ec', '#d6d6d6'));
    add(box((C.hall.x1 - C.hall.x0) * F + 0.1, 0.04, (C.hall.z1 - C.hall.z0) * F + 0.1, G('#5f646c', '#8a8a8a')), mx((C.hall.x0 + C.hall.x1) / 2), Y + 0.3, mz((C.hall.z0 + C.hall.z1) / 2));
    add(box((C.hall.x1 - C.hall.x0) * F - 0.1, 0.12, 0.02, G('#8fc6e8', '#9a9a9a')), mx((C.hall.x0 + C.hall.x1) / 2), Y + 0.15, mz(C.hall.z1) + 0.005);
    const dk = C.deck; for (const [x0, z0, x1, z1] of [[dk.x0, dk.z0, dk.x1, dk.z0], [dk.x0, dk.z1, dk.x1, dk.z1], [dk.x0, dk.z0, dk.x0, dk.z1], [dk.x1, dk.z0, dk.x1, dk.z1]])
      add(box(Math.max(0.015, (x1 - x0) * F), 0.07, Math.max(0.015, (z1 - z0) * F), G('#f4f4f4', '#dddddd')), mx((x0 + x1) / 2), Y + 0.065, mz((z0 + z1) / 2));
    for (const z of [0.18, 0.5, 0.82]) { const u = mz(C.pool.z0) + ((C.pool.z1 - C.pool.z0) * F) * z; add(box(0.08, 0.02, 0.14, G('#f4f1ea', '#dddddd')), mx(C.pool.x1) + 0.12, Y + 0.04, u); } }

  // ---- casas (4 modelos do bairro), viradas para a rua: lote com jardim, cerca branca com portão, caminho e porta ----
  const WALLS = ['#f3e6c8', '#f4f2ec', '#f2c9a8', '#c9d8b4', '#c9ccd1'], ROOFS = ['#b5402f', '#5f646c', '#3f7a4a', '#7a4a2a'];
  const DOORS = ['#c8402f', '#2f6fb0', '#e8b02a', '#3f8a4a', '#f4f1ea'], FLOW = ['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0'];
  const MODELS = ['classic', 'chalet', 'classic', 'ell', 'garage', 'classic', 'chalet', 'ell'];
  V.spots.forEach((sp, i) => {
    const hg = new THREE.Group(); hg.position.set(mx(sp.px), Y, mz(sp.pz)); hg.rotation.y = sp.ry; g.add(hg);
    const a = (m, x, y, z, ry = 0) => hg.add(ctx.at(m, x * HS, y, z * HS, 0, ry, 0));
    const wall = G(WALLS[(i * 3) % 5], '#d2d2d2'), roofc = G(ROOFS[(i * 7 + 1) % 4], '#8c8c8c'), model = MODELS[(i * 5 + 3) % 8];
    const two = (i * 11) % 3 === 0 && model !== 'garage', H = (two ? 6 : 3) * VS;
    const body = (x0, x1, z0, z1, h = H) => a(box((x1 - x0) * HS, h, (z1 - z0) * HS, wall), (x0 + x1) / 2, h / 2 + 0.02, (z0 + z1) / 2);
    const roof = (cx, cz, len, half, rise, top, rot = 0) => { const r = M(prism(THREE), roofc); r.scale.set(len * HS, rise * VS, half * 2 * HS); a(r, cx, top + 0.02, cz, rot); };
    a(box(16 * HS, 0.02, 16 * HS, LAWN), 0, 0.01, 0);             // gramado do lote
    let doorX = 0, doorZ = 0.2;
    if (model === 'ell') { body(-4.6, 4.6, -7.2, -2.0); body(-4.6, -0.4, -2.0, 1.4); roof(0, -4.6, 9.8, 2.9, 2.0, H); roof(-2.5, -1.0, 5.2, 2.4, 2.0, H, Math.PI / 2); doorX = 1.3; doorZ = -2.0; }
    else if (model === 'garage') { body(-1.4, 4.6, -7.2, 0.2); roof(1.6, -3.5, 6.6, 4.0, 2.2, H); body(-4.8, -1.4, -6.6, 0.2, 2.7 * VS);
      a(box(3.6 * HS, 0.03, 7.2 * HS, G('#ece6d8', '#cfcfcf')), -3.1, 2.7 * VS + 0.035, -3.2);
      a(box(2.6 * HS, 2.1 * VS, 0.02, G('#9aa0a8', '#9a9a9a')), -3.1, 1.05 * VS + 0.02, 0.22);
      a(box(2.6 * HS, 0.012, 7.6 * HS, G('#cfc8b8', '#bfbfbf')), -3.1, 0.026, 4.4); doorX = 1.2; }
    else { body(-4.6, 4.6, -7.2, 0.2); if (model === 'chalet') roof(0, -3.5, 8.2, 5.0, 3.6, H, Math.PI / 2); else roof(0, -3.5, 10, 4.1, 2.4, H); }
    a(box(1.5 * HS, 2.2 * VS, 0.02, G(DOORS[(i * 2) % 5], '#777777')), doorX, 1.1 * VS + 0.02, doorZ + 0.02);
    for (const wx of model === 'ell' ? [-2.5] : model === 'garage' ? [3.0] : [-2.85, 2.85]) a(box(1.6 * HS, 1.1 * VS, 0.02, G('#8fc6e8', '#a8a8a8')), wx, 1.5 * VS + 0.02, (model === 'ell' ? 1.4 : 0.2) + 0.02);
    if (two) for (const wx of model === 'ell' ? [-2.5] : [-2.85, 2.85]) a(box(1.6 * HS, 1.1 * VS, 0.02, G('#8fc6e8', '#a8a8a8')), wx, 4.5 * VS + 0.02, (model === 'ell' ? 1.4 : 0.2) + 0.02);
    if (i % 3 !== 1) a(box(3.0 * HS, 0.05, 0.9 * HS, G(FLOW[i % 4], '#b8b8b8')), model === 'garage' ? 3.2 : -2.9, 0.045, (model === 'ell' ? 1.4 : 0.2) + 0.7);   // canteiro de flores
    const gx = model === 'garage' ? 1.2 : doorX, dz = doorZ + 0.4;
    a(box(1.3 * HS, 0.012, (8.3 - dz) * HS, PAVE), gx, 0.026, (dz + 8.3) / 2);   // caminho de pedras até o portão
    for (const [x0, x1] of [[-8.3, gx - 1.4], [gx + 1.4, 8.3]]) if (x1 - x0 > 0.5) a(box((x1 - x0) * HS, 0.07, 0.02, G('#fbf8f1', '#e6e6e6')), (x0 + x1) / 2, 0.055, 8.3);   // cerca branca
  });

  // ---- árvores do plano (sem as que cairiam sobre casas ou no meio do parque e das ruas) ----
  const crowns = { round: ['#3f8f3a', '#4f9a45', '#5aa64a'], tall: ['#2f7a3a', '#3a8440', '#2f7a3a'] };
  const tr = [];
  for (const t of V.trees) {
    const x = mx(t.x), z = mz(t.z);
    if (V.spots.some(sp => Math.abs(mx(sp.px) - x) < 0.55 && Math.abs(mz(sp.pz) - z) < 0.55)) continue;
    if (tr.some(o => Math.hypot(o[0] - x, o[1] - z) < (t.park ? 0.55 : 0.5))) continue;
    tr.push([x, z]);
    const s = t.s || 1, c = t.c || 0;
    if (t.type === 'palm') {
      add(cyl(0.02, 0.03, 0.42, G('#8a6a44', '#7a7a7a'), 4), x, Y + 0.21, z, 0.08, 0, 0.05);
      for (let k = 0; k < 5; k++) add(box(0.26, 0.012, 0.06, G('#3f9a45', '#8f8f8f')), x + Math.cos(k * 1.257) * 0.11, Y + 0.41, z + Math.sin(k * 1.257) * 0.11, 0, -k * 1.257, -0.35);
      continue;
    }
    const h = 0.16 * s, r = (t.type === 'tall' ? 0.13 : t.type === 'willow' ? 0.19 : 0.17) * s;
    add(cyl(0.022, 0.03, h + 0.04, G('#6b4526', '#6a6a6a'), 4), x, Y + (h + 0.04) / 2, z);
    const col = t.type === 'ipe' ? ['#f2c23a', '#ff8fb8', '#f2c23a'][c] : t.type === 'willow' ? '#7fb54a' : (crowns[t.type] || crowns.round)[c];
    const cr = sphere(r, G(col, '#8a8a8a'), 6, 4);
    if (t.type === 'tall') cr.scale.set(0.85, 1.6, 0.85); else if (t.type === 'willow') cr.scale.set(1, 0.8, 1);
    add(cr, x, Y + h + r * (t.type === 'tall' ? 1.25 : 0.7), z);
  }
}
