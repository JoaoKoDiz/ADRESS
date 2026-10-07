// Menu de opções (botão no canto inferior esquerdo ou tecla Esc). A escolha fica salva no navegador.
const CSS = `
.menu-btn { position: absolute; left: clamp(10px, 1.4vw, 20px); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  padding: .6em 1.4em; border: 3px solid #fff; border-radius: 999px; background: #3a2a1a; color: #fff3d6;
  font: 700 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .08em;
  box-shadow: 0 4px 0 #1d140c, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.menu-btn:hover { filter: brightness(1.15); }
.menu-panel { position: absolute; left: clamp(10px, 1.4vw, 20px); bottom: calc(clamp(10px, 1.6vh, 20px) + 3.6em); z-index: 4;
  min-width: 290px; padding: 16px 18px; border-radius: 16px; background: #fff3d6; border: 3px solid #e6cc98; color: #3a2a1a;
  font: 15px "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.3); display: none; }
.menu-panel.open { display: block; }
.menu-panel h3 { margin: 0 0 12px; font-size: 17px; color: #e8661a; letter-spacing: .06em; }
.menu-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; cursor: pointer; user-select: none; padding: 6px 0; }
.menu-sw { width: 46px; height: 26px; border-radius: 13px; background: #b9ae98; position: relative; flex: none; transition: background .15s; }
.menu-sw::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; }
.menu-row.on .menu-sw { background: #e3262e; }
.menu-row.on .menu-sw::after { left: 23px; }
.menu-keys { margin-top: 12px; font-size: 13px; color: #8a7355; line-height: 1.6; }
`;

export function createMenu(stageEl) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  let explodeWrong = true, unstoppable = false;
  try { unstoppable = localStorage.getItem('adress.unstoppable') === '1'; } catch (e) { /* ignora */ }
  try { const v = localStorage.getItem('adress.explodeWrong'); if (v !== null) explodeWrong = v === '1'; } catch (e) { /* ignora */ }

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'menu-btn'; btn.tabIndex = -1; btn.textContent = 'MENU';
  const panel = document.createElement('div');
  panel.className = 'menu-panel';
  panel.innerHTML = `<h3>OPÇÕES</h3>
    <div class="menu-row" data-opt="explode"><span>Casa explode na entrega errada</span><span class="menu-sw"></span></div>
    <div class="menu-row" data-opt="ghost"><span>Van imparável (atravessa e destrói tudo)</span><span class="menu-sw"></span></div>
    <div class="menu-keys">F: disparar o míssil da van (a rodada reinicia)<br>H: helicóptero (Espaço sobe, Shift desce) · T: dica<br>C: câmera · M: missões (Carreira) · Esc: fechar</div>`;
  const row = panel.querySelector('[data-opt="explode"]');
  const rowG = panel.querySelector('[data-opt="ghost"]');
  const paint = () => { row.classList.toggle('on', explodeWrong); rowG.classList.toggle('on', unstoppable); };
  rowG.addEventListener('click', () => {
    unstoppable = !unstoppable; paint();
    try { localStorage.setItem('adress.unstoppable', unstoppable ? '1' : '0'); } catch (e) { /* ignora */ }
  });
  paint();

  const toggle = () => panel.classList.toggle('open');
  for (const el of [btn, panel]) el.addEventListener('mousedown', e => e.preventDefault()); // não rouba o foco do teclado
  btn.addEventListener('click', () => { btn.blur(); toggle(); });
  row.addEventListener('click', () => {
    explodeWrong = !explodeWrong; paint();
    try { localStorage.setItem('adress.explodeWrong', explodeWrong ? '1' : '0'); } catch (e) { /* ignora */ }
  });
  addEventListener('keydown', e => { if (e.code === 'Escape') toggle(); });
  stageEl.appendChild(btn);
  stageEl.appendChild(panel);

  return { get explodeWrong() { return explodeWrong; }, get unstoppable() { return unstoppable; } };
}
