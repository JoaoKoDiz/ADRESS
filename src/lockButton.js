// Cadeado no mapa da Carreira (canto inferior direito, no lugar do botão DICA): pede uma senha e, se ela
// estiver certa, abre o PAINEL DE DESENVOLVIMENTO (a liberação de teste de todos os bairros é a caixa do painel), com duas
// seções separadas: "História secundária" (checkpoints) e "Missões do Modo Carreira" (reiniciar todas / escolher os bairros
// com todas as missões completas). Não rouba o foco do teclado enquanto fechado.
const CSS = `
.lock-btn { position: absolute; right: clamp(10px, 1.4vw, 20px); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  width: clamp(54px, 4.4vw, 68px); height: clamp(54px, 4.4vw, 68px); padding: 0; display: none; place-items: center;
  border: 3px solid #fff; border-radius: 50%; background: #e0a526; cursor: pointer; user-select: none;
  box-shadow: 0 4px 0 #94660c, 0 8px 18px rgba(0,0,0,.28); transition: transform .12s, filter .12s; }
.lock-btn.on { display: grid; }
.lock-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
.lock-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 #94660c, 0 4px 10px rgba(0,0,0,.25); }
.lock-btn svg { width: 58%; height: 58%; }
.lock-btn[data-open="1"] { background: #3c9d55; box-shadow: 0 4px 0 #22643a, 0 8px 18px rgba(0,0,0,.28); }
.lock-panel { position: absolute; inset: 0; z-index: 12; display: none; place-items: center; background: rgba(20,14,8,.45); }
.lock-panel.on { display: grid; }
.lock-card { min-width: 260px; padding: 20px 24px 18px; border-radius: 18px; background: #fff3d6; border: 4px solid #3a2a1a;
  box-shadow: 0 8px 0 #1d140c, 0 16px 30px rgba(0,0,0,.35); text-align: center; color: #3a2a1a;
  font: 700 16px "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.lock-card h3 { margin: 0 0 12px; font-size: 20px; letter-spacing: .06em; }
.lock-card input { width: 150px; padding: .35em .5em; border: 3px solid #3a2a1a; border-radius: 10px; background: #fff;
  font: 800 26px "Trebuchet MS",system-ui,sans-serif; letter-spacing: .4em; text-align: center; color: #3a2a1a; outline: none; }
.lock-card .msg { min-height: 1.3em; margin: 8px 0 4px; font-size: 14px; color: #c0392b; }
.lock-card .msg.ok { color: #2e8048; }
.lock-card .row { display: flex; gap: 10px; justify-content: center; margin-top: 6px; }
.lock-card button { padding: .45em 1.1em; border: 3px solid #3a2a1a; border-radius: 999px; cursor: pointer;
  font: 800 15px "Trebuchet MS",system-ui,sans-serif; background: #e0a526; color: #3a2a1a; box-shadow: 0 3px 0 #1d140c; }
.lock-card button.ghost { background: #fff; }
.lock-card .cps { display: grid; gap: 7px; margin: 4px 0 10px; text-align: left; }
.lock-card .cps button { width: 100%; text-align: left; padding: .5em .9em; background: #fff; box-shadow: 0 2px 0 #1d140c; font-size: 14px; }
.lock-card .cps button.cur { background: #ffd98a; border-color: #FF7A1A; }
.lock-card .cps button:hover { filter: brightness(.96); }
.lock-card.shake { animation: lockShake .35s; }
/* painel de desenvolvimento (depois da senha) */
.lock-card.dev { position: relative; width: min(860px, 94vw); max-height: 88vh; overflow: auto; box-sizing: border-box; padding: 16px 20px 16px; text-align: left; }
.lock-card.dev h3 { text-align: center; margin-bottom: 2px; }
.dev-note { text-align: center; font-size: 13px; color: #6b5a40; margin-bottom: 4px; }
.dev-sec { border-radius: 14px; padding: 10px 14px 14px; margin-top: 12px; }
.dev-sec.story { background: #eef0fb; border: 3px solid #5b67c9; }
.dev-sec.miss { background: #fff3d6; border: 3px solid #FF7A1A; }
.dev-sec h4 { margin: 0 0 8px; font-size: 17px; letter-spacing: .04em; display: flex; align-items: center; gap: 8px; }
.dev-sec h4 small { font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; color: #fff; letter-spacing: .06em; }
.dev-sec.story h4 small { background: #5b67c9; }
.dev-sec.miss h4 small { background: #e8661a; }
.dev-sec .msg { margin: 6px 0 0; text-align: center; }
.lock-card.dev .cps { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); margin: 0; }
.lock-card.dev .cps button { border-color: #3a3f7a; }
.lock-card.dev .cps button.cur { background: #cfd5ff; border-color: #5b67c9; }
.lock-card button.dev-reset { display: block; width: 100%; padding: .65em 1em; font-size: 19px; background: #d9452b; color: #fff; border-color: #6e1b0e; box-shadow: 0 4px 0 #6e1b0e; letter-spacing: .03em; }
.lock-card button.dev-reset:hover { filter: brightness(1.07); }
.dev-help { margin: 14px 0 8px; font-size: 14px; }
.dev-levels { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px 10px; }
.dev-lv { display: flex; align-items: center; gap: 8px; padding: 5px 9px; border-radius: 9px; background: #fff; border: 2px solid #e6cc98; font-size: 13.5px; cursor: pointer; }
.lock-card .dev-lv input { width: 18px; height: 18px; margin: 0; padding: 0; border: 0; letter-spacing: 0; accent-color: #e8661a; flex: none; cursor: pointer; }
.dev-lv.off { opacity: .55; cursor: not-allowed; background: #efe9dc; }
.lock-card .dev-lv.off input { cursor: not-allowed; }
.dev-lv .none { margin-left: auto; font-size: 11px; font-weight: 800; color: #8a6a44; white-space: nowrap; }
.dev-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.dev-all { display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer; }
.lock-card .dev-all input { width: 18px; height: 18px; margin: 0; padding: 0; border: 0; letter-spacing: 0; accent-color: #3c9d55; }
.dev-close { display: flex; justify-content: center; margin-top: 12px; }
.dev-confirm { position: fixed; inset: 0; z-index: 2; display: none; place-items: center; background: rgba(40,26,16,.45); }
.dev-confirm.on { display: grid; }
.dev-confirm > div { width: min(440px, 88%); padding: 18px 20px; border-radius: 14px; background: #fff; border: 4px solid #d9452b; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
.dev-confirm p { margin: 0 0 14px; font-size: 16px; line-height: 1.45; }
@keyframes lockShake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
`;

