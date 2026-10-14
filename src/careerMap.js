// Carreira: mapa de seleção de fases em 3D com cara de menu 2D.
// Estrada com curvas suaves, miniaturas de bairros (fases) ao lado; a van anda sozinha pela estrada:
// A recua, D avança. Perto de um bairro aparece "E — Jogar". (Todas as fases levam à mesma partida, por enquanto.)
import * as THREE from 'three';
import { createVan } from './van.js';
import { box, cone, sphere, cyl, torus, at, mat, textTexture, bakeStatic } from './models/kit.js';
import { ROOF_COL, WALL_COL } from './data.js';

const ROAD_W = 6;
const SPEED = 14;                 // unidades por segundo ao longo da estrada
const NEAR = 7;                   // distância (na estrada) para mostrar "E — Jogar"
const CAM_OFFSET = new THREE.Vector3(-24, 84, 70);   // câmera distante, ângulo fixo

const CSS = `
.cmap-prompt { position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none; display: none;
  transform: translate(-50%, -100%); padding: .45em .9em; border-radius: 12px; background: #fffaf0; border: 2px solid #e8661a;
  color: #3a2a1a; font: 700 clamp(14px, 1.2vw, 18px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,.25); }
.cmap-prompt.locked { border-color: #8a8a8a; color: #5c5c5c; background: #ececec; }
.cmap-prompt b { color: #fff; background: #e8661a; border-radius: 6px; padding: 0 .4em; margin-right: .3em; }
`;

