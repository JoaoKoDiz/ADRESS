// Cenário especial dos Bairros 9 (Encostas: áreas elevadas, ladeiras e escadarias) e 10 (Travessia: canal, pontes,
// passarelas e placas LADO LESTE / LADO OESTE). Só visual: a colisão está em layout.js (SOLIDS) e a altura em TERRAIN.h.
import * as THREE from 'three';
import { box, at, mesh, textTexture, dynamic, cyl, sphere } from './models/kit.js';
import { cobble, gableRoof, buildLagoonHorizon, cafeLife } from './models/venice.js';
import { buildRail } from './train.js';
import { buildFavelaScene } from './models/favela.js';
import { buildFluxScene } from './models/flux.js';
import { buildFarmScene } from './models/farm.js';
import { buildSnowScene } from './models/snow.js';
import { buildGardenScene } from './models/garden.js';
import { buildCanyonScene } from './canyon.js';
import { buildForestScene } from './models/forest.js';
import { buildModernScene } from './models/modern.js';
import { buildWorkScene } from './models/work.js';
import { buildMedScene } from './models/medieval.js';
import { MEDV, FORESTV, MOONV, SNOWV, GARDV, FARMLAND, FLUX, WALK, FAVELA, RAIL as RAIL_PATH, VENICE, TERRAIN, CANAL, slotOrigin, doorPoint, lotX, lotZ, GRID, MAP, HEDGE, ROAD, LOT, roadCenter } from './layout.js';

const ASPHALT = '#5d6470', WALLC = '#b9ad98', CAP = '#d8cfbe', RAIL = '#e8e2d4', STEPC = '#cfc6b4';
const WATER = '#3d8fc4', WATER_DEEP = '#2f78ad', STONE = '#a99f8f', WOOD = '#8a6a44';
const hr = ROAD / 2, rc = roadCenter;

export function buildTerrain() {
  const g = new THREE.Group();
  if (TERRAIN.kind === 'hill') buildHill(g);
  if (CANAL) CANAL.canyon ? buildCanyonScene(g) : buildCanal(g);   // Nível 23: desfiladeiro, ponte alta e cachoeira
  if (RAIL_PATH) buildRail(g);
  if (VENICE) buildVenice(g);
  if (FAVELA) buildFavelaScene(g, FAVELA, MAP, HEDGE);
  if (FARMLAND) buildFarmScene(g, FARMLAND);
  if (SNOWV) buildSnowScene(g, SNOWV, MAP, HEDGE);
  if (MEDV) { const m = new THREE.Group(); buildMedScene(m, MEDV, MAP, HEDGE); MEDV.sceneSolids = m.userData.solids || []; MEDV.sceneVanOnly = m.userData.vanOnly || []; g.add(m); }   // (colisões dos detalhes do cenário: layout.js)   // Nível 24 (Medieval): muralha, portão, patamares, ruas de pedra, praça, castelo, jardim
  if (FORESTV) FORESTV.work ? buildWorkScene(g, FORESTV) : FORESTV.modern ? buildModernScene(g, FORESTV) : buildForestScene(g, FORESTV, MAP, HEDGE);   // Níveis 18 (Modernista) e 22 (Bosque)
  if (GARDV) buildGardenScene(g, GARDV);
  if (FLUX) buildFluxScene(g, { FLUX, GRID, ROAD, LOT, WALK, roadCenter, slotOrigin });
  return g;
}

/** Bloco elevado de x0..x1 × z0..z1, de y0 até y1: muro de pedra e asfalto por cima. Na face norte (a que se vê de baixo,
 *  da rua de baixo), fiadas de pedra, pedras salientes, buzinotes de drenagem e um pouco de hera. */
