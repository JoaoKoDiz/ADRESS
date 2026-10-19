// O mundo: céu, luz com sombras, chão (grama + asfalto + faixas), sebe com a entrada "VILA ADRESS",
// árvores decorativas fora do mapa, os 16 lotes (construídos uma vez e reposicionados a cada rodada)
// e os moradores (criados sob demanda na primeira visita).
import * as THREE from 'three';
import {
  HEDGE, ROAD, LOT, WALK, MAP, GRID, BUILD_H, PLAZA, lotX, lotZ, slotOrigin, slotY, roadCenter, ENTRANCE, LOT_ANCHORS, SOLIDS, TERRAIN, CANAL, RAIL, VENICE, FAVELA, FLUX, FARMLAND, SPOTS, SNOWV, GARDV, MOONV, FORESTV, MEDV,
} from './layout.js';
import { HOUSES } from './data.js';
import { buildTerrain } from './terrain.js';
import { buildMoonScene } from './models/moon.js';
import { FRAME } from './moonFrame.js';
import { buildGasStation } from './models/gas.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl, cone, sphere, at, bakeStatic, dynamic, textTexture, vcMerge } from './models/kit.js';

// ---------- Paleta do cenário ----------
const SKY = '#bfe3f2';
// grama de fora do bairro (a cidade usa uma versão amarelada e seca)
const GREEN_GRASS = { grass: '#7fb158', patches: ['#79ab53', '#86b85e'], shadow: '#669347' };
const LAGOON = { grass: '#3f8fb0', patches: ['#468fb0', '#3a88a8'], shadow: '#367f9e' };   // Veneza: laguna em volta
const MOON_GROUND = { grass: '#a9adb3', patches: ['#9fa3a9', '#b3b6bb'], shadow: '#8f9399' };   // Órbita: regolito
const SNOW_GROUND = { grass: '#e9eef2', patches: ['#e2e9ef', '#f2f5f8'], shadow: '#cdd6de' };   // Nevasca
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

function plane(w, d, color, segs = 0) {
  // planos grandes são subdivididos (~16 m): triângulos enormes perdem precisão de profundidade quando recortados pela câmera baixa
  const g = new THREE.PlaneGeometry(w, d, segs || Math.max(1, Math.ceil(w / 16)), segs || Math.max(1, Math.ceil(d / 16)));
  g.rotateX(-Math.PI / 2);
  return mesh(g, color);
}

// ---------- Chão ----------
function buildGround(venice = false, SP = null) {
  const g = new THREE.Group();
  const rand = rng(7);
  const cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;

  // grama até o horizonte
  const CY = CANAL && CANAL.canyon ? { X0: CANAL.x0, X1: CANAL.x1, ZN: -320, ZS: MAP + 44 } : null;   // Cachoeira: o desfiladeiro fica aberto
  // (subdividida: dois triângulos de 4 km, recortados pelo plano próximo da câmera baixa, perdiam precisão de profundidade e a
  // grama "vazava" por cima do asfalto 4 cm acima — as ruas do bairro apareciam verdes na câmera atrás da van)
  if (!CY) g.add(at(plane(4000, 4000, GRASS, 80), MAP / 2, -0.04, MAP / 2));
  else {
    const L = 2000 + CY.X0, R = 2000 - CY.X1 + MAP;
    g.add(at(plane(L, 4000, GRASS, 40), CY.X0 - L / 2, -0.04, MAP / 2), at(plane(R, 4000, GRASS, 40), CY.X1 + R / 2, -0.04, MAP / 2));
    g.add(at(plane(CY.X1 - CY.X0, 2000, GRASS, 20), (CY.X0 + CY.X1) / 2, -0.04, CY.ZN - 1000), at(plane(CY.X1 - CY.X0, 2000, GRASS, 20), (CY.X0 + CY.X1) / 2, -0.04, CY.ZS + 1000));
  }
  // manchas de grama fora do bairro (quebram a monotonia)
  const disc = new THREE.CylinderGeometry(1, 1, 0.02, 9);
  for (let i = 0; i < 70; i++) {
    const x = -90 + rand() * (MAP + 180), z = -80 + rand() * (MAP + 170);
    if (SP) {                                                     // arredores planejados: as manchas ficam só no gramado livre
      const r = 7;
      if (SP.roads.some(q => hitRect(q, x - r, z - r, x + r, z + r)) || SP.cells.some(q => q.type !== 'meadow' && hitRect(q, x - r, z - r, x + r, z + r))) continue;
    }
    if (x > -4 && x < MAP + 4 && z > -4 && z < MAP + 4) continue;
    if (Math.abs(x - cx) < ROAD && z < 0) continue;
    if (CY && x > CY.X0 - 4 && x < CY.X1 + 4) continue;
    const m = at(mesh(disc, GRASS_PATCHES[i % 2]), x, -0.03 + (i % 2) * 0.008, z, 0, rand() * 3, 0);   // (as 2 cores em alturas separadas)
    m.scale.set(2 + rand() * 4, 1, 1.5 + rand() * 3);
    g.add(m);
  }

  // asfalto dentro da sebe (os lotes com suas calçadas ficam por cima)
  // (vai um pouco por baixo da sebe para não aparecer grama entre a sebe e a rua)
  if (CY) g.add(at(plane(CY.X0 - 0.3, MAP - 0.6, ASPHALT), (0.3 + CY.X0) / 2, 0, MAP / 2), at(plane(MAP - 0.3 - CY.X1, MAP - 0.6, ASPHALT), (CY.X1 + MAP - 0.3) / 2, 0, MAP / 2));
  else g.add(at(plane(MAP - 0.6, MAP - 0.6, FAVELA ? '#b3a993' : FARMLAND ? '#86b85c' : SNOWV ? '#eef3f7' : MOONV ? '#b9bcc0' : GARDV ? '#86c25e' : MEDV ? '#9d9676' : FORESTV ? (FORESTV.work ? '#a9b27a' : FORESTV.modern ? '#86c25e' : '#b3a458') : ASPHALT), MAP / 2, MEDV ? -0.02 : 0, MAP / 2));   // (Medieval: abaixo da grama em y 0 do burgo, que antes disputava a mesma altura e piscava)   // Colheita: grama (estradas de terra à parte)   // Morro: chão de cimento (as ruas são desenhadas à parte)
  // estrada de acesso: continua para fora pela abertura na sebe norte
  if (venice) return g;                        // Veneza: só água (sem estrada de acesso, faixas, faixa de pedestres nem bueiros)
  const OUT = 420;
  g.add(at(plane(ROAD, OUT + 0.3, MEDV ? '#8f8a7c' : ASPHALT), cx, 0, 0.3 - (OUT + 0.3) / 2));   // Medieval: estrada de terra batida até o portão
  const jz0 = SP ? SP.J - SP.RW / 2 : 0, jz1 = SP ? SP.J + SP.RW / 2 : 0;      // cruzamento com a estrada de fora (sem meio-fio nele)
  for (const x of [ENTRANCE.x0 - 0.3, ENTRANCE.x1]) {
    if (!SP) g.add(slab(x, -OUT, x + 0.3, 0, CURB, 0.12, 0.14));
    else g.add(slab(x, -OUT, x + 0.3, jz0, CURB, 0.12, 0.14), slab(x, jz1, x + 0.3, 0, CURB, 0.12, 0.14));
  }
  if (SP) for (const r of SP.roads) {                           // estrada que cruza, ruas laterais e a do sul
    g.add(at(plane(r.x1 - r.x0, r.z1 - r.z0, r.dirt ? SP.laneCol : ASPHALT), (r.x0 + r.x1) / 2, r.dirt ? -0.006 : 0, (r.z0 + r.z1) / 2));
    if (r.dirt) {                                               // marcas de roda na terra
      for (const k of [-1, 1]) { const m = at(plane(r.axis === 'x' ? r.x1 - r.x0 : 0.5, r.axis === 'x' ? 0.5 : r.z1 - r.z0, lerpHex(SP.laneCol, '#5a4632', 0.25)), (r.x0 + r.x1) / 2 + (r.axis === 'z' ? k * 1.1 : 0), -0.003, (r.z0 + r.z1) / 2 + (r.axis === 'x' ? k * 1.1 : 0)); g.add(m); }
    }
  }

  // faixas amarelas tracejadas no eixo de cada rua, só entre os cruzamentos (como na versão 2D)
  const DASH = 1.4, GAP = 1.2, LW = 0.22;
  const dashes = (a, b, along) => {
    const len = b - a, n = Math.floor((len + GAP) / (DASH + GAP));
    const start = a + (len - (n * DASH + (n - 1) * GAP)) / 2;
    for (let k = 0; k < n; k++) along(start + k * (DASH + GAP) + DASH / 2);
  };
  for (let i = 0; i <= (SPOTS ? -1 : GRID); i++) {   // (o Morro não tem grade de ruas)
    const c = roadCenter(i);
    for (let j = 0; j < GRID; j++) {
      const a = lotX(j) - WALK + 1, b = lotX(j) + LOT + WALK - 1;
      const cyH = CY && CANAL.cols.includes(j), cyV = CY && c > CY.X0 && c < CY.X1;   // Cachoeira: nada no abismo (a ponte tem faixa própria)
      if (!cyH && !(FLUX && (i === FLUX.north || i === FLUX.south))) dashes(a, b, m => g.add(at(box(DASH, 0.02, LW, CENTER_LINE), m, 0.01, c)));   // ruas leste–oeste (a avenida tem faixas próprias)
      if (!cyV) dashes(a, b, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), c, 0.01, m)));   // ruas norte–sul
    }
  }
  if (!MEDV && !SP) dashes(-120, -1.2, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), cx, 0.01, m)));
  if (SP) {
    dashes(-120, jz0 - 1.2, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), cx, 0.01, m)));
    dashes(jz1 + 1.2, -1.2, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), cx, 0.01, m)));
    for (const r of SP.roads) if (!r.dirt) {
      if (r.axis === 'x') dashes(r.x0 + 1.5, r.x1 - 1.5, m => g.add(at(box(DASH, 0.02, LW, CENTER_LINE), m, 0.01, (r.z0 + r.z1) / 2)));
      else dashes(r.z0 + 1.5, r.z1 - 1.5, m => g.add(at(box(LW, 0.02, DASH, CENTER_LINE), (r.x0 + r.x1) / 2, 0.01, m)));
    }
    for (const z of [jz0 - 0.5, jz1 + 0.5]) g.add(slab(ENTRANCE.x0 + 0.3, z - 0.2, ENTRANCE.x1 - 0.3, z + 0.2, ZEBRA, 0.012));   // faixas de parada do cruzamento
  }

  // sombra "falsa" da sebe do lado de fora (oeste e norte): a grama de fora não recebe sombras reais
  g.add(slab(-0.65, 0, 0.3, MAP, GRASS_SHADOW, -0.012, 0.01));
  g.add(slab(-0.65, -1.0, ENTRANCE.x0 - 0.3, 0.3, GRASS_SHADOW, -0.012, 0.01));
  g.add(slab(ENTRANCE.x1 + 0.3, -1.0, MAP, 0.3, GRASS_SHADOW, -0.012, 0.01));

  // faixa de pedestres na entrada
  for (let x = ENTRANCE.x0 + 0.7; x < (MEDV ? -1 : ENTRANCE.x1 - 0.5); x += 0.95) g.add(slab(x, 0.15, x + 0.5, HEDGE - 0.15, ZEBRA, 0.02));

  // bueiros (planos, não são obstáculos)
  const holes = [
    [roadCenter(0) + 1.9, lotZ(1) + 6], [lotX(1) + 5, roadCenter(2) - 1.9], [roadCenter(3) - 1.9, lotZ(2) + 11],
    [lotX(3) + 12, roadCenter(4) + 1.9], [roadCenter(4) + 1.9, lotZ(0) + 9], [lotX(0) + 13, roadCenter(1) + 1.9],
  ];
  for (const [x, z] of SPOTS ? [] : holes) {
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
  if (CANAL && CANAL.canyon) for (const k of [2, 1]) {                       // Cachoeira: a sebe não atravessa o desfiladeiro
    const [x0, z0, x1, z1, f] = segs[k]; segs.splice(k, 1, [x0, z0, CANAL.x0, z1, f], [CANAL.x1, z0, x1, z1, f]);
  }
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
    g.add(at(box(1.04, 2.3, 1.0, STONE), x, 1.15, HEDGE / 2));
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
    if (FAVELA && FAVELA.outside.busy(x, z, r)) return false;       // Morro: fora do casario e dos terraços do entorno
    if (MEDV && MEDV.extra && x > MEDV.extra.area.x0 - r && x < MEDV.extra.area.x1 + r && z > MEDV.extra.area.z0 - r && z < MEDV.extra.area.z1 + r) return false;   // Medieval: igreja, oficina e casas fora da muralha
    if (CANAL && CANAL.canyon && x > CANAL.x0 - 8 - r && x < CANAL.x1 + 8 + r) return false;   // Cachoeira: desfiladeiro
    if (CANAL && CANAL.canyon && CANAL.rock.some(b => x > b.x0 - r - 2 && x < b.x1 + r + 2 && z > b.z0 - r - 2 && z < b.z1 + r + 2)) return false;   // e o maciço da cachoeira (com os degraus dos lados)
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
  if (CANAL && CANAL.canyon) {                    // Cachoeira: mata nas duas margens do desfiladeiro, fora do bairro (ao norte e entre a sebe e o maciço)
    const C = CANAL, ccx = (C.x0 + C.x1) / 2, rockAt = (x, z, m) => C.rock.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
    const okC = (x, z, r) => !(x > C.x0 - 2.4 - r * 0.4 && x < C.x1 + 2.4 + r * 0.4)          // tronco fora do desfiladeiro (a copa pode passar da cerca)
      && (z < -8 - r || z > MAP + 9 + r) && !(Math.abs(x - cx) < ROAD / 2 + 2 + r && z < 0)   // longe da sebe e da estrada de acesso
      && !rockAt(x, z, r + 1.5) && free(x, z, r);
    const tree = (x, y, z, s, pine, n) => {        // tronco apoiado no chão (y)
      if (pine) {
        g.add(at(cyl(0.22 * s, 0.3 * s, 1.2 * s, TRUNK, 6), x, y + 0.6 * s, z));
        g.add(at(cone(1.9 * s, 2.6 * s, PINE[n % 2], 7), x, y + 2.2 * s, z));
        g.add(at(cone(1.4 * s, 2.2 * s, PINE[(n + 1) % 2], 7), x, y + 3.5 * s, z));
      } else {
        g.add(at(cyl(0.26 * s, 0.36 * s, 2.0 * s, TRUNK, 6), x, y + 1.0 * s, z));
        const c = LEAVES[n % LEAVES.length];
        const b1 = at(mesh(blob, c), x, y + 2.7 * s, z, rand() * 3, rand() * 3, 0); b1.scale.setScalar(1.7 * s);
        const b2 = at(mesh(blob, LEAVES[(n + 1) % LEAVES.length]), x + 0.9 * s, y + 2.3 * s, z + 0.4 * s, rand() * 3, 0, rand() * 3); b2.scale.setScalar(1.15 * s);
        const b3 = at(mesh(blob, c), x - 0.7 * s, y + 3.4 * s, z - 0.3 * s, 0, rand() * 3, rand() * 3); b3.scale.setScalar(1.05 * s);
        g.add(b1, b2, b3);
      }
    };
    let n = 0, tr = 0;
    while (n < 300 && tr++ < 40000) {
      const side = rand() < 0.5 ? -1 : 1, d = 2.6 + Math.pow(rand(), 1.7) * 48, x = side < 0 ? C.x0 - d : C.x1 + d;
      const z = rand() < 0.85 ? -10 - rand() * 300 : MAP + 9 + rand() * 40;
      const s = 0.95 + rand() * 0.75, r = 2.2 * s, pine = rand() < 0.55;
      if (!okC(x, z, r)) continue;
      placed.push([x, z, r]); n++;
      SOLIDS.push({ x0: x - r * 0.3, z0: z - r * 0.3, x1: x + r * 0.3, z1: z + r * 0.3 });   // tronco (a van bate)
      tree(x, 0, z, s, pine, n);
      fakeShadow(x, z, (pine ? 2.6 : 2.7) * s, (pine ? 1.6 : 1.9) * s);
    }
    for (let k = 0, tb = 0; k < 90 && tb++ < 20000;) {   // arbustos entre as árvores
      const side = rand() < 0.5 ? -1 : 1, d = 2.2 + rand() * 40, x = side < 0 ? C.x0 - d : C.x1 + d, z = rand() < 0.85 ? -10 - rand() * 300 : MAP + 9 + rand() * 40;
      const s = 0.7 + rand() * 0.6, r = 1.1 * s;
      if (!okC(x, z, r)) continue;
      placed.push([x, z, r]); k++;
      SOLIDS.push({ x0: x - r * 0.3, z0: z - r * 0.3, x1: x + r * 0.3, z1: z + r * 0.3 });
      const b = at(mesh(blob, LEAVES[(k + 1) % LEAVES.length]), x, 0.55 * s, z, rand() * 3, rand() * 3, 0);
      b.scale.set(1.2 * s, 0.85 * s, 1.1 * s); g.add(b);
      fakeShadow(x, z, 0.5 * s, 1.2 * s);
    }
    // mata no alto do maciço (dos dois lados do rio do alto) e dos degraus de pedra: cada tronco no chão do seu patamar, longe das
    // beiradas e de qualquer patamar mais alto (sem colisão: lá em cima a van não chega)
    const R0 = C.rock[0], tops = [{ ...R0, x1: ccx - 22 }, { ...R0, x0: ccx + 22 }].concat(C.rock.slice(1));
    const higher = (b, x, z, m) => C.rock.some(o => o.top > b.top && x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m);
    for (const b of tops) {
      const want = Math.round((b.x1 - b.x0) * (b.z1 - b.z0) / (b.top > 50 ? 58 : b.top > 30 ? 74 : 95)), mine = [];
      for (let k = 0, t = 0; k < want && t < want * 30; t++) {
        const s = 1.5 + rand() * 1.2, m = 1.2 + s * 1.3, x = b.x0 + m + rand() * (b.x1 - b.x0 - 2 * m), z = b.z0 + m + rand() * (b.z1 - b.z0 - 2 * m);
        if (higher(b, x, z, m) || mine.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + s * 1.6)) continue;
        mine.push([x, z, s * 1.6]); tree(x, b.top, z, s, rand() < 0.6, k); k++;
      }
    }
  }
  return g;
}

