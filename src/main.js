// ADRESS 3D — laço principal e máquina de estados da rodada.
// Este arquivo define como cada módulo é usado (o "contrato" entre eles).
import * as THREE from 'three';
import { Game, ROUTE_LEN, setDroppedTags, setPhraseOverride, setForceSide, makeClue, makeClueWith } from './logic.js';
import { createCanyonFx } from './canyon.js';
import { createForestFx } from './forestFx.js';
import { forestLot } from './models/forest.js';
import { buildModernLot } from './models/modern.js';
import { buildRowLot } from './models/work.js';
import { createWorkTraffic } from './workTraffic.js';
import { buildMedLot } from './models/medieval.js';
import { createMedievalLife } from './medievalLife.js';
import { buildCar, CAR_COLORS } from './barriers.js';
import { MAP, doorPoint, slotOrigin, DELIVERY_RADIUS, DELIVERY_MAX_SPEED, VAN, VAN_START, LOT_ANCHORS, SOLIDS, ENTRANCE, HEDGE, GRID, PLAZA, HOUSE_SLOTS, configureGrid, roadCenter, setGasStations, GAS_LIST, GAS_CANOPY, GAS_ISLANDS, GAS_PARTS, TERRAIN, CANAL, VENICE, RAIL, FAVELA, FLUX, FARMLAND, SPOTS, SNOWV, MOONV, GARDV, FORESTV, MEDV, slotPlaceTags, roadTopology, WARE_LIST, WALK as L_WALK, LOT as L_LOT, ROAD as L_ROAD, slotY as L_slotY } from './layout.js';
import { createLaser } from './laser.js';
import { createUrsa } from './ursa.js';
import { createSolar } from './solar.js';
import { buildGrillbyLot } from './models/grillby.js';
import { createGrillbyInside } from './grillbyInside.js';
import { createGrillStory, GRILL_TALK_KEY, createCrowd } from './grillStory.js';
import { createWorkshopStory, INTRO_KEY } from './workshopStory.js';
import { createChurchCine } from './churchCine.js';
import { createMassStory, MASS_KEY, BELL3_KEY, NOTICE_KEY, createRainFx, createRainAudio } from './massStory.js';
import { createTouch } from './touch.js';
import { createExtraStory, EXTRA_DONE_KEY, EXTRA1_KEY, EXTRA2_KEY, screenShatter } from './extraStory.js';
import { createNight } from './night.js';
import { createFarmOutside } from './farmOutside.js';
import { createReality } from './reality.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createVan } from './van.js';
import { createCameraRig } from './camera.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { buildLot } from './models/house.js';
import { box as kbox, cyl as kcyl, sphere as ksphere, bakeStatic, mat, at } from './models/kit.js';
import { buildResident } from './models/resident.js';
import { YARD_BUILDERS, YARD_BUILDERS_SNOW } from './models/yard.js';
import { buildShopLot } from './models/shop.js';
import { SHOPS, HOUSES, FUTS, L1_FIXED, L6_FIXED, WARES, TWINS, VENS, FAVS, MODS, FARMS, MOONS, GRILLBY, SNOW_FIXED, SNOW_EXTRAS, SNOW_DROP, GARDS, CANYON_EXTRAS, FOREST_EXTRAS, MDHS, MDSS, ROWS, WSHS, MVHS, MVSS, MVS_KEY } from './data.js';
import { buildFavelaLot, buildFavelaOutside } from './models/favela.js';
import { buildModLot, MOD_H } from './models/mod.js';
import { createTraffic } from './traffic.js';
import { buildFarmLot } from './models/farm.js';
import { createTractors } from './tractors.js';
import { createChickens } from './chickens.js';
import { createFavelaPets } from './favelaPets.js';
import { buildSnowLot, buildSnowBank, buildPlow } from './models/snow.js';
import { buildGardLot, buildGateArm, buildGardLive } from './models/garden.js';
import { buildMoonLot, spaceSuit } from './models/moon.js';
import { FRAME } from './moonFrame.js';
import { MOON } from './moonPlan.js';
import { buildWareLot } from './models/ware.js';
import { createTrain } from './train.js';
import { createTrolley } from './trolley.js';
import honkUrl from '../assets/snd-carhonk.mp3';
import driveUrl from '../assets/snd-drive.mp3';
import trainProblemUrl from '../assets/train-problem.mp3';
import { buildVeniceLot, buildBoat, buildBoatNpc, VEN_X0, VEN_X1, VEN_Z0, VEN_Z1 } from './models/venice.js';
import { buildAptLot, APT_ROOF, aptRoofHeight, aptRoofY, APT_BUILD } from './models/apt.js';
import { buildFutLot, futRoofHeight } from './models/fut.js';
import { createHintArrow } from './hint.js';
import { createHintButton } from './hintButton.js';
import { createLockButton } from './lockButton.js';
import { createBoom } from './boom.js';
import { createMenu } from './menu.js';
import { createMusic } from './music.js';
import { createHeli } from './heli.js';
import { createMonster } from './monster.js';
import { createSettings } from './settings.js';
import { createTitle } from './title.js';
import { createBarriers } from './barriers.js';
import { createTitleDriver } from './titleDriver.js';
import { createCareerMap } from './careerMap.js';
import { createJamSound } from './jamSound.js';
import { createCityAmbience } from './cityAmbience.js';
import { createShop } from './shop.js';
import { createLevelSelect, NAMES as LEVEL_TITLES } from './levelSelect.js';
import { createMatchTimer } from './matchTimer.js';
import { createWalker } from './walker.js';
import { createTalkBox, lineDuration } from './talkBox.js';
import { whiten, whitenFade } from './whiteout.js';
import { createChurchMusic } from './churchMusic.js';
import talkTrackUrl from '../assets/church-talk.mp3';
import secondSanctuaryUrl from '../assets/second-sanctuary.mp3';
import innocentTimeUrl from '../assets/innocent-time.mp3';
import thirdUrl from '../assets/third-sanctuary.mp3';
import justUsUrl from '../assets/just-us.mp3';
import justUsLoopUrl from '../assets/just-us-loop.mp3';
import { createMenuMusic } from './menuMusic.js';
import { SNOW_LOOP_URL, SNOW_LOOP_SECS } from './menuTrackUrl.js';
import { createVoidMusic } from './voidMusic.js';
import sansUrl from '../assets/sans.mp3';
import rainUrl from '../assets/raining-somewhere-else.mp3';
import tarantellaUrl from '../assets/tarantella.mp3';
import sunnyUrl from '../assets/sunnyside-farm.mp3';
import snowyUrl from '../assets/snowy.mp3';
import waterfallUrl from '../assets/waterfall.mp3';
import { buildChurch, setChurchOpacity, CHURCH_SOLIDS, CHURCH_CAM } from './models/church.js';
import { buildBell, BELL_SPOT, BELL2_X } from './models/bell.js';
import { buildPewReader } from './models/reader.js';
import { createBackButton } from './backButton.js';
import { createMissions, createMissionsButton, MISSIONS, RESERVED } from './missions.js';
import { createCareer } from './career.js';

const hudEl = document.getElementById('hud');
const stage = document.getElementById('stage');

// ---------- Renderizador ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// GPU integrada: no máximo 1.5× (o custo é quase todo de preenchimento); adaptQuality() reduz se ficar lento.
let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

// ---------- Módulos ----------
const audio = createAudio();
const music = createMusic(stage);          // música de fundo (PAUSAR / CONTINUAR, tecla M)
const input = createInput(() => { audio.unlock(); music.start(); });
let touch = null;                                   // controles de toque (criado depois do renderer)
// Configurações (tela inicial): volume da música/efeitos salvos e aplicados já ao abrir o jogo
const settings = createSettings({ onChange: p => { audio.setVolumes(p.music, p.sfx); music.setVolume(p.music); } });
const hud = createHUD(hudEl, stage);
const game = new Game();
// Bairros (grade em layout.js): 'grid4' (4×4 — Bairros 1 e 3, e o modo Livre), 'plaza6' (6×6 com praça — Bairro 2),
// 'grid5' (5×5 com posto — Bairro 4), 'grid6s' (6×6 com postos e comércio — Bairro 5), 'city6' (6×6 de prédios — Bairro 6),
// 'city7' (a mesma cidade, com 1–2 postos e 4–5 prédios comerciais — Bairro 7), 'city8' (igual ao Bairro 7, porém 8×8 — Bairro 8).
const COMPOSED = ['grid5', 'grid6s', 'city6', 'city7', 'city8', 'hill8', 'canal8', 'rail8', 'flux10', 'night10', 'canyon10'];   // bairros com composição sorteada a cada partida
// Cada um tem sua própria cena, construída só na primeira vez que for jogado.
const POOLS = { grid4: [...Array(16).keys(), ...Object.values(L1_FIXED)],   // grid4: as 16 casas + a casa fixa do Bairro 1 (só aparece nele)
  plaza6: [...Array(32).keys()], grid5: [...Array(25).keys(), ...SHOPS],   // grid5: Bairro 4 (25 casas + prédios comerciais)
  grid6s: [...Array(32).keys(), ...SHOPS],        // grid6s (Bairro 5): 32 casas + os prédios comerciais
  city6: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), Object.values(L6_FIXED)),   // + o prédio fixo da quadra C5   // city6 (Bairro 6): 32 casas + 28 prédios residenciais
  city7: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS),   // city7 (Bairro 7): a cidade com postos e prédios comerciais
  city8: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, USE_FUTS ? FUTS : []),
  hill8: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS),   // Bairro 9 (Encostas): casas, prédios, comércio
  canal8: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, WARES, TWINS.map(t => t[1])),   // Bairro 10 (Travessia): + galpões e casas gêmeas
  rail8: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, WARES),
  venice8: VENS, favela8: FAVS,
  farm10: FARMS,
  garden8: GARDS,   // Nível 17 (Jardins): casas de condomínio
  snow8: [...Array(32).keys(), GRILLBY],   // + o Grillby's (fixo no ponto 5)
  moon8: MOONS,   // Nível 17 (Órbita): módulos lunares   // Nível 16 (Nevasca): as casas de sempre, nevadas   // Nível 15 (Colheita): propriedades rurais
  flux10: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, WARES, MODS),
  night10: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, WARES, MODS),
  forest8: [...Array(32).keys(), ...SHOPS],
  modern8: MDHS.concat(MDSS),
  work8: ROWS.concat(WSHS),
  med10: MVHS.concat(MVSS),   // Nível 24 (Medieval): casas do burgo + as 4 lojas da praça (fixas)   // Nível 21 (Operário): casas geminadas e oficinas/comércios   // Nível 18 (Modernista): casas geométricas e poucas lojas   // Nível 22 (Bosque): casas e alguns comércios
  canyon10: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, WARES, MODS) };   // Nível 23 (Cachoeira): as duas margens   // Nível 19 (Penumbra): o mapa do Fluxo, à noite   // Nível 14 (Fluxo): + prédios contemporâneos   // Nível 13 (Morro): casas de laje   // Nível 12 (Veneza): casas venezianas   // Bairro 11 (Trilhos): ferrovia, estações e galpões   // Bairro 10 (Travessia): + galpões e casas gêmeas   // city8 (Bairro 8): o mesmo, em 8×8, com prédios mais altos (e os futuristas, se USE_FUTS)
// lote de casa ou de prédio comercial
const buildAnyLot = (h, opts) => h.kind === 'mvh' || h.kind === 'mvs' ? buildMedLot(h) : h.kind === 'row' || h.kind === 'wsh' ? buildRowLot(h) : h.kind === 'mdh' || h.kind === 'mds' ? buildModernLot(h) : FORESTV && !FORESTV.modern && (h.kind === 'house' || (h.kind === 'shop' && !h.grill)) ? forestLot(h.kind === 'house' ? buildLot(h, opts) : buildShopLot(h), h.kind === 'house' ? FOREST_EXTRAS[h.index] || [] : []) : CANAL && CANAL.canyon && h.kind === 'house' ? canyonLot(h, opts) : h.grill ? buildGrillbyLot(h) : h.kind === 'gard' ? buildGardLot(h) : h.kind === 'moon' ? buildMoonLot(h) : SNOWV && h.kind === 'house' ? buildSnowLot(h, opts) : h.kind === 'farm' ? buildFarmLot(h) : h.kind === 'mod' ? buildModLot(h) : h.kind === 'fav' ? buildFavelaLot(h) : h.kind === 'ven' ? buildVeniceLot(h) : h.kind === 'ware' ? buildWareLot(h) : h.kind === 'shop' ? buildShopLot(h) : h.kind === 'apt' ? buildAptLot(h) : h.kind === 'fut' ? buildFutLot(h) : buildLot(h, opts);
/** Nível 23 (Cachoeira): a casa de sempre + 2 detalhes (CANYON_EXTRAS): sacada de madeira (as duas laterais; só a virada para o
 *  desfiladeiro aparece — canyonBalconies), jardinzinho, vasos na porta, cobertura de madeira na porta. */
function canyonLot(h, opts) {
  const lot = buildLot(h, opts), A = LOT_ANCHORS, HS = A.house, FZ = HS.z1, WD = '#9a6a3c', WL = '#c08a52', ex = new THREE.Group();
  const add = (p, m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); };
  const B = (w, hh, d, c) => kbox(w, hh, d, c), C = (r1, r2, hh, c, n = 8) => kcyl(r1, r2, hh, c, n), S = (r, c) => ksphere(r, c, 7, 5);
  const FL = ['#ff5a7a', '#ffd23a', '#c25aff', '#ff8a2a', '#ffffff'];
  for (const t of CANYON_EXTRAS[h.index] || []) {
    if (t === 'cy:balcony') for (const [nm, sx] of [['cyBalE', 1], ['cyBalW', -1]]) {   // deque elevado de madeira na lateral, com guarda-corpo e 2 cadeiras
      const b = new THREE.Group(); b.name = nm; const x = sx > 0 ? HS.x1 + 1.35 : HS.x0 - 1.35, zm = (HS.z0 + HS.z1) / 2;
      add(b, B(2.5, 0.16, 5.4, WD), x, 1.3, zm);
      for (const dz of [-2.5, 2.5]) for (const dx of [-1.1, 1.1]) add(b, B(0.18, 1.3, 0.18, '#7a5230'), x + dx, 0.65, zm + dz);
      add(b, B(0.1, 0.1, 5.4, WL), x + sx * 1.2, 2.25, zm); for (const dz of [-2.6, 2.6]) add(b, B(2.5, 0.1, 0.1, WL), x, 2.25, zm + dz);
      for (let k = 0; k <= 9; k++) add(b, B(0.07, 0.9, 0.07, WL), x + sx * 1.2, 1.8, zm - 2.6 + k * 0.578);
      for (const dz of [-1, 1]) { add(b, B(0.6, 0.08, 0.6, '#3a6fb0'), x, 1.7, zm + dz); add(b, B(0.08, 0.6, 0.6, '#3a6fb0'), x - sx * 0.3, 2.0, zm + dz); }
      add(b, B(0.9, 0.12, 0.14, '#7a5230'), x - sx * 0.4, 0.1, zm + 3.2, -0.9, 0, 0);   // degrauzinho
      b.userData.dynamic = true; lot.add(b); bakeStatic(b); b.visible = false;
    } else if (t === 'cy:garden') {                                    // canteiro de flores na frente (à esquerda da porta)
      add(ex, B(2.6, 0.3, 1.1, '#7a5230'), HS.x0 + 1.8, 0.27, FZ + 1.0); add(ex, B(2.4, 0.08, 0.9, '#5a3b22'), HS.x0 + 1.8, 0.44, FZ + 1.0);
      for (let k = 0; k < 7; k++) { const x = HS.x0 + 0.8 + k * 0.33, z = FZ + 0.8 + (k % 2) * 0.4; add(ex, C(0.03, 0.03, 0.4, '#3f7d34', 4), x, 0.65, z); add(ex, S(0.13, FL[k % 5]), x, 0.88, z); }
      add(ex, S(0.38, '#4f8f3a'), HS.x0 + 0.5, 0.75, FZ + 1.0); add(ex, S(0.32, '#3f7d34'), HS.x0 + 3.1, 0.7, FZ + 1.0);
    } else if (t === 'cy:vases') {                                     // dois vasos grandes de cerâmica ladeando a porta
      for (const s2 of [-1, 1]) { const x = A.doorX + s2 * 1.05, z = FZ + 0.55;
        add(ex, C(0.32, 0.22, 0.6, '#c8643a', 10), x, 0.42, z); add(ex, C(0.35, 0.35, 0.08, '#a84e2c', 10), x, 0.74, z);
        add(ex, S(0.36, '#3f8f3a'), x, 1.0, z); add(ex, S(0.1, '#ff5a7a'), x + 0.18, 1.25, z + 0.1); add(ex, S(0.1, '#ffd23a'), x - 0.15, 1.2, z + 0.18); }
    } else if (t === 'cy:canopy') {                                    // cobertura de madeira sobre a porta (2 pilares e telhadinho inclinado)
      for (const s2 of [-1, 1]) add(ex, B(0.18, 2.5, 0.18, '#7a5230'), A.doorX + s2 * 1.25, 1.37, FZ + 1.5);
      add(ex, B(2.9, 0.12, 1.8, WD), A.doorX, 2.68, FZ + 0.85, 0.16, 0, 0);
      for (let k = 0; k < 6; k++) add(ex, B(0.08, 0.1, 1.8, '#7a5230'), A.doorX - 1.3 + k * 0.52, 2.78, FZ + 0.85, 0.16, 0, 0);
    }
  }
  if (ex.children.length) { lot.add(ex); bakeStatic(ex); }
  return lot;
}
/** Medieval: céu coberto de nuvens cinzentas, luz difusa (sombras fracas), névoa clara; o sol não aparece. */
function medSky(w) {
  const sc = w.scene, SKYC = '#b5bcc3';
  sc.background = new THREE.Color(SKYC); if (sc.fog) sc.fog.color.set(SKYC);
  if (w.sunLight) { w.sunLight.intensity = 0.95; w.sunLight.color.set('#eef1f4'); }
  const hemi = sc.children.find(o => o.isHemisphereLight); if (hemi) { hemi.intensity = 2.35; hemi.color.set('#e4e9ee'); hemi.groundColor.set('#857d66'); }
  const sun = sc.getObjectByName('sun'); if (sun) sun.visible = false;
}
/** Cachoeira: em cada casa com sacada, mostra só a do lado do desfiladeiro (margem oeste → sacada a leste, e vice-versa). */
function canyonBalconies() {
  game.layout.forEach((h, s) => {
    if (h < 0 || h >= 32) return;
    const lot = world.lotGroup(h); if (!lot) return;
    const west = (s % GRID) < CANAL.cols[0], e = lot.getObjectByName('cyBalE'), w = lot.getObjectByName('cyBalW');
    if (e) e.visible = west; if (w) w.visible = !west;
  });
}
const USE_FUTS = false;                        // prédios futuristas (models/fut.js): guardados, desligados — troque para true para voltarem ao Bairro 8
const TALL_FLOORS = 9;                         // Bairro 8: prédios residenciais mais altos (os outros bairros têm 5 andares)
let world = createWorld({ renderer, buildLot: buildAnyLot, buildResident, yardBuilders: YARD_BUILDERS, pool: POOLS.grid4 });
const worlds = { grid4: world };
let neighborhood = 'grid4';
// Composição sorteada a cada partida:
//   Bairro 4 (5×5): 1 posto (2 lotes vizinhos), 2 prédios comerciais e as 25 casas menos algumas (nunca as com galo/fonte);
//   Bairro 5 (6×6): 1 ou 2 postos (em linhas diferentes), 5 a 8 prédios comerciais e casas sorteadas entre as 32;
//   Bairro 6 (cidade): 28 prédios residenciais + 8 casas sorteadas entre as 32.
/** Bairro 11: true se o par de quadras [s, s+1] (as duas quadras + a rua entre elas, com a calçada) fica longe de todos os trilhos. */
function pairFree() {
  const M = 1.8;                                                       // meia largura do bonde + folga
  const pts = [];
  for (const l of RAIL.lines) for (let s = 0; s <= l.S; s += 0.5) pts.push(l.at(s));
  return ([a, b]) => {
    const A = slotOrigin(a), B = slotOrigin(b);
    const x0 = A.x - 0.4 - M, x1 = B.x + 17.2 + 0.4 + M, z0 = A.z - 0.4 - M, z1 = A.z + 17.2 + 0.4 + M;
    return !pts.some(p => p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1);
  };
}
// Bairro 6: a sequência de pistas sempre tem uma casa de telhado vermelho/azul cuja pista fala da cor e um endereço de prédio.
// (Troca um destino da rota por outro do mesmo bairro; o resto das pistas continua igual e única.)
function ensureL6(g, avail) {
  const route = g.route, house = h => HOUSES[h].kind === 'house', colored = h => house(h) && (HOUSES[h].roof === 'red' || HOUSES[h].roof === 'blue');
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const swapIn = (cands, keep) => {
    const c = cands.filter(h => !route.includes(h)), idx = route.map((_, i) => i).filter(i => !keep.includes(i));
    if (!c.length || !idx.length) return -1;
    const i = rnd(idx); route[i] = rnd(c); g.clues[i] = makeClue(route[i], g.pool); return i;
  };
  let ci = route.findIndex(colored);
  if (ci < 0) ci = swapIn(avail.filter(colored), []);
  if (ci >= 0) g.clues[ci] = makeClueWith(route[ci], g.pool, 'roof:' + HOUSES[route[ci]].roof);
  if (!route.some(h => !house(h))) swapIn(avail.filter(h => !house(h)), [ci]);
}
// Bairro 7: as 2 casas com fonte livres de engarrafamento e um destino com os 4 vizinhos (pelos lados) entregáveis;
// a rota sempre passa por uma casa com fonte (pista que fala da fonte) e por esse destino de "vizinhos".
const hasFountain = h => HOUSES[h].kind === 'house' && HOUSES[h].tags.includes('fountain');
const sideNbrs = s => { const r = Math.floor(s / GRID), c = s % GRID; return r > 0 && r < GRID - 1 && c > 0 && c < GRID - 1 ? [s - 1, s + 1, s - GRID, s + GRID] : null; };
const deliverable = s => s >= 0 && game.layout[s] >= 0 && !HOUSES[game.layout[s]].noDelivery && !barriers.jammedSlots.includes(s);
const nbrHub = h => { const s = game.slotOf[h], n = sideNbrs(s); return deliverable(s) && !!n && n.every(deliverable); };
function l7Ok() {
  return game.pool.filter(h => hasFountain(h) && deliverable(game.slotOf[h])).length >= 2 && game.pool.some(nbrHub)
    && barriers.list.some(b => b.type === 'truck') && barriers.jammedSlots.length > 0;
}
function ensureL7(g, avail) {
  const route = g.route, rnd = a => a[Math.floor(Math.random() * a.length)];
  const swapIn = (cands, keep) => {
    const c = cands.filter(h => !route.includes(h)), idx = route.map((_, i) => i).filter(i => !keep.includes(i));
    if (!c.length || !idx.length) return -1;
    const i = rnd(idx); route[i] = rnd(c); g.clues[i] = makeClue(route[i], g.pool); return i;
  };
  let fi = route.findIndex(hasFountain);
  if (fi < 0) fi = swapIn(avail.filter(hasFountain), []);
  if (fi >= 0) g.clues[fi] = makeClueWith(route[fi], g.pool, 'fountain');
  if (!route.some(h => nbrHub(h))) swapIn(avail.filter(h => nbrHub(h) && !hasFountain(h)), [fi]);
}
function composeRound() {
  const city = neighborhood === 'city6', city7 = neighborhood === 'city7', city8 = neighborhood === 'city8';
  const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // postos (2 lotes vizinhos da mesma linha): Bairro 4 tem 1; Bairro 5, 1 ou 2 (em linhas diferentes); a cidade, nenhum
  const canyon = neighborhood === 'canyon10', hill = neighborhood === 'hill8', canal = neighborhood === 'canal8', rail = neighborhood === 'rail8', flux = neighborhood === 'flux10' || neighborhood === 'night10';
  const nGas = city ? 0 : neighborhood === 'grid6s' || city7 || city8 || hill || canal || rail || canyon ? 1 + Math.floor(Math.random() * 2) : 1;
  // Bairro 9: postos só na parte baixa (linhas 0–3). Bairro 10: postos e galpões sempre de um lado só do canal, em linhas diferentes.
  const rows = shuffled([...Array(hill ? 4 : GRID).keys()]);
  const pairCol = () => canal ? [0, 1, 5, 6][Math.floor(Math.random() * 4)] : Math.floor(Math.random() * (GRID - 1));
  const gasList = rows.slice(0, nGas).map(r => { const c = pairCol(); return [r * GRID + c, r * GRID + c + 1]; });
  // Bairro 11: postos nas linhas 1–4 (fora da coluna dos trilhos); 2 galpões perto da estação dos galpões (fundo do bairro)
  // Bairro 11: os trilhos já estão definidos; postos e galpões (2 quadras + a rua entre elas) só onde não encostam em nenhum
  // trecho dos 3 percursos (inclusive curvas). Sem lugar válido: entram menos estruturas.
  if (rail) {
    gasList.length = 0;
    const free = pairFree();
    const cand = shuffled([1, 2, 3, 4].flatMap(r => [1, 2, 3, 4, 5].map(c => [r * GRID + c, r * GRID + c + 1]))).filter(free);
    const rowsUsed = new Set();
    for (const p of cand) { if (gasList.length >= nGas) break; const r = Math.floor(p[0] / GRID); if (!rowsUsed.has(r)) { rowsUsed.add(r); gasList.push(p); } }
  }
  if (flux) {                                  // Fluxo: postos e galpões (2 quadras + a rua entre elas) fora do canteiro e das pracinhas
    gasList.length = 0;
    const free = x => Math.floor(x / GRID) !== FLUX.row && !FLUX.parks.includes(x), okPair = ([a, b]) => free(a) && free(b);
    const cand = shuffled([...Array(GRID).keys()].filter(r => r !== FLUX.row).flatMap(r => [...Array(GRID - 1).keys()].map(c => [r * GRID + c, r * GRID + c + 1]))).filter(okPair);
    const used = new Set(), rowsUsed = new Set(), take = n => { const out = [];
      for (const p of cand) { if (out.length >= n) break; const r = Math.floor(p[0] / GRID);
        if (rowsUsed.has(r) || p.some(x => used.has(x) || used.has(x - 1) || used.has(x + 1))) continue; rowsUsed.add(r); p.forEach(x => used.add(x)); out.push(p); }
      return out; };
    gasList.push(...take(nGas)); var fluxWares = take(2);
  }
  if (canyon) {                                // Cachoeira: 1–2 postos e 2 galpões, divididos entre as duas margens, em linhas diferentes e sem encostar
    gasList.length = 0;
    const W2 = [0, 1, 2], E2 = [6, 7, 8], rowsUsed = new Set(), out = [];
    const pick = cols => { for (const r of shuffled([...Array(GRID).keys()])) { if (rowsUsed.has(r) || rowsUsed.has(r - 1) || rowsUsed.has(r + 1)) continue; rowsUsed.add(r); const c = cols[Math.floor(Math.random() * cols.length)]; return [r * GRID + c, r * GRID + c + 1]; } return null; };
    const sides = shuffled([W2, E2]);
    gasList.push(pick(sides[0])); if (nGas > 1) gasList.push(pick(sides[1]));
    var canyonWares = [pick(W2), pick(E2)].filter(Boolean);
  }
  const wareList = canyon ? canyonWares : flux ? fluxWares : rail ? shuffled([[59, 60], [61, 62], [44, 45], [52, 53], [57, 58], [41, 42]]).filter(pairFree()).filter(p => !gasList.some(g => g.some(x => p.includes(x)))).slice(0, 2) : canal ? rows.slice(nGas, nGas + 2 + Math.floor(Math.random() * 2)).map(r => { const c = pairCol(); return [r * GRID + c, r * GRID + c + 1]; }) : [];
  setGasStations(gasList, wareList);
  SOLIDS.push(...world.extraSolids);                                  // troncos das árvores de fora
  if (gameMode === 'career') {
    ENTRANCE_WALL.x0 = ENTRANCE.x0; ENTRANCE_WALL.x1 = ENTRANCE.x1;
    SOLIDS.push(ENTRANCE_WALL);
  }
  const allHouses = [...Array(32).keys()];
  let pool;
  let fixed = city ? L6_FIXED : null;
  game.arrange = null; game.ensure = null;
  if (hill) {                                   // Bairro 9: os 28 residenciais, 4–5 comerciais e casas no resto
    const nShops = 4 + Math.floor(Math.random() * 2), apts = [...Array(28).keys()].map(k => 38 + k);
    pool = apts.concat(shuffled(SHOPS).slice(0, nShops), shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops - apts.length));
  } else if (flux || canyon) {                  // Fluxo (e Cachoeira): galpões nos pares sorteados, 4 contemporâneos, 4–5 comerciais, 28 residenciais e casas
    const wares = shuffled(WARES).slice(0, wareList.length);
    fixed = {}; wareList.forEach((p, i) => { fixed[p[0]] = wares[i]; });
    const nShops = 4 + Math.floor(Math.random() * 2), apts = [...Array(28).keys()].map(k => 38 + k);
    const nMods = 4 + Math.max(0, HOUSE_SLOTS.length - wares.length - nShops - 4 - apts.length - 32), mods = shuffled(MODS).slice(0, nMods);   // (poucos)
    const rest = HOUSE_SLOTS.length - wares.length - nShops - mods.length - apts.length;
    pool = wares.concat(mods, shuffled(SHOPS).slice(0, nShops), apts, shuffled(allHouses).slice(0, rest));
    if (neighborhood === 'night10') game.arrange = (layout, free) => {   // Penumbra: prédios altos concentrados na avenida
      const tall = h => h >= 0 && (HOUSES[h].kind === 'apt' || HOUSES[h].kind === 'mod'), d = s => Math.abs(Math.floor(s / GRID) + 0.5 - (FLUX.row + 0.5));
      const order = free.slice().sort((a, b) => d(a) - d(b)), hs = free.map(s => layout[s]);
      const tl = hs.filter(tall), ot = hs.filter(h => !tall(h));
      order.forEach((s, i) => { layout[s] = i < tl.length ? tl[i] : ot[i - tl.length]; });
    };
  } else if (rail) {                            // Bairro 11: 2 galpões (fixos nos pares sorteados), 4–5 comerciais, 20 prédios, casas
    const wares = shuffled(WARES).slice(0, wareList.length);
    fixed = {}; wareList.forEach((p, i) => { fixed[p[0]] = wares[i]; });
    const nShops = 4 + Math.floor(Math.random() * 2), rest = HOUSE_SLOTS.length - wares.length - nShops;
    const nApts = Math.min(28, Math.max(24, rest - 32));                 // (com menos postos/galpões sobram mais lotes)
    pool = wares.concat(shuffled(SHOPS).slice(0, nShops), shuffled([...Array(28).keys()].map(k => 38 + k)).slice(0, nApts),
      shuffled(allHouses).slice(0, rest - nApts));
  } else if (canal) {                           // Bairro 10: galpões (fixos nos pares sorteados), 2–3 pares de gêmeas, comércio, prédios e casas
    const wares = shuffled(WARES).slice(0, wareList.length);
    fixed = {}; wareList.forEach((p, i) => { fixed[p[0]] = wares[i]; });
    const twins = shuffled(TWINS).slice(0, 2 + Math.floor(Math.random() * 2));
    const pairHouses = twins.flat(), nShops = 4 + Math.floor(Math.random() * 2), nApts = 14;
    const rest = HOUSE_SLOTS.length - wares.length - pairHouses.length - nShops - nApts;
    const houses = shuffled(allHouses.filter(h => !pairHouses.includes(h))).slice(0, rest);
    pool = wares.concat(pairHouses, shuffled(SHOPS).slice(0, nShops), shuffled([...Array(28).keys()].map(k => 38 + k)).slice(0, nApts), houses);
    // as gêmeas ficam sempre em lados opostos: se caírem do mesmo lado, troca a gêmea com algo do outro lado
    const side = s => (s % GRID) < 4 ? 'w' : 'e';
    game.arrange = (layout, free) => {
      for (const [a, b] of twins) {
        const sa = layout.indexOf(a), sb = layout.indexOf(b);
        if (side(sa) !== side(sb)) continue;
        const swap = free.find(s => side(s) !== side(sa) && !pairHouses.includes(layout[s]));
        if (swap != null) { layout[sb] = layout[swap]; layout[swap] = b; }
      }
    };
  } else if (city8) {                                  // Bairro 8 (8×8): como o 7, mas só há 28 prédios residenciais: entram todos e as casas completam os lotes
    const nShops = 4 + Math.floor(Math.random() * 2);
    const apts = [...Array(28).keys()].map(k => 38 + k);
    const futs = USE_FUTS ? FUTS : [];
    pool = apts.concat(futs, shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops - apts.length - futs.length), shuffled(SHOPS).slice(0, nShops));
  } else if (city7) {                           // Bairro 7: 4–5 prédios comerciais, 4 casas e o resto de prédios residenciais
    const nShops = 4 + Math.floor(Math.random() * 2), nHouses = 4;
    const apts = [...Array(28).keys()].map(k => 38 + k);
    // sempre 2 casas com fonte pequena entre as 4 (missão "Fonte errada")
    const fnt = shuffled(allHouses.filter(hasFountain)).slice(0, 2), others = shuffled(allHouses.filter(h => !fnt.includes(h))).slice(0, nHouses - 2);
    pool = shuffled(apts).slice(0, HOUSE_SLOTS.length - nShops - nHouses).concat(fnt, others, shuffled(SHOPS).slice(0, nShops));
    game.ensure = ensureL7;
  } else if (city) {
    const apts = [...Array(28).keys()].map(k => 38 + k);
    const fixed = Object.values(L6_FIXED);                 // Bairro 6: o prédio fixo da quadra C5 + 28 residenciais + casas no resto
    // sempre ao menos uma casa de telhado vermelho e uma de telhado azul (missão "Confundi as cores")
    const roofOf = c => shuffled(allHouses.filter(h => HOUSES[h].roof === c))[0], red = roofOf('red'), blue = roofOf('blue');
    pool = apts.concat(fixed, [red, blue], shuffled(allHouses.filter(h => h !== red && h !== blue)).slice(0, HOUSE_SLOTS.length - apts.length - fixed.length - 2));
    game.ensure = ensureL6;
  } else if (neighborhood === 'grid5') {
    // Bairro 4: as 25 casas de sempre menos algumas (nunca as com galo ou fonte), 2 prédios comerciais e o posto
    const keep = [4, 15, 19, 22, 11, 12, 24], base = [...Array(25).keys()], nShops = 2;
    const drop = shuffled(base.filter(h => !keep.includes(h))).slice(0, base.length - (HOUSE_SLOTS.length - nShops));
    pool = base.filter(h => !drop.includes(h)).concat(shuffled(SHOPS).slice(0, nShops));
  } else {
    const nShops = 5 + Math.floor(Math.random() * 4);   // Bairro 5: de 5 a 8 prédios comerciais
    pool = shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops).concat(shuffled(SHOPS).slice(0, nShops));
  }
  // etiquetas de lugar das pistas: Bairro 9 (alto / subida / escadaria), Bairro 10 (Lado Leste / Oeste)
  game.placeTags = hill || rail ? layout => { const m = {}; layout.forEach((h, s) => { if (h >= 0) m[h] = slotPlaceTags(s); }); return m; }
    : canal ? layout => { const m = {}; layout.forEach((h, s) => { if (h >= 0) m[h] = [(s % GRID) < 4 ? 'side:west' : 'side:east']; }); return m; }
    : canyon ? layout => { const m = {}; layout.forEach((h, s) => {   // Cachoeira: lado, "perto da ponte" e os detalhes das casas
      if (h < 0) return; const c = s % GRID, r = Math.floor(s / GRID);
      m[h] = [c < CANAL.cols[0] ? 'side:west' : 'side:east'].concat((r === 4 || r === 5) && [2, 3, 6, 7].includes(c) ? ['loc:bridge'] : [], h < 32 ? CANYON_EXTRAS[h] : []); });
      return m; }
    : null;
  game.setNeighborhood(pool, HOUSE_SLOTS, GRID * GRID, fixed);
  world.setLayout(game.layout);
  world.setGas(gasList);
  if (city) showLounger();
  if (canyon) { canyonBalconies(); traffic.reset(0, 16); }   // Cachoeira: sacadas viradas para o desfiladeiro; trânsito moderado nas ruas e na ponte
  if (flux) traffic.reset(...(neighborhood === 'night10' ? [10, 10, true] : [32, 18, false, true]));   // Fluxo: a rede depende dos postos/galpões da partida; avenida movimentada nos dois sentidos (os carros dela ficam nela) (Penumbra: menos carros, faróis)
  if (neighborhood === 'night10') night.layout(world, game, MAP);   // Penumbra: postes, letreiros e painéis para esta composição
  rig.refit();
}

