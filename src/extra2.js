// Nível extra 2 — Maledicência.
// Um lugar de pertencimento no vazio: pedaços de chão, uma mesa, cadeiras e pessoas (lembranças com luz verde).
// Começa com a sensação de que há um lugar preparado para alguém: uma passagem se forma sob os pés, uma cadeira é puxada
// sozinha. Quem acolheu o K o recebe (lembrança curta). Depois o K vê alguém de fora, sozinho; o jogador pega a cadeira que
// estava sobrando e a põe ao lado das outras; uma passagem se abre até ela e o K puxa a cadeira para ela — o mesmo gesto que
// recebeu. Então a pessoa acolhida começa a recolher pequenos momentos do K (cansaço, uma contradição, uma resposta mal
// formulada, um pedido de ajuda que ele não soube fazer) e leva cada um até alguém do grupo. A cada um, uma cadeira vira para
// longe e uma voz do murmúrio se cala; a cadeira do K vai ficando de fora. O jogador pode andar no meio de tudo e tocar as
// frases (racham, mas seguem): é lembrança. A última a virar é quem o acolheu. A figura ocupa o espaço entre o K e o grupo.
// No fim fica só a cadeira que o K trouxe para a outra pessoa; a dele some. Salva EXTRA2_KEY e volta à tela inicial.
import * as THREE from 'three';
import { whitenFade, setWhiteGlow } from './whiteout.js';
import { walkK, reachArm } from './models/reader.js';
import { VOID, COL, line, makeFigure, makeFloorPiece, glassText, createMurmur, createSfx, prompt, createChase, attachAssist, shotTo, faceTo, ease, clamp } from './storyKit.js';
import { buildTableSet, TABLE_SEATS, seatPos, poseKSit, posePersonSit, personReach } from './memorySets.js';

export const EXTRA2_KEY = 'adress.extra.2';
const FAR_VAN = { x: 1e9, z: 1e9 };
const T = new THREE.Vector3(0, 0, -7);                       // centro da mesa (mundo)
const WL = (x, z) => new THREE.Vector3(T.x + x, 0, T.z + z);   // local da mesa → mundo
const START = { x: 0, z: 13.5 };
const N_ISLAND = WL(6.2, 0.8), BRIDGE = WL(4.0, 0.9), SPARE = new THREE.Vector3(-3.4, 0, 1.6);
const K_ENTER = WL(-6.4, 3.4);
const F = (s, p = 0) => line('f', s, p);
const L = {
  in: F('Você trouxe alguém para dentro.'), bonito: F('Foi bonito.'),
  enxergar: F('Até ela começar a enxergar você.'), casa: F('Você queria que se sentisse em casa.'), sentiu: F('Ela se sentiu.'),
  caber: F('Foi você quem deixou de caber.'), suas: F('Essas palavras eram suas.'), inventar: F('Eu nem precisei inventar.'),
  lugar: F('Quem oferece um lugar devia saber que pode perdê-lo.'), explicar: F('Agora tente explicar que queria fazer o bem.'), conveniente: F('Vai parecer tão conveniente.'),
};
// os pequenos momentos do K (nada de crime: cansaço, contradição, resposta mal formulada, pedido de ajuda que não soube fazer)
const EXPOSE = [
  { text: 'Hoje eu não tenho cabeça pra isso.', gest: 'eyes', to: 'A', turn: 38, slide: 0.35, say: [[2.0, 'enxergar'], [4.2, 'casa'], [7.4, 'sentiu']] },
  { text: 'Eu disse que vinha. Eu sei que disse.', gest: 'drop', to: 'B', turn: 42, slide: 0.75, say: [[7.6, 'caber']] },
  { text: 'Não foi isso que eu quis dizer.', gest: 'hands', to: 'A', turn: 70, slide: 0.35, also: ['B', 35], say: [[1.2, 'suas'], [7.0, 'inventar']] },
  { text: 'Se alguém pudesse… deixa, eu resolvo.', gest: 'reach', to: 'M', turn: 150, slide: 0.45, slow: true, say: [[7.4, 'lugar']] },
];
const VOICE_OF = { M: 0, A: 1, B: 2, K: 3, N: 4 };

