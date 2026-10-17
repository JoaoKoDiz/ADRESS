// Nível 19 (Bairro Penumbra): o bairro do Fluxo (10×10, avenida central, trânsito) sempre à noite.
//  - luz: céu escuro, lua azulada, ambiente mínimo; asfalto "molhado" (mais liso e escuro) com reflexos coloridos simples no chão;
//  - postes nas esquinas dos lotes, vitrines acesas nas lojas, letreiros nas lojas e painéis luminosos (marcas fictícias e ADRESS):
//    grandes na avenida e no cruzamento central (paredes de trás/laterais dos prédios e outdoors nas pracinhas), poucos nas ruas
//    menores; alguns alternam 2–3 anúncios devagar ou têm um letreiro correndo. Nunca na frente/topo das construções (pistas).
//  - apagões: de tempos em tempos uma região (3×3 regiões) apaga postes, anúncios e vitrines por ~8 s e volta aos poucos;
//  - faróis da van (2 luzes) e uma luz fraca em volta do personagem a pé.
import * as THREE from 'three';
import { GRID, LOT, WALK, slotOrigin, GAS_LIST, WARE_LIST, FLUX } from './layout.js';
import { HOUSES } from './data.js';
import { disposeTree } from './models/kit.js';

const ADS = [
  { t: 'ADRESS', s: 'Entregas que chegam (quase sempre)', bg: ['#ff7a1a', '#c84a00'], fg: '#fff3d6', sym: 'box' },
  { t: 'ADRESS', s: 'Errou a casa? A gente volta!', bg: ['#2b1a0e', '#5a3010'], fg: '#ff9a3a', sym: 'van' },
  { t: 'NEBULA COLA', s: 'Gelada como o espaço', bg: ['#d81e3a', '#7a0a1e'], fg: '#ffffff', sym: 'star' },
  { t: 'PIZZA ROMA', s: 'Saindo do forno 24h', bg: ['#f2c14a', '#c8602a'], fg: '#3a1a0a', sym: 'pizza' },
  { t: 'CINE ESTRELA', s: 'Hoje: O Carteiro Perdido', bg: ['#2a1a5a', '#0a0a2a'], fg: '#ffd84a', sym: 'star' },
  { t: 'PANDA SUSHI', s: 'Peça já', bg: ['#1a1a1a', '#3a3a3a'], fg: '#ffffff', sym: 'circle' },
  { t: 'LUMI TV', s: 'Mais cores por pixel', bg: ['#1aa8c8', '#0a4a8a'], fg: '#ffffff', sym: 'tv' },
  { t: 'BURGER BOOM', s: 'Duplo, triplo, BOOM', bg: ['#ffcf3a', '#e8541a'], fg: '#4a1a0a', sym: 'circle' },
  { t: 'SONO BOM', s: 'Colchões que abraçam', bg: ['#6a4ac8', '#2a1a6a'], fg: '#f4ecff', sym: 'moon' },
  { t: 'CAFÉ LUA', s: 'Aberto até o sol nascer', bg: ['#4a2a1a', '#1a0a04'], fg: '#ffd9a0', sym: 'moon' },
  { t: 'TÁXI JÁ', s: 'Chama que a gente vem', bg: ['#f4d020', '#c8a000'], fg: '#1a1a1a', sym: 'circle' },
  { t: 'BANCO ARCO', s: 'Seu dinheiro em boas mãos', bg: ['#1a7a5a', '#0a3a2a'], fg: '#e8fff4', sym: 'arc' },
  { t: 'ADRESS', s: 'Quase no endereço certo', bg: ['#ff7a1a', '#7a2a00'], fg: '#ffffff', sym: 'van' },
  { t: 'MERCADO BOM PREÇO', s: 'Aberto 24 horas', bg: ['#2a8a3a', '#0a4a1a'], fg: '#fff8c0', sym: 'circle' },
  { t: 'VANS VELOZ', s: 'Alugue a sua hoje', bg: ['#2a4ac8', '#0a1a6a'], fg: '#ffffff', sym: 'van' },
  { t: 'LAVA-JATO BRILHO', s: 'Sua van brilhando', bg: ['#1ac8c8', '#0a6a7a'], fg: '#ffffff', sym: 'star' },
];
const SIGNS = ['ABERTO', 'LOJA', 'FARMÁCIA', 'LANCHES', 'BAR', 'MODAS', 'ÓTICA', 'SORVETES'];
const NEON = ['#ff4ad8', '#4ae8ff', '#ffd84a', '#7aff6a', '#ff6a4a'];

