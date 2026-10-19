// Controles de toque (celular/tablet). Só aparecem quando o jogador usa o toque; teclado e mouse continuam iguais.
// - Joystick (canto inferior esquerdo, ou onde o jogador o colocou): vira o eixo analógico do input (mesmo caminho do WASD).
// - Arrastar numa área livre da tela: gira a câmera (eventos sintéticos de "botão direito arrastando": usa as mesmas
//   regras, limites e bloqueios do mouse em todas as câmeras — 3ª pessoa, 1ª pessoa do Grillby's, nível extra).
// - Botões de ação: símbolos (SVG) sem letras de teclado; cada um tem nome acessível (aria-label/title). Ficam em
//   lugares fixos por controle (o mesmo botão no mesmo lugar em todos os modos) — padrão: coluna à direita, acima da DICA;
//   o jogador pode mudar nas Configurações ("Posição dos botões", editor abaixo). "hold" = tecla segurada enquanto o dedo está nele.
// - Helicóptero: Subir/Descer num controle só (▲ em cima, ▼ embaixo; dá para deslizar o dedo de um para o outro).
// - Tocar no balão de fala, no aviso, na indicação do lugar (entregar, conversar, entrar…), na fala do morador ou no
//   "Mudar o trajeto" do bonde = E.
// Multitoque: cada dedo (pointerId) é de uma coisa só (joystick, câmera ou botão).
// Posições salvas em 'adress.touchLayout.v1': { p: { id: [x, y] }, l: { … }, seen: [...] } — x, y em proporção da tela,
// separadas para tela em pé (p) e deitada (l); sempre presas à área visível (áreas seguras, barra do topo, DICA/MENU/♪).

const LKEY = 'adress.touchLayout.v1';
const BTN = 48, GAP = 12, EDGE = 12, JOY_R = 56;       // botão redondo (px), espaço entre botões, margem da borda, raio do joystick

// ---------- símbolos ----------
const dark = 'rgba(28,20,14,.62)';
const svg = (inner, vb = '0 0 24 24') => `<svg viewBox="${vb}" aria-hidden="true" focusable="false">${inner}</svg>`;
const S = (d, w = 2.2) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const F = (d, c = 'currentColor') => `<path d="${d}" fill="${c}"/>`;
const HELI = S('M2.6 4.8h15M10 4.8v3.1', 2) + F('M4.4 13c0-2.9 2.4-5.1 5.6-5.1h1.4c2.3 0 4.1 1.4 4.6 3.3l6 .7v2.5l-6 .5c-.7 1.3-2.2 2.1-4 2.1H8.1c-2 0-3.7-1.6-3.7-4z') +
  F('M6 12.2c.2-1.6 1.6-2.8 3.4-2.8h1.2v2.8z', dark) + S('M5.8 19.6h9.8M8 16.8v2.8M13.4 16.8v2.8', 1.9);
const badge = up => `<circle cx="18.2" cy="18.2" r="5.3" fill="#FF7A1A"/>` +
  `<path d="${up ? 'M18.2 21v-5.4M15.9 17.9l2.3-2.3 2.3 2.3' : 'M18.2 15.4v5.4M15.9 18.5l2.3 2.3 2.3-2.3'}" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
export const ICONS = {
  walk: svg(`<circle cx="13" cy="4" r="2.3" fill="currentColor"/>` + S('M8.2 21l2.6-6.3M10.8 14.7l1.3-6.2M12.1 8.5l-3.4 1.9-1.3 3.1M12.1 8.5l2.4 3 3.1 1M10.8 14.7l3.3 2.3.8 4', 2.4)),
  heli: svg(HELI),
  land: svg(`<g transform="translate(-.6 -1.2) scale(.86)">${HELI}</g>` + badge(false)),
  takeoff: svg(`<g transform="translate(-.6 -1.2) scale(.86)">${HELI}</g>` + badge(true)),
  missile: svg(F('M19.6 4.4c.5 2.7-.4 5.6-2.6 7.8l-5.2 5.2-5.2-5.2L11.8 7c2.2-2.2 5.1-3.1 7.8-2.6z') + F('M8.2 10.5L5 10.2l-2 2 3.6 1.4zM13.5 15.8l.3 3.2-2 2-1.4-3.6z') +
    F('M6.2 15.6c-1.6.4-2.6 1.7-3 4.2 2.5-.4 3.8-1.4 4.2-3z', '#FF9A3C') + `<circle cx="15.3" cy="8.7" r="1.6" fill="${dark}"/>`),
  overview: svg(`<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>` +
    [[6.3, 6.3], [13.1, 6.3], [6.3, 13.1], [13.1, 13.1]].map(([x, y]) => `<rect x="${x}" y="${y}" width="4.6" height="4.6" rx=".8" fill="currentColor"/>`).join('')),
  chase: svg(`<rect x="2.5" y="7" width="13" height="10" rx="2.2" fill="currentColor"/>` + F('M16.5 10.6l5-2.8v8.4l-5-2.8z') + `<circle cx="7.4" cy="12" r="2.1" fill="${dark}"/>`),
  up: svg(F('M12 5.5l7.5 10h-15z')),
  down: svg(F('M12 18.5l7.5-10h-15z')),
  play: svg(F('M8 5.2v13.6L19 12z')),
  list: svg(`<rect x="4.5" y="4" width="15" height="17.5" rx="2.2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8.5" y="2.5" width="7" height="3.6" rx="1.2" fill="currentColor"/>` +
    S('M7.8 11.3l1.6 1.6 2.6-2.8M7.8 16.3l1.6 1.6 2.6-2.8M14 11.8h2.8M14 16.8h2.8', 1.8)),
  robot: svg(S('M12 3.2v3.3', 2) + `<circle cx="12" cy="2.8" r="1.5" fill="currentColor"/><rect x="4.5" y="6.5" width="15" height="11.5" rx="3" fill="currentColor"/>` +
    `<circle cx="9.2" cy="11.5" r="1.7" fill="${dark}"/><circle cx="14.8" cy="11.5" r="1.7" fill="${dark}"/>` + `<path d="M9 15.2h6" stroke="${dark}" stroke-width="1.6" stroke-linecap="round"/>` +
    S('M2.6 10.3v4.4M21.4 10.3v4.4M8.4 18v3.2M15.6 18v3.2', 2.2)),
  shield: svg(F('M12 2.8l7.5 2.8v5.6c0 4.8-3.2 8.6-7.5 10-4.3-1.4-7.5-5.2-7.5-10V5.6z') + F('M12 5.6v13.2c-2.9-1.3-4.9-4.2-4.9-7.6V7.4z', dark)),
  reflect: svg(S('M3.5 4.3h17', 2.6) + S('M5 20.5l7-13 7 13M14.6 18.1l4.4 2.4.2-5', 2.2)),
  magnet: svg(`<path d="M6.2 3.5v8.6a5.8 5.8 0 0 0 11.6 0V3.5" fill="none" stroke="currentColor" stroke-width="4.2"/>` +
    `<path d="M6.2 3.5v3.4M17.8 3.5v3.4" stroke="#FF9A3C" stroke-width="4.2"/>`),
  pull: svg(S('M9.5 3.5v9.2a3.6 3.6 0 1 1-7.2 0', 2.4) + S('M2.3 12.7l-.1 2.6', 2.2) + S('M17.5 5v14.5M13.6 15.6l3.9 3.9 3.9-3.9', 2.4)),
  tap: svg(S('M8.4 6.4a4.4 4.4 0 0 1 7.2 0', 1.7) + F('M10.6 22l-3.5-4.6a1.5 1.5 0 0 1 2.3-1.9l1.4 1.4V10a1.5 1.5 0 0 1 3 0v4.6l3.9.7a2 2 0 0 1 1.6 2.3L18.6 22z')),
  drag: svg(F('M10.6 22l-3.5-4.6a1.5 1.5 0 0 1 2.3-1.9l1.4 1.4V10a1.5 1.5 0 0 1 3 0v4.6l3.9.7a2 2 0 0 1 1.6 2.3L18.6 22z') + S('M3.5 6.5h17M6.5 3.5l-3 3 3 3M17.5 3.5l3 3-3 3', 1.8)),
  joystick: svg(`<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8" opacity=".75"/><circle cx="13.6" cy="10.4" r="4.4" fill="currentColor"/>`),
};
const ACT_ICON = { Bloquear: 'shield', Refletir: 'reflect', Atrair: 'magnet', Puxar: 'pull' };
export const actionIcon = label => ACT_ICON[label] || 'shield';
const iconUrl = (name, color) => `url("data:image/svg+xml,${encodeURIComponent(ICONS[name].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" color="' + color + '" '))}")`;

