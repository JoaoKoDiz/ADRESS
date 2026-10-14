// Nível 24 (Medieval): plano FIXO do burgo murado (área ~10×10, sem grade). Primeiro os caminhos, entradas e áreas de
// manobra (ruas de pedra, praça com anel em volta da fonte, ladeiras, largos, travessas de pedestres, pátio do castelo,
// jardim); depois as construções (pontos de entrega) nas margens das ruas, sem invadir nada reservado.
// Três áreas: parte BAIXA (y 0, ao norte, com o portão da muralha), patamar do MEIO (MID, y 1,4: praça e casas) e o ALTO
// (HIGH, y 5: castelo e jardim junto à muralha). A rua principal vai do portão até a praça (curvas suaves, sobe a ladeira
// R1) e da praça sobe até o castelo pela ladeira longa R3. Alternativas: ladeiras R2 (oeste) e R4 (leste).
// Mesmo formato dos planos com pontos (SPOTS): spots[s] = { px, pz, ry, fx, fz, y, box, walkBox, cx, cz, door, res, … }.

export const MED = { RW: 8, STRIP: 1.3, MIDH: 1.4, HIGHH: 5.0, LW: 9.6, LD: 12, SW: 14, SD: 15 };

export function planMedieval(MAP, HEDGE) {
  const { RW, STRIP, MIDH, HIGHH, LW, LD, SW, SD } = MED, hw = RW / 2, E0 = MAP - HEDGE;
  const MID = { x0: HEDGE, z0: 70, x1: E0, z1: E0 }, HIGH = { x0: 168, z0: 172, x1: E0, z1: E0 };
  const ramps = [
    { id: 'R1', x0: 124.9, x1: 133.9, z0: 58, z1: 82, axis: 'z', h0: 0, h1: MIDH },          // rua principal: baixa → praça
    { id: 'R2', x0: 40, x1: 49, z0: 58, z1: 82, axis: 'z', h0: 0, h1: MIDH },                // oeste (alternativa)
    { id: 'R3', x0: 150, x1: 186, z0: 186, z1: 195, axis: 'x', h0: MIDH, h1: HIGHH },        // rua principal: praça → castelo (longa e suave)
    { id: 'R4', x0: 222, x1: 231, z0: 154, z1: 190, axis: 'z', h0: MIDH, h1: HIGHH },        // leste (alternativa)
  ];
  const F = { x: 129.4, z: 130 };                                         // fonte no centro da praça
  const RING = 10, ISLAND = 6, FOUNT = 3.6;                               // anel da van em volta da fonte; ilha (só a pé); bacia
  const PL = { x0: 105.4, x1: 153.4, z0: 108, z1: 152 };                  // praça (dentro da rua de contorno)
  const N = {
    g0: [129.4, -4], g1: [129.4, 14], m1: [126.5, 32], m2: [130.2, 48], r1a: [129.4, 55.5], r1b: [129.4, 84.5],
    a1: [100, 31], a2: [72, 28.5], a3: [44.5, 33], a4: [18, 30], b1: [158, 30], b2: [186, 28], b3: [212, 33], b4: [240, 30],
    w1: [44.5, 55.5], w2: [44.5, 84.5], e9: [240, 58],
    c1: [101.4, 104], pn: [129.4, 104], c2: [157.4, 104], pe: [157.4, 130], c3: [157.4, 156], ps: [129.4, 156], c4: [101.4, 156], pw: [101.4, 130],
    mw1: [62, 104], mw3: [42, 131], mw4: [46, 160], mw5: [70, 186], mw6: [101.4, 190], wq: [72, 126.5],
    s2: [129.4, 186], r3a: [147.5, 190.5], r3b: [191, 190.5],
    e2: [190, 101], e3: [226.5, 104], e4: [226.5, 128], r4a: [226.5, 151.5], r4b: [226.5, 196.5], e5: [192, 132], e6: [192, 160],
    h1: [207, 195], h2: [195, 205], h3: [180, 222],
    s3: [101.4, 222], s4: [62, 224], s5: [24, 221], s6: [140, 224], s8: [101.4, 249],
    rn: [F.x, F.z - RING], rs: [F.x, F.z + RING], rw: [F.x - RING, F.z], re: [F.x + RING, F.z],
  };
  // anel em volta da fonte: 4 quartos com 3 nós intermediários cada (curva suave)
  const ringPts = [];
  for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + k * Math.PI / 8; const key = ['rn', null, null, null, 're', null, null, null, 'rs', null, null, null, 'rw', null, null, null][k] || 'q' + k; if (!N[key]) N[key] = [F.x + Math.cos(a) * RING, F.z + Math.sin(a) * RING]; ringPts.push(key); }
  const E = [
    ['g0', 'g1', 'main'], ['g1', 'm1', 'main'], ['m1', 'm2', 'main'], ['m2', 'r1a', 'main'], ['r1a', 'r1b', 'ramp'], ['r1b', 'pn', 'main'],
    ['m1', 'a1', 'side'], ['a1', 'a2', 'side'], ['a2', 'a3', 'side'], ['a3', 'a4', 'side'], ['m1', 'b1', 'side'], ['b1', 'b2', 'side'], ['b2', 'b3', 'side'], ['b3', 'b4', 'side'],
    ['a3', 'w1', 'side'], ['w1', 'w2', 'ramp'], ['b4', 'e9', 'side'],
    ['c1', 'pn', 'perim'], ['pn', 'c2', 'perim'], ['c2', 'pe', 'perim'], ['pe', 'c3', 'perim'], ['c3', 'ps', 'perim'], ['ps', 'c4', 'perim'], ['c4', 'pw', 'perim'], ['pw', 'c1', 'perim'],
    ['pn', 'rn', 'spoke'], ['ps', 'rs', 'spoke'], ['pw', 'rw', 'spoke'], ['pe', 're', 'spoke'],
    ['w2', 'mw1', 'side'], ['mw1', 'c1', 'side'], ['mw1', 'mw3', 'side'], ['mw3', 'wq', 'side'], ['wq', 'pw', 'side'], ['mw3', 'mw4', 'side'], ['mw4', 'mw5', 'side'], ['mw5', 'mw6', 'side'],
    ['mw6', 'c4', 'side'], ['ps', 's2', 'main'], ['s2', 'r3a', 'main'], ['r3a', 'r3b', 'ramp'], ['mw6', 's2', 'side'],
    ['c2', 'e2', 'side'], ['e2', 'e3', 'side'], ['e3', 'e4', 'side'], ['e4', 'r4a', 'side'], ['r4a', 'r4b', 'ramp'], ['pe', 'e5', 'side'], ['e5', 'e4', 'side'], ['c3', 'e6', 'side'], ['e6', 'e5', 'side'],
    ['r3b', 'h1', 'main'], ['h1', 'r4b', 'side'], ['r3b', 'h2', 'side'], ['h2', 'h3', 'side'],
    ['mw6', 's3', 'side'], ['s3', 's4', 'side'], ['s4', 's5', 'side'], ['s3', 's6', 'side'], ['s6', 's2', 'side'], ['s4', 'mw5', 'side'], ['s5', 'mw4', 'side'], ['s3', 's8', 'side'],
  ];
  for (let k = 0; k < 16; k++) E.push([ringPts[k], ringPts[(k + 1) % 16], 'ring']);
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
    return inR(HIGH, x, z) ? HIGHH : inR(MID, x, z) ? MIDH : 0;
  };
  const level = (x, z) => (inR(HIGH, x, z) ? 2 : inR(MID, x, z) ? 1 : 0);
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const rampBoxes = ramps.map(r => ({ x0: r.x0 - 1.5, x1: r.x1 + 1.5, z0: r.z0 - 1.5, z1: r.z1 + 1.5 }));

  // ---- áreas reservadas (antes das construções) ----
  const plazaArea = { x0: PL.x0 - hw - 0.5, x1: PL.x1 + hw + 0.5, z0: PL.z0 - hw - 0.5, z1: PL.z1 + hw + 0.5 };
  // quadrantes da praça (só a pé): em L, entre a rua de contorno e o anel; barracas, bancos e árvores ficam aqui
  const ARM = 8, RO = RING + hw;                                           // largura das abas do L; borda de fora do anel
  const quads = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const xe = sx < 0 ? PL.x0 : PL.x1, ze = sz < 0 ? PL.z0 : PL.z1, xi = F.x + sx * (hw + 0.6), zi = F.z + sz * (hw + 0.6);
    const xa = sx < 0 ? xe : xe - ARM, xb = sx < 0 ? xe + ARM : xe, za = sz < 0 ? ze : ze - ARM, zb = sz < 0 ? ze + ARM : ze;
    quads.push({ sx, sz, a: { x0: Math.min(xe, xi), x1: Math.max(xe, xi), z0: za, z1: zb }, b: { x0: xa, x1: xb, z0: Math.min(ze, zi), z1: Math.max(ze, zi) } });
  }
  for (const q of quads) for (const k of ['a', 'b']) {                     // tira o canto que encostaria no anel
    const r = q[k], near = { x: q.sx < 0 ? r.x1 : r.x0, z: q.sz < 0 ? r.z1 : r.z0 };
    if (Math.hypot(near.x - F.x, near.z - F.z) < RO + 0.6) { if (k === 'a') { if (q.sz < 0) r.z1 = Math.min(r.z1, F.z - Math.sqrt(Math.max(0, (RO + 0.6) ** 2 - (near.x - F.x) ** 2))); else r.z0 = Math.max(r.z0, F.z + Math.sqrt(Math.max(0, (RO + 0.6) ** 2 - (near.x - F.x) ** 2))); } else { if (q.sx < 0) r.x1 = Math.min(r.x1, F.x - Math.sqrt(Math.max(0, (RO + 0.6) ** 2 - (near.z - F.z) ** 2))); else r.x0 = Math.max(r.x0, F.x + Math.sqrt(Math.max(0, (RO + 0.6) ** 2 - (near.z - F.z) ** 2))); } }
  }
  // barracas do mercado (alimentos, tecidos, utensílios): nas abas dos quadrantes, de frente para o anel
  const STALL_KINDS = ['food', 'cloth', 'tools', 'food', 'cloth', 'food', 'tools', 'cloth'];
  const stalls = [];
  quads.forEach((q, i) => {
    const A = q.a, B = q.b;
    stalls.push({ kind: STALL_KINDS[i * 2], x: (A.x0 + A.x1) / 2 - q.sx * 2.5, z: (A.z0 + A.z1) / 2, ry: q.sz < 0 ? 0 : Math.PI, w: 4.2 });          // de frente para o anel
    stalls.push({ kind: STALL_KINDS[i * 2 + 1], x: (B.x0 + B.x1) / 2, z: (B.z0 + B.z1) / 2 - q.sz * 3, ry: q.sx < 0 ? Math.PI / 2 : -Math.PI / 2, w: 4.2 });
  });
  const plazaBenches = quads.map(q => ({ x: F.x + q.sx * 18.5, z: F.z + q.sz * 17.5, ry: Math.atan2(-q.sx, -q.sz) }));
  const plazaTrees = quads.map(q => ({ x: F.x + q.sx * 21, z: F.z + q.sz * 19.5 }));
  // castelo (no alto): corpo, torres, portão e pátio da frente; jardim junto à muralha (oeste do alto, com vista para os telhados)
  const castle = { x0: 196, x1: 238, z0: 214, z1: 250, gateX: 217, court: { x0: 196, x1: 238, z0: 199, z1: 214 } };
  const garden = { x0: 169.5, x1: 192, z0: 228, z1: 255, bench: { x: 172.5, z: 240, ry: -Math.PI / 2 }, tree: { x: 186, z: 248 }, kSpot: { x: 175.5, z: 233, ry: -Math.PI / 2 } };
  const largos = [                                                          // largos para estacionar (pavimentados, livres)
    { x0: 233, x1: 247, z0: 52, z1: 66 },                                   // fim da rua leste da parte baixa
    { x0: 174, x1: 186, z0: 216, z1: 228 },                                 // junto ao jardim
    { x0: 52, x1: 64, z0: 120, z1: 129 },                                   // oeste do meio
  ];
  const depot = { x0: 162.8, x1: 172.8, z0: 110, z1: 118, door: { x: 162.1, z: 114 } };   // depósito (não é destino): perto da praça, recuado da rua (calçada livre)
  const gateArea = { x0: 112, x1: 147, z0: -2, z1: 24 };
  // travessas de pedestres (a van não passa: frades nas pontas)
  const alleys = [
    { a: [86, 31], b: [86, 66], w: 3.2 },                                   // da rua da parte baixa até a muralha do patamar (escadinha)
    { a: [172, 30], b: [172, 66], w: 3.2 },
    { a: [80, 104], b: [80, 132], w: 3.0 },                                 // entre as ruas do oeste do meio
    { a: [192, 104], b: [192, 130], w: 3.0 },
  ];
  for (const al of alleys) {                                               // as pontas começam onde termina a calçada (os frades não ficam na pista)
    const P0 = al.a.slice(), P1 = al.b.slice(), at2 = t => [P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t], ok = t => { const [x, z] = at2(t); return roadDist(x, z) >= hw + STRIP; };
    let t0 = 0, t1 = 1; while (t0 < 0.5 && !ok(t0)) t0 += 0.005; while (t1 > 0.5 && !ok(t1)) t1 -= 0.005;
    al.a = at2(t0).map(v => +v.toFixed(2)); al.b = at2(t1).map(v => +v.toFixed(2));
  }
  const alleyBox = al => ({ x0: Math.min(al.a[0], al.b[0]) - al.w / 2 - 0.4, x1: Math.max(al.a[0], al.b[0]) + al.w / 2 + 0.4, z0: Math.min(al.a[1], al.b[1]) - al.w / 2, z1: Math.max(al.a[1], al.b[1]) + al.w / 2 });
  const reserved = [plazaArea, castle, castle.court, garden, depot, gateArea, ...largos, ...alleys.map(alleyBox), ...rampBoxes];

  // ---- construções: lotes ao longo das ruas, de frente para elas; primeiro as 4 lojas fixas (na rua de contorno da praça) ----
  const toW = (sp, x, z) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + x * c + z * s, z: sp.pz - x * s + z * c }; };
  const spots = [];
  const clearOfRoads = (pts, m) => pts.every(p => roadDist(p.x, p.z) >= hw + m);
  let why = '';
  // lotes girados: sobreposição pelo teorema dos eixos separadores (as caixas de eixos podem se sobrepor; os lotes não)
  const corners = sp => [toW(sp, -sp.w / 2, -sp.d / 2), toW(sp, sp.w / 2, -sp.d / 2), toW(sp, sp.w / 2, sp.d / 2), toW(sp, -sp.w / 2, sp.d / 2)];
  function obbHit(A, B, m = 0) {
    const ca = corners(A), cb = corners(B);
    for (const sp of [A, B]) for (const [ax, az] of [[Math.cos(sp.ry), -Math.sin(sp.ry)], [Math.sin(sp.ry), Math.cos(sp.ry)]]) {
      const pa = ca.map(c => c.x * ax + c.z * az), pb = cb.map(c => c.x * ax + c.z * az);
      if (Math.max(...pa) + m <= Math.min(...pb) || Math.max(...pb) + m <= Math.min(...pa)) return false;
    }
    return true;
  }
  function tryLot(sg, t, side, w, d, shop) {
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const nx = -uz * side, nz = ux * side, ry = Math.atan2(-nx, -nz), cr = Math.abs(Math.cos(ry)), sr = Math.abs(Math.sin(ry));
    // a caixa de colisão (eixos) do lote girado não pode chegar na pista: em rua inclinada o lote recua um pouco
    const hxA = cr * w / 2 + sr * d / 2, hzA = sr * w / 2 + cr * d / 2, off = Math.max(hw + STRIP + d / 2, hw + 0.45 + hxA * Math.abs(nx) + hzA * Math.abs(nz));
    const px = ax + ux * t + nx * off, pz = az + uz * t + nz * off;
    const sp = { px, pz, ry, fx: -nx, fz: -nz, w, d, shop: shop || null, seg: segs.indexOf(sg), t, side };
    const cs = corners(sp);
    const box = { x0: Math.min(...cs.map(c => c.x)), x1: Math.max(...cs.map(c => c.x)), z0: Math.min(...cs.map(c => c.z)), z1: Math.max(...cs.map(c => c.z)) };
    why = 'borda'; if (box.x0 < HEDGE + 0.5 || box.z0 < HEDGE + 0.5 || box.x1 > E0 - 0.5 || box.z1 > E0 - 0.5) return null;
    const lv = level(box.x0, box.z0);
    if ([[box.x1, box.z0], [box.x0, box.z1], [box.x1, box.z1], [px, pz]].some(([x, z]) => level(x, z) !== lv)) return null;
    why = 'nivel'; if (lv !== level(ax + ux * t, az + uz * t)) return null;
    for (const P of [MID, HIGH]) if ((box.x0 < P.x0 + 1.2 && box.x1 > P.x0 - 1.2 && box.z1 > P.z0) || (box.z0 < P.z0 + 1.2 && box.z1 > P.z0 - 1.2 && box.x1 > P.x0)) return null;
    // a caixa (eixos) não pode encostar em rua nenhuma (nem na própria: só a faixa de calçada fica na frente)
    // o lote de verdade (girado) fica fora das ruas com a faixa de calçada; a caixa de colisão (eixos) não invade a pista
    const samp = [], abox = []; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { samp.push(toW(sp, -w / 2 + w * i / 6, -d / 2 + d * j / 6)); abox.push({ x: box.x0 + (box.x1 - box.x0) * i / 6, z: box.z0 + (box.z1 - box.z0) * j / 6 }); }
    why = 'rua'; if (!clearOfRoads(samp, STRIP - 0.25) || !clearOfRoads(abox, 0.3)) return null;
    why = 'reservado ' + reserved.findIndex(r => hit(box, r, 0.3)); if (reserved.some(r => hit(box, r, 0.3)) || spots.some(o => obbHit(sp, o, 0.05))) return null;
    sp.y = [0, MIDH, HIGHH][lv]; sp.box = box;
    // construção: casa z ∈ [−3,2; 5] (frente recuada 1 do limite do lote: degrau, vasos, barris, lanterna); loja z ∈ [−4; 5] (+ área de trabalho
    // na frente até 7,5). Quintal nos fundos. Porta: casa em x = −1,4; loja em x = 0. (coordenadas locais; frente para +z)
    const front = d / 2, wallZ = shop ? d / 2 - 2.5 : d / 2 - 1, bd = shop ? 9 : 8.2;
    const c = toW(sp, 0, wallZ - bd / 2), q0 = toW(sp, -w / 2, wallZ - bd), q1 = toW(sp, w / 2, wallZ);
    const doorX = shop ? 0 : -1.4, fr = toW(sp, doorX, front + 0.6), r = toW(sp, doorX + 0.9, wallZ + 0.7);
    Object.assign(sp, { cx: c.x, cz: c.z, walkBox: { x0: Math.min(q0.x, q1.x), x1: Math.max(q0.x, q1.x), z0: Math.min(q0.z, q1.z), z1: Math.max(q0.z, q1.z) },
      door: { x: ax + ux * t + nx * (hw - 1.3), z: az + uz * t + nz * (hw - 1.3) }, front: fr, res: { x: r.x, z: r.z, ry: sp.ry }, doorX, wallZ });
    spots.push(sp); return sp;
  }
  const segBy = (a, b) => segs.find(s => (s.na === a && s.nb === b) || (s.na === b && s.nb === a));
  const place = (a, b, t, side, key) => { const sg = segBy(a, b), sp = tryLot(sg, sg.na === a ? t : Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]) - t, sg.na === a ? side : -side, SW, SD, key); if (!sp) throw new Error('loja sem lugar: ' + key + ' (' + why + ')'); return sp; };
  // padaria e taverna na rua de contorno norte (de frente para a praça, do lado de fora); ferraria e tecidos a oeste e leste
  const shops = {
    bakery: place('c1', 'pn', 13.5, -1, 'bakery'), tavern: place('pn', 'c2', 15, -1, 'tavern'),
    smithy: place('c4', 'pw', 13, -1, 'smithy'), textile: place('pe', 'c3', 14, -1, 'textile'),
  };
  // casas: fileiras com pequenos intervalos (às vezes encostadas), dos dois lados das ruas comuns
  let seed = 2424; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // as ruas viram cadeias (trechos ligados por nós de dobra, grau 2): as fileiras continuam pelas curvas; só os
  // cruzamentos e as pontas ficam livres
  const deg = {}; for (const sg of segs) { deg[sg.na] = (deg[sg.na] || 0) + 1; deg[sg.nb] = (deg[sg.nb] || 0) + 1; }
  const usable = sg => !(sg.type === 'ramp' || sg.type === 'ring' || sg.type === 'spoke' || sg.na === 'g0');
  const used = new Set(), chains = [];
  for (const sg of segs) {
    if (!usable(sg) || used.has(sg)) continue;
    const chain = [{ sg, fwd: true }]; used.add(sg);
    for (const dir of [1, -1]) {                                          // estende para os dois lados pelos nós de grau 2
      let end = dir > 0 ? sg.nb : sg.na;
      for (;;) {
        if (deg[end] !== 2) break;
        const nx = segs.find(o => o !== sg && usable(o) && !used.has(o) && (o.na === end || o.nb === end));
        if (!nx) break;
        used.add(nx);
        const fwd = nx.na === end;
        if (dir > 0) chain.push({ sg: nx, fwd }); else chain.unshift({ sg: nx, fwd: !fwd });
        end = fwd ? nx.nb : nx.na;
      }
    }
    chains.push(chain);
  }
  for (const chain of chains) {
    const parts = chain.map(({ sg, fwd }) => ({ sg, fwd, len: Math.hypot(sg.b[0] - sg.a[0], sg.b[1] - sg.a[1]) }));
    const total = parts.reduce((n, p) => n + p.len, 0);
    const n0 = parts[0].fwd ? parts[0].sg.na : parts[0].sg.nb, n1 = parts.at(-1).fwd ? parts.at(-1).sg.nb : parts.at(-1).sg.na;
    const m0 = deg[n0] === 1 ? 2 : hw + STRIP + 2, m1 = deg[n1] === 1 ? 2 : hw + STRIP + 2;
    const at = u => { let k = 0; while (k < parts.length - 1 && u > parts[k].len) { u -= parts[k].len; k++; } const p = parts[k]; return { p, t: p.fwd ? u : p.len - u }; };
    for (const side of [-1, 1]) {
      let t = m0 + rnd() * 1.5;
      while (t + LW <= total - m1) {
        const { p, t: tl } = at(t + LW / 2);
        const sp = tryLot(p.sg, tl, p.fwd ? side : -side, LW, LD, null);
        t += sp ? LW + (rnd() < 0.4 ? 0 : 0.4 + rnd() * 2.2) : 1.2;
      }
    }
  }
  const houseSpots = spots.filter(s => !s.shop);
  // ---- construções de fundo (NÃO são destinos): celeiros, depósitos de pedra, casinhas e telheiros no miolo dos quarteirões,
  //      atrás das fileiras da rua; dão densidade ao burgo sem confundir as pistas (recuadas, sem porta para a rua, cores apagadas) ----
  const fillers = [];
  const segOf = (x, z) => { let b = null, bd = 1e9; for (const sg of segs) { if (sg.type === 'ring' || sg.type === 'spoke') continue; const d = segDist(x, z, sg).d; if (d < bd) { bd = d; b = sg; } } return b; };
  const fKinds = ['barn', 'stone', 'cottage', 'cottage', 'shed', 'stone', 'barn', 'cottage'];
  const cand = []; for (let z = HEDGE + 6; z < E0 - 5; z += 3.5) for (let x = HEDGE + 6; x < E0 - 5; x += 3.5) cand.push([x + (rnd() - 0.5) * 2, z + (rnd() - 0.5) * 2]);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }   // ordem embaralhada: espalha pelo mapa
  for (const [px, pz] of cand) {
    if (fillers.length >= 110) break;
    if (roadDist(px, pz) < hw + STRIP + 9) continue;
    const kind = fKinds[Math.floor(rnd() * fKinds.length)], w = kind === 'shed' ? 4 + rnd() * 2 : kind === 'barn' ? 8 + rnd() * 3 : 6.5 + rnd() * 3, d = kind === 'shed' ? 3 + rnd() : kind === 'barn' ? 7 + rnd() * 2 : 5.5 + rnd() * 2.5;
    const sg = segOf(px, pz), ux = sg.b[0] - sg.a[0], uz = sg.b[1] - sg.a[1], ry0 = Math.atan2(uz, -ux);   // alinhada com a rua mais perto
    const f = { px, pz, ry: Math.abs(Math.sin(ry0)) > 0.7 ? Math.PI / 2 * Math.sign(Math.sin(ry0)) : (Math.cos(ry0) > 0 ? 0 : Math.PI), w, d, kind, k: rnd() };
    const cs = corners(f), box = { x0: Math.min(...cs.map(c => c.x)), x1: Math.max(...cs.map(c => c.x)), z0: Math.min(...cs.map(c => c.z)), z1: Math.max(...cs.map(c => c.z)) };
    if (box.x0 < HEDGE + 1.5 || box.z0 < HEDGE + 1.5 || box.x1 > E0 - 1.5 || box.z1 > E0 - 1.5) continue;
    if (cs.some(c => roadDist(c.x, c.z) < hw + STRIP + 4.5)) continue;
    const lv = level(px, pz); if (cs.some(c => level(c.x, c.z) !== lv)) continue;
    if ([MID, HIGH].some(P => (box.x0 < P.x0 + 1.8 && box.x1 > P.x0 - 1.8 && box.z1 > P.z0) || (box.z0 < P.z0 + 1.8 && box.z1 > P.z0 - 1.8 && box.x1 > P.x0))) continue;
    if (reserved.some(r => hit(box, r, 1.5)) || spots.some(o => obbHit(f, o, 1.4)) || fillers.some(o => obbHit(f, o, 1.2 + (o.k + f.k) * 0.8))) continue;
    f.y = [0, MIDH, HIGHH][lv]; f.box = box; fillers.push(f);
  }
  // ---- detalhes de lugar: árvores pontuais (quintais, jardim, praça), bancos públicos, lanternas nas esquinas ----
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const access = spots.map(sp => [sp.front, sp.door]);
  const free = (x, z, r, road = hw + STRIP + r) => x > HEDGE + r + 0.8 && z > HEDGE + r + 0.8 && x < E0 - r - 0.8 && z < E0 - r - 0.8 && roadDist(x, z) >= road &&
    !spots.some(o => inR(o.box, x, z, r + 0.2)) && !fillers.some(o => inR(o.box, x, z, r + 0.4)) && !reserved.some(q => inR(q, x, z, r + 0.3)) && !access.some(([a, b]) => lineDist(x, z, a, b) < r + 1.2) &&
    [[r, 0], [-r, 0], [0, r], [0, -r]].every(([a, b]) => level(x + a, z + b) === level(x, z)) &&
    ![MID, HIGH].some(P => (Math.abs(x - P.x0) < r + 1.2 && z > P.z0 - r - 1) || (Math.abs(z - P.z0) < r + 1.2 && x > P.x0 - r - 1));
  const trees = [];
  for (let z = 8; z < MAP - 6; z += 13) for (let x = 8; x < MAP - 6; x += 13) {
    const px = x + (rnd() - 0.5) * 6, pz = z + (rnd() - 0.5) * 6;
    if (rnd() < 0.55 || !free(px, pz, 1.4)) continue;
    trees.push({ x: px, z: pz, y: h(px, pz), s: 0.8 + rnd() * 0.45, type: rnd() < 0.75 ? 'round' : 'tall', color: 'green', k: rnd() });
  }
  for (const t of plazaTrees) trees.push({ x: t.x, z: t.z, y: MIDH, s: 0.95, type: 'round', color: 'green', k: rnd() });
  trees.push({ x: garden.tree.x, z: garden.tree.z, y: HIGHH, s: 1.25, type: 'wide', color: 'green', k: 0.3 });
  const lamps = [];
  for (const [k, [x, z]] of Object.entries(N)) {
    if (k.startsWith('q') || k === 'g0' || ['rn', 'rs', 'rw', 're'].includes(k)) continue;
    for (let i = 0; i < 12; i++) {
      const a = 0.5 + i * Math.PI / 6, px = x + Math.cos(a) * (hw + 1.0), pz = z + Math.sin(a) * (hw + 1.0);
      if (free(px, pz, 0.3, hw + 0.6) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 9) && !trees.some(tr => Math.hypot(tr.x - px, tr.z - pz) < 2)) { lamps.push({ x: px, z: pz, y: h(px, pz), box: { x0: px - 0.25, x1: px + 0.25, z0: pz - 0.25, z1: pz + 0.25 } }); break; }
    }
  }
  const benches = plazaBenches.map(b => ({ ...b, y: MIDH })).concat([{ ...garden.bench, y: HIGHH, stone: true }]);
  // ---- caminhos a pé (moradores): faixas das calçadas dos dois lados de cada rua + travessias nos cruzamentos ----
  const WN = [], WE = [];
  const wnode = (x, z) => { for (let i = 0; i < WN.length; i++) if (Math.hypot(WN[i].x - x, WN[i].z - z) < 0.4) return i; WN.push({ x, z }); return WN.length - 1; };
  const wedge = (i, j) => { if (i !== j) WE.push([i, j]); };
  const ends = {};                                                          // por nó: as pontas de calçada que chegam nele
  const WOFF = hw + 0.55;                                                   // faixa de quem anda: fora da pista, entre o ponto de entrega e as fachadas
  segs.forEach((sg, si) => {
    if (sg.type === 'ramp' && (sg.na === 'w1' || sg.na === 'r4a')) { /* ladeiras laterais: também dá para andar */ }
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    const cut = Math.min(len / 2 - 0.2, sg.type === 'ring' ? 0.2 : hw + 0.8);
    for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side, o = WOFF;                       // (anel: borda de fora = quadrantes; de dentro = ilha da fonte)
      const p0 = wnode(ax + ux * cut + nx * o, az + uz * cut + nz * o), p1 = wnode(bx - ux * cut + nx * o, bz - uz * cut + nz * o);
      wedge(p0, p1); (ends[sg.na] = ends[sg.na] || []).push(p0); (ends[sg.nb] = ends[sg.nb] || []).push(p1);
      sg['w' + side] = [p0, p1];
    }
  });
  for (const [k, list] of Object.entries(ends)) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const A = WN[list[i]], B = WN[list[j]];
    if (Math.hypot(A.x - B.x, A.z - B.z) < 26) wedge(list[i], list[j]);    // travessia (atravessa o cruzamento)
    void k;
  }
  // a ilha da fonte: ponto da bica (para quem busca água) ligado à borda de dentro do anel
  const spout = wnode(F.x, F.z + FOUNT + 0.7);
  for (let i = 0; i < WN.length; i++) if (Math.hypot(WN[i].x - F.x, WN[i].z - F.z) < RING - hw + 1.2 && i !== spout) wedge(i, spout);
  const adj = WN.map(() => []);
  for (const [i, j] of WE) { const d = Math.hypot(WN[i].x - WN[j].x, WN[i].z - WN[j].z); adj[i].push([j, d]); adj[j].push([i, d]); }
  /** Nó de caminhada mais perto de (x, z) (de preferência ligado). */
  function nearestW(x, z) { let b = -1, bd = 1e9; for (let i = 0; i < WN.length; i++) { if (!adj[i].length) continue; const d = Math.hypot(WN[i].x - x, WN[i].z - z); if (d < bd) { bd = d; b = i; } } return b; }
  /** Caminho a pé de (x0, z0) a (x1, z1): [{x, z}, …] pelas calçadas e travessias (Dijkstra). */
  function walkPath(x0, z0, x1, z1) {
    const s = nearestW(x0, z0), g = nearestW(x1, z1), dist = WN.map(() => Infinity), prev = WN.map(() => -1), done = WN.map(() => false);
    dist[s] = 0;
    for (;;) {
      let u = -1, bd = Infinity; for (let i = 0; i < WN.length; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
      if (u < 0 || u === g) break; done[u] = true;
      for (const [v, d] of adj[u]) if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
    }
    const out = []; for (let u = g; u >= 0; u = prev[u]) out.unshift({ x: WN[u].x, z: WN[u].z }); if (!out.length || prev[g] < 0 && g !== s) return [{ x: x0, z: z0 }, { x: x1, z: z1 }];
    return [{ x: x0, z: z0 }, ...out, { x: x1, z: z1 }];
  }
  // ---- colisões do cenário (layout.js): sólidas (van e a pé) e só para a van (vanOnly) ----
  const solids = [], vanOnly = [];
  solids.push({ x0: F.x - 3.0, x1: F.x + 3.0, z0: F.z - 3.0, z1: F.z + 3.0 });                       // bacia da fonte
  vanOnly.push({ x0: F.x - 4.2, x1: F.x + 4.2, z0: F.z - 4.2, z1: F.z + 4.2 });                       // ilha da fonte (a pé)
  for (const q of quads) vanOnly.push({ ...q.a }, { ...q.b });                                        // quadrantes da praça (a pé)
  for (const st of stalls) { const along = Math.abs(Math.sin(st.ry)) > 0.5; st.box = along ? { x0: st.x - 1.3, x1: st.x + 1.3, z0: st.z - st.w / 2, z1: st.z + st.w / 2 } : { x0: st.x - st.w / 2, x1: st.x + st.w / 2, z0: st.z - 1.3, z1: st.z + 1.3 }; solids.push({ ...st.box }); }
  solids.push({ x0: castle.x0, x1: castle.x1, z0: castle.z0, z1: castle.z1 });                       // castelo
  solids.push({ x0: depot.x0, x1: depot.x1, z0: depot.z0, z1: depot.z1 });                           // depósito
  for (const f of fillers) solids.push({ ...f.box });                                                 // construções de fundo
  for (const al of alleys) for (const [x, z] of [al.a, al.b]) {                                        // frades nas pontas das travessas
    const v = Math.abs(al.b[0] - al.a[0]) < Math.abs(al.b[1] - al.a[1]);
    vanOnly.push(v ? { x0: x - al.w / 2, x1: x + al.w / 2, z0: z - 0.3, z1: z + 0.3 } : { x0: x - 0.3, x1: x + 0.3, z0: z - al.w / 2, z1: z + al.w / 2 });
  }
  for (const b of plazaBenches) solids.push({ x0: b.x - 0.9, x1: b.x + 0.9, z0: b.z - 0.9, z1: b.z + 0.9 });
  // ---- carroças: 2 laços largos (parte baixa; contorno da praça) ----
  const P = k => N[k];
  const cartLoops = [['g1', 'm1', 'a1', 'a2', 'a3', 'w1', 'w2', 'mw1', 'c1', 'pn', 'r1b', 'r1a', 'm2', 'm1'].slice(1).map(P), ['c1', 'pn', 'c2', 'pe', 'c3', 'ps', 'c4', 'pw'].map(P)];
  const guard = { a: { x: 121.5, z: 18 }, b: { x: 121.5, z: 40 }, look: { x: 129.4, z: 30 } };
  return {
    medieval: true, N, segs, ramps, MID, HIGH, h, level, spots, houseSpots, shops, trees, lamps, benches, roadDist, free, hw, RW, STRIP,
    F, RING, ISLAND, FOUNT, PL, quads, stalls, plazaBenches, fillers, castle, garden, largos, depot, gateArea, alleys, cartLoops, guard, solids, vanOnly, nodeR: () => hw,
    walk: { nodes: WN, edges: WE, path: walkPath, nearest: nearestW }, MIDH, HIGHH,
  };
}
