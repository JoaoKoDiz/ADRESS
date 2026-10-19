// Nível 15 (Colheita): grupinhos de galinhas perto de algumas porteiras. Ciscam na beira da estrada e, de tempos em tempos
// (cada grupo no seu tempo; no máximo 2 grupos atravessando ao mesmo tempo), atravessam a estrada em passinhos rápidos.
// Van muito perto: correm para a beira mais próxima. Encostou: um pulo cômico para fora do caminho (sem ferimentos).
// Não são sólidas: nunca prendem a van nem impedem entregas.
import * as THREE from 'three';
import { FARMLAND } from './layout.js';
import { FARM } from './farmPlan.js';
import { box, cone, sphere, at } from './models/kit.js';

const MAX_CROSSING = 2;

function buildChicken(k) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const white = k % 3 !== 2, c = white ? '#f6f3ea' : '#b5653a';
  body.add(at(sphere(0.32, c, 8, 6), 0, 0.5, 0)); body.children[0].scale.set(1.25, 1, 0.95);
  body.add(at(box(0.18, 0.25, 0.26, c), -0.38, 0.62, 0, 0, 0, 0.5));                     // rabo
  const head = new THREE.Group(); head.position.set(0.3, 0.75, 0); body.add(head);
  head.add(at(sphere(0.17, c, 7, 5), 0, 0.08, 0)); head.add(at(box(0.12, 0.14, 0.05, '#e0322a'), 0, 0.27, 0));
  head.add(at(cone(0.06, 0.16, '#f0a81c', 6), 0.19, 0.06, 0, 0, 0, -Math.PI / 2)); head.add(at(box(0.05, 0.1, 0.04, '#e0322a'), 0.13, -0.05, 0));
  for (const s of [-1, 1]) head.add(at(sphere(0.03, '#1d1d1d', 4, 3), 0.1, 0.12, s * 0.12));
  const legs = [];
  for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(0, 0.3, s * 0.1); l.add(at(box(0.05, 0.3, 0.05, '#f0a81c'), 0, -0.15, 0)); l.add(at(box(0.16, 0.03, 0.12, '#f0a81c'), 0.04, -0.3, 0)); g.add(l); legs.push(l); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData = { body, head, legs };
  return g;
}

