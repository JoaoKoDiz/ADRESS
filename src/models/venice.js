// Veneza (Bairro 10): ilha de pedra por quadra com uma fileira de casas estreitas (a do meio é o destino da entrega),
// cais na frente virado para o canal, degraus, doca de madeira e postes de amarrar barcos. Também a lancha de entregas
// (aparência fixa, cores da van padrão), os barcos que circulam devagar pelos canais (com gente), a vida nas casas (sacada,
// janela, pescador, gato) e o horizonte da laguna (ilhas e Alpes; para o cenário de Veneza).
import * as THREE from 'three';
import { box, cyl, cone, sphere, at, mat, bakeStatic, dynamic, textTexture, vcMerge } from './kit.js';
import { buildFigure } from '../grillbyInside.js';
import { horizonRing, hazeGeo } from './snow.js';
import { LOT } from '../layout.js';
import { VEN_FACADE, VEN_SHUTTER, VEN_AWNING } from '../data.js';

const QUAY = '#8d877c', TILE = '#b5532f', WOOD = '#7a5434', WIN = '#2e3a46', STONE = '#ece4d3', FLOOR_H = 3.0;
// chão de pedregulho (textura desenhada uma vez, repetida a cada 4 unidades)
let COBBLE = null;
function cobbleMat() {
  if (COBBLE) return COBBLE;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#a99d88'; x.fillRect(0, 0, 256, 256);
  let k = 3; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const cx = r() * 256, cy = r() * 256, rr = 7 + r() * 7, t = 196 + r() * 34 | 0;
    x.fillStyle = `rgb(${t},${t - 8 | 0},${t - 22 | 0})`;
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { x.beginPath(); x.ellipse(cx + dx, cy + dy, rr, rr * (0.75 + r() * 0.25), r() * 3, 0, Math.PI * 2); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (COBBLE = new THREE.MeshLambertMaterial({ map: t }));
}
/** Piso de pedregulho w × d, centro (x, z), na altura y. */
export function cobble(w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * d / 4);
  const m = new THREE.Mesh(g, cobbleMat()); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
/**
 * Telhado de duas águas fechado, a partir das medidas reais da construção: paredes de comprimento `len` (ao longo da
 * cumeeira) e profundidade `depth`, topo das paredes em `y`. As duas águas se encontram na cumeeira (com uma peça de
 * cumeeira cobrindo a junta), apoiam a face de baixo exatamente no topo das paredes e saem num beiral `over`; os oitões
 * (triângulos das pontas) preenchem o vão sob a cobertura. ridge 'x' = cumeeira ao longo de X; 'z' = ao longo de Z.
 */
export function gableRoof(root, { cx, cz, y, len, depth, rise = 1.5, over = 0.4, t = 0.22, color, wall, ridge = 'x' }) {
  const g = new THREE.Group(); g.position.set(cx, 0, cz); if (ridge === 'z') g.rotation.y = Math.PI / 2; root.add(g);
  const half = depth / 2, ang = Math.atan2(rise, half), run = half + over, L = run / Math.cos(ang), yTop = y + rise;
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, t, L), mat(color));
    m.position.set(0, yTop - Math.tan(ang) * run / 2 + (t / 2) / Math.cos(ang), s * run / 2); m.rotation.x = s * ang; g.add(m);
  }
  g.add(at(box(len, 0.2, 0.42, color), 0, yTop + t / Math.cos(ang) - 0.04, 0));          // cumeeira
  const sh = new THREE.Shape(); sh.moveTo(-half, 0); sh.lineTo(half, 0); sh.lineTo(0, rise); sh.lineTo(-half, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false });
  for (const x of [-len / 2 + 0.02, len / 2 - 0.22]) {                                     // oitões (no plano das paredes das pontas)
    const m = new THREE.Mesh(geo, mat(wall)); m.position.set(x, y, 0); m.rotation.y = Math.PI / 2; g.add(m);
  }
  return g;
}
// roupas das pessoas de Veneza (as mesmas ideias dos moradores: linho, listrada, avental, lenço, chapéu de palha, colete)
const VEN_LOOKS = [
  { shirt: '#efe6d2', pants: '#3d4a66', hair: '#3a2a1a' },
  { shirt: '#f6f4ee', stripes: '#1f3a68', pants: '#2b2b2b', hair: '#5a3a22' },
  { shirt: '#d9a441', apron: '#f4f1ea', pants: '#4a3a2a', hair: '#8a5a36', longHair: true },
  { shirt: '#c8402f', hat: 'kerchief', hatColor: '#3f7a4a', pants: '#3d4a66', hair: '#2a1d14' },
  { shirt: '#dfe8ef', hat: 'straw', hatBand: '#1f3a68', pants: '#5a4a3a', hair: '#c9a46a' },
  { shirt: '#e9dcc6', scarf: '#2f6fb0', pants: '#2f3b52', hair: '#d8d4cc' },
  { shirt: '#b5302a', pants: '#2b2b2b', hair: '#1d1d1f', longHair: true },
];
export const VEN_X0 = 1.6, VEN_X1 = 15.6, VEN_Z0 = 2.2, VEN_Z1 = 11.8;   // fileira de casas (as vielas ficam nas laterais e atrás)

