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
const cobbleMat = () => once('cob', () => new THREE.MeshLambertMaterial({ map: canvasTex(256, (x, N) => courses(x, N, 5, { rh0: 19, rh1: 23, w0: 24, w1: 38, base: 146, vary: 34, joint: '#5f5a52', gap: 3, round: 6 })) }));
const flagMat = () => once('flag', () => new THREE.MeshLambertMaterial({ map: canvasTex(256, (x, N) => courses(x, N, 9, { rh0: 36, rh1: 62, w0: 46, w1: 104, base: 194, vary: 22, joint: '#9c9381', gap: 3, round: 4 })) }));
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
function barrel(g, x, y, z, s = 1, lying = false) {
  const b = cyl(0.33 * s, 0.33 * s, 0.9 * s, '#8a5e36', 10); const h1 = cyl(0.345 * s, 0.345 * s, 0.06 * s, IRON, 10), h2 = cyl(0.345 * s, 0.345 * s, 0.06 * s, IRON, 10);
  const mid = cyl(0.36 * s, 0.36 * s, 0.34 * s, '#94673d', 10);
  if (lying) { for (const [m, dy] of [[b, 0], [mid, 0], [h1, 0.3], [h2, -0.3]]) g.add(at(m, x + dy * s, y + 0.34 * s, z, 0, 0, Math.PI / 2)); return; }
  g.add(at(b, x, y + 0.45 * s, z), at(mid, x, y + 0.45 * s, z), at(h1, x, y + 0.15 * s, z), at(h2, x, y + 0.75 * s, z));
  g.add(at(cyl(0.29 * s, 0.29 * s, 0.02, '#6e4a2e', 10), x, y + 0.905 * s, z));
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
  for (let k = 0; k < 3; k++) { const m = sphere(0.15, LEAF[k % 3], 6, 4); m.scale.y = 0.7; g.add(at(m, x - w * 0.32 + k * w * 0.32, y + 0.17, z + 0.02)); }
  for (let k = 0; k < 5; k++) g.add(at(sphere(0.085, FLOWER[Math.floor(r() * 5)], 5, 4), x - w * 0.4 + k * w * 0.2 + (r() - 0.5) * 0.06, y + 0.26 + r() * 0.07, z + 0.07 + (r() - 0.5) * 0.1));
}
function pot(g, x, y, z, s = 1, herb = true) {               // vaso de barro com planta
  g.add(at(cyl(0.2 * s, 0.15 * s, 0.32 * s, '#a8603a', 8), x, y + 0.16 * s, z));
  const m = sphere(0.24 * s, herb ? LEAF[1] : LEAF[0], 6, 4); m.scale.y = 0.85; g.add(at(m, x, y + 0.45 * s, z));
}
/** Escudo (brasão) na parede: cor + borda de ferro + faixa clara. Frente em +z. */
function shield(g, x, y, z, color, w = 0.6, h = 0.72) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, h / 2); s.lineTo(w / 2, h / 2); s.lineTo(w / 2, 0); s.quadraticCurveTo(w / 2, -h * 0.32, 0, -h / 2); s.quadraticCurveTo(-w / 2, -h * 0.32, -w / 2, 0); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 5 });
  g.add(at(mesh(geo, mat(IRON)), x, y, z, 0, 0, 0)); const f = mesh(geo, mat(color)); f.scale.set(0.86, 0.86, 1); g.add(at(f, x, y - 0.01, z + 0.03));
  g.add(at(box(w * 0.16, h * 0.62, 0.03, '#e8dcbc'), x, y + 0.02, z + 0.1), at(box(w * 0.62, h * 0.12, 0.03, '#e8dcbc'), x, y + 0.1, z + 0.1));
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
  parts.push([new THREE.TorusGeometry(0.075, 0.016, 4, 10), IRON, T4(w - 0.22, 1.05, 0.06)]);                     // argola
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
      for (const fy of [0.25, 0.75]) P(box(sw - 0.06, 0.07, 0.03, shade(shutC, 0.82)), cx, y + hh * fy, z + 0.1, 0, sx * 0.12, 0);
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
    if (two && !J) P(box(W, 0.12, 0.08, shade(facC, 0.9)), 0, H1 + 0.04, ZF + 0.03);                // friso entre os andares
  }
  // ---- telhado (duas águas, cumeeira ao longo de x; asym: cumeeira deslocada ou empena virada para a rua) ----
  const depth = ZU - ZB, over = 0.55, zr = h.asym === 1 ? (ZB + ZU) / 2 - 1.05 : (ZB + ZU) / 2;
  const rise = depth * (0.47 + R() * 0.06), yR = H + rise, X = V3(1, 0, 0);
  const sideF = V3(0, H - yR, ZU - zr), sideB = V3(0, H - yR, ZB - zr);
  for (const sd of [sideF, sideB]) { const run = Math.abs(sd.z), Lz = sd.length(); slope(g, roofC, V3(0, yR, zr), sd.clone().normalize(), Lz * (1 + over / run), X, W - 0.02); }
  P(box(W - 0.02, 0.2, 0.42, shade(roofC, 0.82)), 0, yR + 0.12, zr);                               // cumeeira
  for (const x of [X0, X1 - 0.2]) { const m = gableTri([[ZB, H], [ZU, H], [zr, yR]], 'z', x, 0.2, WM); g.add(m); T(m); }
  let chx = h.index % 2 ? 2.9 : -3.2;
  if (h.asym === 2) {                                                                                // empena virada para a rua (parte direita)
    const xa = 0.55, xb = 4.55, xm = (xa + xb) / 2, hw = (xb - xa) / 2, rr = hw * (1.0 + R() * 0.12), yc = H + rr, zs = zr;
    { const m = gableTri([[xa, H], [xb, H], [xm, yc]], 'x', ZU - 0.2, 0.2, WM); g.add(m); T(m); }
    if (timber) { P(box(0.15, rr - 0.1, 0.08, WOOD_D), xm, H + (rr - 0.1) / 2, ZU + 0.03); P(box(xb - xa - 0.3, 0.15, 0.08, WOOD_D), xm, H + 0.08, ZU + 0.03); }
    P(cyl(0.26, 0.26, 0.06, WOOD_D, 10), xm, H + rr * 0.45, ZU + 0.03, Math.PI / 2, 0, 0);          // óculo de ventilação
    const lenZ = ZU + over - zs, Z = V3(0, 0, 1);
    for (const sx of [-1, 1]) { const d = V3(sx * hw, -rr, 0), Lx = d.length(); slope(g, roofC, V3(xm, yc, zs + lenZ / 2), d.normalize(), Lx * (1 + 0.32 / hw), Z, lenZ, 4); }
    P(box(0.38, 0.18, lenZ, shade(roofC, 0.82)), xm, yc + 0.12, zs + lenZ / 2);
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
      for (let k = 0; k < n; k++) { const m = sphere(0.24 + r2() * 0.12, LEAF[(k + Math.floor(y * 3)) % 3], 6, 4); m.scale.z = 0.35; P(m, X0 + 0.25 + r2() * (0.7 + y * 0.18), y, (y > H1 && J ? ZU : ZF) + 0.06); }
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
    const cl = ['#e9e1cc', '#7f93b8', '#b8664f', '#d9c27a', '#9aae7a'];
    for (let k = 0; k < 4; k++) { const w = k % 2 ? 0.55 : 0.8, hh = k % 2 ? 0.75 : 0.95, x = -3.65 + k * 0.98; P(box(w, hh, 0.03, cl[(h.index + k) % 5]), x, 1.8 - hh / 2, -4.9); if (k % 2) for (const sx of [-1, 1]) P(box(0.2, 0.35, 0.03, cl[(h.index + k) % 5]), x + sx * 0.35, 1.62, -4.9, 0, 0, sx * 0.4); }
  } else if (R() < 0.6) {                                                                            // hortinha
    P(box(3.0, 0.12, 1.5, '#6f5a3e'), -2.2, 0.06, -4.6);
    for (let k = 0; k < 8; k++) { const m = sphere(0.2, LEAF[k % 3], 6, 4); m.scale.y = 0.6; P(m, -3.3 + (k % 4) * 0.72, 0.17, -4.95 + Math.floor(k / 4) * 0.7); }
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
    P(box(0.9, 0.7, 0.3, STONE_L), ox, 1.05, oz + 0.98); P(cyl(0.34, 0.34, 0.12, '#1d140e', 10), ox, 1.02, oz + 1.08, Math.PI / 2, 0, 0);
    const fire = dynamic(mesh(new THREE.CircleGeometry(0.27, 10), mat('#ff8a2a', { emissive: '#ff6a10', emissiveIntensity: 1.4 }))); fire.position.set(ox, 1.0, oz + 1.13); fire.userData.forge = true; fire.name = 'oven'; g.add(fire);
    P(cyl(0.16, 0.2, 1.1, STONE_D, 8), ox - 0.25, 1.75, oz - 0.55); smoke(g, ox - 0.25, 2.45, oz - 0.55);
    for (let k = 0; k < 3; k++) for (let j = 0; j < 4 - k; j++) P(cyl(0.11, 0.11, 0.9, j % 2 ? '#8a5a34' : '#6b4526', 6), -6.55 + 0, 0.11 + k * 0.2, 5.35 + j * 0.24 + k * 0.12, 0, 0, Math.PI / 2);   // lenha do forno
    P(cyl(0.03, 0.03, 1.8, WOOD_L, 5), -3.9, 0.9, ZF + 0.12, 0.12, 0, -0.12); P(box(0.36, 0.03, 0.42, WOOD_L), -3.79, 0.08, ZF + 0.24, 1.45, 0, -0.12);   // pá de forno encostada
    P(box(2.3, 0.08, 0.9, WOOD_L), 3.2, 0.86, 6.4); for (const [dx, dz] of [[-1, -0.36], [1, -0.36], [-1, 0.36], [1, 0.36]]) P(box(0.08, 0.82, 0.08, WOOD), 3.2 + dx * 1.02, 0.41, 6.4 + dz);
    for (const [bx, kind] of [[2.45, 0], [3.25, 1], [4.0, 2]]) {
      P(cyl(0.32, 0.25, 0.2, WICKER, 10), bx, 1.0, 6.4); P(torus(0.31, 0.03, '#9a7442', 4, 12), bx, 1.1, 6.4, Math.PI / 2, 0, 0);
      for (let k = 0; k < 4; k++) { const l = kind === 2 ? sphere(0.13, '#b87a3a', 7, 5) : sphere(0.16, kind ? '#d9a058' : '#c98a45', 7, 5); if (kind === 0) l.scale.set(1.5, 0.6, 0.7); else if (kind === 1) l.scale.set(1, 0.65, 1); P(l, bx + (k % 2 - 0.5) * 0.24, 1.17 + Math.floor(k / 2) * 0.06, 6.4 + (Math.floor(k / 2) - 0.5) * 0.2, 0, k, 0); }
    }
    for (let k = 0; k < 2; k++) { const l = cyl(0.07, 0.07, 0.7, '#d9a058', 6); P(l, 2.6 + k * 1.2, 0.98, 6.75, 0, 0.3 * k, Math.PI / 2); }
    g.add(awning(1.75, 4.65, 2.75, ZF, 2.32, 7.35, '#efe1c4', '#b0582f'));
    for (const [sx, sz] of [[1.2, 5.45], [1.75, 5.35]]) { const s = sphere(0.3, '#e9dcc0', 7, 5); s.scale.set(1, 1.3, 0.85); P(s, sx, 0.38, sz); P(box(0.16, 0.08, 0.16, '#cdbd9c'), sx, 0.78, sz); }   // sacos de farinha
    hangSign(g, 6.0, 3.2, ZF, 'PADARIA', 'bread', 1.4); facade(2.88, 2.4, 'PADARIA', 'bread');
    chim(-5.0, zr - 0.3);
    anchor(g, 'worker', 3.2, 0, 5.55); anchor(g, 'work', 3.2, 0.9, 6.4);
  } else if (key === 'smithy') {
    // forja acesa dentro da oficina aberta, coifa, fole, ferramentas na parede; bigorna lá fora, bancada encostada na fachada
    const fx = -4.1, fz = -1.6;
    tex(P(box(2.4, 0.85, 1.9, stoneMat()), fx, 0.425, fz));
    const coals = dynamic(mesh(BG(1.7, 0.12, 1.2), mat('#ff7a24', { emissive: '#ff5a10', emissiveIntensity: 1.5 }))); coals.position.set(fx, 0.9, fz); coals.userData.forge = true; coals.name = 'forge'; g.add(coals);
    for (let k = 0; k < 6; k++) P(box(0.22, 0.12, 0.2, '#2a2420'), fx - 0.6 + (k % 3) * 0.6, 0.97, fz - 0.35 + Math.floor(k / 3) * 0.7, 0, k, 0);
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
    P(torus(0.22, 0.05, '#5a5450', 4, 10), 0, DH + 0.5, ZF + 0.06, 0, 0, Math.PI);                                        // ferradura sobre a porta
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

// (cenário: ver abaixo)
export function buildMedScene(g) { return g; }