// ---------- Arredores com relação ao lugar (bairros comuns 1–5 e urbanos) ----------
// O bairro não termina numa planície vazia: a estrada de acesso cruza uma estrada que segue para os dois lados, ruas
// laterais contornam a sebe, e ao longe a vizinhança continua mais simples (casas sem quintal detalhado, telhados de cores
// apagadas — nada que pareça um destino de entrega), com terrenos, plantações, cercas, pastos, pomares e grupos de árvores
// variados; nos bairros urbanos, quarteirões baixos, galpões e terrenos de grama seca. Quase tudo instanciado (uma
// InstancedMesh por peça, cor por instância); colisão só em construções, cercas e troncos — todos fora da área jogável.
// Os bairros especiais (Veneza, Morro, Colheita, Nevasca, Lua, Cachoeira, Medieval, Jardins, Modernista, Bosque,
// Operário) continuam com os arredores próprios (buildOutskirts acima).
const J_ROAD = -62;                                   // eixo da estrada que cruza a de acesso, ao norte da entrada
const OUT_R = 215;                                    // até onde vão os arredores (além da borda do bairro; a névoa da câmera de jogo começa a ~130)
const U_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);           // base em y = 0
const U_CBOX = new THREE.BoxGeometry(1, 1, 1);                                // centrada
const U_GABLE = (() => {                                                      // oitão: triângulo (base 1, altura 1), cumeeira ao longo de X
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]), { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2); return g;
})();
const U_TRUNK = new THREE.CylinderGeometry(0.7, 1, 1, 6).translate(0, 0.5, 0);
const U_CYL = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
const U_ICO = new THREE.IcosahedronGeometry(1, 0);
const U_OCT = new THREE.OctahedronGeometry(1, 0);                              // frutinhas (8 triângulos)
const U_CONE = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
const U_DISC = new THREE.CircleGeometry(1, 8).rotateX(-Math.PI / 2);
const OUT_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0, flatShading: true });
const SHADE_MAT = new THREE.MeshBasicMaterial({ color: '#1f2a14', transparent: true, opacity: 0.2, depthWrite: false });

