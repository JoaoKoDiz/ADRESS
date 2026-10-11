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
  const b = batcher();
  for (const line of RAIL.lines) for (let s = 0; s < line.S; s += 0.8) {
    const p = line.at(s + 0.4), ry = -Math.atan2(p.dz, p.dx), nx = -p.dz, nz = p.dx;
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

/** Um bondinho num percurso (`line`). `idx` é a prioridade nos cruzamentos (menor passa primeiro). */
function createTram(line, idx) {
  const tram = buildTram();
  const solid = { x0: 0, x1: 0, z0: 0, z1: 0 };
  const VMAX = 6.5, ACC = 1.4, DEC = 3.5;
  const T = { idx, line, tram, solid, s0: 0, dir: 1, wait: 0, v: 0, waiting: false };
  T.place = () => {
    const a = line.at(T.s0), b = line.at(T.s0 + LEN), m = line.at(T.s0 + LEN / 2);
    tram.position.set(m.x, 0, m.z);
    tram.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    const c = Math.abs(Math.cos(tram.rotation.y)), sn = Math.abs(Math.sin(tram.rotation.y));
    const ex = c * LEN / 2 + sn * HALF_W, ez = sn * LEN / 2 + c * HALF_W;
    Object.assign(solid, { x0: m.x - ex, x1: m.x + ex, z0: m.z - ez, z1: m.z + ez });
  };
  T.reset = () => { T.dir = 1; T.v = 0; T.s0 = (line.S - LEN) * line.start; T.wait = line.start ? 0 : line.wait; T.place(); };
  /** distância (ao longo do percurso, no sentido do movimento) da frente até s; negativa se já passou */
  T.ahead = s => T.dir > 0 ? s - (T.s0 + LEN) : T.s0 - s;
  T.over = (s, m) => s > T.s0 - m && s < T.s0 + LEN + m;
  T.moving = () => T.wait <= 0;
  return T;
}

export function createTrain() {
  const root = new THREE.Group(); root.name = 'trams';
  let trams = [];
  const M = 2.2, NEAR = 16;                               // M: folga do cruzamento (meia largura do outro bonde + sobra)
  const blockedByVan = (T, van) => {
    if (!van) return false;
    const front = T.dir > 0 ? T.s0 + LEN : T.s0;
    for (let k = 0.5; k <= 9; k += 0.75) { const p = T.line.at(front + T.dir * k); if (Math.hypot(p.x - van.x, p.z - van.z) < 3.0) return true; }
    return false;
  };
  /** Distância livre até o ponto em que o bonde precisa parar por causa de um cruzamento (Infinity = livre). */
  const crossingLimit = T => {
    let lim = Infinity;
    for (const c of RAIL.crossings) {
      const mine = c.a === T.idx ? c.sa : c.b === T.idx ? c.sb : null;
      if (mine === null) continue;
      const O = trams[c.a === T.idx ? c.b : c.a], other = c.a === T.idx ? c.sb : c.sa;
      if (T.over(mine, M)) continue;                                   // já está no cruzamento: segue
      const d = T.ahead(mine);
      if (d < 0 || d > NEAR) continue;                                 // longe ou já passou
      const oInside = O.over(other, M);
      const oComing = O.moving() && O.ahead(other) >= 0 && O.ahead(other) < NEAR;
      if (oInside || (oComing && O.idx < T.idx)) lim = Math.min(lim, d - M - 0.6);   // espera antes do cruzamento
    }
    return lim;
  };
  return {
    object: root,
    gates: [],
    get trams() { return trams; },
    get length() { return LEN; },
    get s() { return trams[0] ? trams[0].s0 : 0; },
    get moving() { return trams[0] ? trams[0].moving() && trams[0].v > 0.05 : false; },
    get waiting() { return trams.some(t => t.waiting); },
    reset() {
      if (!RAIL) return;
      if (!trams.length) trams = RAIL.lines.map((l, i) => { const t = createTram(l, i); root.add(t.tram); return t; });
      for (const t of trams) { t.reset(); const i = SOLIDS.indexOf(t.solid); if (i >= 0) SOLIDS.splice(i, 1); }
    },
    detach() { for (const t of trams) { const i = SOLIDS.indexOf(t.solid); if (i >= 0) SOLIDS.splice(i, 1); } if (root.parent) root.parent.remove(root); },
    update(dt, van) {
      if (!RAIL) return;
      for (const T of trams) {
        const end = T.line.S - LEN;
        T.waiting = false;
        if (T.wait > 0) { T.wait -= dt; T.v = 0; }
        else {
          const left = T.dir > 0 ? end - T.s0 : T.s0;
          const lim = crossingLimit(T), byVan = blockedByVan(T, van);
          T.waiting = byVan || lim < Infinity;
          const room = Math.min(left, Math.max(0, lim));
          const want = byVan ? 0 : Math.min(6.5, Math.sqrt(2 * 1.4 * Math.max(0, room)) + (room === left ? 0.3 : 0));
          T.v = T.v < want ? Math.min(want, T.v + 1.4 * dt) : Math.max(want, T.v - 3.5 * dt);
          T.s0 += T.dir * T.v * dt;
          if (T.dir > 0 && T.s0 >= end) { T.s0 = end; T.dir = -1; T.wait = T.line.wait; T.v = 0; }
          else if (T.dir < 0 && T.s0 <= 0) { T.s0 = 0; T.dir = 1; T.wait = T.line.wait; T.v = 0; }
        }
        T.place();
        if (SOLIDS.indexOf(T.solid) < 0) SOLIDS.push(T.solid);
      }
    },
  };
}
