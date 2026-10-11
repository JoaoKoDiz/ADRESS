// O motorista a pé (tecla L na van): anda livremente pelo bairro — entra nos quintais e na praça —, mas não entrega.
// Colisão simples com caixas (AABB), deslizando nas paredes. Mesmo modelo/cores do motorista da tela inicial.
import * as THREE from 'three';
import { buildBody, CHAR_DEFAULT, CHAR_MATS, setCharColors } from './models/driver.js';
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
  let phase = 0;

  let area = null;                             // Veneza: onde dá para pisar (ilhas, praças, pontes); fora disso é água
  const hits = (x, z, boxes) => (area && !area(x, z)) || boxes.some(b => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS);
  // a van é um círculo; se o personagem já está dentro dele (acabou de descer), só impede de entrar mais fundo
  const hitsVan = (x, z, van) => { const d = Math.hypot(x - van.x, z - van.z); return d < 2.5 + RADIUS && d < Math.hypot(st.x - van.x, st.z - van.z) - 1e-6; };
  const blocked = (x, z, boxes, van) => hits(x, z, boxes) || hitsVan(x, z, van);

  let floorY = 0;                              // altura do chão (0; no terraço de um prédio, a laje)
  function apply() {
    root.position.set(st.x, floorY, st.z);
    root.rotation.y = -st.heading;
  }

  let walkAmt = 0, t = 0, turnV = 0, lastHeading = 0;
  /** Ciclo de caminhada: quadril, joelho, tornozelo, braços com cotovelo, giro do tronco, balanço do quadril, quique e inclinação. */
  function animate(dt, move) {
    t += dt;
    walkAmt += ((move ? 1 : 0) - walkAmt) * Math.min(1, dt * 9);        // entra e sai do passo suavemente
    const dir = move < 0 ? -1 : 1;
    phase += dt * Math.abs(move) * 1.7 * dir;
    const a = walkAmt, k = 0.5 + 0.5 * Math.min(1, Math.abs(move) / SPEED);   // anda de ré: passos menores
    const turn = st.heading - lastHeading; lastHeading = st.heading;
    turnV += (turn / Math.max(dt, 1e-3) - turnV) * Math.min(1, dt * 6);
    legs.forEach((l, i) => {
      const p = phase + (i ? Math.PI : 0), sn = Math.sin(p), cs = Math.cos(p);
      const hip = sn * 0.8 * a * k;
      const knee = -(0.1 + 0.95 * Math.pow(Math.max(0, cs), 2)) * a * k;      // dobra na fase de balanço, quase reto no apoio
      l.hip.rotation.z = hip;
      l.knee.rotation.z = knee;
      l.foot.rotation.z = -(hip + knee) * 0.7 + 0.1 * a;                       // pé acompanha o chão (calcanhar e ponta)
    });
    arms.forEach((m, i) => {
      const p = phase + (i ? 0 : Math.PI), sn = Math.sin(p);                   // braço oposto à perna do mesmo lado
      m.sh.rotation.z = sn * 0.75 * a * k + 0.05;
      m.elbow.rotation.z = (0.15 + 0.7 * Math.max(0, sn)) * a + 0.1 * (1 - a) + 0.05 * Math.sin(t * 1.6 + i);   // cotovelo dobra quando o braço vai à frente
      m.sh.rotation.x = (i ? 1 : -1) * (0.03 + 0.06 * a);                       // braços levemente afastados do corpo
    });
    const sw = Math.sin(phase);
    body.position.y = 0.055 * Math.cos(phase * 2) * a;                         // sobe no apoio, desce na passada dupla
    body.position.z = sw * 0.05 * a;                                           // quadril desloca para o lado do apoio
    pelvis.rotation.y = sw * 0.14 * a * k;                                     // quadril gira…
    torso.rotation.y = -sw * 0.22 * a * k + THREE.MathUtils.clamp(turnV * 0.04, -0.3, 0.3);   // …tronco contra-gira (e entra nas curvas)
    torso.rotation.z = -0.13 * a * k + 0.012 * Math.sin(t * 2) * (1 - a);     // inclina para a frente / respira parado
    torso.rotation.x = Math.sin(phase) * 0.05 * a - THREE.MathUtils.clamp(turnV * 0.025, -0.15, 0.15);
    head.rotation.z = 0.1 * a * k;                                            // cabeça se mantém olhando à frente (compensa a inclinação)
    head.rotation.x = -sw * 0.04 * a;
    head.rotation.y = -torso.rotation.y * 0.6;                                // acompanha a contra-rotação do tronco
    torso.scale.y = 1 + 0.012 * Math.sin(t * 2.2) * (1 - a);                   // respiração
  }

  return {
    object: root,
    get x() { return st.x; }, get z() { return st.z; }, get heading() { return st.heading; }, get speed() { return st.speed; },
    get visible() { return root.visible; },
    get floor() { return floorY; },
    /** Muda a altura do chão em que ele anda (terraço de prédio). */
    setFloor(y) { floorY = y; apply(); },
    setArea(fn) { area = fn; },
    /** Põe o personagem num ponto, olhando para `heading` (Shop). */
    pose(x, z, heading) { st.x = x; st.z = z; st.heading = heading; apply(); },
    show(on) { root.visible = on; if (!on) st.speed = 0; },
    /** Põe o personagem ao lado da porta do motorista (tenta os dois lados da van; sem espaço, afasta mais). */
    /** strict (Veneza): sem lugar livre ao lado (só água), não desce e retorna false. */
    placeBesideVan(van, boxes, strict = false) {
      const fx = Math.cos(van.heading), fz = Math.sin(van.heading);
      for (const d of [3.4, 4.2, 5.0]) for (const side of [1, -1]) {
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
        move = axis.z < 0 ? SPEED : axis.z > 0 ? -BACK_SPEED : 0;
      } else if (axis.x || axis.z) {
        const want = Math.atan2(axis.z, axis.x);
        let d = want - st.heading;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        st.heading += d * Math.min(1, dt * 14);
        move = SPEED;
      }
      st.speed = move;
      const dx = Math.cos(st.heading) * move * dt, dz = Math.sin(st.heading) * move * dt;
      if (!blocked(st.x + dx, st.z, boxes, van)) st.x += dx;     // desliza: tenta cada eixo separado
      if (!blocked(st.x, st.z + dz, boxes, van)) st.z += dz;
      animate(dt, move);
      apply();
    },
  };
}
