// Maquete do Bairro 15 (Colheita): poucas casinhas, estrada de terra e três talhões.
import { kit } from './simple.js';
export const signY = 9;
export function build(ctx) {
  const { add, box, base } = ctx; base();
  const { P, house, tree, road } = kit(ctx);
  const DIRT = '#b88a55';
  road(0, -7, 0, 1.2, 1.3, DIRT); road(-7, 1.2, 7, 1.2, 1.3, DIRT);           // estrada de terra em T
  add(box(5, 0.1, 5, P('#7dbb4a')), -3.9, 0.45, -3.9);                        // milharal: fileiras
  for (let i = 0; i < 4; i++) add(box(0.55, 0.55, 4.4, P('#3f8f3a')), -5.6 + i * 1.15, 0.75, -3.9);
  add(box(5, 0.25, 5, P('#e8c75a')), 3.9, 0.5, -3.9);                          // trigal
  add(box(5, 0.12, 4.2, P('#8a5e3a')), -3.9, 0.46, 4.3);                       // terra arada
  for (let i = 0; i < 4; i++) add(box(4.6, 0.08, 0.35, P('#6f4a2c')), -3.9, 0.54, 2.8 + i * 1.0);
  house(2.6, 4.4, '#2f78d0', 0.8, 0);                                          // casa da sede
  house(5.4, 4.6, '#c0392b', 0.85, 0, '#b5432f', 1.4);                         // celeiro vermelho
  tree(1.0, 6.0, 0.55); tree(6.2, 2.6, 0.5);
}
