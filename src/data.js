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
HOUSES.push({ name: 'Seu Galdino', roof: 'red', f: ['rooster', 'sunflowers', 'bare'], yardZ: { bare: 11.0 } });
/** Bairro 1: { lote: casa } sempre iguais em todas as partidas. */
export const L1_FIXED = { 15: 86 };

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
  'top:ac': 'aparelhos de ar-condicionado no topo', 'top:billboard': 'um outdoor no topo', 'top:antenna': 'uma antena de rádio no topo',
  // prédios futuristas
  'glow:cyan': 'luzes de neon ciano', 'glow:magenta': 'luzes de neon rosa', 'glow:lime': 'luzes de neon verde-limão', 'glow:amber': 'luzes de neon âmbar',
  'crown:spire': 'uma antena luminosa no topo', 'crown:ring': 'anéis flutuando no topo', 'crown:dish': 'um domo de vidro no topo', 'crown:orb': 'uma esfera brilhante no topo',
  // prédios residenciais
  'balcony:red': 'sacadas vermelhas', 'balcony:blue': 'sacadas azuis', 'balcony:yellow': 'sacadas amarelas', 'balcony:green': 'sacadas verdes',
  'atop:tank': 'uma caixa-d’água grande no terraço', 'atop:antenna': 'antenas no terraço', 'atop:garden': 'um jardim no terraço',
  'atop:solar': 'painéis solares no terraço', 'atop:pool': 'uma piscina no terraço',
  'fac:clothes': 'roupas penduradas nas janelas', 'fac:plants': 'plantas nas sacadas', 'fac:ac': 'ar-condicionados na fachada', 'fac:mural': 'um grafite colorido na parede',
  'gnd:dumpster': 'uma caçamba na frente', 'gnd:moto': 'uma moto estacionada na frente', 'gnd:guard': 'uma guarita na entrada', 'gnd:bikes': 'um bicicletário na frente',
};

/** Como se referir ao destino: casa (feminino) ou prédio (masculino). */
export const REF = {
  house: { a: 'a casa', da: 'da casa', na: 'na casa', n: 'casa' },
  shop: { a: 'o prédio', da: 'do prédio', na: 'no prédio', n: 'prédio' },
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
export const SUCCESS = [
  'Finalmente, era essa mesmo! Muito obrigado!',
  'Ah, minha encomenda, achei que tinha fugido! Obrigado!',
  'Era essa mesmo! Obrigado pela paciência!',
];

// Aparência dos moradores (índice = índice da casa)
export const SHIRTS = ['#e4572e', '#4f86c6', '#7bb661', '#f2a541', '#9b5de5', '#ef476f', '#06aed5', '#8d6e63'];
export const HAIRS = ['#3b2a1a', '#9e9e9e', '#f0d58c', '#6b3e26', '#222222', '#d9d9d9', '#a0522d', '#555555'];