// ---------- controles (um lugar por controle, o mesmo em todos os modos) ----------
// slot: [coluna (0 = encostada à direita, 1 = à esquerda dela), linha (0 = logo acima da DICA), linhas ocupadas]
const CTRL = {
  joy:     { name: 'Joystick' },
  cam:     { name: 'Câmera', icon: 'overview', slot: [0, 0] },
  sair:    { name: 'Descer a pé', icon: 'walk', slot: [0, 1] },
  heli:    { name: 'Helicóptero', icon: 'heli', slot: [0, 2] },
  decolar: { name: 'Decolar', icon: 'takeoff', slot: [0, 2] },
  missil:  { name: 'Míssil', icon: 'missile', slot: [0, 3] },
  altura:  { name: 'Subir / descer', rock: true, slot: [0, 1, 2] },
  pousar:  { name: 'Pousar', icon: 'land', slot: [1, 1.5] },
  jogar:   { name: 'Jogar', icon: 'play', slot: [0, 0] },
  missoes: { name: 'Missões', icon: 'list', slot: [0, 1] },
  acao:    { name: 'Ação', icon: 'shield', word: 'Bloquear', slot: [0, 0] },
  puxar:   { name: 'Puxar', icon: 'pull', word: 'Puxar', slot: [0, 1] },
  robo:    { name: 'Robô', icon: 'robot', word: 'Robô', slot: [0, 0] },
};
// Modos mostrados no editor (só para a prévia: as posições são por controle). hidden = só depois de aparecer no jogo.
const CONTEXTS = [
  { id: 'van', name: 'Van', ids: ['cam', 'sair', 'heli', 'missil'], note: 'Vale também para a lancha de Veneza. Helicóptero e Míssil só no Modo Livre.' },
  { id: 'pe', name: 'A pé', ids: ['cam'] },
  { id: 'heli', name: 'Helicóptero', ids: ['cam', 'altura', 'pousar', 'missil'] },
  { id: 'pousado', name: 'Pousado', ids: ['cam', 'sair', 'decolar', 'missil'], note: 'Pousado no terraço de um prédio.' },
  { id: 'mapa', name: 'Mapa', ids: ['jogar', 'missoes'], note: 'Mapa da Carreira.' },
  { id: 'batalha', name: 'Batalha', ids: ['acao', 'puxar'], hidden: true },
  { id: 'robo', name: 'Robô', ids: ['robo'], hidden: true },
];
const SEEN_BY = { acao: 'batalha', puxar: 'batalha', robo: 'robo' };

// ---------- posições salvas ----------
let store = load(), storeVer = 0;
function load() {
  const s = { p: {}, l: {}, seen: [] };
  try {
    const v = JSON.parse(localStorage.getItem(LKEY) || 'null');
    if (v && typeof v === 'object') for (const o of ['p', 'l']) if (v[o] && typeof v[o] === 'object') for (const id in v[o]) {
      const q = v[o][id]; if (CTRL[id] && Array.isArray(q) && q.length === 2 && q.every(n => Number.isFinite(n))) s[o][id] = [Math.min(1, Math.max(0, q[0])), Math.min(1, Math.max(0, q[1]))];
    }
    if (v && Array.isArray(v.seen)) s.seen = v.seen.filter(x => CONTEXTS.some(c => c.id === x));
  } catch (e) { /* ignora */ }
  return s;
}
function persist() { try { localStorage.setItem(LKEY, JSON.stringify(store)); } catch (e) { /* ignora */ } storeVer++; }
const orientOf = (W, H) => (H >= W ? 'p' : 'l');

