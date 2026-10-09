// Lote completo de uma casa, em coordenadas LOCAIS do lote (origem no canto noroeste, x 0..LOT leste,
// z 0..LOT sul, y para cima). As 16 casas têm exatamente a mesma forma; mudam só cores e objetos.
// A câmera de jogo olha do SUL para o NORTE (≈57° para baixo): tudo o que identifica uma casa fica na
// fachada sul, na água sul do telhado, na cumeeira ou no quintal da frente.
import * as THREE from 'three';
import { mat, mesh, box, cyl, sphere, cone, at, dynamic, bakeStatic } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';
import { ROOF_COL, DOOR_COL, DOOR_DEFAULT, WALL_COL } from '../data.js';

// ---------- Medidas ----------
export const GROUND_Y = 0.12;            // topo da grama (itens do quintal e morador ficam sobre ela)
const G = GROUND_Y;
const WALK_TOP = 0.17;                   // calçada um pouco mais alta que a grama (meio-fio)
const HS = A.house;
const HX = (HS.x0 + HS.x1) / 2, HZ = (HS.z0 + HS.z1) / 2;   // centro da casa (cumeeira em z = HZ)
const HW = HS.x1 - HS.x0, HD = HS.z1 - HS.z0;
const WH = A.wallHeight, WALL_TOP = G + WH;
const HALF = HD / 2;
const THETA = Math.atan2(A.roofRise, HALF);                 // inclinação das águas
const COS = Math.cos(THETA), SIN = Math.sin(THETA), TAN = Math.tan(THETA);
const ROOF_T = 0.2;                                         // espessura da laje do telhado
const RIDGE_Y = WALL_TOP + A.roofRise;                      // cumeeira (face de baixo)
// Beiral SUL mais curto que o dos outros lados: com a câmera a ~57° um beiral de 0.5 esconderia a metade
// de cima da fachada (porta e janelas). Norte e oitões usam roofOverhang normalmente.
const SOUTH_OVERHANG = 0.2;
const SLOPE_LEN = (HALF + SOUTH_OVERHANG) / COS;           // água sul: da cumeeira ao beiral
const SLOPE_LEN_N = (HALF + A.roofOverhang) / COS;         // água norte
const ROOF_W = HW + 2 * A.roofOverhang;
const FRONT = HS.z1;                                        // fachada sul
const ROW = 0.62;                                           // fileiras de telhas
const FENCE_H = 1.0;

// Paleta (cores fixas compartilhadas; mat() faz o cache e o merge por material)
const C = {
  grass: '#95cc68', tuft: '#74ab4b', walk: '#e2d9c5', path: '#e2d9c5',
  post: '#7d5a35', rail: '#a57a4c', picket: '#fbf8f1',
  wall: WALL_COL, trim: '#cdc2aa', frame: '#3b2c1e', brass: '#ffdf6e', step: '#cdc2aa',
  winFrame: '#ffffff', glass: '#8fc6e8',
  brick: '#b0503a', mortar: '#6e2e20', smoke: '#f4f4f4',
  metal: '#8d949c', dish: '#f4f5f6', dishRim: '#aab1b9', dark: '#2a2a2a',
  panel: '#1d3a7a', panelLine: '#8fb0ee', panelFrame: '#d5dbe2',
  tank: '#2466b3', tankLid: '#4a93e6', tankRing: '#174a86', concrete: '#b9b5ab',
  iron: '#2f2a24', ironEdge: '#f3ecd8', comb: '#e0322a', beak: '#f0a81c',
  kiteR: '#ff3b3b', kiteY: '#ffd12a', kiteB: '#2f7fe0', kiteG: '#2fbf5a', string: '#4a4a4a',
  mail: '#3f6fb0', mailDark: '#233f6e', flag: '#e63946', dirt: '#8a6a45',
};
// Estacas brancas levemente emissivas: continuam brancas mesmo vistas de cima/na sombra (o vão da tábua
// que falta aparece bem).
const picketMat = () => mat(C.picket, { emissive: '#505048' });
// Telhas "remendadas": cores foscas e bem diferentes entre si; as parecidas com o telhado são descartadas.
const PATCH_COLS = ['#9aa7bd', '#e6cf86', '#a6c47a', '#d99368', '#c9c3b8'];

// ---------- Utilidades ----------
function shade(hex, p) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = p < 0 ? 0 : 255, a = Math.abs(p);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function colorDist(a, b) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.hypot((x >> 16) - (y >> 16), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255));
}
function rng(seed) { // mulberry32: aleatório determinístico por casa
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const geoCache = new Map();
const cached = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };

/** Prisma: polígono 2D no plano XY extrudado em Z (centrado em z = 0). */
function prismGeo(key, shapes, depth, curveSegments = 8) {
  return cached('p:' + key, () => {
    const polys = typeof shapes[0][0] === 'number' ? [shapes] : shapes;
    const list = polys.map(pts => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
    const g = new THREE.ExtrudeGeometry(list, { depth, bevelEnabled: false, curveSegments });
    g.translate(0, 0, -depth / 2);
    return g;
  });
}
/** Forma de círculo/elipse como lista de pontos. */
function ellipsePts(cx, cy, rx, ry, n = 14) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return out;
}
const prism = (key, shapes, depth, color) => mesh(prismGeo(key, shapes, depth), color);

// Posições na água SUL do telhado: s = distância ao longo da água, a partir da cumeeira.
const slopeZ = s => HZ + ROOF_T * SIN + s * COS;
/** Altura do topo da água sul (sem as telhas) em um z do lote. */
const roofTopY = z => RIDGE_Y + ROOF_T / COS - (z - HZ) * TAN;

