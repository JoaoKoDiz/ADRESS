// Acabamento especial da igreja só na montagem de "The Third Sanctuary" (Bairro 24, segundos 9–25).
// Mesma igreja, mesma geometria: só luz, materiais e pós-processamento.
//  · Pedra: variação de tom em baixa/alta frequência, fiadas e juntas sutis, bloco a bloco (shader com uCine; 0 = igual a antes).
//  · Madeira dos bancos: veio leve. Vitrais: cores mais profundas e acesas.
//  · Fora: luz-chave dourada de cima/esquerda com sombra suave (só a igreja), abertura clara nas nuvens e feixes discretos.
//  · Dentro: luz colorida dos vitrais no chão e nas colunas (SpotLight com textura + sombra), feixes volumétricos
//    discretos, poeira finíssima, foco no altar com 2 castiçais.
//  · Pós: MSAA, oclusão ambiente (GTAO), bloom contido, tone mapping de sempre (OutputPass).
// Tudo é preparado antes (prepare: luzes com intensidade 0 já na cena, shaders compilados) e, no fim (off), volta ao
// normal sem recompilar nada: intensidades 0, objetos escondidos, uCine 0, composer desligado.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const CINE = { value: 0 };
const STONE = ['stone', 'stone2', 'stone3', 'shade', 'iStone', 'iStone2', 'iShade', 'iRib', 'iLight', 'iFloor'];
const GLASS = ['gR', 'gB', 'gG', 'gV', 'gP'];

const NOISE = `
uniform float uCine; varying vec3 vCW;
float cH3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cN3(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cH3(i), cH3(i + vec3(1, 0, 0)), f.x), mix(cH3(i + vec3(0, 1, 0)), cH3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(cH3(i + vec3(0, 0, 1)), cH3(i + vec3(1, 0, 1)), f.x), mix(cH3(i + vec3(0, 1, 1)), cH3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
`;
const STONE_FRAG = `
if (uCine > 0.001) {
  vec3 P = vCW, N = normalize(cross(dFdx(P), dFdy(P)));
  float big = cN3(P * 0.16) * 0.6 + cN3(P * 0.5) * 0.4, fine = cN3(P * 3.3) * 0.55 + cN3(P * 9.0) * 0.45;
  float cy = P.y / 0.62, row = floor(cy), fy = abs(fract(cy) - 0.5);
  float along = abs(N.x) > abs(N.z) ? P.z : P.x, bx = along / 1.25 + row * 0.5, fx = abs(fract(bx) - 0.5);
  float vert = 1.0 - abs(N.y);
  float mortar = max(smoothstep(0.455, 0.495, fy), smoothstep(0.47, 0.497, fx)) * vert;
  float blk = cH3(vec3(row, floor(bx), 3.7));
  vec3 tone = mix(vec3(0.97, 0.99, 1.02), vec3(1.04, 1.0, 0.93), blk);          // blocos um pouco mais quentes ou mais frios
  vec3 k = tone * (0.88 + 0.16 * big + 0.07 * (fine - 0.5)) * (1.0 - 0.14 * mortar);
  diffuseColor.rgb *= mix(vec3(1.0), k, uCine);
}`;
const WOOD_FRAG = `
if (uCine > 0.001) {
  vec3 P = vCW;
  float g = cN3(vec3(P.x * 0.35, P.y * 16.0, P.z * 16.0)) * 0.6 + cN3(vec3(P.x * 1.4, P.y * 40.0, P.z * 40.0)) * 0.4;
  diffuseColor.rgb *= mix(1.0, 0.82 + 0.34 * g, uCine);
}`;
function patch(m, frag) {
  m.onBeforeCompile = sh => {
    sh.uniforms.uCine = CINE;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + frag);
  };
  m.customProgramCacheKey = () => 'churchCine:' + (frag === WOOD_FRAG ? 'w' : 's');
  m.needsUpdate = true;
}

