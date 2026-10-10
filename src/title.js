// Tela inicial: o bairro (cena real, câmera do bairro inteiro) desfocado ao fundo + Jogar / Configurações / Sair.
// "Jogar" abre o painel: logo + Voltar + "Escolha como jogar" + Carreira / Livre / Shop à esquerda; a van (com a customização) à direita.
// Por enquanto só Jogar, Livre (inicia a partida) e Sair têm ação.
const CSS = `
.title { position: fixed; inset: 0; z-index: 20; display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(9px) saturate(1.1); -webkit-backdrop-filter: blur(9px) saturate(1.1); background: rgba(38,51,31,.28);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.title.hidden { display: none; }
.title-main { display: flex; flex-direction: column; align-items: center; gap: clamp(10px, 2.2vh, 26px); }
.title-buttons { display: flex; flex-direction: column; align-items: center; gap: clamp(12px, 2.2vh, 24px); }
.title.playing .title-buttons { display: none; }   /* no painel Jogar, só o logo fica no centro */
.title-logo { font-weight: 900; font-size: clamp(60px, min(9.5vw, 15vh), 150px); line-height: 1; letter-spacing: .02em; color: #ff8a1a;
  -webkit-text-stroke: clamp(3px, .35vw, 6px) #5a2608; paint-order: stroke fill; text-shadow: 0 .06em 0 #5a2608, 0 .1em 16px rgba(0,0,0,.3);
  margin-bottom: clamp(6px, 2vh, 22px); }
/* os 3 botões: mesma largura e altura, texto centralizado */
.title-btn { width: clamp(240px, max(26vw, 34vh), 440px); height: clamp(54px, 9vh, 96px); padding: 0 1em; box-sizing: border-box;
  border: clamp(4px, .38vw, 6px) solid #ff7a1a; border-radius: clamp(14px, 1.4vw, 22px); background: #fff3d6; color: #2e1d10;
  font: 800 clamp(20px, min(2.3vw, 4vh), 40px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer;
  box-shadow: 0 4px 0 rgba(150,70,10,.3), 0 8px 18px rgba(0,0,0,.22); transition: transform .1s; }
.title-btn:hover { transform: translateY(-2px); }
.title-btn:active { transform: translateY(2px); }
.title-btn[data-act="quit"] { background: #302014; color: #fff3d6; border-color: #fff3d6; box-shadow: 0 4px 0 rgba(0,0,0,.3), 0 8px 18px rgba(0,0,0,.25); }
/* na tela inicial só o bairro aparece atrás (a barra e os botões da partida ficam escondidos) */
body.title-on .ahud { display: none; }
body.title-on .menu-btn, body.title-on .hint-btn, body.title-on .music-btn { visibility: hidden; }
/* painel "Jogar": coluna à esquerda (logo, Voltar, título, botões) e a van inteira à direita */
.title-play { position: absolute; left: clamp(16px, 4vw, 72px); top: 0; bottom: 0; width: min(40vw, 640px); min-width: 300px; display: none;
  flex-direction: column; justify-content: center; gap: clamp(8px, 1.6vh, 18px); padding: 3vh 0; box-sizing: border-box; }
.title.playing .title-play { display: flex; }
.title.playing .title-main { display: none; }
.tp-logo { font-weight: 900; font-size: clamp(54px, 7.6vw, 128px); line-height: .95; letter-spacing: .02em; color: #ff8a1a;
  -webkit-text-stroke: clamp(3px, .35vw, 6px) #5a2608; paint-order: stroke fill; text-shadow: 0 .07em 0 #5a2608, 0 .12em 18px rgba(0,0,0,.35); }
.tp-back { align-self: flex-start; padding: .35em 1.1em; border: 3px solid #c98a4a; border-radius: 999px; background: #3a2214; color: #fff3d6;
  font: 800 clamp(15px, 1.35vw, 22px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer; box-shadow: 0 4px 0 #1d0f07, 0 8px 16px rgba(0,0,0,.3); }
.tp-back:hover { filter: brightness(1.2); }
.tp-title { color: #fff8ea; font: 900 clamp(26px, 3.1vw, 54px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; margin-top: .25em;
  text-shadow: 0 3px 0 rgba(60,35,15,.75), 0 6px 18px rgba(0,0,0,.35); }
.title-card { display: flex; align-items: center; gap: clamp(12px, 1.6vw, 26px); box-sizing: border-box; width: 100%;
  padding: clamp(10px, 1.7vh, 22px) clamp(14px, 1.8vw, 30px); background: #fff3d6; border: clamp(4px, .4vw, 6px) solid #ff7a1a; border-radius: clamp(14px, 1.4vw, 24px);
  color: #2e1d10; cursor: pointer; user-select: none; box-shadow: 0 6px 0 rgba(150,70,10,.35), 0 12px 26px rgba(0,0,0,.28); transition: transform .1s; }
.title-card:hover { transform: translateY(-2px); filter: brightness(1.03); }
.title-card:active { transform: translateY(2px); }
.title-card svg.ic { width: clamp(52px, 6.2vw, 112px); height: auto; flex: none; }
.tc-text { flex: 1; display: flex; flex-direction: column; }
.tc-text b { font: 900 clamp(26px, 3.1vw, 54px)/1.05 "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.tc-text small { font: 700 clamp(14px, 1.45vw, 25px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; opacity: .85; margin-top: .2em; }
.tc-arrow { font: 900 clamp(26px, 2.6vw, 44px) "Trebuchet MS",sans-serif; color: #ff7a1a; flex: none; }
.title-card.shop { width: 68%; border-color: #8a55c4; padding-top: clamp(6px, 1vh, 12px); padding-bottom: clamp(6px, 1vh, 12px); box-shadow: 0 5px 0 rgba(80,40,130,.35), 0 10px 22px rgba(0,0,0,.25); }
.title-card.shop svg.ic { width: clamp(38px, 4.2vw, 72px); }
.title-card.shop .tc-text b { font-size: clamp(20px, 2.2vw, 38px); }
.title-card.shop .tc-arrow { color: #8a55c4; font-size: clamp(20px, 2vw, 34px); }
.title-driver { position: absolute; right: 1vw; top: 6vh; bottom: 4vh; left: calc(clamp(16px, 4vw, 72px) + min(40vw, 640px) + 2vw); display: none; pointer-events: none; }
.title.playing .title-driver { display: block; }
.title-driver canvas { width: 100%; height: 100%; display: block; }
@media (max-aspect-ratio: 1/1) {             /* tela em pé: botões em cima, van embaixo */
  .title-play { width: auto; right: clamp(16px, 4vw, 72px); bottom: 42vh; justify-content: flex-start; }
  .title-driver { left: 2vw; top: 58vh; }
}
.title-fade { position: absolute; inset: 0; background: #1b2418; opacity: 0; transition: opacity .5s; pointer-events: none; z-index: 5; }
.title-bye { color: #fff3d6; font: 800 clamp(22px, 2.4vw, 36px) "Trebuchet MS","Segoe UI",system-ui,sans-serif;
  text-shadow: 0 3px 0 rgba(0,0,0,.4); text-align: center; }
`;

