// ADRESS 3D — laço principal e máquina de estados da rodada.
// Este arquivo define como cada módulo é usado (o "contrato" entre eles).
import * as THREE from 'three';
import { Game, ROUTE_LEN } from './logic.js';
import { MAP, doorPoint, slotOrigin, DELIVERY_RADIUS, DELIVERY_MAX_SPEED, VAN, LOT_ANCHORS, SOLIDS, ENTRANCE, HEDGE, GRID, PLAZA, HOUSE_SLOTS, configureGrid, roadCenter, setGasStations, GAS_LIST, GAS_CANOPY, GAS_ISLANDS, GAS_PARTS } from './layout.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createVan } from './van.js';
import { createCameraRig } from './camera.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { buildLot } from './models/house.js';
import { buildResident } from './models/resident.js';
import { YARD_BUILDERS } from './models/yard.js';
import { buildShopLot } from './models/shop.js';
import { SHOPS, HOUSES, FUTS, L1_FIXED, L6_FIXED } from './data.js';
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
import { createTitle } from './title.js';
import { createBarriers } from './barriers.js';
import { createTitleDriver } from './titleDriver.js';
import { createCareerMap } from './careerMap.js';
import { createJamSound } from './jamSound.js';
import { createShop } from './shop.js';
import { createLevelSelect } from './levelSelect.js';
import { createWalker } from './walker.js';
import { createTalkBox, lineDuration } from './talkBox.js';
import { whiten } from './whiteout.js';
import { buildChurch, setChurchOpacity, CHURCH_SOLIDS, CHURCH_CAM } from './models/church.js';
import { createBackButton } from './backButton.js';
import { createMissions, createMissionsButton, MISSIONS } from './missions.js';
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
const hud = createHUD(hudEl, stage);
const game = new Game();
// Bairros (grade em layout.js): 'grid4' (4×4 — Bairros 1 e 3, e o modo Livre), 'plaza6' (6×6 com praça — Bairro 2),
// 'grid5' (5×5 com posto — Bairro 4), 'grid6s' (6×6 com postos e comércio — Bairro 5), 'city6' (6×6 de prédios — Bairro 6),
// 'city7' (a mesma cidade, com 1–2 postos e 4–5 prédios comerciais — Bairro 7), 'city8' (igual ao Bairro 7, porém 8×8 — Bairro 8).
const COMPOSED = ['grid5', 'grid6s', 'city6', 'city7', 'city8'];   // bairros com composição sorteada a cada partida
// Cada um tem sua própria cena, construída só na primeira vez que for jogado.
const POOLS = { grid4: [...Array(16).keys(), ...Object.values(L1_FIXED)],   // grid4: as 16 casas + a casa fixa do Bairro 1 (só aparece nele)
  plaza6: [...Array(32).keys()], grid5: [...Array(25).keys(), ...SHOPS],   // grid5: Bairro 4 (25 casas + prédios comerciais)
  grid6s: [...Array(32).keys(), ...SHOPS],        // grid6s (Bairro 5): 32 casas + os prédios comerciais
  city6: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), Object.values(L6_FIXED)),   // + o prédio fixo da quadra C5   // city6 (Bairro 6): 32 casas + 28 prédios residenciais
  city7: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS),   // city7 (Bairro 7): a cidade com postos e prédios comerciais
  city8: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k), SHOPS, USE_FUTS ? FUTS : []) };   // city8 (Bairro 8): o mesmo, em 8×8, com prédios mais altos (e os futuristas, se USE_FUTS)
