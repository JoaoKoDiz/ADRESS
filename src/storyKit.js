// Peças compartilhadas da história completa (extras 2–4, fragmentos da batalha, final e epílogo).
// Tudo procedural (sem arquivos novos): personagens já existentes, objetos simples, câmera em 3ª pessoa, indicação "E — …",
// falas com quem fala (cor da caixa) e sons curtos pelo barramento de efeitos.
import * as THREE from 'three';
import { buildStandingReader, buildPewReader } from './models/reader.js';
import { buildStandingReader as buildFigureBody } from './models/readerClassic.js';
import { buildBody } from './models/driver.js';
import { smoothCharacter } from './models/kit.js';

export const VOID = '#0b0b0e';
export const COL = { azul: '#003EFF', verde: '#00C000', laranja: '#FCA600', roxo: '#9B00FF' };
export const HINT = 'E / Espaço — Continuar';

/** Falas: "[…]" = pausa curta (não aparece); who = 'k' | 'r' | 'f' (cor da caixa). "(pausa)" no texto do dono = pausa longa antes. */
export function line(who, s, pauseBefore = 0) {
  const out = []; if (pauseBefore) out.push({ p: pauseBefore });
  for (const part of s.split(/(\[…\])/)) { if (!part) continue; if (part === '[…]') out.push({ p: 0.6 }); else out.push(out.length && out[out.length - 1].p ? part.replace(/^\s+/, '') : part); }
  out.who = who; return out;
}
export const lines = (who, arr) => arr.map(s => typeof s === 'string' ? line(who, s) : s);

// ---------- personagens ----------
/** A figura: preto puro, sem luz (MeshBasic sem tone mapping/névoa), formato antigo, grande. */
export function makeFigure(scale = 1) {
  const mat = new THREE.MeshBasicMaterial({ color: '#000000', toneMapped: false, fog: false, transparent: true, opacity: 1 });
  const g = buildFigureBody(); g.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } }); smoothCharacter(g);
  g.scale.set(4.6 * scale, 5.0 * scale, 4.6 * scale);
  g.userData.mat = mat; return g;
}
export function makeK() { const k = buildStandingReader(); k.traverse(o => { if (o.isMesh) o.castShadow = false; }); return k; }
export function makeKSeated() { const k = buildPewReader(0.5); k.traverse(o => { if (o.isMesh) o.castShadow = false; }); return k; }
/** Silhueta neutra (pessoa das memórias): corpo antigo, uma cor fosca. */
export function makeSilhouette(color = '#5d5d66', { hair = false, scale = 0.92 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95, transparent: true, opacity: 1 });
  const root = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(scale); root.add(body);
  const B = buildBody(body, { classic: true });
  const cap = root.getObjectByName('cap'); if (cap) cap.visible = false;
  if (hair) { const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.35, 4, 8), mat); h.position.set(-0.18, 0.3, 0); h.scale.set(0.7, 1, 1.1); B.head.add(h); }
  root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } }); smoothCharacter(root);
  root.userData.B = B; root.userData.mat = mat;
  return root;
}
/** Silhueta sentada (pernas dobradas): usa o corpo antigo com as juntas dobradas. */
export function sitPose(sil, seat = 0.5) {
  const B = sil.userData.B; if (!B) return;
  (B.legs || []).forEach(l => { l.hip.rotation.z = Math.PI / 2; l.knee.rotation.z = -Math.PI / 2; });
  B.pelvis.position.y = seat / sil.children[0].scale.y + 0.13; sil.userData.seat = seat;
}
export function standPose(sil) {
  const B = sil.userData.B; if (!B) return;
  (B.legs || []).forEach(l => { l.hip.rotation.z = 0; l.knee.rotation.z = 0; }); B.pelvis.position.y = 0.64;
}

// ---------- objetos ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o));
const bx = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cy = (r0, r1, h, m, s = 14) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, s), m);
const put = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };

export const SEAT = 0.46;
export function makeChair(color = '#6b4a2e') {
  const m = M(color, { transparent: true }), g = new THREE.Group();
  g.add(put(bx(0.62, 0.07, 0.6, m), 0, SEAT, 0));
  for (const [x, z] of [[-0.26, -0.25], [0.26, -0.25], [-0.26, 0.25], [0.26, 0.25]]) g.add(put(bx(0.06, SEAT, 0.06, m), x, SEAT / 2, z));
  g.add(put(bx(0.07, 0.62, 0.6, m), -0.28, SEAT + 0.34, 0));                // encosto do lado −X (quem senta olha para +X)
  g.add(put(bx(0.06, 0.06, 0.5, m), -0.28, SEAT + 0.6, 0));
  g.userData.mat = m; return g;
}
export function makeTable(r = 1.1, color = '#7a5334') {
  const m = M(color), g = new THREE.Group();
  g.add(put(cy(r, r, 0.08, m, 28), 0, 0.82, 0)); g.add(put(cy(0.09, 0.12, 0.8, m), 0, 0.41, 0)); g.add(put(cy(0.5, 0.55, 0.05, m, 20), 0, 0.03, 0));
  return g;
}
/** Pedaço de chão flutuando no vazio (tábuas). */
export function makeFloorPiece(w, d, color = '#5a4632') {
  const g = new THREE.Group(), n = Math.max(2, Math.round(w / 0.45));
  for (let i = 0; i < n; i++) {
    const m = M(new THREE.Color(color).offsetHSL(0, 0, (Math.random() - 0.5) * 0.05));
    g.add(put(bx(w / n - 0.02, 0.1, d * (0.85 + Math.random() * 0.15), m), -w / 2 + (i + 0.5) * w / n, -0.05, (Math.random() - 0.5) * 0.1));
  }
  return g;
}
/** Poste de rua com luz laranja (cone de luz + brilho). */
export function makeLampPost() {
  const g = new THREE.Group(), iron = M('#26262b', { roughness: 0.6, metalness: 0.4 });
  g.add(put(cy(0.07, 0.1, 4.2, iron), 0, 2.1, 0)); g.add(put(cy(0.18, 0.22, 0.25, iron), 0, 0.12, 0));
  g.add(put(bx(0.7, 0.06, 0.06, iron), 0.3, 4.15, 0));
  const lampM = new THREE.MeshBasicMaterial({ color: '#ffb35c', toneMapped: false });
  const lamp = put(new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), lampM), 0.62, 3.98, 0); g.add(lamp);
  const light = new THREE.PointLight('#ff9a3c', 14, 13, 1.6); light.position.set(0.62, 3.8, 0); g.add(light);
  const coneM = new THREE.MeshBasicMaterial({ color: '#ffa04a', transparent: true, opacity: 0.11, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = put(new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.8, 24, 1, true), coneM), 0.62, 1.95, 0); g.add(cone);
  g.userData = { light, lampM, coneM, set(k) { light.intensity = 14 * k; coneM.opacity = 0.11 * k; lampM.color.setRGB(1 * (0.3 + 0.7 * k), 0.7 * (0.3 + 0.7 * k), 0.36 * (0.3 + 0.7 * k)); } };
  return g;
}
/** Bancada da oficina (tampo grosso, 4 pernas, travessas). */
export function makeBench(provisional = false) {
  const wood = M(provisional ? '#8a6a46' : '#6e4e30'), g = new THREE.Group();
  if (provisional) {                                                        // provisória: tábuas sobre duas pedras
    const st = M('#7b7a74', { roughness: 1 });
    g.add(put(new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), st), -0.8, 0.28, 0)); g.add(put(new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), st), 0.8, 0.28, 0));
    for (let i = 0; i < 3; i++) g.add(put(bx(2.3, 0.07, 0.24, wood), 0, 0.6, (i - 1) * 0.26));
    return g;
  }
  g.add(put(bx(2.4, 0.12, 0.9, wood), 0, 0.92, 0));
  const legs = [];
  for (const [x, z] of [[-1.05, -0.35], [1.05, -0.35], [-1.05, 0.35], [1.05, 0.35]]) { const l = put(bx(0.12, 0.88, 0.12, wood), x, 0.44, z); g.add(l); legs.push(l); }
  g.add(put(bx(2.1, 0.08, 0.08, wood), 0, 0.25, -0.35)); g.add(put(bx(2.1, 0.08, 0.08, wood), 0, 0.25, 0.35));
  g.userData.legs = legs; return g;
}
/** Vela roxa (chama #9B00FF): set(k) com k = quanto resta (1 = inteira). */
export function makeCandle(h0 = 0.5) {
  const g = new THREE.Group(), wax = M('#efe6d6', { roughness: 0.6 });
  const body = cy(0.07, 0.075, 1, wax, 18); g.add(body);
  const pool = put(cy(0.16, 0.18, 0.02, wax, 20), 0, 0.01, 0); g.add(pool);
  const tex = flameTex();
  const fm = new THREE.SpriteMaterial({ map: tex, color: COL.roxo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const flame = new THREE.Sprite(fm); flame.scale.set(0.16, 0.3, 1); g.add(flame);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#e9c8ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); core.scale.set(0.06, 0.12, 1); g.add(core);
  const light = new THREE.PointLight(COL.roxo, 2.2, 5, 1.8); g.add(light);
  let k = 1, t = 0;
  const set = v => { k = Math.max(0.06, v); const h = h0 * k; body.scale.y = h; body.position.y = h / 2; flame.position.y = h + 0.13; core.position.y = h + 0.08; light.position.y = h + 0.2; pool.scale.setScalar(1 + (1 - k) * 0.9); };
  set(1);
  g.userData = { set, get k() { return k; }, tick(dt) { t += dt; const f = 1 + 0.12 * Math.sin(t * 13) + 0.07 * Math.sin(t * 29); flame.scale.set(0.16 * f, 0.3 * (2 - f) * 0.95, 1); light.intensity = 2.2 * f; }, flame, light };
  return g;
}
let _ft = null;
function flameTex() {
  if (_ft) return _ft;
  const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(16, 42, 1, 16, 38, 26); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.beginPath(); x.moveTo(16, 2); x.quadraticCurveTo(31, 40, 16, 62); x.quadraticCurveTo(1, 40, 16, 2); x.fill();
  _ft = new THREE.CanvasTexture(c); return _ft;
}
/** Peças da oficina destruída: tábua molhada, porta, caixa de ferramentas, painel de telhado, viga. */
export function makePiece(kind) {
  const g = new THREE.Group();
  if (kind === 'plank') g.add(put(bx(1.6, 0.06, 0.26, M('#4e3a28', { roughness: 0.5 })), 0, 0.03, 0));
  else if (kind === 'door') { const m = M('#5c3d24'); g.add(put(bx(0.9, 0.08, 1.9, m), 0, 0.04, 0)); g.add(put(bx(0.12, 0.05, 0.12, M('#b08a3a', { metalness: 0.6 })), 0.32, 0.1, 0)); }
  else if (kind === 'tools') { g.add(put(bx(0.7, 0.28, 0.32, M('#7a2e22')), 0, 0.14, 0)); g.add(put(bx(0.05, 0.05, 0.5, M('#5a4030')), 0.1, 0.34, 0)); g.add(put(bx(0.16, 0.08, 0.08, M('#808a90', { metalness: 0.7 })), 0.1, 0.36, 0.24)); }
  else if (kind === 'roof') { const m = M('#7d4a32'); g.add(put(bx(1.8, 0.07, 1.2, m), 0, 0.04, 0)); for (let i = 0; i < 5; i++) g.add(put(bx(1.8, 0.04, 0.05, M('#5b3524')), 0, 0.09, -0.5 + i * 0.25)); }
  else if (kind === 'beam') g.add(put(bx(2.6, 0.2, 0.2, M('#5a3f28')), 0, 0, 0));
  else if (kind === 'notebook') { g.add(put(bx(0.22, 0.03, 0.3, M('#2d4a6a')), 0, 0.015, 0)); g.add(put(bx(0.2, 0.02, 0.28, M('#f0ead8')), 0.006, 0.03, 0)); }
  else if (kind === 'tool') { g.add(put(bx(0.05, 0.05, 0.42, M('#6a4a30')), 0, 0, 0)); g.add(put(bx(0.16, 0.09, 0.08, M('#8c959c', { metalness: 0.7 })), 0, 0, 0.21)); }
  else if (kind === 'stone') g.add(put(bx(0.5, 0.3, 0.5, M('#8b8a84', { roughness: 1 })), 0, 0.15, 0));
  g.userData.kind = kind; return g;
}
/** Texto flutuando (frases, palavras): sprite com fundo transparente. */
export function textSprite(text, { color = '#cfe9cf', size = 0.32, font = '600 44px system-ui, sans-serif' } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 24; c.width = w; c.height = 64; x.font = font; x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 12, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(size * w / 64, size, 1); return s;
}
/** Grade branca no chão (shader: células inteiras, sem moldura); uAmt = quanto já nasceu (0..1, do centro para fora); uFade some as linhas. */
export function makeGridFloor(w = 14, d = 18) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uAmt: { value: 1 }, uFade: { value: 1 }, uHalf: { value: new THREE.Vector2(w / 2, d / 2) } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uAmt, uFade; uniform vec2 uHalf; varying vec2 vP;
      void main(){ vec2 g = abs(fract(vP) - 0.5); float l = 1.0 - smoothstep(0.0, 0.035, 0.5 - max(g.x, g.y));
        vec2 e = uHalf - abs(vP); if (e.x < 0.5 || e.y < 0.5) l = 0.0;         // sem moldura: as linhas das bordas não existem
        float r = length(vP / uHalf); float born = smoothstep(uAmt * 1.5, uAmt * 1.5 - 0.15, r);
        float hole = step(0.5, fract(sin(dot(floor(vP), vec2(12.9898, 78.233))) * 43758.5453));
        float a = l * born * mix(hole, 1.0, uFade) * (0.35 + 0.65 * uFade);
        gl_FragColor = vec4(vec3(1.0), a * 0.85); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat); m.position.y = 0.01;
  m.userData.mat = mat; return m;
}

// ---------- jogador (corpo branco fixo para as cenas da batalha) ----------
export function makeWhitePlayer() {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.8 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const B = buildBody(body); root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  root.userData.B = B; return root;
}

// ---------- indicação "E — …" (clicável no toque) ----------
let promptEl = null;
export function prompt(text, input) {
  if (!promptEl) {
    promptEl = document.createElement('div');
    promptEl.style.cssText = 'position:fixed;left:50%;bottom:24%;transform:translateX(-50%);padding:8px 18px;background:#FFF3D6;color:#2e1d10;border:3px solid #FF7A1A;border-radius:12px;font:800 18px system-ui,sans-serif;z-index:45;display:none;cursor:pointer;user-select:none';
    promptEl.addEventListener('pointerdown', e => { e.preventDefault(); promptEl._input && promptEl._input._press('KeyE'); });
    document.body.appendChild(promptEl);
  }
  promptEl._input = input;
  if (!text) { promptEl.style.display = 'none'; return; }
  if (promptEl.textContent !== text) promptEl.textContent = text;
  promptEl.style.display = 'block';
}
/** Legenda fraca (voz da figura se afastando): opacidade 0..1. */
let subEl = null;
export function whisper(text, op = 1) {
  if (!subEl) { subEl = document.createElement('div'); subEl.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);color:#d8d4cc;font:600 italic 20px system-ui,sans-serif;z-index:44;pointer-events:none;text-shadow:0 0 6px #000;transition:opacity .4s;white-space:nowrap'; document.body.appendChild(subEl); }
  if (!text || op <= 0.01) { subEl.style.opacity = '0'; return; }
  subEl.textContent = text; subEl.style.opacity = String(op);
}

// ---------- câmera em 3ª pessoa (botão direito gira/inclina; fica onde deixar) ----------
export function createChase(camera, walker, isOn, { dist = 6.2, pitch = 0.28, lookY = 1.35, side = 0 } = {}) {
  const C = { yaw: 0, pitch, oy: 0, op: 0, hold: false, dist, side };
  addEventListener('mousedown', e => { if (isOn() && e.button === 2) { C.hold = true; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 2) C.hold = false; });
  addEventListener('mousemove', e => { if (C.hold && isOn() && (e.buttons & 2)) { C.oy -= e.movementX * 0.005; C.op = Math.max(-0.2, Math.min(1.0, C.op + e.movementY * 0.004)); } });
  addEventListener('contextmenu', e => { if (isOn()) e.preventDefault(); });
  const _l = new THREE.Vector3();
  return {
    C, reset() { C.yaw = walker.heading; C.oy = 0; C.op = 0; C.hold = false; },
    update(dt, snap = false, floor = 0) {
      const k = snap ? 1 : 1 - Math.exp(-dt * 6);
      let d = walker.heading - C.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; C.yaw += d * k;
      const yaw = C.yaw + C.oy, p = C.pitch + C.op;
      // side > 0: câmera por cima do ombro direito (o jogador fica à esquerda do quadro, o que está à frente aparece à direita)
      const rx = -Math.sin(yaw) * C.side, rz = Math.cos(yaw) * C.side;
      camera.position.set(walker.x - Math.cos(yaw) * Math.cos(p) * C.dist + rx, floor + 1.5 + Math.sin(p) * C.dist, walker.z - Math.sin(yaw) * Math.cos(p) * C.dist + rz);
      camera.lookAt(_l.set(walker.x + rx * 0.55, floor + lookY, walker.z + rz * 0.55));
    },
  };
}
/** Atenção da câmera (cenas com o jogador livre): se ele não mexe na câmera nem anda há `idle` s, ela vira devagar para o
 *  que está acontecendo (sem tirar o controle: qualquer movimento cancela). */
export function attachAssist(chase, walker, input) {
  let quiet = 0;
  addEventListener('mousemove', e => { if (e.buttons & 2) quiet = 0; });
  return {
    update(dt, focus, idle = 1.4, rate = 1.2) {
      const ax = input.axis(); if (ax.x || ax.z) quiet = 0; else quiet += dt;
      if (!focus || quiet < idle) return;
      const want = Math.atan2(focus.z - walker.z, focus.x - walker.x) - walker.heading;
      let d = want - chase.C.oy; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      chase.C.oy += d * Math.min(1, dt * rate);
    },
    poke() { quiet = 0; },
  };
}
/** Braços do jogador (andando) controláveis por IK depois do walker.update (reachArm). */
export function walkerArms(walker) {
  const P = walker.parts, root = walker.object;
  if (!root.userData.arms) { root.userData.torso = P.torso; root.userData.arms = P.arms.map((a, i) => ({ s: a.s || (i ? 1 : -1), sh: a.sh, rest: a.sh.quaternion.clone(), elbow: a.elbow, erest: a.elbow.quaternion.clone() })); }
  return root;
}
/** Voz da figura ficando para trás: letras somem e viram pontos com a distância (k 0 = nítida, 1 = nada). */
export function degrade(text, k, seed = 1) {
  if (k <= 0) return text; if (k >= 1) return '';
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return text.split('').map(ch => ch === ' ' ? ' ' : r() < k ? (r() < 0.6 ? '·' : ' ') : ch).join('');
}
/** Frase de vidro (lembranças): texto num cartão translúcido; crack(n) desenha n rachaduras por cima (o toque não apaga nada). */
export function glassText(text, { color = '#bff2c4', size = 0.28 } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d'), font = '600 40px system-ui, sans-serif'; x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 40; c.width = w; c.height = 72;
  const draw = (cracks = 0, seed = 5) => {
    x.clearRect(0, 0, w, 72); x.fillStyle = 'rgba(190,255,200,0.10)'; x.strokeStyle = 'rgba(220,255,225,0.55)'; x.lineWidth = 2;
    x.beginPath(); x.roundRect(2, 4, w - 4, 64, 14); x.fill(); x.stroke();
    x.font = font; x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 20, 37);
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 1.4;
    for (let n = 0; n < cracks; n++) { let px = 20 + r() * (w - 40), py = 10 + r() * 52; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 44; py += (r() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
  };
  draw();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  sp.scale.set(size * w / 72, size, 1);
  sp.userData = { cracks: 0, crack() { sp.userData.cracks++; draw(sp.userData.cracks); t.needsUpdate = true; }, dispose() { t.dispose(); sp.material.dispose(); } };
  return sp;
}
/** Murmúrio de um grupo (vozes borradas, sem palavras), uma "voz" por pessoa: setVoices(n) cala as que sobram, uma a uma. */
export function createMurmur(audio, n = 5) {
  let N = null, lvl = 0, cur = 0, t = 0, on = n;
  function build() {
    const ac = audio.ctx; if (!ac || !audio.out) return null;
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.03; b1 = 0.985 * b1 + w * 0.06; b2 = 0.9 * b2 + w * 0.15; d[i] = (b0 + b1 + b2) * 0.5; }
    for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] = d[i] * k + d[len - 2000 + i] * (1 - k); }
    const out = ac.createGain(); out.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; lp.connect(out); out.connect(audio.out);
    const voices = Array.from({ length: n }, (_, i) => {
      const f = [300, 430, 560, 760, 980, 1200][i % 6];
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5;
      const g = ac.createGain(); g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(lp); s.start(0, i * 0.61);
      return { s, bp, g, f, ph: i * 1.7, sp: 0.6 + i * 0.23, k: 1 };
    });
    return { out, voices };
  }
  return {
    level(k) { lvl = k; if (!N && k > 0) N = build(); },
    setVoices(k) { on = k; },
    update(dt) {
      if (!N) return; t += dt; cur += (lvl - cur) * (1 - Math.exp(-dt * 1.2));
      try {
        N.out.gain.value = cur * 0.5;
        N.voices.forEach((v, i) => { v.k += ((i < on ? 1 : 0) - v.k) * Math.min(1, dt * 0.8); const a = 0.5 + 0.5 * Math.sin(t * v.sp + v.ph) * Math.sin(t * v.sp * 2.7 + v.ph * 2); v.g.gain.value = (0.25 + 0.75 * Math.max(0, a)) * v.k; v.bp.frequency.value = v.f * (1 + 0.08 * Math.sin(t * v.sp * 1.9 + v.ph)); });
      } catch (e) { /* */ }
    },
    stop() { if (!N) return; try { N.voices.forEach(v => v.s.stop()); N.out.disconnect(); } catch (e) { /* */ } N = null; cur = 0; lvl = 0; },
  };
}
/** Câmera para uma tomada (com suavização opcional). */
export function shotTo(camera, pos, look, k = 1) {
  const p = new THREE.Vector3(...pos);
  if (k >= 1) camera.position.copy(p); else camera.position.lerp(p, k);
  if (!camera.userData.look) camera.userData.look = new THREE.Vector3(...look);
  const L = camera.userData.look; if (k >= 1) L.set(...look); else L.lerp(new THREE.Vector3(...look), k);
  camera.lookAt(L);
}