// Bairro 3: barreiras de obra em 3–5 trechos de rua, sorteadas a cada partida (nunca isolam um portão)
const barriers = createBarriers();
function refreshBarriers() {
  const lv = gameMode === 'career' ? careerLevel : freeLevel;   // o Livre também usa o bairro escolhido
  const topo = roadTopology();   // paredes das encostas, canal e galpões: trechos que já não passam
  if (lv === 2) barriers.randomize(world.scene, { min: 3, max: 5, types: ['barrier'], topo });
  else if (lv === 3) barriers.randomize(world.scene, { min: 4, max: 6, types: ['barrier', 'truck', 'hole'], topo });
  else if (lv === 6) {                          // Bairro 7: sorteia de novo até sobrar o que as missões precisam (fontes, vizinhos, caminhão e engarrafamento)
    for (let k = 0; k < 40; k++) { barriers.randomize(world.scene, { min: 4, max: 6, types: ['truck'], jams: { min: 3, max: 4 }, topo }); if (l7Ok()) break; }
  }
  else if (lv === 7) barriers.randomize(world.scene, { min: 4, max: 6, types: ['truck'], jams: { min: 3, max: 4 }, topo });
  else if (lv === 11) barriers.randomize(world.scene, { min: 1, max: 2, types: ['truck'], topo });   // Nível 12 (Trilhos): só caminhões (fora dos trilhos)
  else if (lv === 8 || lv === 10) barriers.randomize(world.scene, { min: 1, max: 2, types: ['truck'], jams: { min: 1, max: 2 }, topo });   // Bairros 9 (Encostas) e 11 (Travessia): poucos   // Bairro 7: caminhões + engarrafamentos
  else barriers.clear();
}
/** Casa/prédio sem acesso por causa de um engarrafamento (Bairro 7): nunca entra nas entregas. */
const jamBlocked = h => barriers.jammedSlots.includes(game.slotOf[h]);
function applyJams() { if (barriers.jammedSlots.length) game.newDelivery(game.pool.filter(h => !jamBlocked(h))); }
const van = createVan(world.scene);
// Nível 12 (Veneza): a van vira a lancha de entregas (aparência fixa; a van e suas peças ficam escondidas)
const VAN_PARTS = van.object.children.slice();
const boat = buildBoat(); boat.visible = false; van.object.add(boat);
let boatOn = false, boatT = 0;
function setBoatMode(on) { unmoor(); leftPier = null; boatOn = on; boat.visible = on; for (const c of VAN_PARTS) c.visible = !on; }
// Atracar (Veneza): parada devagar perto de um píer, a lancha encosta sozinha ao lado dele, a corda liga o poste a um
// cunho na lancha e o balanço fica maior; W/S (acelerar ou ré) solta a corda e devolve o controle.
let moored = null, moorK = 0;
const rope = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshLambertMaterial({ color: '#d9c49a' }));
rope.visible = false; rope.frustumCulled = false;
const _c0 = new THREE.Vector3(), _c1 = new THREE.Vector3(), _cm = new THREE.Vector3();
let leftPier = null;                           // píer de onde acabou de sair: só atraca nele de novo depois de se afastar
function unmoor() { leftPier = moored; moored = null; rope.visible = false; }
function mooringStep(dt) {                     // true: a lancha está presa (o volante/acelerador não a movem)
  if (!boatOn || !VENICE) return false;
  if (moored) {
    if (input.axis().z !== 0 && moorK > 0.9) { unmoor(); return false; }
    moorK = Math.min(1, moorK + dt * 1.2);
    const d = moored.dock, a = Math.min(1, dt * 2.5);
    let dh = d.heading - van.heading; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
    van.teleport(van.x + (d.x - van.x) * a, van.z + (d.z - van.z) * a, van.heading + dh * a); van.stop();
    return true;
  }
  if (leftPier && Math.hypot(van.x - leftPier.dock.x, van.z - leftPier.dock.z) > 14) leftPier = null;
  if (Math.abs(van.speed) < 1.2) for (const p of VENICE.piers) {
    const pcx = (p.x0 + p.x1) / 2, sameSide = Math.sign(van.x - pcx) === Math.sign(p.dock.x - pcx);   // (do lado do píer onde atraca: não o atravessa)
    if (p !== leftPier && sameSide && Math.hypot(van.x - p.dock.x, van.z - p.dock.z) < 11) { moored = p; moorK = 0; rope.visible = true; van.stop(); return true; }
  }
  return false;
}
function updateBoat(dt) {
  if (!boatOn) return;
  boatT += dt;
  if (moored) {                                // presa no píer: balanço lento (vertical e lateral) que a corda segura
    boat.position.y = Math.sin(boatT * 1.1) * 0.09;
    boat.position.z = Math.sin(boatT * 0.7) * 0.12;
    boat.rotation.x = Math.sin(boatT * 0.9) * 0.05; boat.rotation.z = Math.sin(boatT * 0.6) * 0.025; boat.rotation.y = Math.sin(boatT * 0.5) * 0.03;
    van.object.updateMatrixWorld(true);
    _c1.set(1.3, 0.75, 1.15); boat.localToWorld(_c1);                // cunho na lateral virada para o píer
    _c0.set(moored.post.x, 2.05, moored.post.z);                    // topo do poste (fixo)
    _cm.addVectors(_c0, _c1).multiplyScalar(0.5); _cm.y -= 0.35 + Math.max(0, 1.6 - _c0.distanceTo(_c1)) * 0.3;   // leve curvatura
    rope.geometry.dispose();
    rope.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(_c0.clone(), _cm.clone(), _c1.clone()), 14, 0.05, 5, false);
  } else {
    boat.position.z = 0; boat.rotation.y = 0;
    boat.position.y = Math.sin(boatT * 1.7) * 0.06;                   // leve oscilação
    boat.rotation.x = Math.sin(boatT * 1.3) * 0.025; boat.rotation.z = Math.sin(boatT * 0.9) * 0.02 + van.speed * 0.004;
  }
  const w = boat.userData.wake; w.material.opacity = Math.min(0.35, Math.abs(van.speed) * 0.025); w.scale.x = 0.6 + Math.min(1.4, Math.abs(van.speed) * 0.08);
}
// barcos que circulam devagar (obstáculos móveis; vão e voltam por canais longos, nunca param no caminho)
const npcBoats = (() => {
  const root = new THREE.Group(); root.name = 'npcBoats';
  const list = [];
  const ROUTES = () => [                                              // [x0, z0, x1, z1]: canais retos sem vielas no caminho
    [roadCenter(0) + 4, roadCenter(1), roadCenter(8) - 4, roadCenter(1)],   // (canais que não cortam as praças)
    [roadCenter(7), roadCenter(1) + 4, roadCenter(7), roadCenter(8) - 4],
    [roadCenter(1), roadCenter(8), roadCenter(6), roadCenter(8)],
    [roadCenter(5), roadCenter(5), roadCenter(5), roadCenter(8) - 4],
  ];
  let clock = 0;
  return {
    object: root,
    reset() {
      const R = ROUTES();
      R.forEach((r, k) => {
        if (!list[k]) { const m = buildBoatNpc(k); root.add(m); list[k] = { m, solid: { x0: 0, x1: 0, z0: 0, z1: 0 } }; }
        Object.assign(list[k], { r, t: (k * 0.37) % 1, dir: 1 });
      });
    },
    detach() { for (const b of list) { const i = SOLIDS.indexOf(b.solid); if (i >= 0) SOLIDS.splice(i, 1); } if (root.parent) root.parent.remove(root); },
    update(dt) {
      clock += dt;
      for (const b of list) {
        const [x0, z0, x1, z1] = b.r, L = Math.hypot(x1 - x0, z1 - z0);
        b.t += b.dir * dt * 3.2 / L;
        if (b.t > 1) { b.t = 1; b.dir = -1; } else if (b.t < 0) { b.t = 0; b.dir = 1; }
        const x = x0 + (x1 - x0) * b.t, z = z0 + (z1 - z0) * b.t, hx = (x1 - x0) / L * b.dir, hz = (z1 - z0) / L * b.dir;
        b.m.position.set(x, Math.sin(clock * 1.4 + x) * 0.05, z); b.m.rotation.y = -Math.atan2(hz, hx);
        const ax = Math.abs(hx) > 0.5;
        Object.assign(b.solid, { x0: x - (ax ? 3 : 1), x1: x + (ax ? 3 : 1), z0: z - (ax ? 1 : 3), z1: z + (ax ? 1 : 3) });
        if (SOLIDS.indexOf(b.solid) < 0) SOLIDS.push(b.solid);
      }
    },
  };
})();
const rig = createCameraRig();
world.setLayout(game.layout);
// Dica: seta que cai do céu sobre a casa indicada (uma vez por rodada)
const hint = createHintArrow(world.scene, audio);
let hintUsed = false, hintStep = -1, hintCount = 0;
const hintLimit = () => (MOONV ? 2 : 1);           // Lua (Bairro 20): até 2 dicas por partida (em entregas diferentes); os outros, 1
const hintBtn = createHintButton(stage, () => requestHint());
// Explosões (entrega errada, opcional no menu) e míssil da van (tecla F; a rodada reinicia)
const boom = createBoom(world.scene, () => world, audio);
boom.attachHatch(van.object);
const menu = createMenu(stage);
const heli = createHeli(van, audio);        // tecla H: vira helicóptero
// Helicóptero: o topo de cada prédio residencial (Bairro 6) é um chão onde dá para pousar
heli.setGround((x, z) => {
  for (const s of HOUSE_SLOTS) {
    const h = game.layout[s];
    if (h < 0 || !['apt', 'fut'].includes(HOUSES[h].kind) || boom.isDestroyed(h)) continue;
    const o = slotOrigin(s), R = APT_ROOF;
    if (x > o.x + R.x0 + 0.5 && x < o.x + R.x1 - 0.5 && z > o.z + R.z0 + 0.5 && z < o.z + R.z1 - 0.5) return (HOUSES[h].kind === 'fut' ? futRoofHeight(HOUSES[h], x - o.x, z - o.z) : aptRoofHeight(HOUSES[h], x - o.x, z - o.z)) + TERRAIN.h(o.x + 8.6, o.z + 8.6);
  }
  return 0;
});
heli.setTerrain((x, z) => TERRAIN.h(x, z));   // Bairro 9: o chão sobe nas encostas
const walker = createWalker(world.scene);
const playerSuit = spaceSuit(walker.object, { headY: 1.78, r: 0.72, back: [-0.42, 0], backY: 1.0 }); playerSuit.visible = false;   // Órbita: acessório temporário   // tecla L: o motorista desce e anda a pé
const FOOT = { house: [4.1, 13.1, 1.5, 8.5], shop: [3.8, 13.4, 1.5, 8.5], apt: [3.4, 13.8, 1.2, 8.5], fut: [3.4, 13.8, 1.2, 8.5], ware: [1.5, 40.5, 0.8, 10.6], ven: [VEN_X0, VEN_X1, VEN_Z0, VEN_Z1], fav: [5.3, 11.9, 1.7, 8.3], mod: [3.4, 13.8, 1.2, 8.5] };   // paredes (locais do lote)
/** Obstáculos de quem anda a pé: tudo menos os lotes inteiros e a praça (dá para entrar nos quintais); só as paredes das casas. */
function walkSolids() {
  const out = SOLIDS.slice(HOUSE_SLOTS.length + (PLAZA ? 1 : 0)).filter(b => !b.vanOnly);   // escadarias e passarelas: só a pé
   // postos, sebe, troncos, parede da entrada, bloqueios
  for (const s of HOUSE_SLOTS) {
    const h = game.layout[s];
    if (h < 0 || boom.isDestroyed(h)) continue;
    if (SPOTS) { out.push(SPOTS.spots[s].walkBox || SPOTS.spots[s].box); continue; }                   // Morro/Colheita: a construção (já girada)
    const o = slotOrigin(s), f = FOOT[HOUSES[h].kind] || FOOT.house;
    out.push({ x0: o.x + f[0], x1: o.x + f[1], z0: o.z + f[2], z1: o.z + f[3] });
  }
  return out;
}
const train = createTrain();
const traffic = createTraffic(audio);
const canyonFx = createCanyonFx(audio);   // Nível 23 (Cachoeira): água correndo, cachoeira, névoa e o som pela distância
const night = createNight();               // Nível 19 (Penumbra)
const farmOut = createFarmOutside();       // Nível 15 (Colheita): entorno
const gardGate = { arm: null, live: null, world: null, solid: null, k: 0 };   // Nível 17 (Jardins): cancela, portãozinho de pedestres e patinhos do lago
const mdGate = { arm: null, solid: null, k: 0 };   // Nível 18 (Modernista): cancela da portaria do condomínio
const tractors = createTractors(audio);   // Nível 15 (Colheita): tratores devagar pelas estradas de terra
const chickens = createChickens();        // Nível 15 (Colheita): galinhas atravessando as estradas
const favPets = createFavelaPets();       // Nível 13 (Morro): cachorros caramelos e gatos
// ---------- Nível 16 (Nevasca): gelo, limpa-neve e atalhos ----------
// O limpa-neve (mesma lógica dos tratores) roda um laço que passa pelos 2 atalhos. Chegando perto de um atalho fechado,
// o monte de neve some (o sólido sai) por ~45 s; depois ele volta, mas só quando a van, o motorista e o próprio
// limpa-neve estão fora do trecho. Os atalhos nunca são o único caminho até uma casa.
const plow = createTractors(audio);
const forestCars = createTractors(audio);   // Nível 22 (Bosque): poucos carros circulando devagar (mesma lógica dos tratores)
const forestFx = createForestFx();
const medLife = createMedievalLife(audio);   // Nível 24 (Medieval): moradores com rotinas, carroças, fumaça, nuvens, bandeiras, água e sons
let chatNpc = null;                          // Medieval: morador com quem o jogador está conversando (estado 'chat')          // Nível 22 (Bosque): luz de outono, folhas no chão e caindo
const workTraffic = createWorkTraffic(audio);   // Nível 21 (Operário): caminhões, vans e carros pelas ruas (reserva nos cruzamentos)
const buildForestCar = () => { const m = buildCar(); m.userData.body.material = mat(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]); return m; };
const banks = [];                                // { cut, mesh, open, t, k }
function resetBanks() {
  for (const b of banks) if (b.mesh.parent) b.mesh.parent.remove(b.mesh);
  banks.length = 0;
  if (!SNOWV) return;
  for (const cut of SNOWV.cuts) {
    const mesh = buildSnowBank(); mesh.position.set(cut.x, cut.y, cut.z); world.scene.add(mesh);
    Object.assign(cut.solid, cut.box);
    banks.push({ cut, mesh, open: false, t: 0, k: 1 });
  }
}
function updateBanks(dt) {
  const near = (b, x, z, m) => x > b.cut.box.x0 - m && x < b.cut.box.x1 + m && z > b.cut.box.z0 - m && z < b.cut.box.z1 + m;
  for (const b of banks) {
    const pl = plow.list[0], plowNear = pl && Math.hypot(pl.x - b.cut.x, pl.z - b.cut.z) < 12;
    if (!b.open && plowNear) { b.open = true; b.t = 45; Object.assign(b.cut.solid, { x0: -9999, x1: -9998, z0: -9999, z1: -9998 }); }
    else if (b.open) {
      b.t -= dt;
      const busy = near(b, van.x, van.z, 4) || (walker.visible && near(b, walker.x, walker.z, 2)) || plowNear;
      if (b.t <= 0 && !busy) { b.open = false; Object.assign(b.cut.solid, b.cut.box); }
    }
    b.k += ((b.open ? 0 : 1) - b.k) * Math.min(1, dt * 1.5);
    b.mesh.scale.set(1, Math.max(0.02, b.k), 1); b.mesh.visible = b.k > 0.03;
  }
}   // Nível 15 (Colheita): tratores devagar pelas estradas de terra
// ---------- Nível 15 (Colheita): porteiras ----------
// Cada propriedade tem uma porteira fechada (sólido próprio em SOLIDS). Perto dela (van devagar ou a pé), E abre: a folha
// gira para dentro e o sólido some. Toda partida nova fecha de novo.
const gateOpen = new Set(), gateAnim = new Map();
let nearGate = -1;
function resetGates() {
  gateOpen.clear(); gateAnim.clear(); nearGate = -1;
  if (!FARMLAND) return;
  for (const sp of FARMLAND.spots) if (sp.gateSolid) Object.assign(sp.gateSolid, sp.gate.box);
  for (const h of world.pool) { const g = world.lotGroup(h) && world.lotGroup(h).userData.gate; if (g) g.rotation.y = 0; }
}
function findNearGate(x, z, r) {
  if (!FARMLAND) return -1;
  let best = r, found = -1;
  FARMLAND.spots.forEach((sp, s) => { if (gateOpen.has(s)) return; const d = Math.hypot(x - sp.gate.x, z - sp.gate.z); if (d < best) { best = d; found = s; } });
  return found;
}
function openGate(s) {
  const sp = FARMLAND.spots[s]; gateOpen.add(s);
  Object.assign(sp.gateSolid, { x0: -9999, x1: -9998, z0: -9999, z1: -9998 });
  const h = game.layout[s], g = h >= 0 && world.lotGroup(h).userData.gate;
  if (g) gateAnim.set(g, 0);
  audio.bell && audio.bell();
}
function updateGates(dt) {
  for (const [g, t] of gateAnim) { const k = Math.min(1, t + dt / 0.9); g.rotation.y = 1.45 * (1 - Math.pow(1 - k, 3)); if (k >= 1) gateAnim.delete(g); else gateAnim.set(g, k); }
}   // Nível 14 (Fluxo): carros circulando e semáforos
// ---------- Nível 12 (Trilhos): o dilema do bonde ----------
// A van parada na frente de um bonde por 10 s seguidos → buzina, o bonde avança, corte para preto (~2 s, som de dirigir) e a
// cena separada (trolley.js). Depois, preto de novo e volta à partida com a van num lugar seguro, perto, fora dos trilhos.
const trolley = createTrolley(stage);
const sHonk = createChurchMusic(audio, honkUrl, 0.9, null, false, true), sDrive = createChurchMusic(audio, driveUrl, 0.9, null, false, true);   // (efeitos)
const sTrainProblem = createChurchMusic(audio, trainProblemUrl, 0.7);
let tseq = null, trolleyCool = 0;
// História secundária: só com as 3 conversas salvas (casa do K, terraço do Bairro 6 e igreja) salvar o K leva à conversa
const TROLLEY_TALK_KEY = 'adress.trolley.talk1';
const storyReady = () => { try { return ['adress.l1.kParcel', 'adress.l6.roofTalk', 'adress.church.talk1'].every(k => localStorage.getItem(k) === '1'); } catch (e) { return false; } };
const TROLLEY_LINES = [
  ['Rapaz… Depois dessa, acho que preciso viajar para algum lugar mais tranquilo.'],
  ['Veneza parece uma boa ideia. Um passeio pelos canais deve ajudar a espairecer.'],
  ['Só espero que os barcos não resolvam vir atrás de mim também.'],
];
function startTrolleySeq(tr) {
  tseq = { phase: 'honk', t: 0, tram: tr, x: van.x, z: van.z };
  sHonk.load().then(() => sHonk.play(0.01), () => {});
  train.charge(tr);                                                  // o bonde começa a avançar em direção à van
}
function safeSpotNear(x0, z0) {                                       // perto, sem sólidos e longe de todos os trilhos
  const rail = []; for (const l of RAIL.lines) for (let s = 0; s <= l.S; s += 1) rail.push(l.at(s));
  for (let r = 0; r <= 30; r += 2.5) for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
    if (x < 6 || z < 6 || x > MAP - 6 || z > MAP - 6) continue;
    if (SOLIDS.some(b => x > b.x0 - 2.6 && x < b.x1 + 2.6 && z > b.z0 - 2.6 && z < b.z1 + 2.6)) continue;
    if (rail.some(p => Math.hypot(p.x - x, p.z - z) < 4.5)) continue;
    return { x, z };
  }
  return { x: VAN_START.x, z: VAN_START.z };
}
function updateTrolleySeq(dt) {
  trolleyCool = Math.max(0, trolleyCool - dt);
  if (!tseq) {
    if (neighborhood !== 'rail8' || state !== 'drive' || trolleyCool > 0) return;
    const b = train.blocked();
    if (b && b.vanBlock >= 10) startTrolleySeq(b);
    return;
  }
  const q = tseq; q.t += dt;
  if (q.phase === 'honk' && (train.gapToVan(q.tram, van) < 0.45 || q.t > 9)) {   // corta só com a frente quase encostando na van (sem mostrar a batida)
    talkBox.fadeBlack(1, 120); sDrive.load().then(() => sDrive.play(0.01), () => {});
    van.stop(); setState('trolleyBlack'); q.phase = 'black'; q.t = 0;
  } else if (q.phase === 'black' && q.t > 2.0) {
    sDrive.stop(); music.suspend(true);
    trolley.resize(stage.clientWidth, stage.clientHeight); trolley.start();
    sTrainProblem.load().then(() => { if (tseq) sTrainProblem.play(0.3); }, () => {});
    setState('trolley'); talkBox.fadeBlack(0, 350); q.phase = 'scene'; q.t = 0;
  } else if (q.phase === 'scene') {
    trolley.update(dt, input.action());
    if (trolley.done) {
      const story = trolley.side > 0 && storyReady();                 // K salvo (história completa): fade mais longo e a música some antes da conversa
      talkBox.fadeBlack(1, story ? 3000 : 300); if (story) sTrainProblem.fadeOut(3);
      q.phase = story ? 'talkIn' : 'out'; q.t = 0;
    }   // K salvo (história completa): conversa
  } else if (q.phase === 'talkIn' && q.t > 3.1) {
    trolley.talkScene(); talkBox.fadeBlack(0, 400); q.phase = 'talk'; q.t = 0;
    talkBox.show(TROLLEY_LINES, () => {
      try { localStorage.setItem(TROLLEY_TALK_KEY, '1'); } catch (e) { /* */ }   // conversa concluída (para a continuação em Veneza)
      talkBox.hide(); talkBox.fadeBlack(1, 300); q.phase = 'out'; q.t = 0;
    });
  } else if (q.phase === 'talk') {
    talkBox.update(dt); if (input.action()) talkBox.press();
  } else if (q.phase === 'out' && q.t > 0.5) {                        // volta à partida normal
    trolley.stop(); sTrainProblem.stop(); train.clearCharge();
    if (!talkMusic.playing) music.suspend(false);
    const p = safeSpotNear(q.x, q.z);
    van.teleport(p.x, p.z, van.heading); van.stop();
    rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
    setState('drive'); actionLock = 0.5; talkBox.fadeBlack(0, 600);
    tseq = null; trolleyCool = 15;                                    // não dispara de novo logo em seguida
  }
}                // Bairro 11: trem entre as estações e cancelas das passagens de nível
const jamSound = createJamSound(audio);     // Bairro 7: música perto dos engarrafamentos (fade-in/out, loop perfeito)
const cityAmb = createCityAmbience(audio);   // Bairros 7 e 8: som ambiente urbano baixo e contínuo (um laço só)
const monster = createMonster(world.scene, stage, audio);   // final secreto: 16 casas destruídas
const allDestroyed = () => game.pool.every(h => boom.isDestroyed(h));

