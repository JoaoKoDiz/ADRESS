// Bairro 11 (Trilhos): bondinho urbano. Trilhos embutidos no asfalto, no eixo das ruas (percurso fixo em RAIL, layout.js),
// duas paradas pequenas nas pontas (cenário; não são entregas) e um bonde de duas cabines que vai e volta sem girar.
// Convivência com a van: o bonde é sólido (a van não atravessa) e, se a van estiver à frente nos trilhos, ele freia e espera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, at, mat, bakeStatic, textTexture } from './models/kit.js';
import { RAIL, SOLIDS } from './layout.js';

const STEEL = '#8d949b', GROOVE = '#3f444b', CREAM = '#f3e6c8', RED = '#9e3a26', GLASS = '#2e4a63';
const GAUGE = 0.72, LEN = 8.0, HALF_W = 1.2;

/** Junta caixas orientadas (por cor) numa malha só para cada cor. */
function batcher() {
  const by = new Map();
  const add = (w, h, d, color, x, y, z, ry = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    (by.get(color) || by.set(color, []).get(color)).push(g);
  };
  const flush = parent => { for (const [c, gs] of by) { const m = new THREE.Mesh(mergeGeometries(gs, false), mat(c)); m.receiveShadow = true; parent.add(m); gs.forEach(x => x.dispose()); } };
  return { add, flush };
}

