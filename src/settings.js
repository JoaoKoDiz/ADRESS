// Configurações (botão da tela inicial): volume da música e dos efeitos, tela cheia, lista de controles e restaurar padrões.
// No celular (modo toque ligado ou aparelho de toque): "Ver controles" mostra os controles de toque e "Posição dos botões" abre o
// editor de posição dos botões (touch.js; posições em 'adress.touchLayout.v1', fora do "Restaurar configurações").
// Preferências em localStorage 'adress.settings.v1' ({ music, sfx } de 0 a 1); aplicadas na hora e ao abrir o jogo.
// Não mexe em missões, desbloqueios, história nem personalização. Esc fecha sem acionar o que está atrás.
import { openTouchEditor, isTouchDevice, ICONS, TOUCH_HELP } from './touch.js';
const KEY = 'adress.settings.v1';
const DEFAULTS = { music: 1, sfx: 1 };

const CSS = `
.settings { position: fixed; inset: 0; z-index: 60; display: none; place-items: center; background: rgba(40,26,16,.45);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; color: #2e1d10; }
.settings.on { display: grid; }
.st-card { width: min(460px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box;
  padding: clamp(14px, 2.4vh, 22px) clamp(16px, 2.4vw, 26px); background: #fff3d6; border: 4px solid #ff7a1a; border-radius: 18px;
  box-shadow: 0 12px 34px rgba(0,0,0,.3); }
.st-card h2 { margin: 0 0 12px; text-align: center; font-size: clamp(20px, 2.2vw, 28px); font-weight: 900; color: #e8661a; letter-spacing: .05em; }
.st-card h3 { margin: 14px 0 8px; font-size: 15px; font-weight: 900; letter-spacing: .08em; color: #7a4a22; text-transform: uppercase; }
.st-row { display: grid; grid-template-columns: 1fr minmax(90px, 1.3fr) 3.2em; align-items: center; gap: 10px; margin: 8px 0; font-weight: 700; font-size: 15px; }
.st-row input[type=range] { width: 100%; accent-color: #ff7a1a; }
.st-pct { text-align: right; font-weight: 800; }
.st-btn { display: block; width: 100%; margin: 8px 0; padding: .6em 1em; border: 3px solid #ff7a1a; border-radius: 12px; background: #fff;
  color: #2e1d10; font: 800 15px "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer; }
.st-btn:hover:not(:disabled) { background: #ffe2b8; }
.st-btn:disabled { opacity: .5; cursor: default; }
.st-btn.dark { background: #302014; color: #fff3d6; border-color: #302014; margin-top: 16px; }
.st-reset { display: block; margin: 12px auto 0; padding: .3em .6em; border: 0; background: none; color: #8a6a4a; text-decoration: underline;
  font: 700 13px "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer; }
.st-sub { display: none; }
.st-sub.on { display: block; }
.st-confirm.on { display: flex; flex-direction: column; justify-content: center; min-height: var(--st-h, auto); }   /* mesma altura do painel principal (o cartão não encolhe ao confirmar) */
.st-rev { margin: 10px 0 0; text-align: center; font-size: 11px; font-weight: 600; letter-spacing: .02em; color: #a88b66; }
.st-ctrl { margin: 0; padding: 0; list-style: none; font-size: 14px; line-height: 1.35; }
.st-ctrl li { display: grid; grid-template-columns: 9.6em 1fr; gap: 10px; padding: 5px 0; border-bottom: 1px dashed #e6cc98; }   /* 1ª coluna com a mesma largura em todas as linhas (as descrições ficam alinhadas) */
.st-ctrl b { overflow-wrap: break-word; }
@media (max-width: 400px) { .st-ctrl li { grid-template-columns: 8.2em 1fr; } }
.st-ctrl small { color: #7a5536; }
.st-confirm p { margin: 4px 0 10px; font-size: 15px; line-height: 1.4; text-align: center; }
.st-two { display: flex; gap: 10px; } .st-two .st-btn { flex: 1; }
.st-ctrl-row { display: flex; flex-wrap: wrap; gap: 8px 10px; margin: 8px 0; } .st-ctrl-row .st-btn { flex: 1 1 165px; min-width: 0; margin: 0; }   /* (margens por fora da linha: no computador a altura é a mesma de antes) */
.st-ctrl-row [data-a="tlayout"] { display: none; }
.settings.touchy .st-ctrl-row [data-a="tlayout"] { display: block; }
.settings.editing { background: transparent; } .settings.editing .st-card { visibility: hidden; }
.st-ctrl .ti { display: inline-grid; place-items: center; width: 30px; height: 30px; margin-right: 8px; vertical-align: middle; border-radius: 50%;
  background: #3a2a1a; color: #fff3d6; flex: none; }
.st-ctrl .ti svg { width: 19px; height: 19px; }
.st-ctrl .ti.txt { width: auto; padding: 0 9px; border-radius: 999px; font: 800 12px/1 "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .04em; }
.st-ctrl .ti.red { background: #e3262e; } .st-ctrl .ti.blue { background: #2a7fd0; }
.st-ctrl.touch li { grid-template-columns: minmax(124px, auto) 1fr; align-items: center; }
.st-ctrl.touch b { display: flex; align-items: center; }
/* tela baixa (celular deitado): tudo mais justo para o Voltar e o rodapé caberem sem rolar */
@media (max-height: 500px) {
  .st-card { padding: 10px 18px 8px; border-width: 3px; }
  .st-card h2 { margin-bottom: 4px; font-size: 19px; }
  .st-card h3 { margin: 6px 0 2px; font-size: 13px; }
  .st-row { margin: 3px 0; }
  .st-btn { margin: 5px 0; padding: .42em 1em; }
  .st-ctrl-row { margin: 5px 0; gap: 5px 10px; }
  .st-btn.dark { margin-top: 8px; }
  .st-reset { margin-top: 4px; }
  .st-rev { margin-top: 2px; }
  .st-ctrl { font-size: 13px; } .st-ctrl li { padding: 3px 0; }
  /* lista de controles em 2 colunas (numa coluna só o Voltar ficava abaixo da tela) */
  .st-card.wide { width: min(780px, calc(100vw - 32px)); }
  .st-card.wide .st-ctrl { columns: 2; column-gap: 22px; }
  .st-card.wide .st-ctrl li { break-inside: avoid; }
}
`;