const texCache = new Map();
function adTexture(ad, vertical) {
  const key = ad.t + ad.s + (vertical ? 'v' : 'h');
  if (texCache.has(key)) return texCache.get(key);
  const w = vertical ? 256 : 512, h = vertical ? 512 : 256, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, ad.bg[0]); gr.addColorStop(1, ad.bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = ad.fg; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = ad.fg; g.strokeStyle = ad.fg; g.lineWidth = 7;
  const sx = vertical ? w / 2 : 90, sy = vertical ? 130 : h / 2, R = 50;                       // símbolo simples
  g.beginPath();
  if (ad.sym === 'star') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? R * 0.45 : R; g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); } g.closePath(); g.fill(); }
  else if (ad.sym === 'box') { g.fillRect(sx - R, sy - R * 0.7, R * 2, R * 1.4); g.fillStyle = ad.bg[1]; g.fillRect(sx - 8, sy - R * 0.7, 16, R * 1.4); }
  else if (ad.sym === 'van') { g.fillRect(sx - R, sy - R * 0.5, R * 1.5, R); g.fillRect(sx + R * 0.5, sy - R * 0.2, R * 0.6, R * 0.7); g.fillStyle = ad.bg[1]; for (const dx of [-R * 0.55, R * 0.6]) { g.beginPath(); g.arc(sx + dx, sy + R * 0.55, 13, 0, 7); g.fill(); } }
  else if (ad.sym === 'pizza') { g.moveTo(sx, sy - R); g.lineTo(sx + R * 0.9, sy + R * 0.7); g.lineTo(sx - R * 0.9, sy + R * 0.7); g.closePath(); g.fill(); }
  else if (ad.sym === 'tv') { g.strokeRect(sx - R, sy - R * 0.7, R * 2, R * 1.3); g.moveTo(sx - 20, sy - R * 1.1); g.lineTo(sx, sy - R * 0.7); g.lineTo(sx + 20, sy - R * 1.1); g.stroke(); }
  else if (ad.sym === 'moon') { g.arc(sx, sy, R, 0, 7); g.fill(); g.fillStyle = ad.bg[0]; g.beginPath(); g.arc(sx + 22, sy - 12, R * 0.85, 0, 7); g.fill(); }
  else if (ad.sym === 'arc') { g.arc(sx, sy + R * 0.5, R, Math.PI, 0); g.stroke(); }
  else { g.arc(sx, sy, R * 0.8, 0, 7); g.fill(); }
  g.fillStyle = ad.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const fit = (txt, max, size) => { let s = size; do { g.font = `900 ${s}px "Trebuchet MS", sans-serif`; s -= 2; } while (g.measureText(txt).width > max && s > 12); };
  if (vertical) {
    const words = ad.t.split(' ');
    words.forEach((wd, i) => { fit(wd, w - 40, 64); g.fillText(wd, w / 2, 260 + i * 66); });
    fit(ad.s, w - 30, 24); g.font = g.font.replace('900', '700'); g.fillText(ad.s.length > 18 ? ad.s.slice(0, 18) + '…' : ad.s, w / 2, 460);
  } else {
    fit(ad.t, w - 200, 76); g.fillText(ad.t, (w + 150) / 2, h / 2 - 28);
    fit(ad.s, w - 200, 30); g.font = g.font.replace('900', '700'); g.fillText(ad.s, (w + 150) / 2, h / 2 + 46);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}
