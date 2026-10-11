// Nível 17 (Órbita): módulos lunares (cilindro em pé, cápsula deitada ou cúpula; branco/creme com faixa colorida, janelas
// circulares, porta de moldura grossa tipo escotilha e antena/parabólica/painéis no teto), o cenário da colônia
// (patamar, rampas, ruas, crateras com pontes, estufa, plataforma com foguete, pedras, túneis, estrelas e a Terra)
// e o traje espacial dos moradores (capacete transparente, mochila).
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, mat, bakeStatic } from './kit.js';
import { MOON_COL } from '../data.js';
import { MOON } from '../moonPlan.js';

const WHITE = '#f1ede2', CREAM = '#e6dcc4', GRAY = '#9da1a7', DARK = '#2b2f36', GLASS = '#5fa3d8', PANEL = '#1d3a7a';
const REG = '#b9bcc0', REG2 = '#a4a8ae', ROAD = '#7d8188';

/** Módulo de entrega centrado na origem, frente (porta) para +Z. */
export function buildMoonLot(h) {
  const root = new THREE.Group(); root.name = 'moon:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { root.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const stripe = MOON_COL[h.stripe], doorC = MOON_COL[h.door], body = h.index % 3 ? WHITE : CREAM;
  add(cyl(7.6, 7.8, 0.12, '#c9cbcf', 24), 0, 0.06, 0);                                    // base de pouso do módulo
  add(box(3.2, 0.13, 4.6, '#d6d8dc'), 0, 0.07, 6.2);                                      // calçada até a rua
  let front = 4, topY = 6, winAt;                                                         // frente (z), topo, janelas
  if (h.shape === 'cyl') {
    const H = h.tall ? 7.2 : 5.2, R = 4;
    add(cyl(R, R, H, body, 20), 0, H / 2, -1); add(sphere(R, body, 20, 8), 0, H, -1).scale.set(1, 0.35, 1);   // teto arredondado
    add(cyl(R + 0.05, R + 0.05, 0.6, stripe, 20), 0, H * 0.62, -1);
    front = 3; topY = H + 1.4;
    winAt = k => { const a = [-0.55, 0.55, 0][k], y = k === 2 ? H * 0.82 : H * 0.42 + (h.tall ? 1 : 0); return { x: Math.sin(a) * R, y, z: -1 + Math.cos(a) * R, ry: a }; };
  } else if (h.shape === 'capsule') {
    const R = 3, L = 7.5;
    add(cyl(R, R, L, body, 18), 0, R + 0.3, -1, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) add(sphere(R, body, 18, 10), s * L / 2, R + 0.3, -1);
    for (const s of [-1, 1]) add(box(0.5, R * 0.6, 1.2, GRAY), s * 2.4, R * 0.3, -1);      // pés
    add(cyl(R + 0.05, R + 0.05, 0.7, stripe, 18), 0, R + 0.3, -1, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) add(cyl(R + 0.05, R + 0.05, 0.3, stripe, 18), s * (L / 2 - 0.4), R + 0.3, -1, 0, 0, Math.PI / 2);
    front = 2; topY = 2 * R + 0.5;
    winAt = k => ({ x: [-2.3, 2.3, 0][k] + (k === 2 ? 0 : 0), y: k === 2 ? R + 2.2 : R + 0.9, z: -1 + (k === 2 ? 1.6 : 2.55), ry: 0, tilt: k === 2 ? -0.95 : -0.3 });
  } else {                                                                                  // cúpula
    const R = 4.8;
    add(sphere(R, body, 22, 11), 0, 0, -1).scale.set(1, 0.95, 1);
    add(cyl(R + 0.02, R + 0.12, 0.7, stripe, 22), 0, 0.5, -1);
    front = 3.8; topY = R * 0.95 + 0.2;
    winAt = k => { const a = [-0.6, 0.6, 0][k], y = k === 2 ? 3.4 : 2.0, r = Math.sqrt(R * R - y * y / 0.9) + 0.02; return { x: Math.sin(a) * r, y, z: -1 + Math.cos(a) * r, ry: a, tilt: -Math.asin(y / R) * 0.9 }; };
  }
  // escotilha: vestíbulo com moldura grossa colorida e porta escura
  const fz = front + 0.6;
  add(box(2.8, 3.0, 2.0, body), 0, 1.5, fz - 0.6);
  for (const [w, hh, x, y] of [[3.3, 0.45, 0, 2.85], [3.3, 0.35, 0, 0.18], [0.45, 2.9, -1.45, 1.5], [0.45, 2.9, 1.45, 1.5]]) add(box(w, hh, 0.5, doorC), x, y, fz + 0.45);
  add(box(2.1, 2.3, 0.12, DARK), 0, 1.4, fz + 0.42); add(box(1.2, 0.12, 0.14, doorC), 0, 1.4, fz + 0.5);
  add(sphere(0.18, '#ffd36b', 8, 6), 0, 3.35, fz + 0.5);                                 // luz sobre a porta
  // janelas circulares com aro
  const glass = mat(GLASS, { emissive: '#1b4a70', emissiveIntensity: 0.35, roughness: 0.25 });
  for (let k = 0; k < h.win; k++) {
    const w = winAt(k), grp = new THREE.Group(); grp.position.set(w.x, w.y, w.z); grp.rotation.set(w.tilt || 0, w.ry, 0, 'YXZ'); root.add(grp);
    grp.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.14, 16), glass), 0, 0, 0.04, Math.PI / 2, 0, 0));
    grp.add(at(torus(0.6, 0.12, GRAY, 6, 16), 0, 0, 0.08));
  }
  // detalhe no teto
  if (h.top === 'antenna') { add(cyl(0.08, 0.1, 3.2, GRAY, 6), 0.8, topY + 1.4, -1.5); add(sphere(0.22, '#e0402a', 8, 6), 0.8, topY + 3.0, -1.5); add(box(1.2, 0.08, 0.08, GRAY), 0.8, topY + 2.2, -1.5); }
  else if (h.top === 'dish') { add(cyl(0.12, 0.14, 1.2, GRAY, 6), 0, topY + 0.4, -1.6); const d = cone(1.3, 0.6, '#e8e8e8', 16); add(d, 0, topY + 1.3, -1.6, -2.4, 0, 0); add(cyl(0.05, 0.05, 0.9, GRAY, 6), 0, topY + 1.5, -1.25, 0.7, 0, 0); }
  else for (const s of [-1, 1]) { add(cyl(0.08, 0.08, 1.4, GRAY, 6), s * 1.6, topY + 0.4, -1.5); add(box(2.6, 0.08, 1.6, PANEL), s * 1.6, topY + 1.1, -1.5, 0.35, 0, 0); for (let k = -1; k <= 1; k++) add(box(0.05, 0.1, 1.62, '#8fb0ee'), s * 1.6 + k * 0.85, topY + 1.12, -1.5, 0.35, 0, 0); }
  return bakeStatic(root);
}

