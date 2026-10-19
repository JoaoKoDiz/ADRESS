// Nível 14 (Fluxo): trânsito circulando por toda a rede de ruas. Lógica simples de rotas e prioridade:
//  - carros andam em faixas (mão dupla nas ruas: faixa da direita; avenida: 2 faixas por sentido, mão única por pista);
//  - em cada cruzamento escolhem uma saída permitida (sentido único, canteiro, postos/galpões fecham trechos);
//  - semáforos nos 3 cruzamentos da avenida (avenida × rua), com amarelo e todos vermelhos; fases defasadas;
//  - ruas menores: um carro por vez no cruzamento; na avenida sem semáforo, quem está na avenida tem a preferência;
//  - só entram no cruzamento com espaço na saída (não travam o cruzamento) e trocam de saída se esperarem demais;
//  - distância do carro da frente; param se a van (ou o motorista a pé) estiver na frente;
//  - Fluxo (busy): os carros da avenida ficam nela (seguem reto ou fazem o retorno nos vãos do canteiro e nas pontas), então
//    ela continua movimentada nos dois sentidos sem lotar as ruas; quem espera na rua para entrar/atravessar a avenida sem
//    semáforo ganha a vez (brecha menor e, esperando mais, os carros da avenida param antes do cruzamento); quem entra à
//    direita na avenida vai para a faixa de perto; nos retornos das pontas a fila anda junto (o vão só tem lugar para um).
import * as THREE from 'three';
import { GRID, ROAD, roadCenter, FLUX, CANAL, GAS_LIST, WARE_LIST, SOLIDS, ensureSolid } from './layout.js';
import { buildCar, CAR_COLORS } from './barriers.js';
import { mat, box, cyl, at, bakeStatic, disposeTree } from './models/kit.js';

const hr = ROAD / 2, rc = roadCenter, CAR = 4.6, GAP = 2.2;
const DIRS = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
const REV = { E: 'W', W: 'E', S: 'N', N: 'S' }, RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' };
const PHASES = [['aG', 10], ['aY', 2.5], ['R', 1.2], ['cG', 7], ['cY', 2.5], ['R', 1.2]];
const CYCLE = PHASES.reduce((t, p) => t + p[1], 0);
let glowT = null;
let LIGHT = null;                                                    // faróis (Penumbra): material/geometria únicos para todos os carros
function lightMats() {
  if (!LIGHT) {
    LIGHT = { spr: new THREE.SpriteMaterial({ map: carGlow(), color: '#fff2c8', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }),
      pool: new THREE.MeshBasicMaterial({ map: carGlow(), color: '#fff0c0', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }),
      geo: new THREE.PlaneGeometry(6, 2.6) };
    LIGHT.spr.userData.keep = LIGHT.pool.userData.keep = LIGHT.geo.userData.keep = true;
  }
  return LIGHT;
}
function carGlow() {
  if (glowT) return glowT;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); glowT = new THREE.CanvasTexture(c); glowT.colorSpace = THREE.SRGBColorSpace; return glowT;
}

