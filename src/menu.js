// MENU (botão no canto inferior esquerdo ou tecla Esc): pausa a partida e mostra as opções do Modo Livre. A escolha fica salva no navegador.
const CSS = `
.menu-btn { position: absolute; left: clamp(10px, 1.4vw, 20px); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  padding: .6em 1.4em; border: 3px solid #fff; border-radius: 999px; background: #3a2a1a; color: #fff3d6;
  font: 700 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .08em;
  box-shadow: 0 4px 0 #1d140c, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.menu-btn:hover { filter: brightness(1.15); }
.menu-panel { position: absolute; left: clamp(10px, 1.4vw, 20px); bottom: calc(clamp(10px, 1.6vh, 20px) + 3.6em); z-index: 4;
  width: min(400px, calc(100% - 2 * clamp(10px, 1.4vw, 20px))); padding: 14px 18px 16px; border-radius: 16px; background: #fff3d6; border: 4px solid #ff7a1a; color: #3a2a1a;
  font: 15px "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 5px 0 rgba(168,72,11,.3), 0 12px 30px rgba(0,0,0,.3); display: none;
  max-height: calc(100% - 2 * clamp(10px, 1.6vh, 20px) - 3.8em); overflow-y: auto; box-sizing: border-box; }   /* telas baixas/estreitas: rola em vez de ser cortado */
body.title-on .menu-panel { display: none; }
body.on-map .menu-btn, body.on-map .menu-panel { visibility: hidden; }
.menu-panel.open { display: block; }
.menu-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 10px; }
.menu-panel h3 { margin: 0; font-size: 19px; font-weight: 900; color: #e8661a; letter-spacing: .08em; }
.menu-go { padding: .4em 1.05em; border: 3px solid #fff3d6; border-radius: 999px; background: #ff7a1a; color: #fff; cursor: pointer;
  font: 800 14px "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 0 0 2px #ff7a1a, 0 3px 0 #a8480b; white-space: nowrap; }
.menu-go:hover { filter: brightness(1.08); }
.menu-sec { margin: 4px 0 2px; font-size: 12px; font-weight: 900; letter-spacing: .1em; color: #8a5a2e; text-transform: uppercase; }
.menu-sec small { font-weight: 700; letter-spacing: .02em; text-transform: none; color: #a88b66; }
.menu-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer; user-select: none; padding: 6px 0; font-weight: 700; }
.menu-sw { width: 46px; height: 26px; border-radius: 13px; background: #b9ae98; position: relative; flex: none; transition: background .15s; }
.menu-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
.menu-row.on .menu-sw { background: #e3262e; }
.menu-row.on .menu-sw::after { left: 23px; }
.menu-fx { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px; padding: 2px 0 8px 14px; font-size: 14px; color: #6a5a40; }
.menu-fx .seg { display: flex; flex-wrap: wrap; border: 2px solid #3a2a1a; border-radius: 12px; overflow: hidden; flex: 1 1 220px; }
.menu-fx .seg span { flex: 1 1 auto; text-align: center; padding: 4px 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 13px; color: #3a2a1a; background: #fff; }
.menu-fx .seg span:hover { background: #ffe9c6; }
.menu-fx .seg span.on { background: #e3262e; color: #fff; }
.menu-fx.off { opacity: .45; }
.menu-keys { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 10px; padding-top: 10px; border-top: 2px dashed #e6cc98; font-size: 13px; color: #7a6446; line-height: 1.5; }
.menu-keys span { white-space: nowrap; }
body.touch-on .menu-keys { display: none; }   /* toque: não há teclado */
/* celular em pé: os créditos da música ficam logo acima do MENU — o painel abre acima deles (sem cobrir nem ser coberto) */
@media (max-width: 560px) { .menu-panel { bottom: calc(clamp(10px, 1.6vh, 20px) + 3.6em + 50px); max-height: calc(100% - 2 * clamp(10px, 1.6vh, 20px) - 3.8em - 50px); } }
.menu-keys kbd { display: inline-grid; place-items: center; min-width: 1.55em; height: 1.55em; padding: 0 .3em; margin-right: .3em; border-radius: .36em;
  background: #f1dcb0; color: #6b4a26; box-shadow: inset 0 -.14em 0 rgba(150,104,52,.32); font: 800 .85em "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
`;

