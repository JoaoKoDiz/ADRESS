// Epílogo da história: depois da conversa com a figura, o K pergunta "Você vem?" e os dois andam juntos para longe dela
// (o K espera se o jogador parar; sem cronômetro). A voz da figura some com a distância. A grade perde linhas, a luz suaviza,
// o vazio ganha profundidade e as quatro cores aparecem de leve. Surge um pedaço real: o bairro medieval de manhã, depois da
// chuva. O K põe a ferramenta e o caderno numa bancada provisória; um ajuste falha uma vez e é refeito, com o jogador
// segurando a tábua. O K senta; há um lugar para o jogador. Conversa final (avanço manual), alguns segundos de silêncio,
// o K escreve no caderno e o fecha; o jogador sai; o K fica. Fade → ctx.onDone().
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { walkK, reachArm, buildPewReader } from './models/reader.js';
import { VOID, COL, HINT, line, makeFigure, makeK, makeBench, makePiece, makeGridFloor, makeWhitePlayer, prompt, whisper, createChase, shotTo, createSfx, faceTo, ease, clamp } from './storyKit.js';

const FAR_VAN = { x: 1e9, z: 1e9 };
const AREA = new THREE.Vector3(0, 0, 64);                // o pedaço real
const BENCH = new THREE.Vector3(0, 0, 63);
const EXIT = new THREE.Vector3(6.2, 0, 67.5);
const ECHO = ['Você não terminou.', 'Ainda falta.', 'Eles ainda podem rejeitar você.', 'Explique melhor.', 'Você ainda pode falhar.', 'Não deixe perceberem.', 'Continue pagando.', 'Então vai deixar tudo assim?'];
const K_ = (s, p = 0, g = null) => { const l = line('k', s, p); if (g) l.g = g; return l; };
const FINAL = [
  K_('Eu achei que, se encontrasse a resposta certa, tudo ia se organizar.'), K_('Uma resposta para o que perdi.'), K_('Outra para o que fizeram.'),
  K_('Outra para o que eu não consegui fazer.'), K_('E talvez uma que explicasse por que eu precisava continuar.'), K_('Mas eu estava fazendo outra coisa.'),
  K_('Estava procurando uma maneira de nunca mais poderem dizer nada contra mim.'), K_('Não existe essa maneira.', 1.4),
  K_('Eu posso ter feito o bem e ter gostado que alguém percebesse.'), K_('Posso ter escolhido partir e ainda sentir falta.'), K_('Posso ter medo.'), K_('Posso precisar parar.'),
  K_('Isso não torna tudo mentira.'), K_('Você não trouxe de volta o que eu perdi.', 0.8, 'player'), K_('Também não prometeu.'),
  K_('Mas ficou quando eu já não conseguia fazer muita coisa além de escutar aquilo.'), K_('E, por um tempo, eu precisei que alguém guardasse uma possibilidade que eu não estava enxergando.'),
  K_('Até eu conseguir fazer alguma coisa com ela.'), K_('Não sei o que vai ser daqui.', 0.8, 'bench'), K_('Talvez uma oficina.'), K_('Talvez uma menor do que imaginei.'), K_('Talvez eu mude de ideia.'),
  K_('Hoje, eu só sei o que quero fazer amanhã.'), K_('Você não precisa ficar para garantir que eu consiga.', 0, 'player'), K_('Eu gostaria que ficasse mais um pouco.'), K_('Mas gostaria.'),
  K_('É diferente de precisar que você nunca vá embora.'),
];

