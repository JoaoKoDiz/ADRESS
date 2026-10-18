// Nível extra 2 — Maledicência. O vazio com pedaços de chão, uma mesa, cadeiras e silhuetas (memórias com acento verde).
// Uma pessoa acolhe o K na mesa; o K acolhe outra pessoa (o jogador carrega e coloca a cadeira dela). A figura leva frases
// comuns do K até as silhuetas e cada uma vira a cadeira para longe; a cadeira do K fica isolada, a figura entre ele e o grupo.
// Fim: a cadeira que o jogador trouxe continua; a do K some. Salva EXTRA2_KEY e volta à tela inicial.
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { walkK } from './models/reader.js';
import { VOID, COL, HINT, line, makeFigure, makeK, makeKSeated, makeSilhouette, sitPose, standPose, makeChair, makeTable, makeFloorPiece,
  textSprite, prompt, createChase, shotTo, createSfx, faceTo, ease, clamp } from './storyKit.js';

export const EXTRA2_KEY = 'adress.extra.2';
const FAR_VAN = { x: 1e9, z: 1e9 };
const T0 = new THREE.Vector3(0, 0, -2);                 // centro da mesa
const RAD = 1.55;
const at = deg => { const a = deg * Math.PI / 180; return new THREE.Vector3(T0.x + Math.cos(a) * RAD, 0, T0.z + Math.sin(a) * RAD); };
const SEATS = { K: 200, M: 330, A: 265, B: 20, N: 125 };   // K, quem acolheu o K, dois do grupo, a pessoa nova (cadeira do jogador)
const START = { x: 0.5, z: 20 };
const LOOSE = new THREE.Vector3(4.6, 0, 3.2);          // a cadeira solta (a do jogador)
const PHRASES = ['Eu falei sem pensar.', 'Hoje não dá.', 'Deixa que eu faço.', 'Não foi isso que eu quis dizer.', 'Tô cansado.', 'Depois eu explico.', 'Esqueci, desculpa.'];
const FIG = lines => lines.map(s => line('f', s));
const TALK = FIG(['Você trouxe alguém para dentro.', 'Foi bonito.', 'Até ela começar a enxergar você.', 'Você queria que se sentisse em casa.',
  'Ela se sentiu.', 'Foi você quem deixou de caber.', 'Essas palavras eram suas.', 'Eu nem precisei inventar.',
  'Quem oferece um lugar devia saber que pode perdê-lo.', 'Agora tente explicar que queria fazer o bem.', 'Vai parecer tão conveniente.']);

