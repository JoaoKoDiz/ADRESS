// Objetos do quintal (itens das pistas: "árvore com frutas", "flamingo no jardim"…).
// Cada construtor devolve um THREE.Group centrado na origem, apoiado em y = 0, cabendo em ~4.2 × 4.2 (x, z),
// com a "frente" voltada para +Z (para a câmera). Vistos de longe (câmera ao sul, ~57° de inclinação),
// então as proporções são de brinquedo: silhuetas exageradas, cores fortes, nada importante escondido atrás.
// Partes animadas são marcadas com dynamic() e animadas em group.userData.update(t) — sem alocações por quadro.
// Partes estáticas usam as primitivas/mat() do kit para que bakeStatic() as funda por material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl, sphere, cone, torus, at, group, dynamic } from './kit.js';

const PI = Math.PI, DEG = PI / 180;

// ---------- Paleta ----------
const C = {
  trunk: '#7a4e2e', bark: '#6b4527', barkDark: '#553519',
  leaf: '#2f8a33', leafMid: '#3a9a3c', leafLight: '#4cae46',
  fruit: '#ff3a1a', fruit2: '#ff9a14',
  topiary: '#31a857', topiaryLight: '#3fb566', pot: '#c9653a', potRim: '#dd7c4c', soil: '#5a3a1f',
  cactus: '#3f9e4c', cactusDark: '#2c7a38', sand: '#e8d196', rock: '#a8a29a', flower: '#ff5fa0',
  petal: '#ffc61a', seed: '#4a2a10', stem: '#3c8d3a', stemLeaf: '#4caf50', bed: '#6b4226', plank: '#a8764a',
  wood: '#c8864a', woodDark: '#9b6436', roofRed: '#c8332a', hole: '#24160c',
  dog: '#e0ac72', dogLight: '#f6dcb4', dogEar: '#7a4a26', black: '#1c1c1c', bowl: '#3a7bd5', kibble: '#8a5a36',
  poolPink: '#ff5fa2', poolWhite: '#fff4f8', water: '#4fc0f0', duck: '#ffd21a', beak: '#ff8a00',
  tramMat: '#1d1d22', tramPad: '#2d6fe0', metal: '#8f98a3',
  swingWood: '#b0743e', rope: '#d9d2c3', seatRed: '#e63946', seatBlue: '#2a9df4',
  bikeFrame: '#10c2c2', tire: '#1f1f1f', spoke: '#c8cdd2', basket: '#c9994f',
  flamingo: '#ff5aa5', flamingoLight: '#ff93c6', flamingoLeg: '#e0457f', beakPale: '#ffe0ea',
  gnomeCoat: '#2f6fd0', gnomeHat: '#e2302a', beard: '#fbfbf8', skin: '#f3c49a', nose: '#ea8a78', boot: '#3b2a1a', belt: '#2b1d12', buckle: '#ffd34a',
  post: '#8a6444', line: '#f2f2f2', shirt: '#e63946', pants: '#2a6bd1', towel: '#ff8a1f', towelStripe: '#ffffff', sock: '#ffd12a', pin: '#d9b27a',
  tireDark: '#262628', tire2: '#303134', tire3: '#2a2a2c',
  stone: '#a9adb4', stoneLight: '#c9ccd2', stoneDark: '#8e939b', waterLight: '#9fe3ff', foam: '#eefaff',
};

// ---------- Utilitários ----------
const geoCache = new Map();
/** Geometria própria deste módulo, criada uma única vez. */
function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
/** Cilindro ligando os pontos a → b (raio r0 em a, r1 em b). Usa geometria de altura 1 escalada. */
function limb(a, b, r0, r1, color, seg = 6) {
  _dir.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = _dir.length();
  const m = cyl(r1, r0, 1, color, seg);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(_up, _dir.normalize());
  m.scale.y = len;
  return m;
}