/** Grupo alinhado a uma água: local z = descendo a água, local y = normal, local x = leste (sul) ou oeste (norte). */
function slopeFrame(south = true) {
  const g = new THREE.Group();
  g.position.set(HX, RIDGE_Y + ROOF_T * COS, south ? HZ + ROOF_T * SIN : HZ - ROOF_T * SIN);
  if (south) g.rotation.set(THETA, 0, 0);
  else g.rotation.set(-THETA, Math.PI, 0);
  return g;
}

// ---------- Chão, caminho, gramado ----------
function buildGround(root, house, rand, yardRects) {
  // grama
  root.add(at(box(LOT, 0.14, LOT, C.grass), LOT / 2, G - 0.07, LOT / 2));
  // calçada (anel)
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2, full = LOT + 2 * WALK;
  root.add(at(box(full, h, WALK, C.walk), LOT / 2, y, -WALK / 2));
  root.add(at(box(full, h, WALK, C.walk), LOT / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, C.walk), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, C.walk), LOT + WALK / 2, y, LOT / 2));
  // caminho de pedras da porta ao portão
  const px = (A.path.x0 + A.path.x1) / 2, pw = A.path.x1 - A.path.x0;
  const z0 = FRONT + 0.75, len = LOT - z0, n = 7, gap = 0.14, d = (len - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) root.add(at(box(pw, 0.07, d, C.path), px, G + 0.02, z0 + d / 2 + i * (d + gap)));
  // tufinhos de grama (onde não há nada)
  const blocked = [
    { x0: HS.x0 - 0.5, x1: HS.x1 + 0.5, z0: 0, z1: FRONT + 1.0 },
    { x0: A.path.x0 - 0.4, x1: A.path.x1 + 0.4, z0: 0, z1: LOT },
    { x0: A.mailbox.x - 0.9, x1: A.mailbox.x + 1.6, z0: A.mailbox.z - 1.2, z1: LOT },
    { x0: A.missingBoardX - 2.0, x1: A.missingBoardX + 1.6, z0: LOT - 1.8, z1: LOT },
    ...yardRects,
  ];
  let placed = 0;
  for (let tries = 0; tries < 200 && placed < 14; tries++) {
    const x = 0.8 + rand() * (LOT - 1.6), z = 0.8 + rand() * (LOT - 1.6);
    if (blocked.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1)) continue;
    for (let k = 0; k < 3; k++) {
      root.add(at(cone(0.09, 0.34, C.tuft, 4), x + (k - 1) * 0.13, G + 0.15, z + (k % 2) * 0.08, (k - 1) * 0.25, rand() * 3, (k - 1) * 0.3));
    }
    placed++;
  }
}

// ---------- Cercas ----------
const PICKET_W = 0.46, PICKET_PITCH = 0.55, PICKET_D = 0.08;
const picketGeo = () => prismGeo('picket', [[-PICKET_W / 2, 0], [PICKET_W / 2, 0], [PICKET_W / 2, FENCE_H - 0.17], [0, FENCE_H], [-PICKET_W / 2, FENCE_H - 0.17]], PICKET_D);

