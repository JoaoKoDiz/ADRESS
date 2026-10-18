// Nível extra 3 — Covardia.
// Um trecho curto de rua com neve, suspenso no vazio; um poste laranja; ao fundo, a sugestão de um lugar aquecido.
// A lembrança: o K sozinho, caído na neve, precisando atravessar até a luz. Ele sabe falar de coragem; agora é ele quem
// precisa de ajuda — e tem vergonha de mostrar. O jogador atravessa junto (terceira pessoa próxima): passos hesitantes,
// vento, movimento reduzido nas rajadas, sem controles invertidos. Sinais do esforço real do K: levanta com dificuldade,
// segue contra o vento, cai de joelhos e levanta de novo, a respiração vira vapor, as pegadas ficam.
// No poste, uma silhueta oferece a mão. A mão dele, que treme, quase vai — e ele a esconde atrás das costas, endireita o
// corpo e passa. Depois disso o abrigo fica mais longe (a distância que ele escolheu). Ele chega sozinho, ainda segurando a
// mão atrás do corpo. O jogador alcança a luz, mas ela se apaga antes de dar alívio; o poste continua lá, pequeno no vazio.
// A rua atrás de quem anda desaba (não há volta). Salva EXTRA3_KEY e volta à tela inicial.
import * as THREE from 'three';
import { whitenFade, setWhiteGlow } from './whiteout.js';
import { walkK, reachArm } from './models/reader.js';
import { VOID, COL, line, makeFigure, makeFloorPiece, createSfx, createMurmur, createBuzz, createChase, attachAssist, shotTo, faceTo, ease, clamp } from './storyKit.js';
import { buildStreetSet, poseKSit, personReach } from './memorySets.js';

export const EXTRA3_KEY = 'adress.extra.3';
const FAR_VAN = { x: 1e9, z: 1e9 };
const START = { x: -0.9, z: 1.6 };
const F = (s, p = 0) => line('f', s, p);
const L = {
  sabia: F('Você sabia o que precisava fazer.'), custava: F('Só não queria que alguém visse quanto custava.'), medo: F('Foi medo?'),
  cuidado: F('Pode chamar de cuidado, se preferir.'), palavras: F('Você tem tantas palavras para não dizer essa.'),
  confortavel: F('Ajudar alguém é mais confortável.'), forte: F('Você fica do lado que parece forte.'), quando: F('Mas quando é você…'),
  perceba: F('Você espera que ninguém perceba.'), testemunha: F('Até a sua coragem precisa de uma testemunha que não faça perguntas.'),
};