/** Uma fachada estreita: largura w, andares n, frente em z = VEN_Z1. */
function narrow(root, x0, w, n, color, sh, opts = {}) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const H = n * FLOOR_H, cx = x0 + w / 2, D = VEN_Z1 - VEN_Z0, cz = (VEN_Z0 + VEN_Z1) / 2;
  add(box(w, H, D, color), cx, 0.15 + H / 2, cz);
  const ww = w - 0.04;                                                                // (não encosta na vizinha: nada de faces sobrepostas)
  add(box(ww, 0.22, D + 0.24, '#e8dfcc'), cx, 0.15 + H - 0.16, cz);                  // cornija (logo abaixo do beiral)
  gableRoof(root, { cx, cz, y: 0.15 + H, len: ww, depth: D, rise: 1.5, over: 0.45, color: TILE, wall: color });   // telhado de telhas
  if (opts.chimney) {                                                                 // chaminé veneziana: fuste e boca em funil
    const chx = cx + w * 0.25, chz = cz - 1.8, top = 0.15 + H + 1.8;
    add(box(0.55, 1.6, 0.55, '#b8a58a'), chx, top - 0.8, chz);
    add(cyl(0.62, 0.3, 0.7, '#c9b79c', 8), chx, top + 0.35, chz); add(cyl(0.66, 0.66, 0.1, '#8a7a66', 8), chx, top + 0.72, chz);
  }
  const cols = w > 4.6 ? [cx - w * 0.26, cx + w * 0.26] : [cx];
  for (let f = 0; f < n; f++) {
    const y = 0.15 + f * FLOOR_H + 1.5;
    for (const x of cols) {
      if (f === 0 && Math.abs(x - cx) < 0.6 && opts.door) continue;
      if (opts.arch) { add(box(0.9, 1.1, 0.08, WIN), x, y - 0.1, VEN_Z1 + 0.03); add(cyl(0.45, 0.45, 0.08, WIN, 10), x, y + 0.45, VEN_Z1 + 0.03, Math.PI / 2, 0, 0); add(cyl(0.6, 0.6, 0.05, STONE, 10), x, y + 0.45, VEN_Z1 + 0.015, Math.PI / 2, 0, 0); add(box(1.2, 1.1, 0.05, STONE), x, y - 0.1, VEN_Z1 + 0.015); }
      else { add(box(0.9, 1.4, 0.08, WIN), x, y, VEN_Z1 + 0.03); add(box(1.18, 1.68, 0.05, STONE), x, y, VEN_Z1 + 0.015); }   // moldura de pedra clara
      add(box(1.34, 0.1, 0.24, STONE), x, y - 0.76, VEN_Z1 + 0.12);                      // peitoril
      if (sh) for (const s of [-1, 1]) add(box(0.42, 1.45, 0.1, sh), x + s * 0.68, y, VEN_Z1 + 0.06);   // persianas
    }
  }
  return H;
}

export function buildVeniceLot(h) {
  const root = new THREE.Group();
  root.name = 'ven:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  // ilha: base de pedra com borda de cais
  add(box(LOT + 0.6, 0.9, LOT + 0.6, QUAY), LOT / 2, -0.3, LOT / 2);              // (os pedregulhos ficam por cima: terrain.js)
  // vizinhas (neutras, mais baixas) e o destino no meio, colado nelas
  const W = 5.4, xD = (LOT - W) / 2;
  narrow(root, VEN_X0, xD - VEN_X0, 2, '#d8cfc0', '#8a7f72', { chimney: true });
  narrow(root, xD + W, VEN_X1 - xD - W, 2 + (h.index % 2), '#cbbfae', null, {});
  const col = VEN_FACADE[h.fac], sh = VEN_SHUTTER[h.sh];
  const H = narrow(root, xD, W, h.floors, col, sh, { arch: h.arch, door: true });
  const cx = LOT / 2, fz = VEN_Z1;
  // porta em arco, degraus de pedra até o cais, doca de madeira e postes de amarrar
  add(box(1.3, 2.1, 0.1, '#5b3a22'), cx, 1.2, fz + 0.1); add(cyl(0.65, 0.65, 0.1, '#5b3a22', 10), cx, 2.25, fz + 0.1, Math.PI / 2, 0, 0);
  for (let k = 0; k < 3; k++) add(box(2.4, 0.15, 0.6, '#e2dacb'), cx, 0.22 - k * 0.0, fz + 0.4 + k * 0.6);
  add(box(3.0, 0.18, 2.6, WOOD), cx, 0.12, LOT + 1.0);                                         // doca (sobre a água)
  for (const s of [-1, 1]) add(box(0.25, 1.3, 0.25, '#5a3c22'), cx + s * 1.4, 0.3, LOT + 2.2);
  if (h.items.includes('poles')) for (const s of [-1, 1]) {                                     // postes listrados (bricole)
    for (let k = 0; k < 5; k++) add(cyl(0.18, 0.18, 0.6, k % 2 ? '#ffffff' : '#c8402f', 8), cx + s * 2.3, 0.3 + k * 0.6, LOT + 2.6);
    add(cone(0.22, 0.4, '#c8402f', 8), cx + s * 2.3, 3.3, LOT + 2.6);
  }
  if (h.items.includes('lamp')) {                                                               // lanterna na porta
    add(box(0.08, 0.08, 0.5, '#2b2b2b'), cx + 0.95, 2.6, fz + 0.3);
    add(box(0.32, 0.45, 0.32, '#2b2b2b'), cx + 0.95, 2.35, fz + 0.55);
    add(box(0.22, 0.3, 0.22, '#ffd36b'), cx + 0.95, 2.35, fz + 0.55);
  }
  if (h.awning) {                                                                               // toldo sobre a porta
    const c = VEN_AWNING[h.awning];
    add(box(3.0, 0.12, 1.4, c), cx, 3.0, fz + 0.65, 0.35, 0, 0);
    add(box(3.0, 0.3, 0.06, c), cx, 2.7, fz + 1.3);
  }
  // sacada no 2º andar (todas têm): vasos e flores dependem da casa
  const yB = 0.15 + FLOOR_H + 0.35;
  add(box(W - 1.0, 0.15, 0.9, '#e8dfcc'), cx, yB, fz + 0.45);
  for (let x = cx - W / 2 + 0.6; x <= cx + W / 2 - 0.6; x += 0.42) add(box(0.06, 0.8, 0.06, '#2b2b2b'), x, yB + 0.45, fz + 0.86);
  add(box(W - 1.0, 0.06, 0.06, '#2b2b2b'), cx, yB + 0.85, fz + 0.86);
  if (h.items.includes('pots')) for (const s of [-1, 1]) {
    add(cyl(0.28, 0.2, 0.45, '#b5532f', 8), cx + s * 1.3, yB + 0.3, fz + 0.5);
    add(sphere(0.38, '#3f8f3a', 7, 5), cx + s * 1.3, yB + 0.75, fz + 0.5);
  }
  if (h.items.includes('flowers')) {                                                          // floreiras: nas janelas acima da sacada
    const spots = [];
    for (let f = 2; f < h.floors; f++) for (const sx of [-1, 1]) spots.push([cx + sx * W * 0.26, 0.15 + f * FLOOR_H + 0.7, fz + 0.25, 1.1]);
    if (h.floors === 2) for (const sx of [-1, 1]) spots.push([cx + sx * 0.5, yB + 0.95, fz + 0.86, 0.7]);   // casa baixa: sobre o parapeito da sacada
    spots.forEach(([x, y, z, w], k) => {
      add(box(w, 0.25, 0.35, '#7a5434'), x, y, z);
      for (const dx of w > 1 ? [-0.35, 0, 0.35] : [-0.18, 0.18]) add(sphere(0.17, ['#e8467a', '#ffd84a', '#ffffff'][(k + (dx > 0 ? 1 : 0) + (dx === 0 ? 2 : 0)) % 3], 6, 4), x + dx, y + 0.2, z + 0.05);
    });
  }
  let clothes = null;
  if (h.items.includes('laundry')) {                                                           // varal com roupas entre as janelas do alto (balançam com o vento)
    const y = 0.15 + (h.floors - 1) * FLOOR_H + 2.6;
    add(box(W - 0.4, 0.03, 0.03, '#eeeeee'), cx, y, fz + 0.5);
    for (const sx of [-1, 1]) add(box(0.06, 0.06, 0.5, '#2b2b2b'), cx + sx * (W / 2 - 0.2), y, fz + 0.25);   // suportes na parede
    const cl = new THREE.Group();
    ['#ffffff', '#3a78d4', '#e85c4a', '#efbf2a'].forEach((c, k) => cl.add(at(box(0.6, k % 2 ? 0.75 : 0.62, 0.04, c), -1.6 + k * 1.05, k % 2 ? -0.4 : -0.33, 0)));
    clothes = new THREE.Group(); clothes.position.set(cx, y, fz + 0.5); clothes.add(vcMerge(cl)); root.add(dynamic(clothes));
  }
  root.userData.height = H;
  const life = veniceLife(root, h, cx, fz, W, xD);
  bakeStatic(root);
  const ph = h.index * 1.37;
  root.userData.update = (t, dt) => {
    if (!root.visible) return;
    if (clothes) clothes.rotation.x = -0.05 - Math.max(0, Math.sin(t * 1.3 + ph) * 0.5 + Math.sin(t * 3.1 + ph * 2) * 0.2) * 0.22;
    if (life) life(t, dt);
  };
  return root;
}

