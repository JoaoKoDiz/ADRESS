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
  const names = [
    'Seu Tavares', 'Dona Rute', 'Seu Gervásio', 'Dona Cleusa', 'Seu Amaro', 'Dona Dalva', 'Seu Osório', 'Dona Nilza', 'Seu Bráulio', 'Dona Edite',
    'Seu Quirino', 'Dona Zilda', 'Seu Valter', 'Dona Isaura', 'Seu Nonato', 'Dona Jandira'];
  const R = ['red', 'blue', 'green', 'gray'], GT = ['blue', 'red', 'yellow', 'green'];
  const IT = [['pallets'], ['forklift'], ['truck'], ['barrels'], ['pallets', 'forklift'], ['truck', 'barrels'], ['forklift', 'barrels'], ['pallets', 'truck']];
  for (let i = 0; i < 16; i++) HOUSES.push({ name: names[i], kind: 'ware', wroof: R[i % 4], gate: GT[(i + Math.floor(i / 4)) % 4], items: IT[(i * 3) % 8] });
}
/** Índices dos galpões em HOUSES. */
export const WARES = [...Array(16).keys()].map(k => 88 + k);
// ---- Casas gêmeas (Bairro 10, índices 104–109): cópias das casas abaixo, sempre do outro lado do canal ----
const TWIN_OF = [0, 1, 2, 6, 13, 9];
const TWIN_NAMES = ['Seu Juvenal', 'Dona Cidinha', 'Seu Benedito', 'Dona Arlete', 'Seu Romeu', 'Dona Marli'];
TWIN_OF.forEach((o, i) => { const c = HOUSES[o]; HOUSES.push({ name: TWIN_NAMES[i], roof: c.roof, door: c.door, f: c.f.slice(), twin: o }); });
/** Pares [original, gêmea]. */
export const TWINS = TWIN_OF.map((o, i) => [o, 104 + i]);

