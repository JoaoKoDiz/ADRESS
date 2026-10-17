// Modo Livre, entrega errada com o efeito "Ursa Menor" (menu de opções): sequência cinematográfica de 25 s.
//   0–3 s     a câmera larga a van e olha para cima: as 7 estrelas da Ursa Menor brilham no céu de dia, ligadas por linhas.
//   3–7 s     cena espacial separada: a câmera dispara do Sistema Solar até as estrelas.
//   7–10,5 s  cada estrela de perto (~0,5 s) com o nome na tela: Polaris, Kochab, Pherkad, Yildun, Epsilon, Zeta, Eta.
//   10,5–15 s as sete juntas; uma a uma (mesma ordem) saem do lugar e disparam rumo à Terra, com rastros.
//   15–18 s   a Terra (no Bairro Órbita, a lua do bairro): as sete chegam uma atrás da outra.
//   18–23 s   no bairro: sete impactos seguidos na construção; cada um destrói mais (main.js: onImpact). O 7º é o maior.
//   23–25 s   os efeitos somem, a câmera volta para a van e os controles voltam.
// Escalas de cinema (nada de distâncias reais). Sons em audio.ursa.*.
import * as THREE from 'three';
import { glowTexture, add, BEAM_GEO, disposeFx } from './laser.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = x => Math.max(0, Math.min(1, x));
const T_SPACE = 3, T_NAMES = 7, T_GROUP = 10.5, T_EARTH = 15, T_HOME = 18, T_CAM = 23, T_END = 25;
const NAMES = ['Polaris', 'Kochab', 'Pherkad', 'Yildun', 'Epsilon Ursae Minoris', 'Zeta Ursae Minoris', 'Eta Ursae Minoris'];
// desenho da constelação (2D): Polaris na ponta da cauda; tigela = Zeta, Eta, Pherkad, Kochab
const XY = { Polaris: [0, 0], Yildun: [1.0, -0.35], 'Epsilon Ursae Minoris': [1.9, -0.45], 'Zeta Ursae Minoris': [2.7, -0.2],
  'Eta Ursae Minoris': [3.3, -0.95], Pherkad: [4.3, -0.45], Kochab: [3.65, 0.35] };
const LINKS = [['Polaris', 'Yildun'], ['Yildun', 'Epsilon Ursae Minoris'], ['Epsilon Ursae Minoris', 'Zeta Ursae Minoris'], ['Zeta Ursae Minoris', 'Eta Ursae Minoris'],
  ['Eta Ursae Minoris', 'Pherkad'], ['Pherkad', 'Kochab'], ['Kochab', 'Zeta Ursae Minoris']];
const COLORS = ['#fff6d8', '#ffb46a', '#fff1c8', '#e8f0ff', '#ffd27a', '#dfe8ff', '#cfe0ff'];
const IMPACT0 = 18.45, IMPACT_STEP = 0.62;
const impactTime = i => IMPACT0 + i * IMPACT_STEP;

function surfaceTexture(c1, c2) {                       // superfície granulada e brilhante da estrela
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? c2 : 'rgba(255,255,255,0.7)'; g.globalAlpha = 0.25 + Math.random() * 0.5; const r = 1 + Math.random() * 5; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 128, r, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildStar(color, r) {
  const g = new THREE.Group();
  const surf = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), new THREE.MeshBasicMaterial({ map: surfaceTexture(color, '#ffffff'), toneMapped: false }));
  g.add(surf);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,0.9)', 'rgba(255,200,120,0.55)') }))); corona.scale.setScalar(r * 5); g.add(corona);
  const rings = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.TorusGeometry(r * (1.45 + k * 0.35), r * 0.035, 8, 64), add(new THREE.MeshBasicMaterial({ color: k ? '#ffd27a' : '#9fd8ff', opacity: 0.8 }))); m.rotation.x = 1.1 + k * 0.7; g.add(m); return m; });
  g.userData = { surf, corona, rings, r };
  return g;
}

