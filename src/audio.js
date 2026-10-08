// Sons discretos gerados com WebAudio (sem arquivos): ronco do motor, campainha, resmungo e sucesso.
// Tudo é um no-op seguro antes de unlock() ou se o navegador não tiver WebAudio — nada aqui lança exceção.

const MASTER = 0.9;
const ENGINE_MIN = 0.012, ENGINE_RANGE = 0.022;   // volume do motor: parado → velocidade máxima
const ENGINE_HZ = 42, ENGINE_HZ_RANGE = 63;       // tom do motor (a 2ª onda toca uma oitava abaixo)
const ENGINE_LP = 250, ENGINE_LP_RANGE = 120;     // filtro passa-baixa abre um pouco com a velocidade

export function createAudio() {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ac = null, master = null, eng = null, broken = !Ctor;
  // últimos alvos agendados no motor (evita empilhar automações a cada quadro)
  let engGain = -1, engHz = -1;

  const resume = () => {
    try {
      if (ac && ac.state === 'suspended') { const p = ac.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { /* ignora */ }
  };

  function build() {
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = MASTER;
    master.connect(ac.destination);

    // Motor: dente-de-serra + quadrada (oitava abaixo) → passa-baixa → ganho (começa mudo).
    const o = ac.createOscillator(), o2 = ac.createOscillator();
    const f = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.value = ENGINE_HZ; o2.frequency.value = ENGINE_HZ * 0.5;
    f.type = 'lowpass'; f.frequency.value = ENGINE_LP; f.Q.value = 0.7;
    g.gain.value = 0;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o.start(); o2.start();
    eng = { o, o2, f, g };
  }

  /** Nota curta com ataque rápido e decaimento exponencial. `glide` multiplica a frequência ao longo da nota. */
  function tone(freq, at, dur, type = 'sine', vol = 0.12, glide = 1) {
    if (!ac) return;
    const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glide !== 1) o.frequency.exponentialRampToValueAtTime(freq * glide, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) { /* ignora */ } };
  }

  /** Ruído curto (estrondo), filtrado e com decaimento. */
  function noise(dur, vol) {
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = "lowpass"; f.frequency.value = 1600; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* ignora */ } };
  }

  const safe = fn => (...args) => { if (!ac) return; try { fn(...args); } catch (e) { /* som é opcional */ } };

  // Ao esconder a aba o laço para: silencia o motor para ele não ficar zumbindo sozinho.
  try {
    document.addEventListener('visibilitychange', () => {
      if (!eng || !document.hidden) return;
      try { eng.g.gain.setTargetAtTime(0, ac.currentTime, 0.05); engGain = 0; } catch (e) { /* ignora */ }
    });
  } catch (e) { /* ignora */ }

  return {
    /** Contexto e saída principal (para sons com arquivo, como a música dos engarrafamentos). null antes do unlock(). */
    get ctx() { return ac; },
    get out() { return master; },
    /** Cria/retoma o AudioContext. Idempotente; chamar no primeiro evento de teclado/ponteiro. */
    unlock() {
      if (broken) return;
      if (ac) { resume(); return; }
      try { build(); resume(); } catch (e) {
        try { if (ac && ac.close) ac.close(); } catch (e2) { /* ignora */ }
        ac = master = eng = null; broken = true;
      }
    },

    /** Partida no motor (van da tela inicial). */
    ignition: safe(() => { noise(0.35, 0.12); tone(55, 0, 0.45, "sawtooth", 0.09, 1.6); tone(70, 0.35, 1.0, "sawtooth", 0.08, 1.9); }),

    /** Transformação em robô (sequência mecânica). */
    transform: safe(() => { [196, 262, 220, 330, 294, 440, 523].forEach((f, i) => tone(f, i * 0.09, 0.12, "square", 0.05)); noise(0.5, 0.12); }),

    /** Tremor de terra grave (monstro subindo). */
    rumble: safe(() => { noise(1.4, 0.45); tone(38, 0, 1.4, "sawtooth", 0.12, 0.8); tone(52, 0.1, 1.2, "triangle", 0.14, 0.7); }),

    /** Rugido do monstro. */
    roar: safe(() => { noise(2.2, 0.35); tone(140, 0, 2.2, "sawtooth", 0.16, 0.35); tone(95, 0.05, 2.2, "square", 0.09, 0.4); tone(210, 0, 1.4, "sawtooth", 0.07, 0.3); }),

    /** Batida do rotor do helicóptero. */
    rotor: safe(() => { tone(58, 0, 0.09, "triangle", 0.07, 0.75); noise(0.05, 0.04); }),

    /** Explosão grande de casa. */
    boom: safe(() => { noise(1.6, 0.55); tone(70, 0, 1.1, "sine", 0.3, 0.45); tone(48, 0.05, 1.3, "triangle", 0.2, 0.6); }),

    /** Escotilha abrindo na van. */
    hatch: safe(() => { tone(420, 0, 0.12, "square", 0.04, 1.6); tone(660, 0.12, 0.1, "square", 0.035); }),

    /** Lançamento do míssil (chiado subindo). */
    launch: safe(() => { noise(0.9, 0.18); tone(220, 0, 0.9, "sawtooth", 0.05, 3); }),

    /** Assobio descendo (seta caindo do céu). */
    whistle: safe(() => { tone(1500, 0, 1.25, "sine", 0.05, 0.3); }),

    /** Estrondo da seta quebrando o telhado. */
    crash: safe(() => { noise(0.7, 0.35); tone(95, 0, 0.5, "sine", 0.22, 0.5); tone(62, 0.03, 0.6, "triangle", 0.14, 0.6); }),

    /** Bomba de gasolina: glub-glub e a caixa registradora no fim. */
    fuel: safe(() => {
      for (let i = 0; i < 6; i++) tone(180 + (i % 2) * 40, i * 0.2, 0.16, 'sine', 0.09, 0.6);
      tone(1320, 1.35, 0.12, 'square', 0.04); tone(1760, 1.47, 0.35, 'sine', 0.07);
    }),

    /** Campainha "ding-dong". */
    bell: safe(() => {
      tone(880, 0, 0.45, 'sine', 0.12);
      tone(1760, 0, 0.18, 'sine', 0.025);     // brilho de sino
      tone(698, 0.3, 0.6, 'sine', 0.12);
      tone(1396, 0.3, 0.22, 'sine', 0.022);
    }),

    /** Resmungo: dois blips graves caindo. */
    grumble: safe(() => {
      tone(190, 0, 0.12, 'triangle', 0.08, 0.9);
      tone(150, 0.13, 0.2, 'triangle', 0.08, 0.82);
    }),

    /** Arpejo alegre de sucesso. */
    success: safe(() => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.09));
      tone(1568, 0.36, 0.5, 'sine', 0.03);
    }),

    /** Ronco do motor: segue a velocidade (0..1) enquanto `running`; senão desaparece suavemente. */
    engine: safe((running, speed01) => {
      if (!eng) return;
      const s = running ? Math.min(1, Math.max(0, Number(speed01) || 0)) : 0;
      const gain = running ? ENGINE_MIN + ENGINE_RANGE * s : 0;
      const t = ac.currentTime;
      if (Math.abs(gain - engGain) > 0.0005) {
        engGain = gain;
        eng.g.gain.setTargetAtTime(gain, t, 0.12);
      }
      if (running) {
        const hz = ENGINE_HZ + ENGINE_HZ_RANGE * s;
        if (Math.abs(hz - engHz) > 0.4) {
          engHz = hz;
          eng.o.frequency.setTargetAtTime(hz, t, 0.1);
          eng.o2.frequency.setTargetAtTime(hz * 0.5, t, 0.1);
          eng.f.frequency.setTargetAtTime(ENGINE_LP + ENGINE_LP_RANGE * s, t, 0.1);
        }
      }
    }),
  };
}
