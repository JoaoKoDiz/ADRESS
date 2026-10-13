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
export const MINI_KINDS = ['houses', 'plaza', 'barriers', 'trucks', 'gas', 'city', 'jam', 'jam8', 'hill', 'venice', 'canal', 'rail', 'favela', 'flux', 'farm', 'snow', null, null, 'night', 'moon'];   // 17–19 reservados (null), 20 = Lua   // 13 = Morro, 14 = Fluxo, 15 = Colheita, 16 = Nevasca, 17 = Órbita   // 10 = Veneza, 11 = Travessia, 12 = Trilhos

/** Bairro em miniatura do tipo `kind`: base de grama, sebe, ruas e o que caracteriza o bairro. gray = fase bloqueada. */
function miniNeighborhood(kind, colors, gray = false) {
  const G = (c, gc) => (gray ? gc : c);          // fase bloqueada: tudo em tons de cinza
  const roof = i => G(colors[i % colors.length], '#8c8c8c');
  const g = new THREE.Group();
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  if (kind !== 'moon') {                         // base com sebe (a Lua não tem: só a esfera)
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
  ['yellow', 'gray', 'blue', 'red'], ['green', 'purple', 'yellow', 'blue'], ['red'], ['blue'], ['green'], ['red', 'blue', 'yellow', 'purple'], ['red'], ['blue', 'green', 'red'], ['green', 'yellow', 'purple'], ['red'], ['blue', 'red', 'yellow', 'green'], ['red', 'blue'], ['red', 'blue', 'green', 'yellow'], [], [], ['red'], ['blue']];

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
    const dist = sph.radius / Math.min(t, t * cam.aspect) * (kind === 'moon' ? 0.7 : kind === 'farm' ? 0.84 : 0.92);   // a lua: maior, sem cortar as bordas
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