function buildFences(root, house) {
  const inset = A.fenceInset, far = LOT - inset;
  // postes de madeira (fundo e laterais) + duas travessas
  const woodRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2.8));
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      root.add(at(box(0.18, FENCE_H + 0.05, 0.18, C.post), x0 + (x1 - x0) * t, G + (FENCE_H + 0.05) / 2, z0 + (z1 - z0) * t));
    }
    for (const ry of [0.35, 0.75]) {
      root.add(at(box(alongX ? len : 0.07, 0.11, alongX ? 0.07 : len, C.rail), (x0 + x1) / 2, G + ry, (z0 + z1) / 2));
    }
  };
  woodRun(inset, inset, far, inset);   // fundo
  woodRun(inset, inset, inset, far);   // oeste
  woodRun(far, inset, far, far);       // leste

  // frente: estacas brancas com a abertura do portão
  const missing = house.f.includes('fence');
  const fz = far;
  const pg = picketGeo();
  const pickets = [];
  for (let x = A.missingBoardX; x - PICKET_W / 2 > inset + 0.12; x -= PICKET_PITCH) pickets.push(x);
  for (let x = A.missingBoardX + PICKET_PITCH; x + PICKET_W / 2 < A.gate.x0 - 0.14; x += PICKET_PITCH) pickets.push(x);
  for (let x = A.gate.x1 + 0.6; x + PICKET_W / 2 < far - 0.12; x += PICKET_PITCH) pickets.push(x);
  // cerca quebrada: faltam 3 estacas seguidas (vão largo, bem visível de longe) e as vizinhas ficam tortas
  const gapN = k => Math.abs(k - A.missingBoardX) < 1e-6 ? 0 : Math.round((k - A.missingBoardX) / PICKET_PITCH);
  for (const x of pickets) {
    const n = gapN(x);
    if (missing && Math.abs(n) <= 1) continue;
    const p = at(mesh(pg, picketMat()), x, G, fz);
    // vizinhas abertas em V: o buraco fica maior em cima
    if (missing && n === 2) p.rotation.z = -0.26;
    if (missing && n === -2) p.rotation.z = 0.22;
    root.add(p);
  }
  const gx0 = A.missingBoardX - 1.5 * PICKET_PITCH, gx1 = A.missingBoardX + 1.5 * PICKET_PITCH;
  // travessas de madeira atrás das estacas (no vão aparecem madeira e grama, não branco)
  const railZ = fz - PICKET_D / 2 - 0.04;
  const rail = (x0, x1, ry) => root.add(at(box(x1 - x0, 0.1, 0.06, C.rail), (x0 + x1) / 2, G + ry, railZ));
  const railSeg = (x0, x1) => { for (const ry of [0.28, 0.66]) rail(x0, x1, ry); };
  if (missing) {
    // a travessa de cima está quebrada no vão: um pedaço pende em diagonal até o chão
    rail(inset, A.gate.x0, 0.28);
    rail(inset, gx0 + 0.1, 0.66);
    rail(gx1 - 0.05, A.gate.x0, 0.66);
    const len = 1.3, ang = Math.atan2(0.62, gx1 - gx0 - 0.25);
    root.add(at(box(len, 0.1, 0.06, C.rail), gx1 - 0.05 - Math.cos(ang) * len / 2, G + 0.66 - Math.sin(ang) * len / 2, railZ, 0, 0, ang));
  } else railSeg(inset, A.gate.x0);
  railSeg(A.gate.x1, far);
  // postes dos cantos da frente e do portão
  for (const x of [inset, far]) root.add(at(box(0.18, FENCE_H + 0.05, 0.18, C.post), x, G + (FENCE_H + 0.05) / 2, fz));
  for (const x of [A.gate.x0, A.gate.x1]) {
    root.add(at(box(0.26, 1.25, 0.26, C.post), x, G + 0.625, fz));
    root.add(at(sphere(0.17, picketMat(), 8, 6), x, G + 1.36, fz));
  }
  if (missing) {
    // lasca no lugar da tábua + a tábua caída na grama, logo atrás da cerca
    for (const dx of [-0.55, 0.05, 0.6]) root.add(at(cone(0.14, 0.22, picketMat(), 3), A.missingBoardX + dx, G + 0.1, fz, 0, 0.5 + dx, 0)); // lascas que sobraram
    // terra pisada no vão: o buraco aparece escuro entre as estacas brancas
    const soil = at(cyl(0.7, 0.7, 0.04, C.dirt, 8), A.missingBoardX, G + 0.01, fz - 0.35);
    soil.scale.set(1.45, 1, 0.8);
    root.add(soil);
    // uma estaca solta encostada em diagonal por fora da cerca, na frente do vão (lê bem de quem vem pela rua)
    const lean = new THREE.Group();
    lean.position.set(A.missingBoardX - 0.2, G, fz + 0.62);
    lean.rotation.set(-0.62, 0, -0.55);
    lean.add(mesh(pg, picketMat()));
    root.add(lean);
    // deitada na grama, quase paralela à cerca, longe o bastante para as estacas não a esconderem
    const lying = new THREE.Group();
    lying.position.set(A.missingBoardX + 0.25, G + 0.05, fz - 1.2);
    lying.rotation.set(0, 0.55, 0.07);
    lying.add(at(mesh(pg, picketMat()), -FENCE_H / 2, 0, 0, -Math.PI / 2, 0, -Math.PI / 2));
    root.add(lying);
  }
}

// ---------- Casa ----------
function windowAt(root, x, y, z, ry = 0) {
  // moldura branca, vidro, cruz e peitoril; montado num grupo e girado para a parede certa
  const w = new THREE.Group();
  w.add(at(box(1.9, 1.45, 0.1, C.winFrame), 0, 0, 0.05));
  w.add(at(box(1.6, 1.15, 0.06, C.glass), 0, 0, 0.11));
  w.add(at(box(0.09, 1.15, 0.05, C.winFrame), 0, 0, 0.15));
  w.add(at(box(1.6, 0.09, 0.05, C.winFrame), 0, 0.02, 0.15));
  w.add(at(box(2.1, 0.1, 0.26, C.winFrame), 0, -0.76, 0.12));
  w.position.set(x, y, z);
  w.rotation.y = ry;
  root.add(w);
}

