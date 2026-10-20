// Maquete do Bairro 22 (Bosque): chão de outono, rua curva e poucas casas entre árvores simples de outono.
import { kit } from './simple.js';
export const signY = 9;
export function build(ctx) {
  const { add, box } = ctx;
  const { P, house, tree, road } = kit(ctx);
  add(box(15, 0.3, 15, P('#d4cdbb')), 0, 0.15, 0); add(box(14, 0.4, 14, P('#c4b06a')), 0, 0.2, 0);
  for (const [x, z, w, d] of [[0, 7, 14.4, 0.6], [-7, 0, 0.6, 14.4], [7, 0, 0.6, 14.4], [-4.3, -7, 5.8, 0.6], [4.3, -7, 5.8, 0.6]]) add(box(w, 0.9, d, P('#6f6a2e')), x, 0.65, z);
  road(0, -7, 0.6, -3.2); road(0.6, -3.2, -1.2, 0.8); road(-1.2, 0.8, 0.4, 4.2); road(0.4, 4.2, 0.2, 7);   // rua curva
  house(-3.6, -3.4, '#c0392b', 0.65, Math.PI / 2); house(3.4, -1.2, '#2f78d0', 0.65, -Math.PI / 2);
  house(-4.0, 3.2, '#3fae5a', 0.65, Math.PI / 2); house(3.6, 4.6, '#7a4a2a', 0.65, -Math.PI / 2);
  const C = ['#e0731f', '#e8b52a', '#c0392b', '#8a5a2b', '#d9902a'];
  [[-5.6, -5.4, 0.8], [-3.0, -5.6, 0.6], [-5.8, -1.4, 0.7], [-2.6, -1.4, 0.55], [2.6, -5.4, 0.75], [5.4, -4.6, 0.8], [5.6, 1.4, 0.7],
   [2.2, 1.6, 0.55], [-5.6, 5.4, 0.75], [-2.4, 5.6, 0.6], [5.6, 6.0, 0.6], [2.4, 6.0, 0.5], [-2.8, 1.8, 0.5], [5.8, -1.8, 0.5]]
    .forEach(([x, z, r], i) => tree(x, z, r, C[i % C.length]));
}
