// Modo Livre, entrega errada com o efeito "Sistema Solar" (menu de opções): sequência de 25 s, toda no bairro, câmera
// rente ao chão (na rua, ao lado da quadra) — nunca uma visão aérea.
//   0–4 s    a câmera sai de trás da van, desce para a rua e olha para cima; o dia vira noite (céu cheio de estrelas) e
//            um Sistema Solar enorme e inclinado ocupa o céu: Sol, órbitas luminosas, Mercúrio, Vênus, Marte, Júpiter,
//            Saturno (anéis), Urano e Netuno girando.
//   4–15 s   um por um, os planetas largam a órbita e vêm na direção da casa (crescem no quadro, superfície iluminada,
//            halo de fogo, cauda de partículas); a câmera alterna céu ↔ casa; 7 impactos (explosão, poeira, fragmentos,
//            onda de choque no chão); a destruição se acumula (main.js: onImpact).
//   15–20 s  o Sol desce devagar (superfície animada, labaredas, halo), cresce até tomar o alto da tela e pinta o bairro
//            de laranja; impacto: cúpula de fogo, coluna de energia, destroços, ondas e tremor (main.js: onSun).
//   20–25 s  de perto, a quadra arrasada (poeira, brasas, fragmentos caindo); a luz volta e a câmera volta à van.
import * as THREE from 'three';
import { glowTexture, add, BEAM_GEO, disposeFx } from './laser.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = x => Math.max(0, Math.min(1, x));
// planetas: raio no céu (r), órbita (o), raio na chegada (rf), textura
const PLANETS = [
  { n: 'mercury', r: 12, o: 120, rf: 7 }, { n: 'venus', r: 17, o: 172, rf: 9 }, { n: 'mars', r: 14, o: 226, rf: 8 },
  { n: 'jupiter', r: 42, o: 312, rf: 16 }, { n: 'saturn', r: 32, o: 400, rf: 12, ring: true }, { n: 'uranus', r: 24, o: 478, rf: 11, uring: true },
  { n: 'neptune', r: 23, o: 552, rf: 11 },
];
const LAUNCH = i => 4.0 + i * 1.5, FLIGHT = 2.05, HIT = i => LAUNCH(i) + FLIGHT;   // último impacto: 15,05 s
const SUN_START = 15.3, SUN_HIT = 20.1, T_CLOSE = 20.7, T_DAY = 21.9, T_CAM = 23.3, T_END = 25;

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function planetTexture(n) {
  return canvasTex(256, 128, (g, w, h) => {
    const band = (y, hh, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.fillRect(0, y, w, hh); g.globalAlpha = 1; };
    const blob = (x, y, rx, ry, c, a = 1) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.globalAlpha = 1; };
    if (n === 'mercury') { band(0, h, '#9c958c'); for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = 10 + Math.random() * (h - 20), r = 2 + Math.random() * 7; blob(x, y, r, r, '#6f6a63', 0.7); blob(x - r * 0.25, y - r * 0.25, r * 0.6, r * 0.6, '#b8b2a8', 0.5); } }
    else if (n === 'venus') { band(0, h, '#e6c983'); for (let i = 0; i < 14; i++) { g.strokeStyle = i % 2 ? '#f4e2b0' : '#cfa865'; g.globalAlpha = 0.6; g.lineWidth = 4 + Math.random() * 6; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 8 + i * 8.5 + Math.sin(x * 0.05 + i) * 5); g.stroke(); } g.globalAlpha = 1; }
    else if (n === 'mars') { band(0, h, '#c4532e'); for (let i = 0; i < 26; i++) blob(Math.random() * w, 25 + Math.random() * 80, 8 + Math.random() * 20, 4 + Math.random() * 9, '#7c2f1a', 0.55); band(0, 9, '#f4efe8'); band(h - 7, 7, '#f4efe8'); blob(40, 64, 40, 3, '#5a2414', 0.6); }
    else if (n === 'jupiter') { const cs = ['#efe0c2', '#c79a68', '#e8d2a8', '#a8703f', '#f2e6cc', '#b9875a', '#e3c79a', '#9a6436']; let y = 0; for (let i = 0; y < h; i++) { const hh = 8 + (i * 7) % 11; band(y, hh, cs[i % cs.length]); y += hh; } blob(170, 82, 22, 11, '#c0442a'); blob(170, 82, 14, 6, '#d8693e'); }
    else if (n === 'saturn') { const cs = ['#efdcae', '#dcc28a', '#f3e6c4', '#cfb27a', '#e9d39e']; let y = 0; for (let i = 0; y < h; i++) { const hh = 9 + (i * 5) % 9; band(y, hh, cs[i % cs.length]); y += hh; } }
    else if (n === 'uranus') { band(0, h, '#9fe0e6'); band(0, 18, '#b9eef0', 0.7); band(h - 18, 18, '#86d0d8', 0.6); }
    else { band(0, h, '#3a63d6'); for (let i = 0; i < 6; i++) band(14 + i * 19, 5, i % 2 ? '#2a4cb0' : '#5f86ea', 0.6); blob(90, 70, 16, 8, '#1c2f7a'); blob(150, 45, 7, 3, '#e8f0ff', 0.8); }
  });
}
function fireTexture() {
  const t = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#ff8a1a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = ['#ffd84a', '#ff5a14', '#fff3b0', '#d8301a'][i % 4]; g.globalAlpha = 0.25 + Math.random() * 0.5; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 7, 0, 7); g.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const VERT = `varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
/** superfície do planeta: iluminada pelo Sol (uL) e, voando, borda em brasa (uHeat) */
function planetMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uL: { value: new THREE.Vector3() }, uHeat: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map; uniform vec3 uL; uniform float uHeat; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){ vec3 n = normalize(vN), L = normalize(uL - vW), Vd = normalize(cameraPosition - vW);
  vec3 c = texture2D(map, vUv).rgb; vec3 col = c * (0.16 + 1.15 * max(dot(n, L), 0.0));
  float rim = pow(1.0 - max(dot(n, Vd), 0.0), 2.2);
  col += vec3(1.0, 0.45, 0.08) * rim * uHeat * 2.2 + c * uHeat * 0.22;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`, fog: false });
}
/** superfície do Sol: duas camadas de fogo correndo, manchas brilhantes, borda alaranjada */
function sunMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: map }, uT: { value: 0 } },
    vertexShader: VERT,
    fragmentShader: `uniform sampler2D map; uniform float uT; varying vec3 vN; varying vec3 vW; varying vec2 vUv;
void main(){ vec3 a = texture2D(map, vUv * vec2(2.0, 1.0) + vec2(uT * 0.035, uT * 0.012)).rgb;
  vec3 b = texture2D(map, vUv * vec2(3.0, 1.6) - vec2(uT * 0.05, -uT * 0.02)).rgb;
  vec3 c = mix(a, b, 0.5) * 1.35; c += vec3(1.0, 0.92, 0.6) * smoothstep(0.55, 0.85, a.g * b.g) * 1.4;
  float rim = pow(1.0 - max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0), 2.0);
  c = mix(c, vec3(1.0, 0.4, 0.06), rim * 0.7) + vec3(1.0, 0.6, 0.2) * rim * 0.5;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`, fog: false, toneMapped: false });
}
function planetMesh(p) {
  const g = new THREE.Group(), mat = planetMaterial(planetTexture(p.n));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 22), mat); g.add(ball);
  if (p.ring) {                                         // anéis de Saturno: faixas A e B com a divisão de Cassini
    const rg = new THREE.Group(); rg.rotation.x = 1.15; rg.rotation.y = 0.35; g.add(rg);
    [[1.25, 1.55, '#bba67a', 0.55], [1.58, 1.98, '#ecdcae', 0.92], [2.04, 2.35, '#d8c38f', 0.75]].forEach(([a, b, c, o]) =>
      rg.add(new THREE.Mesh(new THREE.RingGeometry(a, b, 72), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, transparent: true, opacity: o, fog: false, depthWrite: false }))));
  }
  if (p.uring) { const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.6, 56), new THREE.MeshBasicMaterial({ color: '#d6f4f6', side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false, depthWrite: false })); ring.rotation.y = 1.45; g.add(ring); }
  const fire = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,240,190,0.9)', 'rgba(255,110,30,0.55)') })));
  fire.scale.setScalar(2.7); fire.visible = false; g.add(fire);
  g.userData = { fire, mat, ball };
  return g;
}

/** ponto para onde olhar: entre as direções de a (peso w) e b, vistas de pos (independe da distância) */
function mixDir(pos, a, b, w) {
  const da = a.clone().sub(pos).normalize(), db = b.clone().sub(pos).normalize();
  return pos.clone().add(da.multiplyScalar(w).addScaledVector(db, 1 - w).normalize().multiplyScalar(30));
}

export function createSolar(audio) {
  let run = null;
  const A = audio.ursa || {};
  const call = (k, ...a) => { try { A[k] && A[k](...a); } catch (e) { /* som opcional */ } };
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _q = new THREE.Quaternion();
  const TEX = {};
  const tex = () => TEX.fire || Object.assign(TEX, {
    fire: glowTexture('rgba(255,245,200,1)', 'rgba(255,120,30,0.6)'),
    smoke: glowTexture('rgba(110,96,82,0.85)', 'rgba(80,68,58,0.45)'),
    ember: glowTexture('rgba(255,230,150,1)', 'rgba(255,90,20,0.7)'),
    flash: glowTexture('rgba(255,255,255,1)', 'rgba(255,200,120,0.6)'),
  }) && TEX.fire;

  /** dia ↔ noite (k: 0 dia, 1 noite) e luz alaranjada do Sol chegando (s: 0…1) */
  function light(r, k, s) {
    const W = r.world, sc = W.scene;
    if (sc.background && sc.background.isColor) sc.background.copy(r.save.bg).lerp(r.nightBg, k);
    if (sc.fog) sc.fog.color.copy(r.save.fog).lerp(r.nightBg, k);
    if (W.sunLight) { W.sunLight.intensity = r.save.sun * (1 - 0.82 * k) + r.save.sun * 1.5 * s; W.sunLight.color.copy(r.save.sunC).lerp(r.orange, Math.min(1, s * 1.4)); }
    if (r.hemi) { r.hemi.intensity = r.save.hemi * (1 - 0.65 * k) + r.save.hemi * 0.5 * s; r.hemi.color.copy(r.save.hemiC).lerp(r.orange, s); }
    if (r.daySun) r.daySun.visible = k < 0.3 && r.save.daySun;
    r.stars.forEach(s2 => { s2.material.opacity = k; });
  }

  /** partícula (sprite do conjunto reaproveitado): fogo, fumaça, brasa ou clarão */
  function puff(r, o) {
    let p = r.pool.find(q => !q.on);
    if (!p) { if (r.pool.length >= 420) return; const m = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false })); m.frustumCulled = false; r.fxRoot.add(m); p = { m }; r.pool.push(p); }
    const mat = p.m.material, t = o.tex || 'fire';
    mat.map = TEX[t]; mat.blending = t === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending; mat.toneMapped = t === 'smoke'; mat.color.set(o.color || '#ffffff'); mat.needsUpdate = true;
    p.on = true; p.m.visible = true; p.m.position.copy(o.pos); p.v = o.v ? o.v.clone() : V(0, 0, 0); p.life = 0; p.max = o.life || 0.7;
    p.s0 = o.s0 || 1; p.s1 = o.s1 == null ? p.s0 : o.s1; p.o0 = o.op == null ? 0.85 : o.op; p.g = o.g || 0; p.drag = o.drag || 0; p.c1 = o.c1 ? new THREE.Color(o.c1) : null; p.c0 = mat.color.clone();
    p.m.scale.setScalar(p.s0); mat.opacity = p.o0; mat.rotation = Math.random() * 6.28;
  }

  return {
    get active() { return !!run; }, get inSpace() { return false; }, get scene() { return null; }, get camera() { return null; },
    get time() { return run ? run.t : -1; },
    /** opts: { parent, local, rect, moon, cam, world (o objeto do bairro: scene, sunLight), onImpact(i), onSun(), onEnd() } */
    start(opts) {
      tex();
      const G = new THREE.Group(); G.position.copy(opts.local); opts.parent.add(G); opts.parent.updateMatrixWorld(true);
      const base = G.getWorldPosition(new THREE.Vector3()), up = V(0, 1, 0).applyQuaternion(G.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const cam = opts.cam, P0 = cam.position.clone();
      let hor = P0.clone().sub(base); hor.addScaledVector(up, -hor.dot(up)); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
      // eixo da rua mais próxima da câmera (as casas são quadradas no plano): a câmera fica no meio dessa rua, de lado
      if (!opts.moon) { if (Math.abs(hor.x) > Math.abs(hor.z)) hor.set(Math.sign(hor.x), 0, 0); else hor.set(0, 0, Math.sign(hor.z) || 1); }
      const ex = opts.rect ? (Math.abs(hor.x) > 0.5 ? opts.rect.w : opts.rect.d) / 2 : 9;
      const side = hor.clone().cross(up).normalize(), fwd = hor.clone().negate();
      const O = base.clone().addScaledVector(hor, ex + 3.8).addScaledVector(side, 24).addScaledVector(up, 2.3);     // na rua, ao lado: casa + vizinhas no quadro
      const toO = O.clone().sub(base); toO.addScaledVector(up, -toO.dot(up));
      const O2 = base.clone().add(toO.multiplyScalar(1.45)).addScaledVector(up, 3.2);                                // para o Sol: um pouco mais longe
      const Pd = base.clone().addScaledVector(hor, ex + 5).addScaledVector(side, 9).addScaledVector(up, 9);          // o resultado, de perto
      const C = base.clone().addScaledVector(fwd, 340).addScaledVector(up, 690).addScaledVector(side, -60);           // o Sistema Solar no céu, além da casa
      const sky = new THREE.Group(), fxRoot = new THREE.Group(); opts.world.scene.add(sky); opts.world.scene.add(fxRoot);
      // céu estrelado (cúpula em volta da casa): muitas estrelas pequenas + algumas grandes e brilhantes
      let sd = 21; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      const stars = [[3200, 2.2], [380, 4.2]].map(([N, size]) => {
        const sp = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) { const v = V(rnd() - 0.5, rnd() * 0.95 + 0.03, rnd() - 0.5).normalize(); const w = new THREE.Vector3(v.x, 0, v.z).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), up)); w.addScaledVector(up, v.y); sp.set([base.x + w.x * 1300, base.y + w.y * 1300, base.z + w.z * 1300], i * 3); }
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
        const s = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
        s.frustumCulled = false; sky.add(s); return s;
      });
      // o plano das órbitas: de frente para quem olha, inclinado
      const plane = new THREE.Group(); plane.position.copy(C); plane.up.copy(up); plane.lookAt(O); plane.rotateX(-0.95); plane.rotateZ(0.25); sky.add(plane);
      const sunTex = fireTexture(), sunMat = sunMaterial(sunTex);
      const sun = new THREE.Group(); plane.add(sun);
      const sunBall = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 26), sunMat); sun.add(sunBall);
      const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,250,220,1)', 'rgba(255,150,40,0.6)') }))); sun.add(sunGlow);
      const flares = [];
      for (let k = 0; k < 12; k++) { const f = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,240,180,1)', 'rgba(255,90,20,0.65)') }))); sun.add(f); flares.push({ f, a: k * 0.5236, ph: k * 1.7 }); }
      const orbits = PLANETS.map(p => { const l = new THREE.Mesh(new THREE.TorusGeometry(p.o, 1.3, 4, 160), add(new THREE.MeshBasicMaterial({ color: '#86acff', opacity: 0 }))); plane.add(l); return l; });
      const planets = PLANETS.map((p, i) => { const m = planetMesh(p); m.scale.setScalar(p.r); plane.add(m); return { p, m, a: i * 0.9 + 0.3, flying: false }; });
      plane.scale.setScalar(0.01);
      const sc = opts.world.scene, hemi = sc.children.find(o => o.isHemisphereLight), daySun = sc.getObjectByName('sun');
      run = { ...opts, G, t: 0, dt: 0, base, up, hor, side, P0, O, O2, Pd, C, sky, fxRoot, stars, plane, sun, sunBall, sunMat, sunGlow, flares, orbits, planets, hemi, daySun,
        fx: [], pool: [], sfx: {}, shake: 0, q: cam.quaternion.clone(), sunR: 62,
        hw: opts.rect ? Math.min(opts.rect.w, opts.rect.d) / 2 : 8, R: opts.rect ? 0.5 * Math.hypot(opts.rect.w, opts.rect.d) : 9.5,
        nightBg: new THREE.Color('#040818'), orange: new THREE.Color('#ff8a2a'),
        save: { bg: sc.background && sc.background.isColor ? sc.background.clone() : new THREE.Color('#000'), fog: sc.fog ? sc.fog.color.clone() : new THREE.Color('#000'),
          sun: opts.world.sunLight ? opts.world.sunLight.intensity : 1, sunC: opts.world.sunLight ? opts.world.sunLight.color.clone() : new THREE.Color('#fff'),
          hemi: hemi ? hemi.intensity : 1, hemiC: hemi ? hemi.color.clone() : new THREE.Color('#fff'), daySun: daySun ? daySun.visible : false } };
      sunBall.scale.setScalar(run.sunR); sunGlow.scale.setScalar(run.sunR * 4.2);
      call('begin'); call('nightfall');
    },
    update(dt) {
      if (!run) return false;
      const r = run; r.t += dt; r.dt = dt; const t = r.t;
      const once = (k, fn) => { if (!r.sfx[k]) { r.sfx[k] = true; fn(); } };
      const sunK = r.sunStart ? ease((t - SUN_START) / (SUN_HIT - SUN_START)) * (1 - ease((t - SUN_HIT - 0.4) / 1.6)) : 0;
      light(r, ease((t - 0.2) / 1.4) * (1 - ease((t - T_DAY) / 1.3)), sunK);
      // Sistema Solar no céu
      const show = ease((t - 0.7) / 1.5);
      r.plane.scale.setScalar(Math.max(0.01, show));
      r.orbits.forEach((o, i) => { o.material.opacity = 0.55 * show * (r.planets[i].flying ? Math.max(0, 1 - (t - LAUNCH(i)) / 0.8) : 1); });
      if (t > 1.1) once('orbit', () => call('orbit'));
      const spin = 0.6 + 1.6 * ease((t - 1.5) / 2.5);
      const sunW = r.sun.getWorldPosition(new THREE.Vector3());
      r.planets.forEach((pl, i) => {
        const m = pl.m, ud = m.userData;
        ud.mat.uniforms.uL.value.copy(sunW);
        if (!pl.flying) {
          pl.a += dt * spin * (1.3 - i * 0.12);
          m.position.set(Math.cos(pl.a) * pl.p.o, Math.sin(pl.a) * pl.p.o, 0); m.rotation.y += dt * 1.5;
          if (t >= LAUNCH(i)) {                               // larga a órbita: passa para o mundo e vem rumo à casa
            pl.flying = true; call('pApproach', i, FLIGHT - 0.06);
            const wp = m.getWorldPosition(new THREE.Vector3()); r.sky.add(m); m.position.copy(wp);
            pl.r0 = pl.p.r * r.plane.scale.x; m.scale.setScalar(pl.r0); pl.start = wp; pl.t0 = t; ud.fire.visible = true; pl.prev = wp.clone();
          }
        }
        if (pl.flying && !pl.hit) {
          const k = clamp01((t - pl.t0) / FLIGHT), kk = Math.pow(k, 2.3), rad = pl.r0 + (pl.p.rf - pl.r0) * Math.pow(k, 1.4);
          const end = r.base.clone().addScaledVector(r.up, pl.p.rf * 0.85);
          m.position.copy(pl.start).lerp(end, kk); m.scale.setScalar(rad); m.rotation.y += dt * 3;
          ud.mat.uniforms.uHeat.value = 0.25 + 0.75 * k; ud.fire.material.opacity = 0.35 + 0.5 * k;
          // cauda: partículas que ficam para trás e se dissipam
          const dir = m.position.clone().sub(pl.prev); pl.prev.copy(m.position);
          const n = Math.ceil(dt * 70);
          for (let j = 0; j < n; j++) {
            const off = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(rad * 1.1);
            puff(r, { pos: m.position.clone().add(off).addScaledVector(dir, -Math.random()), v: dir.clone().multiplyScalar(-0.15 / Math.max(dt, 1e-3)).add(off.clone().multiplyScalar(0.6)),
              s0: rad * (1.2 + Math.random() * 0.6), s1: rad * (2.4 + Math.random()), life: 0.55 + Math.random() * 0.35, op: 0.7, color: '#ffd27a', c1: '#ff3c10', tex: j % 3 ? 'fire' : 'ember' });
          }
          if (k >= 1) { pl.hit = true; m.visible = false; call('impact', i); this._boom(i, 1); r.shake = Math.max(r.shake, 1.1); r.onImpact && r.onImpact(i); }
        }
      });
      // o Sol: sai do centro e desce devagar (15,3–20,1 s), cada vez maior; impacto muito maior
      r.sunMat.uniforms.uT.value = t;
      r.flares.forEach((f, k) => { const s = 1 + 0.45 * Math.sin(t * 5 + f.ph) + 0.2 * Math.sin(t * 13 + k); const a = f.a + t * 0.25; f.f.position.set(Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0.2).multiplyScalar(r.sunBall.scale.x); f.f.scale.setScalar(r.sunBall.scale.x * 0.85 * s); });
      r.sunGlow.scale.setScalar(r.sunBall.scale.x * (4.2 + 0.3 * Math.sin(t * 6)));
      if (t >= SUN_START && !r.sunHit) {
        once('sun', () => { const wp = r.sun.getWorldPosition(new THREE.Vector3()); r.sky.add(r.sun); r.sun.position.copy(wp); r.sunStart = wp; r.sunR0 = r.sunR * r.plane.scale.x; call('sunApproach', SUN_HIT - SUN_START - 0.08); });
        const k = clamp01((t - SUN_START) / (SUN_HIT - SUN_START)), kk = Math.pow(k, 1.5), rad = r.sunR0 + (24 - r.sunR0) * Math.pow(k, 0.9);
        r.sun.position.copy(r.sunStart).lerp(r.base.clone().addScaledVector(r.up, 24 + 4), kk);
        r.sunBall.scale.setScalar(rad);
        r.shake = Math.max(r.shake, 0.35 * k * k);
        if (k > 0.25 && Math.random() < dt * 40) {               // labaredas soltando do Sol
          const off = V(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(rad * 1.05);
          puff(r, { pos: r.sun.position.clone().add(off), v: off.clone().multiplyScalar(0.6), s0: rad * 0.5, s1: rad * 1.1, life: 0.8, op: 0.75, color: '#ffe08a', c1: '#ff4010' });
        }
        if (k >= 1) { r.sunHit = true; r.sun.visible = false; call('sunImpact'); this._boom(7, 2.4); r.shake = 2.4; r.onSun && r.onSun(); }
      }
      if (r.sunHit && t > SUN_HIT + 1.0) once('debris', () => call('debris'));
      // brasas e poeira sobre a quadra arrasada
      if (r.sunHit && t < T_CAM + 0.8 && Math.random() < dt * 26) {
        const p = r.base.clone().addScaledVector(r.hor, (Math.random() - 0.5) * r.hw * 1.6).addScaledVector(r.side, (Math.random() - 0.5) * r.hw * 1.6).addScaledVector(r.up, 0.5);
        puff(r, { pos: p, v: r.up.clone().multiplyScalar(2 + Math.random() * 4).addScaledVector(r.side, (Math.random() - 0.5) * 2), s0: 0.35, s1: 0.1, life: 1.6 + Math.random(), op: 1, tex: 'ember', color: '#ffc060', c1: '#ff3010' });
        if (Math.random() < 0.35) puff(r, { pos: p, v: r.up.clone().multiplyScalar(1.2), s0: 3, s1: 8, life: 2.6, op: 0.45, tex: 'smoke', color: '#8a7a6a' });
      }
      // partículas
      const fade = t > T_CAM ? Math.max(0, 1 - (t - T_CAM) / 1.2) : 1;
      for (const p of r.pool) {
        if (!p.on) continue;
        p.life += dt; const k = p.life / p.max;
        if (k >= 1) { p.on = false; p.m.visible = false; continue; }
        if (p.g) p.v.addScaledVector(r.up, -p.g * dt);
        if (p.drag) p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
        p.m.position.addScaledVector(p.v, dt); p.m.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
        p.m.material.opacity = p.o0 * (1 - k) * (k < 0.08 ? k / 0.08 : 1) * fade;
        if (p.c1) p.m.material.color.copy(p.c0).lerp(p.c1, k);
      }
      // malhas (onda de choque, cúpula, coluna, destroços)
      for (let j = r.fx.length - 1; j >= 0; j--) {
        const e = r.fx[j]; e.life += dt;
        const end = t > T_CAM ? Math.max(0, 1 - (t - T_CAM) / 1.0) : 1;
        if (e.kind === 'ring') { const k = clamp01(e.life / e.max); e.m.scale.set(1 + e.s * Math.pow(k, 0.6), 1 + e.s * Math.pow(k, 0.6), e.flat ? 1 : 1 + e.s * Math.pow(k, 0.6)); e.m.material.opacity = (1 - k) * (e.op || 0.9) * end; }
        else if (e.kind === 'dome') { const k = clamp01(e.life / e.max); e.m.scale.setScalar(e.s * Math.pow(Math.min(1, k * 2.2), 0.5)); e.m.material.opacity = 0.85 * (1 - Math.max(0, k - 0.4) / 0.6) * end; }
        else if (e.kind === 'column') { const k = clamp01(e.life / e.max); e.m.scale.set(e.w * (1 - 0.6 * k), 420 * Math.min(1, k * 4), e.w * (1 - 0.6 * k)); e.m.material.opacity = (1 - k) * 0.9 * end; }
        else if (e.kind === 'debris') {
          if (!e.rest) { e.v.y -= 22 * dt; e.m.position.addScaledVector(e.v, dt); e.m.rotation.x += e.w * dt; e.m.rotation.z += e.w * 0.7 * dt; if (e.m.position.y < 0.2 && e.v.y < 0) { e.m.position.y = 0.2; e.rest = true; } }
          e.m.visible = end > 0.05; e.m.scale.setScalar(Math.max(0.01, end));
        }
        if ((e.kind !== 'debris' && e.life > e.max) || end <= 0) { r.G.remove(e.m); disposeFx(e.m); r.fx.splice(j, 1); }
      }
      r.shake = Math.max(0, r.shake - dt * (t > SUN_HIT ? 2.2 : 3));
      if (t >= T_END) { call('end'); const done = r.onEnd; this.cancel(); done && done(); return false; }
      return true;
    },
    /** impacto: clarão curto, bola de fogo volumosa, poeira, fragmentos e onda de choque no chão (i = 7: o Sol) */
    _boom(i, big) {
      const r = run, G = r.G, hw = r.hw, sun = i === 7;
      const at = (x, y, z) => r.base.clone().addScaledVector(r.hor, x).addScaledVector(r.up, y).addScaledVector(r.side, z);
      puff(r, { pos: at(0, 4, 0), s0: hw * 2.4 * big * 0.6, s1: hw * 3 * Math.min(big, 1.6), life: sun ? 0.35 : 0.18, op: 0.9, tex: 'flash' });                // clarão breve
      for (let k = 0; k < (sun ? 34 : 16); k++) {                                                                                                            // bola de fogo
        const d = V(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize();
        puff(r, { pos: at(d.x * hw * 0.4, 1.5 + d.y * 3, d.z * hw * 0.4), v: d.clone().multiplyScalar((5 + Math.random() * 8) * big).addScaledVector(r.up, 3), drag: 2.2,
          s0: 3 * big, s1: (7 + Math.random() * 5) * big, life: 0.9 + Math.random() * 0.6 * big, op: 0.9, color: '#ffe6a0', c1: sun ? '#ff3a08' : '#d83a10' });
      }
      for (let k = 0; k < (sun ? 26 : 12); k++) {                                                                                                            // poeira
        const a = Math.random() * 6.283, d = V(Math.cos(a), 0, Math.sin(a));
        puff(r, { pos: at(d.x * hw * 0.5, 1 + Math.random() * 2, d.z * hw * 0.5), v: V(d.x * 7 * big, 2 + Math.random() * 3, d.z * 7 * big), drag: 1.4,
          s0: 4 * big, s1: (10 + Math.random() * 6) * Math.min(big, 1.8), life: 2.4 + Math.random() * 1.2, op: 0.55, tex: 'smoke', color: '#9a8672' });
      }
      const cols = [['#c8402f', '#8a5a36', '#e6e0d4'], ['#efe3cc', '#d8cfbe', '#8a7a66'], ['#3f8f3a', '#c98a4a', '#e0402a'], ['#efe3cc', '#c8402f', '#5e3b20'], ['#6f5a40', '#4a3a2a', '#8f8b85'], ['#5a4a3a', '#3a2d22', '#8a5a36'], ['#fff3d6', '#c8402f', '#3a2d22'], ['#ffb347', '#3a2d22', '#ff6a1a']][i];
      for (let k = 0; k < 22 * big; k++) {                                                                                                                   // fragmentos
        const s = 0.3 + Math.random() * 0.9 * Math.min(2, big), m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 0.8), new THREE.MeshStandardMaterial({ color: cols[k % 3], roughness: 0.9 }));
        m.position.set((Math.random() - 0.5) * hw, 1 + Math.random() * 3, (Math.random() - 0.5) * hw); G.add(m);
        const a = Math.random() * 6.283, sp = 4 + Math.random() * 8;
        r.fx.push({ kind: 'debris', m, life: 0, v: V(Math.cos(a) * sp * Math.min(1, hw / 18), 12 + Math.random() * 16 * Math.min(2, big), Math.sin(a) * sp * Math.min(1, hw / 18)), w: (Math.random() - 0.5) * 16 });
      }
      for (let k = 0; k < (sun ? 3 : 1); k++) {                                                                                                              // onda de choque no chão
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 64), add(new THREE.MeshBasicMaterial({ color: sun ? '#ffb060' : '#ffe2b0', side: THREE.DoubleSide })));
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.35 + k * 0.02; G.add(ring);
        r.fx.push({ kind: 'ring', m: ring, life: -k * 0.25, max: 0.9 * (sun ? 1.4 : 1), s: r.R * (sun ? 1.6 : 1.25), flat: true, op: 0.95 });
      }
      if (sun) {                                                                                                                                             // cúpula de fogo e coluna de energia
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), add(new THREE.MeshBasicMaterial({ color: '#ff6a1a', opacity: 0.85, side: THREE.DoubleSide })));
        G.add(dome); r.fx.push({ kind: 'dome', m: dome, life: 0, max: 1.7, s: r.R * 1.05 });
        const col = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ffd27a', opacity: 0.9 }))); col.frustumCulled = false; G.add(col);
        r.fx.push({ kind: 'column', m: col, life: 0, max: 1.5, w: r.hw * 0.7 });
      }
    },
    applyCamera(cam) {
      if (!run) return;
      const r = run, t = r.t, dt = r.dt, rigP = cam.position.clone(), rigQ = cam.quaternion.clone();   // o que o rig da câmera calculou neste quadro
      // posição: rua ao lado da quadra (rente ao chão); para o Sol um pouco mais longe; no fim, de perto; depois volta à van
      let pos;
      if (t < 1.3) pos = r.P0.clone().lerp(r.O, ease(t / 1.3));
      else if (t < SUN_START - 0.5) pos = r.O.clone();
      else if (t < T_CLOSE) pos = r.O.clone().lerp(r.O2, ease((t - SUN_START + 0.5) / 0.9));
      else pos = r.O2.clone().lerp(r.Pd, ease((t - T_CLOSE) / 1.1));
      // para onde olha
      const house = r.base.clone().addScaledVector(r.up, 3.5);
      let target = house, rate = 3.5;
      if (t < LAUNCH(0)) { target = r.C; rate = 2.2; }
      else if (t < SUN_START - 0.2) {
        rate = 6.5;
        const recent = r.planets.find((pl, i) => pl.hit && t - HIT(i) < 0.45);
        const next = r.planets.find(pl => pl.flying && !pl.hit);
        if (recent || !next) target = house;
        else {
          const k = clamp01((t - next.t0) / FLIGHT), w = ease((k - 0.45) / 0.45);
          target = mixDir(pos, next.m.position, house, 1 - w * 0.55);
        }
      } else if (t < SUN_HIT) { const k = clamp01((t - SUN_START) / (SUN_HIT - SUN_START)); target = mixDir(pos, r.sunStart ? r.sun.position : r.C, house, 0.56 - 0.1 * ease(k)); rate = 2.6; }
      else if (t < SUN_HIT + 0.7) { target = r.base.clone().addScaledVector(r.up, 9); rate = 4; }
      else target = r.base.clone().addScaledVector(r.up, 1.2);
      const qT = _q.setFromRotationMatrix(_m.lookAt(pos, target, r.up));
      r.q.slerp(qT, 1 - Math.exp(-rate * dt));
      cam.position.copy(pos); cam.quaternion.copy(r.q);
      // volta para a câmera normal da van
      const k = ease((t - T_CAM) / (T_END - T_CAM - 0.15));
      if (k > 0) { cam.position.lerp(rigP, k); cam.quaternion.slerp(rigQ, k); }
      if (r.shake > 0) { const s = Math.min(1.6, r.shake * r.shake) * 0.5; cam.position.addScaledVector(r.up, (Math.random() - 0.5) * s).addScaledVector(r.side, (Math.random() - 0.5) * s); }
      // campo de visão mais aberto olhando o céu (o Sistema Solar enche a tela)
      const fov = 55 + 17 * ease((t - 0.3) / 1.2) * (1 - ease((t - LAUNCH(0) + 0.3) / 1.2)) + 8 * ease((t - SUN_START) / 1.5) * (1 - ease((t - SUN_HIT) / 0.8));
      if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    },
    cancel() {
      if (!run) return;
      const r = run; light(r, 0, 0);
      for (const e of r.fx) { r.G.remove(e.m); disposeFx(e.m); }
      if (r.G.parent) r.G.parent.remove(r.G);
      if (r.sky.parent) r.sky.parent.remove(r.sky);
      if (r.fxRoot.parent) r.fxRoot.parent.remove(r.fxRoot);
      disposeFx(r.G); disposeFx(r.sky); disposeFx(r.fxRoot);
      call('end'); run = null;
    },
  };
}
