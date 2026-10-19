// O mundo: céu, luz com sombras, chão (grama + asfalto + faixas), sebe com a entrada "VILA ADRESS",
// árvores decorativas fora do mapa, os 16 lotes (construídos uma vez e reposicionados a cada rodada)
// e os moradores (criados sob demanda na primeira visita).
import * as THREE from 'three';
import {
  HEDGE, ROAD, LOT, WALK, MAP, GRID, BUILD_H, PLAZA, lotX, lotZ, slotOrigin, slotY, roadCenter, ENTRANCE, LOT_ANCHORS, SOLIDS, TERRAIN, BOUNDS, CANAL, RAIL, VENICE, FAVELA, FLUX, FARMLAND, SPOTS, SNOWV, GARDV, MOONV, FORESTV, MEDV,
} from './layout.js';
import { HOUSES } from './data.js';
import { buildTerrain, waterPlane, quayWall, CANAL_WL } from './terrain.js';
import { buildTram } from './train.js';
import { tickBarriers } from './barriers.js';
import { buildMoonScene } from './models/moon.js';
import { FRAME } from './moonFrame.js';
import { buildGasStation } from './models/gas.js';
import { buildSnowOutskirts } from './models/snow.js';   // Nevasca: arredores próprios do inverno
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mat, mesh, box, cyl, cone, sphere, at, bakeStatic, dynamic, textTexture, vcMerge } from './models/kit.js';
import { buildFigure, figureItem, animatePerson, reach, skinnedFromParts, partMatrix, partGeo } from './models/resident.js';   // gente da praça (Bairro 2)
import { plazaLine } from './plazaTalk.js';

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
  // Cachoeira: o desfiladeiro fica aberto. Travessia (Bairro 11): o canal é rebaixado (água abaixo da rua, muros de pedra) e segue
  // pelos arredores como rio: a faixa dele também fica sem grama e sem asfalto (água e muros: terrain.js e buildCityOuter)
  const CY = CANAL ? (CANAL.canyon ? { X0: CANAL.x0, X1: CANAL.x1, ZN: -320, ZS: MAP + 44 } : { X0: CANAL.x0, X1: CANAL.x1, ZN: -RIVER_FAR, ZS: MAP + RIVER_FAR }) : null;
  // (subdividida: dois triângulos de 4 km, recortados pelo plano próximo da câmera baixa, perdiam precisão de profundidade e a
  // grama "vazava" por cima do asfalto 4 cm acima — as ruas do bairro apareciam verdes na câmera atrás da van)
  if (SP && SP.kind === 'city') {
    // cidade: a grama fica só por dentro das estradas de fora (o parque em volta do bairro); dali para fora o chão é a cidade
    // (buildCityOuter) — sem uma camada de grama inteira por baixo, desenhada à toa em cada pixel
    const R = { x0: SP.XW - SP.RL / 2 - 3, x1: SP.XE + SP.RL / 2 + 3, z0: SP.J - SP.RW / 2 - 3, z1: SP.ZS + SP.RW / 2 + 3 };
    for (const [a, b] of CY ? [[R.x0, CY.X0], [CY.X1, R.x1]] : [[R.x0, R.x1]]) g.add(at(plane(b - a, R.z1 - R.z0, GRASS), (a + b) / 2, -0.04, (R.z0 + R.z1) / 2));
  } else if (!CY) g.add(at(plane(4000, 4000, GRASS, 80), MAP / 2, -0.04, MAP / 2));
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
      if (SP.kind === 'city' && (x < SP.XW + SP.RL / 2 + r || x > SP.XE - SP.RL / 2 - r || z < SP.J + SP.RW / 2 + r || z > SP.ZS - SP.RW / 2 - r)) continue;   // (cidade: só no parque em volta)
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
    if (!SP && SNOWV && SNOWV.outside) {                         // Nevasca: o meio-fio abre no cruzamento com a estrada da serra e na trilha da sebe
      const O = SNOWV.outside, jw = O.ORW / 2 + 0.6, rw = 3.1;
      g.add(slab(x, -OUT, x + 0.3, O.OJ - jw, CURB, 0.12, 0.14), slab(x, O.OJ + jw, x + 0.3, -O.RING - rw, CURB, 0.12, 0.14), slab(x, -O.RING + rw, x + 0.3, 0, CURB, 0.12, 0.14));
    } else if (!SP) g.add(slab(x, -OUT, x + 0.3, 0, CURB, 0.12, 0.14));
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
  if (CY && CY.X0 > ENTRANCE.x1) g.add(slab(ENTRANCE.x1 + 0.3, -1.0, CY.X0, 0.3, GRASS_SHADOW, -0.012, 0.01), slab(CY.X1, -1.0, MAP, 0.3, GRASS_SHADOW, -0.012, 0.01));   // (não passa por cima do canal/abismo)
  else g.add(slab(ENTRANCE.x1 + 0.3, -1.0, MAP, 0.3, GRASS_SHADOW, -0.012, 0.01));

  // faixa de pedestres na entrada
  for (let x = ENTRANCE.x0 + 0.7; x < (MEDV ? -1 : ENTRANCE.x1 - 0.5); x += 0.95) g.add(slab(x, 0.15, x + 0.5, HEDGE - 0.15, ZEBRA, 0.02));

  // bueiros (planos, não são obstáculos)
  const holes = [
    [roadCenter(0) + 1.9, lotZ(1) + 6], [lotX(1) + 5, roadCenter(2) - 1.9], [roadCenter(3) - 1.9, lotZ(2) + 11],
    [lotX(3) + 12, roadCenter(4) + 1.9], [roadCenter(4) + 1.9, lotZ(0) + 9], [lotX(0) + 13, roadCenter(1) + 1.9],
  ];
  for (const [x, z] of SPOTS ? [] : holes) {
    if (CY && x > CY.X0 - 1 && x < CY.X1 + 1) continue;                   // (nada no canal/abismo)
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
  if (CANAL) for (const k of [2, 1]) {                                      // Cachoeira/Travessia: a sebe não atravessa o desfiladeiro nem o canal (no canal, um muro de pedra em arco: terrain.js)
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
function buildOutskirts(ground, snow = false) {
  // Nevasca: os arredores são os do inverno (models/snow.js: trilha em volta da sebe, estrada da serra, sítios, lago congelado,
  // árvores sem folhas e arbustos de neve) — não as árvores verdes e as flores dos outros bairros
  if (snow && SNOWV) { const o = buildSnowOutskirts(MAP); SOLIDS.push(...o.solids); return o.group; }
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
const RIVER_FAR = 900;                                // Travessia: até onde o canal segue como rio pelos arredores
const OUT_R = 215;                                    // até onde vão os arredores (além da borda do bairro; a névoa da câmera de jogo começa a ~130)
const U_BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);           // base em y = 0
const U_CBOX = new THREE.BoxGeometry(1, 1, 1);                                // centrada
const U_GABLE = (() => {                                                      // oitão: triângulo (base 1, altura 1), cumeeira ao longo de X
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]), { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5); g.rotateY(Math.PI / 2); return g;
})();
const U_TRUNK = new THREE.CylinderGeometry(0.7, 1, 1, 6).translate(0, 0.5, 0);
const U_CYL = new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, 0.5, 0);
const U_POLE = new THREE.CylinderGeometry(1, 1, 1, 5).translate(0, 0.5, 0);    // postes (poucas faces: são muitos)
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
    suffix: '',                 // (cidade de longe: setor/faixa, para o recorte da câmera funcionar por pedaço)
    add(key, geo, x, y, z, sx, sy, sz, rx, ry, color, rz = 0) {
      key += this.suffix;
      let s = sets.get(key); if (!s) sets.set(key, s = { geo, list: [] });
      s.list.push([x, y, z, sx, sy, sz, rx, ry, color, rz]);
    },
    build(group, material = OUT_MAT, mats = {}) {
      // quadrantes com poucas instâncias voltam a ser uma malha só (o recorte da câmera não compensa a chamada de desenho a mais)
      const qs = new Map();
      for (const [key, s] of sets) if (key.includes('#q')) { const b = key.split('#')[0]; (qs.get(b) || qs.set(b, []).get(b)).push(key); }
      for (const [b, keys] of qs) {
        if (keys.reduce((n, k) => n + sets.get(k).list.length, 0) >= 400) continue;
        const into = sets.get(b) || { geo: sets.get(keys[0]).geo, list: [] };
        for (const k of keys) { into.list.push(...sets.get(k).list); sets.delete(k); }
        sets.set(b, into);
      }
      for (const [key, s] of sets) {
        const base = key.split('#')[0];
        const im = new THREE.InstancedMesh(s.geo, base === 'shade' ? SHADE_MAT : mats[base] || material, s.list.length);
        s.list.forEach(([x, y, z, sx, sy, sz, rx, ry, c, rz], i) => {
          o.position.set(x, y, z); o.rotation.set(rx, ry, rz, 'YXZ'); o.scale.set(sx, sy, sz); o.updateMatrix();
          im.setMatrixAt(i, o.matrix); if (base !== 'shade') im.setColorAt(i, col.set(c));
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = false; im.receiveShadow = false; im.name = 'arredores:' + key;
        if (base === 'shade') im.renderOrder = -1;
        group.add(dynamic(im));
      }
    },
  };
}
const lerpHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const hitRect = (r, x0, z0, x1, z1) => x1 > r.x0 && x0 < r.x1 && z1 > r.z0 && z0 < r.z1;

/** Iluminação simples dos arredores da cidade: o céu (hemisfério) e o sol da cena, calculados num shader barato (sem as luzes
 *  pontuais nem sombras). No Penumbra há 12 luzes pontuais e os faróis: num material comum, cada pixel da cidade de fora as
 *  calcularia (era a maior parte do custo do quadro). `sync` relê as luzes (o Penumbra as troca ao virar noite). */
function cityLight(lights) {
  const U = { uSky: { value: new THREE.Color() }, uGround: { value: new THREE.Color() }, uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uNight: { value: 0 } };
  const sync = () => {
    const { hemi, sun } = lights;
    U.uSky.value.copy(hemi.color).multiplyScalar(hemi.intensity / Math.PI);
    U.uGround.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity / Math.PI);
    U.uSun.value.copy(sun.color).multiplyScalar(sun.intensity / Math.PI);
    U.uSunDir.value.copy(sun.position).sub(sun.target.position).normalize();
  };
  sync();
  return { U, sync };
}
// Janelas das fachadas (prédios dos arredores, caixas U_BOX instanciadas, base em y = 0): desenhadas pelo shader, numa grade por
// andar (2,9) no espaço da própria instância (colunas inteiras em cada face, térreo com vitrines mais largas, faixa cega no alto).
// De dia, vidro escuro; à noite (uNight = 1), parte das janelas acesa (quente ou fria, sorteada por janela); de longe, a média.
// (tamanho, normal e origem da instância: constantes por face — 'flat', senão a interpolação deixa um resto mínimo que o hash das
// janelas amplifica em chuvisco e listras dentro das janelas acesas)
const FAC_VARY = 'varying vec3 vLoc;\nflat varying vec3 vSz;\nflat varying vec3 vLn;\nflat varying vec3 vOrg;\n';
const FAC_VERT = `
#ifdef USE_INSTANCING
  vSz = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vOrg = instanceMatrix[3].xyz;
#else
  vSz = vec3(1.0); vOrg = vec3(0.0);
#endif
  vLoc = position * vSz; vLn = normal;`;
const FAC_FRAG_DECL = 'float fhash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }\n';
const FAC_FRAG = `
  float fSide = step(abs(vLn.y), 0.5);
  float fAlongX = step(abs(vLn.x), 0.5);
  float fU = mix(vLoc.z, vLoc.x, fAlongX), fW = mix(vSz.z, vSz.x, fAlongX);
  float fCols = max(1.0, floor(fW / 2.6)), fCu = (fU / max(fW, 0.01) + 0.5) * fCols;
  float fV = vLoc.y - 0.35, fCv = fV / 2.9;
  vec2 fF = fract(vec2(fCu, fCv));
  float fGround = 1.0 - step(1.0, fCv);
  float fWin = fSide * step(mix(0.2, 0.07, fGround), fF.x) * step(fF.x, mix(0.8, 0.93, fGround))
    * step(mix(0.3, 0.1, fGround), fF.y) * step(fF.y, 0.8) * step(0.0, fV) * step(vLoc.y, vSz.y - 0.75);
  float fAA = clamp(1.6 - max(fwidth(fCu), fwidth(fCv)) * 2.2, 0.0, 1.0);
  fWin = mix(fSide * 0.3 * step(0.0, fV) * step(vLoc.y, vSz.y - 0.75), fWin, fAA);
  float fRnd = fhash(vec3(floor(fCu), floor(fCv), dot(vOrg, vec3(0.0131, 0.0071, 0.0113)) + vLn.x * 3.0 + vLn.z * 7.0));
  vec3 fGlass = mix(vec3(0.13, 0.17, 0.23), vec3(0.22, 0.28, 0.35), fRnd);
  diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 0.5, uNight), fGlass * mix(1.0, 0.4, uNight), fWin);
  float fLit = fWin * mix(0.24, step(0.5, fRnd), fAA) * uNight;
  vec3 fLitCol = mix(vec3(1.0, 0.7, 0.36), vec3(0.8, 0.88, 1.0), step(0.88, fRnd));`;
