// O mundo: céu, luz com sombras, chão (grama + asfalto + faixas), sebe com a entrada "VILA ADRESS",
// árvores decorativas fora do mapa, os 16 lotes (construídos uma vez e reposicionados a cada rodada)
// e os moradores (criados sob demanda na primeira visita).
import * as THREE from 'three';
import {
  HEDGE, ROAD, LOT, WALK, MAP, GRID, PLAZA, lotX, lotZ, slotOrigin, roadCenter, ENTRANCE, LOT_ANCHORS, SOLIDS, TERRAIN, CANAL, RAIL, VENICE,
} from './layout.js';
import { HOUSES } from './data.js';
import { buildTerrain } from './terrain.js';
import { buildGasStation } from './models/gas.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl, cone, sphere, at, bakeStatic, dynamic, textTexture } from './models/kit.js';

// ---------- Paleta do cenário ----------
const SKY = '#bfe3f2';
// grama de fora do bairro (a cidade usa uma versão amarelada e seca)
const GREEN_GRASS = { grass: '#7fb158', patches: ['#79ab53', '#86b85e'], shadow: '#669347' };
const LAGOON = { grass: '#3f8fb0', patches: ['#468fb0', '#3a88a8'], shadow: '#367f9e' };   // Veneza: laguna em volta
const DRY_GRASS = { grass: '#a9ab5e', patches: ['#b3a95c', '#9fa457'], shadow: '#8d8f4c' };
let GRASS = GREEN_GRASS.grass, GRASS_PATCHES = GREEN_GRASS.patches, GRASS_SHADOW = GREEN_GRASS.shadow;
const ASPHALT = '#5d6470', CENTER_LINE = '#f2d45c', ZEBRA = '#ece8dc', MANHOLE = '#4b525c', MANHOLE_RIM = '#6b727d';
const CURB = '#c9c2b2';
const HEDGE_BASE = '#3d7c38', HEDGE_TOPS = ['#478d41', '#51994a', '#40833b'];
const STONE = '#ddd3c2', STONE_CAP = '#b7ab97', LAMP = '#fff1bf', WOOD = '#6b4526', WOOD_DARK = '#5a3a20';
const TRUNK = '#7a5230', LEAVES = ['#4f9a45', '#5ea84e', '#3f8a3c', '#6db256'], PINE = ['#2f7a45', '#3a8a50'];
const FLOWERS = ['#ff8fb8', '#ffd84a', '#ffffff', '#c792ea'];

// Sol vindo do sul-sudeste, alto: as fachadas e os quintais da frente (voltados para a câmera) ficam iluminados
// e as sombras das casas caem para trás (noroeste), sem esconder nada do que as pistas citam.
const SUN_DIR = new THREE.Vector3(0.45, 1.0, 0.75).normalize();

/** Gerador pseudoaleatório determinístico (o cenário é sempre igual). */
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Retângulo horizontal fino (decalque no chão) de x0..x1 × z0..z1, topo em y. */
function slab(x0, z0, x1, z1, color, y = 0, h = 0.02) {
  return at(box(+(x1 - x0).toFixed(3), h, +(z1 - z0).toFixed(3), color), (x0 + x1) / 2, y - h / 2, (z0 + z1) / 2);
}

function plane(w, d, color) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  return mesh(g, color);
}

