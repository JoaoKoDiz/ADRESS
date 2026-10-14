// Dados fixos do jogo: as 16 casas, frases das pistas e falas dos moradores.
// Cada casa mantém a identidade entre rodadas; só a posição nos lotes muda.

export const ROOF_COL = { red: '#d8473a', blue: '#3a78d4', green: '#3c9d55', yellow: '#efbf2a', purple: '#8a55c4', gray: '#8b9099' };
export const DOOR_COL = { yellow: '#ffcc00', red: '#e3262e', pink: '#ff6fb5', teal: '#16c6c0' };
export const DOOR_DEFAULT = '#6b4428';
export const WALL_COL = '#efe3cc';

// f: objetos da casa. 'mailbox' = caixa de correio TORTA; 'fence' = cerca com uma tábua faltando.
// Casas sem esses dois itens também têm caixa de correio (reta) e cerca (inteira).
export const HOUSES = [
  { name: 'Seu Juca',     roof: 'red',    f: ['chimney', 'sunflowers', 'doghouse'] },
  { name: 'Dona Cida',    roof: 'blue',   f: ['dish', 'flamingo'] },
  { name: 'Seu Bené',     roof: 'green',  f: ['solar', 'trampoline'] },
  { name: 'Dona Lurdes',  roof: 'yellow', f: ['tank', 'clothesline', 'gnome'] },
  { name: 'Tio Zeca',     roof: 'purple', f: ['rooster', 'fruit'] },
  { name: 'Dona Neide',   roof: 'gray',   door: 'teal', f: ['kite', 'tires'] },
  { name: 'Seu Arlindo',  roof: 'red',    f: ['patch', 'bike', 'mailbox'] },
  { name: 'Dona Zuleica', roof: 'blue',   f: ['chimney', 'pool', 'ballbush'] },
  { name: 'Seu Valdir',   roof: 'green',  door: 'yellow', f: ['cactus', 'flamingo'] },
  { name: 'Dona Marlene', roof: 'yellow', f: ['dish', 'swing', 'mailbox'] },
  { name: 'Seu Osvaldo',  roof: 'purple', door: 'red', f: ['bare', 'fence'] },
  { name: 'Dona Filó',    roof: 'gray',   f: ['solar', 'fountain', 'gnome'] },
  { name: 'Seu Tonho',    roof: 'red',    f: ['tank', 'trampoline', 'fountain'] },   // 2ª fonte do bairro (missão "Fonte Errada")
  { name: 'Dona Célia',   roof: 'blue',   door: 'pink', f: ['kite', 'fruit'] },
  { name: 'Seu Dito',     roof: 'green',  f: ['chimney', 'clothesline', 'fence'] },
  { name: 'Dona Rosa',    roof: 'yellow', f: ['rooster', 'ballbush', 'bike'] },
  // casas extras do Bairro 2 (grade 6×6 com praça central): só aparecem nesse bairro
  { name: 'Seu Jaime',    roof: 'gray',   door: 'yellow', f: ['dish', 'doghouse', 'cactus'] },
  { name: 'Dona Bia',     roof: 'purple', f: ['solar', 'pool', 'sunflowers'] },
  { name: 'Seu Lima',     roof: 'green',  door: 'pink', f: ['kite', 'swing'] },
  { name: 'Dona Lena',    roof: 'red',    door: 'teal', f: ['rooster', 'clothesline', 'flamingo'] },
  { name: 'Seu Nico',     roof: 'yellow', f: ['patch', 'tires', 'bare'] },
  { name: 'Seu Zé',       roof: 'blue',   f: ['tank', 'cactus', 'tires'] },
  { name: 'Dona Fátima',  roof: 'green',  door: 'red', f: ['rooster', 'gnome'] },
  { name: 'Seu Chico',    roof: 'purple', f: ['chimney', 'doghouse', 'bike'] },
  { name: 'Dona Nair',    roof: 'yellow', door: 'pink', f: ['solar', 'fountain'] },
  { name: 'Seu Bento',    roof: 'gray',   f: ['kite', 'trampoline', 'sunflowers'] },
  { name: 'Dona Iara',    roof: 'red',    f: ['dish', 'ballbush', 'clothesline'] },
  { name: 'Seu Quim',     roof: 'blue',   door: 'yellow', f: ['patch', 'swing'] },
  { name: 'Dona Tereza',  roof: 'purple', door: 'teal', f: ['tank', 'flamingo', 'fruit'] },
  { name: 'Seu Ramiro',   roof: 'green',  f: ['dish', 'bare', 'mailbox'] },
  { name: 'Dona Cotinha', roof: 'gray',   door: 'red', f: ['chimney', 'pool'] },
  { name: 'Seu Durval',   roof: 'yellow', f: ['kite', 'gnome', 'fence'] },
  // prédios comerciais de 2 andares (Bairro 5): mesmo desenho, só 3 coisas mudam — cor do toldo, fachada e o que há no topo
  { name: 'Seu Manoel',   kind: 'shop', awning: 'red',    facade: 'brick', top: 'ac' },
  { name: 'Dona Glória',  kind: 'shop', awning: 'blue',   facade: 'white', top: 'billboard' },
  { name: 'Seu Jorge',    kind: 'shop', awning: 'green',  facade: 'mint',  top: 'antenna' },
  { name: 'Dona Vera',    kind: 'shop', awning: 'yellow', facade: 'white', top: 'ac' },
  { name: 'Seu Alcides',  kind: 'shop', awning: 'red',    facade: 'mint',  top: 'billboard' },
  { name: 'Dona Socorro', kind: 'shop', awning: 'blue',   facade: 'brick', top: 'antenna' },
];
export const SHOP_FIRST = 32;                       // índice do primeiro prédio comercial em HOUSES
export const AWNING_COL = { red: '#d8473a', blue: '#3a78d4', green: '#3c9d55', yellow: '#efbf2a' };
export const FACADE_COL = { brick: '#b5653f', white: '#f4f1ea', mint: '#a8dcc0' };

// ---- Prédios residenciais (Bairro 6, a cidade): altos e acinzentados; variam como as casas ----
// sacadas (cor do guarda-corpo) + terraço + às vezes algo na fachada e/ou no térreo (2 a 4 características)
export const APT_FIRST = 38;                        // índice do primeiro prédio residencial em HOUSES
export const BALCONY_COL = { red: '#d8473a', blue: '#3a78d4', yellow: '#efbf2a', green: '#3c9d55' };
export const APT_GRAYS = ['#9ea2a9', '#aeb1b6', '#8f939a', '#b8bbbf'];
{
  const names = ['Seu Rui', 'Dona Marta', 'Seu Caio', 'Dona Íris', 'Seu Otávio', 'Dona Lúcia', 'Seu Fábio', 'Dona Rita',
    'Seu Hélio', 'Dona Sônia', 'Seu Mauro', 'Dona Eva', 'Seu Raul', 'Dona Clara', 'Seu Gilson', 'Dona Joana',
    'Seu Paulo', 'Dona Alice', 'Seu Edson', 'Dona Diva', 'Seu Ivo', 'Dona Laura', 'Seu Nelson', 'Dona Olga',
    'Seu Breno', 'Dona Zezé', 'Seu Vitor', 'Dona Cecília'];
  const B = ['red', 'blue', 'yellow', 'green'], T = ['tank', 'antenna', 'garden', 'solar', 'pool'];
  const E = ['fac:clothes', 'gnd:dumpster', 'fac:plants', 'gnd:moto', 'fac:ac', 'gnd:guard', 'fac:mural', 'gnd:bikes'];
  const list = [];
  // 20 combinações sacada × terraço, quase todas com um detalhe a mais
  for (let i = 0; i < 20; i++) list.push({ balcony: B[i % 4], atop: T[Math.floor(i / 4)], extra: i % 3 === 2 ? [] : [E[i % 8]] });
  // mais 8 que repetem sacada + terraço de outro prédio, mas com outros detalhes
  for (let i = 0; i < 8; i++) {
    const base = list[[0, 1, 3, 4, 6, 7, 9, 10][i]];   // só prédios que já têm um detalhe próprio
    const ex = [E[(i * 2 + 3) % 8], E[(i * 2 + 6) % 8]].filter((e, k, a) => a.indexOf(e) === k && !base.extra.includes(e));
    list.push({ balcony: base.balcony, atop: base.atop, extra: ex.slice(0, 1 + (i % 2)) });
  }
  list.forEach((a, i) => HOUSES.push({ name: names[i], kind: 'apt', balcony: a.balcony, atop: a.atop, extra: a.extra, gray: APT_GRAYS[i % 4] }));
}

// mais prédios comerciais (o Bairro 5 tem de 5 a 8 por partida); vêm depois dos residenciais para não mudar os índices
HOUSES.push(
  { name: 'Seu Lauro',     kind: 'shop', awning: 'green',  facade: 'brick', top: 'billboard' },
  { name: 'Dona Odete',    kind: 'shop', awning: 'yellow', facade: 'mint',  top: 'antenna' },
  { name: 'Seu Damião',    kind: 'shop', awning: 'red',    facade: 'white', top: 'antenna' },
  { name: 'Dona Iolanda',  kind: 'shop', awning: 'blue',   facade: 'mint',  top: 'ac' },
);
// ---- Prédios futuristas (Bairro 8): 4 cores de neon × 4 coroas = 16, depois dos comerciais (índices 70–85) ----
export const GLOW_COL = { cyan: '#19e3ff', magenta: '#ff3fd0', lime: '#9dff3a', amber: '#ffb02e' };
{
  const names = ['Dr. Orion', 'Dra. Vega', 'Seu Nexus', 'Dona Lyra', 'Seu Quark', 'Dona Nova', 'Seu Atlas', 'Dona Zênite',
    'Seu Pixel', 'Dona Ártemis', 'Seu Vector', 'Dona Íris-7', 'Seu Cosmo', 'Dona Aurora', 'Seu Ion', 'Dona Stella'];
  const GL = ['cyan', 'magenta', 'lime', 'amber'], CR = ['spire', 'ring', 'dish', 'orb'];
  for (let i = 0; i < 16; i++) HOUSES.push({ name: names[i], kind: 'fut', glow: GL[i % 4], crown: CR[Math.floor(i / 4)], tone: (i + Math.floor(i / 4)) % 2 });
}
/** Índices dos prédios futuristas em HOUSES. */
export const FUTS = [...Array(16).keys()].map(k => 70 + k);
/** Índices de todos os prédios comerciais em HOUSES. */
export const SHOPS = [32, 33, 34, 35, 36, 37, 66, 67, 68, 69];

