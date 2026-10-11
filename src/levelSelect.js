// Modo Livre: escolha do bairro. Páginas de 8 cartões creme (4×2), setas laterais para trocar de página com as miniaturas; setas ou clique selecionam; botão "Jogar no Bairro N" ou E/Enter joga.
import { renderMiniThumbnails } from './careerMap.js';

const CSS = `
.lsel { position: fixed; inset: 0; z-index: 25; display: none; flex-direction: column; align-items: center; justify-content: center;
  gap: clamp(8px, 2.2vh, 26px); padding: clamp(56px, 8vh, 90px) 2vw 2vh; box-sizing: border-box;
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); background: rgba(30,22,14,.22);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; color: #2e1d10; user-select: none; }
.lsel.on { display: flex; }
.lsel h2 { margin: 0; font-weight: 900; font-size: clamp(28px, min(4vw, 7vh), 66px); color: #fff8ea;
  text-shadow: 0 3px 0 rgba(60,35,15,.75), 0 6px 18px rgba(0,0,0,.35); }
.lsel-grid { display: grid; grid-template-columns: repeat(4, min(20vw, 30vh)); gap: clamp(8px, 1.8vh, 20px) clamp(8px, 1.2vw, 20px); }
.lsel-card { position: relative; border: 3px solid rgba(201,167,106,.7); border-radius: clamp(10px, 1.2vw, 18px); overflow: hidden; background: #fff3d6;
  cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.22); transition: transform .12s; }
.lsel-card img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: contain; }
.lsel-card .lbl { padding: 0 .75em .55em; font-weight: 900; font-size: clamp(13px, min(1.35vw, 2.4vh), 22px); letter-spacing: .03em; line-height: 1.15; }
.lsel-card .lbl small { display: block; font-weight: 700; font-size: .8em; letter-spacing: 0; opacity: .85; margin-top: .1em; }
.lsel-card.sel { border-color: #ff7a1a; border-width: 4px; transform: scale(1.04); box-shadow: 0 0 0 3px rgba(255,122,26,.35), 0 10px 24px rgba(0,0,0,.3); z-index: 1; }
.lsel-row { display: flex; align-items: center; gap: clamp(10px, 1.6vw, 28px); }
.lsel-arrow { flex: none; width: clamp(44px, 4.2vw, 68px); height: clamp(44px, 4.2vw, 68px); border-radius: 50%; border: 4px solid #fff3d6;
  background: #ff7a1a; color: #fff; font: 900 clamp(22px, 2.4vw, 38px)/1 "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer;
  box-shadow: 0 4px 0 #a8480b, 0 8px 18px rgba(0,0,0,.28); display: flex; align-items: center; justify-content: center; padding: 0; }
.lsel-arrow:hover { filter: brightness(1.08); }
.lsel-arrow.off { visibility: hidden; }   /* some, mas guarda o lugar: a grade não muda de posição */
.lsel-card.soon { cursor: default; opacity: .5; border-style: dashed; box-shadow: none; background: rgba(255,243,214,.55); }
.lsel-card.soon .ph { width: 100%; aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center;
  font-weight: 900; font-size: clamp(14px, min(1.5vw, 2.6vh), 24px); color: #8a6a44; letter-spacing: .04em; }
body.lsel-on .title-play, body.lsel-on .title-driver { visibility: hidden; }   /* atrás, só o bairro desfocado */
.lsel-play { margin-top: clamp(4px, 1vh, 12px); padding: .45em 2.2em; border: 4px solid #fff3d6; border-radius: 999px; background: #ff7a1a; color: #fff;
  font: 900 clamp(18px, min(2.2vw, 4vh), 36px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer;
  box-shadow: 0 5px 0 #a8480b, 0 10px 22px rgba(0,0,0,.28); }
.lsel-play:hover { filter: brightness(1.08); }
.lsel-hint { font-weight: 700; font-size: clamp(12px, 1.1vw, 17px); color: #fff8ea; opacity: .9; text-shadow: 0 2px 4px rgba(0,0,0,.5); }
.lsel-hint b { display: inline-block; min-width: 1.3em; text-align: center; color: #fff; background: #ff7a1a; border-radius: 5px; padding: .05em .3em; margin: 0 .12em; }
`;
// nomes dos bairros (só nesta tela do Modo Livre)
const NAMES = ['Bairro Raízes', 'Bairro Horizontes', 'Bairro Constância', 'Bairro Veredas', 'Bairro Ofício', 'Bairro Mirante', 'Bairro Altitude', 'Bairro Ápice', 'Bairro Encostas', 'Bairro Travessia', 'Bairro Trilhos'];
const COLS = 4, PER = 8;                    // 8 por página (4×2); as páginas seguem sozinhas conforme entram bairros

