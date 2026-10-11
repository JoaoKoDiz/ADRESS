// Geometria do bairro em unidades do mundo (≈ metros).
// Eixos: X = leste, Z = sul (em direção à câmera), Y = para cima. O mapa ocupa [0, MAP] em X e Z.
// A entrada do bairro fica no centro da borda NORTE (z = 0). As casas têm a frente voltada para o SUL (+Z).

export const HEDGE = 1.6;       // sebe que limita o mapa
export const ROAD = 7.6;        // largura das ruas
export const LOT = 17.2;        // lote quadrado
export const WALK = 0.4;        // calçada em volta de cada lote (faz parte do obstáculo)
export const STEP = LOT + ROAD;

// ---- Grade do bairro (muda conforme o bairro; os módulos leem estes valores "ao vivo") ----
//   'grid4'  — 4×4 lotes, 16 casas (Bairro 1, modo Livre e demais fases)
//   'plaza6' — 6×6 lotes; os 4 lotes do bloco 2×2 central viram uma praça → 32 casas (Bairro 2)
//   'grid5'  — 5×5 lotes, sem praça → 25 casas (Bairro 4)
//   'grid6s' — 6×6 lotes, sem praça; a cada partida um posto de gasolina ocupa 2 lotes vizinhos (Bairro 5)
//   'city6'  — 6×6 lotes de cidade: quase só prédios residenciais altos (Bairro 6)
export let GRID = 4;            // lotes por lado
export let MAP = 110;           // HEDGE*2 + ROAD*(GRID+1) + LOT*GRID
export let HOUSE_SLOTS = [];    // lotes que têm casa (os da praça ficam de fora)
export let PLAZA = null;        // { slots, x0, z0, x1, z1 } — região da praça (lotes unidos + ruas entre eles)
export let BUILD_H = 9.2;       // altura máxima das construções (câmera desvia delas); a cidade é mais alta
export let GAS_LIST = [];       // postos da partida: { slots, x0, z0, x1, z1 } (2 lotes vizinhos + a rua entre eles)
export let WARE_LIST = [];      // galpões (Bairro 10): { slots: [s, s+1] } — ocupam 2 lotes vizinhos + a rua entre eles (fechada)
export let CANAL = null;        // Bairro 10: { x0, x1, bridges: [linhas de rua], foot: [z das passarelas], cols: [3, 4] }
// Terreno (Bairro 9): altura do chão em (x, z). Fora do Bairro 9 é sempre 0.
export let VENICE = null;        // Nível 12 (Veneza): canais no lugar das ruas, canal principal sinuoso, vielas, pracinha e pontes
export let RAIL = null;          // Bairro 11: percurso do bondinho pelas ruas (trilhos no asfalto) e as 2 paradas
export const TERRAIN = { kind: 'flat', H1: 3, H2: 6, ramps: [], stairs: [], h: () => 0 };
// Posto de gasolina, em coordenadas locais do modelo (origem no canto noroeste do lote da esquerda, frente +Z).
// A van entra nele: só a loja, as ilhas das bombas, os pilares da cobertura, o totem, o calibrador e a lixeira barram.
export const GAS_W = LOT * 2 + ROAD;
export const GAS_CANOPY = { cx: GAS_W / 2, cz: 10.6, w: 20, d: 9 };
export const GAS_ISLANDS = [GAS_CANOPY.cx - 4.5, GAS_CANOPY.cx + 4.5];
export const GAS_PARTS = [
  [1.9, 0.8, 13.1, 6.45],                                                        // loja de conveniência
  ...GAS_ISLANDS.map(ix => [ix - 0.75, GAS_CANOPY.cz - 2.85, ix + 0.75, GAS_CANOPY.cz + 2.85]),   // ilhas com bombas
  ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => {                     // pilares da cobertura
    const x = GAS_CANOPY.cx + sx * (GAS_CANOPY.w / 2 - 2), z = GAS_CANOPY.cz + sz * (GAS_CANOPY.d / 2 - 1.5);
    return [x - 0.35, z - 0.35, x + 0.35, z + 0.35];
  }),
  [GAS_W - 3 - 0.35, LOT - 2.2 - 0.35, GAS_W - 3 + 0.35, LOT - 2.2 + 0.35],          // totem de preços
  [GAS_W - 6 - 0.3, 4 - 0.3, GAS_W - 6 + 0.3, 4 + 0.3],                              // calibrador
  [14.5 - 0.4, 7 - 0.4, 14.5 + 0.4, 7 + 0.4],                                        // lixeira
];

