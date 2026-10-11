// Nível 14 (Fluxo): trânsito circulando por toda a rede de ruas. Lógica simples de rotas e prioridade:
//  - carros andam em faixas (mão dupla nas ruas: faixa da direita; avenida: 2 faixas por sentido, mão única por pista);
//  - em cada cruzamento escolhem uma saída permitida (sentido único, canteiro, postos/galpões fecham trechos);
//  - semáforos nos 3 cruzamentos da avenida (avenida × rua), com amarelo e todos vermelhos; fases defasadas;
//  - ruas menores: um carro por vez no cruzamento; na avenida sem semáforo, quem está na avenida tem a preferência;
//  - só entram no cruzamento com espaço na saída (não travam o cruzamento) e trocam de saída se esperarem demais;
//  - distância do carro da frente; param se a van (ou o motorista a pé) estiver na frente.
import * as THREE from 'three';
import { GRID, ROAD, roadCenter, FLUX, GAS_LIST, WARE_LIST, SOLIDS } from './layout.js';
import { buildCar, CAR_COLORS } from './barriers.js';
import { mat, box, cyl, at } from './models/kit.js';

const hr = ROAD / 2, rc = roadCenter, CAR = 4.6, GAP = 2.2;
const DIRS = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
const REV = { E: 'W', W: 'E', S: 'N', N: 'S' }, RIGHT = { E: 'S', S: 'W', W: 'N', N: 'E' };
const PHASES = [['aG', 10], ['aY', 2.5], ['R', 1.2], ['cG', 7], ['cY', 2.5], ['R', 1.2]];
const CYCLE = PHASES.reduce((t, p) => t + p[1], 0);

