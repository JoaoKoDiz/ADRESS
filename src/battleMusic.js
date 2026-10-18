// Música da batalha final: a 2ª edição da adaptação de "Finale" (Toby Fox), assets/finale-batalha-v2.mp3 — arquivo EXTERNO,
// ao lado do index.html (como a música de fundo). Feita a partir do remix original sem alterá-lo (cortes em limites naturais,
// sem mudar velocidade nem afinação; tabela em marks-v2.json): 1ª metade contida, a virada no interlúdio, as quatro
// repetições com espaço próprio e o fim que respira. A edição anterior (finale-batalha.mp3) continua no projeto, intocada.
// A posição de reprodução é o relógio da batalha (battle.js lê `time`): um relógio próprio avança com o laço e é puxado
// para a posição real do áudio — nunca volta para trás e, se a faixa travar carregando, espera por ela.
// Sem áudio (arquivo ausente, bloqueado ou em teste), o relógio próprio segue sozinho; uma falha real aparece na tela.

export const BATTLE_TRACK = (typeof __ASSET_BASE__ !== 'undefined' ? __ASSET_BASE__ : 'assets/') + 'finale-batalha-v2.mp3';   // (versão experimental publicada em /experimento/: usa os arquivos da principal, ../assets/)
export const BATTLE_TRACK_SECS = 689.21;                  // duração da 2ª edição (marks-v2.json: total)
const BASE = 0.9;                                          // ganho da faixa (o volume da música das Configurações multiplica)

