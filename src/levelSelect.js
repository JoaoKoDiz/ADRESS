// Modo Livre: escolha do bairro. Todas as miniaturas visíveis de uma vez; setas mudam a seleção, E/Enter joga.
import { renderMiniThumbnails } from './careerMap.js';
import { LEVEL_NAMES } from './missions.js';

const CSS = `
.lsel { position: fixed; inset: 0; z-index: 25; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 2.2vh;
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); background: rgba(30,22,14,.6);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; color: #fff3d6; user-select: none; }
.lsel.on { display: flex; }
.lsel h2 { margin: 0; font-weight: 900; font-size: clamp(22px, 3vw, 42px); letter-spacing: .08em; text-shadow: 0 4px 0 rgba(0,0,0,.4); }
.lsel-grid { display: grid; grid-template-columns: repeat(3, min(27vw, 46vh)); gap: 2vh 2vw; }
.lsel-card { position: relative; border: 4px solid rgba(255,255,255,.55); border-radius: 18px; overflow: hidden; background: #6fae4a; cursor: pointer;
  box-shadow: 0 6px 18px rgba(0,0,0,.35); transition: transform .12s, border-color .12s, box-shadow .12s; }
.lsel-card img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.lsel-card .lbl { padding: .35em .6em; background: #3a2a1a; font-weight: 800; font-size: clamp(13px, 1.4vw, 20px); letter-spacing: .04em; }
.lsel-card .lbl small { display: block; font-weight: 600; font-size: .75em; opacity: .75; min-height: 1.2em; }
.lsel-card.sel { border-color: #ff7a1a; transform: scale(1.06); box-shadow: 0 0 0 4px rgba(255,122,26,.45), 0 10px 26px rgba(0,0,0,.45); }
.lsel-card.sel .lbl { background: #ff7a1a; color: #fff; }
.lsel-hint { font-weight: 700; font-size: clamp(13px, 1.2vw, 18px); opacity: .9; }
.lsel-hint b { color: #fff; background: #e8661a; border-radius: 6px; padding: 0 .4em; margin: 0 .15em; }
`;
const COLS = 3, COUNT = 6;

export function createLevelSelect(onPick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'lsel';
  el.innerHTML = '<h2>ESCOLHA O BAIRRO</h2><div class="lsel-grid"></div>' +
    '<div class="lsel-hint"><b>←</b><b>↑</b><b>↓</b><b>→</b> escolher &nbsp; <b>E</b> jogar</div>';
  document.body.appendChild(el);
  const grid = el.querySelector('.lsel-grid');
  let cards = null, sel = 0;

  function paint() { cards.forEach((c, i) => c.classList.toggle('sel', i === sel)); }
  function build() {
    const urls = renderMiniThumbnails();
    cards = urls.map((u, i) => {
      const c = document.createElement('div');
      c.className = 'lsel-card';
      c.innerHTML = `<img src="${u}" alt=""><div class="lbl">BAIRRO ${i + 1}<small>${LEVEL_NAMES[i] || ''}</small></div>`;
      c.addEventListener('mouseenter', () => { sel = i; paint(); });
      c.addEventListener('click', () => { sel = i; paint(); onPick(i); });
      grid.appendChild(c);
      return c;
    });
  }
  return {
    open(level = 0) { if (!cards) build(); sel = level; paint(); el.classList.add('on'); },
    close() { el.classList.remove('on'); },
    get isOpen() { return el.classList.contains('on'); },
    get selected() { return sel; },
    /** dx/dy: um passo de seta; o seletor para nas bordas (sem dar a volta). */
    move(dx, dy) {
      const c = sel % COLS + dx, r = Math.floor(sel / COLS) + dy;
      if (c < 0 || c >= COLS || r < 0 || r >= COUNT / COLS) return;
      sel = r * COLS + c; paint();
    },
  };
}