function roadGeometry(curve, samples) {
  const pos = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    curve.getPointAt(u, p); curve.getTangentAt(u, t);
    const nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1;
    pos.push(p.x + nx / l * ROAD_W / 2, 0.05, p.z + nz / l * ROAD_W / 2, p.x - nx / l * ROAD_W / 2, 0.05, p.z - nz / l * ROAD_W / 2);
    if (i < samples) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Maquete de cada fase (o que muda em cada bairro):
//   houses   — 4 casinhas e ruas em cruz (Bairro 1)
//   plaza    — 8 casinhas menores em volta de uma pracinha (Bairro 2)
//   barriers — 4 casinhas + 2 cavaletes de obra (Bairro 3)
//   trucks   — 4 casinhas + caminhão na diagonal numa rua e buraco no meio (Bairro 4)
//   gas      — posto de gasolina, prédio comercial e 1 casinha (Bairro 5)
//   city     — 3 prédios altos e 1 casinha (Bairro 6)
//   jam      — como a cidade, com um caminhão na diagonal e uma fila de carros (engarrafamento) (Bairro 7)
//   jam8     — como o jam, com 4 prédios altos (cidade maior: Bairro 8, 8×8)
//   hill     — dois patamares elevados com ladeira e escadaria (Bairro 9, Encostas)
//   canal    — canal no meio, pontes e um galpão (Bairro 10, Travessia)
//   rail     — trilhos em L com curva, trem e estação (Bairro 11, Trilhos)
//   venice   — canais, fachadas venezianas coloridas e a Ponte de Rialto (Nível 12, Veneza)
export const MINI_KINDS = ['houses', 'plaza', 'barriers', 'trucks', 'gas', 'city', 'jam', 'jam8', 'hill', 'venice', 'canal', 'rail', 'favela', 'flux', 'farm', 'snow', 'garden', 'modern', 'night', 'moon', 'work', 'forest', 'canyon', 'medieval'];   // 21 reservado, 22 = Bosque, 23 = Cachoeira   // 17–19 reservados (null), 20 = Lua   // 13 = Morro, 14 = Fluxo, 15 = Colheita, 16 = Nevasca, 17 = Órbita   // 10 = Veneza, 11 = Travessia, 12 = Trilhos

/** Bairro em miniatura do tipo `kind`: base de grama, sebe, ruas e o que caracteriza o bairro. gray = fase bloqueada. */
function miniNeighborhood(kind, colors, gray = false) {
  const G = (c, gc) => (gray ? gc : c);          // fase bloqueada: tudo em tons de cinza
  const roof = i => G(colors[i % colors.length], '#8c8c8c');
  const g = new THREE.Group();
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  if (kind !== 'moon' && kind !== 'canyon' && kind !== 'medieval') {     // base com sebe (a Lua não tem: só a esfera; o Medieval tem muralha)
    add(box(15, 0.3, 15, G('#d4cdbb', '#b9b9b9')), 0, 0.15, 0);
    add(box(14, 0.4, 14, G('#95cc68', '#a3a3a3')), 0, 0.2, 0);
    for (const [x, z, w, d] of [[0, -7, 14.4, 0.6], [0, 7, 14.4, 0.6], [-7, 0, 0.6, 14.4], [7, 0, 0.6, 14.4]]) {
      add(box(w, 0.9, d, G('#3f7d3a', '#7a7a7a')), x, 0.65, z);
    }
  }
  const ROADC = G('#5d6470', '#6e6e6e');
  /** Casinha com telhado de 4 águas (s = escala). */
  const house = (x, z, color, s = 1) => {
    add(box(3 * s, 2 * s, 2.6 * s, G(WALL_COL, '#cfcfcf')), x, 0.4 + s, z);
    add(cone(2.4 * s, 1.6 * s, color, 4), x, 0.4 + 2.8 * s, z, 0, Math.PI / 4, 0);
    add(box(0.6 * s, 1.1 * s, 0.1, G('#6b4428', '#5c5c5c')), x, 0.4 + 0.55 * s, z + 1.31 * s);
  };
  const tinyTree = (x, z, r = 0.5) => {
    add(cyl(0.09, 0.12, 0.6, G('#6b4526', '#6a6a6a'), 6), x, 0.75, z);
    add(sphere(r, G('#3f8f3a', '#8a8a8a'), 7, 5), x, 1.05 + r * 0.6, z);
  };

  if (kind === 'plaza') {
    // grade 3×3: ruas em volta do quarteirão do meio; 8 casinhas menores e a pracinha no centro
    for (const c of [-2.4, 2.4]) {
      add(box(14, 0.42, 1.2, ROADC), 0, 0.22, c);
      add(box(1.2, 0.42, 14, ROADC), c, 0.22, 0);
    }
    let k = 0;
    for (const z of [-4.75, 0, 4.75]) for (const x of [-4.75, 0, 4.75]) {
      if (x === 0 && z === 0) continue;
      house(x, z, roof(k++), 0.55);
    }
    add(box(3.5, 0.1, 3.5, G('#e3d9c0', '#c4c4c4')), 0, 0.45, 0);                      // piso da praça
    for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
      add(box(1.25, 0.12, 1.25, G('#7cc25a', '#9c9c9c')), x, 0.5, z);                  // canteiros
    }
    add(cyl(0.62, 0.66, 0.28, G('#cfc6b0', '#b0b0b0'), 14), 0, 0.62, 0);                 // chafariz
    add(cyl(0.5, 0.5, 0.06, G('#5aa9e6', '#9a9a9a'), 14), 0, 0.77, 0);
    add(cyl(0.1, 0.13, 0.55, G('#cfc6b0', '#b0b0b0'), 8), 0, 0.98, 0);
    add(sphere(0.16, G('#8fd0ff', '#a8a8a8'), 8, 6), 0, 1.3, 0);
    tinyTree(-1.1, -1.1, 0.42); tinyTree(1.1, 1.1, 0.42);
    for (const [x, z] of [[1.05, -1.25], [-1.05, 1.25]]) {                              // banquinhos
      add(box(0.75, 0.08, 0.26, G('#8a5a36', '#7a7a7a')), x, 0.78, z);
      add(box(0.75, 0.22, 0.06, G('#8a5a36', '#7a7a7a')), x, 0.9, z - 0.13);
    }
    return bakeStatic(g);
  }

  if (kind === 'gas') {                          // Bairro 5: prédio comercial e casinha atrás, posto na frente
    add(box(14, 0.42, 2.2, ROADC), 0, 0.22, 0);                                         // rua horizontal
    add(box(2.2, 0.42, 6, ROADC), 0, 0.22, -4);                                         // rua vertical (só atrás; o posto cobre a da frente)
    // prédio comercial de 2 andares: fachada, toldo listrado, janelas e ar-condicionado no topo
    add(box(3.4, 3.0, 2.8, G('#b5653f', '#a9a9a9')), -3.5, 1.9, -3.5);
    add(box(3.55, 0.22, 2.95, G('#8f8a82', '#8c8c8c')), -3.5, 3.5, -3.5);
    add(box(2.8, 0.5, 0.06, G('#3d5f80', '#777777')), -3.5, 2.75, -2.08);
    add(box(1.0, 1.0, 0.06, G('#3d5f80', '#777777')), -4.4, 0.95, -2.08);
    for (let k = 0; k < 6; k++) add(box(0.56, 0.08, 0.7, k % 2 ? G('#ffffff', '#d0d0d0') : G('#3a78d4', '#8a8a8a')),
      -3.5 - 1.4 + k * 0.56, 1.72, -1.85, 0.35, 0, 0);
    add(box(0.8, 0.45, 0.6, G('#d9d9d9', '#bdbdbd')), -2.7, 3.83, -4.0);
    house(3.5, -3.5, roof(0));
    // posto de gasolina (ocupa os dois lotes da frente e a rua entre eles)
    add(box(13.6, 0.12, 5.6, G('#c9c4b8', '#b4b4b4')), 0, 0.46, 3.9);
    add(box(3.4, 1.4, 1.7, G('#f6f3ec', '#d6d6d6')), -4.5, 1.2, 2.2);                   // loja de conveniência
    add(box(3.5, 0.25, 1.8, G('#3c9d55', '#8a8a8a')), -4.5, 1.98, 2.2);
    add(box(2.4, 0.6, 0.06, G('#3d5f80', '#777777')), -4.5, 1.0, 3.06);
    const cx = 0.9, cz = 4.0;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(cyl(0.12, 0.12, 1.8, G('#e9e4da', '#cfcfcf'), 8), cx + sx * 2.5, 1.42, cz + sz * 1.1);
    add(box(6.2, 0.22, 3.2, G('#f6f3ec', '#d6d6d6')), cx, 2.45, cz);                    // cobertura
    add(box(6.25, 0.2, 3.25, G('#d8312a', '#8a8a8a')), cx, 2.25, cz);                   // faixa vermelha
    for (const ix of [cx - 1.25, cx + 1.25]) {                                          // ilhas e bombas
      add(box(0.45, 0.12, 1.9, G('#e0dbd0', '#c6c6c6')), ix, 0.58, cz);
      for (const pz of [cz - 0.5, cz + 0.5]) add(box(0.32, 0.62, 0.26, G('#d8312a', '#8a8a8a')), ix, 0.95, pz);
    }
    add(box(0.18, 2.6, 0.18, G('#3a3d44', '#6a6a6a')), 5.7, 1.82, 5.9);                // totem de preços
    add(box(1.1, 1.0, 0.14, G('#d8312a', '#8a8a8a')), 5.7, 3.0, 5.9);
    add(box(0.9, 0.25, 0.16, G('#1d1d1f', '#5a5a5a')), 5.7, 2.85, 5.92);
    return bakeStatic(g);
  }

  if (kind === 'moon') {                         // Nível 17 (Órbita): pequena lua esférica com estradas em anel, módulos e foguete
    // (só a lua com as casinhas, sem base)
    const Rs = 4.2, cy = 4.4, moonG = new THREE.Group(); moonG.position.set(0, cy, 0); g.add(moonG);
    moonG.add(sphere(Rs, G('#b9bcc0', '#b0b0b0'), 24, 16));
    for (const [rx, rz] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2]]) moonG.add(at(torus(Rs + 0.02, 0.22, G('#7d8188', '#8a8a8a'), 4, 40), 0, 0, 0, rx + Math.PI / 2, 0, rz));
    const on = (m, n, h = 0) => { const v = new THREE.Vector3(...n).normalize(); m.position.copy(v).multiplyScalar(Rs + h); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v); moonG.add(m); };
    const W = G('#f1ede2', '#d0d0d0');
    [[1, 1, 1, '#2f78d0'], [-1, 1, 1, '#ff7a1a'], [1, 1, -1, '#3fae5a'], [-1, 1, -1, '#f0c22a'], [1, -0.3, 1.2, '#ff7a1a'], [-1.2, 0.2, 1, '#2f78d0']].forEach(([x, y, z, c], k) => {
      const m = new THREE.Group(); m.add(at(k % 2 ? sphere(0.7, W, 10, 6) : cyl(0.55, 0.55, 1.1, W, 10), 0, k % 2 ? 0 : 0.5, 0)); m.add(at(cyl(k % 2 ? 0.72 : 0.57, k % 2 ? 0.72 : 0.57, 0.18, G(c, '#9a9a9a'), 10), 0, 0.35, 0)); on(m, [x, y, z]);
    });
    const r = new THREE.Group(); r.add(at(cyl(0.35, 0.4, 1.8, W, 10), 0, 0.9, 0)); r.add(at(cone(0.35, 0.8, G('#ff7a1a', '#9a9a9a'), 10), 0, 2.2, 0)); on(r, [0.15, 1, -0.1]);
    return bakeStatic(g);
  }
  if (kind === 'snow') {                         // Nível 16 (Nevasca): neve, patamar com muro de pedra, ladeira, gelo, pinheiros e casinhas
    const SN = G('#eef3f7', '#c4c4c4'), ST = G('#8f8b85', '#9a9a9a');
    add(box(13.6, 0.1, 13.6, SN), 0, 0.42, 0);
    add(box(13.6, 1.6, 6.4, ST), 0, 0.4 + 0.8, -3.6); add(box(13.6, 0.1, 6.4, SN), 0, 2.05, -3.6);
    add(box(1.8, 0.2, Math.hypot(3.4, 1.6), ROADC), 2.6, 1.25, 1.2, Math.atan2(1.6, 3.4), 0, 0);
    add(box(9, 0.12, 1.8, ROADC), -1.6, 0.48, 4.2, 0, 0.15, 0);
    add(box(3.4, 0.14, 1.5, G('#a9d8f2', '#b8b8b8')), -3.6, 0.5, 4.4, 0, 0.15, 0);
    house(-4.2, -3.8, roof(0), 0.75); house(0.8, -4.2, roof(1), 0.75); house(-4.4, 1.6, roof(2), 0.8); house(4.6, 4.6, roof(3), 0.8);
    for (const [x, z, y] of [[5.6, -5.2, 2.1], [-6, -1.4, 2.1], [1.2, 5.8, 0.45], [-1.6, 1.8, 0.45]]) { add(cone(0.75, 1.6, G('#2f6b45', '#8a8a8a'), 7), x, y + 0.9, z); add(cone(0.4, 0.5, SN, 7), x, y + 1.5, z); }
    return bakeStatic(g);
  }
  if (kind === 'garden') {                       // Nível 17 (Jardins): muro com portaria, ruas com balões, lago com patos, parque, clube, casas e árvores
    const Y = 0.4, ASF = G('#5d6470', '#6e6e6e'), WALLC = G('#efe6d2', '#c9c9c9'), CAPC = G('#d7cbb1', '#b5b5b5');
    const seg = (ax, az, bx, bz, w = 0.5) => add(box(w, 0.06, Math.hypot(bx - ax, bz - az) + w * 0.4, ASF), (ax + bx) / 2, Y + 0.04, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    const path = (pts, w) => pts.slice(1).forEach((q, i) => seg(pts[i][0], pts[i][1], q[0], q[1], w));
    // muro em volta (cobre a sebe da base), com pilares
    for (const [x, z, w, d] of [[0, -7, 14.5, 0.7], [0, 7, 14.5, 0.7], [-7, 0, 0.7, 14.5], [7, 0, 0.7, 14.5]]) {
      add(box(w, 1.05, d, WALLC), x, 0.72, z);
      for (let k = -7; k <= 7; k += 1.75) add(box(0.5, 1.18, 0.82, CAPC), w > 1 ? k : x, 0.79, w > 1 ? z : k);
    }
    // ruas: entrada, rotatórias, ramais com balão, anel e avenidas
    seg(0, -7.2, 0, -5); for (const z of [-5, 5.4]) { add(cyl(0.6, 0.6, 0.07, ASF, 16), 0, Y + 0.045, z); add(cyl(0.22, 0.22, 0.18, G('#6fb34f', '#a3a3a3'), 10), 0, Y + 0.12, z); }
    for (const z of [-5.35, 5.35]) for (const sx of [-1, 1]) { path([[0, z], [sx * 2.6, z + 0.15], [sx * 5.6, z - 0.05]]); add(cyl(0.46, 0.46, 0.07, ASF, 14), sx * 5.7, Y + 0.045, z); }
    path([[0, -5], [0, -3.2]]); path([[0, 3.2], [0, 5.4]]);
    const ring = [[0, -3.2], [-2.6, -3.3], [-4.6, -3.2], [-5.4, -2.6], [-5.5, 0], [-5.4, 2.6], [-4.6, 3.2], [-2.6, 3.3], [0, 3.15], [2.6, 3.3], [4.6, 3.2], [5.4, 2.6], [5.5, 0], [5.4, -2.6], [4.6, -3.2], [2.6, -3.3], [0, -3.2]];
    path(ring);
    // portaria: pilares do portal, guarita, cancela e passagem de pedestres
    for (const x of [-0.42, 0.42]) add(box(0.32, 1.5, 0.5, CAPC), x, 0.95, -7);
    add(box(0.55, 0.55, 0.5, G('#f4f1ea', '#d6d6d6')), 0.62, Y + 0.28, -6.35); add(box(0.75, 0.08, 0.7, G('#5f646c', '#8a8a8a')), 0.6, Y + 0.6, -6.35);
    add(box(0.75, 0.07, 0.07, G('#d8312a', '#8a8a8a')), 0.02, Y + 0.38, -6.25); add(box(0.08, 0.3, 0.08, G('#5f646c', '#8a8a8a')), 0.38, Y + 0.18, -6.25);
    add(box(0.16, 0.6, 0.12, G('#2f4a3a', '#7a7a7a')), 0.95, 0.75, -6.62);
    // lago com patinhos (oeste do miolo)
    { const lake = cyl(1, 1, 0.06, G('#4aa3d8', '#a5a5a5'), 20); lake.scale.set(0.82, 1, 1.4); add(lake, -4.0, Y + 0.05, 0);
      const rim = cyl(1, 1, 0.05, G('#b8b0a2', '#bdbdbd'), 20); rim.scale.set(0.95, 1, 1.55); add(rim, -4.0, Y + 0.03, 0);
      for (const [x, z, r] of [[-4.2, -0.5, 0.09], [-4.05, -0.3, 0.05], [-3.95, -0.15, 0.05], [-3.7, 0.6, 0.08]]) add(sphere(r, G(r > 0.06 ? '#f6f4ee' : '#f2d24e', '#e0e0e0'), 6, 4), x, Y + 0.12, z);
      add(box(0.18, 0.12, 0.18, G('#d8b48a', '#bdbdbd')), -4.0, Y + 0.12, -0.75); }
    // parque com cerca viva, caminhos, chafariz, coreto, playground, quadra e flores
    add(box(5.6, 0.07, 3.3, G('#9ad46a', '#b0b0b0')), 0, Y + 0.05, 0);
    for (const z of [-1.65, 1.65]) for (const [x0, x1] of [[-2.8, -0.15], [0.15, 2.8]]) add(box(x1 - x0, 0.2, 0.1, G('#3f7d3a', '#8a8a8a')), (x0 + x1) / 2, Y + 0.12, z);
    for (const x of [-2.8, 2.8]) add(box(0.1, 0.2, 3.3, G('#3f7d3a', '#8a8a8a')), x, Y + 0.12, 0);
    add(box(5.4, 0.08, 0.16, G('#e2d8c4', '#c8c8c8')), 0, Y + 0.09, 0); add(box(0.16, 0.08, 3.2, G('#e2d8c4', '#c8c8c8')), 0, Y + 0.09, 0);
    add(cyl(0.22, 0.25, 0.14, G('#cfcac0', '#bbbbbb'), 10), 0, Y + 0.15, 0); add(cyl(0.18, 0.18, 0.04, G('#6fb3e0', '#a5a5a5'), 10), 0, Y + 0.23, 0);
    add(cyl(0.32, 0.32, 0.12, G('#d9d2c4', '#bbbbbb'), 8), -1.16, Y + 0.12, -0.83); add(cone(0.42, 0.34, G('#b5402f', '#8c8c8c'), 8), -1.16, Y + 0.55, -0.83);   // coreto
    add(box(0.5, 0.03, 0.5, G('#e6d39a', '#c4c4c4')), 1.16, Y + 0.1, -0.83); add(box(0.12, 0.22, 0.12, G('#3f8ad0', '#8a8a8a')), 1.0, Y + 0.2, -0.95); add(box(0.2, 0.03, 0.06, G('#e0402a', '#8a8a8a')), 1.25, Y + 0.18, -0.7);   // playground
    add(box(0.95, 0.04, 0.6, G('#3f8a8a', '#9a9a9a')), -1.05, Y + 0.1, 0.9);                                              // quadra
    for (let k = 0; k < 6; k++) add(sphere(0.07, G(['#e0402a', '#f2c23a', '#9b5de5', '#ff7ab0', '#f4f4f4', '#ff9a3a'][k], '#b0b0b0'), 6, 4), 1.05 + Math.cos(k) * 0.25, Y + 0.14, 0.9 + Math.sin(k) * 0.25);   // flores
    // clube: salão, piscina e estacionamento
    add(box(1.1, 0.32, 0.75, G('#f4f2ec', '#d6d6d6')), 3.6, Y + 0.18, -1.2); add(box(1.25, 0.05, 0.9, G('#5f646c', '#8a8a8a')), 3.6, Y + 0.36, -1.2);
    add(box(1.2, 0.04, 2.0, G('#e8dcc4', '#c4c4c4')), 3.65, Y + 0.06, 0.75); add(box(0.75, 0.05, 1.3, G('#3fc0e8', '#a5a5a5')), 3.6, Y + 0.08, 0.75);
    add(box(0.8, 0.04, 1.7, ASF), 4.8, Y + 0.05, -0.8);
    // casas (fileiras dos ramais, do anel e das laterais)
    let k = 0;
    for (const x of [-5.4, -3.6, -1.8, 1.8, 3.6, 5.4]) { house(x, -6.25, roof(k++), 0.3); house(x * 0.95, -4.4, roof(k++), 0.3); house(x * 0.95, 4.45, roof(k++), 0.3); house(x, 6.25, roof(k++), 0.3); }
    for (const x of [-2.2, -1.1, 1.1, 2.2]) { house(x, -2.35, roof(k++), 0.28); house(x, 2.35, roof(k++), 0.28); }
    for (const z of [-1.8, 0, 1.8]) for (const x of [-6.35, 6.35]) house(x, z, roof(k++), 0.28);
    // árvores (ruas, cantos, beira do lago e faixas verdes)
    for (const [x, z] of [[-1.2, -5.9], [1.3, -5.9], [-6.3, -3.4], [6.3, -3.4], [-6.3, 3.4], [6.3, 3.4], [-4.8, -1.4], [-3.2, 1.3], [-4.9, 1.5], [-3.1, -1.3], [4.7, 2.0], [2.6, 3.8], [-2.6, 3.8], [-2.6, -3.8], [2.6, -3.8], [-0.6, 3.75], [0.6, -3.75], [-1.9, 0.5], [1.9, -0.4], [6.3, 5.3], [-6.3, -5.3], [0.6, 6.6], [-0.7, 6.6]])
      tinyTree(x, z, 0.24);
    return bakeStatic(g);
  }
  if (kind === 'forest') {                       // Nível 22 (Bosque): ruas sinuosas, casinhas entre árvores de outono
    const DIRT = ROADC, Y = 0.4;
    const road = (pts, w = 1.2) => {
      for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az); add(box(w, 0.06, len, DIRT), (ax + bx) / 2, Y + 0.03, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0); }
      for (const [x, z] of pts) add(cyl(w / 2, w / 2, 0.06, DIRT, 14), x, Y + 0.031, z);
    };
    road([[0.6, -7], [0.4, -4.6], [-1.6, -2.6], [-2.2, 0.4], [-0.8, 3.0], [1.6, 4.2], [4.2, 3.4]]);
    road([[0.4, -4.6], [2.8, -3.4], [4.4, -0.8], [3.6, 1.6], [4.2, 3.4], [5.0, 6.6]]);
    road([[-2.2, 0.4], [-5.0, 1.4], [-6.6, 4.6]], 1.0);
    add(box(4.6, 0.5, 4.2, G('#8a7152', '#a0a0a0')), 4.5, 0.55, 4.7);                       // patamar baixo
    add(box(4.6, 0.06, 4.2, G('#93a256', '#a3a3a3')), 4.5, 0.83, 4.7);
    let k = 0;
    for (const [x, z, ry] of [[-3.4, -4.8, 0], [-4.4, -1.8, 0.4], [1.8, -0.6, -0.3], [-3.6, 4.4, 0.6], [1.0, 6.0, 0], [5.6, -4.8, 0]]) house(x, z, roof(k++), 0.5);
    const T = [['#e8822a', '#d9701c'], ['#e8c23a', '#f2d24e'], ['#c63a24', '#d24a2c'], ['#9a6232', '#a8703e'], ['#5e8f3a', '#6c9a40']];
    const tree = (x, z, i, r = 0.62) => { add(cyl(0.08, 0.11, 0.7, G('#6b4526', '#6a6a6a'), 6), x, Y + 0.35, z); add(sphere(r, G(T[i][0], '#8a8a8a'), 7, 5), x, Y + 0.8 + r * 0.6, z); add(sphere(r * 0.6, G(T[i][1], '#999999'), 6, 4), x + r * 0.5, Y + 0.7 + r * 0.5, z + 0.2); };
    const spots = [[-5.8, -6.0], [-1.6, -6.2], [3.2, -6.0], [6.2, -2.2], [-6.2, -0.4], [-0.4, -0.8], [-0.2, 1.6], [2.4, 1.6], [-5.8, 2.6], [-2.2, 6.2], [3.2, 6.4], [6.2, 0.8], [-4.2, -3.4], [6.4, 5.9], [-1.0, 4.6]];
    spots.forEach(([x, z], i) => tree(x, z, i % 7 === 6 ? 4 : i % 4, 0.5 + (i % 3) * 0.12));
    for (const [x, z, c] of [[-2, -1.5, '#e8822a'], [2.5, 2.6, '#c63a24'], [-4, 3.4, '#e8c23a'], [0.8, -3.6, '#d9701c'], [-5.4, -2.6, '#c63a24'], [5.6, -3.2, '#e8c23a']]) add(box(0.5, 0.03, 0.4, G(c, '#9a9a9a')), x, Y + 0.02, z, 0, x, 0);   // folhas no chão
    return bakeStatic(g);
  }
  if (kind === 'work') {                         // Nível 21 (Operário): grade de ruas, fileiras de casas geminadas (duas águas, jardinzinho com cerca branca), oficina, caminhão e van
    const Y = 0.4, FAC = ['#a5553a', '#efe2c4', '#8fb3d1', '#9cc39a', '#e0b25a', '#e8a8a0'], RF = ['#b5502f', '#5f646c', '#7a4a2a'], DOOR = ['#3f8a4a', '#c8402f', '#2f6fb0', '#e8b02a'];
    const SW = G('#cfcac0', '#b4b4b4'), DASH = G('#f2d45c', '#c8c8c8');
    for (const z of [-3.3, 2.9]) { add(box(14, 0.05, 1.5, SW), 0, Y + 0.02, z); add(box(14, 0.06, 1.0, ROADC), 0, Y + 0.04, z); for (let x = -6.4; x < 6.6; x += 0.9) add(box(0.4, 0.02, 0.06, DASH), x, Y + 0.08, z); }
    add(box(1.5, 0.05, 14, SW), 0.6, Y + 0.021, 0); add(box(1.0, 0.06, 14, ROADC), 0.6, Y + 0.041, 0);   // rua da entrada (norte–sul)
    for (let z = -6.6; z < 6.8; z += 0.9) if (Math.abs(z + 3.3) > 0.7 && Math.abs(z - 2.9) > 0.7) add(box(0.06, 0.02, 0.4, DASH), 0.6, Y + 0.08, z);
    add(box(1.5, 0.05, 4.7, SW), -4.4, Y + 0.022, -0.2); add(box(1.0, 0.06, 4.7, ROADC), -4.4, Y + 0.042, -0.2);   // travessa
    let n = 0;
    const row = (x0, z, cnt, face) => {             // fileira: unidades encostadas, frente para +z (face 1) ou −z (face −1)
      for (let k = 0; k < cnt; k++) {
        const i = n++, two = i % 3 === 1, h = two ? 1.25 : 0.8, fac = G(FAC[(i * 5) % FAC.length], '#bdbdbd'), rc = G(RF[i % 3], '#8c8c8c');
        const gg = new THREE.Group(); gg.position.set(x0 + k * 1.0, Y, z); gg.rotation.y = face > 0 ? 0 : Math.PI; g.add(gg);
        const a = (m, px, py, pz, rx = 0) => gg.add(at(m, px, py, pz, rx, 0, 0));
        a(box(1.0, h, 0.95, fac), 0, h / 2, -0.15);                                        // casa
        a(box(1.02, 0.07, 0.62, rc), 0, h + 0.16, 0.09, 0.55); a(box(1.02, 0.07, 0.62, rc), 0, h + 0.16, -0.39, -0.55);   // duas águas, cumeeira ao longo da rua
        a(box(0.06, h, 0.04, G('#ece4d4', '#d6d6d6')), -0.5, h / 2, 0.34);                // pilastra da divisa
        a(box(0.22, 0.42, 0.04, G(DOOR[i % 4], '#777777')), -0.22, 0.21, 0.34);          // porta
        a(box(0.3, 0.24, 0.04, G('#ffffff', '#dddddd')), 0.2, 0.44, 0.34); a(box(0.24, 0.18, 0.05, G('#8fc6e8', '#9a9a9a')), 0.2, 0.44, 0.35);   // janela
        if (two) { a(box(0.3, 0.24, 0.04, G('#ffffff', '#dddddd')), -0.22, 0.92, 0.34); a(box(0.3, 0.24, 0.04, G('#ffffff', '#dddddd')), 0.2, 0.92, 0.34); }
        a(box(1.0, 0.04, 0.52, G('#95cc68', '#a3a3a3')), 0, 0.02, 0.6);                  // jardinzinho
        a(box(0.68, 0.16, 0.04, G('#fbf8f1', '#e0e0e0')), 0.16, 0.1, 0.84);               // cerca branca (o portão fica aberto, em frente à porta)
      }
    };
    row(-6.0, -4.91, 5, 1); row(2.3, -4.91, 4, 1);                                       // ao norte da 1ª rua
    row(-3.1, -1.69, 3, -1); row(2.0, -1.69, 2, -1);                                     // ao sul da 1ª rua
    row(-3.1, 1.29, 3, 1); row(2.0, 1.29, 5, 1);                                         // ao norte da 2ª rua
    row(-6.0, 4.51, 3, -1); row(-2.9, 4.51, 2, -1);                                      // ao sul da 2ª rua
    const wx = 5.0, wz = -1.35;                                                          // oficina (frente para a 1ª rua): portão largo, placa, pneus
    add(box(2.2, 1.1, 1.3, G('#a5553a', '#bdbdbd')), wx, Y + 0.55, wz); add(box(2.2, 0.16, 1.32, G('#7a7f86', '#9a9a9a')), wx, Y + 1.16, wz);
    add(box(1.1, 0.75, 0.05, G('#2f6fb0', '#888888')), wx - 0.35, Y + 0.38, wz - 0.66); add(box(1.6, 0.26, 0.05, G('#f4f1ea', '#dddddd')), wx, Y + 0.92, wz - 0.67);
    add(box(2.2, 0.03, 0.55, G('#b9b3a6', '#b0b0b0')), wx, Y + 0.02, wz - 0.93);
    for (let k = 0; k < 3; k++) add(cyl(0.16, 0.16, 0.1, G('#1f2023', '#555555'), 10), wx + 0.75, Y + 0.06 + k * 0.11, wz - 0.9);
    const truck = (x, z, ry, c) => {                                                    // caminhão baú
      const t = new THREE.Group(); t.position.set(x, Y, z); t.rotation.y = ry; g.add(t);
      t.add(at(box(0.62, 0.62, 0.62, G(c, '#9a9a9a')), 0.72, 0.42, 0)); t.add(at(box(0.04, 0.26, 0.5, G('#2b4a6e', '#777777')), 1.04, 0.56, 0));
      t.add(at(box(1.35, 0.8, 0.66, G('#f4f1ea', '#d6d6d6')), -0.3, 0.52, 0)); t.add(at(box(1.0, 0.16, 0.02, G(c, '#9a9a9a')), -0.3, 0.55, 0.34));
      for (const wx2 of [-0.65, 0.72]) for (const s of [-1, 1]) t.add(at(cyl(0.14, 0.14, 0.08, G('#1f2023', '#555555'), 8), wx2, 0.14, s * 0.3, Math.PI / 2, 0, 0));
    };
    const fvan = (x, z, ry, c) => {                                                     // furgão
      const t = new THREE.Group(); t.position.set(x, Y, z); t.rotation.y = ry; g.add(t);
      t.add(at(box(1.1, 0.6, 0.6, G(c, '#a8a8a8')), -0.12, 0.42, 0)); t.add(at(box(0.36, 0.34, 0.58, G(c, '#a8a8a8')), 0.6, 0.29, 0));
      t.add(at(box(0.04, 0.24, 0.5, G('#2b4a6e', '#777777')), 0.44, 0.6, 0)); t.add(at(box(0.7, 0.12, 0.02, G('#e8b02a', '#bbbbbb')), -0.15, 0.45, 0.31));
      for (const wx2 of [-0.45, 0.55]) for (const s of [-1, 1]) t.add(at(cyl(0.13, 0.13, 0.08, G('#1f2023', '#555555'), 8), wx2, 0.13, s * 0.28, Math.PI / 2, 0, 0));
    };
    truck(-2.4, -3.05, 0, '#c8402f'); fvan(3.4, 2.65, Math.PI, '#2f6fb0'); fvan(0.35, -0.6, -Math.PI / 2, '#f4f1ea');
    add(cyl(0.95, 0.95, 0.05, G('#d8cfbd', '#c4c4c4'), 16), 4.2, Y + 0.03, 5.3); tinyTree(4.2, 5.3, 0.5);   // pracinha
    for (const x of [3.3, 5.1]) add(box(0.5, 0.1, 0.18, G('#8a5a36', '#7a7a7a')), x, Y + 0.18, 5.3, 0, Math.PI / 2, 0);
    tinyTree(-5.8, -0.2, 0.42); tinyTree(-1.9, -0.2, 0.4); tinyTree(6.3, 5.9, 0.45); tinyTree(-5.9, -1.8, 0.38);
    return bakeStatic(g);
  }
  if (kind === 'modern') {                       // Nível 18 (Modernista): condomínio murado com portaria, ruas largas em teia (5 rotatórias, balões) e casas de laje plana
    const Y = 0.4, SWC = G('#d6d3cc', '#c4c4c4'), GRN = G('#7fc45c', '#a0a0a0');
    for (const m of g.children.filter(m => m.position.y === 0.65)) g.remove(m);   // sem a sebe da base: no lugar dela, o muro
    const seg = (a, b, w = 0.75) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(b[0] - a[0], b[1] - a[1]), x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2;
      add(box(w + 0.3, 0.05, len, SWC), x, Y + 0.02, z, 0, ry, 0); add(box(w, 0.06, len, ROADC), x, Y + 0.04, z, 0, ry, 0); };
    const disc = (p, r) => { add(cyl(r + 0.15, r + 0.15, 0.05, SWC, 16), p[0], Y + 0.021, p[1]); add(cyl(r, r, 0.06, ROADC, 16), p[0], Y + 0.041, p[1]); };
    // nós do plano (modernPlan.js), na escala da maquete
    const N = { n0: [0, -7], r1: [0, -3.9], a1: [-1.8, -3.4], b1: [1.8, -3.4], r2: [-3.65, -1.9], r3: [3.65, -1.9], c1: [-0.45, -1.65], r4: [0, 0.5],
      w1: [-4.7, 0.1], w2: [-4.45, 2.5], w3: [-3.1, 4.5], e1: [4.75, 0.1], e2: [4.5, 2.5], e3: [3.15, 4.5], m1: [-2.2, 1.6], m2: [2.2, 1.6], c2: [0.35, 2.9], r5: [0, 5.2],
      d1: [-5.8, -3.5], d2: [5.8, -3.5], d3: [-5.0, 5.95], d4: [5.0, 5.95], d5: [-3.0, -5.65], d6: [3.0, -5.65] };
    for (const [a, b] of [['n0', 'r1'], ['r1', 'a1'], ['a1', 'r2'], ['r1', 'b1'], ['b1', 'r3'], ['r1', 'c1'], ['c1', 'r4'], ['r2', 'w1'], ['w1', 'w2'], ['w2', 'w3'], ['w3', 'r5'],
      ['r3', 'e1'], ['e1', 'e2'], ['e2', 'e3'], ['e3', 'r5'], ['r4', 'm1'], ['m1', 'w2'], ['r4', 'm2'], ['m2', 'e2'], ['r4', 'c2'], ['c2', 'r5'],
      ['r2', 'd1'], ['r3', 'd2'], ['w3', 'd3'], ['e3', 'd4'], ['r1', 'd5'], ['r1', 'd6']]) seg(N[a], N[b]);
    for (const k of ['a1', 'b1', 'c1', 'w1', 'w2', 'w3', 'e1', 'e2', 'e3', 'm1', 'm2', 'c2']) disc(N[k], 0.375);
    for (const k of ['d1', 'd2', 'd3', 'd4', 'd5', 'd6']) disc(N[k], 0.6);                                       // balões de retorno
    for (const k of ['r1', 'r2', 'r3', 'r4', 'r5']) { disc(N[k], 0.72); add(cyl(0.34, 0.34, 0.16, GRN, 12), N[k][0], Y + 0.1, N[k][1]); add(box(0.12, 0.42, 0.12, G('#ec7a26', '#9a9a9a')), N[k][0], Y + 0.36, N[k][1]); }   // rotatórias com escultura
    // muro do condomínio com pilares e a portaria (abertura, pilares largos, cancela e guarita)
    const WC = G('#ece9e2', '#d0d0d0'), PC = G('#d2cec5', '#bcbcbc'), CC = G('#6f737a', '#8a8a8a');
    for (const [x, z, w, d] of [[-3.75, -6.95, 6.5, 0.3], [3.75, -6.95, 6.5, 0.3], [0, 6.95, 14.2, 0.3], [-6.95, 0, 0.3, 13.6], [6.95, 0, 0.3, 13.6]]) {
      add(box(w, 0.75, d, WC), x, Y + 0.375, z); add(box(w + (w > d ? 0 : 0.1), 0.06, d + (w > d ? 0.1 : 0), CC), x, Y + 0.78, z);
      const n = Math.round(Math.max(w, d) / 2.3);
      for (let k = 0; k <= n; k++) { const u = -Math.max(w, d) / 2 + Math.max(w, d) * k / n; add(box(w > d ? 0.22 : 0.4, 0.85, w > d ? 0.4 : 0.22, PC), x + (w > d ? u : 0), Y + 0.42, z + (w > d ? 0 : u)); }
    }
    for (const x of [-0.62, 0.62]) { add(box(0.4, 1.05, 0.45, PC), x, Y + 0.52, -6.95); add(box(0.46, 0.06, 0.5, CC), x, Y + 1.07, -6.95); }
    add(box(0.9, 0.06, 0.06, G('#d8312a', '#8a8a8a')), -0.05, Y + 0.45, -6.95); for (const x of [-0.35, 0.05, 0.45]) add(box(0.14, 0.065, 0.065, G('#f4f4f4', '#dddddd')), x, Y + 0.45, -6.95);   // cancela
    add(box(0.7, 0.62, 0.85, G('#f4f3ef', '#d6d6d6')), 1.05, Y + 0.31, -6.15); add(box(0.92, 0.07, 1.05, CC), 0.98, Y + 0.65, -6.15);   // guarita
    add(box(0.03, 0.22, 0.55, G('#8cc2e8', '#9a9a9a')), 0.69, Y + 0.4, -6.15);
    const W = c => G(c, '#cfcfcf'), mod = (x, z, ry, fac, two, door, s = 0.42) => {   // casa modernista: 2 volumes deslocados, laje plana, vidro azul
      const gg = new THREE.Group(); gg.position.set(x - Math.sin(ry) * 0.18, Y, z - Math.cos(ry) * 0.18); gg.rotation.y = ry; gg.scale.setScalar(s); g.add(gg);   // um pouco recuada da rua
      const a = (m, px, py, pz) => gg.add(at(m, px, py, pz));
      a(box(2.6, 0.06, 2.6, G('#7fc45c', '#a3a3a3')), 0, 0.03, 0);
      a(box(1.9, 0.9, 1.3, W(fac)), -0.25, 0.48, -0.4); a(box(2.1, 0.08, 1.5, W('#ecebe6')), -0.25, 0.96, -0.4);
      if (two) { a(box(1.4, 0.8, 1.4, W('#d9dadc')), 0.2, 1.4, -0.2); a(box(1.6, 0.08, 1.6, W('#ecebe6')), 0.2, 1.84, -0.2); a(box(1.2, 0.4, 0.05, G('#8cc2e8', '#9a9a9a')), 0.2, 1.4, 0.52); }
      a(box(1.0, 0.5, 0.05, G('#8cc2e8', '#9a9a9a')), -0.6, 0.5, 0.26); a(box(0.3, 0.6, 0.05, G(door, '#777777')), 0.3, 0.33, 0.26);
      a(box(0.9, 0.7, 1.0, W('#bfc3c8')), 0.95, 0.38, -0.55); a(box(0.3, 0.06, 0.4, G('#b07a44', '#888888')), 0.55, 0.85, 0.15);
    };
    const FAC = ['#f4f3ef', '#e3d4b8', '#bfc3c8'], DOOR = ['#2f6fb0', '#c8402f', '#e8b02a', '#3f8a4a', '#ec7a26', '#2b2d33'];
    [[-5.98, -4.65, 0.16], [5.6, -4.65, 0.16], [-6.02, -2.3, 2.96], [5.99, -2.29, -2.97], [-1.42, -2.23, -2.48], [1.92, -1.82, 2.48], [-3.01, -0.71, -2.06], [3.03, -0.69, 2.09],
      [-1.76, 0.1, 0.46], [1.32, -0.13, -0.45], [-5.16, 3.49, 2.16], [5.22, 3.49, -2.16], [-2.73, 3.04, -0.98], [2.79, 3.04, 0.98], [-1.53, 3.83, -0.21], [1.59, 3.82, 0.21],
      [-2.93, 5.71, 2.93], [2.98, 5.71, -2.93], [-2.6, -6.2, -0.53], [2.75, -6.2, 0.52]].forEach(([x, z, ry], i) => mod(x, z, ry, FAC[i % 3], i % 2 === 0, DOOR[i % 6]));
    for (const [x, z] of [[-6.2, 1.4], [6.2, 1.4], [-0.1, -0.6], [-6.1, 4.6], [6.2, 4.7], [-4.0, -4.4], [4.0, -4.4], [0.1, 4.1], [-3.3, 1.6], [3.4, 1.7]]) tinyTree(x, z, 0.32);
    return bakeStatic(g);
  }
  if (kind === 'medieval') {                     // Nível 24 (Medieval): burgo murado — muralha com torres e portão, ruas de pedra, praça com fonte
    // e barracas, casas de telhado terroso (enxaimel, reboco, pedra), patamares com muros de arrimo e o castelo no alto
    const STN = G('#a19a8c', '#a3a3a3'), STL = G('#c3baa8', '#bdbdbd'), SLT = G('#5c626a', '#7a7a7a'), GR = G('#8a985c', '#a3a3a3'), COB = G('#8a8378', '#8f8f8f'), DK = G('#2a2622', '#5a5a5a');
    const Y0 = 0.42, Y1 = 0.72, Y2 = 1.32;                                               // chão da parte baixa, do patamar do meio e do alto
    add(box(15, 0.3, 15, G('#b3a893', '#b5b5b5')), 0, 0.15, 0); add(box(14, 0.12, 14, GR), 0, 0.36, 0);
    add(box(14, Y1 - Y0, 10.2, GR), 0, Y0 + (Y1 - Y0) / 2, 1.9); add(box(14, Y1 - Y0 + 0.12, 0.16, STN), 0, Y0 + (Y1 - Y0) / 2 + 0.06, -3.2);   // patamar do meio + muro
    add(box(4.9, Y2 - Y1, 4.7, GR), 4.55, Y1 + (Y2 - Y1) / 2, 4.65); add(box(4.9, Y2 - Y1 + 0.12, 0.16, STN), 4.55, Y1 + (Y2 - Y1) / 2 + 0.06, 2.3); add(box(0.16, Y2 - Y1 + 0.12, 4.7, STN), 2.1, Y1 + (Y2 - Y1) / 2 + 0.06, 4.65);
    // muralha com ameias, torres nos cantos (telhado cônico de ardósia) e portão no meio do fundo
    const WH = 1.25;
    for (const [x, z, w, d] of [[-3.95, -7, 6.1, 0.4], [3.95, -7, 6.1, 0.4], [0, 7, 14.4, 0.4], [-7, 0, 0.4, 14.4], [7, 0, 0.4, 14.4]]) {
      add(box(w, WH, d, STN), x, 0.3 + WH / 2, z);
      const n = Math.round(Math.max(w, d) / 0.55);
      for (let k = 0; k < n; k++) { const u = -Math.max(w, d) / 2 + (k + 0.5) * Math.max(w, d) / n; add(box(w > d ? 0.26 : 0.4, 0.2, w > d ? 0.4 : 0.26, STN), x + (w > d ? u : 0), 0.3 + WH + 0.1, z + (w > d ? 0 : u)); }
    }
    for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { add(cyl(0.62, 0.66, 1.9, STN, 10), x, 0.3 + 0.95, z); add(cone(0.78, 1.1, SLT, 10), x, 0.3 + 1.9 + 0.55, z); }
    for (const sx of [-1, 1]) { add(box(1.0, 2.0, 1.1, STN), sx * 1.0, 0.3 + 1.0, -7); for (const dx of [-0.32, 0.32]) add(box(0.24, 0.24, 0.24, STN), sx * 1.0 + dx, 0.3 + 2.12, -7.3); add(box(0.5, 0.32, 0.03, G('#a8322a', '#8a8a8a')), sx * 1.0 + 0.25, 0.3 + 2.85, -7.0); add(cyl(0.025, 0.025, 0.75, DK, 4), sx * 1.0, 0.3 + 2.55, -7.0); }
    add(box(1.0, 0.7, 1.0, STN), 0, 0.3 + 1.55, -7); add(box(0.62, 0.95, 1.06, DK), 0, 0.3 + 0.475, -7);
    // ruas de pedra: do portão até a praça (sobe a ladeira), rua da parte baixa, contorno da praça e o caminho até o castelo
    const road = (pts, y, w = 0.62) => {
      for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az); add(box(w, 0.05, len, COB), (ax + bx) / 2, y + 0.025, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0); }
      for (const [x, z] of pts) add(cyl(w / 2, w / 2, 0.05, COB, 10), x, y + 0.026, z);
    };
    road([[0, -6.8], [0.15, -5.3], [0, -3.3]], Y0); add(box(0.62, 0.05, Math.hypot(0.9, Y1 - Y0), COB), 0, (Y0 + Y1) / 2 + 0.03, -2.8, -Math.atan2(Y1 - Y0, 0.9), 0, 0);
    road([[-6.2, -5.3], [-3, -5.45], [0.15, -5.3], [3.2, -5.4], [6.2, -5.3]], Y0);
    road([[0, -2.35], [0, -1.45], [-1.6, -1.45], [-1.6, 1.5], [1.6, 1.5], [1.6, -1.45], [0, -1.45]], Y1);
    road([[0, 1.5], [0, 3.1], [1.7, 3.2]], Y1); road([[-1.6, 0], [-4.2, 0.2], [-5.6, 2.8]], Y1); road([[1.6, 0], [4.8, -0.2], [5.4, 1.4]], Y1);
    add(box(1.6, 0.05, 0.62, COB), 2.65, (Y1 + Y2) / 2 + 0.03, 3.25, 0, 0, Math.atan2(Y2 - Y1, 1.6)); road([[3.45, 3.25], [4.4, 3.4], [4.6, 3.8]], Y2);
    // praça: lajes claras, fonte com água e 4 barracas com toldos listrados
    add(box(3.0, 0.04, 2.7, STL), 0, Y1 + 0.03, 0.03); add(cyl(0.62, 0.62, 0.05, COB, 16), 0, Y1 + 0.06, 0.03);
    add(cyl(0.32, 0.34, 0.16, STL, 8), 0, Y1 + 0.15, 0.03); add(cyl(0.26, 0.26, 0.04, G('#5f8ea8', '#9a9a9a'), 8), 0, Y1 + 0.22, 0.03); add(cyl(0.05, 0.06, 0.35, STL, 6), 0, Y1 + 0.35, 0.03); add(cyl(0.14, 0.06, 0.06, STL, 8), 0, Y1 + 0.46, 0.03);
    [[-0.95, -0.85, '#b8342a'], [0.95, -0.85, '#2f5a9a'], [-0.95, 0.9, '#d9a62a'], [0.95, 0.9, '#3f7a46']].forEach(([x, z, c]) => {
      add(box(0.5, 0.18, 0.3, G('#94693f', '#8a8a8a')), x, Y1 + 0.14, z);
      for (let k = 0; k < 3; k++) add(box(0.18, 0.03, 0.42, G(k % 2 ? '#efe1c4' : c, '#c4c4c4')), x - 0.17 + k * 0.17, Y1 + 0.42, z, z < 0 ? 0.3 : -0.3, 0, 0);
      for (const sx of [-1, 1]) add(box(0.03, 0.4, 0.03, G('#6e4a2e', '#7a7a7a')), x + sx * 0.23, Y1 + 0.24, z);
    });
    // casas medievais: corpo (reboco, ocre, rosado, enxaimel ou pedra), telhado de duas águas terroso, porta e janelinhas acesas
    const ROOFS = ['#b0582f', '#97382a', '#7a4a2a', '#5c626a'], FACS = ['#efe3c6', '#dcb878', '#dcae9e', '#eadcbc', '#a19a8c'];
    const mh = (x, z, ry, y, i, two = i % 3 === 0) => {
      const gg = new THREE.Group(); gg.position.set(x, y, z); gg.rotation.y = ry; g.add(gg);
      const a = (m, px, py, pz, rx = 0) => gg.add(at(m, px, py, pz, rx, 0, 0)), hh = two ? 0.95 : 0.62, fc = FACS[i % 5], rc = G(ROOFS[(i * 3 + 1) % 4], '#8c8c8c');
      a(box(0.9, hh, 0.72, G(fc, '#cfcfcf')), 0, hh / 2, 0);
      for (const s of [-1, 1]) a(box(0.94, 0.05, 0.5, rc), 0, hh + 0.17, s * 0.19, s * 0.72);
      if (i % 5 === 3) for (const px of [-0.3, 0, 0.3]) a(box(0.04, hh, 0.02, G('#4b3322', '#666666')), px, hh / 2, 0.37);
      a(box(0.18, 0.32, 0.02, G(['#6b4428', '#3f6b3a', '#2f5a8a', '#8e2e22'][i % 4], '#5c5c5c')), -0.18, 0.16, 0.37);
      for (const py of two ? [0.3, 0.68] : [0.33]) a(box(0.16, 0.14, 0.02, G('#ffd88a', '#bdbdbd')), 0.2, py, 0.37);
      if (i % 4 === 1) a(box(0.1, 0.32, 0.1, STN), 0.3, hh + 0.3, -0.05);
    };
    let k = 0;
    for (const x of [-5.7, -4.7, -3.7, -1.8, 1.9, 2.9, 3.9, 5.5]) mh(x, -6.15, 0, Y0, k++);                         // parte baixa: fileiras dos dois lados da rua
    for (const x of [-5.5, -4.5, -2.6, 2.5, 3.5, 4.5, 5.6]) mh(x, -4.45, Math.PI, Y0, k++);
    for (const [x, z, ry] of [[-1.2, -2.3, Math.PI], [1.25, -2.3, Math.PI], [-2.55, -0.6, Math.PI / 2], [-2.55, 0.65, Math.PI / 2], [2.55, -0.6, -Math.PI / 2], [2.6, 0.7, -Math.PI / 2],
      [-5.3, -1.3, 0.3], [-6.1, 1.4, 1.2], [-4.7, 3.6, 0.6], [-3.3, 1.7, 0], [-1.2, 2.55, 0], [-2.4, 4.6, 0], [-0.9, 4.7, 0], [-5.5, 5.7, 0], [-3.9, 5.9, 0], [1.0, 5.6, 0], [5.0, -1.5, 0], [6.0, 0.4, -1.4], [3.4, 1.0, Math.PI]]) mh(x, z, ry, Y1, k++);
    // castelo no alto: muralhas, 4 torres redondas com cones, torre de menagem e bandeiras
    const cx = 4.75, cz = 5.2, cy = Y2;
    add(box(2.6, 0.9, 2.2, STN), cx, cy + 0.45, cz);
    for (const [dx, dz] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]]) { add(cyl(0.38, 0.4, 1.6, STN, 10), cx + dx, cy + 0.8, cz + dz); add(cone(0.5, 0.9, SLT, 10), cx + dx, cy + 1.6 + 0.45, cz + dz); add(box(0.2, 0.13, 0.02, G(dx * dz > 0 ? '#2f4f8f' : '#a8322a', '#8a8a8a')), cx + dx + 0.1, cy + 2.7, cz + dz); add(cyl(0.015, 0.015, 0.4, DK, 4), cx + dx, cy + 2.6, cz + dz); }
    add(box(1.0, 2.6, 1.0, STN), cx + 0.05, cy + 1.3, cz + 0.3); add(cone(0.78, 1.0, SLT, 4), cx + 0.05, cy + 3.1, cz + 0.3, 0, Math.PI / 4, 0);
    add(box(0.18, 0.12, 0.02, G('#d9a62a', '#8a8a8a')), cx + 0.15, cy + 3.95, cz + 0.3); add(cyl(0.015, 0.015, 0.45, DK, 4), cx + 0.05, cy + 3.8, cz + 0.3);
    for (const dy of [0.95, 1.5, 2.05]) for (const dx of [-0.22, 0.22]) add(box(0.1, 0.18, 0.02, G('#ffd88a', '#bdbdbd')), cx + 0.05 + dx, cy + dy, cz - 0.21);
    add(box(0.42, 0.55, 0.02, DK), cx, cy + 0.28, cz - 1.11); add(box(0.4, 0.28, 0.02, G('#2f4f8f', '#8a8a8a')), cx, cy + 0.72, cz - 1.12);
    add(box(2.6, 0.03, 1.0, STL), cx, cy + 0.02, cz - 1.7);
    for (const [x, z] of [[-6.2, -3.9], [6.2, -3.8], [-6.1, 6.2], [2.1, -3.9], [-3.6, -3.8], [5.9, 2.6]]) { add(cyl(0.06, 0.08, 0.4, G('#6b4526', '#6a6a6a'), 6), x, (z > -3.2 ? Y1 : Y0) + 0.2, z); add(sphere(0.34, G('#5e8f3a', '#8a8a8a'), 7, 5), x, (z > -3.2 ? Y1 : Y0) + 0.55, z); }
    return bakeStatic(g);
  }
  if (kind === 'canyon') {                       // Nível 23 (Cachoeira): duas margens, desfiladeiro fundo, ponte alta e a cachoeira gigante no fundo
    const ROCKC = G('#8c7b66', '#8a8a8a'), ROCK2 = G('#76664f', '#7a7a7a'), WATERC = G('#4aa0d8', '#9a9a9a'), FOAM = G('#f2fbff', '#d6d6d6');
    for (const s of [-1, 1]) {
      add(box(5.6, 3.2, 15, G('#d4cdbb', '#b9b9b9')), s * 4.4, -1.2, 0);                 // margem (terra + pedra)
      add(box(5.4, 0.12, 14.6, G('#95cc68', '#a3a3a3')), s * 4.4, 0.42, 0);
      add(box(0.7, 3.4, 15, ROCKC), s * 1.75, -1.3, 0);                                 // paredão do desfiladeiro
      for (let z = -6.5; z <= 6.5; z += 1.3) add(box(0.5, 0.8 + (Math.abs(z * 7) % 3) * 0.3, 1.1, ROCK2), s * 1.45, -1.9 + (Math.abs(z * 3) % 2) * 0.7, z);
      add(box(1.0, 0.06, 14.6, ROADC), s * 2.75, 0.5, 0);                                // rua da beira
      add(box(0.12, 0.35, 14.6, G('#d6d0c4', '#bdbdbd')), s * 2.15, 0.62, 0);           // mureta
      add(box(0.5, 0.9, 15, G('#3f7d3a', '#7a7a7a')), s * 7.0, 0.85, 0);               // sebe de fora
      for (const z of [-4.6, -1.0, 4.4]) house(s * 4.9, z, roof(Math.abs(Math.round(z + s * 3 + 9))), 0.55);
      add(box(4.4, 0.06, 0.9, ROADC), s * 4.9, 0.5, 2.4);
    }
    add(box(2.6, 0.12, 15, WATERC), 0, -2.75, 0);                                           // rio no fundo
    for (const z of [-5.4, -2, 3.5]) add(box(0.6, 0.14, 0.12, FOAM), Math.sin(z) * 0.5, -2.66, z);
    // ponte alta: tabuleiro, guarda-corpos, arco e pilares
    add(box(4.4, 0.22, 1.1, G('#a7a196', '#9a9a9a')), 0, 0.42, 1.0); add(box(4.4, 0.04, 0.8, ROADC), 0, 0.55, 1.0);
    for (const z of [0.5, 1.5]) add(box(4.4, 0.24, 0.08, G('#5b6168', '#7a7a7a')), 0, 0.66, z);
    for (let k = -4; k <= 4; k++) { const x = k * 0.36, y = -1.6 + 1.6 * (1 - (x / 1.6) ** 2); add(box(0.4, 0.24, 0.8, G('#9d978b', '#8f8f8f')), x, y, 1.0); }
    for (const x of [-0.7, 0.7]) add(box(0.3, 2.6, 0.7, G('#9d978b', '#8f8f8f')), x, -1.5, 1.0);
    // maciço e cachoeira no fundo (ao norte na maquete: fica de frente para a câmera)
    add(box(16, 7.4, 2.4, ROCKC), 0, 0.9, -8.4);
    for (const [x, y, w] of [[-5.5, 3.6, 3], [5.2, 3.9, 3.4], [-3.2, 4.4, 2], [3.6, 4.6, 1.8]]) add(box(w, 1.2, 1.2, ROCK2), x, y, -7.4);
    for (const x of [-6, -4.2, 4.4, 6.2, -2.4, 2.6]) { add(cyl(0.08, 0.1, 0.5, G('#6b4526', '#6a6a6a'), 5), x, 4.85, -8.6); add(cone(0.55, 1.3, G('#3f8f3a', '#8a8a8a'), 6), x, 5.6, -8.6); }
    add(box(2.0, 0.08, 2.4, WATERC), 0, 4.62, -8.4);                                       // rio no alto
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 7.4), gray ? mat('#c8c8c8') : new THREE.MeshLambertMaterial({ color: '#cfeaff', emissive: '#4a7a9a', emissiveIntensity: 0.3 }));
    fall.position.set(0, 0.9, -7.15); g.add(fall);
    for (let k = 0; k < 6; k++) add(box(0.08, 6.6, 0.04, FOAM), -0.85 + k * 0.34, 1.1, -7.1);
    add(sphere(1.2, FOAM, 8, 6), 0, -2.5, -6.6); add(sphere(0.9, FOAM, 8, 6), 0.9, -2.3, -6.0); add(sphere(0.8, FOAM, 8, 6), -0.9, -2.3, -6.1);
    return bakeStatic(g);
  }
  if (kind === 'night') {                        // Nível 19 (Penumbra): ruas escuras, prédios, postes acesos e painéis luminosos
    const Y = 0.4, ASF = G('#22262e', '#6e6e6e'), lum = (c) => G(c, '#9a9a9a'), EM = c => (gray ? mat('#9a9a9a') : new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
    add(box(13.6, 0.08, 13.6, G('#2c3038', '#8a8a8a')), 0, Y + 0.02, 0);
    add(box(13.6, 0.1, 3.2, ASF), 0, Y + 0.06, 0.6); add(box(3.0, 0.1, 13.6, ASF), 0.4, Y + 0.06, 0);   // avenida + rua (cruzamento)
    for (let x = -6; x <= 6; x += 1.6) add(box(0.7, 0.11, 0.12, G('#f2d45c', '#bbbbbb')), x, Y + 0.08, 0.6);
    const tower = (x, z, w, d, h, c) => add(box(w, h, d, G(c, '#9a9a9a')), x, Y + h / 2, z);
    tower(-4.2, -4.0, 3.6, 3.4, 7.5, '#3a4258'); tower(4.6, -4.2, 3.4, 3.4, 9.5, '#2e3446'); tower(-4.4, 4.6, 3.6, 3.2, 6, '#40485e'); tower(4.4, 4.4, 3.6, 3.4, 5, '#4a4258');
    const panel = (x, y, z, w, h, ry, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), EM(c)); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); };
    panel(-2.35, 4.6, -4.0, 2.4, 3.6, Math.PI / 2, '#ff4ad8'); panel(2.85, 6.2, -4.2, 2.4, 4.2, -Math.PI / 2, '#4ae8ff'); panel(-4.2, 6.0, -2.2, 3.0, 1.5, 0, '#ff7a1a');
    panel(4.6, 7.4, -2.45, 3.0, 1.6, 0, '#ffd84a'); panel(-2.55, 3.4, 4.6, 2.0, 2.6, Math.PI / 2, '#7aff6a'); panel(2.55, 3.2, 4.4, 2.0, 2.4, -Math.PI / 2, '#ff6a4a');
    for (const [x, z] of [[-1.6, -1.4], [2.4, -1.4], [-1.6, 2.6], [2.4, 2.6]]) { add(cyl(0.08, 0.1, 2.2, G('#1a1c22', '#7a7a7a'), 6), x, Y + 1.1, z); const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), EM('#ffd890')); b.position.set(x, Y + 2.3, z); g.add(b); }
    return bakeStatic(g);
  }
  if (kind === 'farmThumb') {                    // Nível 15 (Colheita), só na miniatura da seleção: estrada de terra sinuosa com bifurcação,
    // casa com varanda, celeiro vermelho, casinha, cercas com porteira, milharal, pomar, trator, galinhas, feno e caixa-d'água
    const Y = 0.4, DIRT = '#c19a68', WOODC = '#8a5a34', WOODL = '#b98a56';
    const road = (pts, w = 1.25) => {                     // trechos retos + juntas redondas = curva suave
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
        add(box(w, 0.06, len, DIRT), (ax + bx) / 2, Y + 0.03, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
      }
      for (const [x, z] of pts) add(cyl(w / 2, w / 2, 0.06, DIRT, 14), x, Y + 0.031, z);
    };
    const fork = [0.5, 0.9];
    road([[-0.4, 6.9], [0.5, 5.0], [-0.1, 2.8], fork]);                          // principal (vem da beira de baixo)
    road([fork, [-1.4, -0.5], [-3.2, -1.0], [-5.2, -0.8], [-6.9, -1.3]]);       // ramo da esquerda
    road([fork, [2.1, -0.6], [2.7, -2.8], [2.3, -5.0], [2.7, -6.9]]);           // ramo da direita
    road([[-3.4, -1.1], [-3.6, -2.8]], 0.8);                                      // acessos às propriedades
    road([[2.65, -3.3], [3.7, -3.6]], 0.8);
    road([[0.3, 3.4], [2.4, 2.6]], 0.8);
    // cercas de madeira (postes + 2 travessas) e porteira
    const fence = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.9));
      for (let k = 0; k <= n; k++) add(box(0.14, 0.62, 0.14, G(WOODC, '#7a7a7a')), ax + (bx - ax) * k / n, Y + 0.31, az + (bz - az) * k / n);
      for (const y of [0.24, 0.48]) add(box(0.07, 0.08, len, G(WOODC, '#7a7a7a')), (ax + bx) / 2, Y + y, (az + bz) / 2, 0, ry, 0);
    };
    const gate = (x, z, ry, w = 1.1) => {                 // porteira (madeira clara com travessa diagonal)
      const gg = new THREE.Group(); gg.position.set(x, Y, z); gg.rotation.y = ry; g.add(gg);
      for (const y of [0.18, 0.36, 0.54]) gg.add(at(box(w, 0.08, 0.08, G(WOODL, '#9a9a9a')), 0, y, 0));
      gg.add(at(box(Math.hypot(w, 0.4), 0.08, 0.08, G(WOODL, '#9a9a9a')), 0, 0.36, 0, 0, 0, Math.atan2(0.4, w)));
      for (const sx of [-1, 1]) gg.add(at(box(0.18, 0.78, 0.18, G(WOODC, '#7a7a7a')), sx * (w / 2 + 0.09), 0.39, 0));
    };
    // casa rural com varanda (canto de cima, à esquerda)
    const HX = -3.8, HZ = -4.3, wallC = G('#f3e6c8', '#cfcfcf');
    add(box(3.0, 1.7, 2.2, wallC), HX, Y + 0.85, HZ);
    const prism = (w, h, d, c, x, y, z) => {             // telhado de duas águas (cumeeira ao longo de x)
      const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
      const m = new THREE.Mesh(geo, mat(c)); m.rotation.y = Math.PI / 2; m.castShadow = m.receiveShadow = true; m.position.set(x, y, z); g.add(m);
    };
    prism(3.4, 1.1, 2.7, G('#3f6fb0', '#8c8c8c'), HX, Y + 1.7, HZ);
    add(box(3.0, 0.1, 1.0, G(WOODL, '#a0a0a0')), HX, Y + 0.12, HZ + 1.6);                                  // varanda: piso, colunas e cobertura
    for (const dx of [-1.35, 0, 1.35]) add(box(0.12, 1.1, 0.12, G('#ffffff', '#dddddd')), HX + dx, Y + 0.65, HZ + 2.0);
    add(box(3.2, 0.1, 1.2, G('#3f6fb0', '#8c8c8c')), HX, Y + 1.25, HZ + 1.6, -0.12, 0, 0);
    add(box(0.55, 0.95, 0.06, G('#6b4428', '#5c5c5c')), HX + 0.5, Y + 0.48, HZ + 1.12);
    for (const dx of [-0.8, 1.15]) add(box(0.5, 0.45, 0.06, G('#9fd3f0', '#bdbdbd')), HX + dx - 0.2, Y + 0.95, HZ + 1.12);
    fence(-6.4, -6.4, -6.4, -2.0); fence(-6.4, -2.0, -4.3, -2.0); fence(-2.9, -2.0, -1.4, -2.0); fence(-1.4, -2.0, -1.4, -6.4);
    gate(-3.6, -2.0, 0, 1.3);
    // caixa-d'água (atrás da casa)
    for (const [dx, dz] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) add(box(0.1, 1.5, 0.1, G('#7a5a3a', '#7a7a7a')), -5.6 + dx, Y + 0.75, -5.7 + dz);
    add(cyl(0.6, 0.6, 0.8, G('#5a8fc0', '#8a8a8a'), 12), -5.6, Y + 1.9, -5.7); add(cone(0.66, 0.35, G('#4a6f96', '#7a7a7a'), 12), -5.6, Y + 2.47, -5.7);
    // celeiro vermelho (canto de cima, à direita) + fardos de feno
    const BX = 5.0, BZ = -3.9;
    add(box(2.6, 2.0, 3.0, G('#b8382e', '#9a9a9a')), BX, Y + 1.0, BZ);
    { const sh = new THREE.Shape(); sh.moveTo(-1.5, 0); sh.lineTo(1.5, 0); sh.lineTo(0, 1.3); sh.closePath();   // telhado (cumeeira ao longo de z)
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 3.3, bevelEnabled: false }); geo.translate(0, 0, -1.65);
      const m = new THREE.Mesh(geo, mat(G('#6e737a', '#7a7a7a'))); m.position.set(BX, Y + 2.0, BZ); m.rotation.y = Math.PI / 2; m.castShadow = true; g.add(m); }
    add(box(0.06, 1.4, 1.5, G('#f4efe6', '#dddddd')), BX - 1.31, Y + 0.72, BZ);                              // portão branco com X
    for (const r of [0.75, -0.75]) add(box(0.07, 1.9, 0.12, G('#f4efe6', '#dddddd')), BX - 1.33, Y + 0.72, BZ, r, 0, 0);
    for (const [x, z] of [[4.2, -1.6], [5.1, -1.7], [4.65, -1.2]]) add(cyl(0.38, 0.38, 0.62, G('#e6c35a', '#b0b0b0'), 10), x, Y + 0.38, z, 0, 0, Math.PI / 2);
    fence(3.4, -2.2, 3.4, -3.1); fence(3.4, -4.3, 3.4, -6.4); gate(3.4, -3.7, Math.PI / 2, 1.0);
    // milharal (embaixo, à esquerda; fileiras altas) com cerca e porteira
    for (let x = -5.9; x <= -2.9; x += 0.6) for (let z = 1.3; z <= 4.3; z += 0.6) { add(box(0.2, 1.1, 0.2, G('#6aa03a', '#9c9c9c')), x, Y + 0.55, z); add(box(0.12, 0.22, 0.12, G('#f2cf4a', '#b8b8b8')), x + 0.08, Y + 0.95, z); }
    fence(-6.4, 0.7, -2.3, 0.7); fence(-6.4, 0.7, -6.4, 4.9); fence(-6.4, 4.9, -2.3, 4.9); fence(-2.3, 0.7, -2.3, 2.2); fence(-2.3, 3.4, -2.3, 4.9);
    gate(-2.3, 2.8, Math.PI / 2, 1.1);
    // casinha menor + galinhas (embaixo, à direita, junto do acesso)
    house(4.4, 1.9, G('#c8573a', '#8c8c8c'), 0.62);
    for (const [x, z, r] of [[2.9, 1.5, 0.3], [3.3, 1.1, 2.1], [2.6, 1.0, 4.2], [3.5, 1.6, 1.0]]) {
      add(sphere(0.2, G('#ffffff', '#dddddd'), 7, 5), x, Y + 0.24, z); add(sphere(0.12, G('#ffffff', '#dddddd'), 6, 4), x + Math.cos(r) * 0.18, Y + 0.42, z + Math.sin(r) * 0.18);
      add(box(0.06, 0.1, 0.1, G('#e0402a', '#9a9a9a')), x + Math.cos(r) * 0.18, Y + 0.55, z + Math.sin(r) * 0.18);
    }
    // pomar (poucas árvores redondas com frutas) com cerca baixa
    for (const [x, z] of [[3.2, 4.4], [4.9, 4.2], [3.6, 5.9], [5.4, 5.7]]) {
      add(cyl(0.12, 0.15, 0.7, G('#6b4526', '#6a6a6a'), 6), x, Y + 0.35, z); add(sphere(0.62, G('#3f8f3a', '#8a8a8a'), 8, 6), x, Y + 1.1, z);
      for (const [dx, dy, dz] of [[0.4, 0.15, 0.35], [-0.35, 0.05, 0.4], [0.05, 0.35, 0.5]]) add(sphere(0.1, G('#e0402a', '#9a9a9a'), 5, 4), x + dx, Y + 1.1 + dy, z + dz);
    }
    fence(2.3, 3.4, 6.4, 3.4); fence(6.4, 3.4, 6.4, 6.4);
    // trator verde na estrada principal
    const tr = new THREE.Group(); tr.position.set(0.2, Y, 4.1); tr.rotation.y = Math.atan2(0.6, -2.2); g.add(tr);
    tr.add(at(box(0.8, 0.5, 1.5, G('#3f9a3a', '#8a8a8a')), 0, 0.55, 0.15)); tr.add(at(box(0.8, 0.8, 0.7, G('#3f9a3a', '#8a8a8a')), 0, 0.95, -0.35));
    tr.add(at(box(0.7, 0.5, 0.06, G('#9fd3f0', '#bdbdbd')), 0, 1.0, 0.0)); tr.add(at(box(0.9, 0.08, 0.8, G('#f2cf4a', '#a0a0a0')), 0, 1.4, -0.35));
    for (const sx of [-1, 1]) { tr.add(at(cyl(0.42, 0.42, 0.24, G('#222222', '#444444'), 12), sx * 0.52, 0.42, -0.4, 0, 0, Math.PI / 2)); tr.add(at(cyl(0.24, 0.24, 0.18, G('#222222', '#444444'), 10), sx * 0.45, 0.24, 0.65, 0, 0, Math.PI / 2)); }
    tr.add(at(cyl(0.05, 0.05, 0.5, G('#333333', '#555555'), 6), 0.2, 1.05, 0.5));
    return bakeStatic(g);
  }
  if (kind === 'farm') {                         // Nível 15 (Colheita): estrada de terra, celeiro, casinha, milharal, pasto e cerca
    add(box(13.6, 0.1, 13.6, G('#86b85c', '#a3a3a3')), 0, 0.42, 0);
    add(box(2.0, 0.12, 14, G('#b8956a', '#9a9a9a')), -1.2, 0.47, 0, 0, 0.18, 0); add(box(7, 0.12, 2.0, G('#b8956a', '#9a9a9a')), 3, 0.47, 1.5, 0, -0.2, 0);
    add(box(3.0, 2.2, 2.6, G('#b8382e', '#9a9a9a')), -4.4, 1.55, -3.6); add(cone(2.6, 1.4, G('#6e737a', '#7a7a7a'), 4), -4.4, 3.35, -3.6, 0, Math.PI / 4, 0);
    house(3.8, -3.8, G('#3f6fb0', '#8c8c8c'), 0.8);
    for (let x = 1.6; x < 6.4; x += 0.6) for (let z = 3.4; z < 6.2; z += 0.6) add(box(0.14, 0.9, 0.14, G('#7fae3a', '#9c9c9c')), x, 0.9, z);
    for (const [x, z] of [[-5.4, 3.4], [-3.4, 5.2]]) { add(box(0.9, 0.45, 0.45, G('#f4f1ea', '#c8c8c8')), x, 0.75, z); add(box(0.3, 0.3, 0.3, G('#f4f1ea', '#c8c8c8')), x + 0.55, 0.9, z); }
    for (let x = -6.4; x <= -2; x += 0.9) add(box(0.1, 0.5, 0.1, G('#8a6a44', '#7a7a7a')), x, 0.7, 1.9);
    add(cyl(0.35, 0.35, 0.45, G('#e6c35a', '#b0b0b0'), 8), -1.4, 0.7, -5.6, 0, 0, Math.PI / 2);
    return bakeStatic(g);
  }
  if (kind === 'flux') {                         // Nível 14 (Fluxo): avenida larga com canteiro, semáforo, carros e um prédio de vidro
    add(box(14, 0.42, 4.4, ROADC), 0, 0.22, 0.4);
    add(box(2.2, 0.42, 14, ROADC), -3.5, 0.22, 0); add(box(2.2, 0.42, 14, ROADC), 3.5, 0.22, 0);
    add(box(4.6, 0.5, 0.8, G('#6fae4f', '#9c9c9c')), -0.1, 0.45, 0.4); add(box(4.6, 0.5, 0.8, G('#6fae4f', '#9c9c9c')), 5.6, 0.45, 0.4); add(box(1.6, 0.5, 0.8, G('#6fae4f', '#9c9c9c')), -6.2, 0.45, 0.4);
    for (const [x, z, c] of [[-5.5, -0.5, '#d8473a'], [1.4, -0.5, '#3a78d4'], [-1.6, 1.3, '#efbf2a'], [5.4, 1.3, '#3c9d55']]) { add(box(1.3, 0.5, 0.7, G(c, '#8a8a8a')), x, 0.65, z); add(box(0.7, 0.35, 0.6, G('#dfe6ee', '#b0b0b0')), x - 0.1, 1.05, z); }
    add(box(0.12, 1.8, 0.12, G('#3a3d44', '#6a6a6a')), -2.2, 1.3, -1.6); add(box(0.35, 0.8, 0.35, G('#2a2d33', '#5a5a5a')), -2.2, 2.4, -1.6);
    add(sphere(0.12, G('#22e05a', '#8a8a8a'), 6, 4), -2.2, 2.2, -1.42);
    add(box(2.6, 4.2, 2.4, G('#f1f1ec', '#c8c8c8')), 0, 2.5, -4.6); add(box(2.2, 3.0, 2.0, G('#f1f1ec', '#c8c8c8')), 0.4, 6.1, -4.9);
    add(box(2.0, 2.8, 0.08, G('#4f86c6', '#8f8f8f')), 0.4, 6.1, -3.86); add(box(2.2, 1.4, 0.08, G('#4f86c6', '#8f8f8f')), 0, 1.4, -3.36);
    house(5.4, -4.6, roof(0), 0.8); house(-5.4, -4.6, roof(1), 0.8); house(-5.4, 4.8, roof(2), 0.8); house(0, 4.8, roof(3), 0.8); house(5.4, 4.8, roof(0), 0.8);
    return bakeStatic(g);
  }
  if (kind === 'favela') {                       // Nível 13 (Morro): 3 patamares, rua em zigue-zague e casinhas coloridas de laje
    const WALLC = G('#9a9285', '#a0a0a0'), TOP = G('#b3a993', '#b0b0b0');
    add(box(13.4, 1.4, 8.6, WALLC), 0, 0.4 + 0.7, -2.3); add(box(13.4, 0.1, 8.6, TOP), 0, 1.85, -2.3);
    add(box(13.4, 1.4, 4.2, WALLC), 0, 1.8 + 0.7, -4.5); add(box(13.4, 0.1, 4.2, TOP), 0, 3.25, -4.5);
    for (const [x, y, z, l, r] of [[0, 0.46, 4.2, 9, 0.25], [-4.2, 1.92, 0.4, 7, -0.35], [2.5, 3.32, -4.0, 8, 0.2]]) add(box(l, 0.1, 1.4, ROADC), x, y, z, 0, r, 0);
    const COLS = ['#3f7fc4', '#f0c43a', '#ee7a5f', '#5cae5a', '#dcc79e', '#b5603d'];
    let k = 0;
    for (const [y, z0, z1] of [[0.4, 5.6, 6.4], [0.4, 1.6, 2.4], [1.8, -0.8, -1.2], [1.8, 2.0 - 4.2, -2.6], [3.2, -5.6, -6.2]]) for (let x = -5.6; x <= 5.6; x += 1.6) {
      const hh = 0.6 + ((k * 7) % 3) * 0.35, z = (z0 + z1) / 2 + ((k * 5) % 3 - 1) * 0.15;
      add(box(1.3, hh, 1.2, G(COLS[k % 6], '#c4c4c4')), x, y + hh / 2, z);
      if (k % 3 === 0) add(cyl(0.22, 0.22, 0.3, G('#1f78d1', '#8a8a8a'), 8), x + 0.2, y + hh + 0.15, z);
      k++;
    }
    for (let i = 0; i < 6; i++) add(box(0.9, 0.2 * (i + 1), 0.35, G('#cfc6b4', '#bdbdbd')), 3.8, 0.4 + 0.1 * (i + 1), 2.0 - i * 0.35);   // escadaria
    return bakeStatic(g);
  }

  // os outros: ruas em cruz
  add(box(14, 0.42, 2.2, ROADC), 0, 0.22, 0);
  add(box(2.2, 0.42, 14, ROADC), 0, 0.22, 0);

  if (kind === 'hill') {                         // Bairro 9: patamar médio (fundo) e alto (fundo à direita), ladeira e escadaria
    const WALLC = G('#b9ad98', '#a5a5a5'), TOP = G('#95cc68', '#a3a3a3');
    add(box(13.4, 1.6, 6.4, WALLC), 0, 0.4 + 0.8, -3.5); add(box(13.4, 0.1, 6.4, TOP), 0, 2.05, -3.5);
    add(box(6.6, 1.6, 3.4, WALLC), 3.3, 2.0 + 0.8, -5.0); add(box(6.6, 0.1, 3.4, TOP), 3.3, 3.65, -5.0);
    const ang = Math.atan2(1.6, 3.0);
    add(box(1.6, 0.2, Math.hypot(3, 1.6), ROADC), -4.5, 1.2, 1.2, ang, 0, 0);          // ladeira (sobe para o fundo)
    for (let k = 0; k < 6; k++) add(box(1.2, 0.27 * (k + 1), 0.5, G('#d8cfbe', '#bdbdbd')), 1.5, 0.4 + 0.135 * (k + 1), 2.2 - k * 0.5);   // escadaria
    house(-4.2, -3.8, roof(0), 0.8); house(-0.6, -3.8, roof(1), 0.8); house(3.6, 3.6, roof(2), 0.9); house(-3.2, 4.2, roof(3), 0.9);
    add(box(2.6, 5.2, 2.4, G('#9ea2a9', '#9a9a9a')), 3.6, 3.7 + 2.6, -5.0);                 // prédio no alto
    for (let f = 1; f < 4; f++) add(box(2.2, 0.4, 0.06, G('#4a6a8a', '#7a7a7a')), 3.6, 3.7 + f * 1.3, -3.78);
    return bakeStatic(g);
  }
  if (kind === 'venice') {                       // Nível 12: casas nas bordas, água em diagonal, 2 praças em L e a Rialto em diagonal
    add(box(13.6, 0.12, 13.6, G('#3f8fb0', '#8f8f8f')), 0, 0.46, 0);
    const FAC = ['#efe0bd', '#d9a441', '#c8693f', '#d99a94', '#a8432e'];
    const MAP8 = ['########', '#..##..#', '#......#', '##....##', '##....##', '#......#', '#..##..#', '#######.'];
    const P = c => -6.1 + c * 1.74;
    MAP8.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== '#') return;
      const hgt = 1.0 + ((r * 3 + c) % 3) * 0.45;
      add(box(1.3, hgt, 1.3, G(FAC[(r + c) % FAC.length], '#c4c4c4')), P(c), 0.5 + hgt / 2, P(r));
      add(box(1.4, 0.18, 1.4, G('#b5532f', '#8c8c8c')), P(c), 0.6 + hgt, P(r));
    }));
    for (const [r, c, col] of [[2, 4, '#c9bda6'], [2, 5, '#c9bda6'], [3, 5, '#c9bda6'], [1, 5, '#d9cfbd'], [2, 6, '#d9cfbd'], [1, 6, '#e9c98f'],
      [4, 2, '#c9bda6'], [5, 2, '#c9bda6'], [5, 3, '#c9bda6'], [5, 1, '#d9cfbd'], [6, 2, '#d9cfbd'], [6, 1, '#e9c98f']]) {
      add(box(1.78, 0.2, 1.78, G(col, '#b5b5b5')), P(c), 0.6, P(r));
      if (col === '#e9c98f') add(box(1.1, 1.2, 1.1, G('#e9c98f', '#b5b5b5')), P(c), 1.3, P(r));
      if (col === '#d9cfbd') for (const [dx, dz] of [[-0.4, -0.4], [0.4, 0.4]]) add(cone(0.42, 0.25, G(['#c8402f', '#3c8f52'][(r + c) % 2], '#9a9a9a'), 8), P(c) + dx, 1.25, P(r) + dz);
    }
    const rb = new THREE.Group(); rb.position.set((P(5) + P(2)) / 2 - 0.5, 0, (P(2) + P(5)) / 2 + 0.5); rb.rotation.y = -Math.PI / 4; g.add(rb);
    for (let k = 0; k <= 10; k++) { const t = k / 10; rb.add(at(box(0.9, 0.25, 0.6, G('#ece4d2', '#c8c8c8')), 0, 0.75 + Math.sin(t * Math.PI) * 1.3, -3 + t * 6)); }
    rb.add(at(box(1.0, 0.5, 1.2, G('#b5532f', '#8c8c8c')), 0, 2.4, 0));
    add(box(1.6, 0.3, 0.7, G('#f07a1d', '#9a9a9a')), P(6.6), 0.62, P(6.6), 0, Math.PI / 4, 0);   // lancha na entrada
    return bakeStatic(g);
  }
  if (kind === 'rail') {                         // Bairro 11: bondinho nas ruas — trilhos no asfalto com curva suave, bonde e parada
    add(box(14, 0.06, 1.8, ROADC), 0, 0.43, 0); add(box(1.8, 0.06, 14, ROADC), 0, 0.43, 0);
    const pts = [];
    for (let x = -6.6; x <= -1.6; x += 0.4) pts.push([x, 0, 0]);
    for (let k = 1; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * Math.PI / 2; pts.push([-1.6 + 1.6 * Math.cos(a), 1.6 + 1.6 * Math.sin(a), k / 10 * Math.PI / 2]); }
    for (let z = 1.6; z <= 6.6; z += 0.4) pts.push([0, z, Math.PI / 2]);
    for (const [x, z, t] of pts) for (const o of [-0.22, 0.22]) add(box(0.42, 0.04, 0.07, G('#8d949b', '#9a9a9a')), x - Math.sin(t) * o, 0.48, z + Math.cos(t) * o, 0, -t, 0);
    add(box(2.6, 0.55, 0.95, G('#9e3a26', '#9a9a9a')), -4.4, 0.78, 0); add(box(2.6, 0.55, 0.95, G('#f3e6c8', '#c8c8c8')), -4.4, 1.3, 0);
    add(box(2.7, 0.1, 1.0, G('#efe9da', '#d0d0d0')), -4.4, 1.62, 0);
    for (const x of [-5.3, -4.4, -3.5]) for (const z of [-0.49, 0.49]) add(box(0.5, 0.3, 0.03, G('#2e4a63', '#7a7a7a')), x, 1.35, z);
    add(box(1.6, 0.08, 0.6, G('#9e3a26', '#8a8a8a')), -5.0, 1.5, -1.3);                           // parada
    for (const x of [-5.6, -4.4]) add(box(0.08, 1.0, 0.08, G('#3f4a52', '#8a8a8a')), x, 0.95, -1.45);
    house(3.5, -3.5, roof(0), 0.85); house(-3.5, -3.8, roof(1), 0.8); house(3.6, 3.6, roof(2), 0.85); house(-3.6, 3.8, roof(0), 0.8);
    return bakeStatic(g);
  }
  if (kind === 'canal') {                        // Bairro 10: canal norte–sul, 2 pontes, galpão de um lado e casas do outro
    add(box(2.8, 0.12, 13.6, G('#3d8fc4', '#8f8f8f')), 0, 0.46, 0);
    for (const x of [-1.45, 1.45]) add(box(0.25, 0.3, 13.6, G('#a99f8f', '#9a9a9a')), x, 0.55, 0);
    for (const z of [-3.6, 3.6]) {
      add(box(3.4, 0.25, 1.8, G('#8d8a84', '#9a9a9a')), 0, 0.62, z);
      for (const dz of [-0.85, 0.85]) add(box(3.4, 0.4, 0.15, G('#e8e2d4', '#c8c8c8')), 0, 0.92, z + dz);
    }
    add(box(4.8, 2.2, 4.4, G('#d9d4c7', '#c8c8c8')), -4.2, 0.4 + 1.1, -2.6);               // galpão
    for (const sg of [-1, 1]) add(box(5.2, 0.18, 2.5, G('#c8463a', '#8c8c8c')), -4.2, 2.95, -2.6 + sg * 1.05, -sg * 0.42, 0, 0);
    add(box(2.2, 1.5, 0.1, G('#efbf2a', '#9a9a9a')), -4.2, 0.4 + 0.75, -0.38);
    for (const [x, z] of [[-5.3, 0.6], [-4.6, 0.8]]) add(box(0.6, 0.5, 0.6, G('#b07a45', '#9a9a9a')), x, 0.65, z);   // caixas
    house(-4.2, 4.0, roof(0), 0.85); house(4.2, -3.6, roof(1), 0.85); house(4.2, 3.6, roof(2), 0.85);
    return bakeStatic(g);
  }
  if (kind === 'city' || kind === 'jam' || kind === 'jam8') {   // Bairros 6 a 8: prédios altos e acinzentados (+ 1 casinha, exceto no 8)
    (kind === 'jam8' ? [[-3.5, -3.5, 16], [3.5, -3.5, 12], [-3.5, 3.5, 10], [3.5, 3.5, 14]] : [[-3.5, -3.5, 9], [3.5, -3.5, 7], [-3.5, 3.5, 6]]).forEach(([x, z, hh], i) => {   // Bairro 8: mais altos
      add(box(3.6, hh, 3.2, G(['#9ea2a9', '#aeb1b6', '#8f939a'][i % 3], '#9a9a9a')), x, 0.4 + hh / 2, z);
      for (let f = 1; f < hh / 1.4; f++) add(box(3.0, 0.5, 0.06, G('#4a6a8a', '#7a7a7a')), x, 0.4 + f * 1.4, z + 1.62);
      add(box(0.9, 0.5, 0.9, G('#7d8188', '#8a8a8a')), x + 0.8, 0.65 + hh, z - 0.6);      // casinha de máquinas no topo
    });
    if (kind !== 'jam8') house(3.5, 3.5, roof(0));
    if (kind === 'jam' || kind === 'jam8') {                        // Bairro 7: caminhão na diagonal na rua vertical + fila de carros na horizontal
      const car = (x, z, ry, c) => {
        const k = new THREE.Group();
        k.add(at(box(1.5, 0.45, 0.8, G(c, '#9a9a9a')), 0, 0.62, 0), at(box(0.8, 0.35, 0.7, G('#dfe6ee', '#c8c8c8')), -0.1, 1.0, 0));
        k.add(at(box(0.06, 0.16, 0.6, G('#ff3b30', '#777777')), -0.76, 0.66, 0));            // luz de freio
        for (const wx of [-0.5, 0.5]) for (const wz of [-0.4, 0.4]) k.add(at(cyl(0.17, 0.17, 0.12, G('#26272b', '#555555'), 8), wx, 0.5, wz, Math.PI / 2, 0, 0));
        k.position.set(x, 0, z); k.rotation.y = ry; g.add(k);
      };
      const truck = new THREE.Group();
      truck.add(at(box(2.0, 1.15, 1.25, G('#f2f2f2', '#d0d0d0')), -0.45, 1.2, 0), at(box(0.85, 0.9, 1.15, G('#4a5568', '#8a8a8a')), 1.05, 1.07, 0));
      for (const wx of [-1.0, 0.0, 1.05]) for (const wz of [-0.55, 0.55]) truck.add(at(cyl(0.24, 0.24, 0.16, G('#26272b', '#555555'), 10), wx, 0.67, wz, Math.PI / 2, 0, 0));
      truck.position.set(0, 0, -4.6); truck.rotation.y = Math.PI / 4; g.add(truck);
      ['#d8473a', '#3a78d4', '#efbf2a'].forEach((c, k) => { car(2.6 + k * 1.75, -0.45, 0, c); car(2.6 + k * 1.75, 0.45, Math.PI, ['#3c9d55', '#f2f2f2', '#8a55c4'][k]); });
    }
    return bakeStatic(g);
  }

  [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].forEach(([x, z], i) => house(x, z, roof(i)));

  if (kind === 'barriers') {                     // Bairro 3: 2 cavaletes de obra (fixos na maquete)
    const sawhorse = (x, z, ry) => {
      const s = new THREE.Group();
      for (let k = 0; k < 5; k++) s.add(at(box(0.52, 0.5, 0.18, k % 2 ? G('#222222', '#555555') : G('#f2c21b', '#d0d0d0')), -1.04 + k * 0.52, 1.35, 0));
      for (const lx of [-1.1, 1.1]) s.add(at(box(0.14, 1.05, 0.5, G('#3a3d44', '#666666')), lx, 0.93, 0));
      s.add(at(sphere(0.15, G('#ff8a1e', '#9a9a9a'), 6, 4), -1.1, 1.75, 0));
      s.add(at(sphere(0.15, G('#ff8a1e', '#9a9a9a'), 6, 4), 1.1, 1.75, 0));
      s.position.set(x, 0, z); s.rotation.y = ry;
      g.add(s);
    };
    sawhorse(-4.6, 0, Math.PI / 2);              // na rua horizontal, à esquerda
    sawhorse(0, 4.6, 0);                         // na rua vertical, na frente
  }

  if (kind === 'trucks') {                       // Bairro 4: caminhão parado numa rua e buraco no meio (fixos)
    const t = new THREE.Group();
    t.add(at(box(2.0, 1.15, 1.25, G('#3a78d4', '#8a8a8a')), -0.45, 1.2, 0));             // baú
    t.add(at(box(0.85, 0.9, 1.15, G('#f4f1ea', '#d0d0d0')), 1.05, 1.07, 0));             // cabine
    t.add(at(box(0.06, 0.4, 0.95, G('#3d5f80', '#777777')), 1.49, 1.25, 0));             // para-brisa
    for (const wx of [-1.0, 0.0, 1.05]) for (const wz of [-0.55, 0.55]) {
      t.add(at(cyl(0.24, 0.24, 0.16, G('#26272b', '#555555'), 10), wx, 0.67, wz, Math.PI / 2, 0, 0));
    }
    t.position.set(0, 0, 4.2); t.rotation.y = -Math.PI / 4;   // na rua da frente, na diagonal
    g.add(t);
    add(cyl(1.05, 1.1, 0.06, G('#7a5a3a', '#7d7d7d'), 16), 0, 0.45, 0);                  // terra em volta
    add(cyl(0.8, 0.8, 0.07, G('#1b1714', '#3c3c3c'), 16), 0, 0.47, 0);                   // buraco
    for (const [x, z] of [[-1.35, 0.2], [0.25, -1.35], [-0.2, 1.35]]) add(cone(0.16, 0.45, G('#ff8a1e', '#9a9a9a'), 8), x, 0.66, z);
  }
  return bakeStatic(g);
}

