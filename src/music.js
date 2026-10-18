// Música de fundo (assets/musica-fundo.mp3, ao lado do index.html). Pausar/continuar só pelo botão
// (canto inferior esquerdo): tocando mostra ⏸ (clicar pausa); pausada mostra ♪ (clicar continua).
// Começa no primeiro toque de tecla/clique (regra dos navegadores).
const CSS = `
.music-btn { position: absolute; left: calc(clamp(10px, 1.4vw, 20px) + 7.6em); bottom: clamp(10px, 1.6vh, 20px); z-index: 3;
  display: flex; align-items: center; justify-content: center; width: 2.9em; height: 2.9em; padding: 0;
  border: 3px solid #fff; border-radius: 50%; background: #2a7fd0; color: #fff;
  font: 700 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .06em;
  box-shadow: 0 4px 0 #17548f, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.music-btn:hover { filter: brightness(1.1); }
.music-btn svg { width: 1.25em; height: 1.25em; display: block; }
.music-now { position: absolute; left: calc(clamp(10px, 1.4vw, 20px) + 11.1 * clamp(13px, 1.05vw, 17px)); bottom: clamp(10px, 1.6vh, 20px); z-index: 45;   /* (medidas do botão de música, que usa outra fonte) */
  max-width: min(30vw, 280px); padding: .38em .85em .42em; border: 2px solid #ff7a1a; border-radius: 12px; background: #fff3d6; color: #2e1d10;
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; text-align: left; line-height: 1.2;
  box-shadow: 0 3px 0 rgba(0,0,0,.18); pointer-events: none; display: none; }
.music-now.on { display: block; }
/* caixa de diálogo aberta (embaixo, no centro): os créditos sobem para cima dos botões, sem invadir a caixa */
.music-now.lift { left: clamp(10px, 1.4vw, 20px); bottom: calc(clamp(10px, 1.6vh, 20px) + 3.7 * clamp(13px, 1.05vw, 17px));
  max-width: max(120px, calc((100vw - min(820px, 88vw)) / 2 - 34px)); }
.music-now .mn-t, .music-now .mn-a { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.music-now .mn-t { font-weight: 800; font-size: clamp(12px, 0.95vw, 15px); }
.music-now .mn-a { font-weight: 600; font-size: clamp(10px, 0.78vw, 12.5px); color: #7a5536; }
.music-btn[data-on="0"] { background: #5d6a78; box-shadow: 0 4px 0 #3b444e, 0 8px 18px rgba(0,0,0,.25); }
`;

