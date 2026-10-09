// Câmera do jogo, dois modos:
//   'chase' (padrão): terceira pessoa, atrás e acima da van, girando com ela. O braço da câmera encolhe (e sobe)
//     quando uma casa ou a placa da entrada ficaria entre a van e a lente, e nunca sai para trás da sebe.
//     Parada, a câmera sobe para olhar por cima dos telhados; entregando, vira um pouco para a casa visitada.
//   'overview' (tecla C): visão fixa do SUL, com o bairro inteiro enquadrado na tela.
import * as THREE from 'three';
import { MAP, HOUSE_SLOTS, GAS_LIST, GAS_PARTS, BUILD_H, slotOrigin, LOT_ANCHORS, ENTRANCE } from './layout.js';

const PITCH = THREE.MathUtils.degToRad(57);   // inclinação para baixo
const FOV = 32;                               // campo de visão vertical (graus): pouca diferença de escala entre fileiras
const TAN_V = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const TRANSITION = 0.6;                       // segundos para alternar entre os modos
const FOLLOW_SPAN = 46;                       // menor lado (em unidades) da área de chão mostrada no modo perto
const FOLLOW_SMOOTH = 5;                      // rapidez com que o modo perto alcança a van
// até onde o modo perto pode mostrar além das bordas do mapa (ao norte cabe a placa da entrada)
const FOLLOW_X0 = -3, FOLLOW_X1 = MAP + 3, FOLLOW_Z0 = -6, FOLLOW_Z1 = MAP + 3;

// Base da câmera: direita (R), cima da tela (U) e frente (F).
const R = new THREE.Vector3(1, 0, 0);
const U = new THREE.Vector3(0, Math.cos(PITCH), -Math.sin(PITCH));
const F = new THREE.Vector3(0, -Math.sin(PITCH), -Math.cos(PITCH));

// Pontos que precisam caber na visão geral: o chão do mapa, o topo da sebe nas quinas,
// a entrada com a placa (até y≈4.6 na borda norte) e os telhados altos da fileira norte.
// (refeitos quando o bairro mude de tamanho — ver rebuildGrid)
let FIT_A = [], FIT_B = [], FIT_D = [];
function buildFit() {
  const pts = [];
  for (const x of [0, MAP]) {
    for (const z of [0, MAP]) pts.push([x, 0, z], [x, 1.6, z]);
    pts.push([x, 4.6, 0], [x, BUILD_H > 20 ? BUILD_H * 0.75 : 9, 10]);
  }
  // coordenadas de cada ponto na base da câmera
  FIT_A = pts.map(p => p[0]);
  FIT_B = pts.map(p => p[1] * U.y + p[2] * U.z);
  FIT_D = pts.map(p => p[1] * F.y + p[2] * F.z);
}

/**
 * Equilibra as margens em um eixo da tela: acha o deslocamento c (entre lo e hi) tal que
 * o ponto mais extremo de um lado fique tão longe da borda quanto o do outro lado.
 */
function balance(coords, D, lo, hi) {
  if (!(hi > lo)) return (lo + hi) / 2;
  for (let it = 0; it < 48; it++) {
    const c = (lo + hi) / 2;
    let mx = -Infinity, mn = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const s = (coords[i] - c) / (FIT_D[i] - D);
      if (s > mx) mx = s;
      if (s < mn) mn = s;
    }
    if (mx + mn > 0) lo = c; else hi = c;
  }
  return (lo + hi) / 2;
}

/**
 * Posição da visão geral: com a orientação fixa, a câmera mais próxima possível (maior D ao longo de F)
 * que ainda mantém todos os FIT_POINTS dentro da tela, descontadas as margens (kx, ky em NDC).
 */
function fitOverview(aspect, kx, ky, out) {
  const Kh = kx * TAN_V * aspect, Kv = ky * TAN_V;
  let ah = Infinity, bh = Infinity, av = Infinity, bv = Infinity;
  for (let i = 0; i < FIT_D.length; i++) {
    const a = FIT_A[i], b = FIT_B[i], d = FIT_D[i];
    ah = Math.min(ah, d - a / Kh); bh = Math.min(bh, d + a / Kh);
    av = Math.min(av, d - b / Kv); bv = Math.min(bv, d + b / Kv);
  }
  // Cada par de planos (esquerda/direita, cima/baixo) permite no máximo D = (α + β) / 2.
  const D = Math.min((ah + bh) / 2, (av + bv) / 2);
  const A = balance(FIT_A, D, Kh * (D - ah), Kh * (bh - D));
  const B = balance(FIT_B, D, Kv * (D - av), Kv * (bv - D));
  return out.set(0, 0, 0).addScaledVector(R, A).addScaledVector(U, B).addScaledVector(F, D);
}

