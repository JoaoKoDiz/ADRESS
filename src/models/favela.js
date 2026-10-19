// Nível 13 (Morro): casas de laje (destinos de entrega), casas de enchimento e o cenário fixo do morro: faixas de altura
// com muros de contenção, rua sinuosa, ladeiras, escadarias, vagas, becos, mercadinho, pracinha e quadra; a vida nas lajes
// (pipa, varal, cadeira com radinho, churrasquinho) e o entorno: o casario que desce, a cidade lá embaixo e os morros do horizonte.
// Estilo do jogo: caixas simples, cores chapadas. A colisão fica em layout.js; a altura do chão em favelaPlan.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, sphere, at, mat, bakeStatic, textTexture, dynamic, vcMerge } from './kit.js';
import { buildFigure } from '../grillbyInside.js';
import { horizonRing } from './snow.js';
import { FAV_FACADE, FAV_AWNING } from '../data.js';
import { FAV } from '../favelaPlan.js';
import { MAP } from '../layout.js';

export const FAV_FLOOR = 2.8;
const SLAB = '#a7a39b', WIN = '#2d3640', FRAME = '#e9e2d2', DOOR = '#6a4a2c', TANK = '#1f78d1', MORTAR = '#d9b49a';
const ASPHALT = '#5d6470', CONC = '#b3a993', WALLC = '#9a9285', CAP = '#cfc6b4', ALLEY = '#d2c8b4', STEP = '#c9bfab';

/** Medidas de uma casa do Morro (a planta cabe em 6.4 × 6.4; com escada lateral, a casa é mais estreita). */
export function favSize(h) {
  const st = h.items.includes('stairs');
  return { w: st ? 5.0 : 5.6 + (h.index % 3) * 0.35, d: 5.4 + (h.index % 2) * 0.6, n: h.floors, st };
}

/** Casa de laje, centrada na origem, frente para +Z. */
export function buildFavelaLot(h) {
  const root = new THREE.Group(); root.name = 'fav:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const { w, d, n, st } = favSize(h), col = FAV_FACADE[h.fac], H = n * FAV_FLOOR, ox = st ? -0.6 : 0;
  const brick = h.fac === 'brick';
  // andares (o de cima às vezes um pouco recuado: a casa "cresceu" aos poucos)
  for (let f = 0; f < n; f++) {
    const inset = f > 0 && (h.index + f) % 3 === 0 ? 0.35 : 0;
    add(box(w - inset, FAV_FLOOR, d - inset, col), ox, FAV_FLOOR * (f + 0.5), -inset / 2);
    add(box(w + 0.1, 0.16, d + 0.1, SLAB), ox, FAV_FLOOR * (f + 1) - 0.02, 0);          // laje de cada andar
    if (brick) for (let k = 1; k < 6; k++) add(box(w - inset + 0.02, 0.05, 0.04, MORTAR), ox, FAV_FLOOR * f + k * 0.46, d / 2 - inset + 0.01);
    // janelas da frente (1 ou 2 por andar) com moldura
    const wins = f === 0 ? [w * 0.28] : (h.index + f) % 2 ? [-w * 0.24, w * 0.24] : [0];
    for (const x of wins) {
      add(box(1.15, 1.0, 0.08, FRAME), ox + x, FAV_FLOOR * f + 1.6, d / 2 + 0.03);
      add(box(0.95, 0.82, 0.1, WIN), ox + x, FAV_FLOOR * f + 1.6, d / 2 + 0.05);
    }
    if (f > 0) add(box(0.9, 0.7, 0.08, WIN), ox + (w / 2 + 0.03) * (f % 2 ? 1 : -1), FAV_FLOOR * f + 1.6, 0, 0, Math.PI / 2, 0);   // janela lateral
  }
  // porta
  add(box(1.05, 2.05, 0.1, DOOR), ox - w * 0.2, 1.03, d / 2 + 0.05);
  add(box(1.3, 0.14, 0.5, CAP), ox - w * 0.2, 0.07, d / 2 + 0.25);                     // degrau
  // mureta da laje (parapeito baixo) e ferros de espera nos cantos
  const yT = H + 0.06;
  for (const [x, z, ww, dd] of [[0, d / 2, w, 0.16], [0, -d / 2, w, 0.16], [-w / 2, 0, 0.16, d], [w / 2, 0, 0.16, d]]) add(box(ww, 0.5, dd, SLAB), ox + x, yT + 0.25, z);
  if (h.index % 2 === 0) for (const [x, z] of [[-1, -1], [1, -1]]) add(box(0.06, 0.9, 0.06, '#5a3b2c'), ox + x * (w / 2 - 0.2), yT + 0.45, z * (d / 2 - 0.2));
  // caixas-d'água azuis (grandes, bem visíveis na laje)
  for (let k = 0; k < h.tanks; k++) {
    const x = ox + (h.tanks === 1 ? w * 0.18 : (k ? 1 : -1) * w * 0.22), z = -d * 0.18;
    add(cyl(0.8, 0.72, 1.25, TANK, 14), x, yT + 0.65, z);
    add(cyl(0.86, 0.86, 0.14, '#3d8fe0', 14), x, yT + 1.33, z);
  }
  // varal na laje: postes, corda e roupas coloridas (na casa em que alguém está estendendo roupa, elas balançam)
  const life = (h.index * 5 + 2) % 12, hanging = life === 1 && h.items.includes('laundry');   // (gente em uma laje a cada três)
  let clothes = null;
  if (h.items.includes('laundry')) {
    const z = d / 2 - 0.9;
    for (const s of [-1, 1]) add(box(0.1, 1.9, 0.1, '#6b6b6b'), ox + s * (w / 2 - 0.35), yT + 0.95, z);
    add(box(w - 0.7, 0.04, 0.04, '#eeeeee'), ox, yT + 1.85, z);
    const cl = new THREE.Group();
    ['#e84a5f', '#ffd23f', '#3fa7d6', '#ffffff', '#7bc950'].forEach((c, i) => {
      const x = -w / 2 + 0.75 + i * (w - 1.5) / 4;
      cl.add(at(box(0.7, i % 2 ? 0.9 : 0.65, 0.05, c), x, -(i % 2 ? 0.47 : 0.35), 0));
    });
    if (hanging) { clothes = dynamic(new THREE.Group()); clothes.position.set(ox, yT + 1.85, z); clothes.add(vcMerge(cl)); root.add(clothes); }
    else { cl.position.set(ox, yT + 1.85, z); root.add(cl); }
  }
  // vasos com plantas dos dois lados da porta
  if (h.items.includes('pots')) for (const s of [-1, 1]) {
    const x = ox - w * 0.2 + s * 1.05;
    add(cyl(0.34, 0.26, 0.55, '#b5532f', 8), x, 0.28, d / 2 + 0.45);
    add(sphere(0.48, '#3f8f3a', 7, 5), x, 0.85, d / 2 + 0.45);
  }
  // toldo sobre a porta
  if (h.awning) {
    const c = FAV_AWNING[h.awning];
    add(box(2.4, 0.12, 1.3, c), ox - w * 0.2, 2.45, d / 2 + 0.6, 0.32, 0, 0);
    for (let k = -1; k <= 1; k++) add(box(0.7, 0.32, 0.05, k % 2 ? c : '#ffffff'), ox - w * 0.2 + k * 0.8, 2.15, d / 2 + 1.22);
  }
  // escada externa até a laje (na lateral direita), com corrimão
  if (st) {
    const sx = ox + w / 2 + 0.6, nSt = Math.round(H / 0.32), run = d - 0.4;
    for (let k = 0; k < nSt; k++) {
      const y = (k + 1) * H / nSt;
      add(box(1.1, 0.16, run / nSt + 0.05, STEP), sx, y - 0.08, d / 2 - 0.2 - (k + 0.5) * run / nSt);
    }
    add(box(0.08, 0.08, Math.hypot(H, run), '#8a8a8a'), sx + 0.55, H / 2 + 0.9, 0, Math.atan2(H, run), 0, 0);   // corrimão
    add(box(1.1, 0.16, 0.9, STEP), sx, H - 0.08, -d / 2 + 0.25);
  }
  const anim = lajeLife(root, h, life, { w, d, ox, yT, clothes });
  bakeStatic(root);
  if (anim) root.userData.update = (t, dt) => { if (root.visible) anim(t, dt); };
  return root;
}

