// Nível 16 (Nevasca): casa nevada (o lote normal do jogo, centrado e com neve só na parte de cima do telhado — a cor do
// telhado, a porta e o quintal continuam visíveis), cenário fixo (patamares com muros de pedra, ruas, ladeiras, gelo,
// pinheiros, postes acesos, montes de neve nas beiradas), o monte de neve dos atalhos, o limpa-neve, a gente brincando
// na neve nos quintais e os arredores (neve na sebe, bosque de pinheiros nevados e a cordilheira no horizonte).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, sphere, torus, at, mat, bakeStatic, vcMerge, dynamic } from './kit.js';
import { buildLot } from './house.js';
import { LOT, LOT_ANCHORS as A, ENTRANCE } from '../layout.js';
import { buildFigure } from '../grillbyInside.js';
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
  const life = winterLife(snow, h);                                  // (antes de assar: o corpo das pessoas vai junto)
  bakeStatic(snow);                                                  // (neve e detalhes de inverno: poucas malhas por material, como o resto do lote)
  const base = lot.userData.update;
  wrap.userData = { ...lot.userData, update: (t, dt) => { if (base) base(t); if (life && wrap.visible) life(t, dt || 0); } };   // animações do lote (fumaça da chaminé etc.) + gente no quintal
  wrap.name = 'snowlot';
  return wrap;
}

// roupa de inverno (casaco, gorro com pompom, cachecol, luvas) — como os moradores do Nevasca
const WLOOK = [
  { coat: '#b5302a', hat: 'beanie', hatColor: '#e8e2d4', scarf: '#efbf2a', glove: '#3a2a22', pants: '#3d4a66', boots: true, shoes: '#4a3022' },
  { coat: '#2f5f9a', hat: 'beanie', hatColor: '#d8473a', scarf: '#e8e2d4', glove: '#2b2b2b', pants: '#3a3a3a', boots: true, shoes: '#2b2522' },
  { coat: '#3f7a4a', hat: 'beanie', hatColor: '#efbf2a', scarf: '#d8473a', glove: '#8a5a36', pants: '#4a3a2a', boots: true, shoes: '#6b4428' },
  { coat: '#7a4fa0', hat: 'beanie', hatColor: '#3c9d55', scarf: '#5aa8e8', glove: '#c8402f', pants: '#2f3b52', boots: true, shoes: '#4a3022' },
];
/** Gente aproveitando a neve no quintal (uma casa em cada duas ou três, cada uma no seu tempo): criança fazendo anjo na
 *  neve, criança jogando bola de neve na rua, alguém na porta com uma caneca fumegando. Nada aqui é item de pista (pá,
 *  trenó, esquis e boneco de neve são das casas que os têm) e tudo fica fora dos itens do quintal, do caminho e do portão. */
