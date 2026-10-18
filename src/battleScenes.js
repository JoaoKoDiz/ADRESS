// Cenas dentro da própria arena da batalha (sem trocar de cenário):
//  • Interlúdio S1 → R2 (pausa de combate, parte calma do Finale): quatro cacos de vidro com as imagens das lembranças saem de
//    trás da figura e cercam o K. O azul deixa de obedecer; os outros também se soltam. O jogador leva o círculo até perto do
//    azul e sustenta uma pequena barreira (abre espaço). O K tenta tocar o caco, recua, e consegue. Os quatro continuam
//    rachados; o azul ganha luz primeiro (nenhuma lembrança é corrigida). O azul cresce no quadro e leva ao R2.
//  • Encerramento (o fim da faixa): a figura tenta começar outra exigência; o diálogo; ela tenta crescer, mas a câmera deixa de
//    acompanhá-la; o K se volta para o jogador: "Você vem?". A caminhada (epílogo) começa quando a música termina.
// Tudo anda pelo relógio da música (t = posição − início da janela).
import * as THREE from 'three';
import { line } from './storyKit.js';

const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const F = (s, p = 0) => line('f', s, p), Kl = (s, p = 0) => line('k', s, p);
const COLS = ['#003EFF', '#00C000', '#FCA600', '#9B00FF'];

/** Um caco de vidro: polígono irregular com a imagem de uma lembrança, contorno colorido e rachaduras desenhadas por cima. */
function makeShard(color, seed, tex) {
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const W = 1.1, H = 1.5, n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (r() - 0.5) * 0.5, k = 0.78 + r() * 0.3; pts.push(new THREE.Vector2(Math.cos(a) * W / 2 * k, Math.sin(a) * H / 2 * k)); }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
  const uv = geo.attributes.uv, pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / H + 0.5);   // a imagem inteira dentro do caco
  const mat = new THREE.MeshBasicMaterial({ map: tex || null, color: tex ? '#9a9aa2' : color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(geo, mat);
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, p.y, 0.005))), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }));
  m.add(edge);
  // rachaduras: algumas linhas a partir de um ponto (ficam até o fim)
  const cp = new THREE.Vector2((r() - 0.5) * 0.3, (r() - 0.5) * 0.4), cr = [];
  for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, l = 0.3 + r() * 0.45; let x = cp.x, y = cp.y; for (let j = 0; j < 3; j++) { const nx = x + Math.cos(a + (r() - 0.5) * 0.6) * l / 3, ny = y + Math.sin(a + (r() - 0.5) * 0.6) * l / 3; cr.push(new THREE.Vector3(x, y, 0.006), new THREE.Vector3(nx, ny, 0.006)); x = nx; y = ny; } }
  const cracks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cr), new THREE.LineBasicMaterial({ color: '#f2f4ff', transparent: true, opacity: 0.55 }));
  m.add(cracks);
  const g = new THREE.Group(); g.add(m);
  g.userData = { m, mat, edge, cracks, color };
  return g;
}

