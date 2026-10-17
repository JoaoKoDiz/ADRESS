// Nível 16 (Nevasca): casa nevada (o lote normal do jogo, centrado e com neve só na parte de cima do telhado — a cor do
// telhado, a porta e o quintal continuam visíveis), cenário fixo (patamares com muros de pedra, ruas, ladeiras, gelo,
// pinheiros, postes acesos, montes de neve nas beiradas), o monte de neve dos atalhos e o limpa-neve.
import * as THREE from 'three';
import { box, cyl, cone, sphere, torus, at, mat, bakeStatic } from './kit.js';
import { buildLot } from './house.js';
import { LOT, LOT_ANCHORS as A } from '../layout.js';
import { SNOW } from '../snowPlan.js';
import { SNOW_EXTRAS, SNOW_SCARF, SNOW_DROP } from '../data.js';

const SNOWC = '#eef3f7', SNOW2 = '#dfe7ee', STONE = '#8f8b85', STONE2 = '#a29d95', ASPH = '#5b616b', ICE = '#a9d8f2';
const GRASS_TO_SNOW = { '95cc68': SNOWC, '74ab4b': SNOW2 };

/** Casa do lote normal, centrada na origem (frente +Z), com neve no quintal e no alto do telhado. */
export function buildSnowLot(h, opts) {
  const wrap = new THREE.Group();
  const ok = k => !SNOW_DROP.includes(k), hw = { ...h, f: h.f.filter(ok), yardItems: h.yardItems.filter(ok), roofItems: h.roofItems.filter(ok) };   // sem os itens de verão
  const lot = buildLot(hw, opts); lot.position.set(-LOT / 2, 0, -LOT / 2); wrap.add(lot);
  lot.traverse(o => { if (o.isMesh && o.material && o.material.color) { const k = GRASS_TO_SNOW[o.material.color.getHexString()]; if (k) o.material = mat(k); } });
  // neve no alto das duas águas (só a metade de cima: a cor do telhado continua aparecendo embaixo)
  const HS = A.house, HZ = (HS.z0 + HS.z1) / 2, HALF = (HS.z1 - HS.z0) / 2, th = Math.atan2(A.roofRise, HALF);
  const ridgeY = 0.12 + A.wallHeight + A.roofRise + 0.32, W = HS.x1 - HS.x0 + 2 * A.roofOverhang, l = (HALF / Math.cos(th)) * 0.48;
  const snow = new THREE.Group(); snow.position.set(-LOT / 2, 0, -LOT / 2); wrap.add(snow);
  for (const sgn of [1, -1]) snow.add(at(box(W - 0.2, 0.16, l, SNOWC), (HS.x0 + HS.x1) / 2, ridgeY - Math.sin(th) * l / 2, HZ + sgn * Math.cos(th) * l / 2, sgn * th, 0, 0));
  snow.add(at(box(W - 0.2, 0.22, 0.5, SNOWC), (HS.x0 + HS.x1) / 2, ridgeY + 0.04, HZ));
  winterExtras(snow, SNOW_EXTRAS[h.index] || [], HS, hw.yardItems.length);                // boneco de neve, trenó, esquis, pá, lenha, pingentes, luzes
  wrap.userData = lot.userData;                                      // animações do lote (fumaça da chaminé etc.)
  wrap.name = 'snowlot';
  return wrap;
}

