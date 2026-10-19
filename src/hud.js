// HUD em DOM: faixa de texto ACIMA do palco 3D (nunca sobrepõe a cena), balão "E — Entregar"
// posicionado dentro do palco e véu de fade cobrindo a janela inteira.
// Todos os setters são chamados a cada quadro pelo main.js: só mexem no DOM quando o valor muda.

const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
const LINE_H = 1.22;   // altura de linha do texto principal (em "em")

// --au = 1px numa janela de 1920×1080 e encolhe junto com a janela (limitado para continuar legível).
// Hierarquia da barra: a PISTA (ou a fala do morador) é o texto principal, grande e centralizado; as dicas de teclado
// ficam numa linha discreta de teclas desenhadas ([W] acelerar …), que se compacta para nunca empurrar a pista.
// A altura da barra é fixa em cada formato de tela (as linhas da pista são reservadas): o palco 3D não pula quando o texto muda.
const CSS = `
:root {
  --au: clamp(0.68px, min(0.0926vh, 0.0521vw), 1.2px);
  /* tamanhos de fonte com piso de legibilidade para janelas pequenas */
  --ahud-main: max(20px, calc(29 * var(--au)));
  --ahud-sub: max(12.5px, calc(15 * var(--au)));
  --ahud-count: max(14px, calc(17 * var(--au)));
  --ahud-logo: max(21px, calc(28 * var(--au)));
}
.ahud {
  --fit-lines: 2; --fit-min: 15px;
  box-sizing: border-box;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  grid-template-areas: "logo sub count" "main main main";
  column-gap: calc(16 * var(--au));
  padding: calc(6 * var(--au)) calc(22 * var(--au)) calc(7 * var(--au));
  background: #fff3d6 linear-gradient(#fff7e2, #fff3d6 55%, #ffefcc);
  border-bottom: max(2px, calc(4 * var(--au))) solid #e6cc98;
  font-family: ${FONT};
  color: #3a2a1a;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
}
.ahud * { box-sizing: border-box; }

/* ---------- linha de cima: logo | dicas de teclado | contador ---------- */
.ahud-logo {
  grid-area: logo; min-height: calc(30 * var(--au));
  display: flex; align-items: center; gap: calc(8 * var(--au));
  justify-self: start; white-space: nowrap;
}
.ahud-logo svg { width: calc(var(--ahud-logo) * 1.43); height: calc(var(--ahud-logo) * .93); flex: none; display: block; }
.ahud-logo span {
  font-size: var(--ahud-logo); font-weight: 900; line-height: 1;
  letter-spacing: calc(1.2 * var(--au));
  color: #e8661a;
  text-shadow: 0 calc(2 * var(--au)) 0 #f6cfa0;
}
/* dicas: grupos "teclas + ação" lado a lado, numa linha só; cor apagada para não disputar com a pista */
.ahud-sub {
  grid-area: sub; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  display: flex; align-items: center; justify-content: center; gap: .3em 1.05em;
  font-size: var(--ahud-sub); color: #94805c; line-height: 1.3;
}
.ahud-sub.c3 { gap: .3em .7em; font-size: calc(var(--ahud-sub) * .94); }
.ahud-sub.c4 { display: block; text-align: center; }
.ahud-sub.c4 .hk { margin: 0 .35em; }
.hk { display: inline-flex; align-items: center; gap: .32em; flex: none; white-space: nowrap; }
.hk kbd {
  display: inline-grid; place-items: center; min-width: 1.5em; height: 1.5em; padding: 0 .32em; margin: 0;
  border-radius: .36em; background: #f1dcb0; color: #6b4a26; box-shadow: inset 0 -.14em 0 rgba(150, 104, 52, .32);
  font: inherit; font-size: .84em; font-weight: bold; line-height: 1;
}
.hk kbd + kbd { margin-left: -.12em; }
.hk kbd svg { width: .95em; height: 1.15em; display: block; }
.hk .alt { color: #b09a74; font-size: .9em; }
.hk-q { color: #ad9872; }
.hk-tag {
  display: inline-block; padding: .12em .55em; border-radius: 999px; background: #e9d3a6; color: #6b4a26;
  font-size: .82em; font-weight: bold; letter-spacing: .08em;
}
.ahud-sub.c1 .alt { display: none; }
.ahud-sub.c2 .hk-q { display: none; }
.ahud-sub[data-tone="cont"] { color: #5a3c1e; font-weight: bold; }
.ahud-sub[data-tone="cont"] kbd, .ahud-sub[data-tone="success"] kbd { background: #e8661a; color: #fff; box-shadow: inset 0 -.16em 0 #b94c0e; }
.ahud-sub[data-tone="success"] { color: #2a9d4b; font-weight: bold; }
.ahud-warm { position: absolute; visibility: hidden; pointer-events: none; left: 0; top: 0; }
.ahud-count {
  grid-area: count;
  justify-self: end; display: flex; align-items: center; gap: calc(7 * var(--au));
  height: calc(var(--ahud-count) * 1.76); padding: 0 calc(var(--ahud-count) * .88) 0 calc(var(--ahud-count) * .6);
  border-radius: 999px; background: #ffe2b8; color: #5a3c1e;
  box-shadow: inset 0 calc(-2 * var(--au)) 0 rgba(201, 138, 74, .28);
  font-size: var(--ahud-count); font-weight: bold; white-space: nowrap;
}
.ahud-count svg { width: 1.12em; height: 1.12em; flex: none; display: block; }
/* no mapa da Carreira o contador de entregas não tem sentido */
body.on-map .ahud-count { visibility: hidden; }
.ahud-count b { font-variant-numeric: tabular-nums; }

/* ---------- texto principal (pista / fala): protagonista, linhas reservadas ---------- */
.ahud-main {
  grid-area: main; min-width: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: var(--ahud-main);
  min-height: calc(var(--fit-lines) * ${LINE_H} * var(--ahud-main));
  margin-top: calc(1 * var(--au));
}
.ahud-main-txt {
  width: 100%; max-width: 64em; text-align: center; font-weight: bold;
  line-height: ${LINE_H};
  overflow-wrap: break-word; text-wrap: balance;
}
.ahud-main-txt[data-tone="clue"]    { color: #33230f; }
.ahud-main-txt[data-tone="ring"]    { color: #8a7355; }
.ahud-main-txt[data-tone="dialog"]  { color: #7a2e1a; font-weight: 600; }
.ahud-main-txt[data-tone="success"] { color: #1f7a3a; }
.ahud-main-txt .who { font-weight: bold; color: #4a2a18; }
.ahud-main-txt[data-tone="success"] .who { color: #17602d; }

/* janelas médias: as dicas podem ocupar 2 linhas (altura fixa de 2 linhas: a barra não muda de tamanho entre os estados) */
@media (max-width: 1100px) {
  .ahud-sub { flex-wrap: wrap; white-space: normal; align-content: center; height: 2.95em; row-gap: .25em; }
}
/* celular em pé: sem o nome ao lado do ícone (o Voltar ocupa a esquerda); a pista ganha a largura toda e até 3 linhas legíveis */
@media (max-width: 560px) {
  .ahud { --fit-lines: 3; --fit-min: 14.5px; --ahud-main: 17px; padding: 5px 14px 6px;
    grid-template-areas: "logo . count" "main main main" "sub sub sub"; }
  .ahud-logo { min-height: 44px; }   /* (o Voltar maior do toque não encosta na 1ª linha da pista) */
  .ahud-logo span { display: none; }
  .ahud-main { margin-top: 2px; }
}
/* modo toque: as dicas de teclado viram os botões da tela — a linha some de verdade (não deixa espaço vazio) */
body.touch-on .ahud-sub { display: none; }
/* celular deitado com toque: barra de uma linha só — logo | pista | contador (sobra altura para o jogo) */
@media (max-height: 560px) and (min-aspect-ratio: 1/1) {
  body.touch-on .ahud { --fit-lines: 2; --fit-min: 14px; --ahud-main: 16.5px; grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: "logo main count"; padding: 4px 14px 5px; }
  body.touch-on .ahud-logo span { display: none; }
  body.touch-on .ahud-main { margin-top: 0; }
  body.touch-on .ahud-count { --ahud-count: 14px; }
}

/* ---------- balão "E — Entregar" dentro do palco ---------- */
.ahud-prompt {
  position: absolute; left: 0; top: 0; z-index: 3;
  pointer-events: none; will-change: transform;
  font-size: max(14px, calc(18 * var(--au)));
  padding-bottom: calc(.55em - 2px);   /* altura da ponta: a ponta toca exatamente o ponto (x, y) */
  visibility: hidden;
}
.ahud-bubble {
  box-sizing: border-box; position: relative; display: flex; align-items: center; gap: .4em;
  padding: .28em .8em .28em .33em;
  background: #fffaf0; border: 2px solid #e8661a; border-radius: .7em;
  box-shadow: 0 .22em .55em rgba(30, 22, 10, .3);
  font-family: ${FONT}; font-weight: bold; color: #3a2a1a;
  white-space: nowrap; line-height: 1.2;
  transform-origin: 50% 100%;
}
.ahud-bubble::after {
  /* losango girado 45°; só a metade de baixo aparece (o texto nunca é coberto) */
  content: ''; box-sizing: border-box; position: absolute; left: 50%; bottom: -.39em;
  width: .78em; height: .78em;
  background: #fffaf0; border: solid #e8661a; border-width: 0 2px 2px 0;
  clip-path: polygon(100% -2px, 100% 100%, -2px 100%);
  transform: translateX(-50%) rotate(45deg);
}
.ahud-key {
  display: inline-grid; place-items: center;
  min-width: 1.6em; height: 1.6em; padding: 0 .3em;
  border-radius: .42em; background: #e8661a; color: #fff;
  box-shadow: inset 0 -.18em 0 #b94c0e;
  font-size: .9em; line-height: 1;
}
.ahud-prompt.on { visibility: visible; }
/* toque: no lugar da tecla E, o símbolo de tocar (o balão inteiro é o botão); sem o travessão */
.ahud-tap { display: none; place-items: center; width: 1.6em; height: 1.6em; border-radius: 50%; background: #e8661a; color: #fff;
  box-shadow: inset 0 -.18em 0 #b94c0e; }
.ahud-tap svg { width: 1.08em; height: 1.08em; display: block; }
body.touch-on .ahud-tap { display: inline-grid; }
body.touch-on .ahud-key, body.touch-on .ahud-dash { display: none; }
/* balão AO LADO do ponto (sobre a rua, sem cobrir o quintal da casa): a ponta aponta para a van */
.ahud-prompt[data-side="right"] { padding: 0 0 0 calc(.55em - 2px); }
.ahud-prompt[data-side="left"]  { padding: 0 calc(.55em - 2px) 0 0; }
.ahud-prompt[data-side="right"] .ahud-bubble { transform-origin: 0 50%; }
.ahud-prompt[data-side="left"]  .ahud-bubble { transform-origin: 100% 50%; }
.ahud-prompt[data-side="right"] .ahud-bubble::after {
  left: -.39em; top: 50%; bottom: auto;
  border-width: 0 0 2px 2px;
  clip-path: polygon(0 -2px, 0 100%, calc(100% + 2px) 100%);
  transform: translateY(-50%) rotate(45deg);
}
.ahud-prompt[data-side="left"] .ahud-bubble::after {
  left: auto; right: -.39em; top: 50%; bottom: auto;
  border-width: 2px 2px 0 0;
  clip-path: polygon(-2px 0, 100% 0, 100% calc(100% + 2px));
  transform: translateY(-50%) rotate(45deg);
}

/* ---------- véu do fade (janela inteira) ---------- */
.ahud-fade {
  position: fixed; inset: 0; z-index: 50; pointer-events: none;
  background: rgb(27, 36, 24); opacity: 0; display: none;
}
`;

