// Nível extra 4 — Sacrifício.
// A oficina destruída do Bairro 24 (a mesma, no estado em que o temporal a deixou), em pedaços que flutuam no vazio.
// Começa simples: recolher duas peças e pô-las na bancada (um instante de ordem). Então a figura torna cada tarefa
// insuficiente: uma viga cede — segurar sustenta, mas enquanto o jogador segura a vela roxa queima mais depressa e outra
// exigência aparece (a porta se soltando lá na frente; depois a bancada rachando e derrubando o que foi posto nela).
// Não dá para estar em dois lugares. Poucas repetições: três exigências e, por fim, todas ao mesmo tempo.
// Não há como atender tudo: a oficina se desfaz, ficam a bancada e a vela (pequena, acesa). A figura tenta ocupar o
// quadro. Pela primeira vez o K aparece de verdade (sem a luz de lembrança), abatido, entre o jogador e ela. A grade
// branca nasce no chão e a batalha começa sem voltar ao menu. Nada do progresso normal, do Shop ou dos salvamentos muda.
import * as THREE from 'three';
import { whitenFade, setWhiteGlow } from './whiteout.js';
import { reachArm } from './models/reader.js';
import { VOID, COL, line, makeFigure, makeK, makePiece, makeFloorPiece, makeGridFloor, prompt, createSfx, createDrone, createChase, attachAssist, walkerArms, shotTo, faceTo, ease, clamp } from './storyKit.js';
import { buildWorkshopSet } from './memorySets.js';

export const EXTRA4_KEY = 'adress.extra.4';
const FAR_VAN = { x: 1e9, z: 1e9 };
const START = { x: 0, z: 9.6 };
const F = (s, p = 0) => line('f', s, p);
const L = {
  falta: F('Ainda falta.'), assim: F('Você não vai deixar assim.'), investiu: F('Depois de tudo que investiu?'), admitir: F('Descansar agora seria admitir.'),
  mais: F('Mais uma coisa.'), uma: F('Só mais uma.'), pe: F('Você ainda está de pé.'), oferecer: F('Então ainda pode oferecer alguma coisa.'),
  valeu: F('Quer que tenha valido a pena?'), pagando: F('Continue pagando.'),
};
const BENCH_FRONT = new THREE.Vector3(0.2, 0, 0.35);       // onde o jogador fica para usar a bancada
const SLOTS = [[-1.9, 1.02, -1.05, 0.15], [-0.2, 1.02, -1.15, -0.1]];