/** Troca o bairro jogado (grade, casas, cena, câmera e obstáculos). Começa uma rodada nova nele. */
/** Bairros 4×4 (1 e 3) e praça: as casas de sempre; só o Bairro 1 tem a casa fixa do canto (L1_FIXED). */
function setupGrid4() {
  const lv = gameMode === 'career' ? careerLevel : freeLevel;
  const l1 = neighborhood === 'grid4' && lv === 0;
  let pool = POOLS[neighborhood].filter(h => l1 || !Object.values(L1_FIXED).includes(h));
  if (neighborhood === 'forest8' || neighborhood === 'modern8') {   // Bosque: 4 comércios sorteados; Modernista: 3 lojas; o resto casas
    const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const md = neighborhood === 'modern8', nS = md ? 3 : 4;
    pool = sh(md ? MDHS : [...Array(32).keys()]).slice(0, HOUSE_SLOTS.length - nS).concat(sh(md ? MDSS : SHOPS).slice(0, nS));
  }
  game.arrange = null; game.ensure = null;
  if (neighborhood === 'work8') {                 // Operário: unidades geminadas recebem casas; os pontos largos, oficinas/comércios
    const sh = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const wide = HOUSE_SLOTS.filter(s => FORESTV.spots[s].wide);
    pool = sh(ROWS).slice(0, HOUSE_SLOTS.length - wide.length).concat(sh(WSHS).slice(0, wide.length));
    game.arrange = (layout, free) => {
      const hs = free.map(s => layout[s]), sh2 = sh(hs.filter(h => HOUSES[h].kind === 'wsh')), rw = sh(hs.filter(h => HOUSES[h].kind !== 'wsh'));
      for (const s of free) layout[s] = FORESTV.spots[s].wide ? sh2.pop() : rw.pop();
    };
  }
  const medFixed = MEDV ? Object.fromEntries(Object.entries(MEDV.shops).map(([k, sp]) => [MEDV.spots.indexOf(sp), MVS_KEY[k]])) : null;   // Medieval: as 4 lojas da praça ficam sempre no lugar
  game.setNeighborhood(pool, HOUSE_SLOTS, Math.max(GRID * GRID, SPOTS ? SPOTS.spots.length : 0), l1 ? L1_FIXED : neighborhood === 'snow8' ? SNOW_FIXED : medFixed);
  world.setLayout(game.layout);
  if (neighborhood === 'med10') medLife.layout(world, game, MEDV);
}
function useNeighborhood(kind) {
  if (kind === neighborhood) return;
  boom.reset(); hint.clear(); heli.reset(); monster.reset();
  APT_BUILD.floors = kind === 'city8' ? TALL_FLOORS : 5;
  APT_BUILD.mixed = kind === 'canal8' || kind === 'rail8';  // Bairros 10 e 11: prédios das duas alturas
  train.detach();
  game.placeTags = kind === 'venice8' || kind === 'favela8' || kind === 'moon8' || kind === 'garden8' ? layout => { const m = {}; layout.forEach((h, s) => { if (h >= 0) m[h] = slotPlaceTags(s); }); return m; }
    : kind === 'forest8' ? layout => { const m = {}; layout.forEach(h => { if (h >= 0 && FOREST_EXTRAS[h]) m[h] = FOREST_EXTRAS[h].slice(); }); return m; }   // Bosque: detalhes de outono nas pistas
    : kind === 'snow8' ? layout => { const m = {}; layout.forEach(h => { if (h >= 0 && SNOW_EXTRAS[h]) m[h] = SNOW_EXTRAS[h].slice(); }); return m; }   // Nevasca: detalhes de inverno nas pistas
    : null;
  game.arrange = null; game.ensure = null;
  setDroppedTags(kind === 'snow8' ? SNOW_DROP : null);
  setForceSide(kind === 'canyon10');   // Cachoeira: toda pista diz o lado
  setPhraseOverride(kind === 'snow8' ? { clothesline: 'roupas congeladas no varal' } : null);   // Nevasca: o varal fica congelado   // Nevasca: sem cacto, piscina, fonte, flamingo, girassóis e frutas
  setBoatMode(kind === 'venice8');
  walker.setArea(kind === 'venice8' ? (x, z) => VENICE.walkable(x, z) : null);   // Veneza: a pé só em terra e nas pontes   // antes de construir a cena do bairro
  configureGrid(kind);
  let w = worlds[kind];
  if (!w) {                                     // primeira vez: constrói (escondido pelo fade)
    w = worlds[kind] = createWorld({ renderer, buildLot: buildAnyLot, buildResident: kind === 'snow8' ? h => buildResident(h, { winter: true }) : buildResident, yardBuilders: kind === 'snow8' ? YARD_BUILDERS_SNOW() : YARD_BUILDERS, pool: POOLS[kind], dry: kind === 'city6' || kind === 'city7' || kind === 'city8' || kind === 'forest8', venice: kind === 'venice8', snow: kind === 'snow8', moon: kind === 'moon8', farm: kind === 'farm10' });
    if (kind === 'night10') night.setup(w);     // Penumbra: noite, asfalto molhado
    if (kind === 'forest8') forestFx.setup(w, FORESTV, MAP);
    if (kind === 'med10') { medSky(w); medLife.setup(w, MEDV); SOLIDS.push(...MEDV.sceneSolids.map(b => ({ ...b })), ...MEDV.sceneVanOnly.map(b => ({ ...b, vanOnly: true }))); }   // (1ª vez: as colisões dos detalhes do cenário só existem depois de montar a cena)   // Medieval: céu nublado, luz difusa; vida do burgo   // Bosque: tarde de outono, folhas
    if (kind === 'farm10') farmOut.build(w.scene, MAP, VAN_START.x);   // Colheita: hectares de plantação em volta, tratores e colheitadeiras
    if (kind === 'favela8') w.scene.add(buildFavelaOutside(FAVELA));   // Morro: casario e prédios do entorno (só cenário)
  } else SOLIDS.push(...w.extraSolids);        // troncos das árvores de fora deste bairro
  world.hideResident();
  world = w;
  neighborhood = kind;
  world.scene.add(van.object);
  world.scene.add(walker.object); walker.show(false);
  hint.attach(world.scene); boom.attach(world.scene);
  if (kind === 'rail8') { world.scene.add(train.object); train.reset(); }
  if (kind === 'flux10' || kind === 'night10' || kind === 'canyon10') world.scene.add(traffic.object); else { traffic.detach(); traffic.silence(); }
  if (kind === 'canyon10') canyonFx.attach(world.scene); else canyonFx.detach();
  if (kind === 'med10') world.scene.add(medLife.object); else { medLife.detach(); }
  rig.setProfile(kind === 'med10' ? { dist: 0.72, elev: -0.13 } : {});   // Medieval: câmera mais perto e mais baixa (fachadas acima, portas perto)
  night.attach(van, walker, kind === 'night10');
  if (kind === 'garden8') {                      // Jardins: a cancela da portaria (abre sozinha para a van)
    if (!gardGate.arm || gardGate.world !== world) { gardGate.arm = buildGateArm(GARDV); gardGate.live = buildGardLive(GARDV); gardGate.world = world; world.scene.add(gardGate.arm, gardGate.live); }
    gardGate.solid = { x0: GARDV.GATE.x0, x1: GARDV.GATE.x1, z0: GARDV.GATE.z - 0.3, z1: GARDV.GATE.z + 0.3 }; gardGate.k = 0; SOLIDS.push(gardGate.solid);
  }
  if (kind === 'modern8') {                      // Modernista: a cancela na abertura do muro (abre sozinha para a van e para quem está a pé)
    if (!mdGate.arm) { mdGate.arm = buildGateArm(FORESTV); world.scene.add(mdGate.arm); }   // (o mundo do bairro é construído uma vez só)
    mdGate.solid = { x0: FORESTV.GATE.x0, x1: FORESTV.GATE.x1, z0: FORESTV.GATE.z - 0.3, z1: FORESTV.GATE.z + 0.3 }; mdGate.k = 0; mdGate.arm.rotation.z = 0; SOLIDS.push(mdGate.solid);
  }   // faróis da van e luz do personagem só no Penumbra
  if (kind === 'farm10') { world.scene.add(chickens.object); chickens.reset(); } else chickens.detach();
  if (kind === 'favela8') { world.scene.add(favPets.object); favPets.reset(); } else favPets.detach();
  if (kind === 'farm10') { world.scene.add(tractors.object); tractors.reset(); } else { tractors.detach(); if (kind !== 'flux10' && kind !== 'night10' && kind !== 'canyon10') tractors.silence(); }
  van.setIce(kind === 'snow8' ? SNOWV.iceAt : null);   // Nevasca: placas de gelo
  van.setLowGravity(kind === 'moon8'); walker.setLowGravity(kind === 'moon8'); playerSuit.visible = kind === 'moon8';   // Órbita: gravidade baixa e capacete (só neste bairro)
  if (kind === 'forest8') { world.scene.add(forestCars.object); forestCars.reset({ loops: [...FORESTV.carLoops, FORESTV.carLoops[0].slice().reverse()], build: buildForestCar, speed: 3.0 }); } else forestCars.detach();   // Bosque: trânsito leve (o Modernista não tem carros circulando)
  if (kind === 'work8') { world.scene.add(workTraffic.object); workTraffic.reset(FORESTV, VAN_START); } else workTraffic.detach();   // Operário: caminhões, vans e carros
  if (kind === 'snow8') { world.scene.add(plow.object); plow.reset({ loops: [SNOWV.plowLoop], build: buildPlow, speed: 4.6 }); } else plow.detach();
  resetBanks();
  if (kind === 'venice8') { world.scene.add(npcBoats.object); npcBoats.reset(); world.scene.add(rope); } else npcBoats.detach();   // Bairro 11: trem e cancelas
  if (COMPOSED.includes(kind)) composeRound();   // Bairros 4 a 7: composição sorteada a cada partida
  else setupGrid4();
  boom.reset(); clearLaserVoids(); clearMoonPins(); if (!MOONV) rig.setOverview(null);
  rig.refit();
  if (!MOONV) rig.setExtraBoxes([]);
  resetVan();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  renderer.compile(world.scene, rig.camera);
}
// ---------- Órbita: a lua esférica ----------
// A simulação (van, personagem, colisões, câmera, entregas) segue no plano local do mapa; a cada quadro o referencial
// (moonFrame.js) é levado até quem o jogador controla e a lua é desenhada girada por baixo. Os obstáculos perto viram
// círculos no mapa local; a van estacionada (a pé) e os efeitos (seta da dica, explosões) ficam presos à esfera.
const moonAnchor = { x: 0, z: 0 };
const vanSph = { p: new THREE.Vector3(0, 1, 0), f: new THREE.Vector3(1, 0, 0) };
const moonPins = [];
const _mc = { x: 0, z: 0 }, _mv = new THREE.Vector3(), _mq = new THREE.Quaternion(), _mm = new THREE.Matrix4(), _mo = new THREE.Object3D(), _mov = new THREE.Vector3();
const MOON_NEAR = Math.cos(75 / MOON.R);                // obstáculos a até ~75 do jogador entram nas colisões
/** Grupo preso à lua no ponto (x, z) do mapa: o que for posto nele em coordenadas do mapa fica naquele lugar da lua. */
function moonPin(x, z) {
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  FRAME.frameAt(x, z, g.matrix).invert();
  world.moonRoot.add(g); moonPins.push(g);
  return g;
}
function clearMoonPins() {
  hint.attach(world.scene);                           // a seta volta para a cena antes de soltar os grupos
  for (const g of moonPins) if (g.parent) g.parent.remove(g);
  moonPins.length = 0;
}
boom.setPin((x, z) => MOONV && world.moonRoot ? moonPin(x, z) : null);
const setCircle = (o, x, z, r) => { o.cx = x; o.cz = z; o.r = r; o.x0 = x - r; o.x1 = x + r; o.z0 = z - r; o.z1 = z + r; return o; };
/** Partida nova na lua: a van no ponto de partida (o mapa local começa ali). */
function moonReset() {
  if (!MOONV || !world.moonRoot) return;
  clearMoonPins();
  FRAME.reset(MOONV.start.p, MOONV.start.f, van.x, van.z);
  vanSph.p.copy(MOONV.start.p); vanSph.f.copy(MOONV.start.f);
  for (const sp of MOONV.spots) if (!sp.solidN) sp.solidN = sp.n.clone().multiplyScalar(Math.cos(0.6 / MOON.R)).addScaledVector(sp.f, -Math.sin(0.6 / MOON.R)).normalize();
  if (!world.sunOfs) world.sunOfs = world.sunLight.position.clone().sub(world.sunLight.target.position);
  moonUpdate(0, true);
}
function resetVan() { van.reset(); moonReset(); }
function moonUpdate(dt, snap = false) {
  if (!MOONV || !world.moonRoot) return;
  const foot = walker.visible, ent = foot ? walker : van;
  const k = snap || Math.hypot(ent.x - moonAnchor.x, ent.z - moonAnchor.z) > 20 ? 1 : 1 - Math.exp(-18 * Math.min(dt, 0.1));   // (teletransporte: vai direto)
  moonAnchor.x += (ent.x - moonAnchor.x) * k; moonAnchor.z += (ent.z - moonAnchor.z) * k;
  FRAME.recenter(moonAnchor.x, moonAnchor.z);
  if (!foot) { FRAME.toSphere(van.x, van.z, vanSph.p); FRAME.tangent(vanSph.p, van.heading, vanSph.f); }
  else { FRAME.toChart(vanSph.p, _mc); van.teleport(_mc.x, _mc.z, FRAME.heading(vanSph.p, vanSph.f)); }
  const root = world.moonRoot;
  root.matrix.copy(FRAME.matrix); root.matrixWorldNeedsUpdate = true;
  if (foot) {                                         // van estacionada: exatamente sobre a esfera (frente do modelo = +X)
    FRAME.pose(_mo, vanSph.p, _mv.copy(vanSph.f).cross(vanSph.p).normalize(), 0);
    van.object.position.copy(_mo.position).applyMatrix4(root.matrix);
    van.object.quaternion.copy(_mq.setFromRotationMatrix(_mm.extractRotation(root.matrix))).multiply(_mo.quaternion);
  }
  // módulos e obstáculos → mapa local (os lotes primeiro, na ordem de HOUSE_SLOTS: wreck() depende disso)
  const O = FRAME.O, cam = [];
  SOLIDS.length = 0;
  for (const s of HOUSE_SLOTS) {
    const sp = MOONV.spots[s];
    FRAME.toChart(sp.n, _mc); sp.cx = sp.px = _mc.x; sp.cz = sp.pz = _mc.z;
    FRAME.toChart(sp.doorN, sp.door);
    sp.solid = sp.solid || {};
    if (sp.n.dot(O) > MOON_NEAR) { FRAME.toChart(sp.solidN, _mc); setCircle(sp.solid, _mc.x, _mc.z, 6.9); if (Math.hypot(_mc.x - ent.x, _mc.z - ent.z) < 40) cam.push([_mc.x - 6.5, _mc.z - 6.5, _mc.x + 6.5, _mc.z + 6.5, 9.5]); }
    else setCircle(sp.solid, 1e7, 1e7, 1);
    sp.box = sp.walkBox = sp.solid;
    SOLIDS.push(sp.solid);
  }
  for (const ob of MOONV.obstacles) {
    if (ob.n.dot(O) < MOON_NEAR) continue;
    FRAME.toChart(ob.n, _mc); ob.solid = setCircle(ob.solid || {}, _mc.x, _mc.z, ob.r); SOLIDS.push(ob.solid);
    if (ob.top > 2.5 && Math.hypot(_mc.x - ent.x, _mc.z - ent.z) < 40) cam.push([_mc.x - ob.r, _mc.z - ob.r, _mc.x + ob.r, _mc.z + ob.r, ob.top]);
  }
  rig.setExtraBoxes(cam);
  // luz do sol acompanha o jogador (é sempre dia por onde ele anda); visão geral: a lua inteira, vista de longe
  const L = world.sunLight; L.target.position.set(FRAME.ox, 0, FRAME.oz); L.position.copy(L.target.position).add(world.sunOfs); L.target.updateMatrixWorld();
  _mv.set(FRAME.ox, -MOON.R, FRAME.oz); _mo.position.copy(_mv).add(_mov.set(0, 0.6, 0.8).multiplyScalar(MOON.R * 3.7));
  rig.setOverview(_mo.position, _mq.setFromRotationMatrix(_mm.lookAt(_mo.position, _mv, _mov.set(0, 1, 0))));
}
// ---------- Modo Livre: "Laser orbital" (efeito da entrega errada escolhido no menu) ----------
// Sequência de 23 s (laser.js): raio fino do céu, viagem pela cena espacial separada até o satélite e volta, e o raio
// grosso apaga a quadra inteira (construção, quintal, cercas, morador e chão), que vira um vazio escuro até o fim da partida.
const laser = createLaser(audio);
const ursa = createUrsa(audio, stage);
const solar = createSolar(audio);
const reality = createReality(audio, stage, renderer);
let fxCine = laser;                                    // efeito cinematográfico em andamento (laser ou Ursa Menor)
const laserVoids = [];
let laserRet = 'drive';
function clearLaserVoids() { laser.cancel(); ursa.cancel(); solar.cancel(); reality.cancel(); for (const m of laserVoids) if (m.parent) m.parent.remove(m); laserVoids.length = 0; }
/** Área ocupada pela construção (quadra inteira; galpão = 2 lotes + a rua entre eles). */
function laserArea(slot) {
  const sp = SPOTS ? SPOTS.spots[slot] : null;
  if (FARMLAND) return sp.area;
  if (SPOTS) return sp.box;
  const o = slotOrigin(slot), ware = WARE_LIST.some(w => w.slots[0] === slot);
  return { x0: o.x - L_WALK, z0: o.z - L_WALK, x1: o.x + (ware ? L_LOT * 2 + L_ROAD : L_LOT) + L_WALK, z1: o.z + L_LOT + L_WALK };
}
/** Tira a van/o personagem de dentro da área antes do apagão (vai para a borda mais próxima, com folga). */
function pushOut(a, ent, isVan) {
  const m = 2.6, x = ent.x, z = ent.z;
  if (x < a.x0 - m || x > a.x1 + m || z < a.z0 - m || z > a.z1 + m) return;
  const opts = [[a.x0 - 4, z, x - a.x0], [a.x1 + 4, z, a.x1 - x], [x, a.z0 - 4, z - a.z0], [x, a.z1 + 4, a.z1 - z]].sort((p, q) => p[2] - q[2]);
  const [nx, nz] = opts[0];
  if (isVan) van.teleport(nx, nz, van.heading); else walker.pose(nx, nz, walker.heading);
}
function startLaser(h, slot, kind = 'laser') {
  laserRet = state === 'walk' ? 'walk' : 'drive';
  const sp = SPOTS ? SPOTS.spots[slot] : null;
  let parent, local, outerR, makeVoid, rect = null;
  if (MOONV) {                                          // Órbita: preso ao módulo, na vertical dele; o vazio é uma calota na esfera
    parent = moonPin(sp.cx, sp.cz); local = new THREE.Vector3(sp.cx, 0, sp.cz); outerR = 9.5;
    makeVoid = () => { const m = new THREE.Mesh(new THREE.SphereGeometry(MOON.R + 0.18, 48, 8, 0, Math.PI * 2, 0, 9.2 / MOON.R), new THREE.MeshBasicMaterial({ color: '#000000' }));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sp.n); world.moonRoot.add(m); return m; };
  } else {
    const a = laserArea(slot), y = sp ? sp.y : L_slotY(slot), w = a.x1 - a.x0, d = a.z1 - a.z0;
    parent = world.scene; local = new THREE.Vector3((a.x0 + a.x1) / 2, y, (a.z0 + a.z1) / 2); outerR = 0.5 * Math.hypot(w, d); rect = { w, d };
    pushOut(a, van, true); if (walker.visible) pushOut(a, walker, false);
    makeVoid = () => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 40, d), new THREE.MeshBasicMaterial({ color: '#000000' }));
      m.position.set(local.x, y + 0.34 - 20, local.z); world.scene.add(m); return m; };
  }
  world.hideResident(); van.stop(); nearHouse = -1;
  setState('laser');
  if (kind === 'reality') {                             // Devolução da Realidade (reality.js): carimbo, caixa do universo, canhão e a quadra vira cratera em forma de caixa
    fxCine = reality;
    reality.start({ parent, local, rect, moon: !!MOONV, cam: rig.camera, world, lot: world.lotGroup(h),
      onHide: () => world.setHidden(h, true), onDestroy: () => boom.markDestroyed(h),
      onCrater: g => laserVoids.push(g), onEnd: () => { setState(laserRet); actionLock = 0.6; } });
    return;
  }
  if (kind === 'ursa' || kind === 'solar') {            // Ursa Menor / Sistema Solar: 7 impactos; o 4º derruba a construção (escombros), os outros queimam o chão
    fxCine = ursa;
    const scorch = (i) => {
      const dark = new THREE.MeshStandardMaterial({ color: i === 6 ? '#2a221c' : '#3a2d22', roughness: 1 });
      let m;
      if (MOONV) m = new THREE.Mesh(new THREE.CylinderGeometry(i === 6 ? 8.6 : 3 + i * 0.4, i === 6 ? 8.6 : 3 + i * 0.4, 0.06, 28), dark);
      else if (i === 6) m = new THREE.Mesh(new THREE.BoxGeometry(rect.w - 0.2, 0.05, rect.d - 0.2), dark);
      else m = new THREE.Mesh(new THREE.CylinderGeometry(2.6 + i * 0.5, 3 + i * 0.5, 0.05, 20), dark);
      const off = i === 6 ? [0, 0] : [(Math.random() - 0.5) * (MOONV ? 6 : rect.w * 0.45), (Math.random() - 0.5) * (MOONV ? 6 : rect.d * 0.45)];
      m.position.set(local.x + off[0], local.y + (MOONV ? 0.09 : 0.215 + i * 0.002), local.z + off[1]);
      m.receiveShadow = true; parent.add(m); laserVoids.push(m);
    };
    if (kind === 'solar') {                             // Sistema Solar: 7 planetas (o 4º derruba a construção) e o Sol (quadra arrasada)
      fxCine = solar;
      solar.start({ parent, local, rect, moon: !!MOONV, cam: rig.camera, world,
        onImpact: i => { if (i === 3) boom.explode(h, slot); else if (i !== 6) scorch(i); },   // a destruição se acumula
        onSun: () => { if (!boom.isDestroyed(h)) boom.explode(h, slot); scorch(6); boom.markDestroyed(h); },
        onEnd: () => { setState(laserRet); actionLock = 0.6; } });
      return;
    }
    ursa.start({ parent, local, rect, moon: !!MOONV, cam: rig.camera, world: world.scene,
      onImpact: i => { if (i === 3) boom.explode(h, slot); if (i >= 4) scorch(i); if (i === 6) boom.markDestroyed(h); },
      onEnd: () => { setState(laserRet); actionLock = 0.6; } });
    return;
  }
  fxCine = laser;
  laser.start({ parent, local, outerR, rect, moon: !!MOONV, cam: rig.camera,
    onErase: () => { boom.markDestroyed(h); world.hideResident(); laserVoids.push(makeVoid()); },
    onEnd: () => { setState(laserRet); actionLock = 0.6; } });
}
function startBoss() {
  heli.reset(); van.stop(); nearHouse = -1;
  if (rig.mode !== 'chase') rig.toggle();
  monster.start(van);
  setState('boss');
}
let restartMsg = null;
van.reset();
rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
// Tela inicial: o bairro inteiro (câmera do bairro) desfocado ao fundo; "Livre" começa a partida
rig.toggle();
rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
let titleDriver = null;   // motorista curtindo a música (painel "Jogar")
// Depois do extra 1 (salvo à parte em NOVAN_KEY, para não voltar com mudanças futuras de fundo): o painel Jogar fica sem a van
// e o motorista (o espaço fica vazio, mostrando o fundo); o Shop e as partidas continuam com a van.
const NOVAN_KEY = 'adress.menu.noVan';
const noVan = () => { try { return localStorage.getItem(NOVAN_KEY) === '1'; } catch (e) { return false; } };
function syncNoVan() {
  try { if (!noVan() && localStorage.getItem('adress.extra.1') === '1') localStorage.setItem(NOVAN_KEY, '1'); } catch (e) { /* */ }
  document.body.classList.toggle('menu-novan', noVan());
}
const title = createTitle({
  onFree: () => { if (state === 'title' && !title.starting) openLevelSelect(); },   // Livre: primeiro escolhe o bairro
  onCareer: () => noVan() ? title.fadeOut(enterMap) : titleDriver.drive(() => title.fadeOut(enterMap)),     // dá a partida e vai para o mapa da Carreira (sem a van no menu: só o fade)
  onShop: () => { if (state === 'title') openShop(); },       // Shop: layout inicial (cores grátis; itens em breve)
  onPlay: el => { syncNoVan(); if (noVan()) { if (titleDriver) titleDriver.stop(); } else { titleDriver = titleDriver || createTitleDriver(el, audio); titleDriver.start(); }
    if (flagOn(MASS_KEY) && !flagOn(NOTICE_KEY)) { try { localStorage.setItem(NOTICE_KEY, '1'); } catch (e) { /* */ } title.notify('A história continua. Quatro novos lugares estão disponíveis no Modo Livre.'); } },   // uma vez, depois do temporal
  onBack: () => goBack(),                                      // Voltar do próprio painel (fica embaixo do logo)
  onSettings: () => { if (state === 'title') settings.open(); },   // Configurações (volume, tela cheia, controles)
});
// Shop (painel Jogar): cores da van e do personagem; o resto ainda não está à venda
const shop = createShop();
function openShop() { shop.open(); setState('shop'); }
// Livre: seleção do bairro (todas as miniaturas na tela; setas escolhem, E joga). Depois o helicóptero decola.
const levelSelect = createLevelSelect(l => confirmLevel(l), i => { if (i === 0) startExtra(); });   // (o 2º, liberado depois do 1º, ainda é espaço reservado)   // (o 1º cartão da página dos extras: introdução do extra 1)
function openLevelSelect() { levelSelect.setExtra(flagOn(MASS_KEY), flagOn(EXTRA1_KEY) ? 2 : 1); levelSelect.open(freeLevel); setState('levelSelect'); }   // (página dos 4 níveis extras: só depois do temporal)
function confirmLevel(l) {
  if (state === 'levelSelect' && l < 0 && levelSelect.onExtra) { startExtra(); return; }   // página dos extras: E/Enter abre o 1º
  if (state !== 'levelSelect' || l < 0 || RESERVED.includes(l)) return;   // (−1: página dos níveis extras, ainda sem fases)   // 17–19: reservados
  freeLevel = l;
  levelSelect.close();
  setState('levelFly');
  if (noVan() || !titleDriver) title.fadeOut(() => startFree('free'));   // (sem a van no menu: só o fade)
  else titleDriver.fly(() => title.fadeOut(() => startFree('free')));   // vira helicóptero e decola
}
// Carreira: mapa de seleção de fases (A/D na estrada, E joga — por enquanto, sempre a mesma partida)
let careerMap = null;
const inMap = () => state === 'mapIn' || state === 'map' || state === 'mapOut';
/** Último bairro da Carreira já desbloqueado (a van começa ao lado dele). */
const lastUnlocked = () => { let l = 0; while (l + 1 < MISSIONS.length && career.isUnlocked(l + 1)) l++; return l; };
function enterMap() {
  if (titleDriver) titleDriver.stop();
  careerMap = careerMap || createCareerMap(stage, audio);
  careerMap.resize(stage.clientWidth, stage.clientHeight);
  careerMap.enter(lastUnlocked()); careerMap.setLocked(l => !career.isUnlocked(l));
  fade = 1; hud.setFade(1);
  title.hide();
  setState('mapIn');
}

// Modos: 'free' (Livre: entregas sem fim no mesmo mapa, com destruição/míssil/helicóptero)
//        'career' (Carreira: entrada fechada; sem destruição, míssil, helicóptero ou explosões)
let gameMode = 'free';
const ENTRANCE_WALL = { x0: ENTRANCE.x0, z0: -0.5, x1: ENTRANCE.x1, z1: HEDGE };   // parede invisível da Carreira
// Botão "Voltar" (canto superior esquerdo): painel Jogar → tela inicial; mapa → painel;
// partida → painel (Livre) ou mapa (Carreira). Sair de uma partida encerra a partida (a próxima começa do zero).
const back = createBackButton(goBack);
const career = createCareer();          // progresso das missões e desbloqueio das fases (salvo no navegador)
const missions = createMissions(career); // Carreira: M perto da maquete abre as missões do bairro
// cadeado no mapa da Carreira (no lugar do botão DICA): a senha certa desbloqueia todos os bairros
// Checkpoints de teste da história secundária (no cadeado, depois da senha): grava no progresso salvo as etapas até a
// escolhida e apaga as posteriores. Cada cena lê esse progresso ao começar (caixa, K no terraço, igreja e sinos, bonde, Veneza).
const STORY_STEPS = ['Nada', 'Conversa na casa do personagem — completa', 'Conversa no terraço — completa', 'Primeira conversa na igreja — completa',
  'Trolley Problem — completo', 'Conversa em Veneza — completa', 'Segunda conversa na igreja — completa', "Encontro no Grillby's — completo",
  'Oficina — Entregar a última peça', 'Oficina no Bairro 24 — completa', 'Apresentação da igreja (Bairro 24) — vista', 'Missa e temporal — completos'];