let wallSeed = 5;
function block(g, x0, x1, z0, z1, y0, y1) {
  if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
  const h = y1 - y0;
  g.add(at(box(x1 - x0, h - 0.06, z1 - z0, WALLC), (x0 + x1) / 2, y0 + (h - 0.06) / 2, (z0 + z1) / 2));
  g.add(at(box(x1 - x0, 0.06, z1 - z0, ASPHALT), (x0 + x1) / 2, y1 - 0.03, (z0 + z1) / 2));
  if (TERRAIN.kind !== 'hill' || z1 - z0 < 3 || x1 - x0 < 2 || h < 2) return;   // (só os paredões de verdade das Encostas)
  const r = () => (wallSeed = (wallSeed * 16807) % 2147483647) / 2147483647, W = x1 - x0;
  for (let y = y0 + 0.7; y < y1 - 0.4; y += 0.75) g.add(at(box(W, 0.07, 0.04, '#a59a86'), (x0 + x1) / 2, y, z0 - 0.02));   // fiadas
  for (let k = 0; k < W / 2.2; k++) {                                       // pedras salientes (tons variados)
    const w = 0.9 + r() * 0.9, x = x0 + 0.5 + r() * (W - 1 - w) + w / 2, y = y0 + 0.4 + r() * (h - 1.0);
    g.add(at(box(w, 0.42, 0.07, ['#c7bba5', '#ab9f8a', '#b3a893'][k % 3]), x, y, z0 - 0.035));
  }
  for (let x = x0 + 3; x < x1 - 1; x += 6.5) g.add(at(box(0.18, 0.18, 0.3, '#6b6f76'), x, y0 + 0.55, z0 - 0.12));   // buzinotes
  for (let k = 0; k < W / 9; k++) {                                         // hera descendo do alto do muro
    const x = x0 + 1 + r() * (W - 2), len = 0.8 + r() * (h - 1.2);
    g.add(at(box(0.9 + r() * 1.2, len, 0.08, ['#4f8a3c', '#5f9a45', '#3f7a34'][k % 3]), x, y1 - 0.06 - len / 2, z0 - 0.05));
  }
}
/** Faixa ao longo de x (z0..z1) com buracos nas colunas de rua `gaps`. */
function bandWithGaps(g, xa, xb, z0, z1, y0, y1, gaps) {
  let x = xa;
  for (const j of gaps.slice().sort((a, b) => a - b)) {
    const a = rc(j) - hr, b = rc(j) + hr;
    if (b <= xa || a >= xb) continue;
    block(g, x, Math.max(x, a), z0, z1, y0, y1);
    x = Math.max(x, b);
  }
  block(g, x, xb, z0, z1, y0, y1);
}
function rampMesh(g, r) {
  const z0 = rc(r.i) + hr, z1 = rc(r.i + 1) - hr, len = Math.hypot(LOT, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, LOT);
  const y = (r.h0 + r.h1) / 2;
  g.add(at(box(ROAD, 0.3, len, ASPHALT), rc(r.j), y - 0.15, (z0 + z1) / 2, -ang, 0, 0));
  // faixas laterais claras (guia) e faixa central tracejada na rampa
  for (const s of [-1, 1]) g.add(at(box(0.3, 0.42, len, CAP), rc(r.j) + s * (hr - 0.15), y + 0.02, (z0 + z1) / 2, -ang, 0, 0));
  for (let k = 0.08; k < 0.95; k += 0.16) g.add(at(box(0.22, 0.32, 1.3, '#f2d45c'), rc(r.j), r.h0 + (r.h1 - r.h0) * k - 0.13, z0 + LOT * k, -ang, 0, 0));
}
function stairsMesh(g, st) {
  const z0 = rc(st.i) + hr, n = 16, d = LOT / n, x = rc(st.j);
  for (let k = 0; k < n; k++) {
    const top = st.h0 + (st.h1 - st.h0) * (k + 1) / n;
    g.add(at(box(ROAD - 1.2, top - st.h0 + 0.02, d, k % 2 ? STEPC : CAP), x, st.h0 + (top - st.h0) / 2, z0 + d * (k + 0.5)));
  }
  // corrimãos nas laterais (inclinados)
  const len = Math.hypot(LOT, st.h1 - st.h0), ang = Math.atan2(st.h1 - st.h0, LOT);
  for (const s of [-1, 1]) {
    g.add(at(box(0.6, (st.h1 - st.h0) + 0.4, LOT, WALLC), x + s * (hr - 0.3), st.h0 + (st.h1 - st.h0) / 2, z0 + LOT / 2));
    g.add(at(box(0.12, 0.12, len, RAIL), x + s * (hr - 0.9), (st.h0 + st.h1) / 2 + 1.0, z0 + LOT / 2, -ang, 0, 0));
  }
  // placa "ESCADARIA" (só a pé) na base
  sign(g, 'ESCADARIA', x + hr - 0.6, st.h0, z0 - 0.6, 0, 3.2);
}
/** Placa com texto num poste (y = chão). */
function sign(g, text, x, y, z, ry = 0, w = 4.2) {
  const tex = textTexture(text, { width: 512, height: 128, bg: '#2f5f8a', fg: '#ffffff' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  const p = new THREE.Group();
  p.add(at(box(0.16, 2.6, 0.16, '#6b6f76'), 0, 1.3, 0));
  p.add(at(box(w + 0.2, w / 4 + 0.2, 0.08, '#e9e9e9'), 0, 2.6 + w / 8, -0.06));
  m.position.set(0, 2.6 + w / 8, 0); p.add(m);
  p.position.set(x, y, z); p.rotation.y = ry;
  g.add(p);
}
function parapetX(g, x0, x1, z, y) { g.add(at(box(x1 - x0, 0.8, 0.5, CAP), (x0 + x1) / 2, y + 0.4, z)); }
function parapetZ(g, z0, z1, x, y) { g.add(at(box(0.5, 0.8, z1 - z0, CAP), x, y + 0.4, (z0 + z1) / 2)); }

function buildHill(g) {
  const T = TERRAIN, E = HEDGE, W = MAP - HEDGE;
  const gapsAt = i => T.ramps.concat(T.stairs).filter(r => r.i === i).map(r => r.j);
  // nível 1: tudo ao sul da rua 4 (a faixa das ladeiras tem buracos onde elas ficam)
  bandWithGaps(g, E, W, rc(4) + hr, rc(5) - hr, 0, T.H1, gapsAt(4));
  block(g, E, W, rc(5) - hr, W, 0, T.H1);
  // nível 2: linhas 6–7, colunas 4–7
  const x2 = rc(4) + hr;
  bandWithGaps(g, x2, W, rc(6) + hr, rc(7) - hr, T.H1, T.H2, gapsAt(6));
  block(g, x2, W, rc(7) - hr, W, T.H1, T.H2);
  // a calçada dos lotes da beira (0,4 além do lote) ficava no ar sobre a rua de baixo: o paredão avança 0,4 só embaixo dos lotes
  for (let j = 0; j < GRID; j++) {
    const ab = i => [rc(j) + hr - (gapsAt(i).includes(j) ? 0 : WALK), rc(j + 1) - hr + (gapsAt(i).includes(j + 1) ? 0 : WALK)];   // (não invade ladeiras/escadarias)
    block(g, ...ab(4), rc(4) + hr - WALK, rc(4) + hr, 0, T.H1);
    if (j >= 4) block(g, ...ab(6), rc(6) + hr - WALK, rc(6) + hr, T.H1, T.H2);
  }
  for (const i of [6, 7]) block(g, x2 - WALK, x2, rc(i) + hr - WALK, rc(i + 1) - hr + WALK, T.H1, T.H2);
  for (const r of T.ramps) rampMesh(g, r);
  for (const s of T.stairs) stairsMesh(g, s);
  // muretas nas bordas dos desníveis (onde a rua termina num paredão) e em volta do alto
  for (let j = 0; j <= GRID; j++) if (!gapsAt(4).includes(j)) parapetX(g, rc(j) - hr, rc(j) + hr, rc(4) + hr + 0.25, T.H1);
  for (let j = 5; j <= GRID; j++) if (!gapsAt(6).includes(j)) parapetX(g, rc(j) - hr, rc(j) + hr, rc(6) + hr + 0.25, T.H2);
  for (const i of [7, 8]) parapetZ(g, rc(i) - hr, rc(i) + hr, x2 + 0.25, T.H2);
  parapetX(g, E, x2, W - 0.25, T.H1); parapetX(g, x2, W, W - 0.25, T.H2);
  parapetZ(g, rc(4) + hr, W, E + 0.25, T.H1);
  parapetZ(g, rc(4) + hr, rc(6) + hr, W - 0.25, T.H1); parapetZ(g, rc(6) + hr, W, W - 0.25, T.H2);
  // faixas centrais tracejadas nas ruas do alto
  const dash = (x, y, z, along) => g.add(at(box(along ? 1.4 : 0.22, 0.02, along ? 0.22 : 1.4, '#f2d45c'), x, y + 0.01, z));
  for (let i = 5; i <= GRID; i++) for (let x = E + 2; x < W - 2; x += 2.6) {
    const near = Array.from({ length: GRID + 1 }, (_, j) => rc(j)).some(c => Math.abs(x - c) < hr + 0.5);
    if (!near) dash(x, T.h(x, rc(i)), rc(i), true);
  }
}

/** Nível da água do canal (Bairro 11) e do rio que o continua pelos arredores (world.js): abaixo da rua, entre muros de pedra. */
export const CANAL_WL = -2.0;
let waterMat = null;
/** Água do canal/rio: azul com reflexos claros; a textura corre devagar para o sul (world.js anima os materiais com userData.flow). */
export function canalWaterMaterial() {
  if (waterMat) return waterMat;
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 128, 0);                                  // mais escura junto aos muros (sombra do cais)
  gr.addColorStop(0, '#24618c'); gr.addColorStop(0.12, '#327fb3'); gr.addColorStop(0.5, '#3b8cc0'); gr.addColorStop(0.88, '#327fb3'); gr.addColorStop(1, '#24618c');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 256);
  let k = 11; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 30; i++) {                                                    // reflexos alongados (no sentido da correnteza)
    x.fillStyle = `rgba(190,226,248,${0.12 + r() * 0.26})`; const px = 14 + r() * 100, py = r() * 256, len = 10 + r() * 26;
    x.fillRect(px, py, 2 + r() * 3, len); if (py + len > 256) x.fillRect(px, py - 256, 3, len);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  waterMat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.1 });
  waterMat.userData.flow = 0.035; waterMat.userData.keep = true;
  return waterMat;
}
/** Plano de água de x0..x1 × z0..z1 no nível do canal (UV em metros: a textura repete a cada 8 × 16). */
export function waterPlane(x0, x1, z0, z1, y = CANAL_WL) {
  const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, 1, Math.max(1, Math.ceil((z1 - z0) / 60))); geo.rotateX(-Math.PI / 2);
  const uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + (x1 - x0) / 2) / (x1 - x0), -(p.getZ(i) + (z1 - z0) / 2 + z0) / 16);   // (u: de um muro ao outro)
  const m = new THREE.Mesh(geo, canalWaterMaterial()); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; m.castShadow = false;
  return m;
}
/** Muro de cais (face para dentro do canal) de z0 a z1 na borda x (s = lado da água: +1 para leste), com a linha d'água escura. */
export function quayWall(g, x, s, z0, z1) {
  if (z1 - z0 < 0.05) return;
  g.add(at(box(0.7, -CANAL_WL + 0.4, z1 - z0, STONE), x + s * 0.35, (CANAL_WL - 0.4) / 2, (z0 + z1) / 2));
  g.add(at(box(0.06, 0.5, z1 - z0, '#5b6466'), x + s * 0.72, CANAL_WL + 0.2, (z0 + z1) / 2));          // limo na linha d'água
  for (let z = z0 + 3; z < z1 - 1; z += 6) g.add(at(box(0.08, 0.16, 0.9, '#8d8478'), x + s * 0.73, CANAL_WL + 1.15, z));   // juntas/pedras salientes
}

