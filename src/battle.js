// Batalha depois do 4º nível extra (Sacrifício). Cena própria: vazio preto, só a grade branca no chão da área.
// Três personagens fixos (não andam): o jogador (todo branco) numa ponta, a figura escura na outra, o K entre os dois.
// O jogador controla só um círculo no chão (WASD / joystick) e uma ação (clique esquerdo, Espaço ou o botão de toque).
// Cada trecho tem UM mecanismo: Bloquear (barreira no círculo), Refletir (desenhar uma parede que devolve o projétil)
// ou Firmar (segurar no núcleo de uma região apagada e acompanhar a área que gira até a grade se recompor).
// Estrutura fixa: 18 trechos, 8 fragmentos e o ponto final (fragmentos/final = pausas neutras provisórias, com ganchos).
// Sem música; só efeitos curtos procedurais pela saída de efeitos.
import * as THREE from 'three';
import { buildStandingReader, reachArm } from './models/reader.js';
import { buildBody } from './models/driver.js';

export const BATTLE_CP_KEY = 'adress.dev.battle';   // teste pelo cadeado: libera o cartão Sacrifício para começar a batalha

// ---------- constantes (fáceis de ajustar) ----------
const GRID = { x0: -6.5, x1: 6.5, z0: -9, z1: 9, cell: 1 };          // X = lados, Z = comprimento (figura em −Z, jogador em +Z)
const P_POS = new THREE.Vector3(-1.0, 0, 8.4), K_POS = new THREE.Vector3(1.7, 0, 2.6), F_POS = new THREE.Vector3(0, 0, -11);
const F_SCALE = [4.6, 5.0, 4.6];
const FACE_NZ = Math.PI / 2, FACE_PZ = -Math.PI / 2;                 // os modelos olham para +X: π/2 → −Z, −π/2 → +Z
const H_PROJ = 1.05, PR = 0.2, HIT_R = 0.45;                          // altura de voo, raio do projétil, raio do alvo
// câmera fixa (ajustada por screenshots: jogador à esquerda em primeiro plano, K no centro, a figura inteira à direita, mais longe);
// fov = vertical em 16:9; em telas mais estreitas ele abre para manter a mesma largura de visão (até 80°)
const CAM = { angle: 128, dist: 10.5, height: 5.0, fov: 50, look: new THREE.Vector3(-0.4, 2.3, -3.0) };
const CIRCLE_R = 0.36, CIRCLE_SPEED = 6.5, CIRCLE_HOME = { x: 0, z: 5.5 };
const WARN = 1.0;                                                     // aviso antes de cada disparo (s)
const DMG = { P: 20, K: 34, K2: 28 }, REGEN = { wait: 5, rate: 4 };   // estabilidade: dano por impacto e regeneração lenta
const BLOCK = { r: 0.55, h: 1.6, rise: 0.16, life: 1.8, max: 3, cooldown: 0.18 };
// Refletir: lei pura v' = v − 2(v·n)n; única exceção (assist): se a volta passa a ≤ REFL.assist (0,09 rad ≈ 5°) da
// estrutura que disparou, segue até ela (parede quase perpendicular, ex. desenhada no joystick). Com o teclado as retas
// saem a 0°/45°/90° e devolvem exatas.
const REFL = { step: 0.3, maxLen: 7.0, eps: 0.15, minSeg: 0.45, h: 1.6, life: 3.5, maxWalls: 2, minLen: 0.6, assist: 0.09 };
const STRUCT = { hitR: 0.95 };
// Firmar (protótipo): R = raio da região apagada; reach = distância ao núcleo para começar; zoneR/orbitR/orbitSpeed/wobble =
// a área de acompanhamento; fill/decay = progresso por segundo (dentro segurando / fora); threatTime = tempo até a raiz
// chegar ao personagem; threatRepeat = fração do tempo para o pulso seguinte.
const FIRM = { R: 2.4, reach: 0.6, zoneR: 0.62, orbitR: 1.25, orbitSpeed: 0.5, wobble: 0.3, fill: 1 / 8, decay: 0.06, threatTime: 24, threatRepeat: 0.8 };
// Autonomia do K por nível (gap = intervalo mínimo entre defesas; chance por projétil; hesitate = tempo do gesto;
// self = defende a si mesmo; other = chance de proteger o jogador)
const K_DEF = [null, { gap: 9, chance: 0.35, hesitate: 0.7, self: true, other: 0 }, { gap: 6, chance: 0.5, hesitate: 0.5 }, { gap: 4.5, chance: 0.65, hesitate: 0.4 }, { gap: 3.5, chance: 0.7, hesitate: 0.3, other: 0.45 }];
const kDef = l => Object.assign({}, K_DEF[1], K_DEF[l]);
const T = { fadeIn: 0.7, intro: 1.9, clear: 1.0, out: 0.7, freeze: 0.35, failMsg: 1.0, frag: 2.2, end: 2.5 };
const BOUND = { x: 14, z: 16 };
// fissuras suspensas nas laterais (fora da grade)
const FIS = { L1: [-8.4, -6.5], L2: [-8.4, -3.5], L3: [-8.4, -0.5], R1: [8.4, -6.5], R2: [8.4, -2.5], R3: [8.4, 1.5] };
const COLOR_HEX = { azul: '#003EFF', verde: '#00C000', laranja: '#FCA600', roxo: '#9B00FF' };

// ---------- estrutura: 18 trechos (S), 8 fragmentos (F) e o final (E) ----------
const STEPS = (() => {
  const out = []; let s = 0, f = 0;
  const S = () => out.push({ k: 'S', seg: s++ }), F = (color, pass) => out.push({ k: 'F', index: f++, color, pass });
  S(); S(); F('azul', 1); S(); S(); F('verde', 1); S(); S(); F('laranja', 1); S(); S(); F('roxo', 1);
  S(); S(); S(); F('azul', 2); S(); S(); F('verde', 2); S(); S(); F('laranja', 2); S(); S(); F('roxo', 2); S();
  out.push({ k: 'E' });
  return out;
})();

/** Gerador determinístico (cada trecho sempre igual, inclusive ao recomeçar). */
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const ORIGINS = ['fig', 'fig', 'L1', 'L2', 'L3', 'R1', 'R2', 'R3'];
const sideOf = o => o[0] === 'L' ? 'L' : o[0] === 'R' ? 'R' : 'F';
/** Disparos de um trecho de Bloquear: [t (início do aviso), origem, alvo, velocidade]. Lados opostos seguidos só com folga. */
function genShots(seed, n, gap, v0, v1, pair = 0) {
  const r = rng(seed), out = []; let t = 0, prev = 'fig';
  for (let i = 0; i < n; i++) {
    let from = ORIGINS[Math.floor(r() * ORIGINS.length)];
    const g = gap * (0.85 + 0.3 * r());
    if (i && sideOf(from) !== 'F' && sideOf(prev) !== 'F' && sideOf(from) !== sideOf(prev)) from = 'fig';
    out.push([+t.toFixed(2), from, r() < 0.55 ? 'K' : 'P', +(v0 + (v1 - v0) * r()).toFixed(2)]);
    if (pair && i < n - 1 && r() < pair) {                     // par quase junto, do mesmo lado (os dois pedem barreiras perto)
      i++; out.push([+(t + 0.55).toFixed(2), sideOf(from) === 'F' ? 'fig' : from, out[out.length - 1][2] === 'K' ? 'P' : 'K', +(v0 + (v1 - v0) * r()).toFixed(2)]);
      t += 0.55;
    }
    prev = from; t += g;
  }
  return out;
}
// estruturas: { x, z, target, period, speed, phase } — em linha reta (0°/45°/90°) até o alvo, para a parede devolver
const SK = (dx, dz, d) => ({ x: +(K_POS.x + dx * d).toFixed(2), z: +(K_POS.z + dz * d).toFixed(2), target: 'K' });
const SP = (dx, dz, d) => ({ x: +(P_POS.x + dx * d).toFixed(2), z: +(P_POS.z + dz * d).toFixed(2), target: 'P' });
const st = (o, period, speed, phase) => Object.assign(o, { period, speed, phase });
const D = Math.SQRT1_2;
// posições conferidas pela câmera: estruturas longe da cabeça do jogador na tela; núcleos na metade de perto da grade
const SA = () => SK(-D, -D, 13), SB = () => SK(D, -D, 9.6), SC = () => SP(D, -D, 12.6), SD = () => SP(-D, -D, 14);
const SEGMENTS = [
  { mech: 'block', shots: [[0, 'fig', 'K', 5.5], [3.6, 'fig', 'K', 5.5], [7.2, 'fig', 'K', 5.8]] },                         // 1 introdução: poucos, lentos, só no K
  { mech: 'block', shots: [[0, 'fig', 'K', 6], [2.6, 'L2', 'K', 6], [5.2, 'fig', 'P', 6.2], [7.8, 'R2', 'K', 6.2], [10.4, 'fig', 'K', 6.4], [13, 'R3', 'P', 6.2]] },
  { mech: 'reflect', structs: [st(SA(), 5, 5.2, 0.2)] },                                                                      // 3 introdução: 1 estrutura
  { mech: 'reflect', structs: [st(SA(), 5.5, 5.6, 0.2), st(SC(), 5.5, 5.6, 2.8)] },
  { mech: 'firm', cores: [{ x: 4.0, z: 4.5, threat: 'K' }] },                                                                   // 5 introdução: 1 núcleo
  { mech: 'block', shots: genShots(6, 8, 1.9, 6.2, 6.8) },
  { mech: 'reflect', structs: [st(SB(), 5.2, 5.8, 0.2), st(SD(), 5.2, 5.8, 2.7)] },
  { mech: 'firm', cores: [{ x: -3.6, z: 3.0, threat: 'P' }, { x: 4.2, z: 0.4, threat: 'K' }] },                                // 8: dois núcleos
  { mech: 'block', shots: genShots(9, 9, 1.65, 6.4, 7.0) },
  { mech: 'reflect', structs: [st(SA(), 5, 6, 0.2), st(SC(), 5, 6, 1.9), st(SD(), 5, 6, 3.6)] },
  { mech: 'firm', cores: [{ x: 4.0, z: 4.5, threat: 'P', threatTime: 18, orbitSpeed: 0.6 }] },
  { mech: 'block', shots: genShots(12, 10, 1.45, 6.5, 7.2, 0.15) },
  { mech: 'reflect', structs: [st(SB(), 4.8, 6.2, 0.2), st(SD(), 4.8, 6.2, 1.8), st(SA(), 4.8, 6.2, 3.4)], figEvery: 7 },
  { mech: 'firm', cores: [{ x: -3.6, z: 3.0, threat: 'P', threatTime: 22, orbitSpeed: 0.6 }, { x: 4.2, z: 0.4, threat: 'K', threatTime: 22, orbitSpeed: 0.6 }] },
  { mech: 'block', shots: genShots(15, 11, 1.3, 6.8, 7.3, 0.2) },
  { mech: 'reflect', structs: [st(SA(), 4.6, 6.4, 0.2), st(SD(), 4.6, 6.4, 1.4), st(SB(), 4.6, 6.4, 2.6), st(SC(), 4.6, 6.4, 3.8)], figEvery: 6 },
  { mech: 'firm', cores: [{ x: -3.4, z: -0.5, threat: 'P', threatTime: 20, orbitSpeed: 0.7, wobble: 0.4 }, { x: 4.0, z: 4.5, threat: 'K', threatTime: 20, orbitSpeed: 0.7, wobble: 0.4 }] },
  { mech: 'block', shots: genShots(18, 14, 1.1, 7.0, 7.5, 0.25) },                                                           // 18: o mais intenso
];
const LABEL = {
  block: ['BLOQUEAR · clique esquerdo', 'BLOQUEAR · botão Ação'],
  reflect: ['REFLETIR · segure o clique e mova (WASD)', 'REFLETIR · segure o botão Ação e mova'],
  firm: ['FIRMAR · segure o clique no núcleo', 'FIRMAR · segure o botão Ação no núcleo'],
};
const ACTION = { block: 'Bloquear', reflect: 'Refletir', firm: 'Firmar' };

