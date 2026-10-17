// Modelos de roda da van (Shop → Rodas): 8 modelos, o 0 é o padrão. Eixo da roda = Z local (como na van).
// Só a roda PADRÃO tem as duas cores editáveis (aro/pneu e centro); as outras 7 têm cores próprias, fixas — cada uma é única.
import * as THREE from 'three';
import { mat, box, cyl, sphere, torus, at } from './kit.js';

export const WHEEL_R = 0.44, WHEEL_W = 0.36;
export const WHEEL_DEFAULT = { tire: '#1f2023', hub: '#c9ced6' };
/** Materiais compartilhados da roda padrão (Shop → cor do aro e do centro). */
const WM = {
  tire: new THREE.MeshStandardMaterial({ color: WHEEL_DEFAULT.tire, roughness: 0.85, flatShading: true }),
  hub: new THREE.MeshStandardMaterial({ color: WHEEL_DEFAULT.hub, roughness: 0.85, flatShading: true }),
};
export const setWheelColors = c => { if (c && c.tire) WM.tire.color.set(c.tire); if (c && c.hub) WM.hub.color.set(c.hub); };

const ax = m => at(m, 0, 0, 0, Math.PI / 2, 0, 0);                        // cilindro com o eixo em Z
const G = (...kids) => { const g = new THREE.Group(); kids.flat().forEach(k => g.add(k)); return g; };
/** n raios que saem do centro (comprimento len), cada um com a cor colorOf(i). Planos em XY, espessura `depth` em Z. */
const spokes = (n, len, thick, depth, colorOf, off = 0, r0 = 0, twist = 0) => Array.from({ length: n }, (_, i) => {
  const a = off + (i / n) * Math.PI * 2, g = new THREE.Group();
  const s = at(box(len, thick, depth, colorOf(i)), r0 + len / 2, 0, 0, twist, 0, 0);
  g.add(s); g.rotation.z = a; return g;
});
const glowMat = c => mat(c, { emissive: c, emissiveIntensity: 1.3 });

export const WHEEL_MODELS = [
  { name: 'Padrão', desc: 'A roda de sempre. Única com cores editáveis (aro e centro).',
    build: () => G(ax(cyl(WHEEL_R, WHEEL_R, WHEEL_W, WM.tire, 12)), ax(cyl(0.22, 0.22, WHEEL_W + 0.04, WM.hub, 6))) },
  { name: 'Esportiva', desc: 'Aro cromado com 5 raios vermelhos.',
    build: () => G(ax(cyl(0.44, 0.44, 0.3, '#1f2023', 18)), ax(cyl(0.34, 0.34, 0.34, '#d9dde3', 20)), ax(cyl(0.29, 0.29, 0.36, '#2b2d33', 20)),
      spokes(5, 0.27, 0.07, 0.38, () => '#e3262e', 0.3), ax(cyl(0.09, 0.09, 0.4, '#e3262e', 12))) },
  { name: 'Off-road', desc: 'Pneu grosso com garras e centro laranja.',
    build: () => G(ax(cyl(0.4, 0.4, 0.42, '#1b1b1e', 14)),
      Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return at(box(0.1, 0.09, 0.44, '#3a3328'), Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0, 0, 0, a); }),
      ax(cyl(0.2, 0.2, 0.46, '#ff7a1a', 8)), ax(cyl(0.08, 0.08, 0.5, '#2b2d33', 6))) },
  { name: 'Retrô', desc: 'Faixa branca no pneu e calota cromada.',
    build: () => G(ax(cyl(0.44, 0.44, 0.3, '#1f2023', 22)), ax(cyl(0.37, 0.37, 0.32, '#f4efe3', 22)), ax(cyl(0.29, 0.29, 0.33, '#1f2023', 22)),
      [-1, 1].map(s => { const d = sphere(0.22, '#e4e8ee', 14, 8); d.scale.set(1, 1, 0.45); d.position.z = s * 0.15; return d; })) },
  { name: 'Turbina', desc: 'Aletas torcidas em verde-água, como uma turbina.',
    build: () => G(ax(cyl(0.44, 0.44, 0.32, '#1f2023', 18)), ax(cyl(0.34, 0.34, 0.34, '#2b2d33', 20)),
      spokes(8, 0.29, 0.045, 0.34, () => '#19b5b0', 0, 0.04, 0.7), ax(cyl(0.1, 0.1, 0.38, '#19b5b0', 10))) },
  { name: 'Neon', desc: 'Aro escuro com anel de neon ciano brilhando.',
    build: () => G(ax(cyl(0.44, 0.44, 0.3, '#15171c', 20)), ax(cyl(0.34, 0.34, 0.33, '#0d0f13', 20)),
      [-1, 1].map(s => at(torus(0.28, 0.03, glowMat('#19e3ff'), 6, 28), 0, 0, s * 0.17)), ax(cyl(0.11, 0.11, 0.36, glowMat('#19e3ff'), 12))) },
  { name: 'Dourada', desc: 'Aro dourado com 6 raios grossos.',
    build: () => G(ax(cyl(0.44, 0.44, 0.3, '#1f2023', 18)), ax(cyl(0.34, 0.34, 0.34, '#e8c24a', 22)), ax(cyl(0.26, 0.26, 0.35, '#7a5c14', 20)),
      spokes(6, 0.26, 0.1, 0.37, () => '#e8c24a', 0.2), ax(cyl(0.11, 0.11, 0.4, '#f1d36b', 8))) },
  { name: 'Arco-íris', desc: 'Raios em todas as cores, aro branco.',
    build: () => G(ax(cyl(0.44, 0.44, 0.3, '#1f2023', 18)), ax(cyl(0.34, 0.34, 0.34, '#f2f2f2', 22)),
      spokes(6, 0.3, 0.12, 0.37, i => ['#e3262e', '#ff7a1a', '#efbf2a', '#3c9d55', '#3a78d4', '#8a55c4'][i]), ax(cyl(0.08, 0.08, 0.4, '#f2f2f2', 10))) },
];

/** Roda `i` (0 = padrão), pronta para colocar num pivô. */
export function buildWheel(i = 0) {
  const g = WHEEL_MODELS[i].build();
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
