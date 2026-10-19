// Maquete do Bairro 22 (Bosque): ruas curvas de asfalto no meio de um bosque de outono denso,
// grupos de casas em clareiras, patamar baixo no sudeste com ladeira, chão de folhas.
export const signY = 9;
export const thumb = { dir: [-6, 22, 25], k: 0.9, dy: -0.3 };

export function build(ctx) {
  const { THREE, g, add, G, box, cone, sphere, cyl, at, mat, ROADC } = ctx;
  const Y = 0.4, PH = 0.55;                              // topo do chão; altura do patamar
  const C = (c, gc = '#9e9e9e') => G(c, gc);
  let seed = 22;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---- base: barranco, chão de outono (sem grama verde) e sebe outonal
  add(box(15, 0.3, 15, C('#8a6a44', '#a8a8a8')), 0, 0.15, 0);
  add(box(14, 0.08, 14, C('#b3a458', '#b0b0b0')), 0, 0.36, 0);
  for (const [x, z, w, d] of [[0, -7, 14.4, 0.6], [0, 7, 14.4, 0.6], [-7, 0, 0.6, 14.4], [7, 0, 0.6, 14.4]]) {
    if (z === -7) { add(box(6.0, 0.8, d, C('#5f6a2c', '#7a7a7a')), -3.9, 0.6, z); add(box(6.0, 0.8, d, C('#5f6a2c', '#7a7a7a')), 4.3, 0.6, z); continue; }   // abertura da entrada
    add(box(w, 0.8, d, C('#5f6a2c', '#7a7a7a')), x, 0.6, z);
  }
  // pilares da entrada
  for (const x of [-0.85, 1.25]) add(box(0.45, 1.0, 0.45, C('#9c8f7a', '#9a9a9a')), x, 0.8, -7);

  // ---- patamar baixo (sudeste): bloco de terra com muro de pedra e topo de grama seca
  const P = { x0: 2.3, x1: 6.7, z0: 2.7, z1: 6.7 };
  const pw = P.x1 - P.x0, pd = P.z1 - P.z0, pcx = (P.x0 + P.x1) / 2, pcz = (P.z0 + P.z1) / 2;
  add(box(pw, PH, pd, C('#9c8f7a', '#a0a0a0')), pcx, Y + PH / 2, pcz);
  add(box(pw, 0.04, pd, C('#a99a52', '#b4b4b4')), pcx, Y + PH + 0.02, pcz);
  const onPlat = (x, z, m = 0) => x > P.x0 - m && x < P.x1 + m && z > P.z0 - m && z < P.z1 + m;
  const hAt = (x, z) => (onPlat(x, z) ? Y + PH + 0.04 : Y);

  // ---- ruas (asfalto, faixa central tracejada) — trechos guardados para afastar árvores e casas
  const SEGS = [];
  const ASPH = ROADC, DASH = C('#f2d45c', '#c8c8c8'), W = 1.0;
  const road = (pts, y = Y) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
      add(box(W, 0.05, len, ASPH), (ax + bx) / 2, y + 0.025, (az + bz) / 2, 0, ry, 0);
      SEGS.push([ax, az, bx, bz]);
      for (let t = 0.35; t < len - 0.2; t += 0.9) add(box(0.06, 0.012, 0.3, DASH), ax + (bx - ax) * t / len, y + 0.056, az + (bz - az) * t / len, 0, ry, 0);
    }
    for (const [x, z] of pts) add(cyl(W / 2, W / 2, 0.05, ASPH, 8), x, y + 0.026, z);
  };
  const A = [0.2, -4.6], B = [-2.0, 0.0], R0 = [3.8, 0.9], R1 = [3.8, 2.7];
  road([[0.2, -6.75], A, [-1.4, -2.6], B, [-1.1, 2.4], [0.9, 3.4], [1.3, 5.3]]);    // principal: entrada → sul
  road([A, [2.6, -3.6], [4.4, -1.6], [4.2, R0[1]], R0]);                                           // trecho pelo mato até a ladeira
  road([B, [-4.4, 0.6], [-5.6, 3.0], [-4.2, 5.2], [-2.0, 5.3], [-1.1, 2.4]]);                    // laço do oeste
  road([[-1.4, -2.6], [-4.0, -3.4], [-5.4, -5.2]]);                                                 // ramal sem saída (noroeste)
  add(cyl(0.85, 0.85, 0.05, ASPH, 14), -5.4, Y + 0.027, -5.2); add(cyl(0.8, 0.8, 0.05, ASPH, 14), 1.3, Y + 0.027, 5.3);                                    // balão
  // ladeira (sobe para o norte do patamar) e rua em cima do patamar
  { const len = R1[1] - R0[1], ang = Math.atan2(PH, len);
    add(box(W, 0.05, Math.hypot(len, PH), ASPH), 3.8, Y + PH / 2 + 0.03, (R0[1] + R1[1]) / 2, -ang, 0, 0);
    SEGS.push([R0[0], R0[1], R1[0], R1[1]]);
    for (const s of [-1, 1]) add(box(0.1, 0.22, Math.hypot(len, PH), C('#8a7f6c', '#8f8f8f')), 3.8 + s * 0.58, Y + PH / 2 + 0.12, (R0[1] + R1[1]) / 2, -ang, 0, 0);   // muretas da ladeira
  }
  road([[3.8, 2.75], [4.2, 4.3], [5.4, 4.9]], Y + PH + 0.04);
  add(cyl(0.8, 0.8, 0.05, ASPH, 14), 5.4, Y + PH + 0.067, 4.9);
  const dSeg = (x, z, [ax, az, bx, bz]) => {
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    return Math.hypot(x - ax - vx * t, z - az - vz * t);
  };
  const dRoad = (x, z) => Math.min(...SEGS.map(s => dSeg(x, z, s)), Math.hypot(x + 5.4, z + 5.2) - 0.35, Math.hypot(x - 5.4, z - 4.9) - 0.3, Math.hypot(x - 1.3, z - 5.3) - 0.3);
  const nearest = (x, z) => {                             // ponto da rua mais perto (para virar a fachada)
    let best = null, bd = 1e9;
    for (const [ax, az, bx, bz] of SEGS) {
      const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
      const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
      if (d < bd) { bd = d; best = [px, pz]; }
    }
    return best;
  };

  // ---- casas (grupos em clareiras, fachada e porta para a rua mais perto)
  const HOUSES = [[-3.4, -1.8, 0], [-3.3, 2.6, 1], [-6.0, 5.6, 2], [0.7, 1.2, 3], [2.6, -5.6, 4], [-0.6, 5.9, 5], [5.6, 3.5, 6], [3.3, 5.7, 0], [6.0, -3.6, 2]];
  const WALLS = ['#f3e6c8', '#e8d6b0', '#d9c7a8', '#efe3cf', '#e3cba4'];
  const ROOFS = ['#7a3a2a', '#5f646c', '#8a552a', '#3f5f4a', '#a8432e', '#6b4a3a', '#4a5a6e'];
  const WD = C('#9a6a3c', '#8a8a8a');
  const homes = [];
  for (const [x, z, i] of HOUSES) {
    const [rx, rz] = nearest(x, z), ry = Math.atan2(rx - x, rz - z), y = hAt(x, z);
    homes.push([x, z]);
    const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.y = ry; g.add(h);
    const a = (m, px, py, pz, rx2 = 0, ry2 = 0, rz2 = 0) => h.add(at(m, px, py, pz, rx2, ry2, rz2));
    const ww = 1.25, wd = 1.0, wh = 0.72;
    a(box(ww, wh, wd, C(WALLS[i % WALLS.length], '#cfcfcf')), 0, wh / 2, 0);
    // telhado de duas águas (cumeeira paralela à fachada)
    const sh = new THREE.Shape(); sh.moveTo(-wd / 2 - 0.14, 0); sh.lineTo(wd / 2 + 0.14, 0); sh.lineTo(0, 0.52); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: ww + 0.2, bevelEnabled: false }); geo.translate(0, 0, -(ww + 0.2) / 2);
    const rm = new THREE.Mesh(geo, mat(C(ROOFS[i % ROOFS.length], '#8c8c8c'))); rm.rotation.y = Math.PI / 2; rm.position.y = wh; rm.castShadow = rm.receiveShadow = true; h.add(rm);
    a(box(0.22, 0.42, 0.04, C('#6b4428', '#5c5c5c')), 0.25, 0.21, wd / 2 + 0.01);                          // porta
    a(box(0.28, 0.22, 0.04, C('#ffe2a0', '#c8c8c8')), -0.3, 0.42, wd / 2 + 0.01);                           // janela acesa
    a(box(0.6, 0.04, 0.32, WD), 0.15, 0.03, wd / 2 + 0.16);                                                  // varandinha de madeira
    a(box(0.16, 0.34, 0.16, C('#8a7f6c', '#8a8a8a')), -0.4, wh + 0.32, -0.15);                              // chaminé
    // caminho até a rua
    const dist = Math.hypot(rx - x, rz - z) - W / 2 - wd / 2 - 0.3;
    if (dist > 0.05) a(box(0.26, 0.02, dist, C('#c8b89a', '#b8b8b8')), 0.25, 0.012, wd / 2 + 0.32 + dist / 2);
    // pilha de folhas ou abóbora ao lado da porta (detalhe de outono)
    if (i % 2) a(cone(0.2, 0.16, C('#e0841e', '#9a9a9a'), 6), 0.62, 0.08, wd / 2 + 0.3);
    else a(sphere(0.09, C('#e8761a', '#9a9a9a'), 6, 4), -0.62, 0.08, wd / 2 + 0.22);
  }

  // ---- árvores de outono: grade com sorteio, fora das ruas, casas, ladeira e borda do patamar
  const T = { orange: ['#ec7f22', '#de6c18', '#f39236'], gold: ['#eaa82a', '#f2bb3a', '#d99424'], yellow: ['#e8c23a', '#f2d24e'], red: ['#c63a24', '#d24a2c', '#b3301e'], brown: ['#9a6232', '#a8703e'], green: ['#5e8f3a', '#6c9a40'] };
  const pick = () => { const r = rnd(); return r < 0.32 ? T.orange : r < 0.55 ? T.gold : r < 0.7 ? T.red : r < 0.82 ? T.yellow : r < 0.94 ? T.brown : T.green; };
  const trees = [];
  const CLEAR = [[-0.3, -1.4], [-4.9, 3.6], [1.1, -4.0], [-2.7, 0.7], [2.0, 4.2]];   // bancos e postes
  const okTree = (x, z, r) => {
    if (Math.abs(x) > 6.45 - r * 0.4 || Math.abs(z) > 6.45 - r * 0.4) return false;
    if (dRoad(x, z) < W / 2 + 0.15 + r * 0.55) return false;
    for (const [hx, hz] of homes) if (Math.hypot(x - hx, z - hz) < 1.15 + r * 0.7) return false;
    const inP = onPlat(x, z), nearEdge = onPlat(x, z, 0.35) && !onPlat(x, z, -0.35);
    if (nearEdge) return false;                                                      // nem no muro do patamar
    if (!inP && x > 3.0 && x < 4.6 && z > 0.6 && z < 2.9) return false;            // ladeira
    if (x > -1.2 && x < 1.7 && z < -6.0) return false;                             // portal da entrada
    for (const [cx, cz] of CLEAR) if (Math.hypot(x - cx, z - cz) < 0.45 + r * 0.6) return false;
    for (const t of trees) if (Math.hypot(x - t[0], z - t[1]) < (r + t[2]) * 0.72) return false;
    return true;
  };
  for (let gz = -6.3; gz <= 6.4; gz += 0.74) for (let gx = -6.3; gx <= 6.4; gx += 0.74) {
    const x = gx + (rnd() - 0.5) * 0.6, z = gz + (rnd() - 0.5) * 0.6, big = rnd() < 0.3, r = big ? 0.55 + rnd() * 0.15 : 0.32 + rnd() * 0.16;
    if (okTree(x, z, r)) trees.push([x, z, r]);
  }
  for (const [x, z, r] of trees) {
    const y = hAt(x, z), cols = pick(), th = 0.35 + r * 0.6, kind = rnd();
    if (cols === T.green && kind < 0.5) {                                             // pinheirinho escuro de vez em quando
      add(cyl(0.05, 0.07, th, C('#5b3b22', '#6a6a6a'), 5), x, y + th / 2, z);
      add(cone(r * 0.8, r * 2.0, C('#3a6b42', '#7f7f7f'), 6), x, y + th + r * 0.9, z);
      continue;
    }
    const birch = kind > 0.88;
    add(cyl(0.05, 0.08, th, C(birch ? '#e6dfcf' : '#6b4526', birch ? '#bdbdbd' : '#6a6a6a'), 4), x, y + th / 2, z);
    const cy = y + th + r * 0.7;
    add(sphere(r, C(cols[0], '#8a8a8a'), 6, 4), x, cy, z);
    if (r > 0.42) add(sphere(r * 0.62, C(cols[1 % cols.length], '#999999'), 5, 3), x + r * 0.45, cy + r * 0.25, z + r * 0.3);
  }
  // tapetes de folhas sob algumas copas e folhas soltas nas margens das ruas
  const LEAF = ['#c9762a', '#d08a34', '#b8692a', '#e0841e', '#c63a24', '#eaa82a'];
  trees.forEach(([x, z, r], i) => {
    if (i % 3) return;
    const y = hAt(x, z), rr = r * 1.15;
    if (dRoad(x, z) < W / 2 + rr + 0.05 || (onPlat(x, z, rr) && !onPlat(x, z, -rr))) return;
    add(cyl(rr, rr, 0.02, C(LEAF[i % LEAF.length], '#a5a5a5'), 9), x, y + 0.012 + (i % 4) * 0.003, z);
  });
  let nLeaf = 0;
  for (const [ax, az, bx, bz] of SEGS) {
    const len = Math.hypot(bx - ax, bz - az);
    for (let t = 0.2; t < len; t += 0.75) {
      const s = rnd() < 0.5 ? -1 : 1, nx = -(bz - az) / len, nz = (bx - ax) / len, o = W / 2 + 0.08 + rnd() * 0.2;
      const x = ax + (bx - ax) * t / len + nx * o * s, z = az + (bz - az) * t / len + nz * o * s;
      if (Math.abs(x) > 6.5 || Math.abs(z) > 6.5 || dRoad(x, z) < W / 2 + 0.04) continue;
      if (onPlat(x, z, 0.15) !== onPlat(x, z, -0.15)) continue;
      add(box(0.16, 0.012, 0.12, C(LEAF[nLeaf++ % LEAF.length], '#a5a5a5')), x, hAt(x, z) + 0.008, z, 0, rnd() * 3, 0);
    }
  }
  // bancos e postes antigos em dois pontos
  for (const [x, z] of [[-0.3, -1.4], [-4.9, 3.6]]) {
    const [rx, rz] = nearest(x, z), ry = Math.atan2(rx - x, rz - z);
    const b = new THREE.Group(); b.position.set(x, Y, z); b.rotation.y = ry; g.add(b);
    b.add(at(box(0.6, 0.05, 0.2, WD), 0, 0.18, 0)); b.add(at(box(0.6, 0.16, 0.04, WD), 0, 0.3, -0.09));
    for (const s of [-1, 1]) b.add(at(box(0.04, 0.16, 0.18, C('#3a3d44', '#666666')), s * 0.26, 0.08, 0));
  }
  for (const [x, z] of [[1.1, -4.0], [-2.7, 0.7], [2.0, 4.2]]) {
    add(cyl(0.035, 0.05, 1.2, C('#2f3d32', '#666666'), 5), x, Y + 0.6, z);
    add(box(0.16, 0.16, 0.16, C('#ffe2a0', '#cccccc')), x, Y + 1.26, z);
  }
}