// lote de casa ou de prédio comercial
const buildAnyLot = (h, opts) => h.kind === 'shop' ? buildShopLot(h) : h.kind === 'apt' ? buildAptLot(h) : h.kind === 'fut' ? buildFutLot(h) : buildLot(h, opts);
const USE_FUTS = false;                        // prédios futuristas (models/fut.js): guardados, desligados — troque para true para voltarem ao Bairro 8
const TALL_FLOORS = 9;                         // Bairro 8: prédios residenciais mais altos (os outros bairros têm 5 andares)
let world = createWorld({ renderer, buildLot: buildAnyLot, buildResident, yardBuilders: YARD_BUILDERS, pool: POOLS.grid4 });
const worlds = { grid4: world };
let neighborhood = 'grid4';
// Composição sorteada a cada partida:
//   Bairro 4 (5×5): 1 posto (2 lotes vizinhos), 2 prédios comerciais e as 25 casas menos algumas (nunca as com galo/fonte);
//   Bairro 5 (6×6): 1 ou 2 postos (em linhas diferentes), 5 a 8 prédios comerciais e casas sorteadas entre as 32;
//   Bairro 6 (cidade): 28 prédios residenciais + 8 casas sorteadas entre as 32.
function composeRound() {
  const city = neighborhood === 'city6', city7 = neighborhood === 'city7', city8 = neighborhood === 'city8';
  const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // postos (2 lotes vizinhos da mesma linha): Bairro 4 tem 1; Bairro 5, 1 ou 2 (em linhas diferentes); a cidade, nenhum
  const nGas = city ? 0 : neighborhood === 'grid6s' || city7 || city8 ? 1 + Math.floor(Math.random() * 2) : 1;
  const gasList = shuffled([...Array(GRID).keys()]).slice(0, nGas).map(r => {
    const c = Math.floor(Math.random() * (GRID - 1));
    return [r * GRID + c, r * GRID + c + 1];
  });
  setGasStations(gasList);
  SOLIDS.push(...world.extraSolids);                                  // troncos das árvores de fora
  if (gameMode === 'career') {
    ENTRANCE_WALL.x0 = ENTRANCE.x0; ENTRANCE_WALL.x1 = ENTRANCE.x1;
    SOLIDS.push(ENTRANCE_WALL);
  }
  const allHouses = [...Array(32).keys()];
  let pool;
  if (city8) {                                  // Bairro 8 (8×8): como o 7, mas só há 28 prédios residenciais: entram todos e as casas completam os lotes
    const nShops = 4 + Math.floor(Math.random() * 2);
    const apts = [...Array(28).keys()].map(k => 38 + k);
    const futs = USE_FUTS ? FUTS : [];
    pool = apts.concat(futs, shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops - apts.length - futs.length), shuffled(SHOPS).slice(0, nShops));
  } else if (city7) {                           // Bairro 7: 4–5 prédios comerciais, 4 casas e o resto de prédios residenciais
    const nShops = 4 + Math.floor(Math.random() * 2), nHouses = 4;
    const apts = [...Array(28).keys()].map(k => 38 + k);
    pool = shuffled(apts).slice(0, HOUSE_SLOTS.length - nShops - nHouses).concat(shuffled(allHouses).slice(0, nHouses), shuffled(SHOPS).slice(0, nShops));
  } else if (city) {
    const apts = [...Array(28).keys()].map(k => 38 + k);
    const fixed = Object.values(L6_FIXED);                 // Bairro 6: o prédio fixo da quadra C5 + 28 residenciais + casas no resto
    pool = apts.concat(fixed, shuffled(allHouses).slice(0, HOUSE_SLOTS.length - apts.length - fixed.length));
  } else if (neighborhood === 'grid5') {
    // Bairro 4: as 25 casas de sempre menos algumas (nunca as com galo ou fonte), 2 prédios comerciais e o posto
    const keep = [4, 15, 19, 22, 11, 12, 24], base = [...Array(25).keys()], nShops = 2;
    const drop = shuffled(base.filter(h => !keep.includes(h))).slice(0, base.length - (HOUSE_SLOTS.length - nShops));
    pool = base.filter(h => !drop.includes(h)).concat(shuffled(SHOPS).slice(0, nShops));
  } else {
    const nShops = 5 + Math.floor(Math.random() * 4);   // Bairro 5: de 5 a 8 prédios comerciais
    pool = shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops).concat(shuffled(SHOPS).slice(0, nShops));
  }
  game.setNeighborhood(pool, HOUSE_SLOTS, GRID * GRID, city ? L6_FIXED : null);
  world.setLayout(game.layout);
  world.setGas(gasList);
  if (city) showLounger();
  rig.refit();
}

