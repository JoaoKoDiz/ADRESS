// Nível 17 (Órbita — planejado como o especial 20): uma pequena lua ESFÉRICA de verdade (raio MOON.R). Tudo é descrito
// em coordenadas da esfera (vetores unitários a partir do centro): 3 estradas em anel (grandes círculos que se cruzam em
// 6 rotatórias, dá para dar a volta na lua por qualquer uma), 8 vilas de módulos — cada uma com uma rua em laço em volta
// de uma praça central e 2 ramais até os anéis —, crateras com ponte nos anéis (saltinhos na gravidade baixa) e, no resto,
// crateras, pedras, depósitos, tanques, painéis solares, estufinhas, antenas e jipes. A simulação plana usa um mapa local
// recentrado a cada quadro no jogador (moonFrame.js).
import * as THREE from 'three';

export const MOON = { R: 70, RW: 8, S: 8, DECK: 0.5 };

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const R = MOON.R, hw = MOON.RW / 2;

/** Base tangente (u, v) em n. */
export function tangentBasis(n) {
  const a = Math.abs(n.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const u = a.clone().cross(n).normalize(), v = n.clone().cross(u).normalize();
  return { u, v };
}
/** Ponto à distância angular `ang` de c, na direção tangente d. */
const offset = (c, d, ang) => c.clone().multiplyScalar(Math.cos(ang)).addScaledVector(d, Math.sin(ang)).normalize();
/** Direção tangente em p apontando para q (ao longo do grande círculo). */
export const towards = (p, q) => q.clone().addScaledVector(p, -p.dot(q)).normalize();
const arcPts = (a, b, step = 1.6) => {
  const ang = a.angleTo(b), n = Math.max(1, Math.ceil(ang * R / step)), out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = Math.sin(ang); out.push(a.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).addScaledVector(b, Math.sin(t * ang) / s)); }
  return out;
};
const circlePts = (c, ang, n) => { const { u, v } = tangentBasis(c), out = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push(offset(c, u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)), ang)); }
  return out; };
/** Distância (na superfície) de p ao trecho de grande círculo a→b. */
function segDist(p, a, b) {
  const m = a.clone().cross(b); const L = m.length(); if (L < 1e-9) return p.angleTo(a) * R; m.divideScalar(L);
  const s = p.dot(m), q = p.clone().addScaledVector(m, -s);
  if (q.lengthSq() > 1e-12) { q.normalize(); if (a.clone().cross(q).dot(m) >= 0 && q.clone().cross(b).dot(m) >= 0) return Math.abs(Math.asin(Math.max(-1, Math.min(1, s)))) * R; }
  return Math.min(p.angleTo(a), p.angleTo(b)) * R;
}