function buildHouse(root, house) {
  const roofCol = ROOF_COL[house.roof];
  const roofDark = shade(roofCol, -0.42);
  const doorCol = house.door ? DOOR_COL[house.door] : DOOR_DEFAULT;

  // paredes + barrado
  root.add(at(box(HW, WH, HD, C.wall), HX, G + WH / 2, HZ));
  root.add(at(box(HW + 0.1, 0.28, HD + 0.1, C.trim), HX, G + 0.14, HZ));
  // oitões (triângulos sob o telhado)
  const gable = prism('gable', [[-HALF, 0], [HALF, 0], [0, A.roofRise]], HW, C.wall);
  root.add(at(gable, HX, WALL_TOP, HZ, 0, Math.PI / 2, 0));

  // telhado: laje escura (borda) + fileiras de telhas na cor da casa + juntas
  for (const south of [true, false]) {
    const f = slopeFrame(south);
    const len = south ? SLOPE_LEN : SLOPE_LEN_N;
    f.add(at(box(ROOF_W, ROOF_T, len, roofDark), 0, -ROOF_T / 2, len / 2));
    const n = Math.floor((len - 0.12) / ROW);
    for (let i = 0; i < n; i++) {
      const s0 = 0.1 + i * ROW, s1 = i === n - 1 ? len - 0.07 : s0 + ROW + 0.06;
      const d = +(s1 - s0).toFixed(3);
      const row = new THREE.Group();
      row.position.set(0, 0.035, (s0 + s1) / 2);
      row.rotation.x = -0.09;
      row.add(box(ROOF_W - 0.16, 0.07, d, roofCol));
      // juntas verticais desencontradas
      const off = (i % 2) * 0.45;
      for (let x = -ROOF_W / 2 + 0.5 + off; x < ROOF_W / 2 - 0.3; x += 0.9) {
        row.add(at(box(0.07, 0.03, d - 0.08, roofDark), x, 0.04, 0.02));
      }
      f.add(row);
    }
    root.add(f);
  }
  // cumeeira
  root.add(at(box(ROOF_W + 0.06, 0.34, 0.34, roofDark), HX, RIDGE_Y + ROOF_T / COS - 0.04, HZ, Math.PI / 4, 0, 0));

  // ---- fachada sul ----
  const fz = FRONT;
  const doorX = A.doorX, doorW = 1.6, doorH = 2.25, doorY = G + 0.16;
  root.add(at(box(doorW + 0.3, doorH + 0.16, 0.1, C.frame), doorX, doorY + (doorH + 0.16) / 2 - 0.08, fz + 0.05));
  root.add(at(box(doorW, doorH, 0.12, doorCol), doorX, doorY + doorH / 2, fz + 0.1));
  // almofadas em relevo (mesma cor: o flatShading desenha as bordas)
  root.add(at(box(doorW - 0.5, 0.75, 0.06, doorCol), doorX, doorY + 1.55, fz + 0.18));
  root.add(at(box(doorW - 0.5, 0.75, 0.06, doorCol), doorX, doorY + 0.62, fz + 0.18));
  root.add(at(sphere(0.1, C.brass, 8, 6), doorX + doorW / 2 - 0.22, doorY + 1.08, fz + 0.2));
  // degrau
  root.add(at(box(doorW + 1.0, 0.16, 0.8, C.step), doorX, G + 0.08, fz + 0.4));
  // luminária ao lado da porta
  root.add(at(box(0.12, 0.12, 0.2, C.frame), doorX - doorW / 2 - 0.45, doorY + 1.7, fz + 0.1));
  root.add(at(box(0.26, 0.34, 0.26, C.frame), doorX - doorW / 2 - 0.45, doorY + 1.58, fz + 0.25));
  root.add(at(box(0.18, 0.24, 0.28, C.brass), doorX - doorW / 2 - 0.45, doorY + 1.58, fz + 0.25));
  // porta dos fundos, da mesma cor (quem passa pela rua de trás também vê a cor da porta)
  const bz = HS.z0;
  root.add(at(box(doorW + 0.3, doorH + 0.16, 0.1, C.frame), doorX, doorY + (doorH + 0.16) / 2 - 0.08, bz - 0.05));
  root.add(at(box(doorW, doorH, 0.12, doorCol), doorX, doorY + doorH / 2, bz - 0.1));
  root.add(at(box(doorW - 0.5, 0.75, 0.06, doorCol), doorX, doorY + 1.55, bz - 0.18));
  root.add(at(box(doorW - 0.5, 0.75, 0.06, doorCol), doorX, doorY + 0.62, bz - 0.18));
  root.add(at(sphere(0.1, C.brass, 8, 6), doorX - doorW / 2 + 0.22, doorY + 1.08, bz - 0.2));
  root.add(at(box(doorW + 1.0, 0.16, 0.7, C.step), doorX, G + 0.08, bz - 0.35));
  // janelas da frente
  for (const wx of [HS.x0 + 1.75, HS.x1 - 1.75]) windowAt(root, wx, G + 1.3, fz);
  // janelas laterais e dos fundos
  windowAt(root, HS.x1, G + 1.5, HZ, Math.PI / 2);
  windowAt(root, HS.x0, G + 1.5, HZ, -Math.PI / 2);
  for (const wx of [HS.x0 + 2.2, HS.x1 - 2.2]) windowAt(root, wx, G + 1.5, HS.z0, Math.PI);
}

// ---------- Objetos do telhado ----------
const SPOTS = { TL: { x: 6.2, s: 1.15 }, TR: { x: 11.0, s: 1.15 }, BL: { x: 6.5, s: 2.55 }, BR: { x: 10.7, s: 2.6 }, MID: { x: HX, s: 0 } };
const PREF = { chimney: ['TR', 'TL'], dish: ['TL', 'TR'], solar: ['BL', 'BR'], tank: ['TL', 'TR'], rooster: ['MID'], kite: ['BR', 'BL'], patch: ['BR', 'BL'] };

// fumaça: esferas low-poly num InstancedMesh (1 draw call por chaminé), sem alocação por quadro
const PUFFS = 7;
const puffGeo = new THREE.IcosahedronGeometry(0.5, 1);
let smokeMat = null;
const tmpObj = new THREE.Object3D();

