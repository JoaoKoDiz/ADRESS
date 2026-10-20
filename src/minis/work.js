// Maquete do Bairro 21 (Operário): dois galpões, duas fileiras curtas de casas geminadas e ruas simples.
import { kit } from './simple.js';
export const signY = 9;
export function build(ctx) {
  const { add, box, cyl, base } = ctx; base();
  const { P, tree, road } = kit(ctx);
  road(0, -7, 0, 7, 1.3); road(-7, 0, 7, 0, 1.3);
  // galpão de telhado em arco (noroeste)
  add(box(5, 1.6, 3.4, P('#b9bec4')), -3.7, 1.2, -3.9);
  add(cyl(1.7, 1.7, 5, P('#8a929b'), 12), -3.7, 2.0, -3.9, 0, 0, Math.PI / 2);
  add(box(1.4, 1.1, 0.08, P('#5d6470')), -3.7, 0.95, -2.18);
  // fábrica de tijolo com chaminé (sudeste)
  add(box(5, 2.0, 3.4, P('#a8553a')), 3.7, 1.4, 3.9);
  add(box(5.2, 0.25, 3.6, P('#5d5650')), 3.7, 2.5, 3.9);
  add(cyl(0.3, 0.38, 3.2, P('#8a3f2a'), 10), 5.4, 2.0, 2.9);
  // casas geminadas (nordeste e sudoeste)
  const row = (x0, z, cols) => cols.forEach((c, i) => {
    const x = x0 + i * 1.6;
    add(box(1.55, 1.4, 2, P(c)), x, 1.1, z);
    add(cyl(0.01, 1.1, 1.55, P('#a8553a'), 3), x, 2.15, z, 0, 0, Math.PI / 2);   // telhado de duas águas
    add(box(0.4, 0.7, 0.06, P('#6b4428')), x, 0.75, z + 1.02);
  });
  row(2.1, -4.2, ['#e8d9b8', '#c9d7c4', '#e4c8b4']);
  row(-5.3, 4.3, ['#d7dce4', '#e8d9b8', '#e4c8b4']);
  tree(-1.8, 5.6, 0.45); tree(6.0, -1.6, 0.45);
}
