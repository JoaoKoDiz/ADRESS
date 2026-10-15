// História secundária no Nevasca (Nível 16): o encontro com o K no Grillby's (depois da 2ª conversa na igreja).
// Sentar diante dele (1ª pessoa) → diálogo 1 → olhar pela janela (nevasca, o vizinho chega ao poste) → diálogo 2 →
// controle livre em 1ª pessoa: pedir o casaco emprestado (mesa atrás) e sair. Sem casaco: volta ao jogo normal (dá para
// tentar de novo). Com casaco: resgate lá fora em 1ª pessoa com cronômetro vermelho de 2:00; entregar o casaco, trazer
// o vizinho apoiado até a porta → ele vai para a lareira → o jogador volta à mesa → diálogo 3 → aviso do jogo → salva
// (adress.grill.talk1) → fade 3 s → tela inicial (fade 1,5 s). Tempo esgotado: fade → tela inicial, nada salvo.
import * as THREE from 'three';
import { buildNPC } from './grillbyInside.js';
import { CHAR_MATS } from './models/driver.js';

export const GRILL_TALK_KEY = 'adress.grill.talk1';
const EYE = 1.6, FAR = { x: 1e6, z: 1e6 };

/** "[...]" vira pausa; **x** vira negrito. */
const L = s => {
  const out = [];
  for (const part of s.split(/(\[\.\.\.\]|\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    if (part === '[...]') out.push({ p: 0.65 });
    else if (part.startsWith('**')) out.push({ b: part.slice(2, -2) });
    else out.push(out.length && out[out.length - 1].p ? part.replace(/^\s+/, '') : part);   // (depois da pausa, sem espaço duplo)
  }
  return out;
};
const LINES1 = [
  'Você me encontrou de novo.',
  'Engraçado... [...] Parece que faz uns dois anos desde a última vez que nos vimos.',
  'Não faz tanto tempo assim. [...] Mas parece.',
  'É bom ter alguém do outro lado da mesa. [...] Principalmente numa noite como esta.',
  'Aqui dentro, o frio parece uma coisa distante.',
  'Temos a lareira, [...] alguma conversa, [...] um lugar para ficar.',
  'Lá fora, [...] cada passo deve exigir um pouco mais.',
  'Estava pensando nisso antes de você chegar.',
  'Em como um caminho pode continuar sendo o mesmo... [...] e, de repente, exigir uma coragem que antes não exigia.',
  '[...] Espere.',
  'Acho que há alguém lá fora.',
].map(L);
const LINES2 = [
  'Ele está tentando chegar até aqui.',
  'Deve estar usando a luz do poste para se orientar. [...] Mas mal consegue ficar de pé.',
  'Da janela, parece perto.',
  'Para quem está naquele frio, [...] talvez não pareça.',
  'Um casaco ajudaria. [...] Talvez alguém aqui possa emprestar um.',
  'Mas ele também precisa de alguém que caminhe com ele.',
  'Se decidir ir, [...] procure a luz.',
  'E, quando chegar até ele, [...] deixe que se apoie em você.',
].map(L);
const LINES3 = [
  'Ele está se aquecendo.',
  'Quando vocês entraram, [...] ele olhou para a lareira como se finalmente pudesse respirar.',
  'Obrigado por ter ido buscá-lo.',
  'Daqui, eu conseguia ver a luz do poste. [...] Quase nada do caminho entre vocês e a porta.',
  'Você precisou atravessar esse caminho.',
  'Primeiro sozinho. [...] Depois, com alguém dependendo dos seus passos.',
  'Não sei o que você sentiu lá fora.',
  'Talvez medo. [...] Talvez vontade de voltar. [...] Talvez só a preocupação de não chegar a tempo.',
  'Você pode ter sentido tudo isso [...] e ainda assim ter sido **bravo**.',
  'A **bravura** também cabe numa mão estendida. [...] Num passo difícil. [...] Na decisão de continuar quando alguém precisa de você.',
  'Você saiu sabendo onde queria chegar, [...] mas sem saber como seria a travessia.',
  'E, quando encontrou aquele homem, [...] aceitou que voltar seria ainda mais difícil.',
  'Agora ele está ali, [...] perto do fogo.',
  'É uma coisa pequena de se olhar. [...] Alguém sentado, se aquecendo.',
  'Mas foi você quem ajudou a tornar isso possível.',
  'Espero que se lembre desta noite.',
  'Principalmente se, algum dia, [...] o medo fizer você esquecer do que é capaz.',
  'Bom, [...] já está na hora de eu ir.',
  'Vou passar naquele lugar onde costumávamos conversar.',
  'Dessa vez, [...] ele está em outro lugar. Entre casas, ruas e pessoas seguindo suas próprias vidas.',
  'Você vai reconhecer. [...] A mesma entrada, as mesmas torres.',
  'Há uma pequena oficina logo ao lado. [...] Quero tentar fazer alguma coisa por lá.',
  'Se quiser conversar de novo, [...] procure por mim.',
  '**Estarei lá.**',
].map(L);
export const _LINES = { LINES1, LINES2, LINES3 };

const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
const lerpAng = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * k; };

/** Vento e neve (WebAudio, sem arquivo): ruído filtrado com rajadas. level/cutoff mudam suave (abafado dentro). */
function createStorm(audio) {
  let nodes = null, level = 0, cut = 600, cur = 0, curCut = 600, t = 0;
  function build() {
    const ac = audio.ctx; if (!ac) return null;
    const len = ac.sampleRate * 3, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { b = 0.985 * b + 0.15 * (Math.random() * 2 - 1); d[i] = b; }   // ruído "marrom" (vento)
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const hiss = ac.createBufferSource(), hb = ac.createBuffer(1, len, ac.sampleRate), hd = hb.getChannelData(0);
    for (let i = 0; i < len; i++) hd[i] = Math.random() * 2 - 1;                                            // chiado da neve
    hiss.buffer = hb; hiss.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 0.6;
    const hg = ac.createGain(); hg.gain.value = 0.05;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(lp); hiss.connect(hp); hp.connect(hg); hg.connect(lp); lp.connect(g); g.connect(audio.out);
    src.start(); hiss.start();
    return { src, hiss, lp, g, hg };
  }
  return {
    set(l, c) { level = l; cut = c; if (!nodes && l > 0) nodes = build(); },
    update(dt, paused) {
      if (!nodes) return;
      t += dt; const k = 1 - Math.exp(-dt * 1.2);
      cur += (level - cur) * k; curCut += (cut - curCut) * k;
      const gust = 0.72 + 0.2 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 1.9 + 1);
      try { nodes.g.gain.value = paused ? 0 : cur * gust * 1.6; nodes.lp.frequency.value = curCut * (0.8 + 0.3 * gust); nodes.hg.gain.value = 0.05 * (curCut / 2500); } catch (e) { /* */ }
    },
    stop() { if (!nodes) return; try { nodes.src.stop(); nodes.hiss.stop(); nodes.g.disconnect(); } catch (e) { /* */ } nodes = null; cur = 0; level = 0; },
  };
}

