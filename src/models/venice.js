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

/** Barcos que circulam (frente = +X; main.js os move pelos canais): 0 gôndola com um casal passeando, 1 barca de frutas e
 *  verduras com o barqueiro no leme, 2 gôndola só com o gondoleiro voltando, 3 táxi aquático de madeira envernizada.
 *  O casco e o que não mexe são uma malha só; o gondoleiro rema no ritmo do quanto o barco anda (parado, ele espera
 *  apoiado no remo) e as pessoas olham em volta, cada uma no seu tempo. */
export function buildBoatNpc(k) {
  const g = new THREE.Group(), fixed = new THREE.Group(), ph = k * 2.3;
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => fixed.add(at(m, x, y, z, rx, ry, rz));
  const anims = [];
  if (k === 0 || k === 2) {                                                                   // gôndola
    const BLK = '#17171b';
    a(box(4.4, 0.5, 1.3, BLK), 0, 0.1, 0); a(box(4.0, 0.06, 1.1, '#5a3a22'), 0, 0.33, 0);
    a(box(1.4, 0.42, 0.95, BLK), 2.75, 0.32, 0, 0, 0, 0.32); a(box(1.0, 0.3, 0.55, BLK), 3.55, 0.72, 0, 0, 0, 0.62);   // proa subindo
    a(box(0.08, 0.95, 0.34, '#d9d9d9'), 4.0, 1.25, 0, 0, 0, -0.12);                       // ferro da proa
    for (let t = 0; t < 6; t++) a(box(0.24, 0.05, 0.3, '#d9d9d9'), 3.9 - 0.02 * t, 0.9 + t * 0.13, 0);
    a(box(1.3, 0.42, 0.95, BLK), -2.7, 0.32, 0, 0, 0, -0.3); a(box(0.7, 0.26, 0.5, BLK), -3.4, 0.62, 0, 0, 0, -0.6);    // popa
    a(box(0.32, 0.6, 0.18, '#5a3a22'), -1.65, 0.62, 0.52); a(box(0.08, 0.18, 0.22, '#5a3a22'), -1.65, 0.98, 0.52);   // forcola (apoio do remo)
    a(box(1.0, 0.32, 1.0, '#8a2a2a'), 0.25, 0.5, 0); a(box(0.18, 0.62, 1.0, '#8a2a2a'), -0.22, 0.78, 0);          // banco de veludo
    for (const sd of [-1, 1]) a(box(1.0, 0.08, 0.08, '#c9a441'), 0.25, 0.7, sd * 0.5);
    const gl = buildFigure({ shirt: '#f6f4ee', stripes: '#1f3a68', pants: '#1d1d22', band: '#c8402f', hat: 'gondolier', hair: k ? '#2a1d14' : '#6b4428', moving: ['armL', 'armR', 'head'] });
    gl.root.position.set(-2.45, 0.38, -0.05); gl.root.rotation.y = Math.PI / 2; g.add(gl.root);
    const oar = new THREE.Group(); oar.position.set(-1.65, 1.02, 0.52); g.add(oar);           // remo apoiado na forcola
    oar.add(vcMerge(new THREE.Group().add(at(cyl(0.04, 0.04, 4.2, '#c9a46a', 5), 0, 0, 0, 0, 0, 1.15), at(box(0.06, 0.62, 0.16, '#c9a46a'), 1.85, -0.85, 0, 0, 0, 1.15))));
    for (const arm of [gl.armL, gl.armR]) arm.rotation.set(-1.0, 0, 0);
    anims.push((dist, t, rowing) => {
      const st = dist / 3.4 * Math.PI * 2;                                            // uma remada a cada 3,4 de caminho
      const sw = rowing ? Math.sin(st) : Math.sin(t * 0.6 + ph) * 0.15;
      oar.rotation.y = sw * 0.32; oar.rotation.x = (rowing ? Math.max(0, Math.cos(st)) : 0) * 0.08;
      gl.body.rotation.x = 0.12 + sw * 0.16;                                             // inclina para empurrar e volta
      gl.armL.rotation.x = -1.0 - sw * 0.35; gl.armR.rotation.x = -0.85 - sw * 0.35;
      gl.armL.rotation.z = -0.35; gl.armR.rotation.z = 0.5;
      gl.head.rotation.y = Math.sin(t * 0.27 + ph) * 0.45;
    });
    if (k === 0) {                                                                         // casal passeando no banco de veludo
      const p1 = buildFigure({ shirt: '#e9dcc6', pants: '#3d4a66', hair: '#3a2a1a', hat: 'straw', sit: 0.32, moving: ['head'] });
      const p2 = buildFigure({ shirt: '#d99a94', pants: '#2f3b52', hair: '#8a5a36', longHair: true, sit: 0.32, moving: ['head', 'armR'] });
      for (const [p, z] of [[p1, -0.25], [p2, 0.25]]) { p.root.position.set(0.18, 0.62 - 0.34, z); p.root.rotation.y = Math.PI / 2; p.root.scale.setScalar(0.9); g.add(p.root); }
      anims.push((dist, t) => {
        p1.head.rotation.y = Math.sin(t * 0.33 + 1) * 0.6; p2.head.rotation.y = Math.sin(t * 0.41) * 0.5 - 0.2;
        const snap = Math.max(0, Math.sin(t * 0.21) - 0.8) * 5;                              // de vez em quando aponta alguma coisa
        p2.armR.rotation.set(-snap * 1.5, 0, 0.1 + snap * 0.2);
      });
    }
  } else if (k === 1) {                                                                       // barca de frutas e verduras
    a(box(4.4, 0.7, 2.0, '#3f6a4a'), 0, 0.1, 0); a(box(4.45, 0.12, 2.05, '#e8dfcc'), 0, 0.48, 0);
    const bow = new THREE.Shape(); bow.moveTo(0, -1.0); bow.lineTo(1.0, 0); bow.lineTo(0, 1.0); bow.lineTo(0, -1.0);
    const bg = new THREE.ExtrudeGeometry(bow, { depth: 0.7, bevelEnabled: false }); bg.rotateX(-Math.PI / 2); bg.translate(2.2, -0.25, 0);
    fixed.add(new THREE.Mesh(bg, mat('#3f6a4a')));
    a(box(3.0, 0.06, 1.7, '#7a5434'), 0.3, 0.46, 0);
    const FR = [['#ff8c1a', 'orange'], ['#e8312f', 'tomato'], ['#7bc950', 'greens'], ['#ffd23f', 'lemon'], ['#8a3a8a', 'grapes'], ['#7bc950', 'greens']];
    FR.forEach(([c], i) => {                                                                // caixotes com frutas e verduras
      const x = -0.6 + (i % 3) * 0.95, z = i < 3 ? -0.45 : 0.45;
      a(box(0.85, 0.42, 0.75, '#b8804a'), x, 0.7, z); for (let q = 0; q < 4; q++) a(sphere(0.17, c, 6, 4), x - 0.22 + (q % 2) * 0.44, 0.95, z - 0.17 + (q > 1 ? 0.34 : 0));
    });
    a(box(0.08, 1.3, 0.08, '#5a3a22'), 1.55, 1.1, 0); a(box(1.2, 0.05, 0.9, '#c8402f'), 1.2, 1.75, 0, 0, 0, -0.15);   // toldinho na proa
    a(box(0.5, 0.5, 0.5, '#3a3a3a'), -2.2, 0.55, 0); a(box(0.6, 0.06, 0.06, '#5a3a22'), -1.85, 0.95, 0.15, 0, 0.4, 0);   // motor de popa e cana do leme
    const bm = buildFigure({ shirt: '#3a78d4', pants: '#3d4a66', hair: '#d8d4cc', hat: 'cap', hatColor: '#1f3a68', apron: '#e7d3a8', moving: ['head', 'armL'] });
    bm.root.position.set(-1.6, 0.48, -0.25); bm.root.rotation.y = Math.PI / 2; g.add(bm.root);
    bm.armL.rotation.set(-0.5, 0, -0.2);
    anims.push((dist, t) => { bm.head.rotation.y = Math.sin(t * 0.25 + 2) * 0.7; bm.armL.rotation.x = -0.5 + Math.sin(t * 0.8) * 0.05; });
  } else {                                                                                    // táxi aquático (madeira envernizada)
    a(box(4.2, 0.7, 1.9, '#8a4f2a'), 0, 0.1, 0);
    const bow = new THREE.Shape(); bow.moveTo(0, -0.95); bow.lineTo(1.2, 0); bow.lineTo(0, 0.95); bow.lineTo(0, -0.95);
    const bg = new THREE.ExtrudeGeometry(bow, { depth: 0.7, bevelEnabled: false }); bg.rotateX(-Math.PI / 2); bg.translate(2.1, -0.25, 0);
    fixed.add(new THREE.Mesh(bg, mat('#8a4f2a')));
    a(box(4.25, 0.08, 1.95, '#f1e6cf'), 0, 0.47, 0);
    for (let x = -1.8; x < 2; x += 0.45) a(box(0.04, 0.02, 1.7, '#6b3a1e'), x, 0.52, 0);   // frisos do convés
    a(box(1.5, 0.75, 1.6, '#f1e6cf'), -1.15, 0.88, 0); a(box(1.55, 0.06, 1.65, '#8a4f2a'), -1.15, 1.28, 0);   // cabine baixa (atrás)
    for (const sd of [-1, 1]) a(box(1.1, 0.32, 0.04, '#2b3d52'), -1.15, 0.98, sd * 0.81);
    a(box(0.5, 0.5, 0.6, '#8a4f2a'), 0.55, 0.75, -0.35); a(cyl(0.2, 0.2, 0.04, '#2b2b2b', 10), 0.42, 1.1, -0.35, 0, 0, 1.1);   // painel e volante
    a(box(0.06, 0.4, 1.5, '#9fc3d6'), 0.95, 1.12, 0, 0, 0, -0.35);                          // para-brisa
    for (const sd of [-1, 1]) a(box(3.6, 0.06, 0.06, '#d9d9d9'), 0.2, 0.62, sd * 0.97);     // frisos cromados
    const pl = buildFigure({ shirt: '#ffffff', pants: '#1d2a3a', hair: '#3a2a1a', hat: 'cap', hatColor: '#ffffff', moving: ['head'] });
    pl.root.position.set(0.0, 0.48, -0.35); pl.root.rotation.y = Math.PI / 2; pl.root.scale.setScalar(0.92); g.add(pl.root);
    anims.push((dist, t) => { pl.head.rotation.y = Math.sin(t * 0.35 + 4) * 0.5; });
  }
  const hull = vcMerge(fixed); g.add(hull);
  let lx = null, lz = 0, dist = 0, still = 0;
  hull.onBeforeRender = () => {                                                               // anima só quando aparece na tela
    const x = g.position.x, z = g.position.z, step = lx === null ? 0 : Math.hypot(x - lx, z - lz);
    lx = x; lz = z; dist += step; still = step > 0.001 ? 0 : still + 1;
    const t = performance.now() / 1000;
    for (const f of anims) f(dist, t, still < 10);
  };
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
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
