// Nível 18 (Modernista): casas geométricas (volumes retangulares deslocados, laje plana, marquise, vidro azulado, garagem
// integrada) e lojas de arquitetura parecida; cenário fixo (calçadas contínuas, rotatórias com ilha, balões, postes simples).
// Lote centrado na origem, frente em +z (z = 8,6), como as casas do Jardins.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, textTexture } from './kit.js';
import { MDH_COL } from '../data.js';
import { MODERN } from '../modernPlan.js';
import { autumnTree } from './forest.js';

const LAWN = '#7fc45c', PAVE = '#d9d6cf', GLASS = '#8cc2e8', ROOFC = '#ecebe6', DARK = '#3a3d44', WOOD = '#b07a44', CONC = '#c9c6bd';
const glassMat = () => mat(GLASS, { roughness: 0.2, metalness: 0.15, emissive: '#2a4a6a', emissiveIntensity: 0.18 });

export function buildModernLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const G = 0.12, fac = MDH_COL.fac[h.fac];
  P(box(17.2, 0.12, 17.2, LAWN), 0, 0.06, 0);
  for (const [x, z, w, d] of [[0, 8.45, 17.2, 0.3], [-8.45, 0, 0.3, 17.2], [8.45, 0, 0.3, 17.2]]) P(box(w, 0.16, d, '#e2e0da'), x, 0.08, z);   // meio-fio do jardim aberto
  const vol = (x0, x1, z0, z1, y0, y1, c = fac, roof = true) => {
    P(box(x1 - x0, y1 - y0, z1 - z0, c), (x0 + x1) / 2, G + (y0 + y1) / 2, (z0 + z1) / 2);
    if (roof) P(box(x1 - x0 + 0.5, 0.24, z1 - z0 + 0.5, ROOFC), (x0 + x1) / 2, G + y1 + 0.12, (z0 + z1) / 2);
  };
  const win = (x0, x1, y0, y1, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.08), glassMat()); m.position.set((x0 + x1) / 2, G + (y0 + y1) / 2, z); g.add(m);
    P(box(x1 - x0 + 0.16, 0.1, 0.14, DARK), (x0 + x1) / 2, G + y0 - 0.02, z); };
  if (h.kind === 'mds') return buildModernShop(g, P, h, fac, win, G);
  const two = h.floors === 2, H = 3.0;
  let fz;
  // volumes (formas diferentes: L com garagem, andar de cima em balanço, barra comprida com bloco alto atrás, dois blocos desencontrados)
  if (h.shape === 0) { fz = 0.5; vol(-7.4, 3.1, -7.5, fz, 0, two ? 2 * H : H); win(-6.6, -2.3, 0.5, 2.6, fz + 0.04); if (two) win(-6.6, 2.4, 3.6, 5.4, fz + 0.04); }
  else if (h.shape === 1) {
    fz = 0.5; vol(-7.0, 3.1, -7.0, fz, 0, H, fac, !two); win(-6.4, -2.3, 0.5, 2.6, fz + 0.04);
    if (two) { vol(-6.0, 3.6, -6.5, 2.2, H, 2 * H, h.fac === 'white' ? '#d9dadc' : '#f4f3ef'); win(-5.4, 3.0, 3.6, 5.5, 2.24); }   // andar de cima em balanço
    else vol(-8.0, 3.6, -7.6, 1.6, H, H + 0.01, ROOFC);                                           // laje que avança (marquise grande)
  } else if (h.shape === 2) {
    fz = 0.0; vol(-7.6, 3.1, -6.0, fz, 0, H); win(-7.0, -2.3, 0.5, 2.6, fz + 0.04);
    vol(-6.6, -2.2, -7.6, -1.0, 0, two ? 2 * H : H + 1.4, h.fac === 'gray' ? '#e3d4b8' : '#9aa0a8'); win(-6.0, -2.8, two ? 3.6 : 3.1, two ? 5.4 : 4.0, -0.96);
  } else {
    fz = 1.2; vol(-7.4, 0.6, -7.0, fz, 0, two ? 2 * H : H); win(-6.6, -2.3, 0.5, 2.6, fz + 0.04); if (two) win(-6.6, 0.0, 3.6, 5.4, fz + 0.04);
    vol(0.6, 3.1, -5.6, -0.4, 0, 2.6, h.fac === 'beige' ? '#f4f3ef' : '#e3d4b8'); win(1.0, 2.7, 0.6, 2.2, -0.36);
  }
  // porta, marquise e caminho
  const D = -1.0;
  P(box(1.3, 2.35, 0.1, MDH_COL.door[h.doorc]), D, G + 1.18, fz + 0.06); P(box(0.06, 0.6, 0.06, '#d8d8d8'), D + 0.45, G + 1.2, fz + 0.14);
  P(box(2.8, 0.16, 1.7, DARK), D, G + 2.75, fz + 0.85);
  P(box(1.4, 0.05, 8.6 - fz, PAVE), D, 0.15, (fz + 8.6) / 2);
  // garagem integrada (à direita) com portão variado + entrada de carro
  if (h.gar) {
    vol(3.3, 7.9, -6.6, -0.2, 0, H, h.fac === 'gray' ? '#9aa0a8' : '#bfc3c8');
    const gc = MDH_COL.gar[h.gar];
    P(box(3.6, 2.4, 0.1, gc), 5.6, G + 1.2, -0.12);
    if (h.gar === 'roll') for (let y = 0.3; y < 2.4; y += 0.3) P(box(3.6, 0.04, 0.03, '#7a8088'), 5.6, G + y, -0.05);
    else if (h.gar === 'wood') for (let x = 4.0; x < 7.3; x += 0.35) P(box(0.05, 2.4, 0.03, '#7a4e26'), x, G + 1.2, -0.05);
    else P(box(3.6, 0.1, 0.03, '#5a5d63'), 5.6, G + 1.2, -0.05);
    P(box(4.4, 0.05, 8.8, '#bdbab2'), 5.6, 0.15, 4.2);
  }
  // detalhes (tags m*)
  if (h.wood) for (let x = 0.15; x <= 1.85; x += 0.24) P(box(0.16, 2.8, 0.08, WOOD), x, G + 1.45, fz + 0.06);
  if (h.vase) for (const s of [-1, 1]) { P(cyl(0.42, 0.32, 0.9, '#5a5d63', 10), D + s * 1.15, G + 0.45, fz + 0.55); P(sphere(0.48, '#3f8a3a', 7, 5), D + s * 1.15, G + 1.15, fz + 0.55); }
  if (h.perg) {
    for (const [x, z] of [[-7.3, fz + 2.8], [-3.6, fz + 2.8]]) P(box(0.16, 2.7, 0.16, WOOD), x, G + 1.35, z);
    for (let x = -7.4; x <= -3.4; x += 0.45) P(box(0.1, 0.12, 3.0, WOOD), x, G + 2.75, fz + 1.4);
    for (const [x, z] of [[-6.6, fz + 0.8], [-5.2, fz + 2.0], [-4.2, fz + 1.0], [-7.2, fz + 2.6]]) P(sphere(0.55, '#4f9a45', 7, 5), x, G + 2.95, z);   // plantas por cima
    P(box(0.25, 2.6, 0.35, '#3f8a3a'), -7.3, G + 1.3, fz + 2.5);
  }
  if (h.stone) {
    P(box(4.6, 0.08, 2.8, '#eeece6'), -5.4, 0.16, 6.6);
    for (const [x, z, r] of [[-6.6, 6.0, 0.4], [-4.8, 7.2, 0.3], [-5.6, 7.4, 0.22], [-4.0, 5.9, 0.26]]) { const m = sphere(r, '#a9a59c', 6, 4); m.scale.y = 0.6; P(m, x, 0.22, z); }
    P(cyl(0.12, 0.12, 0.9, '#3f8a3a', 5), -6.0, 0.6, 6.8); P(sphere(0.35, '#4f9a45', 6, 4), -6.0, 1.1, 6.8);
  }
  if (h.pool) { P(box(2.8, 0.14, 2.4, '#e2e0da'), 1.6, 0.17, 4.0); P(box(2.4, 0.06, 2.0, '#5aa9d6', { roughness: 0.1, metalness: 0.2 }), 1.6, 0.24, 4.0); }
  if (h.bench) { P(box(1.9, 0.12, 0.55, WOOD), 1.6, G + 0.5, 7.2); for (const s of [-0.75, 0.75]) P(box(0.18, 0.45, 0.5, CONC), 1.6 + s, G + 0.22, 7.2); }
  return g;
}

