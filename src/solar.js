// Modo Livre, entrega errada com o efeito "Sistema Solar" (menu de opções): sequência de 25 s, toda no bairro.
//   0–4 s    a câmera larga a van e olha para cima; o dia vira noite (estrelas) e aparece um Sistema Solar exagerado no
//            céu: Sol brilhante e Mercúrio, Vênus, Marte, Júpiter, Saturno (anéis), Urano e Netuno orbitando.
//   4–8 s    os sete deixam as órbitas e disparam rumo à casa como meteoros gigantes (rastro, fogo, energia).
//   8–16 s   de volta à casa: os sete atingem o local um atrás do outro; cada impacto destrói mais (main.js: onImpact).
//   16–22 s  o Sol vem devagar, bola de fogo com labaredas; atinge a quadra: clarão, onda de fogo, distorção e tremor.
//   22–25 s  efeitos somem, dia e luz de volta, câmera volta à van e os controles voltam.
import * as THREE from 'three';
import { glowTexture, add, BEAM_GEO } from './laser.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = x => Math.max(0, Math.min(1, x));
// planetas: cor, raio (no céu), órbita, característica
const PLANETS = [
  { c: '#b5a58f', r: 7, o: 70 }, { c: '#e3c27a', r: 10, o: 105 }, { c: '#c8502f', r: 8, o: 140 },
  { c: '#d8b07a', r: 22, o: 190, bands: true }, { c: '#e6cf8f', r: 18, o: 245, ring: true }, { c: '#8fd6e0', r: 13, o: 290, tilt: true }, { c: '#3f6fe0', r: 13, o: 330 },
];
const LAUNCH = i => 4.2 + i * 0.42, HIT = i => 8.5 + i * 1.05, SUN_START = 16.2, SUN_HIT = 20.6, T_CAM = 22.3, T_END = 25;

function fireTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#ff8a1a'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 1100; i++) { g.fillStyle = ['#ffd84a', '#ff5a14', '#fff3b0', '#e0301e'][i % 4]; g.globalAlpha = 0.3 + Math.random() * 0.5; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 128, 1 + Math.random() * 6, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function planetMesh(p) {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = p.c; x.fillRect(0, 0, 128, 64);
  if (p.bands) for (let k = 0; k < 7; k++) { x.fillStyle = k % 2 ? '#a8784a' : '#efd9b0'; x.fillRect(0, 6 + k * 8, 128, 4); }
  if (p.bands) { x.fillStyle = '#c0502f'; x.beginPath(); x.ellipse(80, 38, 9, 5, 0, 0, 7); x.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  g.add(new THREE.Mesh(new THREE.SphereGeometry(p.r, 28, 18), new THREE.MeshBasicMaterial({ map: tex, fog: false })));
  if (p.ring) { const ring = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.35, p.r * 2.3, 48), new THREE.MeshBasicMaterial({ color: '#e8d6a8', side: THREE.DoubleSide, transparent: true, opacity: 0.85, fog: false })); ring.rotation.x = 1.25; g.add(ring); }
  if (p.tilt) { const ring = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.3, p.r * 1.5, 40), new THREE.MeshBasicMaterial({ color: '#cfeff5', side: THREE.DoubleSide, transparent: true, opacity: 0.5, fog: false })); ring.rotation.y = 1.4; g.add(ring); }
  const fire = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,250,200,1)', 'rgba(255,120,30,0.75)') }))); fire.scale.setScalar(p.r * 3); fire.visible = false; g.add(fire);
  const trail = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ff8a2a', opacity: 0.75 }))); trail.frustumCulled = false; trail.visible = false; g.add(trail);
  g.userData = { fire, trail };
  return g;
}

