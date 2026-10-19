// O motorista a pé (tecla L na van): anda livremente pelo bairro — entra nos quintais e na praça —, mas não entrega.
// Colisão simples com caixas (AABB), deslizando nas paredes. Mesmo modelo/cores do motorista da tela inicial.
import * as THREE from 'three';
import { obbHits } from './obb.js';
import { buildBody, BODY, ARM_REST, CHAR_DEFAULT, CHAR_MATS, setCharColors, restArms } from './models/driver.js';
import { createGait } from './gait.js';
const ARM_GAIT = { open: ARM_REST.open, fwd: ARM_REST.fwd, elbow: ARM_REST.elbow, wrist: ARM_REST.wrist };
export { CHAR_DEFAULT, CHAR_MATS, setCharColors };

const SPEED = 6.5, BACK_SPEED = 3.5, TURN = 3.2, RADIUS = 0.55;

export function createWalker(scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const body = new THREE.Group();
  body.scale.setScalar(0.9);                                   // ~2,1 de altura (a van tem 2,6)
  root.add(body);
  // modelo olha para +X local (rotation.y = −heading). Detalhes do desenho em models/driver.js; balançar = rotation.z.
  const { pelvis, torso, legs, arms, head } = buildBody(body);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

  const st = { x: 0, z: 0, heading: 0, speed: 0 };
  let speedMul = 1, vel = 0;                   // vel: velocidade atual (arranca e para em ~0,2 s, sem deslizar)
  let script = null;                           // trajeto curto roteirizado (descer/subir na van): { pts, i, speed, end, done }
  let lastSide = 0;                            // lado da van em que desceu (+1 motorista, −1 passageiro; 0 = outro ponto)
  let onShow = null;
  let carry = 0, carryOn = false;              // carregando uma caixa: os dois braços para a frente, segurando-a pelos lados
  let idleT = 0, nextLook = 2.5, lookGoal = 0, lookYaw = 0, facing = false, life = false;   // parado: olhares de vez em quando (só no jogo livre: liveFrame)

  let area = null;                             // Veneza: onde dá para pisar (ilhas, praças, pontes); fora disso é água
  const hits = (x, z, boxes) => (area && !area(x, z)) || boxes.some(b => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS && (!b.r || Math.hypot(x - b.cx, z - b.cz) < b.r + RADIUS) && (!b.obb || obbHits(b.obb, x, z, RADIUS)));   // (b.obb: casa girada)   // (b.r: obstáculo redondo, Órbita)
  // a van é um círculo; se o personagem já está dentro dele (acabou de descer), só impede de entrar mais fundo
  const hitsVan = (x, z, van) => { const d = Math.hypot(x - van.x, z - van.z); return d < 2.5 + RADIUS && d < Math.hypot(st.x - van.x, st.z - van.z) - 1e-6; };
  const blocked = (x, z, boxes, van) => hits(x, z, boxes) || hitsVan(x, z, van);

  let floorY = 0;                              // altura do chão (0; no terraço de um prédio, a laje)
  let lowG = false, yAbs = 0, vy = 0;          // gravidade baixa (Órbita): passos saltitantes e quedas lentas
  // visOff: o corpo pode olhar para outro lado sem mudar `heading` (a direção dos controles e da câmera): virar para quem fala,
  // sair/entrar na van pela porta. A câmera atrás do personagem não gira sozinha; ao andar de novo, o corpo volta a heading.
  let visOff = 0;
  const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  function apply() {
    root.position.set(st.x, lowG ? yAbs : floorY, st.z);
    root.rotation.y = -(st.heading + visOff);
  }

  // caminhada: pés plantados por IK (gait.js); medidas do buildBody (coxa 0,25, canela 0,22, quadril a 0,61, tornozelo a 0,14)
  const gait = createGait({ legs, arms }, { L1: 0.25, L2: 0.22, hip: BODY.pelvisY - 0.03, ankle: 0.14, stride: 0.46, ...ARM_GAIT });
  const S_BODY = 0.9;
  let t = 0, turnV = 0, lastHeading = 0;
  /** travel: distância realmente andada no quadro (mundo; − de ré). */
  function animate(dt, travel) {
    t += dt;
    const ang = st.heading + visOff;
    const turn = wrap(ang - lastHeading); lastHeading = ang;
    const g = gait.update(dt, travel / S_BODY, turn / Math.max(dt, 1e-3)), a = g.amt;
    turnV += (turn / Math.max(dt, 1e-3) - turnV) * Math.min(1, dt * 6);
    body.position.y = g.bob * S_BODY;
    body.position.z = g.sway * S_BODY;
    pelvis.rotation.y = g.twist;
    torso.rotation.y = -g.twist * 1.4 + THREE.MathUtils.clamp(turnV * 0.035, -0.25, 0.25) * a;
    torso.rotation.z = -g.lean + 0.012 * Math.sin(t * 2) * (1 - a);           // inclina um pouco para a frente / respira parado
    torso.rotation.x = -g.sway * 2 - THREE.MathUtils.clamp(turnV * 0.02, -0.12, 0.12) * a;
    head.rotation.z = g.lean * 0.8;                                           // cabeça estável, olhando à frente
    head.rotation.y = g.twist * 0.4;
    head.rotation.x = g.sway * 1.5;
    torso.scale.y = 1 + 0.012 * Math.sin(t * 2.2) * (1 - a);                  // respiração
    // parado por um tempo: olha em volta de vez em quando (cabeça e um pouco do tronco), sem ficar estático
    if (a < 0.05 && !facing && life) { idleT += dt; if (idleT > nextLook) { lookGoal = lookGoal ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.2); nextLook = idleT + 2.2 + Math.random() * 2.8; } }
    else { idleT = 0; nextLook = 2.5; lookGoal = 0; }
    facing = false; life = false;
    lookYaw += (lookGoal - lookYaw) * Math.min(1, dt * 2.6);
    head.rotation.y += lookYaw; torso.rotation.y += lookYaw * 0.22;
    carry += ((carryOn ? 1 : 0) - carry) * Math.min(1, dt * 9);
    if (carry > 0.01) {                                                       // abraça a caixa: braços à frente, cotovelos pouco dobrados (balançam junto com o passo)
      const k = carry * carry * (3 - 2 * carry);
      arms.forEach((q, i) => {
        const sd = q.s || (i ? 1 : -1), ph = Math.sin(g.u * Math.PI * 2 + i * Math.PI) * 0.04 * a;
        q.sh.rotation.x += (-sd * 0.02 - q.sh.rotation.x) * k; q.sh.rotation.y += (sd * 0.18 - q.sh.rotation.y) * k;
        q.sh.rotation.z += (1.12 + ph - q.sh.rotation.z) * k; q.elbow.rotation.z += (0.42 - q.elbow.rotation.z) * k;
        if (q.wrist) q.wrist.rotation.z += (0.25 - q.wrist.rotation.z) * k;
      });
      torso.rotation.z += 0.05 * k;                                           // o peso puxa os ombros um pouco para trás
    }
  }

  return {
    object: root,
    get x() { return st.x; }, get z() { return st.z; }, get heading() { return st.heading; }, get speed() { return st.speed; },
    get visible() { return root.visible; },
    get floor() { return floorY; },
    /** Muda a altura do chão em que ele anda (terraço de prédio). */
    setFloor(y) { floorY = y; apply(); },
    setArea(fn) { area = fn; },
    /** Gravidade baixa (Órbita). */
    setLowGravity(on) { lowG = !!on; yAbs = floorY; vy = 0; apply(); },
    /** Põe o personagem num ponto, olhando para `heading` (Shop). */
    pose(x, z, heading) { st.x = x; st.z = z; st.heading = heading; visOff = 0; lastHeading = heading; vel = 0; script = null; yAbs = floorY; vy = 0; apply(); },
    /** Multiplica a velocidade a pé (ex.: vento da nevasca). */
    setSpeedMul(k) { speedMul = k; },
    show(on) { root.visible = on; if (!on) { st.speed = 0; vel = 0; script = null; carry = 0; carryOn = false; visOff = 0; } if (onShow) onShow(on); },
    /** Neste quadro o personagem está sob controle do jogador (a pé no bairro): parado, ele olha em volta de vez em quando.
     *  (As cenas que só deixam ele respirando não chamam isto.) */
    liveFrame() { life = true; },
    /** Carregando uma caixa nos braços (Bairro 1: a caixa do K). */
    setCarry(on, snap = false) { carryOn = !!on; if (snap && !on && carry > 0) { carry = 0; restArms(arms); } },
    /** Avisado a cada show(on) (a van mostra ou esconde o motorista na cabine). */
    set onShow(fn) { onShow = fn; },
    /** Lado da van em que acabou de descer (placeBesideVan): +1 motorista (esquerda), −1 passageiro, 0 = outro ponto. */
    get exitSide() { return lastSide; },
    /** Trajeto curto roteirizado (pontos {x, z}), a passo de quem anda; no fim o corpo vira para endHeading (opcional).
     *  Só o corpo segue o trajeto: `heading` (controles e câmera) não muda. startFacing: para onde o corpo olha no começo.
     *  back: anda de costas (passo para trás, olhando para o outro lado do trajeto). */
    walkPath(pts, speed = 5.5, endHeading = null, startFacing = null, back = false) {
      script = { pts: pts.slice(), i: 0, speed, end: endHeading, t: 0, back };
      if (startFacing !== null) { visOff = wrap(startFacing - st.heading); lastHeading = st.heading + visOff; apply(); }
    },
    /** Para onde o corpo está virado agora (heading + o desvio de quando olha para alguém ou segue um trajeto). */
    get facing() { return st.heading + visOff; },
    get scripted() { return !!script; },
    /** O trajeto (de `from`, ou do ponto atual, passando pelos pontos) está livre dos obstáculos? Amostras a cada 0,3 com um
     *  raio menor que o da colisão: o trajeto roteirizado não tem colisão, então só é usado quando não atravessa nada. */
    pathFree(pts, boxes, from = null) {
      const R = 0.35;
      const hit = (x, z) => (area && !area(x, z)) || boxes.some(b => x > b.x0 - R && x < b.x1 + R && z > b.z0 - R && z < b.z1 + R && (!b.r || Math.hypot(x - b.cx, z - b.cz) < b.r + R) && (!b.obb || obbHits(b.obb, x, z, R)));
      let px = from ? from.x : st.x, pz = from ? from.z : st.z;
      if (from && hit(px, pz)) return false;
      for (const P of pts) {
        const n = Math.max(1, Math.ceil(Math.hypot(P.x - px, P.z - pz) / 0.3));
        for (let i = 1; i <= n; i++) if (hit(px + (P.x - px) * i / n, pz + (P.z - pz) * i / n)) return false;
        px = P.x; pz = P.z;
      }
      return true;
    },
    /** Interrompe o trajeto roteirizado onde estiver (o jogador já quer andar). */
    stopScript() { script = null; },
    /** Avança o trajeto roteirizado (sem colisão: é curto e começa/termina em lugares livres). Retorna true ao terminar. */
    stepScript(dt) {
      if (!script) return true;
      const S = script, x0 = st.x, z0 = st.z;
      S.t += dt;
      let left = S.speed * dt, vis = st.heading + visOff;           // (só o corpo vira; heading fica)
      while (left > 1e-6 && S.i < S.pts.length) {
        const P = S.pts[S.i], dx = P.x - st.x, dz = P.z - st.z, d = Math.hypot(dx, dz);
        if (d < 1e-4) { S.i++; continue; }
        vis += wrap(Math.atan2(dz, dx) + (S.back ? Math.PI : 0) - vis) * Math.min(1, dt * 16);
        const k = Math.min(left, d); st.x += dx / d * k; st.z += dz / d * k; left -= k;
        if (k >= d - 1e-6) S.i++;
      }
      let done = S.i >= S.pts.length;
      if (done && S.end !== null) {                                 // chegou: vira para a direção final com passinhos
        const dh = wrap(S.end - vis);
        vis += Math.sign(dh) * Math.min(Math.abs(dh), 9 * dt);
        done = Math.abs(dh) < 0.05 || S.t > 1.0;
      }
      if (S.t > 2.5) done = true;                                   // segurança
      visOff = wrap(vis - st.heading);
      animate(dt, (st.x - x0) * Math.cos(vis) + (st.z - z0) * Math.sin(vis));
      apply();
      if (done) { script = null; vel = 0; st.speed = 0; }
      return done;
    },
    /** Vira devagar para olhar o ponto (x, z) (conversa, entrega a pé), com passinhos; respira parado.
     *  listen: escutando alguém (a cabeça assente de leve, de vez em quando). */
    face(x, z, dt, listen = false) {
      const dh = wrap(Math.atan2(z - st.z, x - st.x) - (st.heading + visOff));   // só o corpo vira: a câmera não gira sozinha
      visOff = wrap(visOff + Math.sign(dh) * Math.min(Math.abs(dh), Math.max(0.6, Math.abs(dh) * 5) * dt));
      st.speed = 0; vel = 0;
      facing = true; animate(dt, 0);
      if (listen) { const n = Math.max(0, Math.sin(t * 1.7)) ** 3; head.rotation.z -= 0.09 * n; torso.rotation.z -= 0.015 * n; }   // (rosto para +X: rotation.z negativo inclina a cabeça para a frente)
      apply();
    },
    /** Parado sem controle (diálogos): mantém a respiração e termina o passo em andamento. */
    idle(dt) { st.speed = 0; vel = 0; animate(dt, 0); apply(); },
    /** Põe o personagem ao lado da porta do motorista (tenta os dois lados da van; sem espaço, afasta mais). */
    /** strict (Veneza): sem lugar livre ao lado (só água), não desce e retorna false. */
    placeBesideVan(van, boxes, strict = false) {
      const fx = Math.cos(van.heading), fz = Math.sin(van.heading);
      lastSide = 0; vel = 0; script = null; visOff = 0;
      for (const d of [3.4, 4.2, 5.0]) for (const side of [1, -1]) {
        yAbs = -999;                                                   // (gravidade baixa: começa apoiado no chão)
        const x = van.x + side * fz * d, z = van.z - side * fx * d;
        if (!hits(x, z, boxes)) { st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; lastSide = d < 4.5 ? side : 0; apply(); return true; }
      }
      if (strict) {                                   // também tenta na frente e atrás (proa/popa encostada no cais)
        for (const d of [3.6, 4.6]) for (const sg of [1, -1]) { const x = van.x + sg * fx * d, z = van.z + sg * fz * d; if (!hits(x, z, boxes)) { st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; apply(); return true; } }
        return false;
      }
      // sem lugar ao lado: o ponto livre mais perto em volta (fora da van), para não começar preso dentro de um sólido
      const clearOfVan = (x, z) => [-1.5, 0, 1.5].every(k => Math.hypot(x - van.x - fx * k, z - van.z - fz * k) > 1.85);
      for (let d = 2.5; d <= 8; d += 0.5) for (let k = 0; k < 16; k++) {
        const a = van.heading + Math.PI / 2 + k * Math.PI / 8, x = van.x + Math.cos(a) * d, z = van.z + Math.sin(a) * d;
        if (clearOfVan(x, z) && !hits(x, z, boxes)) { yAbs = -999; st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; apply(); return true; }
      }
      st.x = van.x + fz * 3.4; st.z = van.z - fx * 3.4; st.heading = van.heading; st.speed = 0; apply();
      return true;
    },
    nearVan(van) { return Math.hypot(st.x - van.x, st.z - van.z) < 5.6; },
    /**
     * axis: teclas (x: −1 esquerda…1 direita, z: −1 norte…1 sul). mode 'car': W/S andam, A/D viram (câmera atrás);
     * 'screen': anda na direção da tecla (visão geral). boxes: obstáculos; van: parada, também é obstáculo.
     */
    update(dt, axis, mode, boxes, van) {
      let move = 0;
      if (visOff && (axis.x || axis.z)) { visOff *= Math.exp(-14 * dt); if (Math.abs(visOff) < 0.01) visOff = 0; }   // voltou a andar: o corpo volta para heading
      if (mode === 'car') {
        st.heading += axis.x * TURN * dt;
        move = (axis.z < 0 ? SPEED : axis.z > 0 ? -BACK_SPEED : 0) * speedMul;
      } else if (axis.x || axis.z) {
        const want = Math.atan2(axis.z, axis.x);
        let d = want - st.heading;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        st.heading += d * Math.min(1, dt * 14);
        move = SPEED * speedMul;
      }
      // arranca e para em ~0,2 s: o corpo não "patina" para a frente com as pernas já paradas
      const dv = move - vel, acc = (Math.abs(move) > Math.abs(vel) && Math.sign(move || 1) === Math.sign(vel || move || 1) ? 30 : 42) * dt;
      vel = Math.abs(dv) <= acc ? move : vel + Math.sign(dv) * acc;
      move = vel;
      st.speed = move;
      const dx = Math.cos(st.heading) * move * dt, dz = Math.sin(st.heading) * move * dt;
      const x0 = st.x, z0 = st.z;
      if (!blocked(st.x + dx, st.z, boxes, van)) st.x += dx;     // desliza: tenta cada eixo separado
      if (!blocked(st.x, st.z + dz, boxes, van)) st.z += dz;
      animate(dt, (st.x - x0) * Math.cos(st.heading) + (st.z - z0) * Math.sin(st.heading));   // o passo segue o que ele realmente andou
      if (lowG) {                                                    // gravidade baixa: cai devagar; andando, dá pulinhos
        vy -= 3.2 * dt; yAbs += vy * dt;
        if (yAbs <= floorY) { yAbs = floorY; vy = Math.abs(move) > 0.5 ? 1.5 : 0; }
      }
      apply();
    },
  };
}