const smooth = t => t * t * (3 - 2 * t);

// ---- Modo 'chase' (terceira pessoa): atrás e acima da van, girando junto com ela ----
const CHASE_FOV = 55;
const CHASE_DIST = 13;          // distância atrás da van (andando)
const CHASE_HEIGHT = 8.5;       // altura da câmera (andando)
const SLOW_DIST = 9;            // parada/devagar: mais perto e mais alta, olhando por cima dos telhados
const SLOW_HEIGHT = 13;         //   (dá para ver os quintais da frente mesmo estando atrás das casas)
const BOOM_MIN_DIST = 4.5;      // braço encolhido ao máximo (quando algo fica entre a van e a câmera)
const BOOM_TOP_HEIGHT = 14.5;   //   … e a altura correspondente: encolher = subir e olhar mais para baixo
const FIXED_DIST = 11.5, FIXED_HEIGHT = 10;   // braço da câmera (fixo; a van parada ou em movimento tem o mesmo enquadramento)
const R0 = Math.hypot(FIXED_DIST, FIXED_HEIGHT - 2.2), EL0 = Math.atan2(FIXED_HEIGHT - 2.2, FIXED_DIST);   // distância e elevação padrão do braço (PIVOT_Y = 2,2)
const MIN_RADIUS = 3.2, MIN_ZOOM = 0.28;      // aproximação máxima
const MIN_ELEV = 0.1, MAX_ELEV = 1.5;         // inclinação mínima/máxima do braço (rad)
const CHASE_LOOK_AHEAD = 6;     // ponto olhado fica um pouco à frente da van
const CHASE_LOOK_Y = 1.2;
const CHASE_YAW_SMOOTH = 3.2;   // rapidez com que a câmera alcança a direção da van nas curvas
const FOCUS_YAW = 0.5;          // entregando: gira até ~29° na direção da casa visitada
const PIVOT_Y = 2.2;            // o braço sai daqui (meio da van)
const UP = new THREE.Vector3(0, 1, 0);

// Obstáculos do braço da câmera: a casa de cada lote (todas iguais: paredes, telhado e objetos até ~9.2 de altura)
// e a placa da entrada. Caixas [x0, z0, x1, z1, yTopo], já com folga (plano near = 1).
const CAM_PAD = 1.0;
const CAM_BOXES = [];
const EXTRA_BOXES = [];          // caixas extras fora do bairro (ex.: paredes da igreja), sem folga: [x0, z0, x1, z1, yTopo]
function buildCamBoxes() {
  CAM_BOXES.length = 0;
  for (const b of EXTRA_BOXES) CAM_BOXES.push([b[0] - CAM_PAD * 0.6, b[1] - CAM_PAD * 0.6, b[2] + CAM_PAD * 0.6, b[3] + CAM_PAD * 0.6, b[4]]);
  for (const s of HOUSE_SLOTS) {
    const o = slotOrigin(s), H = LOT_ANCHORS.house;
    CAM_BOXES.push([o.x + H.x0 - 0.7 - CAM_PAD, o.z + H.z0 - 0.7 - CAM_PAD, o.x + H.x1 + 0.7 + CAM_PAD, o.z + H.z1 + 1.1 + CAM_PAD, BUILD_H + CAM_PAD]);
  }
  for (const g of GAS_LIST) {                                 // postos: loja e totem (a van entra; a cobertura some)
    const o = slotOrigin(g.slots[0]);
    for (const [k, top] of [[0, 3.7], [7, 7.3]]) {
      const [x0, z0, x1, z1] = GAS_PARTS[k];
      CAM_BOXES.push([o.x + x0 - CAM_PAD, o.z + z0 - CAM_PAD, o.x + x1 + CAM_PAD, o.z + z1 + CAM_PAD, top + CAM_PAD]);
    }
  }
  const sx = ENTRANCE.x0 - 7.6;                               // placa "VILA ADRESS" (world.js)
  CAM_BOXES.push([sx - 5.8 - CAM_PAD, -0.4 - CAM_PAD, sx + 5.8 + CAM_PAD, 1.8 + CAM_PAD, 4.2 + CAM_PAD]);
  for (const x of [ENTRANCE.x0 - 0.5, ENTRANCE.x1 + 0.5]) {  // pilares do portal
    CAM_BOXES.push([x - 0.7 - CAM_PAD, 0.1 - CAM_PAD, x + 0.7 + CAM_PAD, 1.5 + CAM_PAD, 3.3 + CAM_PAD]);
  }
}
// A câmera não sai para trás da sebe (senão a sebe e a placa cobrem a parte de baixo da tela).
const CAM_LIM0 = -0.5;
let CAM_LIM1 = MAP + 0.5;
/** Refaz tudo que depende do tamanho do bairro (enquadramento da visão geral, casas que bloqueiam a câmera). */
function rebuildGrid() { buildFit(); buildCamBoxes(); CAM_LIM1 = MAP + 0.5; }
rebuildGrid();

