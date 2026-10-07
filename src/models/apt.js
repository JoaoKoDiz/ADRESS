// Prédio residencial (Bairro 6, a cidade): 5 andares, cinza. Variam (como as casas):
//   cor das sacadas (apt.balcony), o que há no terraço (apt.atop) e, às vezes, algo na fachada (fac:*)
//   e/ou no térreo (gnd:*). Coordenadas locais do lote; a fachada da frente fica em z = 8.5 (como a das casas).
import * as THREE from 'three';
import { mat, box, cyl, sphere, cone, at, bakeStatic } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';
import { BALCONY_COL } from '../data.js';

const G = 0.12, WALK_TOP = 0.17;
const X0 = 3.4, X1 = 13.8, Z0 = 1.2, Z1 = A.house.z1;
const FLOOR = 2.8, FLOORS = 5, H = FLOOR * FLOORS;
export const APT_HEIGHT = H + 0.6;                        // topo da platibanda (para a câmera e a dica)
const CX = (X0 + X1) / 2, W = X1 - X0, D = Z1 - Z0;
const GLASS = '#4a6a8a', FRAME = '#dcdcdc', DARK = '#3a3d44', CONCRETE = '#c4c0b8';
const COLS = [X0 + 1.9, CX, X1 - 1.9];                   // três colunas de janelas na frente

