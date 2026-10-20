// Maquete do Bairro 24 (Medieval): muralha com torres e portão, poucas casas de telhado alto e um castelo.
import { kit } from './simple.js';
export const signY = 10;
export function build(ctx) {
  const { add, box, cone, cyl } = ctx;
  const { P, house, tree, road, disc } = kit(ctx);
  const STONE = '#a49a88', SLATE = '#5a6170';
  add(box(15, 0.3, 15, P('#c9c1ae')), 0, 0.15, 0); add(box(14, 0.4, 14, P('#9cbf6a')), 0, 0.2, 0);
  for (const [x, z, w, d] of [[0, 6.8, 13.6, 0.6], [-6.8, 0, 0.6, 13.6], [6.8, 0, 0.6, 13.6], [-4.1, -6.8, 5.4, 0.6], [4.1, -6.8, 5.4, 0.6]]) add(box(w, 1.6, d, P(STONE)), x, 1.2, z);
  for (const [x, z] of [[-6.8, -6.8], [6.8, -6.8], [-6.8, 6.8], [6.8, 6.8]]) {        // torres de canto
    add(cyl(0.85, 0.9, 2.6, P(STONE), 10), x, 1.7, z); add(cone(1.0, 1.3, P(SLATE), 10), x, 3.65, z);
  }
  for (const x of [-1.6, 1.6]) { add(box(1.2, 2.6, 1.2, P(STONE)), x, 1.7, -6.8); add(cone(0.95, 1.0, P(SLATE), 4), x, 3.5, -6.8, 0, Math.PI / 4, 0); }   // portão
  road(0, -6.8, 0, -0.9, 1.2, '#cdbf9e'); disc(0, 0, 1.4, '#cdbf9e');                  // rua de pedra até a praça
  add(cyl(0.45, 0.5, 0.35, P('#b8b2a8'), 10), 0, 0.6, 0);
  // castelo no alto (sudeste)
  add(box(3.4, 1.0, 3.4, P(STONE)), 3.8, 0.9, 3.8);
  add(box(1.8, 3.4, 1.8, P(STONE)), 3.8, 3.1, 3.8); add(cone(1.4, 1.4, P(SLATE), 4), 3.8, 5.5, 3.8, 0, Math.PI / 4, 0);
  const TER = '#b5502f';
  house(-3.6, -3.6, TER, 0.7, 0, '#efe3c8', 2.2); house(3.4, -3.6, '#7a4a2a', 0.7, 0, '#e2d1ae', 2.2);
  house(-4.2, 0.6, TER, 0.65, Math.PI / 2, '#d9c6a0', 2.2); house(-3.6, 4.4, '#7a4a2a', 0.7, Math.PI, '#efe3c8', 2.2);
  house(0, 4.6, TER, 0.6, Math.PI, '#e2d1ae', 2.2);
  tree(1.8, -2.2, 0.45); tree(-1.8, 2.2, 0.45);
}