function winterLife(g, h) {
  const k = (h.index * 3 + 1) % 5, ph = h.index * 1.21, look = WLOOK[h.index % WLOOK.length];
  const FZ = A.house.z1;
  if (k === 0) {                                                                         // anjo na neve, deitado entre o caminho e a caixa de correio
    const f = buildFigure({ ...look, kid: true, moving: ['armL', 'armR', 'legL', 'legR'] });
    f.root.rotation.x = -Math.PI / 2; f.root.position.set(10.4, 0.42, 12.6); g.add(f.root);
    const mark = sphere(1.0, SNOW2, 10, 4); mark.scale.set(0.75, 0.04, 0.95); g.add(at(mark, 10.4, 0.13, 11.95));   // a marca do anjo na neve
    return t => {
      const s = (Math.sin(t * 2.4 + ph) + 1) / 2;
      f.armL.rotation.z = -0.3 - s * 1.6; f.armR.rotation.z = 0.3 + s * 1.6;
      f.legL.rotation.z = -0.1 - s * 0.35; f.legR.rotation.z = 0.1 + s * 0.35;
    };
  }
  if (k === 1) {                                                                         // bola de neve: prepara, arremessa na direção da rua
    const f = buildFigure({ ...look, kid: true, moving: ['armR', 'head'] });
    f.root.position.set(6.8, 0.12, 14.3); f.root.rotation.y = 0.35; g.add(f.root);
    const ball = dynamic(sphere(0.13, '#f7fbff', 8, 6)); g.add(ball);
    const hand = new THREE.Vector3();
    for (const [dx, dz] of [[0.5, 0.4], [-0.4, 0.7], [0.2, -0.5]]) { const m = sphere(0.14, '#f7fbff', 7, 5); g.add(at(m, 6.8 + dx, 0.24, 14.3 + dz)); }   // munição no chão
    return t => {
      const c = (t * 0.45 + ph) % 1;                                                    // um arremesso a cada ~2,2 s
      const wind = c < 0.55 ? c / 0.55 : 0, throwK = c >= 0.55 && c < 0.7 ? (c - 0.55) / 0.15 : c >= 0.7 ? 1 : 0;
      f.armR.rotation.set(wind * 2.6 * (1 - throwK) + throwK * -1.4, 0, 0.15);           // braço vai para trás e solta à frente
      f.head.rotation.x = -0.1;
      if (c < 0.6) { hand.set(0, -0.55, 0); f.armR.localToWorld(hand); g.worldToLocal(hand); ball.position.copy(hand); ball.visible = true; }   // (matrizes do quadro anterior: o desenho as atualiza)
      else { const u = (c - 0.6) / 0.4; ball.position.set(6.8 + 0.35 * 7 * u, 1.35 + 3.2 * u - 4.4 * u * u, 14.3 + Math.cos(0.35) * 7 * u); ball.visible = u < 0.95; }
    };
  }
  if (k === 2) {                                                                         // na porta, de caneca na mão, olhando a neve
    const tags = SNOW_EXTRAS[h.index] || [], left = !tags.some(t => t.startsWith('ws:snowman')), right = !tags.includes('ws:shovel');
    if (!left && !right) return null;                                                    // (boneco de um lado e pá do outro: fica para outra casa)
    const f = buildFigure({ ...look, kid: false, hat: null, hair: ['#4a3020', '#2a1d14', '#c9a46a', '#d8d4cc'][h.index % 4], moving: ['armR', 'head'] });
    f.root.position.set(A.doorX + (left ? -1.9 : 1.6), 0.12, FZ + 0.7); g.add(f.root);   // (à esquerda, longe da luminária da porta)
    const mug = new THREE.Group(); mug.add(at(cyl(0.12, 0.11, 0.22, '#e04a3a', 8), 0, 0, 0.18)); mug.position.set(0, -0.52, 0); f.armR.add(dynamic(mug));
    const steamMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    const puffs = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), steamMat); m.castShadow = false; g.add(dynamic(m)); return m; });
    const p0 = new THREE.Vector3();
    return t => {
      const sip = Math.max(0, Math.sin(t * 0.5 + ph) - 0.75) * 4;                       // de vez em quando toma um gole
      f.armR.rotation.set(-1.15 - sip * 0.9, 0, 0.2 + sip * 0.2); mug.rotation.x = sip * 0.6;
      f.head.rotation.y = Math.sin(t * 0.25 + ph) * 0.5; f.head.rotation.x = sip * -0.2;
      p0.set(0, 0.12, 0.18); mug.localToWorld(p0); g.worldToLocal(p0);                    // (matrizes do quadro anterior)
      puffs.forEach((m, q) => { const u = (t * 0.6 + q * 0.5 + ph) % 1; m.position.set(p0.x + Math.sin(u * 5 + q) * 0.06, p0.y + u * 0.7, p0.z); m.scale.setScalar(0.6 + u * 1.6); });
    };
  }
  return null;
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
  hedgeSnow(g, MAP, HEDGE);
  g.add(farForest(MAP), mountainRing());
  return g;
}

