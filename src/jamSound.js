// Música dos engarrafamentos (Bairro 7): assets/honk.ogg, embutida no index.html (data URL) e tocada em loop perfeito
// (AudioBufferSourceNode.loop, sem intervalo entre o fim e o início). Só toca perto de um engarrafamento; ao entrar ou sair
// do raio o volume sobe e desce suavemente (fade-in / fade-out), sem começar ou parar de uma vez.
import honkUrl from '../assets/honk.ogg';

const RADIUS = 45;       // distância (até a borda do engarrafamento mais próximo) em que a música começa a tocar
const VOLUME = 0.7;
const FADE = 0.7;        // constante de tempo do fade (s): ~2 s para subir/descer de verdade

function decodeDataUrl(url) {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function createJamSound(audio) {
  let buffer = null, loading = false, src = null, gain = null, level = 0, silentFor = 0;

  function load(ac) {
    loading = true;
    try {
      const p = ac.decodeAudioData(decodeDataUrl(honkUrl), b => { buffer = b; });   // (callback também p/ navegadores antigos)
      if (p && p.catch) p.catch(() => { loading = false; });
    } catch (e) { loading = false; }
  }
  function start(ac) {
    gain = ac.createGain();
    gain.gain.value = 0;
    gain.connect(audio.out);
    src = ac.createBufferSource();
    src.buffer = buffer;
    src.loop = true;                                   // loop contínuo e sem emenda
    src.connect(gain);
    src.start();
  }
  function stop() {
    try { src.stop(); src.disconnect(); gain.disconnect(); } catch (e) { /* ignora */ }
    src = gain = null;
  }
  const dist = (x, z, r) => Math.hypot(x - Math.max(r.x0, Math.min(x, r.x1)), z - Math.max(r.z0, Math.min(z, r.z1)));

  return {
    /** Testes: estado atual. */
    get debug() { return { loaded: !!buffer, playing: !!src, loop: !!(src && src.loop), level, seconds: buffer ? buffer.duration : 0 }; },
    /** Todo quadro. rects: engarrafamentos ({x0,x1,z0,z1}); (x, z): posição de quem anda/dirige; active: está jogando o Bairro 7. */
    update(dt, active, rects, x, z) {
      const ac = audio.ctx;
      if (!ac) return;
      const near = active && rects.length > 0 && rects.some(r => dist(x, z, r) < RADIUS);
      if (near && !buffer && !loading) load(ac);
      if (near && buffer && !src) { start(ac); silentFor = 0; }
      if (!src) return;
      const target = near ? VOLUME : 0;
      level += (target - level) * (1 - Math.exp(-dt / FADE));      // fade exponencial (sobe/desce ~2 s), aplicado a cada quadro
      gain.gain.value = level;
      silentFor = level < 0.005 && !near ? silentFor + dt : 0;
      if (silentFor > 0.3) { stop(); level = 0; }                   // terminou o fade-out: libera a fonte
    },
  };
}
