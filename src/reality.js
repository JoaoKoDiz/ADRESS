// Modo Livre, entrega errada com o efeito "Devolução da Realidade" (o mais exagerado): o universo é embalado e devolvido.
//   0–3 s    a encomenda pula; silêncio; carimbo gigante "ENDEREÇO INEXISTENTE" na casa (a quadra encolhe como mola e
//            volta); o carimbo sobe e deixa uma rachadura na tela, como numa folha de papel.
//   3–7 s    (cena separada) duas mãos de papelão abrem a imagem do bairro como as abas de uma caixa; a câmera sai e mostra
//            o bairro, o planeta e as estrelas dentro de uma caixa; as mãos fecham, e galáxias/planetas são sugados em espiral.
//   7–11 s   a caixa incha e explode em caixinhas (cada uma com um universo); a câmera passa por elas; viram folhas, são
//            empilhadas, a prensa esmaga a pilha numa caixinha e um braço enrola fita até virar uma esfera.
//   11–15 s  etiqueta "DEVOLVER AO REMETENTE", esteira, canhão de entregas; recuo e carga; disparo: viagem por camadas.
//   15–19 s  o bairro intacto; um buraco no céu; o pacotinho cai devagar na porta; meio segundo; a caixa abre.
//   19–23 s  tudo explode dentro da quadra; a casa estica, achata, vira cubos e confete; a quadra vira caixa e o carimbo
//            "DEVOLVIDO" esmaga: fica uma cratera em forma de caixa, com fita e uma etiqueta no fundo.
//   23–25 s  bandeirinha "Ops."; a câmera volta para a van e os controles voltam.
import * as THREE from 'three';
import { glowTexture, add, disposeFx } from './laser.js';
import { textTexture } from './models/kit.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = x => Math.max(0, Math.min(1, x));
const lerp = (a, b, k) => a + (b - a) * k;
const CARD = '#c98a4a', CARD2 = '#a86d36', TAPE = '#e8d6a8', RED = '#d8221e';
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const T_SPACE = 3, T_HOME = 15, T_END = 25;

/** Placa de texto (plano com textura). */
function textPlane(text, w, h, { bg = 'rgba(0,0,0,0)', fg = RED, font } = {}) {
  const tex = textTexture(text, { width: 1024, height: Math.round(1024 * h / w), bg, fg, font: font || `900 ${Math.round(1024 * h / w * 0.55)}px "Trebuchet MS", sans-serif` });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
}
/** Carimbo gigante: cabo de madeira e base de borracha vermelha com a inscrição nas laterais. */
function buildStamp(text, size) {
  const g = new THREE.Group();
  g.add(Object.assign(new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.18, size * 0.7), mat(RED)), {}));
  const block = new THREE.Mesh(new THREE.BoxGeometry(size * 0.92, size * 0.22, size * 0.62), mat('#8a5a36')); block.position.y = size * 0.2; g.add(block);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.08, size * 0.12, size * 0.5, 12), mat('#6b4428')); neck.position.y = size * 0.55; g.add(neck);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 16, 12), mat('#e0402a')); knob.position.y = size * 0.88; g.add(knob);
  for (const s of [1, -1]) { const t = textPlane(text, size * 0.95, size * 0.17, { fg: '#ffffff', bg: RED }); t.position.set(0, 0, s * size * 0.351); if (s < 0) t.rotation.y = Math.PI; g.add(t); }
  return g;
}
/** Mão de papelão com fita (palma, 4 dedos e polegar). side = ±1. */
function buildHand(side, s = 1) {
  const g = new THREE.Group(), m = mat(CARD), t = mat(TAPE);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(3 * s, 3.4 * s, 0.9 * s), m));
  const tape = new THREE.Mesh(new THREE.BoxGeometry(3.05 * s, 0.5 * s, 0.95 * s), t); tape.position.y = -0.4 * s; g.add(tape);
  for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.62 * s, 2.4 * s, 0.7 * s), m); f.position.set((-1.1 + k * 0.73) * s, 2.8 * s, 0); f.rotation.x = -0.3; g.add(f);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.66 * s, 0.25 * s, 0.74 * s), t); b.position.copy(f.position).add(V(0, 0.4 * s, 0)); b.rotation.x = -0.3; g.add(b); }
  const th = new THREE.Mesh(new THREE.BoxGeometry(0.7 * s, 2 * s, 0.7 * s), m); th.position.set(side * 1.9 * s, 0.4 * s, 0); th.rotation.z = -side * 0.8; g.add(th);
  return g;
}
function cardboardBox(w, h, d, open = true) {             // caixa de papelão (só as paredes; a tampa são abas à parte)
  const g = new THREE.Group(), m = mat(CARD, { side: THREE.DoubleSide }), m2 = mat(CARD2, { side: THREE.DoubleSide });
  const face = (W, H, x, y, z, ry, rx = 0, mm = m) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mm); p.position.set(x, y, z); p.rotation.set(rx, ry, 0); g.add(p); return p; };
  face(w, h, 0, 0, -d / 2, 0, 0, m2); face(d, h, -w / 2, 0, 0, Math.PI / 2); face(d, h, w / 2, 0, 0, -Math.PI / 2); face(w, d, 0, -h / 2, 0, 0, -Math.PI / 2, m2);
  if (!open) face(w, d, 0, h / 2, 0, 0, -Math.PI / 2);
  const tape = new THREE.Mesh(new THREE.BoxGeometry(w * 0.12, h * 1.002, d * 1.002), mat(TAPE)); g.add(tape);
  return g;
}
function galaxyPoints(n, R, c1 = [1, 0.85, 0.6], c2 = [0.6, 0.75, 1]) {
  const p = new Float32Array(n * 3), c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const arm = i % 3, r = Math.pow(Math.random(), 0.7) * R, a = arm * 2.094 + r / R * 5 + (Math.random() - 0.5) * 0.6;
    p.set([Math.cos(a) * r, (Math.random() - 0.5) * R * 0.05, Math.sin(a) * r], i * 3); const k = r / R; c.set([c1[0] * (1 - k) + c2[0] * k, c1[1] * (1 - k) + c2[1] * k, c1[2] * (1 - k) + c2[2] * k], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const pts = new THREE.Points(g, add(new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true }))); pts.frustumCulled = false; return pts;
}
function starField(n, R) {
  const p = new Float32Array(n * 3); for (let i = 0; i < n; i++) p.set(V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(R * (0.4 + Math.random() * 0.6)).toArray(), i * 3);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, color: '#ffffff', fog: false })); pts.frustumCulled = false; return pts;
}
function earthMesh(r) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.7 })));
  for (let i = 0; i < 7; i++) { const n = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), c = new THREE.Mesh(new THREE.SphereGeometry(r * (0.22 + Math.random() * 0.2), 10, 8), new THREE.MeshStandardMaterial({ color: '#4fae5a' })); c.position.copy(n).multiplyScalar(r * 0.9); c.scale.set(1, 1, 0.35); c.lookAt(n.clone().multiplyScalar(r * 2)); g.add(c); }
  return g;
}

