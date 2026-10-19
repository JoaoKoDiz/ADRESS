// Nível 16 (Nevasca): casa nevada (o lote normal do jogo, centrado e com neve só na parte de cima do telhado — a cor do
// telhado, a porta e o quintal continuam visíveis), cenário fixo (patamares com muros de pedra, ruas, ladeiras, gelo,
// pinheiros, postes acesos, montes de neve nas beiradas), o monte de neve dos atalhos, o limpa-neve, a gente brincando
// na neve nos quintais e os arredores (neve na sebe, bosque de pinheiros nevados e a cordilheira no horizonte).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, sphere, torus, at, mat, mesh, bakeStatic, vcMerge, dynamic } from './kit.js';
import { buildLot } from './house.js';
import { LOT, LOT_ANCHORS as A, ENTRANCE, SNOWV } from '../layout.js';
import { buildFigure } from '../grillbyInside.js';
import { SNOW, rampH } from '../snowPlan.js';
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

/** Mantém de uma geometria (no mundo) só o lado onde a·x + b·z ≤ c (corta triângulos na linha; sem índice). */
function clipHalf(geo, a, b, c) {
  const pos = geo.attributes.position, out = [], P = i => [pos.getX(i), pos.getY(i), pos.getZ(i)], side = p => a * p[0] + b * p[2] - c;
  for (let i = 0; i < pos.count; i += 3) {
    const tri = [P(i), P(i + 1), P(i + 2)], poly = [];
    for (let k = 0; k < 3; k++) {
      const p = tri[k], q = tri[(k + 1) % 3], sp = side(p), sq = side(q);
      if (sp <= 0) poly.push(p);
      if ((sp <= 0) !== (sq <= 0)) { const t = sp / (sp - sq); poly.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t]); }
    }
    for (let k = 1; k < poly.length - 1; k++) out.push(...poly[0], ...poly[k], ...poly[k + 1]);
  }
  geo.dispose();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); g.computeVertexNormals(); return g;
}
/** Tira de uma geometria (no mundo, sem índice) o que fica dentro do retângulo r (x0..x1 × z0..z1): junta os pedaços de
 *  fora (oeste, leste, e entre os dois, norte e sul), cada um um recorte convexo. */