function buildChimney(root, spot, updaters) {
  const z = slopeZ(spot.s), x = spot.x;
  const w = 1.15, base = roofTopY(z + w / 2) - 0.1, top = RIDGE_Y + 1.35;
  // miolo de argamassa + fiadas de tijolo (as frestas mostram a argamassa)
  root.add(at(box(w - 0.08, top - base, w - 0.08, C.mortar), x, (base + top) / 2, z));
  const band = 0.34, gap = 0.06;
  for (let y = top - 0.3; y - band > base - 0.2; y -= band + gap) {
    root.add(at(box(w, band, w, C.brick), x, y - band / 2, z));
  }
  // capa + boca escura
  root.add(at(box(w + 0.3, 0.24, w + 0.3, C.mortar), x, top + 0.02, z));
  root.add(at(box(w - 0.35, 0.05, w - 0.35, C.frame), x, top + 0.15, z));
  // fumaça contínua
  if (!smokeMat) smokeMat = new THREE.MeshStandardMaterial({ color: C.smoke, flatShading: true, roughness: 1, transparent: true, opacity: 0.88, depthWrite: false, emissive: '#666666' });
  const puffs = dynamic(new THREE.InstancedMesh(puffGeo, smokeMat, PUFFS));
  puffs.frustumCulled = false;
  puffs.castShadow = false;
  puffs.position.set(x, top + 0.2, z);
  root.add(puffs);
  updaters.push(t => {
    for (let i = 0; i < PUFFS; i++) {
      const ph = (t * 0.32 + i / PUFFS) % 1;
      const grow = Math.min(1, ph / 0.12) * (ph > 0.7 ? (1 - ph) / 0.3 : 1);
      const sc = (0.55 + ph * 1.5) * grow;
      tmpObj.position.set(ph * 1.6 + Math.sin(t * 1.7 + i * 2.1) * 0.18, ph * 3.4, -ph * 0.5);
      tmpObj.rotation.set(i, t * 0.4 + i, 0);
      tmpObj.scale.set(sc, sc, sc);
      tmpObj.updateMatrix();
      puffs.setMatrixAt(i, tmpObj.matrix);
    }
    puffs.instanceMatrix.needsUpdate = true;
  });
}

function buildDish(root, spot) {
  const z = slopeZ(spot.s), x = spot.x, y0 = roofTopY(z);
  const mastH = 1.05;
  root.add(at(box(0.5, 0.1, 0.5, C.metal), x, y0 + 0.05, z));
  root.add(at(cyl(0.07, 0.07, mastH, C.metal, 6), x, y0 + mastH / 2, z));
  // prato parabólico (y = a·r²)
  const R = 1.1, a = 0.3;
  const dishGeo = cached('dish', () => {
    const pts = [];
    for (let i = 0; i <= 6; i++) { const r = R * i / 6; pts.push(new THREE.Vector2(r, a * r * r)); }
    return new THREE.LatheGeometry(pts, 16);
  });
  const head = new THREE.Group();
  head.position.set(x, y0 + mastH + 0.1, z);
  head.rotation.set(0.85, 1.05, 0, 'YXZ'); // boca virada para leste/cima: a câmera vê a concha de lado
  // a face interna (concha) do Lathe é o lado de trás da geometria: branca por dentro, cinza por fora
  head.add(mesh(dishGeo, mat(C.dish, { side: THREE.BackSide })));
  head.add(mesh(dishGeo, mat(C.dishRim, { side: THREE.FrontSide })));
  const rimGeo = cached('dishRim', () => new THREE.TorusGeometry(R, 0.06, 5, 20).rotateX(Math.PI / 2));
  head.add(at(mesh(rimGeo, C.dishRim), 0, a * R * R, 0));
  // braço até o foco + LNB
  const f = 1 / (4 * a);
  const armLen = Math.hypot(R * 0.95, f - a * R * R * 0.9);
  const arm = at(cyl(0.045, 0.045, armLen, C.dark, 5), 0, (f + a * R * R * 0.9) / 2, R * 0.95 / 2);
  arm.rotation.x = Math.atan2(-R * 0.95, f - a * R * R * 0.9);
  head.add(arm);
  head.add(at(box(0.22, 0.26, 0.22, C.dark), 0, f, 0));
  root.add(head);
}

/** Painéis solares; south = false monta a cópia na água norte (vista de quem vem pela rua de trás). */
function buildSolar(root, spot, south = true) {
  const f = slopeFrame(south);
  const cx = (spot.x - HX) * (south ? 1 : -1), cs = spot.s;
  const pw = 1.42, pd = 2.25, gap = 0.12, n = 3;
  const total = n * pw + (n - 1) * gap;
  f.add(at(box(total + 0.22, 0.1, pd + 0.22, C.panelFrame), cx, 0.12, cs));
  for (let i = 0; i < n; i++) {
    const px = cx - total / 2 + pw / 2 + i * (pw + gap);
    f.add(at(box(pw, 0.08, pd, C.panel), px, 0.2, cs));
    // grade clara: 1 linha vertical e 3 horizontais
    f.add(at(box(0.05, 0.02, pd, C.panelLine), px, 0.245, cs));
    for (let k = 1; k < 4; k++) f.add(at(box(pw, 0.02, 0.05, C.panelLine), px, 0.245, cs - pd / 2 + k * pd / 4));
  }
  root.add(f);
}

function buildTank(root, spot) {
  const z = slopeZ(spot.s), x = spot.x;
  const R = 0.95, H = 1.15;
  const top = roofTopY(z - R - 0.05) + 0.12, bottom = roofTopY(z + R + 0.05) - 0.15;
  // laje de concreto que nivela a caixa sobre a água do telhado
  root.add(at(box(2 * R + 0.3, top - bottom, 2 * R + 0.3, C.concrete), x, (top + bottom) / 2, z));
  const bodyGeo = cached('tankBody', () => new THREE.LatheGeometry(
    [[0, 0], [R * 0.82, 0], [R * 0.86, 0.1], [R, H]].map(([r, y]) => new THREE.Vector2(r, y)), 16));
  root.add(at(mesh(bodyGeo, C.tank), x, top, z));
  root.add(at(cyl(R * 0.93, R * 0.93, 0.1, C.tankRing, 16), x, top + H * 0.5, z));
  root.add(at(cyl(R + 0.08, R + 0.08, 0.14, C.tankLid, 16), x, top + H + 0.05, z));
  root.add(at(cyl(R * 0.6, R + 0.02, 0.16, C.tankLid, 16), x, top + H + 0.2, z));
  root.add(at(cyl(0.28, 0.28, 0.1, C.tankRing, 10), x, top + H + 0.32, z));
}