const WS_LAST_CP = 8;    // checkpoint especial (fora da contagem de chaves): Grillby's feito, oficina na 3ª tarefa com a travessa buscada
const WS_CP_KEY = 'adress.dev.wsLast';   // 'start' = ainda vai pôr o jogador a pé diante da oficina (1× por seleção); 'held' = só mantém a travessa até a entrega
const storyKeys = () => [PARCEL_KEY, ROOF_KEY, CHURCH_TALK_KEY, TROLLEY_TALK_KEY, VENICE_TALK_KEY, CHURCH2_KEY, GRILL_TALK_KEY, 'adress.med.talk1', INTRO_KEY, MASS_KEY];
/** Ao entrar no Bairro 24 (Livre) com o checkpoint da oficina pendente: travessa já buscada; na 1ª vez depois da seleção, a pé diante da oficina. */
function applyWsCheckpoint() {
  let v = null; try { v = localStorage.getItem(WS_CP_KEY); } catch (e) { /* */ }
  if (!v || gameMode !== 'free' || neighborhood !== 'med10') return;
  let st = null; try { st = localStorage.getItem('adress.med.shop'); } catch (e) { /* */ }
  if (st !== '3') { try { localStorage.removeItem(WS_CP_KEY); } catch (e) { /* */ } return; }   // (já entregue: acabou)
  const P = wsStory.points; if (!P) return;
  wsStory.devTask({ step: 3, picked: true });
  if (v !== 'start') return;
  try { localStorage.setItem(WS_CP_KEY, 'held'); } catch (e) { /* */ }
  van.stop(); van.teleport(P.front.x + 2, P.front.z, Math.PI);
  walker.pose(P.door.x + 1.5, P.door.z, Math.PI); walker.setFloor(0); walker.show(true);
  wsFoot = true;                                        // no fim do fade-in, fica a pé (não na van)
}
let wsFoot = false;
const STORY_CP = {
  names: STORY_STEPS,
  current() {
    const k = storyKeys(); let n = 0; while (n < k.length && flagOn(k[n])) n++;
    if (n === 7 && localStorage.getItem(WS_CP_KEY) && localStorage.getItem('adress.med.shop') === '3') return WS_LAST_CP;
    return n >= 8 ? n + 1 : n;                          // (o da oficina ocupa a posição 9)
  },
  apply(n) {
    try { localStorage.removeItem(WS_CP_KEY); } catch (e) { /* */ }
    if (n === WS_LAST_CP) {                                // "Oficina — Entregar a última peça": tudo até o Grillby's, oficina etapa 3, nada depois
      this.apply(7);
      try { localStorage.setItem('adress.med.shop', '3'); localStorage.setItem(WS_CP_KEY, 'start'); for (const k of [EXTRA1_KEY, EXTRA2_KEY, EXTRA_DONE_KEY, NOVAN_KEY]) localStorage.removeItem(k); } catch (e) { /* */ }
      syncNoVan();
      return;                                              // (só prepara: vale ao entrar no Bairro 24 pelo Livre)
    }
    if (n > WS_LAST_CP) n--;                               // posições 10–12 = etapas de chaves 8–10
    storyKeys().forEach((k, i) => { try { if (i < n) localStorage.setItem(k, '1'); else localStorage.removeItem(k); } catch (e) { /* */ } });
    parcelDone = n >= 1;                                   // (lido na hora pela caixa e pelo K do terraço)
    try { if (n >= 8) localStorage.setItem('adress.med.shop', '5'); else localStorage.removeItem('adress.med.shop'); } catch (e) { /* */ }   // oficina do Bairro 24
    try { if (n >= 9) localStorage.setItem(BELL3_KEY, '1'); else localStorage.removeItem(BELL3_KEY); if (n < 10) localStorage.removeItem(NOTICE_KEY); } catch (e) { /* */ }   // sino laranja; aviso dos níveis extras
  },
};
// Missões da Carreira no mesmo painel (seção separada): reiniciar todas e escolher os bairros com todas as missões completas.
// Mexe só nas missões e na progressão (desbloqueios) da Carreira; a liberação de teste (todos os bairros) fica à parte.
const refreshCareerMap = () => { if (careerMap) careerMap.setLocked(l => !career.isUnlocked(l)); };
const DEV_MISSIONS = {
  levels: () => MISSIONS.map((m, i) => ({ i, label: `${i + 1}. ${LEVEL_TITLES[i] || 'Bairro ' + (i + 1)}`, has: career.hasMissions(i) })),
  completed: i => career.levelComplete(i),
  resetAll() { career.resetAll(); refreshCareerMap(); },
  apply(sel) { career.setCompleted(sel); refreshCareerMap(); },
  devOpen: () => career.allUnlocked,
  setDevOpen(on) { career.setAllOpen(on); refreshCareerMap(); },
};
const lock = createLockButton(stage, () => refreshCareerMap(), () => career.allUnlocked, STORY_CP, DEV_MISSIONS);   // (a senha só abre o painel)
// botão MISSÕES no canto superior direito durante a partida da Carreira (missões do bairro jogado)
// Cronômetro da partida (canto superior esquerdo): começa em 00:00 no 1º quadro jogável, pausa com o MENU ou as missões
// abertas, some nos menus e nas cenas (continua contando nelas), não zera na entrega certa do Livre; na Carreira congela na entrega certa.
const matchTimer = createMatchTimer(stage);
// Bairros 2 e 3 (Livre e Carreira): contador de batidas da van em casas, árvores e postes — e, no Bairro 3, nas barreiras
// (o mesmo vale para "Sem esbarrar" e para as missões das barreiras). Uma batida por encontro: o mesmo objeto só conta de
// novo depois que a van se afasta dele (folga > 1) e bate outra vez.
let bumps = 0;
const bumpHold = new Set();
const bumpLevel = () => { const lv = gameMode === 'career' ? careerLevel : freeLevel; return lv === 1 || lv === 2 || lv === 6; };
const bumpShown = () => [2, 6].includes(gameMode === 'career' ? careerLevel : freeLevel);   // Bairros 3 e 7
const bumpTarget = b => { const i = SOLIDS.indexOf(b); return (i >= 0 && i < HOUSE_SLOTS.length) || (world.extraSolids && world.extraSolids.includes(b)) || !!b.post || b.bar != null || !!b.jam; };   // lotes (casas), troncos das árvores, postes, barreiras
function countBumps() {
  for (const b of van.touched) if (!bumpHold.has(b) && bumpTarget(b)) { bumps++; bumpHold.add(b); if (gameMode === 'career') career.bump(b, barriers.list.length, b.jam || (b.bar != null && barriers.list[b.bar] && barriers.list[b.bar].type === 'truck')); }
  for (const b of bumpHold) if (!van.touched.has(b) && van.gapTo(b) > 1) bumpHold.delete(b);
}
const resetBumps = () => { bumps = 0; bumpHold.clear(); };
/** Prédios comerciais da partida (grade): porta e frente do lote (as fachadas dão para o sul). */
const shopFronts = () => game.pool.filter(h => HOUSES[h].kind === 'shop' && !boom.isDestroyed(h)).map(h => { const s = game.slotOf[h]; return { x: doorPoint(s).x, z: slotOrigin(s).z + L_LOT }; });
const TIMER_PLAY = ['drive', 'ring', 'dialog', 'fuel', 'walk', 'missile', 'chat', 'inside'];                 // partida na tela: aparece
const TIMER_OFF = ['title', 'levelSelect', 'levelFly', 'shop', 'mapIn', 'map', 'mapOut', 'fadeIn', 'fadeOut', 'extra'];   // menus e fades: não conta
const missionsBtn = createMissionsButton(stage, () => {
  if (gameMode === 'career' && IN_GAME.includes(state) && !missions.isOpen) missions.open(careerLevel);
});
let careerLevel = 0;                     // fase da Carreira sendo jogada
let freeLevel = 0;                       // bairro escolhido no modo Livre
const IN_GAME = ['drive', 'ring', 'dialog', 'missile', 'fuel', 'walk'];
function showPlayPanel() {
  menuWorld();                                          // depois do 4º sino: o fundo é sempre o Bairro 24 na chuva
  if (rig.mode !== 'overview') rig.toggle();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  fade = 0;
  title.show('play');
  if (titleDriver && !noVan()) { titleDriver.reset(); titleDriver.start(); }   // (sem a van no menu depois do extra 1)
  setState('title');
}
// Carreira: a entrega certa encerra a partida. Fade-out de ~1 s (controles parados) e, com a tela preta, a partida acaba e
// volta o mapa da Carreira com fade-in, a van ao lado do bairro jogado. As missões cumpridas nesta partida já foram confirmadas e
// salvas na entrega certa (career.visit → confirm, que só aumenta e não conta de novo o que já estava concluído); o mapa relê os desbloqueios.
let endToMap = false;
const CAREER_END_FADE = 1.0;
function finishCareerMatch() {
  endToMap = false;
  dialog = null; world.hideResident(); missions.close();
  startNewRound(false); game.delivered = 0;           // limpa o bairro para a próxima vez (a próxima partida começa ao jogar de novo)
  career.stop();
  careerMap = careerMap || createCareerMap(stage, audio);
  careerMap.resize(stage.clientWidth, stage.clientHeight);
  careerMap.enter(careerLevel); careerMap.setLocked(l => !career.isUnlocked(l));   // bairro novo desbloqueado aparece colorido
  fade = 1; hud.setFade(1);
  setState('mapIn');
}
function goBack() {
  if (state === 'title' && title.visible && title.screen === 'play' && !title.starting) {
    if (titleDriver) titleDriver.stop();
    title.show('home');
  } else if (state === 'shop') {
    shop.close();
    if (titleDriver) titleDriver.refit();                // a van pode ter mudado (bagageiro alto): reenquadra
    setState('title');
  } else if (state === 'levelSelect') {
    levelSelect.close();
    setState('title');
  } else if (state === 'map') {
    missions.close();
    careerMap.leave();
    showPlayPanel();
  } else if (state === 'extra') {
    endExtra(false);                                    // sair do nível extra: volta ao painel Jogar (nada é salvo)
  } else if (IN_GAME.includes(state)) {
    startNewRound();
    game.delivered = 0;
    if (gameMode === 'career') { careerMap = careerMap || createCareerMap(stage, audio); careerMap.enter(); careerMap.setLocked(l => !career.isUnlocked(l)); fade = 1; setState('mapIn'); }
    else showPlayPanel();
  }
}

function startFree(mode = 'free') {
  // Bairro 2: 6×6 com praça; Bairro 4: 5×5 com bloqueios; o resto: 4×4
  endToMap = false; matchTimer.reset(); resetBumps();
  const lv = mode === 'career' ? careerLevel : freeLevel;
  useNeighborhood(lv === 1 ? 'plaza6' : lv === 3 ? 'grid5' : lv === 4 ? 'grid6s' : lv === 5 ? 'city6' : lv === 6 ? 'city7' : lv === 7 ? 'city8' : lv === 8 ? 'hill8' : lv === 9 ? 'venice8' : lv === 10 ? 'canal8' : lv === 11 ? 'rail8' : lv === 12 ? 'favela8' : lv === 13 ? 'flux10' : lv === 14 ? 'farm10' : lv === 15 ? 'snow8' : lv === 16 ? 'garden8' : lv === 18 ? 'night10' : lv === 19 ? 'moon8' : lv === 17 ? 'modern8' : lv === 20 ? 'work8' : lv === 21 ? 'forest8' : lv === 22 ? 'canyon10' : lv === 23 ? 'med10' : 'grid4');   // 17–19 reservados; 20 = Lua   // 10 = Veneza, 11 = Travessia, 12 = Trilhos
  gameMode = mode;
  if (!COMPOSED.includes(neighborhood)) setupGrid4();   // Bairro 1 tem a casa fixa; o 3 (mesma grade) não
  resetGates();
  setupChurch(); setupMedStory(); setupVeniceK();
  if (mode === 'career') career.startMatch(careerLevel); else career.stop();
  music.setTrack(LEVEL_TRACKS[neighborhood] || null, true);   // Veneza, Colheita e Nevasca: a faixa do bairro já tocando
  ENTRANCE_WALL.x0 = ENTRANCE.x0; ENTRANCE_WALL.x1 = ENTRANCE.x1;   // a entrada depende do bairro
  const w = SOLIDS.indexOf(ENTRANCE_WALL);
  if (mode === 'career' && w < 0) SOLIDS.push(ENTRANCE_WALL);
  if (mode !== 'career' && w >= 0) SOLIDS.splice(w, 1);
  refreshBarriers();
  applyJams();
  resetParcel(); talkBox.hide();
  if (titleDriver) titleDriver.stop();
  title.hide();
  if (rig.mode !== 'chase') rig.toggle();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  fade = 1;
  setState('fadeIn');
}

// Botão direito do mouse (segurado): olhar em volta com a câmera atrás da van; ao soltar, ela volta
addEventListener('contextmenu', e => { if (IN_GAME.includes(state)) e.preventDefault(); });
addEventListener('mousedown', e => { if (e.button === 2 && IN_GAME.includes(state) && !missions.isOpen) rig.orbitHold(true); });
addEventListener('mousemove', e => { if (e.buttons & 2) rig.orbit(e.movementX, e.movementY); });
addEventListener('mouseup', e => { if (e.button === 2) rig.orbitHold(false); });
addEventListener('mousedown', e => { if (e.button === 1 && IN_GAME.includes(state) && !missions.isOpen) { e.preventDefault(); rig.resetView(); } });   // botão do meio: volta a câmera ao padrão
addEventListener('wheel', e => { if (IN_GAME.includes(state) && rig.mode === 'chase' && !missions.isOpen) { e.preventDefault(); rig.zoom(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY); } }, { passive: false });   // roda: zoom (só aproxima)
addEventListener('blur', () => rig.orbitHold(false));
function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  rig.resize(w, h);
  if (careerMap) careerMap.resize(w, h);
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------- Estado ----------
const FADE_TIME = 0.8, RING_TIME = 0.8, RESIDENT_APPEAR = 0.45, SUCCESS_AUTO = 4.5;
let state = 'title', stateT = 0, fade = 0;
let dialog = null, pending = -1, nearHouse = -1;
let actionLock = 0;                 // depois de fechar uma reclamação, E não toca a mesma campainha de novo na hora
const setState = s => { state = s; stateT = 0; if (s === 'title' || s === 'mapIn' || s === 'map') music.setTrack(null); };   // fora da partida: a música padrão
// Músicas próprias de alguns bairros (assets/): começam sozinhas ao entrar no bairro (Livre e Carreira)
const LEVEL_TRACKS = { venice8: tarantellaUrl, farm10: sunnyUrl, snow8: snowyUrl, moon8: waterfallUrl };   // 20 (Lua): Waterfall
// Créditos mostrados ao lado do botão de música. Só o que foi informado/confirmado; sem autor cadastrado, só o título;
// faixa sem título cadastrado (null) não mostra nada.
const TRACK_INFO = {
  default: { title: 'Another Day in Hometown', author: 'Toby Fox' },
  [tarantellaUrl]: { title: 'Tarantella Napoletana', author: 'Luigi Ricci' },
  [sunnyUrl]: { title: 'Sunnyside Farm', author: 'MasterSwordRemix' },
  [snowyUrl]: { title: 'Snowy', author: 'Toby Fox' },
  [waterfallUrl]: { title: 'Waterfall', author: 'Toby Fox' },
  church: { title: 'Dark Sanctuary', author: 'Toby Fox' },
  church2: { title: 'The Second Sanctuary', author: 'Woop' },
  bell2: { title: 'Once Upon An Innocent Time', author: 'Undertale Green' },
  sans: { title: 'sans.', author: 'Toby Fox' },
  rain: { title: "It's Raining Somewhere Else", author: 'Toby Fox' },
  third: { title: 'The Third Sanctuary' },
  churchTalk: { title: 'Once Upon A Terrible Time', author: 'UTB Team' },
  train: { title: 'The Train Problem', author: 'MasterSwordRemix' },
  justUs: { title: 'just us', author: 'Toby Fox' },
};
/** O que está tocando agora (cenas especiais primeiro). */
function nowPlaying() {
  if (state === 'title' || state === 'levelSelect' || state === 'shop') return null;   // telas de menu: sem créditos
  if (voidMusic.audible) return TRACK_INFO.justUs;               // extra 1: o deslocamento pelo vazio
  if (thirdMusic.audible) return TRACK_INFO.third;              // montagem da igreja (Bairro 24)
  if (rainMusic.audible) return TRACK_INFO.rain;                // conversa com o K no Grillby's
  if (grillMusic.audible) return TRACK_INFO.sans;               // Grillby's (Nevasca)
  if (sTrainProblem.audible) return TRACK_INFO.train;          // (audible: inclui o fade-out final)
  if (bellMusic.audible) return TRACK_INFO.bell2;
  if (talkMusic.audible) return TRACK_INFO.churchTalk;
  if (churchMusic2.audible) return TRACK_INFO.church2;
  if (churchMusic1.audible) return TRACK_INFO.church;
  if (music.playing) return TRACK_INFO[music.track] || TRACK_INFO.default;   // (a música dos engarrafamentos não entra)
  return null;
}   // (embutidas no html: funcionam em qualquer lugar)

// Posto de gasolina: parado embaixo da cobertura, ao lado das bombas, E abastece (não conta como entrega).
// Para abastecer de novo, a van precisa sair de perto das bombas e voltar.
const FUEL_TIME = 1.8;
const FUEL_LINES = [
  'Frentista: “Deu R$ 389,90.” — É MUITO CARO!',
  'Frentista: “Completinho! R$ 412,00… aceita cartão?” — É muito caro!',
  'Frentista: “Gasolina subiu de novo hoje, viu?” — Que caro!',
];
let nearPump = false, fuelArmed = true, fuelMsgT = 0, fuelMsg = '';
function atPump() {
  const inZone = GAS_LIST.some(g => {
    const o = slotOrigin(g.slots[0]), lx = van.x - o.x, lz = van.z - o.z;
    return Math.abs(lz - GAS_CANOPY.cz) < 3.6 && GAS_ISLANDS.some(ix => Math.abs(lx - ix) < 3.9);
  });
  if (!inZone) { fuelArmed = true; return false; }
  return fuelArmed && Math.abs(van.speed) <= DELIVERY_MAX_SPEED;
}

let footDelivery = false;              // Veneza: entrega feita a pé (depois do diálogo volta a andar)
/** Medieval: morador conversável perto do personagem a pé; só vale se estiver mais perto que a porta de entrega. */
function medTalkTarget() {
  if (!MEDV || neighborhood !== 'med10' || !walker.visible) return null;
  const npc = medLife.nearTalk(walker.x, walker.z);
  if (!npc) return null;
  if (nearHouse >= 0 && npc.x != null) {
    const p = doorPoint(game.slotOf[nearHouse]);
    if (Math.hypot(p.x - walker.x, p.z - walker.z) < Math.hypot(npc.x - walker.x, npc.z - walker.z)) return null;
  }
  return npc;
}
function startChat(npc) {
  chatNpc = npc; nearHouse = -1;
  const lines = medLife.talk(npc, walker.x, walker.z);
  setState('chat');
  talkBox.show(lines, () => { if (chatNpc) medLife.endTalk(chatNpc); chatNpc = null; actionLock = 0.4; setState('walk'); });
}
function findNearHouseFoot() {
  let best = 3.6, found = -1;
  for (const h of game.pool) {
    if (boom.isDestroyed(h)) continue;
    const p = doorPoint(game.slotOf[h]), d = Math.hypot(walker.x - p.x, walker.z - p.z);
    if (d < best) { best = d; found = h; }
  }
  return found;
}
function findNearHouse() {
  if (Math.abs(van.speed) > DELIVERY_MAX_SPEED) return -1;
  let best = FORESTV && FORESTV.work ? 3.9 : MEDV ? 4.8 : DELIVERY_RADIUS, found = -1;   // Operário: só a unidade bem em frente (os portões geminados ficam a 8)
  for (const h of game.pool) {
    if (SPOTS && SPOTS.spots[game.slotOf[h]] && SPOTS.spots[game.slotOf[h]].foot) continue;   // Morro (becos/escadarias) e Jardins (entrada pelo parque): só a pé
    const p = doorPoint(game.slotOf[h]);
    const d = Math.hypot(van.x - p.x, van.z - p.z);
    if (d < best) { best = d; found = h; }
  }
  return found;
}

function requestHint() {
  if (state !== 'drive' || hintUsed || hintStep === game.step) return;
  hintCount++; hintUsed = hintCount >= hintLimit();
  if (gameMode === 'career') career.hint();
  hintStep = game.step;
  const h = game.route[game.step];
  hint.drop(h, game.slotOf[h]);                // a câmera não muda; o jogador segue dirigindo
  if (MOONV) { const o = slotOrigin(game.slotOf[h]); hint.attach(moonPin(o.x + 8.6, o.z + 5)); }   // Órbita: a seta cai no módulo, presa à lua
}

// Van imparável: casas que ela toca explodem; árvores e sebe viram uma chuva de lascas e folhas.
const smashCool = new Map();
function wreck(dt) {
  for (const [k, v] of smashCool) { if (v - dt <= 0) smashCool.delete(k); else smashCool.set(k, v - dt); }
  const R = 1.3, c = Math.cos(van.heading), s = Math.sin(van.heading);
  for (let i = 0; i < SOLIDS.length; i++) {
    const b = SOLIDS[i];
    let touch = false;
    for (const off of [-1.8, 0, 1.8]) {
      const x = van.x + c * off, z = van.z + s * off;
      if (x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R) { touch = true; break; }
    }
    if (!touch) continue;
    const lots = HOUSE_SLOTS.length, treesFrom = lots + (PLAZA ? 1 : 0) + GAS_LIST.length * GAS_PARTS.length + 5;   // ordem de SOLIDS (layout.js)
    if (i < lots) {                                 // lote: a casa explode (uma vez por rodada)
      const slot = HOUSE_SLOTS[i], h = game.layout[slot];
      if (h >= 0 && !boom.isDestroyed(h)) boom.explode(h, slot);
    } else if (!smashCool.has(i)) {                 // sebe ou árvore
      smashCool.set(i, 0.35);
      const tree = i >= treesFrom;
      boom.smash(Math.min(Math.max(van.x + c * 2.4, b.x0), b.x1), Math.min(Math.max(van.z + s * 2.4, b.z0), b.z1),
        tree ? ['#3f8f3a', '#57a84a', '#6b4526', '#2f7a32'] : ['#3f8f3a', '#2f7a32', '#57a84a'], tree ? 30 : 14);
    }
  }
}

// Livre: entrega certa → nova encomenda e pista na hora, no mesmo mapa (casas destruídas ficam de fora)
function nextDelivery() {
  dialog = null; world.hideResident();
  const available = game.pool.filter(h => !boom.isDestroyed(h) && !jamBlocked(h));
  if (available.length < ROUTE_LEN) { setState('fadeOut'); return; }   // poucas casas de pé: recomeça o bairro
  game.newDelivery(available);
  hint.clear(); hintUsed = false; hintStep = -1; hintCount = 0;
  actionLock = 0.6;
  setState(footDelivery ? 'walk' : 'drive'); footDelivery = false;   // Veneza: entregou a pé, continua a pé
}

// ---------- Bairro 1: a caixa do K (casa fixa do canto) ----------
// Uma caixa por partida no lote 0 (canto oposto), à direita da casa, no canto do quintal perto do encontro das cercas.
// Só dá para pegar a pé; entrar na van com ela a devolve ao lugar. Entregue ao K, ele deixa o jornal de lado
// e conversa (caixa de diálogo, câmera fixa). Depois de entregue (salvo para sempre), a caixa some e ele só repete a última fala.
const PARCEL_KEY = 'adress.l1.kParcel', K_HOUSE = L1_FIXED[15];
try { const old = localStorage.getItem('adress.l1.' + 'galdino' + 'Parcel'); if (old) { localStorage.setItem(PARCEL_KEY, old); localStorage.removeItem('adress.l1.' + 'galdino' + 'Parcel'); } } catch (e) { /* progresso salvo com a chave antiga */ }
let parcelDone = false;
try { parcelDone = localStorage.getItem(PARCEL_KEY) === '1'; } catch (e) { /* sem armazenamento */ }
const PARCEL_AT = { x: 15.7, z: 2.3 };                  // coordenadas do lote 0
const parcel = (() => {
  const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
  const add = (w, h, d, c, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); o.position.set(x, y, z); o.castShadow = true; g.add(o); };
  add(0.7, 0.52, 0.7, '#c8925a', 0, 0.26, 0);            // papelão
  add(0.72, 0.525, 0.14, '#e8d3a0', 0, 0.26, 0);          // fita
  add(0.14, 0.53, 0.72, '#e8d3a0', 0, 0.26, 0);
  add(0.26, 0.01, 0.18, '#ffffff', 0.18, 0.531, 0.2);     // etiqueta
  g.name = 'k-parcel';
  return g;
})();
let carrying = false, parcelGiven = false;   // parcelGiven: já entregue nesta partida (fica ao lado dele, sem poder pegar de volta)
const isL1 = () => neighborhood === 'grid4' && (gameMode === 'career' ? careerLevel : freeLevel) === 0;
function resetParcel() {
  carrying = false; parcelGiven = false;
  if (parcel.parent) parcel.parent.remove(parcel);
  if (!isL1() || parcelDone) return;
  const o = slotOrigin(0);
  parcel.position.set(o.x + PARCEL_AT.x, 0, o.z + PARCEL_AT.z); parcel.rotation.set(0, 0.35, 0);
  world.scene.add(parcel);
}
const nearParcel = () => !carrying && !parcelGiven && parcel.parent && Math.hypot(walker.x - parcel.position.x, walker.z - parcel.position.z) < 1.9;
const readerSpot = () => { const lot = world.scene.getObjectByName('lot:' + K_HOUSE); return lot && lot.visible ? lot.getObjectByName('reader-spot') : null; };
const _rp = new THREE.Vector3();
/** Perto do K, na frente dele (a pé). */
function nearK() {
  if (!isL1() || !(carrying || parcelDone)) return false;
  const sp = readerSpot(); if (!sp) return false;
  sp.getWorldPosition(_rp);
  const r = sp.rotation.y, fx = Math.cos(r), fz = -Math.sin(r), dx = walker.x - _rp.x, dz = walker.z - _rp.z;
  return Math.hypot(dx, dz) < 2.9 && dx * fx + dz * fz > -0.2;
}
const talkBox = createTalkBox(stage);
const K_LAST = ['Pelo visto, vou ter que me mudar para ', { b: 'o topo de um prédio alto' }, '. Quem sabe assim vocês finalmente me enxergam.'];
const K_LINES = [
  ['Ah! Finalmente uma encomenda que é minha mesmo!'],
  ['Já recebi tanta coisa que não pedi que comecei a conferir se o nome na porta ainda era o meu.'],
  ['Mas me diga: foi tão difícil assim encontrar esta casa?'],
  K_LAST,
];
const talkCam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
let talkPhase = '', talkLines = null;
function startTalk() {
  const sp = readerSpot(); sp.getWorldPosition(_rp);
  const r = sp.rotation.y, f = { x: Math.cos(r), z: -Math.sin(r) }, rt = { x: Math.sin(r), z: Math.cos(r) };   // frente e direita dele
  const px = _rp.x + rt.x * 1.9 - f.x * 0.1, pz = _rp.z + rt.z * 1.9 - f.z * 0.1;          // o jogador fica ao lado dele (vista lateral)
  walker.pose(px, pz, Math.atan2(_rp.z - pz, _rp.x - px));
  const d = new THREE.Vector3(_rp.x - px, 0, _rp.z - pz).normalize();
  // câmera fixa: atrás e à direita do jogador (ele aparece em parte, em primeiro plano) e o K de lado, à frente
  talkCam.pos.set(px - d.x * 1.7 - d.z * 1.75, 1.85, pz - d.z * 1.7 + d.x * 1.75);
  talkCam.look.set(_rp.x * 0.85 + px * 0.15, 0.95, _rp.z * 0.85 + pz * 0.15);
  if (carrying) {                                         // a caixa fica no chão, ao lado da cadeira
    carrying = false; parcelGiven = true;
    parcel.position.set(_rp.x + f.x * 0.55 - rt.x * 0.95, 0, _rp.z + f.z * 0.55 - rt.z * 0.95); parcel.rotation.set(0, -r + 0.3, 0);
    talkLines = K_LINES;
  } else talkLines = [K_LAST];
  sp.userData.setAside(true);
  talkPhase = 'aside';
  setState('talk');
}
function endTalk() {
  if (!parcelDone && talkLines === K_LINES) { parcelDone = true; try { localStorage.setItem(PARCEL_KEY, '1'); } catch (e) { /* */ } }
  const sp = readerSpot(); sp && sp.userData.setAside(false);   // volta a ler
  talkPhase = ''; actionLock = 0.4;
  rig.snap({ x: walker.x, z: walker.z, heading: walker.heading, speed: 0 });   // câmera de sempre, atrás do personagem
  setState('walk');
}

// ---------- Bairro 6: o K no terraço do prédio fixo (C5) ----------
// Só aparece depois da conversa da caixa no Bairro 1. Chega-se de helicóptero (Livre): pousado no terraço, L desce a pé.
let roofWalk = null;                                    // { s, h, o, y }: terraço onde o personagem está andando
function roofUnderVan() {
  for (const s of HOUSE_SLOTS) {
    const h = game.layout[s];
    if (h < 0 || HOUSES[h].kind !== 'apt' || boom.isDestroyed(h)) continue;
    const o = slotOrigin(s), R = APT_ROOF;
    if (van.x > o.x + R.x0 && van.x < o.x + R.x1 && van.z > o.z + R.z0 && van.z < o.z + R.z1) return { s, h, o, y: aptRoofY(HOUSES[h]) + TERRAIN.h(o.x + 8.6, o.z + 8.6) };
  }
  return null;
}
/** Bordas da laje (não dá para cair) + piscina/caixa-d'água como obstáculos. */
function roofSolids() {
  const o = roofWalk.o, R = APT_ROOF, a = HOUSES[roofWalk.h], B = 1e4, e = 0.25;
  const out = [
    { x0: -B, x1: o.x + R.x0 + e, z0: -B, z1: B }, { x0: o.x + R.x1 - e, x1: B, z0: -B, z1: B },
    { x0: -B, x1: B, z0: -B, z1: o.z + R.z0 + e }, { x0: -B, x1: B, z0: o.z + R.z1 - e, z1: B },
  ];
  if (a.atop === 'pool') out.push({ x0: o.x + R.x0 + 1.2, x1: o.x + R.x1 - 1.2, z0: o.z + R.z0 + 1.4, z1: o.z + R.z1 - 1.6 });
  if (a.atop === 'tank') { const cx = o.x + (R.x0 + R.x1) / 2, cz = o.z + (R.z0 + R.z1) / 2; out.push({ x0: cx - 2, x1: cx + 2, z0: cz - 2, z1: cz + 2 }); }
  return out;
}
const LOUNGER_APT = L6_FIXED[16];
const loungerSpot = () => { const lot = world.scene.getObjectByName('lot:' + LOUNGER_APT); return lot ? lot.getObjectByName('lounger-reader') : null; };
function showLounger() { const lr = loungerSpot(); if (lr) lr.visible = parcelDone; }
function nearLounger() {
  if (!roofWalk || roofWalk.h !== LOUNGER_APT) return false;
  const lr = loungerSpot(); if (!lr || !lr.visible) return false;
  lr.getWorldPosition(_rp);
  return Math.hypot(walker.x - _rp.x, walker.z - _rp.z) < 2.6;
}
const ROOF_LINES = [
  ['Você veio mesmo até aqui… Não faltou ', { b: 'determinação' }, ', hein?'],
  ['Dessa vez, parece que a entrega foi a sua presença.'],
  ['Ou talvez você tenha vindo por vontade própria, sem nenhuma encomenda como desculpa.'],
  ['Seja como for, acho que nossas conversas já despertaram sua curiosidade.'],
  ['Se quiser continuar, procure por mim num lugar onde o tempo parece andar mais devagar, além do bairro onde nos conhecemos.'],
  ['Lá no primeiro bairro, as casas escondem o caminho. ', { b: 'Mas o sol ainda aponta a direção.' }],
  ['Deixe o bairro para trás e ', { b: 'dirija na direção do sol.' }, ' Depois de algum tempo, verá o lugar no horizonte. ', { b: 'Estarei lá.' }],
];
function startRoofTalk() {
  const lr = loungerSpot(); lr.getWorldPosition(_rp);
  van.object.visible = false;                           // o helicóptero some só durante esta cena (não tampa nada)
  const px = _rp.x + 1.45, pz = _rp.z - 0.3;            // em pé ao lado da espreguiçadeira (lado leste), olhando para ele
  walker.pose(px, pz, Math.atan2(_rp.z - pz, _rp.x - px));
  const y = walker.floor;
  talkCam.pos.set(_rp.x + 1.4, y + 2.7, _rp.z - 4.6);    // por cima da piscina, de frente para os dois
  talkCam.look.set((_rp.x + px) / 2, y + 0.7, (_rp.z + pz) / 2 + 0.3);
  talkLines = ROOF_LINES; talkPhase = 'talk';
  setState('talk');
  talkBox.show(ROOF_LINES, () => {                      // fim da conversa: some a caixa de fala; aparece o aviso da interface
    talkPhase = 'note';
    try { localStorage.setItem(ROOF_KEY, '1'); } catch (e) { /* */ }   // conversa do terraço concluída (libera a igreja)
    talkBox.note('ORIENTAÇÃO DO JOGO', ['Use o ', { b: 'Modo Livre' }, ', a qualquer momento, caso tenha interesse.'], () => {
      talkPhase = 'fade';
      talkBox.fadeBlack(1, 3000, () => {                  // ~3 s até ficar tudo escuro…
        endRoofScene();
        talkBox.fadeBlack(0, 1500);                       // …e ~1,5 s revelando a tela inicial
      });
    });
  });
}
/** Encerra a partida e volta para a tela inicial (com a tela preta). */
function endRoofScene() {
  talkBox.hide(); talkPhase = '';
  walker.show(false); walker.setFloor(0); roofWalk = null;
  van.object.visible = true;
  heli.reset();
  startNewRound();
  game.delivered = 0;
  if (gameMode === 'career') career.stop && career.stop();
  menuWorld();
  if (rig.mode !== 'overview') rig.toggle();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  fade = 0;
  title.show('home');
  if (titleDriver) titleDriver.stop();
  setState('title');
}

