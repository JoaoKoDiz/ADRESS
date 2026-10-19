// Prédio comercial de 2 andares (Bairros 4 e 5, e as cidades). O desenho do prédio é o mesmo para todos e só 3 coisas
// entram nas pistas: 1) cor do toldo listrado (shop.awning), 2) cor da fachada (shop.facade), 3) o que há no topo
// (shop.top: ar-condicionados, outdoor ou antena de rádio). Coordenadas locais do lote (como buildLot das casas).
// Cada prédio é um comércio de verdade (padaria, farmácia, barbearia…): letreiro próprio, vitrine acesa com mercadoria,
// placa "ABERTO" na porta e um detalhe na calçada. Nada disso usa as cores dos toldos em áreas grandes nem cobre o toldo,
// a fachada ou o topo. Partes animadas (poste de barbeiro, tambores da lavanderia) ficam fora do merge.
import * as THREE from 'three';
import { mat, box, cyl, sphere, cone, at, dynamic, bakeStatic, textTexture, mergePlain } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';
import { AWNING_COL, FACADE_COL } from '../data.js';

const G = 0.12, WALK_TOP = 0.17;
const X0 = 3.8, X1 = 13.4, Z0 = 1.5, Z1 = A.house.z1;     // frente alinhada com a das casas (z = 8.5)
const F1 = 3.2, F2 = 2.9, H = F1 + F2;                    // térreo, 1º andar, altura total
const CX = (X0 + X1) / 2, W = X1 - X0, D = Z1 - Z0;
const GLASS = '#3d5f80', FRAME = '#e9e4da', DARK = '#3a3d44';
const DOOR_X = A.doorX;
const VITRINES = [[X0 + 0.5, DOOR_X - 1.2], [DOOR_X + 1.2, X1 - 0.5]];
const VY0 = G + 0.35, VY1 = G + 2.35;                      // altura útil da vitrine

// Cada prédio comercial (índice em HOUSES) é um tipo de comércio. sign: cor do letreiro e das letras.
const BIZ = {
  32: { key: 'bakery', name: 'PADARIA', bg: '#5a2f1c', fg: '#ffe2a8' },
  33: { key: 'pharmacy', name: 'FARMÁCIA', bg: '#f4f1ea', fg: '#1f7a46' },
  34: { key: 'radio', name: 'RÁDIO E TV', bg: '#242a33', fg: '#8fe0ff' },
  35: { key: 'icecream', name: 'SORVETERIA', bg: '#fbe6ef', fg: '#a3376a' },
  36: { key: 'market', name: 'MERCADINHO', bg: '#2f3236', fg: '#ffd27a' },
  37: { key: 'stationery', name: 'PAPELARIA', bg: '#26324a', fg: '#fff3d6' },
  66: { key: 'florist', name: 'FLORICULTURA', bg: '#f1ece0', fg: '#2f6b3a' },
  67: { key: 'snack', name: 'LANCHONETE', bg: '#3a2418', fg: '#ffb35c' },
  68: { key: 'barber', name: 'BARBEARIA', bg: '#1f2226', fg: '#f4f1ea' },
  69: { key: 'laundry', name: 'LAVANDERIA', bg: '#e8f2f7', fg: '#2f5f8a' },
};
const FALLBACK = { key: 'market', name: 'MERCADINHO', bg: '#2f3236', fg: '#ffd27a' };

// texturas compartilhadas (uma por texto)
const texCache = new Map();
function signTex(text, bg, fg, w = 512, h = 88, px = 60) {
  const k = text + bg + fg + w + h;
  if (!texCache.has(k)) texCache.set(k, textTexture(text, { width: w, height: h, bg, fg, font: `bold ${px}px "Trebuchet MS", sans-serif` }));
  return texCache.get(k);
}
const matCache = new Map();
const texMat = (t, opts = {}) => { const k = t.uuid + JSON.stringify(opts); if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...opts })); return matCache.get(k); };
const texPlane = (t, w, h, opts) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat(t, opts));
// fundo iluminado da vitrine (luz de dentro: continua claro na sombra do toldo)
const LIT = () => mat('#f3e7cc', { emissive: '#5a4628', emissiveIntensity: 0.55 });

