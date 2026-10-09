// Shop (painel Jogar → Shop): layout inicial, por enquanto sem itens à venda.
//   Esquerda: categorias em duas seções — VAN (Rodas, Bagageiro, Pintura, Estampas) e PERSONAGEM (Bonés, Camisas, Calças, Sapatos, Tom de pele).
//   Meio: itens da categoria (vazio por ora) ou, nas categorias de cor, o seletor de cor (cores prontas + código HEX).
//   Direita: pré-visualização 3D. Nas categorias da VAN há uma setinha à esquerda (ou ← →) que alterna entre o item sozinho e o item na van atual.
// As cores (Pintura da van, camisa, calça, sapatos, tom de pele) são grátis, valem no jogo todo e ficam salvas no navegador.
import * as THREE from 'three';
import { createVan, setVanPaint, getVanPaint, VAN_PAINT_DEFAULT } from './van.js';
import { createWalker, setCharColors, CHAR_DEFAULT, CHAR_MATS } from './walker.js';
import { box, cyl, sphere, at, mat } from './models/kit.js';

const CSS = `
.shopov { position: fixed; inset: 0; z-index: 25; display: none; padding: 62px clamp(14px, 2vw, 32px) clamp(14px, 2vw, 28px);
  box-sizing: border-box; gap: clamp(10px, 1.4vw, 22px); grid-template-columns: minmax(190px, 21vw) minmax(0, 1fr) minmax(280px, 35vw); grid-template-rows: auto minmax(0, 1fr);
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); background: rgba(30,22,14,.74);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; color: #fff3d6; user-select: none; }
.shopov.on { display: grid; }
.shop-head { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 16px; }
.shop-head h2 { margin: 0; font-weight: 900; font-size: clamp(26px, 3vw, 44px); letter-spacing: .1em; text-shadow: 0 4px 0 rgba(0,0,0,.4); color: #d9b6ff; }
.shop-head span { opacity: .75; font-weight: 700; font-size: clamp(12px, 1.1vw, 16px); }
.shop-side, .shop-main, .shop-prev { background: rgba(255,243,214,.07); border: 3px solid rgba(255,243,214,.35); border-radius: 18px; min-height: 0; box-sizing: border-box; }
.shop-side { padding: 12px; overflow: auto; display: flex; flex-direction: column; gap: 6px; }
.shop-sec { margin: 8px 4px 2px; font-weight: 900; letter-spacing: .14em; font-size: clamp(12px, 1.1vw, 16px); color: #ffb56b; }
.shop-sec:first-child { margin-top: 2px; }
.shop-cat { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: .55em .8em; border-radius: 12px; border: 2px solid transparent;
  background: rgba(0,0,0,.22); font-weight: 800; font-size: clamp(14px, 1.3vw, 19px); cursor: pointer; }
.shop-cat:hover { background: rgba(255,255,255,.12); }
.shop-cat.sel { background: #8a55c4; border-color: #fff; color: #fff; box-shadow: 0 3px 0 #4d2a7a; }
.shop-tag { font-size: .62em; font-weight: 900; letter-spacing: .06em; padding: .15em .55em; border-radius: 999px; background: #3c9d55; color: #fff; }
.shop-tag.paid { background: rgba(255,255,255,.2); color: #fff3d6; }
.shop-main { padding: clamp(12px, 1.4vw, 22px); overflow: auto; display: flex; flex-direction: column; gap: 12px; }
.shop-main h3 { margin: 0; font-size: clamp(20px, 2vw, 30px); font-weight: 900; letter-spacing: .04em; }
.shop-desc { opacity: .8; font-weight: 600; font-size: clamp(12px, 1.1vw, 16px); }
.shop-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.shop-item { border: 3px dashed rgba(255,243,214,.3); border-radius: 14px; padding: 10px; text-align: center; opacity: .55; }
.shop-item .img { aspect-ratio: 4 / 3; border-radius: 10px; background: rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.shop-item b { display: block; margin-top: 6px; font-size: .95em; }
.shop-item small { opacity: .8; font-weight: 700; }
.shop-empty { font-weight: 800; padding: .6em .9em; border-radius: 12px; background: rgba(0,0,0,.25); }
.shop-color { display: flex; flex-direction: column; gap: 14px; }
.shop-cur { display: flex; align-items: center; gap: 14px; }
.shop-chip { width: clamp(52px, 5vw, 74px); aspect-ratio: 1; border-radius: 16px; border: 3px solid #fff; box-shadow: 0 4px 0 rgba(0,0,0,.35); }
.shop-cur b { font-size: clamp(18px, 1.8vw, 26px); letter-spacing: .06em; font-family: Consolas, "Courier New", monospace; }
.shop-sw { display: grid; grid-template-columns: repeat(auto-fill, minmax(46px, 1fr)); gap: 10px; }
.shop-sw button { aspect-ratio: 1; border-radius: 12px; border: 3px solid rgba(255,255,255,.55); cursor: pointer; padding: 0; }
.shop-sw button:hover { transform: translateY(-2px); border-color: #fff; }
.shop-sw button.sel { border-color: #fff; box-shadow: 0 0 0 3px #8a55c4, 0 4px 0 rgba(0,0,0,.35); }
.shop-hex { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.shop-hex label { font-weight: 800; }
.shop-hex input { width: 9.5em; padding: .5em .7em; border-radius: 10px; border: 3px solid rgba(255,243,214,.6); background: #1d140c; color: #fff3d6;
  font: 800 clamp(15px, 1.3vw, 19px) Consolas, "Courier New", monospace; letter-spacing: .08em; text-transform: uppercase; }
.shop-hex input.bad { border-color: #ff5a4a; }
.shop-btn { padding: .5em 1em; border-radius: 10px; border: 3px solid #fff; background: #8a55c4; color: #fff; font: 800 clamp(13px, 1.1vw, 16px) "Trebuchet MS", sans-serif; cursor: pointer; }
.shop-btn.ghost { background: rgba(0,0,0,.3); }
.shop-btn:hover { filter: brightness(1.15); }
.shop-prev { position: relative; overflow: hidden; background: rgba(0,0,0,.22); }
.shop-canvas { position: absolute; inset: 0; }
.shop-canvas canvas { width: 100%; height: 100%; display: block; }
.shop-view { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-weight: 900; letter-spacing: .08em; font-size: clamp(13px, 1.2vw, 18px); text-shadow: 0 2px 0 rgba(0,0,0,.5); pointer-events: none; }
.shop-arrow { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 2.6em; height: 2.6em; border-radius: 50%; border: 3px solid #fff;
  background: #8a55c4; color: #fff; font-size: clamp(16px, 1.6vw, 24px); font-weight: 900; cursor: pointer; display: none; align-items: center; justify-content: center; padding: 0; z-index: 2; box-shadow: 0 4px 0 #4d2a7a; }
.shop-arrow.on { display: flex; }
.shop-arrow:hover { filter: brightness(1.15); }
@media (max-width: 900px) { .shopov { grid-template-columns: minmax(150px, 30vw) 1fr; grid-template-rows: auto auto minmax(220px, 1fr); } .shop-prev { grid-column: 1 / -1; } }
`;