export function createExtra2(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.Fog(VOID, 16, 52);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#d9d6e2', '#121216', 0.55); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1dc', 0.9); key.position.set(4, 9, 6); scene.add(key);
  const warm = new THREE.PointLight('#e9ffd9', 9, 13, 1.3); warm.position.set(T.x, 2.8, T.z); scene.add(warm);
  const chairSpot = new THREE.PointLight('#e9ffd9', 0, 4, 1.6); scene.add(chairSpot);
  const sfx = createSfx(audio), murmur = createMurmur(audio, 5);

  // ---- o lugar (cenário compartilhado com os fragmentos) ----
  const set = buildTableSet(); set.g.position.copy(T); scene.add(set.g);
  const { chairs, people, K } = set;
  // a passagem: placas que se formam sob os pés, da escuridão até a mesa; ilha da cadeira sobrando; ilha de quem está de fora
  const tiles = [];
  for (let i = 0; i < 9; i++) {                             // 9 placas: a última encosta no chão da mesa (antes sobrava um vão)
    const z = 11.5 - i * 1.95, x = Math.sin(i * 1.3) * 0.35;
    const p = makeFloorPiece(2.4, 1.85, '#57452f'); p.position.set(x, -4, z); p.visible = false; scene.add(p);
    tiles.push({ p, x, z, k: 0, on: false });
  }
  const startPiece = makeFloorPiece(2.6, 2.4, '#57452f'); startPiece.position.set(START.x, 0, START.z); scene.add(startPiece);
  const spareIsle = makeFloorPiece(2.2, 2.2, '#57452f'); spareIsle.position.set(SPARE.x, -4, SPARE.z); spareIsle.visible = false; scene.add(spareIsle);
  const nIsle = makeFloorPiece(2.2, 2.2, '#4f3f2b'); nIsle.position.copy(N_ISLAND); scene.add(nIsle);
  const bridge = makeFloorPiece(2.4, 1.6, '#57452f'); bridge.position.set(BRIDGE.x, -4, BRIDGE.z); bridge.visible = false; scene.add(bridge);
  // marca verde: onde pôr a cadeira (ao lado das outras)
  const ringMat = new THREE.MeshBasicMaterial({ color: COL.verde, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40).rotateX(-Math.PI / 2), ringMat); scene.add(ring);
  // a figura (só preto)
  const fig = makeFigure(1); fig.visible = false; scene.add(fig);
  // poeira verde da cadeira que some
  const DN = 60, dp = new Float32Array(DN * 3), dv = []; const dGeo = new THREE.BufferGeometry(); dGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ color: '#9cf0a4', size: 0.05, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); dust.frustumCulled = false; scene.add(dust);

  const chase = createChase(camera, walker, () => !!S && S.free, { dist: 4.9, pitch: 0.26, lookY: 1.5 });
  const assist = attachAssist(chase, walker, input);
  const chairMats = id => { const ms = []; chairs[id].traverse(o => { if (o.isMesh) { o.material.transparent = true; ms.push(o.material); } }); return ms; };
  const personOpacity = (p, a) => p.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = a; o.material.depthWrite = a > 0.98; } });

  let S = null;
  // ---- falas: fila (automáticas; o jogador continua andando). Cada fala da figura traz o grave baixo por baixo. ----
  const queue = [];
  function say(k) { queue.push(L[k]); }
  function pumpLines(dt) {
    if (talkBox.open) { talkBox.update(dt); return; }
    if (!queue.length) return;
    const l = queue.shift(); if (l.who === 'f') sfx.play('presence', 0.9);
    talkBox.show([l], null, { auto: true });
  }

  // ---- montagem inicial ----
  function reset() {
    set.reset();
    for (const id of ['M', 'A', 'B']) set.seat(id, true);
    people.N.visible = false; personOpacity(people.N, 1); people.N.position.copy(N_ISLAND).sub(T); people.N.rotation.y = Math.PI; posePersonSit(people.N, 0);
    K.visible = false; poseKSit(K, 0); K.position.copy(K_ENTER).sub(T); K.rotation.y = -0.4; delete K.userData.gait;
    personOpacity(K, 1); for (const id of ['M', 'A', 'B']) personOpacity(people[id], 1);
    // a cadeira do K começa no lugar, vazia; a cadeira "sobrando" (a que vai ser da pessoa de fora) está na ilha
    chairs.N.position.copy(SPARE).sub(T).setY(0); chairs.N.rotation.y = 1.2; chairs.N.visible = true;
    for (const id of Object.keys(chairs)) for (const m of chairMats(id)) m.opacity = 1;
    for (const t of tiles) { t.p.position.y = -4; t.p.visible = false; t.k = 0; t.on = false; }
    spareIsle.visible = false; spareIsle.position.y = -4; bridge.visible = false; bridge.position.y = -4;
    ring.position.copy(WL(...seatXZ('N'))).setY(0.02); ringMat.opacity = 0;
    fig.visible = false; fig.userData.mat.opacity = 0; fig.position.set(T.x - 1.5, 0, T.z - 13); fig.rotation.y = -Math.PI / 2; fig.scale.set(4.6, 5, 4.6);
    warm.color.set('#e9ffd9'); warm.intensity = 9; hemi.intensity = 0.55; chairSpot.intensity = 0;
    dust.material.opacity = 0; queue.length = 0;
    camera.fov = 50; camera.updateProjectionMatrix();
  }
  const seatXZ = id => { const v = seatPos(TABLE_SEATS[id]); return [v.x, v.z]; };

  // ---- onde dá para pisar ----
  const rects = () => {
    const r = [{ x0: START.x - 1.3, x1: START.x + 1.3, z0: START.z - 1.2, z1: START.z + 1.2 }];
    for (const t of tiles) if (t.on) r.push({ x0: t.x - 1.2, x1: t.x + 1.2, z0: t.z - 1.0, z1: t.z + 1.0 });
    if (spareIsle.visible && spareIsle.position.y > -0.5) r.push({ x0: SPARE.x - 1.1, x1: SPARE.x + 1.1, z0: SPARE.z - 1.1, z1: SPARE.z + 1.1 }, { x0: SPARE.x, x1: tiles[4].x, z0: SPARE.z - 0.8, z1: SPARE.z + 0.8 });
    r.push({ x0: T.x - 2.3, x1: T.x + 2.3, z0: T.z - 2.2, z1: T.z + 2.2 }, { x0: T.x - 4.1, x1: T.x - 2.3, z0: T.z + 0.5, z1: T.z + 2.7 }, { x0: T.x + 2.2, x1: T.x + 3.8, z0: T.z - 2.6, z1: T.z - 0.6 },
      { x0: T.x + 1.1, x1: T.x + 3.7, z0: T.z + 2.6, z1: T.z + 4.2 }, { x0: T.x - 3.2, x1: T.x - 1.2, z0: T.z - 3.3, z1: T.z - 1.9 });
    if (bridge.visible && bridge.position.y > -0.5) r.push({ x0: BRIDGE.x - 1.3, x1: N_ISLAND.x + 1.1, z0: BRIDGE.z - 0.8, z1: BRIDGE.z + 0.8 }, { x0: N_ISLAND.x - 1.1, x1: N_ISLAND.x + 1.1, z0: N_ISLAND.z - 1.1, z1: N_ISLAND.z + 1.1 });
    return r;
  };
  let walkRects = [];
  const walkable = (x, z) => walkRects.some(r => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true); setWhiteGlow(0.2);
    walkRects = rects(); walker.setArea(walkable);
    chase.reset(); chase.update(0, true);
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, free: true, carry: false, ex: -1, et: 0, cam: null, seen: {}, cool: 0 };
    murmur.level(0.05); murmur.setVoices(3);
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    if (S.carry) { walker.object.remove(chairs.N); set.g.add(chairs.N); }
    walker.setArea(null); walker.setSpeedMul(1); prompt(null); murmur.stop(); sfx.stop(); setWhiteGlow(0);
    if (talkBox.open) talkBox.hide(); queue.length = 0;
    for (const p of S.flying || []) { scene.remove(p.s); p.s.userData.dispose(); }
    S = null;
  }
  const go = (p, free) => { S.phase = p; S.t = 0; if (free !== undefined) S.free = free; };
  /** Câmera de cena: tomada fixa; ao voltar ao controle, mistura de volta para a câmera atrás do jogador. */
  function cine(pos, look, dt) { shotTo(camera, pos, look, S.cam === 'cine' ? Math.min(1, dt * 2.2) : 1); S.cam = 'cine'; }
  function chaseCam(dt) {
    if (S.cam === 'cine') { S.cam = 'blend'; S.blend = 0; S.from = { p: camera.position.clone(), l: camera.userData.look ? camera.userData.look.clone() : new THREE.Vector3(walker.x, 1.3, walker.z) }; }
    chase.update(dt);
    if (S.cam === 'blend') { S.blend = Math.min(1, S.blend + dt / 0.9); const e = ease(S.blend); const p = camera.position.clone(); camera.position.lerpVectors(S.from.p, p, e); const l = new THREE.Vector3(walker.x, 1.35, walker.z); camera.lookAt(S.from.l.clone().lerp(l, e)); if (S.blend >= 1) S.cam = null; }
  }

  // ---- gente das lembranças: andar, virar, sentar ----
  function walkTo(obj, x, z, speed, dt, isK) {
    const lx = x - T.x, lz = z - T.z, dx = lx - obj.position.x, dz = lz - obj.position.z, d = Math.hypot(dx, dz);
    if (d < 0.03) { if (isK) walkK(obj, dt, 0); return true; }
    const st = Math.min(d, speed * dt); obj.position.x += dx / d * st; obj.position.z += dz / d * st; faceTo(obj, lx, lz, dt, 5);
    if (isK) walkK(obj, dt, st); else obj.position.y = Math.abs(Math.sin(performance.now() * 0.009)) * 0.025;
    return false;
  }
  /** Caminho em arco em volta da mesa (raio r) de um ângulo a outro, sem atravessar a mesa. */
  const arcPos = (a0, a1, u, r = 2.35) => { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const a = a0 + d * u; return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); };
  const angOf = id => TABLE_SEATS[id] * Math.PI / 180;

  // ---- frases de vidro ----
  function newPhrase(text, at) {
    const s = glassText(text, { size: 0.36 }); s.position.copy(at); s.material.opacity = 0; scene.add(s);
    const p = { s, t: 0, state: 'pop', lastCrack: -9 }; (S.flying || (S.flying = [])).push(p); return p;
  }
  function updatePhrases(dt) {
    if (!S.flying) return;
    for (let i = S.flying.length - 1; i >= 0; i--) {
      const p = S.flying[i]; p.t += dt;
      if (p.state === 'pop') p.s.material.opacity = Math.min(1, p.t / 0.4);
      if (p.target) { p.s.position.lerp(p.target(), Math.min(1, dt * (p.rate || 5))); }
      if (p.state === 'in') { p.s.material.opacity = Math.max(0, p.s.material.opacity - dt * 1.6); p.s.material.color.lerp(new THREE.Color('#7a7f7a'), Math.min(1, dt * 3)); p.s.scale.multiplyScalar(1 - dt * 0.8); if (p.s.material.opacity <= 0) { scene.remove(p.s); p.s.userData.dispose(); S.flying.splice(i, 1); continue; } }
      // o jogador encosta: racha (nada muda; é lembrança)
      const d = Math.hypot(walker.x - p.s.position.x, walker.z - p.s.position.z);
      if (S.free && d < 0.75 && p.s.position.y < 2.6 && S.t - p.lastCrack > 0.6 && p.state !== 'in') { p.lastCrack = S.t; p.s.userData.crack(); sfx.play('tick', 0.8); S.cracked = (S.cracked || 0) + 1; }
    }
  }

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    // jogador (livre na maior parte; parado nas lembranças curtas)
    walker.setSpeedMul(S.free ? 1 : 0);
    walker.update(dt, S.free ? input.axis() : { x: 0, z: 0 }, 'car', [{ x0: T.x - 1.15, x1: T.x + 1.15, z0: T.z - 1.15, z1: T.z + 1.15 }], FAR_VAN);
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    if (S.phase !== 'out') S.fade = Math.max(0, S.fade - dt);
    pumpLines(dt); updatePhrases(dt);
    set.memory.flicker(t);
    // a passagem se forma à frente
    for (let i = 0; i < tiles.length; i++) {
      const tl = tiles[i], prevZ = i ? tiles[i - 1].z : START.z;
      if (!tl.on && (i === 0 ? true : tiles[i - 1].k > 0.6) && walker.z < prevZ + 2.4) { tl.on = true; tl.p.visible = true; sfx.play('place', 0.25); walkRects = rects(); }
      if (tl.on && tl.k < 1) { tl.k = Math.min(1, tl.k + dt / 0.8); tl.p.position.y = -4 * (1 - ease(tl.k)); }
    }
    if (tiles[3].on && !spareIsle.visible) { spareIsle.visible = true; S.spareK = 0; }
    if (spareIsle.visible && S.spareK < 1) { S.spareK = Math.min(1, S.spareK + dt / 1.0); spareIsle.position.y = -4 * (1 - ease(S.spareK)); chairs.N.position.y = spareIsle.position.y; if (S.spareK >= 1) walkRects = rects(); }
    // murmúrio pela distância até a mesa
    const dT = Math.hypot(walker.x - T.x, walker.z - T.z);
    murmur.level(S.phase === 'out' || S.phase === 'end' ? 0 : (0.12 + 0.55 * clamp(1 - dT / 24, 0, 1)) * (1 - 0.6 * S.cool));
    murmur.update(dt);
    // respiração das pessoas
    for (const id of ['M', 'A', 'B', 'N']) { const p = people[id]; if (p.visible) p.userData.B.torso.scale.y = 1 + 0.012 * Math.sin(t * 2 + VOICE_OF[id]); }

    switch (S.phase) {
      case 'walk':
        chaseCam(dt);
        if (walker.z < T.z + 9.5) { go('pull', true); sfx.play('scrape', 0.8); S.pull0 = chairs.K.position.clone(); }
        break;
      case 'pull': {                                         // uma cadeira é puxada (ninguém a puxa)
        chaseCam(dt); assist.update(dt, WL(...seatXZ('K')), 0.3, 2.5);
        const k = ease(Math.min(1, t / 1.1)), out = S.pull0.clone().setY(0).normalize();
        chairs.K.position.copy(S.pull0).addScaledVector(out, 0.55 * k); chairs.K.rotation.y += 0.002;
        if (t > 2.0) { go('welcome', false); K.visible = true; set.seat('M', false); S.m0 = people.M.position.clone(); }
        break;
      }
      case 'welcome': {                                      // lembrança curta: quem acolheu recebe o K
        cine([T.x - 2.2, 2.6, T.z + 8.6], [T.x - 3.0, 1.0, T.z + 1.4], dt);
        const M = people.M, meet = WL(-4.2, 2.6);
        if (t < 2.4) walkTo(K, meet.x - 0.9, meet.z + 0.5, 0.9, dt, true);     // o K chega devagar, olhando em volta
        else walkK(K, dt, 0);
        if (t < 2.4) K.userData.head.rotation.y = 0.35 * Math.sin(t * 1.4);
        if (t > 0.8 && t < 3.0) walkTo(M, meet.x, meet.z, 1.1, dt);
        if (t >= 3.0 && t < 4.2) { faceTo(M, K.position.x, K.position.z, dt); personReach(M, 1, ease((t - 3.0) / 0.6) * 0.8, 1.1); faceTo(K, M.position.x, M.position.z, dt); }
        if (t >= 4.2) {                                       // vão juntos; ela mostra a cadeira
          personReach(M, 1, Math.max(0, 0.8 - (t - 4.2)), 1.1);
          const kc = chairs.K.position, beside = new THREE.Vector3(kc.x, 0, kc.z).add(new THREE.Vector3(-0.3, 0, 0.75));
          if (!S.kAt && walkTo(K, beside.x + T.x, beside.z + T.z, 0.9, dt, true)) S.kAt = t;
          const mc = chairs.M.position; walkTo(M, mc.x + T.x + 0.5, mc.z + T.z + 0.4, 1.0, dt);
        }
        if (S.kAt && !S.kSat) { const u = Math.min(1, (t - S.kAt) / 0.9); K.position.lerp(chairs.K.position, Math.min(1, dt * 4)); K.rotation.y = chairs.K.rotation.y; poseKSit(K, u); if (u >= 1) { S.kSat = true; set.seat('K', true); set.seat('M', true); murmur.setVoices(4); sfx.play('place', 0.35); } }
        if (S.kSat && t > S.kAt + 2.2) { go('newcomer', false); people.N.visible = true; personOpacity(people.N, 0); }
        break;
      }
      case 'newcomer': {                                     // alguém de fora, sozinho; o K vai até a beira e chama
        cine([T.x + 1.0, 3.4, T.z + 7.4], [T.x + 3.6, 0.9, T.z + 0.6], dt);
        personOpacity(people.N, Math.min(1, t / 1.2)); faceTo(people.N, -3, 0, dt, 2);
        if (t > 1.2 && !S.kUp) { S.kUp = 0; }
        if (S.kUp !== undefined && S.kUp < 1) { S.kUp = Math.min(1, S.kUp + dt / 0.8); poseKSit(K, 1 - S.kUp); }
        const edge = WL(2.9, 1.0);
        if (S.kUp >= 1 && t < 5.4) walkTo(K, edge.x, edge.z, 0.85, dt, true);
        if (t >= 5.4 && t < 7.2) { walkK(K, dt, 0); faceTo(K, N_ISLAND.x - T.x, N_ISLAND.z - T.z, dt); reachArm(K, 1, N_ISLAND.clone().setY(1.2), ease((t - 5.4) / 0.5) * (0.75 + 0.15 * Math.sin(t * 7))); }   // chama
        if (t >= 7.2) { reachArm(K, 1, N_ISLAND.clone().setY(1.2), Math.max(0, 1 - (t - 7.2) * 2)); faceTo(K, -2, 2, dt, 2); K.userData.head.rotation.y = 0.4; }   // olha para a mesa: não há lugar
        if (t > 8.4) { go('carry', true); ringMat.opacity = 0.25; }
        break;
      }
      case 'carry': {                                        // o jogador traz a cadeira que sobrava
        chaseCam(dt); assist.update(dt, S.carry ? ring.position : SPARE, 2.0, 0.8);
        walkK(K, dt, 0);
        ringMat.opacity = S.carry ? 0.55 + 0.25 * Math.sin(t * 4) : 0.22;
        const cw = chairs.N.getWorldPosition(new THREE.Vector3());
        const d = Math.hypot(walker.x - cw.x, walker.z - cw.z), dr = Math.hypot(walker.x - ring.position.x, walker.z - ring.position.z);
        if (!S.carry) {
          prompt(d < 1.7 ? 'E — Pegar a cadeira' : null, input);
          if (d < 1.7 && input.action()) { S.carry = true; set.g.remove(chairs.N); walker.object.add(chairs.N); chairs.N.position.set(0.6, 0.12, 0); chairs.N.rotation.set(0, 0, 0); sfx.play('scrape', 0.4); }
        } else {
          prompt(dr < 1.6 ? 'E — Colocar a cadeira' : null, input);
          if (dr < 1.6 && input.action()) {
            S.carry = false; walker.object.remove(chairs.N); set.g.add(chairs.N); set.home('N'); chairs.N.position.add(new THREE.Vector3(0.25, 0, 0.35));   // ao lado das outras, ainda um pouco afastada
            sfx.play('place', 0.6); prompt(null); ringMat.opacity = 0; go('bridge', true); bridge.visible = true; S.bk = 0;
          }
        }
        break;
      }
      case 'bridge': {                                       // uma passagem se abre até ela; o K puxa a cadeira para ela
        chaseCam(dt); assist.update(dt, people.N.getWorldPosition(new THREE.Vector3()), 0.5, 1.5);
        S.bk = Math.min(1, S.bk + dt / 1.1); bridge.position.y = -4 * (1 - ease(S.bk)); if (S.bk >= 1 && !S.bOk) { S.bOk = true; walkRects = rects(); sfx.play('place', 0.3); }
        const nc = chairs.N.position;
        if (S.bk >= 1) {
          if (!S.nAt && walkTo(people.N, nc.x + T.x + 0.6, nc.z + T.z + 0.3, 0.8, dt)) S.nAt = t;
          if (!S.kAt2 && walkTo(K, nc.x + T.x - 0.55, nc.z + T.z + 0.5, 0.9, dt, true)) S.kAt2 = t;
        }
        if (S.kAt2 && !S.pulled) { faceTo(K, nc.x, nc.z, dt); reachArm(K, 1, chairs.N.getWorldPosition(new THREE.Vector3()).setY(0.95), Math.min(1, (t - S.kAt2) / 0.5)); if (t - S.kAt2 > 0.6) { S.pulled = t; sfx.play('scrape', 0.6); S.pc0 = nc.clone(); S.pcOut = nc.clone().setY(0).normalize(); } }   // o mesmo gesto que ele recebeu
        if (S.pulled && S.nSat === undefined) {
          const u = Math.min(1, (t - S.pulled) / 0.7); chairs.N.position.copy(S.pc0).addScaledVector(S.pcOut, 0.4 * ease(u)); reachArm(K, 1, chairs.N.getWorldPosition(new THREE.Vector3()).setY(0.95), Math.max(0, 1 - Math.max(0, u - 0.6) * 2.5));
          if (S.nAt && u >= 1) { S.nSat = 0; }
        }
        if (S.nSat !== undefined && S.nSat < 1) { S.nSat = Math.min(1, S.nSat + dt / 0.8); chairs.N.position.copy(S.pc0).addScaledVector(S.pcOut, 0.4 * (1 - ease(S.nSat)));   // a cadeira volta com ela sentando
          people.N.position.lerp(chairs.N.position, Math.min(1, dt * 6)); people.N.rotation.y = chairs.N.rotation.y; posePersonSit(people.N, S.nSat); if (S.nSat >= 1) murmur.setVoices(5); }
        if (S.nSat >= 1 && !S.kBack) { if (walkTo(K, chairs.K.position.x + T.x - 0.3, chairs.K.position.z + T.z + 0.6, 0.9, dt, true)) S.kBack = t; }
        if (S.kBack && !S.kSat2) { const u = Math.min(1, (t - S.kBack) / 0.8); K.position.lerp(chairs.K.position, Math.min(1, dt * 5)); K.rotation.y = chairs.K.rotation.y; poseKSit(K, u); if (u >= 1) { S.kSat2 = t; sfx.play('place', 0.3); } }
        if (S.kSat2 && t > S.kSat2 + 2.4) { go('turn', true); }
        break;
      }
      case 'turn': {                                         // a luz pisca uma vez; o murmúrio falha; a voz vem do escuro
        chaseCam(dt); assist.update(dt, T, 2, 0.6);
        warm.intensity = 9 * (t < 0.25 ? 0.25 : t < 0.5 ? 1 : t < 0.62 ? 0.4 : 1);
        if (t < 1.4) murmur.setVoices(t < 0.9 ? 0 : 5);
        if (t > 1.0 && !S.seen.in) { S.seen.in = 1; say('in'); say('bonito'); }
        if (t > 6.5) { S.ex = 0; S.et = 0; go('expose', true); }
        break;
      }
      case 'expose': exposeStep(dt); break;
      case 'figure': {                                       // a figura ocupa o espaço entre o K e o grupo
        chaseCam(dt);
        const kc = chairs.K.getWorldPosition(new THREE.Vector3()), mid = kc.clone().lerp(T, 0.45);
        const want = new THREE.Vector3(mid.x - 0.8, 0, mid.z - 2.2);
        if (!S.f0) S.f0 = fig.position.clone();
        const k = ease(Math.min(1, t / 3.2)); fig.visible = true;
        fig.position.lerpVectors(S.f0, want, k); fig.userData.mat.opacity = Math.max(fig.userData.mat.opacity, Math.min(1, t / 1.2));
        fig.rotation.y = -Math.PI / 2 + Math.atan2(kc.x - want.x, kc.z - want.z) * 0.0;
        assist.update(dt, mid, 0.6, 1.2);
        warm.color.lerp(new THREE.Color('#9fb0b2'), Math.min(1, dt * 0.5)); warm.intensity += (4 - warm.intensity) * Math.min(1, dt * 0.5);
        if (t > 1.2 && !S.seen.ex) { S.seen.ex = 1; say('explicar'); say('conveniente'); }
        if (t > 3.6 && !talkBox.open && !queue.length) go('end', true);
        break;
      }
      case 'end': {                                          // a cadeira dele some; fica só a que ele trouxe
        chaseCam(dt); assist.update(dt, chairs.N.getWorldPosition(new THREE.Vector3()), 0.8, 1.0);
        if (t < 1.0) poseKSit(K, 1 - ease(t / 1.0));
        else if (t < 1.8) { walkK(K, dt, 0); K.position.x -= dt * 0.4; }
        if (t > 1.2 && !S.dust) { S.dust = 1; const c = chairs.K.getWorldPosition(new THREE.Vector3()); for (let i = 0; i < DN; i++) { dp[i * 3] = c.x + (Math.random() - 0.5) * 0.7; dp[i * 3 + 1] = Math.random() * 1.2; dp[i * 3 + 2] = c.z + (Math.random() - 0.5) * 0.7; dv[i] = 0.2 + Math.random() * 0.5; } sfx.play('chime', 0.3); }
        const dk = clamp((t - 1.2) / 2.0, 0, 1);
        for (const m of chairMats('K')) m.opacity = 1 - dk; chairs.K.visible = dk < 0.999;
        if (S.dust) { const pos = dGeo.attributes.position; for (let i = 0; i < DN; i++) pos.setY(i, pos.getY(i) + dv[i] * dt); pos.needsUpdate = true; dust.material.opacity = 0.8 * (1 - clamp((t - 2.5) / 2, 0, 1)) * Math.min(1, (t - 1.2) * 3); }
        if (t > 2.4) K.userData.head.rotation.y += (0.6 - K.userData.head.rotation.y) * Math.min(1, dt * 2);   // olha para a cadeira que trouxe
        const fadeP = clamp((t - 4.4) / 2.6, 0, 1);
        for (const id of ['M', 'A', 'B', 'N']) personOpacity(people[id], 1 - fadeP); personOpacity(K, 1 - clamp((t - 5.0) / 2.4, 0, 1));
        set.table.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - fadeP; } });
        for (const id of ['M', 'A', 'B']) for (const m of chairMats(id)) m.opacity = 1 - fadeP;
        fig.userData.mat.opacity = Math.max(0, 1 - clamp((t - 5.4) / 2.2, 0, 1)); fig.visible = fig.userData.mat.opacity > 0.01;
        warm.intensity = 4 * (1 - fadeP);
        chairSpot.position.copy(chairs.N.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 2.2, 0.4)); chairSpot.intensity = 3.2 * clamp((t - 4.0) / 2, 0, 1);
        if (t > 9.6) go('out');
        break;
      }
      case 'out':
        chaseCam(dt);
        S.fade = Math.min(1, t / 2.4); murmur.level(0);
        if (t > 2.8 && !S.saved) { S.saved = true; try { localStorage.setItem(EXTRA2_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onDone; stop(); cb && cb(true); return; }
        break;
    }
  }

  // ---- as quatro exposições ----
  function exposeStep(dt) {
    chaseCam(dt);
    const E = EXPOSE[S.ex]; if (!E) { go('figure', true); return; }
    S.et += dt; const u = S.et, N = people.N, rec = people[E.to];
    // falas desta exposição
    for (const [at, k] of E.say) if (u >= at && !S.seen[S.ex + k]) { S.seen[S.ex + k] = 1; say(k); }
    // 1) um momento comum do K (gesto), a frase aparece sobre ele
    const kw = K.getWorldPosition(new THREE.Vector3());
    const gk = u < 0.3 ? u / 0.3 : u < 1.8 ? 1 : Math.max(0, 1 - (u - 1.8) / 0.6);
    gesture(E.gest, gk);
    if (u > 0.9 && !S.ph) { S.ph = newPhrase(E.text, kw.clone().setY(1.95)); sfx.play('tick', 0.4); }
    // 2) ela se vira para ele, pega a frase, levanta e leva até alguém
    const nw = N.getWorldPosition(new THREE.Vector3());
    if (u > 2.0 && u < 2.9) { faceTo(N, K.position.x, K.position.z, dt, 4); personReach(N, 1, ease((u - 2.0) / 0.5) * 0.9, 1.0); if (S.ph) { S.ph.state = 'carried'; S.ph.target = () => N.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.45, 0)); } }
    if (u >= 2.9 && u < 3.5) { personReach(N, 1, Math.max(0, 0.9 - (u - 2.9) * 2), 1.0); posePersonSit(N, 1 - ease((u - 2.9) / 0.6)); }
    const a0 = angOf('N'), a1 = angOf(E.to);
    if (u >= 3.5 && u < 6.3) { const p = arcPos(a0, a1 - 0.35 * Math.sign(a1 - a0 || 1), ease((u - 3.5) / 2.8)); const prev = N.position.clone(); N.position.copy(p); faceTo(N, p.x + (p.x - prev.x) * 20, p.z + (p.z - prev.z) * 20, dt, 6); N.position.y = Math.abs(Math.sin(u * 7)) * 0.025; }
    // 3) ela se inclina; a frase entra na pessoa
    if (u >= 6.3 && u < 7.1) { faceTo(N, rec.position.x, rec.position.z, dt, 5); N.userData.B.torso.rotation.z = -0.35 * ease((u - 6.3) / 0.4); if (S.ph && S.ph.state !== 'in') { S.ph.target = () => rec.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.25, 0)); S.ph.rate = 3; } }
    if (u >= 7.1 && S.ph && S.ph.state !== 'in') { S.ph.state = 'in'; S.ph = null; sfx.play('presence', 0.25); }
    // 4) a cadeira vira para longe do K; uma voz se cala; a cadeira do K desliza para fora
    const turnT = E.slow ? 3.2 : 1.6;
    if (u >= 7.1) {
      const k = ease(Math.min(1, (u - 7.1) / turnT));
      if (!S.turnRec) { S.turnRec = [[E.to, E.turn], ...(E.also ? [E.also] : [])].map(([id, deg]) => turnRecord(id, deg)); }
      for (const r of S.turnRec) { const a = r.from + (r.to - r.from) * k; chairs[r.id].rotation.y = a; people[r.id].rotation.y = a; }
      if (!S.voiced) { S.voiced = 1; murmur.setVoices(Math.max(1, 4 - S.ex)); S.cool = Math.min(1, S.cool + 0.25); }
      const c = chairs.K; if (!S.slideRec) S.slideRec = { from: c.position.clone(), out: c.position.clone().setY(0).normalize() };
      c.position.copy(S.slideRec.from).addScaledVector(S.slideRec.out, E.slide * ease(Math.min(1, (u - 7.1) / 1.4))); if (S.ex < 3 || u < 8.2) K.position.copy(c.position);
      warm.color.lerp(new THREE.Color('#c9d8c4'), Math.min(1, dt * 0.3));
    }
    // 5) ela volta para o lugar dela e senta
    if (u >= 7.6 && u < 10.0) { N.userData.B.torso.rotation.z *= 0.9; const p = arcPos(a1 - 0.35 * Math.sign(a1 - a0 || 1), a0, ease((u - 7.6) / 2.4)); const prev = N.position.clone(); N.position.copy(p); faceTo(N, p.x + (p.x - prev.x) * 20, p.z + (p.z - prev.z) * 20, dt, 6); }
    if (u >= 10.0 && u < 10.7) { N.position.lerp(chairs.N.position, Math.min(1, dt * 6)); N.rotation.y = chairs.N.rotation.y; posePersonSit(N, ease((u - 10.0) / 0.7)); }
    // reações do K (pequenas): percebe as costas; quase diz algo; levanta quando quem o acolheu vira
    const head = K.userData.head;
    if (S.ex === 1 && u > 8.0) head.rotation.y += (-0.5 - head.rotation.y) * Math.min(1, dt * 2);
    if (S.ex === 2 && u > 8.6 && u < 10.2) reachArm(K, 1, kw.clone().add(new THREE.Vector3(0.6, 1.0, 0)).lerp(T, 0.3), 0.45 * Math.sin(Math.min(1, (u - 8.6) / 1.6) * Math.PI));
    if (S.ex === 3 && u > 8.2) { const k = Math.min(1, (u - 8.2) / 1.2); poseKSit(K, 1 - ease(k)); faceTo(K, people.M.position.x, people.M.position.z, dt, 2); }
    // a figura: de longe, mais perto a cada exposição (só se vê de canto)
    if (S.ex >= 1) { fig.visible = true; const tgt = 0.12 + 0.12 * S.ex; fig.userData.mat.opacity += (tgt - fig.userData.mat.opacity) * Math.min(1, dt * 0.4); }
    if (u >= 7.6 && !S.figStep) { S.figStep = 1; fig.position.z += 1.8; fig.position.x += 0.4; }
    assist.update(dt, u < 2.4 ? kw : u < 7.4 ? nw : rec.getWorldPosition(new THREE.Vector3()), 1.4, 1.0);
    if (u > (E.slow ? 11.6 : 10.9) && !talkBox.open && !queue.length) { S.ex++; S.et = 0; S.voiced = 0; S.turnRec = null; S.slideRec = null; S.figStep = 0; if (S.ex >= EXPOSE.length) go('figure', true); }
  }
  /** Gesto do K sentado: esfregar os olhos, baixar os ombros, mãos abertas (explicar mal), estender e recolher a mão. */
  function gesture(kind, k) {
    const u = K.userData, kw = K.getWorldPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3(Math.cos(K.rotation.y), 0, -Math.sin(K.rotation.y));
    if (kind === 'eyes') { reachArm(K, 1, kw.clone().add(new THREE.Vector3(0, 1.62, 0)).addScaledVector(fwd, 0.28), k); u.head.rotation.z = -0.25 * k; }
    else if (kind === 'drop') { u.torso.rotation.z = -0.3 * k; u.head.rotation.z = -0.4 * k; }
    else if (kind === 'hands') { reachArm(K, 1, kw.clone().add(new THREE.Vector3(0, 1.05, 0)).addScaledVector(fwd, 0.5).add(new THREE.Vector3(0.2, 0, 0.15)), k * 0.8); reachArm(K, -1, kw.clone().add(new THREE.Vector3(0, 1.05, 0)).addScaledVector(fwd, 0.5).add(new THREE.Vector3(-0.2, 0, -0.15)), k * 0.8); }
    else if (kind === 'reach') { const e = k > 0.5 ? 1 - (k - 0.5) * 2 : k * 2; reachArm(K, 1, kw.clone().lerp(T, 0.55).setY(0.95), e * 0.9); u.head.rotation.z = -0.15 * k; }
  }
  /** Giro de uma pessoa (e cadeira) para longe do K: do ângulo atual a +deg, no sentido que afasta o rosto dela dele. */
  function turnRecord(id, deg) {
    const c = chairs[id], toK = Math.atan2(-(K.position.z - c.position.z), K.position.x - c.position.x);
    let d = toK - c.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const sgn = d > 0 ? -1 : 1; return { id, from: c.rotation.y, to: c.rotation.y + sgn * deg * Math.PI / 180 };
  }

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && !S.free; },
    get carrying() { return !!S && S.carry; }, get exposure() { return S ? S.ex : -1; }, get cracked() { return S ? S.cracked || 0 : 0; },
    _set: set, _fig: fig, _ring: ring, _walkable: (x, z) => walkable(x, z), _spare: SPARE,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0;
      for (const tl of tiles) { tl.on = true; tl.k = 1; tl.p.visible = true; tl.p.position.y = 0; } spareIsle.visible = true; S.spareK = 1; spareIsle.position.y = 0; walkRects = rects();
      if (p === 'carry' || p === 'expose') { K.visible = true; set.seat('M', true); set.seat('K', false); K.position.copy(WL(2.9, 1.0)).sub(T); people.N.visible = true; personOpacity(people.N, 1); }
      if (p === 'expose') { set.home('N'); chairs.N.position.add(new THREE.Vector3(0.25, 0, 0.35)); set.seat('N', true); set.seat('K', true); bridge.visible = true; bridge.position.y = 0; walkRects = rects(); murmur.setVoices(5); S.ex = 0; S.et = 0; walker.pose(T.x + 0.5, T.z + 4.6, -Math.PI / 2); go('expose', true); return; }
      go(p, p === 'carry' || p === 'walk'); },
  };
}