/** Monta o lote do prédio comercial `shop` (dados de data.js). */
export function buildShopLot(shop) {
  const root = new THREE.Group();
  root.name = 'shop:' + shop.name;
  const facade = FACADE_COL[shop.facade], awning = AWNING_COL[shop.awning];
  const biz = BIZ[shop.index] || FALLBACK;
  const updaters = [];

  // chão: calçamento claro e calçada em volta (mesma do lote das casas)
  root.add(at(box(LOT, 0.14, LOT, '#cdc7bb'), LOT / 2, G - 0.07, LOT / 2));
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2, full = LOT + 2 * WALK;
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, -WALK / 2));
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), LOT + WALK / 2, y, LOT / 2));
  for (let x = 1.5; x < LOT; x += 3) root.add(at(box(0.08, 0.02, LOT - 9.5, '#bdb6a8'), x, G + 0.01, 13));   // juntas do piso
  for (let z = 10.6; z < LOT - 0.5; z += 3) root.add(at(box(LOT - 1, 0.02, 0.08, '#bdb6a8'), LOT / 2, G + 0.01, z));
  // capacho e soleira gasta na frente da porta (o caminho de quem entra e sai)
  root.add(at(box(2.0, 0.03, 1.1, '#9a8f7c'), DOOR_X, G + 0.13, Z1 + 1.3));
  // duas vagas pintadas à esquerda (o pátio da frente é estacionamento de cliente), com batente de concreto
  for (const x of [0.7, 3.6, 6.5]) root.add(at(box(0.1, 0.012, 3.3, '#f4f1ea'), x, G + 0.016, 15.25));
  for (const x of [2.15, 5.05]) root.add(at(box(1.6, 0.14, 0.22, '#bdb6a8'), x, G + 0.07, 13.95));

  // corpo do prédio (fachada) + laje e platibanda
  root.add(at(box(W, H, D, facade), CX, G + H / 2, (Z0 + Z1) / 2));
  if (shop.facade === 'brick') {                                   // fachada de tijolinhos: fiadas de argamassa
    for (let yy = G + 0.35; yy < G + H; yy += 0.42) {
      root.add(at(box(W + 0.04, 0.05, D + 0.04, '#d9b49a'), CX, yy, (Z0 + Z1) / 2));
    }
  }
  root.add(at(box(W + 0.3, 0.45, D + 0.3, '#8f8a82'), CX, G + H + 0.22, (Z0 + Z1) / 2));          // platibanda
  root.add(at(box(W - 0.4, 0.06, D - 0.4, '#6f6b65'), CX, G + H + 0.47, (Z0 + Z1) / 2));          // laje

  // térreo: faixa acima, vitrines acesas com mercadoria e porta de vidro com a placa ABERTO
  root.add(at(box(W - 0.2, 0.35, 0.12, '#55524c'), CX, G + F1 - 0.1, Z1 + 0.05));
  const deco = new THREE.Group();                                  // mercadoria e enfeites de calçada: fundidos numa malha com cor por vértice
  for (const [x0, x1] of VITRINES) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    root.add(at(box(w, 2.0, 0.06, LIT()), cx, G + 1.35, Z1 + 0.03));                            // fundo iluminado
    display(deco, biz.key, x0, x1, updaters);
    root.add(at(box(w + 0.16, 0.12, 0.3, FRAME), cx, G + 0.31, Z1 + 0.15));                      // peitoril
    root.add(at(box(w + 0.16, 0.1, 0.3, FRAME), cx, G + 2.4, Z1 + 0.15));                        // verga
    for (const ex of [x0 - 0.04, x1 + 0.04]) root.add(at(box(0.12, 2.2, 0.3, FRAME), ex, G + 1.35, Z1 + 0.15));
    root.add(at(box(0.07, 2.0, 0.06, FRAME), cx, G + 1.35, Z1 + 0.29));                          // montante
    for (const [dx, dy] of [[-0.45, 0.25], [0.35, -0.2]]) root.add(at(box(0.07, 0.9, 0.02, '#eef7fb'), cx + dx * w / 2, G + 1.45 + dy, Z1 + 0.31, 0, 0, 0.6));   // reflexo no vidro
  }
  root.add(at(box(2.0, 2.5, 0.08, FRAME), DOOR_X, G + 1.25, Z1 + 0.04));
  root.add(at(box(1.7, 2.3, 0.1, '#5a7fa3'), DOOR_X, G + 1.2, Z1 + 0.07));
  root.add(at(box(0.08, 0.5, 0.06, '#c9ced6'), DOOR_X + 0.6, G + 1.2, Z1 + 0.14));            // puxador
  const open = texPlane(signTex('ABERTO', '#fbf7ee', '#c8312a', 128, 48, 30), 0.62, 0.23);
  open.position.set(DOOR_X - 0.1, G + 1.75, Z1 + 0.14); root.add(open);
  root.add(at(box(0.66, 0.27, 0.02, '#c8312a'), DOOR_X - 0.1, G + 1.75, Z1 + 0.12));
  root.add(at(box(2.6, 0.12, 1.0, '#bdb6a8'), DOOR_X, G + 0.06, Z1 + 0.55));                   // degrau

  // 1º andar: três janelas (alguém mora em cima da loja: cortinas, e um vaso numa delas)
  const CURT = ['#f2d9c4', '#d9e6d2', '#f0e3b8'][shop.index % 3];
  for (const [k, x] of [X0 + 1.7, CX, X1 - 1.7].entries()) {
    root.add(at(box(1.9, 1.2, 0.08, FRAME), x, G + F1 + 1.95, Z1 + 0.04));      // janelas mais acima: sobra espaço para a placa
    root.add(at(box(1.6, 0.95, 0.1, GLASS), x, G + F1 + 1.95, Z1 + 0.06));
    root.add(at(box(2.1, 0.12, 0.3, FRAME), x, G + F1 + 1.33, Z1 + 0.15));
    if ((k + shop.index) % 3 !== 1) for (const s of [-1, 1]) root.add(at(box(0.36, 0.9, 0.04, CURT), x + s * 0.6, G + F1 + 1.97, Z1 + 0.12));
    if ((k + shop.index) % 3 === 2) {                                            // vaso de flores no peitoril
      root.add(at(box(1.0, 0.24, 0.3, '#b5653f'), x, G + F1 + 1.51, Z1 + 0.2));
      for (let f = 0; f < 4; f++) root.add(at(sphere(0.13, ['#3f8f3a', '#ff6f9a', '#3f8f3a', '#ffd23a'][f], 6, 4), x - 0.36 + f * 0.24, G + F1 + 1.72, Z1 + 0.2));
    }
  }
  // janelas laterais e dos fundos
  for (const s of [-1, 1]) for (const yy of [G + 1.5, G + F1 + 1.35]) {
    root.add(at(box(0.08, 1.2, 1.6, GLASS), CX + s * (W / 2 + 0.03), yy, (Z0 + Z1) / 2));
  }
  // porta dos fundos (entregas) com luminária
  root.add(at(box(1.3, 2.2, 0.08, '#6b6255'), CX + 2.5, G + 1.1, Z0 - 0.04));
  root.add(at(box(0.3, 0.2, 0.2, '#fff1bf'), CX + 2.5, G + 2.45, Z0 - 0.1));

  // toldo listrado (cor do toldo + branco), inclinado para a rua
  const stripes = 9, sw = (W - 0.4) / stripes, tilt = 0.42;
  for (let i = 0; i < stripes; i++) {
    const x = X0 + 0.2 + sw * (i + 0.5);
    root.add(at(box(sw, 0.08, 1.9, i % 2 ? '#fbf7ef' : awning), x, G + F1 + 0.05, Z1 + 0.85, tilt, 0, 0));
  }
  for (let i = 0; i < stripes; i++) {                                                  // babado na ponta
    const x = X0 + 0.2 + sw * (i + 0.5);
    root.add(at(box(sw, 0.35, 0.06, i % 2 ? '#fbf7ef' : awning), x, G + F1 - 0.48, Z1 + 1.72));
  }
  for (const x of [X0 + 0.25, X1 - 0.25]) root.add(at(box(0.06, 0.06, 1.75, DARK), x, G + F1 - 0.18, Z1 + 0.85, tilt, 0, 0));   // braços do toldo

  // letreiro do comércio entre o toldo e as janelas de cima (inteiro à vista, sem ficar atrás do toldo)
  root.add(at(box(4.6, 0.9, 0.08, '#55524c'), CX, G + F1 + 0.9, Z1 + 0.06));
  const sign = texPlane(signTex(biz.name, biz.bg, biz.fg), 4.4, 0.75);
  sign.position.set(CX, G + F1 + 0.9, Z1 + 0.11);               // acima do ponto mais alto do toldo (≈ +0,5) e abaixo das janelas (+1,33)
  root.add(sign);

  // o que há no topo
  const top = G + H + 0.5;
  if (shop.top === 'ac') {
    for (const [x, z] of [[X0 + 2, Z0 + 2], [CX + 0.4, Z0 + 3.4], [X1 - 2, Z0 + 2]]) {
      root.add(at(box(1.5, 0.95, 1.2, '#c9ced6'), x, top + 0.48, z));
      root.add(at(cyl(0.42, 0.42, 0.06, '#4a4f58', 14), x, top + 0.98, z));
      root.add(at(box(1.3, 0.5, 0.06, '#8f949c'), x, top + 0.45, z + 0.61));
    }
  } else if (shop.top === 'billboard') {
    for (const x of [CX - 2.2, CX + 2.2]) root.add(at(box(0.25, 2.6, 0.2, DARK), x, top + 1.3, Z0 + 3.5));
    root.add(at(box(6.4, 2.8, 0.25, '#f4f1ea'), CX, top + 3.6, Z0 + 3.5));
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.4), texMat(adTexture()));
    ad.position.set(CX, top + 3.6, Z0 + 3.64);
    root.add(ad);
  } else if (shop.top === 'antenna') {
    for (let k = 0; k < 6; k++) {
      root.add(at(cyl(0.16 - k * 0.015, 0.18 - k * 0.015, 0.95, k % 2 ? '#f4f1ea' : '#d8473a', 8), CX + 1.5, top + 0.48 + k * 0.95, Z0 + 3));
    }
    root.add(at(box(1.6, 0.1, 0.1, DARK), CX + 1.5, top + 4.2, Z0 + 3));
    root.add(at(box(0.1, 0.1, 1.6, DARK), CX + 1.5, top + 3.3, Z0 + 3));
    const blink = dynamic(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.4 })));
    blink.position.set(CX + 1.5, top + 6.0, Z0 + 3);
    root.add(blink);
    const ph = shop.index * 0.37;
    updaters.push(t => { blink.visible = ((t + ph) % 1.6) < 1.1; });                // pisca devagar
  }

  // frente: duas jardineiras e um banco (iguais em todos) + o detalhe de calçada de cada comércio
  for (const x of [3.4, 13.8]) {
    root.add(at(box(2.2, 0.6, 1.2, '#8a8f98'), x, G + 0.3, 12.6));
    root.add(at(sphere(0.75, '#3f8f3a', 8, 6), x - 0.4, G + 0.95, 12.6));
    root.add(at(sphere(0.6, '#4fa848', 8, 6), x + 0.5, G + 0.9, 12.6));
  }
  root.add(at(box(2.4, 0.15, 0.6, '#8a5a36'), 13.6, G + 0.5, 15.2));
  for (const x of [12.7, 14.5]) root.add(at(box(0.15, 0.5, 0.5, DARK), x, G + 0.25, 15.2));
  sidewalk(deco, biz.key, updaters, shop.index);
  const plain = mergePlain(deco);
  if (plain) root.add(plain);
  while (deco.children.length) root.add(deco.children[0]);          // o resto (letreiros, telas acesas, partes que giram) fica como está

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  root.userData.update = t => { for (let i = 0; i < updaters.length; i++) updaters[i](t); };
  root.userData.biz = biz.key;
  return root;
}

