// Bagageiros da van (Shop → Bagageiro): o padrão (caixas de entrega) + 3 modelos. Nenhum tem cor editável.
// Coordenadas no espaço do corpo da van (frente = +X); a carga fica sobre os trilhos do teto (y ≈ 2,47, x de −2,2 a 0,5, z de −0,85 a 0,85).
import * as THREE from 'three';
import { box, cyl, sphere, cone, at, group, dynamic, textTexture } from './kit.js';

const Y = 2.47;                                    // topo dos trilhos
const CARD = '#c98a4a', TAPE = '#f3d9a6';

/** Etiqueta (plano com texto). Fica fora do merge (precisa das UVs). */
function label(text, w, h, bg, fg, px) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: textTexture(text, { width: 256, height: Math.round(256 * h / w), bg, fg, font: `bold ${px}px "Trebuchet MS", sans-serif` }), roughness: 0.8 }));
  return dynamic(m);
}

/** Caixote de madeira reforçado (origem no centro da base). */
function crate(w, h, d) {
  const WOOD = '#b98b57', DARK = '#6f4a28', g = group();
  g.add(at(box(w, h, d, WOOD), 0, h / 2, 0));
  for (const k of [1, 2]) g.add(at(box(w + 0.012, 0.016, d + 0.012, DARK), 0, (h * k) / 3, 0));                   // juntas das tábuas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.09, h + 0.02, 0.09, DARK), sx * w / 2, h / 2, sz * d / 2));   // quinas reforçadas
  for (const yy of [0.04, h - 0.04]) {
    for (const sz of [-1, 1]) g.add(at(box(w + 0.02, 0.08, 0.09, DARK), 0, yy, sz * d / 2));
    for (const sx of [-1, 1]) g.add(at(box(0.09, 0.08, d + 0.02, DARK), sx * w / 2, yy, 0));
  }
  const L = Math.hypot(w, h) * 0.9, a = Math.atan2(h, w);
  for (const sz of [-1, 1]) g.add(at(box(L, 0.07, 0.04, DARK), 0, h / 2, sz * (d / 2 + 0.02), 0, 0, sz * a));   // travessa em X (frente e fundo)
  const L2 = Math.hypot(d, h) * 0.9, a2 = Math.atan2(h, d);
  for (const sx of [-1, 1]) g.add(at(box(0.04, 0.07, L2, DARK), sx * (w / 2 + 0.02), h / 2, 0, sx * a2, 0, 0));    // e nas laterais
  // etiquetas e marcas de transporte
  const f = label('FRÁGIL', Math.min(0.5, w * 0.6), 0.2, '#f4efe3', '#c0281e', 52); f.position.set(0, h * 0.72, d / 2 + 0.05); g.add(f);
  const t = label('↑ ↑', Math.min(0.45, w * 0.5), 0.24, '#f4efe3', '#2b2d33', 70); t.rotation.x = -Math.PI / 2; t.position.set(0, h + 0.005, 0); g.add(t);
  const s = label('ESTE LADO', 0.5, 0.16, '#f4efe3', '#2b2d33', 44); s.rotation.y = Math.PI / 2; s.position.set(w / 2 + 0.05, h * 0.35, 0); g.add(s);
  g.add(at(box(0.16, 0.1, 0.02, '#d8473a'), -w * 0.3, h * 0.35, d / 2 + 0.02));                                   // etiqueta de despacho
  return g;
}

