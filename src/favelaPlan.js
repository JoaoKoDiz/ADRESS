// Nível 13 (Morro): plano FIXO do bairro, sem grade de quadras. Três faixas de altura que sobem para o sul (longe da
// entrada): baixa (z < B1, altura 0), meio do morro (B1..B2, H1) e alta (z > B2, H2), ligadas por 2 ladeiras (a van
// sobe) e 4 escadarias (só a pé). Uma rua principal sinuosa sobe o morro com ramificações que terminam em pequenos
// estacionamentos ao pé das escadarias. Casas de entrega: na beira das ruas (a van entrega) e nos becos das
// escadarias (só a pé). Casas de enchimento (sem entrega) completam a densidade. Tudo aqui é geometria pura.

export const FAV = { B1: 70, B2: 140, H1: 4, H2: 8, RW: 8, HALF: 3.2 };   // HALF: meia largura da casa (6.4 × 6.4)

const R = (x0, z0, x1, z1, extra = {}) => ({ x0, z0, x1, z1, ...extra });

export function planFavela(MAP, HEDGE) {
  const { B1, B2, H1, H2, RW, HALF } = FAV, hw = RW / 2;
  const roads = [                                                     // eixos das ruas (polilinhas), banda pela altura
    { band: 0, pts: [[104.6, -4], [104.6, 24], [68, 36], [34, 40], [30, 58]] },            // entrada → ladeira A
    { band: 0, pts: [[104.6, 24], [150, 30], [176, 44]] },                                  // ramal leste → escadaria 1
    { band: 1, pts: [[30, 82], [30, 92], [62, 104], [100, 98], [140, 108], [182, 110], [182, 128]] },   // meio → ladeira B
    { band: 1, pts: [[100, 98], [96, 118]] },                                               // ramal → escadaria 3
    { band: 2, pts: [[182, 152], [182, 160], [150, 176], [110, 170], [70, 180], [40, 176]] },   // parte alta
  ];
  const ramps = [R(26, 58, 34, 82, { h0: 0, h1: H1 }), R(178, 128, 186, 152, { h0: H1, h1: H2 })];
  const stairs = [
    R(173, 58, 179, 82, { h0: 0, h1: H1 }), R(67, 58, 73, 82, { h0: 0, h1: H1 }),
    R(93, 128, 99, 152, { h0: H1, h1: H2 }), R(45, 128, 51, 152, { h0: H1, h1: H2 }),
  ];
  // estacionamentos (asfalto com vagas) ao pé das escadarias e becos (piso de cimento) entre rua, vaga e escadaria
  const pads = [R(164, 40, 188, 54, { y: 0 }), R(58, 38, 82, 48, { y: 0 }), R(86, 113, 106, 124, { y: H1 }), R(38, 103, 58, 112, { y: H1 })];
  const alleys = [
    R(173, 54, 179, 58, { y: 0, st: 0, top: false }), R(173, 82, 179, 106, { y: H1, st: 0, top: true }),
    R(67, 48, 73, 58, { y: 0, st: 1, top: false }), R(67, 82, 73, 99, { y: H1, st: 1, top: true }),
    R(93, 124, 99, 128, { y: H1, st: 2, top: false }), R(93, 152, 99, 170, { y: H2, st: 2, top: true }),
    R(45, 112, 51, 128, { y: H1, st: 3, top: false }), R(45, 152, 51, 173, { y: H2, st: 3, top: true }),
  ];
  const market = R(70, 7, 86, 19, { y: 0 });                            // mercadinho (frente para o sul, para a rua)
  const square = R(124, 116, 152, 136, { y: H1 });                      // pracinha com bancos
  const court = R(80, 187, 103, 203, { y: H2 });                        // quadra
  const landmarks = [market, square, court];

  const bandOf = z => (z < B1 ? 0 : z < B2 ? 1 : 2);
  const bandY = b => [0, H1, H2][b];
  const segs = roads.flatMap(r => r.pts.slice(1).map((p, i) => ({ a: r.pts[i], b: p, band: r.band })));
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), x: ax + dx * t, z: az + dz * t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d));
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const reserved = [...pads, ...alleys.map(a => R(a.x0 - 0.4, a.z0, a.x1 + 0.4, a.z1)), ...stairs, ...ramps, ...landmarks];
  const boxOk = (b, band) => {
    if (b.x0 < HEDGE + 0.8 || b.x1 > MAP - HEDGE - 0.8 || b.z0 < HEDGE + 0.8 || b.z1 > MAP - HEDGE - 0.8) return false;
    const lo = [HEDGE, B1, B2][band], hi = [B1, B2, MAP][band];
    if (b.z0 < lo + 1.0 || b.z1 > hi - 1.0) return false;
    if (reserved.some(r => hit(b, r, 0.6))) return false;
    for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 4) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 4)
      if (roadDist(x, z) < hw + 0.7) return false;
    return true;
  };

  // ---- casas de entrega ----
  const spots = [];
  const box = (cx, cz, m = 0) => R(cx - HALF - m, cz - HALF - m, cx + HALF + m, cz + HALF + m);
  const free = b => !spots.some(s => hit(b, s.box, 1.0) || hit(b, s.lane, 0.2));
  // 1) becos das escadarias: casas dos dois lados, de frente para o beco (só a pé)
  for (const a of alleys) {
    const len = a.z1 - a.z0; if (len < 9) continue;
    const zs = len >= 15 ? [a.z0 + 4.2, a.z1 - 4.2] : [(a.z0 + a.z1) / 2];
    for (const z of zs) for (const side of [-1, 1]) {
      const cx = side < 0 ? a.x0 - 0.9 - HALF : a.x1 + 0.9 + HALF, b = box(cx, z);
      const band = bandOf(z);
      if (b.z0 < [HEDGE, B1, B2][band] + 1.0 || b.z1 > [B1, B2, MAP][band] - 1.0) continue;
      if (roadDist(cx, z) < hw + HALF + 0.6 || !free(b) || pads.concat(landmarks).some(r => hit(b, r, 0.6))) continue;
      const mid = (a.x0 + a.x1) / 2, door = { x: side < 0 ? a.x0 + 1.5 : a.x1 - 1.5, z };   // porta do lado da própria casa (antes as duas do beco tinham o mesmo ponto e só uma recebia)
      spots.push({ cx, cz: z, y: bandY(band), fx: -side, fz: 0, box: b, lane: R(Math.min(cx, mid), z - 1, Math.max(cx, mid), z + 1), door,
        foot: true, tags: [a.top ? 'loc:stairtop' : 'loc:stairfoot'] });
    }
  }
  // 2) beira das ruas: de frente para a rua (a frente "encaixa" no eixo mais próximo: o casario fica desalinhado)
  for (const s of segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (let t = 7; t < L - 5; t += 9.6) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;
      for (const off of [8.6, 9.6, 10.8]) {
        const cx = ax + ux * t + nx * off, cz = az + uz * t + nz * off, band = bandOf(cz);
        if (band !== s.band) continue;
        const b = box(cx, cz);
        if (!boxOk(b, band) || !free(b)) continue;
        const ax2 = Math.abs(nx) > Math.abs(nz);                        // frente para a rua: -n, encaixada em X ou Z
        const fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);
        const q = segDist(cx, cz, s), k = hw - 1.6;                      // ponto de entrega: na rua, em frente à casa
        const door = { x: q.x + nx * k, z: q.z + nz * k };
        spots.push({ cx, cz, y: bandY(band), fx, fz, box: b, lane: R(Math.min(cx, door.x) - 1, Math.min(cz, door.z) - 1, Math.max(cx, door.x) + 1, Math.max(cz, door.z) + 1), door,
          foot: false, tags: [] });
        break;
      }
    }
  }
  // no máximo 64 (lotes do jogo): tira casas de beira de rua da faixa mais cheia, as mais apertadas entre vizinhas
  while (spots.length > 64) {
    const cnt = [0, 1, 2].map(b => spots.filter(s => !s.foot && bandOf(s.cz) === b).length), b = cnt.indexOf(Math.max(...cnt));
    let worst = null, wd = Infinity;
    for (const s of spots) if (!s.foot && bandOf(s.cz) === b) {
      const d = Math.min(...spots.filter(o => o !== s).map(o => Math.hypot(o.cx - s.cx, o.cz - s.cz)));
      if (d < wd) { wd = d; worst = s; }
    }
    spots.splice(spots.indexOf(worst), 1);
  }
  // etiquetas de lugar: faixa do morro + perto do mercadinho / da quadra / da pracinha
  const near = (s, r, d) => s.cx > r.x0 - d && s.cx < r.x1 + d && s.cz > r.z0 - d && s.cz < r.z1 + d;
  for (const s of spots) {
    s.tags.push(['loc:low', 'loc:mid', 'loc:high'][bandOf(s.cz)]);
    if (near(s, market, 14)) s.tags.push('loc:market');
    if (near(s, court, 14)) s.tags.push('loc:court');
    if (near(s, square, 14)) s.tags.push('loc:square');
  }

  // ---- casas de enchimento (sem entrega): preenchem o morro entre ruas e muros ----
  let seed = 913; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const fillers = [];
  for (let band = 0; band < 3; band++) {
    const lo = [HEDGE, B1, B2][band], hi = [B1, B2, MAP][band];
    for (let z = lo + 4.6; z < hi - 3; z += 7.4) for (let x = HEDGE + 4.4; x < MAP - HEDGE - 3; x += 7.6) {
      if (rnd() < 0.07) continue;                                        // alguns vãos: vielas e quintais
      const w = 4.6 + rnd() * 2.6, d = 4.6 + rnd() * 2.2, cx = x + (rnd() - 0.5) * 2.2, cz = z + (rnd() - 0.5) * 1.8;
      const b = R(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
      if (!boxOk(b, band) || spots.some(s => hit(b, s.box, 0.9) || hit(b, s.lane, 0.5)) || fillers.some(f => hit(b, f, 0.5))) continue;
      if (Math.abs(cx - 104.6) < 9 && cz < 30) continue;                  // entrada livre
      fillers.push({ ...b, y: bandY(band), floors: 1 + Math.floor(rnd() * 3), tone: Math.floor(rnd() * 7), tank: rnd() < 0.35, raw: rnd() < 0.35 });
    }
  }

  const h = (x, z) => {
    if (x < 0 || x > MAP || z < 0 || z > MAP) return 0;                 // fora da sebe: a planície (o entorno construído é sólido)
    for (const r of ramps) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.h0 + (r.h1 - r.h0) * (z - r.z0) / (r.z1 - r.z0);
    for (const r of stairs) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.h0 + (r.h1 - r.h0) * (z - r.z0) / (r.z1 - r.z0);
    return z < B1 ? 0 : z < B2 ? H1 : H2;
  };
  // postes dos fios: um em cada vértice das ruas (menos o primeiro), na calçada, fora do asfalto
  const offRoad = (x, z) => { for (const [dx, dz] of [[5.4, 0.5], [-5.4, 0.5], [0.5, 5.4], [0.5, -5.4], [6.5, 4], [-6.5, -4]]) if (roadDist(x + dx, z + dz) > hw + 0.6) return [x + dx, z + dz]; return [x + 5.4, z]; };
  const poles = roads.map(r => r.pts.slice(1).map(([x, z]) => offRoad(x, z)));
  return { roads, segs, ramps, stairs, pads, alleys, market, square, court, spots, fillers, poles, h, bandOf, bandY, outside: planOutside(MAP, HEDGE) };
}