// Van de entregas estilizada (logo).
const VAN_SVG = `
<svg viewBox="0 0 40 26" aria-hidden="true">
  <g stroke="#f2b07e" stroke-width="1.6" stroke-linecap="round">
    <line x1="1" y1="9" x2="5.5" y2="9"/><line x1="0" y1="13" x2="5" y2="13"/><line x1="2" y1="17" x2="5.5" y2="17"/>
  </g>
  <rect x="7" y="4" width="21" height="15.5" rx="2.6" fill="#e8661a"/>
  <path d="M27 7.5h5.2q1.2 0 2 .9l3.9 4.7q.9 1 .9 2.3v2.9q0 1.2-1.2 1.2H27z" fill="#e8661a"/>
  <path d="M29.2 9.6h2.7q.7 0 1.1.5l2.6 3.2h-6.4z" fill="#fff3d6"/>
  <rect x="11" y="8" width="8" height="6.6" rx="1" fill="#fff3d6"/>
  <rect x="14.2" y="8" width="1.6" height="6.6" fill="#f6cfa0"/>
  <circle cx="12.5" cy="20.5" r="3.6" fill="#3a2a1a"/><circle cx="12.5" cy="20.5" r="1.4" fill="#fff3d6"/>
  <circle cx="32" cy="20.5" r="3.6" fill="#3a2a1a"/><circle cx="32" cy="20.5" r="1.4" fill="#fff3d6"/>
</svg>`;