// ---------- Chão ----------
function buildGround(venice = false) {
  const g = new THREE.Group();
  const rand = rng(7);
  const cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;

  // grama até o horizonte
  g.add(at(plane(4000, 4000, GRASS), MAP / 2, -0.04, MAP / 2));
  // manchas de grama fora do bairro (quebram a monotonia)
  const disc = new THREE.CylinderGeometry(1, 1, 0.02, 9);
  for (let i = 0; i < 70; i++) {
    const x = -90 + rand() * (MAP + 180), z = -80 + rand() * (MAP + 170);
    if (x > -4 && x < MAP + 4 && z > -4 && z < MAP + 4) continue;
    if (Math.abs(x - cx) < ROAD && z < 0) continue;
    const m = at(mesh(disc, GRASS_PATCHES[i % 2]), x, -0.03, z, 0, rand() * 3, 0);
    m.scale.set(2 + rand() * 4, 1, 1.5 + rand() * 3);
    g.add(m);
  }

  // asfalto dentro da sebe (os lotes com suas calçadas ficam por cima)
  // (vai um pouco por baixo da sebe para não aparecer grama entre a sebe e a rua)
  g.add(at(plane(MAP - 0.6, MAP - 0.6, ASPHALT), MAP / 2, 0, MAP / 2));
  // estrada de acesso: continua para fora pela abertura na sebe norte
  if (venice) return g;                        // Veneza: só água (sem estrada de acesso, faixas, faixa de pedestres nem bueiros)
  const OUT = 420;
  g.add(at(plane(ROAD, OUT + 0.3, ASPHALT), cx, 0, 0.3 - (OUT + 0.3) / 2));
  for (const x of [ENTRANCE.x0 - 0.3, ENTRANCE.x1]) g.add(slab(x, -OUT, x + 0.3, 0, CURB, 0.12, 0.14));

  // faixas amarelas tracejadas no eixo de cada rua, só entre os cruzamentos (como na versão 2D)
  const DASH = 1.4, GAP = 1.2, LW = 0.22;
  const dashes = (a, b, along) => {
    const len = b - a, n = Math.floor((len + GAP) / (DASH + GAP));
    const start = a + (len - (n * DASH + (n - 1) * GAP)) / 2;
    for (let k = 0; k < n; k++) along(start + k * (DASH + GAP) + DASH / 2);
  };
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i);
    for (let j = 0; j < GRID; j++) {
      const a = lotX(j) - WALK + 1, b = lotX(j) + LOT + WALK - 1;
      dashes(a, b, m => g.add(at(box(DASH, 0.02, LW, CENTER_LINE), m, 0.01, c)));   // ruas leste–oeste
      dashes(a, b, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), c, 0.01, m)));   // ruas norte–sul
    }
  }
  dashes(-120, -1.2, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), cx, 0.01, m)));

  // sombra "falsa" da sebe do lado de fora (oeste e norte): a grama de fora não recebe sombras reais
  g.add(slab(-0.65, 0, 0.3, MAP, GRASS_SHADOW, -0.012, 0.01));
  g.add(slab(-0.65, -1.0, ENTRANCE.x0 - 0.3, 0.3, GRASS_SHADOW, -0.012, 0.01));
  g.add(slab(ENTRANCE.x1 + 0.3, -1.0, MAP, 0.3, GRASS_SHADOW, -0.012, 0.01));

  // faixa de pedestres na entrada
  for (let x = ENTRANCE.x0 + 0.7; x < ENTRANCE.x1 - 0.5; x += 0.95) g.add(slab(x, 0.15, x + 0.5, HEDGE - 0.15, ZEBRA, 0.02));

  // bueiros (planos, não são obstáculos)
  const holes = [
    [roadCenter(0) + 1.9, lotZ(1) + 6], [lotX(1) + 5, roadCenter(2) - 1.9], [roadCenter(3) - 1.9, lotZ(2) + 11],
    [lotX(3) + 12, roadCenter(4) + 1.9], [roadCenter(4) + 1.9, lotZ(0) + 9], [lotX(0) + 13, roadCenter(1) + 1.9],
  ];
  for (const [x, z] of holes) {
    g.add(at(cyl(0.62, 0.62, 0.03, MANHOLE_RIM, 10), x, 0.012, z));
    g.add(at(cyl(0.5, 0.5, 0.03, MANHOLE, 10), x, 0.022, z));
  }
  return g;
}

