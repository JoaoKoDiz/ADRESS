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
  let buffer = null, loading = null, src = null, gain = null, t0 = 0;
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
    get playing() { return !!src; },
    /** Segundos tocados desde o início (relógio do áudio); −1 parada. */
    get time() { return src ? audio.ctx.currentTime - t0 : -1; },
    /** Começa do início com fade-in de `fade` segundos. */
    play(fade = 2) {
      const ac = audio.ctx; if (!ac || !buffer) return false;
      this.stop();
      if (ac.state === 'suspended') ac.resume();
      gain = ac.createGain(); gain.connect(audio.out);
      src = ac.createBufferSource(); src.buffer = buffer; src.connect(gain);
      t0 = ac.currentTime + 0.02;
      gain.gain.setValueAtTime(0, t0); gain.gain.linearRampToValueAtTime(VOLUME, t0 + fade);
      src.start(t0);
      const me = src; src.onended = () => { if (src === me) { src = null; } };
      return true;
    },
    /** Fade-out de `fade` segundos e encerra a faixa. */
    fadeOut(fade = 1) {
      if (!src) return;
      const ac = audio.ctx, s = src, g = gain, now = ac.currentTime;
      g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + fade);
      s.stop(now + fade + 0.05); s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { /* */ } };
      src = gain = null;
    },
    stop() { if (!src) return; try { src.onended = null; src.stop(); src.disconnect(); gain.disconnect(); } catch (e) { /* */ } src = gain = null; },
  };
}
