// O motorista a pé (tecla L na van): anda livremente pelo bairro — entra nos quintais e na praça —, mas não entrega.
// Colisão simples com caixas (AABB), deslizando nas paredes. Mesmo modelo/cores do motorista da tela inicial.
import * as THREE from 'three';
import { box, sphere, mesh, at } from './models/kit.js';

const SKIN = '#e8b48a', SHIRT = '#2a9df4', PANTS = '#2f3a55', SHOES = '#1b1b1f', CAP = '#e3262e', GLASSES = '#111216';
const SPEED = 6.5, BACK_SPEED = 3.5, TURN = 3.2, RADIUS = 0.55;

export function createWalker(scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);
  const body = new THREE.Group();
  body.scale.setScalar(0.85);                                  // ~2,1 de altura (a van tem 2,6)
  root.add(body);
  // modelo olha para +X local (rotation.y = −heading)
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0, 0.95, s * 0.2);
    leg.add(at(box(0.3, 0.95, 0.3, PANTS), 0, -0.47, 0), at(box(0.46, 0.2, 0.34, SHOES), 0.08, -0.9, 0));
    body.add(leg); legs.push(leg);
    const arm = new THREE.Group(); arm.position.set(0, 1.85, s * 0.5);
    arm.add(at(box(0.26, 0.85, 0.26, SHIRT), 0, -0.4, 0), at(sphere(0.15, SKIN, 8, 6), 0, -0.9, 0));
    body.add(arm); arms.push(arm);
  }
  body.add(at(box(0.5, 0.95, 0.8, SHIRT), 0, 1.42, 0));
  const head = new THREE.Group(); head.position.set(0, 2.05, 0); body.add(head);
  head.add(at(sphere(0.34, SKIN, 14, 10), 0, 0.3, 0));
  head.add(at(mesh(new THREE.SphereGeometry(0.375, 14, 8, 0, Math.PI * 2, 0, 1.25), CAP), 0, 0.3, 0));
  head.add(at(box(0.3, 0.05, 0.5, CAP), 0.4, 0.43, 0, 0, 0, 0.12));                  // aba para a frente (+X)
  for (const s of [-1, 1]) head.add(at(box(0.05, 0.12, 0.2, GLASSES, { metalness: 0.4, roughness: 0.25 }), 0.3, 0.34, s * 0.13));
  head.add(at(box(0.04, 0.03, 0.16, '#7a2e1a'), 0.31, 0.17, 0));                    // sorriso
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });

  const st = { x: 0, z: 0, heading: 0, speed: 0 };
  let phase = 0;

  const hits = (x, z, boxes) => boxes.some(b => x > b.x0 - RADIUS && x < b.x1 + RADIUS && z > b.z0 - RADIUS && z < b.z1 + RADIUS);
  // a van é um círculo; se o personagem já está dentro dele (acabou de descer), só impede de entrar mais fundo
  const hitsVan = (x, z, van) => { const d = Math.hypot(x - van.x, z - van.z); return d < 2.5 + RADIUS && d < Math.hypot(st.x - van.x, st.z - van.z) - 1e-6; };
  const blocked = (x, z, boxes, van) => hits(x, z, boxes) || hitsVan(x, z, van);

  function apply() {
    root.position.set(st.x, 0, st.z);
    root.rotation.y = -st.heading;
  }

  return {
    object: root,
    get x() { return st.x; }, get z() { return st.z; }, get heading() { return st.heading; }, get speed() { return st.speed; },
    get visible() { return root.visible; },
    show(on) { root.visible = on; if (!on) st.speed = 0; },
    /** Põe o personagem ao lado da porta do motorista (tenta os dois lados da van; sem espaço, afasta mais). */
    placeBesideVan(van, boxes) {
      const fx = Math.cos(van.heading), fz = Math.sin(van.heading);
      for (const d of [3.4, 4.2, 5.0]) for (const side of [1, -1]) {
        const x = van.x + side * fz * d, z = van.z - side * fx * d;
        if (!hits(x, z, boxes)) { st.x = x; st.z = z; st.heading = van.heading; st.speed = 0; apply(); return; }
      }
      st.x = van.x + fz * 3.4; st.z = van.z - fx * 3.4; st.heading = van.heading; st.speed = 0; apply();
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
      phase += dt * Math.abs(move) * 1.5;
      const sw = move ? Math.sin(phase) * 0.7 : 0;
      legs[0].rotation.z = sw; legs[1].rotation.z = -sw;
      arms[0].rotation.z = -sw * 0.8; arms[1].rotation.z = sw * 0.8;
      body.position.y = move ? Math.abs(Math.cos(phase)) * 0.06 : 0;
      apply();
    },
  };
}