/** Esfera achatada/esticada (elipsoide). */
function blob(r, color, sx, sy, sz, x, y, z, seg = 10) {
  const m = at(sphere(r, color, seg, Math.max(4, Math.round(seg * 0.7))), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}

/** Vetor unitário a partir de azimute (graus, a partir de +Z em direção a +X) e elevação (graus). */
function dirAE(az, el) {
  const a = az * DEG, e = el * DEG;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
}

/**
 * Funde várias peças num único Mesh com cores por vértice (1 draw call) — usado nas partes ANIMADAS,
 * que o bakeStatic não funde. A geometria é montada uma única vez e reaproveitada.
 */
function compound(key, build) {
  const geometry = geo('cmp:' + key, () => {
    const root = build();
    root.updateMatrixWorld(true);
    const parts = [];
    root.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      g.applyMatrix4(o.matrixWorld);
      const n = g.attributes.position.count, c = o.material.color, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      parts.push(g);
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach(p => p.dispose());
    return merged;
  });
  return mesh(geometry, mat('#ffffff', { vertexColors: true }));
}

// =====================================================================================
// Árvore com frutas: copa volumosa de 4 tufos verdes coberta de frutas vermelhas/laranja.
// =====================================================================================
function fruit() {
  const g = group();
  g.add(at(cyl(0.22, 0.34, 2.2, C.trunk, 7), 0, 1.1, 0));
  g.add(limb([0, 1.7, 0], [-0.7, 2.3, 0.2], 0.14, 0.1, C.trunk, 5));
  g.add(limb([0, 1.8, 0], [0.7, 2.35, 0.15], 0.14, 0.1, C.trunk, 5));
  const ico = r => geo('ico' + r, () => new THREE.IcosahedronGeometry(r, 1));
  const blobs = [
    [0, 2.8, -0.15, 1.38, C.leaf],
    [-1.02, 2.4, 0.3, 1.0, C.leafMid],
    [1.02, 2.45, 0.25, 0.98, C.leafMid],
    [0.15, 3.25, 0.45, 0.88, C.leafLight],
  ];
  for (const [x, y, z, r, c] of blobs) g.add(at(mesh(ico(r), c), x, y, z));
  // frutas espalhadas pela metade de cima/da frente da copa (a que a câmera vê)
  const spots = [
    [0, -70, 15], [0, -35, 45], [0, 35, 40], [0, 70, 20], [0, 0, 72], [0, -110, 40], [0, 120, 38], [0, 180, 55],
    [1, -40, 5], [1, -85, 35], [1, 10, 30], [1, -20, 65],
    [2, 45, 5], [2, 85, 35], [2, 5, 20], [2, 25, 62],
    [3, -30, 15], [3, 30, 20], [3, 0, 55], [3, -70, 50], [3, 80, 45],
  ];
  let i = 0;
  for (const [b, az, el] of spots) {
    const [bx, by, bz, br] = blobs[b];
    const d = dirAE(az, el);
    const p = [bx + d[0] * br * 0.98, by + d[1] * br * 0.98, bz + d[2] * br * 0.98];
    // pula frutas que ficariam enterradas em outro tufo
    const buried = blobs.some(([cx, cy, cz, cr], k) => k !== b && Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz) < cr * 0.92);
    if (buried) continue;
    g.add(at(sphere(0.27, (i++ % 4 === 3) ? C.fruit2 : C.fruit, 8, 6), p[0], p[1], p[2]));
  }
  return g;
}

// =====================================================================================
// Árvore sem folhas: tronco escuro com galhos grossos abrindo para fora e para cima (estrela vista de cima).
// =====================================================================================
function bare() {
  const g = group();
  g.add(limb([0, 0, 0], [0.05, 2.1, 0], 0.36, 0.2, C.bark, 7));
  g.add(at(cone(0.62, 0.7, C.bark, 7), 0, 0.35, 0)); // raízes
  // [azimute, inclinação a partir da vertical, altura de saída, comprimento]
  const main = [
    [15, 52, 1.7, 1.75], [85, 58, 1.95, 1.75], [155, 50, 1.8, 1.55], [220, 56, 1.65, 1.7],
    [290, 52, 1.9, 1.75], [350, 14, 2.05, 1.35],
  ];
  for (const [az, tilt, y0, len] of main) {
    const d = dirAE(az, 90 - tilt);
    const s = [0.05 * y0 / 2.1, y0, 0];
    const e = [s[0] + d[0] * len, s[1] + d[1] * len, s[2] + d[2] * len];
    g.add(limb(s, e, 0.24, 0.12, C.bark, 5));
    // forquilha na ponta: dois galhinhos abrindo
    for (const side of [-1, 1]) {
      const d2 = dirAE(az + side * 38, 90 - Math.max(10, tilt - 18 + side * 6));
      const l2 = 0.85 + (side > 0 ? 0.1 : 0);
      g.add(limb(e, [e[0] + d2[0] * l2, e[1] + d2[1] * l2, e[2] + d2[2] * l2], 0.12, 0.06, C.barkDark, 4));
    }
    // galhinho lateral no meio do galho
    const m = [s[0] + d[0] * len * 0.5, s[1] + d[1] * len * 0.5, s[2] + d[2] * len * 0.5];
    const d3 = dirAE(az - 55, 90 - Math.min(80, tilt + 15));
    g.add(limb(m, [m[0] + d3[0] * 0.75, m[1] + d3[1] * 0.75, m[2] + d3[2] * 0.75], 0.11, 0.05, C.barkDark, 4));
  }
  // folhinhas secas caídas no chão (reforça "sem folhas")
  const leaves = [[1.1, 0.7, 0.3], [-1.3, 0.9, 1.2], [0.4, 1.5, 2.2], [-0.6, -1.2, 0.7], [1.6, -0.4, 2.6], [-1.7, 0.1, 1.9]];
  leaves.forEach(([x, z, r], k) => g.add(at(box(0.32, 0.03, 0.2, k % 2 ? '#c98a3a' : '#a8662c'), x, 0.02, z, 0, r, 0)));
  return g;
}