function cutRect(geo, r) {
  const parts = [[[1, 0, r.x0]], [[-1, 0, -r.x1]], [[-1, 0, -r.x0], [1, 0, r.x1], [0, 1, r.z0]], [[-1, 0, -r.x0], [1, 0, r.x1], [0, -1, -r.z1]]]
    .map(planes => planes.reduce((gg, pl) => clipHalf(gg, ...pl), geo.clone())).filter(gg => gg.attributes.position.count);
  geo.dispose();
  if (!parts.length) { const e = new THREE.BufferGeometry(); e.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); return e; }
  const out = mergeGeometries(parts, false); parts.forEach(p => p.dispose()); return out;
}
/** Vira os triângulos de uma superfície quase horizontal para cima (a ordem dos vértices não importa para quem a monta). */
function upFace(geo) {
  const p = geo.attributes.position, c = geo.attributes.color, a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    if (b.sub(a).cross(d.sub(a)).y >= 0) continue;
    for (const at2 of [p, c].filter(Boolean)) for (let k = 0; k < at2.itemSize; k++) { const t = at2.getComponent(i + 1, k); at2.setComponent(i + 1, k, at2.getComponent(i + 2, k)); at2.setComponent(i + 2, k, t); }
  }
  p.needsUpdate = true; if (c) c.needsUpdate = true; geo.computeVertexNormals();
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
  // ruas (asfalto escuro) e atalhos (neve batida). Nas pontas das ladeiras, o disco do cruzamento e o trecho de rua que
  // chega nele são cortados na linha onde a ladeira começa: nada fica flutuando por cima da subida nem enterrado nela.
  const asph = mat(ASPH), packed = mat('#c9d3dc');
  // (tira de cada peça de rua a parte que fica dentro do retângulo de uma ladeira: a pista da ladeira cobre esse trecho)
  const place = (geo, mx) => { const g2 = geo.index ? geo.toNonIndexed() : geo.clone(); g2.applyMatrix4(mx); return g2; };
  const offRamps = geo => {
    geo.computeBoundingBox(); const bb = geo.boundingBox;
    for (const r of V.ramps) if (bb.min.x < r.x1 && bb.max.x > r.x0 && bb.min.z < r.z1 && bb.max.z > r.z0) geo = cutRect(geo, r);
    return geo;
  };
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), YA = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1), T3 = new THREE.Vector3();
  for (const s of V.segs) {
    if (s.type === 'ramp') continue;
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), y = V.h((ax + bx) / 2, (az + bz) / 2);
    let geo = place(new THREE.BoxGeometry(RW, 0.06, len), M4.compose(T3.set((ax + bx) / 2, y + (s.type === 'cut' ? 0.015 : 0.035), (az + bz) / 2), Q.setFromAxisAngle(YA, ry), ONE));   // atalho 2 cm abaixo: os discos dos nós cobrem as pontas sem tremular
    geo = offRamps(geo); if (geo.attributes.position.count) g.add(new THREE.Mesh(geo, s.type === 'cut' ? packed : asph));
  }
  for (const q of V.mounds) { const m = sphere(1.0, SNOW2, 7, 4); m.scale.set(0.8, 0.45, 1.3); add(m, q.x, q.y + 0.05, q.z, 0, q.ry, 0); }   // montes na margem (snowPlan: fora das pistas e acessos)
  const used = new Set(V.segs.flatMap(s => [s.na, s.nb]));             // (só os nós que têm rua: nenhum disco de asfalto solto)
  for (const [k, [x, z]] of Object.entries(V.N)) {
    if (!used.has(k)) continue;
    g.add(new THREE.Mesh(offRamps(place(new THREE.CylinderGeometry(RW / 2, RW / 2, 0.06, 18), M4.makeTranslation(x, V.h(x, z) + 0.034, z))), asph));
  }
  // ladeiras: a pista segue a altura do jogo (V.h, com a concordância das pontas) na mesma altura do asfalto das ruas; dos
  // lados, mureta de pedra que acompanha a subida (0,9 acima da pista) onde a ladeira fica acima do chão de fora e, dentro
  // do recorte do patamar, o muro de arrimo do patamar com a mesma mureta em cima; pilares nas pontas; neve no alto.
  for (const r of V.ramps) {
    const ax = r.axis === 'z', L = ax ? r.z1 - r.z0 : r.x1 - r.x0, W = ax ? r.x1 - r.x0 : r.z1 - r.z0, n = Math.ceil(L);
    const P = ax ? (r.h1 === MIDH ? V.MID : V.HIGH).z0 : (r.h1 === MIDH ? V.MID : V.HIGH).x0, uE = P - (ax ? r.z0 : r.x0) - 0.35;
    const W0 = ax ? r.x0 : r.z0;                                        // começo da largura
    const toW = (u, l, y) => ax ? [W0 + l, y, r.z0 + u] : [r.x0 + u, y, W0 + l];
    const hu = u => rampH(r, u);
    const pos = [];
    for (let i = 0; i < n; i++) {                                       // pista (sem espessura: os muros fecham os lados)
      const u0 = L * i / n, u1 = L * (i + 1) / n, y0 = hu(u0) + 0.065, y1 = hu(u1) + 0.065;
      const a = toW(u0, 0, y0), b = toW(u0, W, y0), c = toW(u1, W, y1), d = toW(u1, 0, y1);
      if (ax) pos.push(...a, ...d, ...c, ...a, ...c, ...b); else pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
    const strip = new THREE.BufferGeometry(); strip.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); strip.computeVertexNormals();
    g.add(new THREE.Mesh(strip, asph));
    for (const side of [-0.3, W + 0.3]) {                               // muros dos dois lados (0,6 de espessura, de fora da pista)
      const sh = new THREE.Shape(); sh.moveTo(0, r.h0 - 0.4); sh.lineTo(uE, r.h0 - 0.4);
      for (let i = Math.ceil(uE); i >= 0; i--) { const u = Math.min(uE, i); sh.lineTo(u, hu(u) + 0.9); }
      const ex = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false, steps: 1 });
      ex.translate(0, 0, -0.3);                                          // centrado na espessura
      const mx = ax ? new THREE.Matrix4().makeRotationY(-Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(W0 + side, 0, r.z0))
                    : new THREE.Matrix4().makeTranslation(r.x0, 0, W0 + side);
      g.add(new THREE.Mesh(place(ex, mx), mat(STONE2)));
      const yTop = r.h1 + 0.9, c0 = toW((uE + L) / 2, side, (r.h0 - 0.4 + yTop) / 2);
      add(box(ax ? 0.6 : L - uE, yTop - r.h0 + 0.4, ax ? L - uE : 0.6, STONE2), ...c0);        // trecho no recorte do patamar
      const capIn = toW((uE + L) / 2, side, yTop + 0.06); add(box(ax ? 0.74 : L - uE + 0.1, 0.14, ax ? L - uE + 0.1 : 0.74, SNOWC), ...capIn);
      for (let i = 0; i < Math.ceil(uE); i++) {                          // neve no alto da mureta inclinada
        const u0 = i, u1 = Math.min(uE, i + 1), y0 = hu(u0) + 0.9, y1 = hu(u1) + 0.9, um = (u0 + u1) / 2, sl = Math.atan2(y1 - y0, u1 - u0), l = Math.hypot(u1 - u0, y1 - y0) + 0.06;
        const c = toW(um, side, (y0 + y1) / 2 + 0.06);
        if (ax) add(box(0.74, 0.14, l, SNOWC), ...c, -sl, 0, 0); else add(box(l, 0.14, 0.74, SNOWC), ...c, 0, 0, sl);
      }
      for (const [u, top] of [[0.35, r.h0 + 1.15], [L - 0.35, r.h1 + 1.15]]) {   // pilares nas pontas
        const c = toW(u, side, (r.h0 - 0.4 + top) / 2), k = toW(u, side, top + 0.07);   // (da largura do muro: não entra na pista)
        add(box(ax ? 0.6 : 0.8, top - r.h0 + 0.4, ax ? 0.8 : 0.6, STONE), ...c); add(box(ax ? 0.74 : 0.9, 0.14, ax ? 0.9 : 0.74, SNOWC), ...k);
      }
    }
  }
  // gelo: lâmina fina sobre o asfalto (1,5 cm acima), com a cor por vértice: nas pontas (as mesmas ~2,4 do efeito na van)
  // ela vai afinando em placas irregulares e asfalto molhado até sumir; no meio, gelo liso com marcas claras das rodas.
  // Nas beiradas, uma franja de neve fina cobre a quina do asfalto e liga o gelo ao acostamento nevado.
  const iceMat = mat('#ffffff', { vertexColors: true, roughness: 0.16, metalness: 0.05, emissive: '#22394a', emissiveIntensity: 0.3 });
  const frostMat = mat('#ffffff', { vertexColors: true });
  const hsh = (x, z) => { const q = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return q - Math.floor(q); };
  const vnoise = (x, z) => {                                           // ruído suave (valor) em ~1,6 m
    const X = x / 1.6, Z = z / 1.6, i = Math.floor(X), j = Math.floor(Z), fx = X - i, fz = Z - j, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = hsh(i, j), b = hsh(i + 1, j), c = hsh(i, j + 1), d = hsh(i + 1, j + 1);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
  const cWet = new THREE.Color('#5d6a78'), cIce = new THREE.Color(ICE), cWhite = new THREE.Color('#eef8ff'), cSnow = new THREE.Color(SNOWC), cSnow2 = new THREE.Color(SNOW2), tmp = new THREE.Color();
  for (const p of V.ice) {
    const [ax0, az0] = p.seg.a, [bx0, bz0] = p.seg.b, L = p.L, ux = (bx0 - ax0) / L, uz = (bz0 - az0) / L, nx = -uz, nz = ux;
    const U0 = p.t0 * L, U1 = p.t1 * L, NU = Math.ceil((U1 - U0) / 0.5), NL = 10, IH = V.ICE_HALF;
    const vx = [], cov = [];
    for (let i = 0; i <= NU; i++) for (let j = 0; j <= NL; j++) {
      const u = U0 + (U1 - U0) * i / NU, l = -IH + 2 * IH * j / NL, x = ax0 + ux * u + nx * l, z = az0 + uz * u + nz * l;
      const d = Math.min(u - U0, U1 - u) / V.ICE_TR, wEnd = d >= 1 ? 1 : d * d * (3 - 2 * d), edge = Math.min(1, (IH - Math.abs(l)) / 0.6);
      const nn = vnoise(x, z) - 0.5, c = Math.max(0, Math.min(1, wEnd * (0.82 + 0.18 * edge) + nn * 0.55 * (1 - 0.7 * wEnd) - (1 - edge) * 0.08));
      vx.push([x, V.h(ax0 + ux * u, az0 + uz * u) + 0.08 + 0.004 * c, z, u, l]); cov.push(c);   // (altura do eixo: a rua não tem caimento de lado)
    }
    const pos = [], col = [];
    const colorOf = k => {
      const [x, , z, u, l] = vx[k], c = cov[k];
      tmp.copy(cWet).lerp(cIce, Math.min(1, c * 1.15));
      const track = Math.exp(-(((Math.abs(l) - 1.15) / 0.22) ** 2)) * (0.5 + 0.5 * Math.sin(u * 0.9 + l * 3)) * c;   // marcas das rodas
      const glint = (hsh(Math.round(x * 3), Math.round(z * 3)) > 0.93 ? 0.35 : 0) * c;
      tmp.lerp(cWhite, Math.min(0.75, track * 0.6 + glint));
      return [tmp.r, tmp.g, tmp.b];
    };
    const id = (i, j) => i * (NL + 1) + j;
    for (let i = 0; i < NU; i++) for (let j = 0; j < NL; j++) {
      const q = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
      for (const tri of [[q[0], q[2], q[1]], [q[0], q[3], q[2]]]) {
        if ((cov[tri[0]] + cov[tri[1]] + cov[tri[2]]) / 3 < 0.2) continue;   // ponta da placa: buracos irregulares (asfalto aparece)
        for (const k of tri) { pos.push(vx[k][0], vx[k][1], vx[k][2]); col.push(...colorOf(k)); }
      }
    }
    // (a ordem dos vértices acima deixa a face para cima tanto no sentido a→b quanto no outro: confere pela normal)
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals(); upFace(geo);
    const m = new THREE.Mesh(geo, iceMat); m.receiveShadow = true; m.castShadow = false; g.add(m);
    // franja de neve nas beiradas (do gelo e um pouco além das pontas)
    const fp = [], fc = [], F0 = Math.max(0, U0 - 2.5), F1 = Math.min(L, U1 + 2.5), NF = Math.ceil((F1 - F0) / 0.6);
    for (const sd of [-1, 1]) {
      const row = [];
      for (let i = 0; i <= NF; i++) {
        const u = F0 + (F1 - F0) * i / NF, x0 = ax0 + ux * u, z0 = az0 + uz * u, fade = Math.min(1, (u - F0) / 2.5, (F1 - u) / 2.5);
        const wv = (0.25 + 0.55 * vnoise(x0 * 1.7 + sd * 40, z0 * 1.7)) * (0.35 + 0.65 * fade), lo = RW / 2 - wv, hi = RW / 2 + 0.05;
        const P1 = [x0 + nx * sd * lo, z0 + nz * sd * lo], P2 = [x0 + nx * sd * hi, z0 + nz * sd * hi];
        const y = V.h(x0, z0) + 0.088;                                   // (altura do eixo da rua: na ladeira a beirada é muro, não patamar)
        row.push([[P1[0], y, P1[1]], [P2[0], y, P2[1]], vnoise(x0 * 3, z0 * 3)]);
      }
      for (let i = 0; i < NF; i++) {
        const a = row[i], b = row[i + 1];
        for (const tri of [[a[0], b[0], b[1]], [a[0], b[1], a[1]]]) for (const v of tri) fp.push(...v);
        for (const k of [a, b, b, a, b, a]) { tmp.copy(cSnow2).lerp(cSnow, k[2]); fc.push(tmp.r, tmp.g, tmp.b); }
      }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
    fg.computeVertexNormals(); upFace(fg);
    const fm = new THREE.Mesh(fg, frostMat); fm.receiveShadow = true; fm.castShadow = false; g.add(fm);
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
    if (d < 78 || (z < 0 && Math.abs(x - 104.6) < 16) || (SNOWV && Math.abs(z - SNOWV.outside.OJ) < 11)) continue;   // (estrada de acesso e a que cruza entram no bosque)
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

// ---------- arredores próximos do Nevasca (fora da sebe) ----------
/** Faixa (fita no chão) ao longo de pontos [x, z], com cor por vértice por coluna: cols = [[l, cor], …] (l de −1 a 1 da
 *  meia-largura). Quinas arredondadas (Catmull-Rom). */
function ribbon(pts, w, y, cols, closed = false, step = 1.2) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / step)), P = curve.getSpacedPoints(n), pos = [], col = [], c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[i + 1], ta = curve.getTangentAt(i / n), tb = curve.getTangentAt((i + 1) / n);
    for (let k = 0; k < cols.length - 1; k++) {
      const [l0, c0] = cols[k], [l1, c1] = cols[k + 1];
      const v = (p, t, l) => [p.x - t.z * l * w / 2, y, p.z + t.x * l * w / 2];
      const A = v(a, ta, l0), B = v(a, ta, l1), C = v(b, tb, l1), D = v(b, tb, l0);
      pos.push(...A, ...C, ...B, ...A, ...D, ...C);
      for (const cc of [c0, c1, c1, c0, c0, c1]) { c.set(cc); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals(); upFace(g);
  return new THREE.Mesh(g, mat('#ffffff', { vertexColors: true }));
}
/** Uma peça (grupo montado com o kit) vira uma malha instanciada com a cor por vértice; mats: [Matrix4]. */
function instanced(group, mats, name) {
  const geo = vcMerge(group).geometry, im = new THREE.InstancedMesh(geo, mat('#ffffff', { vertexColors: true }), Math.max(1, mats.length));
  mats.forEach((m, i) => im.setMatrixAt(i, m)); im.count = mats.length; im.computeBoundingSphere(); im.name = name || 'snow-out'; dynamic(im);
  return im;
}
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _P = new THREE.Vector3(), _S = new THREE.Vector3(), _Y = new THREE.Vector3(0, 1, 0);
const trs = (x, y, z, ry = 0, sx = 1, sy = sx, sz = sx) => _M.compose(_P.set(x, y, z), _Q.setFromAxisAngle(_Y, ry), _S.set(sx, sy, sz)).clone();

/** Casa de fora (cabana de toras, chalé vermelho ou mostarda, casa de sítio ou celeiro): paredes, telhado de duas águas com
 *  neve, chaminé, porta, janelas acesas, varandinha, lenha e neve acumulada no pé das paredes. Centro na origem, frente +Z. */
function cabinModel(c) {
  const g = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const T = { log: ['#7a4f2e', '#4a3a30', '#5c3a22'], red: ['#a8342a', '#3d3a3a', '#f2ede2'], mustard: ['#d4a02a', '#4a4440', '#f2ede2'], farm: ['#e8dcc4', '#8a2f26', '#ffffff'], barn: ['#9e2f25', '#4a4440', '#f2ede2'] }[c.type];
  const [WALL, ROOF, TRIM] = T, W = c.w, D = c.d, barn = c.type === 'barn', farm = c.type === 'farm';
  const H = barn ? 4.2 : farm ? 4.6 : 2.8, rise = barn ? 3.0 : farm ? 2.4 : 2.2, ov = 0.45;
  add(box(W + 0.3, 0.4, D + 0.3, '#8f8b85'), 0, 0.2, 0);                // base de pedra
  add(box(W, H, D, WALL), 0, 0.4 + H / 2, 0);
  if (c.type === 'log') for (let y = 0.75; y < H + 0.3; y += 0.42) for (const sd of [-1, 1]) add(box(W + 0.04, 0.06, 0.05, '#5a3a20'), 0, 0.4 + y - 0.35, sd * (D / 2 + 0.01));   // juntas das toras (frente e fundos)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(box(0.22, H, 0.22, TRIM), sx * (W / 2 - 0.06), 0.4 + H / 2, sz * (D / 2 - 0.06));   // cantos
  // oitões e telhado (cumeeira ao longo de x)
  const gable = new THREE.Shape(); gable.moveTo(-D / 2, 0); gable.lineTo(D / 2, 0); gable.lineTo(0, rise); gable.lineTo(-D / 2, 0);
  const gg = new THREE.ExtrudeGeometry(gable, { depth: W - 0.04, bevelEnabled: false }); gg.rotateY(Math.PI / 2); gg.translate(-(W - 0.04) / 2, 0.4 + H, 0);
  g.add(mesh(gg, WALL));
  const th = Math.atan2(rise, D / 2), sl = (D / 2 + ov) / Math.cos(th), RW = W + 2 * ov;
  for (const sd of [-1, 1]) {
    const cz = sd * (Math.cos(th) * sl / 2 - ov * 0) * 1, cy = 0.4 + H + rise - Math.sin(th) * sl / 2;
    add(box(RW, 0.22, sl, ROOF), 0, cy + 0.1, sd * (sl / 2) * Math.cos(th), sd * th, 0, 0);
    add(box(RW + 0.1, 0.2, sl * 0.94, SNOWC), 0, cy + 0.31, sd * (sl / 2) * Math.cos(th) - sd * 0.02, sd * th, 0, 0);   // neve sobre a água
  }
  add(box(RW + 0.1, 0.26, 0.6, SNOWC), 0, 0.4 + H + rise + 0.28, 0);    // neve na cumeeira
  // chaminé (pedra) com neve em cima
  if (!barn) { const cx = W / 2 - 1.2; add(box(0.7, rise + 1.5, 0.7, '#8f8b85'), cx, 0.4 + H + (rise + 1.5) / 2 - 0.2, -D / 4); add(box(0.86, 0.16, 0.86, SNOWC), cx, 0.4 + H + rise + 1.38, -D / 4); g.userData.chimney = [cx, 0.4 + H + rise + 1.5, -D / 4]; }
  // frente: porta, janelas acesas, varanda
  const FZ = D / 2;
  if (barn) {
    add(box(3.6, 3.2, 0.12, '#7d2620'), 0, 0.4 + 1.6, FZ + 0.04); for (const r of [0.73, -0.73]) add(box(0.14, 4.6, 0.06, TRIM), 0, 0.4 + 1.6, FZ + 0.12, 0, 0, r);   // portão com o X branco
    add(box(3.8, 0.16, 0.1, TRIM), 0, 0.4 + 3.25, FZ + 0.1); add(box(1.0, 1.0, 0.1, '#ffd27a'), 0, 0.4 + H + 1.0, FZ + 0.06);   // janela do feno
  } else {
    add(box(1.0, 2.0, 0.1, '#3b2c1e'), -W / 2 + 1.6, 0.4 + 1.0, FZ + 0.04); add(box(0.08, 0.08, 0.06, '#ffdf6e'), -W / 2 + 1.95, 0.4 + 1.0, FZ + 0.12);   // porta e maçaneta
    for (const x of farm ? [0.4, 2.8] : [W / 2 - 1.6]) { add(box(1.2, 1.0, 0.08, '#ffd27a'), x - (farm ? W / 2 - 1.6 : 0) * 0, 0.4 + 1.6, FZ + 0.05); add(box(1.36, 0.1, 0.12, TRIM), x, 0.4 + 1.08, FZ + 0.08); add(box(0.08, 1.0, 0.1, TRIM), x, 0.4 + 1.6, FZ + 0.09); }
    if (farm) for (const x of [-2.4, 0.4, 2.8]) add(box(1.0, 0.8, 0.08, '#ffd27a'), x, 0.4 + 3.4, FZ + 0.05);   // andar de cima
    add(box(2.2, 0.12, 1.6, '#6b4526'), -W / 2 + 1.6, 0.4 + 2.35, FZ + 0.8); add(box(2.3, 0.14, 1.7, SNOWC), -W / 2 + 1.6, 0.4 + 2.48, FZ + 0.8);   // cobertura da porta com neve
    for (const sx of [-1, 1]) add(box(0.12, 2.3, 0.12, '#5a3a20'), -W / 2 + 1.6 + sx * 0.95, 0.4 + 1.15, FZ + 1.5);
    add(box(2.2, 0.2, 1.6, '#7d5a35'), -W / 2 + 1.6, 0.3, FZ + 0.8);      // degrau
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4 - k; j++) add(cyl(0.16, 0.16, 1.0, k % 2 ? '#8a5a34' : '#6b4526', 6), W / 2 + 0.55, 0.2 + k * 0.28, -D / 2 + 1.0 + j * 0.33 + k * 0.16, Math.PI / 2, 0, 0);   // lenha na lateral
    add(box(1.1, 0.12, 1.6, SNOWC), W / 2 + 0.55, 1.1, -D / 2 + 1.4);
  }
  for (const [x, z, r] of [[-W / 2, D / 2, 1.2], [W / 2, -D / 2, 1.4], [W / 2, D / 2, 0.9], [-W / 2, -D / 2, 1.1]]) { const m = sphere(r, SNOW2, 7, 4); m.scale.set(1.3, 0.35, 1); add(m, x, 0.1, z); }   // neve no pé das paredes
  return g;
}

/** Arredores próximos (snowPlan.outside): trilha em volta da sebe, caminhos, estrada que cruza com montes de neve, balizas
 *  e postes de luz, campos cercados com fardos, casas com fumaça, lago congelado, árvores sem folhas e arbustos nevados.
 *  Devolve o grupo (cenário assado sem sombra, como os arredores de sempre) e os sólidos (world.js os põe em SOLIDS). */
export function buildSnowOutskirts(MAP) {
  const V = SNOWV, O = V.outside, g = new THREE.Group(); g.name = 'snow-outskirts';
  const solids = [], C0 = (ENTRANCE.x0 + ENTRANCE.x1) / 2, OJ = O.OJ, RWo = O.ORW;
  let sd = 9277; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const PACK = '#d6dee6', RUT = '#bcc7d1', EDGE = '#e4eaef';
  // trilha de neve batida em volta da sebe (eixo a RING da borda) e os caminhos até as casas
  const R = O.RING, ring = [];
  for (const [cx, cz, a0] of [[MAP, MAP, 0], [0, MAP, Math.PI / 2], [0, 0, Math.PI], [MAP, 0, -Math.PI / 2]]) for (let k = 0; k <= 4; k++) { const a = a0 + k / 4 * Math.PI / 2; ring.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); }
  const laneCols = [[-1, EDGE], [-0.55, PACK], [-0.35, RUT], [-0.15, PACK], [0.15, PACK], [0.35, RUT], [0.55, PACK], [1, EDGE]];
  g.add(ribbon(ring, 5, -0.012, laneCols, true, 1.5));
  for (const l of O.lanes) g.add(ribbon(l.pts, l.w, -0.016, laneCols));
  // estrada que cruza (asfalto com a beirada de neve suja), faixa amarela, montes das máquinas, balizas
  const X0 = -470, X1 = MAP + 470;
  g.add(ribbon([[X0, OJ], [X1, OJ]], RWo + 1.2, -0.004, [[-1, '#cfd6dd'], [-0.84, '#8e959e'], [-0.78, ASPH], [0.78, ASPH], [0.84, '#8e959e'], [1, '#cfd6dd']], false, 6));
  { const dp = []; for (let x = X0 + 2; x < X1 - 2; x += 2.6) if (Math.abs(x - C0) > RWo) dp.push(x - 0.7, 0.003, OJ - 0.11, x - 0.7, 0.003, OJ + 0.11, x + 0.7, 0.003, OJ + 0.11, x - 0.7, 0.003, OJ - 0.11, x + 0.7, 0.003, OJ + 0.11, x + 0.7, 0.003, OJ - 0.11);   // faixa amarela (só a face de cima)
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); dg.computeVertexNormals(); g.add(new THREE.Mesh(dg, mat('#e8c84a'))); }
  // montes de neve deixados pelas máquinas na beira das estradas: um aterro contínuo de cada lado (altura e largura irregulares,
  // pontas baixando; aberto nos cruzamentos, na trilha em volta da sebe e nas entradas das casas) e um bloco solto aqui e ali
  const bankM = [], poleM = [];
  const laneX = O.lanes.filter(l => Math.abs(l.pts[0][1] - (OJ - 3.5)) < 0.1).map(l => l.pts[0][0]);
  const bPos = [], bCol = [], cEdge = new THREE.Color('#cdd6de'), cTop = new THREE.Color(SNOWC), cMid = new THREE.Color(SNOW2), cc = new THREE.Color();
  const PROF = [[0, 0], [0.16, 0.5], [0.42, 1], [0.74, 0.62], [1, 0]];
  const wob = (u, k) => 0.5 + 0.28 * Math.sin(u * 0.61 + k) + 0.22 * Math.sin(u * 1.73 + k * 2.3);   // 0..1, suave
  const berm = (ax, az, bx, bz, off, sd, w, hmax, k0) => {                // de a para b, do lado sd (+1 = à direita de quem vai)
    const L = Math.hypot(bx - ax, bz - az); if (L < 2) return;
    const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * sd, nz = ux * sd, n = Math.ceil(L / 1.4);
    const V3 = (i, j) => {
      const u = L * i / n, e = Math.sqrt(Math.max(0, Math.min(1, u / 2, (L - u) / 2))), q = wob(u + ax + az, k0), [o, hh] = PROF[j];
      const l = off + o * w * (0.75 + 0.45 * q) * (0.6 + 0.4 * e), y = -0.01 + hh * hmax * (0.4 + 0.6 * q) * e;
      return [ax + ux * u + nx * l, y, az + uz * u + nz * l, j === 0 ? 0 : hh * (0.5 + 0.5 * q)];
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < PROF.length - 1; j++) {
      const A2 = V3(i, j), B2 = V3(i + 1, j), C2 = V3(i + 1, j + 1), D2 = V3(i, j + 1);
      for (const v of [A2, B2, C2, A2, C2, D2]) { bPos.push(v[0], v[1], v[2]); if (v[3] === 0) cc.copy(cEdge); else cc.copy(cMid).lerp(cTop, Math.min(1, v[3] * 1.3)); bCol.push(cc.r, cc.g, cc.b); }
    }
    for (let u = 5 + Math.abs(k0 * 7) % 8; u < L - 3; u += 17 + (u * 7.3 % 9)) {   // blocos soltos em cima (de vez em quando)
      const q = wob(u, k0 + 1), l = off + w * (0.3 + 0.25 * q);
      bankM.push(trs(ax + ux * u + nx * l, 0.12 + 0.2 * q, az + uz * u + nz * l, u * 1.7, 0.45 + 0.35 * q, 0.25 + 0.15 * q, 0.4 + 0.3 * q));
    }
  };
  const spans = (a0, a1, gaps) => { const out = []; let a = a0; for (const [g0, g1] of gaps.filter(q => q[1] > a0 && q[0] < a1).sort((p, q) => p[0] - q[0])) { if (g0 > a) out.push([a, g0]); a = Math.max(a, g1); } if (a < a1) out.push([a, a1]); return out; };
  const AH = (ENTRANCE.x1 - ENTRANCE.x0) / 2;
  for (const sd of [-1, 1]) {                                          // estrada da serra (sd −1 = lado norte, com as entradas das casas)
    const gaps = [[C0 - AH - 3, C0 + AH + 3], ...(sd < 0 ? laneX.map(lx => [lx - 3.2, lx + 3.2]) : [])];
    for (const [x0, x1] of spans(X0, X1, gaps)) berm(x0, OJ, x1, OJ, RWo / 2 + 0.55, sd, 2.4, 0.62, x0 * 0.13 + sd);
  }
  for (const sd of [-1, 1]) for (const [z0, z1] of spans(-420, -2.5, [[OJ - RWo / 2 - 2, OJ + RWo / 2 + 2], [-R - 3.6, -R + 3.6]]))   // e a de acesso (abre na trilha)
    berm(C0, z0, C0, z1, AH + 0.5, sd, 2.0, 0.5, z0 * 0.11 + sd * 3);
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bPos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(bCol, 3)); upFace(bg);
  g.add(new THREE.Mesh(bg, mat('#ffffff', { vertexColors: true })));
  const bankPiece = new THREE.Group(); { const m = sphere(1, SNOW2, 7, 4); bankPiece.add(m); const t2 = sphere(0.7, SNOWC, 6, 3); t2.position.set(0.2, 0.35, 0); bankPiece.add(t2); }
  g.add(instanced(bankPiece, bankM, 'snow-banks'));
  for (let x = X0 + 40, k = 0; x < X1 - 40; x += 17, k++) { if (Math.abs(x - C0) < 9) continue; poleM.push(trs(x, 0, OJ + (k % 2 ? 1 : -1) * (RWo / 2 + 0.55))); }
  for (let z = -6, k = 0; z > -300; z -= 15, k++) { if (Math.abs(z - OJ) < 7) continue; poleM.push(trs(C0 + (k % 2 ? 1 : -1) * ((ENTRANCE.x1 - ENTRANCE.x0) / 2 + 0.55), 0, z)); }
  const pole = new THREE.Group(); pole.add(at(cyl(0.045, 0.05, 1.7, '#ff6a1a', 5), 0, 0.85, 0)); pole.add(at(cyl(0.047, 0.047, 0.22, '#1d1d1f', 5), 0, 1.55, 0)); pole.add(at(cyl(0.048, 0.048, 0.08, '#f4f4f4', 5), 0, 1.36, 0));
  g.add(instanced(pole, poleM, 'snow-poles'));
  // postes de luz de madeira com fios (ao norte da estrada)
  const PZ = OJ - 6.5, posts = [];
  for (let x = -250; x < MAP + 250; x += 32) { if (laneX.some(lx => Math.abs(x - lx) < 5) || Math.abs(x - C0) < 8) continue; posts.push(x); }
  const post = new THREE.Group(); post.add(at(cyl(0.16, 0.2, 8, '#6b4a30', 6), 0, 4, 0)); post.add(at(box(0.16, 0.16, 2.4, '#5a3a22'), 0, 7.5, 0));
  for (const z of [-1.0, 0, 1.0]) post.add(at(cyl(0.06, 0.06, 0.22, '#dfe6ea', 5), 0, 7.68, z)); post.add(at(box(0.2, 0.08, 2.5, SNOWC), 0, 7.62, 0));
  g.add(instanced(post, posts.map(x => trs(x, 0, PZ, Math.PI / 2)), 'snow-power'));
  for (const x of posts) solids.push({ x0: x - 0.3, x1: x + 0.3, z0: PZ - 0.3, z1: PZ + 0.3 });
  const wire = [];
  for (let i = 0; i < posts.length - 1; i++) { const a = posts[i], b = posts[i + 1]; for (const z of [-1.0, 0, 1.0]) for (let k = 0; k < 8; k++) { const u0 = k / 8, u1 = (k + 1) / 8, sag = u => 7.68 - 0.7 * 4 * u * (1 - u); wire.push(a + (b - a) * u0, sag(u0), PZ + z, a + (b - a) * u1, sag(u1), PZ + z); } }
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
  const wl = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: '#3a3d44' })); wl.name = 'snow-wires'; g.add(dynamic(wl));
  // campos cercados ao norte: cerca de varas com neve, portão aberto do lado da estrada de acesso, fardos sob a neve
  const fenceM = [];
  for (const f of O.fields) {
    const sides = [[f.x0, f.z0, f.x1, f.z0, 'z0'], [f.x1, f.z0, f.x1, f.z1, 'x1'], [f.x1, f.z1, f.x0, f.z1, 'z1'], [f.x0, f.z1, f.x0, f.z0, 'x0']];
    for (const [ax, az, bx, bz, nm] of sides) {
      const L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bz - az, bx - ax), n = Math.round(L / 3), gate = nm === f.gate;
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n; if (gate && Math.abs(u - 0.5) * L < 3) continue;   // portão aberto no meio
        fenceM.push(trs(ax + (bx - ax) * u, 0, az + (bz - az) * u, -ry, L / n / 3, 1, 1));
      }
      const mid = gate ? [[0, 0.5 - 3 / L], [0.5 + 3 / L, 1]] : [[0, 1]];
      for (const [u0, u1] of mid) { const x0 = ax + (bx - ax) * u0, x1 = ax + (bx - ax) * u1, z0 = az + (bz - az) * u0, z1 = az + (bz - az) * u1; solids.push({ x0: Math.min(x0, x1) - 0.12, x1: Math.max(x0, x1) + 0.12, z0: Math.min(z0, z1) - 0.12, z1: Math.max(z0, z1) + 0.12 }); }
    }
  }
  const fence = new THREE.Group();
  fence.add(at(box(0.16, 1.25, 0.16, '#6b4a30'), -1.5, 0.62, 0)); fence.add(at(box(0.24, 0.12, 0.24, SNOWC), -1.5, 1.28, 0));
  for (const y of [0.55, 1.0]) { fence.add(at(box(3.0, 0.1, 0.08, '#8a6040'), 0, y, 0)); }
  fence.add(at(box(3.0, 0.07, 0.14, SNOWC), 0, 1.08, 0));
  g.add(instanced(fence, fenceM, 'snow-fences'));
  const baleM = O.bales.map(([x, z], i) => trs(x, 0, z, i * 0.7 + 0.3));
  const bale = new THREE.Group(); bale.add(at(cyl(0.75, 0.75, 1.2, '#c9a54a', 10), 0, 0.75, 0, Math.PI / 2, 0, 0)); { const t2 = sphere(0.8, SNOWC, 8, 4); t2.scale.set(0.95, 0.45, 0.8); bale.add(at(t2, 0, 1.3, 0)); }
  g.add(instanced(bale, baleM, 'snow-bales'));
  for (const [x, z] of O.bales) solids.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 0.8, z1: z + 0.8 });
  // casas (uma malha só), fumaça das chaminés e neve no caminho de cada porta
  const houses = new THREE.Group(), chim = [];
  for (const c of O.cabins) {
    const m = cabinModel(c), ry = { 'z+': 0, 'x+': Math.PI / 2, 'z-': Math.PI, 'x-': -Math.PI / 2 }[c.face];
    m.position.set(c.x, 0, c.z); m.rotation.y = ry; houses.add(m);
    if (m.userData.chimney) { const [a, b2, z2] = m.userData.chimney; const p2 = new THREE.Vector3(a, b2, z2).applyAxisAngle(_Y, ry); chim.push([c.x + p2.x, p2.y, c.z + p2.z]); }
    solids.push({ ...c.box });
  }
  g.add(vcMerge(houses));
  const puffMat = new THREE.MeshLambertMaterial({ color: '#f2f4f6', transparent: true, opacity: 0.55, depthWrite: false });
  const puffs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), puffMat, chim.length * 5); puffs.name = 'snow-smoke'; puffs.frustumCulled = false; dynamic(puffs); g.add(puffs);
  puffs.onBeforeRender = () => {
    const t = performance.now() / 1000;
    chim.forEach(([x, y, z], i) => { for (let k = 0; k < 5; k++) { const u = (t * 0.22 + k / 5 + i * 0.37) % 1; puffs.setMatrixAt(i * 5 + k, trs(x + u * 1.6 + Math.sin(u * 6 + i) * 0.2, y + u * 4.2, z + u * 0.6, u * 3, 0.5 + u * 1.6)); } });
    puffs.instanceMatrix.needsUpdate = true;
  };
  // lago congelado com a margem de neve, juncos secos e um banco
  const P = O.pond, pg = new THREE.CircleGeometry(1, 40); pg.rotateX(-Math.PI / 2);
  const pv = pg.attributes.position, pc = [], cI = new THREE.Color(ICE), cD = new THREE.Color('#8fbcd6');
  for (let i = 0; i < pv.count; i++) { const x = pv.getX(i), z = pv.getZ(i), d = Math.hypot(x, z); const c2 = cD.clone().lerp(cI, Math.min(1, d * 1.2)); pc.push(c2.r, c2.g, c2.b); pv.setXYZ(i, P.x + x * P.rx, -0.01, P.z + z * P.rz); }
  pg.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3)); pg.deleteAttribute('uv');
  g.add(new THREE.Mesh(pg, mat('#ffffff', { vertexColors: true, roughness: 0.16, metalness: 0.05, emissive: '#22394a', emissiveIntensity: 0.3 })));
  // margem: um aterro de neve contínuo (sobe da beira do gelo e desce para o campo, altura irregular) com alguns blocos soltos
  {
    const NA = 96, rows = [[0, 0.015], [0.35, 0.2], [0.9, 0.34], [1.6, 0.22], [2.6, 0.0]], pos = [], col = [], cA = new THREE.Color(SNOWC), cB = new THREE.Color(SNOW2), c2 = new THREE.Color();
    const pt = (k, j) => {
      const a = k / NA * Math.PI * 2, n = 0.65 + 0.35 * Math.sin(a * 5 + 1.3) * Math.cos(a * 3 - 0.4), [o, hh] = rows[j];
      return [P.x + Math.cos(a) * (P.rx + 0.05 + o * (0.8 + 0.4 * n)), -0.012 + hh * (0.6 + 0.8 * n), P.z + Math.sin(a) * (P.rz + 0.05 + o * (0.8 + 0.4 * n)), n];
    };
    for (let k = 0; k < NA; k++) for (let j = 0; j < rows.length - 1; j++) {
      const A2 = pt(k, j), B2 = pt(k + 1, j), C2 = pt(k + 1, j + 1), D2 = pt(k, j + 1);
      for (const v of [A2, C2, B2, A2, D2, C2]) { pos.push(v[0], v[1], v[2]); c2.copy(cB).lerp(cA, Math.min(1, 0.3 + v[3] * 0.8)); col.push(c2.r, c2.g, c2.b); }
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); upFace(bg);
    g.add(new THREE.Mesh(bg, mat('#ffffff', { vertexColors: true })));
    const rimM = [];
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + r() * 0.5; rimM.push(trs(P.x + Math.cos(a) * (P.rx + 1.1), 0.05, P.z + Math.sin(a) * (P.rz + 1.1), -a, 0.55 + r() * 0.35, 0.28 + r() * 0.12, 0.45 + r() * 0.2)); }
    g.add(instanced(bankPiece, rimM, 'snow-pond-rim'));
  }
  const reed = new THREE.Group(); for (let k = 0; k < 6; k++) reed.add(at(cyl(0.025, 0.035, 1.1 + (k % 3) * 0.25, '#a58a55', 4), (k % 3 - 1) * 0.18, 0.55, (k > 2 ? 1 : -1) * 0.12, (k - 2.5) * 0.08, 0, (k % 2 - 0.5) * 0.2));
  const reedM = []; for (let k = 0; k < 9; k++) { const a = 2.2 + k * 0.42 + r() * 0.2; reedM.push(trs(P.x + Math.cos(a) * (P.rx + 0.2), 0, P.z + Math.sin(a) * (P.rz + 0.2), r() * 3, 0.9 + r() * 0.3)); }
  g.add(instanced(reed, reedM, 'snow-reeds'));
  const bench = new THREE.Group(); bench.add(at(box(1.8, 0.08, 0.5, '#7d5a35'), 0, 0.48, 0)); bench.add(at(box(1.8, 0.4, 0.08, '#7d5a35'), 0, 0.75, -0.22)); for (const x of [-0.75, 0.75]) bench.add(at(box(0.1, 0.48, 0.45, '#3a3d44'), x, 0.24, 0)); bench.add(at(box(1.8, 0.1, 0.5, SNOWC), 0, 0.57, 0));
  bench.position.set(P.x + P.rx * 0.2, 0, P.z - P.rz - 2.2); bench.rotation.y = Math.PI; g.add(bench);
  solids.push({ x0: bench.position.x - 1, x1: bench.position.x + 1, z0: bench.position.z - 0.4, z1: bench.position.z + 0.4 });
  // árvores sem folhas (carvalho escuro ou bétula branca), neve nos galhos; arbustos nevados
  const oak = new THREE.Group(), birch = new THREE.Group();
  for (const [grp, bark, h0] of [[oak, '#4e3b2c', 3.6], [birch, '#e8e4dc', 4.4]]) {
    grp.add(at(cyl(0.16, 0.26, h0, bark, 6), 0, h0 / 2, 0));
    for (let k = 0; k < 5; k++) { const a = k * 1.3, y = h0 * (0.55 + k * 0.09), L = 1.6 - k * 0.15; grp.add(at(cyl(0.05, 0.09, L, bark, 4), Math.cos(a) * L * 0.35, y + 0.35, Math.sin(a) * L * 0.35, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9)); grp.add(at(box(0.16, 0.06, L * 0.6, SNOWC), Math.cos(a) * L * 0.4, y + 0.55, Math.sin(a) * L * 0.4, 0, -a + Math.PI / 2, 0)); }
    grp.add(at(cyl(0.05, 0.08, 1.4, bark, 4), 0, h0 + 0.6, 0));
    if (bark === '#e8e4dc') for (let k = 0; k < 6; k++) grp.add(at(box(0.18, 0.05, 0.18, '#2b2b2b'), 0, 0.6 + k * 0.6, 0, 0, k * 1.1, 0));   // marcas da bétula
  }
  for (const [grp, list] of [[oak, O.bare.filter(b => !b.birch)], [birch, O.bare.filter(b => b.birch)]]) g.add(instanced(grp, list.map(b => trs(b.x, 0, b.z, b.rot, b.s)), 'snow-bare'));
  for (const b of O.bare) solids.push({ x0: b.x - 0.3, x1: b.x + 0.3, z0: b.z - 0.3, z1: b.z + 0.3 });
  const shrub = new THREE.Group(); { const m = sphere(1, '#dfe7ee', 8, 5); m.scale.set(1.2, 0.7, 1.0); shrub.add(at(m, 0, 0.45, 0)); for (let k = 0; k < 5; k++) shrub.add(at(cyl(0.02, 0.03, 0.6, '#5a4632', 3), Math.cos(k * 1.3) * 0.7, 0.95, Math.sin(k * 1.3) * 0.55, Math.sin(k) * 0.4, 0, Math.cos(k) * 0.4)); }
  g.add(instanced(shrub, O.shrubs.map(b => trs(b.x, 0, b.z, b.rot, b.s)), 'snow-shrubs'));
  for (const b of O.shrubs) solids.push({ x0: b.x - 0.35 * b.s, x1: b.x + 0.35 * b.s, z0: b.z - 0.35 * b.s, z1: b.z + 0.35 * b.s });
  // ondulações de neve soprada pelo campo (relevo baixo, sem colisão), longe das estradas e caminhos
  const drift = new THREE.Group(); { const m = sphere(1, '#f3f6f9', 9, 4); drift.add(m); }
  const driftM = [];
  for (let k = 0, t = 0; k < 90 && t < 3000; t++) {
    const x = -70 + r() * (MAP + 140), z = -70 + r() * (MAP + 140), d = Math.hypot(Math.max(-x, 0, x - MAP), Math.max(-z, 0, z - MAP));
    if (d < 12 || d > 72 || Math.abs(z - OJ) < 8 || (z < 0 && Math.abs(x - C0) < 14) || O.laneDist(x, z) < 4 || O.cabins.some(c => Math.hypot(c.x - x, c.z - z) < 12) || Math.hypot((x - P.x) / (P.rx + 5), (z - P.z) / (P.rz + 5)) < 1) continue;
    driftM.push(trs(x, -0.25, z, r() * 3, 3 + r() * 4, 0.45 + r() * 0.3, 1.6 + r() * 2)); k++;
  }
  g.add(instanced(drift, driftM, 'snow-drifts'));
  return { group: g, solids };
}

