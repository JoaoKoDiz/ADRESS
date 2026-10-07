// ADRESS 3D — laço principal e máquina de estados da rodada.
// Este arquivo define como cada módulo é usado (o "contrato" entre eles).
import * as THREE from 'three';
import { Game, ROUTE_LEN } from './logic.js';
import { doorPoint, slotOrigin, DELIVERY_RADIUS, DELIVERY_MAX_SPEED, VAN, LOT_ANCHORS, SOLIDS, ENTRANCE, HEDGE, GRID, PLAZA, HOUSE_SLOTS, configureGrid, setGasStations, GAS_LIST, GAS_CANOPY, GAS_ISLANDS, GAS_PARTS } from './layout.js';
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
import { SHOPS } from './data.js';
import { buildAptLot } from './models/apt.js';
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
// 'grid5' (5×5 com posto — Bairro 4), 'grid6s' (6×6 com postos e comércio — Bairro 5), 'city6' (6×6 de prédios — Bairro 6).
// Cada um tem sua própria cena, construída só na primeira vez que for jogado.
const POOLS = { grid4: [...Array(16).keys()], plaza6: [...Array(32).keys()], grid5: [...Array(25).keys(), ...SHOPS],   // grid5: Bairro 4 (25 casas + prédios comerciais)
  grid6s: [...Array(32).keys(), ...SHOPS],        // grid6s (Bairro 5): 32 casas + os prédios comerciais
  city6: [...Array(32).keys()].concat([...Array(28).keys()].map(k => 38 + k)) };   // city6 (Bairro 6): 32 casas + 28 prédios residenciais
// lote de casa ou de prédio comercial
const buildAnyLot = (h, opts) => h.kind === 'shop' ? buildShopLot(h) : h.kind === 'apt' ? buildAptLot(h) : buildLot(h, opts);
let world = createWorld({ renderer, buildLot: buildAnyLot, buildResident, yardBuilders: YARD_BUILDERS, pool: POOLS.grid4 });
const worlds = { grid4: world };
let neighborhood = 'grid4';
// Composição sorteada a cada partida:
//   Bairro 4 (5×5): 1 posto (2 lotes vizinhos), 2 prédios comerciais e as 25 casas menos algumas (nunca as com galo/fonte);
//   Bairro 5 (6×6): 1 ou 2 postos (em linhas diferentes), 5 a 8 prédios comerciais e casas sorteadas entre as 32;
//   Bairro 6 (cidade): 28 prédios residenciais + 8 casas sorteadas entre as 32.
function composeRound() {
  const city = neighborhood === 'city6';
  const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // postos (2 lotes vizinhos da mesma linha): Bairro 4 tem 1; Bairro 5, 1 ou 2 (em linhas diferentes); a cidade, nenhum
  const nGas = city ? 0 : neighborhood === 'grid6s' ? 1 + Math.floor(Math.random() * 2) : 1;
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
  if (city) {
    const apts = [...Array(28).keys()].map(k => 38 + k);
    pool = apts.concat(shuffled(allHouses).slice(0, HOUSE_SLOTS.length - apts.length));
  } else if (neighborhood === 'grid5') {
    // Bairro 4: as 25 casas de sempre menos algumas (nunca as com galo ou fonte), 2 prédios comerciais e o posto
    const keep = [4, 15, 19, 22, 11, 12, 24], base = [...Array(25).keys()], nShops = 2;
    const drop = shuffled(base.filter(h => !keep.includes(h))).slice(0, base.length - (HOUSE_SLOTS.length - nShops));
    pool = base.filter(h => !drop.includes(h)).concat(shuffled(SHOPS).slice(0, nShops));
  } else {
    const nShops = 5 + Math.floor(Math.random() * 4);   // Bairro 5: de 5 a 8 prédios comerciais
    pool = shuffled(allHouses).slice(0, HOUSE_SLOTS.length - nShops).concat(shuffled(SHOPS).slice(0, nShops));
  }
  game.setNeighborhood(pool, HOUSE_SLOTS, GRID * GRID);
  world.setLayout(game.layout);
  world.setGas(gasList);
  rig.refit();
}

