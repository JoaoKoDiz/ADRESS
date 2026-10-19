// Bloqueios de rua sorteados a cada partida:
//   Bairro 3 — 3 a 5 cavaletes de obra (amarelos e pretos);
//   Bairro 4 — 4 a 6 bloqueios misturando cavaletes, caminhões parados na diagonal e buracos no asfalto;
//   Bairro 7 — só caminhões na diagonal + 3 a 4 ENGARRAFAMENTOS (fila de carros ocupando um trecho inteiro de rua).
//   O engarrafamento tampa o trecho todo: ninguém passa em frente ao lote do lado norte desse trecho (a casa/prédio dele),
//   por isso `jammedSlots` lista esses lotes e o jogo nunca os sorteia para as entregas.
// Nunca isolam nada: o sorteio só é aceito se, pelo grafo de ruas, TODOS os cruzamentos e TODOS os portões
// continuam alcançáveis a partir da entrada — às vezes só é preciso dar uma volta maior.
//
// Grafo: nós = cruzamentos I(j,i) e o meio de cada trecho horizontal M(j,i) (onde ficam os portões).
//   Trecho horizontal (linha i, entre as colunas j e j+1): I(j,i) — M(j,i) — I(j+1,i). A barreira fica perto de
//   uma das pontas ('L' ou 'R'), cortando só aquela metade: o portão continua acessível pela outra ponta.
//   Trecho vertical (coluna j, entre as linhas i e i+1): I(j,i) — I(j,i+1). A barreira fica no meio e corta o trecho.
import * as THREE from 'three';
import { ROAD, GRID, ENTRANCE, GAS_LIST, HOUSE_SLOTS, roadCenter, SOLIDS } from './layout.js';
import { mat, box, cyl, cone, sphere, at, dynamic, bakeStatic, textTexture } from './models/kit.js';
import { buildFigure, figureItem, animatePerson, reach } from './models/resident.js';

// Pisca-pisca dos cavaletes e o alerta dos caminhões: dois materiais que se alternam (atualizados no desenho, sem laço próprio).
const FLASH_A = new THREE.MeshStandardMaterial({ color: '#ff8a1a', emissive: '#ff6a00', emissiveIntensity: 0.9, roughness: 0.6 });
const FLASH_B = new THREE.MeshStandardMaterial({ color: '#ff8a1a', emissive: '#ff6a00', emissiveIntensity: 0.9, roughness: 0.6 });
const HAZARD = new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff7a00', emissiveIntensity: 1, roughness: 0.6 });
let flashFrame = -1;
// Relógio do jogo (não o relógio real): avança em world.update com o dt do mundo, então o pisca-pisca, os engarrafamentos e
// o pessoal das obras e dos caminhões param junto com o resto do mundo quando o MENU (ou a lista de missões) está aberto.
let clockT = 0;
/** Avança o relógio dos bloqueios (chamado por world.update). */
export function tickBarriers(dt) {
  clockT += dt || 0;
  for (const f of LIVE) { const sc = sceneOf(f.root); if (sc) f.tick(Math.min(0.1, dt || 0), findVan(sc)); }   // pessoal das obras e dos fretes à vista
}
function flashTick() {
  const t = clockT;
  if (Math.floor(t * 60) === flashFrame) return;
  flashFrame = Math.floor(t * 60);
  const on = (t % 1) < 0.5;
  FLASH_A.emissiveIntensity = on ? 1.6 : 0.15; FLASH_B.emissiveIntensity = on ? 0.15 : 1.6;
  HAZARD.emissiveIntensity = (t % 0.9) < 0.45 ? 1.5 : 0.1;
}
// ---------- pessoal das obras e dos fretes ----------
// No estilo dos moradores (buildFigure: mesmas proporções, cabeça, rosto, mãos e juntas; uma malha com esqueleto por
// pessoa) e com a roupa do trabalho: o sinaleiro da obra (capacete amarelo, colete refletivo, luvas, botina e a placa
// OBRAS), quem cava (capacete branco, camiseta, colete, pá) e o ajudante do caminhão (boné, camisa da transportadora,
// luvas). Animados no relógio do jogo (tickBarriers): param com o MENU, cada um no seu ritmo.
const LIVE = new Set();                 // figuras animadas (só as que estão à vista numa cena são atualizadas)
const WSKINS = ['#c98a62', '#e8b98f', '#8a5a3c', '#f1c9a5', '#a8714c', '#d9a074'];
const WHAIR = ['#2a1f18', '#5a3a22', '#1e1a18', '#8a6a4a', '#3b2a1a'];
let crewK = 0;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _m4 = new THREE.Matrix4(), _qy = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const ss = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
const lerpV = (a, b, k) => a.lerp(b, k);
/** Raiz de cena de um objeto, se ele e todos os pais estiverem visíveis. */
function sceneOf(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return null; if (!p.parent) return p.isScene ? p : null; } return null; }
let vanRef = null, vanScene = null;
function findVan(sc) { if (sc !== vanScene || !vanRef || vanRef.parent !== sc) { vanScene = sc; vanRef = sc.getObjectByName('van') || null; } return vanRef; }
/** Onde está a van no espaço local de `root` (x, z, distância, velocidade de aproximação). */
function vanLocal(f, van, dt) {
  if (!van) { f.vd = 1e9; f.vsp = 0; return; }
  f.root.updateWorldMatrix(true, false);
  _v.setFromMatrixPosition(van.matrixWorld); f.root.worldToLocal(_v);
  const sc = f.root.getWorldScale(_w).x || 1;                  // (o ajudante fica dentro do grupo do caminhão, que é escalado)
  const d = Math.hypot(_v.x, _v.z) * sc;
  f.vsp = dt > 0 && f.vd < 1e8 ? f.vsp + (((f.vd - d) / dt) - f.vsp) * Math.min(1, dt * 4) : 0;
  f.vd = d; f.vx = _v.x; f.vz = _v.z;
}
/** Pose: ponto do item no corpo (B) e eixo do cabo (D); devolve o ponto a `len` do pé ao longo do cabo. */
function placeTool(it, B, D, len, out) { it.position.copy(B); it.quaternion.setFromUnitVectors(_up, D); return out.copy(D).multiplyScalar(len).add(B); }
function addCrew(f) { f.vd = 1e9; f.vsp = 0; f.vx = 0; f.vz = 1; f.t = Math.random() * 20; LIVE.add(f); return f; }

/** Sinaleiro da obra: segura a placa OBRAS; olha a rua, aponta a obra, coça o capacete; com a van chegando, ergue a placa
 *  e levanta a mão aberta (a rua está fechada ali — nunca indica passagem); com a van parada perto, aponta a obra. */