/** Monte de neve que fecha um atalho (escala 1 = fechado): comprido de través na pista (o lado longo cruza a rua), com o
 *  topo irregular e a beirada de neve solta. A direção vem do atalho em que ele está (SNOWV.cuts, achado pela posição no
 *  primeiro desenho: main.js só o põe no lugar). */
export function buildSnowBank() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  for (const [x, z, r, h] of [[-3.0, 0.1, 2.2, 0.55], [-1.1, -0.2, 2.7, 0.62], [1.1, 0.25, 2.6, 0.66], [3.0, -0.1, 2.2, 0.55], [0.2, -1.5, 1.9, 0.45], [-0.6, 1.6, 1.8, 0.42], [2.2, 1.3, 1.5, 0.4], [-2.4, -1.4, 1.5, 0.38]]) {
    const m = sphere(r, h > 0.5 ? SNOWC : SNOW2, 10, 6); m.scale.set(1, h, 0.8); m.position.set(x, 0.12, z); m.castShadow = true; m.receiveShadow = true; inner.add(m);
  }
  for (let k = 0; k < 7; k++) { const m = sphere(0.35 + (k % 3) * 0.12, '#f7fbff', 6, 4); m.position.set(-3.6 + k * 1.2, 0.12, (k % 2 ? 1 : -1) * (2.1 + (k % 3) * 0.2)); m.scale.y = 0.6; inner.add(m); }   // blocos soltos na beirada
  let set = false;
  inner.children[0].onBeforeRender = () => {
    if (set) return; set = true;
    const cuts = SNOWV && SNOWV.cuts; if (!cuts) return;
    const c = cuts.reduce((b, q) => (Math.hypot(q.x - g.position.x, q.z - g.position.z) < Math.hypot(b.x - g.position.x, b.z - g.position.z) ? q : b));
    inner.rotation.y = c.ry || 0;                                     // o comprido (x local) atravessa o atalho (z local = ao longo dele)
  };
  return g;
}