// ---------- geometria 2D ----------
function segDist2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
  let t = L > 1e-9 ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = ax + dx * t - px, ez = az + dz * t - pz; return ex * ex + ez * ez;
}
function segT(ax, az, bx, bz, s) {                                   // cruzamento de dois segmentos (sem raio): fração em AB ou −1
  const d1x = bx - ax, d1z = bz - az, d2x = s.bx - s.ax, d2z = s.bz - s.az, den = d1x * d2z - d1z * d2x;
  if (Math.abs(den) < 1e-9) return -1;
  const ox = s.ax - ax, oz = s.az - az, t = (ox * d2z - oz * d2x) / den, u = (ox * d1z - oz * d1x) / den;
  return t >= 0 && t <= 1 && u >= -0.05 && u <= 1.05 ? t : -1;
}
/** Projétil (raio PR) indo de p0 a p1 encosta no segmento s? Devolve o ponto de contato e a normal do lado de onde veio. */
function wallHit(p0x, p0z, p1x, p1z, s) {
  const d0 = (p0x - s.ax) * s.nx + (p0z - s.az) * s.nz, d1 = (p1x - s.ax) * s.nx + (p1z - s.az) * s.nz;
  const sg = d0 >= 0 ? 1 : -1, a0 = d0 * sg, a1 = d1 * sg;
  if (a1 >= PR || a1 >= a0) return null;                             // não chega à faixa, ou está se afastando
  const t = a0 > PR ? (a0 - PR) / (a0 - a1) : 0;
  const cx = p0x + (p1x - p0x) * t, cz = p0z + (p1z - p0z) * t;
  const u = (cx - s.ax) * s.tx + (cz - s.az) * s.tz;
  if (u < -PR || u > s.len + PR) return null;
  return { cx, cz, nx: s.nx * sg, nz: s.nz * sg };
}
/** Ramer–Douglas–Peucker. */
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0], b = pts[pts.length - 1]; let im = 0, dm = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = Math.sqrt(segDist2(pts[i].x, pts[i].z, a.x, a.z, b.x, b.z)); if (d > dm) { dm = d; im = i; } }
  if (dm <= eps) return [a, b];
  return rdp(pts.slice(0, im + 1), eps).slice(0, -1).concat(rdp(pts.slice(im), eps));
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function mergeShort(pts, min) {                                      // tira pontos internos de segmentos curtos demais
  const out = pts.slice();
  for (let again = true; again && out.length > 2;) {
    again = false;
    for (let i = 1; i < out.length - 1; i++) if (dist(out[i - 1], out[i]) < min || dist(out[i], out[i + 1]) < min) { out.splice(i, 1); again = true; break; }
  }
  return out;
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// ---------- shaders ----------
const GRID_V = `varying vec2 vP; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const GRID_F = `uniform vec4 uReg[4]; uniform float uOn[4]; uniform vec4 uRect; uniform float uAlpha; varying vec2 vP;
void main(){
  if (vP.x < uRect.x || vP.x > uRect.y || vP.y < uRect.z || vP.y > uRect.w) discard;
  vec2 w = max(fwidth(vP), vec2(1e-4));
  vec2 g = abs(fract(vP - 0.5) - 0.5) / w;
  float line = 1.0 - min(min(g.x, g.y) / 1.3, 1.0);                  // linhas finas nos inteiros (anti-alias)
  float dE = min(min(vP.x - uRect.x, uRect.y - vP.x), min(vP.y - uRect.z, uRect.w - vP.y));
  float edge = 1.0 - min(dE / max(w.x, w.y) / 2.2, 1.0);            // borda externa um pouco mais forte
  float keep = 1.0, glow = 0.0;
  for (int i = 0; i < 4; i++) {                                      // regiões escuras: a grade some e se recompõe do núcleo para fora
    if (uOn[i] <= 0.0) continue;
    vec4 r = uReg[i]; float d = length(vP - r.xy);
    float inside = 1.0 - smoothstep(r.z - 0.35, r.z, d);
    float pr = r.w * r.z;
    float rec = r.w > 0.001 ? 1.0 - smoothstep(pr - 0.25, pr + 0.02, d) : 0.0;
    keep = min(keep, mix(1.0, rec, inside * uOn[i]));
    if (r.w > 0.001 && r.w < 0.999) glow = max(glow, exp(-abs(d - pr) * 7.0) * inside * uOn[i] * 0.6);
  }
  float a = max(line * uAlpha * keep, edge * 0.85);
  a = max(a, line * glow);
  if (a < 0.004) discard;
  gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}`;
// fita tracejada no chão (mais legível que linhas de 1 px): aD = distância ao longo do traço
const RIB_V = `attribute float aD; varying float vD; void main(){ vD = aD; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RIB_F = `uniform vec3 uCol; uniform float uOp, uDash, uGap, uShift; varying float vD;
void main(){ if (uGap > 0.0 && mod(vD + uShift, uDash + uGap) > uDash) discard; gl_FragColor = vec4(uCol, uOp); }`;
const ARC_V = `varying vec2 vL; void main(){ vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ARC_F = `uniform float uFrac, uA, uBase; uniform vec3 uCol; varying vec2 vL;
void main(){ float a = atan(vL.x, vL.y); a = (a < 0.0 ? a + 6.2831853 : a) / 6.2831853;
  float al = a <= uFrac ? uA : uBase; if (al < 0.003) discard; gl_FragColor = vec4(uCol, al); }`;
// figura: preta com um contorno (fresnel) cinza-escuro, para a silhueta existir no preto
const RIM_V = `varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RIM_F = `uniform vec3 uRim; uniform float uGlow; varying vec3 vN; varying vec3 vV;
void main(){ float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0); float r = pow(f, 2.0) * 1.2 + uGlow * pow(f, 1.2);
  gl_FragColor = vec4(uRim * r, 1.0); }`;

export function createBattle(ctx) {
  const { input, audio, stage } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(CAM.fov, 16 / 9, 0.05, 300);
  scene.add(new THREE.HemisphereLight('#ffffff', '#202020', 0.45));
  const key = new THREE.DirectionalLight('#ffffff', 1.7); scene.add(key); scene.add(key.target);

  // ---- grade ----
  const regions = [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 1, 0));
  const gridMat = new THREE.ShaderMaterial({
    vertexShader: GRID_V, fragmentShader: GRID_F, transparent: true, depthWrite: false,
    uniforms: { uReg: { value: regions }, uOn: { value: [0, 0, 0, 0] }, uRect: { value: new THREE.Vector4(GRID.x0, GRID.x1, GRID.z0, GRID.z1) }, uAlpha: { value: 0.5 } },
  });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(GRID.x1 - GRID.x0 + 0.2, GRID.z1 - GRID.z0 + 0.2), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.position.set((GRID.x0 + GRID.x1) / 2, 0, (GRID.z0 + GRID.z1) / 2); grid.renderOrder = -1; scene.add(grid);

  // ---- materiais compartilhados ----
  const basic = (color, opacity = 1, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }, o));
  const lineM = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const M = {
    white: basic('#ffffff', 0.9), dark: basic('#050506'), edge: lineM('#ffffff', 0.9), trail: lineM('#ffffff', 0.28),
    // barreiras: cilindro aberto de dois lados → no meio se vêem 2 camadas: 1 − (1 − 0.45)² ≈ 0.7
    barP: basic('#ffffff', 0.45, { side: THREE.DoubleSide }), barK: basic('#cfe0ff', 0.42, { side: THREE.DoubleSide }),
    barLineP: lineM('#ffffff', 0.85), barLineK: lineM('#d6e4ff', 0.85),
    wall: basic('#ffffff', 0.3, { side: THREE.DoubleSide }), wallLine: lineM('#ffffff', 0.9),
    shardW: basic('#ffffff'), shardD: basic('#141418'),
  };
  const arcMat = () => new THREE.ShaderMaterial({ vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false,
    uniforms: { uFrac: { value: 1 }, uA: { value: 0.5 }, uBase: { value: 0.08 }, uCol: { value: new THREE.Color('#ffffff') } } });
  const arcRing = (r0, r1) => { const o = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), arcMat()); o.rotation.x = -Math.PI / 2; return o; };
  const unitCircle = (r, n = 48) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push(Math.cos(a) * r, 0, Math.sin(a) * r); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); return g; };
  /** Fita tracejada no plano XZ (até `max` pontos): set(pts, y) refaz os vértices; count(n) mostra só os n primeiros pontos. */
  function ribbon(max, width, dash, gap, color = '#ffffff', opacity = 0.6) {
    const geo = new THREE.BufferGeometry(), idx = [];
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 6), 3));
    geo.setAttribute('aD', new THREE.BufferAttribute(new Float32Array(max * 2), 1));
    for (let i = 0; i < max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({ vertexShader: RIB_V, fragmentShader: RIB_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color(color) }, uOp: { value: opacity }, uDash: { value: dash }, uGap: { value: gap }, uShift: { value: 0 } } });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    const pa = geo.attributes.position, da = geo.attributes.aD, h = width / 2;
    mesh.userData.set = (pts, y = 0.03) => {
      const n = Math.min(max, pts.length); let d = 0;
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
        let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
        if (i) d += dist(pts[i], pts[i - 1]);
        pa.setXYZ(i * 2, pts[i].x - tz * h, y, pts[i].z + tx * h); pa.setXYZ(i * 2 + 1, pts[i].x + tz * h, y, pts[i].z - tx * h);
        da.setX(i * 2, d); da.setX(i * 2 + 1, d);
      }
      pa.needsUpdate = true; da.needsUpdate = true; geo.setDrawRange(0, Math.max(0, n - 1) * 6); mesh.userData.n = n;
    };
    mesh.userData.count = n => geo.setDrawRange(0, Math.max(0, Math.min(n, mesh.userData.n || 0) - 1) * 6);
    return mesh;
  }

  // ---- personagens ----
  // jogador: o mesmo corpo do jogo com um material branco próprio (os materiais do Shop não mudam)
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.8, flatShading: true });
  const pHold = new THREE.Group(); pHold.position.copy(P_POS); scene.add(pHold);
  const pModel = new THREE.Group(); pModel.rotation.y = FACE_NZ; pHold.add(pModel);
  const PB = buildBody(pModel);
  const paintWhite = () => pModel.traverse(o => { if (o.isMesh) { o.material = whiteMat; o.castShadow = false; } });
  paintWhite();
  PB.arms.forEach((a, i) => { const s = i ? 1 : -1; a.sh.rotation.set(-s * 0.08, 0, 0.05); a.elbow.rotation.z = 0.15; });
  pModel.userData.torso = PB.torso;                                   // (mesma interface do reachArm do K)
  pModel.userData.arms = PB.arms.map((a, i) => ({ s: i ? 1 : -1, sh: a.sh, rest: a.sh.quaternion.clone(), elbow: a.elbow, erest: a.elbow.quaternion.clone() }));
  // K: com as cores dele
  const kHold = new THREE.Group(); kHold.position.copy(K_POS); scene.add(kHold);
  const K = buildStandingReader(); K.rotation.y = FACE_NZ; kHold.add(K);
  K.traverse(o => { if (o.isMesh) o.castShadow = false; });
  const KU = K.userData;
  const kWrist = a => a.elbow.children[a.elbow.children.length - 1];
  // figura: a aparência escura do extra 1 (maior), com contorno
  const figMat = new THREE.ShaderMaterial({ vertexShader: RIM_V, fragmentShader: RIM_F, uniforms: { uRim: { value: new THREE.Color(0.2, 0.2, 0.235) }, uGlow: { value: 0 } } });
  const fig = buildStandingReader(); fig.traverse(o => { if (o.isMesh) { o.material = figMat; o.castShadow = false; } });
  fig.scale.set(...F_SCALE); fig.rotation.y = FACE_PZ; fig.position.copy(F_POS); scene.add(fig);
  const FU = fig.userData;

  // ---- círculo, prévia e indicador de comprimento ----
  const circle = new THREE.Group(); circle.position.y = 0.04; scene.add(circle);
  const cRing = new THREE.Mesh(new THREE.RingGeometry(CIRCLE_R - 0.07, CIRCLE_R, 48), basic('#ffffff', 0.95, { depthWrite: false }));
  cRing.rotation.x = -Math.PI / 2; circle.add(cRing);
  const cDot = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), M.white); cDot.rotation.x = -Math.PI / 2; circle.add(cDot);
  const lenArc = arcRing(CIRCLE_R + 0.08, CIRCLE_R + 0.13); lenArc.visible = false; circle.add(lenArc);
  const PREV_MAX = 128;
  const prevLine = ribbon(PREV_MAX, 0.08, 0.22, 0.14, '#ffffff', 0.6); prevLine.visible = false; scene.add(prevLine);

  // ---- estabilidade: anel aos pés (arco = estabilidade) ----
  const stabRing = { P: arcRing(0.62, 0.68), K: arcRing(0.62, 0.68) };
  stabRing.P.position.set(P_POS.x, 0.03, P_POS.z); stabRing.K.position.set(K_POS.x, 0.03, K_POS.z);
  scene.add(stabRing.P, stabRing.K);

  // ---- pools ----
  const pool = make => { const free = []; return { get: () => free.pop() || make(), put: o => { o.visible = false; if (o.parent) o.parent.remove(o); free.push(o); } }; };
  // projétil: fragmento escuro alongado com arestas claras, rastro curto e o anel de "o K vai defender"
  const projGeo = new THREE.OctahedronGeometry(0.27, 0), projEdges = new THREE.EdgesGeometry(projGeo);
  const trailGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.12), new THREE.Vector3(0, 0, -0.95)]);
  const claimGeo = new THREE.RingGeometry(0.36, 0.41, 32);
  const projPool = pool(() => {
    const g = new THREE.Group(), spin = new THREE.Group(); spin.scale.set(0.75, 0.55, 1.7); g.add(spin);
    spin.add(new THREE.Mesh(projGeo, M.dark), new THREE.LineSegments(projEdges, M.edge));
    g.add(new THREE.Line(trailGeo, M.trail));
    const claim = new THREE.Mesh(claimGeo, basic('#dfe9ff', 0.8, { depthWrite: false, side: THREE.DoubleSide })); claim.rotation.x = -Math.PI / 2; g.add(claim);
    g.userData = { spin, claim }; return g;
  });
  // estilhaços (impactos, bloqueios)
  const shardGeo = new THREE.TetrahedronGeometry(0.07, 0);
  const shardPool = pool(() => new THREE.Mesh(shardGeo, M.shardW));
  // aviso: linha tracejada no chão (origem → alvo) e anel pulsando na origem
  const warnPool = pool(() => ribbon(2, 0.07, 0.34, 0.24, '#ffffff', 0.5));
  const pulseGeo = new THREE.RingGeometry(0.3, 0.37, 32);
  const pulsePool = pool(() => new THREE.Mesh(pulseGeo, basic('#ffffff', 0.6, { depthWrite: false, side: THREE.DoubleSide })));
  // barreira: cilindro aberto + anéis (a do K com anel duplo, levemente azulada)
  const barGeo = new THREE.CylinderGeometry(BLOCK.r, BLOCK.r, BLOCK.h, 28, 1, true); barGeo.translate(0, BLOCK.h / 2, 0);
  const ringGeo = unitCircle(BLOCK.r), ring2Geo = unitCircle(BLOCK.r + 0.09);
  const makeBar = own => () => {
    const g = new THREE.Group(), lm = own === 'K' ? M.barLineK : M.barLineP;
    g.add(new THREE.Mesh(barGeo, own === 'K' ? M.barK : M.barP));
    for (const y of [0.02, BLOCK.h]) { const r = new THREE.LineLoop(ringGeo, lm); r.position.y = y; g.add(r); if (own === 'K') { const r2 = new THREE.LineLoop(ring2Geo, lm); r2.position.y = y; g.add(r2); } }
    return g;
  };
  const barPool = { P: pool(makeBar('P')), K: pool(makeBar('K')) };
  // fissuras: rachadura vertical suspensa (preenchida de preto, contorno branco irregular)
  const crack = (() => {
    const H = 1.8, n = 9, L = [], R = [], r = rng(77);
    for (let i = 0; i <= n; i++) { const y = -H / 2 + H * i / n, w = 0.3 * Math.sin(Math.PI * i / n) + 0.015, j = (i % 2 ? 0.1 : -0.08) * Math.sin(Math.PI * i / n); L.push(new THREE.Vector2(-w + j - r() * 0.05, y)); R.push(new THREE.Vector2(w + j * 0.5 + r() * 0.05, y)); }
    const loop = L.concat(R.slice().reverse()), sh = new THREE.Shape(loop);
    return { fill: new THREE.ShapeGeometry(sh), line: new THREE.BufferGeometry().setFromPoints(loop.map(p => new THREE.Vector3(p.x, p.y, 0.01))) };
  })();
  const fissures = {};
  for (const [name, [x, z]] of Object.entries(FIS)) {
    const g = new THREE.Group(); g.position.set(x, H_PROJ, z);
    g.add(new THREE.Mesh(crack.fill, basic('#000000', 1, { side: THREE.DoubleSide })), new THREE.LineLoop(crack.line, M.edge));
    g.visible = false; scene.add(g);
    fissures[name] = { g, open: 0, want: 0, x, z };
  }
  // estruturas (Refletir): cristais escuros suspensos com contorno branco
  const structGeo = new THREE.OctahedronGeometry(0.45, 0), structEdges = new THREE.EdgesGeometry(structGeo);
  const structObjs = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group(), body = new THREE.Group(); body.scale.set(0.6, 1.55, 0.6); g.add(body);
    const em = lineM('#ffffff', 0.9);
    body.add(new THREE.Mesh(structGeo, M.dark), new THREE.LineSegments(structEdges, em));
    g.userData = { body, em }; g.visible = false; scene.add(g); return g;
  });
  // núcleos (Firmar): esfera escura, anel pulsante, arco do progresso, área de acompanhamento, raiz da ameaça
  const zonePts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 2; zonePts.push({ x: Math.cos(a) * FIRM.zoneR, z: Math.sin(a) * FIRM.zoneR }); }
  const ROOT_N = 30, ROOT_MIN = 2.2;
  const coreObjs = [0, 1].map(() => {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const ball = new THREE.Group(); ball.position.y = 0.34; g.add(ball);
    const icoGeo = new THREE.IcosahedronGeometry(0.2, 0);
    ball.add(new THREE.Mesh(icoGeo, M.dark), new THREE.LineSegments(new THREE.EdgesGeometry(icoGeo), lineM('#ffffff', 0.55)));
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.35, 40), basic('#ffffff', 0.6, { depthWrite: false })); pulse.rotation.x = -Math.PI / 2; pulse.position.y = 0.03; g.add(pulse);
    const prog = arcRing(0.42, 0.47); prog.position.y = 0.03; g.add(prog);
    const burst = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), basic('#ffffff', 0, { depthWrite: false })); burst.rotation.x = -Math.PI / 2; burst.position.y = 0.035; burst.visible = false; g.add(burst);
    const zone = ribbon(65, 0.06, 0.16, 0.11, '#ffffff', 0.8); zone.userData.set(zonePts, 0); zone.position.y = 0.04; zone.visible = false; scene.add(zone);
    const root = ribbon(ROOT_N, 0.07, 0.22, 0.09, '#c9c9d0', 0.75); root.visible = false; scene.add(root);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), M.white); dot.visible = false; scene.add(dot);
    return { g, ball, pulse, prog, burst, zone, root, dot };
  });
  // traço de luz do braço do K até a barreira dele
  const traceGeo = new THREE.BufferGeometry(); traceGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const trace = new THREE.Line(traceGeo, lineM('#e6efff', 0)); trace.frustumCulled = false; scene.add(trace);

  // ---- DOM: rótulo do mecanismo (no palco) e mensagens sobre o preto (acima do véu do fade) ----
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:50%;bottom:20px;transform:translateX(-50%);color:rgba(255,255,255,0.7);font:14px "Trebuchet MS",sans-serif;letter-spacing:1.5px;pointer-events:none;z-index:6;opacity:0;transition:opacity .35s;white-space:nowrap;display:none';
  stage.appendChild(label);
  // véu preto próprio por cima do véu do jogo (o do main é verde-escuro; aqui o vazio é preto puro): mesma opacidade de `fade`
  const veil = document.createElement('div');
  veil.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;display:none;z-index:50;pointer-events:none';
  document.body.appendChild(veil);
  const setVeil = a => { veil.style.display = a > 0.001 ? 'block' : 'none'; veil.style.opacity = a.toFixed(3); };
  const msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:51;pointer-events:none;font:13px "Trebuchet MS",sans-serif;color:rgba(255,255,255,0.55);letter-spacing:1px;text-align:center';
  const msgSq = document.createElement('div'); msgSq.style.cssText = 'width:16px;height:16px;display:none';
  const msgTx = document.createElement('div'); msg.append(msgSq, msgTx);
  document.body.appendChild(msg);
  const showMsg = (text, color) => { msgTx.textContent = text; msgSq.style.display = color ? 'block' : 'none'; if (color) msgSq.style.background = color; msg.style.display = 'flex'; };
  const hideMsg = () => { msg.style.display = 'none'; };

  // ---- som (efeitos curtos, procedurais) ----
  let noiseBuf = null;
  function sfx(kind) {
    const ac = audio && audio.ctx, out = audio && audio.out; if (!ac || !out || ac.state !== 'running') return;
    try {
      const now = ac.currentTime + 0.005, g = ac.createGain(); g.connect(out);
      const tone = (f0, f1, dur, type, vol, at = 0) => { const o = ac.createOscillator(), e = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, now + at); o.frequency.exponentialRampToValueAtTime(f1, now + at + dur); e.gain.setValueAtTime(0.0001, now + at); e.gain.exponentialRampToValueAtTime(vol, now + at + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, now + at + dur); o.connect(e); e.connect(g); o.start(now + at); o.stop(now + at + dur + 0.02); };
      const noise = (dur, type, freq, vol) => { if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; const e = ac.createGain(); e.gain.setValueAtTime(vol, now); e.gain.exponentialRampToValueAtTime(0.0001, now + dur); s.connect(f); f.connect(e); e.connect(g); s.start(now); s.stop(now + dur + 0.02); };
      if (kind === 'warn') tone(760, 740, 0.09, 'sine', 0.035);
      else if (kind === 'launch') noise(0.22, 'bandpass', 1400, 0.05);
      else if (kind === 'barrier') tone(520, 640, 0.09, 'sine', 0.04);
      else if (kind === 'block') { tone(1500, 900, 0.16, 'triangle', 0.06); noise(0.12, 'highpass', 3000, 0.04); }
      else if (kind === 'reflect') { tone(1700, 1900, 0.2, 'sine', 0.05); tone(2550, 2700, 0.16, 'sine', 0.025, 0.02); }
      else if (kind === 'impact') { tone(110, 60, 0.26, 'sine', 0.12); noise(0.14, 'lowpass', 900, 0.06); }
      else if (kind === 'struct') { noise(0.32, 'highpass', 2200, 0.07); tone(420, 210, 0.3, 'triangle', 0.035); }
      else if (kind === 'core') { tone(660, 660, 0.7, 'sine', 0.04); tone(990, 990, 0.6, 'sine', 0.025, 0.06); }
      else if (kind === 'fail') tone(180, 90, 0.6, 'sine', 0.07);
      setTimeout(() => { try { g.disconnect(); } catch (e) { /* */ } }, 1500);
    } catch (e) { /* som é opcional */ }
  }

  // ---- mouse: botão esquerdo segurado = ação ----
  let mouseDown = false, simAct = false;
  const isUI = e => e.target && e.target.closest && e.target.closest('button, .back-btn, .tc-zone, .tc-acts, .tc-btn');
  addEventListener('pointerdown', e => { if (active && e.pointerType === 'mouse' && e.button === 0 && !isUI(e)) mouseDown = true; });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouseDown = false; });
  addEventListener('pointercancel', () => { mouseDown = false; });
  addEventListener('blur', () => { mouseDown = false; });

  // ---------- estado ----------
  let active = false, fade = 0, phase = 'idle', pt = 0, time = 0;
  let step = 0, fragmentsDone = 0, retries = 0, log = [];
  let seg = null;                                                     // trecho atual
  let projectiles = [], warnings = [], barriers = [], walls = [], shards = [];
  let drawing = null;                                                 // { pts, len, atLimit }
  const cpos = { x: CIRCLE_HOME.x, z: CIRCLE_HOME.z };
  const stab = { P: 100, K: 100 }, lastHit = { P: -99, K: -99 }, react = { P: 0, K: 0 };
  let prevAct = false, lastBar = -9, nextId = 1, lastKDef = -99, kAct = null, gest = null, shakeT = 0, traceT = 0;
  let fragHandler = null, finaleHandler = null, token = 0, figGest = null;
  const camBase = new THREE.Vector3();
  const L = s => { log.push(s); if (log.length > 500) log.shift(); };
  const kLevelOf = n => n < 5 ? 0 : Math.min(4, n - 4);
  const kLevel = () => kLevelOf(fragmentsDone);
  const charPos = who => who === 'K' ? K_POS : P_POS;

  function fitFov() {
    const asp = camera.aspect || 16 / 9, h = Math.tan(CAM.fov * Math.PI / 360) * 16 / 9;
    const fov = asp >= 16 / 9 ? CAM.fov : Math.min(80, Math.atan(h / asp) * 360 / Math.PI);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function placeCamera() {
    const a = CAM.angle * Math.PI / 180, fx = 0, fz = -1, rx = 1, rz = 0;      // frente do jogador = −Z, direita = +X
    const dx = fx * Math.cos(a) + rx * Math.sin(a), dz = fz * Math.cos(a) + rz * Math.sin(a);
    camBase.set(P_POS.x + dx * CAM.dist, CAM.height, P_POS.z + dz * CAM.dist);
    camera.position.copy(camBase); camera.lookAt(CAM.look); fitFov();
    key.position.set(camBase.x + 2, camBase.y + 7, camBase.z + 2); key.target.position.set(0, 0, 0);
    for (const f of Object.values(fissures)) f.g.rotation.y = Math.atan2(camBase.x - f.x, camBase.z - f.z);   // de frente para a câmera
  }

  // ---------- criação/remoção de coisas do trecho ----------
  function spawnShards(x, y, z, n, darkMix = 0.4, speed = 2.4) {
    for (let i = 0; i < n; i++) {
      const m = shardPool.get(); m.material = Math.random() < darkMix ? M.shardD : M.shardW;
      m.position.set(x, y, z); m.visible = true; scene.add(m);
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = speed * (0.4 + Math.random() * 0.8), c = Math.sqrt(1 - u * u);
      m.userData = { vx: Math.cos(a) * c * s, vy: u * s * 0.7 + 0.6, vz: Math.sin(a) * c * s, age: 0, life: 0.45 + Math.random() * 0.35, s0: 0.6 + Math.random() * 0.8, w: Math.random() * 10 };
      shards.push(m);
    }
  }
  function originOf(from, target) {
    if (from === 'fig') { const s = charPos(target).x < 0 ? -1 : 1; return { x: s * 0.9, z: F_POS.z + 1.3, src: null, fis: null }; }
    if (typeof from === 'string') { const f = fissures[from]; return { x: f.x, z: f.z, src: null, fis: f }; }
    return { x: from.x, z: from.z, src: from, fis: null };          // estrutura
  }
  function createWarning(from, target, speed, dur = WARN) {
    const o = originOf(from, target), tp = charPos(target);
    const w = { from, target, speed, t: 0, dur, ox: o.x, oz: o.z, tx: tp.x, tz: tp.z, src: o.src, fis: o.fis, line: warnPool.get(), pulse: pulsePool.get(), proj: null };
    w.line.userData.set([{ x: o.x, z: o.z }, { x: tp.x, z: tp.z }], 0.03);
    w.line.material.uniforms.uOp.value = 0.12; w.line.visible = true; scene.add(w.line);
    w.pulse.position.set(o.x, H_PROJ, o.z); w.pulse.visible = true; scene.add(w.pulse);
    if (o.src) o.src.busy = true;
    if (o.fis) o.fis.want++;
    if (from === 'fig') figGest = { s: tp.x < 0 ? 1 : -1, pt: new THREE.Vector3(o.x, H_PROJ, o.z).lerp(new THREE.Vector3(tp.x, H_PROJ, tp.z), 0.25), t: 0, dur: dur + 0.5 };
    else if (o.fis) figGest = { s: o.x < 0 ? 1 : -1, pt: new THREE.Vector3(o.x * 0.6, 4.2, F_POS.z + 2), t: 0, dur: dur + 0.4, soft: true };
    warnings.push(w); sfx('warn');
    if (dur <= 0) launch(w);
    return w;
  }
  function launch(w) {
    const dx = w.tx - w.ox, dz = w.tz - w.oz, l = Math.hypot(dx, dz) || 1;
    const p = { id: nextId++, x: w.ox, z: w.oz, vx: dx / l * w.speed, vz: dz / l * w.speed, speed: w.speed, target: w.target, tx: w.tx, tz: w.tz,
      reflected: false, alive: true, kClaim: false, kEval: 1.4 + Math.random() * 0.4, evaluated: false, src: w.src, obj: projPool.get(), age: 0 };
    p.obj.position.set(p.x, H_PROJ, p.z); p.obj.visible = true; p.obj.userData.claim.visible = false; scene.add(p.obj);
    projectiles.push(p); w.proj = p; w.done = true; w.pulse.visible = false;
    sfx('launch');
  }
  function killProjectile(p, burst = 0, darkMix = burst > 8 ? 0.5 : 0.3) {
    if (!p.alive) return; p.alive = false;
    if (burst) spawnShards(p.x, H_PROJ, p.z, burst, darkMix);
    projPool.put(p.obj);
    if (p.src) p.src.busy = false;
    if (kAct && kAct.proj === p && !kAct.made) kAct.cancel = true;
  }
  function removeWarning(w) { warnPool.put(w.line); pulsePool.put(w.pulse); if (w.fis && !w.fisOff) w.fis.want = Math.max(0, w.fis.want - 1); }
  function addBarrier(x, z, owner) {
    const obj = barPool[owner].get(); obj.position.set(x, 0, z); obj.scale.set(1, 0.001, 1); obj.visible = true; scene.add(obj);
    const b = { x, z, owner, age: 0, life: BLOCK.life, alive: true, die: -1, obj };
    barriers.push(b);
    if (owner === 'P') { const mine = barriers.filter(o => o.alive && o.owner === 'P'); if (mine.length > BLOCK.max) killBarrier(mine[0]); }
    return b;
  }
  function killBarrier(b) { if (!b.alive) return; b.alive = false; b.die = 0; }
  function addWall(pts) {
    const segs = [], pos = [], lin = [], h = REFL.h;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], len = dist(a, b); if (len < 1e-4) continue;
      const tx = (b.x - a.x) / len, tz = (b.z - a.z) / len;
      segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, tx, tz, nx: -tz, nz: tx, len });
      pos.push(a.x, 0, a.z, b.x, 0, b.z, b.x, h, b.z, a.x, 0, a.z, b.x, h, b.z, a.x, h, a.z);
      lin.push(a.x, 0.02, a.z, b.x, 0.02, b.z, a.x, h, a.z, b.x, h, b.z);
    }
    for (const p of pts) lin.push(p.x, 0, p.z, p.x, h, p.z);
    const g = new THREE.Group();
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lin, 3));
    g.add(new THREE.Mesh(pg, M.wall), new THREE.LineSegments(lg, M.wallLine)); g.scale.y = 0.001; scene.add(g);
    const w = { pts: pts.map(p => ({ x: p.x, z: p.z })), segs, age: 0, life: REFL.life, alive: true, die: -1, obj: g };
    walls.push(w);
    const alive = walls.filter(o => o.alive); if (alive.length > REFL.maxWalls) killWall(alive[0]);
    sfx('barrier'); L('wall');
    return w;
  }
  function killWall(w) { if (!w.alive) return; w.alive = false; w.die = 0; }
  function disposeWall(w) { scene.remove(w.obj); w.obj.children.forEach(c => c.geometry.dispose()); }
  function setPreview(on) {
    prevLine.visible = on; lenArc.visible = on;
    if (!on) drawing = null;
  }
  function updatePreview() {
    if (!drawing) return;
    // a cauda até o círculo só mostra o que ainda cabe no limite (no limite: só o traço já feito)
    const last = drawing.pts[drawing.pts.length - 1], d = dist(last, cpos), r = drawing.atLimit ? 0 : Math.max(0, REFL.maxLen - drawing.len);
    const k = d > 1e-6 ? Math.min(1, r / d) : 0;
    prevLine.userData.set(k > 0.001 ? drawing.pts.concat([{ x: last.x + (cpos.x - last.x) * k, z: last.z + (cpos.z - last.z) * k }]) : drawing.pts, 0.036);
    const u = lenArc.material.uniforms, full = drawing.atLimit;
    u.uFrac.value = Math.min(1, drawing.len / REFL.maxLen); u.uA.value = full ? 0.35 + 0.35 * (Math.sin(time * 16) > 0 ? 1 : 0) : 0.8;
    u.uCol.value.set(full ? '#8a8a90' : '#ffffff');
  }

  // ---------- trechos ----------
  function clearAll() {
    for (const p of projectiles) if (p.alive) { p.alive = false; projPool.put(p.obj); }
    projectiles = [];
    for (const w of warnings) removeWarning(w); warnings = [];
    for (const b of barriers) barPool[b.owner].put(b.obj); barriers = [];
    for (const w of walls) disposeWall(w); walls = [];
    for (const s of shards) shardPool.put(s); shards = [];
    setPreview(false);
    for (const f of Object.values(fissures)) { f.want = 0; f.open = 0; f.g.visible = false; }
    for (const o of structObjs) o.visible = false;
    for (const c of coreObjs) { c.g.visible = false; c.zone.visible = false; c.root.visible = false; c.dot.visible = false; }
    gridMat.uniforms.uOn.value.fill(0);
    if (kAct) kAct = null;
    gest = null; figGest = null; traceT = 0; trace.material.opacity = 0;
  }
  function setupSegment(i) {
    clearAll();
    const def = SEGMENTS[i];
    seg = { i, def, mech: def.mech, t: 0, shotIdx: 0, figNext: def.figEvery || 0, figTgt: 0, structures: [], cores: [] };
    (def.structs || []).forEach((s, j) => {
      const o = structObjs[j]; o.position.set(s.x, H_PROJ, s.z); o.scale.setScalar(1); o.visible = true; o.userData.em.color.set('#ffffff'); o.userData.em.opacity = 0.9;
      seg.structures.push({ x: s.x, z: s.z, target: s.target, period: s.period, speed: s.speed, next: s.phase, alive: true, busy: false, die: -1, obj: o });
    });
    (def.cores || []).forEach((c, j) => {
      const o = coreObjs[j], P = Object.assign({}, FIRM, c);
      o.g.position.set(c.x, 0, c.z); o.g.visible = true; o.ball.scale.setScalar(1); o.ball.visible = true; o.burst.visible = false; o.pulse.visible = true; o.prog.visible = true;
      // raiz irregular: da borda da região até o personagem ameaçado; com o núcleo perto dele (ex. K), ela nasce mais para
      // dentro da região escura para medir ao menos ROOT_MIN (senão some sob o anel de estabilidade e os pés)
      const tp = charPos(c.threat), dx = tp.x - c.x, dz = tp.z - c.z, l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
      const r0 = Math.min(P.R, Math.max(0.45, l - ROOT_MIN)), ex = c.x + ux * r0, ez = c.z + uz * r0, r = rng(31 + i * 7 + j);
      const pts = [];
      for (let k = 0; k < ROOT_N; k++) { const f = k / (ROOT_N - 1), off = (r() - 0.5) * 0.45 * Math.sin(Math.PI * f); pts.push({ x: ex + (tp.x - ex) * f - uz * off, z: ez + (tp.z - ez) * f + ux * off }); }
      o.root.userData.set(pts, 0.03); o.root.userData.count(0); o.root.visible = true;
      seg.cores.push({ x: c.x, z: c.z, R: P.R, P, threat: c.threat, progress: 0, engaged: false, zt: 0, ang: r() * Math.PI * 2, zone: { x: c.x, z: c.z },
        timer: P.threatTime, tmax: P.threatTime, pulse: -1, restored: false, fadeOn: 1, burstT: -1, pts, obj: o, slot: j });
      regions[j].set(c.x, c.z, P.R, 0); gridMat.uniforms.uOn.value[j] = 1;
    });
    stab.P = stab.K = 100; lastHit.P = lastHit.K = -99; react.P = react.K = 0;
    cpos.x = CIRCLE_HOME.x; cpos.z = CIRCLE_HOME.z; prevAct = true;  // (ação já segurada não conta como clique novo)
    lastKDef = -99; lastBar = -9; placeCamera();
  }
  function enterStep(i) {
    step = i; pt = 0; const s = STEPS[i];
    if (!s) return;
    if (s.k === 'S') { retries = 0; setupSegment(s.seg); phase = 'intro'; fade = 1; L(`step:${i} S ${SEGMENTS[s.seg].mech}`); return; }
    clearAll(); seg = null;
    L(s.k === 'F' ? `step:${i} F ${s.color}` : `step:${i} E`);
    phase = fade < 1 ? (s.k === 'F' ? 'fragOut' : 'endOut') : 'frag';
    if (phase === 'frag') beginPause();
  }
  function beginPause() {                                            // fragmento ou final: gancho de integração ou pausa neutra
    const s = STEPS[step], my = ++token; phase = s.k === 'F' ? 'frag' : 'end'; pt = 0; fade = 1;
    const done = () => { if (my !== token || !active) return; hideMsg(); token++; finishPause(); };
    if (s.k === 'F') {
      L(`frag:${s.color}:${s.pass}`);
      if (fragHandler) { phase = 'fragWait'; fragHandler({ index: s.index, color: s.color, pass: s.pass }, done); }
      else showMsg(`fragmento ${s.color} · ${s.pass}ª passagem — conteúdo pendente`, COLOR_HEX[s.color]);
    } else {
      L('end');
      if (finaleHandler) { phase = 'endWait'; finaleHandler({}, done); }
      else showMsg('encerramento — pendente', '#ffffff');
    }
    pauseDone = done;
  }
  let pauseDone = null;
  function finishPause() {
    const s = STEPS[step];
    if (s.k === 'F') { fragmentsDone = Math.max(fragmentsDone, s.index + 1); enterStep(step + 1); }
    else { phase = 'done'; active = false; ctx.onFinish && ctx.onFinish(); }
  }
  function fail() {
    if (phase !== 'play' && phase !== 'intro' && phase !== 'clear') return;
    phase = 'fail'; pt = 0; L('fail'); sfx('fail'); setPreview(false);
  }

  // ---------- defesa do K ----------
  /** O caminho restante de p já está coberto por uma barreira/parede que ainda vai existir quando ele chegar lá? */
  function covered(p) {
    const px = p.x, pz = p.z, dx = p.tx - px, dz = p.tz - pz, L2 = Math.hypot(dx, dz) || 1, ux = dx / L2, uz = dz / L2, R = BLOCK.r + PR;
    for (const b of barriers) {
      if (!b.alive || segDist2(b.x, b.z, px, pz, p.tx, p.tz) > R * R) continue;
      const al = (b.x - px) * ux + (b.z - pz) * uz, pe = Math.abs((b.x - px) * uz - (b.z - pz) * ux);
      const tIn = Math.max(0, al - Math.sqrt(Math.max(0, R * R - pe * pe))) / p.speed;   // quando o projétil encosta nela
      if (b.life - b.age >= tIn + 0.05) return true;
    }
    for (const w of walls) if (w.alive) for (const s of w.segs) {
      const t = segT(px, pz, p.tx, p.tz, s);
      if (t >= 0 && w.life - w.age >= t * L2 / p.speed + 0.05) return true;
    }
    return false;
  }
  function kEvaluate(p) {
    p.evaluated = true;
    const lv = kLevel(); if (lv < 1 || !seg || seg.mech === 'firm' || kAct) return;
    const d = kDef(lv), chance = p.target === 'K' ? (d.self ? d.chance : 0) : (d.other || 0);
    if (!chance || covered(p) || time - lastKDef < d.gap || Math.random() >= chance) return;
    const dx = p.tx - p.x, dz = p.tz - p.z, l = Math.hypot(dx, dz) || 1;
    const bx = p.tx - dx / l * 1.4, bz = p.tz - dz / l * 1.4;
    p.kClaim = true; p.obj.userData.claim.visible = true; lastKDef = time;
    kAct = { proj: p, t: 0, hes: d.hesitate, bx, bz, s: bx >= K_POS.x ? 1 : -1, made: false, cancel: false, back: 0 };
    L('kclaim');
  }
  function updateK(dt) {
    if (!kAct) return;
    const a = kAct; a.t += dt;
    if (!a.made && !a.cancel && a.t >= a.hes) {
      const p = a.proj;
      if (!p.alive || p.reflected) a.cancel = true;
      else if (covered(p)) { a.cancel = true; L('kcancel'); }     // o jogador já cobriu: abaixa o braço
      else {
        addBarrier(a.bx, a.bz, 'K'); a.made = true; lastKDef = time; L('kdef'); sfx('barrier');
        traceT = 0.5;
      }
      if (a.cancel) { p.kClaim = false; if (p.alive) p.obj.userData.claim.visible = false; }
    }
    if (a.made || a.cancel) a.back += dt;
    if (a.back > 0.7) kAct = null;
  }

  // ---------- laço por fase ----------
  function moveCircle(dt) {
    const ax = input.axis(); let x = ax.x, z = ax.z; const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    cpos.x = clamp(cpos.x + x * CIRCLE_SPEED * dt, GRID.x0 + CIRCLE_R, GRID.x1 - CIRCLE_R);
    cpos.z = clamp(cpos.z + z * CIRCLE_SPEED * dt, GRID.z0 + CIRCLE_R, GRID.z1 - CIRCLE_R);
  }
  function actionInput() {
    const act = mouseDown || simAct || input.held('Space'), click = act && !prevAct; prevAct = act;
    if (phase !== 'play' || !seg) return;
    if (seg.mech === 'block') {
      if (click && time - lastBar >= BLOCK.cooldown) { lastBar = time; addBarrier(cpos.x, cpos.z, 'P'); sfx('barrier'); L('barrier'); gest = { t: 0, x: cpos.x, z: cpos.z }; }
    } else if (seg.mech === 'reflect') {
      if (act && !drawing) { drawing = { pts: [{ x: cpos.x, z: cpos.z }], len: 0, atLimit: false }; setPreview(true); }
      if (act && drawing) {
        const last = drawing.pts[drawing.pts.length - 1], d = dist(last, cpos);
        if (d >= REFL.step) {
          if (drawing.len + d <= REFL.maxLen) { drawing.pts.push({ x: cpos.x, z: cpos.z }); drawing.len += d; }
          else if (!drawing.atLimit) {                               // completa até o limite exato e para de acrescentar
            const r = REFL.maxLen - drawing.len; if (r > 0.05) { drawing.pts.push({ x: last.x + (cpos.x - last.x) * r / d, z: last.z + (cpos.z - last.z) * r / d }); drawing.len = REFL.maxLen; }
            drawing.atLimit = true;
          }
        }
      }
      if (!act && drawing) {
        const last = drawing.pts[drawing.pts.length - 1], d = dist(last, cpos);
        if (!drawing.atLimit && d > 0.05) {                         // cauda até o círculo, cortada no limite (igual à prévia)
          const r = Math.min(d, REFL.maxLen - drawing.len);
          if (r > 0.05) { drawing.pts.push({ x: last.x + (cpos.x - last.x) * r / d, z: last.z + (cpos.z - last.z) * r / d }); drawing.len += r; }
        }
        const len = drawing.len, pts = mergeShort(rdp(drawing.pts, REFL.eps), REFL.minSeg);
        setPreview(false);
        if (len >= REFL.minLen && pts.length >= 2) addWall(pts);
      }
    } else if (seg.mech === 'firm') seg.held = act;
  }
  function updateProjectiles(dt) {
    for (const p of projectiles) {
      if (!p.alive) continue;
      p.age += dt;
      const x1 = p.x + p.vx * dt, z1 = p.z + p.vz * dt;
      // 1) barreiras (de pé o bastante para cobrir a altura de voo)
      let hit = false;
      for (const b of barriers) {
        if (!b.alive || BLOCK.h * Math.min(1, b.age / BLOCK.rise) < H_PROJ) continue;
        if (segDist2(b.x, b.z, p.x, p.z, x1, z1) <= (BLOCK.r + PR) ** 2) { killProjectile(p, 9, 0); killBarrier(b); sfx('block'); L(b.owner === 'K' ? 'block:K' : 'block'); hit = true; break; }
      }
      if (hit) continue;
      // 2) paredes: reflexão no plano horizontal
      let refl = null, wall = null;
      for (const w of walls) { if (!w.alive || w.obj.scale.y * REFL.h < H_PROJ) continue; for (const s of w.segs) { const r = wallHit(p.x, p.z, x1, z1, s); if (r) { refl = r; wall = w; break; } } if (refl) break; }
      if (refl) {
        const vn = p.vx * refl.nx + p.vz * refl.nz;
        p.vx -= 2 * vn * refl.nx; p.vz -= 2 * vn * refl.nz;
        p.x = refl.cx + refl.nx * 0.03; p.z = refl.cz + refl.nz * 0.03;
        // ajuda de mira (pequena): se volta quase exatamente para a estrutura que disparou, segue até ela
        const s = p.src;
        if (s && s.alive && seg && seg.structures.includes(s)) {
          const dx = s.x - p.x, dz = s.z - p.z, l = Math.hypot(dx, dz), c = (p.vx * dx + p.vz * dz) / (l * p.speed);
          if (l > 1e-6 && c > Math.cos(REFL.assist)) { p.vx = dx / l * p.speed; p.vz = dz / l * p.speed; }
        }
        p.reflected = true; p.kClaim = false; p.obj.userData.claim.visible = false; if (p.src) { p.src.busy = false; p.src = null; }
        killWall(wall); spawnShards(p.x, H_PROJ, p.z, 4, 0); sfx('reflect'); L('reflect');
        continue;
      }
      // 3) alvo (só quem não foi refletido) / estruturas e figura (só refletidos)
      if (!p.reflected) {
        if (segDist2(p.tx, p.tz, p.x, p.z, x1, z1) <= HIT_R * HIT_R) { killProjectile(p, 12); impact(p.target); continue; }
        if (!p.evaluated && Math.hypot(p.tx - p.x, p.tz - p.z) / p.speed <= p.kEval) kEvaluate(p);
      } else if (seg) {
        let done = false;
        for (const s of seg.structures) if (s.alive && segDist2(s.x, s.z, p.x, p.z, x1, z1) <= STRUCT.hitR ** 2) { killProjectile(p, 10); structOff(s); done = true; break; }
        if (done) continue;
        if (Math.hypot(x1 - F_POS.x, z1 - F_POS.z) < 1.6) { killProjectile(p, 6); L('figDissolve'); continue; }
      }
      p.x = x1; p.z = z1;
      if (Math.abs(p.x) > BOUND.x || Math.abs(p.z) > BOUND.z) { killProjectile(p); continue; }
      const o = p.obj; o.position.set(p.x, H_PROJ, p.z); o.rotation.y = Math.atan2(p.vx, p.vz); o.userData.spin.rotation.z += dt * 2.2;
      if (p.kClaim) { const c = o.userData.claim; c.scale.setScalar(1 + 0.12 * Math.sin(time * 10)); }
    }
    projectiles = projectiles.filter(p => p.alive);
  }
  function structOff(s) {
    s.alive = false; s.die = 0; L('structOff'); sfx('struct');
    spawnShards(s.x, H_PROJ, s.z, 14, 0.6, 2);
  }
  function impact(who) {
    const dmg = who === 'P' ? DMG.P : (kLevel() >= 2 ? DMG.K2 : DMG.K);
    stab[who] = Math.max(0, stab[who] - dmg); lastHit[who] = time; react[who] = 1; shakeT = 0.18;
    const c = charPos(who); spawnShards(c.x, 1.0, c.z, 10, 0.5, 1.8);
    L('impact:' + who); sfx('impact');
    if (stab[who] <= 0) fail();
  }
  function updateWarnings(dt) {
    for (const w of warnings) {
      w.t += dt;
      if (!w.done) {
        const k = Math.min(1, w.t / Math.max(0.01, w.dur));
        w.line.material.uniforms.uOp.value = 0.25 + 0.6 * k * (0.75 + 0.25 * Math.sin(w.t * 14));
        w.pulse.visible = true; w.pulse.quaternion.copy(camera.quaternion); w.pulse.scale.setScalar(0.7 + 0.5 * k + 0.12 * Math.sin(w.t * 16));
        w.pulse.material.opacity = 0.3 + 0.55 * k;
        if (w.t >= w.dur) launch(w);
      } else {
        if (w.fis && !w.fisOff && w.t - w.dur > 0.35) { w.fisOff = true; w.fis.want = Math.max(0, w.fis.want - 1); }   // a fissura se fecha depois do disparo
        w.line.material.uniforms.uOp.value = 0.13;                               // durante o voo: bem fraca (para saber onde pôr a barreira)
        if (!w.proj.alive || w.proj.reflected) w.gone = true;
      }
    }
    warnings = warnings.filter(w => { if (w.gone) { removeWarning(w); return false; } return true; });
  }
  function updateSegment(dt) {
    seg.t += dt; const def = seg.def;
    if (seg.mech === 'block') {
      while (seg.shotIdx < def.shots.length && seg.t >= def.shots[seg.shotIdx][0]) { const [, from, tg, v] = def.shots[seg.shotIdx++]; createWarning(from, tg, v); }
      if (seg.shotIdx >= def.shots.length && !warnings.length && !projectiles.length) toClear();
    } else if (seg.mech === 'reflect') {
      for (const s of seg.structures) if (s.alive && !s.busy && seg.t >= s.next) { createWarning(s, s.target, s.speed); s.next = seg.t + s.period; }
      if (def.figEvery && seg.t >= seg.figNext) { createWarning('fig', seg.figTgt++ % 2 ? 'K' : 'P', 6.5); seg.figNext = seg.t + def.figEvery; }
      if (seg.structures.every(s => !s.alive)) toClear();
    } else if (seg.mech === 'firm') {
      for (const c of seg.cores) {
        if (c.restored) continue;
        const P = c.P, dC = dist(cpos, c);
        if (!c.engaged && seg.held && dC <= P.reach) { c.engaged = true; c.zt = 0; L('coreEngage'); }
        if (c.engaged) {
          c.zt += dt; const k = Math.min(1, c.zt / 1.2);
          c.ang += P.orbitSpeed * dt * k;
          const r = (P.orbitR + P.wobble * Math.sin(c.zt * 1.7)) * k;
          c.zone.x = c.x + Math.cos(c.ang) * r; c.zone.z = c.z + Math.sin(c.ang) * r;
          c.inside = dist(cpos, c.zone) <= P.zoneR;
          c.progress = clamp(c.progress + (seg.held && c.inside ? P.fill : -P.decay) * dt, 0, 1);
          if (c.progress >= 1) { c.restored = true; c.burstT = 0; L('coreDone'); sfx('core'); spawnShards(c.x, 0.4, c.z, 12, 0, 1.6); continue; }
        }
        // ameaça: a raiz cresce até o personagem; no fim, um pulso corre por ela
        if (c.pulse < 0) { c.timer -= dt; if (c.timer <= 0) { c.timer = 0; c.pulse = 0; } }
        else { c.pulse += dt / 0.6; if (c.pulse >= 1) { c.pulse = -1; c.tmax = c.timer = P.threatTime * P.threatRepeat; impact(c.threat); if (phase !== 'play') return; } }
      }
      if (seg.cores.every(c => c.restored)) toClear();
    }
    // regeneração lenta
    for (const w of ['P', 'K']) if (time - lastHit[w] > REGEN.wait) stab[w] = Math.min(100, stab[w] + REGEN.rate * dt);
  }
  function toClear() {
    phase = 'clear'; pt = 0; setPreview(false);
    for (const p of projectiles) killProjectile(p, 6); projectiles = [];
    for (const w of warnings) removeWarning(w); warnings = [];
    L('clear');
  }

  // ---------- visuais por quadro ----------
  function updateVisuals(dt) {
    // círculo
    circle.position.x = cpos.x; circle.position.z = cpos.z;
    circle.visible = phase === 'intro' || phase === 'play' || phase === 'clear' || phase === 'fail';
    updatePreview();
    // barreiras
    barriers = barriers.filter(b => {
      b.age += dt;
      if (b.alive) { b.obj.scale.set(1, Math.max(0.001, ease(b.age / BLOCK.rise)), 1); if (b.age >= b.life) killBarrier(b); return true; }
      b.die += dt; const k = b.die / 0.15; b.obj.scale.set(1 + 0.25 * k, Math.max(0.001, 1 - k), 1 + 0.25 * k);
      if (k >= 1) { barPool[b.owner].put(b.obj); return false; } return true;
    });
    walls = walls.filter(w => {
      w.age += dt;
      if (w.alive) { w.obj.scale.y = Math.max(0.001, ease(w.age / 0.16)); if (w.age >= w.life) killWall(w); return true; }
      w.die += dt; w.obj.scale.y = Math.max(0.001, 1 - w.die / 0.15);
      if (w.die >= 0.15) { disposeWall(w); return false; } return true;
    });
    // estilhaços
    shards = shards.filter(m => {
      const u = m.userData; u.age += dt; if (u.age >= u.life) { shardPool.put(m); return false; }
      u.vy -= 4 * dt; m.position.x += u.vx * dt; m.position.y = Math.max(0.03, m.position.y + u.vy * dt); m.position.z += u.vz * dt;
      m.rotation.x += u.w * dt; m.rotation.y += u.w * 0.7 * dt; m.scale.setScalar(u.s0 * (1 - u.age / u.life)); return true;
    });
    // fissuras: abrem no aviso, pulsam, disparam e se fecham
    for (const f of Object.values(fissures)) {
      f.open += ((f.want > 0 ? 1 : 0) - f.open) * Math.min(1, dt * (f.want > 0 ? 6 : 3));
      if (f.open < 0.01) { f.g.visible = false; continue; }
      f.g.visible = true; const pu = 1 + 0.06 * Math.sin(time * 12) * f.open;
      f.g.scale.set(f.open * pu, 0.3 + 0.7 * f.open, 1);
    }
    // estruturas
    if (seg) for (const s of seg.structures) {
      const o = s.obj, b = o.userData.body;
      if (s.alive) { o.position.y = H_PROJ + 0.06 * Math.sin(time * 1.3 + s.x); b.rotation.y += dt * 0.5; const w = warnings.find(x => x.src === s && !x.done); o.userData.em.opacity = w ? 0.6 + 0.4 * Math.sin(w.t * 16) : 0.9; }
      else if (s.die >= 0) {
        s.die += dt; const k = s.die / 0.6;
        o.userData.em.color.set('#7a7a80'); o.userData.em.opacity = Math.max(0, 0.7 * (1 - k)) * (Math.sin(s.die * 50) > 0 ? 1 : 0.3);
        b.scale.set(0.6 * (1 - 0.6 * k), 1.55 * (1 - k), 0.6 * (1 - 0.6 * k)); o.position.y -= dt * 0.8; b.rotation.z += dt * 2;
        if (k >= 1) { o.visible = false; s.die = -1; b.scale.set(0.6, 1.55, 0.6); }
      }
    }
    // núcleos
    if (seg) for (const c of seg.cores) {
      const o = c.obj, P = c.P;
      regions[c.slot].set(c.x, c.z, c.R, c.restored ? 1 : c.progress);
      if (c.restored) {
        c.fadeOn = Math.max(0, c.fadeOn - dt / 0.8); gridMat.uniforms.uOn.value[c.slot] = c.fadeOn;
        o.ball.scale.setScalar(Math.max(0.001, 1 - (c.burstT + dt) / 0.4)); o.pulse.visible = false; o.prog.visible = false; o.zone.visible = false; o.root.visible = false; o.dot.visible = false;
        if (c.burstT >= 0) { c.burstT += dt; const k = c.burstT / 0.7; o.burst.visible = k < 1; o.burst.scale.setScalar(0.3 + k * c.R); o.burst.material.opacity = 0.8 * (1 - k); }
        continue;
      }
      const near = dist(cpos, c) <= P.reach;
      o.pulse.scale.setScalar(1 + 0.18 * Math.sin(time * 4)); o.pulse.material.opacity = (near && !c.engaged ? 0.95 : 0.55) + 0.2 * Math.sin(time * 4);
      o.ball.rotation.y += dt * 0.8;
      o.prog.material.uniforms.uFrac.value = c.progress;
      o.zone.visible = c.engaged; o.zone.position.set(c.zone.x, 0.04, c.zone.z);
      o.zone.material.uniforms.uOp.value = c.inside && seg.held ? 0.95 : 0.55; o.zone.material.uniforms.uShift.value += dt * 0.35;
      const grow = 1 - c.timer / c.tmax, n = Math.max(0, Math.min(ROOT_N, Math.floor(grow * (ROOT_N - 1)) + 1));
      o.root.userData.count(grow > 0.01 ? n : 0);
      o.root.material.uniforms.uOp.value = 0.45 + 0.4 * grow;
      if (c.pulse >= 0) { const f = c.pulse * (ROOT_N - 1), i0 = Math.min(ROOT_N - 2, Math.floor(f)), a = c.pts[i0], b = c.pts[i0 + 1], u = f - i0; o.dot.visible = true; o.dot.position.set(a.x + (b.x - a.x) * u, 0.12, a.z + (b.z - a.z) * u); }
      else o.dot.visible = false;
    }
    // estabilidade
    for (const w of ['P', 'K']) {
      const u = stabRing[w].material.uniforms, fl = Math.max(0, 1 - (time - lastHit[w]) / 0.4);
      u.uFrac.value = stab[w] / 100; u.uA.value = 0.5 + 0.5 * fl * (Math.sin(time * 40) > 0 ? 1 : 0.3); u.uBase.value = 0.07 + 0.2 * fl;
      stabRing[w].visible = phase !== 'frag' && phase !== 'fragWait' && phase !== 'end' && phase !== 'endWait';
    }
    // traço de luz do K
    if (traceT > 0 && kAct && kAct.made) {
      traceT -= dt; const a = KU.arms.find(x => x.s === kAct.s), hp = kWrist(a).localToWorld(new THREE.Vector3(0, -0.1, 0)), pa = traceGeo.attributes.position;
      pa.setXYZ(0, hp.x, hp.y, hp.z); pa.setXYZ(1, kAct.bx, BLOCK.h * 0.7, kAct.bz); pa.needsUpdate = true; trace.material.opacity = 0.9 * Math.max(0, traceT / 0.5);
    } else trace.material.opacity = 0;
    animateChars(dt);
    // câmera (tremor curto e sutil num impacto)
    camera.position.copy(camBase); fitFov();
    if (shakeT > 0) { shakeT -= dt; const a = 0.035 * shakeT / 0.18; camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a; }
  }
  const _v = new THREE.Vector3();
  function animateChars(dt) {
    const lv = kLevel(), firm = lv / 4;
    for (const w of ['P', 'K']) react[w] = Math.max(0, react[w] - dt / 0.5);
    // jogador: respira, olha para o círculo, gesticula com a ação, recua no impacto
    const rp = react.P, low = 1 - stab.P / 100;
    pHold.rotation.x = 0.22 * Math.sin(rp * Math.PI) ; pHold.position.x = P_POS.x + (rp > 0 ? (Math.random() - 0.5) * 0.06 * rp : 0);
    PB.torso.rotation.z = -0.1 * low; PB.torso.scale.y = 1 + 0.012 * Math.sin(time * 1.8);
    const dx = cpos.x - P_POS.x, dz = cpos.z - P_POS.z, ang = Math.atan2(dx, -dz);
    PB.head.rotation.y = -clamp(ang, -0.7, 0.7) * 0.6; PB.head.rotation.z = -0.18 - 0.08 * low;
    let pk = 0, ps = cpos.x >= P_POS.x ? 1 : -1, ptgt = _v.set(cpos.x, 0.8, cpos.z);
    if (gest) { gest.t += dt; const t = gest.t; pk = t < 0.12 ? t / 0.12 : t < 0.32 ? 1 : Math.max(0, 1 - (t - 0.32) / 0.35); ps = gest.x >= P_POS.x ? 1 : -1; ptgt.set(gest.x, 0.8, gest.z); if (t > 0.7) gest = null; }
    else if (drawing) pk = 0.8;
    else if (seg && seg.mech === 'firm' && seg.held && phase === 'play') pk = 0.7;
    for (const a of pModel.userData.arms) { a.k = (a.k || 0) + ((a.s === ps ? pk : 0) - (a.k || 0)) * Math.min(1, dt * 12); reachArm(pModel, a.s, ptgt, a.k); }
    // K: postura vulnerável no começo, mais firme com a autonomia; olha o que vem para ele; gesto da defesa
    const rk = react.K, lowK = 1 - stab.K / 100;
    kHold.rotation.x = 0.26 * Math.sin(rk * Math.PI); kHold.position.x = K_POS.x + (rk > 0 ? (Math.random() - 0.5) * 0.07 * rk : 0);
    KU.torso.rotation.z = -(0.2 * (1 - firm) + 0.1 * lowK) + 0.006 * Math.sin(time * 1.5);
    KU.torso.scale.y = 1 + 0.012 * Math.sin(time * 1.6 + 1);
    let look = 0; const inc = projectiles.find(p => p.alive && p.target === 'K' && !p.reflected);
    if (inc) { const a = Math.atan2(inc.x - K_POS.x, -(inc.z - K_POS.z)); look = clamp(a, -0.8, 0.8); }
    KU.head.rotation.y += ((-look * 0.7) - KU.head.rotation.y) * Math.min(1, dt * 4);
    KU.head.rotation.z = -(0.26 * (1 - firm) + 0.1 * lowK) + 0.03 * Math.sin(time * 0.7);
    for (const a of KU.arms) {
      let k = 0, tgt = _v.set(a.s * 2 + K_POS.x, 0.6, K_POS.z - 1.5);
      if (kAct && kAct.s === a.s) {
        tgt.set(kAct.bx, 1.2, kAct.bz);
        if (kAct.made) k = Math.max(0, 1 - kAct.back / 0.7);
        else if (kAct.cancel) k = Math.max(0, 0.5 - kAct.back);
        else { const e = ease(kAct.t / kAct.hes); k = 0.25 + 0.4 * e + 0.08 * Math.sin(kAct.t * 11) * (1 - e); }   // hesitante
      } else if (firm < 0.5) { k = 0.18 * (1 - firm * 2); tgt.set(K_POS.x - a.s * 0.1, 1.0, K_POS.z - 0.6); }   // braços meio encolhidos (vulnerável)
      a.k = (a.k || 0) + (k - (a.k || 0)) * Math.min(1, dt * 10); reachArm(K, a.s, tgt, a.k);
    }
    // figura: respira devagar, inclina a cabeça para o jogador, ergue o braço ao disparar
    FU.torso.scale.y = 1 + 0.01 * Math.sin(time * 0.9);
    if (FU.head) { FU.head.rotation.z = -0.12 + 0.03 * Math.sin(time * 0.4); FU.head.rotation.y = 0.06 * Math.sin(time * 0.27); }
    let fk = 0, fs = 1, ft = _v.set(0, 3, 0);
    if (figGest) { figGest.t += dt; const t = figGest.t, d = figGest.dur; fk = (t < 0.35 ? t / 0.35 : t < d - 0.4 ? 1 : Math.max(0, (d - t) / 0.4)) * (figGest.soft ? 0.55 : 1); fs = figGest.s; ft.copy(figGest.pt); if (t >= d) figGest = null; }
    for (const a of FU.arms) { a.k = (a.k || 0) + ((a.s === fs ? fk : 0) - (a.k || 0)) * Math.min(1, dt * 8); reachArm(fig, a.s, ft, a.k); }
    figMat.uniforms.uGlow.value = 0.25 * fk;
  }

  // ---------- rótulo ----------
  let labelOn = false, labelText = '';
  function updateLabel() {
    const on = !!seg && (phase === 'play' || phase === 'clear' || (phase === 'intro' && pt > 0.4));
    const txt = seg ? LABEL[seg.mech][document.body.classList.contains('touch-on') ? 1 : 0] : '';
    if (txt !== labelText) { label.textContent = txt; labelText = txt; }
    if (on !== labelOn) { labelOn = on; label.style.display = 'block'; label.style.opacity = on ? '1' : '0'; }
  }

  function update(dt, paused) {
    if (!active || paused) return;
    dt = Math.min(dt, 0.05); time += dt; pt += dt;
    switch (phase) {
      case 'intro':
        fade = Math.max(0, 1 - pt / T.fadeIn);
        if (pt > T.fadeIn) moveCircle(dt);
        actionInput(); updateWarnings(dt); updateProjectiles(dt); updateK(dt);
        if (pt >= T.intro && phase === 'intro') { phase = 'play'; pt = 0; fade = 0; }
        break;
      case 'play':
        moveCircle(dt); actionInput();
        updateSegment(dt);
        if (phase === 'play' || phase === 'clear') { updateWarnings(dt); updateProjectiles(dt); updateK(dt); }
        break;
      case 'clear':
        moveCircle(dt); actionInput(); updateK(dt);
        if (pt >= T.clear) {
          const nx = STEPS[step + 1]; phase = nx && nx.k === 'F' ? 'fragOut' : 'out'; pt = 0;
          for (const b of barriers) killBarrier(b);                   // limpa barreiras, paredes e a prévia antes do preto
          for (const w of walls) killWall(w);
          setPreview(false); kAct = null;
        }
        break;
      case 'out': case 'fragOut': case 'endOut':
        fade = Math.min(1, fade + dt / T.out);
        if (fade >= 1) { if (phase === 'out' || phase === 'fragOut') { if (STEPS[step].k === 'S') enterStep(step + 1); else beginPause(); } else beginPause(); }
        break;
      case 'fail':
        if (pt > T.freeze) fade = Math.min(1, fade + dt / T.out);
        if (pt > T.freeze + T.out && msg.style.display !== 'flex') showMsg('Recomeçando o trecho…');
        if (pt >= T.freeze + T.out + T.failMsg) { hideMsg(); retries++; const i = step; setupSegment(STEPS[i].seg); phase = 'intro'; pt = 0; fade = 1; L(`retry:${i}`); }
        break;
      case 'frag': case 'end':
        if (pt >= (phase === 'frag' ? T.frag : T.end) && pauseDone) pauseDone();
        break;
    }
    if (!active) { setVeil(0); return; }
    updateVisuals(dt);
    updateLabel(); setVeil(fade);
  }

  function start(opts = {}) {
    stopInner();
    active = true; time = 0; log = []; retries = 0; lastBar = -9; lastKDef = -99;
    const s0 = Math.max(0, Math.min(STEPS.length - 1, opts.step | 0));
    fragmentsDone = STEPS.slice(0, s0).filter(s => s.k === 'F').length;
    paintWhite(); placeCamera(); fade = 1;
    enterStep(s0);
    updateVisuals(0); setVeil(fade);
  }
  function stopInner() {
    token++; clearAll(); seg = null; hideMsg(); setVeil(0); label.style.display = 'none'; label.style.opacity = '0'; labelOn = false;
    mouseDown = false; simAct = false; prevAct = false; pauseDone = null;
  }

  return {
    scene, camera,
    start,
    stop() { stopInner(); active = false; fade = 0; phase = 'idle'; },
    update,
    get active() { return active; }, get fade() { return fade; },
    get joystick() { return active && !!seg && (phase === 'play' || phase === 'clear' || (phase === 'intro' && pt > T.fadeIn)); },
    get actionLabel() { return active && seg && phase === 'play' ? ACTION[seg.mech] : null; },
    setFragmentHandler(fn) { fragHandler = fn || null; },
    setFinaleHandler(fn) { finaleHandler = fn || null; },
    // ---- ganchos de teste ----
    get step() { return step; }, get stepKind() { return STEPS[step] ? STEPS[step].k : null; },
    get segIndex() { return STEPS[step] && STEPS[step].k === 'S' ? STEPS[step].seg : -1; },
    get mech() { return seg ? seg.mech : null; }, get phase() { return phase; },
    get circle() { return { x: cpos.x, z: cpos.z }; },
    get projectiles() { return projectiles.map(p => ({ id: p.id, x: p.x, y: H_PROJ, z: p.z, vx: p.vx, vz: p.vz, target: p.target, reflected: p.reflected, alive: p.alive, kClaim: p.kClaim })); },
    get barriers() { return barriers.map(b => ({ x: b.x, z: b.z, owner: b.owner, y0: 0, y1: b.alive ? BLOCK.h * ease(b.age / BLOCK.rise) : BLOCK.h * Math.max(0, 1 - b.die / 0.15), age: b.age, life: b.life, alive: b.alive })); },
    get walls() { return walls.map(w => ({ pts: w.pts.map(p => ({ x: p.x, z: p.z })), alive: w.alive, preview: false })); },
    get preview() { return drawing ? drawing.pts.map(p => ({ x: p.x, z: p.z })) : null; }, get previewLen() { return drawing ? drawing.len : 0; },
    get structures() { return seg ? seg.structures.map(s => ({ x: s.x, z: s.z, alive: s.alive })) : []; },
    get cores() { return seg ? seg.cores.map(c => ({ x: c.x, z: c.z, R: c.R, progress: c.progress, engaged: c.engaged, zone: { x: c.zone.x, z: c.zone.z }, threat: c.threat, timer: c.timer, restored: c.restored })) : []; },
    get stab() { return { P: stab.P, K: stab.K }; }, get kLevel() { return kLevel(); }, get fragmentsDone() { return fragmentsDone; },
    get retries() { return retries; }, get log() { return log.slice(); },
    _jump(i) {
      if (!active) return;
      i = Math.max(0, Math.min(STEPS.length - 1, i | 0));
      token++; hideMsg(); pauseDone = null;
      fragmentsDone = STEPS.slice(0, i).filter(s => s.k === 'F').length; fade = 1; enterStep(i);
    },
    _setCircle(x, z) { cpos.x = clamp(x, GRID.x0 + CIRCLE_R, GRID.x1 - CIRCLE_R); cpos.z = clamp(z, GRID.z0 + CIRCLE_R, GRID.z1 - CIRCLE_R); },
    _action(down) { simAct = !!down; },
    _fire({ from = 'fig', target = 'K', speed = 6.5, warn = 0 } = {}) { const w = createWarning(from, target, speed, warn); return w.proj ? w.proj.id : null; },
    _setStab(who, v) { stab[who] = v; if (v <= 0) fail(); },
    _skipIntro() { if (phase === 'intro') { phase = 'play'; pt = 0; fade = 0; } },
    GRID, H_PROJ, BLOCK, REFL, FIRM, K_DEF, STEPS, SEGMENTS, CAM,
  };
}