function buildSignWorker() {
  const k = crewK++;
  const P = buildFigure({ k, skin: WSKINS[k % WSKINS.length], hair: WHAIR[k % WHAIR.length], top: '#3a6fb0', vest: '#ff7a1a', pants: '#3a3d44',
    shoes: '#5a3b22', boots: true, hat: 'helmet', hatColor: '#ffd21a', capLogo: '#2f5fb0', gloves: '#e6cf6a', mustache: k % 2 ? WHAIR[k % WHAIR.length] : null, brows: WHAIR[k % WHAIR.length] });
  const sign = P.give(figureItem('sign'), 'body');
  const f = addCrew({ P, root: P.root, sign, st: { mode: 'idle', t: 0 }, alert: 0, yaw: 0, gest: 'hang', gT: 0, gDur: 3, look: 0, lookT: 0, lookTo: 0, stopT: 0,
    hand: new THREE.Vector3(-0.46, 0.66, 0.06), pole: new THREE.Vector3(-0.6, -0.5, -0.4), bar: new THREE.Vector3(1, 0, 0) });
  f.tick = (dt, van) => signTick(f, dt, van);
  return f;
}
const GEST = {                                                         // mão esquerda do sinaleiro (espaço do corpo) e o cotovelo
  hang: [[-0.46, 0.66, 0.06], [-0.6, -0.5, -0.4]],
  hip: [[-0.39, 0.7, 0.06], [-1, -0.1, -0.3]],
  watch: [[-0.06, 1.0, 0.34], [-0.7, -0.7, 0.1]],
  scratch: [[-0.5, 1.5, 0.06], [-0.9, 0.3, -0.2]],
  stop: [[-0.28, 1.42, 0.36], [-0.8, -0.6, -0.2]],
};
function signTick(f, dt, van) {
  const P = f.P, b = P.b, s = f.st;
  f.t += dt; s.t = f.t;
  vanLocal(f, van, dt);
  const coming = (f.vd < 17 && f.vsp > 0.6) || f.vd < 8.5, near = f.vd < 13;
  f.alert += ((coming ? 1 : 0) - f.alert) * Math.min(1, dt * (coming ? 4 : 1.2));
  f.stopT = near && Math.abs(f.vsp) < 0.35 ? f.stopT + dt : 0;
  const al = ss(0, 1, f.alert);
  // gesto da mão esquerda: com a van chegando, mão levantada (pare); parada perto, aponta a obra; sozinho, varia sem pressa
  f.gT += dt;
  let g = f.gest;
  if (al > 0.5) g = 'stop';
  else if (f.stopT > 1.2 && f.stopT < 5) g = 'point';
  else if (f.gT > f.gDur) { const r = Math.random(); f.gest = r < 0.3 ? 'hang' : r < 0.52 ? 'hip' : r < 0.7 ? 'point' : r < 0.85 ? 'scratch' : 'watch'; f.gT = 0; f.gDur = f.gest === 'hang' || f.gest === 'hip' ? 3 + Math.random() * 5 : 2 + Math.random() * 1.5; g = f.gest; }
  let tgt, pole;
  if (g === 'point') {                                                // braço estendido para a obra (o cavalete)
    const d = f.bar; tgt = _w.set(-0.4 + d.x * 0.5, 1.2, d.z * 0.5 + 0.12); pole = _v.set(-0.4, -0.8, -0.3);
  } else { const G = GEST[g]; tgt = _w.set(...G[0]); pole = _v.set(...G[1]); }
  if (g === 'stop') tgt.x += 0.06 * Math.sin(f.t * 5.5);              // abana devagar: "não dá para passar"
  if (g === 'scratch') tgt.y += 0.04 * Math.sin(f.t * 13);
  lerpV(f.hand, tgt, Math.min(1, dt * 5)); lerpV(f.pole, pole, Math.min(1, dt * 5));
  // corpo: vira para a van que chega; olhar: a rua para os dois lados, a obra, o relógio
  const want = al * THREE.MathUtils.clamp(Math.atan2(f.vx, f.vz), -1.1, 1.1);
  f.yaw += wrapA(want - f.yaw) * Math.min(1, dt * 3);
  f.lookT -= dt;
  if (f.lookT <= 0) { f.lookT = 1.8 + Math.random() * 3.5; const r = Math.random(); f.lookTo = r < 0.35 ? 1.05 : r < 0.7 ? -1.05 : (Math.random() - 0.5) * 0.6; }
  let ly = f.lookTo, lp = 0;
  if (g === 'point') ly = Math.atan2(f.bar.x, f.bar.z);
  if (g === 'watch') { ly = -0.25; lp = 0.35; }
  if (al > 0.05) ly = ly * (1 - al);
  f.look += (ly - f.look) * Math.min(1, dt * 3);
  animatePerson(P, { mode: 'idle', t: f.t, lookYaw: f.look, lookPitch: lp, talk: al > 0.6 ? 1 : 0 });
  b.body.rotation.y += f.yaw;
  if (al > 0.6) b.head.rotation.y += 0.12 * Math.sin(f.t * 7) * al;   // balança a cabeça: "por aqui, não"
  // placa: em pé ao lado do pé direito, de frente para quem vem pela rua; com a van chegando, erguida e virada para ela
  const lift = 0.26 * al, base = _v.set(0.5, lift, 0.26 + 0.14 * al);
  f.sign.position.copy(base);
  const roadYaw = Math.PI / 2 - f.yaw, toVan = Math.atan2(f.vx, f.vz) - f.yaw;
  f.sign.rotation.set(0.05 * al, roadYaw + wrapA(toVan - roadYaw) * al, 0.03 * Math.sin(f.t * 0.7));
  reach(P, 1, base.x - 0.03, base.y + 0.92, base.z + 0.02, 1.0, -0.4, -0.5);
  reach(P, -1, f.hand.x, f.hand.y, f.hand.z, f.pole.x, f.pole.y, f.pole.z);
}

/** Operário compactando o asfalto novo com o soquete (maço de mão): ergue o soquete com as duas mãos e deixa cair; a cada
 *  algumas batidas muda o soquete de lugar; depois de uma série, encosta o soquete, alonga as costas ou põe as mãos na
 *  cintura e olha em volta. Poeira baixa a cada batida. Olha para a van quando ela chega perto. */