function roosterShapes() {
  const body = ellipsePts(0.05, 0.62, 0.5, 0.33);
  const neck = [[-0.14, 0.78], [-0.4, 1.12], [-0.22, 1.26], [0.02, 0.88]];
  const head = ellipsePts(-0.36, 1.2, 0.17, 0.17, 10);
  const tail1 = [[0.3, 0.82], [0.56, 1.48], [0.74, 1.42], [0.58, 0.64]];
  const tail2 = [[0.38, 0.72], [0.86, 1.28], [0.96, 1.12], [0.54, 0.52]];
  const tail3 = [[0.4, 0.6], [0.98, 0.94], [0.96, 0.8], [0.5, 0.42]];
  const leg1 = [[-0.1, 0.02], [-0.03, 0.02], [-0.03, 0.4], [-0.1, 0.4]];
  const leg2 = [[0.1, 0.02], [0.17, 0.02], [0.17, 0.4], [0.1, 0.4]];
  const feet = [[-0.3, 0], [0.34, 0], [0.34, 0.06], [-0.3, 0.06]];
  return [body, neck, head, tail1, tail2, tail3, leg1, leg2, feet];
}

function buildRooster(root) {
  const ridgeTop = RIDGE_Y + ROOF_T / COS + 0.18;
  const x = HX, z = HZ;
  root.add(at(box(0.5, 0.14, 0.5, C.iron), x, ridgeTop - 0.02, z));
  root.add(at(cyl(0.07, 0.07, 1.25, C.iron, 6), x, ridgeTop + 0.6, z));
  // rosa dos ventos: seta leste-oeste + barra norte-sul com bolinhas
  const yc = ridgeTop + 0.72;
  root.add(at(box(2.0, 0.08, 0.08, C.iron), x, yc, z));
  root.add(at(cone(0.16, 0.36, C.iron, 4), x + 1.12, yc, z, 0, 0, -Math.PI / 2));
  root.add(at(prism('vaneTail', [[0, -0.22], [0.34, 0], [0, 0.22]], 0.05, C.iron), x - 1.0, yc, z));
  root.add(at(box(0.08, 0.08, 1.5, C.iron), x, yc, z));
  for (const dz of [-0.78, 0.78]) root.add(at(sphere(0.11, C.iron, 6, 4), x, yc, z + dz));
  root.add(at(sphere(0.11, C.iron, 6, 4), x - 1.0, yc, z));
  // galo: silhueta plana, inclinada para trás para ficar de frente para a câmera (vista de cima e do sul)
  const S = 1.45;
  const g = new THREE.Group();
  g.position.set(x, ridgeTop + 1.22, z);
  g.rotation.x = -0.5;
  g.scale.set(S, S, 1);
  const shapes = roosterShapes();
  g.add(prism('rooster', shapes, 0.12, C.iron));
  // contorno claro atrás da silhueta (legibilidade sobre telhados escuros)
  const edge = at(prism('rooster', shapes, 0.12, C.ironEdge), -0.015, -0.075, -0.08);
  edge.scale.set(1.1, 1.1, 1);
  g.add(edge);
  g.add(at(prism('comb', [ellipsePts(-0.47, 1.36, 0.08, 0.08, 8), ellipsePts(-0.36, 1.42, 0.09, 0.09, 8), ellipsePts(-0.25, 1.37, 0.075, 0.075, 8), ellipsePts(-0.47, 1.04, 0.05, 0.07, 8)], 0.16, C.comb), 0, 0, 0.01));
  g.add(at(prism('beak', [[-0.5, 1.26], [-0.72, 1.19], [-0.5, 1.12]], 0.14, C.beak), 0, 0, 0.01));
  g.add(at(prism('eye', [ellipsePts(-0.4, 1.23, 0.035, 0.035, 6)], 0.16, C.ironEdge), 0, 0, 0.02));
  root.add(g);
}