function buildModernShop(g, P, h, fac, win, G) {
  const fz = 2.5;
  P(box(13.4, 4.0, 9.0, fac), 0, G + 2.0, fz - 4.5);
  P(box(14.2, 0.3, 10.6, ROOFC), 0, G + 4.15, fz - 4.0);                                // laje + marquise na frente
  win(-6.2, -1.0, 0.2, 3.0, fz + 0.04); win(1.0, 6.2, 0.2, 3.0, fz + 0.04);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.08), glassMat()); door.position.set(0, G + 1.3, fz + 0.05); g.add(door);
  P(box(13.4, 0.7, 0.12, h.accent), 0, G + 3.55, fz + 0.08);
  const tex = textTexture(h.label, { width: 512, height: 128, bg: h.accent, fg: '#ffffff' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(0, G + 4.9, fz + 0.4); g.add(sign);
  P(box(4.6, 1.2, 0.1, h.accent), 0, G + 4.9, fz + 0.33);
  P(box(15.6, 0.05, 5.4, '#bdbab2'), 0, 0.15, 5.8);                                     // estacionamento na frente
  for (const x of [-5.2, -1.8, 1.8, 5.2]) P(box(0.12, 0.02, 4.0, '#f4f4f4'), x, 0.19, 6.0);
  for (const s of [-1, 1]) { P(cyl(0.45, 0.35, 0.8, '#5a5d63', 10), s * 1.6, G + 0.4, fz + 0.6); P(sphere(0.5, '#3f8a3a', 7, 5), s * 1.6, G + 1.1, fz + 0.6); }
  return g;
}

/** Cenário fixo do Modernista. */
export function buildModernScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW, ISLAND } = MODERN, SW = '#d6d3cc', ASPH = '#5d6470';
  for (const s of V.segs) {                                                         // calçada contínua + asfalto + faixa
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    add(box(RW + 3.4, 0.08, len, SW), cx, 0.04, cz, 0, ry, 0);
    add(box(RW, 0.06, len, ASPH), cx, 0.09, cz, 0, ry, 0);
    if (s.type !== 'cul') for (let t = 4; t < len - 4; t += 3.4) add(box(0.22, 0.02, 1.6, '#f2f2f2'), ax + (bx - ax) * t / len, 0.13, az + (bz - az) * t / len, 0, ry, 0);
  }
  for (const [k, [x, z]] of Object.entries(V.N)) {
    const r = V.nodeR(k);
    add(cyl(r + 1.7, r + 1.7, 0.08, SW, 28), x, 0.04, z); add(cyl(r, r, 0.06, ASPH, 28), x, 0.092, z);
  }
  for (const i of V.islands) {                                                      // ilha da rotatória: meio-fio, grama e escultura geométrica
    add(cyl(i.r, i.r, 0.3, '#e2e0da', 24), i.x, 0.15, i.z); add(cyl(i.r - 0.4, i.r - 0.4, 0.34, LAWN, 24), i.x, 0.17, i.z);
    add(box(0.8, 3.2, 0.8, '#f4f3ef'), i.x - 0.6, 1.9, i.z); add(box(2.4, 0.6, 0.6, '#ec7a26'), i.x + 0.2, 2.6, i.z + 0.4, 0, 0.6, 0); add(box(0.6, 1.6, 0.6, '#2f6fb0'), i.x + 0.9, 1.1, i.z - 0.5);
  }
  for (const t of V.trees) autumnTree(g, t.x, 0, t.z, t.s, t.type, 'green', t.k);
  const led = mat('#ffffff', { emissive: '#fff6dc', emissiveIntensity: 0.6 });
  for (const l of V.lamps) {                                                         // poste simples: haste fina e braço com luminária reta
    add(cyl(0.09, 0.11, 5.2, '#5a5d63', 6), l.x, 2.6, l.z);
    const arm = new THREE.Group(); arm.position.set(l.x, 5.15, l.z); arm.rotation.y = l.ry; g.add(arm);
    arm.add(at(box(1.6, 0.1, 0.14, '#5a5d63'), 0.75, 0, 0)); const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.3), led); m.position.set(1.2, -0.08, 0); arm.add(m);
  }
  for (const b of V.benches) {
    const bg = new THREE.Group(); bg.position.set(b.x, 0, b.z); bg.rotation.y = b.ry; g.add(bg);
    bg.add(at(box(2.0, 0.12, 0.6, WOOD), 0, 0.5, 0)); for (const d of [-0.8, 0.8]) bg.add(at(box(0.2, 0.45, 0.55, CONC), d, 0.22, 0));
  }
  return g;
}