// ---------- Bairro 1 (Livre): a igreja na direção do sol ----------
// Só existe depois das DUAS conversas (caixa no Bairro 1 + terraço no Bairro 6), só no Bairro 1 e só no Modo Livre.
// Fica escondida (nem a silhueta) até o jogador, fora do bairro, dirigir ~5 s na direção do sol (sul); aí surge aos poucos.
const ROOF_KEY = 'adress.l6.roofTalk';
const roofDone = () => { try { return localStorage.getItem(ROOF_KEY) === '1'; } catch (e) { return false; } };
const CHURCH_Z = 1150;                                  // distância ao sul da sebe (bem longe: ~1 min dirigindo)
let church = null, churchBell = null, greenBell = null, churchOn = false, churchT = 0, churchA = 0, churchShown = false;
const churchSolids = [];
function setupChurch() {
  for (const b of churchSolids) { const i = SOLIDS.indexOf(b); if (i >= 0) SOLIDS.splice(i, 1); }
  rig.setExtraBoxes([]);
  churchSolids.length = 0;
  let pd = parcelDone; try { pd = pd || localStorage.getItem(PARCEL_KEY) === '1'; } catch (e) { /* */ }
  churchOn = isL1() && gameMode === 'free' && pd && roofDone() && !flagOn(GRILL_TALK_KEY);   // as duas conversas, lidas do progresso salvo; depois do Grillby's a igreja está no Bairro 24
  churchT = 0; churchA = 0; churchShown = false; earlyFade = false;
  endApproachMusic(0.3); approach = { phase: 'idle' };
  if (unwhite && !cine) restoreLook();                 // (aparência branca de uma visita anterior)
  churchMusic = churchOn && churchStage() === 2 ? churchMusic2 : churchMusic1;
  if (church && church.parent) church.parent.remove(church);
  if (!churchOn) return;
  churchMusic.load().catch(() => {});                   // decodifica já: na hora da aproximação a faixa está pronta
  talkMusic.load().catch(() => {});                     // (e a da conversa)
  if (churchStage() === 2) bellMusic.load().catch(() => {});
  if (!church) {
    church = buildChurch();
    churchBell = buildBell(); church.add(churchBell);                // sino azul (1ª conversa): cai no fim da cena de saída
    greenBell = buildBell('#00C000', BELL2_X); church.add(greenBell);   // sino verde (2ª conversa): 2º vão do corredor
    church.userData.materials.push(...churchBell.userData.materials, ...greenBell.userData.materials);
  }
  const st = churchStage();
  for (const b of [churchBell, greenBell]) { b.userData.bell.position.set(0, 0, 0); b.userData.bell.rotation.set(0, 0, 0); b.visible = false; }
  // só aparecem na cena de saída (fora do quadro, antes de a câmera subir); depois da 1ª conversa (já na 2ª etapa), o azul fica caído
  if (churchTalkDone()) { churchBell.visible = true; churchBell.userData.bell.position.y = -bellDrop(churchBell); }   // 1ª conversa feita: o azul já está caído
  if (st >= 3) { greenBell.visible = true; greenBell.userData.bell.position.y = -bellDrop(greenBell); }
  church.userData.pewK.visible = st < 3 || st >= 4;     // depois da despedida ele já foi embora; depois do Grillby's está de volta (sem conversa por enquanto)
  church.position.set(MAP_W() / 2, 0, MAP_W() + CHURCH_Z); church.rotation.y = Math.PI;   // fachada virada para o bairro (norte)
  church.visible = false;
  world.scene.add(church);
}
let sunSprite = null; const SUN_OFS = new THREE.Vector3();
function grabSun() { sunSprite = world.scene.getObjectByName('sun'); if (sunSprite) SUN_OFS.set(0, sunSprite.position.y, sunSprite.position.z - MAP / 2); }
const MAP_W = () => MAP;                                // largura do bairro (lado do quadrado, com a sebe)
// Aproximação (sincronizada com assets/dark-sanctuary.mp3): ~1 s dirigindo para o sul fora do bairro → a van segue sozinha
// para a igreja (mesma velocidade e câmera; W solto não para; L/H/F bloqueados) e a faixa começa do início (fade-in 2 s),
// pausando a música de fundo. A igreja só aparece quando a POSIÇÃO REAL do áudio chega a 14 s: aí surge rápido e os controles voltam.
// A faixa continua até o jogador entrar na igreja a pé (fade-out ~1 s). Uma vez por partida.
// 2ª visita (depois de Veneza): a aproximação usa assets/second-sanctuary.mp3 e a igreja surge aos 28 s
const churchMusic1 = createChurchMusic(audio), churchMusic2 = createChurchMusic(audio, secondSanctuaryUrl);
let churchMusic = churchMusic1;
// 2ª visita: música da cena do sino verde (assets/innocent-time.mp3), do início ao fim; depois a música de fundo volta
const bellMusic = createChurchMusic(audio, innocentTimeUrl, 0.3, () => music.suspend(false));
const grillMusic = createChurchMusic(audio, sansUrl, 0.5, null, true);   // Grillby's: "sans." em loop
const rainMusic = createChurchMusic(audio, rainUrl, 0.5, null, true);   // conversa com o K no Grillby's (diálogos 1–2), em loop
// Música da conversa com o K na igreja (assets/church-talk.mp3): começa 10 s depois da 1ª fala aparecer, fade-in de 8 s até
// 50%, toca mesmo com o botão ♪ desligado (sem mudar a preferência) e vai até o fim sem fade-out nem loop, inclusive de
// volta à vila. Enquanto toca, a música de fundo fica suspensa; ao terminar, volta como o jogador deixou.
const TALK_MUSIC_AT = 10, TALK_MUSIC_FADE = 8;
const talkMusic = createChurchMusic(audio, talkTrackUrl, 0.5, () => music.suspend(false));
function startTalkMusic() {
  if (talkMusic.playing) return;                        // já tocando (conversa repetida): não reinicia
  if (churchMusic.active) churchMusic.stop();           // nada de sobrepor com a faixa da aproximação
  music.setOverride(null);
  const go = () => { if (talkMusic.play(TALK_MUSIC_FADE)) music.suspend(true); };
  talkMusic.ready ? go() : talkMusic.load().then(go, () => {});
}
const REVEAL_D = 360, revealAt = () => (churchMusic === churchMusic2 ? 28 : 14);                   // segundo da música; distância da fachada nesse instante
let approach = { phase: 'idle' };
const approachLock = () => approach.phase === 'auto';
// botão ♪ durante a faixa: pausa sempre; retoma do mesmo ponto só antes da revelação (depois, nesta visita, não volta)
const MUSIC_OVERRIDE = {
  get on() { return churchMusic.playing; },
  toggle() {
    if (churchMusic.playing) churchMusic.pause();
    else if (approach.phase === 'auto' && churchMusic.paused) churchMusic.resume();
  },
};
function endApproachMusic(fade = 1) {
  if (churchMusic.active) churchMusic.fadeOut(fade);
  music.setOverride(null);
  if (!talkMusic.playing) music.suspend(false);         // a música de fundo volta como o jogador deixou (se a da conversa já acabou)
}
function startApproach() {
  approach = { phase: 'auto', z0: van.z, v0: Math.max(8, van.speed), cmd: Math.max(8, van.speed) };
  const zf = MAP_W() + CHURCH_Z, D = Math.max(50, zf - REVEAL_D - van.z), T = revealAt(), a = approach;
  a.vTop = a.v0 + (D - a.v0 * T) / (T - 2);              // velocidade de cruzeiro para chegar no ponto certo aos 14 s
  music.suspend(true);
  churchMusic.play(4);
  music.setOverride(MUSIC_OVERRIDE);                   // o botão ♪ passa a controlar esta faixa (sem mudar a preferência salva)
}
const ramp = t => { const s = Math.min(1, Math.max(0, t / 4)); return s * s * (3 - 2 * s); };
const rampInt = t => t < 4 ? 4 * ((t / 4) ** 3 - (t / 4) ** 4 / 2) : 2 + (t - 4);
/** Condução automática: eixo (volante) e velocidade imposta para o quadro. */
function approachAxis() {
  const a = approach, tau = Math.max(0, churchMusic.time);
  const zDes = a.z0 + a.v0 * tau + (a.vTop - a.v0) * rampInt(tau);
  // música pausada: a sequência também para (a van freia suave e espera); ao continuar, volta a acelerar suave
  const v = churchMusic.paused ? 0 : Math.max(4, a.v0 + (a.vTop - a.v0) * ramp(tau) + 0.8 * (zDes - van.z));
  a.cmd += (v - a.cmd) * (1 - Math.exp(-(churchMusic.paused ? 1.6 : 1.2) * (1 / 60)));
  van.setForceSpeed(a.cmd);
  const tx = MAP_W() / 2, tz = MAP_W() + CHURCH_Z;
  let d = Math.atan2(tz - van.z, tx - van.x) - van.heading;
  while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  return { x: Math.max(-1, Math.min(1, d * 3)), z: -1 };
}
function revealChurch(fast) {
  const M = MAP_W();
  churchShown = true; church.visible = true; if (!earlyFade) { setChurchOpacity(church, 0); churchFade = fast ? 1.2 : 3.5; }   // (2ª visita: o fade já começou)
  const z0 = M + CHURCH_Z, cx = M / 2;
  for (const b of CHURCH_SOLIDS) churchSolids.push({ x0: cx - b.x1, x1: cx - b.x0, z0: z0 - b.z1, z1: z0 - b.z0 });   // igreja girada 180°: (x, z) → (cx − x, z0 − z)
  rig.setExtraBoxes(CHURCH_CAM.map(([x0, x1, a, b, top]) => [cx - x1, z0 - b, cx - x0, z0 - a, top]));          // a câmera não atravessa as paredes
  SOLIDS.push(...churchSolids);
}
let churchFade = 3.5, earlyFade = false;
function updateChurch(dt) {
  if (!churchOn) return;
  if (churchMusic === churchMusic2 && unwhite && !cine && state === 'drive' && approach.phase !== 'auto' && van.z < MAP_W()) restoreLook();   // voltou ao bairro sem conversar: cores de volta
  const M = MAP_W();
  // aproximação: a mira sobe aos poucos (horizonte no meio da tela) até a van chegar perto da igreja
  rig.setLookLift((approach.phase === 'auto' || approach.phase === 'revealed') && state === 'drive' && van.z < M + CHURCH_Z - 140 ? 4.8 : 0);
  if (!churchShown) {
    // gatilho: linha imaginária na borda de FORA da sebe do fim do bairro (lado da igreja, z = M). Só conta além dela e
    // indo para a igreja; parou ou voltou → a contagem zera (a próxima tentativa começa do zero). Dentro do bairro nada acontece.
    const beyond = van.z > M;
    const southSpeed = Math.sin(van.heading) * van.speed;          // velocidade na direção do sol (+Z)
    const going = southSpeed > 4 && Math.sin(van.heading) * Math.sign(van.speed) > 0.6;
    if (approach.phase === 'idle') churchT = state === 'drive' && beyond && going && !heli.on ? churchT + dt : 0;
    if (approach.phase === 'idle' && churchT >= 1 && !heli.on && !talkMusic.playing && !bellMusic.playing) {   // (a música da conversa ainda tocando: espera)      // ~1 s indo para o sol: espera a faixa estar pronta e começa
      approach.phase = 'loading';
      churchMusic.load().then(() => { if (approach.phase === 'loading' && churchOn) startApproach(); }, () => { approach.phase = 'idle'; churchT = 0; });
    }
    if (approach.phase === 'auto' && churchMusic === churchMusic2) updateWhiteVan();
    if (approach.phase === 'auto' && churchMusic === churchMusic2 && !earlyFade && churchMusic.time >= revealAt() - 1.5) {   // 2ª visita: o fade-in da igreja começa 1,5 s antes
      earlyFade = true; church.visible = true; setChurchOpacity(church, 0); churchFade = 1.2; churchA = 0;
    }
    if (earlyFade && churchA < 1) { churchA = Math.min(1, churchA + dt / churchFade); setChurchOpacity(church, churchA * churchA * (3 - 2 * churchA)); }
       // 2ª visita: a van fica branca aos poucos
    if (approach.phase === 'auto' && churchMusic.time >= revealAt()) {   // segundo 14 da música: a igreja surge e o jogador volta a dirigir
      van.setForceSpeed(null); approach.phase = 'revealed';
      revealChurch(true);
    }
  } else if (churchA < 1) {
    churchA = Math.min(1, churchA + dt / churchFade);                       // surge devagar, como através de uma névoa distante
    setChurchOpacity(church, churchA * churchA * (3 - 2 * churchA));
  }
}

// ---------- Igreja: 1ª conversa com o K (sequência automática) ----------
// A pé, perto dele (6º banco): controles suspensos, falas que passam sozinhas (com pausas), câmera que se aproxima devagar.
// Depois da 6ª fala aparece o aviso com a contagem para voltar ao bairro. No fim: o jogador e a van ficam brancos
// (whiteout.js), ele sai da igreja, entra na van e ela volta ao bairro; lá tudo volta ao normal. Salvo em CHURCH_TALK_KEY.
const CHURCH_TALK_KEY = 'adress.church.talk1';
const churchTalkDone = () => { try { return localStorage.getItem(CHURCH_TALK_KEY) === '1'; } catch (e) { return false; } };
const P = { p: 0.65 };                                  // pausa dentro da fala ([...] do roteiro)
// 2ª visita (depois do encontro em Veneza): outra conversa, sem repetir a 1ª nem a queda do sino azul; no fim cai o sino verde
const CHURCH2_KEY = 'adress.church.talk2', VENICE_TALK_KEY = 'adress.venice.talk1';
const flagOn = k => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
/** 1 = 1ª conversa; 2 = despedida (depois de Veneza); 3 = concluída (ele já foi embora; nada se repete). */
const churchStage = () => flagOn(GRILL_TALK_KEY) ? 4 : flagOn(CHURCH2_KEY) ? 3 : flagOn(VENICE_TALK_KEY) ? 2 : 1;   // 4: depois do Grillby's (só presença)
const bellDrop = b => BELL_SPOT.y - b.userData.h - BELL_SPOT.floor;
// ---------- Bairro 24: a mesma igreja (fora da muralha, junto à estrada do portão) e a oficina do K ----------
// A igreja fica visível normalmente (sem o sistema de aparição do Bairro 1), com os sinos que já caíram; sem cenas nela por
// enquanto. A oficina e a história do K (depois do Grillby's, Modo Livre) ficam em workshopStory.js.
let medChurch = null, medScene = null;
const wsStory = createWorkshopStory({ walker, van, talkBox, input,
  storyOn: () => gameMode === 'free' && !!MEDV && flagOn(GRILL_TALK_KEY), getState: () => state,
  preload: () => { thirdMusic.load().catch(() => {}); if (medChurch && medChurch.parent === world.scene) churchCine.prepare(world.scene, medChurch, rig.camera, world); },   // (montagem: música e acabamento prontos antes)
  onEnding: () => startChurchSeq(), setState: s => { setState(s); if (s !== 'wstory') actionLock = 0.4; } });   // (o E que fecha a fala não aciona outra coisa)
