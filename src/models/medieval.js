// Nível 24 (Medieval): o burgo murado.
//  - buildMedLot(h): casa do burgo (kind 'mvh': pedra, reboco claro, ocre, rosado ou enxaimel; térrea ou sobrado; porta em arco,
//    venezianas, floreiras, estandarte, escudo, barris, lanterna, trepadeira, chaminé com lenha coberta no quintal) ou uma das
//    4 lojas da praça (kind 'mvs': padaria, ferraria, taverna, tecelagem). Lote centrado, chão em y = 0, frente para +z.
//  - buildMedScene(g, V, MAP, HEDGE): cenário fixo (muralha com torres e portão, patamares com muros de arrimo, ruas de pedra,
//    praça com fonte e barracas, depósito, castelo, jardim, largos, travessas, postes e árvores).
// Pedra, paralelepípedos, lajes e grama são texturas desenhadas uma vez (canvas) e mapeadas pelas coordenadas (do lote ou do
// mundo): as peças se encontram sem emenda e cada material vira uma malha só depois de bakeStatic. Marcadores para a vida
// (medievalLife.js): userData.door / smoke / flag / cloth / forge / water / anchor (ver MEDIEVAL_SPEC).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, cone, sphere, torus, at, mat, mesh, bakeStatic, dynamic } from './kit.js';
import { MV_COL } from '../data.js';
import { autumnTree } from './forest.js';

const WOOD_D = '#4b3322', WOOD = '#6e4a2e', WOOD_L = '#94693f', IRON = '#34302d', STONE_L = '#c3baa8', STONE_D = '#857d70';
const WICKER = '#b08a50', LEAF = ['#5d7b3d', '#6b8a45', '#4e6b34'], FLOWER = ['#c8453a', '#e3a63a', '#d77aa0', '#f2ecdc', '#8f6ac4'];
const S_STONE = 3.2, S_COB = 3, S_FLAG = 4.5, S_GRASS = 11;      // tamanho (m) de cada repetição das texturas
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const shade = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();

// ---------- texturas (canvas, uma vez) ----------
function canvasTex(N, draw) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  draw(c.getContext('2d'), N);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function rrect(x, a, b, w, h, r) {
  r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); x.fill();
}
/** Pedras em fiadas (paredes, lajes, paralelepípedos): fileiras de altura rh0..rh1 e peças de largura w0..w1 com tons em volta de
 *  `base` (cinza levemente quente), juntas na cor `joint`; tudo se repete sem emenda (as fileiras fecham em N, as peças dão a volta). */
function courses(x, N, seed, { rh0, rh1, w0, w1, base, vary, joint, gap, round, warm = 7 }) {
  const r = rng(seed);
  x.fillStyle = joint; x.fillRect(0, 0, N, N);
  const rows = []; let y = 0; while (y < N - rh0 * 0.6) { const hh = rh0 + r() * (rh1 - rh0); rows.push(hh); y += hh; }
  const k = N / y; let y0 = 0;
  for (const hh0 of rows) {
    const hh = hh0 * k; let x0 = -r() * w1;
    while (x0 < N) {
      const w = w0 + r() * (w1 - w0), t = base + (r() - 0.5) * vary, wm = r() * warm;
      for (const dx of [0, -N, N]) {
        x.fillStyle = `rgb(${t + wm | 0},${t - 3 | 0},${t - 14 - wm | 0})`; rrect(x, x0 + dx + gap / 2, y0 + gap / 2, w - gap, hh - gap, round);
        x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(x0 + dx + gap / 2 + round / 2, y0 + gap / 2, w - gap - round, Math.max(1, hh * 0.12));   // aresta de cima clara
        x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(x0 + dx + gap / 2 + round / 2, y0 + hh - gap / 2 - hh * 0.12, w - gap - round, hh * 0.12);   // e a de baixo escura
      }
      x0 += w;
    }
    y0 += hh;
  }
}
const MATS = {};
const once = (k, make) => MATS[k] || (MATS[k] = make());
/** Pedra das paredes (casas de pedra, muralha, castelo, muros de arrimo): cor média ≈ MV_COL.fac.stone. */
export const stoneMat = () => once('stone', () => new THREE.MeshStandardMaterial({ map: canvasTex(256, (x, N) => courses(x, N, 11, { rh0: 26, rh1: 42, w0: 36, w1: 86, base: 166, vary: 30, joint: '#857e72', gap: 3, round: 6 })), roughness: 0.95, flatShading: true }));
const LAYER = k => ({ polygonOffset: true, polygonOffsetFactor: -k, polygonOffsetUnits: -2 * k });   // camadas do chão: grama < lajes < pedras < guias
const cobbleMat = () => once('cob', () => new THREE.MeshLambertMaterial({ ...LAYER(2), map: canvasTex(256, (x, N) => courses(x, N, 5, { rh0: 19, rh1: 23, w0: 24, w1: 38, base: 136, vary: 32, joint: '#58534b', gap: 3, round: 6 })) }));
const flagMat = () => once('flag', () => new THREE.MeshLambertMaterial({ ...LAYER(1), map: canvasTex(256, (x, N) => courses(x, N, 9, { rh0: 36, rh1: 62, w0: 46, w1: 104, base: 184, vary: 22, joint: '#948b7a', gap: 3, round: 4 })) }));
const grassMat = () => once('grass', () => new THREE.MeshLambertMaterial({ map: canvasTex(256, (x, N) => {
  const r = rng(21); x.fillStyle = '#8a985c'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 520; i++) {
    const cx = r() * N, cy = r() * N, rr = 5 + r() * 18; x.fillStyle = ['rgba(118,138,74,0.35)', 'rgba(156,168,104,0.32)', 'rgba(146,140,92,0.3)', 'rgba(124,146,86,0.35)'][i % 4];
    for (const [dx, dy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) { x.beginPath(); x.ellipse(cx + dx, cy + dy, rr, rr * (0.6 + r() * 0.4), r() * 3, 0, Math.PI * 2); x.fill(); }
  }
}) }));
const glowMat = () => mat('#ffd88a', { emissive: '#ffae45', emissiveIntensity: 0.62 });           // janelas acesas
const lampMat = () => mat('#fff0c4', { emissive: '#ffc25e', emissiveIntensity: 1.1 });             // vidro das lanternas
const innerMat = () => mat('#33251b', { emissive: '#5a3010', emissiveIntensity: 0.3 });            // penumbra quente atrás das portas
let GLOW_TEX = null;
function glowTex() {
  if (GLOW_TEX) return GLOW_TEX;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,140,0.95)'); gr.addColorStop(0.35, 'rgba(255,180,90,0.35)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  GLOW_TEX = new THREE.CanvasTexture(c); GLOW_TEX.colorSpace = THREE.SRGBColorSpace; return GLOW_TEX;
}

// ---------- utilidades de geometria ----------
/** Marca uma malha para receber UV planar (textura em coordenadas do grupo raiz). */
const tex = (m, S = S_STONE) => { m.userData.uvS = S; return m; };
/** UV planar pelo eixo dominante da normal de cada triângulo, em coordenadas de `root`: as peças marcadas com tex() passam a ter a
 *  geometria no espaço da raiz (transformação zerada), prontas para bakeStatic. Não mexe em nada dentro de grupos dynamic. */
function planarUV(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), M4 = new THREE.Matrix4(), list = [];
  root.traverse(o => { if (o.isMesh && o.userData.uvS) { for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return; list.push(o); } });
  const a = V3(), b = V3(), c = V3();
  for (const o of list) {
    const S = o.userData.uvS; delete o.userData.uvS;
    M4.multiplyMatrices(inv, o.matrixWorld);
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(M4), p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const n = b.clone().sub(a).cross(c.clone().sub(a)), ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      for (let k = 0; k < 3; k++) {
        const x = p.getX(i + k), y = p.getY(i + k), z = p.getZ(i + k);
        const u = ay >= ax && ay >= az ? x : ax >= az ? z : x, v = ay >= ax && ay >= az ? z : y;
        uv[(i + k) * 2] = u / S; uv[(i + k) * 2 + 1] = v / S;
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    o.geometry = geo; root.add(o); o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
  }
}
const VCM = () => once('vc', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true }));
const T4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
const BG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
/** Uma malha só com cor por vértice a partir de peças [geometria, cor, matriz]: portas, estandartes, toldos e tecidos (1 draw call). */
function vcMesh(parts) {
  const col = new THREE.Color();
  const geos = parts.map(([geo, c, m4]) => {
    const g2 = geo.index ? geo.toNonIndexed() : geo.clone(); if (m4) g2.applyMatrix4(m4);
    for (const k of Object.keys(g2.attributes)) if (k !== 'position' && k !== 'normal') g2.deleteAttribute(k);
    col.set(c); const n = g2.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g2.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g2;
  });
  const m = new THREE.Mesh(mergeGeometries(geos, false), VCM()); m.castShadow = m.receiveShadow = true;
  return m;
}
/** Pano retangular (com ponta em V embaixo se `tail`) para estandartes e bandeiras: plano x × y, espessura pequena. */
function clothGeo(w, h, tail = 0, t = 0.035) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, -h); if (tail) { s.lineTo(w / 2, -h + tail); } s.lineTo(0, -h); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
}
/** Estandarte pendurado (pivô no topo, pano descendo em -y no plano local x-y, centrado em x): cor + faixa/emblema claro. */
function hangingBanner(color, w, h, emblem = '#e9dcb8') {
  const parts = [[clothGeo(w, h, h * 0.18), color, T4(-w / 2, 0, -0.018)]];
  parts.push([BG(w, 0.12, 0.05), shade(color, 0.7), T4(0, -0.06, 0)]);                                    // bainha de cima
  parts.push([new THREE.CircleGeometry(w * 0.26, 10), emblem, T4(0, -h * 0.42, 0.02)]);                    // emblema (frente)
  parts.push([new THREE.CircleGeometry(w * 0.26, 10), emblem, T4(0, -h * 0.42, -0.02, 0, Math.PI, 0)]);    // (verso)
  parts.push([BG(w * 0.1, h * 0.5, 0.05), shade(color, 0.6), T4(0, -h * 0.42, 0)]);                       // faixa no emblema
  const grp = new THREE.Group(); grp.add(vcMesh(parts)); grp.userData.flag = true; grp.name = 'flag';
  return dynamic(grp);
}
/** Bandeira num mastro (pivô no mastro, pano para +x). */
function mastFlag(color, w = 1.8, h = 1.15, emblem = '#e9c46a') {
  const parts = [[clothGeo(w, h, 0), color, T4(0, 0, -0.018)], [BG(w * 0.9, h * 0.16, 0.05), emblem, T4(w * 0.5, -h * 0.5, 0)]];
  const grp = new THREE.Group(); grp.add(vcMesh(parts)); grp.userData.flag = true; grp.name = 'flag';
  return dynamic(grp);
}

// ---------- telhado ----------
/**
 * Uma água de telhado em fileiras de telhas (cada fileira um pouco menos inclinada que a água: o pé de cada uma fica saliente,
 * como telhas sobrepostas). R = ponto da cumeeira, d = direção descendo (unitário), L = comprimento até o fim do beiral,
 * ax = eixo horizontal ao longo da cumeeira (unitário), len = largura nesse eixo.
 */
function slope(g, color, R, d, L, ax, len, n = 6, t = 0.11) {
  const nrm = V3().crossVectors(d, ax); if (nrm.y < 0) { ax = ax.clone().negate(); nrm.negate(); }
  const m4 = new THREE.Matrix4();
  for (let k = 0; k < n; k++) {
    const dk = d.clone().addScaledVector(nrm, 0.075).normalize(), nk = V3().crossVectors(dk, ax), Lr = L / n * 1.14;
    const c = R.clone().addScaledVector(d, k * L / n).addScaledVector(nrm, t / 2).addScaledVector(dk, Lr / 2);
    const m = box(len, t, Lr, color); m.position.copy(c); m.quaternion.setFromRotationMatrix(m4.makeBasis(ax, nk, dk)); g.add(m);
  }
}
/** Triângulo (oitão/empena) no plano vertical: pontos [u, y] ao longo de `along` ('x' ou 'z'), espessura th para dentro. */
function gableTri(pts, along, at0, th, material) {
  const s = new THREE.Shape(); s.moveTo(along === 'z' ? -pts[0][0] : pts[0][0], pts[0][1]);
  for (const [u, y] of pts.slice(1)) s.lineTo(along === 'z' ? -u : u, y); s.closePath();
  const m = mesh(new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }), material);
  if (along === 'z') { m.rotation.y = Math.PI / 2; m.position.x = at0; } else m.position.z = at0;
  return m;
}

// ---------- peças pequenas ----------
const ICO = new THREE.IcosahedronGeometry(1, 0), OCT = new THREE.OctahedronGeometry(1, 0);
/** Folhagem low-poly (20 triângulos) e florzinha (8 triângulos): bem mais leves que esferas. */
const blob = (r, color) => { const m = mesh(ICO, color); m.scale.setScalar(r); return m; };
const bud = (r, color) => { const m = mesh(OCT, color); m.scale.setScalar(r); return m; };
function barrel(g, x, y, z, s = 1, lying = false) {
  const b = cyl(0.33 * s, 0.33 * s, 0.9 * s, '#8a5e36', 8); const h1 = cyl(0.345 * s, 0.345 * s, 0.06 * s, IRON, 8), h2 = cyl(0.345 * s, 0.345 * s, 0.06 * s, IRON, 8);
  const mid = cyl(0.36 * s, 0.36 * s, 0.34 * s, '#8a5e36', 8);
  if (lying) { for (const [m, dy] of [[b, 0], [mid, 0], [h1, 0.3], [h2, -0.3]]) g.add(at(m, x + dy * s, y + 0.34 * s, z, 0, 0, Math.PI / 2)); return; }
  g.add(at(b, x, y + 0.45 * s, z), at(mid, x, y + 0.45 * s, z), at(h1, x, y + 0.15 * s, z), at(h2, x, y + 0.75 * s, z));
  g.add(at(cyl(0.29 * s, 0.29 * s, 0.02, WOOD, 8), x, y + 0.905 * s, z));
}
function lantern(g, x, y, z, arm = 0.42, sz = 1) {           // lanterna de ferro presa na parede (frente em +z)
  const P = (m, px, py, pz, rx = 0, ry = 0, rz = 0) => g.add(at(m, px, py, pz, rx, ry, rz));
  P(box(0.14, 0.3, 0.05, IRON), x, y + 0.1, z + 0.025); P(box(0.05, 0.05, arm, IRON), x, y + 0.22, z + arm / 2);
  P(box(0.04, 0.2, 0.04, IRON), x, y + 0.12, z + arm - 0.02);
  const ly = y - 0.06, lz = z + arm;
  P(box(0.24 * sz, 0.32 * sz, 0.24 * sz, lampMat()), x, ly - 0.1 * sz, lz);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(box(0.035, 0.34 * sz, 0.035, IRON), x + dx * 0.12 * sz, ly - 0.1 * sz, lz + dz * 0.12 * sz);
  P(cone(0.22 * sz, 0.18 * sz, IRON, 4), x, ly + 0.15 * sz, lz, 0, Math.PI / 4, 0); P(box(0.27 * sz, 0.04, 0.27 * sz, IRON), x, ly - 0.27 * sz, lz);
}
function flowers(g, x, y, z, w, seed) {                      // floreira: caixa de madeira com flores e folhas
  const r = rng(seed);
  g.add(at(box(w, 0.24, 0.3, WOOD), x, y, z));
  for (let k = 0; k < 3; k++) { const m = blob(0.16, LEAF[k % 3]); m.scale.y = 0.11; g.add(at(m, x - w * 0.32 + k * w * 0.32, y + 0.17, z + 0.02)); }
  for (let k = 0; k < 5; k++) g.add(at(bud(0.1, FLOWER[Math.floor(r() * 5)]), x - w * 0.4 + k * w * 0.2 + (r() - 0.5) * 0.06, y + 0.26 + r() * 0.07, z + 0.07 + (r() - 0.5) * 0.1, r(), r(), 0));
}
function pot(g, x, y, z, s = 1, herb = true) {               // vaso de barro com planta
  g.add(at(cyl(0.2 * s, 0.15 * s, 0.32 * s, '#a8603a', 8), x, y + 0.16 * s, z));
  const m = blob(0.25 * s, herb ? LEAF[1] : LEAF[0]); m.scale.y *= 0.85; g.add(at(m, x, y + 0.45 * s, z));
}
/** Escudo (brasão) na parede: cor + borda de ferro + faixa clara. Frente em +z. */
function shield(g, x, y, z, color, w = 0.6, h = 0.72, ry = 0) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, h / 2); s.lineTo(w / 2, h / 2); s.lineTo(w / 2, 0); s.quadraticCurveTo(w / 2, -h * 0.32, 0, -h / 2); s.quadraticCurveTo(-w / 2, -h * 0.32, -w / 2, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 5 }), sg = new THREE.Group(); sg.position.set(x, y, z); sg.rotation.y = ry; g.add(sg);
  sg.add(mesh(geo, mat(IRON))); const f = mesh(geo, mat(color)); f.scale.set(0.86, 0.86, 1); sg.add(at(f, 0, -0.01, 0.03));
  sg.add(at(box(w * 0.16, h * 0.62, 0.03, '#e8dcbc'), 0, 0.02, 0.1), at(box(w * 0.62, h * 0.12, 0.03, '#e8dcbc'), 0, 0.1, 0.1));
}

/** Enxaimel numa fachada (frente em zf): vigas de base, do meio (ym) e do topo, esteios nos cantos e dos lados das aberturas
 *  (ops = [[x, largura]]) e escoras diagonais nos painéis cegos (embaixo de ym no térreo, `low`; em cima de ym nos outros). */
function timberFrame(P, X0, X1, y0, y1, zf, ops, ym, low) {
  const zb = zf + 0.03, W = X1 - X0, beam = y => P(box(W, 0.17, 0.08, WOOD_D), (X0 + X1) / 2, y, zb);
  beam(y0); beam(y1); beam(ym);
  const posts = [X0 + 0.09, X1 - 0.09]; for (const [x, w] of ops) posts.push(x - w / 2 - 0.2, x + w / 2 + 0.2);
  posts.sort((a, b) => a - b);
  const ps = posts.filter((x, i) => i === 0 || x - posts[i - 1] > 0.3);
  for (const x of ps) P(box(0.17, y1 - y0, 0.08, WOOD_D), x, (y0 + y1) / 2, zb);
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i], b = ps[i + 1], mid = (a + b) / 2;
    if (b - a < 0.75 || ops.some(([x, w]) => Math.abs(x - mid) < w / 2 + 0.3)) continue;
    const yy0 = (low ? y0 : ym) + 0.08, yy1 = (low ? ym : y1) - 0.08, wd = b - a - 0.17, len = Math.hypot(wd, yy1 - yy0);
    P(box(0.15, len, 0.07, WOOD_D), mid, (yy0 + yy1) / 2, zb, 0, 0, (i % 2 ? 1 : -1) * Math.atan2(wd, yy1 - yy0));
  }
}

// ---------- porta ----------
/** Folha da porta (grupo `door`, dobradiça na borda esquerda = origem; abre para dentro com rotation.y > 0). */
function doorLeaf(color, arch, w = 1.2, hgt = 2.2) {
  const parts = [], dark = shade(color, 0.72);
  if (arch) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, hgt - w / 2); s.absarc(w / 2, hgt - w / 2, w / 2, 0, Math.PI, false); s.lineTo(0, 0);
    parts.push([new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 9 }), color, T4(0, 0, -0.04)]);
  } else parts.push([BG(w, hgt, 0.08), color, T4(w / 2, hgt / 2, 0)]);
  const top = arch ? hgt - w / 2 : hgt - 0.04;
  for (let k = 1; k < 4; k++) { const hk = arch ? top + Math.sqrt(Math.max(0, (w / 2) ** 2 - (w * k / 4 - w / 2) ** 2)) - 0.05 : top; parts.push([BG(0.025, hk - 0.04, 0.02), dark, T4(w * k / 4, (hk - 0.04) / 2 + 0.02, 0.045)]); }
  for (const y of [0.42, top - 0.4]) parts.push([BG(w * 0.72, 0.075, 0.025), IRON, T4(w * 0.36, y, 0.05)]);   // ferragens (dobradiças compridas)
  parts.push([new THREE.TorusGeometry(0.075, 0.018, 3, 7), IRON, T4(w - 0.22, 1.05, 0.06)]);                      // argola
  parts.push([BG(0.1, 0.12, 0.03), IRON, T4(w - 0.22, 1.16, 0.05)]);
  const grp = new THREE.Group(); grp.add(vcMesh(parts)); grp.name = 'door'; grp.userData.door = true;
  return dynamic(grp);
}

