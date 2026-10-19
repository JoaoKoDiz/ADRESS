// Nível 21 (Operário): plano FIXO (área 10×10): grade de ruas retas (5 × 5 linhas; 2 trechos a menos formam quadras maiores
// e os trechos das linhas 2 e 4 são travessas), fileiras de casas geminadas ao longo das ruas (cada unidade = 1 ponto de
// entrega, paredes laterais encostadas nas vizinhas, jardinzinho da frente cercado e quintal dos fundos) intercaladas com
// oficinas e pequenos comércios (2 unidades de largura). Fileiras de comprimentos variados, com passagens entre elas; pátios
// de serviço e pracinhas no miolo das quadras. Mesmo formato do plano do Bosque (forestPlan.js / FORESTV), com `work: true`
// e sem patamar.

// RW/SIDE: rua e calçada; UW/UD: unidade (largura × fundo do lote); WW/WD: oficina/comércio; LANE: faixa dos veículos (do eixo).
export const WORK = { RW: 8, SIDE: 1.6, UW: 8, UD: 12, WW: 16, WD: 16, LANE: 2 };
// Unidade (coordenadas locais, centro do lote na origem, frente em +z): quintal dos fundos z −6…−4,2; casa −4,2…2,8;
// jardim da frente 2,8…6 (cerca em 5,75). Porta e portão em x = DX. Oficina (fundo 16): prédio −6,6…2; pátio aberto 2…8.
export const UNIT = { ZB: -4.2, ZF: 2.8, DX: -1.9 };
export const SHOPW = { ZB: -6.6, ZF: 2.0, DX: 3.6 };
const MAX_UNITS = 120, MAX_WIDE = 20;          // casas (ROWS) e oficinas/comércios (WSHS) disponíveis em data.js