/** Detalhes de inverno da casa (coordenadas do lote; frente da casa em z = HS.z1, quintal até a cerca). Ficam fora do caminho da porta. */
function winterExtras(g, tags, HS, usedSlots = 2) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const FZ = HS.z1, EAVE = 0.12 + A.wallHeight;
  for (const t of tags) {
    if (t.startsWith('ws:snowman')) {                                // boneco de neve no quintal (entre a casa e o canto esquerdo), cachecol colorido
      const c = SNOW_SCARF[t.split(':')[2]], x = 6.3, z = FZ + 1.45;
      add(sphere(0.62, '#f7fbff', 10, 8), x, 0.6, z); add(sphere(0.45, '#f7fbff', 10, 8), x, 1.45, z); add(sphere(0.32, '#f7fbff', 10, 8), x, 2.1, z);
      add(torus(0.3, 0.09, c, 6, 14), x, 1.78, z, Math.PI / 2, 0, 0); add(box(0.16, 0.5, 0.08, c), x + 0.18, 1.55, z + 0.32, 0, 0, 0.15);
      add(cone(0.07, 0.35, '#f08a1c', 6), x, 2.1, z + 0.45, Math.PI / 2, 0, 0);
      for (const s of [-1, 1]) add(sphere(0.05, '#1d1d1f', 6, 4), x + s * 0.11, 2.2, z + 0.28);
      add(cyl(0.24, 0.24, 0.32, '#2b2b2b', 10), x, 2.5, z); add(cyl(0.36, 0.36, 0.05, '#2b2b2b', 10), x, 2.36, z);
      for (const s of [-1, 1]) add(cyl(0.03, 0.03, 0.8, '#6b4526', 4), x + s * 0.65, 1.55, z, 0, 0, s * 1.0);
    } else if (t === 'ws:pine') {                                     // pinheirinho nevado no espaço do quintal que ficou livre
      const sl = A.yardSlots[Math.min(1, usedSlots)], x = sl.x, z = sl.z;
      add(cyl(0.18, 0.24, 0.8, '#5b3b22', 6), x, 0.5, z);
      for (const [r, y, hh] of [[1.4, 1.3, 1.7], [1.05, 2.3, 1.5], [0.7, 3.2, 1.3]]) { add(cone(r, hh, '#2f6b45', 8), x, y, z); add(cone(r * 0.55, hh * 0.35, SNOWC, 8), x, y + hh * 0.36, z); }
    } else if (t === 'ws:sled') {                                     // trenó vermelho encostado na parede da frente (à esquerda)
      const sg = new THREE.Group(); sg.position.set(HS.x0 + 1.1, 0.12, FZ + 0.35); sg.rotation.x = -1.1; g.add(sg);
      sg.add(at(box(0.9, 0.08, 1.8, '#c8402f'), 0, 0.25, 0)); for (const s of [-1, 1]) sg.add(at(box(0.06, 0.12, 2.0, '#3a3d44'), s * 0.4, 0.08, 0.05));
    } else if (t === 'ws:skis') {                                     // par de esquis apoiados na parede (à direita da janela)
      for (const [dx, c] of [[0, '#2f78d0'], [0.22, '#2f78d0']]) add(box(0.12, 2.2, 0.05, c), HS.x1 - 0.9 + dx, 1.2, FZ + 0.25, -0.12, 0, 0.05);
      for (const dx of [-0.25, 0.47]) add(cyl(0.03, 0.03, 1.5, '#9aa3ab', 4), HS.x1 - 0.9 + dx, 0.85, FZ + 0.25, -0.1, 0, 0);
    } else if (t === 'ws:shovel') {                                   // pá de neve junto à entrada (ao lado da porta)
      add(cyl(0.035, 0.035, 1.5, '#8a5a36', 5), A.doorX + 1.15, 0.85, FZ + 0.3, -0.18, 0, 0); add(box(0.55, 0.45, 0.05, '#e0402a'), A.doorX + 1.15, 0.2, FZ + 0.42, -0.18, 0, 0);
    } else if (t === 'ws:wood') {                                     // lenha empilhada sob uma coberturinha (lateral direita da casa)
      const x = HS.x1 + 1.3, z = (HS.z0 + HS.z1) / 2 + 0.6;
      for (let k = 0; k < 3; k++) for (let j = 0; j < 5 - k; j++) add(cyl(0.17, 0.17, 1.1, k % 2 ? '#8a5a34' : '#6b4526', 6), x, 0.28 + k * 0.3, z - 0.68 + j * 0.34 + k * 0.17, 0, 0, Math.PI / 2);   // toras deitadas
      for (const dz of [-0.9, 0.9]) add(box(0.1, 1.6, 0.1, '#5a3a22'), x + 0.55, 0.9, z + dz);
      add(box(1.4, 0.1, 2.3, '#5a3a22'), x, 1.7, z, 0, 0, 0.2); add(box(1.45, 0.16, 2.35, SNOWC), x, 1.8, z, 0, 0, 0.2);
    } else if (t === 'ws:icicles') {                                  // pingentes de gelo pendurados no beiral da frente
      for (let x = HS.x0 - 0.3, k = 0; x <= HS.x1 + 0.3; x += 0.42, k++) add(cone(0.08, 0.35 + (k * 7 % 5) * 0.09, '#cfeeff', 5, { transparent: true, opacity: 0.85 }), x, EAVE - 0.3, FZ + A.roofOverhang - 0.05, Math.PI, 0, 0);
    } else if (t === 'ws:lights') {                                   // cordão de luzes coloridas ao longo da fachada
      const LC = ['#ff4a4a', '#ffd23f', '#4ad04a', '#4aa8ff'];
      add(box(HS.x1 - HS.x0 + 0.4, 0.03, 0.03, '#2b2b2b'), (HS.x0 + HS.x1) / 2, EAVE - 0.55, FZ + 0.12);
      for (let x = HS.x0, k = 0; x <= HS.x1; x += 0.55, k++) add(sphere(0.09, LC[k % 4], 6, 4, { emissive: LC[k % 4], emissiveIntensity: 1.2 }), x, EAVE - 0.62 - 0.06 * Math.sin(k * 1.7), FZ + 0.14);
    }
  }
}