export function createInterlude(api) {
  const { scene, talkBox } = api;
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  let shards = [], S = null;
  const zone = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#cfe0ff', transparent: true, opacity: 0, depthWrite: false }));
  zone.position.y = 0.03; root.add(zone);
  const blueLight = new THREE.PointLight('#5f86ff', 0, 5, 1.6); root.add(blueLight);
  const LINES = [[3.6, F('Você já viu.')], [8.2, Kl('Eu vi.')], [12.2, F('Então sabe como termina.')], [16.8, Kl('Sei o que aconteceu.')], [22.0, Kl('Ainda não sei tudo o que isso significa.', 0.9)]];
  const KP = api.K_POS, FP = api.F_POS;
  const BLUE_HANG = new THREE.Vector3(KP.x - 1.55, 1.55, KP.z - 0.9);       // onde o azul para (à frente e à esquerda do K, perto do jogador)
  const ZONE = new THREE.Vector3(BLUE_HANG.x - 0.15, 0, BLUE_HANG.z + 0.85);  // onde o jogador põe o círculo (entre o azul e a figura? não: ao lado, do lado de fora)

  function build() {
    for (const s of shards) { root.remove(s); s.userData.m.geometry.dispose(); s.userData.mat.dispose(); }
    const tex = api.images ? api.images() : null;
    shards = COLS.map((c, i) => { const g = makeShard(c, 41 + i * 13, tex && tex[i]); root.add(g); return g; });
  }
  function start(info, done) {
    build(); root.visible = true; zone.material.opacity = 0; blueLight.intensity = 0;
    S = { info, done, t: 0, said: 0, plate: null, hold: 0, placed: false, touchT: -1, end: false, k0: api.kHold.position.clone(), auto: false };
    shards.forEach((g, i) => { g.position.set(FP.x + (i - 1.5) * 1.3, 4.6, FP.z + 0.6); g.scale.setScalar(0.3); g.userData.mat.opacity = 0; g.userData.free = 0; g.userData.ang = i * Math.PI / 2; });
    api.holdK(true); api.circleShow(false); api.label('');
    api.figGest({ s: 1, pt: new THREE.Vector3(FP.x - 2, 7, FP.z + 2), t: 0, dur: 4.4 });
  }
  function stop() {
    if (!S) return;
    if (S.plate) api.killPlate(S.plate);
    root.visible = false; api.holdK(false); api.circleShow(null); api.setCam(null); api.label('');
    api.kHold.position.copy(KP); api.K.rotation.y = Math.PI / 2;
    S = null;
  }
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Vector3();
  function update(dt, mt) {
    if (!S) return;
    const t = S.t = mt - S.info.start;
    while (S.said < LINES.length && t >= LINES[S.said][0]) { const l = LINES[S.said++][1]; if (l.who === 'f') api.sfx('warn'); talkBox.show([l], null, { auto: true }); }
    if (talkBox.open) talkBox.update(dt);
    const KU = api.KU;
    // --- os cacos: saem de trás da figura, cercam o K, o azul para, os outros se soltam ---
    const orbitR = t < 4.5 ? 1.9 : t < 9 ? 1.9 - 0.7 * ease((t - 4.5) / 4.5) : 1.2;
    shards.forEach((g, i) => {
      const u = g.userData, blue = i === 0;
      const appear = ease(clamp((t - 1.0) / 1.2, 0, 1)); u.mat.opacity = 0.92 * appear; u.edge.material.opacity = 0.95 * appear;
      const stopAt = blue ? 7.2 : 9.0;                                  // o azul desobedece primeiro
      if (t < stopAt) u.ang += dt * (t < 4.5 ? 0.4 : 0.9 + 0.5 * ease((t - 4.5) / 4));
      else u.free = Math.min(1, u.free + dt / 1.4);
      const orbit = _v.set(KP.x + Math.cos(u.ang) * orbitR, 1.5 + 0.35 * Math.sin(u.ang * 2 + i), KP.z + Math.sin(u.ang) * orbitR * 0.8);
      let want = orbit;
      if (t < 4.5) want = _w.copy(g.position).lerp(orbit, 1 - Math.exp(-dt * (0.5 + t * 0.4)));
      if (u.free > 0) {
        const hang = blue ? BLUE_HANG : _c.set(KP.x + Math.cos(u.ang) * 2.6, 1.7 + 0.3 * i % 2, KP.z + Math.sin(u.ang) * 2.0);
        if (!blue && S.placed) hang.lerp(_w.set(KP.x + Math.cos(u.ang) * 3.4, 2.2, KP.z + Math.sin(u.ang) * 2.6 - 1), ease(clamp((t - S.placedT) / 2, 0, 1)));   // a barreira abre espaço: os outros se afastam
        want = _w.copy(orbit).lerp(hang, ease(u.free));
      }
      g.position.lerp(want, t < 4.5 ? 1 : Math.min(1, dt * 3));
      g.position.y += Math.sin(t * 1.3 + i) * 0.004;
      g.scale.setScalar(0.3 + 0.7 * appear);
      g.lookAt(api.camera.position);
      if (blue && t >= 7.2 && t < 9) u.edge.material.opacity = 0.5 + 0.5 * (Math.sin(t * 22) > 0 ? 1 : 0.2);   // pisca: não obedece
    });
    if (t > 7.0 && t < 7.1 && !S.g1) { S.g1 = true; api.figGest({ s: -1, pt: BLUE_HANG.clone().setY(3), t: 0, dur: 1.6 }); }   // ela chama o azul de volta; ele não vem
    // --- o K: encolhido enquanto os cacos fecham; depois tenta tocar o azul, recua, consegue ---
    const kh = api.kHold, K = api.K;
    let lowK = t < 4.5 ? 0.4 : t < 9 ? 0.4 + 0.4 * ease((t - 4.5) / 4) : 0.8;
    // jogador: a partir de 9,5 s o círculo aparece e pode ir até o azul
    if (t >= 9.5 && !S.end) {
      api.circleShow(true); api.moveCircle(dt);
      zone.position.set(ZONE.x, 0.03, ZONE.z); zone.material.opacity = S.placed ? Math.max(0, zone.material.opacity - dt * 2) : 0.35 + 0.25 * Math.sin(t * 4);
      if (!S.placed) api.label('Leve o círculo até perto do caco azul e segure o clique (ou Espaço) para sustentar uma barreira');
      const inZone = Math.hypot(api.cpos.x - ZONE.x, api.cpos.z - ZONE.z) < 0.86;
      if (!S.placed && inZone && api.actionHeld()) { S.hold += dt; if (!S.plate) { S.plate = api.addPlate(ZONE.x, ZONE.z - 0.35); api.sfx('barrier'); } }
      else if (!S.placed && S.plate && !api.actionHeld()) { api.killPlate(S.plate); S.plate = null; S.hold = 0; }
      if (!S.placed && (S.hold >= 1.0 || t >= 17.5)) {                // (sem o jogador: aos 17,5 s a barreira aparece sozinha; nada falha)
        if (!S.plate) { S.plate = api.addPlate(ZONE.x, ZONE.z - 0.35); S.auto = true; api.sfx('barrier'); }
        S.placed = true; S.placedT = t; api.label(''); api.sfx('core');
      }
    }
    // o K se aproxima do azul (depois da barreira), estende a mão, recua, estende de novo e toca
    let reach = 0, touchK = 0;
    if (S.placed) {
      const u = t - S.placedT;
      const walk = ease(clamp(u / 2.2, 0, 1));
      const goal = _v.set(BLUE_HANG.x + 0.55, 0, BLUE_HANG.z + 0.25);
      const prev = kh.position.clone(); kh.position.lerpVectors(S.k0, goal, walk);
      api.walkK(K, dt, prev.distanceTo(kh.position));
      const face = Math.atan2(-(BLUE_HANG.z - kh.position.z), BLUE_HANG.x - kh.position.x); let df = face - K.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); K.rotation.y += df * Math.min(1, dt * 3);
      if (u > 2.4 && u < 3.6) reach = 0.75 * ease((u - 2.4) / 0.8);                    // primeira vez: quase
      else if (u >= 3.6 && u < 4.6) reach = 0.75 * (1 - ease((u - 3.6) / 0.6));        // recua
      else if (u >= 5.4) { reach = 1; touchK = ease(clamp((u - 5.4) / 0.9, 0, 1)); }   // e consegue
      if (touchK >= 1 && S.touchT < 0) { S.touchT = t; api.sfx('core'); }
      lowK = 0.8 - 0.55 * walk;
    }
    if (KU.torso) KU.torso.rotation.z = -0.32 * lowK + 0.01 * Math.sin(t * 1.6);
    if (KU.head) KU.head.rotation.z = -0.4 * lowK;
    const right = KU.arms.find(a => a.s === 1), left = KU.arms.find(a => a.s === -1);
    const hand = shards[0].position.clone().add(_c.set(0.12, -0.1, 0.18));
    if (right) { right.k = (right.k || 0) + ((reach ? 0.35 + 0.6 * reach : (S.placed ? 0 : 0.3 * lowK)) - (right.k || 0)) * Math.min(1, dt * 6); api.reachArm(K, 1, reach ? hand.lerp(kh.position.clone().setY(1.2), 0.35 * (1 - touchK)) : _w.set(kh.position.x + 0.2, 1.05, kh.position.z - 0.4), right.k); }
    if (left) { left.k = (left.k || 0) + ((S.placed ? 0 : 0.35 * lowK) - (left.k || 0)) * Math.min(1, dt * 6); api.reachArm(K, -1, _w.set(kh.position.x - 0.2, 1.1, kh.position.z - 0.45), left.k); }
    // --- depois do toque: todos continuam rachados; o azul ganha luz primeiro ---
    if (S.touchT >= 0) {
      const u = t - S.touchT;
      shards.forEach((g, i) => { const d = g.userData; d.cracks.material.opacity = 0.55 + 0.35 * ease(clamp(u / 0.6, 0, 1)); if (i === 0) d.mat.color.setScalar(0.6 + 0.9 * ease(clamp(u / 1.6, 0, 1))); });
      blueLight.position.copy(shards[0].position); blueLight.intensity = 3 * ease(clamp(u / 1.6, 0, 1));
    }
    // --- câmera: a de jogo; aproxima devagar do K; no fim, o azul cresce no quadro e leva ao R2 ---
    const G = api.CAMS.game;
    if (t < 25.5) {                                                    // (zoom, sem mover a câmera para perto do jogador)
      const k = ease(clamp((t - 4) / 18, 0, 1));
      const pos = _v.copy(G.pos).add(_w.set(0.3 * k, 0.35 * k, -0.4 * k)), look = _c.copy(G.look).lerp(_w.set(KP.x - 0.7, 1.45, KP.z - 0.6), 0.85 * k);
      api.setCam(pos, look, G.fov - 22 * k);
    } else {
      // o azul vem para a frente, vira para a câmera e enche a tela
      const u = ease(clamp((t - 25.5) / 6.5, 0, 1)), b = shards[0];
      if (!S.end) { S.end = true; S.cam0 = api.camera.position.clone(); S.bl0 = b.position.clone(); api.circleShow(false); talkBox.hide(); }
      const front = _w.copy(S.cam0).add(_c.set(0, -0.05, -1).applyQuaternion(api.camera.quaternion).multiplyScalar(1.0));
      b.position.lerpVectors(S.bl0, front, u * u);
      b.scale.setScalar(1 + 0.6 * u); b.lookAt(api.camera.position);
      b.userData.mat.color.setScalar(1.12); b.userData.mat.opacity = 0.97;
      api.setCam(S.cam0, b.position, 40);
      shards.forEach((g, i) => { if (i) g.userData.mat.opacity = Math.max(0, g.userData.mat.opacity - dt * 0.8); });
    }
    if (mt >= S.info.end - 0.02 && !S.finished) { S.finished = true; const d = S.done; stop(); d && d(); }
  }
  return { start, stop, update, get active() { return !!S; }, get t() { return S ? S.t : 0; }, get placed() { return !!(S && S.placed); }, get touched() { return !!(S && S.touchT >= 0); }, get shards() { return shards; } };
}