function buildKite(root, spot, updaters) {
  // Pipa enganchada na cumeeira, quase em pé e inclinada para trás: mais da metade passa acima da cumeeira,
  // então a silhueta colorida aparece de qualquer lado (inclusive da rua de trás). A rabiola desce a água sul.
  const ridgeTop = RIDGE_Y + ROOF_T / COS;
  // Topo inclinado ~30° para o norte e pipa meio torta. As duas metades dobram para trás na vareta do meio
  // (em V, como pipa de papel amassada): quem olha na diagonal — pelas ruas leste-oeste — vê uma das metades de frente.
  const TILT = -0.52, ROLL = 0.35, FOLD = 0.42, SC = 1.15;
  const k = new THREE.Group();
  k.position.set(spot.x, ridgeTop + 0.6, HZ + 0.2);
  k.rotation.set(TILT, 0, ROLL);             // XYZ: primeiro gira no próprio plano, depois inclina
  k.scale.setScalar(SC);
  const T = [0, 1.45], Rr = [1.0, 0.3], B = [0, -1.2], L = [-1.0, 0.3], M = [0, 0.3];
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  wingL.rotation.y = -FOLD; wingR.rotation.y = FOLD;
  wingL.add(prism('kR', [T, L, M], 0.05, C.kiteR), prism('kG', [M, L, B], 0.05, C.kiteG));
  wingR.add(prism('kY', [T, M, Rr], 0.05, C.kiteY), prism('kB', [M, B, Rr], 0.05, C.kiteB));
  for (const zz of [0.04, -0.04]) {          // varetas brancas (dos dois lados)
    wingL.add(at(box(1.0, 0.07, 0.05, C.winFrame), -0.5, 0.3, zz));
    wingR.add(at(box(1.0, 0.07, 0.05, C.winFrame), 0.5, 0.3, zz));
    k.add(at(box(0.07, 2.65, 0.05, C.winFrame), 0, 0.125, zz));
  }
  k.add(wingL, wingR);
  root.add(k);

  // ponta de baixo da pipa (onde a rabiola começa), convertida para a água sul: s = distância desde a cumeeira
  k.updateMatrix();
  const bp = new THREE.Vector3(0, -1.2, 0).applyMatrix4(k.matrix);
  const f = slopeFrame(true);
  const tailX = bp.x - HX, tailS = Math.max(0.3, (bp.z - HZ - ROOF_T * SIN) / COS);

  // rabiola em duas partes rígidas (cada uma fundida em 2 meshes): um trecho deitado na água, que
  // balança de leve, e a ponta que passa do beiral e pende como um pêndulo.
  const tail = dynamic(new THREE.Group());
  tail.position.set(tailX, 0.14, tailS);
  tail.rotation.y = 0.55;                                   // rabiola desce a água para a direita
  const onRoof = Math.max(0.8, (SLOPE_LEN - tail.position.z) / Math.cos(tail.rotation.y));
  const partA = tailPiece(onRoof, 4, [1, 3]);
  const partB = dynamic(tailPiece(1.4, 3, [1, 3]));
  partB.position.z = onRoof;
  partA.add(partB);
  bakeStatic(partB);
  bakeStatic(partA);
  tail.add(partA);
  f.add(tail);
  root.add(f);
  updaters.push(t => {
    partA.rotation.y = Math.sin(t * 1.9) * 0.07;
    partB.rotation.set(1.2 + Math.sin(t * 2.3 + 1) * 0.1, Math.sin(t * 2.6) * 0.45, 0);
  });
}

/** Trecho de rabiola no plano XZ, ao longo de +z: barbante em zigue-zague + laçinhos vermelhos nos pontos indicados. */
function tailPiece(len, segs, bowsAt) {
  const g = new THREE.Group();
  const pts = [];
  for (let k = 0; k <= segs; k++) pts.push([k === 0 ? 0 : Math.sin(k * 1.9) * 0.14, len * k / segs]);
  for (let k = 0; k < segs; k++) {
    const [x0, z0] = pts[k], [x1, z1] = pts[k + 1];
    const l = Math.hypot(x1 - x0, z1 - z0);
    g.add(at(box(0.06, 0.04, +l.toFixed(3), C.string), (x0 + x1) / 2, 0.02, (z0 + z1) / 2, 0, Math.atan2(x1 - x0, z1 - z0), 0));
  }
  for (const k of bowsAt) {
    const [x, z] = pts[k];
    g.add(at(prism('bow', [[[0, 0.03], [-0.34, 0.2], [-0.34, -0.2], [0, -0.03]], [[0, 0.03], [0.34, -0.2], [0.34, 0.2], [0, -0.03]]], 0.05, C.kiteR), x, 0.05, z, -Math.PI / 2, 0, 0));
  }
  return g;
}

function buildPatch(root, spot, roofCol, house, south = true) {
  const f = slopeFrame(south);
  const cols = PATCH_COLS.filter(c => colorDist(c, roofCol) > 90).slice(0, 4);
  const rand = rng(house.index * 131 + 7);
  const tw = 0.84, td = ROW - 0.02;
  const dark = shade(roofCol, -0.42);
  // contorno irregular, alinhado às fileiras do telhado (fileira i começa em s = 0.1 + i*ROW)
  const LAYOUT = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-1, 0]];
  const firstRow = Math.max(1, Math.round((spot.s - 0.1) / ROW) - 1);
  const cx = (spot.x - HX) * (south ? 1 : -1);
  let k = 0;
  LAYOUT.forEach((row, r) => row.forEach(c => {
    const col = cols[(k * 3 + r) % cols.length];
    k++;
    const sc = 0.1 + (firstRow + r) * ROW + ROW / 2;
    const px = cx + c * tw;
    // rejunte escuro por baixo de cada telha trocada
    f.add(at(box(tw + 0.05, 0.05, ROW + 0.03, dark), px, 0.1, sc));
    const t = new THREE.Group();
    const lifted = k === 3 || k === 7;           // duas telhas meio soltas
    t.position.set(px + (rand() - 0.5) * 0.07, 0.17 + (lifted ? 0.06 : 0), sc);
    t.rotation.set(-0.1 - rand() * 0.05 - (lifted ? 0.14 : 0), (rand() - 0.5) * 0.16, (rand() - 0.5) * 0.06);
    t.add(box(tw - 0.08, 0.1, td, col));
    f.add(t);
  }));
  root.add(f);
}