function setupMedStory() {
  if (!MEDV || !MEDV.extra) { wsStory.setup(null); return; }
  const X = MEDV.extra, C = X.church;
  if (medScene !== world.scene) {
    medScene = world.scene;
    if (!medChurch) {
      medChurch = buildChurch(); setChurchOpacity(medChurch, 1);
      medChurch.userData.pewK.visible = false;                            // (o K está na oficina; a igreja não tem conversa nesta etapa)
      const b1 = buildBell(), b2 = buildBell('#00C000', BELL2_X); medChurch.add(b1, b2); medChurch.userData.bells = [b1, b2];
      // 3º (laranja, 3º vão): corda gasta e o sino um pouco torto, mal preso · 4º (roxo, 4º vão): pendurado normalmente
      const b3 = buildBell('#FCA600', 5), b4 = buildBell('#9B00FF', 15);
      b3.children[0].visible = false;
      const ropeM = new THREE.MeshStandardMaterial({ color: '#8b7a58', roughness: 1, flatShading: true });
      for (const [dx, dz, r, l] of [[0, 0, 0.035, 0.75], [0.07, 0.02, 0.018, 0.6], [-0.06, -0.03, 0.015, 0.5], [0.03, -0.06, 0.012, 0.4]]) {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.6, l, 4), ropeM); st.position.set(dx, 0.3 - l / 2 + 0.05, dz); st.rotation.z = dx * 3; b3.add(st);
      }
      b3.userData.bell.rotation.set(0.05, 0, 0.17);
      medChurch.add(b3, b4); medChurch.userData.newBells = [b3, b4];
      // piso de dentro um pouco mais alto (o chão do Bairro 24 aparecia por cima do piso original)
      const fl = new THREE.MeshStandardMaterial({ color: '#7c6450', roughness: 1, emissive: '#7c6450', emissiveIntensity: 0.06 });
      for (const [x0, x1, z0, z1] of [[-11.8, 11.8, -44, -3], [-4.5, 4.5, -3, 2.6]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), fl); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0.11, (z0 + z1) / 2); m.receiveShadow = true; medChurch.add(m); }
    }
    medChurch.position.set(C.cx, 0, C.cz); medChurch.rotation.y = C.ry; world.scene.add(medChurch);
    const pave = new THREE.MeshStandardMaterial({ color: '#8f8a7c', roughness: 1 });
    for (const r of [C.yard, X.shop.yard, { x0: X.shop.yard.x0 - 0.5, x1: X.shop.yard.x1, z0: C.yard.z1, z1: X.shop.yard.z0 }]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), pave); m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, 0.015, (r.z0 + r.z1) / 2); m.receiveShadow = true; world.scene.add(m);
    }
    wsStory.setup(world, MEDV, game, doorPoint, HOUSES);
  } else if (!wsStory._ws || (!flagOn(MASS_KEY) && wsStory._ws.ruined)) wsStory.setup(world, MEDV, game, doorPoint, HOUSES);   // (de volta de outro bairro a atividade tinha sido desligada; antes do temporal a oficina volta intacta)   // checkpoint anterior ao temporal: a oficina volta intacta
  else wsStory.resetTask();
  applyWsCheckpoint();                                   // checkpoint da oficina (cadeado): travessa na mão até a entrega
  const [b1, b2] = medChurch.userData.bells;                              // os sinos que já caíram continuam caídos
  b1.visible = flagOn(CHURCH_TALK_KEY); b1.userData.bell.position.y = -bellDrop(b1);
  b2.visible = flagOn(CHURCH2_KEY); b2.userData.bell.position.y = -bellDrop(b2);
  for (const b of medChurch.userData.newBells) b.visible = flagOn(INTRO_KEY);   // os sinos laranja e roxo, depois da montagem
  { const [b3, b4] = medChurch.userData.newBells;                                // laranja caiu na montagem; roxo, no temporal
    b3.userData.bell.position.y = flagOn(INTRO_KEY) || flagOn(BELL3_KEY) ? -bellDrop(b3) : 0; b4.userData.bell.position.y = flagOn(MASS_KEY) ? -bellDrop(b4) : 0; b4.userData.bell.rotation.set(0, 0, 0); }
  if (massStory.active) massStory.reset();
  medChurch.userData.pewK.visible = flagOn(INTRO_KEY) && !flagOn(MASS_KEY) && gameMode === 'free';    // o K no banco de sempre (depois do temporal, não)
  if (flagOn(MASS_KEY) && wsStory._ws) wsStory._ws.ruin(Infinity);               // a oficina fica como o temporal deixou
  if (chseq) endChurchSeqAbort();
  churchCine.release();                                        // (troca de partida, tela preta: tira o acabamento da montagem da cena)
  rig.setExtraBoxes([...C.cam, [X.shop.box.x0, X.shop.box.z0, X.shop.box.x1, X.shop.box.z1, 5.6]]);
}
// ---------- Bairro 24: a montagem da igreja (depois da conversa final da oficina) ----------
// Tempo zero = a chamada no celular do K = início de "The Third Sanctuary". Uma linha de tempo só, pela posição REAL da
// música (pausa junto com ela); cortes secos em 9, 13, 16, 19, 22 e 25 s. Igreja vazia nas tomadas de dentro; os sinos
// laranja e roxo só na 2ª tomada da fachada; nenhum sino cai. Em 25 s: a pé na entrada, K no banco, música a 50%.
const thirdMusic = createChurchMusic(audio, thirdUrl, 0.6, () => { if (state !== 'chseq' && !massStory.active) { music.setOverride(null); music.suspend(false); } });
const THIRD_OVR = { get on() { return thirdMusic.playing; }, toggle() { if (thirdMusic.playing) thirdMusic.pause(); else thirdMusic.resume(); } };
const SEQ_CUTS = [9, 13, 16, 19, 22, 25];
const churchCine = createChurchCine(renderer);
// Música da missa: o MP3 ainda vai chegar. Quando chegar: import massUrl from '../assets/mass.mp3'; e troque null por
// createChurchMusic(audio, massUrl, 0.5). Até lá a missa fica sem música (nunca com "The Third Sanctuary" por baixo).
const massMusic = null;
const massStory = createMassStory({ walker, input, talkBox, audio, thirdMusic, massMusic, INTRO_KEY,
  storyOn: () => gameMode === 'free' && !!MEDV && flagOn(GRILL_TALK_KEY), church: () => medChurch,
  setState: s => { if (s === 'mstory') music.suspend(true); setState(s); if (s !== 'mstory') actionLock = 0.4; }, getState: () => state,
  paused: () => menu.isOpen || document.hidden, world: () => world, camera: () => rig.camera,
  wsRoot: () => wsStory._ws && wsStory._ws.root, wsRuin: t => wsStory._ws && wsStory._ws.ruin(t), wsLocal: (x, y, z) => wsStory.local(x, y, z),
  snapCam: (x, z, h) => rig.snap({ x, z, heading: h, speed: 0 }),
  toTitle: () => { music.setOverride(null); thirdMusic.stop(); endRoofScene(); music.suspend(false); rainAudio.set(MENU_RAIN, false); rainAudio.snap(); },   // (a chuva do menu volta no volume normal, sem fade-in)   // corte seco para a tela inicial
});              // acabamento especial da igreja só nas tomadas 9–25 s (churchCine.js)
// ---------- Depois do 4º sino: chuva contínua e o nível extra 1 ----------
// Enquanto os 4 níveis extras não terminam (EXTRA_DONE_KEY, ainda nunca gravado), chove em todos os bairros (Livre e Carreira)
// e o fundo dos menus é o Bairro 24 na chuva. Um laço de som só (rainAudio), mais baixo nos menus, abafado nos interiores.
const rainOn = () => flagOn(MASS_KEY) && !flagOn(EXTRA_DONE_KEY);
const rainFx = createRainFx(), rainAudio = createRainAudio(audio);
const _rl = new THREE.Vector3(), _rinv = new THREE.Matrix4();
// Fundo dos menus pelo progresso salvo: depois do 4º sino → Bairro 24 na chuva; depois do extra 1 → Bairro 1 à noite
// (sem chuva, só a luz do quintal do K acesa, sem o K); depois do extra 2: ainda não definido (volta ao de sempre).
function menuBg() { if (!flagOn(MASS_KEY)) return ''; if (!flagOn(EXTRA1_KEY)) return 'rain'; if (!flagOn(EXTRA2_KEY)) return 'night'; return ''; }
function menuWorld() {
  setMenuNight(false);
  const bg = menuBg();
  if (bg === 'rain' && neighborhood !== 'med10') useNeighborhood('med10');
  else if (bg === 'night' && (neighborhood !== 'grid4' || !game.layout.includes(L1_FIXED[15]))) {   // o Bairro 1 com a casa do K
    const gm = gameMode, fl = freeLevel; gameMode = 'free'; freeLevel = 0;
    if (neighborhood !== 'grid4') useNeighborhood('grid4'); else setupGrid4();
    gameMode = gm; freeLevel = fl;
  }
}
let nightSaved = null;
const nightCam = { p: new THREE.Vector3(), l: new THREE.Vector3() };
/** Noite do fundo dos menus (Bairro 1): luzes quase apagadas, nada brilhando, o K escondido e só a lâmpada do quintal dele. */
function setMenuNight(on) {
  if (on === !!nightSaved) return;
  if (!on) {
    const sv = nightSaved; nightSaved = null;
    sv.scene.background = sv.bg; if (sv.scene.fog) sv.scene.fog.color.copy(sv.fogC);
    for (const [l, i, c, gc] of sv.lights) { l.intensity = i; l.color.copy(c); if (gc) l.groundColor.copy(gc); }
    for (const [m, e] of sv.em) m.emissive.copy(e);
    for (const [o, v] of sv.vis) o.visible = v;
    sv.lamp.removeFromParent();
    return;
  }
  const sc = world.scene, sv = nightSaved = { scene: sc, bg: sc.background, fogC: sc.fog ? sc.fog.color.clone() : null, lights: [], em: [], vis: [], lamp: null };
  const seen = new Set();
  sc.traverse(o => {
    if (o.isLight) sv.lights.push([o, o.intensity, o.color.clone(), o.groundColor ? o.groundColor.clone() : null]);
    if (o.isMesh && o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.emissive && !seen.has(m) && m.emissive.getHex() !== 0) { seen.add(m); sv.em.push([m, m.emissive.clone()]); }
  });
  for (const [l] of sv.lights) {
    if (l.isHemisphereLight) { l.intensity = 0.11; l.color.set('#4a5a88'); l.groundColor.set('#080a10'); }
    else if (l.isDirectionalLight) { l.intensity = 0.16; l.color.set('#7a8ec4'); }            // luar fraco (detalhe nas sombras)
    else l.intensity = 0;
  }
  for (const [m] of sv.em) m.emissive.setRGB(0, 0, 0);                         // nenhuma luz de casa, poste ou lampião
  sc.background = new THREE.Color('#03050a'); if (sc.fog) sc.fog.color.set('#03050a');
  const sun = sc.getObjectByName('sun'); if (sun) { sv.vis.push([sun, sun.visible]); sun.visible = false; }
  world.hideResident();
  const spot = sc.getObjectByName('reader-spot');
  const p = new THREE.Vector3(); if (spot) { spot.updateMatrixWorld(true); spot.getWorldPosition(p); }
  if (spot && spot.userData.person) { sv.vis.push([spot.userData.person, spot.userData.person.visible]); spot.userData.person.visible = false; }   // o K não está lá
  // a luz do quintal da casa do K (a única acesa): lampião baixo ao lado da cadeira vazia
  const lamp = sv.lamp = new THREE.Group(); lamp.position.set(p.x + 1.3, 0, p.z - 0.6);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.9, 6), new THREE.MeshStandardMaterial({ color: '#1d1b18', roughness: 0.8 })); post.position.y = 0.95; lamp.add(post);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffe2a8' })); bulb.position.y = 2.0; lamp.add(bulb);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.2, 6), new THREE.MeshStandardMaterial({ color: '#1d1b18' })); cap.position.y = 2.2; lamp.add(cap);
  const pl = new THREE.PointLight('#ffc27a', 60, 26, 1.6); pl.position.y = 1.9; lamp.add(pl);
  const gc = document.createElement('canvas'); gc.width = gc.height = 64; const gg = gc.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,214,150,0.9)'); gr.addColorStop(0.3, 'rgba(255,190,110,0.35)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gc), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(4.2); glow.position.y = 2.0; lamp.add(glow);
  sc.add(lamp);
  nightCam.p.set(p.x - 13, 11, p.z + 23); nightCam.l.set(p.x - 5, 2.2, p.z - 3);   // de fora da sebe sul, de frente para a casa e o quintal
}
const MENU_STATES = ['title', 'levelSelect', 'levelFly', 'shop'];
const MENU_RAIN = 0.16;                                  // chuva nos menus (fração)
// nos menus: além da chuva no bairro (que o desfoque apaga), riscos finos por cima do fundo desfocado (canvas 2D, embaixo dos botões)
const rainVeil = document.createElement('canvas'); rainVeil.className = 'rain-veil';
rainVeil.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity .8s;background:rgba(22,28,38,.22)';
const titleRoot = document.querySelector('.title'); if (titleRoot) titleRoot.prepend(rainVeil);
const veilDrops = Array.from({ length: 260 }, () => ({ x: Math.random(), y: Math.random(), v: 0.9 + Math.random() * 0.8, l: 0.03 + Math.random() * 0.04, a: 0.12 + Math.random() * 0.22 }));
function drawVeil(dt) {
  const w = rainVeil.clientWidth | 0, h = rainVeil.clientHeight | 0; if (!w || !h) return;
  if (rainVeil.width !== w || rainVeil.height !== h) { rainVeil.width = w; rainVeil.height = h; }
  const g = rainVeil.getContext('2d'); g.clearRect(0, 0, w, h); g.lineWidth = 1;
  for (const d of veilDrops) {
    d.y += d.v * dt; d.x += d.v * dt * 0.12; if (d.y > 1.05) { d.y = -0.05; d.x = Math.random(); } if (d.x > 1) d.x -= 1;
    g.strokeStyle = `rgba(215,225,238,${d.a})`; g.beginPath(); g.moveTo(d.x * w, d.y * h); g.lineTo(d.x * w - d.l * h * 0.12, d.y * h - d.l * h); g.stroke();
  }
}
// Fase de terror (do 4º sino até o fim do 4º extra; mesma condição da chuva, salva no progresso): nos menus (tela inicial,
// painel Jogar, Shop, seleção do Livre e mapa da Carreira) toca "snow" no lugar da música padrão. Uma reprodução só,
// contínua entre menus; num nível para (guardando a posição) e volta ao retornar. Respeita o volume e a preferência de música.
const menuMusic = createMenuMusic(audio, SNOW_LOOP_URL, '"104. snow (1)-loop.wav" (assets/snow-loop.mp3)', SNOW_LOOP_SECS);
let menuFadeIn = 0.6;
// Pausa própria desta faixa (botão ♪ onde ele aparece, como no mapa da Carreira). A preferência da música padrão
// (adress.music) NÃO a silencia: antes, uma pausa feita num bairro deixava os menus mudos sem botão para religar.
const MENU_PAUSE_KEY = 'adress.menuMusic.paused';
let menuPaused = flagOn(MENU_PAUSE_KEY), menuOvrOn = false;
const MENU_OVR = { get on() { return !menuPaused; }, toggle() { menuPaused = !menuPaused; try { localStorage.setItem(MENU_PAUSE_KEY, menuPaused ? '1' : '0'); } catch (e) { /* */ } } };
function updateMenuMusic() {
  const menus = rainOn() && (MENU_STATES.includes(state) || inMap());
  music.block(menus);
  if (menus !== menuOvrOn) { menuOvrOn = menus; if (menus) music.setOverride(MENU_OVR); else if (music.override === MENU_OVR) music.setOverride(null); }
  if (menus && !menuPaused) { if (!menuMusic.playing && menuMusic.play(menuFadeIn)) menuFadeIn = 0.6; }
  else if (menuMusic.playing) menuMusic.stop(0.8);
}
function updateRain(dt) {
  const on = rainOn() && !extra.active && !massStory.active;
  const menuS = MENU_STATES.includes(state) || inMap();
  const chs = [church, medChurch].filter(c => c && c.parent === world.scene && c.visible !== false);
  const cam = rig.camera.position;
  const inChurch = chs.some(c => { c.updateMatrixWorld(); _rl.copy(cam).applyMatrix4(_rinv.copy(c.matrixWorld).invert()); return _rl.x > -24 && _rl.x < 24 && _rl.z > -58 && _rl.z < 2.4 && _rl.y < 72; });
  const menuRain = menuBg() === 'rain';                 // menus: chuva só no fundo do Bairro 24 (na noite do Bairro 1, nada)
  setMenuNight(menuBg() === 'night' && MENU_STATES.includes(state) && neighborhood === 'grid4');
  rainAudio.set(on && (!menuS || menuRain) ? (menuS ? MENU_RAIN : 0.3) : 0, insideOn || inChurch);
  rainAudio.update(dt, document.hidden);
  if (rainFx.object.parent !== world.scene) world.scene.add(rainFx.object);
  rainFx.update(dt, cam, on && !inMap() && (!MENU_STATES.includes(state) || menuRain) ? 0.55 : 0, chs);
  const veil = on && menuRain && MENU_STATES.includes(state) && !document.hidden;
  rainVeil.style.opacity = veil ? '1' : '0';
  if (veil) drawVeil(dt);
}
const EXTRA_CSS = document.createElement('style');
EXTRA_CSS.textContent = ['.ahud', '.hint-btn', '.menu-btn', '.menu-panel', '.music-btn', '.music-now', '.match-hud'].map(c => 'body.extra-on ' + c).join(', ') + ' { display: none !important; pointer-events: none !important; }';   // níveis extras: sem barra/dicas do topo, DICA, MENU, música (botão e créditos), cronômetro e batidas (a música continua tocando; Voltar, diálogos e toque ficam)
document.head.appendChild(EXTRA_CSS);
const voidMusic = createVoidMusic(audio, justUsUrl, justUsLoopUrl);   // extra 1: "just us" (original → loop), do começo do deslocamento até a tela inicial
const extra = createExtraStory({ walker, input, audio, renderer, talkBox, onTravel: () => voidMusic.start(), onShatter: (snap, rect) => { syncNoVan(); endExtra('shatter'); screenShatter(snap, rect); } });   // (o extra 1 já foi salvo na quebra)
// Extra 1: qualquer tecla/toque (ex.: avançar o diálogo 2) retoma o áudio se o navegador o tiver suspendido e garante as faixas
// decodificadas antes do deslocamento — sem tocar nada antes da hora.
for (const ev of ['keydown', 'pointerdown']) addEventListener(ev, () => {
  if (state === 'extra') { audio.unlock(); voidMusic.load(); }
  else if (audio.ctx && audio.ctx.state !== 'running') audio.unlock();   // (navegador suspendeu o áudio: retoma na próxima interação; a música dos menus segue de onde estava)
}, true);
function startExtra() {
  if (state !== 'levelSelect') return;
  document.body.classList.add('extra-on'); menu.close();   // já antes do fade: nada da interface pisca ao carregar
  levelSelect.close(); setState('levelFly');
  title.fadeOut(() => {
    if (titleDriver) titleDriver.stop();
    title.hide(); document.body.classList.add('extra-on');
    talkBox.hide(); music.suspend(true, 0.8);
    extra.camera.aspect = rig.camera.aspect; extra.camera.updateProjectionMatrix();
    extra.start(); renderer.compile(extra.scene, extra.camera); voidMusic.load();   // (a música do deslocamento já decodificada)
    fade = 1; setState('extra');
  });
}
/** Fim (ou saída) do extra 1: devolve o personagem ao bairro e volta à tela inicial (toTitle) ou ao painel Jogar. Nada é salvo. */
function endExtra(toTitle) {
  extra.stop();
  voidMusic.fadeOut(3);                                  // (com a tela inicial já aparecendo; sem corte seco)
  if (toTitle) menuFadeIn = 3;                           // "snow" entra nos mesmos 3 s em que "just us" sai
  document.body.classList.remove('extra-on');
  world.scene.add(walker.object); walker.show(false); walker.setFloor(0);
  music.suspend(false);
  fade = 0;
  if (toTitle) {                                        // ('shatter': a imagem quebrada já cobre a tela; o menu aparece por trás dos cacos)
    menuWorld();
    if (rig.mode !== 'overview') rig.toggle();
    rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
    title.show('home'); if (titleDriver) titleDriver.stop();
    setState('title'); setMenuNight(menuBg() === 'night' && neighborhood === 'grid4');
    if (toTitle !== 'shatter') { talkBox.fadeBlack(1, 0); setTimeout(() => talkBox.fadeBlack(0, 1500), 60); }
  } else showPlayPanel();
}
let chseq = null;
const _cl = new THREE.Vector3(), _cl2 = new THREE.Vector3();
const chW = (x, y, z, out = new THREE.Vector3()) => medChurch.localToWorld(out.set(x, y, z));
function churchSpot() {                                // entrada (de fora, olhando para dentro) e um lugar livre para a van no adro
  medChurch.updateMatrixWorld(true);
  const a = chW(0, 0, 7), b = chW(0, 0, 6), heading = Math.atan2(b.z - a.z, b.x - a.x);
  const free = (x, z, r) => !SOLIDS.some(o => !o.vanOnly && (o.r ? Math.hypot(x - o.cx, z - o.cz) < o.r + r : x > o.x0 - r && x < o.x1 + r && z > o.z0 - r && z < o.z1 + r));
  let van0 = null;
  for (const [lx, lz] of [[-13, 14], [13, 14], [-13, 20], [13, 20], [-18, 12], [18, 12], [0, 24], [-8, 26], [8, 26]]) { const p = chW(lx, 0, lz); if (free(p.x, p.z, 3.4)) { van0 = { x: p.x, z: p.z, lx, lz }; break; } }
  if (!van0) { const p = chW(0, 0, 28); van0 = { x: p.x, z: p.z, lx: 0, lz: 28 }; }
  const v1 = chW(van0.lx, 0, van0.lz - 1), vh = Math.atan2(v1.z - van0.z, v1.x - van0.x);   // a van de frente para a igreja
  return { x: a.x, z: a.z, heading, van: { x: van0.x, z: van0.z, heading: vh } };
}
function startChurchSeq() {
  const sp = churchSpot();
  if (!churchCine.ready) churchCine.prepare(world.scene, medChurch, rig.camera, world);
  chseq = { t: 0, sp, mp: false, line: 0, ended: false };
  music.suspend(true, 0.6);                             // a de fundo some rápido; a nova começa já
  if (thirdMusic.ready) thirdMusic.play(0.05); else thirdMusic.load().then(() => { if (chseq && !chseq.ended && !thirdMusic.active && chseq.t < 20) { thirdMusic.play(0.05); } }).catch(() => {});
  music.setOverride(THIRD_OVR);
  van.stop(); van.teleport(sp.van.x, sp.van.z, sp.van.heading); van.object.visible = true;   // a van já parada diante da igreja (as duas tomadas da fachada iguais)
  medChurch.userData.pewK.visible = false;                         // igreja vazia (o banco também)
  for (const b of medChurch.userData.newBells) b.visible = false;
  setState('chseq');
}
function endChurchSeqAbort() { chseq = null; churchCine.off(); wsStory.endCall(); talkBox.hide(); }
function updateChurchSeq(dt) {
  const q = chseq; if (!q) return;
  if (menu.isOpen || document.hidden) { if (thirdMusic.playing) { thirdMusic.pause(); q.mp = true; } return; }   // pausa: música e linha de tempo juntas
  if (q.mp) { q.mp = false; thirdMusic.resume(); }
  if (thirdMusic.active && thirdMusic.time >= 0) q.t = thirdMusic.time; else if (!thirdMusic.paused) q.t += dt;   // (♪ pausado: tudo espera)
  const T = q.t;
  wsStory.call(T);
  if (wsStory._ws) wsStory._ws.roof.visible = T >= 9 && !wsStory._ws.ruined;
  if (q.line === 0 && T >= 3.0) { q.line = 1; talkBox.show([['Enfim, ', { p: 0.65 }, 'nos vemos lá.']], () => {}, { auto: true }); }   // despedida automática
  if (q.line === 1) { talkBox.update(dt); if (T >= 8.9 && talkBox.open) talkBox.hide(); }
  walker.show(false);
  for (const b of medChurch.userData.newBells) b.visible = T >= 22;               // só na 2ª tomada da fachada
  { const b3 = medChurch.userData.newBells[0], bb = b3.userData.bell, ft = T - 23.1;   // a corda gasta cede: o laranja cai, sem som, no 3º vão
    if (ft <= 0) { bb.position.y = 0; bb.rotation.z = 0.17 + 0.03 * Math.sin(T * 5) * (T > 22.4 ? 1 : 0); }
    else { const drop = bellDrop(b3), y = Math.min(drop, 11 * ft * ft); bb.position.y = -y; if (y >= drop && !q.b3) { q.b3 = true; try { localStorage.setItem(BELL3_KEY, '1'); } catch (e) { /* */ } } } }
  if (T < 25) churchCine.set(T >= 9 && T < 13 || T >= 22 ? 'ext' : T >= 13 ? 'int' : null, dt);   // acabamento especial junto com cada corte
  if (T >= 25) {                                                                   // controle de volta: a pé na entrada; K no banco
    q.ended = true; chseq = null; talkBox.hide(); churchCine.off();                // visual normal junto com a troca de câmera
    try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* */ }
    wsStory.endCall();
    medChurch.userData.pewK.visible = true;
    thirdMusic.setLevel(0.5, 0.4);                                                 // metade do volume da montagem (o volume geral continua valendo)
    const sp = q.sp; walker.setFloor(TERRAIN.h(sp.x, sp.z)); walker.pose(sp.x, sp.z, sp.heading); walker.show(true);
    rig.snap({ x: sp.x, z: sp.z, heading: sp.heading, speed: 0 });
    actionLock = 0.6; setState('walk');
  }
}
/** Câmera da montagem (depois do rig.update). */
function churchSeqCam(cam) {
  const T = chseq.t, lin = (a, b, u) => a + (b - a) * Math.min(1, Math.max(0, u));
  medChurch.updateMatrixWorld(true);
  let p, l;
  if (T < 9) { p = wsStory.local(2.3, 2.05, -2.7); l = wsStory.local(0.1, 1.05, -5.5); }                        // oficina: o K e o celular na bancada
  else if (T < 13 || (T >= 22 && T < 25)) { const u = ((T < 13 ? T - 9 : T - 22)) / 4; p = chW(0, 36, lin(104, 96, u), _cl); l = chW(0, 33, 0, _cl2); }   // fachada, de drone, aproximando bem devagar
  else if (T < 16) { const u = (T - 13) / 3, x = lin(1.2, -0.6, u); p = chW(x, 9, -40.5, _cl); l = chW(x, 2.5, -6, _cl2); }   // do altar para os bancos e a porta (um pouco para a direita)
  else if (T < 19) { const u = (T - 16) / 3, x = lin(4.9, 5.15, u), z = lin(-21.0, -21.45, u); p = chW(x, 1.9, z, _cl); l = chW(lin(2.3, 2.4, u), 0.75, lin(-23.1, -23.3, u), _cl2); }   // o banco do K, vazio (um pouco para a esquerda)
  else { const u = (T - 19) / 3; p = chW(0, lin(13, 10.5, u), -4.5, _cl); l = chW(0, lin(6.5, 5.2, u), -42, _cl2); }   // da entrada para o altar, descendo devagar
  cam.position.copy(p); cam.lookAt(l);
}
const CHURCH2_LINES = [
  ['Você veio. ', P, 'Que bom.'],
  ['Eu não queria ir embora sem me despedir direito.'],
  ['Eu queria poder ficar mais um pouco. ', P, 'Agora que você veio.'],
  ['Passei tanto tempo querendo ter alguém que me procurasse ', P, 'sem precisar de nada.'],
  ['E agora que tenho, ', P, 'sou eu quem precisa ir.'],
  ['Surgiu uma oportunidade longe daqui. ', P, 'Algo que eu também esperei por muito tempo.'],
  ['Eu tentei encontrar um jeito de ficar ', P, 'e ainda seguir esse caminho. Mas não consegui.'],
  ['Não é por algo que você fez. ', P, 'Sua companhia me faz bem. É justamente por isso que está sendo difícil.'],
  ['Não sei se o que me espera vai ser melhor. ', P, 'Só sei que, se eu não for, vou continuar me perguntando.'],
  ['Queria ter recebido você num momento em que eu pudesse ficar.'],
  ['Obrigado por ter vindo. ', P, 'Mesmo que hoje eu tenha menos tempo do que gostaria.'],
  ['Ainda vamos nos encontrar. ', P, 'Espero que, da próxima vez, eu possa ouvir mais sobre você.'],
];
const CHURCH_LINES = [
  ['Você encontrou o caminho.'],
  ['Dessa vez, ', P, 'não tenho nenhuma encomenda esperando. ', P, 'Pode descansar um pouco.'],
  ['É curioso… ', P, 'Trabalhando com entregas, ', P, 'você passa o dia tentando chegar ao lugar certo.'],
  ['Mas chegar ao lugar certo ', P, 'não significa muito se, ', P, 'pelo caminho, ', P, 'você deixa para trás aquilo em que acredita.'],
  ['É fácil ser honesto quando a verdade não custa nada. ', P, 'O difícil é continuar sendo quando ela pode levar embora algo que você queria manter.'],
  ['É nessas horas que suas escolhas mostram quem você é. ', P, 'Mesmo quando ninguém está olhando.'],
  ['Você não precisa ficar aqui para provar nada. ', P, 'Há coisas esperando por você lá fora.'],
  ['Vá. ', P, 'Só não deixe que a pressa escolha por você.'],
  ['E, ', P, 'quando voltar, ', P, 'não precisa trazer nenhuma encomenda. ', P, 'Sua presença já basta.'],
];
const K_PEW = { x: 2.3, z: -23 };                       // onde ele está sentado (coordenadas locais da igreja)
const CL = (lx, ly, lz) => new THREE.Vector3(MAP_W() / 2 - lx, ly, MAP_W() + CHURCH_Z - lz);   // local da igreja → mundo (girada 180°)
const CINE = {
  // vista LATERAL (olhando para a parede de lado, nunca para a porta: a van lá fora fica sempre fora do quadro)
  player: { x: -0.6, z: -22.4 },                        // no corredor, ao lado dele
  camA: [[-3.6, 2.6, -24.2], [0.9, 1.4, -22.9]],        // jogador de costas/lado em primeiro plano, ele de perfil
  camB: [[0.3, 1.95, -23.55], [2.3, 1.75, -23.05]],     // perto dele, de lado; o jogador já saiu do quadro
  walk: [[0, -24], [0, 3.5], [-1.8, 13]],               // saída: corredor → porta → ao lado da van
  van: [-5, 13],                                        // van estacionada na frente da igreja, virada para o bairro
  outCam: [[7, 3.0, 30], [-1.5, 5, 2]],                 // enquadramento de fora: igreja + van, ele vem na direção da câmera
};
const _frus = new THREE.Frustum(), _m4 = new THREE.Matrix4(), _bb = new THREE.Box3();
let cine = null;                                        // { phase, t, talkT, total, count, restore, wp, camPos, camLook }
let unwhite = null;
const nearChurchK = () => churchShown && state === 'walk' && !cine && !approachLock() && churchStage() < 3 &&   // 1ª: pode repetir; a despedida, não
  Math.hypot(walker.x - CL(K_PEW.x, 0, K_PEW.z).x, walker.z - CL(K_PEW.x, 0, K_PEW.z).z) < 3.4;
const ease = x => x * x * (3 - 2 * x);
function setCam(posL, lookL) { cine.camPos.copy(CL(...posL)); cine.camLook.copy(CL(...lookL)); }
function startChurchTalk() {
  const p = CL(CINE.player.x, 0, CINE.player.z), k = CL(K_PEW.x, 0, K_PEW.z);
  walker.pose(p.x, p.z, Math.atan2(k.z - p.z, k.x - p.x));
  van.stop();
  const stage = churchStage(), lines = stage === 2 ? CHURCH2_LINES : CHURCH_LINES;
  const total = lines.reduce((t, l) => t + lineDuration(l), 0);
  cine = { phase: 'talk', t: 0, total, count: -1, wp: 0, stage, bell: stage === 2 ? greenBell : churchBell, camPos: new THREE.Vector3(), camLook: new THREE.Vector3() };
  setCam(...CINE.camA);
  setState('cine');
  talkBox.show(lines, churchTalkEnd, { auto: true, onAdvance: i => {
    if (i !== 6 || cine.stage === 2) return;           // terminou a 6ª fala: começa a contagem para voltar ao bairro (na 2ª visita, não há contagem)
    const rest = lines.slice(6).reduce((t, l) => t + lineDuration(l), 0);
    let path = 0, prev = CINE.player;
    for (const [x, z] of CINE.walk) { path += Math.hypot(x - prev.x, z - prev.z); prev = { x, z }; }
    cine.count = Math.ceil(rest + 3.6 + path / 6.5 + 1.5 + BELL_END + 1.6 + 8);   // falas + volta da câmera + caminhada + entrar + van/sino + fade + folga
  } });
}
function churchTalkEnd() {                              // última fala lida: grava o progresso; câmera volta ao jogador, já branco
  try { localStorage.setItem(cine.stage === 2 ? CHURCH2_KEY : CHURCH_TALK_KEY, '1'); } catch (e) { /* */ }
  if (!unwhite) unwhite = whiten(walker.object, van.object);   // (normalmente já ficou branco durante a aproximação)
  const v = CL(CINE.van[0], 0, CINE.van[1]);
  van.teleport(v.x, v.z, -Math.PI / 2);                 // virada para o norte (o bairro)
  cine.phase = 'back'; cine.t = 0;
  cine.dir0 = cine.camLook.clone().sub(cine.camPos).normalize();   // a câmera fica parada e só gira até o jogador
}
/** 2ª conversa: encerra as outras músicas e toca "Once Upon An Innocent Time" do início (vai até o fim, inclusive na volta ao bairro). */
function startBellMusic() {
  talkMusic.stop(); if (churchMusic.active) churchMusic.stop(); music.setOverride(null); music.suspend(true);
  const go = () => bellMusic.play(10);                  // fade-in de 10 s
  bellMusic.ready ? go() : bellMusic.load().then(go, () => music.suspend(false));
}
function restoreLook() { if (unwhite) { unwhite(); unwhite = null; } vanFade = null; }
// 2ª visita: aos WHITE_AT s da música (depois de ela começar e bem antes de a igreja surgir), a van inteira vai ficando
// branca em ~2 s; o jogador (escondido dentro da van) fica branco de uma vez. Dura a visita toda; restoreLook desfaz.
const WHITE_AT = 9, WHITE_FADE = 2;
let vanFade = null;
function updateWhiteVan() {
  const t = churchMusic.time;
  if (t < WHITE_AT) return;
  if (!vanFade && !unwhite) {
    vanFade = whitenFade(van.object);
    const undoWalker = whiten(walker.object), f = vanFade;
    unwhite = () => { f.restore(); undoWalker(); };
  }
  if (vanFade) vanFade.step((t - WHITE_AT) / WHITE_FADE);
}
function churchCineEnd() {                              // de volta ao bairro: cores, câmera e controles normais
  if (cine && cine.stage === 2 && church) church.userData.pewK.visible = false;   // despedida: ele já foi embora
  restoreLook(); talkBox.warn(null); talkBox.hide();
  cine = null; walker.show(false);
  const z = MAP_W() - HEDGE - 3.9, x = roadCenter(Math.floor(GRID / 2));
  van.teleport(x, z, -Math.PI / 2);
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  actionLock = 0.5;
  setState('drive');
}
function updateChurchCine(dt) {
  const c = cine; c.t += dt;
  if (c.count >= 0) {                                   // contagem regressiva real
    c.count = Math.max(0, c.count - dt);
    talkBox.warn(['Você está fora do bairro há muito tempo. Volte em ', { b: String(Math.ceil(c.count)) }, ' segundos, ou a partida reiniciará.']);
    const M = MAP_W(), outside = van.x < 0 || van.x > M || van.z < 0 || van.z > M;
    if (c.count <= 0 && outside) {                      // não deu tempo: reinicia a partida pelo caminho de sempre
      restoreLook(); talkBox.warn(null); talkBox.hide(); cine = null; walker.show(false); fadeBlackOff();
      restartMsg = 'Você ficou fora do bairro por tempo demais. A partida vai reiniciar…'; setState('fadeOut');
      return;
    }
  }
  if (c.phase === 'talk') {
    if (!c.music && c.stage === 2 && c.t >= 5) { c.music = true; startBellMusic(); }   // 2ª conversa: "Once Upon An Innocent Time" 5 s depois do começo
    if (!c.music && c.stage !== 2 && c.t >= TALK_MUSIC_AT) { c.music = true; startTalkMusic(); }   // 10 s depois da 1ª fala (pausas incluídas); só na 1ª conversa
    talkBox.update(dt);
    walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
    const k = ease(Math.min(1, c.t / (c.total * 0.92)));   // aproxima devagar durante toda a conversa
    c.camPos.copy(CL(...CINE.camA[0])).lerp(CL(...CINE.camB[0]), k);
    c.camLook.copy(CL(...CINE.camA[1])).lerp(CL(...CINE.camB[1]), k);
    // assim que o jogador sai totalmente do quadro, ele (e a van, lá fora) já fica branco: nada muda de cor na frente da câmera
    if (!unwhite && k > 0.3) {
      _frus.setFromProjectionMatrix(_m4.multiplyMatrices(rig.camera.projectionMatrix, rig.camera.matrixWorldInverse));
      if (!_frus.intersectsBox(_bb.setFromObject(walker.object)) && !_frus.intersectsBox(_bb.setFromObject(van.object))) unwhite = whiten(walker.object, van.object);
    }
  } else if (c.phase === 'back') {                      // parada no lugar, a câmera gira até o jogador (já branco) e segura um pouco
    const k = ease(Math.min(1, c.t / 2.2));
    const d1 = CL(CINE.player.x, 1.35, CINE.player.z).sub(c.camPos).normalize();
    c.camLook.copy(c.camPos).add(c.dir0.clone().lerp(d1, k).normalize());
    walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
    if (c.t > 2.2 + 1.4) { c.phase = 'walk'; c.t = 0; c.wp = 0; }
  } else if (c.phase === 'walk' || c.phase === 'outside') {
    const [tx, tz] = CINE.walk[c.wp], tgt = CL(tx, 0, tz);
    const dx = tgt.x - walker.x, dz = tgt.z - walker.z, d = Math.hypot(dx, dz);
    if (d < 0.5) {
      if (++c.wp >= CINE.walk.length) { walker.show(false); c.phase = 'drive'; c.t = 0; return; }   // entra na van
    } else {
      walker.pose(walker.x, walker.z, Math.atan2(dz, dx));
      walker.update(dt, { x: 0, z: -1 }, 'car', walkSolids(), { x: 1e6, z: 1e6 });
    }
    const lz = MAP_W() + CHURCH_Z - walker.z;           // z local do jogador
    if (c.phase === 'walk' && lz > -3.5) { c.phase = 'outside'; setCam(...CINE.outCam); }   // corte para fora
    if (c.phase === 'walk') {                           // dentro: a câmera acompanha por trás, olhando para a porta
      const cp = CL(0.9, 3.4, lz - 6.5), cl = CL(0, 1.6, lz + 4), a = 1 - Math.exp(-3 * dt);
      c.camPos.lerp(cp, a); c.camLook.lerp(cl, a);
    }
  } else if (c.phase === 'drive') {                     // a van branca sai em direção ao bairro…
    van.update(dt, { x: 0, z: -1 }, 'car');
    const bell = c.bell;
    if (!c.rehung) { c.rehung = true; bell.userData.bell.position.set(0, 0, 0); bell.userData.bell.rotation.set(0, 0, 0); }   // (conversa repetida: o sino volta a pender, fora do quadro, e cai de novo)
    bell.visible = true;                                // a câmera ainda olha para baixo: ele já está pendurado quando ela subir
    // …a câmera fica no lugar e só gira para cima até o sino (azul na 1ª, verde na 2ª); ele aparece um instante, solta-se e cai (sem som)
    if (c.t > BELL_TILT0) {
      if (!c.dirB) { c.dirB = c.camLook.clone().sub(c.camPos).normalize(); c.dirS = CL(bell.position.x, BELL_SPOT.y - bell.userData.h * 0.6, BELL_SPOT.z).sub(c.camPos).normalize(); }
      const k = ease(Math.min(1, (c.t - BELL_TILT0) / BELL_TILT));
      c.camLook.copy(c.camPos).add(c.dirB.clone().lerp(c.dirS, k).normalize());
    }
    const ft = c.t - BELL_FALL0, b = bell.userData.bell;
    if (ft > 0) {
      const drop = bellDrop(bell), fallT = Math.sqrt(2 * drop / 22);
      if (ft < fallT) { b.position.y = -11 * ft * ft; b.rotation.z = 0.05 * ft; }   // queda livre, quase reta
      else {                                            // bateu no piso do corredor: quique curto, balança e fica parado ali
        const u = Math.min(1, (ft - fallT) / 0.9);
        b.position.y = -drop + Math.max(0, Math.sin(Math.min(1, u * 2.5) * Math.PI)) * 0.25 * (1 - u);
        b.rotation.z = 0.05 * fallT * (1 - u) + Math.sin(u * Math.PI * 3) * 0.06 * (1 - u);
      }
    }
    if (c.t > BELL_END && !c.fading) { c.fading = true; talkBox.fadeBlack(1, 800); }
    if (c.t > BELL_END + 0.9) { churchCineEnd(); talkBox.fadeBlack(0, 900); }   // (no tempo do jogo) já no bairro
  }
}
// fim da cena de saída: a van parte (0–1,6 s), a câmera gira para cima até o sino (2,4 s), ele fica parado um instante,
// solta-se e cai no piso do corredor, fica ali um instante e só então vem o fade-out
const BELL_TILT0 = 1.6, BELL_TILT = 2.4, BELL_FALL0 = BELL_TILT0 + BELL_TILT + 1.2, BELL_END = BELL_FALL0 + 2.6;
// ---------- Veneza (Nível 10): o K sentado num banco à beira do canal ----------
// Só com as 4 conversas salvas (caixa, terraço, igreja, bondinho). Fica num canto sossegado da praça sudoeste (quadra
// laranja), virado para o canal, longe das casas de entrega e dos píeres. A pé, E: 11 falas automáticas, depois o aviso
// do jogo. No fim grava VENICE_TALK_KEY (libera a 2ª visita à igreja) e os controles voltam na mesma partida.
const VENICE_LINES = [
  ['Olha só quem apareceu. ', P, 'Dessa vez, nenhum bondinho veio junto, espero.'],
  ['Eu precisava mesmo desse sossego. ', P, 'Mas fico feliz que você tenha vindo.'],
  ['Tenho pensado no que aconteceu. ', P, 'Você escolheu me ajudar.'],
  ['Eu agradeço. ', P, 'Mas aquelas cinco pessoas também tinham para onde voltar. ', P, 'Não quero esquecer disso só porque fui eu quem ficou.'],
  ['Às vezes, a gente cuida de quem conhece ', P, 'e acaba esquecendo que os outros também precisam de cuidado.'],
  ['Não é preciso conhecer alguém para tratá-lo bem. ', P, 'Nem esperar que essa pessoa faça alguma coisa por você depois.'],
  ['Pode ser uma ajuda pequena. ', P, 'Ouvir com atenção, ', P, 'oferecer companhia, ', P, 'perceber quando alguém precisa de uma mão.'],
  ['Você não vai conseguir resolver tudo. ', P, 'Mas pode tornar o dia de alguém um pouco menos difícil.'],
  ['Há uma coisa que eu queria conversar com você. ', P, 'Mas prefiro um lugar mais tranquilo.'],
  ['Lembra de onde nos encontramos antes? ', P, 'Vou passar por lá antes de viajar.'],
  ['Se quiser me encontrar mais uma vez, ', P, 'siga o sol. ', P, { b: 'Estarei lá' }, '.'],
];
let venK = null;
const venKSolid = { x0: 0, x1: 0, z0: 0, z1: 0 };
function buildVeniceK() {
  const g = new THREE.Group(); g.name = 'venice-k';
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.85, flatShading: true });
  const iron = new THREE.MeshStandardMaterial({ color: '#2d2a28', roughness: 0.7, flatShading: true });
  const add = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); };
  add(0.5, 0.07, 1.9, wood, 0, 0.6, 0);                 // assento (K olha para +x; o encosto fica atrás, em −x)
  add(0.07, 0.5, 1.9, wood, -0.27, 0.95, 0);            // encosto
  for (const z of [-0.85, 0.85]) { add(0.46, 0.56, 0.07, iron, 0, 0.3, z); add(0.05, 0.6, 0.07, iron, -0.27, 0.9, z); }
  const k = buildPewReader(0.64); k.position.set(0.05, 0, 0.35); g.add(k);
  return g;
}
const venKReady = () => VENICE && ['adress.l1.kParcel', 'adress.l6.roofTalk', 'adress.church.talk1', 'adress.trolley.talk1'].every(flagOn) && !flagOn(VENICE_TALK_KEY);
function setupVeniceK() {
  if (venK && venK.parent) venK.parent.remove(venK);
  const i = SOLIDS.indexOf(venKSolid); if (i >= 0) SOLIDS.splice(i, 1);
  if (!venKReady()) return;
  if (!venK) venK = buildVeniceK();
  const r = VENICE.plazaSW[2], x = r.x0 + 1.5, z = r.z0 + 5.5;   // borda oeste da quadra laranja, de frente para o canal
  venK.position.set(x, VENICE.LAND, z); venK.rotation.y = Math.PI;
  Object.assign(venKSolid, { x0: x - 0.6, x1: x + 0.6, z0: z - 1.1, z1: z + 1.1 });
  SOLIDS.push(venKSolid);
  world.scene.add(venK);
}
const venKPos = () => ({ x: venK.position.x - 0.05, z: venK.position.z - 0.35 });
const nearVenK = () => state === 'walk' && venK && venK.parent && !flagOn(VENICE_TALK_KEY) &&
  Math.hypot(walker.x - venKPos().x, walker.z - venKPos().z) < 3;