export function createExtra3(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.Fog(VOID, 12, 40);
  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.05, 300);
  const hemi = new THREE.HemisphereLight('#c9d4e6', '#15161c', 0.72); scene.add(hemi);
  const moon = new THREE.DirectionalLight('#aebbd6', 0.45); moon.position.set(-6, 10, 4); scene.add(moon);
  const BG = new THREE.Color(VOID), BG_LATE = new THREE.Color('#15161b');   // no último plano o fundo clareia um pouco: a silhueta preta precisa aparecer
  const sfx = createSfx(audio), inside = createMurmur(audio, 3), buzz = createBuzz(audio);

  const set = buildStreetSet(); scene.add(set.g);
  const { K, helper, post, shelter } = set;
  const startPiece = makeFloorPiece(2.6, 2.6, '#cfd5dc'); startPiece.position.set(START.x, 0, 1.3); scene.add(startPiece);   // (cobre z 0..2,6: emenda com a 1ª placa da rua)
  const fig = makeFigure(1.05); fig.visible = false; scene.add(fig);
  const baseShelterZ = set.shelterZ;

  const chase = createChase(camera, walker, () => !!S && S.free, { dist: 4.4, pitch: 0.2, lookY: 1.45, side: 1.05 });
  const assist = attachAssist(chase, walker, input);
  const personOpacity = (p, a) => p.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = a; o.material.depthWrite = a > 0.98; } });

  let S = null;
  const queue = [];
  const say = k => queue.push(L[k]);
  function pumpLines(dt) {
    if (talkBox.open) { talkBox.update(dt); return; }
    if (!queue.length) return;
    const l = queue.shift(); if (l.who === 'f') sfx.play('presence', 0.8);
    talkBox.show([l], null, { auto: true });
  }

  function reset() {
    set.reset(); shelter.position.z = baseShelterZ; personOpacity(K, 1); personOpacity(helper, 0); helper.visible = false;
    K.visible = false; K.position.set(0.5, 0, -1.6); K.rotation.y = Math.PI / 2; delete K.userData.gait; poseKSit(K, 1, 0.12);
    K.userData.arms.forEach(a => { a.sh.quaternion.copy(a.rest); a.elbow.quaternion.copy(a.erest); });
    helper.position.set(1.7, 0, set.postZ - 1.0); helper.rotation.y = Math.PI / 2;   // (sai da luz do poste)
    fig.visible = false; fig.userData.mat.opacity = 0; startPiece.visible = true; startPiece.position.y = 0;
    shelter.visible = true; shelter.traverse(o => { if (o.isMesh && o.material && o.material.userData.op0 !== undefined) { o.material.opacity = o.material.userData.op0; o.material.transparent = o.material.userData.tr0; } });
    scene.background.copy(BG); queue.length = 0; camera.fov = 52; camera.updateProjectionMatrix();
  }
  // onde se pisa: a placa de partida e as placas da rua que ainda não caíram
  const walkable = (x, z) => {
    if (Math.abs(x) > 3.4) return false;
    if (startPiece.visible && Math.abs(x - START.x) < 1.3 && z > -0.05 && z < 2.6) return true;
    const i = Math.floor(-z / 2); const T = set.tiles[i]; return !!T && T.fall < 0.05 && z <= 0;
  };

  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(START.x, START.z, -Math.PI / 2); walker.show(true); setWhiteGlow(0.26);
    walker.setArea(walkable);
    chase.reset(); chase.update(0, true);
    S = { phase: 'open', t: 0, T: 0, hes: 0, white: null, wk: 0, fade: 1, free: true, gust: 0, stepAcc: 0, kStep: 0, lastPuff: 0, seen: {}, kz: -1.6, sway: 0 };
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();
    walker.setArea(null); walker.setSpeedMul(1); sfx.stop(); inside.stop(); buzz.stop(); setWhiteGlow(0);
    if (talkBox.open) talkBox.hide(); queue.length = 0;
    S = null;
  }
  const go = (p, free) => { S.phase = p; S.t = 0; if (free !== undefined) S.free = free; };

  /** Mão direita do K: no peito, tremendo (k = quanto está segurando); escondida atrás das costas (hide). */
  function kHand(tremble, hide) {
    const kw = K.getWorldPosition(new THREE.Vector3()), fwd = new THREE.Vector3(Math.cos(K.rotation.y), 0, -Math.sin(K.rotation.y));
    const side = new THREE.Vector3(Math.sin(K.rotation.y), 0, Math.cos(K.rotation.y));
    const chest = kw.clone().add(new THREE.Vector3(0, 1.18, 0)).addScaledVector(fwd, 0.26).addScaledVector(side, 0.06);
    const back = kw.clone().add(new THREE.Vector3(0, 0.92, 0)).addScaledVector(fwd, -0.32).addScaledVector(side, 0.12);
    const tgt = chest.lerp(back, hide);
    tgt.x += Math.sin(S.t * 41) * 0.012 * tremble; tgt.y += Math.sin(S.t * 37 + 1) * 0.012 * tremble;
    reachArm(K, 1, tgt, 0.9);
    const a = K.userData.arms.find(x => x.s === 1); if (a && a.wrist) a.wrist.rotation.x = Math.sin(S.t * 45) * 0.18 * tremble;
  }

  function update(dt, paused) {
    if (!S || paused) { if (S && paused) sfx.wind(0); return; }
    S.t += dt; S.T += dt; const t = S.t, now = S.T;
    S.gust = 0.5 + 0.5 * Math.sin(now * 0.7) * Math.sin(now * 1.9 + 1.3);
    // jogador: passo pesado e hesitante na neve (o pé afunda, a rajada pesa), no ritmo do K; nunca invertido
    S.hes = (S.hes + dt * 0.85) % 1;
    const step = 0.62 + 0.38 * (0.5 - 0.5 * Math.cos(S.hes * Math.PI * 2));
    walker.setSpeedMul(S.free ? (0.2 - 0.065 * S.gust) * step : 0);
    const ox = walker.x, oz = walker.z;
    walker.update(dt, S.free ? input.axis() : { x: 0, z: 0 }, 'car', [{ x0: 1.45, x1: 1.95, z0: set.postZ - 0.25, z1: set.postZ + 0.25 }, { x0: -4, x1: 4, z0: shelter.position.z - 0.6, z1: shelter.position.z + 0.4 }], FAR_VAN);
    const moved = Math.hypot(walker.x - ox, walker.z - oz);
    S.stepAcc += moved; if (S.stepAcc > 0.62) { S.stepAcc = 0; sfx.play('step', 0.5); }
    if (!S.white && Math.hypot(walker.x - START.x, walker.z - START.z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(ease(S.wk)); }
    if (S.phase !== 'out') S.fade = Math.max(0, S.fade - dt);
    pumpLines(dt);
    set.memory.flicker(t); set.update(dt, walker.x, walker.z, S.gust);
    sfx.wind(S.phase === 'dark' || S.phase === 'out' ? 0.07 : 0.15 + 0.15 * S.gust, 260);
    const dPost = Math.hypot(walker.x - 1.7, walker.z - set.postZ);
    const flick = 0.9 + 0.1 * Math.sin(now * 23) * Math.sin(now * 7);
    buzz.level(clamp(1 - dPost / 7, 0, 1)); buzz.update(dt, flick);
    post.userData.light.intensity = 14 * flick;
    const dSh = Math.hypot(walker.x - shelter.position.x, walker.z - shelter.position.z);
    inside.level(S.phase === 'dark' || S.phase === 'out' ? 0 : 0.18 * clamp(1 - dSh / 16, 0, 1)); inside.update(dt);
    // a rua atrás desaba (sem volta)
    for (const T of set.tiles) { const behind = walker.z < T.z1 - 4.2 && K.position.z < T.z1 - 3; if (behind && T.fall === 0) { T.fall = 0.001; sfx.play('fall', 0.12); } if (T.fall > 0 && T.fall < 1) set.setTile(T.i, Math.min(1, T.fall + dt / 1.6)); }
    if (startPiece.visible && walker.z < -3.5) { startPiece.position.y -= dt * 3; if (startPiece.position.y < -9) startPiece.visible = false; }

    // câmera próxima: um balanço curto nas rajadas
    if (S.free) { chase.update(dt); assist.update(dt, S.focus, 1.6, 0.9); S.sway += (S.gust - S.sway) * Math.min(1, dt * 2); camera.position.x += Math.sin(now * 1.7) * 0.05 * S.sway; camera.rotation.z += Math.sin(now * 1.3) * 0.012 * S.sway; }

    switch (S.phase) {
      case 'open':                                           // a neve começa; o K aparece caído
        if (t > 0.8 && !K.visible) { K.visible = true; personOpacity(K, 0); }
        if (K.visible) personOpacity(K, Math.min(1, (t - 0.8) / 1.2));
        kHand(1, 0); K.userData.head.rotation.z = -0.4;
        S.focus = K.getWorldPosition(new THREE.Vector3());
        if (t > 2.6) go('rise');
        break;
      case 'rise': {                                         // levanta com esforço (escorrega uma vez)
        const k = t < 0.9 ? 0 : t < 1.4 ? (t - 0.9) / 0.5 * 0.4 : t < 1.9 ? 0.4 - (t - 1.4) / 0.5 * 0.25 : 0.15 + Math.min(1, (t - 1.9) / 1.2) * 0.85;
        poseKSit(K, 1 - k, 0.12); kHand(1, 0);
        if (t > 1.4 && t < 1.5) sfx.play('step', 0.6);
        if (S.T - S.lastPuff > 0.8) { S.lastPuff = S.T; puffK(); }
        S.focus = K.getWorldPosition(new THREE.Vector3());
        if (t > 3.3) { poseKSit(K, 0); go('cross'); say('sabia'); }
        break;
      }
      case 'cross': crossStep(dt); break;
      case 'offer': offerStep(dt); break;
      case 'after': crossStep(dt, true); break;
      case 'arrive': {                                       // ele chega sozinho, segurando a mão atrás do corpo
        walkK(K, dt, 0); kHand(1, 1); K.userData.torso.rotation.z = -0.05; faceTo(K, 0, shelter.position.z - 3, dt, 2);
        S.focus = K.getWorldPosition(new THREE.Vector3());
        if (t > 1.0 && !S.seen.perceba) { S.seen.perceba = 1; say('perceba'); }
        const near = Math.hypot(walker.x - shelter.position.x, walker.z - (shelter.position.z + 1.4)) < 3.6;
        if (near && t > 1.6 && !talkBox.open && !queue.length) { go('dark', false); sfx.play('out', 0.6); }
        break;
      }
      case 'dark': {                                         // a luz se apaga antes do alívio; o poste fica
        // a luz do abrigo some de uma vez; o K fica um instante no escuro, ainda com a mão atrás das costas, e some
        set.setShelter(0); walkK(K, dt, 0); kHand(1, 1);
        personOpacity(K, 1 - clamp((t - 0.9) / 1.3, 0, 1));
        const wallA = 1 - clamp((t - 0.5) / 1.2, 0, 1);
        shelter.traverse(o => { if (o.isMesh && o.material && !o.material.isMeshBasicMaterial) { const m = o.material; if (m.userData.op0 === undefined) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; } m.transparent = true; m.opacity = m.userData.op0 * wallA; } });
        if (wallA <= 0) shelter.visible = false;
        // a rua desaba toda, menos o pedaço sob o jogador e o do poste
        const under = Math.floor(-walker.z / 2), postI = Math.floor(-set.postZ / 2);
        if (t > 1.0) for (const T of set.tiles) if (T.fall === 0 && T.i !== under && T.i !== postI) { T.fall = 0.001; sfx.play('fall', 0.08); }
        // corte: o jogador se volta para o caminho que fez; o poste pequeno no vazio; além da luz dele, a figura
        const pw = new THREE.Vector3(1.7, 0, set.postZ);
        if (t > 2.4) {
          if (!S.turned) {
            S.turned = true; walker.pose(walker.x, walker.z, Math.atan2(pw.z - walker.z, pw.x - walker.x));
            fig.visible = true; fig.position.set(pw.x - 0.6, 0, pw.z + 10); fig.rotation.y = Math.PI / 2;
            camera.fov = 38; camera.updateProjectionMatrix();
          }
          const ws = new THREE.Vector3(walker.x, 0, walker.z), dir = pw.clone().sub(ws).normalize(), rt = new THREE.Vector3(-dir.z, 0, dir.x);
          const drift = Math.min(1, (t - 2.4) / 9);                       // aproxima bem devagar das costas do jogador
          const back = 4.3 - drift * 0.45;
          shotTo(camera, [ws.x - dir.x * back + rt.x * 1.1, 1.95, ws.z - dir.z * back + rt.z * 1.1], [pw.x - 0.2, 2.5, pw.z + 3], 1);
          scene.background.copy(BG).lerp(BG_LATE, clamp((t - 2.4) / 2.5, 0, 1));
          fig.userData.mat.opacity = clamp((t - 3.4) / 1.6, 0, 1);
          if (t > 3.6 && !S.seen.test) { S.seen.test = 1; say('testemunha'); }
        } else { chase.update(dt); }
        if (t > 9.6 && !talkBox.open && !queue.length) go('out', false);
        break;
      }
      case 'out':
        S.fade = Math.min(1, t / 2.4);
        if (t > 2.8 && !S.saved) { S.saved = true; try { localStorage.setItem(EXTRA3_KEY, '1'); } catch (e) { /* */ } const cb = ctx.onDone; stop(); cb && cb(true); return; }
        break;
    }
  }
  function puffK() { const kw = K.getWorldPosition(new THREE.Vector3()), fwd = new THREE.Vector3(Math.cos(K.rotation.y), 0, -Math.sin(K.rotation.y)); set.puff(kw.x + fwd.x * 0.35, 1.55 + K.userData.body.position.y, kw.z + fwd.z * 0.35); }
  /** A travessia: o K anda curvado contra o vento, mancando; cai de joelhos uma vez e levanta. */
  function crossStep(dt, after) {
    const T = S.T, goalZ = after ? shelter.position.z + 1.3 : set.postZ + 1.5;
    const limp = 0.75 + 0.25 * Math.sin(S.kStep * 3.1);
    // antes da mão: curvado, devagar. Depois de recusá-la: endireita e apressa o passo para parecer bem — e continua mancando.
    let v = (after ? 0.95 : 0.72 + 0.15 * (1 - S.gust)) * limp;
    if (!after && K.position.z < -6.6 && !S.fell) { S.fell = T; }
    if (S.fell && T - S.fell < 2.0) {                          // de joelhos, apoia a mão boa no chão, levanta
      const u = T - S.fell, k = u < 0.4 ? u / 0.4 : u < 1.3 ? 1 : 1 - (u - 1.3) / 0.7;
      poseKSit(K, 0.55 * k, 0.12); v = 0; if (u > 0.05 && u < 0.12) sfx.play('step', 0.7);
      reachArm(K, -1, K.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.3, 0.15, -0.2)), k * 0.8);
      if (!S.seen.custava) { S.seen.custava = 1; say('custava'); }
    } else if (S.fell && !S.up) { S.up = true; poseKSit(K, 0); }
    const dz = goalZ - K.position.z;
    if (Math.abs(dz) > 0.05 && v > 0) { const st = Math.min(Math.abs(dz), v * dt); K.position.z += Math.sign(dz) * st; K.position.x += (0.3 - K.position.x) * Math.min(1, dt * 0.5); walkK(K, dt, st); S.kStep += st; if (Math.floor(S.kStep / 0.45) !== S.lastFoot) { S.lastFoot = Math.floor(S.kStep / 0.45); set.footprint(K.position.x + (S.lastFoot % 2 ? 0.12 : -0.12), K.position.z, -K.rotation.y); } }
    else walkK(K, dt, 0);
    faceTo(K, K.position.x, K.position.z - 5, dt, 3);
    K.userData.torso.rotation.z -= after ? 0.06 + 0.03 * S.gust : 0.24 + 0.08 * S.gust;   // curvado contra o vento (depois, ereto à força)
    kHand(1, after ? 1 : 0);
    if (T - S.lastPuff > (after ? 0.7 : 1.0)) { S.lastPuff = T; puffK(); }
    S.focus = K.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0, -2));
    const z = K.position.z;
    if (!after) {
      if (z < -4.0 && !S.seen.medo) { S.seen.medo = 1; say('medo'); }
      if (z < -8.0 && !S.seen.cuidado) { S.seen.cuidado = 1; say('cuidado'); }
      if (Math.abs(dz) < 0.1 && (!S.fell || T - S.fell > 2.0)) { go('offer'); helper.visible = true; S.h0 = helper.position.clone(); }
    } else {
      if (z < -16 && !S.seen.quando) { S.seen.quando = 1; say('quando'); }
      // depois da recusa o abrigo fica mais longe (3,5 m em 3 s) e depois para
      const k = ease(clamp(S.t / 3.0, 0, 1)); shelter.position.z = baseShelterZ - 3.5 * k;
      if (Math.abs(dz) < 0.1) go('arrive');
    }
  }
  /** A mão oferecida: a dele quase vai — e vai para trás das costas. Ele endireita e passa. */
  function offerStep(dt) {
    const t = S.t;
    personOpacity(helper, Math.min(1, t / 0.9));
    const stand = new THREE.Vector3(1.15, 0, K.position.z - 0.95);          // sob a luz do poste, à direita do caminho dele
    helper.position.lerp(stand, Math.min(1, dt * 1.2)); faceTo(helper, K.position.x, K.position.z, dt, 4);
    personReach(helper, 1, ease(clamp((t - 1.0) / 0.8, 0, 1)), 1.2);       // estende a mão
    walkK(K, dt, 0); faceTo(K, helper.position.x, helper.position.z, dt, 2);
    S.focus = K.getWorldPosition(new THREE.Vector3()).lerp(helper.getWorldPosition(new THREE.Vector3()), 0.5);
    if (t > 1.2 && !S.seen.palavras) { S.seen.palavras = 1; say('palavras'); }
    let hide = 0;
    if (t > 2.2 && t < 3.2) {                                 // a mão que treme se ergue um pouco na direção da outra
      const kw = K.getWorldPosition(new THREE.Vector3()), hp = helper.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.0, 0));
      reachArm(K, 1, kw.clone().add(new THREE.Vector3(0, 1.05, 0)).lerp(hp, 0.35 * ease((t - 2.2) / 0.8)), 0.9);
      const a = K.userData.arms.find(x => x.s === 1); if (a && a.wrist) a.wrist.rotation.x = Math.sin(t * 45) * 0.2;
    } else {
      hide = t <= 2.2 ? 0 : ease(clamp((t - 3.2) / 0.6, 0, 1));
      kHand(1, hide);
    }
    if (t > 3.2) { K.userData.torso.rotation.z = -0.04 * hide; K.userData.head.rotation.y += (0.45 * hide - K.userData.head.rotation.y) * Math.min(1, dt * 3); }   // endireita e desvia o rosto
    if (t > 4.4 && !S.seen.conf) { S.seen.conf = 1; say('confortavel'); say('forte'); }
    if (t > 5.0) { go('after'); S.helperT = 0; }
  }
  // a silhueta continua com a mão estendida para o espaço vazio, depois abaixa e some
  const _helperTick = dt => {
    if (!S || !helper.visible || S.phase === 'offer') return;
    S.helperT = (S.helperT || 0) + dt; const u = S.helperT;
    personReach(helper, 1, Math.max(0, 1 - Math.max(0, u - 2.2) / 1.4), 1.2);
    if (u > 2.6) faceTo(helper, walker.x, walker.z, dt, 1.2);
    if (u > 4.0) personOpacity(helper, Math.max(0, 1 - (u - 4.0) / 1.6));
    if (u > 5.8) helper.visible = false;
  };
  const baseUpdate = update;
  function update2(dt, paused) { baseUpdate(dt, paused); if (!paused) _helperTick(dt); }

  return {
    scene, camera, start, stop, update: update2,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && !S.free; },
    get light() { return set.warm.intensity; }, get kPos() { return K.position.clone(); }, get shelterZ() { return shelter.position.z; },
    _set: set, _fig: fig,
    _jump(p) { if (!S) return; if (!S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } S.fade = 0; K.visible = true; personOpacity(K, 1); poseKSit(K, 0);
      if (p === 'offer') { K.position.set(0.3, 0, set.postZ + 1.5); walker.pose(-0.6, set.postZ + 4.5, -Math.PI / 2); helper.visible = true; go('offer'); }
      else if (p === 'arrive') { K.position.set(0.3, 0, shelter.position.z + 1.3); walker.pose(-0.4, shelter.position.z + 5.0, -Math.PI / 2); go('arrive'); }
      else go(p); },
  };
}