/** Cenário fixo do Nevasca. */
export function buildSnowScene(g, V, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { MIDH, HIGHH, RW } = SNOW, X1 = MAP - HEDGE;
  const slab = (x0, x1, z0, z1, y0, y1) => {
    if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return;
    add(box(x1 - x0, y1 - y0 - 0.06, z1 - z0, STONE), (x0 + x1) / 2, y0 + (y1 - y0 - 0.06) / 2, (z0 + z1) / 2);
    add(box(x1 - x0, 0.06, z1 - z0, SNOWC), (x0 + x1) / 2, y1 - 0.03, (z0 + z1) / 2);
  };
  // patamares: blocos com recorte nas ladeiras (o trecho da ladeira dentro do patamar fica vazio)
  for (const [P, y0, y1] of [[V.MID, 0, MIDH], [V.HIGH, MIDH, HIGHH]]) {
    const cuts = V.ramps.filter(r => r.h1 === y1).map(r => { const mx = r.axis === 'z' ? 0.6 : 0, mz = r.axis === 'z' ? 0 : 0.6; return { x0: r.x0 - mx, x1: r.x1 + mx, z0: r.z0 - mz, z1: r.z1 + mz }; });
    // fatia o retângulo do patamar em faixas em Z nos limites dos recortes e corta em X
    const zs = [P.z0, X1, ...cuts.flatMap(c => [Math.max(P.z0, c.z0), Math.min(X1, c.z1)])].filter(z => z >= P.z0 && z <= X1).sort((a, b) => a - b);
    for (let k = 0; k < zs.length - 1; k++) {
      const z0 = zs[k], z1 = zs[k + 1]; if (z1 - z0 < 0.05) continue;
      const xs = cuts.filter(c => c.z0 < z1 - 0.01 && c.z1 > z0 + 0.01).sort((a, b) => a.x0 - b.x0);
      let x = P.x0;
      for (const c of xs) { slab(x, Math.max(x, c.x0), z0, z1, y0, y1); x = Math.max(x, c.x1); }
      slab(x, X1, z0, z1, y0, y1);
    }
    // mureta de pedra no alto da borda (aberta nas ladeiras)
    const wall = (x0, x1, z0, z1) => { if (x1 - x0 > 0.05 && z1 - z0 > 0.05) { add(box(x1 - x0, 0.9, z1 - z0, STONE2), (x0 + x1) / 2, y1 + 0.45, (z0 + z1) / 2); add(box(x1 - x0 + 0.1, 0.18, z1 - z0 + 0.1, SNOWC), (x0 + x1) / 2, y1 + 0.95, (z0 + z1) / 2); } };
    let a = P.x0; for (const c of cuts.filter(c => c.z0 < P.z0 && c.z1 > P.z0).sort((p, q) => p.x0 - q.x0)) { wall(a, c.x0, P.z0 - 0.35, P.z0 + 0.35); a = c.x1; } wall(a, X1, P.z0 - 0.35, P.z0 + 0.35);
    a = P.z0; for (const c of cuts.filter(c => c.x0 < P.x0 && c.x1 > P.x0).sort((p, q) => p.z0 - q.z0)) { wall(P.x0 - 0.35, P.x0 + 0.35, a, c.z0); a = c.z1; } wall(P.x0 - 0.35, P.x0 + 0.35, a, X1);
  }
  // ruas (asfalto escuro) com montinhos de neve nas beiradas; atalhos com neve batida
  for (const s of V.segs) {
    if (s.type === 'ramp') continue;
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), y = V.h((ax + bx) / 2, (az + bz) / 2);
    add(box(RW, 0.06, len, s.type === 'cut' ? '#c9d3dc' : ASPH), (ax + bx) / 2, y + (s.type === 'cut' ? 0.015 : 0.035), (az + bz) / 2, 0, ry, 0);   // atalho 2 cm abaixo: os discos dos nós cobrem as pontas sem tremular
    const nx = Math.cos(ry), nz = -Math.sin(ry);
  }
  for (const q of V.mounds) { const m = sphere(1.0, SNOW2, 7, 4); m.scale.set(0.8, 0.45, 1.3); add(m, q.x, q.y + 0.05, q.z, 0, q.ry, 0); }   // montes na margem (snowPlan: fora das pistas e acessos)
  for (const [x, z] of Object.values(V.N)) add(cyl(RW / 2, RW / 2, 0.06, ASPH, 18), x, V.h(x, z) + 0.034, z);
  // ladeiras: rampa de asfalto e laterais de pedra
  for (const r of V.ramps) {
    const along = r.axis === 'z' ? r.z1 - r.z0 : r.x1 - r.x0, len = Math.hypot(along, r.h1 - r.h0), ang = Math.atan2(r.h1 - r.h0, along);
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, ym = (r.h0 + r.h1) / 2;
    if (r.axis === 'z') {
      add(box(r.x1 - r.x0, 0.3, len, ASPH), cx, ym - 0.12, cz, -ang, 0, 0);
      for (const x of [r.x0 - 0.3, r.x1 + 0.3]) add(box(0.6, r.h1 + 1, r.z1 - r.z0, STONE2), x, (r.h1 + 1) / 2 - 0.5, cz);
      for (let k = 0; k < 8; k++) { const z0 = r.z0 + along * k / 8, top = r.h0 + (r.h1 - r.h0) * k / 8 - 0.3; if (top > 0.1) add(box(r.x1 - r.x0, top, along / 8, STONE), cx, top / 2, z0 + along / 16); }
    } else {
      add(box(len, 0.3, r.z1 - r.z0, ASPH), cx, ym - 0.12, cz, 0, 0, ang);
      for (const z of [r.z0 - 0.3, r.z1 + 0.3]) add(box(r.x1 - r.x0, r.h1 + 1, 0.6, STONE2), cx, (r.h1 + 1) / 2 - 0.5, z);
      for (let k = 0; k < 8; k++) { const x0 = r.x0 + along * k / 8, top = r.h0 + (r.h1 - r.h0) * k / 8 - 0.3; if (top > 0.1) add(box(along / 8, top, r.z1 - r.z0, STONE), x0 + along / 16, top / 2, cz); }
    }
  }
  // gelo: placas lisas azuladas sobre a rua (com riscos claros), seguindo o terreno
  const iceMat = mat(ICE, { roughness: 0.15, metalness: 0.05, emissive: '#2a4a60', emissiveIntensity: 0.25 });
  for (const p of V.ice) {
    const [ax, az] = p.seg.a, [bx, bz] = p.seg.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
    for (let t = p.t0 * len; t < p.t1 * len - 0.5; t += 2) {
      const u = Math.min(2, p.t1 * len - t), px = ax + (bx - ax) * (t + u / 2) / len, pz = az + (bz - az) * (t + u / 2) / len;
      const y0 = V.h(ax + (bx - ax) * t / len, az + (bz - az) * t / len), y1 = V.h(ax + (bx - ax) * (t + u) / len, az + (bz - az) * (t + u) / len);
      const m = at(new THREE.Mesh(new THREE.BoxGeometry(V.ICE_HALF * 2, 0.04, u + 0.05), iceMat), px, (y0 + y1) / 2 + 0.1, pz, 0, ry, 0); m.rotateX(-Math.atan2(y1 - y0, u)); m.receiveShadow = true; g.add(m);   // logo acima do asfalto (topo em +0,065)
      if (Math.floor(t / 2) % 2) add(box(0.12, 0.03, u * 0.8, '#f4fbff'), px + Math.cos(ry) * 1.2, (y0 + y1) / 2 + 0.125, pz - Math.sin(ry) * 1.2, 0, ry + 0.25, 0);
    }
  }
  // pinheiros com neve
  for (const p of V.pines) {
    add(cyl(0.22 * p.s, 0.3 * p.s, 1.2 * p.s, '#5b3b22', 6), p.x, p.y + 0.6 * p.s, p.z);
    for (const [r, y, hh] of [[1.9, 1.5, 2.2], [1.5, 2.8, 1.9], [1.0, 3.9, 1.6]]) { add(cone(r * p.s, hh * p.s, '#2f6b45', 8), p.x, p.y + y * p.s, p.z); add(cone(r * p.s * 0.55, hh * p.s * 0.35, SNOWC, 8), p.x, p.y + (y + hh * 0.36) * p.s, p.z); }
  }
  // postes de luz acesos nos cruzamentos
  const bulb = mat('#fff1b8', { emissive: '#ffd36b', emissiveIntensity: 1.3 });
  for (const l of V.lamps) { add(cyl(0.12, 0.15, 5, '#3a3d44', 6), l.x, l.y + 2.5, l.z); add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulb), l.x, l.y + 5.1, l.z); }   // (snowPlan: na margem, com colisão)
  return g;
}