function startVeniceTalk() {
  const k = venKPos(), px = k.x - 0.9, pz = k.z - 1.7;  // em pé na frente dele, um pouco de lado
  walker.pose(px, pz, Math.atan2(k.z - pz, k.x - px));
  van.stop();
  const y = VENICE.LAND;
  talkCam.pos.set(k.x - 4.4, y + 2.2, k.z - 0.4);       // por cima do canal: ele de frente, o jogador de lado
  talkCam.look.set((k.x + px) / 2 + 0.2, y + 0.95, (k.z + pz) / 2 + 0.2);
  talkLines = VENICE_LINES; talkPhase = 'talk';
  setState('talk');
  talkBox.show(VENICE_LINES, () => {
    try { localStorage.setItem(VENICE_TALK_KEY, '1'); } catch (e) { /* */ }   // libera a 2ª visita à igreja
    talkPhase = 'note';
    talkBox.note('ORIENTAÇÃO DO JOGO', ['Use o ', { b: 'Modo Livre' }, ' no ', { b: 'Bairro 1' }, ', a qualquer momento, caso tenha interesse.'], () => {
      talkBox.hide(); talkPhase = ''; actionLock = 0.5;
      setState('walk');                                 // controles de volta, na mesma partida
    });
  }, { auto: true });
}
function fadeBlackOff() { talkBox.fadeBlack(0, 300); }

// ---------- Nevasca: interior do Grillby's (cena separada; E na porta, a pé → fade 1 s, salão, fade 1 s) ----------
let grillIn = null, insideOn = false, grill = null;
// música do salão: "sans." em loop, só lá dentro; começa sozinha a cada entrada (mesmo com ♪ desligado), o botão pausa/continua
// do mesmo ponto; ao sair ela acaba e a do bairro volta como estava (suspend não muda a preferência salva)
const GRILL_OVERRIDE = { get on() { return grillMusic.playing; }, toggle() { if (grillMusic.playing) grillMusic.pause(); else grillMusic.resume(); } };          // grill: transição { dir: 'in' | 'out', t, swapped }
const GRILL_FAR_VAN = { x: 1e6, z: 1e6 };
const grillCrowd = createCrowd(audio);                  // murmúrio do bar (efeitos; uma cópia só)
const nearGrillK = () => !!grillIn && grillIn.story.k.visible && Math.hypot(walker.x - grillIn.story.kPoint.x, walker.z - grillIn.story.kPoint.z) < 1.9;
/** Ponto da porta do Grillby's no bairro (local (3,3; 3,6) do lote, girado como o ponto). */
function grillDoorWorld(out = 0) {
  const sp = SPOTS.spots[game.slotOf[GRILLBY]], ry = Math.atan2(sp.fx, sp.fz), c = Math.cos(ry), sn = Math.sin(ry), lx = 3.3, lz = 3.6 + out;
  return { x: sp.px + lx * c + lz * sn, z: sp.pz - lx * sn + lz * c, heading: Math.atan2(c, sn) };
}
const nearGrillDoor = () => state === 'walk' && SNOWV && !roofWalk && game.layout.includes(GRILLBY) && !boom.isDestroyed(GRILLBY) &&
  (() => { const d = grillDoorWorld(0.9); return Math.hypot(walker.x - d.x, walker.z - d.z) < 1.9; })();
function startGrill(dir) { if (dir === 'in') grillMusic.load().catch(() => {}); grill = { dir, t: 0, swapped: false }; walker.update(0, { x: 0, z: 0 }, 'screen', [], GRILL_FAR_VAN); setState('grill'); }
function swapGrill() {
  if (grill.dir === 'in') { enterGrillScene(); grillIn.story.k.visible = grillStory.available(); }   // K na mesa do canto (história)
  else leaveGrill();
}
/** Volta ao bairro, ao lado da entrada (a van fica onde estava). */
function enterGrillScene() {
  if (!grillIn) grillIn = createGrillbyInside();
  grillIn.scene.add(walker.object); walker.setFloor(0);
  walker.pose(grillIn.door.x, grillIn.door.z, -Math.PI / 2);      // junto à entrada, olhando para o salão
  grillIn.camera.aspect = rig.camera.aspect; grillIn.camera.updateProjectionMatrix();
  grillIn.update(0, walker.x, walker.z, true); insideOn = true;
  renderer.compile(grillIn.scene, grillIn.camera);
  music.suspend(true); grillMusic.stop(); music.setOverride(GRILL_OVERRIDE);
  grillMusic.load().then(() => { if (insideOn) { grillMusic.play(0.4); music.refresh(); } }).catch(() => {});
  grillCrowd.start();                                   // bar cheio: murmúrio ao fundo (só aqui dentro)
}
// ---------- Grillby's: o encontro com o K (história; depois da 2ª conversa na igreja) ----------
let storyPrompt = null;
/** Poste do resgate: logo à esquerda de quem sai (= à direita do Grillby's visto da rua), do outro lado da rua, na calçada
 *  (fora da pista: distância ao eixo entre hw + 0,9 e hw + 2,4), livre e no mesmo nível. Devolve também o rumo da rua (t)
 *  e o lado da pista (ax, az: do poste para a rua). */