export function buildAptLot(apt) {
  const root = new THREE.Group();
  root.name = 'apt:' + apt.name;
  const gray = apt.gray, rail = BALCONY_COL[apt.balcony];
  const has = k => apt.extra.includes(k);

  // chão: calçamento, faixa de grama e calçada em volta
  root.add(at(box(LOT, 0.14, LOT, CONCRETE), LOT / 2, G - 0.07, LOT / 2));
  root.add(at(box(LOT - 1, 0.16, 2.2, '#86b35a'), LOT / 2, G - 0.05, 10.2));
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2, full = LOT + 2 * WALK;
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, -WALK / 2));
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), LOT + WALK / 2, y, LOT / 2));
  root.add(at(box(1.6, 0.06, LOT - Z1, '#d9d3c6'), A.doorX, G + 0.02, (Z1 + LOT) / 2));      // caminho até o portão
  // muro baixo na frente (com portão aberto)
  for (const [x0, x1] of [[0.3, A.gate.x0], [A.gate.x1, LOT - 0.3]]) root.add(at(box(x1 - x0, 0.8, 0.3, '#8d9097'), (x0 + x1) / 2, G + 0.4, LOT - 0.35));

  // corpo do prédio + platibanda + laje
  root.add(at(box(W, H, D, gray), CX, G + H / 2, (Z0 + Z1) / 2));
  root.add(at(box(W + 0.3, 0.6, D + 0.3, '#7d8188'), CX, G + H + 0.3, (Z0 + Z1) / 2));
  root.add(at(box(W - 0.5, 0.06, D - 0.5, '#6c7076'), CX, G + H + 0.62, (Z0 + Z1) / 2));
  for (let f = 1; f < FLOORS; f++) root.add(at(box(W + 0.06, 0.12, D + 0.06, '#80848b'), CX, G + f * FLOOR, (Z0 + Z1) / 2));   // frisos

  // térreo: entrada com marquise
  root.add(at(box(2.2, 2.4, 0.1, GLASS), A.doorX, G + 1.2, Z1 + 0.05));
  root.add(at(box(3.4, 0.2, 1.6, '#e8e6e1'), A.doorX, G + 2.6, Z1 + 0.8));
  for (const x of [X0 + 1.4, X1 - 1.4]) root.add(at(box(1.8, 1.4, 0.1, GLASS), x, G + 1.5, Z1 + 0.05));

  // andares: janelas e sacadas (guarda-corpo na cor da sacada)
  for (let f = 1; f < FLOORS; f++) {
    const fy = G + f * FLOOR;
    for (const x of COLS) {
      root.add(at(box(1.9, 1.7, 0.1, FRAME), x, fy + 1.35, Z1 + 0.04));
      root.add(at(box(1.6, 1.45, 0.12, GLASS), x, fy + 1.35, Z1 + 0.06));
      root.add(at(box(2.6, 0.18, 1.0, '#cfcfcf'), x, fy + 0.1, Z1 + 0.5));                     // laje da sacada
      root.add(at(box(2.6, 0.7, 0.1, rail), x, fy + 0.55, Z1 + 0.98));                         // guarda-corpo
      for (const s of [-1, 1]) root.add(at(box(0.1, 0.7, 1.0, rail), x + s * 1.25, fy + 0.55, Z1 + 0.5));
    }
    for (const s of [-1, 1]) for (const zz of [Z0 + 2, Z1 - 2]) {                                  // janelas laterais
      root.add(at(box(0.1, 1.3, 1.3, GLASS), CX + s * (W / 2 + 0.03), fy + 1.35, zz));
    }
  }

  // ---- fachada (às vezes) ----
  if (has('fac:clothes')) {                                     // roupas penduradas nas janelas
    const CL = ['#e63946', '#2a6bd1', '#ffd12a', '#3c9d55', '#ff8fc0', '#ffffff'];
    let k = 0;
    for (let f = 1; f < FLOORS; f += 1) for (const x of [COLS[0], COLS[2]]) {
      const fy = G + f * FLOOR;
      root.add(at(box(2.4, 0.04, 0.04, '#dddddd'), x, fy + 0.95, Z1 + 1.05));
      for (const dx of [-0.7, 0, 0.7]) root.add(at(box(0.5, 0.65, 0.05, CL[k++ % CL.length]), x + dx, fy + 0.6, Z1 + 1.08));
    }
  }
  if (has('fac:plants')) {                                      // plantas nas sacadas
    for (let f = 1; f < FLOORS; f++) for (const x of COLS) {
      const fy = G + f * FLOOR;
      root.add(at(box(0.6, 0.4, 0.4, '#b0663d'), x - 0.8, fy + 0.4, Z1 + 0.7));
      root.add(at(sphere(0.45, '#3f8f3a', 7, 5), x - 0.8, fy + 0.85, Z1 + 0.7));
      root.add(at(sphere(0.35, '#57a84a', 7, 5), x + 0.8, fy + 0.65, Z1 + 0.75));
    }
  }
  if (has('fac:ac')) {                                          // ar-condicionados na fachada
    for (let f = 1; f < FLOORS; f++) for (const x of COLS) {
      root.add(at(box(0.9, 0.55, 0.45, '#e2e2e2'), x + 1.0, G + f * FLOOR + 2.35, Z1 + 0.25));
      root.add(at(cyl(0.18, 0.18, 0.05, '#7d8188', 10), x + 1.0, G + f * FLOOR + 2.35, Z1 + 0.49, Math.PI / 2, 0, 0));
    }
  }
  if (has('fac:mural')) {                                       // grafite colorido na parede do térreo
    const MC = ['#ff3b3b', '#ffd12a', '#2f7fe0', '#2fbf5a', '#ff6fb5'];
    for (let k = 0; k < 5; k++) root.add(at(box(1.1, 2.0, 0.06, MC[k]), X0 + 0.9 + k * 0.62, G + 1.3, Z1 + 0.05 + k * 0.004, 0, 0, (k % 2 ? 0.25 : -0.25)));
    root.add(at(sphere(0.5, '#ffd12a', 8, 6), X0 + 2.2, G + 1.9, Z1 + 0.2));
  }

  // ---- térreo (às vezes) ----
  if (has('gnd:dumpster')) {                                    // caçamba de entulho
    root.add(at(box(3.2, 1.2, 1.7, '#f08a1a'), 3.6, G + 0.6, 13.6));
    root.add(at(box(3.0, 0.3, 1.5, '#7a5a3a'), 3.6, G + 1.25, 13.6));
    for (let k = 0; k < 4; k++) root.add(at(box(0.6, 0.3, 0.4, k % 2 ? '#9a9a9a' : '#b5653f'), 2.5 + k * 0.7, G + 1.45, 13.4 + (k % 2) * 0.3, 0, k, 0.3));
  }
  if (has('gnd:moto')) {                                        // moto estacionada
    const mx = 13.6, mz = 13.8;
    for (const dx of [-0.75, 0.75]) root.add(at(cyl(0.38, 0.38, 0.18, '#1f2023', 12), mx + dx, G + 0.38, mz, Math.PI / 2, 0, 0));
    root.add(at(box(1.5, 0.4, 0.4, '#d8312a'), mx, G + 0.75, mz));
    root.add(at(box(0.7, 0.18, 0.42, '#1f2023'), mx - 0.3, G + 1.0, mz));
    root.add(at(box(0.1, 0.5, 0.7, DARK), mx + 0.75, G + 1.1, mz));
  }
  if (has('gnd:guard')) {                                       // guarita no portão
    const gx = A.gate.x1 + 1.3, gz = LOT - 1.6;
    root.add(at(box(1.8, 2.2, 1.8, '#f2f2f2'), gx, G + 1.1, gz));
    root.add(at(box(1.9, 0.15, 1.9, '#3a78d4'), gx, G + 2.28, gz));
    root.add(at(box(1.2, 0.8, 0.08, GLASS), gx, G + 1.5, gz + 0.92));
  }
  if (has('gnd:bikes')) {                                       // bicicletário
    root.add(at(box(4.0, 0.1, 0.1, '#9aa0a8'), 3.6, G + 0.75, 14.4));
    const BC = ['#11a3a3', '#e63946', '#ffd12a'];
    for (let k = 0; k < 3; k++) {
      const bx = 2.3 + k * 1.3;
      for (const dz of [-0.55, 0.55]) root.add(at(cyl(0.38, 0.38, 0.06, '#1f2023', 12), bx, G + 0.42, 14.4 + dz, 0, 0, Math.PI / 2));
      root.add(at(box(0.08, 0.35, 1.0, BC[k]), bx, G + 0.7, 14.4));
    }
  }

  // ---- terraço ----
  const top = G + H + 0.65;
  if (apt.atop === 'tank') {                                    // caixa-d'água grande sobre pilares
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) root.add(at(box(0.25, 1.6, 0.25, DARK), CX + dx * 1.3, top + 0.8, (Z0 + Z1) / 2 + dz * 1.3));
    root.add(at(cyl(2.0, 2.0, 2.4, '#2f78c8', 16), CX, top + 2.8, (Z0 + Z1) / 2));
    root.add(at(cyl(1.9, 2.0, 0.3, '#5aa0e6', 16), CX, top + 4.1, (Z0 + Z1) / 2));
  } else if (apt.atop === 'antenna') {                          // várias antenas
    for (const [dx, hh] of [[-3, 4.5], [-0.5, 6], [2.5, 3.6]]) {
      root.add(at(cyl(0.08, 0.1, hh, DARK, 6), CX + dx, top + hh / 2, Z0 + 2.5));
      for (let k = 1; k <= 3; k++) root.add(at(box(1.6 - k * 0.3, 0.06, 0.06, DARK), CX + dx, top + hh * k / 4, Z0 + 2.5));
    }
  } else if (apt.atop === 'garden') {                           // jardim no terraço
    root.add(at(box(W - 1.2, 0.3, D - 1.2, '#6f9a4c'), CX, top + 0.15, (Z0 + Z1) / 2));
    for (const [dx, dz] of [[-3, -1.5], [3, -1.5], [-2.5, 1.8], [2.8, 1.6], [0, 0]]) {
      root.add(at(cyl(0.15, 0.2, 1.0, '#6b4526', 6), CX + dx, top + 0.8, (Z0 + Z1) / 2 + dz));
      root.add(at(sphere(1.0, '#3f8f3a', 8, 6), CX + dx, top + 1.7, (Z0 + Z1) / 2 + dz));
    }
  } else if (apt.atop === 'solar') {                            // painéis solares
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      root.add(at(box(2.6, 0.08, 1.6, '#1d3a7a'), X0 + 2.0 + i * 3.1, top + 0.6, Z0 + 1.8 + j * 2.4, -0.35, 0, 0));
      root.add(at(box(0.15, 0.6, 0.15, '#c9d0d8'), X0 + 2.0 + i * 3.1, top + 0.3, Z0 + 1.8 + j * 2.4));
    }
  } else if (apt.atop === 'pool') {                             // piscina no terraço
    root.add(at(box(W - 2, 0.35, D - 2.4, '#f2f2f2'), CX, top + 0.18, (Z0 + Z1) / 2));
    root.add(at(box(W - 3, 0.37, D - 3.4, '#36b6e6'), CX, top + 0.2, (Z0 + Z1) / 2));
    for (const dx of [-3.5, -1.5]) root.add(at(box(1.0, 0.25, 2.0, '#ffffff'), CX + dx, top + 0.15, Z1 - 0.6));
    root.add(at(cone(1.2, 0.5, '#ff6fa5', 10), CX + 3.5, top + 2.0, Z1 - 0.8));                  // guarda-sol
    root.add(at(cyl(0.05, 0.05, 1.8, '#ffffff', 6), CX + 3.5, top + 0.9, Z1 - 0.8));
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  root.userData.update = () => {};
  return root;
}