// ---------- texturas procedurais ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const glassMap = () => canvasTex(128, 128, (g, w, h) => {                 // o desenho do vitral projetado (quadradinhos com chumbo)
  const cols = ['#c8414f', '#3f6fd0', '#e0b04a', '#4e9a62', '#8a62c8'];
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const r = 46, cx = 64, cy = 64;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const px = 12 + x * 13.2, py = 12 + y * 13.2; if (Math.hypot(px + 5 - cx, py + 5 - cy) > r) continue;
    g.fillStyle = cols[(x * 2 + y * 3) % 5]; g.fillRect(px, py, 10.5, 10.5);
  }
  g.globalCompositeOperation = 'source-over'; g.filter = 'blur(1.5px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
});
const skyTex = () => canvasTex(512, 256, (g, w, h) => {                   // nuvens cinzentas com uma abertura clara e dourada
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h, r = 18 + rnd() * 60, v = 150 + rnd() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${v},${v + 6},${v + 12},0.22)`); gr.addColorStop(1, `rgba(${v},${v + 6},${v + 12},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const ox = w * 0.3, oy = h * 0.28;
  let gr = g.createRadialGradient(ox, oy, 0, ox, oy, 120); gr.addColorStop(0, 'rgba(255,248,226,0.95)'); gr.addColorStop(0.35, 'rgba(255,232,180,0.55)'); gr.addColorStop(1, 'rgba(255,225,170,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  gr = g.createRadialGradient(ox, oy, 0, ox, oy, 40); gr.addColorStop(0, 'rgba(255,255,250,0.9)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // borda: some no cinza do céu
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const e = Math.min(x, w - 1 - x, y, h - 1 - y) / 60; d[(y * w + x) * 4 + 3] *= Math.min(1, e); }
  g.putImageData(id, 0, 0);
});
const glowTex = () => canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,205,1)'); gr.addColorStop(0.3, 'rgba(255,214,150,0.45)'); gr.addColorStop(1, 'rgba(255,200,130,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });

// feixe de luz: cone aberto, aditivo, some nas pontas e nas bordas (depende do ângulo de visão)
function beamMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOp: { value: 0 } },
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOp; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y) * e * uOp; gl_FragColor = vec4(uColor * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
  });
}
function beamBetween(a, b, r0, r1, mat) {                                   // cone de a (estreito) até b (largo)
  const v = new THREE.Vector3().subVectors(b, a), L = v.length();
  const geo = new THREE.CylinderGeometry(r0, r1, L, 16, 1, true); geo.translate(0, -L / 2, 0); geo.rotateX(-Math.PI / 2);   // ponta em 0, abre para +z... (uv.y 1 → 0 ao longo)
  const m = new THREE.Mesh(geo, mat); m.position.copy(a); m.lookAt(b); m.frustumCulled = false; m.renderOrder = 5; return m;
}