/** Instâncias agrupadas por chave (uma InstancedMesh por chave; cor por instância). */
function instancer() {
  const sets = new Map(), o = new THREE.Object3D(), col = new THREE.Color();
  return {
    add(key, geo, x, y, z, sx, sy, sz, rx, ry, color, rz = 0) {
      let s = sets.get(key); if (!s) sets.set(key, s = { geo, list: [] });
      s.list.push([x, y, z, sx, sy, sz, rx, ry, color, rz]);
    },
    build(group, material = OUT_MAT) {
      for (const [key, s] of sets) {
        const im = new THREE.InstancedMesh(s.geo, key === 'shade' ? SHADE_MAT : material, s.list.length);
        s.list.forEach(([x, y, z, sx, sy, sz, rx, ry, c, rz], i) => {
          o.position.set(x, y, z); o.rotation.set(rx, ry, rz, 'YXZ'); o.scale.set(sx, sy, sz); o.updateMatrix();
          im.setMatrixAt(i, o.matrix); if (key !== 'shade') im.setColorAt(i, col.set(c));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = false; im.receiveShadow = false; im.name = 'arredores:' + key;
        if (key === 'shade') im.renderOrder = -1;
        group.add(dynamic(im));
      }
    },
  };
}
const lerpHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const hitRect = (r, x0, z0, x1, z1) => x1 > r.x0 && x0 < r.x1 && z1 > r.z0 && z0 < r.z1;

/** Texturas listradas das plantações (uma por combinação; repetição por UV). */
const fieldMats = new Map();
function fieldMat(a, b, rows = 2) {
  const key = a + b + rows;
  let m = fieldMats.get(key);
  if (!m) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const x = c.getContext('2d');
    for (let k = 0; k < rows * 2; k++) { x.fillStyle = k % 2 ? b : a; x.fillRect(0, k * 64 / (rows * 2), 16, 64 / (rows * 2)); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    m = new THREE.MeshStandardMaterial({ map: t, roughness: 1, metalness: 0 });
    fieldMats.set(key, m);
  }
  return m;
}
function fieldPlane(w, d, material, period) {
  const g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * d / period);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.castShadow = false; m.receiveShadow = false;
  return m;
}

/** Qual arredor este bairro usa: null = especial (fica com o seu); senão o "jeito" do lugar. */
function surroundKind({ venice, moon, farm, snow, dry }) {
  if (venice || moon || farm || snow || SPOTS || VENICE || (CANAL && CANAL.canyon)) return null;
  if (dry || BUILD_H > 9.2) return 'city';
  if (GRID === 4) return 'rural';          // Bairros 1 e 3: a beira da vila, com sítios e plantações
  if (PLAZA) return 'town';                // Bairro 2: a cidadezinha continua em volta da praça
  if (GRID === 5) return 'roads';          // Bairro 4 (Veredas): estradas de terra cortando as roças
  return 'trade';                          // Bairro 5 (Ofício): oficinas e galpões entre as casas
}

/** Planta dos arredores: estradas, casas/prédios ao longo delas e os terrenos (só dados; nada é desenhado aqui). */
function planSurroundings(kind, dry) {
  const rand = rng(41 + GRID * 7 + (PLAZA ? 3 : 0) + (kind === 'city' ? 11 : 0));
  const M = MAP, cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;
  const city = kind === 'city', rural = kind === 'rural';
  const RW = city ? 8.4 : 6.8, RL = city ? 7.6 : 5.6;          // largura da estrada que cruza e das laterais
  const XW = -46, XE = M + 46, ZS = M + 62;                      // ruas laterais e a do sul
  const XL = -OUT_R + 10, XR = M + OUT_R - 10;
  const southRoad = !rural;                                     // Bairros 1 e 3: o sul fica aberto (na direção do sol)
  const laneEnd = southRoad ? ZS - RW / 2 : M - 16;
  const laneDirt = rural || kind === 'roads';
  const roads = [
    { x0: XL, x1: ENTRANCE.x0, z0: J_ROAD - RW / 2, z1: J_ROAD + RW / 2, dirt: false, axis: 'x' },
    { x0: ENTRANCE.x1, x1: XR, z0: J_ROAD - RW / 2, z1: J_ROAD + RW / 2, dirt: false, axis: 'x' },
    { x0: XW - RL / 2, x1: XW + RL / 2, z0: J_ROAD + RW / 2, z1: laneEnd, dirt: laneDirt, axis: 'z' },
    { x0: XE - RL / 2, x1: XE + RL / 2, z0: J_ROAD + RW / 2, z1: laneEnd, dirt: laneDirt, axis: 'z' },
  ];
  if (southRoad) roads.push({ x0: XL, x1: XR, z0: ZS - RW / 2, z1: ZS + RW / 2, dirt: kind === 'roads', axis: 'x' });
  // reservas: o bairro com folga, o corredor da estrada de acesso (cena do monstro), as estradas e, nos Bairros 1/3, o sul
  const reserved = [
    { x0: -26, x1: M + 26, z0: -26, z1: M + 26 },
    { x0: cx - 20, x1: cx + 20, z0: -500, z1: 0 },
    ...roads.map(r => ({ x0: r.x0 - 3, x1: r.x1 + 3, z0: r.z0 - 3, z1: r.z1 + 3 })),
  ];
  const openSouth = rural ? { x0: -90, x1: M + 90, z0: M + 8, z1: 2000 } : null;   // caminho da igreja (Bairro 1): só chão e árvores
  const free = (x0, z0, x1, z1) => !reserved.some(r => hitRect(r, x0, z0, x1, z1)) && !(openSouth && hitRect(openSouth, x0, z0, x1, z1));
  const builds = [];                                            // casas, galpões, prédios: { type, x, z, w, d, ry, ... }
  const take = (b, pad = 2) => { const hw = (Math.abs(Math.sin(b.ry)) > 0.5 ? b.d : b.w) / 2, hd = (Math.abs(Math.sin(b.ry)) > 0.5 ? b.w : b.d) / 2;
    const r = { x0: b.x - hw - pad, x1: b.x + hw + pad, z0: b.z - hd - pad, z1: b.z + hd + pad };
    if (!free(r.x0, r.z0, r.x1, r.z1)) return false;
    reserved.push(r); b.box = { x0: b.x - hw, x1: b.x + hw, z0: b.z - hd, z1: b.z + hd }; builds.push(b); return true; };
  const houseDims = () => ({ w: 7.4 + rand() * 2.2, d: 6.0 + rand() * 1.4, h: rand() < 0.22 ? 5.5 : 2.9 + rand() * 0.3, rise: 1.8 + rand() * 0.5 });
  const cityDims = () => ({ w: 11 + rand() * 9, d: 10 + rand() * 6, floors: 3 + Math.floor(rand() * (BUILD_H > 20 ? 6 : 4)) });
  // ao longo das estradas: a casa/prédio olha para a estrada (e, portanto, para o bairro)
  const fill = (along, from, to, step, place, chance) => { for (let t = from; t < to; t += step * (0.85 + rand() * 0.4)) if (rand() < chance) place(t); };
  const front = (type, x, z, ry, dims) => take({ type, x, z, ry, ...dims });
  const pick = () => (city ? (rand() < 0.75 ? 'block' : 'ware') : kind === 'trade' && rand() < 0.3 ? 'shed' : 'house');
  const dimsOf = t => t === 'block' ? cityDims() : t === 'ware' ? { w: 18 + rand() * 8, d: 13 + rand() * 4 } : t === 'shed' ? { w: 11 + rand() * 4, d: 9 + rand() * 2 } : houseDims();
  const dens = city ? 0.72 : kind === 'town' ? 0.85 : kind === 'trade' ? 0.75 : rural ? 0.45 : 0.55;
  const stepH = city ? 24 : kind === 'town' ? 19 : 23;
  for (const side of [-1, 1]) {
    // estrada do norte, lado de fora (olhando para o sul)
    fill('x', 32, OUT_R - 40, stepH, t => { const x = cx + side * t, ty = pick(), dm = dimsOf(ty); front(ty, x, J_ROAD - RW / 2 - 6 - dm.d / 2, 0, dm); }, dens);
    // estrada do sul (se houver), lado de fora (olhando para o norte)
    if (southRoad) fill('x', 0, OUT_R - 40 + M / 2, stepH, t => { const x = M / 2 + side * t, ty = pick(), dm = dimsOf(ty); front(ty, x, ZS + RW / 2 + 6 + dm.d / 2, Math.PI, dm); }, dens * 0.9);
  }
  // ruas laterais: lado de fora, olhando para o bairro
  for (const [X, s] of [[XW, -1], [XE, 1]]) {
    fill('z', J_ROAD + RW / 2 + 12, laneEnd - 8, stepH, t => { const ty = pick(), dm = dimsOf(ty); front(ty, X + s * (RL / 2 + 6 + dm.d / 2), t, s < 0 ? Math.PI / 2 : -Math.PI / 2, dm); }, dens);
  }
  // Bairros 1/3: as estradas de terra terminam num sítio (casa, celeiro e silo)
  const farms = [];
  if (rural) for (const [X, s] of [[XW, -1], [XE, 1]]) {
    const z = laneEnd + 8;
    if (front('farmhouse', X - s * 2, z + 7, Math.PI, { w: 10, d: 7.5, h: 3.2, rise: 2.4 })) farms.push({ x: X, z });
    front('barn', X + s * 16, z + 4, s < 0 ? Math.PI / 2 : -Math.PI / 2, { w: 12, d: 9 });
    front('silo', X + s * 15, z - 10, 0, { w: 4.4, d: 4.4 });
  }
  // terrenos: retalhos de ~34 m no anel em volta (o que não cabe vira gramado)
  const cells = [], C = 34;
  for (let x = XL; x < XR - C; x += C) for (let z = -OUT_R + 10; z < M + OUT_R - 10 - C; z += C) {
    const x0 = x + 1.5, x1 = x + C - 1.5, z0 = z + 1.5, z1 = z + C - 1.5, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const ed = Math.hypot(Math.max(-mx, 0, mx - M), Math.max(-mz, 0, mz - M));
    if (ed > OUT_R - (city ? 50 : 20)) continue;                 // (a cidade é mais pesada: anel um pouco mais estreito)
    if (reserved.some(r => hitRect(r, x0, z0, x1, z1))) continue;
    const south = openSouth && hitRect(openSouth, x0, z0, x1, z1);
    const r = rand();
    let type;
    if (city) type = r < 0.3 ? 'block' : r < 0.45 ? 'ware' : r < 0.72 ? 'lot' : 'park';
    else if (kind === 'town') type = r < 0.32 ? 'homes' : r < 0.5 ? 'grove' : r < 0.62 ? 'lot' : r < 0.8 ? 'crop' : 'meadow';
    else if (kind === 'trade') type = r < 0.22 ? 'homes' : r < 0.42 ? 'ware' : r < 0.58 ? 'grove' : r < 0.7 ? 'lot' : r < 0.85 ? 'crop' : 'meadow';
    else type = r < 0.22 ? 'crop' : r < 0.36 ? 'wheat' : r < 0.48 ? 'plowed' : r < 0.62 ? 'pasture' : r < 0.72 ? 'orchard' : r < 0.86 ? 'grove' : 'stubble';
    if (south && !['crop', 'wheat', 'plowed', 'meadow'].includes(type)) type = rand() < 0.5 ? 'wheat' : 'crop';   // caminho da igreja: só plantação rasteira
    cells.push({ x0, x1, z0, z1, type, south, along: rand() < 0.5 ? 'x' : 'z' });
  }
  return { kind, roads, builds, cells, farms, reserved, openSouth, RW, RL, XW, XE, ZS, J: J_ROAD, southRoad, laneEnd, rand, laneCol: dry ? '#a08562' : '#a88d66' };
}

/** Desenha os arredores planejados. Devolve { group (instanciado/fundido), fields (chão), live (animado), update }. */
function buildSurroundings(P, dryPal) {
  const g = new THREE.Group(), fields = new THREE.Group(), live = new THREE.Group();
  const I = instancer(), rand = P.rand, solids = [], near = [];   // solids: colisão "sob demanda" (perto da van); near: troncos junto à sebe (sempre)
  const city = P.kind === 'city';
  const cityDims = () => ({ w: 11 + rand() * 9, d: 10 + rand() * 6, floors: 3 + Math.floor(rand() * (BUILD_H > 20 ? 6 : 4)) });
  const PAL = dryPal
    ? { leaves: ['#7f9a45', '#8ea24e', '#6f8a3e', '#a0a457'], pine: ['#4f7444', '#5a7f4b'], crop: ['#8f9a4e', '#7f8c45'], wheat: ['#d2bd68', '#c2ab58'], plowed: ['#8a6d4c', '#735a3e'], pasture: '#a3a65c', stubble: ['#c9b56c', '#bba862'], lot: '#a8946e', lane: '#a08562' }
    : { leaves: ['#4f9a45', '#5ea84e', '#3f8a3c', '#6db256', '#7aa84a'], pine: ['#2f7a45', '#3a8a50'], crop: ['#6e9f47', '#5c8d3d'], wheat: ['#dcc56c', '#c8ad55'], plowed: ['#8d6c4a', '#74583b'], pasture: '#93c062', stubble: ['#d2c178', '#c2b06a'], lot: '#b09a74', lane: '#a88d66' };
  const WALLS = ['#e8dcc4', '#e1d2b7', '#eee5d4', '#d8ccb6', '#e5d6c4', '#dcd3c2'];
  const ROOFS = ['#8a5e4d', '#7a5d4e', '#6b6866', '#83705c', '#8f6f5e', '#5f5a55'];   // telhados de cores apagadas, puxadas para o marrom (nenhuma lembra uma cor de pista)
  const DOORS = ['#5a4030', '#4d5a4a', '#5b4b3c', '#6a4a3a'];
  const GLASS = '#a7bccb', BRICK = '#9c5a44', WOOD_C = '#8a6a48', TRUNK_C = '#7a5230';
  const CITY_WALLS = dryPal ? ['#c2b7a2', '#b3a996', '#cdbfa8', '#a99f91', '#b89a80', '#c9b49b'] : ['#bdb8ae', '#aaa59c', '#c9c2b5', '#9e9a92', '#b8a593', '#c7bba9'];
  const solid = (x0, x1, z0, z1) => { const s = { x0, x1, z0, z1 }; solids.push(s); return s; };
  const shade = (x, z, rx, rz) => I.add('shade', U_DISC, x, -0.002, z, rx, 1, rz, 0, 0, '#000');
  const sd = { x: -SUN_DIR.x / SUN_DIR.y, z: -SUN_DIR.z / SUN_DIR.y };   // sombra por unidade de altura (para o noroeste)

  // ---- árvores ----
  const tree = (x, z, type, s, withSolid = true) => {
    const ry = rand() * 6.28, lc = () => lerpHex(PAL.leaves[Math.floor(rand() * PAL.leaves.length)], '#ffffff', rand() * 0.06);
    if (type === 'pine') {
      I.add('trunk', U_TRUNK, x, 0, z, 0.3 * s, 1.3 * s, 0.3 * s, 0, ry, TRUNK_C);
      const c = PAL.pine[Math.floor(rand() * 2)];
      I.add('cone', U_CONE, x, 0.9 * s, z, 1.9 * s, 2.7 * s, 1.9 * s, 0, ry, c);
      I.add('cone', U_CONE, x, 2.4 * s, z, 1.4 * s, 2.4 * s, 1.4 * s, 0, ry, lerpHex(c, '#ffffff', 0.06));
      shade(x + sd.x * 2 * s, z + sd.z * 2 * s, 1.7 * s, 1.3 * s);
    } else if (type === 'poplar') {                 // álamo: copa alta e estreita (quebra-vento)
      I.add('trunk', U_TRUNK, x, 0, z, 0.24 * s, 1.4 * s, 0.24 * s, 0, ry, TRUNK_C);
      I.add('ico', U_ICO, x, 3.5 * s, z, 1.1 * s, 2.7 * s, 1.1 * s, 0, ry, lc());
      shade(x + sd.x * 3 * s, z + sd.z * 3 * s, 1.2 * s, 1.0 * s);
    } else if (type === 'birch') {
      I.add('trunk', U_TRUNK, x, 0, z, 0.2 * s, 2.6 * s, 0.2 * s, 0, ry, '#e9e3d6');           // bétula: tronco claro e copa leve, mais estreita em cima
      I.add('ico', U_ICO, x, 3.1 * s, z, 1.35 * s, 1.5 * s, 1.35 * s, rand(), ry, lerpHex('#a7c95e', PAL.leaves[0], 0.3));
      I.add('ico', U_ICO, x + 0.5 * s, 2.5 * s, z + 0.3 * s, 1.0 * s, 0.9 * s, 1.0 * s, rand(), ry, '#9cc35a');
      I.add('ico', U_ICO, x - 0.2 * s, 4.1 * s, z - 0.1 * s, 0.7 * s, 0.8 * s, 0.7 * s, rand(), ry, lerpHex('#a7c95e', '#ffffff', 0.08));
      shade(x + sd.x * 2.5 * s, z + sd.z * 2.5 * s, 1.4 * s, 1.1 * s);
    } else if (type === 'bush') {
      I.add('ico', U_ICO, x, 0.5 * s, z, 1.2 * s, 0.8 * s, 1.1 * s, rand(), ry, lc());
      if (rand() < 0.4) I.add('ico', U_ICO, x + 0.8 * s, 0.4 * s, z + 0.3 * s, 0.8 * s, 0.6 * s, 0.75 * s, rand(), ry, lc());
      if (withSolid) solid(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s);
      return;
    } else {                                        // redonda (2 a 3 tufos)
      I.add('trunk', U_TRUNK, x, 0, z, 0.34 * s, 2.1 * s, 0.34 * s, 0, ry, TRUNK_C);
      const c = lc();
      I.add('ico', U_ICO, x, 2.75 * s, z, 1.7 * s, 1.55 * s, 1.7 * s, rand(), ry, c);
      I.add('ico', U_ICO, x + 0.9 * s, 2.3 * s, z + 0.4 * s, 1.15 * s, 1.05 * s, 1.15 * s, rand(), ry, lc());
      if (rand() < 0.7) I.add('ico', U_ICO, x - 0.7 * s, 3.4 * s, z - 0.3 * s, 1.05 * s, 1.0 * s, 1.05 * s, rand(), ry, c);
      shade(x + sd.x * 2.4 * s, z + sd.z * 2.4 * s, 2.2 * s, 1.7 * s);
    }
    if (withSolid) solid(x - 0.6 * s, x + 0.6 * s, z - 0.6 * s, z + 0.6 * s);
  };
  const treeType = () => { const r = rand(); return r < 0.5 ? 'round' : r < 0.72 ? 'pine' : r < 0.86 ? 'birch' : 'poplar'; };

  // ---- cercas de madeira (poste e duas travessas) ----
  const fence = (x0, z0, x1, z1, col = WOOD_C) => {
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = alongX ? x1 - x0 : z1 - z0;
    if (len < 2) return;
    const n = Math.max(1, Math.round(len / 3.2));
    for (let i = 0; i <= n; i++) { const t = i / n; I.add('post', U_BOX, x0 + (x1 - x0) * t, 0, z0 + (z1 - z0) * t, 0.16, 1.05, 0.16, 0, 0, col); }
    for (const y of [0.4, 0.82]) I.add('rail', U_CBOX, (x0 + x1) / 2, y, (z0 + z1) / 2, alongX ? len : 0.07, 0.09, alongX ? 0.07 : len, 0, 0, col);
    solid(Math.min(x0, x1) - 0.15, Math.max(x0, x1) + 0.15, Math.min(z0, z1) - 0.15, Math.max(z0, z1) + 0.15);
  };
  /** Cerca nos 4 lados com uma porteira (vão de 4 m) no lado `gate` ('n','s','w','e'). */
  const fenceBox = (r, gate) => {
    const sides = { n: [r.x0, r.z0, r.x1, r.z0], s: [r.x0, r.z1, r.x1, r.z1], w: [r.x0, r.z0, r.x0, r.z1], e: [r.x1, r.z0, r.x1, r.z1] };
    for (const [k, [a, b, c, d]] of Object.entries(sides)) {
      if (k !== gate) { fence(a, b, c, d); continue; }
      const alongX = k === 'n' || k === 's', m = alongX ? (a + c) / 2 : (b + d) / 2;
      if (alongX) { fence(a, b, m - 2, d); fence(m + 2, b, c, d); } else { fence(a, b, c, m - 2); fence(a, m + 2, c, d); }
    }
  };

  // ---- casas simples (ao longe), galpões, prédios ----
  const local = (b) => { const c = Math.cos(b.ry), s = Math.sin(b.ry); return (lx, lz) => [b.x + lx * c + lz * s, b.z - lx * s + lz * c]; };
  const gableHouse = (b, wall, roof, opts = {}) => {
    const P2 = local(b), { w, d, h, rise } = b, ry = b.ry, th = Math.atan2(rise, d / 2), ov = opts.over ?? 0.45;
    let [x, z] = P2(0, 0);
    I.add('box', U_BOX, x, 0, z, w, h, d, 0, ry, wall);
    I.add('gable', U_GABLE, x, h, z, w, rise, d, 0, ry, wall);
    const L = (d / 2 + ov) / Math.cos(th), T = 0.2;
    for (const sg of [1, -1]) {                                 // duas águas, com beiral
      const zm = sg * (d / 2 + ov) / 2, ym = h + rise - (d / 2 + ov) / 2 * Math.tan(th);
      [x, z] = P2(0, zm + sg * Math.sin(th) * T / 2);
      I.add('cbox', U_CBOX, x, ym + Math.cos(th) * T / 2, z, w + 2 * ov * 0.8, T, L, sg * th, ry, roof);
    }
    if (opts.chimney) { [x, z] = P2(w * 0.25, -d * 0.15); I.add('box', U_BOX, x, h + rise * 0.3, z, 0.65, rise * 0.75 + 0.5, 0.65, 0, ry, BRICK); }
    return P2;
  };
  for (const b of P.builds) {
    const P2 = local(b), ry = b.ry;
    const at2 = (key, geo, lx, y, lz, sx, sy, sz, col, rx = 0) => { const [x, z] = P2(lx, lz); I.add(key, geo, x, y, z, sx, sy, sz, rx, ry, col); };
    if (b.type === 'house' || b.type === 'farmhouse') {
      const wall = WALLS[Math.floor(rand() * WALLS.length)], roof = b.type === 'farmhouse' ? '#8a5040' : ROOFS[Math.floor(rand() * ROOFS.length)];
      gableHouse(b, wall, roof, { chimney: rand() < 0.4 || b.type === 'farmhouse' });
      const dx = (rand() < 0.5 ? -1 : 1) * b.w * 0.18;
      at2('cbox', U_CBOX, dx, 1.05, b.d / 2 + 0.05, 1.0, 2.1, 0.12, DOORS[Math.floor(rand() * DOORS.length)]);
      at2('cbox', U_CBOX, dx, 0.08, b.d / 2 + 0.5, 1.6, 0.16, 0.8, '#cfc5b0');                     // degrau
      for (const wx of [-1, 1]) {
        const xx = wx * b.w * 0.3; if (Math.abs(xx - dx) < 1.2) continue;
        at2('cbox', U_CBOX, xx, 1.55, b.d / 2 + 0.05, 1.3, 1.05, 0.1, GLASS);
        if (b.h > 4) at2('cbox', U_CBOX, xx, 4.15, b.d / 2 + 0.05, 1.2, 1.0, 0.1, GLASS);
      }
      if (b.h > 4) at2('cbox', U_CBOX, dx, 4.15, b.d / 2 + 0.05, 1.2, 1.0, 0.1, GLASS);
      at2('cbox', U_CBOX, 0, 1.6, -b.d / 2 - 0.05, 1.3, 1.0, 0.1, GLASS);                          // janela dos fundos
      if (b.type === 'farmhouse') {                                                              // varanda do sítio
        for (const px of [-b.w / 2 + 0.4, -1.4, 1.4, b.w / 2 - 0.4]) at2('box', U_BOX, px, 0, b.d / 2 + 2.0, 0.18, 2.5, 0.18, '#f2ead8');
        at2('cbox', U_CBOX, 0, 2.6, b.d / 2 + 1.1, b.w + 0.3, 0.16, 2.4, '#7a4a3a', 0.12);
        at2('cbox', U_CBOX, 0, 0.12, b.d / 2 + 1.1, b.w, 0.24, 2.2, '#b99a72');
      } else if (rand() < 0.5) {                                                                 // cerquinha baixa na frente
        const fz = b.d / 2 + 3.4;
        for (let k = -4; k <= 4; k++) if (Math.abs(k * b.w / 9 - dx) > 0.9) at2('box', U_BOX, k * b.w / 9, 0, fz, 0.12, 0.7, 0.08, '#f4efe4');
        for (const sg of [-1, 1]) { const a = sg > 0 ? dx + 0.9 : -b.w / 2, c = sg > 0 ? b.w / 2 : dx - 0.9; if (c - a > 0.3) at2('cbox', U_CBOX, (a + c) / 2, 0.45, fz, c - a, 0.08, 0.06, '#f4efe4'); }
        const [f0x, f0z] = P2(-b.w / 2, fz), [f1x, f1z] = P2(b.w / 2, fz);
        solid(Math.min(f0x, f1x) - 0.15, Math.max(f0x, f1x) + 0.15, Math.min(f0z, f1z) - 0.15, Math.max(f0z, f1z) + 0.15);
      }
      if (rand() < 0.55) { const [tx, tz] = P2((rand() < 0.5 ? -1 : 1) * (b.w / 2 + 2.5), b.d / 2 + 1.5); tree(tx, tz, rand() < 0.3 ? 'birch' : 'round', 0.75 + rand() * 0.3); }
      solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2);
      shade(b.x + sd.x * 2.5, b.z + sd.z * 2.5, b.w * 0.62, b.d * 0.62);
    } else if (b.type === 'barn') {
      const B = { ...b, h: 4.6, rise: 3.0 };
      gableHouse(B, '#8a4a3a', '#6d6a66', { over: 0.35 });
      at2('cbox', U_CBOX, 0, 1.75, b.d / 2 + 0.06, 3.6, 3.5, 0.12, '#f1e8d6');
      at2('cbox', U_CBOX, 0, 1.7, b.d / 2 + 0.12, 3.1, 3.2, 0.12, '#6a3a2e');
      for (const sg of [1, -1]) { const [x, z] = P2(0, b.d / 2 + 0.2); I.add('cbox', U_CBOX, x, 1.7, z, 0.18, 4.1, 0.06, 0, ry, '#f1e8d6', sg * 0.72); }   // travessas em X na porta
      solid(b.box.x0, b.box.x1, b.box.z0, b.box.z1);
      shade(b.x + sd.x * 3.5, b.z + sd.z * 3.5, b.w * 0.6, b.d * 0.6);
    } else if (b.type === 'silo') {
      I.add('cyl', U_CYL, b.x, 0, b.z, 2.0, 8.5, 2.0, 0, 0, '#c9cbc6');
      I.add('ico', U_ICO, b.x, 8.5, b.z, 2.05, 1.1, 2.05, 0, 0, '#9da2a6');
      for (const y of [2.4, 5.0, 7.4]) I.add('cyl', U_CYL, b.x, y, b.z, 2.06, 0.18, 2.06, 0, 0, '#a7aaa6');
      solid(b.x - 2.1, b.x + 2.1, b.z - 2.1, b.z + 2.1);
      shade(b.x + sd.x * 5, b.z + sd.z * 5, 2.4, 2.0);
    } else if (b.type === 'shed' || b.type === 'ware') {                                          // oficina / galpão
      const big = b.type === 'ware', H = big ? 6.5 : 4.2;
      const wall = big ? ['#aab1b6', '#b9ad96', '#9fa7a0', '#c2b9a6'][Math.floor(rand() * 4)] : WALLS[Math.floor(rand() * WALLS.length)];
      gableHouse({ ...b, h: H, rise: big ? 1.6 : 1.5 }, wall, big ? '#7d8489' : ROOFS[Math.floor(rand() * ROOFS.length)], { over: 0.3 });
      at2('cbox', U_CBOX, -b.w * 0.18, (big ? 4.6 : 3.2) / 2, b.d / 2 + 0.06, big ? 5 : 3.4, big ? 4.6 : 3.2, 0.12, big ? '#5c636a' : '#6b5642');   // portão
      at2('cbox', U_CBOX, b.w * 0.28, 1.7, b.d / 2 + 0.06, 1.8, 1.0, 0.1, GLASS);
      if (!big) at2('cbox', U_CBOX, -b.w * 0.18, (3.2) + 0.5, b.d / 2 + 0.3, 4.2, 0.14, 1.0, '#7a5a3a', -0.25);   // telheiro sobre o portão
      solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2);
      shade(b.x + sd.x * 3, b.z + sd.z * 3, b.w * 0.6, b.d * 0.6);
    } else if (b.type === 'block') {                                                               // prédio baixo (cidade)
      const H = b.floors * 2.9, wall = CITY_WALLS[Math.floor(rand() * CITY_WALLS.length)];
      I.add('box', U_BOX, b.x, 0, b.z, Math.abs(Math.sin(ry)) > 0.5 ? b.d : b.w, H, Math.abs(Math.sin(ry)) > 0.5 ? b.w : b.d, 0, 0, wall);
      const W2 = (Math.abs(Math.sin(ry)) > 0.5 ? b.d : b.w), D2 = (Math.abs(Math.sin(ry)) > 0.5 ? b.w : b.d);
      for (let f = 0; f < b.floors; f++) I.add('box', U_BOX, b.x, f * 2.9 + 1.05, b.z, W2 + 0.1, 1.0, D2 + 0.1, 0, 0, f === 0 ? '#5d5a55' : '#56636f');   // faixas de janelas
      I.add('box', U_BOX, b.x, H, b.z, W2 + 0.3, 0.5, D2 + 0.3, 0, 0, lerpHex(wall, '#ffffff', 0.15));   // platibanda
      if (rand() < 0.5) I.add('cyl', U_CYL, b.x + W2 * 0.2, H + 0.5, b.z - D2 * 0.15, 1.1, 1.6, 1.1, 0, 0, '#8f9399');   // caixa-d'água
      else I.add('box', U_BOX, b.x - W2 * 0.2, H + 0.5, b.z, 2.2, 1.3, 2.2, 0, 0, '#9fa3a8');
      solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2);
      shade(b.x + sd.x * H * 0.45, b.z + sd.z * H * 0.45, W2 * 0.62, D2 * 0.62);
    }
  }

  // ---- terrenos ----
  const plane = (r, mat, period, along) => {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const m = along === 'z' ? fieldPlane(d, w, mat, period) : fieldPlane(w, d, mat, period);
    m.position.set((r.x0 + r.x1) / 2, -0.012, (r.z0 + r.z1) / 2);
    if (along === 'z') m.rotation.y = Math.PI / 2;
    fields.add(m);
  };
  const flat = (x0, z0, x1, z1, col, y = -0.016) => fields.add(at(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat(col)), (x0 + x1) / 2, y, (z0 + z1) / 2));
  const nearRoad = r => { let best = null, bd = 1e9; for (const [k, d] of [['n', Math.abs(r.z0 - P.J)], ['s', Math.abs(r.z1 - P.ZS)], ['w', Math.abs(r.x0 - P.XW)], ['e', Math.abs(r.x1 - P.XE)]]) if (d < bd) { bd = d; best = k; } return best; };
  let signs = 0, bales = 0;
  const signTex = textTexture('VENDE-SE', { width: 256, height: 128, bg: '#fbf7ee', fg: '#c8312a', font: 'bold 60px "Trebuchet MS", sans-serif' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 });
  for (const c of P.cells) {
    const r = c, w = r.x1 - r.x0, d = r.z1 - r.z0, mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
    switch (c.type) {
      case 'crop': plane(r, fieldMat(PAL.crop[0], PAL.crop[1]), 3.6, c.along); if (!c.south && rand() < 0.45) fence(r.x0, r.z0, r.x1, r.z0); break;
      case 'wheat': plane(r, fieldMat(PAL.wheat[0], PAL.wheat[1]), 3.0, c.along); if (!c.south && rand() < 0.5) for (let k = 0; k < 7; k++) tree(r.x0 + 2 + k * (w - 4) / 6, r.z0 - 0.5, 'poplar', 0.85 + rand() * 0.25); break;   // quebra-vento de álamos
      case 'plowed': plane(r, fieldMat(PAL.plowed[0], PAL.plowed[1]), 2.2, c.along); break;
      case 'stubble':
        plane(r, fieldMat(PAL.stubble[0], PAL.stubble[1], 2), 4, c.along);
        if (!c.south || bales < 30) for (let k = 0, n = 3 + Math.floor(rand() * 4); k < n; k++) {      // fardos redondos
          const bx = r.x0 + 4 + rand() * (w - 8), bz = r.z0 + 4 + rand() * (d - 8);
          I.add('bale', U_CYL, bx, 0.75, bz, 0.75, 1.4, 0.75, Math.PI / 2, rand() * 3, '#d8c27c'); bales++;
          solid(bx - 0.8, bx + 0.8, bz - 0.8, bz + 0.8);
        }
        break;
      case 'pasture': {
        flat(r.x0, r.z0, r.x1, r.z1, PAL.pasture);
        fenceBox({ x0: r.x0 + 1, x1: r.x1 - 1, z0: r.z0 + 1, z1: r.z1 - 1 }, nearRoad(r));
        for (let k = 0, n = 2 + Math.floor(rand() * 3); k < n; k++) {                               // vacas pastando
          const vx = r.x0 + 5 + rand() * (w - 10), vz = r.z0 + 5 + rand() * (d - 10), a = rand() * 6.28, cs = Math.cos(a), sn = Math.sin(a);
          const coat = rand() < 0.5 ? '#f3efe6' : '#8a5a3a';
          I.add('cbox', U_CBOX, vx, 1.05, vz, 2.1, 0.95, 0.95, 0, a, coat);
          I.add('cbox', U_CBOX, vx + cs * 1.2, 0.85, vz - sn * 1.2, 0.6, 0.55, 0.55, 0.5, a, coat === '#f3efe6' ? '#3a3330' : '#f3efe6');   // cabeça baixa (pastando)
          for (const [lx, lz] of [[0.7, 0.3], [0.7, -0.3], [-0.7, 0.3], [-0.7, -0.3]]) I.add('box', U_BOX, vx + cs * lx + sn * lz, 0, vz - sn * lx + cs * lz, 0.18, 0.62, 0.18, 0, a, '#3a3330');
          if (coat === '#f3efe6') I.add('cbox', U_CBOX, vx - cs * 0.3, 1.32, vz + sn * 0.3, 0.8, 0.42, 0.98, 0, a, '#2f2a28');   // malhada
          solid(vx - 1.2, vx + 1.2, vz - 1.2, vz + 1.2);
        }
        break;
      }
      case 'orchard': {
        flat(r.x0, r.z0, r.x1, r.z1, lerpHex(PAL.pasture, '#6a8a40', 0.25));
        const fr = rand() < 0.5 ? '#ff8a1a' : '#e6332a';
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const tx = r.x0 + 4.5 + i * (w - 9) / 3, tz = r.z0 + 4.5 + j * (d - 9) / 3;
          I.add('trunk', U_TRUNK, tx, 0, tz, 0.22, 1.3, 0.22, 0, 0, TRUNK_C);
          I.add('ico', U_ICO, tx, 2.1, tz, 1.45, 1.2, 1.45, rand(), rand() * 6, PAL.leaves[(i + j) % PAL.leaves.length]);
          for (let k = 0; k < 3; k++) { const a = rand() * 6.28; I.add('fruit', U_OCT, tx + Math.cos(a) * 1.15, 2.3 + rand() * 0.5, tz + Math.sin(a) * 1.15, 0.22, 0.22, 0.22, 0, a, fr); }
          shade(tx + sd.x * 1.6, tz + sd.z * 1.6, 1.5, 1.2);
          solid(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4);
        }
        break;
      }
      case 'grove': case 'park': {
        if (c.type === 'park') flat(r.x0, r.z0, r.x1, r.z1, lerpHex(PAL.pasture, '#5f8f3f', 0.35));
        for (let k = 0, n = 6 + Math.floor(rand() * 7); k < n; k++) {
          const tx = mx + (rand() - 0.5) * (w - 6), tz = mz + (rand() - 0.5) * (d - 6);
          tree(tx, tz, k % 4 === 3 ? 'bush' : treeType(), 0.8 + rand() * 0.6);
        }
        break;
      }
      case 'lot': {                                                                                  // terreno baldio
        flat(r.x0 + 3, r.z0 + 3, r.x1 - 3, r.z1 - 3, PAL.lot);
        for (let k = 0; k < 5; k++) { const a = rand() * 6.28, rr = 2 + rand() * 9; I.add('ico', U_ICO, mx + Math.cos(a) * rr, 0.2, mz + Math.sin(a) * rr, 0.9 + rand(), 0.35, 0.8 + rand() * 0.6, 0, rand() * 3, lerpHex(PAL.pasture, '#6a7a40', 0.3)); }   // mato
        const side = nearRoad(r);
        if (signs < 4 && (side === 'n' || side === 's' || side === 'w' || side === 'e')) {
          const sxp = side === 'w' ? r.x0 + 4 : side === 'e' ? r.x1 - 4 : mx, szp = side === 'n' ? r.z0 + 4 : side === 's' ? r.z1 - 4 : mz;
          const face = side === 'n' ? Math.PI : side === 's' ? 0 : side === 'w' ? -Math.PI / 2 : Math.PI / 2;
          const sg = new THREE.Group(); sg.position.set(sxp, 0, szp); sg.rotation.y = face;
          for (const px of [-0.8, 0.8]) sg.add(at(box(0.12, 1.9, 0.12, '#6b4a2e'), px, 0.95, 0));
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), signMat); pl.position.set(0, 1.45, 0.08); sg.add(pl);
          sg.add(at(box(2.3, 1.2, 0.08, '#efe8d8'), 0, 1.45, 0.02));
          g.add(sg); signs++;
          solid(sxp - 1.2, sxp + 1.2, szp - 1.2, szp + 1.2);
        }
        if (city && rand() < 0.5) fence(r.x0 + 2, r.z0 + 2, r.x1 - 2, r.z0 + 2, '#8d9093');
        break;
      }
      case 'homes': {                                                                                // casinhas no miolo da quadra de fora
        for (const [ox, oz] of [[0.27, 0.3], [0.73, 0.68]]) {
          const dm = { w: 7.4 + rand() * 1.6, d: 6.2, h: 2.9, rise: 2 };
          const b = { type: 'house', x: r.x0 + ox * w, z: r.z0 + oz * d, ry: [0, Math.PI, Math.PI / 2, -Math.PI / 2][Math.floor(rand() * 4)], ...dm };
          const hw = (Math.abs(Math.sin(b.ry)) > 0.5 ? b.d : b.w) / 2, hd = (Math.abs(Math.sin(b.ry)) > 0.5 ? b.w : b.d) / 2;
          b.box = { x0: b.x - hw, x1: b.x + hw, z0: b.z - hd, z1: b.z + hd };
          gableHouse(b, WALLS[Math.floor(rand() * WALLS.length)], ROOFS[Math.floor(rand() * ROOFS.length)], { chimney: rand() < 0.3 });
          const [dx, dz] = local(b)(0, b.d / 2 + 0.05); I.add('cbox', U_CBOX, dx, 1.05, dz, 1.0, 2.1, 0.12, 0, b.ry, DOORS[0]);
          solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2);
          shade(b.x + sd.x * 2.5, b.z + sd.z * 2.5, b.w * 0.6, b.d * 0.6);
        }
        for (let k = 0; k < 3; k++) tree(r.x0 + 3 + rand() * (w - 6), r.z0 + 3 + rand() * (d - 6), treeType(), 0.8 + rand() * 0.4);
        break;
      }
      case 'ware': {
        const b = { type: 'ware', x: mx, z: mz, ry: 0, w: 22, d: 14 };
        b.box = { x0: b.x - 11, x1: b.x + 11, z0: b.z - 7, z1: b.z + 7 };
        flat(r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, dryPal ? '#a49d8c' : '#a8a497');               // pátio
        gableHouse({ ...b, h: 6.5, rise: 1.6 }, ['#aab1b6', '#b9ad96', '#9fa7a0'][Math.floor(rand() * 3)], '#7d8489', { over: 0.3 });
        I.add('cbox', U_CBOX, b.x - 4, 2.3, b.z + 7.06, 5, 4.6, 0.12, 0, 0, '#5c636a');
        for (let k = 0; k < 3; k++) I.add('box', U_BOX, b.x + 4 + k * 1.3, 0, b.z + 9.5, 1.1, 0.9, 1.1, 0, rand(), '#b08a5a');   // caixotes
        solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2);
        shade(b.x + sd.x * 3, b.z + sd.z * 3, 13, 8.5);
        break;
      }
      case 'block': {
        flat(r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, dryPal ? '#b4ab98' : '#b3ae9f');               // calçamento da quadra
        const n = 2 + Math.floor(rand() * 2);
        for (let k = 0; k < n; k++) {
          const dm = cityDims(), bw = Math.min(dm.w, w / 2 - 1.5), bd = Math.min(dm.d, d / 2 - 1.5);
          const bx = k % 2 ? r.x1 - bw / 2 - 2 : r.x0 + bw / 2 + 2, bz = k < 2 ? r.z0 + bd / 2 + 2 : r.z1 - bd / 2 - 2;
          const H = dm.floors * 2.9, wall = CITY_WALLS[Math.floor(rand() * CITY_WALLS.length)];
          I.add('box', U_BOX, bx, 0, bz, bw, H, bd, 0, 0, wall);
          for (let f = 0; f < dm.floors; f++) I.add('box', U_BOX, bx, f * 2.9 + 1.05, bz, bw + 0.1, 1.0, bd + 0.1, 0, 0, f === 0 ? '#5d5a55' : '#56636f');
          I.add('box', U_BOX, bx, H, bz, bw + 0.3, 0.5, bd + 0.3, 0, 0, lerpHex(wall, '#ffffff', 0.15));
          solid(bx - bw / 2 - 0.2, bx + bw / 2 + 0.2, bz - bd / 2 - 0.2, bz + bd / 2 + 0.2);
          shade(bx + sd.x * H * 0.45, bz + sd.z * H * 0.45, bw * 0.62, bd * 0.62);
        }
        if (rand() < 0.6) tree(mx, mz, 'round', 0.8);
        break;
      }
      default: break;                                                                                 // gramado
    }
  }

  // ---- rede elétrica ao longo da estrada que cruza (postes de madeira e três fios caídos) ----
  const cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2, poleZ = P.J - P.RW / 2 - 1.2, PH = 7.6;
  const poles = [];
  for (let x = cx + 14; x < cx + OUT_R - 30; x += 30) poles.push(x);
  for (let x = cx - 14; x > cx - OUT_R + 30; x -= 30) poles.unshift(x);
  for (const x of poles) {
    if (Math.abs(x - P.XW) < P.RL / 2 + 1.5 || Math.abs(x - P.XE) < P.RL / 2 + 1.5) continue;     // (não no meio da rua lateral)
    I.add('trunk', U_TRUNK, x, 0, poleZ, 0.17, PH, 0.17, 0, 0, '#6b5038');
    I.add('cbox', U_CBOX, x, PH - 0.4, poleZ, 0.14, 0.14, 2.2, 0, 0, '#5a4430');
    solid(x - 0.25, x + 0.25, poleZ - 0.25, poleZ + 0.25).post = true;
  }
  for (let i = 0; i + 1 < poles.length; i++) {
    const a = poles[i], b = poles[i + 1]; if (b - a > 40) continue;                              // (vão da estrada de acesso: sem fio por cima)
    for (const dz of [-0.95, 0, 0.95]) {                                                       // cada fio: duas metades descendo até o meio do vão
      const y0 = PH - 0.32, sag = 0.9, m = (a + b) / 2, half = (b - a) / 2, L = Math.hypot(half, sag), pitch = Math.atan2(sag, half);
      I.add('wire', U_CBOX, (a + m) / 2, y0 - sag / 2, poleZ + dz, L, 0.04, 0.04, 0, 0, '#2c2c2c', -pitch);
      I.add('wire', U_CBOX, (m + b) / 2, y0 - sag / 2, poleZ + dz, L, 0.04, 0.04, 0, 0, '#2c2c2c', pitch);
    }
  }

  // ---- ponto de ônibus no cruzamento com a estrada de acesso ----
  {
    const bx = ENTRANCE.x1 + 4.2, bz = P.J - P.RW / 2 - 3.0, sg = new THREE.Group();
    sg.position.set(bx, 0, bz);
    sg.add(at(box(3.8, 0.14, 1.7, '#3d6b8c'), 0, 2.45, 0));
    for (const px of [-1.75, 1.75]) sg.add(at(box(0.12, 2.4, 0.12, '#565c63'), px, 1.2, -0.7));
    sg.add(at(box(3.5, 1.7, 0.06, '#cfe2ea'), 0, 1.45, -0.72));
    sg.add(at(box(2.6, 0.1, 0.5, '#8a5a36'), 0, 0.55, -0.45));
    for (const px of [-1.1, 1.1]) sg.add(at(box(0.1, 0.5, 0.1, '#565c63'), px, 0.27, -0.45));
    sg.add(at(box(0.1, 2.8, 0.1, '#565c63'), 2.4, 1.4, 0.5));
    const tex = textTexture('ÔNIBUS', { width: 256, height: 96, bg: '#2f6db0', fg: '#ffffff', font: 'bold 54px "Trebuchet MS", sans-serif' });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
    pl.position.set(2.4, 2.65, 0.56); sg.add(pl);
    g.add(sg);
    solid(bx - 2, bx + 2.6, bz - 1, bz + 0.9);
    P.reserved.push({ x0: bx - 3, x1: bx + 3.6, z0: bz - 2, z1: bz + 2 });
  }

  // ---- placa de saída na estrada (de quem sai do bairro) ----
  if (city) {
    const bx = ENTRANCE.x0 - 30, bz = P.J + P.RW / 2 + 12, sg = new THREE.Group();
    sg.position.set(bx, 0, bz); sg.rotation.y = 0.35;
    for (const px of [-3, 3]) sg.add(at(box(0.3, 5.2, 0.3, '#4a4f56'), px, 2.6, -0.2));
    sg.add(at(box(8.4, 3.4, 0.2, '#f4f1ea'), 0, 5.6, 0));
    const c = document.createElement('canvas'); c.width = 512; c.height = 208;
    const x2 = c.getContext('2d'); x2.fillStyle = '#ff7a1a'; x2.fillRect(0, 0, 512, 208);
    x2.fillStyle = '#fff3d6'; x2.font = 'bold 92px "Trebuchet MS", sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText('ADRESS', 256, 82);
    x2.font = 'bold 34px "Trebuchet MS", sans-serif'; x2.fillText('entregas na cidade toda', 256, 160);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.25), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
    pl.position.set(0, 5.6, 0.11); sg.add(pl);
    g.add(sg);
    solid(bx - 3.6, bx + 3.6, bz - 1.6, bz + 1.6);
    P.reserved.push({ x0: bx - 5, x1: bx + 5, z0: bz - 3, z1: bz + 3 });
  }

  // ---- perto da sebe: árvores e arbustos em grupos (moldura do bairro) ----
  const M = MAP, edge = (x, z) => Math.hypot(Math.max(-x, 0, x - M), Math.max(-z, 0, z - M));
  const placed = [];
  const okNear = (x, z, r) => {
    if (x > -7 - r && x < M + 7 + r && z > -7 - r && z < M + 9 + r) return false;
    if (z > M && z < M + 9 + r) return false;                                                  // ao sul: não cobre a sebe vista pela câmera
    if (Math.abs(x - cx) < 20 + r && z < 0) return false;                                      // estrada de acesso livre
    if (P.reserved.slice(2).some(q => x + r > q.x0 && x - r < q.x1 && z + r > q.z0 && z - r < q.z1)) return false;
    if (P.cells.some(q => q.type !== 'meadow' && x + r > q.x0 && x - r < q.x1 && z + r > q.z0 && z - r < q.z1)) return false;
    return placed.every(([px, pz, pr]) => Math.hypot(px - x, pz - z) > pr + r + 0.6);
  };
  let groups = 0;
  for (let tries = 0; groups < 26 && tries < 4000; tries++) {
    const x = -60 + rand() * (M + 120), z = -60 + rand() * (M + 120), e = edge(x, z);
    if (e < 9 || e > 40) continue;
    const n = 2 + Math.floor(rand() * 5), main = treeType();
    let any = false;
    for (let k = 0; k < n; k++) {
      const tx = x + (rand() - 0.5) * 11, tz = z + (rand() - 0.5) * 11, type = k === n - 1 && rand() < 0.6 ? 'bush' : rand() < 0.65 ? main : treeType();
      const s = type === 'bush' ? 0.7 + rand() * 0.5 : 0.8 + rand() * 0.6, r = type === 'bush' ? 1.2 * s : 2.2 * s;
      if (!okNear(tx, tz, r)) continue;
      placed.push([tx, tz, r]); const n0 = solids.length; tree(tx, tz, type, s); any = true;
      near.push(...solids.splice(n0));                                                         // (estas ficam sempre em SOLIDS, como as árvores de antes)
      if (type === 'bush' && rand() < 0.5) {                                                   // florzinhas no arbusto
        const fc = FLOWERS[Math.floor(rand() * FLOWERS.length)];
        for (let q = 0; q < 4; q++) { const a = q * 1.7 + rand(); I.add('cbox', U_CBOX, tx + Math.cos(a) * 0.8 * s, 0.9 * s, tz + Math.sin(a) * 0.75 * s, 0.22, 0.22, 0.22, 0, a, fc); }
      }
    }
    if (any) groups++;
  }
  // flores do campo e moitas soltas (sem colisão) nos gramados perto da sebe
  for (let k = 0; k < 140; k++) {
    const x = -50 + rand() * (M + 100), z = -50 + rand() * (M + 100), e = edge(x, z);
    if (e < 4 || e > 46 || !okNear(x, z, 0.6)) continue;
    if (rand() < 0.5) I.add('ico', U_ICO, x, 0.12, z, 0.55, 0.32, 0.5, 0, rand() * 3, lerpHex(PAL.leaves[k % PAL.leaves.length], '#ffffff', 0.08));
    else I.add('cbox', U_CBOX, x, 0.18, z, 0.18, 0.18, 0.18, 0, rand() * 3, FLOWERS[k % FLOWERS.length]);
  }

  // ---- vida: um cata-vento de sítio girando e um bando de pássaros dando voltas (Bairros 1 a 5) ----
  const updaters = [];
  if (!city) {
    const spot = P.cells.find(c => c.type === 'pasture' || c.type === 'crop' || c.type === 'meadow' || c.type === 'grove');
    if (spot && P.kind !== 'town') {
      const wx = spot.x0 + 3, wz = spot.z0 + 3, mill = new THREE.Group();
      mill.position.set(wx, 0, wz);
      const legs = new THREE.Group();
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) legs.add(at(box(0.12, 9.6, 0.12, '#8b8f94'), sx * 0.75, 4.6, sz * 0.75, sz * 0.075, 0, -sx * 0.075));
      for (const y of [2.5, 5, 7.4]) legs.add(at(box(1.3 - y * 0.08, 0.08, 1.3 - y * 0.08, '#8b8f94'), 0, y, 0));
      mill.add(legs);
      mill.add(at(box(0.9, 0.4, 0.5, '#7d8187'), 0, 9.5, 0));
      mill.add(at(box(0.08, 0.7, 1.7, '#c9cbcc'), 0, 9.6, -1.4));                  // leme
      const fan = dynamic(new THREE.Group()), blades = new THREE.Group(); fan.position.set(0, 9.55, 0.4);
      for (let k = 0; k < 12; k++) { const arm = new THREE.Group(); arm.rotation.z = k / 12 * Math.PI * 2; arm.add(at(box(0.3, 1.5, 0.04, '#d9dbdc'), 0, 0.9, 0, 0, 0.35, 0)); blades.add(arm); }
      blades.add(at(cyl(0.2, 0.2, 0.25, '#7d8187', 8), 0, 0, 0, Math.PI / 2, 0, 0));
      bakeStatic(blades); fan.add(blades);
      mill.add(fan); mill.rotation.y = 0.6;
      bakeStatic(mill);                                                             // torre fundida (a hélice gira à parte)
      live.add(mill);
      solid(wx - 1.2, wx + 1.2, wz - 1.2, wz + 1.2);
      P.reserved.push({ x0: wx - 3, x1: wx + 3, z0: wz - 3, z1: wz + 3 });
      updaters.push((t, dt) => { fan.rotation.z -= dt * (2.2 + Math.sin(t * 0.13) * 0.9); });
    }
    // bando de pássaros dando voltas lá no alto (asas e corpos instanciados: 2 desenhos por quadro)
    const N = 7, wingG = new THREE.BoxGeometry(0.9, 0.05, 0.3).translate(0.45, 0, 0), bodyG = new THREE.BoxGeometry(0.22, 0.14, 0.6);   // (frente = +z local)
    const birdM = new THREE.MeshStandardMaterial({ color: '#3b3a3e', roughness: 0.9, flatShading: true });
    const wings = dynamic(new THREE.InstancedMesh(wingG, birdM, N * 2)), bodies = dynamic(new THREE.InstancedMesh(bodyG, birdM, N));
    wings.frustumCulled = bodies.frustumCulled = false;
    const fx = M / 2 + (rand() < 0.5 ? -1 : 1) * (M / 2 + 70), fz = M * 0.3, birds = [];
    for (let k = 0; k < N; k++) birds.push({ ph: k * 0.9 + rand() * 0.5, rad: 26 + rand() * 16, y: 21 + rand() * 7, sp: 0.15 + rand() * 0.06, fl: 7 + rand() * 3 });
    live.add(wings, bodies);
    const ob = new THREE.Object3D(), ow = new THREE.Object3D();
    updaters.push(t => {
      birds.forEach((b2, i) => {
        const a = t * b2.sp + b2.ph, glide = Math.sin(t * 0.5 + b2.ph) > 0.3;   // às vezes plana, às vezes bate as asas
        ob.position.set(fx + Math.cos(a) * b2.rad, b2.y + Math.sin(t * 0.7 + b2.ph) * 1.2, fz + Math.sin(a) * b2.rad);
        ob.rotation.set(0, -a, Math.sin(t * 0.9 + b2.ph) * 0.25); ob.updateMatrix(); bodies.setMatrixAt(i, ob.matrix);
        const f = glide ? 0.12 : Math.sin(t * b2.fl + b2.ph * 3) * 0.6;
        for (const sg of [1, -1]) {
          ow.position.copy(ob.position); ow.rotation.copy(ob.rotation); if (sg < 0) ow.rotateY(Math.PI); ow.rotateZ(f);
          ow.updateMatrix(); wings.setMatrixAt(i * 2 + (sg > 0 ? 0 : 1), ow.matrix);
        }
      });
      wings.instanceMatrix.needsUpdate = true; bodies.instanceMatrix.needsUpdate = true;
    });
  }

  I.build(g);
  live.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, fields, live, solids: near, farSolids: solids, update: (t, dt) => { for (const u of updaters) u(t, dt); } };
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
    g.add(at(cyl(2.25, 2.25, 0.06, '#5a3c22', 14), qx, 0.6, qz));              // terra
    for (let k = 0; k < 7; k++) {                                              // folhagem baixa em volta
      const a = k / 7 * Math.PI * 2 + sx; const m = at(mesh(new THREE.IcosahedronGeometry(0.62, 0), '#4f9a45'), qx + Math.cos(a) * 1.55, 0.78, qz + Math.sin(a) * 1.55, a, a * 2, 0);
      m.scale.set(1.1, 0.6, 1.0); g.add(m);
    }
    for (let k = 0; k < 22; k++) {                                             // flores pequenas por cima, em manchas de cor
      const a = k * 2.399 + sz, r = 0.4 + (k % 5) * 0.38;
      g.add(at(sphere(0.17, FLOWERS[Math.floor(k / 6 + (sx > 0 ? 1 : 0)) % 4], 6, 4), qx + Math.cos(a) * r, 0.98 + (k % 3) * 0.06, qz + Math.sin(a) * r));
    }
    g.add(at(cone(0.35, 1.3, '#3f8f3a', 7), qx, 1.25, qz));                    // arbustinho no meio
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
  // trilha de terra que o pessoal abriu cortando o gramado (praça usada: atalho da esquina até o coreto). Passa entre as
  // duas árvores do canto e contorna o canteiro pelo lado de fora (antes cortava o canteiro ao meio, em linha reta).
  {
    const pts = [[3.2, 3.0], [5.0, 5.4], [6.2, 9.0], [7.4, 12.6], [10.0, 15.0], [12.8, 16.0], [14.4, 16.4]].map(([a, b]) => [cx + w / 2 - a, cz + d / 2 - b]);
    for (let i = 0, k = 0; i + 1 < pts.length; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.max(1, Math.round(L / 1.3));
      for (let j = 0; j < n; j++, k++) {
        const t = j / n, j2 = Math.sin(k * 1.7) * 0.2;
        const m = at(cyl(1.0, 1.0, 0.02, '#c4b48f', 9), x0 + dx * t - dz / L * j2, 0.205, z0 + dz * t + dx / L * j2);
        m.scale.set(1.25, 1, 0.8); m.rotation.y = Math.atan2(-dz, dx); g.add(m);
      }
    }
  }
  // lixeiras junto aos bancos
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = cx + sx * 11.6, z = cz + sz * 2.6;
    g.add(at(cyl(0.3, 0.26, 0.8, '#3c7d4a', 10), x, 0.62, z)); g.add(at(cyl(0.33, 0.33, 0.08, '#2c5c38', 10), x, 1.04, z));
  }
  // carrinho de pipoca no caminho do sul
  {
    const px = cx + 1.0, pz = cz + 10.5, k = new THREE.Group(); k.position.set(px, 0.22, pz); k.rotation.y = 0.3;
    k.add(at(box(1.3, 0.75, 0.8, '#d8312a'), 0, 0.75, 0)); k.add(at(box(1.34, 0.12, 0.84, '#f4f1ea'), 0, 1.16, 0));
    k.add(at(box(1.1, 0.7, 0.62, '#fff6d8', { emissive: '#5a4a20', emissiveIntensity: 0.4 }), 0, 1.57, 0));   // vitrine de pipoca
    for (let q = 0; q < 12; q++) k.add(at(sphere(0.09, '#fffbe8', 5, 3), -0.4 + (q % 4) * 0.27, 1.32 + Math.floor(q / 4) * 0.1, -0.15 + (q % 3) * 0.15));
    k.add(at(box(1.2, 0.06, 0.7, '#d8312a'), 0, 1.95, 0));
    k.add(at(cyl(0.03, 0.03, 1.0, '#5a5f66', 6), 0, 2.45, 0)); k.add(at(cone(1.0, 0.45, '#f4f1ea', 8), 0, 3.05, 0)); k.add(at(cone(1.02, 0.12, '#d8312a', 8), 0, 2.86, 0));
    for (const s of [-1, 1]) k.add(at(cyl(0.3, 0.3, 0.08, '#2a2a2a', 12), s * 0.5, 0.3, 0.42, Math.PI / 2, 0, 0));
    k.add(at(box(0.06, 0.06, 0.9, '#5a5f66'), -0.75, 0.95, -0.2, 0, 0, 0.2));
    const pt = textTexture('PIPOCA', { width: 256, height: 80, bg: '#f4f1ea', fg: '#d8312a', font: 'bold 56px "Trebuchet MS", sans-serif' });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.3), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8 })); pl.position.set(0, 0.8, 0.41); k.add(pl);
    g.add(k);
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

