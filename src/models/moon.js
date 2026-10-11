// Nível 17 (Órbita): módulos lunares (cilindro em pé, cápsula deitada ou cúpula; branco/creme com faixa colorida, janelas
// circulares, porta de moldura grossa tipo escotilha e antena/parabólica/painéis no teto), o cenário da lua esférica
// (chão, estradas em faixas que seguem a curvatura, rotatórias, pontes sobre crateras, praças das vilas — estufa, foguete,
// antenas… —, enchimento e decoração, estrelas e a Terra) e o capacete do jogador.
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, mat, bakeStatic } from './kit.js';
import { MOON_COL } from '../data.js';
import { MOON, tangentBasis } from '../moonPlan.js';
import { FRAME } from '../moonFrame.js';

const WHITE = '#f1ede2', CREAM = '#e6dcc4', GRAY = '#9da1a7', DARK = '#2b2f36', GLASS = '#5fa3d8', PANEL = '#1d3a7a';
const REG = '#b9bcc0', REG2 = '#a4a8ae', ROAD = '#7d8188';

/** Módulo de entrega centrado na origem, frente (porta) para +Z. */
export function buildMoonLot(h) {
  const root = new THREE.Group(); root.name = 'moon:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { root.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const stripe = MOON_COL[h.stripe], doorC = MOON_COL[h.door], body = h.index % 3 ? WHITE : CREAM;
  add(cyl(7.6, 7.8, 1.1, '#c9cbcf', 24), 0, -0.49, 0);                                    // base do módulo (grossa: a borda encosta na curvatura do chão)
  add(box(3.2, 1.2, 4.6, '#d6d8dc'), 0, -0.53, 6.2);                                      // calçada até a rua
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

/** Altura do topo de um módulo (seta da dica). */
export function moonTopY(h) { return h.shape === 'cyl' ? (h.tall ? 7.2 : 5.2) + 1.4 : h.shape === 'capsule' ? 6.3 : 4.6; }

// ---------- cenário da lua esférica (coordenadas da esfera: centro na origem, raio MOON.R) ----------
const Rm = MOON.R;
const lifted = (p, lift) => p.clone().multiplyScalar(Rm + lift);
/** Faixa que acompanha a superfície ao longo dos pontos `pts` (unitários). valid(i): o trecho i→i+1 entra. */
function strip(pts, closed, width, lift, offsetSide = 0, valid = null) {
  const pos = [], n = pts.length, side = new THREE.Vector3(), t = new THREE.Vector3();
  const L = i => { const p = pts[(i + n) % n]; return typeof lift === 'function' ? lift(i, p) : lift; };
  const corner = (i, s) => {                            // s: −1 (borda esquerda) … 1 (direita)
    const p = pts[i], a = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)], b = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    t.copy(a).sub(b); side.copy(t).cross(p).normalize();
    return p.clone().addScaledVector(side, (offsetSide + s * width / 2) / Rm).normalize().multiplyScalar(Rm + L(i));
  };
  const cols = Math.max(1, Math.ceil(width / 1.2));      // subdividida na largura: acompanha a curvatura de lado também
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    if (valid && !valid(i)) continue;
    const j = (i + 1) % n;
    for (let c = 0; c < cols; c++) {
      const s0 = -1 + 2 * c / cols, s1 = -1 + 2 * (c + 1) / cols;
      const a0 = corner(i, s0), a1 = corner(i, s1), b0 = corner(j, s0), b1 = corner(j, s1);
      pos.push(...a0.toArray(), ...a1.toArray(), ...b0.toArray(), ...a1.toArray(), ...b1.toArray(), ...b0.toArray());
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
/** Calota esférica de raio (na superfície) r em volta de n. */
function cap(n, r, lift, color, seg = 28) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(Rm + lift, Math.min(72, Math.max(seg, Math.ceil(2 * Math.PI * r / 1.6))), Math.max(3, Math.ceil(r / 1.1)), 0, Math.PI * 2, 0, r / Rm), mat(color));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); return m;
}
const ringPts = (c, r, k = 40) => { const { u, v } = tangentBasis(c), out = []; for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; out.push(c.clone().multiplyScalar(Math.cos(r / Rm)).addScaledVector(u.clone().multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a)), Math.sin(r / Rm)).normalize()); } return out; };
/** Objeto local (cima +Y, frente +Z) posto sobre a esfera em n, de frente para f. */
function placed(obj, n, f, sink = 0.08) { FRAME.pose(obj, n, f, -sink); return obj; }

