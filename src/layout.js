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
  GRID = kind === 'plaza6' || kind === 'grid6s' || kind === 'city6' ? 6 : kind === 'grid5' ? 5 : 4;
  BUILD_H = kind === 'city6' ? 16.5 : 9.2;
  // praça: bloco 2×2 central (linhas e colunas 2–3 do 6×6)
  const plazaSlots = kind === 'plaza6' ? [2 * GRID + 2, 2 * GRID + 3, 3 * GRID + 2, 3 * GRID + 3] : [];
  ENTRANCE.road = Math.floor(GRID / 2);            // rua do meio (no 5×5, a 3ª rua: nenhuma cai no centro exato)
  ENTRANCE.x0 = roadCenter(ENTRANCE.road) - ROAD / 2;
  ENTRANCE.x1 = roadCenter(ENTRANCE.road) + ROAD / 2;
  VAN_START.x = roadCenter(ENTRANCE.road);
  MAP = HEDGE * 2 + ROAD * (GRID + 1) + LOT * GRID;
  HOUSE_SLOTS = [...Array(GRID * GRID).keys()].filter(s => !plazaSlots.includes(s));
  PLAZA = plazaSlots.length
    ? { slots: plazaSlots, x0: lotX(2) - WALK, z0: lotZ(2) - WALK, x1: lotX(3) + LOT + WALK, z1: lotZ(3) + LOT + WALK }
    : null;
  GAS_LIST = [];
  rebuildBaseSolids();
}

/** Bairros 4 e 5: coloca um posto em cada par de lotes de `list` ([s, s+1], mesma linha; [] = nenhum). Refaz os obstáculos-base. */
export function setGasStations(list) {
  const all = [...Array(GRID * GRID).keys()].filter(s => !(PLAZA && PLAZA.slots.includes(s)));
  GAS_LIST = (list || []).map(slots => {
    const a = slotOrigin(slots[0]), b = slotOrigin(slots[1]);
    return { slots, x0: a.x - WALK, z0: a.z - WALK, x1: b.x + LOT + WALK, z1: a.z + LOT + WALK };
  });
  HOUSE_SLOTS = all.filter(s => !GAS_LIST.some(g => g.slots.includes(s)));
  rebuildBaseSolids();
}

function rebuildBaseSolids() {
  SOLIDS.length = 0;
  for (const s of HOUSE_SLOTS) {
    const o = slotOrigin(s);
    SOLIDS.push({ x0: o.x - WALK, z0: o.z - WALK, x1: o.x + LOT + WALK, z1: o.z + LOT + WALK });
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
}
configureGrid('grid4');

// limite do mundo (o gramado vai até ~800 unidades do centro)
export const BOUNDS = { min: -680, max: 110 + 680 };

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
