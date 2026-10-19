// Maquete do Bairro 18 (Modernista), desenhada a partir do plano real (modernPlan.js) em escala de miniatura:
// teia de ruas com curvas, 5 rotatórias com ilha e escultura e 6 balões de retorno; muro contínuo com pilares e a portaria
// (pilares largos, cancela, guarita e placa do lado de fora); casas modernistas nos 4 volumes do bairro (laje plana com friso
// escuro, vidro azulado, porta colorida, garagem, ripado de madeira, piscina), cada uma de frente para a sua rua, com gramado,
// caminho e entrada de carro; 2 lojinhas; árvores do plano e arbustos entre os lotes.
import { planModern } from '../modernPlan.js';

const MAP = 1.6 * 2 + 7.6 * 11 + 17.2 * 10, HEDGE = 1.6;   // área 10×10 do bairro (layout.js)
const F = 14 / MAP;                                          // metros do bairro → unidades da maquete
const Y = 0.4;                                               // topo do gramado da base
const HS = 1.12 * F, VS = 1.9 * F;                           // casas um pouco maiores e mais altas que a escala (leitura em miniatura)

export const signY = 10.5;
export const thumb = { dir: [-6, 24, 27], k: 0.82, dy: 0 };

export function build(ctx) {
  const { THREE, g, add, G, box, cyl, sphere, at } = ctx;
  const V = planModern(MAP, HEDGE), CX = MAP / 2;
  const mx = x => (x - CX) * F, mz = z => (z - CX) * F;
  const M = (geo, c) => new THREE.Mesh(geo, ctx.mat(c));
  const PL = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), VP = new THREE.PlaneGeometry(1, 1), CI = {};
  const fl = (w, d, c) => { const m = M(PL, c); m.scale.set(w, 1, d); return m; };                      // retângulo deitado (2 triângulos)
  const vp = (w, h, c) => { const m = M(VP, c); m.scale.set(w, h, 1); return m; };                       // retângulo em pé, virado para +z
  const dk = (r, c, n) => { const m = M(CI[n] || (CI[n] = new THREE.CircleGeometry(1, n).rotateX(-Math.PI / 2)), c); m.scale.set(r, 1, r); return m; };   // disco deitado
  const ASF = G('#555b66', '#6a6a6a'), SW = G('#dcd8cf', '#c6c6c6'), GRASS = G('#79b955', '#a3a3a3'), LAWN = G('#8fd066', '#b2b2b2');
  const WHITE = G('#f4f3ef', '#dedede'), ROOFC = G('#ecebe6', '#d8d8d8'), DARK = G('#33363d', '#5e5e5e'), GLASS = G('#7fb8e0', '#9c9c9c'), CONC = G('#c9c6bd', '#b6b6b6');

  // ---- base ----
  add(box(15, 0.3, 15, G('#d4cdbb', '#b9b9b9')), 0, 0.15, 0);
  add(box(14.4, 0.1, 14.4, GRASS), 0, 0.35, 0);

  // ---- ruas: calçada contínua + asfalto + faixa tracejada; rotatórias com ilha e escultura; balões de retorno ----
  const RW = 10 * F, SWW = (10 + 3.4) * F;
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az) * F, ry = Math.atan2(bx - ax, bz - az), x = mx((ax + bx) / 2), z = mz((az + bz) / 2);
    add(fl(SWW, len, SW), x, Y + 0.012, z, 0, ry, 0);
    add(fl(RW, len, ASF), x, Y + 0.024, z, 0, ry, 0);
    if (s.type !== 'cul') for (let t = 0.75; t < len - 0.6; t += 0.36) add(fl(0.025, 0.16, G('#f2f2f2', '#dedede')), x + Math.sin(ry) * (t - len / 2), Y + 0.036, z + Math.cos(ry) * (t - len / 2), 0, ry, 0);
  }
  for (const [k, [x, z]] of Object.entries(V.N)) {
    if (k === 'n0') continue;
    const r = V.nodeR(k) * F;
    add(dk(r + 0.09, SW, 20), mx(x), Y + 0.014, mz(z)); add(dk(r, ASF, 20), mx(x), Y + 0.026, mz(z));
  }
  for (const i of V.islands) {                                // ilha: meio-fio, grama e escultura geométrica (branco, laranja, azul)
    const x = mx(i.x), z = mz(i.z), r = i.r * F;
    add(cyl(r, r, 0.06, G('#e2e0da', '#cfcfcf'), 16), x, Y + 0.07, z); add(cyl(r - 0.03, r - 0.03, 0.02, LAWN, 16), x, Y + 0.105, z);
    add(box(0.07, 0.34, 0.07, WHITE), x - 0.05, Y + 0.28, z);
    add(box(0.2, 0.06, 0.06, G('#ec7a26', '#9a9a9a')), x + 0.02, Y + 0.33, z + 0.03, 0, 0.6, 0);
    add(box(0.06, 0.16, 0.06, G('#2f6fb0', '#8a8a8a')), x + 0.06, Y + 0.19, z - 0.05);
  }
  for (const k of V.CULS) { const [x, z] = V.N[k]; add(cyl(0.13, 0.13, 0.05, LAWN, 10), mx(x), Y + 0.065, mz(z)); add(sphere(0.08, G('#4f9a45', '#8a8a8a'), 6, 4), mx(x), Y + 0.13, mz(z)); }

  // ---- muro do condomínio (pilares salientes para fora, capa escura) e portaria ----
  const WALLC = G('#e9e6df', '#d4d4d4'), PIL = G('#d2cec5', '#bdbdbd'), CAPC = G('#5f636a', '#808080'), WH = 0.42;
  for (const w of V.walls) {
    const alongX = w.x1 - w.x0 > w.z1 - w.z0, x0 = mx(w.x0), x1 = mx(w.x1), z0 = mz(w.z0), z1 = mz(w.z1);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, len = alongX ? x1 - x0 : z1 - z0, T = 0.18;
    add(box(alongX ? len : T, WH, alongX ? T : len, WALLC), cx, Y + WH / 2, cz);
    add(box(alongX ? len : T + 0.05, 0.035, alongX ? T + 0.05 : len, CAPC), cx, Y + WH + 0.017, cz);
    const out = Math.sign((alongX ? cz : cx)) * 0.05, n = Math.max(1, Math.round(len / 1.6)), a0 = alongX ? x0 : z0;
    for (let k = 0; k <= n; k++) { const u = Math.min(a0 + len - 0.06, Math.max(a0 + 0.06, a0 + len * k / n));
      add(box(alongX ? 0.12 : T + 0.1, WH + 0.05, alongX ? T + 0.1 : 0.12, PIL), alongX ? u : cx + out, Y + (WH + 0.05) / 2, alongX ? cz + out : u); }
  }
  { const GT = V.GATE, wz = mz(HEDGE / 2), gx0 = mx(GT.x0), gx1 = mx(GT.x1);
    for (const x of [gx0 - 0.08, gx1 + 0.08]) { add(box(0.16, 0.66, 0.24, PIL), x, Y + 0.33, wz); add(box(0.2, 0.04, 0.28, CAPC), x, Y + 0.68, wz); }
    for (let k = 0; k < 4; k++) add(box((gx1 - gx0) / 4, 0.035, 0.035, G(k % 2 ? '#f4f4f4' : '#d8312a', k % 2 ? '#dddddd' : '#8a8a8a')), gx0 + (k + 0.5) * (gx1 - gx0) / 4, Y + 0.24, wz + 0.02);
    const B = V.BOOTH, bx = mx((B.x0 + B.x1) / 2), bz = mz((B.z0 + B.z1) / 2), bw = (B.x1 - B.x0) * F, bd = (B.z1 - B.z0) * F;
    add(box(bw, 0.26, bd, WHITE), bx, Y + 0.13, bz);
    add(box(bw + 0.1, 0.035, bd + 0.06, CAPC), bx - 0.03, Y + 0.28, bz);
    add(box(0.01, 0.09, bd - 0.08, GLASS), bx - bw / 2 - 0.005, Y + 0.17, bz);
    add(box(1.2, 0.18, 0.04, G('#2b2d33', '#5a5a5a')), gx0 - 0.85, 0.42, -7.32);   // placa "RESIDENCIAL MODERNISTA" do lado de fora
    add(box(0.9, 0.025, 0.01, G('#f4f3ef', '#dedede')), gx0 - 0.85, 0.43, -7.345);
    add(box(RW, 0.03, 0.42, ASF), 0, 0.31, -7.28); }                                   // a rua sai pela borda

  // ---- casas: volumes deslocados, laje plana com friso escuro, vidro, porta colorida; gramado, caminho e garagem ----
  const FAC = ['#f4f3ef', '#e3d4b8', '#bfc3c8'], DOOR = ['#2f6fb0', '#c8402f', '#e8b02a', '#3f8a4a', '#2b2d33', '#ec7a26'];
  const SHOPS = new Set([0, 21]), SHOPC = ['#ec7a26', '#2f6fb0'];
  V.spots.forEach((sp, i) => {
    const hg = new THREE.Group(); hg.position.set(mx(sp.px), Y, mz(sp.pz)); hg.rotation.y = sp.ry; g.add(hg);
    const a = (m, x, y, z) => hg.add(at(m, x * HS, y, z * HS));
    const vol = (x0, x1, z0, z1, y0, y1, c) => {               // volume com laje (beiral) e friso escuro
      a(box((x1 - x0) * HS, (y1 - y0) * VS, (z1 - z0) * HS, c), (x0 + x1) / 2, 0.02 + (y0 + y1) / 2 * VS, (z0 + z1) / 2);
      a(box((x1 - x0 + 0.6) * HS, 0.035, (z1 - z0 + 0.6) * HS, ROOFC), (x0 + x1) / 2, 0.02 + y1 * VS + 0.0175, (z0 + z1) / 2);
      a(vp((x1 - x0 + 0.62) * HS, 0.012, DARK), (x0 + x1) / 2, 0.02 + y1 * VS + 0.002, z1 + 0.32);   // friso escuro sob a laje (na frente)
    };
    const win = (x0, x1, y0, y1, z) => { a(vp((x1 - x0) * HS, (y1 - y0) * VS, GLASS), (x0 + x1) / 2, 0.02 + (y0 + y1) / 2 * VS, z + 0.1);
      a(vp((x1 - x0 + 0.2) * HS, 0.014, DARK), (x0 + x1) / 2, 0.02 + y0 * VS, z + 0.14); };
    a(fl(16.6 * HS, 16.6 * HS, LAWN), 0, 0.008, 0);       // gramado aberto do lote
    if (SHOPS.has(i)) {                                         // lojinha: caixa baixa com marquise, vitrine e faixa colorida; estacionamento
      const c = G(SHOPC[i % 2], '#9a9a9a');
      a(box(13.4 * HS, 4 * VS, 9 * HS, WHITE), 0, 0.02 + 2 * VS, -2);
      a(box(14.2 * HS, 0.04, 10.6 * HS, ROOFC), 0, 0.02 + 4 * VS + 0.02, -1.5);
      a(vp(13.4 * HS, 0.7 * VS, c), 0, 0.02 + 3.5 * VS, 2.6);
      win(-6, -1, 0.3, 2.9, 2.5); win(1, 6, 0.3, 2.9, 2.5);
      a(box(4.4 * HS, 1.2 * VS, 0.03, c), 0, 0.02 + 4.9 * VS + 0.03, 2.3);
      a(fl(15 * HS, 5 * HS, G('#bdbab2', '#b0b0b0')), 0, 0.016, 5.8);
      return;
    }
    const fac = FAC[(i * 2) % 3], c = G(fac, '#d2d2d2'), two = (i * 7) % 3 !== 1, shape = (i * 5 + 1) % 4, gar = i % 3 !== 2, H = 3.0;
    const alt = G(fac === '#f4f3ef' ? '#d9dadc' : '#f4f3ef', '#cacaca');
    let fz;
    if (shape === 0) { fz = 0.5; vol(-7.4, 3.1, -7.5, fz, 0, two ? 2 * H : H, c); win(-6.6, -2.3, 0.5, 2.6, fz); if (two) win(-6.6, 2.4, 3.6, 5.4, fz); }
    else if (shape === 1) { fz = 0.5; vol(-7.0, 3.1, -7.0, fz, 0, H, c); win(-6.4, -2.3, 0.5, 2.6, fz);
      if (two) { vol(-6.0, 3.6, -6.5, 2.2, H, 2 * H, alt); win(-5.4, 3.0, 3.6, 5.5, 2.2); } else a(box(11.6 * HS, 0.035, 9.2 * HS, ROOFC), -2.2, 0.02 + H * VS + 0.06, -3.0); }
    else if (shape === 2) { fz = 0.0; vol(-7.6, 3.1, -6.0, fz, 0, H, c); win(-7.0, -2.3, 0.5, 2.6, fz);
      vol(-6.6, -2.2, -7.6, -1.0, 0, two ? 2 * H : H + 1.4, G(fac === '#bfc3c8' ? '#e3d4b8' : '#9aa0a8', '#bcbcbc')); win(-6.0, -2.8, two ? 3.6 : 3.1, two ? 5.4 : 4.0, -1.0); }
    else { fz = 1.2; vol(-7.4, 0.6, -7.0, fz, 0, two ? 2 * H : H, c); win(-6.6, -2.3, 0.5, 2.6, fz); if (two) win(-6.6, 0.0, 3.6, 5.4, fz);
      vol(0.6, 3.1, -5.6, -0.4, 0, 2.6, alt); }
    a(vp(1.3 * HS, 2.35 * VS, G(DOOR[i % 6], '#6e6e6e')), -1.0, 0.02 + 1.18 * VS, fz + 0.12);            // porta + marquise escura
    a(box(2.8 * HS, 0.025, 1.7 * HS, DARK), -1.0, 0.02 + 2.75 * VS, fz + 0.85);
    a(fl(1.4 * HS, (8.3 - fz) * HS, G('#e6e3dc', '#d0d0d0')), -1.0, 0.016, (fz + 8.3) / 2);           // caminho até a calçada
    if (gar) { vol(3.3, 7.9, -6.6, -0.2, 0, H, G(fac === '#bfc3c8' ? '#9aa0a8' : '#bfc3c8', '#b0b0b0'));
      a(vp(3.6 * HS, 2.4 * VS, G(['#9aa0a8', '#a8743e', '#2b2d33'][i % 3], '#8a8a8a')), 5.6, 0.02 + 1.2 * VS, -0.1);
      a(fl(4.2 * HS, 8.4 * HS, G('#bdbab2', '#b4b4b4')), 5.6, 0.016, 4.0); }
    if (i % 4 === 1) a(vp(1.9 * HS, 2.6 * VS, G('#b07a44', '#8a8a8a')), 1.0, 0.02 + 1.4 * VS, fz + 0.12);   // ripado de madeira
    if (i % 5 === 2 && !gar) { a(box(3.0 * HS, 0.02, 2.4 * HS, G('#e2e0da', '#d0d0d0')), 4.6, 0.03, 3.6); a(box(2.5 * HS, 0.01, 1.9 * HS, G('#4fb2e2', '#a2a2a2')), 4.6, 0.045, 3.6); }   // piscina
    else if (i % 5 === 2) { a(box(3.0 * HS, 0.02, 2.2 * HS, G('#e2e0da', '#d0d0d0')), -5.4, 0.03, 4.4); a(box(2.5 * HS, 0.01, 1.7 * HS, G('#4fb2e2', '#a2a2a2')), -5.4, 0.045, 4.4); }
    a(box(4.0 * HS, 0.05, 0.6 * HS, CONC), -4.6, 0.045, fz + 0.4);                                              // floreira sob a janela
    
    a(sphere(0.085, G(i % 2 ? '#3f8a3a' : '#4f9a45', '#8c8c8c'), 5, 3), i % 2 ? -7.4 : 7.4, 0.08, -7.4);   // arbustos nos cantos do fundo
  });

  // ---- árvores do plano (copas verdes redondas e altas) e mais algumas nos vãos livres ----
  const tr = [], extra = [], TRK = new THREE.CylinderGeometry(0.02, 0.028, 1, 3, 1, true);
  let sd = 1803; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let z = HEDGE + 5; z < MAP - 4; z += 9) for (let x = HEDGE + 5; x < MAP - 4; x += 9) {   // mais verde nos vãos entre lotes e ruas
    const px = x + (rnd() - 0.5) * 5, pz = z + (rnd() - 0.5) * 5;
    if (rnd() < 0.22 && V.free(px, pz, 1.2, 5 + 3.2)) extra.push({ x: px, z: pz, s: 0.7 + rnd() * 0.4, type: rnd() < 0.3 ? 'tall' : 'round', k: rnd() });
  }
  for (const t of V.trees.concat(extra)) {
    const x = mx(t.x), z = mz(t.z);
    if (tr.some(o => Math.hypot(o[0] - x, o[1] - z) < 0.45)) continue;
    tr.push([x, z]);
    const s = t.s || 1, h = 0.16 * s, tall = t.type === 'tall', r = (tall ? 0.12 : 0.17) * s, col = ['#3f8f3a', '#4f9a45', '#2f7a3a'][Math.floor((t.k || 0) * 3)];
    { const tk = M(TRK, G('#6b4526', '#6a6a6a')); tk.scale.y = h + 0.04; add(tk, x, Y + (h + 0.04) / 2, z); }
    const cr = sphere(r, G(col, '#8a8a8a'), 5, 3); if (tall) cr.scale.set(0.85, 1.6, 0.85); else cr.scale.set(1, 0.85, 1);
    add(cr, x, Y + h + r * (tall ? 1.25 : 0.65), z);
  }
}
