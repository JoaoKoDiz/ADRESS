// Fragmentos da batalha (R, M, C, S nas duas passagens), o interlúdio S1→R2 e o encerramento (conversa com a figura).
// Cena própria (o main desenha esta cena enquanto um deles está ativo). Cada um ocupa exatamente a janela da música que a
// batalha reservou (info.start..info.end) e anda pelo relógio dela (info.time()): são cenas SINCRONIZADAS — as falas passam
// sozinhas. O jogador continua com o círculo no chão (WASD/joystick) e a ação segurada (clique esquerdo, Espaço ou o botão).
// A 2ª passagem repete as mesmas cenas; muda a resposta do K.
import * as THREE from 'three';
import { reachArm, walkK } from './models/reader.js';
import { buildBody } from './models/driver.js';
import { VOID, COL, line, makeFigure, makeK, makeKSeated, makeSilhouette, sitPose, makeChair, makeTable, makeFloorPiece, makeLampPost,
  makeBench, makeCandle, makePiece, makeGridFloor, makeWhitePlayer, textSprite, createSfx, faceTo, ease, clamp } from './storyKit.js';

const CR = 0.36, CSPD = 5.2;
const F = (s, p = 0) => line('f', s, p), Kl = (s, p = 0) => line('k', s, p);
// falas: [fração da janela, fala]
const LINES = {
  R1: [[0.28, F('Uma escolha certa.')], [0.5, F('É assim que você precisa chamar.')], [0.72, F('Para não ouvir quem ficou do outro lado.')]],
  M1: [[0.25, F('Explique melhor.')], [0.48, F('Você sempre consegue parecer melhor quando tem tempo.')], [0.72, F('Pena que eles já ouviram.')]],
  C1: [[0.35, F('Não deixe perceberem.')], [0.68, F('Você foi tão bom ensinando coragem.')]],
  S1: [[0.3, F('Mais um pouco.')], [0.62, F('Você ainda consegue perder mais alguma coisa.')]],
  R2: [[0.16, Kl('Eu fui embora.')], [0.33, Kl('Isso teve um custo.')], [0.52, Kl('O que foi bom aqui não deixou de ser.')], [0.7, Kl('E eu não preciso chamar minha escolha de perfeita para continuar.')]],
  M2: [[0.12, Kl('Eu quis que você tivesse um lugar.')], [0.27, Kl('Eu quis de verdade.')], [0.42, Kl('O que você fez depois também aconteceu.')], [0.58, Kl('Eu não vou apagar uma coisa para conseguir enxergar a outra.')], [0.75, Kl('E não vou continuar entregando tudo o que sou para me deixarem ficar.')]],
  C2: [[0.24, Kl('Estou com medo.')], [0.4, Kl('Você pode ficar comigo até eu atravessar?')]],
  S2: [[0.1, Kl('Eu queria que fosse aqui.')], [0.23, Kl('Eu queria muito.')], [0.37, Kl('Não vou fingir que perder isso não dói.')], [0.52, Kl('Mas não preciso terminar junto.')], [0.68, Kl('O sonho era meu.')], [0.82, Kl('Eu ainda estou aqui.')]],
  I: [[0.56, F('Você já viu.')], [0.63, Kl('Eu vi.')], [0.7, F('Então sabe como termina.')], [0.77, Kl('Sei o que aconteceu.')], [0.86, Kl('Ainda não sei tudo o que isso significa.', 0.9)]],
  E: [[0.04, F('Você não terminou.')], [0.13, Kl('Terminei por hoje.')], [0.22, F('Então vai deixar tudo assim?')], [0.31, Kl('Eu não posso desfazer tudo.')],
    [0.4, F('Eles ainda podem rejeitar você.')], [0.48, Kl('Podem.')], [0.55, F('Você ainda pode falhar.')], [0.63, Kl('Posso.')], [0.7, F('E isso basta?')], [0.79, Kl('Não precisa bastar para você.')], [0.92, Kl('Você vem?')]],
};
const CODE = { azul: 'R', verde: 'M', laranja: 'C', roxo: 'S' };

