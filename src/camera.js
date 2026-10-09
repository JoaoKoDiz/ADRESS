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
function buildCamBoxes() {
  CAM_BOXES.length = 0;
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
  let yaw = Math.PI / 2;                       // direção suavizada da câmera de perseguição
  let slowK = 1;                               // 0 = pose andando, 1 = pose parada (suavizado)
  let focusK = 0;                              // 0..1: quanto a câmera se volta para a casa visitada
  let boomU = 0;                               // 0 = braço inteiro, 1 = encolhido ao máximo (suavizado)
  const tgt = { x: MAP / 2, z: 5 };
  let tgtY = 0;                                // altura da van (voo de helicóptero)
  const focus = { x: 0, z: 0 };
  const overviewPos = new THREE.Vector3();
  const overviewQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-PITCH, 0, 0));
  const chasePos = new THREE.Vector3(), chaseLook = new THREE.Vector3();
  const chaseQuat = new THREE.Quaternion(), m4 = new THREE.Matrix4();

  let focusOff = 0;                            // desvio suavizado na direção da casa
  function focusGoal() {
    if (focusK <= 0) return 0;
    const d = angleDiff(Math.atan2(focus.z - tgt.z, focus.x - tgt.x), yaw);
    return Math.max(-FOCUS_YAW, Math.min(FOCUS_YAW, d)) * focusK;
  }
  // olhar em volta (botão direito do mouse): desvio de giro/inclinação em torno da van; volta ao soltar
  let orbYaw = 0, orbPitch = 0, orbGoalYaw = 0, orbGoalPitch = 0, orbK = 0, orbHeld = false;
  function camYaw() { return yaw + focusOff + orbYaw; }
  const baseDist = () => CHASE_DIST + (SLOW_DIST - CHASE_DIST) * slowK;
  const baseHeight = () => CHASE_HEIGHT + (SLOW_HEIGHT - CHASE_HEIGHT) * slowK;

  /** Menor encolhimento u (0..1) do braço que deixa a linha van→câmera livre de casas e dentro do mapa. */
  function clearBoom() {
    const cy = camYaw(), fx = Math.cos(cy), fz = Math.sin(cy);
    const D = baseDist(), H = baseHeight();
    const free = u => {
      const d = D + (BOOM_MIN_DIST - D) * u, h = H + (BOOM_TOP_HEIGHT - H) * u;
      const cx = tgt.x - fx * d, cz = tgt.z - fz * d;
      // só segura a câmera dentro da sebe enquanto a van está no bairro (fora dele, o mundo é livre)
      const inside = tgt.x > 0 && tgt.x < MAP && tgt.z > 0 && tgt.z < MAP;
      if (inside && (cx < CAM_LIM0 || cx > CAM_LIM1 || cz < CAM_LIM0 || cz > CAM_LIM1)) return false;
      return !segmentBlocked(tgt.x, tgt.z, cx, h, cz);
    };
    if (free(0)) return 0;
    let lo = 0, hi = -1;
    for (let u = 0.125; u <= 1.0001; u += 0.125) { if (free(u)) { hi = u; break; } lo = u; }
    if (hi < 0) return 1;
    for (let i = 0; i < 5; i++) { const m = (lo + hi) / 2; if (free(m)) hi = m; else lo = m; }
    return hi;
  }

  function apply() {
    const cy = camYaw(), fx = Math.cos(cy), fz = Math.sin(cy);
    const D = baseDist(), H = baseHeight();
    const d = D + (BOOM_MIN_DIST - D) * boomU, h = H + (BOOM_TOP_HEIGHT - H) * boomU;
    chasePos.set(tgt.x - fx * d, h, tgt.z - fz * d);
    if (Math.abs(orbPitch) > 1e-4) {            // inclinação: gira o braço para cima/baixo em torno do pivô
      const dy = h - PIVOT_Y, r = Math.hypot(d, dy);
      const el = THREE.MathUtils.clamp(Math.atan2(dy, d) + orbPitch, 0.12, 1.45);
      chasePos.set(tgt.x - fx * r * Math.cos(el), PIVOT_Y + r * Math.sin(el), tgt.z - fz * r * Math.cos(el));
    }
    const hx = Math.cos(yaw), hz = Math.sin(yaw);
    chaseLook.set(tgt.x + hx * CHASE_LOOK_AHEAD, CHASE_LOOK_Y, tgt.z + hz * CHASE_LOOK_AHEAD);
    if (focusK > 0) {                          // entregando: olha para o meio do caminho entre a van e a casa
      const k = 0.55 * focusK;
      chaseLook.x += (focus.x - chaseLook.x) * k;
      chaseLook.z += (focus.z - chaseLook.z) * k;
      chaseLook.y += (1.6 - chaseLook.y) * k;
    }
    if (orbK > 0) {                            // olhando em volta: mira na van em vez de à frente dela
      chaseLook.x += (tgt.x - chaseLook.x) * orbK; chaseLook.z += (tgt.z - chaseLook.z) * orbK;
      chaseLook.y += (PIVOT_Y - chaseLook.y) * orbK;
    }
    chasePos.y += tgtY; chaseLook.y += tgtY;                  // acompanha a altura do helicóptero
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

  const slowGoal = speed => Math.max(0, Math.min(1, (6 - Math.abs(speed || 0)) / 4));
  function setFocus(f) { if (f) { focus.x = f.x; focus.z = f.z; } }

  /** target: { x, z, heading, speed?, focus? } da van (focus = ponto da casa sendo visitada, ou null). */
  function snap(target) {
    tgt.x = target.x; tgt.z = target.z; tgtY = target.y || 0;
    if (target.heading !== undefined) yaw = target.heading;
    slowK = slowGoal(target.speed);
    setFocus(target.focus);
    focusK = target.focus ? 1 : 0;
    focusOff = focusGoal();
    blend = mode === 'chase' ? 1 : 0;
    boomU = clearBoom();
    apply();
  }

  function update(dt, target) {
    tgt.x = target.x; tgt.z = target.z; tgtY = target.y || 0;
    if (target.heading !== undefined) yaw += angleDiff(target.heading, yaw) * (1 - Math.exp(-CHASE_YAW_SMOOTH * dt));
    slowK += (slowGoal(target.speed) - slowK) * (1 - Math.exp(-2.5 * dt));
    setFocus(target.focus);
    focusK += ((target.focus ? 1 : 0) - focusK) * (1 - Math.exp(-3 * dt));
    if (focusK < 1e-3 && !target.focus) focusK = 0;
    focusOff += (focusGoal() - focusOff) * (1 - Math.exp(-2.5 * dt));
    const spring = 1 - Math.exp(-(orbHeld ? 14 : 5) * dt);   // segue o mouse; solto, volta para trás da van
    orbYaw += (orbGoalYaw - orbYaw) * spring; orbPitch += (orbGoalPitch - orbPitch) * spring;
    orbK += ((orbHeld || Math.abs(orbYaw) + Math.abs(orbPitch) > 0.02 ? 1 : 0) - orbK) * (1 - Math.exp(-6 * dt));
    if (!orbHeld && Math.abs(orbYaw) + Math.abs(orbPitch) < 1e-3 && orbGoalYaw === 0 && orbGoalPitch === 0) { orbYaw = orbPitch = 0; if (orbK < 1e-3) orbK = 0; }
    // braço: encolhe rápido (nunca atravessa um telhado), volta devagar (sem trancos)
    const want = clearBoom();
    boomU += (want - boomU) * (1 - Math.exp(-(want > boomU ? 18 : 2.5) * dt));
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
    /** Botão direito pressionado/solto: começa/termina de olhar em volta (só na câmera atrás da van). */
    orbitHold(on) { orbHeld = on && mode === 'chase'; if (!orbHeld) { orbGoalYaw = 0; orbGoalPitch = 0; } },
    /** Arrasto do mouse (pixels) enquanto o botão direito está pressionado. */
    orbit(dx, dy) {
      if (!orbHeld) return;
      orbGoalYaw = THREE.MathUtils.clamp(orbGoalYaw + dx * 0.006, -Math.PI, Math.PI);
      orbGoalPitch = THREE.MathUtils.clamp(orbGoalPitch + dy * 0.004, -0.6, 0.9);
    },
    /** O bairro mudou de tamanho (ex.: Bairro 2, 6×6): refaz enquadramento e obstáculos da câmera. */
    refit() { rebuildGrid(); resize(lastW, lastH); },
  };
}
