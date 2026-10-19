// Epílogo da história: depois do "Você vem?", os dois andam juntos para longe da figura (o K espera se o jogador parar; sem
// cronômetro). A voz dela continua atrás, cada vez menos inteligível (letras somem com a distância) — sem uma última palavra.
// A grade perde linhas, a luz suaviza, o vazio ganha profundidade, as quatro cores aparecem de leve como reflexos.
// Surge um pedaço real: um terreno perto do bairro medieval, de manhã, depois do temporal — ainda sendo preparado (estacas e
// barbante marcando o chão, tábuas empilhadas, pedras, poças, grama molhada, a muralha ao longe). Não há oficina pronta.
// O K põe a ferramenta e o caderno numa bancada provisória; abre o caderno; alinha uma tábua — ela escorrega; ele olha,
// respira, muda a mão de lugar e tenta de novo (sem se condenar); o jogador segura a tábua enquanto ele fixa.
// Ele deixa a ferramenta no chão e senta; há um lugar ao lado. Um tempo sentados, sem fala. A conversa (avanço manual, com
// enquadramentos que respiram). Silêncio. Ele faz uma anotação pequena e fecha o caderno. O jogador vai até a saída; o K fica.
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { walkK, reachArm, buildPewReader } from './models/reader.js';
import { VOID, COL, HINT, line, makeFigure, makeK, makeBench, makePiece, makeGridFloor, makeWhitePlayer, prompt, whisper, degrade, createChase, shotTo, createSfx, faceTo, ease, clamp } from './storyKit.js';

