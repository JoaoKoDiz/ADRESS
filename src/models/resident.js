// Morador que aparece no portão durante o diálogo: bonequinho low-poly, cabeçudo, virado para +Z (câmera).
// userData.setMood('door' | 'happy' | 'angry[:temperamento[:again]]') troca pose, rosto e balão; userData.update(t, dt) anima:
// sai pela porta, recebe a encomenda com as duas mãos (entrega certa) ou reage conforme o temperamento (entrega errada).
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, mat, dynamic, bakeStatic, smoothCharacter } from './kit.js';
import { SHIRTS, HAIRS, HOUSES, MOON_COL } from '../data.js';
import { medLook } from './medievalPeople.js';

const SKIN = '#f0c49a', PANTS = '#3d4a66', SHOES = '#2b2522', EYES = '#2a1d14', CHEEK = '#f29a8a';
const CARDBOARD = '#c98a4a', TAPE = '#f3d9a6';
const LIFT = 0.18;      // o morador fica sobre o caminho de pedras (grama + laje), acima de y = 0 do lote
const BUBBLE_SIZE = 1.7;
const h01 = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };   // pseudoaleatório estável por casa

// Texturas dos balões (criadas uma vez, compartilhadas por todos os moradores). Entrega errada: o símbolo acompanha o
// temperamento do morador (direto "!", distraído "?", falante "…", brincalhão um sorriso, ocupado um relógio,
// desconfiado "?!"); certa: coração. Símbolos desenhados (não dependem de fontes especiais).
const bubbleCache = {};
const BUBBLE_GLYPH = { happy: 'heart', angry: '?!', direto: '!', distraido: '?', falante: 'dots', brincalhao: 'grin', ocupado: 'clock', desconfiado: '?!' };
function bubbleMaterial(kind) {
  if (!BUBBLE_GLYPH[kind]) kind = 'angry';
  if (bubbleCache[kind]) return bubbleCache[kind];
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const r = 46, x0 = 14, y0 = 12, w = S - 28, h = S - 66;
  const shape = () => {
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    x.lineTo(x0 + 92, y0 + h); x.lineTo(x0 + 34, S - 8); x.lineTo(x0 + 58, y0 + h); // rabinho do balão
    x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r);
    x.closePath();
  };
  const happy = kind === 'happy', ink = happy ? '#2a9d4b' : '#e0402a';
  shape();
  x.fillStyle = '#ffffff'; x.fill();
  x.lineWidth = 12; x.strokeStyle = happy ? '#1f7a3a' : '#8a2a1a'; x.lineJoin = 'round'; x.stroke();
  const cx = S / 2, cy = y0 + h / 2 + 4, g = BUBBLE_GLYPH[kind];
  x.fillStyle = ink; x.strokeStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round';
  if (g === 'heart') {
    x.beginPath(); x.moveTo(cx, cy + 50);
    x.bezierCurveTo(cx - 92, cy - 6, cx - 52, cy - 76, cx, cy - 34);
    x.bezierCurveTo(cx + 52, cy - 76, cx + 92, cy - 6, cx, cy + 50); x.fill();
  } else if (g === 'dots') {
    for (const k of [-1, 0, 1]) { x.beginPath(); x.arc(cx + k * 52, cy + 4, 17, 0, Math.PI * 2); x.fill(); }
  } else if (g === 'grin') {                                   // rosto rindo (piscando)
    x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, 58, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(cx - 22, cy - 16, 9, 0, Math.PI * 2); x.fill();
    x.lineWidth = 9; x.beginPath(); x.moveTo(cx + 10, cy - 16); x.lineTo(cx + 34, cy - 18); x.stroke();
    x.beginPath(); x.moveTo(cx - 34, cy + 6); x.quadraticCurveTo(cx, cy + 50, cx + 34, cy + 6); x.closePath(); x.fill();
  } else if (g === 'clock') {                                  // relógio: pressa
    x.lineWidth = 12; x.beginPath(); x.arc(cx, cy, 58, 0, Math.PI * 2); x.stroke();
    x.lineWidth = 11; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx, cy - 38); x.moveTo(cx, cy); x.lineTo(cx + 28, cy + 8); x.stroke();
    x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.fill();
  } else {                                                     // "!", "?" e "?!"
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `900 ${g.length > 1 ? 138 : 156}px "Trebuchet MS", "Segoe UI", Arial, sans-serif`;
    x.fillText(g, cx, cy + 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
  bubbleCache[kind] = m;
  return m;
}

// Braço com cotovelo: pivô no ombro, braço e antebraço pendurados para baixo (−y) em repouso
// (rolled: manga dobrada, antebraço à mostra). userData.elbow: junta do cotovelo (gira à parte).
function makeArm(shirt, side, rolled = false, SKIN_ = SKIN) {
  const pivot = dynamic(new THREE.Group());
  pivot.position.set(side * 0.4, 1.12, 0);
  pivot.add(at(sphere(0.13, shirt, 8, 6), 0, 0, 0));
  pivot.add(at(cyl(0.1, 0.096, 0.28, shirt, 8), 0, -0.13, 0));
  if (rolled) pivot.add(at(cyl(0.11, 0.11, 0.07, shirt, 8), 0, -0.23, 0));
  const elbow = dynamic(new THREE.Group());
  elbow.position.y = -0.27; elbow.rotation.order = 'YXZ';
  const fore = rolled ? SKIN_ : shirt;
  elbow.add(at(sphere(0.094, fore, 8, 6), 0, 0, 0));
  elbow.add(at(cyl(0.092, 0.084, 0.22, fore, 8), 0, -0.11, 0));
  elbow.add(at(sphere(0.1, SKIN_, 8, 6), 0, -0.25, 0));
  pivot.add(elbow);
  pivot.userData.elbow = elbow;
  return pivot;
}

/** Morador da casa `houseIndex` (camisa e cabelo derivados do índice). */
// Veneza: estilos de roupa (camisa de linho, blusa listrada, avental, lenço, chapéu de palha, gondoleiro) e cores trocáveis
export const VEN_STYLE = {
  linen: ['#efe6d2', '#dfe8ef', '#e9dcc6', '#f3efe6'], stripe: ['#1f3a68', '#b5302a', '#2b2b2b'], apron: ['#f4f1ea', '#e7d3a8', '#cfd8c4'],
  scarf: ['#c8402f', '#2f6fb0', '#d9a441', '#3f7a4a', '#a8432e'], straw: '#f3d98f', ribbon: ['#c8402f', '#1f3a68', '#2b2b2b'],
};
const VEN_LOOKS = ['linen', 'stripe', 'apron', 'scarf', 'straw', 'linen-scarf', 'apron-straw', 'stripe-scarf', 'vest', 'linen-straw', 'gondolier', 'apron-scarf', 'vest-straw'];   // gondoleiro: 1 em 13
// Nevasca (Nível 16): roupa de inverno — casaco grosso, gorro com pompom, cachecol, luvas e botas (cores combinadas pelo índice)
export const WINTER = {
  coats: ['#b5302a', '#2f5f9a', '#3f7a4a', '#7a4fa0', '#c9862a', '#4a4f5a', '#8a3a5a', '#2a7a7a'], hats: ['#e8e2d4', '#d8473a', '#3a78d4', '#efbf2a', '#3c9d55', '#2b2b2b'],
  scarves: ['#efbf2a', '#e8e2d4', '#d8473a', '#5aa8e8', '#9b5de5', '#f28a5a'], gloves: ['#3a2a22', '#2b2b2b', '#8a5a36', '#c8402f'], boots: ['#4a3022', '#2b2522', '#6b4428'],
};

// Colheita: roupa de roça (xadrez ou lisa, mangas dobradas, jardineira, calça e botas; chapéu de palha ou boné)
export const FARM_STYLE = {
  plaid: ['#c8402f', '#2f6fb0', '#3f8a4a', '#8a5a36', '#d9a441'], plain: ['#f1ece0', '#9fc0de', '#e8d27a', '#c9d8b4', '#e6b8a8'],
  denim: ['#3a5f8f', '#2f4a6e', '#6b7f4a'], pants: ['#5a4a3a', '#3d4a66', '#6b5a3a'], cap: ['#c8402f', '#2f6fb0', '#3f8a4a', '#e8b02a'], boots: '#5a3b22',
};
function buildFarmResident(h) {
  const look = FARM_LOOKS[(h * 3) % FARM_LOOKS.length], F = FARM_STYLE, pk = (a, k = 1) => a[(h * k) % a.length];
  const plaid = look.includes('plaid'), overalls = look.includes('overalls');
  const farm = { plaid, overalls, rolled: look.includes('rolled'), hat: look.includes('straw') ? 'straw' : look.includes('cap') ? 'cap' : null,
    pants: overalls ? pk(F.denim, 5) : pk(F.pants, 7), cap: pk(F.cap, 3) };
  const shirt = plaid ? pk(F.plaid, 2) : pk(F.plain, 3);
  return buildCore(h, { shirt, hair: HAIRS[(h * 3) % HAIRS.length], farm });
}
// Órbita: ETs (pele verde, azul ou lilás; cabeça redonda, alta ou larga; antenas, orelhas pontudas ou redondas)
export const ALIEN = {
  skins: ['#7ccf5a', '#5aa8e8', '#b48ce0', '#4fc7a8', '#9ad85a', '#8f9cf0'], suits: ['#ff7a1a', '#2f78d0', '#f0c22a', '#e0402a', '#3fae5a', '#f1ede2', '#7a4fc0'],
  tops: ['antennas', 'ears', 'antenna1', 'roundears', 'antennas3'], heads: ['round', 'tall', 'wide'],
};
const FARM_LOOKS = ['plaid-straw', 'plain-cap-rolled', 'overalls-straw', 'plaid-cap', 'overalls-cap-rolled', 'plain-straw-rolled', 'plaid-rolled', 'overalls-plain'];

// Medieval (Nível 24): o mesmo visual dos moradores do burgo (medievalPeople.js): túnica ou vestido, cinto, avental,
// touca/capuz/chapéu, botas; nas 4 lojas, o padeiro, o ferreiro, a taverneira e a tecelã com as roupas do ofício.
const MED_SHOP_ROLE = { bakery: 'baker', smithy: 'smith', tavern: 'keeper', textile: 'weaver' };
function buildMedResident(h) {
  const H = HOUSES[h], look = H.kind === 'mvs' ? medLook(MED_SHOP_ROLE[H.shopKey] || 'merchant', 7) : medLook(['buyer', 'walker', 'sweeper', 'water', 'gardener', 'merchant'][h % 6], h * 7 + 3);
  if (look.hat === 'straw' && H.kind === 'mvh') look.hat = 'coif';
  return buildCore(h, { shirt: look.top, hair: look.hair, farm: { pants: look.hose, boots: look.boots, rolled: look.rolled }, med: look, skin: look.skin });
}

/** opts.winter: no Nevasca, os moradores vestem roupa de inverno. */
export function buildResident(houseIndex, opts = {}) {
  const kd = HOUSES[houseIndex] && HOUSES[houseIndex].kind;
  if (kd === 'mvh' || kd === 'mvs') return buildMedResident(houseIndex);
  const farm = HOUSES[houseIndex] && HOUSES[houseIndex].kind === 'farm';
  if (farm) return buildFarmResident(houseIndex);
  if (HOUSES[houseIndex] && HOUSES[houseIndex].kind === 'moon') {     // Órbita: ETs simpáticos de macacão espacial
    const k = houseIndex - 286, E = ALIEN, pk = (a, m = 1) => a[(k * m) % a.length];
    const suit = pk(E.suits, 5);
    return buildCore(houseIndex, { shirt: suit, hair: null, farm: { pants: suit, boots: '#8d9198' },
      alien: { skin: pk(E.skins, 3), top: pk(E.tops, 7), head: pk(E.heads, 2), badge: MOON_COL[HOUSES[houseIndex].stripe] } });
  }
  const ven = HOUSES[houseIndex] && HOUSES[houseIndex].kind === 'ven';
  const look = ven ? VEN_LOOKS[(houseIndex * 5) % VEN_LOOKS.length] : null, V = VEN_STYLE, pk = (a, k = 1) => a[(houseIndex * k) % a.length];
  const striped = !!look && (look.startsWith('stripe') || look === 'gondolier');
  const shirt = !ven ? SHIRTS[houseIndex % SHIRTS.length] : striped ? '#f6f4ee' : look.startsWith('linen') || look.startsWith('vest') ? pk(V.linen) : SHIRTS[houseIndex % SHIRTS.length];
  const hair = HAIRS[(houseIndex * 3) % HAIRS.length];

  if (opts.winter) {
    const W = WINTER, k = houseIndex;
    return buildCore(houseIndex, { shirt: W.coats[k % W.coats.length], hair, winter: { hat: W.hats[(k * 5) % W.hats.length], scarf: W.scarves[(k * 7 + 1) % W.scarves.length],
      glove: W.gloves[(k * 3) % W.gloves.length], boots: W.boots[(k * 11) % W.boots.length], trim: k % 3 === 0 } });
  }
  return buildCore(houseIndex, { shirt, hair, ven, look, V, pk, striped });
}

function buildCore(houseIndex, { shirt, hair, ven = false, look = null, V = VEN_STYLE, pk = a => a[0], striped = false, farm = null, alien = null, winter = null, med = null, skin = null }) {
  const SK = alien ? alien.skin : skin || SKIN;
  const root = new THREE.Group();
  root.name = 'resident:' + houseIndex;
  const PANTS_ = farm ? farm.pants : PANTS, SHOES_ = farm ? (farm.boots || FARM_STYLE.boots) : SHOES;
  const body = new THREE.Group();          // quica sem mexer na posição que o mundo define para root
  body.position.y = LIFT;
  root.add(body);

  // pernas e sapatos (cada perna gira no quadril: passos ao sair pela porta, pulinhos, pé batendo)
  const HIP = 0.58, legs = [];
  for (const s of [-1, 1]) {
    const leg = dynamic(new THREE.Group()); leg.position.set(s * 0.14, HIP, 0); body.add(leg); legs.push(leg);
    leg.add(at(box(0.22, 0.5, 0.24, PANTS_), 0, 0.33 - HIP, 0));
    if (winter) leg.add(at(box(0.28, 0.3, 0.36, winter.boots), 0, 0.15 - HIP, 0.04));   // Nevasca: botas
    else if (med) leg.add(at(box(0.26, 0.18, 0.34, SHOES_), 0, 0.09 - HIP, 0.04));                // Medieval: botas curtas
    else leg.add(at(box(0.26, farm ? 0.26 : 0.12, 0.34, SHOES_), 0, farm ? 0.13 - HIP : 0.06 - HIP, 0.04));   // Colheita: botas
  }
  // tronco (camisa) + cinto
  body.add(at(cyl(0.34, 0.37, 0.62, shirt, 10), 0, 0.88, 0));
  body.add(at(cyl(0.375, 0.375, 0.08, med ? med.belt : PANTS_, 10), 0, 0.6, 0));
  if (med) {                                                           // Medieval: barra da túnica ou saia, avental, colete, capa, gola
    if (med.dress) { body.add(at(cyl(0.38, 0.56, 0.56, med.dress, 12), 0, 0.36, 0)); body.add(at(cyl(0.565, 0.565, 0.05, med.dress, 12), 0, 0.11, 0)); }
    else body.add(at(cyl(0.375, 0.43, 0.3, shirt, 10), 0, 0.47, 0));
    body.add(at(box(0.1, 0.07, 0.03, '#c9a85a'), 0, 0.6, 0.39));
    if (med.apron) { body.add(at(box(0.46, med.dress ? 0.56 : 0.46, 0.04, med.apron), 0, med.dress ? 0.36 : 0.4, med.dress ? 0.48 : 0.43, med.dress ? -0.3 : -0.16, 0, 0)); if (med.bib) body.add(at(box(0.36, 0.28, 0.04, med.apron), 0, 0.94, 0.37)); }
    if (med.vest) for (const sd of [-1, 1]) body.add(at(box(0.22, 0.56, 0.05, med.vest), sd * 0.18, 0.88, 0.35, 0, sd * 0.38, 0));
    if (med.cape) body.add(at(cyl(0.31, 0.53, 0.42, med.cape, 12), 0, 1.0, -0.02));
    if (med.hat === 'hood') body.add(at(cyl(0.3, 0.5, 0.34, med.hatColor, 12), 0, 1.06, 0));
    body.add(at(torus(0.25, 0.04, med.top, 4, 12), 0, 1.175, 0, Math.PI / 2, 0, 0));
  }
  if (winter) {                                                        // Nevasca: casaco grosso (até o quadril), zíper, barra e cachecol
    body.add(at(cyl(0.41, 0.46, 0.76, shirt, 12), 0, 0.84, 0));
    body.add(at(box(0.05, 0.66, 0.04, '#2b2b2b'), 0, 0.86, 0.43));
    for (const y of [0.98, 0.7]) for (const sd of [-1, 1]) body.add(at(box(0.14, 0.05, 0.04, '#2b2b2b'), sd * 0.2, y, 0.42, 0, sd * 0.45, 0));   // bolsos
    if (winter.trim) body.add(at(cyl(0.465, 0.465, 0.08, '#f2efe8', 12), 0, 0.47, 0));
    body.add(at(torus(0.3, 0.09, winter.scarf, 6, 16), 0, 1.19, 0, Math.PI / 2, 0, 0));
    body.add(at(box(0.15, 0.36, 0.07, winter.scarf), 0.13, 0.98, 0.42, 0, 0, 0.12));
  }
  if (farm) {                                                          // xadrez (faixas nos dois sentidos) e jardineira (peito + alças)
    if (farm.plaid) { for (let k = 0; k < 3; k++) body.add(at(cyl(0.377, 0.38, 0.05, '#2b2b2b', 10), 0, 0.72 + k * 0.17, 0)); for (const x of [-0.18, 0, 0.18]) body.add(at(box(0.05, 0.6, 0.05, '#2b2b2b'), x, 0.88, 0.355)); }
    if (farm.overalls) { body.add(at(box(0.44, 0.4, 0.06, PANTS_), 0, 0.82, 0.36)); body.add(at(box(0.14, 0.08, 0.07, '#d9b23a'), 0, 0.98, 0.39)); for (const sd of [-1, 1]) body.add(at(box(0.08, 0.5, 0.75, PANTS_), sd * 0.17, 1.02, 0, 0.0, 0, 0)); }
  }
  if (ven) {                                                           // Veneza: listras, avental, gola de linho
    if (striped) for (let k = 0; k < 4; k++) body.add(at(cyl(0.375 - k * 0.008, 0.38 - k * 0.008, 0.07, look === 'gondolier' ? '#1f3a68' : pk(V.stripe, 3), 10), 0, 0.7 + k * 0.12, 0));
    if (look.startsWith('apron')) { const c = pk(V.apron, 7); body.add(at(box(0.5, 0.62, 0.05, c), 0, 0.72, 0.37)); body.add(at(box(0.36, 0.22, 0.05, c), 0, 1.06, 0.35)); }
    if (look.startsWith('linen')) for (const sd of [-1, 1]) body.add(at(box(0.16, 0.05, 0.12, '#ffffff'), sd * 0.1, 1.17, 0.27, 0.3, 0, sd * 0.4));
    if (look.startsWith('vest')) { const c = pk(['#3a2f28', '#5a4a3a', '#2f3b52'], 5); for (const sd of [-1, 1]) body.add(at(box(0.24, 0.6, 0.05, c), sd * 0.17, 0.86, 0.36, 0, sd * 0.35, 0)); body.add(at(box(0.6, 0.6, 0.05, c), 0, 0.87, -0.36)); }   // colete (frente aberta + costas)
    if (look === 'gondolier') body.add(at(cyl(0.385, 0.385, 0.1, '#c8402f', 10), 0, 0.62, 0));                                  // faixa vermelha na cintura
    if (look.includes('scarf')) { const c = pk(V.scarf, 11); body.add(at(torus(0.27, 0.07, c, 6, 14), 0, 1.16, 0, Math.PI / 2, 0, 0)); body.add(at(box(0.12, 0.26, 0.05, c), 0.09, 1.0, 0.34, 0, 0, 0.2)); }
  }
  // cabeça grande, levemente inclinada para trás: o rosto aparece para a câmera, que olha de cima
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  head.rotation.x = -0.42;
  body.add(head);
  const hy = 0.34;                          // centro da cabeça acima do pescoço
  const skull = head.add(at(sphere(0.4, SK, 12, 9), 0, hy, 0)).children.at(-1);
  if (alien) {                                                        // ET: cabeça redonda/alta/larga, antenas ou orelhas, gola do macacão
    skull.scale.set(alien.head === 'wide' ? 1.22 : 1.05, alien.head === 'tall' ? 1.28 : 1.05, 1.02);
    const top = alien.head === 'tall' ? hy + 0.5 : hy + 0.4;
    if (alien.top.startsWith('antenna')) {
      const xs = alien.top === 'antenna1' ? [0] : alien.top === 'antennas3' ? [-0.2, 0, 0.2] : [-0.18, 0.18];
      for (const x of xs) { head.add(at(cyl(0.025, 0.03, 0.42, SK, 5), x, top + 0.14, 0, 0, 0, -x * 1.2)); head.add(at(sphere(0.08, alien.badge, 8, 6), x * 1.5, top + 0.37, 0)); }
    } else if (alien.top === 'ears') for (const sd of [-1, 1]) head.add(at(cone(0.13, 0.42, SK, 6), sd * 0.46 * (alien.head === 'wide' ? 1.2 : 1), hy + 0.12, -0.02, 0, 0, -sd * 1.15));
    else for (const sd of [-1, 1]) head.add(at(cyl(0.17, 0.17, 0.06, SK, 12), sd * 0.44 * (alien.head === 'wide' ? 1.2 : 1), hy + 0.24, -0.02, Math.PI / 2, 0, 0));
    body.add(at(torus(0.27, 0.06, '#d8dade', 6, 14), 0, 1.17, 0, Math.PI / 2, 0, 0));   // gola de macacão espacial
    body.add(at(cyl(0.12, 0.12, 0.04, alien.badge, 10), 0.14, 1.0, 0.35, Math.PI / 2, 0, 0));   // emblema na cor do módulo
    body.add(at(cyl(0.377, 0.377, 0.07, '#d8dade', 10), 0, 0.64, 0));    // cinto
  } else {
    // cabelo: calota + nuca
    const bald = med && med.hairStyle === 'bald';                     // Medieval: careca (só a coroa de cabelo atrás)
    if (!bald) { const cap = at(sphere(0.43, hair, 12, 8), 0, hy + 0.12, -0.06); cap.scale.set(1, 0.72, 1); head.add(cap); }
    head.add(at(box(0.72, bald ? 0.2 : 0.4, 0.22, hair), 0, bald ? hy - 0.06 : hy - 0.02, -0.26));
  }
  if (med) {                                                          // Medieval: coque/trança, barba, touca, lenço, capuz ou chapéu
    if (med.hairStyle === 'bun') head.add(at(sphere(0.16, hair, 8, 6), 0, hy + 0.24, -0.38));
    if (med.hairStyle === 'braid') head.add(at(cyl(0.075, 0.05, 0.5, hair, 6), 0, hy - 0.36, -0.38, 0.25, 0, 0));
    if (med.beard) { const bd = at(sphere(0.24, med.beard, 8, 6), 0, hy - 0.23, 0.2); bd.scale.set(1.25, 0.85, 0.75); head.add(bd); head.add(at(box(0.26, 0.06, 0.07, med.beard), 0, hy - 0.11, 0.38)); }
    const hc = med.hatColor, hemi = r => new THREE.Mesh(new THREE.SphereGeometry(r, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(hc));
    if (med.hat === 'coif') { head.add(at(hemi(0.46), 0, hy + 0.04, -0.03)); head.add(at(box(0.82, 0.46, 0.22, hc), 0, hy - 0.08, -0.26)); }
    else if (med.hat === 'kerchief') { head.add(at(hemi(0.47), 0, hy + 0.08, -0.04)); head.add(at(sphere(0.1, hc, 6, 4), 0, hy + 0.02, -0.46)); }
    else if (med.hat === 'hood') { const hd = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 6, Math.PI * 0.8, Math.PI * 1.4, 0, Math.PI * 0.62), mat(hc)); head.add(at(hd, 0, hy - 0.02, -0.04)); head.add(at(box(0.86, 0.5, 0.3, hc), 0, hy - 0.24, -0.28)); }
    else if (med.hat === 'felt' || med.hat === 'straw') { const r = med.hat === 'straw' ? 0.66 : 0.58; head.add(at(cyl(r, r, 0.04, hc, 14), 0, hy + 0.37, -0.03)); head.add(at(cyl(0.33, 0.38, 0.28, hc, 12), 0, hy + 0.5, -0.03)); head.add(at(cyl(0.385, 0.385, 0.06, '#4a3020', 12), 0, hy + 0.41, -0.03)); }
    else if (med.hat === 'cap') { const c = hemi(0.46); c.scale.y = 0.8; head.add(at(c, 0, hy + 0.1, -0.03)); }
    else if (med.hat === 'beret') head.add(at(cyl(0.47, 0.44, 0.12, hc, 12), 0.03, hy + 0.38, -0.04, 0, 0, 0.14));
    else if (med.hat === 'baker') { head.add(at(cyl(0.42, 0.4, 0.3, hc, 12), 0, hy + 0.42, -0.02)); const t = sphere(0.46, hc, 10, 6); t.scale.set(1, 0.42, 1); head.add(at(t, 0, hy + 0.58, -0.02)); }
  }
  if (winter) {                                                       // gorro de lã (meia esfera sobre o cabelo), barra dobrada e pompom
    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat(winter.hat));
    beanie.scale.set(1, 0.85, 1); head.add(at(beanie, 0, hy + 0.13, -0.03));
    head.add(at(cyl(0.47, 0.47, 0.12, winter.hat, 14), 0, hy + 0.2, -0.03));
    head.add(at(sphere(0.13, winter.scarf, 8, 6), 0, hy + 0.56, -0.05));
  }
  if (farm && farm.hat === 'straw') {                                 // chapéu de palha com fita marrom
    head.add(at(cyl(0.66, 0.66, 0.04, V.straw, 14), 0, hy + 0.38, -0.03)); head.add(at(cyl(0.36, 0.4, 0.26, V.straw, 12), 0, hy + 0.5, -0.03));
    head.add(at(cyl(0.405, 0.405, 0.06, '#6b4428', 12), 0, hy + 0.42, -0.03));
  } else if (farm && farm.hat === 'cap') {                             // boné com aba para a frente
    const c = cyl(0.44, 0.46, 0.22, farm.cap, 12); head.add(at(c, 0, hy + 0.4, -0.02)); head.add(at(box(0.5, 0.05, 0.36, farm.cap), 0, hy + 0.31, 0.38, -0.15, 0, 0));
  }
  if (ven && (look === 'gondolier' || look.endsWith('straw') || look === 'straw')) {   // chapéu de palha (gondoleiro: com fita)
    head.add(at(cyl(0.62, 0.62, 0.04, V.straw, 14), 0, hy + 0.38, -0.03));
    head.add(at(cyl(0.36, 0.38, 0.24, V.straw, 12), 0, hy + 0.5, -0.03));
    head.add(at(cyl(0.385, 0.385, 0.07, look === 'gondolier' ? '#c8402f' : pk(V.ribbon, 2), 12), 0, hy + 0.43, -0.03));
  }
  // rosto: olhos, bochechas, nariz
  if (alien) for (const s of [-1, 1]) {                               // ET: olhos grandes e brilhantes
    const eye = at(sphere(0.14, '#1b1b22', 10, 8), s * 0.17, hy + 0.06, 0.33); eye.scale.set(1, 1.25, 0.6); head.add(eye);
    head.add(at(sphere(0.04, '#ffffff', 6, 4), s * 0.17 + 0.04, hy + 0.13, 0.41));
  }
  else {
    for (const s of [-1, 1]) {
      head.add(at(sphere(0.065, EYES, 6, 4), s * 0.15, hy + 0.05, 0.36));
      head.add(at(sphere(0.065, CHEEK, 6, 4), s * 0.25, hy - 0.08, 0.31));
    }
    head.add(at(sphere(0.06, SK, 6, 4), 0, hy - 0.04, 0.4));
  }

  // expressões (trocadas por setMood)
  const brows = dynamic(new THREE.Group());   // sobrancelhas franzidas
  for (const s of [-1, 1]) brows.add(at(box(0.18, 0.05, 0.05, EYES), s * 0.15, hy + (alien ? 0.29 : 0.17), alien ? 0.37 : 0.35, 0, 0, s * 0.5));
  const frown = dynamic(at(box(0.2, 0.045, 0.05, EYES), 0, hy - 0.17, 0.36, 0, 0, 0.12));
  const smile = dynamic(new THREE.Group());
  smile.add(at(box(0.14, 0.045, 0.05, EYES), 0, hy - 0.19, 0.36));
  for (const s of [-1, 1]) smile.add(at(box(0.09, 0.045, 0.05, EYES), s * 0.1, hy - 0.165, 0.35, 0, 0, s * 0.6));
  const mouthN = dynamic(at(box(0.13, 0.04, 0.05, EYES), 0, hy - 0.18, 0.365));           // boca neutra (atendendo a porta, distraído)
  const mouthO = dynamic(at(sphere(0.07, '#5a2620', 8, 6), 0, hy - 0.2, 0.34)); mouthO.scale.set(1.2, 0.8, 0.5);   // boca aberta (falando, rindo)
  head.add(brows, frown, smile, mouthN, mouthO);

  // braços (com cotovelo)
  const HAND = winter ? winter.glove : SK;                            // Nevasca: luvas
  const armL = makeArm(shirt, -1, !!(farm && farm.rolled), HAND), armR = makeArm(shirt, 1, !!(farm && farm.rolled), HAND);
  body.add(armL, armR);

  // pacote (entrega certa: chega às mãos do morador)
  const pkg = dynamic(new THREE.Group());
  pkg.position.set(0, 0.98, 0.5);
  pkg.add(box(0.72, 0.5, 0.5, CARDBOARD));
  pkg.add(at(box(0.12, 0.505, 0.51, TAPE), 0, 0, 0));
  pkg.add(at(box(0.73, 0.06, 0.51, TAPE), 0, 0.12, 0));
  body.add(pkg);

  // balões: um sprite só; a textura muda com o humor/temperamento
  const bubble = new THREE.Sprite(bubbleMaterial('angry'));
  bubble.scale.set(BUBBLE_SIZE, BUBBLE_SIZE, 1);
  bubble.center.set(0.2, 0.02);            // o rabinho aponta para a cabeça
  bubble.position.set(0.25, 2.2, 0);
  bubble.renderOrder = 20;
  bubble.visible = false;
  root.add(bubble);

  // cada parte animada vira poucos meshes; o resto do corpo é fundido por material
  dynamic(head);
  smoothCharacter(body);                                       // superfície lisa (mais segmentos, sem facetas)
  for (const arm of [armL, armR]) { bakeStatic(arm.userData.elbow); bakeStatic(arm); }
  for (const leg of legs) bakeStatic(leg);
  for (const part of [pkg, brows, smile]) bakeStatic(part);
  bakeStatic(head);
  bakeStatic(body);

  // ---- animação: cada morador tem o próprio ritmo (fase e velocidade pela casa), nada sincronizado entre eles ----
  const PH = h01(houseIndex) * 6.283, SP = 0.88 + 0.24 * h01(houseIndex * 3.7 + 1), ALT = h01(houseIndex * 9.1 + 2) < 0.5 ? 1 : -1;
  const J = { by: 0, bz: 0, rx: 0, ry: 0, rz: 0, hx: 0, hy: 0, hz: 0, lL: 0, lR: 0,
    L: { f: 0.05, o: 0.12, b: 0.15, t: 0, s: 0 }, R: { f: 0.05, o: 0.12, b: 0.15, t: 0, s: 0 } };
  const G = { by: 0, bz: 0, rx: 0, ry: 0, rz: 0, hx: 0, hy: 0, hz: 0, lL: 0, lR: 0, L: { ...J.L }, R: { ...J.R } };
  const REST = { f: 0.05, o: 0.12, b: 0.15, t: 0, s: 0 };
  const arm = (o, f, out, b, t = 0, s = 0) => { o.f = f; o.o = out; o.b = b; o.t = t; o.s = s; };
  const applyArm = (a, side, q) => {
    a.rotation.set(-q.f, 0, side * q.o);
    a.userData.elbow.rotation.set(-q.b, -side * q.t, side * q.s);
  };
  let mood = 'angry', temper = null, again = false;
  let clock = 0, tau = 0, enterT = 9, lastT = -1, popT = 9;
  let src = null;                                              // de onde vem a encomenda (local do corpo), na entrega certa
  let ptQ = null, ptSide = 1, ptYaw = 0;                       // apontar para a próxima casa (só quando a fala diz onde ela fica)
  const DOWN = new THREE.Vector3(0, -1, 0);
  const HOLD = new THREE.Vector3(0, 0.95, 0.52), pkgFrom = new THREE.Vector3(0, 0.55, 2.3), _v = new THREE.Vector3();

  function setMood(m) {
    const [md, tp, ag] = String(m).split(':');
    const nm = md === 'happy' ? 'happy' : md === 'door' ? 'door' : 'angry';
    mood = nm; temper = nm === 'angry' && BUBBLE_GLYPH[tp] ? tp : null; again = ag === 'again';
    tau = 0; popT = 0;
    const happy = mood === 'happy', door = mood === 'door';
    bubble.material = bubbleMaterial(happy ? 'happy' : temper || 'angry');
    bubble.visible = !door && !happy;                            // (coração: só quando a encomenda chega às mãos)
    pkg.visible = false;
    src = null; ptQ = null;
    if (nm === 'angry' && pointAt) {                            // a fala diz onde fica ("na quadra da frente", "aqui do lado"…): aponta para lá
      root.updateMatrixWorld(true);
      const v = body.worldToLocal(new THREE.Vector3(pointAt.x, 0, pointAt.z)), yaw = Math.atan2(v.x, v.z);
      if (Math.abs(yaw) < 2.0 && Math.hypot(v.x, v.z) > 3) {
        ptSide = yaw >= 0 ? 1 : -1; ptYaw = yaw;
        const d = new THREE.Vector3(v.x, 0, v.z).normalize(); d.y = 0.42; d.normalize();
        d.x -= ptSide * 0.12; d.normalize();                       // (um pouco para dentro: o braço sai do ombro, não do meio do peito)
        ptQ = new THREE.Quaternion().setFromUnitVectors(DOWN, d);
      }
    }
    pointAt = null;
    if (happy) {
      const H = handoff; handoff = null;
      if (H) {                                                   // ponto de partida: o lado da van (ou as mãos do personagem) virado para o morador
        root.updateMatrixWorld(true);
        const me = root.getWorldPosition(_v), dx = me.x - H.x, dz = me.z - H.z, d = Math.hypot(dx, dz) || 1;
        src = body.worldToLocal(new THREE.Vector3(H.x + dx / d * H.r, H.y, H.z + dz / d * H.r));
        if (src.length() > 12) src = null;
      }
    }
    const face = happy ? 'smile' : door ? 'n' : temper === 'distraido' ? 'n' : temper === 'falante' || temper === 'brincalhao' ? 'o' : temper === 'ocupado' ? 'frown' : 'angry';
    smile.visible = face === 'smile' || (temper === 'brincalhao');
    brows.visible = face === 'angry';
    frown.visible = face === 'angry' || face === 'frown';
    mouthN.visible = face === 'n';
    mouthO.visible = face === 'o' && temper !== 'brincalhao';
  }

  const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const wave = (f, k = 0) => Math.sin((clock * SP * f + k) * 6.283 + PH);
  /** Alvos da pose neste instante. */
  function target() {
    const g = G; g.by = 0; g.bz = 0; g.rx = 0; g.ry = 0; g.rz = 0; g.hx = 0; g.hy = 0; g.hz = 0; g.lL = 0; g.lR = 0;
    Object.assign(g.L, REST); Object.assign(g.R, REST);
    const breath = 0.012 * wave(0.25);
    g.by = breath;
    if (mood === 'door') {                                       // sai pela porta: dois passos até o portão e olha para a van
      const e = ss(enterT / 0.38);
      g.bz = -0.9 * (1 - e);
      const step = Math.sin(enterT * 16) * (1 - e);
      g.by += Math.abs(step) * 0.07; g.rz = step * 0.05; g.lL = -step * 0.55; g.lR = step * 0.55;   // pernas acompanham o passo
      arm(g.L, 0.05 + step * 0.4, 0.12, 0.25); arm(g.R, 0.05 - step * 0.4, 0.12, 0.25);
      g.hx = -0.06 * e; g.hz = 0.07 * e * Math.sin(clock * 1.3 + PH);
      return g;
    }
    if (mood === 'happy') {                                      // recebe com as duas mãos, puxa para o peito e comemora
      const reach = ss(tau / 0.18), got = ss((tau - 0.42) / 0.25);
      const f = 1.15 - 0.15 * got, b = 0.25 + 0.2 * got;
      arm(g.L, f * reach + 0.05 * (1 - reach), 0.08 * reach + 0.12 * (1 - reach), b, 0, 0);
      arm(g.R, f * reach + 0.05 * (1 - reach), 0.08 * reach + 0.12 * (1 - reach), b, 0, 0);
      g.rx = 0.07 * reach * (1 - got);                           // inclina para pegar
      g.by += -0.05 * Math.sin(Math.PI * ss((tau - 0.4) / 0.3));  // amortece o peso da caixa
      const party = ss((tau - 0.75) / 0.3), hop = Math.max(0, wave(1.7));
      g.by += party * 0.1 * hop; g.lL = g.lR = -0.25 * party * hop;   // pulinhos: os joelhos encolhem no ar
      g.rz = party * 0.06 * wave(0.85, 0.25);
      g.hz = party * 0.1 * wave(0.85); g.hx = -0.08 * party;
      return g;
    }
    // entrega errada: a reação depende do temperamento (e da insistência)
    const tp = temper;
    const palm = again ? ss((tau - 1.1) / 0.3) : 1;              // insistência: primeiro a mão na testa
    if (again && tau < 1.4) {
      const k = ss(tau / 0.3) * (1 - ss((tau - 1.1) / 0.3));
      arm(g.R, 1.75 * k + 0.05, -0.25 * k + 0.12, 1.75 * k + 0.15, 0.2 * k);
      g.hx = 0.28 * k; g.by -= 0.03 * k; g.rx = 0.04 * k;
      arm(g.L, 0.1, 0.18 * k + 0.12, 0.3);
      if (tau < 1.1) return g;
    }
    const t0 = again ? tau - 1.1 : tau, k = ss(t0 / 0.22) * palm;
    const mix = (q, f, o, b, t = 0, s = 0) => arm(q, REST.f + (f - REST.f) * k, REST.o + (o - REST.o) * k, REST.b + (b - REST.b) * k, t * k, s * k);
    if (tp === 'direto') {                                       // "não, não": as duas mãos espalmadas na frente e a cabeça balançando
      const up = 1 - ss((t0 - 1.6) / 0.45), nn = Math.sin(t0 * 13) * Math.exp(-0.9 * t0);
      mix(g.R, 0.15 + 1.15 * up, 0.15 + 0.45 * (1 - up), 0.2 + 1.05 * up + 1.3 * (1 - up), 0, 0.3 * nn * up - 1.45 * (1 - up));   // depois, mãos na cintura
      mix(g.L, 0.15 + 1.15 * up, 0.15 + 0.45 * (1 - up), 0.2 + 1.05 * up + 1.3 * (1 - up), 0, -0.3 * nn * up - 1.45 * (1 - up));
      if (up < 1) { g.R.b = REST.b + (0.2 + 1.05 * up - REST.b) * k; g.L.b = g.R.b; }
      const shake = 0.38 * Math.sin(t0 * 15) * Math.exp(-1.4 * t0) + 0.2 * Math.sin(t0 * 14) * ss(Math.sin(clock * SP * 0.8 + PH) * 3 - 2.4);
      g.hy = shake; g.rx = -0.05 * k;
    } else if (tp === 'distraido') {                              // coça a cabeça, olha para o lado, meio perdido
      const sc = 0.14 * Math.sin(clock * 22) * (0.5 + 0.5 * Math.sin(clock * 2.2 + PH));
      mix(g.R, 0.35, 2.25, 0.25, 0, 1.75 + sc);
      g.hz = -0.16 * k + 0.05 * wave(0.3); g.hy = 0.3 * wave(0.18) * k; g.hx = -0.1 * k;
      g.rz = 0.035 * wave(0.22);
    } else if (tp === 'falante') {                                // explica com as duas mãos
      const a = wave(1.5), bb = wave(1.5, 0.5);
      mix(g.R, 0.75 + 0.35 * a, 0.5 + 0.12 * bb, 1.05 + 0.5 * bb, 0, 0.35);
      mix(g.L, 0.75 - 0.35 * a, 0.5 - 0.12 * bb, 1.05 - 0.5 * bb, 0, 0.35);
      g.hx = 0.07 * wave(2.6); g.hy = 0.18 * a * k; g.by += 0.02 * Math.abs(wave(1.5));
    } else if (tp === 'brincalhao') {                              // ri da situação: mão na barriga, a outra abana
      const laugh = 0.5 + 0.5 * Math.max(0, Math.sin(clock * 1.3 + PH));
      mix(g.R, 0.55, -0.12, 1.35, 0.55);
      mix(g.L, 0.25, 0.95, 0.2, 0, 1.25 + 0.35 * Math.sin(clock * 14));
      g.by += laugh * 0.045 * Math.abs(Math.sin(clock * 15)); g.hx = -0.22 * k * laugh; g.hz = 0.08 * wave(0.5);
      g.rx = -0.04 * laugh;
    } else if (tp === 'ocupado') {                                 // com pressa: mão na cintura, olha o relógio, bate o pé
      const look = ss(Math.sin(clock * SP * 1.6 + PH) * 2 + 0.5);
      mix(g.L, -0.1, 0.6, 0.2, 0, -1.55);
      mix(g.R, 0.2 + 0.85 * look, 0.12 - 0.12 * look, 0.25 + 1.25 * look, 1.15 * look);
      g.hx = 0.36 * look * k; g.hy = 0.22 * look * k;
      g.by += 0.012 * Math.max(0, Math.sin(clock * 9)); g.lR = -0.22 * Math.max(0, Math.sin(clock * 9));   // bate o pé, impaciente
    } else if (tp === 'desconfiado') {                             // desconfiado: mão no queixo, corpo para trás, olhar de lado
      mix(g.R, 0.55, -0.18, 1.95, 0.55);
      mix(g.L, 0.45, -0.12, 1.3, 1.0);
      g.rx = -0.07 * k; g.hz = 0.15 * k; g.hy = (0.22 + 0.12 * wave(0.35)) * k * ALT; g.hx = 0.04 * k;
    } else {                                                      // sem temperamento (ex.: cena do bonde): braços para cima, inconformado
      mix(g.L, 0, 2.3 + 0.45 * Math.sin(clock * 13), 0.2);
      mix(g.R, 0, 2.3 + 0.45 * Math.sin(clock * 13 + 1.3), 0.2);
      g.by += Math.abs(Math.sin(clock * 9)) * 0.04; g.ry = Math.sin(clock * 4.5) * 0.12;
    }
    return g;
  }

  function pose(k) {                                             // aproxima as juntas dos alvos (k = 1: direto)
    const g = target(), lerp = (a, b) => a + (b - a) * k;
    for (const key of ['by', 'bz', 'rx', 'ry', 'rz', 'hx', 'hy', 'hz', 'lL', 'lR']) J[key] = lerp(J[key], g[key]);
    for (const s of ['L', 'R']) for (const key of ['f', 'o', 'b', 't', 's']) J[s][key] = lerp(J[s][key], g[s][key]);
    body.position.set(0, LIFT + J.by, J.bz);
    body.rotation.set(J.rx, J.ry, J.rz);
    head.rotation.set(-0.42 + J.hx, J.hy, J.hz);
    applyArm(armL, -1, J.L); applyArm(armR, 1, J.R);
    legs[0].rotation.x = J.lL; legs[1].rotation.x = J.lR;
    if (ptQ && mood === 'angry') {                               // depois da reação, aponta (braço esticado) e olha para lá; depois volta
      const t1 = tau - (again ? 2.4 : 1.3), w = ss(t1 / 0.3) * (1 - ss((t1 - 1.9) / 0.35));
      if (w > 0.001) {
        const a = ptSide > 0 ? armR : armL;
        a.quaternion.slerp(ptQ, w); a.userData.elbow.rotation.x *= 1 - w; a.userData.elbow.rotation.y *= 1 - w; a.userData.elbow.rotation.z *= 1 - w;
        head.rotation.y += (THREE.MathUtils.clamp(ptYaw * 0.7, -0.8, 0.8) - head.rotation.y) * w;
      }
    }
    // encomenda: do lado da van (ou de perto do portão) até as mãos, num arco curto; depois, junto ao peito
    if (mood === 'happy') {
      const from = src || pkgFrom, e = ss(tau / 0.45);
      pkg.visible = true;
      _v.copy(from).lerp(HOLD, e); _v.y += Math.sin(Math.PI * e) * (src ? 1.1 : 0.4);
      pkg.position.copy(_v);
      pkg.rotation.set(0, (1 - e) * 1.6, (1 - e) * 0.5 + Math.sin(clock * 6) * 0.04 * ss((tau - 0.75) / 0.3));
      if (tau >= 0.45 && !bubble.visible) { bubble.visible = true; popT = 0; }
    }
    const pop = popT < 0.3 ? 0.55 + 0.45 * ss(popT / 0.16) + 0.12 * Math.sin(Math.min(1, popT / 0.3) * Math.PI) : 1;
    bubble.scale.set(BUBBLE_SIZE * pop, BUBBLE_SIZE * pop, 1);
    bubble.position.y = 2.2 + Math.max(0, J.by) * 0.8;
  }

  function update(t, dt) {
    if (lastT < 0 || t - lastT > 0.3 || t < lastT) enterT = 0;   // acabou de aparecer: sai pela porta
    if (dt === undefined) dt = lastT >= 0 ? t - lastT : 0;
    lastT = t; dt = Math.max(0, Math.min(0.1, dt || 0));
    clock += dt; tau += dt; enterT += dt; popT += dt;
    active = root;
    pose(enterT < 0.05 ? 1 : 1 - Math.exp(-14 * dt));
  }

  root.userData.setMood = setMood;
  root.userData.update = update;
  setMood('angry');
  tau = 1; pose(1);                                              // pose parada inicial (sem entrada; ex.: cena do bonde)
  return root;
}

// ---- integração com a entrega ----
let handoff = null, active = null, pointAt = null;
const _fp = new THREE.Vector3();
/** Entrega certa: de onde a encomenda sai (posição no mundo: { x, y, z, r } — r: quanto avançar na direção do morador). */
export function setResidentHandoff(p) { handoff = p ? { ...p } : null; }
/** Entrega errada cuja fala diz onde fica a próxima casa: o morador aponta para esse ponto do mundo ({ x, z }) depois de reagir. */
export function setResidentPoint(p) { pointAt = p ? { x: p.x, z: p.z } : null; }
/** Posição no mundo (altura do rosto) do morador que está atendendo agora, ou null. */
export function residentFocus() {
  if (!active || !active.visible || !active.parent) return null;
  active.getWorldPosition(_fp); _fp.y += 1.5;
  return _fp;
}
