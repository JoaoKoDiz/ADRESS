// Nível 13 (Morro): plano FIXO do bairro, sem grade de quadras. Três faixas de altura que sobem para o sul (longe da
// entrada): baixa (z < B1, altura 0), meio do morro (B1..B2, H1) e alta (z > B2, H2), ligadas por 2 ladeiras (a van
// sobe) e 4 escadarias (só a pé). Uma rua principal sinuosa sobe o morro com ramificações que terminam em pequenos
// estacionamentos ao pé das escadarias. Casas de entrega: na beira das ruas (a van entrega) e nos becos das
// escadarias (só a pé). Casas de enchimento (sem entrega) completam a densidade. Tudo aqui é geometria pura.

export const FAV = { B1: 70, B2: 140, H1: 4, H2: 8, RW: 8, HALF: 3.2 };   // HALF: meia largura da casa (6.4 × 6.4)
/** Mesa de dominó da pracinha (em relação ao centro da pracinha): meia largura do tampo, altura, raio dos banquinhos. */
export const DOMINO = { dx: 5, dz: 1, half: 0.52, top: 0.76, stoolR: 1.05, seat: 0.42 };
/** Banco dos que esperam a vez, dentro da quadra, junto ao alambrado norte (perto do portãozinho). */
export const courtBench = C => ({ x0: C.x1 - 5.8, x1: C.x1 - 2.4, z: C.z0 + 0.46, front: C.z0 + 0.8, seat: 0.32 });

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
  const marketFront = R(market.x0 - 0.6, market.z1, market.x1 + 0.6, market.z1 + 12);   // calçada do mercadinho até a rua (sem casa na frente da porta)

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
  const reserved = [...pads, ...alleys.map(a => R(a.x0 - 0.4, a.z0, a.x1 + 0.4, a.z1)), ...stairs, ...ramps, ...landmarks, marketFront];
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
      if (roadDist(cx, z) < hw + HALF + 0.6 || !free(b) || pads.concat(landmarks, [marketFront]).some(r => hit(b, r, 0.6))) continue;
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
  return { roads, segs, ramps, stairs, pads, alleys, market, square, court, spots, fillers, poles, h, bandOf, bandY, outside: planOutside(MAP, HEDGE, roads[0].pts[0][0]) };
}

// ---- entorno (fora da sebe) ----
// O bairro é um pedaço da encosta de um morro maior, que continua para o sul: fora da sebe o casario sobe em patamares
// (muros de arrimo), com escadarias e vielas, até a mata e a pedra lá no alto; nos lados ele desce até a avenida que
// contorna o pé do morro. Do outro lado da avenida começa o "asfalto": a cidade em quadras alinhadas com a avenida (as
// ruas da cidade chegam nela; a estrada de acesso do bairro é uma delas). Na entrada, a pracinha do pé do morro com o
// ponto de mototáxi. Nada aqui é destino, pista ou SPOT; terraços, casas e quadras são sólidos (a van não sobe no morro)
// e a câmera usa as mesmas caixas; busy() tira as árvores genéricas de world.js de tudo isso.
/** Avenida em volta do pé do morro: meia largura do asfalto, calçada, distância das avenidas laterais ao eixo da entrada,
 *  eixo das avenidas norte e sul. */
