// Nível 17 (Bairro Jardins): condomínio fechado planejado (área 10×10, sem grade).
//  - muro contínuo em volta (no lugar da sebe); a única entrada é a portaria, no meio do muro norte: guarita, cancela
//    (sobe sozinha para a van — main.js) e passagem de pedestres com portãozinho (só a pé);
//  - rotatória logo depois da portaria e outra ao sul; ruas-ramal com balão de retorno nos 4 cantos; anel em volta do miolo;
//  - miolo: lago com patinhos (oeste, a van chega até a borda de pedra), parque com cerca viva (coreto, playground, chafariz,
//    jardim de flores e quadra; aberturas só para pedestres) e o clube (salão, piscina e estacionamento, leste);
//  - faixas arborizadas entre as ruas, árvores nas calçadas e nos cantos livres;
//  - casas (lote 17,2) de frente para as ruas; 4 casas dentro do parque, com a entrada voltada para ele (só a pé).
// Tudo é geometria pura (x = leste, z = sul); o desenho fica em models/garden.js.

export const GARD = { RW: 8 };
let CACHE = null;                                   // (o plano é fixo: calculado uma vez)

export function planGarden(MAP, HEDGE) {
  if (CACHE && CACHE.MAP === MAP && CACHE.HEDGE === HEDGE) return CACHE;
  return (CACHE = makePlan(MAP, HEDGE));
}
function makePlan(MAP, HEDGE) {
  const { RW } = GARD, hw = RW / 2, CX = MAP / 2, M = x => +(MAP - x).toFixed(3);   // M: espelho leste–oeste
  const IN1 = MAP - HEDGE;                                                          // face interna dos muros sul e leste
  // ---- ruas: ramal norte (z≈30) · anel (norte z≈70, sul z≈188, lados x≈27) · ramal sul (z≈229) ----
  const N = {
    e0: [CX, -4], r1: [CX, 38],
    a1: [106, 34], a2: [82, 29], a3: [58, 32], a4: [24, 30],                       // ramal noroeste (sem saída)
    l0: [CX, 70], l1: [102, 68], l2: [74, 72], l3: [46, 69], l4: [30, 80], l5: [28.5, 129], l6: [30, 178],
    l7: [46, 189], l8: [74, 187], l9: [102, 190], r2m: [CX, 188],
    r2: [CX, 229], s1: [106, 227], s2: [82, 230.5], s3: [58, 228], s4: [24, 229],   // ramal sudoeste (sem saída)
  };
  for (const k of ['a1', 'a2', 'a3', 'a4', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 's1', 's2', 's3', 's4']) N[k.toUpperCase()] = [M(N[k][0]), N[k][1]];   // metade leste (espelho)
  const E = [
    ['e0', 'r1'], ['r1', 'a1'], ['a1', 'a2'], ['a2', 'a3'], ['a3', 'a4'], ['r1', 'A1'], ['A1', 'A2'], ['A2', 'A3'], ['A3', 'A4'],
    ['r1', 'l0'],
    ['l0', 'l1'], ['l1', 'l2'], ['l2', 'l3'], ['l3', 'l4'], ['l4', 'l5'], ['l5', 'l6'], ['l6', 'l7'], ['l7', 'l8'], ['l8', 'l9'], ['l9', 'r2m'],
    ['l0', 'L1'], ['L1', 'L2'], ['L2', 'L3'], ['L3', 'L4'], ['L4', 'L5'], ['L5', 'L6'], ['L6', 'L7'], ['L7', 'L8'], ['L8', 'L9'], ['L9', 'r2m'],
    ['r2m', 'r2'],
    ['r2', 's1'], ['s1', 's2'], ['s2', 's3'], ['s3', 's4'], ['r2', 'S1'], ['S1', 'S2'], ['S2', 'S3'], ['S3', 'S4'],
  ];
  const segs = E.map(([a, b]) => ({ a: N[a], b: N[b], na: a, nb: b }));
  const rounds = [{ x: N.r1[0], z: N.r1[1], r: 10, island: 3.6 }, { x: N.r2[0], z: N.r2[1], r: 10, island: 3.6 }];
  const culs = ['a4', 'A4', 's4', 'S4'].map(k => ({ x: N[k][0], z: N[k][1], r: 8.5 }));   // balões de retorno
  const SG = new Float64Array(segs.length * 5);
  segs.forEach((s, i) => { const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az; SG.set([ax, az, dx, dz, dx * dx + dz * dz], i * 5); });
  const DISCS = rounds.concat(culs);
  const roadDist = (x, z) => {                      // distância ao eixo da rua mais perto (rotatórias e balões contam pela borda)
    let d2 = 1e18;
    for (let i = 0; i < SG.length; i += 5) {
      const ax = SG[i], az = SG[i + 1], dx = SG[i + 2], dz = SG[i + 3];
      let t = ((x - ax) * dx + (z - az) * dz) / SG[i + 4]; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = x - ax - dx * t, ez = z - az - dz * t, q = ex * ex + ez * ez; if (q < d2) d2 = q;
    }
    let d = Math.sqrt(d2);
    for (let i = 0; i < DISCS.length; i++) { const r = DISCS[i], q = Math.hypot(x - r.x, z - r.z) - r.r + hw; if (q < d) d = q; }
    return d;
  };
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;

  // ---- portaria (muro norte): faixa da van com cancela, guarita à direita de quem entra, passagem de pedestres ----
  const GATE = { x: CX, z: 14, x0: CX - hw, x1: CX + hw, post: CX + hw + 0.55 };   // cancela (atravessa a rua; o poste fica do lado da guarita)
  const BOOTH = { x0: CX + 5.6, x1: CX + 10, z0: 4.6, z1: 11 };                    // guarita
  const PED = { x0: CX + 11, x1: CX + 13.4, z: HEDGE / 2 };                          // vão de pedestres no muro (portãozinho)
  const pedPath = [{ x0: PED.x0, x1: PED.x1, z0: 0, z1: 23 }, { x0: CX + hw + 0.2, x1: PED.x1, z0: 20.6, z1: 23 }];   // calçada até a rua
  const SIGN = { x0: CX - 17, x1: CX - 7, z0: -3.4, z1: -1.9 };                     // muro baixo com o nome do condomínio (lado de fora)
  const portaria = { x0: CX - 24, x1: CX + 24, z0: 0, z1: 26 };
  const corridors = [{ x0: CX - 3.4, x1: CX + 3.4, z0: 66, z1: 100 }, { x0: CX - 3.4, x1: CX + 3.4, z0: 159, z1: 192 }];   // passagens a pé estrada ↔ parque
  // ---- miolo: lago (oeste), parque (meio) e clube (leste) ----
  const PARK = { x0: 78, x1: M(78), z0: 99, z1: 160 }, PZ = 129.5;
  const LAKEZ = { x0: 33, x1: 77.4, z0: 98, z1: 161 }, CLUBZ = { x0: M(77.4), x1: M(33), z0: 98, z1: 161 };
  const zones = [portaria, PARK, LAKEZ, CLUBZ, ...corridors];

  // ---- casas ----
  const S = 9.0, spots = [];
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const finish = (sp, lv = 0) => {
    const c = toW(sp, 0, -3.6), d = toW(sp, 0, 11.4), r = toW(sp, 0, 6.6), w0 = toW(sp, -5.2, -7.6), w1 = toW(sp, 5.2, 1.6);
    Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry }, y: lv,
      walkBox: { x0: Math.min(w0.x, w1.x), x1: Math.max(w0.x, w1.x), z0: Math.min(w0.z, w1.z), z1: Math.max(w0.z, w1.z) } });
    spots.push(sp);
  };
  // 4 casas dentro do parque (cantos), com a entrada voltada para ele: a van para no anel; o resto é a pé
  for (const [px, top] of [[87.6, true], [M(87.6), true], [87.6, false], [M(87.6), false]]) {
    const pz = top ? PARK.z0 + S + 0.4 : PARK.z1 - S - 0.4, fz = top ? 1 : -1;
    finish({ px, pz, ry: Math.atan2(0, fz), fx: 0, fz, box: { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S }, tags: ['loc:parkdoor'], foot: true });
  }
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };
  for (const sg of segs) {
    if (sg.na === 'e0' || sg.na === 'r1' && sg.nb === 'l0' || sg.na === 'r2m' && sg.nb === 'r2') continue;   // entrada e avenidas: sem casas (canteiros e árvores)
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 3; t < len - 2; t += 2) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, ax2 = Math.abs(nx) > Math.abs(nz), fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);
      for (const off of [hw + 2.6 + S, hw + 4 + S, hw + 6 + S]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off, b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
        if (b.x0 < HEDGE + 1.5 || b.z0 < HEDGE + 1.5 || b.x1 > IN1 - 1.5 || b.z1 > IN1 - 1.5) continue;
        if (zones.some(zn => hit(b, zn, 0.6)) || !clearOfRoads(b, 0.8) || spots.some(o => hit(b, o.box, 2.4))) continue;
        if (rounds.some(r => Math.hypot(px - r.x, pz - r.z) < r.r + S + 1)) continue;
        // a porta precisa cair numa rua de verdade (logo à frente do lote)
        const dx = px + fx * 11.4, dz = pz + fz * 11.4;
        if (roadDist(dx, dz) > hw + 2.5) continue;
        finish({ px, pz, ry: Math.atan2(fx, fz), fx, fz, box: b, tags: [] });
        break;
      }
    }
  }

  // ---- lago: contorno orgânico, borda de pedra (sólida, a van chega até ela), juncos, vitórias-régias e o caminho dos patinhos ----
  const LK = { x: 55, z: 129.5, rx: 14.5, rz: 25 };
  const lakeR = a => 1 + 0.05 * Math.sin(3 * a + 0.7) + 0.035 * Math.cos(5 * a);
  const outline = (k = 1, n = 64) => [...Array(n).keys()].map(i => { const a = i / n * Math.PI * 2, r = lakeR(a) * k; return [LK.x + Math.cos(a) * LK.rx * r, LK.z + Math.sin(a) * LK.rz * r]; });
  const shore = outline(1);
  const inPoly = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const polyDist = (P, x, z) => { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [ax, az] = P[j], [bx, bz] = P[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
  // água sólida: poucos círculos (cobertura gulosa de pontos de dentro do contorno), +0,35 por baixo da borda de pedra
  const lakeSolids = [];
  { const cand = [], px = [], pz = [];
    for (let x = LK.x - LK.rx * 1.1; x <= LK.x + LK.rx * 1.1; x += 2) for (let z = LK.z - LK.rz * 1.1; z <= LK.z + LK.rz * 1.1; z += 2) if (inPoly(shore, x, z)) { const r = polyDist(shore, x, z); if (r > 1.5) cand.push({ x, z, r: r + 0.35 }); }
    for (let x = LK.x - LK.rx * 1.1; x <= LK.x + LK.rx * 1.1; x += 1) for (let z = LK.z - LK.rz * 1.1; z <= LK.z + LK.rz * 1.1; z += 1) if (inPoly(shore, x, z) && polyDist(shore, x, z) > 0.45) { px.push(x); pz.push(z); }
    const done = new Uint8Array(px.length); let left = px.length;
    while (left) {
      let best = null, bn = 0;
      for (const c of cand) { const r2 = c.r * c.r; let n = 0; for (let i = 0; i < px.length; i++) { if (done[i]) continue; const ex = px[i] - c.x, ez = pz[i] - c.z; if (ex * ex + ez * ez < r2) n++; } if (n > bn) { bn = n; best = c; } }
      if (!best) break;
      lakeSolids.push({ x0: best.x - best.r, x1: best.x + best.r, z0: best.z - best.r, z1: best.z + best.r, r: best.r, cx: best.x, cz: best.z, lake: true });
      for (let i = 0; i < px.length; i++) if (!done[i] && (px[i] - best.x) ** 2 + (pz[i] - best.z) ** 2 < best.r * best.r) { done[i] = 1; left--; }
    }
  }
  const lake = { ...LK, shore, inner: outline(0.86), duckPath: outline(0.8, 96), promenade: outline(1.2, 72),
    reeds: [], pads: [], deck: { x: LK.x + LK.rx * 1.02, z: LK.z - 6, w: 4.6, d: 3.2 } };
  { let s = 977; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 15; k++) { const a = rnd() * Math.PI * 2, r = lakeR(a) * (0.9 + rnd() * 0.06); const x = LK.x + Math.cos(a) * LK.rx * r, z = LK.z + Math.sin(a) * LK.rz * r; if (Math.hypot(x - lake.deck.x, z - lake.deck.z) > 6) lake.reeds.push({ x, z, n: 4 + Math.floor(rnd() * 4) }); }
    for (let k = 0; k < 10; k++) { const a = rnd() * Math.PI * 2, r = lakeR(a) * (0.35 + rnd() * 0.3); lake.pads.push({ x: LK.x + Math.cos(a) * LK.rx * r, z: LK.z + Math.sin(a) * LK.rz * r, r: 0.6 + rnd() * 0.5, flower: rnd() < 0.4 }); }
  }

  // ---- clube: salão, piscina com deck cercado e estacionamento aberto para o anel ----
  const club = {
    hall: { x0: 186, x1: 206, z0: 100, z1: 114 },                          // salão de festas (térreo, laje com pergolado)
    lot: { x0: 210, x1: 227.2, z0: 100, z1: 132 },                         // estacionamento (asfalto, aberto para o anel)
    deck: { x0: 186, x1: 208, z0: 121, z1: 159 },                          // área da piscina (cercada; só a pé)
    pool: { x0: 190, x1: 204, z0: 128, z1: 152 },
  };

  // referências de lugar: lago, clube, equipamento do parque mais perto da porta (ou a portaria)
  const PZc = PZ;
  const amen = [
    { k: 'gazebo', x: 108, z: 114, r: 6 }, { k: 'playground', x: M(108), z: 114, r: 8 }, { k: 'court', x: 110, z: 146, r: 9 }, { k: 'flowers', x: M(110), z: 146, r: 8 },
  ];
  const NAME = { gazebo: 'loc:gazebo', playground: 'loc:playground', flowers: 'loc:flowers', court: 'loc:court' };
  const rectDist = (r, x, z) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1));
  const clubBox = { x0: club.hall.x0, x1: club.deck.x1 + 4, z0: club.hall.z0, z1: club.deck.z1 };
  for (const sp of spots) {                         // o lugar mais perto da porta (cada um com o seu alcance)
    const dx = sp.door.x, dz = sp.door.z, opts = [['loc:lake', polyDist(shore, dx, dz) - 24], ['loc:club', rectDist(clubBox, dx, dz) - 22], ['loc:gate', Math.hypot(dx - CX, dz - 14) - 44]];
    for (const a of amen) opts.push([NAME[a.k], Math.hypot(dx - a.x, dz - a.z) - a.r - 26]);
    opts.sort((p, q) => p[1] - q[1]);
    if (opts[0][1] < 0) sp.tags.push(opts[0][0]);
  }

  // ---- cerca viva do parque (aberturas só para pedestres, com balizadores) ----
  const footSpots = spots.filter(s => s.foot);
  const openings = [                                          // { lado, centro }
    { side: 'n', c: CX }, { side: 's', c: CX }, { side: 'w', c: PZc }, { side: 'e', c: PZc },
    { side: 'n', c: 87.6 + S + 2.2 }, { side: 'n', c: M(87.6 + S + 2.2) }, { side: 's', c: 87.6 + S + 2.2 }, { side: 's', c: M(87.6 + S + 2.2) },
  ];
  const OW = 2.6;
  const hedges = [], bollards = [];
  const cutLine = (side, a0, a1, fixed, alongX) => {
    const ops = openings.filter(o => o.side === side).map(o => [o.c - OW / 2, o.c + OW / 2]).sort((p, q) => p[0] - q[0]);
    const push = (u0, u1) => hedges.push(alongX ? { x0: u0, x1: u1, z0: fixed - 0.5, z1: fixed + 0.5 } : { x0: fixed - 0.5, x1: fixed + 0.5, z0: u0, z1: u1 });
    let a = a0;
    for (const [o0, o1] of ops) { if (o0 > a) push(a, o0); a = Math.max(a, o1); }
    if (a < a1) push(a, a1);
    for (const o of openings.filter(o => o.side === side)) bollards.push(alongX ? { x0: o.c - OW / 2, x1: o.c + OW / 2, z0: fixed - 0.4, z1: fixed + 0.4, vanOnly: true, alongX } : { x0: fixed - 0.4, x1: fixed + 0.4, z0: o.c - OW / 2, z1: o.c + OW / 2, vanOnly: true, alongX });
  };
  cutLine('n', PARK.x0, PARK.x1, PARK.z0, true); cutLine('s', PARK.x0, PARK.x1, PARK.z1, true);
  cutLine('w', PARK.z0, PARK.z1, PARK.x0, false); cutLine('e', PARK.z0, PARK.z1, PARK.x1, false);
  // caminhos do parque: eixo leste–oeste e norte–sul (praça do chafariz no cruzamento), ramais até as portas das casas e às aberturas
  const P = 1.3;
  const parkPaths = [
    { x0: PARK.x0, x1: PARK.x1, z0: PZc - P, z1: PZc + P }, { x0: CX - P, x1: CX + P, z0: 66, z1: 192 },
  ];
  for (const sp of footSpots) { const z0 = Math.min(sp.door.z, PZc), z1 = Math.max(sp.door.z, PZc); parkPaths.push({ x0: sp.door.x - 1.1, x1: sp.door.x + 1.1, z0: sp.fz > 0 ? sp.door.z - 2.4 : z0, z1: sp.fz > 0 ? z1 : sp.door.z + 2.4 }); }
  for (const o of openings.filter(o => (o.side === 'n' || o.side === 's') && o.c !== CX)) parkPaths.push({ x0: o.c - 1.1, x1: o.c + 1.1, z0: o.side === 'n' ? PARK.z0 - 0.5 : PZc, z1: o.side === 'n' ? PZc : PARK.z1 + 0.5 });
  const plaza = { x: CX, z: PZc, r: 7.5 };                    // praça do chafariz
  // ---- equipamentos: sólidos ----
  const solids = [];
  for (const a of amen) {
    if (a.k === 'gazebo') solids.push({ x0: a.x - 4.2, x1: a.x + 4.2, z0: a.z - 4.2, z1: a.z + 4.2 });
    if (a.k === 'playground') for (const [dx, dz, w, d] of [[-4, -3, 3, 2], [3, -3, 2.4, 3.4], [-3, 4, 4, 1], [4, 4, 1.6, 1.6]]) solids.push({ x0: a.x + dx - w / 2, x1: a.x + dx + w / 2, z0: a.z + dz - d / 2, z1: a.z + dz + d / 2 });
    if (a.k === 'court') for (const sd of [-1, 1]) solids.push({ x0: a.x - 9, x1: a.x + 9, z0: a.z + sd * 6 - 0.15, z1: a.z + sd * 6 + 0.15 });   // alambrado (frente e fundo; lados abertos)
  }
  solids.push({ x0: plaza.x - 1.8, x1: plaza.x + 1.8, z0: plaza.z - 1.8, z1: plaza.z + 1.8 });   // chafariz
  for (const r of rounds) solids.push({ x0: r.x - r.island, x1: r.x + r.island, z0: r.z - r.island, z1: r.z + r.island });
  solids.push({ ...BOOTH }, { ...SIGN }, { ...club.hall }, ...lakeSolids);
  { const p = club.pool; solids.push({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1 }); }             // a água da piscina (o deck é só a pé)
  const vanOnly = [{ x0: club.deck.x0, x1: club.deck.x1, z0: club.deck.z0, z1: club.deck.z1 }];  // grade da piscina: a van não entra
  vanOnly.push({ x0: PED.x0, x1: PED.x1, z0: HEDGE, z1: HEDGE + 0.6 });                            // balizadores na passagem de pedestres
  // jardins da portaria, dos dois lados da faixa, até a linha da cancela (canteiros com cerca viva baixa): a van só passa
  // pela cancela; de um lado e do outro eles encostam nos lotes vizinhos (sem fresta)
  const isl = [];
  for (const sd of [-1, 1]) {
    const near = spots.filter(sp => sp.box.z0 < GATE.z + 1 && (sd < 0 ? sp.box.x1 < CX : sp.box.x0 > CX)).map(sp => sd < 0 ? sp.box.x1 : sp.box.x0);
    const far = near.length ? (sd < 0 ? Math.max(...near) - 1 : Math.min(...near) + 1) : CX + sd * 40;
    const r = sd < 0 ? { x0: far, x1: CX - hw - 0.2, z0: HEDGE, z1: GATE.z + 0.45 } : { x0: CX + hw + 0.2, x1: far, z0: HEDGE, z1: GATE.z + 0.45 };
    isl.push(r); vanOnly.push({ ...r });
  }

  // ---- árvores (sólidas no tronco), bancos e postes ----
  let seed = 171; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = [], benches = [], lamps = [];
  const doorPts = spots.map(s => s.door);
  const nearDoor = (x, z, m) => doorPts.some(d => Math.hypot(x - d.x, z - d.z) < m);
  const treeOk = (x, z, gap = 6.5) => !trees.some(t => Math.hypot(t.x - x, t.z - z) < gap);
  const addTree = (x, z, s, type) => trees.push({ x, z, s, type: type || (rnd() < 0.12 ? 'ipe' : rnd() < 0.3 ? 'tall' : 'round'), c: Math.floor(rnd() * 3) });
  // árvores de calçada: dos dois lados das ruas, a cada ~10, longe das portas, dos cruzamentos e dos lotes
  for (const sg of segs) {
    if (sg.na === 'e0') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 5; t < len - 4; t += 10) for (const side of [-1, 1]) {
      const x = ax + ux * t - uz * side * (hw + 1.5), z = az + uz * t + ux * side * (hw + 1.5);
      if (roadDist(x, z) < hw + 1.2 || nearDoor(x, z, 7.5) || spots.some(o => inR(o.box, x, z, 0.8))) continue;
      if (inR(portaria, x, z) || inR(PARK, x, z, 1) || corridors.some(c => inR(c, x, z, 0.5)) || inR(club.lot, x, z, 3) || !treeOk(x, z, 7)) continue;
      if (x < HEDGE + 2.5 || z < HEDGE + 2.5 || x > IN1 - 2.5 || z > IN1 - 2.5) continue;
      addTree(x, z, 0.85 + rnd() * 0.25, rnd() < 0.15 ? 'ipe' : 'round');
    }
  }
  // avenidas: canteiro de árvores dos dois lados
  for (const [z0, z1] of [[N.r1[1] + 13, N.l0[1] - 6], [N.r2m[1] + 6, N.r2[1] - 13]]) for (let z = z0; z <= z1; z += 7) for (const sd of [-1, 1]) if (treeOk(CX + sd * 6.2, z, 5) && !spots.some(o => inR(o.box, CX + sd * 6.2, z, 1))) addTree(CX + sd * 6.2, z, 0.8, 'tall');
  // parque: árvores fora dos caminhos, equipamentos e casas
  const parkBusy = (x, z, r) => !inR(PARK, x, z, -2.2) || parkPaths.some(p => inR(p, x, z, r + 0.6)) || Math.hypot(x - plaza.x, z - plaza.z) < plaza.r + r + 1 || amen.some(a => Math.hypot(x - a.x, z - a.z) < a.r + r + 2.4) || footSpots.some(s => inR(s.box, x, z, r + 1.5)) || openings.some(o => o.side === 'n' || o.side === 's' ? Math.abs(x - o.c) < 3 : Math.abs(z - o.c) < 3);
  for (let k = 0; k < 400 && trees.filter(t => t.park).length < 46; k++) {
    const x = PARK.x0 + 3 + rnd() * (PARK.x1 - PARK.x0 - 6), z = PARK.z0 + 3 + rnd() * (PARK.z1 - PARK.z0 - 6);
    if (!parkBusy(x, z, 1.6) && treeOk(x, z, 5.5)) { addTree(x, z, 0.9 + rnd() * 0.5); trees[trees.length - 1].park = true; }
  }
  // lago: árvores fora do passeio (algumas perto da água, sem tapar o deque)
  const lakeBusy = (x, z, r) => polyDist(lake.promenade, x, z) < 2.6 + r || inPoly(lake.promenade, x, z) || roadDist(x, z) < hw + 2.4 || !inR(LAKEZ, x, z, -1.5) || Math.abs(z - PZc) < 3 && x > LAKEZ.x1 - 14;
  for (let k = 0; k < 400 && trees.filter(t => t.lake).length < 26; k++) {
    const x = LAKEZ.x0 + rnd() * (LAKEZ.x1 - LAKEZ.x0), z = LAKEZ.z0 + rnd() * (LAKEZ.z1 - LAKEZ.z0);
    if (!lakeBusy(x, z, 1.6) && treeOk(x, z, 6)) { addTree(x, z, 0.9 + rnd() * 0.5, rnd() < 0.3 ? 'willow' : null); trees[trees.length - 1].lake = true; }
  }
  // clube: árvores em volta do salão, da piscina e do estacionamento
  const clubBusy = (x, z, r) => !inR(CLUBZ, x, z, -1.5) || roadDist(x, z) < hw + 2.4 || [club.hall, club.lot, club.deck].some(b => inR(b, x, z, r + 1.2)) || Math.abs(z - PZc) < 3 && x < CLUBZ.x0 + 14;
  for (let k = 0; k < 400 && trees.filter(t => t.club).length < 18; k++) {
    const x = CLUBZ.x0 + rnd() * (CLUBZ.x1 - CLUBZ.x0), z = CLUBZ.z0 + rnd() * (CLUBZ.z1 - CLUBZ.z0);
    if (!clubBusy(x, z, 1.6) && treeOk(x, z, 6)) { addTree(x, z, 0.9 + rnd() * 0.4); trees[trees.length - 1].club = true; }
  }
  // portaria: palmeiras na entrada e árvores no jardim
  for (const x of [CX - 6.4, CX - 19, CX + 16.5, CX + 22]) for (const z of [5, 19]) if (treeOk(x, z, 4)) addTree(x, z, 0.9, 'palm');
  // cantos livres e faixas verdes entre as ruas (longe de ruas, lotes, portas e muros)
  for (let k = 0; k < 4000 && trees.length < 330; k++) {
    const x = HEDGE + 3 + rnd() * (MAP - 2 * HEDGE - 6), z = HEDGE + 3 + rnd() * (MAP - 2 * HEDGE - 6);
    if (roadDist(x, z) < hw + 2.2 || spots.some(o => inR(o.box, x, z, 1.4)) || nearDoor(x, z, 6) || zones.some(zn => inR(zn, x, z, 1))) continue;
    if (!treeOk(x, z, 7)) continue;
    addTree(x, z, 0.85 + rnd() * 0.5);
  }
  for (const t of trees) t.r = t.type === 'palm' ? 0.3 : 0.4;
  // bancos e postes: caminhos do parque, praça do chafariz e passeio do lago
  for (let x = PARK.x0 + 9; x < PARK.x1 - 6; x += 15) for (const sd of [-1, 1]) { const z = PZc + sd * 2.6; if (!amen.some(a => Math.abs(x - a.x) < a.r + 2) && Math.abs(x - CX) > plaza.r + 2) benches.push({ x, z, ry: sd > 0 ? Math.PI : 0 }); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; benches.push({ x: plaza.x + Math.cos(a) * (plaza.r - 1.4), z: plaza.z + Math.sin(a) * (plaza.r - 1.4), ry: Math.atan2(-Math.cos(a), -Math.sin(a)) }); }
  for (let k = 4; k < 72; k += 9) {                           // bancos virados para a água
    const [x, z] = lake.promenade[k], ang = Math.atan2(LK.x - x, LK.z - z);
    if (Math.hypot(x - lake.deck.x, z - lake.deck.z) > 7) benches.push({ x: x - Math.sin(ang) * 1.7, z: z - Math.cos(ang) * 1.7, ry: ang });
  }
  for (let x = PARK.x0 + 6; x < PARK.x1; x += 20) lamps.push({ x, z: PZc - 2.3 });
  for (let z = PARK.z0 + 8; z < PARK.z1; z += 16) if (Math.abs(z - PZc) > plaza.r) lamps.push({ x: CX + 2.3, z });
  for (let k = 0; k < 72; k += 9) { const [x, z] = lake.promenade[k], ang = Math.atan2(LK.x - x, LK.z - z); lamps.push({ x: x - Math.sin(ang) * 1.6, z: z - Math.cos(ang) * 1.6 }); }
  for (const t of trees) solids.push({ x0: t.x - t.r, x1: t.x + t.r, z0: t.z - t.r, z1: t.z + t.r });
  for (const l of lamps) solids.push({ x0: l.x - 0.15, x1: l.x + 0.15, z0: l.z - 0.15, z1: l.z + 0.15 });
  // vagas de estacionamento perto das casas do parque (pintadas na beira do anel, junto às passagens)
  const parking = openings.filter(o => (o.side === 'n' || o.side === 's') && o.c !== CX).map(o => {
    const z = o.side === 'n' ? 70 + hw + 0.2 : 188 - hw - 0.2; return { x: o.c, z, n: o.side === 'n' ? -1 : 1 };
  });
  // ---- muro em volta (no lugar da sebe): pedaços com o vão da van e o de pedestres no norte ----
  const ENX0 = CX - 3.8, ENX1 = CX + 3.8;
  const walls = [
    { x0: 0, x1: ENX0, z0: 0, z1: HEDGE }, { x0: ENX1, x1: PED.x0, z0: 0, z1: HEDGE }, { x0: PED.x1, x1: MAP, z0: 0, z1: HEDGE },
    { x0: 0, x1: MAP, z0: IN1, z1: MAP }, { x0: 0, x1: HEDGE, z0: HEDGE, z1: IN1 }, { x0: IN1, x1: MAP, z0: HEDGE, z1: IN1 },
  ];
  return { MAP, HEDGE, CX, N, segs, rounds, culs, PARK, PZ: PZc, plaza, amen, spots, hedges, bollards, parkPaths, openings, trees, benches, lamps, solids, vanOnly,
    GATE, BOOTH, PED, pedPath, SIGN, portaria, islands: isl, parking, walls, lake, club, LAKEZ, CLUBZ, corridors, roadDist, h: () => 0 };
}