function buildRoofItems(root, house, updaters) {
  const used = new Set();
  const roofCol = ROOF_COL[house.roof];
  for (const key of house.roofItems) {
    const name = (PREF[key] || []).find(p => !used.has(p)) || Object.keys(SPOTS).find(p => !used.has(p)) || 'MID';
    used.add(name);
    const spot = SPOTS[name];
    switch (key) {
      case 'chimney': buildChimney(root, spot, updaters); break;
      case 'dish': buildDish(root, spot); break;
      case 'solar': buildSolar(root, spot, true); buildSolar(root, spot, false); break;
      case 'tank': buildTank(root, spot); break;
      case 'rooster': buildRooster(root); break;
      case 'kite': buildKite(root, spot, updaters); break;
      case 'patch': buildPatch(root, spot, roofCol, house, true); buildPatch(root, spot, roofCol, house, false); break;
    }
  }
}

// ---------- Caixa de correio ----------
// Caixa comprida ao longo de X (a câmera vê o lado comprido e a bandeira vermelha na face sul).
// A torta é girada no chão (~35°, bem visível de cima, fora do alinhamento da cerca), inclinada,
// com a tampa aberta pendurada, a bandeira caída e amassados.
function buildMailbox(root, crooked) {
  const g = new THREE.Group();             // guinada (só na torta)
  g.position.set(A.mailbox.x, G, A.mailbox.z);
  g.scale.setScalar(1.4);                  // grande o bastante para a inclinação ler de longe
  const lean = new THREE.Group();          // inclinação do poste (só na torta)
  g.add(lean);
  const postH = 1.25, bl = 1.25, bw = 0.66, bh = 0.4, r = bw / 2;
  lean.add(at(box(0.2, postH, 0.2, C.post), 0, postH / 2, 0));
  const top = new THREE.Group();
  top.position.set(0, postH, 0);
  top.add(at(box(0.6, 0.08, 0.34, C.post), 0, 0.04, 0));
  top.add(at(box(bl, bh, bw, C.mail), 0, 0.08 + bh / 2, 0));
  const domeGeo = cached('mailDome', () => new THREE.CylinderGeometry(r, r, bl, 12, 1, false, Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2));
  top.add(at(mesh(domeGeo, C.mail), 0, 0.08 + bh, 0));
  // tampa na ponta oeste (lado do portão), dobradiça embaixo
  const lid = new THREE.Group();
  lid.position.set(-bl / 2 - 0.03, 0.08, 0);
  lid.add(at(box(0.06, bh + r, bw + 0.04, C.mailDark), 0, (bh + r) / 2, 0));
  top.add(lid);
  // bandeirinha vermelha na face sul, perto da ponta leste
  const flag = new THREE.Group();
  flag.position.set(bl / 2 - 0.25, 0.25, bw / 2 + 0.05);
  flag.add(at(box(0.08, 0.72, 0.06, C.flag), 0, 0.3, 0));
  flag.add(at(box(0.36, 0.26, 0.06, C.flag), -0.2, 0.54, 0));
  top.add(flag);
  lean.add(top);
  if (crooked) {
    g.rotation.y = 0.62;                 // girada no chão
    lean.rotation.set(0.14, 0, -0.68);   // poste bem inclinado (~39°)
    top.rotation.set(0.18, 0, 0.12);     // caixa meio solta em cima do poste
    lid.rotation.z = 3.2;                // tampa aberta, pendurada para baixo
    flag.rotation.z = 3.15;              // bandeira caída, de ponta-cabeça
    // amassados: afundamentos escuros no teto e na lateral
    top.add(at(box(0.4, 0.06, 0.4, C.mailDark), 0.2, 0.08 + bh + r - 0.04, 0.02, 0.2, 0, 0.1));
    top.add(at(box(0.34, 0.22, 0.05, C.mailDark), -0.15, 0.3, bw / 2 + 0.005, 0, 0, 0.3));
    // terra revirada no pé do poste
    root.add(at(sphere(0.42, C.dirt, 7, 4), A.mailbox.x - 0.05, G - 0.18, A.mailbox.z + 0.05));
  }
  root.add(g);
}

// ---------- Lote ----------
/**
 * Monta o lote da casa `house` (dados de data.js) em coordenadas locais do lote.
 * yardBuilders: chave → () => Object3D (itens do quintal, origem no centro do item, frente para +Z).
 * O grupo tem userData.update(t) para animar fumaça, rabiola e itens do quintal.
 */
export function buildLot(house, { yardBuilders } = {}) {
  const root = new THREE.Group();
  root.name = 'lot:' + house.name;
  const updaters = [];
  const rand = rng(house.index * 977 + 13);

  // quintal: itens nos slots (a bicicleta fica encostada na cerca da frente)
  const yardRects = [];
  house.yardItems.forEach((key, i) => {
    const slot = A.yardSlots[i];
    if (!slot) return;
    const z = key === 'bike' ? A.bikeZ : (house.yardZ && house.yardZ[key]) || slot.z;
    yardRects.push(key === 'bike'
      ? { x0: slot.x - 2.4, x1: slot.x + 2.4, z0: z - 1.2, z1: LOT }
      : { x0: slot.x - 2.3, x1: slot.x + 2.3, z0: z - 2.3, z1: z + 2.3 });
    const make = yardBuilders && yardBuilders[key];
    if (!make) return;
    const obj = make();
    obj.position.set(slot.x, G, z);
    root.add(obj);
    if (obj.userData && typeof obj.userData.update === 'function') updaters.push(t => obj.userData.update(t));
  });

  buildGround(root, house, rand, yardRects);
  buildFences(root, house);
  buildHouse(root, house);
  buildRoofItems(root, house, updaters);
  buildMailbox(root, house.f.includes('mailbox'));

  bakeStatic(root);
  root.userData.update = t => { for (let i = 0; i < updaters.length; i++) updaters[i](t); };
  root.userData.update(0);
  return root;
}
