// Música dos menus na fase de terror da história secundária (da queda do 4º sino até o fim do 4º nível extra):
// "snow" (Toby Fox; arquivo original "104. snow (1)-loop.wav"). Um único AudioBufferSourceNode em loop (sem emenda),
// pela saída de música (volume das Configurações). Navegar entre menus não mexe nele; ao entrar num nível ele para
// guardando a posição e, ao voltar, continua dali. Uma reprodução só, nunca duas.
import { report } from './voidMusic.js';

const VOL = 0.5;

function bytesOf(url) {
  const i = url.indexOf(',');
  if (!url.startsWith('data:') || i < 0) return null;
  const bin = atob(url.slice(i + 1)), bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return bytes.buffer;
}

/** `loopSecs`: duração exata do WAV (para ignorar o silêncio que o MP3 acrescenta); null = o buffer inteiro. */
export function createMenuMusic(audio, url, name, loopSecs = null) {
  let buf = null, loading = null, failed = false, src = null, gain = null, t0 = 0, offset = 0, loopA = 0, loopLen = 0;
  function firstSound(b) { const d = b.getChannelData(0); for (let i = 0; i < Math.min(d.length, 8000); i++) if (Math.abs(d[i]) > 0.0045) return i; return 0; }
  function load() {
    if (buf || loading || failed) return;
    if (!url) { failed = true; report('arquivo ausente: ' + name); return; }
    if (!audio.ctx) return;                                    // (cria-se no 1º gesto do jogador)
    let data; try { data = bytesOf(url); } catch (e) { failed = true; report(name + ': base64 inválido (' + e.message + ')'); return; }
    const raw = data ? Promise.resolve(data) : fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });
    loading = raw.then(b => new Promise((ok, no) => audio.ctx.decodeAudioData(b, ok, e => no(new Error('não decodificou (' + (e && e.message || 'formato inválido') + ')')))))
      .then(b => { buf = b; loopA = firstSound(b) / b.sampleRate; loopLen = Math.min(b.duration - loopA, loopSecs || Infinity); loading = null; })
      .catch(e => { loading = null; failed = true; report(name + ': ' + (e && e.message || e)); });
  }
  const pos = () => src ? (audio.ctx.currentTime - t0) % loopLen : offset;
  /** Toca (do ponto guardado) com fade-in de `fade` s; se já estiver tocando, nada muda. */
  function play(fade = 0.6) {
    load();
    const ac = audio.ctx; if (!ac || !buf || src) return !!src;
    gain = ac.createGain(); gain.gain.value = fade > 0 ? 0 : VOL; gain.connect(audio.musicOut);
    const now = ac.currentTime + 0.01;
    gain.gain.setValueAtTime(fade > 0 ? 0 : VOL, now); if (fade > 0) gain.gain.linearRampToValueAtTime(VOL, now + fade);
    src = ac.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = loopA; src.loopEnd = loopA + loopLen;
    src.connect(gain); src.start(now, loopA + offset);
    t0 = now - offset;
    return true;
  }
  /** Para guardando a posição (fade-out de `fade` s). */
  function stop(fade = 0.8) {
    if (!src) return;
    const ac = audio.ctx, now = ac.currentTime, s = src, g = gain;
    offset = pos(); src = null; gain = null;
    const p = g.gain, v = p.value;
    try { p.cancelScheduledValues(now); } catch (e) { /* */ }
    p.setValueAtTime(v, now); p.linearRampToValueAtTime(0, now + fade);
    try { s.stop(now + fade + 0.05); } catch (e) { /* */ }
    setTimeout(() => { try { s.disconnect(); g.disconnect(); } catch (e) { /* */ } }, fade * 1000 + 300);
  }
  return {
    load, play, stop,
    /** Volta ao começo (nova fase de terror, por exemplo depois de um checkpoint). */
    rewind() { if (!src) offset = 0; },
    get playing() { return !!src; }, get _gain() { return gain && gain.gain.value; }, get ready() { return !!buf; }, get failed() { return failed; }, get position() { return buf ? pos() : 0; },
  };
}