/** Ruído de bar cheio (WebAudio, sem arquivo): conversas sobrepostas e murmúrios ao fundo, sem frases. Uma cópia só. */
export function createCrowd(audio) {
  let N = null, want = 0, cur = 0, lvl = 1, t = 0;
  function build() {
    const ac = audio.ctx; if (!ac) return null;
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b0 = 0.997 * b0 + w * 0.03; b1 = 0.985 * b1 + w * 0.06; b2 = 0.9 * b2 + w * 0.15; d[i] = (b0 + b1 + b2) * 0.5; }   // ruído rosado
    for (let i = 0; i < 2000; i++) { const k = i / 2000; d[i] = d[i] * k + d[len - 2000 + i] * (1 - k); }   // emenda sem clique
    const out = ac.createGain(); out.gain.value = 0;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700; lp.connect(out); out.connect(audio.out);
    const voices = [320, 470, 610, 820, 1050, 1300].map((f, i) => {
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 5;
      const g = ac.createGain(); g.gain.value = 0; s.connect(bp); bp.connect(g); g.connect(lp); s.start(0, i * 0.61);
      return { s, bp, g, f, ph: i * 1.7, sp: 0.6 + i * 0.23 };
    });
    return { out, voices };
  }
  return {
    start() { want = 1; if (!N) N = build(); },
    stop() { want = 0; },
    /** Nível relativo (ex.: mais baixo durante as conversas com o K). */
    level(k) { lvl = k; },
    update(dt, mute) {
      if (!N) return;
      t += dt; cur += ((mute ? 0 : want * lvl) - cur) * (1 - Math.exp(-dt * 1.4));
      try {
        N.out.gain.value = cur * 0.55;
        for (const v of N.voices) {                                  // cada "voz" sobe e desce devagar (sílabas borradas, sem palavras)
          const a = 0.5 + 0.5 * Math.sin(t * v.sp + v.ph) * Math.sin(t * v.sp * 2.7 + v.ph * 2);
          v.g.gain.value = 0.25 + 0.75 * Math.max(0, a); v.bp.frequency.value = v.f * (1 + 0.08 * Math.sin(t * v.sp * 1.9 + v.ph));
        }
      } catch (e) { /* */ }
      if (!want && cur < 0.002) { try { N.voices.forEach(v => v.s.stop()); N.out.disconnect(); } catch (e) { /* */ } N = null; cur = 0; }
    },
    get on() { return !!N; },
  };
}