export const lotX = c => HEDGE + ROAD + c * STEP;          // canto noroeste do lote da coluna c
export const lotZ = r => HEDGE + ROAD + r * STEP;          // canto noroeste do lote da linha r
export const slotOrigin = s => ({ x: lotX(s % GRID), z: lotZ(Math.floor(s / GRID)) });
export const roadCenter = i => HEDGE + ROAD / 2 + i * STEP; // eixo da rua i (0..GRID), vale para X e Z

// Entrada: abertura no centro da sebe norte, alinhada com a rua do meio (GRID/2). Atualizada por configureGrid.
export const ENTRANCE = { x0: 0, x1: 0, road: 2 };

// Van. heading = atan2(dz, dx): 0 = leste (+X), PI/2 = sul (+Z, para dentro do bairro).
export const VAN = { length: 4.8, width: 2.6, height: 2.6 };
export const VAN_START = { x: 0, z: HEDGE + ROAD / 2 + 0.2, heading: Math.PI / 2 };   // x: rua da entrada

// Obstáculos (AABB no plano XZ), nesta ordem: os lotes com casa (na ordem de HOUSE_SLOTS), a praça (se houver),
// a sebe (5 pedaços, com a abertura da entrada livre) e, adicionados depois, os troncos das árvores de fora.
export const SOLIDS = [];

/** Troca a grade do bairro e refaz os obstáculos-base (lotes, praça e sebe). */
export function configureGrid(kind) {
  GRID = kind === 'plaza6' || kind === 'grid6s' || kind === 'city6' || kind === 'city7' ? 6 : kind === 'city8' || kind === 'hill8' || kind === 'canal8' || kind === 'rail8' || kind === 'venice8' ? 8 : kind === 'grid5' ? 5 : 4;
  BUILD_H = kind === 'city8' || kind === 'canal8' || kind === 'rail8' ? 31 : kind === 'hill8' ? 23 : kind === 'city6' || kind === 'city7' ? 16.5 : 9.2;
  // praça: bloco 2×2 central (linhas e colunas 2–3 do 6×6)
  const plazaSlots = kind === 'plaza6' ? [2 * GRID + 2, 2 * GRID + 3, 3 * GRID + 2, 3 * GRID + 3] : [];
  ENTRANCE.road = kind === 'canal8' ? 2 : Math.floor(GRID / 2);   // rua do meio (no 5×5, a 3ª rua); no Bairro 10 o meio é o canal
  ENTRANCE.x0 = roadCenter(ENTRANCE.road) - ROAD / 2;
  ENTRANCE.x1 = roadCenter(ENTRANCE.road) + ROAD / 2;
  VAN_START.x = roadCenter(ENTRANCE.road);
  MAP = HEDGE * 2 + ROAD * (GRID + 1) + LOT * GRID;
  PLAZA = plazaSlots.length
    ? { slots: plazaSlots, x0: lotX(2) - WALK, z0: lotZ(2) - WALK, x1: lotX(3) + LOT + WALK, z1: lotZ(3) + LOT + WALK }
    : null;
  CANAL = kind === 'canal8'
    ? { x0: roadCenter(3) + ROAD / 2, x1: roadCenter(5) - ROAD / 2, cols: [3, 4], bridges: [1, 4, 7], foot: [lotZ(2) + LOT / 2, lotZ(5) + LOT / 2] }
    : null;
  setupTerrain(kind);
  setupRail(kind);
  setupVenice(kind);
  VAN_START.z = HEDGE + ROAD / 2 + 0.2; VAN_START.heading = Math.PI / 2;
  if (VENICE) Object.assign(VAN_START, VENICE.start);   // Veneza: a lancha começa na entrada do canto sudeste, virada para o noroeste
  GAS_LIST = []; WARE_LIST = [];
  HOUSE_SLOTS = baseSlots();
  rebuildBaseSolids();
}