export const AVE = { W: 6, SW: 3, D: 160, N: -26, S: 414 };
function planOutside(MAP, HEDGE, EX) {
  const { B1, B2, H1, H2 } = FAV;
  let seed = 4177; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const c01 = v => Math.max(0, Math.min(1, v)), sst = (a, b, x) => { const u = c01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  const AW = AVE.W, SW = AVE.SW, AXW = EX - AVE.D, AXE = EX + AVE.D, AZN = AVE.N, AZS = AVE.S;
  const X0 = AXW + AW + SW, X1 = AXE - AW - SW, Z0 = AZN + AW + SW, Z1 = AZS - AW - SW;    // pé do morro (beira da calçada de dentro)
  const SUM = { x: EX + 18, z: MAP + 100, h: 36 }, ROCK = { x: EX + 36, z: MAP + 110, rx: 22, rz: 17 };
  const edgeH = z => z <= 0 ? 0 : z >= MAP ? H2 : H1 * c01((z - B1 + 8) / 16) + (H2 - H1) * c01((z - B2 + 8) / 16);   // altura do morro junto à sebe
  const dOut = (x, z) => Math.hypot(Math.max(0, -x, x - MAP), Math.max(0, -z, z - MAP));
  /** Altura do terreno do morro fora do bairro (contínua; os patamares arredondam para cima). */
  function hill(x, z) {
    const foot = Math.min(x - X0, X1 - x, Z1 - z);
    if (z < 0 || foot <= 0) return 0;                                       // pé do morro ao norte e além da calçada: plano
    const A = edgeH(Math.min(z, MAP)) * (1 - sst(0, 40, dOut(x, z)));       // ombro em volta do bairro
    const dx = (x - SUM.x) / 185, dz = (z - SUM.z) / (z < SUM.z ? 140 : 100), r = Math.hypot(dx, dz);
    const top = r < 1 ? SUM.h * (0.5 + 0.5 * Math.cos(Math.PI * r)) : 0;  // o morro que sobe ao sul
    let h = Math.max(A, top);
    h += (Math.sin(x * 0.045 + 1.3) * Math.sin(z * 0.06 - 0.4) * 1.6 + Math.sin(x * 0.11 + z * 0.07) * 0.7) * sst(1, 6, h);
    return Math.max(0, h * sst(0, 10, foot));
  }
  const forestLine = (x, z) => 27 + 3 * Math.sin(x * 0.05 + 0.7) + 2 * Math.sin(z * 0.08);
  const inRock = (x, z, m = 0) => ((x - ROCK.x) / (ROCK.rx + m)) ** 2 + ((z - ROCK.z) / (ROCK.rz + m)) ** 2 < 1;
  const plazaX = [84, 118];                                                // pracinha da entrada (livre para a cena do monstro)
  // 1) células: cada lado com a sua grade, que fecha na sebe; q = quantas células da sebe para fora
  const regions = [
    { s: 'W', x0: X0, x1: 0, z0: Z0, z1: Z1 }, { s: 'E', x0: MAP, x1: X1, z0: Z0, z1: Z1 },
    { s: 'S', x0: 0, x1: MAP, z0: MAP, z1: Z1 }, { s: 'N', x0: 0, x1: MAP, z0: Z0, z1: 0 },
  ];
  const cells = [], houses = [], trees = [], stairs = [], solids = [], cam = [], props = [];
  const grid = new Map();                                                  // (região, i, j) → célula
  for (const R of regions) {
    const nx = Math.max(1, Math.round((R.x1 - R.x0) / 7.7)), nz = Math.max(1, Math.round((R.z1 - R.z0) / 7.4)), cw = (R.x1 - R.x0) / nx, cd = (R.z1 - R.z0) / nz;
    R.nx = nx; R.nz = nz;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x0 = R.x0 + i * cw, z0 = R.z0 + j * cd, x1 = x0 + cw, z1 = z0 + cd, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const q = R.s === 'W' ? nx - 1 - i : R.s === 'E' ? i : R.s === 'S' ? j : nz - 1 - j;
      const hc = hill(mx, mz), hmax = Math.max(hc, hill(x0, z0), hill(x1, z0), hill(x0, z1), hill(x1, z1));
      const foot = R.s === 'N' ? z0 - Z0 : Math.min(mx - X0, X1 - mx, Z1 - mz);
      const c = { R, i, j, q, x0, z0, x1, z1, mx, mz, cw, cd, hc, t: hmax < 0.25 ? 0 : Math.ceil(hmax * 2) / 2, foot, kind: 'house' };
      if (inRock(mx, mz)) c.kind = 'rock';
      else if (inRock(mx, mz, 6) || hc > forestLine(mx, mz) || (mz > SUM.z + 4 && hc > 3)) c.kind = 'forest';
      else if (R.s === 'N' && x1 > plazaX[0] && x0 < plazaX[1]) c.kind = 'plaza';
      else if ((R.s === 'W' || R.s === 'E') && j % 10 === 5 && mz > Z0 + 12 && mz < MAP + 60) c.kind = 'stair';
      else if (R.s === 'S' && i % 8 === 4) c.kind = 'stair';
      else if ((R.s === 'W' || R.s === 'E') && (q === 1 || q === 4) && mz > 40) c.kind = 'path';
      else if (R.s === 'S' && q % 3 === 2) c.kind = 'path';
      else if (rnd() < 0.08) c.kind = 'yard';
      cells.push(c); grid.set(R.s + i + ',' + j, c);
    }
  }
  const at = (R, i, j) => grid.get(R.s + i + ',' + j);
  // 2) casas (de frente para a viela/escadaria ou morro abaixo), escadarias e árvores
  const TONES = 13;
  for (const c of cells) {
    const R = c.R;
    if (c.kind === 'forest') {                                             // mata: 3 a 5 árvores no chão do morro
      const n = 3 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) { const x = c.x0 + 0.8 + rnd() * (c.cw - 1.6), z = c.z0 + 0.8 + rnd() * (c.cd - 1.6); if (!inRock(x, z, 1)) trees.push({ x, z, y: hill(x, z) - 0.15, s: 1.0 + rnd() * 0.75, wild: true, c: rnd() }); }
      continue;
    }
    if (c.kind === 'rock') continue;
    if (c.kind === 'stair') {                                              // escadaria: do patamar de baixo até o deste
      const lowC = R.s === 'W' ? at(R, c.i - 1, c.j) : R.s === 'E' ? at(R, c.i + 1, c.j) : at(R, c.i, c.j - 1);
      const y0 = lowC ? (lowC.kind === 'forest' ? lowC.hc : lowC.t) : R.s === 'S' ? H2 : 0;
      if (c.t - y0 > 0.2 || R.s !== 'S') stairs.push({ x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1, y0: Math.min(y0, c.t), y1: c.t, ax: R.s === 'S' ? 'z' : 'x', dir: R.s === 'W' ? 1 : R.s === 'E' ? -1 : 1 });
      continue;
    }
    if (c.kind === 'plaza' || c.kind === 'path') continue;
    if (c.kind === 'yard') { if (rnd() < 0.7) trees.push({ x: c.mx + (rnd() - 0.5) * 2.5, z: c.mz + (rnd() - 0.5) * 2.5, y: c.t, s: 0.8 + rnd() * 0.5, c: rnd() }); continue; }
    // de frente para onde se chega: lado da viela/escadaria vizinha, ou morro abaixo; no pé, para a avenida
    let fx = 0, fz = 0;
    if (R.s === 'N') fz = -1;
    else if (R.s === 'W' || R.s === 'E') {
      const out = R.s === 'W' ? -1 : 1;
      fx = c.q === 0 || c.q === 3 || c.q >= 5 ? out : -out;
      if (c.foot > 14 && c.mz > MAP + 4) fx = out;                         // (no sul, morro abaixo para os lados)
    } else fz = c.q % 3 === 0 ? -1 : 1;
    const near = c.hc > forestLine(c.mx, c.mz) - 5, foot = c.foot < 10, r = rnd();
    const w = Math.max(4.2, Math.min(c.cw - 0.9, 4.6 + rnd() * 2.6)), dd = Math.max(4.2, Math.min(c.cd - 0.9, 4.4 + rnd() * 2.4));
    const hx = c.mx + (rnd() - 0.5) * (c.cw - 0.8 - w), hz = c.mz + (rnd() - 0.5) * (c.cd - 0.8 - dd);
    const floors = near ? (r < 0.6 ? 1 : 2) : foot ? (r < 0.25 ? 2 : r < 0.75 ? 3 : 4) : r < 0.2 ? 1 : r < 0.65 ? 2 : 3;
    const shop = foot && (R.s === 'N' ? true : (R.s === 'W' || R.s === 'E') && c.q >= 5) && rnd() < 0.75;
    houses.push({ x0: hx - w / 2, z0: hz - dd / 2, x1: hx + w / 2, z1: hz + dd / 2, y: c.t, floors, tall: false, tone: Math.floor(rnd() * TONES),
      raw: floors > 1 && rnd() < (near ? 0.55 : 0.28), tank: rnd() < 0.62 ? (rnd() < 0.75 ? 1 : 2) : 0, laundry: !shop && rnd() < 0.2, fx, fz, k: houses.length, shop: shop ? 1 + Math.floor(rnd() * 6) : 0 });
    c.house = houses[houses.length - 1];
  }
  for (const c of cells) if (c.kind !== 'rock' && c.kind !== 'forest' && (c.t > 0 || c.kind === 'path' || c.kind === 'stair')) c.tone = c.kind === 'path' || c.kind === 'stair' ? 4 : c.foot < 10 ? 0 : Math.floor(rnd() * 3);
  // 3) sólidos (fileiras de células com morro viram uma caixa só) e caixas da câmera
  for (const R of regions) for (let j = 0; j < R.nz; j++) {
    let run = null;
    for (let i = 0; i < R.nx; i++) {
      const c = at(R, i, j), solid = c.kind !== 'plaza' && (c.t > 0.3 || c.hc > 0.3);
      if (solid) { if (run) run.x1 = c.x1; else run = { x0: c.x0, z0: c.z0, x1: c.x1, z1: c.z1 }; }
      else if (run) { solids.push(run); run = null; }
      if (c.house && c.t <= 0.3) solids.push({ x0: c.house.x0 - 0.1, z0: c.house.z0 - 0.1, x1: c.house.x1 + 0.1, z1: c.house.z1 + 0.1 });
      const top = c.house ? c.t + c.house.floors * 2.8 + 1.4 : c.kind === 'forest' ? c.hc + 7 : c.kind === 'rock' ? 60 : c.t + 0.6;
      if (c.kind !== 'plaza' && top > 0.7) cam.push([c.x0, c.z0, c.x1, c.z1, top]);
    }
    if (run) solids.push(run);
  }
  // a sebe fica num vão entre o morro e o entorno: onde o morro está alto, um aterro com o topo no nível da faixa a cobre
  const fills = [];
  for (const [z0, z1, y] of [[B1, B2, H1], [B2, MAP, H2]]) fills.push({ x0: -0.2, x1: HEDGE, z0, z1, y }, { x0: MAP - HEDGE, x1: MAP + 0.2, z0, z1, y });
  fills.push({ x0: -0.2, x1: MAP + 0.2, z0: MAP - HEDGE, z1: MAP + 0.2, y: H2 });
  for (const f of fills) cam.push([f.x0, f.z0, f.x1, f.z1, f.y + 0.6]);
  // 4) pracinha da entrada: piso, ponto de mototáxi (motos estacionadas e placa), banca, bancos e o abrigo de ônibus da avenida
  const P0 = plazaX[0], P1 = plazaX[1], RX0 = EX - 3.8 - 0.3, RX1 = EX + 3.8 + 0.3;
  props.push({ type: 'pave', x0: P0, x1: RX0, z0: Z0, z1: -0.6 }, { type: 'pave', x0: RX1, x1: P1, z0: Z0, z1: -0.6 });
  for (let k = 0; k < 4; k++) { const x = RX0 - 1.4, z = -4.5 - k * 1.5; props.push({ type: 'moto', x, z, ry: -Math.PI / 2 + (k % 2 ? 0.12 : -0.1), c: ['#c8402f', '#1f3a68', '#2b2b2b', '#e8e2d4'][k] }); solids.push({ x0: x - 1.0, x1: x + 1.0, z0: z - 0.35, z1: z + 0.35 }); }
  props.push({ type: 'signpost', x: RX0 - 0.6, z: -2.2, text: 'MOTOTÁXI' });
  props.push({ type: 'kiosk', x: 89.5, z: -11.5 }); solids.push({ x0: 88.1, x1: 90.9, z0: -12.7, z1: -10.3 });
  for (const [x, z, ry] of [[93.5, -15.2, 0], [113.5, -6.5, Math.PI / 2], [113.5, -11, Math.PI / 2]]) props.push({ type: 'bench', x, z, ry });
  props.push({ type: 'shelter', x: 112.5, z: Z0 - 1.5, ry: Math.PI }); solids.push({ x0: 110.4, x1: 114.6, z0: Z0 - 2.4, z1: Z0 - 0.7 });
  for (const [x, z] of [[86.5, -3.5], [116, -15.5], [86.5, -15.5]]) props.push({ type: 'planter', x, z });
  // 5) a avenida: calçada de dentro com postes; o asfalto, as faixas e as árvores do outro lado ficam no desenho
  const AV = { W: AXW, E: AXE, N: AZN, S: AZS, X0, X1, Z0, Z1, AW, SW };
  for (let z = Z0 + 6; z < Z1 - 4; z += 18) for (const x of [X0 - 0.7, X1 + 0.7]) props.push({ type: 'lamp', x, z, ry: x < EX ? -Math.PI / 2 : Math.PI / 2 });
  for (let x = X0 + 4; x < X1 - 4; x += 18) { if (Math.abs(x - EX) > 12) props.push({ type: 'lamp', x, z: Z0 - 0.7, ry: Math.PI }); props.push({ type: 'lamp', x, z: Z1 + 0.7, ry: 0 }); }
  props.push({ type: 'shelter', x: X0 - 1.5, z: 92, ry: -Math.PI / 2 }); solids.push({ x0: X0 - 2.4, x1: X0 - 0.7, z0: 89.9, z1: 94.1 });
  // 6) a cidade ("o asfalto"): quadras em grade alinhada com a avenida (ruas a cada 40, uma delas a estrada de acesso)
  const city = { blocks: [], builds: [], trees: [] }, CR = 300, STEP = 40, RH = 3.5;
  const xl = [], zl = [];
  for (let k = -9; k <= 13; k++) xl.push({ c: EX + k * STEP, h: k === -4 || k === 4 ? AW : RH });
  for (let k = -9; k <= 18; k++) zl.push({ c: AZN + k * STEP, h: k === 0 || k === 11 ? AW : RH });
  const ringX = c => c <= AXW || c >= AXE, ringZ = c => c <= AZN || c >= AZS;
  for (let a = 0; a < xl.length - 1; a++) for (let b = 0; b < zl.length - 1; b++) {
    const x0 = xl[a].c + xl[a].h, x1 = xl[a + 1].c - xl[a + 1].h, z0 = zl[b].c + zl[b].h, z1 = zl[b + 1].c - zl[b + 1].h, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (!(mx < AXW || mx > AXE || mz < AZN || mz > AZS)) continue;          // dentro do anel: o morro
    const dn = dOut(mx, mz); if (dn > CR) continue;
    const aveX = (xl[a].h === AW && x0 > AXW - 1) ? 'W' : (xl[a + 1].h === AW && x1 < AXE + 1) ? 'E' : null;
    const blk = { x0, z0, x1, z1, top: 0, park: false, faces: [] };
    if (xl[a].c === AXE || (xl[a].h === AW && xl[a].c === AXE)) blk.faces.push([-1, 0]);
    if (xl[a + 1].c === AXW) blk.faces.push([1, 0]);
    if (zl[b].c === AZS && mx > AXW && mx < AXE) blk.faces.push([0, -1]);
    if (zl[b + 1].c === AZN && mx > AXW && mx < AXE) blk.faces.push([0, 1]);
    void aveX;
    const nearEntry = zl[b + 1].c === AZN && x1 > EX - 40 && x0 < EX + 40;   // primeira fileira junto da estrada de acesso
    blk.park = (nearEntry && mx < EX) || (!nearEntry && rnd() < 0.07);
    city.blocks.push(blk);
    if (blk.park) continue;                                                 // pracinha arborizada
    const lw = (x1 - x0) / 2, ld = (z1 - z0) / 2;
    for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const w = Math.min(lw - 1.6, 9.5 + rnd() * 4), d = Math.min(ld - 1.6, 9.5 + rnd() * 4), far = dn > 120, r = rnd();
      let x = x0 + u * lw + lw / 2 + (rnd() - 0.5) * (lw - w - 1.6), z = z0 + v * ld + ld / 2 + (rnd() - 0.5) * (ld - d - 1.6);
      // de frente para a avenida: colado na calçada, com loja no térreo
      let shop = 0, face = null;
      for (const [fx, fz] of blk.faces) if ((fx > 0 && u === 1) || (fx < 0 && u === 0) || (fz > 0 && v === 1) || (fz < 0 && v === 0)) { face = [fx, fz]; shop = 1 + Math.floor(rnd() * 6); }
      if (face) { if (face[0]) x = face[0] > 0 ? x1 - 1.6 - w / 2 : x0 + 1.6 + w / 2; else z = face[1] > 0 ? z1 - 1.6 - d / 2 : z0 + 1.6 + d / 2; }
      let floors = r < 0.08 ? 10 + Math.floor(rnd() * 6) : far ? 3 + Math.floor(rnd() * 6) : 2 + Math.floor(rnd() * 4);
      if (nearEntry && x - w / 2 < plazaX[1] + 2) floors = Math.min(floors, 2);   // perto da estrada de acesso: baixo (cena do monstro)
      city.builds.push({ x, z, w, d, floors, tone: Math.floor(rnd() * 9), tank: rnd() < 0.45, shop, face });
      blk.top = Math.max(blk.top, floors * 3);
    }
    solids.push({ x0: x0 + 1.2, z0: z0 + 1.2, x1: x1 - 1.2, z1: z1 - 1.2 });
    cam.push([x0 + 1.2, z0 + 1.2, x1 - 1.2, z1 - 1.2, blk.top + 1]);
  }
  // árvores na calçada de fora da avenida (entre a avenida e as quadras)
  for (const blk of city.blocks) for (const [fx, fz] of blk.faces) {
    const along = fx ? [blk.z0 + 3, blk.z1 - 3] : [blk.x0 + 3, blk.x1 - 3];
    for (let u = along[0]; u <= along[1]; u += 10.5) {
      const x = fx ? (fx > 0 ? blk.x1 - 1.0 : blk.x0 + 1.0) : u, z = fz ? (fz > 0 ? blk.z1 - 1.0 : blk.z0 + 1.0) : u;
      city.trees.push({ x, z, s: 0.95 + rnd() * 0.35, c: rnd() }); solids.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
    }
  }
  const busy = (x, z) => dOut(x, z) < CR + 40;                              // morro, avenida e cidade: sem as árvores genéricas
  return { cells, houses, trees, stairs, fills, solids, cam, busy, city, props, hill, AV, SUM, ROCK, plazaX, EX };
}