// ---- Casa fixa do Bairro 1 (índice 86): sempre no canto mais longe da entrada, à esquerda de quem entra (lote 15) ----
// yardZ: posição própria de um item do quintal (a árvore sem folhas fica mais perto da casa, deixando a frente livre)
// reader: cadeira de balanço com ele lendo jornal no espaço livre do quintal (lado direito, na frente da árvore).
// narrator: ele não atende a porta; as falas das entregas nessa casa são pensamentos do narrador, entre parênteses.
HOUSES.push({ name: 'K', roof: 'red', f: ['rooster', 'sunflowers', 'bare'], yardZ: { bare: 11.0 },
  reader: { x: 15.0, z: 14.2, rot: -2.2 }, narrator: true });
// ---- Prédio fixo do Bairro 6 (índice 87): sempre na quadra C5 (lote 16). No terraço, a 2ª espreguiçadeira recebe o
// K (só depois da conversa do Bairro 1): `lounger`.
HOUSES.push({ name: 'Dona Ivone', kind: 'apt', balcony: 'red', atop: 'pool', extra: ['fac:plants', 'gnd:moto'], gray: '#9ea2a9', lounger: true });
/** Bairro 6: { lote: prédio } sempre iguais em todas as partidas (C5 = linha C, coluna 5, contando do canto à direita da entrada). */
export const L6_FIXED = { 16: 87 };
/** Bairro 1: { lote: casa } sempre iguais em todas as partidas. */
export const L1_FIXED = { 15: 86 };

// ---- Galpões (Bairro 10, índices 88–103): 4 cores de telhado × 4 de portão (cada par é único) + itens na área de carga ----
{
  const names = ['Seu Tavares', 'Dona Rute', 'Seu Gervásio', 'Dona Cleusa', 'Seu Amaro', 'Dona Filó', 'Seu Ozório', 'Dona Lena',
    'Seu Bráulio', 'Dona Marta', 'Seu Quirino', 'Dona Socorro', 'Seu Valter', 'Dona Isaura', 'Seu Nonato', 'Dona Jandira'];
  const R = ['red', 'blue', 'green', 'gray'], GT = ['blue', 'red', 'yellow', 'green'];
  const IT = [['pallets'], ['forklift'], ['truck'], ['barrels'], ['pallets', 'forklift'], ['truck', 'barrels'], ['forklift', 'barrels'], ['pallets', 'truck']];
  for (let i = 0; i < 16; i++) HOUSES.push({ name: names[i], kind: 'ware', wroof: R[i % 4], gate: GT[(i + Math.floor(i / 4)) % 4], items: IT[(i * 3) % 8] });
}
/** Índices dos galpões em HOUSES. */
export const WARES = [...Array(16).keys()].map(k => 88 + k);
// ---- Casas gêmeas (Bairro 10, índices 104–109): cópias das casas abaixo, sempre do outro lado do canal ----
const TWIN_OF = [0, 1, 2, 6, 13, 9];
const TWIN_NAMES = ['Seu Juvenal', 'Dona Cidinha', 'Seu Benedito', 'Dona Arlete', 'Seu Romeu', 'Dona Fátima'];
TWIN_OF.forEach((o, i) => { const c = HOUSES[o]; HOUSES.push({ name: TWIN_NAMES[i], roof: c.roof, door: c.door, f: c.f.slice(), twin: o }); });
/** Pares [original, gêmea]. */
export const TWINS = TWIN_OF.map((o, i) => [o, 104 + i]);

// ---- Veneza (Nível 12, índices 110–169): casas estreitas de 2 a 4 andares, viradas para os canais ----
// fachada (creme, ocre, terracota, rosa envelhecido, vermelho queimado), persianas, andares e itens visíveis da água.
export const VEN_FACADE = { cream: '#efe0bd', ochre: '#d9a441', terracotta: '#c8693f', rose: '#d99a94', red: '#a8432e' };
export const VEN_SHUTTER = { green: '#3f7a4a', blue: '#3a6688', brown: '#6b4428' };
export const VEN_AWNING = { red: '#c8402f', green: '#3c8f52', blue: '#2f6fb0' };
{
  const names = ['Signora Lucia', 'Signor Marco', 'Signora Bianca', 'Signor Paolo', 'Signora Giulia', 'Signor Enzo', 'Signora Rosa',
    'Signor Bruno', 'Signora Elena', 'Signor Carlo', 'Signora Marta', 'Signor Piero', 'Signora Teresa', 'Signor Gino', 'Signora Ada',
    'Signor Luigi', 'Signora Nina', 'Signor Franco', 'Signora Vera', 'Signor Aldo'];
  const FAC = Object.keys(VEN_FACADE), SH = Object.keys(VEN_SHUTTER), AW = Object.keys(VEN_AWNING);
  const ITEMS = ['pots', 'flowers', 'laundry', 'poles', 'lamp'];
  let seed = 12;
  const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = new Set();
  for (let i = 0; HOUSES.length < 170; i++) {
    const v = { fac: FAC[rnd(5)], sh: SH[rnd(3)], floors: 2 + rnd(3), arch: rnd(2) === 1, awning: rnd(3) === 0 ? AW[rnd(3)] : null,
      items: ITEMS.filter(() => rnd(3) === 0).slice(0, 2) };
    const t = [v.fac, v.sh, 'f' + v.floors].concat(v.arch ? ['arch'] : [], v.awning ? ['aw' + v.awning] : [], v.items);
    const sub = (x, y) => x.every(k => y.includes(k));          // nenhuma casa pode "conter" outra: cada uma tem pista única
    if ([...seen].some(o => sub(o, t) || sub(t, o))) continue;
    seen.add(t);
    HOUSES.push({ name: names[(HOUSES.length - 110) % names.length], kind: 'ven', ...v });
  }
}
/** Índices das casas de Veneza em HOUSES. */
export const VENS = [...Array(60).keys()].map(k => 110 + k);

// ---- Morro (Nível 13, índices 170–233): casas de laje de 1 a 3 andares, pintadas ou de tijolo aparente ----
export const FAV_FACADE = { blue: '#3f7fc4', yellow: '#f0c43a', coral: '#ee7a5f', green: '#5cae5a', beige: '#dcc79e', brick: '#b5603d' };
export const FAV_AWNING = { red: '#d23a2e', blue: '#2a64c2', green: '#2f9a4a' };
{
  const names = ['Dona Cida', 'Seu Zé', 'Dona Neide', 'Seu Tião', 'Dona Rosinha', 'Seu Valdir', 'Dona Lurdes', 'Seu Jorginho',
    'Dona Marlene', 'Seu Nenê', 'Dona Zezé', 'Seu Raimundo', 'Dona Socorro', 'Seu Moacir', 'Dona Penha', 'Seu Biu', 'Dona Glória',
    'Seu Damião', 'Dona Iracema', 'Seu Chico'];
  const FAC = Object.keys(FAV_FACADE), AW = Object.keys(FAV_AWNING), ITEMS = ['laundry', 'pots', 'stairs'];
  let seed = 31;
  const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [];
  while (HOUSES.length < 234) {
    const v = { fac: FAC[rnd(6)], floors: 1 + rnd(3), tanks: rnd(3), awning: rnd(3) === 0 ? AW[rnd(3)] : null, items: ITEMS.filter(() => rnd(3) === 0) };
    const t = ['ffac:' + v.fac, 'ffl:' + v.floors].concat(v.tanks ? ['ftank:' + v.tanks] : [], v.awning ? ['faw:' + v.awning] : [], v.items.map(k => 'fv:' + k));
    const sub = (x, y) => x.every(k => y.includes(k));          // nenhuma casa "contém" outra: cada uma tem pista única
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    HOUSES.push({ name: names[(HOUSES.length - 170) % names.length], kind: 'fav', ...v, ftags: t });
  }
}
/** Índices das casas do Morro em HOUSES. */
export const FAVS = [...Array(64).keys()].map(k => 170 + k);

// ---- Prédios contemporâneos (Nível 14, índices 234–245): vidro azulado, volumes brancos ou cinza desencontrados,
// cobertura plana, marquise na entrada e vasos. Cada um tem 4 características (combinações diferentes → pista única).
{
  const names = ['Ed. Horizonte', 'Ed. Aurora', 'Ed. Prisma', 'Ed. Vértice', 'Ed. Atlântico', 'Ed. Mirante Azul', 'Ed. Lumen',
    'Ed. Paralelo', 'Ed. Ônix', 'Ed. Brisa', 'Ed. Quadra', 'Ed. Zênite'];
  const combos = [['white', 'blue', 'wood', 'trees'], ['gray', 'aqua', 'white', 'pergola'], ['white', 'aqua', 'wood', 'flag'],
    ['gray', 'blue', 'white', 'trees'], ['white', 'blue', 'white', 'pergola'], ['gray', 'aqua', 'wood', 'trees'],
    ['white', 'aqua', 'white', 'trees'], ['gray', 'blue', 'wood', 'flag'], ['white', 'blue', 'wood', 'pergola'],
    ['gray', 'aqua', 'white', 'flag'], ['white', 'aqua', 'wood', 'pergola'], ['gray', 'blue', 'wood', 'trees']];
  combos.forEach(([fac, glass, canopy, top], i) => HOUSES.push({ name: names[i], kind: 'mod', fac, glass, canopy, top }));
}
/** Índices dos prédios contemporâneos em HOUSES. */
export const MODS = [...Array(12).keys()].map(k => 234 + k);