/** Vida na casa (uma cena por casa, escolhida pelo índice; algumas ficam quietas): alguém debruçado na sacada olhando o canal,
 *  um vizinho na janela de cima, um pescador sentado na beira do cais, alguém regando os vasos, um gato dormindo no cais.
 *  Nada fica na frente da porta (onde o morador atende) nem cobre as características da pista. Devolve o animador ou null. */
function veniceLife(root, h, cx, fz, W, xD) {
  const k = (h.index * 7 + 3) % 9, ph = h.index * 0.91;                // (5 cenas em 9: algumas casas ficam quietas)
  const yB = 0.15 + FLOOR_H + 0.35 + 0.075;                         // piso da sacada
  const look = VEN_LOOKS[h.index % VEN_LOOKS.length];
  if ((k === 0 || k === 3) && h.floors === 2 && (h.items.includes('laundry') || h.items.includes('flowers'))) return null;   // (casa baixa: o varal e as floreiras ficam logo acima do parapeito; ninguém na frente deles)
  if (k === 0 || (k === 3 && !h.items.includes('pots'))) {                                    // debruçado na sacada
    const f = buildFigure({ ...look, moving: ['head', 'armR'] });
    f.root.position.set(cx - 0.1, yB, fz + 0.42); f.body.rotation.x = 0.16; root.add(f.root);
    f.armR.rotation.set(-0.85, 0, 0.12);
    return t => {
      f.head.rotation.y = Math.sin(t * 0.31 + ph) * 0.55 + Math.sin(t * 0.83 + ph) * 0.15;
      const wave = Math.max(0, Math.sin(t * 0.17 + ph) - 0.92) * 12.5;                     // de vez em quando acena para quem passa no canal
      f.armR.rotation.set(-0.85 - wave * 1.6, 0, 0.12 + wave * 0.3 + (wave > 0 ? Math.sin(t * 9) * 0.25 * wave : 0));
    };
  }
  if (k === 3) {                                                                               // regando os vasos da sacada
    const f = buildFigure({ ...look, moving: ['armR'], headPose: { x: 0.25 } });
    f.root.position.set(cx + 0.45, yB, fz + 0.32); f.root.rotation.y = 0.5; root.add(f.root);
    const can = new THREE.Group(); can.add(at(cyl(0.16, 0.18, 0.3, '#3f8a8a', 8), 0, -0.05, 0.08)); can.add(at(cyl(0.03, 0.04, 0.42, '#3f8a8a', 5), 0, 0.02, 0.32, 1.1, 0, 0));
    can.position.set(0, -0.56, 0.05); f.armR.add(can);
    return t => {
      const pour = 0.5 + 0.5 * Math.sin(t * 0.7 + ph);
      f.armR.rotation.set(-0.95 - pour * 0.25, 0, 0.15); can.rotation.x = pour * 0.55;
    };
  }
  if (k === 1) {                                                                               // vizinho na janela de cima (casa da direita)
    const f = buildFigure({ ...VEN_LOOKS[(h.index + 3) % VEN_LOOKS.length], moving: ['head'], armPose: { L: [-1.35, 0, -0.2] } });
    const x = (xD + W + VEN_X1) / 2, y = 0.15 + FLOOR_H + 1.5 - 1.3;
    f.root.position.set(x, y, VEN_Z1 - 0.38); f.body.rotation.x = 0.32; root.add(f.root);
    return t => { f.head.rotation.y = Math.sin(t * 0.23 + ph) * 0.7; };
  }
  if (k === 2) {                                                                               // pescador sentado na beira do cais (à esquerda, longe da porta)
    const f = buildFigure({ ...VEN_LOOKS[(h.index + 5) % VEN_LOOKS.length], sit: 0.62, moving: ['head', 'armR'] });
    f.root.position.set(2.6, 0.18 - 0.64, LOT - 0.15); root.add(f.root);
    f.armR.rotation.set(-0.9, 0, 0.1);
    const rod = new THREE.Group(); rod.position.set(0, -0.5, 0.05); f.armR.add(rod);   // (na mão)
    rod.add(at(cyl(0.025, 0.04, 3.0, '#6b4428', 5), 0, -0.44, 1.44, 1.86, 0, 0));        // vara para a frente, sobre o canal (~35° acima do horizonte)
    const linePv = new THREE.Group(); linePv.position.set(0, -0.87, 2.88); rod.add(linePv);   // ponta da vara: a linha cai na água
    linePv.add(at(box(0.012, 3.0, 0.012, '#e8e8e8'), 0, -1.5, 0));
    return t => {
      const nib = Math.max(0, Math.sin(t * 0.37 + ph) - 0.85) * 6;                      // de vez em quando o peixe belisca
      f.armR.rotation.x = -0.9 + Math.sin(t * 1.1 + ph) * 0.04 - nib * 0.25;
      linePv.rotation.x = -f.armR.rotation.x;                                           // (a linha fica a prumo)
      f.head.rotation.x = 0.35; f.head.rotation.y = Math.sin(t * 0.21 + ph) * 0.35;
    };
  }
  if (k === 4) {                                                                               // gato dormindo no cais, rabo mexendo
    const coat = ['#e0893a', '#2a2a2e', '#ece6da', '#8e9196'][h.index % 4], bodyG = new THREE.Group(), tailG = new THREE.Group();
    bodyG.add(at(box(0.55, 0.28, 0.32, coat), 0, 0.14, 0), at(box(0.26, 0.24, 0.26, coat), 0.33, 0.16, 0.04));
    for (const sd of [-1, 1]) bodyG.add(at(cone(0.06, 0.12, coat, 4), 0.33, 0.33, 0.04 + sd * 0.08));
    tailG.add(at(box(0.42, 0.07, 0.07, coat), -0.2, 0, 0));
    const cat = new THREE.Group(), tail = dynamic(new THREE.Group()); tail.position.set(-0.27, 0.08, 0); tail.add(vcMerge(tailG));
    cat.add(vcMerge(bodyG), tail); cat.position.set(14.6, 0.2, 13.2); cat.rotation.y = 2.4; root.add(cat);   // (o corpo vai junto com a casa assada; só o rabo mexe)
    return t => { tail.rotation.y = Math.sin(t * 1.4 + ph) * 0.5 + Math.max(0, Math.sin(t * 0.3 + ph) - 0.8) * 2 * Math.sin(t * 6); };
  }
  return null;
}