export function createMusic(stageEl, src = (typeof __ASSET_BASE__ !== 'undefined' ? __ASSET_BASE__ : 'assets/') + 'musica-fundo.mp3') {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const audio = new Audio(src);
  audio.loop = true;
  const BASE = 0.35;
  let vol = 1;                           // volume da música nas Configurações (0..1)
  audio.volume = BASE;
  audio.preload = 'auto';

  let wanted = true;                     // o jogador quer música tocando?
  try { const v = localStorage.getItem('adress.music'); if (v !== null) wanted = v === '1'; } catch (e) { /* ignora */ }
  let started = false, suspended = false, override = null, blocked = false;   // blocked: menus da fase de terror (outra faixa no lugar)   // override: cena com faixa própria controla o botão
  // Faixa do bairro (Níveis 10, 15 e 16): começa sozinha ao entrar, mesmo com o botão desligado; o botão pausa/continua
  // do mesmo ponto (sem mudar a preferência salva da música padrão). Trocar de faixa encerra a anterior.
  let track = src, special = false, specialOn = false;
  const isOn = () => (special ? specialOn : wanted);

  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'music-btn'; btn.tabIndex = -1;
  // ícones: dois pauzinhos (tocando → clicar pausa) e nota musical (pausada → clicar continua)
  const PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1.2" fill="#fff"/><rect x="14" y="4" width="5" height="16" rx="1.2" fill="#fff"/></svg>';
  const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3v11.3A3.5 3.5 0 1 0 12 17.5V8h6V3z" fill="#fff"/></svg>';
  const paint = () => {
    const on = override ? override.on : isOn();
    btn.dataset.on = on ? '1' : '0';
    btn.innerHTML = on ? PAUSE : NOTE;
    btn.title = on ? 'Pausar a música' : 'Continuar a música';
    btn.setAttribute('aria-label', btn.title);
  };
  const play = () => { if (blocked) return; const p = audio.play(); if (p && p.catch) p.catch(() => {}); };
  function toggle() {
    if (special) { specialOn = !specialOn; started = true; specialOn && !suspended ? play() : audio.pause(); paint(); return; }
    wanted = !wanted;
    try { localStorage.setItem('adress.music', wanted ? '1' : '0'); } catch (e) { /* ignora */ }
    started = true;
    wanted && !suspended ? play() : audio.pause();
    paint();
  }
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => { btn.blur(); if (override) { override.toggle(); paint(); } else toggle(); });
  paint();
  stageEl.appendChild(btn);
  // nome da faixa tocando agora ("Título — Autor"; sem autor cadastrado, só o título)
  const now = document.createElement('div'); now.className = 'music-now'; stageEl.appendChild(now);
  let nowText = null;

  return {
    /** Chamado no primeiro gesto do jogador: começa a tocar (se não estiver pausada). */
    start() { if (started) return; started = true; if (isOn() && !suspended) play(); },
    /** Troca a faixa de fundo (null = a padrão). autoplay: começa tocando já, mesmo com o botão desligado. */
    setTrack(next, autoplay = false) {
      next = next || src;
      if (next === track) return;
      audio.pause(); audio.src = next; track = next; try { audio.currentTime = 0; } catch (e) { /* ainda carregando */ }
      special = next !== src; specialOn = special && autoplay;
      if (special && autoplay) started = true;
      if (isOn() && started && !suspended) play();
      paint();
    },
    toggle,
    /** Volume da música (Configurações), 0..1. */
    setVolume(v) { vol = v; audio.volume = BASE * vol; },
    /** Cena com música própria: pausa a de fundo SEM mudar a preferência salva; false volta como estava. */
    suspend(on, fade = 0) {
      suspended = on;
      if (on && fade > 0 && !audio.paused) {                      // some em `fade` s (sem atrasar quem começa a tocar agora)
        const v0 = audio.volume, t0 = performance.now();
        const id = setInterval(() => { const k = (performance.now() - t0) / (fade * 1000); if (!suspended || k >= 1) { clearInterval(id); if (suspended) audio.pause(); audio.volume = BASE * vol; } else audio.volume = v0 * (1 - k); }, 30);
        return;
      }
      if (on) audio.pause(); else if (isOn() && started) play();
    },
    get playing() { return !audio.paused; },
    /** Menus da fase de terror: a faixa padrão fica parada (sem mexer em suspend nem na preferência); false volta como estava. */
    block(on) { if (on === blocked) return; blocked = on; if (on) audio.pause(); else if (isOn() && started && !suspended) play(); },
    /** Preferência salva do jogador (música padrão ligada?). */
    get wanted() { return wanted; },
    /** Cena: o botão passa a controlar outra faixa ({ on, toggle() }); null devolve. A preferência salva não muda. */
    setOverride(o) { override = o; paint(); },
    get override() { return override; },
    /** Faixa de fundo atual (src). */
    get track() { return track; },
    /** Sobe os créditos (caixa de diálogo aberta embaixo). */
    setLift(on) { now.classList.toggle('lift', !!on); },
    /** Mostra o que está tocando ({ title, author? }) ou esconde (null). */
    setNowPlaying(info) {
      const t = info && info.title ? info.title + '|' + (info.author || '') : null;
      if (t === nowText) return;
      nowText = t; now.classList.toggle('on', !!t);
      now.innerHTML = '';                                            // 2 linhas: título (destaque) e compositor (menor)
      if (!t) return;
      for (const [cls, txt] of [['mn-t', info.title], ['mn-a', info.author]]) if (txt) { const sp = document.createElement('span'); sp.className = cls; sp.textContent = txt; now.appendChild(sp); }
    },
    /** Redesenha o ícone (o estado da faixa da cena mudou). */
    refresh: () => paint(),
    audio,
  };
}