// Bairro 3: barreiras de obra em 3–5 trechos de rua, sorteadas a cada partida (nunca isolam um portão)
const barriers = createBarriers();
function refreshBarriers() {
  const lv = gameMode === 'career' ? careerLevel : freeLevel;   // o Livre também usa o bairro escolhido
  if (lv === 2) barriers.randomize(world.scene, { min: 3, max: 5, types: ['barrier'] });
  else if (lv === 3) barriers.randomize(world.scene, { min: 4, max: 6, types: ['barrier', 'truck', 'hole'] });
  else if (lv === 6 || lv === 7) barriers.randomize(world.scene, { min: 4, max: 6, types: ['truck'], jams: { min: 3, max: 4 } });   // Bairro 7: caminhões + engarrafamentos
  else barriers.clear();
}
/** Casa/prédio sem acesso por causa de um engarrafamento (Bairro 7): nunca entra nas entregas. */
const jamBlocked = h => barriers.jammedSlots.includes(game.slotOf[h]);
function applyJams() { if (barriers.jammedSlots.length) game.newDelivery(game.pool.filter(h => !jamBlocked(h))); }
const van = createVan(world.scene);
const rig = createCameraRig();
world.setLayout(game.layout);
// Dica: seta que cai do céu sobre a casa indicada (uma vez por rodada)
const hint = createHintArrow(world.scene, audio);
let hintUsed = false, hintStep = -1;
const hintBtn = createHintButton(stage, () => requestHint());
// Explosões (entrega errada, opcional no menu) e míssil da van (tecla F; a rodada reinicia)
const boom = createBoom(world.scene, world, audio);
boom.attachHatch(van.object);
const menu = createMenu(stage);
const heli = createHeli(van, audio);        // tecla H: vira helicóptero
// Helicóptero: o topo de cada prédio residencial (Bairro 6) é um chão onde dá para pousar
heli.setGround((x, z) => {
  for (const s of HOUSE_SLOTS) {
    const h = game.layout[s];
    if (h < 0 || !['apt', 'fut'].includes(HOUSES[h].kind) || boom.isDestroyed(h)) continue;
    const o = slotOrigin(s), R = APT_ROOF;
    if (x > o.x + R.x0 + 0.5 && x < o.x + R.x1 - 0.5 && z > o.z + R.z0 + 0.5 && z < o.z + R.z1 - 0.5) return HOUSES[h].kind === 'fut' ? futRoofHeight(HOUSES[h], x - o.x, z - o.z) : aptRoofHeight(HOUSES[h], x - o.x, z - o.z);
  }
  return 0;
});
const walker = createWalker(world.scene);   // tecla L: o motorista desce e anda a pé
const FOOT = { house: [4.1, 13.1, 1.5, 8.5], shop: [3.8, 13.4, 1.5, 8.5], apt: [3.4, 13.8, 1.2, 8.5], fut: [3.4, 13.8, 1.2, 8.5] };   // paredes (locais do lote)
/** Obstáculos de quem anda a pé: tudo menos os lotes inteiros e a praça (dá para entrar nos quintais); só as paredes das casas. */
function walkSolids() {
  const out = SOLIDS.slice(HOUSE_SLOTS.length + (PLAZA ? 1 : 0));   // postos, sebe, troncos, parede da entrada, bloqueios
  for (const s of HOUSE_SLOTS) {
    const h = game.layout[s];
    if (h < 0 || boom.isDestroyed(h)) continue;
    const o = slotOrigin(s), f = FOOT[HOUSES[h].kind] || FOOT.house;
    out.push({ x0: o.x + f[0], x1: o.x + f[1], z0: o.z + f[2], z1: o.z + f[3] });
  }
  return out;
}
const jamSound = createJamSound(audio);     // Bairro 7: música perto dos engarrafamentos (fade-in/out, loop perfeito)
const monster = createMonster(world.scene, stage, audio);   // final secreto: 16 casas destruídas
const allDestroyed = () => game.pool.every(h => boom.isDestroyed(h));

