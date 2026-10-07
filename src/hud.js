// HUD em DOM: faixa de texto ACIMA do palco 3D (nunca sobrepõe a cena), balão "E — Entregar"
// posicionado dentro do palco e véu de fade cobrindo a janela inteira.
// Todos os setters são chamados a cada quadro pelo main.js: só mexem no DOM quando o valor muda.

const FONT = '"Trebuchet MS","Segoe UI",system-ui,sans-serif';
const LINE_H = 1.22;   // altura de linha do texto principal (em "em")
const MAX_LINES = 2;

// --au = 1px numa janela de 1920×1080 e encolhe junto com a janela (limitado para continuar legível).
const CSS = `
:root {
  --au: clamp(0.68px, min(0.0926vh, 0.0521vw), 1.2px);
  /* tamanhos de fonte com piso de legibilidade para janelas pequenas */
  --ahud-main: max(18px, calc(25 * var(--au)));
  --ahud-sub: max(12.5px, calc(15 * var(--au)));
  --ahud-count: max(14px, calc(17 * var(--au)));
  --ahud-logo: max(21px, calc(28 * var(--au)));
}
.ahud {
  box-sizing: border-box;
  padding: calc(7 * var(--au)) calc(22 * var(--au)) calc(6 * var(--au));
  background: #fff3d6 linear-gradient(#fff7e2, #fff3d6 55%, #ffefcc);
  border-bottom: max(2px, calc(4 * var(--au))) solid #e6cc98;
  font-family: ${FONT};
  color: #3a2a1a;
  user-select: none;
  -webkit-user-select: none;
  overflow: hidden;
}
.ahud * { box-sizing: border-box; }

/* ---------- linha de cima: logo | legenda | contador ---------- */
.ahud-top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  column-gap: calc(16 * var(--au));
  min-height: calc(32 * var(--au));
}
.ahud-logo {
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
.ahud-sub {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: pre;
  text-align: center; font-size: var(--ahud-sub); color: #9a8660; line-height: 1.3;
}
.ahud-sub[data-tone="cont"] { color: #5a3c1e; font-weight: bold; }
.ahud-sub .ahud-key { height: 1.35em; min-width: 1.35em; font-size: .85em; vertical-align: .08em; margin: 0 .15em; }
.ahud-warm { position: absolute; visibility: hidden; pointer-events: none; left: 0; top: 0; }
.ahud-sub[data-tone="success"] { color: #2a9d4b; font-weight: bold; font-size: calc(var(--ahud-sub) * 1.07); }
.ahud-count {
  justify-self: end; display: flex; align-items: center; gap: calc(7 * var(--au));
  height: calc(var(--ahud-count) * 1.76); padding: 0 calc(var(--ahud-count) * .88) 0 calc(var(--ahud-count) * .6);
  border-radius: 999px; background: #ffe2b8; color: #5a3c1e;
  box-shadow: inset 0 calc(-2 * var(--au)) 0 rgba(201, 138, 74, .28);
  font-size: var(--ahud-count); font-weight: bold; white-space: nowrap;
}
.ahud-count svg { width: 1.12em; height: 1.12em; flex: none; display: block; }
.ahud-count b { font-variant-numeric: tabular-nums; }

/* ---------- texto principal (pista / fala), até 2 linhas ---------- */
.ahud-main {
  display: flex; align-items: center; justify-content: center;
  font-size: var(--ahud-main);
  min-height: calc(${MAX_LINES * LINE_H} * var(--ahud-main));
  margin-top: calc(2 * var(--au));
}
.ahud-main-txt {
  width: 100%; text-align: center; font-weight: bold;
  line-height: ${LINE_H};
  overflow-wrap: anywhere; text-wrap: balance;
}
.ahud-main-txt[data-tone="clue"]    { color: #3a2a1a; }
.ahud-main-txt[data-tone="ring"]    { color: #8a7355; }
.ahud-main-txt[data-tone="dialog"]  { color: #7a2e1a; font-weight: 600; }
.ahud-main-txt[data-tone="success"] { color: #1f7a3a; }
.ahud-main-txt .who { font-weight: bold; color: #4a2a18; }
.ahud-main-txt[data-tone="success"] .who { color: #17602d; }

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
    <div class="ahud-top">
      <div class="ahud-logo">${VAN_SVG}<span>ADRESS</span></div>
      <div class="ahud-sub" data-tone="muted"></div>
      <div class="ahud-count">${BOX_SVG}<span>Entregas: <b>0</b></span></div>
    </div>
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
  prompt.innerHTML = '<div class="ahud-bubble"><span class="ahud-key">E</span><span>— Entregar</span></div>';
  stageEl.appendChild(prompt);
  const bubble = prompt.firstElementChild;
  const promptTxt = bubble.lastElementChild;
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

  /** Reduz a fonte do texto principal até caber em no máximo 2 linhas (nunca corta nem transborda). */
  function fitMain() {
    const base = parseFloat(getComputedStyle(mainBox).fontSize) || 25;
    const minFs = Math.max(11, base * 0.5), step = Math.max(0.5, base * 0.03);
    let fs = base;
    for (;;) {
      const lh = fs * LINE_H;
      mainEl.style.fontSize = fs + 'px';
      mainEl.style.lineHeight = lh + 'px';
      const lines = Math.round(mainEl.offsetHeight / lh);
      if (lines <= MAX_LINES || fs <= minFs) break;
      fs = Math.max(minFs, fs - step);
    }
  }

  // Fala de morador ("Nome: “…”"): o nome ganha destaque; o conteúdo entra sempre como texto puro.
  function renderMain(text) {
    const m = /^([^:“"]{1,40}): (“[\s\S]*)$/.exec(text);
    if (m) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = m[1] + ':';
      mainEl.replaceChildren(who, document.createTextNode(' ' + m[2]));
    } else mainEl.textContent = text;
  }

  let resizeQueued = false;
  addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => { resizeQueued = false; if (mainText) fitMain(); });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (mainText) fitMain(); }).catch(() => {});

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

    /** Linha de ajuda. "[E]" no texto vira uma tecla desenhada (mesmo estilo do balão "E — Entregar"). */
    setSub(text, tone = 'muted') {
      text = text == null ? '' : String(text);
      if (text !== subText) {
        subText = text;
        const parts = text.split(/\[(\w+)\]/);
        if (parts.length === 1) subEl.textContent = text;
        else subEl.replaceChildren(...parts.map((p, i) => {
          if (!(i % 2)) return document.createTextNode(p);
          const k = document.createElement('span');
          k.className = 'ahud-key'; k.textContent = p;
          return k;
        }));
      }
      if (tone !== subTone) { subTone = tone; subEl.dataset.tone = tone; }
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
      if (visible && label !== promptLabel) { promptLabel = label; promptTxt.textContent = '— ' + label; }
      if (!visible || !Number.isFinite(x) || !Number.isFinite(y)) {
        if (promptOn) { promptOn = false; prompt.classList.remove('on'); }
        return;
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
