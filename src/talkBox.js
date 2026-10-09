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
    @keyframes talkbox-blink { to { visibility: hidden; } }`;
  document.head.appendChild(css);
  stage.appendChild(el);
  const textEl = el.querySelector('.talkbox-text');

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
    hide() { open = false; el.style.display = 'none'; onDone = null; },
  };
}