function buildTamper() {
  const k = crewK++;
  const P = buildFigure({ k, skin: WSKINS[(k + 2) % WSKINS.length], hair: WHAIR[(k + 1) % WHAIR.length], top: '#8f969e', short: true, vest: '#ff7a1a', pants: '#2f4a6e',
    shoes: '#4a3022', boots: true, hat: 'helmet', hatColor: '#f2f2ee', capLogo: '#d8312a', gloves: '#9aa0a6', brows: WHAIR[(k + 1) % WHAIR.length] });
  const tool = P.give(figureItem('tamper'), 'body');
  const dust = new THREE.Group();                                     // poeira da batida (cresce e some; sem transparência)
  for (const [x, z, r] of [[0.14, 0.05, 0.12], [-0.12, 0.08, 0.1], [0.02, -0.12, 0.09], [0.0, 0.16, 0.08]]) dust.add(at(sphere(r, '#cfc6b4', 7, 5), x, r * 0.5, z));
  bakeStatic(dust); dust.visible = false; P.b.body.add(dust);
  const f = addCrew({ P, root: P.root, tool, dust, st: { mode: 'idle', t: 0 }, ph: 'work', pt: 0, hit: 0, nMax: 9, spot: new THREE.Vector3(0.02, 0, 0.4), to: new THREE.Vector3(0.02, 0, 0.4),
    look: 0, rest: 'stretch', lastHit: -1 });
  f.tick = (dt, van) => tamperTick(f, dt, van);
  return f;
}
const TAMP_T = 1.05;                                                  // uma batida: sobe devagar, cai rápido, um respiro
const SPOTS = [[0.02, 0.4], [0.22, 0.36], [-0.16, 0.38], [0.1, 0.46], [-0.06, 0.34]];
function tamperTick(f, dt, van) {
  const P = f.P, b = P.b, s = f.st;
  f.t += dt; f.pt += dt; s.t = f.t;
  vanLocal(f, van, dt);
  const TOP = 0.98;                                                   // altura do punho com o soquete apoiado no chão
  let lift = 0, bend = 0.06, act = null, at0 = 0, handsOn = true;
  if (f.ph === 'work') {
    const n = Math.floor(f.pt / TAMP_T), u = (f.pt % TAMP_T) / TAMP_T;
    if (n >= f.nMax) { f.ph = 'rest'; f.pt = 0; f.rest = ['stretch', 'hips', 'look'][Math.floor(Math.random() * 3)]; }
    else {
      if (n % 3 === 0 && u < 0.3) f.spot.lerp(f.to, Math.min(1, dt * 6));   // a cada 3 batidas, arrasta o soquete para o lado
      if (n % 3 === 2 && u > 0.95) { const q = SPOTS[Math.floor(Math.random() * SPOTS.length)]; f.to.set(q[0], 0, q[1]); }
      lift = u < 0.62 ? 0.3 * ss(0, 0.62, u) : u < 0.74 ? 0.3 * (1 - ((u - 0.62) / 0.12) ** 2) : 0;   // sobe… e cai
      bend = 0.05 - 0.07 * (lift / 0.3) + (u > 0.74 && u < 0.86 ? 0.1 : 0);
      if (u >= 0.74 && f.lastHit !== n) { f.lastHit = n; f.hitT = 0; }
    }
  } else {
    handsOn = false;
    const dur = 6.5;
    if (f.rest === 'stretch' && f.pt > 0.7) { act = 'stretch'; at0 = f.pt - 0.7; }
    if (f.pt < 0.6 || f.pt > dur - 0.6) handsOn = true;
    if (f.pt > dur) { f.ph = 'work'; f.pt = 0; f.nMax = 7 + Math.floor(Math.random() * 6); f.lastHit = -1; }
  }
  // poeira da batida
  f.hitT = (f.hitT ?? 9) + dt;
  const hk = f.hitT < 0.5 ? f.hitT / 0.5 : 1;
  f.dust.visible = hk < 1; if (f.dust.visible) { const sc = Math.sin(hk * Math.PI) * (0.8 + hk); f.dust.scale.set(sc, sc * 0.7, sc); f.dust.position.set(f.spot.x, 0.02 + hk * 0.12, f.spot.z); }
  const jolt = f.hitT < 0.15 ? Math.sin(f.hitT / 0.15 * Math.PI) : 0;
  // olhar: o soquete enquanto trabalha; em volta no descanso; a van quando ela chega perto
  let ly = f.ph === 'rest' ? (f.rest === 'look' ? 0.9 * Math.sin(f.pt * 0.8) : 0.35 * Math.sin(f.pt * 0.5)) : 0.1 * Math.sin(f.t * 0.3);
  if (f.vd < 11) ly = THREE.MathUtils.clamp(Math.atan2(f.vx, f.vz), -1.2, 1.2);
  f.look += (ly - f.look) * Math.min(1, dt * 3);
  animatePerson(P, { mode: 'idle', t: f.t, act, at: at0, lookYaw: f.look, lookPitch: f.ph === 'work' && f.vd >= 11 ? 0.32 : 0 });
  b.waist.rotation.x += bend;
  b.body.position.y -= 0.025 * jolt; b.kneeL.rotation.x += 0.12 * jolt; b.kneeR.rotation.x += 0.12 * jolt; b.hipL.rotation.x -= 0.06 * jolt; b.hipR.rotation.x -= 0.06 * jolt;
  // soquete: em pé sobre o ponto, erguido pelas duas mãos (no descanso fica apoiado sozinho, levemente inclinado)
  const lean = f.ph === 'rest' && !handsOn ? 0.06 : 0;
  f.tool.position.set(f.spot.x, lift, f.spot.z); f.tool.rotation.set(-lean, 0, 0);
  if (handsOn) {
    const y = TOP + lift;
    reach(P, -1, f.spot.x - 0.13, y, f.spot.z - 0.02, -0.9, -0.5, -0.3);
    reach(P, 1, f.spot.x + 0.13, y, f.spot.z - 0.02, 0.9, -0.5, -0.3);
  } else if (f.rest === 'hips') { reach(P, -1, -0.38, 0.68, -0.02, -1, -0.1, -0.3); reach(P, 1, 0.38, 0.68, -0.02, 1, -0.1, -0.3); b.waist.rotation.x -= 0.08; }
}
const START = () => [ENTRANCE.road, 0];   // cruzamento da entrada (rua central, borda norte)
// Por tipo: distância do centro do cruzamento até o bloqueio (trechos horizontais, perto de uma ponta)
// e meia espessura do obstáculo ao longo da rua. Tudo fica fora do cruzamento e longe do portão (meio do trecho).
// cross = meia largura do obstáculo ao longo da largura da rua: não vai de ponta a ponta, mas deixa vãos
// (~1,1 de cada lado) mais estreitos que a van (2,6), então ainda não dá para passar.
const TYPES = {
  barrier: { offset: ROAD / 2 + 1.0, half: 0.35, cross: 2.7 },
  truck: { offset: ROAD / 2 + 3.0, half: 2.9, cross: 2.9 },
  hole: { offset: ROAD / 2 + 1.7, half: 1.5, cross: 2.7 },
};

const BARRIER_W = 5.0;            // largura do cavalete (a rua tem 7,6)
function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffc61a'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#1b1b1b';
  for (let x = -64; x < 320; x += 48) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 88, 0); g.lineTo(x + 64, 0); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(BARRIER_W / 2.2, 1);
  return t;
}

/** Cavalete de obra atravessando a rua (tábuas listradas ao longo de X, pernas em A, sacos de areia nos pés, placa OBRAS
 *  e pisca-pisca alternado). Tudo dentro da caixa de colisão (meia espessura 0,35 ao longo da rua). Com `obra` (Bairro 3), o
 *  grupo traz também a obra de verdade: vala sob o cavalete, asfalto novo atrás dele e um operário na calçada. */
function buildBarrier(stripes) {
  const g = new THREE.Group();
  const W = BARRIER_W;
  const boardMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 });
  for (const y of [0.55, 1.05]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.34, 0.12), boardMat);
    b.position.y = y; b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // tábua listrada deitada no topo: é ela que aparece na visão de cima
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.6), boardMat);
  top.position.y = 1.25; top.castShadow = true;
  g.add(top);
  const st = new THREE.Group();                                   // partes fixas (fundidas)
  // cones laranja nas pontas (no meio da espessura: dentro da colisão)
  for (const x of [-W / 2 - 0.25, W / 2 + 0.25]) {
    st.add(at(cone(0.28, 0.85, '#ff7a1a', 10), x, 0.43, 0));
    st.add(at(cyl(0.17, 0.21, 0.13, '#ffffff', 10), x, 0.48, 0));
    st.add(at(box(0.62, 0.05, 0.62, '#2e3036'), x, 0.025, 0));
  }
  for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) for (const s of [1, -1]) {
    st.add(at(box(0.12, 1.35, 0.12, '#2e3036'), x, 0.62, s * 0.2, s * 0.24, 0, 0));
    st.add(at(box(0.42, 0.16, 0.26, '#c2a76e'), x, 0.08, s * 0.3, 0, s * 0.2, 0));   // saco de areia no pé
  }
  // placa OBRAS no meio, dos dois lados
  st.add(at(box(0.08, 0.5, 0.08, '#2e3036'), 0, 1.55, 0));
  st.add(at(box(1.5, 0.56, 0.06, '#2e3036'), 0, 1.98, 0));
  const plate = textTexture('OBRAS', { width: 256, height: 96, bg: '#ff8a1a', fg: '#1b1b1b', font: 'bold 64px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.7 });
  for (const r of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.48), pm); p.position.set(0, 1.98, r ? -0.06 : 0.06); p.rotation.y = r; st.add(p); }   // (3 cm à frente da placa)
  st.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(st); g.add(st);
  for (const [k, x] of [-W / 2 + 0.4, W / 2 - 0.4].entries()) {   // pisca-pisca alternado
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), k ? FLASH_B : FLASH_A);
    l.position.set(x, 1.38, 0);
    l.onBeforeRender = flashTick;
    g.add(l);
  }
  // a obra (só no Bairro 3): vala e terra sob o cavalete, asfalto novo atrás dele e marcas de spray
  const obra = new THREE.Group(); obra.visible = false;
  const og = new THREE.Group();
  og.add(at(box(W + 0.4, 0.02, 0.62, '#5b4630'), 0, 0.012, 0));
  for (const [x, s] of [[-1.4, 0.55], [0.3, 0.42], [1.7, 0.5]]) { const m = at(sphere(s, '#7a5c3a', 7, 4), x, 0, 0); m.scale.set(1.4, 0.45, 0.5); og.add(m); }   // montinhos de terra
  og.add(at(box(W + 0.6, 0.012, 2.4, '#3c4048'), 0, 0.006, 1.6));                       // asfalto novo (recapeado), atrás do cavalete
  for (const x of [-W / 2 - 0.3, W / 2 + 0.3]) og.add(at(box(0.08, 0.014, 2.4, '#ff8a1a'), x, 0.017, 1.6));   // marcas de spray (1,2 cm acima do asfalto novo)
  og.add(at(box(1.2, 0.014, 0.08, '#ff8a1a'), -0.8, 0.017, 2.9)); og.add(at(box(0.08, 0.014, 0.5, '#ff8a1a'), -0.2, 0.017, 3.15));
  og.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  bakeStatic(og); obra.add(og);
  const sign = buildSignWorker(), tamp = buildTamper();
  obra.add(sign.root, tamp.root);
  obra.userData = { worker: sign.root, shovel: tamp.root, og, crew: [sign, tamp] };
  g.add(dynamic(obra));
  g.userData.obra = obra;
  g.children.forEach(o => { if (o.material === FLASH_A || o.material === FLASH_B) dynamic(o); });
  bakeStatic(g);                               // tábuas listradas e partes fixas: poucas malhas
  return g;
}

