// Tela inicial: o bairro (cena real, câmera do bairro inteiro) desfocado ao fundo + Jogar / Configurações / Sair.
// "Jogar" abre o painel lateral: Carreira | Livre (metade de cima) e Shop (metade de baixo).
// Por enquanto só Jogar, Livre (inicia a partida) e Sair têm ação.
const CSS = `
.title { position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(9px) saturate(1.1); -webkit-backdrop-filter: blur(9px) saturate(1.1); background: rgba(38,51,31,.28);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.title.hidden { display: none; }
.title-main { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.title-buttons { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.title.playing .title-buttons { display: none; }   /* no painel Jogar, só o logo fica no centro */
.title-logo { font-weight: 900; font-size: clamp(56px, 9vw, 130px); letter-spacing: .06em; color: #ff7a1a;
  text-shadow: 0 6px 0 #8a3a08, 0 12px 30px rgba(0,0,0,.35); margin-bottom: 18px; }
.title-btn { width: clamp(220px, 22vw, 320px); padding: .7em 1em; border: 3px solid #fff; border-radius: 16px;
  background: #fff3d6; color: #3a2a1a; font: 800 clamp(18px, 1.7vw, 26px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;
  letter-spacing: .04em; cursor: pointer; box-shadow: 0 5px 0 #c9a76a, 0 10px 22px rgba(0,0,0,.25); transition: transform .1s; }
.title-btn:hover { transform: translateY(-2px); }
.title-btn:active { transform: translateY(2px); }
.title-btn.primary { background: #ff7a1a; color: #fff; box-shadow: 0 5px 0 #a8480b, 0 10px 22px rgba(0,0,0,.25); }
.title-panel { position: absolute; left: 0; top: 0; bottom: 0; width: clamp(300px, 34vw, 520px); display: none;
  grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 14px; padding: 62px 18px 18px; box-sizing: border-box;
  background: rgba(30,22,14,.55); border-right: 3px solid rgba(255,243,214,.6); }
.title.playing .title-panel { display: grid; }
.title-card { border: 3px solid #fff; border-radius: 18px; display: flex; align-items: center; justify-content: center;
  font: 900 clamp(20px, 2vw, 32px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .05em; color: #fff;
  text-shadow: 0 3px 0 rgba(0,0,0,.35); box-shadow: 0 6px 18px rgba(0,0,0,.3); user-select: none; }
.title-card.career { background: #3a78d4; }
.title-card.free { background: #3c9d55; cursor: pointer; }
.title-card.free:hover { filter: brightness(1.1); }
.title-card.shop { grid-column: 1 / span 2; background: #8a55c4; cursor: pointer; }
.title-card.shop:hover { filter: brightness(1.1); }
.title-driver { position: absolute; right: 0; top: 8%; bottom: 8%; width: min(38vw, 640px); display: none; pointer-events: none; }
.title.playing .title-driver { display: block; }
.title-driver canvas { width: 100%; height: 100%; display: block; }
.title-card.career { cursor: pointer; }
.title-card.career:hover { filter: brightness(1.1); }
.title-fade { position: absolute; inset: 0; background: #1b2418; opacity: 0; transition: opacity .5s; pointer-events: none; z-index: 5; }
.title-bye { color: #fff3d6; font: 800 clamp(22px, 2.4vw, 36px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;
  text-shadow: 0 3px 0 rgba(0,0,0,.4); text-align: center; }
`;

export function createTitle({ onFree, onCareer, onPlay, onShop }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'title';
  el.innerHTML = `
    <div class="title-panel">
      <div class="title-card career">Carreira</div>
      <div class="title-card free">Livre</div>
      <div class="title-card shop">Shop</div>
    </div>
    <div class="title-driver"></div>
    <div class="title-main">
      <div class="title-logo">ADRESS</div>
      <div class="title-buttons">
        <button type="button" class="title-btn primary" data-act="play">Jogar</button>
        <button type="button" class="title-btn" data-act="settings">Configurações</button>
        <button type="button" class="title-btn" data-act="quit">Sair</button>
      </div>
    </div>
    <div class="title-fade"></div>`;
  document.body.appendChild(el);

  el.querySelectorAll('button').forEach(b => { b.tabIndex = -1; b.addEventListener('mousedown', e => e.preventDefault()); });
  el.querySelector('[data-act="play"]').addEventListener('click', () => {
    el.classList.add('playing');
    onPlay && onPlay(el.querySelector('.title-driver'));
  });
  let starting = false;                               // um clique só (a transição já começou)
  const go = fn => () => { if (starting) return; starting = true; fn(); };
  el.querySelector('.title-card.free').addEventListener('click', () => onFree());   // abre a escolha do bairro (não inicia sozinho)
  el.querySelector('.title-card.career').addEventListener('click', go(onCareer));
  el.querySelector('.title-card.shop').addEventListener('click', () => { if (!starting && onShop) onShop(); });   // abre o Shop (não inicia partida)
  el.querySelector('[data-act="quit"]').addEventListener('click', () => {
    window.close();                                   // só funciona se a aba foi aberta por script
    el.innerHTML = '<div class="title-bye">Até a próxima!<br>Você já pode fechar esta aba.</div>';
  });

  function hide() { el.classList.add('hidden'); }
  return {
    hide,
    /** Escurece a tela inicial (0,5 s) e chama cb. */
    fadeOut(cb) { el.querySelector('.title-fade').style.opacity = '1'; setTimeout(cb, 550); },
    get visible() { return !el.classList.contains('hidden'); },
    /** Mostra a tela inicial: 'home' (Jogar/Configurações/Sair) ou 'play' (Carreira/Livre/Shop). */
    show(screen) {
      el.classList.remove('hidden');
      el.classList.toggle('playing', screen === 'play');
      el.querySelector('.title-fade').style.opacity = '0';
      starting = false;
    },
    get screen() { return el.classList.contains('playing') ? 'play' : 'home'; },
    get starting() { return starting; },
  };
}