/** Aparelho de toque (para mostrar o editor nas Configurações). */
export function isTouchDevice() {
  try { return (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
}

// ---------- geometria ----------
let probe = null;
function insets() {                                     // áreas seguras (entalhe, barra de gestos) em px
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
}
function geometry(top) { const W = innerWidth, H = innerHeight, ins = insets(); return { W, H, ins, top: Math.max(top || 0, ins.t + 8), o: orientOf(W, H) }; }
const BASE = g => Math.max(64, g.H * 0.11);            // 1ª linha de botões: acima da DICA/MENU
function slotCenter(id, g, w, h) {
  const s = CTRL[id].slot || [0, 0], span = s[2] || 1;
  const right = g.W - g.ins.r - EDGE;
  const x = s[0] === 0 ? right - Math.max(BTN, w) / 2 : right - BTN - GAP * 1.2 - (s[0] - 1) * (BTN + GAP) - Math.max(BTN, w) / 2;
  const row0 = g.H - g.ins.b - BASE(g) - BTN / 2;
  const step = Math.max(BTN + 2, Math.min(BTN + GAP, (row0 - (g.top + BTN / 2)) / 3));   // telas baixas: aperta o espaço (4 linhas cabem)
  return [x, row0 - (s[1] + (span - 1) / 2) * step];
}
function joyDefault(g) { return [26 + JOY_R + g.ins.l, g.H - (Math.max(84, g.H * 0.14) + JOY_R + g.ins.b)]; }
/** Retângulos dos botões fixos (DICA, MENU, ♪, Voltar, MISSÕES, cadeado) que os controles não podem cobrir. */
function reservedRects(root = document) {
  const out = [];
  for (const e of root.querySelectorAll('.hint-btn, .menu-btn, .music-btn, .missions-btn.on, .back-btn.on, .lock-btn.on')) {
    if (root === document && e.closest('.tl-ed')) continue;
    const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (root === document && getComputedStyle(e).visibility === 'hidden') continue;
    out.push({ l: r.left, t: r.top, r: r.right, b: r.bottom });
  }
  return out;
}
/** Prende o centro (x, y) de um controle w × h à área visível e o tira de cima dos botões fixos. */
function fit(x, y, w, h, g, res) {
  const lo = (a, b, v) => Math.min(Math.max(v, a), Math.max(a, b));
  const clamp = () => { x = lo(g.ins.l + w / 2 + 4, g.W - g.ins.r - w / 2 - 4, x); y = lo(g.top + h / 2, g.H - g.ins.b - h / 2 - 4, y); };
  clamp();
  for (let k = 0; k < 3; k++) {
    let moved = false;
    for (const R of res) {
      if (x + w / 2 <= R.l - 6 || x - w / 2 >= R.r + 6 || y + h / 2 <= R.t - 6 || y - h / 2 >= R.b + 6) continue;
      if ((R.t + R.b) / 2 > g.H / 2) y = R.t - 6 - h / 2; else y = R.b + 6 + h / 2;   // de baixo: sobe; de cima: desce
      moved = true;
    }
    clamp(); if (!moved) break;
  }
  return [Math.round(x), Math.round(y)];
}
/** Centro de um controle: posição salva (proporcional) ou o lugar padrão; sempre dentro da tela. */
function placeOf(id, g, w, h, res, saved) {
  const q = saved && saved[id];
  const c = q ? [q[0] * g.W, q[1] * g.H] : id === 'joy' ? joyDefault(g) : slotCenter(id, g, w, h);
  return fit(c[0], c[1], w, h, g, res);
}

// ---------- desenho de um controle (o mesmo no jogo e no editor) ----------
function buttonHTML(a, icon, word) {
  return (ICONS[icon] || '') + (word ? `<span>${word}</span>` : '');
}
function makeControl(id, acts) {                        // acts: [{ key, label, icon, hold, word }] (no editor: exemplos)
  const d = CTRL[id];
  if (d.rock) {
    const el = document.createElement('div'); el.className = 'tc-rock'; el.dataset.id = id;
    const [up, dn] = acts;
    el.innerHTML = `<div class="tc-btn tc-half up" role="button" data-key="${up.key}" data-hold="1" aria-label="${up.label}" title="${up.label}">${ICONS.up}</div>` +
      `<div class="tc-btn tc-half dn" role="button" data-key="${dn.key}" data-hold="1" aria-label="${dn.label}" title="${dn.label}">${ICONS.down}</div>`;
    return el;
  }
  const a = acts[0], word = a.word || d.word;
  const el = document.createElement('div'); el.className = 'tc-btn' + (word ? ' pill' : ''); el.dataset.id = id;
  el.dataset.key = a.key; el.dataset.hold = a.hold ? '1' : '0'; el.setAttribute('role', 'button');
  el.setAttribute('aria-label', a.label); el.title = a.label;
  el.innerHTML = buttonHTML(a, a.icon || d.icon, word);
  return el;
}

const CSS = `
.tc-zone { position: fixed; left: 0; top: 40vh; width: 42vw; height: 50vh; z-index: 2; display: none; touch-action: none; }
body.touch-on .tc-zone.on { display: block; }
.tc-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; pointer-events: none; box-sizing: border-box;
  border: 2px solid rgba(255,243,214,.55); background: radial-gradient(circle, rgba(28,20,14,.28), rgba(28,20,14,.12)); opacity: .5; transition: opacity .15s; }
.tc-zone.held .tc-base { opacity: .9; }
.tc-knob { position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%;
  background: rgba(255,243,214,.8); border: 2px solid #FF7A1A; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.tc-acts { position: fixed; inset: 0; z-index: 30; display: none; pointer-events: none; touch-action: none; }
body.touch-on .tc-acts.on { display: block; }
/* botões: discretos (translúcidos, como o joystick), símbolo creme; a área de toque passa do desenho (::after) */
.tc-btn, .tc-rock { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); box-sizing: border-box; pointer-events: auto; touch-action: none;
  user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; -webkit-touch-callout: none; }
.tc-btn { width: ${BTN}px; height: ${BTN}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; gap: 6px;
  color: #FFF3D6; background: rgba(28,20,14,.44); border: 2px solid rgba(255,243,214,.72); box-shadow: 0 2px 6px rgba(0,0,0,.25);
  font: 800 14px/1 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; letter-spacing: .02em; transition: background .08s, scale .08s; }
.tc-btn svg { width: 27px; height: 27px; flex: none; display: block; filter: drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
.tc-btn::after { content: ''; position: absolute; inset: -8px; border-radius: 999px; }
.tc-btn.pill { width: max-content; white-space: nowrap; min-width: ${BTN}px; border-radius: 999px; padding: 0 15px 0 11px; }
.tc-btn.pill svg { width: 24px; height: 24px; }
.tc-btn.pill span { text-shadow: 0 1px 1px rgba(0,0,0,.35); }
.tc-btn.down { background: #FF7A1A; border-color: #FFF3D6; scale: .94; }
/* helicóptero: ▲ em cima, ▼ embaixo, no mesmo controle */
.tc-rock { width: ${BTN}px; height: ${BTN * 2 + 8}px; border-radius: ${BTN / 2}px; display: flex; flex-direction: column;
  background: rgba(28,20,14,.44); border: 2px solid rgba(255,243,214,.72); box-shadow: 0 2px 6px rgba(0,0,0,.25); }
.tc-rock::after { content: ''; position: absolute; left: 9px; right: 9px; top: 50%; height: 2px; margin-top: -1px; border-radius: 1px; background: rgba(255,243,214,.45); pointer-events: none; }
.tc-rock .tc-half { position: relative; left: auto; top: auto; transform: none; width: 100%; height: 50%; flex: 1 1 50%; border: 0; box-shadow: none; background: transparent; }
.tc-rock .tc-half.up { border-radius: ${BTN / 2}px ${BTN / 2}px 0 0; }
.tc-rock .tc-half.dn { border-radius: 0 0 ${BTN / 2}px ${BTN / 2}px; }
.tc-rock .tc-half::after { inset: -8px -8px 0; }
.tc-rock .tc-half.dn::after { inset: 0 -8px -8px; }
.tc-rock .tc-half.down { background: #FF7A1A; scale: 1; }
.tc-rock .tc-half svg { width: 24px; height: 24px; }
body.touch-on .ahud-prompt.on { pointer-events: auto; touch-action: none; }
body.touch-on .ahud-prompt.on::after { content: ''; position: absolute; inset: -16px; }
body.touch-on .talkbox, body.touch-on .gamenote { pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; }
body.touch-on .talkbox-next, body.touch-on .gamenote-ok { font-size: 0 !important; }
body.touch-on .talkbox-next::before { content: 'Toque ▸'; font-size: 14px; }
body.touch-on .gamenote-ok::before { content: 'Toque ▸ OK'; font-size: 14px; }
body.touch-on .ahud-main.tc-tap { pointer-events: auto; cursor: pointer; }
body.touch-on, body.touch-on .ahud { -webkit-touch-callout: none; }
body.touch-on { overscroll-behavior: none; }
/* sem teclas de computador no toque: o mapa da Carreira mostra os mesmos símbolos dos botões; MISSÕES fecha sem "(M)"; o bonde: tocar no pedido */
body.touch-on .cmap-prompt .ks b { display: inline-block; width: 1.3em; height: 1.3em; padding: 0; color: transparent; overflow: hidden; vertical-align: -.25em; line-height: 1.3em;
  background: #e8661a ${iconUrl('play', '#fff')} center / 72% no-repeat; }
body.touch-on .cmap-prompt .ks b ~ b { background-image: ${iconUrl('list', '#fff')}; }
body.touch-on .missions-close { font-size: 0 !important; padding: calc(clamp(13px, 1.1vw, 16px) * .45) clamp(13px, 1.1vw, 16px); }
body.touch-on .missions-close::before { content: '✕ Fechar'; font: 800 clamp(13px, 1.1vw, 16px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
body.touch-on .trolley-ui .k:not(.off) { pointer-events: auto; cursor: pointer; touch-action: none; }
@media (max-width: 560px) { body.touch-on .trolley-ui .k { bottom: calc(9vh + 52px); } }   /* (celular em pé: acima dos créditos da música) */
body.touch-on .trolley-ui .k b { color: transparent; overflow: hidden; width: 1.4em; height: 1.4em; min-width: 0; padding: 0; line-height: 1.4em; vertical-align: -.3em; border-radius: 50%; background: #ff7a1a ${iconUrl('tap', '#fff')} center / 74% no-repeat; }
.tc-cue { position: fixed; left: 50%; top: 64px; z-index: 31; display: none; transform: translateX(-50%); padding: 6px 14px; border-radius: 999px;
  background: #FFF3D6; border: 2px solid #FF7A1A; color: #c2570c; font: 800 13px/1 system-ui, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,.25);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; animation: tc-cue 1.4s ease-in-out infinite; }
body.touch-on .tc-cue.on { display: block; }
@keyframes tc-cue { 50% { transform: translateX(-50%) translateY(2px); } }
canvas.tc-canvas { touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }

/* ---------- editor de posições (Configurações) ---------- */
.tl-ed { position: fixed; inset: 0; z-index: 70; display: none; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none;
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; color: #2e1d10;
  background: linear-gradient(90deg, transparent 39%, #e9d9a8 39%, #e9d9a8 40%, #5f646b 40%, #5f646b 60%, #e9d9a8 60%, #e9d9a8 61%, transparent 61%) 0 52% / 100% 100% no-repeat,
    linear-gradient(#bfe3f5 0%, #dcf0f8 34%, #93c86b 34%, #7fb75a 100%); }
.tl-ed::before { content: ''; position: absolute; left: 50%; top: 34%; bottom: 0; width: 0; border-left: 3px dashed rgba(255,214,90,.75); pointer-events: none; }
.tl-ed.on { display: block; }
.tl-bar { position: absolute; left: 0; right: 0; top: 0; box-sizing: border-box; display: flex; flex-wrap: wrap; align-content: center; align-items: center; gap: 6px 10px;
  padding: max(5px, env(safe-area-inset-top, 0px)) max(12px, env(safe-area-inset-right, 0px)) 5px max(12px, env(safe-area-inset-left, 0px));
  background: #fff3d6 linear-gradient(#fff7e2, #fff3d6 55%, #ffefcc); border-bottom: 3px solid #e6cc98; z-index: 3; }
.tl-tabs { display: flex; gap: 6px; flex: 1 1 100%; min-width: 0; overflow-x: auto; scrollbar-width: none; touch-action: pan-x; }
.tl-tabs::-webkit-scrollbar { display: none; }
.tl-tab { flex: none; min-height: 40px; padding: 0 11px; border-radius: 999px; border: 2px solid #e6cc98; background: #fff; color: #5a3c1e; font: 800 13px/1 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; cursor: pointer; }
.tl-tab.on { background: #ff7a1a; border-color: #ff7a1a; color: #fff; }
.tl-btns { display: flex; gap: 8px; flex: 1 1 100%; justify-content: flex-end; }
.tl-b { min-height: 40px; padding: 0 14px; border-radius: 12px; border: 3px solid #ff7a1a; background: #fff; color: #2e1d10; font: 800 14px/1 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; cursor: pointer; }
.tl-b.pri { background: #ff7a1a; color: #fff; }
.tl-b.ghost { border-color: #c9ad86; color: #6b4a26; }
@media (min-aspect-ratio: 1/1) { .tl-tabs { flex: 1 1 0; } .tl-btns { flex: none; } }
.tl-note { position: absolute; left: 50%; transform: translateX(-50%); width: max-content; max-width: min(88vw, 460px); box-sizing: border-box; padding: 7px 14px;
  border-radius: 12px; background: rgba(255,243,214,.95); border: 2px solid #ff7a1a; color: #3a2a1a; font: 700 13px/1.35 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; text-align: center; pointer-events: none; z-index: 2; }
.tl-note b { color: #c2570c; }
.tl-note small { display: block; font-weight: 600; color: #7a5536; }
.tl-ed .tl-ghost { pointer-events: none !important; visibility: visible !important; opacity: .5; }
.tl-ed .hint-btn kbd { display: none; }
.tl-zone { position: absolute; border: 2px dashed rgba(255,243,214,.5); border-radius: 18px; background: rgba(255,243,214,.06); pointer-events: none; }
.tl-item { position: absolute; left: 0; top: 0; z-index: 1; cursor: grab; touch-action: none; }
.tl-item > .tc-btn, .tl-item > .tc-rock { outline: 2px dashed rgba(255,243,214,.9); outline-offset: 4px; }
.tl-item > .tc-base { position: absolute; left: 0; top: 0; margin: 0; transform: translate(-50%, -50%); opacity: .95; outline: 2px dashed rgba(255,243,214,.9); outline-offset: 4px; pointer-events: auto; }
.tl-item.drag { z-index: 4; cursor: grabbing; }
.tl-item.drag > .tc-btn, .tl-item.drag > .tc-rock, .tl-item.drag > .tc-base { outline-color: #ff7a1a; outline-style: solid; }
.tl-item.clash > .tc-btn, .tl-item.clash > .tc-rock, .tl-item.clash > .tc-base { outline: 3px solid #ff4a3a; }
.tl-tag.l { transform: translate(-100%, -50%); }
.tl-tag.u { transform: translate(-50%, -100%); } .tl-tag.d { transform: translate(-50%, 0); } .tl-tag.off { display: none; }
.tl-ed.dragging .tl-note { opacity: .18; }
.tl-tag { position: absolute; left: 0; top: 0; transform: translate(0, -50%); width: max-content; white-space: nowrap; padding: 2px 8px; border-radius: 999px;
  background: rgba(28,20,14,.82); color: #fff3d6; font: 700 11.5px/1.3 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; pointer-events: none; z-index: 1; }
.tl-toast { position: absolute; left: 50%; bottom: 34%; transform: translateX(-50%); max-width: min(86vw, 420px); padding: 9px 16px; border-radius: 12px;
  background: rgba(28,20,14,.9); color: #fff3d6; font: 700 14px/1.35 "Trebuchet MS", "Segoe UI", system-ui, sans-serif; text-align: center; pointer-events: none; opacity: 0; transition: opacity .2s; z-index: 5; }
.tl-toast.on { opacity: 1; }
`;
let cssDone = false;
function injectCSS() { if (cssDone) return; cssDone = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }

export function createTouch({ input, canvas }) {
  injectCSS();
  canvas.classList.add('tc-canvas');
  const zone = document.createElement('div'); zone.className = 'tc-zone';
  const base = document.createElement('div'); base.className = 'tc-base'; base.innerHTML = '<div class="tc-knob"></div>';
  const knob = base.firstChild; zone.appendChild(base); document.body.appendChild(zone);
  const acts = document.createElement('div'); acts.className = 'tc-acts'; document.body.appendChild(acts);
  // fala do morador na barra de cima: no toque não há a dica "[E] continuar" — um aviso logo abaixo da barra mostra que é só tocar
  const cue = document.createElement('div'); cue.className = 'tc-cue'; cue.textContent = 'Toque para continuar ▸'; document.body.appendChild(cue);
  let cueTop = -1;

  let touchOn = false, joyOn = false, lookOn = false, dialogTap = false;
  const R = 46;                                         // raio útil do joystick (px)
  let joy = null;                                       // { id, cx, cy }
  let look = null;                                      // { id, x, y }
  const holds = new Map();                              // pointerId → código segurado
  const rockOf = new Map();                             // pointerId → controle Subir/Descer (deslizar o dedo troca a metade)
  let homePos = null, zoneBox = null;                   // descanso do joystick e a área onde ele aparece (calculados no layout)
  const home = () => {
    if (homePos) return { x: homePos[0], y: homePos[1] };
    const g = geometry(0), d = joyDefault(g); return { x: d[0], y: d[1] };
  };
  const placeBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
  function endJoy() { joy = null; zone.classList.remove('held'); input.touchAxis(0, 0); setKnob(0, 0); const h = home(); placeBase(h.x, h.y); }
  function mouse(type, x, y, mx = 0, my = 0) {           // "botão direito arrastando" para os controles de câmera que já existem
    const ev = new MouseEvent(type, { button: 2, buttons: type === 'mouseup' ? 0 : 2, clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(ev, 'movementX', { value: mx }); Object.defineProperty(ev, 'movementY', { value: my });
    dispatchEvent(ev);
  }
  function endLook() { if (!look) return; mouse('mouseup', look.x, look.y); look = null; }
  const holding = code => [...holds.values()].includes(code);
  const btnOf = code => acts.querySelector(`[data-key="${code}"]`);
  function releaseHolds(keep) {
    for (const [id, code] of holds) if (!keep || !keep.has(code)) {
      holds.delete(id); rockOf.delete(id);
      if (!holding(code)) { input.touchHold(code, false); const b = btnOf(code); if (b) b.classList.remove('down'); }
    }
  }
  function resetAll() { endJoy(); endLook(); releaseHolds(); input.touchReset(); }

  function setMode(on) {
    if (on === touchOn) return;
    touchOn = on; document.body.classList.toggle('touch-on', on);
    if (!on) resetAll();
  }
  // modo toque: o 1º toque liga; teclado ou mouse de verdade desligam (aparelhos híbridos alternam sem recarregar)
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') setMode(true); else if (e.pointerType === 'mouse') setMode(false); }, true);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && touchOn && (Math.abs(e.movementX) + Math.abs(e.movementY)) > 2) setMode(false); }, true);
  addEventListener('keydown', e => { if (e.isTrusted && touchOn) setMode(false); }, true);
  addEventListener('blur', resetAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });

  // joystick (aparece onde o dedo encosta, dentro da área dele)
  zone.addEventListener('pointerdown', e => {
    if (joy || !joyOn) return;
    e.preventDefault(); zone.setPointerCapture(e.pointerId);
    const h = home(), zb = zoneBox || { l: 0, r: innerWidth * 0.42, t: innerHeight * 0.4 };
    const x = zb.r - zb.l > 120 ? Math.max(zb.l + 60, Math.min(e.clientX, zb.r - 60)) : h.x;
    const y = Math.max(Math.min(zb.t + 56, h.y), Math.min(e.clientY, h.y));   // (nunca abaixo do descanso: não cobre MENU e música)
    joy = { id: e.pointerId, cx: x || h.x, cy: y || h.y }; placeBase(joy.cx, joy.cy); zone.classList.add('held'); moveJoy(e);
  });
  function moveJoy(e) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    setKnob(dx, dy);
    const k = Math.min(1, d / R), dead = 0.18, m = k < dead ? 0 : (k - dead) / (1 - dead);
    input.touchAxis(d ? dx / Math.min(d, R) * m : 0, d ? dy / Math.min(d, R) * m : 0);
  }
  zone.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) moveJoy(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, e => { if (joy && e.pointerId === joy.id) endJoy(); });
  zone.addEventListener('contextmenu', e => e.preventDefault());

  // câmera: arrastar o dedo numa área livre (o próprio canvas do jogo; botões e balões ficam por cima dele)
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    e.preventDefault();
    if (look || !lookOn) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    look = { id: e.pointerId, x: e.clientX, y: e.clientY }; mouse('mousedown', e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    const mx = (e.clientX - look.x) * 1.3, my = (e.clientY - look.y) * 1.3;
    look.x = e.clientX; look.y = e.clientY; mouse('mousemove', e.clientX, e.clientY, mx, my);
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(t, e => { if (look && e.pointerId === look.id) endLook(); });
  canvas.addEventListener('contextmenu', e => { if (touchOn) e.preventDefault(); });

  // balão de fala, aviso, indicação do lugar, fala do morador e o "Mudar o trajeto" do bonde: um toque = um aperto de E
  addEventListener('pointerdown', e => {
    if (!touchOn || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
    const t = e.target.closest ? e.target : e.target.parentElement;
    if (!t || !t.closest || t.closest('.tl-ed')) return;
    const prm = t.closest('.ahud-prompt.on') || document.elementsFromPoint(e.clientX, e.clientY).some(x => x.closest && x.closest('.ahud-prompt.on'));   // a indicação do lugar tem prioridade
    if (prm || t.closest('.talkbox') || t.closest('.gamenote') || t.closest('.trolley-ui .k:not(.off)') || (dialogTap && (t.closest('.ahud-main') || t.closest('.tc-cue')))) {
      e.preventDefault(); e.stopPropagation(); input._press('KeyE');
    }
  }, true);

  // botões de ação
  function hold(pid, code, el) {
    holds.set(pid, code); input.touchHold(code, true); if (el) el.classList.add('down');
  }
  function unhold(pid) {
    const code = holds.get(pid); if (!code) return;
    holds.delete(pid); rockOf.delete(pid);
    if (!holding(code)) { input.touchHold(code, false); const b = btnOf(code); if (b) b.classList.remove('down'); }
  }
  acts.addEventListener('pointerdown', e => {
    const b = e.target.closest('.tc-btn'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const code = b.dataset.key;
    if (b.dataset.hold === '1') {
      const rock = b.closest('.tc-rock');
      try { (rock || b).setPointerCapture(e.pointerId); } catch (err) { /* */ }
      if (rock) rockOf.set(e.pointerId, rock);
      hold(e.pointerId, code, b);
    } else { input._press(code); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140); }
  });
  acts.addEventListener('pointermove', e => {                         // Subir/Descer: deslizar o dedo de uma metade para a outra troca o comando
    const rock = rockOf.get(e.pointerId); if (!rock) return;
    const r = rock.getBoundingClientRect(), half = rock.querySelector(e.clientY < r.top + r.height / 2 ? '.up' : '.dn');
    if (!half || holds.get(e.pointerId) === half.dataset.key) return;
    unhold(e.pointerId); rockOf.set(e.pointerId, rock); hold(e.pointerId, half.dataset.key, half);
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) acts.addEventListener(t, e => unhold(e.pointerId));
  acts.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- layout: cada controle no lugar dele ----------
  let actKey = '', layKey = '', frame = 0, built = [];   // built: [{ id, el }]
  function layout(top) {
    const g = geometry(top), res = reservedRects(), saved = store[g.o];
    for (const c of built) {
      const w = c.el.offsetWidth || BTN, h = c.el.offsetHeight || BTN;
      const [x, y] = placeOf(c.id, g, w, h, res, saved);
      if (c.x !== x || c.y !== y) { c.x = x; c.y = y; c.el.style.left = x + 'px'; c.el.style.top = y + 'px'; }
    }
    // joystick: descanso e área (padrão: canto inferior esquerdo, como antes)
    const hp = placeOf('joy', g, JOY_R * 2, JOY_R * 2, res, saved);
    let zb;
    if (saved.joy) {
      const zw = Math.max(g.W * 0.42, 220), zh = g.H * 0.5, l = Math.min(Math.max(0, hp[0] - zw * 0.45), Math.max(0, g.W - zw));
      const b = Math.min(g.H - g.ins.b, hp[1] + JOY_R + 40), t = Math.max(g.top, b - zh);
      zb = { l, r: l + zw, t, b };
    } else {
      const b = g.H - Math.max(62, g.H * 0.1); zb = { l: 0, r: g.W * 0.42 + g.ins.l, t: Math.max(g.top, b - g.H * 0.5), b };
    }
    // a área fica POR CIMA de DICA, MENU, ♪ e MISSÕES (camadas diferentes): nunca se estende sobre eles (o joystick movido
    // para perto da DICA deixava a DICA sem resposta ao toque)
    for (const R of res) {
      if (R.r <= zb.l || R.l >= zb.r || R.b <= zb.t || R.t >= zb.b) continue;
      if ((R.t + R.b) / 2 >= hp[1]) zb.b = Math.min(zb.b, R.t - 4); else zb.t = Math.max(zb.t, R.b + 4);
    }
    zoneBox = zb; homePos = hp;
    Object.assign(zone.style, { left: zb.l + 'px', top: zb.t + 'px', width: (zb.r - zb.l) + 'px', height: (zb.b - zb.t) + 'px' });
    if (!joy) placeBase(hp[0], hp[1]);
  }

  return {
    get on() { return touchOn; },
    /** Por quadro (main.updateHUD): o que pode aparecer agora. actions: [{ id, key, label, icon, hold, word }]
     *  (id = controle; dois com o mesmo id 'altura' = Subir/Descer juntos). */
    update({ joystick = false, look: lk = false, actions = [], dialog = false, top = 64 } = {}) {
      if (!touchOn) { if (joyOn || lookOn) { joyOn = lookOn = false; zone.classList.remove('on'); acts.classList.remove('on'); } return; }
      if (dialog !== dialogTap) cue.classList.toggle('on', dialog);
      if (dialog && Math.round(top) !== cueTop) { cueTop = Math.round(top); cue.style.top = (cueTop + 40) + 'px'; }   // (abaixo do cronômetro e do MISSÕES)
      dialogTap = dialog;
      const main = document.querySelector('.ahud-main'); if (main) main.classList.toggle('tc-tap', dialog);
      if (joystick !== joyOn) { joyOn = joystick; zone.classList.toggle('on', joystick); if (!joystick) endJoy(); else if (!joy) endJoy(); }
      if (lk !== lookOn) { lookOn = lk; if (!lk) endLook(); }
      const key = actions.map(a => a.id + ':' + a.key + a.label + a.icon + (a.word || '') + (a.hold ? 'h' : '')).join('|');
      if (key !== actKey) {
        actKey = key;
        releaseHolds(new Set(actions.filter(a => a.hold).map(a => a.key)));
        acts.textContent = ''; built = [];
        const groups = new Map();
        for (const a of actions) { if (!CTRL[a.id]) continue; if (!groups.has(a.id)) groups.set(a.id, []); groups.get(a.id).push(a); }
        for (const [id, list] of groups) {
          if (CTRL[id].rock && list.length < 2) continue;
          const el = makeControl(id, list); acts.appendChild(el); built.push({ id, el });
          for (const b of el.classList.contains('tc-btn') ? [el] : el.querySelectorAll('.tc-btn')) if (b.dataset.hold === '1' && holding(b.dataset.key)) b.classList.add('down');
          const seen = SEEN_BY[id];
          if (seen && !store.seen.includes(seen)) { store.seen.push(seen); persist(); }
        }
        layKey = '';
      }
      acts.classList.toggle('on', built.length > 0);
      // posições: só quando algo muda (tela, barra, lista, posições salvas) e, por segurança, a cada ~½ s (botões fixos que aparecem/somem)
      const lk2 = innerWidth + 'x' + innerHeight + '|' + Math.round(top) + '|' + storeVer + '|' + actKey + '|' + (joyOn ? 1 : 0);
      if (lk2 !== layKey || ++frame >= 30) { layKey = lk2; frame = 0; if (joyOn || built.length) layout(top); }
    },
    reset: resetAll,
  };
}

// ---------- editor de posições (Configurações → Controles → Posição dos botões) ----------
// Prévia por modo (as abas só filtram o que aparece junto); arrastar não aciona nada no jogo (elementos próprios).
// Salvar grava; Cancelar descarta; Restaurar padrão volta tudo ao lugar original (vale depois de Salvar).
let ed = null;
export function openTouchEditor({ onClose } = {}) {
  injectCSS();
  if (ed) ed.remove();
  const root = document.createElement('div'); root.className = 'tl-ed on'; ed = root;
  const tabsHtml = () => CONTEXTS.filter(c => !c.hidden || store.seen.includes(c.id))
    .map(c => `<button type="button" class="tl-tab" data-ctx="${c.id}">${c.name}</button>`).join('');
  root.innerHTML = `<div class="tl-bar"><div class="tl-tabs" role="tablist">${tabsHtml()}</div>
    <div class="tl-btns"><button type="button" class="tl-b ghost" data-a="def">Restaurar padrão</button><button type="button" class="tl-b" data-a="cancel">Cancelar</button><button type="button" class="tl-b pri" data-a="save">Salvar</button></div></div>
    <div class="tl-note"></div><div class="tl-toast"></div>`;
  document.body.appendChild(root);
  const bar = root.querySelector('.tl-bar'), note = root.querySelector('.tl-note'), toast = root.querySelector('.tl-toast');
  // botões fixos do jogo (só referência): mesmas classes, então ficam exatamente onde ficam na partida
  const ghosts = document.createElement('div');
  ghosts.innerHTML = `<button type="button" class="hint-btn tl-ghost" data-state="ready">${document.querySelector('.hint-btn') ? document.querySelector('.hint-btn').innerHTML || '<span>DICA</span>' : '<span>DICA</span>'}</button>` +
    `<button type="button" class="menu-btn tl-ghost">MENU</button><button type="button" class="music-btn tl-ghost">${document.querySelector('.music-btn') ? document.querySelector('.music-btn').innerHTML : '♪'}</button>`;
  for (const n of [...ghosts.children]) { n.tabIndex = -1; root.appendChild(n); }
  const zoneEl = document.createElement('div'); zoneEl.className = 'tl-zone'; root.appendChild(zoneEl);

  const draft = { p: { ...store.p }, l: { ...store.l } };
  let ctx = 'van', items = [], drag = null, toastT = 0, dirty = false;

  function topOfGame() {                                // fim da barra do topo na partida (+8), medido numa cópia invisível
    const hud = document.querySelector('.ahud'); let h = 0;
    if (hud) {
      const r = hud.getBoundingClientRect();
      if (r.height > 0) h = r.bottom;
      else {
        const c = hud.cloneNode(true); c.style.cssText = 'position:fixed;left:0;top:0;width:100vw;visibility:hidden;pointer-events:none;';
        c.style.setProperty('display', 'grid', 'important'); document.body.appendChild(c); h = c.offsetHeight; c.remove();
      }
    }
    return (h || (innerHeight >= innerWidth ? 120 : 56)) + 8;
  }
  function geo() { return geometry(topOfGame()); }
  const ctxDef = () => CONTEXTS.find(c => c.id === ctx);
  const sample = id => {                                // exemplos para a prévia
    if (id === 'altura') return [{ key: 'Space', label: 'Subir' }, { key: 'ShiftLeft', label: 'Descer' }];
    if (id === 'acao') return [{ key: 'Space', label: 'Ação', icon: 'shield', word: 'Bloquear' }];
    return [{ key: '', label: CTRL[id].name }];
  };
  function render() {
    for (const it of items) { it.wrap.remove(); it.tag.remove(); }   // (o invólucro inteiro: não deixa .tl-item vazios a cada troca de aba)
    items = [];
    const g = geo(), res = reservedRects(root), o = g.o;
    bar.style.minHeight = (g.top - 8) + 'px';
    root.querySelectorAll('.tl-tab').forEach(b => b.classList.toggle('on', b.dataset.ctx === ctx));
    const d = ctxDef();
    note.style.top = (Math.max(g.top - 8, bar.offsetHeight) + 10) + 'px';
    note.innerHTML = `<b>Arraste os controles.</b> ${o === 'p' ? 'Tela em pé' : 'Tela deitada'}: gire o aparelho para ajustar a outra.` +
      `<small>${d.note ? d.note + ' ' : ''}O mesmo controle fica no mesmo lugar em todos os modos.</small>`;
    for (const id of ['joy', ...d.ids]) {
      const wrap = document.createElement('div'); wrap.className = 'tl-item'; wrap.dataset.id = id;
      let el;
      if (id === 'joy') { el = document.createElement('div'); el.className = 'tc-base'; el.innerHTML = '<div class="tc-knob"></div>'; }
      else el = makeControl(id, sample(id));
      el.removeAttribute('title'); wrap.appendChild(el); root.appendChild(wrap);
      const tag = document.createElement('div'); tag.className = 'tl-tag'; tag.textContent = CTRL[id].name; root.appendChild(tag);
      const it = { id, wrap, el, tag, w: id === 'joy' ? JOY_R * 2 : el.offsetWidth || BTN, h: id === 'joy' ? JOY_R * 2 : el.offsetHeight || BTN };
      [it.x, it.y] = placeOf(id, g, it.w, it.h, res, draft[o]);
      items.push(it); put(it);
    }
    zoneEl.style.display = 'none';
    clashes(); tags();
  }
  function put(it) {
    it.wrap.style.left = it.x + 'px'; it.wrap.style.top = it.y + 'px';
    it.el.style.left = '0px'; it.el.style.top = '0px';
  }
  /** Nomes ao lado de cada controle: o 1º lado livre (para o meio da tela, o outro, em cima, embaixo) que não cobre controle nem outro nome. */
  function tags() {
    const boxes = items.map(i => ({ l: i.x - i.w / 2 - 3, r: i.x + i.w / 2 + 3, t: i.y - i.h / 2 - 3, b: i.y + i.h / 2 + 3 })), placed = [];
    const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    for (const it of items) {
      const tw = it.tag.offsetWidth || 60, th = it.tag.offsetHeight || 18, inL = it.x > innerWidth / 2;
      const opts = [[inL ? 'l' : 'r'], [inL ? 'r' : 'l'], ['u'], ['d']].map(([k]) => {
        const x = k === 'l' ? it.x - it.w / 2 - 8 : k === 'r' ? it.x + it.w / 2 + 8 : it.x, y = k === 'u' ? it.y - it.h / 2 - 6 : k === 'd' ? it.y + it.h / 2 + 6 : it.y;
        const l = k === 'l' ? x - tw : k === 'r' ? x : x - tw / 2, t = k === 'u' ? y - th : k === 'd' ? y : y - th / 2;
        return { k, x, y, box: { l, r: l + tw, t, b: t + th } };
      });
      const ok = opts.find(o => o.box.l >= 2 && o.box.r <= innerWidth - 2 && o.box.t >= 0 && o.box.b <= innerHeight && !boxes.some(b => hit(o.box, b)) && !placed.some(b => hit(o.box, b)));
      it.tag.className = 'tl-tag' + (ok ? (ok.k === 'r' ? '' : ' ' + ok.k) : ' off');
      if (ok) { it.tag.style.left = ok.x + 'px'; it.tag.style.top = ok.y + 'px'; placed.push(ok.box); }
    }
  }
  const overlap = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + 2;
  function clashes() {
    for (const it of items) it.wrap.classList.remove('clash');
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j]; if (a.id === 'joy' || b.id === 'joy') continue;
      if (overlap(a, b)) { a.wrap.classList.add('clash'); b.wrap.classList.add('clash'); }
    }
  }
  /** Depois de soltar: o controle encosta em outro em algum modo onde os dois aparecem juntos? */
  function clashElsewhere(id) {
    const g = geo(), res = reservedRects(root), o = g.o, out = [];
    const size = k => (k === 'altura' ? [BTN, BTN * 2 + 8] : CTRL[k].word ? [110, BTN] : [BTN, BTN]);
    const at = k => { const [w, h] = size(k), [x, y] = placeOf(k, g, w, h, res, draft[o]); return { x, y, w, h }; };
    for (const c of CONTEXTS) {
      if (c.id === ctx || !c.ids.includes(id) || (c.hidden && !store.seen.includes(c.id))) continue;
      const me = at(id);
      for (const k of c.ids) if (k !== id && overlap(me, at(k))) { out.push(`${CTRL[k].name} (${c.name})`); break; }
    }
    return out;
  }
  function say(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2600); }

  root.addEventListener('pointerdown', e => {
    const w = e.target.closest('.tl-item'); if (!w) return;
    e.preventDefault(); e.stopPropagation();
    const it = items.find(i => i.wrap === w); if (!it) return;
    try { w.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    drag = { it, id: e.pointerId, dx: e.clientX - it.x, dy: e.clientY - it.y };
    w.classList.add('drag'); root.classList.add('dragging');
    if (it.id === 'joy') showZone(it);
  });
  root.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const g = geo(), it = drag.it;
    const lo = (a, b, v) => Math.min(Math.max(v, a), Math.max(a, b));
    it.x = Math.round(lo(g.ins.l + it.w / 2 + 4, g.W - g.ins.r - it.w / 2 - 4, e.clientX - drag.dx));
    it.y = Math.round(lo(g.top + it.h / 2, g.H - g.ins.b - it.h / 2 - 4, e.clientY - drag.dy));
    put(it); clashes(); tags(); if (it.id === 'joy') showZone(it);
  });
  function drop(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const g = geo(), it = drag.it; drag = null; it.wrap.classList.remove('drag');
    [it.x, it.y] = fit(it.x, it.y, it.w, it.h, g, reservedRects(root));
    draft[g.o] = { ...draft[g.o], [it.id]: [+(it.x / g.W).toFixed(4), +(it.y / g.H).toFixed(4)] };
    dirty = true; put(it); clashes(); tags(); zoneEl.style.display = 'none'; root.classList.remove('dragging');
    const other = clashElsewhere(it.id);
    if (other.length) say('Atenção: encosta em ' + other.join(', ') + '.');
  }
  root.addEventListener('pointerup', drop); root.addEventListener('pointercancel', drop);
  function showZone(it) {                               // onde o joystick aparece quando o dedo encosta
    const g = geo(), zw = Math.max(g.W * 0.42, 220), zh = g.H * 0.5, l = Math.min(Math.max(0, it.x - zw * 0.45), Math.max(0, g.W - zw));
    const b = Math.min(g.H - g.ins.b, it.y + JOY_R + 40), t = Math.max(g.top, b - zh);
    Object.assign(zoneEl.style, { display: 'block', left: l + 'px', top: t + 'px', width: zw + 'px', height: (b - t) + 'px' });
  }
  root.addEventListener('click', e => {
    const tab = e.target.closest('.tl-tab'); if (tab) { ctx = tab.dataset.ctx; render(); return; }
    const a = e.target.closest('[data-a]'); if (!a) return;
    if (a.dataset.a === 'save') { store.p = draft.p; store.l = draft.l; persist(); close(); }
    else if (a.dataset.a === 'cancel') close();
    else if (a.dataset.a === 'def') { draft.p = {}; draft.l = {}; dirty = true; render(); say('Posições padrão (em pé e deitada). Toque em Salvar para manter.'); }
  });
  root.addEventListener('contextmenu', e => e.preventDefault());
  const onResize = () => { if (!drag) render(); };
  addEventListener('resize', onResize);
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    removeEventListener('resize', onResize); clearTimeout(toastT); root.remove(); if (ed === root) ed = null;
    if (onClose) onClose();
  }
  render();
  return { close, cancel: close, get dirty() { return dirty; } };
}

/** Lista dos controles de toque para "Ver controles" (com os mesmos símbolos dos botões). */
export const TOUCH_HELP = [
  ['joystick', 'Joystick', 'Dirigir, andar e mover a van no mapa da Carreira. Aparece onde o dedo encostar, no canto da tela.'],
  ['drag', 'Arrastar na tela', 'Girar e inclinar a câmera.'],
  ['tap', 'Tocar no balão', 'Faz o que ele indica: entregar, entrar na van, conversar, abastecer… Tocar na fala continua o diálogo.'],
  ['walk', 'Descer', 'Descer da van ou da lancha e andar a pé (com ela parada).'],
  ['overview', 'Câmera', 'Alterna entre a câmera atrás da van e o bairro inteiro.'],
  ['heli', 'Helicóptero', 'Decolar (só no Modo Livre). No ar, ▲ sobe e ▼ desce; o helicóptero com a seta para baixo pousa.'],
  ['missile', 'Míssil', 'Só no Modo Livre.'],
  ['list', 'Missões', 'Lista de missões do bairro (Carreira).'],
];