/** Material barato dos arredores (com névoa e cor por instância); facade = com as janelas. */
function cheapMat(L, params = {}, facade = false) {
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', ...params });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, L.U);
    sh.vertexShader = 'varying vec3 vNw;\n' + (facade ? FAC_VARY : '') + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vec3 cN = normal;
#ifdef USE_INSTANCING
  cN = mat3(instanceMatrix) * cN;
#endif
  vNw = normalize(mat3(modelMatrix) * cN);` + (facade ? FAC_VERT : ''));
    sh.fragmentShader = 'uniform vec3 uSky;\nuniform vec3 uGround;\nuniform vec3 uSun;\nuniform vec3 uSunDir;\nuniform float uNight;\nvarying vec3 vNw;\n' + (facade ? FAC_VARY + FAC_FRAG_DECL : '')
      + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>' + (facade ? FAC_FRAG : '') + `
  vec3 cNn = normalize(vNw);
  diffuseColor.rgb *= mix(uGround, uSky, cNn.y * 0.5 + 0.5) + uSun * max(dot(cNn, uSunDir), 0.0);`)
      .replace('#include <opaque_fragment>', (facade ? '  outgoingLight += fLitCol * fLit * 1.15;\n' : '') + '#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'adress-cheap' + (facade ? '-f' : '') + (params.map ? '-m' : '') + (params.vertexColors ? '-v' : '');
  return m;
}

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
function planSurroundings(kind, dry, flavor = null) {
  const rand = rng(41 + GRID * 7 + (PLAZA ? 3 : 0) + (kind === 'city' ? 11 : 0) + (flavor ? flavor.length * 5 : 0));
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
  // bairros urbanos: o que é próprio de cada um passa por fora (corredores reservados antes de tudo)
  const feat = cityFeature(flavor, M);
  if (feat && feat.zH !== undefined) reserved.push({ x0: -3000, x1: 3000, z0: feat.zH - feat.half - 6, z1: feat.zH + feat.half + 6, corr: 'z' });   // elevado (vias/trilhos)
  if (feat && feat.river) for (const [z0, z1] of [[-3000, 0], [M, 3000]]) reserved.push({ x0: feat.river.x0 - 8, x1: feat.river.x1 + 8, z0, z1, corr: 'x' });   // o canal continua como rio
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
    let x0 = x + 1.5, x1 = x + C - 1.5, z0 = z + 1.5, z1 = z + C - 1.5;
    const ed = Math.hypot(Math.max(-(x0 + x1) / 2, 0, (x0 + x1) / 2 - M), Math.max(-(z0 + z1) / 2, 0, (z0 + z1) / 2 - M));
    if (ed > OUT_R - (city ? 50 : 20)) continue;                 // (a cidade é mais pesada: anel um pouco mais estreito)
    for (const r of reserved) if (r.corr && hitRect(r, x0, z0, x1, z1)) {   // corredor (elevado, rio): a quadra encolhe para o lado que sobra
      if (r.corr === 'z') { if (r.z0 - z0 >= z1 - r.z1) z1 = r.z0 - 1; else z0 = r.z1 + 1; }
      else { if (r.x0 - x0 >= x1 - r.x1) x1 = r.x0 - 1; else x0 = r.x1 + 1; }
    }
    if (x1 - x0 < 14 || z1 - z0 < 14) continue;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, small = x1 - x0 < 26 || z1 - z0 < 26;
    if (reserved.some(r => hitRect(r, x0, z0, x1, z1))) continue;
    const south = openSouth && hitRect(openSouth, x0, z0, x1, z1);
    const r = rand();
    let type;
    if (city) type = r < 0.42 ? 'block' : r < 0.52 ? 'ware' : r < 0.6 ? 'lot' : r < 0.77 ? 'park' : 'parking';   // (a cidade continua: mais quadras, estacionamentos)
    else if (kind === 'town') type = r < 0.32 ? 'homes' : r < 0.5 ? 'grove' : r < 0.62 ? 'lot' : r < 0.8 ? 'crop' : 'meadow';
    else if (kind === 'trade') type = r < 0.22 ? 'homes' : r < 0.42 ? 'ware' : r < 0.58 ? 'grove' : r < 0.7 ? 'lot' : r < 0.85 ? 'crop' : 'meadow';
    else type = r < 0.22 ? 'crop' : r < 0.36 ? 'wheat' : r < 0.48 ? 'plowed' : r < 0.62 ? 'pasture' : r < 0.72 ? 'orchard' : r < 0.86 ? 'grove' : 'stubble';
    if (south && !['crop', 'wheat', 'plowed', 'meadow'].includes(type)) type = rand() < 0.5 ? 'wheat' : 'crop';   // caminho da igreja: só plantação rasteira
    if (small && city) type = rand() < 0.5 ? 'park' : 'parking';                                 // (quadra encolhida pelo corredor)
    cells.push({ x0, x1, z0, z1, type, south, along: rand() < 0.5 ? 'x' : 'z' });
  }
  // cidade: os vãos que sobraram entre as estradas, as fileiras de prédios e os corredores viram quadrinhas de 14 m (um prédio,
  // uma pracinha ou um estacionamento) — nada de terreno vazio no meio da cidade
  if (city) {
    const S = C / 2;
    for (let x = XL; x < XR - S; x += S) for (let z = -OUT_R + 10; z < M + OUT_R - 10 - S; z += S) {
      const x0 = x + 1.5, x1 = x + S - 1.5, z0 = z + 1.5, z1 = z + S - 1.5, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (Math.hypot(Math.max(-mx, 0, mx - M), Math.max(-mz, 0, mz - M)) > OUT_R - 50) continue;
      if (reserved.some(r => hitRect(r, x0, z0, x1, z1)) || cells.some(c => hitRect(c, x0 - 1, z0 - 1, x1 + 1, z1 + 1))) continue;
      const r = rand();
      cells.push({ x0, x1, z0, z1, type: r < 0.45 ? 'one' : r < 0.8 ? 'park' : 'parking', south: false, along: 'x' });
    }
  }
  return { kind, roads, builds, cells, farms, reserved, openSouth, RW, RL, XW, XE, ZS, J: J_ROAD, southRoad, laneEnd, rand, laneCol: dry ? '#a08562' : '#a88d66', flavor, feat };
}

/** O que cada bairro urbano tem nos arredores (além da cidade que continua):
 *  altitude (7) e fluxo (14/19): um elevado com trânsito; trilhos (12): um elevado com o bonde; apice (8): o centro de arranha-céus;
 *  canal (11): o canal segue como rio; encostas (9): morros com casas subindo. */
function cityFeature(flavor, M) {
  if (flavor === 'altitude') return { zH: M + 132, half: 8, y: 8.6, kind: 'road', jam: true };
  if (flavor === 'flux') return { zH: J_ROAD - 104, half: 8, y: 9.2, kind: 'road', jam: false };
  if (flavor === 'rail') return { zH: M + 128, half: 4, y: 7.4, kind: 'rail' };
  if (flavor === 'apice') return { downtown: { x: M / 2 + 70, z: M + 330, r: 250 } };
  if (flavor === 'canal' && CANAL) return { river: { x0: CANAL.x0, x1: CANAL.x1 } };
  return null;
}

/** Desenha os arredores planejados. Devolve { group (instanciado/fundido), fields (chão), live (animado), update }. */
function buildSurroundings(P, dryPal, L = null) {
  const g = new THREE.Group(), fields = new THREE.Group(), live = new THREE.Group();
  const I = instancer(), rand = P.rand, solids = [], near = [];   // solids: colisão "sob demanda" (perto da van); near: troncos junto à sebe (sempre)
  const lamps = []; lamps.night = []; lamps.dim = [];            // postes (brilho à noite), objetos só da noite e materiais do chão que escurecem à noite
  const flatMats = new Map(), flatMat = c => { let m = flatMats.get(c); if (!m) { flatMats.set(c, m = L ? cheapMat(L, { color: c }) : new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true })); lamps.dim.push(m); } return m; };
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
  /** Prédio da cidade de fora: corpo com janelas (shader das fachadas), platibanda clara e, às vezes, algo no teto. */
  const tower = (x, z, w, d, floors, wall, y = 0, roofItem = true, shadeOn = true) => {
    const H = floors * 2.9;
    I.add('tw', U_BOX, x, y, z, w, H, d, 0, 0, wall);
    I.add('box', U_BOX, x, y + H, z, w + 0.3, 0.5, d + 0.3, 0, 0, lerpHex(wall, '#ffffff', 0.18));   // platibanda
    if (roofItem) {
      const r = rand();
      if (r < 0.35 && !I.suffix) I.add('cyl', U_CYL, x + w * 0.2, y + H + 0.5, z - d * 0.15, 1.1, 1.6, 1.1, 0, 0, '#8f9399');   // caixa-d'água (de longe, só caixas)
      else if (r < 0.7) I.add('box', U_BOX, x - w * 0.2, y + H + 0.5, z, Math.min(3.2, w * 0.3), 1.4, Math.min(3.2, d * 0.3), 0, 0, '#9fa3a8');   // casa de máquinas
    }
    if (shadeOn) shade(x + sd.x * Math.min(H, 18) * 0.45, z + sd.z * Math.min(H, 18) * 0.45, w * 0.62, d * 0.62);
    return H;
  };
  const quad = city ? (x, z) => { I.suffix = '#q' + farKey(x, z, 0).slice(2); } : () => {};   // (cidade: um pedaço por quadrante, para a câmera recortar)
  for (const b of P.builds) {
    quad(b.x, b.z);
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
      const W2 = (Math.abs(Math.sin(ry)) > 0.5 ? b.d : b.w), D2 = (Math.abs(Math.sin(ry)) > 0.5 ? b.w : b.d);
      const H = tower(b.x, b.z, W2, D2, b.floors, CITY_WALLS[Math.floor(rand() * CITY_WALLS.length)]);
      solid(b.box.x0 - 0.2, b.box.x1 + 0.2, b.box.z0 - 0.2, b.box.z1 + 0.2).top = H;   // (top: altura, para quem quiser colisão no ar)
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
  const flat = (x0, z0, x1, z1, col, y = -0.016) => fields.add(at(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), flatMat(col)), (x0 + x1) / 2, y, (z0 + z1) / 2));
  const nearRoad = r => { let best = null, bd = 1e9; for (const [k, d] of [['n', Math.abs(r.z0 - P.J)], ['s', Math.abs(r.z1 - P.ZS)], ['w', Math.abs(r.x0 - P.XW)], ['e', Math.abs(r.x1 - P.XE)]]) if (d < bd) { bd = d; best = k; } return best; };
  let signs = 0, bales = 0;
  const signTex = textTexture('VENDE-SE', { width: 256, height: 128, bg: '#fbf7ee', fg: '#c8312a', font: 'bold 60px "Trebuchet MS", sans-serif' });
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 });
  for (const c of P.cells) {
    const r = c, w = r.x1 - r.x0, d = r.z1 - r.z0, mx = (r.x0 + r.x1) / 2, mz = (r.z0 + r.z1) / 2;
    quad(mx, mz);
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
      case 'one': {                                                                                  // quadrinha com um prédio só
        flat(r.x0 + 0.5, r.z0 + 0.5, r.x1 - 0.5, r.z1 - 0.5, dryPal ? '#b4ab98' : '#b3ae9f');
        const bw = w - 3, bd = d - 3;
        const H = tower(mx, mz, bw, bd, 3 + Math.floor(rand() * 5), CITY_WALLS[Math.floor(rand() * CITY_WALLS.length)]);
        solid(mx - bw / 2 - 0.2, mx + bw / 2 + 0.2, mz - bd / 2 - 0.2, mz + bd / 2 + 0.2).top = H;
        break;
      }
      case 'grove': case 'park': {
        if (c.type === 'park') flat(r.x0, r.z0, r.x1, r.z1, lerpHex(PAL.pasture, '#5f8f3f', 0.35));
        for (let k = 0, n = Math.max(2, Math.round(w * d / 100 * (0.6 + rand() * 0.7))); k < n; k++) {
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
        const n = 3 + Math.floor(rand() * 2);                                                      // 3 ou 4 prédios por quadra
        for (let k = 0; k < n; k++) {
          const dm = cityDims(), bw = Math.min(dm.w, w / 2 - 2), bd = Math.min(dm.d, d / 2 - 2);
          const bx = k % 2 ? r.x1 - bw / 2 - 1.5 : r.x0 + bw / 2 + 1.5, bz = k < 2 ? r.z0 + bd / 2 + 1.5 : r.z1 - bd / 2 - 1.5;
          const H = tower(bx, bz, bw, bd, dm.floors, CITY_WALLS[Math.floor(rand() * CITY_WALLS.length)]);
          solid(bx - bw / 2 - 0.2, bx + bw / 2 + 0.2, bz - bd / 2 - 0.2, bz + bd / 2 + 0.2).top = H;
        }
        if (n === 3) tree(r.x0 + w * 0.72, r.z0 + d * 0.72, 'round', 0.8);                       // pátio arborizado no canto vazio
        break;
      }
      case 'parking': {                                                                              // estacionamento com carros parados
        flat(r.x0 + 1, r.z0 + 1, r.x1 - 1, r.z1 - 1, '#6b7079');
        const rows = d >= 28 ? 3 : d >= 18 ? 2 : 1, nk = Math.max(2, Math.floor((w - 4) / 2.9));
        for (let row = 0; row < rows; row++) {
          const zr = r.z0 + d * (row + 1) / (rows + 1);
          for (let k = 0; k < nk; k++) {
            const xr = r.x0 + 3.2 + k * (w - 6.4) / (nk - 1);
            I.add('cbox', U_CBOX, xr - 1.4, 0.01, zr, 0.12, 0.02, 4.4, 0, 0, '#e8e6df');                  // faixa da vaga
            if (rand() < 0.62) {
              const col = ['#d8473a', '#3a78d4', '#efbf2a', '#f2f2f2', '#2b2d33', '#8f959c', '#3c9d55'][Math.floor(rand() * 7)];
              I.add('cbox', U_CBOX, xr, 0.2, zr, 1.7, 0.4, 3.3, 0, 0, '#26282c');                   // rodas (antes a carroceria flutuava)
              I.add('cbox', U_CBOX, xr, 0.72, zr, 1.85, 0.7, 4.1, 0, 0, col);
              I.add('cbox', U_CBOX, xr, 1.3, zr - 0.2, 1.65, 0.55, 2.1, 0, 0, '#c9d6e0');
              solid(xr - 1, xr + 1, zr - 2.1, zr + 2.1);
            }
          }
        }
        for (const [tx, tz] of [[r.x0 + 2, r.z0 + 2], [r.x1 - 2, r.z1 - 2]]) tree(tx, tz, 'round', 0.7);
        break;
      }
      default: break;                                                                                 // gramado
    }
  }

  I.suffix = '';
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
  for (let tries = 0; groups < (city ? 0 : 26) && tries < 4000; tries++) {   // (cidade: no lugar, o parque linear de buildCityOuter)
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
  for (let k = 0; k < (city ? 0 : 140); k++) {
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

  // a cidade continua até o horizonte (bairros urbanos) e o que é de cada um passa por fora; postes com brilho à noite
  const fac = L ? { material: cheapMat(L, {}, true), uNight: L.U.uNight } : null;
  const cctx = { I, g, fields, live, updaters, tree, tower, solid, rand, dryPal, lamps, L, farPts: {}, hillH: null };
  if (city) buildCityOuter(P, cctx);
  if (lamps.length) {
    const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lamps, 3)), glowMat('#ffd28a', 5.5));
    pts.visible = false; pts.frustumCulled = false; live.add(pts); lamps.night.push(pts);
  }
  if (lamps.red) {                                                                    // luz vermelha no alto da torre (pisca à noite)
    const red = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(lamps.red, 3)), glowMat('#ff3a2a', 9));
    red.visible = false; live.add(red); lamps.night.push(red);
    updaters.push(t => { red.material.opacity = (t % 1.6) < 0.8 ? 1 : 0.15; });
  }
  const outMat = L ? cheapMat(L) : OUT_MAT.clone(); lamps.dim.push(outMat);      // (um por mundo: à noite escurece só o deste)
  I.build(g, outMat, fac ? { tw: fac.material } : {});
  // cidade além da névoa da câmera de jogo: cada pedaço com os centros das quadras do seu setor (createWorld decide se aparece)
  const farBand = g.children.filter(o => o.name.includes('#f')).map(m => ({ m, pts: cctx.farPts[m.name.slice(m.name.indexOf('#f'))] || [] }));
  live.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  /** Penumbra: janelas acesas e postes brilhando nos arredores. */
  const setNight = on => {
    if (L) { L.sync(); L.U.uNight.value = on ? 1 : 0; } for (const o of lamps.night) o.visible = on;
    for (const m of lamps.dim) { m.userData.day = m.userData.day || m.color.clone(); m.color.copy(m.userData.day).multiplyScalar(on ? 0.42 : 1); }   // chão da cidade à noite
  };
  return { group: g, fields, live, solids: near, farSolids: solids, update: (t, dt) => { for (const u of updaters) u(t, dt); }, setNight, farBand, hillH: cctx.hillH };
}

// ---------- A cidade que continua (bairros urbanos: 6, 7, 8, 9, 11, 12, 14, 19) ----------
// Além do anel de quadras perto do bairro (buildSurroundings), a cidade segue até o horizonte: chão de quadras e ruas (uma
// textura repetida, alinhada com a estrada de acesso e a estrada que cruza), prédios instanciados com as janelas do shader das
// fachadas (à noite, parte acesa), mais baixos e esparsos para longe. E o que é de cada bairro passa por ali: um elevado com
// trânsito (Altitude: anda e para; Fluxo/Penumbra: corrido), o elevado do bonde com a estação (Trilhos), o centro de
// arranha-céus com a torre de TV (Ápice), o canal que segue como rio com pontes e barcos (Travessia) e os morros com casas
// (Encostas). Colisão: só prédios, pilares, muros do rio e troncos — todos sob demanda (perto da van), fora da área jogável.
const TILE = 44, STREET = 8, FAR0 = 188, FAR1 = 640;
let glowTex = null;
function lampGlow() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace; return glowTex;
}
/** Brilho em pontos (postes, faróis do elevado, luz da torre), com teto para o tamanho na tela: sem ele, um poste a poucos
 *  metros da câmera virava um quadrado enorme de luz chapada (à noite, dirigindo pelos arredores do Penumbra). */
function glowMat(color, size) {
  const m = new THREE.PointsMaterial({ map: lampGlow(), color, size, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <logdepthbuf_vertex>', 'gl_PointSize = min(gl_PointSize, scale * 0.35);\n\t#include <logdepthbuf_vertex>'); };
  m.customProgramCacheKey = () => 'adress-glowcap';
  return m;
}
/** Quadra de 44 m vista de longe: ruas de 8 m nas bordas (com faixa central), calçadas e o miolo da quadra. */
function streetTexture(dry) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const k = 256 / TILE, s = STREET / 2 * k, w = 1.8 * k;
  x.fillStyle = dry ? '#a39c8e' : '#9e9c95'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = dry ? '#c2baa9' : '#bdbab1';
  x.fillRect(0, 0, 256, s + w); x.fillRect(0, 256 - s - w, 256, s + w); x.fillRect(0, 0, s + w, 256); x.fillRect(256 - s - w, 0, s + w, 256);
  x.fillStyle = '#62676f';
  x.fillRect(0, 0, 256, s); x.fillRect(0, 256 - s, 256, s); x.fillRect(0, 0, s, 256); x.fillRect(256 - s, 0, s, 256);
  x.fillStyle = '#d6c060';
  for (let p = s + w + 8; p < 256 - s - w - 12; p += 24) { x.fillRect(p, 0, 12, 2); x.fillRect(p, 254, 12, 2); x.fillRect(0, p, 2, 12); x.fillRect(254, p, 2, 12); }
  x.fillStyle = '#e8e4da';                                                                         // faixas de pedestre nas esquinas
  for (const [cx, cy] of [[0, 0], [256, 0], [0, 256], [256, 256]]) for (let q = -3; q <= 3; q++) {
    x.fillRect(cx + (cx ? -s - 8 : s + 2), cy - s + 2 + (q + 3) * (s * 2 - 4) / 7, 6, (s * 2 - 4) / 14);
    x.fillRect(cx - s + 2 + (q + 3) * (s * 2 - 4) / 7, cy + (cy ? -s - 8 : s + 2), (s * 2 - 4) / 14, 6);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}
/** Plano horizontal x0..x1 × z0..z1 com UV em quadras (origem ox, oz: as ruas passam em ox + k·44 e oz + k·44). */
function tilePlane(x0, z0, x1, z1, ox, oz, material, y) {
  if (x1 - x0 < 0.5 || z1 - z0 < 0.5) return null;
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, Math.max(1, Math.ceil((x1 - x0) / 80)), Math.max(1, Math.ceil((z1 - z0) / 80)));
  geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - ox) / TILE, (p.getZ(i) - oz) / TILE);
  const m = new THREE.Mesh(geo, material); m.castShadow = false; m.receiveShadow = false;
  return m;
}
/** Moldura: o retângulo `out` menos o `inn` (4 faixas), menos as faixas verticais `cuts` ([x0, x1]). */
function frameRects(out, inn, cuts = []) {
  const rs = [[out.x0, out.z0, out.x1, inn.z0], [out.x0, inn.z1, out.x1, out.z1], [out.x0, inn.z0, inn.x0, inn.z1], [inn.x1, inn.z0, out.x1, inn.z1]];
  let res = rs;
  for (const [c0, c1] of cuts) res = res.flatMap(([x0, z0, x1, z1]) => (c1 <= x0 || c0 >= x1) ? [[x0, z0, x1, z1]] : [[x0, z0, Math.max(x0, c0), z1], [Math.min(x1, c1), z0, x1, z1]]);
  return res.filter(([x0, z0, x1, z1]) => x1 - x0 > 0.5 && z1 - z0 > 0.5);
}

/** Pedaço da cidade de longe (4 setores em volta do bairro × perto/longe): cada pedaço vira uma InstancedMesh própria, então a
 *  câmera recorta o que está atrás dela, e a faixa de longe (além da névoa da câmera de jogo) só é desenhada na visão geral. */
function farKey(x, z, e) {
  const a = Math.atan2(z - MAP / 2, x - MAP / 2), sec = (Math.floor((a + Math.PI * 1.25) / (Math.PI / 2)) + 4) % 4;   // (quadrantes: norte, leste, sul, oeste)
  return '#' + (e > FAR_FOG ? 'f' : 'n') + sec;
}
const FAR_FOG = 380;                                  // além disso a névoa da câmera de jogo (130 → 430) já apagou quase tudo
const PARK_O = 17;                                    // eixo do caminho do parque linear (a partir da borda do bairro)
/** Desenha a cidade de fora e o que é próprio do bairro. ctx: { I, g, fields, live, updaters, tree, tower, solid, rand, dryPal, lamps }. */
function buildCityOuter(P, ctx) {
  const { I, g, fields, live, updaters, tree, tower, solid, rand, dryPal, lamps, L, farPts } = ctx;
  const M = MAP, flavor = P.flavor, feat = P.feat || {}, cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;
  const edge = (x, z) => Math.hypot(Math.max(-x, 0, x - M), Math.max(-z, 0, z - M));
  const river = feat.river, rx0 = river ? river.x0 - 8 : 0, rx1 = river ? river.x1 + 8 : 0;
  const inRiver = (x0, x1) => river && x1 > rx0 && x0 < rx1;

  // ---- chão: calçamento entre as estradas de fora e o anel de quadras; quadras e ruas daí até o horizonte ----
  const inner = { x0: P.XW - P.RL / 2, x1: P.XE + P.RL / 2, z0: P.J - P.RW / 2, z1: P.ZS + P.RW / 2 };
  const mid = { x0: -FAR0 + 12, x1: M + FAR0 - 12, z0: -FAR0 + 12, z1: M + FAR0 - 12 };
  const outer = { x0: -1900, x1: M + 1900, z0: -1900, z1: M + 1900 };
  const cuts = river ? [[river.x0, river.x1]] : [];
  const paveM = cheapMat(L, { color: dryPal ? '#b6af9f' : '#b2afa6' }); lamps.dim.push(paveM);
  const hills = flavor === 'encostas' ? hillField(M, cx, cheapMat(L, { vertexColors: true })) : null;
  if (!hills) for (const [x0, z0, x1, z1] of frameRects(mid, inner, cuts)) { const m = tilePlane(x0, z0, x1, z1, 0, 0, paveM, -0.026); if (m) fields.add(m); }   // (Encostas: gramado até os morros)
  if (!hills) {
    const stM = cheapMat(L, { map: streetTexture(dryPal) }); lamps.dim.push(stM);
    for (const [x0, z0, x1, z1] of frameRects(outer, mid, cuts)) { const m = tilePlane(x0, z0, x1, z1, cx, P.J, stM, -0.026); if (m) fields.add(m); }
  } else fields.add(hills.mesh);
  const hAt = hills ? hills.h : () => 0;
  if (hills) ctx.hillH = hills.h;                                                 // (Encostas: a van sobe os morros — createWorld)

  // ---- prédios de longe, quadra a quadra (alinhados com as ruas da textura) ----
  const dt = feat.downtown;
  const WALLS_F = flavor === 'apice' ? ['#c9ced3', '#a9b6c2', '#8f9eac', '#d9d6cf', '#b7bcc2', '#7d8a96']
    : flavor === 'mirante' ? ['#cbbfac', '#c2c7c0', '#d6cbb8', '#b9b4aa', '#c9b8a6', '#aeb4b8']
    : flavor === 'flux' ? ['#c7c9cc', '#9ea7ae', '#d8d4cb', '#b3b9bd', '#8e979f', '#c9bfae']
    : flavor === 'encostas' ? ['#e8dcc4', '#d9c7a8', '#e6d2c0', '#cfd6c4', '#e0c9b0', '#d6d0c6', '#c9b49b']
    : ['#bdb8ae', '#aaa59c', '#c9c2b5', '#9e9a92', '#b8a593', '#c7bba9'];
  const wall = () => WALLS_F[Math.floor(rand() * WALLS_F.length)];
  const floorsAt = (x, z, e) => {
    const fall = e > 470 ? 0.75 : 1;
    let f;
    switch (flavor) {
      case 'mirante': f = rand() < 0.12 ? 11 + rand() * 6 : 4 + rand() * 5; break;
      case 'altitude': f = rand() < 0.08 ? 9 + rand() * 5 : 3 + rand() * 5; break;
      case 'apice': { const d = Math.hypot(x - dt.x, z - dt.z), k = Math.max(0, 1 - d / dt.r); f = k > 0 ? 12 + rand() * 14 + k * k * 30 : 7 + rand() * 9; break; }
      case 'flux': f = rand() < 0.16 ? 12 + rand() * 8 : 5 + rand() * 6; break;
      case 'encostas': f = 1 + rand() * 2.6; break;
      default: f = 3 + rand() * 5;
    }
    return Math.max(1, Math.floor(f * fall));
  };
  const tvTower = flavor === 'apice' && dt ? { x: dt.x + 30, z: dt.z + 60 } : null;
  if (tvTower) P.reserved.push({ x0: tvTower.x - 14, x1: tvTower.x + 14, z0: tvTower.z - 14, z1: tvTower.z + 14 });
  const reservedHit = (x0, z0, x1, z1) => P.reserved.some(r => hitRect(r, x0, z0, x1, z1)) || P.cells.some(c => hitRect(c, x0 - 4, z0 - 4, x1 + 4, z1 + 4));
  const NI = Math.ceil((FAR1 + M / 2) / TILE) + 1;
  for (let i = -NI; i <= NI; i++) for (let j = -NI; j <= NI; j++) {
    const tx = cx + TILE / 2 + i * TILE, tz = P.J + TILE / 2 + j * TILE, e = edge(tx, tz);
    if (e < FAR0 || e > FAR1) continue;
    const half = TILE / 2 - STREET / 2 - 0.6, x0 = tx - half, x1 = tx + half, z0 = tz - half, z1 = tz + half;
    if (reservedHit(x0, z0, x1, z1) || inRiver(x0, x1)) continue;
    if (e > 470 && rand() < (e - 470) / 260) continue;                                            // rareia no horizonte
    I.suffix = farKey(tx, tz, e);
    if (I.suffix[1] === 'f') (farPts[I.suffix] || (farPts[I.suffix] = [])).push(tx, tz);
    const r = rand(), y0 = hills ? Math.min(hAt(x0, z0), hAt(x1, z0), hAt(x0, z1), hAt(x1, z1)) - 0.4 : 0;
    if (hills) {                                                                                   // morro: casinhas em fileiras subindo a encosta
      const steep = Math.max(hAt(x0, z0), hAt(x1, z0), hAt(x0, z1), hAt(x1, z1)) - y0;
      if (r < 0.22 || steep > 16) { for (let k = 0; k < 3; k++) { const ax = x0 + 3 + rand() * (x1 - x0 - 6), az = z0 + 3 + rand() * (z1 - z0 - 6); treeOn(ax, az); } continue; }
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        if (rand() < 0.22) continue;
        const bw = 6.5 + rand() * 3, bd = 6 + rand() * 3, bx = x0 + 6 + a * (x1 - x0 - 12) / 2, bz = z0 + 6 + b * (z1 - z0 - 12) / 2;
        const by = Math.min(hAt(bx - bw / 2, bz - bd / 2), hAt(bx + bw / 2, bz + bd / 2), hAt(bx - bw / 2, bz + bd / 2), hAt(bx + bw / 2, bz - bd / 2)) - 0.3;
        tower(bx, bz, bw, bd, floorsAt(bx, bz, e), wall(), by, false, false);
        solid(bx - bw / 2, bx + bw / 2, bz - bd / 2, bz + bd / 2);
      }
      continue;
    }
    if (r < 0.1) {                                                                                 // praça arborizada
      I.add('pad', U_CBOX, tx, 0.01, tz, half * 2, 0.04, half * 2, 0, 0, dryPal ? '#8f9a52' : '#7aa252');
      for (let k = 0; k < 6; k++) treeOn(tx + (rand() - 0.5) * (half * 2 - 6), tz + (rand() - 0.5) * (half * 2 - 6));   // (árvores de uma copa só: de longe não se nota)
      continue;
    }
    const big = flavor === 'apice' && dt && Math.hypot(tx - dt.x, tz - dt.z) < dt.r;
    if (r < 0.28 && !big) {                                                                        // um prédio grande e baixo (galpão, shopping)
      const H = 2 + Math.floor(rand() * 2), w = half * 2 - 3, d = half * 2 - 6;
      solid(tx - w / 2, tx + w / 2, tz - d / 2, tz + d / 2).top = tower(tx, tz, w, d, H, wall(), 0, true, false);
    } else if (r < 0.45 || big) {                                                                   // uma torre e um prédio menor
      const w = 14 + rand() * 6, d = 14 + rand() * 6, f = floorsAt(tx, tz, e) + (big ? 6 : 3);
      const bx = tx - half + w / 2 + 1, bz = tz - half + d / 2 + 1;
      solid(bx - w / 2, bx + w / 2, bz - d / 2, bz + d / 2).top = tower(bx, bz, w, d, f, wall(), 0, true, false);
      if (big && f > 24) { I.add('cyl', U_CYL, bx, f * 2.9 + 0.5, bz, 0.25, 6 + rand() * 6, 0.25, 0, 0, '#d8d8d8'); }   // antena no alto
      const w2 = 12 + rand() * 4, d2 = 12 + rand() * 4, sx = tx + half - w2 / 2 - 1, sz = tz + half - d2 / 2 - 1;
      solid(sx - w2 / 2, sx + w2 / 2, sz - d2 / 2, sz + d2 / 2).top = tower(sx, sz, w2, d2, Math.max(2, floorsAt(tx, tz, e) - 2), wall(), 0, true, false);
    } else {                                                                                       // 4 prédios nos cantos, pátio no meio
      for (let k = 0; k < 4; k++) {
        if (rand() < 0.12) continue;
        const w = 12 + rand() * 4, d = 12 + rand() * 4;
        const bx = k % 2 ? tx + half - w / 2 - 0.5 : tx - half + w / 2 + 0.5, bz = k < 2 ? tz - half + d / 2 + 0.5 : tz + half - d / 2 - 0.5;
        solid(bx - w / 2, bx + w / 2, bz - d / 2, bz + d / 2).top = tower(bx, bz, w, d, floorsAt(bx, bz, e), wall(), 0, true, false);
      }
      if (rand() < 0.6) tree(tx, tz, 'round', 0.8);
    }
  }
  I.suffix = '';
  function treeOn(x, z) {                                                               // árvore de uma copa (no chão ou no morro)
    const y = hAt(x, z), s = 0.9 + rand() * 0.6, ry = rand() * 6, LV = dryPal ? ['#7f9a45', '#8ea24e', '#6f8a3e', '#a0a457'] : ['#4f9a45', '#5ea84e', '#3f8a3c', '#6db256'];
    I.add('trunk', U_TRUNK, x, y - 0.2, z, 0.34 * s, 2.3 * s, 0.34 * s, 0, ry, '#7a5230');
    I.add('ico', U_ICO, x, y + 2.75 * s, z, 1.7 * s, 1.55 * s, 1.7 * s, rand(), ry, LV[Math.floor(rand() * 4)]);
    solid(x - 0.6 * s, x + 0.6 * s, z - 0.6 * s, z + 0.6 * s);
  }

  // ---- postes das estradas de fora (só se veem à noite: brilho) ----
  /** Poste de luz (o brilho só aparece à noite). base: chão do poste (o do elevado fica no tabuleiro). */
  const lampAt = (x, z, y = 6.2, base = 0) => {
    lamps.push(x, y - 0.12, z);                                                         // (brilho logo abaixo da luminária, não dentro dela)
    if (edge(x, z) > 260) return;                                                       // (de longe, só o brilho à noite)
    I.add('pole', U_POLE, x, base, z, 0.12, y - base + 0.1, 0.12, 0, 0, '#4a4f56');
    I.add('cbox', U_CBOX, x, y + 0.05, z, 0.6, 0.18, 0.6, 0, 0, '#e9e2c8');
    if (!base) solid(x - 0.2, x + 0.2, z - 0.2, z + 0.2).post = true;
  };
  // ---- parque linear em volta do bairro (entre a sebe e as estradas de fora): caminho, fileiras de árvores, bancos e postes ----
  {
    const o = PARK_O, R = P.RW, side = [];
    const pathM = cheapMat(L, { color: dryPal ? '#d3c7ad' : '#d6cdb6' }); lamps.dim.push(pathM);
    const free = (x, z, r) => !P.reserved.slice(1).some(q => x + r > q.x0 && x - r < q.x1 && z + r > q.z0 && z - r < q.z1);   // (fora das estradas, da placa e do corredor da estrada de acesso)
    // [eixo, coordenada fixa, de, até, sinal para fora] — norte, sul, oeste, leste
    side.push(['x', -o, -o, M + o, -1], ['x', M + o, -o, M + o, 1], ['z', -o, -o, M + o, -1], ['z', M + o, -o, M + o, 1]);
    for (const [ax, c, a, b, sg] of side) {
      const strip = (u0, u1) => { if (u1 - u0 < 1) return; fields.add(ax === 'x' ? at(new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0, 3.2).rotateX(-Math.PI / 2), pathM), (u0 + u1) / 2, -0.014, c) : at(new THREE.Mesh(new THREE.PlaneGeometry(3.2, u1 - u0).rotateX(-Math.PI / 2), pathM), c, -0.014, (u0 + u1) / 2)); };
      // (o caminho do norte encontra a estrada de acesso; na Travessia, o rio corta os dois caminhos: passarela em buildRiver)
      const cuts = ax !== 'x' ? [] : [...(c < 0 ? [[cx - 6, cx + 6]] : []), ...(river ? [[river.x0 - 0.3, river.x1 + 0.3]] : [])].sort((p, q) => p[0] - q[0]);
      let u0 = a - 1.6; for (const [k0, k1] of cuts) { strip(u0, k0); u0 = k1; } strip(u0, b + 1.6);
      const far = ax === 'x' ? (c < 0 ? P.J + R / 2 + 7 : P.ZS - R / 2 - 7) : (c < 0 ? P.XW + P.RL / 2 + 7 : P.XE - P.RL / 2 - 7);   // fileira de fora, junto à estrada
      let n = 0;
      for (let u = a + 5; u < b - 4; u += 11, n++) {
        const at2 = (off, cb) => { const x = ax === 'x' ? u : c + off, z = ax === 'x' ? c + off : u; if (free(x, z, 2.2)) { I.suffix = '#q' + farKey(x, z, 0).slice(2); cb(x, z); I.suffix = ''; } };
        for (const off of [-4.4, 4.4]) at2(off, (x, z) => tree(x, z, n % 5 === 2 ? 'birch' : 'round', 0.85 + ((n * 7) % 5) * 0.06));
        const xf = ax === 'x' ? u + 5.5 : far, zf = ax === 'x' ? far : u + 5.5;
        if (n % 2 && free(xf, zf, 2.2)) { I.suffix = '#q' + farKey(xf, zf, 0).slice(2); tree(xf, zf, n % 4 === 1 ? 'poplar' : 'pine', 0.95); I.suffix = ''; }
        if (n % 3 === 1) at2(sg * 2.3, (x, z) => {                                                  // banco virado para o caminho
          const ry = ax === 'x' ? (sg > 0 ? Math.PI : 0) : (sg > 0 ? -Math.PI / 2 : Math.PI / 2);
          I.add('cbox', U_CBOX, x, 0.45, z, ax === 'x' ? 1.9 : 0.5, 0.1, ax === 'x' ? 0.5 : 1.9, 0, 0, '#8a5a36');
          I.add('cbox', U_CBOX, x + (ax === 'x' ? 0 : sg * 0.25), 0.75, z + (ax === 'x' ? sg * 0.25 : 0), ax === 'x' ? 1.9 : 0.08, 0.5, ax === 'x' ? 0.08 : 1.9, 0, 0, '#8a5a36');
          for (const d of [-0.75, 0.75]) I.add('cbox', U_CBOX, x + (ax === 'x' ? d : 0), 0.22, z + (ax === 'x' ? 0 : d), 0.1, 0.44, 0.4, 0, ry, '#3a3d44');
          solid(x - 1, x + 1, z - 1, z + 1);
        });
        if (n % 3 === 0) at2(-sg * 2.2, (x, z) => lampAt(x, z, 4.2));
      }
    }
  }
  const onCross = x => Math.abs(x - cx) < 8 || Math.abs(x - P.XW) < P.RL / 2 + 1.5 || Math.abs(x - P.XE) < P.RL / 2 + 1.5 || inRiver(x - 1, x + 1);
  for (let x = P.XW + 13; x < P.XE - 6; x += 26) { if (!onCross(x)) lampAt(x, P.J + P.RW / 2 + 0.6); if (P.southRoad && !onCross(x + 13)) lampAt(x + 13, P.ZS - P.RW / 2 - 0.6); }
  for (let z = P.J + 20; z < P.laneEnd; z += 26) { lampAt(P.XW + P.RL / 2 + 0.6, z); lampAt(P.XE - P.RL / 2 - 0.6, z); }
  for (let z = P.J - 20; z > -420; z -= 26) lampAt(cx + 4.4, z);
  if (!hills) for (let i = -NI; i <= NI; i += 1) for (let j = -NI; j <= NI; j += 1) {               // esquinas das ruas de longe
    const x = cx + i * TILE, z = P.J + j * TILE, e = edge(x, z);
    if (e > FAR0 - 10 && e < FAR1 - 40 && !inRiver(x - 2, x + 2) && (i + j) % 2 === 0) { I.suffix = farKey(x, z, e); lampAt(x + 4.6, z + 4.6); I.suffix = ''; }
  }

  // ---- o que é de cada bairro ----
  if (feat.zH !== undefined) buildElevated(feat);
  if (river) buildRiver();
  if (tvTower) {                                                                                   // torre de TV no centro (marco no horizonte)
    const tx = tvTower.x, tz = tvTower.z;
    I.add('cyl', U_CYL, tx, 0, tz, 3.2, 96, 3.2, 0, 0, '#d9dadb');
    I.add('cyl', U_CYL, tx, 82, tz, 8.5, 9, 8.5, 0, 0, '#9ab0c4');
    I.add('cyl', U_CYL, tx, 91, tz, 9.2, 1.2, 9.2, 0, 0, '#e8e8e8');
    for (let k = 0; k < 5; k++) I.add('cyl', U_CYL, tx, 96 + k * 6, tz, 0.9 - k * 0.15, 6, 0.9 - k * 0.15, 0, 0, k % 2 ? '#d8473a' : '#f2f2f2');
    solid(tx - 3.4, tx + 3.4, tz - 3.4, tz + 3.4);
    lamps.red = [tx, 127, tz];
  }

  /** Elevado: tabuleiro em pilares, de ponta a ponta do horizonte, com trânsito (road) ou com o bonde e a estação (rail). */
  function buildElevated(F) {
    const z = F.zH, Y = F.y, H2 = F.half, L0 = -900, L1 = M + 900, SEG = 40;
    for (let x = L0; x < L1; x += SEG) {
      I.add('deck', U_CBOX, x + SEG / 2, Y - 0.5, z, SEG + 0.05, 1.0, H2 * 2, 0, 0, '#bdb7ab');                     // tabuleiro
      for (const s of [-1, 1]) I.add('deck', U_CBOX, x + SEG / 2, Y + 0.45, z + s * (H2 - 0.2), SEG + 0.05, 0.9, 0.4, 0, 0, '#d2ccc0');   // mureta
      I.add('deck', U_CBOX, x + SEG / 2, Y - 1.15, z, SEG + 0.05, 0.3, H2 * 2 - 2, 0, 0, '#a59f93');                // viga embaixo
    }
    for (let x = L0 + 20; x < L1; x += 36) {                                                        // pilares (fora das estradas)
      if (Math.abs(x - cx) < 14 || (river && x > river.x0 - 3 && x < river.x1 + 3)) continue;
      if (F.kind === 'road' && (Math.abs(x - P.XW) < P.RL / 2 + 3 || Math.abs(x - P.XE) < P.RL / 2 + 3)) continue;
      I.add('deck', U_CBOX, x, (Y - 1.3) / 2, z, 1.8, Y - 1.3, 2.6, 0, 0, '#b3ada1');
      I.add('deck', U_CBOX, x, Y - 1.5, z, 2.6, 0.8, H2 * 2 - 1.2, 0, 0, '#b3ada1');
      solid(x - 1.1, x + 1.1, z - 1.5, z + 1.5).post = true;
      if (F.kind === 'road') lampAt(x, z, Y + 5.2, Y + 0.5);                                     // (no meio, sobre a divisória)
    }
    // embaixo do elevado: canteiro gramado com árvores entre os pilares (a estrada de acesso passa livre)
    const lawn = cheapMat(L, { color: dryPal ? '#8f9a52' : '#7aa252' }); lamps.dim.push(lawn);
    const strip = (a, b) => { if (b - a > 1) fields.add(at(new THREE.Mesh(new THREE.PlaneGeometry(b - a, H2 * 2 + 6).rotateX(-Math.PI / 2), lawn), (a + b) / 2, -0.012, z)); };
    if (z < 0) { strip(L0, cx - 8); strip(cx + 8, L1); } else strip(L0, L1);
    for (let x = L0 + 38, k = 0; x < L1 - 20; x += 36, k++) {
      if (Math.abs(x - cx) < 14 || Math.abs(x - M / 2) > 560) continue;
      tree(x, z + (k % 2 ? 1 : -1) * (H2 + 1.2), k % 3 ? 'round' : 'birch', 0.75);
    }
    if (F.kind === 'road') {
      for (let x = L0; x < L1; x += 8) for (const lz of [-H2 / 2 + 0.2, H2 / 2 - 0.2]) I.add('deck', U_CBOX, x, Y + 0.01, z + lz, 3, 0.02, 0.15, 0, 0, '#ecebe6');   // faixas
      I.add('deck', U_CBOX, (L0 + L1) / 2, Y + 0.25, z, L1 - L0, 0.5, 0.35, 0, 0, '#d2ccc0');                                       // divisória central
      roadTraffic(F);
    } else railLine(F);
  }
  /** Trânsito do elevado: 2 faixas por sentido; na Altitude, um sentido anda e para (o engarrafamento), o outro corre. */
  function roadTraffic(F) {
    const z = F.zH, Y = F.y, L0 = -520, L1 = M + 520, cars = [];                                    // (além disso a névoa já cobre tudo)
    const lanes = [{ z: z - F.half * 0.75, dir: 1 }, { z: z - F.half * 0.3, dir: 1 }, { z: z + F.half * 0.3, dir: -1 }, { z: z + F.half * 0.75, dir: -1 }];
    const COL = ['#d8473a', '#3a78d4', '#efbf2a', '#f2f2f2', '#2b2d33', '#8f959c', '#3c9d55', '#ff8a1e', '#e86aa0'];
    lanes.forEach((ln, li) => {
      const jam = F.jam && ln.dir > 0, gap = jam ? 6.8 : 22 + rand() * 16;
      for (let x = L0 + rand() * 20; x < L1; x += gap * (jam ? 1 : 0.7 + rand() * 0.8)) cars.push({ ln, li, x, v: 0, col: COL[Math.floor(rand() * COL.length)], truck: rand() < 0.12 });
    });
    const body = new THREE.InstancedMesh(U_CBOX, new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), cars.length);
    const cab = new THREE.InstancedMesh(U_CBOX, new THREE.MeshStandardMaterial({ color: '#cfdbe4', roughness: 0.3, flatShading: true }), cars.length);
    const col = new THREE.Color();
    cars.forEach((c, i) => body.setColorAt(i, col.set(c.col)));
    body.frustumCulled = cab.frustumCulled = false; live.add(dynamic(body), dynamic(cab));
    const heads = new Float32Array(cars.length * 3), tails = new Float32Array(cars.length * 3);
    const hp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(heads, 3)), glowMat('#fff3d0', 3.2));
    const tp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(tails, 3)), glowMat('#ff3a2a', 2.4));
    hp.frustumCulled = tp.frustumCulled = false; hp.visible = tp.visible = false; live.add(hp, tp); lamps.night.push(hp, tp);
    const o = new THREE.Object3D(), byLane = lanes.map((ln, li) => cars.filter(c => c.li === li).sort((a, b) => (b.x - a.x) * ln.dir));   // da frente para trás
    const gapOf = (a, b) => (a.truck || b.truck ? 9.5 : 6.4);
    updaters.push((t, dtt) => {
      const d = Math.min(dtt, 0.1);
      byLane.forEach((list, li) => {
        const ln = lanes[li], jam = F.jam && ln.dir > 0;
        for (let k = 0; k < list.length; k++) {
          const c = list[k], front = k ? list[k - 1] : null;
          // engarrafamento: ondas de anda e para que correm para trás pela fila (cada carro arranca um pouco depois do da frente)
          const want = jam ? 8 * Math.max(0, Math.sin(t * 0.3 + c.x * 0.018 + li)) ** 2 : 17 + li * 1.5;
          c.v += (want - c.v) * Math.min(1, d * (jam ? 1.4 : 0.8));
          c.x += ln.dir * c.v * d;
          if (front && (front.x - c.x) * ln.dir < gapOf(c, front)) { c.x = front.x - ln.dir * gapOf(c, front); c.v = Math.min(c.v, front.v); }   // não encosta no da frente
        }
        const head = list[0];                                                                       // o da frente saiu lá longe: volta pelo fim da fila
        if (head && (ln.dir > 0 ? head.x > L1 : head.x < L0)) {
          list.shift(); const tail = list[list.length - 1];
          head.x = ln.dir > 0 ? Math.min(L0, tail.x - 12) : Math.max(L1, tail.x + 12); list.push(head);
        }
      });
      cars.forEach((c, i) => {
        const len = c.truck ? 7.5 : 4.2, hgt = c.truck ? 2.6 : 0.9;
        o.position.set(c.x, Y + 0.05 + hgt / 2 + 0.25, c.ln.z); o.rotation.set(0, 0, 0); o.scale.set(len, hgt, 1.9); o.updateMatrix(); body.setMatrixAt(i, o.matrix);
        o.position.set(c.x - c.ln.dir * (c.truck ? -2.6 : 0.3), Y + 0.3 + hgt + (c.truck ? -0.6 : 0.3), c.ln.z); o.scale.set(c.truck ? 1.8 : 2.1, c.truck ? 1.1 : 0.62, 1.7); o.updateMatrix(); cab.setMatrixAt(i, o.matrix);
        heads.set([c.x + c.ln.dir * len / 2, Y + 0.9, c.ln.z], i * 3); tails.set([c.x - c.ln.dir * len / 2, Y + 0.9, c.ln.z], i * 3);
      });
      body.instanceMatrix.needsUpdate = cab.instanceMatrix.needsUpdate = true;
      if (hp.visible) { hp.geometry.attributes.position.needsUpdate = true; tp.geometry.attributes.position.needsUpdate = true; }
    });
  }
  /** Elevado do bonde (Trilhos): trilhos, postes da rede aérea com o fio, estação com cobertura e dois bondes indo e vindo. */
  function railLine(F) {
    const z = F.zH, Y = F.y, L0 = -900, L1 = M + 900, tracks = [z - 1.7, z + 1.7];
    for (const tz of tracks) for (const o of [-0.72, 0.72]) I.add('deck', U_CBOX, (L0 + L1) / 2, Y + 0.06, tz + o, L1 - L0, 0.1, 0.12, 0, 0, '#8d949b');
    for (let x = L0; x < L1; x += 30) {                                                             // postes e fios da rede aérea
      I.add('deck', U_CBOX, x, Y + 2.7, z, 0.22, 5.4, 0.22, 0, 0, '#3f4a52');
      I.add('deck', U_CBOX, x, Y + 5.3, z, 0.14, 0.14, 6.4, 0, 0, '#3f4a52');
    }
    for (const tz of tracks) I.add('deck', U_CBOX, (L0 + L1) / 2, Y + 5.1, tz, L1 - L0, 0.05, 0.05, 0, 0, '#2c2c2c');
    const SX = M / 2 + 150;                                                                          // estação (vista do bairro, ao sul)
    I.add('deck', U_CBOX, SX, Y + 0.6, z, 34, 1.0, 2.4, 0, 0, '#cfc6b4');                          // plataforma central
    for (const dx of [-14, -4, 6, 14]) I.add('deck', U_CBOX, SX + dx, Y + 2.3, z, 0.25, 2.6, 0.25, 0, 0, '#9e3a26');
    I.add('deck', U_CBOX, SX, Y + 3.7, z, 34, 0.25, 5.6, 0, 0, '#9e3a26');                         // cobertura vermelha (como as paradas do bairro)
    const sTex = textTexture('ESTAÇÃO TRILHOS', { width: 768, height: 128, bg: '#9e3a26', fg: '#fff3d6', font: 'bold 64px "Trebuchet MS", sans-serif' });
    for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.5), new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.8 })); pl.position.set(SX, Y + 4.7, z + s * 0.2); pl.rotation.y = s > 0 ? 0 : Math.PI; g.add(pl); }
    I.add('deck', U_CBOX, SX, Y + 4.7, z, 9.2, 1.6, 0.3, 0, 0, '#7a2e20');
    const trams = tracks.map((tz, k) => {
      const t = buildTram(); t.position.set(SX + (k ? 300 : -300), Y + 0.1, tz); live.add(dynamic(t));
      return { t, tz, x: SX + (k ? 260 : -380), dir: k ? -1 : 1, v: 0, wait: 0, k };
    });
    updaters.push((time, dtt) => {
      const d = Math.min(dtt, 0.1);
      for (const T of trams) {
        if (T.wait > 0) { T.wait -= d; continue; }
        const toSt = (SX - T.x) * T.dir, end = T.dir > 0 ? L1 - 60 - T.x : T.x - (L0 + 60);
        const stop = !T.served && toSt > 0 ? Math.min(toSt, end) : end;                            // para na estação e no fim da linha
        const want = Math.min(12, Math.sqrt(2 * 1.2 * Math.max(0, stop)) + 0.15);
        T.v += Math.sign(want - T.v) * Math.min(Math.abs(want - T.v), d * (want > T.v ? 1.0 : 2.4));
        T.x += T.dir * T.v * d;
        if (!T.served && toSt <= 0.25) { T.served = true; T.wait = 9; T.v = 0; }                     // na estação: embarque
        else if (end < 0.4) { T.dir = -T.dir; T.wait = 6; T.v = 0; T.served = false; }               // fim da linha: volta
        T.t.position.x = T.x;
      }
    });
  }
  /** Travessia: o canal sai do bairro pelas pontes de pedra (terrain.js) e segue como rio, ao norte e ao sul, entre muros de cais;
   *  as estradas de fora cruzam por pontes; barcos amarrados e uma chata subindo e descendo devagar. */
  function buildRiver() {
    const X0 = river.x0, X1 = river.x1, wc = (X0 + X1) / 2, w = X1 - X0, PATHS_Z = [-PARK_O, M + PARK_O];   // (caminhos do parque linear)
    const spans = [[-RIVER_FAR, 0], [M, M + RIVER_FAR]];
    for (const [a, b] of spans) {
      g.add(waterPlane(X0 + 0.7, X1 - 0.7, a, b));
      quayWall(g, X0, 1, a, b); quayWall(g, X1, -1, a, b);
      g.add(at(box(w, 0.4, b - a, '#2e5f7d'), wc, CANAL_WL - 0.5, (a + b) / 2));
      const roadsZ = P.roads.filter(r => r.axis === 'x' && r.z0 < b && r.z1 > a && r.x0 < X1 && r.x1 > X0).map(r => [r.z0 - 0.5, r.z1 + 0.5])
        .concat(PATHS_Z.filter(z => z > a && z < b).map(z => [z - 1.9, z + 1.9])).sort((p, q) => p[0] - q[0]);   // (e nas passarelas do parque)
      let z0 = a + (a === M ? 0.2 : 0);
      for (const [r0, r1] of roadsZ.concat([[b - (b === 0 ? 0.2 : 0), b]])) {                         // gradil de ferro na beira (aberto nas estradas)
        if (r0 - z0 > 1) {
          for (const x of [X0 + 0.25, X1 - 0.25]) {
            I.add('deck', U_CBOX, x, 1.0, (z0 + r0) / 2, 0.08, 0.08, r0 - z0, 0, 0, '#3a3d44');
            for (let zz = z0; zz < r0; zz += 2.4) I.add('deck', U_CBOX, x, 0.5, zz, 0.07, 1.0, 0.07, 0, 0, '#3a3d44');
          }
          solid(X0 - 0.1, X1 + 0.1, z0, r0);                                                       // (o rio: a van não entra)
        }
        z0 = r1;
      }
    }
    for (const z of PATHS_Z) {                                                                       // passarelas do parque linear (só a pé)
      I.add('deck', U_CBOX, wc, -0.1, z, w + 1.2, 0.25, 3.4, 0, 0, '#cfc6b4');                     // tabuleiro (rente ao caminho)
      I.add('deck', U_CBOX, wc, -0.42, z, w - 0.6, 0.4, 1.6, 0, 0, '#a99f8f');                       // viga
      I.add('deck', U_CBOX, wc, (CANAL_WL - 0.62) / 2 - 0.2, z, 1.1, -CANAL_WL - 0.2, 1.1, 0, 0, '#a99f8f');   // pilar no meio do rio
      for (const s of [-1, 1]) {
        I.add('deck', U_CBOX, wc, 1.0, z + s * 1.6, w + 1.2, 0.07, 0.07, 0, 0, '#3a3d44');          // corrimão (como o gradil)
        for (let x = X0 - 0.5; x <= X1 + 0.51; x += (w + 1) / 5) I.add('deck', U_CBOX, x, 0.5, z + s * 1.6, 0.07, 1.0, 0.07, 0, 0, '#3a3d44');
      }
      for (const x of [X0 - 0.45, X1 + 0.45]) I.add('deck', U_CBOX, x, 0.45, z, 0.5, 0.9, 0.5, 0, 0, '#e0b43a');   // frade: a van não passa
      solid(X0 - 0.7, X1 + 0.7, z - 1.9, z + 1.9).vanOnly = true;
    }
    for (const r of P.roads) if (r.axis === 'x' && r.x0 < X1 && r.x1 > X0) {                        // pontes das estradas de fora
      const zm = (r.z0 + r.z1) / 2, d = r.z1 - r.z0 + 1.2;
      g.add(at(box(w + 1.4, 0.9, d, '#9a958c'), wc, -0.46, zm));
      for (const s of [-1, 1]) {
        g.add(at(box(w + 1.4, 0.9, 0.35, '#d8cfbe'), wc, 0.45, zm + s * (d / 2 - 0.17)));
        for (const px of [wc - w / 4, wc + w / 4]) g.add(at(box(1.8, -CANAL_WL - 0.5, d - 1, '#a99f8f'), px, (CANAL_WL - 1.4) / 2 + 0.1, zm));
      }
    }
    // barcos amarrados nas margens e uma chata subindo e descendo o trecho norte, devagar
    for (let k = 0; k < 10; k++) {
      const north = k % 2 === 0, z = north ? -30 - rand() * 600 : M + 30 + rand() * 600, s = rand() < 0.5 ? 1 : -1;
      if (P.roads.some(r => r.axis === 'x' && z > r.z0 - 6 && z < r.z1 + 6)) continue;
      const b = dynamic(new THREE.Group()), hull = ['#f2efe6', '#c8402f', '#3c8f52', '#2f5f8a'][k % 4];
      b.add(at(box(1.4, 0.5, 3.4, hull), 0, 0, 0)); b.add(at(box(0.98, 0.5, 0.98, hull), 0, 0, 1.75, 0, Math.PI / 4, 0)); b.add(at(box(1.1, 0.06, 3.0, '#8a6440'), 0, 0.12, 0));
      b.position.set(s > 0 ? X0 + 1.65 : X1 - 1.65, CANAL_WL + 0.12, z); b.userData.bob = { y0: CANAL_WL + 0.12, ph: k * 1.3 };
      live.add(b);
    }
    const barge = dynamic(new THREE.Group());
    barge.add(at(box(4.2, 1.0, 13, '#3a3d44'), 0, 0.2, 0)); barge.add(at(box(4.3, 0.2, 13.1, '#c8402f'), 0, 0.75, 0));
    barge.add(at(box(3.2, 0.9, 8, '#b08a5a'), 0, 1.2, 1.2));                                         // carga (madeira)
    barge.add(at(box(2.4, 1.6, 2.4, '#f2efe6'), 0, 1.6, -4.8)); barge.add(at(box(2.6, 0.2, 2.6, '#3a3d44'), 0, 2.5, -4.8));   // casinha do barqueiro
    barge.position.set(wc, CANAL_WL + 0.25, -300); live.add(barge);
    const B = { z: -300, dir: -1 };
    updaters.push((t, dtt) => {
      const d = Math.min(dtt, 0.1);
      B.z += B.dir * 2.2 * d;
      if (B.z < -RIVER_FAR + 60) B.dir = 1; else if (B.z > P.J - P.RW / 2 - 20) B.dir = -1;       // (vira antes da ponte da estrada)
      barge.position.z = B.z; barge.rotation.y = B.dir > 0 ? 0 : Math.PI; barge.position.y = CANAL_WL + 0.25 + Math.sin(t * 0.8) * 0.04;
    });
  }
}

/** Encostas (Bairro 9): morros em volta da cidade (sobem a partir de ~150 m do bairro; a estrada de acesso fica no vale). */
function hillField(M, cx, material) {
  const rand = rng(97), B = [];
  for (let k = 0; k < 14; k++) {
    const a = k / 14 * Math.PI * 2 + rand() * 0.3, d = M / 2 + 300 + rand() * 260;
    B.push({ x: M / 2 + Math.cos(a) * d, z: M / 2 + Math.sin(a) * d, H: 22 + rand() * 38, s: 90 + rand() * 80 });
  }
  const edge = (x, z) => Math.hypot(Math.max(-x, 0, x - M), Math.max(-z, 0, z - M));
  const h = (x, z) => {
    const e = edge(x, z); if (e < 150) return 0;
    let y = 8 * THREE.MathUtils.smoothstep(e, 150, 520);
    for (const b of B) y += b.H * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * b.s * b.s));
    const road = z < 0 ? THREE.MathUtils.smoothstep(Math.abs(x - cx), 24, 70) : 1;               // vale da estrada de acesso
    return y * THREE.MathUtils.smoothstep(e, 150, 260) * road;
  };
  const S = 3400, N = 136, geo = new THREE.PlaneGeometry(S, S, N, N); geo.rotateX(-Math.PI / 2); geo.translate(M / 2, 0, M / 2);
  const p = geo.attributes.position, cols = new Float32Array(p.count * 3), c = new THREE.Color(), lo = new THREE.Color('#6f9e4c'), hi = new THREE.Color('#9fb565');
  for (let i = 0; i < p.count; i++) {
    const y = h(p.getX(i), p.getZ(i)); p.setY(i, y - 0.08);
    c.copy(lo).lerp(hi, Math.min(1, y / 55)); cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.computeVertexNormals();
  const mesh2 = new THREE.Mesh(geo.toNonIndexed(), material);
  mesh2.geometry.computeVertexNormals(); mesh2.castShadow = false; mesh2.receiveShadow = false; mesh2.name = 'arredores:morros';
  return { mesh: mesh2, h };
}

// ---------- Cachoeira (Bairro 23): serras de mata em volta ----------
/** O desfiladeiro corta uma região de serra: a partir de ~100 m do bairro o terreno sobe em morros cobertos de mata, dos dois
 *  lados do vale (o vale do rio e a estrada de acesso ficam planos), e atrás do maciço da cachoeira a serra continua mais alta.
 *  Só cenário (sem colisão): dois terrenos (um de cada lado do desfiladeiro) e árvores instanciadas nas encostas. */
function buildCanyonHills() {
  const g = new THREE.Group(); g.name = 'serra';
  const C = CANAL, M = MAP, gx = (C.x0 + C.x1) / 2, ZS = M + 44, cx = (ENTRANCE.x0 + ENTRANCE.x1) / 2;
  const rand = rng(231), B = [];
  for (let k = 0; k < 18; k++) {
    const a = k / 18 * Math.PI * 2 + rand() * 0.25, d = M / 2 + 330 + rand() * 420;
    B.push({ x: M / 2 + Math.cos(a) * d, z: M / 2 + Math.sin(a) * d, H: 34 + rand() * 60, s: 110 + rand() * 120 });
  }
  B.push({ x: gx - 260, z: ZS + 300, H: 95, s: 190 }, { x: gx + 280, z: ZS + 330, H: 110, s: 210 });   // serra atrás da cachoeira
  const edge = (x, z) => Math.hypot(Math.max(-x, 0, x - M), Math.max(-z, 0, z - M));
  const h = (x, z) => {
    const e = edge(x, z); if (e < 90) return 0;
    let y = 14 * THREE.MathUtils.smoothstep(e, 90, 600);
    for (const b of B) y += b.H * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * b.s * b.s));
    const valley = THREE.MathUtils.smoothstep(Math.abs(x - gx) - (C.x1 - C.x0) / 2, 70, 170);         // vale do rio (as matas das margens ficam no plano)
    const road = z < 0 ? THREE.MathUtils.smoothstep(Math.abs(x - cx), 22, 80) : 1;                     // vale da estrada de acesso
    return y * THREE.MathUtils.smoothstep(e, 90, 220) * valley * road;
  };
  g.userData.h = h;                                                                  // (createWorld: chão de fora para a van e o helicóptero)
  const lo = new THREE.Color('#5f8f45'), hi = new THREE.Color('#87a85a'), rockC = new THREE.Color('#8c7b66'), c = new THREE.Color();
  for (const [x0, x1] of [[-1700, C.x0 - 1], [C.x1 + 1, M + 1700]]) {
    const W = x1 - x0, D = 3400, geo = new THREE.PlaneGeometry(W, D, Math.ceil(W / 26), 130);
    geo.rotateX(-Math.PI / 2); geo.translate((x0 + x1) / 2, 0, M / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)) - 0.08);
    const ng = geo.toNonIndexed(); ng.computeVertexNormals();
    const q = ng.attributes.position, nrm = ng.attributes.normal, cols = new Float32Array(q.count * 3);
    for (let i = 0; i < q.count; i += 3) {                                                         // cor por face: encosta íngreme = pedra
      const y = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3, steep = 1 - nrm.getY(i);
      c.copy(lo).lerp(hi, Math.min(1, y / 70)); if (steep > 0.32) c.lerp(rockC, Math.min(1, (steep - 0.32) * 3));
      for (let k = 0; k < 3; k++) cols.set([c.r, c.g, c.b], (i + k) * 3);
    }
    ng.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
    m.castShadow = m.receiveShadow = false; g.add(m);
  }
  // mata nas encostas (pinheiros e árvores redondas, mais densa no alto)
  const I = instancer(), PINE_C = ['#2f6a3e', '#3a7a48', '#2a5f38'], LEAF_C = ['#4f8f3a', '#3f7d34', '#5a9a44'];
  for (let k = 0, t = 0; k < 2200 && t < 16000; t++) {
    const x = -700 + rand() * (M + 1400), z = -700 + rand() * (M + 1400), y = h(x, z);
    if (y < 2.5 || rand() > Math.min(1, y / 16)) continue;
    const s = 1.6 + rand() * 1.6, ry = rand() * 6;
    if (rand() < 0.6) { I.add('cone', U_CONE, x, y - 0.3, z, 1.9 * s, 4.6 * s, 1.9 * s, 0, ry, PINE_C[k % 3]); }
    else { I.add('trunk', U_TRUNK, x, y - 0.3, z, 0.4 * s, 2.2 * s, 0.4 * s, 0, ry, '#6b4a2e'); I.add('ico', U_ICO, x, y + 2.6 * s, z, 1.8 * s, 1.5 * s, 1.8 * s, rand(), ry, LEAF_C[k % 3]); }
    k++;
  }
  I.build(g);
  // a van não sobe a serra (é só cenário): onde o terreno começa a subir, colisão — a van e o personagem param no pé da encosta em
  // vez de entrarem por baixo dela (o chão de fora para a van e o helicóptero é o da serra: createWorld). Colunas de 8 m dentro do limite do mundo; trechos seguidos viram uma caixa só.
  const CS = 8;
  for (let x = BOUNDS.min; x < BOUNDS.max; x += CS) {
    let run = null;
    for (let z = BOUNDS.min; z < BOUNDS.zMax; z += CS) {
      const up = h(x + CS / 2, z + CS / 2) > 0.9, last = z + CS >= BOUNDS.zMax;
      if (up && run === null) run = z;
      if (run !== null && (!up || last)) { SOLIDS.push({ x0: x, x1: x + CS, z0: run, z1: up ? z + CS : z, serra: true }); run = null; }
    }
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
// Medidas relativas ao centro da praça: gramado de −20,6 a 20,6; caminhos em cruz (largura 3,2), anel em volta do coreto
// (raio 7,5), 4 canteiros redondos (±10,7), 8 árvores, 4 bancos virados para o caminho leste–oeste, a trilha de terra no
// canto sudeste e o carrinho de pipoca no caminho do sul. O paisagismo novo (relva com variação de tom, tufos, flores
// e arbustos em grupinhos, meio-fio nos caminhos) fica todo fora dos caminhos: a circulação continua a mesma.
const PZ = { half: 20.6, path: 1.6, ring: 7.5, bed: 10.7, benchX: 9.5, benchZ: 2.6, cart: [1.0, 10.5, 0.3], seat: 0.42 };
const PZ_TRAIL = [[18.2, 18.4], [16.4, 16.0], [15.2, 12.4], [14.0, 8.8], [11.4, 6.4], [8.6, 5.4], [7.0, 5.0]];
const PZ_TREES = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) PZ_TREES.push([sx * 18.2, sz * 14.2], [sx * 14.2, sz * 18.2]);
const pzRand = (() => { let s = 1234567; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
const segDist = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
/** Ponto (relativo ao centro) livre no gramado: fora dos caminhos, do anel, dos canteiros, árvores, bancos, lixeiras, trilha e carrinho. */
function pzFree(x, z, m = 0.3) {
  const H = PZ.half;
  if (Math.abs(x) > H - 0.2 || Math.abs(z) > H - 0.2) return false;
  if (Math.abs(x) < PZ.path + m || Math.abs(z) < PZ.path + m) return false;
  if (Math.hypot(x, z) < PZ.ring + m) return false;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (Math.hypot(x - sx * PZ.bed, z - sz * PZ.bed) < 2.6 + m) return false;
    if (Math.abs(x - sx * PZ.benchX) < 1.7 + m && Math.abs(z - sz * PZ.benchZ) < 0.6 + m) return false;
    if (Math.hypot(x - sx * 11.6, z - sz * 2.6) < 0.4 + m) return false;
  }
  for (const [tx, tz] of PZ_TREES) if (Math.hypot(x - tx, z - tz) < 0.55 + m) return false;
  for (let i = 0; i + 1 < PZ_TRAIL.length; i++) if (segDist(x, z, PZ_TRAIL[i], PZ_TRAIL[i + 1]) < 1.35 + m) return false;
  return true;
}
const PZ_SHRUBS = [];                                     // arbustos baixos em grupinhos: cantos da cerca e dos dois lados das entradas
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  if (!(sx > 0 && sz > 0)) PZ_SHRUBS.push([sx * 19.2, sz * 19.3, 0.62], [sx * 18.3, sz * 19.6, 0.5], [sx * 19.6, sz * 18.3, 0.48]);   // (o canto sudeste é o da trilha)
  PZ_SHRUBS.push([sx * 3.7, sz * 19.6, 0.5], [sx * 4.6, sz * 19.7, 0.4], [sz * 19.6, sx * 3.7, 0.5], [sz * 19.7, sx * 4.6, 0.4]);
}

function buildPlaza() {
  const P = PLAZA, g = new THREE.Group();
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2, w = P.x1 - P.x0, d = P.z1 - P.z0;
  g.add(at(box(w, 0.17, d, '#d4cdbb'), cx, 0.085, cz));                       // calçada em volta
  g.add(at(box(w - 1.6, 0.19, d - 1.6, '#80bc57'), cx, 0.095, cz));           // gramado (base)
  {                                                                            // relva por cima, 1 cm acima: manchas largas e suaves de tom
    const W = w - 1.6, D = d - 1.6, geo = new THREE.PlaneGeometry(W, D, 48, 48);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    const A = new THREE.Color('#78b451'), B = new THREE.Color('#93c966'), Y = new THREE.Color('#a2c562'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const n = 0.5 * Math.sin(x * 0.21 + z * 0.13) + 0.35 * Math.sin(x * 0.07 - z * 0.17 + 1.3) + 0.25 * Math.sin((x + z) * 0.33 + 2.1);
      c.copy(A).lerp(B, Math.min(1, Math.max(0, (n + 1.1) / 2.2)));
      const y = Math.sin(x * 0.11 + 4.0) * Math.sin(z * 0.09 + 1.0); if (y > 0.55) c.lerp(Y, (y - 0.55) * 1.4);   // pontos mais secos, discretos
      const edge = Math.max(Math.abs(x), Math.abs(z)); if (edge > W / 2 - 1.2) c.multiplyScalar(0.93);   // grama mais densa junto à cerca
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.add(at(new THREE.Mesh(geo, mat('#ffffff', { vertexColors: true })), cx, 0.2, cz));
  }
  // caminhos em cruz e em volta do coreto
  g.add(at(box(w - 1.6, 0.22, 3.2, '#e2d6bb'), cx, 0.11, cz));
  g.add(at(box(3.2, 0.22, d - 1.6, '#e2d6bb'), cx, 0.11, cz));
  g.add(at(cyl(7.5, 7.5, 0.24, '#e2d6bb', 24), cx, 0.12, cz));
  // meio-fio de pedra nas bordas dos caminhos e do anel (3 cm acima do piso; não atrapalha quem anda)
  const CURB = '#c4b79a';
  for (const s of [-1, 1]) for (const e of [-1, 1]) {
    const a = Math.sqrt(7.56 * 7.56 - 1.67 * 1.67), L = PZ.half - a, m = (PZ.half + a) / 2;
    g.add(at(box(0.14, 0.07, L, CURB), cx + s * 1.67, 0.215, cz + e * m));    // braços norte–sul
    g.add(at(box(L, 0.07, 0.14, CURB), cx + e * m, 0.215, cz + s * 1.67));    // braços leste–oeste
  }
  for (let q = 0; q < 4; q++) {                                                // anel: 4 arcos entre os braços
    const a0 = Math.asin(1.67 / 7.56) + q * Math.PI / 2, a1 = (q + 1) * Math.PI / 2 - Math.asin(1.67 / 7.56), n = 12;
    for (let k = 0; k < n; k++) {
      const a = a0 + (a1 - a0) * (k + 0.5) / n, len = 7.56 * (a1 - a0) / n + 0.02;
      g.add(at(box(len, 0.07, 0.14, CURB), cx + Math.cos(a) * 7.56, 0.235, cz + Math.sin(a) * 7.56, 0, -a - Math.PI / 2, 0));
    }
  }
  // coreto no centro: base, colunas e telhado vermelho e branco
  g.add(at(cyl(4.6, 4.9, 0.7, '#f3ece0', 16), cx, 0.45, cz));
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    g.add(at(cyl(0.18, 0.18, 3.2, '#ffffff', 8), cx + Math.cos(a) * 4, 2.4, cz + Math.sin(a) * 4));
  }
  g.add(at(cone(5.4, 2.4, '#d8473a', 16), cx, 5.1, cz));
  g.add(at(cone(1.2, 1.2, '#ffffff', 12), cx, 6.6, cz));
  // quatro canteiros floridos, árvores (com coroa de terra e folhagem na base), bancos e postes nos quadrantes
  const FLOWERS = ['#ff6fa5', '#ffd12a', '#ffffff', '#9b5de5'];
  const bedFlowers = [];                                                       // [x, z (relativos ao centro), cor, chão, altura, tamanho]
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const qx = cx + sx * w / 4, qz = cz + sz * d / 4;
    g.add(at(cyl(2.4, 2.6, 0.5, '#8a5a36', 14), qx, 0.35, qz));               // canteiro
    g.add(at(cyl(2.25, 2.25, 0.06, '#5a3c22', 14), qx, 0.6, qz));              // terra
    for (let k = 0; k < 7; k++) {                                              // folhagem baixa em volta
      const a = k / 7 * Math.PI * 2 + sx; const m = at(mesh(new THREE.IcosahedronGeometry(0.62, 1), '#4f9a45'), qx + Math.cos(a) * 1.55, 0.78, qz + Math.sin(a) * 1.55, a, a * 2, 0);
      m.scale.set(1.1, 0.6, 1.0); g.add(m);
    }
    for (let k = 0; k < 34; k++) {                                             // flores por cima, em manchas de cor (instanciadas lá embaixo)
      const a = k * 2.399 + sz, r = 0.52 + (k % 6) * 0.15;                    // (entre o arbustinho do meio e a folhagem da borda)
      bedFlowers.push([qx - cx + Math.cos(a) * r, qz - cz + Math.sin(a) * r, FLOWERS[Math.floor(k / 9 + (sx > 0 ? 1 : 0)) % 4], 0.63, 1.02 + (k % 4) * 0.08, 2.0 + (k % 3) * 0.3]);
    }
    { const m = at(mesh(new THREE.IcosahedronGeometry(0.42, 1), '#3f8f3a'), qx, 1.12, qz); m.scale.set(1, 1.45, 1); g.add(m); }   // arbustinho podado no meio
    g.add(at(cyl(0.07, 0.09, 0.3, '#6b4526', 6), qx, 0.72, qz));
    for (const [tx, tz] of [[sx * 7.5, sz * 3.5], [sx * 3.5, sz * 7.5]]) {     // árvores
      g.add(at(cyl(0.35, 0.45, 2.4, '#6b4526', 6), qx + tx, 1.3, qz + tz));
      g.add(at(sphere(2.1, '#3f8f3a', 8, 6), qx + tx, 3.6, qz + tz));
      g.add(at(cyl(0.95, 1.0, 0.03, '#5e4128', 12), qx + tx, 0.215, qz + tz));   // coroa de terra em volta do tronco
    }
    // banco de ripas de madeira com laterais de ferro, virado para o caminho (assento a 0,42 do gramado)
    const bx = cx + sx * PZ.benchX, bz = cz + sz * PZ.benchZ, ang = sz > 0 ? Math.PI : 0;
    const bench = new THREE.Group(); bench.position.set(bx, 0.2, bz); bench.rotation.y = ang;
    const WOOD = '#b07a46', IRON = '#2f3436';
    for (const z of [-0.17, 0, 0.17]) bench.add(at(box(2.9, 0.05, 0.13, WOOD), 0, 0.395, z));
    for (const y of [0.6, 0.79]) bench.add(at(box(2.9, 0.12, 0.04, WOOD), 0, y, -0.29, -0.12, 0, 0));
    for (const x of [-1.3, 1.3]) {
      bench.add(at(box(0.07, 0.37, 0.07, IRON), x, 0.185, 0.19));
      bench.add(at(box(0.07, 0.92, 0.07, IRON), x, 0.45, -0.27, -0.12, 0, 0));
      bench.add(at(box(0.07, 0.06, 0.52, IRON), x, 0.34, -0.03));
      bench.add(at(box(0.08, 0.05, 0.46, IRON), x, 0.62, -0.03));
      bench.add(at(box(0.06, 0.22, 0.06, IRON), x, 0.51, 0.17));
    }
    g.add(bench);
    // poste de luz no canto do caminho
    const px = cx + sx * 2.4, pz = cz + sz * (d / 2 - 2.2);
    g.add(at(cyl(0.12, 0.15, 3.6, '#3a3d44', 6), px, 1.9, pz));
    g.add(at(sphere(0.4, '#fff3b0', 8, 6, { emissive: '#fff0a0', emissiveIntensity: 0.6 }), px, 3.9, pz));
  }
  // trilha de terra que o pessoal abriu cortando o gramado (praça usada: atalho da esquina até o coreto). Passa entre as
  // duas árvores do canto e contorna o canteiro pelo lado de fora.
  {
    const pts = PZ_TRAIL.map(([a, b]) => [cx + a, cz + b]);
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
  // carrinho de pipoca no caminho do sul (o pipoqueiro fica atrás dele, do lado do coreto; a placa olha para quem vem da rua)
  {
    const [ox, oz, ry] = PZ.cart, k = new THREE.Group(); k.position.set(cx + ox, 0.22, cz + oz); k.rotation.y = ry;
    k.add(at(box(1.3, 0.75, 0.8, '#d8312a'), 0, 0.75, 0)); k.add(at(box(1.34, 0.12, 0.84, '#f4f1ea'), 0, 1.16, 0));
    k.add(at(box(1.1, 0.7, 0.62, '#fff6d8', { emissive: '#5a4a20', emissiveIntensity: 0.4 }), 0, 1.57, 0));   // vitrine de pipoca
    for (let q = 0; q < 12; q++) k.add(at(sphere(0.09, '#fffbe8', 5, 3), -0.4 + (q % 4) * 0.27, 1.32 + Math.floor(q / 4) * 0.1, -0.15 + (q % 3) * 0.15));
    k.add(at(box(1.2, 0.06, 0.7, '#d8312a'), 0, 1.95, 0));
    k.add(at(cyl(0.03, 0.03, 1.0, '#5a5f66', 6), 0, 2.45, 0)); k.add(at(cone(1.0, 0.45, '#f4f1ea', 8), 0, 3.05, 0)); k.add(at(cone(1.02, 0.12, '#d8312a', 8), 0, 2.86, 0));
    for (const s of [-1, 1]) k.add(at(cyl(0.3, 0.3, 0.08, '#2a2a2a', 12), s * 0.5, 0.3, 0.42, Math.PI / 2, 0, 0));
    k.add(at(box(0.06, 0.06, 0.9, '#5a5f66'), -0.75, 0.95, -0.2, 0, 0, 0.2));
    k.add(at(cyl(0.035, 0.035, 0.12, '#5a5f66', 6), 0.6, 1.27, -0.36, 0, 0, Math.PI / 2));   // eixo da manivela (a manivela gira com o pipoqueiro)
    k.add(at(cyl(0.2, 0.17, 0.2, '#b58a4e', 10), 0.42, 1.32, 0.18)); k.add(at(cyl(0.16, 0.16, 0.06, '#f4f1ea', 10), 0.42, 1.43, 0.18));   // cestinho com saquinhos prontos
    for (let q = 0; q < 3; q++) k.add(at(cyl(0.05, 0.04, 0.18, '#f4f1ea', 6), 0.36 + q * 0.06, 1.5, 0.15 + (q % 2) * 0.06));
    const pt = textTexture('PIPOCA', { width: 256, height: 80, bg: '#f4f1ea', fg: '#d8312a', font: 'bold 56px "Trebuchet MS", sans-serif' });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.3), new THREE.MeshStandardMaterial({ map: pt, roughness: 0.8 })); pl.position.set(0, 0.8, 0.43); k.add(pl);
    g.add(k);
  }
  // cerquinha baixa em volta do gramado (com aberturas nos caminhos)
  // (moirões com capinha e dois corrimãos, no lugar da faixa branca maciça; mesma linha e mesma colisão de antes)
  const fenceCol = '#ffffff', FCAP = '#e4e0d6';
  const fenceRun = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 1.15)), ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let k = 0; k <= n; k++) {
      const x = x0 + (x1 - x0) * k / n, z = z0 + (z1 - z0) * k / n;
      g.add(at(box(0.1, 0.52, 0.1, fenceCol), x, 0.46, z, 0, ry, 0));
      g.add(at(box(0.14, 0.04, 0.14, FCAP), x, 0.74, z, 0, ry, 0));
    }
    for (const y of [0.42, 0.63]) g.add(at(box(L, 0.06, 0.05, fenceCol), (x0 + x1) / 2, y, (z0 + z1) / 2, 0, ry, 0));
  };
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
    const len = w / 2 - 3.2, a = 1.8, b = 1.8 + len;
    fenceRun(cx + sx * a, cz + sz * (d / 2 - 1.0), cx + sx * b, cz + sz * (d / 2 - 1.0));
    fenceRun(cx + sx * (w / 2 - 1.0), cz + sz * a, cx + sx * (w / 2 - 1.0), cz + sz * b);
  }
  // tufos de grama mais alta (junto à cerca e em pequenos grupos), flores em grupinhos e arbustos baixos: instanciados
  {
    const tuft = new THREE.Group();
    for (const [x, z, r, h, ry] of [[0, 0, 0.07, 0.3, 0], [0.08, 0.03, 0.06, 0.24, 0.6], [-0.06, 0.05, 0.06, 0.22, 1.2], [0.02, -0.08, 0.05, 0.2, 2]]) tuft.add(at(cone(r, h, '#5f9a3f', 4), x, h / 2, z, 0.12 * Math.sin(ry * 3), ry, 0.15 * Math.cos(ry * 2)));
    const spots = [];
    const tryAdd = (x, z) => { if (pzFree(x, z, 0.15)) spots.push([x, z]); };
    for (let i = -19.6; i <= 19.6; i += 0.9 + pzRand() * 0.6) for (const e of [-1, 1]) { tryAdd(i, e * (19.75 + pzRand() * 0.4)); tryAdd(e * (19.75 + pzRand() * 0.4), i); }   // ao pé da cerca
    for (let k = 0; k < 46; k++) {                                              // grupinhos espalhados (3 a 6 tufos)
      const x0 = (pzRand() * 2 - 1) * 19, z0 = (pzRand() * 2 - 1) * 19; if (!pzFree(x0, z0, 0.4)) continue;
      const n = 3 + Math.floor(pzRand() * 4); for (let q = 0; q < n; q++) tryAdd(x0 + (pzRand() - 0.5) * 1.1, z0 + (pzRand() - 0.5) * 1.1);
    }
    for (const [tx, tz] of PZ_TREES) for (let q = 0; q < 5; q++) { const a = q * 1.26 + tx; tryAdd(tx + Math.cos(a) * 1.15, tz + Math.sin(a) * 1.15); }   // em volta da coroa das árvores
    const tg = vcMerge(tuft).geometry;
    const tm = new THREE.InstancedMesh(tg, mat('#ffffff', { vertexColors: true }), spots.length);
    const o = new THREE.Object3D(), cc = new THREE.Color();
    spots.forEach(([x, z], i) => { o.position.set(cx + x, 0.2, cz + z); o.rotation.set(0, pzRand() * 6.28, 0); o.scale.setScalar(0.8 + pzRand() * 0.6); o.updateMatrix(); tm.setMatrixAt(i, o.matrix); tm.setColorAt(i, cc.setHSL(0.27 + pzRand() * 0.05, 0.45, 0.5 + pzRand() * 0.12)); });
    tm.castShadow = false; tm.receiveShadow = true; tm.userData.dynamic = true; g.add(tm);
    // flores em grupinhos (junto às entradas do anel e ao pé das árvores, nos cantos da cerca)
    const fl = [];
    const cluster = (x0, z0, n, cols) => { for (let q = 0; q < n; q++) { const a = q * 2.4 + x0, r = 0.18 + (q % 3) * 0.17, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (pzFree(x, z, 0.05)) fl.push([x, z, cols[q % cols.length]]); } };
    for (let q = 0; q < 4; q++) { const a = Math.PI / 4 + q * Math.PI / 2; cluster(Math.cos(a) * 8.6, Math.sin(a) * 8.6, 9, [FLOWERS[q % 4], FLOWERS[(q + 1) % 4], '#ffffff']); }
    for (const [tx, tz] of PZ_TREES) cluster(tx + (tx > 0 ? -1.3 : 1.3), tz, 5, ['#ffd12a', '#ff8a3a']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cluster(sx * 17.6, sz * 19.2, 6, ['#ff6fa5', '#ffffff', '#9b5de5']);
    // flor = corola de 5 pétalas (disco recortado, virado para cima, levemente côncavo) com o miolo amarelo saltado; a cor da
    // instância tinge as pétalas (o miolo fica amarelo/laranja). Antes eram bolinhas facetadas que, de perto, pareciam pedras.
    const flowerGeo = (() => {
      const N = 30, pos = [], col = [], P = new THREE.Color('#ffffff'), C = new THREE.Color('#f6c13a');
      const rr = a => 0.034 + 0.05 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.7);   // contorno das pétalas
      for (let k = 0; k < N; k++) {
        const a0 = k / N * Math.PI * 2, a1 = (k + 1) / N * Math.PI * 2, r0 = rr(a0), r1 = rr(a1);
        pos.push(0, 0.006, 0, Math.cos(a1) * r1, 0.012 + r1 * 0.12, -Math.sin(a1) * r1, Math.cos(a0) * r0, 0.012 + r0 * 0.12, -Math.sin(a0) * r0);
        for (let q = 0; q < 3; q++) col.push(P.r, P.g, P.b);
      }
      for (let k = 0; k < 8; k++) {                                            // miolo: cone baixo de 8 faces, 1 cm acima das pétalas
        const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2, r = 0.024;
        pos.push(0, 0.03, 0, Math.cos(a1) * r, 0.018, -Math.sin(a1) * r, Math.cos(a0) * r, 0.018, -Math.sin(a0) * r);
        for (let q = 0; q < 3; q++) col.push(C.r, C.g, C.b);
      }
      const ge = new THREE.BufferGeometry();
      ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      ge.computeVertexNormals(); return ge;
    })();
    // as do gramado (chão 0,2) e as dos canteiros (terra a 0,63): uma malha instanciada para todas, mais os cabinhos
    const all = fl.map(([x, z, c]) => [x, z, c, 0.2, 0.33 + pzRand() * 0.1, 1.35 + pzRand() * 0.55]).concat(bedFlowers);
    const fm = new THREE.InstancedMesh(flowerGeo, mat('#ffffff', { vertexColors: true, flatShading: false, side: THREE.DoubleSide }), all.length);
    all.forEach(([x, z, c, , y, s], i) => { o.position.set(cx + x, y, cz + z); o.rotation.set((pzRand() - 0.5) * 0.5, pzRand() * 6.28, (pzRand() - 0.5) * 0.5); o.scale.setScalar(s); o.updateMatrix(); fm.setMatrixAt(i, o.matrix); fm.setColorAt(i, cc.set(c)); });
    const stem = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.014, 1, 4), mat('#4f8a35'), all.length);
    all.forEach(([x, z, , g0], i) => { fm.getMatrixAt(i, o.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale); const h = o.position.y - g0; o.position.y = g0 + h / 2; o.rotation.set(0, 0, 0); o.scale.set(1.3, h, 1.3); o.updateMatrix(); stem.setMatrixAt(i, o.matrix); });
    for (const m of [fm, stem]) { m.castShadow = false; m.receiveShadow = true; m.userData.dynamic = true; g.add(m); }
    // arbustos baixos (folhagem redonda, dois tons)
    const sm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', { flatShading: true }), PZ_SHRUBS.length);
    PZ_SHRUBS.forEach(([x, z, r], i) => { o.position.set(cx + x, 0.2 + r * 0.55, cz + z); o.rotation.set(0, i * 1.3, 0); o.scale.set(r * 1.1, r * 0.85, r); o.updateMatrix(); sm.setMatrixAt(i, o.matrix); sm.setColorAt(i, cc.set(i % 3 ? '#4f8f3e' : '#5d9e48')); });
    sm.castShadow = true; sm.receiveShadow = true; sm.userData.dynamic = true; g.add(sm);
  }
  return g;
}

// ---------- Vida na praça (Bairro 2) ----------
// Gente usando a praça, no estilo dos moradores (buildFigure): o casal no banco (Seu Nestor lê o jornal, Dona Zilá faz
// tricô), Dona Ermínia joga milho para os pombos (que correm para o milho e se assustam com o cachorro), Seu Toninho no
// carrinho de pipoca (gira a manivela, enche saquinhos, chama a freguesia, limpa o balcão) e o Davi passeando com o
// Paçoca por caminhos variados (para, olha, espera o cachorro farejar; a guia vai da mão dele à coleira). Dá para
// conversar com todos a pé (E perto: nearTalk/talk/endTalk, o mesmo fluxo do Medieval); as conversas não são dicas e não
// mexem nas entregas. Ritmos e pausas diferentes para cada um (nada sincronizado).
function pzDog() {                                                   // Paçoca: vira-lata caramelo, uma malha com esqueleto
  const C = '#d29a58', L = '#f1dcb4', D = '#9a6a3a', G2 = partGeo, M = partMatrix;
  const root = new THREE.Bone(); root.name = 'dog';
  const body = new THREE.Bone(); body.position.set(0, 0.42, 0); root.add(body);
  const head = new THREE.Bone(); head.position.set(0, 0.16, 0.36); body.add(head);
  const tail = new THREE.Bone(); tail.position.set(0, 0.1, -0.34); body.add(tail);
  const legs = [[-0.11, 0.24], [0.11, 0.24], [-0.11, -0.24], [0.11, -0.24]].map(([x, z]) => { const b = new THREE.Bone(); b.position.set(x, -0.08, z); body.add(b); return b; });
  const parts = [], P = (bone, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => parts.push({ bone, geo, color, m: M(x, y, z, rx, ry, rz, sx, sy, sz) });
  P(body, G2.box(0.32, 0.3, 0.66), C, 0, 0, 0); P(body, G2.box(0.24, 0.2, 0.06), L, 0, -0.02, 0.33);
  P(body, G2.box(0.26, 0.26, 0.26), C, 0, 0.1, 0.3, -0.5, 0, 0);
  P(head, G2.box(0.28, 0.25, 0.28), C, 0, 0.04, 0.06); P(head, G2.box(0.18, 0.13, 0.18), L, 0, -0.03, 0.24); P(head, G2.box(0.07, 0.06, 0.05), '#1d1d1d', 0, 0.02, 0.33);
  for (const s of [-1, 1]) { P(head, G2.box(0.045, 0.05, 0.03), '#1d1d1d', s * 0.08, 0.1, 0.2); P(head, G2.box(0.06, 0.16, 0.11), D, s * 0.15, 0.08, 0.0, 0, 0, s * 0.35); }
  P(head, G2.cyl(0.155, 0.155, 0.05, 10), '#c8312a', 0, -0.08, -0.06, 0.4, 0, 0);   // coleira vermelha
  P(tail, G2.box(0.07, 0.07, 0.3), C, 0, 0.08, -0.12, -0.7, 0, 0); P(tail, G2.box(0.075, 0.075, 0.08), L, 0, 0.19, -0.24, -0.7, 0, 0);
  for (const b of legs) { P(b, G2.box(0.09, 0.32, 0.1), C, 0, -0.14, 0); P(b, G2.box(0.11, 0.05, 0.13), L, 0, -0.31, 0.02); }
  const mesh = skinnedFromParts(root, parts);
  const collar = new THREE.Object3D(); collar.position.set(0, -0.06, -0.02); head.add(collar);
  return { mesh, body, head, tail, legs, collar };
}
function buildPlazaLife() {
  const P0 = PLAZA, cx = (P0.x0 + P0.x1) / 2, cz = (P0.z0 + P0.z1) / 2;
  const group = dynamic(new THREE.Group()); group.name = 'plaza-life';
  const GY = 0.2, TALK_R = 2.3;
  const ups = [], npcs = [];
  let player = null, playerT = 9;                                    // posição do jogador a pé (vem de nearTalk), há quanto tempo
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
  const W = (x, z) => [cx + x, cz + z];
  /** Pessoa conversável: P (figura), id (falas), pos (mundo). look(px, pz): para onde olhar quando o jogador está perto. */
  const addNpc = (id, P, x, z) => { const n = { id, P, x, z, plaza: true, talking: false, talkT: 0, mem: {}, now: () => null, near: 0, root: P.root }; npcs.push(n); group.add(P.root); return n; };
  const sideYaw = (n, ry) => { const p = player; return p ? wrapA(Math.atan2(p.x - n.x, p.z - n.z) - ry) : 0; };
  const playerNear = (n, r) => player && playerT < 0.5 && Math.hypot(player.x - n.x, player.z - n.z) < r;
  // o banco: [x, z, de frente para +z (0) ou −z (PI)]; uma pessoa sentada a dx do meio
  const seatAt = (sx, sz, dx) => { const ry = sz > 0 ? Math.PI : 0, f = sz > 0 ? -1 : 1; return { x: cx + sx * PZ.benchX + dx * (sz > 0 ? -1 : 1), z: cz + sz * PZ.benchZ + 0.1 * f, ry }; };

  // ---- o casal no banco do nordeste (de frente para o sul) ----
  const sN = seatAt(1, -1, -0.72), sZ = seatAt(1, -1, 0.74);
  const nestor = addNpc('nestor', buildFigure({ k: 21, skin: '#e8b98f', hair: '#d6d6d6', hairStyle: 'bald', top: '#f1ece0', cardigan: '#6f7f8f', pants: '#4a4a52', shoes: '#4a3022', glasses: true, mustache: '#d0d0d0', brows: '#cfcfcf', old: true }), sN.x, sN.z);
  const zila = addNpc('zila', buildFigure({ k: 22, skin: '#f1c9a5', hair: '#e4e4e4', hairStyle: 'bun', top: '#b5657a', dress: '#5a4a6a', stockings: '#d9c3ad', shoes: '#5a3b2a', glasses: '#8a6a4a', old: true }), sZ.x, sZ.z);
  for (const [n, s] of [[nestor, sN], [zila, sZ]]) { n.P.root.position.set(s.x, GY, s.z); n.P.root.rotation.y = s.ry; n.ry = s.ry; n.st = { mode: 'sit', seat: PZ.seat, t: 0 }; n.look = 0; }
  const paper = nestor.P.give(figureItem('paper'), 'body'), knit = zila.P.give(figureItem('knit', { color: '#c8507a' }), 'body');
  const ball = figureItem('ball', { color: '#c8507a' }); { const b = seatAt(1, -1, 1.25); ball.position.set(b.x, GY + PZ.seat, b.z); group.add(ball); }
  let pageT = 6, lowerT = 14, lowered = 0, chatK = 0;
  ups.push((t, dt) => {
    // Seu Nestor: lê (cabeça baixa), vira a página de vez em quando; às vezes abaixa o jornal e comenta com a Zilá
    const n = nestor, P = n.P; n.st.t = t;
    pageT -= dt; lowerT -= dt;
    if (lowerT < 0) { lowered = 1; if (lowerT < -5) { lowerT = 14 + Math.random() * 12; } } else lowered = 0;
    chatK += ((lowered || n.talking ? 1 : 0) - chatK) * Math.min(1, dt * 2.5);
    const flip = pageT < 0 ? Math.min(1, -pageT / 0.9) : 0; if (pageT < -0.9) pageT = 9 + Math.random() * 8;
    const lookP = n.talking || playerNear(n, 4) ? sideYaw(n, n.ry) : chatK > 0.5 ? 1.1 : 0;
    n.look += (THREE.MathUtils.clamp(lookP, -1.2, 1.2) - n.look) * Math.min(1, dt * 3);
    animatePerson(P, { mode: 'sit', seat: PZ.seat, t, lookYaw: n.look, lookPitch: 0.32 * (1 - chatK) * (n.talking ? 0 : 1), talk: (n.talking && n.talkT < 2.6) || (lowered && lowerT > -3.5 && lowerT < -1) ? 1 : 0 });
    const py = 0.92 - 0.2 * chatK, pz = 0.38 - 0.04 * chatK;
    paper.position.set(0, py, pz); paper.rotation.set(-0.3 + 0.4 * chatK, 0, 0);
    const gx = 0.3 - 0.55 * Math.sin(flip * Math.PI) * 0.5;
    reach(P, -1, -0.3, py - 0.05, pz + 0.05, -0.6, -0.6, -0.2);
    reach(P, 1, flip > 0 ? 0.3 - 0.5 * Math.sin(flip * Math.PI / 2) : gx, py - 0.05 + 0.08 * Math.sin(flip * Math.PI), pz + 0.05 + 0.06 * Math.sin(flip * Math.PI), 0.6, -0.6, -0.2);
    n.talkT += dt;
    // Dona Zilá: tricô (as agulhas se mexem), olha o movimento da praça; responde ao marido quando ele comenta
    const z = zila, Q = z.P; z.st.t = t;
    const people = Math.sin(t * 0.17 + 2) > 0.55, lookZ = z.talking || playerNear(z, 4) ? sideYaw(z, z.ry) : chatK > 0.5 ? -1.1 : people ? 0.6 * Math.sin(t * 0.4) : 0;
    z.look += (THREE.MathUtils.clamp(lookZ, -1.2, 1.2) - z.look) * Math.min(1, dt * 2.5);
    const busy = !(z.talking || chatK > 0.5 || people);
    animatePerson(Q, { mode: 'sit', seat: PZ.seat, t: t + 3, lookYaw: z.look, lookPitch: busy ? 0.38 : 0.05, talk: (z.talking && z.talkT < 2.6) || (lowered && lowerT > -1.6 && lowerT < 0) ? 1 : 0 });
    Q.b.waist.rotation.x += 0.12;
    const kk = Math.sin(t * 7.5) * (busy ? 1 : 0.15);
    knit.position.set(0, 0.84, 0.36); knit.rotation.set(-0.5, 0, 0.05 * kk);
    reach(Q, -1, -0.14 + 0.02 * kk, 0.86 + 0.02 * kk, 0.44, -0.6, -0.6, -0.2);
    reach(Q, 1, 0.14 - 0.02 * kk, 0.86 - 0.02 * kk, 0.44, 0.6, -0.6, -0.2);
    z.talkT += dt;
  });

  // ---- Dona Ermínia e os pombos (banco do sudoeste, de frente para o norte) ----
  const sE = seatAt(-1, 1, 0.2);
  const erm = addNpc('erminia', buildFigure({ k: 23, skin: '#c98a62', hair: '#8a8a8a', hairStyle: 'bun', top: '#5a8a6a', cardigan: '#d9c09a', dress: '#8a6a4a', stockings: '#b98c6a', shoes: '#3a2a20', old: true, brows: '#8a8a8a' }), sE.x, sE.z);
  erm.P.root.position.set(sE.x, GY, sE.z); erm.P.root.rotation.y = sE.ry; erm.ry = sE.ry; erm.st = { mode: 'sit', seat: PZ.seat, t: 0 }; erm.look = 0;
  const corn = erm.P.give(figureItem('corn'), 'L');
  const pg = new THREE.Group();                                        // pombo (instanciado)
  // corpo arredondado, peito mais claro, pescoço furta-cor, asas com as duas faixas escuras, cauda de ponta escura,
  // bico, olhinhos laranja e pés rosados (liso, como as pessoas; antes eram 4 peças facetadas)
  const pgS = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, ws = 12, hs = 9) => { const m = at(sphere(r, c, ws, hs), x, y, z); m.scale.set(sx, sy, sz); pg.add(m); };
  pgS(0.13, '#9aa0a9', 0, 0.15, -0.01, 1, 0.82, 1.42);                                    // corpo
  pgS(0.1, '#b9bdc4', 0, 0.14, 0.08, 1, 0.85, 1.0);                                       // peito
  pgS(0.07, '#6e8a80', 0, 0.225, 0.11, 1.05, 1.1, 0.95);                                  // pescoço (verde-arroxeado)
  pgS(0.07, '#5f6673', 0, 0.285, 0.15);                                                   // cabeça
  for (const sd of [-1, 1]) {
    pgS(0.085, '#8a909a', sd * 0.085, 0.165, -0.05, 0.42, 0.7, 1.55);                     // asa dobrada
    for (const zz of [-0.04, -0.1]) pg.add(at(box(0.012, 0.025, 0.055, '#3f444c'), sd * 0.122, 0.16, zz));   // faixas escuras da asa
    pgS(0.012, '#e07a2a', sd * 0.045, 0.3, 0.2, 1, 1, 1, 6, 4);                          // olho
    pg.add(at(cyl(0.008, 0.008, 0.07, '#d47b7b', 4), sd * 0.04, 0.035, 0.0));             // perna
  }
  pg.add(at(cone(0.022, 0.055, '#d9a06a', 6), 0, 0.27, 0.235, Math.PI / 2, 0, 0));        // bico
  pg.add(at(box(0.11, 0.025, 0.15, '#7c828c'), 0, 0.16, -0.21, 0.32, 0, 0));             // cauda
  pg.add(at(box(0.112, 0.027, 0.04, '#3f444c'), 0, 0.142, -0.27, 0.32, 0, 0));           // ponta escura da cauda
  const NP = 9, pigeons = dynamic(new THREE.InstancedMesh(vcMerge(pg).geometry, mat('#ffffff', { vertexColors: true, flatShading: false }), NP));
  pigeons.castShadow = true; pigeons.frustumCulled = false; group.add(pigeons);
  { const tint = ['#ffffff', '#d2d5db', '#f4ece4', '#ffffff', '#c3c7cf', '#ffffff', '#efe7e0', '#dadde2', '#ffffff'], c = new THREE.Color();
    for (let i = 0; i < NP; i++) pigeons.setColorAt(i, c.set(tint[i])); }             // cada pombo com um tom
  const home = { x: sE.x, z: sE.z - 1.9 };                             // na frente dela, no caminho
  const birds = [...Array(NP)].map((_, i) => ({ x: home.x - 1.4 + (i % 5) * 0.7, z: home.z + 0.3 - Math.floor(i / 5) * 0.5, a: i * 1.9, ph: i * 0.77, sp: 0.8 + (i % 3) * 0.25, fly: 0, fx: 0, fz: 0, tx: 0, tz: 0, y: 0, peck: 0 }));
  const grains = [], NG = 10;                                          // milho jogado (voando ou no chão)
  const gm = dynamic(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), mat('#f2c23a'), NG)); gm.count = 0; gm.frustumCulled = false; group.add(gm);
  const po = new THREE.Object3D();
  let tossT = 3, scareT = 0;
  erm.now = () => (scareT > 0 ? 'scare' : null);
  ups.push((t, dt) => {
    const n = erm, P = n.P; n.st.t = t; n.talkT += dt;
    // jogar milho: mão direita no saquinho, braço para a frente e solta; o milho voa e cai no caminho
    if (!n.talking) tossT -= dt;
    const u = tossT < 0 ? -tossT : 0;
    if (tossT < -1.6) tossT = 6 + Math.random() * 6;
    const lookE = n.talking || playerNear(n, 4) ? sideYaw(n, n.ry) : u > 0 ? 0 : 0.4 * Math.sin(t * 0.33);
    n.look += (THREE.MathUtils.clamp(lookE, -1.2, 1.2) - n.look) * Math.min(1, dt * 3);
    animatePerson(P, { mode: 'sit', seat: PZ.seat, t: t + 7, lookYaw: n.look, lookPitch: n.talking ? 0 : 0.28, talk: n.talking && n.talkT < 2.6 ? 1 : 0 });
    reach(P, -1, -0.12, 0.74, 0.36, -0.6, -0.6, -0.2);                // o saquinho no colo
    const into = ss(0, 0.5, u) * (1 - ss(0.5, 0.75, u)), out = ss(0.6, 0.95, u) * (1 - ss(1.1, 1.6, u));
    reach(P, 1, 0.12 - 0.2 * into + 0.1 * out, 0.82 + 0.12 * into + 0.36 * out, 0.36 + 0.24 * out, 0.6, -0.6, -0.2);
    if (u > 0.9 && u - dt <= 0.9) {                                    // solta o milho
      P.root.updateMatrixWorld(true); P.hand.R.getWorldPosition(_v);
      for (let i = 0; i < NG; i++) { const a = (Math.random() - 0.5) * 1.6, r = 1.4 + Math.random() * 1.8; grains[i] = { x0: _v.x, y0: _v.y, z0: _v.z, x1: n.x + Math.sin(n.ry + a) * r, z1: n.z + Math.cos(n.ry + a) * r, t: 0, on: true }; }
    }
    // milho voando / no chão
    let k = 0;
    for (const g2 of grains) {
      if (!g2 || !g2.on) continue;
      g2.t += dt; const e = Math.min(1, g2.t / 0.55);
      po.position.set(g2.x0 + (g2.x1 - g2.x0) * e, (g2.y0 + (0.25 - g2.y0) * e) + Math.sin(e * Math.PI) * 0.6, g2.z0 + (g2.z1 - g2.z0) * e);
      po.rotation.set(0, 0, 0); po.scale.setScalar(1); po.updateMatrix(); gm.setMatrixAt(k++, po.matrix);
    }
    gm.count = k; gm.instanceMatrix.needsUpdate = true;
    // pombos: bicam e andam um pouco; correm para o milho; o cachorro (ou alguém) chegando perto: voam baixo e voltam
    scareT = Math.max(0, scareT - dt);
    birds.forEach((b, i) => {
      let threat = dogPos && Math.hypot(dogPos.x - b.x, dogPos.z - b.z) < 1.7;
      if (!threat && player && playerT < 0.5 && Math.hypot(player.x - b.x, player.z - b.z) < 1.1) threat = true;
      if (threat && b.fly <= 0) { b.fly = 1.6 + Math.random() * 0.8; const a = Math.random() * 6.28; b.fx = b.x + Math.cos(a) * 2.2; b.fz = home.z - 0.8 + Math.sin(a) * 1.2; b.sx = b.x; b.sz = b.z; scareT = 4; }
      if (b.fly > 0) {                                                 // voo baixo em arco até outro ponto do caminho
        b.fly -= dt; const e = 1 - Math.max(0, b.fly) / 2.0;
        b.x = b.sx + (b.fx - b.sx) * Math.min(1, e); b.z = b.sz + (b.fz - b.sz) * Math.min(1, e); b.y = Math.sin(Math.min(1, e) * Math.PI) * 1.2;
        b.a = Math.atan2(b.fx - b.sx, b.fz - b.sz); b.peck = 0;
      } else {
        b.y = 0;
        let best = null, bd = 3.5;                                     // o grão mais perto
        for (const g2 of grains) if (g2 && g2.on && g2.t > 0.55) { const d2 = Math.hypot(g2.x1 - b.x, g2.z1 - b.z); if (d2 < bd) { bd = d2; best = g2; } }
        if (best && bd > 0.12) { const sp = 0.9 * b.sp; b.x += (best.x1 - b.x) / bd * Math.min(bd, sp * dt); b.z += (best.z1 - b.z) / bd * Math.min(bd, sp * dt); b.a = Math.atan2(best.x1 - b.x, best.z1 - b.z); b.peck = 0; }
        else {
          if (best) best.on = false;                                   // comeu
          b.peck = Math.max(0, Math.sin(t * (3.1 + b.sp) + b.ph)) ** 6;
          const hx = home.x - 1.4 + (i % 5) * 0.7, hz = home.z + 0.3 - Math.floor(i / 5) * 0.5, dh = Math.hypot(hx - b.x, hz - b.z);
          if (dh > 1.8) { b.x += (hx - b.x) / dh * 0.5 * dt; b.z += (hz - b.z) / dh * 0.5 * dt; b.a = Math.atan2(hx - b.x, hz - b.z); }
          else b.a += Math.sin(t * 0.5 + b.ph) * dt * 0.8;
        }
      }
      po.position.set(b.x, GY + 0.02 + b.y, b.z);
      po.rotation.set(b.peck * 0.7 + (b.y > 0 ? -0.2 : 0), b.a, 0); po.scale.setScalar(1); po.updateMatrix(); pigeons.setMatrixAt(i, po.matrix);
    });
    pigeons.instanceMatrix.needsUpdate = true;
  });

  // ---- Seu Toninho, o pipoqueiro (atrás do carrinho, do lado do coreto) ----
  const [ox, oz, cry] = PZ.cart, cartX = cx + ox, cartZ = cz + oz;
  const tLoc = (lx, lz) => [cartX + lx * Math.cos(cry) + lz * Math.sin(cry), cartZ - lx * Math.sin(cry) + lz * Math.cos(cry)];
  const [tx0, tz0] = tLoc(0.05, -0.8);
  const ton = addNpc('toninho', buildFigure({ k: 24, skin: '#8a5a3c', hair: '#1e1a18', top: '#f4f1ea', short: true, apron: '#d8312a', apronHem: '#f4f1ea', pants: '#3a3d44', shoes: '#2b2522', hat: 'cap', hatColor: '#d8312a', capLogo: '#f4f1ea', mustache: '#1e1a18', brows: '#1e1a18' }), tx0, tz0);
  ton.P.root.position.set(tx0, 0.22, tz0); ton.P.root.rotation.y = cry; ton.ry = cry; ton.yaw = cry; ton.look = 0;
  const crank = new THREE.Group(); { const [kx, kz] = tLoc(0.68, -0.36); crank.position.set(kx, 0.22 + 1.27, kz); crank.rotation.y = cry; }
  crank.add(at(box(0.03, 0.12, 0.03, '#5a5f66'), 0, -0.05, 0), at(cyl(0.025, 0.025, 0.1, '#2a2a2a', 6), 0.05, -0.1, 0, 0, 0, Math.PI / 2));
  group.add(crank);
  const bag = figureItem('popcorn'), rag2 = figureItem('rag', { color: '#f4f1ea' });
  let task = 'crank', taskT = 7, tAt = 0;
  ton.now = () => (task === 'fill' ? 'bag' : null);
  ups.push((t, dt) => {
    const n = ton, P = n.P; tAt += dt; n.talkT += dt;
    if (!n.talking) taskT -= dt;
    if (taskT <= 0) { const r = Math.random(); task = task !== 'crank' && r < 0.5 ? 'crank' : r < 0.7 ? 'fill' : r < 0.85 ? 'call' : 'wipe'; taskT = task === 'crank' ? 6 + Math.random() * 5 : task === 'fill' ? 3.6 : task === 'call' ? 3 : 4; tAt = 0; }
    const tk = n.talking ? 'talk' : task;
    // vira para o jogador quando ele chega perto ou conversa; senão, de frente para o carrinho
    const near = n.talking || playerNear(n, 4.5);
    const want = near && player ? Math.atan2(player.x - n.x, player.z - n.z) : cry;
    n.yaw += THREE.MathUtils.clamp(wrapA(want - n.yaw), -1.6, 1.6) * Math.min(1, dt * 3);
    P.root.rotation.y = n.yaw;
    const ly = tk === 'call' ? 0.7 * Math.sin(tAt * 1.2) : tk === 'crank' ? 0.3 * Math.sin(t * 0.3) : 0;
    n.look += (ly - n.look) * Math.min(1, dt * 3);
    animatePerson(P, { mode: 'idle', t: t + 11, act: tk === 'talk' && n.talkT < 2.6 ? 'talk' : tk === 'call' ? 'talk' : null, lookYaw: n.look, lookPitch: tk === 'fill' || tk === 'wipe' ? 0.3 : 0, talk: (n.talking && n.talkT < 2.6) || tk === 'call' ? 1 : 0 });
    // mãos: manivela (a direita gira a manivela de verdade), saquinho, pano
    const facing = Math.abs(wrapA(n.yaw - cry)) < 0.35;
    if (tk === 'crank' && facing) {
      const a = t * 3.2; crank.rotation.set(a, cry, 0, 'YXZ');
      crank.updateMatrixWorld(true); _v.set(0.08, -0.1, 0); crank.localToWorld(_v); P.root.updateMatrixWorld(true); P.b.body.updateMatrixWorld(true); P.b.body.worldToLocal(_v);
      reach(P, 1, _v.x, _v.y, _v.z, 0.8, -0.5, -0.4);
    }
    if (tk === 'fill' && facing) {                                     // pega o saquinho, enche (duas conchadas) e guarda no cestinho
      if (!P.has(bag)) P.give(bag, 'L');
      const e = tAt; reach(P, -1, -0.12, 1.02, 0.38, -0.6, -0.6, -0.2);
      const sc = Math.max(0, Math.sin(e * 3.4)); reach(P, 1, 0.1, 1.12 + 0.12 * sc, 0.44 - 0.04 * sc, 0.6, -0.6, -0.2);
      if (e > 3.3 && P.has(bag)) P.drop(bag);
    } else if (P.has(bag)) P.drop(bag);
    if (tk === 'wipe' && facing) {
      if (!P.has(rag2)) P.give(rag2, 'R');
      const a = tAt * 4; reach(P, 1, 0.08 + 0.18 * Math.cos(a), 1.02, 0.46 + 0.06 * Math.sin(a), 0.6, -0.6, -0.2); P.b.waist.rotation.x += 0.12;
    } else if (P.has(rag2)) P.drop(rag2);
  });

  // ---- Davi e o Paçoca: passeio pela praça (caminhos variados, pausas, o cachorro fareja e ele espera) ----
  const R6 = 6.2, ND = {};                                             // nós do passeio (relativos ao centro) e ligações
  for (let k = 0; k < 8; k++) ND['R' + k] = [R6 * Math.cos(k * Math.PI / 4), R6 * Math.sin(k * Math.PI / 4)];
  Object.assign(ND, { E1: [10.6, 0.3], E2: [15.0, -0.2], E3: [19.4, 0.1], W1: [-10.6, -0.7], W2: [-15.0, -0.3], W3: [-19.4, -0.1],
    N1: [0.3, -10.4], N2: [-0.2, -15.0], N3: [0.1, -19.3], S1: [-0.65, 9.2], S2: [-0.5, 14.6], S3: [-0.1, 19.3],
    T0: [7.0, 5.0], T1: [8.6, 5.4], T2: [11.4, 6.4], T3: [14.0, 8.8], T4: [15.2, 12.4], T5: [16.4, 16.0] });
  const LINK = [['R0', 'E1'], ['E1', 'E2'], ['E2', 'E3'], ['R4', 'W1'], ['W1', 'W2'], ['W2', 'W3'], ['R6', 'N1'], ['N1', 'N2'], ['N2', 'N3'], ['R2', 'S1'], ['S1', 'S2'], ['S2', 'S3'],
    ['R1', 'T0'], ['T0', 'T1'], ['T1', 'T2'], ['T2', 'T3'], ['T3', 'T4'], ['T4', 'T5']];
  for (let k = 0; k < 8; k++) LINK.push(['R' + k, 'R' + ((k + 1) % 8)]);
  const NB = {}; for (const [a, b] of LINK) { (NB[a] = NB[a] || []).push(b); (NB[b] = NB[b] || []).push(a); }
  // onde o cachorro fareja (o corpo dele fica ali, a ~0,6 do que cheira: pé da cerca, poste, lixeira, canteiro, base do coreto)
  const SNIFF = { E3: [19.7, 2.4], W3: [-19.7, -2.4], N3: [1.9, -18.6], S3: [-1.8, 18.7], E1: [11.3, 2.0], W1: [-11.3, -2.0], T5: [17.3, 17.2], T2: [11.6, 7.6], R0: [5.6, 1.0], R3: [-4.0, 4.0], R5: [-4.0, -4.0], R7: [4.0, -4.0] };
  const OBST = [[...PZ.cart.slice(0, 2), 1.0], [tx0 - cx, tz0 - cz, 0.6], [sE.x - cx, sE.z - cz, 1.6], [home.x - cx, home.z - cz, 1.8], [sN.x - cx, sN.z - cz, 1.2], [sZ.x - cx, sZ.z - cz, 1.2]];
  const davi = addNpc('davi', buildFigure({ k: 25, skin: '#f1c9a5', hair: '#6a4a2a', top: '#e0a33a', short: true, pants: '#2f4a6e', shoes: '#3a5f8f', sneakers: true, hat: 'cap', hatColor: '#2f4a6e', capLogo: '#e0a33a' }), 0, 0);
  const dog = pzDog(); group.add(dog.mesh);
  const leash = dynamic(new THREE.InstancedMesh(new THREE.CylinderGeometry(0.016, 0.016, 1, 5), mat('#c8312a'), 14)); leash.frustumCulled = false; leash.castShadow = false; group.add(leash);
  const D = { node: 'R2', to: 'R3', from: [0, 0], x: 0, z: 0, s: 0, len: 1, lat: 0, sp: 0.8, yaw: 0, ph: 0, v: 0, pause: 0, pauseKind: null, wait: 0, side: 1, look: 0, hand: 0 };
  const G = { x: 0, z: 0, yaw: 0, v: 0, ph: 0, sniff: 0, sx: 0, sz: 0, sit: 0, wag: 0, mode: 'follow', solo: 3 + Math.random() * 5 };
  let dogPos = null;
  const nodeXY = n => ND[n];
  const setSeg = (a, b) => {                                           // novo trecho: velocidade e desvio lateral próprios; o lado do cachorro é o mais livre
    D.node = a; D.to = b; const A = nodeXY(a), Bp = nodeXY(b); D.s = 0;
    D.len = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]); D.lat = (Math.random() - 0.5) * 0.5; D.sp = 0.72 + Math.random() * 0.2;
    const dx = (Bp[0] - A[0]) / D.len, dz = (Bp[1] - A[1]) / D.len, mx = (A[0] + Bp[0]) / 2, mz = (A[1] + Bp[1]) / 2;
    const score = s => OBST.reduce((m, [ox2, oz2, r]) => Math.min(m, Math.hypot(mx + dz * s * 0.9 - ox2, mz - dx * s * 0.9 - oz2) - r), 99);
    D.side = score(1) >= score(-1) ? 1 : -1;
  };
  const pickNext = () => {
    const opts = NB[D.to].filter(n => n !== D.node); const list = opts.length ? opts : NB[D.to];
    const pref = list.filter(n => !n.startsWith('R') || Math.random() < 0.6);   // (às vezes segue pelo anel, às vezes sai por um braço)
    return (pref.length ? pref : list)[Math.floor(Math.random() * (pref.length ? pref.length : list.length))];
  };
  { const A = nodeXY('R2'); D.x = A[0]; D.z = A[1]; setSeg('R2', 'R3'); G.x = D.x - 0.8; G.z = D.z; }
  davi.now = () => (G.mode === 'sniff' ? 'sniff' : null);
  ups.push((t, dt) => {
    const n = davi, P = n.P; n.talkT += dt;
    // ---- quem conduz ----
    const tA = nodeXY(D.node), tB = nodeXY(D.to), dx = (tB[0] - tA[0]) / D.len, dz = (tB[1] - tA[1]) / D.len;
    const gdx = G.x - D.x, gdz = G.z - D.z, gd = Math.hypot(gdx, gdz);
    let go = !n.talking && D.pause <= 0;
    if (go && (G.mode === 'sniff' && gd > 1.75)) { go = false; D.wait += dt; } else D.wait = 0;   // a guia esticou: espera o cachorro
    if (D.pause > 0) D.pause -= dt;
    const tv = go ? D.sp : 0;
    D.v += (tv - D.v) * Math.min(1, dt * (tv > D.v ? 2.2 : 4));
    if (D.v > 0.01) {
      D.s += D.v * dt;
      if (D.s >= D.len) {                                              // chegou ao nó: às vezes para (olhar, o cachorro fareja); escolhe o próximo
        const at0 = D.to, nx = pickNext();
        if (SNIFF[at0] && Math.random() < 0.65) { D.pause = 2.5 + Math.random() * 3; D.pauseKind = 'sniff'; G.mode = 'sniff'; G.sniff = D.pause + 0.5; const s = SNIFF[at0]; G.sx = s[0]; G.sz = s[1]; }
        else if (Math.random() < 0.25) { D.pause = 1.5 + Math.random() * 2.5; D.pauseKind = 'look'; }
        setSeg(at0, nx);
      }
    }
    const ease = Math.sin(Math.min(1, D.s / D.len) * Math.PI);        // o desvio lateral some nas pontas (sem saltos nos nós)
    const fA = nodeXY(D.node), fdx = (nodeXY(D.to)[0] - fA[0]) / D.len, fdz = (nodeXY(D.to)[1] - fA[1]) / D.len;
    const px = fA[0] + fdx * Math.min(D.s, D.len) + fdz * D.lat * ease, pz = fA[1] + fdz * Math.min(D.s, D.len) - fdx * D.lat * ease;
    D.x = px; D.z = pz;
    let want = Math.atan2(fdx, fdz);
    if (n.talking && player) want = Math.atan2(player.x - (cx + D.x), player.z - (cz + D.z));
    else if (D.v < 0.05 && (G.mode === 'sniff' || D.wait > 0)) want = Math.atan2(G.x - D.x, G.z - D.z);   // parado: olha o cachorro
    D.yaw += THREE.MathUtils.clamp(wrapA(want - D.yaw), -2.5, 2.5) * Math.min(1, dt * (D.v > 0.05 ? 5 : 3));
    D.ph += D.v * dt * Math.PI / 0.42;
    n.x = cx + D.x; n.z = cz + D.z;
    P.root.position.set(n.x, 0.22, n.z); P.root.rotation.y = D.yaw;
    let ly = 0;
    if (D.pauseKind === 'look' && D.pause > 0) ly = 0.9 * Math.sin(t * 0.9);
    else if (!n.talking && playerNear(n, 5)) ly = THREE.MathUtils.clamp(sideYaw(n, D.yaw), -1.0, 1.0);
    D.look += (ly - D.look) * Math.min(1, dt * 3);
    animatePerson(P, { mode: D.v > 0.05 ? 'walk' : 'idle', ph: D.ph, amp: Math.min(1, D.v / 0.8), t: t + 17, act: n.talking && n.talkT < 2.6 ? 'talk' : null, lookYaw: D.look, talk: n.talking && n.talkT < 2.6 ? 1 : 0 });
    // ---- o cachorro: acompanha do lado mais livre; fareja nas paradas e, às vezes, no meio do caminho; senta quando a conversa demora ----
    const latX = Math.cos(D.yaw), latZ = -Math.sin(D.yaw), fwX = Math.sin(D.yaw), fwZ = Math.cos(D.yaw);
    if (G.mode === 'follow' && D.v > 0.3 && !n.talking) { G.solo -= dt; if (G.solo < 0) { G.mode = 'sniff'; G.sniff = 1.2 + Math.random() * 1.6; G.sx = G.x + latX * D.side * 0.5; G.sz = G.z + latZ * D.side * 0.5; G.solo = 5 + Math.random() * 8; } }
    if (G.mode === 'sniff') { G.sniff -= dt; if (G.sniff < 0 && D.pause <= 0) G.mode = 'follow'; }
    if (n.talking) G.sit = Math.min(1, G.sit + dt * 0.8); else G.sit = Math.max(0, G.sit - dt * 3);
    let tx = G.mode === 'sniff' ? G.sx : D.x + latX * D.side * 0.85 + fwX * 0.35, tz = G.mode === 'sniff' ? G.sz : D.z + latZ * D.side * 0.85 + fwZ * 0.35;
    if (G.sit > 0.5) { tx = D.x + latX * D.side * 0.8 + fwX * 0.25; tz = D.z + latZ * D.side * 0.8 + fwZ * 0.25; }
    const ddx = tx - G.x, ddz = tz - G.z, dd = Math.hypot(ddx, ddz);
    const vmax = dd > 1.2 ? 1.9 : 1.1, vt = dd > 0.08 ? Math.min(vmax, dd * 2.2) : 0;
    G.v += (vt - G.v) * Math.min(1, dt * 4);
    if (dd > 0.01) { G.x += ddx / dd * G.v * dt; G.z += ddz / dd * G.v * dt; }
    { const rx = G.x - D.x, rz = G.z - D.z, r = Math.hypot(rx, rz); if (r < 0.62 && r > 1e-4) { G.x = D.x + rx / r * 0.62; G.z = D.z + rz / r * 0.62; } if (r > 2.2) { G.x = D.x + rx / r * 2.2; G.z = D.z + rz / r * 2.2; } }   // nunca dentro dele; a guia segura
    const dyaw = G.v > 0.15 ? Math.atan2(ddx, ddz) : G.mode === 'sniff' ? Math.atan2(G.sx - G.x, G.sz - G.z) : Math.atan2(D.x - G.x, D.z - G.z);
    G.yaw += THREE.MathUtils.clamp(wrapA(dyaw - G.yaw), -3, 3) * Math.min(1, dt * 5);
    G.ph += G.v * dt * Math.PI / 0.28;
    G.wag += dt * (n.talking || playerNear(n, 3) ? 16 : 9);
    dog.mesh.position.set(cx + G.x, 0.22, cz + G.z); dog.mesh.rotation.y = G.yaw;
    const amp = Math.min(1, G.v / 1.2), sn = G.mode === 'sniff' && G.v < 0.3 ? 1 : 0;
    dog.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? 1 : -1) * Math.sin(G.ph) * 0.55 * amp; });
    dog.body.position.y = 0.42 + Math.abs(Math.sin(G.ph)) * 0.03 * amp - 0.1 * G.sit;
    dog.body.rotation.x = -0.45 * G.sit;
    if (G.sit > 0) { dog.legs[2].rotation.x = dog.legs[3].rotation.x = -1.25 * G.sit; dog.legs[0].rotation.x = dog.legs[1].rotation.x = 0.45 * G.sit; }
    dog.head.rotation.set(0.75 * sn + 0.35 * G.sit + 0.05 * Math.sin(t * 1.3), sn ? 0.35 * Math.sin(t * 4.5) : 0, 0);
    dog.tail.rotation.set(0, Math.sin(G.wag) * (0.5 + 0.3 * sn), 0);
    dogPos = { x: cx + G.x, z: cz + G.z };
    // ---- a guia: da mão do lado do cachorro até a coleira, uma curva que cede quando está frouxa ----
    // segura com a mão do lado em que o cachorro está DE FATO (com folga, para não ficar trocando de mão a cada passo)
    const taut = Math.min(1, Math.max(0, (gd - 1.3) / 0.8));
    group.updateMatrixWorld(true);
    dog.collar.getWorldPosition(_w);
    P.b.body.updateMatrixWorld(true);
    _v.copy(_w); P.b.body.worldToLocal(_v);                            // a mão vai um pouco na direção do cachorro quando a guia estica
    if (_v.x > 0.18) D.hand = 1; else if (_v.x < -0.18) D.hand = -1; else if (!D.hand) D.hand = D.side;
    const sd = D.hand, hand = sd > 0 ? 'R' : 'L';
    const hl = Math.hypot(_v.x, _v.z) || 1;
    reach(P, sd, sd * 0.42 + _v.x / hl * 0.1 * taut, 0.74 + 0.06 * taut, 0.16 + _v.z / hl * 0.12 * taut, sd * 0.6, -0.6, -0.3);
    P.root.updateMatrixWorld(true); P.hand[hand].getWorldPosition(_v);
    const L = 2.4, sag = Math.min(0.7, Math.sqrt(Math.max(0, L * L - _v.distanceToSquared(_w))) * 0.32);
    let mx = (_v.x + _w.x) / 2, my = Math.max(GY + 0.08, (_v.y + _w.y) / 2 - sag), mz = (_v.z + _w.z) / 2;
    {                                                                  // a curva contorna o corpo dele (nunca passa por dentro das pernas/quadril)
      const ax = n.x, az = n.z, ex = _w.x - _v.x, ez = _w.z - _v.z, e2 = ex * ex + ez * ez || 1;
      const tt = Math.min(1, Math.max(0, ((ax - _v.x) * ex + (az - _v.z) * ez) / e2));
      const px = _v.x + ex * tt - ax, pz = _v.z + ez * tt - az, dd = Math.hypot(px, pz), R = 0.58;
      if (dd < R && tt > 0.02) {
        let ux = px / (dd || 1), uz = pz / (dd || 1);
        if (dd < 1e-3) { ux = Math.cos(D.yaw) * sd; uz = -Math.sin(D.yaw) * sd; }
        const k = (R - dd) * 2.2; mx += ux * k; mz += uz * k;
      }
    }
    const q = (tt, out) => { const a = (1 - tt) * (1 - tt), b2 = 2 * (1 - tt) * tt, c = tt * tt; return out.set(a * _v.x + b2 * mx + c * _w.x, Math.max(GY + 0.03, a * _v.y + b2 * my + c * _w.y), a * _v.z + b2 * mz + c * _w.z); };
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
    for (let it = 0; it < 3; it++) {                                   // confere a curva de verdade: se um ponto ainda encosta no quadril/tronco, abre mais
      let worst = 9, wx = 0, wz = 0;
      for (let i = 2; i <= 12; i++) { q(i / 14, p0); if (p0.y < GY + 1.5) { const dx = p0.x - n.x, dz = p0.z - n.z, d = Math.hypot(dx, dz); if (d < worst) { worst = d; wx = dx; wz = dz; } } }
      if (worst >= 0.47) break;
      const k = (0.5 - worst) * 2.6 / (worst || 1); mx += wx * k; mz += wz * k;
    }
    for (let i = 0; i < 14; i++) {
      q(i / 14, p0); q((i + 1) / 14, p1);
      po.position.copy(p0).add(p1).multiplyScalar(0.5); const len = p0.distanceTo(p1);
      po.quaternion.setFromUnitVectors(_up, p1.sub(p0).normalize()); po.scale.set(1, len + 0.01, 1); po.updateMatrix(); leash.setMatrixAt(i, po.matrix);
    }
    leash.instanceMatrix.needsUpdate = true;
  });
  const _up = new THREE.Vector3(0, 1, 0);

  return {
    group,
    update(t, dt) { playerT += dt || 0; for (const u of ups) u(t, Math.min(0.1, dt || 0)); },
    /** Pessoa da praça a até 2,3 de (x, z), livre para conversar (ou null). */
    nearTalk(x, z) {
      player = { x, z }; playerT = 0;
      let best = null, bd = TALK_R;
      for (const n of npcs) { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; } }
      return best;
    },
    /** Falas para talkBox.show; quem fala para (ou vira a cabeça) e olha para o jogador. */
    talk(n, px, pz) { if (!n) return []; player = { x: px, z: pz }; playerT = 0; n.talking = true; n.talkT = 0; return plazaLine(n.id, n.mem, n.now()); },
    endTalk(n) { if (n) n.talking = false; },
    npcs,
  };
}

/** Obstáculos de quem anda a pé dentro da praça (a van já é barrada pela praça inteira): coreto, árvores, canteiros, bancos, postes, cerquinha, arbustos. */
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
    const bx = cx + sx * PZ.benchX, bz = cz + sz * PZ.benchZ;
    rect(bx - 1.5, bx + 1.5, bz - 0.4, bz + 0.4);                              // banco (assento + encosto)
    circ(cx + sx * 2.4, cz + sz * (d / 2 - 2.2), 0.15);                        // poste
    const len = w / 2 - 3.2, fx = cx + sx * (1.6 + len / 2 + 0.2), fz = cz + sz * (d / 2 - 1.0);
    rect(fx - len / 2, fx + len / 2, fz - 0.08, fz + 0.08);                    // cerquinha (aberta nos caminhos)
    const gx = cx + sx * (w / 2 - 1.0), gz = cz + sz * (1.6 + len / 2 + 0.2);
    rect(gx - 0.08, gx + 0.08, gz - len / 2, gz + len / 2);
    circ(cx + sx * 11.6, cz + sz * 2.6, 0.32);                                 // lixeira
  }
  for (const [x, z, r] of PZ_SHRUBS) circ(cx + x, cz + z, r * 0.9);            // arbustos baixos
  circ(cx + PZ.cart[0], cz + PZ.cart[1], 1.0);                                 // carrinho de pipoca
  const c = Math.cos(PZ.cart[2]), s = Math.sin(PZ.cart[2]);
  circ(cx + PZ.cart[0] + 0.05 * c - 0.8 * s, cz + PZ.cart[1] - 0.05 * s - 0.8 * c, 0.3);   // pipoqueiro (atrás do carrinho)
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
  // bairros urbanos: o jeito de cada um nos arredores (Mirante 6, Altitude 7, Ápice 8, Encostas 9, Travessia 11, Trilhos 12,
  // Fluxo 14 e Penumbra 19 — este liga a noite depois, em night.js)
  const flavor = sk !== 'city' ? null : TERRAIN.kind === 'hill' ? 'encostas' : CANAL ? 'canal' : RAIL ? 'rail' : FLUX ? 'flux'
    : GRID === 8 ? 'apice' : pool.includes(87) ? 'mirante' : 'altitude';
  const SP = sk ? planSurroundings(sk, dry, flavor) : null;
  const ground = moon ? new THREE.Group() : buildGround(venice, SP);
  const sur = SP ? buildSurroundings(SP, dry, sk === 'city' ? cityLight(lights) : null) : null;
  if (sur) SOLIDS.push(...sur.solids);
  const outskirts = moon || farm || sur ? new THREE.Group() : buildOutskirts(ground, snow);   // Colheita: em volta são plantações (farmOutside.js)
  const serra = CANAL && CANAL.canyon ? buildCanyonHills() : null;       // Cachoeira: serra de mata em volta do vale
  if (serra) scene.add(serra);
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
    const hook = (r, sc, cam) => { camGround.x = cam.position.x; camGround.z = cam.position.z; camGround.ok = true; };
    const grassMesh = ground.children.find(o => o.isMesh && o.material === mat(GRASS));
    if (grassMesh) grassMesh.onBeforeRender = hook;
    sur.fields.traverse(o => { if (o.isMesh) o.onBeforeRender = hook; });            // (cidade: o chão de fora também serve)
  }
  const nearTo = (b, x, z) => { const dx = Math.max(b.x0 - x, 0, x - b.x1), dz = Math.max(b.z0 - z, 0, z - b.z1); return dx * dx + dz * dz < STREAM_R * STREAM_R; };
  function streamSolids(x, z) {
    for (let i = SOLIDS.length - 1; i >= 0; i--) if (SOLIDS[i].out) SOLIDS.splice(i, 1);
    const cam = camGround.ok && Math.hypot(camGround.x - x, camGround.z - z) > 25;
    for (const b of sur.farSolids) if (nearTo(b, x, z) || (cam && nearTo(b, camGround.x, camGround.z))) SOLIDS.push(b);
  }
  // água que corre (canal e rio da Travessia) e barcos amarrados balançando: achados uma vez na cena montada
  const flows = new Set(), bobs = [];
  scene.traverse(o => { if (o.material && o.material.userData && o.material.userData.flow) flows.add(o.material); if (o.userData.bob) bobs.push(o); });
  // cidade de longe (além de ~380 m do bairro): com a câmera de jogo dentro do bairro a névoa já a apaga, então nem é desenhada;
  // aparece na visão geral e, por setor, quando a câmera sai do bairro e chega perto (dirigindo pelos arredores no Livre — antes
  // os prédios de longe continuavam invisíveis ali, mas sólidos). Decidido a cada desenho, com a câmera que desenha.
  if (sur && sur.farBand.length) {
    const secs = new Map();
    for (const { m, pts } of sur.farBand) { const k = m.name.slice(m.name.indexOf('#f')); let s = secs.get(k); if (!s) secs.set(k, s = { pts, meshes: [], vis: true }); s.meshes.push(m); }
    let lx = 1e9, lz = 1e9, lf = -1;
    scene.onBeforeRender = (r, sc, cam) => {
      const x = cam.position.x, z = cam.position.z, far = sc.fog ? sc.fog.far : Infinity;
      if (Math.abs(x - lx) + Math.abs(z - lz) < 2 && far === lf) return;
      lx = x; lz = z; lf = far;
      const out = Math.hypot(Math.max(-x, 0, x - MAP), Math.max(-z, 0, z - MAP)) > 8, lim = far - 20;
      for (const s of secs.values()) {
        let vis = far > 900;
        if (!vis && out) for (let i = 0; i < s.pts.length; i += 2) if (Math.hypot(s.pts[i] - x, s.pts[i + 1] - z) < lim) { vis = true; break; }
        if (vis !== s.vis) { s.vis = vis; for (const m of s.meshes) m.visible = vis; }
      }
    };
  }
  // Encostas: os morros de fora são chão de verdade (a van e o personagem sobem por eles em vez de passar por baixo). Cachoeira:
  // a serra também é o chão de fora (o helicóptero voa e pousa por cima dela; a van para no pé, nas colisões da serra). O chão
  // do bairro continua o de layout.js; fora do quadrado do bairro vale o de fora (0 junto da sebe). Refeito sempre que o bairro
  // volta a ser montado (configureGrid troca TERRAIN.h).
  let hillWrap = null;
  const outerH = sur && sur.hillH ? sur.hillH : serra ? serra.userData.h : null;
  const hillGround = () => {
    if (!outerH || TERRAIN.h === hillWrap || (sur && sur.hillH ? TERRAIN.kind !== 'hill' : !(CANAL && CANAL.canyon))) return;
    const base = TERRAIN.h, hh = outerH;
    TERRAIN.h = hillWrap = (x, z) => (x < 0 || z < 0 || x > MAP || z > MAP) ? hh(x, z) : base(x, z);
  };
  hillGround();
  let ambT = 0;
  function update(t, dt) {
    ambT += dt || 0;
    hillGround();
    tickBarriers(dt || 0);                       // pisca-pisca e placa PARE/SIGA dos bloqueios: no tempo do jogo (param com o MENU)
    for (const m of flows) if (m.map) m.map.offset.y = (m.map.offset.y - (dt || 0) * m.userData.flow) % 1;
    for (const b of bobs) { const u = b.userData.bob; b.position.y = u.y0 + Math.sin(ambT * 1.3 + u.ph) * 0.05; b.rotation.z = Math.sin(ambT * 0.9 + u.ph * 2) * 0.035; b.rotation.x = Math.sin(ambT * 0.7 + u.ph) * 0.02; }
    if (sur) sur.update(ambT, dt || 0);
    if (plife) plife.update(ambT, dt || 0);
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
    /** Bairro 2: a gente da praça (conversas: nearTalk/talk/endTalk), ou null. */
    plaza: plife,
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
    /** Penumbra (night.js): arredores à noite — janelas acesas, postes e faróis no elevado. */
    setNight(on) { if (sur && sur.setNight) sur.setNight(on); },
    /** Mostra todas as casas de novo. */
    showAll() { if (!hidden.size) return; for (const h of hidden) lots[h].visible = true; hidden.clear(); mergeLots(); },
  };
}