// =====================================================================================
// Cacto grande (saguaro): coluna com dois braços, espinhos brancos e uma flor rosa no topo.
// =====================================================================================
function cactus() {
  const g = group();
  const G = C.cactus;
  g.add(at(cyl(1.85, 1.95, 0.06, C.sand, 9), 0, 0.03, 0));
  g.add(at(blob(0.3, C.rock, 1.3, 0.6, 1, 0, 0, 0, 6), 1.2, 0.1, 1.0));
  g.add(at(blob(0.22, C.rock, 1, 0.7, 1.2, 0, 0, 0, 6), -1.35, 0.08, 1.05));
  g.add(at(blob(0.18, C.rock, 1, 0.7, 1, 0, 0, 0, 6), 1.45, 0.06, -0.7));
  // tronco principal
  const r = 0.62;
  g.add(at(cyl(r, r + 0.06, 2.8, G, 10), 0, 1.4, 0));
  g.add(at(sphere(r, G, 10, 6), 0, 2.8, 0));
  // braço esquerdo (mais baixo) e direito (mais alto)
  const ra = 0.4;
  const arm = (sx, y, reach, top) => {
    const x = sx * reach;
    g.add(limb([0, y, 0], [x, y, 0], ra, ra, G, 8));
    g.add(at(sphere(ra, G, 8, 6), x, y, 0));
    g.add(limb([x, y, 0], [x, top, 0], ra, ra - 0.03, G, 8));
    g.add(at(sphere(ra - 0.03, G, 8, 6), x, top, 0));
  };
  arm(-1, 1.25, 1.25, 2.35);
  arm(1, 1.75, 1.2, 2.7);
  // nervuras escuras na frente (visíveis de perto)
  for (const a of [-30, 0, 30]) {
    const d = dirAE(a, 0);
    g.add(at(box(0.08, 2.5, 0.06, C.cactusDark), d[0] * (r + 0.02), 1.4, d[2] * (r + 0.02), 0, a * DEG, 0));
  }
  // espinhos (pontinhos brancos)
  const spines = [[-0.3, 2.45], [0.28, 2.0], [-0.28, 1.6], [0.3, 1.15], [-0.26, 0.7], [0.26, 0.35], [0, 2.95]];
  spines.forEach(([x, y]) => g.add(at(box(0.11, 0.11, 0.11, '#ffffff'), x, y, Math.sqrt((r + 0.04) ** 2 - x * x))));
  g.add(at(box(0.1, 0.1, 0.1, '#ffffff'), -1.25, 1.95, ra));
  g.add(at(box(0.1, 0.1, 0.1, '#ffffff'), 1.2, 2.3, ra));
  // flor rosa no topo
  g.add(at(cyl(0.42, 0.24, 0.18, C.flower, 7), 0, 3.42, 0));
  g.add(at(sphere(0.15, '#ffe066', 6, 4), 0, 3.53, 0));
  return g;
}

// =====================================================================================
// Canteiro de girassóis: caixa de terra com 5 girassóis altos, rostos virados para a câmera.
// =====================================================================================
function petalGeo() {
  return geo('sunPetals', () => {
    const s = new THREE.Shape(), n = 12, ro = 0.78, ri = 0.43;
    for (let i = 0; i <= n * 2; i++) {
      const a = i / (n * 2) * PI * 2, r = i % 2 === 0 ? ro : ri;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -0.035);
    return g;
  });
}
function sunflowers() {
  const g = group();
  const W = 4.0, D = 2.0, H = 0.36;
  g.add(at(box(W - 0.2, H - 0.04, D - 0.2, C.bed), 0, (H - 0.04) / 2, 0));
  g.add(at(box(W, H, 0.14, C.plank), 0, H / 2, D / 2 - 0.07));
  g.add(at(box(W, H, 0.14, C.plank), 0, H / 2, -D / 2 + 0.07));
  g.add(at(box(0.14, H, D - 0.28, C.plank), W / 2 - 0.07, H / 2, 0));
  g.add(at(box(0.14, H, D - 0.28, C.plank), -W / 2 + 0.07, H / 2, 0));
  // [x, z, altura da cabeça, inclinação extra, giro]
  const flowers = [
    [-1.3, -0.5, 2.35, 0, 0.18], [0.05, -0.55, 2.6, 4, -0.05], [1.3, -0.45, 2.3, -3, -0.2],
    [-0.68, 0.42, 1.6, 3, 0.12], [0.74, 0.45, 1.65, -2, -0.12],
  ];
  flowers.forEach(([x, z, h, tilt, yaw], k) => {
    g.add(limb([x, H - 0.05, z], [x, h - 0.05, z - 0.08], 0.075, 0.06, C.stem, 5));
    const ly = H + (h - H) * 0.45, side = k % 2 ? 1 : -1;
    g.add(at(blob(0.3, C.stemLeaf, 1.1, 0.14, 0.55, 0, 0, 0, 6), x + side * 0.26, ly, z + 0.05, 0, 0, side * 0.45));
    // cabeça: pétalas + miolo, face voltada para a câmera (cima + sul)
    const head = group(petalGeoMesh(), at(cyl(0.4, 0.4, 0.14, C.seed, 10), 0, 0, 0.05, PI / 2, 0, 0));
    at(head, x, h, z, -(57 + tilt) * DEG, yaw, (k * 17) * DEG);
    g.add(head);
  });
  return g;
}
const petalGeoMesh = () => mesh(petalGeo(), C.petal);

// =====================================================================================
// Arbusto em formato de bola: esfera perfeita e lisa num vaso de terracota — bem diferente da árvore.
// =====================================================================================
function ballbush() {
  const g = group();
  g.add(at(cyl(0.82, 0.6, 0.95, C.pot, 12), 0, 0.475, 0));
  g.add(at(cyl(0.95, 0.95, 0.2, C.potRim, 12), 0, 0.94, 0));
  g.add(at(cyl(0.63, 0.63, 0.12, '#a9512c', 12), 0, 0.3, 0.02)); // faixa decorativa (aparece pela frente)
  g.add(at(cyl(0.12, 0.15, 0.9, C.trunk, 6), 0, 1.4, 0));
  g.add(at(sphere(1.2, C.topiary, 20, 14), 0, 2.75, 0));
  return g;
}