export function createLevelSelect(onPick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'lsel';
  el.innerHTML = '<h2>Escolha o bairro</h2><div class="lsel-row"><button type="button" class="lsel-arrow prev" aria-label="Página anterior">&#8592;</button>' +
    '<div class="lsel-grid"></div><button type="button" class="lsel-arrow next" aria-label="Próxima página">&#8594;</button></div><button type="button" class="lsel-play"></button>' +
    '<div class="lsel-hint"><b>←</b><b>↑</b><b>↓</b><b>→</b> Escolher &nbsp;·&nbsp; <b>E</b> Jogar</div>';
  document.body.appendChild(el);
  const grid = el.querySelector('.lsel-grid'), playBtn = el.querySelector('.lsel-play');
  playBtn.tabIndex = -1;
  playBtn.addEventListener('mousedown', e => e.preventDefault());
  playBtn.addEventListener('click', () => onPick(sel));
  const prevBtn = el.querySelector('.lsel-arrow.prev'), nextBtn = el.querySelector('.lsel-arrow.next');
  for (const b of [prevBtn, nextBtn]) { b.tabIndex = -1; b.addEventListener('mousedown', e => e.preventDefault()); }
  prevBtn.addEventListener('click', () => goPage(page - 1));
  nextBtn.addEventListener('click', () => goPage(page + 1));
  let cards = null, sel = 0, page = 0, COUNT = 0;
  const pages = () => Math.ceil(COUNT / PER);

  function paint() {
    if (Math.floor(sel / PER) !== page) showPage(Math.floor(sel / PER));
    cards.forEach((c, i) => c.classList.toggle('sel', i === sel)); playBtn.textContent = `Jogar no Bairro ${sel + 1}`;
  }
  /** Mostra os 8 espaços da página p: bairros disponíveis e, no resto, cartões "Em breve" (não selecionáveis). */
  function showPage(p) {
    page = p; grid.textContent = '';
    for (let k = 0; k < PER; k++) {
      const i = p * PER + k;
      if (i < COUNT) { grid.appendChild(cards[i]); continue; }
      const c = document.createElement('div');
      c.className = 'lsel-card soon';
      c.innerHTML = '<div class="ph">Em breve</div><div class="lbl">&nbsp;<small>&nbsp;</small></div>';
      grid.appendChild(c);
    }
    prevBtn.classList.toggle('off', page === 0);
    nextBtn.classList.toggle('off', page >= pages() - 1);   // só se a próxima página tiver ao menos 1 bairro
  }
  function goPage(p, row = 0) {
    if (p < 0 || p >= pages()) return;
    sel = Math.min(COUNT - 1, p * PER + row * COLS);         // mesma fila, se houver bairro nela; senão o último disponível
    if (Math.floor(sel / PER) !== p) sel = p * PER;
    showPage(p); paint();
  }
  function build() {
    const urls = renderMiniThumbnails();
    COUNT = urls.length;
    cards = urls.map((u, i) => {
      const c = document.createElement('div');
      c.className = 'lsel-card';
      c.innerHTML = `<img src="${u}" alt=""><div class="lbl">BAIRRO ${i + 1}<small>${NAMES[i] || ''}</small></div>`;
      c.addEventListener('click', () => { sel = i; paint(); });            // clique seleciona; o botão (ou E) joga
      c.addEventListener('dblclick', () => { sel = i; paint(); onPick(i); });
      return c;
    });
    showPage(0);
  }
  return {
    open(level = 0) { if (!cards) build(); sel = Math.min(level, COUNT - 1); showPage(Math.floor(sel / PER)); paint(); el.classList.add('on'); document.body.classList.add('lsel-on'); },
    close() { el.classList.remove('on'); document.body.classList.remove('lsel-on'); },
    get isOpen() { return el.classList.contains('on'); },
    get selected() { return sel; },
    /** dx/dy: um passo de seta dentro da página (ignora os "Em breve"); nas bordas laterais, troca de página. */
    move(dx, dy) {
      const k = sel % PER, c = k % COLS + dx, r = Math.floor(k / COLS) + dy;
      if (r < 0 || r >= PER / COLS) return;
      if (c < 0) return goPage(page - 1, r);
      if (c >= COLS) return goPage(page + 1, r);
      const i = page * PER + r * COLS + c;
      if (i >= COUNT) return;                                  // espaço "Em breve": não seleciona
      sel = i; paint();
    },
  };
}
