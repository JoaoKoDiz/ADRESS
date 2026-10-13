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
const regionOf = (x, z, M) => Math.min(2, Math.floor(x / M * 3)) * 3 + Math.min(2, Math.floor(z / M * 3));

export function createNight() {
  let world = null, root = null, M = 1, t = 0;
  const regions = [...Array(REGIONS)].map(() => ({ k: 1, mats: [], sprites: [] }));
  let blackout = null, nextBlackout = 14;
  const panels = [];                                 // { mats:[…], ads, cur, timer, mesh }
  let ticker = null;
  // faróis da van e luz do personagem (criados uma vez; só ligados no Penumbra)
  const heads = [], walkLight = new THREE.PointLight('#ffe2b0', 6, 9, 1.6);
  walkLight.visible = false;

  const reg = (r, m) => { regions[r].mats.push(m); m.userData.base = (m.color && m.color.clone()) || null; m.userData.op = m.opacity; return m; };

  function addLamp(x, z) {
    const r = regionOf(x, z, M), pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 5.2, 6), new THREE.MeshStandardMaterial({ color: '#2a2d34', roughness: 0.6 }));
    pole.position.set(x, 2.6, z); root.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), reg(r, new THREE.MeshBasicMaterial({ color: '#ffe0a0', toneMapped: false })));
    bulb.position.set(x, 5.25, z); root.add(bulb);
    const sp = new THREE.Sprite(reg(r, new THREE.SpriteMaterial({ map: glowTex(), color: '#ffc870', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.8 })));
    sp.scale.setScalar(2.6); sp.position.copy(bulb.position); root.add(sp);
    groundGlow(x, z, '#ffb860', 6.5, 0.32, r);
  }
  function groundGlow(x, z, col, size, op, r, sx = 1, sz = 1) {           // reflexo simples no asfalto molhado
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size * sx, size * sz), reg(r, new THREE.MeshBasicMaterial({ map: glowTex(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); root.add(m);
  }
  /** Painel luminoso: plano com 1–3 anúncios (alternam devagar) virado para (nx, nz). */
  function addPanel(x, y, z, w, h, nx, nz, ads, vertical) {
    const r = regionOf(x, z, M), mat = reg(r, new THREE.MeshBasicMaterial({ map: adTexture(ads[0], vertical), toneMapped: false }));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = Math.atan2(nx, nz); root.add(m);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.3, 0.2), new THREE.MeshStandardMaterial({ color: '#1a1c22', roughness: 0.7 }));
    frame.position.set(x - nx * 0.12, y, z - nz * 0.12); frame.rotation.y = m.rotation.y; root.add(frame);
    if (ads.length > 1) panels.push({ mat, ads, vertical, r, cur: 0, timer: 5 + Math.random() * 4, fade: 0 });
    const gx = x + nx * (h * 0.6 + 2), gz = z + nz * (h * 0.6 + 2);
    groundGlow(gx, gz, ads[0].bg[0], Math.max(w, 5), 0.22, r, Math.abs(nz) > 0.5 ? 1.2 : 0.7, Math.abs(nz) > 0.5 ? 0.7 : 1.2);
    return m;
  }
  const pickAds = (n, rnd) => { const out = []; while (out.length < n) { const a = ADS[Math.floor(rnd() * ADS.length)]; if (!out.includes(a)) out.push(a); } return out; };

  return {
    /** Prepara um mundo do Penumbra (uma vez): luzes da noite e asfalto molhado. */
    setup(w) {
      world = w; const sc = w.scene;
      sc.background = new THREE.Color('#070b18'); if (sc.fog) sc.fog.color.set('#070b18');
      if (w.sunLight) { w.sunLight.intensity = 0.55; w.sunLight.color.set('#8fa8ff'); }
      const hemi = sc.children.find(o => o.isHemisphereLight); if (hemi) { hemi.intensity = 0.75; hemi.color.set('#6a7aa8'); hemi.groundColor.set('#1a1a28'); }
      const sun = sc.getObjectByName('sun'); if (sun) sun.visible = false;
      sc.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material.color.getHexString() === '5d6470') { o.material = o.material.clone(); o.material.color.set('#2c3039'); o.material.roughness = 0.28; o.material.metalness = 0.3; } });
      // estrelinhas
      const N = 500, p = new Float32Array(N * 3); let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) { const v = new THREE.Vector3(rnd() - 0.5, rnd() * 0.6 + 0.15, rnd() - 0.5).normalize().multiplyScalar(1200); p.set([v.x + 100, v.y, v.z + 100], i * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; sc.add(stars);
    },
    /** Monta postes, vitrines, letreiros e painéis para a composição da partida (game.layout). */
    layout(w, game, MAPW) {
      world = w; M = MAPW;
      if (root && root.parent) root.parent.remove(root);
      root = new THREE.Group(); root.name = 'night'; w.scene.add(root);
      regions.forEach(r => { r.mats.length = 0; r.k = 1; }); panels.length = 0; blackout = null; nextBlackout = 12 + Math.random() * 8;
      let sd = 31; const rnd = () => (sd = (sd * 16807 + 7) % 2147483647) / 2147483647;
      const skip = new Set([...GAS_LIST.flatMap(g => g.slots), ...WARE_LIST.flatMap(g => g.slots)]);
      const mid = Math.floor(GRID / 2), ROW = FLUX ? FLUX.row : 5;
      for (let s = 0; s < GRID * GRID; s++) {
        const r = Math.floor(s / GRID), c = s % GRID; if (r === ROW) continue;
        const o = slotOrigin(s);
        if (!skip.has(s) && (c % 2 === 0 || r === ROW - 1 || r === ROW + 1)) addLamp(o.x - WALK * 0.5, o.z - WALK * 0.5);   // postes na calçada (esquina do lote)
        const h = game.layout[s], H = h >= 0 ? HOUSES[h] : null;
        const nearAve = r === ROW - 1 || r === ROW + 1, central = nearAve && (c === mid - 1 || c === mid);
        if (FLUX && FLUX.parks.includes(s) && (r === ROW + 1 || r === ROW - 2 || r === ROW + 2)) {                    // outdoor grande na pracinha
          const dir = r < ROW ? 1 : -1, z = o.z + (dir > 0 ? LOT - 3 : 3), x = o.x + LOT / 2;
          for (const dx of [-3.4, 3.4]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 7, 6), new THREE.MeshStandardMaterial({ color: '#2a2d34' })); pl.position.set(x + dx, 3.5, z); root.add(pl); }
          addPanel(x, 8.6, z, 9, 4.2, 0, dir, pickAds(r === ROW + 1 ? 3 : 2, rnd), false);
        }
        if (!H || skip.has(s)) continue;
        if (H.kind === 'shop') {                                                           // vitrine acesa + letreiro na fachada
          const rg = regionOf(o.x + 8.6, o.z + 9, M);
          const vit = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 2.6), reg(rg, new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
          vit.position.set(o.x + 8.6, 1.5, o.z + 8.57); root.add(vit);
          const col = NEON[Math.floor(rnd() * NEON.length)], sg = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), reg(rg, new THREE.MeshBasicMaterial({ map: signTexture(SIGNS[Math.floor(rnd() * SIGNS.length)], col), toneMapped: false })));
          sg.position.set(o.x + 8.6, 5.25, o.z + 8.58); root.add(sg);
          groundGlow(o.x + 8.6, o.z + LOT + 2, '#ffc070', 7, 0.28, rg, 1.4, 0.8);
        } else if (H.kind === 'house' && rnd() < 0.5) {                                    // casas: janela/varanda com luz quente na calçada
          groundGlow(o.x + 8.6, o.z + LOT + 1.4, '#ffd090', 4.5, 0.18, regionOf(o.x + 8.6, o.z + LOT, M));
        } else if (H.kind === 'apt') {                                                     // prédios: painéis nas paredes de trás/laterais
          const top = 2.8 * 5 + 0.12, cx = o.x + 8.6;
          if (r === ROW + 1) addPanel(cx, top * 0.62, o.z + 1.2 - 0.06, 8.4, 4.2, 0, -1, pickAds(1 + Math.floor(rnd() * 3), rnd), false);   // parede de trás, virada para a avenida
          if ((nearAve && rnd() < 0.7) || central || (!nearAve && rnd() < 0.18)) {
            const east = c < mid, x = o.x + (east ? 13.8 + 0.06 : 3.4 - 0.06);
            addPanel(x, top * 0.55, o.z + 4.85, 3.2, central ? 8 : 6, east ? 1 : -1, 0, pickAds(central ? 2 : 1, rnd), true);
            if (central) { const x2 = o.x + (east ? 3.4 - 0.06 : 13.8 + 0.06); addPanel(x2, top * 0.55, o.z + 4.85, 3.2, 8, east ? -1 : 1, 0, pickAds(1, rnd), true); }
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
    update(dt) {
      if (!root) return;
      t += dt;
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