// ---------- vitrines: mercadoria na frente do fundo iluminado (entre o fundo e o vidro) ----------
function display(root, key, x0, x1, updaters) {
  const w = x1 - x0, cx = (x0 + x1) / 2, z = Z1 + 0.14;
  const shelf = (y, col = '#cbb894') => root.add(at(box(w - 0.1, 0.05, 0.2, col), cx, y, z));
  const row = (y, n, make) => { for (let i = 0; i < n; i++) make(x0 + 0.25 + (i + 0.5) * (w - 0.5) / n, y, i); };
  switch (key) {
    case 'bakery':
      shelf(G + 0.95); shelf(G + 1.65);
      row(G + 1.06, 5, (x, y, i) => { const m = at(sphere(0.16, i % 2 ? '#d99a4e' : '#e6b469', 7, 5), x, y, z); m.scale.set(1.7, 0.8, 1); root.add(m); });   // pães
      row(G + 1.76, 3, (x, y, i) => { root.add(at(cyl(0.22, 0.24, 0.24, '#f6e9e4', 10), x, y + 0.1, z)); root.add(at(cyl(0.23, 0.23, 0.05, i === 1 ? '#c2577a' : '#7a4a2a', 10), x, y + 0.24, z)); });   // bolos
      for (const s of [-1, 1]) root.add(at(cyl(0.05, 0.05, 1.2, '#d9a35a', 6), cx + s * w * 0.32, G + 0.6, z, 0, 0, s * 0.35));      // baguetes encostadas
      break;
    case 'pharmacy':
      shelf(G + 0.85, '#ffffff'); shelf(G + 1.45, '#ffffff'); shelf(G + 2.05, '#ffffff');
      for (const y of [G + 0.85, G + 1.45, G + 2.05]) row(y + 0.15, 6, (x, yy, i) => root.add(at(box(0.26, 0.26, 0.16, ['#ffffff', '#5aa6e0', '#e86a6a', '#6ac48a', '#f2d36a'][(i + Math.round(y * 3)) % 5]), x, yy, z)));
      break;
    case 'radio':
      for (const [k, x] of [cx - w * 0.22, cx + w * 0.22].entries()) {                        // duas TVs ligadas
        root.add(at(box(1.0, 0.75, 0.2, '#2a2d33'), x, G + 1.55, z));
        root.add(at(box(0.82, 0.58, 0.04, mat(k ? '#7fd3ff' : '#9cf0c4', { emissive: k ? '#2a6f9a' : '#2a8a5a', emissiveIntensity: 0.7 })), x, G + 1.56, z + 0.11));
      }
      shelf(G + 0.95, '#6b5a48');
      row(G + 1.08, 3, (x, y) => { root.add(at(box(0.5, 0.26, 0.16, '#8a5a36'), x, y, z)); root.add(at(cyl(0.08, 0.08, 0.04, '#2a2d33', 8), x - 0.12, y, z + 0.09, Math.PI / 2, 0, 0)); });   // rádios
      break;
    case 'icecream':
      root.add(at(box(w - 0.3, 0.75, 0.2, '#f7f4ee'), cx, G + 0.72, z));                    // balcão refrigerado
      row(G + 1.16, 5, (x, y, i) => root.add(at(cyl(0.16, 0.16, 0.14, ['#ffc3d6', '#fff0b3', '#b8e6c8', '#c9a27a', '#ffd9a8'][i], 10), x, y, z)));
      shelf(G + 1.8, '#f2d7e0');
      row(G + 1.95, 4, (x, y) => { root.add(at(cone(0.09, 0.26, '#d9a35a', 7), x, y, z, Math.PI, 0, 0)); root.add(at(sphere(0.11, '#ffc3d6', 7, 5), x, y + 0.16, z)); });
      break;
    case 'market':
      shelf(G + 0.85, '#bfa57a'); shelf(G + 1.45, '#bfa57a'); shelf(G + 2.05, '#bfa57a');
      for (const y of [G + 0.85, G + 1.45, G + 2.05]) row(y + 0.15, 7, (x, yy, i) => root.add(at(i % 3 === 0 ? cyl(0.1, 0.1, 0.26, ['#e86a3a', '#3a8ad8', '#e6c23a'][(i + Math.round(y * 5)) % 3], 8) : box(0.2, 0.28, 0.14, ['#f2b84a', '#7ac47a', '#e88a8a', '#8ab8e8'][(i + Math.round(y * 7)) % 4]), x, yy, z)));
      break;
    case 'stationery':
      shelf(G + 0.95, '#d8c9a8'); shelf(G + 1.7, '#d8c9a8');
      row(G + 1.12, 8, (x, y, i) => root.add(at(box(0.08, 0.32, 0.22, ['#e85a5a', '#3a8ad8', '#f2c23a', '#5ab86a', '#a86ad8'][i % 5]), x, y, z, 0, 0, (i % 4 === 3) ? 0.25 : 0)));   // cadernos
      root.add(at(sphere(0.26, '#4a86c8', 10, 8), cx - w * 0.2, G + 2.0, z)); root.add(at(cyl(0.03, 0.06, 0.14, '#3a3d44', 6), cx - w * 0.2, G + 1.79, z));   // globo
      root.add(at(box(0.6, 0.4, 0.04, '#f6f1e6'), cx + w * 0.18, G + 2.0, z + 0.04, 0, 0, -0.08));   // cartaz "volta às aulas"
      break;
    case 'florist':
      for (const [k, x] of [cx - w * 0.3, cx, cx + w * 0.3].entries()) {
        root.add(at(cyl(0.2, 0.15, 0.3, '#c9653a', 8), x, G + 0.55, z));
        root.add(at(sphere(0.32, '#3f8f3a', 8, 6), x, G + 0.95 + k % 2 * 0.15, z));
        for (let f = 0; f < 4; f++) root.add(at(sphere(0.09, ['#ff6fa5', '#ffd23a', '#ffffff', '#c792ea'][(f + k) % 4], 6, 4), x - 0.2 + f * 0.13, G + 1.15 + k % 2 * 0.15 + (f % 2) * 0.1, z + 0.1));
      }
      for (let i = 0; i < 6; i++) root.add(at(box(0.04, 0.5, 0.04, '#3f8f3a'), x0 + 0.4 + i * (w - 0.8) / 5, G + 2.1, z, 0, 0, 0)), root.add(at(sphere(0.14, '#3f8f3a', 6, 4), x0 + 0.4 + i * (w - 0.8) / 5, G + 1.85, z));   // folhagem pendurada
      break;
    case 'snack':
      root.add(at(box(w - 0.2, 0.9, 0.2, '#b5653f'), cx, G + 0.8, z));                      // balcão
      root.add(at(box(w - 0.1, 0.06, 0.24, '#e9e4da'), cx, G + 1.27, z));
      row(G + 1.42, 4, (x, y, i) => i % 2 ? root.add(at(cyl(0.07, 0.07, 0.3, '#3a8a3a', 7), x, y, z)) : root.add(at(cyl(0.14, 0.12, 0.2, '#f2d36a', 8), x, y - 0.03, z)));
      root.add(at(box(w * 0.6, 0.45, 0.04, '#2f3236'), cx, G + 2.05, z));                    // cardápio
      for (let i = 0; i < 3; i++) root.add(at(box(w * 0.45, 0.04, 0.02, '#f4f1ea'), cx, G + 1.95 + i * 0.1, z + 0.03));
      break;
    case 'barber':
      root.add(at(box(w * 0.8, 1.0, 0.04, mat('#dff0f7', { emissive: '#3a4a52', emissiveIntensity: 0.4 })), cx, G + 1.75, z - 0.02));   // espelho
      root.add(at(box(0.55, 0.12, 0.45, '#b02a2a'), cx, G + 0.9, z + 0.04)); root.add(at(box(0.55, 0.6, 0.1, '#b02a2a'), cx, G + 1.2, z - 0.06));   // cadeira
      root.add(at(cyl(0.08, 0.14, 0.5, '#c9ced6', 8), cx, G + 0.6, z));
      break;
    case 'laundry': {
      for (const [k, x] of [cx - w * 0.28, cx, cx + w * 0.28].entries()) {                  // máquinas de lavar (os tambores giram)
        root.add(at(box(0.78, 0.9, 0.2, '#f4f6f8'), x, G + 0.8, z));
        root.add(at(cyl(0.27, 0.27, 0.04, '#5a6470', 14), x, G + 0.78, z + 0.11, Math.PI / 2, 0, 0));
        const drum = dynamic(new THREE.Group()); drum.position.set(x, G + 0.78, z + 0.135);
        drum.add(at(cyl(0.22, 0.22, 0.02, '#8fbfe0', 12), 0, 0, 0, Math.PI / 2, 0, 0));
        drum.add(at(box(0.18, 0.12, 0.03, ['#e86a6a', '#f2c23a', '#6ac48a'][k]), 0.07, 0.05, 0.01));
        drum.add(at(box(0.12, 0.1, 0.03, '#ffffff'), -0.08, -0.06, 0.01));
        root.add(drum);
        const sp = 3 + k * 1.3;
        updaters.push(t => { drum.rotation.z = -t * sp; });
      }
      shelf(G + 1.9, '#d8e2ea');
      row(G + 2.05, 4, (x, y, i) => root.add(at(box(0.3, 0.2, 0.16, ['#8ab8e8', '#f4f1ea', '#f2b8c8', '#b8e6c8'][i]), x, y, z)));   // roupas dobradas
      break;
    }
    default: break;
  }
}