function tree(x, z, s) {
  const g = new THREE.Group();
  g.add(at(cyl(0.3 * s, 0.4 * s, 1.6 * s, '#6b4526', 6), x, 0.8 * s, z));
  g.add(at(sphere(1.6 * s, '#3f8f3a', 7, 5), x, 2.6 * s, z));
  return g;
}

/** Quadro 2D "MISSÕES" (moldura de madeira, fundo creme). */
function boardTexture(gray = false) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = gray ? '#7d7d7d' : '#8a5a36'; g.fillRect(0, 0, 512, 200);
  g.fillStyle = gray ? '#d6d6d6' : '#fff3d6'; g.fillRect(14, 14, 484, 172);
  g.fillStyle = gray ? '#6a6a6a' : '#3a2a1a'; g.font = 'bold 96px "Trebuchet MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MISSÕES', 256, 106);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PALETTES = [['red', 'blue', 'yellow', 'green'], ['purple', 'red', 'gray', 'yellow', 'blue', 'green', 'red', 'yellow'], ['blue', 'green', 'red', 'purple'],
  ['yellow', 'gray', 'blue', 'red'], ['green', 'purple', 'yellow', 'blue'], ['red'], ['blue'], ['green'], ['red', 'blue', 'yellow', 'purple'], ['red'], ['blue', 'green', 'red'], ['green', 'yellow', 'purple'], ['red'], ['blue', 'red', 'yellow', 'green'], ['red', 'blue'], ['red', 'blue', 'green', 'yellow'], ['red', 'blue', 'gray', 'green'], ['blue', 'red', 'yellow', 'green'], ['red'], ['blue'], ['red', 'gray', 'red', 'blue'], ['red', 'blue', 'yellow', 'green', 'purple'], ['red', 'blue', 'yellow', 'green', 'purple'], ['red']];