// =====================================================================================
// Casinha de cachorro: madeira, telhado vermelho de duas águas, porta em arco escura com o cão espiando.
// =====================================================================================
function doghouse() {
  const g = group();
  const W = 2.6, H = 1.6, D = 2.2, rise = 1.0, z0 = -0.3;
  const body = geo('dogBody', () => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(0, H + rise); s.lineTo(-W / 2, H); s.closePath();
    const eg = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false });
    eg.translate(0, 0, -D / 2);
    return eg;
  });
  g.add(at(mesh(body, C.wood), 0, 0, z0));
  // tábuas (listras) na frente
  for (const y of [0.4, 0.85, 1.3]) g.add(at(box(W + 0.02, 0.05, 0.04, C.woodDark), 0, y, z0 + D / 2));
  // telhado: duas placas vermelhas com beiral
  const p = Math.atan2(rise, W / 2), L = Math.hypot(W / 2, rise) + 0.32, T = 0.14;
  for (const sx of [-1, 1]) {
    // placa começa na cumeeira e desce em direção à parede do lado sx (normal para fora: (sx·sen p, cos p))
    const cx = sx * Math.cos(p) * L / 2 + sx * Math.sin(p) * T / 2;
    const cy = H + rise - Math.sin(p) * L / 2 + Math.cos(p) * T / 2;
    g.add(at(box(L, T, D + 0.4, C.roofRed), cx, cy, z0, 0, 0, -sx * p));
  }
  g.add(at(box(0.18, 0.18, D + 0.44, '#9e241d'), 0, H + rise + 0.08, z0)); // cumeeira
  // porta em arco
  const fz = z0 + D / 2 + 0.02;
  g.add(at(box(1.1, 0.72, 0.04, C.hole), 0, 0.36, fz));
  g.add(at(cyl(0.55, 0.55, 0.04, C.hole, 14), 0, 0.72, fz, PI / 2, 0, 0));
  // plaquinha acima da porta
  g.add(at(box(0.6, 0.22, 0.05, '#f3e2b8'), 0, 1.5, fz + 0.01));
  // tigela de ração
  g.add(at(cyl(0.38, 0.28, 0.2, C.bowl, 12), 1.6, 0.1, 1.25));
  g.add(at(cyl(0.3, 0.3, 0.04, C.kibble, 10), 1.6, 0.19, 1.25));
  // cachorro espiando pela porta (animado: cabeça balança)
  const dog = dynamic(compound('dogHead', () => group(
    at(sphere(0.36, C.dog, 10, 8), 0, 0, 0),
    blob(0.2, C.dogLight, 1.1, 0.8, 1, 0, -0.08, 0.3, 8),
    at(sphere(0.08, C.black, 6, 4), 0, -0.02, 0.5),
    blob(0.16, C.dogEar, 0.55, 1.35, 0.8, -0.34, -0.06, 0.02, 6),
    blob(0.16, C.dogEar, 0.55, 1.35, 0.8, 0.34, -0.06, 0.02, 6),
    at(sphere(0.055, C.black, 6, 4), -0.13, 0.12, 0.31),
    at(sphere(0.055, C.black, 6, 4), 0.13, 0.12, 0.31),
    at(sphere(0.12, C.dog, 6, 4), -0.2, -0.36, 0.3),
    at(sphere(0.12, C.dog, 6, 4), 0.2, -0.36, 0.3),
  )));
  at(dog, 0, 0.58, fz + 0.14);
  dog.scale.setScalar(1.2);
  g.add(dog);
  g.userData.update = t => {
    dog.rotation.z = Math.sin(t * 1.6) * 0.18;
    dog.position.y = 0.58 + Math.abs(Math.sin(t * 3.2)) * 0.03;
  };
  return g;
}

// =====================================================================================
// Piscina inflável: anel gordo listrado rosa/branco, água azul e um patinho de borracha.
// =====================================================================================
function pool() {
  const g = group();
  const R = 1.58, tube = 0.44;
  const arcGeo = geo('poolArc', () => new THREE.TorusGeometry(R, tube, 8, 5, PI / 4));
  const ring = at(group(), 0, tube, 0, -PI / 2, 0, 0);
  for (let k = 0; k < 8; k++) ring.add(at(mesh(arcGeo, k % 2 ? C.poolWhite : C.poolPink), 0, 0, 0, 0, 0, k * PI / 4));
  g.add(ring);
  g.add(at(cyl(R, R, 0.64, C.water, 24, { roughness: 0.25 }), 0, 0.32, 0));
  // brilho na água
  g.add(at(mesh(geo('poolGlint', () => new THREE.TorusGeometry(0.62, 0.05, 3, 10, 1.3)), '#e8f8ff'), 0, 0.645, 0, -PI / 2, 0, 2.3));
  g.add(at(mesh(geo('poolGlint2', () => new THREE.TorusGeometry(0.85, 0.045, 3, 8, 0.8)), '#e8f8ff'), 0, 0.645, 0, -PI / 2, 0, 3.4));
  const duck = dynamic(compound('duck', () => group(
    blob(0.3, C.duck, 1.3, 0.8, 1, 0, 0, 0, 10),
    at(cone(0.12, 0.2, C.duck, 6), -0.34, 0.13, 0, 0, 0, 0.9),
    at(sphere(0.2, C.duck, 8, 6), 0.25, 0.3, 0),
    at(cone(0.08, 0.2, C.beak, 6), 0.49, 0.27, 0, 0, 0, -PI / 2),
    at(sphere(0.04, C.black, 5, 3), 0.36, 0.38, 0.12),
    at(sphere(0.04, C.black, 5, 3), 0.36, 0.38, -0.12),
  )));
  g.add(duck);
  g.userData.update = t => {
    const a = t * 0.35;
    duck.position.set(Math.cos(a) * 0.6, 0.7 + Math.sin(t * 2.6) * 0.035, Math.sin(a) * 0.6 + 0.15);
    duck.rotation.set(0, -a - PI / 2, Math.sin(t * 2.6 + 1) * 0.08);
  };
  g.userData.update(0);
  return g;
}

