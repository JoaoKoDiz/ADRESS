// Modo helicóptero (tecla H): a van ganha rotor, cauda e esquis, decola e voa.
// Espaço sobe, Shift desce; H de novo pousa e volta a ser van. Acima de ~6.5 de altura passa por cima de tudo.
import * as THREE from 'three';
import { box, cyl, at, group, dynamic } from './models/kit.js';

const HOVER = 10;          // altura da decolagem automática
const CLIMB = 10;          // velocidade vertical (Espaço/Shift)
const MAX_ALT = 70;
const HIGH = 6.5;          // acima disso não colide com casas, cercas, sebe nem árvores

export function createHeli(van, audio) {
  const DARK = '#2b2d33', ORANGE = '#ff7a1a';
  const parts = new THREE.Group();

  // mastro + rotor principal
  parts.add(at(cyl(0.14, 0.14, 1.1, DARK, 8), -0.4, 3.35, 0));
  const rotor = dynamic(new THREE.Group());
  rotor.position.set(-0.4, 3.95, 0);
  rotor.add(at(cyl(0.3, 0.3, 0.22, DARK, 10), 0, 0, 0));
  for (let i = 0; i < 3; i++) rotor.add(at(box(6.2, 0.07, 0.5, DARK), Math.cos(i * 2.094) * 3.1, 0.05, Math.sin(i * 2.094) * 3.1, 0, -i * 2.094, 0));
  parts.add(rotor);

  // cauda com leme e rotor traseiro
  parts.add(at(box(4.2, 0.42, 0.42, ORANGE), -4.4, 1.95, 0, 0, 0, 0.06));
  parts.add(at(box(0.9, 1.4, 0.14, ORANGE), -6.3, 2.5, 0, 0, 0, -0.25));
  parts.add(at(box(0.7, 0.14, 1.4, ORANGE), -6.2, 2.0, 0));
  const tail = dynamic(new THREE.Group());
  tail.position.set(-6.3, 2.5, 0.2);
  tail.add(at(box(0.12, 1.7, 0.08, DARK), 0, 0, 0), at(box(1.7, 0.12, 0.08, DARK), 0, 0, 0));
  parts.add(tail);

  // esquis
  for (const s of [1, -1]) {
    parts.add(at(cyl(0.09, 0.09, 5.2, DARK, 6), 0, -0.25, s * 1.15, 0, 0, Math.PI / 2));
    parts.add(at(cyl(0.07, 0.07, 0.8, DARK, 6), 1.2, 0.15, s * 1.15));
    parts.add(at(cyl(0.07, 0.07, 0.8, DARK, 6), -1.4, 0.15, s * 1.15));
  }
  parts.visible = false;
  parts.scale.setScalar(0.01);
  van.object.add(parts);

  let on = false, alt = 0, form = 0, climbTo = 0, t = 0, thump = 0, spin = 0, floor = 0;
  let ground = null;         // (x, z) → altura do chão naquele ponto (0 ou o topo de um prédio)

  return {
    /** Liga (decola) ou desliga (pousa e volta a ser van). */
    toggle() {
      on = !on;
      climbTo = on ? Math.max(HOVER, floor + 5) : 0;
      audio.hatch && audio.hatch();
    },
    /** lift: +1 sobe, −1 desce, 0 mantém. Chame todo quadro (depois de van.update). */
    update(dt, lift) {
      t += dt;
      floor = ground ? ground(van.x, van.z) : 0;
      form += ((on || alt > 0.05 ? 1 : 0) - form) * Math.min(1, dt * 4);
      if (form < 0.02 && !on) form = 0;
      parts.visible = form > 0.02;
      parts.scale.setScalar(Math.max(0.01, form));

      if (on) {
        if (lift) { alt += lift * CLIMB * dt; climbTo = 0; }
        else if (alt < climbTo) alt = Math.min(climbTo, alt + CLIMB * 0.8 * dt);
        alt = Math.min(MAX_ALT, Math.max(form > 0.9 ? Math.max(1.2, floor) : floor, alt));
      } else {
        alt = Math.max(floor, alt - CLIMB * dt);
      }
      if (alt < floor) alt = Math.min(floor, alt + 25 * dt);       // entrou na área de um prédio mais baixo: sobe suave
      const bob = on && alt > floor + 1 ? Math.sin(t * 2.6) * 0.18 : 0;
      van.object.position.y = alt + bob;

      const landed = !on && floor > 0 && alt <= floor + 0.05;      // pousado em cima de um prédio
      spin += ((landed ? 0 : 1) - spin) * Math.min(1, dt * 1.2);   // o rotor desacelera depois do pouso
      rotor.rotation.y += dt * 28 * form * spin;
      tail.rotation.z += dt * 40 * form * spin;
      if (form > 0.3 && spin > 0.3) {
        thump -= dt;
        if (thump <= 0) { thump = 0.11; audio.rotor && audio.rotor(); }
      }
    },
    /** Altura do chão em (x, z); permite pousar no topo dos prédios. */
    setGround(fn) { ground = fn; },
    reset() { on = false; alt = 0; spin = 0; floor = 0; form = 0; climbTo = 0; parts.visible = false; parts.scale.setScalar(0.01); van.object.position.y = 0; },
    get on() { return on; },
    get altitude() { return alt; },
    get flying() { return on || alt > 0.3; },
    /** Pousado no topo de um prédio (motor desligado): a van fica parada até decolar (H). */
    get landed() { return !on && floor > 0 && alt <= floor + 0.05; },
    get high() { return alt > HIGH; },
  };
}
