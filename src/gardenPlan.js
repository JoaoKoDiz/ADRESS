// Nível 17 (Bairro Jardins): condomínio planejado em volta de um parque comprido (área ~8×8, sem grade).
//  - portaria na entrada (norte): guarita + cancela que abre sozinha para a van (main.js);
//  - rotatória logo depois da portaria e outra ao sul do parque; ruas curvas em laço em volta do parque e ramais com
//    ruas sem saída (balão de retorno);
//  - parque central alongado cercado por cerca viva baixa, com aberturas só para pedestres (balizadores: a van não passa);
//    dentro: coreto, playground, jardim de flores e quadra, caminhos, bancos, árvores e postes;
//  - casas (lote 17,2) de frente para as ruas; 4 casas na borda do parque com a entrada voltada para ele (só a pé).
// Tudo é geometria pura (x = leste, z = sul); o desenho fica em models/garden.js.

export const GARD = { RW: 8 };

export function planGarden(MAP, HEDGE) {
  const { RW } = GARD, hw = RW / 2, CX = 104.6;
  const PARK = { x0: 40, x1: 170, z0: 91, z1: 121 };
  // faixas (de norte a sul): casas · ramal norte (z≈28, rotatória R1) · casas · laço norte (z≈62) · casas · PARQUE · casas ·
  // laço sul (z≈150) · casas · ramal sul (z≈182, rotatória R2) · casas. Laterais do laço em x≈22 e x≈188.
  const N = {
    e0: [CX, -4], r1: [CX, 28],
    a1: [80, 25], a2: [56, 30], a3: [30, 27],                                   // ramal noroeste (sem saída)
    b1: [130, 31], b2: [156, 26], b3: [180, 29],                                // ramal nordeste (sem saída)
    l0: [CX, 62], l1: [78, 59], l2: [50, 64], l3: [24, 70], l4: [21, 106], l5: [25, 144],
    l6: [52, 150], l7: [78, 153], r2m: [CX, 150], l8: [130, 147], l9: [158, 152], l10: [184, 144], l11: [188, 106], l12: [184, 70], l13: [158, 64], l14: [130, 59],
    r2: [CX, 182], s1: [80, 185], s2: [56, 180], s3: [30, 184],                 // ramal sul-oeste (sem saída)
    s4: [130, 179], s5: [156, 184], s6: [180, 181],                             // ramal sul-leste (sem saída)
  };
  const E = [
    ['e0', 'r1'], ['r1', 'a1'], ['a1', 'a2'], ['a2', 'a3'], ['r1', 'b1'], ['b1', 'b2'], ['b2', 'b3'], ['r1', 'l0'],
    ['l0', 'l1'], ['l1', 'l2'], ['l2', 'l3'], ['l3', 'l4'], ['l4', 'l5'], ['l5', 'l6'], ['l6', 'l7'], ['l7', 'r2m'], ['r2m', 'l8'], ['l8', 'l9'], ['l9', 'l10'],
    ['l10', 'l11'], ['l11', 'l12'], ['l12', 'l13'], ['l13', 'l14'], ['l14', 'l0'], ['r2m', 'r2'],
    ['r2', 's1'], ['s1', 's2'], ['s2', 's3'], ['r2', 's4'], ['s4', 's5'], ['s5', 's6'],
  ];
  const segs = E.map(([a, b]) => ({ a: N[a], b: N[b], na: a, nb: b }));
  const rounds = [{ x: N.r1[0], z: N.r1[1], r: 10, island: 3.6 }, { x: N.r2[0], z: N.r2[1], r: 10, island: 3.6 }];
  const culs = ['a3', 'b3', 's3', 's6'].map(k => ({ x: N[k][0], z: N[k][1], r: 8.5 }));   // balões de retorno
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d), ...rounds.map(r => Math.hypot(x - r.x, z - r.z) - r.r + hw), ...culs.map(c => Math.hypot(x - c.x, z - c.z) - c.r + hw));
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const GATE = { x: CX, z: 12, x0: CX - hw, x1: CX + hw };                      // cancela (atravessa a rua de entrada)
  const BOOTH = { x0: CX + hw + 1.2, x1: CX + hw + 4.6, z0: 7, z1: 11.4 };       // guarita
  const portaria = { x0: CX - 14, x1: CX + 14, z0: 0, z1: 20 };
  const corridors = [CX].map(x => ({ x0: x - 3.2, x1: x + 3.2, z0: 66, z1: 146 }));   // passagens a pé estrada ↔ parque (sem casas)

  // ---- parque: equipamentos (referências, não são destinos) ----
  const PZ = (PARK.z0 + PARK.z1) / 2;
  const amen = [
    { k: 'gazebo', x: 62, z: PZ, r: 6 }, { k: 'playground', x: 92, z: PZ, r: 8 }, { k: 'flowers', x: 122, z: PZ, r: 8 }, { k: 'court', x: 154, z: PZ, r: 9 },
  ];
  // ---- casas ----
  const S = 9.0, spots = [];
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const finish = (sp, lv = 0) => {
    const c = toW(sp, 0, -3.6), d = toW(sp, 0, 11.4), r = toW(sp, 0, 6.6), w0 = toW(sp, -5.2, -7.6), w1 = toW(sp, 5.2, 1.4);
    Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry }, y: lv,
      walkBox: { x0: Math.min(w0.x, w1.x), x1: Math.max(w0.x, w1.x), z0: Math.min(w0.z, w1.z), z1: Math.max(w0.z, w1.z) } });
    spots.push(sp);
  };
  // 4 casas na borda do parque, com a entrada voltada para ele (a van para na rua de trás; o resto é a pé)
  for (const [px, top] of [[46, true], [164, true], [50, false], [160, false]]) {
    const pz = top ? PARK.z0 - S - 0.4 : PARK.z1 + S + 0.4, fz = top ? 1 : -1;
    finish({ px, pz, ry: Math.atan2(0, fz), fx: 0, fz, box: { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S }, tags: ['loc:parkdoor'], foot: true });
  }
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };
  for (const sg of segs) {
    if (sg.na === 'e0' || sg.na === 'r2m' && sg.nb === 'r2' || sg.na === 'r1' && sg.nb === 'l0') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 4; t < len - 3; t += 3) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, ax2 = Math.abs(nx) > Math.abs(nz), fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);
      for (const off of [hw + 2.6 + S, hw + 4 + S, hw + 6 + S]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off, b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
        if (b.x0 < HEDGE + 1.5 || b.z0 < HEDGE + 1.5 || b.x1 > MAP - HEDGE - 1.5 || b.z1 > MAP - HEDGE - 1.5) continue;
        if (hit(b, PARK, 0.6) || hit(b, portaria, 1) || corridors.some(c => hit(b, c)) || !clearOfRoads(b, 0.8) || spots.some(o => hit(b, o.box, 2.4))) continue;
        if (rounds.some(r => Math.hypot(px - r.x, pz - r.z) < r.r + S + 1)) continue;
        // a porta precisa cair numa rua de verdade (logo à frente do lote)
        const dx = px + fx * 11.4, dz = pz + fz * 11.4;
        if (roadDist(dx, dz) > hw + 2.5) continue;
        finish({ px, pz, ry: Math.atan2(fx, fz), fx, fz, box: b, tags: [] });
        break;
      }
    }
  }
  while (spots.length > 40) spots.splice(4 + Math.floor((spots.length - 4) / 2), 1);   // (no máximo 40 casas)
  // referências de lugar: o equipamento do parque mais perto da porta (ou a portaria)
  const NAME = { gazebo: 'loc:gazebo', playground: 'loc:playground', flowers: 'loc:flowers', court: 'loc:court' };
  for (const sp of spots) {
    let best = null, bd = 46;
    for (const a of amen) { const d = Math.hypot(sp.door.x - a.x, sp.door.z - a.z); if (d < bd) { bd = d; best = NAME[a.k]; } }
    if (best) sp.tags.push(best);
    else if (Math.hypot(sp.door.x - CX, sp.door.z - 12) < 40) sp.tags.push('loc:gate');
  }
  // ---- cerca viva do parque (aberturas só para pedestres) ----
  const openings = [];                                        // [x/z do centro, lado]
  for (const x of [CX]) { openings.push({ side: 'n', c: x }); openings.push({ side: 's', c: x }); }   // passagem a pé atravessando o parque
  for (const sp of spots.filter(s => s.foot)) openings.push({ side: sp.fz > 0 ? 'n' : 's', c: sp.px, house: true });   // casas do parque: abertura na frente da porta
  const OW = 2.6;                                             // largura das aberturas
  const hedges = [], bollards = [];
  const cutLine = (side, a0, a1, fixed) => {
    const ops = openings.filter(o => o.side === side).map(o => [o.c - OW / 2, o.c + OW / 2]);
    ops.sort((p, q) => p[0] - q[0]);
    let a = a0;
    for (const [o0, o1] of ops) { if (o0 > a) hedges.push({ x0: a, x1: o0, z0: fixed - 0.5, z1: fixed + 0.5 }); a = Math.max(a, o1); }
    if (a < a1) hedges.push({ x0: a, x1: a1, z0: fixed - 0.5, z1: fixed + 0.5 });
    for (const o of openings.filter(o => o.side === side)) bollards.push({ x0: o.c - OW / 2, x1: o.c + OW / 2, z0: fixed - 0.4, z1: fixed + 0.4, vanOnly: true });
  };
  cutLine('n', PARK.x0, PARK.x1, PARK.z0); cutLine('s', PARK.x0, PARK.x1, PARK.z1);
  hedges.push({ x0: PARK.x0 - 0.5, x1: PARK.x0 + 0.5, z0: PARK.z0, z1: PARK.z1 }, { x0: PARK.x1 - 0.5, x1: PARK.x1 + 0.5, z0: PARK.z0, z1: PARK.z1 });
  const parkPaths = [{ x0: PARK.x0 + 3, x1: PARK.x1 - 3, z0: PZ - 1.4, z1: PZ + 1.4 }];
  for (const o of openings) parkPaths.push(o.house ? { x0: o.c - 1.2, x1: o.c + 1.2, z0: o.side === 'n' ? PARK.z0 : PARK.z1 - 6, z1: o.side === 'n' ? PARK.z0 + 6 : PARK.z1 }
    : { x0: o.c - 1.2, x1: o.c + 1.2, z0: o.side === 'n' ? 64 : PZ, z1: o.side === 'n' ? PZ : 148 });   // (passagens: do laço até o caminho do meio)   // (do laço até o caminho do meio)
  // árvores e bancos do parque (fora dos caminhos e equipamentos)
  let seed = 171; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = [], benches = [], lamps = [];
  const busy = (x, z, r) => x < PARK.x0 + 2 || x > PARK.x1 - 2 || z < PARK.z0 + 2 || z > PARK.z1 - 2 || parkPaths.some(p => inR(p, x, z, r + 0.6)) || amen.some(a => Math.hypot(x - a.x, z - a.z) < a.r + r + 2) || spots.some(s => inR(s.box, x, z, r + 1.5)) || openings.some(o => Math.abs(x - o.c) < 3);
  for (let k = 0; k < 140 && trees.length < 34; k++) {
    const x = PARK.x0 + 3 + rnd() * (PARK.x1 - PARK.x0 - 6), z = PARK.z0 + 3 + rnd() * (PARK.z1 - PARK.z0 - 6);
    if (!busy(x, z, 1.6) && !trees.some(t => Math.hypot(t.x - x, t.z - z) < 6)) trees.push({ x, z, s: 0.9 + rnd() * 0.5 });
  }
  for (let x = PARK.x0 + 10; x < PARK.x1 - 6; x += 16) for (const sd of [-1, 1]) { const z = PZ + sd * 2.6; if (!amen.some(a => Math.abs(x - a.x) < a.r + 2)) benches.push({ x, z, ry: sd > 0 ? Math.PI : 0 }); }
  for (let x = PARK.x0 + 6; x < PARK.x1; x += 22) lamps.push({ x, z: PZ - 2.3 });
  const solids = [];
  for (const a of amen) {
    if (a.k === 'gazebo') solids.push({ x0: a.x - 4.2, x1: a.x + 4.2, z0: a.z - 4.2, z1: a.z + 4.2 });
    if (a.k === 'playground') for (const [dx, dz, w, d] of [[-4, -3, 3, 2], [3, -3, 2.4, 3.4], [-3, 4, 4, 1], [4, 4, 1.6, 1.6]]) solids.push({ x0: a.x + dx - w / 2, x1: a.x + dx + w / 2, z0: a.z + dz - d / 2, z1: a.z + dz + d / 2 });
    if (a.k === 'flowers') solids.push({ x0: a.x - 1.6, x1: a.x + 1.6, z0: a.z - 1.6, z1: a.z + 1.6 });   // chafariz no meio
    if (a.k === 'court') for (const sd of [-1, 1]) solids.push({ x0: a.x - 9, x1: a.x + 9, z0: a.z + sd * 6 - 0.15, z1: a.z + sd * 6 + 0.15 });   // alambrado (frente e fundo; lados abertos)
  }
  for (const t of trees) solids.push({ x0: t.x - 0.4, x1: t.x + 0.4, z0: t.z - 0.4, z1: t.z + 0.4 });
  for (const r of rounds) solids.push({ x0: r.x - r.island, x1: r.x + r.island, z0: r.z - r.island, z1: r.z + r.island });
  solids.push(BOOTH);
  // vagas de estacionamento perto das casas do parque (pintadas na beira da rua de trás)
  const parking = spots.filter(s => s.foot).map(s => ({ x: s.px, z: s.fz > 0 ? s.box.z0 - 0.2 : s.box.z1 + 0.2, n: s.fz > 0 ? -1 : 1 }));
  return { N, segs, rounds, culs, PARK, PZ, amen, spots, hedges, bollards, parkPaths, trees, benches, lamps, solids, GATE, BOOTH, parking, roadDist, h: () => 0 };
}