/** O segmento P→C (P no pivô) atravessa alguma caixa? (método das placas; as caixas vão do chão até yTopo) */
function segmentBlocked(px, pz, cx, cy, cz) {
  const dx = cx - px, dy = cy - PIVOT_Y, dz = cz - pz;
  const mnx = Math.min(px, cx), mxx = Math.max(px, cx), mnz = Math.min(pz, cz), mxz = Math.max(pz, cz);
  for (let i = 0; i < CAM_BOXES.length; i++) {
    const b = CAM_BOXES[i];
    if (mxx < b[0] || mnx > b[2] || mxz < b[1] || mnz > b[3]) continue;
    let t0 = 0, t1 = 1;
    if (Math.abs(dx) > 1e-9) {
      let a = (b[0] - px) / dx, c = (b[2] - px) / dx;
      if (a > c) { const k = a; a = c; c = k; }
      if (a > t0) t0 = a; if (c < t1) t1 = c;
    } else if (px < b[0] || px > b[2]) continue;
    if (Math.abs(dz) > 1e-9) {
      let a = (b[1] - pz) / dz, c = (b[3] - pz) / dz;
      if (a > c) { const k = a; a = c; c = k; }
      if (a > t0) t0 = a; if (c < t1) t1 = c;
    } else if (pz < b[1] || pz > b[3]) continue;
    if (t0 > t1) continue;
    // abaixo do topo da caixa: y(t) = PIVOT_Y + dy·t ≤ yTopo
    if (dy > 1e-9) { const a = (b[4] - PIVOT_Y) / dy; if (a < t1) t1 = a; }
    else if (PIVOT_Y > b[4]) continue;
    if (t0 <= t1) return true;
  }
  return false;
}

const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

