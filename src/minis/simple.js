// Peças simples comuns às maquetes de arquivo próprio (mesma linguagem das maquetes básicas do mapa).
import * as THREE from 'three';

/** Cor → tom de cinza da versão bloqueada (pela luminância). */
export function grayOf(c) {
  const k = new THREE.Color(c), l = 0.3 * k.r + 0.59 * k.g + 0.11 * k.b;
  const v = Math.round(110 + l * 120).toString(16).padStart(2, '0');
  return '#' + v + v + v;
}

export function kit(ctx) {
  const { add, G, box, cone, cyl, sphere, THREE: T } = ctx;
  const P = c => G(c, grayOf(c));
  /** Casinha como as das maquetes básicas (parede, telhado de 4 águas, porta virada para +z local, girada por ry). */
  const house = (x, z, roof, s = 1, ry = 0, wall = '#f4ead6', roofH = 1.6) => {
    const h = new T.Group();
    h.add(ctx.at(box(3 * s, 2 * s, 2.6 * s, P(wall)), 0, 0.4 + s, 0));
    h.add(ctx.at(cone(2.4 * s, roofH * s, P(roof), 4), 0, 0.4 + 2 * s + roofH * s / 2, 0, 0, Math.PI / 4, 0));
    h.add(ctx.at(box(0.6 * s, 1.1 * s, 0.1, P('#6b4428')), 0, 0.4 + 0.55 * s, 1.31 * s));
    add(h, x, 0, z, 0, ry, 0);
  };
  /** Árvore simples: tronco + copa redonda. */
  const tree = (x, z, r = 0.6, color = '#3f8f3a', y = 0.4) => {
    add(cyl(0.1, 0.13, 0.6, P('#6b4526'), 6), x, y + 0.3, z);
    add(sphere(r, P(color), 7, 5), x, y + 0.6 + r * 0.7, z);
  };
  /** Faixa de rua de (x1,z1) a (x2,z2). */
  const road = (x1, z1, x2, z2, w = 1.2, color = '#5d6470', y = 0.43) => {
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    add(box(w, 0.06, L + w * 0.02, P(color)), (x1 + x2) / 2, y, (z1 + z2) / 2, 0, Math.atan2(dx, dz), 0);
  };
  const disc = (x, z, r, color, y = 0.43, h = 0.06) => add(cyl(r, r, h, P(color), 20), x, y, z);
  return { P, house, tree, road, disc };
}
