// Nível extra 4 — Sacrifício. Pedaços da oficina destruída no vazio (bancada, porta, ferramentas, madeira molhada, telhado).
// O jogador junta as peças e põe na bancada; cada uma colocada faz outra parte perder o apoio. A vela roxa diminui a cada
// tentativa. Fim: a oficina se desfaz e ficam só a bancada e a vela (acesa). A figura tenta ocupar o quadro, o K aparece de
// verdade, cabisbaixo, entre o jogador e ela; a grade branca nasce no chão e a batalha começa sem voltar ao menu (ctx.onBattle).
// Nada do progresso normal, itens do Shop ou salvamentos é perdido (as peças daqui são só desta cena).
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { VOID, COL, line, makeFigure, makeK, makeBench, makeCandle, makePiece, makeFloorPiece, makeGridFloor, prompt, createChase, shotTo, createSfx, ease, clamp } from './storyKit.js';

export const EXTRA4_KEY = 'adress.extra.4';
const FAR_VAN = { x: 1e9, z: 1e9 };
const START = { x: 0.4, z: 15 };
const BENCH = new THREE.Vector3(0, 0, -3);
const ITEMS = [   // [tipo, x, z, rot]
  ['plank', -4.6, 0.6, 0.4], ['tools', 4.2, -0.6, -0.3], ['door', -3.6, -6.4, 1.2], ['roof', 4.6, -6.0, 0.6]];
const F = s => line('f', s);
const SAY = [[F('Ainda falta.'), F('Você não vai deixar assim.')], [F('Depois de tudo que investiu?')], [F('Descansar agora seria admitir.'), F('Mais uma coisa.')],
  [F('Só mais uma.'), F('Você ainda está de pé.')], [F('Então ainda pode oferecer alguma coisa.'), F('Quer que tenha valido a pena?'), F('Continue pagando.')]];

