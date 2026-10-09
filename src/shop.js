// Shop (painel Jogar → Shop): layout inicial, por enquanto sem itens à venda.
//   Esquerda: categorias em duas seções — VAN (Rodas, Bagageiro, Pintura, Estampas) e PERSONAGEM (Bonés, Camisas, Calças, Sapatos, Tom de pele).
//   Meio: itens da categoria (vazio por ora) ou, nas categorias de cor, o seletor de cor (cores prontas + código HEX).
//   Direita: pré-visualização 3D. Nas categorias da VAN há uma setinha à esquerda (ou ← →) que alterna entre o item sozinho e o item na van atual.
// As cores (Pintura da van, camisa, calça, sapatos, tom de pele) são grátis, valem no jogo todo e ficam salvas no navegador.
import * as THREE from 'three';
import { createVan, setVanPaint, getVanPaint, VAN_PAINT_DEFAULT } from './van.js';
import { createWalker, setCharColors, CHAR_DEFAULT, CHAR_MATS } from './walker.js';
import { box, cyl, sphere, at, mat } from './models/kit.js';
import { WHEEL_MODELS, WHEEL_DEFAULT, buildWheel, setWheelColors } from './models/wheels.js';
import { RACK_MODELS, buildRack } from './models/racks.js';

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
.shop-wcolor { position: absolute; left: 10px; top: 10px; z-index: 2; display: none; flex-direction: column; gap: 5px; padding: 7px 8px; border-radius: 12px;
  background: rgba(20,12,30,.62); border: 2px solid rgba(255,243,214,.4); font-size: 11px; font-weight: 800; max-width: 62%; }