// gente de laje (as mesmas proporções dos moradores; roupas leves de calor)
const LAJE_LOOKS = [
  { shirt: '#f2d34f', pants: '#2f4a6e', hair: '#2a1d14', skin: '#8d5a3b' }, { shirt: '#3fa7d6', pants: '#e8e2d4', hair: '#1d1d1f', skin: '#c98d62' },
  { shirt: '#e84a5f', pants: '#3d4a66', hair: '#5a3a22', skin: '#f0c49a', longHair: true }, { shirt: '#ffffff', stripes: '#2f9a4a', pants: '#3a3a3a', hair: '#1d1d1f', skin: '#6b4430' },
  { shirt: '#7bc950', pants: '#5a4a3a', hair: '#3a2a1a', skin: '#b07850', hat: 'cap', hatColor: '#d23a2e' },
];
/** Vida na laje (uma em cada três casas, cada uma no seu tempo): menino soltando pipa, alguém estendendo roupa, um
 *  senhor na cadeira de plástico com o radinho, churrasquinho com fumaça. O que não mexe vai junto com a casa (assado). */
function lajeLife(root, h, life, { w, d, ox, yT, clothes }) {
  const ph = h.index * 1.13, look = LAJE_LOOKS[h.index % LAJE_LOOKS.length];
  if (life === 0) {                                                                         // menino soltando pipa
    const f = buildFigure({ ...look, kid: true, pants: '#2f4a6e', hat: null, longHair: false, moving: ['armR'], headPose: { x: -0.5 } });
    f.root.position.set(ox + w * 0.18, yT, d * 0.12); f.root.rotation.y = Math.PI; root.add(f.root);
    const kite = dynamic(new THREE.Group()), kg = new THREE.Group(), KC = ['#e8312f', '#ffd23f', '#2f6fb0', '#2f9a4a', '#ff8c1a'][h.index % 5];
    const dia = box(0.95, 0.95, 0.05, KC); dia.rotation.z = Math.PI / 4; dia.scale.set(1, 1.35, 1); kg.add(dia);
    kg.add(at(box(0.05, 1.3, 0.06, '#f4f1ea'), 0, 0, 0.03), at(box(1.3, 0.05, 0.06, '#f4f1ea'), 0, 0.12, 0.03));
    for (let q = 0; q < 5; q++) kg.add(at(box(0.18, 0.12, 0.03, q % 2 ? '#ffffff' : KC), 0.05 * q, -1.0 - q * 0.38, 0, 0, 0, 0.3 * (q % 2 ? 1 : -1)));   // rabiola
    kite.add(vcMerge(kg)); root.add(kite);
    const line = dynamic(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), mat('#f4f1ea'))); line.castShadow = false; root.add(line);
    const hand = new THREE.Vector3(), kp = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1), dir = new THREE.Vector3();
    return t => {
      kite.position.set(ox + w * 0.18 + Math.sin(t * 0.45 + ph) * 3.2, yT + 13 + Math.sin(t * 0.7 + ph) * 1.2, -9 + Math.cos(t * 0.38 + ph) * 1.5);
      kite.rotation.set(0.25, Math.sin(t * 0.45 + ph) * 0.3, Math.sin(t * 1.3 + ph) * 0.25);
      f.armR.rotation.set(-2.25 + Math.sin(t * 1.6 + ph) * 0.12, 0, 0.25);                  // puxa a linha de vez em quando
      root.worldToLocal(f.armR.localToWorld(hand.set(0, -0.55, 0)));                       // (matrizes do quadro anterior: o desenho as atualiza)
      kp.copy(kite.position); dir.subVectors(kp, hand); const L = dir.length();
      line.position.addVectors(hand, kp).multiplyScalar(0.5); line.scale.set(1, 1, L); line.quaternion.setFromUnitVectors(Z, dir.normalize());
    };
  }
  if (life === 1 && clothes) {                                                              // estendendo roupa no varal
    const f = buildFigure({ ...look, longHair: true, moving: ['armL', 'armR'], headPose: { x: -0.25 } });
    f.root.position.set(ox + w * 0.12, yT, d / 2 - 1.5); root.add(f.root);
    return t => {
      const k = Math.sin(t * 1.1 + ph);
      f.armL.rotation.set(-2.5 - k * 0.15, 0, -0.15); f.armR.rotation.set(-2.6 + k * 0.15, 0, 0.15);
      clothes.rotation.x = -0.04 - Math.max(0, Math.sin(t * 1.2 + ph) * 0.6 + Math.sin(t * 2.9 + ph) * 0.25) * 0.25;
    };
  }
  if (life === 1 || life === 2) {                                                           // senhor na cadeira de plástico com o radinho
    const cx = ox - w * 0.2, cz = d * 0.1, add = (m, x, y, z) => root.add(at(m, cx + x, yT + y, cz + z));
    add(box(0.62, 0.07, 0.6, '#d23a2e'), 0, 0.45, 0); add(box(0.62, 0.55, 0.07, '#d23a2e'), 0, 0.75, -0.28);   // cadeira de plástico vermelha (de bar)
    for (const [x, z] of [[-0.27, -0.25], [0.27, -0.25], [-0.27, 0.25], [0.27, 0.25]]) add(box(0.05, 0.45, 0.05, '#b8302a'), x, 0.22, z);
    add(box(0.36, 0.22, 0.14, '#2b2b2b'), 0.55, 0.11, 0.1); add(cyl(0.05, 0.05, 0.02, '#c8c8c8', 8), 0.55, 0.15, 0.18);
    const f = buildFigure({ ...look, hair: '#d8d4cc', sit: 0.47, moving: ['head'] });
    f.root.position.set(cx, yT, cz - 0.05); root.add(f.root);
    return t => { f.head.rotation.x = Math.abs(Math.sin(t * 3.4 + ph)) * 0.08; f.head.rotation.y = Math.sin(t * 0.22 + ph) * 0.4; };   // balança a cabeça no ritmo do rádio
  }
  if (life === 3) {                                                                         // churrasquinho na laje
    const gx = ox - w * 0.18, gz = d * 0.15, add = (m, x, y, z) => root.add(at(m, gx + x, yT + y, gz + z));
    add(box(0.9, 0.3, 0.5, '#2b2b2b'), 0, 0.75, 0); add(box(0.86, 0.04, 0.46, '#d24a1a', { emissive: '#ff5a1a', emissiveIntensity: 0.6 }), 0, 0.91, 0);
    for (const [x, z] of [[-0.38, -0.18], [0.38, -0.18], [-0.38, 0.18], [0.38, 0.18]]) add(box(0.05, 0.6, 0.05, '#4a4a4a'), x, 0.3, z);
    for (let q = 0; q < 3; q++) add(box(0.5, 0.05, 0.05, '#8a5a36'), -0.2 + q * 0.2, 0.96, 0, 0, 0.3, 0);   // espetinhos
    const f = buildFigure({ ...look, apron: '#f4f1ea', moving: ['armR'], headPose: { x: 0.3 } });
    f.root.position.set(gx, yT, gz - 0.75); root.add(f.root);
    const smokeMat = new THREE.MeshLambertMaterial({ color: '#f2f2f2', transparent: true, opacity: 0.3, depthWrite: false });
    const puffs = [0, 1, 2, 3].map(q => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), smokeMat); m.castShadow = false; root.add(dynamic(m)); return m; });
    return t => {
      f.armR.rotation.set(-1.0 + Math.max(0, Math.sin(t * 2.1 + ph)) * 0.45, 0, 0.1);
      puffs.forEach((m, q) => { const u = ((t * 0.32 + q / 4 + ph) % 1); m.position.set(gx + Math.sin(u * 4 + q) * 0.25 + u * 0.6, yT + 1.05 + u * 2.4, gz - u * 0.4); m.scale.setScalar(0.45 + u * 1.5); m.visible = u < 0.92; });
    };
  }
  return null;
}

