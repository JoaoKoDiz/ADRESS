// Botão da dica (canto inferior direito da área do jogo). Não rouba o foco do teclado.
const CSS = `
.hint-btn { position: absolute; right: clamp(10px, 1.4vw, 20px); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  display: flex; align-items: center; gap: .55em; padding: .6em 1.5em; letter-spacing: .08em; border: 3px solid #fff; border-radius: 999px;
  background: #e3262e; color: #fff; font: 700 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;
  box-shadow: 0 4px 0 #8f1016, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; transition: transform .12s, filter .12s; }
.hint-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
.hint-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #8f1016, 0 4px 10px rgba(0,0,0,.25); }
.hint-btn kbd { font: inherit; font-size: .8em; background: rgba(255,255,255,.22); border-radius: 6px; padding: .05em .45em; }
.hint-btn svg { width: 1.25em; height: 1.25em; flex: none; }
.hint-btn[data-state="busy"] { filter: saturate(.55) brightness(.9); cursor: default; }
.hint-btn[data-state="used"] { background: #8d8676; box-shadow: 0 4px 0 #5e584b, 0 8px 18px rgba(0,0,0,.2); cursor: default; }
.hint-btn[data-state="used"] kbd { display: none; }
.hint-btn[data-state="hidden"] { display: none; }
`;

const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 2h6v10h5l-8 10-8-10h5z" fill="#fff"/></svg>';

export function createHintButton(stageEl, onClick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'hint-btn';
  btn.tabIndex = -1;                                            // Espaço/Enter continuam indo para o jogo
  btn.addEventListener('mousedown', e => e.preventDefault());   // não recebe foco
  btn.addEventListener('click', () => { btn.blur(); onClick(); });
  stageEl.appendChild(btn);

  let current = '';
  return {
    /** 'ready' (disponível), 'busy' (disponível, mas não agora), 'used' (já usada nesta rodada), 'hidden' (mapa da Carreira). */
    set(state) {
      if (state === current) return;
      current = state;
      btn.dataset.state = state;
      btn.disabled = state !== 'ready';
      btn.textContent = 'DICA';
      btn.title = state === 'used' ? 'A dica volta na próxima entrega' : 'Mostra a casa indicada agora (uma vez por rodada)';
    },
  };
}