/** Peças pequenas (enchimento e decoração), no referencial local. */
function decoPiece(d) {
  const g = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const k = d.seed || 0, stripe = Object.values(MOON_COL)[k % 4];
  switch (d.kind) {
    case 'depot': {                                     // depósito: cápsula deitada sobre pés, com faixa e porta
      add(cyl(1.5, 1.5, 3.6, k % 2 ? WHITE : CREAM, 14), 0, 1.9, 0, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) { add(sphere(1.5, k % 2 ? WHITE : CREAM, 14, 8), s * 1.8, 1.9, 0); add(box(0.4, 0.7, 1.2, GRAY), s * 1.2, 0.35, 0); }
      add(cyl(1.53, 1.53, 0.4, stripe, 14), 0, 1.9, 0, 0, 0, Math.PI / 2); add(box(1, 1.3, 0.1, DARK), 0, 1.7, 1.48); break;
    }
    case 'minidome': {                                  // casinha-cúpula (sem entrega)
      add(cyl(2.9, 3, 0.4, '#c9cbcf', 18), 0, 0.2, 0); add(sphere(2.5, k % 3 ? WHITE : CREAM, 16, 8), 0, 0.3, 0).scale.set(1, 0.9, 1);
      add(cyl(2.52, 2.55, 0.35, stripe, 16), 0, 0.6, 0); add(box(1.2, 1.5, 0.8, DARK), 0, 0.95, 2.2);
      add(cyl(0.35, 0.35, 0.1, GLASS, 12), 0.9, 1.8, 1.95, Math.PI / 2 - 0.5, 0, 0); add(cyl(0.05, 0.05, 1.6, GRAY, 5), -0.8, 3.0, -0.6); break;
    }
    case 'tank': add(cyl(1.3, 1.3, 3.6, '#e8e8e8', 14), 0, 1.8, 0); add(sphere(1.3, '#e8e8e8', 14, 6), 0, 3.6, 0).scale.set(1, 0.4, 1); add(cyl(1.33, 1.33, 0.35, stripe, 14), 0, 2.6, 0); add(box(0.2, 3.6, 0.2, GRAY), 1.4, 1.8, 0); break;
    case 'crates': for (const [x, y, z, s] of [[-0.6, 0.5, 0, 1], [0.6, 0.5, 0.2, 1], [0, 1.45, 0.1, 0.9], [0.9, 0.4, -1.0, 0.8]]) { add(box(s, s, s, k % 2 ? '#cfd3d8' : '#e6dcc4'), x, y * s, z, 0, x, 0); add(box(s * 1.01, s * 0.15, s * 1.01, stripe), x, y * s, z, 0, x, 0); } break;
    case 'solar': for (const x of [-1.5, 1.5]) { add(cyl(0.08, 0.08, 1.2, GRAY, 6), x, 0.6, 0); add(box(2.6, 0.08, 1.8, PANEL), x, 1.25, 0, 0.45, 0, 0); for (let i = -1; i <= 1; i++) add(box(0.05, 0.1, 1.82, '#8fb0ee'), x + i * 0.85, 1.27, 0, 0.45, 0, 0); } break;
    case 'rock': { const m = sphere(d.r, REG2, 6, 4); m.scale.set(1, 0.65, 0.85); add(m, 0, d.r * 0.25, 0, 0, k, 0); break; }
    case 'rocks': for (const [x, z, r] of [[-0.6, 0.2, 0.8], [0.7, -0.3, 0.6], [0.1, 0.8, 0.45]]) { const m = sphere(r, k % 2 ? REG2 : '#8f939a', 6, 4); m.scale.set(1, 0.6, 0.9); add(m, x, r * 0.2, z, 0, k + x, 0); } break;
    case 'minigreen': {                                 // estufinha: meio cilindro de vidro com canteiros
      add(box(5, 0.3, 3.6, '#d6d8dc'), 0, 0.15, 0);
      for (const z of [-0.8, 0.8]) { add(box(4.2, 0.4, 0.8, '#7a5a34'), 0, 0.5, z); for (let i = 0; i < 4; i++) add(sphere(0.32, i % 2 ? '#3f8f3a' : '#5cae4a', 6, 5), -1.5 + i, 0.85, z); }
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 5, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
      gl.rotation.set(0, 0, Math.PI / 2); gl.position.y = 0.3; g.add(gl);
      for (const x of [-2.5, 0, 2.5]) add(torus(1.8, 0.07, WHITE, 4, 16, {}), x, 0.3, 0, 0, Math.PI / 2, 0); break;
    }
    case 'antenna': add(cyl(0.12, 0.2, 7, GRAY, 6), 0, 3.5, 0); add(cone(0.9, 0.5, '#e8e8e8', 12), 0.5, 5.6, 0, 0, 0, -2.2); add(sphere(0.2, '#e0402a', 8, 6, { emissive: '#ff3a20', emissiveIntensity: 0.8 }), 0, 7.1, 0); add(box(1.4, 0.08, 0.08, GRAY), 0, 6, 0); break;
    case 'rover': {                                     // jipe lunar parado
      add(box(3, 0.6, 1.8, '#e8e8e8'), 0, 1.0, 0); add(box(1.2, 0.5, 1.6, stripe), -0.7, 1.5, 0); add(box(0.6, 0.45, 1.5, GLASS), 0.4, 1.5, 0);
      for (const [x, z] of [[-1.1, 1], [1.1, 1], [-1.1, -1], [1.1, -1]]) add(cyl(0.45, 0.45, 0.35, DARK, 10), x, 0.45, z, Math.PI / 2, 0, 0);
      add(cyl(0.04, 0.04, 1.4, GRAY, 5), -1.2, 2.2, 0.5); add(cone(0.4, 0.2, '#e8e8e8', 10), -1.2, 2.9, 0.5, -2, 0, 0); break;
    }
  }
  return g;
}
/** Praça central de cada vila. */
function featurePiece(kind) {
  const g = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  switch (kind) {
    case 'greenhouse': {                                // estufa comunitária: cúpula de vidro com canteiros
      add(cyl(7.6, 7.8, 0.8, '#d6d8dc', 28), 0, 0.0, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(box(2.6, 0.6, 1.4, '#7a5a34'), Math.cos(a) * 4.2, 0.6, Math.sin(a) * 4.2, 0, -a, 0); for (let j = -1; j <= 1; j++) add(sphere(0.5, j ? '#3f8f3a' : '#6cbf4a', 6, 5), Math.cos(a) * 4.2 - Math.sin(a) * j * 0.8, 1.2, Math.sin(a) * 4.2 + Math.cos(a) * j * 0.8); }
      add(cyl(0.3, 0.4, 3, '#6b4428', 6), 0, 1.9, 0); add(sphere(1.6, '#4fae5a', 8, 6), 0, 3.8, 0);
      const gl = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#cfeaff', transparent: true, opacity: 0.28, roughness: 0.1, depthWrite: false }));
      gl.position.y = 0.3; g.add(gl);
      for (let i = 0; i < 4; i++) add(torus(7, 0.12, WHITE, 4, 28), 0, 0.3, 0, 0, i * Math.PI / 4, 0).scale.set(1, 1, 1);
      break;
    }
    case 'pad': {                                       // plataforma de pouso com foguete (ponto de referência: aparece de longe)
      add(cyl(8.6, 9, 1.2, '#c9ccd0', 28), 0, 0.0, 0); add(cyl(5.4, 5.4, 1.22, '#ffb347', 28), 0, 0.01, 0); add(cyl(4.4, 4.4, 1.24, '#c9ccd0', 28), 0, 0.02, 0);
      add(cyl(1.8, 2, 12, WHITE, 18), 0, 6.6, 0); add(cone(1.8, 4, '#ff7a1a', 18), 0, 14.6, 0);
      add(cyl(1.85, 1.85, 0.9, '#2f78d0', 18), 0, 9.5, 0); add(sphere(0.5, GLASS, 10, 8), 0, 11, 1.7);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; add(box(0.25, 3.2, 2, '#e0402a'), Math.cos(a) * 2.2, 2.2, Math.sin(a) * 2.2, 0, -a, 0); }
      add(cone(1.4, 1.6, '#3a3d44', 14), 0, 0.9, 0, Math.PI, 0, 0); add(box(0.5, 9, 0.5, GRAY), 5.5, 4.5, 0); add(box(3, 0.3, 0.3, GRAY), 4, 8.5, 0);
      break;
    }
    case 'antenna': add(cyl(5, 5.4, 0.6, '#c9ccd0', 20), 0, 0, 0); add(cyl(0.35, 0.6, 15, GRAY, 8), 0, 7.5, 0); for (const y of [6, 10]) add(cone(1.8, 0.8, '#e8e8e8', 16), 1.2, y, 0, 0, 0, -2.2); add(sphere(0.35, '#e0402a', 8, 6, { emissive: '#ff3a20', emissiveIntensity: 1 }), 0, 15.2, 0); for (const a of [0, 2.1, 4.2]) add(box(0.15, 8, 0.15, GRAY), Math.cos(a) * 2.2, 3.5, Math.sin(a) * 2.2, Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28); break;
    case 'tanks': for (const [x, z] of [[-3, -2], [3, -2], [0, 3]]) { add(cyl(2, 2, 5, '#e8e8e8', 16), x, 2.5, z); add(sphere(2, '#e8e8e8', 16, 6), x, 5, z).scale.set(1, 0.45, 1); add(cyl(2.03, 2.03, 0.5, '#2f78d0', 16), x, 3.4, z); } add(box(6.5, 0.4, 0.4, GRAY), 0, 1.2, -2); add(box(0.4, 0.4, 5, GRAY), 0, 1.2, 0.5); break;
    case 'solar': for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) { add(cyl(0.1, 0.1, 1.4, GRAY, 6), c * 3.4, 0.7, r * 2.6); add(box(3, 0.08, 2, PANEL), c * 3.4, 1.45, r * 2.6, 0.4, 0, 0); } break;
    case 'garden': for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, rr = i ? 4.5 : 0; add(cyl(0.9, 1.1, 0.8, '#c9cbcf', 10), Math.cos(a) * rr, 0.4, Math.sin(a) * rr); add(cyl(0.12, 0.15, 1.6, '#7a3fa0', 6), Math.cos(a) * rr, 1.6, Math.sin(a) * rr); add(sphere(0.8, i % 2 ? '#c06ad8' : '#4fd0a8', 8, 6), Math.cos(a) * rr, 2.6, Math.sin(a) * rr); } break;
    case 'beacon': add(cyl(3, 3.4, 0.6, '#c9ccd0', 16), 0, 0, 0); add(cyl(0.8, 1.4, 9, WHITE, 6), 0, 4.8, 0); add(sphere(1.1, '#7af0ff', 12, 8, { emissive: '#3ad8ff', emissiveIntensity: 1.2 }), 0, 10, 0); for (let k = 0; k < 3; k++) add(box(0.3, 2, 2.2, '#2f78d0'), Math.cos(k * 2.1) * 1.3, 1.3, Math.sin(k * 2.1) * 1.3, 0, -k * 2.1, 0); break;
    case 'dish': add(cyl(3.6, 4, 0.6, '#c9ccd0', 16), 0, 0, 0); add(cyl(0.5, 0.8, 4, GRAY, 8), 0, 2, 0); add(cone(5, 2, '#e8e8e8', 24), 0, 5.6, 0, -2.5, 0, 0); add(cyl(0.08, 0.08, 3, GRAY, 5), 0, 6.2, 1.2, 0.9, 0, 0); break;
  }
  return g;
}