// ---------- Vida na praça (Bairro 2) ----------
// Gente de verdade usando a praça: um casal de idosos num banco (ele lê o jornal, ela olha o movimento), uma senhora
// dando milho aos pombos (que bicam, dão pulinhos e se assustam de vez em quando), o pipoqueiro ao lado do carrinho e
// alguém passeando com o cachorro em volta do coreto. Cada pessoa: 1 malha fundida + cabeça (e pernas, se anda);
// pombos instanciados. Ciclos e fases diferentes para ninguém se mexer em sincronia.
const SKINS = ['#e8b98f', '#c98a62', '#8a5a3c', '#f1c9a5'];
const scaled = (m, x, y, z) => { m.scale.set(x, y, z); return m; };
function personParts(o) {
  const b = new THREE.Group(), seat = o.seated;
  const SH = o.shirt, PA = o.pants, SK = o.skin, SHOE = o.shoes || '#3a2a20';
  if (seat) {
    for (const sx of [-1, 1]) {
      b.add(at(box(0.2, 0.18, 0.5, PA), sx * 0.12, 0.06, 0.2));             // coxas
      b.add(at(box(0.18, 0.7, 0.19, PA), sx * 0.12, -0.31, 0.44));           // canelas (até o gramado: o assento do banco fica 0,78 acima)
      b.add(at(box(0.2, 0.12, 0.3, SHOE), sx * 0.12, -0.72, 0.52));
    }
  } else {
    for (const sx of [-1, 1]) b.add(at(box(0.24, 0.12, 0.32, SHOE), sx * 0.13, 0.06, 0.05));
  }
  const ty = seat ? 0.38 : 1.18;
  b.add(at(box(0.5, 0.64, 0.3, SH), 0, ty, -0.02));
  if (o.skirt) b.add(at(box(0.54, 0.22, seat ? 0.56 : 0.34, o.skirt), 0, seat ? 0.08 : 0.82, seat ? 0.16 : 0));
  b.add(at(box(0.16, 0.1, 0.16, SK), 0, ty + 0.37, 0));
  const arms = o.arms || 'down';
  for (const sx of [-1, 1]) {
    if (arms === 'lap') { b.add(at(box(0.13, 0.42, 0.15, SH), sx * 0.31, ty + 0.06, 0.02)); b.add(at(box(0.12, 0.12, 0.36, SH), sx * 0.27, ty - 0.18, 0.18)); b.add(at(sphere(0.07, SK, 6, 4), sx * 0.24, ty - 0.18, 0.38)); }
    else if (arms === 'paper') { b.add(at(box(0.13, 0.4, 0.15, SH), sx * 0.31, ty + 0.06, 0.04)); b.add(at(box(0.12, 0.12, 0.34, SH), sx * 0.28, ty - 0.12, 0.2, -0.5, 0, 0)); }
    else b.add(at(box(0.13, 0.6, 0.15, SH), sx * 0.33, ty - 0.02, 0, 0, 0, sx * 0.07));
  }
  if (arms === 'paper') { b.add(at(box(0.66, 0.46, 0.03, '#f2efe6'), 0, ty + 0.02, 0.42, -0.35, 0, 0)); for (let k = 0; k < 3; k++) b.add(at(box(0.5, 0.03, 0.035, '#9a9a9a'), 0, ty + 0.12 - k * 0.09, 0.43 - k * 0.03, -0.35, 0, 0)); }
  if (o.bag) b.add(at(box(0.22, 0.26, 0.16, '#d9c09a'), 0.12, ty - 0.12, 0.34));
  if (o.apron) b.add(at(box(0.44, 0.6, 0.04, o.apron), 0, ty - 0.08, 0.15));
  const h = new THREE.Group();
  h.add(at(sphere(0.19, SK, 10, 8), 0, 0, 0));
  h.add(scaled(at(sphere(0.2, o.hair, 10, 6), 0, 0.06, -0.03), 1, 0.85, 1));
  if (o.bun) h.add(at(sphere(0.09, o.hair, 6, 4), 0, 0.12, -0.18));
  if (o.cap) { h.add(at(cyl(0.2, 0.21, 0.1, o.cap, 12), 0, 0.14, 0)); h.add(at(box(0.24, 0.03, 0.2, o.cap), 0, 0.1, 0.17)); }
  if (o.glasses) h.add(at(box(0.3, 0.05, 0.03, '#2a2522'), 0, 0.02, 0.18));
  for (const sx of [-1, 1]) h.add(at(sphere(0.028, '#2a2522', 5, 3), sx * 0.07, 0.02, 0.18));
  const root = new THREE.Group(), head = vcMerge(h);
  root.add(vcMerge(b)); head.position.set(0, ty + 0.57, 0); root.add(head);
  root.userData.head = head;
  if (!seat) {                                                     // pernas separadas (para andar)
    const legs = [];
    for (const sx of [-1, 1]) {
      const lg = new THREE.Group(); lg.add(at(box(0.2, 0.78, 0.22, PA), 0, -0.39, 0));
      const m = vcMerge(lg), pv = new THREE.Group(); pv.position.set(sx * 0.13, 0.86, 0); pv.add(m); root.add(pv); legs.push(pv);
    }
    root.userData.legs = legs;
  }
  root.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = false; } });
  return root;
}
function buildDog() {
  const g = new THREE.Group(), C = '#c8925a', D = '#8a5a36';
  g.add(at(box(0.3, 0.3, 0.66, C), 0, 0.42, 0));
  g.add(at(box(0.26, 0.26, 0.3, C), 0, 0.62, 0.42)); g.add(at(box(0.16, 0.14, 0.16, '#e6c9a0'), 0, 0.56, 0.62)); g.add(at(box(0.06, 0.06, 0.04, '#1c1c1c'), 0, 0.6, 0.71));
  for (const sx of [-1, 1]) g.add(at(box(0.08, 0.16, 0.1, D), sx * 0.13, 0.74, 0.36));
  for (const [x, z] of [[-0.1, 0.24], [0.1, 0.24], [-0.1, -0.24], [0.1, -0.24]]) g.add(at(box(0.08, 0.3, 0.08, C), x, 0.15, z));
  g.add(at(box(0.06, 0.06, 0.26, D), 0, 0.56, -0.42, 0.7, 0, 0));
  const m = vcMerge(g); m.castShadow = true; m.receiveShadow = false; return m;
}
function buildPlazaLife() {
  const P = PLAZA, cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, d = P.z1 - P.z0;
  const group = dynamic(new THREE.Group()); group.name = 'plaza-life';
  const ups = [];
  const SEAT_Y = 0.98;
  // casal de idosos no banco do nordeste (de frente para o sul): ele lê o jornal, ela olha em volta
  const bx = cx + 9.5, bz = cz - 2.6;
  const old1 = personParts({ seated: true, shirt: '#7a8a9a', pants: '#4a4a52', skin: SKINS[0], hair: '#d8d8d8', arms: 'paper', glasses: true });
  const old2 = personParts({ seated: true, shirt: '#b5657a', pants: '#5a4a5a', skin: SKINS[3], hair: '#e2e2e2', arms: 'lap', skirt: '#5a4a5a', bun: true, bag: true });
  old1.position.set(bx - 0.7, SEAT_Y, bz + 0.05); old2.position.set(bx + 0.75, SEAT_Y, bz + 0.05);
  group.add(old1, old2);
  ups.push(t => { old1.userData.head.rotation.x = 0.35 + Math.sin(t * 0.4) * 0.04; old1.userData.head.rotation.y = Math.sin(t * 0.13) * 0.12;
    const look = Math.sin(t * 0.21 + 1.3); old2.userData.head.rotation.y = look > 0.6 ? -0.9 : look < -0.7 ? 0.7 : look * 0.3; old2.userData.head.rotation.x = 0.05; });
  // senhora dando milho aos pombos no banco do sudoeste (de frente para o norte)
  const fx = cx - 9.5, fz = cz + 2.6;
  const feeder = personParts({ seated: true, shirt: '#5a8a6a', pants: '#3a3d44', skin: SKINS[1], hair: '#3a2a20', arms: 'lap', bag: true, skirt: '#8a6a4a' });
  feeder.position.set(fx + 0.2, SEAT_Y, fz - 0.05); feeder.rotation.y = Math.PI;
  group.add(feeder);
  // pombos (instanciados): bicam, andam um pouquinho e, às vezes, se assustam e voltam
  const pg = new THREE.Group();
  pg.add(scaled(at(sphere(0.13, '#8d939c', 7, 5), 0, 0.14, 0), 1, 0.8, 1.45));
  pg.add(at(sphere(0.075, '#5f6673', 6, 4), 0, 0.27, 0.15)); pg.add(at(cone(0.025, 0.06, '#d9a06a', 5), 0, 0.26, 0.23, Math.PI / 2, 0, 0));
  pg.add(at(box(0.12, 0.03, 0.14, '#5f6673'), 0, 0.15, -0.2, 0.3, 0, 0));
  const pgGeo = vcMerge(pg).geometry, NP = 9;
  const pigeons = dynamic(new THREE.InstancedMesh(pgGeo, mat('#ffffff', { vertexColors: true }), NP));
  pigeons.castShadow = true; pigeons.frustumCulled = false; group.add(pigeons);
  const birds = []; for (let i = 0; i < NP; i++) birds.push({ x: fx - 1.4 + (i % 5) * 0.7 + Math.sin(i * 3.1) * 0.2, z: fz - 1.1 - Math.floor(i / 5) * 0.55 + Math.cos(i * 2.3) * 0.15, a: i * 1.9, ph: i * 0.77, sp: 0.8 + (i % 3) * 0.25 });
  const po = new THREE.Object3D();
  ups.push(t => {
    const scare = Math.max(0, Math.sin(t * 0.09) - 0.93) * 14;     // de vez em quando todos levantam voo baixo e voltam
    feeder.userData.head.rotation.x = 0.3 + Math.sin(t * 0.7) * 0.05; feeder.userData.head.rotation.y = Math.sin(t * 0.33) * 0.35;
    birds.forEach((b2, i) => {
      const peck = Math.max(0, Math.sin(t * (3.1 + b2.sp) + b2.ph)) ** 6;
      const wander = Math.sin(t * 0.3 * b2.sp + b2.ph) * 0.25;
      po.position.set(b2.x + wander, 0.22 + scare * (0.6 + (i % 3) * 0.3), b2.z + Math.cos(t * 0.25 * b2.sp + b2.ph) * 0.18);
      po.rotation.set(peck * 0.7, b2.a + Math.sin(t * 0.5 + b2.ph) * 0.8, 0);
      po.updateMatrix(); pigeons.setMatrixAt(i, po.matrix);
    });
    pigeons.instanceMatrix.needsUpdate = true;
  });
  // pipoqueiro ao lado do carrinho (de avental, olhando o movimento)
  const vendor = personParts({ seated: false, shirt: '#f4f1ea', pants: '#3a3d44', skin: SKINS[2], hair: '#1e1a18', apron: '#d8312a', cap: '#d8312a' });
  vendor.position.set(cx - 0.2, 0.22, cz + 11.6); vendor.rotation.y = 0.5;
  group.add(vendor);
  ups.push(t => { vendor.userData.head.rotation.y = Math.sin(t * 0.27 + 2) * 0.6; vendor.rotation.y = 0.5 + Math.sin(t * 0.05) * 0.4; });
  // alguém passeando com o cachorro em volta do coreto (anda, para para o cachorro cheirar, segue)
  const walker = personParts({ seated: false, shirt: '#e0a33a', pants: '#2f4a6e', skin: SKINS[3], hair: '#6a4a2a', cap: '#2f4a6e' });
  const dog = buildDog();
  group.add(walker, dog);
  const R = 6.2; let s = 0, pause = 0;
  const lerpA = (a, b, k) => { let dd = b - a; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI; return a + dd * k; };
  let face = 0, dogFace = 0, last = 0;
  ups.push(t => {
    const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
    const cyc = (t % 26);
    pause = cyc > 18 && cyc < 21.5 ? 1 : 0;                         // o cachorro parou para cheirar o canteiro
    const v = pause ? 0 : 0.85;
    s += v * dt / R;
    const a = s, x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
    walker.position.set(x, 0.22, z);
    face = lerpA(face, Math.atan2(-Math.sin(a), Math.cos(a)), Math.min(1, dt * 4));
    walker.rotation.y = face;
    const ph = t * 5.2, sw = v ? Math.sin(ph) * 0.45 : 0;
    walker.userData.legs[0].rotation.x = sw; walker.userData.legs[1].rotation.x = -sw;
    walker.position.y = 0.22 + (v ? Math.abs(Math.cos(ph)) * 0.03 : 0);
    walker.userData.head.rotation.y = pause ? -0.5 : Math.sin(t * 0.4) * 0.2;
    const da = a + 0.42 + (pause ? 0.05 : 0), dr = R + (pause ? 1.1 : 0.4);
    dog.position.set(cx + Math.cos(da) * dr, 0.22 + (v ? Math.abs(Math.sin(t * 9)) * 0.05 : 0), cz + Math.sin(da) * dr);
    dogFace = lerpA(dogFace, pause ? Math.atan2(-Math.sin(da), Math.cos(da)) + 1.2 : Math.atan2(-Math.sin(da), Math.cos(da)), Math.min(1, dt * 5));
    dog.rotation.y = dogFace;
    dog.rotation.x = pause ? 0.25 : 0;
  });
  void d;
  return { group, update: t => { for (const u of ups) u(t); } };
}

