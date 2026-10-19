// Maquete do Bairro 24 (Medieval): o burgo murado do plano real (medievalPlan.js), na escala da maquete.
// Muralha com ameias, torres redondas nos cantos e no meio dos lados, portão com arco entre duas torres no meio do norte;
// três alturas (parte baixa ao norte, patamar do meio com a praça, alto a sudeste com o castelo) com muros de arrimo de pedra
// e as ladeiras do plano; ruas de pedra seguindo os nós reais; casas em fileiras contínuas de frente para as ruas (reboco,
// ocre, rosado, enxaimel e pedra; 1 a 3 andares; telhados de duas águas terracota, castanho, ardósia e vermelho; algumas com
// a empena para a rua), as 4 lojas da praça (padaria, taverna, ferraria, tecelagem), praça do mercado com fonte e barracas,
// largos, depósito, castelo com pátio e poço, jardim junto à muralha sul, hortas, árvores e uma carroça.
// Nada da história secundária (sem igreja, oficina ou personagens).

export const signY = 11;
export const thumb = { dir: [-6, 24, 27], k: 0.8, dy: -0.8 };

export function build(ctx) {
  const { THREE, g, G, box, cyl, cone, sphere, torus, at, mat } = ctx;
  const C = c => {                                                   // cor → cinza da fase bloqueada (pela luminância)
    const n = parseInt(c.slice(1), 16), l = (0.3 * (n >> 16 & 255) + 0.59 * (n >> 8 & 255) + 0.11 * (n & 255)) / 255;
    const v = Math.round(90 + l * 140).toString(16).padStart(2, '0');
    return G(c, '#' + v + v + v);
  };
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const geoCache = new Map(), geo = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };
  const M = (gm, c) => new THREE.Mesh(gm, mat(c));
  const F = (w, h, c) => M(geo(`f${w},${h}`, () => new THREE.PlaneGeometry(w, h)), c);   // detalhe chapado na fachada (frente em +z)
  const SL = (wx, wz, c) => M(geo(`s${wx},${wz}`, () => new THREE.PlaneGeometry(wx, wz).rotateX(-Math.PI / 2)), c);   // água de telhado (só a face de cima)
  const local = (x, z, ry = 0, y = 0) => {
    const gg = new THREE.Group(); gg.position.set(x, y, z); gg.rotation.y = ry; g.add(gg);
    return (m, px, py, pz, rx = 0, ryy = 0, rz = 0) => { gg.add(at(m, px, py, pz, rx, ryy, rz)); return m; };
  };
  let seed = 2424; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---------- paleta ----------
  const STN = '#a39a8a', STN_D = '#857d70', STN_L = '#c9bfab', SLATE = '#5c626a', WOOD_D = '#4b3322', WOOD = '#6e4a2e';
  const GRASS = '#8fa25e', GRASS_D = '#7d9152', COB = '#c2b69d', COB_E = '#8a8274', FLAG = '#cdc2ab', LEAF = ['#5d7b3d', '#6b8a45', '#4e6b34', '#7a8f45'];
  const FAC = ['#efe3c6', '#dcb878', '#dcae9e', '#eadcbc', '#a19a8c', '#efe3c6', '#eadcbc'], ROOFS = ['#b0582f', '#7a4a2a', '#5c626a', '#97382a', '#b0582f', '#a5502c'];
  const DOORS = ['#6b4428', '#3f6b3a', '#2f5a8a', '#8e2e22', '#2b2622'];

  // ---------- escala do plano real (área 258,8 m, centro 129,4) e as três alturas ----------
  const S = 13.6 / 258.8, P = (X, Z) => [+((X - 129.4) * S).toFixed(3), +((Z - 129.4) * S).toFixed(3)];
  const Y0 = 0.42, Y1 = 0.72, Y2 = 1.32;
  const MIDZ = P(0, 70)[1], HIX = P(168, 0)[0], HIZ = P(0, 172)[1];       // −3,12 / 2,03 / 2,24
  const RAMPS = [                                                          // ladeiras do plano (mini): eixo, faixa e alturas
    { x0: P(124.9, 0)[0], x1: P(133.9, 0)[0], z0: P(0, 58)[1], z1: P(0, 82)[1], ax: 'z', h0: Y0, h1: Y1 },
    { x0: P(40, 0)[0], x1: P(49, 0)[0], z0: P(0, 58)[1], z1: P(0, 82)[1], ax: 'z', h0: Y0, h1: Y1 },
    { x0: P(150, 0)[0], x1: P(186, 0)[0], z0: P(0, 186)[1], z1: P(0, 195)[1], ax: 'x', h0: Y1, h1: Y2 },
    { x0: P(222, 0)[0], x1: P(231, 0)[0], z0: P(0, 154)[1], z1: P(0, 190)[1], ax: 'z', h0: Y1, h1: Y2 },
  ];
  const inRamp = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const level = (x, z) => (x >= HIX && z >= HIZ ? 2 : z >= MIDZ ? 1 : 0);
  const hAt = (x, z) => {
    for (const r of RAMPS) if (inRamp(r, x, z)) return r.h0 + (r.h1 - r.h0) * (r.ax === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0));
    return [Y0, Y1, Y2][level(x, z)];
  };

  // ---------- base e terreno em patamares (pedra nas faces, grama em cima) ----------
  add(box(15, 0.3, 15, C('#9c927e')), 0, 0.15, 0);
  add(box(14.8, 0.12, 14.8, C('#7f8d50')), 0, 0.36, 0);                                // gramado de fora (estreito, em volta da muralha)
  const terrace = (x0, x1, z0, z1, y) => {                                             // bloco do patamar: pedra até y, grama em cima
    add(box(x1 - x0, y - Y0, z1 - z0, C(STN)), (x0 + x1) / 2, Y0 + (y - Y0) / 2 - 0.015, (z0 + z1) / 2);
    add(box(x1 - x0, 0.03, z1 - z0, C(GRASS)), (x0 + x1) / 2, y - 0.015, (z0 + z1) / 2);
  };
  const E = 6.8;
  add(box(2 * E, 0.04, 2 * E, C(GRASS)), 0, Y0 - 0.02, 0);                              // chão da parte baixa
  // patamar do meio (z ≥ MIDZ), com os recortes das ladeiras R1 e R2
  const R1 = RAMPS[0], R2 = RAMPS[1], R3 = RAMPS[2], R4 = RAMPS[3];
  terrace(-E, E, R1.z1, E, Y1);
  terrace(-E, R2.x0, MIDZ, R1.z1, Y1); terrace(R2.x1, R1.x0, MIDZ, R1.z1, Y1); terrace(R1.x1, E, MIDZ, R1.z1, Y1);
  // alto (sudeste), com os recortes de R3 (oeste) e R4 (norte)
  const hiTerr = (x0, x1, z0, z1) => terrace(x0, x1, z0, z1, Y2);
  hiTerr(R3.x1, R4.x0, HIZ, E); hiTerr(R4.x1, E, HIZ, E); hiTerr(R4.x0, R4.x1, R4.z1, E);
  hiTerr(HIX, R3.x1, HIZ, R3.z0); hiTerr(HIX, R3.x1, R3.z1, E);
  // ladeiras: rampa de pedra com as muretas dos lados
  for (const r of RAMPS) {
    const along = r.ax === 'z', L = along ? r.z1 - r.z0 : r.x1 - r.x0, Wd = along ? r.x1 - r.x0 : r.z1 - r.z0, dy = r.h1 - r.h0, ang = Math.atan2(dy, L);
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, cy = (r.h0 + r.h1) / 2;
    add(box(along ? Wd : Math.hypot(L, dy), 0.05, along ? Math.hypot(L, dy) : Wd, C(COB)), cx, cy + 0.01, cz, along ? -ang : 0, 0, along ? 0 : ang);
    const wedge = (x0, x1, z0, z1) => {                                                 // muro lateral da ladeira (cunha), lado de fora
      const wl = along ? z1 - z0 : x1 - x0;
      const shp = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(wl, 0), new THREE.Vector2(wl, dy + 0.12), new THREE.Vector2(0, 0.12)]);
      const eg = new THREE.ExtrudeGeometry(shp, { depth: 0.08, bevelEnabled: false });
      const mm = new THREE.Mesh(eg, mat(C(STN_D)));
      if (along) { mm.rotation.y = -Math.PI / 2; mm.position.set(x0 + 0.04, r.h0 - 0.02, z0); }
      else { mm.position.set(x0, r.h0 - 0.02, z0 - 0.04); }
      g.add(mm);
    };
    if (along) { wedge(r.x0 - 0.04, 0, r.z0, r.z1); wedge(r.x1 + 0.04, 0, r.z0, r.z1); }
    else { wedge(r.x0, r.x1, r.z0 - 0.04, 0); wedge(r.x0, r.x1, r.z1 + 0.04, 0); }
  }

  // ---------- ruas de pedra (nós e trechos do plano) ----------
  const NN = {
    g0: [129.4, -4], g1: [129.4, 14], m1: [126.5, 32], m2: [130.2, 48], r1a: [129.4, 55.5], r1b: [129.4, 84.5],
    a1: [100, 31], a2: [72, 28.5], a3: [44.5, 33], a4: [18, 30], b1: [158, 30], b2: [186, 28], b3: [212, 33], b4: [240, 30],
    w1: [44.5, 55.5], w2: [44.5, 84.5], e9: [240, 58],
    c1: [101.4, 104], pn: [129.4, 104], c2: [157.4, 104], pe: [157.4, 130], c3: [157.4, 156], ps: [129.4, 156], c4: [101.4, 156], pw: [101.4, 130],
    mw1: [62, 104], mw3: [42, 131], mw4: [46, 160], mw5: [70, 186], mw6: [101.4, 190], wq: [72, 126.5],
    s2: [129.4, 186], r3a: [147.5, 190.5], r3b: [191, 190.5],
    e2: [190, 101], e3: [226.5, 104], e4: [226.5, 128], r4a: [226.5, 151.5], r4b: [226.5, 196.5], e5: [192, 132], e6: [192, 160],
    h1: [207, 195], h2: [195, 205], h3: [180, 222],
    s3: [101.4, 222], s4: [62, 224], s5: [24, 221], s6: [140, 224], s8: [101.4, 249],
  };
  const N = {}; for (const k in NN) N[k] = P(...NN[k]);
  N.g0 = [N.g0[0], -7.5];                                                              // a rua de fora chega à borda da base
  N.rn = [0, -0.54]; N.rs = [0, 0.54]; N.rw = [-0.54, 0]; N.re = [0.54, 0];
  const EDGES = [
    ['g0', 'g1', 'main'], ['g1', 'm1', 'main'], ['m1', 'm2', 'main'], ['m2', 'r1a', 'main'], ['r1a', 'r1b', 'ramp'], ['r1b', 'pn', 'main'],
    ['c1', 'pn', 'perim'], ['pn', 'c2', 'perim'], ['c2', 'pe', 'perim'], ['pe', 'c3', 'perim'], ['c3', 'ps', 'perim'], ['ps', 'c4', 'perim'], ['c4', 'pw', 'perim'], ['pw', 'c1', 'perim'],
    ['ps', 's2', 'main'], ['s2', 'r3a', 'main'], ['r3a', 'r3b', 'ramp'], ['r3b', 'h1', 'main'], ['h1', 'r4b', 'side'], ['r3b', 'h2', 'side'], ['h2', 'h3', 'side'],
    ['m1', 'a1', 'side'], ['a1', 'a2', 'side'], ['a2', 'a3', 'side'], ['a3', 'a4', 'side'], ['m1', 'b1', 'side'], ['b1', 'b2', 'side'], ['b2', 'b3', 'side'], ['b3', 'b4', 'side'],
    ['a3', 'w1', 'side'], ['w1', 'w2', 'ramp'], ['b4', 'e9', 'side'],
    ['w2', 'mw1', 'side'], ['mw1', 'c1', 'side'], ['mw1', 'mw3', 'side'], ['mw3', 'wq', 'side'], ['wq', 'pw', 'side'], ['mw3', 'mw4', 'side'], ['mw4', 'mw5', 'side'], ['mw5', 'mw6', 'side'],
    ['mw6', 'c4', 'side'], ['mw6', 's2', 'side'],
    ['c2', 'e2', 'side'], ['e2', 'e3', 'side'], ['e3', 'e4', 'side'], ['e4', 'r4a', 'side'], ['r4a', 'r4b', 'ramp'], ['pe', 'e5', 'side'], ['e5', 'e4', 'side'], ['c3', 'e6', 'side'], ['e6', 'e5', 'side'],
    ['mw6', 's3', 'side'], ['s3', 's4', 'side'], ['s4', 's5', 'side'], ['s3', 's6', 'side'], ['s6', 's2', 'side'], ['s4', 'mw5', 'side'], ['s5', 'mw4', 'side'], ['s3', 's8', 'side'],
    ['pn', 'rn', 'spoke'], ['ps', 'rs', 'spoke'], ['pw', 'rw', 'spoke'], ['pe', 're', 'spoke'],
  ];
  const RW = 0.5, segs = EDGES.map(([a, b, type]) => ({ a: N[a], b: N[b], type }));
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return Math.hypot(x - ax - dx * t, z - az - dz * t);
  };
  const roadDist = (x, z) => { let m = Math.abs(Math.hypot(x, z) - 0.54); for (const s of segs) m = Math.min(m, segDist(x, z, s)); return m; };
  const COBM = C(COB), COBE = C(COB_E);
  const roadPiece = (a, b, w) => {                                                       // trecho reto que acompanha a altura (ladeiras)
    const [ax, az] = a, [bx, bz] = b, len = Math.hypot(bx - ax, bz - az); if (len < 0.01) return;
    const n = Math.abs(hAt(bx, bz) - hAt(ax, az)) > 0.01 ? Math.max(1, Math.ceil(len / 0.25)) : 1;
    for (let k = 0; k < n; k++) {
      const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
      const y0 = hAt(x0, z0), y1 = hAt(x1, z1), l = len / n;
      const m = box(w, 0.04, Math.hypot(l, y1 - y0) + 0.02, COBM); m.rotation.order = 'YXZ';
      add(m, (x0 + x1) / 2, (y0 + y1) / 2 + 0.022, (z0 + z1) / 2, -Math.atan2(y1 - y0, l), Math.atan2(x1 - x0, z1 - z0), 0);
    }
  };
  for (const s of segs) {
    if (s.type === 'ramp') continue;                                                     // (a ladeira já tem o piso de pedra)
    roadPiece(s.a, s.b, s.type === 'spoke' ? 0.34 : RW);
  }
  for (const k of Object.keys(N)) if (!['g0', 'rn', 'rs', 'rw', 're'].includes(k)) add(cyl(RW / 2, RW / 2, 0.04, COBM, 7), N[k][0], hAt(...N[k]) + 0.023, N[k][1]);

  // ---------- praça do mercado (patamar do meio): lajes, anel em volta da fonte, fonte, barracas, bancos e árvores ----------
  const PX = 1.26;
  add(box(2 * PX, 0.03, 2 * PX, C(FLAG)), 0, Y1 + 0.015, 0);
  add(cyl(0.76, 0.76, 0.04, COBM, 24), 0, Y1 + 0.025, 0); add(cyl(0.33, 0.33, 0.05, C(FLAG), 18), 0, Y1 + 0.03, 0);
  add(cyl(0.27, 0.29, 0.12, C(STN_L), 12), 0, Y1 + 0.11, 0); add(cyl(0.23, 0.23, 0.03, C('#5f8ea8'), 12), 0, Y1 + 0.16, 0);
  add(cyl(0.045, 0.06, 0.32, C(STN_L), 8), 0, Y1 + 0.3, 0); add(cyl(0.12, 0.05, 0.05, C(STN_L), 8), 0, Y1 + 0.44, 0); add(sphere(0.05, C('#8fc6e8'), 6, 4), 0, Y1 + 0.5, 0);
  const STALL = ['#b8342a', '#2f5a9a', '#d9a62a', '#3f7a46'];
  let si = 0;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (const [x, z, ry] of [[sx * 0.64, sz * 0.96, sz < 0 ? 0 : Math.PI], [sx * 1.04, sz * 0.56, sx < 0 ? Math.PI / 2 : -Math.PI / 2]]) {
      const a = local(x, z, ry, Y1), c = STALL[si++ % 4];
      a(box(0.34, 0.12, 0.16, C('#94693f')), 0, 0.06, 0);
      for (const [px, pc] of [[-0.1, '#d22a24'], [0, '#e8b02a'], [0.1, '#5ea84e']]) a(box(0.08, 0.04, 0.08, C(pc)), px, 0.14, 0.02);
      for (const s2 of [-1, 1]) a(box(0.025, 0.3, 0.025, C(WOOD)), s2 * 0.16, 0.15, -0.07);
      for (let k = 0; k < 3; k++) a(box(0.12, 0.02, 0.26, C(k % 2 ? '#efe1c4' : c)), -0.12 + k * 0.12, 0.3, 0.0, 0.32);
    }
    // árvore e banco na quina de fora
    const tx = sx * 1.06, tz = sz * 1.06;
    add(cyl(0.03, 0.04, 0.22, C(WOOD), 5), tx, Y1 + 0.11, tz); add(sphere(0.19, C(LEAF[(sx + 2 * sz + 4) % 4]), 7, 5), tx, Y1 + 0.33, tz);
    const b = local(sx * 0.62, sz * 0.62, Math.atan2(-sx, -sz), Y1);
    b(box(0.22, 0.04, 0.08, C(STN_L)), 0, 0.06, 0); for (const d of [-0.08, 0.08]) b(box(0.04, 0.05, 0.07, C(STN_D)), d, 0.025, 0);
  }

  // ---------- áreas reservadas (sem casas) ----------
  const R = (x0, z0, x1, z1) => { const [a, b] = P(x0, z0), [c, d] = P(x1, z1); return { x0: a, z0: b, x1: c, z1: d }; };
  const CASTLE = R(196, 214, 238, 250), COURT = R(196, 199, 238, 214), GARDEN = R(169.5, 228, 192, 255), DEPOT = R(162.8, 110, 172.8, 118);
  const LARGOS = [R(233, 52, 247, 66), R(174, 216, 186, 228), R(52, 120, 64, 129)];
  const reserved = [{ x0: -1.5, z0: -1.45, x1: 1.5, z1: 1.45 }, CASTLE, COURT, GARDEN, DEPOT, ...LARGOS, { x0: -1.0, z0: -7, x1: 1.0, z1: -5.9 },
    ...RAMPS.map(r => ({ x0: r.x0 - 0.12, x1: r.x1 + 0.12, z0: r.z0 - 0.12, z1: r.z1 + 0.12 }))];
  const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

  // ---------- casas (fileiras contínuas de frente para as ruas) ----------
  const placed = [];                                                                     // { x, z, ry, w, d } (caixa orientada)
  const corners = (o, m = 0) => { const c = Math.cos(o.ry), s = Math.sin(o.ry), pts = [];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]]) { const lx = u * (o.w / 2 + m), lz = v * (o.d / 2 + m); pts.push([o.x + lx * c + lz * s, o.z - lx * s + lz * c]); }
    return pts; };
  const obbHit = (A, B) => {                                                             // eixos separadores das duas caixas
    for (const o of [A, B]) for (const ang of [o.ry, o.ry + Math.PI / 2]) {
      const ax = Math.cos(ang), az = -Math.sin(ang), pr = q => { const ca = Math.abs(Math.cos(q.ry) * ax - Math.sin(q.ry) * az), sa = Math.abs(Math.sin(q.ry) * ax + Math.cos(q.ry) * az); return q.w / 2 * ca + q.d / 2 * sa; };
      if (Math.abs((A.x - B.x) * ax + (A.z - B.z) * az) > pr(A) + pr(B) - 0.005) return false;
    }
    return true;
  };
  const ok = o => {
    const pts = corners(o), lv = level(o.x, o.z);
    for (const [x, z] of pts) {
      if (Math.abs(x) > E - 0.22 || Math.abs(z) > E - 0.22) return false;
      if (Math.hypot(Math.abs(x) - 7, Math.abs(z) - 7) < 1.05) return false;             // torres dos cantos
      if (Math.abs(x) < 0.5 && Math.abs(Math.abs(z) - 7) < 0.6) return false;
      if (roadDist(x, z) < RW / 2 + 0.03) return false;
      if (reserved.some(r => inRect(r, x, z))) return false;
      if (level(x, z) !== lv) return false;
      for (const [dx, dz] of [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]]) if (level(x + dx, z + dz) !== lv) return false;   // longe da borda do patamar
    }
    return !placed.some(p => obbHit(p, o));
  };
  const house = (o, i, shop = null) => {
    placed.push(o);
    const y = [Y0, Y1, Y2][level(o.x, o.z)], a = local(o.x, o.z, o.ry, y);
    const fl = shop ? 2 : o.fl, H = fl === 1 ? 0.4 : fl === 2 ? 0.66 : 0.9, w = o.w, d = o.d;
    const fac = shop ? shop.fac : FAC[i % FAC.length], timber = !shop && i % 5 === 3, stone = fac === '#a19a8c';
    const rc = shop ? shop.roof : ROOFS[(i * 7 + 3) % ROOFS.length], gableFront = !shop && o.gf;
    // corpo + oitões (pentágono extrudado); andar de cima avançado nas de enxaimel
    const rise = gableFront ? w * 0.55 : d * 0.55, span = gableFront ? w : d, len = gableFront ? d : w;
    const body = M(geo(`h${span},${len},${H},${rise}`, () => {
      const s = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(span / 2, H), new THREE.Vector2(0, H + rise), new THREE.Vector2(-span / 2, H)]);
      const e = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); e.translate(0, 0, -len / 2); if (!gableFront) e.rotateY(Math.PI / 2); return e;
    }), C(fac));
    a(body, 0, 0, 0);
    // telhado: duas águas com beiral
    const th = Math.atan2(rise, span / 2), L = Math.hypot(rise, span / 2) + 0.07;
    if (gableFront) { for (const s of [-1, 1]) a(SL(L, len + 0.08, C(rc)), s * (span / 4 + 0.012), H + rise / 2 + 0.03, 0, 0, 0, -s * th); }
    else { for (const s of [-1, 1]) a(SL(len + 0.08, L, C(rc)), 0, H + rise / 2 + 0.03, s * (span / 4 + 0.012), s * th); }
    if (timber) {                                                                        // enxaimel: vigas escuras na fachada
      for (const px of [-w / 2 + 0.03, 0, w / 2 - 0.03]) a(F(0.035, H, C(WOOD_D)), px, H / 2, d / 2 + 0.004);
      a(F(w, 0.035, C(WOOD_D)), 0, H * 0.55, d / 2 + 0.004);
    }
    if (stone) a(box(w + 0.01, 0.06, d + 0.01, C(STN_D)), 0, 0.03, 0);
    // porta (em arco nas de pedra) e janelinhas acesas
    const dx = (i % 2 ? -1 : 1) * w * 0.22;
    a(F(0.13, 0.22, C(shop ? shop.door : DOORS[i % DOORS.length])), dx, 0.11, d / 2 + 0.005);
    const WIN = C('#ffd88a');
    a(F(0.1, 0.09, WIN), -dx, 0.24, d / 2 + 0.005);
    if (fl > 1) { a(F(0.1, 0.09, WIN), dx, 0.5, d / 2 + 0.005); a(F(0.1, 0.09, WIN), -dx, 0.5, d / 2 + 0.005); }
    if (fl > 2) a(F(0.1, 0.09, WIN), 0, 0.76, d / 2 + 0.005);
    if (!shop && i % 4 === 1) a(box(0.09, rise * 0.9, 0.09, C(STN_D)), w * 0.3, H + rise * 0.55, -d * 0.18);   // chaminé
    if (!shop && i % 6 === 2) a(box(0.16, 0.04, 0.05, C('#c8453a')), -dx, 0.17, d / 2 + 0.03);                   // floreira
    if (shop) shop.extra(a, w, d, H);
  };

  // as 4 lojas da praça (fixas, voltadas para a praça, perto das esquinas)
  const SHOPS = [
    { x: -0.8, z: -2.05, ry: 0, fac: '#eadcbc', roof: '#97382a', door: '#6b4428', name: 'taverna', extra: (a, w, d, H) => {
      a(box(0.03, 0.03, 0.12, C(WOOD_D)), w * 0.42, H * 0.7, d / 2 + 0.06); a(box(0.02, 0.12, 0.1, C('#d9a62a')), w * 0.42, H * 0.7 - 0.08, d / 2 + 0.1);
      for (const px of [-0.3, -0.18]) a(cyl(0.045, 0.045, 0.1, C(WOOD), 8), px, 0.05, d / 2 + 0.07); } },
    { x: 0.8, z: -2.05, ry: 0, fac: '#dcb878', roof: '#b0582f', door: '#8e2e22', name: 'padaria', extra: (a, w, d, H) => {
      for (let k = 0; k < 4; k++) a(box(0.07, 0.02, 0.2, C(k % 2 ? '#efe1c4' : '#c8453a')), -0.11 + k * 0.07, 0.34, d / 2 + 0.08, 0.35);
      a(box(0.12, 0.3, 0.12, C(STN_D)), -w * 0.3, H + 0.2, 0); } },
    { x: 0.8, z: 2.05, ry: Math.PI, fac: '#a19a8c', roof: '#5c626a', door: '#2b2622', name: 'ferraria', extra: (a, w, d, H) => {
      a(box(0.14, 0.42, 0.14, C(STN_D)), w * 0.3, H + 0.2, -0.05); a(box(0.12, 0.08, 0.06, C('#34302d')), -0.24, 0.04, d / 2 + 0.06);
      a(box(0.22, 0.02, 0.18, C(WOOD)), 0.18, 0.28, d / 2 + 0.09, 0.3); } },
    { x: -0.8, z: 2.05, ry: Math.PI, fac: '#dcae9e', roof: '#7a4a2a', door: '#2f5a8a', name: 'tecelagem', extra: (a, w, d, H) => {
      for (const [px, c] of [[-0.12, '#8f6ac4'], [0.0, '#2f5a8a'], [0.12, '#c8453a']]) a(box(0.07, 0.16, 0.01, C(c)), px, H * 0.62, d / 2 + 0.02); } },
  ];
  let hi = 0;
  for (const s of SHOPS) { const o = { x: s.x, z: s.z, ry: s.ry, w: 0.76, d: 0.6, fl: 2 }; house(o, hi++, s); }
  // fileiras: ruas principais primeiro (rua da praça e rua de baixo), depois as outras
  const order = segs.filter(s => s.type === 'main' || s.type === 'perim').concat(segs.filter(s => s.type === 'side'));
  for (const sg of order) {
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az); if (len < 0.6) continue;
    const ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;                                              // normal para o lado das casas
      let t = 0.05;
      while (t < len - 0.3) {
        const fl = rnd() < 0.18 ? 3 : rnd() < 0.5 ? 2 : 1, w = 0.5 + rnd() * 0.22, d = 0.56 + rnd() * 0.1, gf = rnd() < 0.3, off = RW / 2 + 0.05 + d / 2;
        const c = t + w / 2, x = ax + ux * c + nx * off, z = az + uz * c + nz * off, ry = Math.atan2(-nx, -nz);
        const o = { x, z, ry, w, d, fl, gf };
        if (ok(o)) { house(o, hi++); t += w + (rnd() < 0.15 ? 0.18 : 0.0); } else t += 0.12;
      }
    }
  }

  // ---------- muralha: pedra, caminho de ronda, ameias; torres redondas e o portão com arco entre duas torres ----------
  const WT = 0.36, wallTop = (x, z) => [Y0, Y1, Y2][level(Math.max(-6.7, Math.min(6.7, x)), Math.max(-6.7, Math.min(6.7, z)))] + 0.5;
  const STONE = C(STN), STONED = C(STN_D);
  const wallRun = (x0, z0, x1, z1) => {                                                  // trecho reto de muralha (degraus nas mudanças de nível)
    const len = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0), o = alongX ? Math.sign(z0) : Math.sign(x0);
    const pt = t => [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t], topAt = t => { const [x, z] = pt(t); return wallTop(x * 0.97, z * 0.97); };
    const n = Math.max(1, Math.round(len / 0.2)); let k0 = 0;
    for (let k = 1; k <= n; k++) {                                                       // corpo: um bloco por altura
      if (k < n && Math.abs(topAt((k + 0.5) / n) - topAt((k0 + 0.5) / n)) < 0.001) continue;
      const top = topAt((k0 + 0.5) / n), [xa, za] = pt(k0 / n), [xb, zb] = pt(k / n), l = len * (k - k0) / n;
      add(box(alongX ? l + 0.004 : WT, top - 0.3, alongX ? WT : l + 0.004, STONE), (xa + xb) / 2, 0.3 + (top - 0.3) / 2, (za + zb) / 2);
      k0 = k;
    }
    const nm = Math.max(1, Math.round(len / 0.32));
    for (let k = 0; k < nm; k++) {                                                       // ameias do lado de fora
      const t = (k + 0.5) / nm, [x, z] = pt(t), top = topAt(t);
      add(box(alongX ? 0.15 : 0.08, 0.11, alongX ? 0.08 : 0.15, STONE), x + (alongX ? 0 : o * 0.14), top + 0.055, z + (alongX ? o * 0.14 : 0));
    }
    add(box(alongX ? len : 0.05, 0.05, alongX ? 0.05 : len, STONED), (x0 + x1) / 2 + (alongX ? 0 : o * (WT / 2 + 0.01)), 0.33, (z0 + z1) / 2 + (alongX ? o * (WT / 2 + 0.01) : 0));   // rodapé de fora
  };
  const W = 7;
  wallRun(-W, -W, -0.9, -W); wallRun(0.9, -W, W, -W); wallRun(-W, W, W, W); wallRun(-W, -W, -W, W); wallRun(W, -W, W, W);
  const tower = (x, z, r, h, roofed = true, flag = null) => {
    const y0 = 0.3, top = Math.max(wallTop(x * 0.9, z * 0.9) + 0.45, h);
    add(cyl(r, r * 1.08, top - y0, STONE, 12), x, y0 + (top - y0) / 2, z);
    add(cyl(r * 1.1, r * 1.1, 0.06, STONED, 12), x, top - 0.03, z);
    if (roofed) { add(cone(r * 1.2, r * 1.9, C(SLATE), 12), x, top + r * 0.95, z); if (flag) { add(cyl(0.012, 0.012, 0.3, C(WOOD_D), 4), x, top + r * 1.9 + 0.12, z); add(box(0.18, 0.11, 0.01, C(flag)), x + 0.09, top + r * 1.9 + 0.2, z); } }
    else for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4; add(box(0.1, 0.1, 0.1, STONE), x + Math.cos(ang) * r * 0.9, top + 0.05, z + Math.sin(ang) * r * 0.9, 0, -ang, 0); }
    for (let k = 0; k < 2; k++) { const ang = Math.atan2(z, x) + (k - 0.5) * 0.9; add(box(0.03, 0.12, 0.06, C('#2a2622')), x + Math.cos(ang) * r * 1.02, top - 0.35 - k * 0.25, z + Math.sin(ang) * r * 1.02, 0, -ang, 0); }   // seteiras
  };
  for (const [x, z, f] of [[-W, -W, '#a8322a'], [W, -W, '#2f4f8f'], [-W, W, '#2f4f8f'], [W, W, '#a8322a']]) tower(x, z, 0.5, 0, true, f);
  for (const [x, z] of [[-W, -2.4], [-W, 2.6], [W, -2.4], [-3.6, W], [-3.8, -W], [3.8, -W]]) tower(x, z, 0.36, 0, false);
  // portão: duas torres quadradas com ameias, arco e grade, passadiço por cima
  for (const sx of [-1, 1]) {
    const x = sx * 0.62, z = -W;
    add(box(0.58, 1.75, 0.66, STONE), x, 0.3 + 0.875, z);
    add(box(0.64, 0.05, 0.72, STONED), x, 0.3 + 1.75, z);
    for (const [dx, dz] of [[-0.22, -0.26], [0.22, -0.26], [-0.22, 0.26], [0.22, 0.26], [0, -0.26], [0, 0.26]]) add(box(0.13, 0.13, 0.13, STONE), x + dx, 0.3 + 1.84, z + dz);
    add(box(0.12, 0.18, 0.02, C('#2a2622')), x, 0.3 + 1.2, z - 0.34);
    add(cyl(0.012, 0.012, 0.45, C(WOOD_D), 4), x, 0.3 + 2.1, z); add(box(0.24, 0.15, 0.01, C(sx < 0 ? '#a8322a' : '#d9a62a')), x + 0.12, 0.3 + 2.24, z);
  }
  add(box(0.66, 0.42, 0.5, STONE), 0, 0.3 + 1.1, -W);                                      // passadiço sobre o arco
  for (const dx of [-0.24, 0, 0.24]) add(box(0.12, 0.1, 0.1, STONE), dx, 0.3 + 1.36, -W - 0.2);
  for (const dz of [-0.26, 0.25]) add(box(0.06, 0.95, 0.04, C(STN_L)), -0.3, 0.3 + 0.48, -W + dz);
  for (const dz of [-0.26, 0.25]) add(box(0.06, 0.95, 0.04, C(STN_L)), 0.3, 0.3 + 0.48, -W + dz);
  add(box(0.66, 0.08, 0.04, C(STN_L)), 0, 0.3 + 0.88, -W - 0.26);
  for (let k = 0; k < 4; k++) add(box(0.02, 0.32, 0.02, C('#34302d')), -0.18 + k * 0.12, 0.3 + 0.72, -W - 0.2);   // grade levantada

  // ---------- castelo no alto: muralha própria, 4 torres, torre de menagem, portão para o pátio, poço e bandeiras ----------
  {
    const cx = (CASTLE.x0 + CASTLE.x1) / 2, cz = (CASTLE.z0 + CASTLE.z1) / 2, w = CASTLE.x1 - CASTLE.x0 - 0.3, d = CASTLE.z1 - CASTLE.z0 - 0.2, y = Y2;
    add(box(w, 0.75, d, STONE), cx, y + 0.375, cz);
    for (let k = 0; k < 9; k++) for (const s of [-1, 1]) add(box(0.12, 0.1, 0.1, STONE), cx - w / 2 + 0.12 + k * (w - 0.24) / 8, y + 0.8, cz + s * (d / 2 - 0.05));
    for (const [dx, dz, f] of [[-1, -1, '#2f4f8f'], [1, -1, '#a8322a'], [-1, 1, '#a8322a'], [1, 1, '#2f4f8f']]) {
      const x = cx + dx * w / 2, z = cz + dz * d / 2;
      add(cyl(0.3, 0.32, 1.35, STONE, 12), x, y + 0.675, z); add(cyl(0.34, 0.34, 0.05, STONED, 12), x, y + 1.37, z);
      add(cone(0.38, 0.62, C(SLATE), 12), x, y + 1.7, z); add(cyl(0.01, 0.01, 0.28, C(WOOD_D), 4), x, y + 2.1, z); add(box(0.15, 0.09, 0.01, C(f)), x + 0.075, y + 2.16, z);
    }
    add(box(1.0, 2.05, 0.95, C(STN_L)), cx + 0.15, y + 1.025, cz + 0.2);                                  // torre de menagem
    add(box(1.06, 0.05, 1.01, STONED), cx + 0.15, y + 2.07, cz + 0.2);
    for (const [dx, dz] of [[-0.42, -0.4], [0, -0.4], [0.42, -0.4], [-0.42, 0.4], [0, 0.4], [0.42, 0.4], [-0.42, 0], [0.42, 0]]) add(box(0.14, 0.14, 0.14, C(STN_L)), cx + 0.15 + dx, y + 2.16, cz + 0.2 + dz);
    add(cyl(0.18, 0.18, 0.5, C(STN_L), 10), cx + 0.55, y + 2.3, cz - 0.15); add(cone(0.22, 0.45, C(SLATE), 10), cx + 0.55, y + 2.77, cz - 0.15);
    add(cyl(0.012, 0.012, 0.4, C(WOOD_D), 4), cx + 0.15, y + 2.4, cz + 0.2); add(box(0.24, 0.14, 0.01, C('#d9a62a')), cx + 0.27, y + 2.52, cz + 0.2);
    for (const dy of [0.95, 1.35, 1.7]) for (const dx of [-0.25, 0.25]) add(box(0.08, 0.14, 0.012, C('#ffd88a')), cx + 0.15 + dx, y + dy, cz + 0.2 - 0.48);
    // portão do castelo (para o pátio, ao norte) e estandartes
    const gx = P(217, 0)[0];
    add(box(0.5, 0.95, 0.3, STONE), gx, y + 0.475, CASTLE.z0 + 0.1); add(box(0.24, 0.36, 0.02, C('#2a2622')), gx, y + 0.18, CASTLE.z0 - 0.06);
    for (const s of [-1, 1]) add(box(0.12, 0.3, 0.01, C('#2f4f8f')), gx + s * 0.38, y + 0.5, CASTLE.z0 - 0.0);
    // pátio: lajes, poço com telhadinho
    add(box(COURT.x1 - COURT.x0 - 0.2, 0.03, COURT.z1 - COURT.z0, C(FLAG)), (COURT.x0 + COURT.x1) / 2, y + 0.015, (COURT.z0 + COURT.z1) / 2);
    const wx = (COURT.x0 + COURT.x1) / 2 + 0.6, wz = (COURT.z0 + COURT.z1) / 2;
    add(cyl(0.12, 0.13, 0.12, C(STN_L), 10), wx, y + 0.06, wz); add(cyl(0.09, 0.09, 0.02, C('#3f5f78'), 10), wx, y + 0.12, wz);
    for (const s of [-1, 1]) add(box(0.02, 0.24, 0.02, C(WOOD)), wx + s * 0.1, y + 0.2, wz);
    add(cone(0.17, 0.12, C('#7a4a2a'), 4), wx, y + 0.38, wz, 0, Math.PI / 4, 0);
  }

  // ---------- jardim junto à muralha sul: sebes baixas, canteiros floridos, arco de flores, banco e uma árvore ----------
  {
    const { x0, x1, z0, z1 } = GARDEN, y = Y2, cx = (x0 + x1) / 2;
    add(box(x1 - x0, 0.02, z1 - z0, C('#7fa04e')), cx, y + 0.01, (z0 + z1) / 2);
    add(box(0.16, 0.02, z1 - z0, C('#cdbf9e')), cx, y + 0.025, (z0 + z1) / 2);                           // caminho
    for (const s of [-1, 1]) {
      add(box(0.06, 0.1, z1 - z0 - 0.1, C('#4e6b34')), cx + s * (x1 - x0) / 2 - s * 0.05, y + 0.05, (z0 + z1) / 2);
      for (let k = 0; k < 3; k++) {
        const bz = z0 + 0.3 + k * 0.42, bx = cx + s * 0.3;
        add(box(0.3, 0.05, 0.28, C('#6b4a2e')), bx, y + 0.03, bz);
        for (let j = 0; j < 3; j++) add(sphere(0.045, C(['#c8453a', '#e3a63a', '#d77aa0', '#f2ecdc', '#8f6ac4'][(k + j + (s + 1)) % 5]), 5, 4), bx - 0.09 + j * 0.09, y + 0.08, bz);
      }
    }
    for (const s of [-1, 1]) add(box(0.025, 0.3, 0.025, C(WOOD)), cx + s * 0.11, y + 0.15, z0 + 0.06);
    add(torus(0.11, 0.025, C('#5d7b3d'), 4, 8), cx, y + 0.3, z0 + 0.06);
    const bt = [cx + 0.25, z1 - 0.3];
    add(cyl(0.035, 0.05, 0.3, C(WOOD), 5), bt[0], y + 0.15, bt[1]); add(sphere(0.26, C('#5f8a3c'), 8, 6), bt[0], y + 0.44, bt[1]);
    add(box(0.08, 0.04, 0.26, C(STN_L)), x0 + 0.12, y + 0.06, (z0 + z1) / 2);
  }

  // ---------- depósito (pedra, telhado de ardósia) com caixotes ----------
  {
    const { x0, x1, z0, z1 } = DEPOT, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, a = local(cx, cz, -Math.PI / 2, Y1);
    const w = z1 - z0 + 0.05, d = x1 - x0;
    a(box(w, 0.4, d, C(STN_D)), 0, 0.2, 0);
    for (const s of [-1, 1]) a(box(w + 0.06, 0.04, d / 2 + 0.08, C(SLATE)), 0, 0.53, s * d / 4, s * 0.62);
    a(box(0.2, 0.26, 0.012, C(WOOD)), 0, 0.13, d / 2 + 0.005);
    for (let k = 0; k < 2; k++) a(box(0.1, 0.1, 0.1, C('#b08a5a')), -0.2 + k * 0.12, 0.05, d / 2 + 0.1);
  }
  // ---------- largos: lajes, um poço, bancos, uma árvore ----------
  for (const [k, r] of LARGOS.entries()) {
    const y = [Y0, Y1, Y2][level((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)], cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    add(box(r.x1 - r.x0, 0.03, r.z1 - r.z0, C(FLAG)), cx, y + 0.015, cz);
    if (k === 0) { add(cyl(0.1, 0.11, 0.1, C(STN_L), 10), cx, y + 0.05, cz); add(cyl(0.08, 0.08, 0.02, C('#3f5f78'), 10), cx, y + 0.1, cz); }
    else { add(cyl(0.03, 0.04, 0.2, C(WOOD), 5), cx, y + 0.1, cz); add(sphere(0.17, C(LEAF[k]), 7, 5), cx, y + 0.3, cz); }
  }

  // ---------- carroça com cavalo na rua de baixo, barris e feno ----------
  {
    const [x, z] = P(70, 29.5), a = local(x, z, Math.PI / 2 + 0.05, Y0);
    a(box(0.34, 0.08, 0.2, C('#94693f')), -0.1, 0.13, 0); for (const s of [-1, 1]) a(box(0.34, 0.06, 0.02, C(WOOD)), -0.1, 0.19, s * 0.1);
    a(box(0.2, 0.08, 0.16, C('#d9b860')), -0.12, 0.2, 0);
    for (const s of [-1, 1]) a(cyl(0.07, 0.07, 0.02, C(WOOD_D), 8), -0.1, 0.07, s * 0.11, Math.PI / 2, 0, 0);
    a(box(0.16, 0.012, 0.012, C(WOOD)), 0.12, 0.12, 0.05); a(box(0.16, 0.012, 0.012, C(WOOD)), 0.12, 0.12, -0.05);
    a(box(0.2, 0.09, 0.08, C('#7a5232')), 0.28, 0.17, 0); a(box(0.08, 0.1, 0.06, C('#7a5232')), 0.4, 0.23, 0, 0, 0, -0.5);
    for (const [lx, lz] of [[0.2, -0.03], [0.2, 0.03], [0.36, -0.03], [0.36, 0.03]]) a(box(0.025, 0.12, 0.025, C('#5a3a22')), lx, 0.06, lz);
  }

  // ---------- árvores e hortas nos espaços livres (entre os fundos das casas e junto à muralha) ----------
  const freeSpot = (x, z, r) => {
    if (Math.abs(x) > E - r - 0.25 || Math.abs(z) > E - r - 0.25) return false;
    if (roadDist(x, z) < RW / 2 + r + 0.05) return false;
    if (reserved.some(rr => inRect(rr, x, z, r))) return false;
    const lv = level(x, z); for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) if (level(x + dx, z + dz) !== lv) return false;
    const o = { x, z, ry: 0, w: 2 * r, d: 2 * r }; return !placed.some(p => obbHit(p, o));
  };
  let nT = 0, nH = 0;
  for (let k = 0; k < 900 && (nT < 40 || nH < 7); k++) {
    const x = -6.4 + rnd() * 12.8, z = -6.4 + rnd() * 12.8;
    if (nH < 7 && k % 3 === 0 && freeSpot(x, z, 0.3)) {                                 // horta: canteiros de terra com fileiras verdes e cerquinha
      placed.push({ x, z, ry: 0, w: 0.6, d: 0.6 });
      const y = [Y0, Y1, Y2][level(x, z)];
      add(box(0.52, 0.03, 0.52, C('#7a5a3a')), x, y + 0.015, z);
      for (let j = 0; j < 4; j++) add(box(0.44, 0.04, 0.05, C(['#6b8a45', '#8aa64a'][j % 2])), x, y + 0.04, z - 0.18 + j * 0.12);
      for (const s of [-1, 1]) { add(box(0.56, 0.06, 0.015, C('#94693f')), x, y + 0.05, z + s * 0.27); add(box(0.015, 0.06, 0.56, C('#94693f')), x + s * 0.27, y + 0.05, z); }
      nH++;
    } else if (nT < 40 && freeSpot(x, z, 0.2)) {
      placed.push({ x, z, ry: 0, w: 0.3, d: 0.3 });
      const y = [Y0, Y1, Y2][level(x, z)], r = 0.17 + rnd() * 0.08;
      add(cyl(0.025, 0.035, 0.2, C(WOOD), 5), x, y + 0.1, z); add(sphere(r, C(LEAF[nT % 4]), 6, 4), x, y + 0.2 + r * 0.8, z);
      nT++;
    }
  }
}