/** Miniatura da lua: fundo preto, poucas estrelas pequenas e a lua por cima. */
function spaceShot(src, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#fff';
  for (let k = 0; k < 26; k++) { const r = 0.5 + rnd() * 0.7; g.globalAlpha = 0.5 + rnd() * 0.5; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 7); g.fill(); }
  g.globalAlpha = 1; g.drawImage(src, 0, 0, w, h);
  return c.toDataURL('image/png');
}

/** Miniaturas (data URL) dos 8 bairros, desenhadas uma vez num renderizador próprio. Usadas na seleção do modo Livre. */
export function renderMiniThumbnails(w = 480, h = 360) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(w, h, false);
  const cam = new THREE.PerspectiveCamera(30, w / h, 1, 200);
  const urls = MINI_KINDS.map((kind, i) => {
    if (!kind) return null;                                // espaço reservado (sem bairro ainda)
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e0', '#7aa35a', 1.5));
    const sun = new THREE.DirectionalLight('#ffffff', 2.0);
    sun.position.set(-30, 60, 40);
    scene.add(sun);
    const mini = miniNeighborhood(kind === 'farm' ? 'farmThumb' : kind, PALETTES[i].map(c => ROOF_COL[c]));   // Colheita: maquete própria da seleção
    scene.add(mini);
    // enquadra a maquete inteira (prédios altos incluídos), sempre do mesmo ângulo
    const sph = new THREE.Box3().setFromObject(mini).getBoundingSphere(new THREE.Sphere());
    const dir = (kind === 'farm' ? new THREE.Vector3(-11, 17, 21) : new THREE.Vector3(-6, 24, 27)).normalize(), t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));   // Colheita: três quartos
    const dist = sph.radius / Math.min(t, t * cam.aspect) * (kind === 'moon' ? 0.7 : kind === 'medieval' ? 0.74 : kind === 'farm' ? 0.84 : 0.92);   // a lua: maior, sem cortar as bordas
    if (kind === 'farm') sph.center.y -= 1.6;               // Colheita: centraliza a base (as construções puxam o centro para cima)
    cam.position.copy(sph.center).addScaledVector(dir, dist);
    cam.lookAt(sph.center);
    r.render(scene, cam);
    if (kind === 'moon') return spaceShot(r.domElement, w, h);   // fundo preto com poucas estrelinhas
    return r.domElement.toDataURL('image/png');
  });
  r.dispose(); r.forceContextLoss();
  return urls;
}