export function createExtra4(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  scene.add(new THREE.HemisphereLight('#d8d2e6', '#16141c', 0.85));
  const key = new THREE.DirectionalLight('#efe6ff', 1.1); key.position.set(-4, 9, 5); scene.add(key);
  const sfx = createSfx(audio);

  const shop = new THREE.Group(); scene.add(shop);                 // tudo o que se desfaz no fim
  for (const [x, z, w, d, r] of [[0, -3, 5, 3.4, 0], [-4.4, 0.4, 2.2, 1.8, 0.2], [4.2, -0.6, 2.0, 1.8, -0.15], [-3.6, -6.4, 2.6, 2.2, 0.1], [4.6, -6, 2.4, 2.0, -0.1], [0.3, 2.4, 2.0, 1.6, 0], [-1.6, -7.4, 1.6, 1.2, 0.3]]) {
    const p = makeFloorPiece(w, d, '#4a3a2c'); p.position.set(x, 0, z); p.rotation.y = r; shop.add(p);
  }
  const bench = makeBench(); bench.position.copy(BENCH); scene.add(bench);
  const candle = makeCandle(0.5); candle.position.set(BENCH.x + 0.7, 0.98, BENCH.z + 0.1); scene.add(candle);
  // o que ainda resta de pé (perde o apoio, um por vez): 2 esteios, um painel de telhado apoiado neles, uma viga
  const postM = new THREE.MeshStandardMaterial({ color: '#5a3f28', roughness: 0.9 });
  const parts = [];
  const mkPost = (x, z) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.4, 0.22), postM); p.geometry.translate(0, 1.7, 0); p.position.set(x, 0, z); shop.add(p); return p; };
  const postA = mkPost(-2.4, -4.6), postB = mkPost(2.4, -4.6);
  const roofP = makePiece('roof'); roofP.position.set(0, 3.4, -4.6); roofP.rotation.set(0.12, 0, 0); roofP.scale.set(2.8, 1, 1.4); shop.add(roofP);
  const beam = makePiece('beam'); beam.position.set(0, 3.3, -4.6); shop.add(beam);
  parts.push({ o: postA, kind: 'tip', ax: 'z', s: 1 }, { o: roofP, kind: 'slide' }, { o: null, kind: 'offBench' }, { o: beam, kind: 'drop' });
  // as peças para juntar
  const items = ITEMS.map(([k, x, z, r]) => { const o = makePiece(k); o.position.set(x, 0.02, z); o.rotation.y = r; shop.add(o); return { o, k, x, z, r, placed: false }; });
  const glow = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.65, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COL.roxo, transparent: true, opacity: 0.0, depthWrite: false, toneMapped: false }));
  scene.add(glow);
  const fig = makeFigure(1); scene.add(fig);
  const K = makeK(); scene.add(K);
  const grid = makeGridFloor(14, 18); grid.position.set(0, 0, -1); scene.add(grid);

  const chase = createChase(camera, walker, () => !!S && S.phase === 'work');
  let S = null;
  function reset() {
    items.forEach(it => { it.placed = false; it.o.visible = true; it.o.position.set(it.x, 0.02, it.z); it.o.rotation.set(0, it.r, 0); if (it.o.parent !== shop) { it.o.parent && it.o.parent.remove(it.o); shop.add(it.o); } });
    postA.rotation.set(0, 0, 0); postB.rotation.set(0, 0, 0); roofP.position.set(0, 3.4, -4.6); roofP.rotation.set(0.12, 0, 0); beam.position.set(0, 3.3, -4.6); beam.rotation.set(0, 0, 0);
    parts.forEach(p => { p.t = -1; });
    shop.visible = true; shop.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1; } });
    candle.userData.set(1);
    fig.visible = true; fig.userData.mat.opacity = 0; fig.position.set(0, 0, -16); fig.rotation.y = -Math.PI / 2; fig.scale.set(4.6, 5, 4.6);
    K.visible = false; K.position.set(0.3, 0, 4); K.rotation.y = Math.PI / 2;
    grid.userData.mat.uniforms.uAmt.value = 0; grid.visible = false;
    camera.fov = 50; camera.updateProjectionMatrix();
  }
  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true);
    chase.reset(); chase.update(0, true);
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, carry: null, placed: 0, said: 0 };
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    if (S.carry) { walker.object.remove(S.carry.o); shop.add(S.carry.o); }
    walker.setSpeedMul(1); prompt(null); sfx.stop(); if (talkBox.open) talkBox.hide();
    S = null;
  }
  const go = p => { S.phase = p; S.t = 0; };
  const say = ls => { talkBox.show(ls, null, { auto: true }); };   // falas automáticas (o jogador continua mexendo)
  /** Uma parte perde o apoio (animação curta). */
  function loseSupport(i) { const p = parts[i]; if (!p) return; p.t = 0; sfx.play(p.kind === 'offBench' ? 'place' : 'fall', 0.6); }
  function updateParts(dt) {
    for (const p of parts) {
      if (p.t < 0) continue; p.t += dt; const k = ease(Math.min(1, p.t / 1.3));
      if (p.kind === 'tip') p.o.rotation.z = -1.35 * k * k;
      else if (p.kind === 'slide') { p.o.rotation.x = 0.12 + 0.9 * k; p.o.position.y = 3.4 - 2.6 * k; p.o.position.z = -4.6 - 0.9 * k; }
      else if (p.kind === 'drop') { p.o.position.y = 3.3 - 3.1 * k; p.o.rotation.z = 0.4 * k; }
      else if (p.kind === 'offBench') { const it = items.find(x => x.placed && x.k === 'plank'); if (it) { it.o.position.x = BENCH.x - 0.4 - 1.6 * k; it.o.position.y = 0.98 - 0.96 * k; it.o.rotation.z = 0.8 * Math.sin(k * Math.PI); } }
    }
  }
  const slots = [[-0.55, 0.98, 0.0, 0.1], [0.05, 0.98, -0.18, 0], [-0.2, 1.0, 0.12, 0.05], [0.1, 1.08, -0.05, 0.2]];

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt; const t = S.t;
    const move = S.phase === 'work' || S.phase === 'walk';
    walker.update(dt, move ? input.axis() : { x: 0, z: 0 }, 'car', [{ x0: BENCH.x - 1.25, x1: BENCH.x + 1.25, z0: BENCH.z - 0.5, z1: BENCH.z + 0.5 }], FAR_VAN);
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    S.fade = Math.max(0, S.fade - dt);
    if (talkBox.open) talkBox.update(dt);
    candle.userData.tick(dt); updateParts(dt);
    fig.userData.mat.opacity = Math.min(S.phase === 'walk' ? 0.0 : 1, fig.userData.mat.opacity + dt * 0.3);

    switch (S.phase) {
      case 'walk': case 'work': {
        if (S.phase === 'walk' && Math.hypot(walker.x - BENCH.x, walker.z - BENCH.z) < 8.5) { go('work'); say(SAY[0]); }
        if (S.phase === 'walk' && S.t < 0.05) walker.setSpeedMul(1);
        chase.update(dt);
        if (S.phase !== 'work') break;
        const dB = Math.hypot(walker.x - BENCH.x, walker.z - (BENCH.z + 0.9));
        if (!S.carry) {
          let best = null, bd = 1.5;
          for (const it of items) { if (it.placed) continue; const d = Math.hypot(walker.x - it.o.position.x, walker.z - it.o.position.z); if (d < bd) { bd = d; best = it; } }
          const next = items.find(it => !it.placed);
          if (next) { glow.position.set(next.o.position.x, 0.03, next.o.position.z); glow.material.opacity = 0.3 + 0.2 * Math.sin(t * 3); }
          prompt(best ? 'E — Pegar' : null, input);
          if (best && input.action()) { S.carry = best; shop.remove(best.o); walker.object.add(best.o); best.o.position.set(0.55, 0.85, 0); best.o.rotation.set(0, Math.PI / 2, 0.3); sfx.play('place', 0.3); prompt(null); }
        } else {
          glow.position.set(BENCH.x, 0.03, BENCH.z + 0.9); glow.material.opacity = 0.35 + 0.2 * Math.sin(t * 3);
          prompt(dB < 1.8 ? 'E — Colocar na bancada' : null, input);
          if (dB < 1.8 && input.action()) {
            const it = S.carry; S.carry = null; walker.object.remove(it.o); shop.add(it.o);
            const sl = slots[S.placed]; it.o.position.set(BENCH.x + sl[0], sl[1], BENCH.z + sl[2]); it.o.rotation.set(0, sl[3], 0); if (it.k === 'door' || it.k === 'roof') it.o.scale.setScalar(0.6);
            it.placed = true; S.placed++; sfx.play('place', 0.7); prompt(null);
            candle.userData.set(1 - 0.19 * S.placed);       // a vela diminui a cada tentativa
            setTimeout(() => { if (S) loseSupport(S.placed - 1); }, 700);
            say(SAY[S.placed]);
            if (S.placed >= items.length) { glow.material.opacity = 0; go('wait'); walker.setSpeedMul(0); }
          }
        }
        break;
      }
      case 'wait':                                         // as últimas falas terminam
        chase.update(dt);
        if (!talkBox.open && t > 1.5) go('dissolve');
        break;
      case 'dissolve': {                                   // a oficina se desfaz; ficam a bancada e a vela (acesa)
        const k = clamp(t / 3.2, 0, 1);
        shotTo(camera, [walker.x + 1.4, 2.0, walker.z + 3.8], [BENCH.x, 1.6, BENCH.z - 3], t < 0.05 ? 1 : Math.min(1, dt * 1.5));
        shop.traverse(o => { if (o.isMesh) o.material.opacity = 1 - k; });
        shop.children.forEach((c, i) => { c.position.y -= dt * (0.4 + (i % 5) * 0.25) * k * 3; c.rotation.x += dt * 0.3 * (i % 3 - 1); });
        if (t > 3.4) { shop.visible = false; go('fill'); S.f0 = fig.position.clone(); sfx.play('whoosh', 0.5); }
        break;
      }
      case 'fill': {                                       // a figura tenta ocupar o quadro
        const k = ease(clamp(t / 3.0, 0, 1));
        const cam = new THREE.Vector3(walker.x + 1.0, 1.8, walker.z + 3.4);
        shotTo(camera, cam.toArray(), [BENCH.x * 0.5, 2.4, BENCH.z - 2], 1);
        fig.position.lerpVectors(S.f0, new THREE.Vector3(walker.x - 0.6, 0, walker.z - 6.5), k); fig.scale.set(4.6 + 2.6 * k, 5 + 3 * k, 4.6 + 2.6 * k);
        if (t > 3.2) { go('k'); K.visible = true; { let kx = walker.x + 1.3, kz = walker.z - 2.4; if (Math.abs(kx - BENCH.x) < 1.7 && Math.abs(kz - BENCH.z) < 0.9) kx = BENCH.x + 1.8; K.position.set(kx, 0, kz); } K.rotation.y = Math.PI / 2; K.userData.head.rotation.z = -0.45; sfx.play('thud', 0.35); }
        break;
      }
      case 'k': {                                          // o K, cabisbaixo, entre o jogador e a figura; a grade nasce no chão
        const cam = new THREE.Vector3(walker.x + 1.0, 1.8, walker.z + 3.4);
        shotTo(camera, cam.toArray(), [K.position.x, 1.6, K.position.z - 3], Math.min(1, dt * 1.5));
        K.userData.torso.scale.y = 1 + 0.012 * Math.sin(t * 2);
        if (t > 1.6) { grid.visible = true; grid.position.set(K.position.x, 0, K.position.z - 3); grid.userData.mat.uniforms.uAmt.value = ease(clamp((t - 1.6) / 2.2, 0, 1)); }
        if (t > 4.4) S.fade = Math.min(1, (t - 4.4) / 0.8);
        if (t > 5.3 && !S.done) { S.done = true; try { localStorage.setItem(EXTRA4_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onBattle; stop(); cb && cb(); return; }
        break;
      }
    }
  }
  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && S.phase !== 'walk' && S.phase !== 'work'; },
    get placed() { return S ? S.placed : 0; }, get candle() { return candle.userData.k; }, get carrying() { return !!(S && S.carry); },
    items, _bench: bench, _K: K, _fig: fig,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0; go(p); },
  };
}