// ---------- arredores do Nevasca ----------
/** Neve acumulada no alto da sebe, nos pilares do portal e na placa VILA ADRESS (a sebe e a placa são de world.js). */
function hedgeSnow(g, MAP, HEDGE) {
  let s = 31; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const segs = [[0, ENTRANCE.x0, HEDGE / 2, 'x'], [ENTRANCE.x1, MAP, HEDGE / 2, 'x'], [0, MAP, MAP - HEDGE / 2, 'x'], [HEDGE, MAP - HEDGE, HEDGE / 2, 'z'], [HEDGE, MAP - HEDGE, MAP - HEDGE / 2, 'z']];
  for (const [a, b, c, ax] of segs) {
    const len = b - a, n = Math.max(1, Math.round(len / 1.15));
    const slab = box(ax === 'x' ? len : HEDGE - 0.55, 0.14, ax === 'x' ? HEDGE - 0.55 : len, SNOWC);
    g.add(at(slab, ax === 'x' ? (a + b) / 2 : c, 1.38, ax === 'x' ? c : (a + b) / 2));
    for (let k = 0; k < n; k++) {
      const u = a + (k + 0.5) / n * len, m = sphere(0.62, k % 4 ? SNOWC : SNOW2, 7, 4);
      m.scale.set(1.05 + r() * 0.35, 0.3 + r() * 0.1, 0.95);
      if (ax === 'z') m.rotation.y = Math.PI / 2;
      g.add(at(m, ax === 'x' ? u : c + (r() - 0.5) * 0.15, 1.43 + r() * 0.05, ax === 'x' ? c + (r() - 0.5) * 0.15 : u, 0, m.rotation.y, 0));
    }
  }
  for (const x of [ENTRANCE.x0 - 0.5, ENTRANCE.x1 + 0.5]) { const cap = sphere(0.62, SNOWC, 8, 4); cap.scale.set(1, 0.28, 1); g.add(at(cap, x, 2.52, HEDGE / 2)); }
  const sign = new THREE.Group(); sign.position.set(ENTRANCE.x0 - 7.6, 2.85, HEDGE / 2 + 0.05); sign.rotation.x = -0.55; g.add(sign);
  sign.add(at(box(11.1, 0.16, 0.42, SNOWC), 0, 1.22, 0.02));
  for (let k = 0; k < 6; k++) { const m = sphere(0.5, SNOWC, 7, 4); m.scale.set(1.3, 0.32, 0.55); sign.add(at(m, -4.6 + k * 1.84, 1.28, 0.02)); }
}

const HAZE = new THREE.Color('#bfe3f2');                       // cor do céu (o fundo da cena): o pé das montanhas some nela
const HORIZON_LIGHT = new THREE.Vector3(0.25, 0.75, 0.6).normalize();
/** Peça para o horizonte (horizonRing, `extra`): a geometria vira não indexada com a cor por vértice já sombreada por face e
 *  misturada com o céu (haze 0…1), como as montanhas. */