export function createCareerMap(stageEl, audio) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const prompt = document.createElement('div');
  prompt.className = 'cmap-prompt';
  const PROMPT_OPEN = '<b>E</b> Jogar &nbsp; <b>M</b> Missões';
  prompt.innerHTML = PROMPT_OPEN;
  let promptLocked = false;
  stageEl.appendChild(prompt);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe3f5');
  scene.add(new THREE.HemisphereLight('#fff6e0', '#7aa35a', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 2.0);
  sun.position.set(-30, 60, 40);
  scene.add(sun);

  // chão
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat('#8fc865'));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // estrada com curvas suaves
  const pts = [[0, 0], [30, -14], [62, 6], [94, -10], [126, 10], [158, -6], [190, 8], [222, -4], [254, 10], [286, -6], [318, 8], [350, -6], [382, 8], [414, -6], [446, 8], [478, -6], [510, 8]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength();
  scene.add(new THREE.Mesh(roadGeometry(curve, 400), mat('#5d6470', { side: THREE.DoubleSide })));
  // faixa amarela tracejada
  const dashes = new THREE.Group();
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let d = 2; d < length; d += 5) {
    curve.getPointAt(d / length, p); curve.getTangentAt(d / length, tg);
    dashes.add(at(box(2.2, 0.06, 0.3, '#f2d45c'), p.x, 0.08, p.z, 0, -Math.atan2(tg.z, tg.x), 0));
  }
  scene.add(bakeStatic(dashes));

  // fases: bairros em miniatura alternando os lados da estrada, com placa numerada
  const stops = [], boards = [];
  let clock = 0;
  const ROAD = MINI_KINDS.map((k, i) => (k ? i : -1)).filter(i => i >= 0);   // só os bairros que existem (os reservados ficam fora da estrada)
  ROAD.map((i, k) => [0.04 + k * 0.92 / (ROAD.length - 1), i]).forEach(([u, i]) => {
    curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    const side = i % 2 ? 1 : -1;
    const nx = -tg.z * side, nz = tg.x * side;
    const kind = MINI_KINDS[i], city = kind === 'city' || kind === 'jam' || kind === 'jam8';   // Bairro 6: maquete com prédios altos
    const hood = miniNeighborhood(kind, PALETTES[i].map(c => ROOF_COL[c]));
    const hoodGray = miniNeighborhood(kind, [], true);
    for (const h of [hood, hoodGray]) {
      h.position.set(p.x + nx * 14, 0, p.z + nz * 14);
      h.rotation.y = -Math.atan2(tg.z, tg.x);
      scene.add(h);
    }
    // placa com o número da fase (sprite: sempre de frente para a câmera)
    const signFont = 'bold 92px "Trebuchet MS", sans-serif';
    const signTex = textTexture(`${i === 9 ? 'NÍVEL' : 'BAIRRO'} ${i + 1}`, { width: 512, height: 160, bg: '#e8661a', fg: '#ffffff', font: signFont });
    const signTexGray = textTexture(`${i === 9 ? 'NÍVEL' : 'BAIRRO'} ${i + 1}`, { width: 512, height: 160, bg: '#8a8a8a', fg: '#e6e6e6', font: signFont });
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex }));
    sign.scale.set(9, 2.8, 1);
    sign.position.set(p.x + nx * 14, kind === 'jam8' ? 19.5 : city ? 12.5 : 9, p.z + nz * 14);   // na cidade, acima dos prédios da maquete
    scene.add(sign);
    // quadro "MISSÕES" flutuando acima da maquete (M perto dela abre a lista)
    const boardTex = boardTexture(), boardTexGray = boardTexture(true);
    const board = new THREE.Sprite(new THREE.SpriteMaterial({ map: boardTex }));
    board.scale.set(10, 4, 1);
    board.position.set(p.x + nx * 14, kind === 'jam8' ? 25.5 : city ? 18.5 : 15, p.z + nz * 14);
    board.userData.baseY = board.position.y;
    scene.add(board);
    boards.push(board);
    stops.push({ level: i, u, d: u * length, hood, hoodGray, sign, board, tex: [signTex, signTexGray, boardTex, boardTexGray], locked: false });
  });

  // algumas árvores longe da estrada
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = new THREE.Group();
  const samples = curve.getSpacedPoints(120);
  for (let k = 0; k < 170; k++) {
    const x = -40 + rnd() * 430, z = -70 + rnd() * 140;
    if (samples.some(s => Math.hypot(s.x - x, s.z - z) < 24)) continue;
    trees.add(tree(x, z, 0.8 + rnd() * 0.7));
  }
  scene.add(bakeStatic(trees));

  // a van do jogo, levada pela estrada
  const van = createVan(scene);
  van.setGhost(true);
  let dist = stops[0].d - 10;             // começa um pouco antes do primeiro bairro
  let moving = 0, near = -1, nearLocked = -1, entered = false;

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
  const camTarget = new THREE.Vector3();

  function placeVan() {
    const u = THREE.MathUtils.clamp(dist / length, 0, 1);
    curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    van.teleport(p.x, p.z, Math.atan2(tg.z, tg.x));
  }

  function updateCamera(dt) {
    const k = dt ? 1 - Math.exp(-4 * dt) : 1;
    camTarget.lerp(van.object.position, k);
    camera.position.copy(camTarget).add(CAM_OFFSET);
    camera.lookAt(camTarget);
  }

  const proj = new THREE.Vector3();
  return {
    scene, camera,
    /** startAt: índice da fase ao lado da qual a van começa (vindo do menu). Sem ele, a van fica onde estava. */
    enter(startAt) {
      if (startAt !== undefined) { const s = stops.filter(q => q.level <= startAt).pop() || stops[0]; dist = s.d; }
      else if (!entered) dist = stops[0].d - 10;
      entered = true;
      placeVan();
      camTarget.copy(van.object.position);
      updateCamera(0);
    },
    leave() { prompt.style.display = 'none'; },
    resize(w, h) { camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); },
    /** dir: −1 (A, recua), 0, +1 (D, avança). Retorna true se E foi pedido perto de um bairro. */
    update(dt, dir, play) {
      moving = dir;
      clock += dt;
      boards.forEach((b, i) => { b.position.y = b.userData.baseY + Math.sin(clock * 2 + i) * 0.5; });   // flutua
      dist = THREE.MathUtils.clamp(dist + dir * SPEED * dt, 0, length);
      placeVan();
      updateCamera(dt);
      near = -1; nearLocked = -1;
      for (let i = 0; i < stops.length; i++) if (Math.abs(stops[i].d - dist) < NEAR) { if (stops[i].locked) nearLocked = stops[i].level; else near = stops[i].level; }   // índice do nível (com os reservados)
      const shown = near >= 0 ? near : nearLocked;
      if (shown >= 0) {
        const lockedNow = near < 0;
        if (lockedNow !== promptLocked) {
          promptLocked = lockedNow;
          prompt.classList.toggle('locked', lockedNow);
        }
        if (lockedNow) { let pv = shown - 1; while (pv > 0 && !MINI_KINDS[pv]) pv--; prompt.textContent = `🔒 Bloqueado — conclua as 5 missões do Bairro ${pv + 1}`; }
        else if (prompt.innerHTML !== PROMPT_OPEN) prompt.innerHTML = PROMPT_OPEN;
        proj.copy(van.object.position); proj.y += 4;
        proj.project(camera);
        prompt.style.display = 'block';
        prompt.style.left = ((proj.x + 1) / 2 * stageEl.clientWidth) + 'px';
        prompt.style.top = ((1 - proj.y) / 2 * stageEl.clientHeight) + 'px';
      } else prompt.style.display = 'none';
      return near >= 0 && play;
    },
    get moving() { return moving !== 0; },
    get near() { return near; },
    /** Marca quais fases estão bloqueadas (cinza, sem interação). */
    setLocked(isLocked) {
      stops.forEach((s, i) => {
        s.locked = isLocked(s.level);
        s.hood.visible = !s.locked; s.hoodGray.visible = s.locked;
        s.sign.material.map = s.tex[s.locked ? 1 : 0];        // placa e quadro em cinza quando bloqueada
        s.board.material.map = s.tex[s.locked ? 3 : 2];
      });
    },
    get progress() { return dist / length; },
  };
}
