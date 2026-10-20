// Maquete do Bairro 23 (Cachoeira): duas margens altas, vale com rio, cachoeira no fundo e ponte alta.
import { kit } from './simple.js';
export const signY = 12;
export function build(ctx) {
  const { add, box } = ctx;
  const { P, house, tree, road } = kit(ctx);
  const TOP = 4.2, ROCK = '#9a8467', GRASS = '#86c25e', WATER = '#4aa3df';
  add(box(15, 0.3, 15, P('#d4cdbb')), 0, 0.15, 0);
  for (const s of [-1, 1]) {                                        // as duas margens (blocos de terra com grama em cima)
    add(box(5.2, TOP - 0.3, 14, P(ROCK)), s * 4.4, 0.3 + (TOP - 0.3) / 2, 0);
    add(box(5.2, 0.25, 14, P(GRASS)), s * 4.4, TOP + 0.12, 0);
  }
  add(box(3.6, 0.3, 14, P('#7a6a52')), 0, 0.45, 0);                 // fundo do vale
  add(box(2.2, 0.08, 12.4, P(WATER)), 0, 0.64, 0.8);                // rio
  add(box(14, 7.0, 1.6, P(ROCK)), 0, 0.3 + 3.5, -6.2);              // paredão do fundo
  add(box(14, 0.25, 1.6, P(GRASS)), 0, 7.4, -6.2);
  add(box(2.2, 0.1, 1.7, P(WATER)), 0, 7.56, -6.2);                 // rio de cima
  add(box(2.2, 6.9, 0.2, P('#8fd0f2')), 0, 3.95, -5.35);            // a queda
  add(box(2.8, 0.14, 1.0, P('#ffffff')), 0, 0.72, -4.9);            // espuma
  add(box(3.8, 0.35, 1.3, P('#c9c3b8')), 0, TOP + 0.05, 1.6);       // ponte alta
  for (const x of [-0.9, 0.9]) add(box(0.35, TOP - 0.6, 0.35, P('#b8b2a8')), x, 0.6 + (TOP - 0.6) / 2, 1.6);
  for (const s of [-1, 1]) road(s * 1.9, 1.6, s * 6.8, 1.6, 1.1, '#5d6470', TOP + 0.27);
  house(-4.6, -1.6, '#c0392b', 0.6, 0); house(-4.6, 4.6, '#f0c22a', 0.6, Math.PI);
  house(4.6, -1.6, '#2f78d0', 0.6, 0); house(4.6, 4.6, '#3fae5a', 0.6, Math.PI);
  for (const [x, z] of [[-6.2, 1.6], [6.2, 5.8], [-3, -6.2], [3.2, -6.2]]) tree(x, z, 0.5, '#3f8f3a', x < -5 || x > 5 ? TOP + 0.25 : 7.5);
}
