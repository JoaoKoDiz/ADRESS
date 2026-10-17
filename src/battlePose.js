// Poses do jogador na batalha (só o jogador; o K e o Conduzir não mudam).
// BLOQUEAR — guarda: começa no clique que cria a placa e dura enquanto houver alguma placa do jogador (a 2ª não
// reinicia nada). Antebraços cruzados à frente do rosto (protegem a frente do personagem = a direção da figura, nunca
// o lado da câmera), cabeça baixa e recolhida atrás deles, joelhos dobrados, tronco inclinado; pés no lugar. Tensão,
// respiração e pequenos ajustes enquanto dura; reação curta num impacto; volta suave ao sair.
// REFLETIR — varredura: SÓ no instante em que um projétil bate na parede e é refletido. A mão percorre um arco (rápida,
// depois desacelera; o pulso continua o gesto), ombros e tronco giram junto, o outro braço equilibra; pés no lugar.
// Rebates seguidos partem da pose atual (sem voltar ao neutro) e variam a direção. Na passagem rápida, 2–3 rastros
// translúcidos e breves da mão e do antebraço. Nada disso atrasa os eventos: a pose segue o que já aconteceu.
// Os braços são posicionados por IK de 2 ossos com cotovelo dirigido (polo) no espaço do tronco (+X = frente,
// +Y = cima, +Z = lado do braço s = +1). Na guarda e na varredura os braços ficam um pouco mais longos (as proporções
// do corpo não alcançam o rosto) e voltam ao tamanho normal com a pose.
import * as THREE from 'three';

const UPPER = 0.28, FORE = 0.2, FIST = 0.12;                        // (FIST: do punho ao meio da mão)
const GUARD = {
  in: 14, out: 4.5,                 // velocidade de entrada (rápida) e de saída (suave)
  len: 1.45,                        // braços na guarda
  head: { x: -0.12, y: -0.16, pitch: -0.42 },   // cabeça abaixada e recolhida
  lean: -0.3,                       // tronco inclinado para a frente
  shrug: { x: 0.14, y: 0.03, z: 0.05 },      // ombros para a frente e para cima
  knee: 0.42,                       // joelhos dobrados
};
const SWEEP = { dur: 0.46, len: 1.25, hold: 1.5, relax: 1.1, ghostEvery: 0.04, ghostLife: 0.2, ghostOp: 0.42, ghosts: 3 };