// ---------- Sebe, portal e placa ----------
function buildHedge() {
  const g = new THREE.Group();
  const rand = rng(11);
  const bump = new THREE.IcosahedronGeometry(0.72, 0);
  const small = new THREE.IcosahedronGeometry(0.46, 0);
  // [x0, z0, x1, z1, lados com folhagem baixa visíveis pela câmera: -1 = lado de menor coordenada, +1 = maior]
  const segs = [
    [0, 0, ENTRANCE.x0, HEDGE, [1]], [ENTRANCE.x1, 0, MAP, HEDGE, [1]],   // norte (com a entrada): face interna
    [0, MAP - HEDGE, MAP, MAP, [-1, 1]],                                  // sul: face interna e externa
    [0, HEDGE, HEDGE, MAP - HEDGE, [1]], [MAP - HEDGE, HEDGE, MAP, MAP - HEDGE, [-1]], // oeste, leste
  ];
  let n = 0;
  for (const [x0, z0, x1, z1, faces] of segs) {
    const alongX = x1 - x0 > z1 - z0;
    // miolo um pouco mais estreito: as bolotas de folhagem formam as faces da sebe
    const bw = alongX ? x1 - x0 : HEDGE - 0.3, bd = alongX ? HEDGE - 0.3 : z1 - z0;
    g.add(at(box(+bw.toFixed(3), 0.9, +bd.toFixed(3), HEDGE_BASE), (x0 + x1) / 2, 0.45, (z0 + z1) / 2));
    const len = alongX ? x1 - x0 : z1 - z0;
    const mid = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2;
    const place = (geo, along, across, y, sx, sy, sz) => {
      const m = at(mesh(geo, mat(HEDGE_TOPS[n++ % 3])), alongX ? along : across, y, alongX ? across : along,
        rand() * 6, rand() * 6, rand() * 6);
      m.scale.set(alongX ? sx : sz, sy, alongX ? sz : sx);
      g.add(m);
    };
    const count = Math.max(1, Math.round(len / 1.25));
    for (let k = 0; k < count; k++) {
      const s = 0.98 + rand() * 0.14;
      place(bump, (alongX ? x0 : z0) + (k + 0.5) / count * len, mid + (rand() - 0.5) * 0.12, 0.8 + rand() * 0.08, s * 1.3, s * 0.92, s * 0.98);
    }
    const lowCount = Math.max(1, Math.round(len / 1.05));
    for (const side of faces) {
      for (let k = 0; k < lowCount; k++) {
        const s = 0.9 + rand() * 0.25;
        place(small, (alongX ? x0 : z0) + (k + 0.3 + rand() * 0.4) / lowCount * len, mid + side * (HEDGE / 2 - 0.42),
          0.38 + rand() * 0.06, s * 1.35, s * 0.9, s * 0.85);
      }
    }
  }

  // pilares do portal (sobre a sebe, fora da pista)
  for (const x of [ENTRANCE.x0 - 0.5, ENTRANCE.x1 + 0.5]) {
    g.add(at(box(1.0, 2.3, 1.0, STONE), x, 1.15, HEDGE / 2));
    g.add(at(box(1.2, 0.2, 1.2, STONE_CAP), x, 2.4, HEDGE / 2));
    g.add(at(cyl(0.12, 0.2, 0.2, WOOD_DARK, 8), x, 2.6, HEDGE / 2));
    g.add(at(mesh(new THREE.IcosahedronGeometry(0.3, 1), mat(LAMP, { emissive: '#ffe9a0', emissiveIntensity: 0.5 })), x, 2.9, HEDGE / 2));
  }

  // placa "VILA ADRESS" à esquerda da entrada, inclinada para trás para ser lida pela câmera
  const SIGN_W = 11, SIGN_H = 2.3, sx = ENTRANCE.x0 - 7.6, sz = HEDGE / 2;
  // postes atrás da placa (encostam no verso dela)
  for (const dx of [-SIGN_W / 2 + 1.2, SIGN_W / 2 - 1.2]) g.add(at(box(0.3, 3.2, 0.3, WOOD), sx + dx, 1.6, sz - 0.4));
  const sign = new THREE.Group();
  sign.add(at(box(SIGN_W, SIGN_H, 0.22, WOOD_DARK), 0, 0, 0));
  const tex = textTexture('VILA ADRESS', {
    width: 1024, height: 200, bg: '#8a5a36', fg: '#fff3d6', font: 'bold 132px "Trebuchet MS", "Segoe UI", sans-serif',
  });
  const face = dynamic(at(new THREE.Mesh(new THREE.PlaneGeometry(SIGN_W - 0.5, (SIGN_W - 0.5) * 200 / 1024),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })), 0, 0, 0.115));
  face.receiveShadow = true;
  sign.add(face);
  g.add(at(sign, sx, 2.85, sz + 0.05, -0.55, 0, 0));
  return g;
}

