// Cronômetro discreto da partida (Livre e Carreira): canto superior esquerdo da área de jogo, logo abaixo da barra
// (o canto direito é do botão MISSÕES). mm:ss; depois de 1 h, h:mm:ss. Sem animação, sem som. No Bairro 2, ao lado, "Batidas: n".
// Conta o tempo do jogo (dt do laço): para sozinho com a aba escondida; main.js pausa com o MENU ou as missões abertas.
const CSS = `
.match-hud { position: absolute; left: clamp(10px, 1.4vw, 20px); top: clamp(10px, 1.6vh, 18px); z-index: 3; display: flex; gap: 6px;
  pointer-events: none; user-select: none; }
.match-timer, .match-bumps { display: none; padding: .16em .55em; border-radius: 7px; background: rgba(40,26,16,.42); color: #fff8ea;
  font: 700 clamp(12px, 1vw, 15px)/1.25 "Trebuchet MS","Segoe UI",system-ui,sans-serif; font-variant-numeric: tabular-nums; letter-spacing: .03em;
  text-shadow: 0 1px 2px rgba(0,0,0,.35); }
.match-timer.on, .match-bumps.on { display: block; }
`;
const pad = n => String(n).padStart(2, '0');
export const formatTime = sec => {
  const s = Math.max(0, Math.floor(sec)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export function createMatchTimer(stageEl) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const box = document.createElement('div');
  box.className = 'match-hud';
  const el = document.createElement('div');
  el.className = 'match-timer';
  el.setAttribute('aria-label', 'Tempo de partida');
  const bumpEl = document.createElement('div');                       // Bairro 2: "Batidas: n" ao lado, no mesmo estilo
  bumpEl.className = 'match-bumps';
  box.append(el, bumpEl);
  stageEl.appendChild(box);
  let t = 0, armed = false, running = false, started = false, text = '', on = false, bumps = null, bumpText = '', bumpOn = false;
  return {
    /** Nova partida: volta a 00:00 e espera o primeiro quadro de jogo para começar. */
    reset() { t = 0; armed = true; running = false; started = false; },
    /** A partida começou de fato (primeiro quadro jogável depois do fade-in). */
    begin() { if (armed) { armed = false; running = true; started = true; } },
    /** Carreira: entrega certa — o tempo congela (continua visível até a tela escurecer). */
    stop() { armed = false; running = false; },
    tick(dt) { if (running) t += dt; },
    /** Mostra/esconde; o texto só é trocado quando o segundo muda. */
    show(visible) {
      visible = visible && started;
      if (visible !== on) { on = visible; el.classList.toggle('on', on); }
      if (on) { const s = formatTime(t); if (s !== text) { text = s; el.textContent = s; } }
      const bv = on && bumps != null;
      if (bv !== bumpOn) { bumpOn = bv; bumpEl.classList.toggle('on', bv); }
      if (bv) { const s = `Batidas: ${bumps}`; if (s !== bumpText) { bumpText = s; bumpEl.textContent = s; } }
    },
    /** Contador de batidas ao lado do cronômetro (null = sem contador neste bairro). */
    setBumps(n) { bumps = n; },
    get armed() { return armed; },
    get running() { return running; },
    get time() { return t; },
    get text() { return on ? el.textContent : ''; },
    _set(sec) { t = sec; },                               // (testes)
  };
}