const CONTROLS = [
  ['W A S D / setas', 'Dirigir (A/D viram; S freia e dá ré)'],
  ['E / Espaço / Enter', 'Entregar, abastecer no posto, abrir porteiras, conversar e continuar o diálogo; no mapa da Carreira, jogar no bairro'],
  ['L', 'Descer da van e andar a pé (van parada); E perto da van volta a dirigir'],
  ['C', 'Câmera: atrás da van ↔ bairro inteiro'],
  ['Botão direito + arrastar', 'Girar e inclinar a câmera; roda do mouse aproxima; botão do meio volta ao padrão'],
  ['T ou botão DICA', 'Seta do céu na casa indicada (1 por entrega)'],
  ['M ou botão MISSÕES', 'Lista de missões <small>(só Modo Carreira)</small>'],
  ['A / D no mapa', 'Andar pela estrada do mapa <small>(Carreira)</small>'],
  ['H', 'Helicóptero: Espaço sobe, Shift desce, H pousa <small>(só Modo Livre)</small>'],
  ['F', 'Míssil <small>(só Modo Livre)</small>'],
  ['Esc ou botão MENU', 'Pausar a partida (e opções do Modo Livre)'],
  ['Botão ♪', 'Pausar / continuar a música'],
];

// controles de toque (com os mesmos símbolos dos botões da tela)
const TOUCH_LIST = TOUCH_HELP.map(([ic, k, d]) => `<li><b><span class="ti">${ICONS[ic]}</span>${k}</b><span>${d}</span></li>`).join('') +
  '<li><b><span class="ti txt red">DICA</span></b><span>Seta do céu na casa indicada (1 por entrega).</span></li>' +
  '<li><b><span class="ti txt">MENU</span></b><span>Pausar a partida (e opções do Modo Livre).</span></li>' +
  '<li><b><span class="ti blue">♪</span>Música</b><span>Pausar / continuar a música.</span></li>';