// ---------- Árvores e arbustos fora do bairro ----------
function buildOutskirts(ground) {
  const g = new THREE.Group();
  const rand = rng(23);
  const blob = new THREE.IcosahedronGeometry(1, 0);
  const shadowDisc = new THREE.CylinderGeometry(1, 1, 0.02, 9);
  const sx = -SUN_DIR.x / SUN_DIR.y, sz = -SUN_DIR.z / SUN_DIR.y;   // deslocamento da sombra por unidade de altura
  const shadowRot = Math.atan2(-sz, sx);
  const fakeShadow = (x, z, h, r) => {
    const m = at(mesh(shadowDisc, GRASS_SHADOW), x + sx * h * 0.55, -0.015, z + sz * h * 0.55, 0, shadowRot, 0);
    m.scale.set(r * 1.35, 1, r * 0.95);
    ground.add(m);
  };

  const cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;
  const ok = (x, z, r) => {
    if (x > -6 - r && x < MAP + 6 + r && z > -6 - r && z < MAP + 8 + r) return false; // longe da sebe
    if (z > MAP && z < MAP + 9 + r) return false;         // ao sul: não pode cobrir a sebe vista pela câmera
    if (Math.abs(x - cx) < ROAD / 2 + 2 + r && z < 0) return false; // estrada de acesso livre
    return true;
  };
  const edgeDist = (x, z) => Math.hypot(Math.max(-x, 0, x - MAP), Math.max(-z, 0, z - MAP));
  const placed = [];
  const free = (x, z, r) => placed.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + r + 0.8);

  let tries = 0, trees = 0;
  while (trees < 85 && tries++ < 20000) {
    const x = -85 + rand() * (MAP + 170), z = -95 + rand() * (MAP + 200);
    if (rand() > Math.exp(-edgeDist(x, z) / 28)) continue;   // mais denso perto da sebe
    const s = 0.8 + rand() * 0.6, r = 2.2 * s;
    if (!ok(x, z, r) || !free(x, z, r)) continue;
    placed.push([x, z, r]);
    SOLIDS.push({ x0: x - r * 0.3, z0: z - r * 0.3, x1: x + r * 0.3, z1: z + r * 0.3 });   // tronco (a van bate)
    trees++;
    if (rand() < 0.3) {
      // pinheiro
      g.add(at(cyl(0.22 * s, 0.3 * s, 1.2 * s, TRUNK, 6), x, 0.6 * s, z));
      g.add(at(cone(1.9 * s, 2.6 * s, PINE[trees % 2], 7), x, 2.2 * s, z));
      g.add(at(cone(1.4 * s, 2.2 * s, PINE[(trees + 1) % 2], 7), x, 3.5 * s, z));
      fakeShadow(x, z, 2.6 * s, 1.6 * s);
    } else {
      // árvore redonda
      g.add(at(cyl(0.26 * s, 0.36 * s, 2.0 * s, TRUNK, 6), x, 1.0 * s, z));
      const c = LEAVES[trees % LEAVES.length];
      const b1 = at(mesh(blob, c), x, 2.7 * s, z, rand() * 3, rand() * 3, 0); b1.scale.setScalar(1.7 * s);
      const b2 = at(mesh(blob, LEAVES[(trees + 1) % LEAVES.length]), x + 0.9 * s, 2.3 * s, z + 0.4 * s, rand() * 3, 0, rand() * 3);
      b2.scale.setScalar(1.15 * s);
      const b3 = at(mesh(blob, c), x - 0.7 * s, 3.4 * s, z - 0.3 * s, 0, rand() * 3, rand() * 3); b3.scale.setScalar(1.05 * s);
      g.add(b1, b2, b3);
      fakeShadow(x, z, 2.7 * s, 1.9 * s);
    }
  }
  let bushes = 0; tries = 0;
  while (bushes < 70 && tries++ < 20000) {
    const x = -85 + rand() * (MAP + 170), z = -95 + rand() * (MAP + 200);
    if (rand() > Math.exp(-edgeDist(x, z) / 22)) continue;
    const s = 0.6 + rand() * 0.6, r = 1.1 * s;
    if (!ok(x, z, r) || !free(x, z, r)) continue;
    placed.push([x, z, r]);
    SOLIDS.push({ x0: x - r * 0.3, z0: z - r * 0.3, x1: x + r * 0.3, z1: z + r * 0.3 });   // tronco (a van bate)
    bushes++;
    const b = at(mesh(blob, LEAVES[(bushes + 2) % LEAVES.length]), x, 0.55 * s, z, rand() * 3, rand() * 3, 0);
    b.scale.set(1.2 * s, 0.85 * s, 1.1 * s);
    g.add(b);
    if (bushes % 2 === 0) {
      // florzinhas
      const fc = FLOWERS[(bushes / 2) % FLOWERS.length];
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7 + rand();
        g.add(at(box(0.22, 0.22, 0.22, fc), x + Math.cos(a) * 0.8 * s, 0.95 * s, z + Math.sin(a) * 0.75 * s));
      }
    }
    fakeShadow(x, z, 0.5 * s, 1.2 * s);
  }
  return g;
}

