// Cadeado no mapa da Carreira (canto inferior direito, no lugar do botão DICA): pede uma senha e, se ela
// estiver certa, desbloqueia todos os bairros. Não rouba o foco do teclado enquanto fechado.
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
.lock-card.shake { animation: lockShake .35s; }
@keyframes lockShake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
`;

const PASSWORD = '1225';
const LOCK_SVG = open => `<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="${open ? 'M7 11V7a5 5 0 0 1 9.6-2' : 'M7 11V7a5 5 0 0 1 10 0v4'}" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="4" y="11" width="16" height="11" rx="2.5" fill="#fff"/><circle cx="12" cy="16" r="1.8" fill="#3a2a1a"/></svg>`;

/** onUnlock(): chamado quando a senha certa é digitada. isUnlockedAll(): o cadeado já foi aberto antes? */
export function createLockButton(stageEl, onUnlock, isUnlockedAll) {
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
  panel.innerHTML = `<div class="lock-card"><h3>🔒 SENHA</h3>
    <input type="password" inputmode="numeric" maxlength="8" autocomplete="off">
    <div class="msg"></div>
    <div class="row"><button type="button" class="ghost" data-k="cancel">Cancelar</button><button type="button" data-k="ok">Desbloquear</button></div></div>`;
  stageEl.appendChild(panel);
  const card = panel.querySelector('.lock-card'), field = panel.querySelector('input'), msg = panel.querySelector('.msg');

  let open = false, shown = false;
  const paint = () => { const o = isUnlockedAll(); btn.dataset.open = o ? '1' : ''; btn.innerHTML = LOCK_SVG(o); };
  paint();

  function show() {
    open = true; field.value = ''; msg.textContent = ''; msg.className = 'msg';
    panel.classList.add('on');
    setTimeout(() => field.focus(), 0);
  }
  function close() { open = false; panel.classList.remove('on'); field.blur(); }
  function submit() {
    if (field.value === PASSWORD) {
      onUnlock(); paint();
      msg.textContent = 'Todos os bairros desbloqueados!'; msg.className = 'msg ok';
      setTimeout(close, 900);
    } else {
      msg.textContent = 'Senha incorreta'; msg.className = 'msg';
      field.value = ''; field.focus();
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    }
  }

  btn.addEventListener('click', () => { btn.blur(); if (!open) show(); });
  panel.addEventListener('click', e => {
    const k = e.target.dataset && e.target.dataset.k;
    if (k === 'ok') submit();
    else if (k === 'cancel' || e.target === panel) close();
  });
  // as teclas digitadas no painel não vão para o jogo (E/Enter não entram no bairro, A/D não andam)
  panel.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') submit();
    else if (e.key === 'Escape') close();
  });
  field.addEventListener('input', () => { field.value = field.value.replace(/\D/g, ''); });

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