// Bairro 3: barreiras de obra em 3–5 trechos de rua, sorteadas a cada partida (nunca isolam um portão)
const barriers = createBarriers();
function refreshBarriers() {
  if (gameMode === 'career' && careerLevel === 2) barriers.randomize(world.scene, { min: 3, max: 5, types: ['barrier'] });
  else if (gameMode === 'career' && careerLevel === 3) barriers.randomize(world.scene, { min: 4, max: 6, types: ['barrier', 'truck', 'hole'] });
  else barriers.clear();
}
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
const monster = createMonster(world.scene, stage, audio);   // final secreto: 16 casas destruídas
const allDestroyed = () => game.pool.every(h => boom.isDestroyed(h));

/** Troca o bairro jogado (grade, casas, cena, câmera e obstáculos). Começa uma rodada nova nele. */
function useNeighborhood(kind) {
  if (kind === neighborhood) return;
  boom.reset(); hint.clear(); heli.reset(); monster.reset();
  configureGrid(kind);
  let w = worlds[kind];
  if (!w) {                                     // primeira vez: constrói (escondido pelo fade)
    w = worlds[kind] = createWorld({ renderer, buildLot: buildAnyLot, buildResident, yardBuilders: YARD_BUILDERS, pool: POOLS[kind], dry: kind === 'city6' });
  } else SOLIDS.push(...w.extraSolids);        // troncos das árvores de fora deste bairro
  world.hideResident();
  world = w;
  neighborhood = kind;
  world.scene.add(van.object);
  hint.attach(world.scene);
  if (kind === 'grid5' || kind === 'grid6s' || kind === 'city6') composeRound();   // Bairros 4, 5 e 6: composição sorteada a cada partida
  else {
    game.setNeighborhood(POOLS[kind], HOUSE_SLOTS, GRID * GRID);
    world.setLayout(game.layout);
  }
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
  onFree: () => titleDriver.fly(() => title.fadeOut(() => startFree('free'))),   // vira helicóptero e decola
  onCareer: () => titleDriver.drive(() => title.fadeOut(enterMap)),     // dá a partida e vai para o mapa da Carreira
  onPlay: el => { titleDriver = titleDriver || createTitleDriver(el, audio); titleDriver.start(); },
});
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
const IN_GAME = ['drive', 'ring', 'dialog', 'missile', 'fuel'];
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
  useNeighborhood(mode !== 'career' ? 'grid4' : careerLevel === 1 ? 'plaza6' : careerLevel === 3 ? 'grid5' : careerLevel === 4 ? 'grid6s' : careerLevel === 5 ? 'city6' : 'grid4');
  gameMode = mode;
  if (mode === 'career') career.startMatch(careerLevel); else career.stop();
  ENTRANCE_WALL.x0 = ENTRANCE.x0; ENTRANCE_WALL.x1 = ENTRANCE.x1;   // a entrada depende do bairro
  const w = SOLIDS.indexOf(ENTRANCE_WALL);
  if (mode === 'career' && w < 0) SOLIDS.push(ENTRANCE_WALL);
  if (mode !== 'career' && w >= 0) SOLIDS.splice(w, 1);
  refreshBarriers();
  if (titleDriver) titleDriver.stop();
  title.hide();
  if (rig.mode !== 'chase') rig.toggle();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
  fade = 1;
  setState('fadeIn');
}

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
  const available = game.pool.filter(h => !boom.isDestroyed(h));
  if (available.length < ROUTE_LEN) { setState('fadeOut'); return; }   // poucas casas de pé: recomeça o bairro
  game.newDelivery(available);
  hint.clear(); hintUsed = false; hintStep = -1;
  actionLock = 0.6;
  setState('drive');
}

