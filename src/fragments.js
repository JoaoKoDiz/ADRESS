// Os oito fragmentos da batalha (R, M, C, S — duas passagens), sobre os MESMOS cenários dos níveis extras (memorySets.js).
// Cada um ocupa a janela da música que a batalha reservou (info.start..info.end) e anda pelo relógio dela (info.time()):
// são cenas sincronizadas, de falas curtas. O jogador está presente só como o círculo branco no chão (a presença dele na
// lembrança): tenta sustentar, recolhe, segura — sem poder mudar o que aconteceu. A 2ª passagem repete cenário,
// enquadramento, gestos de fora e sons; muda a resposta do K.
// 1ª passagem: 0–4,5 s alarme (a lembrança abre em rachaduras da cor), 4,5–6 estática, tema até 36 s, estática no fim.
// 2ª passagem (reprises sem alarme): estática curta (0–1,5 s), tema, estática no fim. O R2 nasce da imagem do caco azul.
import * as THREE from 'three';
import { reachArm, walkK } from './models/reader.js';
import { VOID, COL, line, createSfx, createMurmur, glassText, ease, clamp } from './storyKit.js';
import { buildFarewellSet, buildTableSet, buildStreetSet, buildWorkshopSet, makeMemoryK, memoryize, poseKSit, personReach, renderSetImage } from './memorySets.js';

const CR = 0.36, CSPD = 4.6;
const F = (s, p = 0) => line('f', s, p), Kl = (s, p = 0) => line('k', s, p);
const CODE = { azul: 'R', verde: 'M', laranja: 'C', roxo: 'S' };
const HEX = { R: COL.azul, M: COL.verde, C: COL.laranja, S: COL.roxo };
// falas: [tempo dentro do tema (s), fala] — curtas, com tempo de leitura (o tema tem ~30 s)
const LINES = {
  R1: [[3.6, F('Uma escolha certa.')], [10.8, F('É assim que você precisa chamar.')], [18.4, F('Para não ouvir quem ficou do outro lado.')]],
  M1: [[5.0, F('Explique melhor.')], [12.8, F('Você sempre consegue parecer melhor quando tem tempo.')], [21.0, F('Pena que eles já ouviram.')]],
  C1: [[6.0, F('Não deixe perceberem.')], [16.5, F('Você foi tão bom ensinando coragem.')]],
  S1: [[6.0, F('Mais um pouco.')], [15.0, F('Você ainda consegue perder mais alguma coisa.')]],
  R2: [[4.2, Kl('Eu fui embora.')], [9.0, Kl('Isso teve um custo.')], [14.6, Kl('O que foi bom aqui não deixou de ser.')], [20.8, Kl('E eu não preciso chamar minha escolha de perfeita para continuar.')]],
  M2: [[6.0, Kl('Eu quis que você tivesse um lugar.')], [10.0, Kl('Eu quis de verdade.')], [14.0, Kl('O que você fez depois também aconteceu.')], [18.4, Kl('Eu não vou apagar uma coisa para conseguir enxergar a outra.')], [23.6, Kl('E não vou continuar entregando tudo o que sou para me deixarem ficar.')]],
  C2: [[4.0, Kl('Estou com medo.')], [10.6, Kl('Você pode ficar comigo até eu atravessar?')]],
  S2: [[3.0, Kl('Eu queria que fosse aqui.')], [7.0, Kl('Eu queria muito.')], [11.0, Kl('Não vou fingir que perder isso não dói.')], [16.0, Kl('Mas não preciso terminar junto.')], [21.0, Kl('O sonho era meu.')], [25.0, Kl('Eu ainda estou aqui.')]],
};
// as frases comuns do K que a pessoa acolhida leva ao grupo (as mesmas do extra 2) e as respostas dele que se partem
const EXPOSE = ['Hoje eu não tenho cabeça pra isso.', 'Eu disse que vinha. Eu sei que disse.', 'Se alguém pudesse… deixa, eu resolvo.'];
const ANSWER = ['Não foi isso que eu quis dizer.', 'Eu estava cansado, só isso.', 'Deixa eu explicar direito…'];
const SPLIT = ['Explique.', 'Desculpa?', 'Conveniente.', 'Sempre isso.', 'De novo.', 'Cansado?'];
// enquadramento de cada lembrança (o mesmo nas duas passagens e nas fotos dos cacos)
const CAM = {
  R: { pos: [2.6, 2.3, 11.2], look: [-0.3, 1.55, 0.2], fov: 46 },
  M: { pos: [0.5, 4.3, 6.4], look: [0, 0.85, -0.3], fov: 48 },
  C: { pos: [-0.7, 2.7, 4.4], look: [0.3, 1.2, -5], fov: 50 },
  S: { pos: [2.7, 2.7, 6.6], look: [-0.4, 1.25, -0.4], fov: 48 },
};