// =====================================================================================
// Trampolim: lona preta redonda, proteção azul em volta, molas e pernas.
// =====================================================================================
function trampoline() {
  const g = group();
  const y = 0.82;
  g.add(at(cyl(1.62, 1.62, 0.06, C.tramMat, 28), 0, y, 0));
  const pad = at(torus(1.82, 0.27, C.tramPad, 6, 32), 0, y + 0.03, 0, -PI / 2, 0, 0);
  pad.scale.z = 0.55;
  g.add(pad);
  g.add(at(torus(0.95, 0.035, '#3a3a44', 3, 24), 0, y + 0.035, 0, -PI / 2, 0, 0)); // costura da lona
  for (let k = 0; k < 16; k++) { // molas (entre a lona e a proteção)
    const a = k / 16 * PI * 2;
    g.add(at(box(0.26, 0.04, 0.06, '#c3ccd6'), Math.cos(a) * 1.6, y + 0.02, Math.sin(a) * 1.6, 0, -a, 0));
  }
  for (let k = 0; k < 6; k++) { // pernas em arco (W)
    const a = (k / 6 + 1 / 12) * PI * 2, cx = Math.cos(a) * 1.8, cz = Math.sin(a) * 1.8;
    g.add(at(cyl(0.07, 0.07, y, C.metal, 5), cx, y / 2, cz));
  }
  // escadinha na frente
  const lz = 2.05;
  g.add(limb([-0.3, 0, lz + 0.15], [-0.3, y, lz - 0.1], 0.05, 0.05, C.metal, 4));
  g.add(limb([0.3, 0, lz + 0.15], [0.3, y, lz - 0.1], 0.05, 0.05, C.metal, 4));
  g.add(at(box(0.66, 0.05, 0.12, C.metal), 0, 0.3, lz + 0.06));
  g.add(at(box(0.66, 0.05, 0.12, C.metal), 0, 0.58, lz - 0.02));
  return g;
}

// =====================================================================================
// Balanço: estrutura em A de madeira, travessa ao longo de X e dois assentos coloridos.
// =====================================================================================
function swing() {
  const g = group();
  const top = 2.75, hx = 1.8;
  for (const sx of [-1, 1]) {
    g.add(limb([sx * (hx + 0.2), 0, 1.15], [sx * hx, top, 0], 0.15, 0.13, C.swingWood, 6));
    g.add(limb([sx * (hx + 0.2), 0, -1.15], [sx * hx, top, 0], 0.15, 0.13, C.swingWood, 6));
    g.add(limb([sx * (hx + 0.14), 0.95, 0.76], [sx * (hx + 0.14), 0.95, -0.76], 0.09, 0.09, C.swingWood, 5)); // travessinha
  }
  g.add(limb([-hx - 0.3, top + 0.06, 0], [hx + 0.3, top + 0.06, 0], 0.18, 0.18, C.swingWood, 7));
  const seatY = 0.66, len = top - seatY;
  const seat = (key, color) => dynamic(compound(key, () => group(
    at(box(1.0, 0.14, 0.55, color), 0, -len, 0),
    limb([-0.44, 0, 0], [-0.44, -len, 0], 0.045, 0.045, C.rope, 4),
    limb([0.44, 0, 0], [0.44, -len, 0], 0.045, 0.045, C.rope, 4),
  )));
  const s1 = at(seat('seatRed', C.seatRed), -0.82, top, 0);
  const s2 = at(seat('seatBlue', C.seatBlue), 0.82, top, 0);
  g.add(s1, s2);
  g.userData.update = t => {
    s1.rotation.x = Math.sin(t * 1.9) * 0.22;
    s2.rotation.x = Math.sin(t * 1.9 + 2.2) * 0.16;
  };
  return g;
}

