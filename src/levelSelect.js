// Modo Livre: escolha do bairro. Páginas de 8 cartões creme (4×2), setas laterais para trocar de página com as miniaturas; setas ou clique selecionam; botão "Jogar no Bairro N" ou E/Enter joga.
import { renderMiniThumbnails } from './careerMap.js';
import { renderExtraThumbs } from './extraThumbs.js';

const XTITLES = ['Rigidez', 'Maledicência', 'Covardia', 'Sacrifício'];   // os 4 níveis extras (só título, sem subtítulo)

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
/* última página: seta → cinza e desativada (há mais bairros, ainda fechados) + botão "i" logo acima dela */
.lsel-nextwrap { position: relative; flex: none; display: flex; }
.lsel-arrow.locked { background: #b9b3a9; border-color: #ece7de; color: #f6f3ee; cursor: not-allowed; box-shadow: 0 4px 0 #8c867c, 0 8px 18px rgba(0,0,0,.2); }
.lsel-arrow.locked:hover { filter: none; }
.lsel-info { position: absolute; left: 50%; bottom: calc(100% + clamp(8px, 1.4vh, 14px)); transform: translateX(-50%);
  width: clamp(28px, 2.4vw, 38px); height: clamp(28px, 2.4vw, 38px); border-radius: 50%; border: 3px solid #ff7a1a; background: #fff3d6; color: #c2570c;
  font: italic 900 clamp(15px, 1.35vw, 21px)/1 Georgia,"Times New Roman",serif; padding: 0; cursor: pointer;
  display: none; align-items: center; justify-content: center; box-shadow: 0 3px 0 rgba(168,72,11,.55), 0 5px 12px rgba(0,0,0,.25); transition: transform .12s; }
.lsel-nextwrap.info .lsel-info { display: flex; }
.lsel-nextwrap.gone { visibility: hidden; }
/* 1º nível extra: clicável (sem nome; borda laranja ao passar o mouse) */
.lsel-grid.extra .lsel-card.xtra.x1 { cursor: pointer; transition: border-color .15s, transform .15s; }
.lsel-grid.extra .lsel-card.xtra.x1:hover { border-color: #FF7A1A; transform: scale(1.02); }
/* página dos 4 níveis extras (história secundária): 4 cartões altos = a altura das 2 fileiras da página anterior */
.lsel-grid.extra .lsel-card.xtra { box-sizing: border-box; background: #ffffff; border: 3px solid rgba(201,167,106,.75); cursor: default; box-shadow: 0 4px 12px rgba(0,0,0,.18), inset 0 0 0 6px #fffaf0; }
.lsel-grid.extra .lsel-card.xtra::after { content: ''; position: absolute; inset: 12px; border-radius: clamp(6px, .8vw, 12px); border: 2px dashed rgba(201,167,106,.45); }
.lsel-grid.extra .lsel-card.xtra { display: flex; flex-direction: column; padding: 10px; gap: 8px; }
.lsel-grid.extra .lsel-card.xtra::after { display: none; }
.lsel-card.xtra .xi { flex: 1; min-height: 0; background: #000; border-radius: clamp(6px, .8vw, 12px); overflow: hidden; display: flex; align-items: center; justify-content: center; }
.lsel-card.xtra .xi img { width: 100%; height: 100%; object-fit: cover; display: block; }
.lsel-card.xtra .xt { flex: none; text-align: center; font-weight: 900; font-size: clamp(14px, min(1.45vw, 2.6vh), 24px); letter-spacing: .03em; color: #2e1d10; padding: 0 0 2px; }
.lsel-play.gone { visibility: hidden; }
.lsel-info:hover { transform: translateX(-50%) scale(1.1); }
.lsel-modal { position: absolute; inset: 0; z-index: 2; display: none; align-items: center; justify-content: center; background: rgba(30,22,14,.38); }
.lsel-modal.on { display: flex; }
.lsel-modal-box { width: min(560px, 88vw); max-height: 86vh; overflow: auto; box-sizing: border-box; background: #fff3d6; border: 4px solid #ff7a1a;
  border-radius: clamp(14px, 1.4vw, 20px); padding: clamp(18px, 3vh, 32px) clamp(20px, 2.4vw, 36px); color: #000; text-align: left;
  box-shadow: 0 10px 0 rgba(168,72,11,.35), 0 18px 40px rgba(0,0,0,.35); user-select: text; }
.lsel-modal-box h3 { margin: 0 0 .8em; font-weight: 900; font-size: clamp(20px, min(2vw, 3.6vh), 30px); color: #000; }
.lsel-modal-box p { margin: 0 0 1em; font-weight: 600; font-size: clamp(14px, min(1.25vw, 2.3vh), 19px); line-height: 1.55; color: #000; }
.lsel-modal-ok { display: block; margin: clamp(14px, 2.4vh, 24px) auto 0; padding: .4em 2em; border: 4px solid #fff3d6; border-radius: 999px; background: #ff7a1a; color: #fff;
  font: 900 clamp(16px, min(1.6vw, 3vh), 24px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; cursor: pointer; box-shadow: 0 0 0 3px #ff7a1a, 0 5px 0 #a8480b; }
.lsel-modal-ok:hover { filter: brightness(1.08); }
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
export const NAMES = ['Bairro Raízes', 'Bairro Horizontes', 'Bairro Constância', 'Bairro Veredas', 'Bairro Ofício', 'Bairro Mirante', 'Bairro Altitude', 'Bairro Ápice', 'Bairro Encostas', 'Veneza', 'Bairro Travessia', 'Bairro Trilhos', 'Bairro Morro', 'Bairro Fluxo', 'Bairro Colheita', 'Bairro Nevasca', 'Bairro Jardins', 'Bairro Modernista', 'Bairro Penumbra', 'Lua', 'Bairro Operário', 'Bairro Bosque', 'Bairro Cachoeira', 'Bairro Medieval'];   // 18: reservado
// título do cartão (o Nível 10, Veneza, é especial: "NÍVEL 10" em vez de "BAIRRO 10")
const TITLE = i => (i === 9 ? 'NÍVEL ' : 'BAIRRO ') + (i + 1);
const COLS = 4, PER = 8;                    // 8 por página (4×2); as páginas seguem sozinhas conforme entram bairros

export function createLevelSelect(onPick, onExtraPick) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const el = document.createElement('div');
  el.className = 'lsel';
  el.innerHTML = '<h2>Escolha o bairro</h2><div class="lsel-row"><button type="button" class="lsel-arrow prev" aria-label="Página anterior">&#8592;</button>' +
    '<div class="lsel-grid"></div><div class="lsel-nextwrap"><button type="button" class="lsel-info" aria-label="Sobre os próximos bairros">i</button>' +
    '<button type="button" class="lsel-arrow next" aria-label="Próxima página">&#8594;</button></div></div><button type="button" class="lsel-play"></button>' +
    '<div class="lsel-hint"><b>←</b><b>↑</b><b>↓</b><b>→</b> Escolher &nbsp;·&nbsp; <b>E</b> Jogar</div>' +
    '<div class="lsel-modal" role="dialog" aria-modal="true" aria-labelledby="lsel-modal-title"><div class="lsel-modal-box"><h3 id="lsel-modal-title">Além das entregas</h3>' +
    '<p>Se você concluiu os 24 bairros, pode ficar tranquilo: a jornada principal está completa.</p>' +
    '<p>Os próximos quatro níveis pertencem exclusivamente à história secundária. São extras opcionais para quem, ao longo do caminho, decidiu olhar além das entregas e acompanhar os pequenos detalhes.</p>' +
    '<p>Você não precisa completá-los para considerar sua jornada de entregador concluída. Mas, para quem quiser descobrir um pouco mais, a história ainda continua.</p>' +
    '<button type="button" class="lsel-modal-ok">Entendi</button></div></div>';
  document.body.appendChild(el);
  const grid = el.querySelector('.lsel-grid'), playBtn = el.querySelector('.lsel-play');
  playBtn.tabIndex = -1;
  playBtn.addEventListener('mousedown', e => e.preventDefault());
  playBtn.addEventListener('click', () => onPick(sel));
  const prevBtn = el.querySelector('.lsel-arrow.prev'), nextBtn = el.querySelector('.lsel-arrow.next');
  for (const b of [prevBtn, nextBtn]) { b.tabIndex = -1; b.addEventListener('mousedown', e => e.preventDefault()); }
  prevBtn.addEventListener('click', () => goPage(page - 1));
  nextBtn.addEventListener('click', () => { if (!nextBtn.disabled) goPage(page + 1); });
  // última página: a seta → fica cinza e desativada; o "i" acima dela abre a janela "Além das entregas" (fecha com Entendi, E/Enter ou Esc; continua na mesma página)
  const nextWrap = el.querySelector('.lsel-nextwrap'), infoBtn = el.querySelector('.lsel-info'), modal = el.querySelector('.lsel-modal'), okBtn = el.querySelector('.lsel-modal-ok');
  for (const b of [infoBtn, okBtn]) { b.tabIndex = -1; b.addEventListener('mousedown', e => e.preventDefault()); }
  const openInfo = () => modal.classList.add('on'), closeInfo = () => modal.classList.remove('on');
  infoBtn.addEventListener('click', openInfo);
  okBtn.addEventListener('click', closeInfo);
  addEventListener('keydown', e => {                       // Esc fecha só a janela (sem abrir o menu de opções)
    if (e.code === 'Escape' && modal.classList.contains('on')) { e.stopImmediatePropagation(); closeInfo(); }
  }, true);
  let cards = null, sel = 0, page = 0, COUNT = 0, extra = false, onExtra = false, xOpen = 1, xImgs = null;
  const INFO0 = modal.querySelector('.lsel-modal-box').innerHTML;
  const INFO_EXTRA = '<h3 id="lsel-modal-title">Além das entregas</h3><p>Se você completou as cinco missões de cada um dos 24 bairros, sua jornada de entregador está completa.</p>' +
    '<p>Os quatro níveis seguintes pertencem exclusivamente à história secundária e agora estão disponíveis para você.</p>' +
    '<p>Eles são extras opcionais e não são necessários para concluir o jogo principal. São a continuação do caminho que você escolheu acompanhar além das entregas.</p>' +
    '<button type="button" class="lsel-modal-ok">Entendi</button>';
  function setInfo() {
    const box = modal.querySelector('.lsel-modal-box'); box.innerHTML = extra ? INFO_EXTRA : INFO0;
    const ok = box.querySelector('.lsel-modal-ok'); ok.tabIndex = -1; ok.addEventListener('mousedown', e => e.preventDefault()); ok.addEventListener('click', closeInfo);
  }
  /** Página dos 4 níveis extras (posições 25–28): 4 cartões brancos e altos, o 1º abre a introdução do extra 1; os outros ainda sem conteúdo. */
  function showExtra() {
    const h = grid.getBoundingClientRect().height;               // a altura das 2 fileiras (com o espaço entre elas)
    onExtra = true; page = pages(); grid.textContent = ''; grid.classList.add('extra');
    if (!xImgs) { try { xImgs = renderExtraThumbs(); } catch (e) { console.error('[levelSelect] imagens dos extras:', e); xImgs = [null, null, null, null]; } }
    for (let k = 0; k < 4; k++) { const c = document.createElement('div'); c.className = 'lsel-card xtra'; c.dataset.level = String(24 + k); if (h > 0) c.style.height = h + 'px'; grid.appendChild(c);
      c.innerHTML = `<div class="xi">${xImgs[k] ? `<img src="${xImgs[k]}" alt="">` : ''}</div><div class="xt">${XTITLES[k]}</div>`;
      if (k < xOpen) { c.classList.add('x1'); c.addEventListener('click', () => onExtraPick && onExtraPick(k)); } }   // liberados: o 1º sempre; o 2º depois do 1º (ainda reservado)   // o 1º extra já tem a introdução
    prevBtn.classList.remove('off'); nextWrap.classList.add('gone'); playBtn.classList.add('gone');
  }
  function leaveExtra() { onExtra = false; grid.classList.remove('extra'); nextWrap.classList.remove('gone'); playBtn.classList.remove('gone'); }
  const pages = () => Math.ceil(COUNT / PER);

  function paint() {
    if (Math.floor(sel / PER) !== page) showPage(Math.floor(sel / PER));
    cards.forEach((c, i) => c && c.classList.toggle('sel', i === sel)); playBtn.textContent = sel === 9 ? 'Jogar em Veneza' : `Jogar no Bairro ${sel + 1}`;
  }
  /** Mostra os 8 espaços da página p: bairros disponíveis e, no resto, cartões "Em breve" (não selecionáveis). */
  function showPage(p) {
    if (onExtra) leaveExtra();
    page = p; grid.textContent = '';
    for (let k = 0; k < PER; k++) {
      const i = p * PER + k;
      if (i < COUNT && cards[i]) { grid.appendChild(cards[i]); continue; }
      const c = document.createElement('div');
      c.className = 'lsel-card soon';
      c.innerHTML = '<div class="ph">Em breve</div><div class="lbl">&nbsp;<small>&nbsp;</small></div>';
      grid.appendChild(c);
    }
    prevBtn.classList.toggle('off', page === 0);
    const last = page >= pages() - 1;                        // última página: seta cinza e desativada (mais bairros virão), com o "i"
    const lock = last && !extra;                             // depois do temporal, a seta leva aos 4 níveis extras
    nextBtn.classList.toggle('locked', lock); nextBtn.disabled = lock; nextBtn.setAttribute('aria-disabled', String(lock));
    nextWrap.classList.toggle('locked', lock); nextWrap.classList.toggle('info', last);
  }
  function goPage(p, row = 0) {
    if (extra && p === pages() && !onExtra) { showExtra(); return; }
    if (p < 0 || p >= pages()) return;
    sel = Math.min(COUNT - 1, p * PER + row * COLS);         // mesma fila, se houver bairro nela; senão o último disponível
    if (Math.floor(sel / PER) !== p) sel = p * PER;
    if (!cards[sel]) { const ok = cards.map((c, i) => (c && Math.floor(i / PER) === p ? i : -1)).filter(i => i >= 0); if (!ok.length) return; sel = ok.reduce((a, b) => (Math.abs(b - sel) < Math.abs(a - sel) ? b : a)); }
    showPage(p); paint();
  }
  function build() {
    const urls = renderMiniThumbnails();
    COUNT = urls.length;
    cards = urls.map((u, i) => {
      if (!u) return null;                                                 // espaço reservado: aparece como "Em breve"
      const c = document.createElement('div');
      c.className = 'lsel-card';
      c.innerHTML = `<img src="${u}" alt=""><div class="lbl">${TITLE(i)}<small>${NAMES[i] || ''}</small></div>`;
      c.addEventListener('click', () => { sel = i; paint(); });            // clique seleciona; o botão (ou E) joga
      c.addEventListener('dblclick', () => { sel = i; paint(); onPick(i); });
      return c;
    });
    showPage(0);
  }
  return {
    /** Libera (ou não) a página dos 4 níveis extras e o texto novo do "i". */
    setExtra(on, open = 1) { xOpen = open; if (extra !== !!on) { extra = !!on; setInfo(); } },
    get onExtra() { return onExtra; },
    open(level = 0) { if (!cards) build(); if (onExtra) leaveExtra(); sel = Math.min(level, COUNT - 1); while (sel > 0 && !cards[sel]) sel--; showPage(Math.floor(sel / PER)); paint(); el.classList.add('on'); document.body.classList.add('lsel-on'); },
    close() { closeInfo(); el.classList.remove('on'); document.body.classList.remove('lsel-on'); },
    get isOpen() { return el.classList.contains('on'); },
    /** Janela "Além das entregas" aberta (o teclado da seleção fica parado; E/Enter fecha). */
    get infoOpen() { return modal.classList.contains('on'); },
    openInfo, closeInfo,
    get selected() { return onExtra ? -1 : sel; },
    /** dx/dy: um passo de seta dentro da página (ignora os "Em breve"); nas bordas laterais, troca de página. */
    move(dx, dy) {
      if (onExtra) { if (dx < 0) { goPage(pages() - 1, 0); } return; }   // página extra: só volta
      const k = sel % PER, c = k % COLS + dx, r = Math.floor(k / COLS) + dy;
      if (r < 0 || r >= PER / COLS) return;
      if (c < 0) return goPage(page - 1, r);
      if (c >= COLS) return goPage(page + 1, r);
      const i = page * PER + r * COLS + c;
      if (i >= COUNT || !cards[i]) return;                     // espaço "Em breve": não seleciona
      sel = i; paint();
    },
  };
}
