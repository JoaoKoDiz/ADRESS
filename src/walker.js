// O motorista a pé (tecla L na van): anda livremente pelo bairro — entra nos quintais e na praça —, mas não entrega.
// Colisão simples com caixas (AABB), deslizando nas paredes. Mesmo modelo/cores do motorista da tela inicial.
import * as THREE from 'three';
import { buildBody, BODY, ARM_REST, CHAR_DEFAULT, CHAR_MATS, setCharColors } from './models/driver.js';
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
  let speedMul = 1;

  let area = null;                             // Veneza: onde dá para pisar (ilhas, praças, pontes); fora disso é água
  const hits = (x, z, boxes) => (area && !area(x, z)) || boxes.some(b => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS && (!b.r || Math.hypot(x - b.cx, z - b.cz) < b.r + RADIUS));   // (b.r: obstáculo redondo, Órbita)
  // a van é um círculo; se o personagem já está dentro dele (acabou de descer), só impede de entrar mais fundo
  const hitsVan = (x, z, van) => { const d = Math.hypot(x - van.x, z - van.z); return d < 2.5 + RADIUS && d < Math.hypot(st.x - van.x, st.z - van.z) - 1e-6; };
  const blocked = (x, z, boxes, van) => hits(x, z, boxes) || hitsVan(x, z, van);

  let floorY = 0;                              // altura do chão (0; no terraço de um prédio, a laje)
  let lowG = false, yAbs = 0, vy = 0;          // gravidade baixa (Órbita): passos saltitantes e quedas lentas
  function apply() {
    root.position.set(st.x, lowG ? yAbs : floorY, st.z);
    root.rotation.y = -st.heading;
  }

  // caminhada: pés plantados por IK (gait.js); medidas do buildBody (coxa 0,25, canela 0,22, quadril a 0,61, tornozelo a 0,14)
  const gait = createGait({ legs, arms }, { L1: 0.25, L2: 0.22, hip: BODY.pelvisY - 0.03, ankle: 0.14, stride: 0.46, ...ARM_GAIT });
  const S_BODY = 0.9;
  let t = 0, turnV = 0, lastHeading = 0;
  /** travel: distância realmente andada no quadro (mundo; − de ré). */
  function animate(dt, travel) {
    t += dt;
    const g = gait.update(dt, travel / S_BODY), a = g.amt;
    const turn = st.heading - lastHeading; lastHeading = st.heading;
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
    pose(x, z, heading) { st.x = x; st.z = z; st.heading = heading; yAbs = floorY; vy = 0; apply(); },
    /** Multiplica a velocidade a pé (ex.: vento da nevasca). */
    setSpeedMul(k) { speedMul = k; },
    show(on) { root.visible = on; if (!on) st.speed = 0; },
    /** Põe o personagem ao lado da porta do motorista (tenta os dois lados da van; sem espaço, afasta mais). */
    /** strict (Veneza): sem lugar livre ao lado (só água), não desce e retorna false. */
    placeBesideVan(van, boxes, strict = false) {
      const fx = Math.cos(van.heading), fz = Math.sin(van.heading);
      for (const d of [3.4, 4.2, 5.0]) for (const side of [1, -1]) {
        yAbs = -999;                                                   // (gravidade baixa: começa apoiado no chão)
        const x = van.x + side * fz * d, z = van.z - side * fx * d;
        if (!hits(x, z, boxes)) { st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; apply(); return true; }
      }
      if (strict) {                                   // também tenta na frente e atrás (proa/popa encostada no cais)
        for (const d of [3.6, 4.6]) for (const sg of [1, -1]) { const x = van.x + sg * fx * d, z = van.z + sg * fz * d; if (!hits(x, z, boxes)) { st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; apply(); return true; } }
        return false;
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