// ícones (desenhados em SVG, cores chapadas)
const ICON_MAP = `<svg class="ic" viewBox="0 0 120 100"><path d="M8 22 L40 10 L80 22 L112 10 L112 82 L80 94 L40 82 L8 94 Z" fill="#2f7fe0"/>
<path d="M40 10 L40 82 L8 94 L8 22 Z" fill="#1f63bd"/><path d="M80 22 L80 94 L112 82 L112 10 Z" fill="#1f63bd"/>
<path d="M18 74 C30 56 44 70 56 58 S78 44 86 46" stroke="#ff8a1a" stroke-width="6" stroke-dasharray="8 7" fill="none" stroke-linecap="round"/>
<path d="M90 50 C78 34 80 14 92 10 C104 14 106 34 90 50 Z" fill="#e3262e" stroke="#7a1010" stroke-width="3"/><circle cx="92" cy="26" r="6" fill="#fff3d6"/></svg>`;
const ICON_COMPASS = `<svg class="ic" viewBox="0 0 100 100"><circle cx="50" cy="54" r="42" fill="#2f9a4e" stroke="#1e3a24" stroke-width="5"/>
<circle cx="50" cy="54" r="31" fill="#fff3d6" stroke="#1e3a24" stroke-width="3"/><rect x="44" y="5" width="12" height="9" rx="3" fill="#1e3a24"/>
<path d="M50 54 L70 30 L56 60 Z" fill="#e3262e"/><path d="M50 54 L30 78 L44 48 Z" fill="#2f7fe0"/><circle cx="50" cy="54" r="4" fill="#1e3a24"/></svg>`;
const ICON_BOX = `<svg class="ic" viewBox="0 0 100 90"><path d="M10 28 L50 12 L90 28 L90 72 L50 86 L10 72 Z" fill="#c8874a" stroke="#6a3b16" stroke-width="4" stroke-linejoin="round"/>
<path d="M10 28 L50 44 L90 28" fill="none" stroke="#6a3b16" stroke-width="4"/><path d="M50 44 L50 86" stroke="#6a3b16" stroke-width="4"/>
<path d="M30 20 L70 36 L70 50 L62 47 L62 38 L22 23 Z" fill="#e8c27a"/></svg>`;

