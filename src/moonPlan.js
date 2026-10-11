// Nível 17 (Órbita — planejado como o especial 20): plano FIXO da colônia lunar (área ~8×8, sem grade). Solo baixo (0) e um
// patamar central (PLAT, altura 2.5) com 4 rampas suaves. Ruas curvas em anel com ramificações, 3 pontes curtas sobre
// crateras (a ponte é um pouco mais alta que o chão: a van dá pequenos saltos na gravidade baixa), crateras de enfeite
// fora das ruas, estufa comunitária e plataforma de pouso com foguete. Módulos (destinos) de frente para a rua; alguns
// ligados por túneis curtos. Tudo é geometria pura.

export const MOON = { PH: 2.5, RW: 8, S: 8, DECK: 0.35 };

export function planMoon(MAP, HEDGE) {
  const { PH, RW, S, DECK } = MOON, hw = RW / 2, X = 104.6;
  const PLAT = { x0: 78, z0: 96, x1: 132, z1: 140 };
  const ramps = [
    { x0: X - 4, x1: X + 4, z0: 80, z1: 96, axis: 'z', h0: 0, h1: PH },       // norte (rua principal)
    { x0: X - 4, x1: X + 4, z0: 140, z1: 156, axis: 'z', h0: PH, h1: 0 },     // sul
    { x0: 62, x1: 78, z0: 112, z1: 120, axis: 'x', h0: 0, h1: PH },           // oeste
    { x0: 132, x1: 148, z0: 112, z1: 120, axis: 'x', h0: PH, h1: 0 },         // leste
  ];
  const N = {
    n0: [X, -4], n1: [X, 22], n12: [X, 80], n13: [X, 96], n14: [X, 116], n15: [X, 140], n16: [X, 156], n17: [X, 196],
    n2: [60, 30], n3: [28, 58], n4: [34, 116], n5: [34, 170], n6: [66, 196],
    n7: [150, 30], n8: [186, 60], n9: [186, 116], n10: [186, 170], n11: [150, 196],
    n18: [62, 116], n19: [78, 116], n20: [132, 116], n21: [148, 116],
  };
  const E = [
    ['n0', 'n1'], ['n1', 'n12'], ['n12', 'n13', 'ramp'], ['n13', 'n14'], ['n14', 'n15'], ['n15', 'n16', 'ramp'], ['n16', 'n17'],
    ['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n6'], ['n6', 'n17'], ['n17', 'n11'], ['n11', 'n10'], ['n10', 'n9'], ['n9', 'n8'], ['n8', 'n7'], ['n7', 'n1'],
    ['n4', 'n18'], ['n18', 'n19', 'ramp'], ['n19', 'n14'], ['n14', 'n20'], ['n20', 'n21', 'ramp'], ['n21', 'n9'],
  ];
  const segs = E.map(([a, b, type]) => ({ a: N[a], b: N[b], na: a, nb: b, type: type || 'road' }));
  // crateras: com ponte (a rua atravessa por cima, no eixo) e de enfeite (fora das ruas)
  const craters = [
    { x: X, z: 50, r: 11, bridge: 'z' }, { x: 160, z: 116, r: 9, bridge: 'x' }, { x: 34, z: 143, r: 9, bridge: 'z' },
    { x: 155, z: 76, r: 11 }, { x: 62, z: 80, r: 9 }, { x: 72, z: 170, r: 8 }, { x: 128, z: 176, r: 7 },
  ];
  const greenhouse = { x0: 48, x1: 66, z0: 136, z1: 150 };
  const pad = { x: 152, z: 150, r: 9 };
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t, x: ax + dx * t, z: az + dz * t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d));
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const onBridge = (x, z) => craters.some(c => c.bridge && (c.bridge === 'z' ? Math.abs(x - c.x) < hw && Math.abs(z - c.z) < c.r : Math.abs(z - c.z) < hw && Math.abs(x - c.x) < c.r));
  const h = (x, z) => {
    for (const r of ramps) if (inR(r, x, z)) return r.h0 + (r.h1 - r.h0) * (r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0));
    if (inR(PLAT, x, z)) return PH;
    return onBridge(x, z) ? DECK : 0;
  };
  const level = (x, z) => (inR(PLAT, x, z) ? 1 : 0);
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const crBox = c => ({ x0: c.x - c.r, x1: c.x + c.r, z0: c.z - c.r, z1: c.z + c.r });
  const padBox = { x0: pad.x - pad.r, x1: pad.x + pad.r, z0: pad.z - pad.r, z1: pad.z + pad.r };
  const blocks = [...craters.map(crBox), greenhouse, padBox, ...ramps.map(r => ({ x0: r.x0 - 2, x1: r.x1 + 2, z0: r.z0 - 2, z1: r.z1 + 2 }))];
  const oneLevel = b => { const l = level(b.x0, b.z0); for (const [x, z] of [[b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) if (level(x, z) !== l) return -1;
    if (l === 0 && hit(b, PLAT, 1.5)) return -1; if (l === 1 && (b.x0 < PLAT.x0 + 1.5 || b.x1 > PLAT.x1 - 1.5 || b.z0 < PLAT.z0 + 1.5 || b.z1 > PLAT.z1 - 1.5)) return -1; return l; };
  const clearOfRoads = (b, m) => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 5) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 5) if (roadDist(x, z) < hw + m) return false; return true; };

  // ---- módulos de entrega: terreno 16 × 16 de frente para a rua ----
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const spots = [];
  for (const sg of segs) {
    if (sg.type === 'ramp' || sg.na === 'n0') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 8; t < len - 5; t += 4) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, ax2 = Math.abs(nx) > Math.abs(nz), fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);
      for (const off of [hw + 2.4 + S, hw + 4 + S, hw + 6 + S, hw + 9 + S]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off;
        const b = { x0: px - S, z0: pz - S, x1: px + S, z1: pz + S };
        if (b.x0 < HEDGE + 1 || b.z0 < HEDGE + 1 || b.x1 > MAP - HEDGE - 1 || b.z1 > MAP - HEDGE - 1) continue;
        const lv = oneLevel(b);
        if (lv < 0 || lv !== level(ax + ux * t, az + uz * t) || !clearOfRoads(b, 0.5) || blocks.some(r => hit(b, r, 1.5)) || spots.some(o => hit(b, o.box, 2.5))) continue;
        if (Math.abs(px - X) < 18 && pz < 32) continue;                  // entrada livre
        const sp = { px, pz, ry: Math.atan2(fx, fz), fx, fz, y: lv ? PH : 0, box: b, tags: [] };
        const c = toW(sp, 0, -1), d = toW(sp, 0, S + 1.2), r = toW(sp, 0, 6.6), w0 = toW(sp, -5.2, -6.2), w1 = toW(sp, 5.2, 4.6);
        if (craters.some(cr => Math.abs(d.x - cr.x) < cr.r + 3 && Math.abs(d.z - cr.z) < cr.r + 3)) continue;   // entrada nunca de frente para uma cratera
        Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry },
          walkBox: { x0: Math.min(w0.x, w1.x), x1: Math.max(w0.x, w1.x), z0: Math.min(w0.z, w1.z), z1: Math.max(w0.z, w1.z) } });
        spots.push(sp); break;
      }
    }
  }
  while (spots.length > 32) spots.splice(Math.floor(spots.length / 2), 1);
  // lugar nas pistas: ao lado da estufa / perto do foguete / no patamar central
  const near = (sp, b, d) => sp.cx > b.x0 - d && sp.cx < b.x1 + d && sp.cz > b.z0 - d && sp.cz < b.z1 + d;
  for (const sp of spots) {
    if (near(sp, greenhouse, 18)) sp.tags.push('loc:greenhouse');
    else if (near(sp, padBox, 18)) sp.tags.push('loc:rocket');
    if (sp.y > 0) sp.tags.push('loc:plateau');
  }
  // túneis curtos entre módulos vizinhos do mesmo lado da rua (enfeite)
  const tunnels = [];
  for (let i = 0; i < spots.length && tunnels.length < 4; i++) for (let j = i + 1; j < spots.length && tunnels.length < 4; j++) {
    const a = spots[i], b = spots[j], d = Math.hypot(a.cx - b.cx, a.cz - b.cz);
    if (d < 13 || d > 22 || a.ry !== b.ry || a.y !== b.y || tunnels.some(t => t.i === i || t.j === i || t.i === j || t.j === j)) continue;
    let ok = true; for (let k = 0.2; k <= 0.8; k += 0.15) if (roadDist(a.cx + (b.cx - a.cx) * k, a.cz + (b.cz - a.cz) * k) < hw + 3) ok = false;
    if (ok) tunnels.push({ i, j, a: { x: a.cx, z: a.cz }, b: { x: b.cx, z: b.cz }, y: a.y });
  }
  // pedras espalhadas (sólidas) fora das ruas e dos terrenos
  let seed = 1717; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const rocks = [];
  for (let k = 0; k < 140 && rocks.length < 60; k++) {
    const x = HEDGE + 6 + rnd() * (MAP - 2 * HEDGE - 12), z = HEDGE + 6 + rnd() * (MAP - 2 * HEDGE - 12), s = 0.6 + rnd() * 1.1;
    const b = { x0: x - s, x1: x + s, z0: z - s, z1: z + s };
    if (roadDist(x, z) < hw + 3 || blocks.some(r => hit(b, r, 1)) || spots.some(o => hit(b, o.box, 1)) || hit(b, PLAT, 1.5)) continue;
    rocks.push({ x, z, s, box: b });
  }
  return { N, segs, ramps, PLAT, craters, greenhouse, pad, spots, tunnels, rocks, h, level, roadDist };
}