/** Lotes que podem ter construção (sem praça e sem o canal). */
function baseSlots() {
  return [...Array(GRID * GRID).keys()].filter(s => !(PLAZA && PLAZA.slots.includes(s)) && !(CANAL && CANAL.cols.includes(s % GRID)) && !(RAIL && RAIL.reserved.includes(s)) && !(VENICE && VENICE.nonHouse.includes(s)));
}
/** Postos (e galpões, Bairro 10) em pares de lotes vizinhos ([s, s+1], mesma linha). O galpão fica no lote da esquerda
 *  (é um destino de entrega); o da direita e a rua entre os dois ficam por baixo dele. Refaz os obstáculos-base. */
export function setGasStations(list, wares = []) {
  GAS_LIST = (list || []).map(slots => {
    const a = slotOrigin(slots[0]), b = slotOrigin(slots[1]);
    return { slots, x0: a.x - WALK, z0: a.z - WALK, x1: b.x + LOT + WALK, z1: a.z + LOT + WALK };
  });
  WARE_LIST = (wares || []).map(slots => ({ slots }));
  HOUSE_SLOTS = baseSlots().filter(s => !GAS_LIST.some(g => g.slots.includes(s)) && !WARE_LIST.some(w => w.slots[1] === s));
  rebuildBaseSolids();
}