// =====================================================================================
// Bicicleta (vista de lado, ao longo de X): quadro turquesa, rodas pretas com raios, paralamas, cestinha.
// =====================================================================================
function bike() {
  const g = group();
  const b = group();
  const R = 0.56, wy = R + 0.09, ax = 0.82;
  const F = C.bikeFrame;
  for (const x of [-ax, ax]) {
    b.add(at(torus(R, 0.09, C.tire, 6, 22), x, wy, 0));
    for (let k = 0; k < 4; k++) b.add(at(box(0.035, R * 2 - 0.04, 0.03, C.spoke), x, wy, 0, 0, 0, k * PI / 4));
    b.add(at(cyl(0.09, 0.09, 0.16, '#6d767f', 8), x, wy, 0, PI / 2, 0, 0));
  }
  const fender = geo('bikeFender', () => new THREE.TorusGeometry(R + 0.16, 0.06, 4, 10, PI * 0.7));
  b.add(at(mesh(fender, F), -ax, wy, 0, 0, 0, PI * 0.22));
  b.add(at(mesh(fender, F), ax, wy, 0, 0, 0, PI * 0.08));
  const A = [-ax, wy, 0], BB = [-0.1, wy - 0.02, 0], S = [-0.38, 1.48, 0], Ht = [0.52, 1.42, 0], Hb = [0.58, 1.12, 0], Fa = [ax, wy, 0];
  const r = 0.075;
  b.add(limb(BB, S, r, r, F, 6));
  b.add(limb(S, Ht, r, r, F, 6));
  b.add(limb(BB, Hb, r + 0.01, r, F, 6));
  b.add(limb(A, BB, 0.055, 0.055, F, 5));
  b.add(limb(A, S, 0.055, 0.055, F, 5));
  b.add(limb(Hb, Fa, 0.06, 0.055, F, 5));
  b.add(limb(Ht, Hb, r + 0.01, r + 0.01, F, 6));
  // guidão, selim, pedal
  b.add(limb(Ht, [0.44, 1.7, 0], 0.05, 0.05, '#555c63', 5));
  b.add(at(box(0.1, 0.1, 0.78, C.black), 0.44, 1.72, 0));
  b.add(limb([-0.38, 1.48, 0], [-0.42, 1.6, 0], 0.04, 0.04, '#555c63', 4));
  b.add(at(box(0.5, 0.12, 0.26, C.black), -0.46, 1.66, 0));
  b.add(at(cyl(0.14, 0.14, 0.06, '#555c63', 8), BB[0], BB[1], 0.06, PI / 2, 0, 0));
  b.add(at(box(0.08, 0.34, 0.05, '#555c63'), BB[0] + 0.05, BB[1] - 0.12, 0.1, 0, 0, 0.4));
  // cestinha na frente
  b.add(at(box(0.5, 0.36, 0.48, C.basket), 0.78, 1.62, 0));
  b.add(at(box(0.52, 0.06, 0.5, '#a97a36'), 0.78, 1.82, 0));
  // Tamanho de brinquedo (~3.7 de comprimento) e levemente inclinada para trás: o plano da bicicleta
  // fica mais de frente para a câmera alta, e as rodas aparecem como círculos e não como riscos.
  b.scale.setScalar(1.3);
  b.rotation.x = -12 * DEG;
  g.add(b);
  return g;
}

// =====================================================================================
// Flamingo de jardim: rosa-choque, corpo gordo, pescoço em S, bico com ponta preta, numa perna só.
// =====================================================================================
function flamingo() {
  // Flamingo de brinquedo (~3.6 de altura, ~2.6 de comprimento), de perfil com um leve 3/4.
  const g = group();
  const P = C.flamingo;
  const body = group(
    blob(0.62, P, 1.55, 0.88, 1.0, 0, 0, 0, 12),
    at(cone(0.3, 0.6, P, 6), 0.95, 0.16, 0, 0, 0, -PI / 2 - 0.5), // cauda
    blob(0.46, C.flamingoLight, 1.35, 0.62, 0.35, 0.16, 0.1, 0.42, 10), // asas
    blob(0.46, C.flamingoLight, 1.35, 0.62, 0.35, 0.16, 0.1, -0.42, 10),
  );
  at(body, 0.15, 1.75, 0, 0, 0, 0.12);
  g.add(body);
  const neck = geo('flamingoNeck', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, 1.9, 0), new THREE.Vector3(-0.9, 2.25, 0), new THREE.Vector3(-0.7, 2.62, 0),
    new THREE.Vector3(-0.42, 2.88, 0), new THREE.Vector3(-0.52, 3.2, 0), new THREE.Vector3(-0.74, 3.33, 0),
  ]), 18, 0.14, 6, false));
  g.add(mesh(neck, P));
  g.add(at(sphere(0.26, P, 10, 7), -0.8, 3.33, 0));
  g.add(at(cone(0.115, 0.32, C.beakPale, 6), -1.07, 3.24, 0, 0, 0, PI / 2 + 0.7));
  g.add(at(cone(0.08, 0.18, C.black, 6), -1.23, 3.08, 0, 0, 0, PI / 2 + 1.2));
  g.add(at(sphere(0.06, C.black, 5, 3), -0.85, 3.43, 0.2));
  g.add(at(sphere(0.06, C.black, 5, 3), -0.85, 3.43, -0.2));
  // perna reta até o chão + perna dobrada
  g.add(limb([0.1, 1.3, 0.06], [0.06, 0, 0.06], 0.06, 0.06, C.flamingoLeg, 5));
  g.add(limb([0.28, 1.3, -0.06], [0.56, 0.9, -0.06], 0.06, 0.06, C.flamingoLeg, 5));
  g.add(limb([0.56, 0.9, -0.06], [0.2, 0.76, -0.06], 0.055, 0.055, C.flamingoLeg, 5));
  g.add(at(blob(0.16, C.flamingoLeg, 1.4, 0.35, 1, 0, 0, 0, 6), -0.03, 0.04, 0.06));
  g.rotation.y = 0.25; // leve 3/4 para a câmera ver o corpo e o pescoço
  // Inclinado para trás (topo para o norte), como o galo do telhado: vista da câmera alta (~57°) o pescoço
  // em S aparecia escondido atrás do corpo; assim a silhueta pescoço + cabeça fica de frente para a câmera.
  const tilt = group(g);
  tilt.rotation.x = -26 * DEG;
  return group(tilt);
}

