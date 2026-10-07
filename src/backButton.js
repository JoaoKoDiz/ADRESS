// Botão "Voltar" fixo no canto superior esquerdo (painel Jogar, mapa da Carreira e durante a partida).
const CSS = `
.back-btn { position: fixed; left: 12px; top: 10px; z-index: 30; display: none;
  padding: .45em 1em; border: 3px solid #fff; border-radius: 999px; background: #3a2a1a; color: #fff3d6;
  font: 800 clamp(13px, 1vw, 16px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .04em;
  box-shadow: 0 3px 0 #1d140c, 0 6px 14px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.back-btn:hover { filter: brightness(1.2); }
.back-btn.on { display: block; }
body.has-back .ahud-logo { margin-left: 112px; }   /* não fica embaixo do botão */
`;

export function createBackButton(onBack) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'back-btn';
  btn.tabIndex = -1;
  btn.textContent = '← Voltar';
  btn.addEventListener('mousedown', e => e.preventDefault());   // não rouba o foco do teclado
  btn.addEventListener('click', () => { btn.blur(); onBack(); });
  document.body.appendChild(btn);

  let shown = false;
  return {
    set(on) {
      if (on === shown) return;
      shown = on;
      btn.classList.toggle('on', on);
      document.body.classList.toggle('has-back', on);
    },
  };
}
