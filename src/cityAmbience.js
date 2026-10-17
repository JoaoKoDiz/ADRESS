// Bairros 7 e 8 (cidade): som ambiente urbano, baixo e contínuo, igual no bairro inteiro. Tudo gerado com WebAudio
// (sem arquivos), passando pela saída principal do jogo (audio.out), como os outros sons:
//  - rumor grave do trânsito distante (ruído marrom → passa-baixa) que sobe e desce devagar, em ondas;
//  - o "ar" da cidade (ruído em banda média, bem baixo);
//  - de vez em quando, bem longe: um carro passando (sopro filtrado que cresce e some, de um lado para o outro) e uma buzina curta.
// Um único laço: as fontes são criadas uma vez ao entrar e liberadas depois do fade-out (fora dos Bairros 7/8, nos menus,
// na tela inicial). Abaixa um pouco quando a música dos engarrafamentos (jamSound) está tocando; com a aba escondida, silencia.

const VOLUME = 0.08;     // ganho do conjunto (baixo, perto do ronco da van parada: fica por baixo da música e dos sons de interação)
const FADE = 0.8;        // constante de tempo do fade (s)

export function createCityAmbience(audio) {
  let bus = null, parts = null, level = 0, silentFor = 0, nextCar = 3, nextHorn = 8, hidden = false;

  /** Ruído marrom em loop (4 s, emenda sem estalo). */
  function brownBuffer(ac) {
    const n = Math.floor(ac.sampleRate * 4), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let b = 0, peak = 0;
    for (let i = 0; i < n; i++) { b = (b + (Math.random() * 2 - 1) * 0.02) * 0.998; d[i] = b; peak = Math.max(peak, Math.abs(b)); }
    const X = Math.floor(ac.sampleRate * 0.05);
    for (let i = 0; i < X; i++) { const k = i / X; d[i] = d[i] * k + d[n - X + i] * (1 - k); }
    for (let i = 0; i < n; i++) d[i] /= peak || 1;
    return { buf, loopEnd: (n - X) / ac.sampleRate };
  }
  function start(ac) {
    bus = ac.createGain(); bus.gain.value = 0; bus.connect(audio.out);
    const { buf, loopEnd } = brownBuffer(ac);
    const loop = (offset, type, freq, q, vol) => {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = buf; s.loop = true; s.loopEnd = loopEnd; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
      s.connect(f); f.connect(g); g.connect(bus); s.start(0, offset);
      return { s, f, g };
    };
    const rumble = loop(0, 'lowpass', 240, 0.5, 0.55), air = loop(1.7, 'bandpass', 900, 0.5, 0.22);
    // ondas lentas no rumor (o trânsito ao longe vem e vai) e no "ar"
    const lfo = ac.createOscillator(), lg = ac.createGain(), lfo2 = ac.createOscillator(), lg2 = ac.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 0.18; lfo.connect(lg); lg.connect(rumble.g.gain); lfo.start();
    lfo2.frequency.value = 0.045; lg2.gain.value = 0.07; lfo2.connect(lg2); lg2.connect(air.g.gain); lfo2.start();
    parts = { srcs: [rumble.s, air.s, lfo, lfo2], nodes: [rumble.f, rumble.g, air.f, air.g, lg, lg2], buf };
  }
  function stop() {
    if (!parts) return;
    for (const s of parts.srcs) { try { s.stop(); s.disconnect(); } catch (e) { /* ignora */ } }
    for (const n of parts.nodes) { try { n.disconnect(); } catch (e) { /* ignora */ } }
    try { bus.disconnect(); } catch (e) { /* ignora */ }
    parts = bus = null; level = 0;
  }
  const release = (nodes, src) => { src.onended = () => { for (const x of nodes) { try { x.disconnect(); } catch (e) { /* ignora */ } } }; };
  // um carro passando ao longe: trecho do ruído, filtro que abre e fecha, de um lado para o outro
  function carPass(ac) {
    const t = ac.currentTime, dur = 2.2 + Math.random() * 1.6, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = parts.buf; s.loop = true; f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(260, t); f.frequency.linearRampToValueAtTime(700 + Math.random() * 300, t + dur * 0.5); f.frequency.linearRampToValueAtTime(240, t + dur);
    const peak = 0.25 + Math.random() * 0.2;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    let out = g; const nodes = [s, f, g];
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(), d = Math.random() < 0.5 ? -1 : 1; p.pan.setValueAtTime(-0.7 * d, t); p.pan.linearRampToValueAtTime(0.7 * d, t + dur); g.connect(p); out = p; nodes.push(p); }
    s.connect(f); f.connect(g); out.connect(bus); s.start(t, Math.random() * 3); s.stop(t + dur + 0.05);
    release(nodes, s);
  }
  // buzina curta e abafada, bem longe (uma ou duas vezes)
  function horn(ac) {
    const t0 = ac.currentTime, f0 = [330, 370, 415, 440][Math.floor(Math.random() * 4)], n = Math.random() < 0.4 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const t = t0 + k * 0.32, d = 0.18 + Math.random() * 0.12, o = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'square'; o2.type = 'square'; o.frequency.value = f0; o2.frequency.value = f0 * 1.26; f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.03); g.gain.setValueAtTime(0.05, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.06);
      o.connect(f); o2.connect(f); f.connect(g); g.connect(bus); o.start(t); o2.start(t); o.stop(t + d + 0.1); o2.stop(t + d + 0.1);
      release([o, o2, f, g], o);
    }
  }
  try {
    document.addEventListener('visibilitychange', () => {
      hidden = document.hidden;
      if (hidden && bus) { try { bus.gain.value = 0; } catch (e) { /* ignora */ } level = 0; }   // o laço do jogo para: não fica soando sozinho
    });
  } catch (e) { /* ignora */ }

  return {
    /** Testes: estado atual. */
    get debug() { return { playing: !!parts, level }; },
    /** Todo quadro. active: jogando nos Bairros 7/8; duck: 0..1 (música dos engarrafamentos tocando). */
    update(dt, active, duck = 0) {
      const ac = audio.ctx;
      if (!ac) return;
      if (active && !parts && !hidden) { start(ac); silentFor = 0; }
      if (!parts) return;
      const target = active && !hidden ? VOLUME * (1 - 0.55 * Math.max(0, Math.min(1, duck))) : 0;
      level += (target - level) * (1 - Math.exp(-dt / FADE));
      bus.gain.value = level;
      if (active && level > VOLUME * 0.3) {                         // eventos ao longe (só com o bairro soando)
        if ((nextCar -= dt) <= 0) { nextCar = 4 + Math.random() * 6; try { carPass(ac); } catch (e) { /* som é opcional */ } }
        if ((nextHorn -= dt) <= 0) { nextHorn = 10 + Math.random() * 14; try { horn(ac); } catch (e) { /* som é opcional */ } }
      }
      silentFor = !active && level < 0.002 ? silentFor + dt : 0;
      if (silentFor > 0.3) stop();                                 // terminou o fade-out: libera as fontes
    },
    stop,
  };
}