function signTexture(txt, col) {
  const key = 'sign' + txt + col; if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#120a14'; g.fillRect(0, 0, 512, 128); g.shadowColor = col; g.shadowBlur = 22; g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 6;
  g.strokeRect(10, 10, 492, 108); g.font = '900 72px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(key, t); return t;
}
function tickerTexture() {
  const key = 'ticker'; if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = 1024; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, 1024, 64); g.fillStyle = '#ffb02a'; g.font = '900 40px "Trebuchet MS", sans-serif'; g.textBaseline = 'middle';
  g.fillText('★ ADRESS: sua encomenda está a caminho ★ PIZZA ROMA 24h ★ NEBULA COLA ★ CINE ESTRELA ★', 10, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(0.5, 1); texCache.set(key, t); return t;
}
function glowTex() {
  if (texCache.has('glow')) return texCache.get('glow');
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set('glow', t); return t;
}

const REGIONS = 9;
const WIN_GEO = new THREE.PlaneGeometry(1.0, 0.9);
const regionOf = (x, z, M) => Math.min(2, Math.floor(x / M * 3)) * 3 + Math.min(2, Math.floor(z / M * 3));

export function createNight() {
  let world = null, root = null, M = 1, t = 0;
  const regions = [...Array(REGIONS)].map(() => ({ k: 1, mats: [], sprites: [] }));
  let blackout = null, nextBlackout = 14;
  const panels = [];                                 // { mats:[…], ads, cur, timer, mesh }
const POLE_GEO = new THREE.CylinderGeometry(0.11, 0.14, 5.6, 6), POLE_MAT = new THREE.MeshStandardMaterial({ color: '#3a3d46', roughness: 0.6 });
  const BULB_GEO = new THREE.SphereGeometry(0.36, 8, 6); POLE_GEO.userData.keep = POLE_MAT.userData.keep = BULB_GEO.userData.keep = true;
  const poles = [];                                  // postes da composição atual (main.js: obstáculos de quem anda a pé)
  const lights = [];                                 // fontes de luz (postes, painéis, letreiros): as mais perto viram luz de verdade
  const pool = [...Array(12)].map(() => new THREE.PointLight('#ffffff', 0, 34, 1.3));   // poucas luzes dinâmicas (sempre as mesmas 12)
  let ticker = null;
  // faróis da van e luz do personagem (criados uma vez; só ligados no Penumbra)
  const heads = [], walkLight = new THREE.PointLight('#ffe2b0', 6, 9, 1.6);
  walkLight.visible = false;

  const winMats = {};                               // janelas acesas: 1 material por região e cor (apagam juntas)
  const winMat = (r, c) => winMats[r + c] || (winMats[r + c] = reg(r, new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.85 })));
  const reg = (r, m) => { regions[r].mats.push(m); m.userData.base = (m.color && m.color.clone()) || null; m.userData.op = m.opacity; return m; };

  function addLamp(x, z) {
    poles.push({ x0: x - 0.15, x1: x + 0.15, z0: z - 0.15, z1: z + 0.15, r: 0.15, cx: x, cz: z });   // (colisão a pé)
    const r = regionOf(x, z, M), pole = new THREE.Mesh(POLE_GEO, POLE_MAT);   // (geometria/material únicos para todos os postes)
    pole.position.set(x, 2.8, z); root.add(pole);
    const bulb = new THREE.Mesh(BULB_GEO, reg(r, new THREE.MeshBasicMaterial({ color: '#ffe0a0', toneMapped: false })));
    bulb.position.set(x, 5.25, z); root.add(bulb);
    const sp = new THREE.Sprite(reg(r, new THREE.SpriteMaterial({ map: glowTex(), color: '#ffc870', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })));
    sp.scale.setScalar(4.2); sp.position.copy(bulb.position); root.add(sp);
    groundGlow(x, z, '#ffc878', 17, 0.6, r);                          // poça de luz na rua e na calçada
    groundGlow(x, z, '#fff0c8', 6, 0.5, r);
    lights.push({ x, y: 5, z, c: '#ffd59a', i: 30, r });
  }
  const glowMats = new Map(), glowGeos = new Map();                // (poças iguais na mesma região dividem material; tamanhos iguais, geometria)
  function groundGlow(x, z, col, size, op, r, sx = 1, sz = 1) {           // reflexo simples no asfalto molhado
    const gk = size * sx + 'x' + size * sz, mk = r + '|' + col + '|' + op;
    let geo = glowGeos.get(gk); if (!geo) { geo = new THREE.PlaneGeometry(size * sx, size * sz); geo.userData.keep = true; glowGeos.set(gk, geo); }
    let gm = glowMats.get(mk);
    if (!gm) { gm = reg(r, new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glowMats.set(mk, gm); }
    const m = new THREE.Mesh(geo, gm);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); root.add(m);
  }
  /** Painel luminoso: plano com 1–3 anúncios (alternam devagar) virado para (nx, nz). */
  function addPanel(x, y, z, w, h, nx, nz, ads, vertical) {
    const r = regionOf(x, z, M), mat = reg(r, new THREE.MeshBasicMaterial({ map: adTexture(ads[0], vertical), toneMapped: false }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = Math.atan2(nx, nz); root.add(m);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.2), new THREE.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.7 }));
    frame.position.set(x - nx * 0.12, y, z - nz * 0.12); frame.rotation.y = m.rotation.y; root.add(frame);
    if (ads.length > 1) panels.push({ mat, ads, vertical, r, cur: 0, timer: 5 + Math.random() * 4, fade: 0 });
    const gx = x + nx * (h * 0.4 + 3), gz = z + nz * (h * 0.4 + 3);
    groundGlow(gx, gz, ads[0].bg[0], Math.max(w, 6) * 1.6, 0.45, r, Math.abs(nz) > 0.5 ? 1.3 : 0.8, Math.abs(nz) > 0.5 ? 0.8 : 1.3);   // reflexo no asfalto
    lights.push({ x: x + nx * 3, y, z: z + nz * 3, c: ads[0].bg[0], i: 22 + w * h, r });
    return m;
  }
  /** Letreiro perpendicular à fachada (visível de quem passa pela rua), com braço de apoio. */
  function addBlade(x, y, z, ad, r) {
    const mat = reg(r, new THREE.MeshBasicMaterial({ map: adTexture(ad, true), toneMapped: false, side: THREE.DoubleSide }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.6), mat); m.position.set(x, y, z); m.rotation.y = Math.PI / 2; root.add(m);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: '#2a2d34' })); arm.position.set(x, y + 1.35, z - 0.2); root.add(arm);
    lights.push({ x, y, z: z + 1, c: ad.bg[0], i: 8, r });
  }
  /** Marquise iluminada sobre a entrada (luz quente por baixo e no chão). */
  function addMarquee(x, z, w, r) {
    // (usa a marquise que o prédio já tem: 3,4 × 1,6, y 2,62..2,82 — antes uma caixa extra atravessava a sacada do 1º andar)
    const lit = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.3, 1.2), reg(r, new THREE.MeshBasicMaterial({ color: '#ffe2a8', toneMapped: false }))); lit.rotation.x = Math.PI / 2; lit.position.set(x, 2.605, z + 0.8); root.add(lit);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.06), reg(r, new THREE.MeshBasicMaterial({ color: '#ffd070', toneMapped: false }))); edge.position.set(x, 2.72, z + 1.63); root.add(edge);
    groundGlow(x, z + 2.5, '#ffd090', 9, 0.5, r, 1.3, 0.8);
    lights.push({ x, y: 2.6, z: z + 2, c: '#ffd59a', i: 14, r });
  }
  const pickAds = (n, rnd) => { const out = []; while (out.length < n) { const a = ADS[Math.floor(rnd() * ADS.length)]; if (!out.includes(a)) out.push(a); } return out; };

  return {
    poles,
    /** Prepara um mundo do Penumbra (uma vez): luzes da noite e asfalto molhado. */
    setup(w) {
      world = w; const sc = w.scene;
      sc.background = new THREE.Color('#0c1428'); if (sc.fog) sc.fog.color.set('#0c1428');
      if (w.sunLight) { w.sunLight.intensity = 1.25; w.sunLight.color.set('#a8bcff'); }
      const hemi = sc.children.find(o => o.isHemisphereLight); if (hemi) { hemi.intensity = 1.9; hemi.color.set('#8a9ad0'); hemi.groundColor.set('#3a3644'); }   // ambiente azulado: fachadas, portas e pistas legíveis
      const sun = sc.getObjectByName('sun'); if (sun) sun.visible = false;
      sc.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '5d6470') { o.material = o.material.clone(); o.material.color.set('#3a404c'); o.material.roughness = 0.2; o.material.metalness = 0.35; } });
      // estrelinhas
      const N = 500, p = new Float32Array(N * 3); let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) { const v = new THREE.Vector3(rnd() - 0.5, rnd() * 0.6 + 0.15, rnd() - 0.5).normalize().multiplyScalar(1200); p.set([v.x + 100, v.y, v.z + 100], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; sc.add(stars);
    },
    /** Monta postes, vitrines, letreiros e painéis para a composição da partida (game.layout). */
    layout(w, game, MAPW) {
      world = w; M = MAPW;
      if (root) { if (root.parent) root.parent.remove(root); disposeTree(root); }   // (a composição anterior sai da memória)
      root = new THREE.Group(); root.name = 'night'; w.scene.add(root);
      for (const k in winMats) delete winMats[k];
      regions.forEach(r => { r.mats.length = 0; r.k = 1; }); panels.length = 0; lights.length = 0; poles.length = 0; glowMats.clear();
      for (const l of pool) w.scene.add(l); blackout = null; nextBlackout = 12 + Math.random() * 8;
      let sd = 31; const rnd = () => (sd = (sd * 16807 + 7) % 2147483647) / 2147483647;
      const skip = new Set([...GAS_LIST.flatMap(g => g.slots), ...WARE_LIST.flatMap(g => g.slots)]);
      const mid = Math.floor(GRID / 2), ROW = FLUX ? FLUX.row : 5;
      for (let s = 0; s < GRID * GRID; s++) {
        const r = Math.floor(s / GRID), c = s % GRID; if (r === ROW) continue;
        const o = slotOrigin(s);
        if (!skip.has(s)) { addLamp(o.x - WALK * 0.5, o.z - WALK * 0.5); addLamp(o.x + LOT * 0.22, o.z + LOT + WALK * 0.5); }   // postes: esquina do lote e na calçada da frente (longe do portão)
        const h = game.layout[s], H = h >= 0 ? HOUSES[h] : null;
        const nearAve = r === ROW - 1 || r === ROW + 1, central = nearAve && (c === mid - 1 || c === mid);
        if (FLUX && FLUX.parks.includes(s) && (r === ROW + 1 || r === ROW - 2 || r === ROW + 2)) {                    // outdoor grande na pracinha
          const dir = r < ROW ? 1 : -1, z = o.z + (dir > 0 ? LOT - 3 : 3), x = o.x + LOT / 2;
          for (const dx of [-3.4, 3.4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 7, 6), new THREE.MeshStandardMaterial({ color: '#2a2d34' })); pl.position.set(x + dx, 3.5, z); root.add(pl); }
          addPanel(x, 8.8, z, 11, 5.4, 0, dir, pickAds(r === ROW + 1 ? 3 : 2, rnd), false);
        }
        if (!H || skip.has(s)) continue;
        if (H.kind === 'shop') {                                                           // vitrine acesa + letreiro na fachada
          const rg = regionOf(o.x + 8.6, o.z + 9, M);
          const vit = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 2.6), reg(rg, new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
          vit.position.set(o.x + 8.6, 1.5, o.z + 8.66); root.add(vit); vit.material.opacity = vit.material.userData.op = 0.6;
          addBlade(o.x + 13.6, 4.4, o.z + 9.2, pickAds(1, rnd)[0], rg);
          lights.push({ x: o.x + 8.6, y: 2, z: o.z + 11, c: '#ffc880', i: 10, r: rg });
          const col = NEON[Math.floor(rnd() * NEON.length)], sg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), reg(rg, new THREE.MeshBasicMaterial({ map: signTexture(SIGNS[Math.floor(rnd() * SIGNS.length)], col), toneMapped: false })));
          sg.position.set(o.x + 8.6, 5.25, o.z + 8.66); root.add(sg);
          groundGlow(o.x + 8.6, o.z + LOT + 2, '#ffc070', 11, 0.45, rg, 1.4, 0.8);
        } else if (H.kind === 'house') {                                                   // casas: luz da entrada, caminho iluminado e algumas janelas acesas
          const rg = regionOf(o.x + 8.6, o.z + 10, M);
          const lampM = new THREE.Sprite(reg(rg, new THREE.SpriteMaterial({ map: glowTex(), color: '#ffcf80', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.9 })));
          lampM.scale.setScalar(1.8); lampM.position.set(o.x + 9.6, 2.5, o.z + 8.7); root.add(lampM);
          groundGlow(o.x + 8.6, o.z + 11, '#ffd090', 9, 0.42, rg, 0.9, 1.4);
          for (const wx of [5.7, 11.5]) if (rnd() < 0.55) { const pl = new THREE.Mesh(WIN_GEO, winMat(rg, '#ffd890')); pl.position.set(o.x + wx, 1.42, o.z + 8.65); pl.scale.set(1.2, 1.1, 1); root.add(pl); }
        } else if (H.kind === 'apt') {                                                     // prédios: painéis nas paredes de trás/laterais
          const top = 2.8 * 5 + 0.12, cx = o.x + 8.6, rg = regionOf(cx, o.z + 9, M);
          addMarquee(cx, o.z + 8.5, 3.4, rg);                                                // marquise da entrada
          const WC = ['#ffd890', '#fff0c0', '#ffb870', '#cfe2ff'];
          for (let f = 1; f < 5; f++) for (const wx of [3.4 + 1.9, 8.6, 13.8 - 1.9]) if (rnd() < (nearAve ? 0.55 : 0.35)) {   // janelas acesas (irregulares)
            const wm = winMat(rg, WC[Math.floor(rnd() * 4)]), pl = new THREE.Mesh(WIN_GEO, wm); pl.position.set(o.x + wx, 0.12 + f * 2.8 + 1.45, o.z + 8.63); root.add(pl);
          }
          if (r === ROW + 1) addPanel(cx, top * 0.6, o.z + 1.2 - 0.06, 10, 5.6, 0, -1, pickAds(1 + Math.floor(rnd() * 3), rnd), false);   // parede de trás, virada para a avenida
          if (nearAve && rnd() < 0.55) addPanel(o.x + (c < mid ? 13.0 : 4.2), 2.8 * 2.6, o.z + 8.5 + 1.2, 1.5, 6.2, 0, 1, pickAds(1, rnd), true);   // vertical na fachada (2 andares, na quina)
          if ((nearAve && rnd() < 0.7) || central || (!nearAve && rnd() < 0.18)) {
            const east = c < mid, x = o.x + (east ? 13.8 + 0.12 : 3.4 - 0.12);
            addPanel(x, top * 0.55, o.z + 4.85, central ? 5.6 : 4, central ? 10 : 7, east ? 1 : -1, 0, pickAds(central ? 3 : 1, rnd), true);
            if (central) { const x2 = o.x + (east ? 3.4 - 0.12 : 13.8 + 0.12); addPanel(x2, top * 0.55, o.z + 4.85, 5.6, 10, east ? -1 : 1, 0, pickAds(2, rnd), true); }
          }
        }
      }
      // letreiro correndo no cruzamento central (um só)
      const so = slotOrigin((ROW + 1) * GRID + mid - 1), tm = new THREE.MeshBasicMaterial({ map: tickerTexture(), toneMapped: false });
      ticker = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.1), reg(regionOf(so.x + LOT, so.z, M), tm)); ticker.position.set(so.x + LOT + 0.1, 3.4, so.z - 0.6); ticker.rotation.y = Math.PI;
      for (const dx of [-7.2, 7.2]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 6), new THREE.MeshStandardMaterial({ color: '#2a2d34' })); pl.position.set(so.x + LOT + 0.1 + dx, 1.7, so.z - 0.6); root.add(pl); }
      root.add(ticker);
    },
    /** Liga/desliga os faróis da van e a luz do personagem (só no Penumbra). */
    attach(van, walker, on) {
      if (!heads.length) {
        for (const s of [-1, 1]) {
          const l = new THREE.SpotLight('#fff2d0', 60, 34, 0.5, 0.55, 1.2); l.position.set(2.0, 1.1, s * 0.75); l.target.position.set(14, -0.6, s * 1.2);
          van.object.add(l); van.object.add(l.target); heads.push(l);
          const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#fff2c0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); g.scale.setScalar(1.1); g.position.set(2.25, 1.0, s * 0.72); van.object.add(g); heads.push(g);
        }
        walker.object.add(walkLight); walkLight.position.set(0, 2.4, 0);
      }
      heads.forEach(h => { h.visible = on; }); walkLight.visible = on;
    },
    update(dt, px = 0, pz = 0) {
      if (!root) return;
      t += dt;
      if ((this._lt = (this._lt || 0) - dt) <= 0) {                   // a cada 0,25 s: as 8 fontes mais perto viram luzes de verdade
        this._lt = 0.25;
        const near = lights.map(l => ({ l, d: (l.x - px) ** 2 + (l.z - pz) ** 2 })).sort((a, b) => a.d - b.d).slice(0, pool.length);
        pool.forEach((p, k) => { const n = near[k]; if (!n) { p.userData.src = null; return; } p.position.set(n.l.x, n.l.y, n.l.z); p.color.set(n.l.c); p.userData.src = n.l; });
      }
      for (const p of pool) { const s = p.userData.src; p.intensity = s ? s.i * regions[s.r].k : 0; }   // (apagão: some junto com a região)
      // apagões: uma região por vez, ~8 s apagada, volta aos poucos (2 s); intervalo de 18–30 s
      if (!blackout) { nextBlackout -= dt; if (nextBlackout <= 0) blackout = { r: Math.floor(Math.random() * REGIONS), t: 0 }; }
      else { blackout.t += dt; if (blackout.t > 11) { blackout = null; nextBlackout = 18 + Math.random() * 12; } }
      regions.forEach((R, i) => {
        let k = 1;
        if (blackout && blackout.r === i) { const b = blackout.t; k = b < 0.4 ? 1 - b / 0.4 * 0.95 : b < 8.4 ? 0.05 + (Math.random() < 0.004 ? 0.2 : 0) : Math.min(1, 0.05 + (b - 8.4) / 2.2); }
        if (Math.abs(k - R.k) < 0.001) return; R.k = k;
        for (const m of R.mats) { if (m.userData.base) m.color.copy(m.userData.base).multiplyScalar(k); if (m.transparent) m.opacity = m.userData.op * k; }
      });
      for (const p of panels) {                                   // alternância lenta (escurece, troca, acende)
        p.timer -= dt;
        if (p.timer <= 0 && !p.fade) p.fade = 0.0001;
        if (p.fade) { p.fade += dt; if (p.fade > 0.35 && p.fade - dt <= 0.35) { p.cur = (p.cur + 1) % p.ads.length; p.mat.map = adTexture(p.ads[p.cur], p.vertical); } if (p.fade > 0.7) { p.fade = 0; p.timer = 6 + Math.random() * 4; } }
        const dim = p.fade ? Math.abs(p.fade - 0.35) / 0.35 : 1, base = p.mat.userData.base;
        if (base) p.mat.color.copy(base).multiplyScalar(dim * regions[p.r].k);   // (junto com o apagão da região)
      }
      if (ticker) ticker.material.map.offset.x = (t * 0.04) % 1;
    },
    get blackoutRegion() { return blackout ? blackout.r : -1; },
    forceBlackout(r = 4) { blackout = { r, t: 0 }; },
  };
}