export function createSettings({ onChange, onClose } = {}) {
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  let prefs = { ...DEFAULTS };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) for (const k in DEFAULTS) if (typeof s[k] === 'number') prefs[k] = Math.min(1, Math.max(0, s[k])); } catch (e) { /* ignora */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* ignora */ } };

  const el = document.createElement('div');
  el.className = 'settings';
  el.innerHTML = `<div class="st-card">
    <div class="st-sub on" data-v="main">
      <h2>CONFIGURAÇÕES</h2>
      <h3>Áudio</h3>
      <label class="st-row"><span>Música</span><input type="range" min="0" max="100" step="1" data-k="music"><span class="st-pct" data-p="music"></span></label>
      <label class="st-row"><span>Efeitos</span><input type="range" min="0" max="100" step="1" data-k="sfx"><span class="st-pct" data-p="sfx"></span></label>
      <h3>Tela</h3>
      <button type="button" class="st-btn" data-a="fs"></button>
      <h3>Controles</h3>
      <div class="st-ctrl-row"><button type="button" class="st-btn" data-a="ctrl">Ver controles</button><button type="button" class="st-btn" data-a="tlayout">Posição dos botões</button></div>
      <button type="button" class="st-btn dark" data-a="back">Voltar</button>
      <button type="button" class="st-reset" data-a="reset">Restaurar configurações</button>
      <div class="st-rev">Revisão de 19/10/2026</div>
    </div>
    <div class="st-sub" data-v="ctrl">
      <h2>CONTROLES</h2>
      <ul class="st-ctrl">${CONTROLS.map(([k, d]) => `<li><b>${k}</b><span>${d}</span></li>`).join('')}</ul>
      <ul class="st-ctrl touch">${TOUCH_LIST}</ul>
      <button type="button" class="st-btn dark" data-a="main">Voltar</button>
    </div>
    <div class="st-sub st-confirm" data-v="confirm">
      <h2>RESTAURAR</h2>
      <p>Voltar o volume da música e dos efeitos para 100%? Missões, bairros, história e personalização não mudam.</p>
      <div class="st-two"><button type="button" class="st-btn" data-a="main">Cancelar</button><button type="button" class="st-btn dark" data-a="doreset" style="margin-top:8px">Restaurar</button></div>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelectorAll('button, input').forEach(b => { b.tabIndex = -1; });
  el.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));

  const fsOk = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  const fsBtn = el.querySelector('[data-a="fs"]');
  const paintFs = () => { fsBtn.disabled = !fsOk(); fsBtn.textContent = !fsOk() ? 'Tela cheia indisponível aqui' : fsOn() ? 'Sair da tela cheia' : 'Entrar em tela cheia'; };
  document.addEventListener('fullscreenchange', paintFs); document.addEventListener('webkitfullscreenchange', paintFs);
  const paint = () => {
    for (const k of ['music', 'sfx']) { el.querySelector(`[data-k="${k}"]`).value = Math.round(prefs[k] * 100); el.querySelector(`[data-p="${k}"]`).textContent = Math.round(prefs[k] * 100) + '%'; }
    paintFs();
  };
  const apply = () => { if (onChange) onChange(prefs); };
  el.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; prefs[k] = (+e.target.value) / 100; paint(); apply(); save(); });
  const view = v => {
    const m = el.querySelector('.st-sub[data-v="main"]');
    if (v === 'confirm' && m.offsetHeight) el.style.setProperty('--st-h', m.offsetHeight + 'px');   // a confirmação ocupa o mesmo espaço
    el.querySelectorAll('.st-sub').forEach(s => s.classList.toggle('on', s.dataset.v === v));
    el.querySelector('.st-card').classList.toggle('wide', v === 'ctrl');   // (só muda algo em tela baixa: controles em 2 colunas)
    const tl = document.body.classList.contains('touch-on');             // no toque, a lista dos controles de toque; com teclado/mouse, a do teclado
    el.querySelector('.st-ctrl:not(.touch)').style.display = tl ? 'none' : '';
    el.querySelector('.st-ctrl.touch').style.display = tl ? '' : 'none';
  };
  let open = false, editor = null;
  const touchUI = () => document.body.classList.contains('touch-on') || isTouchDevice();
  function close() { if (!open) return; if (editor) editor.cancel(); open = false; el.classList.remove('on'); view('main'); if (onClose) onClose(); }
  el.addEventListener('click', e => {
    const a = e.target.closest('[data-a]'); if (!a) return; a.blur();
    const k = a.dataset.a;
    if (k === 'back') close();
    else if (k === 'ctrl') view('ctrl');
    else if (k === 'tlayout') { el.classList.add('editing'); editor = openTouchEditor({ onClose: () => { editor = null; el.classList.remove('editing'); } }); }
    else if (k === 'main') view('main');
    else if (k === 'reset') view('confirm');
    else if (k === 'doreset') { prefs = { ...DEFAULTS }; save(); apply(); paint(); view('main'); }
    else if (k === 'fs' && fsOk()) {
      try {
        if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else { const d = document.documentElement, r = (d.requestFullscreen || d.webkitRequestFullscreen).call(d); if (r && r.catch) r.catch(() => paintFs()); }
      } catch (e2) { paintFs(); }
    }
  });
  // com o painel aberto, nenhuma tecla chega ao jogo; Esc volta (subtela → principal → fecha)
  window.addEventListener('keydown', e => {
    if (!open) return;
    e.stopImmediatePropagation();
    if (!/^F\d+$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();   // F5/F11 e atalhos do navegador continuam funcionando
    if (e.key === 'Escape' && !e.repeat) { if (editor) { editor.cancel(); return; } const cur = el.querySelector('.st-sub.on').dataset.v; cur === 'main' ? close() : view('main'); }
  }, true);

  apply(); paint();
  return {
    open() { open = true; el.classList.toggle('touchy', touchUI()); view('main'); paint(); el.classList.add('on'); },
    close,
    get isOpen() { return open; },
    get prefs() { return { ...prefs }; },
  };
}
