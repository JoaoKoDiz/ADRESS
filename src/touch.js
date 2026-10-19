// Controles de toque (celular/tablet). Só aparecem quando o jogador usa o toque; teclado e mouse continuam iguais.
// - Joystick (canto inferior esquerdo): vira o eixo analógico do input (mesmo caminho do WASD).
// - Arrastar numa área livre da tela: gira a câmera (eventos sintéticos de "botão direito arrastando": usa as mesmas
//   regras, limites e bloqueios do mouse em todas as câmeras — 3ª pessoa, 1ª pessoa do Grillby's, nível extra).
// - Botões de ação (coluna à direita, acima da DICA; as dicas de teclado do topo somem no modo toque): a tecla equivalente (toque = um aperto; "hold" = segurada enquanto o dedo está no botão).
// - Tocar no balão de fala, no aviso, na indicação "E — …" (entregar, conversar, entrar…) ou na fala do morador = E.
// Multitoque: cada dedo (pointerId) é de uma coisa só (joystick, câmera ou botão).

const CSS = `
.tc-zone { position: fixed; left: 0; bottom: max(62px, 10vh); width: 42vw; height: 50vh; z-index: 2; display: none; touch-action: none; }
body.touch-on .tc-zone.on { display: block; }
.tc-base { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%; pointer-events: none;
  border: 2px solid rgba(255,243,214,.55); background: radial-gradient(circle, rgba(28,20,14,.28), rgba(28,20,14,.12)); opacity: .5; transition: opacity .15s; }
.tc-zone.held .tc-base { opacity: .9; }
.tc-knob { position: absolute; left: 50%; top: 50%; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%;
  background: rgba(255,243,214,.8); border: 2px solid #FF7A1A; box-shadow: 0 2px 6px rgba(0,0,0,.3); }
.tc-acts { position: fixed; right: calc(12px + env(safe-area-inset-right, 0px)); bottom: calc(max(64px, 11vh) + env(safe-area-inset-bottom, 0px)); z-index: 30; display: none;
  flex-direction: column-reverse; align-items: flex-end; gap: 9px; max-height: 62vh; flex-wrap: wrap-reverse; touch-action: none; pointer-events: none; }
.tc-acts .tc-btn { pointer-events: auto; }
body.touch-on .tc-acts.on { display: flex; }
.tc-btn { position: relative; font: 800 14px/1 system-ui, 'Segoe UI', Roboto, sans-serif; color: #2b1d12; background: #FFF3D6; border: 2px solid #FF7A1A;
  border-radius: 999px; padding: 8px 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 0 rgba(0,0,0,.2); user-select: none; -webkit-user-select: none;
  touch-action: none; -webkit-tap-highlight-color: transparent; }
.tc-btn::after { content: ''; position: absolute; inset: -7px; }            /* área de toque maior que o desenho */
.tc-btn b { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 5px;
  background: #2b1d12; color: #FFF3D6; font-size: 11px; }
.tc-btn.down { background: #FF7A1A; color: #fff; }
body.touch-on .ahud-sub { visibility: hidden; }                              /* as dicas de teclado viram os botões */
body.touch-on .ahud-prompt.on { pointer-events: auto; touch-action: none; }
body.touch-on .ahud-prompt.on::after { content: ''; position: absolute; inset: -16px; }
body.touch-on .talkbox, body.touch-on .gamenote { pointer-events: auto; touch-action: none; user-select: none; -webkit-user-select: none; }
body.touch-on .talkbox-next, body.touch-on .gamenote-ok { font-size: 0 !important; }
body.touch-on .talkbox-next::before { content: 'Toque ▸'; font-size: 14px; }
body.touch-on .gamenote-ok::before { content: 'Toque ▸ OK'; font-size: 14px; }
body.touch-on .ahud-main.tc-tap { pointer-events: auto; cursor: pointer; }
body.touch-on, body.touch-on .ahud { -webkit-touch-callout: none; }
body.touch-on { overscroll-behavior: none; }
.tc-cue { position: fixed; left: 50%; top: 64px; z-index: 31; display: none; transform: translateX(-50%); padding: 6px 14px; border-radius: 999px;
  background: #FFF3D6; border: 2px solid #FF7A1A; color: #c2570c; font: 800 13px/1 system-ui, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,.25);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; animation: tc-cue 1.4s ease-in-out infinite; }
body.touch-on .tc-cue.on { display: block; }
@keyframes tc-cue { 50% { transform: translateX(-50%) translateY(2px); } }
canvas.tc-canvas { touch-action: none; -webkit-touch-callout: none; user-select: none; -webkit-user-select: none; }
@supports (padding: env(safe-area-inset-left)) {
  .tc-zone { padding-left: env(safe-area-inset-left); padding-bottom: env(safe-area-inset-bottom); }
}`;