// ---------- Luz ----------
/** Sol fixo no céu: na direção de quem acaba de entrar no bairro (sul, +Z), ~18° acima do horizonte. */
function buildSun() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const g = cv.getContext('2d'), c = 128;
  const glow = g.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(255,253,235,1)'); glow.addColorStop(0.17, 'rgba(255,247,200,1)');   // disco
  glow.addColorStop(0.2, 'rgba(255,240,170,0.75)'); glow.addColorStop(0.45, 'rgba(255,236,160,0.22)');   // brilho em volta
  glow.addColorStop(1, 'rgba(255,236,160,0)');
  g.fillStyle = glow; g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, toneMapped: false }));
  const el = THREE.MathUtils.degToRad(18), D = 1200;
  sun.position.set(MAP / 2, D * Math.sin(el), MAP / 2 + D * Math.cos(el));
  sun.scale.setScalar(260);
  sun.name = 'sun';
  return sun;
}

function buildLights(scene) {
  const hemi = new THREE.HemisphereLight('#e6f3ff', '#8aa66a', 1.7);
  scene.add(hemi);

  const center = new THREE.Vector3(MAP / 2, 0, MAP / 2);
  const sun = new THREE.DirectionalLight('#fff0d9', 2.2);
  sun.position.copy(center).addScaledVector(SUN_DIR, 160);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;

  // câmera de sombra ortográfica ajustada ao bairro (com folga para os telhados)
  const cam = sun.shadow.camera;
  cam.position.copy(sun.position);
  cam.lookAt(center);
  cam.updateMatrixWorld(true);
  const inv = cam.matrixWorldInverse;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  const p = new THREE.Vector3();
  for (const x of [-2, MAP + 2]) for (const y of [0, 10]) for (const z of [-2, MAP + 2]) {
    p.set(x, y, z).applyMatrix4(inv);
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
  }
  cam.left = x0; cam.right = x1; cam.bottom = y0; cam.top = y1;
  cam.near = Math.max(0.5, -z1 - 20); cam.far = -z0 + 20;
  cam.updateProjectionMatrix();

  scene.add(sun, sun.target);
  return { hemi, sun };
}

/** Assa um grupo e ajusta as sombras dos meshes resultantes. */
function baked(root, cast, receive = true) {
  bakeStatic(root);
  root.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  root.matrixAutoUpdate = false;
  root.updateMatrix();
  return root;
}