// ---- Colheita (Nível 15, índices 246–285): propriedades rurais. O destino é a construção (casa, celeiro ou galpão);
// porteira, plantação e extras fazem parte da pista. Nenhuma "contém" outra: cada uma tem pista única.
export const FARM_COL = { white: '#f1ece0', yellow: '#efcf6a', blue: '#7fa7d1', pink: '#e8a7a0', red: '#b8382e', brown: '#8a5a36', green: '#5f9a5a', gray: '#9a9fa6' };
export const FARM_ROOF = { red: '#b5402f', blue: '#3f6fb0', green: '#3f8a4a', gray: '#6e737a' };
export const FARM_GATE = { blue: '#2f6fd0', red: '#d0352a', yellow: '#f0c22a', white: '#f4f1ea', green: '#2f9a4a' };
{
  const names = ['Seu Zeca', 'Dona Benta', 'Seu Juca', 'Dona Filó', 'Seu Tonico', 'Dona Lourdes', 'Seu Bastião', 'Dona Zica',
    'Seu Quim', 'Dona Nair', 'Seu Lico', 'Dona Cotinha', 'Seu Mané', 'Dona Rita', 'Seu Dito', 'Dona Antônia'];
  const TYPES = { house: { wall: ['white', 'yellow', 'blue', 'pink'], roof: ['red', 'blue', 'green'] },
    barn: { wall: ['red', 'brown'], roof: ['gray', 'red'] }, shed: { wall: ['gray', 'green'], roof: ['gray', 'blue'] } };
  const T = ['house', 'house', 'barn', 'shed'], GATES = Object.keys(FARM_GATE), CROPS = ['corn', 'garden', 'orchard', 'pasture'];
  let seed = 77; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [];
  while (HOUSES.length < 286) {
    const type = T[rnd(4)], ty = TYPES[type];
    const v = { type, wall: ty.wall[rnd(ty.wall.length)], roofc: ty.roof[rnd(ty.roof.length)], gate: GATES[rnd(5)], crop: CROPS[rnd(4)],
      porch: type === 'house' && rnd(2) === 0, extra: ['tank', 'hay', null][rnd(3)] };
    const t = ['rgate:' + v.gate, 'rwall:' + v.wall, 'rroof:' + v.roofc, 'rcrop:' + v.crop].concat(v.porch ? ['rporch'] : [], v.extra ? ['rx:' + v.extra] : []);
    const sub = (x, y) => x.every(k => y.includes(k));
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    // detalhes rurais (exclusivos da Colheita): 2 por propriedade; botas e vasos só nas casas (junto à porta)
    const pool = ['scarecrow', 'barrow', 'wood', 'coop', 'veg'].concat(type === 'house' ? ['boots', 'pots'] : []), rural = [];
    while (rural.length < 2) { const r = pool[rnd(pool.length)]; if (!rural.includes(r)) rural.push(r); }
    HOUSES.push({ name: names[(HOUSES.length - 246) % names.length], kind: 'farm', ...v, rural, ftags: t.concat(rural.map(r => 'rf:' + r)) });
  }
}
/** Nevasca (Nível 16): detalhes de inverno de cada casa comum (0–31), fixos por casa; só aparecem e só entram nas pistas no Nevasca. */
export const SNOW_SCARF = { red: '#d8473a', blue: '#3a78d4', yellow: '#efbf2a', green: '#3c9d55' };
/** Nível 22 (Bosque): 2–3 detalhes de outono por casa (0–31), fixos; ~metade tem uma árvore colorida junto da entrada. */
export const FOREST_EXTRAS = [];
{
  let seed = 2222; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const IT = ['fo:leaves', 'fo:rake', 'fo:apples', 'fo:wood', 'fo:wreath', 'fo:bench', 'fo:porch'], TC = ['red', 'yellow', 'orange'];
  for (let h = 0; h < 32; h++) {
    const n = 2 + rnd(2), list = [];
    while (list.length < n) { const it = IT[rnd(IT.length)]; if (!list.includes(it)) list.push(it); }
    if (rnd(2) === 0) list.push('fo:tree:' + TC[rnd(3)]);
    FOREST_EXTRAS[h] = list;
  }
}
/** Nível 23 (Cachoeira): 2 detalhes por casa (0–31), fixos: sacada de madeira virada para o desfiladeiro, jardinzinho, vasos, cobertura de madeira. */
export const CANYON_EXTRAS = [];
{
  let seed = 2323; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const IT = ['cy:balcony', 'cy:garden', 'cy:vases', 'cy:canopy'];
  for (let h = 0; h < 32; h++) { const a = rnd(4); let b = rnd(3); if (b >= a) b++; CANYON_EXTRAS[h] = [IT[a], IT[b]]; }
}
export const SNOW_EXTRAS = [];
/** Itens das casas que não aparecem nem entram nas pistas no Nevasca (cacto, piscina inflável, fonte, flamingo, girassóis, árvore com frutas). */
export const SNOW_DROP = ['cactus', 'pool', 'fountain', 'flamingo', 'sunflowers', 'fruit'];
{
  let seed = 404; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const ITEMS = ['snowman', 'sled', 'skis', 'shovel', 'wood', 'icicles', 'lights'], SC = Object.keys(SNOW_SCARF);
  for (let h = 0; h < 32; h++) {
    const n = 2 + (rnd(3) === 0 ? 1 : 0), list = [];
    while (list.length < n) { const it = ITEMS[rnd(ITEMS.length)]; if (!list.includes(it)) list.push(it); }
    SNOW_EXTRAS[h] = list.map(it => (it === 'snowman' ? 'ws:snowman:' + SC[rnd(SC.length)] : 'ws:' + it));
    // itens que não combinam com o inverno saem (SNOW_DROP); cada um vira um detalhe de inverno que a casa ainda não tem
    const drop = HOUSES[h].f.filter(k => SNOW_DROP.includes(k)), has = t => SNOW_EXTRAS[h].some(x => x.startsWith('ws:' + t));
    for (let k = 0; k < drop.length; k++) {
      const it = ['pine', 'snowman', 'sled', 'shovel', 'lights', 'skis', 'wood', 'icicles'].find(t => !has(t) && (t !== 'pine' || k === 0));
      if (it) SNOW_EXTRAS[h].push(it === 'snowman' ? 'ws:snowman:' + SC[(h + k) % SC.length] : 'ws:' + it);
    }
  }
}
/** Índices das propriedades da Colheita em HOUSES. */
export const FARMS = [...Array(40).keys()].map(k => 246 + k);

// ---- Órbita (Nível 17, índices 286–317): módulos lunares (cilindro em pé, cápsula deitada ou cúpula), faixa colorida,
// janelas circulares (1–3), porta de moldura grossa colorida e um detalhe no teto. Combinações distintas → pista única.
export const MOON_COL = { blue: '#2f78d0', orange: '#ff7a1a', green: '#3fae5a', yellow: '#f0c22a' };
{
  const names = ['Zorp', 'Blib', 'Kiki-7', 'Glorbo', 'Nix', 'Pipo Estelar', 'Lumi', 'Quarkinho', 'Vega-9', 'Bzzt', 'Orbi', 'Tilo Cometa'];   // os ETs moradores
  const SH = ['cyl', 'capsule', 'dome'], C = Object.keys(MOON_COL), TOP = ['antenna', 'dish', 'solar'];
  let seed = 17; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = new Set();
  while (HOUSES.length < 318) {
    const v = { shape: SH[rnd(3)], stripe: C[rnd(4)], win: 1 + rnd(3), door: C[rnd(4)], top: TOP[rnd(3)], tall: rnd(2) === 1 };
    if (v.door === v.stripe) continue;
    const t = ['mshape:' + v.shape, 'mstripe:' + v.stripe, 'mwin:' + v.win, 'mdoor:' + v.door, 'mtop:' + v.top];
    const k = t.join('|'); if (seen.has(k)) continue; seen.add(k);
    HOUSES.push({ name: names[(HOUSES.length - 286) % names.length], kind: 'moon', ...v, ftags: t });
  }
}
/** Índices dos módulos da Órbita em HOUSES. */
export const MOONS = [...Array(32).keys()].map(k => 286 + k);
/** Nevasca (Nível 16): o Grillby's, bar de madeira fixo num ponto do bairro (comercial; interação na porta da frente). */
export const GRILLBY = HOUSES.length;
HOUSES.push({ name: "Grillby's", kind: 'shop', grill: true, noDelivery: true });   // só o bar (entrar/sair); nunca é destino de entrega
export const SNOW_FIXED = { 5: GRILLBY };
// ---- Jardins (Nível 17): casas de condomínio (1 ou 2 andares, no estilo das casas dos Bairros 1–6), índices a partir de GARD_FIRST.
// Variam: fachada, telhado, porta, andares, modelo (clássica, chalé, em L, com garagem), flores, pergolado, banco na varanda,
// portão, caixa de correio e enfeite na entrada.
export const GARD_COL = {
  wall: { cream: '#f3e6c8', white: '#f4f2ec', peach: '#f2c9a8', sage: '#c9d8b4', gray: '#c9ccd1' },
  roof: { red: '#b5402f', gray: '#5f646c', green: '#3f7a4a', brown: '#7a4a2a' },
  door: { red: '#c8402f', blue: '#2f6fb0', yellow: '#e8b02a', green: '#3f8a4a', white: '#f4f1ea' },
  flower: { red: '#e0402a', yellow: '#f2c23a', purple: '#9b5de5', white: '#f4f4f4', pink: '#ff7ab0' },
  gate: { blue: '#2f78d0', red: '#d0352a', white: '#f4f1ea', green: '#2f9a4a', black: '#2b2b2b' },
  mail: { red: '#d8473a', blue: '#3a78d4', yellow: '#efbf2a', green: '#3c9d55' },
};
export const GARD_FIRST = HOUSES.length, GARD_N = 64;    // (64 casas para ~58 pontos: a cada partida algumas ficam de fora)
{
  const names = ['Seu Ronaldo', 'Dona Clarice', 'Seu Otávio', 'Dona Heloísa', 'Seu Mauro', 'Dona Sílvia', 'Seu Augusto', 'Dona Lúcia', 'Seu Fernando', 'Dona Marta', 'Seu Caio', 'Dona Teresa'];
  const C = GARD_COL, K = o => Object.keys(o);
  let seed = 1717; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [], sub = (x, y) => x.every(k => y.includes(k));
  while (HOUSES.length < GARD_FIRST + GARD_N) {
    const v = { wall: K(C.wall)[rnd(5)], roofc: K(C.roof)[rnd(4)], doorc: K(C.door)[rnd(5)], floors: 1 + rnd(2), flower: rnd(4) ? K(C.flower)[rnd(5)] : null,
      pergola: rnd(3) === 0, bench: rnd(3) === 0, gate: K(C.gate)[rnd(5)], mail: K(C.mail)[rnd(4)], deco: ['statue', 'vases', null][rnd(3)],
      model: ['classic', 'classic', 'chalet', 'ell', 'garage'][rnd(5)] };
    const t = ['gwall:' + v.wall, 'groof:' + v.roofc, 'gdoor:' + v.doorc, 'gfl:' + v.floors, 'ggate:' + v.gate, 'gmail:' + v.mail]
      .concat(v.flower ? ['gflow:' + v.flower] : [], v.pergola ? ['gperg'] : [], v.bench ? ['gbench'] : [], v.deco ? ['gdeco:' + v.deco] : [], v.model !== 'classic' ? ['gmod:' + v.model] : []);
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    HOUSES.push({ name: names[(HOUSES.length - GARD_FIRST) % names.length], kind: 'gard', ...v, ftags: t });
  }
}
export const GARDS = [...Array(GARD_N).keys()].map(k => GARD_FIRST + k);            // casas dos Jardins (índices em HOUSES)