/** Caminhão baú parado na diagonal da rua (comprimento ao longo do X local), com as portas de trás abertas e um ajudante
 *  descarregando caixas para uma pilha no chão. O baú é oco (paredes, teto e assoalho na cor da partida, forro escuro por
 *  dentro, caixas lá no fundo); a traseira tem moldura, para-choque e lanternas com caixa e lente saltadas (nada encostado
 *  na mesma superfície da carroceria). Tudo dentro da caixa de colisão de sempre (TYPES.truck). */
const TRUCK_COLORS = ['#f2f2f2', '#3a78d4', '#d8473a', '#efbf2a', '#3c9d55'];
const TAIL = new THREE.MeshStandardMaterial({ color: '#d42a22', emissive: '#c01a12', emissiveIntensity: 0.55, roughness: 0.45 });
// pilha de caixas atrás do caminhão (local do caminhão, sem escala): x, altura da base, z, giro; a de cima fica sobre as duas
const PILE = [[-4.33, 0, -0.78, 0.04], [-5.1, 0, -0.76, -0.05], [-4.35, 0.5, -0.8, -0.06], [-5.08, 0.5, -0.74, 0.07], [-4.72, 1.0, -0.77, 0.12]];
const DOOR_BOX = [-3.48, 1.16, 0.44], DOOR_STAND = [-4.28, 0.44], BOXS = 1.25;   // a caixa na beira do assoalho; onde o ajudante fica para pegá-la
function buildTruck() {
  const g = new THREE.Group();
  const C0 = TRUCK_COLORS[0];
  // baú (assoalho acima das rodas): paredes, teto e assoalho numa malha só (o material troca a cada partida)
  const shell = new THREE.Group();
  shell.add(at(box(4.6, 0.12, 2.48, C0), -1.2, 3.94, 0), at(box(4.6, 0.14, 2.48, C0), -1.2, 1.07, 0));
  for (const zz of [1.27, -1.27]) shell.add(at(box(4.6, 3.0, 0.06, C0), -1.2, 2.5, zz));
  shell.add(at(box(0.06, 2.74, 2.48, C0), 1.07, 2.51, 0));
  bakeStatic(shell); dynamic(shell); g.add(shell);
  const cargo = shell.children.find(o => o.isMesh);
  const liner = new THREE.Mesh(new THREE.BoxGeometry(4.44, 2.7, 2.4), new THREE.MeshStandardMaterial({ color: '#3b3e44', roughness: 0.9, side: THREE.BackSide }));
  liner.position.set(-1.2, 2.51, 0); g.add(liner);                                 // forro por dentro (só as faces de dentro aparecem)
  g.add(at(box(4.7, 0.22, 2.7, '#c9ced6'), -1.2, 4.05, 0));                       // friso do teto do baú
  g.add(at(box(4.3, 0.3, 1.9, '#2e3036'), -1.15, 0.85, 0));                       // longarinas sob o baú
  // traseira: moldura (colunas, travessa e soleira), portas abertas encostadas nas laterais, para-choque e lanternas
  const FR = '#4a4e56';
  for (const zz of [1.26, -1.26]) g.add(at(box(0.12, 2.86, 0.16, FR), -3.5, 2.43, zz));
  g.add(at(box(0.14, 0.2, 2.62, FR), -3.53, 3.8, 0), at(box(0.16, 0.18, 2.62, FR), -3.53, 1.07, 0));
  for (const zz of [1, -1]) {
    g.add(at(box(1.25, 2.8, 0.06, '#c9ced6'), -2.9, 2.5, zz * 1.37));              // folha aberta, encostada na lateral (acima das rodas)
    for (const y of [1.4, 2.5, 3.6]) g.add(at(box(0.16, 0.12, 0.05, '#2e3036'), -3.47, y, zz * 1.41));   // dobradiças
    g.add(at(box(0.05, 0.9, 0.05, '#8a8f96'), -2.45, 2.5, zz * 1.425));            // trava da porta
  }
  g.add(at(box(0.12, 0.3, 2.3, '#2e3036'), -3.6, 0.8, 0));                         // travessa das lanternas
  g.add(at(box(0.14, 0.14, 2.2, '#2e3036'), -3.66, 0.42, 0));                      // para-choque traseiro (barra baixa)
  for (const zz of [0.7, -0.7]) g.add(at(box(0.3, 0.42, 0.1, '#2e3036'), -3.48, 0.56, zz));
  for (const zz of [1, -1]) {
    g.add(at(box(0.1, 0.26, 0.56, '#2a2c30'), -3.71, 0.8, zz * 0.86));            // caixa da lanterna (presa na travessa)
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.22), TAIL); red.position.set(-3.785, 0.8, zz * 0.74); g.add(red);   // lente vermelha, saltada da caixa
    const amb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.17, 0.18), HAZARD); amb.position.set(-3.785, 0.8, zz * 1.0); g.add(amb);   // pisca-alerta
  }
  // cabine (sobre as rodas da frente) e a parte de baixo, entre as rodas
  g.add(at(box(2.3, 1.75, 2.5, '#4a5568'), 2.3, 1.825, 0));
  g.add(at(box(2.2, 0.48, 1.96, '#2e3036'), 2.3, 0.74, 0));
  g.add(at(box(0.08, 1.0, 2.1, '#2b4a6e'), 3.47, 2.1, 0));                       // para-brisa
  g.add(at(box(0.25, 0.4, 2.6, '#2e3036'), 3.5, 0.75, 0));                       // para-choque
  for (const x of [-2.9, -1.4, 2.4]) for (const zz of [1.2, -1.2]) g.add(at(cyl(0.5, 0.5, 0.4, '#1f2023', 12), x, 0.5, zz, Math.PI / 2, 0, 0));
  g.add(at(box(6.5, 0.3, 1.9, '#2e3036'), -0.1, 0.55, 0));                       // chassi
  for (const zz of [1.0, -1.0]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), HAZARD); l.position.set(3.55, 1.25, zz); l.onBeforeRender = flashTick; g.add(l); }   // pisca-alerta da frente
  const st = new THREE.Group();
  for (const zz of [1.35, -1.35]) { st.add(at(box(0.12, 0.42, 0.06, '#2e3036'), 3.0, 2.3, zz)); st.add(at(box(0.06, 0.06, 0.3, '#2e3036'), 3.0, 2.3, zz * 0.92)); }   // retrovisores
  st.add(at(box(2.32, 0.18, 1.6, '#3a3d44'), 2.3, 2.79, 0));                        // teto da cabine
  for (const zz of [1, -1]) st.add(at(box(0.9, 0.6, 0.08, '#2b4a6e'), 2.3, 2.05, zz * 1.27));   // janelas laterais
  // caixas lá dentro (fundo do baú) — o ajudante tira a da beira e leva para a pilha
  const bx = figureItem('box'), bGeo = bx.children[0].geometry, bMat = bx.children[0].material;
  const inside = [[0.55, 0, 0.62], [0.55, 0, -0.1], [0.55, 0, -0.82], [0.5, 0.5, 0.3], [0.52, 0.5, -0.5], [-0.2, 0, 0.6], [-0.18, 0, -0.75], [0.55, 1.0, -0.15]];
  for (const [x, y, z] of inside) { const m = new THREE.Mesh(bGeo, bMat); m.position.set(x, 1.14 + y + 0.25, z); m.rotation.y = (x * 7 + z * 3) % 0.2; m.scale.setScalar(BOXS); st.add(m); }
  st.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(st); g.add(st);
  const plateT = textTexture('FRETES', { width: 256, height: 96, bg: '#fbf7ee', fg: '#2f3236', font: 'bold 60px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plateT, roughness: 0.8 });
  for (const zz of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.95), pm); p.position.set(-0.9, 2.7, zz * 1.34); p.rotation.y = zz > 0 ? 0 : Math.PI; g.add(p); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  liner.castShadow = false;
  // caixas que mudam: a da beira do assoalho e a pilha no chão (uma malha instanciada)
  const boxes = dynamic(new THREE.InstancedMesh(bGeo, bMat, PILE.length + 1));
  boxes.castShadow = true; boxes.receiveShadow = true; boxes.count = 0; g.add(boxes);
  g.children.forEach(o => { if (o.material === HAZARD) dynamic(o); });
  bakeStatic(g);
  g.scale.setScalar(0.8);                      // menor: na diagonal não toma a rua de ponta a ponta
  g.userData.cargo = cargo;
  const helper = buildHelper(g, boxes); g.add(helper.root);
  g.userData.helper = helper;
  return g;
}