// =====================================================================================
// Gnomo de jardim: chapéu vermelho pontudo enorme, barba branca, casaco azul, rosto cor de pele.
// =====================================================================================
function gnome() {
  // Gnomo gorducho de brinquedo (~3.6 de altura, ~1.9 de largura) para ser lido de longe.
  const g = group();
  g.add(blob(0.26, C.boot, 1.1, 0.65, 1.5, -0.32, 0.15, 0.18, 6));
  g.add(blob(0.26, C.boot, 1.1, 0.65, 1.5, 0.32, 0.15, 0.18, 6));
  g.add(at(cyl(0.56, 0.82, 1.15, C.gnomeCoat, 12), 0, 0.72, 0));
  g.add(at(cyl(0.74, 0.77, 0.17, C.belt, 12), 0, 0.5, 0));
  g.add(at(box(0.26, 0.22, 0.08, C.buckle), 0, 0.5, 0.76));
  g.add(blob(0.24, C.gnomeCoat, 1, 1.6, 1, -0.74, 0.95, 0.1, 6));
  g.add(blob(0.24, C.gnomeCoat, 1, 1.6, 1, 0.74, 0.95, 0.1, 6));
  g.add(at(sphere(0.19, C.skin, 6, 4), -0.74, 0.58, 0.22));
  g.add(at(sphere(0.19, C.skin, 6, 4), 0.74, 0.58, 0.22));
  g.add(at(sphere(0.5, C.skin, 12, 8), 0, 1.66, 0.04));
  g.add(at(cone(0.56, 1.05, C.beard, 9), 0, 1.08, 0.36, PI + 0.3, 0, 0)); // barba (cone para baixo)
  g.add(blob(0.44, C.beard, 1.05, 0.55, 0.7, 0, 1.44, 0.34, 8)); // bigode
  g.add(at(sphere(0.18, C.nose, 7, 5), 0, 1.6, 0.54));
  g.add(at(sphere(0.06, C.black, 5, 3), -0.2, 1.8, 0.45));
  g.add(at(sphere(0.06, C.black, 5, 3), 0.2, 1.8, 0.45));
  g.add(at(cyl(0.6, 0.62, 0.14, C.gnomeHat, 14), 0, 1.98, -0.02));
  g.add(at(cone(0.6, 1.75, C.gnomeHat, 12), 0.2, 2.8, -0.12, -0.1, 0, -0.22)); // chapéu alto, caído para o lado
  return g;
}

// =====================================================================================
// Varal com roupas: dois postes em T, varal ao longo de X, camisa, calça, toalha listrada e meia.
// As roupas balançam, já inclinadas pelo vento em direção à câmera (ficam mais visíveis).
// =====================================================================================
function clothesline() {
  const g = group();
  const hx = 2.05, top = 2.9, ly = top - 0.12;
  for (const sx of [-1, 1]) {
    g.add(at(cyl(0.08, 0.09, top, C.post, 6), sx * hx, top / 2, 0));
    g.add(at(box(0.12, 0.12, 0.8, C.post), sx * hx, top - 0.06, 0));
  }
  g.add(limb([-hx, ly, 0.3], [hx, ly, 0.3], 0.025, 0.025, C.line, 4));
  g.add(limb([-hx, ly, -0.3], [hx, ly, -0.3], 0.025, 0.025, C.line, 4));
  const pins = xs => xs.map(x => at(box(0.07, 0.2, 0.08, C.pin), x, 0, 0));
  const T = 0.05;
  const garments = [
    ['shirt', -1.1, () => group(
      at(box(0.78, 0.92, T, C.shirt), 0, -0.5, 0),
      at(box(0.34, 0.3, T, C.shirt), -0.5, -0.2, 0, 0, 0, 0.5),
      at(box(0.34, 0.3, T, C.shirt), 0.5, -0.2, 0, 0, 0, -0.5),
      at(box(0.24, 0.1, T + 0.01, '#ffffff'), 0, -0.07, 0.005), ...pins([-0.3, 0.3]))],
    ['pants', 0.2, () => group(
      at(box(0.66, 0.24, T, C.pants), 0, -0.12, 0),
      at(box(0.3, 0.95, T, C.pants), -0.18, -0.68, 0, 0, 0, 0.05),
      at(box(0.3, 0.95, T, C.pants), 0.18, -0.68, 0, 0, 0, -0.05), ...pins([-0.26, 0.26]))],
    ['towel', 1.1, () => group(
      at(box(0.66, 0.98, T, C.towel), 0, -0.49, 0),
      at(box(0.67, 0.1, T + 0.01, C.towelStripe), 0, -0.72, 0),
      at(box(0.67, 0.1, T + 0.01, C.towelStripe), 0, -0.86, 0), ...pins([-0.25, 0.25]))],
    ['sock', 1.72, () => group(
      at(box(0.24, 0.58, T, C.sock), 0, -0.29, 0),
      at(box(0.4, 0.22, T, C.sock), 0.08, -0.62, 0),
      at(box(0.25, 0.1, T + 0.01, C.seatRed), 0, -0.05, 0), ...pins([0]))],
  ];
  const parts = garments.map(([key, x, build]) => {
    const m = dynamic(compound('cloth:' + key, build));
    at(m, x, ly, 0.3);
    m.scale.set(1.2, 1.5, 1.2);
    g.add(m);
    return m;
  });
  const LEAN = -0.45; // vento soprando para +Z
  g.userData.update = t => {
    for (let i = 0; i < parts.length; i++) {
      parts[i].rotation.x = LEAN + Math.sin(t * 2.4 + i * 1.3) * 0.1;
      parts[i].rotation.z = Math.sin(t * 1.7 + i * 2.1) * 0.05;
    }
  };
  g.userData.update(0);
  return g;
}