export function createSolar(audio) {
  let run = null;
  const A = audio.ursa || {};
  const call = (k, ...a) => { try { A[k] && A[k](...a); } catch (e) { /* som opcional */ } };
  const _m = new THREE.Matrix4();

  function night(r, k) {                                   // dia ↔ noite (k: 0 dia, 1 noite)
    const W = r.world, sc = W.scene;
    if (sc.background && sc.background.isColor) sc.background.copy(r.save.bg).lerp(r.nightBg, k);
    if (sc.fog) sc.fog.color.copy(r.save.fog).lerp(r.nightBg, k);
    if (W.sunLight) W.sunLight.intensity = r.save.sun * (1 - 0.8 * k);
    if (r.hemi) r.hemi.intensity = r.save.hemi * (1 - 0.6 * k);
    if (r.daySun) r.daySun.visible = k < 0.3 && r.save.daySun;
    r.stars.material.opacity = k;
  }

  return {
    get active() { return !!run; }, get inSpace() { return false; }, get scene() { return null; }, get camera() { return null; },
    get time() { return run ? run.t : -1; },
    /** opts: { parent, local, rect, moon, cam, world (o objeto do bairro: scene, sunLight), onImpact(i), onSun(), onEnd() } */
    start(opts) {
      const G = new THREE.Group(); G.position.copy(opts.local); opts.parent.add(G); opts.parent.updateMatrixWorld(true);
      const base = G.getWorldPosition(new THREE.Vector3()), up = V(0, 1, 0).applyQuaternion(G.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const cam = opts.cam, P0 = cam.position.clone(), look0 = P0.clone().add(V(0, 0, -20).applyQuaternion(cam.quaternion));
      let hor = P0.clone().sub(base); hor.addScaledVector(up, -hor.dot(up)); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
      const fwd = hor.clone().negate(), right = fwd.clone().cross(up).normalize();
      const C = base.clone().addScaledVector(up, 520).addScaledVector(fwd, 260);   // o Sistema Solar no céu, à frente e acima
      const Pc = base.clone().addScaledVector(hor, 46).addScaledVector(up, 24);
      const sky = new THREE.Group(); opts.world.scene.add(sky);
      // estrelas da noite (cúpula em volta da casa)
      const N = 2500, sp = new Float32Array(N * 3); let sd = 21; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) { const v = V(rnd() - 0.5, rnd() * 0.9 + 0.02, rnd() - 0.5).normalize(); sp.set([base.x + v.x * 1300, base.y + v.y * 1300, base.z + v.z * 1300], i * 3); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
      stars.frustumCulled = false; sky.add(stars);
      // Sol e órbitas (plano inclinado de frente para a câmera)
      const plane = new THREE.Group(); plane.position.copy(C); plane.up.copy(up); plane.lookAt(P0);                    // o plano das órbitas de frente para a câmera
      sky.add(plane);
      const sunTex = fireTexture();
      const sun = new THREE.Group(); plane.add(sun);
      sun.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 20), new THREE.MeshBasicMaterial({ map: sunTex, fog: false, toneMapped: false })));
      const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,250,220,1)', 'rgba(255,160,40,0.7)') }))); sunGlow.scale.setScalar(150); sun.add(sunGlow);
      const flares = [];
      for (let k = 0; k < 8; k++) { const f = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,240,180,1)', 'rgba(255,90,20,0.7)') }))); sun.add(f); flares.push({ f, a: k * 0.785, ph: k }); }
      const orbits = PLANETS.map(p => { const pts = []; for (let k = 0; k <= 96; k++) { const a = k / 96 * 6.283; pts.push(V(Math.cos(a) * p.o, 0, Math.sin(a) * p.o)); }
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), add(new THREE.LineBasicMaterial({ color: '#8fb0ff', opacity: 0.0 }))); l.rotation.x = Math.PI / 2; plane.add(l); return l; });
      const planets = PLANETS.map((p, i) => { const m = planetMesh(p); plane.add(m); return { p, m, a: i * 0.9 + 0.3, flying: false, start: null }; });
      plane.scale.setScalar(0.01);
      const hemi = opts.world.scene.children.find(o => o.isHemisphereLight), daySun = opts.world.scene.getObjectByName('sun');
      const sc = opts.world.scene;
      run = { ...opts, G, t: 0, base, up, P0, look0, C, Pc, sky, stars, plane, sun, sunGlow, flares, orbits, planets, hemi, daySun, fx: [], hits: 0, sfx: {}, shake: 0,
        hw: opts.rect ? Math.min(opts.rect.w, opts.rect.d) / 2 : 8, R: opts.rect ? 0.5 * Math.hypot(opts.rect.w, opts.rect.d) : 9.5,
        nightBg: new THREE.Color('#050a1c'),
        save: { bg: sc.background && sc.background.isColor ? sc.background.clone() : new THREE.Color('#000'), fog: sc.fog ? sc.fog.color.clone() : new THREE.Color('#000'),
          sun: opts.world.sunLight ? opts.world.sunLight.intensity : 1, hemi: hemi ? hemi.intensity : 1, daySun: daySun ? daySun.visible : false } };
      call('begin'); call('nightfall');
    },
    update(dt) {
      if (!run) return false;
      const r = run; r.t += dt; const t = r.t;
      const once = (k, fn) => { if (!r.sfx[k]) { r.sfx[k] = true; fn(); } };
      // noite: entra em 0,2–1,6 s; volta ao dia em 22–23,2 s
      night(r, ease((t - 0.2) / 1.4) * (1 - ease((t - 22) / 1.2)));
      // Sistema Solar no céu
      const show = ease((t - 0.8) / 1.6);
      r.plane.scale.setScalar(Math.max(0.01, show));
      r.orbits.forEach(o => { o.material.opacity = 0.45 * show * (1 - ease((t - 4) / 1.2)); });
      if (t > 1.2) once('orbit', () => call('orbit'));
      const spin = 1 + 3 * ease((t - 1.5) / 2.6);                // giram cada vez mais rápido (energia crescendo)
      const worldPos = new THREE.Vector3();
      r.planets.forEach((pl, i) => {
        const m = pl.m, ud = m.userData;
        if (!pl.flying) {
          pl.a += dt * spin * (1.4 - i * 0.13);
          m.position.set(Math.cos(pl.a) * pl.p.o, Math.sin(pl.a) * pl.p.o, 0);
          m.rotation.y += dt * 2;
          if (t >= LAUNCH(i)) {                                    // sai da órbita: passa para o mundo e vem rumo à casa
            pl.flying = true; once('dash' + i, () => call('dash', i));
            m.getWorldPosition(worldPos); r.sky.add(m); m.position.copy(worldPos); m.scale.setScalar(r.plane.scale.x * 1.15);
            pl.start = worldPos.clone(); pl.t0 = t; ud.fire.visible = true; ud.trail.visible = true;
          }
        }
        if (pl.flying && !pl.hit) {
          const k = clamp01((t - pl.t0) / (HIT(i) - pl.t0)), kk = Math.pow(k, 2.2);
          const p = pl.start.clone().lerp(r.base.clone().addScaledVector(r.up, pl.p.r * 0.6), kk).addScaledVector(r.up, Math.sin(k * Math.PI) * 60);
          const dir = p.clone().sub(m.position); m.position.copy(p); m.rotation.y += dt * 6;
          if (dir.lengthSq() > 1e-6) { dir.normalize(); ud.trail.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().negate()); }
          ud.trail.scale.set(pl.p.r * 0.55, pl.p.r * (8 + 22 * kk), pl.p.r * 0.55); ud.trail.position.set(0, 0, 0);
          ud.fire.scale.setScalar(pl.p.r * (3 + 1.5 * Math.sin(t * 30)));
          if (k >= 1) { pl.hit = true; m.visible = false; call('impact', i); this._boom(i, 1); r.shake = 1.2; r.onImpact && r.onImpact(i); }
        }
      });
      // o Sol: sai do céu e vem devagar (16–20,6 s); impacto muito maior
      r.flares.forEach((f, k) => { const s = 1 + 0.5 * Math.sin(t * 7 + f.ph); f.f.position.set(Math.cos(f.a) * 34 * s, Math.sin(f.a) * 34 * s, 0); f.f.scale.setScalar(40 * s); });
      r.sun.rotation.z += dt * 0.4;
      if (t >= SUN_START && !r.sunHit) {
        once('sun', () => { r.sun.getWorldPosition(worldPos); r.sky.add(r.sun); r.sun.position.copy(worldPos); r.sunStart = worldPos.clone(); r.sun.scale.setScalar(r.plane.scale.x); call('sunApproach'); });
        const k = clamp01((t - SUN_START) / (SUN_HIT - SUN_START)), kk = Math.pow(k, 1.7);
        r.sun.position.copy(r.sunStart).lerp(r.base.clone().addScaledVector(r.up, 20), kk);
        r.sun.scale.setScalar(1 + 0.6 * kk);
        r.shake = Math.max(r.shake, 0.25 * k);
        if (k >= 1) { r.sunHit = true; r.sun.visible = false; call('sunImpact'); this._boom(7, 2.4); r.shake = 3; r.onSun && r.onSun(); }
      }
      if (r.sunHit && t > SUN_HIT + 1.2) once('debris', () => call('debris'));
      // efeitos (flash, ondas, destroços)
      for (let j = r.fx.length - 1; j >= 0; j--) {
        const e = r.fx[j]; e.life += dt;
        const end = t > T_CAM ? Math.max(0, 1 - (t - T_CAM) / 0.7) : 1;
        if (e.kind === 'flash') { const f = 1 - clamp01(e.life / e.max); e.m.scale.setScalar(e.s * (0.6 + 1.2 * (1 - f))); e.m.material.opacity = f * end; }
        else if (e.kind === 'ring') { const k = clamp01(e.life / e.max); e.m.scale.setScalar(1 + e.s * k); e.m.material.opacity = (1 - k) * 0.9 * end; }
        else if (e.kind === 'debris') {
          if (!e.rest) { e.v.y -= 26 * dt; e.m.position.addScaledVector(e.v, dt); e.m.rotation.x += e.w * dt; e.m.rotation.z += e.w * 0.7 * dt; if (e.m.position.y < 0.2 && e.v.y < 0) { e.m.position.y = 0.2; e.rest = true; } }
          e.m.visible = end > 0.05; e.m.scale.setScalar(Math.max(0.01, end));
        }
        if ((e.kind !== 'debris' && e.life > e.max) || end <= 0) { r.G.remove(e.m); r.fx.splice(j, 1); }
      }
      r.shake = Math.max(0, r.shake - dt * 2.6);
      if (t >= T_END) { call('end'); const done = r.onEnd; this.cancel(); done && done(); return false; }
      return true;
    },
    _boom(i, big) {
      const r = run, G = r.G, hw = r.hw;
      const fl = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', i === 7 ? 'rgba(255,140,30,0.9)' : i % 2 ? 'rgba(255,170,60,0.8)' : 'rgba(150,200,255,0.8)') })));
      fl.position.y = 3; G.add(fl); r.fx.push({ kind: 'flash', m: fl, life: 0, max: 0.6 * big, s: 34 * big });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.35 * big, 6, 48), add(new THREE.MeshBasicMaterial({ color: i === 7 ? '#ff7a1a' : i % 2 ? '#ffd27a' : '#bfe4ff' })));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.6; G.add(ring); r.fx.push({ kind: 'ring', m: ring, life: 0, max: 0.65 * big, s: Math.min(hw * 1.1 * big, r.R) });
      if (i === 7) {                                         // onda de fogo do Sol: cúpula laranja do tamanho da quadra
        const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), add(new THREE.MeshBasicMaterial({ color: '#ff6a1a', opacity: 0.8 })));
        G.add(dome); r.fx.push({ kind: 'ring', m: dome, life: 0, max: 1.4, s: r.R });
      }
      const cols = [['#c8402f', '#8a5a36', '#e6e0d4'], ['#efe3cc', '#d8cfbe', '#8a7a66'], ['#3f8f3a', '#c98a4a', '#e0402a'], ['#efe3cc', '#c8402f', '#5e3b20'], ['#6f5a40', '#4a3a2a', '#8f8b85'], ['#5a4a3a', '#3a2d22', '#8a5a36'], ['#fff3d6', '#c8402f', '#3a2d22'], ['#ffb347', '#3a2d22', '#ff6a1a']][i];
      for (let k = 0; k < 24 * big; k++) {
        const s = 0.3 + Math.random() * 0.9 * Math.min(2, big), m = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * 0.8), new THREE.MeshStandardMaterial({ color: cols[k % 3], roughness: 0.9 }));
        m.position.set((Math.random() - 0.5) * hw, 1 + Math.random() * 3, (Math.random() - 0.5) * hw); G.add(m);
        const a = Math.random() * 6.283, sp = 4 + Math.random() * 9;
        r.fx.push({ kind: 'debris', m, life: 0, v: V(Math.cos(a) * sp * Math.min(1, hw / 18), 10 + Math.random() * 16 * Math.min(2, big), Math.sin(a) * sp * Math.min(1, hw / 18)), w: (Math.random() - 0.5) * 16 });
      }
    },
    applyCamera(cam) {
      if (!run) return;
      const r = run, t = r.t;
      if (t < 7.6) {                                         // olha o céu (Sistema Solar e os planetas saindo)
        const k = ease((t - 0.2) / 1.6), look = r.look0.clone().lerp(r.C, k);
        if (t > 5) look.lerp(r.base.clone().addScaledVector(r.up, 120), ease((t - 5) / 2.6) * 0.6);   // acompanha os planetas descendo
        cam.position.copy(r.P0); cam.up.copy(r.up); cam.lookAt(look); cam.up.set(0, 1, 0);
      } else {
        const lookY = t < SUN_HIT ? 10 + 30 * ease((t - SUN_START) / 2) : 2;   // com o Sol vindo, a mira sobe um pouco
        let lookP = r.base.clone().addScaledVector(r.up, lookY);
        if (t >= SUN_START && !r.sunHit && r.sunStart) lookP = r.base.clone().lerp(r.sun.position, 0.55);   // o Sol chegando fica no quadro
        const qc = new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(r.Pc, lookP, r.up));
        const k = ease((t - T_CAM) / (T_END - T_CAM - 0.1)), k0 = ease((t - 7.6) / 0.5);
        const rigPos = cam.position.clone(), rigQ = cam.quaternion.clone();
        if (t < 8.1) { const pq = new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(r.P0, r.base.clone().addScaledVector(r.up, 60), r.up)); cam.position.copy(r.P0).lerp(r.Pc, k0); cam.quaternion.copy(pq).slerp(qc, k0); return; }
        cam.position.copy(r.Pc).lerp(rigPos, k); cam.quaternion.copy(qc).slerp(rigQ, k);
        if (r.shake > 0) { const s = r.shake * r.shake * 0.5; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; cam.position.z += (Math.random() - 0.5) * s; }
        // distorção visual no golpe do Sol (o campo de visão pulsa)
        const d = t > SUN_HIT && t < SUN_HIT + 1.2 ? Math.sin((t - SUN_HIT) * 40) * 6 * (1 - (t - SUN_HIT) / 1.2) : 0;
        if (Math.abs(cam.fov - (55 + d)) > 0.01 && (d || cam.userData.solarFov)) { cam.userData.solarFov = !!d; cam.fov = 55 + d; cam.updateProjectionMatrix(); }
      }
    },
    cancel() {
      if (!run) return;
      const r = run; night(r, 0);
      for (const e of r.fx) r.G.remove(e.m);
      if (r.G.parent) r.G.parent.remove(r.G);
      if (r.sky.parent) r.sky.parent.remove(r.sky);
      call('end'); run = null;
    },
  };
}