/** Ajudante do caminhão: tira a caixa da beira do baú, leva até a pilha, abaixa para pôr no lugar e volta; quando a pilha
 *  completa, fica esperando de mãos na cintura, olhando o movimento (e a van, se ela chega perto). Coordenadas no espaço
 *  do caminhão (o ajudante tem escala 1,25 lá dentro: no mundo, o mesmo tamanho dos moradores). */
const _o = new THREE.Object3D(), _B = new THREE.Vector3();
function buildHelper(truck, boxes) {
  const k = crewK++;
  const P = buildFigure({ k, skin: WSKINS[(k + 4) % WSKINS.length], hair: WHAIR[(k + 3) % WHAIR.length], top: '#2f6fb0', short: true, collar: '#f4f1ea', pants: '#3d4a66',
    shoes: '#2b2522', sneakers: true, hat: 'cap', hatColor: '#f4f1ea', capLogo: '#2f6fb0', gloves: '#c9b27a', tag: '#f4f1ea' });
  P.root.scale.setScalar(1 / 0.8);
  const box = figureItem('box');                                      // (segura só enquanto leva: give/drop)
  const f = addCrew({ P, root: P.root, box, boxes, truck, st: { mode: 'idle', t: 0, ph: 0, amp: 0 }, ph: 'wait', pt: 0, filled: 0, slot: 0, door: true,
    x: DOOR_STAND[0], z: DOOR_STAND[1], yaw: Math.PI / 2, tx: 0, tz: 0, wait: 1, look: 0, rest: 'hips' });
  f.reset = () => { f.filled = 1 + Math.floor(Math.random() * 2); f.door = true; f.ph = 'wait'; f.pt = 0; f.wait = 0.5 + Math.random() * 2; f.x = DOOR_STAND[0]; f.z = DOOR_STAND[1]; f.yaw = Math.PI / 2; P.drop(box); syncBoxes(f); };
  f.tick = (dt, van) => helperTick(f, dt, van);
  f.reset();
  return f;
}
function syncBoxes(f) {
  let n = 0;
  const put = (x, y, z, ry) => { _o.position.set(x, y, z); _o.rotation.set(0, ry, 0); _o.scale.setScalar(BOXS); _o.updateMatrix(); f.boxes.setMatrixAt(n++, _o.matrix); };
  if (f.door) put(DOOR_BOX[0], DOOR_BOX[1] + 0.25, DOOR_BOX[2], 0.06);
  for (let i = 0; i < f.filled; i++) { const q = PILE[i]; put(q[0], q[1] + 0.25, q[2], q[3]); }
  f.boxes.count = n; f.boxes.instanceMatrix.needsUpdate = true;
}
/** Ponto do caminhão (local, sem escala) → espaço do corpo do ajudante. */
function toBody(f, x, y, z, out) {
  const dx = x - f.x, dz = z - f.z, c = Math.cos(-f.yaw), s = Math.sin(-f.yaw);
  return out.set((dx * c + dz * s) * 0.8, y * 0.8, (-dx * s + dz * c) * 0.8);
}
const CARRY = new THREE.Vector3(0, 0.94, 0.42);
function helperTick(f, dt, van) {
  const P = f.P, b = P.b, s = f.st;
  f.t += dt; f.pt += dt; s.t = f.t;
  vanLocal(f, van, dt);
  let mode = 'idle', act = null, at0 = 0, crouch = 0, bend = 0, hands = null, holding = P.has(f.box);
  const walkTo = (x, z) => {                                         // anda (1 m/s) até o ponto; true quando chegou
    const dx = x - f.x, dz = z - f.z, d = Math.hypot(dx, dz);
    if (d < 0.03) return true;
    const v = Math.min(d, 1.25 * dt); f.x += dx / d * v; f.z += dz / d * v;
    f.yaw += wrapA(Math.atan2(dx, dz) - f.yaw) * Math.min(1, dt * 7);
    mode = 'walk'; s.ph += v * 0.8 * Math.PI / 0.42; return false;
  };
  const turnTo = a => { f.yaw += wrapA(a - f.yaw) * Math.min(1, dt * 6); return Math.abs(wrapA(a - f.yaw)) < 0.08; };
  const q = PILE[Math.min(f.filled, PILE.length - 1)], appr = [q[0] + (q[1] > 0.9 ? 0 : 0), q[2] + 0.92];
  switch (f.ph) {
    case 'wait':                                                      // na porta, um respiro antes da próxima
      if (f.pt > f.wait && turnTo(Math.PI / 2)) { f.ph = f.filled >= PILE.length ? 'done' : 'take'; f.pt = 0; }
      break;
    case 'take': {                                                    // inclina, pega a caixa da beira e traz para o peito
      const u = f.pt;
      bend = 0.22 * ss(0, 0.6, u) * (1 - ss(0.85, 1.4, u));
      if (u < 0.85) { const c = toBody(f, DOOR_BOX[0], DOOR_BOX[1] + 0.25, DOOR_BOX[2], _B); hands = [c.x - 0.3, c.y - 0.03, c.z + 0.02, c.x + 0.3, c.y - 0.03, c.z + 0.02]; }
      else {
        if (f.door) { f.door = false; P.give(f.box, 'body'); holding = true; syncBoxes(f); }
        const c0 = toBody(f, DOOR_BOX[0], DOOR_BOX[1] + 0.25, DOOR_BOX[2], _B), k = ss(0.85, 1.4, u);
        f.box.position.copy(c0).lerp(CARRY, k); f.box.rotation.set(0, 0.06 * (1 - k), 0);
        const c = f.box.position; hands = [c.x - 0.29, c.y - 0.03, c.z + 0.02, c.x + 0.29, c.y - 0.03, c.z + 0.02];
      }
      if (u > 1.45) { f.ph = 'go'; f.pt = 0; }
      break;
    }
    case 'go':                                                        // leva a caixa até a frente da pilha
      if (walkTo(appr[0], appr[1]) && turnTo(Math.PI)) { f.ph = 'put'; f.pt = 0; }
      break;
    case 'put': {                                                     // abaixa (mais, se a pilha ainda está baixa) e põe a caixa no lugar
      const u = f.pt, low = q[1] < 0.25 ? 1 : q[1] < 0.75 ? 0.45 : 0;
      const dn = ss(0, 0.7, u) * (1 - ss(1.15, 1.7, u));
      crouch = low * dn; bend = (0.25 + 0.35 * low) * dn;
      if (u < 0.95) {
        const c1 = toBody(f, q[0], q[1] + 0.25, q[2], _B), k = ss(0.1, 0.9, u);
        f.box.position.copy(CARRY).lerp(c1, k); f.box.rotation.set(0, wrapA(q[3] - f.yaw + Math.PI) * k, 0);
        const c = f.box.position; hands = [c.x - 0.29, c.y - 0.03, c.z + 0.02, c.x + 0.29, c.y - 0.03, c.z + 0.02];
      } else if (holding) { P.drop(f.box); holding = false; f.filled++; f.door = f.filled < PILE.length; syncBoxes(f); }
      if (u > 1.75) { f.ph = 'back'; f.pt = 0; }
      break;
    }
    case 'back':
      if (walkTo(DOOR_STAND[0], DOOR_STAND[1])) { f.ph = 'wait'; f.pt = 0; f.wait = Math.random() < 0.25 ? 2.6 : 0.3 + Math.random() * 1.2; f.rest = f.wait > 2 ? 'stretch' : 'hips'; }
      break;
    case 'done':                                                      // pilha completa: espera, mãos na cintura, olhando a rua
      turnTo(Math.PI / 2 + 1.1);
      if (f.pt > 9 && Math.random() < dt * 0.15) f.pt = 0;
      break;
  }
  if (f.ph === 'wait' && f.rest === 'stretch' && f.wait > 2 && f.pt > 0.4) { act = 'stretch'; at0 = f.pt - 0.4; }
  // olhar: a van perto; parado, a rua; trabalhando, o que está fazendo
  let ly = 0, lp = 0;
  if (f.vd < 11) ly = THREE.MathUtils.clamp(wrapA(Math.atan2(f.vx, f.vz) - (f.yaw - f.root.rotation.y)), -1.2, 1.2);
  else if (f.ph === 'done' || f.ph === 'wait') ly = 0.7 * Math.sin(f.t * 0.45 + k0(f));
  if (f.ph === 'take' || f.ph === 'put') lp = 0.3;
  f.look += (ly - f.look) * Math.min(1, dt * 3);
  s.mode = mode; s.amp = mode === 'walk' ? 0.85 : 0;
  animatePerson(P, { mode, ph: s.ph, amp: s.amp, t: f.t, act, at: at0, lookYaw: f.look, lookPitch: lp });
  f.root.position.set(f.x, 0, f.z); f.root.rotation.y = f.yaw;
  if (crouch > 0) { b.body.position.y -= 0.3 * crouch; b.hipL.rotation.x -= 1.0 * crouch; b.hipR.rotation.x -= 1.0 * crouch; b.kneeL.rotation.x += 1.85 * crouch; b.kneeR.rotation.x += 1.85 * crouch; }
  b.waist.rotation.x += bend;
  if (hands) { reach(P, -1, hands[0], hands[1], hands[2], -0.7, -0.6, -0.1); reach(P, 1, hands[3], hands[4], hands[5], 0.7, -0.6, -0.1); }
  else if (!holding && act !== 'stretch' && (f.ph === 'done' || f.ph === 'wait')) { reach(P, -1, -0.38, 0.68, -0.02, -1, -0.1, -0.3); reach(P, 1, 0.38, 0.68, -0.02, 1, -0.1, -0.3); }
}
const k0 = f => f.P.k * 1.7;