// ---- Bairro 9 (Encostas): duas áreas elevadas ligadas por ladeiras; escadarias só a pé ----
//   nível 1 (H1): tudo ao sul da rua 4 (linhas de lotes 4–7); nível 2 (H2): linhas 6–7, colunas 4–7 (a parte mais alta).
//   Ladeiras e escadarias ocupam trechos verticais de rua (coluna j, entre as ruas i e i+1).
function setupTerrain(kind) {
  const T = TERRAIN;
  if (kind !== 'hill8') { T.kind = 'flat'; T.ramps = []; T.stairs = []; T.h = () => 0; return; }
  T.kind = 'hill';
  T.ramps = [{ j: 1, i: 4, h0: 0, h1: T.H1 }, { j: 6, i: 4, h0: 0, h1: T.H1 }, { j: 6, i: 6, h0: T.H1, h1: T.H2 }];
  T.stairs = [{ j: 3, i: 4, h0: 0, h1: T.H1 }, { j: 5, i: 6, h0: T.H1, h1: T.H2 }];
  const hr = ROAD / 2, rc = roadCenter;
  T.h = (x, z) => {
    for (const r of T.ramps.concat(T.stairs)) {
      if (Math.abs(x - rc(r.j)) <= hr && z >= rc(r.i) + hr && z <= rc(r.i + 1) - hr) return r.h0 + (r.h1 - r.h0) * (z - rc(r.i) - hr) / LOT;
    }
    if (x >= rc(4) + hr && z >= rc(6) + hr) return T.H2;
    if (z >= rc(4) + hr) return T.H1;
    return 0;
  };
}
// ---- Bairro 11 (Trilhos): 3 bondinhos, cada um num percurso fixo no eixo das ruas (trilhos embutidos no asfalto).
// Os percursos se cruzam em pares, em pontos diferentes: 1×2 (rua vertical 6 × rua 5) e 2×3 (rua vertical 2 × rua 5); o 1 e o 3
// nunca se encontram. Nos cruzamentos de ruas, arcos de raio 7 (cabem sem tocar as calçadas). `at(s)`: ponto e direção a `s`.
function makeLine(P, R = 7) {
  const segs = []; let prev = { x: P[0][0], z: P[0][1] };
  const line = (b) => { const L = Math.hypot(b.x - prev.x, b.z - prev.z); if (L > 0.01) segs.push({ type: 'L', a: prev, b, L }); prev = b; };
  for (let i = 1; i < P.length; i++) {
    const p = { x: P[i][0], z: P[i][1] };
    if (i === P.length - 1) { line(p); break; }
    const q = { x: P[i + 1][0], z: P[i + 1][1] };
    const d0 = { x: Math.sign(p.x - P[i - 1][0]), z: Math.sign(p.z - P[i - 1][1]) }, d1 = { x: Math.sign(q.x - p.x), z: Math.sign(q.z - p.z) };
    const t0 = { x: p.x - d0.x * R, z: p.z - d0.z * R }, t1 = { x: p.x + d1.x * R, z: p.z + d1.z * R };
    line(t0);
    const c = { x: t0.x + d1.x * R, z: t0.z + d1.z * R }, a0 = Math.atan2(t0.z - c.z, t0.x - c.x), a1 = Math.atan2(t1.z - c.z, t1.x - c.x);
    let sw = a1 - a0; while (sw > Math.PI) sw -= 2 * Math.PI; while (sw < -Math.PI) sw += 2 * Math.PI;
    segs.push({ type: 'A', c, a0, sw, L: Math.abs(sw) * R }); prev = t1;
  }
  const S = segs.reduce((t, g) => t + g.L, 0);
  const at = s => {
    s = Math.max(0, Math.min(S, s));
    for (const g of segs) {
      if (s > g.L && g !== segs[segs.length - 1]) { s -= g.L; continue; }
      const u = Math.min(1, s / g.L);
      if (g.type === 'L') return { x: g.a.x + (g.b.x - g.a.x) * u, z: g.a.z + (g.b.z - g.a.z) * u, dx: (g.b.x - g.a.x) / g.L, dz: (g.b.z - g.a.z) / g.L };
      const a = g.a0 + g.sw * u, sg = Math.sign(g.sw);
      return { x: g.c.x + R * Math.cos(a), z: g.c.z + R * Math.sin(a), dx: -Math.sin(a) * sg, dz: Math.cos(a) * sg };
    }
  };
  return { S, at };
}
function setupRail(kind) {
  if (kind !== 'rail8') { RAIL = null; return; }
  const rc = roadCenter, hr = ROAD / 2, W = -Math.PI / 2;          // W: parada na beira leste de uma rua vertical, virada para ela
  const defs = [
    { P: [[rc(1) + STEP / 2, rc(0)], [rc(3), rc(0)], [rc(3), rc(3)], [rc(6), rc(3)], [rc(6), rc(6)], [rc(4) + 5, rc(6)]],
      stops: [{ x: rc(1) + STEP / 2 + 1, z: rc(0) - 3.0, ry: 0, name: 'PARADA ENTRADA' }, { x: rc(4) + 4, z: rc(6) + 3.0, ry: Math.PI, name: 'PARADA DOS GALPÕES' }],
      wait: 5, start: 0 },
    { P: [[rc(1), rc(2) + STEP / 2], [rc(1), rc(5)], [rc(7), rc(5)], [rc(7), rc(6) - 5]],
      stops: [{ x: rc(1) + 3.0, z: rc(2) + STEP / 2 - 1, ry: W, name: 'PARADA OESTE' }, { x: rc(7) + 3.0, z: rc(6) - 6, ry: W, name: 'PARADA LESTE' }],
      wait: 6.5, start: 0.45 },
    { P: [[rc(4), rc(7) + STEP / 2], [rc(4), rc(8)], [rc(2), rc(8)], [rc(2), rc(4)], [rc(3), rc(4)], [rc(3), rc(4) + STEP / 2]],
      stops: [{ x: rc(4) + 3.0, z: rc(7) + STEP / 2 + 1, ry: W, name: 'PARADA SUL' }, { x: rc(3) + 3.0, z: rc(4) + STEP / 2 - 1, ry: W, name: 'PARADA CENTRO' }],
      wait: 4, start: 0.8 },
  ];
  const lines = defs.map(d => Object.assign(makeLine(d.P), { stops: d.stops, wait: d.wait, start: d.start }));
  // cruzamentos entre percursos (pontos onde os trilhos de dois bondes se encontram)
  const crossings = [];
  for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
    for (let sa = 0; sa < lines[a].S; sa += 0.5) {
      const p = lines[a].at(sa);
      for (let sb = 0; sb < lines[b].S; sb += 0.5) {
        const q = lines[b].at(sb);
        if (Math.hypot(p.x - q.x, p.z - q.z) < 0.4 && !crossings.some(c => c.a === a && c.b === b && Math.abs(c.sa - sa) < 6)) crossings.push({ a, b, sa, sb, x: p.x, z: p.z });
      }
    }
  }
  // trechos de rua ocupados pelos trilhos (sem bloqueios sorteados neles)
  const route = new Set();
  for (const l of lines) for (let s = 0; s < l.S; s += 1) {
    const p = l.at(s);
    for (let i = 0; i <= GRID; i++) {
      const j = Math.floor((p.x - rc(0)) / STEP);
      if (Math.abs(p.z - rc(i)) < hr && j >= 0 && j < GRID) route.add('H,' + j + ',' + i);
      const k = Math.floor((p.z - rc(0)) / STEP);
      if (Math.abs(p.x - rc(i)) < hr && k >= 0 && k < GRID) route.add('V,' + i + ',' + k);
    }
  }
  RAIL = { lines, crossings, reserved: [], stops: lines.flatMap(l => l.stops), route: [...route] };
}