export function createTraffic(audio) {
  const root = new THREE.Group(); root.name = 'traffic';
  let cars = [], lanes = new Map(), nodes = [], blockedV = new Set(), lights = [], t = 0, built = false;
  const W = () => FLUX.widen;
  const isLight = (i, j) => (i === FLUX.north || i === FLUX.south) && FLUX.lights.includes(j);
  const isAve = i => i === FLUX.north || i === FLUX.south;
  // caixa do cruzamento (na avenida, a pista é mais larga para dentro do canteiro)
  const box2 = (i, j) => ({ x0: rc(j) - hr, x1: rc(j) + hr, z0: rc(i) - hr - (i === FLUX.south ? W() : 0), z1: rc(i) + hr + (i === FLUX.north ? W() : 0) });
  const node = (i, j) => nodes[i * (GRID + 1) + j];
  // existe o trecho saindo de (i, j) no sentido d?
  function edgeOk(i, j, d) {
    const [dx, dz] = DIRS[d], i2 = i + dz, j2 = j + dx;
    if (i2 < 0 || j2 < 0 || i2 > GRID || j2 > GRID) return false;
    if (dz === 0) { if (i === FLUX.north && d !== 'W') return false; if (i === FLUX.south && d !== 'E') return false; return true; }
    const k = Math.min(i, i2);                                         // trecho vertical da coluna j entre as ruas k e k+1
    if (k === FLUX.row && !FLUX.gaps.includes(j)) return false;
    return !blockedV.has(j + ',' + k);
  }
  // faixas (coordenada perpendicular) de um trecho saindo de (i, j) no sentido d
  function laneCoords(i, j, d) {
    if (d === 'E') return i === FLUX.south ? [rc(i) + 0.9, rc(i) - 4.9] : [rc(i) + 1.9];
    if (d === 'W') return i === FLUX.north ? [rc(i) - 0.9, rc(i) + 4.9] : [rc(i) - 1.9];
    if (d === 'S') return [rc(j) - 1.9];
    return [rc(j) + 1.9];
  }
  const laneKey = (i, j, d, k) => i + ',' + j + ',' + d + ',' + k;
  /** Trecho de faixa: de (i, j) no sentido d, faixa k → início e fim (nas bordas dos cruzamentos). */
  function makeLane(i, j, d, k) {
    const key = laneKey(i, j, d, k);
    if (lanes.has(key)) return lanes.get(key);
    const [dx, dz] = DIRS[d], A = box2(i, j), B = box2(i + dz, j + dx), p = laneCoords(i, j, d)[k];
    let a, b;
    if (d === 'E') { a = { x: A.x1, z: p }; b = { x: B.x0, z: p }; }
    else if (d === 'W') { a = { x: A.x0, z: p }; b = { x: B.x1, z: p }; }
    else if (d === 'S') { a = { x: p, z: A.z1 }; b = { x: p, z: B.z0 }; }
    else { a = { x: p, z: A.z0 }; b = { x: p, z: B.z1 }; }
    b = { x: b.x - dx * CAR / 2, z: b.z - dz * CAR / 2 };              // (posições do centro do carro: para com a frente na faixa de retenção)
    const L = { key, i, j, d, k, a, b, len: Math.hypot(b.x - a.x, b.z - a.z), to: [i + dz, j + dx], cars: [], ave: dz === 0 && isAve(i) };
    lanes.set(key, L);
    return L;
  }
  /** Saídas possíveis ao chegar em (i, j) vindo no sentido d (sem meia-volta, a não ser que não haja outra). */
  function exits(i, j, d) {
    let out = Object.keys(DIRS).filter(e => e !== REV[d] && edgeOk(i, j, e));
    if (!out.length && edgeOk(i, j, REV[d])) out = [REV[d]];
    return out;
  }
  function pickExit(car, L) {
    const [i, j] = L.to; let opts = exits(i, j, L.d);
    if (!opts.length) return null;
    if (L.ave) {                                                         // avenida: direita só da faixa da direita, esquerda só da esquerda
      const f = opts.filter(e => e === L.d || (e === RIGHT[L.d] ? L.k === 0 : L.k === 1));
      if (f.length) opts = f;
    }
    const w = opts.map(e => (e === L.d ? (L.ave ? 3.2 : 1.6) : 1) * (car.avoid === e ? 0.05 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0), e = opts[0];
    for (let n = 0; n < opts.length; n++) { r -= w[n]; if (r <= 0) { e = opts[n]; break; } }
    const nl = laneCoords(i, j, e).map((_, k) => makeLane(i, j, e, k));
    if (L.ave && e === L.d && nl[L.k]) return nl[L.k];                  // reto na avenida: continua na mesma faixa
    // na avenida, a faixa com mais espaço no começo
    const lane = nl.reduce((best, x) => (room(x) > room(best) ? x : best), nl[Math.floor(Math.random() * nl.length)]);
    return lane;
  }
  const room = L => { let m = L.len + CAR; for (const c of L.cars) m = Math.min(m, c.s); for (const c of cars) if (c.turn && c.next === L) m = Math.min(m, -1); return m; };
  // fase do semáforo do cruzamento j (defasada por cruzamento)
  const phaseAt = j => { let x = (t + j * 5.3) % CYCLE; for (const [p, d] of PHASES) { if (x < d) return p; x -= d; } return 'R'; };
  function canEnter(car, L, next) {
    const [i, j] = L.to, n = node(i, j), horiz = L.d === 'E' || L.d === 'W';
    if (room(next) < CAR + GAP + 0.6) return false;                           // sem espaço na saída: não entra
    if (isLight(i, j)) {
      const ph = phaseAt(j), rem = L.len - car.s;
      const go = horiz ? ph === 'aG' || (ph === 'aY' && rem < 2 && car.v > 4) : ph === 'cG' || (ph === 'cY' && rem < 2 && car.v > 4);
      if (!go) return false;
      return horiz ? ![...n.occ].some(c => !c.horiz) : n.occ.size === 0;
    }
    if (isAve(i)) {                                                      // avenida sem semáforo: preferência de quem está nela
      if (horiz) return ![...n.occ].some(c => !c.horiz);
      if (n.occ.size) return false;
      for (const k of [0, 1]) {
        const din = i === FLUX.north ? 'W' : 'E', from = [i, j + (din === 'W' ? 1 : -1)];
        const AL = lanes.get(laneKey(from[0], from[1], din, k));
        if (AL && AL.cars.some(c => AL.len - c.s < 16)) return false;
      }
      return true;
    }
    return n.occ.size === 0;                                             // ruas menores: um por vez
  }
  // curva dentro do cruzamento: Bézier quadrática do fim de uma faixa ao começo da outra
  function makeTurn(L, N) {
    const P = L.b, Q = N.a, straight = L.d === N.d;
    const C = straight ? { x: (P.x + Q.x) / 2, z: (P.z + Q.z) / 2 }
      : (L.d === 'E' || L.d === 'W') ? { x: Q.x, z: P.z } : { x: P.x, z: Q.z };
    const at2 = u => ({ x: (1 - u) * (1 - u) * P.x + 2 * u * (1 - u) * C.x + u * u * Q.x, z: (1 - u) * (1 - u) * P.z + 2 * u * (1 - u) * C.z + u * u * Q.z });
    let len = 0, prev = P; for (let k = 1; k <= 12; k++) { const q = at2(k / 12); len += Math.hypot(q.x - prev.x, q.z - prev.z); prev = q; }
    if (L.d === REV[N.d]) {                                              // meia-volta: arco largo
      const mid = { x: (P.x + Q.x) / 2 + DIRS[L.d][0] * 4, z: (P.z + Q.z) / 2 + DIRS[L.d][1] * 4 };
      const f = u => ({ x: (1 - u) * (1 - u) * P.x + 2 * u * (1 - u) * mid.x + u * u * Q.x, z: (1 - u) * (1 - u) * P.z + 2 * u * (1 - u) * mid.z + u * u * Q.z });
      return { at: f, len: len + 6 };
    }
    return { at: at2, len: Math.max(0.5, len) };
  }

  function build() {
    nodes = []; lanes = new Map(); lights.forEach(l => root.remove(l.g)); lights = [];
    for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) nodes.push({ i, j, occ: new Set() });
    blockedV = new Set();
    for (const g of GAS_LIST.concat(WARE_LIST)) { const c = g.slots[0] % GRID, r = Math.floor(g.slots[0] / GRID); blockedV.add((c + 1) + ',' + r); }
    // semáforos: um poste em cada canto dos cruzamentos com sinal (cabeças da avenida e da rua)
    const RED = mat('#ff2a1a', { emissive: '#ff2a1a', emissiveIntensity: 1.4 }), YEL = mat('#ffc21a', { emissive: '#ffc21a', emissiveIntensity: 1.4 }),
      GRN = mat('#22e05a', { emissive: '#22e05a', emissiveIntensity: 1.4 }), OFF = mat('#2a2d33');
    for (const j of FLUX.lights) for (const i of [FLUX.north, FLUX.south]) {
      const b = box2(i, j);
      for (const [x, z, axis] of [[b.x0 - 0.6, b.z0 - 0.6, 'a'], [b.x1 + 0.6, b.z1 + 0.6, 'a'], [b.x1 + 0.6, b.z0 - 0.6, 'c'], [b.x0 - 0.6, b.z1 + 0.6, 'c']]) {
        const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
        g.add(at(cyl(0.12, 0.12, 4.2, '#3a3d44', 8), 0, 2.1, 0));
        g.add(at(box(0.5, 1.4, 0.5, '#2a2d33'), 0, 4.6, 0));
        const bulbs = ['R', 'Y', 'G'].map((c, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), OFF); m.position.set(0, 5.05 - k * 0.44, 0); g.add(m); return m; });
        lights.push({ g, j, axis, bulbs });
      }
    }
    lights.mats = { RED, YEL, GRN, OFF };
    built = true;
  }
  function paintLights() {
    const { RED, YEL, GRN, OFF } = lights.mats;
    for (const l of lights) {
      const ph = phaseAt(l.j), mine = l.axis === 'a' ? ph[0] === 'a' : ph[0] === 'c', col = !mine ? 'R' : ph[1] === 'G' ? 'G' : 'Y';
      l.bulbs[0].material = col === 'R' ? RED : OFF; l.bulbs[1].material = col === 'Y' ? YEL : OFF; l.bulbs[2].material = col === 'G' ? GRN : OFF;
    }
  }
  function place(c) {
    let p, dx, dz;
    if (c.turn) { p = c.turn.at(Math.min(1, c.s / c.turn.len)); const q = c.turn.at(Math.min(1, (c.s + 0.3) / c.turn.len)), r0 = c.turn.at(Math.max(0, (c.s - 0.3) / c.turn.len)); dx = q.x - r0.x; dz = q.z - r0.z; }
    else { const L = c.lane, u = c.s / L.len; p = { x: L.a.x + (L.b.x - L.a.x) * u, z: L.a.z + (L.b.z - L.a.z) * u }; dx = L.b.x - L.a.x; dz = L.b.z - L.a.z; }
    c.x = p.x; c.z = p.z; c.hx = dx; c.hz = dz;
    c.mesh.position.set(p.x, 0, p.z); c.mesh.rotation.y = -Math.atan2(dz, dx);
    const l = Math.hypot(dx, dz) || 1, cx = Math.abs(dx / l), cz = Math.abs(dz / l);
    const ex = cx * CAR / 2 + cz * 1.0, ez = cz * CAR / 2 + cx * 1.0;
    Object.assign(c.solid, { x0: p.x - ex, x1: p.x + ex, z0: p.z - ez, z1: p.z + ez });
  }
  // algo (van, motorista a pé) na frente do carro?
  function blockedAhead(c, obs) {
    const l = Math.hypot(c.hx, c.hz) || 1, fx = c.hx / l, fz = c.hz / l;
    for (const o of obs) for (let k = 2.6; k <= 8.6; k += 1.5) {
      const px = c.x + fx * k, pz = c.z + fz * k;
      if (o.circles.some(([x, z, r]) => Math.hypot(px - x, pz - z) < r + 1.1)) return true;
    }
    return false;
  }

  return {
    object: root,
    get cars() { return cars; },
    phaseAt: j => phaseAt(j),
    /** Monta a rede (depois dos postos/galpões da partida) e espalha os carros: mais na avenida, menos nas ruas. */
    reset(nAve = 16, nStreet = 18) {
      for (const c of cars) { root.remove(c.mesh); const k = SOLIDS.indexOf(c.solid); if (k >= 0) SOLIDS.splice(k, 1); }
      cars = []; build(); t = Math.random() * CYCLE;
      const all = [];
      for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) for (const d of Object.keys(DIRS)) if (edgeOk(i, j, d)) laneCoords(i, j, d).forEach((_, k) => all.push(makeLane(i, j, d, k)));
      const ave = all.filter(L => L.ave), street = all.filter(L => !L.ave && L.len > 8);
      const spawn = (pool, n) => {
        for (let tries = 0; n > 0 && tries < 400; tries++) {
          const L = pool[Math.floor(Math.random() * pool.length)], s = CAR / 2 + Math.random() * (L.len - CAR);
          if (L.cars.some(c => Math.abs(c.s - s) < CAR + 3) || (L.i <= 1 && Math.abs(L.a.x - rc(Math.floor(GRID / 2))) < 12)) continue;   // nada colado na entrada
          const mesh = buildCar(); mesh.userData.body.material = mat(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]);
          root.add(mesh);
          const c = { mesh, lane: L, s, v: 0, vmax: L.ave ? 8.5 + Math.random() * 2 : 5.5 + Math.random() * 1.5, next: null, turn: null, wait: 0, solid: { x0: 0, x1: 0, z0: 0, z1: 0 }, horiz: false };
          L.cars.push(c); L.cars.sort((a, b) => a.s - b.s); cars.push(c); place(c); n--;
        }
      };
      spawn(ave, nAve); spawn(street, nStreet);
    },
    detach() { for (const c of cars) { const k = SOLIDS.indexOf(c.solid); if (k >= 0) SOLIDS.splice(k, 1); } if (root.parent) root.parent.remove(root); },
    /** obs: [{ circles: [[x, z, r], …] }] — a van e o motorista a pé. ear: posição de quem ouve (som dos motores). */
    update(dt, obs, ear) {
      if (!built) return;
      t += dt; paintLights();
      for (const c of cars) {
        if (c.turn) {                                                    // dentro do cruzamento
          const N = c.next, ahead = N.cars.length ? N.cars[0].s - CAR : N.len;
          let gap = c.turn.len - c.s + ahead;
          for (const o of cars) if (o !== c && o.turn && o.next === N && o.s > c.s) gap = Math.min(gap, o.s - c.s - CAR);
          let want = Math.min(c.vmax, 5.2, Math.max(0, gap - GAP) * 1.3);
          if (blockedAhead(c, obs)) want = 0;
          c.v = c.v < want ? Math.min(want, c.v + 4 * dt) : Math.max(want, c.v - 10 * dt);
          c.s += c.v * dt;
          if (c.s >= c.turn.len) {
            node(...c.lane.to).occ.delete(c);
            c.lane = N; c.s = c.s - c.turn.len; c.turn = null; c.next = null; c.wait = 0; c.avoid = null;
            N.cars.unshift(c); N.cars.sort((a, b) => a.s - b.s);
          }
          place(c); continue;
        }
        const L = c.lane, idx = L.cars.indexOf(c), lead = L.cars[idx + 1];
        if (!c.next) c.next = pickExit(c, L);
        const rem = L.len - c.s;
        let want = c.vmax;
        if (lead) want = Math.min(want, Math.max(0, lead.s - c.s - CAR - GAP) * 1.2);
        const ok = c.next && canEnter(c, L, c.next);
        if (!ok) want = Math.min(want, Math.max(0, rem - 0.4) * 1.1);
        else want = Math.min(want, c.next.d === L.d ? c.vmax : 6 + rem * 0.6);   // diminui para a curva
        if (blockedAhead(c, obs)) want = 0;
        c.v = c.v < want ? Math.min(want, c.v + 3.5 * dt) : Math.max(want, c.v - 10 * dt);
        c.s = Math.min(L.len, c.s + c.v * dt);
        if (!ok && rem < 1.5) {                                          // parado na faixa de retenção
          c.wait += dt;
          const [i, j] = L.to;
          if (c.wait > 7 && !isLight(i, j)) { c.avoid = c.next && c.next.d; c.next = null; c.wait = 0; }   // espera demais: outra saída
        }
        if (ok && c.s >= L.len - 0.05) {                                 // entra no cruzamento
          L.cars.splice(L.cars.indexOf(c), 1);
          c.turn = makeTurn(L, c.next); c.s = 0; c.horiz = L.d === 'E' || L.d === 'W';
          node(...L.to).occ.add(c);
        }
        place(c);
      }
      for (const c of cars) if (SOLIDS.indexOf(c.solid) < 0) SOLIDS.push(c.solid);
      // som: o carro mais perto
      if (ear && audio && audio.traffic) {
        let best = 1e9, bv = 0;
        for (const c of cars) { const d = Math.hypot(c.x - ear.x, c.z - ear.z); if (d < best) { best = d; bv = c.v; } }
        audio.traffic(Math.max(0, 1 - best / 38) * (0.4 + 0.6 * Math.min(1, bv / 6)), Math.min(1, bv / 10));
      }
    },
    silence() { if (audio && audio.traffic) audio.traffic(0); },
  };
}