export function createFinale(api) {
  const { talkBox } = api;
  let S = null;
  const KP = api.K_POS, PP = api.P_POS, FP = api.F_POS;
  // o fim da faixa: a música vai se calando; perto dos 30 s fica em silêncio — o "Você vem?" cai no silêncio
  const LINES = [[1.0, F('Você não terminou.')], [4.0, Kl('Terminei por hoje.')], [6.9, F('Então vai deixar tudo assim?')], [10.0, Kl('Eu não posso desfazer tudo.')],
    [13.1, F('Eles ainda podem rejeitar você.')], [16.2, Kl('Podem.')], [18.1, F('Você ainda pode falhar.')], [20.9, Kl('Posso.')], [22.8, F('E isso basta?')],
    [25.3, Kl('Não precisa bastar para você.')], [30.6, Kl('Você vem?')]];
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Vector3();
  function start(info, done) {
    S = { info, done, t: 0, said: 0, fs0: api.fig.scale.clone() };
    api.holdK(true); api.circleShow(false); api.label('');
    api.figGest({ s: 1, pt: new THREE.Vector3(FP.x - 1.5, 4, FP.z + 3), t: 0, dur: 2.6 });   // tenta começar outra exigência: nada sai
    api.warnPulse && api.warnPulse(1.8);
  }
  function stop() {
    if (!S) return;
    api.holdK(false); api.circleShow(null); api.setCam(null); api.fig.scale.copy(S.fs0);
    S = null;
  }
  function update(dt, mt) {
    if (!S) return;
    const t = S.t = mt - S.info.start;
    while (S.said < LINES.length && t >= LINES[S.said][0]) { const l = LINES[S.said++][1]; talkBox.show([l], null, { auto: true }); }
    if (talkBox.open) talkBox.update(dt);
    const K = api.K, KU = api.KU;
    // a figura tenta ampliar a silhueta (os braços sobem); o tamanho real quase não muda — quem muda é o quadro
    const grow = ease(clamp((t - 13) / 12, 0, 1));
    api.fig.scale.set(S.fs0.x * (1 + 0.12 * grow), S.fs0.y * (1 + 0.12 * grow), S.fs0.z * (1 + 0.12 * grow));
    if (t > 13 && t < 13.1 && !S.g1) { S.g1 = true; api.figGest({ s: -1, pt: new THREE.Vector3(FP.x + 3, 9, FP.z + 1), t: 0, dur: 11 }); }
    // o K: firme, de frente para ela; depois se volta para o jogador
    const turn = ease(clamp((t - 27.6) / 1.6, 0, 1));
    let dP = Math.atan2(-(PP.z - KP.z), PP.x - KP.x) - Math.PI / 2; dP = Math.atan2(Math.sin(dP), Math.cos(dP));
    K.rotation.y = Math.PI / 2 + dP * turn;
    if (KU.torso) KU.torso.rotation.z = 0.004 * Math.sin(t * 1.5);
    if (KU.head) { KU.head.rotation.z = -0.05 + 0.03 * Math.sin(t * 0.6); KU.head.rotation.y = 0; }
    for (const a of KU.arms) { a.k = Math.max(0, (a.k || 0) - dt * 2); api.reachArm(K, a.s, _w.set(KP.x, 1, KP.z), a.k); }
    // câmera: começa na de jogo (a figura no quadro); vai girando devagar até um plano lateral dos dois (o jogador à esquerda, o K à
    // direita) — a figura vai saindo do quadro sem que ninguém a persiga. No "Você vem?", só uma aproximação pequena.
    const G = api.CAMS.game, k = ease(clamp((t - 8) / 19, 0, 1)), k2 = ease(clamp((t - 29.5) / 6, 0, 1));
    const mid = _w.set((KP.x + PP.x) / 2, 0, (KP.z + PP.z) / 2), dx = KP.x - PP.x, dz = KP.z - PP.z, dl = Math.hypot(dx, dz), px = -dz / dl, pz = dx / dl;
    const side = _v.set(mid.x - px * 6.6, 1.7, mid.z - pz * 6.6);           // (do lado de fora da linha P–K, longe da figura)
    if (side.x < mid.x) side.set(mid.x + px * 6.6, 1.7, mid.z + pz * 6.6);
    const pos = G.pos.clone().lerp(side, k).lerp(_c.set(mid.x + (side.x - mid.x) * 0.9, 1.65, mid.z + (side.z - mid.z) * 0.9), k2);
    const look = G.look.clone().lerp(_c.set(mid.x, 1.2, mid.z), k);
    api.setCam(pos, look, G.fov + (40 - G.fov) * k);
    if (mt >= S.info.end - 0.02 && !S.finished) { S.finished = true; const d = S.done; d && d(); }
  }
  return { start, stop, update, get active() { return !!S; }, get t() { return S ? S.t : 0; } };
}