const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createPlayerPose(PB, pModel, scene) {
  const arms = PB.arms.map(a => ({
    a, s: a.s, sh0: a.sh.position.clone(),
    upper: a.sh.children[1], fore: a.elbow.children.find(c => c !== a.wrist), wz0: a.wrist.rotation.z,
    qs: new THREE.Quaternion(), qe: new THREE.Quaternion(),
  }));
  const bySide = s => arms.find(x => x.s === s);
  const head0 = PB.head.position.clone(), pelvis0 = PB.pelvis.position.clone();

  // ---- IK: punho no ponto T (tronco), cotovelo para o lado de `pole`; braço com comprimento × len ----
  const _u = V(), _f = V(), _x = V(), _y = V(), _z = V(), _e = V(), _d = V(), _p = V(), _m = new THREE.Matrix4();
  function solve(arm, T, pole, len, tip = 0) {
    const S = _p.copy(arm.sh0); S.add(arm.shOff || _z.set(0, 0, 0));
    const A = UPPER * len, B = FORE * len + tip;                                    // tip: mira o meio da mão (punho reto)
    _d.copy(T).sub(S); let L = _d.length(); if (L < 1e-5) { _d.set(0, -1, 0); L = 0.1; }
    _d.multiplyScalar(1 / L); L = clamp(L, Math.abs(A - B) + 0.02, A + B - 0.004);
    const a1 = (A * A - B * B + L * L) / (2 * L), h = Math.sqrt(Math.max(0, A * A - a1 * a1));
    _x.copy(pole).addScaledVector(_d, -pole.dot(_d)); if (_x.lengthSq() < 1e-6) _x.set(0, -1, 0).addScaledVector(_d, _d.y); _x.normalize();
    _e.copy(S).addScaledVector(_d, a1).addScaledVector(_x, h);                       // cotovelo
    _u.copy(_e).sub(S).normalize();                                                  // braço
    _f.copy(S).addScaledVector(_d, L).sub(_e).normalize();                           // antebraço
    // base do ombro: −Y local = braço; +X local = para onde o antebraço dobra (a dobradiça do cotovelo é o Z local)
    _y.copy(_u).negate();
    _x.copy(_f).addScaledVector(_u, -_f.dot(_u));
    if (_x.lengthSq() < 1e-6) _x.copy(pole).addScaledVector(_u, -pole.dot(_u));
    _x.normalize(); _z.crossVectors(_x, _y).normalize(); _x.crossVectors(_y, _z);
    _m.makeBasis(_x, _y, _z); arm.qs.setFromRotationMatrix(_m);
    arm.qe.setFromAxisAngle(_z.set(0, 0, 1), Math.acos(clamp(_u.dot(_f), -1, 1)));
  }
  function setLen(arm, len) {
    arm.upper.scale.y = len; arm.a.elbow.position.y = -UPPER * len;
    arm.fore.scale.y = len; arm.a.wrist.position.y = -FORE * len;
  }
  // meio da mão atual (no espaço do tronco), como está desenhado
  const _w = V();
  function wristNow(arm, out) {
    pModel.updateMatrixWorld(true);
    arm.a.wrist.localToWorld(_w.set(0, -FIST, 0)); PB.torso.worldToLocal(_w); return out.copy(_w);
  }

  // ---------- BLOQUEAR ----------
  const guard = { want: false, g: 0, hit: 0, hitDir: 1, adj: 0, adjT: 0, adjFrom: 0, adjTo: 0 };
  // meio da mão (punhos cruzados à frente da boca/queixo; a mão da frente é a do braço +1), cotovelos baixos à frente do peito
  const GT = { 1: { W: V(0.77, 0.81, -0.07), pole: V(0.3, -0.68, 0.85) }, '-1': { W: V(0.76, 0.87, 0.07), pole: V(0.25, -0.68, -0.85) } };

  // ---------- REFLETIR ----------
  // poses finais do punho (lado do braço s = +1; para s = −1 o Z troca de sinal)
  // (meio da mão; todas fora da cabeça, que é grande, e ao alcance com o cotovelo um pouco dobrado)
  const ENDS = {
    up: V(0.36, 0.98, 0.56),         // para cima, à frente e para fora (o 1º rebate: de baixo para cima)
    upOut: V(0.12, 0.95, 0.76),      // alto e aberto
    across: V(0.56, 0.55, -0.05),    // à frente, cruzando o corpo
    side: V(0.15, 0.7, 0.95),        // lateral
    downAcross: V(0.42, 0.18, -0.05),// diagonal descendo, cruzando
    downOut: V(0.3, 0.05, 0.75),     // descendo, para fora
  };
  const NEXT = {                      // de onde o braço terminou → para onde o próximo gesto pode ir (com continuidade)
    up: ['downAcross', 'side', 'downOut'], upOut: ['downAcross', 'across'], across: ['downOut', 'side', 'upOut'],
    side: ['across', 'downAcross', 'up'], downAcross: ['upOut', 'side', 'up'], downOut: ['across', 'up', 'upOut'],
  };
  const sw = { on: false, s: 1, t: 0, w: 0, phase: 'idle', from: V(), to: V(), ctrl: V(), end: 'low', cur: V(), pole: V(), hold: 0,
    count: 0, wrist: 0, wristV: 0, prevP: V(), speed: 0, gT: 0, bal: V(), balW: 0, twist: 0, lean: 0, back: 0 };
  const HEAD_CLEAR = 0.72, _hc = V(), _q1 = V(), _q2 = V();
  const poleFor = (P, s) => _p.set(-0.25 + 0.2 * (P.y < 0.6 ? 1 : 0), -0.7, s * 0.9).normalize().clone();
  function bez(a, c, b, t, out) { const u = 1 - t; return out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(c, 2 * u * t).addScaledVector(b, t * t); }
  // progresso: arranca rápido, desacelera longo (e não tem velocidade uniforme)
  const prog = t => { const x = clamp(t, 0, 1); return (1 - Math.pow(1 - x, 3.4)) * (1 - Math.exp(-x * 22)) / (1 - Math.exp(-22)); };   // (arranque de ~0,05 s)

  // rastros: cópias translúcidas da mão e do antebraço (mesmas geometrias), postas na pose de um instante
  const ghostSrc = s => { const arm = bySide(s), list = [arm.fore]; arm.a.wrist.traverse(o => { if (o.isMesh) list.push(o); }); return list; };
  const ghosts = [];
  for (let i = 0; i < SWEEP.ghosts; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const g = new THREE.Group(); g.visible = false; g.matrixAutoUpdate = false; scene.add(g);
    ghosts.push({ g, mat, life: 0, meshes: [] });
  }
  function spawnGhost(s) {
    const src = ghostSrc(s); let gh = ghosts.find(x => x.life <= 0) || ghosts.reduce((a, b) => a.life < b.life ? a : b);
    while (gh.meshes.length < src.length) { const m = new THREE.Mesh(src[0].geometry, gh.mat); m.matrixAutoUpdate = false; gh.g.add(m); gh.meshes.push(m); }
    pModel.updateMatrixWorld(true);
    gh.meshes.forEach((m, i) => { if (i < src.length) { m.geometry = src[i].geometry; m.matrix.copy(src[i].matrixWorld); m.visible = true; } else m.visible = false; });
    gh.life = SWEEP.ghostLife; gh.g.visible = true;
  }

  function sweep(wx, wz) {
    // lado do braço: o da parede (no espaço do jogador); rebates seguidos ficam no mesmo braço
    pModel.updateMatrixWorld(true);
    const lp = pModel.worldToLocal(_p.set(wx, 1, wz));
    const chain = sw.w > 0.05;
    if (!chain) { sw.s = lp.z >= -0.25 ? 1 : -1; sw.count = 0; sw.end = 'low'; }
    const arm = bySide(sw.s);
    // ponto de partida = onde o punho está agora (com continuidade, mesmo no meio de outro gesto)
    if (chain && sw.phase !== 'relax') sw.from.copy(sw.cur); else wristNow(arm, sw.from);   // relaxando: parte de onde a mão está desenhada
    let key;
    if (sw.count === 0) key = 'up';                                               // 1º: da mão baixa para cima
    else { const opts = NEXT[sw.end] || NEXT.up; key = opts[(sw.count * 7 + (lp.x > 0 ? 1 : 0)) % opts.length]; }
    const e = ENDS[key]; sw.to.set(e.x, e.y, e.z * sw.s);
    // arco: o meio do caminho empurrado para fora/à frente (a mão passa em curva, não em linha reta)
    sw.ctrl.copy(sw.from).add(sw.to).multiplyScalar(0.5);
    const bulge = _d.set(0.32, 0.06, 0.2 * sw.s);
    if (sw.to.y < sw.from.y - 0.2) bulge.set(0.3, 0.12, 0.28 * sw.s);              // descendo: o arco passa pelo lado
    sw.ctrl.add(bulge);
    // o arco nunca passa pela cabeça (nem rente aos óculos/boné): afasta o ponto de controle do centro dela
    pModel.updateMatrixWorld(true);
    const H = PB.head.localToWorld(_hc.set(0, 0.5, 0)); PB.torso.worldToLocal(H);
    for (let it = 0; it < 8; it++) {
      let worst = 9, at = null;
      for (let i = 1; i < 10; i++) { const q = bez(sw.from, sw.ctrl, sw.to, i / 10, _q1); const d = q.distanceTo(H); if (d < worst) { worst = d; at = _q2.copy(q); } }
      if (worst >= HEAD_CLEAR) break;
      sw.ctrl.addScaledVector(at.sub(H).normalize(), (HEAD_CLEAR - worst) * 2.2);
    }
    sw.end = key; sw.count++; sw.t = 0; sw.phase = 'go'; sw.on = true; sw.gT = 0; sw.prevP.copy(sw.from);
    if (!chain) sw.w = Math.max(sw.w, 0.0001);
  }

  function reset() {
    guard.want = false; guard.g = 0; guard.hit = 0;
    sw.on = false; sw.w = 0; sw.phase = 'idle'; sw.count = 0; sw.balW = 0; sw.twist = 0; sw.lean = 0; sw.wrist = 0; sw.wristV = 0;
    for (const gh of ghosts) { gh.life = 0; gh.g.visible = false; }
    for (const arm of arms) setLen(arm, 1);
    PB.head.position.copy(head0); PB.pelvis.position.copy(pelvis0);
    for (const l of PB.legs) { l.hip.rotation.z = 0; l.knee.rotation.z = 0; l.foot.rotation.z = 0; }
    PB.torso.rotation.x = 0; PB.torso.rotation.y = 0;
  }

  const _t = V(), _bp = V();
  /** Chamado DEPOIS da animação base do jogador (respiração, olhar, gestos), por cima dela. */
  function update(dt, time) {
    for (const arm of arms) arm.a.wrist.rotation.z = arm.wz0;                         // (o punho não é refeito pela base)
    // ---- pesos ----
    guard.g += ((guard.want ? 1 : 0) - guard.g) * Math.min(1, dt * (guard.want ? GUARD.in : GUARD.out));
    guard.hit = Math.max(0, guard.hit - dt / 0.32);
    const g = ease(guard.g);
    if (sw.on) {
      sw.t += dt;
      if (sw.phase === 'go') { sw.w = Math.min(1, sw.w + dt / 0.12); if (sw.t >= SWEEP.dur) { sw.phase = 'hold'; sw.t = 0; } }
      else if (sw.phase === 'hold') { if (sw.t >= SWEEP.hold) { sw.phase = 'relax'; sw.t = 0; } }
      else if (sw.phase === 'relax') { sw.w = Math.max(0, sw.w - dt / SWEEP.relax); if (sw.w <= 0) { sw.on = false; sw.phase = 'idle'; sw.count = 0; } }
    }
    const w = ease(sw.w);

    // ---- corpo: guarda (joelhos, tronco, cabeça, ombros) ----
    const hk = guard.hit * guard.hit;
    const breath = Math.sin(time * 2.3), tense = Math.sin(time * 13.7) * 0.5 + Math.sin(time * 9.1) * 0.5;
    const kneeA = GUARD.knee * g * (1 + 0.06 * breath) + 0.1 * hk * g;
    for (const l of PB.legs) { l.hip.rotation.z = kneeA; l.knee.rotation.z = -2 * kneeA; l.foot.rotation.z = kneeA; }
    PB.pelvis.position.set(pelvis0.x - 0.05 * g, pelvis0.y - 0.47 * (1 - Math.cos(kneeA)), pelvis0.z);
    PB.torso.rotation.z += (GUARD.lean + 0.015 * breath) * g + 0.16 * hk * g;           // impacto: o tronco recua um pouco
    PB.head.position.set(head0.x + GUARD.head.x * g - 0.03 * hk * g, head0.y + GUARD.head.y * g, head0.z);
    PB.head.rotation.z = PB.head.rotation.z * (1 - g) + (GUARD.head.pitch + 0.02 * breath + 0.08 * hk) * g;
    PB.head.rotation.y *= 1 - 0.85 * g;

    // ---- corpo: varredura (giro e inclinação do tronco acompanhando a mão) ----
    let twist = 0, lean = 0;
    if (sw.w > 0) {
      const hz = sw.cur.z * sw.s, hy = sw.cur.y;
      twist = -sw.s * clamp(0.62 * hz + 0.3 * (sw.cur.x - 0.3), -0.7, 0.7);            // ombros giram para o lado da mão
      lean = sw.s * 0.12 * clamp(hz, -1, 1) - 0.06 * clamp(hy - 0.7, -0.5, 0.5);
    }
    sw.twist += (twist - sw.twist) * Math.min(1, dt * 16); sw.lean += (lean - sw.lean) * Math.min(1, dt * 12);
    PB.torso.rotation.y = sw.twist * w; PB.torso.rotation.x = sw.lean * w;

    // ---- braços: guarda ----
    if (g > 0.001) {
      guard.adjT -= dt; if (guard.adjT <= 0) { guard.adjT = 1.1 + Math.random() * 1.2; guard.adjFrom = guard.adj; guard.adjTo = (Math.random() - 0.5) * 2; guard.adjK = 0; }
      guard.adjK = Math.min(1, (guard.adjK || 0) + dt / 0.5); guard.adj = guard.adjFrom + (guard.adjTo - guard.adjFrom) * ease(guard.adjK);
      for (const arm of arms) {
        const k = GT[arm.s];
        arm.shOff = _y.set(GUARD.shrug.x * g, (GUARD.shrug.y + 0.01 * breath) * g, -arm.s * GUARD.shrug.z * g).clone();
        _t.copy(k.W);
        _t.y += 0.012 * breath + 0.004 * tense + 0.02 * guard.adj * arm.s;               // respiração, tremor de tensão, ajuste
        _t.x += 0.01 * guard.adj - 0.07 * hk;                                            // impacto: braços empurrados para trás
        solve(arm, _t, k.pole, GUARD.len, FIST);
        arm.a.sh.quaternion.slerp(arm.qs, g); arm.a.elbow.quaternion.slerp(arm.qe, g);
        arm.a.wrist.rotation.z = arm.a.wrist.rotation.z * (1 - g) + (-0.1) * g;           // punho quase reto (a mão segue o antebraço)
        arm.a.sh.position.copy(arm.sh0).addScaledVector(arm.shOff, 1);
      }
    } else for (const arm of arms) { arm.shOff = null; arm.a.sh.position.copy(arm.sh0); }

    // ---- braços: varredura ----
    if (sw.w > 0) {
      const arm = bySide(sw.s), other = bySide(-sw.s);
      if (sw.phase === 'go') {
        const u = prog(sw.t / SWEEP.dur); bez(sw.from, sw.ctrl, sw.to, u, sw.cur);
      } else {                                                                           // segura a pose com vida (não fica parado)
        const k = sw.phase === 'hold' ? Math.min(1, sw.t / 0.6) : 1;
        _t.copy(sw.to); _t.y += -0.05 * k + 0.012 * breath; _t.x += 0.01 * Math.sin(time * 1.7);
        sw.cur.lerp(_t, Math.min(1, dt * 3));
      }
      // velocidade da mão → pulso que acompanha atrasado e depois continua o gesto (mola)
      const v = sw.prevP.distanceTo(sw.cur) / Math.max(dt, 1e-4); sw.prevP.copy(sw.cur); sw.speed = v;
      const wt = -0.09 * Math.min(v, 9);
      sw.wristV += ((wt - sw.wrist) * 120 - sw.wristV * 13) * dt; sw.wrist += sw.wristV * dt;
      // rastros só na passagem rápida
      if (sw.phase === 'go') { sw.gT -= dt; if (v > 2.4 && sw.gT <= 0 && sw.t > 0.02) { spawnGhost(sw.s); sw.gT = SWEEP.ghostEvery; } }
      const len = 1 + (SWEEP.len - 1) * w;
      setLen(arm, len); arm.shOff = arm.shOff || null;
      solve(arm, sw.cur, poleFor(sw.cur, sw.s), len, FIST);
      arm.a.sh.quaternion.slerp(arm.qs, w); arm.a.elbow.quaternion.slerp(arm.qe, w);
      arm.a.wrist.rotation.z += sw.wrist * w;
      // o outro braço equilibra: abre para o lado oposto, para trás e para baixo quando a mão sobe
      const up = clamp((sw.cur.y - 0.5) / 0.6, -0.4, 1);
      sw.bal.set(-0.18 - 0.08 * up, 0.42 - 0.12 * up + 0.01 * breath, -sw.s * (0.62 + 0.08 * up));
      solve(other, sw.bal, _bp.set(-0.3, -0.6, -sw.s).normalize(), 1);
      other.a.sh.quaternion.slerp(other.qs, w * 0.85); other.a.elbow.quaternion.slerp(other.qe, w * 0.85);
    }
    // comprimento dos braços: o maior dos dois pedidos
    for (const arm of arms) {
      const isSw = sw.w > 0 && arm.s === sw.s;
      setLen(arm, Math.max(1 + (GUARD.len - 1) * g, isSw ? 1 + (SWEEP.len - 1) * w : 1));
    }
    // rastros somem rápido
    for (const gh of ghosts) {
      if (gh.life <= 0) continue; gh.life -= dt;
      const k = Math.max(0, gh.life / SWEEP.ghostLife); gh.mat.opacity = SWEEP.ghostOp * k * Math.sqrt(k);
      if (gh.life <= 0) gh.g.visible = false;
    }
  }

  return {
    update, reset, sweep, GUARD, GT, SWEEP, ENDS,
    /** A guarda dura enquanto houver placa do jogador (a 2ª placa não reinicia nada). */
    setGuard(on) { guard.want = !!on; },
    /** Impacto numa placa do jogador: reação curta e contida. */
    guardHit() { guard.hit = 1; },
    get guard() { return guard.g; }, get sweepW() { return sw.w; }, get sweepPhase() { return sw.phase; }, get sweepEnd() { return sw.end; },
    get ghosts() { return ghosts.filter(g => g.life > 0).length; }, get sweepSide() { return sw.s; },
  };
}
