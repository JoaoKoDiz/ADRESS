// Nível 14 (Fluxo): cenário fixo da avenida (canteiro central com árvores e postes, faixas pintadas, faixas de pedestre nos
// cruzamentos com semáforo) e das quadras livres (pracinhas e estacionamentos). Semáforos e carros: traffic.js.
import * as THREE from 'three';
import { box, cyl, sphere, at } from './kit.js';
import { buildCar, CAR_COLORS } from '../barriers.js';

export function buildFluxScene(g, { FLUX, GRID, ROAD, LOT, WALK, roadCenter: rc, slotOrigin }) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const hr = ROAD / 2, m = FLUX.median, gaps = FLUX.gaps;
  // canteiro: meio-fio, grama, árvores e postes de luz
  for (let k = 0; k < gaps.length - 1; k++) {
    const x0 = rc(gaps[k]) + hr, x1 = rc(gaps[k + 1]) - hr, cx = (x0 + x1) / 2, cz = (m.z0 + m.z1) / 2, w = x1 - x0, d = m.z1 - m.z0;
    add(box(w, 0.3, d, '#d8d2c4'), cx, 0.15, cz);
    add(box(w - 0.6, 0.12, d - 0.6, '#6fae4f'), cx, 0.32, cz);
    for (let x = x0 + 4; x < x1 - 2; x += 8) {
      add(cyl(0.18, 0.24, 2.4, '#6b4526', 6), x, 1.5, cz - 2); add(sphere(1.6, '#3f8f3a', 8, 6), x, 3.4, cz - 2);
      add(cyl(0.1, 0.12, 6, '#7d838b', 6), x + 4, 3.3, cz + 2); add(box(2.6, 0.12, 0.2, '#7d838b'), x + 4, 6.3, cz + 2);
      for (const s of [-1, 1]) add(box(0.7, 0.18, 0.4, '#fff6cf'), x + 4 + s * 1.2, 6.2, cz + 2);
    }
  }
  // faixas brancas entre as duas faixas de cada pista (fora dos cruzamentos) e setas de sentido
  for (const [zc, dir] of [[rc(FLUX.north) + 2, -1], [rc(FLUX.south) - 2, 1]]) for (let j = 0; j < GRID; j++) {
    const a = rc(j) + hr + 1, b = rc(j + 1) - hr - 1;
    for (let x = a; x < b - 1.5; x += 4) add(box(2, 0.03, 0.2, '#ffffff'), x + 1, 0.02, zc);
    const ax = (a + b) / 2;
    for (const off of [-3, 3]) {
      add(box(2.2, 0.03, 0.35, '#ffffff'), ax, 0.02, zc + off);
      add(box(0.9, 0.03, 0.35, '#ffffff'), ax + dir * 0.9, 0.02, zc + off + 0.35, 0, dir * 0.7, 0);
      add(box(0.9, 0.03, 0.35, '#ffffff'), ax + dir * 0.9, 0.02, zc + off - 0.35, 0, -dir * 0.7, 0);
    }
  }
  // faixas de pedestre e linhas de retenção nos cruzamentos com semáforo
  for (const j of FLUX.lights) {
    const x = rc(j);
    for (const [z0, z1] of [[rc(FLUX.north) - hr, rc(FLUX.north) + hr + FLUX.widen], [rc(FLUX.south) - hr - FLUX.widen, rc(FLUX.south) + hr]]) {
      for (const s of [-1, 1]) for (let z = z0 + 0.6; z < z1 - 0.4; z += 1.1) add(box(2.2, 0.03, 0.55, '#f4f4f4'), x + s * (hr + 1.6), 0.02, z);
    }
  }
  // quadras livres: pracinhas (árvores, bancos) e estacionamentos (vagas e alguns carros parados)
  FLUX.parks.forEach((s, n) => {
    const o = slotOrigin(s), cx = o.x + LOT / 2, cz = o.z + LOT / 2;
    add(box(LOT + 2 * WALK, 0.19, LOT + 2 * WALK, '#d4cdbb'), cx, 0.08, cz);
    if (n % 2 === 0) {
      add(box(LOT - 0.6, 0.12, LOT - 0.6, '#79b85a'), cx, 0.22, cz);
      add(box(LOT - 4, 0.13, 1.6, '#d9cfb5'), cx, 0.23, cz); add(box(1.6, 0.13, LOT - 4, '#d9cfb5'), cx, 0.23, cz);
      for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) { add(cyl(0.2, 0.26, 2.2, '#6b4526', 6), cx + x, 1.3, cz + z); add(sphere(1.8, '#3f8f3a', 8, 6), cx + x, 3.3, cz + z); }
      for (const [x, z, r] of [[0, -3, 0], [0, 3, 0], [-3, 0, Math.PI / 2], [3, 0, Math.PI / 2]]) add(box(2.2, 0.5, 0.6, '#8a5a36'), cx + x, 0.5, cz + z, 0, r, 0);
    } else {
      add(box(LOT - 0.6, 0.06, LOT - 0.6, '#5d6470'), cx, 0.2, cz);
      for (let k = 0; k <= 5; k++) for (const s of [-1, 1]) add(box(0.14, 0.04, 4.6, '#ffffff'), o.x + 1.6 + k * 2.8, 0.24, cz + s * 4.4);
      for (let k = 0; k < 5; k++) if ((k + n) % 3) {
        const c = buildCar(); c.userData.body.material = c.userData.body.material.clone();
        c.userData.body.material.color.set(CAR_COLORS[(k * 3 + n) % CAR_COLORS.length]);
        c.position.set(o.x + 3 + k * 2.8, 0.2, cz + (k % 2 ? 4.4 : -4.4)); c.rotation.y = Math.PI / 2; g.add(c);
      }
    }
  });
  return g;
}