function findPole(out) {
  const boxes = walkSolids(), h0 = TERRAIN.h(out.x, out.z), c = Math.cos(out.heading), s = Math.sin(out.heading);
  const RD = SNOWV ? SNOWV.roadDist : null, hw = 4;
  const inside = (x, z, m) => boxes.some(b => b.r ? Math.hypot(x - b.cx, z - b.cz) < b.r + m : x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
  const okPt = (x, z) => !inside(x, z, 0.9) && Math.abs(TERRAIN.h(x, z) - h0) < 0.15 && x > 3 && z > 3 && x < MAP - 3 && z < MAP - 3;
  // o eixo da rua em frente à porta
  let a0 = 1; if (RD) { let m = 1e9; for (let a = 0; a <= 16; a += 0.25) { const d = RD(out.x + c * a, out.z + s * a); if (d < m) { m = d; a0 = a; } } }
  let best = null, bs = Infinity;
  for (let a = a0 + hw; a <= a0 + hw + 4; a += 0.25) for (let b = 2; b <= 14; b += 0.5) {
    const x = out.x + c * a + s * b, z = out.z + s * a - c * b;          // (s, −c) = esquerda de quem sai
    const d = RD ? RD(x, z) : hw + 1.5;
    if (d < hw + 0.9 || d > hw + 2.4 || !okPt(x, z)) continue;
    const sc = Math.abs(b - 6.5) + Math.abs(d - (hw + 1.4)) * 2 + (a - a0 - hw) * 0.3;
    if (sc < bs) { bs = sc; best = { x, z }; }
  }
  if (!best) best = { x: out.x + c * (a0 + hw + 1.4) + s * 6.5, z: out.z + s * (a0 + hw + 1.4) - c * 6.5 };
  // rumo da rua e lado da pista no ponto escolhido
  let ax = -c, az = -s;
  if (RD) { const e = 0.3, gx = RD(best.x + e, best.z) - RD(best.x - e, best.z), gz = RD(best.x, best.z + e) - RD(best.x, best.z - e), L = Math.hypot(gx, gz) || 1; ax = -gx / L; az = -gz / L; }
  return { x: best.x, z: best.z, ax, az, tx: -az, tz: ax };
}
const grillStory = createGrillStory({
  walker, rig, audio, talkBox, input, menu, grillMusic, stage, crowd: grillCrowd, rainMusic, music, grillOverride: GRILL_OVERRIDE, insideOn: () => insideOn,
  get grillIn() { return grillIn; }, get world() { return world; },
  flag: flagOn, doorWorld: grillDoorWorld, walkSolids: () => walkSolids(), groundH: (x, z) => TERRAIN.h(x, z), findPole,
  prompt: t => { storyPrompt = t; },
  setState: s => setState(s),
  goOutside() { leaveGrill(); music.suspend(true); },
  goInside() { enterGrillScene(); },
  exitNormal() { leaveGrill(); walker.show(true); fade = 0; actionLock = 0.5; setState('walk'); },
  toTitle() { endRoofScene(); },
});
function leaveGrill() {
  if (!insideOn) return;
  insideOn = false; world.scene.add(walker.object); grillCrowd.stop();
  grillMusic.stop(); music.setOverride(null); music.suspend(false);   // a do bairro volta como estava antes de entrar
  const d = grillDoorWorld(2.2); walker.pose(d.x, d.z, d.heading);
  rig.snap({ x: walker.x, z: walker.z, y: walker.floor, heading: walker.heading });   // tela preta: a câmera já começa no personagem, junto à porta
}
function updateGrill(dt) {
  const g = grill; g.t += dt;
  if (!g.swapped) { fade = Math.min(1, g.t / 1.0); if (g.t >= 1.0) { g.swapped = true; swapGrill(); } }
  else fade = Math.max(0, 1 - (g.t - 1.15) / 1.0);
  if (insideOn) { walker.update(dt, { x: 0, z: 0 }, 'screen', grillIn.solids, GRILL_FAR_VAN); grillIn.update(dt, walker.x, walker.z); }
  if (g.swapped && g.t >= 2.15) { fade = 0; grill = null; actionLock = 0.4; setState(insideOn ? 'inside' : 'walk'); }
}

function startNewRound(newMatch = true) {
  if (newMatch) { matchTimer.reset(); resetBumps(); }   // nova partida: cronômetro em 00:00 (começa no 1º quadro jogável) e batidas em 0
  if (grillStory.active) grillStory.reset();
  if (insideOn) leaveGrill();
  grill = null;
  footDelivery = false; unmoor();
  if (cine || unwhite) { restoreLook(); cine = null; }
  walker.show(false); talkBox.hide(); walker.setFloor(0); roofWalk = null; van.object.visible = true;
  if (COMPOSED.includes(neighborhood)) composeRound(); else game.newRound();
  refreshBarriers();                             // Bairro 3: barreiras em lugares novos
  applyJams();                                   // Bairro 7: as entregas só entre os lotes que a van consegue alcançar
  if (gameMode === 'career' && newMatch) career.startMatch(careerLevel);   // nova partida da Carreira (no fim da partida, a próxima começa no mapa)
  hint.clear(); hintUsed = false; hintStep = -1; hintCount = 0;
  heli.reset();
  monster.reset();
  boom.reset(); clearLaserVoids(); restartMsg = null;
  world.setLayout(game.layout);
  if (neighborhood === 'med10') medLife.layout(world, game, MEDV);   // Medieval: rotinas recomeçam com as casas desta partida
  if (chatNpc) { medLife.endTalk(chatNpc); chatNpc = null; }
  resetGates();                                  // Colheita: porteiras fechadas de novo
  if (neighborhood === 'favela8') favPets.reset();   // Morro: bichos sorteados de novo
  world.hideResident();
  resetVan();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  resetParcel(); setupChurch(); setupMedStory(); setupVeniceK();
  dialog = null; pending = -1; nearHouse = -1; actionLock = 0;
  nearPump = false; fuelArmed = true; fuelMsgT = 0;
  qualityWarm = 120;                           // a troca de rodada remonta o bairro: não conta como lentidão
}

/** Ponto para onde a câmera se volta durante a entrega: o quintal da frente, entre a porta e o portão. */
const focusPt = { x: 0, z: 0 };
function focusOf(h) {
  const o = slotOrigin(game.slotOf[h]);
  focusPt.x = o.x + LOT_ANCHORS.doorX; focusPt.z = o.z + 12.2;
  return focusPt;
}

// ---------- Atualização ----------
function update(dt, t) {
  stateT += dt;
  wsStory.update(dt);                                // Bairro 24: a oficina (cenas e rotina)
  massStory.update(dt);                              // Bairro 24: a conversa da oficina, a missa e o temporal
  updateMenuMusic();
  updateRain(dt);                                    // depois do 4º sino: chuva em todos os bairros e nos menus
  grillCrowd.update(dt, document.hidden);
  if (matchTimer.armed && TIMER_PLAY.includes(state)) matchTimer.begin();
  if (!TIMER_OFF.includes(state) && !menu.isOpen && !missions.isOpen) matchTimer.tick(dt);   // (pausado com o MENU ou as missões abertas)
  if (state !== 'title' && state !== 'levelSelect' && state !== 'levelFly' && state !== 'shop' && !(state === 'fadeOut' && endToMap) && input.toggleCamera()) rig.toggle();

  switch (state) {
    case 'drive': {
      if (missions.isOpen) {                        // lista de missões aberta: a van espera; M fecha
        van.stop(); nearHouse = -1;
        if (input.missions()) missions.close();
        break;
      }
      if (gameMode === 'career' && input.missions()) {   // M: abre as missões do bairro no meio da partida
        missions.open(careerLevel); van.stop(); nearHouse = -1;
        break;
      }
      const free = gameMode === 'free';
      if (approachLock()) { input.walk(); input.heli(); input.fire(); }   // aproximação da igreja: L, H e F não valem
      if (input.walk() && actionLock <= 0) {          // L: o motorista desce da van (só parada e no chão)
        if (heli.landed && roofUnderVan()) {                   // pousado no terraço de um prédio: desce e anda pela laje
          van.stop(); nearHouse = -1; nearPump = false;
          roofWalk = roofUnderVan(); walker.setFloor(roofWalk.y);
          walker.placeBesideVan(van, roofSolids());
          const R = APT_ROOF, o = roofWalk.o;                 // sem espaço ao lado: fica dentro da laje
          walker.pose(Math.min(Math.max(walker.x, o.x + R.x0 + 0.9), o.x + R.x1 - 0.9), Math.min(Math.max(walker.z, o.z + R.z0 + 0.9), o.z + R.z1 - 0.9), walker.heading);
          if (roofWalk.h === LOUNGER_APT && loungerSpot() && loungerSpot().visible) {   // C5: desce sempre já ao lado do K
            loungerSpot().getWorldPosition(_rp);
            walker.pose(_rp.x + 1.45, _rp.z - 0.3, Math.atan2(0.3, -1.45));
          }
          walker.show(true);
          setState('walk');
          break;
        }
        if (heli.flying) { fuelMsg = 'Pouse o helicóptero antes de descer.'; fuelMsgT = 2.5; }
        else if (Math.abs(van.speed) > 3.5) { fuelMsg = 'Pare a van para descer (L).'; fuelMsgT = 2.5; }
        else {
          if (!walker.placeBesideVan(van, walkSolids(), !!VENICE)) { fuelMsg = 'Encoste a lancha no cais para descer (L).'; fuelMsgT = 2.5; }   // Veneza: só desce em terra
          else {
            if (gameMode === 'career') career.exitVan(van.x, van.z, van.heading, van.speed, shopFronts());   // Bairro 4: "Estacione de ré"
            van.stop(); nearHouse = -1; nearPump = false;
            walker.show(true);
            setState('walk');
            break;
          }
        }
      }
      if (free && input.heli()) heli.toggle();
      van.setGhost(free && (menu.unstoppable || heli.high));
      if (heli.landed) van.stop();                // pousado no teto: parado até decolar (H)
      if (!mooringStep(dt)) van.update(dt, heli.landed ? { x: 0, z: 0 } : approachLock() ? approachAxis() : input.axis(), approachLock() ? 'car' : rig.mode === 'chase' ? 'car' : 'screen');
      if (bumpLevel() && !heli.flying) countBumps();  // Bairros 2 e 3: batidas da van (não conta no ar, nem descendo do helicóptero)
      if (heli.on && rig.mode === 'chase') {      // no ar, A/D giram mesmo parado
        const ax = input.axis().x;
        if (ax) van.turn(ax * 2.2 * dt * (1 - Math.min(1, Math.abs(van.speed) / 5)));
      }
      if (free && menu.unstoppable && !heli.flying) wreck(dt);
      nearHouse = heli.flying ? -1 : findNearHouse();
      nearGate = heli.flying || Math.abs(van.speed) > DELIVERY_MAX_SPEED ? -1 : findNearGate(van.x + Math.cos(van.heading) * 2, van.z + Math.sin(van.heading) * 2, 6.5);   // Colheita: porteira fechada à frente
      if (nearGate >= 0 || wsStory.busy) nearHouse = -1;               // (durante uma atividade da oficina, sem entrega normal)
      if (gameMode === 'career') career.tick(van.x, van.z, van.heading, { speed: van.speed, time: matchTimer.time, bars: barriers.list, jams: barriers.jamRects, entrance: { x: VAN_START.x, z: VAN_START.z } });   // ruas, barreiras, ré e cruzamentos (missões)
      if (input.hint()) requestHint();
      if (free && !MOONV && input.fire()) { van.stop(); nearHouse = -1; boom.fire(van, game.slotOf); setState('missile'); break; }
      actionLock = Math.max(0, actionLock - dt);
      nearPump = nearHouse < 0 && !heli.flying && atPump();
      if (nearPump && actionLock <= 0 && input.action()) {          // abastecer: não é uma entrega
        nearPump = false; fuelArmed = false;
        van.stop(); audio.fuel();
        if (gameMode === 'career') career.refuel();
        setState('fuel');
        break;
      }
      if (nearGate >= 0 && actionLock <= 0 && input.action()) { openGate(nearGate); nearGate = -1; actionLock = 0.4; break; }
      if (actionLock <= 0 && wsStory.driveAction()) break;          // Bairro 24 (história): buscar/entregar material da oficina
      if (nearHouse >= 0 && actionLock <= 0 && input.action()) {
        pending = nearHouse; nearHouse = -1;
        van.stop();
        audio.bell();
        setState('ring');
      }
      break;
    }
    case 'fuel':                                    // abastecendo: a van espera a bomba
      van.stop();
      if (stateT > FUEL_TIME) { fuelMsgT = 3; fuelMsg = FUEL_LINES[Math.floor(Math.random() * FUEL_LINES.length)]; actionLock = 0.3; setState('drive'); }
      break;
    case 'ring':
      if (stateT > RESIDENT_APPEAR && !HOUSES[pending].narrator) world.showResident(pending, 'angry');   // K não atende: continua lendo
      if (stateT > RING_TIME) {
        const stepBefore = game.step, indicated = game.route[game.step] === pending;
        dialog = game.visit(pending);
        if (gameMode === 'career') career.visit(pending, dialog.success, indicated, stepBefore, game, { time: matchTimer.time, bumps });   // na entrega certa, confirma e salva as missões desta partida
        if (gameMode === 'career' && dialog.success) matchTimer.stop();   // Carreira: a entrega certa encerra a partida — o tempo para aqui
        if (!dialog.narrator) world.showResident(pending, dialog.success ? 'happy' : 'angry');
        dialog.success ? audio.success() : dialog.narrator ? null : audio.grumble();
        setState('dialog');
      }
      break;
    case 'dialog':
      if ((stateT > 0.25 && input.action()) || (dialog.success && stateT > SUCCESS_AUTO)) {
        if (dialog.success && gameMode === 'free') nextDelivery();
        else if (dialog.success) { endToMap = true; setState('fadeOut'); }   // Carreira: entrega certa encerra a partida e volta ao mapa
        else {
          const visited = dialog.h;
          dialog = null; world.hideResident(); setState(footDelivery ? 'walk' : 'drive'); footDelivery = false; actionLock = 0.6;
          // casa errada explode (se habilitado), menos as que ainda fazem parte da rota desta rodada
          const idx = game.route.indexOf(visited);
          if (gameMode === 'free' && menu.explodeWrong && (idx < 0 || idx < game.step) && !boom.isDestroyed(visited)) {
            if (menu.wrongFx !== 'boom') startLaser(visited, game.slotOf[visited], menu.wrongFx);   // laser orbital (23 s) / Ursa Menor (25 s)
            else boom.explode(visited, game.slotOf[visited]);
          }
          if (hintStep >= 0 && game.step !== hintStep) { hint.retract(); hintStep = -1; }   // a pista mudou: a seta volta ao céu
        }
      }
      break;
    case 'boss':
      if (monster.update(dt, input) === 'done') {
        game.delivered = 0;
        restartMsg = 'O Devorador de Bairros te pegou! A partida recomeça…';
        setState('fadeOut');
      }
      break;
    case 'missile':
      if (boom.missileDone) { restartMsg = 'Casa destruída! A partida vai reiniciar…'; setState('fadeOut'); }
      break;
    case 'fadeOut':                                 // (controles parados: nada aqui lê o teclado)
      fade = Math.min(1, stateT / (endToMap ? CAREER_END_FADE : FADE_TIME));
      if (fade >= 1) { if (endToMap) finishCareerMatch(); else { startNewRound(); setState('fadeIn'); } }
      break;
    case 'walk': {                                  // a pé: sem entregas, sem abastecer; E perto da van volta a dirigir
      if (approach.phase === 'revealed' && churchShown && walker.z > MAP_W() + CHURCH_Z + 3.5 && Math.abs(walker.x - MAP_W() / 2) < 11.8) {
        approach.phase = 'done'; endApproachMusic(1);    // entrou na igreja: a faixa some em ~1 s
      }
      if (missions.isOpen) { if (input.missions()) missions.close(); break; }
      if (gameMode === 'career' && input.missions()) { missions.open(careerLevel); break; }
      van.stop();
      if (!roofWalk && TERRAIN.kind !== 'flat') walker.setFloor(TERRAIN.h(walker.x, walker.z));   // Bairro 9: ladeiras e escadarias
      if (VENICE) walker.setFloor(VENICE.walkH(walker.x, walker.z));   // Veneza: cais, vielas e pontes
      walker.update(dt, input.axis(), rig.mode === 'chase' ? 'car' : 'screen', roofWalk ? roofSolids() : walkSolids(), van);
      if (gameMode === 'career') career.walk(walker.x, walker.z, PLAZA);   // Bairro 2: "Conheça a praça" (fica pendente até a entrega certa)
      if (carrying) {                               // caixa nas mãos, na frente do peito
        const hc = Math.cos(walker.heading), hs = Math.sin(walker.heading);
        parcel.position.set(walker.x + hc * 0.62, 0.62, walker.z + hs * 0.62); parcel.rotation.set(0, -walker.heading, 0);
      }
      actionLock = Math.max(0, actionLock - dt);
      nearHouse = VENICE || SPOTS ? findNearHouseFoot() : -1;   // Veneza/Morro/Colheita: dá para entregar a pé
      if (nearGrillDoor()) nearHouse = -1;                 // na porta do Grillby's, E entra (a entrega é no ponto da rua)
      nearGate = findNearGate(walker.x, walker.z, 2.8);
      if (nearGate >= 0) nearHouse = -1;
      if (actionLock > 0 || !input.action()) break;
      if (massStory.walkAction()) break;               // Bairro 24 (história): conversar com o K no banco da igreja
      if (wsStory.walkAction()) break;                 // Bairro 24 (história): conversar com o K / ajudar na oficina
      if (nearGate >= 0) { openGate(nearGate); nearGate = -1; actionLock = 0.4; break; }
      if (nearVenK()) { startVeniceTalk(); break; }   // Veneza: falar com o K tem prioridade
      { const npc = medTalkTarget(); if (npc) { startChat(npc); break; } }   // Medieval: conversar com um morador (quando ele está mais perto que a porta)
      if (nearGrillDoor()) { startGrill('in'); break; }   // Nevasca: entrar no Grillby's
      if (nearHouse >= 0) { pending = nearHouse; nearHouse = -1; footDelivery = true; audio.bell(); setState('ring'); }
      else if (nearLounger()) startRoofTalk();             // no terraço a van fica perto: falar com ele tem prioridade
      else if (nearChurchK()) startChurchTalk();       // na igreja também (a van pode ter entrado pela porta)
      else if (walker.nearVan(van)) { if (carrying) resetParcel(); walker.show(false); walker.setFloor(0); roofWalk = null; actionLock = 0.5; setState('drive'); }   // a caixa volta ao lugar
      else if (nearParcel()) carrying = true;
      else if (nearK()) startTalk();
      break;
    }
    case 'grill':                                    // Grillby's: fade, troca de cenário, fade
      van.stop(); updateGrill(dt);
      break;
    case 'inside': {                                 // dentro do Grillby's: anda pelo salão; E na porta interna sai
      van.stop();
      walker.update(dt, input.axis(), 'screen', grillIn.solids, GRILL_FAR_VAN);
      grillIn.update(dt, walker.x, walker.z);
      actionLock = Math.max(0, actionLock - dt);
      if (actionLock <= 0 && input.action()) {
        if (grillIn.nearDoor(walker.x, walker.z)) startGrill('out');
        else if (nearGrillK()) grillStory.start();                   // história: sentar diante do K
      }
      break;
    }
    case 'extra':                                    // nível extra 1: o vazio, o cubo e a figura (cena própria)
      van.stop();
      if (Math.abs(extra.camera.aspect - rig.camera.aspect) > 1e-4) { extra.camera.aspect = rig.camera.aspect; extra.camera.updateProjectionMatrix(); }
      extra.update(dt, menu.isOpen || document.hidden);
      if (extra.active) fade = extra.fade;
      break;
    case 'mstory':                                   // Bairro 24: conversa sobre a oficina, missa, temporal (controles parados)
      van.stop();
      break;
    case 'chseq':                                    // Bairro 24: a montagem da igreja (controles parados)
      van.stop();
      updateChurchSeq(dt);
      break;
    case 'wstory':                                   // Bairro 24: cenas da oficina (o K conserta; falas automáticas)
      van.stop();
      break;
    case 'gstory':                                   // Grillby's: o encontro com o K e o resgate (1ª pessoa)
      van.stop();
      if (insideOn) grillIn.update(dt, walker.x, walker.z);
      grillStory.update(dt);
      break;
    case 'laser':                                    // laser orbital: sem controles nem entregas até o fim da sequência
      van.stop();
      if (walker.visible) walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
      if (fxCine.camera) fxCine.camera.aspect = rig.camera.aspect;
      fxCine.update(dt);
      break;
    case 'cine':                                     // sequência automática (igreja): sem controles
      if (cine) updateChurchCine(dt);
      break;
    case 'talk': {                                  // conversa com o K: jogador parado, câmera fixa
      walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
      const sp = readerSpot();
      if (talkPhase === 'aside' && (!sp || sp.userData.asideDone())) { talkPhase = 'talk'; talkBox.show(talkLines, endTalk); }
      else if (talkPhase === 'talk') { talkBox.update(dt); if (input.action()) talkBox.press(); }
      else if (talkPhase === 'note') { if (input.action()) talkBox.pressNote(); }
      break;
    }
    case 'chat': {                                  // Medieval: conversa com um morador (não é entrega nem dica)
      walker.update(dt, { x: 0, z: 0 }, 'car', walkSolids(), van);
      talkBox.update(dt); if (input.action()) talkBox.press();
      break;
    }
    case 'levelSelect': {
      if (levelSelect.infoOpen) { if (input.action()) levelSelect.closeInfo(); break; }   // janela "Além das entregas": E/Enter = Entendi
      const n = input.nav();
      if (n.x || n.y) levelSelect.move(n.x, n.y);
      if (input.action()) confirmLevel(levelSelect.selected);
      break;
    }
    case 'mapIn':
      fade = Math.max(0, 1 - stateT / FADE_TIME);
      careerMap.update(dt, 0, false);
      if (fade <= 0) setState('map');
      break;
    case 'map':
      if (lock.isOpen) careerMap.update(dt, 0, false);   // digitando a senha: a van espera
      else if (missions.isOpen) {                        // lista aberta: a van espera; M fecha
        if (input.missions()) missions.close();
        careerMap.update(dt, 0, false);
      } else if (input.missions() && careerMap.near >= 0) missions.open(careerMap.near);
      else if (careerMap.update(dt, input.axis().x, input.action())) { careerLevel = careerMap.near; setState('mapOut'); }
      break;
    case 'mapOut':
      fade = Math.min(1, stateT / FADE_TIME);
      careerMap.update(dt, 0, false);
      if (fade >= 1) { careerMap.leave(); startFree('career'); }
      break;
    case 'fadeIn':
      fade = Math.max(0, 1 - stateT / FADE_TIME);
      if (fade <= 0) { if (wsFoot) { wsFoot = false; actionLock = 0.4; setState('walk'); } else setState('drive'); }
      break;
  }

  if (state !== 'drive') van.relax(dt);          // torre de caixas do bagageiro: para de balançar quando a van não está sendo dirigida
  world.update(t, dt);
  if (neighborhood === 'rail8') train.update(dt, van);
  if (neighborhood === 'night10') night.update(dt, state === 'walk' ? walker.x : van.x, state === 'walk' ? walker.z : van.z);
  if (neighborhood === 'farm10') farmOut.update(dt);
  if (neighborhood === 'garden8' && gardGate.arm) {   // Jardins: a cancela sobe quando a van (ou o personagem) chega perto e desce depois
    const G = GARDV.GATE, px = state === 'walk' ? walker.x : van.x, pz = state === 'walk' ? walker.z : van.z, near = Math.hypot(px - G.x, pz - G.z) < 20;
    gardGate.k += ((near ? 1 : 0) - gardGate.k) * Math.min(1, dt * 3);
    gardGate.arm.rotation.z = gardGate.k * 1.45;
    const i = SOLIDS.indexOf(gardGate.solid);
    if (gardGate.k > 0.5 && i >= 0) SOLIDS.splice(i, 1); else if (gardGate.k <= 0.5 && i < 0) SOLIDS.push(gardGate.solid);
    gardGate.live.userData.update(dt, t, state === 'walk' ? walker : null);   // portãozinho (abre para quem está a pé) e patinhos
  }
  if (neighborhood === 'modern8' && mdGate.arm) {   // Modernista: a cancela sobe quando a van (ou o personagem) chega perto e desce depois
    const G = FORESTV.GATE, px = state === 'walk' ? walker.x : van.x, pz = state === 'walk' ? walker.z : van.z, near = Math.hypot(px - G.x, pz - G.z) < 20;
    mdGate.k += ((near ? 1 : 0) - mdGate.k) * Math.min(1, dt * 3);
    mdGate.arm.rotation.z = mdGate.k * 1.45;
    const i = SOLIDS.indexOf(mdGate.solid);
    if (mdGate.k > 0.5 && i >= 0) SOLIDS.splice(i, 1); else if (mdGate.k <= 0.5 && i < 0) SOLIDS.push(mdGate.solid);
  }
  if (neighborhood === 'canyon10') { const playing = IN_GAME.includes(state) || state === 'walk'; canyonFx.update(dt, playing ? (walker.visible ? walker : van) : null); }
  const medActive = neighborhood === 'med10' && (IN_GAME.includes(state) || ['chat', 'fadeIn', 'fadeOut', 'laser', 'missile', 'boss'].includes(state));
  if (neighborhood === 'med10' && !medActive) medLife.silence();   // menus, título, mapa: o burgo fica em silêncio
  if (medActive) {                                 // Medieval: a vida do burgo continua mesmo com o jogador parado
    const me = walker.visible ? walker : van, playing = IN_GAME.includes(state) || state === 'chat';
    medLife.update(dt, { t, playing, listener: { x: me.x, z: me.z }, van: { x: van.x, z: van.z, heading: van.heading, speed: van.speed, visible: van.object.visible && !heli.flying },
      walker: { x: walker.x, z: walker.z, visible: walker.visible }, camera: rig.camera,
      isDestroyed: s => { const h = game.layout[s]; return h >= 0 && boom.isDestroyed(h); },
      busySpot: (state === 'ring' || state === 'dialog') && pending >= 0 ? game.slotOf[pending] : nearHouse >= 0 ? game.slotOf[nearHouse] : -1 });
  }
  if (neighborhood === 'flux10' || neighborhood === 'night10' || neighborhood === 'canyon10') {                // Fluxo (e Cachoeira): trânsito; param na frente da van e do motorista a pé
    const c = Math.cos(van.heading), s2 = Math.sin(van.heading), obs = [];
    if (!heli.flying) obs.push({ circles: [-1.5, 0, 1.5].map(k => [van.x + c * k, van.z + s2 * k, 1.25]) });
    if (walker.visible) obs.push({ circles: [[walker.x, walker.z, 0.6]] });
    const playing = IN_GAME.includes(state) || state === 'walk';
    traffic.update(dt, obs, playing ? (walker.visible ? walker : van) : null);
    if (!playing) traffic.silence();
  }
  if (neighborhood === 'favela8') favPets.update(dt, van.object.visible && !heli.flying ? { x: van.x, z: van.z, hd: van.heading, speed: van.speed } : null, walker.visible ? { x: walker.x, z: walker.z } : null);   // Morro: bichos (param diante da van)
  if (neighborhood === 'farm10') {                // Colheita: tratores e porteiras
    const c = Math.cos(van.heading), s2 = Math.sin(van.heading), obs = [];
    if (!heli.flying) obs.push({ circles: [-1.5, 0, 1.5].map(k => [van.x + c * k, van.z + s2 * k, 1.25]) });
    if (walker.visible) obs.push({ circles: [[walker.x, walker.z, 0.6]] });
    const playing = IN_GAME.includes(state) || state === 'walk';
    tractors.update(dt, obs, playing ? (walker.visible ? walker : van) : null);
    if (!playing) tractors.silence();
    chickens.update(dt, heli.flying ? null : { x: van.x, z: van.z, circles: [-1.5, 0, 1.5].map(k => [van.x + c * k, van.z + s2 * k]) });
    updateGates(dt);
  }
  if (neighborhood === 'forest8' || neighborhood === 'work8') {   // Bosque e Operário: carros devagar (e, no Bosque, folhas caindo perto de quem joga)
    const c = Math.cos(van.heading), s2 = Math.sin(van.heading), obs = [];
    if (!heli.flying) obs.push({ circles: [-1.5, 0, 1.5].map(k => [van.x + c * k, van.z + s2 * k, 1.25]) });
    if (walker.visible) obs.push({ circles: [[walker.x, walker.z, 0.6]] });
    const playing = IN_GAME.includes(state) || state === 'walk', me = walker.visible ? walker : van;
    const cars = neighborhood === 'work8' ? workTraffic : forestCars;   // Operário: caminhões e vans (workTraffic.js)
    cars.update(dt, obs, playing ? me : null);
    if (!playing) cars.silence();
    if (neighborhood === 'forest8') {               // copas transparentes quando escondem quem joga ou a casa do destino
      const hd = playing && game.route ? game.route[game.step] : -1, sp = hd >= 0 && game.slotOf[hd] != null ? FORESTV.spots[game.slotOf[hd]] : null;
      forestFx.update(dt, { x: me.x, y: TERRAIN.h(me.x, me.z), z: me.z }, rig.camera.position, sp ? { x: sp.cx, y: sp.y + 2.5, z: sp.cz } : null);
    }
  }
  if (neighborhood === 'snow8') {                 // Nevasca: limpa-neve e atalhos
    const c = Math.cos(van.heading), s2 = Math.sin(van.heading), obs = [];
    if (!heli.flying) obs.push({ circles: [-1.5, 0, 1.5].map(k => [van.x + c * k, van.z + s2 * k, 1.25]) });
    if (walker.visible) obs.push({ circles: [[walker.x, walker.z, 0.6]] });
    const playing = IN_GAME.includes(state) || state === 'walk';
    plow.update(dt, obs, playing ? (walker.visible ? walker : van) : null);
    if (!playing) plow.silence();
    updateBanks(dt);
  }
  updateTrolleySeq(dt);   // Bairro 11: o bonde espera se a van estiver nos trilhos
  if (neighborhood === 'venice8') { npcBoats.update(dt); updateBoat(dt); }
  updateChurch(dt);
  world.updateGas(van.x, van.z, dt);
  fuelMsgT = Math.max(0, fuelMsgT - dt);
  if ((state === 'drive' || state === 'missile') && allDestroyed()) {
    if (MOONV) { restartMsg = 'Todos os módulos foram destruídos! A partida vai reiniciar…'; setState('fadeOut'); }   // Órbita: sem o chefe (ele vive fora do bairro plano)
    else startBoss();
  }
  hint.update(dt);
  heli.update(dt, state === 'drive' && heli.on ? input.lift() : 0);
  if (MOONV && !heli.on && !heli.flying) van.object.position.y = van.simY;   // Órbita: a altura da gravidade baixa (saltinhos)
  boom.update(dt);
  { const foot = state === 'walk';              // quem está perto: a van ou, a pé, o personagem
    jamSound.update(dt, IN_GAME.includes(state) && [6, 7, 10].includes(gameMode === 'career' ? careerLevel : freeLevel) && !missions.isOpen,   // Bairros 7, 8 e 11 (Travessia)
      barriers.jamRects, foot ? walker.x : van.x, foot ? walker.z : van.z);
    cityAmb.update(dt, (IN_GAME.includes(state) || foot || state === 'fadeIn') && (neighborhood === 'city7' || neighborhood === 'city8'), jamSound.debug.level / 0.7); }   // Bairros 7 e 8: cidade ao fundo (abaixa com a música dos engarrafamentos)
  // entregando (campainha/diálogo) ou com o balão "E — Entregar" à vista: a câmera se volta para a casa
  const focusH = (state === 'ring' || state === 'dialog') ? pending : state === 'drive' ? nearHouse : -1;
  const onFoot = state === 'walk' || state === 'chat' || state === 'grill' || (footDelivery && (state === 'ring' || state === 'dialog'));   // (Grillby's: na transição a câmera fica no personagem)              // a câmera segue o personagem a pé
  moonUpdate(dt);                                 // Órbita: a lua gira por baixo de quem o jogador controla
  if (!insideOn && state === 'gstory') { rig.update(dt, { x: walker.x, z: walker.z, y: walker.floor, heading: walker.heading, speed: 0, focus: null }); grillStory.camOut(rig.camera); }
  else if (!insideOn) rig.update(dt, onFoot ? { x: walker.x, z: walker.z, y: walker.floor, heading: walker.heading, speed: walker.speed, focus: null } : { x: van.x, z: van.z, y: heli.altitude, heading: van.heading, speed: van.speed, focus: null });   // sem câmera automática: quem controla é o jogador
  if (state === 'talk') { rig.camera.position.copy(talkCam.pos); rig.camera.lookAt(talkCam.look); }   // enquadramento fixo da conversa
  if (state === 'wstory') wsStory.applyCam(rig.camera);
  if (state === 'mstory') massStory.applyCam(rig.camera);
  if (state === 'chseq' && chseq) churchSeqCam(rig.camera);
  if (state === 'laser') fxCine.applyCamera(rig.camera);
  if (state === 'cine' && cine) { rig.camera.position.copy(cine.camPos); rig.camera.lookAt(cine.camLook); }
  // névoa só na câmera atrás da van (suaviza o horizonte); a visão geral fica nítida
  const fb = rig.blend, fog = world.scene.fog;
  // ao sul do Bairro 1, a caminho da igreja, a névoa se afasta aos poucos (a igreja aparece de longe)
  const fs = churchOn ? THREE.MathUtils.smoothstep(van.z - MAP_W(), 40, 220) : 0, fn = 130 + 200 * fs, ff = 430 + 700 * fs;
  if (fog) { fog.near = 3000 + (fn - 3000) * fb; fog.far = 3200 + (ff - 3200) * fb; }
  if (fog && state === 'gstory' && !insideOn && grillStory.ext) { fog.near = 1; fog.far = 22; }
  if (fog && massStory.fog) { fog.near = massStory.fog[0]; fog.far = massStory.fog[1]; }   // temporal: lá fora quase não se vê nada   // resgate: nevasca fechada (mal se vê o outro lado da rua)
  if (nightSaved && nightSaved.scene === world.scene && MENU_STATES.includes(state)) { rig.camera.position.copy(nightCam.p); rig.camera.lookAt(nightCam.l); }   // fundo noturno: a casa do K
  if (!sunSprite || sunSprite.parent !== world.scene) grabSun();
  if (sunSprite) sunSprite.position.set(rig.camera.position.x, 0, rig.camera.position.z).add(SUN_OFS);   // sol acompanha a câmera (fica sempre no mesmo lugar do céu, por mais longe que se dirija)
  const shake = Math.max(hint.shake, boom.shake);
  if (shake > 0) {                                       // tremor da câmera no impacto
    const s = shake * shake * 0.9;
    rig.camera.position.x += (Math.random() - 0.5) * s;
    rig.camera.position.y += (Math.random() - 0.5) * s;
  }
  if (monster.phase !== 'idle') {                    // chefe: câmera própria e sem neblina (o monstro é enorme)
    monster.applyCamera(rig.camera);
    if (fog) { fog.near = 3000; fog.far = 3200; }
  }
  if (state === 'map') audio.engine(careerMap.moving, 0.55);
  else audio.engine(state === 'drive', Math.min(1.15, Math.abs(van.speed) / van.maxSpeed));
  input.endFrame();
}

// ---------- HUD ----------
const promptPos = new THREE.Vector3();
/** Toque: o que pode aparecer agora (joystick, câmera com o dedo, botões das teclas que valem neste momento). */
function touchFrame() {
  if (!touch) touch = createTouch({ input, canvas: renderer.domElement });
  if (!touch.on) { touch.update(); return; }
  const acts = [], A = (key, label, k, hold) => acts.push({ key, label, k, hold });
  let joystick = false, look = false;
  const blocked = menu.isOpen || missions.isOpen || talkBox.open || lock.isOpen || fade > 0.5;
  const camLbl = rig.mode === 'chase' ? 'Bairro' : 'Câmera';
  if (!blocked) switch (state) {
    case 'drive':
      joystick = true; look = true;
      if (approachLock()) break;                                     // aproximação da igreja: só a direção
      if (heli.landed) { A('KeyH', 'Decolar', 'H'); if (gameMode === 'free' && !MOONV) A('KeyF', 'Míssil', 'F'); if (roofUnderVan()) A('KeyL', 'Descer', 'L'); }
      else if (heli.on) { A('Space', 'Subir', '␣', true); A('ShiftLeft', 'Descer', '⇧', true); A('KeyH', 'Pousar', 'H'); if (gameMode === 'free' && !MOONV) A('KeyF', 'Míssil', 'F'); }
      else { A('KeyL', VENICE ? 'Descer da lancha' : 'Descer da van', 'L'); if (gameMode === 'free') { A('KeyH', 'Helicóptero', 'H'); if (!MOONV) A('KeyF', 'Míssil', 'F'); } }
      A('KeyC', camLbl, 'C');
      break;
    case 'walk': joystick = true; look = true; A('KeyC', camLbl, 'C'); break;
    case 'inside': joystick = true; break;                            // Grillby's (visão de cima, sem giro)
    case 'gstory': joystick = true; look = true; break;               // 1ª pessoa / resgate (a história decide o que vale)
    case 'extra': joystick = look = !extra.locked; break;
    case 'boss': if (monster.phase === 'grace') { joystick = true; if (!monster.robotOn) A('KeyT', 'Robô', 'T'); } break;
    case 'map': joystick = true; A('KeyE', 'Jogar', 'E'); A('KeyM', 'Missões', 'M'); break;
    case 'trolley': if (trolley.choosing) A('KeyE', 'Mudar o trajeto', 'E'); break;
  }
  const bar = document.querySelector('.ahud'), r = bar && bar.offsetParent ? bar.getBoundingClientRect() : null;
  touch.update({ joystick, look, actions: acts, dialog: state === 'dialog' && !menu.isOpen, top: (r && r.height ? r.bottom : 10) + 8 });
}
function updateHUD() {
  touchFrame();
  matchTimer.setBumps(bumpShown() ? bumps : null);   // visível só no Bairro 3 (no 2 conta por dentro: "Sem esbarrar")
  matchTimer.show((TIMER_PLAY.includes(state) && !approachLock()) || (state === 'fadeOut' && endToMap));   // cenas e aproximação da igreja: escondido
  music.setNowPlaying(nowPlaying());              // nome da faixa ao lado do botão de música
  music.setLift(talkBox.open);
  back.set(state === 'levelSelect' || state === 'shop' || (state === 'extra' && extra.active && extra.phase !== 'out') || (state === 'map' && !missions.isOpen) || (IN_GAME.includes(state) && !missions.isOpen));
  missionsBtn.set(gameMode === 'career' && IN_GAME.includes(state) && !missions.isOpen,
    `MISSÕES ${career.completedCount(careerLevel)}/5`);
  hud.setCounter(game.delivered);
  if (inMap()) {
    hud.setSub('A: voltar  ·  D: avançar  ·  E: jogar  ·  M: missões', 'muted');
    hud.setMain('Carreira — escolha um bairro na estrada', 'clue');
    hud.setPrompt(false);
    hintBtn.set('hidden');
    lock.set(state === 'map' && !missions.isOpen);
    hud.setFade(fade);
    return;
  }
  lock.set(false);
  if (state === 'extra') {                           // nível extra 1: sem pista, contador, dica nem cronômetro
    hud.setSub('', 'muted'); hud.setMain('', 'clue'); hintBtn.set('hidden'); hud.setPrompt(false);
    hud.setFade(fade);
    return;
  }
  if (state === 'gstory') {                          // encontro com o K / resgate: só o aviso da ação
    hud.setSub('', 'muted'); hud.setMain('', 'clue'); hintBtn.set('hidden');
    hud.setPrompt(!!storyPrompt, stage.clientWidth / 2, stage.clientHeight * 0.66, 'up', storyPrompt || '');
    hud.setFade(fade);
    return;
  }
  if (state === 'grill' || state === 'inside') {   // Grillby's: sem pista nem botões da partida
    hud.setSub(insideOn ? "GRILLBY'S  ·  WASD / setas: andar  ·  E na porta: sair" : '', 'muted');
    hud.setMain(insideOn ? "Grillby's" : '', 'clue');
    hintBtn.set('hidden');
    const near = state === 'inside' && grillIn.nearDoor(walker.x, walker.z), nk = state === 'inside' && nearGrillK();
    if (near || nk) { grillIn.camera.updateMatrixWorld(); promptPos.set(walker.x, 2.7, walker.z).project(grillIn.camera); hud.setPrompt(true, (promptPos.x + 1) / 2 * stage.clientWidth, (1 - promptPos.y) / 2 * stage.clientHeight, 'up', near ? 'Sair' : 'Conversar'); }
    else hud.setPrompt(false);
    hud.setFade(fade);
    return;
  }
  hintBtn.set(hintUsed || hintStep === game.step ? 'used' : state === 'drive' ? 'ready' : 'busy');

  if (state === 'dialog') {
    hud.setSub(dialog.success ? '✔ Entrega concluída!  ·  [E] continuar' : '[E] ou Espaço: continuar',
      dialog.success ? 'success' : 'cont');
    hud.setMain(dialog.narrator ? dialog.text : `${dialog.name}: “${dialog.text}”`, dialog.success ? 'success' : 'dialog');   // narrador: só o pensamento, entre parênteses
  } else {
    const extraKeys0 = '  ·  L: descer da van';
    const extraKeys = extraKeys0 + (gameMode === 'free' ? (MOONV ? '  ·  H: helicóptero' : '  ·  H: helicóptero  ·  F: míssil') : '  ·  M: missões');
    hud.setSub(state === 'talk' || state === 'cine' || state === 'trolley' || state === 'trolleyBlack' || state === 'laser' ? '' : state === 'walk'
      ? (rig.mode === 'chase' ? 'A PÉ  ·  W/S: andar  ·  A/D: virar  ·  E (perto da van): entrar  ·  C: bairro  ·  botão direito: olhar em volta' : 'A PÉ  ·  WASD: andar  ·  E (perto da van): entrar  ·  C: câmera')
      : heli.landed
      ? 'POUSADO NO PRÉDIO  ·  H: decolar  ·  F: míssil'
      : heli.on
      ? 'HELICÓPTERO  ·  W/S: frente e ré  ·  A/D: girar  ·  Espaço: subir  ·  Shift: descer  ·  H: pousar (em cima de um prédio, pousa no teto)  ·  F: míssil'
      : rig.mode === 'chase'
      ? 'W / ↑: acelerar  ·  S / ↓: frear e ré  ·  A D / ← →: virar  ·  E: entregar  ·  C: bairro  ·  T: dica' + extraKeys
      : 'WASD / Setas: dirigir  ·  E: entregar  ·  C: câmera  ·  T: dica' + extraKeys, 'muted');
    if ((state === 'drive' || state === 'walk') && wsStory.objective()) hud.setMain(wsStory.objective(), 'clue');   // atividade da oficina no lugar da pista
    else if (state === 'drive' && hint.active && !hint.landed) hud.setMain('Olha a dica caindo do céu!', 'ring');
    else if (state === 'ring') hud.setMain('Ding-dong… 🔔', 'ring');
    else if (state === 'boss') hud.setMain(monster.phase === 'driveOut' ? 'Todas as casas foram destruídas… algo despertou!' : 'O DEVORADOR DE BAIRROS acordou!', 'dialog');
    else if (state === 'missile') hud.setMain('Míssil disparado!', 'ring');
    else if (state === 'fuel') hud.setMain('⛽ Abastecendo… glub, glub, glub…', 'ring');
    else if (state === 'talk' || state === 'cine' || state === 'wstory' || state === 'chseq' || state === 'mstory' || state === 'trolley' || state === 'trolleyBlack' || state === 'laser') hud.setMain('', 'clue');
    else if (state === 'walk' && carrying) hud.setMain(walker.nearVan(van) ? 'Entrar na van devolve a caixa ao lugar dela.' : 'Carregando uma caixa… de quem será?', 'clue');
    else if (state === 'walk') hud.setMain(walker.nearVan(van) && !nearLounger() && !nearVenK() ? 'Perto da van — aperte E para entrar.' : SPOTS ? game.mainText() : 'Passeando a pé… (não dá para entregar andando)', 'clue');   // Morro: a pé continua valendo a pista
    else if (state === 'drive' && fuelMsgT > 0) hud.setMain(fuelMsg, 'dialog');
    else if (state === 'fadeOut') hud.setMain(restartMsg || 'Entrega concluída! Preparando a próxima…', restartMsg ? 'dialog' : 'success');
    else hud.setMain(game.mainText(), 'clue');
  }

  const walkNear = state === 'walk' && walker.nearVan(van) && !nearLounger() && !nearChurchK() && !nearVenK() && !missions.isOpen;
  // a pé no Bairro 1: pegar a caixa / entregar ao K / conversar (balão em cima do personagem)
  const wsWalk = state === 'walk' && !missions.isOpen ? massStory.walkPrompt() || wsStory.walkPrompt() : '';
  const walkAct = wsWalk ? wsWalk : state === 'walk' && medTalkTarget() && !missions.isOpen ? 'Conversar' : nearGrillDoor() && !missions.isOpen ? "Entrar no Grillby's" : state === 'walk' && nearGate >= 0 && !missions.isOpen ? 'Abrir porteira' : state === 'walk' && nearVenK() && !missions.isOpen ? 'Conversar' : state === 'walk' && nearHouse >= 0 && !missions.isOpen ? 'Entregar' : state === 'walk' && !walkNear && !missions.isOpen ? (nearParcel() ? 'Pegar a caixa' : nearK() ? (carrying ? 'Entregar a caixa' : 'Conversar') : nearLounger() || nearChurchK() ? 'Conversar' : '') : '';
  if (walkAct) {
    rig.camera.updateMatrixWorld();
    promptPos.set(walker.x, walker.floor + 2.7, walker.z).project(rig.camera);
    hud.setPrompt(true, (promptPos.x + 1) / 2 * stage.clientWidth, (1 - promptPos.y) / 2 * stage.clientHeight, 'up', walkAct);
    hud.setFade(fade);
    return;
  }
  const wsDrive = state === 'drive' ? wsStory.drivePrompt() : '';
  const promptLabel = wsDrive ? wsDrive : walkNear ? (VENICE ? 'Entrar na lancha' : 'Entrar na van') : state === 'drive' && nearGate >= 0 ? 'Abrir porteira' : nearHouse >= 0 ? 'Entregar' : 'Abastecer';
  if ((state === 'drive' && (nearHouse >= 0 || nearPump || nearGate >= 0 || wsDrive)) || walkNear) {
    // Balão AO LADO da van, sobre a rua: acima dela ele cobriria o quintal da frente da casa (onde estão as pistas).
    const w = stage.clientWidth, h = stage.clientHeight;
    const c = Math.abs(Math.cos(van.heading)), s = Math.abs(Math.sin(van.heading));
    const ex = c * VAN.length / 2 + s * VAN.width / 2 + 0.4;       // meia extensão da van em X (+ folga)
    rig.camera.updateMatrixWorld();                                 // pose deste quadro (o render ainda não rodou)
    if (rig.mode === 'chase') {
      // atrás da van: o balão fica logo acima dela (as casas estão dos lados, não atrás)
      promptPos.set(van.x, VAN.height + 1.2, van.z).project(rig.camera);
      hud.setPrompt(true, (promptPos.x + 1) / 2 * w, (1 - promptPos.y) / 2 * h, 'up', promptLabel);
      hud.setFade(fade);
      return;
    }
    promptPos.set(van.x, 1, van.z).project(rig.camera);
    const right = (promptPos.x + 1) / 2 < 0.75;                      // perto da borda direita: vai para a esquerda
    promptPos.set(van.x + (right ? ex : -ex), 1, van.z).project(rig.camera);
    hud.setPrompt(true, (promptPos.x + 1) / 2 * w, (1 - promptPos.y) / 2 * h, right ? 'right' : 'left', promptLabel);
  } else hud.setPrompt(false);

  hud.setFade(fade);
}

// ---------- Qualidade adaptativa ----------
// A cada 90 quadros desenhados olha a mediana do intervalo entre eles. Se ficar acima do orçamento (o ritmo-alvo
// + 25%, ou < 50 fps) por duas janelas seguidas, baixa um degrau: resolução interna −0.25× até 1×, depois sombras
// simples, depois sem sombras. Ignora os primeiros quadros após carregar/trocar de rodada. Só desce, sem oscilar.
const frameTimes = new Float32Array(90);
let frameN = 0, qualityWarm = 150, slowWindows = 0, shadowTier = 0;
function setShadowTier(t) {
  shadowTier = t;
  if (t === 1) renderer.shadowMap.type = THREE.BasicShadowMap;
  if (t >= 2) renderer.shadowMap.enabled = false;
  world.scene.traverse(o => {
    if (!o.material) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.needsUpdate = true;
  });
}
function adaptQuality(frameDt, target) {
  if (document.hidden) { frameN = 0; return; }
  if (qualityWarm > 0) { qualityWarm--; return; }
  if (pixelRatio <= 1 && shadowTier >= 2) return;
  frameTimes[frameN++] = frameDt;
  if (frameN < frameTimes.length) return;
  frameN = 0;
  frameTimes.sort();
  const slow = frameTimes[frameTimes.length >> 1] > Math.max(1 / 50, target * 1.25);
  slowWindows = slow ? slowWindows + 1 : 0;
  if (slowWindows < 2) return;
  slowWindows = 0; qualityWarm = 60;
  if (pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    resize();
  } else setShadowTier(shadowTier + 1);
}

// ---------- Laço ----------
// Ritmo estável perto de 60 fps: em telas de 120–165 Hz desenha a cada 2 ou 3 atualizações da tela
// (em vez de alternar 3 e 4 vsyncs por quadro), o que também alivia a GPU integrada.
const clock = new THREE.Clock();
let elapsed = 0, lastRaf = 0, vsyncN = 0, every = 1, refresh = 1 / 60, rafN = 0;
const rafDeltas = new Float32Array(31);
// Prepara o que só apareceria na 1ª campainha (shaders e texturas do morador); o fade inicial esconde isso.
world.showResident(0, 'happy');
renderer.compile(world.scene, rig.camera);
world.showResident(0, 'angry');
renderer.compile(world.scene, rig.camera);   // compila os shaders já no carregamento
renderer.render(world.scene, rig.camera);
world.hideResident();
renderer.setAnimationLoop(now => {
  if (lastRaf && now > lastRaf) {
    const d = (now - lastRaf) / 1000;
    if (d < 0.1) {
      rafDeltas[rafN++] = d;
      if (rafN === rafDeltas.length) {
        rafN = 0;
        refresh = Float32Array.from(rafDeltas).sort()[rafDeltas.length >> 1];
        every = Math.max(1, Math.min(3, Math.round((1 / 60) / refresh)));
      }
    }
  }
  lastRaf = now;
  if (++vsyncN < every) return;                // pula esta atualização da tela
  vsyncN = 0;
  const raw = clock.getDelta();
  adaptQuality(raw, every * refresh);
  const dt = Math.min(0.05, raw);
  elapsed += dt;
  update(dt, elapsed);
  updateHUD();
  if (inMap()) renderer.render(careerMap.scene, careerMap.camera); else if (state === 'extra' && extra.active) renderer.render(extra.scene, extra.camera); else if (insideOn) renderer.render(grillIn.scene, grillIn.camera); else if (state === 'trolley') renderer.render(trolley.scene, trolley.camera); else if (state === 'laser' && fxCine.inSpace) renderer.render(fxCine.scene, fxCine.camera); else if (churchCine.active) churchCine.render(world.scene, rig.camera); else renderer.render(world.scene, rig.camera);
});

// ---------- Ganchos para testes automatizados ----------
window.ADRESS = {
  THREE, renderer, game, van, rig, hud, input, audio, hint, boom, menu, music, heli, monster,
  get world() { return world; },
  get neighborhood() { return neighborhood; },
  barriers, SOLIDS, doorPoint, slotOrigin, GAS_CANOPY, GAS_ISLANDS,
  get gas() { return GAS_LIST; },
  get nearPump() { return nearPump; },
  useNeighborhood,
  get hintUsed() { return hintUsed; },
  get state() { return state; },
  get nearHouse() { return nearHouse; },
  get dialog() { return dialog; },
  get pixelRatio() { return pixelRatio; },
  get titleDriver() { return titleDriver; },
  /** Órbita (testes): põe a van no ponto p da lua, virada para f (vetores [x, y, z]). */
  moonPlace(p, f) { van.teleport(0, 0, 0); FRAME.reset(new THREE.Vector3(...p).normalize(), new THREE.Vector3(...f), 0, 0); moonAnchor.x = moonAnchor.z = 0; FRAME.toSphere(0, 0, vanSph.p); moonUpdate(0, true); },
  get moonVan() { return { p: vanSph.p.toArray().map(v => +v.toFixed(3)), f: vanSph.f.toArray().map(v => +v.toFixed(3)), y: +van.simY.toFixed(2) }; },
  FRAME, MOONV: () => MOONV,
  massStory, MASS_KEY, extra, startExtra, screenShatter, voidMusic, menuMusic, rainFx, rainAudio, menuBg, get menuNight() { return !!nightSaved; }, get rainOn() { return rainOn(); }, menuWorld, lockCP: n => STORY_CP.apply(n), lockCPcur: () => STORY_CP.current(), devMissions: DEV_MISSIONS, get parcelVisible() { return !!parcel.parent; },
  laser, ursa, solar, reality, startLaser,
  get church() { return church; }, get venK() { return venK; }, startVeniceTalk, churchStage, get greenBell() { return greenBell; }, get churchBell() { return churchBell; },
  churchReveal() { if (churchOn && !churchShown) { approach.phase = 'revealed'; revealChurch(true); } },
  get churchMusicTime() { return +churchMusic.time.toFixed(2); }, get bellMusic() { return bellMusic; }, get vanFade() { return vanFade; }, nowPlaying, get approach() { return approach; },
  get cine() { return cine; }, get whiteOn() { return !!unwhite; }, get talkMusicTime() { return talkMusic.time; }, startChurchTalk, talkBox,
  get churchState() { return { on: churchOn, t: churchT, a: churchA, shown: churchShown }; },
  get gameMode() { return gameMode; },
  career, missions,
  get careerMap() { return careerMap; },
  get careerLevel() { return careerLevel; },
  setCareerLevel(l) { careerLevel = l; },
  setFreeLevel(l) { freeLevel = l; },
  walker, jamSound, cityAmb, train, walkSolids, trolley, get tseq() { return tseq; }, get FAVELA() { return FAVELA; }, traffic, tractors, chickens, plow, workTraffic, banks, get SNOWV() { return SNOWV; }, get MEDV() { return MEDV; }, medLife, get chatNpc() { return chatNpc; }, night, get grillIn() { return grillIn; }, get insideOn() { return insideOn; }, grillStory, wsStory, grillMusic, rainMusic, thirdMusic, churchCine, nowPlaying, get chseq() { return chseq; }, churchDbg: () => ({ t: churchMusic.time, two: churchMusic === churchMusic2, vis: !!church && church.visible, a: churchA, shown: churchShown, phase: approach.phase }), get medChurch() { return medChurch; }, grillDoor: o => grillDoorWorld(o), get churchPewK() { return church && church.userData.pewK.visible; }, churchStage, get FARMLAND() { return FARMLAND; }, get GARDV() { return GARDV; }, gardGate, gateOpen, openGate,
  get levelSelect() { return levelSelect; }, matchTimer, get bumps() { return bumps; }, HOUSES, shopFronts,
  shop,
  startGame: m => startFree(m), newRound: () => startNewRound(),
  get shadowTier() { return shadowTier; },
  get pacing() { return { every, refresh }; },
  /** Pula o fade inicial e deixa o jogo no modo de direção. */
  skipFade() {
    if (title.visible) { title.hide(); if (rig.mode !== 'chase') rig.toggle(); rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 }); }
    fade = 0; if (wsFoot) { wsFoot = false; setState('walk'); } else setState('drive');
  },
  /** Coloca a van parada no ponto de entrega da casa h, virada para leste. */
  placeVanAtDoor(h) { const p = doorPoint(game.slotOf[h]); van.teleport(p.x, p.z, 0); },
  /** Executa n quadros de simulação com passo fixo (útil quando o requestAnimationFrame está parado). */
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { elapsed += dt; update(dt, elapsed); updateHUD(); } if (inMap()) renderer.render(careerMap.scene, careerMap.camera); else if (state === 'extra' && extra.active) renderer.render(extra.scene, extra.camera); else if (insideOn) renderer.render(grillIn.scene, grillIn.camera); else if (state === 'trolley') renderer.render(trolley.scene, trolley.camera); else if (state === 'laser' && fxCine.inSpace) renderer.render(fxCine.scene, fxCine.camera); else if (churchCine.active) churchCine.render(world.scene, rig.camera); else renderer.render(world.scene, rig.camera); },
};
// depois do 4º sino o fundo dos menus já começa no Bairro 24 (na chuva)
menuWorld(); syncNoVan();