const FILL = ['#c9b8a6', '#bdb5a6', '#d3cbbb', '#a8b0ad', '#c7a99a', '#b9a58a', '#a9a49b', '#d2c39c', '#b3bfae', '#c6b0b2'];   // tons apagados (as cores vivas são das casas de entrega)
const FILL_FRAME = '#e3dccd', GRILLE = '#4a4a4a', AC = '#e6e4dc';
/** Casa de enchimento (sem entrega): reboco apagado ou bloco cru, laje, janelas com moldura (grade no térreo), porta,
 *  às vezes ar-condicionado, antena ou parabólica, vasos e ferros de espera na laje, caixa-d'água cinza. Tudo assado. */
function filler(g, f, k) {
  const add = (m, x, y, z, ry = 0) => g.add(at(m, x, y, z, 0, ry, 0));
  const w = f.x1 - f.x0, d = f.z1 - f.z0, cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, H = f.floors * FAV_FLOOR, c = FILL[(f.tone + k) % FILL.length];
  const rawTop = f.raw && f.floors > 1;                               // último andar ainda no bloco (obra parada)
  add(box(w, H - (rawTop ? FAV_FLOOR : 0), d, c), cx, f.y + (H - (rawTop ? FAV_FLOOR : 0)) / 2, cz);
  if (rawTop) {
    add(box(w - 0.1, FAV_FLOOR, d - 0.1, '#8e8a83'), cx, f.y + H - FAV_FLOOR / 2, cz);
    for (let y = 0.4; y < FAV_FLOOR; y += 0.4) add(box(w - 0.06, 0.03, d - 0.06, '#7d7973'), cx, f.y + H - FAV_FLOOR + y, cz);   // fiadas dos blocos
  }
  add(box(w + 0.1, 0.16, d + 0.1, SLAB), cx, f.y + H + 0.06, cz);
  // face principal (as janelas ficam numa face qualquer: o casario é virado para todo lado) e uma lateral
  const faces = [[0, 1], [0, -1], [1, 0], [-1, 0]], [fx, fz] = faces[k % 4], [sx, sz] = faces[k % 4 < 2 ? 2 + ((k >> 2) % 2) : (k >> 2) % 2];
  const put = (nx, nz, u, y, ww, hh, dd, col, out = 0.04) => {        // peça na face (nx, nz), deslocada u ao longo dela
    if (nx) add(box(dd, hh, ww, col), nx > 0 ? f.x1 + out : f.x0 - out, y, cz + u);
    else add(box(ww, hh, dd, col), cx + u, y, nz > 0 ? f.z1 + out : f.z0 - out);
  };
  const along = nx => (nx ? d : w);
  for (let fl = 0; fl < f.floors; fl++) {
    if (rawTop && fl === f.floors - 1) continue;                      // (o andar em obra não tem janela pronta)
    const y = f.y + fl * FAV_FLOOR + 1.6, a = along(fx);
    const us = fl === 0 ? [a * 0.2] : a > 5.6 && (k + fl) % 2 ? [-a * 0.24, a * 0.24] : [0];
    for (const u of us) {
      put(fx, fz, u, y, 1.15, 1.0, 0.06, FILL_FRAME, 0.02); put(fx, fz, u, y, 0.95, 0.8, 0.08, WIN, 0.04);
      if (fl === 0) for (const gx of [-0.3, 0, 0.3]) put(fx, fz, u + gx, y, 0.05, 0.82, 0.05, GRILLE, 0.1);   // grade no térreo
    }
    if (fl === 0) { put(fx, fz, -a * 0.24, f.y + 1.03, 1.0, 2.05, 0.08, k % 3 ? DOOR : '#3f5f6a', 0.04); put(fx, fz, -a * 0.24, f.y + 0.06, 1.2, 0.12, 0.4, CAP, 0.2); }
    if ((k + fl) % 3 === 0) { put(sx, sz, 0, y, 1.05, 0.9, 0.06, FILL_FRAME, 0.02); put(sx, sz, 0, y, 0.85, 0.7, 0.08, WIN, 0.04); }
    if (fl > 0 && k % 5 === 1) put(fx, fz, a * 0.36, y - 0.2, 0.75, 0.45, 0.38, AC, 0.19);   // ar-condicionado
  }
  // laje: caixa-d'água, ferros de espera, antena, parabólica, vasos
  const top = f.y + H + 0.14;
  if (f.tank) add(cyl(0.6, 0.55, 0.9, '#8c9196', 10), cx + w * 0.2, top + 0.45, cz - d * 0.15);
  if (f.raw || k % 4 === 2) for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(box(0.06, 0.8, 0.06, '#5a3b2c'), cx + ax * (w / 2 - 0.25), top + 0.4, cz + az * (d / 2 - 0.25));
  if (k % 7 === 2) { add(cyl(0.035, 0.035, 2.2, '#8a8a8a', 5), cx - w * 0.3, top + 1.1, cz + d * 0.2); for (const y of [1.6, 2.0]) add(box(1.1, 0.04, 0.04, '#8a8a8a'), cx - w * 0.3, top + y, cz + d * 0.2); }
  if (k % 7 === 5) { const dish = cyl(0.42, 0.08, 0.18, '#e9e6de', 10); dish.rotation.x = 1.0; add(dish, cx - w * 0.28, top + 0.65, cz - d * 0.28); add(cyl(0.04, 0.04, 0.5, '#8a8a8a', 5), cx - w * 0.28, top + 0.25, cz - d * 0.28); }
  if (k % 6 === 3 && !f.raw) for (const dx of [-0.6, 0.1]) { add(cyl(0.22, 0.17, 0.32, '#b5532f', 7), cx + dx, top + 0.16, cz + d * 0.32); add(sphere(0.32, '#4f9a3a', 6, 4), cx + dx, top + 0.5, cz + d * 0.32); }
}