// Variedade no trânsito (mesmo tamanho de carro: as filas e as colisões não mudam): táxi com luminoso no teto, furgão de
// entregas (baú alto, sem janelas atrás) e picape com a caçamba carregada, entre os carros comuns.
let taxiTex = null, taxiMat = null;
function buildVehicle() {
  const r = Math.random();
  const kind = r < 0.14 ? 'taxi' : r < 0.26 ? 'van' : r < 0.34 ? 'pickup' : 'car';
  if (kind === 'car') return { mesh: buildCar(), color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] };
  const g = new THREE.Group();
  if (kind === 'van') {                                                  // furgão: baú alto na cor da carroceria, cabine com para-brisa
    const body = at(box(4.4, 1.75, 1.95, '#f2f2f2'), -0.1, 1.3, 0); g.add(body); g.userData.body = body;
    g.add(at(box(0.08, 0.75, 1.6, '#2b4a6e'), 2.13, 1.7, 0));                                   // para-brisa
    for (const zz of [0.99, -0.99]) g.add(at(box(0.9, 0.6, 0.04, '#2b4a6e'), 1.45, 1.7, zz));   // janelas da cabine
    g.add(at(box(0.3, 0.3, 2.0, '#2e3036'), 2.25, 0.55, 0));                                    // para-choque
    for (const x of [-1.4, 1.4]) for (const zz of [0.95, -0.95]) g.add(at(cyl(0.42, 0.42, 0.3, '#1f2023', 10), x, 0.42, zz, Math.PI / 2, 0, 0));
    const brake = mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.1 }), head = mat('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.4 });
    for (const zz of [0.7, -0.7]) { g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), brake), -2.32, 0.95, zz)); g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.4), head), 2.15, 0.95, zz)); }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const cols = ['#f2f2f2', '#f2f2f2', '#3a78d4', '#d8473a', '#efbf2a', '#8f959c'];
    return { mesh: g, color: cols[Math.floor(Math.random() * cols.length)] };
  }
  if (kind === 'taxi') {
    const car = buildCar();                                                 // táxi: amarelo, faixa xadrez e luminoso no teto
    if (!taxiTex) { const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#ffe9a0'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#1b1b1b'; x.font = 'bold 24px "Trebuchet MS", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('TÁXI', 64, 17); taxiTex = new THREE.CanvasTexture(c); taxiTex.colorSpace = THREE.SRGBColorSpace; }
    if (!taxiMat) { taxiMat = new THREE.MeshStandardMaterial({ map: taxiTex, emissive: '#ffd060', emissiveMap: taxiTex, emissiveIntensity: 0.5, roughness: 0.6 }); taxiMat.userData.keep = true; }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.8), taxiMat);   // (um material só: uma chamada de desenho por táxi)
    sign.rotation.y = Math.PI / 2; sign.position.set(-0.3, 2.28, 0); car.add(sign);
    for (const zz of [0.955, -0.955]) for (let k = 0; k < 8; k++) car.add(at(box(0.27, 0.12, 0.02, k % 2 ? '#1b1b1b' : '#f2f2f2'), -1.9 + k * 0.54, 0.95, zz));   // faixa xadrez
    return { mesh: car, color: '#efbf2a' };
  }
  // picape: cabine curta na frente e caçamba aberta atrás, com a carga coberta por uma lona
  const pk = new THREE.Group();
  const body = at(box(4.4, 0.9, 1.9, '#d8473a'), 0, 0.85, 0); pk.add(body); pk.userData.body = body;
  pk.add(at(box(1.6, 0.8, 1.7, '#dfe6ee'), 0.55, 1.68, 0)); pk.add(at(box(1.45, 0.08, 1.6, '#7b828c'), 0.55, 2.12, 0));   // cabine e teto
  for (const zz of [0.9, -0.9]) pk.add(at(box(2.1, 0.42, 0.08, '#3a3d44'), -1.15, 1.5, zz));                              // laterais da caçamba
  pk.add(at(box(0.08, 0.42, 1.88, '#3a3d44'), -2.17, 1.5, 0));
  pk.add(at(box(1.5, 0.45, 1.5, ['#6b8a4a', '#8a6a48', '#4a6b8a'][Math.floor(Math.random() * 3)]), -1.15, 1.5, 0, 0, 0.04, 0));   // carga com lona
  for (const x of [-1.4, 1.4]) for (const zz of [0.95, -0.95]) pk.add(at(cyl(0.42, 0.42, 0.3, '#1f2023', 10), x, 0.42, zz, Math.PI / 2, 0, 0));
  const brake = mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.1 }), head = mat('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.4 });
  for (const zz of [0.7, -0.7]) { pk.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), brake), -2.2, 0.95, zz)); pk.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.4), head), 2.2, 0.95, zz)); }
  pk.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { mesh: pk, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] };
}