/** Buraco largo no asfalto (atravessa a rua inteira): borda de asfalto quebrado e levantado, terra em volta, a parede de
 *  dentro em degradê (dá profundidade sem furar o chão), água parada no fundo, cones e um cavalete de aviso. */
function buildHole() {
  const g = new THREE.Group();
  const ell = (rx, rz, h, col, y, x = 0, z = 0, seg = 20) => { const m = at(cyl(1, 1, h, col, seg), x, y, z); m.scale.set(rx, 1, rz); g.add(m); return m; };
  // camadas em degraus de 1,5 cm (antes 2,5–7,5 mm: as de cima disputavam a mesma altura com as de baixo, de longe)
  ell(4.0, 2.4, 0.03, '#9a7448', 0.015);                                           // terra solta: destaca de longe
  ell(3.55, 1.85, 0.045, '#5a4630', 0.0225);                                       // parede de dentro (terra úmida)
  ell(3.15, 1.55, 0.06, '#3a2c1f', 0.03, 0.05, 0.08);
  ell(2.6, 1.22, 0.075, '#1d1712', 0.0375, 0.12, 0.14);                            // fundo escuro, um pouco deslocado (parece mais fundo)
  ell(1.4, 0.62, 0.09, '#4d5a63', 0.045, 0.3, 0.22, 14);                           // água parada no fundo
  ell(0.5, 0.18, 0.105, '#8aa0ad', 0.0525, 0.0, 0.1, 10);                          // reflexo
  for (let k = 0; k < 18; k++) {                                                   // asfalto quebrado e levantado na borda
    const a = k / 18 * Math.PI * 2;
    g.add(at(box(0.75 + (k % 3) * 0.15, 0.18, 0.5, k % 2 ? '#5d6470' : '#474c55'), Math.cos(a) * 3.85, 0.08, Math.sin(a) * 2.0,
      (k % 3) * 0.25, a, (k % 4) * 0.22));
  }
  for (const [x, z] of [[2.9, 0.9], [-2.6, -0.8], [1.2, -1.9]]) g.add(at(sphere(0.22, '#8f8a80', 6, 4), x, 0.12, z));   // pedras soltas
  for (const x of [-3.2, 0, 3.2]) for (const zz of [2.05, -2.05]) {                // cones dos dois lados (dentro da colisão)
    g.add(at(cone(0.28, 0.85, '#ff7a1a', 10), x, 0.43, zz));
    g.add(at(cyl(0.17, 0.21, 0.13, '#ffffff', 10), x, 0.48, zz));
  }
  // cavalete pequeno de aviso numa ponta
  for (const s of [-1, 1]) g.add(at(box(0.1, 1.2, 0.1, '#2e3036'), 3.9 + s * 0.5, 0.58, -0.6, 0.25, 0, 0));
  const plate = textTexture('BURACO', { width: 256, height: 96, bg: '#ffc61a', fg: '#1b1b1b', font: 'bold 56px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.7 });
  for (const r of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), pm); p.position.set(3.9, 1.05, r ? -0.69 : -0.51); p.rotation.y = r; g.add(p); }
  g.add(at(box(1.46, 0.55, 0.1, '#2e3036'), 3.9, 1.05, -0.6));
  g.scale.setScalar(0.68);                     // mais estreito que a rua
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  bakeStatic(g);
  return g;
}

