// Modo Livre, entrega errada com o efeito "Laser orbital" (menu de opções): sequência cinematográfica de 23 s.
//   0–3 s   um laser fino desce do céu até a construção; a câmera larga a van e sobe seguindo o raio.
//   3–13 s  corte para uma CENA ESPACIAL SEPARADA (nada disso fica no bairro): a Terra com o raio saindo para o espaço;
//           a câmera se afasta cada vez mais rápido — Lua, Sol e planetas, estrelas, a galáxia inteira — e o raio
//           continua visível (a espessura acompanha a distância da câmera) até sair da galáxia.
//   13–16 s um satélite fora da galáxia: a câmera se aproxima; peças giram, braços se ajustam e o emissor carrega.
//   16–19 s volta absurdamente rápida pelo raio até a Terra; o laser engrossa e brilha mais.
//   19–23 s de volta ao bairro: núcleo neon grosso + camada vermelha transparente do tamanho da quadra; a quadra vira um
//           vazio escuro (main.js, onErase); o raio some e a câmera volta suave para a van.
// Escalas "de cinema": distâncias em unidades da cena espacial (Terra = raio 10; galáxia = raio 2·10⁶). near/far da
// câmera acompanham a distância, e planetas/Sol/satélite crescem com ela para continuarem legíveis.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const clamp01 = x => Math.max(0, Math.min(1, x));
const T_SKY = 3, T_SAT = 13, T_BACK = 16, T_HOME = 19, T_ERASE = 19.9, T_FADE = 21.1, T_CAM = 21.8, T_END = 23;

function glowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,120,200,0.6)') {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.25, mid); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const add = (mat) => Object.assign(mat, { blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false });
/** Cilindro unitário de y = 0 a y = 1 (escala: raio em x/z, comprimento em y). */
const BEAM_GEO = new THREE.CylinderGeometry(1, 1, 1, 18, 1, true).translate(0, 0.5, 0);
/** Prisma quadrado (camada vermelha do tamanho exato da quadra): meia-largura 1 em x e z. */
const BOX_GEO = new THREE.CylinderGeometry(Math.SQRT2, Math.SQRT2, 1, 4, 1, true).rotateY(Math.PI / 4).translate(0, 0.5, 0);