export function createTraffic(audio) {
  const root = new THREE.Group(); root.name = 'traffic';
  let cars = [], lanes = new Map(), nodes = [], blockedV = new Set(), lights = [], t = 0, built = false;
  let busy = false;   // Fluxo: avenida movimentada (carros que ficam nela + regras de vez para quem vem da rua); o Penumbra e a Cachoeira não usam
  const W = () => (FLUX ? FLUX.widen : 0);   // (Nível 23 usa a mesma lógica sem avenida: ruas de mão dupla e o desfiladeiro só se cruza pela ponte)
  const isLight = (i, j) => !!FLUX && (i === FLUX.north || i === FLUX.south) && FLUX.lights.includes(j);
  const isAve = i => !!FLUX && (i === FLUX.north || i === FLUX.south);
  // caixa do cruzamento (na avenida, a pista é mais larga para dentro do canteiro)
  const box2 = (i, j) => ({ x0: rc(j) - hr, x1: rc(j) + hr, z0: rc(i) - hr - (isAve(i) && i === FLUX.south ? W() : 0), z1: rc(i) + hr + (isAve(i) && i === FLUX.north ? W() : 0) });
  const node = (i, j) => nodes[i * (GRID + 1) + j];
  // existe o trecho saindo de (i, j) no sentido d?
  function edgeOk(i, j, d) {
    const [dx, dz] = DIRS[d], i2 = i + dz, j2 = j + dx;
    if (i2 < 0 || j2 < 0 || i2 > GRID || j2 > GRID) return false;
    if (CANAL && dz === 0 && CANAL.cols.includes(Math.min(j, j2)) && !CANAL.bridges.includes(i)) return false;   // desfiladeiro: só pela ponte
    if (CANAL && dz !== 0 && j === CANAL.cols[0] + 1) return false;
    if (dz === 0) { if (isAve(i) && i === FLUX.north && d !== 'W') return false; if (isAve(i) && i === FLUX.south && d !== 'E') return false; return true; }
    const k = Math.min(i, i2);                                         // trecho vertical da coluna j entre as ruas k e k+1
    if (FLUX && k === FLUX.row && !FLUX.gaps.includes(j)) return false;
    return !blockedV.has(j + ',' + k);
  }
  // faixas (coordenada perpendicular) de um trecho saindo de (i, j) no sentido d
  function laneCoords(i, j, d) {
    if (d === 'E') return isAve(i) && i === FLUX.south ? [rc(i) + 0.9, rc(i) - 4.9] : [rc(i) + 1.9];
    if (d === 'W') return isAve(i) && i === FLUX.north ? [rc(i) - 0.9, rc(i) + 4.9] : [rc(i) - 1.9];
    if (d === 'S') return [rc(j) - 1.9];
    return [rc(j) + 1.9];
  }
  const laneKey = (i, j, d, k) => i + ',' + j + ',' + d + ',' + k;
  /** Trecho de faixa: de (i, j) no sentido d, faixa k → início e fim (nas bordas dos cruzamentos). */
  function makeLane(i, j, d, k) {
    const key = laneKey(i, j, d, k);
    if (lanes.has(key)) return lanes.get(key);
    const [dx, dz] = DIRS[d], A = box2(i, j), B = box2(i + dz, j + dx), p = laneCoords(i, j, d)[k];
    let a, b;
    if (d === 'E') { a = { x: A.x1, z: p }; b = { x: B.x0, z: p }; }
    else if (d === 'W') { a = { x: A.x0, z: p }; b = { x: B.x1, z: p }; }
    else if (d === 'S') { a = { x: p, z: A.z1 }; b = { x: p, z: B.z0 }; }
    else { a = { x: p, z: A.z0 }; b = { x: p, z: B.z1 }; }
    b = { x: b.x - dx * CAR / 2, z: b.z - dz * CAR / 2 };              // (posições do centro do carro: para com a frente na faixa de retenção)
    const L = { key, i, j, d, k, a, b, len: Math.hypot(b.x - a.x, b.z - a.z), to: [i + dz, j + dx], cars: [], ave: dz === 0 && isAve(i) };
    lanes.set(key, L);
    return L;
  }
  /** Saídas possíveis ao chegar em (i, j) vindo no sentido d (sem meia-volta, a não ser que não haja outra). */
  function exits(i, j, d) {
    let out = Object.keys(DIRS).filter(e => e !== REV[d] && edgeOk(i, j, e));
    if (!out.length && edgeOk(i, j, REV[d])) out = [REV[d]];
    return out;
  }
  // saída que continua na avenida: a pista (no sentido dela) ou o vão do canteiro (retorno para a outra pista)
  const gapLane = L => !!FLUX && ((L.d === 'S' && L.i === FLUX.north) || (L.d === 'N' && L.i === FLUX.south));   // vão do canteiro
  const aveNet = (i, e) => (e === 'E' || e === 'W') ? isAve(i) : !!FLUX && ((i === FLUX.north && e === 'S') || (i === FLUX.south && e === 'N'));
  function pickExit(car, L) {
    const [i, j] = L.to; let opts = exits(i, j, L.d);
    if (!opts.length) return null;
    const stay = car.stay && opts.filter(e => aveNet(i, e));             // carro da avenida (Fluxo): não sai para as ruas
    if (stay && stay.length) opts = stay;
    if (L.ave && !(stay && stay.length && !stay.includes(L.d))) {        // avenida: direita só da faixa da direita, esquerda só da esquerda
      const f = opts.filter(e => e === L.d || (e === RIGHT[L.d] ? L.k === 0 : L.k === 1));   // (nas pontas, o retorno vale das duas faixas)
      if (f.length) opts = f;
    }
    const w = opts.map(e => (e === L.d ? (L.ave ? (car.stay ? 7 : 3.2) : 1.6) : 1) * (car.avoid === e ? 0.05 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0), e = opts[0];
    for (let n = 0; n < opts.length; n++) { r -= w[n]; if (r <= 0) { e = opts[n]; break; } }
    const nl = laneCoords(i, j, e).map((_, k) => makeLane(i, j, e, k));
    if (L.ave && e === L.d && nl[L.k]) return nl[L.k];                  // reto na avenida: continua na mesma faixa
    if (busy && !L.ave && nl[0].ave && e === RIGHT[L.d]) return nl[0];  // da rua para a avenida, à direita: faixa de perto
    // na avenida, a faixa com mais espaço no começo
    const lane = nl.reduce((best, x) => (room(x) > room(best) ? x : best), nl[Math.floor(Math.random() * nl.length)]);
    return lane;
  }
  const room = L => { let m = L.len + CAR; for (const c of L.cars) m = Math.min(m, c.s); for (const c of cars) if (c.turn && c.next === L) m = Math.min(m, -1); return m; };
  // fase do semáforo do cruzamento j (defasada por cruzamento)
  const phaseAt = j => { let x = (t + j * 5.3) % CYCLE; for (const [p, d] of PHASES) { if (x < d) return p; x -= d; } return 'R'; };
  function canEnter(car, L, next) {
    const [i, j] = L.to, n = node(i, j), horiz = L.d === 'E' || L.d === 'W';
    const lead = next.cars[0], rolling = busy && gapLane(next) && !FLUX.lights.includes(next.j) && next.cars.length === 1 && lead.v > 2.5 && lead.s > CAR;
    if (room(next) < CAR + GAP + 0.6 && !rolling) return false;               // sem espaço na saída: não entra (no retorno das pontas, a fila anda junto)
    if (isLight(i, j)) {
      const ph = phaseAt(j), rem = L.len - car.s;
      const go = horiz ? ph === 'aG' || (ph === 'aY' && rem < 2 && car.v > 4) : ph === 'cG' || (ph === 'cY' && rem < 2 && car.v > 4);
      if (!go) return false;
      return horiz ? ![...n.occ].some(c => !c.horiz) : n.occ.size === 0;
    }
    if (isAve(i)) {                                                      // avenida sem semáforo: preferência de quem está nela
      if (horiz) return ![...n.occ].some(c => !c.horiz) && !(busy && n.vWait && n.vWait !== car && L.len - car.s > car.v * car.v / 16);   // (dá a vez a quem espera na rua, se ainda dá para frear)
      if (n.occ.size) return false;
      // Fluxo: quem já espera na faixa de retenção entra numa brecha menor (o carro da avenida que vem ainda tem distância
      // para frear; parado, ele espera) e, esperando mais, pede a vez: os carros da avenida param antes do cruzamento
      const waited = busy && car.wait > 2.5, near = busy && next.ave && next.k === 0 && next.d === RIGHT[L.d];   // (à direita, para a faixa de perto: só ela conta)
      if (busy && car.wait > 4) n.vWait = car;
      for (const k of near ? [0] : [0, 1]) {
        const din = i === FLUX.north ? 'W' : 'E', from = [i, j + (din === 'W' ? 1 : -1)];
        const AL = lanes.get(laneKey(from[0], from[1], din, k));
        if (AL && AL.cars.some(c => waited ? c.v > 0.5 && AL.len - c.s < 3 + c.v * c.v / 12 + c.v * 0.3 : AL.len - c.s < 16)) return false;
      }
      return true;
    }
    return n.occ.size === 0;                                             // ruas menores: um por vez
  }
  // curva dentro do cruzamento: Bézier quadrática do fim de uma faixa ao começo da outra
  function makeTurn(L, N) {
    const P = L.b, Q = N.a, straight = L.d === N.d;
    const C = straight ? { x: (P.x + Q.x) / 2, z: (P.z + Q.z) / 2 }
      : (L.d === 'E' || L.d === 'W') ? { x: Q.x, z: P.z } : { x: P.x, z: Q.z };
    const at2 = u => ({ x: (1 - u) * (1 - u) * P.x + 2 * u * (1 - u) * C.x + u * u * Q.x, z: (1 - u) * (1 - u) * P.z + 2 * u * (1 - u) * C.z + u * u * Q.z });
    let len = 0, prev = P; for (let k = 1; k <= 12; k++) { const q = at2(k / 12); len += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q; }
    if (L.d === REV[N.d]) {                                              // meia-volta: arco largo
      const mid = { x: (P.x + Q.x) / 2 + DIRS[L.d][0] * 4, z: (P.z + Q.z) / 2 + DIRS[L.d][1] * 4 };
      const f = u => ({ x: (1 - u) * (1 - u) * P.x + 2 * u * (1 - u) * mid.x + u * u * Q.x, z: (1 - u) * (1 - u) * P.z + 2 * u * (1 - u) * mid.z + u * u * Q.z });
      return { at: f, len: len + 6 };
    }
    return { at: at2, len: Math.max(0.5, len) };
  }

  function build() {
    nodes = []; lanes = new Map(); lights.forEach(l => root.remove(l.g)); lights = [];
    for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) nodes.push({ i, j, occ: new Set() });
    blockedV = new Set();
    for (const g of GAS_LIST.concat(WARE_LIST)) { const c = g.slots[0] % GRID, r = Math.floor(g.slots[0] / GRID); blockedV.add((c + 1) + ',' + r); }
    // semáforos: um poste em cada canto dos cruzamentos com sinal (cabeças da avenida e da rua)
    const RED = mat('#ff2a1a', { emissive: '#ff2a1a', emissiveIntensity: 1.4 }), YEL = mat('#ffc21a', { emissive: '#ffc21a', emissiveIntensity: 1.4 }),
      GRN = mat('#22e05a', { emissive: '#22e05a', emissiveIntensity: 1.4 }), OFF = mat('#2a2d33');
    for (const j of FLUX ? FLUX.lights : []) for (const i of [FLUX.north, FLUX.south]) {
      const b = box2(i, j);
      for (const [x, z, axis] of [[b.x0 - 0.6, b.z0 - 0.6, 'a'], [b.x1 + 0.6, b.z1 + 0.6, 'a'], [b.x1 + 0.6, b.z0 - 0.6, 'c'], [b.x0 - 0.6, b.z1 + 0.6, 'c']]) {
        const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
        g.add(at(cyl(0.12, 0.12, 4.2, '#3a3d44', 8), 0, 2.1, 0));
        g.add(at(box(0.5, 1.4, 0.5, '#2a2d33'), 0, 4.6, 0));
        const bulbs = ['R', 'Y', 'G'].map((c, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), OFF); m.position.set(0, 5.05 - k * 0.44, 0); g.add(m); return m; });
        lights.push({ g, j, axis, bulbs });
      }
    }
    lights.mats = { RED, YEL, GRN, OFF };
    built = true;
  }
  function paintLights() {
    const { RED, YEL, GRN, OFF } = lights.mats;
    for (const l of lights) {
      const ph = phaseAt(l.j), mine = l.axis === 'a' ? ph[0] === 'a' : ph[0] === 'c', col = !mine ? 'R' : ph[1] === 'G' ? 'G' : 'Y';
      l.bulbs[0].material = col === 'R' ? RED : OFF; l.bulbs[1].material = col === 'Y' ? YEL : OFF; l.bulbs[2].material = col === 'G' ? GRN : OFF;
    }
  }
  function place(c) {
    let p, dx, dz;
    if (c.turn) { p = c.turn.at(Math.min(1, c.s / c.turn.len)); const q = c.turn.at(Math.min(1, (c.s + 0.3) / c.turn.len)), r0 = c.turn.at(Math.max(0, (c.s - 0.3) / c.turn.len)); dx = q.x - r0.x; dz = q.z - r0.z; }
    else { const L = c.lane, u = c.s / L.len; p = { x: L.a.x + (L.b.x - L.a.x) * u, z: L.a.z + (L.b.z - L.a.z) * u }; dx = L.b.x - L.a.x; dz = L.b.z - L.a.z; }
    c.x = p.x; c.z = p.z; c.hx = dx; c.hz = dz;
    c.mesh.position.set(p.x, 0, p.z); c.mesh.rotation.y = -Math.atan2(dz, dx);
    const l = Math.hypot(dx, dz) || 1, cx = Math.abs(dx / l), cz = Math.abs(dz / l);
    const ex = cx * CAR / 2 + cz * 1.0, ez = cz * CAR / 2 + cx * 1.0;
    Object.assign(c.solid, { x0: p.x - ex, x1: p.x + ex, z0: p.z - ez, z1: p.z + ez });
  }
  // algo (van, motorista a pé) na frente do carro?
  function blockedAhead(c, obs) {
    const l = Math.hypot(c.hx, c.hz) || 1, fx = c.hx / l, fz = c.hz / l;
    for (const o of obs) for (let k = 2.6; k <= 8.6; k += 1.5) {
      const px = c.x + fx * k, pz = c.z + fz * k;
      if (o.circles.some(([x, z, r]) => Math.hypot(px - x, pz - z) < r + 1.1)) return true;
    }
    return false;
  }

  return {
    object: root,
    get cars() { return cars; },
    phaseAt: j => phaseAt(j),
    /** Monta a rede (depois dos postos/galpões da partida) e espalha os carros: mais na avenida, menos nas ruas.
     *  stay: os carros da avenida ficam nela, metade em cada sentido (Fluxo). */
    reset(nAve = 16, nStreet = 18, night = false, stay = false) {
      for (const c of cars) { root.remove(c.mesh); disposeTree(c.mesh); const k = SOLIDS.indexOf(c.solid); if (k >= 0) SOLIDS.splice(k, 1); }
      cars = []; busy = stay; build(); t = Math.random() * CYCLE;
      const all = [];
      for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) for (const d of Object.keys(DIRS)) if (edgeOk(i, j, d)) laneCoords(i, j, d).forEach((_, k) => all.push(makeLane(i, j, d, k)));
      const ave = all.filter(L => L.ave), street = all.filter(L => !L.ave && L.len > 8);
      const spawn = (pool, n, home = false) => {
        for (let tries = 0; n > 0 && tries < 400; tries++) {
          const L = pool[Math.floor(Math.random() * pool.length)], s = CAR / 2 + Math.random() * (L.len - CAR);
          if (L.cars.some(c => Math.abs(c.s - s) < CAR + 3) || (L.i <= 1 && Math.abs(L.a.x - rc(Math.floor(GRID / 2))) < 12)) continue;   // nada colado na entrada
          const veh = buildVehicle(), mesh = veh.mesh; mesh.userData.body.material = mat(veh.color);
          bakeStatic(mesh);                                              // 1 malha por material (de 11 para 6 por carro: a avenida cheia pesa menos)
          if (night) for (const zz of [0.7, -0.7]) {                 // Penumbra: faróis acesos (brilho + luz no chão)
            const g = new THREE.Sprite(lightMats().spr); g.scale.setScalar(1.3); g.position.set(2.35, 0.95, zz); mesh.add(g);
            const b = new THREE.Mesh(lightMats().geo, lightMats().pool); b.rotation.x = -Math.PI / 2; b.position.set(5.2, 0.08, zz * 0.6); mesh.add(b);
          }
          root.add(mesh);
          const c = { mesh, lane: L, s, v: 0, vmax: L.ave ? 8.5 + Math.random() * 2 : 5.5 + Math.random() * 1.5, next: null, turn: null, wait: 0, solid: { x0: 0, x1: 0, z0: 0, z1: 0 }, horiz: false, stay: home };
          L.cars.push(c); L.cars.sort((a, b) => a.s - b.s); cars.push(c); place(c); n--;
        }
      };
      if (stay) { const w = ave.filter(L => L.d === 'W'); spawn(w, Math.ceil(nAve / 2), true); spawn(ave.filter(L => L.d !== 'W'), Math.floor(nAve / 2), true); }   // os dois sentidos
      else spawn(ave, nAve);
      spawn(street, nStreet);
    },
    detach() { for (const c of cars) { const k = SOLIDS.indexOf(c.solid); if (k >= 0) SOLIDS.splice(k, 1); } if (root.parent) root.parent.remove(root); },
    /** obs: [{ circles: [[x, z, r], …] }] — a van e o motorista a pé. ear: posição de quem ouve (som dos motores). */
    update(dt, obs, ear) {
      if (!built) return;
      t += dt; paintLights();
      for (const c of cars) {
        if (c.turn) {                                                    // dentro do cruzamento
          const N = c.next, ahead = N.cars.length ? N.cars[0].s - CAR : N.len;
          let gap = c.turn.len - c.s + ahead;
          for (const o of cars) if (o !== c && o.turn && o.next === N && o.s > c.s) gap = Math.min(gap, o.s - c.s - CAR);
          let want = Math.min(c.vmax, 5.2, Math.max(0, gap - GAP) * 1.3);
          if (blockedAhead(c, obs)) want = 0;
          c.v = c.v < want ? Math.min(want, c.v + 4 * dt) : Math.max(want, c.v - 10 * dt);
          c.s += c.v * dt;
          if (c.s >= c.turn.len) {
            node(...c.lane.to).occ.delete(c);
            c.lane = N; c.s = c.s - c.turn.len; c.turn = null; c.next = null; c.wait = 0; c.avoid = null;
            N.cars.unshift(c); N.cars.sort((a, b) => a.s - b.s);
          }
          place(c); continue;
        }
        const L = c.lane, idx = L.cars.indexOf(c), lead = L.cars[idx + 1];
        if (!c.next) c.next = pickExit(c, L);
        const rem = L.len - c.s;
        let want = c.vmax;
        if (lead) want = Math.min(want, Math.max(0, lead.s - c.s - CAR - GAP) * 1.2);
        const ok = c.next && canEnter(c, L, c.next);
        if (!ok) want = Math.min(want, Math.max(0, rem - 0.4) * 1.1);
        else want = Math.min(want, c.next.d === L.d ? c.vmax : 6 + rem * 0.6);   // diminui para a curva
        if (blockedAhead(c, obs)) want = 0;
        c.v = c.v < want ? Math.min(want, c.v + 3.5 * dt) : Math.max(want, c.v - 10 * dt);
        c.s = Math.min(L.len, c.s + c.v * dt);
        if (!ok && rem < 1.5) {                                          // parado na faixa de retenção
          c.wait += dt;
          const [i, j] = L.to;
          if (c.wait > 7 && !isLight(i, j)) { c.avoid = c.next && c.next.d; c.next = null; c.wait = busy ? 4.1 : 0; }   // espera demais: outra saída (Fluxo: sem perder a vez)
          else if (busy && c.stay && c.wait > 2 && c.next && gapLane(c.next) && room(c.next) < CAR + GAP + 0.6 && exits(i, j, L.d).includes(L.d)) { c.avoid = c.next.d; c.next = null; c.wait = 0; }   // retorno sem lugar no vão: segue reto
        }
        if (ok && c.s >= L.len - 0.05) {                                 // entra no cruzamento
          L.cars.splice(L.cars.indexOf(c), 1);
          c.turn = makeTurn(L, c.next); c.s = 0; c.horiz = L.d === 'E' || L.d === 'W';
          const nd = node(...L.to); nd.occ.add(c); if (nd.vWait === c) nd.vWait = null;
        }
        place(c);
      }
      for (const c of cars) ensureSolid(c.solid);
      // som: o carro mais perto
      if (ear && audio && audio.traffic) {
        let best = 1e9, bv = 0;
        for (const c of cars) { const d = Math.hypot(c.x - ear.x, c.z - ear.z); if (d < best) { best = d; bv = c.v; } }
        audio.traffic(Math.max(0, 1 - best / 38) * (0.4 + 0.6 * Math.min(1, bv / 6)), Math.min(1, bv / 10));
      }
    },
    silence() { if (audio && audio.traffic) audio.traffic(0); },
  };
}