function buildSpace(moonTarget) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#02030a');
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1e4);
  scene.add(new THREE.AmbientLight('#8090b0', 0.6));
  const E = V(0, 0, 0), K = V(0.3, 0.55, -0.78).normalize();               // direção das estrelas vista da Terra
  const U = V(0, 1, 0).addScaledVector(K, -K.y).normalize(), Rr = K.clone().cross(U).normalize();
  const SUN = V(-1800, 300, 900);
  const sl = new THREE.DirectionalLight('#fff4dd', 2.4); sl.position.copy(SUN).add(V(0, 0, 400)); scene.add(sl, sl.target);
  // Terra (e a lua do Bairro Órbita) e o Sol com algumas órbitas
  const earth = new THREE.Group(); scene.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(10, 40, 26), new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.7 })));
  let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) { const n = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), c = new THREE.Mesh(new THREE.SphereGeometry(2.2 + rnd() * 2.6, 12, 8), new THREE.MeshStandardMaterial({ color: i % 3 ? '#4fae5a' : '#c8b46a', roughness: 0.9 }));
    c.position.copy(n).multiplyScalar(8.9); c.scale.set(1, 1, 0.35); c.lookAt(n.clone().multiplyScalar(20)); earth.add(c); }
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(10.4, 40, 26), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false })));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(6, 32, 20), new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 1 }));
  for (let i = 0; i < 6; i++) { const n = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), c = new THREE.Mesh(new THREE.CircleGeometry(0.8 + rnd(), 14), new THREE.MeshStandardMaterial({ color: '#8f939a' })); c.position.copy(n).multiplyScalar(6.02); c.lookAt(n.clone().multiplyScalar(10)); moon.add(c); }
  scene.add(moon); earth.visible = !moonTarget; moon.visible = !!moonTarget;
  const body = moonTarget ? { c: E, r: 6 } : { c: E, r: 10 };
  const sun = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd84a' })); sun.position.copy(SUN); scene.add(sun);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,250,220,1)', 'rgba(255,190,80,0.55)') }))); sunGlow.position.copy(SUN); sunGlow.scale.setScalar(1300); scene.add(sunGlow);
  for (const [R, r, c] of [[700, 14, '#c8502f'], [1300, 40, '#d8b07a'], [2100, 30, '#e6cf8f'], [3000, 20, '#3f6fe0']]) {
    const a = R * 0.003, p = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshStandardMaterial({ color: c })); p.position.set(SUN.x + Math.cos(a) * R, SUN.y, SUN.z + Math.sin(a) * R); scene.add(p);
    const pts = []; for (let k = 0; k <= 128; k++) { const b = k / 128 * 6.283; pts.push(V(SUN.x + Math.cos(b) * R, SUN.y, SUN.z + Math.sin(b) * R)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#5a6a8a', transparent: true, opacity: 0.45 })));
  }
  // estrelas de fundo (seguem a câmera)
  const sp = new Float32Array(3000 * 3); for (let i = 0; i < 3000; i++) sp.set(V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().toArray(), i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sky = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, color: '#dfe6ff', depthWrite: false })); sky.frustumCulled = false; scene.add(sky);
  // as 7 estrelas (escala de cinema): a 1,2·10⁵ na direção K, o desenho num plano de frente para a Terra
  const DIST = 1.2e5, SPAN = 9000, center = E.clone().addScaledVector(K, DIST), cx = 2.15, cy = -0.3;
  const stars = NAMES.map((n, i) => {
    const [x, y] = XY[n], pos = center.clone().addScaledVector(Rr, (x - cx) * SPAN).addScaledVector(U, (y - cy) * SPAN);
    const m = buildStar(COLORS[i], 900 - (i === 0 ? -250 : i * 40)); m.position.copy(pos); scene.add(m);
    const trail = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: COLORS[i], opacity: 0.7 }))); trail.frustumCulled = false; trail.visible = false; scene.add(trail);
    return { name: n, m, home: pos.clone(), trail };
  });
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(LINKS.flatMap(([a, b]) => [stars[NAMES.indexOf(a)].home, stars[NAMES.indexOf(b)].home])),
    add(new THREE.LineBasicMaterial({ color: '#bcd4ff', opacity: 0.35 }))); scene.add(lines);
  // estrelas pequenas que chegam à Terra (15–18 s): bolas brilhantes com rastro
  const minis = COLORS.map(c => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })));
    const gl = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', c) }))); gl.scale.setScalar(6); g.add(gl);
    const tr = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: c, opacity: 0.75 }))); tr.frustumCulled = false; g.add(tr); g.userData.trail = tr; g.visible = false; scene.add(g); return g; });
  const flash = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture() }))); flash.visible = false; scene.add(flash);
  return { scene, camera, E, K, U, Rr, center, stars, lines, minis, flash, sky, body, SPAN };
}