// ---------------- cena espacial ----------------
function buildSpace(moonTarget) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#02030a');
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1e4);
  scene.add(new THREE.AmbientLight('#8090b0', 0.55));
  const E = V(0, 0, 0);
  const D = V(0.22, 0.9, -0.38).normalize(), G = V(0.15, 1, -0.1).normalize();
  const W = D.clone().cross(G).normalize(), G2 = W.clone().cross(D).normalize();
  const SUN = W.clone().multiplyScalar(2600).addScaledVector(G2, 900).addScaledVector(D, -900);   // do lado da câmera: a Terra aparece iluminada
  const sunLight = new THREE.DirectionalLight('#fff4dd', 2.4); sunLight.position.copy(SUN); scene.add(sunLight, sunLight.target);
  // Terra (nuvens, continentes) e a Lua
  const earth = new THREE.Group(); scene.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(10, 40, 26), new THREE.MeshStandardMaterial({ color: '#2f6fd0', roughness: 0.7 })));
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9; i++) { const n = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(), c = new THREE.Mesh(new THREE.SphereGeometry(2.2 + rnd() * 2.6, 12, 8), new THREE.MeshStandardMaterial({ color: i % 3 ? '#4fae5a' : '#c8b46a', roughness: 0.9 }));
    c.position.copy(n).multiplyScalar(8.9); c.scale.set(1, 1, 0.35); c.lookAt(n.clone().multiplyScalar(20)); earth.add(c); }
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(10.4, 40, 26), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false })));
  const atmo = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(140,190,255,0.0)', 'rgba(110,170,255,0.35)') }))); atmo.scale.setScalar(30); earth.add(atmo);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 16), new THREE.MeshStandardMaterial({ color: '#c9ccd0', roughness: 1 }));
  moon.position.copy(W).multiplyScalar(-34).addScaledVector(G2, 12); scene.add(moon);
  // laser: sai da Terra (ou da pequena lua do Bairro Órbita) na direção D
  const T = moonTarget ? moon.position.clone().addScaledVector(D, 2.7) : E.clone().addScaledVector(D, 10);
  const SAT = T.clone().addScaledVector(D, 5e6);
  // Sol e planetas (órbitas como linhas; o tamanho cresce com a distância da câmera para continuarem visíveis)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd84a', fog: false })); sun.position.copy(SUN); scene.add(sun);
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,250,220,1)', 'rgba(255,190,80,0.55)') }))); sunGlow.position.copy(SUN); scene.add(sunGlow);
  const planets = [];
  const ORB = [[900, 6, '#b5a58f'], [1800, 9, '#e3c27a'], [4300, 7, '#c8502f'], [8000, 40, '#d8b07a'], [12000, 34, '#e6cf8f'], [16000, 20, '#8fd6e0'], [20000, 19, '#3f6fe0']];
  ORB.forEach(([R, r, c], i) => {
    const a = i * 2.1 + 0.7, p = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    p.position.set(SUN.x + Math.cos(a) * R, SUN.y, SUN.z + Math.sin(a) * R); scene.add(p); planets.push({ m: p, r });
    if (i === 4) { const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.3, 40), new THREE.MeshBasicMaterial({ color: '#d8c49a', side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); ring.rotation.x = 1.2; p.add(ring); }
  });
  for (const R of [900, 1800, 3000, 4300, 8000, 12000, 16000, 20000]) {
    const pts = []; for (let k = 0; k <= 160; k++) { const a = k / 160 * Math.PI * 2; pts.push(V(SUN.x + Math.cos(a) * R, SUN.y, SUN.z + Math.sin(a) * R)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: R === 3000 ? '#6fa0ff' : '#5a6a8a', transparent: true, opacity: 0.45 })));
  }
  planets.push({ m: earth, r: 10, earth: true });
  // estrelas próximas (em volta do Sol)
  const pts = (n, f) => { const p = new Float32Array(n * 3), c = new Float32Array(n * 3); for (let i = 0; i < n; i++) f(i, p, c); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const near = new THREE.Points(pts(5000, (i, p, c) => { const v = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(2e4 + rnd() * 4e5); p.set([SUN.x + v.x, SUN.y + v.y, SUN.z + v.z], i * 3); const w = 0.7 + rnd() * 0.3; c.set([w, w, 0.8 + rnd() * 0.2], i * 3); }),
    new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, fog: false }));
  near.frustumCulled = false; scene.add(near);
  // galáxia espiral (pontos aditivos) com o Sol a ~1,1·10⁶ do centro
  const GR = 2e6, GC = SUN.clone().add(V(1.05e6, -1.2e5, 2.6e5)), gq = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), G);
  const gal = new THREE.Group(); gal.position.copy(GC); gal.quaternion.copy(gq); scene.add(gal);
  const NG = 60000;
  const galPts = new THREE.Points(pts(NG, (i, p, c) => {
    let x, y, z, w;
    if (i < 9000) { const r = Math.pow(rnd(), 1.6) * 0.18 * GR, a = rnd() * 6.283, h = (rnd() - 0.5) * 0.14 * GR * (1 - r / (0.18 * GR)); x = Math.cos(a) * r; z = Math.sin(a) * r; y = h; w = [1, 0.85, 0.55]; }
    else { const arm = i % 3, r = (0.06 + 0.94 * Math.pow(rnd(), 0.75)) * GR, a = arm * 2.094 + (r / GR) * 6.0 + (rnd() - 0.5) * 0.55 * (1.2 - r / GR);
      const j = (rnd() - 0.5) * 0.06 * GR; x = Math.cos(a) * r + j; z = Math.sin(a) * r + (rnd() - 0.5) * 0.06 * GR; y = (rnd() - 0.5) * 0.03 * GR; const t = r / GR; w = [0.75 + 0.25 * (1 - t), 0.8, 0.85 + 0.15 * t]; }
    p.set([x, y, z], i * 3); c.set(w, i * 3);
  }), add(new THREE.PointsMaterial({ size: 1.7, sizeAttenuation: false, vertexColors: true, opacity: 0.85 })));
  galPts.frustumCulled = false; gal.add(galPts);
  const core = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,240,200,0.9)', 'rgba(255,200,140,0.35)') }))); core.scale.setScalar(1.3 * GR); gal.add(core);
  // estrelas de fundo (seguem a câmera, sempre ao longe)
  const sky = new THREE.Points(pts(2500, (i, p, c) => { const v = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); p.set(v.toArray(), i * 3); const w = 0.55 + rnd() * 0.45; c.set([w, w, w], i * 3); }),
    new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
  sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);
  // satélite: corpo hexagonal dourado, anel giratório, 2 braços com painéis, emissor apontado para a Terra
  const sat = new THREE.Group(); sat.position.copy(SAT); sat.quaternion.setFromUnitVectors(V(0, 0, 1), D.clone().negate()); scene.add(sat);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.5, ...o });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4.2, 6), M('#d9a441')); body.rotation.x = Math.PI / 2; sat.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.28, 8, 32), M('#c9ccd4')); sat.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.18, 8, 32), M('#e0402a')); sat.add(ring2);
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 2.4, 0, -0.6); sat.add(arm);
    { const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 0.3), M('#9da1a7')); m.position.set(s * 1.6, 0, 0); arm.add(m); }
    const panel = new THREE.Group(); panel.position.set(s * 4.6, 0, 0); arm.add(panel);
    panel.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 2.6), M('#1d3a7a', { metalness: 0.2 })));
    for (let k = -2; k <= 2; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 2.62), M('#8fb0ee')); m.position.set(k, 0, 0); panel.add(m); }
    arms.push({ arm, panel, s });
  }
  const dish = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.6, 24, 1, true), M('#e8e8e8', { side: THREE.DoubleSide })); dish.rotation.x = -Math.PI / 2; dish.position.z = 3.2; sat.add(dish);
  const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff5ad8', toneMapped: false })); emitter.position.z = 3.6; sat.add(emitter);
  const prongs = [];
  for (let k = 0; k < 3; k++) { const p = new THREE.Group(); p.rotation.z = k * 2.094; sat.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3), M('#3a3d44')); b.position.set(0, 1.9, 3.2); b.rotation.x = 0.35; p.add(b); prongs.push(p); }
  const beacon = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture('rgba(255,255,255,1)', 'rgba(255,80,200,0.7)'), sizeAttenuation: false }))); beacon.scale.setScalar(0.05); sat.add(beacon);
  const emGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture() }))); emGlow.position.z = 3.8; emGlow.scale.setScalar(5); sat.add(emGlow);
  // o raio no espaço: do emissor até o alvo
  const beamCore = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ffd6f4' })));
  const beamGlow = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ff2a8a', opacity: 0.55 })));
  for (const b of [beamCore, beamGlow]) { b.frustumCulled = false; b.position.copy(T); b.quaternion.setFromUnitVectors(V(0, 1, 0), D); scene.add(b); }
  const hit = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture() }))); hit.position.copy(T); hit.scale.setScalar(4); scene.add(hit);
  const beamLen = SAT.distanceTo(T) - 3.6;
  return { scene, camera, E, D, W, G2, T, SAT, sun, sunGlow, planets, sky, sat, ring, ring2, arms, prongs, emitter, emGlow, beamCore, beamGlow, hit, beamLen };
}

