// Nível 16 (Nevasca): plano FIXO da vila nevada (área ~8×8, sem grade). Três alturas: baixa (0), patamar do meio
// (MID, altura 3) e patamar alto (HIGH, altura 6), ligados por 4 ladeiras suaves (a van sobe; 3 em 24). Ruas sinuosas em
// rede, com caminhos alternativos (2 ladeiras para cada patamar). Atalhos fechados por montes de neve que o limpa-neve
// abre por um tempo (nunca são o único acesso a uma casa). Placas de gelo em ruas secundárias, curvas e numa ladeira.
// Casas (lote normal 17.2 com quintal e cerca) mais espaçadas, de frente para a rua. Tudo é geometria pura.

export const SNOW = { MIDH: 3, HIGHH: 6, RW: 8 };

export function planSnow(MAP, HEDGE) {
  const { MIDH, HIGHH, RW } = SNOW, hw = RW / 2;
  const MID = { x0: 70, z0: 75, x1: MAP - HEDGE, z1: MAP - HEDGE }, HIGH = { x0: 140, z0: 140, x1: MAP - HEDGE, z1: MAP - HEDGE };
  // ladeiras: retângulos (eixo da subida: 'z' ou 'x'), altura de h0 a h1
  const ramps = [
    { x0: 101, x1: 109, z0: 63, z1: 87, axis: 'z', h0: 0, h1: MIDH },          // A: baixa → meio (rua principal)
    { x0: 58, x1: 82, z0: 161, z1: 169, axis: 'x', h0: 0, h1: MIDH },          // B: baixa → meio (oeste)
    { x0: 171, x1: 179, z0: 128, z1: 152, axis: 'z', h0: MIDH, h1: HIGHH },    // C: meio → alto (principal, com gelo)
    { x0: 128, x1: 152, z0: 181, z1: 189, axis: 'x', h0: MIDH, h1: HIGHH },    // D: meio → alto (oeste, limpa)
  ];
  const N = {
    n0: [104.6, -4], n1: [104.6, 22], n2: [78, 40], n3: [40, 32], n4: [24, 72], n5: [40, 112], n6: [56, 140], n7: [58, 165],
    n8: [82, 165], n9: [100, 150], n10: [112, 122], n11: [126, 104], n12: [105, 87], n13: [105, 63], n14: [98, 50],
    n15: [150, 26], n16: [190, 42], n17: [186, 64], n18: [150, 58], n19: [160, 100], n20: [175, 116], n21: [175, 128],
    n22: [175, 152], n23: [196, 160], n24: [196, 192], n25: [162, 180], n26: [152, 185], n27: [128, 185], n28: [108, 192], n29: [86, 194],
  };
  const E = [   // [a, b, tipo]: 'main' (principal, limpa), 'side' (secundária), 'ramp', 'cut' (atalho com monte de neve)
    ['n0', 'n1', 'main'], ['n1', 'n14', 'main'], ['n14', 'n13', 'main'], ['n13', 'n12', 'ramp'], ['n12', 'n11', 'main'], ['n11', 'n19', 'main'],
    ['n19', 'n20', 'main'], ['n20', 'n21', 'main'], ['n21', 'n22', 'ramp'], ['n22', 'n25', 'main'], ['n25', 'n24', 'side'],
    ['n1', 'n2', 'side'], ['n2', 'n3', 'side'], ['n3', 'n4', 'side'], ['n4', 'n5', 'side'], ['n5', 'n6', 'side'], ['n6', 'n7', 'side'], ['n7', 'n8', 'ramp'],
    ['n8', 'n9', 'side'], ['n9', 'n10', 'side'], ['n10', 'n11', 'side'], ['n8', 'n29', 'side'], ['n29', 'n28', 'side'], ['n28', 'n27', 'side'],
    ['n27', 'n26', 'ramp'], ['n26', 'n25', 'side'],
    ['n1', 'n15', 'side'], ['n15', 'n16', 'side'], ['n16', 'n17', 'side'], ['n17', 'n18', 'side'], ['n18', 'n14', 'side'],
    ['n3', 'n14', 'cut'], ['n9', 'n20', 'cut'],
  ];
  const segs = E.map(([a, b, type]) => ({ a: N[a], b: N[b], na: a, nb: b, type }));
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t, x: ax + dx * t, z: az + dz * t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d));
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const h = (x, z) => {
    for (const r of ramps) if (inR(r, x, z)) return r.h0 + (r.h1 - r.h0) * (r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0));
    return inR(HIGH, x, z) ? HIGHH : inR(MID, x, z) ? MIDH : 0;
  };
  const level = (x, z) => (inR(HIGH, x, z) ? 2 : inR(MID, x, z) ? 1 : 0);
  // a área toda num só patamar, longe das bordas (muros)
  const oneLevel = b => { const l = level(b.x0, b.z0); for (const [x, z] of [[b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) if (level(x, z) !== l) return -1;
    for (const P of [MID, HIGH]) for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z1]]) if (Math.abs(x - P.x0) < 1.5 || Math.abs(z - P.z0) < 1.5) return -1;
    if (b.x0 < MID.x0 && b.x1 > MID.x0 && b.z1 > MID.z0) return -1; if (b.z0 < MID.z0 && b.z1 > MID.z0 && b.x1 > MID.x0) return -1;
    if (b.x0 < HIGH.x0 && b.x1 > HIGH.x0 && b.z1 > HIGH.z0) return -1; if (b.z0 < HIGH.z0 && b.z1 > HIGH.z0 && b.x1 > HIGH.x0) return -1;
    return l; };
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };
  const rampBoxes = ramps.map(r => ({ x0: r.x0 - 2, x1: r.x1 + 2, z0: r.z0 - 2, z1: r.z1 + 2 }));

  // ---- casas: lote 17.2 (+ calçada) de frente para a rua, bem espaçadas; só em ruas normais (nunca em atalhos) ----
  const S = 9.0;                                                          // meio lote com a calçada
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const spots = [];
  for (const sg of segs) {
    if (sg.type === 'cut' || sg.type === 'ramp') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 10; t < len - 6; t += 5) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, ax2 = Math.abs(nx) > Math.abs(nz), fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);
      for (const off of [hw + 2.6 + S, hw + 4 + S, hw + 6 + S, hw + 9 + S, hw + 12 + S]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off;
        const b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
        if (b.x0 < HEDGE + 1 || b.z0 < HEDGE + 1 || b.x1 > MAP - HEDGE - 1 || b.z1 > MAP - HEDGE - 1) continue;
        const lv = oneLevel(b);
        if (lv < 0 || lv !== level(ax + ux * t, az + uz * t) || !clearOfRoads(b, 0.6) || rampBoxes.some(r => hit(b, r, 1)) || spots.some(o => hit(b, o.box, 3))) continue;   // espaçadas
        if (Math.abs(px - 104.6) < 20 && pz < 34) continue;              // entrada livre
        const sp = { px, pz, ry: Math.atan2(fx, fz), fx, fz, y: [0, MIDH, HIGHH][lv], box: b, tags: [] };
        const c = toW(sp, 0, -3.6), d = toW(sp, 0, 11.4), r = toW(sp, 0, 6.8), w0 = toW(sp, -4.5, -7.1), w1 = toW(sp, 4.5, -0.1);
        Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry },
          walkBox: { x0: Math.min(w0.x, w1.x), x1: Math.max(w0.x, w1.x), z0: Math.min(w0.z, w1.z), z1: Math.max(w0.z, w1.z) } });
        spots.push(sp); break;
      }
    }
  }
  while (spots.length > 32) spots.splice(Math.floor(spots.length / 2), 1);   // (32 casas no total)
  if (spots[5]) {                                                         // ponto 5 = Grillby's (fixo): paredes, placa e beiral (a porta fica livre na frente)
    const sp = spots[5], a = toW(sp, -6.7, -5.5), b = toW(sp, 6.7, 3.25);
    sp.walkBox = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z) };
  }
  // ---- gelo: trechos (segmento, t0..t1) em secundárias, curvas e na ladeira C; a principal fica limpa ----
  const iceDefs = [['n2', 'n3', 0.2, 0.8], ['n4', 'n5', 0.3, 0.9], ['n5', 'n6', 0.0, 0.6], ['n21', 'n22', 0.05, 0.95], ['n16', 'n17', 0.1, 0.9],
    ['n29', 'n28', 0.1, 0.9], ['n9', 'n10', 0.4, 1.0], ['n15', 'n16', 0.55, 0.95], ['n25', 'n24', 0.4, 0.85]];
  const ice = iceDefs.map(([a, b, t0, t1]) => ({ seg: segs.find(s => (s.na === a && s.nb === b) || (s.na === b && s.nb === a)), t0, t1 }));
  const iceAt = (x, z) => { for (const p of ice) { const q = segDist(x, z, p.seg); if (q.d < hw + 0.6 && q.t >= p.t0 && q.t <= p.t1) return 1; } return 0; };
  // ---- atalhos (montes de neve no meio) e a rota do limpa-neve (passa pelos dois atalhos) ----
  const cuts = segs.filter(s => s.type === 'cut').map(s => {
    const mx = (s.a[0] + s.b[0]) / 2, mz = (s.a[1] + s.b[1]) / 2;
    return { seg: s, x: mx, z: mz, y: h(mx, mz), box: { x0: mx - 5.2, x1: mx + 5.2, z0: mz - 5.2, z1: mz + 5.2 } };
  });
  const P = k => N[k];
  const plowLoop = ['n1', 'n2', 'n3', 'n14', 'n13', 'n12', 'n11', 'n10', 'n9', 'n20', 'n19', 'n11', 'n12', 'n13', 'n14'].map(P);
  // ---- decoração: grupos de pinheiros fora das ruas e das casas ----
  let seed = 161; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pines = [];
  for (let z = HEDGE + 8; z < MAP - 8; z += 13) for (let x = HEDGE + 8; x < MAP - 8; x += 13) {
    const px = x + (rnd() - 0.5) * 5, pz = z + (rnd() - 0.5) * 5, b = { x0: px - 1.6, x1: px + 1.6, z0: pz - 1.6, z1: pz + 1.6 };
    if (rnd() < 0.35 || oneLevel(b) < 0 || !clearOfRoads(b, 2.5) || spots.some(o => hit(b, o.box, 1.5)) || rampBoxes.some(r => hit(b, r, 2))) continue;
    if (Math.abs(px - 104.6) < 14 && pz < 30) continue;
    pines.push({ x: px, z: pz, y: h(px, pz), s: 0.9 + rnd() * 0.6, box: b });
  }
  return { N, segs, ramps, MID, HIGH, h, level, spots, ice, iceAt, cuts, plowLoop, pines, roadDist };
}