// ---------- Praça (Bairro 2): lotes unidos, a van não entra ----------
function buildPlaza() {
  const P = PLAZA, g = new THREE.Group();
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, w = P.x1 - P.x0, d = P.z1 - P.z0;
  g.add(at(box(w, 0.17, d, '#d4cdbb'), cx, 0.085, cz));                       // calçada em volta
  g.add(at(box(w - 1.6, 0.2, d - 1.6, '#86c25c'), cx, 0.1, cz));              // gramado
  // caminhos em cruz e em volta do coreto
  g.add(at(box(w - 1.6, 0.22, 3.2, '#e2d6bb'), cx, 0.11, cz));
  g.add(at(box(3.2, 0.22, d - 1.6, '#e2d6bb'), cx, 0.11, cz));
  g.add(at(cyl(7.5, 7.5, 0.24, '#e2d6bb', 24), cx, 0.12, cz));
  // coreto no centro: base, colunas e telhado vermelho e branco
  g.add(at(cyl(4.6, 4.9, 0.7, '#f3ece0', 16), cx, 0.45, cz));
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    g.add(at(cyl(0.18, 0.18, 3.2, '#ffffff', 8), cx + Math.cos(a) * 4, 2.4, cz + Math.sin(a) * 4));
  }
  g.add(at(cone(5.4, 2.4, '#d8473a', 16), cx, 5.1, cz));
  g.add(at(cone(1.2, 1.2, '#ffffff', 12), cx, 6.6, cz));
  // quatro canteiros floridos, árvores, bancos e postes nos quadrantes
  const FLOWERS = ['#ff6fa5', '#ffd12a', '#ffffff', '#9b5de5'];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const qx = cx + sx * w / 4, qz = cz + sz * d / 4;
    g.add(at(cyl(2.4, 2.6, 0.5, '#8a5a36', 14), qx, 0.35, qz));               // canteiro
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2;
      g.add(at(sphere(0.38, FLOWERS[(k + (sx > 0 ? 1 : 0)) % 4], 6, 4), qx + Math.cos(a) * 1.5, 0.75, qz + Math.sin(a) * 1.5));
    }
    for (const [tx, tz] of [[sx * 7.5, sz * 3.5], [sx * 3.5, sz * 7.5]]) {     // árvores
      g.add(at(cyl(0.35, 0.45, 2.4, '#6b4526', 6), qx + tx, 1.3, qz + tz));
      g.add(at(sphere(2.1, '#3f8f3a', 8, 6), qx + tx, 3.6, qz + tz));
    }
    // banco virado para o coreto
    const bx = cx + sx * 9.5, bz = cz + sz * 2.6, ang = sz > 0 ? Math.PI : 0;
    g.add(at(box(3.2, 0.25, 0.9, '#8a5a36'), bx, 0.85, bz, 0, ang, 0));
    g.add(at(box(3.2, 0.8, 0.2, '#8a5a36'), bx, 1.3, bz + (sz > 0 ? 0.45 : -0.45), 0, ang, 0));
    for (const lx of [-1.3, 1.3]) g.add(at(box(0.2, 0.7, 0.8, '#3a3d44'), bx + lx, 0.45, bz));
    // poste de luz no canto do caminho
    const px = cx + sx * 2.4, pz = cz + sz * (d / 2 - 2.2);
    g.add(at(cyl(0.12, 0.15, 3.6, '#3a3d44', 6), px, 1.9, pz));
    g.add(at(sphere(0.4, '#fff3b0', 8, 6, { emissive: '#fff0a0', emissiveIntensity: 0.6 }), px, 3.9, pz));
  }
  // cerquinha baixa em volta do gramado (com aberturas nos caminhos)
  const fenceCol = '#ffffff';
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const len = w / 2 - 3.2;
    g.add(at(box(len, 0.5, 0.15, fenceCol), cx + sx * (1.6 + len / 2 + 0.2), 0.45, cz + sz * (d / 2 - 1.0)));
    g.add(at(box(0.15, 0.5, len, fenceCol), cx + sx * (w / 2 - 1.0), 0.45, cz + sz * (1.6 + len / 2 + 0.2)));
  }
  return g;
}

