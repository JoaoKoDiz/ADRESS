// Nível 15 (Colheita): poucos tratores circulando devagar em laços pelas estradas de terra, sempre pela direita
// (sobra espaço para a van ultrapassar). Como os carros do Nível 14: mantêm distância de outro trator à frente, param
// diante da van ou do motorista a pé e retomam quando há passagem. São sólidos para a van.
import * as THREE from 'three';
import { SOLIDS, FARMLAND, TERRAIN } from './layout.js';
import { buildTractor } from './models/farm.js';

const SIDE = 2.3, LEN = 3.6;
let SPEED = 3.4;
const COLORS = ['#c8402f', '#3f8a4a', '#2f6fb0', '#e8b02a', '#c8402f', '#5f9a5a'];

export function createTractors(audio) {
  const root = new THREE.Group(); root.name = 'tractors';
  let list = [];
  /** Caminho fechado deslocado para a direita do sentido de ida. */
  function makePath(loop) {
    const pts = loop.concat([loop[0]]), segs = [];
    let S = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      const rx = -uz, rz = ux;                                        // direita de quem anda (X leste, Z sul)
      segs.push({ ax: ax + rx * SIDE, az: az + rz * SIDE, ux, uz, L, s0: S }); S += L;
    }
    return { segs, S, at(s) { s = ((s % S) + S) % S; const g = segs.find(q => s < q.s0 + q.L) || segs[segs.length - 1]; const u = s - g.s0; return { x: g.ax + g.ux * u, z: g.az + g.uz * u, ux: g.ux, uz: g.uz }; } };
  }
  return {
    object: root,
    get list() { return list; },
    /** opts (Nevasca): { loops, build, speed } — o limpa-neve usa a mesma lógica. */
    reset(opts = {}) {
      for (const t of list) { root.remove(t.mesh); const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); }
      SPEED = opts.speed || 3.4;
      list = (opts.loops || (FARMLAND ? FARMLAND.tractorLoops : [])).map((loop, i) => {
        const path = makePath(loop), mesh = (opts.build || buildTractor)(COLORS[i % COLORS.length]); root.add(mesh);
        return { i, path, s: path.S * ((0.15 + 0.37 * i) % 1), v: 0, mesh, solid: { x0: 0, x1: 0, z0: 0, z1: 0 }, x: 0, z: 0, ux: 1, uz: 0 };
      });
      for (const t of list) this.place(t);
    },
    place(t) {
      const p = t.path.at(t.s), q = t.path.at(t.s + 1.5);
      const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1;
      t.ux += (dx / l - t.ux) * 0.25; t.uz += (dz / l - t.uz) * 0.25;     // curvas suaves
      t.x = p.x; t.z = p.z;
      t.mesh.position.set(p.x, TERRAIN.h(p.x, p.z), p.z); t.mesh.rotation.y = -Math.atan2(t.uz, t.ux);
      const cx = Math.abs(t.ux), cz = Math.abs(t.uz), ex = cx * 2.0 + cz * 1.3, ez = cz * 2.0 + cx * 1.3;
      Object.assign(t.solid, { x0: p.x - ex, x1: p.x + ex, z0: p.z - ez, z1: p.z + ez });
    },
    detach() { for (const t of list) { const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); } if (root.parent) root.parent.remove(root); },
    /** obs: [{ circles: [[x, z, r], …] }] (van e motorista a pé). ear: quem ouve. */
    update(dt, obs, ear) {
      for (const t of list) {
        let want = SPEED;
        for (let k = 2.6; k <= 8; k += 1.35) {                           // obstáculo à frente: para
          const px = t.x + t.ux * k, pz = t.z + t.uz * k;
          if (obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(px - x, pz - z) < r + 1.4))) { want = 0; break; }
        }
        for (const o of list) {                                          // outro trator logo à frente, no mesmo sentido
          if (o === t) continue;
          const dx = o.x - t.x, dz = o.z - t.z, ahead = dx * t.ux + dz * t.uz, lat = Math.abs(-dx * t.uz + dz * t.ux);
          if (ahead > 0 && ahead < LEN + 5 && lat < 2.6) {
            const mutual = (-dx) * o.ux + (-dz) * o.uz > 0 && Math.abs(dx * o.uz - dz * o.ux) < 2.6;
            if ((!mutual || t.i > o.i) && !(t.pass > 0)) want = 0;       // os dois "se veem": o de índice maior espera
          }
        }
        // esperando outro trator há muito tempo (cruzamento): passa assim mesmo por um instante (nunca trava de vez)
        if (want === 0 && !obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(t.x + t.ux * 4 - x, t.z + t.uz * 4 - z) < r + 4))) t.wait = (t.wait || 0) + dt; else t.wait = 0;
        if (t.wait > 6) { t.pass = 2.5; t.wait = 0; }
        if (t.pass > 0) t.pass -= dt;
        t.v = t.v < want ? Math.min(want, t.v + 2 * dt) : Math.max(want, t.v - 6 * dt);
        t.s += t.v * dt;
        this.place(t);
        if (SOLIDS.indexOf(t.solid) < 0) SOLIDS.push(t.solid);
      }
      if (ear && audio && audio.traffic) {
        let best = 1e9;
        for (const t of list) best = Math.min(best, Math.hypot(t.x - ear.x, t.z - ear.z));
        audio.traffic(Math.max(0, 1 - best / 30) * 0.8, 0.15);
      }
    },
    silence() { if (audio && audio.traffic) audio.traffic(0); },
  };
}