let CACHE = null;                                   // (o plano é fixo: calculado uma vez — os arredores somam colisões a `cuts`)
export function planWork(MAP, HEDGE) {
  if (CACHE && CACHE.MAP === MAP && CACHE.HEDGE === HEDGE) return CACHE;
  return (CACHE = makePlan(MAP, HEDGE));
}
function makePlan(MAP, HEDGE) {
  const { RW, SIDE, UW, UD, WW, WD } = WORK, hw = RW / 2;
  const C = MAP / 2, E = MAP - 22, L = [22, (22 + C) / 2, C, (C + E) / 2, E].map(v => Math.round(v * 10) / 10);
  const P = {}, Ed = [];
  const node = (x, z) => { const k = x + ',' + z; P[k] = [x, z]; return k; };
  const line = (pts, type = 'side') => { for (let i = 0; i < pts.length - 1; i++) Ed.push([node(...pts[i]), node(...pts[i + 1]), type]); };
  for (const z of L) line(L.map(x => [x, z]));                                         // ruas leste–oeste (as das fileiras)
  line([[C, -4], [C, L[0]]], 'main'); line(L.map(z => [C, z]), 'main');                // avenidinha da entrada (norte → sul)
  for (const x of [L[0], L[4]]) line(L.map(z => [x, z]));                              // ruas das bordas
  line([[L[1], L[0]], [L[1], L[1]], [L[1], L[2]]], 'lane'); line([[L[1], L[3]], [L[1], L[4]]], 'lane');   // travessas (falta um trecho:
  line([[L[3], L[0]], [L[3], L[1]]], 'lane'); line([[L[3], L[2]], [L[3], L[3]], [L[3], L[4]]], 'lane');   //  quadras maiores)
  const N = P, segs = Ed.map(([a, b, type]) => ({ a: P[a], b: P[b], na: a, nb: b, type }));
  const segDist = (x, z, s) => { const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
  const roadDist = (x, z) => { let m = 1e9; for (const s of segs) m = Math.min(m, segDist(x, z, s)); return m; };
  const h = () => 0, level = () => 0;
  const hit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const clearOfRoads = b => { for (let x = b.x0; x <= b.x1 + 0.01; x += (b.x1 - b.x0) / 6) for (let z = b.z0; z <= b.z1 + 0.01; z += (b.z1 - b.z0) / 6) if (roadDist(x, z) < hw + SIDE - 0.05) return false; return true; };
  let seed = 2121; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // ---- fileiras: ao longo de cada lado de cada rua (primeiro as leste–oeste); unidades encostadas, às vezes uma oficina/loja ----
  const spots = [], rows = [];
  let nWide = 0;
  const ordered = segs.filter(s => s.a[1] === s.b[1]).concat(segs.filter(s => s.a[1] !== s.b[1]));
  for (const sg of ordered) {
    if (sg.a[1] < 0) continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const side of [-1, 1]) {
      const nx = -uz * side, nz = ux * side;
      let t = hw + SIDE + 0.6 + rnd() * 1.6;
      while (t < len - hw - SIDE - UW) {
        const row = { id: rows.length, spots: [], ew: uz === 0 }, n = 3 + Math.floor(rnd() * 4);
        for (let k = 0; k < n; k++) {
          const wide = k > 0 && nWide < MAX_WIDE && rnd() < 0.2, w = wide ? WW : UW, d = wide ? WD : UD;
          if (t + w > len - hw - SIDE - 0.6) break;
          const c = t + w / 2, off = hw + SIDE + d / 2, px = ax + ux * c + nx * off, pz = az + uz * c + nz * off;
          const hx = Math.abs(ux) > 0.5 ? w / 2 : d / 2, hz = Math.abs(ux) > 0.5 ? d / 2 : w / 2;
          const b = { x0: px - hx, x1: px + hx, z0: pz - hz, z1: pz + hz };
          const fx = -nx, fz = -nz, ry = Math.atan2(fx, fz);
          const toW = (x, z) => { const cc = Math.cos(ry), s = Math.sin(ry); return { x: px + x * cc + z * s, z: pz - x * s + z * cc }; };
          const DX = wide ? SHOPW.DX : UNIT.DX, door = toW(DX, d / 2 + SIDE + 1.3);   // na rua, na faixa do lado da casa, em frente ao portão
          const ok = b.x0 > HEDGE + 0.6 && b.z0 > HEDGE + 0.6 && b.x1 < MAP - HEDGE - 0.6 && b.z1 < MAP - HEDGE - 0.6 && clearOfRoads(b) &&
            !spots.some(o => hit(b, o.box, -0.05) || Math.hypot(o.door.x - door.x, o.door.z - door.z) < 5.6) && !(Math.abs(px - C) < 20 && pz < 36);
          if (!ok) { if (row.spots.length) break; t += 2; continue; }
          const sp = { px, pz, ry, fx, fz, y: 0, box: b, wide, row: row.id, tags: [], door };
          const zb = wide ? SHOPW.ZB : UNIT.ZB, zf = wide ? SHOPW.ZF : UNIT.ZF;
          const q0 = toW(-w / 2, zb), q1 = toW(w / 2, zf), ctr = toW(0, (zb + zf) / 2), r = toW(DX, d / 2 - 0.9);
          Object.assign(sp, { cx: ctr.x, cz: ctr.z, res: { x: r.x, z: r.z, ry },
            walkBox: { x0: Math.min(q0.x, q1.x), x1: Math.max(q0.x, q1.x), z0: Math.min(q0.z, q1.z), z1: Math.max(q0.z, q1.z) } });
          if (wide) nWide++;
          spots.push(sp); row.spots.push(sp); t += w;
        }
        if (row.spots.length) rows.push(row);
        t += 3.5 + rnd() * 4;                                                  // passagem entre as fileiras
      }
    }
  }
  // no máximo MAX_UNITS casas: primeiro saem as casas soltas (fileira de 1) e parte das fileiras das ruas norte–sul; depois as
  // fileiras mais compridas perdem a unidade da ponta (toda rua leste–oeste continua com casas; as passagens ficam maiores)
  const units = () => spots.filter(s => !s.wide).length;
  const drop = (r, sp) => { spots.splice(spots.indexOf(sp), 1); r.spots.splice(r.spots.indexOf(sp), 1); if (!r.spots.length) rows.splice(rows.indexOf(r), 1); };
  for (const r of rows.slice()) if (r.spots.length === 1 && !r.spots[0].wide && units() > MAX_UNITS) drop(r, r.spots[0]);
  while (units() > MAX_UNITS + 12) {
    const ns = rows.filter(r => !r.ew && r.spots.some(s => !s.wide));
    if (!ns.length) break;
    const r = ns[Math.floor(rnd() * ns.length)];
    for (const sp of r.spots.slice()) drop(r, sp);
  }
  while (units() > MAX_UNITS) {
    const ends = r => [r.spots[r.spots.length - 1], r.spots[0]].filter(s => !s.wide);
    const cand = rows.filter(r => r.spots.length > 2 && ends(r).length);
    if (!cand.length) break;
    const most = Math.max(...cand.map(r => r.spots.length));
    const pick = cand.filter(r => r.spots.length === most), r = pick[Math.floor(rnd() * pick.length)];
    drop(r, ends(r)[0]);
  }
  const accessLines = spots.map(sp => [{ x: sp.px + sp.fx * 4, z: sp.pz + sp.fz * 4 }, sp.door]);
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const free = (x, z, r, road = hw + SIDE + r + 0.5) => x > HEDGE + r + 1 && z > HEDGE + r + 1 && x < MAP - HEDGE - r - 1 && z < MAP - HEDGE - r - 1 &&
    roadDist(x, z) >= road && !spots.some(o => inR(o.box, x, z, r + 0.6)) && !accessLines.some(([a, b]) => lineDist(x, z, a, b) < r + 1.4) && !(Math.abs(x - C) < 14 && z < 30);
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
  return { work: true, MAP, HEDGE, cuts: [], N, segs, ramps: [], MID: null, h, level, spots, trees, lamps, benches, plazas, yards, roadDist, free, nodeR: () => hw };
}