// ---------- sons (efeitos, WebAudio) ----------
export function createSfx(audio) {
  let wind = null;
  const ok = () => audio.ctx && audio.out;
  function noiseBuf(sec, col = 0.97) { const ac = audio.ctx, len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0); let v = 0; for (let i = 0; i < len; i++) { v = col * v + (1 - col) * (Math.random() * 2 - 1); d[i] = v * (col > 0.5 ? 3 : 1); } return b; }
  return {
    /** Vento contínuo (nível 0..1; 0 para). */
    wind(level, freq = 300) {
      if (!ok()) return; const ac = audio.ctx;
      if (!wind && level > 0) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf(3); s.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.6;
        const g = ac.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(audio.out); s.start(); wind = { s, f, g };
      }
      if (wind) { try { wind.g.gain.setTargetAtTime(level, ac.currentTime, 0.4); wind.f.frequency.setTargetAtTime(freq * (0.8 + level * 0.5), ac.currentTime, 0.6); } catch (e) { /* */ } }
    },
    stop() { if (wind) { try { wind.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.2); const w = wind; setTimeout(() => { try { w.s.stop(); w.g.disconnect(); } catch (e) { /* */ } }, 800); } catch (e) { /* */ } wind = null; } },
    /** Toque curto: 'place' (madeira), 'chair' (arrastar), 'crack', 'fall', 'chime' (vidro suave), 'whoosh', 'thud'. */
    play(kind, vol = 1) {
      if (!ok()) return; const ac = audio.ctx, now = ac.currentTime + 0.01, out = ac.createGain(); out.gain.value = vol; out.connect(audio.out);
      const noise = (sec, f, type = 'lowpass', g0 = 0.6, dec = 6) => { const s = ac.createBufferSource(); s.buffer = noiseBuf(sec, 0); const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; const g = ac.createGain(); g.gain.setValueAtTime(g0, now); g.gain.exponentialRampToValueAtTime(0.001, now + sec); s.connect(fl); fl.connect(g); g.connect(out); s.start(now); };
      const tone = (f0, f1, sec, g0 = 0.4, type = 'sine', t0 = 0) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, now + t0); o.frequency.exponentialRampToValueAtTime(f1, now + t0 + sec); g.gain.setValueAtTime(0, now + t0); g.gain.linearRampToValueAtTime(g0, now + t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + t0 + sec); o.connect(g); g.connect(out); o.start(now + t0); o.stop(now + t0 + sec + 0.05); };
      if (kind === 'place') { tone(180, 90, 0.18, 0.5, 'triangle'); noise(0.12, 900); }
      else if (kind === 'chair') { noise(0.5, 500, 'bandpass', 0.35); tone(120, 80, 0.4, 0.15, 'sawtooth'); }
      else if (kind === 'crack') { noise(0.35, 2400, 'highpass', 0.5); tone(300, 120, 0.2, 0.2, 'square'); }
      else if (kind === 'fall') { noise(0.9, 400, 'lowpass', 0.8); tone(90, 40, 0.7, 0.5, 'sine', 0.05); }
      else if (kind === 'chime') { for (let i = 0; i < 3; i++) tone(1300 + i * 520, 1250 + i * 500, 1.2, 0.08, 'sine', i * 0.07); }
      else if (kind === 'whoosh') noise(0.8, 700, 'bandpass', 0.4);
      else if (kind === 'thud') { tone(80, 32, 0.8, 0.8); noise(0.3, 300, 'lowpass', 0.4); }
      else if (kind === 'presence') { tone(52, 44, 2.6, 0.22, 'sine'); tone(78, 70, 2.2, 0.06, 'sine', 0.15); noise(2.2, 160, 'lowpass', 0.12); }   // a voz da figura: um grave baixo por baixo da fala
      else if (kind === 'tick') { tone(3200, 2900, 0.09, 0.07, 'sine'); tone(4700, 4300, 0.06, 0.035, 'sine', 0.01); }
      else if (kind === 'creak') { const o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, now); o.frequency.linearRampToValueAtTime(110, now + 0.5); o.frequency.linearRampToValueAtTime(64, now + 0.9); f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 6; g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.18, now + 0.12); g.gain.exponentialRampToValueAtTime(0.001, now + 1.0); o.connect(f); f.connect(g); g.connect(out); o.start(now); o.stop(now + 1.05); }
      else if (kind === 'step') noise(0.12, 900 + Math.random() * 500, 'bandpass', 0.18);
      else if (kind === 'scrape') { noise(0.9, 380, 'bandpass', 0.3); tone(95, 70, 0.8, 0.08, 'sawtooth'); }
      else if (kind === 'drip') tone(1500 + Math.random() * 900, 900, 0.08, 0.05, 'sine');
      else if (kind === 'burn') { noise(0.5, 1800, 'bandpass', 0.06); tone(230, 180, 0.4, 0.03, 'triangle'); }
      else if (kind === 'out') { tone(220, 110, 0.6, 0.15, 'sine'); }
    },
  };
}