// ---- Nível 12 (Veneza), estrutura fixa (desenho do dono): casas nas bordas e em alguns pontos; uma faixa larga de água
// em diagonal (noroeste → sudeste); duas praças em L, simétricas (laranja = pedregulhos, roxo = mesas com sombrinhas,
// verde = café/restaurante); a Ponte de Rialto em diagonal ligando as duas praças; entrada da lancha no canto sudeste.
// Linhas de cima para baixo (0 = norte), colunas da esquerda para a direita (0 = oeste). Só as casas mudam a cada partida.
function setupVenice(kind) {
  if (kind !== 'venice8') { VENICE = null; return; }
  const rc = roadCenter, hr = ROAD / 2, X = lotX, Z = lotZ, L = LOT;
  const HOUSE = ['########', '#..##..#', '#......#', '##....##', '##....##', '#......#', '#..##..#', '#######.'];
  const houses = [];
  HOUSE.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') houses.push(r * 8 + c); }));
  // praças: só as 6 quadras de cada lado se ligam (3 de pedregulho, 2 de mesas, 1 café), com as ruas entre elas
  const rect = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });
  const plazaNE = [rect(X(5), Z(1), X(6) + L, Z(2) + L), rect(X(4), Z(2), X(5) + L, Z(2) + L), rect(X(5), Z(2), X(5) + L, Z(3) + L)];
  const plazaSW = [rect(X(1), Z(5), X(2) + L, Z(6) + L), rect(X(2), Z(5), X(3) + L, Z(5) + L), rect(X(2), Z(4), X(2) + L, Z(5) + L)];
  const zones = {                                           // laranja / roxo / verde (quadras)
    orange: [[2, 4], [2, 5], [3, 5], [4, 2], [5, 2], [5, 3]], purple: [[1, 5], [2, 6], [5, 1], [6, 2]], green: [[1, 6], [6, 1]] };
  // cafés: maiores e girados na diagonal, alinhados com a ponte (comprimento ao longo da direção da Rialto)
  const cafes = zones.green.map(([r, c]) => ({ cx: X(c) + L / 2, cz: Z(r) + L / 2, w: 15, d: 8.5, ang: Math.PI / 4 }));
  // Rialto: diagonal da quina interna do L nordeste até a quina interna do L sudoeste
  const A = { x: X(5), z: Z(2) + L }, B = { x: X(2) + L, z: Z(5) }, len = Math.hypot(B.x - A.x, B.z - A.z);
  const rialto = { cx: (A.x + B.x) / 2, cz: (A.z + B.z) / 2, ux: (B.x - A.x) / len, uz: (B.z - A.z) / len, len: len + 6, w: 9, rise: 6.2 };
  // pontes menores (atravessam canais verticais entre duas quadras vizinhas): casa↔casa e praça↔casa
  const bridges = [[0, 2], [0, 6], [7, 3], [7, 5], [1, 4], [6, 4], [6, 3], [1, 5]].map(([i, j]) => ({ x0: rc(j) - hr - 0.4, x1: rc(j) + hr + 0.4, z: Z(i) + 14.6, w: 2.6, rise: 2.5 }));
  const LAND = 0.15;
  const onRialto = (x, z) => { const dx = x - rialto.cx, dz = z - rialto.cz, a = dx * rialto.ux + dz * rialto.uz, b = -dx * rialto.uz + dz * rialto.ux;
    return Math.abs(b) < rialto.w / 2 && Math.abs(a) < rialto.len / 2 ? (a + rialto.len / 2) / rialto.len : -1; };
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const walkH = (x, z) => {
    const t = onRialto(x, z); if (t >= 0) return LAND + rialto.rise * 4 * t * (1 - t);
    for (const b of bridges) if (Math.abs(z - b.z) < b.w / 2 && x > b.x0 && x < b.x1) { const u = (x - b.x0) / (b.x1 - b.x0); return LAND + b.rise * 4 * u * (1 - u); }
    return LAND;
  };
  // onde dá para andar: ilhas das casas, praças, pontes (o resto é água)
  const walkable = (x, z) => {
    if (onRialto(x, z) >= 0 || piers.some(p => inR(p, x, z))) return true;
    for (const b of bridges) if (Math.abs(z - b.z) < b.w / 2 && x > b.x0 && x < b.x1) return true;
    if (plazaNE.concat(plazaSW).some(r => inR(r, x, z, 0.3))) return !cafes.some(cf => { const dx = x - cf.cx, dz = z - cf.cz, ca = Math.cos(cf.ang), sa = Math.sin(cf.ang);
      return Math.abs(dx * ca - dz * sa) < cf.w / 2 + 0.3 && Math.abs(dx * sa + dz * ca) < cf.d / 2 + 0.3; });
    return houses.some(s => inR({ x0: X(s % 8), z0: Z(Math.floor(s / 8)), x1: X(s % 8) + L, z1: Z(Math.floor(s / 8)) + L }, x, z, 0.3));
  };
  // píeres de atracação (nas placas "ATRACAR AQUI"): deck de madeira entrando na água, poste na ponta e a pose da lancha atracada
  const piers = [
    { x0: X(4) + 5, x1: X(4) + 8, z0: Z(2) + L - 0.2, z1: Z(2) + L + 7, post: { x: X(4) + 8.25, z: Z(2) + L + 6.7 }, dock: { x: X(4) + 8 + 1.5, z: Z(2) + L + 3.6, heading: Math.PI / 2 } },
    { x0: X(3) + L - 8, x1: X(3) + L - 5, z0: Z(5) - 7, z1: Z(5) + 0.2, post: { x: X(3) + L - 8.25, z: Z(5) - 6.7 }, dock: { x: X(3) + L - 8 - 1.5, z: Z(5) - 3.6, heading: -Math.PI / 2 } },
  ];
  const tag = {}; [12, 30].forEach(s => { tag[s] = 'loc:rialto'; }); [33, 51].forEach(s => { tag[s] = 'loc:rialto'; });
  [6, 15, 57, 48].forEach(s => { tag[s] = 'loc:cafe'; });
  VENICE = { piers, houses, nonHouse: [...Array(64).keys()].filter(s => !houses.includes(s)), plazaNE, plazaSW, zones, cafes, rialto, bridges,
    walkH, walkable, LAND, tags: tag, footOnly: [], start: { x: X(7) + L / 2, z: Z(7) + L / 2, heading: -3 * Math.PI / 4 } };
}