/** Lancha de entregas (aparência fixa): casco laranja baixo com proa, faixa creme, cabine com vidros azul-escuros,
 *  caixas presas na área de carga e o ADRESS nas laterais. Local: frente = +X (como a van). */
export function buildBoat() {
  const g = new THREE.Group(); g.name = 'boat';
  const ORANGE = '#f07a1d', CREAM = '#fff3d6', GLASS = '#1f3550', DARK = '#3a2a1a';
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  add(box(4.4, 0.9, 2.4, ORANGE), -0.4, 0.15, 0);                                            // casco
  const bow = new THREE.Shape(); bow.moveTo(0, -1.2); bow.lineTo(1.9, 0); bow.lineTo(0, 1.2); bow.lineTo(0, -1.2);
  const bg = new THREE.ExtrudeGeometry(bow, { depth: 0.9, bevelEnabled: false }); bg.rotateX(-Math.PI / 2); bg.translate(1.8, -0.3, 0);
  g.add(new THREE.Mesh(bg, mat(ORANGE)));
  add(box(4.5, 0.18, 2.46, CREAM), -0.4, 0.62, 0);                                           // faixa creme
  const bs = new THREE.Shape(); bs.moveTo(0, -1.23); bs.lineTo(1.95, 0); bs.lineTo(0, 1.23); bs.lineTo(0, -1.23);
  const bsg = new THREE.ExtrudeGeometry(bs, { depth: 0.18, bevelEnabled: false }); bsg.rotateX(-Math.PI / 2); bsg.translate(1.8, 0.53, 0);
  g.add(new THREE.Mesh(bsg, mat(CREAM)));
  add(box(5.6, 0.06, 2.2, '#d9c7a4'), -0.1, 0.62, 0);                                        // convés
  add(box(1.5, 1.2, 1.9, CREAM), 0.6, 1.25, 0);                                               // cabine
  add(box(0.06, 0.6, 1.6, GLASS), 1.37, 1.45, 0);
  for (const s of [-1, 1]) add(box(1.1, 0.5, 0.06, GLASS), 0.6, 1.5, s * 0.96);
  add(box(1.8, 0.14, 2.2, ORANGE), 0.6, 1.92, 0);
  [[-1.4, -0.45, 0.9], [-1.4, 0.5, 0.75], [-2.2, 0, 0.8], [-1.75, 0.05, 0.6]].forEach(([x, z, sz], k) => {   // caixas de entrega
    add(box(sz, sz, sz, k % 2 ? '#c9925a' : '#b8804a'), x, 0.65 + sz / 2 + (k === 3 ? 0.8 : 0), z);
    add(box(sz + 0.02, 0.1, 0.1, '#f2d9a8'), x, 0.65 + sz + (k === 3 ? 0.8 : 0) - 0.02, z);
  });
  add(box(1.9, 0.08, 0.06, DARK), -1.75, 1.5, 1.0); add(box(1.9, 0.08, 0.06, DARK), -1.75, 1.5, -1.0);   // amarras
  const tex = textTexture('ADRESS', { width: 512, height: 128, bg: '#f07a1d', fg: '#fff3d6' });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(-0.9, 0.2, s * 1.215); m.rotation.y = s > 0 ? 0 : Math.PI; g.add(m);
    add(box(0.5, 0.5, 0.04, '#c9925a'), 1.0, 0.2, s * 1.215);                                  // símbolo da encomenda
    add(box(0.5, 0.08, 0.05, CREAM), 1.0, 0.2, s * 1.22);
  }
  // rastro na água (some com a lancha parada)
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  wake.rotation.x = -Math.PI / 2; wake.position.set(-4.6, 0.1, 0); wake.name = 'wake'; g.add(wake);
  g.userData.wake = wake;
  return g;
}

/** Casco de barco (frente = +X), leve e legível: perfil lateral com a borda (amurada) subindo nas pontas e o fundo
 *  levantando até elas; na planta, a largura afina até a proa (e até a popa, se `stern` = 'point'; 'flat' = espelho de
 *  popa). Por baixo é mais estreito que em cima (bojo). `top(u, bow)`/`bot(u, bow)` dão as alturas (u = 0 no meio, 1 na ponta). */