// Caixa de papelão (contador).
const BOX_SVG = `
<svg viewBox="0 0 20 20" aria-hidden="true">
  <rect x="2" y="6.5" width="16" height="11.5" rx="1.4" fill="#c98a4a"/>
  <path d="M1 3.8Q1 3 1.8 3h16.4q.8 0 .8.8V7.6H1z" fill="#b1733a"/>
  <rect x="8.9" y="3" width="2.2" height="15" fill="#f3d9a6"/>
  <rect x="12.6" y="12.2" width="3.6" height="2.8" rx=".4" fill="#f3d9a6" opacity=".85"/>
</svg>`;

// Dedo tocando (balão no modo toque).
const TAP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 6.4a4.4 4.4 0 0 1 7.2 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
  '<path d="M10.6 22l-3.5-4.6a1.5 1.5 0 0 1 2.3-1.9l1.4 1.4V10a1.5 1.5 0 0 1 3 0v4.6l3.9.7a2 2 0 0 1 1.6 2.3L18.6 22z" fill="currentColor"/></svg>';

// Modo toque: frases da barra que citam teclas viram o gesto equivalente (o texto original continua igual no computador).
const TOUCH_TEXT = [
  [/aperte E para entrar/g, 'toque no balão para entrar'],
  [/\s*\((?:[A-Z]|Esc|Espaço|Shift)\)/g, ''],
];
const touchOn = () => document.body.classList.contains('touch-on');
const forTouch = t => (touchOn() ? TOUCH_TEXT.reduce((a, [re, to]) => a.replace(re, to), t) : t);