/** Etiquetas de lugar de um lote (Bairro 9): parte mais alta, depois da subida, ao lado da escadaria. */
const RAIL_TAGS = { 1: 'loc:stopN', 2: 'loc:stopN', 36: 'loc:stopS', 52: 'loc:stopS', 16: 'loc:stopW', 17: 'loc:stopW', 46: 'loc:stopE', 47: 'loc:stopE', 59: 'loc:stopSul', 60: 'loc:stopSul', 34: 'loc:stopC', 35: 'loc:stopC' };
export function slotPlaceTags(s) {
  if (VENICE) return VENICE.tags[s] ? [VENICE.tags[s]] : [];
  if (RAIL) return RAIL_TAGS[s] ? [RAIL_TAGS[s]] : [];
  if (TERRAIN.kind !== 'hill') return [];
  const r = Math.floor(s / GRID), c = s % GRID, out = [];
  if (r >= 6 && c >= 4) out.push('loc:top');
  for (const rp of TERRAIN.ramps) if (r === rp.i && (c === rp.j - 1 || c === rp.j)) out.push('loc:ramp');   // a rua da frente passa no topo da ladeira
  for (const st of TERRAIN.stairs) if ((r === st.i || r === st.i - 1) && (c === st.j - 1 || c === st.j)) out.push('loc:stairs');
  return [...new Set(out)];
}
/** Grafo de ruas: trechos fechados de vez (paredes, canal, galpões), nós que não existem e trechos onde não pode haver bloqueio. */
export function roadTopology() {
  const blocked = new Set(), skip = new Set(), exclude = new Set(), k = (...a) => a.join(',');
  if (TERRAIN.kind === 'hill') {
    const rampAt = (j, i) => TERRAIN.ramps.some(r => r.j === j && r.i === i);
    for (let j = 0; j <= GRID; j++) if (!rampAt(j, 4)) blocked.add(k('V', j, 4));
    for (let j = 5; j <= GRID; j++) if (!rampAt(j, 6)) blocked.add(k('V', j, 6));
    blocked.add(k('H', 4, 7, 'L')); blocked.add(k('H', 4, 8, 'L'));
    for (const r of TERRAIN.ramps) exclude.add(k('V', r.j, r.i));
  }
  if (CANAL) {
    for (let i = 0; i < GRID; i++) blocked.add(k('V', 4, i));
    for (let i = 0; i <= GRID; i++) {
      if (CANAL.bridges.includes(i)) { exclude.add(k('H', 3, i)); exclude.add(k('H', 4, i)); continue; }
      for (const j of [3, 4]) { blocked.add(k('H', j, i, 'L')); blocked.add(k('H', j, i, 'R')); exclude.add(k('H', j, i)); }
      skip.add(k('I', 4, i)); skip.add(k('M', 3, i)); skip.add(k('M', 4, i));
    }
  }
  if (RAIL) for (const k2 of RAIL.route) exclude.add(k2);   // Bairro 11: nenhum bloqueio sobre os trilhos do bondinho
  for (const w of WARE_LIST) { const c = w.slots[0] % GRID, r = Math.floor(w.slots[0] / GRID); blocked.add(k('V', c + 1, r)); exclude.add(k('V', c + 1, r)); }
  return { blocked, skip, exclude, heightAt: TERRAIN.h };
}