export function createCameraRig() {
  const camera = new THREE.PerspectiveCamera(CHASE_FOV, 1, 1, 1600);

  let mode = 'chase';                          // 'chase' (padrão, atrás da van) | 'overview' (bairro inteiro)
  let blend = 1;                               // 0 = visão geral, 1 = atrás da van (antes do smoothstep)
  let aspect = 1;
  let yaw = Math.PI / 2;                       // direção (suavizada) em que a van/personagem aponta
  const tgt = { x: MAP / 2, z: 5 };            // posição real do alvo
  let tgtY = 0;                                // altura do alvo (voo de helicóptero)
  const piv = new THREE.Vector3(MAP / 2, PIVOT_Y, 5);   // pivô da câmera: segue o alvo com um leve amortecimento (filtra tremidas da física)
  const overviewPos = new THREE.Vector3();
  const overviewQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-PITCH, 0, 0));
  const chasePos = new THREE.Vector3(), chaseLook = new THREE.Vector3(), dir = new THREE.Vector3(), tmp = new THREE.Vector3();
  const chaseQuat = new THREE.Quaternion(), m4 = new THREE.Matrix4();

  // ---- câmera do jogador: botão direito arrastando = girar/inclinar; roda = zoom (só aproxima). Nada muda sozinho.
  let orbYaw = 0, orbPitch = 0;                // posição atual (suavizada)
  let goalYaw = 0, goalPitch = 0;              // posição pedida pelo mouse
  let velYaw = 0, velPitch = 0;                // velocidade do mouse (rad/s), suavizada: dá inércia curta ao soltar
  let orbHeld = false, zoom = 1, zoomGoal = 1;
  let arm = R0;                                // comprimento atual do braço (suavizado); encolhe quando algo fica entre a van e a câmera
  const camYaw = () => yaw + orbYaw;

  /** Direção (unitária) do pivô para a câmera: atrás da van no giro atual, inclinada pela elevação atual. */
  function rayDir(out) {
    const cy = camYaw(), el = THREE.MathUtils.clamp(EL0 + orbPitch, MIN_ELEV, MAX_ELEV);
    return out.set(-Math.cos(cy) * Math.cos(el), Math.sin(el), -Math.sin(cy) * Math.cos(el));
  }
  /** O ponto a distância r do pivô, nessa direção, é uma posição livre (dentro da sebe, sem casa entre ele e a van)? */
  function freeAt(r, d) {
    const cx = piv.x + d.x * r, cy = piv.y - tgtY + d.y * r, cz = piv.z + d.z * r;
    const inside = tgt.x > 0 && tgt.x < MAP && tgt.z > 0 && tgt.z < MAP;      // só segura a câmera dentro da sebe enquanto está no bairro
    if (inside && (cx < CAM_LIM0 || cx > CAM_LIM1 || cz < CAM_LIM0 || cz > CAM_LIM1)) return false;
    return !segmentBlocked(piv.x, piv.z, cx, cy, cz);
  }
  /** Maior distância (≤ a pedida pelo zoom) que fica livre ao longo do raio: a câmera para na frente da primeira parede/casa. */
  function armGoal(wanted, d) {
    if (freeAt(wanted, d)) return wanted;
    let lo = MIN_RADIUS, hi = wanted;
    for (let r = MIN_RADIUS; r < wanted; r += 0.5) { if (!freeAt(r, d)) { hi = r; break; } lo = r; }
    for (let i = 0; i < 6; i++) { const m = (lo + hi) / 2; if (freeAt(m, d)) lo = m; else hi = m; }
    return Math.max(MIN_RADIUS, lo - 0.15);
  }

  function apply() {
    rayDir(dir);
    chasePos.set(piv.x + dir.x * arm, piv.y + dir.y * arm, piv.z + dir.z * arm);
    // onde olhar: um pouco à frente da van; quanto mais o jogador gira/inclina, mais a mira volta para a van (transição contínua, sem saltos)
    const k = smooth(Math.min(1, Math.abs(orbYaw) / 0.7 + Math.abs(orbPitch) / 0.5));
    const hx = Math.cos(yaw), hz = Math.sin(yaw);
    chaseLook.set(piv.x + hx * CHASE_LOOK_AHEAD * (1 - k), piv.y - PIVOT_Y + CHASE_LOOK_Y + (PIVOT_Y - CHASE_LOOK_Y) * k, piv.z + hz * CHASE_LOOK_AHEAD * (1 - k));
    chaseQuat.setFromRotationMatrix(m4.lookAt(chasePos, chaseLook, UP));
    const b = smooth(blend);
    camera.position.lerpVectors(overviewPos, chasePos, b);
    camera.quaternion.slerpQuaternions(overviewQuat, chaseQuat, b);
    const fov = FOV + (CHASE_FOV - FOV) * b;
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  let lastW = 1600, lastH = 900;
  function resize(w, h) {
    w = Math.max(1, w); h = Math.max(1, h);
    lastW = w; lastH = h;
    aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // margem pequena (em pixels) em volta do mapa
    const m = Math.max(8, 0.012 * Math.min(w, h));
    fitOverview(aspect, Math.max(0.5, 1 - 2 * m / w), Math.max(0.5, 1 - 2 * m / h), overviewPos);
    apply();
  }

  /** target: { x, z, heading, y? } do alvo (van ou personagem a pé). */
  function snap(target) {
    tgt.x = target.x; tgt.z = target.z; tgtY = target.y || 0;
    piv.set(tgt.x, PIVOT_Y + tgtY, tgt.z);
    if (target.heading !== undefined) yaw = target.heading;
    orbYaw = goalYaw = orbPitch = goalPitch = 0; velYaw = velPitch = 0; zoom = zoomGoal = 1;      // partida/tela nova: câmera padrão
    blend = mode === 'chase' ? 1 : 0;
    rayDir(dir); arm = armGoal(Math.max(MIN_RADIUS, R0 * zoom), dir);
    apply();
  }

  function update(dt, target) {
    dt = Math.min(dt, 0.1);
    tgt.x = target.x; tgt.z = target.z; tgtY = target.y || 0;
    if (target.heading !== undefined) yaw += angleDiff(target.heading, yaw) * (1 - Math.exp(-CHASE_YAW_SMOOTH * dt));
    // pivô: acompanha o alvo quase colado (a câmera não tem "pose" própria, só segue)
    const kp = 1 - Math.exp(-26 * dt), kh = 1 - Math.exp(-14 * dt);
    piv.x += (tgt.x - piv.x) * kp; piv.z += (tgt.z - piv.z) * kp; piv.y += (PIVOT_Y + tgtY - piv.y) * kh;
    // mouse → giro/inclinação: o ponto pedido anda com o mouse; a câmera o alcança com uma mola crítica (sem trancos e sem oscilar)
    const gk = 1 - Math.exp(-(orbHeld ? 30 : 14) * dt);
    const ny = orbYaw + (goalYaw - orbYaw) * gk, np = orbPitch + (goalPitch - orbPitch) * gk;
    velYaw += ((ny - orbYaw) / dt - velYaw) * (1 - Math.exp(-20 * dt)); velPitch += ((np - orbPitch) / dt - velPitch) * (1 - Math.exp(-20 * dt));
    orbYaw = ny; orbPitch = np;
    zoom += (zoomGoal - zoom) * (1 - Math.exp(-11 * dt));
    // braço (distância): para na frente de paredes/casas; encolhe depressa mas nunca de repente, e só volta devagar (sem "pulsar")
    rayDir(dir);
    const want = armGoal(Math.max(MIN_RADIUS, R0 * zoom), dir);
    arm += (want - arm) * (1 - Math.exp(-(want < arm ? 12 : 2.2) * dt));
    const wantB = mode === 'chase' ? 1 : 0;
    const stepB = dt / TRANSITION;
    blend = wantB > blend ? Math.min(wantB, blend + stepB) : Math.max(wantB, blend - stepB);
    apply();
  }

  function toggle() { mode = mode === 'chase' ? 'overview' : 'chase'; }

  resize(1600, 900);
  return {
    camera,
    get mode() { return mode; },
    /** 0 = visão geral … 1 = atrás da van (já suavizado). */
    get blend() { return smooth(blend); },
    toggle, resize, update, snap,
    /** Botão direito pressionado/solto: começa/termina de girar a câmera (só atrás da van). */
    orbitHold(on) { orbHeld = on && mode === 'chase'; },
    /** Movimento do mouse em pixels (enquanto o botão direito está pressionado). */
    orbit(dx, dy) {
      if (!orbHeld) return;
      goalYaw += dx * 0.0055;                                                   // sem limite: dá para dar voltas completas
      if (Math.abs(goalYaw) > Math.PI * 6) { const w = Math.round(goalYaw / (Math.PI * 2)) * Math.PI * 2; goalYaw -= w; orbYaw -= w; }   // (reenrola sem salto visível)
      goalPitch = THREE.MathUtils.clamp(goalPitch + dy * 0.0045, -0.7, 1.0);
    },
    /** Roda do mouse (deltaY em pixels): aproxima (negativo) ou afasta de volta (positivo), sem passar da distância normal. */
    zoom(deltaY) {
      if (mode !== 'chase') return;
      zoomGoal = THREE.MathUtils.clamp(zoomGoal * Math.exp(THREE.MathUtils.clamp(deltaY, -300, 300) * 0.0011), MIN_ZOOM, 1);
    },
    /** Volta à câmera padrão (sem giro nem zoom). */
    resetView() { goalYaw = goalPitch = 0; zoomGoal = 1; },
    /** O bairro mudou de tamanho (ex.: Bairro 2, 6×6): refaz enquadramento e obstáculos da câmera. */
    refit() { rebuildGrid(); resize(lastW, lastH); },
    /** Caixas extras que seguram o braço da câmera ([x0, z0, x1, z1, yTopo]); [] tira. */
    setExtraBoxes(list) { EXTRA_BOXES.length = 0; EXTRA_BOXES.push(...list); buildCamBoxes(); },
  };
}
