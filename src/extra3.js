// Nível extra 3 — Covardia. Uma rua curta com neve no vazio, um poste com luz laranja e, ao fundo, um lugar quente.
// Memória (inventada, coerente com o resgate na nevasca): o K atravessa a tempestade para levar alguém caído no poste até o lugar
// quente. O jogador anda com dificuldade (vento, passo reduzido). Uma silhueta oferece a mão; o K desvia e esconde a mão que
// treme. Sinais do esforço real: ele se curva contra o vento, escorrega, ajoelha para levantar a pessoa, respira com vapor.
// Ao chegar, a luz do lugar se apaga; o poste fica. Salva EXTRA3_KEY e volta à tela inicial.
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { walkK, reachArm } from './models/reader.js';
import { VOID, line, makeFigure, makeK, makeSilhouette, makeLampPost, createChase, shotTo, createSfx, faceTo, ease, clamp } from './storyKit.js';

export const EXTRA3_KEY = 'adress.extra.3';
const FAR_VAN = { x: 1e9, z: 1e9 };
const START = { x: -0.6, z: 16 };
const POST = new THREE.Vector3(2.4, 0, -4);
const DOOR = new THREE.Vector3(0.4, 0, -29.5);
const TALK = ['Você sabia o que precisava fazer.', 'Só não queria que alguém visse quanto custava.', 'Foi medo?', 'Pode chamar de cuidado, se preferir.',
  'Você tem tantas palavras para não dizer essa.', 'Ajudar alguém é mais confortável.', 'Você fica do lado que parece forte.', 'Mas quando é você…',
  'Você espera que ninguém perceba.', 'Até a sua coragem precisa de uma testemunha que não faça perguntas.'].map(s => line('f', s));