/** Engarrafamento: fila de carros nas duas faixas ao longo de um trecho de rua (ao longo do X local). */
export const CAR_COLORS = ['#d8473a', '#3a78d4', '#efbf2a', '#3c9d55', '#f2f2f2', '#8a55c4', '#ff8a1e', '#2b2d33', '#e86aa0'];
const LENS_R = new THREE.BoxGeometry(0.05, 0.22, 0.36), LENS_F = new THREE.BoxGeometry(0.05, 0.2, 0.34);
export function buildCar() {
  const g = new THREE.Group();
  const body = at(box(4.4, 0.9, 1.9, CAR_COLORS[0]), 0, 0.85, 0);
  g.add(body);
  g.add(at(box(2.2, 0.8, 1.7, '#dfe6ee'), -0.3, 1.68, 0));                                   // cabine (vidros)
  g.add(at(box(2.0, 0.08, 1.6, '#7b828c'), -0.3, 2.12, 0));                                  // teto
  for (const x of [-1.4, 1.4]) for (const zz of [0.95, -0.95]) g.add(at(cyl(0.42, 0.42, 0.3, '#1f2023', 10), x, 0.42, zz, Math.PI / 2, 0, 0));
  const brake = mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.1 }), head = mat('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.4 });
  // lanternas e faróis: caixa escura saltada da carroceria e a lente saltada da caixa (nada na mesma superfície da lataria)
  for (const zz of [0.68, -0.68]) {
    g.add(at(box(0.06, 0.3, 0.46, '#1f2023'), -2.225, 0.95, zz), at(box(0.06, 0.28, 0.44, '#1f2023'), 2.225, 0.95, zz));
    const r = new THREE.Mesh(LENS_R, brake); r.position.set(-2.27, 0.95, zz); r.userData.brake = true; g.add(r);   // luzes de freio
    const f = new THREE.Mesh(LENS_F, head); f.position.set(2.27, 0.95, zz); g.add(f);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.body = body;
  return g;
}
const JAM_CARS = [-5.4, 0, 5.4];                  // 3 carros por faixa (trecho livre: ~16,8)
/** Engarrafamento: cada faixa é uma fila que anda um palmo de vez em quando (as luzes de freio apagam enquanto anda) e volta
 *  devagar, quase sem se notar, para o lugar; as duas faixas e cada engarrafamento em ritmos diferentes. No relógio do jogo. */
let jamSeed = 0;
function buildJam() {
  const g = new THREE.Group();
  g.userData.cars = [];
  for (const lane of [1, -1]) {
    const lg = dynamic(new THREE.Group()), brake = new THREE.MeshStandardMaterial({ color: '#ff3b30', emissive: '#ff1a1a', emissiveIntensity: 1.1, roughness: 0.5 });
    for (const x of JAM_CARS) {
      const c = buildCar();
      c.position.set(x, 0, lane * ROAD / 4);
      c.rotation.y = lane > 0 ? 0 : Math.PI;     // mão dupla: uma faixa para cada lado
      dynamic(c.userData.body);                   // (a carroceria troca de cor a cada partida: fica separada)
      c.traverse(o => { if (o.userData.brake) o.material = brake; });
      lg.add(c); g.userData.cars.push(c);
    }
    bakeStatic(lg);                               // rodas, vidros, faróis… dos 3 carros da fila viram poucas malhas
    const period = 9 + ((jamSeed * 5 + (lane > 0 ? 0 : 3)) % 7), ph = (jamSeed * 3.7 + (lane > 0 ? 0 : 4.1)) % period;
    const tick = lg.children.find(o => o.isMesh && o.material === brake) || lg.children[0];
    tick.onBeforeRender = () => {
      const u = (clockT + ph) % period, go = 1.5;   // anda 0,45 em 1,5 s; depois volta 0,45 no resto do ciclo (bem devagar)
      const k = u < go ? (1 - Math.cos(u / go * Math.PI)) / 2 : 1 - (u - go) / (period - go);
      lg.position.x = lane * 0.45 * (k - 0.5);
      brake.emissiveIntensity = u < go ? 0.15 : 1.1;
    };
    g.add(lg);
  }
  jamSeed++;
  return g;
}

const key = (...a) => a.join(',');

/** Bairro 3: liga a obra do cavalete e põe os operários na calçada do lado de um lote (fora da pista e da colisão da van). */
function placeObra(b, c, on) {
  const o = b.userData.obra; if (!o) return;
  o.visible = on; if (!on) return;
  const N = GRID, { worker, shovel, og, crew } = o.userData, SW = ROAD / 2 - 0.42;   // no asfalto, junto ao meio-fio (os pés no chão)
  let lx, along;
  if (c[0] === 'H') {                                          // rua leste–oeste: local +z = +x do mundo, local −x = +z do mundo
    const [, , i, side] = c, s = i < N ? 1 : -1;                // calçada do lote ao sul (ou ao norte na última rua)
    lx = -s * SW; along = side === 'L' ? 1 : -1;               // do lado do trecho sem saída
  } else {
    const [, j] = c; lx = j < N ? SW : -SW; along = 1;
  }
  og.rotation.y = along > 0 ? 0 : Math.PI;                     // asfalto novo do lado do trecho sem saída (não no cruzamento)
  const wy = lx > 0 ? -Math.PI / 2 : Math.PI / 2;
  // o sinaleiro fica do lado de onde vem o trânsito (mais longe do cavalete, à vista de quem chega); o do soquete, no asfalto novo
  worker.position.set(lx, 0, along * 3.4); worker.rotation.y = wy;
  shovel.position.set(lx, 0, along * 1.5); shovel.rotation.y = wy + along * (lx > 0 ? -0.35 : 0.35);   // (um pouco virado para o cavalete)
  // direção (no corpo do sinaleiro) da ponta do cavalete mais perto dele: é para lá que ele aponta
  const dx = -0.4 * lx, dz = -along * 3.4, L = Math.hypot(dx, dz), cw = Math.cos(wy), sw = Math.sin(wy);
  crew[0].bar.set((dx * cw - dz * sw) / L, 0, (dx * sw + dz * cw) / L);
  for (const f of crew) { f.t = Math.random() * 30; f.pt = Math.random() * 3; f.vd = 1e9; f.alert = 0; }
}

/** O conjunto de barreiras deixa tudo alcançável a partir da entrada? (`skipM`: portões dos trechos engarrafados, que ficam de fora de propósito) */
let TOPO = { blocked: new Set(), skip: new Set(), exclude: new Set(), heightAt: () => 0 };   // ver layout.roadTopology()
function allReachable(blocked0, skipM = new Set()) {
  const blocked = new Set([...TOPO.blocked, ...blocked0]);
  const N = GRID;
  const adj = new Map();
  const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) {        // trechos horizontais
    if (!blocked.has(key('H', j, i, 'L'))) link(key('I', j, i), key('M', j, i));
    if (!blocked.has(key('H', j, i, 'R'))) link(key('M', j, i), key('I', j + 1, i));
  }
  for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) {        // trechos verticais
    if (!blocked.has(key('V', j, i))) link(key('I', j, i), key('I', j, i + 1));
  }
  const total = (N + 1) * (N + 1) + N * (N + 1) - skipM.size - TOPO.skip.size;
  const seen = new Set([key('I', ...START())]);
  const queue = [key('I', ...START())];
  while (queue.length) for (const n of adj.get(queue.shift()) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  for (const m of skipM) if (seen.has(m)) return false;      // (um portão engarrafado não deveria ser alcançável: garante que o trecho está mesmo fechado)
  return seen.size === total;
}

