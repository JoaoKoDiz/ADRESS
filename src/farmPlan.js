// Nível 15 (Colheita): plano FIXO da região rural, sem grade de quadras. Estradas de terra irregulares formando uma rede
// com bifurcações e laços; propriedades cercadas (terrenos de 28 × 26) viradas para a estrada, cada uma com porteira,
// caminho interno até a construção de entrega (casa, celeiro ou galpão), plantação e extras. No resto do mapa: lavouras,
// pastos e grupos de árvores (decoração, sem entrega). Rotas dos tratores (laços pelas estradas). Tudo é geometria pura.

export const FARM = { RW: 9, PW: 28, PD: 26 };
// pontos locais da propriedade (origem no centro do terreno, frente/porteira para +Z)
export const FARM_LOCAL = {
  bld: { x: -6, z: -4.5 },                 // centro da construção (casa, celeiro ou galpão)
  bldBox: { x0: -11.5, x1: -0.5, z0: -10, z1: 1.2 },
  door: { x: -6, z: 4.6 },                 // ponto de entrega (no caminho, na frente da porta)
  res: { x: -6, z: 2.2 },                  // onde o morador aparece
  gate: { x0: -9.2, x1: -2.8, z: 13 },     // vão da porteira na cerca da frente
  crop: { x0: 2.6, x1: 12.6, z0: -11.6, z1: 5.4 },
  extra: { x0: 2.6, x1: 12.6, z0: 7.2, z1: 11.8 },
};
const R = (x0, z0, x1, z1, extra = {}) => ({ x0, z0, x1, z1, ...extra });