export function createExtra3(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.Fog(VOID, 14, 46);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#c9d4e6', '#15161c', 0.55); scene.add(hemi);
  const sfx = createSfx(audio);

  // rua: faixa de neve, calçadas, montinhos
  const snowM = new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9, 54).rotateX(-Math.PI / 2), snowM); ground.position.set(0, 0, -7); scene.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 54).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b9bec8', roughness: 1 })); road.position.set(0, 0.005, -7); scene.add(road);
  const moundM = new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 1 });
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5 + Math.random() * 0.6, 10, 6), moundM); m.scale.y = 0.35; m.position.set((Math.random() < 0.5 ? -1 : 1) * (3.2 + Math.random() * 1.2), 0, 18 - i * 2 + Math.random()); scene.add(m); }
  const post = makeLampPost(); post.position.copy(POST); post.rotation.y = Math.PI; scene.add(post);
  // o lugar quente: fachada com porta e janela acesas
  const warm = new THREE.Group(); warm.position.set(DOOR.x, 0, DOOR.z - 0.6); scene.add(warm);
  const wallM = new THREE.MeshStandardMaterial({ color: '#4a3a30', roughness: 0.9 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 0.5), wallM); wall.position.y = 2.1; warm.add(wall);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 1 })); roof.position.set(0, 4.4, 0.3); warm.add(roof);
  const litM = new THREE.MeshBasicMaterial({ color: '#ffb066', toneMapped: false });
  const doorM = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), litM); doorM.position.set(0, 1.1, 0.27); warm.add(doorM);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.0), litM); win.position.set(2.2, 2.2, 0.27); warm.add(win);
  const warmLight = new THREE.PointLight('#ff9a4a', 22, 16, 1.4); warmLight.position.set(0, 1.6, 1.4); warm.add(warmLight);
  // pessoas da memória
  const K = makeK(); scene.add(K);
  const fallen = makeSilhouette('#5f6068', { scale: 0.9 }); scene.add(fallen);
  const helper = makeSilhouette('#6a6662', { hair: true }); scene.add(helper);
  const fig = makeFigure(1.15); scene.add(fig);
  // neve caindo (em volta da câmera)
  const SN = 900, sp = new Float32Array(SN * 3), sGeo = new THREE.BufferGeometry();
  for (let i = 0; i < SN; i++) { sp[i * 3] = (Math.random() - 0.5) * 26; sp[i * 3 + 1] = Math.random() * 12; sp[i * 3 + 2] = (Math.random() - 0.5) * 26; }
  sGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const flakes = new THREE.Points(sGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.06, transparent: true, opacity: 0.85, depthWrite: false })); flakes.frustumCulled = false; scene.add(flakes);
  // vapor da respiração do K (prova do esforço)
  const puffs = []; const puffM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), puffM.clone()); p.visible = false; scene.add(p); puffs.push({ m: p, t: 9 }); }
  // pegadas do K na neve
  const stepM = new THREE.MeshBasicMaterial({ color: '#a4abb6', transparent: true, opacity: 0.7, depthWrite: false });
  const steps = new THREE.Group(); scene.add(steps);

  const chase = createChase(camera, walker, () => !!S && (S.phase === 'walk' || S.phase === 'cross'));
  let S = null;

  function reset() {
    K.position.set(-3.8, 0, -1.5); K.rotation.y = 0; K.visible = false;
    fallen.position.copy(POST).add(new THREE.Vector3(-0.45, 0, 0.2)); fallen.rotation.y = 0.3; fallen.userData.B.pelvis.position.y = 0.38; fallen.userData.B.torso.rotation.z = 0.5; fallen.visible = true;
    helper.visible = false; helper.position.copy(DOOR).add(new THREE.Vector3(0.6, 0, -0.2)); helper.rotation.y = Math.PI / 2; helper.userData.mat.opacity = 0;
    fig.visible = true; fig.userData.mat.opacity = 0; fig.position.set(-6, 0, -44); fig.rotation.y = -Math.PI / 2;
    litM.color.set('#ffb066'); warmLight.intensity = 22; post.userData.set(1);
    while (steps.children.length) steps.remove(steps.children[0]);
    camera.fov = 50; camera.updateProjectionMatrix();
  }
  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true);
    chase.reset(); chase.update(0, true);
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, gust: 0, stepAcc: 0, lastPuff: 0, kTalk: false };
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    walker.setSpeedMul(1); sfx.stop(); if (talkBox.open) talkBox.hide();
    S = null;
  }
  const go = p => { S.phase = p; S.t = 0; };
  function puff(x, y, z) { const p = puffs.find(q => q.t > 1.6); if (!p) return; p.t = 0; p.m.position.set(x, y, z); p.m.visible = true; }
  function footprint(x, z, h) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28).rotateX(-Math.PI / 2), stepM); m.position.set(x, 0.012, z); m.rotation.y = -h; steps.add(m); if (steps.children.length > 120) steps.remove(steps.children[0]); }
  /** K apoiando a pessoa (braço dela sobre o ombro dele), andando curvado contra o vento. */
  function walkPair(dt, speed, tremble) {
    const prev = K.position.clone(), dir = DOOR.clone().sub(K.position).setY(0); const dist = dir.length();
    if (dist > 0.9 && speed > 0) { dir.normalize(); K.position.addScaledVector(dir, Math.min(dist - 0.9, speed * dt)); }
    faceTo(K, DOOR.x, DOOR.z, dt, 3);
    const tr = prev.distanceTo(K.position); walkK(K, dt, tr);
    K.userData.torso.rotation.z -= 0.28;                                   // curvado contra o vento
    const side = new THREE.Vector3(Math.sin(K.rotation.y), 0, Math.cos(K.rotation.y));   // à esquerda do K
    fallen.position.copy(K.position).addScaledVector(side, 0.62); fallen.rotation.y = K.rotation.y;
    if (tr > 0) { S.stepAcc += tr; if (S.stepAcc > 0.45) { S.stepAcc = 0; footprint(K.position.x, K.position.z, -K.rotation.y); } }
    // mão direita (a que treme) no casaco da pessoa; tremor visível
    const a = K.userData.arms.find(x => x.s === 1); if (a && a.wrist) a.wrist.rotation.x = tremble * Math.sin(performance.now() * 0.06) * 0.25;
    return dist;
  }

  function update(dt, paused) {
    if (!S || paused) { if (S && paused) sfx.wind(0); return; }
    S.t += dt; const t = S.t, now = performance.now() / 1000;
    // vento em rajadas: o passo do jogador oscila (nunca inverte; só pesa)
    S.gust = 0.5 + 0.5 * Math.sin(now * 0.7) * Math.sin(now * 1.9 + 1.3);
    const move = S.phase === 'walk' || S.phase === 'cross';
    walker.setSpeedMul(move ? 0.62 - 0.22 * S.gust : 0);
    const solids = [{ x0: POST.x - 0.25, x1: POST.x + 0.25, z0: POST.z - 0.25, z1: POST.z + 0.25 }, { x0: -5, x1: 5, z0: DOOR.z - 2.5, z1: DOOR.z - 0.4 }, { x0: -9, x1: -4.4, z0: -40, z1: 30 }, { x0: 4.4, x1: 9, z0: -40, z1: 30 }];
    walker.update(dt, move ? input.axis() : { x: 0, z: 0 }, 'car', solids, FAR_VAN);
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    S.fade = S.phase === 'end' ? S.fade : Math.max(0, S.fade - dt);
    if (talkBox.open) talkBox.update(dt);
    sfx.wind(S.phase === 'end' ? 0.08 : 0.16 + 0.16 * S.gust, 260);
    // neve acompanha a câmera, levada pelo vento
    const pos = sGeo.attributes.position, cx = camera.position.x, cz = camera.position.z;
    for (let i = 0; i < SN; i++) {
      let x = pos.getX(i) + dt * (1.4 + 2.6 * S.gust), y = pos.getY(i) - dt * 1.6, z = pos.getZ(i) + dt * 0.8;
      if (y < 0) y += 12; if (x - cx > 13) x -= 26; if (x - cx < -13) x += 26; if (z - cz > 13) z -= 26; if (z - cz < -13) z += 26;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    for (const p of puffs) { if (!p.m.visible) continue; p.t += dt; p.m.position.y += dt * 0.25; p.m.position.x += dt * 0.6; p.m.scale.setScalar(1 + p.t * 2.2); p.m.material.opacity = Math.max(0, 0.35 * (1 - p.t / 1.4)); if (p.t > 1.4) p.m.visible = false; }
    post.userData.light.intensity = 14 * (0.92 + 0.08 * Math.sin(now * 23) * Math.sin(now * 7));   // a luz do poste tremula de leve

    switch (S.phase) {
      case 'walk':
        chase.update(dt);
        if (walker.z < POST.z + 9) { go('lift'); K.visible = true; }
        break;
      case 'lift': {                                       // o K vem do escuro, ajoelha e levanta a pessoa (esforço visível)
        shotTo(camera, [walker.x + 1.6, 2.0, walker.z + 3.6], [POST.x - 0.8, 0.9, POST.z], t < 0.05 ? 1 : Math.min(1, dt * 2));
        const goal = fallen.position.clone().add(new THREE.Vector3(-0.7, 0, 0.1));
        if (t < 3.2) { const prev = K.position.clone(), k = ease(t / 3.2); K.position.lerpVectors(new THREE.Vector3(-3.8, 0, -1.5), goal, k); faceTo(K, goal.x, goal.z, dt); walkK(K, dt, prev.distanceTo(K.position)); K.userData.torso.rotation.z -= 0.3;
          if (t > 1.6 && t < 1.9) K.position.x += Math.sin(t * 40) * 0.03; }   // escorrega
        else if (t < 5.4) { faceTo(K, fallen.position.x, fallen.position.z, dt); const kneel = ease(Math.min(1, (t - 3.2) / 0.8)) * (t < 4.6 ? 1 : 1 - ease((t - 4.6) / 0.8)); K.userData.body.position.y = -0.32 * kneel; K.userData.torso.rotation.z = -0.5 * kneel;
          reachArm(K, 1, fallen.position.clone().setY(0.9), kneel); reachArm(K, -1, fallen.position.clone().setY(0.7), kneel);
          if (t > 4.6) { const u = ease((t - 4.6) / 0.8); fallen.userData.B.pelvis.position.y = 0.38 + (0.64 - 0.38) * u; fallen.userData.B.torso.rotation.z = 0.5 * (1 - u) + 0.2 * u; } }
        if (t - S.lastPuff > 0.9) { S.lastPuff = t; puff(K.position.x + 0.3, 1.55 + K.userData.body.position.y, K.position.z); }
        if (t > 5.6) { K.userData.body.position.y = 0; go('cross'); talkBox.show(TALK, () => { if (S) S.talkDone = true; }, { auto: true, onAdvance: i => { if (S) S.line = i; } }); S.line = 0; }
        break;
      }
      case 'cross': {                                      // atravessam juntos até o lugar quente; o jogador segue com dificuldade
        chase.update(dt);
        const toDoor = K.position.distanceTo(DOOR);
        const speed = (S.line >= 9 || S.talkDone) ? 0.9 : toDoor > 4 ? 0.62 + 0.15 * (1 - S.gust) : 0;   // espera perto da porta até as falas acabarem
        const offer = !S.declined && toDoor < 13;
        walkPair(dt, offer && S.offerT > 0 && !S.declined ? 0 : speed, 1);
        if (t - S.lastPuff > 1.1) { S.lastPuff = t; puff(K.position.x + 0.3, 1.5, K.position.z); }
        fig.userData.mat.opacity = Math.min(1, fig.userData.mat.opacity + dt * 0.25);
        // a silhueta sai do lugar quente e oferece a mão; o K desvia e esconde a mão que treme
        if (offer) {
          S.offerT = (S.offerT || 0) + dt; const o = S.offerT;
          helper.visible = true; helper.userData.mat.opacity = Math.min(1, o / 0.8);
          const hp = DOOR.clone().add(new THREE.Vector3(0.2, 0, 2.2)).lerp(K.position.clone().add(new THREE.Vector3(0, 0, -1.6)), ease(Math.min(1, o / 2.4)) * 0.6);
          helper.position.copy(hp); faceTo(helper, K.position.x, K.position.z, dt);
          helper.userData.B.arms[1].sh.rotation.z = Math.min(1.25, Math.max(0, o - 1.6) * 1.6);   // estende a mão
          if (o > 3.2) {                                   // o K vira o rosto e leva a mão para as costas
            const k = ease(Math.min(1, (o - 3.2) / 0.8));
            K.userData.head.rotation.y = 0.5 * k;
            const back = K.position.clone().add(new THREE.Vector3(Math.cos(-K.rotation.y), 0, Math.sin(-K.rotation.y)).multiplyScalar(-0.35)).setY(0.95);
            reachArm(K, 1, back, k);
          }
          if (o > 5.2) { S.declined = true; S.helperBack = 0; }
        } else if (S.declined && helper.visible) {
          S.helperBack += dt; helper.userData.B.arms[1].sh.rotation.z *= 0.92; helper.position.lerp(DOOR.clone().add(new THREE.Vector3(2.4, 0, 0.6)), Math.min(1, dt));
          if (S.helperBack > 2) helper.userData.mat.opacity = Math.max(0, helper.userData.mat.opacity - dt * 0.6);
          const back = K.position.clone().add(new THREE.Vector3(Math.cos(-K.rotation.y), 0, Math.sin(-K.rotation.y)).multiplyScalar(-0.35)).setY(0.95);
          reachArm(K, 1, back, 1);                         // a mão continua escondida
        }
        if ((S.talkDone || S.line >= 9) && toDoor < 1.2) { go('end'); sfx.play('out', 0.5); }
        break;
      }
      case 'end': {                                        // entram; a luz se apaga; o poste fica
        chase.update(dt);
        if (t < 1.4) { const k = ease(t / 1.4); K.position.lerp(DOOR.clone().add(new THREE.Vector3(0, 0, -0.6)), k * 0.2); fallen.position.lerp(DOOR.clone().add(new THREE.Vector3(0.5, 0, -0.6)), k * 0.2); }
        else { K.visible = false; fallen.visible = false; }
        const off = clamp((t - 1.6) / 1.2, 0, 1);
        litM.color.setRGB(1 - 0.92 * off, (0.69) * (1 - 0.94 * off), 0.4 * (1 - 0.95 * off)); warmLight.intensity = 22 * (1 - off);
        fig.userData.mat.opacity = Math.max(0, 1 - off);
        if (t > 4.8) S.fade = Math.min(1, (t - 4.8) / 2.2);
        if (t > 7.2 && !S.saved) { S.saved = true; try { localStorage.setItem(EXTRA3_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onDone; stop(); cb && cb(true); return; }
        break;
      }
    }
  }

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && S.phase !== 'walk' && S.phase !== 'cross'; },
    get light() { return warmLight.intensity; }, get kPos() { return K.position.clone(); }, get declined() { return !!(S && S.declined); },
    _K: K, _helper: helper, _post: post,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0;
      if (p === 'cross') { K.visible = true; K.position.copy(POST).add(new THREE.Vector3(-1.1, 0, 0.3)); fallen.userData.B.pelvis.position.y = 0.64; fallen.userData.B.torso.rotation.z = 0.2; walker.pose(0, POST.z + 6, -Math.PI / 2); S.line = 0; go('cross'); talkBox.show(TALK, () => { if (S) S.talkDone = true; }, { auto: true, onAdvance: i => { if (S) S.line = i; } }); }
      else go(p); },
  };
}