export function createGrillStory(ctx) {
  const { walker, rig, audio, talkBox, input, menu, grillMusic, crowd } = ctx;
  // olhar com o botão direito (também em 1ª pessoa): giro a partir dos olhos, com limite vertical
  let drag = null;
  const lookOn = () => S && !['look', 'sit', 'leaving', 'enter', 'fail', 'end'].includes(S.phase);
  addEventListener('mousedown', e => { if (e.button === 2 && lookOn()) drag = { x: e.clientX, y: e.clientY }; });
  addEventListener('mousemove', e => {
    if (!drag || !lookOn()) return;
    S.ly += (e.clientX - drag.x) * 0.0045; S.lp = Math.max(-1.15, Math.min(1.0, S.lp - (e.clientY - drag.y) * 0.0045));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  addEventListener('mouseup', e => { if (e.button === 2) drag = null; });
  addEventListener('contextmenu', e => { if (S) e.preventDefault(); });
  const HINT = { hint: 'E / Espaço — Continuar' };
  const view = (c, x, y, z, yaw, pitch) => lookFrom(c, x, y, z, yaw + S.ly, Math.max(-1.25, Math.min(1.1, pitch + S.lp)));
  const storm = createStorm(audio);
  // cronômetro do resgate (vermelho, separado do cronômetro da partida)
  const css = document.createElement('style');
  css.textContent = `.rescue-timer { position: absolute; left: 50%; top: 9%; transform: translateX(-50%); z-index: 44; display: none; pointer-events: none;
    padding: .15em .7em; border-radius: 12px; background: rgba(20,8,6,.55); color: #ff3b30; border: 3px solid #ff3b30;
    font: 900 clamp(30px, 4vw, 52px)/1.1 "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .06em; text-shadow: 0 2px 0 rgba(0,0,0,.5); }
    .rescue-timer.on { display: block; }`;
  document.head.appendChild(css);
  const timerEl = document.createElement('div'); timerEl.className = 'rescue-timer'; ctx.stage.appendChild(timerEl);
  const paintTimer = s => { s = Math.max(0, Math.ceil(s)); timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  let S = null;                         // tentativa em andamento
  const ST = () => ctx.grillIn.story;
  const available = () => ctx.flag('adress.church.talk2') && !ctx.flag(GRILL_TALK_KEY);
  const cam = () => ctx.grillIn.camera;
  const _v = new THREE.Vector3();
  function lookFrom(c, x, y, z, yaw, pitch = -0.05) {
    c.position.set(x, y, z);
    _v.set(x + Math.cos(yaw) * Math.cos(pitch), y + Math.sin(pitch), z + Math.sin(yaw) * Math.cos(pitch)); c.lookAt(_v);
  }
  const seatView = () => { const s = ST().seat, k = ST().kHead; return { x: s.x, y: s.y, z: s.z, yaw: Math.atan2(k.z - s.z, k.x - s.x), pitch: Math.atan2(k.y - s.y, Math.hypot(k.x - s.x, k.z - s.z)) }; };

  // ---------- lá fora: nevasca, escuro, poste, vizinho ----------
  let ext = null;
  function setupOutside() {
    const world = ctx.world, scene = world.scene, door = ctx.doorWorld(0.9), out = ctx.doorWorld(2.2);
    const saved = { fog: scene.fog, bg: scene.background, lights: [] };
    scene.traverse(o => { if (o.isLight) { saved.lights.push([o, o.intensity]); o.intensity *= 0.12; } });
    scene.fog = new THREE.Fog('#323c49', 1.0, 22); scene.background = new THREE.Color('#323c49');
    const grp = new THREE.Group(); scene.add(grp);
    // o poste: à esquerda de quem sai do Grillby's, do outro lado da rua (ponto livre, no mesmo nível, com caminho reto livre)
    const P = ctx.findPole(out);
    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.35, 'rgba(255,200,120,.45)'); r.addColorStop(1, 'rgba(255,180,90,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const glow = (x, y, z, s, col) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false })); sp.scale.setScalar(s); sp.position.set(x, y, z); grp.add(sp); return sp; };
    const y0 = ctx.groundH(P.x, P.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 4.6, 8), new THREE.MeshStandardMaterial({ color: '#20242a' })); pole.position.set(P.x, y0 + 2.3, P.z); grp.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff1c0', fog: false })); bulb.position.set(P.x, y0 + 4.5, P.z); grp.add(bulb);
    glow(P.x, y0 + 4.4, P.z, 7, '#ffd9a0');
    const pl = new THREE.PointLight('#ffd08a', 40, 15, 1.4); pl.position.set(P.x, y0 + 4.2, P.z); grp.add(pl);
    // porta do Grillby's: luz quente para achar o caminho de volta
    const dy = ctx.groundH(door.x, door.z);
    glow(door.x, dy + 2.6, door.z, 5, '#ffb070');
    const dl = new THREE.PointLight('#ffb060', 22, 10, 1.4); dl.position.set(door.x, dy + 2.4, door.z); grp.add(dl);
    // o vizinho (mesma roupa vista pela janela) junto ao poste
    const n = buildNPC(ST().look); n.root.position.set(P.x + 0.6, y0, P.z + 0.3); grp.add(n.root);
    // flocos em volta da câmera
    const N = 5000, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 34; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - 0.5) * 34; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#f2f6ff', size: 0.1, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    flakes.frustumCulled = false; grp.add(flakes);
    ext = { saved, grp, P, n, flakes, door, wind: Math.atan2(-Math.sin(out.heading), -Math.cos(out.heading)) + 0.7, ox: 0, oz: 0, t: 0 };
    walker.pose(out.x, out.z, out.heading); walker.setFloor(ctx.groundH(out.x, out.z)); walker.show(false);
  }
  function teardownOutside() {
    if (!ext) return;
    const scene = ctx.world.scene;
    for (const [o, i] of ext.saved.lights) o.intensity = i;
    scene.fog = ext.saved.fog; scene.background = ext.saved.bg;
    ext.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    scene.remove(ext.grp); ext = null;
  }

  // ---------- controle ----------
  function reset(full = true) {
    if (S) talkBox.hide();
    teardownOutside(); storm.stop(); timerEl.classList.remove('on'); arm = null; crowd.level(1);
    walker.setSpeedMul(1);
    if (ctx.grillIn) {
      const st = ST(); ctx.grillIn.setFP(false); st.coatOnChair.visible = false; st.guest.root.visible = false; st.resetWalker();
      st.k.visible = available();
    }
    try { grillMusic.setLevel(1, 0.5); } catch (e) { /* */ }
    ctx.prompt(null);
    S = null;
  }

  function start() {
    S = { phase: 'sit', t: 0, coat: false, timer: 120, escort: false, ly: 0, lp: 0 };
    crowd.level(0.35);
    ctx.prompt(null);
    talkBox.fadeBlack(1, 350, () => {
      ctx.grillIn.setFP(true); walker.show(false);
      const v = seatView(); S.yaw = v.yaw; S.pitch = v.pitch; lookFrom(cam(), v.x, v.y, v.z, v.yaw, v.pitch);
      talkBox.fadeBlack(0, 500);
      S.phase = 'pre1'; S.t = 0;
    });
    ctx.setState('gstory');
  }

  function toTitle(save) {
    if (save) { try { localStorage.setItem(GRILL_TALK_KEY, '1'); } catch (e) { /* */ } }
    talkBox.fadeBlack(1, save ? 3000 : 1500, () => {
      reset(); ctx.toTitle();
      talkBox.fadeBlack(0, 1500);
    });
  }

  function update(dt) {
    if (!S) return;
    S.t += dt;
    const paused = menu.isOpen || document.hidden;
    storm.update(dt, false);
    const c = cam();
    switch (S.phase) {
      case 'sit': break;                                             // (fade para sentar)
      case 'pre1':
        if (S.t > 0.9) { S.phase = 'talk1'; talkBox.show(LINES1, () => { S.phase = 'look'; S.t = 0; S.ly = 0; S.lp = 0; }, HINT); }
        break;
      case 'talk1': case 'talk2': case 'talk3': talkBox.update(dt); if (input.action()) talkBox.press(); break;   // só avança com E / Espaço
      case 'look': {                                                 // vira a cabeça para a janela (esquerda), observa, volta
        const v = seatView(), toWin = 0, TURN = 1.9, WATCH = 9.5;
        if (S.t < dt * 1.5) { ST().startWalker(); storm.set(0.32, 520); grillMusic.setLevel(0.25, 2.5); }
        const k = S.t < TURN ? ease(S.t / TURN) : S.t < TURN + WATCH ? 1 : 1 - ease((S.t - TURN - WATCH) / TURN);
        S.yaw = lerpAng(v.yaw, toWin, k); S.pitch = v.pitch * (1 - k) - 0.02 * k;
        lookFrom(c, v.x, v.y, v.z, S.yaw, S.pitch);
        if (S.t >= TURN * 2 + WATCH) { S.phase = 'talk2'; S.ly = 0; S.lp = 0; talkBox.show(LINES2, () => { S.phase = 'seated'; S.t = 0; crowd.level(0.7); }, HINT); }
        break;
      }
      case 'seated': {                                               // controle de volta: pode levantar quando quiser
        const v = seatView(); view(c, v.x, v.y, v.z, v.yaw, v.pitch);
        ctx.prompt('Levantar');
        if (S.t > 0.3 && input.action()) {
          const p = ST().kPoint; walker.pose(p.x, p.z - 1.2, Math.PI); S.phase = 'walkIn'; S.t = 0; S.ly = 0; S.lp = 0; ctx.prompt(null);
        }
        break;
      }
      case 'walkIn': {                                               // a pé dentro do salão, em 1ª pessoa
        walker.update(dt, input.axis(), 'car', ctx.grillIn.solids, FAR);
        view(c, walker.x, EYE, walker.z, walker.heading, -0.08);
        const st = ST(), near = p => Math.hypot(walker.x - p.x, walker.z - p.z) < 1.9;
        // qualquer cliente pode emprestar um casaco (menos o atendente e o K); depois de um, nada de pedir outro
        const lender = !S.coat && st.patrons.find(n => { n.root.getWorldPosition(_v); return Math.hypot(walker.x - _v.x, walker.z - _v.z) < 2.3; });
        const act = ctx.grillIn.nearDoor(walker.x, walker.z) ? 'Sair' : lender ? 'Pedir casaco emprestado' : near(st.kPoint) ? 'Sentar' : null;
        ctx.prompt(act);
        if (!act || S.t < 0.3 || !input.action()) break;
        S.t = 0;
        if (act === 'Pedir casaco emprestado') { S.coat = true; talkBox.warn(['Emprestaram um casaco para você.']); setTimeout(() => talkBox.warn(null), 2200); }
        else if (act === 'Sentar') { S.phase = 'seated'; ctx.prompt(null); }
        else if (!S.coat) {                                          // sair sem o casaco: o encontro fica para outra vez
          S.phase = 'leaving'; ctx.prompt(null);
          talkBox.fadeBlack(1, 700, () => { reset(); ctx.exitNormal(); talkBox.fadeBlack(0, 700); });
        } else {                                                     // com o casaco: o resgate
          S.phase = 'leaving'; ctx.prompt(null);
          talkBox.fadeBlack(1, 900, () => {
            ctx.goOutside(); setupOutside();
            storm.set(0.9, 2600); crowd.stop(); S.timer = 120; paintTimer(S.timer); timerEl.classList.add('on'); S.ly = 0; S.lp = 0;
            walker.setSpeedMul(0.42);
            S.phase = 'rescue'; S.t = 0;
            talkBox.fadeBlack(0, 900);
          });
        }
        break;
      }
      case 'rescue': {
        if (!paused) S.timer -= dt;
        paintTimer(S.timer);
        if (!paused) {
          walker.update(dt, input.axis(), 'car', ctx.walkSolids(), FAR);
          walker.setFloor(ctx.groundH(walker.x, walker.z));
        }
        const e = ext; e.t += dt;
        animateFlakes(dt);
        const n = e.n, f = { x: Math.cos(walker.heading), z: Math.sin(walker.heading) };
        if (!S.escort) {                                             // no poste: tenta ficar de pé, protege o rosto
          n.body.rotation.x = 0.22 + 0.05 * Math.sin(e.t * 2.1); n.body.rotation.z = 0.07 * Math.sin(e.t * 1.3);
          n.armR.rotation.set(-2.2, 0, 0.5); n.armL.rotation.set(-1.25, 0, -0.85); n.head.rotation.set(0.25, 0.2 * Math.sin(e.t * 0.6), 0);
          n.root.rotation.y = Math.atan2(walker.x - n.root.position.x, walker.z - n.root.position.z) * 0.0 + n.root.rotation.y;
          const d = Math.hypot(walker.x - n.root.position.x, walker.z - n.root.position.z);
          ctx.prompt(d < 2.4 ? 'Ajudar' : null);
          if (d < 2.4 && input.action()) { S.escort = true; n.wear(true); walker.setSpeedMul(0.3); ctx.prompt(null); }
        } else {                                                     // apoiado no jogador, do lado ESQUERDO (dá para ver olhando para a esquerda)
          const lf = { x: f.z, z: -f.x };
          n.root.position.set(walker.x + lf.x * 0.72 + f.x * 0.05, walker.floor, walker.z + lf.z * 0.72 + f.z * 0.05);   // preso ao lado: vira junto, sem atraso
          n.root.rotation.y = Math.atan2(f.x, f.z);
          const moved = S.lastP ? Math.hypot(walker.x - S.lastP.x, walker.z - S.lastP.z) : 0; S.lastP = { x: walker.x, z: walker.z };
          S.stepPh = (S.stepPh || 0) + moved / 0.34 * Math.PI;         // passos no ritmo do jogador (mais lento, juntos)
          const sw = Math.sin(S.stepPh) * 0.38 * Math.min(1, moved / (dt * 0.8 + 1e-6));
          if (n.legL) { n.legL.rotation.x = sw; n.legR.rotation.x = -sw; }
          n.body.rotation.set(0.14, 0, -0.16 + 0.03 * Math.sin(S.stepPh));   // inclinado para o jogador (à direita dele)
          n.armL.rotation.set(-0.1, 0, -1.72);                           // o braço do lado do jogador passa por cima do ombro dele
          n.armR.rotation.set(-2.1, 0, 0.5);                             // o outro protege o rosto
          n.head.rotation.set(0.32, -0.25, 0);
          supportArm(n);
          const dd = Math.hypot(walker.x - e.door.x, walker.z - e.door.z);
          if (dd < 2.6) {                                            // chegaram: o tempo para na hora
            timerEl.classList.remove('on'); S.phase = 'enter'; ctx.prompt(null);
            talkBox.fadeBlack(1, 900, () => {
              teardownOutside(); ctx.goInside(); storm.set(0.3, 520); walker.setSpeedMul(1);
              const st = ST(); ctx.grillIn.setFP(true); st.resetWalker(); crowd.start(); crowd.level(1);
              const d = ctx.grillIn.door; walker.pose(d.x, d.z - 0.4, -Math.PI / 2);   // controle de volta já: olhando para o salão
              S.phase = 'back'; S.t = 0; S.ly = 0; S.lp = 0; S.g = { x: d.x - 0.2, z: d.z - 2.0, ph: 0, seated: false };
              grillMusic.setLevel(0.3, 0.1); setTimeout(() => grillMusic.setLevel(1, 4), 600);
              talkBox.fadeBlack(0, 900);
            });
            break;
          }
        }
        if (S.timer <= 0) { S.phase = 'fail'; timerEl.classList.remove('on'); ctx.prompt(null); toTitle(false); }
        break;
      }
      case 'back': {                                                 // de volta lá dentro: anda livre; ele vai até a lareira; só o K responde
        walker.update(dt, input.axis(), 'car', ctx.grillIn.solids, FAR);
        view(c, walker.x, EYE, walker.z, walker.heading, -0.08);
        const st = ST(), G = st.guestWalk, g = S.g;
        if (!g.seated) {                                             // segue depressa até o banquinho perto do fogo e senta
          const tx = st.fire.x + 1.25, tz = st.fire.z, dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
          if (d > 0.15) {
            const sp = Math.min(d, 2.4 * dt); g.x += dx / d * sp; g.z += dz / d * sp; g.ph += sp / 0.42 * Math.PI;
            G.root.visible = true; G.root.position.set(g.x, 0, g.z); G.root.rotation.y = Math.atan2(dx, dz);
            const sw = Math.sin(g.ph) * 0.5; if (G.legL) { G.legL.rotation.x = sw; G.legR.rotation.x = -sw; }
            G.body.rotation.set(0.08, 0, 0); G.armL.rotation.set(-sw * 0.6, 0, -0.1); G.armR.rotation.set(sw * 0.6, 0, 0.1);
          } else { g.seated = true; G.root.visible = false; st.guest.root.visible = true; }
        }
        const nk = Math.hypot(walker.x - st.kPoint.x, walker.z - st.kPoint.z) < 1.9;
        ctx.prompt(nk ? 'Conversar' : null);                          // sem saída, sem outros pedidos: só o K
        if (nk && S.t > 0.4 && input.action()) {
          S.phase = 'sit3'; ctx.prompt(null);
          talkBox.fadeBlack(1, 350, () => {
            if (!g.seated) { g.seated = true; G.root.visible = false; st.guest.root.visible = true; }
            S.ly = 0; S.lp = 0; crowd.level(0.35); talkBox.fadeBlack(0, 450);
            S.phase = 'pre3'; S.t = 0;
          });
        }
        break;
      }
      case 'pre3':
        if (S.t > 0.7) { S.phase = 'talk3'; talkBox.show(LINES3, () => {
          S.phase = 'note';
          talkBox.note('AVISO DO JOGO', ['Use o ', { b: 'Modo Livre no Bairro 24' }, ', a qualquer momento, caso tenha interesse.'], () => { S.phase = 'end'; toTitle(true); });
        }, HINT); }
        break;
      case 'note': if (input.action()) talkBox.pressNote(); break;
      default: break;
    }
    if (S && ['pre1', 'talk1', 'talk2', 'pre3', 'talk3', 'note', 'sit3'].includes(S.phase) && (S.phase !== 'sit3' || S.ly === 0)) { const v = seatView(); view(c, v.x, v.y, v.z, v.yaw, v.pitch); }
  }
  let arm = null;
  function supportArm(n) {
    if (!ext) return;
    if (!arm) {
      arm = new THREE.Group();
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 1, 8), CHAR_MATS.shirt); up.position.y = 0.5; arm.userData.seg = up; arm.add(up);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), CHAR_MATS.skin); hand.position.y = 1; arm.add(hand);
    }
    if (arm.parent !== ext.grp) ext.grp.add(arm);
    const f = { x: Math.cos(walker.heading), z: Math.sin(walker.heading) }, lf = { x: f.z, z: -f.x }, y = walker.floor;
    const sh = new THREE.Vector3(walker.x + lf.x * 0.24 + f.x * 0.12, y + 1.22, walker.z + lf.z * 0.24 + f.z * 0.12);   // ombro esquerdo (abaixo dos olhos)
    const to = new THREE.Vector3(n.root.position.x - f.x * 0.12, y + 1.0, n.root.position.z - f.z * 0.12);          // as costas dele, na cintura
    const dir = to.clone().sub(sh), L = dir.length();
    arm.position.copy(sh); arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    arm.userData.seg.scale.y = L; arm.userData.seg.position.y = L / 2; arm.children[1].position.y = L;
  }
  function animateFlakes(dt) {
    const e = ext, p = e.flakes.geometry.attributes.position.array, wx = Math.cos(e.wind), wz = Math.sin(e.wind);
    e.flakes.position.set(walker.x, walker.floor, walker.z);
    for (let i = 0; i < p.length; i += 3) {
      p[i] += wx * dt * (10 + (i % 7)); p[i + 2] += wz * dt * (10 + (i % 7)); p[i + 1] -= dt * (2.5 + (i % 5) * 0.5);
      if (p[i + 1] < 0) p[i + 1] += 12;
      if (p[i] > 17) p[i] -= 34; else if (p[i] < -17) p[i] += 34;
      if (p[i + 2] > 17) p[i + 2] -= 34; else if (p[i + 2] < -17) p[i + 2] += 34;
    }
    e.flakes.geometry.attributes.position.needsUpdate = true;
  }
  /** Câmera em 1ª pessoa lá fora (depois do rig.update, que segue a van). */
  function camOut(c) {
    if (!S || S.phase !== 'rescue' && S.phase !== 'enter' && S.phase !== 'fail') return;
    const sway = ext ? 0.012 * Math.sin(ext.t * 1.3) : 0;
    view(c, walker.x, walker.floor + EYE, walker.z, walker.heading + sway, -0.04);
  }

  return {
    available, start, update, camOut, reset,
    get active() { return !!S; },
    get phase() { return S && S.phase; },
    get timer() { return S ? S.timer : null; },
    _set(o) { Object.assign(S, o); },
    get ext() { return ext; },
    get _S() { return S; },
  };
}