// ---- entorno (fora da sebe): terraços que descem do morro até a planície, com casas decorativas e alguns prédios mais
// altos. Só cenário: nada aqui entra em SPOTS, no game.pool ou nas pistas. Terraços e casas são sólidos (a van não sobe
// neles), a câmera usa as mesmas caixas e busy() tira as árvores de fora (world.js) de cima do casario.
const OUT = { DEPTH: 50, NORTH: 17, SLOPE: 0.2 };
function planOutside(MAP, HEDGE) {
  const { B1, B2, H1, H2 } = FAV, D = OUT.DEPTH, N = OUT.NORTH;
  let seed = 4177; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const edgeH = z => z <= 0 ? 0 : z >= MAP ? H2 : H1 * clamp01((z - B1 + 8) / 16) + (H2 - H1) * clamp01((z - B2 + 8) / 16);   // altura do morro junto à sebe (suave entre as faixas)
  const gapsN = [[44, 66], [84, 118]];       // ao norte: livre na estrada de acesso (com a placa) e no caminho da van na cena do monstro (monster.js)
  const sides = [
    { s: 'W', x0: -D, x1: 0, z0: -N, z1: MAP + D, fx: 1, fz: 0 }, { s: 'E', x0: MAP, x1: MAP + D, z0: -N, z1: MAP + D, fx: -1, fz: 0 },
    { s: 'S', x0: 0, x1: MAP, z0: MAP, z1: MAP + D, fx: 0, fz: -1 }, { s: 'N', x0: 0, x1: MAP, z0: -N, z1: 0, fx: 0, fz: 1 },
  ];
  // 1) células (cada lado com a sua grade, que fecha certinho na sebe) e a altura do terraço de cada uma
  const all = [];
  for (const sd of sides) {
    const nx = Math.max(1, Math.round((sd.x1 - sd.x0) / 7.6)), nz = Math.max(1, Math.round((sd.z1 - sd.z0) / 7.4)), cw = (sd.x1 - sd.x0) / nx, cd = (sd.z1 - sd.z0) / nz;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x0 = sd.x0 + i * cw, z0 = sd.z0 + j * cd, x1 = x0 + cw, z1 = z0 + cd, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const d = Math.hypot(mx - Math.max(0, Math.min(MAP, mx)), mz - Math.max(0, Math.min(MAP, mz)));
      const href = sd.s === 'N' ? 0 : sd.s === 'S' ? H2 : edgeH(mz);
      const gap = sd.s === 'N' && gapsN.some(([a, b]) => x1 > a && x0 < b);
      all.push({ sd, row: sd.s + j, x0, z0, x1, z1, mx, mz, cw, cd, d, gap, t: gap ? 0 : Math.max(0, Math.min(href, Math.round(href - OUT.SLOPE * d))) });
    }
  }
  // 2) alguns prédios mais altos, espalhados no meio da encosta (nunca ao norte, perto da entrada)
  const towers = [];
  for (const c of all.filter(c => c.sd.s !== 'N' && c.d > 9 && c.d < 36).sort(() => rnd() - 0.5)) {
    if (towers.length >= 12) break;
    if (towers.every(o => Math.hypot(o.mx - c.mx, o.mz - c.mz) > 34)) { towers.push(c); c.tower = true; }
  }
  // 3) casas, árvores, sólidos (terraços vizinhos na mesma fileira viram um sólido só) e caixas da câmera
  const cells = [], houses = [], trees = [], solids = [], cam = [];
  let run = null;
  const flush = () => { if (run) solids.push(run); run = null; };
  for (const c of all) {
    if (!run || run.row !== c.row || c.t === 0) flush();
    if (c.gap) continue;
    const pH = c.tower ? 1 : c.sd.s === 'N' ? 0.8 : c.d < 24 ? 0.92 : c.d < 44 ? 0.92 - (c.d - 24) * 0.035 : 0.1;
    const house = rnd() < pH;
    if (c.t > 0) {
      if (run) { run.x1 = c.x1; run.z1 = Math.max(run.z1, c.z1); } else run = { row: c.row, x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 };
    }
    const tone = c.d > 30 && c.t <= 1 ? 3 : Math.floor(rnd() * 3);            // topo do terraço: cimento, terra (fora, mais verde)
    if (c.t > 0 || house) cells.push({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, t: c.t, tone });
    if (!house) {
      if (c.t > 0 && rnd() < 0.45) trees.push({ x: c.mx + (rnd() - 0.5) * 2.5, z: c.mz + (rnd() - 0.5) * 2.5, y: c.t, s: 0.8 + rnd() * 0.5 });
      if (c.t > 0) cam.push([c.x0, c.z0, c.x1, c.z1, c.t + 0.6]);
      continue;
    }
    const tall = !!c.tower, w = tall ? c.cw - 0.5 : Math.min(c.cw - 0.7, 4.4 + rnd() * 2.6), dd = tall ? c.cd - 0.5 : Math.min(c.cd - 0.7, 4.4 + rnd() * 2.4);
    const hx = c.mx + (rnd() - 0.5) * (c.cw - 0.5 - w), hz = c.mz + (rnd() - 0.5) * (c.cd - 0.5 - dd), r = rnd();
    const floors = tall ? 5 + Math.floor(rnd() * 4) : c.d > 34 ? (r < 0.65 ? 1 : 2) : c.d > 20 ? (r < 0.35 ? 1 : r < 0.85 ? 2 : 3) : r < 0.2 ? 1 : r < 0.65 ? 2 : 3;   // mais baixas para fora: o casario desce até a planície
    const hb = { x0: hx - w / 2, z0: hz - dd / 2, x1: hx + w / 2, z1: hz + dd / 2, y: c.t, floors, tall, tone: Math.floor(rnd() * 13),
      raw: !tall && floors > 1 && rnd() < 0.3, tank: rnd() < 0.5 ? (rnd() < 0.7 ? 1 : 2) : 0, laundry: !tall && rnd() < 0.18, fx: c.sd.fx, fz: c.sd.fz, k: houses.length };
    houses.push(hb);
    const top = c.t + floors * 2.8 + 1.4;
    if (c.t > 0) cam.push([c.x0, c.z0, c.x1, c.z1, top]);
    else { solids.push({ x0: hb.x0 - 0.1, z0: hb.z0 - 0.1, x1: hb.x1 + 0.1, z1: hb.z1 + 0.1 }); cam.push([hb.x0 - 0.5, hb.z0 - 0.5, hb.x1 + 0.5, hb.z1 + 0.5, top]); }
  }
  flush();
  for (const s of solids) delete s.row;
  // a sebe fica num vão entre o morro e o entorno: onde o morro está alto, um aterro com o topo no nível da faixa a cobre
  const fills = [];
  for (const [z0, z1, y] of [[B1, B2, H1], [B2, MAP, H2]]) fills.push({ x0: -0.2, x1: HEDGE, z0, z1, y }, { x0: MAP - HEDGE, x1: MAP + 0.2, z0, z1, y });
  fills.push({ x0: -0.2, x1: MAP + 0.2, z0: MAP - HEDGE, z1: MAP + 0.2, y: H2 });
  for (const f of fills) cam.push([f.x0, f.z0, f.x1, f.z1, f.y + 0.6]);
  // ocupação (grade de 2 m) para afastar as árvores de fora do casario e dos terraços
  const G = 2, gx0 = -D - 4, gn = Math.ceil((MAP + 2 * D + 8) / G), occ = new Uint8Array(gn * gn);
  const mark = (x0, z0, x1, z1) => { for (let a = Math.max(0, Math.floor((x0 - gx0) / G)); a <= Math.min(gn - 1, Math.floor((x1 - gx0) / G)); a++) for (let b = Math.max(0, Math.floor((z0 - gx0) / G)); b <= Math.min(gn - 1, Math.floor((z1 - gx0) / G)); b++) occ[b * gn + a] = 1; };
  for (const c of cells) mark(c.x0 - 1, c.z0 - 1, c.x1 + 1, c.z1 + 1);
  for (const f of fills) mark(f.x0, f.z0, f.x1, f.z1);
  mark(gapsN[0][0] + 3, -56, gapsN[0][1] - 3, 0);                     // o caminho da van na cena do monstro fica sem árvores
  const busy = (x, z, r = 0) => {
    for (let a = Math.floor((x - r - gx0) / G); a <= Math.floor((x + r - gx0) / G); a++) for (let b = Math.floor((z - r - gx0) / G); b <= Math.floor((z + r - gx0) / G); b++)
      if (a >= 0 && b >= 0 && a < gn && b < gn && occ[b * gn + a]) return true;
    return false;
  };
  return { cells, houses, trees, fills, solids, cam, busy };
}