function hullGeo({ L, W, top, bot, stern = 'point', lean = 0, n = 18 }) {
  const h = L / 2, sh = new THREE.Shape(), U = i => -1 + 2 * i / n;
  for (let i = 0; i <= n; i++) { const u = U(i), x = u * h, y = bot(Math.abs(u), u > 0); i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  for (let i = n; i >= 0; i--) { const u = U(i); sh.lineTo(u * h, top(Math.abs(u), u > 0)); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -0.5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), u = Math.min(1, Math.abs(x) / h), bow = x > 0;
    const yt = top(u, bow), yb = bot(u, bow), k = Math.max(0, Math.min(1, (y - yb) / Math.max(0.01, yt - yb)));
    let hw = bow || stern === 'point' ? Math.pow(Math.max(0, 1 - Math.pow(u, 2.1)), 0.62) : 1 - 0.22 * Math.pow(u, 3);
    hw = Math.max(0.035, hw) * W * (0.72 + 0.28 * Math.sqrt(k));
    p.setZ(i, p.getZ(i) * hw + lean * (1 - u * u) * (y - yb));
  }
  g.computeVertexNormals();
  return g;
}
// água em volta do casco: anel claro (a "linha d'água" que toca o casco) e esteira em V que só aparece com o barco andando
const RIPPLE_GEO = new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
const WAKE_GEO = (() => {                                                                       // V aberto atrás da popa
  const g = new THREE.BufferGeometry(), v = [], w = 0.22;
  for (const s of [-1, 1]) {
    const a = [0, 0, s * 0.35], b = [-6, 0, s * 2.6];
    v.push(a[0], 0, a[2], b[0], 0, b[2], b[0], 0, b[2] + s * w * 3, a[0], 0, a[2], b[0], 0, b[2] + s * w * 3, a[0], 0, a[2] + s * w);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
})();
function waterMarks(g, hl, hw, sternX) {
  const rm = new THREE.MeshBasicMaterial({ color: '#d8eef8', transparent: true, opacity: 0.5, depthWrite: false });
  const ring = new THREE.Mesh(RIPPLE_GEO, rm); ring.scale.set(hl, 1, hw); ring.position.y = 0.075; ring.renderOrder = 1; g.add(ring);
  const wm = new THREE.MeshBasicMaterial({ color: '#e6f4fa', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const wake = new THREE.Mesh(WAKE_GEO, wm); wake.position.set(sternX, 0.07, 0); wake.renderOrder = 1; g.add(wake);
  for (const m of [ring, wake]) { m.castShadow = false; m.receiveShadow = false; }
  return (t, speed) => {
    const k = Math.min(1, speed / 3.2);
    ring.scale.set(hl * (1 + Math.sin(t * 1.3) * 0.02 + k * 0.05), 1, hw * (1.06 + Math.sin(t * 1.7 + 1) * 0.04 + k * 0.1));
    rm.opacity = 0.32 + 0.12 * Math.sin(t * 0.9) + k * 0.15;
    wm.opacity = k * 0.42; wake.scale.set(0.5 + k * 0.6, 1, 0.7 + k * 0.4);
  };
}
// gondoleiro em pé na popa com o remo apoiado na forcola (lado direito): as mãos acompanham o cabo do remo
function gondolier(g, k, ph, deckY) {
  const gl = buildFigure({ shirt: '#f6f4ee', stripes: '#1f3a68', pants: '#1d1d22', band: '#c8402f', hat: 'gondolier', hair: k ? '#2a1d14' : '#6b4428', moving: ['armL', 'armR', 'head'] });
  gl.root.position.set(-2.7, deckY, -0.16); gl.root.rotation.y = Math.PI / 2; g.add(gl.root);
  const FORC = new THREE.Vector3(-1.95, deckY + 0.62, 0.5);
  const oar = new THREE.Group(); oar.position.copy(FORC); g.add(oar);
  const blade = new THREE.Group();                                                            // remo ao longo do +X local: cabo atrás, pá na água
  blade.add(at(cyl(0.035, 0.045, 4.6, '#c9a46a', 6), 1.55, 0, 0, 0, 0, Math.PI / 2));
  blade.add(at(box(0.9, 0.05, 0.2, '#b8925a'), 3.75, 0, 0)); blade.add(at(box(0.16, 0.08, 0.08, '#6b4428'), -0.72, 0, 0));
  const oarM = vcMerge(blade); oar.add(oarM);
  const BASE = new THREE.Vector3(0.8, -0.42, 0.42).normalize();                             // direção da forcola até a pá (para a frente, para fora, para baixo)
  const q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), d = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  let st = Math.random() * 6;
  return (dt, t, speed, rowing) => {
    // remada: puxa o cabo para trás (a pá vai para trás na água), volta com a pá levantada; parado, segura o remo e espera
    if (rowing) st += dt * (0.55 + speed * 0.12) * Math.PI * 2;
    const sw = rowing ? Math.sin(st) : Math.sin(t * 0.5 + ph) * 0.06, lift = rowing ? Math.max(0, Math.cos(st)) : 0.2;
    d.copy(BASE).applyAxisAngle(Y, sw * 0.32); d.y -= -lift * 0.12; d.normalize();
    q.setFromUnitVectors(X, d); oar.quaternion.copy(q);
    gl.body.rotation.x = 0.1 + sw * 0.14;                                                   // empurra com o corpo todo
    gl.armL.rotation.set(-1.15 - sw * 0.3, 0, -0.05); gl.armR.rotation.set(-1.0 - sw * 0.3, 0, -0.6);   // (as duas mãos no cabo, do lado da forcola)
    gl.head.rotation.y = Math.sin(t * 0.21 + ph) * 0.35 + (rowing ? 0 : Math.sin(t * 0.13 + ph) * 0.3);
  };
}

/** Barcos que circulam (frente = +X; main.js os move pelos canais): 0 gôndola com um casal passeando, 1 barca de frutas e
 *  verduras com o barqueiro no leme, 2 gôndola só com o gondoleiro voltando, 3 táxi aquático de madeira envernizada.
 *  Cascos com perfil de barco (borda que sobe nas pontas, bojo, proa afinando), assentos, e a água em volta (anel na
 *  linha d'água e esteira que abre com a velocidade). main.js informa `userData.speed` e `userData.rowing`; o gondoleiro
 *  rema no ritmo da velocidade (parado, espera apoiado no remo) e as pessoas olham em volta, cada uma no seu tempo. */
export function buildBoatNpc(k) {
  const g = new THREE.Group(), fixed = new THREE.Group(), ph = k * 2.3;
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => fixed.add(at(m, x, y, z, rx, ry, rz));
  const anims = [];
  let marks;
  if (k === 0 || k === 2) {                                                                   // gôndola: preta, longa e esguia, pontas altas
    const BLK = '#141418', GOLD = '#c9a441', L = 7.6;
    const top = (u, bow) => 0.46 + (bow ? 0.62 : 0.4) * Math.pow(u, 2.6), bot = (u, bow) => -0.16 + (bow ? 0.86 : 0.6) * Math.pow(u, 2.2);
    fixed.add(new THREE.Mesh(hullGeo({ L, W: 1.34, top, bot, lean: 0.05 }), mat(BLK)));
    a(box(3.6, 0.05, 0.98, '#5a3a22'), -0.2, 0.47, 0);                                       // tablado do meio
    for (const sd of [-1, 1]) a(box(3.4, 0.05, 0.05, GOLD), -0.2, 0.5, sd * 0.6);            // friso dourado da borda
    a(box(0.12, 0.98, 0.3, '#dcdcdc'), 3.72, 1.2, 0, 0, 0, -0.08);                           // ferro da proa: lâmina e seis dentes
    for (let t = 0; t < 6; t++) a(box(0.26, 0.05, 0.08, '#dcdcdc'), 3.86, 0.86 + t * 0.1, 0);
    a(box(0.22, 0.12, 0.26, '#dcdcdc'), 3.66, 1.73, 0, 0, 0, 0.5);
    a(box(0.32, 0.26, 0.3, BLK), -3.58, 0.92, 0, 0, 0, -0.5);                                // ponta da popa
    a(box(0.9, 0.06, 1.0, '#5a3a22'), -2.65, 0.63, 0);                                        // plataforma do gondoleiro
    a(box(0.14, 0.5, 0.16, '#6b4428'), -1.95, 0.72, 0.5); a(box(0.1, 0.16, 0.24, '#6b4428'), -1.95, 1.02, 0.5, 0, 0, 0.3);   // forcola
    a(box(0.95, 0.24, 0.96, '#8a2a2a'), 0.35, 0.6, 0); a(box(0.16, 0.6, 0.98, '#8a2a2a'), -0.08, 0.86, 0, 0, 0, 0.12);   // poltrona de veludo
    for (const sd of [-1, 1]) { a(box(0.9, 0.3, 0.08, BLK), 0.35, 0.78, sd * 0.5); a(box(0.92, 0.04, 0.1, GOLD), 0.35, 0.94, sd * 0.5); }   // braços com friso
    a(box(0.34, 0.2, 0.9, '#5a3a22'), 1.75, 0.6, 0); a(box(0.34, 0.06, 0.9, '#8a2a2a'), 1.75, 0.72, 0);   // banquinho da frente
    a(box(0.28, 0.32, 0.22, GOLD), 1.1, 0.6, 0.48); a(sphere(0.1, GOLD, 6, 4), 1.1, 0.82, 0.48);   // cavalinho (enfeite de latão)
    anims.push(gondolier(g, k, ph, 0.66));
    if (k === 0) {                                                                             // casal passeando
      const p1 = buildFigure({ shirt: '#e9dcc6', pants: '#3d4a66', hair: '#3a2a1a', hat: 'straw', sit: 0.3, moving: ['head'] });
      const p2 = buildFigure({ shirt: '#d99a94', pants: '#2f3b52', hair: '#8a5a36', longHair: true, sit: 0.3, moving: ['head', 'armR'] });
      for (const [p, z] of [[p1, -0.24], [p2, 0.24]]) { p.root.position.set(0.15, 0.42, z); p.root.rotation.y = Math.PI / 2; p.root.scale.setScalar(0.88); g.add(p.root); }
      anims.push((dt, t) => {
        const look = Math.sin(t * 0.13 + 2) > 0.55;                                            // de vez em quando se olham
        p1.head.rotation.y = look ? -0.7 : Math.sin(t * 0.33 + 1) * 0.6; p2.head.rotation.y = look ? 0.7 : Math.sin(t * 0.41) * 0.5 - 0.2;
        const snap = Math.max(0, Math.sin(t * 0.21) - 0.8) * 5;                              // e ela aponta alguma coisa
        p2.armR.rotation.set(-snap * 1.5, 0, 0.1 + snap * 0.2);
      });
    }
    marks = waterMarks(g, 3.7, 0.95, -3.4);
  } else if (k === 1) {                                                                       // barca de frutas e verduras (casco largo, popa reta)
    const GRN = '#3f6a4a';
    const top = (u, bow) => 0.5 + (bow ? 0.3 : 0.06) * Math.pow(u, 2.4), bot = (u, bow) => -0.12 + (bow ? 0.5 : 0.1) * Math.pow(u, 2.6);
    fixed.add(new THREE.Mesh(hullGeo({ L: 5.8, W: 2.0, top, bot, stern: 'flat' }), mat(GRN)));
    for (const sd of [-1, 1]) a(box(4.6, 0.1, 0.08, '#e8dfcc'), -0.2, 0.52, sd * 0.98);      // borda creme
    a(box(3.4, 0.05, 1.7, '#7a5434'), 0.0, 0.51, 0);
    const FR = ['#ff8c1a', '#e8312f', '#7bc950', '#ffd23f', '#8a3a8a', '#7bc950'];
    FR.forEach((c, i) => {                                                                     // caixotes com frutas e verduras
      const x = -0.75 + (i % 3) * 0.95, z = i < 3 ? -0.45 : 0.45;
      a(box(0.85, 0.42, 0.75, '#b8804a'), x, 0.74, z); for (let q = 0; q < 4; q++) a(sphere(0.17, c, 6, 4), x - 0.22 + (q % 2) * 0.44, 0.99, z - 0.17 + (q > 1 ? 0.34 : 0));
    });
    a(box(0.08, 1.3, 0.08, '#5a3a22'), 1.55, 1.15, 0); a(box(1.2, 0.05, 0.9, '#c8402f'), 1.2, 1.8, 0, 0, 0, -0.15);   // toldinho na proa
    a(box(0.45, 0.24, 1.0, '#5a3a22'), -1.95, 0.64, 0);                                        // banco do barqueiro
    a(box(0.44, 0.5, 0.42, '#3a3a3a'), -2.95, 0.72, 0); a(box(0.12, 0.6, 0.12, '#3a3a3a'), -3.05, 0.3, 0);   // motor de popa
    a(box(0.7, 0.05, 0.05, '#5a3a22'), -2.45, 0.88, 0.18, 0, 0.35, 0);                         // cana do leme
    const bm = buildFigure({ shirt: '#3a78d4', pants: '#3d4a66', hair: '#d8d4cc', hat: 'cap', hatColor: '#1f3a68', apron: '#e7d3a8', sit: 0.24, moving: ['head', 'armR'] });
    bm.root.position.set(-1.95, 0.52, -0.05); bm.root.rotation.y = Math.PI / 2; g.add(bm.root);
    anims.push((dt, t, speed) => {
      bm.head.rotation.y = Math.sin(t * 0.25 + 2) * 0.7;
      bm.armR.rotation.set(0.25 + Math.sin(t * 0.5) * 0.05 + (speed < 0.3 ? 0 : Math.sin(t * 0.9) * 0.05), 0, 0.5);   // mão na cana do leme
    });
    marks = waterMarks(g, 3.05, 1.25, -2.9);
  } else {                                                                                    // táxi aquático (madeira envernizada)
    const WD = '#8a4f2a';
    const top = (u, bow) => 0.5 + (bow ? 0.34 : 0.04) * Math.pow(u, 2.2), bot = (u, bow) => -0.14 + (bow ? 0.62 : 0.08) * Math.pow(u, 2.0);
    fixed.add(new THREE.Mesh(hullGeo({ L: 5.6, W: 1.9, top, bot, stern: 'flat' }), mat(WD)));
    a(box(3.2, 0.05, 1.6, '#f1e6cf'), -0.4, 0.52, 0);
    for (let x = -1.8; x < 1.2; x += 0.45) a(box(0.04, 0.02, 1.5, '#6b3a1e'), x, 0.55, 0);   // frisos do convés
    a(box(1.5, 0.72, 1.5, '#f1e6cf'), -1.2, 0.9, 0); a(box(1.58, 0.06, 1.6, WD), -1.2, 1.28, 0);   // cabine baixa (atrás)
    for (const sd of [-1, 1]) a(box(1.1, 0.3, 0.04, '#2b3d52'), -1.2, 0.98, sd * 0.76);
    a(box(0.5, 0.5, 0.6, WD), 0.6, 0.78, -0.3); a(cyl(0.2, 0.2, 0.04, '#2b2b2b', 10), 0.47, 1.12, -0.3, 0, 0, 1.1);   // painel e volante
    a(box(0.06, 0.4, 1.4, '#9fc3d6'), 1.0, 1.12, 0, 0, 0, -0.35);                          // para-brisa
    a(box(0.5, 0.22, 0.5, '#f1e6cf'), -0.1, 0.66, -0.3);                                     // banco do piloto
    for (const sd of [-1, 1]) a(box(3.4, 0.05, 0.05, '#d9d9d9'), -0.1, 0.62, sd * 0.93);     // frisos cromados
    const pl = buildFigure({ shirt: '#ffffff', pants: '#1d2a3a', hair: '#3a2a1a', hat: 'cap', hatColor: '#ffffff', sit: 0.22, moving: ['head'], armPose: { L: [-1.1, 0, 0.1], R: [-1.1, 0, -0.1] } });
    pl.root.position.set(-0.1, 0.55, -0.3); pl.root.rotation.y = Math.PI / 2; pl.root.scale.setScalar(0.92); g.add(pl.root);
    anims.push((dt, t) => { pl.head.rotation.y = Math.sin(t * 0.35 + 4) * 0.5; });
    marks = waterMarks(g, 2.95, 1.2, -2.8);
  }
  const hull = vcMerge(fixed); g.add(hull);
  g.userData.speed = 0; g.userData.rowing = false;
  let last = performance.now() / 1000;
  hull.onBeforeRender = () => {                                                               // anima só quando aparece na tela
    const t = performance.now() / 1000, dt = Math.min(0.1, t - last); last = t;
    const sp = g.userData.speed, rowing = g.userData.rowing;
    for (const f of anims) f(dt, t, sp, rowing);
    marks(t, sp);
  };
  g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** Gente nas mesas das praças e do café (Veneza): cada pessoa sentada numa cadeira (`seats`: x, z, ângulo para a mesa,
 *  vizinho de mesa), conversando com quem está junto — olha para ele, acena com a cabeça, gesticula, toma um gole — ou
 *  olhando o movimento; cada uma no seu tempo (nada sincronizado). `waiters`: garçons que saem pela porta da frente do
 *  café, param ao lado de duas mesas e voltam (caminho reto e livre, em `path`). Só a cabeça e um braço mexem (o resto
 *  é assado com o cenário); a animação roda quando a pessoa aparece na tela. */
export function cafeLife(g, seats, waiters) {
  let n = 0;
  const T = () => performance.now() / 1000;
  for (const s of seats) {
    const look = VEN_LOOKS[(n * 5 + 3) % VEN_LOOKS.length], drinks = n % 3 === 0, ph = n * 1.37 + (n % 5) * 0.61, k = n++;
    const f = buildFigure({ ...look, sit: s.sit || 0.65, moving: drinks ? ['head', 'armR'] : ['head'] });
    f.root.position.set(s.x, 0.15, s.z); f.root.rotation.y = s.face; g.add(f.root);
    const pal = s.mate == null ? null : Math.atan2(Math.sin(s.mate - s.face), Math.cos(s.mate - s.face));   // virar a cabeça para o vizinho
    f.head.children[0].castShadow = false;
    let cup = null;
    if (drinks) { cup = new THREE.Group(); cup.add(at(cyl(0.08, 0.06, 0.16, k % 2 ? '#f2efe6' : '#c97a3a', 8), 0, -0.6, 0.06)); f.armR.add(cup); f.armR.children[0].castShadow = false; }
    const rate = 0.8 + (k % 7) * 0.06;
    f.head.children[0].onBeforeRender = () => {
      const t = T() * rate + ph;
      const talk = pal != null && Math.sin(t * 0.21) > -0.25;                                  // fase de conversa ou de olhar em volta
      const yaw = talk ? Math.max(-1.1, Math.min(1.1, pal)) * 0.85 + Math.sin(t * 0.9) * 0.08 : Math.sin(t * 0.23) * 0.75 + Math.sin(t * 0.61) * 0.2;
      f.head.rotation.y += (yaw - f.head.rotation.y) * 0.08;
      f.head.rotation.x = talk ? Math.max(0, Math.sin(t * 2.3)) * 0.12 : 0.05;               // acena com a cabeça ao falar
      f.body.rotation.x = talk ? 0.1 + Math.sin(t * 0.5) * 0.04 : 0.02;
      if (drinks) {                                                                          // gole de vez em quando; senão, gesto ao falar ou mão na mesa
        const sip = Math.max(0, Math.sin(t * 0.27 + 1.3) - 0.86) * 7.1, gest = talk ? Math.max(0, Math.sin(t * 1.3)) * 0.35 : 0;
        f.armR.rotation.set(-0.95 - sip * 1.15 - gest, 0, 0.12 + gest * 0.4 - sip * 0.25);
      }
    };
  }
  for (const w of waiters) {                                                                 // garçom: avental branco, bandeja na mão
    const f = buildFigure({ shirt: '#f4f1ea', pants: '#1d1d22', hair: '#2a1d14', apron: '#ffffff', moving: ['legL', 'legR', 'armL', 'head'] });
    dynamic(f.root); g.add(f.root);
    const tray = new THREE.Group(); tray.add(at(cyl(0.34, 0.34, 0.04, '#c0c0c0', 12), 0, -0.56, 0.22), at(cyl(0.07, 0.05, 0.14, '#f2efe6', 8), 0.08, -0.47, 0.25));
    f.armL.add(tray);
    const P = w.path, seg = [];
    let tot = 0;
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b.x - a.x, b.z - a.z); seg.push({ a, b, L, t0: tot, pause: a.pause || 0 }); tot += a.pause + L / 1.1; }
    const off = w.offset || 0;
    f.body.children[0].onBeforeRender = () => {
      const tt = (T() + off) % tot;
      let s = seg[seg.length - 1];
      for (const q of seg) if (tt >= q.t0) s = q;
      const into = tt - s.t0, walking = into > s.pause, u = walking ? Math.min(1, (into - s.pause) * 1.1 / s.L) : 0;
      const x = s.a.x + (s.b.x - s.a.x) * u, z = s.a.z + (s.b.z - s.a.z) * u;
      f.root.position.set(x, 0.15, z);
      const want = walking ? Math.atan2(s.b.x - s.a.x, s.b.z - s.a.z) : (s.a.face ?? f.root.rotation.y);
      f.root.rotation.y += Math.atan2(Math.sin(want - f.root.rotation.y), Math.cos(want - f.root.rotation.y)) * 0.12;
      const sw = walking ? Math.sin((into - s.pause) * 1.1 / 0.62 * Math.PI) : 0;            // um passo a cada 0,62
      f.legL.rotation.x = sw * 0.45; f.legR.rotation.x = -sw * 0.45;
      f.armL.rotation.set(-1.45 + sw * 0.04, 0, -0.1);
      f.head.rotation.y = walking ? 0 : Math.sin(tt * 0.7) * 0.35;
      f.body.position.y = (f.body.userData.y0 ??= f.body.position.y) + Math.abs(sw) * 0.03;
    };
  }
}

/** Horizonte da laguna (para o cenário de Veneza): ilhas baixas ao longe com casinhas coloridas, campanários e ciprestes,
 *  e os Alpes nevados bem no fundo. Acompanha a câmera como o sol (nunca se chega lá) e some na neblina fechada das cenas;
 *  uma malha só, sem névoa (o "ar" já vem pintado nas cores). */
export function buildLagoonHorizon() {
  let s = 4321; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const COLS = ['#c8693f', '#d9a441', '#efe0bd', '#d99a94', '#a8432e', '#e8c23a', '#5a86c4', '#5f9a5f', '#e9dcc6'];
  const parts = [], M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  const put = (geo, color, haze, x, y, z, a, cx, cz) => {                // peça local da ilha → mundo (girada com a ilha)
    geo.translate(x, y, z); M.compose(new THREE.Vector3(cx, 0, cz), Q.setFromAxisAngle(Y, a), new THREE.Vector3(1, 1, 1)); geo.applyMatrix4(M);
    parts.push(hazeGeo(geo, color, haze));
  };
  const N = 14;
  for (let k = 0; k < N; k++) {
    const a = (k + r() * 0.7) / N * Math.PI * 2, R = 520 + r() * 220, haze = 0.3 + (R - 520) / 220 * 0.12;
    const cx = Math.cos(a) * R, cz = Math.sin(a) * R, ry = -a + Math.PI / 2, len = 50 + r() * 90, deep = 16 + r() * 14;
    put(new THREE.BoxGeometry(len, 1.8, deep), '#a39a86', haze, 0, 0.3, 0, ry, cx, cz);                            // cais de pedra
    const kind = k % 4;                                                                                                // 0 Burano (colorida), 1 com campanário, 2 cemitério (ciprestes), 3 ilha comum
    if (kind === 2) {
      put(new THREE.BoxGeometry(len, 4, 0.8), '#c9b9a0', haze, 0, 3, deep / 2 - 0.5, ry, cx, cz);                     // muro
      for (let x = -len / 2 + 5; x < len / 2 - 4; x += 6 + r() * 3) put(new THREE.ConeGeometry(2.2, 14 + r() * 6, 5), '#2f5a3a', haze, x, 8, (r() - 0.5) * deep * 0.6, ry, cx, cz);
      put(new THREE.BoxGeometry(10, 9, 8), '#e8dcc4', haze, -len / 4, 5, 0, ry, cx, cz); put(new THREE.ConeGeometry(5.5, 5, 4), '#b5532f', haze, -len / 4, 11.6, 0, ry, cx, cz);
      continue;
    }
    for (let x = -len / 2 + 4; x < len / 2 - 3;) {                                                                    // fileira de casas (frente para fora)
      const w = 4 + r() * 4, h = 7 + r() * (kind === 0 ? 5 : 9), d = 7 + r() * 5, col = kind === 0 ? COLS[Math.floor(r() * COLS.length)] : ['#efe0bd', '#d9c9a8', '#d8b08a', '#c8693f'][Math.floor(r() * 4)];
      put(new THREE.BoxGeometry(w, h, d), col, haze, x + w / 2, h / 2 + 1, -deep / 2 + d / 2 + 1, ry, cx, cz);
      put(new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6), '#b5532f', haze, x + w / 2, h + 1.4, -deep / 2 + d / 2 + 1, ry, cx, cz);
      x += w + 0.15;
    }
    if (kind === 1 || (kind === 0 && r() < 0.5)) {                                                                    // campanário (às vezes torto, como em Burano)
      const x = (r() - 0.5) * len * 0.5, H = 40 + r() * 18, lean = kind === 0 ? 0.05 : 0;
      const t = new THREE.BoxGeometry(5, H, 5); t.translate(0, H / 2, 0); t.rotateZ(lean); put(t, '#a8573a', haze, x, 1, -deep / 2 + 4, ry, cx, cz);
      const p = new THREE.ConeGeometry(4, 9, 4); p.rotateY(Math.PI / 4); p.translate(0, H + 4.5, 0); p.rotateZ(lean); put(p, '#8a8f8c', haze, x, 1, -deep / 2 + 4, ry, cx, cz);
    }
  }
  const m = horizonRing([
    { N: 30, R: 1300, h: [70, 135], b: [140, 230], shape: 'cone', base: '#8a9ab0', top: '#f4f8fb', topK: 0.45, haze: 0.55 },   // os Alpes, bem longe
  ], 2024, 'lagoon-horizon', parts);
  return m;
}