const KEY = 'adress.shop.v1';
const DEFAULTS = { paint: VAN_PAINT_DEFAULT, ...CHAR_DEFAULT };
const COLORS = {
  paint: ['#ff7a1a', '#e3262e', '#3a78d4', '#3c9d55', '#efbf2a', '#f2f2f2', '#2b2d33', '#8a55c4', '#e86aa0', '#19b5b0', '#8c9199', '#8a5a36'],
  cloth: ['#2a9df4', '#e3262e', '#3c9d55', '#efbf2a', '#8a55c4', '#e86aa0', '#ff7a1a', '#f2f2f2', '#2b2d33', '#2f3a55', '#8a5a36', '#19b5b0'],
  shoes: ['#1b1b1f', '#f2f2f2', '#e3262e', '#3a78d4', '#efbf2a', '#3c9d55', '#8a5a36', '#ff7a1a', '#8a55c4', '#e86aa0', '#8c9199', '#2f3a55'],
  skin: ['#ffe0c7', '#f6cfa8', '#e8b48a', '#d39a6f', '#b9784f', '#8d5a3b', '#6b4128', '#4a2c1a', '#f3d2c0', '#e0ac9a'],
};
// sec: 'van' | 'char'. kind: 'items' (à venda; ainda vazio) | 'color' (grátis; key = chave em `colors`)
const CATS = [
  { id: 'wheels', sec: 'van', name: 'Rodas', kind: 'items', desc: 'Rodas novas para a sua van.' },
  { id: 'rack', sec: 'van', name: 'Bagageiro', kind: 'items', desc: 'O que vai em cima da van, como as caixas de entrega de hoje.' },
  { id: 'paint', sec: 'van', name: 'Pintura', kind: 'color', key: 'paint', pal: 'paint', desc: 'A cor da lataria da van.' },
  { id: 'decals', sec: 'van', name: 'Estampas', kind: 'items', desc: 'Detalhes extras na lataria. O texto ADRESS fica sempre lá: as estampas só complementam, não trocam nem cobrem.' },
  { id: 'caps', sec: 'char', name: 'Bonés', kind: 'items', desc: 'Bonés para o seu entregador.' },
  { id: 'shirt', sec: 'char', name: 'Camisas', kind: 'color', key: 'shirt', pal: 'cloth', desc: 'A cor da camisa.' },
  { id: 'pants', sec: 'char', name: 'Calças', kind: 'color', key: 'pants', pal: 'cloth', desc: 'A cor da calça.' },
  { id: 'shoes', sec: 'char', name: 'Sapatos', kind: 'color', key: 'shoes', pal: 'shoes', desc: 'A cor dos sapatos.' },
  { id: 'skin', sec: 'char', name: 'Tom de pele', kind: 'color', key: 'skin', pal: 'skin', desc: 'O tom de pele do entregador.' },
];
const SECTIONS = [['van', 'VAN'], ['char', 'PERSONAGEM']];
const isFree = c => c.kind === 'color';
const normHex = s => {
  s = String(s || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(ch => ch + ch).join('');
  return /^[0-9a-f]{6}$/i.test(s) ? '#' + s.toLowerCase() : null;
};

export function createShop() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // cores salvas → valem no jogo todo desde o começo
  const colors = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) for (const k of Object.keys(DEFAULTS)) { const h = normHex(saved[k]); if (h) colors[k] = h; }
  } catch (e) { /* ignora */ }
  const applyColors = () => { setVanPaint(colors.paint); setCharColors(colors); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(colors)); } catch (e) { /* ignora */ } };
  applyColors();

  const el = document.createElement('div');
  el.className = 'shopov';
  el.innerHTML = `
    <div class="shop-head"><h2>SHOP</h2><span>Nada à venda por enquanto — por ora, só as cores (grátis).</span></div>
    <div class="shop-side"></div>
    <div class="shop-main"></div>
    <div class="shop-prev"><div class="shop-canvas"></div>
      <button type="button" class="shop-arrow" title="Alternar: item sozinho / na sua van" aria-label="Alternar visualização">◀</button>
      <div class="shop-view"></div></div>`;
  document.body.appendChild(el);
  const side = el.querySelector('.shop-side'), main = el.querySelector('.shop-main');
  const canvasBox = el.querySelector('.shop-canvas'), arrow = el.querySelector('.shop-arrow'), viewLbl = el.querySelector('.shop-view');
  el.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });

  let cat = CATS[0], view = 'van';          // view (categorias da van): 'van' = item na van atual | 'item' = item sozinho

  // ---------- lista de categorias ----------
  function buildSide() {
    side.innerHTML = '';
    for (const [sec, label] of SECTIONS) {
      const h = document.createElement('div'); h.className = 'shop-sec'; h.textContent = label; side.appendChild(h);
      for (const c of CATS.filter(x => x.sec === sec)) {
        const b = document.createElement('div');
        b.className = 'shop-cat' + (c === cat ? ' sel' : '');
        b.dataset.id = c.id;
        b.innerHTML = `<span>${c.name}</span><span class="shop-tag${isFree(c) ? '' : ' paid'}">${isFree(c) ? 'GRÁTIS' : 'EM BREVE'}</span>`;
        b.addEventListener('click', () => select(c));
        side.appendChild(b);
      }
    }
  }

  // ---------- conteúdo do meio ----------
  function buildMain() {
    main.innerHTML = '';
    const h = document.createElement('h3'); h.textContent = (cat.sec === 'van' ? 'Van · ' : 'Personagem · ') + cat.name; main.appendChild(h);
    const d = document.createElement('div'); d.className = 'shop-desc'; d.textContent = cat.desc; main.appendChild(d);
    if (cat.kind === 'items') {
      const e = document.createElement('div'); e.className = 'shop-empty'; e.textContent = 'Nada à venda por enquanto. Os itens vão aparecer aqui.'; main.appendChild(e);
      const g = document.createElement('div'); g.className = 'shop-items';
      for (let i = 0; i < 6; i++) g.insertAdjacentHTML('beforeend', '<div class="shop-item"><div class="img">🔒</div><b>Em breve</b><small>— moedas</small></div>');
      main.appendChild(g);
      return;
    }
    const wrap = document.createElement('div'); wrap.className = 'shop-color';
    wrap.innerHTML = `<div class="shop-cur"><div class="shop-chip"></div><div><div class="shop-desc">Cor atual</div><b class="shop-curhex"></b></div></div>
      <div class="shop-sw"></div>
      <div class="shop-hex"><label>Código HEX</label><input type="text" maxlength="7" spellcheck="false" placeholder="#RRGGBB"><button type="button" class="shop-btn">Usar</button><button type="button" class="shop-btn ghost">Restaurar padrão</button></div>`;
    main.appendChild(wrap);
    const sw = wrap.querySelector('.shop-sw'), input = wrap.querySelector('input'), [useBtn, resetBtn] = wrap.querySelectorAll('.shop-btn');
    const paintUi = () => {
      const c = colors[cat.key];
      wrap.querySelector('.shop-chip').style.background = c;
      wrap.querySelector('.shop-curhex').textContent = c.toUpperCase();
      sw.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.c === c));
      if (document.activeElement !== input) input.value = c.toUpperCase();
      input.classList.remove('bad');
    };
    const setColor = hex => { colors[cat.key] = hex; applyColors(); save(); paintUi(); };
    for (const c of COLORS[cat.pal]) {
      const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.title = c.toUpperCase();
      b.addEventListener('click', () => { input.blur(); setColor(c); });
      sw.appendChild(b);
    }
    const tryHex = live => { const h = normHex(input.value); input.classList.toggle('bad', !h && (!live || input.value.replace('#', '').length >= 6)); if (h) setColor(h); return !!h; };
    input.addEventListener('input', () => tryHex(true));
    input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { tryHex(false); input.blur(); } });
    input.addEventListener('blur', () => paintUi());
    useBtn.addEventListener('click', () => tryHex(false));
    resetBtn.addEventListener('click', () => { input.blur(); setColor(DEFAULTS[cat.key]); });
    paintUi();
  }

  // ---------- pré-visualização 3D ----------
  let pv = null, running = false, last = 0;
  function makePreview() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    canvasBox.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e0', '#6a8a50', 1.7));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(-4, 8, 6); scene.add(sun);
    const base = at(cyl(4.2, 4.4, 0.2, '#3a2f4a', 40), 0, -0.1, 0); scene.add(base);           // palquinho
    scene.add(at(cyl(4.3, 4.3, 0.06, '#8a55c4', 40), 0, 0.02, 0));
    const van = createVan(scene); van.teleport(0, 0, 0); van.setGhost(true);
    const walker = createWalker(scene); walker.pose(0, 0, 0); walker.show(true);
    // itens "sozinhos"
    const wheel = new THREE.Group();
    wheel.add(at(cyl(0.9, 0.9, 0.7, '#1f2023', 24), 0, 0, 0, Math.PI / 2, 0, 0), at(cyl(0.45, 0.45, 0.76, '#c9ced6', 6), 0, 0, 0, Math.PI / 2, 0, 0));
    wheel.position.y = 1.2; scene.add(wheel);
    const rack = new THREE.Group();
    rack.add(at(box(1.35, 0.62, 1.25, '#c98a4a'), 0, 0.31, 0), at(box(1.37, 0.02, 0.24, '#f3d9a6'), 0, 0.625, 0), at(box(0.24, 0.02, 1.27, '#f3d9a6'), 0, 0.625, 0),
      at(box(0.8, 0.5, 0.75, '#d9a066'), 0.2, 0.87, 0.05, 0, 0.3, 0), at(box(0.82, 0.02, 0.18, '#f3d9a6'), 0.2, 1.125, 0.05, 0, 0.3, 0));
    rack.scale.setScalar(1.7); rack.position.y = 0.2; scene.add(rack);
    const swatch = new THREE.Group();                                                               // gota de tinta: disco na cor escolhida
    const sMat = new THREE.MeshStandardMaterial({ color: colors.paint, roughness: 0.4 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 40), sMat); disc.position.y = 0.55;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 16), sMat); drop.position.y = 1.4;
    swatch.add(disc, drop); scene.add(swatch);
    const dc = document.createElement('canvas'); dc.width = 256; dc.height = 256;
    const g2 = dc.getContext('2d'); g2.fillStyle = '#f4efe3'; g2.fillRect(0, 0, 256, 256); g2.strokeStyle = '#8a55c4'; g2.lineWidth = 8; g2.setLineDash([18, 12]); g2.strokeRect(14, 14, 228, 228);
    g2.fillStyle = '#8a55c4'; g2.font = 'bold 34px "Trebuchet MS", sans-serif'; g2.textAlign = 'center'; g2.fillText('ESTAMPA', 128, 150);
    const dTex = new THREE.CanvasTexture(dc); dTex.colorSpace = THREE.SRGBColorSpace;
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshStandardMaterial({ map: dTex, roughness: 0.8, side: THREE.DoubleSide }));
    decal.position.y = 1.8; scene.add(decal);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const resize = () => {
      const w = Math.max(1, canvasBox.clientWidth), h = Math.max(1, canvasBox.clientHeight);
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvasBox); resize();
    pv = { renderer, scene, camera, van, walker, wheel, rack, swatch, decal, sMat, t: 0, base };
  }
  function pose() {                          // o que aparece, conforme categoria e visão
    if (!pv) return;
    const char = cat.sec === 'char', item = !char && view === 'item';
    pv.van.object.visible = !char && !item;
    pv.walker.show(char);
    pv.wheel.visible = item && cat.id === 'wheels';
    pv.rack.visible = item && cat.id === 'rack';
    pv.swatch.visible = item && cat.id === 'paint';
    pv.decal.visible = item && cat.id === 'decals';
    pv.base.visible = true;
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    if (pv) {
      pv.t += dt;
      pv.sMat.color.set(colors.paint);
      const char = cat.sec === 'char', item = !char && view === 'item';
      const a = pv.t * 0.55 + 0.9;
      const d = char ? 6.4 : item ? 8 : 15, hgt = char ? 2.0 : item ? 2.6 : 4.6, ty = char ? 1.15 : item ? 1.4 : 1.2;
      pv.camera.position.set(Math.cos(a) * d, hgt + ty - 1, Math.sin(a) * d);
      pv.camera.lookAt(0, ty, 0);
      if (char) pv.walker.update(dt, { x: 0, z: 0 }, 'car', [], { x: 1e6, z: 1e6 });
      pv.wheel.rotation.y = 0; pv.wheel.rotation.x = pv.t * 1.2;
      pv.decal.rotation.y = pv.t * 0.8;
      pv.renderer.render(pv.scene, pv.camera);
    }
    requestAnimationFrame(frame);
  }

  function paintView() {
    const van = cat.sec === 'van';
    arrow.classList.toggle('on', van);
    viewLbl.textContent = cat.sec === 'char' ? 'Seu entregador' : view === 'van' ? 'Na sua van' : 'Item sozinho';
    arrow.textContent = view === 'van' ? '◀' : '▶';
  }
  function select(c) {
    cat = c; view = 'van';
    side.querySelectorAll('.shop-cat').forEach(b => b.classList.toggle('sel', b.dataset.id === c.id));
    buildMain(); paintView(); pose();
  }
  const toggleView = () => { if (cat.sec !== 'van') return; view = view === 'van' ? 'item' : 'van'; paintView(); pose(); };
  arrow.addEventListener('click', toggleView);
  arrow.addEventListener('mousedown', e => e.preventDefault());

  addEventListener('keydown', e => {
    if (!el.classList.contains('on') || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') toggleView();
    else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
      const i = CATS.indexOf(cat) + (e.code === 'ArrowDown' ? 1 : -1);
      if (i >= 0 && i < CATS.length) select(CATS[i]);
    }
  });

  buildSide(); buildMain(); paintView();
  return {
    open() {
      el.classList.add('on');
      if (!pv) makePreview();
      pose(); paintView();
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    },
    close() { el.classList.remove('on'); running = false; if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); },
    get isOpen() { return el.classList.contains('on'); },
    get colors() { return { ...colors }; },
    /** Testes: escolhe categoria / alterna a visão. */
    _select(id) { select(CATS.find(c => c.id === id)); },
    _toggleView: toggleView,
    get _view() { return view; },
  };
}