export const RACK_MODELS = [
  { name: 'Caixas', desc: 'As caixas de entrega de sempre.',
    build() {
      const pkg = group(at(box(1.35, 0.62, 1.25, CARD), 0, 0.31, 0), at(box(1.37, 0.02, 0.24, TAPE), 0, 0.625, 0), at(box(0.24, 0.02, 1.27, TAPE), 0, 0.625, 0), at(box(1.37, 0.62, 0.24, TAPE), 0, 0.31, 0));
      const pkg2 = group(at(box(0.8, 0.5, 0.75, '#d9a066'), 0, 0.25, 0), at(box(0.82, 0.02, 0.18, TAPE), 0, 0.505, 0), at(box(0.82, 0.5, 0.18, TAPE), 0, 0.25, 0));
      return group(at(pkg, -1.25, Y, 0.05, 0, 0.12, 0), at(pkg2, -0.05, Y, -0.25, 0, -0.25, 0));
    } },
  { name: 'Caixotes de madeira', desc: 'Embalagens reforçadas, com etiquetas e marcas de transporte.',
    build() {
      return group(at(crate(1.2, 0.75, 1.1), -1.45, Y, 0.02, 0, 0.08, 0), at(crate(0.85, 0.65, 0.85), -0.15, Y, -0.28, 0, -0.2, 0), at(crate(0.6, 0.45, 0.6), -1.5, Y + 0.75, 0.1, 0, 0.35, 0));
    } },
  { name: 'Mudança', desc: 'Uma poltrona, um abajur e uma caixa com uma planta saindo.',
    build() {
      const chair = group(
        at(box(0.9, 0.26, 0.85, '#9b3d2e'), 0, 0.24, 0), at(box(0.62, 0.14, 0.7, '#b34a38'), 0.06, 0.43, 0), at(box(0.18, 0.66, 0.85, '#9b3d2e'), -0.36, 0.6, 0),
        at(box(0.78, 0.3, 0.14, '#8a3326'), 0.02, 0.5, 0.36), at(box(0.78, 0.3, 0.14, '#8a3326'), 0.02, 0.5, -0.36));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) chair.add(at(cyl(0.05, 0.04, 0.12, '#3a2a1a', 6), sx * 0.38, 0.06, sz * 0.34));
      const lamp = group(at(cyl(0.2, 0.22, 0.05, '#3a3d44', 12), 0, 0.025, 0), at(cyl(0.03, 0.03, 1.0, '#cfd6dd', 6), 0, 0.55, 0), at(cyl(0.2, 0.31, 0.36, '#f6e7c0', 14), 0, 1.15, 0));
      lamp.rotation.z = -Math.PI / 2;                                                                  // abajur deitado
      const plant = group(at(box(0.75, 0.5, 0.7, CARD), 0, 0.25, 0), at(box(0.77, 0.02, 0.18, TAPE), 0, 0.505, 0));
      for (const [px, pz, ph] of [[0, 0, 0.7], [-0.15, 0.1, 0.5], [0.15, -0.1, 0.55]]) {
        plant.add(at(cyl(0.025, 0.03, ph, '#3f8f3a', 5), px, 0.5 + ph / 2, pz));
        const leaf = sphere(0.22, '#4fa848', 8, 6); leaf.scale.set(1, 0.45, 1); leaf.position.set(px, 0.5 + ph, pz); plant.add(leaf);
      }
      return group(at(chair, -1.45, Y, 0.08, 0, 0.18, 0), at(lamp, -0.75, Y + 0.31, 0.62, 0, 0.1, 0), at(plant, -0.05, Y, -0.22, 0, -0.15, 0));
    } },
  { name: 'Eletrodoméstico', desc: 'Uma geladeira embalada, deitada e presa no teto.',
    build() {
      const fr = group(at(box(1.95, 0.78, 0.82, '#d9c29a'), 0, 0.39, 0));
      for (const sx of [-1, 1]) fr.add(at(box(0.12, 0.72, 0.78, '#f4f1ea'), sx * 0.99, 0.39, 0));       // cantoneiras de isopor
      for (const x of [-0.5, 0.5]) {                                                                   // cintas de fixação
        fr.add(at(box(0.08, 0.03, 0.86, '#e3262e'), x, 0.8, 0));
        for (const sz of [-1, 1]) fr.add(at(box(0.08, 0.82, 0.03, '#e3262e'), x, 0.39, sz * 0.43));
        fr.add(at(box(0.14, 0.05, 0.1, '#2b2d33'), x, 0.82, 0.2));                                     // catraca
      }
      fr.add(at(box(0.5, 0.012, 0.22, '#f4efe3'), 0.1, 0.785, -0.22));
      const l1 = label('GELADEIRA', 0.62, 0.2, '#f4efe3', '#2b2d33', 46); l1.rotation.x = -Math.PI / 2; l1.position.set(0.05, 0.792, -0.2); fr.add(l1);
      const l2 = label('↑ ESTE LADO', 0.5, 0.16, '#f4efe3', '#c0281e', 40); l2.rotation.x = -Math.PI / 2; l2.position.set(-0.62, 0.792, 0.16); fr.add(l2);
      return group(at(fr, -0.9, Y, 0, 0, 0.04, 0));
    } },
];

/** Bagageiro `i` (0 = padrão): grupo no espaço do corpo da van. */
export function buildRack(i = 0) {
  const g = RACK_MODELS[i].build();
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