// =====================================================================================================================
// Casa do burgo
// =====================================================================================================================
export function buildMedLot(h) {
  const g = h.kind === 'mvs' ? buildShop(h) : buildHouse(h);
  planarUV(g);
  bakeStatic(g);
  return g;
}

function buildHouse(h) {
  const g = new THREE.Group(); g.name = 'mvh';
  const P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const R = rng(h.index * 7919 + 101), C = MV_COL, two = h.floors === 2;
  const isStone = h.fac === 'stone', timber = h.fac === 'timber', facC = C.fac[h.fac], roofC = C.roof[h.roofc];
  const WM = isStone ? stoneMat() : mat(facC), T = m => (isStone ? tex(m) : m);
  const X0 = -4.78, X1 = 4.78, W = X1 - X0, ZB = -3.2, ZF = 5.0, ZC = 3.45;
  const H1 = two ? 3.3 + R() * 0.12 : 3.8 + R() * 0.22, H = two ? H1 + 2.95 + R() * 0.2 : H1;
  const J = two && h.jetty ? 0.5 : 0, ZU = ZF + J, topF = J ? H1 : H;
  const DX = -1.4, DW = 1.2, DH = 2.2, dl = DX - DW / 2, dr = DX + DW / 2;
  const TRIM = timber ? WOOD_D : STONE_L;
  const wallBox = (x0, x1, y0, y1, z0, z1) => T(P(box(+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3), +(z1 - z0).toFixed(3), WM), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  // ---- corpo: bloco de trás + frente com o vão da porta (escuro e quente lá dentro); andar de cima avançado (jetty) ----
  wallBox(X0, X1, 0, topF, ZB, ZC);
  wallBox(X0, dl, 0, topF, ZC, ZF); wallBox(dr, X1, 0, topF, ZC, ZF); wallBox(dl, dr, DH, topF, ZC, ZF);
  if (J) {
    wallBox(X0, X1, H1, H, ZB, ZU);
    for (let x = X0 + 0.45; x < X1; x += 1.05) if (!h.shield || Math.abs(x - DX) > 0.55) P(box(0.2, 0.22, J + 0.06, timber ? WOOD_D : STONE_L), x, H1 - 0.11, ZF + J / 2 - 0.03);   // mísulas sob o andar avançado
    P(box(W, 0.16, 0.2, timber ? WOOD_D : STONE_L), 0, H1 + 0.06, ZU + 0.04);
  }
  const lin = innerMat();
  P(box(DW, DH, 0.05, lin), DX, DH / 2, ZC + 0.025);
  for (const x of [dl + 0.012, dr - 0.012]) P(box(0.024, DH, ZF - ZC, lin), x, DH / 2, (ZC + ZF) / 2);
  P(box(DW, 0.024, ZF - ZC, lin), DX, DH - 0.012, (ZC + ZF) / 2);
  P(box(DW, 0.03, ZF - ZC, '#4a3a2c'), DX, 0.015, (ZC + ZF) / 2);
  const dg = doorLeaf(C.door[h.doorc], h.arch, DW, DH); dg.position.set(dl, 0.03, ZF - 0.16); g.add(dg);
  if (h.arch) {                                                       // porta em arco: tímpano fechando os cantos, aduelas e ombreiras de pedra
    const r0 = DW / 2, yc = DH - r0, s = new THREE.Shape();
    s.moveTo(-r0, yc); s.lineTo(-r0, DH + 0.002); s.lineTo(r0, DH + 0.002); s.lineTo(r0, yc); s.absarc(0, yc, r0 - 0.012, 0, Math.PI, false); s.closePath();
    T(P(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 10 }), WM), DX, 0, ZF - 0.1));
    for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; P(box(k === 4 ? 0.3 : 0.24, k === 4 ? 0.38 : 0.3, 0.1, STONE_L), DX + Math.cos(a) * (r0 + 0.15), yc + Math.sin(a) * (r0 + 0.15), ZF + 0.05, 0, 0, a - Math.PI / 2); }
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) P(box(k % 2 ? 0.24 : 0.34, yc / 3 - 0.03, 0.1, STONE_L), DX + sx * (r0 + 0.12 + (k % 2 ? 0 : 0.05)), (k + 0.5) * yc / 3, ZF + 0.05);
  } else {
    P(box(DW + 0.44, 0.22, 0.12, TRIM), DX, DH + 0.11, ZF + 0.06);
    for (const sx of [-1, 1]) P(box(0.16, DH, 0.1, TRIM), DX + sx * (DW / 2 + 0.08), DH / 2, ZF + 0.05);
  }
  P(box(1.7, 0.16, 0.75, STONE_L), DX, 0.08, ZF + 0.38); P(box(1.1, 0.02, 0.5, '#b6ad9b'), DX + 0.05, 0.165, ZF + 0.42);   // degrau gasto (no meio, mais liso e escuro)
  // ---- janelas (vidro aceso, moldura, travessas, venezianas, floreiras) ----
  const glow = glowMat(), shutC = h.shut ? C.shut[h.shut] : null;
  const win = (x, y, w, hh, z, flower = false, small = false) => {
    P(box(w, hh, 0.06, glow), x, y + hh / 2, z + 0.01);
    P(box(w + 0.24, 0.12, 0.1, TRIM), x, y + hh + 0.06, z + 0.04); P(box(w + 0.34, 0.1, 0.22, TRIM), x, y - 0.05, z + 0.1);
    for (const sx of [-1, 1]) P(box(0.12, hh, 0.09, TRIM), x + sx * (w / 2 + 0.06), y + hh / 2, z + 0.035);
    P(box(0.05, hh, 0.05, WOOD_D), x, y + hh / 2, z + 0.05); if (!small) P(box(w, 0.05, 0.05, WOOD_D), x, y + hh * 0.55, z + 0.05);
    if (shutC) for (const sx of [-1, 1]) {
      const sw = w / 2 + 0.04, cx = x + sx * (w / 2 + 0.12 + sw / 2);
      P(box(sw, hh + 0.04, 0.06, shutC), cx, y + hh / 2, z + 0.06, 0, sx * 0.12, 0);
      for (const fy of [0.25, 0.75]) P(box(sw - 0.06, 0.07, 0.03, shutC), cx, y + hh * fy, z + 0.1, 0, sx * 0.12, 0);
    }
    if (flower) flowers(g, x, y - 0.16, z + 0.22, w + 0.12, h.index * 13 + Math.round(x * 10));
  };
  const back = (x, y, w, hh) => { P(box(w, hh, 0.06, glow), x, y + hh / 2, ZB - 0.01); P(box(w + 0.2, 0.1, 0.16, TRIM), x, y - 0.05, ZB - 0.06); P(box(0.05, hh, 0.05, WOOD_D), x, y + hh / 2, ZB - 0.04); };
  let gv = h.index % 3; if (h.ivy && gv === 0) gv = 1 + (h.index % 2);
  const GW = [[{ x: 2.3, w: 1.3, y: 0.95, hh: 1.2 }, { x: -3.6, w: 0.7, y: 1.15, hh: 0.9, small: true }], [{ x: 1.15, w: 1.0, y: 0.95, hh: 1.2 }, { x: 3.4, w: 1.0, y: 0.95, hh: 1.2 }], [{ x: 2.55, w: 1.8, y: 1.0, hh: 1.1 }]][gv];
  const uy = H1 + 0.72, UH = 1.22;
  const UW = [[-3.0, 1.0, 0.0, 1.0, 2.9, 1.0], [-2.3, 1.2, 2.3, 1.2], [-3.4, 0.8, -1.4, 1.0, 1.2, 0.8, 3.3, 0.9]][(h.index + h.asym) % 3];
  for (const o of GW) win(o.x, o.y, o.w, o.hh, ZF, h.flower && !o.small, o.small);
  if (two) for (let i = 0; i < UW.length; i += 2) win(UW[i], uy, UW[i + 1], UH, ZU, h.flower);
  back(-3.0, 1.1, 0.8, 0.9); if (two) back(1.8, uy + 0.1, 0.9, 1.0);
  for (const sx of [-1, 1]) for (const wy of two ? [1.2, uy + 0.1] : [1.2]) {                    // janelinhas acesas nas empenas (aparecem nas pontas das fileiras)
    const wz = 0.4 + sx * 0.6 + (wy > 2 ? -1.2 * sx : 0);
    P(box(0.06, 0.95, 0.75, glow), sx * (X1 + 0.01), wy + 0.47, wz); P(box(0.16, 0.1, 0.95, TRIM), sx * (X1 + 0.05), wy - 0.04, wz); P(box(0.05, 0.95, 0.05, WOOD_D), sx * (X1 + 0.03), wy + 0.47, wz);
  }
  P(box(1.0, 2.0, 0.08, WOOD), 3.4, 1.0, ZB - 0.03); P(box(1.2, 0.14, 0.12, WOOD_D), 3.4, 2.06, ZB - 0.05);    // porta dos fundos
  // ---- fachada: enxaimel (vigas aparentes), pedra (cunhais claros) ou reboco (embasamento de pedra) ----
  if (timber) {
    const pairs = a => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
    const fl = [[0.5, two ? H1 : H - 0.12, ZF, GW.map(o => [o.x, o.w]).concat([[DX, DW + 0.3]]), Math.min((two ? H1 : H) - 0.3, DH + (h.arch ? 0.36 : 0.32)), true]];
    if (two) fl.push([H1 + 0.16, H - 0.12, ZU, pairs(UW), uy - 0.12, false]);
    for (const f of fl) timberFrame(P, X0, X1, ...f);
    tex(P(box(W, 0.5, 0.1, stoneMat()), 0, 0.25, ZF + 0.03), 1.4);
  } else if (isStone) {
    for (const x of [X0 + 0.22, X1 - 0.22]) for (let y = 0, k = 0; y < H - 0.2; y += 0.46, k++) { const zf = y > H1 && J ? ZU : ZF; P(box(k % 2 ? 0.34 : 0.52, 0.42, 0.07, STONE_L), x + (x < 0 ? 1 : -1) * (k % 2 ? 0 : 0.09), y + 0.23, zf + 0.025); }
  } else {
    tex(P(box(W, 0.48, 0.1, stoneMat()), 0, 0.24, ZF + 0.03), 1.4);                                  // embasamento de pedra
    if (two && !J) P(box(W, 0.12, 0.08, STONE_L), 0, H1 + 0.04, ZF + 0.03);                         // friso entre os andares
  }
  // ---- telhado (duas águas, cumeeira ao longo de x; asym: cumeeira deslocada ou empena virada para a rua) ----
  const depth = ZU - ZB, over = 0.55, zr = h.asym === 1 ? (ZB + ZU) / 2 - 1.05 : (ZB + ZU) / 2;
  const rise = depth * (0.47 + R() * 0.06), yR = H + rise, X = V3(1, 0, 0);
  const sideF = V3(0, H - yR, ZU - zr), sideB = V3(0, H - yR, ZB - zr);
  for (const sd of [sideF, sideB]) { const run = Math.abs(sd.z), Lz = sd.length(); slope(g, roofC, V3(0, yR, zr), sd.clone().normalize(), Lz * (1 + over / run), X, W - 0.02); }
  P(box(W - 0.02, 0.2, 0.42, roofC), 0, yR + 0.12, zr);                                             // cumeeira
  for (const x of [X0, X1 - 0.2]) { const m = gableTri([[ZB, H], [ZU, H], [zr, yR]], 'z', x, 0.2, WM); g.add(m); T(m); }
  let chx = h.index % 2 ? 2.9 : -3.2;
  if (h.asym === 2) {                                                                                // empena virada para a rua (parte direita)
    const xa = 0.55, xb = 4.55, xm = (xa + xb) / 2, hw = (xb - xa) / 2, rr = hw * (1.0 + R() * 0.12), yc = H + rr, zs = zr;
    { const m = gableTri([[xa, H], [xb, H], [xm, yc]], 'x', ZU - 0.2, 0.2, WM); g.add(m); T(m); }
    if (timber) { P(box(0.15, rr - 0.1, 0.08, WOOD_D), xm, H + (rr - 0.1) / 2, ZU + 0.03); P(box(xb - xa - 0.3, 0.15, 0.08, WOOD_D), xm, H + 0.08, ZU + 0.03); }
    P(cyl(0.26, 0.26, 0.06, WOOD_D, 10), xm, H + rr * 0.45, ZU + 0.03, Math.PI / 2, 0, 0);          // óculo de ventilação
    const lenZ = ZU + over - zs, Z = V3(0, 0, 1);
    for (const sx of [-1, 1]) { const d = V3(sx * hw, -rr, 0), Lx = d.length(); slope(g, roofC, V3(xm, yc, zs + lenZ / 2), d.normalize(), Lx * (1 + 0.32 / hw), Z, lenZ, 4); }
    P(box(0.38, 0.18, lenZ, roofC), xm, yc + 0.12, zs + lenZ / 2);
    chx = -3.2;
  }
  if (h.chimney) {                                                                                   // chaminé de pedra + marcador da fumaça
    const top = yR + 1.25, y0 = H - 0.3;
    tex(P(box(0.82, top - y0, 0.82, stoneMat()), chx, (y0 + top) / 2, zr - 0.25));
    P(box(1.02, 0.14, 1.02, STONE_D), chx, top + 0.07, zr - 0.25); P(cyl(0.16, 0.18, 0.32, '#8a5a3c', 8), chx + 0.15, top + 0.3, zr - 0.25);
    const sm = new THREE.Object3D(); sm.position.set(chx + 0.15, top + 0.5, zr - 0.25); sm.userData.smoke = true; sm.name = 'smoke'; g.add(sm);
  }
  // ---- características da fachada (tags) ----
  if (h.shield) shield(g, DX, 2.86, ZF + 0.02, C.flag[h.shield]);
  if (h.lantern) lantern(g, dl - 0.55, 2.3, ZF);
  if (h.banner) {                                                                                    // estandarte num mastro perpendicular à fachada
    const bx = X1 - 0.45, by = H - 0.45, a = -0.62, ux = Math.sin(a), uz = Math.cos(a);              // mastro saindo da fachada em diagonal: o pano aparece de frente e de lado
    const pole = new THREE.Group(); pole.position.set(bx, by, ZU); pole.rotation.y = a; g.add(pole);
    pole.add(at(box(0.06, 0.06, 1.45, IRON), 0, 0, 0.72), at(box(0.2, 0.26, 0.05, IRON), 0, -0.05, 0.025), at(box(0.04, 0.5, 0.04, IRON), 0, -0.22, 0.28, -0.75, 0, 0), at(sphere(0.06, IRON, 6, 4), 0, 0, 1.46));
    const fl = hangingBanner(C.flag[h.banner], 0.8, Math.min(1.6, by - 1.75)); fl.position.set(bx + ux * 0.86, by - 0.04, ZU + uz * 0.86); fl.rotation.y = a + Math.PI / 2; g.add(fl);
  }
  if (h.barrels) { barrel(g, 3.35, 0.02, 5.48); barrel(g, 4.15, 0.02, 5.42, 0.92); barrel(g, 3.75, 0.86, 5.45, 0.72); }
  if (h.ivy) {                                                                                      // trepadeira subindo pelo canto esquerdo
    const r2 = rng(h.index + 5), top = H * 0.86;
    for (let y = 0.2; y < top; y += 0.32) {
      const n = y < top * 0.5 ? 2 : 3;
      for (let k = 0; k < n; k++) { const m = blob(0.26 + r2() * 0.12, LEAF[(k + Math.floor(y * 3)) % 3]); m.scale.z *= 0.35; P(m, X0 + 0.25 + r2() * (0.7 + y * 0.18), y, (y > H1 && J ? ZU : ZF) + 0.06, 0, r2() * 3, 0); }
    }
    P(box(0.05, top, 0.05, '#5a4630'), X0 + 0.45, top / 2, ZF + 0.05);
  }
  // ---- frente: banco, vasos, vassoura, cesto (uso do dia a dia) ----
  const fr = R();
  if (!h.barrels && fr < 0.55) {                                                                    // banco sob a janela da direita
    const bx = GW[GW.length > 1 && gv === 1 ? 1 : 0].x;
    P(box(1.5, 0.08, 0.38, WOOD_L), bx, 0.46, ZF + 0.36); for (const sx of [-1, 1]) P(box(0.08, 0.44, 0.32, WOOD), bx + sx * 0.6, 0.22, ZF + 0.36);
    if (fr < 0.3) { P(cyl(0.22, 0.17, 0.24, WICKER, 9), bx + 0.35, 0.62, ZF + 0.36); P(torus(0.18, 0.02, WOOD, 4, 10), bx + 0.35, 0.82, ZF + 0.36, 0, 0, Math.PI / 2); }
  }
  if (R() < 0.5) pot(g, dl - (h.lantern ? 0.75 : 0.55), 0.02, ZF + 0.32, 0.9);
  else if (R() < 0.5) { P(cyl(0.025, 0.025, 1.4, WOOD_L, 5), dl - 0.55, 0.72, ZF + 0.12, 0.12, 0, 0.08); P(cone(0.13, 0.42, '#c8a860', 6), dl - 0.6, 0.2, ZF + 0.2, 0.12, 0, 0.08); }   // vassoura encostada
  P(box(W - 0.1, 0.05, 1.0, '#b1a68f'), 0, 0.025, 5.5);                                           // chão batido da frente
  // ---- quintal (fundos): chão, muretas de pedra, varal, lenha coberta (chaminé), horta, ferramentas, remendos ----
  P(box(W - 0.1, 0.04, 2.75, '#8e8a5c'), 0, 0.02, -4.6);
  tex(P(box(W - 0.2, 0.55, 0.32, stoneMat()), 0, 0.275, -5.82)); tex(P(box(0.3, 0.5, 2.5, stoneMat()), X1 - 0.18, 0.25, -4.55));
  const yr = R();
  if (yr < 0.5) {                                                                                    // varal com roupas
    for (const x of [-4.25, -0.15]) P(cyl(0.05, 0.06, 1.9, WOOD, 5), x, 0.95, -4.9);
    P(box(4.1, 0.025, 0.025, '#d8ccb0'), -2.2, 1.82, -4.9);
    const cl = ['#e8dcbc', MV_COL.flag.blue, MV_COL.flag.red, MV_COL.flag.yellow, '#efe1c4'];
    for (let k = 0; k < 4; k++) { const w = k % 2 ? 0.55 : 0.8, hh = k % 2 ? 0.75 : 0.95, x = -3.65 + k * 0.98; P(box(w, hh, 0.03, cl[(h.index + k) % 5]), x, 1.8 - hh / 2, -4.9); if (k % 2) for (const sx of [-1, 1]) P(box(0.2, 0.35, 0.03, cl[(h.index + k) % 5]), x + sx * 0.35, 1.62, -4.9, 0, 0, sx * 0.4); }
  } else if (R() < 0.6) {                                                                            // hortinha
    P(box(3.0, 0.12, 1.5, '#6f5a3e'), -2.2, 0.06, -4.6);
    for (let k = 0; k < 8; k++) { const m = blob(0.22, LEAF[k % 3]); m.scale.y *= 0.6; P(m, -3.3 + (k % 4) * 0.72, 0.17, -4.95 + Math.floor(k / 4) * 0.7); }
  }
  if (h.chimney) {                                                                                   // lenha empilhada sob uma coberturinha, encostada nos fundos
    const lx = 1.5, lz = -3.75;
    for (let k = 0; k < 3; k++) for (let j = 0; j < 5 - k; j++) P(cyl(0.12, 0.12, 1.35, j % 2 ? '#8a5a34' : '#6b4526', 6), lx - 0.52 + j * 0.26 + k * 0.13, 0.13 + k * 0.22, lz, Math.PI / 2, 0, 0);
    for (const sx of [-1, 1]) P(box(0.08, 1.25, 0.08, WOOD_D), lx + sx * 0.85, 0.62, lz - 0.55);
    P(box(2.0, 0.07, 1.1, WOOD), lx, 1.25, lz - 0.1, -0.28, 0, 0);
  }
  if (R() < 0.45) { P(cyl(0.025, 0.025, 1.5, WOOD_L, 5), 2.72, 0.75, ZB - 0.12, -0.1, 0, 0.12); P(box(0.32, 0.4, 0.03, IRON), 2.64, 0.16, ZB - 0.2, -0.1, 0, 0.12); }   // pá encostada
  if (R() < 0.4) for (let k = 0; k < 3; k++) P(box(0.22, 1.1 - k * 0.15, 0.04, k % 2 ? WOOD_L : '#8a6844'), -4.25 + k * 0.24, 0.9, ZB - 0.03, 0, 0, (k - 1) * 0.05);   // remendo de tábuas na parede de trás
  return g;
}