export function createUrsa(audio, stageEl) {
  let S = null, spaceFor = null, run = null;
  const _m = new THREE.Matrix4();
  // nome da estrela na tela
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;left:50%;bottom:16%;transform:translateX(-50%);z-index:30;pointer-events:none;display:none;' +
    'font:900 clamp(26px,4.2vw,58px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;color:#fff;letter-spacing:.04em;white-space:nowrap;' +
    'text-shadow:0 0 18px rgba(255,210,120,.9),0 0 4px #000,0 3px 0 #3a2a1a;';
  stageEl.appendChild(label);
  const A = audio.ursa || {};
  const call = (k, ...a) => { try { A[k] && A[k](...a); } catch (e) { /* som opcional */ } };

  function skyGroup(base, up, P0) {                      // constelação no céu do bairro (0–3 s)
    const g = new THREE.Group();
    const fwd = base.clone().sub(P0); fwd.addScaledVector(up, -fwd.dot(up)); if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const right = fwd.clone().cross(up).normalize();
    const C = base.clone().addScaledVector(up, 650).addScaledVector(fwd, 120), sc = 95;
    const pos = NAMES.map(n => C.clone().addScaledVector(right, (XY[n][0] - 2.15) * sc).addScaledVector(fwd, (XY[n][1] + 0.3) * sc));
    const sprites = pos.map((p, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,220,140,0.75)'), depthTest: false }))); s.position.copy(p); s.renderOrder = 50; g.add(s); return s; });
    const ln = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(LINKS.flatMap(([a, b]) => [pos[NAMES.indexOf(a)], pos[NAMES.indexOf(b)]])), add(new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0, depthTest: false })));
    ln.renderOrder = 49; g.add(ln);
    return { g, sprites, ln, C };
  }

  return {
    get active() { return !!run; },
    get inSpace() { return !!run && run.t >= T_SPACE && run.t < T_HOME; },
    get scene() { return S && S.scene; }, get camera() { return S && S.camera; },
    get time() { return run ? run.t : -1; },
    /** opts: { parent, local, rect ({w,d}) ou raio, moon, cam, onImpact(i), onEnd() } */
    start(opts) {
      if (!S || spaceFor !== !!opts.moon) { S = buildSpace(!!opts.moon); spaceFor = !!opts.moon; }
      for (const s of S.stars) { s.m.position.copy(s.home); s.m.visible = true; s.trail.visible = false; }
      S.lines.visible = true; S.minis.forEach(m => { m.visible = false; });
      const G = new THREE.Group(); G.position.copy(opts.local); opts.parent.add(G); opts.parent.updateMatrixWorld(true);
      const base = G.getWorldPosition(new THREE.Vector3()), up = V(0, 1, 0).applyQuaternion(G.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const P0 = opts.cam.position.clone(), look0 = P0.clone().add(V(0, 0, -20).applyQuaternion(opts.cam.quaternion));
      let hor = P0.clone().sub(base); hor.addScaledVector(up, -hor.dot(up)); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
      const Pc = base.clone().addScaledVector(hor, 40).addScaledVector(up, 26), qc = new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(Pc, base.clone().addScaledVector(up, 2), up));
      const sky = skyGroup(base, up, P0); opts.world.add(sky.g);
      run = { ...opts, G, t: 0, base, up, P0, look0, Pc, qc, sky, fx: [], hits: 0, sfx: {}, shake: 0, hw: opts.rect ? Math.min(opts.rect.w, opts.rect.d) / 2 : 8 };
      call('begin'); call('shine');
    },
    update(dt) {
      if (!run) return false;
      const r = run; r.t += dt; const t = r.t;
      const once = (k, fn) => { if (!r.sfx[k]) { r.sfx[k] = true; fn(); } };
      // ---- 0–3 s: constelação no céu ----
      if (t < T_SPACE) {
        const k = ease((t - 0.3) / 1.4);
        r.sky.sprites.forEach((s, i) => { s.scale.setScalar((26 + i * 1.5) * k * (1 + 0.12 * Math.sin(t * 9 + i))); s.material.opacity = k; });
        r.sky.ln.material.opacity = 0.35 * ease((t - 1.2) / 0.8);
      } else if (r.sky.g.parent) r.sky.g.parent.remove(r.sky.g);
      // ---- espaço ----
      if (t >= T_SPACE && t < T_HOME) {
        const C = S.camera; let cam, look;
        label.style.display = 'none';
        if (t < T_NAMES) {                                   // viagem: do Sistema Solar até as estrelas, acelerando
          once('travel', () => call('travel'));
          const u = (t - T_SPACE) / 4, s = 60 * Math.pow((S.center.length() - 3.2e4) / 60, Math.pow(u, 1.5));
          cam = S.E.clone().addScaledVector(S.K, s).addScaledVector(S.U, -0.02 * s - 30).addScaledVector(S.Rr, 0.05 * s + 20);
          look = S.center.clone();
        } else if (t < T_GROUP) {                            // as sete de perto, com o nome
          const i = Math.min(6, Math.floor((t - T_NAMES) / 0.5)), st = S.stars[i], rr = st.m.userData.r;
          once('pulse' + i, () => call('pulse', i));
          const w = (t - T_NAMES) / 0.5 - i;
          cam = st.home.clone().addScaledVector(S.K, -rr * 3.4).addScaledVector(S.Rr, rr * (1.4 - w * 0.5)).addScaledVector(S.U, rr * 0.5);
          look = st.home.clone();
          label.textContent = st.name; label.style.display = 'block'; label.style.opacity = String(Math.min(1, w * 6, (1 - w) * 6 + 0.3));
        } else if (t < T_EARTH) {                            // juntas; depois partem uma a uma rumo à Terra
          cam = S.center.clone().addScaledVector(S.K, -S.SPAN * 6.5).addScaledVector(S.U, S.SPAN * 0.6);
          look = S.center.clone();
          S.stars.forEach((st, i) => {
            const t0 = 11.0 + i * 0.5, a = t - t0;
            if (a <= 0) { st.m.position.copy(st.home); return; }
            once('launch' + i, () => call('launch', i));
            const dir = S.E.clone().sub(st.home).normalize(), d = 2600 * a + 260000 * a * a;   // dispara cada vez mais rápido
            st.m.position.copy(st.home).addScaledVector(dir, d);
            st.trail.visible = true; st.trail.position.copy(st.m.position); st.trail.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().negate());
            const tl = Math.min(d, 60000); st.trail.scale.set(st.m.userData.r * 0.5, Math.max(1, tl), st.m.userData.r * 0.5);
          });
          S.lines.material.opacity = 0.35 * (1 - ease((t - 11) / 0.8));
        } else {                                             // chegada à Terra (ou à lua do bairro)
          once('arrive', () => call('arrive'));
          for (const st of S.stars) { st.m.visible = false; st.trail.visible = false; } S.lines.visible = false;
          const B = S.body, side = S.Rr.clone().multiplyScalar(0.9).add(S.U.clone().multiplyScalar(0.25)).addScaledVector(S.K, -0.35).normalize();
          cam = B.c.clone().addScaledVector(side, B.r * 4.2); look = B.c.clone().addScaledVector(S.K, B.r * 0.8);
          const hitP = B.c.clone().addScaledVector(S.K, B.r);
          S.minis.forEach((m, i) => {
            const ta = 15.45 + i * 0.32, a = (ta - t) / 0.9;      // chega em ta; aparece 0,9 s antes
            if (a > 1 || a < -0.05) { m.visible = false; return; }
            m.visible = a >= 0; const d = Math.max(0, a) * B.r * 9;
            m.position.copy(hitP).addScaledVector(S.K, d);
            const tr = m.userData.trail; tr.quaternion.setFromUnitVectors(V(0, 1, 0), S.K); tr.scale.set(0.45, B.r * 3, 0.45);
            if (a < 0.03 && !r.sfx['hit' + i]) { r.sfx['hit' + i] = true; r.flashT = t; }
          });
          if (r.flashT !== undefined) { const f = 1 - clamp01((t - r.flashT) / 0.3); S.flash.visible = f > 0; S.flash.position.copy(hitP); S.flash.scale.setScalar(B.r * (1.5 + 2 * f)); S.flash.material.opacity = f; }
        }
        C.position.copy(cam); C.up.copy(S.U); C.lookAt(look);
        const dl = cam.distanceTo(look); C.near = Math.max(0.05, dl * 0.0015); C.far = Math.max(6000, dl * 400); C.updateProjectionMatrix();
        S.sky.position.copy(cam); S.sky.scale.setScalar(C.far * 0.5);
        for (const st of S.stars) { st.m.userData.rings.forEach((ring, k) => { ring.rotation.z += dt * (k ? -1.6 : 2.2); }); st.m.userData.corona.scale.setScalar(st.m.userData.r * (5 + 0.4 * Math.sin(t * 12))); st.m.userData.surf.rotation.y += dt * 0.6; }
      } else label.style.display = 'none';
      // ---- 18–23 s: sete impactos no bairro ----
      if (t >= T_HOME) {
        once('home', () => { S.flash.visible = false; });
        for (let i = 0; i < 7; i++) {
          const ti = impactTime(i), fall = ti - 0.3;
          if (t >= fall && t < ti) {                          // estrela caindo do céu
            if (!r['fall' + i]) { r['fall' + i] = this._spawnFaller(i); }
            const f = r['fall' + i], k = (t - fall) / 0.3; f.position.set((Math.random() - 0.5) * 0.4, 260 * (1 - k), 0);
          }
          if (t >= ti && r.hits <= i) {
            r.hits = i + 1; if (r['fall' + i]) { r.G.remove(r['fall' + i]); disposeFx(r['fall' + i]); }
            call('impact', i); this._boom(i); r.shake = i === 6 ? 2.2 : 1.1;
            r.onImpact && r.onImpact(i);
          }
        }
        if (t > impactTime(6) + 0.6) once('debris', () => call('debris'));
        // efeitos: flashes, ondas de choque e destroços
        const g = 26;
        for (let j = r.fx.length - 1; j >= 0; j--) {
          const e = r.fx[j]; e.life += dt;
          const end = t > T_CAM ? Math.max(0, 1 - (t - T_CAM) / 0.8) : 1;
          if (e.kind === 'flash') { const f = 1 - clamp01(e.life / e.max); e.m.scale.setScalar(e.s * (0.6 + 1.2 * (1 - f))); e.m.material.opacity = f * end; }
          else if (e.kind === 'ring') { const k = clamp01(e.life / e.max); e.m.scale.setScalar(1 + e.s * k); e.m.material.opacity = (1 - k) * 0.9 * end; }
          else if (e.kind === 'debris') {
            if (!e.rest) { e.v.y -= g * dt; e.m.position.addScaledVector(e.v, dt); e.m.rotation.x += e.w * dt; e.m.rotation.z += e.w * 0.7 * dt; if (e.m.position.y < 0.2 && e.v.y < 0) { e.m.position.y = 0.2; e.rest = true; } }
            e.m.visible = end > 0.05; e.m.scale.setScalar(Math.max(0.01, end));
          }
          if ((e.kind !== 'debris' && e.life > e.max) || end <= 0) { r.G.remove(e.m); disposeFx(e.m); r.fx.splice(j, 1); }
        }
        r.shake = Math.max(0, r.shake - dt * 3.5);
      }
      if (t >= T_END) { call('end'); label.style.display = 'none'; const done = r.onEnd; this.cancel(); done && done(); return false; }
      return true;
    },
    _spawnFaller(i) {
      const r = run, f = new THREE.Group();
      const core = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,200,120,0.8)') }))); core.scale.setScalar(16); f.add(core);
      const tr = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: COLORS[i], opacity: 0.8 }))); tr.scale.set(2.2, 160, 2.2); tr.frustumCulled = false; f.add(tr);
      r.G.add(f); return f;
    },
    /** explosão luminosa, onda de choque e destroços de um impacto (dentro da quadra) */
    _boom(i) {
      const r = run, G = r.G, big = i === 6 ? 2 : 1, hw = r.hw;
      const fl = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', i % 2 ? 'rgba(255,170,60,0.8)' : 'rgba(150,200,255,0.8)') })));
      fl.position.y = 3; G.add(fl); r.fx.push({ kind: 'flash', m: fl, life: 0, max: 0.55 * big, s: 34 * big });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 6, 40), add(new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffd27a' : '#bfe4ff' })));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; G.add(ring); r.fx.push({ kind: 'ring', m: ring, life: 0, max: 0.6 * big, s: hw * 1.1 });
      const cols = [['#c8402f', '#8a5a36', '#e6e0d4'], ['#efe3cc', '#d8cfbe', '#8a7a66'], ['#3f8f3a', '#c98a4a', '#e0402a'], ['#efe3cc', '#c8402f', '#5e3b20'], ['#6f5a40', '#4a3a2a', '#8f8b85'], ['#5a4a3a', '#3a2d22', '#8a5a36'], ['#fff3d6', '#c8402f', '#3a2d22']][i];
      for (let k = 0; k < 26 * big; k++) {
        const s = 0.3 + Math.random() * 0.9 * big, m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 0.8), new THREE.MeshStandardMaterial({ color: cols[k % 3], roughness: 0.9 }));
        m.position.set((Math.random() - 0.5) * hw, 1 + Math.random() * 3, (Math.random() - 0.5) * hw); G.add(m);
        const a = Math.random() * 6.283, sp = 4 + Math.random() * 9 * big;     // voam alto e caem perto (o raio da quadra limita o alcance)
        r.fx.push({ kind: 'debris', m, life: 0, v: V(Math.cos(a) * sp * Math.min(1, hw / 18), 10 + Math.random() * 16 * big, Math.sin(a) * sp * Math.min(1, hw / 18)), w: (Math.random() - 0.5) * 16 });
      }
    },
    /** Câmera do jogo no bairro (0–3 s e 18–25 s); chamar depois de rig.update. */
    applyCamera(cam) {
      if (!run) return;
      const r = run, t = r.t;
      if (t < T_SPACE) {
        const k = ease((t - 0.2) / 1.6), look = r.look0.clone().lerp(r.sky.C, k);
        cam.position.copy(r.P0); cam.up.copy(r.up); cam.lookAt(look); cam.up.set(0, 1, 0);
      } else if (t >= T_HOME) {
        const k = ease((t - T_CAM) / (T_END - T_CAM - 0.1));
        const rigPos = cam.position.clone(), rigQ = cam.quaternion.clone();
        cam.position.copy(r.Pc).lerp(rigPos, k); cam.quaternion.copy(r.qc).slerp(rigQ, k);
        if (r.shake > 0) { const s = r.shake * r.shake * 0.5; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.position.z += (Math.random() - 0.5) * s; }
      }
    },
    cancel() {
      if (!run) return;
      for (const e of run.fx) { run.G.remove(e.m); disposeFx(e.m); }
      if (run.G.parent) run.G.parent.remove(run.G);
      if (run.sky.g.parent) run.sky.g.parent.remove(run.sky.g);
      disposeFx(run.G); disposeFx(run.sky.g);
      label.style.display = 'none'; call('end');
      run = null;
    },
  };
}