export function createChickens() {
  const root = new THREE.Group(); root.name = 'chickens';
  let groups = [], t = 0;
  return {
    object: root,
    get groups() { return groups; },
    /** Grupos perto de algumas porteiras (beira da estrada em frente → beira do outro lado). */
    reset() {
      root.clear(); groups = [];
      if (!FARMLAND) return;
      const sps = FARMLAND.spots, hw = FARM.RW / 2;
      const pick = sps.filter((_, k) => k % 4 === 1).slice(0, 6);
      pick.forEach((sp, gi) => {
        // ponto da estrada mais perto da porteira e a direção através da estrada
        let best = null;
        for (const s of FARMLAND.segs) {
          const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, u = Math.max(0.1, Math.min(0.9, ((sp.gate.x - ax) * dx + (sp.gate.z - az) * dz) / L2));
          const qx = ax + dx * u, qz = az + dz * u, d = Math.hypot(sp.gate.x - qx, sp.gate.z - qz);
          if (!best || d < best.d) best = { d, qx, qz, ux: dx / Math.sqrt(L2), uz: dz / Math.sqrt(L2) };
        }
        let nx = -best.uz, nz = best.ux; if ((sp.gate.x - best.qx) * nx + (sp.gate.z - best.qz) * nz < 0) { nx = -nx; nz = -nz; }
        const off = 4.5;                                                  // ao lado da porteira, para não ficar na frente dela
        const A = { x: best.qx + nx * (hw + 1.6) + best.ux * off, z: best.qz + nz * (hw + 1.6) + best.uz * off };
        const B = { x: best.qx - nx * (hw + 1.6) + best.ux * off, z: best.qz - nz * (hw + 1.6) + best.uz * off };
        const hens = [];
        for (let k = 0; k < 3 + (gi % 3); k++) {
          const m = buildChicken(k + gi); root.add(m);
          const h = { m, x: A.x + (Math.random() - 0.5) * 2.4, z: A.z + (Math.random() - 0.5) * 2.4, ox: (Math.random() - 0.5) * 2.4, oz: (Math.random() - 0.5) * 2.4,
            hd: Math.random() * 6, ph: Math.random() * 6, ph0: Math.random() * 6, jump: null, flee: 0, delay: k * 0.25, mode: 'peck' };
          hens.push(h);
        }
        groups.push({ A, B, nx, nz, side: 'A', state: 'idle', timer: 8 + gi * 7 + Math.random() * 10, hens });
      });
    },
    detach() { if (root.parent) root.parent.remove(root); },
    /** van: { x, z, circles: [[x, z, r], …] } ou null. */
    update(dt, van) {
      if (!groups.length) return;
      t += dt;
      const crossing = groups.filter(g => g.state === 'cross').length;
      for (const g of groups) {
        const home = g.side === 'A' ? g.A : g.B, other = g.side === 'A' ? g.B : g.A;
        if (g.state === 'idle') {
          g.timer -= dt;
          const vanNear = van && Math.hypot(van.x - (g.A.x + g.B.x) / 2, van.z - (g.A.z + g.B.z) / 2) < 16;
          if (g.timer <= 0 && crossing < MAX_CROSSING && !vanNear) { g.state = 'cross'; g.t = 0; }
          else if (g.timer <= 0) g.timer = 3 + Math.random() * 4;
        } else if (g.state === 'cross') {
          g.t += dt;
          if (g.hens.every(h => Math.hypot(h.x - (other.x + h.ox), h.z - (other.z + h.oz)) < 0.4 || h.jump)) { g.side = g.side === 'A' ? 'B' : 'A'; g.state = 'idle'; g.timer = 18 + Math.random() * 25; }
        }
        const goal = g.side === 'A' ? g.A : g.B, dest = g.state === 'cross' ? other : goal;
        for (const h of g.hens) {
          const um = h.m.userData;
          if (h.jump) {                                                   // pulo cômico: sobe, gira e cai na beira da estrada
            const j = h.jump; j.t += dt; j.vy -= 22 * dt;
            h.x += j.vx * dt; h.z += j.vz * dt; j.y = Math.max(0, j.y + j.vy * dt);
            h.m.rotation.z = Math.sin(j.t * 18) * 0.6;
            if (j.y <= 0 && j.t > 0.2) { h.jump = null; h.m.rotation.z = 0; h.flee = 1.2; }
            h.m.position.set(h.x, j ? j.y : 0, h.z); continue;
          }
          let tx = dest.x + h.ox, tz = dest.z + h.oz, speed = g.state === 'cross' ? 3.2 : 0.8;
          if (g.state === 'cross' && g.t < h.delay) { tx = h.x; tz = h.z; }
          if (g.state === 'idle') {                                       // cada uma no seu ritmo: anda um pouco, cisca parada, olha em volta
            const far = Math.hypot(h.x - goal.x - h.ox * 0.6, h.z - goal.z - h.oz * 0.6) > 2.4;   // (fugiu da van: volta para perto do grupo)
            const stale = h.mode === 'walk' && Math.hypot(h.wx - goal.x, h.wz - goal.z) > 3;      // (alvo escolhido antes de atravessar: ficou do lado de lá)
            if ((h.it = (h.it ?? Math.random() * 2) - dt) <= 0 || stale || (far && h.mode !== 'walk')) {
              const r = far ? 0 : Math.random();
              h.mode = r < 0.4 ? 'walk' : r < 0.8 ? 'peck' : 'look'; h.it = h.mode === 'walk' ? 0.8 + Math.random() * 1.6 : 1.2 + Math.random() * 3;
              if (h.mode === 'walk') { const a = Math.random() * Math.PI * 2, d = 0.4 + Math.random() * 1.1; h.wx = goal.x + h.ox * 0.6 + Math.cos(a) * d; h.wz = goal.z + h.oz * 0.6 + Math.sin(a) * d; }
            }
            if (h.mode === 'walk') { tx = h.wx; tz = h.wz; speed = 1.1; } else { tx = h.x; tz = h.z; }
          }
          if (van) {                                                      // van perto: corre para a beira mais próxima; encostou: pulo
            const d = Math.min(...van.circles.map(([x, z]) => Math.hypot(h.x - x, h.z - z)));
            if (d < 1.9) {
              const side = (h.x - (g.A.x + g.B.x) / 2) * g.nx + (h.z - (g.A.z + g.B.z) / 2) * g.nz >= 0 ? 1 : -1;
              h.jump = { t: 0, y: 0, vy: 8, vx: g.nx * side * 4.5, vz: g.nz * side * 4.5 }; continue;
            }
            if (d < 7) h.flee = 1.0;
          }
          if (h.flee > 0) {
            h.flee -= dt;
            const near = Math.hypot(h.x - g.A.x, h.z - g.A.z) < Math.hypot(h.x - g.B.x, h.z - g.B.z) ? g.A : g.B;
            tx = near.x + h.ox; tz = near.z + h.oz; speed = 6;
            if (g.state === 'cross') { g.state = 'idle'; g.side = near === g.A ? 'A' : 'B'; g.timer = 10 + Math.random() * 10; }
          }
          const dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz), step = Math.min(d, speed * dt);
          if (d > 0.05) { h.x += dx / d * step; h.z += dz / d * step; h.hd = Math.atan2(dz, dx); }
          const moving = d > 0.05 && speed > 1;
          const ph = (h.ph += dt * (moving ? 22 : 4));
          um.legs[0].rotation.z = moving ? Math.sin(ph) * 0.7 : 0; um.legs[1].rotation.z = moving ? -Math.sin(ph) * 0.7 : 0;
          const idle = g.state === 'idle' && !moving && !(h.flee > 0);
          if (idle && h.mode === 'peck') {                                // bicadas rápidas e irregulares, corpo inclinado
            h.pk = (h.pk || 0) - dt; if (h.pk <= 0) { h.pkT = 0.18; h.pk = 0.25 + Math.random() * 0.9; }
            h.pkT = Math.max(0, (h.pkT || 0) - dt);
            um.head.rotation.z = h.pkT > 0 ? -0.9 : -0.15; um.head.rotation.y = 0; um.body.rotation.z = -0.12;
          } else if (idle && h.mode === 'look') {                         // para e vira a cabeça de um lado para o outro, em trancos
            um.head.rotation.z = 0.1; um.body.rotation.z = 0; um.head.rotation.y = Math.round(Math.sin(t * 1.7 + h.ph0) * 2) * 0.35;
          } else { um.head.rotation.z = moving ? Math.sin(ph * 2) * 0.25 : 0; um.head.rotation.y = 0; um.body.rotation.z = 0; }
          um.body.position.y = moving ? Math.abs(Math.sin(ph)) * 0.08 : 0;
          h.m.position.set(h.x, 0, h.z); h.m.rotation.y = -h.hd;
        }
      }
    },
  };
}