// ---------------- cena separada ----------------
function buildScene(aspect, snapTex) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05060d');
  const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 5000);
  scene.add(new THREE.AmbientLight('#ffffff', 0.9)); const dl = new THREE.DirectionalLight('#fff4dd', 1.6); dl.position.set(20, 40, 30); scene.add(dl);
  const H = 2 * 10 * Math.tan(THREE.MathUtils.degToRad(25)), W = H * aspect, D = 18;
  // a caixa do universo: frente = a imagem do bairro (duas abas que abrem), dentro o planeta, estrelas, galáxia e nebulosas
  const uni = new THREE.Group(); scene.add(uni);
  const box = cardboardBox(W, H, D); box.position.z = -D / 2; uni.add(box);
  const inside = new THREE.Group(); inside.position.z = -D / 2; uni.add(inside);
  const earth = earthMesh(1.4); earth.position.set(0, -0.6, 0); inside.add(earth);
  const stars = starField(700, 8); inside.add(stars);
  const gal = galaxyPoints(2500, 5); gal.position.set(W * 0.25, H * 0.2, -3); gal.rotation.x = 1.0; inside.add(gal);
  const neb = [0, 1, 2].map(k => { const s = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,180,255,0.6)', ['rgba(140,60,255,0.35)', 'rgba(60,160,255,0.35)', 'rgba(255,90,140,0.35)'][k]) }))); s.position.set((k - 1) * W * 0.3, (k % 2 ? -1 : 1) * H * 0.25, -4 - k); s.scale.setScalar(7); inside.add(s); return s; });
  const flaps = [-1, 1].map(s => {                     // abas = metades da imagem do bairro, presas nas bordas de fora
    const piv = new THREE.Group(); piv.position.set(s * W / 2, 0, 0); uni.add(piv);
    const geo = new THREE.PlaneGeometry(W / 2, H); const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
    const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: snapTex, side: THREE.DoubleSide, toneMapped: false })); p.position.x = -s * W / 4; piv.add(p);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W / 2, H), mat(CARD, { side: THREE.BackSide })); back.position.x = -s * W / 4; back.position.z = -0.01; piv.add(back);
    return piv;
  });
  const hands = [-1, 1].map(s => { const h = buildHand(s, 0.8); h.visible = false; scene.add(h); return h; });
  // planetas e galáxias de fora, que são sugados para dentro da caixa
  const outside = new THREE.Group(); scene.add(outside);
  const sucked = [];
  for (let k = 0; k < 16; k++) { const a = k * 0.39, R = 40 + (k % 5) * 12;
    const o = k % 3 === 0 ? galaxyPoints(600, 6, [1, 0.8, 0.9], [0.5, 0.9, 1]) : new THREE.Mesh(new THREE.SphereGeometry(1.5 + (k % 4), 18, 12), new THREE.MeshStandardMaterial({ color: ['#c8502f', '#d8b07a', '#8fd6e0', '#e3c27a', '#3f6fe0'][k % 5] }));
    o.position.set(Math.cos(a) * R, Math.sin(a * 1.7) * R * 0.5, -D / 2 + Math.sin(a) * R); outside.add(o); sucked.push({ o, a, R, y: o.position.y }); }
  outside.add(starField(1500, 600));
  const swirl = [0, 1, 2].map(k => { const t = new THREE.Mesh(new THREE.TorusGeometry(4 + k * 3, 0.25, 8, 48), add(new THREE.MeshBasicMaterial({ color: ['#9fd8ff', '#ff7ae0', '#ffd27a'][k], opacity: 0 }))); t.position.z = 0.5; scene.add(t); return t; });
  // enxame de caixinhas (cada uma com um universo na abertura)
  const swarm = new THREE.Group(); swarm.visible = false; scene.add(swarm);
  const minis = [], mg = new THREE.BoxGeometry(1, 1, 1), mm = mat(CARD);
  for (let k = 0; k < 140; k++) { const b = new THREE.Mesh(mg, mm); const glow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,0.9)', ['rgba(140,90,255,0.6)', 'rgba(80,180,255,0.6)', 'rgba(255,120,200,0.6)'][k % 3]) }))); glow.position.y = 0.6; glow.scale.setScalar(1.4); b.add(glow);
    swarm.add(b); const dir = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.7).normalize(); minis.push({ b, glow, dir, sp: 18 + Math.random() * 30, rot: V(Math.random(), Math.random(), Math.random()) }); }
  // máquina de embalagem colossal (prensa), esfera de fita, etiqueta, esteira e canhão
  const M = V(0, 0, -260), mach = new THREE.Group(); mach.position.copy(M); scene.add(mach);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, 26, 3), mat('#5a5f68')); p.position.set(s * 10, 9, 0); mach.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 5), mat('#3a3d44')); beam.position.y = 22; mach.add(beam);
  const press = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 10), mat('#e0a526')); press.position.y = 16; mach.add(press);
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 12), mat('#c9ccd0')); piston.position.y = 19; mach.add(piston);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 12), mat('#3a3d44')); bed.position.y = -0.5; mach.add(bed);
  const stack = new THREE.Group(); mach.add(stack);
  const tinyBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), mat(CARD)); tinyBox.position.y = 0.7; tinyBox.visible = false; mach.add(tinyBox);
  const ball = new THREE.Group(); ball.position.y = 1.6; ball.visible = false; mach.add(ball);
  ball.add(new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), mat(TAPE, { roughness: 0.4 })));
  for (let k = 0; k < 7; k++) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.05, 6, 32), mat('#c9b47a')); r.rotation.set(k * 0.9, k * 0.5, 0); ball.add(r); }
  const label = textPlane('DEVOLVER AO REMETENTE', 3.6, 0.9, { bg: '#ffffff', fg: RED, font: '900 120px "Trebuchet MS", sans-serif' }); label.position.set(0, 0.2, 1.7); label.visible = false; ball.add(label);
  const arm = new THREE.Group(); arm.position.y = 1.6; arm.visible = false; mach.add(arm);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 0.6), mat('#9da1a7')); a.position.x = 3; arm.add(a); const roll = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.3, 8, 16), mat(TAPE)); roll.position.x = 6; arm.add(roll); }
  // esteira até o canhão e o canhão (engrenagens, molas, tubos e caixas)
  const conv = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 30), mat('#2b2f36')); conv.position.set(0, -0.4, -15); mach.add(conv);
  const rollers = []; for (let k = 0; k < 10; k++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 4.2, 10), mat('#9da1a7')); r.rotation.z = Math.PI / 2; r.position.set(0, -0.2, -2 - k * 3); mach.add(r); rollers.push(r); }
  const cannon = new THREE.Group(); cannon.position.set(0, 3, -36); mach.add(cannon);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.6, 20, 20, 1, true), mat('#3a3d44', { side: THREE.DoubleSide, metalness: 0.4 })); barrel.rotation.x = Math.PI / 2; barrel.position.z = -10; cannon.add(barrel);
  const muzzleGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,160,40,0.8)') }))); muzzleGlow.position.z = -20; muzzleGlow.scale.setScalar(0.1); cannon.add(muzzleGlow);
  const gears = [];
  for (let k = 0; k < 5; k++) { const gr = new THREE.Mesh(new THREE.TorusGeometry(2 + k % 2, 0.6, 6, 10), mat(k % 2 ? '#e0a526' : '#9da1a7', { metalness: 0.4 })); gr.position.set((k % 2 ? 5 : -5), 2 + k * 1.5, -4 - k * 3.5); gr.rotation.y = Math.PI / 2; cannon.add(gr); gears.push(gr); }
  for (let k = 0; k < 6; k++) { const sp = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.18, 6, 16), mat('#c9ccd0')); sp.rotation.x = Math.PI / 2; sp.position.set(0, -4 + k * 0.5, 4); cannon.add(sp); }
  for (const s of [-1, 1]) { const tube = new THREE.Mesh(new THREE.TorusGeometry(6, 0.6, 8, 24, Math.PI), mat('#2f78d0')); tube.position.set(s * 4, 0, -8); tube.rotation.y = Math.PI / 2; cannon.add(tube); }
  for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat(CARD)); b.position.set(-7 + (k % 2) * 1.2, -4 + k * 2.1, 2); b.rotation.y = k; cannon.add(b); }
  const spaceStars = starField(2500, 900); spaceStars.position.copy(M); scene.add(spaceStars);
  // camadas de realidades no caminho do disparo (ao longo de −Z a partir do canhão)
  const layers = [], L0 = M.z - 36 - 30;
  for (let k = 0; k < 12; k++) {
    const kind = k % 4, z = L0 - k * 70; let o;
    if (kind === 0) { o = galaxyPoints(1500, 30); o.rotation.x = 1.2; }
    else if (kind === 1) { o = new THREE.GridHelper(120, 24, '#4fd0ff', '#2f78d0'); o.rotation.x = Math.PI / 2; }
    else if (kind === 2) { o = new THREE.Group(); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(60, 80), new THREE.MeshBasicMaterial({ color: '#f6f1e4', side: THREE.DoubleSide })); p.position.x = s * 30; o.add(p); } }
    else { o = cardboardBox(40, 40, 40); }
    o.position.set(M.x, M.y + 3, z); scene.add(o); layers.push({ o, z, kind });
  }
  return { scene, camera, W, H, D, uni, box, inside, earth, stars, gal, neb, flaps, hands, outside, sucked, swirl, swarm, minis, M, mach, press, piston, stack, tinyBox, ball, label, arm, rollers, cannon, barrel, muzzleGlow, gears, spaceStars, layers };
}