export function createExtra4(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.Fog(VOID, 18, 46);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#d6d0e4', '#131218', 0.65); scene.add(hemi);
  const key = new THREE.DirectionalLight('#e6e0ff', 0.75); key.position.set(-5, 10, 6); scene.add(key);
  const kLight = new THREE.SpotLight('#fff1dc', 0, 9, 0.5, 0.7, 1.4); scene.add(kLight); scene.add(kLight.target);
  const sfx = createSfx(audio), drone = createDrone(audio, 49);

  const set = buildWorkshopSet(); scene.add(set.g);
  const { candle, ws } = set;
  const startPiece = makeFloorPiece(3.0, 2.6, '#5b4a38'); startPiece.position.set(START.x, 0, START.z); scene.add(startPiece);
  // as duas peças para recolher (mesmo aspecto da oficina): a tábua velha molhada e a caixa de ferragens
  const pieces = [
    { o: makePiece('plank'), x: -3.4, z: 4.4, r: 0.4, name: 'a tábua' },
    { o: makePiece('tools'), x: 3.5, z: 4.5, r: -0.3, name: 'a caixa' },
  ];
  for (const p of pieces) { p.o.position.set(p.x, 0.04, p.z); p.o.rotation.y = p.r; scene.add(p.o); }
  const ringMat = new THREE.MeshBasicMaterial({ color: COL.roxo, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.66, 40).rotateX(-Math.PI / 2), ringMat); scene.add(ring);
  const fig = makeFigure(1); scene.add(fig);
  const K = makeK(); K.visible = false; scene.add(K);
  const grid = makeGridFloor(16, 14); grid.visible = false; scene.add(grid);
  // a porta: a folha real da oficina (pendurada por uma dobradiça)
  const door = ws.doorPivot, doorWorld = () => door.getWorldPosition(new THREE.Vector3());

  const chase = createChase(camera, walker, () => !!S && S.free, { dist: 5.6, pitch: 0.3 });
  const assist = attachAssist(chase, walker, input);
  let S = null;
  const _head = new THREE.Vector3();
  const queue = [];
  const say = k => queue.push(L[k]);
  function pumpLines(dt) {
    if (talkBox.open) { talkBox.update(dt); return; }
    if (!queue.length) return;
    const l = queue.shift(); if (l.who === 'f') sfx.play('presence', 0.85);
    talkBox.show([l], null, { auto: true });
  }

  function reset() {
    set.reset(); set.float(0, 1);
    for (const p of pieces) { if (p.o.parent !== scene) { p.o.parent && p.o.parent.remove(p.o); scene.add(p.o); } p.o.position.set(p.x, 0.04, p.z); p.o.rotation.set(0, p.r, 0); p.o.scale.setScalar(1); p.placed = false; p.o.visible = true; }
    door.rotation.set(0, 0.75, 0); door.position.y = 0;
    set.g.traverse(o => { if (o.isMesh && o.material && !o.material.userData.keepOp) { o.material.transparent = true; o.material.opacity = 1; } });
    set.g.visible = true; candle.visible = true; set.candle.userData.set(1);
    fig.visible = true; fig.userData.mat.opacity = 0; fig.position.set(-1.2, 0, -15); fig.rotation.y = -Math.PI / 2; fig.scale.set(4.6, 5, 4.6);
    K.visible = false; grid.visible = false; grid.userData.mat.uniforms.uAmt.value = 0; kLight.intensity = 0;
    ringMat.opacity = 0; queue.length = 0; camera.fov = 52; camera.updateProjectionMatrix();
  }
  // onde se pisa: dentro da oficina (as placas do chão) e a placa de entrada
  const walkable = (x, z) => (Math.abs(x) < 5.1 && z > -0.55 && z < 8.0) || (Math.abs(x - START.x) < 1.5 && z > 7.6 && z < 11);

  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true); setWhiteGlow(0.2);
    walker.setArea(walkable); walkerArms(walker);
    chase.reset(); chase.update(0, true);
    S = { phase: 'enter', t: 0, white: null, wk: 0, fade: 1, free: true, carry: null, placed: 0, hold: null, holdT: 0, d: {}, seen: {}, burn: 0, figStep: 0 };
    drone.level(0.15);
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    if (S.carry) { walker.object.remove(S.carry.o); scene.add(S.carry.o); }
    reachArm(walker.object, 1, new THREE.Vector3(), 0); reachArm(walker.object, -1, new THREE.Vector3(), 0);
    walker.setArea(null); walker.setSpeedMul(1); prompt(null); sfx.stop(); drone.stop(); setWhiteGlow(0);
    if (talkBox.open) talkBox.hide(); queue.length = 0;
    S = null;
  }
  const go = (p, free) => { S.phase = p; S.t = 0; if (free !== undefined) S.free = free; };

  // ---- as exigências: viga (cede), porta (se solta), bancada (racha) ----
  // cada uma: k = quanto já caiu (0..1); segurar E perto = sustenta (volta um pouco), a vela queima mais rápido
  const D = {
    beam: { at: () => set.beamTip(new THREE.Vector3()).setY(0), rate: 0.11, set: k => set.setBeam(k), hold: () => set.beamTip(new THREE.Vector3()), name: 'Sustentar' },
    door: { at: () => doorWorld().add(new THREE.Vector3(1.1, 0, -0.5)).setY(0), rate: 0.16, set: k => { door.rotation.set(0, 0.75 + 0.9 * k, -0.25 * k); door.position.y = -0.4 * k * k; }, hold: () => doorWorld().add(new THREE.Vector3(1.0, 1.6, -0.3)), name: 'Segurar a porta' },
    bench: { at: () => BENCH_FRONT.clone(), rate: 0.18, set: k => { for (const p of pieces) if (p.placed) { p.o.position.z = p.slot[2] + 0.9 * k; p.o.position.y = Math.max(0.04, p.slot[1] - 1.6 * k * k); p.o.rotation.x = 0.9 * k; } }, hold: () => new THREE.Vector3(0.2, 1.0, -0.9), name: 'Firmar a bancada' },
  };
  function startDemand(id) { if (S.d[id]) return; S.d[id] = { k: 0.02, done: false }; sfx.play('creak', 0.9); drone.level(0.25 + 0.15 * Object.keys(S.d).length); }
  /** Próxima etapa: cada exigência ganha o seu tempo (o segurar anterior não conta para a seguinte). */
  function stageTo(n) { S.stage = n; S.st0 = S.t; S.holdT = 0; S.heldIn = 0; }
  function updateDemands(dt) {
    let near = null, nd = 1.6;
    for (const [id, st] of Object.entries(S.d)) {
      if (st.done) continue;
      const p = D[id].at(), d = Math.hypot(walker.x - p.x, walker.z - p.z);
      if (d < nd) { nd = d; near = id; }
    }
    const holding = near && (input.held('KeyE') || input.held('Space'));
    S.hold = holding ? near : null;
    for (const [id, st] of Object.entries(S.d)) {
      if (st.done) continue;
      if (S.hold === id) st.k = Math.max(0.08, st.k - dt * 0.45); else st.k = Math.min(1, st.k + dt * D[id].rate * (S.overload ? 2.2 : 1));
      D[id].set(st.k);
      if (st.k >= 1) { st.done = true; sfx.play('fall', 0.9); sfx.play('thud', 0.6); }
    }
    // sustentar consome: a vela queima mais depressa enquanto o jogador segura
    if (S.hold) { S.burn += dt; set.candle.userData.set(Math.max(0.1, set.candle.userData.k - dt * 0.045)); S.holdT += dt; S.heldIn = (S.heldIn || 0) + dt; if (Math.floor(S.burn * 2) !== S.burnTick) { S.burnTick = Math.floor(S.burn * 2); sfx.play('burn', 0.5); } }
    else S.holdT = 0;
    S.holdId = S.hold;
    walker.setSpeedMul(S.hold ? 0 : 1);
    // braços erguidos no que segura
    const tgt = S.hold ? D[S.hold].hold() : null;
    const wa = walker.object; S.armK = (S.armK || 0) + ((tgt ? 1 : 0) - (S.armK || 0)) * Math.min(1, dt * 8);
    if (tgt) S.armT = tgt;
    if (S.armT) { reachArm(wa, 1, S.armT.clone().add(new THREE.Vector3(0.2, 0, 0)), S.armK); reachArm(wa, -1, S.armT.clone().add(new THREE.Vector3(-0.2, 0, 0)), S.armK); }
    const left = Object.entries(S.d).filter(([, s]) => !s.done);
    prompt(near ? (holding ? 'Segurando…' : 'Segure E — ' + D[near].name) : null, input);
    if (near) { const p = D[near].at(); ring.position.set(p.x, 0.03, p.z); ringMat.opacity = 0.35 + 0.2 * Math.sin(S.t * 4); } else ringMat.opacity = 0;
    return left.length;
  }
  /** A figura chega mais perto entre uma exigência e outra — só quando ninguém está olhando para ela. */
  function figCloser(n) {
    camera.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    if (fr.containsPoint(fig.position.clone().setY(4))) return false;
    const z = [-15, -11.5, -8.2, -5.6][Math.min(3, n)]; fig.position.set(-1.2 + n * 0.5, 0, z); return true;
  }

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    if (S.phase !== 'gather' && S.phase !== 'demands' && S.phase !== 'enter') walker.setSpeedMul(0);
    walker.update(dt, S.free && !S.hold ? input.axis() : { x: 0, z: 0 }, 'car', [{ x0: -3.6, x1: 3.6, z0: -1.55, z1: -0.65 }], FAR_VAN);
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    if (S.phase !== 'cut') S.fade = Math.max(0, S.fade - dt);
    pumpLines(dt); candle.userData.tick(dt);
    if (S.phase !== 'dissolve' && S.phase !== 'fill' && S.phase !== 'present' && S.phase !== 'cut') set.float(t, 1);
    set.memory.flicker(t);
    drone.update(dt);
    if (Math.random() < dt * 1.4) sfx.play('drip', 0.35);
    fig.userData.mat.opacity += ((S.phase === 'enter' ? 0.25 : 1) - fig.userData.mat.opacity) * Math.min(1, dt * 0.4);
    if (S.free) { chase.update(dt); set.occlude(camera.position, _head.set(walker.x, 1.35, walker.z), dt); }

    switch (S.phase) {
      case 'enter':                                          // só o gotejar; a figura, longe e quase apagada
        assist.update(dt, new THREE.Vector3(0, 1, -1), 1.6, 0.8);
        if (walker.z < 7.2) go('gather', true);
        break;
      case 'gather': {                                       // começa simples: duas peças na bancada
        const db = Math.hypot(walker.x - BENCH_FRONT.x, walker.z - BENCH_FRONT.z);
        if (!S.carry) {
          let best = null, bd = 1.5; for (const p of pieces) { if (p.placed) continue; const d = Math.hypot(walker.x - p.o.position.x, walker.z - p.o.position.z); if (d < bd) { bd = d; best = p; } }
          const next = pieces.find(p => !p.placed); if (next) { ring.position.set(next.o.position.x, 0.03, next.o.position.z); ringMat.opacity = 0.3 + 0.2 * Math.sin(t * 3); }
          prompt(best ? 'E — Pegar ' + best.name : null, input);
          assist.update(dt, next ? next.o.position : null, 2.0, 0.6);
          if (best && input.action()) { S.carry = best; scene.remove(best.o); walker.object.add(best.o); best.o.position.set(0.55, 0.85, 0); best.o.rotation.set(0, Math.PI / 2, 0.3); sfx.play('place', 0.3); prompt(null); }
        } else {
          ring.position.set(BENCH_FRONT.x, 0.03, BENCH_FRONT.z); ringMat.opacity = 0.35 + 0.2 * Math.sin(t * 3);
          prompt(db < 1.7 ? 'E — Pôr na bancada' : null, input); assist.update(dt, new THREE.Vector3(0, 1, -1), 2.0, 0.6);
          if (db < 1.7 && input.action()) {
            const p = S.carry; S.carry = null; walker.object.remove(p.o); scene.add(p.o); p.slot = SLOTS[S.placed];
            p.o.position.set(p.slot[0], p.slot[1], p.slot[2]); p.o.rotation.set(0, p.slot[3], 0); p.placed = true; S.placed++;
            sfx.play('place', 0.7); prompt(null); ringMat.opacity = 0;
            set.candle.userData.set(set.candle.userData.k - 0.08);                     // cada tentativa de resolver tudo a diminui
            if (S.placed === 1) say('falta');
            if (S.placed === 2) { go('give', true); sfx.play('creak', 1); }           // a última peça posta: outra parte perde o apoio
          }
        }
        break;
      }
      case 'give':                                           // um instante de ordem — e o escoramento da viga escorrega
        assist.update(dt, set.beamTip(new THREE.Vector3()), 0.3, 1.4);
        if (t > 0.8) { go('demands', true); startDemand('beam'); stageTo(1); say('assim'); figCloser(1); }
        break;
      case 'demands': {
        const left = updateDemands(dt);
        const focus = S.d.door && !S.d.door.done && S.hold !== 'door' ? doorWorld() : S.d.bench && !S.d.bench.done && S.hold !== 'bench' ? new THREE.Vector3(0, 1, -1) : set.beamTip(new THREE.Vector3());
        assist.update(dt, focus, 1.8, 0.7);
        // segurar uma coisa faz aparecer outra (cada etapa espera o jogador sustentar a anterior, ou ela cair, ou um tempo)
        const since = t - S.st0;
        if (S.stage === 1 && since > 1.0 && (S.heldIn > 1.6 || S.d.beam.k > 0.6 || since > 8)) { stageTo(2); startDemand('door'); say('investiu'); }
        else if (S.stage === 2 && since > 1.0 && ((S.holdId === 'door' && S.holdT > 1.4) || S.d.door.done || S.d.beam.done || since > 8)) { stageTo(3); startDemand('bench'); say('admitir'); say('mais'); figCloser(2); }
        else if (S.stage === 3 && since > 1.0 && ((S.holdId === 'bench' && S.holdT > 1.2) || S.d.bench.k > 0.6 || since > 7)) {   // por fim, tudo ao mesmo tempo
          stageTo(4); S.overload = true; say('uma'); say('pe'); say('oferecer'); figCloser(3);
          for (const id of ['beam', 'door', 'bench']) if (!S.d[id] || !S.d[id].done) { if (S.d[id]) S.d[id].k = Math.max(S.d[id].k, 0.25); else startDemand(id); }
        }
        if (S.stage === 4 && !S.seen.valeu && t > 0.5) { S.seen.valeu = 1; S.v0 = t; }
        if (S.stage === 4 && S.v0 && t - S.v0 > 3.0 && !S.seen.v2) { S.seen.v2 = 1; say('valeu'); say('pagando'); }
        if (S.stage === 4 && S.seen.v2 && (left === 0 || t - S.v0 > 9) && !talkBox.open && !queue.length) {
          prompt(null); ringMat.opacity = 0; S.hold = null; go('dissolve', false);
        }
        break;
      }
      case 'dissolve': {                                     // a oficina se desfaz; ficam a bancada e a vela (acesa)
        prompt(null);
        const k = ease(clamp(t / 3.4, 0, 1));
        if (set.candle.userData.k > 0.26) set.candle.userData.set(Math.max(0.26, set.candle.userData.k - dt * 0.12));   // muito pequena; a chama não apaga
        shotTo(camera, [walker.x + 1.6, 2.1, walker.z + 4.0], [0, 1.4, -1.5], t < 0.05 ? 1 : Math.min(1, dt * 1.5));
        set.float(S.t + 10, 1 + k * 9);
        set.root.traverse(o => { if (o.isMesh && o.parent !== ws.bench && !isBench(o)) { o.material.transparent = true; o.material.opacity = 1 - k; } });
        for (const id of ['floor']) set[id].children.forEach((c, i) => { c.position.y = -k * k * (6 + i); });
        set.beamG.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - k; } });
        for (const p of pieces) if (!p.placed) p.o.position.y -= dt * k * 3;
        reachArm(walker.object, 1, new THREE.Vector3(), 0); reachArm(walker.object, -1, new THREE.Vector3(), 0);
        drone.level(0.5);
        if (t > 3.6) { go('fill', false); S.f0 = fig.position.clone(); sfx.play('whoosh', 0.5); }
        break;
      }
      case 'fill': {                                         // a figura tenta ocupar todo o quadro
        const k = ease(clamp(t / 3.0, 0, 1));
        const cam = new THREE.Vector3(walker.x + 1.0, 1.8, walker.z + 3.4);
        shotTo(camera, cam.toArray(), [0, 2.6 + 1.5 * k, walker.z - 6], 1);
        const want = new THREE.Vector3(walker.x - 0.5, 0, walker.z - 6.0);
        fig.position.lerpVectors(S.f0, want, k); fig.scale.set(4.6 + 3.2 * k, 5 + 3.8 * k, 4.6 + 3.2 * k);
        if (t > 3.2) {
          go('present', false); K.visible = true;
          let kx = walker.x + 0.9, kz = walker.z - 2.6; K.position.set(kx, 0, kz); K.rotation.y = Math.PI / 2;
          K.userData.head.rotation.z = -0.5; K.userData.torso.rotation.z = -0.22;
          kLight.position.set(kx + 1.5, 4.5, kz + 3); kLight.target.position.set(kx, 1, kz); sfx.play('thud', 0.3); drone.level(0.2);
        }
        break;
      }
      case 'present': {                                      // o K, de verdade, abatido, entre o jogador e ela; a grade nasce
        const cam = new THREE.Vector3(walker.x + 1.3, 1.75, walker.z + 3.6);
        shotTo(camera, cam.toArray(), [K.position.x - 0.4, 1.55, K.position.z - 3], Math.min(1, dt * 1.4));
        kLight.intensity = Math.min(5, t * 3);
        K.userData.torso.scale.y = 1 + 0.014 * Math.sin(t * 1.7);                    // respira (está aqui)
        if (t > 1.6) { grid.visible = true; grid.position.set(K.position.x - 0.2, 0, K.position.z - 2); grid.userData.mat.uniforms.uAmt.value = ease(clamp((t - 1.6) / 2.4, 0, 1)); }
        if (t > 4.6) go('cut', false);
        break;
      }
      case 'cut':
        S.fade = Math.min(1, t / 0.8);
        if (t > 0.95 && !S.done) { S.done = true; try { localStorage.setItem(EXTRA4_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onBattle; stop(); cb && cb(); return; }
        break;
    }
  }
  const benchParts = new Set(); ws.bench.traverse(o => benchParts.add(o));
  const isBench = o => benchParts.has(o);

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && !S.free; },
    get placed() { return S ? S.placed : 0; }, get candle() { return set.candle.userData.k; }, get carrying() { return !!(S && S.carry); },
    get demands() { return S ? Object.fromEntries(Object.entries(S.d).map(([k, v]) => [k, { k: +v.k.toFixed(2), done: v.done }])) : {}; }, get stage() { return S ? S.stage || 0 : 0; },
    get holding() { return S ? S.hold : null; },
    pieces, _set: set, _K: K, _fig: fig, D,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0; go(p, true); },
  };
}