function buildCanal(g) {
  const C = CANAL, z0 = HEDGE, z1 = MAP - HEDGE, cx = (C.x0 + C.x1) / 2, w = C.x1 - C.x0, WL = CANAL_WL;
  // canal rebaixado: água abaixo da rua (a colisão continua a mesma: a van nunca entra), muros de cais de pedra dos dois lados e,
  // em cima deles, a mureta de sempre (aberta nas pontes e passarelas). A água vai de uma borda à outra do bairro e segue como rio
  // pelos arredores (world.js), passando sob os muros em arco no lugar da sebe.
  g.add(waterPlane(C.x0 + 0.7, C.x1 - 0.7, 0, MAP));
  quayWall(g, C.x0, 1, 0, MAP); quayWall(g, C.x1, -1, 0, MAP);
  g.add(at(box(w, 0.4, MAP, '#2e5f7d'), cx, WL - 0.5, MAP / 2));                                 // fundo (sob a água)
  const breaks = C.bridges.map(i => [rc(i) - hr, rc(i) + hr]).concat(C.foot.map(z => [z - 1.3, z + 1.3])).sort((a, b) => a[0] - b[0]);
  let z = z0;
  for (const [a, b] of breaks.concat([[z1, z1]])) {
    if (a > z) for (const x of [C.x0 + 0.25, C.x1 - 0.25]) g.add(at(box(0.5, 0.5, a - z, STONE), x, 0.25, (z + a) / 2));
    z = b;
  }
  // escadinhas de pedra até a água (uma de cada lado, longe das pontes): o canal é usado
  for (const [x, s, zs] of [[C.x0, 1, lotZ(1) + 4], [C.x1, -1, lotZ(6) + 9]]) for (let k = 0; k < 6; k++) {
    const y = -0.3 - k * (-WL - 0.3) / 6;
    g.add(at(box(1.1, 0.24, 1.2, CAP), x + s * (0.7 + 0.55), y, zs + k * 1.2));
  }
  // pontes de carro: tabuleiro de pedra com laje grossa, dois pilares na água e o asfalto por cima; guarda-corpos e placas
  for (const i of C.bridges) {
    const zc = rc(i);
    g.add(at(box(w + 1, 0.9, ROAD + 0.6, '#9a958c'), cx, -0.35, zc));
    g.add(at(box(w + 1, 0.04, ROAD - 0.4, ASPHALT), cx, 0.11, zc));
    for (let x = C.x0 + 1.5; x < C.x1 - 1; x += 2.6) g.add(at(box(1.4, 0.02, 0.22, '#f2d45c'), x, 0.135, zc));   // faixa central
    for (const s of [-1, 1]) g.add(at(box(w + 1.1, 0.5, 0.25, CAP), cx, -0.55, zc + s * (ROAD / 2 + 0.35)));   // friso na lateral
    for (const px of [cx - w / 4, cx + w / 4]) {                                                   // pilares com quebra-mar
      g.add(at(box(1.8, -WL - 0.4, ROAD - 0.6, STONE), px, (WL - 1.2) / 2, zc));                      // (de 0,4 abaixo da água até a laje)
      for (const s of [-1, 1]) g.add(at(box(1.27, -WL - 0.4, 1.27, STONE), px, (WL - 1.2) / 2, zc + s * (ROAD / 2 - 0.3), 0, Math.PI / 4, 0));
    }
    for (const s of [-1, 1]) {
      const zz = zc + s * (hr + 0.1);
      g.add(at(box(w + 1, 0.9, 0.35, CAP), cx, 0.55, zz));
      for (let x = C.x0; x <= C.x1 + 0.01; x += w / 4) g.add(at(box(0.5, 1.3, 0.5, STONE), x, 0.65, zz));
    }
    // placas: quem sai da ponte para leste vê LADO LESTE; para oeste, LADO OESTE
    sign(g, 'LADO LESTE', C.x1 + 1.6, 0, zc - hr - 0.7, 0);
    sign(g, 'LADO OESTE', C.x0 - 1.6, 0, zc + hr + 0.7, Math.PI);
  }
  // passarelas (só a pé): estreitas, de madeira, com corrimão, apoiadas em pernas de madeira na água
  for (const fz of C.foot) {
    g.add(at(box(w + 0.8, 0.14, 2.4, WOOD), cx, 0.08, fz));
    g.add(at(box(w + 0.8, 0.3, 0.3, '#6f5434'), cx, -0.12, fz));                                  // viga
    for (let x = C.x0; x < C.x1; x += 1.2) g.add(at(box(0.08, 0.02, 2.2, '#6f5434'), x, 0.16, fz));
    for (let x = C.x0 + w / 4; x < C.x1 - 1; x += w / 4) for (const s of [-1, 1]) g.add(at(box(0.22, -WL, 0.22, '#5a4228'), x, WL / 2, fz + s * 1.0));
    for (const s of [-1, 1]) {
      g.add(at(box(w + 0.8, 0.1, 0.1, RAIL), cx, 1.05, fz + s * 1.15));
      for (let x = C.x0; x <= C.x1 + 0.01; x += w / 6) g.add(at(box(0.1, 1.0, 0.1, RAIL), x, 0.55, fz + s * 1.15));
    }
    // frade de concreto nas pontas: a van não passa
    for (const x of [C.x0 + 0.3, C.x1 - 0.3]) g.add(at(box(0.5, 0.9, 0.5, '#e0b43a'), x, 0.45, fz));
  }
  // barquinhos amarrados junto ao cais (balançam na água: world.js anima quem tem userData.bob)
  const BOATS = [['#f2efe6', '#2f6fb0'], ['#c8402f', '#f2efe6'], ['#3c8f52', '#f2efe6'], ['#f2efe6', '#c8402f'], ['#2f5f8a', '#efbf2a']];
  [[C.x0, 1, lotZ(0) + 9], [C.x1, -1, lotZ(2) + 3.5], [C.x0, 1, lotZ(4) + 11], [C.x1, -1, lotZ(5) + 3], [C.x0, 1, lotZ(6) + 12]].forEach(([x, s, bz], i) => {
    const b = dynamic(new THREE.Group()), [hull, band] = BOATS[i % BOATS.length];
    b.add(at(box(1.4, 0.5, 3.4, hull), 0, 0, 0)); b.add(at(box(1.46, 0.12, 3.46, band), 0, 0.2, 0));          // casco e friso
    b.add(at(box(0.98, 0.5, 0.98, hull), 0, 0, 1.75, 0, Math.PI / 4, 0));                                    // proa
    b.add(at(box(1.1, 0.06, 3.0, '#8a6440'), 0, 0.12, 0)); b.add(at(box(1.2, 0.08, 0.36, '#6f5434'), 0, 0.3, -0.4));   // fundo e banco
    for (const sx of [-1, 1]) b.add(at(box(0.07, 0.07, 2.2, '#c9a46a'), sx * 0.5, 0.36, 0.2, 0, sx * 0.08, 0));   // remos recolhidos
    b.add(at(box(0.05, 0.05, 1.6, '#d8cfb4'), -s * 1.05, 0.55, 1.2, 0.5, s * 0.6, 0));                     // corda até a argola do cais
    b.position.set(x + s * (0.7 + 0.95), WL + 0.12, bz); b.rotation.y = s * 0.04;
    b.userData.bob = { y0: WL + 0.12, ph: i * 1.7 };
    g.add(b);
  });
  // no lugar da sebe, nas duas bordas do bairro: ponte baixa de pedra sobre o canal com a sebe por cima (o rio segue por baixo)
  for (const [za, zb] of [[0, HEDGE], [MAP - HEDGE, MAP]]) {
    const zm = (za + zb) / 2, d = zb - za;
    g.add(at(box(w, 0.9, d, STONE_DK), cx, -0.45, zm));                                             // laje
    g.add(at(box(w, 0.9, d - 0.3, '#3d7c38'), cx, 0.45, zm));                                       // sebe (mesma altura e cor da sebe)
    for (let x = C.x0 + 0.6, n = 0; x < C.x1; x += 1.25, n++) { const m = at(mesh(HEDGE_BUMP, ['#478d41', '#51994a', '#40833b'][n % 3]), x, 0.8, zm, n, n * 2, 0); m.scale.set(1.3, 0.92, 0.98); g.add(m); }
    for (const px of [cx - w / 4, cx + w / 4]) g.add(at(box(1.6, -WL - 0.5, d, STONE_DK), px, (WL - 0.9 - 0.4) / 2 + 0.2, zm));   // pilares
  }
}
const HEDGE_BUMP = new THREE.IcosahedronGeometry(0.72, 0);
const STONE_DK = '#9b9183';

