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
export let RAIL = null;          // Bairro 11: ferrovia em L (rua lateral oeste → curva → linha 6), 2 estações e 2 passagens de nível
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
// ---- Bairro 11 (Trilhos): os trilhos descem pela rua lateral oeste (rua 0) desde a estação da entrada (lote 0, canto
// noroeste), fazem uma curva suave no lote 48 e seguem para leste pela linha 6 até a estação dos galpões (lote 50).
// Passagens de nível com cancelas nas ruas verticais 1 e 2. `at(s)`: ponto e direção a `s` do começo (norte).
function setupRail(kind) {
  if (kind !== 'rail8') { RAIL = null; return; }
  const rc = roadCenter, R = 10, zc = lotZ(6) + LOT / 2, x0 = rc(0), zN = HEDGE + 2.4, xE = lotX(2) + LOT - 0.6;
  const a = zc - R - zN, arc = Math.PI * R / 2, b = xE - (x0 + R);
  const at = s => {
    if (s <= a) return { x: x0, z: zN + s, dx: 0, dz: 1 };
    s -= a;
    if (s <= arc) { const t = s / R; return { x: x0 + R - R * Math.cos(t), z: zc - R + R * Math.sin(t), dx: Math.sin(t), dz: Math.cos(t) }; }
    s -= arc; return { x: x0 + R + s, z: zc, dx: 1, dz: 0 };
  };
  RAIL = { R, zc, x0, zN, xE, S: a + arc + b, at, reserved: [0, 48, 49, 50],
    crossings: [1, 2].map(j => ({ j, x: rc(j), s: a + arc + rc(j) - (x0 + R) })) };
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
  // praças (com as ruas entre as quadras delas; inclui a rua da frente das casas 12 e 33, que viram entregas a pé)
  const rect = (x0, z0, x1, z1) => ({ x0, z0, x1, z1 });
  const plazaNE = [rect(X(5), Z(1), X(6) + L, Z(2) + L), rect(X(4), Z(2), X(5) + L, Z(2) + L), rect(X(5), Z(2), X(5) + L, Z(3) + L), rect(X(4), rc(2) - hr, X(4) + L, Z(2))];
  const plazaSW = [rect(X(1), Z(5), X(2) + L, Z(6) + L), rect(X(2), Z(5), X(3) + L, Z(5) + L), rect(X(2), Z(4), X(2) + L, Z(5) + L), rect(X(1), rc(5) - hr, X(1) + L, Z(5))];
  const zones = {                                           // laranja / roxo / verde (quadras)
    orange: [[2, 4], [2, 5], [3, 5], [4, 2], [5, 2], [5, 3]], purple: [[1, 5], [2, 6], [5, 1], [6, 2]], green: [[1, 6], [6, 1]] };
  const cafes = zones.green.map(([r, c]) => rect(X(c) + 2.5, Z(r) + 1.5, X(c) + L - 2.5, Z(r) + 9.5));
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
    if (onRialto(x, z) >= 0) return true;
    for (const b of bridges) if (Math.abs(z - b.z) < b.w / 2 && x > b.x0 && x < b.x1) return true;
    if (plazaNE.concat(plazaSW).some(r => inR(r, x, z, 0.3))) return !cafes.some(r => inR(r, x, z));
    return houses.some(s => inR({ x0: X(s % 8), z0: Z(Math.floor(s / 8)), x1: X(s % 8) + L, z1: Z(Math.floor(s / 8)) + L }, x, z, 0.3));
  };
  const tag = {}; [12, 30].forEach(s => { tag[s] = 'loc:rialto'; }); [33, 51].forEach(s => { tag[s] = 'loc:rialto'; });
  [6, 15, 57, 48].forEach(s => { tag[s] = 'loc:cafe'; });
  VENICE = { houses, nonHouse: [...Array(64).keys()].filter(s => !houses.includes(s)), plazaNE, plazaSW, zones, cafes, rialto, bridges,
    walkH, walkable, LAND, tags: tag, footOnly: [12, 33], start: { x: X(7) + L / 2, z: Z(7) + L / 2, heading: -3 * Math.PI / 4 } };
}

/** Etiquetas de lugar de um lote (Bairro 9): parte mais alta, depois da subida, ao lado da escadaria. */
const RAIL_TAGS = { 1: 'loc:stationN', 8: 'loc:stationN', 42: 'loc:stationS', 51: 'loc:stationS', 58: 'loc:stationS',
  40: 'loc:crossing', 41: 'loc:crossing', 56: 'loc:crossing', 57: 'loc:crossing' };
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
  if (RAIL) {                                      // rua 0 (oeste) é a ferrovia; as ruas que chegavam nela terminam antes
    for (let i = 0; i <= 6; i++) {
      blocked.add(k('H', 0, i, 'L')); blocked.add(k('V', 0, i)); skip.add(k('I', 0, i));
      exclude.add(k('H', 0, i)); exclude.add(k('V', 0, i));
    }
    for (const c of RAIL.crossings) exclude.add(k('V', c.j, 6));   // passagens de nível: sem bloqueio (as cancelas abrem)
  }
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
    for (const r of VENICE.plazaNE.concat(VENICE.plazaSW)) SOLIDS.push({ x0: r.x0 - WALK, z0: r.z0 - WALK, x1: r.x1 + WALK, z1: r.z1 + WALK, vanOnly: true });
  }
  if (RAIL) {                                      // ferrovia: faixa da rua 0 (até depois da curva) e os lotes dos trilhos/estações
    SOLIDS.push({ x0: HEDGE - 0.2, x1: rc(0) + hr + 0.2, z0: HEDGE, z1: RAIL.zc - 1.6 });
    for (const s of RAIL.reserved) { const o = slotOrigin(s); SOLIDS.push({ x0: o.x - WALK, z0: o.z - WALK, x1: o.x + LOT + WALK, z1: o.z + LOT + WALK }); }
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