// ---- Veneza (Nível 12, índices 110–169): casas estreitas de 2 a 4 andares, viradas para os canais ----
// fachada (creme, ocre, terracota, rosa envelhecido, vermelho queimado), persianas, andares e itens visíveis da água.
export const VEN_FACADE = { cream: '#efe0bd', ochre: '#d9a441', terracotta: '#c8693f', rose: '#d99a94', red: '#a8432e' };
export const VEN_SHUTTER = { green: '#3f7a4a', blue: '#3a6688', brown: '#6b4428' };
export const VEN_AWNING = { red: '#c8402f', green: '#3c8f52', blue: '#2f6fb0' };
{
  const names = [
    'Signora Lucia', 'Signor Marco', 'Signora Bianca', 'Signor Paolo', 'Signora Giulia', 'Signor Enzo', 'Signora Rosa', 'Signor Bruno',
    'Signora Elena', 'Signor Carlo', 'Signora Marta', 'Signor Piero', 'Signora Teresa', 'Signor Gino', 'Signora Ada', 'Signor Luigi', 'Signora Nina',
    'Signor Franco', 'Signora Vera', 'Signor Aldo', 'Signora Chiara', 'Signor Matteo', 'Signora Francesca', 'Signor Giorgio', 'Signora Silvia',
    'Signor Stefano', 'Signora Paola', 'Signor Roberto', 'Signora Alessandra', 'Signor Davide', 'Signora Laura', 'Signor Massimo', 'Signora Serena',
    'Signor Fabio', 'Signora Claudia', 'Signor Sergio', 'Signora Anna', 'Signor Vittorio', 'Signora Rita', 'Signor Renzo', 'Signora Carla',
    'Signor Tommaso', 'Signora Lidia', 'Signor Dario', 'Signora Gemma', 'Signor Nicola', 'Signora Sofia', 'Signor Michele', 'Signora Agnese',
    'Signor Ugo', 'Signora Ornella', 'Signor Valerio', 'Signora Livia', 'Signor Pietro', 'Signora Ilaria', 'Signor Emilio', 'Signora Beatrice',
    'Signor Rocco', 'Signora Donatella', 'Signor Fausto'];
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
  const names = [
    'Dona Cida', 'Seu Zé', 'Dona Neide', 'Seu Tião', 'Dona Rosinha', 'Seu Valdir', 'Dona Lurdes', 'Seu Jorginho', 'Dona Marlene', 'Seu Nenê',
    'Dona Zezé', 'Seu Raimundo', 'Dona Socorro', 'Seu Moacir', 'Dona Penha', 'Seu Biu', 'Dona Glória', 'Seu Damião', 'Dona Iracema', 'Seu Chico',
    'Dona Kátia', 'Seu Wellington', 'Dona Jussara', 'Seu Edinho', 'Dona Rosângela', 'Seu Juninho', 'Dona Vânia', 'Seu Paulinho', 'Dona Graça',
    'Seu Tonhão', 'Dona Eliane', 'Seu Lelo', 'Dona Fia', 'Seu Didi', 'Dona Zuzu', 'Seu Robson', 'Dona Cleide', 'Seu Adilson', 'Dona Marinalva',
    'Seu Gerson', 'Dona Luzia', 'Seu Wilson', 'Dona Nalva', 'Seu Edvaldo', 'Dona Jurema', 'Seu Josué', 'Dona Selma', 'Seu Sidnei', 'Dona Tânia',
    'Seu Valtinho', 'Dona Celeste', 'Seu Reinaldo', 'Dona Ivete', 'Seu Juarez', 'Dona Carminha', 'Seu Wanderley', 'Dona Odete', 'Seu Lázaro',
    'Dona Margarida', 'Seu Ailton', 'Dona Benedita', 'Seu Mauro', 'Dona Sueli', 'Seu Arnaldo'];
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
  const names = [
    'Seu Zeca', 'Dona Benta', 'Seu Juca', 'Dona Filó', 'Seu Tonico', 'Dona Lourdes', 'Seu Bastião', 'Dona Zica', 'Seu Quim', 'Dona Nair', 'Seu Lico',
    'Dona Cotinha', 'Seu Mané', 'Dona Rita', 'Seu Dito', 'Dona Antônia', 'Seu Jeremias', 'Dona Quitéria', 'Seu Joaquim', 'Dona Zulmira',
    'Seu Lindolfo', 'Dona Conceição', 'Seu Belarmino', 'Dona Sebastiana', 'Seu Firmino', 'Dona Tonha', 'Seu Aristeu', 'Dona Mariquinha',
    'Seu Olegário', 'Dona Josefa', 'Seu Venâncio', 'Dona Generosa', 'Seu Ananias', 'Dona Florinda', 'Seu Malaquias', 'Dona Ditinha', 'Seu Honório',
    'Dona Clarinda', 'Seu Teodoro', 'Dona Rosária'];
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
  const names = [
    'Zorp', 'Blib', 'Kiki-7', 'Glorbo', 'Nix', 'Pipo Estelar', 'Lumi', 'Quarkinho', 'Vega-9', 'Bzzt', 'Orbi', 'Tilo Cometa', 'Plim', 'Nebulina',
    'Gruk', 'Zuzu-3', 'Fli', 'Kroonk', 'Selene-2', 'Bip Bop', 'Ziggy Lunar', 'Moxo', 'Trix', 'Astro Bel', 'Gloop', 'Quasarina', 'Yuk-12',
    'Dona Cratera', 'Seu Asteroide', 'Tita', 'Vorb', 'Lulu Lunar'];   // os ETs moradores
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
  const names = [
    'Dona Clarice', 'Seu Ronaldo', 'Dona Heloísa', 'Seu Otávio', 'Dona Sílvia', 'Seu Mauro', 'Dona Lúcia', 'Seu Augusto', 'Dona Marta',
    'Seu Fernando', 'Dona Teresa', 'Seu Caio', 'Dona Patrícia', 'Seu Ricardo', 'Dona Juliana', 'Seu Rodrigo', 'Dona Renata', 'Seu Marcelo',
    'Dona Fernanda', 'Seu Gustavo', 'Dona Camila', 'Seu Eduardo', 'Dona Beatriz', 'Seu Leonardo', 'Dona Mariana', 'Seu Henrique', 'Dona Adriana',
    'Seu Rafael', 'Dona Cristina', 'Seu Sérgio', 'Dona Débora', 'Seu Alexandre', 'Dona Lívia', 'Seu Felipe', 'Dona Mônica', 'Seu Gilberto',
    'Dona Vanessa', 'Seu Rogério', 'Dona Bianca', 'Seu Thiago', 'Dona Letícia', 'Seu Vinícius', 'Dona Carolina', 'Seu Daniel', 'Dona Simone',
    'Seu André', 'Dona Priscila', 'Seu Márcio', 'Dona Luciana', 'Seu Fábio', 'Dona Gabriela', 'Seu Roberto', 'Dona Raquel', 'Seu Luciano',
    'Dona Elisa', 'Seu Maurício', 'Dona Natália', 'Seu Renato', 'Dona Viviane', 'Seu Bruno', 'Dona Paula', 'Seu Cláudio', 'Dona Aline', 'Seu Diego'];
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
  const names = [
    'Seu Lúcio', 'Dona Lina', 'Seu Oscar', 'Dona Lota', 'Seu Rino', 'Dona Zélia', 'Seu Paulo', 'Dona Carmen', 'Seu Affonso', 'Dona Ruth',
    'Seu Joaquim', 'Dona Iris', 'Seu Vilanova', 'Dona Mina', 'Seu Burle', 'Dona Janete', 'Seu Gregori', 'Dona Rosa', 'Seu Sérgio', 'Dona Chu',
    'Seu Severiano', 'Dona Giselda', 'Seu Abelardo', 'Dona Olga', 'Seu Ícaro', 'Dona Helena', 'Seu Rodrigo', 'Dona Tereza', 'Seu Marcos',
    'Dona Yolanda', 'Seu Jaime', 'Dona Lygia', 'Seu David', 'Dona Nise', 'Seu Lino', 'Dona Anita', 'Seu Flávio', 'Dona Tarsila', 'Seu Heitor',
    'Dona Cecília'];
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
  const names = [
    'Seu Zé', 'Dona Cida', 'Seu Tonho', 'Dona Neide', 'Seu Valdir', 'Dona Rosa', 'Seu Nelson', 'Dona Fátima', 'Seu Geraldo', 'Dona Lourdes',
    'Seu Bené', 'Dona Zuleica', 'Seu Juca', 'Dona Irene', 'Seu Ademir', 'Dona Adélia', 'Seu Aílton', 'Dona Aparecida', 'Seu Baltazar',
    'Dona Benedita', 'Seu Cícero', 'Dona Cleonice', 'Seu Dirceu', 'Dona Dalva', 'Seu Edgar', 'Dona Divina', 'Seu Expedito', 'Dona Edna',
    'Seu Florêncio', 'Dona Elza', 'Seu Genésio', 'Dona Ercília', 'Seu Hermes', 'Dona Eunice', 'Seu Idalino', 'Dona Filomena', 'Seu Jairo',
    'Dona Geni', 'Seu Jurandir', 'Dona Hilda', 'Seu Lauro', 'Dona Ilda', 'Seu Leandro', 'Dona Iolanda', 'Seu Manoel', 'Dona Jacira', 'Seu Milton',
    'Dona Judite', 'Seu Nivaldo', 'Dona Lindalva', 'Seu Orlando', 'Dona Lúcia', 'Seu Pedro', 'Dona Madalena', 'Seu Quintino', 'Dona Marlene',
    'Seu Raimundo', 'Dona Neusa', 'Seu Reginaldo', 'Dona Noêmia', 'Seu Sebastião', 'Dona Odila', 'Seu Silvério', 'Dona Olinda', 'Seu Tadeu',
    'Dona Palmira', 'Seu Ubiratã', 'Dona Quitéria', 'Seu Valdemar', 'Dona Rosalina', 'Seu Waldir', 'Dona Ruth', 'Seu Wagner', 'Dona Sandra',
    'Seu Zacarias', 'Dona Sueli', 'Seu Alcides', 'Dona Tereza', 'Seu Arlindo', 'Dona Valdete', 'Seu Benício', 'Dona Vilma', 'Seu Cláudio',
    'Dona Zilda', 'Seu Domingos', 'Dona Zulmira', 'Seu Elias', 'Dona Alzira', 'Seu Euclides', 'Dona Amélia', 'Seu Gilmar', 'Dona Aurora',
    'Seu Hamilton', 'Dona Celina', 'Seu Horácio', 'Dona Conceição', 'Seu Ivan', 'Dona Dirce', 'Seu Joel', 'Dona Doralice', 'Seu Lourival',
    'Dona Ester', 'Seu Marcílio', 'Dona Glória', 'Seu Noel', 'Dona Helena', 'Seu Osmar', 'Dona Ivone', 'Seu Paulino', 'Dona Joana', 'Seu Rubens',
    'Dona Laurinda', 'Seu Saulo', 'Dona Leonor', 'Seu Teodoro', 'Dona Maria', 'Seu Vicente', 'Dona Nair', 'Seu Wilson', 'Dona Rita'];
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
  const names = [
    'Mestre Bento', 'Dona Brites', 'Seu Gonçalo', 'Dona Leonor', 'Mestre Afonso', 'Dona Inês', 'Seu Martim', 'Dona Urraca', 'Mestre Vasco',
    'Mestra Mécia', 'Seu Fernão', 'Dona Guiomar', 'Mestre Nuno', 'Dona Beatriz', 'Seu Sancho', 'Dona Aldonça', 'Mestre Pero', 'Dona Branca',
    'Seu Lopo', 'Mestra Catarina', 'Mestre Gil', 'Dona Constança', 'Seu Álvaro', 'Dona Elvira', 'Mestre Diogo', 'Dona Filipa', 'Seu Estêvão',
    'Dona Genebra', 'Mestre Garcia', 'Mestra Isabel', 'Seu Henrique', 'Dona Joana', 'Mestre Lourenço', 'Dona Maior', 'Seu Mem', 'Dona Marinha',
    'Mestre Paio', 'Dona Sancha', 'Seu Rodrigo', 'Mestra Violante', 'Mestre Soeiro', 'Dona Aldara', 'Seu Tristão', 'Dona Berenguela',
    'Mestre Vicente', 'Dona Châmoa', 'Seu Aires', 'Dona Dórdia', 'Mestre Bartolomeu', 'Mestra Estevainha', 'Seu Duarte', 'Dona Froila',
    'Mestre Egas', 'Dona Gontinha', 'Seu Fradique', 'Dona Iria', 'Mestre Gomes', 'Dona Lourença', 'Seu Simão', 'Mestra Mor', 'Mestre Mateus',
    'Dona Teresa', 'Seu Domingos', 'Dona Mafalda', 'Mestre Fagundo', 'Dona Ana', 'Seu Godinho', 'Dona Clara', 'Mestre Julião', 'Mestra Domingas',
    'Seu Lucas', 'Dona Eufêmia', 'Mestre Mendo', 'Dona Francisca', 'Seu Nicolau', 'Dona Grácia', 'Mestre Ordonho', 'Dona Helena', 'Seu Pascoal',
    'Mestra Jusenda', 'Mestre Rui', 'Dona Luzia', 'Seu Salvador', 'Dona Margarida', 'Mestre Telo', 'Dona Madalena', 'Seu Urbano', 'Dona Oroana',
    'Mestre Valentim', 'Mestra Páscoa', 'Seu Xisto', 'Dona Quitéria', 'Mestre Zacarias', 'Dona Rosenda', 'Seu Aleixo', 'Dona Senhorinha',
    'Mestre Brás', 'Dona Tareja', 'Seu Clemente', 'Mestra Ximena', 'Mestre Damião', 'Dona Águeda', 'Seu Eusébio', 'Dona Benvinda', 'Mestre Frutuoso',
    'Dona Cecília', 'Seu Gaspar', 'Dona Dulce', 'Mestre Inácio', 'Mestra Matilde'];
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
  'mv:fl:1': 'um andar', 'mv:fl:2': 'dois andares', 'mv:arch': 'entrada em arco',
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
  mdbench: 'um banco no jardim', mdpool: 'um espelho-d’água no jardim',
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
  'rf:coop': 'um pequeno galinheiro no terreno', 'rf:veg': 'uma hortinha no quintal', 'rf:boots': 'botas junto à porta', 'rf:pots': 'um regador ao lado dos vasos da entrada',
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

// ---------------------------------------------------------------------------------------------------------------------
// Falas dos moradores nas entregas (logic.js monta cada fala).
// Cada morador recebe, por partida, um TEMPERAMENTO e uma ATIVIDADE (o que estava fazendo quando a campainha tocou).
//  · Atividade = [reações da 1ª vez, reações quando você volta, reações na entrega certa]. Nunca cita cor nem posição:
//    quem cita algo do quintal/fachada é só a atividade ligada a uma característica que a casa realmente tem (FEAT).
//  · Temperamento = como ele dá a informação. Os modelos (p, r) recebem phrase(pista) e ref(destino) prontos e só os
//    encaixam: a parte informativa é sempre "<a/da/na casa…> com <pista>", sem tirar nem pôr nada.
//  · {o} vira "o" ou "a" conforme quem fala (obrigad{o}).
// ---------------------------------------------------------------------------------------------------------------------
const A = (first, back, ok) => [first, back, ok];

/** Voz padrão (português do dia a dia). Chaves: hint (1º palpite), late (palpite numa casa que você já tinha visitado
 *  nesta entrega), rep2/rep3/repN (insistência na mesma casa), nohint/nohint2/nohintN (casa fora da pista), ok (fecho da
 *  entrega certa), okAgain (entrega certa num morador que já te conhecia), again (morador que já te atendeu nesta partida). */
const BASE_VOICE = {
  direto: {
    hint: [(p, r) => `Não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Aqui não é. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu. Experimenta ${r.a} com ${p}.`, (p, r) => `É ${r.da} com ${p}.`],
    late: [(p, r) => `Pensei melhor: tenta ${r.a} com ${p}.`, (p, r) => `Agora lembrei: ${r.a} com ${p}.`],
    rep2: [(p, r) => `Já falei: ${r.a} com ${p}.`, (p, r) => `Não é meu, como eu disse. ${r.A} com ${p}.`],
    rep3: [(p, r) => `Terceira vez. A resposta é a mesma: ${r.a} com ${p}.`, (p, r) => `Já é a terceira vez: ${r.a} com ${p}.`],
    repN: [(p, r) => `Mesma resposta: ${r.a} com ${p}.`, (p, r) => `Nada mudou. ${r.A} com ${p}.`],
    nohint: ['Não é meu, e não sei de quem é.', 'Não é meu. Melhor seguir a pista que você tem.'],
    nohint2: ['Não é meu, repito.', 'Já disse: não é meu.'],
    nohintN: ['Continua não sendo meu.', 'Não é meu. Siga a pista.'],
    ok: ['Obrigad{o}.', 'Valeu, obrigad{o}.'],
    okAgain: ['Dessa vez é meu mesmo.', 'Agora sim, é meu.'],
    again: ['Você de novo. Outra caixa?', 'De volta? Outra entrega?'],
  },
  distraido: {
    hint: [(p, r) => `Pra mim? Acho que não… Deve ser ${r.da} com ${p}.`, (p, r) => `Hum, não lembro de ter pedido isso. Tenta ${r.a} com ${p}?`, (p, r) => `Não é meu, não… acho. Talvez seja ${r.da} com ${p}.`, (p, r) => `Hum… ${r.a} com ${p}, talvez?`],
    late: [(p, r) => `Ah, agora lembrei! Tenta ${r.a} com ${p}.`, (p, r) => `Espera, lembrei! Pode ser ${r.da} com ${p}.`],
    rep2: [(p, r) => `Ué, você já veio aqui? Ah, é: era ${r.a} com ${p}.`, (p, r) => `Eu já te disse alguma coisa? Ah, sim: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Juro que já te vi hoje. Era ${r.a} com ${p}, né?`, (p, r) => `Já veio aqui duas vezes? Que memória a minha. Era ${r.a} com ${p}.`],
    repN: [(p, r) => `Eu esqueço tudo, mas isso eu guardei: ${r.a} com ${p}.`, (p, r) => `Ah, oi de novo! Era… ${r.a} com ${p}. Isso.`],
    nohint: ['De quem é? Não faço a menor ideia.', 'Hum… não sei de quem seja, desculpa.'],
    nohint2: ['Você já perguntou, né? Não sei mesmo, desculpa.', 'Ah, oi! Não sei de quem é, desculpa.'],
    nohintN: ['Continuo sem saber, desculpa.', 'Hum… ainda não sei, desculpa.'],
    ok: ['Nem lembrava que tinha pedido!', 'Eu tinha esquecido completamente.'],
    okAgain: ['Ah, é você! E dessa vez é meu.', 'Ué, você de novo? E é meu mesmo!'],
    again: ['Ah, oi! A gente já se viu hoje, né?', 'Ah, você! Esqueci seu nome, mas lembro da van.'],
  },
  falante: {
    hint: [(p, r) => `Não é meu, mas aposto que é ${r.da} com ${p}.`, (p, r) => `Meu não é. Se eu fosse você, tentava ${r.a} com ${p}.`, (p, r) => `Não é meu! Pergunta ${r.na} com ${p}, que lá sempre chega coisa.`, (p, r) => `Aposto ${r.na} com ${p}!`],
    late: [(p, r) => `Fiquei pensando e acho que é ${r.da} com ${p}.`, (p, r) => `Lembrei de uma coisa: aposto ${r.na} com ${p}.`],
    rep2: [(p, r) => `Veio conferir? Pra mim, é ${r.da} com ${p}.`, (p, r) => `Eu falei ${r.da} com ${p}, lembra?`],
    rep3: [(p, r) => `Terceira visita! Tô gostando, mas é ${r.a} com ${p}.`, (p, r) => `Três visitas! Vou acabar te chamando pro almoço. É ${r.a} com ${p}.`],
    repN: [(p, r) => `Se voltar mais uma vez, eu passo um café. É ${r.a} com ${p}.`, (p, r) => `A essa altura a gente já se conhece. Mas é ${r.a} com ${p}.`],
    nohint: ['Não é meu, e olha que eu conheço todo mundo! Desse eu não sei.', 'Meu não é. E de quem é, eu não sei; melhor seguir a pista.'],
    nohint2: ['Veio pra conversar? A caixa não é minha, viu?', 'Que bom te ver! Mas não sei de quem é a caixa.'],
    nohintN: ['Adoro uma visita, mas não sei de quem é, juro.', 'Pode voltar sempre, mas eu não sei de quem é.'],
    ok: ['Eu já ia ligar pra reclamar!', 'Já tinha contado pra todo mundo que vinha hoje.'],
    okAgain: ['Você de novo, e dessa vez é meu! Que alegria.', 'E não é que dessa vez é meu?'],
    again: ['Ah, você de novo! Eu estava mesmo querendo conversar.', 'Você por aqui de novo! Que dia movimentado.'],
  },
  brincalhao: {
    hint: [(p, r) => `Se fosse meu, eu já tinha aberto. Tenta ${r.a} com ${p}.`, (p, r) => `Que pena, eu adoro surpresa. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu, infelizmente. Tenta a sorte ${r.na} com ${p}.`, (p, r) => `Tenta a sorte ${r.na} com ${p}.`],
    late: [(p, r) => `Lembrei agora: pode ser ${r.da} com ${p}.`, (p, r) => `Pensei melhor, olha só: ${r.a} com ${p}.`],
    rep2: [(p, r) => `Veio ver se eu mudei de ideia? É ${r.a} com ${p}.`, (p, r) => `Olha você aí! A dica é a mesma: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Terceira tentativa! Insistência é tudo, mas é ${r.a} com ${p}.`, (p, r) => `Terceira vez! Se vier a quarta, ganha um prêmio. É ${r.a} com ${p}.`],
    repN: [(p, r) => `Desse jeito eu acabo ficando com a caixa. É ${r.a} com ${p}.`, (p, r) => `Já reconheço seu jeito de tocar a campainha. É ${r.a} com ${p}.`],
    nohint: ['Não é meu, nem de ninguém que eu conheça.', 'Não é meu. Se descobrir de quem é, me conta.'],
    nohint2: ['Não é meu, conferi duas vezes!', 'Não é meu, juro pela minha cadeira de praia.'],
    nohintN: ['Continua não sendo meu, mas a visita tá ótima.', 'Já tô ficando com pena de não ser meu.'],
    ok: ['Assino com a minha melhor letra.', 'Nem vou esperar pra abrir!'],
    okAgain: ['Olha só, dessa vez é meu!', 'Até que enfim um que é meu!'],
    again: ['Olha quem voltou! Hoje é dia de visita.', 'Você de novo! Trouxe mais alguma surpresa?'],
  },
  ocupado: {
    hint: [(p, r) => `Não é meu. Procura ${r.a} com ${p}.`, (p, r) => `Rapidinho: não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Não é meu, não. Deve ser ${r.da} com ${p}.`, (p, r) => `Procura ${r.a} com ${p}.`],
    late: [(p, r) => `Com licença, mas agora eu sei: ${r.a} com ${p}.`, (p, r) => `Lembrei agora, rapidinho: ${r.a} com ${p}.`],
    rep2: [(p, r) => `Olha, preciso voltar lá pra dentro: é ${r.a} com ${p}.`, (p, r) => `Com licença, mas já disse: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Terceira vez, e eu com tudo pela metade. ${r.A} com ${p}.`, (p, r) => `Terceira vez! Rapidinho: ${r.a} com ${p}.`],
    repN: [(p, r) => `Rapidinho: ${r.a} com ${p}.`, (p, r) => `Sem tempo, sem tempo: ${r.a} com ${p}.`],
    nohint: ['Não é meu e não sei de quem é. Desculpa, tô corrid{o}.', 'Não é meu. Não sei de quem é, e tenho que voltar lá.'],
    nohint2: ['Não é meu, já falei. Tô no meio de uma coisa.', 'Não é meu. Com licença, tô ocupad{o}.'],
    nohintN: ['Ainda não é meu! Com licença.', 'Não é meu! Tô correndo aqui.'],
    ok: ['Obrigad{o}, e com licença!', 'Valeu! Agora deixa eu voltar lá.'],
    okAgain: ['Dessa vez é meu! Onde eu assino?', 'Esse é meu! Pode deixar.'],
    again: ['Você de novo? Rapidinho, por favor.', 'De novo? Tô no meio de uma coisa.'],
  },
  desconfiado: {
    hint: [(p, r) => `Eu não pedi nada. Isso deve ser ${r.da} com ${p}.`, (p, r) => `Hmm. Não é meu. Pergunta ${r.na} com ${p}.`, (p, r) => `Quem mandou isso? Não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Hmm. Pergunta ${r.na} com ${p}.`],
    late: [(p, r) => `Pensando bem… quem vive pedindo coisa é ${r.a} com ${p}.`, (p, r) => `Pensando melhor, aposto ${r.na} com ${p}.`],
    rep2: [(p, r) => `Você aqui? Eu sigo achando que é ${r.da} com ${p}.`, (p, r) => `Hmm. Eu já disse: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Três vezes na mesma porta… Eu disse: ${r.a} com ${p}.`, (p, r) => `Terceira vez… Ainda acho que é ${r.da} com ${p}.`],
    repN: [(p, r) => `Tô de olho nessa caixa. Ela é ${r.da} com ${p}.`, (p, r) => `Pode insistir: a resposta é ${r.a} com ${p}.`],
    nohint: ['Não é meu. E não vou abrir pra ver de quem é.', 'Não pedi nada, e não sei quem pediu.'],
    nohint2: ['Hmm. Já disse que não é meu.', 'Já falei que não é meu.'],
    nohintN: ['Continua não sendo meu. Pode conferir o endereço.', 'Não é meu, e pronto.'],
    ok: ['Conferi a etiqueta: é meu mesmo. Obrigad{o}.', 'Inteiro, ainda por cima. Obrigad{o}.'],
    okAgain: ['Hmm, dessa vez a etiqueta confere.', 'Desta vez o nome confere.'],
    again: ['Você de novo? O que é dessa vez?', 'Você de novo? Hmm.'],
  },
};

/** Veneza: português claro, com UMA expressão italiana por temperamento (cada uma aparece em poucas falas). */
const VEN_VOICE = {
  direto: {
    hint: [(p, r) => `Allora: não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Não é meu. Deve ser ${r.da} com ${p}.`, (p, r) => `Aqui não é. Pergunta ${r.na} com ${p}.`],
    rep3: [(p, r) => `Terceira vez. ${r.A} com ${p}, e basta.`],
    ok: ['Obrigad{o}.', 'Valeu, obrigad{o}.'],
  },
  distraido: {
    hint: [(p, r) => `Boh… pra mim? Acho que não. Deve ser ${r.da} com ${p}.`, (p, r) => `Hum, não lembro de ter pedido. Tenta ${r.a} com ${p}?`],
    late: [(p, r) => `Ah, ecco, lembrei! Tenta ${r.a} com ${p}.`],
    nohint: ['Boh, não faço ideia de quem seja.', 'Hum… não sei de quem é, desculpa.'],
    again: ['Ah, oi! A gente já se viu hoje, né?', 'Ah, você! Esqueci seu nome, mas lembro da lancha.'],
  },
  falante: {
    hint: [(p, r) => `Mamma mia, não é meu! Mas aposto ${r.na} com ${p}.`, (p, r) => `Senti, meu não é. Se eu fosse você, tentava ${r.a} com ${p}.`, (p, r) => `Não é meu! Pergunta ${r.na} com ${p}, que lá chega de tudo.`],
    rep3: [(p, r) => `Terceira visita! Já merece um café. Mas é ${r.a} com ${p}.`],
    repN: [(p, r) => `Se voltar de novo, faço um espresso. É ${r.a} com ${p}.`],
    nohint: ['Não é meu, e olha que eu conheço todo mundo por aqui!', 'Meu não é, e de quem é eu não sei. Che peccato!'],
    ok: ['Eu já ia reclamar com o correio!', 'Já tinha contado pra todo mundo que vinha hoje.'],
    again: ['Ah, você de novo! Tenho tanta novidade pra contar.'],
  },
  brincalhao: {
    hint: [(p, r) => `Magari! Quem dera fosse meu. Tenta ${r.a} com ${p}.`, (p, r) => `Se fosse meu, eu já tinha aberto. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu, infelizmente. Tenta a sorte ${r.na} com ${p}.`],
    rep3: [(p, r) => `Terceira tentativa! Bravo pela insistência, mas é ${r.a} com ${p}.`],
    ok: ['Nem vou esperar pra abrir!', 'Isso merece um brinde.'],
  },
  ocupado: {
    hint: [(p, r) => `Scusi, tô com pressa: não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Não é meu. Procura ${r.a} com ${p}.`, (p, r) => `Rapidinho: deve ser ${r.da} com ${p}.`],
    repN: [(p, r) => `Presto, presto: ${r.a} com ${p}.`, (p, r) => `Sem tempo: ${r.a} com ${p}.`],
    ok: ['Grazie mille, e com licença!', 'Valeu! Agora deixa eu voltar lá.'],
    again: ['Você de novo? Rapidinho, per favore.'],
  },
  desconfiado: {
    hint: [(p, r) => `Eu não pedi nada. Isso deve ser ${r.da} com ${p}.`, (p, r) => `Hmm. Não é meu. Pergunta ${r.na} com ${p}.`, (p, r) => `Ma… quem mandou isso? Não é meu. Tenta ${r.a} com ${p}.`],
    ok: ['Conferi a etiqueta: é meu mesmo.', 'E sem cair na água. Obrigad{o}.'],
  },
};

/** Lua: ETs simpáticos; humor do lugar (radar, escotilha, gravidade, terráqueos), sem palavras de gênero. */
const MOON_VOICE = {
  direto: {
    hint: [(p, r) => `Negativo, não é meu. Tenta ${r.a} com ${p}.`, (p, r) => `Aqui não é. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu. Procura ${r.a} com ${p}.`],
    late: [(p, r) => `Recalculei: ${r.a} com ${p}.`],
    rep2: [(p, r) => `Já transmiti: ${r.a} com ${p}.`, (p, r) => `Mensagem repetida: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Terceira transmissão. ${r.A} com ${p}.`],
    repN: [(p, r) => `Mesma resposta, terráqueo: ${r.a} com ${p}.`],
    nohint: ['Negativo. Não sei de quem é.', 'Não é meu. Segue a pista que você tem.'],
    nohint2: ['Repito: negativo.'],
    nohintN: ['Continua negativo, terráqueo.'],
    ok: ['Recebido. Valeu.', 'Confirmado. Valeu.'],
    okAgain: ['Agora sim: positivo.'],
    again: ['Você de novo. Outra caixa terrestre?'],
  },
  distraido: {
    hint: [(p, r) => `Bip? Pra mim? Acho que não… Deve ser ${r.da} com ${p}.`, (p, r) => `Hum, meu radar não lembra disso. Tenta ${r.a} com ${p}?`, (p, r) => `Bip… ${r.a} com ${p}, talvez?`],
    late: [(p, r) => `Ah! Meu radar acordou: tenta ${r.a} com ${p}.`],
    rep2: [(p, r) => `Já veio aqui? Ah, sim: era ${r.a} com ${p}.`],
    rep3: [(p, r) => `Juro por todas as luas que já te vi. Era ${r.a} com ${p}.`],
    repN: [(p, r) => `Minha memória flutua, mas era ${r.a} com ${p}.`],
    nohint: ['Bip… não faço ideia de quem seja.', 'De quem é? Meu radar também não sabe.'],
    ok: ['Nem lembrava que tinha pedido!', 'Eu tinha esquecido completamente. Bip!'],
    again: ['Ah, oi! A gente já se viu nesta órbita?'],
  },
  falante: {
    hint: [(p, r) => `Não é meu! Mas aposto ${r.na} com ${p}.`, (p, r) => `Meu não é. Se eu fosse você, tentava ${r.a} com ${p}.`, (p, r) => `Não é meu! Pergunta ${r.na} com ${p}, que lá chega de tudo.`],
    rep2: [(p, r) => `Veio conferir? Eu aposto ${r.na} com ${p}.`],
    rep3: [(p, r) => `Terceira visita! Merece um suco de cometa. Mas é ${r.a} com ${p}.`],
    repN: [(p, r) => `Você já é quase da colônia. Mas é ${r.a} com ${p}.`],
    nohint: ['Não é meu, e olha que eu conheço a colônia inteira!', 'Meu não é. De quem é, nem meu radar sabe.'],
    nohint2: ['Veio pra conversar? Adoro terráqueos, mas não é meu.'],
    ok: ['Já tinha avisado a colônia que vinha hoje!', 'Vou contar pra vila inteira!'],
    again: ['Terráqueo! Voltou pra conversar?'],
  },
  brincalhao: {
    hint: [(p, r) => `Se fosse meu, eu já tinha aberto. Tenta ${r.a} com ${p}.`, (p, r) => `Que pena, adoro surpresa terrestre. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu. Tenta a sorte ${r.na} com ${p}.`],
    late: [(p, r) => `Lembrei agora: ${r.a} com ${p}.`],
    rep3: [(p, r) => `Gravidade baixa, insistência alta! Mas é ${r.a} com ${p}.`],
    repN: [(p, r) => `Desse jeito a caixa entra em órbita aqui. É ${r.a} com ${p}.`],
    nohint: ['Não é meu, nem de nenhum ET que eu conheça.', 'Não é meu. Se descobrir de quem é, me transmite.'],
    nohint2: ['Não é meu, conferi com o radar!'],
    ok: ['Nem vou esperar pousar pra abrir.', 'Bip-bip de alegria!'],
    again: ['Olha quem voltou! Dia de visita interplanetária.'],
  },
  ocupado: {
    hint: [(p, r) => `Não é meu. Procura ${r.a} com ${p}.`, (p, r) => `Rapidinho, tô em contagem regressiva: tenta ${r.a} com ${p}.`, (p, r) => `Não é meu. Deve ser ${r.da} com ${p}.`],
    rep3: [(p, r) => `Terceira vez, e eu com o módulo pela metade! ${r.A} com ${p}.`],
    repN: [(p, r) => `Câmbio: ${r.a} com ${p}.`],
    nohint: ['Não é meu e não sei de quem é. Tô em contagem regressiva.', 'Não é meu. Com licença, deixei uma escotilha aberta.'],
    nohint2: ['Já transmiti: não é meu.'],
    nohintN: ['Ainda não é meu! Câmbio.'],
    ok: ['Valeu, e agora com licença!', 'Recebido! Volto pro trabalho.'],
  },
  desconfiado: {
    hint: [(p, r) => `Meu radar não reconhece isso. Deve ser ${r.da} com ${p}.`, (p, r) => `Hmm. Não é meu. Pergunta ${r.na} com ${p}.`, (p, r) => `Quem mandou isso da Terra? Não é meu. Tenta ${r.a} com ${p}.`],
    rep3: [(p, r) => `Três vezes na mesma escotilha… Eu disse: ${r.a} com ${p}.`],
    repN: [(p, r) => `Tô monitorando essa caixa. Ela é ${r.da} com ${p}.`],
    nohint: ['Não é meu. E não vou abrir pra ver de quem é.', 'Não pedi nada da Terra.'],
    nohintN: ['Continua não sendo meu. Confere as coordenadas.'],
    ok: ['Escaneei a etiqueta: é meu mesmo.', 'Sem um amassado, ainda por cima. Valeu.'],
  },
};

/** Medieval: vocabulário simples do burgo (embrulho, selo, feira, taverna), sem rebuscar a dica. */
const MED_VOICE = {
  direto: {
    hint: [(p, r) => `Não é meu. Procure ${r.a} com ${p}.`, (p, r) => `Aqui não é. Deve ser ${r.da} com ${p}.`, (p, r) => `Isto não é meu. Tente ${r.a} com ${p}.`],
    late: [(p, r) => `Pensei melhor: tente ${r.a} com ${p}.`],
    nohint: ['Não é meu, e não sei de quem é.', 'Não é meu. Siga a pista que tem em mãos.'],
    ok: ['Muito obrigad{o}.', 'Obrigad{o}. Bom serviço.'],
    okAgain: ['Agora sim, é meu.'],
    again: ['De volta, com outro embrulho?'],
  },
  distraido: {
    hint: [(p, r) => `Para mim? Creio que não… Deve ser ${r.da} com ${p}.`, (p, r) => `Hum, não me lembro de ter pedido isto. Tente ${r.a} com ${p}?`],
    late: [(p, r) => `Ah, agora me lembrei! Tente ${r.a} com ${p}.`],
    rep2: [(p, r) => `Já esteve aqui? Ah, sim: era ${r.a} com ${p}.`],
    rep3: [(p, r) => `Juro que já nos vimos hoje. Era ${r.a} com ${p}, não era?`],
    repN: [(p, r) => `Esqueço tudo, mas isto eu guardei: ${r.a} com ${p}.`],
    nohint: ['De quem é? Não faço ideia.', 'Hum… não sei de quem seja, perdão.'],
    nohint2: ['Já me perguntou, não foi? Não sei, perdão.'],
    nohintN: ['Continuo sem saber, perdão.'],
    ok: ['Nem me lembrava de ter pedido!', 'Já tinha esquecido por completo.'],
    okAgain: ['Ah, é você! E desta vez é meu.'],
    again: ['Ah, bom dia! Já nos vimos hoje, não?'],
  },
  falante: {
    hint: [(p, r) => `Não é meu, mas aposto ${r.na} com ${p}.`, (p, r) => `Meu não é. No seu lugar, eu tentaria ${r.a} com ${p}.`, (p, r) => `Não é meu! Pergunte ${r.na} com ${p}; lá chega de tudo.`],
    rep3: [(p, r) => `Terceira visita! Já merece uma caneca. Mas é ${r.a} com ${p}.`],
    repN: [(p, r) => `Se voltar outra vez, divido meu pão. É ${r.a} com ${p}.`],
    nohint: ['Não é meu, e olhe que conheço o burgo inteiro!', 'Meu não é, e de quem é não sei dizer.'],
    nohint2: ['Veio prosear? O embrulho não é meu, já disse.'],
    ok: ['Já tinha contado ao burgo inteiro que chegaria hoje!', 'Vou mostrar na feira amanhã!'],
    okAgain: ['Você outra vez, e desta vez é meu!'],
    again: ['Ah, você de novo! Tenho novidades da feira.'],
  },
  brincalhao: {
    hint: [(p, r) => `Se fosse meu, já teria aberto. Tente ${r.a} com ${p}.`, (p, r) => `Que pena, adoro surpresas. Deve ser ${r.da} com ${p}.`, (p, r) => `Não é meu. Tente a sorte ${r.na} com ${p}.`],
    rep2: [(p, r) => `Veio ver se mudei de ideia? É ${r.a} com ${p}.`],
    rep3: [(p, r) => `Terceira tentativa! Que persistência. Mas é ${r.a} com ${p}.`],
    repN: [(p, r) => `Desse jeito, o embrulho fica para mim. É ${r.a} com ${p}.`],
    nohint: ['Não é meu, nem de ninguém que eu conheça.', 'Não é meu. Se descobrir de quem é, conte-me.'],
    nohint2: ['Não é meu, conferi duas vezes!', 'Não é meu, juro pela barba do ferreiro.'],
    nohintN: ['Continua não sendo meu, mas a visita é boa.'],
    ok: ['Nem vou esperar para abrir!', 'Isso merece festa na taverna.'],
    okAgain: ['Desta vez acertou a porta!'],
    again: ['Olha quem voltou! Dia de visitas.'],
  },
  ocupado: {
    hint: [(p, r) => `Não é meu. Procure ${r.a} com ${p}.`, (p, r) => `Depressa: não é meu. Tente ${r.a} com ${p}.`, (p, r) => `Não é meu. Deve ser ${r.da} com ${p}.`],
    rep2: [(p, r) => `Outra vez? Preciso voltar ao trabalho: é ${r.a} com ${p}.`],
    repN: [(p, r) => `Com licença: é ${r.a} com ${p}.`],
    nohint: ['Não é meu e não sei de quem é. Perdão, estou com pressa.', 'Não é meu. Com licença, o trabalho me espera.'],
    late: [(p, r) => `Com licença, mas agora sei: ${r.a} com ${p}.`],
    nohint2: ['Não é meu, já disse. Estou no meio de uma tarefa.'],
    nohintN: ['Ainda não é meu! Com licença.'],
    ok: ['Obrigad{o}, e com licença!', 'Que bom! Volto ao trabalho.'],
    okAgain: ['Agora sim! Pode deixar aqui mesmo.'],
    again: ['Você de novo? Depressa, por favor.'],
  },
  desconfiado: {
    hint: [(p, r) => `Não encomendei nada. Isto deve ser ${r.da} com ${p}.`, (p, r) => `Hmm. Não é meu. Pergunte ${r.na} com ${p}.`, (p, r) => `Quem mandou isto? Não é meu. Tente ${r.a} com ${p}.`],
    late: [(p, r) => `Pensando bem… quem vive encomendando coisas é ${r.a} com ${p}.`],
    rep3: [(p, r) => `Três vezes à mesma porta… Eu disse: ${r.a} com ${p}.`],
    repN: [(p, r) => `Estou de olho nesse embrulho. Ele é ${r.da} com ${p}.`],
    nohint: ['Não é meu. E não vou abrir para ver de quem é.', 'Não encomendei nada, e não sei quem encomendou.'],
    nohintN: ['Continua não sendo meu. Confira o endereço.'],
    ok: ['Conferi o selo: é meu mesmo.', 'Sem um arranhão, ainda por cima. Obrigad{o}.'],
    okAgain: ['Hmm, desta vez o selo confere.'],
    again: ['Você de novo? O que traz desta vez?'],
  },
};

/** Atividades do cotidiano por grupo. Cada uma: A([1ª vez], [quando você volta], [entrega certa]). */
const ACTS = {
  // ---- subúrbio (Bairros 1–5 e casas dos bairros de cidade) ----
  home: [
    A(['Larguei o prato na mesa pra atender.', 'Tô no meio do almoço, viu?'], ['Já tinha voltado pro almoço.'], ['Chegou antes da sobremesa!']),
    A(['Pausei a novela bem no capítulo final.', 'Você tocou bem na hora da novela.'], ['Pausei a novela de novo.'], ['E ainda dá tempo de ver o fim da novela!']),
    A(['Você me pegou cochilando no sofá.', 'Acordei do cochilo com a campainha.'], ['Mal deu tempo de fechar o olho.'], ['Valeu o cochilo interrompido!']),
    A(['Tô consertando o chuveiro com fita isolante.', 'Desci da escada no meio do conserto do chuveiro.'], ['O chuveiro continua pingando, aliás.'], ['Deve ser a resistência do chuveiro! Até que enfim.']),
    A(['Tenho um bolo no forno e o tempo tá correndo.', 'Atendi com a mão cheia de farinha.'], ['O bolo já tá quase pronto.'], ['Chegou junto com o bolo saindo do forno!']),
    A(['Deixei minha irmã esperando no telefone.', 'Atendi com o telefone na outra mão.'], ['Minha irmã ainda tá na linha.'], ['Vou contar pra minha irmã que chegou!']),
    A(['Tô montando um armário e sobrou um parafuso.', 'Larguei o manual do armário aberto na página doze.'], ['O armário continua torto.'], ['Deve ser o parafuso que faltava no armário!']),
    A(['A família tá discutindo se a batedeira valia o preço.', 'Ninguém aqui admite quem comprou a batedeira.'], ['A discussão da batedeira continua.'], ['Deve ser a batedeira! Fim da discussão.']),
    A(['Deixei o ferro de passar em pé pra atender.', 'Tem uma pilha de roupa me esperando pra passar.'], ['O ferro tá esquentando lá dentro.'], ['Que bom! Agora volto pra pilha de roupa.']),
    A(['Tava empacad{o} numa palavra cruzada de seis letras.', 'Sabe uma palavra de seis letras pra ‘atrasado’?'], ['Ainda falta aquela palavra de seis letras.'], ['Ah, chegou! E eu achei a palavra: ‘tardio’.']),
    A(['Interrompi a aula de violão do meu neto.', 'Meu neto tá aprendendo violão, desculpa a música.'], ['O violão lá dentro não parou.'], ['Deve ser a corda nova do violão!']),
    A(['Tô no meio da faxina, com o balde no corredor.', 'Cuidado, que o chão da casa tá molhado.'], ['O chão nem secou ainda.'], ['Chegou depois da faxina, que beleza.']),
    A(['Saí no meio de uma reunião por vídeo.', 'Deixei a câmera ligada numa reunião.'], ['A reunião ainda tá rolando.'], ['Já posso mostrar na reunião!']),
    A(['Larguei uma partida de dominó pela metade.', 'Eu tava ganhando no dominó, viu?'], ['O pessoal do dominó tá me esperando.'], ['Até que enfim! E ainda ganhei no dominó.']),
    A(['Tô procurando o controle remoto faz meia hora.'], ['O controle ainda não apareceu.'], ['Agora só falta achar o controle.']),
    A(['Atendi com tinta no cabelo, não repara.'], ['A tinta já tá passando do ponto.'], ['Chegou antes de eu enxaguar o cabelo!']),
    A(['O jogo tá no rádio e tá empatado.', 'Tô ouvindo o jogo no rádio, segundo tempo.'], ['Ainda tá empatado.'], ['Chegou, e meu time fez gol! Dia bom.']),
    A(['Tem pão de queijo no forno, então vou ser rápid{o}.'], ['O pão de queijo já tá cheirando.'], ['Chegou junto com o pão de queijo!']),
  ],
  raizes: [   // Bairro 1: o bairro mais antigo
    A(['Moro aqui há quarenta anos e nunca vi tanta caixa.'], ['Quarenta anos aqui e nunca vi tanta visita.'], ['Quarenta anos aqui, e ainda me surpreendo com encomenda.']),
    A(['Eu estava separando foto antiga num álbum.'], ['Ainda tô no álbum de fotos.'], ['Essa vai pro álbum: a encomenda que chegou!']),
    A(['Desculpa a demora, tava passando café no coador de pano, do jeito antigo.'], ['O café já passou.'], ['Chegou com o café pronto!']),
    A(['Achei que era o jornaleiro.'], ['O jornaleiro também ainda não passou.'], ['Melhor que o jornal de domingo!']),
  ],
  praca: [    // Bairro 2: a praça no meio
    A(['Acabei de voltar da caminhada na praça.', 'Tava contando quantas voltas dei na praça.'], ['Já ia voltar pra praça.'], ['Ótimo! Vou abrir num banco da praça.']),
    A(['Atendi correndo: tava jogando damas com o pessoal da praça.'], ['O pessoal das damas tá me esperando.'], ['Chegou! Vou mostrar pro pessoal da praça.']),
  ],
  obra: [     // Bairro 3: cavaletes de obra
    A(['Essa obra na rua começou às sete da manhã.', 'Com o barulho da obra, quase não ouvi a campainha.'], ['A obra continua, e você também.'], ['Chegou, mesmo com a rua cheia de cavalete!']),
    A(['Tô reclamando da obra com a prefeitura no telefone.'], ['A prefeitura me deixou esperando na linha.'], ['Chegou antes da prefeitura me atender!']),
  ],
  desvio: [   // Bairro 4: ruas bloqueadas
    A(['Com tanto desvio por aqui, nem esperava visita.', 'Fecharam mais uma rua hoje, sabia?'], ['Ainda tão fechando rua por aí.'], ['Chegou, mesmo com tanto desvio. Parabéns!']),
  ],
  comercio: [ // Bairro 5: postos e comércio
    A(['Fui ao posto comprar pão e voltei com um chaveiro.', 'Acabei de chegar das compras.'], ['Ainda nem guardei as compras.'], ['Chegou! Mais uma sacola pra guardar.']),
  ],
  // ---- cidade ----
  cidade: [
    A(['Tava na janela vendo o movimento da cidade.'], ['O movimento lá fora não para.'], ['Que bom! Hoje a cidade tá generosa.']),
    A(['Com tanto prédio, o sol só bate aqui depois do almoço.'], ['O sol ainda nem chegou na minha janela.'], ['Chegou antes do sol!']),
    A(['Você me pegou procurando sinal de celular pela casa.'], ['O sinal continua fraco.'], ['Ah, chegou! Melhor que sinal de celular.']),
  ],
  transito: [ // Bairros 7 e 8: engarrafamentos
    A(['Com esse engarrafamento, a buzina não para.', 'Ouvi a campainha no meio de tanta buzina.'], ['A buzinação continua.'], ['Chegou, mesmo com esse trânsito todo!']),
    A(['Desisti de sair de carro hoje, com esse trânsito.'], ['O trânsito ainda tá parado, né?'], ['Até que enfim! E eu nem precisei pegar trânsito.']),
  ],
  alto: [     // Bairro 8: prédios de nove andares
    A(['Desci nove andares de escada pra atender.'], ['Subi e desci os nove andares de novo.'], ['Ótimo! Agora são nove andares de volta.']),
  ],
  ladeira: [  // Bairro 9: encostas
    A(['Subi a ladeira com as compras agora há pouco.'], ['Ainda tô recuperando o fôlego.'], ['Chegou, e eu nem precisei subir a ladeira!']),
    A(['Meu carrinho de feira desceu a ladeira sozinho.'], ['O carrinho de feira ainda tá lá embaixo.'], ['Chegou! Isso subiu mais fácil que o meu carrinho.']),
  ],
  canal: [    // Bairro 11: o canal no meio
    A(['Eu estava pescando no canal sem pegar nada.'], ['Os peixes continuam sem morder.'], ['Chegou! Melhor que pescaria sem peixe.']),
    A(['O vento do canal levou meu chapéu.'], ['O chapéu não voltou.'], ['Que bom! Pelo menos isso o vento não levou.']),
  ],
  bonde: [    // Bairro 12: bondinhos
    A(['O bonde passou e a louça toda tremeu.', 'Ouvi a campainha entre um bonde e outro.'], ['Lá vem outro bonde.'], ['Chegou mais pontual que o bonde!']),
    A(['Perdi o bonde por um minuto, de novo.'], ['O próximo bonde ainda não veio.'], ['Chegou antes do próximo bonde!']),
  ],
  avenida: [  // Bairro 14: a avenida
    A(['O barulho da avenida não deixa ouvir nada.', 'Fiquei vinte minutos esperando o sinal abrir.'], ['A avenida continua barulhenta.'], ['Ah, chegou! E sem pegar trânsito na avenida?']),
  ],
  cachoeira: [ // Bairro 23
    A(['Com o barulho da cachoeira, quase não ouvi a campainha.', 'A névoa da cachoeira embaçou meus óculos.'], ['A cachoeira continua no volume máximo.'], ['Até que enfim! Vou abrir ouvindo a cachoeira.']),
    A(['Desculpa a demora, tava mostrando a cachoeira pra uns turistas.'], ['Os turistas ainda tão tirando foto.'], ['Ótimo! Até os turistas aplaudiram.']),
    A(['A roupa não seca nunca com essa umidade.'], ['A roupa continua úmida.'], ['Chegou sequinho, que milagre!']),
  ],
  outono: [   // Bairro 22: o bosque
    A(['O vento espalhou as folhas que eu tinha varrido.'], ['O vento espalhou tudo outra vez.'], ['Chegou! E nenhuma folha dentro da caixa.']),
    A(['Tava tomando chá, vendo as árvores mudarem de cor.'], ['O chá esfriou.'], ['Chegou! Vou abrir com outro chá.']),
    A(['Voltei agora de catar cogumelos no bosque.'], ['Os cogumelos estão de molho.'], ['Que bom! Dia de sorte: cogumelos e encomenda.']),
    A(['Tô assando castanhas no forno.'], ['As castanhas estalaram todas.'], ['Ah, chegou! Quer castanha? Tá quentinha.']),
    A(['Tô tricotando um cachecol pro outono.'], ['O cachecol cresceu mais um palmo.'], ['Deve ser a lã do cachecol!']),
    A(['Os esquilos levaram minhas nozes de novo.'], ['Os esquilos continuam soltos.'], ['Chegou, e os esquilos não pegaram!']),
  ],
  apt: [
    A(['Desci de escada, o elevador parou de novo.', 'Fiquei dez minutos esperando o elevador.'], ['O elevador ainda tá parado.'], ['Até que enfim! Agora é subir com isso de escada.']),
    A(['O interfone não funciona, ouvi pela janela.'], ['O interfone continua mudo.'], ['Chegou, mesmo sem interfone!']),
    A(['Saí da reunião de condomínio pra atender.', 'A reunião de condomínio tá discutindo a cor do corredor.'], ['A reunião ainda não decidiu a cor.'], ['Ótimo, assim eu escapo da reunião!']),
    A(['Tô trabalhando de casa e o chefe tá online.', 'Desci de chinelo no meio do expediente.'], ['Meu chefe já perguntou onde eu fui.'], ['Chegou antes do fim do expediente!']),
    A(['A furadeira do apartamento de cima não para.'], ['A furadeira voltou.'], ['Ótimo! Agora só falta a furadeira parar.']),
    A(['Ainda tô desencaixotando a mudança.', 'Me mudei semana passada e nem achei as panelas.'], ['Mais uma caixa pra pilha da mudança.'], ['Mais uma caixa! Mas essa é bem-vinda.']),
    A(['Tô enchendo bexiga pro aniversário da minha filha.'], ['Ainda faltam umas vinte bexigas.'], ['Deve ser o presente da festa! Chegou na hora.']),
    A(['Desci correndo achando que era a pizza.'], ['A pizza continua não chegando.'], ['Não é a pizza, mas é ótimo!']),
    A(['Atendi correndo: tava na lavanderia do prédio esperando a máquina.'], ['A máquina ainda tá centrifugando.'], ['Chegou antes da roupa secar!']),
    A(['Tava fazendo exercício na sala, com vídeo e tudo.'], ['O vídeo do exercício tá pausado.'], ['Chegou! Descanso merecido.']),
  ],
  shop: [     // prédios comerciais: quem atende é o dono da loja
    A(['Deixei um cliente esperando no balcão.', 'Tô sozinh{o} na loja hoje.'], ['O cliente do balcão ainda tá esperando.'], ['Deve ser a mercadoria que faltava na prateleira!']),
    A(['Você me pegou arrumando a vitrine.', 'Larguei a vitrine pela metade.'], ['A vitrine continua pela metade.'], ['Chegou! Isso vai direto pra vitrine.']),
    A(['Tô fechando o caixa e a conta não bate.'], ['A conta do caixa ainda não bateu.'], ['Que bom! Agora a conta do estoque bate.']),
    A(['Hoje é dia de promoção, a loja tá cheia.'], ['A promoção tá um sucesso, viu?'], ['Chegou a tempo da promoção!']),
    A(['Eu estava contando o estoque no depósito.'], ['Perdi a conta do estoque de novo.'], ['Mais um item pro estoque. Ótimo!']),
    A(['Achei que era o fornecedor, que atrasou de novo.'], ['O fornecedor ainda não apareceu.'], ['Até que enfim, a encomenda do fornecedor!']),
    A(['Desculpa a demora, tava trocando as etiquetas de preço.'], ['Ainda faltam umas cem etiquetas.'], ['Ah, chegou! Já vai pra prateleira.']),
    A(['Tô almoçando no balcão, desculpa a boca cheia.'], ['O almoço no balcão esfriou.'], ['Até que enfim! Almoço e encomenda no mesmo dia.']),
  ],
  ware: [     // galpões: o encarregado
    A(['Tô conferindo a nota da carga.', 'A carga de hoje veio toda trocada.'], ['A conferência ainda não acabou.'], ['Deve ser o item que faltava na nota!']),
    A(['Troca de turno, tá todo mundo de saída.'], ['O turno já trocou, e você ainda por aqui.'], ['Chegou antes do apito do fim do turno.']),
    A(['Tô no meio do inventário do galpão.'], ['Perdi a conta das caixas de novo.'], ['Mais uma caixa pro inventário, mas essa é nossa.']),
    A(['A equipe tá no intervalo do café.'], ['O café do intervalo acabou.'], ['Chegou no intervalo! Perfeito.']),
    A(['Aqui a gente etiqueta mil caixas por dia.'], ['Mais umas cem caixas etiquetadas desde a sua visita.'], ['Essa a gente nem precisa etiquetar!']),
  ],
  portaria: [ // prédios contemporâneos: quem atende é a portaria
    A(['Aqui na portaria ninguém avisou dessa entrega.', 'Tô interfonando pra todos os andares.'], ['Continuo interfonando, sem resposta.'], ['Achei o morador! É daqui mesmo.']),
    A(['Tava anotando as visitas no livro.'], ['Anotei sua visita no livro, viu?'], ['Registrado no livro: entrega recebida.']),
    A(['Atendi correndo: tava de olho nas câmeras da garagem.'], ['As câmeras te viram voltando.'], ['Ótimo! As câmeras registraram tudo.']),
    A(['O síndico mandou conferir até a fita das caixas.'], ['Conferi a fita de novo.'], ['Conferi tudo: é daqui mesmo!']),
    A(['O elevador social tá em manutenção hoje.'], ['O elevador continua em manutenção.'], ['Entrega recebida. Vou subir de escada mesmo.']),
  ],
  // ---- Penumbra (Bairro 19): sempre noite ----
  noite: [
    A(['Eu já estava de pijama.', 'Já ia dormir, mas tudo bem.'], ['Voltei pra cama e você voltou também.'], ['Encomenda à noite! Que surpresa boa.']),
    A(['Larguei a janta na mesa.'], ['A janta já esfriou.'], ['Chegou a tempo do cafezinho depois da janta.']),
    A(['Com esses apagões, deixo a lanterna na porta.'], ['Já tô com a lanterna na mão.'], ['Chegou antes do próximo apagão!']),
    A(['Tava no último episódio da série.'], ['Pausei a série de novo.'], ['Agora posso terminar a série em paz.']),
    A(['Não consigo dormir, então até agradeço a visita.'], ['O sono não vem mesmo.'], ['Pronto, agora talvez eu consiga dormir.']),
    A(['Acabei de chegar do plantão da noite.'], ['Ainda nem tirei o uniforme.'], ['Chegou bem na hora que eu cheguei.']),
    A(['O letreiro aí fora pisca a noite inteira na minha janela.'], ['O letreiro continua piscando.'], ['Chegou! Até o letreiro piscou mais forte.']),
  ],
  lojaNoite: [
    A(['Já tava baixando a porta da loja.', 'Deixei a loja aberta até tarde pra fechar o caixa.'], ['Ainda tô fechando o caixa.'], ['Chegou antes de eu fechar!']),
    A(['À noite só aparece cliente com fome.'], ['Mais um cliente com fome, e você aqui.'], ['Chegou! Melhor freguês da noite.']),
  ],
  galpaoNoite: [
    A(['Turno da noite por aqui, tudo devagar.'], ['O turno ainda não acabou.'], ['Que bom! Assinatura do turno da noite.']),
    A(['Tô de vigia esta noite, e ninguém avisou disso.'], ['Continuo de vigia.'], ['Ah, chegou! Vou registrar na ronda.']),
  ],
  portariaNoite: [
    A(['Sou da portaria da noite, e ninguém avisou disso.'], ['A noite continua comprida.'], ['Até que enfim! Vou registrar no livro da noite.']),
    A(['Você me pegou ouvindo rádio baixinho pra não dormir.'], ['O rádio continua baixinho.'], ['Ótimo! Agora acordei de vez.']),
  ],
  // ---- Veneza ----
  ven: [
    A(['Deixei a água do macarrão fervendo.', 'Tô abrindo massa fresca, olha a farinha.'], ['O macarrão já tá al dente.'], ['Chegou antes do macarrão! Perfetto.']),
    A(['Achei que era o barqueiro com o peixe.', 'Eu estava esperando o barco do mercado.'], ['O barco do peixe ainda não passou.'], ['Chegou antes do barco do mercado!']),
    A(['A maré subiu e molhou meu tapete de novo.'], ['Ainda tô secando o tapete.'], ['Chegou sequinho, mesmo com a maré!']),
    A(['Desculpa a demora, tava tomando um café, vendo o canal.'], ['O café esfriou de novo.'], ['Chegou! Mais um motivo pra outro café.']),
    A(['Tava ouvindo ópera no rádio, bem alto.'], ['A ópera chegou no ato final.'], ['Isso merece um ‘bravo’!']),
    A(['Os turistas não param de fotografar minha porta.'], ['Mais turistas tirando foto da porta.'], ['Chegou! E nenhum turista levou.']),
    A(['Acabei de voltar da feira do Rialto.'], ['Ainda tô guardando as compras da feira.'], ['Que bom! Junto com os tomates da feira.']),
    A(['Tô seguindo a receita da minha nonna.'], ['A receita da nonna tem mais um passo.'], ['A nonna ia ficar orgulhosa: chegou!']),
    A(['Atendi correndo: tava afinando o bandolim pra festa de sábado.'], ['O bandolim desafinou de novo.'], ['Deve ser a corda nova do bandolim!']),
    A(['Tô pintando máscaras pro carnaval.'], ['A tinta das máscaras ainda tá fresca.'], ['Ah, chegou! Deve ser a purpurina das máscaras.']),
    A(['Tava conversando de janela em janela, como sempre.'], ['A conversa da janela continua.'], ['Já vou contar pela janela que chegou!']),
  ],
  // ---- Morro ----
  fav: [
    A(['Tô fazendo o almoço de domingo pra família inteira.'], ['O feijão tá quase no ponto.'], ['Chegou antes do almoço de domingo!']),
    A(['O gás acabou no meio do arroz.'], ['O gás ainda não chegou. Só você.'], ['Achei que era o gás, mas também serve!']),
    A(['A internet caiu bem no meio de uma chamada.'], ['A internet continua fora.'], ['Até que enfim! Melhor que a internet, que nem voltou.']),
    A(['Desculpa o som alto, é ensaio do pagode.'], ['O ensaio do pagode continua.'], ['Ótimo! Vai ter pagode pra comemorar.']),
    A(['Acabei de subir a escadaria com seis sacolas.'], ['Ainda tô sem fôlego da escadaria.'], ['Chegou! E eu nem precisei descer pra buscar.']),
    A(['Tô fazendo uns consertos de costura pra freguesa.'], ['A costura tá quase pronta.'], ['Deve ser a linha que eu encomendei!']),
    A(['Tô ajudando meu filho com a lição de casa.'], ['A lição de matemática continua difícil.'], ['Chegou! Agora volto pra lição de matemática.']),
    A(['Tô fazendo a unha de uma cliente na cozinha.'], ['A cliente da unha tá esperando.'], ['Deve ser o esmalte novo! Chegou na hora.']),
    A(['Os cachorros da rua já te adotaram, foi?'], ['Os cachorros continuam de olho em você.'], ['Que bom! E os cachorros aprovaram.']),
    A(['Tô vendendo geladinho pela janela, um minuto.'], ['Mais um geladinho vendido.'], ['Ah, chegou! Merece um geladinho por conta da casa.']),
  ],
  // ---- Colheita ----
  farm: [
    A(['Tô passando um café no coador de pano.'], ['O café já tá passado.'], ['Chegou com o café pronto! Bem na hora.']),
    A(['Tô virando os queijos da semana.'], ['Os queijos ainda tão curando.'], ['Deve ser o coalho pro queijo! Chegou.']),
    A(['O rádio deu chuva e eu tava recolhendo as coisas.'], ['A chuva nem veio até agora.'], ['Chegou antes da chuva, que beleza.']),
    A(['Tô mexendo um tacho de doce de leite.', 'Não posso largar o doce, senão gruda.'], ['O doce de leite tá quase no ponto.'], ['Chegou no ponto, igual ao doce!']),
    A(['O trator engasgou e eu tava com a cabeça no motor.'], ['O trator continua engasgando.'], ['Deve ser a peça do trator! Até que enfim.']),
    A(['Tô separando verdura pra feira de amanhã.'], ['Ainda falta amarrar os maços.'], ['Até que enfim! Dia bom na roça.']),
    A(['Você me pegou esticando arame da cerca.'], ['O arame da cerca escapou de novo.'], ['Deve ser o arame novo! Chegou.']),
    A(['Tô separando semente de abóbora.'], ['As sementes tão espalhadas na mesa.'], ['Ótimo! É a semente que eu esperava.']),
    A(['Tem pão caseiro no forno a lenha.'], ['O pão tá dourando.'], ['Chegou com o pão quentinho!']),
    A(['Você fechou a porteira? Senão as galinhas fogem.'], ['Conferi a porteira de novo.'], ['Chegou! E a porteira tá fechada, né?']),
  ],
  celeiro: [  // celeiros e galpões da roça
    A(['Tô consertando a ordenhadeira.'], ['A ordenhadeira ainda tá desmontada.'], ['Deve ser a peça da ordenhadeira!']),
    A(['Eu estava empilhando saco de ração.'], ['Mais uns dez sacos pra empilhar.'], ['Chegou! Mais leve que saco de ração.']),
    A(['Tô guardando a colheita antes da chuva.'], ['A colheita tá quase toda guardada.'], ['Que bom! Vai junto com a colheita.']),
    A(['Desculpa a demora, tava afiando as ferramentas.'], ['A enxada já tá afiada.'], ['Deve ser a enxada nova!']),
    A(['Tava tirando o barro do trator.'], ['O barro do trator não sai.'], ['Ah, chegou! O trator pode esperar.']),
  ],
  // ---- Nevasca ----
  neve: [
    A(['Atendi de luva e tudo, a casa tá gelada.'], ['Ainda não tirei as luvas.'], ['Até que enfim! Vou abrir com um chocolate quente.']),
    A(['Tem sopa no fogo, então fecha logo essa porta!'], ['A sopa já tá fervendo.'], ['Chegou a tempo da sopa!']),
    A(['O cano da cozinha congelou de novo.'], ['O cano continua congelado.'], ['Deve ser a manta pro cano! Chegou.']),
    A(['Tô tricotando um gorro e perdi a conta dos pontos.'], ['Perdi a conta dos pontos de novo.'], ['Ótimo! Deve ser a lã que faltava.']),
    A(['Atendi correndo: tava tentando acender a lareira, que não pega.'], ['A lareira finalmente pegou.'], ['Chegou com a lareira acesa. Perfeito.']),
    A(['Meu carro não pega com esse frio.'], ['O carro continua sem pegar.'], ['Ainda bem que você veio, meu carro nem sai.']),
    A(['Perdi um pé de luva e tô procurando.'], ['A luva ainda não apareceu.'], ['Chegou! E achei a luva no bolso.']),
    A(['Tô fazendo chocolate quente pras crianças.'], ['O chocolate quente acabou rapidinho.'], ['Chegou! Merece um chocolate quente.']),
    A(['Tava me arrumando pra ir ao Grillby’s me esquentar.'], ['Ainda vou passar no Grillby’s.'], ['Que bom! Agora posso ir ao Grillby’s.']),
    A(['O limpa-neve passou cedo e acordou todo mundo.'], ['O limpa-neve deve passar de novo.'], ['Chegou antes do limpa-neve!']),
  ],
  // ---- Jardins (condomínio com lago, clube e parque) ----
  gard: [
    A(['Tava na caminhada em volta do lago.'], ['Ainda faltam duas voltas no lago.'], ['Ah, chegou! Mereci, depois da caminhada.']),
    A(['Acabei de chegar do clube, ainda de toalha.'], ['A toalha ainda tá molhada.'], ['Até que enfim! Vou levar pro clube mostrar.']),
    A(['O grupo do condomínio tá discutindo os patos do lago.'], ['O grupo continua discutindo os patos.'], ['Ótimo! Vou avisar no grupo do condomínio.']),
    A(['Tô esperando o jardineiro do condomínio.'], ['O jardineiro ainda não veio.'], ['Chegou antes do jardineiro!']),
    A(['A portaria nem avisou que você vinha.'], ['A portaria continua sem avisar nada.'], ['Chegou! E sem a portaria avisar.']),
    A(['Tô preparando um churrasco pros amigos do clube.'], ['A carne tá quase pronta.'], ['Chegou! Deve ser o carvão.']),
    A(['Acabei de voltar da aula de tênis.'], ['Ainda tô com a raquete na mão.'], ['Que bom! Ganhei o dia, já que perdi no tênis.']),
    A(['Tô escolhendo a tinta da parede da sala.'], ['Ainda não decidi a tinta.'], ['Ah, chegou! Deve ser o catálogo de tintas.']),
    A(['Você me pegou empurrando meu neto no balanço do parque.'], ['Meu neto quer mais balanço.'], ['Até que enfim! Meu neto vai adorar.']),
  ],
  // ---- Modernista ----
  mdh: [
    A(['O arquiteto veio de novo mudar uma parede de lugar.'], ['A parede ainda não mudou de lugar.'], ['Ótimo! Deve ser a luminária do arquiteto.']),
    A(['Tô montando uma cadeira de designer sem manual.'], ['A cadeira ainda tem peças sobrando.'], ['Deve ser a peça que faltava na cadeira!']),
    A(['Eu estava ouvindo bossa nova no vinil.'], ['Já troquei o disco.'], ['Chegou! Merece outro disco de bossa nova.']),
    A(['Desculpa a demora, tava meditando.'], ['A meditação foi pro espaço.'], ['Chegou! Paz restaurada.']),
    A(['Tô pendurando um quadro que insiste em ficar torto.'], ['O quadro continua torto.'], ['Que bom! O quadro pode esperar.']),
    A(['A cancela demorou pra subir pra você também?'], ['A cancela continua lenta.'], ['Chegou, mesmo com a cancela!']),
    A(['Tô esperando o paisagista há uma semana.'], ['O paisagista ainda não deu sinal.'], ['Chegou antes do paisagista!']),
    A(['Tava fotografando a luz da tarde na sala.'], ['A luz já mudou.'], ['Chegou com a luz perfeita!']),
  ],
  'mds:cafe': [A(['Tô tirando um espresso pra um cliente.'], ['Mais um café saindo.'], ['Chegou o café em grão! Bem na hora.'])],
  'mds:bakery': [A(['A fornada das três tá saindo.'], ['A fornada já saiu.'], ['Deve ser o fermento! Ufa.'])],
  'mds:flowers': [A(['Tô montando um buquê de casamento.'], ['O buquê tá quase pronto.'], ['Ah, chegou! Devem ser os vasos novos.'])],
  'mds:books': [A(['Atendi correndo: tava organizando a estante por tamanho.'], ['A estante continua bagunçada.'], ['Até que enfim! Mais livros pra estante.'])],
  'mds:optic': [A(['Tô ajustando os óculos de um cliente.'], ['Os óculos do cliente ainda tão tortos.'], ['Deve ser a armação nova!'])],
  'mds:market': [A(['Tô repondo as prateleiras.'], ['As prateleiras esvaziaram de novo.'], ['Mais mercadoria pra prateleira. Ótimo!'])],
  // ---- Operário ----
  row: [
    A(['Acabei de chegar do turno da noite.'], ['Ainda nem tirei a botina.'], ['Ótimo! Agora posso dormir em paz.']),
    A(['Tô preparando a marmita de amanhã.'], ['A marmita já tá pronta.'], ['Chegou! Cabe junto com a marmita.']),
    A(['Os caminhões passam o dia todo e a janela treme.'], ['Mais um caminhão passando.'], ['Chegou no meio de tanto caminhão!']),
    A(['Tava ouvindo o programa de rádio da manhã.'], ['O programa de rádio continua.'], ['Vou ligar pro rádio pra contar que chegou.']),
    A(['Tô consertando a torneira da cozinha.'], ['A torneira continua pingando.'], ['Deve ser o reparo da torneira!']),
    A(['Você me pegou jogando truco com o pessoal da oficina.'], ['O truco tá me esperando.'], ['Chegou! Isso vale um truco.']),
    A(['Voltei agora da reunião do sindicato.'], ['A reunião continua à noite.'], ['Que bom! Uma boa notícia no dia.']),
    A(['Tô enchendo a garrafa térmica de café.'], ['Café pronto, se quiser.'], ['Ah, chegou! Café e encomenda: dia completo.']),
  ],
  'wsh:mech': [
    A(['Tô com a cabeça dentro de um motor.', 'Desculpa a mão suja de graxa.'], ['O motor ainda tá aberto.'], ['Deve ser a junta do motor! Chegou na hora.']),
    A(['O dono quer o carro pra hoje, e o carro quer pra semana.'], ['O carro continua sem querer.'], ['Até que enfim! Uma coisa a menos pra esperar.']),
  ],
  'wsh:tire': [
    A(['Tô remendando um pneu furado.'], ['Mais um pneu furado chegou.'], ['Deve ser a câmara de ar!']),
    A(['Tô calibrando os pneus de um caminhão.'], ['O caminhão ainda tá na fila.'], ['Ótimo! Melhor que pneu furado.']),
  ],
  'wsh:tools': [
    A(['Tô separando parafuso por tamanho.'], ['Ainda faltam os parafusos pequenos.'], ['Chegou! Deve ser o lote de parafusos.']),
    A(['Um cliente quer um parafuso ‘daquele jeito’.'], ['O cliente ainda não sabe qual parafuso.'], ['Chegou! E eu sei exatamente o que é.']),
  ],
  'wsh:market': [
    A(['Tô atendendo a fila do caixa.'], ['A fila do caixa continua.'], ['Deve ser a mercadoria da prateleira!']),
    A(['Tô pesando banana pra freguesa.'], ['A balança continua emperrando.'], ['Que bom! Vai direto pro estoque.']),
  ],
  // ---- Lua ----
  moon: [
    A(['Eu estava regando as plantas da estufa.'], ['As plantas da estufa pediram mais água.'], ['Ah, chegou! As plantas da estufa vão adorar.']),
    A(['Desculpa a demora, tava calibrando meu radar de encomendas.'], ['O radar continua desregulado.'], ['Meu radar acertou: era meu!']),
    A(['Tava vendo a Terra pela janela redonda.'], ['A Terra continua lá, linda.'], ['Chegou direto da Terra? Que chique!']),
    A(['Atendi correndo: tava tirando poeira lunar do tapete.'], ['A poeira lunar voltou toda.'], ['Chegou sem um grão de poeira!']),
    A(['Achei que eram as minhas meias antigravidade.'], ['As meias antigravidade ainda não vieram.'], ['Finalmente! Devem ser as meias antigravidade.']),
    A(['Tava ajudando a abastecer um foguete.'], ['O foguete ainda tá abastecendo.'], ['Chegou antes do foguete decolar!']),
    A(['Você me pegou almoçando sopa de cometa em tubinho.'], ['A sopa de cometa flutuou de novo.'], ['Até que enfim! Melhor que sopa em tubinho.']),
    A(['Eu estava tentando sintonizar novela da Terra.'], ['O sinal da Terra caiu de novo.'], ['Ótimo! Até o sinal da Terra voltou.']),
    A(['Pulei alto demais pra atender e bati no teto.'], ['Bati no teto de novo.'], ['Vou pular de alegria. Com cuidado.']),
    A(['Desculpa a demora, tava cochilando, flutuando no quarto.'], ['Voltei a flutuar no cochilo.'], ['Chegou! Que despertar bom.']),
  ],
  // ---- Medieval ----
  med: [
    A(['Tenho sopa no caldeirão, então serei breve.'], ['A sopa já ferveu duas vezes.'], ['Chegou a tempo da sopa!']),
    A(['Essa carroça sem cavalo ainda me assusta.'], ['A carroça sem cavalo voltou!'], ['Chegou! Até me acostumei com a carroça sem cavalo.']),
    A(['As galinhas escaparam e eu estava catando uma por uma.'], ['Ainda falta uma galinha.'], ['Que bom! E as galinhas voltaram todas.']),
    A(['Estava fiando lã para o inverno.'], ['O fuso continua girando.'], ['Deve ser a lã nova! Que alegria.']),
    A(['Estava remendando minha capa de chuva.'], ['A capa ainda tem um furo.'], ['Ah, chegou! A capa pode esperar.']),
    A(['Acabei de voltar do mercado com a cesta cheia.'], ['Ainda nem guardei os nabos.'], ['Até que enfim! Junto com os nabos da feira.']),
    A(['Estava fazendo velas para a noite.'], ['As velas ainda estão moles.'], ['Chegou antes de anoitecer. Que bom.']),
    A(['Pensei que fosse o cobrador de impostos.'], ['Ainda bem que não é o cobrador.'], ['Ufa! Não é imposto, é encomenda.']),
    A(['Levei minha massa ao forno da padaria e estou esperando.'], ['O pão ainda não assou.'], ['Chegou junto com o pão!']),
    A(['Estava tapando uma goteira com palha.'], ['A goteira voltou a pingar.'], ['Ótimo! Que não chova antes de eu abrir.']),
    A(['Estou mexendo a cerveja caseira.'], ['A cerveja continua fermentando.'], ['Chegou! Isso merece um gole.']),
  ],
  'mvs:bakery': [A(['A fornada está saindo, sinta o cheiro.'], ['Mais uma fornada no forno.'], ['Deve ser o fermento novo! Chegou na hora.'])],
  'mvs:smithy': [A(['Ferro quente não espera, seja breve.'], ['O ferro esfriou enquanto conversávamos.'], ['Devem ser as tenazes novas!'])],
  'mvs:tavern': [A(['A taverna está cheia e as canecas, vazias.'], ['Mais canecas para encher.'], ['Chegou! Rodada por conta da casa… quase.'])],
  'mvs:textile': [A(['Estou no meio de um pano no tear.'], ['O tear não para.'], ['Devem ser as linhas novas!'])],
};

/** Atividades ligadas ao que a casa realmente tem (a chave é a característica; 'x:' vale para 'x:<qualquer coisa>'). */
const FEAT = {
  base: {
    // casas
    chimney: A(['Tô cuidando do fogão a lenha.', 'Tava pondo lenha no fogo, olha a fumaça.'], ['A lenha do fogão tá acabando.'], ['Que bom! Vou comemorar com um bolo no fogão a lenha.']),
    dish: A(['Atendi correndo: tava vendo o jogo pela parabólica.', 'A parabólica pega trezentos canais, e eu tava no melhor.'], ['Voltei pro jogo da parabólica.'], ['Ah, chegou! E a parabólica pegou o gol.']),
    solar: A(['Tava limpando os painéis solares.'], ['Os painéis ainda tão com poeira.'], ['Até que enfim! E o sol tá rendendo nos painéis.']),
    tank: A(['Subi pra ver a boia da caixa-d’água.'], ['A caixa-d’água ainda tá enchendo.'], ['Chegou antes da caixa-d’água encher!']),
    rooster: A(['O galo do telhado virou pro vento errado de novo.'], ['O galo do telhado ainda tá torto.'], ['Ótimo! Até o galo do telhado ficou feliz.']),
    kite: A(['Tô tentando tirar a pipa do meu telhado.', 'Tem uma pipa no meu telhado e eu tava com a vara de bambu.'], ['A pipa continua lá em cima.'], ['Chegou! Agora só falta a pipa descer.']),
    patch: A(['Você me pegou procurando telha igual pro remendo.'], ['Ainda não achei telha igual.'], ['Deve ser a telha pro remendo!']),
    mailbox: A(['Ia endireitar a caixa de correio agora mesmo.'], ['A caixa de correio continua torta.'], ['Chegou! E nem precisou da caixa de correio.']),
    fence: A(['Tô procurando a tábua que caiu da cerca.'], ['A tábua da cerca sumiu de vez.'], ['Deve ser a tábua nova da cerca!']),
    fruit: A(['Eu estava colhendo fruta no pé pra fazer doce.'], ['O doce de fruta tá no fogo.'], ['Que bom! Leva uma fruta pra viagem.']),
    bare: A(['Tô esperando essa árvore dar folha desde março.'], ['A árvore continua pelada.'], ['Ah, chegou! Antes das folhas da árvore.']),
    cactus: A(['Desculpa a demora, tava replantando o cacto e furei o dedo.'], ['O dedo ainda tá doendo.'], ['Até que enfim! Com cuidado, que o cacto é ciumento.']),
    sunflowers: A(['Tava regando os girassóis.'], ['Os girassóis viraram pro sol de novo.'], ['Ótimo! Os girassóis até se viraram pra ver.']),
    ballbush: A(['Atendi correndo: tava podando o arbusto pra ficar redondinho.'], ['O arbusto ainda tá meio quadrado.'], ['Chegou! O arbusto pode esperar.']),
    doghouse: A(['Tava dando banho no cachorro.', 'Atendi com a toalha do cachorro no ombro.'], ['O cachorro fugiu do banho.'], ['Chegou! Se for ração, o cachorro agradece.']),
    pool: A(['Você me pegou na piscina inflável, desculpa a água.'], ['Já voltei pra piscina.'], ['Que bom! Vou abrir de dentro da piscina.']),
    trampoline: A(['As crianças tão pulando no trampolim desde cedo.'], ['O trampolim não para.'], ['Ah, chegou! As crianças vão pular de alegria.']),
    swing: A(['Eu tava no balanço, aproveitando o vento.'], ['Voltei pro balanço.'], ['Até que enfim! Vou abrir no balanço.']),
    bike: A(['Eu estava consertando a corrente da bicicleta.'], ['A corrente escapou de novo.'], ['Deve ser a corrente nova da bicicleta!']),
    flamingo: A(['Desculpa a demora, tava endireitando o flamingo do jardim.'], ['O flamingo tombou de novo.'], ['Ótimo! O flamingo aprova.']),
    gnome: A(['Tava retocando a pintura do gnomo.'], ['O gnomo ainda tá secando.'], ['Chegou! O gnomo sabia que vinha hoje.']),
    clothesline: A(['Atendi correndo: tava estendendo roupa no varal.'], ['Mais um lençol no varal.'], ['Chegou! E a roupa secou junto.']),
    tires: A(['Tô transformando esses pneus numa horta.'], ['A horta de pneus ainda tá sem terra.'], ['Deve ser a terra pra horta de pneus!']),
    fountain: A(['Tava limpando a fonte do jardim.'], ['A fonte entupiu de novo.'], ['Que bom! Até a fonte voltou a jorrar.']),
    // prédios residenciais
    'fac:plants': A(['Você me pegou regando as plantas da sacada.'], ['As plantas da sacada pediram mais água.'], ['Ah, chegou! Vai fazer companhia às plantas.']),
    'fac:clothes': A(['Eu estava pendurando roupa na janela.'], ['Uma meia caiu da janela.'], ['Até que enfim! Junto com a roupa seca.']),
    'fac:ac': A(['O ar-condicionado tá pingando em todo mundo.'], ['O ar-condicionado continua pingando.'], ['Ótimo! Deve ser o cano do ar-condicionado.']),
    'fac:mural': A(['Tem gente parando pra fotografar o grafite da parede.'], ['Mais gente fotografando o grafite.'], ['Chegou! Vou abrir com o grafite de fundo.']),
    'atop:pool': A(['Atendi pingando: tava na piscina do terraço.'], ['Voltei pra piscina do terraço.'], ['Chegou! Vou abrir na beira da piscina.']),
    'atop:garden': A(['Tava cuidando do jardim do terraço.'], ['O jardim do terraço tá pedindo água.'], ['Que bom! Vai pro jardim do terraço.']),
    'atop:solar': A(['Subi pra limpar os painéis do terraço.'], ['Os painéis ainda tão sujos.'], ['Ah, chegou! E o sol tá rendendo.']),
    'atop:antenna': A(['Subi pra arrumar a antena do terraço.'], ['A TV ainda tá chuviscando.'], ['Até que enfim! E a TV voltou.']),
    'atop:tank': A(['Faltou água no prédio, eu tava vendo a caixa-d’água.'], ['A água ainda não voltou.'], ['Ótimo! Antes da água, mas chegou.']),
    'gnd:moto': A(['Atendi correndo: tava lavando a moto.'], ['A moto ainda tá cheia de espuma.'], ['Deve ser o capacete novo da moto!']),
    'gnd:bikes': A(['Tava calibrando a bicicleta no bicicletário.'], ['A bicicleta murchou de novo.'], ['Deve ser a bomba de ar da bicicleta!']),
    // galpões
    'w:forklift': A(['Você me pegou manobrando a empilhadeira.'], ['A empilhadeira empacou de novo.'], ['Chegou! Nem precisa da empilhadeira.']),
    'w:truck': A(['Tô descarregando o caminhão.'], ['O caminhão ainda tá pela metade.'], ['Chegou! Mais rápido que o caminhão.']),
    'w:pallets': A(['Eu estava contando os pallets da entrada.'], ['Perdi a conta dos pallets.'], ['Que bom! Uma caixa a menos pra contar.']),
    'w:barrels': A(['Desculpa a demora, tava conferindo os barris.'], ['Os barris continuam fora do lugar.'], ['Ah, chegou! Mais leve que barril.']),
    // prédios contemporâneos
    'mtop:trees': A(['Tava regando as árvores da cobertura.'], ['As árvores da cobertura pediram mais água.'], ['Até que enfim! Vou levar pra cobertura.']),
    'mtop:pergola': A(['Atendi correndo: tava varrendo o pergolado da cobertura.'], ['O pergolado tá cheio de folha.'], ['Ótimo! Registrado.']),
    'mtop:flag': A(['Tava trocando a bandeira do mastro.'], ['A bandeira enroscou no mastro.'], ['Chegou! E a bandeira desenroscou.']),
    // Veneza
    'v:laundry': A(['Você me pegou pendurando roupa sobre o canal.'], ['Uma meia caiu no canal agora há pouco.'], ['Chegou! E não caiu no canal.']),
    'v:flowers': A(['Eu estava regando as flores da janela.'], ['As flores da janela pediram mais água.'], ['Que bom! As flores da janela agradecem.']),
    'v:pots': A(['Desculpa a demora, tava trocando a terra dos vasos da sacada.'], ['A sacada ficou cheia de terra.'], ['Ah, chegou! Vai fazer companhia aos vasos.']),
    'v:lamp': A(['Tava limpando a lanterna da porta.'], ['A lanterna ainda tá embaçada.'], ['Até que enfim! Vou deixar a lanterna acesa pra comemorar.']),
    'v:poles': A(['Atendi correndo: tava amarrando o barco nos postes da entrada.'], ['O barco soltou do poste de novo.'], ['Ótimo! E o barco ficou amarrado.']),
    'vaw:': A(['Tava esticando o toldo, por causa do sol.'], ['O toldo ainda tá torto.'], ['Chegou! Na sombra do toldo, que beleza.']),
    // Morro
    'fv:laundry': A(['Você me pegou estendendo roupa na laje.'], ['O vento quase levou um lençol.'], ['Chegou! Vai secar junto com a roupa.']),
    'fv:pots': A(['Eu estava regando as plantas da porta.'], ['As plantas pediram mais água.'], ['Que bom! As plantas aprovaram.']),
    'fv:stairs': A(['Desci da laje pela escada, devagar.'], ['Subi e desci a escada da laje de novo.'], ['Ah, chegou! E eu nem precisei subir na laje.']),
    'ftank:': A(['Faltou água, eu tava olhando a caixa-d’água.'], ['A água ainda não voltou.'], ['Chegou antes da água!']),
    'faw:': A(['Desculpa a demora, tava ajeitando o toldo da porta.'], ['O toldo continua torto.'], ['Até que enfim! Debaixo do toldo, que tá sol.']),
    // Colheita
    'rcrop:corn': A(['Tava colhendo milho desde cedo.'], ['Ainda tem muito milho pra colher.'], ['Ótimo! Vai ter pamonha pra comemorar.']),
    'rcrop:pasture': A(['Atendi correndo: tava tirando leite das vacas.'], ['As vacas tão reclamando.'], ['Chegou! As vacas até mugiram.']),
    'rcrop:orchard': A(['Tava colhendo fruta no pomar.'], ['O cesto de fruta tá quase cheio.'], ['Chegou! Leva uma fruta pra estrada.']),
    'rcrop:garden': A(['Você me pegou capinando a horta.'], ['A horta ainda tem mato.'], ['Que bom! Vai junto com as verduras.']),
    'rf:coop': A(['Eu estava recolhendo os ovos do galinheiro.'], ['Faltou um ovo no galinheiro.'], ['Ah, chegou! E as galinhas botaram bem hoje.']),
    'rf:scarecrow': A(['Desculpa a demora, tava trocando o chapéu do espantalho.'], ['O espantalho continua sem chapéu.'], ['Deve ser o chapéu novo do espantalho!']),
    'rf:wood': A(['Tava rachando lenha.'], ['Ainda falta lenha pra rachar.'], ['Até que enfim! A lenha pode esperar.']),
    'rf:barrow': A(['Atendi correndo: tava levando adubo no carrinho de mão.'], ['O carrinho de mão tá pela metade.'], ['Ótimo! Mais leve que o carrinho de adubo.']),
    'rf:veg': A(['Tava colhendo couve na hortinha.'], ['A couve tá de molho.'], ['Chegou! Junto com a couve fresquinha.']),
    'rf:boots': A(['Atendi de meia porque as botas tão cheias de barro.'], ['Ainda tô de meia.'], ['Chegou! Nem precisei calçar as botas.']),
    'rf:pots': A(['Você me pegou regando os vasos da entrada.'], ['O regador tá vazio.'], ['Que bom! Os vasos aprovaram.']),
    'rx:hay': A(['Eu estava empilhando fardo de feno.'], ['O feno ainda tá espalhado.'], ['Ah, chegou! Mais leve que fardo de feno.']),
    'rx:tank': A(['Subi pra limpar a caixa-d’água.'], ['A caixa-d’água ainda tá vazia.'], ['Chegou antes da água voltar!']),
    rporch: A(['Desculpa a demora, tava descansando na varanda.'], ['Voltei pra varanda.'], ['Até que enfim! Vou abrir na varanda.']),
    // Lua
    'mtop:solar': A(['Tava tirando poeira lunar dos painéis.'], ['Os painéis empoeiraram de novo.'], ['Ótimo! E os painéis tão brilhando.']),
    'mtop:dish': A(['Atendi correndo: tava apontando a parabólica pra Terra.'], ['A parabólica perdeu a Terra de novo.'], ['Chegou! Mais rápido que o sinal da Terra.']),
    'mtop:antenna': A(['Tava ajustando a antena do teto.'], ['A antena entortou de novo.'], ['Chegou! A antena captou a boa notícia.']),
    // Jardins
    gperg: A(['Você me pegou podando a trepadeira do pergolado.'], ['A trepadeira cresceu de novo.'], ['Que bom! Vou abrir debaixo do pergolado.']),
    gbench: A(['Eu estava lendo no banco da varanda.'], ['Voltei pro banco da varanda.'], ['Ah, chegou! Vou abrir no banco da varanda.']),
    'gflow:': A(['Desculpa a demora, tava regando as flores.'], ['As flores pediram mais água.'], ['Até que enfim! As flores até se animaram.']),
    'gdeco:statue': A(['Tava tirando o pó da escultura.'], ['A escultura já empoeirou de novo.'], ['Ótimo! A escultura aprova.']),
    'gdeco:vases': A(['Atendi correndo: tava trocando a terra dos vasos.'], ['Ainda falta um vaso.'], ['Chegou! Mais um enfeite pra entrada.']),
    'gmail:': A(['Tava conferindo a caixa de correio.'], ['A caixa de correio continua vazia.'], ['Chegou! Melhor que carta.']),
    'gmod:garage': A(['Você me pegou arrumando a garagem.'], ['A garagem continua uma bagunça.'], ['Que bom! Mais uma caixa pra garagem.']),
    // Modernista
    mdpool: A(['Eu estava tirando folha do espelho-d’água.'], ['Caiu mais folha no espelho-d’água.'], ['Ah, chegou! O espelho-d’água tá limpinho.']),
    mdperg: A(['Desculpa a demora, tava ajeitando as plantas do pergolado.'], ['As plantas do pergolado cresceram.'], ['Até que enfim! Vou abrir na sombra do pergolado.']),
    mdstone: A(['Tava rastelando as pedrinhas do jardim.'], ['As pedrinhas saíram do lugar.'], ['Ótimo! E as pedrinhas tão alinhadas.']),
    mdbench: A(['Atendi correndo: tava lendo no banco do jardim.'], ['Voltei pro banco do jardim.'], ['Chegou! Leitura nova pro banco do jardim.']),
    mdvase: A(['Tava regando os vasos da porta.'], ['Os vasos pediram mais água.'], ['Chegou! Os vasos aprovaram.']),
    'mdgar:': A(['Você me pegou arrumando a garagem.'], ['A garagem continua bagunçada.'], ['Que bom! Mais uma caixa pra garagem.']),
    mdwood: A(['Eu estava passando óleo no painel de madeira.'], ['O óleo ainda tá secando.'], ['Ah, chegou! E o painel tá brilhando.']),
    // Operário
    rbike: A(['Desculpa a demora, tava calibrando o pneu da bicicleta.'], ['A bicicleta murchou de novo.'], ['Deve ser a câmara nova da bicicleta!']),
    rbench: A(['Tava no banquinho tomando um ar.'], ['Voltei pro banquinho.'], ['Até que enfim! Vou abrir no banquinho.']),
    rflower: A(['Atendi correndo: tava regando a floreira da janela.'], ['A floreira pediu mais água.'], ['Ótimo! A floreira aprova.']),
    'rmail:': A(['Tava conferindo a caixa de correio.'], ['Só chegou conta na caixa de correio.'], ['Chegou! Melhor que conta.']),
    'rawn:': A(['Você me pegou ajeitando o toldo da porta.'], ['O toldo voltou a cair.'], ['Chegou! Debaixo do toldo, que tá sol.']),
    // Medieval
    'mv:chimney': A(['Estava cuidando do fogo da lareira.'], ['O fogo pediu mais lenha.'], ['Que bom! Vou abrir junto do fogo.']),
    'mv:barrels': A(['Estava conferindo os barris da porta.'], ['Um barril rolou de novo.'], ['Ah, chegou! Mais leve que barril.']),
    'mv:flower': A(['Estava regando as floreiras.'], ['As floreiras pediram mais água.'], ['Até que enfim! As floreiras aprovam.']),
    'mv:ivy': A(['Estava podando a trepadeira, que cresce sem parar.'], ['A trepadeira já cresceu de novo.'], ['Ótimo! Antes que a trepadeira cubra a porta.']),
    'mv:lantern': A(['Estava pondo óleo na lanterna da porta.'], ['A lanterna ainda está fraca.'], ['Chegou! Vou acender a lanterna para comemorar.']),
    'mv:banner:': A(['Estava escovando o estandarte.'], ['O estandarte enroscou de novo.'], ['Chegou! Digno de estandarte.']),
    'mv:shield:': A(['Estava polindo o escudo da fachada.'], ['O escudo ainda está embaçado.'], ['Que bom! O escudo da casa agradece.']),
    // Bosque
    'fo:leaves': A(['Eu estava juntando folhas num monte.'], ['O monte de folhas desmoronou.'], ['Ah, chegou! Vou pular no monte de folhas.']),
    'fo:rake': A(['Larguei o ancinho pra atender.'], ['O ancinho tá me esperando.'], ['Até que enfim! O ancinho pode esperar.']),
    'fo:apples': A(['Desculpa a demora, tava escolhendo maçã pra torta.'], ['A torta tá no forno.'], ['Ótimo! Junto com a torta de maçã.']),
    'fo:wood': A(['Tava empilhando lenha pro inverno.'], ['Ainda falta lenha pro inverno.'], ['Chegou! Antes do inverno, que beleza.']),
    'fo:wreath': A(['Atendi correndo: tava pendurando a guirlanda da porta.'], ['A guirlanda caiu de novo.'], ['Chegou! E a guirlanda até ficou reta.']),
    'fo:bench': A(['Tava sentad{o} no banco, tomando sol.'], ['Voltei pro banco.'], ['Que bom! Vou abrir no banco.']),
    'fo:porch': A(['Você me pegou na varanda vendo as folhas caírem.'], ['Voltei pra varanda.'], ['Ah, chegou! Vou abrir na varanda.']),
    'fo:tree:': A(['Eu estava varrendo as folhas da árvore da entrada.'], ['A árvore da entrada soltou mais folhas.'], ['Até que enfim! E a árvore da entrada aplaudiu com folhas.']),
    // Cachoeira
    'cy:balcony': A(['Desculpa a demora, tava na sacada olhando o desfiladeiro.'], ['Voltei pra sacada.'], ['Ótimo! Vou abrir na sacada.']),
    'cy:garden': A(['Tava cuidando do jardinzinho.'], ['O jardinzinho pediu mais água.'], ['Chegou! O jardinzinho aprova.']),
    'cy:vases': A(['Atendi correndo: tava regando os vasos da porta.'], ['Os vasos secaram de novo.'], ['Chegou! Os vasos aprovaram.']),
    'cy:canopy': A(['Tava tirando musgo da cobertura da porta.'], ['O musgo voltou.'], ['Que bom! Debaixo da cobertura, sequinho.']),
    // Nevasca (detalhes de inverno)
    'ws:snowman:': A(['Você me pegou terminando o boneco de neve com as crianças.'], ['O boneco de neve perdeu o nariz.'], ['Ah, chegou! O boneco de neve até sorriu.']),
    'ws:sled': A(['Eu estava encerando o trenó.'], ['O trenó ainda tá grudando.'], ['Até que enfim! Mais rápido que trenó.']),
    'ws:skis': A(['Ia sair pra esquiar agora mesmo.'], ['Os esquis tão me esperando.'], ['Ótimo! Agora posso ir esquiar.']),
    'ws:shovel': A(['Desculpa a demora, tava tirando neve da porta com a pá.'], ['A neve voltou a cobrir a porta.'], ['Chegou! Valeu a pá de neve.']),
    'ws:wood': A(['Tava buscando lenha pra lareira.'], ['Ainda falta lenha.'], ['Chegou! Vou abrir junto da lareira.']),
    'ws:icicles': A(['Atendi correndo: tava quebrando os pingentes de gelo do beiral.'], ['Os pingentes cresceram de novo.'], ['Que bom! Sem nenhum pingente na cabeça.']),
    'ws:lights': A(['Tava desembaraçando as luzes da fachada.'], ['As luzes enroscaram de novo.'], ['Ah, chegou! E as luzes acenderam todas.']),
    'ws:pine': A(['Você me pegou tirando neve do pinheirinho.'], ['O pinheirinho encheu de neve de novo.'], ['Até que enfim! O pinheirinho até brilhou.']),
  },
  snow: {     // Nevasca: o que muda no inverno
    clothesline: A(['Fui recolher a roupa e ela tava dura de gelo.'], ['A roupa do varal continua congelada.'], ['Ótimo! Mais quentinho que a roupa do varal.']),
    chimney: A(['Eu estava pondo lenha na lareira, olha a fumaça.'], ['A lareira pediu mais lenha.'], ['Chegou! Vou abrir junto da lareira.']),
    solar: A(['Desculpa a demora, tava tirando neve dos painéis solares.'], ['Os painéis já tão cobertos de novo.'], ['Chegou! E os painéis já tão sem neve.']),
    swing: A(['Tava tirando neve do balanço pras crianças.'], ['O balanço encheu de neve de novo.'], ['Que bom! As crianças vão adorar.']),
  },
};

/** Relação de lugar entre a casa e o próximo destino — só usada quando logic.js calcula que é verdade. */
const REL = {
  front: ['É na quadra aqui da frente.', 'Fica na quadra da frente, do outro lado da rua.'],
  back: ['É na quadra de trás.', 'Fica na quadra de trás desta.'],
  beside: ['É na quadra do lado.', 'Fica na quadra vizinha.'],
  near: ['É aqui do lado.', 'Fica pertinho daqui.'],
  far: ['Fica longe daqui, viu?', 'É um bom pedaço daqui.'],
  cross: ['Fica do outro lado do canal.', 'Vai ter que cruzar o canal.'],
  same: ['É deste lado do canal mesmo.'],
  bridge: ['Vai ter que atravessar a ponte.', 'Fica do outro lado do desfiladeiro.'],
};

/** Bairros (índice 0–23): grupos de atividades por tipo de destino (o 1º é o geral, os outros dão o jeito do bairro). */
const LEVEL = [
  /* 1 Raízes */ { house: ['home', 'raizes'] },
  /* 2 Horizontes */ { house: ['home', 'praca'] },
  /* 3 Constância */ { house: ['home', 'obra'] },
  /* 4 Veredas */ { house: ['home', 'desvio'], shop: ['shop', 'desvio'] },
  /* 5 Ofício */ { house: ['home', 'comercio'], shop: ['shop', 'comercio'] },
  /* 6 Mirante */ { house: ['home', 'cidade'], apt: ['apt', 'cidade'], shop: ['shop', 'cidade'] },
  /* 7 Altitude */ { house: ['home', 'transito'], apt: ['apt', 'transito'], shop: ['shop', 'transito'] },
  /* 8 Ápice */ { house: ['home', 'transito'], apt: ['apt', 'alto', 'transito'], shop: ['shop', 'transito'] },
  /* 9 Encostas */ { house: ['home', 'ladeira'], apt: ['apt', 'ladeira'], shop: ['shop', 'ladeira'] },
  /* 10 Veneza */ {},
  /* 11 Travessia */ { house: ['home', 'canal'], apt: ['apt', 'canal'], shop: ['shop', 'canal'], ware: ['ware', 'canal'] },
  /* 12 Trilhos */ { house: ['home', 'bonde'], apt: ['apt', 'bonde'], shop: ['shop', 'bonde'], ware: ['ware', 'bonde'] },
  /* 13 Morro */ {},
  /* 14 Fluxo */ { house: ['home', 'avenida'], apt: ['apt', 'avenida'], shop: ['shop', 'avenida'], ware: ['ware', 'avenida'], mod: ['portaria', 'avenida'] },
  /* 15 Colheita */ {},
  /* 16 Nevasca */ { house: ['neve'], feat: 'snow' },
  /* 17 Jardins */ {},
  /* 18 Modernista */ {},
  /* 19 Penumbra */ { house: ['noite'], apt: ['noite'], shop: ['lojaNoite'], ware: ['galpaoNoite'], mod: ['portariaNoite'], featP: 0.2 },   // (à noite, pouca gente mexendo no quintal)
  /* 20 Lua */ {},
  /* 21 Operário */ {},
  /* 22 Bosque */ { house: ['home', 'outono'], shop: ['shop', 'outono'] },
  /* 23 Cachoeira */ { house: ['home', 'cachoeira'], apt: ['apt', 'cachoeira'], shop: ['shop', 'cachoeira'], ware: ['ware', 'cachoeira'], mod: ['portaria', 'cachoeira'] },
  /* 24 Medieval */ {},
];

/** Travessia: casa gêmea de outra do outro lado do canal (só quando o par está no bairro, em lados opostos). */
const TWIN = A(['Sempre confundem minha casa com a gêmea do outro lado do canal.'], ['Ainda confundindo com a gêmea do outro lado do canal?'], ['Chegou! Dessa vez não foi parar na gêmea.']);

export const TALK = {
  TEMPERS: ['direto', 'distraido', 'falante', 'brincalhao', 'ocupado', 'desconfiado'],
  VOICE: { base: BASE_VOICE, ven: VEN_VOICE, moon: MOON_VOICE, med: MED_VOICE },
  ACTS, FEAT, REL, LEVEL, TWIN,
};

// Narrador (casa do K, que nunca larga o jornal): sempre entre parênteses
export const NARRATOR = {
  success: [
    '(Ele nem tirou os olhos do jornal. Mas o endereço confere: a encomenda era dele mesmo!)',
    '(Nenhuma palavra, nenhum olhar… só o rangido da cadeira. Pelo menos desta vez, a casa era a certa.)',
  ],
  hint: [
    (p, r) => `(Ele continua lendo o jornal, como se você nem estivesse ali… Essa não parece ser a casa certa. Talvez seja ${r.a} com ${p}?)`,
    (p, r) => `(A cadeira balança, a página vira, e mais nada. Não deve ser aqui… Quem sabe ${r.a} com ${p}?)`,
  ],
  repeat: [
    (p, r) => `(Ele segue lendo, balançando de leve. Você já tinha pensado nisso: talvez seja ${r.a} com ${p}…)`,
    (p, r) => `(Mais uma página virada, e nenhuma palavra. A ideia continua a mesma: ${r.a} com ${p}…)`,
  ],
  nohint: [
    '(Ele nem levantou os olhos do jornal… E essa casa nem estava na pista. Melhor procurar em outro lugar.)',
  ],
  nohintAgain: [
    '(De novo aqui? Ele continua lendo, balançando na cadeira. Não é aqui.)',
    '(A cadeira range, o jornal farfalha… e mais nada. Não é aqui.)',
    '(Ele ajeita os óculos e segue lendo. Esta casa continua fora da pista.)',
  ],
};

// Aparência dos moradores (índice = índice da casa)
export const SHIRTS = ['#e4572e', '#4f86c6', '#7bb661', '#f2a541', '#9b5de5', '#ef476f', '#06aed5', '#8d6e63'];
export const HAIRS = ['#3b2a1a', '#9e9e9e', '#f0d58c', '#6b3e26', '#222222', '#d9d9d9', '#a0522d', '#555555'];
