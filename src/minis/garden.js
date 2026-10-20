// Maquete do Bairro 17 (Jardins): condomínio com muro e portaria, ruas, poucas casas, árvores e um laguinho.
import { kit } from './simple.js';
export const signY = 9;
export function build(ctx) {
  const { add, box, cyl } = ctx;
  const { P, house, tree, road, disc } = kit(ctx);
  add(box(15, 0.3, 15, P('#d4cdbb')), 0, 0.15, 0); add(box(14, 0.4, 14, P('#95cc68')), 0, 0.2, 0);
  const WALL = '#efe2c4';
  for (const [x, z, w, d] of [[0, 7, 14.4, 0.4], [-7, 0, 0.4, 14.4], [7, 0, 0.4, 14.4], [-4.3, -7, 5.8, 0.4], [4.3, -7, 5.8, 0.4]]) add(box(w, 0.9, d, P(WALL)), x, 0.65, z);
  for (const x of [-1.4, 1.4]) add(box(0.6, 1.5, 0.6, P('#d9c49a')), x, 0.95, -7);   // pilares da portaria
  add(box(1.0, 0.9, 0.8, P('#ffffff')), 2.4, 0.85, -6.2);                            // guarita
  road(0, -7, 0, -3); road(-3.6, -3, 3.6, -3); road(-3.6, 3.6, 3.6, 3.6); road(-3.6, -3, -3.6, 3.6); road(3.6, -3, 3.6, 3.6);   // anel
  disc(-0.8, 0.3, 1.5, '#cfc6b0', 0.44); disc(-0.8, 0.3, 1.25, '#5aa9e6', 0.46);    // laguinho
  house(-4.8, -5.0, '#c0392b', 0.6); house(4.8, -5.0, '#2f78d0', 0.6);
  house(-5.2, 5.4, '#f0c22a', 0.6, Math.PI); house(0, 5.4, '#3fae5a', 0.6, Math.PI); house(5.2, 5.4, '#c0392b', 0.6, Math.PI);
  house(1.9, 0.6, '#2f78d0', 0.55, -Math.PI / 2);
  for (const [x, z] of [[-5.5, -1], [5.5, 1.2], [-2.2, -1.5], [1.5, -1.6], [-2.4, 2], [-5.6, 2.6], [5.6, -2.4]]) tree(x, z, 0.5);
}
