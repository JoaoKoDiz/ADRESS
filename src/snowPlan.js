// Nível 16 (Nevasca): plano FIXO da vila nevada (área ~8×8, sem grade). Três alturas: baixa (0), patamar do meio
// (MID, altura 3) e patamar alto (HIGH, altura 6), ligados por 4 ladeiras suaves (a van sobe; 3 em 24). Ruas sinuosas em
// rede, com caminhos alternativos (2 ladeiras para cada patamar). Atalhos fechados por montes de neve que o limpa-neve
// abre por um tempo (nunca são o único acesso a uma casa). Placas de gelo em ruas secundárias, curvas e numa ladeira.
// Casas (lote normal 17.2 com quintal e cerca) mais espaçadas, de frente para a rua. Tudo é geometria pura.
import { obbBox } from './obb.js';

export const SNOW = { MIDH: 3, HIGHH: 6, RW: 8 };

/** Altura na ladeira r a u do pé (u ao longo da subida): reta no meio e concordância em parábola nas duas pontas (RAMP_EASE),
 *  sem quina no pé nem no alto (a van e o limpa-neve não "batem" a frente ao entrar na subida). */
const RAMP_EASE = 4;
export function rampH(r, u) {
  const L = r.axis === 'z' ? r.z1 - r.z0 : r.x1 - r.x0, b = Math.min(RAMP_EASE, L / 3), s = 1 / (L - b);
  u = Math.max(0, Math.min(L, u));
  const v = u < b ? s * u * u / (2 * b) : u > L - b ? 1 - s * (L - u) * (L - u) / (2 * b) : s * (u - b / 2);
  return r.h0 + (r.h1 - r.h0) * v;
}

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
  // nós nas pontas de cada ladeira (o de baixo e o de cima) e o lado de cada ponta que fica fora da ladeira (a·x + b·z ≤ c):
  // o desenho corta ali o disco do cruzamento e a rua que chega (models/snow.js)
  const rampsInfo = ramps.map(r => {
    const s = segs.find(q => q.type === 'ramp' && (q.a[0] + q.b[0]) / 2 > r.x0 && (q.a[0] + q.b[0]) / 2 < r.x1 && (q.a[1] + q.b[1]) / 2 > r.z0 && (q.a[1] + q.b[1]) / 2 < r.z1);
    const lowA = r.axis === 'z' ? s.a[1] < s.b[1] : s.a[0] < s.b[0];
    return { r, bottom: lowA ? s.na : s.nb, top: lowA ? s.nb : s.na,
      keepBottom: r.axis === 'z' ? [0, 1, r.z0] : [1, 0, r.x0], keepTop: r.axis === 'z' ? [0, -1, -r.z1] : [-1, 0, -r.x1] };
  });
  const segDist = (x, z, s) => {
    const [ax, az] = s.a, [bx, bz] = s.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    return { d: Math.hypot(x - ax - dx * t, z - az - dz * t), t, x: ax + dx * t, z: az + dz * t };
  };
  const roadDist = (x, z) => Math.min(...segs.map(s => segDist(x, z, s).d));
  const inR = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const h = (x, z) => {
    for (const r of ramps) if (inR(r, x, z)) return rampH(r, r.axis === 'z' ? z - r.z0 : x - r.x0);
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
        const c = toW(sp, 0, -3.6), d = toW(sp, 0, 11.4), r = toW(sp, 0, 6.8);
        Object.assign(sp, { cx: c.x, cz: c.z, door: d, res: { x: r.x, z: r.z, ry: sp.ry },
          walkBox: obbBox((x, z) => toW(sp, x, z), sp.ry, -4.5, -7.1, 4.5, -0.1) });
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
  for (const p of ice) { const L = Math.hypot(p.seg.b[0] - p.seg.a[0], p.seg.b[1] - p.seg.a[1]), m = (hw + 0.5) / L; p.t0 = Math.max(p.t0, m); p.t1 = Math.min(p.t1, 1 - m); }   // fora dos cruzamentos
  const ICE_HALF = hw - 0.3;                                              // metade da largura visível da placa (a área de efeito é a mesma)
  const ICE_TR = 2.4;                                                     // nas pontas, o gelo vai afinando (desenho e efeito juntos) em ~2,4
  for (const p of ice) p.L = Math.hypot(p.seg.b[0] - p.seg.a[0], p.seg.b[1] - p.seg.a[1]);
  const iceAt = (x, z) => {
    let w = 0;
    for (const p of ice) {
      const q = segDist(x, z, p.seg); if (q.d >= ICE_HALF || q.t < p.t0 || q.t > p.t1) continue;
      const d = Math.min(q.t - p.t0, p.t1 - q.t) * p.L / ICE_TR, k = d >= 1 ? 1 : d * d * (3 - 2 * d);
      if (k > w) w = k;
    }
    return w;
  };
  // ---- atalhos (montes de neve no meio) e a rota do limpa-neve (passa pelos dois atalhos) ----
  // (o monte fica no meio do atalho; se ali o atalho ainda corre colado a outra rua — o de n3 sai de n3 quase junto da
  //  secundária n3–n2 —, ele vai para o primeiro ponto onde a caixa do monte não toca nenhuma outra rua: fecha só o atalho)
  const cuts = segs.filter(s => s.type === 'cut').map(s => {
    const others = segs.filter(o => o !== s), clear = (x, z) => { for (const dx of [-5.2, 0, 5.2]) for (const dz of [-5.2, 0, 5.2]) if (others.some(o => segDist(x + dx, z + dz, o).d < hw + 0.2)) return false; return true; };
    let t = 0.5;
    for (const c of [0.5, 0.55, 0.45, 0.6, 0.4, 0.65, 0.7, 0.75, 0.8, 0.83, 0.86]) { const x = s.a[0] + (s.b[0] - s.a[0]) * c, z = s.a[1] + (s.b[1] - s.a[1]) * c; if (clear(x, z)) { t = c; break; } }
    const mx = s.a[0] + (s.b[0] - s.a[0]) * t, mz = s.a[1] + (s.b[1] - s.a[1]) * t;
    return { seg: s, x: mx, z: mz, y: h(mx, mz), ry: Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]), box: { x0: mx - 5.2, x1: mx + 5.2, z0: mz - 5.2, z1: mz + 5.2 } };
  });
  const P = k => N[k];
  const plowLoop = ['n1', 'n2', 'n3', 'n14', 'n13', 'n12', 'n11', 'n10', 'n9', 'n20', 'n19', 'n11', 'n12', 'n13', 'n14'].map(P);
  // portas e caminhos de entrega (da frente do lote até o ponto da porta na rua) + o caminho do Grillby's (ponto 5) ficam livres
  const accessLines = spots.map(sp => [toW(sp, 0, 7.5), sp.door]);
  if (spots[5]) accessLines.push([toW(spots[5], 3.3, 3.6), toW(spots[5], 3.3, 15.5)]);
  const lineDist = (x, z, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
  const blocksAccess = (x, z, r) => accessLines.some(([a, b]) => lineDist(x, z, a, b) < r + 1.0) || spots.some(sp => Math.hypot(sp.door.x - x, sp.door.z - z) < r + 2.2);
  // ---- decoração: grupos de pinheiros fora das ruas e das casas ----
  let seed = 161; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pines = [];
  for (let z = HEDGE + 8; z < MAP - 8; z += 13) for (let x = HEDGE + 8; x < MAP - 8; x += 13) {
    const px = x + (rnd() - 0.5) * 5, pz = z + (rnd() - 0.5) * 5, b = { x0: px - 1.6, x1: px + 1.6, z0: pz - 1.6, z1: pz + 1.6 };
    if (rnd() < 0.35 || oneLevel(b) < 0 || !clearOfRoads(b, 2.5) || spots.some(o => hit(b, o.box, 1.5)) || rampBoxes.some(r => hit(b, r, 2))) continue;
    if (Math.abs(px - 104.6) < 14 && pz < 30) continue;
    if (blocksAccess(px, pz, 2.4)) continue;
    pines.push({ x: px, z: pz, y: h(px, pz), s: 0.9 + rnd() * 0.6, box: b });
  }
  // ---- postes (um por cruzamento) e montes de neve nas beiradas: sempre na margem, fora de qualquer pista, rampa, lote,
  //      porta ou caminho de entrega, no mesmo patamar da rua (nunca em cima do muro) ----
  const free = (x, z, r, ref) => x > HEDGE + r + 1 && z > HEDGE + r + 1 && x < MAP - HEDGE - r - 1 && z < MAP - HEDGE - r - 1 &&
    roadDist(x, z) >= hw + r + 0.3 && Math.abs(h(x, z) - ref) < 0.01 && level(x, z) === level(x + r, z) && level(x, z) === level(x - r, z) && level(x, z) === level(x, z + r) && level(x, z) === level(x, z - r) &&
    !rampBoxes.some(q => inR(q, x, z, r + 1)) && !spots.some(o => inR(o.box, x, z, r + 0.4)) && !blocksAccess(x, z, r + 1.2) && !cuts.some(c => inR(c.box, x, z, r + 1));
  const lamps = [];
  for (const [x, z] of Object.values(N).slice(1)) {
    const ref = h(x, z);
    for (let k = 0; k < 16; k++) {
      const a = 0.4 + k * Math.PI / 8, px = x + Math.cos(a) * (hw + 1.4), pz = z + Math.sin(a) * (hw + 1.4);
      if (free(px, pz, 0.35, ref) && !pines.some(p => Math.hypot(p.x - px, p.z - pz) < 2.4) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 4)) { lamps.push({ x: px, z: pz, y: ref, box: { x0: px - 0.3, x1: px + 0.3, z0: pz - 0.3, z1: pz + 0.3 } }); break; }
    }
  }
  const mounds = [];
  for (const s of segs) {
    if (s.type === 'ramp') continue;
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), nx = Math.cos(ry), nz = -Math.sin(ry);
    for (let t = 4; t < len - 3; t += 7) for (const sd of [-1, 1]) {
      const cx = ax + (bx - ax) * t / len, cz = az + (bz - az) * t / len, px = cx + nx * sd * (hw + 1.35), pz = cz + nz * sd * (hw + 1.35);
      if (free(px, pz, 1.0, h(cx, cz)) && !lamps.some(l => Math.hypot(l.x - px, l.z - pz) < 2) && !pines.some(p => Math.hypot(p.x - px, p.z - pz) < 2.2)) mounds.push({ x: px, z: pz, y: h(px, pz), ry });
    }
  }
  // ---- arredores: a vila numa clareira do bosque, ligada ao lugar. A estrada de acesso cruza uma estrada de serra
  //      (leste–oeste, limpa, com montes de neve das máquinas, balizas e postes de luz) que entra no bosque dos dois lados;
  //      uma trilha de neve batida contorna a sebe (a van dá a volta na vila) e dela saem caminhos até cabanas, uma casa
  //      de sítio com celeiro e um lago congelado. Ao norte, dois campos cercados (fardos sob a neve) entre a sebe e a
  //      estrada. Pinheiros nevados em grupos (tronco sólido, layout.js), árvores sem folhas e arbustos de neve (models/snow.js:
  //      buildSnowOutskirts, colisão em world.js). Livres: a faixa da trilha, a estrada de acesso e o pátio em frente à
  //      entrada (onde a van para na cena do monstro). O bosque fechado mais longe é só cenário. ----
  const C0 = 104.6, RING = 5.4, OJ = -60;
  const lanes = [                                                        // caminhos de neve batida (largura 4,2), da trilha até cada casa
    { w: 4.2, pts: [[-RING, 96], [-22, 98], [-40, 93], [-50, 88]] },
    { w: 3.2, pts: [[-22, 98], [-26, 116], [-31, 128]] },                // até o lago
    { w: 4.2, pts: [[MAP + RING, 60], [MAP + 24, 62], [MAP + 37, 60]] },
    { w: 4.2, pts: [[64, MAP + RING], [62, MAP + 24], [57, MAP + 38]] },
    { w: 3.6, pts: [[150, MAP + RING], [153, MAP + 22], [156, MAP + 28]] },
    { w: 3.6, pts: [[50, OJ - 3.5], [50, OJ - 14]] },                     // entradas das cabanas do outro lado da estrada
    { w: 3.6, pts: [[164, OJ - 3.5], [164, OJ - 15]] },
  ];
  // casas de fora (só cenário): x, z, frente (+x / −x / +z / −z), tipo
  const cabins = [
    { x: -58, z: 87, face: 'x+', type: 'log', w: 7.5, d: 6 },
    { x: MAP + 47, z: 57, face: 'x-', type: 'farm', w: 10, d: 7.5 },
    { x: MAP + 46, z: 80, face: 'z-', type: 'barn', w: 9, d: 12 },
    { x: 46, z: MAP + 46, face: 'x+', type: 'red', w: 7, d: 5.5 },
    { x: 69, z: MAP + 49, face: 'x-', type: 'mustard', w: 6.5, d: 5.5 },
    { x: 156, z: MAP + 36, face: 'z-', type: 'log', w: 6.5, d: 5.5 },
    { x: 50, z: OJ - 21, face: 'z+', type: 'red', w: 7.5, d: 6 },
    { x: 164, z: OJ - 22, face: 'z+', type: 'mustard', w: 7.5, d: 6 },
  ];
  for (const c of cabins) { const ax = c.face[0] === 'x', hx = (ax ? c.d : c.w) / 2 + 0.4, hz = (ax ? c.w : c.d) / 2 + 0.4; c.box = { x0: c.x - hx, x1: c.x + hx, z0: c.z - hz, z1: c.z + hz }; }
  const pond = { x: -40, z: 140, rx: 15, rz: 10 };
  const fields = [{ x0: 14, x1: 84, z0: -50, z1: -16, gate: 'x1' }, { x0: 125, x1: 196, z0: -50, z1: -16, gate: 'x0' }];
  const bales = [[30, -40], [34.2, -40.4], [32, -37], [150, -24], [154, -23.4]];
  const lineDist2 = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const laneDist = (x, z) => { let d = 1e9; for (const l of lanes) for (let i = 0; i < l.pts.length - 1; i++) d = Math.min(d, lineDist2(x, z, l.pts[i], l.pts[i + 1]) - l.w / 2); return d; };
  const edgeD = (x, z) => Math.hypot(Math.max(-x, 0, x - MAP), Math.max(-z, 0, z - MAP));
  // ocupado (para árvores e arbustos de fora): estradas, trilha, caminhos, casas, lago, campos e o pátio da entrada
  const outBusy = (x, z, r) => {
    const d = edgeD(x, z);
    if (d < RING + 2.5 + 2 + r) return true;                              // a trilha em volta da sebe (e a faixa até ela)
    if (z < 0 && Math.abs(x - C0) < (z > -100 ? 34 : 12) + r) return true; // estrada de acesso e pátio da entrada
    if (Math.abs(z - OJ) < 3.5 + 4 + r) return true;                      // estrada que cruza (com os montes e as balizas)
    if (Math.abs(z - (OJ - 6.5)) < 1.2 + r && x > -260 && x < MAP + 260) return true;   // postes de luz
    if (laneDist(x, z) < 2.2 + r) return true;
    if (cabins.some(c => x > c.box.x0 - 4 - r && x < c.box.x1 + 4 + r && z > c.box.z0 - 4 - r && z < c.box.z1 + 4 + r)) return true;
    if (Math.hypot((x - pond.x) / (pond.rx + 4 + r), (z - pond.z) / (pond.rz + 4 + r)) < 1) return true;
    if (fields.some(f => x > f.x0 - 2 - r && x < f.x1 + 2 + r && z > f.z0 - 2 - r && z < f.z1 + 2 + r)) return true;
    return false;
  };
  let s3 = 4111; const r3 = () => (s3 = (s3 * 16807) % 2147483647) / 2147483647;
  const outOk = (x, z) => { const d = edgeD(x, z); return d >= 11 && d <= 74 && !outBusy(x, z, 1.6); };
  for (let c = 0; c < 60; c++) {
    let cx = 0, cz = 0, ok = false;
    for (let t = 0; t < 40 && !ok; t++) { cx = -74 + r3() * (MAP + 148); cz = -74 + r3() * (MAP + 148); ok = outOk(cx, cz); }
    if (!ok) continue;
    const n = 3 + Math.floor(r3() * 6);
    for (let i = 0; i < n; i++) {
      const a = r3() * Math.PI * 2, d = Math.sqrt(r3()) * 9, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (!outOk(x, z) || pines.some(p => Math.hypot(p.x - x, p.z - z) < 3.4)) continue;
      pines.push({ x, z, y: 0, s: 0.95 + r3() * 0.75, box: { x0: x - 1.6, x1: x + 1.6, z0: z - 1.6, z1: z + 1.6 }, out: true });
    }
  }
  // árvores sem folhas (bétulas e carvalhos no inverno) e arbustos cobertos de neve: perto das casas, nos caminhos e na
  // beira do bosque; cada um com tronco sólido (world.js)
  const bare = [], shrubs = [];
  const near = (x, z, list, m) => list.some(p => Math.hypot(p.x - x, p.z - z) < m) || pines.some(p => Math.hypot(p.x - x, p.z - z) < m + 1.5);
  for (let k = 0, t = 0; k < 46 && t < 4000; t++) {
    const x = -70 + r3() * (MAP + 140), z = -70 + r3() * (MAP + 140), d = edgeD(x, z);
    if (d < 12 || d > 70 || r3() > Math.exp(-d / 40) + 0.15 || outBusy(x, z, 2.2) || near(x, z, bare, 6)) continue;
    bare.push({ x, z, s: 0.85 + r3() * 0.5, birch: r3() < 0.45, rot: r3() * 6.28 }); k++;
  }
  for (const c of cabins) for (let k = 0; k < 2; k++) {                  // uma ou duas junto de cada casa (fora do caminho e da estrada)
    const a = r3() * 6.28, x = c.x + Math.cos(a) * 11, z = c.z + Math.sin(a) * 11;
    if (edgeD(x, z) < 11 || laneDist(x, z) < 3 || Math.abs(z - OJ) < 9 || cabins.some(o => x > o.box.x0 - 3 && x < o.box.x1 + 3 && z > o.box.z0 - 3 && z < o.box.z1 + 3) || near(x, z, bare, 5)) continue;
    bare.push({ x, z, s: 0.9 + r3() * 0.4, birch: r3() < 0.5, rot: r3() * 6.28 });
  }
  for (let k = 0, t = 0; k < 70 && t < 5000; t++) {
    const x = -60 + r3() * (MAP + 120), z = -60 + r3() * (MAP + 120), d = edgeD(x, z);
    if (d < 11 || d > 60 || outBusy(x, z, 1.2) || near(x, z, shrubs, 3) || near(x, z, bare, 3)) continue;
    shrubs.push({ x, z, s: 0.7 + r3() * 0.6, rot: r3() * 6.28 }); k++;
  }
  const outside = { RING, OJ, ORW: 7, lanes, cabins, pond, fields, bales, bare, shrubs, laneDist };
  return { N, segs, ramps, MID, HIGH, h, level, spots, ice, iceAt, ICE_HALF, ICE_TR, cuts, plowLoop, pines, lamps, mounds, roadDist, outside, rampsInfo };
}