function injectStyle() {
  if (document.getElementById('ahud-style')) return;
  const st = document.createElement('style');
  st.id = 'ahud-style';
  st.textContent = CSS;
  document.head.appendChild(st);
}

const reducedMotion = () => {
  try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
};
const easeOut = p => 1 - (1 - p) ** 3;
const easeOutBack = p => { const c = 1.2, q = p - 1; return 1 + (c + 1) * q * q * q + c * q * q; };

// Micro-animações conduzidas pelos próprios setters (chamados a cada quadro) com performance.now().
// Não usam transições CSS/WAAPI de propósito: assim o estado final nunca depende da linha do tempo
// do documento (que fica congelada em capturas headless). Um setTimeout garante o estado final
// mesmo se o laço parar no meio.
const anims = new Map();   // elemento → { t0, dur, apply(p) }
function play(el, dur, apply) {
  clearTimeout(el._ahudTimer);
  if (reducedMotion()) { anims.delete(el); apply(1); return; }
  anims.set(el, { t0: performance.now(), dur, apply });
  apply(0);
  el._ahudTimer = setTimeout(() => finish(el), dur + 50);
}
function finish(el) {
  const a = anims.get(el);
  if (a) { anims.delete(el); a.apply(1); }
}
function tickAnims() {
  if (!anims.size) return;
  const now = performance.now();
  for (const [el, a] of anims) {
    const p = (now - a.t0) / a.dur;
    if (p >= 1) { anims.delete(el); clearTimeout(el._ahudTimer); a.apply(1); } else a.apply(Math.max(0, p));
  }
}