/** Cenário do Morro (tudo estático). F = plano (favelaPlan.js), MAP e HEDGE do layout. */
export function buildFavelaScene(g, F, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { B1, B2, H1, H2, RW } = FAV, X0 = HEDGE, X1 = MAP - HEDGE;
  const slab = (x0, x1, z0, z1, y0, y1, side = WALLC, top = CONC) => {
    if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
    add(box(x1 - x0, y1 - y0 - 0.06, z1 - z0, side), (x0 + x1) / 2, y0 + (y1 - y0 - 0.06) / 2, (z0 + z1) / 2);
    add(box(x1 - x0, 0.06, z1 - z0, top), (x0 + x1) / 2, y1 - 0.03, (z0 + z1) / 2);
  };
  // faixas do morro: blocos com buracos nas ladeiras/escadarias (no trecho em que elas cortam a faixa)
  const cuts = F.ramps.concat(F.stairs);
  for (const [B, y0, y1] of [[B1, 0, H1], [B2, H1, H2]]) {
    const across = cuts.filter(r => r.z0 < B && r.z1 > B), zc = Math.max(...across.map(r => r.z1));
    slab(X0, X1, zc, MAP - HEDGE, y0, y1);
    let x = X0;
    for (const r of across.sort((a, b) => a.x0 - b.x0)) { slab(x, r.x0 - 0.6, B, zc, y0, y1); x = r.x1 + 0.6; }
    slab(x, X1, B, zc, y0, y1);
    // muro de contenção: faixas horizontais na face e parapeito no alto (aberto nas ladeiras e escadarias)
    let px = X0;
    for (const r of across) {
      if (r.x0 - 0.6 > px) { add(box(r.x0 - 0.6 - px, 0.9, 0.35, CAP), (px + r.x0 - 0.6) / 2, y1 + 0.45, B + 0.18); add(box(r.x0 - 0.6 - px, 0.14, 0.06, '#857d70'), (px + r.x0 - 0.6) / 2, (y0 + y1) / 2, B - 0.02); }
      px = r.x1 + 0.6;
    }
    add(box(X1 - px, 0.9, 0.35, CAP), (px + X1) / 2, y1 + 0.45, B + 0.18);
    add(box(X1 - px, 0.14, 0.06, '#857d70'), (px + X1) / 2, (y0 + y1) / 2, B - 0.02);
    for (let x2 = X0 + 4; x2 < X1; x2 += 9) if (!across.some(r => x2 > r.x0 - 1.5 && x2 < r.x1 + 1.5)) add(box(0.5, y1 - y0, 0.4, '#8f877a'), x2, (y0 + y1) / 2, B - 0.15);   // pilaretes do muro
  }
  // ruas: trechos retos de asfalto + discos nas curvas (a rua faz curvas de verdade, sem grade)
  for (const s of F.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, L = Math.hypot(bx - ax, bz - az), y = F.bandY(s.band) + 0.03;
    add(box(RW, 0.06, L, ASPHALT), (ax + bx) / 2, y, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    for (let t = 2; t < L - 2; t += 4) add(box(0.22, 0.07, 1.4, '#f2d45c'), ax + (bx - ax) * t / L, y + 0.01, az + (bz - az) * t / L, 0, Math.atan2(bx - ax, bz - az), 0);
  }
  for (const r of F.roads) for (const [x, z] of r.pts.slice(1, -1)) add(cyl(RW / 2, RW / 2, 0.06, ASPHALT, 20), x, F.bandY(r.band) + 0.031, z);   // (nas pontas das ladeiras, não)
  // ladeiras (a van sobe): rampa de asfalto, muretas laterais e faixas
  for (const r of F.ramps) {
    const len = Math.hypot(r.z1 - r.z0, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, r.z1 - r.z0), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, y = (r.h0 + r.h1) / 2;
    add(box(r.x1 - r.x0, 0.3, len, ASPHALT), cx, y - 0.12, cz, -ang, 0, 0);
    for (const x of [r.x0 - 0.3, r.x1 + 0.3]) {
      add(box(0.6, Math.max(r.h0, r.h1) + 1, r.z1 - r.z0, WALLC), x, (Math.max(r.h0, r.h1) + 1) / 2 - 0.5 + Math.min(r.h0, r.h1) * 0, cz);
    }
    for (let k = 0.06; k < 0.95; k += 0.12) add(box(0.22, 0.32, 1.3, '#f2d45c'), cx, r.h0 + (r.h1 - r.h0) * k + 0.05, r.z0 + (r.z1 - r.z0) * k, -ang, 0, 0);
    // base sólida embaixo da rampa (para não ver o vão)
    const n = 8;
    for (let k = 0; k < n; k++) { const z0 = r.z0 + (r.z1 - r.z0) * k / n, z1 = r.z0 + (r.z1 - r.z0) * (k + 1) / n, top = r.h0 + (r.h1 - r.h0) * k / n - 0.3;
      if (top - r.h0 > 0.1) add(box(r.x1 - r.x0, top - Math.min(r.h0, 0), z1 - z0, WALLC), cx, (top + Math.min(r.h0, 0)) / 2, (z0 + z1) / 2); }
  }
  // escadarias (só a pé): degraus coloridos de cimento, muretas e corrimão
  for (const st of F.stairs) {
    const n = 20, dz = (st.z1 - st.z0) / n, cx = (st.x0 + st.x1) / 2;
    for (let k = 0; k < n; k++) {
      const top = st.h0 + (st.h1 - st.h0) * (k + 1) / n;
      add(box(st.x1 - st.x0, top - st.h0 + 0.02, dz, k % 2 ? STEP : CAP), cx, st.h0 + (top - st.h0) / 2, st.z0 + dz * (k + 0.5));
    }
    const len = Math.hypot(st.z1 - st.z0, st.h1 - st.h0), ang = Math.atan2(st.h1 - st.h0, st.z1 - st.z0);
    for (const s of [-1, 1]) {
      const x = s < 0 ? st.x0 - 0.3 : st.x1 + 0.3;
      add(box(0.6, st.h1 - st.h0 + 0.8, st.z1 - st.z0, WALLC), x, st.h0 + (st.h1 - st.h0 + 0.8) / 2 - 0.4, (st.z0 + st.z1) / 2);
      add(box(0.12, 0.12, len, '#e8e2d4'), x - s * 0.5, (st.h0 + st.h1) / 2 + 1.0, (st.z0 + st.z1) / 2, -ang, 0, 0);
    }
    sign(g, 'ESCADARIA ▲', cx + 3.8 * 0 + (st.x1 - st.x0) / 2 + 1.6, st.h0, st.z0 - 2.2, '#c8402f');
  }
  // estacionamentos ao pé das escadarias: asfalto e vagas pintadas
  for (const p of F.pads) {
    add(box(p.x1 - p.x0, 0.06, p.z1 - p.z0, ASPHALT), (p.x0 + p.x1) / 2, p.y + 0.035, (p.z0 + p.z1) / 2);
    for (let x = p.x0 + 1.5; x <= p.x1 - 1.4; x += 3.4) add(box(0.16, 0.08, 4.4, '#ffffff'), x, p.y + 0.06, p.z1 - 2.6);
    sign(g, 'P  VAGAS', p.x1 - 1.2, p.y, p.z1 - 0.6, '#2a64c2');
  }
  // becos de cimento entre a rua/vaga e a escadaria
  for (const a of F.alleys) add(box(a.x1 - a.x0, 0.07, a.z1 - a.z0, ALLEY), (a.x0 + a.x1) / 2, a.y + 0.04, (a.z0 + a.z1) / 2);
  // mercadinho: fachada amarela, letreiro, toldo listrado e caixotes de frutas na frente
  {
    const m = F.market, cx = (m.x0 + m.x1) / 2, w = m.x1 - m.x0, dd = m.z1 - m.z0;
    add(box(w, 4.2, dd, '#f4d35e'), cx, 2.1, (m.z0 + m.z1) / 2);
    add(box(w + 0.2, 0.2, dd + 0.2, SLAB), cx, 4.25, (m.z0 + m.z1) / 2);
    add(box(4.2, 2.6, 0.1, '#3a3a3a'), cx, 1.3, m.z1 + 0.05);
    for (let k = 0; k < 8; k++) add(box(w / 8, 0.12, 1.8, k % 2 ? '#ffffff' : '#d23a2e'), m.x0 + w / 16 + k * w / 8, 3.2, m.z1 + 0.85, 0.3, 0, 0);
    const tex = textTexture('MERCADINHO', { width: 512, height: 110, bg: '#2f9a4a', fg: '#ffffff', font: 'bold 68px "Trebuchet MS", sans-serif' });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.9), new THREE.MeshLambertMaterial({ map: tex }));
    add(plate, cx, 4.35 + 0.95 - 0.2 + 0.2, m.z1 + 0.06);
    add(box(9.2, 2.1, 0.12, '#2f9a4a'), cx, 4.45 + 0.6, m.z1 - 0.02);
    for (const [x, c] of [[-4.5, '#ff8c1a'], [-3.3, '#e8312f'], [3.3, '#ffd23f'], [4.5, '#7bc950']]) {
      add(box(1.0, 0.6, 0.8, '#a0703d'), cx + x, 0.3, m.z1 + 0.8);
      for (let k = -1; k <= 1; k++) add(sphere(0.2, c, 6, 4), cx + x + k * 0.28, 0.7, m.z1 + 0.8);
    }
  }
  // pracinha (área de convivência): piso, bancos, árvore, poste e mesa de dominó
  {
    const q = F.square, cx = (q.x0 + q.x1) / 2, cz = (q.z0 + q.z1) / 2, y = q.y;
    add(box(q.x1 - q.x0, 0.16, q.z1 - q.z0, '#cdbf9f'), cx, y + 0.08, cz);
    for (const [x, z, r] of [[-9, -6, 0], [9, -6, 0], [-9, 6, 0], [9, 6, 0], [0, -8, 0]]) {
      add(box(3.2, 0.14, 0.8, '#8a5a36'), cx + x, y + 0.6, cz + z, 0, r, 0);
      add(box(3.2, 0.7, 0.12, '#8a5a36'), cx + x, y + 0.95, cz + z - 0.4, 0, r, 0);
      for (const s of [-1, 1]) add(box(0.14, 0.55, 0.6, '#555555'), cx + x + s * 1.4, y + 0.28, cz + z, 0, r, 0);
    }
    add(cyl(0.35, 0.45, 3.2, '#6b4526', 8), cx, y + 1.6, cz); add(sphere(3.0, '#3f8f3a', 9, 6), cx, y + 4.6, cz);
    add(cyl(1.0, 1.0, 0.1, '#e8e2d4', 12), cx + 5, y + 0.9, cz + 1); add(cyl(0.15, 0.15, 0.85, '#777777', 6), cx + 5, y + 0.45, cz + 1);
    for (const a of [0, 1.6, 3.2, 4.8]) add(cyl(0.35, 0.35, 0.5, '#d23a2e', 8), cx + 5 + Math.cos(a) * 1.5, y + 0.25, cz + 1 + Math.sin(a) * 1.5);
    add(cyl(0.1, 0.12, 4.5, '#4a4a4a', 6), cx - 12, y + 2.25, cz + 8); add(box(0.9, 0.3, 0.5, '#fff3c4'), cx - 12, y + 4.5, cz + 8);
  }
  // quadra: piso verde, linhas brancas, traves e alambrado baixo
  {
    const c = F.court, cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, y = c.y, W = c.x1 - c.x0, D = c.z1 - c.z0;
    add(box(W, 0.12, D, '#3f9a5a'), cx, y + 0.06, cz);
    add(box(W - 2, 0.14, D - 2, '#4fb06a'), cx, y + 0.07, cz);
    for (const [w, d, x, z] of [[W - 2, 0.16, 0, -(D / 2 - 1)], [W - 2, 0.16, 0, D / 2 - 1], [0.16, D - 2, -(W / 2 - 1), 0], [0.16, D - 2, W / 2 - 1, 0], [0.16, D - 2, 0, 0]]) add(box(w, 0.16, d, '#ffffff'), cx + x, y + 0.1, cz + z);
    add(cyl(2.2, 2.2, 0.15, '#ffffff', 20), cx, y + 0.08, cz); add(cyl(2.0, 2.0, 0.17, '#4fb06a', 20), cx, y + 0.09, cz);
    for (const s of [-1, 1]) {
      const x = cx + s * (W / 2 - 1.2);
      for (const z of [-1.5, 1.5]) add(box(0.14, 2.0, 0.14, '#ffffff'), x, y + 1.0, cz + z);
      add(box(0.14, 0.14, 3.1, '#ffffff'), x, y + 2.0, cz);
    }
    for (const [w, d, x, z] of [[W, 0.08, 0, -D / 2], [W, 0.08, 0, D / 2], [0.08, D, -W / 2, 0], [0.08, D, W / 2, 0]]) add(box(w, 1.6, d, '#7d858c'), cx + x, y + 0.8, cz + z);
  }
  // postes com fios emaranhados ao longo das ruas
  // (cada poste fica na calçada, fora do asfalto; fios bem acima da câmera)
  F.roads.forEach((r, ri) => {
    const y = F.bandY(r.band), ps = F.poles[ri];                     // (posições no plano: os bichos também desviam deles)
    for (const [x, z] of ps) { add(cyl(0.14, 0.18, 9, '#7a7a7a', 6), x, y + 4.5, z); add(box(1.4, 0.12, 0.12, '#5a5a5a'), x, y + 8.6, z); }
    for (let i = 0; i < ps.length - 1; i++) {
      const [ax, az] = ps[i], [bx, bz] = ps[i + 1], L = Math.hypot(bx - ax, bz - az);
      for (const o of [-0.3, 0, 0.35]) add(box(0.04, 0.04, L, '#222222'), (ax + bx) / 2 + o, y + 8.4 - Math.abs(o), (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    }
  });
  // casario de enchimento
  F.fillers.forEach((f, k) => filler(g, f, k));
  return g;
}

/** Placa num poste (texto curto), base no chão y. */
function sign(g, text, x, y, z, bg) {
  const tex = textTexture(text, { width: 512, height: 128, bg, fg: '#ffffff', font: 'bold 64px "Trebuchet MS", sans-serif' });
  for (const ry of [0, Math.PI]) g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.7), new THREE.MeshLambertMaterial({ map: tex })), x, y + 2.4, z + (ry ? -0.02 : 0.02), 0, ry, 0));
  g.add(at(cyl(0.07, 0.07, 2.4, '#555555', 6), x, y + 1.2, z - 0.04));
}