// =====================================================================================================================
// Lojas da praça (padaria, ferraria, taverna, tecelagem): lote 14 × 15, construção z ∈ [−4; 5], área de trabalho na frente
// =====================================================================================================================
const SIGN_MATS = {};
/** Tábua pintada: ícone simples à esquerda + texto (1 ou 2 linhas, '\n'). */
function signMat(text, symbol, wpx = 768, hpx = 256) {
  const key = text + '|' + symbol + '|' + wpx;
  if (SIGN_MATS[key]) return SIGN_MATS[key];
  const c = document.createElement('canvas'); c.width = wpx; c.height = hpx; const x = c.getContext('2d');
  x.fillStyle = '#5a3a22'; x.fillRect(0, 0, wpx, hpx); x.fillStyle = '#7a5434'; x.fillRect(10, 10, wpx - 20, hpx - 20);
  x.strokeStyle = '#d9b46a'; x.lineWidth = 5; x.strokeRect(20, 20, wpx - 40, hpx - 40);
  const ix = hpx * 0.62, iy = hpx / 2, s = hpx * 0.3;
  if (symbol === 'bread') {
    x.fillStyle = '#d99a4e'; x.beginPath(); x.ellipse(ix, iy + 6, s * 1.15, s * 0.68, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#f2d39a'; x.lineWidth = 7; for (const d of [-0.5, 0, 0.5]) { x.beginPath(); x.moveTo(ix + d * s - 14, iy - 10); x.lineTo(ix + d * s + 14, iy + 22); x.stroke(); }
  } else if (symbol === 'anvil') {
    x.fillStyle = '#2e2e33'; x.beginPath(); x.moveTo(ix - s * 1.3, iy - s * 0.55); x.lineTo(ix + s * 0.9, iy - s * 0.55); x.lineTo(ix + s * 0.9, iy - s * 0.15); x.lineTo(ix + s * 0.35, iy + s * 0.05);
    x.lineTo(ix + s * 0.5, iy + s * 0.7); x.lineTo(ix - s * 0.75, iy + s * 0.7); x.lineTo(ix - s * 0.5, iy + s * 0.05); x.quadraticCurveTo(ix - s * 1.1, iy - s * 0.1, ix - s * 1.3, iy - s * 0.55); x.fill();
  } else if (symbol === 'mug') {
    x.fillStyle = '#c08a48'; x.fillRect(ix - s * 0.6, iy - s * 0.5, s * 1.1, s * 1.2); x.strokeStyle = '#c08a48'; x.lineWidth = 12; x.beginPath(); x.arc(ix + s * 0.55, iy + s * 0.08, s * 0.38, -1.3, 1.3); x.stroke();
    x.fillStyle = '#fbf3df'; x.beginPath(); x.ellipse(ix - s * 0.05, iy - s * 0.55, s * 0.68, s * 0.26, 0, 0, Math.PI * 2); x.fill();
  } else {
    x.fillStyle = '#c99c5e'; x.fillRect(ix - s * 0.8, iy - s * 0.75, s * 1.6, s * 0.22); x.fillRect(ix - s * 0.8, iy + s * 0.53, s * 1.6, s * 0.22);
    x.fillStyle = '#b8342a'; x.fillRect(ix - s * 0.6, iy - s * 0.53, s * 1.2, s * 1.06); x.strokeStyle = '#8a2018'; x.lineWidth = 3; for (let k = -4; k <= 4; k++) { x.beginPath(); x.moveTo(ix - s * 0.6, iy + k * s * 0.11); x.lineTo(ix + s * 0.6, iy + k * s * 0.11 + 4); x.stroke(); }
  }
  const lines = text.split('\n'), fs = lines.length > 1 ? hpx * 0.3 : hpx * 0.42;
  x.fillStyle = '#f6e7c4'; x.font = `bold ${fs | 0}px Georgia, "Times New Roman", serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const tx = (ix + s * 1.4 + wpx - 30) / 2;
  lines.forEach((ln, i) => x.fillText(ln, tx, hpx / 2 + (i - (lines.length - 1) / 2) * fs * 1.05 + 3, wpx - ix - s * 1.6 - 30));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (SIGN_MATS[key] = new THREE.MeshLambertMaterial({ map: t }));
}
/** Símbolo da loja em 3D (centrado na origem, ~0,7 de largura). */
function symbol3d(kind) {
  const s = new THREE.Group(), A = (m, x, y, z, rx = 0, ry = 0, rz = 0) => s.add(at(m, x, y, z, rx, ry, rz));
  if (kind === 'bread') {
    const l = sphere(0.36, '#c98a45', 9, 6); l.scale.set(1, 0.55, 0.62); A(l, 0, 0, 0);
    for (const d of [-0.17, 0, 0.17]) A(box(0.05, 0.03, 0.3, '#ecc98a'), d, 0.19, 0, 0, 0.5, 0);
  } else if (kind === 'anvil') {
    A(box(0.5, 0.16, 0.24, '#3b3b40'), 0, 0.1, 0); A(cone(0.12, 0.3, '#3b3b40', 6), 0.38, 0.1, 0, 0, 0, -Math.PI / 2);
    A(box(0.2, 0.18, 0.18, '#3b3b40'), 0, -0.07, 0); A(box(0.42, 0.08, 0.28, '#3b3b40'), 0, -0.19, 0);
  } else if (kind === 'mug') {
    A(cyl(0.2, 0.18, 0.42, '#b07a3e', 10), 0, 0, 0); A(torus(0.13, 0.035, '#8a5a2c', 5, 10), 0.22, 0.02, 0); A(cyl(0.21, 0.21, 0.04, IRON, 10), 0, -0.14, 0);
    const f = sphere(0.21, '#fbf3df', 9, 5); f.scale.y = 0.5; A(f, 0, 0.23, 0);
  } else {
    A(cyl(0.11, 0.11, 0.5, '#c99c5e', 8), 0, 0, 0, 0, 0, Math.PI / 2); for (const sx of [-1, 1]) A(cyl(0.24, 0.24, 0.06, '#a8784a', 10), sx * 0.24, 0, 0, 0, 0, Math.PI / 2);
    A(cyl(0.19, 0.19, 0.4, '#b8342a', 10), 0, 0, 0, 0, 0, Math.PI / 2);
  }
  return s;
}
/** Placa pendurada num braço de ferro perpendicular à fachada (legível dos dois lados da rua) com o símbolo em cima. */
function hangSign(g, x, y, zf, text, sym, bw = 1.5) {
  const P = (m, px, py, pz, rx = 0, ry = 0, rz = 0) => g.add(at(m, px, py, pz, rx, ry, rz));
  const L = bw + 0.45;
  P(box(0.07, 0.07, L, IRON), x, y, zf + L / 2); P(box(0.18, 0.4, 0.05, IRON), x, y - 0.1, zf + 0.025);
  P(box(0.045, 0.045, 0.85, IRON), x, y - 0.3, zf + 0.33, -0.86, 0, 0);
  P(torus(0.12, 0.018, IRON, 4, 10), x, y + 0.13, zf + L - 0.2, 0, Math.PI / 2, 0);
  const bh = 0.72, cz = zf + 0.3 + bw / 2, by = y - 0.22 - bh / 2;
  for (const dz of [-bw / 2 + 0.12, bw / 2 - 0.12]) P(box(0.03, 0.2, 0.03, IRON), x, y - 0.12, cz + dz);
  P(box(0.06, bh + 0.08, bw + 0.08, '#4a3020'), x, by, cz);
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), signMat(text, sym)); m.position.set(x + sx * 0.035, by, cz); m.rotation.y = sx * Math.PI / 2; g.add(m); }
  const s3 = symbol3d(sym); s3.position.set(x, y + 0.36, cz - 0.05); s3.rotation.y = Math.PI / 2; s3.scale.setScalar(1.15); g.add(s3);
}
/** Toldo listrado (grupo `cloth`, pivô na borda presa na parede): de (x0..x1, y0, zf) até a frente em z1, y1. */
function awning(x0, x1, y0, zf, y1, z1, cA, cB) {
  const parts = [], n = Math.max(3, Math.round((x1 - x0) / 0.6)), w = (x1 - x0) / n, L = Math.hypot(z1 - zf, y0 - y1), a = Math.atan2(y0 - y1, z1 - zf);
  for (let k = 0; k < n; k++) {
    const cx = -(x1 - x0) / 2 + (k + 0.5) * w, c = k % 2 ? cB : cA;
    parts.push([BG(w + 0.005, 0.04, L), c, T4(cx, -(y0 - y1) / 2, (z1 - zf) / 2, a, 0, 0)]);
    const fl = new THREE.Shape(); fl.moveTo(-w / 2, 0); fl.lineTo(w / 2, 0); fl.lineTo(w / 2, -0.2); fl.quadraticCurveTo(0, -0.38, -w / 2, -0.2); fl.closePath();
    parts.push([new THREE.ExtrudeGeometry(fl, { depth: 0.025, bevelEnabled: false, curveSegments: 3 }), c, T4(cx, -(y0 - y1), z1 - zf)]);   // franja na frente
  }
  const grp = new THREE.Group(); grp.add(vcMesh(parts)); grp.position.set((x0 + x1) / 2, y0, zf); grp.userData.cloth = true; grp.name = 'cloth';
  return dynamic(grp);
}
function anchor(g, kind, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); o.userData.anchor = kind; o.name = 'anchor:' + kind; g.add(o); return o; }
function smoke(g, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); o.userData.smoke = true; o.name = 'smoke'; g.add(o); return o; }

function buildShop(h) {
  const g = new THREE.Group(); g.name = 'mvs:' + h.shopKey;
  const P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const C = MV_COL, key = h.shopKey, isStone = h.fac === 'stone', timber = h.fac === 'timber';
  const WM = isStone ? stoneMat() : mat(C.fac[h.fac]), T = m => (isStone ? tex(m) : m), roofC = C.roof[h.roofc];
  const X0 = -6.9, X1 = 6.9, W = X1 - X0, ZB = -4, ZF = 5, ZC = 3.45, DW = 1.3, DH = 2.3, dl = -DW / 2, dr = DW / 2;
  const two = key !== 'smithy', H1 = key === 'tavern' ? 3.45 : 3.35, H = two ? H1 + 3.0 : 4.7, J = key === 'tavern' ? 0.55 : 0, ZU = ZF + J, topF = J ? H1 : H;
  const TRIM = timber ? WOOD_D : STONE_L, glow = glowMat();
  const wallBox = (x0, x1, y0, y1, z0, z1, m = WM) => { const b = P(box(+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3), +(z1 - z0).toFixed(3), m), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (m === WM) T(b); else if (m.map) tex(b); return b; };
  // chão: área de trabalho na frente (lajes batidas) e quintal atrás
  P(box(14, 0.05, 2.5, '#b4a993'), 0, 0.025, 6.25); P(box(13.9, 0.04, 3.4, '#8e8a5c'), 0, 0.02, -5.75);
  tex(P(box(13.8, 0.55, 0.32, stoneMat()), 0, 0.275, -7.3));
  // ---- corpo (a ferraria tem a frente aberta à esquerda: oficina com a forja) ----
  const BAY = key === 'smithy' ? [-6.35, -1.0] : null;
  if (BAY) {
    wallBox(BAY[1], X1, 0, H, ZB, ZC); wallBox(X0, BAY[0], 0, H, ZB, ZF); wallBox(BAY[0], BAY[1], 0, H, ZB, ZB + 0.45);
    wallBox(BAY[0], BAY[1], 3.25, H, ZF - 0.6, ZF); P(box(BAY[1] - BAY[0] + 0.4, 0.42, 0.5, WOOD_D), (BAY[0] + BAY[1]) / 2, 3.1, ZF - 0.2);   // verga de carvalho
    P(box(BAY[1] - BAY[0], 0.12, ZF - ZB - 0.6, '#3e2c1e'), (BAY[0] + BAY[1]) / 2, 3.2, (ZB + ZF - 0.6) / 2);                                 // forro
    for (let x = BAY[0] + 0.5; x < BAY[1]; x += 1.1) P(box(0.18, 0.2, ZF - ZB - 0.6, WOOD_D), x, 3.06, (ZB + ZF - 0.6) / 2);
    P(box(BAY[1] - BAY[0], 0.04, ZF - ZB - 0.45, '#4d4036'), (BAY[0] + BAY[1]) / 2, 0.02, (ZB + ZF) / 2 + 0.2);                               // chão de terra batida
  } else wallBox(X0, X1, 0, topF, ZB, ZC);
  wallBox(BAY ? BAY[1] : X0, dl, 0, topF, ZC, ZF); wallBox(dr, X1, 0, topF, ZC, ZF); wallBox(dl, dr, DH, topF, ZC, ZF);
  if (J) { wallBox(X0, X1, H1, H, ZB, ZU); for (let x = X0 + 0.5; x < X1; x += 1.1) P(box(0.22, 0.24, J + 0.06, WOOD_D), x, H1 - 0.12, ZF + J / 2 - 0.03); }
  const lin = innerMat();
  P(box(DW, DH, 0.05, lin), 0, DH / 2, ZC + 0.025); for (const x of [dl + 0.012, dr - 0.012]) P(box(0.024, DH, ZF - ZC, lin), x, DH / 2, (ZC + ZF) / 2);
  P(box(DW, 0.024, ZF - ZC, lin), 0, DH - 0.012, (ZC + ZF) / 2);
  const dg = doorLeaf(C.door[h.doorc], key === 'tavern', DW, DH); dg.position.set(dl, 0.03, ZF - 0.16); g.add(dg);
  if (key === 'tavern') {
    const r0 = DW / 2, yc = DH - r0, s = new THREE.Shape(); s.moveTo(-r0, yc); s.lineTo(-r0, DH + 0.002); s.lineTo(r0, DH + 0.002); s.lineTo(r0, yc); s.absarc(0, yc, r0 - 0.012, 0, Math.PI, false); s.closePath();
    P(mesh(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: false, curveSegments: 10 }), WM), 0, 0, ZF - 0.1);
    for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; P(box(0.26, 0.3, 0.1, WOOD_D), Math.cos(a) * (r0 + 0.15), yc + Math.sin(a) * (r0 + 0.15), ZF + 0.05, 0, 0, a - Math.PI / 2); }
  } else { P(box(DW + 0.46, 0.24, 0.12, TRIM), 0, DH + 0.12, ZF + 0.06); for (const sx of [-1, 1]) P(box(0.17, DH, 0.1, TRIM), sx * (DW / 2 + 0.085), DH / 2, ZF + 0.05); }
  P(box(1.9, 0.16, 0.8, STONE_L), 0, 0.08, ZF + 0.4);
  // ---- janelas ----
  const shutC = { bakery: '#4a7a42', tavern: '#9a3a2a', textile: '#3a6a9a' }[key];
  const win = (x, y, w, hh, z, grid = false, sh = true) => {
    P(box(w, hh, 0.06, glow), x, y + hh / 2, z + 0.01);
    P(box(w + 0.24, 0.12, 0.1, TRIM), x, y + hh + 0.06, z + 0.04); P(box(w + 0.34, 0.1, 0.22, TRIM), x, y - 0.05, z + 0.1);
    for (const sx of [-1, 1]) P(box(0.12, hh, 0.09, TRIM), x + sx * (w / 2 + 0.06), y + hh / 2, z + 0.035);
    const nx = grid ? Math.max(2, Math.round(w / 0.4)) : 2, ny = grid ? 3 : 2;
    for (let i = 1; i < nx; i++) P(box(0.045, hh, 0.05, WOOD_D), x - w / 2 + w * i / nx, y + hh / 2, z + 0.05);
    for (let i = 1; i < ny; i++) P(box(w, 0.045, 0.05, WOOD_D), x, y + hh * i / ny, z + 0.05);
    if (shutC && sh) for (const sx of [-1, 1]) { const sw = w / 2 + 0.04; P(box(sw, hh + 0.04, 0.06, shutC), x + sx * (w / 2 + 0.12 + sw / 2), y + hh / 2, z + 0.06, 0, sx * 0.12, 0); }
  };
  const UPX = key === 'tavern' ? [-4.6, -1.6, 1.6, 4.6] : [-4.4, -1.6, 1.6, 4.4];
  if (two) for (const x of UPX) win(x, H1 + 0.75, 1.05, 1.25, ZU, key === 'tavern');
  for (const x of [-3.6, 3.6]) { P(box(0.8, 0.7, 0.06, glow), x, 1.6, ZB - 0.01); P(box(1.0, 0.1, 0.16, TRIM), x, 1.2, ZB - 0.06); }
  for (const sx of [-1, 1]) for (const [wy, wz] of (two ? [[1.0, 1.2], [H1 + 0.8, -0.6], [H1 + 0.8, 2.4]] : [[1.0, 1.2], [1.0, -1.6]])) {   // janelas nas laterais
    P(box(0.06, 1.1, 0.85, glow), sx * (X1 + 0.01), wy + 0.55, wz); P(box(0.16, 0.1, 1.05, TRIM), sx * (X1 + 0.05), wy - 0.04, wz); P(box(0.05, 1.1, 0.05, WOOD_D), sx * (X1 + 0.03), wy + 0.55, wz);
  }
  if (timber) {
    const ops = key === 'tavern' ? [[-3.7, 2.0], [3.7, 2.0], [0, DW + 0.5]] : [];
    timberFrame(P, X0, X1, 0.5, H1, ZF, ops, DH + 0.45, true);
    timberFrame(P, X0, X1, H1 + 0.16, H - 0.12, ZU, UPX.map(x => [x, 1.05]), H1 + 0.62, false);
    tex(P(box(W, 0.5, 0.1, stoneMat()), 0, 0.25, ZF + 0.03));
  } else if (isStone) {
    for (const x of [X0 + 0.22, X1 - 0.22]) for (let y = 0, k = 0; y < H - 0.2; y += 0.46, k++) P(box(k % 2 ? 0.34 : 0.52, 0.42, 0.07, STONE_L), x + (x < 0 ? 1 : -1) * (k % 2 ? 0 : 0.09), y + 0.23, ZF + 0.025);
  } else { tex(P(box(W, 0.48, 0.1, stoneMat()), 0, 0.24, ZF + 0.03)); P(box(W, 0.12, 0.08, shade(C.fac[h.fac], 0.9)), 0, H1 + 0.04, ZF + 0.03); }
  // ---- telhado ----
  const zr = (ZB + ZU) / 2, rise = (ZU - ZB) * 0.48, yR = H + rise, X = V3(1, 0, 0);
  for (const sd of [V3(0, H - yR, ZU - zr), V3(0, H - yR, ZB - zr)]) slope(g, roofC, V3(0, yR, zr), sd.clone().normalize(), sd.length() * (1 + 0.6 / Math.abs(sd.z)), X, W + 0.3, 7);
  P(box(W + 0.3, 0.2, 0.44, shade(roofC, 0.82)), 0, yR + 0.12, zr);
  for (const x of [X0, X1 - 0.2]) { const m = gableTri([[ZB, H], [ZU, H], [zr, yR]], 'z', x, 0.2, WM); g.add(m); T(m); }
  const chim = (cx, cz, extra = 1.3) => {                         // chaminé com marcador de fumaça
    const zz = Math.abs(cz - zr) < 0.01 ? zr : cz, yy = zz === zr ? yR : yR - Math.abs(zz - zr) * rise / ((ZU - ZB) / 2), top = yy + extra;
    tex(P(box(0.95, top - H + 0.3, 0.95, stoneMat()), cx, (top + H - 0.3) / 2, zz)); P(box(1.15, 0.15, 1.15, STONE_D), cx, top + 0.07, zz);
    smoke(g, cx, top + 0.35, zz);
  };
  const facade = (y, w, text, sym) => { P(box(w + 0.16, 0.66, 0.06, '#4a3020'), 0, y, ZF + 0.05); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.56), signMat(text, sym, 1024, 192)); m.position.set(0, y, ZF + 0.085); g.add(m); };
  if (key === 'bakery') {
    // balcão de venda (janela larga com a tábua baixada), forno de cúpula com brilho, mesa com cestos de pão sob o toldo
    win(-2.9, 0.95, 2.2, 1.3, ZF, false, false); P(box(2.5, 0.1, 0.6, WOOD_L), -2.9, 0.9, ZF + 0.32); for (const sx of [-1, 1]) P(box(0.08, 0.5, 0.08, WOOD_D), -2.9 + sx * 1.1, 0.62, ZF + 0.55, 0.5, 0, 0);
    for (let k = 0; k < 5; k++) { const l = sphere(0.17, '#c98a45', 7, 5); l.scale.set(1.3, 0.6, 0.8); P(l, -3.8 + k * 0.45, 1.03, ZF + 0.3, 0, k * 0.4, 0); }
    win(3.4, 0.95, 1.4, 1.25, ZF);
    const ox = -5.35, oz = 6.25;                                                                      // forno
    tex(P(box(2.4, 0.75, 2.2, stoneMat()), ox, 0.375, oz));
    const dome = sphere(1.05, '#b9805a', 10, 6); dome.scale.y = 0.78; P(dome, ox, 0.75, oz - 0.05);
    P(box(0.9, 0.7, 0.3, STONE_L), ox, 1.05, oz + 0.98); P(cyl(0.34, 0.34, 0.12, '#1d140e', 10), ox, 1.02, oz + 1.06, Math.PI / 2, 0, 0);
    const fire = dynamic(mesh(new THREE.CircleGeometry(0.26, 10), mat('#8a3008', { emissive: '#ff6a12', emissiveIntensity: 0.95 }))); fire.position.set(ox, 0.98, oz + 1.14); fire.userData.forge = true; fire.name = 'oven'; g.add(fire);
    for (let k = 0; k < 3; k++) P(cyl(0.035, 0.035, 0.36, '#2a1a10', 5), ox - 0.1 + k * 0.1, 0.86, oz + 1.13, 0, 0, Math.PI / 2 + (k - 1) * 0.3);
    P(cyl(0.16, 0.2, 1.1, STONE_D, 8), ox - 0.25, 1.75, oz - 0.55); smoke(g, ox - 0.25, 2.45, oz - 0.55);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4 - k; j++) P(cyl(0.11, 0.11, 0.9, j % 2 ? '#8a5a34' : '#6b4526', 6), -6.55 + 0, 0.11 + k * 0.2, 5.35 + j * 0.24 + k * 0.12, 0, 0, Math.PI / 2);   // lenha do forno
    P(cyl(0.03, 0.03, 1.8, WOOD_L, 5), -1.3, 1.25, ZF + 0.12, 0.08, 0, 0.1); P(box(0.36, 0.42, 0.03, WOOD_L), -1.38, 2.08, ZF + 0.07, 0.08, 0, 0.1);   // pá de forno encostada (entre o balcão e a porta)
    P(box(2.3, 0.08, 0.9, WOOD_L), 3.2, 0.86, 6.4); for (const [dx, dz] of [[-1, -0.36], [1, -0.36], [-1, 0.36], [1, 0.36]]) P(box(0.08, 0.82, 0.08, WOOD), 3.2 + dx * 1.02, 0.41, 6.4 + dz);
    for (const [bx, kind] of [[2.45, 0], [3.25, 1], [4.0, 2]]) {
      P(cyl(0.32, 0.25, 0.2, WICKER, 10), bx, 1.0, 6.4); P(torus(0.31, 0.03, '#9a7442', 4, 12), bx, 1.1, 6.4, Math.PI / 2, 0, 0);
      for (let k = 0; k < 4; k++) { const l = kind === 2 ? sphere(0.13, '#b87a3a', 7, 5) : sphere(0.16, kind ? '#d9a058' : '#c98a45', 7, 5); if (kind === 0) l.scale.set(1.5, 0.6, 0.7); else if (kind === 1) l.scale.set(1, 0.65, 1); P(l, bx + (k % 2 - 0.5) * 0.24, 1.17 + Math.floor(k / 2) * 0.06, 6.4 + (Math.floor(k / 2) - 0.5) * 0.2, 0, k, 0); }
    }
    for (let k = 0; k < 2; k++) { const l = cyl(0.07, 0.07, 0.7, '#d9a058', 6); P(l, 2.6 + k * 1.2, 0.98, 6.75, 0, 0.3 * k, Math.PI / 2); }
    g.add(awning(1.75, 4.65, 2.75, ZF, 2.32, 7.35, '#efe1c4', '#b0582f'));
    for (const [sx, sz, rz] of [[1.2, 5.45, 0.08], [1.78, 5.38, -0.1]]) {                              // sacos de farinha
      P(cyl(0.24, 0.28, 0.62, '#e2d4b4', 7), sx, 0.33, sz, 0, 0, rz); P(cone(0.24, 0.3, '#e2d4b4', 7), sx - rz * 0.65, 0.78, sz, 0, 0, rz); P(cyl(0.09, 0.09, 0.05, '#9a7a4a', 6), sx - rz * 0.66, 0.74, sz);
    }
    hangSign(g, 6.0, 3.2, ZF, 'PADARIA', 'bread', 1.4); facade(2.88, 2.4, 'PADARIA', 'bread');
    chim(-5.0, zr - 0.3);
    anchor(g, 'worker', 3.2, 0, 5.55); anchor(g, 'work', 3.2, 0.9, 6.4);
  } else if (key === 'smithy') {
    // forja acesa dentro da oficina aberta, coifa, fole, ferramentas na parede; bigorna lá fora, bancada encostada na fachada
    const fx = -4.1, fz = -1.6;
    tex(P(box(2.4, 0.85, 1.9, stoneMat()), fx, 0.425, fz));
    const coals = dynamic(mesh(BG(1.7, 0.14, 1.2), mat('#8a3008', { emissive: '#ff6a12', emissiveIntensity: 0.95 }))); coals.position.set(fx, 0.9, fz); coals.userData.forge = true; coals.name = 'forge'; g.add(coals);
    for (let k = 0; k < 4; k++) P(box(0.24, 0.1, 0.22, '#2a2420'), fx - 0.7 + k * 0.46, 0.98, fz + (k % 2 ? 0.42 : -0.42), 0, k, 0);
    P(box(1.9, 0.12, 0.14, STONE_D), fx, 0.92, fz + 0.66); P(box(1.9, 0.12, 0.14, STONE_D), fx, 0.92, fz - 0.66);
    const hood = cone(1.7, 1.5, STONE_D, 4); P(hood, fx, 2.45, fz, 0, Math.PI / 4, 0); P(box(1.1, 1.0, 1.1, STONE_D), fx, 3.6, fz);
    P(box(0.9, 0.55, 0.4, '#5a3a24'), fx - 1.65, 1.05, fz + 0.3, 0, 0, 0.18); P(box(0.95, 0.06, 0.45, WOOD), fx - 1.62, 1.36, fz + 0.3, 0, 0, 0.32); P(box(0.95, 0.06, 0.45, WOOD), fx - 1.68, 0.78, fz + 0.3);
    P(box(2.8, 1.0, 0.06, WOOD_L), -3.3, 1.9, ZB + 0.5);
    for (let k = 0; k < 6; k++) { P(box(0.04, 0.6, 0.04, WOOD_D), -4.4 + k * 0.42, 1.8, ZB + 0.56); P(box(0.16 + (k % 2) * 0.1, 0.1, 0.06, IRON), -4.4 + k * 0.42, 2.1, ZB + 0.58); }
    P(box(1.5, 0.5, 0.7, WOOD), -2.0, 0.25, 0.9); P(box(1.3, 0.04, 0.5, '#5f8aa0'), -2.0, 0.49, 0.9);                    // tina de têmpera
    for (let k = 0; k < 3; k++) { const m = sphere(0.45, '#26221f', 6, 4); m.scale.y = 0.45; P(m, -5.6 + k * 0.3, 0.15, 2.4 + k * 0.4); }   // carvão
    P(cyl(0.36, 0.42, 0.62, WOOD, 9), 2.4, 0.31, 6.3);                                                                   // bigorna no toco
    P(box(0.62, 0.16, 0.28, '#3b3b40'), 2.35, 0.79, 6.3); P(cone(0.13, 0.32, '#3b3b40', 6), 2.82, 0.79, 6.3, 0, 0, -Math.PI / 2); P(box(0.26, 0.14, 0.22, '#3b3b40'), 2.35, 0.64, 6.3);
    P(cyl(0.3, 0.27, 0.6, WOOD, 9), 3.45, 0.3, 6.75); P(cyl(0.27, 0.27, 0.03, '#5f8aa0', 9), 3.45, 0.58, 6.75);          // balde de água
    P(box(2.0, 0.08, 0.7, WOOD_L), 4.8, 0.88, 5.5); for (const [dx, dz] of [[-0.9, -0.28], [0.9, -0.28], [-0.9, 0.28], [0.9, 0.28]]) P(box(0.08, 0.84, 0.08, WOOD), 4.8 + dx, 0.42, 5.5 + dz);
    for (let k = 0; k < 3; k++) { P(box(0.06, 0.04, 0.4, WOOD_L), 4.2 + k * 0.5, 0.95, 5.5, 0, 0.3 * k, 0); P(box(0.16, 0.08, 0.1, IRON), 4.2 + k * 0.5 + 0.06 * k, 0.97, 5.65); }
    for (let k = 0; k < 2; k++) P(torus(0.12, 0.03, IRON, 4, 10, ), 5.3 + k * 0.32, 0.94, 5.4, Math.PI / 2, 0, 0);
    P(box(1.8, 0.9, 0.05, WOOD_L), 4.8, 1.95, ZF + 0.03); for (let k = 0; k < 5; k++) P(box(0.06, 0.45, 0.04, IRON), 4.1 + k * 0.35, 1.9, ZF + 0.08, 0, 0, (k % 2) * 0.2);
    barrel(g, 6.25, 0.02, 6.6); barrel(g, -6.2, 0.02, 6.5, 0.9); for (let k = 0; k < 5; k++) P(box(0.05, 1.5, 0.05, IRON), -5.5 + k * 0.08, 0.75, 5.35, 0.1, 0, (k - 2) * 0.03);
    hangSign(g, 6.3, 3.45, ZF, 'FERRARIA', 'anvil', 1.4); facade(2.92, 2.3, 'FERRARIA', 'anvil');
    chim(fx, zr - 0.2, 1.6);
    anchor(g, 'worker', 2.4, 0, 5.4); anchor(g, 'work', 2.4, 0.87, 6.3);
  } else if (key === 'tavern') {
    for (const x of [-3.7, 3.7]) win(x, 0.9, 2.0, 1.3, ZF, true);
    lantern(g, 1.15, 2.25, ZF); lantern(g, -1.15, 2.25, ZF);
    P(box(2.5, 0.08, 0.95, WOOD_L), 3.7, 0.8, 6.35); for (const [dx, dz] of [[-1.1, -0.38], [1.1, -0.38], [-1.1, 0.38], [1.1, 0.38]]) P(box(0.09, 0.78, 0.09, WOOD), 3.7 + dx, 0.39, 6.35 + dz);
    for (const bz of [5.55, 7.15]) { P(box(2.4, 0.07, 0.34, WOOD), 3.7, 0.46, bz); for (const dx of [-1.0, 1.0]) P(box(0.08, 0.44, 0.3, WOOD_D), 3.7 + dx, 0.22, bz); }
    for (let k = 0; k < 4; k++) { const mx = 2.9 + k * 0.52, mz = 6.2 + (k % 2) * 0.3; P(cyl(0.09, 0.08, 0.2, '#b07a3e', 8), mx, 0.94, mz); P(torus(0.06, 0.015, '#8a5a2c', 4, 8), mx + 0.1, 0.94, mz); const f = sphere(0.09, '#fbf3df', 6, 4); f.scale.y = 0.5; P(f, mx, 1.05, mz); }
    P(cyl(0.22, 0.22, 0.03, '#c9c2b0', 10), 3.4, 0.86, 6.55);
    barrel(g, -5.9, 0.02, 5.6); barrel(g, -5.2, 0.02, 5.6); barrel(g, -5.55, 0.88, 5.6, 0.9); barrel(g, -5.5, 0.02, 6.6, 1, true);
    barrel(g, -3.4, 0.02, 6.6); P(cyl(0.45, 0.45, 0.06, WOOD_L, 10), -3.4, 0.95, 6.6);                                   // barril-mesa
    for (const dx of [-0.75, 0.75]) { P(cyl(0.2, 0.2, 0.06, WOOD_L, 8), -3.4 + dx, 0.5, 6.6); P(cyl(0.06, 0.08, 0.47, WOOD, 6), -3.4 + dx, 0.24, 6.6); }
    P(cyl(0.09, 0.08, 0.2, '#b07a3e', 8), -3.3, 1.08, 6.5);
    hangSign(g, -6.25, 3.0, ZF, 'TAVERNA\nDO JAVALI', 'mug', 1.6); facade(2.95, 3.4, 'TAVERNA DO JAVALI', 'mug');
    const bh = new THREE.Group(); bh.position.set(0, H1 + 0.3, ZU + 0.1); g.add(bh);                                   // cabeça de javali de madeira sobre a porta
    const A = (m, x, y, z, rx = 0, ry = 0, rz = 0) => bh.add(at(m, x, y, z, rx, ry, rz));
    A(cyl(0.38, 0.38, 0.08, WOOD_D, 10), 0, 0, 0, Math.PI / 2, 0, 0); const hd = sphere(0.28, '#5a3a24', 8, 6); hd.scale.set(1, 0.9, 1.1); A(hd, 0, 0, 0.22);
    A(cyl(0.12, 0.14, 0.24, '#4a2e1c', 8), 0, -0.04, 0.48, Math.PI / 2, 0, 0); for (const sx of [-1, 1]) { A(cone(0.04, 0.2, '#efe6d0', 5), sx * 0.12, -0.08, 0.55, 0, 0, sx * 0.6); A(cone(0.09, 0.2, '#4a2e1c', 4), sx * 0.2, 0.25, 0.12, 0, 0, -sx * 0.5); A(sphere(0.035, '#111111', 5, 4), sx * 0.13, 0.08, 0.42); }
    chim(4.8, zr - 0.3);
  } else {
    // tecelagem: armação com tecidos coloridos, mesa de dobrar com pilhas e rolos sob o toldo, roca na entrada
    win(-3.7, 0.95, 1.7, 1.25, ZF); win(3.5, 0.9, 2.2, 1.3, ZF);
    for (let k = 0; k < 4; k++) P(box(0.5, 0.08 + (k % 2) * 0.04, 0.35, ['#b8342a', '#3a6a9a', '#d9a62a', '#5a8a4a'][k]), 2.9 + k * 0.4, 1.0, ZF - 0.05);   // tecidos na vitrine
    for (const x of [-4.95, -1.85]) P(box(0.12, 2.5, 0.12, WOOD), x, 1.25, 6.5);
    P(box(3.4, 0.1, 0.1, WOOD), -3.4, 2.45, 6.5); for (const x of [-4.95, -1.85]) P(box(0.5, 0.08, 0.5, WOOD_D), x, 0.04, 6.5);
    const cols = ['#b8342a', '#2f5a9a', '#d9a62a', '#3f7a46', '#8a4a9a'], parts = [];
    cols.slice(0, 4).forEach((c, k) => { parts.push([BG(0.62, 1.55 - (k % 2) * 0.25, 0.03), c, T4(-1.12 + k * 0.75, -(1.55 - (k % 2) * 0.25) / 2 - 0.05, 0)]); parts.push([BG(0.62, 0.08, 0.035), shade(c, 0.7), T4(-1.12 + k * 0.75, -0.5, 0)]); });
    const rack = new THREE.Group(); rack.add(vcMesh(parts)); rack.position.set(-3.4, 2.42, 6.5); rack.userData.cloth = true; rack.name = 'cloth'; g.add(dynamic(rack));
    P(box(2.3, 0.08, 0.95, WOOD_L), 3.2, 0.86, 6.4); for (const [dx, dz] of [[-1, -0.38], [1, -0.38], [-1, 0.38], [1, 0.38]]) P(box(0.08, 0.82, 0.08, WOOD), 3.2 + dx, 0.41, 6.4 + dz);
    for (let s = 0; s < 3; s++) for (let k = 0; k < 4 - s; k++) P(box(0.5, 0.09, 0.42, cols[(s * 2 + k) % 5]), 2.4 + s * 0.65, 0.95 + k * 0.095, 6.3);
    for (let k = 0; k < 3; k++) P(cyl(0.12, 0.12, 0.85, cols[(k + 2) % 5], 9), 3.75 + (k % 2) * 0.05, 0.99 + (k > 1 ? 0.2 : 0), 6.55 + (k % 2 ? 0.25 : 0) - (k > 1 ? 0.12 : 0), 0, 0, Math.PI / 2);
    g.add(awning(1.85, 4.55, 2.75, ZF, 2.35, 7.3, '#efe1c4', '#2f5a9a'));
    P(torus(0.42, 0.04, WOOD, 5, 14), 1.45, 0.95, 5.55); P(cyl(0.05, 0.05, 0.1, WOOD_D, 6), 1.45, 0.95, 5.55, Math.PI / 2, 0, 0);   // roca de fiar
    for (const [x, rz] of [[1.2, 0.2], [1.7, -0.2]]) P(box(0.06, 0.95, 0.06, WOOD), x, 0.47, 5.55, 0, 0, rz); P(box(0.9, 0.06, 0.25, WOOD), 1.6, 0.25, 5.55);
    const parts2 = [], ux = [-4.4, -1.6];                                                                             // tecidos secando sob as janelas de cima
    ux.forEach((x, i) => { parts2.push([BG(1.2, 0.9, 0.03), cols[(i + 3) % 5], T4(x, -0.48, 0)]); parts2.push([BG(1.3, 0.05, 0.05), WOOD, T4(x, 0, 0)]); });
    const dry = new THREE.Group(); dry.add(vcMesh(parts2)); dry.position.set(0, H1 + 0.55, ZU + 0.18); dry.userData.cloth = true; dry.name = 'cloth'; g.add(dynamic(dry));
    hangSign(g, -6.25, 3.25, ZF, 'TECELAGEM', 'spool', 1.45); facade(2.9, 2.5, 'TECELAGEM', 'spool');
    anchor(g, 'worker', 3.2, 0, 5.55); anchor(g, 'work', 3.2, 0.9, 6.4);
  }
  return g;
}

// =====================================================================================================================
// Cenário fixo
// =====================================================================================================================
/** Pavimento em coordenadas do mundo (triângulos virados para cima; UV = x/S, z/S): ruas, calçadas, praça, grama. */
function paver() {
  const pos = [];
  const tri = (a, b, c) => { const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); if (ny >= 0) pos.push(...a, ...b, ...c); else pos.push(...a, ...c, ...b); };
  const P = {
    tri,
    quad(a, b, c, d) { tri(a, b, c); tri(a, c, d); },
    rect(x0, x1, z0, z1, y) { if (x1 - x0 > 0.01 && z1 - z0 > 0.01) P.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]); },
    band(ax, az, bx, bz, w, y, ext = 0) {
      const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * w / 2, nz = ux * w / 2;
      ax -= ux * ext; az -= uz * ext; bx += ux * ext; bz += uz * ext;
      P.quad([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz]);
    },
    disc(x, z, r, y, n = 20) { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; tri([x, y, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r]); } },
    ring(x, z, r0, r1, y, n = 48) { for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1); P.quad([x + c0 * r0, y, z + s0 * r0], [x + c0 * r1, y, z + s0 * r1], [x + c1 * r1, y, z + s1 * r1], [x + c1 * r0, y, z + s1 * r0]); } },
    mesh(material, S = 4) {
      if (!pos.length) return null;
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const uv = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uv[i * 2] = pos[i * 3] / S; uv[i * 2 + 1] = pos[i * 3 + 2] / S; }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, material); m.receiveShadow = true; m.castShadow = false; return m;
    },
  };
  return P;
}
/** Retângulo menos buracos (todos de eixos): lista de retângulos que cobrem o resto. */
function cutRects(r, holes) {
  const hs = holes.filter(h => h.x0 < r.x1 && h.x1 > r.x0 && h.z0 < r.z1 && h.z1 > r.z0);
  const zs = [...new Set([r.z0, r.z1, ...hs.flatMap(h => [Math.max(r.z0, h.z0), Math.min(r.z1, h.z1)])])].sort((a, b) => a - b), out = [];
  for (let k = 0; k < zs.length - 1; k++) {
    const z0 = zs[k], z1 = zs[k + 1]; if (z1 - z0 < 0.01) continue;
    let x = r.x0;
    for (const h of hs.filter(h => h.z0 < z1 - 0.005 && h.z1 > z0 + 0.005).sort((a, b) => a.x0 - b.x0)) { if (h.x0 > x) out.push({ x0: x, x1: h.x0, z0, z1 }); x = Math.max(x, h.x1); }
    if (x < r.x1) out.push({ x0: x, x1: r.x1, z0, z1 });
  }
  return out;
}

/** Construção de fundo (V.fillers): sem porta para a rua, cores um pouco apagadas; fica no miolo dos quarteirões e dá densidade
 *  ao burgo. kind: 'barn' (celeiro de tábuas com portão), 'stone' (depósito de pedra), 'cottage' (casinha de reboco com chaminé),
 *  'shed' (telheiro aberto com lenha e barris). Frente local +z; colisão = f.box (plano). */
function buildFiller(f) {
  const g = new THREE.Group(), R = rng(Math.floor(f.k * 1e6) + 7), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const w = f.w, d = f.d, X = V3(1, 0, 0);
  const roofs = ['#8f5a3a', '#7a4a2a', '#6a6e72', '#94503a'], roofC = roofs[Math.floor(R() * roofs.length)];
  const gable = (H, rise, wallM, over = 0.35) => {                           // telhado de duas águas com a cumeeira ao longo de x + empenas
    const L = Math.hypot(d / 2 + over, rise);
    for (const sd of [1, -1]) slope(g, roofC, V3(0, H + rise, 0), V3(0, -rise, sd * (d / 2 + over)).normalize(), L, X, w + 2 * over, 4);
    for (const x of [-w / 2, w / 2 - 0.12]) g.add(gableTri([[-d / 2, H], [d / 2, H], [0, H + rise]], 'z', x, 0.12, wallM));
  };
  if (f.kind === 'shed') {                                                    // telheiro: postes, água única, lenha empilhada e barris
    const H = 2.3; for (const [x, z] of [[-w / 2 + 0.2, d / 2 - 0.2], [w / 2 - 0.2, d / 2 - 0.2], [-w / 2 + 0.2, -d / 2 + 0.2], [w / 2 - 0.2, -d / 2 + 0.2]]) P(box(0.18, z > 0 ? H : H + 0.6, 0.18, WOOD), x, (z > 0 ? H : H + 0.6) / 2, z);
    P(box(w + 0.5, 0.12, d + 0.6, roofC), 0, H + 0.35, 0, -0.2, 0, 0);
    P(box(w - 0.4, 0.08, 0.1, WOOD_D), 0, 0.6, -d / 2 + 0.25);
    for (let k = 0; k < 3; k++) for (let j = 0; j < Math.floor(w / 0.38) - 2; j++) P(cyl(0.16, 0.16, d * 0.45, k % 2 ? '#8a5a34' : '#6b4526', 6), -w / 2 + 0.6 + j * 0.36 + (k % 2) * 0.18, 0.18 + k * 0.29, -d / 2 + d * 0.32, Math.PI / 2, 0, 0);
    if (R() < 0.6) barrel(g, w / 2 - 0.7, 0, d / 2 - 0.8, 0.9);
  } else if (f.kind === 'barn') {                                             // celeiro: tábuas verticais, portão grande, feno na porta
    const H = 3.6 + R() * 0.6, M = mat(R() < 0.5 ? '#7a5434' : '#6e4a2e');
    P(box(w, H, d, M), 0, H / 2, 0);
    for (let x = -w / 2 + 0.35; x < w / 2; x += 0.6) for (const z of [d / 2 + 0.01, -d / 2 - 0.01]) P(box(0.06, H, 0.04, WOOD_D), x, H / 2, z);
    gable(H, 2.1 + R() * 0.5, M);
    P(box(2.6, 2.8, 0.08, '#3a2a1e'), 0, 1.4, d / 2 + 0.03); P(box(2.9, 0.18, 0.12, WOOD_D), 0, 2.9, d / 2 + 0.06);
    for (const sx of [-1, 1]) P(box(0.08, 2.7, 2.6 * 0.72, WOOD), sx * 0.66, 1.35, d / 2 + 0.06, 0, 0, sx * 0.0);
    for (let k = 0; k < 3; k++) P(box(1.1, 0.5, 0.6, '#d8b866'), -w / 2 + 1 + k * 0.4, 0.25 + (k === 1 ? 0.5 : 0), d / 2 + 0.6);
  } else {                                                                    // depósito de pedra ou casinha de reboco
    const stone = f.kind === 'stone', H = stone ? 3.0 + R() * 0.5 : 3.1 + R() * 0.5;
    const M = stone ? stoneMat() : mat(shade(['#e3d8bd', '#d6c39a', '#d4a898', '#cfc6b0'][Math.floor(R() * 4)], 0.92));
    const b = P(box(w, H, d, M), 0, H / 2, 0); if (stone) tex(b);
    gable(H, 1.8 + R() * 0.4, M);
    for (const sx of w > 7.5 ? [-1, 1] : [1]) { const x = sx * w / 4; P(box(0.9, 0.8, 0.06, stone ? '#3a3028' : glowMat()), x, 1.7, d / 2 + 0.02); P(box(1.1, 0.1, 0.16, STONE_L), x, 1.25, d / 2 + 0.06); }   // janelinhas
    P(box(1.0, 2.0, 0.06, '#4a3424'), -w / 2 + 1.2, 1.0, -d / 2 - 0.03);                                                      // porta (nos fundos)
    if (!stone && R() < 0.7) { const cx = w / 2 - 1.1; P(box(0.7, 2.2, 0.7, STONE_D), cx, H + 0.9, -0.4); smoke(g, cx, H + 2.05, -0.4); }   // chaminé com fumaça
    if (R() < 0.5) { pot(g, w / 2 - 0.5, 0, d / 2 + 0.45, 1); }
  }
  g.position.set(f.px, f.y, f.pz); g.rotation.y = f.ry;
  planarUV(g);
  return g;
}

export function buildMedScene(g, V, MAP, HEDGE) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const ST = stoneMat(), E0 = MAP - HEDGE, MH = V.MIDH, HH = V.HIGHH, hw = V.hw, RW = V.RW, STRIP = V.STRIP, SLATE = MV_COL.roof.slate, F = V.F;
  const sb = (w, hh, d, x, y, z, rx = 0, ry = 0, rz = 0, S = S_STONE) => tex(add(box(+w.toFixed(3), +hh.toFixed(3), +d.toFixed(3), ST), x, y, z, rx, ry, rz), S);   // bloco de pedra
  const solids = [], vanOnly = [], glows = [];
  const pv = { cob: paver(), flag: paver(), grass: paver(), gravel: paver(), curb: paver() };
  const level = (x, z) => V.h(x, z);
  const nearRoad = (x, z) => { let best = null, bd = 1e9; for (const sg of V.segs) { const [ax, az] = sg.a, [bx, bz] = sg.b, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = [px - x, pz - z]; } } return best; };

  // ---------- chão: grama nas três alturas (recortada nas ladeiras) ----------
  const LOW = { x0: HEDGE, x1: E0, z0: HEDGE, z1: V.MID.z0 }, MIDR = { x0: HEDGE, x1: E0, z0: V.MID.z0, z1: E0 }, HIR = { x0: V.HIGH.x0, x1: E0, z0: V.HIGH.z0, z1: E0 };
  const rcut = r => ({ x0: r.x0 - 0.6, x1: r.x1 + 0.6, z0: r.z0 - 0.6, z1: r.z1 + 0.6 });
  pv.grass.rect(LOW.x0, LOW.x1, LOW.z0, LOW.z1, 0);
  for (const q of cutRects(MIDR, [...V.ramps.filter(r => r.h0 === 0).map(rcut), HIR])) pv.grass.rect(q.x0, q.x1, q.z0, q.z1, MH);
  for (const q of cutRects(HIR, V.ramps.filter(r => r.h1 === HH).map(rcut))) pv.grass.rect(q.x0, q.x1, q.z0, q.z1, HH);

  // ---------- muros de arrimo dos patamares (pedra) com mureta e capa clara; abertos nas ladeiras ----------
  const edge = (P, y0, y1) => {
    const gx = V.ramps.filter(r => r.axis === 'z' && r.z0 < P.z0 && r.z1 > P.z0).map(r => [r.x0 - 0.6, r.x1 + 0.6]);
    const gz = V.ramps.filter(r => r.axis === 'x' && r.x0 < P.x0 && r.x1 > P.x0).map(r => [r.z0 - 0.6, r.z1 + 0.6]);
    const run = (from, to, gaps, put) => { let a = from; for (const gp of gaps.sort((p, q) => p[0] - q[0])) { if (gp[0] > a) put(a, gp[0]); a = Math.max(a, gp[1]); } if (to > a) put(a, to); };
    run(P.x0, E0, gx, (a, b) => { sb(b - a, y1 + 0.7 - y0, 0.7, (a + b) / 2, (y0 + y1 + 0.7) / 2, P.z0); add(box(+(b - a).toFixed(3), 0.1, 0.9, STONE_L), (a + b) / 2, y1 + 0.75, P.z0); });
    if (P.x0 > HEDGE + 1) run(P.z0, E0, gz, (a, b) => { sb(0.7, y1 + 0.7 - y0, b - a, P.x0, (y0 + y1 + 0.7) / 2, (a + b) / 2); add(box(0.9, 0.1, +(b - a).toFixed(3), STONE_L), P.x0, y1 + 0.75, (a + b) / 2); });
  };
  edge(V.MID, -0.05, MH); edge(V.HIGH, MH - 0.05, HH);

  // ---------- ladeiras: piso de paralelepípedos inclinado e paredes laterais que acompanham a subida ----------
  for (const r of V.ramps) {
    const zAx = r.axis === 'z', u0 = zAx ? r.z0 : r.x0, u1 = zAx ? r.z1 : r.x1, rh = u => r.h0 + (r.h1 - r.h0) * (u - u0) / (u1 - u0), y = 0.03;
    if (zAx) pv.cob.quad([r.x0, r.h0 + y, r.z0], [r.x1, r.h0 + y, r.z0], [r.x1, r.h1 + y, r.z1], [r.x0, r.h1 + y, r.z1]);
    else pv.cob.quad([r.x0, r.h0 + y, r.z0], [r.x1, r.h1 + y, r.z0], [r.x1, r.h1 + y, r.z1], [r.x0, r.h0 + y, r.z1]);
    const base = r.h0 - 0.06;
    for (const side of [0, 1]) {
      const off = side ? (zAx ? r.x1 : r.z1) + 0.9 : (zAx ? r.x0 : r.z0) - 0.9;
      const adj = u => (zAx ? level(off, u) : level(u, off)), us = [];
      for (let u = u0; u <= u1 + 1e-6; u += 0.75) us.push(u);
      const top = []; for (const u of us) top.push([u, Math.max(rh(u), adj(Math.min(u1 - 0.01, Math.max(u0 + 0.01, u)))) + 0.6]);
      const pts = [[u0, base], [u1, base], ...top.reverse()];
      const sh = new THREE.Shape(); pts.forEach(([u, yy], i) => (i ? sh.lineTo(zAx ? -u : u, yy) : sh.moveTo(zAx ? -u : u, yy))); sh.closePath();
      const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: false }), ST);
      if (zAx) { m.rotation.y = Math.PI / 2; m.position.x = side ? r.x1 : r.x0 - 0.6; } else m.position.z = side ? r.z1 : r.z0 - 0.6;
      g.add(m); tex(m);
    }
  }

  // ---------- ruas de pedra (paralelepípedos) com calçadas de lajes; anel da fonte ----------
  const ringNode = k => /^q\d+$/.test(k) || ['rn', 'rs', 'rw', 're'].includes(k);
  for (const sg of V.segs) {
    if (sg.type === 'ramp' || sg.type === 'ring') continue;
    const [ax, az] = sg.a, [bx, bz] = sg.b, y = level((ax + bx) / 2, (az + bz) / 2);
    pv.cob.band(ax, az, bx, bz, RW, y + 0.035);
    if (sg.type !== 'spoke') pv.flag.band(ax, az, bx, bz, RW + STRIP * 2, y + 0.02);
  }
  for (const [k, [x, z]] of Object.entries(V.N)) {
    if (ringNode(k)) continue;
    const y = level(x, z); pv.cob.disc(x, z, hw, y + 0.035, 22); pv.flag.disc(x, z, hw + STRIP, y + 0.02, 22);
  }
  pv.cob.ring(F.x, F.z, V.RING - hw, V.RING + hw, MH + 0.035, 56);

  // ---------- muralha: pano com talude, cornija e ameias dos dois lados; torres redondas para fora; portão ao norte ----------
  const WH = 8.6, GX0 = 125.6, GX1 = 133.2;
  const wallRun = (x0, x1, z0, z1, outer) => {        // outer: 'n' | 's' | 'w' | 'e' (lado de fora)
    const along = outer === 'n' || outer === 's', L = along ? x1 - x0 : z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    sb(x1 - x0, WH + 0.1, z1 - z0, cx, WH / 2 - 0.05, cz);
    const o = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[outer], ox = o[0], oz = o[1];
    const fx = ox < 0 ? x0 : ox > 0 ? x1 : cx, fz = oz < 0 ? z0 : oz > 0 ? z1 : cz;
    sb(along ? L : 0.5, 1.4, along ? 0.5 : L, ox ? fx + ox * 0.25 : cx, 0.6, oz ? fz + oz * 0.25 : cz, ox ? 0 : 0, 0, 0);       // talude na base (por fora)
    add(box(along ? L : (x1 - x0) + 0.3, 0.22, along ? (z1 - z0) + 0.3 : L, STONE_L), cx, WH - 0.05, cz);                         // cornija
    for (let u = 0.45; u < L - 0.4; u += 1.8) for (const side of [-1, 1]) {
      const px = along ? x0 + u : cx + side * ((x1 - x0) / 2 - 0.22), pz = along ? cz + side * ((z1 - z0) / 2 - 0.22) : z0 + u;
      sb(along ? 0.9 : 0.44, 1.0, along ? 0.44 : 0.9, px, WH + 0.55, pz);
    }
  };
  wallRun(0, GX0 - 7, 0, HEDGE, 'n'); wallRun(GX1 + 7, MAP, 0, HEDGE, 'n'); wallRun(0, MAP, MAP - HEDGE, MAP, 's');
  wallRun(0, HEDGE, HEDGE, MAP - HEDGE, 'w'); wallRun(MAP - HEDGE, MAP, HEDGE, MAP - HEDGE, 'e');
  const roundTower = (x, y, z, r, hgt, roof, flagC, slits = true) => {
    tex(add(cyl(r, r * 1.05, hgt, ST, 18), x, y + hgt / 2, z));
    tex(add(cyl(r + 0.4, r, 0.7, ST, 18), x, y + hgt + 0.35, z));                      // balcão de mísulas no topo
    add(cyl(r + 0.45, r + 0.45, 0.14, STONE_L, 18), x, y + hgt + 0.72, z);
    if (roof) {
      add(cone(r + 0.75, r * 1.75 + 1.4, SLATE, 18), x, y + hgt + 0.79 + (r * 1.75 + 1.4) / 2, z);
      const ty = y + hgt + 0.79 + r * 1.75 + 1.4;
      add(cyl(0.05, 0.05, 2.4, IRON, 5), x, ty + 1.0, z); add(sphere(0.12, '#c9a24a', 6, 4), x, ty + 0.1, z);
      if (flagC) { const f = mastFlag(flagC, 1.5, 0.95); f.position.set(x, ty + 2.15, z); g.add(f); }
    } else {
      const n = Math.max(8, Math.round(Math.PI * 2 * r / 1.7));
      for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; tex(add(box(0.85, 1.0, 0.45, ST), x + Math.cos(a) * (r + 0.15), y + hgt + 1.29, z + Math.sin(a) * (r + 0.15), 0, -a + Math.PI / 2, 0)); }
      if (flagC) { add(cyl(0.06, 0.06, 4.2, IRON, 5), x, y + hgt + 2.8, z); const f = mastFlag(flagC, 1.7, 1.1); f.position.set(x, y + hgt + 4.85, z); g.add(f); }
    }
    if (slits) for (const a of [0.4, 1.9, 3.4, 4.9]) for (const yy of [hgt * 0.35, hgt * 0.7]) add(box(0.16, 1.0, 0.16, '#2a2622'), x + Math.cos(a) * (r + 0.02), y + yy, z + Math.sin(a) * (r + 0.02), 0, -a, 0);
  };
  const FLAGS = MV_COL.flag;
  // torres da muralha (meio cilindro para fora: por dentro ficam rentes ao pano) e dos cantos
  [52, 104, 155, 207].forEach((u, i) => {
    const roof = i % 2 === 0;
    if (u < 116 || u > 143) { roundTower(u, 0, -1.8, 3.4, 11.4, roof, null); solids.push({ x0: u - 3.5, x1: u + 3.5, z0: -5.3, z1: 0 }); }
    roundTower(u, 0, MAP + 1.8, 3.4, 11.4, !roof, null); roundTower(-1.8, 0, u, 3.4, 11.4, !roof, null); roundTower(MAP + 1.8, 0, u, 3.4, 11.4, roof, null);
    solids.push({ x0: u - 3.5, x1: u + 3.5, z0: MAP, z1: MAP + 5.3 }, { x0: -5.3, x1: 0, z0: u - 3.5, z1: u + 3.5 }, { x0: MAP, x1: MAP + 5.3, z0: u - 3.5, z1: u + 3.5 });
  });
  [[-1.5, -1.5, 'red'], [MAP + 1.5, -1.5, 'blue'], [-1.5, MAP + 1.5, 'blue'], [MAP + 1.5, MAP + 1.5, 'red']].forEach(([x, z, c]) => { roundTower(x, 0, z, 4.2, 13, true, FLAGS[c]); solids.push({ x0: x - 4.3, x1: x + 4.3, z0: z - 4.3, z1: z + 4.3 }); });
  // portão: duas torres (fora da abertura), arco com vão livre ≥ 6,5, portas abertas encostadas, grade levantada, estandartes
  const GT = 14.6, GZ0 = -7, GA = 6.6, GR = (GX1 - GX0) / 2, GCX = (GX0 + GX1) / 2;
  for (const [x0, x1] of [[GX0 - 7, GX0], [GX1, GX1 + 7]]) {
    const cx = (x0 + x1) / 2;
    sb(x1 - x0, GT, HEDGE - GZ0, cx, GT / 2, (GZ0 + HEDGE) / 2); tex(add(cyl(3.5, 3.6, GT, ST, 18), cx, GT / 2, GZ0));
    add(box(x1 - x0 + 0.3, 0.22, HEDGE - GZ0 + 0.3, STONE_L), cx, GT - 0.05, (GZ0 + HEDGE) / 2); add(cyl(3.65, 3.65, 0.22, STONE_L, 18), cx, GT - 0.05, GZ0);
    for (let k = 0; k < 4; k++) sb(0.9, 1.0, 0.44, x0 + 0.6 + k * 1.95, GT + 0.55, HEDGE - 0.24);
    for (const sx of [x0 + 0.24, x1 - 0.24]) for (let k = 0; k < 4; k++) sb(0.44, 1.0, 0.9, sx, GT + 0.55, GZ0 + 0.6 + k * 2.1);
    for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI; sb(0.85, 1.0, 0.44, cx + Math.cos(a) * 3.4, GT + 0.55, GZ0 + Math.sin(a) * 3.4, 0, -a + Math.PI / 2, 0); }
    for (const yy of [4.5, 9.5]) { add(box(0.18, 1.1, 0.2, '#2a2622'), cx, yy, GZ0 - 3.55); add(box(0.18, 1.1, 0.2, '#2a2622'), cx, yy, HEDGE + 0.02); }
    add(cyl(0.07, 0.07, 5.0, IRON, 5), cx, GT + 3.0, (GZ0 + HEDGE) / 2); const f = mastFlag(FLAGS.red, 2.1, 1.3); f.position.set(cx, GT + 5.3, (GZ0 + HEDGE) / 2); g.add(f);
    solids.push({ x0, x1, z0: GZ0 - 3.6, z1: HEDGE });
  }
  {                                                                                     // bloco sobre o arco (tímpano + arco pleno)
    const sh = new THREE.Shape(), top = 13.2;
    sh.moveTo(GX0, GA); sh.lineTo(GX0, top); sh.lineTo(GX1, top); sh.lineTo(GX1, GA); sh.absarc(GCX, GA, GR - 0.01, 0, Math.PI, false); sh.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: HEDGE - GZ0 + 0.4, bevelEnabled: false, curveSegments: 16 }), ST); m.position.z = GZ0 - 0.2; g.add(m); tex(m);
    for (let k = 0; k < 11; k++) { const a = Math.PI * (k + 0.5) / 11; for (const zz of [GZ0 - 0.25, HEDGE + 0.25]) add(box(0.9, 0.55, 0.12, STONE_L), GCX + Math.cos(a) * (GR + 0.25), GA + Math.sin(a) * (GR + 0.25), zz, 0, 0, a - Math.PI / 2); }
    for (let k = 0; k < 4; k++) for (const zz of [GZ0 + 0.02, HEDGE - 0.02]) sb(0.9, 1.0, 0.44, GX0 + 0.7 + k * 2.0, top + 0.5, zz);
    for (let x = GX0 + 0.3; x < GX1; x += 0.5) add(box(0.09, 4.4, 0.09, IRON), x, 11.0, GZ0 + 1.2);                       // grade levantada
    for (const yy of [9.0, 9.9, 10.8]) add(box(GX1 - GX0 - 0.2, 0.09, 0.09, IRON), GCX, yy, GZ0 + 1.2);
    for (let x = GX0 + 0.3; x < GX1; x += 0.5) add(cone(0.07, 0.3, IRON, 4), x, 8.65, GZ0 + 1.2, Math.PI, 0, 0);
    for (const sx of [-1, 1]) {                                                         // folhas abertas, encostadas nas paredes da passagem
      const x = sx < 0 ? GX0 + 0.13 : GX1 - 0.13;
      add(box(0.2, 6.3, 3.6, '#5e3d24'), x, 3.2, GZ0 + 3.9); for (const yy of [1.2, 3.2, 5.2]) add(box(0.06, 0.16, 3.6, IRON), x - sx * 0.12, yy, GZ0 + 3.9);
      for (let k = 0; k < 6; k++) add(box(0.04, 6.2, 0.04, '#4e321e'), x - sx * 0.11, 3.2, GZ0 + 2.25 + k * 0.6);
    }
    shield(g, GCX, 11.7, HEDGE + 0.22, FLAGS.red, 1.5, 1.8);                              // brasão sobre o arco (por dentro)
    shield(g, GCX, 11.7, GZ0 - 0.22, FLAGS.blue, 1.5, 1.8, Math.PI);
    for (const [x, c] of [[GCX - 2.55, FLAGS.red], [GCX + 2.55, FLAGS.blue]]) for (const [zz, ry] of [[HEDGE + 0.3, 0], [GZ0 - 0.3, Math.PI]]) {
      add(box(1.2, 0.08, 0.08, IRON), x, 12.65, zz); const b = hangingBanner(c, 1.05, 2.0); b.position.set(x, 12.6, zz); b.rotation.y = ry; g.add(b);
    }
    for (const sx of [-1, 1]) { lantern(g, GCX + sx * (GR + 1.0), 4.4, HEDGE); glows.push([GCX + sx * (GR + 1.0), 4.17, HEDGE + 0.42]); }
  }

  // ---------- praça: piso de lajes, quadrantes e ilha marcados com guias de pedra escura, fonte, barracas, bancos ----------
  const PL = V.PL;
  pv.flag.rect(PL.x0, PL.x1, PL.z0, PL.z1, MH + 0.02);
  for (const q of V.quads) for (const k of ['a', 'b']) {
    const r = q[k], t = 0.28, y = MH + 0.028;
    pv.curb.rect(r.x0, r.x1, r.z0, r.z0 + t, y); pv.curb.rect(r.x0, r.x1, r.z1 - t, r.z1, y); pv.curb.rect(r.x0, r.x0 + t, r.z0, r.z1, y); pv.curb.rect(r.x1 - t, r.x1, r.z0, r.z1, y);
  }
  pv.curb.ring(F.x, F.z, V.ISLAND - 0.3, V.ISLAND, MH + 0.045, 40);
  // fonte: degrau, bacia octogonal, borda, coluna com duas taças, quatro bicas; bica de encher balde virada para o sul
  {
    const y = MH;
    add(cyl(4.05, 4.15, 0.16, STONE_L, 8), F.x, y + 0.08, F.z, 0, Math.PI / 8, 0);
    tex(add(cyl(3.6, 3.65, 0.6, ST, 8), F.x, y + 0.46, F.z, 0, Math.PI / 8, 0));
    for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * Math.PI * 2; add(box(2.85, 0.2, 0.46, STONE_L), F.x + Math.cos(a) * 3.4, y + 0.86, F.z + Math.sin(a) * 3.4, 0, -a + Math.PI / 2, 0); }
    const pool = dynamic(mesh(new THREE.CircleGeometry(3.25, 24), mat('#5f8ea8', { roughness: 0.15, metalness: 0.1 }))); pool.rotation.x = -Math.PI / 2; pool.position.set(F.x, y + 0.8, F.z); pool.userData.water = 'pool'; pool.name = 'water'; g.add(pool);
    tex(add(cyl(0.75, 0.9, 0.5, ST, 10), F.x, y + 1.0, F.z)); add(cyl(0.34, 0.4, 2.3, STONE_L, 10), F.x, y + 2.1, F.z);
    add(cyl(1.45, 0.55, 0.36, STONE_L, 12), F.x, y + 2.0, F.z); add(cyl(1.3, 1.3, 0.05, '#6f9cb4', 12), F.x, y + 2.17, F.z);
    add(cyl(0.22, 0.3, 0.9, STONE_L, 8), F.x, y + 2.6, F.z); add(cyl(0.75, 0.3, 0.26, STONE_L, 10), F.x, y + 3.1, F.z); add(cyl(0.62, 0.62, 0.04, '#6f9cb4', 10), F.x, y + 3.22, F.z);
    add(sphere(0.22, STONE_L, 8, 6), F.x, y + 3.45, F.z); add(cone(0.12, 0.4, STONE_L, 8), F.x, y + 3.75, F.z);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; add(cyl(0.06, 0.08, 0.5, '#a0753a', 6), F.x + Math.cos(a) * 0.55, y + 1.45, F.z + Math.sin(a) * 0.55, 0, -a, Math.PI / 2 - 0.3); }
    // bica: pilarzinho na borda sul, cano de bronze para fora, grelha no chão onde se põe o balde
    tex(add(box(0.55, 1.25, 0.45, ST), F.x, y + 0.62, F.z + 3.62)); add(box(0.7, 0.14, 0.6, STONE_L), F.x, y + 1.3, F.z + 3.62);
    add(cyl(0.05, 0.06, 0.45, '#a0753a', 6), F.x, y + 1.05, F.z + 3.95, Math.PI / 2 - 0.25, 0, 0);
    add(box(0.75, 0.03, 0.6, '#3d3a36'), F.x, y + 0.04, F.z + 4.3);
    // jatos de água (uma malha só, animada pela vida)
    const jets = [], tube = (pts, r) => jets.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, r, 5, false));
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a); tube([V3(c * 0.78, 1.35, s * 0.78), V3(c * 1.25, 1.42, s * 1.25), V3(c * 1.75, 1.1, s * 1.75), V3(c * 2.0, 0.8, s * 2.0)], 0.055); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a); tube([V3(c * 1.42, 2.15, s * 1.42), V3(c * 1.55, 1.7, s * 1.55), V3(c * 1.6, 0.85, s * 1.6)], 0.035); }
    tube([V3(0, 3.95, 0), V3(0, 4.35, 0.05), V3(0.05, 3.6, 0.1)], 0.05);
    tube([V3(0, 1.0, 4.16), V3(0, 0.75, 4.3), V3(0, 0.1, 4.32)], 0.045);
    const jm = dynamic(new THREE.Mesh(mergeGeometries(jets, false), new THREE.MeshStandardMaterial({ color: '#cfe8f4', emissive: '#5a8aa0', emissiveIntensity: 0.25, transparent: true, opacity: 0.8, roughness: 0.1 })));
    jm.position.set(F.x, y, F.z); jm.userData.water = 'jet'; jm.name = 'water'; g.add(jm);
  }
  // barracas do mercado (frente = +z local, virada para o anel): postes, balcão, prateleira, toldo listrado e mercadorias
  const STALL_COL = [['#b8342a', '#efe1c4'], ['#2f5a9a', '#efe1c4'], ['#d9a62a', '#8a5a2c'], ['#3f7a46', '#efe1c4'], ['#8a4a9a', '#efe1c4'], ['#c8642a', '#f2e6c8'], ['#b8342a', '#d9a62a'], ['#2f6f7a', '#efe1c4']];
  V.stalls.forEach((st, i) => {
    const sg = new THREE.Group(); sg.position.set(st.x, MH, st.z); sg.rotation.y = st.ry; g.add(sg);
    const A = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { sg.add(at(m, x, y, z, rx, ry, rz)); return m; }, w = st.w;
    for (const [x, z, hh] of [[-w / 2 + 0.1, -1.15, 2.6], [w / 2 - 0.1, -1.15, 2.6], [-w / 2 + 0.1, 1.05, 2.25], [w / 2 - 0.1, 1.05, 2.25]]) A(box(0.13, hh, 0.13, WOOD), x, hh / 2, z);
    A(box(w - 0.1, 0.08, 0.85, WOOD_L), 0, 0.95, 0.72); A(box(w - 0.1, 0.88, 0.06, WOOD), 0, 0.46, 1.12);
    for (const x of [-w / 2 + 0.12, w / 2 - 0.12]) A(box(0.06, 0.88, 0.85, WOOD), x, 0.46, 0.72);
    for (const y of [0.62, 1.3]) A(box(w - 0.3, 0.06, 0.45, WOOD_L), 0, y, -0.95);
    A(box(0.5, 0.45, 0.5, WOOD_L), w / 2 - 0.7, 0.22, -0.3);                            // banquinho do vendedor
    sg.add(awning(-w / 2 - 0.12, w / 2 + 0.12, 2.64, -1.3, 2.2, 1.55, STALL_COL[i][0], STALL_COL[i][1]));
    const basket = (x, z, items) => { A(cyl(0.36, 0.28, 0.22, WICKER, 10), x, 1.1, z); A(torus(0.35, 0.03, '#9a7442', 4, 12), x, 1.21, z, Math.PI / 2, 0, 0); items(x, z); };
    if (st.kind === 'food') {
      basket(-1.3, 0.72, (x, z) => { for (let k = 0; k < 7; k++) A(blob(0.1, k % 3 ? '#c8352a' : '#e0a83a'), x + Math.cos(k * 0.9) * 0.18 * (k % 2 + 0.3), 1.28 + (k > 4 ? 0.06 : 0), z + Math.sin(k * 0.9) * 0.18 * (k % 2 + 0.3)); });
      basket(0, 0.72, (x, z) => { for (let k = 0; k < 4; k++) { const l = sphere(0.15, '#c98a45', 7, 5); l.scale.set(1.4, 0.6, 0.75); A(l, x + (k % 2 - 0.5) * 0.24, 1.3 + Math.floor(k / 2) * 0.05, z + (Math.floor(k / 2) - 0.5) * 0.2, 0, k, 0); } });
      basket(1.3, 0.72, (x, z) => { for (let k = 0; k < 3; k++) A(cyl(0.17, 0.17, 0.12, '#e6c35a', 10), x + (k - 1) * 0.12, 1.27 + (k === 1 ? 0.1 : 0), z + (k - 1) * 0.06); });
      for (let k = 0; k < 4; k++) A(blob(0.14, k % 2 ? '#7ea04a' : '#9ab65a'), -0.9 + k * 0.6, 1.07, -0.95 + (k % 2) * 0.1);   // repolhos e peras na prateleira
      for (let k = 0; k < 3; k++) { const s = sphere(0.18, '#e9dcc0', 7, 5); s.scale.set(1, 1.3, 0.9); A(s, -1.4 + k * 0.4, 0.88, -0.95); }
      A(box(0.7, 0.45, 0.55, WOOD_L), -w / 2 + 0.55, 0.23, -0.45); for (let k = 0; k < 4; k++) A(blob(0.13, '#d47a2a'), -w / 2 + 0.4 + (k % 2) * 0.28, 0.5, -0.57 + Math.floor(k / 2) * 0.24);
    } else if (st.kind === 'cloth') {
      const cc = ['#b8342a', '#2f5a9a', '#d9a62a', '#3f7a46', '#8a4a9a', '#efe1c4', '#c8642a'];
      for (let k = 0; k < 7; k++) A(cyl(0.13, 0.13, 0.8, cc[(k + i) % 7], 9), -1.45 + (k % 4) * 0.42 + (k > 3 ? 0.21 : 0), 1.12 + (k > 3 ? 0.21 : 0), 0.72, Math.PI / 2, 0, 0);
      for (let s = 0; s < 3; s++) for (let k = 0; k < 3; k++) A(box(0.6, 0.08, 0.38, cc[(s * 3 + k + i) % 7]), 0.6 + s * 0.68, 1.03 + k * 0.085, 0.72);
      for (let s = 0; s < 3; s++) for (let k = 0; k < 4; k++) A(box(0.55, 0.07, 0.36, cc[(s + k * 2) % 7]), -1.2 + s * 1.1, 1.37 + k * 0.075, -0.95);
      A(box(0.85, 0.75, 0.03, cc[(i + 3) % 7]), -0.9, 0.62, 1.17); A(box(0.85, 0.08, 0.04, shade(cc[(i + 3) % 7], 0.7)), -0.9, 0.96, 1.17);
    } else {
      for (let k = 0; k < 3; k++) { const p = sphere(0.2, ['#a8603a', '#8e5030', '#b8744a'][k], 8, 6); p.scale.y = 0.9; A(p, -1.5 + k * 0.48, 1.17, 0.72); A(cyl(0.09, 0.12, 0.14, ['#a8603a', '#8e5030', '#b8744a'][k], 8), -1.5 + k * 0.48, 1.38, 0.72); }
      for (let k = 0; k < 2; k++) { A(cyl(0.2, 0.18, 0.06, IRON, 10), 0.2 + k * 0.5, 1.02, 0.65); A(box(0.32, 0.03, 0.05, IRON), 0.2 + k * 0.5, 1.03, 0.65 + 0.33); }
      for (let k = 0; k < 2; k++) { A(box(0.05, 0.04, 0.42, WOOD_L), 1.35 + k * 0.3, 1.01, 0.75); A(box(0.18, 0.09, 0.08, IRON), 1.35 + k * 0.3, 1.04, 0.56); }
      A(torus(0.2, 0.06, '#c9b27a', 5, 12), 1.6, 1.05, 0.9, Math.PI / 2, 0, 0);
      for (let k = 0; k < 4; k++) A(box(0.04, 0.5, 0.04, IRON), -1.2 + k * 0.5, 1.5, -1.12, 0, 0, (k % 2) * 0.15);
      for (const [x, rz] of [[w / 2 - 0.32, -0.12], [w / 2 - 0.55, -0.18]]) { A(cyl(0.03, 0.03, 1.6, WOOD_L, 5), x, 0.8, -0.55, 0, 0, rz); A(box(0.3, 0.38, 0.03, IRON), x + 0.1, 0.17, -0.55, 0, 0, rz); }
    }
  });
  for (const b of V.benches) {                                                           // bancos: madeira sobre pés de pedra (o do jardim é todo de pedra)
    const bg = new THREE.Group(); bg.position.set(b.x, b.y, b.z); bg.rotation.y = b.ry; g.add(bg);
    if (b.stone) { bg.add(at(box(2.3, 0.16, 0.7, STONE_L), 0, 0.48, 0), at(box(2.3, 0.55, 0.16, STONE_L), 0, 0.83, -0.3)); for (const d of [-0.85, 0.85]) bg.add(at(box(0.32, 0.42, 0.6, STONE_D), d, 0.21, 0)); continue; }
    bg.add(at(box(2.0, 0.1, 0.55, WOOD_L), 0, 0.48, 0), at(box(2.0, 0.42, 0.08, WOOD_L), 0, 0.82, -0.24)); for (const d of [-0.78, 0.78]) bg.add(at(box(0.26, 0.44, 0.5, STONE_L), d, 0.22, 0));
  }
  for (const q of V.quads) {                                                             // vasos grandes nas pontas dos quadrantes
    const x = q.sx < 0 ? q.a.x0 + 1.0 : q.a.x1 - 1.0, z = q.sz < 0 ? q.b.z0 + 1.0 : q.b.z1 - 1.0;
    tex(add(cyl(0.6, 0.5, 0.7, ST, 8), x, MH + 0.35, z)); const b = blob(0.68, LEAF[1]); b.scale.y *= 0.8; add(b, x, MH + 0.95, z);
    for (let k = 0; k < 5; k++) add(bud(0.12, FLOWER[k]), x + Math.cos(k * 1.3) * 0.45, MH + 1.2, z + Math.sin(k * 1.3) * 0.45);
  }

  // ---------- depósito (galpão de tábuas, porta grande a oeste, caixotes e barris em volta) ----------
  {
    const D = V.depot, y = level((D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2), x1 = D.x1 - 0.4, z0 = D.z0 + 1.0, z1 = D.z1 - 1.0, Hd = 3.6, zc = (z0 + z1) / 2;
    let x0 = D.x0 + 0.3; while ([D.z0, zc, D.z1].some(z => V.roadDist(x0 - 0.15, z) < hw + 0.1)) x0 += 0.05;   // (a caixa do plano encosta na rua: o galpão começa na beira)
    add(box(x1 - x0, Hd, z1 - z0, '#7a5434'), (x0 + x1) / 2, y + Hd / 2, zc);
    for (let x = x0 + 0.3; x < x1; x += 0.55) for (const zz of [z0 - 0.03, z1 + 0.03]) add(box(0.08, Hd, 0.05, WOOD_D), x, y + Hd / 2, zz);
    for (let z = z0 + 0.3; z < z1; z += 0.55) add(box(0.05, Hd, 0.08, WOOD_D), x1 + 0.03, y + Hd / 2, z);
    for (const z of [z0 + 0.3, zc - 1.6, zc + 1.6, z1 - 0.3]) add(box(0.05, Hd, 0.08, WOOD_D), x0 - 0.03, y + Hd / 2, z);
    const dh = 2.9, dw = 2.8;
    add(box(0.06, dh, dw, '#2b2018'), x0 - 0.02, y + dh / 2, zc); add(box(0.2, 0.25, dw + 0.5, WOOD_D), x0 - 0.06, y + dh + 0.12, zc);
    for (const sz of [-1, 1]) add(box(0.1, dh - 0.1, dw / 2, WOOD), x0 - 0.1, y + dh / 2, zc + sz * (dw * 0.75 + 0.1));   // folhas abertas, rentes à parede
    const rise = 2.1, X = V3(1, 0, 0);
    for (const sd of [V3(0, -rise, z1 - zc), V3(0, -rise, z0 - zc)]) slope(g, '#7a4a2a', V3((x0 + x1) / 2, y + Hd + rise, zc), sd.clone().normalize(), sd.length() * (1 + 0.5 / Math.abs(sd.z)), X, x1 - x0 + 0.6, 4);
    for (const x of [x0 - 0.05, x1 - 0.15]) { const m = gableTri([[z0, y + Hd], [z1, y + Hd], [zc, y + Hd + rise]], 'z', x, 0.2, mat('#7a5434')); g.add(m); }
    for (let k = 0; k < 4; k++) add(box(0.85, 0.7, 0.75, k % 2 ? '#a07a4a' : '#8f6a3e'), x0 + 0.9 + k * 1.15, y + 0.35, D.z0 + 0.45, 0, (k % 3) * 0.1, 0);
    add(box(0.8, 0.65, 0.7, '#a07a4a'), x0 + 1.5, y + 1.03, D.z0 + 0.45, 0, 0.2, 0);
    for (let k = 0; k < 5; k++) barrel(g, x0 + 0.7 + k * 0.8, y, D.z1 - 0.48, 0.95);
    for (let k = 0; k < 3; k++) { const s = sphere(0.32, '#e2d4b4', 7, 5); s.scale.set(1, 1.25, 0.8); add(s, x1 - 0.6 - k * 0.6, y + 0.4, D.z0 + 0.5); }
  }

  // ---------- castelo no alto: muralhas com ameias, 4 torres redondas com telhado cônico, portão com arco, torre de menagem,
  // salão com telhado de telhas, janelas acesas, bandeiras; pátio da frente com poço e estandartes ----------
  {
    const CA = V.castle, y = HH, CT = 4.6, CWH = 12;
    pv.flag.rect(CA.court.x0, CA.court.x1, CA.court.z0, CA.court.z1, y + 0.025);
    pv.flag.rect(CA.x0 + 2, CA.x1 - 2, CA.z0, CA.z1 - 2, y + 0.02);                                   // (inclui a passagem do portão)
    const TC = [[CA.x0 + CT, CA.z0 + CT, 'blue'], [CA.x1 - CT, CA.z0 + CT, 'red'], [CA.x0 + CT, CA.z1 - CT, 'red'], [CA.x1 - CT, CA.z1 - CT, 'blue']];
    const curtain = (x0, x1, z0, z1) => {
      const along = x1 - x0 > z1 - z0, L = along ? x1 - x0 : z1 - z0;
      sb(x1 - x0, CWH, z1 - z0, (x0 + x1) / 2, y + CWH / 2, (z0 + z1) / 2); add(box(x1 - x0 + 0.3, 0.22, z1 - z0 + 0.3, STONE_L), (x0 + x1) / 2, y + CWH, (z0 + z1) / 2);
      for (let u = 0.6; u < L - 0.5; u += 1.8) for (const side of [-1, 1]) sb(along ? 0.9 : 0.44, 1.0, along ? 0.44 : 0.9, along ? x0 + u : (x0 + x1) / 2 + side * ((x1 - x0) / 2 - 0.22), y + CWH + 0.6, along ? (z0 + z1) / 2 + side * ((z1 - z0) / 2 - 0.22) : z0 + u);
    };
    const T2 = 2.4, gx = CA.gateX, G0 = gx - 3.4, G1 = gx + 3.4;
    curtain(CA.x0 + CT, G0 - 2.6, CA.z0, CA.z0 + T2); curtain(G1 + 2.6, CA.x1 - CT, CA.z0, CA.z0 + T2);
    curtain(CA.x0 + CT, CA.x1 - CT, CA.z1 - T2, CA.z1); curtain(CA.x0, CA.x0 + T2, CA.z0 + CT, CA.z1 - CT); curtain(CA.x1 - T2, CA.x1, CA.z0 + CT, CA.z1 - CT);
    for (const [x, z, c] of TC) {
      roundTower(x, y, z, CT, 17, true, FLAGS[c], false);
      const at0 = Math.atan2(130 - z, 129 - x);                                         // janelas viradas para a cidade
      for (const [a, yy] of [[at0, 9], [at0 + 0.55, 13]]) {
        const wx = x + Math.cos(a) * (CT + 0.03), wz = z + Math.sin(a) * (CT + 0.03);
        add(box(0.75, 1.3, 0.12, glowMat()), wx, y + yy, wz, 0, -a + Math.PI / 2, 0); add(box(1.0, 0.2, 0.25, STONE_L), wx, y + yy - 0.72, wz, 0, -a + Math.PI / 2, 0);
      }
      for (const a of [1.2, 2.6, 4.2, 5.4]) add(box(0.16, 1.1, 0.16, '#2a2622'), x + Math.cos(a) * (CT + 0.02), y + 5, z + Math.sin(a) * (CT + 0.02), 0, -a, 0);
    }
    // portão: duas torres em D, bloco com arco, portas fechadas, grade, estandarte grande
    for (const sx of [-1, 1]) { const tx = gx + sx * 4.6; tex(add(cyl(3.0, 3.1, 14, ST, 16), tx, y + 7, CA.z0 + 3.2)); tex(add(cyl(3.35, 3.0, 0.6, ST, 16), tx, y + 14.3, CA.z0 + 3.2));
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; sb(0.85, 1.0, 0.44, tx + Math.cos(a) * 3.15, y + 15.1, CA.z0 + 3.2 + Math.sin(a) * 3.15, 0, -a + Math.PI / 2, 0); }
      add(box(0.7, 1.2, 0.12, glowMat()), tx, y + 9.5, CA.z0 + 0.17); add(box(0.16, 1.1, 0.16, '#2a2622'), tx, y + 5.0, CA.z0 + 0.2);
      lantern(g, gx + sx * 2.75, y + 3.6, CA.z0); glows.push([gx + sx * 2.75, y + 3.37, CA.z0 + 0.42]); }
    {
      const sh = new THREE.Shape(), a0 = 3.8, r0 = 2.3, top = 13.2;
      sh.moveTo(G0, y); sh.lineTo(gx - r0, y); sh.lineTo(gx - r0, y + a0); sh.absarc(gx, y + a0, r0, Math.PI, 0, true); sh.lineTo(gx + r0, y); sh.lineTo(G1, y); sh.lineTo(G1, y + top); sh.lineTo(G0, y + top); sh.closePath();
      const m = mesh(new THREE.ExtrudeGeometry(sh, { depth: 5.0, bevelEnabled: false, curveSegments: 12 }), ST); m.position.z = CA.z0; g.add(m); tex(m);
      for (let k = 0; k < 4; k++) sb(0.9, 1.0, 0.44, G0 + 0.7 + k * 1.8, y + top + 0.5, CA.z0 + 0.22);
      for (let k = 0; k < 9; k++) { const a = Math.PI * (k + 0.5) / 9; add(box(0.7, 0.5, 0.1, STONE_L), gx + Math.cos(a) * (r0 + 0.22), y + a0 + Math.sin(a) * (r0 + 0.22), CA.z0 - 0.04, 0, 0, a - Math.PI / 2); }
      add(box(r0 * 2, a0 + r0, 0.1, '#1e1814'), gx, y + (a0 + r0) / 2, CA.z0 + 2.6);
      for (const sx of [-1, 1]) { add(box(r0 - 0.05, a0 + 1.2, 0.14, '#5e3d24'), gx + sx * r0 / 2, y + (a0 + 1.2) / 2, CA.z0 + 2.45); for (const yy of [0.8, 2.4, 4.0]) add(box(r0 - 0.15, 0.14, 0.06, IRON), gx + sx * r0 / 2, y + yy, CA.z0 + 2.35); }
      for (let x = gx - r0 + 0.25; x < gx + r0; x += 0.42) { add(box(0.08, 2.0, 0.08, IRON), x, y + a0 + r0 - 0.7, CA.z0 + 0.9); add(cone(0.06, 0.25, IRON, 4), x, y + a0 + r0 - 1.8, CA.z0 + 0.9, Math.PI, 0, 0); }
      add(box(1.4, 0.08, 0.08, IRON), gx, y + 12.2, CA.z0 - 0.06); const b = hangingBanner(FLAGS.blue, 1.3, 3.2, '#e9c46a'); b.position.set(gx, y + 12.15, CA.z0 - 0.08); b.rotation.y = Math.PI; g.add(b);
      shield(g, gx, y + 7.6, CA.z0 - 0.06, FLAGS.red, 1.0, 1.2, Math.PI);
    }
    // torre de menagem (alta, com guaritas nos cantos e telhado em pirâmide) e salão com telhado de telhas
    const K = { x0: 210, x1: 224, z0: 228.5, z1: 242.5 }, KH = 25, kx = (K.x0 + K.x1) / 2, kz = (K.z0 + K.z1) / 2;
    sb(K.x1 - K.x0, KH, K.z1 - K.z0, kx, y + KH / 2, kz); sb(K.x1 - K.x0 + 0.8, 0.7, K.z1 - K.z0 + 0.8, kx, y + KH + 0.35, kz);
    for (let u = 0.6; u < 14.4; u += 1.8) for (const [px, pz, rot] of [[K.x0 + u, K.z0 - 0.15, 0], [K.x0 + u, K.z1 + 0.15, 0], [K.x0 - 0.15, K.z0 + u, 1], [K.x1 + 0.15, K.z0 + u, 1]]) sb(rot ? 0.44 : 0.9, 1.0, rot ? 0.9 : 0.44, px, y + KH + 1.2, pz);
    add(cone(9.0, 9.5, SLATE, 4), kx, y + KH + 0.7 + 4.75, kz, 0, Math.PI / 4, 0);
    add(cyl(0.07, 0.07, 4, IRON, 5), kx, y + KH + 11.6, kz); { const f = mastFlag(FLAGS.yellow, 2.4, 1.5, FLAGS.red); f.position.set(kx, y + KH + 13.5, kz); g.add(f); }
    for (const [cx, cz] of [[K.x0, K.z0], [K.x1, K.z0], [K.x0, K.z1], [K.x1, K.z1]]) {
      tex(add(cyl(1.3, 0.9, 5.5, ST, 10), cx, y + KH + 0.2, cz)); add(cone(1.65, 3.4, SLATE, 10), cx, y + KH + 4.65, cz);
    }
    for (const yy of [8, 13.5, 19]) for (const dx of [-3.6, 0, 3.6]) {
      if (yy === 8 && dx === 0) continue;
      add(box(0.85, 1.6, 0.12, glowMat()), kx + dx, y + yy, K.z0 - 0.04); add(box(1.15, 0.2, 0.3, STONE_L), kx + dx, y + yy - 0.88, K.z0 - 0.1); add(cyl(0.43, 0.43, 0.12, glowMat(), 8, ), kx + dx, y + yy + 0.8, K.z0 - 0.04, Math.PI / 2, 0, 0);
      for (const sx of [-1, 1]) add(box(0.85, 1.6, 0.12, glowMat()), sx < 0 ? K.x0 - 0.04 : K.x1 + 0.04, y + yy, kz + dx, 0, Math.PI / 2, 0);
    }
    const Hh = { x0: 202, x1: 232, z0: 240.5, z1: 247.6 }, HHt = 10, hz = (Hh.z0 + Hh.z1) / 2;
    sb(Hh.x1 - Hh.x0, HHt, Hh.z1 - Hh.z0, (Hh.x0 + Hh.x1) / 2, y + HHt / 2, hz);
    for (const sd of [V3(0, -4, Hh.z1 - hz), V3(0, -4, Hh.z0 - hz)]) slope(g, MV_COL.roof.terracotta, V3((Hh.x0 + Hh.x1) / 2, y + HHt + 4, hz), sd.clone().normalize(), sd.length() * (1 + 0.5 / Math.abs(sd.z)), V3(1, 0, 0), Hh.x1 - Hh.x0 + 0.4, 6);
    add(box(Hh.x1 - Hh.x0 + 0.4, 0.22, 0.45, shade(MV_COL.roof.terracotta, 0.82)), (Hh.x0 + Hh.x1) / 2, y + HHt + 4.12, hz);
    for (const x of [Hh.x0, Hh.x1 - 0.2]) { const m = gableTri([[Hh.z0, y + HHt], [Hh.z1, y + HHt], [hz, y + HHt + 4]], 'z', x, 0.2, ST); g.add(m); tex(m); }
    for (const x of [205, 229]) { sb(1.0, 5.6, 1.0, x, y + HHt + 2.6, hz + 1.2); add(box(1.2, 0.15, 1.2, STONE_D), x, y + HHt + 5.45, hz + 1.2); smoke(g, x, y + HHt + 5.8, hz + 1.2); }
    for (let x = 204; x < 231; x += 3.3) if (x < K.x0 - 1 || x > K.x1 + 1) add(box(0.8, 1.5, 0.12, glowMat()), x, y + 6.5, Hh.z0 - 0.04);
    // pátio: poço com telhadinho, estandartes ladeando o caminho, barris e feno
    const wl = { x: CA.court.x0 + 7, z: CA.court.z0 + 6.5 };
    tex(add(cyl(1.15, 1.2, 0.95, ST, 12), wl.x, y + 0.48, wl.z)); add(cyl(0.95, 0.95, 0.04, '#2a3a44', 12), wl.x, y + 0.9, wl.z); add(torus(1.12, 0.1, STONE_L, 5, 16), wl.x, y + 0.97, wl.z, Math.PI / 2, 0, 0);
    for (const sx of [-1, 1]) add(box(0.16, 2.2, 0.16, WOOD), wl.x + sx * 1.0, y + 1.6, wl.z);
    add(cyl(0.08, 0.08, 2.2, WOOD_L, 6), wl.x, y + 2.3, wl.z, 0, 0, Math.PI / 2); add(box(0.04, 0.9, 0.04, '#cdbf9c'), wl.x, y + 1.85, wl.z);
    add(cyl(0.18, 0.15, 0.28, WOOD, 8), wl.x, y + 1.35, wl.z);
    for (const s2 of [-1, 1]) add(box(2.6, 0.08, 1.15, SLATE), wl.x, y + 2.85, wl.z + s2 * 0.5, s2 * 0.55, 0, 0);
    solids.push({ x0: wl.x - 1.3, x1: wl.x + 1.3, z0: wl.z - 1.3, z1: wl.z + 1.3 });
    for (const sx of [-1, 1]) {
      const px = gx + sx * 5.2, pz = CA.court.z0 + 8.5;
      tex(add(cyl(0.35, 0.4, 0.4, ST, 8), px, y + 0.2, pz)); add(cyl(0.07, 0.08, 6.5, WOOD_D, 6), px, y + 3.25, pz); add(box(1.4, 0.08, 0.08, WOOD_D), px, y + 6.2, pz); add(sphere(0.12, '#c9a24a', 6, 4), px, y + 6.55, pz);
      const b = hangingBanner(sx < 0 ? FLAGS.red : FLAGS.blue, 1.15, 2.6, '#e9c46a'); b.position.set(px, y + 6.15, pz); b.rotation.y = Math.PI; g.add(b);
      solids.push({ x0: px - 0.45, x1: px + 0.45, z0: pz - 0.45, z1: pz + 0.45 });
    }
    for (let k = 0; k < 3; k++) barrel(g, CA.court.x1 - 2.2 - k * 0.8, y, CA.court.z1 - 1.0);
    for (let k = 0; k < 2; k++) add(box(1.3, 0.75, 0.9, '#d8be6a'), CA.court.x1 - 2.6 - k * 1.4, y + 0.375, CA.court.z0 + 2.2, 0, k * 0.2, 0);
    solids.push({ x0: CA.court.x1 - 4.4, x1: CA.court.x1 - 1.6, z0: CA.court.z1 - 1.5, z1: CA.court.z1 - 0.4 }, { x0: CA.court.x1 - 4.6, x1: CA.court.x1 - 1.8, z0: CA.court.z0 + 1.6, z1: CA.court.z0 + 2.8 });
  }

  // ---------- jardim junto à muralha (alto, oeste): caminho de saibro, canteiros, sebes baixas, arco de rosas, banco de pedra com vista
  // (o círculo em kSpot fica vazio: lugar reservado) ----------
  {
    const G = V.garden, y = HH, H2 = '#4f6f3a';
    pv.gravel.band(180, G.z0 - 0.6, 180, 236.5, 1.8, y + 0.02); pv.gravel.disc(180, 236.5, 0.9, y + 0.02, 12);
    pv.gravel.band(180, 236.5, G.bench.x + 1.4, G.bench.z, 1.6, y + 0.021); pv.gravel.disc(G.bench.x + 1.2, G.bench.z, 1.6, y + 0.022, 14);
    pv.gravel.band(180, 236.5, 184.5, 244.5, 1.4, y + 0.02); pv.gravel.disc(184.5, 244.5, 1.6, y + 0.021, 14);
    for (const [a, b] of [[G.x0, 178.9], [181.1, G.x1]]) { add(box(b - a, 0.8, 0.7, H2), (a + b) / 2, y + 0.4, G.z0 + 0.35); vanOnly.push({ x0: a, x1: b, z0: G.z0, z1: G.z0 + 0.7 }); }
    add(box(0.7, 0.8, G.z1 - G.z0, H2), G.x1 - 0.35, y + 0.4, (G.z0 + G.z1) / 2); vanOnly.push({ x0: G.x1 - 0.7, x1: G.x1, z0: G.z0, z1: G.z1 });
    for (let x = G.x0 + 0.5; x < G.x1 - 0.5; x += 0.9) if (Math.abs(x - 180) > 1.3) { const m = blob(0.46, LEAF[(x * 7 | 0) % 3]); m.scale.y *= 0.8; add(m, x, y + 0.85, G.z0 + 0.35, 0, x, 0); }
    for (let z = G.z0 + 0.9; z < G.z1 - 0.4; z += 0.9) { const m = blob(0.46, LEAF[(z * 7 | 0) % 3]); m.scale.y *= 0.8; add(m, G.x1 - 0.35, y + 0.85, z, 0, z, 0); }
    for (const sx of [-1, 1]) add(box(0.18, 2.6, 0.18, WOOD), 180 + sx * 1.15, y + 1.3, G.z0 + 0.35);                                    // arco de rosas na entrada
    for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8; add(box(0.14, 0.14, 0.3, WOOD), 180 + Math.cos(a) * 1.15, y + 2.6 + Math.sin(a) * 0.6, G.z0 + 0.35); }
    for (let i = 0; i < 14; i++) { const a = Math.PI * (i / 13), side = i % 2 ? 1 : -1; add(blob(0.17 + (i % 3) * 0.04, i % 3 ? '#d26a8a' : '#b8342a'), 180 + Math.cos(a) * 1.2, y + 2.6 + Math.sin(a) * 0.65 + 0.08, G.z0 + 0.35 + side * 0.12); }
    for (let i = 0; i < 6; i++) { const m = blob(0.3, LEAF[i % 3]); m.scale.set(0.24, 0.42, 0.24); add(m, 180 + (i < 3 ? -1.15 : 1.15), y + 0.6 + (i % 3) * 0.6, G.z0 + 0.35); }
    const bed = (x, z, w, d, seed) => {                                                               // canteiro com borda de pedra
      add(box(w, 0.3, d, STONE_L), x, y + 0.15, z); add(box(w - 0.3, 0.06, d - 0.3, '#5e4a34'), x, y + 0.31, z);
      const r = rng(seed); for (let i = 0; i < Math.round(w * d * 2.2); i++) { const px = x - w / 2 + 0.3 + r() * (w - 0.6), pz = z - d / 2 + 0.3 + r() * (d - 0.6); add(blob(0.13, LEAF[i % 3]), px, y + 0.42, pz); add(bud(0.1, FLOWER[Math.floor(r() * 5)]), px, y + 0.56, pz, r(), r(), 0); }
      vanOnly.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    };
    bed(187.5, 232.5, 3.6, 1.6, 3); bed(187.5, 238.5, 3.6, 1.6, 4); bed(176.5, 252.0, 4.2, 1.5, 5);
    for (let i = 0; i < 6; i++) { const m = blob(0.42, '#8f7fb0'); m.scale.y *= 0.75; add(m, 170.4, y + 0.32, 244.5 + i * 1.3, 0, i, 0); add(blob(0.3, '#6f8a52'), 170.4, y + 0.18, 244.5 + i * 1.3); }   // lavandas junto à mureta
    tex(add(cyl(0.25, 0.4, 0.8, ST, 8), 184.5, y + 0.4, 244.5)); add(cyl(0.75, 0.45, 0.22, STONE_L, 10), 184.5, y + 0.9, 244.5); add(cyl(0.62, 0.62, 0.03, '#6f9cb4', 10), 184.5, y + 1.0, 244.5);   // bebedouro de pássaros
    solids.push({ x0: 183.9, x1: 185.1, z0: 243.9, z1: 245.1 });
    for (const z of [235.5, 244.5]) pot(g, V.HIGH.x0, y + 0.8, z, 1.1, false);
  }

  // ---------- largos (lajes de pedra, cocho de pedra e poste de amarrar), travessas (lajes, frades nas pontas), nichos ----------
  const trough = (x, z, ry, y) => {
    const tg = new THREE.Group(); tg.position.set(x, y, z); tg.rotation.y = ry; g.add(tg);
    tg.add(at(box(2.4, 0.65, 0.85, STONE_L), 0, 0.33, 0), at(box(2.1, 0.04, 0.55, '#5f8ea8'), 0, 0.6, 0));
    tg.add(at(cyl(0.14, 0.17, 1.1, STONE_D, 8), 1.7, 0.55, 0), at(torus(0.13, 0.03, IRON, 4, 10), 1.7, 0.95, 0.15));
  };
  V.largos.forEach((L, i) => {
    const y = level((L.x0 + L.x1) / 2, (L.z0 + L.z1) / 2); pv.cob.rect(L.x0, L.x1, L.z0, L.z1, y + 0.035);
    const spot = [[L.x1 - 1.6, L.z1 - 0.8, 0], [L.x1 - 0.8, L.z1 - 3.0, Math.PI / 2], [(L.x0 + L.x1) / 2, L.z0 + 0.8, 0]][i];
    trough(spot[0], spot[1], spot[2], y); const r = spot[2] ? { x0: spot[0] - 0.5, x1: spot[0] + 0.5, z0: spot[1] - 1.9, z1: spot[1] + 1.3 } : { x0: spot[0] - 1.3, x1: spot[0] + 1.9, z0: spot[1] - 0.5, z1: spot[1] + 0.5 };
    solids.push(r);
  });
  const alleyEnds = [];
  for (const al of V.alleys) {
    // as pontas do plano caem dentro das ruas: a travessa (piso e frades) começa onde termina a calçada
    const P0 = al.a, P1 = al.b, at2 = t => [P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t], ok = t => { const [x, z] = at2(t); return V.roadDist(x, z) >= hw + STRIP; };
    let t0 = 0, t1 = 1; while (t0 < 0.5 && !ok(t0)) t0 += 0.005; while (t1 > 0.5 && !ok(t1)) t1 -= 0.005;
    const [ax, az] = at2(t0), [bx, bz] = at2(t1), y = level(ax, az); alleyEnds.push({ a: [+ax.toFixed(2), +az.toFixed(2)], b: [+bx.toFixed(2), +bz.toFixed(2)], w: al.w });
    pv.flag.band(ax, az, bx, bz, al.w, y + 0.025);
    const vert = Math.abs(bx - ax) < Math.abs(bz - az);
    for (const [x, z] of [[ax, az], [bx, bz]]) for (const d of [-1, 0, 1]) { const px = vert ? x + d * (al.w / 2 - 0.3) : x, pz = vert ? z : z + d * (al.w / 2 - 0.3); add(cyl(0.16, 0.2, 0.85, STONE_L, 8), px, level(px, pz) + 0.42, pz); add(sphere(0.17, STONE_L, 7, 4), px, level(px, pz) + 0.86, pz); }
    if (bz < V.MID.z0 && V.MID.z0 - bz < 6) {                                             // nicho com santo, velas e flores no muro do patamar
      const x = bx, z = V.MID.z0 - 0.35;
      add(box(1.4, 1.9, 0.3, STONE_L), x, 1.35, z - 0.15); add(box(1.0, 1.3, 0.1, '#3a3028'), x, 1.35, z - 0.31);
      add(cone(0.85, 0.6, STONE_L, 4), x, 2.6, z - 0.15, 0, Math.PI / 4, 0); add(cyl(0.16, 0.2, 0.75, '#e9e2d2', 8), x, 1.05, z - 0.42); add(sphere(0.14, '#e9e2d2', 7, 5), x, 1.5, z - 0.42);
      add(box(1.3, 0.1, 0.4, STONE_L), x, 0.62, z - 0.5);
      for (const dx of [-0.4, 0.4]) { add(cyl(0.05, 0.05, 0.22, '#f2ead8', 6), x + dx, 0.78, z - 0.55); add(sphere(0.05, '#ffd27a', 5, 4, { emissive: '#ffb040', emissiveIntensity: 1.2 }), x + dx, 0.92, z - 0.55); glows.push([x + dx, 0.95, z - 0.55, 0.6]); }
      for (const dx of [-0.75, 0.75]) pot(g, x + dx, 0, z - 0.75, 0.8, false);
    }
  }

  // ---------- vida nos fundos dos quarteirões: hortas cercadas, montes de feno, galinheiros, lenha e uma carroça parada ----------
  {
    const placed = [], R = rng(2425);
    const clear = (x, z, r) => V.free(x, z, r) && !V.trees.some(t => Math.hypot(t.x - x, t.z - z) < r + 2.4) && !V.lamps.some(l => Math.hypot(l.x - x, l.z - z) < r + 1.6) && !placed.some(p => Math.hypot(p[0] - x, p[1] - z) < r + p[2] + 3);
    const grp = (x, z, ry) => { const q = new THREE.Group(); q.position.set(x, level(x, z), z); q.rotation.y = ry; g.add(q); return (m, px, py, pz, rx = 0, rr = 0, rz = 0) => { q.add(at(m, px, py, pz, rx, rr, rz)); return m; }; };
    const solidAround = (x, z, r) => solids.push({ x0: x - r * 0.75, x1: x + r * 0.75, z0: z - r * 0.75, z1: z + r * 0.75 });
    let carts = 0;
    for (let z = 8; z < MAP - 6; z += 8) for (let x = 8; x < MAP - 6; x += 8) {
      const px = x + (R() - 0.5) * 4, pz = z + (R() - 0.5) * 4, kind = R(), skip = R();
      const r = kind < 0.5 ? 3.5 : kind < 0.68 ? 2.2 : kind < 0.84 ? 2.3 : kind < 0.95 ? 1.7 : 2.6;
      if (skip < 0.42 || !clear(px, pz, r)) continue;
      placed.push([px, pz, r]); solidAround(px, pz, r);
      const [dx, dz] = nearRoad(px, pz), ry = Math.atan2(dx, dz), A = grp(px, pz, ry);
      if (kind < 0.5) {                                                                       // horta cercada (frente virada para a rua)
        A(box(5.0, 0.1, 3.3, '#6b553a'), 0, 0.05, 0);
        for (let row = 0; row < 4; row++) {
          A(box(4.4, 0.08, 0.36, '#5a4630'), 0, 0.12, -1.15 + row * 0.75);
          for (let c = 0; c < 4; c++) { const xx = -1.65 + c * 1.1, zz = -1.15 + row * 0.75, t = (row + Math.floor(kind * 10)) % 3; const m = blob(t === 1 ? 0.2 : 0.26, LEAF[(c + row) % 3]); if (t === 1) m.scale.y *= 1.7; else m.scale.y *= 0.65; A(m, xx, t === 1 ? 0.42 : 0.24, zz, 0, c + row, 0); }
        }
        const W = 5.6, D = 3.8;
        for (let k = 0; k <= 4; k++) for (const zz of [-D / 2, D / 2]) { const xx = -W / 2 + k * W / 4; if (zz > 0 && Math.abs(xx) < 0.6) continue; A(box(0.09, 0.95, 0.09, WOOD), xx, 0.47, zz); }
        for (const xx of [-W / 2, W / 2]) A(box(0.09, 0.95, 0.09, WOOD), xx, 0.47, 0);
        for (const yy of [0.4, 0.78]) {
          A(box(W, 0.06, 0.06, WOOD_L), 0, yy, -D / 2); A(box(D, 0.06, 0.06, WOOD_L), -W / 2, yy, 0, 0, Math.PI / 2, 0); A(box(D, 0.06, 0.06, WOOD_L), W / 2, yy, 0, 0, Math.PI / 2, 0);
          for (const sx of [-1, 1]) A(box(W / 2 - 0.55, 0.06, 0.06, WOOD_L), sx * (W / 4 + 0.27), yy, D / 2);
        }
        if (R() < 0.45) {                                                                    // espantalho
          A(cyl(0.05, 0.05, 2.2, WOOD, 5), 1.6, 1.1, -0.9); A(box(1.3, 0.06, 0.06, WOOD), 1.6, 1.65, -0.9);
          A(box(0.6, 0.6, 0.25, ['#8a6a9a', '#7a8a5a', '#9a5a4a'][Math.floor(R() * 3)]), 1.6, 1.45, -0.9); A(blob(0.2, '#d8be6a'), 1.6, 1.98, -0.9);
          A(cone(0.32, 0.3, '#b89a50', 8), 1.6, 2.2, -0.9); A(cyl(0.34, 0.34, 0.03, '#b89a50', 8), 1.6, 2.06, -0.9);
        }
        if (R() < 0.5) { A(cyl(0.2, 0.16, 0.26, WICKER, 8), 0.95, 0.13, D / 2 + 0.45); A(torus(0.18, 0.02, WOOD, 3, 8), 0.95, 0.3, D / 2 + 0.45, 0, 0, Math.PI / 2); }
        else { A(cyl(0.16, 0.18, 0.3, '#7d8288', 8), -0.95, 0.15, D / 2 + 0.4); A(cyl(0.025, 0.025, 0.4, '#7d8288', 4), -0.7, 0.3, D / 2 + 0.4, 0, 0, 1.0); }   // regador
      } else if (kind < 0.68) {                                                               // monte de feno, fardos e forcado
        { const h1 = blob(1.35, '#d6bc68'); h1.scale.set(1.35, 1.05, 1.3); A(h1, 0, 0.85, 0, 0, 0.4, 0); const h2 = blob(0.85, '#ccb15e'); h2.scale.set(0.85, 0.75, 0.8); A(h2, 0.1, 1.85, -0.05, 0, 1.1, 0); A(cyl(0.05, 0.05, 0.7, WOOD, 4), 0.1, 2.5, 0); }
        for (let k = 0; k < 3; k++) A(box(1.15, 0.55, 0.65, k === 2 ? '#ccb15e' : '#d8be6a'), k === 2 ? 1.75 : 1.5, k === 2 ? 0.83 : 0.28, k === 2 ? 0.95 : 0.6 + k * 0.7, 0, 0.1 * k, 0);
        A(cyl(0.025, 0.025, 1.7, WOOD_L, 4), -1.15, 0.8, 0.6, 0.35, 0, 0.2); for (let k = -1; k <= 1; k++) A(box(0.025, 0.32, 0.025, IRON), -1.33 + k * 0.09, 1.72, 0.3, 0.35, 0, 0.2);
      } else if (kind < 0.84) {                                                               // galinheiro com cercadinho e galinhas
        for (const [xx, zz] of [[-0.7, -0.5], [0.7, -0.5], [-0.7, 0.5], [0.7, 0.5]]) A(box(0.1, 0.4, 0.1, WOOD_D), xx, 0.2, zz - 0.6);
        A(box(1.6, 1.0, 1.2, '#8a6440'), 0, 0.9, -0.6); A(box(1.9, 0.08, 1.5, '#7a4a2a'), 0, 1.5, -0.6, 0.25, 0, 0);
        A(box(0.3, 0.4, 0.04, '#2a2018'), 0.3, 0.75, 0.01); A(box(0.4, 0.04, 0.9, WOOD_L), 0.3, 0.3, 0.4, -0.45, 0, 0);
        for (let k = 0; k <= 4; k++) for (const sx of [-1, 1]) A(box(0.06, 0.65, 0.06, WOOD), sx * 1.25, 0.32, -0.1 + k * 0.45);
        for (let k = 0; k <= 4; k++) A(box(0.06, 0.65, 0.06, WOOD), -1.25 + k * 0.625, 0.32, 1.7);
        for (const sx of [-1, 1]) A(box(0.04, 0.04, 1.8, WOOD_L), sx * 1.25, 0.55, 0.8); A(box(2.5, 0.04, 0.04, WOOD_L), 0, 0.55, 1.7);
        for (let k = 0; k < 3; k++) { const hx = -0.6 + k * 0.55, hz = 0.6 + (k % 2) * 0.5, c = k === 1 ? '#a8643a' : '#efe6d6'; const b = blob(0.18, c); b.scale.set(0.22, 0.17, 0.15); A(b, hx, 0.2, hz, 0, k, 0); A(blob(0.08, c), hx + 0.12, 0.36, hz, 0, k, 0); A(box(0.05, 0.06, 0.03, '#c8352a'), hx + 0.12, 0.45, hz); A(cone(0.03, 0.07, '#e0a83a', 4), hx + 0.21, 0.35, hz, 0, 0, -Math.PI / 2); }
      } else if (kind < 0.95) {                                                               // lenha empilhada sob coberturinha + toco com machado
        for (let k = 0; k < 3; k++) for (let j = 0; j < 6 - k; j++) A(cyl(0.13, 0.13, 1.4, j % 2 ? '#8a5a34' : '#6b4526', 6), -0.75 + j * 0.28 + k * 0.14, 0.13 + k * 0.23, 0, Math.PI / 2, 0, 0);
        for (const sx of [-1, 1]) A(box(0.09, 1.3, 0.09, WOOD_D), sx * 1.05, 0.65, -0.65); A(box(2.4, 0.07, 1.4, '#7a4a2a'), 0, 1.3, -0.1, -0.25, 0, 0);
        A(cyl(0.3, 0.34, 0.5, '#7a5432', 8), 1.6, 0.25, 0.7); A(cyl(0.025, 0.025, 0.6, WOOD_L, 4), 1.6, 0.62, 0.7, 0, 0, 0.5); A(box(0.2, 0.15, 0.03, IRON), 1.48, 0.53, 0.7, 0, 0, 0.5);
      } else if (carts < 2) {                                                                 // carroça parada (sem cavalo), com feno
        carts++;
        A(box(2.2, 0.12, 1.3, WOOD_L), 0, 0.85, 0); for (const sz of [-1, 1]) A(box(2.2, 0.35, 0.07, WOOD), 0, 1.08, sz * 0.65); A(box(0.07, 0.35, 1.3, WOOD), -1.08, 1.08, 0);
        for (const sz of [-1, 1]) { A(torus(0.55, 0.06, WOOD_D, 4, 12), 0.1, 0.6, sz * 0.78); for (let k = 0; k < 4; k++) A(box(0.05, 1.05, 0.05, WOOD_D), 0.1, 0.6, sz * 0.78, 0, 0, k * Math.PI / 4); }
        for (const sz of [-0.45, 0.45]) A(box(2.0, 0.08, 0.08, WOOD), 2.0, 0.42, sz, 0, 0, 0.4);
        const hy = blob(0.62, '#d8be6a'); hy.scale.set(0.9, 0.38, 0.55); A(hy, -0.1, 1.15, 0);
      }
    }
  }

  // ---------- postes de lanterna (madeira, braço de ferro virado para a rua, lanterna acesa) ----------
  for (const l of V.lamps) {
    const [dx, dz] = nearRoad(l.x, l.z), L = Math.hypot(dx, dz) || 1, a = Math.atan2(dx / L, dz / L), y = l.y, ar = Math.max(0.32, Math.min(0.82, L - hw - 0.45));   // a lanterna não fica sobre a pista
    add(box(0.42, 0.3, 0.42, STONE_L), l.x, y + 0.15, l.z); add(box(0.22, 3.9, 0.22, WOOD), l.x, y + 2.15, l.z);
    const lg = new THREE.Group(); lg.position.set(l.x, y + 3.95, l.z); lg.rotation.y = a; g.add(lg);
    lg.add(at(box(0.07, 0.07, ar + 0.13, IRON), 0, 0, (ar + 0.13) / 2), at(box(0.05, 0.6, 0.05, IRON), 0, -0.3, 0.12, -0.7, 0, 0));
    lg.add(at(box(0.3, 0.4, 0.3, lampMat()), 0, -0.42, ar), at(cone(0.28, 0.24, IRON, 4), 0, -0.1, ar, 0, Math.PI / 4, 0), at(box(0.34, 0.05, 0.34, IRON), 0, -0.64, ar));
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lg.add(at(box(0.04, 0.42, 0.04, IRON), px * 0.15, -0.42, ar + pz * 0.15));
    glows.push([l.x + Math.sin(a) * ar, y + 3.53, l.z + Math.cos(a) * ar]);
  }
  // ---------- construções de fundo (não são destinos): celeiros, depósitos de pedra, casinhas e telheiros no miolo das quadras ----------
  for (const f of V.fillers || []) g.add(buildFiller(f));
  // ---------- árvores ----------
  for (const t of V.trees) autumnTree(g, t.x, t.y, t.z, t.s, t.type, 'green', t.k);

  // ---------- pavimentos (uma malha por material) e brilho das lanternas (um Points só) ----------
  const GRAVEL = mat('#c9bc9a', LAYER(3)), CURB = mat('#8b8377', LAYER(3));
  for (const [k, m, S] of [['grass', grassMat(), S_GRASS], ['cob', cobbleMat(), S_COB], ['flag', flagMat(), S_FLAG], ['gravel', GRAVEL, 4], ['curb', CURB, 4]]) { const ms = pv[k].mesh(m, S); if (ms) { ms.name = 'pave:' + k; g.add(ms); } }
  if (glows.length) {
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glows.flatMap(p => p.slice(0, 3)), 3));
    const pts = new THREE.Points(gg, new THREE.PointsMaterial({ map: glowTex(), color: '#ffcf86', size: 2.2, sizeAttenuation: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.name = 'lamp-glow'; pts.frustumCulled = false; g.add(pts);
  }
  planarUV(g);
  g.userData.solids = solids; g.userData.vanOnly = vanOnly; g.userData.alleyEnds = alleyEnds;
  return g;
}
