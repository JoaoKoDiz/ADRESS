// Morador que aparece no portão durante o diálogo: bonequinho low-poly, cabeçudo, virado para +Z (câmera).
// userData.setMood('door' | 'happy' | 'angry[:temperamento[:again]]') troca pose, rosto e balão; userData.update(t, dt) anima:
// sai pela porta, recebe a encomenda com as duas mãos (entrega certa) ou reage conforme o temperamento (entrega errada).
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, mat, dynamic, bakeStatic, smoothCharacter } from './kit.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SHIRTS, HAIRS, HOUSES, MOON_COL } from '../data.js';
import { medLook, PEOPLE_MAT, animatePerson, reach } from './medievalPeople.js';
export { animatePerson, reach };

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

// =====================================================================================================================
// Figura no estilo dos moradores, para quem trabalha e passeia pelo bairro (operários das obras, ajudante do caminhão,
// frentista, gente da praça). Mesmas proporções, cabeça, rosto, mãos e juntas do morador comum (e dos moradores do
// Medieval): cabeção redondo, olhos de ponto, bochechas, nariz, tronco cilíndrico, braços com cotovelo, superfície lisa.
// UMA malha com esqueleto por pessoa (cor por vértice no material compartilhado PEOPLE_MAT): 1 desenho por figura. As
// juntas têm os nomes do Medieval, então a animação (animatePerson) e o IK das mãos (reach) servem aqui também.
// Roupa: camisa (manga curta ou comprida, arregaçada), calça ou saia, macacão (frentista, com faixas refletivas),
// colete refletivo, avental; boné, capacete de obra; óculos, bigode, sobrancelhas; luvas; botas, tênis ou sapato.
// Frente da figura = +Z local; pés em y = 0.
// =====================================================================================================================
const FHY = 0.34, FLA = 0.25, FUA = 0.27;
const FGEO = new Map();
const fget = (key, make) => { let x = FGEO.get(key); if (!x) { x = make(); FGEO.set(key, x); } return x; };
const fup = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n * 2)));   // formas arredondadas com mais segmentos (lisas)
const FG = {
  box: (w, h, d) => fget(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, s = 8) => fget(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, fup(s, 14, 24))),
  sph: (r, ws = 8, hs = 6) => fget(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, fup(ws, 14, 24), fup(hs, 10, 16))),
  dot: r => fget(`d${r}`, () => new THREE.SphereGeometry(r, 10, 7)),   // olhos, bochechas, nariz, botões: pequenos demais para precisar de mais faces
  hemi: (r, ws = 10, hs = 4) => fget(`h${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, fup(ws, 16, 24), fup(hs, 6, 10), 0, Math.PI * 2, 0, Math.PI / 2)),
  arc: (rt, rb, h, a = 0.62) => fget(`a${rt},${rb},${h},${a}`, () => new THREE.CylinderGeometry(rt, rb, h, 14, 1, true, -a, 2 * a)),   // pedaço da frente (+Z) de um cone aberto
  torus: (r, t, rs = 4, ts = 12) => fget(`t${r},${t},${rs},${ts}`, () => new THREE.TorusGeometry(r, t, fup(rs, 6, 10), fup(ts, 16, 28))),
};
const _fP = new THREE.Vector3(), _fq = new THREE.Quaternion(), _fe = new THREE.Euler(), _fs = new THREE.Vector3(), _fc = new THREE.Color();
const ftm = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(_fP.set(x, y, z), _fq.setFromEuler(_fe.set(rx, ry, rz)), _fs.set(sx, sy, sz));
export const fshade = (hex, k) => '#' + _fc.set(hex).multiplyScalar(k).getHexString();
/** Funde peças ({geo, color, m, bone}) numa geometria com cor por vértice (e pesos de osso, se boneMats). */
function fbake(parts, boneMats) {
  const geos = parts.map(p => {
    const ge = p.geo.clone(); ge.deleteAttribute('uv');
    ge.applyMatrix4(boneMats ? new THREE.Matrix4().multiplyMatrices(boneMats[p.bone], p.m) : p.m);
    const n = ge.attributes.position.count, col = new Float32Array(n * 3); _fc.set(p.color);
    for (let i = 0; i < n; i++) { col[i * 3] = _fc.r; col[i * 3 + 1] = _fc.g; col[i * 3 + 2] = _fc.b; }
    ge.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (boneMats) {
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = p.bone; sw[i * 4] = 1; }
      ge.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); ge.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    }
    return ge;
  });
  const out = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
  return out;
}
const REFLECT = '#e8edf0';

/**
 * Figura (pessoa) no estilo dos moradores. Opções: skin, hair, hairStyle ('short' | 'long' | 'bun' | 'bald' | 'none'),
 * top (camisa), sleeve, short (manga curta), rolled (manga arregaçada), pants, dress (saia), stockings, shoes, boots,
 * sneakers, belt, suit (macacão: a calça na cor da camisa), stripes (faixas refletivas do macacão), tag (crachá),
 * vest (colete refletivo), apron (avental) e apronHem, collar, buttons, cardigan (casaquinho aberto), hat ('cap' | 'helmet'),
 * hatColor, capLogo, glasses, mustache, brows, gloves, old (idoso: um pouco curvado), k (variação).
 * Devolve { root, mesh, b (juntas), hand, k, stoop, speed, held, items, give, drop, has, setShadow } — o mesmo formato das
 * pessoas do Medieval (animatePerson/reach).
 */
export function buildFigure(o = {}) {
  const L = { skin: SKIN, hair: '#3a2a20', hairStyle: 'short', top: '#3a6fb0', pants: PANTS, shoes: SHOES, k: 0, ...o };
  const bones = [];
  const B = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); bones.push(b); return b; };
  const body = B('body', null, 0, 0, 0);
  const hipL = B('hipL', body, -0.14, 0.62, 0), kneeL = B('kneeL', hipL, 0, -0.3, 0);
  const hipR = B('hipR', body, 0.14, 0.62, 0), kneeR = B('kneeR', hipR, 0, -0.3, 0);
  const waist = B('waist', body, 0, 0.6, 0);
  const head = B('head', waist, 0, 0.58, 0);
  const mouth = B('mouth', head, 0, FHY - 0.175, 0.37);
  const shL = B('shL', waist, -0.4, 0.52, 0), elL = B('elL', shL, 0, -FUA, 0);
  const shR = B('shR', waist, 0.4, 0.52, 0), elR = B('elR', shR, 0, -FUA, 0);
  const parts = [];
  const P = (bone, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ bone: bones.indexOf(bone), geo, color, m: ftm(x, y, z, rx, ry, rz, sx, sy, sz) });
  const skin = L.skin, top = L.top, sleeve = L.sleeve || top, pants = L.suit ? top : L.pants, legC = L.stockings || pants;
  // ---- pernas: coxa (quadril), canela + calçado (joelho) ----
  for (const [hip, knee] of [[hipL, kneeL], [hipR, kneeR]]) {
    P(hip, FG.box(0.22, 0.32, 0.24), legC, 0, -0.15, 0);
    P(knee, FG.box(0.2, 0.22, 0.22), legC, 0, -0.11, 0);
    if (L.boots) {                                                     // botina de obra: cano alto, biqueira e solado grosso
      P(knee, FG.box(0.26, 0.2, 0.34), L.shoes, 0, -0.215, 0.04); P(knee, FG.box(0.27, 0.05, 0.36), fshade(L.shoes, 0.55), 0, -0.296, 0.045);
      P(knee, FG.box(0.21, 0.025, 0.24), fshade(L.shoes, 1.25), 0, -0.11 + 0.0, 0.0);
    } else if (L.sneakers) {                                           // tênis com solado branco
      P(knee, FG.box(0.25, 0.12, 0.35), L.shoes, 0, -0.252, 0.05); P(knee, FG.box(0.265, 0.045, 0.365), '#f1ede4', 0, -0.298, 0.05);
    } else P(knee, FG.box(0.25, 0.13, 0.34), L.shoes, 0, -0.256, 0.04);
    if (L.suit && L.stripes) P(knee, FG.box(0.21, 0.045, 0.23), REFLECT, 0, -0.07, 0);   // faixa refletiva na canela do macacão
  }
  // ---- quadril (não dobra com a cintura): calça ou saia, cinto ----
  if (L.dress) { P(body, FG.cyl(0.38, 0.5, 0.42, 12), L.dress, 0, 0.42, 0); P(body, FG.cyl(0.505, 0.505, 0.04, 12), fshade(L.dress, 0.8), 0, 0.215, 0); }
  else P(body, FG.cyl(0.372, 0.385, 0.18, 10), pants, 0, 0.54, 0);
  if (L.belt) { P(body, FG.cyl(0.39, 0.39, 0.07, 10), L.belt, 0, 0.6, 0); P(body, FG.box(0.11, 0.075, 0.03), '#b9a36a', 0, 0.6, 0.392); }
  if (L.apron) { P(body, FG.arc(0.395, 0.43, 0.36, 0.7), L.apron, 0, 0.43, 0); if (L.apronHem) P(body, FG.arc(0.432, 0.437, 0.05, 0.7), L.apronHem, 0, 0.27, 0); }
  // ---- tronco (cintura) ----
  const T = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(waist, geo, color, x, y - 0.6, z, rx, ry, rz, sx, sy, sz);   // y em altura absoluta
  const rAt = y => 0.37 - (y - 0.57) / 0.62 * 0.03;                     // raio do tronco na altura y
  T(FG.cyl(0.34, 0.37, 0.62, 10), top, 0, 0.88, 0);
  T(FG.torus(0.25, 0.045, 4, 12), L.collar || fshade(top, 0.82), 0, 1.175, 0, Math.PI / 2, 0, 0);   // gola
  if (L.buttons) for (let i = 0; i < 3; i++) T(FG.dot(0.025), L.buttons, 0, 0.78 + i * 0.13, rAt(0.78 + i * 0.13) + 0.005);
  if (L.cardigan) T(FG.arc(0.356, 0.388, 0.6, Math.PI - 0.42), L.cardigan, 0, 0.87, 0, 0, Math.PI, 0);   // casaquinho aberto na frente (a camisa aparece no meio)
  if (L.suit) {                                                       // macacão: zíper, gola, bolso, crachá, faixas refletivas
    T(FG.box(0.035, 0.52, 0.03), fshade(top, 0.6), 0, 0.88, rAt(0.88) + 0.004);
    for (const sd of [-1, 1]) T(FG.box(0.16, 0.05, 0.12), fshade(top, 0.85), sd * 0.1, 1.17, 0.27, -0.5, 0, sd * 0.35);
    T(FG.box(0.13, 0.12, 0.03), fshade(top, 0.88), -0.16, 1.0, rAt(1.0) - 0.02, 0, -0.45, 0);
    if (L.stripes) T(FG.cyl(rAt(0.76) + 0.008, rAt(0.7) + 0.008, 0.055, 12), REFLECT, 0, 0.73, 0);
  }
  if (L.tag) T(FG.box(0.15, 0.09, 0.025), L.tag, 0.16, 1.02, rAt(1.02) - 0.025, 0, 0.45, 0);
  if (L.vest) {                                                       // colete refletivo: corpo, faixas e alças sobre os ombros
    const vr = y => rAt(y) + 0.018;
    T(FG.cyl(vr(1.13), vr(0.63), 0.5, 12), L.vest, 0, 0.88, 0);
    for (const y of [0.76, 0.97]) T(FG.cyl(vr(y + 0.03) + 0.006, vr(y - 0.03) + 0.006, 0.06, 12), REFLECT, 0, y, 0);
    for (const sd of [-1, 1]) { T(FG.box(0.12, 0.05, 0.58), L.vest, sd * 0.2, 1.18, 0); T(FG.box(0.05, 0.051, 0.581), REFLECT, sd * 0.2, 1.18, 0); }
  }
  if (L.apron) { T(FG.arc(rAt(1.05) + 0.012, rAt(0.6) + 0.012, 0.48, 0.66), L.apron, 0, 0.84, 0); for (const sd of [-1, 1]) T(FG.box(0.05, 0.3, 0.035), L.apron, sd * 0.16, 1.13, 0.27, -0.42, 0, 0); }
  // ---- braços: ombro e manga (ombro), cotovelo, antebraço e mão (cotovelo) ----
  const fore = L.short || L.rolled ? skin : sleeve, hand = L.gloves || skin;
  for (const [sh, el] of [[shL, elL], [shR, elR]]) {
    P(sh, FG.sph(0.13, 8, 6), L.vest ? sleeve : top, 0, 0, 0);
    if (L.short) { P(sh, FG.cyl(0.11, 0.104, 0.16, 8), sleeve, 0, -0.06, 0); P(sh, FG.cyl(0.088, 0.086, 0.2, 8), skin, 0, -0.17, 0); }
    else P(sh, FG.cyl(0.1, 0.095, 0.29, 8), sleeve, 0, -0.135, 0);
    if (L.suit && L.stripes) P(sh, FG.cyl(0.104, 0.1, 0.045, 8), REFLECT, 0, -0.2, 0);
    P(el, FG.sph(0.09, 8, 6), fore, 0, 0, 0);                         // cotovelo (a junta não abre ao dobrar)
    if (L.rolled) P(el, FG.cyl(0.108, 0.108, 0.06, 8), sleeve, 0, -0.01, 0);
    P(el, FG.cyl(0.09, 0.084, 0.2, 8), fore, 0, -0.1, 0);
    if (L.gloves) P(el, FG.cyl(0.096, 0.104, 0.08, 8), L.gloves, 0, -0.19, 0);
    P(el, FG.sph(0.1, 8, 6), hand, 0, -FLA, 0);
  }
  // ---- cabeça ----
  const H = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => P(head, geo, color, x, y, z, rx, ry, rz, sx, sy, sz);
  H(FG.sph(0.4, 10, 8), skin, 0, FHY, 0);
  const hs = L.hairStyle, hair = L.hair;
  if (hs === 'bald') { H(FG.box(0.74, 0.2, 0.22), hair, 0, FHY - 0.06, -0.27); for (const sd of [-1, 1]) H(FG.box(0.1, 0.22, 0.24), hair, sd * 0.37, FHY, -0.08); }
  else if (hs !== 'none') {
    H(FG.sph(0.43, 10, 7), hair, 0, FHY + 0.12, -0.06, 0, 0, 0, 1, 0.72, 1);
    if (hs === 'long') { H(FG.box(0.74, 0.66, 0.24), hair, 0, FHY - 0.12, -0.25); for (const sd of [-1, 1]) H(FG.box(0.12, 0.46, 0.22), hair, sd * 0.37, FHY - 0.08, -0.04); }
    else H(FG.box(0.72, 0.4, 0.22), hair, 0, FHY - 0.02, -0.26);
    if (hs === 'bun') H(FG.sph(0.16, 8, 6), hair, 0, FHY + 0.24, -0.38);
  }
  for (const s of [-1, 1]) { H(FG.dot(0.065), EYES, s * 0.15, FHY + 0.05, 0.36); H(FG.dot(0.065), CHEEK, s * 0.25, FHY - 0.08, 0.31); }
  H(FG.dot(0.06), skin, 0, FHY - 0.04, 0.4);
  H(FG.box(0.14, 0.04, 0.05), EYES, 0, FHY - 0.18, 0.36);
  if (L.brows) for (const s of [-1, 1]) H(FG.box(0.16, 0.045, 0.05), L.brows, s * 0.15, FHY + 0.16, 0.355, 0, 0, s * 0.12);
  if (L.mustache) H(FG.box(0.22, 0.055, 0.06), L.mustache, 0, FHY - 0.105, 0.382);
  if (L.glasses) {                                                    // óculos de aro fino
    const G2 = L.glasses === true ? '#3a2e26' : L.glasses;
    for (const s of [-1, 1]) { H(FG.torus(0.085, 0.014, 4, 12), G2, s * 0.15, FHY + 0.05, 0.395); H(FG.box(0.025, 0.022, 0.26), G2, s * 0.355, FHY + 0.07, 0.25, 0, -s * 0.12, 0); }
    H(FG.box(0.075, 0.02, 0.02), G2, 0, FHY + 0.07, 0.41);
  }
  const hc = L.hatColor || '#d8312a';
  if (L.hat === 'cap') {                                              // boné com aba para a frente, botão e emblema
    H(FG.hemi(0.45, 10, 4), hc, 0, FHY + 0.1, -0.03, 0, 0, 0, 1, 0.8, 1);
    H(FG.box(0.5, 0.045, 0.4), fshade(hc, 0.86), 0, FHY + 0.125, 0.43, -0.12, 0, 0);
    H(FG.sph(0.04, 5, 4), fshade(hc, 0.8), 0, FHY + 0.46, -0.03);
    if (L.capLogo) H(FG.box(0.17, 0.1, 0.03), L.capLogo, 0, FHY + 0.29, 0.355, -0.55, 0, 0);
  } else if (L.hat === 'helmet') {                                    // capacete de obra: casco, aba em volta, nervura e adesivo
    H(FG.hemi(0.47, 10, 4), hc, 0, FHY + 0.07, -0.02, 0, 0, 0, 1, 0.92, 1.04);
    H(FG.cyl(0.55, 0.56, 0.04, 16), hc, 0, FHY + 0.09, 0.03, 0, 0, 0, 1, 1, 1.1);
    H(FG.box(0.09, 0.07, 0.42), fshade(hc, 0.9), 0, FHY + 0.475, -0.02);
    H(FG.box(0.14, 0.1, 0.03), L.capLogo || '#2f5fb0', 0, FHY + 0.3, 0.405, -0.45, 0, 0);
  }
  P(mouth, FG.box(0.14, 0.1, 0.05), '#5a2018', 0, 0, 0);
  // ---- pose de ligação e malha ----
  const tmp = new THREE.Group(); tmp.add(body); tmp.updateMatrixWorld(true);
  const geom = fbake(parts, bones.map(b => b.matrixWorld.clone()));
  tmp.remove(body);
  const mesh = new THREE.SkinnedMesh(geom, PEOPLE_MAT);
  mesh.add(body); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  const root = new THREE.Group(); root.name = 'figure';
  root.add(mesh);
  const handL = new THREE.Object3D(), handR = new THREE.Object3D();
  handL.position.set(0, -FLA, 0); handR.position.set(0, -FLA, 0); elL.add(handL); elR.add(handR);
  const person = {
    root, mesh, look: L, child: false, k: L.k || 0, stoop: L.old ? 0.12 : 0, speed: L.old ? 0.8 : 1.15,
    b: { body, hipL, kneeL, hipR, kneeR, waist, head, mouth, shL, elL, shR, elR }, hand: { L: handL, R: handR },
    items: {}, held: [],
    /** Segura um objeto já montado (figureItem): where = 'R' | 'L' (na mão) ou 'body' (posto pela atividade). */
    give(it, where = 'R') {
      this.items[it.name.replace('item:', '')] = it;
      (where === 'body' ? body : where === 'L' ? handL : handR).add(it);
      it.userData.where = where; it.userData.tilt = it.userData.tilt || 0; it.visible = true;
      it.traverse(q => { if (q.isMesh) q.castShadow = mesh.castShadow; });   // (a sombra do objeto acompanha a da figura)
      if (!this.held.includes(it)) this.held.push(it);
      return it;
    },
    drop(it) { for (const x of this.held.slice()) if (!it || x === it) { if (x.parent) x.parent.remove(x); this.held.splice(this.held.indexOf(x), 1); } },
    has(it) { return this.held.includes(it); },
    setShadow(on) { mesh.castShadow = on; for (const it of this.held) it.traverse(q => { if (q.isMesh) q.castShadow = on; }); },
  };
  animatePerson(person, { mode: 'idle', t: 0 });
  // sombra só perto de quem olha (a câmera): longe, a figura é pequena demais para a sombra aparecer e cada uma custa mais
  // um desenho com esqueleto no mapa de sombras. Decidido no desenho (vale no quadro seguinte), com folga para não piscar.
  if (o.shadowDist !== 0) {
    const R = o.shadowDist || 55, IN = R * R, OUT = (R + 8) * (R + 8);
    let on = true;
    mesh.onBeforeRender = (r, s, cam) => {
      const e = mesh.matrixWorld.elements, c = cam.matrixWorld.elements, dx = e[12] - c[12], dy = e[13] - c[13], dz = e[14] - c[14], d2 = dx * dx + dy * dy + dz * dz;
      if (on ? d2 > OUT : d2 < IN) { on = !on; person.setShadow(on); }
    };
  }
  return person;
}

// ---- objetos das figuras (malhas pequenas com cor por vértice; os de texto têm uma placa com textura) ----
const ITEM_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, flatShading: false });
const texCache = {};
function signTex(key, make) { if (!texCache[key]) { texCache[key] = make(); } return texCache[key]; }
function obrasTexture() {                                             // placa de obra: losango preto de borda, "OBRAS" e um homenzinho cavando
  const c = document.createElement('canvas'); c.width = 256; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = '#ff8a1a'; x.fillRect(0, 0, 256, 192);
  x.strokeStyle = '#1b1b1b'; x.lineWidth = 10; x.strokeRect(9, 9, 238, 174);
  x.fillStyle = '#1b1b1b'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '900 62px "Trebuchet MS", "Segoe UI", Arial, sans-serif';
  x.fillText('OBRAS', 128, 132);
  x.lineCap = 'round'; x.lineWidth = 9;                               // pictograma: operário com a pá e o montinho
  x.beginPath(); x.arc(112, 42, 9, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(110, 54); x.lineTo(100, 80); x.moveTo(100, 80); x.lineTo(90, 96); x.moveTo(100, 80); x.lineTo(114, 96);
  x.moveTo(107, 62); x.lineTo(126, 74); x.moveTo(126, 74); x.lineTo(142, 92); x.stroke();
  x.beginPath(); x.moveTo(132, 98); x.quadraticCurveTo(152, 76, 172, 98); x.closePath(); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function paperTexture() {                                             // jornal aberto: manchete, foto e colunas
  const c = document.createElement('canvas'); c.width = 256; c.height = 180;
  const x = c.getContext('2d');
  x.fillStyle = '#efece3'; x.fillRect(0, 0, 256, 180);
  x.fillStyle = '#2a2a2a'; x.fillRect(12, 12, 232, 20);
  x.fillStyle = '#9a9a96'; x.fillRect(12, 42, 70, 52);
  x.fillStyle = '#5e5e5a';
  for (let col = 0; col < 3; col++) for (let r = 0; r < 12; r++) { const cx = 92 + col * 52; if (col === 0 && r < 6) continue; x.fillRect(col === 0 && r >= 6 ? 12 : cx, 44 + r * 11, col === 0 && r >= 6 ? 120 : 44 - (r % 4 === 3 ? 14 : 0), 4); }
  x.fillStyle = '#c9c6bc'; x.fillRect(127, 10, 2, 160);              // dobra do meio
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** Objetos: 'box' (caixa de papelão, segura nas duas mãos), 'tamper' (soquete; origem na sapata, punho em T no alto),
 *  'sign' (placa OBRAS no mastro; origem no pé do mastro), 'rag' (flanela), 'paper' (jornal aberto), 'knit' (tricô),
 *  'corn' (saquinho de milho), 'popcorn' (saquinho de pipoca). userData.grip = ponto de pegar; grips = as duas pegas. */
export function figureItem(name, o = {}) {
  const parts = [], A = (geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ geo, color, m: ftm(x, y, z, rx, ry, rz, sx, sy, sz) });
  const g = new THREE.Group(); g.name = 'item:' + (name === 'box' ? 'crate' : name);
  g.userData.grip = new THREE.Vector3();
  let plate = null;
  switch (name) {
    case 'box': {                                                    // caixa de papelão com fita e etiqueta
      const C = o.color || '#c98a4a';
      A(FG.box(0.56, 0.4, 0.42), C, 0, 0, 0); A(FG.box(0.1, 0.43, 0.45), '#e3cf9c', 0, 0, 0);   // fita: 1,5 cm para fora da caixa (nada na mesma superfície)
      A(FG.box(0.59, 0.06, 0.45), '#e3cf9c', 0, 0.12, 0); A(FG.box(0.16, 0.1, 0.02), '#fbf7ee', 0.16, -0.06, 0.22);
      g.userData.grips = [new THREE.Vector3(-0.29, -0.03, 0.02), new THREE.Vector3(0.29, -0.03, 0.02)]; break;
    }
    case 'tamper': {                                                 // soquete de mão: sapata de aço, peso, haste e punho em T com borrachas
      A(FG.box(0.27, 0.05, 0.27), '#4a4e56', 0, 0.025, 0); A(FG.cyl(0.1, 0.12, 0.13, 8), '#5a5f68', 0, 0.115, 0);
      A(FG.cyl(0.026, 0.026, 0.82, 6), '#8a8f96', 0, 0.58, 0); A(FG.box(0.36, 0.04, 0.04), '#5a5f68', 0, 0.98, 0);
      for (const s2 of [-1, 1]) A(FG.cyl(0.032, 0.032, 0.11, 6), '#2a2a2a', s2 * 0.13, 0.98, 0, 0, 0, Math.PI / 2);
      g.userData.grips = [new THREE.Vector3(-0.13, 0.98, 0), new THREE.Vector3(0.13, 0.98, 0)]; break;
    }
    case 'sign': {                                                   // placa OBRAS: mastro com pé de borracha e placa com moldura
      A(FG.cyl(0.11, 0.13, 0.06, 8), '#2e3036', 0, 0.03, 0); A(FG.cyl(0.025, 0.025, 1.5, 6), '#8a8f96', 0, 0.78, 0);
      A(FG.box(0.66, 0.5, 0.03), '#2e3036', 0, 1.72, 0);
      const pm = signTex('obrasMat', () => new THREE.MeshStandardMaterial({ map: obrasTexture(), roughness: 0.7 }));
      plate = new THREE.Group();
      for (const r of [0, Math.PI]) { const m = new THREE.Mesh(fget('signPlane', () => new THREE.PlaneGeometry(0.62, 0.46)), pm); m.position.set(0, 1.72, r ? -0.022 : 0.022); m.rotation.y = r; m.castShadow = true; plate.add(m); }   // (placa 7 mm à frente da chapa)
      g.userData.grip.set(0, 1.0, 0); break;
    }
    case 'rag': A(FG.box(0.2, 0.03, 0.16), o.color || '#3d6fb5', 0, -0.02, 0.06, 0.25, 0.3, 0.1); A(FG.box(0.14, 0.12, 0.025), o.color || '#3d6fb5', 0.02, -0.08, 0.1, 0.1, 0.3, 0); break;
    case 'paper': {
      const pm = signTex('paperMat', () => new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.9 }));
      plate = new THREE.Group();
      for (const [sd, ry] of [[-1, 0.28], [1, -0.28]]) { const m = new THREE.Mesh(fget('paperBox', () => new THREE.BoxGeometry(0.34, 0.46, 0.012)), pm); m.position.set(sd * 0.165, 0, sd * 0 + 0.024); m.rotation.y = ry; m.castShadow = true; plate.add(m); }
      g.userData.grips = [new THREE.Vector3(-0.3, -0.05, 0.08), new THREE.Vector3(0.3, -0.05, 0.08)]; break;
    }
    case 'knit': {                                                   // tricô: peça listrada, duas agulhas e o novelo
      const C = o.color || '#c8507a';
      A(FG.box(0.3, 0.04, 0.2), C, 0, 0, 0.02); A(FG.box(0.3, 0.041, 0.05), '#f2ead8', 0, 0, -0.02);
      for (const s of [-1, 1]) A(FG.cyl(0.01, 0.01, 0.42, 5), '#c9ced6', s * 0.05, 0.03, 0.12, Math.PI / 2 - 0.35, s * 0.5, 0);
      g.userData.grips = [new THREE.Vector3(-0.14, 0.02, 0.1), new THREE.Vector3(0.14, 0.02, 0.1)]; break;
    }
    case 'ball': A(FG.sph(0.1, 8, 6), o.color || '#c8507a', 0, 0.1, 0); A(FG.torus(0.1, 0.012, 3, 10), fshade(o.color || '#c8507a', 0.8), 0, 0.1, 0, 0.6, 0, 0); break;
    case 'corn': A(FG.cyl(0.11, 0.09, 0.2, 8), '#d9c09a', 0, 0.1, 0); A(FG.cyl(0.112, 0.112, 0.02, 8), '#c4a878', 0, 0.2, 0); A(FG.sph(0.07, 6, 4), '#f2c23a', 0, 0.2, 0, 0, 0, 0, 1, 0.4, 1); break;
    case 'popcorn': A(FG.cyl(0.085, 0.065, 0.24, 8), '#f4f1ea', 0, 0.12, 0); A(FG.cyl(0.087, 0.087, 0.06, 8), '#d8312a', 0, 0.06, 0);
      A(FG.sph(0.09, 7, 5), '#fff6d8', 0, 0.25, 0, 0, 0, 0, 1, 0.6, 1); g.userData.grip.set(0, 0.08, 0); break;
    default: A(FG.box(0.2, 0.2, 0.2), '#888888', 0, 0, 0);
  }
  if (parts.length) { const m = new THREE.Mesh(fbake(parts), ITEM_MAT); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  if (plate) g.add(plate);
  return g;
}

/** Malha com esqueleto a partir de peças rígidas (para bichos e objetos articulados no mesmo estilo das figuras): `root`
 *  é o osso raiz já com os filhos posicionados; parts = [{ bone, geo, color, m }] (m = matriz da peça no espaço do osso;
 *  partMatrix ajuda). Cor por vértice no material compartilhado PEOPLE_MAT: 1 desenho. */
export function skinnedFromParts(root, parts) {
  const bones = []; root.traverse(o => { if (o.isBone) bones.push(o); });
  const tmp = new THREE.Group(); tmp.add(root); tmp.updateMatrixWorld(true);
  const geom = fbake(parts.map(p => ({ ...p, bone: bones.indexOf(p.bone) })), bones.map(b => b.matrixWorld.clone()));
  tmp.remove(root);
  const mesh = new THREE.SkinnedMesh(geom, PEOPLE_MAT);
  mesh.add(root); mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}
export const partMatrix = ftm;
export const partGeo = FG;