export function createEpilogue(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); const bg = new THREE.Color(VOID); scene.background = bg;
  scene.fog = new THREE.Fog(VOID, 30, 120);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
  const hemi = new THREE.HemisphereLight('#e2e0ea', '#141418', 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d8', 0.6); sun.position.set(-20, 14, 90); scene.add(sun);
  const sfx = createSfx(audio);
  const grid = makeGridFloor(14, 18); scene.add(grid);
  const fig = makeFigure(1); fig.position.set(0, 0, -11); fig.rotation.y = -Math.PI / 2; scene.add(fig);
  const K = makeK(); scene.add(K);
  const tool = makePiece('tool'), book = makePiece('notebook');
  const KS = buildPewReader(0.64); KS.traverse(o => { if (o.isMesh) o.castShadow = false; }); scene.add(KS);
  const seated = makeWhitePlayer(); scene.add(seated);
  { const B = seated.userData.B; B.legs.forEach(l => { l.hip.rotation.z = Math.PI / 2; l.knee.rotation.z = -Math.PI / 2; }); B.pelvis.position.y = 0.64 + 0.15; B.arms.forEach(a => { a.sh.rotation.z = 0.5; a.elbow.rotation.z = 0.9; }); }
  // as quatro cores, de leve, ao longe
  const glints = new THREE.Group(); scene.add(glints);
  const gTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  [['azul', -14, 30], ['verde', 16, 38], ['laranja', -18, 48], ['roxo', 15, 56]].forEach(([c, x, z]) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: COL[c], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.position.set(x, 3 + Math.random() * 3, z); s.scale.setScalar(2.4); glints.add(s); });
  // o pedaço real: largo de pedra molhada no bairro medieval, de manhã, depois da chuva
  const area = new THREE.Group(); area.position.copy(AREA); scene.add(area);
  const areaMats = [];
  const am = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, transparent: true, opacity: 0 }, o)); areaMats.push(m); return m; };
  const cob = am('#5d5a55', { roughness: 0.32, metalness: 0.08 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(11, 48).rotateX(-Math.PI / 2), cob); ground.position.y = 0.005; area.add(ground);
  const stoneM = am('#77736c', { roughness: 0.4 });
  const stones = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), stoneM, 420); let si = 0; const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
  for (let r = 0.6; r < 10.6 && si < 420; r += 0.36) for (let a = 0; a < Math.PI * 2 && si < 420; a += 0.36 / r * (1.4 + Math.random() * 0.5)) {
    if (Math.random() < 0.35) continue; _q.setFromEuler(new THREE.Euler(0, a + Math.random() * 0.3, 0)); _s.set(0.8 + Math.random() * 0.5, 1, 0.8 + Math.random() * 0.4);
    stones.setMatrixAt(si++, _m.compose(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r), _q, _s)); }
  stones.count = si; area.add(stones);
  const puddleM = am('#9fb3c6', { roughness: 0.05, metalness: 0.6 });
  for (const [x, z, r] of [[-3, -2, 0.9], [2.4, 2.6, 0.6], [-1.2, 3.4, 0.5], [4.2, -1.4, 0.7]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), puddleM); p.position.set(x, 0.03, z); p.scale.z = 0.7; area.add(p); }
  const wallM = am('#8b857a', { roughness: 0.9 });
  for (let i = -6; i <= 6; i++) { if (i === 5) continue; const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9 + (i % 2) * 0.15, 0.5), wallM); const a = i * 0.13; b.position.set(Math.sin(a) * 6.5, 0.45, 3.6 + (1 - Math.cos(a)) * 2); b.rotation.y = -a; area.add(b); }
  const plaster = am('#d8cbb2'), timber = am('#4e3826'), roofM = am('#7a4434');
  for (const [x, z, w] of [[-5.5, 8.5, 4], [1, 9.5, 5], [6.5, 8, 3.6]]) {
    const h = new THREE.Group(); h.position.set(x, 0, z); area.add(h);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, 3.6, 3), plaster); body.position.y = 1.8; h.add(body);
    for (let k = -1; k <= 1; k++) { const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.6, 0.05), timber); beam.position.set(k * w / 3, 1.8, -1.52); h.add(beam); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 1.8, 4, 1), roofM); roof.position.y = 4.5; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.62; h.add(roof);
  }
  const trunkM = am('#5a4632'), leafM = am('#6f9a52', { roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.4, 10), trunkM); trunk.position.set(-4, 1.2, 2); area.add(trunk);
  for (const [x, y, z, r] of [[-4, 2.9, 2, 1.1], [-3.5, 2.6, 2.4, 0.8], [-4.5, 2.5, 1.6, 0.8]]) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafM); l.position.set(x, y, z); area.add(l); }
  // gotas pingando do beiral (depois da chuva)
  const DR = 40, dp = new Float32Array(DR * 3); for (let i = 0; i < DR; i++) { dp[i * 3] = -6 + Math.random() * 13; dp[i * 3 + 1] = Math.random() * 3.4; dp[i * 3 + 2] = 6.6 + Math.random() * 2; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#d8e6f4', size: 0.05, transparent: true, opacity: 0, depthWrite: false })); area.add(drops);
  const bench = makeBench(true); bench.position.copy(BENCH); scene.add(bench);
  bench.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; areaMats.push(o.material); } });
  const plank = bench.children[bench.children.length - 1];          // a tábua de trás, desalinhada (o ajuste)
  const exitGlow = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  exitGlow.position.copy(EXIT).setY(0.04); scene.add(exitGlow);

  const chase = createChase(camera, walker, () => !!S && (S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold'));
  let S = null;
  const K_HOLD = () => { const a = K.userData.arms; const r = a.find(x => x.s === 1), l = a.find(x => x.s === -1);
    if (tool.parent !== r.wrist) { tool.position.set(0, -0.12, 0); tool.rotation.set(0, 0, 0); r.wrist.add(tool); }
    if (book.parent !== l.wrist) { book.position.set(0, -0.12, 0); book.rotation.set(0, 0, 0); l.wrist.add(book); } };

  function start(from) {                                  // from: { player: {x, z}, k: {x, z} } (onde estavam no fim da batalha)
    scene.add(walker.object); walker.setFloor(0); walker.show(true);
    const pp = from && from.player || { x: -1, z: 8.4 }; walker.pose(pp.x, pp.z, Math.PI / 2);   // (de costas para a figura, de frente para o caminho)
    S = { phase: 'walk', t: 0, fade: 0, white: whitenFade(walker.object), prog: 0, echo: 0, echoT: 0, wait: false, hold: 0, tries: 0, talkIdx: -1, music: false };
    S.white.step(1);
    delete K.userData.gait; K.visible = true; KS.visible = false; seated.visible = false;
    const kp = from && from.k || { x: 0.7, z: 2.6 }; K.position.set(kp.x, 0, kp.z); K.rotation.y = -Math.PI / 2;   // virado para longe da figura
    K_HOLD();
    plank.rotation.y = 0.16; plank.position.x = 0.12;
    for (const m of areaMats) m.opacity = 0; drops.material.opacity = 0; exitGlow.material.opacity = 0;
    glints.children.forEach(g => { g.material.opacity = 0; });
    bg.set(VOID); scene.fog.color.set(VOID); grid.userData.mat.uniforms.uFade.value = 1; grid.visible = true; fig.visible = true;
    chase.reset(); chase.C.yaw = Math.PI / 2; chase.update(0, true);
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    walker.setSpeedMul(1); prompt(null); whisper(null); sfx.stop(); if (talkBox.open) talkBox.hide();
    S = null;
  }
  const go = p => { S.phase = p; S.t = 0; };
  const VOIDC = new THREE.Color(VOID), DAWN = new THREE.Color('#33405a'), MORN = new THREE.Color('#c3d0dc');

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    const free = S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave';
    const solids = S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' ? [{ x0: BENCH.x - 1.2, x1: BENCH.x + 1.2, z0: BENCH.z - 0.4, z1: BENCH.z + 0.4 }] : [];
    walker.update(dt, free ? input.axis() : { x: 0, z: 0 }, 'car', solids, FAR_VAN);
    if (talkBox.open) { talkBox.update(dt); if (t > 0.2 && input.action() && S.phase === 'talk') talkBox.press(); }
    // progresso da passagem: pela distância andada para longe da figura
    S.prog = Math.max(S.prog, clamp((walker.z - 12) / 44, 0, 1));
    const p = S.prog;
    grid.userData.mat.uniforms.uFade.value = 1 - ease(clamp(p / 0.6, 0, 1));
    grid.visible = p < 0.62;
    const c = p < 0.55 ? VOIDC.clone().lerp(DAWN, ease(p / 0.55)) : DAWN.clone().lerp(MORN, ease((p - 0.55) / 0.45));
    bg.copy(c); scene.fog.color.copy(c); scene.fog.near = 20 + 40 * p; scene.fog.far = 90 + 120 * p;
    hemi.intensity = 0.9 + 0.5 * p; sun.intensity = 0.6 + 1.6 * ease(clamp((p - 0.5) / 0.5, 0, 1));
    glints.children.forEach((g, i) => { g.material.opacity = 0.5 * ease(clamp((p - 0.15 - i * 0.08) / 0.25, 0, 1)) * (1 - ease(clamp((p - 0.8) / 0.2, 0, 1)) * 0.6); g.position.y += Math.sin(t * 0.7 + i) * 0.003; });
    fig.userData.mat.opacity = 1 - ease(clamp((p - 0.1) / 0.5, 0, 1)); fig.visible = fig.userData.mat.opacity > 0.01;
    const areaK = ease(clamp((p - 0.62) / 0.3, 0, 1));
    for (const m of areaMats) m.opacity = areaK; for (const m of areaMats) m.transparent = areaK < 0.999; drops.material.opacity = 0.7 * areaK;
    const dpos = dGeo.attributes.position; for (let i = 0; i < DR; i++) { let y = dpos.getY(i) - dt * 4; if (y < 0) y = 3.4; dpos.setY(i, y); } dpos.needsUpdate = true;
    if (areaK > 0.2 && !S.music) { S.music = true; ctx.onArea && ctx.onArea(); }
    // a voz da figura: ecos que somem com a distância
    const fd = Math.hypot(walker.x - fig.position.x, walker.z - fig.position.z);
    S.echoT -= dt; if (S.echoT <= 0) { S.echoT = 3.4; S.echo = (S.echo + 1) % ECHO.length; }
    whisper(S.phase === 'walk' ? ECHO[S.echo] : null, clamp(1 - (fd - 22) / 26, 0, 1) * 0.9);

    switch (S.phase) {
      case 'walk': {                                       // o K vai na frente; se o jogador parar ou ficar para trás, ele espera
        chase.update(dt);
        const ahead = K.position.z - walker.z, gap = Math.hypot(walker.x - K.position.x, walker.z - K.position.z);   // ele vai na frente; se o jogador para, ele espera
        if (ahead > 2.5 && gap > 5.2) S.wait = true; else if (gap < 3.4 || ahead < 1) S.wait = false;
        const kSpeed = ahead < 0 ? 3.0 : 1.35;                // (atrás do jogador: alcança)
        const goal = new THREE.Vector3(BENCH.x - 1.6, 0, BENCH.z - 1.4);
        const dx = goal.x - K.position.x, dz = goal.z - K.position.z, d = Math.hypot(dx, dz);
        if (!S.wait && d > 0.05 && K.position.z < walker.z + 3.5) { const st = Math.min(d, kSpeed * dt); K.position.x += dx / d * st; K.position.z += dz / d * st; faceTo(K, goal.x, goal.z, dt, 4); walkK(K, dt, st); }
        else { walkK(K, dt, 0); if (S.wait) faceTo(K, walker.x, walker.z, dt, 2.5); }
        if (d < 0.1 && Math.hypot(walker.x - BENCH.x, walker.z - BENCH.z) < 7) { go('place'); walker.setSpeedMul(0); }
        break;
      }
      case 'place': {                                      // ferramenta e caderno na bancada; o ajuste falha uma vez
        shotTo(camera, [3.6, 1.9, BENCH.z - 4.2], [BENCH.x, 0.8, BENCH.z], t < 0.05 ? 1 : Math.min(1, dt * 1.5));
        faceTo(K, BENCH.x - 0.6, BENCH.z, dt, 3); walkK(K, dt, 0);
        if (t > 0.8 && !S.put) { S.put = true; for (const o of [tool, book]) { o.parent.remove(o); scene.add(o); } tool.position.set(BENCH.x - 0.7, 0.67, BENCH.z - 0.1); tool.rotation.set(0, 0.3, Math.PI / 2); book.position.set(BENCH.x - 0.3, 0.655, BENCH.z + 0.05); book.rotation.set(0, -0.2, 0); sfx.play('place', 0.4); }
        if (t > 1.6 && t < 3.0) { reachArm(K, 1, new THREE.Vector3(BENCH.x + 0.9, 0.7, BENCH.z + 0.26), ease((t - 1.6) / 0.5)); plank.rotation.y = 0.16 * (1 - ease((t - 2.0) / 0.6)); }   // endireita…
        if (t >= 3.0 && !S.slip) { S.slip = true; sfx.play('place', 0.7); }
        if (t > 3.0 && t < 3.4) plank.rotation.y = 0.18 * ease((t - 3.0) / 0.25);                                      // …e escorrega de volta
        if (t > 3.6) { reachArm(K, 1, new THREE.Vector3(), 0); K.userData.head.rotation.y = 0.4; }                          // olha para o jogador
        if (t > 4.4) { go('hold'); walker.setSpeedMul(1); }
        break;
      }
      case 'hold': {                                       // o jogador segura a tábua enquanto o K conserta (3 batidas)
        chase.update(dt);
        const end = new THREE.Vector3(BENCH.x + 1.1, 0, BENCH.z + 0.55), dd = Math.hypot(walker.x - end.x, walker.z - end.z);
        const holding = dd < 1.4 && (input.held('KeyE') || input.held('Space'));
        prompt(dd < 1.4 ? (holding ? 'Segurando…' : 'Segure E — Segurar a tábua') : null, input);
        walker.setSpeedMul(holding ? 0 : 1);
        if (holding) { S.hold += dt; plank.rotation.y = Math.max(0, plank.rotation.y - dt * 0.6); reachArm(K, 1, tool.position.clone().setY(0.9), 1); }
        const knock = Math.floor(S.hold / 0.8); if (holding && knock > (S.knock || 0) && knock <= 3) { S.knock = knock; sfx.play('place', 0.8); }
        if (S.hold > 2.6) { plank.rotation.y = 0; prompt(null); reachArm(K, 1, new THREE.Vector3(), 0); go('sitK'); }
        break;
      }
      case 'sitK': {
        chase.update(dt);
        if (t > 0.8 && !KS.visible) { K.visible = false; KS.visible = true; KS.position.set(BENCH.x - 0.55, 0, BENCH.z); KS.rotation.y = Math.PI / 2; sfx.play('place', 0.3); }
        if (t > 1.2) { go('toSeat'); walker.setSpeedMul(1); }
        break;
      }
      case 'toSeat': {                                     // há um lugar para o jogador
        chase.update(dt);
        const seat = new THREE.Vector3(BENCH.x + 0.6, 0, BENCH.z - 0.6), d = Math.hypot(walker.x - seat.x, walker.z - seat.z);
        prompt(d < 1.5 ? 'E — Sentar' : null, input);
        if (d < 1.5 && input.action()) { prompt(null); walker.show(false); seated.visible = true; seated.position.set(BENCH.x + 0.55, 0, BENCH.z); seated.rotation.y = Math.PI / 2; go('talk'); startTalk(); }
        break;
      }
      case 'talk':
        shotTo(camera, [2.3 - Math.min(1, t / 40) * 0.6, 1.45, BENCH.z - 3.4 + Math.min(1, t / 40) * 0.6], [BENCH.x, 1.0, BENCH.z], t < 0.05 ? 1 : Math.min(1, dt * 0.8));
        if (S.look) { const h = KS.userData.head; h.rotation.y += (S.look - h.rotation.y) * Math.min(1, dt * 3); }
        break;
      case 'silence':                                      // alguns segundos de silêncio
        shotTo(camera, [1.7, 1.45, BENCH.z - 2.8], [BENCH.x, 1.0, BENCH.z], Math.min(1, dt * 0.5));
        KS.userData.head.rotation.y *= 0.98;
        if (t > 4.2) go('write');
        break;
      case 'write': {                                      // ele escreve no caderno e o fecha
        shotTo(camera, [1.7, 1.45, BENCH.z - 2.8], [BENCH.x - 0.3, 0.9, BENCH.z], Math.min(1, dt * 0.5));
        if (t < 0.6) book.position.lerp(new THREE.Vector3(BENCH.x - 0.2, 0.86, BENCH.z - 0.32), Math.min(1, dt * 5));
        if (t > 0.6 && t < 3.4) { book.rotation.z = 0; KS.userData.torso.rotation.y = 0.06 * Math.sin(t * 9); KS.userData.head.rotation.z = -0.25; }
        if (t > 3.4 && !S.closed) { S.closed = true; book.scale.y = 1.6; sfx.play('place', 0.25); KS.userData.torso.rotation.y = 0; }
        if (t > 4.6) { go('leave'); seated.visible = false; walker.pose(BENCH.x + 0.6, BENCH.z - 0.9, 0.4); walker.show(true); walker.setSpeedMul(1); chase.reset(); }
        break;
      }
      case 'leave': {                                      // o jogador vai até uma saída; o K fica
        chase.update(dt);
        exitGlow.material.opacity = 0.35 + 0.15 * Math.sin(t * 2.4);
        KS.userData.head.rotation.y += ((walker.x > BENCH.x ? -0.5 : 0.5) - KS.userData.head.rotation.y) * Math.min(1, dt);
        if (Math.hypot(walker.x - EXIT.x, walker.z - EXIT.z) < 1.3 || S.out) {
          if (!S.out) { S.out = 0; walker.setSpeedMul(0.4); }
          S.out += dt; S.fade = Math.min(1, S.out / 2.4);
          if (S.out > 2.8) { const cb = ctx.onDone; stop(); cb && cb(); return; }
        }
        break;
      }
    }
  }
  function startTalk() {
    S.talkIdx = 0;
    talkBox.show(FINAL, () => { if (!S) return; ctx.onQuiet && ctx.onQuiet(); go('silence'); }, { hint: HINT, onAdvance: i => {
      if (!S) return; S.talkIdx = i; const g = FINAL[i].g;
      if (g === 'player') S.look = -0.7; else if (g === 'bench') S.look = 0.35; else if (i === 15 || i === 25) S.look = -0.5; else if (S.look && Math.random() < 0.3) S.look *= 0.4;
    } });
  }
  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; }, get fade() { return S ? S.fade : 0; },
    get locked() { return !!S && !(S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold'); },
    get prog() { return S ? S.prog : 0; }, get waiting() { return !!(S && S.wait); }, get kPos() { return K.position.clone(); },
    _jump(p) { if (!S) return; if (p === 'area') { walker.pose(BENCH.x + 1.5, BENCH.z - 7, Math.PI / 2); K.position.set(BENCH.x - 1.6, 0, BENCH.z - 1.4); S.prog = 1; }
      else if (p === 'talk') { S.prog = 1; K.visible = false; KS.visible = true; KS.position.set(BENCH.x - 0.55, 0, BENCH.z); KS.rotation.y = Math.PI / 2; for (const o of [tool, book]) { if (o.parent) o.parent.remove(o); scene.add(o); } book.position.set(BENCH.x - 0.3, 0.655, BENCH.z + 0.05); walker.show(false); seated.visible = true; seated.position.set(BENCH.x + 0.55, 0, BENCH.z); seated.rotation.y = Math.PI / 2; go('talk'); startTalk(); }
      else go(p); },
  };
}