export function planMoon() {
  const AX = [V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)];
  const roads = [];                                     // { pts, closed, kind }
  // ---- 3 anéis (normais X, Y e Z) ----
  const rings = AX.map(n => { const { u, v } = n.x ? { u: V(0, 1, 0), v: V(0, 0, 1) } : n.y ? { u: V(1, 0, 0), v: V(0, 0, 1) } : { u: V(1, 0, 0), v: V(0, 1, 0) };
    const pts = []; for (let i = 0; i < 280; i++) { const a = i / 280 * Math.PI * 2; pts.push(u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a))); }
    return { n, u, v, pts }; });
  rings.forEach(r => roads.push({ pts: r.pts, closed: true, kind: 'ring' }));
  const ringAt = (ri, deg) => { const r = rings[ri], a = deg * Math.PI / 180; return r.u.clone().multiplyScalar(Math.cos(a)).addScaledVector(r.v, Math.sin(a)); };
  const junctions = [...AX, ...AX.map(a => a.clone().negate())].map(p => ({ p, r: hw + 1.5 }));   // rotatórias (cruzamentos dos anéis)

  // ---- 8 vilas nos cantos do cubo: rua em laço (raio LOOP) + 2 ramais até os anéis ----
  const LOOP = 15 / R, MODA = (15 + hw + 1.2 + MOON.S) / R;
  const FEATURES = ['greenhouse', 'pad', 'antenna', 'tanks', 'solar', 'garden', 'beacon', 'dish'];
  const clusters = [];
  let k = 0;
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
    const c = V(sx, sy, sz).normalize(), skip = k % 3, branches = [];
    for (let ri = 0; ri < 3; ri++) {
      if (ri === skip) continue;
      const n = rings[ri].n, t = c.clone().addScaledVector(n, -c.dot(n)).normalize(), d = towards(c, t);
      const s = offset(c, d, LOOP);
      roads.push({ pts: arcPts(s, t), closed: false, kind: 'branch' });
      junctions.push({ p: t, r: hw + 1 }, { p: s, r: hw + 0.5 });
      branches.push(d);
    }
    roads.push({ pts: circlePts(c, LOOP, 72), closed: true, kind: 'loop' });
    clusters.push({ c, branches, feature: FEATURES[k], k });
    k++;
  }
  // trechos (para distâncias) e pontos de rua
  const segs = [];
  for (const r of roads) for (let i = 0; i < r.pts.length - (r.closed ? 0 : 1); i++) segs.push([r.pts[i], r.pts[(i + 1) % r.pts.length]]);
  const roadDist = p => { let m = 1e9; for (const [a, b] of segs) { if (p.dot(a) < 0.9) continue; const d = segDist(p, a, b); if (d < m) m = d; } return m; };

  // ---- crateras com ponte nos anéis (a rua passa por cima: saltinho) ----
  const bridges = [[1, 70], [1, 250], [0, 160], [2, 290]].map(([ri, deg]) => {
    const p = ringAt(ri, deg), r = rings[ri], a = deg * Math.PI / 180, along = r.u.clone().multiplyScalar(-Math.sin(a)).addScaledVector(r.v, Math.cos(a)).normalize();
    return { p, n: r.n, along, cr: 6.5, half: 9 };       // half: meio comprimento do tabuleiro + rampas
  });
  /** Altura do chão (tabuleiro das pontes) no ponto p da esfera. */
  const bump = p => {
    for (const b of bridges) {
      if (p.dot(b.p) < 0.98) continue;
      const across = Math.asin(Math.max(-1, Math.min(1, p.dot(b.n)))) * R;
      if (Math.abs(across) > hw) continue;
      const q = p.clone().addScaledVector(b.n, -p.dot(b.n)).normalize(), x = q.angleTo(b.p) * R;
      if (x > b.half) continue;
      const flat = b.half - 3; return x < flat ? MOON.DECK : MOON.DECK * (b.half - x) / 3;
    }
    return 0;
  };

  // ---- módulos de entrega: 4 por vila, em volta do laço, de frente para a rua ----
  const spots = [];
  for (const cl of clusters) {
    const { u, v } = tangentBasis(cl.c), ang = d => Math.atan2(d.dot(v), d.dot(u));
    const bAng = cl.branches.map(ang), allowed = [];
    for (let deg = 0; deg < 360; deg += 1) { const a = deg * Math.PI / 180; if (bAng.every(b => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) > 0.55)) allowed.push(a); }
    // 4 posições espalhadas pelos ângulos livres (começando logo depois de um ramal, para ficar regular)
    const b0 = bAng[0]; allowed.sort((p, q) => ((p - b0 + 4 * Math.PI) % (2 * Math.PI)) - ((q - b0 + 4 * Math.PI) % (2 * Math.PI)));
    for (let i = 0; i < 4; i++) {
      const a = allowed[Math.floor((i + 0.5) * allowed.length / 4)], d = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
      const n = offset(cl.c, d, MODA), f = towards(n, cl.c);            // frente (porta) virada para o laço
      const at = dist => offset(n, f, dist / R);
      spots.push({ n, f, doorN: at(MOON.S + 1.2), resN: at(6.6), cluster: cl.k, a, tags: [], y: 0, foot: false,
        // campos do mapa local (refeitos a cada quadro): centro, porta, morador, caixa
        cx: 0, cz: 0, px: 0, pz: 0, fx: 0, fz: 1, door: { x: 0, z: 0 }, res: null, box: { x0: 1e9, x1: 1e9 + 1, z0: 1e9, z1: 1e9 + 1 } });
    }
  }
  const FEAT_TAG = { greenhouse: 'loc:greenhouse', pad: 'loc:rocket', antenna: 'loc:antenna', solar: 'loc:solar' };
  for (const sp of spots) { const t = FEAT_TAG[clusters[sp.cluster].feature]; if (t) sp.tags.push(t); }

  // ---- obstáculos (círculos na esfera): módulos, praças das vilas, enchimento e decoração ----
  const obstacles = [];                                  // { n, r, top, kind, ... }
  const deco = [];                                       // peças visuais (o que é sólido também entra em obstacles)
  const free = (p, r, m = 1.2) => roadDist(p) > hw + r + m && spots.every(s => p.angleTo(s.n) * R > 8.2 + r && p.angleTo(s.doorN) * R > 3.5 + r)
    && obstacles.every(o => p.angleTo(o.n) * R > o.r + r + 0.8) && deco.every(o => o.kind === 'bridge' || p.angleTo(o.n) * R > (o.cr || o.r) + r + 0.8) && bridges.every(b => p.angleTo(b.p) * R > b.half + r + 1);
  const add = (kind, n, r, top, extra = {}) => { const d = { kind, n, r, top, f: tangentBasis(n).u, ...extra }; deco.push(d); if (r > 0) obstacles.push(d); return d; };
  // praça de cada vila (dentro do laço): estufa grande, plataforma com foguete, torre de antenas…
  for (const cl of clusters) add('feature:' + cl.feature, cl.c, cl.feature === 'pad' ? 9 : 8.2, cl.feature === 'pad' ? 20 : 9, { f: tangentBasis(cl.c).u });
  // crateras com ponte: as beiradas ao lado do tabuleiro são sólidas (a van passa só pela ponte)
  for (const b of bridges) { deco.push({ kind: 'bridge', ...b }); for (const s of [-1, 1]) for (const al of [-3.2, 0, 3.2]) obstacles.push({ kind: 'rim', n: offset(offset(b.p, b.n, s * (hw + 1.7) / R), b.along, al / R), r: 1.3, top: 0.6 }); }
  // enchimento entre os módulos de cada vila: depósitos, tanques e casinhas-cúpula (sem entrega)
  for (const cl of clusters) {
    const { u, v } = tangentBasis(cl.c);
    for (let deg = 0; deg < 360; deg += 9) {
      const a = deg * Math.PI / 180, d = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
      for (const rr of [MODA * R, MODA * R + 6]) { const p = offset(cl.c, d, rr / R), kind = ['depot', 'minidome', 'tank', 'crates'][(deg / 9 + cl.k) % 4], r = kind === 'minidome' ? 3 : kind === 'depot' ? 2.8 : 1.8;
        if (free(p, r, 1.5)) add(kind, p, r, kind === 'tank' ? 5 : 4.5, { f: towards(p, cl.c), seed: deg + cl.k * 7 }); }
    }
  }
  // resto da lua: pontos espalhados (espiral de Fibonacci) com crateras, pedras, painéis, estufinhas, antenas e jipes
  const N = 2600, gold = Math.PI * (3 - Math.sqrt(5));
  let sd = 4242; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const TYPES = ['rock', 'solar', 'rock', 'minigreen', 'antenna', 'rover', 'rocks', 'depot', 'tank', 'solar', 'rocks', 'minigreen'];
  for (let pass = 0; pass < 2; pass++) for (let i = pass; i < N; i += pass ? 1 : 5) {      // 1ª passada: crateras (cabem antes do resto)
    const y = 1 - (i + 0.5) / N * 2, rad = Math.sqrt(1 - y * y), th = gold * i, p = V(Math.cos(th) * rad, y, Math.sin(th) * rad);
    const kind = pass ? TYPES[Math.floor(rnd() * TYPES.length)] : 'crater';
    if (pass && kind === 'crater') continue;
    const r = kind === 'crater' ? 2.5 + rnd() * 7 : kind === 'rock' ? 0.6 + rnd() * 1.2 : kind === 'rocks' ? 1.6 : kind === 'solar' ? 3 : kind === 'minigreen' ? 3 : kind === 'rover' ? 2 : kind === 'depot' ? 2.8 : kind === 'tank' ? 1.8 : 1.2;
    if (!free(p, r, kind === 'crater' ? 0.6 : 1.2)) continue;
    // crateras rasas (pequenas) não barram; as grandes, sim
    add(kind, p, kind === 'crater' && r < 4 ? 0 : kind === 'crater' ? r * 0.75 : r, kind === 'crater' ? 0.8 : kind === 'antenna' ? 9 : kind === 'rock' ? r : 4, { cr: r, f: tangentBasis(p).u.applyAxisAngle(p, rnd() * 6.28), seed: i });
  }
  // início: no anel do equador (normal Y), perto da rotatória de +X, andando para a primeira vila
  const start = { p: ringAt(1, 12), f: null }; start.f = towards(start.p, ringAt(1, 20));
  return { R, roads, rings, clusters, junctions, bridges, spots, obstacles, deco, start, bump, roadDist };
}
