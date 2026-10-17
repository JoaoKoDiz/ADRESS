// Nível 24 (Medieval): sons do burgo gerados com WebAudio (sem arquivos), no mesmo barramento do jogo (audio.out).
// Laços: água da fonte, murmúrio do mercado (vozes sintetizadas por ruído com formantes que mudam como sílabas), vento
// (rajadas lentas) e rodas das carroças nas pedras. Pontuais: martelo da ferraria, passos na pedra, cascos, ranger de
// porta, batidas na porta, pássaros, água enchendo o balde e vassoura. Volume moderado (o motor da van usa ~0,02–0,03).
// Tudo é um no-op seguro antes do unlock() (audio.ctx/out nulos) ou sem WebAudio: nada aqui lança exceção.

const FORMANTS = [320, 420, 520, 640, 760, 900, 1100];

export function createMedievalAudio(audio) {
  let A = null, off = false;   // off: depois de stop(), só o laço (update) volta a montar os nós (um som pontual atrasado não remonta tudo fora do bairro)
  /** Monta os nós na primeira vez que o contexto existe (ou de novo depois de stop()). */
  function ensure() {
    const ac = audio && audio.ctx, out = audio && audio.out;
    if (!ac || !out) return null;
    if (A && A.ac === ac) return A;
    try { A = build(ac, out); } catch (e) { A = null; }
    return A;
  }
  function noiseBuf(ac, sec, kind) {
    const n = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, br = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'pink') { b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 1.6; }
      else if (kind === 'brown') { br = (br + w * 0.02) * 0.998; d[i] = br * 3.2; }
      else d[i] = w;
    }
    const X = Math.min(2000, n >> 3);                                  // emenda sem estalo no laço
    for (let i = 0; i < X; i++) { const k = i / X; d[i] = d[i] * k + d[n - X + i] * (1 - k); }
    return b;
  }
  function build(ac, out) {
    const bus = ac.createGain(); bus.gain.value = 1; bus.connect(out);
    const white = noiseBuf(ac, 2, 'white'), pink = noiseBuf(ac, 4, 'pink'), brown = noiseBuf(ac, 4, 'brown');
    const loopSrc = (buf, off = 0) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopEnd = buf.duration - 2000 / ac.sampleRate; s.start(ac.currentTime, off % (buf.duration - 0.1)); return s; };
    const pan = () => (ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain());
    const nodes = [];
    const keep = (...n) => { nodes.push(...n); return n[0]; };
    // água da fonte: ruído rosa claro + borbulhar (faixa aguda com tremor aleatório)
    const fG = keep(ac.createGain()), fP = keep(pan()), fS = keep(loopSrc(pink, 0.3)), fH = keep(ac.createBiquadFilter()), fL = keep(ac.createBiquadFilter());
    fH.type = 'highpass'; fH.frequency.value = 280; fL.type = 'lowpass'; fL.frequency.value = 2600; fG.gain.value = 0;
    fS.connect(fH); fH.connect(fL); fL.connect(fG);
    const tS = keep(loopSrc(white, 0.7)), tB = keep(ac.createBiquadFilter()), tG = keep(ac.createGain());
    tB.type = 'bandpass'; tB.frequency.value = 1900; tB.Q.value = 1.4; tG.gain.value = 0.25; tS.connect(tB); tB.connect(tG); tG.connect(fG);
    fG.connect(fP); fP.connect(bus);
    // murmúrio do mercado: 5 "vozes" (ruído → formante que muda) + um fundo grave
    const mG = keep(ac.createGain()); mG.gain.value = 0; mG.connect(bus);
    const voices = [];
    for (let i = 0; i < 5; i++) {
      const s = keep(loopSrc(pink, i * 0.73)), f = keep(ac.createBiquadFilter()), f2 = keep(ac.createBiquadFilter()), g = keep(ac.createGain());
      f.type = 'bandpass'; f.frequency.value = FORMANTS[i % FORMANTS.length]; f.Q.value = 5; f2.type = 'bandpass'; f2.frequency.value = 1400 + i * 180; f2.Q.value = 3;
      const g2 = keep(ac.createGain()); g2.gain.value = 0.35; g.gain.value = 0;
      s.connect(f); f.connect(g); s.connect(f2); f2.connect(g2); g2.connect(g); g.connect(mG);
      voices.push({ f, f2, g, next: 0, retune: 0, amp: 0.7 + Math.random() * 0.5 });
    }
    const bedS = keep(loopSrc(pink, 2.1)), bedF = keep(ac.createBiquadFilter()), bedG = keep(ac.createGain());
    bedF.type = 'bandpass'; bedF.frequency.value = 480; bedF.Q.value = 0.8; bedG.gain.value = 0.35; bedS.connect(bedF); bedF.connect(bedG); bedG.connect(mG);
    // vento: ruído marrom, passa-baixa que abre nas rajadas
    const wS = keep(loopSrc(brown, 1.3)), wF = keep(ac.createBiquadFilter()), wG = keep(ac.createGain()), wH = keep(ac.createBiquadFilter());
    wF.type = 'lowpass'; wF.frequency.value = 420; wH.type = 'highpass'; wH.frequency.value = 70; wG.gain.value = 0;
    wS.connect(wH); wH.connect(wF); wF.connect(wG); wG.connect(bus);
    // rodas das carroças: ronco grave nas pedras (tremor vem do update)
    const cS = keep(loopSrc(brown, 0.4)), cF = keep(ac.createBiquadFilter()), cG = keep(ac.createGain()), cP = keep(pan());
    cF.type = 'lowpass'; cF.frequency.value = 190; cG.gain.value = 0; cS.connect(cF); cF.connect(cG); cG.connect(cP); cP.connect(bus);
    return { ac, bus, white, pink, nodes, fG, fP, tG, mG, voices, wF, wG, cG, cP, last: {}, gust: 0, gustT: 0, flut: 0 };
  }
  const setG = (A, key, param, v, tc) => { if (A.last[key] != null && Math.abs(A.last[key] - v) < 0.0006) return; A.last[key] = v; param.setTargetAtTime(v, A.ac.currentTime, tc); };
  const setPan = (A, node, key, p) => { if (!node.pan) return; p = Math.max(-1, Math.min(1, p || 0)); if (A.last[key] != null && Math.abs(A.last[key] - p) < 0.03) return; A.last[key] = p; node.pan.setTargetAtTime(p, A.ac.currentTime, 0.1); };

  // ---- pontuais ----
  function voice(A, k, p, make) {
    if (k <= 0.01) return;
    const ac = A.ac, g = ac.createGain(), pn = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pn) { pn.pan.value = Math.max(-1, Math.min(1, p || 0)); g.connect(pn); pn.connect(A.bus); } else g.connect(A.bus);
    const end = make(ac, g, ac.currentTime) || 1;
    setTimeout(() => { try { g.disconnect(); if (pn) pn.disconnect(); } catch (e) { /* */ } }, end * 1000 + 300);
  }
  function tone(ac, dst, t0, f, dur, type, vol, glide = 1) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0); if (glide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * glide), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.006, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) { /* */ } };
  }
  function burst(A, dst, t0, dur, vol, type, freq, Q = 1, attack = 0.003, buf = A.white) {
    const ac = A.ac, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = Q;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dst); s.start(t0, Math.random() * (buf.duration - dur - 0.1)); s.stop(t0 + dur + 0.05);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* */ } };
    return f;
  }
  const safe = (fn, loop) => (...a) => { if (off && !loop) return; off = false; const X = ensure(); if (!X) return; try { fn(X, ...a); } catch (e) { /* som é opcional */ } };

  return {
    /** Laços: { fountain, fountainPan, market, wind, cart, cartPan, cartSpeed } (0..1), dt em segundos. */
    update: safe((A, dt, o) => {
      const t = A.ac.currentTime;
      setG(A, 'f', A.fG.gain, 0.085 * (o.fountain || 0), 0.25); setPan(A, A.fP, 'fp', o.fountainPan);
      A.flut -= dt; if (A.flut <= 0 && o.fountain > 0.02) { A.flut = 0.05 + Math.random() * 0.12; A.tG.gain.setTargetAtTime(0.12 + Math.random() * 0.35, t, 0.03); }
      setG(A, 'm', A.mG.gain, 0.05 * (o.market || 0), 1.2);
      if ((o.market || 0) > 0.01) for (const v of A.voices) {              // sílabas: volume e formante mudando
        v.next -= dt; v.retune -= dt;
        if (v.next <= 0) { const pause = Math.random() < 0.12; v.next = pause ? 0.3 + Math.random() * 0.7 : 0.07 + Math.random() * 0.17; v.g.gain.setTargetAtTime(pause ? 0 : v.amp * (0.25 + Math.random() * 0.75), t, 0.035); }
        if (v.retune <= 0) { v.retune = 0.12 + Math.random() * 0.35; v.f.frequency.setTargetAtTime(FORMANTS[Math.floor(Math.random() * FORMANTS.length)] * (0.9 + Math.random() * 0.25), t, 0.05); }
      }
      A.gustT -= dt; if (A.gustT <= 0) { A.gustT = 1.5 + Math.random() * 3.5; A.gust = Math.random(); }
      const w = (o.wind || 0) * (0.55 + 0.45 * A.gust);
      setG(A, 'w', A.wG.gain, 0.05 * w, 0.9); setG(A, 'wf', A.wF.frequency, 260 + 520 * w, 1.2);
      A.cartT = (A.cartT || 0) - dt;                                        // rodas nas pedras: tremor irregular
      if (A.cartT <= 0) { A.cartT = 0.06 + Math.random() * 0.08; setG(A, 'c', A.cG.gain, 0.035 * (o.cart || 0) * (0.65 + 0.35 * Math.random()), 0.05); }
      setPan(A, A.cP, 'cp', o.cartPan);
    }, true),
    /** Martelo na bigorna: parciais metálicas + estalo. */
    clang: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => {
      const f0 = 520 * (0.95 + Math.random() * 0.1);
      [[1, 0.7, 0.06], [2.76, 0.45, 0.035], [5.4, 0.25, 0.02], [8.93, 0.14, 0.012]].forEach(([m, d, v]) => tone(ac, g, t0, f0 * m, d, 'sine', v * k));
      burst(A, g, t0, 0.04, 0.05 * k, 'lowpass', 3200); return 0.8;
    })),
    /** Passo na pedra. */
    step: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => { burst(A, g, t0, 0.05, 0.018 * k, 'bandpass', 1300 + Math.random() * 700, 1.2); tone(ac, g, t0, 95, 0.06, 'sine', 0.012 * k); return 0.12; })),
    /** Casco de cavalo (clip-clop). */
    hoof: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => { burst(A, g, t0, 0.035, 0.05 * k, 'bandpass', 700 + Math.random() * 300, 6); tone(ac, g, t0, 320, 0.07, 'triangle', 0.025 * k, 0.55); return 0.12; })),
    /** Porta rangendo (estalos rápidos que mudam de ritmo). */
    creak: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => {
      const o = ac.createOscillator(), f = ac.createBiquadFilter(), e = ac.createGain(), d = 0.55 + Math.random() * 0.35;
      o.type = 'sawtooth'; o.frequency.setValueAtTime(28, t0); o.frequency.linearRampToValueAtTime(52 + Math.random() * 20, t0 + d * 0.4); o.frequency.linearRampToValueAtTime(34, t0 + d);
      f.type = 'bandpass'; f.frequency.value = 1300 + Math.random() * 500; f.Q.value = 7;
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.03 * k, t0 + 0.06); e.gain.linearRampToValueAtTime(0.022 * k, t0 + d * 0.7); e.gain.linearRampToValueAtTime(0, t0 + d);
      o.connect(f); f.connect(e); e.connect(g); o.start(t0); o.stop(t0 + d + 0.05);
      o.onended = () => { try { o.disconnect(); f.disconnect(); e.disconnect(); } catch (er) { /* */ } };
      return d + 0.1;
    })),
    /** Batida na porta. */
    knock: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => { tone(ac, g, t0, 170, 0.09, 'sine', 0.05 * k, 0.7); burst(A, g, t0, 0.03, 0.04 * k, 'lowpass', 1200); return 0.2; })),
    /** Pássaro: 2–5 piados (cada chamada um pouco diferente). */
    chirp: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => {
      const n = 2 + Math.floor(Math.random() * 4), base = 2600 + Math.random() * 1600, up = Math.random() < 0.5; let t = t0;
      for (let i = 0; i < n; i++) { const d = 0.05 + Math.random() * 0.07; tone(ac, g, t, base * (0.95 + Math.random() * 0.12), d, 'sine', 0.014 * k, up ? 1.35 : 0.7); t += d + 0.04 + Math.random() * 0.08; }
      return t - t0 + 0.1;
    })),
    /** Água enchendo o balde: o tom sobe enquanto enche. */
    fill: safe((A, k, p, dur = 2.4) => voice(A, k, p, (ac, g, t0) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
      s.buffer = A.pink; s.loop = true; f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(380, t0); f.frequency.exponentialRampToValueAtTime(1500, t0 + dur);
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.06 * k, t0 + 0.15); e.gain.setValueAtTime(0.06 * k, t0 + dur - 0.3); e.gain.linearRampToValueAtTime(0, t0 + dur);
      s.connect(f); f.connect(e); e.connect(g); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
      s.onended = () => { try { s.disconnect(); f.disconnect(); e.disconnect(); } catch (er) { /* */ } };
      return dur + 0.1;
    })),
    /** Vassoura (shhh curto). */
    swish: safe((A, k, p) => voice(A, k, p, (ac, g, t0) => { burst(A, g, t0, 0.32, 0.022 * k, 'bandpass', 3200 + Math.random() * 800, 0.8, 0.09); return 0.4; })),
    /** Silencia os laços (fonte, mercado, vento, rodas). */
    silence() {
      if (!A) return;
      try { const t = A.ac.currentTime; for (const g of [A.fG, A.mG, A.wG, A.cG]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, 0.08); } A.last = {}; } catch (e) { /* */ }
    },
    /** Para e desliga tudo (sai do bairro); volta a montar sozinho se for usado de novo. */
    stop() {
      off = true;
      if (!A) return;
      const X = A; A = null;
      try { for (const n of X.nodes) { try { if (n.stop) n.stop(); } catch (e) { /* */ } try { n.disconnect(); } catch (e) { /* */ } } X.bus.disconnect(); } catch (e) { /* */ }
    },
  };
}