const FAR_VAN = { x: 1e9, z: 1e9 };
const AREA = new THREE.Vector3(0, 0, 64);                // o terreno
const BENCH = new THREE.Vector3(0, 0, 63);
const EXIT = new THREE.Vector3(7.0, 0, 68.5);
const ECHO = ['Você não terminou.', 'Ainda falta.', 'Eles ainda podem rejeitar você.', 'Explique melhor.', 'Você ainda pode falhar.', 'Não deixe perceberem.', 'Continue pagando.', 'Então vai deixar tudo assim?'];
// g: para onde a câmera respira (a = os dois, k = o K, p = ele olhando para o jogador, b = a bancada, w = aberto, o terreno e a muralha)
const K_ = (s, p = 0, g = null) => { const l = line('k', s, p); if (g) l.g = g; return l; };
const FINAL = [
  K_('Eu achei que, se encontrasse a resposta certa, tudo ia se organizar.', 0, 'a'), K_('Uma resposta para o que perdi.'), K_('Outra para o que fizeram.'),
  K_('Outra para o que eu não consegui fazer.'), K_('E talvez uma que explicasse por que eu precisava continuar.'), K_('Mas eu estava fazendo outra coisa.', 0, 'k'),
  K_('Estava procurando uma maneira de nunca mais poderem dizer nada contra mim.'), K_('Não existe essa maneira.', 1.4, 'w'),
  K_('Eu posso ter feito o bem e ter gostado que alguém percebesse.', 0, 'k'), K_('Posso ter escolhido partir e ainda sentir falta.'), K_('Posso ter medo.'), K_('Posso precisar parar.'),
  K_('Isso não torna tudo mentira.', 0, 'a'), K_('Você não trouxe de volta o que eu perdi.', 0.8, 'p'), K_('Também não prometeu.'),
  K_('Mas ficou quando eu já não conseguia fazer muita coisa além de escutar aquilo.'), K_('E, por um tempo, eu precisei que alguém guardasse uma possibilidade que eu não estava enxergando.'),
  K_('Até eu conseguir fazer alguma coisa com ela.'), K_('Não sei o que vai ser daqui.', 0.8, 'b'), K_('Talvez uma oficina.'), K_('Talvez uma menor do que imaginei.'), K_('Talvez eu mude de ideia.'),
  K_('Hoje, eu só sei o que quero fazer amanhã.', 0.6, 'w'), K_('Você não precisa ficar para garantir que eu consiga.', 0, 'p'), K_('Eu gostaria que ficasse mais um pouco.'), K_('Mas gostaria.'),
  K_('É diferente de precisar que você nunca vá embora.', 0, 'a'),
];
const SHOTS = {                                            // [posição, mira] relativos à bancada
  a: [[2.6, 1.35, -3.4], [0, 0.95, 0]], k: [[-1.9, 1.4, -2.1], [-0.6, 1.15, 0]], p: [[2.0, 1.3, -2.2], [-0.45, 1.12, 0]],
  b: [[-1.9, 1.55, -1.7], [0.15, 0.62, 0.1]], w: [[4.2, 2.3, -6.8], [0, 1.2, 1.5]],
};

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
  // as quatro cores, de leve: reflexos no chão molhado e no ar, sem formar um arco-íris
  const glints = new THREE.Group(); scene.add(glints);
  const gTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  [['azul', -11, 26], ['verde', 12, 34], ['laranja', -13, 44], ['roxo', 11, 52]].forEach(([c, x, z], i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color: COL[c], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.position.set(x, 2.6 + (i % 2), z); s.scale.setScalar(1.8); glints.add(s);
    const r = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL[c], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); r.position.set(x * 0.6, 0.02, z + 1.5); r.scale.z = 0.4; r.userData.refl = true; glints.add(r);
  });
  // ---- o terreno sendo preparado ----
  const area = new THREE.Group(); area.position.copy(AREA); scene.add(area);
  const areaMats = [];
  const am = (c, o = {}) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, transparent: true, opacity: 0 }, o)); areaMats.push(m); return m; };
  const earth = am('#4a3f33', { roughness: 0.55 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 56).rotateX(-Math.PI / 2), earth); ground.position.y = 0.004; area.add(ground);
  const grassM = am('#5f8a46', { roughness: 0.9 }), grassM2 = am('#77a057', { roughness: 0.9 });
  { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    // tufos baixos e largos (folhas abertas), não cones altos
    const tuft = new THREE.ConeGeometry(0.11, 0.16, 5, 1, true); tuft.translate(0, 0.08, 0);
    const G1 = new THREE.InstancedMesh(tuft, grassM, 520), G2 = new THREE.InstancedMesh(tuft, grassM2, 380); let n1 = 0, n2 = 0; const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 1600 && (n1 < 520 || n2 < 380); i++) { const a = r() * Math.PI * 2, d = 3.2 + r() * 8.6; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (Math.abs(x) < 2.6 && z > -2.4 && z < 1.8) continue;   // (o meio, onde se mexe, fica de terra)
      e.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5); q.setFromEuler(e); const sc = 0.6 + r() * 0.7; m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(sc * 1.3, sc * (0.7 + r() * 0.6), sc * 1.3));
      if (r() < 0.58 && n1 < 520) G1.setMatrixAt(n1++, m); else if (n2 < 380) G2.setMatrixAt(n2++, m); }
    G1.count = n1; G2.count = n2; area.add(G1, G2); }
  const puddleM = am('#a6b9cc', { roughness: 0.04, metalness: 0.7 });
  for (const [x, z, r] of [[-3.4, -1.8, 0.9], [2.8, 2.9, 0.6], [-1.6, 3.6, 0.55], [4.6, -1.6, 0.75], [0.6, -3.4, 0.5]]) { const p = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), puddleM); p.position.set(x, 0.012, z); p.scale.z = 0.65; area.add(p); }
  // estacas e barbante: o contorno de alguma coisa que ainda não existe
  const stakeM = am('#8a6a46'), stringM = new THREE.LineBasicMaterial({ color: '#efe6d2', transparent: true, opacity: 0 }); areaMats.push(stringM);
  const SQ = [[-2.4, 1.0], [2.0, 1.0], [2.0, 4.4], [-2.4, 4.4]];
  for (const [x, z] of SQ) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.07), stakeM); st.position.set(x, 0.31, z); st.rotation.z = (x > 0 ? -1 : 1) * 0.06; area.add(st); }
  area.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(SQ.map(([x, z]) => new THREE.Vector3(x, 0.5, z))), stringM));
  // tábuas empilhadas, pedras, um balde
  const plankM = am('#a17e55'), plankM2 = am('#8a6a46'), rockM = am('#7c776f', { roughness: 0.95 });
  for (let i = 0; i < 5; i++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 0.24), i % 2 ? plankM : plankM2); pl.position.set(3.9, 0.04 + i * 0.065, 1.2 + (i % 2) * 0.05); pl.rotation.y = 0.2 + (i % 3) * 0.04; area.add(pl); }
  for (const [x, z, r] of [[-4.2, 2.6, 0.32], [-3.7, 3.0, 0.24], [-4.5, 3.2, 0.2], [4.8, 3.4, 0.28]]) { const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockM); rk.position.set(x, r * 0.6, z); area.add(rk); }
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 12, 1, true), am('#6c6c70', { metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide })); bucket.position.set(-3.1, 0.17, -0.8); area.add(bucket);
  // a muralha do bairro medieval ao longe (silhueta na névoa da manhã) e alguns telhados
  const farM = am('#8e8a86', { roughness: 1 });
  for (let i = -9; i <= 9; i++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4 + (i % 3 === 0 ? 0.6 : 0), 1.2), farM); seg.position.set(i * 4.1, 1.7, 30 + Math.abs(i) * 0.8); area.add(seg);
    if (i % 2 === 0) { const mer = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), farM); mer.position.set(i * 4.1 + 1.2, 3.7, 30 + Math.abs(i) * 0.8); area.add(mer); } }
  for (const x of [-12, 12]) { const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 6.4, 10), farM); tw.position.set(x, 3.2, 31); area.add(tw); }
  const roofFar = am('#8a5a4a', { roughness: 1 });
  for (const [x, z] of [[-6, 34], [-1, 35], [5, 33.5], [9, 36]]) { const rf = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.8, 4), roofFar); rf.position.set(x, 4.6, z); rf.rotation.y = Math.PI / 4; area.add(rf); }
  // uma árvore pequena pingando
  const trunkM = am('#5a4632'), leafM = am('#6f9a52', { roughness: 0.8 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 2.3, 10), trunkM); trunk.position.set(-5.2, 1.15, 1.2); area.add(trunk);
  for (const [x, y, z, r] of [[-5.2, 2.8, 1.2, 1.05], [-4.7, 2.5, 1.6, 0.75], [-5.7, 2.4, 0.8, 0.75]]) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafM); l.position.set(x, y, z); area.add(l); }
  const DR = 36, dp = new Float32Array(DR * 3); for (let i = 0; i < DR; i++) { dp[i * 3] = -6.3 + Math.random() * 2.2; dp[i * 3 + 1] = Math.random() * 2.2; dp[i * 3 + 2] = 0.2 + Math.random() * 2; }
  const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const drops = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#d8e6f4', size: 0.05, transparent: true, opacity: 0, depthWrite: false })); area.add(drops);
  const bench = makeBench(true); bench.position.copy(BENCH); scene.add(bench);
  bench.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0; areaMats.push(o.material); } });
  const plank = bench.children[bench.children.length - 1];          // a tábua de trás, desalinhada (o ajuste)
  const exitGlow = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.85, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  exitGlow.position.copy(EXIT).setY(0.04); scene.add(exitGlow);

  const chase = createChase(camera, walker, () => !!S && (S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold'), { side: 0.7 });
  let S = null;
  const K_HOLD = () => { const a = K.userData.arms; const r = a.find(x => x.s === 1), l = a.find(x => x.s === -1);
    const rw = r.wrist || r.elbow.children[r.elbow.children.length - 1], lw = l.wrist || l.elbow.children[l.elbow.children.length - 1];
    if (tool.parent !== rw) { tool.position.set(0, -0.12, 0); tool.rotation.set(0, 0, 0); rw.add(tool); }
    if (book.parent !== lw) { book.position.set(0, -0.12, 0); book.rotation.set(0, 0, 0); lw.add(book); } };
  const toScene = o => { const p = o.getWorldPosition(new THREE.Vector3()); if (o.parent) o.parent.remove(o); scene.add(o); o.position.copy(p); };

  function start(from) {                                  // from: { player: {x, z}, k: {x, z} } (onde estavam no fim da batalha)
    scene.add(walker.object); walker.setFloor(0); walker.show(true);
    const pp = from && from.player || { x: -1, z: 8.4 }; walker.pose(pp.x, pp.z, Math.PI / 2);   // (de costas para a figura, de frente para o caminho)
    S = { phase: 'walk', t: 0, fade: 0, white: whitenFade(walker.object), prog: 0, echo: 0, echoT: 1.6, wait: false, hold: 0, talkIdx: -1, music: false, shot: 'a', camP: new THREE.Vector3(), camL: new THREE.Vector3() };
    S.white.step(1);
    delete K.userData.gait; K.visible = true; KS.visible = false; seated.visible = false;
    const kp = from && from.k || { x: 0.7, z: 2.6 }; K.position.set(kp.x, 0, kp.z); K.rotation.y = -Math.PI / 2;   // virado para longe da figura
    K_HOLD();
    plank.rotation.y = 0.16; plank.position.x = 0.12;
    for (const m of areaMats) m.opacity = 0; drops.material.opacity = 0; exitGlow.material.opacity = 0;
    glints.children.forEach(g => { g.material.opacity = 0; });
    bg.set(VOID); scene.fog.color.set(VOID); grid.userData.mat.uniforms.uFade.value = 1; grid.visible = true; fig.visible = true; fig.userData.mat.opacity = 1;
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
  const _v = new THREE.Vector3();
  /** Câmera da conversa: vai devagar até o enquadramento do momento (sem cortes bruscos). */
  function talkCam(dt, snap) {
    const sh = SHOTS[S.shot] || SHOTS.a, br = 0.05 * Math.sin(S.t * 0.35);   // um respirar muito leve
    const p = _v.set(BENCH.x + sh[0][0] + br, sh[0][1], BENCH.z + sh[0][2]), l = new THREE.Vector3(BENCH.x + sh[1][0], sh[1][1], BENCH.z + sh[1][2]);
    if (snap) { S.camP.copy(p); S.camL.copy(l); } else { const k = Math.min(1, dt * 0.55); S.camP.lerp(p, k); S.camL.lerp(l, k); }
    camera.position.copy(S.camP); camera.lookAt(S.camL);
  }

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    const free = S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold';   // (no 'hold' o jogador anda até a ponta da tábua)
    const solids = S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold' ? [{ x0: BENCH.x - 1.2, x1: BENCH.x + 1.2, z0: BENCH.z - 0.4, z1: BENCH.z + 0.4 }] : [];
    if (S.phase === 'walk') walker.setSpeedMul(0.34);                // andar junto, no passo dele
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
    glints.children.forEach((g, i) => { const k = ease(clamp((p - 0.15 - (i >> 1) * 0.08) / 0.25, 0, 1)) * (1 - ease(clamp((p - 0.8) / 0.2, 0, 1)) * 0.7); g.material.opacity = (g.userData.refl ? 0.22 : 0.42) * k * (0.85 + 0.15 * Math.sin(t * 0.9 + i)); if (!g.userData.refl) g.position.y += Math.sin(t * 0.7 + i) * 0.003; });
    fig.userData.mat.opacity = 1 - ease(clamp((p - 0.1) / 0.5, 0, 1)); fig.visible = fig.userData.mat.opacity > 0.01;
    const areaK = ease(clamp((p - 0.62) / 0.3, 0, 1));
    for (const m of areaMats) { m.opacity = areaK; m.transparent = areaK < 0.999; } drops.material.opacity = 0.7 * areaK;
    const dpos = dGeo.attributes.position; for (let i = 0; i < DR; i++) { let y = dpos.getY(i) - dt * 4; if (y < 0) y = 2.2; dpos.setY(i, y); } dpos.needsUpdate = true;
    if (areaK > 0.2 && !S.music) { S.music = true; ctx.onArea && ctx.onArea(); }
    // a voz da figura, atrás: as letras somem com a distância (ninguém vira para responder)
    const fd = Math.hypot(walker.x - fig.position.x, walker.z - fig.position.z);
    S.echoT -= dt; if (S.echoT <= 0) { S.echoT = 3.6; S.echo = (S.echo + 1) % ECHO.length; }
    const lost = clamp((fd - 16) / 30, 0, 1);
    whisper(S.phase === 'walk' && lost < 1 ? degrade(ECHO[S.echo], lost, 7 + S.echo) : null, (0.85 - 0.45 * lost) * clamp(S.echoT / 0.6, 0, 1) * clamp((3.6 - S.echoT) / 0.4, 0, 1));

    switch (S.phase) {
      case 'walk': {                                       // o K vai junto, um pouco à frente; se o jogador parar ou ficar para trás, ele espera
        chase.update(dt);
        const ahead = K.position.z - walker.z, gap = Math.hypot(walker.x - K.position.x, walker.z - K.position.z);
        if (ahead > 1.8 && gap > 4.2) S.wait = true; else if (gap < 2.8 || ahead < 0.6) S.wait = false;
        const kSpeed = ahead < 0 ? 2.8 : 1.9;                 // (atrás do jogador: alcança)
        const goal = new THREE.Vector3(BENCH.x - 1.6, 0, BENCH.z - 1.4);
        const dx = goal.x - K.position.x, dz = goal.z - K.position.z, d = Math.hypot(dx, dz);
        if (!S.wait && d > 0.05) { const st = Math.min(d, kSpeed * dt); K.position.x += dx / d * st; K.position.z += dz / d * st; faceTo(K, goal.x, goal.z, dt, 4); walkK(K, dt, st); }
        else { walkK(K, dt, 0); if (S.wait) faceTo(K, walker.x, walker.z, dt, 2.5); }
        if (d < 0.1 && Math.hypot(walker.x - BENCH.x, walker.z - BENCH.z) < 7) { go('place'); walker.setSpeedMul(0); }
        break;
      }
      case 'place': {                                      // ferramenta e caderno na bancada; abre o caderno; o ajuste falha uma vez
        shotTo(camera, [BENCH.x + 3.4, 1.8, BENCH.z - 4.0], [BENCH.x, 0.75, BENCH.z], t < 0.05 ? 1 : Math.min(1, dt * 1.5));
        faceTo(K, BENCH.x - 0.6, BENCH.z, dt, 3); walkK(K, dt, 0);
        if (t > 0.8 && !S.put) { S.put = true; toScene(tool); toScene(book); tool.position.set(BENCH.x - 0.75, 0.665, BENCH.z - 0.1); tool.rotation.set(0, 0.3, Math.PI / 2); book.position.set(BENCH.x - 0.3, 0.655, BENCH.z + 0.05); book.rotation.set(0, -0.2, 0); sfx.play('place', 0.4); }
        if (t > 1.3 && t < 2.0) { reachArm(K, -1, book.position.clone().setY(0.75), ease((t - 1.3) / 0.4)); if (t > 1.7 && !S.opened) { S.opened = true; book.scale.x = 1.9; sfx.play('tick', 0.3); } }   // abre o caderno
        else if (t >= 2.0 && t < 2.4) reachArm(K, -1, new THREE.Vector3(), 0);
        if (t > 2.4 && t < 3.8) { reachArm(K, 1, new THREE.Vector3(BENCH.x + 0.9, 0.7, BENCH.z + 0.26), ease((t - 2.4) / 0.5)); plank.rotation.y = 0.16 * (1 - ease((t - 2.8) / 0.6)); }   // alinha a tábua…
        if (t >= 3.8 && !S.slip) { S.slip = true; sfx.play('place', 0.7); }
        if (t > 3.8 && t < 4.2) plank.rotation.y = 0.18 * ease((t - 3.8) / 0.25);                                      // …e ela escorrega de volta
        if (t > 4.2 && t < 5.6) { reachArm(K, 1, new THREE.Vector3(), 0); K.userData.torso.scale.y = 1 + 0.03 * Math.sin((t - 4.2) * 2.2); K.userData.head.rotation.z = -0.15; }   // ele olha, respira (sem se condenar)
        if (t > 5.6 && t < 6.6) { K.userData.head.rotation.z *= 0.9; reachArm(K, 1, new THREE.Vector3(BENCH.x + 1.05, 0.66, BENCH.z + 0.3), ease((t - 5.6) / 0.5) * 0.9); }   // muda a mão de lugar, tenta de novo
        if (t > 6.6) { K.userData.head.rotation.y += (0.5 - K.userData.head.rotation.y) * Math.min(1, dt * 3); }        // e olha para o jogador: segura aqui?
        if (t > 7.2) { go('hold'); walker.setSpeedMul(1); }
        break;
      }
      case 'hold': {                                       // o jogador segura a tábua enquanto o K fixa (três batidas); a ponta fica do lado de quem chega
        chase.update(dt);
        const end = new THREE.Vector3(BENCH.x + 1.1, 0, BENCH.z - 0.9), dd = Math.hypot(walker.x - end.x, walker.z - end.z);
        const holding = dd < 1.4 && (input.held('KeyE') || input.held('Space'));
        prompt(dd < 1.4 ? (holding ? 'Segurando…' : 'Segure E — Segurar a tábua') : 'Vá até a ponta da tábua', input);
        walker.setSpeedMul(holding ? 0 : 1);
        reachArm(K, 1, new THREE.Vector3(BENCH.x + 1.05, 0.66, BENCH.z + 0.3), 0.9);
        if (holding) { S.hold += dt; plank.rotation.y = Math.max(0, plank.rotation.y - dt * 0.6); reachArm(K, -1, tool.position.clone().setY(0.9), 1); }
        const knock = Math.floor(S.hold / 0.8); if (holding && knock > (S.knock || 0) && knock <= 3) { S.knock = knock; sfx.play('place', 0.8); }
        if (S.hold > 2.6) { plank.rotation.y = 0; prompt(null); reachArm(K, 1, new THREE.Vector3(), 0); reachArm(K, -1, new THREE.Vector3(), 0); go('toolDown'); }
        break;
      }
      case 'toolDown': {                                   // deixa a ferramenta no chão, ao lado, e senta
        chase.update(dt);
        if (t < 1.0) { reachArm(K, 1, new THREE.Vector3(BENCH.x - 1.0, 0.3, BENCH.z - 0.5), ease(t / 0.6)); K.userData.torso.rotation.z = -0.25 * ease(t / 0.6); }
        if (t > 0.7 && !S.down) { S.down = true; tool.position.set(BENCH.x - 1.05, 0.04, BENCH.z - 0.55); tool.rotation.set(0, 0.9, Math.PI / 2); sfx.play('place', 0.35); }
        if (t > 1.0 && t < 1.6) { reachArm(K, 1, new THREE.Vector3(), 0); K.userData.torso.rotation.z *= 0.85; }
        if (t > 1.8 && !KS.visible) { K.visible = false; KS.visible = true; KS.position.set(BENCH.x - 0.55, 0, BENCH.z); KS.rotation.y = Math.PI / 2; sfx.play('place', 0.3); }
        if (t > 2.2) { go('toSeat'); walker.setSpeedMul(1); }
        break;
      }
      case 'toSeat': {                                     // há um lugar ao lado
        chase.update(dt);
        const seat = new THREE.Vector3(BENCH.x + 0.6, 0, BENCH.z - 0.6), d = Math.hypot(walker.x - seat.x, walker.z - seat.z);
        prompt(d < 1.5 ? 'E — Sentar ao lado' : null, input);
        if (d < 1.5 && input.action()) { prompt(null); walker.show(false); seated.visible = true; seated.position.set(BENCH.x + 0.55, 0, BENCH.z); seated.rotation.y = Math.PI / 2; go('rest'); S.shot = 'w'; talkCam(0, true); }
        break;
      }
      case 'rest':                                         // um tempo sentados, sem fala (o descanso antes de qualquer explicação)
        talkCam(dt);
        if (t > 5.0) { go('talk'); S.shot = 'a'; startTalk(); }
        break;
      case 'talk':
        talkCam(dt);
        if (S.look != null) { const h = KS.userData.head; h.rotation.y += (S.look - h.rotation.y) * Math.min(1, dt * 3); }
        break;
      case 'silence':                                      // alguns segundos de silêncio
        talkCam(dt);
        KS.userData.head.rotation.y *= 0.98;
        if (t > 4.6) { go('write'); S.shot = 'b'; }
        break;
      case 'write': {                                      // uma anotação pequena e o caderno fechado (sem voltar a trabalhar compulsivamente); depois o jogador levanta fora da bancada
        talkCam(dt);
        if (t < 0.6) book.position.lerp(new THREE.Vector3(BENCH.x - 0.2, 0.86, BENCH.z - 0.32), Math.min(1, dt * 5));
        if (t > 0.6 && t < 2.6) { KS.userData.torso.rotation.y = 0.05 * Math.sin(t * 9); KS.userData.head.rotation.z = -0.25; }
        if (t > 2.6 && !S.closed) { S.closed = true; book.scale.x = 1; sfx.play('place', 0.25); KS.userData.torso.rotation.y = 0; KS.userData.head.rotation.z = 0; book.position.set(BENCH.x - 0.3, 0.655, BENCH.z + 0.05); }
        if (t > 4.4) { go('leave'); seated.visible = false; walker.pose(BENCH.x + 0.6, BENCH.z - 1.4, 0.4); walker.show(true); walker.setSpeedMul(1); chase.reset(); }
        break;
      }
      case 'leave': {                                      // o jogador vai até a saída; o K fica, tranquilo
        if (!S.out && S.out !== 0) chase.update(dt);
        exitGlow.material.opacity = 0.35 + 0.15 * Math.sin(t * 2.4);
        KS.userData.head.rotation.y += ((walker.x > BENCH.x ? -0.5 : 0.5) - KS.userData.head.rotation.y) * Math.min(1, dt);
        if (Math.hypot(walker.x - EXIT.x, walker.z - EXIT.z) < 1.3 || S.out) {
          if (!S.out) { S.out = 0; walker.setSpeedMul(0); }
          S.out += dt; S.fade = Math.max(0, Math.min(1, (S.out - 1.6) / 2.4));
          // a última imagem: a câmera olha para trás — o K continua ali, sentado, tranquilo, o caderno fechado
          shotTo(camera, [EXIT.x + 1.2, 1.7, EXIT.z + 1.8], [BENCH.x, 0.9, BENCH.z], S.out < 0.05 ? 1 : Math.min(1, dt * 1.2));
          if (S.out > 4.4) { const cb = ctx.onDone; stop(); cb && cb(); return; }
        }
        break;
      }
    }
  }
  function startTalk() {
    S.talkIdx = 0;
    talkBox.show(FINAL, () => { if (!S) return; ctx.onQuiet && ctx.onQuiet(); go('silence'); S.shot = 'w'; }, { hint: HINT, onAdvance: i => {
      if (!S) return; S.talkIdx = i; const g = FINAL[i].g;
      if (g) S.shot = g;
      S.look = g === 'p' ? -0.75 : g === 'b' ? 0.35 : g === 'w' || g === 'a' ? 0 : S.look;
    } });
  }
  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; }, get fade() { return S ? S.fade : 0; },
    get locked() { return !!S && !(S.phase === 'walk' || S.phase === 'toSeat' || S.phase === 'leave' || S.phase === 'hold'); },
    get prog() { return S ? S.prog : 0; }, get waiting() { return !!(S && S.wait); }, get kPos() { return K.position.clone(); }, get shot() { return S ? S.shot : ''; },
    get toolOnGround() { return !!(S && S.down); },
    _B: BENCH, _jump(p) { if (!S) return; if (p === 'area') { walker.pose(BENCH.x + 1.5, BENCH.z - 7, Math.PI / 2); K.position.set(BENCH.x - 1.6, 0, BENCH.z - 1.4); S.prog = 1; }
      else if (p === 'talk') { S.prog = 1; K.visible = false; KS.visible = true; KS.position.set(BENCH.x - 0.55, 0, BENCH.z); KS.rotation.y = Math.PI / 2; for (const o of [tool, book]) { if (o.parent) o.parent.remove(o); scene.add(o); } book.position.set(BENCH.x - 0.3, 0.655, BENCH.z + 0.05); tool.position.set(BENCH.x - 1.05, 0.04, BENCH.z - 0.55); walker.show(false); seated.visible = true; seated.position.set(BENCH.x + 0.55, 0, BENCH.z); seated.rotation.y = Math.PI / 2; go('talk'); S.shot = 'a'; talkCam(0, true); startTalk(); }
      else go(p); },
  };
}