// =====================================================================================
// Pilha de pneus: três pneus empilhados meio tortos e um encostado ao lado.
// =====================================================================================
function tires() {
  const g = group();
  const R = 0.7, tube = 0.33;
  const wall = geo('tireWall', () => new THREE.TorusGeometry(R + 0.04, 0.06, 3, 18));
  // pneu = anel preto + faixa lateral cinza (deixa claro que é pneu); o grupo gira como um todo
  const tire = (color, x, y, z, rx, ry, rz) => at(group(
    torus(R, tube, color, 7, 18),
    at(mesh(wall, '#9aa0a6'), 0, 0, tube * 0.78),
  ), x, y, z, rx, ry, rz);
  const sx = -0.72, sz = -0.2;
  const stack = [[0, 0, C.tireDark, 0], [0.1, -0.06, C.tire2, 0.06], [-0.05, 0.05, C.tire3, -0.05]];
  stack.forEach(([x, z, c, tilt], k) => g.add(tire(c, sx + x, tube + k * tube * 1.9, sz + z, -PI / 2 + tilt, 0, tilt * 0.6)));
  // miolo escuro (para o furo não mostrar grama)
  g.add(at(cyl(0.45, 0.45, 0.06, '#141414', 12), sx, 0.05, sz));
  // pneu encostado de pé, virado para a câmera
  g.add(tire(C.tireDark, 1.12, R + tube + 0.08, 0.6, -0.3, 0.3, 0));
  return g;
}

// =====================================================================================
// Fonte pequena: bacia redonda de pedra, coluna com dois pratos, água azul, jato e ondinhas animadas.
// =====================================================================================
function fountain() {
  const g = group();
  const Wm = { roughness: 0.25 };
  g.add(at(cyl(1.8, 1.9, 0.62, C.stone, 16), 0, 0.31, 0));
  g.add(at(torus(1.68, 0.19, C.stoneLight, 6, 24), 0, 0.64, 0, -PI / 2, 0, 0));
  g.add(at(cyl(1.52, 1.52, 0.04, C.water, 20, Wm), 0, 0.63, 0));
  g.add(at(cyl(0.3, 0.42, 1.05, C.stoneLight, 8), 0, 1.1, 0));
  g.add(at(cyl(0.78, 0.26, 0.3, C.stone, 12), 0, 1.72, 0));
  g.add(at(cyl(0.66, 0.66, 0.04, C.water, 14, Wm), 0, 1.86, 0));
  g.add(at(cyl(0.12, 0.17, 0.5, C.stoneLight, 7), 0, 2.1, 0));
  g.add(at(cyl(0.4, 0.13, 0.2, C.stone, 10), 0, 2.42, 0));
  g.add(at(cyl(0.32, 0.32, 0.03, C.water, 10, Wm), 0, 2.52, 0));
  // filetes de água caindo do prato do meio na bacia
  const streams = geo('fountainStreams', () => {
    const parts = [];
    for (let k = 0; k < 8; k++) {
      const a = (k + 0.5) / 8 * PI * 2, cx = Math.sin(a), cz = Math.cos(a);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(cx * 0.74, 1.86, cz * 0.74), new THREE.Vector3(cx * 1.05, 1.8, cz * 1.05),
        new THREE.Vector3(cx * 1.12, 0.66, cz * 1.12));
      parts.push(new THREE.TubeGeometry(curve, 6, 0.06, 4, false));
    }
    const m = mergeGeometries(parts, false);
    parts.forEach(p => p.dispose());
    return m;
  });
  g.add(mesh(streams, C.waterLight));
  // jato no topo (animado)
  const jet = dynamic(compound('fountainJet', () => group(
    at(cone(0.12, 0.7, C.waterLight, 7), 0, 0.35, 0),
    at(sphere(0.16, C.foam, 7, 5), 0, 0.7, 0),
    at(sphere(0.09, C.foam, 5, 4), 0.2, 0.52, 0.08),
    at(sphere(0.09, C.foam, 5, 4), -0.18, 0.5, -0.1),
    at(sphere(0.08, C.foam, 5, 4), 0.02, 0.46, 0.22),
  )));
  at(jet, 0, 2.53, 0);
  g.add(jet);
  // ondinhas saindo da coluna até a borda
  const ripples = [0, 1].map(() => {
    const r = dynamic(torus(1, 0.035, C.foam, 3, 28));
    r.rotation.x = -PI / 2;
    r.position.y = 0.66;
    g.add(r);
    return r;
  });
  g.userData.update = t => {
    const s = 1 + Math.sin(t * 7) * 0.12;
    jet.scale.set(1, s, 1);
    jet.rotation.y = t * 1.5;
    for (let i = 0; i < ripples.length; i++) {
      const k = ((t * 0.45 + i * 0.5) % 1);
      const r = 0.45 + k * 1.0;
      ripples[i].scale.set(r, r, 1);
    }
  };
  g.userData.update(0);
  return g;
}

export const YARD_BUILDERS = {
  fruit, bare, cactus, sunflowers, ballbush, doghouse, pool, trampoline,
  swing, bike, flamingo, gnome, clothesline, tires, fountain,
};
