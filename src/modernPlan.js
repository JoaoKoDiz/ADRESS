// Nível 18 (Modernista): condomínio fechado com plano FIXO (área 10×10, sem grade): ruas largas com curvas suaves,
// 5 rotatórias pequenas e ruas residenciais sem saída (balão de retorno). Casas com jardim aberto e recuo grande, de frente
// para a rua; poucas lojas. Muro contínuo em volta (no lugar da sebe) e portaria na entrada (guarita + cancela, main.js).
// Mesmo formato do plano do Bosque (forestPlan.js): o jogo usa os pontos (SPOTS) do mesmo jeito; aqui não há patamar.
import { obbBox } from './obb.js';

export const MODERN = { RW: 10, ROUND: 11.5, ISLAND: 4.6, CUL: 9.5, WALL: 0.8, WALL_H: 2.4 };

export function planModern(MAP, HEDGE) {
  const { RW, ROUND, ISLAND, CUL, WALL } = MODERN, hw = RW / 2, CX = MAP / 2;
  // desenho feito na área 8×8 (209,2) e esticado para a área atual: as ruas ficam mais longas (mais casas), larguras iguais
  const f = MAP / 209.2, P = (x, z) => [x * f, z * f];
  const N = {
    n0: [CX, 0], n1: P(104.6, 22), r1: P(104.6, 46), a1: P(78, 54), r2: P(50, 76), b1: P(131, 54), r3: P(159, 76),
    c1: P(98, 80), r4: P(104.6, 112), w1: P(34, 106), w2: P(38, 142), w3: P(58, 172), e1: P(176, 106), e2: P(172, 142), e3: P(152, 172),
    m1: P(72, 128), m2: P(138, 128), c2: P(110, 148), r5: P(104.6, 182),
    d1: P(18, 52), d2: P(191, 52), d3: P(30, 194), d4: P(180, 194), d5: P(60, 20), d6: P(150, 20),
  };
  const ROUNDS = ['r1', 'r2', 'r3', 'r4', 'r5'], CULS = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  const E = [
    ['n0', 'n1', 'main'], ['n1', 'r1', 'main'], ['r1', 'a1', 'main'], ['a1', 'r2', 'main'], ['r1', 'b1', 'main'], ['b1', 'r3', 'main'],
    ['r1', 'c1', 'main'], ['c1', 'r4', 'main'], ['r2', 'w1', 'side'], ['w1', 'w2', 'side'], ['w2', 'w3', 'side'], ['w3', 'r5', 'side'],
    ['r3', 'e1', 'side'], ['e1', 'e2', 'side'], ['e2', 'e3', 'side'], ['e3', 'r5', 'side'], ['r4', 'm1', 'side'], ['m1', 'w2', 'side'],
    ['r4', 'm2', 'side'], ['m2', 'e2', 'side'], ['r4', 'c2', 'main'], ['c2', 'r5', 'main'],
    ['r2', 'd1', 'cul'], ['r3', 'd2', 'cul'], ['w3', 'd3', 'cul'], ['e3', 'd4', 'cul'], ['r1', 'd5', 'cul'], ['r1', 'd6', 'cul'],
  ];
  const segs = E.map(([a, b, type]) => ({ a: N[a], b: N[b], na: a, nb: b, type }));
  const nodeR = k => (ROUNDS.includes(k) ? ROUND : CULS.includes(k) ? CUL : hw);
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  // distância à beira da pista + hw (para as contas usarem "roadDist < hw + margem" como numa rua normal)
  const roadDist = (x, z) => { let m = 1e9; for (const s of segs) m = Math.min(m, segDist(x, z, s)); for (const [k, [x2, z2]] of Object.entries(N)) m = Math.min(m, Math.hypot(x - x2, z - z2) - (nodeR(k) - hw)); return m; };
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const h = () => 0, level = () => 0;
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };

  // ---- portaria: o muro (na faixa da sebe) abre só na entrada; a cancela fecha essa abertura e a guarita fica logo depois,
  // a leste da rua de entrada, com a janela virada para ela ----
  const GAP = 3.8;                                                        // meia abertura (= a da sebe: ENTRANCE em layout.js)
  const GATE = { x: CX, z: HEDGE - WALL / 2, x0: CX - GAP, x1: CX + GAP };
  const BOOTH = { x0: CX + hw + 2.2, x1: CX + hw + 6.2, z0: HEDGE + 2.2, z1: HEDGE + 7.4 };
  const BOOTH_BOX = { x0: BOOTH.x0 - 0.3, x1: BOOTH.x1 + 0.3, z0: BOOTH.z0 - 0.3, z1: BOOTH.z1 + 0.3 };
  const ENTRY = { x0: CX - 26, x1: CX + 26, z0: 0, z1: 40 };              // sem casas na portaria
  // muro: 4 lados na faixa da sebe (a colisão é a da sebe, SOLIDS em layout.js); o norte com a abertura da entrada
  const W0 = HEDGE - WALL, W1 = MAP - HEDGE;
  const walls = [
    { x0: W0, x1: CX - GAP, z0: W0, z1: HEDGE }, { x0: CX + GAP, x1: W1 + WALL, z0: W0, z1: HEDGE },
    { x0: W0, x1: W1 + WALL, z0: W1, z1: W1 + WALL }, { x0: W0, x1: HEDGE, z0: HEDGE, z1: W1 }, { x0: W1, x1: W1 + WALL, z0: HEDGE, z1: W1 },
  ];
  const IN = HEDGE + 1.2;                                                 // nada encostado no muro por dentro

  // ---- casas: lote 17.2 (+ calçada), jardim aberto, de frente para a rua (também em volta dos balões) ----
  const S = 9.0;
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const spots = [];
  const tryAt = (px, pz, fx, fz, dx, dz) => {   // (dx, dz): ponto de entrega na beira da pista
    const b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
    if (b.x0 < IN || b.z0 < IN || b.x1 > MAP - IN || b.z1 > MAP - IN) return false;
    if (!clearOfRoads(b, 1.8) || spots.some(o => hit(b, o.box, 2.2)) || inR(ENTRY, px, pz)) return false;
    const sp = { px, pz, ry: Math.atan2(fx, fz), fx, fz, y: 0, box: b, tags: [] };
    const c = toW(sp, 0, -3.6), r = toW(sp, 0, 6.8);
    Object.assign(sp, { cx: c.x, cz: c.z, door: { x: dx, z: dz }, res: { x: r.x, z: r.z, ry: sp.ry }, walkBox: obbBox((x, z) => toW(sp, x, z), sp.ry, -6, -7.4, 6, 1.4) });
    spots.push(sp); return true;
  };
  for (const k of CULS) {                                                 // em volta do balão (as melhores casas)
    const [x, z] = N[k];
    for (let a = 0; a < 6.28; a += 0.35) {
      const ux = Math.cos(a), uz = Math.sin(a);
      for (const off of [CUL + 2.6 + S, CUL + 4.5 + S]) if (tryAt(x + ux * off, z + uz * off, -ux, -uz, x + ux * (CUL - 1.4), z + uz * (CUL - 1.4))) break;
    }
  }
  for (const sg of segs) {
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 8; t < len - 5; t += 3) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;
      for (const off of [hw + 2.6 + S, hw + 4.5 + S, hw + 7 + S]) if (tryAt(ax + ux * t + nx * off, az + uz * t + nz * off, -nx, -nz, ax + ux * t + nx * (hw - 1.4), az + uz * t + nz * (hw - 1.4))) break;
    }
  }
  while (spots.length > 43) spots.splice(Math.floor(spots.length / 2), 1);   // no máximo 40 casas + 3 lojas (main.js)
  const accessLines = spots.map(sp => [toW(sp, 0, 7.5), sp.door]);
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const blocksAccess = (x, z, r) => accessLines.some(([a, b]) => lineDist(x, z, a, b) < r + 1.4) || spots.some(sp => Math.hypot(sp.door.x - x, sp.door.z - z) < r + 3);
  const free = (x, z, r, road = hw + r + 2.0) => x > IN + r && z > IN + r && x < MAP - IN - r && z < MAP - IN - r &&
    roadDist(x, z) >= road && !spots.some(o => inR(o.box, x, z, r + 0.4)) && !blocksAccess(x, z, r) && !inR(BOOTH_BOX, x, z, r + 2) && !(Math.abs(x - CX) < 14 && z < 30);
  // ---- árvores espaçadas (verdes), postes simples e bancos ----
  let seed = 1818; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = [];
  for (let z = HEDGE + 7; z < MAP - 6; z += 14) for (let x = HEDGE + 7; x < MAP - 6; x += 14) {
    const px = x + (rnd() - 0.5) * 6, pz = z + (rnd() - 0.5) * 6;
    if (rnd() < 0.3 || !free(px, pz, 1.0, hw + 4)) continue;
    trees.push({ x: px, z: pz, y: 0, s: 0.85 + rnd() * 0.4, type: rnd() < 0.7 ? 'round' : 'tall', color: 'green', k: rnd() });
  }
  const lamps = [];
  for (const s of segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 10; t < len - 8; t += 22) for (const sd of [-1, 1]) {
      const px = ax + ux * t - uz * sd * (hw + 1.2), pz = az + uz * t + ux * sd * (hw + 1.2);
      if (free(px, pz, 0.3, hw + 1.0) && !trees.some(p => Math.hypot(p.x - px, p.z - pz) < 3) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 8))
        lamps.push({ x: px, z: pz, y: 0, ry: Math.atan2(-uz * sd, ux * sd), box: { x0: px - 0.3, x1: px + 0.3, z0: pz - 0.3, z1: pz + 0.3 } });
    }
  }
  const benches = [];
  for (const k of ROUNDS) {                                               // bancos em volta das rotatórias (na calçada de fora)
    const [x, z] = N[k];
    for (let a = 0.6; a < 6.28 && benches.filter(b => b.k === k).length < 2; a += 0.9) {
      const px = x + Math.cos(a) * (ROUND + 3.2), pz = z + Math.sin(a) * (ROUND + 3.2);
      if (free(px, pz, 1.2, hw + 2.2) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 2.5)) benches.push({ k, x: px, z: pz, y: 0, ry: Math.atan2(Math.cos(a), Math.sin(a)) + Math.PI });
    }
  }
  const islands = ROUNDS.map(k => ({ x: N[k][0], z: N[k][1], r: ISLAND }));
  // guarita: sólido próprio (layout.js empurra os `solids` do plano)
  const solids = [{ ...BOOTH_BOX }];
  return { modern: true, MAP, HEDGE, N, segs, ramps: [], MID: null, h, level, spots, trees, lamps, benches, islands, roadDist, free, ROUNDS, CULS, nodeR,
    walls, GATE, BOOTH, solids };
}