export function hazeGeo(geo, color, haze) {
  const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals();
  const n = g.attributes.normal, col = new Float32Array(g.attributes.position.count * 3), c = new THREE.Color(), base = new THREE.Color(color), fn = new THREE.Vector3();
  for (let i = 0; i < n.count; i += 3) {
    fn.set(n.getX(i), n.getY(i), n.getZ(i));
    c.copy(base).multiplyScalar(0.6 + 0.4 * Math.max(0, fn.dot(HORIZON_LIGHT))).lerp(HAZE, haze);
    for (let q = 0; q < 3; q++) col.set([c.r, c.g, c.b], (i + q) * 3);
  }
  if (g.attributes.uv) g.deleteAttribute('uv');
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
/**
 * Horizonte de montanhas ou morros: um anel em volta da câmera, que a acompanha como o sol (nunca se chega nele). Sem névoa:
 * o "ar" já está pintado nas cores (a base se dissolve no céu) e a luz vem assada por face. Uma malha só.
 * rows: [{ N, R, h: [min, max], b: [min, max], shape: 'cone' | 'dome', base, top, topK, haze, rock: { every, color, h, b } }]
 *  - top/topK: cor do alto (neve) acima de topK × altura; rock: a cada `every`, um pico de pedra (pão de açúcar) mais alto.
 */
export function horizonRing(rows, seed = 977, name = 'horizon', extra = []) {
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const L = HORIZON_LIGHT, parts = [...extra], c = new THREE.Color(), fn = new THREE.Vector3(), tv = new THREE.Vector3();
  for (const row of rows) {
    const base = new THREE.Color(row.base), top = row.top ? new THREE.Color(row.top) : null, rockC = row.rock ? new THREE.Color(row.rock.color) : null;
    for (let k = 0; k < row.N; k++) {
      const isRock = row.rock && k % row.rock.every === row.rock.every - 1;
      const a = (k + r() * 0.6) / row.N * Math.PI * 2, R = row.R * (1 + (r() - 0.5) * 0.12);
      const h = (row.h[0] + r() * (row.h[1] - row.h[0])) * (isRock ? row.rock.h : 1), b = (row.b[0] + r() * (row.b[1] - row.b[0])) * (isRock ? row.rock.b : 1);
      const dome = row.shape === 'dome';
      const geo = dome ? new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, isRock ? Math.PI * 0.62 : Math.PI / 2) : new THREE.ConeGeometry(b, h, 7 + (k % 3), 4);
      if (dome) { geo.scale(b, h / (isRock ? 1 - Math.cos(Math.PI * 0.62) * -1 * 0 : 1), b); geo.translate(0, isRock ? -h * 0.15 : 0, 0); }
      const pos = geo.attributes.position;
      const jit = (x, y, z) => { const q = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + k * 3.1) * 43758.5453; return q - Math.floor(q); };
      const y0 = dome ? (isRock ? -h * 0.15 - h * Math.cos(Math.PI * 0.62) : 0) : -h / 2, yTop = dome ? h * (isRock ? 0.85 : 1) : h / 2;
      for (let i = 0; i < pos.count; i++) {                    // relevo irregular (o mesmo deslocamento nos vértices repetidos da costura)
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (!dome && y > h / 2 - 0.01) { pos.setX(i, (jit(1, 2, k) - 0.5) * b * 0.25); continue; }   // pico um pouco fora do centro
        const j = jit(+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)), bottom = y < y0 + 0.01 + (dome ? h * 0.02 : 0), f = bottom ? 0.12 : dome ? 0.18 : 0.32;
        pos.setXYZ(i, x * (1 + (j - 0.5) * f), y + (bottom || y > yTop - 0.01 ? 0 : (j - 0.5) * h * (dome ? 0.08 : 0.12)), z * (1 + (j - 0.5) * f));
      }
      geo.translate(Math.cos(a) * R, dome ? -3 : h / 2 - 3, Math.sin(a) * R);
      const g2 = geo.toNonIndexed(); geo.dispose(); g2.computeVertexNormals();
      const p2 = g2.attributes.position, n2 = g2.attributes.normal, col = new Float32Array(p2.count * 3);
      const lowY = dome ? -3 + y0 : -3, H = dome ? yTop - y0 : h, snowLine = lowY + H * (row.topK || 2);
      for (let i = 0; i < p2.count; i += 3) {
        fn.set(0, 0, 0); for (let q = 0; q < 3; q++) fn.add(tv.set(n2.getX(i + q), n2.getY(i + q), n2.getZ(i + q)));
        fn.normalize();
        const yc = (p2.getY(i) + p2.getY(i + 1) + p2.getY(i + 2)) / 3, shade = 0.6 + 0.4 * Math.max(0, fn.dot(L));
        const isTop = top && yc > snowLine + (r() - 0.5) * H * 0.14 && fn.y > 0.25;
        const steep = isRock && fn.y < 0.82;                                                // pão de açúcar: a pedra nua nas paredes, mata no pé e no topo
        const col0 = isTop ? top : steep && yc > lowY + H * 0.18 ? rockC : base;
        for (let q = 0; q < 3; q++) {
          const y = p2.getY(i + q), fade = Math.min(1, Math.max(0, 1 - (y - lowY) / (H * 0.55)));   // a base vira céu
          c.copy(col0).multiplyScalar(shade).lerp(HAZE, Math.min(1, row.haze + fade * (1 - row.haze)));
          col.set([c.r, c.g, c.b], (i + q) * 3);
        }
      }
      g2.deleteAttribute('uv'); g2.setAttribute('color', new THREE.BufferAttribute(col, 3)); parts.push(g2);
    }
  }
  const m = new THREE.Mesh(mergeGeometries(parts, false), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false }));
  parts.forEach(p => p.dispose());
  m.name = name; m.frustumCulled = false; dynamic(m);
  m.onBeforeRender = (rd, sc, cam) => {                     // acompanha a câmera (só no plano: a altura fica)
    m.castShadow = false; m.receiveShadow = false;           // (world.js liga a sombra de tudo o que é assado junto)
    const dense = sc.fog && sc.fog.far < 200;                // nevasca fechada das cenas (resgate do Grillby's): some junto com o resto
    m.position.set(cam.position.x, 0, cam.position.z); m.scale.setScalar(dense ? 1e-4 : 1); m.updateMatrix(); m.matrixWorld.multiplyMatrices(m.parent.matrixWorld, m.matrix);
  };
  return m;
}
const mountainRing = () => horizonRing([
  { N: 28, R: 1180, h: [110, 230], b: [190, 320], shape: 'cone', base: '#7f8ea3', top: '#f6f9fc', topK: 0.52, haze: 0.38 },   // cordilheira
  { N: 34, R: 900, h: [38, 85], b: [110, 190], shape: 'cone', base: '#4f6b66', top: '#f6f9fc', topK: 0.8, haze: 0.3 },        // morros de mata escura à frente, neve só no alto
], 977, 'snow-mountains');