export function planFarm(MAP, HEDGE) {
  const { RW, PW, PD } = FARM, hw = RW / 2, L = FARM_LOCAL;
  const X = 129.4;                                                    // eixo da entrada (centro da borda norte)
  const roads = [
    [[X, -4], [X, 30], [120, 60], [126, 95], [118, 130], [128, 170], [122, 210], [126, 236]],   // espinha norte–sul
    [[120, 60], [80, 52], [40, 64], [26, 100], [34, 140], [60, 152], [118, 130]],               // laço oeste
    [[126, 95], [170, 86], [214, 100], [232, 140], [214, 180], [170, 176], [128, 170]],         // laço leste
    [[34, 140], [30, 190], [60, 228], [122, 210]],                                              // sudoeste
    [[X, 30], [180, 24], [228, 46], [214, 100]],                                                // nordeste
    [[214, 180], [228, 222], [180, 238], [126, 236]],                                           // sudeste
  ];
  const segs = roads.flatMap(r => r.slice(1).map((p, i) => ({ a: r[i], b: p })));
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), x: ax + dx * t, z: az + dz * t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d));
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  // local → mundo, para a frente (fx, fz) ∈ {(0,1),(0,-1),(1,0),(-1,0)}: ry = atan2(fx, fz)
  const toWorld = (sp, x, z) => {
    const c = Math.cos(sp.ry), s = Math.sin(sp.ry);
    return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c };
  };
  const boxW = (sp, b) => {
    const p = [toWorld(sp, b.x0, b.z0), toWorld(sp, b.x1, b.z1)];
    return R(Math.min(p[0].x, p[1].x), Math.min(p[0].z, p[1].z), Math.max(p[0].x, p[1].x), Math.max(p[0].z, p[1].z));
  };
  const inMap = (b, m) => b.x0 > HEDGE + m && b.x1 < MAP - HEDGE - m && b.z0 > HEDGE + m && b.z1 < MAP - HEDGE - m;
  const clearOfRoads = (b, m) => {
    for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 6) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 6)
      if (roadDist(x, z) < hw + m) return false;
    return true;
  };

  // ---- propriedades de entrega: ao longo das estradas, dos dois lados, de frente para a estrada ----
  const spots = [];
  for (const s of segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (let t = 12; t < len - 8; t += 9) for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;
      const ax2 = Math.abs(nx) > Math.abs(nz), fx = ax2 ? -Math.sign(nx) : 0, fz = ax2 ? 0 : -Math.sign(nz);   // frente para a estrada
      for (const off of [hw + 2 + PD / 2, hw + 3.5 + PD / 2, hw + 6 + PD / 2, hw + 9 + PD / 2]) {
        const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off;
        const sp = { px, pz, ry: Math.atan2(fx, fz), fx, fz };
        const area = boxW(sp, R(-PW / 2, -PD / 2, PW / 2, PD / 2));
        if (!inMap(area, 1) || !clearOfRoads(area, 1.2) || spots.some(o => hit(area, o.area, 2.5))) continue;
        if (Math.abs(area.x0 + area.x1 - 2 * X) / 2 < PW / 2 + 8 && area.z0 < 40) continue;   // entrada livre
        sp.area = area;
        const b = toWorld(sp, L.bld.x, L.bld.z), d = toWorld(sp, L.door.x, L.door.z), r = toWorld(sp, L.res.x, L.res.z);
        sp.cx = b.x; sp.cz = b.z; sp.y = 0; sp.door = d; sp.res = { x: r.x, z: r.z, ry: sp.ry };
        sp.box = boxW(sp, L.bldBox);
        const gc = toWorld(sp, (L.gate.x0 + L.gate.x1) / 2, L.gate.z);
        sp.gate = { x: gc.x, z: gc.z, box: boxW(sp, R(L.gate.x0, L.gate.z - 0.3, L.gate.x1, L.gate.z + 0.3)) };
        // cercas (a da frente com o vão da porteira), plantação e extras
        const f = 0.2;
        sp.fences = [R(-PW / 2, PD / 2 - f, L.gate.x0, PD / 2 + f), R(L.gate.x1, PD / 2 - f, PW / 2, PD / 2 + f), R(-PW / 2, -PD / 2 - f, PW / 2, -PD / 2 + f),
          R(-PW / 2 - f, -PD / 2, -PW / 2 + f, PD / 2), R(PW / 2 - f, -PD / 2, PW / 2 + f, PD / 2)].map(q => boxW(sp, q));
        sp.crop = boxW(sp, L.crop);
        sp.extra = boxW(sp, L.extra);
        sp.tags = [];
        spots.push(sp);
        break;
      }
    }
  }
  // ---- decoração: lavouras, pastos e grupos de árvores no resto do mapa ----
  let seed = 515; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const decor = [];
  for (let z = HEDGE + 12; z < MAP - 12; z += 21) for (let x = HEDGE + 12; x < MAP - 12; x += 21) {
    const w = 15 + rnd() * 5, d = 13 + rnd() * 5, cx = x + (rnd() - 0.5) * 3, cz = z + (rnd() - 0.5) * 3;
    const b = R(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2);
    if (!inMap(b, 1.5) || !clearOfRoads(b, 2.5) || spots.some(o => hit(b, o.area, 3)) || decor.some(o => hit(b, o, 2.5))) continue;
    if (Math.abs(cx - X) < 20 && cz < 40) continue;
    const r = rnd();
    decor.push({ ...b, type: r < 0.3 ? 'corn' : r < 0.55 ? 'pasture' : r < 0.8 ? 'trees' : 'orchard', k: decor.length });
  }
  // ---- rotas dos tratores (laços fechados pelas estradas; andam pela direita) ----
  const tractorLoops = [
    [[120, 60], [80, 52], [40, 64], [26, 100], [34, 140], [60, 152], [118, 130], [126, 95]],
    [[126, 95], [170, 86], [214, 100], [232, 140], [214, 180], [170, 176], [128, 170], [118, 130]],
    [[34, 140], [30, 190], [60, 228], [122, 210], [128, 170], [118, 130], [60, 152]],
    [[X, 30], [180, 24], [228, 46], [214, 100], [170, 86], [126, 95], [120, 60]],                 // nordeste
    [[214, 180], [228, 222], [180, 238], [126, 236], [122, 210], [128, 170], [170, 176]],         // sudeste
    [[126, 95], [118, 130], [60, 152], [34, 140], [26, 100], [40, 64], [80, 52], [120, 60]],       // laço oeste no outro sentido
  ];
  return { roads, segs, spots, decor, tractorLoops, roadDist };
}