export function createFragments(ctx) {
  const { input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#e2e0ea', '#141418', 0.95); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff4e6', 1.2); key.position.set(5, 10, 7); scene.add(key);
  const sfx = createSfx(audio);
  let mouse = false, simAct = false;
  addEventListener('pointerdown', e => { if (S && e.pointerType === 'mouse' && e.button === 0) mouse = true; });
  addEventListener('pointerup', e => { if (e.pointerType === 'mouse' && e.button === 0) mouse = false; });
  addEventListener('blur', () => { mouse = false; });
  const act = () => mouse || simAct || input.held('Space');

  // ---- personagens comuns ----
  const player = makeWhitePlayer(); scene.add(player);
  const K = makeK(); scene.add(K);
  const KS = makeKSeated(); scene.add(KS); KS.visible = false;
  const fig = makeFigure(1); scene.add(fig);
  const R = makeSilhouette(COL.azul, { hair: true, scale: 0.8 }); R.userData.mat.color.set(COL.azul); scene.add(R);
  // círculo (disco branco cheio)
  const circle = new THREE.Mesh(new THREE.CircleGeometry(CR, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true }));
  circle.position.y = 0.03; scene.add(circle);
  const halo = new THREE.Mesh(new THREE.RingGeometry(CR + 0.05, CR + 0.14, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  halo.position.y = 0.035; scene.add(halo);
  const grid = makeGridFloor(14, 18); scene.add(grid);
  const sets = {};                                         // cenários por letra (montados uma vez)
  const all = new THREE.Group(); scene.add(all);

  // ---- R: a moldura que estreita, o céu/campo do outro lado, a R ----
  {
    const g = new THREE.Group(); all.add(g); const stone = new THREE.MeshStandardMaterial({ color: '#8d93a6', roughness: 0.8, emissive: COL.azul, emissiveIntensity: 0.08 });
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.4), stone), postR = postL.clone(), lintel = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 0.4), stone);
    postL.position.y = postR.position.y = 1.3; lintel.position.y = 2.75; g.add(postL, postR, lintel);
    const skyC = document.createElement('canvas'); skyC.width = 4; skyC.height = 64; const sx = skyC.getContext('2d'); const gr = sx.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, '#2d6fe0'); gr.addColorStop(0.7, '#b9d6f5'); gr.addColorStop(0.72, '#79b14e'); gr.addColorStop(1, '#5d9a3a'); sx.fillStyle = gr; sx.fillRect(0, 0, 4, 64);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(skyC), toneMapped: false })); sky.position.set(0, 1.3, -0.15); g.add(sky);
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshBasicMaterial({ color: COL.azul, toneMapped: false, transparent: true })); shard.scale.set(1, 0.4, 0.7); g.add(shard);
    const floor = makeFloorPiece(4.2, 3.2, '#4c5060'); floor.position.set(0, 0, 0.8); g.add(floor);
    sets.R = { g, postL, postR, lintel, sky, shard, w: 1 };
  }
  // ---- M: mesa, cadeiras, silhuetas, fragmentos verdes ----
  {
    const g = new THREE.Group(); all.add(g);
    const T0 = new THREE.Vector3(0, 0, -1.8), table = makeTable(); table.position.copy(T0); g.add(table);
    const floor = makeFloorPiece(5, 4.4); floor.position.copy(T0); g.add(floor);
    const seats = [[330, 'A'], [265, 'B'], [20, 'C'], [125, 'N']], people = [], chairs = [];
    for (const [deg] of seats) { const a = deg * Math.PI / 180, c = makeChair(); c.position.set(T0.x + Math.cos(a) * 1.55, 0, T0.z + Math.sin(a) * 1.55); faceTo(c, T0.x, T0.z, 1, 1e3); g.add(c); chairs.push(c);
      const p = makeSilhouette('#64626b'); sitPose(p, 0.46); p.position.copy(c.position); p.rotation.y = c.rotation.y; g.add(p); people.push(p); }
    const kChair = makeChair('#7a5634'); g.add(kChair);
    const bits = []; const bitM = new THREE.MeshBasicMaterial({ color: COL.verde, toneMapped: false, transparent: true });
    for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.TetrahedronGeometry(0.13, 0), bitM.clone()); g.add(b); bits.push({ m: b }); }
    sets.M = { g, T0, chairs, people, kChair, bits };
  }
  // ---- C: rua com neve, poste laranja, lugar quente ao longe ----
  {
    const g = new THREE.Group(); all.add(g);
    const snow = new THREE.Mesh(new THREE.PlaneGeometry(7, 26).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 1 })); snow.position.set(0, 0, -3); g.add(snow);
    const post = makeLampPost(); post.position.set(1.6, 0, -9); post.rotation.y = Math.PI; g.add(post);
    const glowM = new THREE.MeshBasicMaterial({ color: '#ffb066', toneMapped: false }); const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2), glowM); door.position.set(-0.6, 1, -16); g.add(door);
    const N = 500, sp = new Float32Array(N * 3); for (let i = 0; i < N; i++) { sp[i * 3] = (Math.random() - 0.5) * 16; sp[i * 3 + 1] = Math.random() * 9; sp[i * 3 + 2] = -14 + Math.random() * 24; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const flakes = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#fff', size: 0.06, transparent: true, opacity: 0.8, depthWrite: false })); g.add(flakes);
    sets.C = { g, post, door, glowM, flakes, sg };
  }
  // ---- S: bancada, vela, viga, ferramenta, caderno, pedra firme ----
  {
    const g = new THREE.Group(); all.add(g);
    const floor = makeFloorPiece(5, 3.6, '#4a3a2c'); floor.position.set(0, 0, -1); g.add(floor);
    const bench = makeBench(); bench.position.set(0.4, 0, -1.8); g.add(bench);
    const candle = makeCandle(0.5); g.add(candle);
    const beam = makePiece('beam'); g.add(beam);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: '#5a3f28' })); postL.geometry.translate(0, 1.3, 0); g.add(postL);
    const tool = makePiece('tool'), book = makePiece('notebook'), stone = makePiece('stone'); g.add(tool, book, stone);
    const mark = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.48, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.roxo, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); g.add(mark);
    sets.S = { g, bench, candle, beam, postL, tool, book, stone, mark };
  }
  // ---- I / E: a arena (grade), os 4 cacos de vidro em volta da figura, a barreirinha ----
  const shards = new THREE.Group(); scene.add(shards);
  ['azul', 'verde', 'laranja', 'roxo'].forEach(c => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), new THREE.MeshBasicMaterial({ color: COL[c], toneMapped: false, transparent: true, opacity: 0.85 })); m.scale.set(1, 1.5, 0.35); shards.add(m); });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  scene.add(plate);

  let S = null;
  const cam = (p, l, fov = 50, k = 1) => { const P = new THREE.Vector3(...p); if (k >= 1) camera.position.copy(P); else camera.position.lerp(P, k); if (!S.look) S.look = new THREE.Vector3(...l); const L = new THREE.Vector3(...l); if (k >= 1) S.look.copy(L); else S.look.lerp(L, k); camera.lookAt(S.look); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); } };

  function resetK() {
    K.visible = true; KS.visible = false; delete K.userData.gait; K.userData.body.position.set(0, 0, 0); K.userData.torso.rotation.set(0, 0, 0); K.userData.head.rotation.set(0, 0, 0);
    K.userData.arms.forEach(a => { a.sh.quaternion.copy(a.rest); a.elbow.quaternion.copy(a.erest); });
    for (const a of K.userData.arms) if (a.wrist) for (const c of a.wrist.children.slice()) if (c.userData && c.userData.held) { a.wrist.remove(c); c.userData.held = false; }
  }
  function hold(obj, s) {                                 // objeto na mão do K (s = 1 direita, −1 esquerda)
    const a = K.userData.arms.find(x => x.s === s); if (!a || !a.wrist) return;
    obj.position.set(0, -0.12, 0); obj.rotation.set(0, 0, 0); a.wrist.add(obj); obj.userData.held = true;
  }
  /** Prepara um fragmento: letra (R/M/C/S/I/E), passagem, janela. */
  function play(info, done) {
    const code = info.interlude ? 'I' : info.finale ? 'E' : CODE[info.color], pass = info.pass || 1;
    S = { info, done, code, pass, key: code === 'I' || code === 'E' ? code : code + pass, t: 0, D: Math.max(4, info.end - info.start), lines: [], li: 0, cx: 0, cz: 3.4, fade: 1, ev: {}, look: null };
    S.lines = (LINES[S.key] || []).slice();
    for (const k of Object.keys(sets)) sets[k].g.visible = k === code;
    grid.visible = code === 'I' || code === 'E'; grid.userData.mat.uniforms.uAmt.value = 1; grid.userData.mat.uniforms.uFade.value = 1;
    shards.visible = code === 'I'; plate.material.opacity = 0;
    resetK(); R.visible = false; fig.visible = true; fig.userData.mat.opacity = 1; fig.scale.set(4.6, 5, 4.6); fig.rotation.y = -Math.PI / 2;
    player.visible = true; player.rotation.y = Math.PI / 2;
    camera.fov = 50; camera.updateProjectionMatrix(); talkBox.hide();
    setups[code](pass);
    update(0, false);
  }
  function stop() { if (!S) return; talkBox.hide(); sfx.stop(); S = null; mouse = false; simAct = false; }

  const setups = {
    R(pass) {
      const s = sets.R; s.g.position.set(0, 0, -1.2); s.w = 1.15; if (s.shard.parent !== s.g) { s.shard.parent && s.shard.parent.remove(s.shard); s.g.add(s.shard); } s.shard.material.opacity = 0.7; s.shard.visible = pass === 2; s.shard.position.set(0.9, 0.08, 0.9); s.picked = false;
      R.visible = true; R.position.set(0.35, 0, -2.6); R.rotation.y = -Math.PI / 2; R.userData.mat.opacity = 1;
      K.position.set(-0.3, 0, -2.4); K.rotation.y = -Math.PI / 2;
      player.position.set(-2.4, 0, 3.6); S.cx = 0; S.cz = 0.3; fig.position.set(3.4, 0, -10.5);
      S.bounds = [-3, 3, -0.6, 3.6];
    },
    M(pass) {
      const s = sets.M, kA = 200 * Math.PI / 180; s.g.position.set(0, 0, 0);
      s.kChair.position.set(s.T0.x + Math.cos(kA) * 1.55, 0, s.T0.z + Math.sin(kA) * 1.55); faceTo(s.kChair, s.T0.x, s.T0.z, 1, 1e3); s.kChair.visible = true;
      s.people.forEach((p, i) => { p.rotation.y = s.chairs[i].rotation.y; p.userData.mat.opacity = 1; });
      K.position.copy(s.kChair.position).add(new THREE.Vector3(0.5, 0, 0.5)); K.rotation.y = 0.3;
      s.bits.forEach((b, i) => { b.m.visible = true; b.got = false; b.m.material.opacity = 1; b.m.position.set(-3.4 + (i % 5) * 1.6 + Math.random() * 0.4, 0.2, 1.0 + Math.floor(i / 5) * 1.5 + Math.random() * 0.4); });
      player.position.set(-3.9, 0, 3.9); S.cx = 1.2; S.cz = 3.0; S.bounds = [-4.4, 4.4, -0.2, 4.6]; fig.position.set(-2.6, 0, -11.5);
    },
    C(pass) {
      const s = sets.C; s.g.position.set(0, 0, 0); s.post.userData.set(1); s.glowM.color.set('#ffb066');
      K.position.set(-0.4, 0, 5.4); K.rotation.y = Math.PI / 2;
      player.position.set(-2.4, 0, 8.8); S.cx = -0.8; S.cz = 6.8; S.bounds = [-3, 3, -9.5, 9]; fig.position.set(-4.6, 0, -19);
      S.kz = 5.4;
    },
    S(pass) {
      const s = sets.S; s.g.position.set(0, 0, 0); if (s.candle.parent !== s.g) { s.candle.parent && s.candle.parent.remove(s.candle); s.g.add(s.candle); }
      s.candle.position.set(1.1, 0.98, -1.75); s.candle.userData.set(pass === 1 ? 0.7 : 0.32);
      s.beam.position.set(-0.6, 2.1, -0.6); s.beam.rotation.set(0, 0.2, 0); s.postL.position.set(-1.9, 0, -0.9); s.postL.rotation.set(0, 0, 0);
      s.stone.position.set(-2.6, 0, 1.6); s.mark.position.set(-2.6, 0.03, 1.6); s.mark.material.opacity = 0;
      s.tool.position.set(0.2, 1.0, -1.7); s.book.position.set(-0.3, 0.99, -1.65); s.g.add(s.tool, s.book); s.tool.rotation.set(0, 0.4, Math.PI / 2); s.book.rotation.set(0, 0.2, 0);
      K.position.set(-0.6, 0, -0.6); K.rotation.y = Math.PI / 2;
      hold(sets.S.tool, 1);
      player.position.set(-3.6, 0, 3.3); S.cx = -0.4; S.cz = 1.6; S.bounds = [-3.6, 3.6, -0.4, 3.8]; fig.position.set(2.8, 0, -10);
    },
    I() {
      fig.position.set(0, 0, -11); K.position.set(0.7, 0, 2.6); K.rotation.y = Math.PI / 2; player.position.set(-1.0, 0, 8.4);
      shards.children.forEach((m, i) => { m.userData = { a: i * Math.PI / 2 }; m.material.opacity = 0.85; m.scale.set(1, 1.5, 0.35); });
      S.cx = 0; S.cz = 5.5; S.bounds = [-6.5, 6.5, -9, 9]; S.blue = { x: 0, y: 4, z: -9, free: false, shield: 0 };
    },
    E() {
      fig.position.set(0, 0, -11); K.position.set(0.7, 0, 2.6); K.rotation.y = Math.PI / 2; player.position.set(-1.0, 0, 8.4);
      hold(makePiece('tool'), 1); hold(makePiece('notebook'), -1);
      S.cx = 0; S.cz = 5.5; S.bounds = [-6.5, 6.5, -9, 9];
    },
  };

  function moveCircle(dt) {
    const ax = input.axis(); let x = ax.x, z = ax.z; const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    const b = S.bounds; S.cx = clamp(S.cx + x * CSPD * dt, b[0], b[1]); S.cz = clamp(S.cz + z * CSPD * dt, b[2], b[3]);
    circle.position.x = S.cx; circle.position.z = S.cz; halo.position.x = S.cx; halo.position.z = S.cz;
    const on = act(); halo.material.opacity += ((on ? 0.7 : 0) - halo.material.opacity) * Math.min(1, dt * 10);
    faceTo(player, S.cx, S.cz, dt, 4); player.rotation.y = clamp(player.rotation.y, 0.6, 2.6);
  }
  const near = (x, z, r) => Math.hypot(S.cx - x, S.cz - z) < r;
  function walkTo(obj, x, z, speed, dt) { const dx = x - obj.position.x, dz = z - obj.position.z, d = Math.hypot(dx, dz); if (d < 0.02) { walkK(obj, dt, 0); return true; } const st = Math.min(d, speed * dt); obj.position.x += dx / d * st; obj.position.z += dz / d * st; faceTo(obj, x, z, dt, 5); walkK(obj, dt, st); return false; }

  // ---------- cada fragmento: tick(t, D) ----------
  const ticks = {
    R(t, D, dt, pass) {
      const s = sets.R, u = t / D;
      cam([2.6, 2.1, 6.2], [-0.2, 1.3, -1.4], 46, t < 0.05 ? 1 : Math.min(1, dt * 1.2));
      // a moldura estreita; segurar o círculo na passagem (na base dela) retarda (1ª passagem)
      const holding = pass === 1 && act() && near(0, -0.9, 1.0);
      const target = pass === 1 ? (u < 0.42 ? 0.55 : 0.08) : (u < 0.3 ? 0.9 : 0.1);
      const rate = pass === 1 ? (holding ? 0.02 : 0.12) : 0.07;
      s.w += (target - s.w) * Math.min(1, dt * rate * 4) * (holding && s.w < 0.9 ? -0.5 : 1);
      s.w = clamp(s.w, 0.06, 1.25);
      s.postL.position.x = -s.w / 2 - 0.15; s.postR.position.x = s.w / 2 + 0.15; s.lintel.scale.x = s.w + 0.6; s.sky.scale.x = Math.max(0.02, s.w);
      if (pass === 1) {
        if (u < 0.42) walkTo(K, 0, 0.2, 0.55, dt);         // o K atravessa (com o jogador segurando a passagem fica mais fácil)
        else { faceTo(K, 0, -2.5, dt, 3); const k = ease((u - 0.42) / 0.1); reachArm(K, 1, new THREE.Vector3(s.w / 2 + 0.15, 1.3, -1.0), k); reachArm(K, -1, new THREE.Vector3(-s.w / 2 - 0.15, 1.3, -1.0), k); }   // segura a moldura (rígido)
        R.userData.mat.opacity = u < 0.7 ? 1 : Math.max(0, 1 - (u - 0.7) / 0.18);
      } else {
        if (u < 0.12) walkTo(K, 0, 0.3, 0.55, dt);
        else if (u < 0.6) {                                // não segura a moldura; olha para trás e depois pega o pedacinho azul
          faceTo(K, 0, -2.5, dt, 2);
          if (u > 0.4 && near(s.shard.position.x, s.shard.position.z + s.g.position.z, 1.1)) s.shard.material.opacity = 1;   // o círculo mostra onde está
        } else if (!s.picked) {
          const sp = new THREE.Vector3(s.shard.position.x, 0, s.shard.position.z + s.g.position.z);
          if (walkTo(K, sp.x - 0.3, sp.z + 0.1, 0.5, dt) || u > 0.72) { s.picked = true; s.g.remove(s.shard); hold(s.shard, 1); s.shard.position.set(0, -0.1, 0); sfx.play('chime', 0.4); }
          K.userData.body.position.y = -0.18 * ease((u - 0.6) / 0.06);
        } else { K.userData.body.position.y *= 0.95; faceTo(K, -2.4, 3.6, dt, 2); }
        R.userData.mat.opacity = u < 0.5 ? 1 : Math.max(0.25, 1 - (u - 0.5) / 0.3);   // ela continua lá, mais distante
      }
    },
    M(t, D, dt, pass) {
      const s = sets.M, u = t / D;
      cam([4.6, 3.4, 6.6], [0, 0.8, -1.2], 48, t < 0.05 ? 1 : Math.min(1, dt * 1.2));
      for (const b of s.bits) {                            // o jogador recolhe os fragmentos verdes com o círculo
        if (!b.m.visible) continue;
        b.m.rotation.y += dt * 2; b.m.position.y = 0.22 + Math.sin(t * 2 + b.m.position.x) * 0.06;
        if (!b.got && near(b.m.position.x, b.m.position.z, 0.55)) { b.got = true; b.k = 0; sfx.play('chime', 0.25); }
        if (b.got) { b.k += dt; const to = pass === 2 ? K.position : player.position; b.m.position.lerp(new THREE.Vector3(to.x, 1.2, to.z), Math.min(1, dt * 3)); b.m.material.opacity = Math.max(0, 1 - b.k / 0.9); if (b.k > 0.9) b.m.visible = false; }
      }
      const from = new THREE.Vector3(s.T0.x + Math.cos(3.49) * 1.55, 0, s.T0.z + Math.sin(3.49) * 1.55);
      if (pass === 1) {                                     // o K explica; a cadeira dele vai se afastando
        faceTo(K, s.T0.x, s.T0.z, dt, 3);
        const g = Math.sin(t * 2.2) * 0.5 + 0.5; const a = K.userData.arms.find(x => x.s === 1); if (a) a.sh.rotation.x = 0.35 + 0.5 * g;
        const away = ease(clamp((u - 0.15) / 0.7, 0, 1)) * 3.2, dir = from.clone().sub(s.T0).normalize();
        s.kChair.position.copy(from).addScaledVector(dir, away);
        s.people.forEach((p, i) => { if (u > 0.3 + i * 0.1) p.rotation.y = s.chairs[i].rotation.y + Math.PI * 0.8 * ease(clamp((u - 0.3 - i * 0.1) / 0.15, 0, 1)); });
      } else {                                             // o K pega a própria cadeira e a põe num lugar que é dele, de frente para a mesa
        const spot = new THREE.Vector3(s.T0.x - 2.6, 0, s.T0.z + 1.0);
        if (u < 0.45) { faceTo(K, s.T0.x, s.T0.z, dt, 3); s.kChair.position.copy(from).addScaledVector(from.clone().sub(s.T0).normalize(), 2.6); }
        else if (u < 0.75) { if (!s.carry) { s.carry = true; } walkTo(K, spot.x + 0.5, spot.z + 0.2, 0.6, dt); s.kChair.position.lerp(spot, Math.min(1, dt * 1.2)); faceTo(s.kChair, s.T0.x, s.T0.z, dt, 2); }
        else if (!S.ev.sat) { S.ev.sat = true; K.visible = false; KS.visible = true; KS.position.copy(s.kChair.position); KS.rotation.y = s.kChair.rotation.y; sfx.play('place', 0.4); }
        s.people.forEach((p, i) => { p.rotation.y = s.chairs[i].rotation.y + Math.PI * 0.8 * (1 - ease(clamp((u - 0.5) / 0.3, 0, 1)) * 0.5); });   // o grupo continua como está (só meio virado)
      }
    },
    C(t, D, dt, pass) {
      const s = sets.C, u = t / D;
      cam([2.8, 2.4, S.kz + 6.4], [0, 1.2, S.kz - 3.5], 50, t < 0.05 ? 1 : Math.min(1, dt * 1.5));
      const pos = s.sg.attributes.position; for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) - dt * 1.4, x = pos.getX(i) + dt * 1.6; if (y < 0) y += 9; if (x > 8) x -= 16; pos.setXY(i, x, y); } pos.needsUpdate = true;
      sfx.wind(0.12, 260);
      const goal = -8.4;
      const a = K.userData.arms.find(x => x.s === 1);
      if (pass === 1) {                                     // sozinho, a mão escondida; se o círculo chega perto, ele se afasta
        const close = near(K.position.x, K.position.z, 1.4);
        const sideStep = close ? (S.cx < K.position.x ? 1 : -1) * 0.8 : 0;
        const tx = clamp(K.position.x + sideStep, -2.2, 2.2);
        walkTo(K, tx, Math.max(goal, K.position.z - 1), 0.62, dt); K.userData.torso.rotation.z -= 0.25;
        reachArm(K, 1, K.localToWorld(new THREE.Vector3(-0.35, 0.95, 0.15)), 1);
        if (close) K.userData.head.rotation.y = -0.5;
      } else {
        const tremble = Math.sin(performance.now() * 0.06) * 0.3; if (a && a.wrist) a.wrist.rotation.x = tremble;   // a mão tremendo, à vista
        if (u < 0.22) walkTo(K, 0, Math.max(goal, K.position.z - 1), 0.55, dt);
        else if (u < 0.5) { walkK(K, dt, 0); faceTo(K, player.position.x, player.position.z, dt, 2); }   // para e pede
        else { const with_ = near(K.position.x, K.position.z, 2.0); walkTo(K, 0, goal, with_ ? 0.62 : 0.06, dt); halo.material.opacity = Math.max(halo.material.opacity, with_ ? 0.5 : 0);
          if (!with_) K.userData.head.rotation.y = 0.6; }
      }
      S.kz = K.position.z;
      if (pass === 1 && K.position.z < goal + 0.5) s.glowM.color.lerp(new THREE.Color('#1a120c'), Math.min(1, dt));
    },
    S(t, D, dt, pass) {
      const s = sets.S, u = t / D;
      cam([3.6, 2.6, 5.4], [-0.6, 1.3, -0.8], 50, t < 0.05 ? 1 : Math.min(1, dt * 1.2));
      s.candle.userData.tick(dt);
      const bp = new THREE.Vector3(s.beam.position.x, s.beam.position.y, s.beam.position.z);
      if (pass === 1) {                                     // segura a viga e a ferramenta; a vela diminui; a estrutura cede; ele ajoelha
        s.candle.userData.set(0.7 - 0.45 * u);
        const support = act() && near(-0.6, -0.2, 1.2);
        const sag = ease(clamp((u - 0.55) / 0.3, 0, 1)) * (support ? 0.7 : 1);
        s.beam.position.y = 2.1 - 1.2 * sag; s.beam.rotation.z = 0.3 * sag; s.postL.rotation.z = -0.9 * sag;
        reachArm(K, -1, bp.clone().add(new THREE.Vector3(-0.4, -0.08, 0)), 1); reachArm(K, 1, bp.clone().add(new THREE.Vector3(0.4, -0.08, 0)), 1);
        K.userData.body.position.y = -0.36 * ease(clamp((u - 0.72) / 0.12, 0, 1)); K.userData.torso.rotation.z = -0.35 * sag;
        if (u > 0.55 && !S.ev.crack) { S.ev.crack = true; sfx.play('crack', 0.5); }
      } else {
        if (u < 0.15) { reachArm(K, -1, bp.clone().add(new THREE.Vector3(-0.4, -0.08, 0)), 1); reachArm(K, 1, bp.clone().add(new THREE.Vector3(0.4, -0.08, 0)), 1); }
        else if (u < 0.3) {                               // solta a viga (cai atrás dele, sem ferir ninguém)
          const k = ease((u - 0.15) / 0.12); s.beam.position.y = 2.1 - 2.0 * k; s.beam.position.z = -0.6 - 0.8 * k; s.postL.rotation.z = -1.2 * k;
          reachArm(K, -1, bp, 1 - k); reachArm(K, 1, bp, 1 - k); if (k > 0.9 && !S.ev.drop) { S.ev.drop = true; sfx.play('fall', 0.4); }
        } else if (u < 0.45) { walkTo(K, -0.1, -1.1, 0.55, dt); if (u > 0.42 && !S.ev.book) { S.ev.book = true; hold(s.book, -1); } }   // pega o caderno
        else {                                             // leva a vela para a pedra firme (o círculo marca a pedra)
          s.mark.material.opacity = near(-2.6, 1.6, 0.9) ? 0.8 : 0.3;
          if (u < 0.62) { reachArm(K, -1, s.candle.position, 0.6); }
          else if (!S.ev.lift) { S.ev.lift = true; s.g.remove(s.candle); scene.add(s.candle); }
          if (S.ev.lift && !S.ev.set) { const done = walkTo(K, -2.2, 1.3, 0.6, dt); s.candle.position.copy(K.position).add(new THREE.Vector3(0.3, 1.0, 0.2)); if (done) { S.ev.set = true; s.candle.position.set(-2.6, 0.3, 1.6); sfx.play('place', 0.4); } }
          if (S.ev.set) faceTo(K, -2.6, 1.6, dt, 2);
        }
      }
    },
    I(t, D, dt) {                                          // os 4 cacos em volta da figura; o azul desobedece; barreirinha; o K toca
      const u = t / D, b = S.blue;
      cam([6.8, 5.0, 16.5], [-1.7, 1.8, -1.9], 50, 1);
      shards.children.forEach((m, i) => {
        if (i === 0 && b.free) return;
        m.userData.a += dt * 0.9; const a = m.userData.a; m.position.set(Math.cos(a) * 3.2, 5.2 + Math.sin(a * 2) * 0.5, -11 + Math.sin(a) * 1.6); m.rotation.y += dt;
      });
      const blue = shards.children[0];
      if (u > 0.12 && !b.free) { b.free = true; sfx.play('chime', 0.5); b.x = blue.position.x; b.y = blue.position.y; b.z = blue.position.z; }
      if (b.free) {
        const shielded = act() && near(b.x, b.z, 1.2);
        b.shield += ((shielded ? 1 : 0) - b.shield) * Math.min(1, dt * 6);
        // ele desce e vem para a frente; a figura puxa de volta (sem a barreirinha ele recua devagar)
        const tgt = u < 0.3 ? { x: -0.4, z: 4.2 } : { x: b.x, z: b.z };
        b.x += (tgt.x - b.x) * Math.min(1, dt * 0.9); b.z += (tgt.z - b.z) * Math.min(1, dt * 0.9);
        if (u > 0.3 && b.shield < 0.5 && !S.ev.touched) b.z -= dt * 0.35;
        b.y += (0.9 - b.y) * Math.min(1, dt * 0.8);
        blue.position.set(b.x + Math.sin(t * 9) * 0.03 * (1 - b.shield), b.y, b.z); blue.rotation.y += dt * 2;
        plate.material.opacity = 0.45 * b.shield; plate.position.set(b.x, 0.95, b.z - 0.55); plate.lookAt(b.x, 0.95, -20);
        // o K vai até ele, hesita, recua a mão, e toca
        if (u > 0.36) {
          const goal = new THREE.Vector3(b.x + 0.75, 0, b.z + 0.4);
          const arrived = walkTo(K, goal.x, goal.z, 0.8, dt);
          if (arrived || u > 0.46) {
            faceTo(K, b.x, b.z, dt, 4);
            const h = u < 0.46 ? 0 : u < 0.49 ? ease((u - 0.46) / 0.03) * 0.6 : u < 0.51 ? 0.6 - ease((u - 0.49) / 0.02) * 0.45 : 0.15 + ease((u - 0.51) / 0.03) * 0.85;
            reachArm(K, -1, blue.position.clone(), h);
            if (h > 0.95 && !S.ev.touched) { S.ev.touched = true; sfx.play('chime', 0.8); }
          }
        }
        if (S.ev.touched) { blue.material.opacity = 1; blue.scale.setScalar(1 + 0.1 * Math.sin(t * 4)); blue.scale.y *= 1.5; blue.scale.z *= 0.35; }
      }
    },
    E(t, D, dt) {                                          // o encerramento: a conversa; a câmera deixa de seguir a figura
      const u = t / D;
      const a = [6.8, 5.0, 16.5], la = [-1.7, 1.8, -1.9], b = [2.6, 1.7, 11.6], lb = [-0.4, 1.4, 4.0];
      const k = ease(clamp((u - 0.82) / 0.12, 0, 1));
      const P = a.map((v, i) => v + (b[i] - v) * k), L = la.map((v, i) => v + (lb[i] - v) * k);
      cam(P, L, 50 - 4 * k, 1);
      faceTo(K, u < 0.86 ? fig.position.x : player.position.x, u < 0.86 ? fig.position.z : player.position.z, dt, 2);
      if (u > 0.86) K.userData.head.rotation.y *= 0.9;
    },
  };

  function update(dt, paused) {
    if (!S || paused) return;
    const now = S.info.time ? S.info.time() - S.info.start : S.t + dt;
    const t = clamp(now, 0, S.D); const dts = Math.max(0, Math.min(0.05, t - S.t)); S.t = t;
    if (S.code !== 'E') moveCircle(dts || dt); else { circle.visible = false; halo.visible = false; }
    circle.visible = halo.visible = S.code !== 'E';
    const tk = ticks[S.code]; tk(t, S.D, dts || 1e-4, S.pass);
    K.userData.torso.scale.y = 1 + 0.01 * Math.sin(performance.now() * 0.002);
    // falas na hora marcada (substitui a anterior)
    while (S.li < S.lines.length && t >= S.lines[S.li][0] * S.D) { talkBox.show([S.lines[S.li][1]], null, { auto: true }); S.li++; }
    if (talkBox.open) talkBox.update(dts || dt);
    S.fade = t < 0.8 ? 1 - t / 0.8 : t > S.D - 0.8 ? (t - (S.D - 0.8)) / 0.8 : 0;
    if (S.code === 'E') S.fade = t < 0.6 ? 1 - t / 0.6 : 0;   // o encerramento não escurece no fim: continua no epílogo
    if (t >= S.D - 0.02) { const cb = S.done; stop(); cb && cb(); }
  }

  return {
    scene, camera, play, stop, update,
    finale(info, done) { play(Object.assign({ finale: true }, info), done); },
    get active() { return !!S; }, get fade() { return S ? S.fade : 0; }, get code() { return S ? S.key : ''; }, get t() { return S ? S.t : 0; },
    get joystick() { return !!S && S.code !== 'E'; }, get actionLabel() { return S && S.code !== 'E' ? 'Segurar' : null; },
    _action(on) { simAct = !!on; }, get circle() { return S ? { x: S.cx, z: S.cz } : null; }, _setCircle(x, z) { if (S) { S.cx = x; S.cz = z; } },
    get blue() { return S && S.blue ? Object.assign({}, S.blue, { touched: !!S.ev.touched }) : null; }, get ev() { return S ? S.ev : {}; },
    _K: K, sets,
  };
}
