// Prédio contemporâneo (Nível 14): dois volumes retangulares desencontrados (branco ou cinza-escuro), grandes painéis de
// vidro azulado ou verde-água, cobertura plana, marquise simples na entrada e vasos. Coordenadas locais do lote; frente em z = 8.5.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, bakeStatic } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';

const G = 0.12, FLOOR = 2.8;
export const MOD_H = FLOOR * 5;                                     // ~ a altura dos prédios residenciais
const FAC = { white: '#f1f1ec', gray: '#5c6168' }, ACC = { white: '#9aa0a6', gray: '#eeeeea' };
const GLASS = { blue: '#4f86c6', aqua: '#4fb3ad' }, CANOPY = { wood: '#a8743f', white: '#f4f4f0' };

export function buildModLot(h) {
  const root = new THREE.Group(); root.name = 'mod:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const fac = FAC[h.fac], acc = ACC[h.fac], glass = mat(GLASS[h.glass], { roughness: 0.25, metalness: 0.1 }), frame = acc;
  // chão: calçamento, calçada em volta e caminho
  add(box(LOT, 0.14, LOT, '#c9c6bd'), LOT / 2, G - 0.07, LOT / 2);
  const hh = 0.19, y = 0.17 - hh / 2, full = LOT + 2 * WALK;
  add(box(full, hh, WALK, '#d4cdbb'), LOT / 2, y, -WALK / 2); add(box(full, hh, WALK, '#d4cdbb'), LOT / 2, y, LOT + WALK / 2);
  add(box(WALK, hh, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2); add(box(WALK, hh, LOT, '#d4cdbb'), LOT + WALK / 2, y, LOT / 2);
  add(box(LOT - 1, 0.16, 2.6, '#86b35a'), LOT / 2, G - 0.05, 13.6);                         // gramado da frente
  add(box(2.4, 0.06, LOT - 8.5, '#e6e2d8'), A.doorX, G + 0.02, (8.5 + LOT) / 2);           // caminho até a calçada
  // volume de baixo (2 andares) e de cima (3 andares), desencontrados
  const lo = { x0: 3.4, x1: 13.0, z0: 1.6, z1: 8.5, h: FLOOR * 2 }, up = { x0: 4.4, x1: 13.8, z0: 1.2, z1: 7.7, h: FLOOR * 3 };
  const vol = (v, y0) => add(box(v.x1 - v.x0, v.h, v.z1 - v.z0, fac), (v.x0 + v.x1) / 2, G + y0 + v.h / 2, (v.z0 + v.z1) / 2);
  vol(lo, 0); vol(up, lo.h);
  add(box(up.x1 - up.x0 + 0.3, 0.3, up.z1 - up.z0 + 0.3, acc), (up.x0 + up.x1) / 2, G + lo.h + 0.15, (up.z0 + up.z1) / 2);   // faixa entre os volumes
  add(box(up.x1 - up.x0 + 0.2, 0.4, up.z1 - up.z0 + 0.2, acc), (up.x0 + up.x1) / 2, G + MOD_H + 0.2, (up.z0 + up.z1) / 2);   // cobertura plana
  // térreo: vitrine de vidro com porta; volume de cima: pano de vidro com montantes finos
  const glassPanel = (x0, x1, y0, y1, z, cols) => {
    add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.12), glass), (x0 + x1) / 2, G + (y0 + y1) / 2, z);
    for (let k = 0; k <= cols; k++) add(box(0.12, y1 - y0, 0.18, frame), x0 + (x1 - x0) * k / cols, G + (y0 + y1) / 2, z + 0.02);
  };
  glassPanel(4.0, 12.4, 0.2, 2.6, lo.z1 + 0.02, 4);
  glassPanel(4.0, 9.0, 3.1, 5.2, lo.z1 + 0.02, 2);
  glassPanel(5.4, 13.2, lo.h + 0.5, MOD_H - 0.3, up.z1 + 0.02, 5);
  for (let f = 1; f < 3; f++) add(box(13.2 - 5.4, 0.14, 0.2, frame), 9.3, G + lo.h + f * FLOOR, up.z1 + 0.05);   // lajes aparentes
  add(new THREE.Mesh(new THREE.BoxGeometry(0.12, up.h - 0.8, 4.4), glass), up.x1 + 0.02, G + lo.h + up.h / 2, 3.6);   // faixa lateral
  add(box(1.6, 2.3, 0.14, '#2c3b4c'), A.doorX, G + 1.15, lo.z1 + 0.06);                   // porta de vidro escuro
  // marquise simples sobre a entrada
  add(box(5.2, 0.22, 2.4, CANOPY[h.canopy]), A.doorX, G + 3.0, lo.z1 + 1.2);
  // vasos e jardineiras
  for (const x of [A.doorX - 2.3, A.doorX + 2.3]) { add(box(0.8, 0.7, 0.8, '#4a4f56'), x, G + 0.35, lo.z1 + 0.9); add(sphere(0.55, '#3f8f3a', 8, 6), x, G + 1.15, lo.z1 + 0.9); }
  add(box(3.6, 0.5, 0.7, '#4a4f56'), 11.6, G + lo.h + 0.55, up.z1 + 0.45 + 0.4);               // jardineira na faixa do 2º volume
  for (let k = 0; k < 4; k++) add(sphere(0.32, '#57a84a', 7, 5), 10.3 + k * 0.85, G + lo.h + 0.95, up.z1 + 0.85);
  // topo
  const yT = G + MOD_H + 0.4, cx = (up.x0 + up.x1) / 2, cz = (up.z0 + up.z1) / 2;
  if (h.top === 'trees') for (const x of [cx - 2.5, cx + 2.5]) {
    add(box(1.6, 0.6, 1.6, '#4a4f56'), x, yT + 0.3, cz); add(cyl(0.12, 0.14, 1.2, '#6b4526', 6), x, yT + 1.1, cz); add(sphere(1.1, '#3f8f3a', 8, 6), x, yT + 2.1, cz);
  } else if (h.top === 'pergola') {
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(box(0.18, 2.2, 0.18, '#7a5434'), cx + x * 2.6, yT + 1.1, cz + z * 1.8);
    for (let k = -4; k <= 4; k++) add(box(0.16, 0.16, 4.2, '#a8743f'), cx + k * 0.65, yT + 2.25, cz);
  } else {
    add(cyl(0.08, 0.08, 5, '#d8d8d8', 6), cx + 3, yT + 2.5, cz);
    add(box(1.8, 1.1, 0.06, h.fac === 'white' ? '#2a64c2' : '#ff7a1a'), cx + 3 + 0.95, yT + 4.4, cz);
  }
  return bakeStatic(root);
}