export function createTitle({ onFree, onCareer, onPlay, onShop, onBack }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'title';
  el.innerHTML = `
    <div class="title-play">
      <div class="tp-logo">ADRESS</div>
      <button type="button" class="tp-back">← Voltar</button>
      <div class="tp-title">Escolha como jogar</div>
      <div class="title-card career">${ICON_MAP}<div class="tc-text"><b>Carreira</b><small>Avance pelos bairros</small></div><span class="tc-arrow">›</span></div>
      <div class="title-card free">${ICON_COMPASS}<div class="tc-text"><b>Livre</b><small>Explore no seu ritmo</small></div><span class="tc-arrow">›</span></div>
      <div class="title-card shop">${ICON_BOX}<div class="tc-text"><b>Shop</b></div><span class="tc-arrow">›</span></div>
    </div>
    <div class="title-driver"></div>
    <div class="title-main">
      <div class="title-logo">ADRESS</div>
      <div class="title-buttons">
        <button type="button" class="title-btn" data-act="play">Jogar</button>
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
  el.querySelector('.tp-back').addEventListener('click', () => { if (!starting && onBack) onBack(); });
  el.querySelector('[data-act="quit"]').addEventListener('click', () => {
    window.close();                                   // só funciona se a aba foi aberta por script
    el.innerHTML = '<div class="title-bye">Até a próxima!<br>Você já pode fechar esta aba.</div>';
  });

  document.body.classList.add('title-on');
  function hide() { el.classList.add('hidden'); document.body.classList.remove('title-on'); }
  return {
    hide,
    /** Escurece a tela inicial (0,5 s) e chama cb. */
    fadeOut(cb) { el.querySelector('.title-fade').style.opacity = '1'; setTimeout(cb, 550); },
    get visible() { return !el.classList.contains('hidden'); },
    /** Mostra a tela inicial: 'home' (Jogar/Configurações/Sair) ou 'play' (Carreira/Livre/Shop). */
    show(screen) {
      el.classList.remove('hidden'); document.body.classList.add('title-on');
      el.classList.toggle('playing', screen === 'play');
      el.querySelector('.title-fade').style.opacity = '0';
      starting = false;
    },
    get screen() { return el.classList.contains('playing') ? 'play' : 'home'; },
    get starting() { return starting; },
  };
}