/** Falha de carregamento: no console e num aviso visível (nada substitui a faixa). */
function report(why) {
  console.error('[batalha] música:', BATTLE_TRACK, why);
  try {
    let n = document.querySelector('.battlemusic-err');
    if (!n) { n = document.createElement('div'); n.className = 'battlemusic-err'; n.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;background:#7a1010;color:#fff;font:600 13px/1.35 system-ui,sans-serif;padding:8px 12px;border-radius:8px;max-width:92vw;pointer-events:none'; document.body.appendChild(n); }
    n.textContent = 'Erro na música da batalha (' + BATTLE_TRACK + '): ' + why + ' — a batalha segue pelo relógio próprio.';
    clearTimeout(n._t); n._t = setTimeout(() => n.remove(), 12000);
  } catch (e) { /* */ }
}

export function createBattleMusic({ getVolume = () => 1 } = {}) {
  let el = null, ready = false, failed = null, playing = false, clock = 0, level = 1, own = false;
  let hiddenPause = false, synced = false, fadeTimer = 0;
  // Caminhos tentados em ordem (cada um com prazo): o arquivo direto; os bytes baixados e tocados da memória (blob) —
  // páginas publicadas podem barrar mídia de arquivo e aceitar blob. Falhou tudo: aviso com o motivo de cada tentativa.
  const tries = [];
  let attempt = -1, stallTimer = 0;
  function next(why) {
    clearTimeout(stallTimer);
    if (attempt >= 0) tries.push(['arquivo', 'blob'][attempt] + ': ' + why);
    attempt++;
    if (attempt === 0) { el.src = BATTLE_TRACK; try { el.load(); } catch (e) { /* */ } }
    else if (attempt === 1) {
      fetch(BATTLE_TRACK).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(b => { if (ready) return; el.src = URL.createObjectURL(b.type ? b : new Blob([b], { type: 'audio/mpeg' })); try { el.load(); } catch (e) { /* */ } })
        .catch(e => next(String(e && e.message || e)));
    } else { failed = tries.join(' · '); report(failed); return; }
    stallTimer = setTimeout(() => { if (!ready) next('sem resposta em 10 s'); }, 10000);
  }
  function ensure() {
    if (el) return el;
    el = new Audio();
    el.preload = 'auto';
    const ok = () => { if (!ready) { ready = true; clearTimeout(stallTimer); console.info('[batalha] música pronta (' + ['arquivo', 'blob'][attempt] + ')'); if (playing && !own && el.paused && !hiddenPause) el.play().catch(() => {}); } };   // (ficou pronta depois de pedida: toca)
    el.addEventListener('canplaythrough', ok); el.addEventListener('loadeddata', ok);
    el.addEventListener('error', () => { if (!ready && attempt < 2) next((el.error && el.error.message) || 'erro ' + (el.error ? el.error.code : '?')); });
    next();
    return el;
  }
  const apply = () => { if (el) el.volume = Math.max(0, Math.min(1, BASE * level * getVolume())); };
  const stopFade = () => { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = 0; } };
  // aba escondida: o laço do jogo para; a música para junto (e continua do mesmo ponto)
  document.addEventListener('visibilitychange', () => {
    if (!el || !playing || own) return;
    if (document.hidden && !el.paused) { hiddenPause = true; el.pause(); }
    else if (!document.hidden && hiddenPause) { hiddenPause = false; el.play().catch(() => {}); }
  });
  return {
    /** Começa a carregar (antes da apresentação). */
    load() { if (own) return; ensure(); },
    /** Pronta para tocar (ou sem jeito de tocar: aí a batalha segue pelo relógio próprio). */
    get ready() { return own || ready || !!failed; },
    get failed() { return failed; },
    /** Toca do ponto `at` (s), sem fade-in; encerra um fade-out pendente. */
    play(at = 0) {
      stopFade(); playing = true; clock = at; level = 1; hiddenPause = false;
      if (own) return;
      ensure(); synced = el.readyState >= 2; apply();
      try { el.currentTime = at; } catch (e) { /* */ }
      const p = el.play(); if (p && p.catch) p.catch(err => { if (!failed && playing && err && err.name === 'NotAllowedError') { failed = 'o navegador bloqueou o som automático (NotAllowedError)'; report(failed); } });   // (ainda carregando: toca quando ficar pronta)
    },
    /** Some em `secs` e para (por conta própria: não depende do laço da batalha). */
    fadeOut(secs = 1.5) {
      if (!playing) return; stopFade();
      const from = level, t0 = performance.now();
      fadeTimer = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / (secs * 1000)); level = from * (1 - k); apply();
        if (k >= 1) { stopFade(); this.stop(); level = 1; }
      }, 40);
    },
    stop() { stopFade(); playing = false; hiddenPause = false; if (el) el.pause(); },
    /** Avança o relógio (dt do laço) e o aproxima da posição real do áudio. */
    update(dt) {
      if (!playing) return;
      if (!fadeTimer) apply();                                                    // (volume das Configurações muda na hora)
      if (own || !el || failed) { clock += dt; return; }                           // sem áudio: relógio próprio
      if (el.readyState < 2) { if (!synced) clock += dt; return; }                 // ainda carregando no começo: segue sozinho
      if (!synced) { synced = true; if (Math.abs(el.currentTime - clock) > 0.25) try { el.currentTime = clock; } catch (e) { /* */ } return; }   // ficou pronta depois: a faixa vai para onde a batalha está
      if (el.paused) return;                                                       // pausada (aba escondida) ou no fim: o relógio para junto
      const real = el.currentTime;
      if (real > clock + 0.25) { clock = real; return; }                           // a faixa pulou à frente: acompanha
      const next = Math.min(clock + dt, real + 0.1);                               // nunca volta; se a faixa travar, espera por ela
      clock = Math.max(clock, real > next ? next + (real - next) * Math.min(1, dt * 4) : next);
    },
    /** Posição da batalha (s). */
    get time() { return clock; },
    get playing() { return playing; },
    get position() { return el ? el.currentTime : 0; },
    get audible() { return !!el && !own && !failed && !el.paused; },
    /** Testes: relógio próprio, sem áudio (o passo a passo do teste não espera a faixa real). */
    useOwnClock(on = true) { own = !!on; if (own && el) el.pause(); },
    _set(t) { clock = t; if (el && !own) try { el.currentTime = t; } catch (e) { /* */ } },
  };
}