/** Bosque fechado de pinheiros nevados depois da clareira da vila (só cenário, longe: sem colisão). Instanciado em 8 setores
 *  (cada um some sozinho fora da câmera e da sombra); a estrada de acesso fica livre. */
function farForest(MAP) {
  const tree = new THREE.Group();                                   // (longe: menos faces que os pinheiros de perto, mesma silhueta)
  tree.add(at(cyl(0.24, 0.32, 1.4, '#5b3b22', 4), 0, 0.7, 0));
  for (const [rr, y, hh] of [[2.0, 1.9, 2.8], [1.35, 3.6, 2.4]]) {
    tree.add(at(cone(rr, hh, '#2f6045', 6), 0, y, 0));
    tree.add(at(cone(rr * 0.62, hh * 0.42, SNOWC, 6), 0, y + hh * 0.3, 0));
  }
  const geo = vcMerge(tree).geometry;
  const sectors = [...Array(8)].map(() => []), C = MAP / 2;
  let s = 5150; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V3 = new THREE.Vector3(), S = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 6000; i++) {
    const x = -470 + r() * (MAP + 940), z = -470 + r() * (MAP + 940);
    const d = Math.hypot(Math.max(-x, 0, x - MAP), Math.max(-z, 0, z - MAP));
    if (d < 78 || (z < 0 && Math.abs(x - 104.6) < 16)) continue;
    const dens = 0.55 + 0.45 * Math.sin(x * 0.021 + Math.cos(z * 0.017) * 2.1) * Math.cos(z * 0.019 - x * 0.006);   // manchas de mata e clareiras
    if (r() > dens * (d < 120 ? 0.5 : 0.8)) continue;
    const sc = 1.3 + r() * 1.2, k = Math.floor(((Math.atan2(z - C, x - C) + Math.PI) / (Math.PI * 2)) * 8) % 8;
    M.compose(V3.set(x, 0, z), Q.setFromAxisAngle(Y, r() * 6.28), S.set(sc, sc * (0.9 + r() * 0.3), sc));
    sectors[k].push(M.clone());
  }
  const out = new THREE.Group(); out.name = 'snow-forest';
  const mtl = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 }), C3 = new THREE.Color();
  for (const list of sectors) {
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(geo, mtl, list.length);
    list.forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, C3.setScalar(0.86 + r() * 0.14)); });
    im.computeBoundingSphere(); dynamic(im); out.add(im);
    im.onBeforeRender = () => { im.castShadow = false; im.receiveShadow = false; };   // longe: sem sombra (world.js liga a de tudo o que é assado junto)
  }
  dynamic(out);
  return out;
}

/** Monte de neve que fecha um atalho (escala 1 = fechado). */
export function buildSnowBank() {
  const g = new THREE.Group();
  for (const [x, z, r] of [[-2.6, 0, 2.4], [0, 0.3, 2.9], [2.6, -0.2, 2.3], [0, -1.6, 2.0], [0.4, 1.8, 1.9]]) { const m = sphere(r, SNOWC, 9, 6); m.scale.set(1, 0.62, 1); m.position.set(x, 0.2, z); m.castShadow = true; g.add(m); }
  return g;
}

/** Limpa-neve (frente para +X): caminhão laranja com lâmina inclinada, caçamba de sal atrás, cabine com vidros (o motorista
 *  de gorro aparece) e giroflex âmbar no teto que pisca enquanto ele trabalha. As partes fixas viram uma malha só; as rodas
 *  giram e o giroflex pisca em userData.drive(dt, v) (chamado por tractors.js). */