export function createBarriers() {
  const stripes = stripeTexture();
  const group = new THREE.Group();
  group.name = 'barriers';
  const pools = { barrier: [], truck: [], hole: [], jam: [] };   // modelos reaproveitados entre partidas
  const build = { barrier: () => buildBarrier(stripes), truck: buildTruck, hole: buildHole };
  let solids = [];
  let current = [];
  let jamRects = [];
  let jammed = [];                               // lotes (índices) que ficam sem acesso por causa de um engarrafamento
  let list = [];                                 // bloqueios da partida (missões do Bairro 3): { id, kind 'H'|'V', j, i, side, x, z, type }

  function clear() {
    for (const s of solids) { const i = SOLIDS.indexOf(s); if (i >= 0) SOLIDS.splice(i, 1); }
    solids = []; current = []; jammed = []; jamRects = []; list = [];
    Object.values(pools).forEach(p => p.forEach(b => { b.visible = false; }));
  }

  /** Sorteia de `min` a `max` bloqueios válidos (dos tipos `types`) e os coloca na cena `scene`. */
  function randomize(scene, { min = 3, max = 5, types = ['barrier'], jams = null, topo = null } = {}) {
    clear();
    const obraMode = types.length === 1 && types[0] === 'barrier';   // Bairro 3: as obras de verdade
    if (topo) TOPO = topo;
    scene.add(group);
    const N = GRID;
    const cands = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) if (!TOPO.exclude.has(key('H', j, i))) cands.push(['H', j, i, 'L'], ['H', j, i, 'R']);
    const gasSegs = new Set(GAS_LIST.map(g => key('V', g.slots[0] % N + 1, Math.floor(g.slots[0] / N))));   // ruas por dentro dos postos
    for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) if (!gasSegs.has(key('V', j, i)) && !TOPO.exclude.has(key('V', j, i)) && !TOPO.blocked.has(key('V', j, i))) cands.push(['V', j, i]);
    const want = min + Math.floor(Math.random() * (max - min + 1));
    const wantJams = jams ? jams.min + Math.floor(Math.random() * (jams.max - jams.min + 1)) : 0;
    // engarrafamentos: trechos horizontais de rua com lotes ao norte (i ≥ 1); tampam o trecho inteiro
    const jamCands = [];
    const gasSlots = new Set(GAS_LIST.flatMap(g => g.slots));          // lote de posto não é destino de entrega: engarrafar ali não adiantaria
    for (let i = 1; i <= N; i++) for (let j = 0; j < N; j++) if (!gasSlots.has((i - 1) * N + j) && HOUSE_SLOTS.includes((i - 1) * N + j) && !TOPO.exclude.has(key('H', j, i))) jamCands.push([j, i]);
    const shuf = a => { for (let k = a.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [a[k], a[r]] = [a[r], a[k]]; } };
    let chosen, jamSegs;
    for (let tries = 0; tries < 60; tries++) {
      shuf(cands); shuf(jamCands);
      chosen = []; jamSegs = [];
      const blocked = new Set(), segs = new Set(), skipM = new Set();
      for (const [j, i] of jamCands) {
        if (jamSegs.length === wantJams) break;
        blocked.add(key('H', j, i, 'L')); blocked.add(key('H', j, i, 'R')); skipM.add(key('M', j, i));
        if (allReachable(blocked, skipM)) { jamSegs.push([j, i]); segs.add(key('H', j, i)); }
        else { blocked.delete(key('H', j, i, 'L')); blocked.delete(key('H', j, i, 'R')); skipM.delete(key('M', j, i)); }
      }
      for (const c of cands) {
        if (chosen.length === want) break;
        const seg = key(c[0], c[1], c[2]);
        if (segs.has(seg)) continue;               // no máximo uma barreira por trecho
        blocked.add(key(...c));
        if (allReachable(blocked, skipM)) { chosen.push(c); segs.add(seg); } else blocked.delete(key(...c));
      }
      if (chosen.length === want && jamSegs.length === wantJams) break;
    }
    const jamPool = pools.jam;
    jamSegs.forEach(([j, i], n) => {
      let b = jamPool[n];
      if (!b) { b = jamPool[n] = buildJam(); group.add(b); }
      b.visible = true;
      b.userData.cars.forEach(c => { c.userData.body.material = mat(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]); });
      const x0 = roadCenter(j) + ROAD / 2 + 0.2, x1 = roadCenter(j + 1) - ROAD / 2 - 0.2, z = roadCenter(i);
      b.position.set((x0 + x1) / 2, TOPO.heightAt((x0 + x1) / 2, z), z);
      const s = { x0, x1, z0: z - ROAD / 2 - 0.1, z1: z + ROAD / 2 + 0.1 };
      s.jam = true;                                // (contador de batidas: carro do engarrafamento)
      SOLIDS.push(s); solids.push(s); jamRects.push(s);
      jammed.push((i - 1) * N + j);                // o lote ao norte do trecho (sua porta dá para este trecho)
    });
    const used = { barrier: 0, truck: 0, hole: 0 };
    chosen.forEach((c, n) => {
      const type = types[(n + Math.floor(Math.random() * types.length)) % types.length];
      const T = TYPES[type];
      let b = pools[type][used[type]];
      if (!b) { b = pools[type][used[type]] = build[type](); group.add(b); }
      used[type]++;
      b.visible = true;
      c.push(type);
      let x, z, alongX;                           // alongX: a rua corre em X (barreira atravessa em Z)
      if (c[0] === 'H') {
        const [, j, i, side] = c;
        x = side === 'L' ? roadCenter(j) + T.offset : roadCenter(j + 1) - T.offset;
        z = roadCenter(i); alongX = true;
      } else {
        const [, j, i] = c;
        x = roadCenter(j); z = (roadCenter(i) + roadCenter(i + 1)) / 2; alongX = false;
      }
      b.position.set(x, TOPO.heightAt(x, z), z);
      if (type === 'barrier') placeObra(b, c, obraMode);
      b.rotation.y = type === 'truck'
        ? (Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4) + (Math.random() < 0.5 ? Math.PI : 0)   // caminhão parado na diagonal
        : alongX ? Math.PI / 2 : 0;
      if (type === 'truck') { b.userData.cargo.material = mat(TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)]); b.userData.helper.reset(); }
      const s = alongX ? { x0: x - T.half, x1: x + T.half, z0: z - T.cross, z1: z + T.cross }
                       : { x0: x - T.cross, x1: x + T.cross, z0: z - T.half, z1: z + T.half };
      s.bar = n;                                   // (contador de batidas e missões das barreiras)
      SOLIDS.push(s); solids.push(s);
      list.push({ id: n, kind: c[0], j: c[1], i: c[2], side: c[0] === 'H' ? c[3] : null, x, z, type });
    });
    current = chosen;
  }

  return { randomize, clear, get current() { return current; }, get count() { return current.length + jammed.length; }, get jammedSlots() { return jammed; }, get jamRects() { return jamRects; }, get list() { return list; } };
}
