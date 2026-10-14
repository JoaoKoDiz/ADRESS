// Morador que aparece no portão durante o diálogo: bonequinho low-poly, cabeçudo, virado para +Z (câmera).
// userData.setMood('angry' | 'happy') troca pose e balão; userData.update(t) anima.
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, mat, dynamic, bakeStatic } from './kit.js';
import { SHIRTS, HAIRS, HOUSES, MOON_COL } from '../data.js';
import { medLook } from './medievalPeople.js';

const SKIN = '#f0c49a', PANTS = '#3d4a66', SHOES = '#2b2522', EYES = '#2a1d14', CHEEK = '#f29a8a';
const CARDBOARD = '#c98a4a', TAPE = '#f3d9a6';
const LIFT = 0.18;      // o morador fica sobre o caminho de pedras (grama + laje), acima de y = 0 do lote
const BUBBLE_SIZE = 1.7;

// Texturas dos balões (criadas uma vez, compartilhadas por todos os moradores)
const bubbleCache = {};
function bubbleMaterial(kind) {
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
  shape();
  x.fillStyle = '#ffffff'; x.fill();
  x.lineWidth = 12; x.strokeStyle = kind === 'happy' ? '#1f7a3a' : '#8a2a1a'; x.lineJoin = 'round'; x.stroke();
  x.fillStyle = kind === 'happy' ? '#2a9d4b' : '#e0402a';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = kind === 'happy' ? 'bold 150px "Segoe UI Symbol", "Trebuchet MS", sans-serif' : '900 138px "Trebuchet MS", "Segoe UI", sans-serif';
  x.fillText(kind === 'happy' ? '♥' : '?!', S / 2, y0 + h / 2 + (kind === 'happy' ? 10 : 6));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
  bubbleCache[kind] = m;
  return m;
}

function makeArm(shirt, side, rolled = false, SKIN_ = SKIN) {
  // pivô no ombro; braço pendurado para baixo (−y) em repouso (rolled: manga dobrada, antebraço à mostra)
  const pivot = dynamic(new THREE.Group());
  pivot.position.set(side * 0.4, 1.12, 0);
  pivot.add(at(sphere(0.13, shirt, 8, 6), 0, 0, 0));
  if (rolled) { pivot.add(at(cyl(0.1, 0.1, 0.2, shirt, 8), 0, -0.12, 0)); pivot.add(at(cyl(0.11, 0.11, 0.07, shirt, 8), 0, -0.23, 0)); pivot.add(at(cyl(0.085, 0.08, 0.26, SKIN_, 8), 0, -0.36, 0)); }
  else pivot.add(at(cyl(0.1, 0.09, 0.46, shirt, 8), 0, -0.25, 0));
  pivot.add(at(sphere(0.1, SKIN_, 8, 6), 0, -0.52, 0));
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

  // pernas e sapatos
  for (const s of [-1, 1]) {
    body.add(at(box(0.22, 0.5, 0.24, PANTS_), s * 0.14, 0.33, 0));
    if (winter) body.add(at(box(0.28, 0.3, 0.36, winter.boots), s * 0.14, 0.15, 0.04));   // Nevasca: botas
    else if (med) body.add(at(box(0.26, 0.18, 0.34, SHOES_), s * 0.14, 0.09, 0.04));                // Medieval: botas curtas
    else body.add(at(box(0.26, farm ? 0.26 : 0.12, 0.34, SHOES_), s * 0.14, farm ? 0.13 : 0.06, 0.04));   // Colheita: botas
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
  head.add(brows, frown, smile);

  // braços
  const HAND = winter ? winter.glove : SK;                            // Nevasca: luvas
  const armL = makeArm(shirt, -1, !!(farm && farm.rolled), HAND), armR = makeArm(shirt, 1, !!(farm && farm.rolled), HAND);
  body.add(armL, armR);

  // pacote (só quando feliz)
  const pkg = dynamic(new THREE.Group());
  pkg.position.set(0, 0.98, 0.5);
  pkg.add(box(0.72, 0.5, 0.5, CARDBOARD));
  pkg.add(at(box(0.12, 0.505, 0.51, TAPE), 0, 0, 0));
  pkg.add(at(box(0.73, 0.06, 0.51, TAPE), 0, 0.12, 0));
  body.add(pkg);

  // balões
  const bubbles = {};
  for (const kind of ['angry', 'happy']) {
    const sp = new THREE.Sprite(bubbleMaterial(kind));
    sp.scale.set(BUBBLE_SIZE, BUBBLE_SIZE, 1);
    sp.center.set(0.2, 0.02);            // o rabinho aponta para a cabeça
    sp.position.set(0.25, 2.2, 0);
    sp.renderOrder = 20;
    sp.visible = false;
    bubbles[kind] = sp;
    root.add(sp);
  }

  // cada parte animada vira poucos meshes; o resto do corpo é fundido por material
  for (const part of [armL, armR, pkg, brows, smile]) bakeStatic(part);
  bakeStatic(body);

  let mood = 'angry';
  function setMood(m) {
    mood = m === 'happy' ? 'happy' : 'angry';
    const happy = mood === 'happy';
    bubbles.angry.visible = !happy;
    bubbles.happy.visible = happy;
    pkg.visible = happy;
    smile.visible = happy;
    brows.visible = frown.visible = !happy;
  }

  function update(t) {
    if (mood === 'happy') {
      // segura a caixa na frente do peito e dá pulinhos
      body.position.y = LIFT + Math.abs(Math.sin(t * 6)) * 0.14;
      armL.rotation.set(-1.25, 0, -0.25);
      armR.rotation.set(-1.25, 0, 0.25);
      pkg.rotation.z = Math.sin(t * 6) * 0.05;
      body.rotation.y = 0;
      bubbles.happy.position.y = 2.2 + body.position.y - LIFT;
    } else {
      // braços para cima, sacudindo de irritação
      body.position.y = LIFT + Math.abs(Math.sin(t * 9)) * 0.04;
      armL.rotation.set(0, 0, -2.3 - Math.sin(t * 13) * 0.45);
      armR.rotation.set(0, 0, 2.3 + Math.sin(t * 13 + 1.3) * 0.45);
      body.rotation.y = Math.sin(t * 4.5) * 0.12;
      bubbles.angry.position.y = 2.2 + Math.sin(t * 9) * 0.04;
    }
  }

  root.userData.setMood = setMood;
  root.userData.update = update;
  setMood('angry');
  update(0);
  return root;
}
