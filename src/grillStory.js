// História secundária no Nevasca (Nível 16): o encontro com o K no Grillby's (depois da 2ª conversa na igreja).
// Sentar diante dele (1ª pessoa) → diálogo 1 → olhar pela janela (nevasca, o vizinho chega ao poste) → diálogo 2 →
// controle livre em 1ª pessoa: pedir o casaco emprestado (mesa atrás) e sair. Sem casaco: volta ao jogo normal (dá para
// tentar de novo). Com casaco: resgate lá fora em 1ª pessoa com cronômetro vermelho de 2:00; entregar o casaco, trazer
// o vizinho apoiado até a porta → ele vai para a lareira → o jogador volta à mesa → diálogo 3 → aviso do jogo → salva
// (adress.grill.talk1) → fade 3 s → tela inicial (fade 1,5 s). Tempo esgotado: fade → tela inicial, nada salvo.
import * as THREE from 'three';
import { buildNPC } from './grillbyInside.js';

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
  'Um casaco ajudaria. [...] Vi um pendurado na cadeira da mesa atrás de você. Talvez o dono possa emprestá-lo.',
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
  'Se quiser conversar de novo, [...] você sabe onde me encontrar.',
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

export function createGrillStory(ctx) {
  const { walker, rig, audio, talkBox, input, menu, grillMusic } = ctx;
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
    teardownOutside(); storm.stop(); timerEl.classList.remove('on');
    walker.setSpeedMul(1);
    if (ctx.grillIn) {
      const st = ST(); ctx.grillIn.setFP(false); st.coatOnChair.visible = true; st.guest.root.visible = false; st.resetWalker();
      st.k.visible = available();
    }
    try { grillMusic.setLevel(1, 0.5); } catch (e) { /* */ }
    ctx.prompt(null);
    S = null;
  }

  function start() {
    S = { phase: 'sit', t: 0, coat: false, timer: 120, escort: false };
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
        if (S.t > 0.9) { S.phase = 'talk1'; talkBox.show(LINES1, () => { S.phase = 'look'; S.t = 0; }, { auto: true }); }
        break;
      case 'talk1': case 'talk2': case 'talk3': talkBox.update(dt); break;
      case 'look': {                                                 // vira a cabeça para a janela (esquerda), observa, volta
        const v = seatView(), toWin = 0, TURN = 1.9, WATCH = 9.5;
        if (S.t < dt * 1.5) { ST().startWalker(); storm.set(0.32, 520); grillMusic.setLevel(0.25, 2.5); }
        const k = S.t < TURN ? ease(S.t / TURN) : S.t < TURN + WATCH ? 1 : 1 - ease((S.t - TURN - WATCH) / TURN);
        S.yaw = lerpAng(v.yaw, toWin, k); S.pitch = v.pitch * (1 - k) - 0.02 * k;
        lookFrom(c, v.x, v.y, v.z, S.yaw, S.pitch);
        if (S.t >= TURN * 2 + WATCH) { S.phase = 'talk2'; talkBox.show(LINES2, () => { S.phase = 'seated'; S.t = 0; }, { auto: true }); }
        break;
      }
      case 'seated': {                                               // controle de volta: pode levantar quando quiser
        const v = seatView(); lookFrom(c, v.x, v.y, v.z, v.yaw, v.pitch);
        ctx.prompt('Levantar');
        if (S.t > 0.3 && input.action()) {
          const p = ST().kPoint; walker.pose(p.x, p.z - 1.2, Math.PI); S.phase = 'walkIn'; S.t = 0; ctx.prompt(null);
        }
        break;
      }
      case 'walkIn': {                                               // a pé dentro do salão, em 1ª pessoa
        walker.update(dt, input.axis(), 'car', ctx.grillIn.solids, FAR);
        lookFrom(c, walker.x, EYE, walker.z, walker.heading, -0.08);
        const st = ST(), near = p => Math.hypot(walker.x - p.x, walker.z - p.z) < 1.9;
        const act = ctx.grillIn.nearDoor(walker.x, walker.z) ? 'Sair' : !S.coat && near(st.coatPoint) ? 'Pedir casaco emprestado' : near(st.kPoint) ? 'Sentar' : null;
        ctx.prompt(act);
        if (!act || S.t < 0.3 || !input.action()) break;
        S.t = 0;
        if (act === 'Pedir casaco emprestado') { S.coat = true; st.coatOnChair.visible = false; talkBox.warn(['Você pegou o casaco emprestado.']); setTimeout(() => talkBox.warn(null), 2200); }
        else if (act === 'Sentar') { S.phase = 'seated'; ctx.prompt(null); }
        else if (!S.coat) {                                          // sair sem o casaco: o encontro fica para outra vez
          S.phase = 'leaving'; ctx.prompt(null);
          talkBox.fadeBlack(1, 700, () => { reset(); ctx.exitNormal(); talkBox.fadeBlack(0, 700); });
        } else {                                                     // com o casaco: o resgate
          S.phase = 'leaving'; ctx.prompt(null);
          talkBox.fadeBlack(1, 900, () => {
            ctx.goOutside(); setupOutside();
            storm.set(0.9, 2600); S.timer = 120; paintTimer(S.timer); timerEl.classList.add('on');
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
        } else {                                                     // apoiado no braço: do lado direito, um passo atrás
          const r = { x: -f.z, z: f.x }, tx = walker.x + r.x * 0.85 - f.x * 0.25, tz = walker.z + r.z * 0.85 - f.z * 0.25;
          const k = 1 - Math.exp(-dt * 10);
          n.root.position.x += (tx - n.root.position.x) * k; n.root.position.z += (tz - n.root.position.z) * k;
          n.root.position.y = walker.floor;
          n.root.rotation.y = Math.atan2(f.x, f.z);
          n.body.rotation.set(0.18, 0, 0.05 * Math.sin(e.t * 3.2) - 0.08);   // inclinado para o jogador
          n.armL.rotation.set(-0.35, 0, -1.25);                          // braço apoiado no ombro do jogador (do lado esquerdo dele)
          n.armR.rotation.set(-2.0, 0, 0.45);
          n.head.rotation.set(0.3, 0.15, 0);
          const dd = Math.hypot(walker.x - e.door.x, walker.z - e.door.z);
          if (dd < 2.6) {                                            // chegaram: o tempo para na hora
            timerEl.classList.remove('on'); S.phase = 'enter'; ctx.prompt(null);
            talkBox.fadeBlack(1, 900, () => {
              teardownOutside(); ctx.goInside(); storm.set(0.3, 520); walker.setSpeedMul(1);
              const st = ST(); ctx.grillIn.setFP(true); st.resetWalker();
              S.phase = 'return'; S.t = 0; S.guest = { t: 0 };
              grillMusic.setLevel(0.3, 0.1); setTimeout(() => grillMusic.setLevel(1, 4), 600);
              talkBox.fadeBlack(0, 900);
            });
            break;
          }
        }
        if (S.timer <= 0) { S.phase = 'fail'; timerEl.classList.remove('on'); ctx.prompt(null); toTitle(false); }
        break;
      }
      case 'return': {                                               // ele vai para a lareira; o jogador volta à mesa
        const st = ST(), G = st.guestWalk, T1 = 2.6, door = ctx.grillIn.door;
        if (S.t < T1) {
          const k = ease(S.t / T1); G.root.visible = true;
          const ax = door.x - 0.8, az = door.z - 0.6, bx = st.fire.x + 1.0, bz = st.fire.z;
          G.root.position.set(ax + (bx - ax) * k, 0, az + (bz - az) * k); G.root.rotation.y = Math.atan2(bx - ax, bz - az);
          G.body.rotation.set(0.05, 0, 0.05 * Math.sin(S.t * 9));
        } else if (G.root.visible) { G.root.visible = false; st.guest.root.visible = true; }
        // câmera: da porta, pelo corredor, até o assento diante do K
        const v = seatView(), pts = [[door.x, door.z - 0.4], [3.5, 6.6], [8.0, v.z], [v.x, v.z]], DUR = 4.2;
        const k = ease(Math.min(1, S.t / DUR)), segs = pts.length - 1, u = k * segs, i = Math.min(segs - 1, Math.floor(u)), w = u - i;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * w, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * w;
        const along = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
        const yaw = S.t < DUR - 1.2 ? along : lerpAng(along, v.yaw, ease((S.t - (DUR - 1.2)) / 1.2));
        const y = S.t < DUR ? EYE - 0.1 * Math.max(0, (S.t - (DUR - 1)) / 1) : v.y;
        lookFrom(c, x, y, z, S.t < DUR ? yaw : v.yaw, S.t < DUR ? -0.06 : v.pitch);
        if (S.t > DUR + 0.8) { S.phase = 'talk3'; talkBox.show(LINES3, () => {
          S.phase = 'note';
          talkBox.note('AVISO DO JOGO', ['Use o ', { b: 'Modo Livre' }, ' no ', { b: 'Bairro 1' }, ', a qualquer momento, caso tenha interesse.'], () => { S.phase = 'end'; toTitle(true); });
        }, { auto: true }); }
        break;
      }
      case 'note': if (input.action()) talkBox.pressNote(); break;
      default: break;
    }
    if (S && (S.phase === 'talk3' || S.phase === 'note')) { const v = seatView(); lookFrom(c, v.x, v.y, v.z, v.yaw, v.pitch); }
    if (S && (S.phase === 'pre1' || S.phase === 'talk1' || S.phase === 'talk2')) { const v = seatView(); if (S.phase !== 'look') lookFrom(c, v.x, v.y, v.z, v.yaw, v.pitch); }
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
    lookFrom(c, walker.x, walker.floor + EYE, walker.z, walker.heading + sway, -0.04);
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