/** Obstáculos de quem anda a pé dentro da praça (a van já é barrada pela praça inteira): coreto, árvores, canteiros, bancos, postes, cerquinha. */
export function plazaFootSolids() {
  const P = PLAZA; if (!P) return [];
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, w = P.x1 - P.x0, d = P.z1 - P.z0, out = [];
  const circ = (x, z, r) => out.push({ x0: x - r, x1: x + r, z0: z - r, z1: z + r, r, cx: x, cz: z });
  const rect = (x0, x1, z0, z1) => out.push({ x0, x1, z0, z1 });
  circ(cx, cz, 4.9);                                                           // coreto (base e colunas)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const qx = cx + sx * w / 4, qz = cz + sz * d / 4;
    circ(qx, qz, 2.6);                                                         // canteiro
    for (const [tx, tz] of [[sx * 7.5, sz * 3.5], [sx * 3.5, sz * 7.5]]) circ(qx + tx, qz + tz, 0.45);   // troncos
    const bx = cx + sx * 9.5, bz = cz + sz * 2.6;
    rect(bx - 1.6, bx + 1.6, bz - 0.55, bz + 0.55);                            // banco (assento + encosto)
    circ(cx + sx * 2.4, cz + sz * (d / 2 - 2.2), 0.15);                        // poste
    const len = w / 2 - 3.2, fx = cx + sx * (1.6 + len / 2 + 0.2), fz = cz + sz * (d / 2 - 1.0);
    rect(fx - len / 2, fx + len / 2, fz - 0.08, fz + 0.08);                    // cerquinha (aberta nos caminhos)
    const gx = cx + sx * (w / 2 - 1.0), gz = cz + sz * (1.6 + len / 2 + 0.2);
    rect(gx - 0.08, gx + 0.08, gz - len / 2, gz + len / 2);
    circ(cx + sx * 11.6, cz + sz * 2.6, 0.32);                                 // lixeira
  }
  circ(cx + 1.0, cz + 10.5, 1.0);                                              // carrinho de pipoca
  circ(cx - 0.2, cz + 11.6, 0.3);                                              // pipoqueiro
  return out;
}