// ---- Modernista (Nível 18): casas geométricas (1 ou 2 andares; volumes deslocados, laje plana, vidro azulado) e lojas
// de arquitetura parecida. Índices a partir de MDH_FIRST (40 casas) e MDS_FIRST (6 lojas).
export const MDH_COL = {
  fac: { white: '#f4f3ef', gray: '#bfc3c8', beige: '#e3d4b8' },
  door: { blue: '#2f6fb0', red: '#c8402f', yellow: '#e8b02a', green: '#3f8a4a', black: '#2b2d33', orange: '#ec7a26' },
  gar: { roll: '#9aa0a8', wood: '#a8743e', black: '#2b2d33' },
};
export const MDH_FIRST = HOUSES.length;
{
  const names = ['Seu Lúcio', 'Dona Lina', 'Seu Oscar', 'Dona Lina Bo', 'Seu Rino', 'Dona Zélia', 'Seu Paulo', 'Dona Carmen', 'Seu Affonso', 'Dona Ruth', 'Seu Joaquim', 'Dona Iris'];
  const C = MDH_COL, K = o => Object.keys(o);
  let seed = 1818; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [], sub = (x, y) => x.every(k => y.includes(k));
  while (HOUSES.length < MDH_FIRST + 40) {
    const v = { fac: K(C.fac)[rnd(3)], doorc: K(C.door)[rnd(6)], floors: 1 + rnd(2), shape: rnd(4), gar: rnd(3) ? K(C.gar)[rnd(3)] : null,
      wood: rnd(2) === 0, stone: rnd(3) === 0, vase: rnd(3) === 0, perg: rnd(3) === 0, bench: rnd(3) === 0, pool: rnd(4) === 0 };
    const t = ['mdfac:' + v.fac, 'mddoor:' + v.doorc, 'mdfl:' + v.floors].concat(v.gar ? ['mdgar:' + v.gar] : [], v.wood ? ['mdwood'] : [], v.stone ? ['mdstone'] : [],
      v.vase ? ['mdvase'] : [], v.perg ? ['mdperg'] : [], v.bench ? ['mdbench'] : [], v.pool ? ['mdpool'] : []);
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    HOUSES.push({ name: names[(HOUSES.length - MDH_FIRST) % names.length], kind: 'mdh', ...v, ftags: t });
  }
}
export const MDHS = [...Array(40).keys()].map(k => MDH_FIRST + k);
export const MDS_FIRST = HOUSES.length;
[['cafe', 'CAFÉ', '#c8642a', 'white'], ['bakery', 'PADARIA', '#e8b02a', 'beige'], ['flowers', 'FLORES', '#d24a8a', 'white'], ['books', 'LIVROS', '#2f6fb0', 'gray'],
  ['optic', 'ÓTICA', '#3f8a4a', 'beige'], ['market', 'MERCADO', '#c8402f', 'gray']].forEach(([k, label, accent, fac]) =>
  HOUSES.push({ name: 'Loja ' + label, kind: 'mds', shopKey: k, label, accent, fac, ftags: ['mdsh:' + k, 'mdfac:' + fac] }));
export const MDSS = [...Array(6).keys()].map(k => MDS_FIRST + k);

// ---- Operário (Nível 21): casas geminadas (unidades de uma fileira; térreas ou sobrados) e oficinas/comércios.
// Índices a partir de ROW_FIRST (120 casas) e WSH_FIRST (20 oficinas/lojas).
export const ROW_COL = {
  fac: { brick: '#a5553a', cream: '#efe2c4', blue: '#8fb3d1', green: '#9cc39a', ochre: '#e0b25a', pink: '#e8a8a0' },
  door: { green: '#3f8a4a', red: '#c8402f', blue: '#2f6fb0', yellow: '#e8b02a', brown: '#6b4428', white: '#f4f1ea' },
  roof: { red: '#b5502f', gray: '#5f646c', brown: '#7a4a2a' },
  mail: { red: '#d8473a', blue: '#3a78d4', yellow: '#efbf2a', green: '#3c9d55' },
  awn: { red: '#d0352a', green: '#2f9a4a', blue: '#2f78d0', yellow: '#efbf2a' },
  gate: { blue: '#2f6fb0', red: '#c8402f', gray: '#8a9098', green: '#3f8a4a', yellow: '#e8b02a' },
};
export const ROW_FIRST = HOUSES.length;
{
  const names = ['Seu Zé', 'Dona Cida', 'Seu Tonho', 'Dona Neide', 'Seu Valdir', 'Dona Rosa', 'Seu Nelson', 'Dona Fátima', 'Seu Geraldo', 'Dona Lourdes', 'Seu Bené', 'Dona Zuleica', 'Seu Juca', 'Dona Irene'];
  const C = ROW_COL, K = o => Object.keys(o);
  let seed = 2121; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [], sub = (x, y) => x.every(k => y.includes(k));
  while (HOUSES.length < ROW_FIRST + 120) {
    const v = { fac: rnd(5) < 2 ? 'brick' : K(C.fac)[rnd(6)], doorc: K(C.door)[rnd(6)], floors: 1 + rnd(2), roofc: K(C.roof)[rnd(3)], dstyle: ['visor', 'frame', null][rnd(3)],
      mail: rnd(2) ? K(C.mail)[rnd(4)] : null, awn: rnd(3) === 0 ? K(C.awn)[rnd(4)] : null, flower: rnd(3) === 0, bike: rnd(4) === 0, bench: rnd(4) === 0 };
    const t = ['rfac:' + v.fac, 'rdoor:' + v.doorc, 'rfl:' + v.floors, 'rroof:' + v.roofc].concat(v.dstyle ? ['rdst:' + v.dstyle] : [], v.mail ? ['rmail:' + v.mail] : [],
      v.awn ? ['rawn:' + v.awn] : [], v.flower ? ['rflower'] : [], v.bike ? ['rbike'] : [], v.bench ? ['rbench'] : []);
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    HOUSES.push({ name: names[(HOUSES.length - ROW_FIRST) % names.length], kind: 'row', ...v, ftags: t });
  }
}
export const ROWS = [...Array(120).keys()].map(k => ROW_FIRST + k);
export const WSH_FIRST = HOUSES.length;
{
  const SIGNS = { mech: ['AUTO MECÂNICA TONHO', 'MECÂNICA BOA VIAGEM', 'OFICINA DO ZÉ', 'MOTOR & CIA', 'MECÂNICA DOIS IRMÃOS'], tire: ['BORRACHARIA 24H', 'PNEU BOM', 'BORRACHARIA DO VAL', 'RODA VIVA', 'PNEUS & RODAS'],
    tools: ['FERRAGENS SÃO JOSÉ', 'CASA DAS FERRAMENTAS', 'PARAFUSO DE OURO', 'FERRAGISTA ÚNICA', 'TUDO EM AÇO'], market: ['MERCADINHO BOM PREÇO', 'EMPÓRIO DA ESQUINA', 'MERCEARIA DONA ROSA', 'MINIMERCADO SOL', 'QUITANDA DO BAIRRO'] };
  const C = ROW_COL, K = o => Object.keys(o);
  let seed = 4242; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [], sub = (x, y) => x.every(k => y.includes(k));
  for (const wtype of ['mech', 'tire', 'tools', 'market']) for (let i = 0; i < 5; i++) {
    let v, t;
    do {
      v = { wtype, sign: SIGNS[wtype][i], fac: rnd(2) ? 'brick' : K(C.fac)[rnd(6)], gate: K(C.gate)[rnd(5)], awn: rnd(2) ? K(C.awn)[rnd(4)] : null,
        tires: wtype === 'tire' || (wtype === 'mech' && rnd(2) === 0), tools: wtype === 'tools' || (wtype === 'mech' && rnd(2) === 0), car: wtype !== 'tools' && wtype !== 'market' ? rnd(3) > 0 : rnd(3) === 0 };
      t = ['wtype:' + wtype, 'rfac:' + v.fac, 'wgate:' + v.gate].concat(v.awn ? ['wawn:' + v.awn] : [], v.tires ? ['wtires'] : [], v.tools ? ['wtools'] : [], v.car ? ['wcar'] : []);
    } while (seen.some(o => sub(o, t) || sub(t, o)));
    seen.push(t);
    HOUSES.push({ name: v.sign, kind: 'wsh', ...v, ftags: t });
  }
}
export const WSHS = [...Array(20).keys()].map(k => WSH_FIRST + k);