// ---------- Nível 12 (Veneza): água, vielas, pracinha, Ponte de Rialto, pontes menores e placas de atracar ----------
function deckSteps(g, along, from, to, cross, width, rise, n, color, side = true) {   // ponte em degraus (perfil em arco)
  const L = to - from, d = L / n;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, y = 0.15 + rise * 4 * t * (1 - t), a = from + d * (k + 0.5);
    const p = along === 'z' ? [cross, y, a] : [a, y, cross], sz = along === 'z' ? [width, 0.5, d + 0.02] : [d + 0.02, 0.5, width];
    g.add(at(box(sz[0], sz[1], sz[2], color), p[0], p[1] - 0.25, p[2]));
    const und = along === 'z' ? [width - 0.6, 0.9, d + 0.02] : [d + 0.02, 0.9, width - 0.6];   // arco (espessura por baixo)
    g.add(at(box(und[0], und[1], und[2], '#cfc6b4'), p[0], p[1] - 0.95, p[2]));
    if (side) for (const s of [-1, 1]) {                                                       // parapeito
      const q = along === 'z' ? [cross + s * (width / 2 - 0.15), y + 0.45, a] : [a, y + 0.45, cross + s * (width / 2 - 0.15)];
      const qs = along === 'z' ? [0.3, 0.9, d + 0.02] : [d + 0.02, 0.9, 0.3];
      g.add(at(box(qs[0], qs[1], qs[2], '#e2dacb'), q[0], q[1], q[2]));
    }
  }
}
function signPost(g, text, x, z, ry = 0, bg = '#1f4f8a') {
  const tex = textTexture(text, { width: 640, height: 128, bg, fg: '#ffffff', font: 'bold 54px "Trebuchet MS", sans-serif' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.72), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  const p = new THREE.Group(); p.position.set(x, 0.15, z); p.rotation.y = ry;
  p.add(at(box(0.14, 2.6, 0.14, '#5a3c22'), 0, 1.3, 0)); m.position.set(0, 2.5, 0.09); p.add(m);
  g.add(p);
}
function buildVenice(g) {
  const V = VENICE, W = MAP - 2 * HEDGE, rand = (() => { let k = 7; return () => (k = (k * 16807) % 2147483647) / 2147483647; })();
  g.add(at(box(W, 0.06, W, '#3f8fb0'), MAP / 2, 0.02, MAP / 2));                                // água (as ilhas ficam por cima)
  for (let k = 0; k < 120; k++) g.add(at(box(1.8, 0.07, 0.18, '#8cc6ea'), HEDGE + rand() * W, 0.03, HEDGE + rand() * W));   // reflexos
  // muro baixo de pedra em volta (no lugar da sebe), aberto no canto sudeste: a entrada da lancha
  const E = MAP - HEDGE, gap = lotX(7) - 0.4;
  g.add(at(box(W + 3.2, 1.2, 1.6, '#cfc6b4'), MAP / 2, 0.4, HEDGE / 2));
  g.add(at(box(1.6, 1.2, W + 3.2, '#cfc6b4'), HEDGE / 2, 0.4, MAP / 2));
  g.add(at(box(gap, 1.2, 1.6, '#cfc6b4'), gap / 2, 0.4, E + 0.8));
  g.add(at(box(1.6, 1.2, gap, '#cfc6b4'), E + 0.8, 0.4, gap / 2));
  for (const [x, z] of [[gap, E + 0.8], [E + 0.8, gap]]) {                                     // postes listrados da entrada
    for (let k = 0; k < 5; k++) g.add(at(cylLike(0.3, 0.7, k % 2 ? '#ffffff' : '#c8402f'), x, 0.35 + k * 0.7, z));
  }
  // praças: base de pedra; laranja = pedregulhos, roxo = mesas com sombrinhas, verde = café/restaurante
  for (const r of V.plazaNE.concat(V.plazaSW)) {
    g.add(at(box(r.x1 - r.x0 + 0.6, 0.9, r.z1 - r.z0 + 0.6, '#8d877c'), (r.x0 + r.x1) / 2, -0.3, (r.z0 + r.z1) / 2));   // base (rejunte escuro)
  }
  const cell = (r, c) => ({ x: lotX(c), z: lotZ(r) });
  // pedregulhos de verdade: pedrinhas baixas (quadradas e retangulares), tamanhos e cinzas variados, em fileiras — instanciadas
  {
    const lands = V.houses.map(s => { const o = slotOrigin(s); return { x0: o.x - 0.3, z0: o.z - 0.3, x1: o.x + LOT + 0.3, z1: o.z + LOT + 0.3, house: o }; })
      .concat(V.plazaNE.concat(V.plazaSW).map(r => ({ x0: r.x0 - 0.3, z0: r.z0 - 0.3, x1: r.x1 + 0.3, z1: r.z1 + 0.3 })));
    const T = [];
    for (const r of lands) for (let z = r.z0 + 0.3; z < r.z1 - 0.2; ) {
      const dz = 0.42 + rand() * 0.38;
      for (let x = r.x0 + 0.1 + rand() * 0.4; x < r.x1 - 0.3; ) {
        const dx = rand() < 0.45 ? dz * (0.9 + rand() * 0.2) : dz * (1.3 + rand() * 0.9), cx = x + dx / 2, cz = z + dz / 2;
        x += dx + 0.07;
        if (cx > r.x1 - 0.2 || cz > r.z1 - 0.2) continue;
        const o = r.house;
        if (o && cx > o.x + 1.4 && cx < o.x + 15.8 && cz > o.z + 2.0 && cz < o.z + 12.0) continue;   // embaixo das casas
        if (!o && !V.walkable(cx, cz)) continue;                                                // dentro do café
        T.push([cx, cz, dx, dz]);
      }
      z += dz + 0.07;
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), T.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(), up = new THREE.Vector3(0, 1, 0);
    T.forEach(([x, z, dx, dz], i) => {
      const h = 0.05 + rand() * 0.05;
      q.setFromAxisAngle(up, (rand() - 0.5) * 0.12);
      m4.compose(new THREE.Vector3(x, 0.15 + h / 2, z), q, new THREE.Vector3(dx, h, dz));
      im.setMatrixAt(i, m4);
      const t = 0.5 + rand() * 0.32; c.setRGB(t, t * 0.985, t * 0.95); im.setColorAt(i, c);
    });
    im.receiveShadow = true; im.castShadow = false; im.userData.dynamic = true;                 // (fora da fusão de malhas)
    g.add(im);
  }
  // laranja: espaço aberto, só o pedregulho
  const UMB = ['#c8402f', '#3c8f52', '#2f6fb0', '#efbf2a', '#fff3d6'];
  for (const [r, c] of V.zones.purple) {                                                       // mesas, cadeiras e sombrinhas (maiores)
    const o = cell(r, c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const x = o.x + 3.0 + i * 5.6, z = o.z + 3.0 + j * 5.6, col = UMB[(i + j * 2 + r) % UMB.length];
      g.add(at(cylLike(0.85, 0.1, '#f2efe6'), x, 1.2, z)); g.add(at(box(0.16, 1.1, 0.16, '#444'), x, 0.7, z));
      for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        g.add(at(box(0.62, 0.1, 0.62, '#8a5a36'), x + dx * 1.35, 0.75, z + dz * 1.35));
        g.add(at(box(0.62, 0.7, 0.08, '#8a5a36'), x + dx * 1.65, 1.1, z + dz * 1.65, 0, dx ? Math.PI / 2 : 0, 0));
        for (const [lx, lz] of [[-0.25, -0.25], [0.25, 0.25]]) g.add(at(box(0.07, 0.6, 0.07, '#5a3c22'), x + dx * 1.35 + lx, 0.45, z + dz * 1.35 + lz));
      }
      g.add(at(box(0.1, 3.4, 0.1, '#e8e8e8'), x, 1.85, z));
      const um = new THREE.Mesh(new THREE.ConeGeometry(2.3, 0.9, 8), new THREE.MeshLambertMaterial({ color: col }));
      um.position.set(x, 3.75, z); g.add(um);
    }
  }
  const seats = [], waiters = [];
  const seatUp = sat => { for (const p of sat) { const q = sat.find(o => o !== p); p.mate = q ? Math.atan2(q.x - p.x, q.z - p.z) : null; seats.push(p); } };
  for (const [r, c] of V.zones.purple) {                                                       // gente nas mesas da praça roxa (ao lado dos cafés)
    const o = cell(r, c);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (rand() > 0.32) continue;
      const x = o.x + 3.0 + i * 5.6, z = o.z + 3.0 + j * 5.6, sat = [], n = 1 + Math.floor(rand() * 2.6), first = Math.floor(rand() * 4);
      const D = [[-1, 0], [0, 1], [1, 0], [0, -1]];
      for (let q = 0; q < n; q++) { const [dx, dz] = D[(first + (n === 2 ? q * 2 : q)) % 4]; sat.push({ x: x + dx * 1.35, z: z + dz * 1.35, face: Math.atan2(-dx, -dz), sit: 0.65 }); }
      seatUp(sat);
      for (const [dx, dz] of [[0.25, 0.1], [-0.2, -0.2]]) g.add(at(cylLike(0.08, 0.14, '#ffffff'), x + dx, 1.32, z + dz));   // xícaras e copos
    }
  }
  for (const cf of V.cafes) {   // café / restaurante: girado na diagonal (alinhado com a ponte); a ENTRADA PRINCIPAL fica na frente — a ponta sob o oitão, voltada para a praça e a Rialto (cf.front); as laterais longas têm vitrines e toldo
    const k = new THREE.Group(); k.position.set(cf.cx, 0, cf.cz); k.rotation.y = cf.ang; g.add(k);
    const w = cf.w, d = cf.d, fs = cf.front, FX = fs * w / 2;
    const GREEN = '#3c8f52', GLASS = '#2e3a46', FRAME = '#e8dfcc', DOOR = '#6b3f22';
    k.add(at(box(w, 7.0, d, '#e9c98f'), 0, 3.65, 0));
    k.add(at(box(w + 0.12, 0.5, d + 0.12, '#d6b47a'), 0, 0.4, 0));                                 // rodapé de pedra
    gableRoof(k, { cx: 0, cz: 0, y: 7.15, len: w + 0.9, depth: d, rise: 2.0, over: 0.45, color: '#b5532f', wall: '#e9c98f' });
    for (const fz of [-1, 1]) {                                                               // laterais: vitrines, toldo e o nome (sem porta)
      k.add(at(box(w - 1.2, 0.18, 2.2, GREEN), 0, 3.3, fz * (d / 2 + 0.95), fz * -0.3, 0, 0));
      for (let x = -w / 2 + 1.5; x < w / 2 - 1; x += 2.4) {
        k.add(at(box(1.6, 2.4, 0.08, FRAME), x, 1.55, fz * (d / 2 + 0.03)));
        k.add(at(box(1.4, 2.2, 0.1, GLASS), x, 1.55, fz * (d / 2 + 0.04)));                   // vitrines
        k.add(at(box(1.2, 1.3, 0.08, GLASS), x, 5.6, fz * (d / 2 + 0.04)));                    // janelas de cima (acima da placa)
      }
      const tex = textTexture('CAFFÈ · RISTORANTE', { width: 768, height: 128, bg: '#2a5a3a', fg: '#fff3d6', font: 'bold 60px "Trebuchet MS", sans-serif' });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(w - 3, 0.85), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
      sign.position.set(0, 4.25, fz * (d / 2 + 0.07));
      if (fz < 0) sign.rotation.y = Math.PI; k.add(sign);
    }
    // frente (no oitão): porta dupla de madeira e vidro com bandeira e verga de pedra, vitrines dos dois lados, toldo,
    // letreiro, lanternas, janelas de cima, óculo no oitão, degrau largo, vasos e a lousa do cardápio
    const F = (m, along, y, out = 0, rz = 0) => k.add(at(m, FX + fs * out, y, along, 0, 0, rz));
    F(box(0.1, 3.5, 2.9, FRAME), 0, 1.85, 0.04);                                              // moldura da porta
    F(box(0.16, 2.9, 2.2, DOOR), 0, 1.55, 0.06);
    for (const al of [-0.52, 0.52]) F(box(0.2, 1.5, 0.7, '#9fc3d8'), al, 1.9, 0.07);          // vidros das folhas
    F(box(0.2, 2.9, 0.06, '#3a2212'), 0, 1.55, 0.08);                                         // encontro das folhas
    for (const al of [-0.2, 0.2]) F(box(0.1, 0.36, 0.06, '#c9a441'), al, 1.5, 0.17);          // puxadores
    F(box(0.18, 0.5, 2.2, '#9fc3d8'), 0, 3.3, 0.06);                                          // bandeira de vidro
    F(box(0.26, 0.32, 3.2, '#d8cfbe'), 0, 3.72, 0.08);                                        // verga
    for (const al of [-2.85, 2.85]) {                                                         // vitrines da frente
      F(box(0.08, 2.6, 1.9, FRAME), al, 1.65, 0.03); F(box(0.1, 2.4, 1.7, GLASS), al, 1.65, 0.05);
      F(box(0.5, 0.1, 1.9, '#d8cfbe'), al, 0.42, 0.2);                                         // peitoril
    }
    for (const al of [-1.75, 1.75]) {                                                         // lanternas ao lado da porta
      F(box(0.5, 0.06, 0.06, '#2b2b2b'), al, 2.85, 0.25);
      F(box(0.26, 0.36, 0.26, '#ffd98a'), al, 2.62, 0.48); F(box(0.32, 0.06, 0.32, '#2b2b2b'), al, 2.84, 0.48);
    }
    const aw = at(box(1.7, 0.12, 3.4, GREEN), FX + fs * 0.85, 4.25, 0, 0, 0, -fs * 0.32); k.add(aw);   // toldo da porta
    for (let i = 0; i < 6; i++) F(box(0.04, 0.24, 0.5, i % 2 ? '#fff3d6' : GREEN), -1.45 + i * 0.58, 3.92, 1.68);   // franja
    const ftex = textTexture('CAFFÈ · RISTORANTE', { width: 768, height: 128, bg: '#2a5a3a', fg: '#fff3d6', font: 'bold 60px "Trebuchet MS", sans-serif' });
    const fsign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.05), new THREE.MeshLambertMaterial({ map: ftex }));
    fsign.position.set(FX + fs * 0.07, 5.0, 0); fsign.rotation.y = fs * Math.PI / 2; k.add(fsign);   // letreiro principal
    for (const al of [-2.2, 2.2]) { F(box(0.08, 1.35, 1.25, FRAME), al, 6.2, 0.03); F(box(0.1, 1.2, 1.05, GLASS), al, 6.2, 0.05); }
    F(cyl(0.6, 0.6, 0.08, FRAME, 16), 0, 7.95, 0.5, Math.PI / 2);   // (à frente do oitão do telhado)          // óculo no oitão
    F(cyl(0.48, 0.48, 0.1, GLASS, 16), 0, 7.95, 0.52, Math.PI / 2);
    F(box(1.2, 0.2, 3.4, '#cfc6b4'), 0, 0.25, 0.6);                                           // degrau largo
    for (const al of [-1.85, 1.85]) {                                                         // vasos com loureiro
      F(box(0.6, 0.6, 0.6, '#a8613a'), al, 0.45, 0.55); F(sphere(0.5, '#4f7d3a', 8, 6), al, 1.2, 0.55);
    }
    const easel = new THREE.Group();                                                          // lousa do cardápio
    easel.add(at(box(0.06, 1.0, 0.7, '#5a3c22'), 0, 0.55, 0, 0, 0, 0.12), at(box(0.08, 0.7, 0.56, '#1f2a24'), 0.03, 0.66, 0, 0, 0, 0.12));
    easel.add(at(box(0.04, 0.04, 0.4, '#e8e8e8'), 0.08, 0.8, 0, 0, 0, 0.12), at(box(0.04, 0.04, 0.3, '#e8e8e8'), 0.08, 0.66, 0, 0, 0, 0.12));
    easel.position.set(FX + fs * 1.5, 0.15, 1.6); easel.rotation.y = fs > 0 ? Math.PI : 0; k.add(easel);
    // mesinhas (frente e laterais), cadeiras de bistrô e quem está sentado
    for (const t of cf.tables) {
      g.add(at(cylLike(0.62, 0.08, '#f2efe6'), t.x, 1.18, t.z)); g.add(at(box(0.1, 1.0, 0.1, '#333'), t.x, 0.65, t.z));
      g.add(at(box(0.5, 0.05, 0.5, '#333'), t.x, 0.17, t.z));
      // duas cadeiras de bistrô: na frente, uma de cada lado da mesa para fora (o caminho até a porta fica livre); nas laterais, ao longo da fachada
      const lx = { x: Math.cos(cf.ang), z: -Math.sin(cf.ang) }, pick = Math.floor(rand() * 4), sat = [];   // 0 vazia, 1–2 uma pessoa, 3 duas
      for (const sd of [-1, 1]) {
        const cx = t.x + lx.x * sd * 1.0, cz = t.z + lx.z * sd * 1.0, face = Math.atan2(-lx.x * sd, -lx.z * sd);
        const c = new THREE.Group(); c.position.set(cx, 0.15, cz); c.rotation.y = face;
        c.add(at(box(0.52, 0.07, 0.5, '#7a4a2a'), 0, 0.62, 0), at(box(0.52, 0.6, 0.06, '#7a4a2a'), 0, 0.95, -0.24));
        for (const [a, b] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) c.add(at(box(0.05, 0.6, 0.05, '#2b2b2b'), a, 0.3, b));
        g.add(c);
        if (pick === 3 || (pick && sd === (pick === 1 ? -1 : 1))) sat.push({ x: cx, z: cz, face, sit: 0.65 });
      }
      seatUp(sat);
      for (const [dx, dz] of [[0.2, 0.1], [-0.18, -0.12]]) g.add(at(cylLike(0.07, 0.12, '#ffffff'), t.x + dx, 1.28, t.z + dz));   // xícaras
    }
    const o0 = cf.at(0, 0), o1 = cf.at(0, 1), faceOut = Math.atan2(o1.x - o0.x, o1.z - o0.z);   // de costas para a porta, olhando a praça
    const ft = cf.tables.filter(t => t.k === 'f');
    const faceT = (p, t) => Math.atan2(t.x - p.x, t.z - p.z);
    const pA = cf.at(1.7, 3.4), pB = cf.at(-1.7, 3.4);
    waiters.push({ path: [{ ...cf.at(0, 0.9), pause: 4, face: faceOut }, { ...pA, pause: 3.5, face: faceT(pA, ft[0]) }, { ...pB, pause: 3, face: faceT(pB, ft[1]) }], offset: cf.cx * 0.13 });
  }
  cafeLife(g, seats, waiters);

  // Ponte de Rialto em diagonal (de uma praça à outra): pedra clara, grande arco, degraus e lojinhas cobertas
  const R = V.rialto, rg = new THREE.Group();
  rg.position.set(R.cx, 0, R.cz); rg.rotation.y = Math.atan2(R.ux, R.uz); g.add(rg);
  deckSteps(rg, 'z', -R.len / 2, R.len / 2, 0, R.w, R.rise, 36, '#ece4d2');
  const yAt = z => 0.15 + R.rise * 4 * ((z + R.len / 2) / R.len) * (1 - (z + R.len / 2) / R.len);
  for (const sx of [-1, 1]) for (const z of [-26, -21, -16, -11, 11, 16, 21, 26]) {
    const y = yAt(z);
    rg.add(at(box(2.2, 2.4, 4.4, '#f2ead8'), sx * 3.1, y + 1.2, z));
    rg.add(at(box(0.08, 1.5, 2.6, '#5b3a22'), sx * 1.98, y + 1.0, z));
    gableRoof(rg, { cx: sx * 3.1, cz: z, y: y + 2.4, len: 4.4 + 0.3, depth: 2.2, rise: 0.8, over: 0.2, t: 0.16, color: '#b5532f', wall: '#f2ead8', ridge: 'z' });
  }
  const yTop = 0.15 + R.rise;
  rg.add(at(box(R.w, 0.7, 3.0, '#f2ead8'), 0, yTop + 3.6, 0));                                   // pórtico central
  for (const sx of [-1, 1]) rg.add(at(box(0.96, 3.4, 3.0, '#f2ead8'), sx * (R.w / 2 - 0.46), yTop + 1.7, 0));
  rg.add(at(box(R.w + 0.4, 0.9, 3.6, '#b5532f'), 0, yTop + 4.3, 0));
  signPost(g, 'PONTE DE RIALTO', V.rialto.cx + 32 * R.ux * -1 + 4, V.rialto.cz - 32 * R.uz + 2, Math.PI / 4, '#7a2f2a');
  for (const b of V.bridges) deckSteps(g, 'x', b.x0, b.x1, b.z, b.w, b.rise, 10, '#e2dacb');     // pontes menores
  // entregas a pé: placa na porta (praça) e "ATRACAR AQUI" na borda das praças
  for (const s of V.footOnly) { const d = doorPoint(s); signPost(g, '▼ ENTREGA A PÉ', d.x + 3.0, d.z + 1.2, 0, '#c8402f'); }
  for (const p of V.piers) {                                                                  // píeres de madeira com poste na ponta
    const w = p.x1 - p.x0, d = p.z1 - p.z0, cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    g.add(at(box(w, 0.16, d, '#8a6440'), cx, 0.28, cz));
    for (let z = p.z0 + 0.35; z < p.z1; z += 0.7) g.add(at(box(w + 0.1, 0.04, 0.08, '#6b4a2c'), cx, 0.37, z));
    for (const x of [p.x0 + 0.25, p.x1 - 0.25]) for (const z of [p.z0 + 1.5, cz, p.z1 - 0.3]) g.add(at(box(0.3, 1.2, 0.3, '#5a3c22'), x, -0.2, z));
    g.add(at(box(0.36, 2.4, 0.36, '#6b4a2c'), p.post.x, 0.9, p.post.z));                       // poste de amarrar
    g.add(at(box(0.5, 0.12, 0.5, '#4a3020'), p.post.x, 2.12, p.post.z));
  }
  signPost(g, '⚓ ATRACAR AQUI', lotX(4) + 2, lotZ(2) + LOT - 0.4, 0, '#c8402f');
  signPost(g, '⚓ ATRACAR AQUI', lotX(3) + LOT - 2, lotZ(5) + 0.4, Math.PI, '#c8402f');
  g.add(buildLagoonHorizon());   // horizonte da laguna (ilhas, campanário, barcos ao longe; acompanha a câmera)
}
const LAMBERT = new Map();   // (um material por cor: o cenário assado junta tudo da mesma cor numa malha só)
function cylLike(r, h, color) {
  if (!LAMBERT.has(color)) LAMBERT.set(color, new THREE.MeshLambertMaterial({ color }));
  return new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), LAMBERT.get(color));
}