export function createHUD(hudEl, stageEl) {
  injectStyle();

  // ---------- faixa superior ----------
  hudEl.classList.add('ahud');
  hudEl.innerHTML = `
    <div class="ahud-logo">${VAN_SVG}<span>ADRESS</span></div>
    <div class="ahud-sub" data-tone="muted"></div>
    <div class="ahud-count">${BOX_SVG}<span>Entregas: <b>0</b></span></div>
    <div class="ahud-main"><div class="ahud-main-txt" data-tone="clue" aria-live="polite" aria-atomic="true"></div></div>`;
  const subEl = hudEl.querySelector('.ahud-sub');
  const countPill = hudEl.querySelector('.ahud-count');
  const countEl = countPill.querySelector('b');
  const mainBox = hudEl.querySelector('.ahud-main');
  const mainEl = hudEl.querySelector('.ahud-main-txt');

  // ---------- balão no palco ----------
  const prompt = document.createElement('div');
  prompt.className = 'ahud-prompt';
  prompt.setAttribute('aria-hidden', 'true');
  prompt.innerHTML = `<div class="ahud-bubble"><span class="ahud-key">E</span><span class="ahud-tap">${TAP_SVG}</span><span><span class="ahud-dash">— </span><span class="ahud-lbl">Entregar</span></span></div>`;
  stageEl.appendChild(prompt);
  const bubble = prompt.firstElementChild;
  const promptTxt = bubble.querySelector('.ahud-lbl');
  let promptLabel = 'Entregar';

  // Aquece a fonte de emoji (a 1ª "Ding-dong… 🔔" custava ~20 ms procurando a fonte no meio do jogo).
  const warm = document.createElement('span');
  warm.className = 'ahud-main-txt ahud-warm';
  warm.textContent = '🔔 ✔';
  hudEl.appendChild(warm);
  void warm.offsetHeight;

  // ---------- véu do fade ----------
  const fadeEl = document.createElement('div');
  fadeEl.className = 'ahud-fade';
  document.body.appendChild(fadeEl);

  // ---------- estado em cache (evita tocar no DOM à toa) ----------
  let counter = 0, subText = '', subTone = 'muted', mainText = '', mainTone = 'clue';
  let promptOn = false, px = NaN, py = NaN, fadeA = 0, promptSide = 'up';

  /** Reduz a fonte do texto principal até caber nas linhas reservadas (--fit-lines; nunca abaixo de --fit-min, nunca corta). */
  function fitMain() {
    const cs = getComputedStyle(mainBox);
    const base = parseFloat(cs.fontSize) || 20;
    const maxLines = parseInt(cs.getPropertyValue('--fit-lines'), 10) || 2;
    const minFs = Math.min(base, parseFloat(cs.getPropertyValue('--fit-min')) || 15), step = Math.max(0.5, base * 0.03);
    let fs = base;
    for (;;) {
      const lh = fs * LINE_H;
      mainEl.style.fontSize = fs + 'px';
      mainEl.style.lineHeight = lh + 'px';
      const lines = Math.round(mainEl.offsetHeight / lh);
      if (lines <= maxLines || fs <= minFs) break;
      fs = Math.max(minFs, fs - step);
    }
  }

  /** Dicas de teclado: compacta em etapas (tira teclas alternativas, depois os detalhes entre parênteses, depois aperta
   *  o espaço) até caber numa linha; só em último caso corta com "…" (o texto inteiro fica no title). */
  function fitSub() {
    subEl.classList.remove('c1', 'c2', 'c3', 'c4');
    if (!subText || subEl.offsetParent === null || !subEl.clientWidth) return;
    for (const c of ['c1', 'c2', 'c3', 'c4']) {
      if (subEl.scrollWidth <= subEl.clientWidth + 1 && subEl.scrollHeight <= subEl.clientHeight + 1) return;
      subEl.classList.add(c);
    }
  }

  // ---------- dicas: "W / ↑: acelerar  ·  E: entregar  ·  A PÉ" → grupos de teclas desenhadas + ação ----------
  const KEY_TOKEN = /^(?:[A-Z]|[↑↓←→]|Espaço|Shift|Esc|Enter|Tab|WASD|Setas|setas)$/;
  const MOUSE_R = '<svg viewBox="0 0 12 16" aria-hidden="true"><rect x="1" y="1" width="10" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 1.2V7h4.8V6A5 5 0 0 0 6 1.2z" fill="currentColor"/></svg>';
  const kbd = (k, alt) => { const e = document.createElement('kbd'); if (alt) e.className = 'alt'; if (k === 'mouseR') { e.innerHTML = MOUSE_R; e.title = 'botão direito do mouse'; } else e.textContent = k; return e; };
  /** "pousar (em cima de um prédio…)" → ação + detalhe discreto entre parênteses. */
  function actionNodes(txt, qual) {
    const out = [];
    const m = /^(.*?)\s*(\([^)]*\))\s*$/.exec(txt);
    out.push(document.createTextNode(m ? m[1] : txt));
    const q = m ? m[2] : qual ? '(' + qual + ')' : '';
    if (q) { const s = document.createElement('span'); s.className = 'hk-q'; s.textContent = ' ' + q; out.push(s); }
    return out;
  }
  function renderSeg(seg) {
    const g = document.createElement('span'); g.className = 'hk';
    const c = /^(.+?):\s+(.+)$/.exec(seg);
    if (!c) {                                                       // sem "tecla: ação"
      if (/\[\w+\]/.test(seg)) { seg.split(/\[(\w+)\]/).forEach((p, i) => { if (i % 2) g.appendChild(kbd(p)); else if (p.trim()) g.appendChild(document.createTextNode(p.trim())); }); return g; }
      if (seg === seg.toUpperCase() && /[A-ZÀ-Ú]{2}/.test(seg)) { const t = document.createElement('span'); t.className = 'hk-tag'; t.textContent = seg; g.appendChild(t); return g; }   // modo: A PÉ, HELICÓPTERO…
      g.textContent = seg; return g;
    }
    let keyPart = c[1].replace(/[[\]]/g, ''), qual = '';
    const pq = /\(([^)]*)\)/.exec(keyPart); if (pq) { qual = pq[1]; keyPart = keyPart.replace(pq[0], ' '); }
    const keys = [], extra = [];
    if (/botão direito/i.test(keyPart)) { keys.push('mouseR'); keyPart = keyPart.replace(/botão direito/i, ' '); }
    for (const t of keyPart.split(/\s*\/\s*|\s+/)) { if (!t || t === 'ou') continue; if (KEY_TOKEN.test(t)) keys.push(t); else extra.push(t); }
    if (!keys.length) { g.appendChild(document.createTextNode(seg)); return g; }
    if (extra.length) qual = (extra.join(' ') + (qual ? ' ' + qual : '')).trim();
    const letters = keys.some(k => /^[A-Z]$|^WASD$/.test(k));            // letras + setas: as setas são a alternativa (somem se faltar espaço)
    for (const k of keys) g.appendChild(kbd(k, letters && /^[↑↓←→]$|^[Ss]etas$/.test(k)));
    for (const n of actionNodes(c[2], qual)) g.appendChild(n);
    return g;
  }

  // Fala de morador ("Nome: “…”"): o nome ganha destaque; o conteúdo entra sempre como texto puro.
  function renderMain(text) {
    text = forTouch(text);
    const m = /^([^:“"]{1,40}): (“[\s\S]*)$/.exec(text);
    if (m) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = m[1] + ':';
      mainEl.replaceChildren(who, document.createTextNode(' ' + m[2]));
    } else mainEl.textContent = text;
  }

  // refaz o encaixe quando a largura da barra muda (janela, celular girado, modo toque que troca o formato da barra)
  let lastW = -1, lastTouch = null;
  const refit = () => { if (mainText) fitMain(); fitSub(); };
  const watch = () => {
    const w = hudEl.clientWidth, t = document.body.classList.contains('touch-on');
    if (t !== lastTouch && lastTouch !== null && mainText) renderMain(mainText);   // (frases com teclas mudam no toque)
    if (w !== lastW || t !== lastTouch) { lastW = w; lastTouch = t; refit(); }
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(watch).observe(hudEl);
  else addEventListener('resize', () => requestAnimationFrame(watch));
  if (typeof MutationObserver !== 'undefined') new MutationObserver(watch).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit).catch(() => {});

  return {
    setCounter(n) {
      tickAnims();
      if (n === counter) return;
      const up = n > counter;
      counter = n;
      countEl.textContent = String(n);
      if (up) play(countPill, 420, p => {
        countPill.style.transform = p >= 1 ? '' : `scale(${(1 + 0.14 * Math.sin(Math.PI * p)).toFixed(4)})`;
      });
    },

    /** Linha de ajuda (dicas de teclado): "W / ↑: acelerar  ·  E: entregar" vira grupos de teclas desenhadas + ação; "[E]" também vira tecla. */
    setSub(text, tone = 'muted') {
      text = text == null ? '' : String(text);
      if (tone !== subTone) { subTone = tone; subEl.dataset.tone = tone; }
      if (text !== subText) {
        subText = text;
        subEl.title = text.replace(/\[(\w+)\]/g, '$1');
        subEl.replaceChildren(...text.split(/\s+·\s+/).filter(Boolean).map(renderSeg));
        fitSub();
      }
    },

    setMain(text, tone = 'clue') {
      tickAnims();
      text = text == null ? '' : String(text);
      if (tone !== mainTone) { mainTone = tone; mainEl.dataset.tone = tone; }
      if (text === mainText) return;
      mainText = text;
      renderMain(text);
      fitMain();
      if (text) play(mainEl, 260, p => {
        if (p >= 1) { mainEl.style.opacity = ''; mainEl.style.transform = ''; return; }
        const e = easeOutBack(p);
        mainEl.style.opacity = (0.15 + 0.85 * easeOut(p)).toFixed(3);
        mainEl.style.transform = `translateY(${(5 * (1 - e)).toFixed(2)}px) scale(${(0.985 + 0.015 * e).toFixed(4)})`;
      });
    },

    /**
     * Balão "E — Entregar". side: 'up' = acima do ponto (ponta embaixo, em (x, y));
     * 'right' / 'left' = à direita / à esquerda do ponto, centrado em y (ponta lateral em (x, y)).
     */
    setPrompt(visible, x, y, side = 'up', label = 'Entregar') {
      tickAnims();
      if (visible && label !== promptLabel) { promptLabel = label; promptTxt.textContent = label; }
      if (!visible || !Number.isFinite(x) || !Number.isFinite(y)) {
        if (promptOn) { promptOn = false; prompt.classList.remove('on'); }
        return;
      }
      if (side === 'up') {                                         // perto da borda: o balão inteiro continua na tela (no celular ele é um botão)
        const W = prompt.parentElement ? prompt.parentElement.clientWidth : innerWidth;
        if (x < 160 || x > W - 160 || y < 80) { const w = prompt.offsetWidth || 0, h = prompt.offsetHeight || 0; x = Math.min(Math.max(x, w / 2 + 8), W - w / 2 - 8); y = Math.max(y, h + 8); }
        // toque: o balão é o botão (entrar na van, entregar…) — projetado abaixo da tela (van pousada num terraço, por exemplo)
        // ele para embaixo, no meio (longe do joystick e da coluna de botões; acima de DICA/MENU e dos créditos da música),
        // para continuar alcançável. (No computador nada muda: lá vale o E.)
        const H = prompt.parentElement ? prompt.parentElement.clientHeight : innerHeight, lim = W <= 560 ? 108 : 80;
        if (touchOn() && y > H - lim) { y = H - lim; x = W / 2; }
      }
      x = Math.round(x); y = Math.round(y);
      if (side !== promptSide) {
        promptSide = side;
        prompt.dataset.side = side;
        px = NaN;
      }
      if (x !== px || y !== py) {
        px = x; py = y;
        const shift = side === 'right' ? '0, -50%' : side === 'left' ? '-100%, -50%' : '-50%, -100%';
        prompt.style.transform = `translate3d(${x}px, ${y}px, 0) translate(${shift})`;
      }
      if (!promptOn) {
        promptOn = true;
        prompt.classList.add('on');
        play(bubble, 160, p => {
          if (p >= 1) { bubble.style.opacity = ''; bubble.style.transform = ''; return; }
          const e = easeOutBack(p);
          bubble.style.opacity = Math.min(1, p * 1.6).toFixed(3);
          bubble.style.transform = `translateY(${(4 * (1 - e)).toFixed(2)}px) scale(${(0.85 + 0.15 * e).toFixed(4)})`;
        });
      }
    },

    setFade(alpha) {
      let a = Number(alpha);
      a = a > 0 ? Math.min(1, Math.round(a * 1000) / 1000) : 0;
      if (a === fadeA) return;
      if (a === 0) fadeEl.style.display = 'none';
      else {
        if (fadeA === 0) fadeEl.style.display = 'block';
        fadeEl.style.opacity = String(a);
      }
      fadeA = a;
    },
  };
}