const PASSWORD = '1225';
const LOCK_SVG = open => `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="${open ? 'M7 11V7a5 5 0 0 1 9.6-2' : 'M7 11V7a5 5 0 0 1 10 0v4'}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="4" y="11" width="16" height="11" rx="2.5" fill="#fff"/><circle cx="12" cy="16" r="1.8" fill="#3a2a1a"/></svg>`;

/** onUnlock(): chamado quando a senha certa é digitada. isUnlockedAll(): o cadeado já foi aberto antes?
 *  cp (checkpoints de teste da história): { names: [...], current(): índice, apply(i) } — depois da senha abre o painel.
 *  dev (missões da Carreira): { levels(): [{ i, label, has }], completed(i), resetAll(), apply(Set de índices),
 *  devOpen(), setDevOpen(on) } — mexe só nas missões e na progressão da Carreira. */
export function createLockButton(stageEl, onUnlock, isUnlockedAll, cp = null, dev = null) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lock-btn';
  btn.tabIndex = -1;
  btn.title = 'Desbloquear bairros';
  btn.addEventListener('mousedown', e => e.preventDefault());
  stageEl.appendChild(btn);

  const panel = document.createElement('div');
  panel.className = 'lock-panel';
  const PASS_HTML = `<h3>🔒 SENHA</h3>
    <input type="password" inputmode="numeric" maxlength="8" autocomplete="off">
    <div class="msg"></div>
    <div class="row"><button type="button" class="ghost" data-k="cancel">Cancelar</button><button type="button" data-k="ok">Desbloquear</button></div>`;
  panel.innerHTML = `<div class="lock-card">${PASS_HTML}</div>`;
  stageEl.appendChild(panel);
  const card = panel.querySelector('.lock-card');
  let field = panel.querySelector('input'), msg = panel.querySelector('.msg');

  let open = false, shown = false;
  const paint = () => { const o = isUnlockedAll(); btn.dataset.open = o ? '1' : ''; btn.innerHTML = LOCK_SVG(o); };
  paint();

  function show() {
    card.classList.remove('dev'); confirmBox = null;
    card.innerHTML = PASS_HTML; field = card.querySelector('input'); msg = card.querySelector('.msg');
    field.addEventListener('input', () => { field.value = field.value.replace(/\D/g, ''); });
    open = true; field.value = ''; msg.textContent = ''; msg.className = 'msg';
    panel.classList.add('on');
    setTimeout(() => field.focus(), 0);
  }
  function close() { open = false; panel.classList.remove('on'); field.blur(); }
  function submit() {
    if (field.value === PASSWORD) {
      onUnlock(); paint();
      if (cp || dev) { showDev(); return; }
      msg.textContent = 'Todos os bairros desbloqueados!'; msg.className = 'msg ok';
      setTimeout(close, 900);
    } else {
      msg.textContent = 'Senha incorreta'; msg.className = 'msg';
      field.value = ''; field.focus();
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    }
  }

  // PAINEL DE DESENVOLVIMENTO: história secundária (checkpoints) e missões da Carreira, em seções separadas
  let storyMsg = null, missMsg = null, confirmBox = null;
  function showDev() {
    const cur = cp ? cp.current() : -1;
    const storyHtml = cp ? `<section class="dev-sec story"><h4>História secundária <small>CHECKPOINTS</small></h4>
        <div class="cps">${cp.names.map((n, i) => `<button type="button" data-cp="${i}" class="${i === cur ? 'cur' : ''}">${i + 1}. ${n}</button>`).join('')}</div>
        <div class="msg ok" data-m="story"></div></section>` : '';
    const missHtml = dev ? `<section class="dev-sec miss"><h4>Missões do Modo Carreira <small>MISSÕES</small></h4>
        <button type="button" class="dev-reset" data-k="reset">Reiniciar todas as missões</button>
        <div class="dev-help">Selecione os bairros que devem ficar com todas as missões completas.</div>
        <div class="dev-levels">${dev.levels().map(L => `<label class="dev-lv${L.has ? '' : ' off'}"><input type="checkbox" data-lv="${L.i}"${L.has && dev.completed(L.i) ? ' checked' : ''}${L.has ? '' : ' disabled'}>
          <span>${L.label}</span>${L.has ? '' : '<span class="none">Sem missões</span>'}</label>`).join('')}</div>
        <div class="dev-row"><label class="dev-all"><input type="checkbox" data-k="devall"${dev.devOpen() ? ' checked' : ''}> Todos os bairros liberados para teste (não conclui missões)</label>
          <button type="button" data-k="apply">Aplicar seleção</button></div>
        <div class="msg ok" data-m="miss"></div>
        <div class="dev-confirm"><div><p>Reiniciar as missões de todos os bairros? Todas voltarão a ficar incompletas. O progresso da história secundária será mantido.</p>
          <div class="row"><button type="button" class="ghost" data-k="no">Cancelar</button><button type="button" data-k="yes">Reiniciar</button></div></div></div>
      </section>` : '';
    card.classList.add('dev');
    card.innerHTML = `<h3>PAINEL DE DESENVOLVIMENTO</h3><div class="dev-note"></div>${storyHtml}${missHtml}
      <div class="dev-close"><button type="button" class="ghost" data-k="cancel">Fechar</button></div>`;
    storyMsg = card.querySelector('[data-m="story"]'); missMsg = card.querySelector('[data-m="miss"]'); confirmBox = card.querySelector('.dev-confirm');
    msg = storyMsg || missMsg; field = { blur() {}, focus() {}, value: '' };
    paintNote();
  }
  const paintNote = () => { const n = card.querySelector('.dev-note'); if (n) n.textContent = isUnlockedAll() ? 'Todos os bairros liberados para teste (liberação de desenvolvimento).' : 'Liberação de teste desligada: valem só os desbloqueios das missões.'; };
  const say = (el, text) => { if (el) { el.textContent = text; el.className = 'msg ok'; } };
  const refreshChecks = () => card.querySelectorAll('[data-lv]').forEach(c => { if (!c.disabled) c.checked = dev.completed(+c.dataset.lv); });
  btn.addEventListener('click', () => { btn.blur(); if (!open) show(); });
  panel.addEventListener('change', e => {
    if (dev && e.target.dataset && e.target.dataset.k === 'devall') {
      dev.setDevOpen(e.target.checked); paint(); paintNote();
      say(missMsg, e.target.checked ? 'Todos os bairros liberados para teste.' : 'Liberação de teste desligada: valem só os desbloqueios das missões.');
    }
  });
  panel.addEventListener('click', e => {
    const k = e.target.dataset && e.target.dataset.k, c = e.target.dataset && e.target.dataset.cp;
    if (c !== undefined && cp) {                                          // checkpoint da história (não mexe nas missões)
      cp.apply(+c);
      card.querySelectorAll('.cps button').forEach(b => b.classList.toggle('cur', b.dataset.cp === c));
      say(storyMsg || msg, 'Checkpoint aplicado: ' + cp.names[+c]); return;
    }
    if (k === 'reset' && confirmBox) { confirmBox.classList.add('on'); return; }
    if (k === 'no' && confirmBox) { confirmBox.classList.remove('on'); return; }
    if (k === 'yes' && dev) {
      dev.resetAll(); confirmBox.classList.remove('on'); refreshChecks();
      const all = card.querySelector('[data-k="devall"]'); if (all) all.checked = dev.devOpen();
      paint(); paintNote();
      say(missMsg, 'Missões de todos os bairros reiniciadas: só o Bairro 1 está desbloqueado.'); return;
    }
    if (k === 'apply' && dev) {
      const sel = new Set([...card.querySelectorAll('[data-lv]')].filter(x => x.checked && !x.disabled).map(x => +x.dataset.lv));
      dev.apply(sel); refreshChecks(); paint(); paintNote();
      say(missMsg, sel.size ? `Seleção aplicada: ${sel.size} bairro${sel.size > 1 ? 's' : ''} com todas as missões completas.` : 'Seleção aplicada: nenhum bairro com missões completas.');
      return;
    }
    if (k === 'ok') submit();
    else if (k === 'cancel' || e.target === panel) close();
  });
  // as teclas digitadas no painel não vão para o jogo (E/Enter não entram no bairro, A/D não andam)
  panel.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter' && field.addEventListener) submit();
    else if (e.key === 'Escape') { if (confirmBox && confirmBox.classList.contains('on')) confirmBox.classList.remove('on'); else close(); }
  });
  return {
    get isOpen() { return open; },
    /** Mostra/esconde o cadeado (só no mapa da Carreira). */
    set(on) {
      if (!on && open) close();
      if (on === shown) return;
      shown = on;
      btn.classList.toggle('on', on);
    },
    close,
  };
}