function rebuildBaseSolids() {
  SOLIDS.length = 0;
  for (const s of HOUSE_SLOTS) {
    const o = slotOrigin(s), ware = WARE_LIST.some(w => w.slots[0] === s);
    SOLIDS.push({ x0: o.x - WALK, z0: o.z - WALK, x1: o.x + (ware ? LOT * 2 + ROAD : LOT) + WALK, z1: o.z + LOT + WALK });   // o galpão cobre os 2 lotes
  }
  if (PLAZA) SOLIDS.push({ x0: PLAZA.x0, z0: PLAZA.z0, x1: PLAZA.x1, z1: PLAZA.z1 });   // a van não entra na praça
  for (const g of GAS_LIST) {                                                        // postos: a van entra
    const o = slotOrigin(g.slots[0]);
    for (const [x0, z0, x1, z1] of GAS_PARTS) SOLIDS.push({ x0: o.x + x0, z0: o.z + z0, x1: o.x + x1, z1: o.z + z1 });
  }
  // sebe: norte em dois pedaços (a entrada fica aberta — dá para sair e passear pelo mundo), sul, oeste e leste
  SOLIDS.push(
    { x0: -0.5, z0: -0.5, x1: ENTRANCE.x0, z1: HEDGE },
    { x0: ENTRANCE.x1, z0: -0.5, x1: MAP + 0.5, z1: HEDGE },
    { x0: -0.5, z0: MAP - HEDGE, x1: MAP + 0.5, z1: MAP + 0.5 },
    { x0: -0.5, z0: -0.5, x1: HEDGE, z1: MAP + 0.5 },
    { x0: MAP - HEDGE, z0: -0.5, x1: MAP + 0.5, z1: MAP + 0.5 },
  );
  const hr = ROAD / 2, rc = roadCenter;
  if (CANAL) {                                     // canal: água em toda a faixa, menos nas 3 pontes; passarelas só a pé (vanOnly)
    const marks = CANAL.bridges.map(i => ({ a: rc(i) - hr, b: rc(i) + hr, foot: false }))
      .concat(CANAL.foot.map(z => ({ a: z - 1.3, b: z + 1.3, foot: true }))).sort((p, q) => p.a - q.a);
    let z = HEDGE;
    for (const m of marks) {
      if (m.a > z) SOLIDS.push({ x0: CANAL.x0, x1: CANAL.x1, z0: z, z1: m.a });
      if (m.foot) SOLIDS.push({ x0: CANAL.x0, x1: CANAL.x1, z0: m.a, z1: m.b, vanOnly: true });
      z = m.b;
    }
    SOLIDS.push({ x0: CANAL.x0, x1: CANAL.x1, z0: z, z1: MAP - HEDGE });
  }
  if (VENICE) {                                    // Veneza: as praças são só a pé (a lancha não sobe)
    SOLIDS.push({ x0: ENTRANCE.x0, x1: ENTRANCE.x1, z0: -0.5, z1: HEDGE });   // sem a abertura do norte (a entrada é no sudeste)
    for (const p of VENICE.piers) SOLIDS.push({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, vanOnly: true });   // a lancha não atravessa o píer
    for (const r of VENICE.plazaNE.concat(VENICE.plazaSW)) SOLIDS.push({ x0: r.x0 - WALK, z0: r.z0 - WALK, x1: r.x1 + WALK, z1: r.z1 + WALK, vanOnly: true });
  }
  if (TERRAIN.kind === 'hill') {                   // muros das encostas (nas ladeiras não há muro; nas escadarias, só para a van)
    const isRamp = (j, i) => TERRAIN.ramps.some(r => r.j === j && r.i === i), isStair = (j, i) => TERRAIN.stairs.some(r => r.j === j && r.i === i);
    const wall = (j, i, top) => { const z = top ? rc(i + 1) - hr : rc(i) + hr; SOLIDS.push({ x0: rc(j) - hr, x1: rc(j) + hr, z0: z - 0.3, z1: z + 0.3, vanOnly: isStair(j, i) }); };
    for (let j = 0; j <= GRID; j++) if (!isRamp(j, 4)) { wall(j, 4, false); if (isStair(j, 4)) wall(j, 4, true); }
    for (let j = 5; j <= GRID; j++) if (!isRamp(j, 6)) { wall(j, 6, false); if (isStair(j, 6)) wall(j, 6, true); }
    const xb = rc(4) + hr;
    for (const i of [7, 8]) SOLIDS.push({ x0: xb - 0.3, x1: xb + 0.3, z0: rc(i) - hr, z1: rc(i) + hr });
  }
}
configureGrid('grid4');

