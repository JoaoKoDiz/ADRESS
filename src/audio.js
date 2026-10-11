// Sons discretos gerados com WebAudio (sem arquivos): ronco do motor, campainha, resmungo e sucesso.
// Tudo é um no-op seguro antes de unlock() ou se o navegador não tiver WebAudio — nada aqui lança exceção.

const MASTER = 0.9;
const ENGINE_MIN = 0.012, ENGINE_RANGE = 0.022;   // volume do motor: parado → velocidade máxima
const ENGINE_HZ = 42, ENGINE_HZ_RANGE = 63;       // tom do motor (a 2ª onda toca uma oitava abaixo)
const ENGINE_LP = 250, ENGINE_LP_RANGE = 120;     // filtro passa-baixa abre um pouco com a velocidade

export function createAudio() {
  const Ctor = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  let ac = null, master = null, eng = null, traf = null, trafGain = -1, broken = !Ctor;
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
    // trânsito (Nível 14): um ronco mais grave, mais baixo, que cresce com o carro mais perto
    const t1 = ac.createOscillator(), t2 = ac.createOscillator(), tf = ac.createBiquadFilter(), tg = ac.createGain();
    t1.type = 'sawtooth'; t2.type = 'triangle'; t1.frequency.value = 58; t2.frequency.value = 87;
    tf.type = 'lowpass'; tf.frequency.value = 220; tg.gain.value = 0;
    t1.connect(tf); t2.connect(tf); tf.connect(tg); tg.connect(master); t1.start(); t2.start();
    traf = { t1, t2, tg };
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

  // ---- Ursa Menor (Modo Livre): sons exagerados num barramento próprio (compressor evita estourar; end() corta tudo) ----
  let ub = null;
  function uT(freq, at, dur, type = 'sine', vol = 0.1, glide = 1) {
    if (!ac || !ub) return;
    const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glide !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.03, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(ub); o.start(t0); o.stop(t0 + dur + 0.05);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) { /* */ } };
  }
  /** swell: o volume sobe até o fim (em vez de cair). */
  function uN(dur, vol, at = 0, lp = 1600, hp = 0, swell = false) {
    if (!ac || !ub) return;
    const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (swell ? Math.pow(i / len, 1.5) : Math.pow(1 - i / len, 2));
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || lp; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(ub); s.start(ac.currentTime + at);
    s.onended = () => { try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { /* */ } };
  }
  const ursa = {
    begin: safe(() => {
      if (ub) { try { ub.disconnect(); } catch (e) { /* */ } }
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 8; comp.attack.value = 0.003; comp.release.value = 0.25;
      ub = ac.createGain(); ub.gain.value = 0.85; ub.connect(comp); comp.connect(master); ub._comp = comp;
    }),
    /** a constelação aparecendo: brilho mágico crescente, sinos cristalinos e um grave enorme */
    shine: safe(() => {
      [1318, 1568, 1976, 2349, 2637, 3136, 3951].forEach((f, i) => { uT(f, i * 0.22, 1.4, 'sine', 0.035 + i * 0.004); uT(f * 2.01, i * 0.22 + 0.01, 0.9, 'triangle', 0.012); });
      uN(2.2, 0.05, 0, 0, 5000, true);
      uT(44, 1.3, 2.4, 'sine', 0.22, 0.85); uT(66, 1.35, 2.2, 'triangle', 0.1, 0.8); uN(1.8, 0.12, 1.3, 220);
    }),
    /** viagem: aceleração, rajadas e passagens cada vez mais fortes */
    travel: safe(() => {
      uT(70, 0, 4, 'sawtooth', 0.05, 7); uT(105, 0.1, 3.9, 'square', 0.025, 6);
      [0, 0.6, 1.1, 1.5, 1.85, 2.15, 2.4, 2.62, 2.82, 3.0, 3.16, 3.3, 3.43, 3.55].forEach((at, i) => {
        uN(0.45, 0.06 + i * 0.012, at, 900 + i * 220); uT(1400 - i * 30, at, 0.35, 'sine', 0.02 + i * 0.003, 0.3);   // rajada + passagem (efeito Doppler)
      });
      uN(4, 0.06, 0, 0, 2500, true);
    }),
    /** cada estrela de perto: pulsação grave + energia própria */
    pulse: safe(i => {
      uT(48 + i * 7, 0, 0.5, 'sine', 0.22, 0.7); uT(96 + i * 14, 0.05, 0.45, 'triangle', 0.08, 0.8);
      uT(320 + i * 110, 0, 0.5, ['sawtooth', 'square', 'triangle'][i % 3], 0.03, 1.6 + i * 0.1); uN(0.4, 0.04, 0.02, 0, 3000 + i * 400);
    }),
    /** partida de cada estrela: estrondo, estalo de energia e rastro longo */
    launch: safe(i => {
      uN(0.9, 0.22, 0, 500 - i * 30); uT(58 - i * 3, 0, 0.9, 'sine', 0.24, 0.5);
      uN(0.12, 0.12, 0.02, 0, 3500); uT(2200 - i * 140, 0.02, 0.12, 'square', 0.04, 0.5);
      uT(900 + i * 70, 0.1, 1.6, 'sawtooth', 0.035, 0.18); uT(1300 + i * 90, 0.15, 1.4, 'sine', 0.03, 0.25);
    }),
    /** chegada à Terra: rugido crescente e entrada na atmosfera */
    arrive: safe(() => {
      uN(3, 0.16, 0, 400, 0, true); uN(3, 0.07, 0, 0, 2000, true); uT(38, 0, 3, 'sawtooth', 0.09, 2.2); uT(57, 0.2, 2.8, 'triangle', 0.08, 2);
      for (let i = 0; i < 7; i++) uN(0.35, 0.08, 0.4 + i * 0.32, 0, 1800);    // cada estrela atravessando a atmosfera
    }),
    /** um impacto: pancada grave, trovão, estilhaços, parede quebrando e um som cômico (o 7º é o maior) */
    impact: safe(i => {
      const last = i === 6, k = last ? 1.6 : 1;
      uN(0.9 * k, 0.28 * k, 0, 700); uT(52 - i * 2, 0, 1.2 * k, 'sine', 0.3, 0.4); uT(78, 0, 0.8 * k, 'triangle', 0.15, 0.5);
      uN(1.6 * k, 0.14, 0.12, 300);                                             // trovão rolando
      uN(0.25, 0.1, 0.02, 0, 4200); uN(0.18, 0.07, 0.2, 0, 6000);               // estilhaços
      for (let j = 0; j < 4; j++) uT(110 + Math.random() * 90, 0.05 + j * 0.07, 0.12, 'square', 0.035, 0.6);   // parede quebrando
      const comic = [[600, 0.25, 0.4, 'sine'], [300, 0.3, 2.4, 'triangle'], [900, 0.2, 0.3, 'square'], [200, 0.4, 3, 'sine'], [1200, 0.25, 0.5, 'triangle'], [450, 0.35, 2, 'square']][i % 6];
      uT(comic[0], 0.25, comic[1], comic[3], 0.04, comic[2]);                    // "boing", "bonk", "fiuu"…
      if (last) { uN(2.4, 0.25, 0.3, 200); uT(30, 0.1, 2.4, 'sawtooth', 0.12, 0.6); [1400, 1100, 800, 500, 300].forEach((f, j) => uT(f, 0.5 + j * 0.12, 0.25, 'triangle', 0.04)); uT(1800, 0.35, 1.2, 'sine', 0.04, 0.12); }
    }),
    /** depois: destroços caindo e um "uá-uá" engraçado */
    debris: safe(() => {
      for (let j = 0; j < 10; j++) uN(0.07, 0.06, j * 0.09 + Math.random() * 0.05, 0, 2500 + Math.random() * 3000);
      [[294, 0.0], [277, 0.28], [262, 0.56], [247, 0.84]].forEach(([f, at], j) => uT(f, 0.9 + at, j === 3 ? 0.7 : 0.26, 'sawtooth', 0.04, j === 3 ? 0.92 : 1));
    }),
    // ---- Sistema Solar (mesmo barramento) ----
    /** dia → noite: estrondo grave + sons cósmicos */
    nightfall: safe(() => {
      uT(36, 0, 3, 'sine', 0.26, 0.7); uT(54, 0.05, 2.6, 'triangle', 0.12, 0.6); uN(2.2, 0.16, 0, 260);
      [523, 659, 784, 1046, 1318].forEach((f, i) => uT(f, 0.5 + i * 0.18, 1.8, 'sine', 0.025, 1.02)); uN(3, 0.04, 0.3, 0, 4500, true);
      uT(220, 0.8, 2.8, 'sawtooth', 0.02, 2.2); uT(330, 1.0, 2.6, 'triangle', 0.02, 0.5);
    }),
    /** órbitas: pulsações, vibração e energia crescendo */
    orbit: safe(() => {
      for (let k = 0; k < 9; k++) { uT(60 + k * 4, 1.2 + k * 0.3, 0.32, 'sine', 0.12 + k * 0.012, 0.8); uT(440 + k * 55, 1.25 + k * 0.3, 0.25, 'triangle', 0.02 + k * 0.003, 1.3); }
      uT(90, 1, 3, 'sawtooth', 0.04, 3); uN(3, 0.05, 1, 0, 1800, true);
    }),
    /** cada planeta disparando: rajada, rugido e velocidade */
    dash: safe(i => {
      uN(0.8, 0.16, 0, 900 - i * 60); uT(70 - i * 4, 0, 1.4, 'sawtooth', 0.09, 1.8); uT(1500 - i * 120, 0, 0.9, 'sine', 0.035, 0.2);
      uN(1.2, 0.07, 0.1, 0, 2600, true); uT(180 + i * 20, 0.05, 1.6, 'square', 0.02, 0.4);
    }),
    /** o Sol vindo devagar: fogo crepitando, grave subindo, rugido */
    sunApproach: safe(() => {
      for (let j = 0; j < 40; j++) uN(0.05 + Math.random() * 0.06, 0.05 + j * 0.002, j * 0.11 + Math.random() * 0.05, 0, 2500 + Math.random() * 2500);   // crepitar
      uN(4.4, 0.22, 0, 350, 0, true); uN(4.4, 0.08, 0, 0, 1500, true); uT(28, 0, 4.5, 'sawtooth', 0.16, 2.6); uT(42, 0.3, 4.2, 'square', 0.06, 2.4); uT(110, 1.5, 3, 'sawtooth', 0.05, 1.8);
    }),
    /** o golpe do Sol: o mais intenso de todos (e ainda distinguível) */
    sunImpact: safe(() => {
      uN(2.8, 0.42, 0, 900); uT(34, 0, 3, 'sine', 0.38, 0.35); uT(50, 0, 2.6, 'sawtooth', 0.16, 0.4); uT(75, 0.05, 2.2, 'triangle', 0.16, 0.5);
      uN(3.6, 0.2, 0.25, 260); uN(0.5, 0.14, 0.02, 0, 4500); uN(0.4, 0.1, 0.4, 0, 6500); uN(2, 0.08, 0.6, 0, 1200);
      for (let j = 0; j < 8; j++) uT(100 + Math.random() * 120, 0.1 + j * 0.09, 0.15, 'square', 0.04, 0.5);
      [1600, 1300, 1000, 700, 450, 250].forEach((f, j) => uT(f, 0.9 + j * 0.1, 0.22, 'triangle', 0.035));
    }),
    /** corta tudo (devolução dos controles) */
    end: safe(() => {
      if (!ub) return; const b = ub; ub = null; const now = ac.currentTime;
      b.gain.cancelScheduledValues(now); b.gain.setValueAtTime(b.gain.value, now); b.gain.linearRampToValueAtTime(0, now + 0.25);
      setTimeout(() => { try { b.disconnect(); b._comp.disconnect(); } catch (e) { /* */ } }, 400);
    }),
  };

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
    /** Laser orbital: zumbido fino descendo do céu / carga do satélite / disparo forte. */
    ursa,
    laserZap: safe(() => { tone(2200, 0, 0.7, "sawtooth", 0.03, 0.2); tone(1100, 0.05, 1.2, "sine", 0.05, 0.6); }),
    laserCharge: safe(() => { tone(180, 0, 2.6, "sawtooth", 0.04, 6); tone(90, 0, 2.6, "square", 0.025, 5); }),
    laserBlast: safe(() => { noise(2.0, 0.4); tone(60, 0, 2.2, "sawtooth", 0.18, 0.5); tone(900, 0, 1.6, "sawtooth", 0.05, 0.3); }),

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

    /** Trânsito: k = 0 (nenhum carro perto) … 1 (carro colado); hz varia um pouco com a velocidade dele. */
    traffic: safe((k, speed01 = 0.5) => {
      if (!traf) return;
      const gain = 0.03 * Math.max(0, Math.min(1, k)), t = ac.currentTime;
      if (Math.abs(gain - trafGain) > 0.0008) { trafGain = gain; traf.tg.gain.setTargetAtTime(gain, t, 0.25); }
      traf.t1.frequency.setTargetAtTime(52 + 30 * speed01, t, 0.3); traf.t2.frequency.setTargetAtTime(80 + 40 * speed01, t, 0.3);
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