export function createMenu(stageEl) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  let explodeWrong = true, unstoppable = false, wrongFx = 'boom';   // wrongFx: 'boom' (explosão) | 'laser' (laser orbital) | 'ursa' (Ursa Menor) | 'solar' (Sistema Solar) | 'reality' (Devolução da Realidade)
  try { const v = localStorage.getItem('adress.wrongFx'); if (v === 'laser' || v === 'ursa' || v === 'solar' || v === 'reality') wrongFx = v; } catch (e) { /* ignora */ }
  try { unstoppable = localStorage.getItem('adress.unstoppable') === '1'; } catch (e) { /* ignora */ }
  try { const v = localStorage.getItem('adress.explodeWrong'); if (v !== null) explodeWrong = v === '1'; } catch (e) { /* ignora */ }

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn'; btn.tabIndex = -1; btn.textContent = 'MENU';
  const panel = document.createElement('div');
  panel.className = 'menu-panel';
  // pausa: a partida espera enquanto o painel está aberto (main.js); as opções valem só no Modo Livre (na Carreira não há destruição)
  panel.innerHTML = `<div class="menu-head"><h3>PAUSA</h3><button type="button" class="menu-go" tabindex="-1">Continuar ▸</button></div>
    <div class="menu-sec">Opções <small>— só no Modo Livre</small></div>
    <div class="menu-row" data-opt="explode"><span>Casa explode na entrega errada</span><span class="menu-sw"></span></div>
    <div class="menu-fx"><span>Efeito</span><span class="seg"><span data-fx="boom">Explosão</span><span data-fx="laser">Laser orbital</span><span data-fx="ursa">Ursa Menor</span><span data-fx="solar">Sistema Solar</span><span data-fx="reality">Devolução da Realidade</span></span></div>
    <div class="menu-row" data-opt="ghost"><span>Van imparável (atravessa e destrói tudo)</span><span class="menu-sw"></span></div>
    <div class="menu-keys"><span><kbd>F</kbd>míssil (Livre)</span><span><kbd>H</kbd>helicóptero (Livre)</span><span><kbd>T</kbd>dica</span><span><kbd>C</kbd>câmera</span><span><kbd>M</kbd>missões (Carreira)</span><span><kbd>Esc</kbd>continuar</span></div>`;
  const row = panel.querySelector('[data-opt="explode"]');
  const rowG = panel.querySelector('[data-opt="ghost"]');
  const fxRow = panel.querySelector('.menu-fx'), fxBtns = [...panel.querySelectorAll('[data-fx]')];
  const paint = () => { row.classList.toggle('on', explodeWrong); rowG.classList.toggle('on', unstoppable);
    fxRow.classList.toggle('off', !explodeWrong); fxBtns.forEach(b => b.classList.toggle('on', b.dataset.fx === wrongFx)); };
  fxBtns.forEach(b => b.addEventListener('click', () => {
    wrongFx = b.dataset.fx; paint();
    try { localStorage.setItem('adress.wrongFx', wrongFx); } catch (e) { /* ignora */ }
  }));
  rowG.addEventListener('click', () => {
    unstoppable = !unstoppable; paint();
    try { localStorage.setItem('adress.unstoppable', unstoppable ? '1' : '0'); } catch (e) { /* ignora */ }
  });
  paint();

  let canOpen = () => true;                                         // (main.js: só durante a partida)
  const toggle = () => { if (document.body.classList.contains('extra-on') || (!panel.classList.contains('open') && !canOpen())) { panel.classList.remove('open'); return; } panel.classList.toggle('open'); };   // nos níveis extras o MENU não existe
  for (const el of [btn, panel]) el.addEventListener('mousedown', e => e.preventDefault()); // não rouba o foco do teclado
  btn.addEventListener('click', () => { btn.blur(); toggle(); });
  panel.querySelector('.menu-go').addEventListener('click', () => panel.classList.remove('open'));   // Continuar: fecha a pausa
  row.addEventListener('click', () => {
    explodeWrong = !explodeWrong; paint();
    try { localStorage.setItem('adress.explodeWrong', explodeWrong ? '1' : '0'); } catch (e) { /* ignora */ }
  });
  addEventListener('keydown', e => { if (e.code === 'Escape' && !e.repeat) toggle(); });   // (segurar Esc não fica abrindo e fechando)
  stageEl.appendChild(btn);
  stageEl.appendChild(panel);

  return { setGate(fn) { canOpen = fn; }, close() { panel.classList.remove('open'); }, get isOpen() { return panel.classList.contains('open'); }, get explodeWrong() { return explodeWrong; }, get unstoppable() { return unstoppable; }, get wrongFx() { return wrongFx; } };
}