// ---------- calçada: um detalhe de cada comércio (fora do caminho da porta até a rua) ----------
function sidewalk(root, key, updaters, idx) {
  const L = 5.2, R = 12.0, Z = Z1 + 2.4;             // à esquerda e à direita da porta, na sombra do toldo
  switch (key) {
    case 'bakery': {                                  // cavalete de giz "PÃO QUENTE" e um saco de farinha
      chalkboard(root, L, Z, 'PÃO QUENTE');
      root.add(at(box(0.6, 0.7, 0.4, '#efe6d2'), R + 1.2, G + 0.35, Z1 + 0.6, 0, 0.2, 0));
      break;
    }
    case 'pharmacy': {                                // cruz verde no letreiro de bandeira (lado esquerdo da fachada)
      const bx = X0 - 0.05, by = G + F1 + 1.6, bz = Z1 + 0.55;
      root.add(at(box(0.12, 0.12, 0.6, DARK), bx, by + 0.75, Z1 + 0.25));
      root.add(at(box(0.1, 1.2, 1.2, '#f4f1ea'), bx, by, bz));
      const cross = mat('#22a35a', { emissive: '#118a40', emissiveIntensity: 0.6 });
      for (const s of [-1, 1]) { root.add(at(box(0.04, 0.85, 0.28, cross), bx + s * 0.06, by, bz)); root.add(at(box(0.04, 0.28, 0.85, cross), bx + s * 0.06, by, bz)); }
      break;
    }
    case 'radio': {                                   // caixas de entrega empilhadas junto à porta (chegou mercadoria)
      for (const [x, y, z, s, r] of [[R + 0.3, 0, Z1 + 0.7, 0.8, 0.1], [R + 0.4, 0.8, Z1 + 0.7, 0.6, -0.2], [R + 1.4, 0, Z1 + 0.85, 0.65, 0.4]]) {
        root.add(at(box(s, s, s, '#c8955a'), x, G + y + s / 2, z, 0, r, 0));
        root.add(at(box(s + 0.01, 0.08, s * 0.25, '#e6d3a8'), x, G + y + s, z, 0, r, 0));
      }
      break;
    }
    case 'icecream': {                                // casquinha gigante e uma mesinha com guarda-sol branco
      root.add(at(cone(0.38, 1.3, '#d9a35a', 10), L - 0.4, G + 0.75, Z, Math.PI, 0, 0));
      root.add(at(sphere(0.42, '#ffc3d6', 10, 8), L - 0.4, G + 1.55, Z)); root.add(at(sphere(0.34, '#fff0b3', 10, 8), L - 0.35, G + 2.05, Z)); root.add(at(sphere(0.1, '#e8402a', 6, 4), L - 0.3, G + 2.42, Z));
      table(root, 11.3, Z1 + 3.1, true);
      break;
    }
    case 'market': {                                  // banca de frutas sob o toldo
      root.add(at(box(2.6, 0.08, 1.0, '#9a6a3c'), L - 0.6, G + 0.75, Z, -0.25, 0, 0));
      for (const lx of [-1.2, 1.2]) for (const lz of [-0.4, 0.4]) root.add(at(box(0.1, 0.75, 0.1, '#7a4e2e'), L - 0.6 + lx, G + 0.37, Z + lz));
      [['#ff8a1a', -0.85], ['#e6332a', 0], ['#f2d23a', 0.85]].forEach(([c, dx]) => {
        root.add(at(box(0.8, 0.22, 0.8, '#b8864e'), L - 0.6 + dx, G + 0.9, Z, -0.25, 0, 0));
        for (let k = 0; k < 5; k++) root.add(at(sphere(0.12, c, 6, 4), L - 0.6 + dx - 0.24 + (k % 3) * 0.24, G + 1.04 + (k > 2 ? 0.08 : 0), Z - 0.15 + (k > 2 ? 0.2 : 0)));
      });
      for (let k = 0; k < 3; k++) root.add(at(box(0.7, 0.3, 0.55, '#b8864e'), R + 1.0, G + 0.15 + k * 0.31, Z1 + 0.6, 0, k * 0.15, 0));   // caixotes vazios
      break;
    }
    case 'stationery': {                              // expositor de revistas
      root.add(at(box(1.2, 1.2, 0.5, '#3a3d44'), R + 0.6, G + 0.6, Z1 + 0.6));
      for (let k = 0; k < 6; k++) root.add(at(box(0.32, 0.42, 0.04, ['#e85a5a', '#3a8ad8', '#f2c23a', '#5ab86a', '#f4f1ea', '#a86ad8'][k]), R + 0.25 + (k % 3) * 0.36, G + 0.55 + Math.floor(k / 3) * 0.5, Z1 + 0.87, -0.25, 0, 0));
      break;
    }
    case 'florist': {                                 // baldes de flores no degrau
      for (let k = 0; k < 5; k++) {
        const x = L - 1.6 + k * 0.7, c = ['#ff6fa5', '#ffd23a', '#ffffff', '#c792ea', '#ff8a5a'][k];
        root.add(at(cyl(0.24, 0.2, 0.42, '#8f949c', 8), x, G + 0.21, Z1 + 0.75));
        for (let f = 0; f < 5; f++) root.add(at(sphere(0.11, c, 6, 4), x - 0.15 + (f % 3) * 0.15, G + 0.62 + (f > 2 ? 0.12 : 0), Z1 + 0.7 + (f % 2) * 0.12));
        root.add(at(sphere(0.2, '#3f8f3a', 6, 4), x, G + 0.5, Z1 + 0.78));
      }
      break;
    }
    case 'snack': {                                   // duas mesinhas com banquetas e o cavalete do cardápio
      table(root, L - 0.3, Z1 + 2.8, false);
      table(root, R + 0.7, Z1 + 2.8, false);
      chalkboard(root, L + 1.2, Z1 + 1.4, 'PRATO DO DIA');
      break;
    }
    case 'barber': {                                  // poste de barbeiro girando, ao lado da porta
      const px = X0 + 0.2, pz = Z1 + 0.32;                    // (na quina esquerda: fora da porta e da vitrine, acima das jardineiras)
      root.add(at(box(0.34, 0.12, 0.34, '#c9ced6'), px, G + 1.42, pz));
      root.add(at(box(0.34, 0.12, 0.34, '#c9ced6'), px, G + 2.86, pz));
      const pole = dynamic(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.32, 12), new THREE.MeshStandardMaterial({ map: barberTex(), roughness: 0.5 })));
      pole.position.set(px, G + 2.14, pz); root.add(pole);
      root.add(at(sphere(0.17, '#f4f1ea', 8, 6), px, G + 2.98, pz));
      updaters.push(t => { pole.rotation.y = t * 2.4; });
      break;
    }
    case 'laundry': {                                 // carrinho de roupa
      root.add(at(box(0.9, 0.55, 0.6, '#9fb6c8'), R + 0.5, G + 0.55, Z1 + 0.9));
      root.add(at(box(0.8, 0.12, 0.5, '#f4f1ea'), R + 0.5, G + 0.86, Z1 + 0.9));
      for (const [dx, dz] of [[-0.38, -0.25], [0.38, -0.25], [-0.38, 0.25], [0.38, 0.25]]) root.add(at(cyl(0.07, 0.07, 0.05, '#2a2d33', 8), R + 0.5 + dx, G + 0.08, Z1 + 0.9 + dz, Math.PI / 2, 0, 0));
      break;
    }
    default: break;
  }
  void idx;
}