// ---- Medieval (Nível 24): casas do burgo (kind 'mvh': pedra, reboco ou enxaimel; térreas ou sobrados) e as 4 lojas da
// praça (kind 'mvs', fixas no plano: padaria, ferraria, taverna, tecelagem). Só características permanentes viram pista.
export const MV_COL = {
  fac: { stone: '#a19a8c', plaster: '#efe3c6', timber: '#eadcbc', ochre: '#dcb878', rose: '#dcae9e' },
  roof: { terracotta: '#b0582f', brown: '#7a4a2a', slate: '#5c626a', red: '#97382a' },
  door: { brown: '#6b4428', green: '#3f6b3a', blue: '#2f5a8a', red: '#8e2e22', black: '#2b2622' },
  shut: { green: '#4a7a42', blue: '#3a6a9a', red: '#9a3a2a', brown: '#7a5232' },
  flag: { red: '#a8322a', blue: '#2f4f8f', green: '#3f6f3a', yellow: '#d9a62a' },
};
export const MVH_FIRST = HOUSES.length;
{
  const names = ['Mestre Bento', 'Dona Brites', 'Seu Gonçalo', 'Dona Leonor', 'Seu Afonso', 'Dona Inês', 'Seu Martim', 'Dona Urraca', 'Seu Vasco', 'Dona Mécia', 'Seu Fernão', 'Dona Guiomar', 'Seu Nuno', 'Dona Beatriz'];
  const C = MV_COL, K = o => Object.keys(o);
  let seed = 2424; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const seen = [], sub = (x, y) => x.every(k => y.includes(k));
  while (HOUSES.length < MVH_FIRST + 110) {
    const floors = 1 + rnd(2), v = { fac: K(C.fac)[rnd(5)], roofc: K(C.roof)[rnd(4)], doorc: K(C.door)[rnd(5)], floors, arch: rnd(2) === 0,
      shut: rnd(3) ? K(C.shut)[rnd(4)] : null, flower: rnd(3) === 0, banner: rnd(4) === 0 ? K(C.flag)[rnd(4)] : null, shield: rnd(5) === 0 ? K(C.flag)[rnd(4)] : null,
      barrels: rnd(4) === 0, lantern: rnd(3) === 0, ivy: rnd(4) === 0, chimney: rnd(2) === 0, jetty: floors === 2 && rnd(2) === 0, asym: rnd(3) };
    const t = ['mv:fac:' + v.fac, 'mv:roof:' + v.roofc, 'mv:door:' + v.doorc, 'mv:fl:' + v.floors].concat(v.arch ? ['mv:arch'] : [], v.shut ? ['mv:shut:' + v.shut] : [],
      v.flower ? ['mv:flower'] : [], v.banner ? ['mv:banner:' + v.banner] : [], v.shield ? ['mv:shield:' + v.shield] : [], v.barrels ? ['mv:barrels'] : [],
      v.lantern ? ['mv:lantern'] : [], v.ivy ? ['mv:ivy'] : [], v.chimney ? ['mv:chimney'] : []);
    if (seen.some(o => sub(o, t) || sub(t, o))) continue;
    seen.push(t);
    HOUSES.push({ name: names[(HOUSES.length - MVH_FIRST) % names.length], kind: 'mvh', ...v, ftags: t });
  }
}
export const MVHS = [...Array(110).keys()].map(k => MVH_FIRST + k);
export const MVS_FIRST = HOUSES.length;
[['bakery', 'PADARIA', 'bread', 'plaster', 'terracotta', 'brown', 'Mestre Padeiro'], ['smithy', 'FERRARIA', 'anvil', 'stone', 'slate', 'black', 'Mestre Ferreiro'],
  ['tavern', 'TAVERNA DO JAVALI', 'mug', 'timber', 'brown', 'red', 'Taverneira Joana'], ['textile', 'TECELAGEM', 'spool', 'ochre', 'red', 'blue', 'Mestra Tecelã']]
  .forEach(([shopKey, sign, symbol, fac, roofc, doorc, name]) => HOUSES.push({ name, kind: 'mvs', shopKey, sign, symbol, fac, roofc, doorc, ftags: ['mvs:' + shopKey] }));
export const MVSS = [...Array(4).keys()].map(k => MVS_FIRST + k);
export const MVS_KEY = { bakery: MVS_FIRST, smithy: MVS_FIRST + 1, tavern: MVS_FIRST + 2, textile: MVS_FIRST + 3 };

export const ROOF_ITEMS = ['chimney', 'dish', 'solar', 'tank', 'rooster', 'kite', 'patch'];
export const YARD_ITEMS = ['fruit', 'bare', 'cactus', 'sunflowers', 'ballbush', 'doghouse', 'pool', 'trampoline',
  'swing', 'bike', 'flamingo', 'gnome', 'clothesline', 'tires', 'fountain'];

HOUSES.forEach((h, i) => {
  h.index = i;
  if (h.kind === 'apt') {
    h.f = [];
    h.tags = ['balcony:' + h.balcony, 'atop:' + h.atop].concat(h.extra);
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'fut') {
    h.f = [];
    h.tags = ['glow:' + h.glow, 'crown:' + h.crown];
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'ven') {
    h.f = [];
    h.tags = ['vfac:' + h.fac, 'vsh:' + h.sh, 'vfl:' + h.floors].concat(h.arch ? ['varch'] : [], h.awning ? ['vaw:' + h.awning] : [], h.items.map(k => 'v:' + k));
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'moon') {
    h.f = []; h.tags = h.ftags.slice();
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'gard' || h.kind === 'mdh' || h.kind === 'mds' || h.kind === 'row' || h.kind === 'wsh' || h.kind === 'mvh' || h.kind === 'mvs') {
    h.f = []; h.tags = h.ftags.slice();
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'farm') {
    h.f = []; h.tags = h.ftags.slice();
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'mod') {
    h.f = []; h.tags = ['mfac:' + h.fac, 'mglass:' + h.glass, 'mcan:' + h.canopy, 'mtop:' + h.top];
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'fav') {
    h.f = []; h.tags = h.ftags.slice();
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'ware') {
    h.f = [];
    h.tags = ['wroof:' + h.wroof, 'gate:' + h.gate].concat(h.items.map(k => 'w:' + k));
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.grill) {
    h.f = []; h.tags = ['g:sign', 'g:windows', 'g:wood'];
    h.roofItems = []; h.yardItems = [];
    return;
  }
  if (h.kind === 'shop') {
    h.f = [];
    h.tags = ['awning:' + h.awning, 'facade:' + h.facade, 'top:' + h.top];
    h.roofItems = []; h.yardItems = [];
    return;
  }
  h.kind = 'house';
  h.tags = ['roof:' + h.roof].concat(h.door ? ['door:' + h.door] : [], h.f);
  h.roofItems = h.f.filter(k => ROOF_ITEMS.includes(k));
  h.yardItems = h.f.filter(k => YARD_ITEMS.includes(k)); // no máximo 2 por casa, sempre no quintal da frente
});