// ---------- API ----------
export function createWorld({ renderer, buildLot, buildResident, yardBuilders, pool = [...Array(16).keys()], dry = false, venice = false, snow = false, moon = false, farm = false }) {
  const pal = venice ? LAGOON : moon ? MOON_GROUND : snow ? SNOW_GROUND : dry ? DRY_GRASS : GREEN_GRASS;
  GRASS = pal.grass; GRASS_PATCHES = pal.patches; GRASS_SHADOW = pal.shadow;
  if (renderer) {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(moon ? '#05070d' : SKY);   // Órbita: céu escuro
  // névoa leve na cor do céu: o horizonte fica suave na câmera atrás da van (main.js a afasta na visão geral)
  scene.fog = new THREE.Fog(moon ? '#05070d' : SKY, 3000, 3200);
  const lights = buildLights(scene);
  scene.add(buildSun());
  // Órbita: tudo da lua fica num grupo cuja matriz (esfera → mundo) o jogo refaz a cada quadro (moonFrame.js)
  const moonRoot = moon ? new THREE.Group() : null;
  if (moonRoot) { moonRoot.name = 'moon-root'; moonRoot.matrixAutoUpdate = false; scene.add(moonRoot); }
  const home = moonRoot || scene;

  const solidsStart = SOLIDS.length;          // os troncos das árvores de fora entram em SOLIDS aqui
  const sk = surroundKind({ venice, moon, farm, snow, dry });              // bairros comuns/urbanos: arredores com relação ao lugar
  const SP = sk ? planSurroundings(sk, dry) : null;
  const ground = moon ? new THREE.Group() : buildGround(venice, SP);
  const sur = SP ? buildSurroundings(SP, dry) : null;
  if (sur) SOLIDS.push(...sur.solids);
  const outskirts = moon || farm || sur ? new THREE.Group() : buildOutskirts(ground);   // Colheita: em volta são plantações (farmOutside.js)
  if (venice || moon || farm) SOLIDS.length = solidsStart;              // Veneza: sem árvores de fora (laguna)
  const extraSolids = SOLIDS.slice(solidsStart);
  scene.add(baked(ground, false, true));
  // A grama de fora do bairro não recebe sombras (nada relevante projeta nela; as árvores de fora usam sombras
  // falsas): economiza o filtro de sombra em boa parte da tela — ~15% do tempo de GPU na UHD integrada.
  const outside = new Set([GRASS, ...GRASS_PATCHES, GRASS_SHADOW].map(c => mat(c)));
  ground.traverse(o => { if (o.isMesh && outside.has(o.material)) o.receiveShadow = false; });
  if (!venice && !moon) { if (!MEDV && !(FORESTV && FORESTV.modern) && !GARDV) scene.add(baked(buildHedge(), true, true)); scene.add(baked(outskirts, false, false)); }
  if (sur) { scene.add(baked(sur.group, false, false), baked(sur.fields, false, false), sur.live); }   // Medieval: no lugar da sebe, a muralha (terrain.js); Modernista: o muro do condomínio (models/modern.js); Jardins: o muro com a portaria (models/garden.js)   // Veneza: só laguna em volta
  if (PLAZA) scene.add(baked(buildPlaza(), true, true));
  const plife = PLAZA ? buildPlazaLife() : null;                          // Bairro 2: gente usando a praça
  if (plife) scene.add(plife.group);
  if (MOONV) {                                  // Órbita: a esfera (só recebe sombra) e o cenário fundido
    const ms = buildMoonScene(new THREE.Group(), MOONV), gr = ms.getObjectByName('moon-ground');
    const fl = ms.getObjectByName('moon-flat');
    ms.remove(gr); home.add(gr); ms.remove(fl); home.add(baked(fl, false, true));
    home.add(baked(ms, true, true));
  } else if (TERRAIN.kind !== 'flat' || CANAL || RAIL || VENICE || FLUX || FARMLAND || SNOWV || GARDV || FORESTV || MEDV) scene.add(baked(buildTerrain(), true, true));   // Bairros 9, 10 e 11

  // os 16 lotes, construídos uma única vez (cada casa mantém sua identidade; só muda de lugar)
  // (só as casas deste bairro: `pool`; o array é indexado pelo índice da casa)
  const lots = [];
  for (const h of pool) {
    const lot = buildLot(HOUSES[h], { yardBuilders });
    lot.name = 'lot:' + h;
    home.add(lot);
    lots[h] = lot;
  }

  // Otimização para GPU integrada: as partes estáticas já "assadas" de cada lote (bakeStatic) são fundidas
  // em UM mesh por material para o bairro inteiro a cada setLayout (16 lotes × N materiais → N draw calls).
  // As partes animadas (dynamic) continuam dentro dos grupos dos lotes.
  const neighborhood = new THREE.Group();
  neighborhood.name = 'neighborhood';
  home.add(neighborhood);
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
    const keep = moonRoot && moonRoot.matrix.clone();     // Órbita: funde no referencial da lua (sem a rotação do quadro)
    if (moonRoot) { moonRoot.matrix.identity(); moonRoot.updateMatrixWorld(true); }
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
    if (moonRoot) { moonRoot.matrix.copy(keep); moonRoot.updateMatrixWorld(true); }
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
      const o = slotOrigin(s), lot = lots[layout[s]];
      if (MOONV) {                                  // Órbita: módulo na esfera, de frente para a rua do laço
        const sp = SPOTS.spots[s]; FRAME.pose(lot, sp.n, sp.f, 0); lot.userData.res = { n: sp.resN, f: sp.f };
        continue;
      }
      if (SPOTS) {                                  // Morro/Colheita: construção no ponto, virada para a rua, o beco ou a estrada
        const sp = SPOTS.spots[s], ry = Math.atan2(sp.fx, sp.fz);
        lot.position.set(sp.px ?? sp.cx, sp.y, sp.pz ?? sp.cz); lot.rotation.y = ry;
        lot.userData.res = sp.res || { x: sp.cx + sp.fx * 4.4, z: sp.cz + sp.fz * 4.4, ry };
        continue;
      }
      lot.position.set(o.x, slotY(s), o.z);   // Bairro 9: lotes no alto
    }
    mergeLots();
  }

  function showResident(h, mood) {
    let r = residents[h];
    if (!r) {
      r = residents[h] = buildResident(h);
      r.visible = false;
      home.add(r);
    }
    if (current && current !== r) current.visible = false;
    const lot = lots[h];
    // y = 0 do lote: o próprio morador se eleva sobre o caminho de pedras
    const rs = lot.userData.res;                  // Morro: na frente da porta, virado para fora
    if (rs && rs.n) FRAME.pose(r, rs.n, rs.f, 0);   // Órbita: em pé na esfera, virado para a rua
    else if (rs) { r.position.set(rs.x, lot.position.y, rs.z); r.rotation.y = rs.ry; }
    else r.position.set(lot.position.x + LOT_ANCHORS.residentSpot.x, lot.position.y, lot.position.z + LOT_ANCHORS.residentSpot.z);
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

  // colisões dos arredores sob demanda: só as que estão a até ~60 m da van ficam em SOLIDS (no fim da lista)
  // (além da van, segue também o chão sob a câmera que desenha a cena: a pé, longe da van estacionada, as casas e cercas
  // de fora continuam sólidas; a posição vem do onBeforeRender da grama de fora, que está sempre na tela)
  let streamT = 0;
  const STREAM_R = 60, camGround = { x: 0, z: 0, ok: false };
  if (sur) {
    for (const b of sur.farSolids) b.out = true;
    const grassMesh = ground.children.find(o => o.isMesh && o.material === mat(GRASS));
    if (grassMesh) grassMesh.onBeforeRender = (r, sc, cam) => { camGround.x = cam.position.x; camGround.z = cam.position.z; camGround.ok = true; };
  }
  const nearTo = (b, x, z) => { const dx = Math.max(b.x0 - x, 0, x - b.x1), dz = Math.max(b.z0 - z, 0, z - b.z1); return dx * dx + dz * dz < STREAM_R * STREAM_R; };
  function streamSolids(x, z) {
    for (let i = SOLIDS.length - 1; i >= 0; i--) if (SOLIDS[i].out) SOLIDS.splice(i, 1);
    const cam = camGround.ok && Math.hypot(camGround.x - x, camGround.z - z) > 25;
    for (const b of sur.farSolids) if (nearTo(b, x, z) || (cam && nearTo(b, camGround.x, camGround.z))) SOLIDS.push(b);
  }
  let ambT = 0;
  function update(t, dt) {
    ambT += dt || 0;
    if (sur) sur.update(ambT, dt || 0);
    if (plife) plife.update(ambT);
    for (const i of pool) {
      const u = lots[i].userData.update;
      if (u) u(t, dt);
    }
    if (current && current.visible && current.userData.update) current.userData.update(t, dt);
  }

  return {
    scene,
    moonRoot,
    sunLight: lights.sun,
    setLayout,
    showResident,
    hideResident,
    update,
    lotGroup: h => lots[h],
    /** Cobertura do posto: some com a van embaixo (x, z do mundo). Também traz para SOLIDS só as colisões dos
     *  arredores que estão perto da van (as de longe ficam fora da conta de colisão de cada quadro). */
    updateGas(x, z, dt) {
      for (const g of gasModels) if (g.visible) g.userData.updateCanopy(x - g.position.x, z - g.position.z, dt);
      if (sur && (streamT -= dt || 0) <= 0) { streamT = 0.2; streamSolids(x, z); }
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