export function createExtra2(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  scene.add(new THREE.HemisphereLight('#e7e2d8', '#1a1a20', 1.0));
  const key = new THREE.DirectionalLight('#fff1dc', 1.5); key.position.set(4, 9, 6); scene.add(key);
  const memLight = new THREE.PointLight(COL.verde, 3, 9, 1.4); memLight.position.set(T0.x, 2.6, T0.z); scene.add(memLight);
  const sfx = createSfx(audio);

  // chão em pedaços em volta da mesa (com vãos para o vazio)
  const floor = new THREE.Group(); scene.add(floor);
  for (const [x, z, w, d, r] of [[0, -2, 4.4, 4.2, 0], [-3.1, -0.4, 1.8, 2.2, 0.15], [2.9, -3.6, 1.6, 2.0, -0.2], [2.4, 1.6, 2.6, 1.6, 0.1], [-2.2, -4.6, 2.0, 1.4, -0.1], [4.4, 3.2, 1.6, 1.6, 0.05], [0.4, 2.8, 2.2, 1.2, 0]]) {
    const p = makeFloorPiece(w, d); p.position.set(x, 0, z); p.rotation.y = r; floor.add(p);
  }
  const table = makeTable(); table.position.copy(T0); scene.add(table);
  // cadeiras e quem senta
  const chairs = {}, people = {};
  for (const [id, deg] of Object.entries(SEATS)) {
    const c = makeChair(id === 'K' ? '#7a5634' : '#6b4a2e'); c.position.copy(at(deg)); faceTo(c, T0.x, T0.z, 1, 1e3); chairs[id] = c; scene.add(c);
  }
  const silColor = { M: '#6c6a72', A: '#5a5962', B: '#605e68', N: '#706c6a' };
  for (const id of ['M', 'A', 'B', 'N']) { const s = makeSilhouette(silColor[id], { hair: id === 'M' || id === 'N' }); people[id] = s; scene.add(s); }
  const K = makeK(), KS = makeKSeated(); scene.add(K); scene.add(KS);
  const fig = makeFigure(1); scene.add(fig);
  // marcador verde no chão (onde colocar a cadeira)
  const ringMat = new THREE.MeshBasicMaterial({ color: COL.verde, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 40).rotateX(-Math.PI / 2), ringMat); ring.position.copy(at(SEATS.N)).setY(0.02); scene.add(ring);
  // partículas verdes da memória
  const moteGeo = new THREE.BufferGeometry(), MN = 90, mp = new Float32Array(MN * 3);
  for (let i = 0; i < MN; i++) { mp[i * 3] = T0.x + (Math.random() - 0.5) * 7; mp[i * 3 + 1] = Math.random() * 3; mp[i * 3 + 2] = T0.z + (Math.random() - 0.5) * 7; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const moteMat = new THREE.PointsMaterial({ color: COL.verde, size: 0.05, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  scene.add(new THREE.Points(moteGeo, moteMat));
  const flying = [];                                       // frases sendo levadas

  const chase = createChase(camera, walker, () => !!S && (S.phase === 'walk' || S.phase === 'carry'));
  let S = null;

  function seat(id, on = true) {                          // senta (ou levanta) alguém na própria cadeira
    const c = chairs[id];
    if (id === 'K') {
      KS.visible = on; K.visible = !on;
      if (on) { KS.position.copy(c.position); KS.rotation.y = c.rotation.y; }
      return;
    }
    const p = people[id];
    if (on) { sitPose(p, 0.46); p.position.copy(c.position); p.rotation.y = c.rotation.y; } else standPose(p);
  }
  function reset() {
    for (const [id, deg] of Object.entries(SEATS)) { const c = chairs[id]; c.visible = true; c.position.copy(at(deg)); c.rotation.y = 0; faceTo(c, T0.x, T0.z, 1, 1e3); c.userData.mat.opacity = 1; }
    chairs.N.position.copy(LOOSE); chairs.N.rotation.y = 2.3;
    for (const id of ['A', 'B']) seat(id);
    seat('M'); people.M.visible = true; people.N.visible = false; people.A.visible = people.B.visible = true;
    for (const p of Object.values(people)) p.userData.mat.opacity = 1;
    K.visible = true; KS.visible = false; K.position.set(-5.2, 0, -5.4); K.rotation.y = 0.4;
    fig.visible = false; fig.userData.mat.opacity = 0; fig.position.set(0, -12, -9.5); fig.rotation.y = -Math.PI / 2;
    ringMat.opacity = 0; moteMat.opacity = 0;
    for (const f of flying) { scene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); } flying.length = 0;
    camera.fov = 50; camera.updateProjectionMatrix();
  }
  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true);
    chase.reset(); chase.update(0, true);
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, carry: false, talkIdx: -1, ev: {} };
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    if (S.carry) { walker.object.remove(chairs.N); scene.add(chairs.N); }
    walker.setSpeedMul(1); prompt(null); sfx.stop();
    if (talkBox.open) talkBox.hide();
    S = null;
  }
  const go = p => { S.phase = p; S.t = 0; };
  /** Uma frase comum do K vai até uma silhueta (verde → cinza). */
  function carryPhrase(text, from, to, delay = 0) {
    const s = textSprite(text, { color: '#c8f2c8', size: 0.26 }); s.position.copy(from).setY(1.6); s.material.opacity = 0; scene.add(s);
    flying.push({ s, from: from.clone().setY(1.6), to: to.clone().setY(1.5), t: -delay, d: 2.6 });
  }
  /** Pessoa (e cadeira) vira para longe da mesa, devagar. */
  function turnAway(id) { S.ev[id] = { t: 0 }; sfx.play('chair', 0.5); }

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    const move = S.phase === 'walk' || S.phase === 'carry';
    walker.update(dt, move ? input.axis() : { x: 0, z: 0 }, 'car', [{ x0: T0.x - 1.15, x1: T0.x + 1.15, z0: T0.z - 1.15, z1: T0.z + 1.15 }], FAR_VAN);
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    S.fade = Math.max(0, S.fade - dt);
    if (talkBox.open) { talkBox.update(dt); if (t > 0.25 && input.action()) talkBox.press(); }
    moteMat.opacity += ((S.phase === 'walk' ? 0.25 : S.phase === 'talk' ? 0.35 - 0.03 * Math.max(0, S.talkIdx) : S.phase === 'end' ? 0 : 0.7) - moteMat.opacity) * Math.min(1, dt * 2);
    const pos = moteGeo.attributes.position; for (let i = 0; i < MN; i++) { let y = pos.getY(i) + dt * 0.18; if (y > 3.2) y = 0; pos.setY(i, y); } pos.needsUpdate = true;
    for (const p of Object.values(people)) if (p.visible) p.userData.B.torso.scale.y = 1 + 0.012 * Math.sin(performance.now() * 0.002 + p.id);

    switch (S.phase) {
      case 'walk':
        chase.update(dt);
        if (Math.hypot(walker.x - T0.x, walker.z - T0.z) < 8.2) { go('welcome'); walker.setSpeedMul(0); S.mFrom = people.M.position.clone(); seat('M', false); }
        break;
      case 'welcome': {                                    // quem acolheu: levanta, vai até o K e o traz à mesa; afasta a cadeira dele
        shotTo(camera, [5.2, 3.0, 4.6], [-1.2, 0.9, -2.8], t < 0.05 ? 1 : Math.min(1, dt * 2));
        const M = people.M, kTo = chairs.K.position;
        if (t < 2.2) { const k = ease(t / 2.2); M.position.lerpVectors(S.mFrom, new THREE.Vector3(-4.3, 0, -4.4), k); faceTo(M, -5.2, -5.4, dt); M.position.y = Math.abs(Math.sin(t * 7)) * 0.03; }
        else if (t < 3.2) { faceTo(K, M.position.x, M.position.z, dt); M.userData.B.arms[1].sh.rotation.z = Math.min(1.2, (t - 2.2) * 2); }   // oferece a mão
        else if (t < 6.2) {                                // os dois vão juntos para a mesa
          M.userData.B.arms[1].sh.rotation.z *= 0.9; const k = ease((t - 3.2) / 3);
          const kp = new THREE.Vector3(-5.2, 0, -5.4).lerp(kTo.clone().add(new THREE.Vector3(-0.7, 0, -0.5)), k), prev = K.position.clone();
          K.position.copy(kp); faceTo(K, kTo.x, kTo.z, dt); walkK(K, dt, prev.distanceTo(kp));
          M.position.lerpVectors(new THREE.Vector3(-4.3, 0, -4.4), chairs.M.position.clone().add(new THREE.Vector3(0.4, 0, 0.6)), k); faceTo(M, chairs.M.position.x, chairs.M.position.z, dt);
          if (t > 5.2 && !S.pulled) { S.pulled = true; sfx.play('chair', 0.6); }
        } else if (!S.sat) { S.sat = true; seat('K'); seat('M'); sfx.play('place', 0.4); }
        if (t > 7.4) { go('third'); people.N.visible = true; people.N.position.set(5.6, 0, -4.8); people.N.rotation.y = Math.PI; people.N.userData.mat.opacity = 0; }
        break;
      }
      case 'third': {                                      // alguém novo chega; o K levanta e a recebe
        shotTo(camera, [5.2, 3.0, 4.6], [1.4, 0.9, -3.0], Math.min(1, dt * 1.5));
        const N = people.N; N.userData.mat.opacity = Math.min(1, t / 1.2);
        if (t > 1.4 && !S.kUp) { S.kUp = true; seat('K', false); K.position.copy(chairs.K.position); }
        if (t > 1.6 && t < 4.6) { const k = ease((t - 1.6) / 3), prev = K.position.clone(); K.position.lerpVectors(chairs.K.position, new THREE.Vector3(4.4, 0, -4.2), k); faceTo(K, 5.6, -4.8, dt); walkK(K, dt, prev.distanceTo(K.position)); }
        if (t > 4.6) { faceTo(K, 5.6, -4.8, dt); const a = K.userData.arms[1]; a.sh.rotation.x = Math.min(0.9, (t - 4.6) * 1.5); faceTo(N, K.position.x, K.position.z, dt); }   // acena para ela entrar
        if (t > 6.2) { go('carry'); walker.setSpeedMul(1); ringMat.opacity = 0.0; }
        break;
      }
      case 'carry': {                                      // o jogador pega a cadeira solta e coloca no lugar marcado
        chase.update(dt);
        ringMat.opacity = S.carry ? 0.55 + 0.25 * Math.sin(t * 4) : 0.25;
        const d = Math.hypot(walker.x - chairs.N.position.x, walker.z - chairs.N.position.z);
        const dr = Math.hypot(walker.x - ring.position.x, walker.z - ring.position.z);
        if (!S.carry) {
          prompt(d < 1.6 ? 'E — Pegar a cadeira' : null, input);
          if (d < 1.6 && input.action()) { S.carry = true; scene.remove(chairs.N); walker.object.add(chairs.N); chairs.N.position.set(0.55, 0.15, 0); chairs.N.rotation.set(0, 0, 0); sfx.play('chair', 0.4); }
        } else {
          prompt(dr < 1.5 ? 'E — Colocar a cadeira' : null, input);
          if (dr < 1.5 && input.action()) {
            S.carry = false; walker.object.remove(chairs.N); scene.add(chairs.N); chairs.N.position.copy(ring.position).setY(0); faceTo(chairs.N, T0.x, T0.z, 1, 1e3);
            sfx.play('place', 0.6); prompt(null); ringMat.opacity = 0; go('seatN'); walker.setSpeedMul(0); S.nFrom = people.N.position.clone();
          }
        }
        break;
      }
      case 'seatN': {                                      // ela senta na cadeira que o jogador trouxe; o K volta ao lugar dele
        shotTo(camera, [5.0, 3.2, 5.0], [0, 0.9, -2.2], Math.min(1, dt * 2));
        const k = ease(t / 2.6), N = people.N, prev = K.position.clone();
        N.position.lerpVectors(S.nFrom, chairs.N.position.clone().add(new THREE.Vector3(0.6, 0, 0.4)), k); faceTo(N, chairs.N.position.x, chairs.N.position.z, dt);
        K.position.lerpVectors(new THREE.Vector3(4.4, 0, -4.2), chairs.K.position.clone().add(new THREE.Vector3(-0.6, 0, 0.3)), k); faceTo(K, chairs.K.position.x, chairs.K.position.z, dt); walkK(K, dt, prev.distanceTo(K.position));
        if (t > 2.8 && !S.sat2) { S.sat2 = true; seat('N'); seat('K'); sfx.play('place', 0.4); }
        if (t > 4.4) { go('talk'); fig.visible = true; startTalk(); }
        break;
      }
      case 'talk': case 'end': {
        const k = Math.min(1, t / 1.4);
        if (S.phase === 'talk') { fig.userData.mat.opacity = Math.min(1, t / 0.8); fig.position.y = -12 * (1 - ease(Math.min(1, t / 1.6))); }
        shotTo(camera, [5.6, 3.8, 5.8], [-0.3, 2.0, -4.6], S.phase === 'talk' && t < 0.05 ? 1 : Math.min(1, dt * 1.2));
        // eventos das falas
        for (const [id, e] of Object.entries(S.ev)) {
          if (id === 'fig') continue;
          e.t += dt; const kk = ease(e.t / 2.2), c = chairs[id], p = people[id];
          if (id === 'K') {                                // a cadeira do K desliza para longe da mesa (com ele)
            const dir = c.position.clone().sub(T0).setY(0).normalize(); if (!e.from) e.from = c.position.clone();
            c.position.copy(e.from).addScaledVector(dir, 2.6 * kk); KS.position.copy(c.position);
          } else { if (e.r0 == null) e.r0 = c.rotation.y; c.rotation.y = e.r0 + Math.PI * 0.85 * kk; if (p) p.rotation.y = c.rotation.y; }
        }
        for (let i = flying.length - 1; i >= 0; i--) {
          const f = flying[i]; f.t += dt; if (f.t < 0) continue;
          const kk = Math.min(1, f.t / f.d), e = ease(kk);
          f.s.position.lerpVectors(f.from, f.to, e); f.s.position.y += Math.sin(kk * Math.PI) * 0.9;
          f.s.material.opacity = kk < 0.15 ? kk / 0.15 : kk > 0.8 ? (1 - kk) / 0.2 : 1;
          f.s.material.color.lerpColors(new THREE.Color('#ffffff'), new THREE.Color('#8a8a8a'), e);
          if (kk >= 1) { scene.remove(f.s); f.s.material.map.dispose(); f.s.material.dispose(); flying.splice(i, 1); }
        }
        if (S.ev.fig) {                                    // a figura passa para entre o K e o grupo
          S.ev.fig.t += dt; const kk = ease(S.ev.fig.t / 3.2), from = S.ev.fig.from, to = new THREE.Vector3((chairs.K.position.x + T0.x) / 2 - 1.2, 0, (chairs.K.position.z + T0.z) / 2 - 3.2);
          fig.position.lerpVectors(from, to, kk); fig.rotation.y = -Math.PI / 2 + 0.9 * kk;
        }
        if (S.phase === 'end') {
          const kk = clamp((t - 0.6) / 2.4, 0, 1);
          chairs.K.userData.mat.opacity = 1 - kk; chairs.K.visible = kk < 0.99; if (kk > 0.05 && KS.visible) { KS.visible = false; K.visible = true; K.position.copy(chairs.K.position).add(new THREE.Vector3(0.5, 0, 0)); K.rotation.y = chairs.K.rotation.y; }
          for (const id of ['M', 'A', 'B', 'N']) people[id].userData.mat.opacity = 1 - clamp((t - 1.5) / 2.5, 0, 1);
          fig.userData.mat.opacity = 1 - clamp((t - 2.5) / 2, 0, 1);
          memLight.intensity = 3 * (1 - clamp(t / 3, 0, 1));
          if (t > 4.2) S.fade = Math.min(1, (t - 4.2) / 2);
          if (t > 6.6 && !S.saved) { S.saved = true; try { localStorage.setItem(EXTRA2_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onDone; stop(); cb && cb(true); return; }
        }
        break;
      }
    }
  }
  function startTalk() {
    S.talkIdx = 0;
    const ev = i => {
      S.talkIdx = i;
      if (i === 2) carryPhrase(PHRASES[0], chairs.K.position, people.N.position);
      if (i === 3) carryPhrase(PHRASES[3], chairs.K.position, people.N.position, 0.4);
      if (i === 4) turnAway('N');
      if (i === 5) { S.ev.K = { t: 0 }; sfx.play('chair', 0.7); }
      if (i === 6) { carryPhrase(PHRASES[1], KS.position, people.M.position); carryPhrase(PHRASES[2], KS.position, people.A.position, 0.5); carryPhrase(PHRASES[4], KS.position, people.B.position, 1.0); }
      if (i === 7) { turnAway('M'); setTimeout(() => S && turnAway('A'), 500); setTimeout(() => S && turnAway('B'), 1000); carryPhrase(PHRASES[5], KS.position, people.M.position); carryPhrase(PHRASES[6], KS.position, people.B.position, 0.6); }
      if (i === 8) { S.ev.fig = { t: 0, from: fig.position.clone() }; sfx.play('whoosh', 0.3); }
      if (i === 9) KS.userData.head.rotation.z = -0.35;          // o K olha para baixo
    };
    talkBox.show(TALK, () => { if (S && S.phase === 'talk') go('end'); }, { hint: HINT, onAdvance: ev });
  }

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && S.phase !== 'walk' && S.phase !== 'carry'; },
    get carrying() { return !!S && S.carry; },
    _chairs: chairs, _people: people, _K: K, _fig: fig,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0;
      if (p === 'carry') { seat('M'); seat('K'); people.N.visible = true; people.N.userData.mat.opacity = 1; people.N.position.set(5.6, 0, -4.8); K.visible = true; KS.visible = false; K.position.set(4.4, 0, -4.2); walker.setSpeedMul(1); go('carry'); }
      else if (p === 'talk') { seat('M'); seat('N'); seat('K'); people.N.visible = true; chairs.N.position.copy(ring.position).setY(0); faceTo(chairs.N, T0.x, T0.z, 1, 1e3); seat('N'); people.N.userData.mat.opacity = 1; walker.setSpeedMul(0); go('talk'); fig.visible = true; startTalk(); }
      else go(p); },
  };
}