const at = (m, y) => { m.position.y = y; return m; };
export function createChurchCine(renderer) {
  let S = null;                                     // estado preparado (cena, igreja, objetos, materiais salvos)
  let mode = null;

  function prepare(scene, church, camera, world) {
    if (S && S.scene === scene && S.church === church) return;
    if (S) release();
    const W = (x, y, z) => church.localToWorld(new THREE.Vector3(x, y, z));
    church.updateMatrixWorld(true);
    const mats = church.userData.matByKey || {};
    for (const k of STONE) if (mats[k] && !mats[k].userData.cine) { patch(mats[k], STONE_FRAG); mats[k].userData.cine = 1; }
    if (mats.pew && !mats.pew.userData.cine) { patch(mats.pew, WOOD_FRAG); mats.pew.userData.cine = 1; }
    const saved = { mats: Object.entries(mats).map(([k, m]) => [m, m.emissiveIntensity, m.roughness]) };
    const grp = new THREE.Group(); grp.name = 'church-cine'; scene.add(grp);
    const lights = [];
    // --- fora: luz-chave dourada (sombra só na área da igreja) ---
    const key = new THREE.DirectionalLight('#ffe4b8', 0); key.position.copy(W(-85, 150, 70)); key.target.position.copy(W(0, 28, -18));
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.06;
    Object.assign(key.shadow.camera, { left: -70, right: 70, top: 75, bottom: -75, near: 10, far: 420 }); key.shadow.camera.updateProjectionMatrix();
    key.shadow.autoUpdate = false; grp.add(key, key.target); lights.push(key);
    // céu: abertura nas nuvens (atrás e acima, no alto à esquerda do quadro) e feixes descendo sobre a fachada
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex(), transparent: true, depthWrite: false, fog: false, opacity: 0, toneMapped: false });
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(620, 310), skyMat); sky.position.copy(W(-20, 120, -320)); sky.quaternion.copy(church.quaternion); sky.renderOrder = -1; grp.add(sky);
    const rayMat = beamMat('#fff1cf'), rays = [];
    for (const [x0, x1, w0, w1] of [[-70, -12, 4, 16], [-58, 2, 3, 12], [-84, -24, 5, 20], [-46, 14, 2, 9]]) { const r = beamBetween(W(x0, 175, 20), W(x1, 8, 14), w0, w1, rayMat); grp.add(r); rays.push(r); }
    // --- dentro: luz dos vitrais (lado +x), feixes, poeira, altar ---
    const gMap = glassMap(), spots = [], beams = [], inMat = beamMat('#ffe6c4');
    for (const zc of [-16.1, -22.3, -28.5, -34.7]) {
      const s = new THREE.SpotLight('#fff0dc', 0, 34, 0.42, 0.55, 1.3);
      s.position.copy(W(11.1, 8.4, zc + 1.2)); s.target.position.copy(W(2.6, 0, zc - 2.6)); s.map = gMap;
      s.castShadow = true; s.shadow.mapSize.set(512, 512); s.shadow.bias = -0.0006; s.shadow.radius = 3; s.shadow.camera.near = 0.5; s.shadow.autoUpdate = false;
      grp.add(s, s.target); spots.push(s); lights.push(s);
      const bm = beamBetween(W(11.4, 8.6, zc + 1.4), W(2.6, 0.05, zc - 2.6), 0.7, 2.3, inMat); grp.add(bm); beams.push(bm);
    }
    const alt = new THREE.SpotLight('#ffd9a8', 0, 40, 0.3, 0.9, 1.4); alt.position.copy(W(0, 18.5, -34)); alt.target.position.copy(W(0, 1.4, -42));
    alt.castShadow = true; alt.shadow.mapSize.set(1024, 1024); alt.shadow.bias = -0.0005; alt.shadow.radius = 4; alt.shadow.autoUpdate = false; grp.add(alt, alt.target); lights.push(alt);
    const altBeam = beamBetween(W(0, 18.5, -34), W(0, 1.6, -42), 0.5, 2.6, beamMat('#ffe2b4')); grp.add(altBeam); beams.push(altBeam);
    // castiçais de latão com velas acesas, nas pontas da toalha (acabamento coerente com o altar)
    const brass = new THREE.MeshStandardMaterial({ color: '#b8893a', metalness: 0.85, roughness: 0.32 }), wax = new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.6 });
    const flameM = new THREE.MeshBasicMaterial({ color: '#ffd28a', toneMapped: false }), gtex = glowTex(), candles = new THREE.Group(); grp.add(candles);
    const flames = [];
    for (const x of [-1.6, -0.75, 0.75, 1.6]) {
      const c = new THREE.Group(); c.position.copy(W(x, 1.74, -42.05)); c.quaternion.copy(church.quaternion); candles.add(c);
      const tall = Math.abs(x) > 1 ? 0.55 : 0.4;
      c.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.05, 12), brass), 0.025));
      c.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, tall, 8), brass), tall / 2));
      c.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.05, 10), brass), tall));
      c.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 8), wax), tall + 0.18));
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 6), flameM); f.position.set(0, tall + 0.39, 0); c.add(f);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: '#ffcf8a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
      gl.scale.setScalar(0.45); gl.position.set(0, tall + 0.4, 0); c.add(gl); flames.push(f, gl);
    }
    const candleLight = new THREE.PointLight('#ffbf70', 0, 6, 1.6); candleLight.position.copy(W(0, 2.6, -41.6)); grp.add(candleLight); lights.push(candleLight);
    // poeira finíssima nos feixes (pontinhos aditivos, quase parados)
    const N = 800, pos = new Float32Array(N * 3), seed = new Float32Array(N), tmp = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const b = beams[i % beams.length], a = b.position, t = 0.15 + Math.random() * 0.8;
      const L = b.geometry.parameters.height, dir = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quaternion);
      const r = (b.geometry.parameters.radiusTop + (b.geometry.parameters.radiusBottom - b.geometry.parameters.radiusTop) * t) * Math.sqrt(Math.random()) * 0.9;
      const ang = Math.random() * Math.PI * 2, side = new THREE.Vector3(1, 0, 0).applyQuaternion(b.quaternion), up = new THREE.Vector3(0, 1, 0).applyQuaternion(b.quaternion);
      tmp.copy(a).addScaledVector(dir, t * L).addScaledVector(side, Math.cos(ang) * r).addScaledVector(up, Math.sin(ang) * r);
      pos.set([tmp.x, tmp.y, tmp.z], i * 3); seed[i] = Math.random() * 100;
    }
    const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustMat = new THREE.PointsMaterial({ color: '#fff3dc', size: 0.025, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; grp.add(dust);
    const base = pos.slice();
    // --- pós-processamento ---
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt); composer.setPixelRatio(1); composer.setSize(size.x, size.y);
    const rp = new RenderPass(scene, camera); composer.addPass(rp);
    const ao = new GTAOPass(scene, camera, size.x, size.y); ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.85; composer.addPass(ao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.35, 0.55, 0.82); composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // a oclusão ambiente não deve "ver" o que é só luz (céu, feixes, brilhos): ficam fora da passada de normais/profundidade
    const fxOnly = [sky, ...rays, ...beams, ...flames.filter(o => o.isSprite)];
    const aoRender = ao.render.bind(ao);
    ao.render = (...a) => { const v = fxOnly.map(o => o.visible); fxOnly.forEach(o => { o.visible = false; }); try { aoRender(...a); } finally { fxOnly.forEach((o, i) => { o.visible = v[i]; }); } };
    const hemi = scene.children.find(o => o.isHemisphereLight);
    S = { scene, church, camera, world, grp, lights, key, spots, alt, candleLight, candles, flames, sky, skyMat, rays, rayMat, beams, inMat, altBeam, dust, dustMat, base, seed, mats, saved,
      composer, rt, rp, ao, bloom, hemi, hemi0: hemi && [hemi.intensity, hemi.color.clone(), hemi.groundColor.clone()], sun: world && world.sunLight, sun0: world && world.sunLight && world.sunLight.intensity,
      fog0: scene.fog && [scene.fog.near, scene.fog.far], size: size.clone(), t: 0 };
    grp.visible = true; candles.visible = true;
    renderer.compile(scene, camera);                         // tudo compilado agora (os shaders da pedra e as luzes novas), nada no corte
    try { composer.render(0); } catch (e) { /* (sem WebGL2: segue sem pós) */ }
    off();
  }

  /** 'ext' (fachada), 'int' (dentro) ou null (jogo normal). T = tempo da montagem, para a poeira e as velas. */
  function set(m, dt = 0) {
    if (!S) return;
    if (m !== mode) {
      const was = mode; mode = m;
      if (!m) { off(); return; }
      const ext = m === 'ext';
      CINE.value = 1;
      S.grp.visible = true;
      for (const [mt, e0, r0] of S.saved.mats) {
        const k = Object.keys(S.mats).find(kk => S.mats[kk] === mt) || '';
        if (GLASS.includes(k)) mt.emissiveIntensity = ext ? 0.85 : 1.55;
        else if (k[0] === 'i') { mt.emissiveIntensity = 0.03; mt.roughness = 0.78; }
        else if (STONE.includes(k)) { mt.emissiveIntensity = 0.1; mt.roughness = 0.72; }
        else if (k === 'pew') { mt.roughness = 0.55; mt.emissiveIntensity = e0; }
        else mt.emissiveIntensity = e0;
      }
      S.key.intensity = ext ? 3.1 : 0;
      for (const s of S.spots) s.intensity = ext ? 0 : 260;
      S.alt.intensity = ext ? 0 : 520; S.candleLight.intensity = ext ? 0 : 3.2;
      S.skyMat.opacity = ext ? 1 : 0; S.rayMat.uniforms.uOp.value = ext ? 0.05 : 0;
      S.inMat.uniforms.uOp.value = ext ? 0 : 0.085; S.altBeam.material.uniforms.uOp.value = ext ? 0 : 0.07; S.dustMat.opacity = ext ? 0 : 0.32;
      S.candles.visible = !ext;
      if (S.hemi) { S.hemi.intensity = ext ? 1.65 : 0.62; S.hemi.color.set(ext ? '#f2eee6' : '#d9cdb8'); S.hemi.groundColor.set(ext ? '#8a8068' : '#5a4a3a'); }
      if (S.sun) S.sun.intensity = ext ? 0.55 : 0.15;
      if (S.scene.fog) { S.scene.fog.near = ext ? 70 : 2000; S.scene.fog.far = ext ? 780 : 2400; }
      S.ao.blendIntensity = ext ? 0.75 : 0.95;
      S.ao.updateGtaoMaterial({ radius: ext ? 2.2 : 1.1, distanceExponent: 1.4, thickness: ext ? 3 : 1.5, scale: 1, samples: 16 });
      S.bloom.strength = ext ? 0.32 : 0.48; S.bloom.radius = 0.6; S.bloom.threshold = ext ? 0.86 : 0.74;
      if (!was) for (const l of S.lights) if (l.castShadow) l.shadow.needsUpdate = true;   // as sombras (cena parada) só uma vez
      if (was === 'ext' || was === 'int') for (const l of S.lights) if (l.castShadow) l.shadow.needsUpdate = true;
    }
    // vida discreta: poeira subindo e descendo devagar, chama das velas
    S.t += dt;
    if (m === 'int') {
      const p = S.dust.geometry.attributes.position.array, t = S.t;
      for (let i = 0; i < p.length / 3; i++) { const s = S.seed[i]; p[i * 3] = S.base[i * 3] + Math.sin(t * 0.13 + s) * 0.12; p[i * 3 + 1] = S.base[i * 3 + 1] + Math.sin(t * 0.09 + s * 1.7) * 0.18; p[i * 3 + 2] = S.base[i * 3 + 2] + Math.cos(t * 0.11 + s) * 0.12; }
      S.dust.geometry.attributes.position.needsUpdate = true;
      for (let i = 0; i < S.flames.length; i += 2) { const k = 1 + 0.08 * Math.sin(t * 9 + i) + 0.05 * Math.sin(t * 23 + i * 2); S.flames[i].scale.set(1, k, 1); S.flames[i + 1].material.opacity = 0.62 + 0.1 * Math.sin(t * 7 + i); }
    }
  }
  /** Volta tudo ao normal (sem recompilar: as luzes ficam com intensidade 0, os objetos escondidos). */
  function off() {
    mode = null; CINE.value = 0;
    if (!S) return;
    for (const [mt, e0, r0] of S.saved.mats) { mt.emissiveIntensity = e0; mt.roughness = r0; }
    for (const l of S.lights) l.intensity = 0;
    S.grp.visible = false;
    if (S.hemi0) { S.hemi.intensity = S.hemi0[0]; S.hemi.color.copy(S.hemi0[1]); S.hemi.groundColor.copy(S.hemi0[2]); }
    if (S.sun) S.sun.intensity = S.sun0;
    if (S.fog0 && S.scene.fog) { S.scene.fog.near = S.fog0[0]; S.scene.fog.far = S.fog0[1]; }
  }
  /** Tira tudo da cena (numa troca de partida/bairro, com a tela preta). */
  function release() {
    if (!S) return;
    off();
    S.scene.remove(S.grp);
    S.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } if (o.isLight && o.shadow && o.shadow.map) o.shadow.map.dispose(); });
    S.composer.dispose(); S.rt.dispose(); S.ao.dispose && S.ao.dispose();
    S = null;
  }
  return {
    prepare, set, off, release,
    get active() { return !!mode; },
    get ready() { return !!S; },
    /** Desenha o quadro (com o pós-processamento) durante a montagem. */
    render(scene, camera) {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      if (!S.size.equals(size)) { S.size.copy(size); S.composer.setSize(size.x, size.y); S.ao.setSize(size.x, size.y); }
      S.rp.camera = camera; S.ao.camera = camera;
      S.composer.render();
    },
  };
}