// ---------- API ----------
export function createWorld({ renderer, buildLot, buildResident, yardBuilders, pool = [...Array(16).keys()], dry = false, venice = false }) {
  const pal = venice ? LAGOON : dry ? DRY_GRASS : GREEN_GRASS;
  GRASS = pal.grass; GRASS_PATCHES = pal.patches; GRASS_SHADOW = pal.shadow;
  if (renderer) {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  // névoa leve na cor do céu: o horizonte fica suave na câmera atrás da van (main.js a afasta na visão geral)
  scene.fog = new THREE.Fog(SKY, 3000, 3200);
  buildLights(scene);
  scene.add(buildSun());

  const solidsStart = SOLIDS.length;          // os troncos das árvores de fora entram em SOLIDS aqui
  const ground = buildGround(venice);
  const outskirts = buildOutskirts(ground);
  if (venice) SOLIDS.length = solidsStart;              // Veneza: sem árvores de fora (laguna)
  const extraSolids = SOLIDS.slice(solidsStart);
  scene.add(baked(ground, false, true));
  // A grama de fora do bairro não recebe sombras (nada relevante projeta nela; as árvores de fora usam sombras
  // falsas): economiza o filtro de sombra em boa parte da tela — ~15% do tempo de GPU na UHD integrada.
  const outside = new Set([GRASS, ...GRASS_PATCHES, GRASS_SHADOW].map(c => mat(c)));
  ground.traverse(o => { if (o.isMesh && outside.has(o.material)) o.receiveShadow = false; });
  if (!venice) { scene.add(baked(buildHedge(), true, true)); scene.add(baked(outskirts, false, false)); }   // Veneza: só laguna em volta
  if (PLAZA) scene.add(baked(buildPlaza(), true, true));
  if (TERRAIN.kind !== 'flat' || CANAL || RAIL || VENICE) scene.add(baked(buildTerrain(), true, true));   // Bairros 9, 10 e 11

  // os 16 lotes, construídos uma única vez (cada casa mantém sua identidade; só muda de lugar)
  // (só as casas deste bairro: `pool`; o array é indexado pelo índice da casa)
  const lots = [];
  for (const h of pool) {
    const lot = buildLot(HOUSES[h], { yardBuilders });
    lot.name = 'lot:' + h;
    scene.add(lot);
    lots[h] = lot;
  }

  // Otimização para GPU integrada: as partes estáticas já "assadas" de cada lote (bakeStatic) são fundidas
  // em UM mesh por material para o bairro inteiro a cada setLayout (16 lotes × N materiais → N draw calls).
  // As partes animadas (dynamic) continuam dentro dos grupos dos lotes.
  const neighborhood = new THREE.Group();
  neighborhood.name = 'neighborhood';
  scene.add(neighborhood);
  const staticParts = [];
  pool.forEach(h => { const lot = lots[h]; staticParts[h] = (() => {
    const parts = [];
    lot.traverse(o => {
      if (!o.isMesh || !o.userData.baked || !o.visible || Array.isArray(o.material) || o.material.transparent) return;
      for (let p = o; p && p !== lot; p = p.parent) if (p.userData.dynamic) return;
      parts.push(o);
    });
    return parts;
  })(); });

  function clearMerged() {
    for (const m of neighborhood.children) m.geometry.dispose();
    neighborhood.clear();
  }

  const hidden = new Set();            // casas destruídas (ficam fora do merge e invisíveis)
  let present = new Set(pool);         // casas/prédios que estão nesta partida (Bairro 5 sorteia quais entram)
  function mergeLots() {
    clearMerged();
    const buckets = new Map();
    for (const h of pool) {
      if (hidden.has(h) || !present.has(h)) continue;
      lots[h].updateMatrixWorld(true);
      for (const m of staticParts[h]) {
        const key = m.material.uuid + (m.castShadow ? '|c' : '|') + (m.receiveShadow ? 'r' : '');
        let b = buckets.get(key);
        if (!b) buckets.set(key, b = { material: m.material, cast: m.castShadow, receive: m.receiveShadow, geos: [] });
        b.geos.push(m.geometry.clone().applyMatrix4(m.matrixWorld));
      }
    }
    let ok = true;
    for (const b of buckets.values()) {
      const g = ok ? mergeGeometries(b.geos, false) : null;
      b.geos.forEach(x => x.dispose());
      if (!g) { ok = false; continue; }
      const m = new THREE.Mesh(g, b.material);
      m.castShadow = b.cast; m.receiveShadow = b.receive;
      m.matrixAutoUpdate = false;
      neighborhood.add(m);
    }
    if (!ok) clearMerged();               // geometrias incompatíveis: volta a desenhar lote por lote
    for (const h of pool) for (const m of staticParts[h]) m.visible = !ok;
  }

  const gasModels = [];                // postos de gasolina (Bairros 4 e 5), construídos na primeira vez

  // moradores: criados na primeira vez que aparecem
  const residents = [];
  let current = null, currentH = -1, currentMood = null;

  function setLayout(layout) {
    present = new Set(layout.filter(h => h >= 0));
    for (const h of pool) lots[h].visible = present.has(h) && !hidden.has(h);
    for (let s = 0; s < layout.length; s++) {
      if (layout[s] < 0) continue;                // lote sem casa (praça, posto)
      const o = slotOrigin(s);
      lots[layout[s]].position.set(o.x, TERRAIN.h(o.x + LOT / 2, o.z + LOT / 2), o.z);   // Bairro 9: lotes no alto
    }
    mergeLots();
  }

  function showResident(h, mood) {
    let r = residents[h];
    if (!r) {
      r = residents[h] = buildResident(h);
      r.visible = false;
      scene.add(r);
    }
    if (current && current !== r) current.visible = false;
    const lot = lots[h];
    // y = 0 do lote: o próprio morador se eleva sobre o caminho de pedras
    r.position.set(lot.position.x + LOT_ANCHORS.residentSpot.x, lot.position.y, lot.position.z + LOT_ANCHORS.residentSpot.z);
    if (current !== r || currentH !== h || currentMood !== mood) {
      r.userData.setMood && r.userData.setMood(mood);
      currentMood = mood;
    }
    current = r; currentH = h;
    r.visible = true;
  }

  function hideResident() {
    if (current) current.visible = false;
    current = null; currentH = -1; currentMood = null;
  }

  function update(t, dt) {
    for (const i of pool) {
      const u = lots[i].userData.update;
      if (u) u(t, dt);
    }
    if (current && current.visible && current.userData.update) current.userData.update(t, dt);
  }

  return {
    scene,
    setLayout,
    showResident,
    hideResident,
    update,
    lotGroup: h => lots[h],
    /** Cobertura do posto: some com a van embaixo (x, z do mundo). */
    updateGas(x, z, dt) {
      for (const g of gasModels) if (g.visible) g.userData.updateCanopy(x - g.position.x, z - g.position.z, dt);
    },
    /** Bairros 4 e 5: um posto em cada par de lotes de `list` ([] = nenhum). */
    setGas(list) {
      gasModels.forEach(g => { g.visible = false; });
      (list || []).forEach((slots, i) => {
        if (!gasModels[i]) { gasModels[i] = buildGasStation(); scene.add(gasModels[i]); }
        const o = slotOrigin(slots[0]);
        gasModels[i].position.set(o.x, 0, o.z);
        gasModels[i].visible = true;
      });
    },
    pool,
    extraSolids,
    /** Esconde (true) ou mostra a casa h inteira, refazendo o merge dos lotes. */
    setHidden(h, on) { on ? hidden.add(h) : hidden.delete(h); lots[h].visible = !on; mergeLots(); },
    /** Mostra todas as casas de novo. */
    showAll() { if (!hidden.size) return; for (const h of hidden) lots[h].visible = true; hidden.clear(); mergeLots(); },
  };
}