export const PHRASE = {
  'roof:red': 'telhado vermelho', 'roof:blue': 'telhado azul', 'roof:green': 'telhado verde',
  'roof:yellow': 'telhado amarelo', 'roof:purple': 'telhado roxo', 'roof:gray': 'telhado cinza',
  'door:yellow': 'porta amarela', 'door:red': 'porta vermelha', 'door:pink': 'porta cor-de-rosa', 'door:teal': 'porta azul-turquesa',
  chimney: 'uma chaminé soltando fumaça', dish: 'uma antena parabólica', solar: 'painéis solares',
  tank: 'uma caixa-d’água no telhado', rooster: 'um galo de metal no telhado', kite: 'uma pipa presa no telhado',
  patch: 'telhas remendadas de outra cor', mailbox: 'uma caixa de correio torta', fence: 'uma cerca com uma tábua faltando',
  fruit: 'uma árvore com frutas', bare: 'uma árvore sem folhas', cactus: 'um cacto grande',
  sunflowers: 'um canteiro de girassóis', ballbush: 'um arbusto em formato de bola', doghouse: 'uma casinha de cachorro',
  pool: 'uma piscina inflável', trampoline: 'um trampolim', swing: 'um balanço', bike: 'uma bicicleta encostada na cerca',
  flamingo: 'um flamingo no jardim', gnome: 'um gnomo de jardim', clothesline: 'um varal com roupas', tires: 'uma pilha de pneus',
  fountain: 'uma fonte pequena',
  // prédios comerciais
  'awning:red': 'toldo vermelho', 'awning:blue': 'toldo azul', 'awning:green': 'toldo verde', 'awning:yellow': 'toldo amarelo',
  'facade:brick': 'fachada de tijolinhos', 'facade:white': 'fachada branca', 'facade:mint': 'fachada verde-clara',
  'g:sign': 'uma placa “GRILLBY’S” no alto', 'g:windows': 'janelas acesas com luz quente', 'g:wood': 'fachada de madeira',
  'top:ac': 'aparelhos de ar-condicionado no topo', 'top:billboard': 'um outdoor no topo', 'top:antenna': 'uma antena de rádio no topo',
  // prédios futuristas
  'glow:cyan': 'luzes de neon ciano', 'glow:magenta': 'luzes de neon rosa', 'glow:lime': 'luzes de neon verde-limão', 'glow:amber': 'luzes de neon âmbar',
  'crown:spire': 'uma antena luminosa no topo', 'crown:ring': 'anéis flutuando no topo', 'crown:dish': 'um domo de vidro no topo', 'crown:orb': 'uma esfera brilhante no topo',
  // prédios residenciais
  'balcony:red': 'sacadas vermelhas', 'balcony:blue': 'sacadas azuis', 'balcony:yellow': 'sacadas amarelas', 'balcony:green': 'sacadas verdes',
  'atop:tank': 'uma caixa-d’água grande no terraço', 'atop:antenna': 'antenas no terraço', 'atop:garden': 'um jardim no terraço',
  'atop:solar': 'painéis solares no terraço', 'atop:pool': 'uma piscina no terraço',
  'fac:clothes': 'roupas penduradas nas janelas', 'fac:plants': 'plantas nas sacadas', 'fac:ac': 'ar-condicionados na fachada', 'fac:mural': 'um grafite colorido na parede',
  // galpões
  'wroof:red': 'telhado vermelho', 'wroof:blue': 'telhado azul', 'wroof:green': 'telhado verde', 'wroof:gray': 'telhado cinza',
  'gate:blue': 'portão azul', 'gate:red': 'portão vermelho', 'gate:yellow': 'portão amarelo', 'gate:green': 'portão verde',
  'w:pallets': 'caixas e pallets na entrada', 'w:forklift': 'uma empilhadeira na entrada', 'w:truck': 'um caminhão na área de carga',
  'w:barrels': 'barris e tubos empilhados',
  // lugar (Bairros 9 e 10): vão no fim da pista
  'loc:top': 'na parte mais alta do bairro', 'loc:ramp': 'logo depois da subida', 'loc:stairs': 'ao lado da escadaria',
  'side:east': 'no Lado Leste', 'side:west': 'no Lado Oeste',
  // Bosque (Nível 22)
  'fo:leaves': 'uma pilha de folhas no quintal', 'fo:rake': 'um ancinho encostado na frente', 'fo:apples': 'um cesto de maçãs na entrada',
  'fo:wood': 'lenha sob uma pequena cobertura', 'fo:wreath': 'uma guirlanda de folhas na porta', 'fo:bench': 'um banco de madeira na frente',
  'fo:porch': 'uma varanda de madeira', 'fo:tree:red': 'uma árvore de folhas vermelhas na entrada', 'fo:tree:yellow': 'uma árvore de folhas amarelas na entrada',
  'fo:tree:orange': 'uma árvore de folhas laranja na entrada',
  // Medieval (Nível 24)
  'mv:fac:stone': 'fachada de pedra', 'mv:fac:plaster': 'fachada de reboco claro', 'mv:fac:timber': 'vigas de madeira aparentes na fachada', 'mv:fac:ochre': 'fachada cor de ocre', 'mv:fac:rose': 'fachada rosada',
  'mv:roof:terracotta': 'telhas cor de terracota', 'mv:roof:brown': 'telhado marrom', 'mv:roof:slate': 'telhado de ardósia cinza', 'mv:roof:red': 'telhado vermelho-escuro',
  'mv:door:brown': 'porta marrom', 'mv:door:green': 'porta verde', 'mv:door:blue': 'porta azul', 'mv:door:red': 'porta vermelha', 'mv:door:black': 'porta escura',
  'mv:fl:1': 'um andar', 'mv:fl:2': 'dois andares', 'mv:arch': 'porta em arco',
  'mv:shut:green': 'venezianas verdes', 'mv:shut:blue': 'venezianas azuis', 'mv:shut:red': 'venezianas vermelhas', 'mv:shut:brown': 'venezianas marrons',
  'mv:flower': 'floreiras nas janelas', 'mv:banner:red': 'um estandarte vermelho', 'mv:banner:blue': 'um estandarte azul', 'mv:banner:green': 'um estandarte verde', 'mv:banner:yellow': 'um estandarte amarelo',
  'mv:shield:red': 'um escudo vermelho na fachada', 'mv:shield:blue': 'um escudo azul na fachada', 'mv:shield:green': 'um escudo verde na fachada', 'mv:shield:yellow': 'um escudo amarelo na fachada',
  'mv:barrels': 'barris junto à entrada', 'mv:lantern': 'uma lanterna na porta', 'mv:ivy': 'uma trepadeira subindo a parede', 'mv:chimney': 'uma chaminé soltando fumaça',
  'mvs:bakery': 'a placa com um pão', 'mvs:smithy': 'a placa com uma bigorna', 'mvs:tavern': 'a placa com uma caneca', 'mvs:textile': 'a placa com um carretel de linha',
  // Operário (Nível 21)
  'rfac:brick': 'fachada de tijolo aparente', 'rfac:cream': 'fachada creme', 'rfac:blue': 'fachada azul-clara', 'rfac:green': 'fachada verde-clara', 'rfac:ochre': 'fachada amarelo-ocre', 'rfac:pink': 'fachada rosa',
  'rdoor:green': 'porta verde', 'rdoor:red': 'porta vermelha', 'rdoor:blue': 'porta azul', 'rdoor:yellow': 'porta amarela', 'rdoor:brown': 'porta marrom', 'rdoor:white': 'porta branca',
  'rfl:1': 'um andar', 'rfl:2': 'dois andares', 'rroof:red': 'telhado vermelho', 'rroof:gray': 'telhado cinza', 'rroof:brown': 'telhado marrom',
  'rdst:visor': 'um visor na porta', 'rdst:frame': 'moldura branca em volta da porta',
  'rmail:red': 'caixa de correio vermelha', 'rmail:blue': 'caixa de correio azul', 'rmail:yellow': 'caixa de correio amarela', 'rmail:green': 'caixa de correio verde',
  'rawn:red': 'toldo vermelho na porta', 'rawn:green': 'toldo verde na porta', 'rawn:blue': 'toldo azul na porta', 'rawn:yellow': 'toldo amarelo na porta',
  rflower: 'floreira na janela', rbike: 'uma bicicleta na entrada', rbench: 'um banquinho na frente',
  'wtype:mech': 'placa de mecânica', 'wtype:tire': 'placa de borracharia', 'wtype:tools': 'placa de ferramentas', 'wtype:market': 'placa de mercadinho',
  'wgate:blue': 'portão azul', 'wgate:red': 'portão vermelho', 'wgate:gray': 'portão cinza', 'wgate:green': 'portão verde', 'wgate:yellow': 'portão amarelo',
  'wawn:red': 'toldo vermelho', 'wawn:green': 'toldo verde', 'wawn:blue': 'toldo azul', 'wawn:yellow': 'toldo amarelo',
  wtires: 'pneus empilhados ao lado', wtools: 'ferramentas e peças expostas', wcar: 'um carro estacionado na frente',
  // Modernista (Nível 18)
  'mdfac:white': 'fachada branca', 'mdfac:gray': 'fachada cinza', 'mdfac:beige': 'fachada bege', 'mdfl:1': 'um andar', 'mdfl:2': 'dois andares',
  'mddoor:blue': 'porta azul', 'mddoor:red': 'porta vermelha', 'mddoor:yellow': 'porta amarela', 'mddoor:green': 'porta verde', 'mddoor:black': 'porta preta', 'mddoor:orange': 'porta laranja',
  'mdgar:roll': 'garagem com portão de enrolar cinza', 'mdgar:wood': 'garagem com portão de madeira', 'mdgar:black': 'garagem com portão preto',
  mdwood: 'painel de madeira na fachada', mdstone: 'jardim de pedras claras', mdvase: 'dois vasos grandes ao lado da porta', mdperg: 'pergolado com plantas',
  mdbench: 'um banco no jardim', mdpool: 'um espelho-d\'água no jardim',
  'mdsh:cafe': 'letreiro de café', 'mdsh:bakery': 'letreiro de padaria', 'mdsh:flowers': 'letreiro de floricultura', 'mdsh:books': 'letreiro de livraria',
  'mdsh:optic': 'letreiro de ótica', 'mdsh:market': 'letreiro de mercado',
  // Cachoeira (Nível 23)
  'loc:bridge': 'perto da ponte', 'cy:balcony': 'sacada de madeira virada para o desfiladeiro', 'cy:garden': 'um jardinzinho na frente',
  'cy:vases': 'vasos de flores na porta', 'cy:canopy': 'cobertura de madeira na porta',
  // Veneza
  'vfac:cream': 'fachada creme', 'vfac:ochre': 'fachada ocre', 'vfac:terracotta': 'fachada terracota', 'vfac:rose': 'fachada rosa envelhecido',
  'vfac:red': 'fachada vermelho queimado', 'vsh:green': 'persianas verdes', 'vsh:blue': 'persianas azuis', 'vsh:brown': 'persianas marrons',
  'vfl:2': 'dois andares', 'vfl:3': 'três andares', 'vfl:4': 'quatro andares', varch: 'janelas em arco',
  'vaw:red': 'toldo vermelho', 'vaw:green': 'toldo verde', 'vaw:blue': 'toldo azul',
  'v:pots': 'dois vasos na sacada', 'v:flowers': 'flores nas janelas', 'v:laundry': 'roupas no varal', 'v:poles': 'postes listrados na entrada',
  'v:lamp': 'uma lanterna na porta',
  'loc:rialto': 'perto da Ponte de Rialto', 'loc:cafe': 'perto do café',
  'loc:stopN': 'perto da parada do bonde da entrada', 'loc:stopS': 'perto da parada do bonde dos galpões', 'loc:stopW': 'perto da parada oeste do bonde', 'loc:stopE': 'perto da parada leste do bonde',
  'loc:stopSul': 'perto da parada sul do bonde', 'loc:stopC': 'perto da parada central do bonde',
  // Órbita (Nível 17)
  'mshape:cyl': 'formato de cilindro em pé', 'mshape:capsule': 'formato de cápsula deitada', 'mshape:dome': 'formato de cúpula',
  'mstripe:blue': 'faixa azul', 'mstripe:orange': 'faixa laranja', 'mstripe:green': 'faixa verde', 'mstripe:yellow': 'faixa amarela',
  'mwin:1': 'uma janela circular', 'mwin:2': 'duas janelas circulares', 'mwin:3': 'três janelas circulares',
  'mdoor:blue': 'porta azul', 'mdoor:orange': 'porta laranja', 'mdoor:green': 'porta verde', 'mdoor:yellow': 'porta amarela',
  'mtop:antenna': 'uma antena no teto', 'mtop:dish': 'uma parabólica no teto', 'mtop:solar': 'painéis solares no teto',
  'loc:greenhouse': 'na vila da estufa grande', 'loc:rocket': 'na vila do foguete', 'loc:antenna': 'na vila da torre de antenas', 'loc:solar': 'na vila dos painéis solares',
  // Colheita (Nível 15)
  'rgate:blue': 'porteira azul', 'rgate:red': 'porteira vermelha', 'rgate:yellow': 'porteira amarela', 'rgate:white': 'porteira branca', 'rgate:green': 'porteira verde',
  'rwall:white': 'paredes brancas', 'rwall:yellow': 'paredes amarelas', 'rwall:blue': 'paredes azuis', 'rwall:pink': 'paredes cor-de-rosa',
  'rwall:red': 'paredes vermelhas', 'rwall:brown': 'paredes de madeira escura', 'rwall:gray': 'paredes cinza', 'rwall:green': 'paredes verdes',
  'rroof:red': 'telhado vermelho', 'rroof:blue': 'telhado azul', 'rroof:green': 'telhado verde', 'rroof:gray': 'telhado cinza',
  'rcrop:corn': 'um milharal no terreno', 'rcrop:garden': 'uma horta no terreno', 'rcrop:orchard': 'árvores frutíferas no terreno', 'rcrop:pasture': 'um pasto com vacas no terreno',
  'rf:scarecrow': 'um espantalho perto da cerca', 'rf:barrow': 'um carrinho de mão na frente', 'rf:wood': 'uma pilha de lenha no quintal',
  'rf:coop': 'um pequeno galinheiro no terreno', 'rf:veg': 'uma hortinha no quintal', 'rf:boots': 'botas junto à porta', 'rf:pots': 'vasos e um regador na entrada',
  'ws:snowman:red': 'um boneco de neve de cachecol vermelho', 'ws:snowman:blue': 'um boneco de neve de cachecol azul', 'ws:snowman:yellow': 'um boneco de neve de cachecol amarelo',
  'ws:snowman:green': 'um boneco de neve de cachecol verde', 'ws:sled': 'um trenó junto à parede', 'ws:skis': 'esquis apoiados na parede', 'ws:shovel': 'uma pá de neve na entrada',
  'ws:wood': 'lenha empilhada sob uma coberturinha', 'ws:pine': 'um pinheirinho nevado no quintal', 'ws:icicles': 'pingentes de gelo no beiral', 'ws:lights': 'luzes coloridas na fachada',
  'gwall:cream': 'fachada creme', 'gwall:white': 'fachada branca', 'gwall:peach': 'fachada pêssego', 'gwall:sage': 'fachada verde-clara', 'gwall:gray': 'fachada cinza-clara',
  'groof:red': 'telhado vermelho', 'groof:gray': 'telhado cinza', 'groof:green': 'telhado verde', 'groof:brown': 'telhado marrom',
  'gdoor:red': 'porta vermelha', 'gdoor:blue': 'porta azul', 'gdoor:yellow': 'porta amarela', 'gdoor:green': 'porta verde', 'gdoor:white': 'porta branca',
  'gfl:1': 'um andar só', 'gfl:2': 'dois andares',
  'gflow:red': 'flores vermelhas', 'gflow:yellow': 'flores amarelas', 'gflow:purple': 'flores roxas', 'gflow:white': 'flores brancas', 'gflow:pink': 'flores cor-de-rosa',
  'gperg': 'um pergolado', 'gbench': 'um banco na varanda',
  'gmod:chalet': 'o bico do telhado virado para a rua', 'gmod:ell': 'formato em L', 'gmod:garage': 'uma garagem ao lado',
  'ggate:blue': 'portão azul', 'ggate:red': 'portão vermelho', 'ggate:white': 'portão branco', 'ggate:green': 'portão verde', 'ggate:black': 'portão preto',
  'gmail:red': 'caixa de correio vermelha', 'gmail:blue': 'caixa de correio azul', 'gmail:yellow': 'caixa de correio amarela', 'gmail:green': 'caixa de correio verde',
  'gdeco:statue': 'uma escultura na entrada', 'gdeco:vases': 'vasos na entrada',
  'loc:gazebo': 'perto do coreto', 'loc:playground': 'em frente ao playground', 'loc:flowers': 'perto do jardim de flores', 'loc:court': 'perto da quadra',
  'loc:gate': 'perto da portaria', 'loc:parkdoor': 'com a entrada pelo parque', 'loc:lake': 'perto do lago', 'loc:club': 'perto do clube',
  'rporch': 'uma varanda', 'rx:tank': 'uma caixa-d’água', 'rx:hay': 'fardos de feno na entrada',
  // prédios contemporâneos (Nível 14)
  'mfac:white': 'volumes brancos', 'mfac:gray': 'volumes cinza-escuros', 'mglass:blue': 'vidros azuis', 'mglass:aqua': 'vidros verde-água',
  'mcan:wood': 'marquise de madeira', 'mcan:white': 'marquise branca', 'mtop:trees': 'árvores na cobertura',
  'mtop:pergola': 'um pergolado na cobertura', 'mtop:flag': 'um mastro com bandeira no topo',
  // Morro
  'ffac:blue': 'fachada azul', 'ffac:yellow': 'fachada amarela', 'ffac:coral': 'fachada coral', 'ffac:green': 'fachada verde',
  'ffac:beige': 'fachada bege', 'ffac:brick': 'tijolo aparente', 'ffl:1': 'um andar só', 'ffl:2': 'dois andares', 'ffl:3': 'três andares',
  'ftank:1': 'uma caixa-d’água azul', 'ftank:2': 'duas caixas-d’água azuis', 'faw:red': 'toldo vermelho', 'faw:blue': 'toldo azul',
  'faw:green': 'toldo verde', 'fv:laundry': 'um varal com roupas na laje', 'fv:pots': 'vasos de plantas na porta', 'fv:stairs': 'uma escada até a laje',
  'loc:low': 'na parte baixa do bairro', 'loc:mid': 'no meio do morro', 'loc:high': 'na parte alta do bairro',
  'loc:stairtop': 'no alto da escadaria', 'loc:stairfoot': 'ao pé da escadaria', 'loc:market': 'ao lado do mercadinho',
  'loc:court': 'perto da quadra', 'loc:square': 'perto da pracinha',
  'gnd:dumpster': 'uma caçamba na frente', 'gnd:moto': 'uma moto estacionada na frente', 'gnd:guard': 'uma guarita na entrada', 'gnd:bikes': 'um bicicletário na frente',
};