/** Troca o bairro jogado (grade, casas, cena, câmera e obstáculos). Começa uma rodada nova nele. */
/** Bairros 4×4 (1 e 3) e praça: as casas de sempre; só o Bairro 1 tem a casa fixa do canto (L1_FIXED). */
function setupGrid4() {
  const lv = gameMode === 'career' ? careerLevel : freeLevel;
  const l1 = neighborhood === 'grid4' && lv === 0;
  const pool = POOLS[neighborhood].filter(h => l1 || !Object.values(L1_FIXED).includes(h));
  game.setNeighborhood(pool, HOUSE_SLOTS, GRID * GRID, l1 ? L1_FIXED : null);
  world.setLayout(game.layout);
}
function useNeighborhood(kind) {
  if (kind === neighborhood) return;
  boom.reset(); hint.clear(); heli.reset(); monster.reset();
  APT_BUILD.floors = kind === 'city8' ? TALL_FLOORS : 5;   // antes de construir a cena do bairro
  configureGrid(kind);
  let w = worlds[kind];
  if (!w) {                                     // primeira vez: constrói (escondido pelo fade)
    w = worlds[kind] = createWorld({ renderer, buildLot: buildAnyLot, buildResident, yardBuilders: YARD_BUILDERS, pool: POOLS[kind], dry: kind === 'city6' || kind === 'city7' || kind === 'city8' });
  } else SOLIDS.push(...w.extraSolids);        // troncos das árvores de fora deste bairro
  world.hideResident();
  world = w;
  neighborhood = kind;
  world.scene.add(van.object);
  world.scene.add(walker.object); walker.show(false);
  hint.attach(world.scene);
  if (COMPOSED.includes(kind)) composeRound();   // Bairros 4 a 7: composição sorteada a cada partida
  else setupGrid4();
  van.reset();
  rig.refit();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  renderer.compile(world.scene, rig.camera);
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
const title = createTitle({
  onFree: () => { if (state === 'title' && !title.starting) openLevelSelect(); },   // Livre: primeiro escolhe o bairro
  onCareer: () => titleDriver.drive(() => title.fadeOut(enterMap)),     // dá a partida e vai para o mapa da Carreira
  onShop: () => { if (state === 'title') openShop(); },       // Shop: layout inicial (cores grátis; itens em breve)
  onPlay: el => { titleDriver = titleDriver || createTitleDriver(el, audio); titleDriver.start(); },
});
// Shop (painel Jogar): cores da van e do personagem; o resto ainda não está à venda
const shop = createShop();
function openShop() { shop.open(); setState('shop'); }
// Livre: seleção do bairro (todas as miniaturas na tela; setas escolhem, E joga). Depois o helicóptero decola.
const levelSelect = createLevelSelect(l => confirmLevel(l));
function openLevelSelect() { levelSelect.open(freeLevel); setState('levelSelect'); }
function confirmLevel(l) {
  if (state !== 'levelSelect') return;
  freeLevel = l;
  levelSelect.close();
  setState('levelFly');
  titleDriver.fly(() => title.fadeOut(() => startFree('free')));   // vira helicóptero e decola
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
const lock = createLockButton(stage, () => { career.unlockAll(); careerMap.setLocked(l => !career.isUnlocked(l)); }, () => career.allUnlocked);
// botão MISSÕES no canto superior direito durante a partida da Carreira (missões do bairro jogado)
const missionsBtn = createMissionsButton(stage, () => {
  if (gameMode === 'career' && IN_GAME.includes(state) && !missions.isOpen) missions.open(careerLevel);
});
let careerLevel = 0;                     // fase da Carreira sendo jogada
let freeLevel = 0;                       // bairro escolhido no modo Livre
const IN_GAME = ['drive', 'ring', 'dialog', 'missile', 'fuel', 'walk'];
function showPlayPanel() {
  if (rig.mode !== 'overview') rig.toggle();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  fade = 0;
  title.show('play');
  if (titleDriver) { titleDriver.reset(); titleDriver.start(); }
  setState('title');
}
function goBack() {
  if (state === 'title' && title.visible && title.screen === 'play' && !title.starting) {
    if (titleDriver) titleDriver.stop();
    title.show('home');
  } else if (state === 'shop') {
    shop.close();
    setState('title');
  } else if (state === 'levelSelect') {
    levelSelect.close();
    setState('title');
  } else if (state === 'map') {
    missions.close();
    careerMap.leave();
    showPlayPanel();
  } else if (IN_GAME.includes(state)) {
    startNewRound();
    game.delivered = 0;
    if (gameMode === 'career') { careerMap.enter(); careerMap.setLocked(l => !career.isUnlocked(l)); fade = 1; setState('mapIn'); }
    else showPlayPanel();
  }
}

function startFree(mode = 'free') {
  // Bairro 2: 6×6 com praça; Bairro 4: 5×5 com bloqueios; o resto: 4×4
  const lv = mode === 'career' ? careerLevel : freeLevel;
  useNeighborhood(lv === 1 ? 'plaza6' : lv === 3 ? 'grid5' : lv === 4 ? 'grid6s' : lv === 5 ? 'city6' : lv === 6 ? 'city7' : lv === 7 ? 'city8' : 'grid4');
  gameMode = mode;
  if (!COMPOSED.includes(neighborhood)) setupGrid4();   // Bairro 1 tem a casa fixa; o 3 (mesma grade) não
  setupChurch();
  if (mode === 'career') career.startMatch(careerLevel); else career.stop();
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
const setState = s => { state = s; stateT = 0; };

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

function findNearHouse() {
  if (Math.abs(van.speed) > DELIVERY_MAX_SPEED) return -1;
  let best = DELIVERY_RADIUS, found = -1;
  for (const h of game.pool) {
    const p = doorPoint(game.slotOf[h]);
    const d = Math.hypot(van.x - p.x, van.z - p.z);
    if (d < best) { best = d; found = h; }
  }
  return found;
}

function requestHint() {
  if (state !== 'drive' || hintUsed) return;
  hintUsed = true;
  if (gameMode === 'career') career.hint();
  hintStep = game.step;
  const h = game.route[game.step];
  hint.drop(h, game.slotOf[h]);                // a câmera não muda; o jogador segue dirigindo
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
  hint.clear(); hintUsed = false; hintStep = -1;
  actionLock = 0.6;
  setState('drive');
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
    if (van.x > o.x + R.x0 && van.x < o.x + R.x1 && van.z > o.z + R.z0 && van.z < o.z + R.z1) return { s, h, o, y: aptRoofY() };
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
let church = null, churchOn = false, churchT = 0, churchA = 0, churchShown = false;
const churchSolids = [];
function setupChurch() {
  for (const b of churchSolids) { const i = SOLIDS.indexOf(b); if (i >= 0) SOLIDS.splice(i, 1); }
  rig.setExtraBoxes([]);
  churchSolids.length = 0;
  let pd = parcelDone; try { pd = pd || localStorage.getItem(PARCEL_KEY) === '1'; } catch (e) { /* */ }
  churchOn = isL1() && gameMode === 'free' && pd && roofDone();   // as duas conversas, lidas do progresso salvo
  churchT = 0; churchA = 0; churchShown = false;
  if (church && church.parent) church.parent.remove(church);
  if (!churchOn) return;
  if (!church) church = buildChurch();
  church.position.set(MAP_W() / 2, 0, MAP_W() + CHURCH_Z); church.rotation.y = Math.PI;   // fachada virada para o bairro (norte)
  church.visible = false;
  world.scene.add(church);
}
let sunSprite = null; const SUN_OFS = new THREE.Vector3();
function grabSun() { sunSprite = world.scene.getObjectByName('sun'); if (sunSprite) SUN_OFS.set(0, sunSprite.position.y, sunSprite.position.z - MAP / 2); }
const MAP_W = () => MAP;                                // largura do bairro (lado do quadrado, com a sebe)
function updateChurch(dt) {
  if (!churchOn) return;
  const M = MAP_W();
  if (!churchShown) {
    const outside = van.x < 0 || van.x > M || van.z < 0 || van.z > M;
    const southSpeed = Math.sin(van.heading) * van.speed;          // velocidade na direção do sol (+Z)
    if (state === 'drive' && outside && southSpeed > 4 && Math.sin(van.heading) * Math.sign(van.speed) > 0.6) churchT += dt;
    if (churchT >= 5) {
      churchShown = true; church.visible = true; setChurchOpacity(church, 0);
      const z0 = M + CHURCH_Z, cx = M / 2;
      for (const b of CHURCH_SOLIDS) churchSolids.push({ x0: cx - b.x1, x1: cx - b.x0, z0: z0 - b.z1, z1: z0 - b.z0 });   // igreja girada 180°: (x, z) → (cx − x, z0 − z)
      rig.setExtraBoxes(CHURCH_CAM.map(([x0, x1, a, b, top]) => [cx - x1, z0 - b, cx - x0, z0 - a, top]));          // a câmera não atravessa as paredes
      SOLIDS.push(...churchSolids);
    }
  } else if (churchA < 1) {
    churchA = Math.min(1, churchA + dt / 3.5);                       // surge devagar, como através de uma névoa distante
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
  player: { x: -0.6, z: -25.6 },                        // no corredor, na frente e à esquerda dele
  camA: [[-1.5, 2.9, -28.5], [1.6, 1.4, -23.4]],        // jogador de costas em primeiro plano, ele de frente (levemente de lado)
  camB: [[0.9, 2.2, -25.3], [2.3, 1.75, -23.1]],        // perto dele; o jogador já saiu do quadro
  walk: [[0, -24], [0, 3.5], [-1.8, 13]],               // saída: corredor → porta → ao lado da van
  van: [-5, 13],                                        // van estacionada na frente da igreja, virada para o bairro
  outCam: [[7, 3.0, 30], [-1.5, 5, 2]],                 // enquadramento de fora: igreja + van, ele vem na direção da câmera
};
let cine = null;                                        // { phase, t, talkT, total, count, restore, wp, camPos, camLook }
let unwhite = null;
const nearChurchK = () => churchShown && !churchTalkDone() && state === 'walk' && !cine &&
  Math.hypot(walker.x - CL(K_PEW.x, 0, K_PEW.z).x, walker.z - CL(K_PEW.x, 0, K_PEW.z).z) < 3.4;
const ease = x => x * x * (3 - 2 * x);
function setCam(posL, lookL) { cine.camPos.copy(CL(...posL)); cine.camLook.copy(CL(...lookL)); }
function startChurchTalk() {
  const p = CL(CINE.player.x, 0, CINE.player.z), k = CL(K_PEW.x, 0, K_PEW.z);
  walker.pose(p.x, p.z, Math.atan2(k.z - p.z, k.x - p.x));
  van.stop();
  const total = CHURCH_LINES.reduce((t, l) => t + lineDuration(l), 0);
  cine = { phase: 'talk', t: 0, total, count: -1, wp: 0, camPos: new THREE.Vector3(), camLook: new THREE.Vector3() };
  setCam(...CINE.camA);
  setState('cine');
  talkBox.show(CHURCH_LINES, churchTalkEnd, { auto: true, onAdvance: i => {
    if (i !== 6) return;                                // terminou a 6ª fala: começa a contagem para voltar ao bairro
    const rest = CHURCH_LINES.slice(6).reduce((t, l) => t + lineDuration(l), 0);
    let path = 0, prev = CINE.player;
    for (const [x, z] of CINE.walk) { path += Math.hypot(x - prev.x, z - prev.z); prev = { x, z }; }
    cine.count = Math.ceil(rest + 1.8 + path / 6.5 + 1.5 + 3.0 + 1.6 + 8);   // falas + volta da câmera + caminhada + entrar + van + fade + folga
  } });
}
function churchTalkEnd() {                              // última fala lida: grava o progresso; câmera volta ao jogador, já branco
  try { localStorage.setItem(CHURCH_TALK_KEY, '1'); } catch (e) { /* */ }
  unwhite = whiten(walker.object, van.object);
  const v = CL(CINE.van[0], 0, CINE.van[1]);
  van.teleport(v.x, v.z, -Math.PI / 2);                 // virada para o norte (o bairro)
  cine.phase = 'back'; cine.t = 0;
  cine.from = [cine.camPos.clone(), cine.camLook.clone()];
}
function restoreLook() { if (unwhite) { unwhite(); unwhite = null; } }
function churchCineEnd() {                              // de volta ao bairro: cores, câmera e controles normais
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
    talkBox.update(dt);
    walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
    const k = ease(Math.min(1, c.t / (c.total * 0.92)));   // aproxima devagar durante toda a conversa
    c.camPos.copy(CL(...CINE.camA[0])).lerp(CL(...CINE.camB[0]), k);
    c.camLook.copy(CL(...CINE.camA[1])).lerp(CL(...CINE.camB[1]), k);
  } else if (c.phase === 'back') {                      // a câmera volta para o jogador (agora branco)
    const k = ease(Math.min(1, c.t / 1.8));
    c.camPos.copy(c.from[0]).lerp(CL(...CINE.camA[0]), k);
    c.camLook.copy(c.from[1]).lerp(CL(CINE.player.x, 1.3, CINE.player.z), k);
    walker.update(dt, { x: 0, z: 0 }, 'car', [], van);
    if (k >= 1) { c.phase = 'walk'; c.t = 0; c.wp = 0; }
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
    if (c.t > 3.0 && !c.fading) { c.fading = true; talkBox.fadeBlack(1, 800); }
    if (c.t > 3.9) { churchCineEnd(); talkBox.fadeBlack(0, 900); }   // (no tempo do jogo) já no bairro
  }
}
function fadeBlackOff() { talkBox.fadeBlack(0, 300); }

function startNewRound() {
  if (cine || unwhite) { restoreLook(); cine = null; }
  walker.show(false); talkBox.hide(); walker.setFloor(0); roofWalk = null; van.object.visible = true;
  if (COMPOSED.includes(neighborhood)) composeRound(); else game.newRound();
  refreshBarriers();                             // Bairro 3: barreiras em lugares novos
  applyJams();                                   // Bairro 7: as entregas só entre os lotes que a van consegue alcançar
  if (gameMode === 'career') career.startMatch(careerLevel);   // nova partida da Carreira
  hint.clear(); hintUsed = false; hintStep = -1;
  heli.reset();
  monster.reset();
  boom.reset(); restartMsg = null;
  world.setLayout(game.layout);
  world.hideResident();
  van.reset();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  resetParcel(); setupChurch();
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
  if (state !== 'title' && state !== 'levelSelect' && state !== 'levelFly' && state !== 'shop' && input.toggleCamera()) rig.toggle();

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
          van.stop(); nearHouse = -1; nearPump = false;
          walker.placeBesideVan(van, walkSolids()); walker.show(true);
          setState('walk');
          break;
        }
      }
      if (free && input.heli()) heli.toggle();
      van.setGhost(free && (menu.unstoppable || heli.high));
      if (heli.landed) van.stop();                // pousado no teto: parado até decolar (H)
      van.update(dt, heli.landed ? { x: 0, z: 0 } : input.axis(), rig.mode === 'chase' ? 'car' : 'screen');
      if (heli.on && rig.mode === 'chase') {      // no ar, A/D giram mesmo parado
        const ax = input.axis().x;
        if (ax) van.turn(ax * 2.2 * dt * (1 - Math.min(1, Math.abs(van.speed) / 5)));
      }
      if (free && menu.unstoppable && !heli.flying) wreck(dt);
      nearHouse = heli.flying ? -1 : findNearHouse();
      if (gameMode === 'career') career.tick(van.x, van.z, van.heading);   // ruas, entradas e esquinas (missões)
      if (input.hint()) requestHint();
      if (free && input.fire()) { van.stop(); nearHouse = -1; boom.fire(van, game.slotOf); setState('missile'); break; }
      actionLock = Math.max(0, actionLock - dt);
      nearPump = nearHouse < 0 && !heli.flying && atPump();
      if (nearPump && actionLock <= 0 && input.action()) {          // abastecer: não é uma entrega
        nearPump = false; fuelArmed = false;
        van.stop(); audio.fuel();
        if (gameMode === 'career') career.refuel();
        setState('fuel');
        break;
      }
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
        if (gameMode === 'career') career.visit(pending, dialog.success, indicated, stepBefore, game);
        if (!dialog.narrator) world.showResident(pending, dialog.success ? 'happy' : 'angry');
        dialog.success ? audio.success() : dialog.narrator ? null : audio.grumble();
        setState('dialog');
      }
      break;
    case 'dialog':
      if ((stateT > 0.25 && input.action()) || (dialog.success && stateT > SUCCESS_AUTO)) {
        if (dialog.success && gameMode === 'free') nextDelivery();
        else if (dialog.success) setState('fadeOut');
        else {
          const visited = dialog.h;
          dialog = null; world.hideResident(); setState('drive'); actionLock = 0.6;
          // casa errada explode (se habilitado), menos as que ainda fazem parte da rota desta rodada
          const idx = game.route.indexOf(visited);
          if (gameMode === 'free' && menu.explodeWrong && (idx < 0 || idx < game.step)) boom.explode(visited, game.slotOf[visited]);
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
    case 'fadeOut':
      fade = Math.min(1, stateT / FADE_TIME);
      if (fade >= 1) { startNewRound(); setState('fadeIn'); }
      break;
    case 'walk': {                                  // a pé: sem entregas, sem abastecer; E perto da van volta a dirigir
      if (missions.isOpen) { if (input.missions()) missions.close(); break; }
      if (gameMode === 'career' && input.missions()) { missions.open(careerLevel); break; }
      van.stop();
      walker.update(dt, input.axis(), rig.mode === 'chase' ? 'car' : 'screen', roofWalk ? roofSolids() : walkSolids(), van);
      if (carrying) {                               // caixa nas mãos, na frente do peito
        const hc = Math.cos(walker.heading), hs = Math.sin(walker.heading);
        parcel.position.set(walker.x + hc * 0.62, 0.62, walker.z + hs * 0.62); parcel.rotation.set(0, -walker.heading, 0);
      }
      actionLock = Math.max(0, actionLock - dt);
      if (actionLock > 0 || !input.action()) break;
      if (nearLounger()) startRoofTalk();             // no terraço a van fica perto: falar com ele tem prioridade
      else if (walker.nearVan(van)) { if (carrying) resetParcel(); walker.show(false); walker.setFloor(0); roofWalk = null; actionLock = 0.5; setState('drive'); }   // a caixa volta ao lugar
      else if (nearParcel()) carrying = true;
      else if (nearK()) startTalk();
      else if (nearChurchK()) startChurchTalk();
      break;
    }
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
    case 'levelSelect': {
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
      if (fade <= 0) setState('drive');
      break;
  }

  if (state !== 'drive') van.relax(dt);          // torre de caixas do bagageiro: para de balançar quando a van não está sendo dirigida
  world.update(t, dt);
  updateChurch(dt);
  world.updateGas(van.x, van.z, dt);
  fuelMsgT = Math.max(0, fuelMsgT - dt);
  if ((state === 'drive' || state === 'missile') && allDestroyed()) startBoss();
  hint.update(dt);
  heli.update(dt, state === 'drive' && heli.on ? input.lift() : 0);
  boom.update(dt);
  { const foot = state === 'walk';              // quem está perto: a van ou, a pé, o personagem
    jamSound.update(dt, IN_GAME.includes(state) && [6, 7].includes(gameMode === 'career' ? careerLevel : freeLevel) && !missions.isOpen,
      barriers.jamRects, foot ? walker.x : van.x, foot ? walker.z : van.z); }
  // entregando (campainha/diálogo) ou com o balão "E — Entregar" à vista: a câmera se volta para a casa
  const focusH = (state === 'ring' || state === 'dialog') ? pending : state === 'drive' ? nearHouse : -1;
  const onFoot = state === 'walk';              // a câmera segue o personagem a pé
  rig.update(dt, onFoot ? { x: walker.x, z: walker.z, y: walker.floor, heading: walker.heading, speed: walker.speed, focus: null } : { x: van.x, z: van.z, y: heli.altitude, heading: van.heading, speed: van.speed, focus: null });   // sem câmera automática: quem controla é o jogador
  if (state === 'talk') { rig.camera.position.copy(talkCam.pos); rig.camera.lookAt(talkCam.look); }   // enquadramento fixo da conversa
  if (state === 'cine' && cine) { rig.camera.position.copy(cine.camPos); rig.camera.lookAt(cine.camLook); }
  // névoa só na câmera atrás da van (suaviza o horizonte); a visão geral fica nítida
  const fb = rig.blend, fog = world.scene.fog;
  if (fog) { fog.near = 3000 + (130 - 3000) * fb; fog.far = 3200 + (430 - 3200) * fb; }
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
  else audio.engine(state === 'drive', Math.abs(van.speed) / van.maxSpeed);
  input.endFrame();
}

// ---------- HUD ----------
const promptPos = new THREE.Vector3();
function updateHUD() {
  back.set(state === 'levelSelect' || state === 'shop' || (state === 'title' && title.visible && title.screen === 'play' && !title.starting) || (state === 'map' && !missions.isOpen) || (IN_GAME.includes(state) && !missions.isOpen));
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
  hintBtn.set(hintUsed ? 'used' : state === 'drive' ? 'ready' : 'busy');

  if (state === 'dialog') {
    hud.setSub(dialog.success ? '✔ Entrega concluída!  ·  [E] continuar' : '[E] ou Espaço: continuar',
      dialog.success ? 'success' : 'cont');
    hud.setMain(dialog.narrator ? dialog.text : `${dialog.name}: “${dialog.text}”`, dialog.success ? 'success' : 'dialog');   // narrador: só o pensamento, entre parênteses
  } else {
    const extraKeys0 = '  ·  L: descer da van';
    const extraKeys = extraKeys0 + (gameMode === 'free' ? '  ·  H: helicóptero  ·  F: míssil' : '  ·  M: missões');
    hud.setSub(state === 'talk' || state === 'cine' ? '' : state === 'walk'
      ? (rig.mode === 'chase' ? 'A PÉ  ·  W/S: andar  ·  A/D: virar  ·  E (perto da van): entrar  ·  C: bairro  ·  botão direito: olhar em volta' : 'A PÉ  ·  WASD: andar  ·  E (perto da van): entrar  ·  C: câmera')
      : heli.landed
      ? 'POUSADO NO PRÉDIO  ·  H: decolar  ·  F: míssil'
      : heli.on
      ? 'HELICÓPTERO  ·  W/S: frente e ré  ·  A/D: girar  ·  Espaço: subir  ·  Shift: descer  ·  H: pousar (em cima de um prédio, pousa no teto)  ·  F: míssil'
      : rig.mode === 'chase'
      ? 'W / ↑: acelerar  ·  S / ↓: frear e ré  ·  A D / ← →: virar  ·  E: entregar  ·  C: bairro  ·  T: dica' + extraKeys
      : 'WASD / Setas: dirigir  ·  E: entregar  ·  C: câmera  ·  T: dica' + extraKeys, 'muted');
    if (state === 'drive' && hint.active && !hint.landed) hud.setMain('Olha a dica caindo do céu!', 'ring');
    else if (state === 'ring') hud.setMain('Ding-dong… 🔔', 'ring');
    else if (state === 'boss') hud.setMain(monster.phase === 'driveOut' ? 'Todas as casas foram destruídas… algo despertou!' : 'O DEVORADOR DE BAIRROS acordou!', 'dialog');
    else if (state === 'missile') hud.setMain('Míssil disparado!', 'ring');
    else if (state === 'fuel') hud.setMain('⛽ Abastecendo… glub, glub, glub…', 'ring');
    else if (state === 'talk' || state === 'cine') hud.setMain('', 'clue');
    else if (state === 'walk' && carrying) hud.setMain(walker.nearVan(van) ? 'Entrar na van devolve a caixa ao lugar dela.' : 'Carregando uma caixa… de quem será?', 'clue');
    else if (state === 'walk') hud.setMain(walker.nearVan(van) && !nearLounger() ? 'Perto da van — aperte E para entrar.' : 'Passeando a pé… (não dá para entregar andando)', 'clue');
    else if (state === 'drive' && fuelMsgT > 0) hud.setMain(fuelMsg, 'dialog');
    else if (state === 'fadeOut') hud.setMain(restartMsg || 'Entrega concluída! Preparando a próxima…', restartMsg ? 'dialog' : 'success');
    else hud.setMain(game.mainText(), 'clue');
  }

  const walkNear = state === 'walk' && walker.nearVan(van) && !nearLounger() && !missions.isOpen;
  // a pé no Bairro 1: pegar a caixa / entregar ao K / conversar (balão em cima do personagem)
  const walkAct = state === 'walk' && !walkNear && !missions.isOpen ? (nearParcel() ? 'Pegar a caixa' : nearK() ? (carrying ? 'Entregar a caixa' : 'Conversar') : nearLounger() || nearChurchK() ? 'Conversar' : '') : '';
  if (walkAct) {
    rig.camera.updateMatrixWorld();
    promptPos.set(walker.x, walker.floor + 2.7, walker.z).project(rig.camera);
    hud.setPrompt(true, (promptPos.x + 1) / 2 * stage.clientWidth, (1 - promptPos.y) / 2 * stage.clientHeight, 'up', walkAct);
    hud.setFade(fade);
    return;
  }
  const promptLabel = walkNear ? 'Entrar na van' : nearHouse >= 0 ? 'Entregar' : 'Abastecer';
  if ((state === 'drive' && (nearHouse >= 0 || nearPump)) || walkNear) {
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
  if (inMap()) renderer.render(careerMap.scene, careerMap.camera); else renderer.render(world.scene, rig.camera);
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
  get church() { return church; },
  get cine() { return cine; }, startChurchTalk, talkBox,
  get churchState() { return { on: churchOn, t: churchT, a: churchA, shown: churchShown }; },
  get gameMode() { return gameMode; },
  career, missions,
  get careerMap() { return careerMap; },
  get careerLevel() { return careerLevel; },
  setCareerLevel(l) { careerLevel = l; },
  setFreeLevel(l) { freeLevel = l; },
  walker, jamSound,
  get levelSelect() { return levelSelect; },
  shop,
  startGame: m => startFree(m),
  get shadowTier() { return shadowTier; },
  get pacing() { return { every, refresh }; },
  /** Pula o fade inicial e deixa o jogo no modo de direção. */
  skipFade() {
    if (title.visible) { title.hide(); if (rig.mode !== 'chase') rig.toggle(); rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 }); }
    fade = 0; setState('drive');
  },
  /** Coloca a van parada no ponto de entrega da casa h, virada para leste. */
  placeVanAtDoor(h) { const p = doorPoint(game.slotOf[h]); van.teleport(p.x, p.z, 0); },
  /** Executa n quadros de simulação com passo fixo (útil quando o requestAnimationFrame está parado). */
  step(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { elapsed += dt; update(dt, elapsed); updateHUD(); } if (inMap()) renderer.render(careerMap.scene, careerMap.camera); else renderer.render(world.scene, rig.camera); },
};