/** Monte de neve que fecha um atalho (escala 1 = fechado). */
export function buildSnowBank() {
  const g = new THREE.Group();
  for (const [x, z, r] of [[-2.6, 0, 2.4], [0, 0.3, 2.9], [2.6, -0.2, 2.3], [0, -1.6, 2.0], [0.4, 1.8, 1.9]]) { const m = sphere(r, SNOWC, 9, 6); m.scale.set(1, 0.62, 1); m.position.set(x, 0.2, z); m.castShadow = true; g.add(m); }
  return g;
}

/** Limpa-neve (frente para +X): caminhão laranja com lâmina e giroflex. */
export function buildPlow() {
  const g = new THREE.Group();
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  a(box(3.6, 1.2, 2.2, '#f08a1c'), -0.4, 1.3, 0); a(box(1.6, 1.4, 2.1, '#f08a1c'), 1.6, 1.9, 0); a(box(1.5, 0.7, 2.0, '#2b4a6e'), 1.65, 2.25, 0);
  a(box(0.3, 1.1, 3.4, '#ffd23f'), 3.0, 0.75, 0, 0, 0, -0.25);
  for (let k = -1; k <= 1; k++) a(box(0.32, 0.25, 0.9, k % 2 ? '#2b2b2b' : '#ffd23f'), 3.0, 1.1, k * 1.1, 0, 0, -0.25);
  a(box(0.3, 0.25, 0.6, '#ff4a1a'), 1.6, 2.75, 0);
  for (const x of [-1.5, 1.4]) for (const s of [-1, 1]) a(cyl(0.55, 0.55, 0.4, '#1f2023', 10), x, 0.55, s * 1.15, Math.PI / 2, 0, 0);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