// ---- Entorno (fora da sebe; favelaPlan.js → outside) ----
const OUT_TONES = ['#c9b8a6', '#bdb5a6', '#d3cbbb', '#a8b0ad', '#c7a99a', '#b9a58a', '#a9a49b', '#b5654a', '#a85a42', '#d9c27a', '#8fb0b8', '#c98f7a', '#9fb38f'];
const TALL_TONES = ['#cfc7b8', '#b7b2a8', '#d8cfae', '#a9b6bd', '#c4a58e'];
const GROUND_TONES = ['#b3a993', '#a8957a', '#9c8a6e', '#98a564'];      // topo dos terraços: cimento, terra; os de fora puxam para o verde
const CLOTHES = ['#e84a5f', '#ffd23f', '#3fa7d6', '#ffffff', '#7bc950'];
/** Entorno do Morro: aterro sobre a sebe (onde o morro está alto), terraços descendo até a planície, casas decorativas,
 *  prédios mais altos e algumas árvores. Tudo instanciado (poucas chamadas de desenho) e sem sombras; nada aqui é destino,
 *  pista ou SPOT. Os sólidos e as caixas da câmera vêm do plano. */
export function buildFavelaOutside(F) {
  const O = F.outside, g = new THREE.Group(); g.name = 'favela-outside';
  const L = {};
  const put = (k, x, y, z, sx, sy, sz, c, ry = 0) => (L[k] = L[k] || []).push([x, y, z, sx, sy, sz, c, ry]);   // y = base (as caixas nascem no chão; as vidraças, no centro)
  for (const f of O.fills) put('box', (f.x0 + f.x1) / 2, 0, (f.z0 + f.z1) / 2, f.x1 - f.x0, f.y, f.z1 - f.z0, CONC);
  for (const c of O.cells) put('box', (c.x0 + c.x1) / 2, -0.02, (c.z0 + c.z1) / 2, c.x1 - c.x0, Math.max(0.06, c.t + 0.02), c.z1 - c.z0, GROUND_TONES[c.tone]);
  for (const h of O.houses) {
    const w = h.x1 - h.x0, d = h.z1 - h.z0, cx = (h.x0 + h.x1) / 2, cz = (h.z0 + h.z1) / 2, H = h.floors * FAV_FLOOR, y = h.y, rawH = h.raw ? FAV_FLOOR : 0;
    put('box', cx, y, cz, w, H - rawH, d, h.tall ? TALL_TONES[h.tone % TALL_TONES.length] : OUT_TONES[h.tone]);
    if (rawH) put('box', cx, y + H - rawH, cz, w - 0.1, rawH, d - 0.1, '#8e8a83');            // último andar ainda no bloco
    put('box', cx, y + H - 0.04, cz, w + 0.12, 0.16, d + 0.12, SLAB);                         // laje
    // janelas (e a porta) numa face: normal (fx, fz), deslocamento ao longo da face (um plano só, rente à parede)
    const win = (fx, fz, yy, off, c = WIN, ww = 0.95, hh = 0.8) => {
      if (fx) put('pane', fx > 0 ? h.x1 + 0.02 : h.x0 - 0.02, yy + hh / 2, cz + off, ww, hh, 1, c, fx * Math.PI / 2);
      else put('pane', cx + off, yy + hh / 2, fz > 0 ? h.z1 + 0.02 : h.z0 - 0.02, ww, hh, 1, c, fz > 0 ? 0 : Math.PI);
    };
    const along = (fx) => (fx ? d : w);
    if (h.tall) {                                                    // prédio: janelas em grade nas quatro faces, caixa-d'água e antena no topo
      for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = Math.max(1, Math.floor(along(fx) / 2.1));
        for (let f = 0; f < h.floors; f++) for (let k = 0; k < n; k++) win(fx, fz, y + f * FAV_FLOOR + 1.1, (k - (n - 1) / 2) * along(fx) / n, (f + k + h.k) % 7 ? WIN : '#e9d9a6');
      }
      put('box', cx - w * 0.25, y + H + 0.12, cz, 0.08, 2.6, 0.08, '#6b6b6b');
    } else {
      const sx = h.k % 2 ? 1 : -1;                                   // a face de dentro (virada para o morro) e uma lateral
      for (let f = 0; f < h.floors; f++) {
        const yy = y + f * FAV_FLOOR + 1.2, a = along(h.fx);
        if (f === 0) { win(h.fx, h.fz, y, -a * 0.2, DOOR, 1.0, 2.0); win(h.fx, h.fz, yy, a * 0.25); }
        else if ((h.k + f) % 2) { win(h.fx, h.fz, yy, -a * 0.24); win(h.fx, h.fz, yy, a * 0.24); }
        else win(h.fx, h.fz, yy, 0);
        if (h.fx) win(0, sx, yy, 0); else win(sx, 0, yy, 0);
        if ((h.k + f) % 3 === 0) win(-h.fx, -h.fz, yy, 0);       // de vez em quando, uma janela para fora também
      }
      if (h.laundry) {                                               // varal na laje
        const yt = y + H + 0.12, zz = h.fz ? cz + h.fz * (d / 2 - 0.8) : cz, xx = h.fx ? cx + h.fx * (w / 2 - 0.8) : cx;
        const span = (h.fx ? d : w) - 1.2;
        for (let k = 0; k < 4; k++) {
          const o = -span / 2 + 0.6 + k * (span - 1.2) / 3;
          if (h.fx) put('box', xx, yt + 1.0, cz + o, 0.05, k % 2 ? 0.8 : 0.6, 0.6, CLOTHES[(h.k + k) % 5]);
          else put('box', cx + o, yt + 1.0, zz, 0.6, k % 2 ? 0.8 : 0.6, 0.05, CLOTHES[(h.k + k) % 5]);
        }
        for (const s of [-1, 1]) put('box', h.fx ? xx : cx + s * span / 2, yt, h.fx ? cz + s * span / 2 : zz, 0.08, 1.9, 0.08, '#6b6b6b');
      }
    }
    if (h.tank) put('tank', cx + w * 0.2, y + H + 0.04, cz - d * 0.15, 1, 1, 1, h.tank === 1 ? TANK : '#8c9196');
  }
  for (const t of O.trees) {
    put('trunk', t.x, t.y, t.z, t.s, t.s, t.s, '#7a5230');
    put('crown', t.x, t.y + 2.6 * t.s, t.z, 1.7 * t.s, 1.5 * t.s, 1.7 * t.s, ['#4f9a45', '#5ea84e', '#3f8a3c', '#6db256'][Math.floor(t.x * 7 + t.z) & 3]);
  }
  // a cidade lá embaixo (planície): calçadas por quarteirão, prédios com janelas (desenhadas no material), lajes, caixas-d'água
  const CT = O.city;
  if (CT) {
    const CITY = ['#cfc8b9', '#bdb7aa', '#d9cfb5', '#aab4b9', '#c9b59b', '#b7c0b0', '#d8c9c0', '#9fa6a8', '#e0d8c6'];
    for (const b of CT.blocks) {
      put('box', (b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2, b.x1 - b.x0, 0.2, b.z1 - b.z0, b.park ? '#7fae5a' : '#c9c4b8');   // calçada / gramado da pracinha
      if (b.park) for (let q = 0; q < 5; q++) { const x = b.x0 + 5 + ((q * 7) % 20), z = b.z0 + 5 + ((q * 11) % 20), sc = 1.4;
        put('trunk', x, 0.2, z, sc, sc, sc, '#7a5230'); put('crown', x, 0.2 + 2.6 * sc, z, 1.7 * sc, 1.5 * sc, 1.7 * sc, ['#4f9a45', '#5ea84e', '#3f8a3c'][q % 3]); }
    }
    for (const c of CT.builds) {
      const H = c.floors * 3;
      put('city', c.x, 0.2, c.z, c.w, H, c.d, CITY[c.tone]);
      put('box', c.x, 0.2 + H, c.z, c.w + 0.3, 0.3, c.d + 0.3, '#9a958c');
      if (c.tank) put('tank', c.x + c.w * 0.22, 0.5 + H, c.z - c.d * 0.2, 1.2, 1.2, 1.2, c.floors > 6 ? '#8c9196' : TANK);
    }
  }
  const geo = {
    city: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    pane: new THREE.PlaneGeometry(1, 1),
    tank: new THREE.CylinderGeometry(0.75, 0.68, 1.15, 8).translate(0, 0.575, 0),
    trunk: new THREE.CylinderGeometry(0.22, 0.32, 2.0, 6).translate(0, 1.0, 0),
    crown: new THREE.IcosahedronGeometry(1, 0),
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(), Y = new THREE.Vector3(0, 1, 0);
  for (const k of Object.keys(L)) {
    const list = L[k], im = new THREE.InstancedMesh(geo[k], k === 'city' ? cityMaterial() : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true }), list.length);
    list.forEach(([x, y, z, sx, sy, sz, c, ry], i) => { M.compose(V.set(x, y, z), Q.setFromAxisAngle(Y, ry), S.set(sx, sy, sz)); im.setMatrixAt(i, M); im.setColorAt(i, C.set(c)); });
    im.castShadow = false; im.receiveShadow = false; im.computeBoundingSphere();
    g.add(im);
  }
  if (CT) {                                                          // asfalto das ruas da cidade (fora dos corredores ao norte)
    const asph = new THREE.MeshStandardMaterial({ color: '#626872', roughness: 0.95 }), E = 360, I = 58;
    const strips = [[-E, -I, -I, MAP + I], [MAP + I, MAP + E, -I, MAP + I], [-E, MAP + E, MAP + I, MAP + E], [-E, 34, -E, -I], [76, 80, -E, -I], [128, MAP + E, -E, -I]];
    const road = new THREE.Mesh(mergeGeometries(strips.map(([x0, x1, z0, z1]) => new THREE.BoxGeometry(x1 - x0, 0.06, z1 - z0).translate((x0 + x1) / 2, -0.01, (z0 + z1) / 2)), false), asph);
    road.receiveShadow = false; g.add(road);
    g.add(horizonRing([                                              // morros verdes no horizonte, com um ou outro pão de açúcar de pedra
      { N: 24, R: 1150, h: [90, 190], b: [200, 320], shape: 'dome', base: '#4e7a45', haze: 0.36, rock: { every: 6, color: '#6b6560', h: 1.9, b: 0.55 } },
      { N: 30, R: 880, h: [35, 85], b: [120, 200], shape: 'dome', base: '#5d8b4d', haze: 0.28 },
    ], 313, 'favela-hills'));
  }
  return g;
}

/** Prédios da cidade: as janelas são desenhadas pelo material, pela posição no mundo (andares de 3 e colunas de 2,4), sem
 *  geometria a mais; o topo fica liso. */
let CITY_MAT = null;
function cityMaterial() {
  if (CITY_MAT) return CITY_MAT;
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, flatShading: true });
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityN;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      vec4 cwp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        cwp = instanceMatrix * cwp;
      #endif
      vCityPos = (modelMatrix * cwp).xyz; vCityN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCityPos;\nvarying vec3 vCityN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 cn = abs(vCityN);
      float cu = cn.x > 0.5 ? vCityPos.z : vCityPos.x, fy = fract((vCityPos.y - 0.2) / 3.0), fu = fract(cu / 2.4 + 0.5);
      float win = step(0.32, fy) * step(fy, 0.8) * step(0.24, fu) * step(fu, 0.76) * step(cn.y, 0.5) * step(1.0, vCityPos.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.2, 0.25), win * 0.85);`);
  };
  return (CITY_MAT = m);
}