/** Cenário fixo da lua (num grupo na origem = centro da lua). */
export function buildMoonScene(g, V) {
  // chão: a esfera de regolito e manchas mais escuras ("mares")
  const ground = new THREE.Mesh(new THREE.SphereGeometry(Rm, 160, 110), new THREE.MeshStandardMaterial({ color: REG, roughness: 1 }));
  ground.receiveShadow = true; ground.name = 'moon-ground'; g.add(ground);
  const top = g; g = new THREE.Group(); g.name = 'moon-flat'; top.add(g);   // camadas rentes ao chão (não projetam sombra)
  let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { const n = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); g.add(cap(n, 8 + rnd() * 14, 0.015, i % 2 ? '#aeb2b8' : '#a7abb1', 30)); }
  // estradas: anéis, ramais e laços, com faixas claras nas bordas (abertas nos cruzamentos e nas pontes)
  const roadMat = mat(ROAD), lineMat = mat('#d8dade');
  const nearJ = p => V.junctions.some(j => p.angleTo(j.p) * Rm < j.r + 0.6) || V.bridges.some(b => p.angleTo(b.p) * Rm < b.half + 0.5);
  const LIFT = { ring: 0.06, branch: 0.075, loop: 0.09 };
  for (const r of V.roads) {
    const pts = r.pts;
    g.add(new THREE.Mesh(strip(pts, r.closed, MOON.RW, LIFT[r.kind]), roadMat));
    for (const s of [-1, 1]) g.add(new THREE.Mesh(strip(pts, r.closed, 0.2, LIFT[r.kind] + 0.025, s * (MOON.RW / 2 - 0.35), i => !nearJ(pts[i]) && !nearJ(pts[(i + 1) % pts.length])), lineMat));
  }
  for (const j of V.junctions) g.add(cap(j.p, MOON.RW / 2 + 0.6, 0.1, ROAD, 20));
  // pontes sobre crateras: cratera embaixo, tabuleiro com rampas acompanhando a curvatura, guarda-corpos laranja
  for (const b of V.bridges) {
    g.add(cap(b.p, b.cr, 0.03, '#5e6268', 24));
    g.add(new THREE.Mesh(strip(ringPts(b.p, b.cr + 0.4, 36), true, 1.4, 0.22), mat('#c9ccd0')));
    const pts = []; for (let s = -b.half; s <= b.half + 0.01; s += 0.75) pts.push(b.p.clone().multiplyScalar(Math.cos(s / Rm)).addScaledVector(b.along, Math.sin(s / Rm)).normalize());
    const prof = p => V.bump(p);
    g.add(new THREE.Mesh(strip(pts, false, MOON.RW, (i, p) => prof(p) + 0.11), mat('#8d9198')));
    for (const s of [-1, 1]) for (let i = 2; i < pts.length - 2; i += 2) {
      const p = pts[i]; if (prof(p) < MOON.DECK - 0.01) continue;
      const q = p.clone().addScaledVector(b.n, s * (MOON.RW / 2 + 0.1) / Rm).normalize();
      g.add(placed(at(box(0.25, 0.9, 0.25, '#ffb347'), 0, 0, 0), q, b.along, -(MOON.DECK + 0.45)));
    }
  }
  // crateras (beirada clara + fundo escuro), na superfície
  for (const d of V.deco) if (d.kind === 'crater') {
    g.add(cap(d.n, d.cr, 0.03, '#6f737a', 24)); g.add(cap(d.n, d.cr * 0.45, 0.045, '#5e6268', 16));
    g.add(new THREE.Mesh(strip(ringPts(d.n, d.cr + 0.3, 36), true, Math.max(0.8, d.cr * 0.18), 0.2), mat('#c9ccd0')));
  }
  // praças das vilas, enchimento e decoração
  const flat = g; g = top;
  for (const d of V.deco) {
    if (d.kind === 'crater' || d.kind === 'bridge') continue;
    if (d.kind.startsWith('feature:')) { flat.add(cap(d.n, 10.6, 0.05, '#cfd2d6', 30)); g.add(placed(featurePiece(d.kind.slice(8)), d.n, d.f, 0.1)); continue; }
    g.add(placed(decoPiece(d), d.n, d.f));
  }
  // céu: estrelas e a Terra ao longe (giram com a lua)
  const N = 1400, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(1300); pos.set(v.toArray(), i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })); stars.frustumCulled = false; g.add(stars);
  const earth = new THREE.Group(); earth.position.set(-0.35, 0.45, 0.82).normalize().multiplyScalar(900); g.add(earth);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(70, 32, 20), new THREE.MeshBasicMaterial({ color: '#3a7bd5', fog: false })));
  for (const [x, y, z, r] of [[20, 25, 58, 22], [-30, -10, 60, 18], [10, -35, 58, 16], [-15, 40, 54, 14]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: '#4fae5a', fog: false })); c.position.set(x, y, z); c.scale.set(1, 0.7, 0.3); earth.add(c); }
  earth.lookAt(0, 0, 0); earth.rotateY(Math.PI);
  earth.add(new THREE.Mesh(new THREE.SphereGeometry(71.5, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, fog: false })));
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