// ---------------- controlador ----------------
export function createLaser(audio) {
  let S = null, spaceFor = null;                          // cena espacial (feita na 1ª vez; refeita se o alvo mudar: Terra × lua)
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
  let run = null;

  // pedaços do raio no bairro (eixo = +Y do grupo, base em y = 0)
  function worldBeam(outerR, rect) {
    const g = new THREE.Group();
    const thinCore = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ffe4f6' })));
    const thinGlow = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ff2a8a', opacity: 0.6 })));
    const bigCore = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ffffff' })));
    const bigNeon = new THREE.Mesh(BEAM_GEO, add(new THREE.MeshBasicMaterial({ color: '#ff3ad0', opacity: 0.9 })));
    const outer = new THREE.Mesh(rect ? BOX_GEO : BEAM_GEO, new THREE.MeshBasicMaterial({ color: '#ff1010', transparent: true, opacity: 0.32, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    const hitGlow = new THREE.Sprite(new THREE.SpriteMaterial(add({ map: glowTexture() })));
    for (const m of [thinCore, thinGlow, bigCore, bigNeon, outer]) { m.frustumCulled = false; g.add(m); }
    g.add(hitGlow);
    bigCore.visible = bigNeon.visible = outer.visible = false;
    return { g, thinCore, thinGlow, bigCore, bigNeon, outer, hitGlow, outerR, rect };
  }
  const L = 1400;                                          // comprimento do raio no bairro (até perto do limite da câmera)
  const setBeam = (m, r, y0 = 0, len = L) => { m.position.y = y0; m.scale.set(r, Math.max(0.01, len), r); };

  return {
    get active() { return !!run; },
    get inSpace() { return !!run && run.t >= T_SKY && run.t < T_HOME; },
    get scene() { return S && S.scene; }, get camera() { return S && S.camera; },
    /** opts: { parent, local (Vector3 no pai), outerR, rect ({ w, d }: quadra retangular), moon, cam (câmera do jogo), onErase(), onEnd() } */
    start(opts) {
      if (!S || spaceFor !== !!opts.moon) { S = buildSpace(!!opts.moon); spaceFor = !!opts.moon; }
      const B = worldBeam(opts.outerR, opts.rect);
      B.g.position.copy(opts.local); opts.parent.add(B.g);
      opts.parent.updateMatrixWorld(true);
      const base = B.g.getWorldPosition(new THREE.Vector3()), up = V(0, 1, 0).applyQuaternion(B.g.getWorldQuaternion(new THREE.Quaternion())).normalize();
      const P0 = opts.cam.position.clone(), q0 = opts.cam.quaternion.clone(), look0 = P0.clone().add(V(0, 0, -20).applyQuaternion(q0));
      let hor = P0.clone().sub(base); hor.addScaledVector(up, -hor.dot(up)); if (hor.lengthSq() < 1e-4) hor.set(0, 0, 1); hor.normalize();
      const Pc = base.clone().addScaledVector(hor, 36).addScaledVector(up, 24), lookC = base.clone().addScaledVector(up, 1.5);
      const qc = new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(Pc, lookC, up));
      run = { ...opts, B, t: 0, base, up, P0, look0, Pc, qc, erased: false, sounds: {} };
      audio.laserZap && audio.laserZap();
    },
    /** Avança a sequência. Retorna false quando terminou. */
    update(dt) {
      if (!run) return false;
      const r = run, B = r.B; r.t += dt; const t = r.t;
      // ---- raio no bairro ----
      if (t < T_SKY) {
        const tip = L * (1 - ease(t / 0.5));               // desce do céu até o ponto atingido
        setBeam(B.thinCore, 0.2, tip, L - tip); setBeam(B.thinGlow, 0.65, tip, L - tip);
        B.hitGlow.visible = t > 0.45; B.hitGlow.scale.setScalar(3 + Math.sin(t * 40) * 0.6); B.hitGlow.position.y = 0.5;
      } else if (t >= T_HOME) {
        B.thinCore.visible = B.thinGlow.visible = false;
        const grow = ease((t - T_HOME) / 0.4), fade = 1 - ease((t - T_FADE) / 0.7), k = grow * fade;
        B.bigCore.visible = B.bigNeon.visible = B.outer.visible = k > 0.001;
        setBeam(B.bigCore, 0.9 * k + 0.01); setBeam(B.bigNeon, 1.9 * k + 0.01); setBeam(B.outer, B.outerR * (0.3 + 0.7 * grow) * (0.6 + 0.4 * fade));
        if (B.rect) { const f = (0.3 + 0.7 * grow) * (0.6 + 0.4 * fade); B.outer.scale.x = B.rect.w / 2 * f + 0.05; B.outer.scale.z = B.rect.d / 2 * f + 0.05; }
        B.outer.material.opacity = 0.32 * k; B.bigNeon.material.opacity = 0.9 * k;
        B.bigNeon.scale.x = B.bigNeon.scale.z = 1.9 * k * (1 + Math.sin(t * 50) * 0.08) + 0.01;
        B.hitGlow.visible = k > 0.01; B.hitGlow.scale.setScalar(12 * k); B.hitGlow.material.opacity = k;
        if (!r.sounds.blast) { r.sounds.blast = true; audio.laserBlast && audio.laserBlast(); }
        if (!r.erased && t >= T_ERASE) { r.erased = true; r.onErase && r.onErase(); }
      }
      // ---- cena espacial ----
      if (t >= T_SKY && t < T_HOME) {
        const C = S.camera, u = t - T_SKY;
        let cam, look;
        const thick = 1 + 3 * ease((u - 13) / 2.6);       // na volta, o laser engrossa
        if (u < 10) {                                      // afastamento acelerado
          const d = 40 * Math.pow(2.4e7 / 40, Math.pow(u / 10, 1.7));
          cam = S.T.clone().addScaledVector(S.D, 0.25 * d).addScaledVector(S.W, 0.95 * d).addScaledVector(S.G2, 0.2 * d);
          look = S.T.clone().addScaledVector(S.D, 0.3 * d);
          r.camA = cam.clone(); r.lookA = look.clone();
        } else if (u < 13) {                               // aproxima do satélite
          const k = ease((u - 10) / 1.7), A = r.camA || cam, la = r.lookA || look;
          const dirA = A.clone().sub(S.SAT), dA = dirA.length(); dirA.divideScalar(dA);
          const dirC = S.W.clone().multiplyScalar(0.9).addScaledVector(S.D, 0.45).addScaledVector(S.G2, 0.3).normalize();
          const dd = Math.exp(Math.log(dA) + (Math.log(20) - Math.log(dA)) * k);
          cam = S.SAT.clone().addScaledVector(dirA.lerp(dirC, k).normalize(), dd);
          const toSat = S.SAT.clone().sub(cam), ds = toSat.length(), toLa = la.clone().sub(cam).normalize();
          look = cam.clone().addScaledVector(toLa.lerp(toSat.divideScalar(ds), ease(k * 1.5)).normalize(), ds);   // a mira passa da galáxia para o satélite
          if (!r.sounds.charge && u > 11.5) { r.sounds.charge = true; audio.laserCharge && audio.laserCharge(); }
        } else {                                           // volta pelo raio até a Terra
          const k = clamp01((u - 13) / 2.6), s = Math.exp(Math.log(5e6) + (Math.log(26) - Math.log(5e6)) * Math.pow(k, 0.85));
          cam = S.T.clone().addScaledVector(S.D, s).addScaledVector(S.W, 0.14 * s).addScaledVector(S.G2, 0.06 * s);
          look = S.T.clone();
        }
        C.position.copy(cam); C.up.copy(S.G2); C.lookAt(look);
        const dl = cam.distanceTo(look);
        C.near = Math.max(0.05, Math.min(dl, cam.distanceTo(S.SAT), cam.distanceTo(S.T)) * 0.0008); C.far = Math.max(6000, dl * 600); C.updateProjectionMatrix();
        // planetas, Sol e farol do satélite: maiores conforme a câmera se afasta (continuam legíveis)
        for (const p of S.planets) { const dp = cam.distanceTo(p.m.position); const sc = Math.max(p.r, dp * 0.006); p.earth ? p.m.scale.setScalar(sc / 10) : p.m.scale.setScalar(sc); }
        { const ds = cam.distanceTo(S.sun.position); S.sun.scale.setScalar(Math.max(120, ds * 0.012)); S.sunGlow.scale.setScalar(Math.max(900, ds * 0.08)); }
        S.sky.position.copy(cam); S.sky.scale.setScalar(C.far * 0.5);
        // espessura do raio: proporcional à distância entre a câmera e o raio (sempre perceptível)
        _v.copy(cam).sub(S.T); const along = Math.max(0, Math.min(S.beamLen, _v.dot(S.D))), perp = Math.max(1, _v.addScaledVector(S.D, -along).length());
        const rr = Math.max(0.12, perp * 0.0028) * thick;
        S.beamCore.scale.set(rr * 0.45, S.beamLen, rr * 0.45); S.beamGlow.scale.set(rr * 1.3, S.beamLen, rr * 1.3);
        S.beamGlow.material.opacity = 0.5 + 0.3 * (thick - 1) / 3;
        S.hit.scale.setScalar(4 + 3 * thick);
        // mecanismos do satélite (cada vez mais rápidos perto do disparo)
        const sp = 1 + 8 * ease((u - 10) / 3) + 6 * ease((u - 13) / 1);
        S.ring.rotation.z += dt * 2.2 * sp; S.ring2.rotation.z -= dt * 3.1 * sp; S.ring2.rotation.x = Math.sin(t * 1.7) * 0.4;
        for (const a of S.arms) { a.arm.rotation.y = a.s * Math.sin(t * 2.4 * sp * 0.3) * 0.35; a.panel.rotation.x += dt * 1.5 * sp; }
        S.prongs.forEach((p, i) => { p.rotation.z += dt * (i % 2 ? -2 : 2) * sp; p.children[0].rotation.x = 0.35 + Math.sin(t * 6 + i) * 0.25 * ease((u - 11) / 2); });
        const charge = ease((u - 11) / 4);
        S.emitter.scale.setScalar(1 + charge * 1.2 + Math.sin(t * 30) * 0.1 * charge); S.emGlow.scale.setScalar(5 + charge * 14);
      }
      if (t >= T_END) { const done = r.onEnd; r.B.g.parent && r.B.g.parent.remove(r.B.g); run = null; done && done(); return false; }
      return true;
    },
    /** Câmera do jogo nas partes do bairro (0–3 s e 19–23 s). Chamar depois de rig.update (para voltar suave à pose dela). */
    applyCamera(cam) {
      if (!run) return;
      const r = run, t = r.t;
      if (t < T_SKY) {                                     // larga a van e sobe seguindo o raio
        const k = ease((t - 0.3) / 0.6), h = 900 * Math.pow(ease((t - 0.7) / 2.3), 1.6);
        const look = r.look0.clone().lerp(r.base, k).addScaledVector(r.up, h);
        cam.position.copy(r.P0); cam.up.copy(r.up); cam.lookAt(look); cam.up.set(0, 1, 0);
      } else if (t >= T_HOME) {
        const k = ease((t - T_CAM) / (T_END - T_CAM - 0.05));
        const rigPos = cam.position.clone(), rigQ = cam.quaternion.clone();
        cam.position.copy(r.Pc).lerp(rigPos, k); cam.quaternion.copy(r.qc).slerp(rigQ, k);
      }
      if (cam.far < 1500) { cam.far = 1600; cam.updateProjectionMatrix(); }
    },
    /** Para tudo (partida nova / troca de bairro). */
    cancel() { if (run) { run.B.g.parent && run.B.g.parent.remove(run.B.g); run = null; } },
    get time() { return run ? run.t : -1; },
  };
}