/** Cavalete de giz (A) com o texto de frente para a rua. */
function chalkboard(root, x, z, text) {
  const g = new THREE.Group(); g.position.set(x, G, z);
  g.add(at(box(0.7, 0.95, 0.06, '#7a5230'), 0, 0.5, 0.18, -0.32, 0, 0));
  g.add(at(box(0.7, 0.95, 0.06, '#7a5230'), 0, 0.5, -0.18, 0.32, 0, 0));
  const face = texPlane(signTex(text, '#2c3a2e', '#f4f1ea', 256, 256, text.length > 10 ? 30 : 36), 0.58, 0.8);
  face.position.set(0, 0.52, 0.225); face.rotation.x = -0.32;
  g.add(face);
  root.add(g);
}
/** Mesinha redonda com 2 banquetas (e guarda-sol branco, se `umbrella`). */
function table(root, x, z, umbrella) {
  root.add(at(cyl(0.45, 0.45, 0.05, '#f4f1ea', 12), x, G + 0.75, z));
  root.add(at(cyl(0.05, 0.05, 0.72, '#5a5f66', 6), x, G + 0.38, z));
  for (const s of [-1, 1]) {
    root.add(at(cyl(0.2, 0.2, 0.05, '#c9653a', 10), x + s * 0.75, G + 0.48, z));
    root.add(at(cyl(0.04, 0.04, 0.46, '#5a5f66', 6), x + s * 0.75, G + 0.24, z));
  }
  if (umbrella) {
    root.add(at(cyl(0.03, 0.03, 1.5, '#5a5f66', 6), x, G + 1.5, z));
    root.add(at(cone(1.1, 0.45, '#fbf7ef', 8), x, G + 2.35, z));
  }
}

let barberCache = null;
function barberTex() {
  if (barberCache) return barberCache;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 64, 128);
  const band = (col, off) => { g.fillStyle = col; for (let y = -128; y < 256; y += 64) { g.beginPath(); g.moveTo(0, y + off); g.lineTo(64, y + off - 32); g.lineTo(64, y + off - 16); g.lineTo(0, y + off + 16); g.closePath(); g.fill(); } };
  band('#d8312a', 0); band('#2f5fb0', 32);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (barberCache = t);
}

/** Anúncio do outdoor (o mesmo em todos os prédios que têm outdoor). */
let adCache = null;
function adTexture() {
  if (adCache) return adCache;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 205;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 205);
  g.fillStyle = '#e3262e'; g.beginPath(); g.arc(95, 102, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 54px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('%', 95, 104);
  g.fillStyle = '#3a2a1a'; g.font = 'bold 64px "Trebuchet MS", sans-serif'; g.fillText('OFERTA!', 330, 80);
  g.font = 'bold 34px "Trebuchet MS", sans-serif'; g.fillText('é só passar aqui', 330, 145);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return (adCache = t);
}