// limite do mundo; ao sul vai bem mais longe, até depois da igreja do Bairro 1 (o gramado vai até ~2000 do centro)
export const BOUNDS = { min: -680, max: 110 + 680, zMax: 110 + 1500 };

// ---- Pontos de referência DENTRO do lote (coordenadas locais: origem no canto noroeste, 0..LOT) ----
export const LOT_ANCHORS = {
  // paredes da casa; cumeeira do telhado de duas águas corre ao longo de X; fachada (porta) em z = house.z1
  house: { x0: 4.1, x1: 13.1, z0: 1.5, z1: 8.5 },
  wallHeight: 3.0,
  roofOverhang: 0.5,
  roofRise: 2.2,                  // altura da cumeeira acima do topo das paredes
  doorX: 8.6,                     // porta centralizada na fachada sul
  path: { x0: 7.9, x1: 9.3 },     // caminho de pedras da porta (z = 8.5) até o portão (z = LOT)
  yardSlots: [{ x: 4.0, z: 12.8 }, { x: 13.4, z: 12.8 }], // quintal da frente: esquerda, direita (itens cabem em ~4.2 × 4.2)
  bikeZ: 15.2,                    // bicicleta fica encostada na cerca da frente, no slot dela (x do slot)
  mailbox: { x: 11.0, z: 16.3 },  // caixa de correio, logo à direita do portão, dentro do lote
  fenceInset: 0.25,               // cerca a 0.25 da borda do lote
  gate: { x0: 7.2, x1: 10.0 },    // abertura do portão na cerca da frente (z ≈ LOT - fenceInset)
  missingBoardX: 3.3,             // onde falta a tábua na cerca da frente (casas com 'fence')
  residentSpot: { x: 8.6, z: 15.4 }, // onde o morador aparece durante o diálogo (no caminho, junto ao portão)
};

// Ponto de entrega (coordenadas locais): na rua, logo ao sul do portão.
export const DOOR_POINT_LOCAL = { x: LOT_ANCHORS.doorX, z: LOT + 2.6 };
export const DELIVERY_RADIUS = 6.0;    // distância máx. do centro da van ao ponto de entrega
export const DELIVERY_MAX_SPEED = 3.5; // "quase parado"
export const doorPoint = slot => { const o = slotOrigin(slot); return { x: o.x + DOOR_POINT_LOCAL.x, z: o.z + DOOR_POINT_LOCAL.z }; };