.shop-wcolor.on { display: flex; }
.shop-wcolor small { opacity: .7; font-weight: 700; }
.shop-wrow { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.shop-wrow > b { min-width: 3.9em; letter-spacing: .04em; }
.shop-wrow button { width: 17px; height: 17px; border-radius: 5px; border: 2px solid rgba(255,255,255,.55); padding: 0; cursor: pointer; }
.shop-wrow button.sel { border-color: #fff; box-shadow: 0 0 0 2px #8a55c4; }
.shop-wrow input { width: 5.6em; padding: 2px 5px; border-radius: 6px; border: 2px solid rgba(255,243,214,.6); background: #1d140c; color: #fff3d6;
  font: 800 11px Consolas, "Courier New", monospace; text-transform: uppercase; }
.shop-wrow input.bad { border-color: #ff5a4a; }
.shop-cardw { cursor: pointer; opacity: 1; border-style: solid; border-color: rgba(255,243,214,.35); }
.shop-cardw:hover { border-color: #fff; }
.shop-cardw.sel { border-color: #fff; background: rgba(138,85,196,.45); box-shadow: 0 0 0 3px #8a55c4; }
.shop-cardw .img { padding: 0; overflow: hidden; }
.shop-cardw img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shop-arrow { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 2.6em; height: 2.6em; border-radius: 50%; border: 3px solid #fff;
  background: #8a55c4; color: #fff; font-size: clamp(16px, 1.6vw, 24px); font-weight: 900; cursor: pointer; display: none; align-items: center; justify-content: center; padding: 0; z-index: 2; box-shadow: 0 4px 0 #4d2a7a; }
.shop-arrow.on { display: flex; }
.shop-arrow:hover { filter: brightness(1.15); }
@media (max-width: 900px) { .shopov { grid-template-columns: minmax(150px, 30vw) 1fr; grid-template-rows: auto auto minmax(220px, 1fr); } .shop-prev { grid-column: 1 / -1; } }
`;

const KEY = 'adress.shop.v1';
const HOLD_MS = 10000;                       // depois de mexer com o mouse, a rotação automática espera 10 s
const DEFAULTS = { paint: VAN_PAINT_DEFAULT, ...CHAR_DEFAULT, wheelTire: WHEEL_DEFAULT.tire, wheelHub: WHEEL_DEFAULT.hub };
const COLORS = {
  paint: ['#ff7a1a', '#e3262e', '#3a78d4', '#3c9d55', '#efbf2a', '#f2f2f2', '#2b2d33', '#8a55c4', '#e86aa0', '#19b5b0', '#8c9199', '#8a5a36'],
  cloth: ['#2a9df4', '#e3262e', '#3c9d55', '#efbf2a', '#8a55c4', '#e86aa0', '#ff7a1a', '#f2f2f2', '#2b2d33', '#2f3a55', '#8a5a36', '#19b5b0'],
  shoes: ['#1b1b1f', '#f2f2f2', '#e3262e', '#3a78d4', '#efbf2a', '#3c9d55', '#8a5a36', '#ff7a1a', '#8a55c4', '#e86aa0', '#8c9199', '#2f3a55'],
  wTire: ['#1f2023', '#3a3d44', '#8c9199', '#f2f2f2', '#e3262e', '#3a78d4', '#efbf2a', '#3c9d55'],
  wHub: ['#c9ced6', '#f2f2f2', '#efbf2a', '#e3262e', '#3a78d4', '#19b5b0', '#8a55c4', '#1f2023'],
  skin: ['#ffe0c7', '#f6cfa8', '#e8b48a', '#d39a6f', '#b9784f', '#8d5a3b', '#6b4128', '#4a2c1a', '#f3d2c0', '#e0ac9a'],
};
// sec: 'van' | 'char'. kind: 'items' (à venda; ainda vazio) | 'color' (grátis; key = chave em `colors`)
const CATS = [
  { id: 'wheels', sec: 'van', name: 'Rodas', kind: 'items', desc: '8 modelos de roda (o primeiro é o padrão). Só a roda padrão tem cores editáveis, no canto da pré-visualização: as outras 7 são únicas.' },
  { id: 'rack', sec: 'van', name: 'Bagageiro', kind: 'items', desc: 'O que vai em cima da van. O padrão são as caixas de entrega; os outros 3 modelos têm cores fixas (não dá para mudar).' },
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
  const applyColors = () => { setVanPaint(colors.paint); setCharColors(colors); setWheelColors({ tire: colors.wheelTire, hub: colors.wheelHub }); };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(colors)); } catch (e) { /* ignora */ } };
  applyColors();

  const el = document.createElement('div');
  el.className = 'shopov';
  el.innerHTML = `
    <div class="shop-head"><h2>SHOP</h2><span>Nada à venda por enquanto — por ora, só as cores (grátis).</span></div>
    <div class="shop-side"></div>
    <div class="shop-main"></div>
    <div class="shop-prev"><div class="shop-canvas"></div>
      <div class="shop-wcolor"></div>
      <button type="button" class="shop-arrow" title="Alternar: item sozinho / na sua van" aria-label="Alternar visualização">◀</button>
      <div class="shop-view"></div></div>`;
  document.body.appendChild(el);
  const side = el.querySelector('.shop-side'), main = el.querySelector('.shop-main');
  const canvasBox = el.querySelector('.shop-canvas'), arrow = el.querySelector('.shop-arrow'), viewLbl = el.querySelector('.shop-view');
  el.querySelectorAll('button').forEach(b => { b.tabIndex = -1; });

  let cat = CATS[0], view = 'van';
  let wheelSel = 0;                         // roda em visualização (0 = padrão; as outras ainda não estão à venda)
  let wheelThumbs = null, rackThumbs = null;
  let rackSel = 0;                          // bagageiro em visualização (0 = caixas, o padrão)          // view (categorias da van): 'van' = item na van atual | 'item' = item sozinho

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
    if (cat.id === 'wheels' || cat.id === 'rack') { gallery(); return; }
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
    if (cat.id === 'skin') resetBtn.remove();                                        // Tom de pele: sem "Restaurar padrão"
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
    if (cat.id !== 'skin') resetBtn.addEventListener('click', () => { input.blur(); setColor(DEFAULTS[cat.key]); });
    paintUi();
  }

  // ---------- galeria de modelos (Rodas e Bagageiro) ----------
  function gallery() {
    const isW = cat.id === 'wheels', models = isW ? WHEEL_MODELS : RACK_MODELS, th = thumbs(isW ? 'wheels' : 'rack');
    const e = document.createElement('div'); e.className = 'shop-empty';
    e.textContent = isW ? 'Clique num modelo para ver na van. Por enquanto só a roda padrão está equipada; as outras 7 ainda não estão à venda.'
      : 'Clique num modelo para ver na van. Por enquanto só o padrão (caixas) está equipado; os outros 3 ainda não estão à venda.';
    main.appendChild(e);
    const g = document.createElement('div'); g.className = 'shop-items';
    const dsc = document.createElement('div'); dsc.className = 'shop-desc';
    const show = () => { const i = isW ? wheelSel : rackSel; dsc.textContent = models[i].name + ' — ' + models[i].desc; };
    models.forEach((m, i) => {
      const c = document.createElement('div'); c.className = 'shop-item shop-cardw' + (i === (isW ? wheelSel : rackSel) ? ' sel' : ''); c.dataset.i = i;
      c.innerHTML = `<div class="img"><img src="${th[i]}" alt=""></div><b>${m.name}</b><small>${i === 0 ? 'Equipado' : 'Em breve — moedas'}</small>`;
      c.title = m.desc;
      c.addEventListener('click', () => {
        if (isW) wheelSel = i; else rackSel = i;
        g.querySelectorAll('.shop-cardw').forEach(x => x.classList.toggle('sel', +x.dataset.i === i));
        show(); itemPreview();
      });
      g.appendChild(c);
    });
    main.appendChild(g); main.appendChild(dsc); show();
  }

  // ---------- miniaturas, visualização e cores da roda padrão ----------
  function thumbs(kind) {
    if (kind === 'wheels' && wheelThumbs) return wheelThumbs;
    if (kind === 'rack' && rackThumbs) return rackThumbs;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(160, 120, false);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#fff6e0', '#6a8a50', 1.7));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(-2, 3, 5); sc.add(sun);
    const cam = new THREE.PerspectiveCamera(30, 160 / 120, 0.1, 20);
    let out;
    if (kind === 'wheels') {
      cam.position.set(0, 0, 2.3); cam.lookAt(0, 0, 0);
      out = WHEEL_MODELS.map((m, i) => { const w = buildWheel(i); w.rotation.y = -0.55; sc.add(w); r.render(sc, cam); sc.remove(w); return r.domElement.toDataURL('image/png'); });
    } else {
      cam.position.set(3.3, 2.6, 3.9); cam.lookAt(0, 0.45, 0);
      out = RACK_MODELS.map((m, i) => {
        const w = new THREE.Group(), body = buildRack(i); body.position.set(0.85, -2.47, 0); w.add(body);   // centralizado na origem
        sc.add(w); r.render(sc, cam); sc.remove(w); return r.domElement.toDataURL('image/png');
      });
    }
    r.dispose(); r.forceContextLoss();
    if (kind === 'wheels') wheelThumbs = out; else rackThumbs = out;
    return out;
  }
  const wcolor = el.querySelector('.shop-wcolor');
  function buildWheelColors() {
    wcolor.innerHTML = '<small>Cores da roda padrão (só nela)</small>';
    const rows = [['Aro', 'wheelTire', COLORS.wTire], ['Centro', 'wheelHub', COLORS.wHub]];
    for (const [label, key, pal] of rows) {
      const row = document.createElement('div'); row.className = 'shop-wrow';
      row.innerHTML = `<b>${label}</b>`;
      const input = document.createElement('input'); input.type = 'text'; input.maxLength = 7; input.spellcheck = false; input.placeholder = '#RRGGBB';
      const paint = () => {
        row.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.c === colors[key]));
        if (document.activeElement !== input) input.value = colors[key].toUpperCase();
        input.classList.remove('bad');
      };
      const set = hex => { colors[key] = hex; applyColors(); save(); paint(); };
      for (const c of pal) {
        const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.dataset.c = c; b.title = c.toUpperCase();
        b.addEventListener('click', () => { input.blur(); set(c); });
        row.appendChild(b);
      }
      input.addEventListener('input', () => { const h = normHex(input.value); input.classList.toggle('bad', !h && input.value.replace('#', '').length >= 6); if (h) set(h); });
      input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') input.blur(); });
      input.addEventListener('blur', paint);
      row.appendChild(input); wcolor.appendChild(row); paint();
    }
  }
  function itemPreview() {                  // atualiza van e itens sozinhos da pré-visualização; painel de cores só na roda padrão
    wcolor.classList.toggle('on', cat.id === 'wheels' && wheelSel === 0);
    if (!pv) return;
    const w = cat.id === 'wheels' ? wheelSel : 0, rk = cat.id === 'rack' ? rackSel : 0;
    if (pv.shown.w !== w) { pv.van.setWheelModel(w); pv.shown.w = w; }
    if (pv.shown.r !== rk) { pv.van.setRackModel(rk); pv.shown.r = rk; }
    while (pv.wheel.children.length) pv.wheel.remove(pv.wheel.children[0]);
    pv.wheel.add(buildWheel(w));
    while (pv.rack.children.length) pv.rack.remove(pv.rack.children[0]);
    const body = buildRack(rk); body.position.set(0.85, -2.47, 0); pv.rack.add(body);
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
    const wheel = new THREE.Group();                                                                // roda sozinha (modelo escolhido), ampliada
    wheel.add(buildWheel(0)); wheel.scale.setScalar(2.1); wheel.position.y = 1.2; scene.add(wheel);
    const rack = new THREE.Group();                                                                 // carga sozinha (modelo escolhido), ampliada
    rack.scale.setScalar(1.15); rack.position.y = 0.3; scene.add(rack);
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
    pv = { renderer, scene, camera, van, walker, wheel, rack, swatch, decal, sMat, t: 0, base, angle: 0.9, holdUntil: 0, shown: { w: 0, r: 0 } };
    // girar com o mouse: arrastar (botão esquerdo) gira a van/personagem; ao mexer, a rotação automática pausa por 10 s
    // (a cada novo movimento o prazo recomeça) e depois continua de onde parou
    let drag = null;
    const c = renderer.domElement;
    c.style.cursor = 'grab'; c.style.touchAction = 'none';
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.button !== 2) return;
      drag = { id: e.pointerId, x: e.clientX };
      pv.holdUntil = performance.now() + HOLD_MS;
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      pv.angle += (e.clientX - drag.x) * 0.012;                    // arrastar para a direita leva a frente do objeto para a direita
      drag.x = e.clientX;
      pv.holdUntil = performance.now() + HOLD_MS;
    });
    const end = e => { if (drag && e.pointerId === drag.id) { drag = null; c.style.cursor = 'grab'; pv.holdUntil = performance.now() + HOLD_MS; } };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
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
      if (now >= pv.holdUntil) pv.angle += dt * 0.55;              // gira sozinho, a menos que o jogador tenha mexido há menos de 10 s
      const a = pv.angle;
      const d = char ? 6.4 : item ? 8 : 15, hgt = char ? 2.0 : item ? 2.6 : 4.6, ty = char ? 1.15 : item ? 1.4 : 1.2;
      pv.camera.position.set(Math.cos(a) * d, hgt + ty - 1, Math.sin(a) * d);
      pv.camera.lookAt(0, ty, 0);
      if (char) pv.walker.update(dt, { x: 0, z: 0 }, 'car', [], { x: 1e6, z: 1e6 });
      pv.wheel.rotation.z = pv.t * 0.9;                            // gira em torno do próprio eixo
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
    if (c.id !== 'wheels') wheelSel = 0;
    if (c.id !== 'rack') rackSel = 0;
    buildMain(); paintView(); pose(); itemPreview();
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

  buildSide(); buildMain(); paintView(); buildWheelColors();
  return {
    open() {
      el.classList.add('on');
      if (!pv) makePreview();
      pose(); paintView(); itemPreview();
      if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    },
    close() { el.classList.remove('on'); running = false; if (document.activeElement && el.contains(document.activeElement)) document.activeElement.blur(); },
    get isOpen() { return el.classList.contains('on'); },
    get colors() { return { ...colors }; },
    /** Testes: ângulo atual da pré-visualização e se a rotação automática está pausada. */
    get _angle() { return pv ? pv.angle : 0; },
    get _held() { return !!pv && performance.now() < pv.holdUntil; },
    _hold(ms) { if (pv) pv.holdUntil = performance.now() + ms; },
    /** Testes: escolhe categoria / alterna a visão. */
    _select(id) { select(CATS.find(c => c.id === id)); },
    _toggleView: toggleView,
    _wheel(i) { wheelSel = i; if (cat.id === 'wheels') buildMain(); itemPreview(); },
    _rack(i) { rackSel = i; if (cat.id === 'rack') buildMain(); itemPreview(); },
    get _view() { return view; },
  };
}