/** Como se referir ao destino: casa (feminino) ou prédio (masculino). */
export const REF = {
  house: { a: 'a casa', da: 'da casa', na: 'na casa', n: 'casa' },
  shop: { a: 'o prédio', da: 'do prédio', na: 'no prédio', n: 'prédio' },
  oficina: { a: 'a oficina', da: 'da oficina', na: 'na oficina', n: 'oficina' }, borracharia: { a: 'a borracharia', da: 'da borracharia', na: 'na borracharia', n: 'borracharia' },
  mercadinho: { a: 'o mercadinho', da: 'do mercadinho', na: 'no mercadinho', n: 'mercadinho' },
  padaria: { a: 'a padaria', da: 'da padaria', na: 'na padaria', n: 'padaria' }, ferraria: { a: 'a ferraria', da: 'da ferraria', na: 'na ferraria', n: 'ferraria' },
  taverna: { a: 'a taverna', da: 'da taverna', na: 'na taverna', n: 'taverna' }, tecelagem: { a: 'a oficina de tecidos', da: 'da oficina de tecidos', na: 'na oficina de tecidos', n: 'oficina de tecidos' },
  store: { a: 'a loja', da: 'da loja', na: 'na loja', n: 'loja' },
  ware: { a: 'o galpão', da: 'do galpão', na: 'no galpão', n: 'galpão' },
  module: { a: 'o módulo', da: 'do módulo', na: 'no módulo', n: 'módulo' },
  barn: { a: 'o celeiro', da: 'do celeiro', na: 'no celeiro', n: 'celeiro' },
  bar: { a: 'o bar', da: 'do bar', na: 'no bar', n: 'bar' },
};