export function buildPlow() {
  const g = new THREE.Group(), fixed = new THREE.Group();
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => fixed.add(at(m, x, y, z, rx, ry, rz));
  const OR = '#f08a1c';
  a(box(4.6, 0.4, 1.7, '#2f3238'), -0.2, 0.95, 0);                                      // chassi
  a(box(2.3, 1.15, 2.2, OR), -1.25, 1.75, 0); a(box(2.3, 0.12, 2.24, '#c86a10'), -1.25, 2.3, 0);   // caçamba de sal
  const salt = sphere(1.0, '#e9eef2', 8, 4); salt.scale.set(1.05, 0.28, 0.95); a(salt, -1.25, 2.3, 0);
  a(box(1.65, 0.75, 2.1, OR), 1.4, 1.55, 0);                                            // cabine: parte de baixo
  for (const [x, z] of [[0.62, -1.0], [0.62, 1.0], [2.15, -1.0], [2.15, 1.0]]) a(box(0.12, 0.85, 0.1, OR), x, 2.33, z);   // colunas
  a(box(1.7, 0.14, 2.14, OR), 1.4, 2.8, 0);                                             // teto
  a(box(0.08, 0.85, 2.0, '#3a3d44'), 0.6, 2.33, 0);                                      // parede de trás da cabine
  a(box(0.7, 0.55, 2.16, OR), 2.6, 1.48, 0); a(box(0.06, 0.4, 1.4, '#2b2b2b'), 2.96, 1.45, 0);   // capô curto e grade
  for (const sd of [-1, 1]) { a(box(0.06, 0.16, 0.3, '#fff6c8'), 2.97, 1.62, sd * 0.78); a(box(0.5, 0.06, 0.12, '#2b2b2b'), 0.62, 2.55, sd * 1.15); a(box(0.08, 0.3, 0.22, '#2b2b2b'), 0.42, 2.45, sd * 1.2); }   // faróis e retrovisores
  a(box(0.3, 1.1, 3.4, '#ffd23f'), 3.05, 0.75, 0, 0, 0, -0.25);                          // lâmina
  for (let k = -1; k <= 1; k++) a(box(0.32, 0.25, 0.9, k % 2 ? '#2b2b2b' : '#ffd23f'), 3.06, 1.1, k * 1.1, 0, 0, -0.25);
  for (const sd of [-1, 1]) a(box(0.6, 0.12, 0.12, '#3a3d44'), 2.75, 0.75, sd * 0.6);     // braços da lâmina
  const ridge = sphere(1.1, '#f4f8fb', 8, 4); ridge.scale.set(0.4, 0.32, 1.5); a(ridge, 3.4, 0.22, 0);   // neve empurrada na frente da lâmina
  a(box(0.5, 0.12, 0.5, '#2b2b2b'), 1.35, 2.92, 0);                                     // base do giroflex
  const body = vcMerge(fixed); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const glass = new THREE.MeshStandardMaterial({ color: '#a9d2ea', transparent: true, opacity: 0.38, roughness: 0.1, depthWrite: false });
  for (const [w, h, d, x, y, z] of [[0.05, 0.82, 1.95, 2.17, 2.33, 0], [1.45, 0.62, 0.05, 1.4, 2.4, 1.04], [1.45, 0.62, 0.05, 1.4, 2.4, -1.04]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glass); m.position.set(x, y, z); g.add(m); }
  const d = buildFigure({ coat: '#2f5f9a', pants: '#3a3d44', hat: 'beanie', hatColor: '#d8473a', scarf: '#efbf2a', glove: '#2b2b2b', sit: 0.42, moving: ['head'] });
  d.root.position.set(1.15, 1.52, -0.42); d.root.rotation.y = Math.PI / 2; d.root.scale.setScalar(0.8); g.add(d.root);
  const lamps = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff8a00', emissiveIntensity: 0.2 })); m.position.set(1.35, 2.98, k ? 0.16 : -0.16); g.add(m); return m; });
  const wheels = [];
  for (const x of [-1.9, -1.0, 1.75]) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, 0.58, sd * 1.12); g.add(w);
    const t = new THREE.Group(); t.add(at(cyl(0.58, 0.58, 0.42, '#1f2023', 12), 0, 0, 0, Math.PI / 2, 0, 0)); t.add(at(cyl(0.3, 0.3, 0.46, '#c9ccd2', 8), 0, 0, 0, Math.PI / 2, 0, 0));
    for (let k = 0; k < 6; k++) t.add(at(box(0.1, 0.1, 0.4, '#2a2b2e'), Math.cos(k * 1.047) * 0.58, Math.sin(k * 1.047) * 0.58, 0, 0, 0, k * 1.047));
    const m = vcMerge(t); m.castShadow = true; w.add(m); wheels.push(w);
  }
  let T = Math.random() * 3, look = 0, lookT = 3;
  g.userData.drive = (dt, v) => {
    T += dt;
    for (const w of wheels) w.rotation.z -= v * dt / 0.58;
    const on = (T * 2.4) % 1 < 0.5;                                                     // pisca alternado
    lamps[0].material.emissiveIntensity = on ? 2.2 : 0.15; lamps[1].material.emissiveIntensity = on ? 0.15 : 2.2;
    if ((lookT -= dt) <= 0) { look = (Math.random() - 0.5) * 1.2; lookT = 2 + Math.random() * 4; }
    d.head.rotation.y += (look - d.head.rotation.y) * Math.min(1, dt * 2);
  };
  g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; } });
  return g;
}
