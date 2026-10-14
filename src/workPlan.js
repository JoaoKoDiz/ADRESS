// Nível 21 (Operário): plano FIXO (área ~8×8): ruas retas conectadas, 2 travessas, fileiras de casas geminadas
// (cada unidade = 1 ponto de entrega, com parede lateral compartilhada) intercaladas com oficinas e pequenos comércios
// (2 unidades de largura). Fileiras de comprimentos variados, com passagens entre elas; pátios de serviço e pracinhas
// no miolo das quadras. Mesmo formato do plano do Bosque (forestPlan.js / FORESTV), com `work: true` e sem patamar.

export const WORK = { RW: 8, SIDE: 1.6, UW: 6.4, UD: 11, WW: 12.8, WD: 15 };

export function planWork(MAP, HEDGE) {
  const { RW, SIDE, UW, UD, WW, WD } = WORK, hw = RW / 2;
  const X = [14, 56, 104.6, 152, 195], Z = [22, 78, 134, 190];
  const P = {}, E = [];
  const node = (x, z) => { const k = x + ',' + z; P[k] = [x, z]; return k; };
  const line = (pts, type = 'side') => { for (let i = 0; i < pts.length - 1; i++) E.push([node(...pts[i]), node(...pts[i + 1]), type]); };
  line([[14, 22], [56, 22], [104.6, 22], [130, 22], [195, 22]]);
  line([[14, 78], [56, 78], [104.6, 78], [130, 78], [152, 78], [195, 78]]);
  line([[14, 134], [56, 134], [78, 134], [104.6, 134], [152, 134], [195, 134]]);
  line([[14, 190], [78, 190], [104.6, 190], [152, 190], [195, 190]]);
  line([[104.6, -4], [104.6, 22], [104.6, 78], [104.6, 134], [104.6, 190]], 'main');
  line([[14, 22], [14, 78], [14, 134], [14, 190]]); line([[195, 22], [195, 78], [195, 134], [195, 190]]);
  line([[56, 22], [56, 78], [56, 134]]); line([[152, 78], [152, 134], [152, 190]]);
  line([[78, 134], [78, 190]], 'lane'); line([[130, 22], [130, 78]], 'lane');   // travessas
  const N = P, segs = E.map(([a, b, type]) => ({ a: P[a], b: P[b], na: a, nb: b, type }));
  const segDist = (x, z, s) => { const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  const roadDist = (x, z) => { let m = 1e9; for (const s of segs) m = Math.min(m, segDist(x, z, s)); return m; };
  const h = () => 0, level = () => 0;
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const clearOfRoads = b => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 6) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 6) if (roadDist(x, z) < hw + SIDE - 0.05) return false; return true; };
  let seed = 2121; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // ---- fileiras: ao longo de cada lado de cada rua; unidades encostadas (paredes compartilhadas), às vezes uma oficina/loja no meio ----
  const spots = [], rows = [];
  for (const sg of segs) {
    if (sg.type === 'main' && sg.a[1] < 0) continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;
      let t = hw + SIDE + 2 + rnd() * 3;
      while (t < len - hw - SIDE - 4) {
        const row = { id: rows.length, spots: [] }, n = 3 + Math.floor(rnd() * 6);
        for (let k = 0; k < n; k++) {
          const wide = rnd() < 0.38 && k > 0, w = wide ? WW : UW, d = wide ? WD : UD;
          if (t + w > len - hw - SIDE - 1) break;
          const c = t + w / 2, off = hw + SIDE + d / 2, px = ax + ux * c + nx * off, pz = az + uz * c + nz * off;
          const hx = Math.abs(ux) > 0.5 ? w / 2 : d / 2, hz = Math.abs(ux) > 0.5 ? d / 2 : w / 2;
          const b = { x0: px - hx, x1: px + hx, z0: pz - hz, z1: pz + hz };
          const ok = b.x0 > HEDGE + 0.6 && b.z0 > HEDGE + 0.6 && b.x1 < MAP - HEDGE - 0.6 && b.z1 < MAP - HEDGE - 0.6 && clearOfRoads(b) &&
            !spots.some(o => hit(b, o.box, -0.05)) && !(Math.abs(px - 104.6) < 20 && pz < 36);
          if (!ok) { if (row.spots.length) break; t += 2; continue; }
          const fx = -nx, fz = -nz, ry = Math.atan2(fx, fz);
          const sp = { px, pz, ry, fx, fz, y: 0, box: b, wide, row: row.id, tags: [] };
          const toW = (x, z) => { const cc = Math.cos(ry), s = Math.sin(ry); return { x: px + x * cc + z * s, z: pz - x * s + z * cc }; };
          const front = d / 2 - (wide ? 6 : 2), q0 = toW(-w / 2, -d / 2), q1 = toW(w / 2, front), ctr = toW(0, -d / 2 + (front + d / 2) / 2), r = toW(wide ? -2 : -1.6, d / 2 - 0.9);
          Object.assign(sp, { cx: ctr.x, cz: ctr.z, door: { x: ax + ux * c + nx * (hw - 1.3), z: az + uz * c + nz * (hw - 1.3) }, res: { x: r.x, z: r.z, ry },
            walkBox: { x0: Math.min(q0.x, q1.x), x1: Math.max(q0.x, q1.x), z0: Math.min(q0.z, q1.z), z1: Math.max(q0.z, q1.z) } });
          spots.push(sp); row.spots.push(sp); t += w;
        }
        if (row.spots.length) rows.push(row);
        t += 3.5 + rnd() * 4;                                                  // passagem entre as fileiras
      }
    }
  }
  // no máximo 112 destinos: tira fileiras inteiras (as que sobram ficam com passagens maiores)
  while (spots.length > 112) {
    const r = rows.splice(Math.floor(rnd() * rows.length), 1)[0];
    for (const sp of r.spots) spots.splice(spots.indexOf(sp), 1);
  }
  const accessLines = spots.map(sp => [{ x: sp.px + sp.fx * 4, z: sp.pz + sp.fz * 4 }, sp.door]);
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const free = (x, z, r, road = hw + SIDE + r + 0.5) => x > HEDGE + r + 1 && z > HEDGE + r + 1 && x < MAP - HEDGE - r - 1 && z < MAP - HEDGE - r - 1 &&
    roadDist(x, z) >= road && !spots.some(o => inR(o.box, x, z, r + 0.6)) && !accessLines.some(([a, b]) => lineDist(x, z, a, b) < r + 1.4) && !(Math.abs(x - 104.6) < 14 && z < 30);
  // ---- miolo das quadras: pracinhas (bancos + árvore + canteiros), pátios de serviço (caixas, paletes, tambores), árvores pontuais ----
  const plazas = [], yards = [], trees = [];
  for (let z = 10; z < MAP - 8; z += 9) for (let x = 10; x < MAP - 8; x += 9) {
    const px = x + (rnd() - 0.5) * 3, pz = z + (rnd() - 0.5) * 3;
    if (!free(px, pz, 6, hw + SIDE + 0.4) || plazas.concat(yards).some(p => Math.hypot(p.x - px, p.z - pz) < 36)) continue;
    (rnd() < 0.5 ? plazas : yards).push({ x: px, z: pz, r: 5 });
  }
  for (let z = 8; z < MAP - 6; z += 11) for (let x = 8; x < MAP - 6; x += 11) {
    const px = x + (rnd() - 0.5) * 5, pz = z + (rnd() - 0.5) * 5;
    if (rnd() < 0.45 || !free(px, pz, 1.2) || plazas.concat(yards).some(p => Math.hypot(p.x - px, p.z - pz) < 7.5)) continue;
    trees.push({ x: px, z: pz, y: 0, s: 0.8 + rnd() * 0.4, type: rnd() < 0.75 ? 'round' : 'tall', color: 'green', k: rnd() });
  }
  for (const p of plazas) trees.push({ x: p.x, z: p.z, y: 0, s: 1.1, type: 'round', color: 'green', k: rnd() });
  const lamps = [], benches = [];
  for (const [x, z] of Object.values(N)) for (const [sx, sz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const px = x + sx * (hw + 0.8), pz = z + sz * (hw + 0.8);
    if (px > HEDGE + 1 && pz > HEDGE + 1 && px < MAP - HEDGE - 1 && pz < MAP - HEDGE - 1 && roadDist(px, pz) > hw + 0.5 && !spots.some(o => inR(o.box, px, pz, 0.4)) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 10)) {
      lamps.push({ x: px, z: pz, y: 0, box: { x0: px - 0.25, x1: px + 0.25, z0: pz - 0.25, z1: pz + 0.25 } }); break;
    }
  }
  for (const p of plazas) for (const a of [0, Math.PI]) benches.push({ x: p.x + Math.cos(a) * 3.2, z: p.z + Math.sin(a) * 3.2, y: 0, ry: a + Math.PI / 2 });
  // ---- trânsito: 4 laços em volta das quadras ----
  const carLoops = [
    [[104.6, 22], [195, 22], [195, 78], [104.6, 78]], [[14, 78], [104.6, 78], [104.6, 134], [14, 134]],
    [[104.6, 134], [104.6, 190], [152, 190], [152, 134]], [[14, 22], [14, 190], [195, 190], [195, 22]],
  ];
  return { work: true, N, segs, ramps: [], MID: null, h, level, spots, trees, lamps, benches, plazas, yards, carLoops, roadDist, free, nodeR: () => hw };
}