/** Limpa-neve (frente para +X, origem no meio do comprimento, rodas no chão em y 0): caminhão compacto de cabine
 *  avançada laranja, lâmina curva amarela inclinada (joga a neve para a direita, para a beira da rua) presa por braços e
 *  cilindro hidráulico, caçamba de sal em funil com espalhador girando atrás, para-lamas, balizas nas pontas da lâmina,
 *  motorista de gorro e giroflex âmbar. Nenhuma face encostada em outra no mesmo plano (as peças se encaixam por dentro
 *  umas das outras). As partes fixas viram uma malha só; rodas, giroflex, espalhador e o borrifo de neve andam em
 *  userData.drive(dt, v) (tractors.js), que também lê userData.ride: trajeto suave nas esquinas e inclinação no terreno. */
export function buildPlow() {
  const g = new THREE.Group(), fixed = new THREE.Group();
  const a = (m, x, y, z, rx = 0, ry = 0, rz = 0) => fixed.add(at(m, x, y, z, rx, ry, rz));
  const OR = '#f08a1c', OR2 = '#d9761a', DK = '#2b2d31', STEEL = '#5b5f66', YEL = '#ffc82e';
  const FA = 0.85, RA = -1.75, TR = 0.92, WR = 0.5;                      // eixos, bitola e raio das rodas
  // chassi e caçamba
  a(box(3.9, 0.22, 0.86, DK), -0.5, 0.66, 0);                           // longarinas
  a(box(2.5, 0.2, 1.9, DK), -1.18, 0.87, 0);                            // estrado da caçamba
  const hop = new THREE.CylinderGeometry(1, 0.62, 1.05, 4, 1); hop.rotateY(Math.PI / 4); hop.scale(2.3 / (2 * Math.SQRT1_2), 1, 1.9 / (2 * Math.SQRT1_2));
  a(mesh(hop, OR2), -1.18, 0.97 + 0.525, 0);                            // funil de sal (lados inclinados)
  for (const [w, d, x, z] of [[2.42, 0.08, -1.18, 0.99], [2.42, 0.08, -1.18, -0.99], [0.08, 2.06, -1.18 + 1.19, 0], [0.08, 2.06, -1.18 - 1.19, 0]]) a(box(w, 0.12, d, DK), x, 2.04, z);   // aro de cima
  const salt = sphere(1, '#e6ecf1', 10, 5); salt.scale.set(1.08, 0.22, 0.88); a(salt, -1.18, 2.0, 0);   // sal aparecendo
  for (const sd of [-1, 1]) a(box(0.06, 0.62, 0.06, DK), -0.45, 1.5, sd * 0.84, 0, 0, 0.25);   // escora do funil
  a(box(0.15, 0.15, 1.9, DK), -2.5, 0.72, 0);                           // para-choque de trás
  a(box(0.3, 0.32, 0.3, STEEL), -2.48, 0.98, 0);                        // bica do espalhador
  for (const sd of [-1, 1]) { a(box(0.05, 0.12, 0.2, '#d8261c'), -2.46, 1.02, sd * 0.78); a(box(0.05, 0.08, 0.12, '#ffb020'), -2.46, 1.16, sd * 0.78); }   // lanternas
  // cabine avançada
  a(box(1.5, 0.74, 1.96, OR), 0.9, 1.35, 0);                            // parte de baixo (portas)
  a(box(1.52, 0.1, 1.99, '#f4efe2'), 0.9, 1.16, 0);                     // faixa clara
  for (const [x, z] of [[0.2, 0.92], [0.2, -0.92], [1.6, 0.92], [1.6, -0.92]]) a(box(0.1, 0.66, 0.1, OR), x, 2.05, z);   // colunas
  a(box(0.1, 0.66, 1.82, OR), 0.21, 2.05, 0);                           // parede de trás da cabine
  a(box(1.6, 0.12, 2.04, OR), 0.9, 2.44, 0);                            // teto (um pouco maior que a caixa)
  a(box(1.52, 0.06, 1.8, '#e8a24a'), 0.9, 2.52, 0);                     // tampa do teto (a base entra no teto: nenhuma face no mesmo plano)
  a(box(0.08, 0.38, 1.1, '#24262a'), 1.67, 1.32, 0);                    // grade
  for (const sd of [-1, 1]) { a(box(0.06, 0.14, 0.26, '#fff6c8'), 1.67, 1.56, sd * 0.7); a(box(0.06, 0.08, 0.14, '#ffb020'), 1.67, 1.38, sd * 0.86); }   // faróis e piscas
  a(box(0.22, 0.2, 2.0, DK), 1.78, 0.98, 0);                            // para-choque da frente
  for (const sd of [-1, 1]) {
    a(box(0.05, 0.05, 0.24, DK), 1.52, 2.05, sd * 1.08); a(box(0.08, 0.34, 0.16, DK), 1.52, 2.0, sd * 1.22);   // retrovisores
    a(box(0.22, 0.05, 0.34, DK), 0.55, 0.92, sd * 0.98);                 // degrau da porta
    a(box(0.12, 0.03, 0.04, DK), 0.42, 1.52, sd * 0.995);                // maçaneta
  }
  a(cyl(0.06, 0.06, 1.1, STEEL, 8), 0.08, 2.15, 0.84); a(cyl(0.08, 0.08, 0.06, DK, 8), 0.08, 2.73, 0.84);   // escapamento
  a(box(0.3, 0.1, 1.0, DK), 1.0, 2.58, 0);                              // base do giroflex
  // para-lamas (arcos sobre as rodas)
  const arch = new THREE.CylinderGeometry(0.64, 0.64, 0.44, 12, 1, true, Math.PI / 2, Math.PI); arch.rotateX(Math.PI / 2);
  for (const x of [FA, RA]) for (const sd of [-1, 1]) a(mesh(arch, DK), x, WR, sd * TR);
  // lâmina: perfil curvo (aberto para a frente) feito de faixas, faca de aço embaixo, borda em cima, nervuras atrás,
  // braços até o para-choque e o cilindro hidráulico; inclinada para jogar a neve para a direita
  const blade = new THREE.Group(); blade.position.set(2.2, 0, 0); blade.rotation.y = -0.3; fixed.add(blade);
  const prof = [[0.16, 0.08], [0.05, 0.28], [0.0, 0.5], [0.03, 0.72], [0.13, 0.92], [0.24, 1.0]], BW = 3.1;
  for (let i = 0; i < prof.length - 1; i++) {
    const [x0, y0] = prof[i], [x1, y1] = prof[i + 1], L = Math.hypot(x1 - x0, y1 - y0) + 0.04;
    blade.add(at(box(0.06, L, BW, YEL), (x0 + x1) / 2 - 0.03, (y0 + y1) / 2, 0, 0, 0, -Math.atan2(x1 - x0, y1 - y0)));
  }
  blade.add(at(box(0.1, 0.1, BW + 0.04, STEEL), 0.15, 0.06, 0));        // faca
  blade.add(at(box(0.12, 0.06, BW + 0.04, DK), 0.22, 1.02, 0));         // borda de cima
  for (const z of [-1.1, 0, 1.1]) blade.add(at(box(0.14, 0.86, 0.08, DK), -0.1, 0.52, z));   // nervuras atrás
  for (const sd of [-1, 1]) {                                           // chapas das pontas e balizas
    blade.add(at(box(0.3, 0.9, 0.05, YEL), 0.08, 0.53, sd * (BW / 2 + 0.03)));
    blade.add(at(cyl(0.02, 0.02, 1.2, '#1d1d1f', 5), -0.05, 1.6, sd * (BW / 2 - 0.05))); blade.add(at(sphere(0.06, '#ff6a1a', 6, 4), -0.05, 2.22, sd * (BW / 2 - 0.05)));
  }
  for (let k = 0; k < 4; k++) blade.add(at(box(0.04, 0.12, 0.28, k % 2 ? '#f4f4f4' : '#d8261c'), 0.27, 0.96, -BW / 2 + 0.25 + k * 0.3, 0, 0, -0.5));   // faixa refletiva na ponta esquerda
  for (const sd of [-1, 1]) a(box(0.75, 0.1, 0.1, DK), 1.92, 0.55, sd * 0.55, 0, sd * 0.12, 0.25);   // braços de empurrar
  a(cyl(0.05, 0.05, 0.62, STEEL, 6), 1.98, 0.86, 0, 0, 0, 1.0);          // cilindro hidráulico
  a(box(0.2, 0.3, 0.9, DK), 1.72, 0.66, 0);                             // engate
  const body = vcMerge(fixed); body.castShadow = true; body.receiveShadow = true; g.add(body);
  // vidros (um desenho transparente) e o motorista de gorro (dirige pela esquerda)
  const glass = new THREE.MeshStandardMaterial({ color: '#a9d2ea', transparent: true, opacity: 0.42, roughness: 0.1, depthWrite: false });
  const gl = new THREE.Group();
  gl.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.58, 1.72), glass), 1.6, 2.03, 0));
  for (const sd of [-1, 1]) gl.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.56, 0.04), glass), 0.9, 2.03, sd * 0.955));
  gl.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 1.0), glass), 0.2, 2.08, 0));   // vidro de trás (a parede tem um vão)
  const gm = new THREE.Mesh(mergeGeometries(gl.children.map(m => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); }), false), glass); gm.castShadow = false; g.add(gm);
  const d = buildFigure({ coat: '#2f5f9a', pants: '#3a3d44', hat: 'beanie', hatColor: '#d8473a', scarf: '#efbf2a', glove: '#2b2b2b', sit: 0.42, moving: ['head', 'armL', 'armR'] });
  d.root.position.set(0.72, 0.92, -0.45); d.root.rotation.y = Math.PI / 2; d.root.scale.setScalar(0.8); g.add(d.root);
  if (d.armL && d.armR) { d.armL.rotation.x = -1.0; d.armR.rotation.x = -1.0; }   // mãos no volante
  g.add(at(torus(0.17, 0.03, DK, 5, 12), 1.22, 1.72, -0.45, 0, Math.PI / 2, 0.5));   // volante
  const lamps = [0, 1].map(k => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff8a00', emissiveIntensity: 0.2 })); m.position.set(1.0, 2.625, k ? 0.32 : -0.32); g.add(m); return m; });
  const spinner = new THREE.Group(); spinner.position.set(-2.52, 0.78, 0); g.add(spinner);
  spinner.add(at(cyl(0.3, 0.3, 0.04, STEEL, 10), 0, 0, 0)); for (let k = 0; k < 4; k++) spinner.add(at(box(0.5, 0.06, 0.04, DK), 0, 0.04, 0, 0, k * Math.PI / 4, 0));
  const wheels = [];
  for (const x of [FA, RA]) for (const sd of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(x, WR, sd * TR); g.add(w);
    const t = new THREE.Group(); t.add(at(cyl(WR, WR, 0.36, '#1f2023', 14), 0, 0, 0, Math.PI / 2, 0, 0)); t.add(at(cyl(0.27, 0.27, 0.38, '#c9ccd2', 8), 0, 0, 0, Math.PI / 2, 0, 0));
    t.add(at(cyl(0.1, 0.1, 0.4, '#8d929a', 6), 0, 0, 0, Math.PI / 2, 0, 0));
    for (let k = 0; k < 10; k++) t.add(at(box(0.13, 0.08, 0.37, '#2a2b2e'), Math.cos(k * 0.628) * (WR - 0.02), Math.sin(k * 0.628) * (WR - 0.02), 0, 0, 0, k * 0.628 + Math.PI / 2));   // garras da corrente de neve
    const m = vcMerge(t); m.castShadow = true; w.add(m); wheels.push(w);
  }
  // borrifo: a neve que sai da ponta direita da lâmina (só andando)
  const sprayMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
  const sprayGeo = new THREE.IcosahedronGeometry(0.11, 0);
  const spray = [...Array(14)].map((_, i) => { const m = new THREE.Mesh(sprayGeo, sprayMat); m.castShadow = false; g.add(m); return { m, k: i / 14, j: [Math.sin(i * 7.1), Math.cos(i * 3.7), Math.sin(i * 2.3)] }; });
  const roll = sphere(1, '#f4f8fb', 9, 5); roll.scale.set(0.42, 0.3, 1.1); g.add(at(roll, 2.46, 0.2, 1.2, 0, -0.3, 0));   // neve rolando na frente da ponta direita
  let T = Math.random() * 3, look = 0, lookT = 3, sp = 0;
  g.userData.ride = { turnR: 7, side: 2.0, tilt: true, lift: 0.065, axle: [FA, RA], track: TR };   // (side: no meio da faixa da direita; a lâmina não raspa os muros das ladeiras)
  g.userData.drive = (dt, v) => {
    T += dt; sp += (Math.min(1, v / 3) - sp) * Math.min(1, dt * 3);
    for (const w of wheels) w.rotation.z -= v * dt / WR;
    spinner.rotation.y += dt * 9 * sp;
    const on = (T * 2.4) % 1 < 0.5;                                     // pisca alternado
    lamps[0].material.emissiveIntensity = on ? 2.2 : 0.15; lamps[1].material.emissiveIntensity = on ? 0.15 : 2.2;
    if ((lookT -= dt) <= 0) { look = (Math.random() - 0.5) * 1.2; lookT = 2 + Math.random() * 4; }
    d.head.rotation.y += (look - d.head.rotation.y) * Math.min(1, dt * 2);
    roll.scale.set(0.42, 0.3 * (0.35 + 0.65 * sp), 1.1); roll.visible = sp > 0.05;
    for (const p of spray) {                                            // neve solta saindo da ponta direita da lâmina: sobe num arco
      p.k = (p.k + dt * 1.5) % 1; const u = p.k, [ja, jb, jc] = p.j;    // curto para a direita, se espalha e se desfaz ao cair
      p.m.visible = sp > 0.15;
      p.m.position.set(2.35 + (0.35 + 0.25 * ja) * u, 0.35 + (1.0 + 0.35 * jb) * u - 1.25 * u * u, 1.62 + (1.3 + 0.5 * jc) * u);
      p.m.rotation.set(u * 4 + ja, u * 3 + jb, 0); p.m.scale.setScalar((0.3 + Math.sin(Math.PI * u)) * (1 - 0.65 * u) * sp);
    }
  };
  g.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; } });
  return g;
}
