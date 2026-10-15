// Música do deslocamento pelo vazio (extra 1): "just us".
// O original toca uma vez, do início, sem fade-in; 6 s antes do fim dele entra a versão em loop (do começo, volume 0)
// e os dois fazem fades opostos de 6 s ao mesmo tempo; depois só o loop, emendado sem pausa (AudioBufferSourceNode.loop
// com o trecho exato do WAV, sem o silêncio que o MP3 acrescenta). O fim (fadeOut) vale a qualquer momento e cancela
// o que ainda estiver agendado. Tudo pela saída de música (volume das Configurações).
const LOOP_FRAMES = 1104384;          // duração exata do WAV do loop (48 kHz)
const LOOP_SECS = LOOP_FRAMES / 48000; // (em segundos: o buffer decodificado sai na taxa do AudioContext, que pode ser 44,1 kHz)
const VOL = 0.55, XFADE = 6;
const FILES = ['just-us.mp3 (original, "100. just us.mp3")', 'just-us-loop.mp3 (loop, "100. just us-loop.wav")'];
// As faixas vêm embutidas no index.html como data URL. Não usar fetch(): a página publicada tem CSP (connect-src) que
// bloqueia fetch de data: — era por isso que nada tocava. Decodifica o base64 direto, como as outras músicas.
function bytesOf(url) {
  const i = url.indexOf(',');
  if (!url.startsWith('data:') || i < 0) return null;
  const bin = atob(url.slice(i + 1)), bytes = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
  return bytes.buffer;
}
/** Falha de carregamento: no console e num aviso visível (não substitui por outra música). */
function report(msg) {
  console.error('[voidMusic] ' + msg);
  try {
    let el = document.querySelector('.voidmusic-err');
    if (!el) { el = document.createElement('div'); el.className = 'voidmusic-err'; el.style.cssText = 'position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;background:#7a1010;color:#fff;font:600 13px/1.35 system-ui,sans-serif;padding:8px 12px;border-radius:8px;max-width:92vw;pointer-events:none'; document.body.appendChild(el); }
    el.textContent = 'Erro na música do nível extra: ' + msg;
    clearTimeout(el._t); el._t = setTimeout(() => el.remove(), 12000);
  } catch (e) { /* */ }
}

export function createVoidMusic(audio, origUrl, loopUrl) {
  let bufA = null, bufB = null, loopOfs = 0, loading = null, run = null, wantStart = false, gen = 0, error = null;
  const decode = (url, name) => {
    let data;
    try { data = bytesOf(url); } catch (e) { return Promise.reject(new Error(name + ': base64 inválido (' + e.message + ')')); }
    const raw = data ? Promise.resolve(data) : fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); });   // (URL comum, fora do html)
    return raw.catch(e => { throw new Error(name + ': não carregou (' + (e && e.message || e) + ')'); })
      .then(b => new Promise((ok, no) => audio.ctx.decodeAudioData(b, ok, e => no(new Error(name + ': não decodificou (' + (e && e.message || 'formato inválido') + ')')))));
  };
  /** Primeira amostra com som de verdade: o MP3 pode trazer silêncio de codificação no começo (o WAV já começa com som). */
  function firstSound(buf) { const d = buf.getChannelData(0); for (let i = 0; i < Math.min(d.length, 8000); i++) if (Math.abs(d[i]) > 0.0045) return i; return 0; }
  function load() {
    if (loading || bufA) return loading || Promise.resolve();
    if (!audio.ctx) audio.unlock();                          // (sem contexto ainda: cria; se o navegador bloquear, ele fica suspenso até a próxima interação)
    if (!audio.ctx) { report('WebAudio indisponível neste navegador'); return Promise.resolve(); }
    if (!origUrl || !loopUrl) { report('arquivo ausente: ' + (!origUrl ? FILES[0] : FILES[1])); return Promise.resolve(); }
    loading = Promise.all([decode(origUrl, FILES[0]), decode(loopUrl, FILES[1])]).then(([a, b]) => { bufA = a; bufB = b; loopOfs = firstSound(b); error = null; loading = null; if (wantStart) begin(); })
      .catch(e => { loading = null; error = e.message; report(e.message); });
    return loading;
  }
  function kill(r, at) {                                     // para as fontes (agora ou em `at`) e solta tudo depois
    for (const s of [r.srcA, r.srcB]) if (s) { try { s.stop(at); } catch (e) { /* */ } }
    setTimeout(() => { for (const n of [r.srcA, r.srcB, r.gA, r.gB]) if (n) { try { n.disconnect(); } catch (e) { /* */ } } }, Math.max(0, (at - audio.ctx.currentTime) * 1000) + 200);
  }
  function begin() {
    wantStart = false;
    const ac = audio.ctx, out = audio.musicOut; if (!ac || !out || !bufA || !bufB) return;
    if (ac.state !== 'running') audio.unlock();             // (retoma; o tempo do contexto fica parado até lá, então nada se adianta)
    const now = ac.currentTime + 0.01, sr = bufB.sampleRate;
    const gA = ac.createGain(), gB = ac.createGain(); gA.gain.value = VOL; gB.gain.value = 0;
    const srcA = ac.createBufferSource(); srcA.buffer = bufA; srcA.connect(gA); gA.connect(out);
    const srcB = ac.createBufferSource(); srcB.buffer = bufB; srcB.loop = true;
    srcB.loopStart = loopOfs / sr; srcB.loopEnd = Math.min(bufB.duration, srcB.loopStart + LOOP_SECS);
    srcB.connect(gB); gB.connect(out);
    const tX = now + Math.max(0, bufA.duration - XFADE);     // faltando 6 s para o fim do original
    srcA.start(now);                                         // do início, sem fade-in
    srcB.start(tX, srcB.loopStart);                          // o loop do começo, com volume 0
    gA.gain.setValueAtTime(VOL, tX); gA.gain.linearRampToValueAtTime(0, tX + XFADE);
    gB.gain.setValueAtTime(0, tX); gB.gain.linearRampToValueAtTime(VOL, tX + XFADE);
    srcA.stop(tX + XFADE + 0.05);                            // o original acaba com a transição
    run = { srcA, gA, srcB, gB, t0: now, tX, ending: false };
  }
  /** Começa (do zero) — o que sobrou de uma tentativa anterior para na hora. */
  function start() {
    gen++;
    if (run) { kill(run, audio.ctx.currentTime); run = null; }
    wantStart = true;
    if (bufA && bufB) begin(); else load();
  }
  /** Fade-out final (s segundos) em tudo o que estiver tocando; cancela o que ainda ia começar ou subir. */
  function fadeOut(s = 3) {
    wantStart = false;
    const r = run; run = null; if (!r || !audio.ctx) return;
    const ac = audio.ctx, now = ac.currentTime;
    for (const g of [r.gA, r.gB]) {
      const p = g.gain;
      const v = p.value;                                     // valor atual (no meio de uma rampa, se for o caso)
      try { if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now); else p.cancelScheduledValues(now); } catch (e) { p.cancelScheduledValues(now); }
      p.setValueAtTime(v, now); p.linearRampToValueAtTime(0, now + s);
    }
    if (now < r.tX) { try { r.srcB.stop(now); } catch (e) { /* */ } }   // o loop ainda nem tinha começado: não começa mais
    kill(r, now + s + 0.05);
  }
  return {
    load, start, fadeOut,
    /** Está soando (para os créditos ao lado do botão de música). */
    get audible() { return !!run; },
    get error() { return error; }, get ready() { return !!(bufA && bufB); },
    get _run() { return run; }, get _loopOfs() { return loopOfs; },
  };
}