export const COMPLAINTS = [
  'De novo entrega errada, e isso não é meu!',
  'Eu pedi uma pizza, e isso claramente não é uma pizza.',
  'Meu filho, nem meu nome está nisso.',
  'Você tocou a campainha no meio da minha novela pra isso?',
  'Moço, eu só assino jornal, e nem leio.',
  'Não é meu, mas obrigado pela visita, eu acho.',
  'Não é meu; o gato até ficou animado, mas não é.',
  'Tá escrito “frágil” e você sacudiu até aqui pra nada?',
  'Eu tenho cara de quem compra isso?',
  'Você viu meu quintal e pensou que eu tinha comprado uma prancha?',
  'Terceira caixa errada da semana, e ainda é quarta-feira!',
  'Eu estava cochilando, e isso nem é meu.',
];
/** Veneza (moradores comuns): falas principalmente em português, com uma expressão italiana de vez em quando. */
export const VEN_LINES = {
  complaints: [
    'Mamma mia! Outra entrega errada? Isso não é meu.',
    'O endereço está certo. Você só está no canal errado.',
    'Buongiorno! Bonita caixa, mas não é minha.',
    'Eu estava regando as flores da janela, e isso nem é meu.',
    'Aqui só chega pão e peixe fresco. Isso não é meu.',
    'Não é meu, mas obrigado pela visita.',
    'Atravessou a ponte toda para isso? Não é meu.',
    'O gato até se animou, mas não é meu.',
    'Isso não é meu. Aqui em Veneza todo mundo erra de ponte um dia.',
    'Vamos ver esse endereço de novo… Não, não é aqui.',
    'Eu estava pendurando a roupa sobre o canal, e essa caixa não é minha.',
    'A maré subiu um pouquinho hoje, mas nem ela trouxe isso para mim.',
    'Buongiorno! Pena, mas não encomendei nada essa semana.',
    'Acabei de voltar da feira do Rialto. Isso não é meu.',
    'Os barcos passam o dia todo aqui na frente, e nenhum trouxe isso para mim.',
    'Não é meu. Aqui as casas são todas parecidas, eu sei.',
    'Que pena, achei que era o meu livro de receitas. Não é meu.',
    'Estava tomando um café na janela vendo as gôndolas. Isso não é meu.',
  ],
  hints: [
    (p, r) => `Acho que é ${r.da} com ${p}.`,
    (p, r) => `Prego! Tenta ${r.na} com ${p}.`,
    (p, r) => `Se não me engano, é ${r.da} com ${p}.`,
    (p, r) => `Deve ser ${r.da} com ${p}, eu acho.`,
    (p, r) => `Pergunta ${r.na} com ${p}. Boa sorte nos canais!`,
    (p, r) => `Atravessa uma ou duas pontes e procura ${r.a} com ${p}.`,
    (p, r) => `Meu vizinho falou ${r.da} com ${p}. Tenta lá.`,
    (p, r) => `Pelo jeito, é ${r.da} com ${p}. Cuidado com as curvas do canal.`,
  ],
  repeats: [
    (p, r) => `De novo você? Já falei: acho que é ${r.da} com ${p}.`,
    (p, r) => `Mamma mia… Continua não sendo meu. É ${r.da} com ${p}, como eu disse.`,
    (p, r) => `Voltou pelo canal só para isso? É ${r.da} com ${p}.`,
  ],
  nohint: ['Sei lá de quem é; segue a pista que você tem aí.', 'Não faço ideia de quem seja, sinceramente.', 'Pergunta para outro vizinho, porque eu não sei.',
    'Não sei, não. Talvez do outro lado da ponte?', 'Eu só conheço quem compra pão na mesma padaria que eu. Esse eu não sei.'],
  nohintAgain: ['Ainda não é meu! Segue a pista que você tem.', 'Voltou? Continua não sendo meu. Ciao!', 'Continua não sendo meu, mas a vista do canal vale a volta.'],
  success: [
    'Grazie! Finalmente chegou. Meu café já estava esfriando!',
    'Era essa mesmo! Grazie mille pela paciência!',
    'Ah, minha encomenda! Achei que tinha caído no canal. Obrigado!',
    'Que maravilha! Chegou sequinha, mesmo com tanta água por aqui. Grazie!',
    'Buongiorno! É a minha, sim. Atravessar essas pontes todas não é fácil.',
  ],
};
/** Colheita (moradores comuns): português natural e acolhedor, com jeito de roça sem exagero no sotaque. */
export const FARM_LINES = {
  complaints: [
    'Ô, isso não é meu, não. Eu só encomendei semente de abóbora.',
    'Pois é… abri a porteira à toa, essa caixa não é daqui.',
    'Eu estava tratando das galinhas, e isso nem é meu.',
    'Não é meu, mas obrigado por vir até a roça.',
    'Ô, moço, aqui só chega adubo e ração. Isso não é meu.',
    'Pois é, errou de sítio. Acontece, essas estradas confundem mesmo.',
    'Eu estava colhendo milho desde cedo, e isso não é meu.',
    'Não é meu, não. Mas leva um pouco de laranja do pomar pra viagem.',
    'Ô, deu uma volta danada até aqui pra nada… não é meu.',
    'Pois é, essa encomenda não é minha. Fecha a porteira na saída, viu?',
  ],
  hints: [
    (p, r) => `Ô, acho que é ${r.da} com ${p}.`,
    (p, r) => `Pode seguir por essa estrada. Deve ser ${r.da} com ${p}.`,
    (p, r) => `Pois é, se não me engano é ${r.da} com ${p}.`,
    (p, r) => `Tenta ${r.na} com ${p}. Fica logo ali pra frente.`,
    (p, r) => `Pergunta ${r.na} com ${p}. Pode seguir, é pertinho.`,
  ],
  repeats: [
    (p, r) => `Ô, de novo você? Já falei: acho que é ${r.da} com ${p}.`,
    (p, r) => `Pois é, continua não sendo meu. É ${r.da} com ${p}, como eu disse.`,
  ],
  nohint: ['Sei lá de quem é. Pode seguir a pista que você tem aí.', 'Não faço ideia, sinceramente. Pergunta pra outro vizinho.', 'Não sei não, moço. Aqui na roça cada um cuida do seu.'],
  nohintAgain: ['Ô, ainda não é meu! Segue a pista que você tem.', 'Voltou? Continua não sendo meu, viu?'],
  success: [
    'Muito obrigado! Já estava esperando essa encomenda desde cedo.',
    'Chegou numa boa hora! Eu estava voltando da horta.',
    'Ô, que beleza! Era essa mesmo. Obrigado pela paciência na estrada de terra!',
  ],
};
// Órbita: os moradores são ETs simpáticos (pistas sempre do destino real; comentários sobre a vida espacial)
export const MOON_LINES = {
  complaints: [
    'Entrega terrestre? Que chique! Pena que não é minha.',
    'Bip-bop… não, isso não é meu. Eu só encomendei poeira de cometa.',
    'Abri a escotilha à toa: essa caixa não é daqui.',
    'Que pena! Achei que fossem as minhas meias antigravidade.',
    'Não é meu. Mas obrigado por vir até este lado da lua!',
    'Eu estava regando as plantas da estufa, e isso nem é meu.',
    'Aqui só chegam peças de foguete. Isso não é meu, não.',
    'Hm, não… meu radar diz que essa caixa é de outro módulo.',
    'Cuidado com a gravidade: quase deixei cair, e nem é meu!',
    'Errou de módulo, terráqueo. Acontece, a lua é redondinha.',
  ],
  hints: [
    (p, r) => `Acho que é ${r.da} com ${p}.`,
    (p, r) => `Tenta ${r.na} com ${p}. Cuidado para não passar direto pelo horizonte!`,
    (p, r) => `Meu radar apita para ${r.a} com ${p}.`,
    (p, r) => `Pergunta ${r.na} com ${p}. Dá a volta na lua que você chega.`,
    (p, r) => `Se não me engano, é ${r.da} com ${p}. Fica logo depois da curva… tudo aqui é curva!`,
  ],
  repeats: [
    (p, r) => `De novo você? Já falei: acho que é ${r.da} com ${p}.`,
    (p, r) => `Continua não sendo meu, terráqueo. É ${r.da} com ${p}, como eu disse.`,
  ],
  nohint: ['Não faço ideia. Meu radar está em manutenção.', 'Sei lá, terráqueo. Segue a pista que você tem.', 'Não sei, não. Aqui cada um cuida da sua cratera.'],
  nohintAgain: ['Ainda não é meu! Segue a sua pista.', 'Voltou? Continua não sendo meu, viu?'],
  success: [
    'Era essa mesmo! Entrega terrestre, que chique! Obrigado!',
    'Chegou! Nem precisei esperar o próximo foguete.',
    'Bip-bip de alegria! Obrigado pela viagem até aqui em cima… ou aqui embaixo?',
  ],
};
export const FEATURE_COMPLAINTS = {
  flamingo: 'Só porque eu tenho um flamingo não quer dizer que eu compro tudo pela internet.',
  gnome: 'Nem o meu gnomo sabe de quem é isso, e ele sabe de tudo.',
  doghouse: 'Se fosse ração, o cachorro aceitava, mas não é.',
  chimney: 'Tô cuidando do fogão a lenha, e isso não é meu!',
  dish: 'Tenho trezentos canais e nenhum deles mandou isso.',
  pool: 'Tô de maiô, não vou assinar nada, e isso não é meu!',
  tires: 'Se não for pneu, não é meu.',
  trampoline: 'Pulei até aqui pra atender e nem é meu?',
  cactus: 'Meu cacto é mais simpático que essa caixa, e ela nem é minha.',
  swing: 'Eu tava no balanço, e isso nem é meu!',
};
export const HINTS = [
  (p, r) => `Acho que é do pessoal ${r.da} com ${p}.`,
  (p, r) => `Talvez seja ${r.da} com ${p}.`,
  (p, r) => `Se não me engano, é ${r.da} com ${p}.`,
  (p, r) => `Tenta lá ${r.na} com ${p}, acho que é de lá.`,
  (p, r) => `Deve ser ${r.da} com ${p}, eu acho.`,
];
export const REPEATS = [
  (p, r) => `De novo você? Já falei: acho que é ${r.da} com ${p}.`,
  (p, r) => `Continua não sendo meu. Acho que é ${r.da} com ${p}, como eu disse.`,
];
export const NOHINT = [
  'E sei lá de quem é; segue a pista que você tem aí.',
  'Não faço ideia de quem seja, sinceramente.',
  'Pergunta pra outro, porque eu não sei.',
];
export const NOHINT_AGAIN = [
  'Ainda não é meu! Segue a pista que você tem.',
  'Voltou? Continua não sendo meu.',
];
// Narrador (casa do K, que nunca larga o jornal): sempre entre parênteses
export const NARRATOR = {
  success: [
    '(Ele nem tirou os olhos do jornal. Mas o endereço confere: a encomenda era dele mesmo!)',
    '(Nenhuma palavra, nenhum olhar... só o rangido da cadeira. Pelo menos desta vez, a casa era a certa.)',
  ],
  hint: [
    (p, r) => `(Ele continua lendo o jornal, como se você nem estivesse ali... Essa não parece ser a casa certa. Talvez seja ${r.a} com ${p}?)`,
    (p, r) => `(A cadeira balança, a página vira, e mais nada. Não deve ser aqui... Quem sabe ${r.a} com ${p}?)`,
  ],
  repeat: [
    (p, r) => `(Ele segue lendo, balançando de leve. Você já tinha pensado nisso: talvez seja ${r.a} com ${p}...)`,
  ],
  nohint: [
    '(Ele nem levantou os olhos do jornal... E essa casa nem estava na pista. Melhor seguir a pista.)',
  ],
  nohintAgain: [
    '(De novo aqui? Ele continua lendo, balançando na cadeira. Não é aqui.)',
  ],
};
export const SUCCESS = [
  'Finalmente, era essa mesmo! Muito obrigado!',
  'Ah, minha encomenda, achei que tinha fugido! Obrigado!',
  'Era essa mesmo! Obrigado pela paciência!',
];

// Aparência dos moradores (índice = índice da casa)
export const SHIRTS = ['#e4572e', '#4f86c6', '#7bb661', '#f2a541', '#9b5de5', '#ef476f', '#06aed5', '#8d6e63'];
export const HAIRS = ['#3b2a1a', '#9e9e9e', '#f0d58c', '#6b3e26', '#222222', '#d9d9d9', '#a0522d', '#555555'];