/** Cenário fixo da colônia lunar. */
export function buildMoonScene(g, V, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const { PH, RW, DECK } = MOON;
  // patamar central (regolito) e mureta baixa nas bordas (aberta nas rampas)
  const P = V.PLAT;
  add(box(P.x1 - P.x0, PH - 0.04, P.z1 - P.z0, REG2), (P.x0 + P.x1) / 2, (PH - 0.04) / 2, (P.z0 + P.z1) / 2);
  add(box(P.x1 - P.x0, 0.06, P.z1 - P.z0, REG), (P.x0 + P.x1) / 2, PH - 0.03, (P.z0 + P.z1) / 2);
  for (const r of V.ramps) {
    const along = r.axis === 'z' ? r.z1 - r.z0 : r.x1 - r.x0, len = Math.hypot(along, PH), ang = Math.atan2(r.h1 - r.h0, along), cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    if (r.axis === 'z') { add(box(r.x1 - r.x0, 0.3, len, ROAD), cx, PH / 2 - 0.12, cz, -ang, 0, 0); for (const x of [r.x0 - 0.3, r.x1 + 0.3]) add(box(0.6, PH + 0.8, along, REG2), x, (PH + 0.8) / 2 - 0.4, cz); }
    else { add(box(len, 0.3, r.z1 - r.z0, ROAD), cx, PH / 2 - 0.12, cz, 0, 0, ang); for (const z of [r.z0 - 0.3, r.z1 + 0.3]) add(box(along, PH + 0.8, 0.6, REG2), cx, (PH + 0.8) / 2 - 0.4, z); }
    for (let k = 0; k < 6; k++) { const u = (k + 0.5) / 6, top = (r.h0 + (r.h1 - r.h0) * u) - 0.25; if (top > 0.1) { if (r.axis === 'z') add(box(r.x1 - r.x0, top, along / 6, REG2), cx, top / 2, r.z0 + along * u); else add(box(along / 6, top, r.z1 - r.z0, REG2), r.x0 + along * u, top / 2, cz); } }
  }
  // ruas de regolito batido (mais escuras), com faixas claras nas bordas
  for (const s of V.segs) {
    if (s.type === 'ramp') continue;
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), y = V.h((ax + bx) / 2, (az + bz) / 2) > MOON.PH - 0.1 ? PH : 0;
    add(box(RW, 0.06, len, ROAD), (ax + bx) / 2, y + 0.035, (az + bz) / 2, 0, ry, 0);
    for (const o of [-RW / 2 + 0.3, RW / 2 - 0.3]) add(box(0.18, 0.07, len, '#d8dade'), (ax + bx) / 2 + Math.cos(ry) * o, y + 0.04, (az + bz) / 2 - Math.sin(ry) * o, 0, ry, 0);
  }
  for (const [x, z] of Object.values(V.N)) add(cyl(RW / 2, RW / 2, 0.06, ROAD, 18), x, V.level(x, z) ? PH + 0.034 : 0.034, z);
  // crateras: borda clara e fundo escuro; nas que têm rua, uma ponte curta por cima
  for (const c of V.craters) {
    const rim = torus(c.r, 1.0, '#c9ccd0', 6, 28); add(rim, c.x, 0.15, c.z, Math.PI / 2, 0, 0).scale.set(1, 1, 0.35);
    add(cyl(c.r - 0.6, c.r - 1.8, 0.05, '#6f737a', 24), c.x, 0.06, c.z);
    add(cyl(c.r * 0.45, c.r * 0.45, 0.06, '#5e6268', 18), c.x, 0.08, c.z);
    if (c.bridge) {
      const L = 2 * c.r + 1, alongZ = c.bridge === 'z';
      add(box(alongZ ? RW : L, 0.3, alongZ ? L : RW, '#8d9198'), c.x, DECK - 0.15, c.z);
      for (const s of [-1, 1]) {
        const ox = alongZ ? s * (RW / 2 + 0.1) : 0, oz = alongZ ? 0 : s * (RW / 2 + 0.1);
        add(box(alongZ ? 0.18 : L, 0.9, alongZ ? L : 0.18, '#ffb347'), c.x + ox, DECK + 0.45, c.z + oz);
        for (let k = -2; k <= 2; k++) add(box(0.4, 1.4, 0.4, GRAY), c.x + ox + (alongZ ? 0 : k * c.r / 2.5), DECK - 0.9, c.z + oz + (alongZ ? k * c.r / 2.5 : 0));
      }
    }
  }
  // estufa comunitária transparente com canteiros e plantas
  { const G = V.greenhouse, cx = (G.x0 + G.x1) / 2, cz = (G.z0 + G.z1) / 2, w = G.x1 - G.x0, d = G.z1 - G.z0;
    add(box(w, 0.4, d, '#d6d8dc'), cx, 0.2, cz);
    for (let x = G.x0 + 2; x < G.x1 - 1; x += 3.2) for (const z of [cz - 2.5, cz + 2.5]) { add(box(2.4, 0.6, 1.6, '#7a5a34'), x, 0.7, z); for (let k = 0; k < 3; k++) add(sphere(0.45, k % 2 ? '#3f8f3a' : '#5cae4a', 6, 5), x - 0.7 + k * 0.7, 1.25, z); }
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, w, 24), new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
    gl.position.set(cx, 0.4, cz); gl.rotation.set(0, 0, Math.PI / 2); g.add(gl);           // abóbada de vidro (a metade de baixo fica sob o chão)
    for (let x = G.x0; x <= G.x1 + 0.01; x += w / 4) add(torus(d / 2, 0.1, WHITE, 4, 24), x, 0.4, cz, 0, Math.PI / 2, 0);
  }
  // plataforma de pouso com foguete
  { const { x, z, r } = V.pad;
    add(cyl(r, r + 0.4, 0.6, '#c9ccd0', 24), x, 0.3, z); add(cyl(r * 0.6, r * 0.6, 0.62, '#ffb347', 24), x, 0.31, z); add(cyl(r * 0.5, r * 0.5, 0.64, '#c9ccd0', 24), x, 0.32, z);
    add(cyl(1.5, 1.7, 9, WHITE, 16), x, 5.1, z); add(cone(1.5, 3.2, '#ff7a1a', 16), x, 11.2, z);
    add(cyl(1.55, 1.55, 0.7, '#2f78d0', 16), x, 7.5, z); add(sphere(0.45, GLASS, 10, 8), x, 8.6, z + 1.4);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; add(box(0.2, 2.6, 1.6, '#e0402a'), x + Math.cos(a) * 1.8, 1.9, z + Math.sin(a) * 1.8, 0, -a, 0); }
  }
  // pedras, túneis entre módulos, mureta de regolito em volta e uma torre de antenas no patamar
  for (const p of V.rocks) { const m = sphere(p.s, REG2, 6, 4); m.scale.set(1, 0.6, 0.85); add(m, p.x, p.s * 0.3, p.z, 0, p.x, 0); }
  for (const t of V.tunnels) {
    const dx = t.b.x - t.a.x, dz = t.b.z - t.a.z, L = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
    const tube = cyl(1.1, 1.1, L, WHITE, 12); tube.position.set((t.a.x + t.b.x) / 2, t.y + 1.5, (t.a.z + t.b.z) / 2); tube.rotation.order = 'YXZ'; tube.rotation.set(Math.PI / 2, ry, 0); g.add(tube);
    for (const u of [0.3, 0.7]) { const r = torus(1.15, 0.12, GRAY, 6, 14); r.position.set(t.a.x + dx * u, t.y + 1.5, t.a.z + dz * u); r.rotation.set(0, ry, 0); g.add(r); }
  }
  const ex0 = 100.8, ex1 = 108.4;                                     // mureta de regolito em volta (aberta na entrada, ao norte)
  for (const [x0, z0, x1, z1] of [[0, 0, ex0, 1.6], [ex1, 0, MAP, 1.6], [0, MAP - 1.6, MAP, MAP], [0, 0, 1.6, MAP], [MAP - 1.6, 0, MAP, MAP]]) add(box(x1 - x0, 1.2, z1 - z0, REG2), (x0 + x1) / 2, 0.6, (z0 + z1) / 2);
  { const x = 120, z = 130; add(cyl(0.25, 0.35, 10, GRAY, 6), x, PH + 5, z); add(cone(1.4, 0.7, '#e8e8e8', 14), x, PH + 9, z, -2.2, 0, 0); add(sphere(0.3, '#e0402a', 8, 6), x, PH + 10.2, z); }
  // céu: estrelas e a Terra ao longe
  const N = 900, pos = new Float32Array(N * 3); let sd = 77; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, e = 0.05 + rnd() * 1.4, R = 1300; pos[i * 3] = MAP / 2 + Math.cos(a) * Math.cos(e) * R; pos[i * 3 + 1] = Math.sin(e) * R; pos[i * 3 + 2] = MAP / 2 + Math.sin(a) * Math.cos(e) * R; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; g.add(stars);
  const earth = new THREE.Group(); earth.position.set(MAP / 2 - 300, 420, MAP / 2 + 900); g.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(70, 32, 20), new THREE.MeshBasicMaterial({ color: '#3a7bd5', fog: false })));
  for (const [x, y, z, r] of [[20, 25, 58, 22], [-30, -10, 60, 18], [10, -35, 58, 16], [-15, 40, 54, 14]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: '#4fae5a', fog: false })); c.position.set(x, y, z); c.scale.set(1, 0.7, 0.3); earth.add(c); }
  const cl = new THREE.Mesh(new THREE.SphereGeometry(71.5, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, fog: false })); earth.add(cl);
  return g;
}

/** Traje espacial por cima de um personagem: capacete transparente na cabeça e mochila nas costas. headY: altura da cabeça. */
export function spaceSuit(parent, { headY = 1.55, r = 0.55, back = [0, -0.42], backY = 1.0, color = '#f1ede2' } = {}) {
  const headZ = 0, ry = Math.atan2(-back[0], -back[1]);
  const g = new THREE.Group(); g.name = 'space-suit';
  const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
  glass.position.set(0, headY, headZ); g.add(glass);
  g.add(at(torus(r * 0.82, 0.07, '#d8dade', 6, 18), 0, headY - r * 0.62, headZ, Math.PI / 2, 0, 0));
  g.add(at(box(0.5, 0.6, 0.26, color), back[0], backY, back[1], 0, ry, 0)); g.add(at(box(0.36, 0.08, 0.27, '#2f78d0'), back[0] * 1.03, backY + 0.18, back[1] * 1.03, 0, ry, 0));
  parent.add(g);
  return g;
}
