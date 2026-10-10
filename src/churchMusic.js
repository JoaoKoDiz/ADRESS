// Música da aproximação da igreja (Bairro 1, Livre): assets/dark-sanctuary.mp3, embutida no index.html (data URL).
// Toca do início com fade-in, independe do botão de música (é uma exceção da cena) e expõe a posição REAL de reprodução
// (relógio do AudioContext), usada para sincronizar a revelação da igreja.
import trackUrl from '../assets/dark-sanctuary.mp3';

const VOLUME = 0.8;

function decodeDataUrl(url) {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function createChurchMusic(audio) {
  let buffer = null, loading = null, src = null, gain = null, t0 = 0, offset = 0, paused = false;
  function startAt(off, fade) {                        // toca a partir de `off` segundos, subindo o volume em `fade`
    const ac = audio.ctx;
    if (ac.state === 'suspended') ac.resume();
    gain = ac.createGain(); gain.connect(audio.out);
    src = ac.createBufferSource(); src.buffer = buffer; src.connect(gain);
    const at = ac.currentTime + 0.02;
    t0 = at - off;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(VOLUME, at + fade);
    src.start(at, off);
    const me = src; src.onended = () => { if (src === me) { src = null; } };
  }
  function release(s, g, fade) {                       // some com fade e libera os nós
    const now = audio.ctx.currentTime;
    g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + fade);
    s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { /* */ } };
    s.stop(now + fade + 0.05);
  }
  return {
    /** Decodifica a faixa (uma vez). Retorna uma promessa resolvida quando estiver pronta. */
    load() {
      const ac = audio.ctx;
      if (buffer) return Promise.resolve();
      if (!ac) return Promise.reject(new Error('sem áudio'));
      if (!loading) loading = new Promise((res, rej) => {
        try {
          const p = ac.decodeAudioData(decodeDataUrl(trackUrl), b => { buffer = b; res(); }, rej);
          if (p && p.catch) p.catch(rej);
        } catch (e) { rej(e); }
      }).catch(e => { loading = null; throw e; });
      return loading;
    },
    get ready() { return !!buffer; },
    /** Tocando agora. */
    get playing() { return !!src; },
    /** Pausada pelo jogador (dá para continuar do mesmo ponto). */
    get paused() { return paused; },
    /** Tocando ou pausada (a faixa ainda está "em cena"). */
    get active() { return !!src || paused; },
    /** Posição real da reprodução (s); parada na pausa; −1 sem faixa. */
    get time() { return src ? audio.ctx.currentTime - t0 : paused ? offset : -1; },
    /** Começa do início com fade-in de `fade` segundos. */
    play(fade = 4) {
      const ac = audio.ctx; if (!ac || !buffer) return false;
      this.stop();
      startAt(0, fade);
      return true;
    },
    /** Pausa guardando a posição. */
    pause() {
      if (!src) return;
      offset = audio.ctx.currentTime - t0; paused = true;
      const s = src, g = gain; src = gain = null; release(s, g, 0.12);
    },
    /** Continua do ponto em que parou (fade curto). */
    resume() { if (!paused || !buffer) return; paused = false; startAt(offset, 0.35); },
    /** Fade-out de `fade` segundos e encerra a faixa. */
    fadeOut(fade = 1) {
      paused = false; offset = 0;
      if (!src) return;
      const s = src, g = gain; src = gain = null; release(s, g, fade);
    },
    stop() {
      paused = false; offset = 0;
      if (!src) return;
      try { src.onended = null; src.stop(); src.disconnect(); gain.disconnect(); } catch (e) { /* */ }
      src = gain = null;
    },
  };
}
