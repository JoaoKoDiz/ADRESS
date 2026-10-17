// Nível 22 (Bosque): plano FIXO de um bairro residencial dentro de um bosque de outono (área ~8×8, sem grade).
// Ruas curvas em rede (nós N + trechos), bifurcações e laços (caminhos alternativos), um patamar baixo (MID, altura 2,4)
// no canto sudeste com 2 ladeiras suaves. Casas (lote 17.2 com quintal e cerca, centrado e girado para a rua) em grupos;
// trechos 'wood' atravessam o mato (sem casas). Árvores entre os grupos, sempre fora das pistas, lotes, portas e caminhos.
// Mesmo formato do plano do Nevasca (snowPlan.js): o resto do jogo usa os pontos (SPOTS) do mesmo jeito.
import { obbBox } from './obb.js';

export const FOREST = { MIDH: 2.4, RW: 8 };

export function planForest(MAP, HEDGE) {
  const { MIDH, RW } = FOREST, hw = RW / 2;
  const MID = { x0: 130, z0: 118, x1: MAP - HEDGE, z1: MAP - HEDGE };
  const ramps = [
    { x0: 172, x1: 180, z0: 106, z1: 130, axis: 'z', h0: 0, h1: MIDH },   // leste: sobe para o sul
    { x0: 118, x1: 142, z0: 174, z1: 182, axis: 'x', h0: 0, h1: MIDH },   // sul: sobe para o leste
  ];
  const N = {
    n0: [104.6, -4], n1: [104.6, 18], n2: [84, 32], n3: [60, 30], n4: [38, 42], n5: [26, 64], n6: [24, 92], n7: [32, 120],
    n8: [46, 144], n9: [50, 170], n10: [70, 190], n11: [98, 192], n12: [126, 32], n13: [150, 26], n14: [174, 36], n15: [192, 58],
    n16: [194, 86], n17: [176, 106], n18: [176, 130], n19: [190, 154], n20: [184, 186], n21: [158, 196], n22: [142, 178], n23: [118, 178],
    n24: [92, 62], n25: [78, 94], n26: [92, 124], n27: [112, 144], n28: [50, 94], n29: [124, 66], n30: [150, 76], n31: [172, 80],
    n32: [124, 106], n33: [78, 152], n34: [152, 150],
  };
  const E = [   // [a, b, tipo]: 'main' (principal), 'side' (secundária), 'wood' (pelo mato, sem casas), 'ramp'
    ['n0', 'n1', 'main'], ['n1', 'n2', 'main'], ['n2', 'n3', 'side'], ['n3', 'n4', 'side'], ['n4', 'n5', 'side'], ['n5', 'n6', 'side'],
    ['n6', 'n7', 'side'], ['n7', 'n8', 'side'], ['n8', 'n9', 'wood'], ['n9', 'n10', 'side'], ['n10', 'n11', 'side'],
    ['n1', 'n12', 'main'], ['n12', 'n13', 'side'], ['n13', 'n14', 'side'], ['n14', 'n15', 'wood'], ['n15', 'n16', 'side'], ['n16', 'n17', 'side'],
    ['n17', 'n18', 'ramp'], ['n18', 'n19', 'side'], ['n19', 'n20', 'side'], ['n20', 'n21', 'side'], ['n21', 'n22', 'wood'], ['n22', 'n23', 'ramp'],
    ['n23', 'n11', 'side'], ['n2', 'n24', 'main'], ['n24', 'n25', 'main'], ['n25', 'n26', 'main'], ['n26', 'n27', 'main'], ['n27', 'n23', 'main'],
    ['n25', 'n28', 'side'], ['n28', 'n6', 'wood'], ['n24', 'n29', 'side'], ['n29', 'n30', 'side'], ['n30', 'n31', 'wood'], ['n31', 'n16', 'side'],
    ['n26', 'n32', 'wood'], ['n32', 'n17', 'side'], ['n8', 'n33', 'side'], ['n18', 'n34', 'side'], ['n34', 'n22', 'side'],
  ];
  const segs = E.map(([a, b, type]) => ({ a: N[a], b: N[b], na: a, nb: b, type }));
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t };
  };
  const roadDist = (x, z) => { let m = 1e9; for (const s of segs) m = Math.min(m, segDist(x, z, s).d); for (const [x2, z2] of Object.values(N)) m = Math.min(m, Math.hypot(x - x2, z - z2)); return m; };
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const h = (x, z) => {
    for (const r of ramps) if (inR(r, x, z)) return r.h0 + (r.h1 - r.h0) * (r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0));
    return inR(MID, x, z) ? MIDH : 0;
  };
  const level = (x, z) => (inR(MID, x, z) ? 1 : 0);
  const oneLevel = b => { const l = level(b.x0, b.z0); for (const [x, z] of [[b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) if (level(x, z) !== l) return -1;
    if (Math.abs(b.x0 - MID.x0) < 1.5 || Math.abs(b.z0 - MID.z0) < 1.5 || Math.abs(b.x1 - MID.x0) < 1.5 || Math.abs(b.z1 - MID.z0) < 1.5) return -1;
    return l; };
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };
  const rampBoxes = ramps.map(r => ({ x0: r.x0 - 2, x1: r.x1 + 2, z0: r.z0 - 2, z1: r.z1 + 2 }));

  // ---- casas: lote 17.2 (+ calçada) de frente para a rua, em grupos (os trechos 'wood' ficam só com árvores) ----
  const S = 9.0;
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const spots = [];
  for (const sg of segs) {
    if (sg.type === 'wood' || sg.type === 'ramp') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 8; t < len - 5; t += 3) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, fx = -nx, fz = -nz;      // de frente para a rua (acompanha a curva)
      for (const off of [hw + 2.6 + S, hw + 4 + S, hw + 6 + S, hw + 9 + S, hw + 12 + S]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off;
        const b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
        if (b.x0 < HEDGE + 1 || b.z0 < HEDGE + 1 || b.x1 > MAP - HEDGE - 1 || b.z1 > MAP - HEDGE - 1) continue;
        const lv = oneLevel(b);
        if (lv < 0 || lv !== level(ax + ux * t, az + uz * t) || !clearOfRoads(b, 0.6) || rampBoxes.some(r => hit(b, r, 1)) || spots.some(o => hit(b, o.box, 1.6))) continue;
        if (Math.abs(px - 104.6) < 20 && pz < 34) continue;              // entrada livre
        const sp = { px, pz, ry: Math.atan2(fx, fz), fx, fz, y: lv ? MIDH : 0, box: b, tags: [] };
        const c = toW(sp, 0, -3.6), d = { x: ax + ux * t + nx * (hw - 1.2), z: az + uz * t + nz * (hw - 1.2) },   // ponto de entrega na beira da rua, em frente ao lote
           r = toW(sp, 0, 6.8);
        Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry },
          walkBox: obbBox((x, z) => toW(sp, x, z), sp.ry, -4.5, -7.1, 4.5, -0.1) });
        spots.push(sp); break;
      }
    }
  }
  while (spots.length > 34) spots.splice(Math.floor(spots.length / 2), 1);
  const accessLines = spots.map(sp => [toW(sp, 0, 7.5), sp.door]);
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const blocksAccess = (x, z, r) => accessLines.some(([a, b]) => lineDist(x, z, a, b) < r + 1.0) || spots.some(sp => Math.hypot(sp.door.x - x, sp.door.z - z) < r + 2.2);
  const nearEdge = (x, z, r) => { for (const [a, b] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (level(x + a, z + b) !== level(x, z)) return true; return Math.abs(x - MID.x0) < r + 1 && z > MID.z0 - r - 1 || Math.abs(z - MID.z0) < r + 1 && x > MID.x0 - r - 1; };
  const free = (x, z, r, road = hw + r + 0.3) => x > HEDGE + r + 1 && z > HEDGE + r + 1 && x < MAP - HEDGE - r - 1 && z < MAP - HEDGE - r - 1 &&
    roadDist(x, z) >= road && !nearEdge(x, z, r) && !rampBoxes.some(q => inR(q, x, z, r + 1)) && !spots.some(o => inR(o.box, x, z, r + 0.4)) && !blocksAccess(x, z, r + 1.2) &&
    !(Math.abs(x - 104.6) < 14 && z < 30);
  // ---- árvores do bosque (densas): copas laranja e douradas predominando, com vermelho, amarelo, marrom e poucas verdes;
  //      tamanhos bem variados (algumas grandes, de copa larga). Tronco fora das pistas, lotes, portas e caminhos de entrega;
  //      as copas podem avançar um pouco sobre a rua (sensação de cobertura) e ficam transparentes quando escondem algo (forestFx) ----
  let seed = 2207; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = [];
  const COLS = ['orange', 'orange', 'orange', 'orange', 'gold', 'gold', 'gold', 'yellow', 'red', 'red', 'brown', 'brown', 'orange', 'gold', 'green'];
  // alcance horizontal da copa por unidade de escala (como forestFx: copa principal + copinhas laterais)
  const REACH = { round: 2.4, wide: 2.8, tall: 1.5 };
  // árvore da parte baixa perto do patamar: a copa não pode avançar sobre o alto (ficaria "pousada" no gramado de cima,
  // sem tronco à vista) → distância livre até o patamar/ladeira em 16 direções
  const lowClear = (x, z, R) => { let m = R; for (let a = 0; a < 16; a++) { const c = Math.cos(a * Math.PI / 8), s = Math.sin(a * Math.PI / 8);
    for (let d = 0.5; d <= m; d += 0.5) if (h(x + c * d, z + s * d) > 0.3) { m = d; break; } } return m; };
  for (let z = HEDGE + 4; z < MAP - 3; z += 5.4) for (let x = HEDGE + 4; x < MAP - 3; x += 5.4) {
    const px = x + (rnd() - 0.5) * 3.2, pz = z + (rnd() - 0.5) * 3.2;
    if (rnd() < 0.1 || !free(px, pz, 0.8, hw + 2.1) || trees.some(t => Math.hypot(t.x - px, t.z - pz) < 3.6)) continue;
    const r = rnd(), type = r < 0.55 ? 'round' : r < 0.75 ? 'wide' : 'tall', big = rnd() < 0.3, y = h(px, pz);
    let s = big ? 1.4 + rnd() * 0.5 : 0.85 + rnd() * 0.5;
    const color = COLS[Math.floor(rnd() * COLS.length)], k = rnd();
    if (y < 0.3) { const R = REACH[type] * s, c = lowClear(px, pz, R + 0.6); if (c < R + 0.6) s = (c - 0.6) / REACH[type]; if (s < 0.8) continue; }   // encolhe (ou tira) a que encostaria no patamar
    trees.push({ x: px, z: pz, y, s, type, color, k });
  }
  // ---- postes (um por cruzamento, na margem) e bancos públicos de madeira em alguns cantos ----
  const lamps = [];
  for (const [x, z] of Object.values(N).slice(1)) {
    for (let k = 0; k < 16; k++) {
      const a = 0.4 + k * Math.PI / 8, px = x + Math.cos(a) * (hw + 1.4), pz = z + Math.sin(a) * (hw + 1.4);
      if (free(px, pz, 0.35) && !trees.some(p => Math.hypot(p.x - px, p.z - pz) < 1.6) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 4)) { lamps.push({ x: px, z: pz, y: h(px, pz), box: { x0: px - 0.3, x1: px + 0.3, z0: pz - 0.3, z1: pz + 0.3 } }); break; }
    }
  }
  const benches = [];
  for (const s of segs.filter(s => s.type === 'wood')) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), nx = Math.cos(ry), nz = -Math.sin(ry);
    for (const sd of [1, -1]) {
      const px = (ax + bx) / 2 + nx * sd * (hw + 1.6), pz = (az + bz) / 2 + nz * sd * (hw + 1.6);
      if (len > 20 && free(px, pz, 1.2) && !trees.some(p => Math.hypot(p.x - px, p.z - pz) < 1.8) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 2.5)) { benches.push({ x: px, z: pz, y: h(px, pz), ry: ry + (sd > 0 ? Math.PI / 2 : -Math.PI / 2) }); break; }
    }
  }
  // ---- carros circulando devagar: 2 laços pelas ruas da parte baixa ----
  const P = k => N[k];
  const carLoops = [['n1', 'n12', 'n13', 'n14', 'n15', 'n16', 'n31', 'n30', 'n29', 'n24', 'n2'], ['n2', 'n3', 'n4', 'n5', 'n6', 'n28', 'n25', 'n24']].map(l => l.map(P));
  return { N, segs, ramps, MID, h, level, spots, trees, lamps, benches, carLoops, roadDist, free };
}
