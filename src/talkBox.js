// Caixa de diálogo no estilo Undertale/Deltarune (sem pixel art e sem retrato): o texto aparece aos poucos,
// uma fala por vez. A 1ª tecla completa a fala que está aparecendo; a seguinte passa para a próxima.
// Cada fala é uma lista de trechos: 'texto' ou { b: 'texto em negrito' } (o negrito aparece já durante a digitação).
const CPS = 38;                               // letras por segundo

export function createTalkBox(stage) {
  const el = document.createElement('div');
  el.className = 'talkbox';
  el.innerHTML = '<div class="talkbox-text"></div><div class="talkbox-next">E ▸</div>';
  const css = document.createElement('style');
  css.textContent = `
    .talkbox { position: absolute; left: 50%; bottom: 4%; transform: translateX(-50%); width: min(820px, 88%);
      min-height: 120px; box-sizing: border-box; padding: 22px 30px 30px; background: #FFF3D6; color: #000;
      border: 5px solid #FF7A1A; border-radius: 18px; box-shadow: 0 6px 0 rgba(0,0,0,.18);
      font: 600 23px/1.45 system-ui, 'Segoe UI', Roboto, sans-serif; z-index: 40; display: none; pointer-events: none; }
    .talkbox-text b { font-weight: 900; }
    .talkbox-next { position: absolute; right: 18px; bottom: 8px; font-size: 14px; font-weight: 700; color: #FF7A1A;
      opacity: 0; animation: talkbox-blink 1s steps(2, start) infinite; }
    .talkbox.done .talkbox-next { opacity: .85; }
    @keyframes talkbox-blink { to { visibility: hidden; } }
    .gamenote { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, 86%);
      box-sizing: border-box; padding: 18px 26px 30px; background: #FFF3D6; color: #000; border: 4px solid #FF7A1A;
      border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.35); z-index: 41; display: none; pointer-events: none;
      font: 600 21px/1.45 system-ui, 'Segoe UI', Roboto, sans-serif; text-align: center; }
    .gamenote-label { display: inline-block; margin-bottom: 10px; padding: 3px 12px; border-radius: 999px; background: #FF7A1A;
      color: #fff; font-size: 13px; font-weight: 800; letter-spacing: .12em; }
    .gamenote-text b { font-weight: 900; }
    .gamenote-ok { position: absolute; right: 16px; bottom: 7px; font-size: 14px; font-weight: 700; color: #FF7A1A; }
    .fade-black { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 60; transition-property: opacity; transition-timing-function: linear; }`;
  document.head.appendChild(css);
  stage.appendChild(el);
  const textEl = el.querySelector('.talkbox-text');
  // aviso da interface (não é fala de personagem): cartão central com o rótulo, texto inteiro de uma vez
  const note = document.createElement('div');
  note.className = 'gamenote';
  note.innerHTML = '<div class="gamenote-label"></div><div class="gamenote-text"></div><div class="gamenote-ok">E ▸ OK</div>';
  stage.appendChild(note);
  let noteCb = null;
  // tela preta para transições (fade com duração própria)
  const black = document.createElement('div'); black.className = 'fade-black'; stage.appendChild(black);

  let lines = [], idx = 0, shown = 0, total = 0, onDone = null, open = false;
  const segs = () => lines[idx].map(p => typeof p === 'string' ? { t: p, b: false } : { t: p.b, b: true });
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function render() {
    let left = Math.floor(shown), html = '';
    for (const sg of segs()) {
      if (left <= 0) break;
      const part = esc(sg.t.slice(0, left)); left -= sg.t.length;
      html += sg.b ? `<b>${part}</b>` : part;
    }
    textEl.innerHTML = html;
    el.classList.toggle('done', shown >= total);
  }
  function startLine() { shown = 0; total = segs().reduce((n, s) => n + s.t.length, 0); render(); }

  return {
    get open() { return open; },
    /** Mostra as falas (lista de listas de trechos); cb quando a última termina. */
    show(ls, cb) { lines = ls; idx = 0; onDone = cb; open = true; el.style.display = 'block'; startLine(); },
    /** Tecla de avançar: completa a fala ou passa para a próxima. */
    press() {
      if (!open) return;
      if (shown < total) { shown = total; render(); return; }
      if (++idx < lines.length) { startLine(); return; }
      open = false; el.style.display = 'none';
      const cb = onDone; onDone = null; cb && cb();
    },
    update(dt) { if (open && shown < total) { shown = Math.min(total, shown + dt * CPS); render(); } },
    hide() { open = false; el.style.display = 'none'; onDone = null; note.style.display = 'none'; noteCb = null; },
    get noteOpen() { return !!noteCb; },
    /** Aviso da interface: rótulo + texto (trechos como nas falas); cb quando o jogador confirma (pressNote). */
    note(label, parts, cb) {
      note.querySelector('.gamenote-label').textContent = label;
      note.querySelector('.gamenote-text').innerHTML = parts.map(p => typeof p === 'string' ? esc(p) : `<b>${esc(p.b)}</b>`).join('');
      note.style.display = 'block'; noteCb = cb;
    },
    pressNote() { if (!noteCb) return; const cb = noteCb; noteCb = null; note.style.display = 'none'; cb(); },
    /** Tela preta: vai até `to` (0..1) em `ms` milissegundos; cb ao terminar. */
    fadeBlack(to, ms, cb) {
      black.style.transitionDuration = ms + 'ms';
      requestAnimationFrame(() => { black.style.opacity = String(to); });
      setTimeout(() => cb && cb(), ms + 30);
    },
  };
}
