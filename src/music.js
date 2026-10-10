// Música de fundo (assets/musica-fundo.mp3, ao lado do index.html). Pausar/continuar só pelo botão
// (canto inferior esquerdo): tocando mostra ⏸ (clicar pausa); pausada mostra ♪ (clicar continua).
// Começa no primeiro toque de tecla/clique (regra dos navegadores).
const CSS = `
.music-btn { position: absolute; left: calc(clamp(10px, 1.4vw, 20px) + 7.6em); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  display: flex; align-items: center; justify-content: center; width: 2.9em; height: 2.9em; padding: 0;
  border: 3px solid #fff; border-radius: 50%; background: #2a7fd0; color: #fff;
  font: 700 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .06em;
  box-shadow: 0 4px 0 #17548f, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.music-btn:hover { filter: brightness(1.1); }
.music-btn svg { width: 1.25em; height: 1.25em; display: block; }
.music-btn[data-on="0"] { background: #5d6a78; box-shadow: 0 4px 0 #3b444e, 0 8px 18px rgba(0,0,0,.25); }
`;

export function createMusic(stageEl, src = 'assets/musica-fundo.mp3') {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0.35;
  audio.preload = 'auto';

  let wanted = true;                     // o jogador quer música tocando?
  try { const v = localStorage.getItem('adress.music'); if (v !== null) wanted = v === '1'; } catch (e) { /* ignora */ }
  let started = false, suspended = false;

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'music-btn'; btn.tabIndex = -1;
  // ícones: dois pauzinhos (tocando → clicar pausa) e nota musical (pausada → clicar continua)
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.2" fill="#fff"/><rect x="14" y="4" width="5" height="16" rx="1.2" fill="#fff"/></svg>';
  const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3v11.3A3.5 3.5 0 1 0 12 17.5V8h6V3z" fill="#fff"/></svg>';
  const paint = () => {
    btn.dataset.on = wanted ? '1' : '0';
    btn.innerHTML = wanted ? PAUSE : NOTE;
    btn.title = wanted ? 'Pausar a música' : 'Continuar a música';
    btn.setAttribute('aria-label', btn.title);
  };
  const play = () => { const p = audio.play(); if (p && p.catch) p.catch(() => {}); };
  function toggle() {
    wanted = !wanted;
    try { localStorage.setItem('adress.music', wanted ? '1' : '0'); } catch (e) { /* ignora */ }
    started = true;
    wanted && !suspended ? play() : audio.pause();
    paint();
  }
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => { btn.blur(); toggle(); });
  paint();
  stageEl.appendChild(btn);

  return {
    /** Chamado no primeiro gesto do jogador: começa a tocar (se não estiver pausada). */
    start() { if (started) return; started = true; if (wanted && !suspended) play(); },
    toggle,
    /** Cena com música própria: pausa a de fundo SEM mudar a preferência salva; false volta como estava. */
    suspend(on) { suspended = on; if (on) audio.pause(); else if (wanted && started) play(); },
    get playing() { return !audio.paused; },
    audio,
  };
}