function startNewRound() {
  if (neighborhood === 'grid5' || neighborhood === 'grid6s' || neighborhood === 'city6') composeRound(); else game.newRound();
  refreshBarriers();                             // Bairro 3: barreiras em lugares novos
  if (gameMode === 'career') career.startMatch(careerLevel);   // nova partida da Carreira
  hint.clear(); hintUsed = false; hintStep = -1;
  heli.reset();
  monster.reset();
  boom.reset(); restartMsg = null;
  world.setLayout(game.layout);
  world.hideResident();
  van.reset();
  rig.snap({ x: van.x, z: van.z, heading: van.heading, speed: 0 });
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
  if (state !== 'title' && input.toggleCamera()) rig.toggle();

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
      if (free && input.heli()) heli.toggle();
      van.setGhost(free && (menu.unstoppable || heli.high));
      van.update(dt, input.axis(), rig.mode === 'chase' ? 'car' : 'screen');
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
      if (stateT > RESIDENT_APPEAR) world.showResident(pending, 'angry');
      if (stateT > RING_TIME) {
        const stepBefore = game.step, indicated = game.route[game.step] === pending;
        dialog = game.visit(pending);
        if (gameMode === 'career') career.visit(pending, dialog.success, indicated, stepBefore, game);
        world.showResident(pending, dialog.success ? 'happy' : 'angry');
        dialog.success ? audio.success() : audio.grumble();
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

  world.update(t, dt);
  world.updateGas(van.x, van.z, dt);
  fuelMsgT = Math.max(0, fuelMsgT - dt);
  if ((state === 'drive' || state === 'missile') && allDestroyed()) startBoss();
  hint.update(dt);
  heli.update(dt, state === 'drive' && heli.on ? input.lift() : 0);
  boom.update(dt);
  // entregando (campainha/diálogo) ou com o balão "E — Entregar" à vista: a câmera se volta para a casa
  const focusH = (state === 'ring' || state === 'dialog') ? pending : state === 'drive' ? nearHouse : -1;
  rig.update(dt, { x: van.x, z: van.z, y: heli.altitude, heading: van.heading, speed: van.speed, focus: focusH >= 0 ? focusOf(focusH) : null });
  // névoa só na câmera atrás da van (suaviza o horizonte); a visão geral fica nítida
  const fb = rig.blend, fog = world.scene.fog;
  if (fog) { fog.near = 3000 + (130 - 3000) * fb; fog.far = 3200 + (430 - 3200) * fb; }
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
  back.set((state === 'title' && title.visible && title.screen === 'play' && !title.starting) || (state === 'map' && !missions.isOpen) || (IN_GAME.includes(state) && !missions.isOpen));
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
    hud.setMain(`${dialog.name}: “${dialog.text}”`, dialog.success ? 'success' : 'dialog');
  } else {
    const extraKeys = gameMode === 'free' ? '  ·  H: helicóptero  ·  F: míssil' : '  ·  M: missões';
    hud.setSub(heli.on
      ? 'HELICÓPTERO  ·  W/S: frente e ré  ·  A/D: girar  ·  Espaço: subir  ·  Shift: descer  ·  H: pousar  ·  F: míssil'
      : rig.mode === 'chase'
      ? 'W / ↑: acelerar  ·  S / ↓: frear e ré  ·  A D / ← →: virar  ·  E: entregar  ·  C: bairro  ·  T: dica' + extraKeys
      : 'WASD / Setas: dirigir  ·  E: entregar  ·  C: câmera  ·  T: dica' + extraKeys, 'muted');
    if (state === 'drive' && hint.active && !hint.landed) hud.setMain('Olha a dica caindo do céu!', 'ring');
    else if (state === 'ring') hud.setMain('Ding-dong… 🔔', 'ring');
    else if (state === 'boss') hud.setMain(monster.phase === 'driveOut' ? 'Todas as casas foram destruídas… algo despertou!' : 'O DEVORADOR DE BAIRROS acordou!', 'dialog');
    else if (state === 'missile') hud.setMain('Míssil disparado!', 'ring');
    else if (state === 'fuel') hud.setMain('⛽ Abastecendo… glub, glub, glub…', 'ring');
    else if (state === 'drive' && fuelMsgT > 0) hud.setMain(fuelMsg, 'dialog');
    else if (state === 'fadeOut') hud.setMain(restartMsg || 'Entrega concluída! Preparando a próxima…', restartMsg ? 'dialog' : 'success');
    else hud.setMain(game.mainText(), 'clue');
  }

  const promptLabel = nearHouse >= 0 ? 'Entregar' : 'Abastecer';
  if (state === 'drive' && (nearHouse >= 0 || nearPump)) {
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
  get gameMode() { return gameMode; },
  career, missions,
  get careerMap() { return careerMap; },
  get careerLevel() { return careerLevel; },
  setCareerLevel(l) { careerLevel = l; },
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