export function createFragments(ctx) {
  const { input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID); scene.fog = new THREE.Fog(VOID, 18, 46);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#dfe2ec', '#141418', 0.85); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff4e6', 1.05); key.position.set(5, 10, 7); scene.add(key);
  const sfx = createSfx(audio), murmur = createMurmur(audio, 4);
  let mouse = false, simAct = false;
  addEventListener('pointerdown', e => { if (S && e.pointerType === 'mouse' && e.button === 0) mouse = true; });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouse = false; });
  addEventListener('blur', () => { mouse = false; });
  const act = () => mouse || simAct || input.held('Space');

  // ---- os cenários (os mesmos dos extras) ----
  const FW = buildFarewellSet(); scene.add(FW.g);
  const TB = buildTableSet(); scene.add(TB.g);
  const ST = buildStreetSet(); scene.add(ST.g);
  const WS = buildWorkshopSet(); scene.add(WS.g);
  const wsK = makeMemoryK(); WS.g.add(wsK); const wsKMem = memoryize(wsK, COL.roxo, { rim: 0.5, desat: 0.2 });
  const smallBlue = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: COL.azul, toneMapped: false })); smallBlue.scale.set(1, 0.45, 0.75); FW.g.add(smallBlue);
  const setG = { R: FW.g, M: TB.g, C: ST.g, S: WS.g };
  for (const g of Object.values(setG)) g.visible = false;
  FW.applyClip();

  // ---- o círculo (a presença do jogador na lembrança) ----
  const circle = new THREE.Group(); scene.add(circle);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(CR, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true }));
  disc.position.y = 0.035; circle.add(disc);
  const halo = new THREE.Mesh(new THREE.RingGeometry(CR + 0.06, CR + 0.18, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  halo.position.y = 0.036; circle.add(halo);
  const cLight = new THREE.PointLight('#ffffff', 0, 3.2, 1.6); cLight.position.y = 0.6; circle.add(cLight);
  const kept = [];                                           // frases recolhidas (giram em volta do círculo; não apagam nada)

  // ---- tela: rachaduras da cor no alarme e estática (por cima da cena, embaixo das falas) ----
  const ov = document.createElement('canvas'); ov.width = 480; ov.height = 270;
  ov.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:30;pointer-events:none;display:none;image-rendering:pixelated';
  document.body.appendChild(ov);
  const ox = ov.getContext('2d');
  let crackLines = null;
  function makeCracks(seed) {
    let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; const out = [];
    for (let i = 0; i < 9; i++) { let x = 240 + (r() - 0.5) * 60, y = 135 + (r() - 0.5) * 40; const a = r() * Math.PI * 2, pts = [[x, y]]; for (let k = 0; k < 7; k++) { x += Math.cos(a + (r() - 0.5) * 0.9) * (18 + r() * 22); y += Math.sin(a + (r() - 0.5) * 0.9) * (14 + r() * 18); pts.push([x, y]); } out.push(pts); }
    return out;
  }
  /** black: preto por cima (0..1); cracks: quanto das rachaduras já correu (0..1); noise: estática (0..1). */
  function drawOverlay(black, cracks, noise, color) {
    if (black < 0.003 && cracks < 0.003 && noise < 0.003) { ov.style.display = 'none'; return; }
    ov.style.display = 'block'; ox.clearRect(0, 0, 480, 270);
    if (black > 0) { ox.fillStyle = `rgba(0,0,0,${black.toFixed(3)})`; ox.fillRect(0, 0, 480, 270); }
    if (cracks > 0 && crackLines) {
      ox.strokeStyle = color; ox.lineWidth = 1.6; ox.globalAlpha = Math.min(1, cracks * 2) * (0.6 + 0.4 * Math.random());
      for (const pts of crackLines) { const n = Math.max(2, Math.round(pts.length * cracks)); ox.beginPath(); ox.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) ox.lineTo(pts[i][0], pts[i][1]); ox.stroke(); }
      ox.globalAlpha = 1;
    }
    if (noise > 0) {
      const img = ox.getImageData(0, 0, 480, 270), d = img.data, k = noise * 0.6, a = noise * 0.55 * 255;
      for (let i = 0; i < d.length; i += 4) { if (Math.random() > 0.5) continue; const v = Math.random() * 255; d[i] += (v - d[i]) * k; d[i + 1] += (v - d[i + 1]) * k; d[i + 2] += (v - d[i + 2]) * k; d[i + 3] = Math.max(d[i + 3], a); }
      ox.putImageData(img, 0, 0);
    }
  }

  let S = null;
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), occT = [new THREE.Vector3(), new THREE.Vector3()];
  const setCam = (c, drift = 0) => { camera.position.set(c.pos[0] + drift * 0.35, c.pos[1] - drift * 0.1, c.pos[2] - drift * 0.6); camera.lookAt(c.look[0], c.look[1], c.look[2]); if (Math.abs(camera.fov - c.fov) > 0.01) { camera.fov = c.fov; camera.updateProjectionMatrix(); } };
  const personOp = (p, a) => p.traverse(o => { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = a; o.material.depthWrite = a > 0.98; } });
  const restArms = K => K.userData.arms.forEach(a => { a.sh.quaternion.copy(a.rest); a.elbow.quaternion.copy(a.erest); });

  // ---------- montagem de cada lembrança (estado inicial, igual nas duas passagens) ----------
  function resetR() {
    const { K, R } = FW; FW.setOpen(FW.E);
    K.position.set(-0.75, 0, 0.3); K.rotation.y = 0; R.position.set(0.75, 0, 0.3); R.rotation.y = Math.PI; R.visible = true; personOp(R, 1);
    delete K.userData.gait; restArms(K);
    smallBlue.visible = false; smallBlue.position.set(0.75, 0.05, 0.3);
  }
  function resetM() {
    TB.reset(); murmur.setVoices(4);
    for (const id of ['M', 'A', 'B', 'N']) TB.people[id].rotation.y = TB.chairs[id].rotation.y;
    TB.seat('K', true); delete TB.K.userData.gait; restArms(TB.K);
    TB.chairs.K.traverse(o => { if (o.isMesh) { o.material.transparent = false; o.material.opacity = 1; } });
    if (S) { for (const m of S.msgs) { scene.remove(m.sp); m.sp.userData.dispose(); } S.msgs = []; }
  }
  function resetC() {
    ST.reset(); ST.K.position.set(0.3, 0, -1.6); ST.K.rotation.y = Math.PI / 2; delete ST.K.userData.gait; poseKSit(ST.K, 0); restArms(ST.K);
    ST.helper.visible = false; personOp(ST.helper, 0); ST.helper.position.set(1.6, 0, ST.postZ - 0.9); ST.helper.rotation.y = Math.PI / 2;
    ST.shelter.position.z = ST.shelterZ;
  }
  function resetS() {
    WS.reset(); WS.float(0, 1); WS.candle.userData.set(1); WS.candle.position.set(2.2, 0.98, -1.05);
    WS.tool.visible = true; WS.tool.position.set(-0.2, 0.98, -1.15); WS.tool.rotation.set(0, 0.4, 0);
    WS.book.visible = true; WS.book.position.set(-0.6, 1.0, -1.0); WS.book.rotation.set(0, 0.2, 0);
    WS.stone.position.set(2.7, 0, 1.0);
    wsK.position.set(-1.6, 0, 1.0); wsK.rotation.y = Math.PI / 2; delete wsK.userData.gait; poseKSit(wsK, 0); restArms(wsK);
  }
  const RESET = { R: resetR, M: resetM, C: resetC, S: resetS };

  // ---------- jogar um fragmento ----------
  function play(info, done) {
    stop();
    const code = CODE[info.color] || 'R', pass = info.pass || 1;
    S = { info, done, code, pass, t: 0, said: 0, T0: pass === 1 ? 6.0 : 1.5, msgs: [], c: { x: 0, z: 0 }, area: null, ev: {}, sag: 0, turns: 0 };
    for (const [k, g] of Object.entries(setG)) g.visible = k === code;
    RESET[code]();
    crackLines = makeCracks(code.charCodeAt(0) * 31 + pass);
    // onde o círculo pode ir (x0, x1, z0, z1) e onde começa
    const A = { R: [-2.8, 2.8, 3.5, 6.2, 0, 5.0], M: [-3.4, 3.4, -2.6, 2.9, 0.6, 2.4], C: [-2.0, 2.0, -26, 1.0, -0.9, 0.2], S: [-3.8, 3.8, -0.2, 3.6, 0.6, 2.8] }[code];
    S.area = A.slice(0, 4); S.c.x = A[4]; S.c.z = A[5];
    if (code === 'M') murmur.level(0.12);
    setCam(CAM[code]);
    sfx.play('whoosh', 0.25);
  }
  function stop() {
    if (!S) return;
    for (const m of S.msgs) { scene.remove(m.sp); m.sp.userData.dispose(); }
    for (const k of kept) { scene.remove(k.sp); k.sp.userData.dispose(); } kept.length = 0;
    murmur.level(0); murmur.stop(); sfx.wind(0);
    drawOverlay(0, 0, 0); if (talkBox.open) talkBox.hide();
    for (const g of Object.values(setG)) g.visible = false;
    S = null; mouse = false; simAct = false;
  }
  // círculo: WASD/joystick no chão (W = para longe da câmera)
  function moveCircle(dt) {
    const ax = input.axis(); let x = ax.x, z = ax.z; const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    const A = S.area;
    S.c.x = clamp(S.c.x + x * CSPD * dt, A[0], A[1]); S.c.z = clamp(S.c.z + z * CSPD * dt, A[2], A[3]);
  }

  function update(dt, paused) {
    if (!S || paused) return;
    const t = S.t = S.info.time() - S.info.start, code = S.code, pass = S.pass, b = t - S.T0, D = S.info.duration;
    const L = LINES[code + pass] || [];
    while (S.said < L.length && b >= L[S.said][0]) { const l = L[S.said++][1]; if (l.who === 'f') sfx.play('presence', 0.7); talkBox.show([l], null, { auto: true }); }
    if (talkBox.open) talkBox.update(dt);
    moveCircle(dt);
    const held = act();
    circle.position.set(S.c.x, 0, S.c.z); circle.visible = b > -0.5;
    halo.material.opacity += ((held ? 0.75 : 0.18) - halo.material.opacity) * Math.min(1, dt * 8); cLight.intensity = held ? 1.6 : 0.4;
    for (let i = 0; i < kept.length; i++) { const k = kept[i], a = t * 0.9 + i * 2.1; k.sp.position.set(S.c.x + Math.cos(a) * 0.62, 0.55 + 0.1 * Math.sin(t * 1.3 + i), S.c.z + Math.sin(a) * 0.62); }
    // entrada/saída: alarme (rachaduras) + estática; ou só estática curta
    let black = 0, cracks = 0, noise = 0;
    if (pass === 1) { black = t < 4.5 ? 1 : t < 6.0 ? 1 - ease((t - 4.5) / 1.5) : 0; cracks = t < 4.5 ? ease(t / 3.6) : t < 6 ? 1 - (t - 4.5) / 1.5 : 0; noise = t >= 4.4 && t < 6.0 ? 1 - (t - 4.4) / 1.6 : 0; }
    else { noise = t < 1.5 ? 1 - t / 1.5 : 0; black = S.info.afterInterlude ? 0 : (t < 0.6 ? 1 - t / 0.6 : 0); }
    const outT = D - t;                                                   // estática do fim e escuro
    if (outT < 1.6) { noise = Math.max(noise, 1 - outT / 1.6); black = Math.max(black, outT < 0.7 ? 1 - outT / 0.7 : 0); }
    drawOverlay(black, cracks, noise, HEX[code]);
    // a lembrança
    if (code === 'R') tickR(dt, b, pass, held);
    else if (code === 'M') tickM(dt, b, pass, held);
    else if (code === 'C') tickC(dt, b, pass, held);
    else tickS(dt, b, pass, held);
    murmur.update(dt);
    if (t >= D - 0.02 && !S.finished) { S.finished = true; const d = S.done; stop(); d && d(); }
  }

  // ---------- R: a despedida ----------
  // A R faz os mesmos movimentos e vai embora pelo fundo (some no limite do mundo dela). A moldura da frente se estreita.
  // R1: o K fica fazendo pequenos ajustes (meio passo, a mão que sobe e desce, o lugar de novo) e termina preso na fresta da
  //     moldura — sem poder voltar nem passar. R2: ele solta a moldura, recolhe o pedacinho azul que ficou e atravessa
  //     enquanto ainda há espaço (o jogador segura a passagem); a moldura fecha atrás dele, vazia.
  function tickR(dt, b, pass, held) {
    const { K, R } = FW; setCam(CAM.R, ease(clamp(b / 30, 0, 1)));
    // R: um último olhar, vira e vai embora pelo fundo (mesmos tempos nas duas passagens)
    if (b >= 3.2 && R.visible) {
      const u = clamp((b - 3.2) / 9.5, 0, 1); turnTo(R, Math.PI / 2, dt, 3);
      const prev = R.position.z; R.position.z = 0.3 - 4.6 * ease(u); R.position.x = 0.75 - 0.3 * u; personWalk(R, dt, Math.abs(R.position.z - prev));
      personOp(R, u > 0.85 ? 1 - (u - 0.85) / 0.15 : 1); if (u >= 1) R.visible = false;
    }
    // a moldura: começa a fechar em 8 s e fecha de qualquer jeito até 25 s (a lembrança não muda); o jogador segurando no vão
    // abre um pouco de folga, que vai sumindo perto do fim (resiste, não impede)
    const inGap = Math.abs(S.c.x) < FW.open / 2 + 0.3 && S.c.z < 4.4, prog = ease(clamp((b - 8) / 17, 0, 1));
    S.resist = clamp((S.resist || 0) + (held && inGap ? 0.5 : -0.35) * dt, 0, 0.9 * (1 - prog));
    const floor = pass === 1 ? 0.62 : 0, target = FW.E - (FW.E - floor) * prog + S.resist;
    FW.setOpen(Math.min(FW.open + dt * 0.8, Math.max(floor, target)));
    if (held && inGap && FW.open > 0.05) for (const { l, s } of FW.leaves) l.position.x += s * Math.sin(b * 20) * 0.004;
    if (pass === 1) {
      // ajustes: meio passo, a mão que sobe e desce, voltar ao lugar — cada vez diferente, cada vez mais perto da frente
      const cyc = b < 5 ? 0 : (b - 5) / 3.4, ph = cyc % 1, n = Math.floor(cyc);
      const base = _v.set(-0.75 + Math.sin(n * 1.7) * 0.35, 0, 0.3 + Math.min(2.4, n * 0.42));
      if (b > 22) base.set(0, 0, 3.0);                                     // por fim, preso na fresta da moldura
      const prev = K.position.clone(); K.position.lerp(base, Math.min(1, dt * (b > 22 ? 1.4 : 2)));
      walkK(K, dt, prev.distanceTo(K.position));
      const look = b < 3.2 ? Math.atan2(-(R.position.z - K.position.z), R.position.x - K.position.x) : Math.atan2(-(-4.3 - K.position.z), 0.45 - K.position.x);   // olha para onde ela foi
      turnTo(K, look + (b > 5 ? Math.sin(n * 2.3) * 0.25 : 0), dt, 3);
      const up = b > 5 ? Math.max(0, Math.sin(ph * Math.PI)) : 0;
      reachArm(K, 1, _w.set(K.position.x + 0.5, 0.9 + 0.55 * up, K.position.z - 0.5), up * 0.85);   // a mão sobe e desce, sem achar a posição
      if (b > 22) { reachArm(K, -1, _w.set(K.position.x - 0.4, 1.3, K.position.z + 0.1), 0.7); if (!S.ev.stuck) { S.ev.stuck = 1; sfx.play('creak', 0.6); } }
      K.userData.torso.rotation.z = -0.12;
    } else {
      // R2: a mão vai à moldura… e solta; olha o lugar dela; recolhe o pedacinho azul; atravessa sem carregar a porta
      if (b > 3.6 && !smallBlue.visible && !S.ev.picked) smallBlue.visible = true;
      if (smallBlue.visible && !S.ev.picked) smallBlue.rotation.y += dt * 1.4;
      const goal = _v.set(-0.75, 0, 0.3); let reachK = 0; const reachAt = _w.set(0, 1, 0);
      if (b < 5.5) { reachK = ease(clamp((b - 1.5) / 1.2, 0, 1)) * (1 - ease(clamp((b - 4.2) / 0.8, 0, 1))); reachAt.set(-1.2, 1.4, 1.2); }   // começa a segurar a moldura e solta
      else if (b < 12.5) { goal.set(0.55, 0, 0.62); if (b > 9.2) { reachK = ease(clamp((b - 9.2) / 1.0, 0, 1)); reachAt.copy(smallBlue.position); } if (b > 10.6 && !S.ev.picked) { S.ev.picked = 1; sfx.play('chime', 0.5); } }
      else goal.set(0.2, 0, 5.2);                                           // atravessa a passagem e sai para o lado de cá
      const prev = K.position.clone(); K.position.lerp(goal, Math.min(1, dt * (b < 12.5 ? 1.1 : 0.55)));
      walkK(K, dt, prev.distanceTo(K.position));
      const look = b < 3.2 ? Math.atan2(-(R.position.z - K.position.z), R.position.x - K.position.x) : b < 12.5 ? Math.atan2(-(0.3 - K.position.z) - 0.6, 0.75 - K.position.x) : Math.atan2(-(6 - K.position.z), 0.2 - K.position.x);
      turnTo(K, look, dt, 2.5);
      if (S.ev.picked) { const fx = Math.cos(K.rotation.y), fz = -Math.sin(K.rotation.y); smallBlue.position.set(K.position.x + 0.32 * fx, 0.95, K.position.z + 0.32 * fz); reachK = 0.55; reachAt.set(K.position.x + 0.4 * fx, 0.95, K.position.z + 0.4 * fz); }
      reachArm(K, 1, reachAt, reachK);
      K.userData.torso.rotation.z = b > 12.5 ? 0 : -0.05;
      if (!S.ev.through && K.position.z > FW.H) { S.ev.through = 1; sfx.play('step', 0.5); }
    }
  }

  // ---------- M: a cadeira retirada ----------
  // A pessoa acolhida leva frases comuns do K às outras; cada exposição vira uma cadeira para longe dele.
  // M1: o K responde a cada uma; cada resposta se parte em duas acusações; a cadeira dele se afasta enquanto ele explica.
  //     O jogador recolhe algumas frases com o círculo — elas ficam com ele, mas a exclusão acontece igual.
  // M2: mesma exposição, mesma cadeira afastada. O K começa a responder e para; olha a cadeira que trouxe; não a destrói nem
  //     a arranca de volta; vai embora sem perseguir o julgamento. A cadeira dele continua ausente.
  const EXP_T = [1.0, 9.0, 17.0];                                         // as três exposições (iguais nas duas passagens)
  function tickM(dt, b, pass, held) {
    setCam(CAM.M, ease(clamp(b / 30, 0, 1)) * 0.6);
    const ppl = TB.people;
    EXP_T.forEach((t0, i) => {
      const id = 'ev' + i;
      if (b >= t0 && !S.ev[id]) {                                          // a pessoa acolhida leva a frase até alguém do grupo
        S.ev[id] = 1; const to = ['A', 'B', 'M'][i];
        const sp = glassText(EXPOSE[i], { color: '#d7ffd9', size: 0.5 }); sp.position.copy(ppl.N.position).add(_v.set(0, 1.6, 0)); scene.add(sp);
        S.msgs.push({ sp, from: sp.position.clone(), to, t: 0, dur: 2.8, kind: 'expose', turned: false });
        personReach(ppl.N, 1, 1, 1.1); S.nReach = 1.2;
        sfx.play('tick', 0.5);
      }
    });
    S.nReach = Math.max(0, (S.nReach || 0) - dt); personReach(ppl.N, 1, Math.min(1, S.nReach), 1.1);
    // respostas do K (M1: cada uma se parte em duas; M2: a primeira começa e se desfaz)
    if (pass === 1) [4.0, 12.0, 20.0].forEach((t0, i) => { const id = 'ans' + i; if (b >= t0 && !S.ev[id]) { S.ev[id] = 1; const sp = glassText(ANSWER[i], { color: '#e8ffe9', size: 0.5 }); sp.position.copy(TB.K.position).add(_v.set(0, 2.05, 0)); scene.add(sp); S.msgs.push({ sp, t: 0, dur: 1.6, kind: 'answer', i }); if (i === 0) TB.seat('K', false); sfx.play('chair', 0.5); } });
    else if (b >= 4.0 && !S.ev.ans0) { S.ev.ans0 = 1; const sp = glassText('Não foi…', { color: '#e8ffe9', size: 0.5 }); sp.position.copy(TB.K.position).add(_v.set(0, 2.05, 0)); scene.add(sp); S.msgs.push({ sp, t: 0, dur: 1.4, kind: 'stop' }); TB.seat('K', false); }
    for (const m of S.msgs) {
      m.t += dt; const u = clamp(m.t / m.dur, 0, 1);
      if (m.kind === 'expose' || m.kind === 'shard') {
        const tp = ppl[m.to].position, tgt = _w.set(tp.x, 1.25, tp.z);
        m.sp.position.lerpVectors(m.from, tgt, ease(u)); m.sp.position.y += Math.sin(u * Math.PI) * 0.8;
        // o círculo encosta: a frase fica com o jogador (mas a cadeira vira do mesmo jeito)
        if (!m.kept && u > 0.15 && u < 0.9 && Math.hypot(m.sp.position.x - S.c.x, m.sp.position.z - S.c.z) < 0.8) { m.kept = true; m.sp.scale.multiplyScalar(0.5); kept.push({ sp: m.sp }); sfx.play('chime', 0.4); }
        if (u >= 1 && !m.turned) { m.turned = true; turnAway(m.to, m.kind === 'shard' ? 22 : 34); if (!m.kept) m.sp.material.opacity = 0; sfx.play('chair', 0.35); murmur.setVoices(Math.max(1, 4 - S.turns)); }
      } else if (m.kind === 'answer') {
        m.sp.position.y += dt * 0.2;
        if (u >= 1 && !m.split) {                                          // a resposta se parte em duas acusações
          m.split = true; m.sp.material.opacity = 0; sfx.play('crack', 0.5);
          const tos = [['B', 'M'], ['A', 'M'], ['A', 'B']][m.i];
          tos.forEach((to, j) => { const sp = glassText(SPLIT[(m.i * 2 + j) % 6], { color: '#cfffd2', size: 0.42 }); sp.position.copy(m.sp.position); scene.add(sp); S.msgs.push({ sp, from: sp.position.clone(), to, t: 0, dur: 1.8, kind: 'shard', turned: false }); });
          slideK(0.55);
        }
      } else if (m.kind === 'stop') {
        m.sp.material.opacity = Math.max(0, 1 - u * 1.4); m.sp.position.y += dt * 0.08;   // começa e se desfaz: ele para
      }
    }
    // o K
    const K = TB.K;
    if (pass === 1) {
      if (b > 4) { const c = TB.chairs.K.position; K.position.x += (c.x * 0.75 - K.position.x) * Math.min(1, dt); K.position.z += (c.z * 0.75 - K.position.z) * Math.min(1, dt); faceToward(K, 0, 0, dt); }   // em pé, explicando, enquanto a cadeira se afasta
      const talk = b > 4 && b < 26 ? Math.max(0, Math.sin(b * 3.1)) : 0;
      reachArm(K, 1, _w.set(K.position.x + 0.5, 1.35, K.position.z + 0.2), b > 4 ? 0.35 + 0.35 * talk : 0); reachArm(K, -1, _w.set(K.position.x - 0.1, 1.25, K.position.z + 0.5), b > 4 ? 0.2 + 0.3 * talk : 0);
    } else {
      if (b > 4 && b < 6) faceToward(K, 0, 0, dt);
      if (b >= 6 && b < 21) { const n = TB.chairs.N.position; faceToward(K, n.x, n.z, dt); }   // olha a cadeira que trouxe
      reachArm(K, 1, _w.set(K.position.x + 0.4, 1.1, K.position.z), b > 4 && b < 5 ? 0.4 : 0);
      if (b >= 21) {                                                         // vai embora sem perseguir o julgamento (para o lado do círculo)
        const goal = _v.set(-2.6, 0, 2.2), prev = K.position.clone(); K.position.lerp(goal, Math.min(1, dt * 0.45)); walkK(K, dt, prev.distanceTo(K.position));
        faceToward(K, goal.x, goal.z + 2, dt);
      }
      if (b > 8) TB.chairs.K.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = Math.max(0, o.material.opacity - dt * 0.25); } });   // a cadeira dele continua ausente
    }
    S.msgs = S.msgs.filter(m => { if ((m.turned || m.split || (m.kind === 'stop' && m.t > m.dur)) && !m.kept && m.t > m.dur + 0.4) { scene.remove(m.sp); m.sp.userData.dispose(); return false; } return true; });
  }
  function turnAway(id, deg) {
    S.turns++;
    const c = TB.chairs[id], p = TB.people[id], k = TB.K.position;
    const away = Math.atan2(-(c.position.z - k.z), c.position.x - k.x);
    let d = away - c.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    c.rotation.y += Math.sign(d) * Math.min(Math.abs(d), deg * Math.PI / 180); p.rotation.y = c.rotation.y;
  }
  function slideK(m) { const c = TB.chairs.K, d = c.position.clone().setY(0).normalize(); c.position.addScaledVector(d, m); }

  // ---------- C: a mão escondida ----------
  // C1: o K atravessa segurando a mão que treme atrás das costas; a mão oferecida no poste: ele desvia. Se o jogador põe o
  //     círculo no caminho, ele também desvia. Chega à luz sozinho, a mão escondida.
  // C2: mesmo frio, mesmo poste. Ele para e olha a mão que treme — não esconde. "Estou com medo." Aceita a mão oferecida:
  //     "Você pode ficar comigo até eu atravessar?". As placas à frente racham; o círculo do jogador as sustenta. Ele chega
  //     ao mesmo abrigo, ainda com medo, sem precisar esconder.
  function tickC(dt, b, pass, held) {
    const K = ST.K, gust = 0.5 + 0.5 * Math.sin(b * 0.7) * Math.sin(b * 1.9 + 1.3);
    ST.update(dt, K.position.x, K.position.z, gust); sfx.wind(0.12 + 0.1 * gust, 260);
    const camZ = K.position.z; camera.position.set(CAM.C.pos[0], CAM.C.pos[1], camZ + CAM.C.pos[2]); camera.lookAt(CAM.C.look[0], CAM.C.look[1], camZ + CAM.C.look[2]); if (camera.fov !== CAM.C.fov) { camera.fov = CAM.C.fov; camera.updateProjectionMatrix(); }
    S.area[2] = K.position.z - 7; S.area[3] = K.position.z + 1.6; S.c.z = clamp(S.c.z, S.area[2], S.area[3]);
    const goal = ST.shelter.position.z + 1.3;
    // velocidade: C1 curvado e apressado depois do poste; C2 para, olha a mão, e segue devagar, apoiado
    let v = pass === 1 ? (b < 9 ? 0.62 : 0.85) : (b < 2.6 ? 0.5 : b < 5.4 ? 0 : b < 9 ? 0.45 : b < 11.5 ? 0.6 : 1.05);
    const prevZ = K.position.z;
    let wantX = 0.3;
    if (pass === 1 && Math.abs(S.c.z - (K.position.z - 1.2)) < 1.4 && Math.abs(S.c.x - K.position.x) < 1.0) wantX = S.c.x > 0.3 ? -1.1 : 1.5;   // C1: desvia do círculo
    if (pass === 1 && Math.abs(K.position.z - ST.postZ) < 2.4) wantX = -0.9;                    // passa longe da mão oferecida
    K.position.x += (wantX - K.position.x) * Math.min(1, dt * 1.6);
    if (K.position.z > goal + 0.05) K.position.z = Math.max(goal, K.position.z - v * dt);
    walkK(K, dt, Math.abs(K.position.z - prevZ) + Math.abs(wantX - K.position.x) * dt);
    turnTo(K, Math.PI / 2, dt, 3);
    const kw = K.position, tr = 0.012, tremble = o => o.set(o.x + Math.sin(b * 41) * tr, o.y + Math.sin(b * 37 + 1) * tr, o.z);
    if (pass === 1) {
      reachArm(K, 1, tremble(new THREE.Vector3(kw.x + 0.12, 0.92, kw.z + 0.32)), 0.9);   // a mão atrás das costas
      K.userData.torso.rotation.z = -0.2 - 0.05 * gust;
    } else {
      const look = b > 2.6 && b < 6 ? 1 : 0;
      reachArm(K, 1, tremble(new THREE.Vector3(kw.x + 0.18, 1.0 + 0.12 * look, kw.z - 0.36)), 0.85);   // a mão na frente, à vista, tremendo
      K.userData.head.rotation.z = look ? -0.35 : K.userData.head.rotation.z * 0.95;
      K.userData.torso.rotation.z = b > 11.5 ? -0.06 : -0.14;
    }
    // a silhueta da ajuda, no poste
    const Hh = ST.helper;
    if (b > 5.5 && !Hh.visible) Hh.visible = true;
    if (Hh.visible) {
      personOp(Hh, Math.min(1, (b - 5.5) / 1.2) * (pass === 1 && b > 22 ? Math.max(0, 1 - (b - 22) / 2) : 1));
      if (pass === 1) { const past = K.position.z < ST.postZ - 1.6 ? Math.max(0, 1 - (ST.postZ - 1.6 - K.position.z) / 2.5) : 1; personReach(Hh, 1, ease(clamp((b - 6.5) / 0.8, 0, 1)) * past, 1.2); faceAt(Hh, K.position.x, K.position.z, dt); }
      else if (b < 10.6) { personReach(Hh, 1, ease(clamp((b - 6.5) / 0.8, 0, 1)), 1.2); faceAt(Hh, K.position.x, K.position.z, dt); }
      else {                                                                                 // vai junto, a mão no braço dele
        Hh.position.lerp(_v.set(K.position.x - 0.62, 0, K.position.z + 0.1), Math.min(1, dt * 2)); turnTo(Hh, Math.PI / 2, dt, 3);
        personWalk(Hh, dt, Math.abs(K.position.z - prevZ)); personReach(Hh, -1, 0.55, 1.0);
        reachArm(K, -1, _w.set(K.position.x - 0.45, 1.05, K.position.z + 0.05), 0.5);
      }
    }
    // placas: atrás de quem anda, desabam; no C2 as da frente racham e o círculo as sustenta
    for (const T of ST.tiles) {
      if (T.fall === 0 && K.position.z < T.z1 - 3.2 && S.c.z < T.z1 - 1) T.fall = 0.001;
      if (T.fall > 0 && T.fall < 1) ST.setTile(T.i, Math.min(1, T.fall + dt / 1.6));
      if (pass === 2 && T.fall === 0 && T.z0 < K.position.z - 0.5 && T.z0 > K.position.z - 4.5) {
        const under = S.c.z <= T.z0 && S.c.z >= T.z1, sag = under && held ? 0 : 0.06 * (0.5 + 0.5 * Math.sin(b * 9 + T.i));
        T.t.position.y = -sag; T.t.rotation.z = sag * 0.3;
      } else if (T.fall === 0) { T.t.position.y = 0; T.t.rotation.z = 0; }
    }
    if (K.position.z <= goal + 0.06 && !S.ev.arrive) { S.ev.arrive = 1; sfx.play('step', 0.5); }
    ST.setShelter(1);
  }

  // ---------- S: a última peça ----------
  // S1: a viga cede; o K a segura e tenta alcançar a ferramenta ao mesmo tempo; a vela diminui; a estrutura cede (sem ferimento);
  //     ele termina ajoelhado diante do que não conseguiu preservar. O círculo sob a viga a sustenta um pouco — a vela queima mais.
  // S2: mesma oficina, mesmo desabamento. Ele percebe que segurar não vai salvar tudo. O jogador pode segurar a viga um instante
  //     para ele chegar à bancada; ele pega a ferramenta pequena e o caderno, solta a estrutura e recua antes de ela cair; põe a
  //     vela (muito pequena) sobre a pedra firme. Nenhuma oficina nova.
  function tickS(dt, b, pass, held) {
    setCam(CAM.S, ease(clamp(b / 30, 0, 1)) * 0.5);
    if (pass === 2 && b > 17) {                                            // solta a estrutura: o olhar acompanha o K até a pedra firme
      const k = ease(clamp((b - 17) / 5, 0, 1)), L = CAM.S.look;           // (ele e a vela acima da caixa de fala, sem corte)
      camera.lookAt(L[0] + (1.6 - L[0]) * k, L[1] + (0.9 - L[1]) * k, L[2] + (1.0 - L[2]) * k);
    }
    WS.float(b, 1); WS.memory.flicker(b); WS.candle.userData.tick(dt); wsKMem.flicker(b);
    const K = wsK, tip = WS.beamTip(new THREE.Vector3()), cand = WS.candle.userData;
    const underBeam = Math.hypot(S.c.x - tip.x, S.c.z - tip.z) < 0.9;
    let sag = S.sag;
    if (b > 0.6) sag += dt * (pass === 1 ? 0.045 : 0.05) * (held && underBeam ? 0.3 : 1);
    if (held && underBeam && b > 0.6) { cand.set(Math.max(0.12, cand.k - dt * 0.035)); if (Math.floor(b * 2) !== S.burnTick) { S.burnTick = Math.floor(b * 2); sfx.play('burn', 0.35); } }
    if (b > 0) cand.set(Math.max(pass === 1 ? 0.14 : 0.2, cand.k - dt * (pass === 1 ? 0.026 : 0.022)));   // a vela vai diminuindo
    const holdPt = tip.clone().add(_v.set(0, -0.1, 0.25));
    if (pass === 1) {
      if (b < 22) {
        K.position.lerp(_v.set(tip.x - 0.1, 0, tip.z + 0.55), Math.min(1, dt * 2)); turnTo(K, Math.PI / 2, dt, 3);
        reachArm(K, -1, holdPt, b > 0 ? 0.95 : 0);                                           // segura a viga
        const reach = b > 3 ? 0.6 + 0.4 * Math.max(0, Math.sin(b * 1.3)) : 0;
        reachArm(K, 1, _w.set(K.position.x + 0.9 + 0.3 * reach, 1.05, K.position.z - 1.4), reach);   // estica para a ferramenta (longe demais)
        K.userData.torso.rotation.z = -0.18 - 0.06 * Math.sin(b * 1.3);
        sag = Math.min(sag, 0.55);
      } else {
        sag = Math.min(1, sag + dt * 0.8); if (!S.ev.fall) { S.ev.fall = 1; sfx.play('fall', 0.8); sfx.play('thud', 0.5); }
        const k = ease(clamp((b - 22.4) / 1.4, 0, 1));
        poseKSit(K, 0.62 * k, 0.12); reachArm(K, -1, holdPt, 0.95 * (1 - k)); reachArm(K, 1, _w.set(K.position.x + 0.3, 0.3, K.position.z - 0.5), 0.5 * k);   // ajoelhado
        K.userData.head.rotation.z = -0.45 * k;
      }
    } else {
      const goal = _v.set(tip.x - 0.1, 0, tip.z + 0.55); let holdK = b > 0 ? 0.95 : 0, reachR = 0;
      if (b < 8) { reachR = b > 3 ? 0.5 : 0; if (b > 5.5) K.userData.head.rotation.y = 0.5 * Math.sin((b - 5.5) * 1.2); }   // segura, olha a vela, olha a viga
      else if (b < 15) { holdK = b < 9.2 ? 1 - (b - 8) / 1.2 : 0; goal.set(-0.25, 0, -0.25); if (b > 11 && !S.ev.took) { S.ev.took = 1; sfx.play('place', 0.5); } reachR = b > 10 && b < 12 ? 0.9 : 0; K.userData.head.rotation.y *= 0.9; }
      else if (b < 18) { goal.set(0.6, 0, 1.4); holdK = 0; }                                  // solta a estrutura e recua antes de ela cair
      else if (b < 23) { goal.set(2.1, 0, 1.2); holdK = 0; reachR = b > 20 ? 0.8 : 0; if (b > 21.6 && !S.ev.base) { S.ev.base = 1; sfx.play('place', 0.6); } }   // a vela sobre a pedra firme
      else { goal.set(1.8, 0, 1.5); holdK = 0; }
      if (!(held && underBeam) && b > 9.2 && b < 15) sag += dt * 0.03;                        // sem o jogador a viga cede mais rápido (ele chega a tempo)
      if (b >= 15.5) { sag = Math.min(1, sag + dt * 0.9); if (!S.ev.fall) { S.ev.fall = 1; sfx.play('fall', 0.7); sfx.play('thud', 0.4); } }
      else sag = Math.min(sag, 0.62);
      const prev = K.position.clone(); K.position.lerp(goal, Math.min(1, dt * 1.6)); walkK(K, dt, prev.distanceTo(K.position));
      const face = b < 8 ? Math.PI / 2 : b < 15 ? Math.atan2(-(-1.1 - K.position.z), -0.3 - K.position.x) : Math.atan2(-(1.0 - K.position.z), 2.7 - K.position.x);
      turnTo(K, face, dt, 3);
      reachArm(K, -1, holdPt, holdK);
      if (S.ev.took) { WS.tool.position.copy(K.position).add(_w.set(-0.25, 0.95, 0.05)); WS.book.position.copy(K.position).add(_w.set(-0.2, 1.05, -0.1)); WS.tool.rotation.set(0, K.rotation.y, 0); }
      if (S.ev.base) WS.candle.position.set(2.7, 0.31, 1.0);
      else if (b > 19.5) { const fx = Math.cos(K.rotation.y), fz = -Math.sin(K.rotation.y); WS.candle.position.set(K.position.x + 0.3 * fx, 0.9, K.position.z + 0.3 * fz); }
      reachArm(K, 1, b < 15 ? _w.set(-0.2, 1.05, -1.1) : WS.candle.position, reachR);
      K.userData.torso.rotation.z = b < 8 ? -0.16 : b < 23 ? -0.05 : 0;
    }
    S.sag = sag; WS.setBeam(sag);
    WS.occlude(camera.position, [occT[0].set(K.position.x, 1.3, K.position.z), occT[1].copy(WS.candle.position)], dt);   // destroço na frente do K ou da vela fica translúcido
  }

  // ---------- auxiliares de pose ----------
  function turnTo(o, ang, dt, rate) { let d = ang - o.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rotation.y += d * Math.min(1, dt * rate); }
  function faceToward(o, x, z, dt) { turnTo(o, Math.atan2(-(z - o.position.z), x - o.position.x), dt, 3); }
  const faceAt = faceToward;
  function personWalk(p, dt, d) {
    const B = p.userData.B; if (!B || !B.legs) return; p.userData.wk = (p.userData.wk || 0) + d * 5.2; const s = Math.sin(p.userData.wk) * Math.min(1, d / Math.max(dt, 1e-3) / 0.5);
    B.legs.forEach((l, i) => { const q = s * (i ? -1 : 1); l.hip.rotation.z = q * 0.42; l.knee.rotation.z = -Math.max(0, -q) * 0.5; });
  }

  /** As 4 imagens das lembranças (cacos do interlúdio e imagens acusadoras do combate final): fotos do enquadramento de
   *  cada fragmento no estado inicial, tiradas uma vez. */
  let imgs = null;
  function images(renderer) {
    if (imgs || !renderer) return imgs;
    const wasS = S; S = S || { msgs: [] };
    const out = [];
    for (const code of ['R', 'M', 'C', 'S']) {
      for (const [k, g] of Object.entries(setG)) g.visible = k === code;
      RESET[code](); circle.visible = false;
      if (code === 'C') { ST.K.position.z = -4.2; ST.helper.visible = true; personOp(ST.helper, 1); ST.update(0.016, 0, -4, 0.5); camera.position.set(CAM.C.pos[0], CAM.C.pos[1], -4.2 + CAM.C.pos[2]); camera.lookAt(0, 1.2, -9.2); camera.fov = CAM.C.fov; camera.updateProjectionMatrix(); }
      else setCam(CAM[code]);
      if (code === 'S') WS.setBeam(0.3);
      out.push(renderSetImage(renderer, scene, camera).texture);
    }
    for (const g of Object.values(setG)) g.visible = false;
    S = wasS === null ? null : wasS; circle.visible = true;
    imgs = out; return imgs;
  }

  return {
    scene, camera, play, stop, update, images,
    get active() { return !!S && !!S.info; }, get fade() { return 0; },
    get joystick() { return !!(S && S.info); }, get actionLabel() { return S && S.info ? 'Sustentar' : null; },
    get code() { return S && S.info ? S.code + S.pass : ''; }, get t() { return S ? S.t : 0; },
    get circle() { return S ? { x: S.c.x, z: S.c.z } : null; }, _setCircle(x, z) { if (S) { S.c.x = x; S.c.z = z; } }, _act(on) { simAct = !!on; },
    get kept() { return kept.length; }, get ev() { return S ? Object.assign({}, S.ev) : {}; },
    get openW() { return FW.open; }, get kPos() { const K = S && S.info ? { R: FW.K, M: TB.K, C: ST.K, S: wsK }[S.code] : null; return K ? K.position.clone() : null; },
    get candle() { return WS.candle.userData.k; }, get sag() { return S ? S.sag || 0 : 0; },
  };
}