function stop(g, s) {                                    // parada: cobertura, banco e placa (frente para a rua = +z local)
  const p = new THREE.Group(); p.position.set(s.x, 0, s.z); p.rotation.y = s.ry; g.add(p);
  p.add(at(box(4.2, 0.12, 1.6, '#bdb6a6'), 0, 0.06, 0));
  for (const x of [-1.8, 1.8]) p.add(at(box(0.14, 2.6, 0.14, '#3f4a52'), x, 1.36, -0.55));
  p.add(at(box(4.4, 0.15, 1.7, RED), 0, 2.72, 0));
  p.add(at(box(3.8, 1.6, 0.06, '#cfe3f2'), 0, 1.5, -0.62));
  p.add(at(box(2.6, 0.12, 0.5, '#8a5a36'), 0, 0.55, -0.25));
  for (const x of [-1.1, 1.1]) p.add(at(box(0.1, 0.45, 0.4, '#444'), x, 0.3, -0.25));
  const tex = textTexture(s.name, { width: 640, height: 128, bg: RED, fg: '#fff3d6', font: 'bold 56px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.68), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  sign.position.set(0, 3.15, 0.2); p.add(sign);
  p.add(at(box(0.1, 3.4, 0.1, '#3f4a52'), 2.05, 1.7, 0.4));
  p.add(at(cyl(0.32, 0.32, 0.06, '#f3e6c8', 12), 2.05, 3.1, 0.45, Math.PI / 2, 0, 0));
}

/** Parte fixa: trilhos rentes ao asfalto (a van passa por cima) e as duas paradas. */
export function buildRail(g) {
  const b = batcher(), S = RAIL.S;
  for (let s = 0; s < S; s += 0.8) {
    const p = RAIL.at(s + 0.4), ry = -Math.atan2(p.dz, p.dx), nx = -p.dz, nz = p.dx;
    for (const o of [-GAUGE, GAUGE]) {
      b.add(0.84, 0.03, 0.22, GROOVE, p.x + nx * o, 0.012, p.z + nz * o, ry);
      b.add(0.84, 0.035, 0.1, STEEL, p.x + nx * o, 0.02, p.z + nz * o, ry);
    }
  }
  b.flush(g);
  for (const s of RAIL.stops) stop(g, s);
  return g;
}

/** Bonde de duas cabines (frente e trás iguais): local +x = sentido de s crescente. */
function buildTram() {
  const t = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => t.add(at(m, x, y, z, rx, ry, rz));
  add(box(LEN - 0.4, 0.9, 2.3, RED), 0, 0.85, 0);                                      // saia vermelho queimado
  add(box(LEN - 0.4, 1.5, 2.3, CREAM), 0, 2.05, 0);                                   // corpo creme
  add(box(LEN - 0.2, 0.25, 2.45, '#efe9da'), 0, 2.92, 0);                             // teto claro
  add(box(LEN - 2.4, 0.3, 1.6, '#e2dccc'), 0, 3.15, 0);                               // lanternim
  add(box(0.08, 0.6, 0.08, '#333'), 0, 3.55, 0); add(box(1.4, 0.06, 0.06, '#333'), 0, 3.85, 0, 0, 0, 0.3);   // pantógrafo simples
  for (const sx of [-1, 1]) {                                                         // cabines nas duas pontas
    add(box(0.25, 1.6, 2.2, CREAM), sx * (LEN / 2 - 0.1), 1.6, 0);
    add(box(0.06, 0.9, 1.7, GLASS), sx * (LEN / 2 + 0.03), 2.15, 0);
    add(box(0.08, 0.2, 0.2, '#ffe9a0'), sx * (LEN / 2 + 0.04), 0.95, 0.75); add(box(0.08, 0.2, 0.2, '#ffe9a0'), sx * (LEN / 2 + 0.04), 0.95, -0.75);
    add(box(0.12, 0.25, 2.1, '#2b2b2e'), sx * (LEN / 2 + 0.02), 0.45, 0);
  }
  for (const sz of [-1, 1]) {
    for (let x = -LEN / 2 + 1.3; x < LEN / 2 - 1.0; x += 1.15) if (Math.abs(x) > 0.7) add(box(0.9, 0.85, 0.05, GLASS), x, 2.2, sz * 1.16);   // janelas grandes
    add(box(1.0, 1.75, 0.05, '#7a2e20'), 0, 1.4, sz * 1.16);                          // portas laterais (no meio)
    add(box(0.04, 1.7, 0.06, '#e2c98f'), 0, 1.4, sz * 1.18);
    add(box(LEN - 0.4, 0.08, 0.05, '#d9b56a'), 0, 1.33, sz * 1.16);                  // friso dourado
  }
  for (const x of [-LEN / 2 + 1.4, LEN / 2 - 1.4]) for (const z of [-GAUGE, GAUGE]) add(cyl(0.32, 0.32, 0.14, '#202022', 10), x, 0.32, z, Math.PI / 2, 0, 0);   // rodinhas nos trilhos
  return bakeStatic(t);
}

export function createTrain() {
  const root = new THREE.Group(); root.name = 'tram';
  const tram = buildTram(); root.add(tram);
  const solid = { x0: 0, x1: 0, z0: 0, z1: 0 };
  const VMAX = 6.5, ACC = 1.4, STOP = 5;
  let s0 = 0, dir = 1, wait = STOP, v = 0, waiting = false;
  const place = () => {
    const a = RAIL.at(s0), b = RAIL.at(s0 + LEN), m = RAIL.at(s0 + LEN / 2);
    tram.position.set(m.x, 0, m.z);
    tram.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    // sólido: caixa que envolve o bonde girado (nas curvas fica um pouco maior)
    const c = Math.abs(Math.cos(tram.rotation.y)), sn = Math.abs(Math.sin(tram.rotation.y));
    const ex = c * LEN / 2 + sn * HALF_W, ez = sn * LEN / 2 + c * HALF_W;
    Object.assign(solid, { x0: m.x - ex, x1: m.x + ex, z0: m.z - ez, z1: m.z + ez });
  };
  /** A van está nos trilhos logo à frente (no sentido do movimento)? */
  const blockedBy = van => {
    if (!van) return false;
    const front = dir > 0 ? s0 + LEN : s0;
    for (let k = 0.5; k <= 9; k += 0.75) {
      const p = RAIL.at(front + dir * k);
      if (Math.hypot(p.x - van.x, p.z - van.z) < 3.0) return true;
    }
    return false;
  };
  const removeSolid = () => { const i = SOLIDS.indexOf(solid); if (i >= 0) SOLIDS.splice(i, 1); };
  return {
    object: root,
    gates: [],
    get length() { return LEN; },
    get s() { return s0; },
    get moving() { return wait <= 0 && v > 0.05; },
    get waiting() { return waiting; },
    reset() { s0 = 0; dir = 1; wait = STOP; v = 0; removeSolid(); if (RAIL) place(); },
    detach() { removeSolid(); if (root.parent) root.parent.remove(root); },
    update(dt, van) {
      if (!RAIL) return;
      const end = RAIL.S - LEN;
      waiting = false;
      if (wait > 0) { wait -= dt; v = 0; }
      else {
        const left = dir > 0 ? end - s0 : s0;
        waiting = blockedBy(van);                                      // a van no caminho: freia e espera
        const want = waiting ? 0 : Math.min(VMAX, Math.sqrt(2 * ACC * Math.max(0, left)) + 0.3);
        v = v < want ? Math.min(want, v + ACC * dt) : Math.max(want, v - ACC * 2.5 * dt);
        s0 += dir * v * dt;
        if (dir > 0 && s0 >= end) { s0 = end; dir = -1; wait = STOP; v = 0; }
        else if (dir < 0 && s0 <= 0) { s0 = 0; dir = 1; wait = STOP; v = 0; }
      }
      place();
      if (SOLIDS.indexOf(solid) < 0) SOLIDS.push(solid);
    },
  };
}