/** Pessoa olhando/andando: gira o objeto (modelos olham para +X) em direção a um ponto, suave. */
export function faceTo(obj, x, z, dt, rate = 6) {
  const want = Math.atan2(-(z - obj.position.z), x - obj.position.x);
  let d = want - obj.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
  obj.rotation.y += d * Math.min(1, dt * rate);
}
export const ease = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Zumbido grave contínuo (tensão que sobe aos poucos): level(k) 0..1, tone(f) muda a nota devagar. */
export function createDrone(audio, f0 = 55) {
  let N = null, lvl = 0, cur = 0, f = f0;
  function build() {
    const ac = audio.ctx; if (!ac || !audio.out) return null;
    const out = ac.createGain(); out.gain.value = 0; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(out); out.connect(audio.out);
    const osc = [1, 1.004, 1.5, 2.003].map((r, i) => { const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f * r; const g = ac.createGain(); g.gain.value = [0.5, 0.45, 0.12, 0.08][i]; o.connect(g); g.connect(lp); o.start(); return { o, r }; });
    return { out, lp, osc };
  }
  return {
    level(k) { lvl = k; if (!N && k > 0) N = build(); },
    tone(nf) { f = nf; },
    update(dt) { if (!N) return; cur += (lvl - cur) * (1 - Math.exp(-dt * 0.8)); try { N.out.gain.value = cur * 0.16; N.lp.frequency.value = 260 + 500 * cur; for (const v of N.osc) v.o.frequency.setTargetAtTime(f * v.r, audio.ctx.currentTime, 0.8); } catch (e) { /* */ } },
    stop() { if (!N) return; try { N.osc.forEach(v => v.o.stop()); N.out.disconnect(); } catch (e) { /* */ } N = null; cur = 0; lvl = 0; },
  };
}
/** Zumbido de lâmpada (poste): nível pela distância. */
export function createBuzz(audio) {
  let N = null, lvl = 0, cur = 0;
  return {
    level(k) { lvl = k; if (!N && k > 0 && audio.ctx && audio.out) { const ac = audio.ctx, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = 120; o2.type = 'sine'; o2.frequency.value = 240; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2; g.gain.value = 0; o.connect(f); o2.connect(f); f.connect(g); g.connect(audio.out); o.start(); o2.start(); N = { o, o2, g }; } },
    update(dt, flick = 1) { if (!N) return; cur += (lvl - cur) * (1 - Math.exp(-dt * 3)); try { N.g.gain.value = cur * 0.012 * flick; } catch (e) { /* */ } },
    stop() { if (!N) return; try { N.o.stop(); N.o2.stop(); N.g.disconnect(); } catch (e) { /* */ } N = null; cur = 0; lvl = 0; },
  };
}