export function createReality(audio, stageEl, renderer) {
  let run = null, S = null;
  const A = audio.ursa || {};
  const call = (k, ...a) => { try { A[k] && A[k](...a); } catch (e) { /* som opcional */ } };
  const _m = new THREE.Matrix4();
  // rachadura na tela (a realidade como folha de papel)
  const crack = document.createElement('div');
  crack.style.cssText = 'position:absolute;inset:0;z-index:25;pointer-events:none;display:none;';
  crack.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><polyline fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="bevel" vector-effect="non-scaling-stroke" style="filter:drop-shadow(0 0 6px #fff)"/><polyline fill="none" stroke="#111" stroke-width="6" stroke-linejoin="bevel" vector-effect="non-scaling-stroke"/></svg>';
  stageEl.appendChild(crack);
  const lines = crack.querySelectorAll('polyline');
  let crackPts = [];
  function setCrack(k) {
    const n = Math.max(2, Math.round(crackPts.length * k)), s = crackPts.slice(0, n).map(p => p.join(',')).join(' ');
    lines.forEach(l => l.setAttribute('points', s));
  }

  return {
    get active() { return !!run; },
    get inSpace() { return !!run && run.t >= T_SPACE && run.t < T_HOME; },
    get scene() { return S && S.scene; }, get camera() { return S && S.camera; },
    get time() { return run ? run.t : -1; },
    /** opts: { parent, local, rect, moon, cam, world, lot (grupo da construção), onHide(), onDestroy(), onCrater(group), onEnd() } */
    start(opts) {
      const G = new THREE.Group(); G.position.copy(opts.local); opts.parent.add(G); opts.parent.updateMatrixWorld(true);
      const base = G.getWorldPosition(new THREE.Vector3()), up = V(0, 1, 0).applyQuaternion(G.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const cam = opts.cam, P0 = cam.position.clone();
      let hor = P0.clone().sub(base); hor.addScaledVector(up, -hor.dot(up)); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
      const w = opts.rect ? opts.rect.w : 17, d = opts.rect ? opts.rect.d : 17, hw = Math.min(w, d) / 2;
      const Pc = base.clone().addScaledVector(hor, 44).addScaledVector(up, 26);
      // cópia da construção (para esticar/achatar/desmontar sem mexer no bairro)
      let clone = null;
      if (opts.lot) { clone = opts.lot.clone(true); clone.traverse(o => { if (o.isMesh) o.visible = true; }); opts.lot.parent.add(clone); clone.visible = false; }
      // o pacotinho que pula na frente da casa (0 s) e o que volta pelo buraco (15 s)
      const parcel = new THREE.Group(); parcel.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1), mat(CARD))); parcel.add(new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.92, 0.2), mat(TAPE)));
      const frontLocal = new THREE.Vector3(0, 0, 0); { const hw2 = hw - 1.5; const loc = G.worldToLocal(base.clone().addScaledVector(hor, hw2)); frontLocal.copy(loc).setY(0); }
      parcel.position.copy(frontLocal); parcel.visible = false; G.add(parcel);
      const stamp = buildStamp('ENDEREÇO INEXISTENTE', Math.max(w, d) * 1.05); stamp.visible = false; G.add(stamp);
      const stamp2 = buildStamp('DEVOLVIDO', Math.max(w, d) * 1.05); stamp2.visible = false; G.add(stamp2);
      const ink = textPlane('ENDEREÇO INEXISTENTE', Math.max(w, d) * 1.1, Math.max(w, d) * 0.22); ink.position.y = 11; ink.visible = false; G.add(ink);
      run = { ...opts, G, t: 0, base, up, hor, P0, look0: P0.clone().add(V(0, 0, -20).applyQuaternion(cam.quaternion)), Pc, w, d, hw, clone, parcel, frontLocal, stamp, stamp2, ink, fx: [], sfx: {}, shake: 0, snap: null };
      crackPts = []; let x = 50 + (Math.random() - 0.5) * 10; for (let y = -2; y <= 102; y += 4 + Math.random() * 4) { x += (Math.random() - 0.5) * 9; crackPts.push([x.toFixed(1), y.toFixed(1)]); }
      call('begin'); call('rHop');
    },
    /** imagem do bairro para as abas (tirada no fim da parte 0–3 s, com a câmera do jogo) */
    _snapshot() {
      const r = run, sz = renderer.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(Math.max(2, Math.floor(sz.x / 2)), Math.max(2, Math.floor(sz.y / 2))); rt.texture.colorSpace = THREE.SRGBColorSpace;
      const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); renderer.render(r.world.scene, r.cam); renderer.setRenderTarget(prev);
      r.rt = rt; S = buildScene(r.cam.aspect, rt.texture);
    },
    update(dt) {
      if (!run) return false;
      const r = run; r.t += dt; const t = r.t, G = r.G;
      const once = (k, fn) => { if (!r.sfx[k]) { r.sfx[k] = true; fn(); } };
      const sz = Math.max(r.w, r.d);
      // ---------------- 0–3 s: endereço rejeitado ----------------
      if (t < T_SPACE) {
        const p = r.parcel; p.visible = t < 0.9; p.position.y = Math.max(0, Math.sin(clamp01(t / 0.45) * Math.PI) * 1.4); p.rotation.y = t * 3;
        if (t > 0.95) {                                    // o carimbo desce (depois de meio segundo de silêncio)
          once('fall', () => { call('rStampFall'); r.stamp.visible = true; if (r.clone) { r.clone.visible = true; r.onHide && r.onHide(); } });
          const k = clamp01((t - 0.95) / 0.45), y = lerp(160, 6.5, k * k);
          const rise = ease((t - 1.9) / 0.8); r.stamp.position.y = t < 1.9 ? y : lerp(6.5, 220, rise * rise);
          if (k >= 1) once('slam', () => { call('rStamp'); r.shake = 2; r.ink.visible = true; this._ring(0, sz * 0.75, '#ff5a3a', 0.6); });
        }
        if (r.clone) {                                     // a quadra encolhe como mola e volta
          const s = t < 1.4 ? 1 : 1 - 0.55 * Math.exp(-(t - 1.4) * 5) * Math.cos((t - 1.4) * 22);
          r.clone.scale.y = t < 1.9 ? Math.min(1, s) * (t < 1.42 ? 1 : 1) : s;
        }
        r.ink.material.opacity = 1 - ease((t - 2.4) / 0.5); r.ink.lookAt(r.cam.position);
        if (t > 2.15) { once('tear', () => call('rTear')); crack.style.display = 'block'; setCrack(ease((t - 2.15) / 0.6)); }
        if (t > 2.95 && !S) this._snapshot();
      }
      // ---------------- 3–15 s: cena separada ----------------
      if (t >= T_SPACE && t < T_HOME && S) {
        r.stamp.visible = false; r.ink.visible = false; if (r.clone) r.clone.visible = false;
        const C = S.camera; let cam = V(0, 0, 10), look = V(0, 0, 0); const u = t - T_SPACE;
        crack.style.display = u < 0.35 ? 'block' : 'none';
        S.uni.visible = t < 7.5;
        if (t < 7) {                                       // mãos abrem; câmera sai; mãos fecham; tudo sugado
          once('hands', () => call('rHands'));
          const open = ease((u - 0.3) / 1.2), close = ease((t - 5.6) / 1.2);
          const ang = 1.9 * open * (1 - close);
          S.flaps[0].rotation.y = ang; S.flaps[1].rotation.y = -ang;
          S.hands.forEach((h, i) => { const s = i ? 1 : -1; h.visible = u > 0.15; const e = S.flaps[i]; const edge = V(-s * S.W / 2, 0, 0).applyMatrix4(e.matrixWorld);
            h.position.copy(edge).add(V(-s * 0.4, -S.H * 0.25, 0.8)); h.rotation.set(0, s * 0.3, s * 0.5); });
          const back = ease((u - 1.6) / 1.4);
          cam = V(lerp(0, 18, back), lerp(0, 14, back), lerp(10, 70, back)); look = V(0, 0, lerp(0, -S.D / 2, back));
          if (t > 5.4) {                                   // sugados em espiral para dentro da caixa
            once('suck', () => call('rSuck'));
            const k = ease((t - 5.4) / 1.6);
            S.sucked.forEach(sk => { const a = sk.a + k * 9, R = sk.R * (1 - k); sk.o.position.set(Math.cos(a) * R, sk.y * (1 - k), -S.D / 2 + Math.sin(a) * R); sk.o.scale.setScalar(Math.max(0.01, 1 - k * 0.9)); });
            S.inside.rotation.z += dt * 4 * k; S.inside.scale.setScalar(1 - 0.5 * k);
            S.swirl.forEach((sw, i) => { sw.material.opacity = 0.8 * Math.sin(k * Math.PI); sw.rotation.z += dt * (6 + i * 3); sw.scale.setScalar(1 + (1 - k) * 2); });
          }
        } else if (t < 11) {                               // nem o universo cabe
          S.hands.forEach(h => { h.visible = false; });
          if (t < 7.5) { const k = (t - 7) / 0.5; S.uni.scale.set(1 + 0.35 * k + 0.08 * Math.sin(t * 60), 1 + 0.35 * k + 0.08 * Math.sin(t * 53), 1 + 0.35 * k); cam = V(18, 14, 70); look = V(0, 0, -S.D / 2); }
          else {
            once('burst', () => { call('rBurst'); S.swarm.visible = true; S.minis.forEach(m => m.b.position.set((Math.random() - 0.5) * S.W, (Math.random() - 0.5) * S.H, -S.D / 2 + (Math.random() - 0.5) * S.D)); });
            const a = t - 7.5;
            if (t < 9) {                                   // a câmera atravessa o enxame
              S.minis.forEach(m => { m.b.position.addScaledVector(m.dir, m.sp * dt * Math.max(0.2, 1 - a * 0.4)); m.b.rotation.x += m.rot.x * dt * 3; m.b.rotation.y += m.rot.y * dt * 3; });
              cam = V(lerp(18, 0, ease(a / 1.5)), lerp(14, 2, ease(a / 1.5)), lerp(70, -60, ease(a / 1.5))); look = cam.clone().add(V(0, 0, -20));
            } else {                                       // viram folhas e são empilhadas na máquina; prensa; fita
              once('machine', () => call('rMachine'));
              const k = ease((t - 9) / 0.8);
              S.minis.forEach((m, i) => {
                if (!m.sheet) { m.sheet = true; m.from = m.b.position.clone(); m.glow.visible = false; m.b.material = new THREE.MeshStandardMaterial({ color: '#f6f1e4' }); }
                const to = S.M.clone().add(V(0, 0.05 + i * 0.045, 0)); m.b.position.copy(m.from).lerp(to, ease((t - 9 - i * 0.003) / 0.8));
                m.b.scale.set(lerp(1, 9, k), lerp(1, 0.04, k), lerp(1, 7, k)); m.b.rotation.set(lerp(m.b.rotation.x, 0, k), 0, lerp(m.b.rotation.z, 0, k));
              });
              const pk = ease((t - 9.9) / 0.35);
              S.press.position.y = lerp(16, 1.2, pk); S.piston.position.y = lerp(19, 8, pk); S.piston.scale.y = lerp(1, 3, pk);
              if (t > 10.25) { S.swarm.visible = false; S.tinyBox.visible = t < 10.5; S.press.position.y = lerp(1.2, 16, ease((t - 10.3) / 0.3)); }
              if (t > 10.45) {                             // o braço enrola fita até virar uma esfera
                S.arm.visible = true; S.arm.rotation.y += dt * 60; S.arm.rotation.z = Math.sin(t * 40) * 0.6;
                S.ball.visible = true; const bk = ease((t - 10.45) / 0.5); S.ball.scale.setScalar(lerp(0.4, 1, bk)); S.ball.rotation.y += dt * 8;
              }
              cam = S.M.clone().add(V(16, 12, 30)); look = S.M.clone().add(V(0, 3, 0));
            }
          }
        } else {                                           // devolver ao remetente: etiqueta, esteira, canhão, disparo
          S.arm.visible = false; S.label.visible = true; once('label', () => call('rLabel'));
          if (t < 13) {
            S.ball.rotation.y = lerp(S.ball.rotation.y, 0, 0.2);
            const ck = ease((t - 11.6) / 0.9);
            S.ball.position.set(0, 1.6, lerp(0, -32, ck));
            S.rollers.forEach(rl => { rl.rotation.x += dt * 12; });
            if (t > 11.6) once('charge', () => call('rCharge'));
            const ch = ease((t - 12.2) / 0.8);
            S.cannon.position.z = -36 + 3 * ch + Math.sin(t * 50) * 0.15 * ch;  // recua enquanto carrega
            S.gears.forEach((g, i) => { g.rotation.z += dt * (5 + 12 * ch) * (i % 2 ? -1 : 1); });
            S.muzzleGlow.scale.setScalar(0.1 + 10 * ch);
            S.spaceStars.scale.set(1, 1, 1 + 6 * ch);     // o espaço estica na direção do canhão
            cam = S.M.clone().add(V(lerp(16, 22, ch), lerp(12, 8, ch), lerp(0, -18, ch))); look = S.M.clone().add(V(0, 3, lerp(-14, -38, ch)));
            C.fov = 50 + 25 * ch;
          } else {                                         // disparo: tudo é arrastado junto; camadas de realidade rompendo
            once('fire', () => { call('rFire'); S.ball.visible = false; });
            const f = t - 13, z0 = S.M.z - 56, z = z0 - (60 * f + 230 * f * f);
            S.muzzleGlow.scale.setScalar(Math.max(0.1, 10 * (1 - f * 2)));
            cam = V(S.M.x + Math.sin(f * 7) * 2, S.M.y + 3 + Math.cos(f * 6) * 1.5, z + 12); look = V(S.M.x, S.M.y + 3, z - 30);
            S.spaceStars.position.z = z; S.spaceStars.scale.set(1, 1, 8);
            S.layers.forEach(L => { const dz = L.z - cam.z; if (dz > -40) { const k = clamp01((dz + 40) / 60); L.o.scale.setScalar(1 + k * 3); L.o.rotation.z += dt * 4 * k; if (L.kind === 2) L.o.children.forEach((p, i) => { p.rotation.y = (i ? 1 : -1) * k * 1.6; }); } });
            C.fov = 75;
          }
        }
        C.position.copy(cam); C.lookAt(look); C.near = 0.1; C.far = 5000; C.updateProjectionMatrix();
        S.earth.rotation.y += dt;
      }
      // ---------------- 15–19 s: o destinatário era a casa ----------------
      if (t >= T_HOME) {
        crack.style.display = 'none';
        if (r.clone && !r.cubed) r.clone.visible = true;     // o bairro intacto por um instante
        if (!r.hole) {
          r.hole = new THREE.Group(); r.hole.position.set(0, 95, 0); G.add(r.hole);
          r.hole.add(new THREE.Mesh(new THREE.CircleGeometry(24, 40), new THREE.MeshBasicMaterial({ color: '#000000', side: THREE.DoubleSide, fog: false })));
          r.holeRing = new THREE.Mesh(new THREE.TorusGeometry(24.5, 1.6, 8, 48), add(new THREE.MeshBasicMaterial({ color: '#b26dff' }))); r.hole.add(r.holeRing);
          r.hole.rotation.x = -Math.PI / 2; r.hole.scale.setScalar(0.01); call('rHole');
        }
        const ho = ease((t - 15.2) / 0.6) * (1 - ease((t - 19) / 0.8));
        r.hole.scale.setScalar(Math.max(0.01, ho)); r.holeRing.rotation.z += dt * 3;
        const p = r.parcel;
        if (t > 15.6 && t < 18.4) {                          // o pacotinho cai devagar até a porta
          p.visible = true; const k = clamp01((t - 15.6) / 2.2);
          p.position.copy(r.frontLocal); p.position.y = lerp(92, 0.45, ease(k)); p.rotation.y = t * 0.8;
          if (k >= 1) once('thud', () => call('rThud'));
        }
        if (t >= 18.4) {                                     // meio segundo depois, a caixa abre: tudo explode dentro da quadra
          once('open', () => { call('rOpen'); p.visible = false; r.shake = 2.6; });
          this._blast(t, dt);
        }
      }
      // efeitos
      for (let j = r.fx.length - 1; j >= 0; j--) {
        const e = r.fx[j]; e.life += dt;
        if (e.kind === 'ring') { const k = clamp01(e.life / e.max); e.m.scale.setScalar(1 + e.s * k); e.m.material.opacity = (1 - k) * 0.9; }
        else if (e.kind === 'spin') { const k = clamp01(e.life / e.max); e.m.rotation.y += dt * 6; e.m.scale.setScalar(e.s * Math.sin(k * Math.PI) + 0.01); }
        else if (e.kind === 'fly') { e.v.y -= 20 * dt; e.m.position.addScaledVector(e.v, dt); e.m.rotation.x += e.w * dt; e.m.rotation.y += e.w * dt; if (e.m.position.y < 0.1) { e.m.position.y = 0.1; e.v.set(0, 0, 0); } }
        if (e.life > e.max) { G.remove(e.m); disposeFx(e.m); r.fx.splice(j, 1); }
      }
      r.shake = Math.max(0, r.shake - dt * 3);
      if (t >= T_END) { call('end'); const done = r.onEnd; this.cancel(true); done && done(); return false; }
      return true;
    },
    _ring(y, s, color, max = 0.7) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.4, 6, 48), add(new THREE.MeshBasicMaterial({ color })));
      ring.rotation.x = Math.PI / 2; ring.position.y = y + 0.5; run.G.add(ring); run.fx.push({ kind: 'ring', m: ring, life: 0, max, s });
    },
    /** 19–23 s: a abertura do pacote (ondas, galáxias, planetas, raios, confete) e o fim da quadra */
    _blast(t, dt) {
      const r = run, G = r.G, a = t - 18.4, R = 0.5 * Math.min(r.w, r.d) - 0.5;
      // ondas cósmicas, galáxias girando, silhuetas de planetas, raios (rápidos, um atrás do outro)
      const beat = Math.floor(a / 0.22);
      if (a < 2.6 && beat !== r.beat) {
        r.beat = beat;
        this._ring(Math.random() * 3, R * 1.0, ['#9fd8ff', '#ff7ae0', '#ffd27a', '#7affc8'][beat % 4], 0.5);
        const gx = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', ['rgba(140,90,255,0.7)', 'rgba(80,180,255,0.7)', 'rgba(255,120,200,0.7)'][beat % 3]) })));
        gx.position.set((Math.random() - 0.5) * R, 2 + Math.random() * 8, (Math.random() - 0.5) * R); G.add(gx); r.fx.push({ kind: 'spin', m: gx, life: 0, max: 0.6, s: 10 + Math.random() * 10 });
        const pl = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 2, 12, 8), new THREE.MeshBasicMaterial({ color: '#0d0f1a' }));
        pl.position.set((Math.random() - 0.5) * R, 3, (Math.random() - 0.5) * R); G.add(pl); r.fx.push({ kind: 'fly', m: pl, life: 0, max: 1.2, v: V((Math.random() - 0.5) * 8, 14 + Math.random() * 10, (Math.random() - 0.5) * 8), w: 2 });
        const pts = []; let x = (Math.random() - 0.5) * R, z = (Math.random() - 0.5) * R; for (let y = 30; y >= 0; y -= 3) { pts.push(V(x, y, z)); x += (Math.random() - 0.5) * 3; z += (Math.random() - 0.5) * 3; }
        const bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), add(new THREE.LineBasicMaterial({ color: '#e0f4ff' }))); G.add(bolt); r.fx.push({ kind: 'ring', m: bolt, life: 0, max: 0.15, s: 0 });
      }
      // a casa: estica, achata, desmonta em cubos, vira confete
      const cl = r.clone;
      if (cl && !r.cubed) {
        if (a < 0.5) cl.scale.set(1, 1 + 1.8 * ease(a / 0.5), 1);
        else if (a < 0.95) { const k = ease((a - 0.5) / 0.45); cl.scale.set(lerp(1, 1.3, k), lerp(2.8, 0.08, k), lerp(1, 1.3, k)); }
        else {
          r.cubed = true; cl.visible = false; r.onDestroy && r.onDestroy(); call('rConfetti');
          const cols = ['#c8402f', '#efe3cc', '#2f78d0', '#3f8f3a', '#f0c22a', '#ff7a1a', '#8a5a36'];
          for (let i = 0; i < 90; i++) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: cols[i % cols.length] }));
            m.position.set((Math.random() - 0.5) * R * 1.2, 0.5 + Math.random() * 5, (Math.random() - 0.5) * R * 1.2); G.add(m);
            r.fx.push({ kind: 'fly', m, life: 0, max: 0.6 + Math.random() * 0.4, v: V((Math.random() - 0.5) * 6, 8 + Math.random() * 8, (Math.random() - 0.5) * 6), w: 6 });
          }
          for (let i = 0; i < 220; i++) {                  // confete
            const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide }));
            m.position.set((Math.random() - 0.5) * R * 1.4, 2 + Math.random() * 10, (Math.random() - 0.5) * R * 1.4); G.add(m);
            r.fx.push({ kind: 'fly', m, life: 0, max: 1.6 + Math.random() * 0.6, v: V((Math.random() - 0.5) * 5, 6 + Math.random() * 6, (Math.random() - 0.5) * 5), w: 9 });
          }
        }
      }
      if (!cl && a > 0.95 && !r.cubed) { r.cubed = true; r.onDestroy && r.onDestroy(); }
      // a quadra se dobra em caixa (21–21,7 s) e o carimbo "DEVOLVIDO" esmaga (21,7–22,2 s)
      if (t >= 21 && !r.foldBox) {
        call('rFold');
        const fb = new THREE.Group(), h = Math.min(r.w, r.d) * 0.45, panels = [];
        for (const [x, z, ry, len] of [[0, r.d / 2, 0, r.w], [0, -r.d / 2, Math.PI, r.w], [r.w / 2, 0, Math.PI / 2, r.d], [-r.w / 2, 0, -Math.PI / 2, r.d]]) {
          const piv = new THREE.Group(); piv.position.set(x, 0.3, z); piv.rotation.y = ry; fb.add(piv);
          const p = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat(CARD, { side: THREE.DoubleSide })); p.position.y = h / 2; piv.add(p); panels.push(piv);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.3, r.d), mat(CARD)); top.position.y = h; top.visible = false; fb.add(top);
        const tp = new THREE.Mesh(new THREE.BoxGeometry(r.w * 0.14, 0.32, r.d * 1.01), mat(TAPE)); tp.position.y = h + 0.01; tp.visible = false; fb.add(tp);
        G.add(fb); r.foldBox = { fb, panels, top, tp, h };
      }
      if (r.foldBox) {
        const F = r.foldBox, k = ease((t - 21) / 0.55);
        F.panels.forEach(p => { p.rotation.x = lerp(Math.PI / 2, 0, k); });
        F.top.visible = F.tp.visible = t > 21.55;
        r.stamp2.visible = t > 21.55 && t < 22.9;
        const sk = clamp01((t - 21.6) / 0.4), y = lerp(150, F.h + 1, sk * sk), rise = ease((t - 22.3) / 0.6);
        r.stamp2.position.y = t < 22.3 ? y : lerp(F.h * 0.2 + 1, 220, rise * rise);
        if (sk >= 1) {
          once2(r, 'slam2', () => { call('rStamp', 1.6); r.shake = 3; this._ring(0, Math.min(r.w, r.d) * 0.6, '#ff5a3a', 0.5); });
          F.fb.scale.y = Math.max(0.02, 1 - ease((t - 22) / 0.15));
          if (t > 22.15 && !r.crater) { F.fb.visible = false; this._crater(); }
        }
      }
      if (t > 23 && r.flag) { const k = ease((t - 23) / 0.35); r.flag.scale.setScalar(Math.max(0.01, k)); once2(r, 'ops', () => call('rOps')); }
    },
    /** cratera em forma de caixa (fica até o fim da partida): fundo pintado em perspectiva, fita, etiqueta e a bandeirinha */
    _crater() {
      const r = run, w = r.w - 0.3, d = r.d - 0.3;
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.round(512 * d / w); const g = cv.getContext('2d'), W = cv.width, H = cv.height, i = 0.22;
      g.fillStyle = '#1a120c'; g.fillRect(0, 0, W, H);
      const quad = (pts, c) => { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
      const ix0 = W * i, ix1 = W * (1 - i), iy0 = H * i, iy1 = H * (1 - i);
      quad([[0, 0], [W, 0], [ix1, iy0], [ix0, iy0]], '#6b4a2c'); quad([[0, H], [W, H], [ix1, iy1], [ix0, iy1]], '#4a321e');
      quad([[0, 0], [0, H], [ix0, iy1], [ix0, iy0]], '#5a3d24'); quad([[W, 0], [W, H], [ix1, iy1], [ix1, iy0]], '#5a3d24');
      g.fillStyle = '#2a1c12'; g.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
      g.fillStyle = '#f6f1e4'; const lw = (ix1 - ix0) * 0.42, lh = lw * 0.5; g.fillRect(W / 2 - lw / 2, H / 2 - lh / 2, lw, lh);
      g.fillStyle = RED; g.font = `900 ${Math.round(lh * 0.28)}px "Trebuchet MS", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DEVOLVIDO', W / 2, H / 2 - lh * 0.12);
      g.fillStyle = '#3a2a1a'; g.font = `700 ${Math.round(lh * 0.14)}px "Trebuchet MS", sans-serif`; g.fillText('AO REMETENTE', W / 2, H / 2 + lh * 0.22);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const grp = new THREE.Group(); grp.position.copy(r.local);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex })); top.rotation.x = -Math.PI / 2; top.position.y = (r.moon ? 0.12 : 0.36); grp.add(top);
      for (const [x, z, ww, dd, ry] of [[-w * 0.18, 0, w * 0.07, d * 1.02, 0.15], [w * 0.22, 0, w * 0.07, d * 1.02, -0.1], [0, d * 0.25, w * 1.02, d * 0.06, 0.05]]) {
        const tp = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.08, dd), mat(TAPE, { transparent: true, opacity: 0.85 })); tp.position.set(x, (r.moon ? 0.16 : 0.42), z); tp.rotation.y = ry; grp.add(tp);
      }
      const flag = new THREE.Group(); flag.position.set(w * 0.08, top.position.y, -d * 0.05);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), mat('#e8e8e8')); pole.position.y = 1.2; flag.add(pole);
      const cloth = textPlane('Ops.', 1.3, 0.75, { bg: '#ffffff', fg: '#3a2a1a', font: '900 300px "Trebuchet MS", sans-serif' }); cloth.position.set(0.68, 2.0, 0); flag.add(cloth);
      flag.scale.setScalar(0.01); grp.add(flag); r.flag = flag;
      r.parent.add(grp); r.crater = grp; r.onCrater && r.onCrater(grp);
    },
    applyCamera(cam) {
      if (!run) return;
      const r = run, t = r.t;
      const qc = new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(r.Pc, r.base.clone().addScaledVector(r.up, t >= T_HOME && t < 18.6 ? 18 : t < T_SPACE ? 6 : 4), r.up));
      if (t < T_SPACE) {                                   // vai para perto da casa (o carimbo aparece inteiro)
        const k = ease(t / 0.9), rigQ = cam.quaternion.clone();
        cam.position.copy(r.P0).lerp(r.Pc, k); cam.quaternion.copy(rigQ).slerp(qc, k);
      } else if (t >= T_HOME) {
        const k = ease((t - 23.2) / 1.7), rigPos = cam.position.clone(), rigQ = cam.quaternion.clone();
        cam.position.copy(r.Pc).lerp(rigPos, k); cam.quaternion.copy(qc).slerp(rigQ, k);
      } else return;
      if (r.shake > 0) { const s = r.shake * r.shake * 0.45; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.position.z += (Math.random() - 0.5) * s; }
    },
    cancel(finished = false) {
      if (!run) return;
      const r = run;
      for (const e of r.fx) { r.G.remove(e.m); disposeFx(e.m); }
      if (r.G.parent) r.G.parent.remove(r.G);
      if (r.clone && r.clone.parent) r.clone.parent.remove(r.clone);   // (clone divide geometrias com o bairro: não libera)
      if (r.rt) r.rt.dispose();
      disposeFx(r.G); if (S && S.scene) disposeFx(S.scene);
      crack.style.display = 'none'; S = null;
      if (!finished) call('end');
      run = null;
    },
  };
}
function once2(r, k, fn) { if (!r.sfx[k]) { r.sfx[k] = true; fn(); } }
