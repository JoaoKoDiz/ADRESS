// Maquete do Bairro 18 (Modernista): ruas curvas em teia com rotatória e balões, poucas casas de laje.
import { kit } from './simple.js';
export const signY = 9;
export function build(ctx) {
  const { add, box, THREE: T } = ctx;
  const { P, tree, road, disc } = kit(ctx);
  add(box(15, 0.3, 15, P('#d4cdbb')), 0, 0.15, 0); add(box(14, 0.4, 14, P('#8fc76a')), 0, 0.2, 0);
  for (const [x, z, w, d] of [[0, 7, 14.4, 0.35], [-7, 0, 0.35, 14.4], [7, 0, 0.35, 14.4], [-4.3, -7, 5.8, 0.35], [4.3, -7, 5.8, 0.35]]) add(box(w, 0.8, d, P('#9aa0a6')), x, 0.6, z);
  road(0, -7, 0, -0.6, 1.1);                                       // entrada até a rotatória
  disc(0, 0, 1.3, '#5d6470'); disc(0, 0, 0.55, '#8fc76a', 0.47);
  for (const [x, z] of [[-4.6, 3.8], [4.6, 3.8], [-4.6, -3.4]]) {    // ramos curvos até os balões
    const mx = x * 0.45, mz = z * 0.7 + 0.8;
    road(0, 0, mx, mz, 1.1); road(mx, mz, x, z, 1.1); disc(x, z, 0.95, '#5d6470');
  }
  const modern = (x, z, ry, w, d, h2) => {                          // casa de laje: volume branco, faixa escura e vidro na frente (+z)
    const m = new T.Group();
    m.add(ctx.at(box(w, 1.2, d, P('#f4f2ec')), 0, 1.0, 0));
    if (h2) m.add(ctx.at(box(w * 0.6, 0.9, d * 0.8, P('#f4f2ec')), -w * 0.2, 2.05, -d * 0.1));
    m.add(ctx.at(box(w + 0.3, 0.12, d + 0.3, P('#ece9e2')), 0, 1.66, 0));
    m.add(ctx.at(box(w + 0.32, 0.06, d + 0.32, P('#3a3d44')), 0, 1.58, 0));
    m.add(ctx.at(box(w * 0.55, 0.7, 0.06, P('#4f7fa6')), w * 0.15, 1.0, d / 2 + 0.02));
    add(m, x, 0, z, 0, ry, 0);
  };
  modern(-2.6, -4.6, 0, 2.4, 1.8, true); modern(2.8, -4.6, 0, 2.2, 1.8, false);
  modern(-3.0, 5.6, Math.PI, 2.4, 1.8, false); modern(3.0, 5.6, Math.PI, 2.4, 1.8, true);
  modern(5.6, 0, -Math.PI / 2, 2.2, 1.8, false);
  for (const [x, z] of [[-2.4, 1.6], [2.4, 1.4], [-5.6, 0.4], [-5.6, -5.8], [5.6, -5.8]]) tree(x, z, 0.45, '#2f7f3a');
}