export function createTouch({ input, canvas }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  canvas.classList.add('tc-canvas');
  const zone = document.createElement('div'); zone.className = 'tc-zone';
  const base = document.createElement('div'); base.className = 'tc-base'; base.innerHTML = '<div class="tc-knob"></div>';
  const knob = base.firstChild; zone.appendChild(base); document.body.appendChild(zone);
  const acts = document.createElement('div'); acts.className = 'tc-acts'; document.body.appendChild(acts);
  // fala do morador na barra de cima: no toque não há a dica "[E] continuar" — um aviso logo abaixo da barra mostra que é só tocar
  const cue = document.createElement('div'); cue.className = 'tc-cue'; cue.textContent = 'Toque para continuar ▸'; document.body.appendChild(cue);
  let cueTop = -1;

  let touchOn = false, joyOn = false, lookOn = false, dialogTap = false;
  const R = 46;                                         // raio útil do joystick (px)
  let joy = null;                                       // { id, cx, cy }
  let look = null;                                      // { id, x, y }
  const holds = new Map();                              // pointerId → código segurado
  const home = () => {                                  // posição de descanso: acima do MENU e do botão de música
    const sl = parseFloat(getComputedStyle(zone).paddingLeft) || 0, sb = parseFloat(getComputedStyle(zone).paddingBottom) || 0;
    return { x: 26 + 56 + sl, y: innerHeight - (Math.max(84, innerHeight * 0.14) + 56 + sb) };
  };
  const placeBase = (x, y) => { base.style.left = x + 'px'; base.style.top = y + 'px'; };
  const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
  function endJoy() { joy = null; zone.classList.remove('held'); input.touchAxis(0, 0); setKnob(0, 0); const h = home(); placeBase(h.x, h.y); }
  function mouse(type, x, y, mx = 0, my = 0) {           // "botão direito arrastando" para os controles de câmera que já existem
    const ev = new MouseEvent(type, { button: 2, buttons: type === 'mouseup' ? 0 : 2, clientX: x, clientY: y, bubbles: true });
    Object.defineProperty(ev, 'movementX', { value: mx }); Object.defineProperty(ev, 'movementY', { value: my });
    dispatchEvent(ev);
  }
  function endLook() { if (!look) return; mouse('mouseup', look.x, look.y); look = null; }
  function releaseHolds(keep) { for (const [id, code] of holds) if (!keep || !keep.has(code)) { input.touchHold(code, false); holds.delete(id); const b = acts.querySelector(`[data-key="${code}"]`); if (b) b.classList.remove('down'); } }
  function resetAll() { endJoy(); endLook(); releaseHolds(); input.touchReset(); }

  function setMode(on) {
    if (on === touchOn) return;
    touchOn = on; document.body.classList.toggle('touch-on', on);
    if (!on) resetAll();
  }
  // modo toque: o 1º toque liga; teclado ou mouse de verdade desligam (aparelhos híbridos alternam sem recarregar)
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch' || e.pointerType === 'pen') setMode(true); else if (e.pointerType === 'mouse') setMode(false); }, true);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && touchOn && (Math.abs(e.movementX) + Math.abs(e.movementY)) > 2) setMode(false); }, true);
  addEventListener('keydown', e => { if (e.isTrusted && touchOn) setMode(false); }, true);
  addEventListener('blur', resetAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) resetAll(); });

  // joystick (aparece onde o dedo encosta, dentro da área do canto inferior esquerdo)
  zone.addEventListener('pointerdown', e => {
    if (joy || !joyOn) return;
    e.preventDefault(); zone.setPointerCapture(e.pointerId);
    const h = home(), x = Math.max(60, Math.min(e.clientX, innerWidth * 0.42 - 60)), y = Math.max(innerHeight * 0.4 + 56, Math.min(e.clientY, h.y));   // (nunca por cima do MENU e da música)
    joy = { id: e.pointerId, cx: x || h.x, cy: y || h.y }; placeBase(joy.cx, joy.cy); zone.classList.add('held'); moveJoy(e);
  });
  function moveJoy(e) {
    let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    setKnob(dx, dy);
    const k = Math.min(1, d / R), dead = 0.18, m = k < dead ? 0 : (k - dead) / (1 - dead);
    input.touchAxis(d ? dx / Math.min(d, R) * m : 0, d ? dy / Math.min(d, R) * m : 0);
  }
  zone.addEventListener('pointermove', e => { if (joy && e.pointerId === joy.id) moveJoy(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(t, e => { if (joy && e.pointerId === joy.id) endJoy(); });
  zone.addEventListener('contextmenu', e => e.preventDefault());

  // câmera: arrastar o dedo numa área livre (o próprio canvas do jogo; botões e balões ficam por cima dele)
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    e.preventDefault();
    if (look || !lookOn) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
    look = { id: e.pointerId, x: e.clientX, y: e.clientY }; mouse('mousedown', e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    const mx = (e.clientX - look.x) * 1.3, my = (e.clientY - look.y) * 1.3;
    look.x = e.clientX; look.y = e.clientY; mouse('mousemove', e.clientX, e.clientY, mx, my);
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(t, e => { if (look && e.pointerId === look.id) endLook(); });
  canvas.addEventListener('contextmenu', e => { if (touchOn) e.preventDefault(); });

  // balão de fala, aviso, indicação "E — …" e fala do morador: um toque = um aperto de E (o jogo decide completar ou avançar)
  addEventListener('pointerdown', e => {
    if (!touchOn || (e.pointerType !== 'touch' && e.pointerType !== 'pen')) return;
    const t = e.target.closest ? e.target : e.target.parentElement;
    if (!t || !t.closest) return;
    const prm = t.closest('.ahud-prompt.on') || document.elementsFromPoint(e.clientX, e.clientY).some(x => x.closest && x.closest('.ahud-prompt.on'));   // a indicação do lugar tem prioridade
    if (prm || t.closest('.talkbox') || t.closest('.gamenote') || (dialogTap && (t.closest('.ahud-main') || t.closest('.tc-cue')))) {
      e.preventDefault(); e.stopPropagation(); input._press('KeyE');
    }
  }, true);

  // botões de ação
  let actKey = '';
  acts.addEventListener('pointerdown', e => {
    const b = e.target.closest('.tc-btn'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const code = b.dataset.key;
    if (b.dataset.hold === '1') { try { b.setPointerCapture(e.pointerId); } catch (err) { /* */ } holds.set(e.pointerId, code); input.touchHold(code, true); b.classList.add('down'); }
    else { input._press(code); b.classList.add('down'); setTimeout(() => b.classList.remove('down'), 140); }
  });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) acts.addEventListener(t, e => {
    const code = holds.get(e.pointerId); if (!code) return;
    holds.delete(e.pointerId); if (![...holds.values()].includes(code)) input.touchHold(code, false);
    const b = acts.querySelector(`[data-key="${code}"]`); if (b) b.classList.remove('down');
  });
  acts.addEventListener('contextmenu', e => e.preventDefault());

  return {
    get on() { return touchOn; },
    /** Por quadro (main.updateHUD): o que pode aparecer agora. actions: [{ key, label, k (tecla mostrada), hold }]. */
    update({ joystick = false, look: lk = false, actions = [], dialog = false, top = 64 } = {}) {
      if (!touchOn) { if (joyOn || lookOn) { joyOn = lookOn = false; zone.classList.remove('on'); acts.classList.remove('on'); } return; }
      if (dialog !== dialogTap) cue.classList.toggle('on', dialog);
      if (dialog && Math.round(top) !== cueTop) { cueTop = Math.round(top); cue.style.top = (cueTop + 40) + 'px'; }   // (abaixo do cronômetro e do MISSÕES)
      dialogTap = dialog;
      const main = document.querySelector('.ahud-main'); if (main) main.classList.toggle('tc-tap', dialog);
      if (joystick !== joyOn) { joyOn = joystick; zone.classList.toggle('on', joystick); if (!joystick) endJoy(); else if (!joy) endJoy(); }
      if (lk !== lookOn) { lookOn = lk; if (!lk) endLook(); }
      const key = actions.map(a => a.key + a.label + (a.hold ? 'h' : '')).join('|');
      if (key !== actKey) {
        actKey = key;
        releaseHolds(new Set(actions.filter(a => a.hold).map(a => a.key)));
        acts.textContent = '';
        for (const a of actions) {
          const b = document.createElement('div'); b.className = 'tc-btn'; b.dataset.key = a.key; b.dataset.hold = a.hold ? '1' : '0';
          b.innerHTML = (a.k ? `<b>${a.k}</b>` : '') + `<span>${a.label}</span>`; acts.appendChild(b);
          if (a.hold && [...holds.values()].includes(a.key)) b.classList.add('down');
        }
      }
      acts.classList.toggle('on', actions.length > 0);
    },
    reset: resetAll,
  };
}
