// Música do deslocamento pelo vazio (extra 1): "just us".
// O original toca uma vez, do início, sem fade-in; 6 s antes do fim dele entra a versão em loop (do começo, volume 0)
// e os dois fazem fades opostos de 6 s ao mesmo tempo; depois só o loop, emendado sem pausa (AudioBufferSourceNode.loop
// com o trecho exato do WAV, sem o silêncio que o MP3 acrescenta). O fim (fadeOut) vale a qualquer momento e cancela
// o que ainda estiver agendado. Tudo pela saída de música (volume das Configurações).
const LOOP_FRAMES = 1104384;          // duração exata do WAV do loop (48 kHz)
const VOL = 0.55, XFADE = 6;

export function createVoidMusic(audio, origUrl, loopUrl) {
  let bufA = null, bufB = null, loopOfs = 0, loading = null, run = null, wantStart = false, gen = 0;
  const decode = url => fetch(url).then(r => r.arrayBuffer()).then(b => new Promise((ok, no) => audio.ctx.decodeAudioData(b, ok, no)));
  /** Primeira amostra com som de verdade: o MP3 pode trazer silêncio de codificação no começo (o WAV já começa com som). */
  function firstSound(buf) { const d = buf.getChannelData(0); for (let i = 0; i < Math.min(d.length, 8000); i++) if (Math.abs(d[i]) > 0.0045) return i; return 0; }
  function load() {
    if (loading || !audio.ctx) return loading || Promise.resolve();
    loading = Promise.all([decode(origUrl), decode(loopUrl)]).then(([a, b]) => { bufA = a; bufB = b; loopOfs = firstSound(b); if (wantStart) begin(); })
      .catch(() => { loading = null; });
    return loading;
  }
  function kill(r, at) {                                     // para as fontes (agora ou em `at`) e solta tudo depois
    for (const s of [r.srcA, r.srcB]) if (s) { try { s.stop(at); } catch (e) { /* */ } }
    setTimeout(() => { for (const n of [r.srcA, r.srcB, r.gA, r.gB]) if (n) { try { n.disconnect(); } catch (e) { /* */ } } }, Math.max(0, (at - audio.ctx.currentTime) * 1000) + 200);
  }
  function begin() {
    wantStart = false;
    const ac = audio.ctx, out = audio.musicOut; if (!ac || !out || !bufA || !bufB) return;
    const now = ac.currentTime + 0.01, sr = bufB.sampleRate;
    const gA = ac.createGain(), gB = ac.createGain(); gA.gain.value = VOL; gB.gain.value = 0;
    const srcA = ac.createBufferSource(); srcA.buffer = bufA; srcA.connect(gA); gA.connect(out);
    const srcB = ac.createBufferSource(); srcB.buffer = bufB; srcB.loop = true;
    srcB.loopStart = loopOfs / sr; srcB.loopEnd = Math.min(bufB.duration, (loopOfs + LOOP_FRAMES) / sr);
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
    get _run() { return run; }, get _loopOfs() { return loopOfs; },
  };
}
