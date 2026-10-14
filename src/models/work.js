// Nível 21 (Operário): casa geminada (uma unidade da fileira: largura 6,4, paredes laterais encostadas nas vizinhas, molduras
// separando as unidades), oficina/comércio (largura 12,8: portão largo, toldo, placa, pátio com veículo, pneus, ferramentas)
// e o cenário fixo (ruas, calçadas, cruzamentos, postes, pracinhas, pátios de serviço, árvores). Lote centrado, frente em +z.
import * as THREE from 'three';
import { box, cyl, sphere, torus, at, mat, textTexture } from './kit.js';
import { ROW_COL } from '../data.js';
import { WORK } from '../workPlan.js';
import { autumnTree } from './forest.js';
import { buildCar, CAR_COLORS } from '../barriers.js';

const TRIM = '#ece4d4', PAVE = '#c9c3b6', GLASS = '#7fa6c4';
let brickTex = null;
const brickMats = new Map();
function brickMat(w, h) {
  if (!brickTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#d8cdbd'; g.fillRect(0, 0, 128, 64);
    for (let r = 0; r < 4; r++) for (let k = -1; k < 4; k++) {
      const x = k * 32 + (r % 2) * 16, y = r * 16;
      g.fillStyle = ['#a5553a', '#9a4c34', '#b05e40', '#984a30'][(r + k + 4) % 4]; g.fillRect(x + 1, y + 1, 30, 14);
    }
    brickTex = new THREE.CanvasTexture(c); brickTex.colorSpace = THREE.SRGBColorSpace; brickTex.wrapS = brickTex.wrapT = THREE.RepeatWrapping;
  }
  const key = w.toFixed(2) + 'x' + h.toFixed(2);
  if (!brickMats.has(key)) { const t = brickTex.clone(); t.needsUpdate = true; t.repeat.set(w / 1.6, h / 0.8); brickMats.set(key, new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })); }
  return brickMats.get(key);
}
/** Fachada: tijolo (plano com textura na frente) ou pintada. */
function facade(P, g, fac, x0, x1, y0, y1, zf, depth, zb) {
  const col = fac === 'brick' ? '#a5553a' : ROW_COL.fac[fac];
  P(box(x1 - x0, y1 - y0, depth, col), (x0 + x1) / 2, (y0 + y1) / 2, zb + depth / 2);
  if (fac === 'brick') { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), brickMat(x1 - x0, y1 - y0)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, zf + 0.02); m.receiveShadow = true; g.add(m); }
}
let gableGeo = null;
function gable(w, rise) {   // triângulo da empena (prisma fino)
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, rise); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false });
}

export function buildRowLot(h) {
  if (h.kind === 'wsh') return buildWorkshopLot(h);
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const G = 0.12, W = 6.4, ZB = -5.5, ZF = 3.5, H = h.floors === 2 ? 5.6 : 3.0, C = ROW_COL;
  P(box(W, 0.12, 11, '#9fae6a'), 0, 0.06, 0);                                          // quintalzinho dos fundos
  P(box(W, 0.14, 2.0, PAVE), 0, 0.07, ZF + 1.0);                                        // entrada (calçadinha da casa)
  facade(P, g, h.fac, -W / 2, W / 2, G, G + H, ZF, ZF - ZB, ZB);
  // molduras que separam as unidades (pilastras nas divisas) e friso no topo
  for (const sx of [-1, 1]) P(box(0.28, H + 0.2, 0.18, TRIM), sx * (W / 2 - 0.14), G + H / 2, ZF + 0.08);
  P(box(W, 0.22, 0.24, TRIM), 0, G + H + 0.05, ZF + 0.1);
  if (h.floors === 2) P(box(W, 0.14, 0.16, TRIM), 0, G + 2.85, ZF + 0.08);
  // telhado de duas águas (cumeeira ao longo da rua) + empenas
  const RISE = 1.7, half = (ZF - ZB) / 2 + 0.4, zc = (ZF + ZB) / 2, L = Math.hypot(half, RISE), ang = Math.atan2(RISE, half), rc = C.roof[h.roofc];
  for (const s of [1, -1]) P(box(W + 0.02, 0.18, L, rc), 0, G + H + RISE / 2 + 0.1, zc + s * half / 2, s * ang, 0, 0);
  for (const sx of [-1, 1]) { gableGeo = gableGeo || gable(ZF - ZB, RISE); const m = new THREE.Mesh(gableGeo, mat(h.fac === 'brick' ? '#a5553a' : C.fac[h.fac])); m.rotation.y = Math.PI / 2; m.position.set(sx * (W / 2 - 0.1) - 0.1, G + H, zc); m.castShadow = true; g.add(m); }
  // porta (com visor ou moldura), degrau, janelas
  const DX = -1.6, dc = C.door[h.doorc];
  P(box(1.1, 2.1, 0.1, dc), DX, G + 1.05, ZF + 0.06); P(sphere(0.06, '#f2c14a', 6, 4), DX + 0.38, G + 1.0, ZF + 0.14);
  if (h.dstyle === 'visor') P(box(0.32, 0.32, 0.04, '#cfe3f2'), DX, G + 1.55, ZF + 0.13);
  if (h.dstyle === 'frame') { P(box(1.5, 0.2, 0.12, '#ffffff'), DX, G + 2.2, ZF + 0.12); for (const sx of [-1, 1]) P(box(0.2, 2.2, 0.12, '#ffffff'), DX + sx * 0.65, G + 1.1, ZF + 0.12); }
  P(box(1.5, 0.14, 0.6, '#b8b0a2'), DX, G + 0.07, ZF + 0.3);
  const win = (x, y, w2 = 1.4) => { P(box(w2, 1.1, 0.06, GLASS), x, G + y, ZF + 0.05); P(box(w2 + 0.2, 0.12, 0.22, TRIM), x, G + y - 0.6, ZF + 0.12); };
  win(1.3, 1.4); if (h.floors === 2) { win(-1.6, 4.2, 1.1); win(1.3, 4.2); }
  if (h.flower) for (const [x, y] of [[1.3, 0.72]].concat(h.floors === 2 ? [[1.3, 3.52], [-1.6, 3.52]] : [])) {   // floreiras
    P(box(1.4, 0.3, 0.4, '#7a4a2a'), x, G + y, ZF + 0.3);
    for (let k = 0; k < 4; k++) P(sphere(0.14, ['#e0402a', '#f2c23a', '#ff7ab0', '#9b5de5'][k], 6, 4), x - 0.5 + k * 0.33, G + y + 0.25, ZF + 0.32);
  }
  if (h.awn) {                                                                                // toldo sobre a porta
    const ac = C.awn[h.awn];
    for (let k = 0; k < 4; k++) P(box(0.4, 0.06, 0.9, k % 2 ? '#f4f1ea' : ac), DX - 0.6 + k * 0.4, G + 2.55, ZF + 0.45, 0.35, 0, 0);
  }
  if (h.mail) { P(box(0.1, 1.0, 0.1, '#4a4a4a'), -2.9, G + 0.5, ZF + 1.6); P(box(0.45, 0.4, 0.6, C.mail[h.mail]), -2.9, G + 1.15, ZF + 1.6); }
  if (h.bench) { P(box(1.4, 0.1, 0.4, '#8a5a36'), 1.4, G + 0.45, ZF + 0.5); for (const d of [-0.55, 0.55]) P(box(0.1, 0.4, 0.35, '#5a3a22'), 1.4 + d, G + 0.22, ZF + 0.5); }
  if (h.bike) {                                                                               // bicicleta encostada (de lado, junto à entrada)
    const bx = 1.4, bz = ZF + 1.6;
    for (const dx of [-0.55, 0.55]) P(torus(0.34, 0.04, '#2b2b2b', 5, 12), bx + dx, G + 0.36, bz);
    P(box(1.1, 0.06, 0.06, '#d8473a'), bx, G + 0.62, bz); P(box(0.06, 0.4, 0.06, '#d8473a'), bx - 0.2, G + 0.5, bz, 0, 0, 0.3); P(box(0.3, 0.05, 0.12, '#2b2b2b'), bx - 0.25, G + 0.78, bz);
  }
  return g;
}

function buildWorkshopLot(h) {
  const g = new THREE.Group(), P = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const G = 0.12, W = 12.8, ZB = -7.5, ZF = 1.5, H = 4.6, C = ROW_COL, shop = h.wtype === 'tools' || h.wtype === 'market';
  P(box(W, 0.14, 15, '#b9b3a6'), 0, 0.07, 0);                                           // pátio de concreto
  for (const [x, z, r] of [[2.0, 4.4, 0.9], [-3.0, 5.6, 0.6]]) P(cyl(r, r, 0.02, '#8a857a', 10), x, 0.15, z);   // manchas de óleo
  facade(P, g, h.fac, -W / 2, W / 2, G, G + H, ZF, ZF - ZB, ZB);
  for (const sx of [-1, 1]) P(box(0.32, H + 0.4, 0.2, TRIM), sx * (W / 2 - 0.16), G + H / 2 + 0.2, ZF + 0.1);
  P(box(W, 0.6, 0.3, TRIM), 0, G + H + 0.25, ZF + 0.12);                               // platibanda
  P(box(W - 0.2, 0.16, ZF - ZB, '#7a7f86'), 0, G + H + 0.05, (ZF + ZB) / 2);
  const gc = C.gate[h.gate];
  if (!shop) {                                                                              // portão largo de enrolar
    P(box(6.0, 3.4, 0.1, gc), -1.6, G + 1.7, ZF + 0.06);
    for (let y = 0.3; y < 3.4; y += 0.32) P(box(6.0, 0.04, 0.04, '#00000033'.slice(0, 7)), -1.6, G + y, ZF + 0.12);
    P(box(1.0, 2.1, 0.1, gc), 4.6, G + 1.05, ZF + 0.06);
  } else {                                                                                  // loja: vitrine + porta (com a moldura na cor do "portão")
    P(box(5.4, 2.4, 0.06, GLASS), -2.6, G + 1.5, ZF + 0.05); P(box(5.6, 0.2, 0.16, gc), -2.6, G + 2.75, ZF + 0.1); P(box(5.6, 0.2, 0.16, gc), -2.6, G + 0.25, ZF + 0.1);
    P(box(1.3, 2.3, 0.1, gc), 2.0, G + 1.15, ZF + 0.06); P(box(0.8, 1.2, 0.04, GLASS), 2.0, G + 1.4, ZF + 0.12);
    if (h.wtype === 'market') for (let k = 0; k < 4; k++) { P(box(0.9, 0.5, 0.7, '#a8743e'), -4.6 + k * 1.15, G + 0.25, ZF + 0.8); P(sphere(0.2, ['#d22a24', '#f2b43a', '#5ea84e', '#ec7a26'][k], 6, 4), -4.6 + k * 1.15, G + 0.6, ZF + 0.8); }
  }
  const tex = textTexture(h.sign, { width: 1024, height: 128, bg: '#f4f1ea', fg: '#2b2d33', font: 'bold 64px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 1.05), new THREE.MeshLambertMaterial({ map: tex })); sign.position.set(0, G + 4.05, ZF + 0.14); g.add(sign);
  P(box(8.7, 1.25, 0.08, gc), 0, G + 4.05, ZF + 0.08);
  if (h.awn) { const ac = C.awn[h.awn]; for (let k = 0; k < 8; k++) P(box(0.7, 0.06, 1.3, k % 2 ? '#f4f1ea' : ac), (shop ? -5.05 : 2.4) + k * 0.7 - (shop ? 0 : 2.4), G + 3.25, ZF + 0.62, 0.32, 0, 0); }
  if (h.tires) for (const [x, n] of [[-5.6, 5], [-4.5, 3]]) for (let k = 0; k < n; k++) P(cyl(0.45, 0.45, 0.28, '#1f2023', 12), x, G + 0.16 + k * 0.29, ZF + 1.4);   // pilhas de pneus
  if (h.tools) {                                                                            // ferramentas e peças expostas (bancada + painel)
    P(box(2.2, 0.9, 0.7, '#6b6f76'), 5.0, G + 0.45, ZF + 0.6); P(box(2.2, 1.4, 0.08, '#c9a46a'), 5.0, G + 1.8, ZF + 0.12);
    for (let k = 0; k < 5; k++) P(box(0.08, 0.5, 0.05, ['#d8473a', '#3a78d4', '#efbf2a', '#5a5d63', '#3c9d55'][k]), 4.2 + k * 0.4, G + 1.9, ZF + 0.18, 0, 0, (k % 2) * 0.5);
    for (let k = 0; k < 3; k++) P(cyl(0.18, 0.18, 0.12, '#9aa0a8', 8), 4.4 + k * 0.6, G + 0.96, ZF + 0.6);
  }
  if (h.car) { const c = buildCar(); c.userData.body.material = mat(CAR_COLORS[h.index % CAR_COLORS.length]); c.position.set(-1.6, 0.1, 4.6); c.rotation.y = Math.PI / 2; g.add(c); }   // veículo parado no pátio
  return g;
}

/** Cenário fixo do Operário. */
export function buildWorkScene(g, V) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const { RW, SIDE } = WORK, SW = '#cfcac0', ASPH = '#5d6470';
  for (const s of V.segs) {
    const [ax, az] = s.a, [bx, bz] = s.b, len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    add(box(RW + SIDE * 2, 0.1, len + RW + SIDE * 2, SW), cx, 0.05, cz, 0, ry, 0);
    add(box(RW, 0.06, len, ASPH), cx, 0.11, cz, 0, ry, 0);
    if (s.type !== 'lane') for (let t = 4; t < len - 4; t += 2.8) add(box(0.2, 0.02, 1.3, '#f2d45c'), ax + (bx - ax) * t / len, 0.15, az + (bz - az) * t / len, 0, ry, 0);
  }
  for (const [x, z] of Object.values(V.N)) add(box(RW, 0.06, RW, ASPH), x, 0.112, z);
  const bulb = mat('#fff1c8', { emissive: '#ffd36b', emissiveIntensity: 0.7 });
  for (const l of V.lamps) { add(cyl(0.1, 0.13, 5, '#3a3d44', 6), l.x, 2.5, l.z); add(box(0.9, 0.12, 0.3, '#3a3d44'), l.x, 5.0, l.z); add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.22), bulb), l.x, 4.92, l.z); }
  for (const p of V.plazas) {                                                       // pracinha: piso, canteiros, árvore no meio, bancos
    add(cyl(p.r, p.r, 0.1, '#d8cfbd', 16), p.x, 0.06, p.z);
    for (const a of [Math.PI / 2, -Math.PI / 2]) add(box(2.4, 0.4, 1.0, '#7a5434'), p.x + Math.cos(a) * 3.2, 0.25, p.z + Math.sin(a) * 3.2);
    for (const a of [Math.PI / 2, -Math.PI / 2]) for (let k = 0; k < 4; k++) add(sphere(0.22, ['#e0402a', '#f2c23a', '#ff7ab0', '#f4f4f4'][k], 6, 4), p.x + Math.cos(a) * 3.2 - 0.8 + k * 0.55, 0.55, p.z + Math.sin(a) * 3.2);
  }
  for (const b of V.benches) { const bg = new THREE.Group(); bg.position.set(b.x, 0, b.z); bg.rotation.y = b.ry; g.add(bg); bg.add(at(box(2.0, 0.1, 0.55, '#8a5a36'), 0, 0.5, 0)); bg.add(at(box(2.0, 0.5, 0.1, '#8a5a36'), 0, 0.85, -0.25)); for (const d of [-0.85, 0.85]) bg.add(at(box(0.1, 0.5, 0.5, '#3a3d44'), d, 0.25, 0)); }
  for (const y of V.yards) {                                                        // pátio de serviço: piso de concreto, paletes, caixas, tambores
    add(box(y.r * 2, 0.1, y.r * 2, '#b9b3a6'), y.x, 0.06, y.z);
    for (let k = 0; k < 3; k++) add(box(1.2, 0.15, 1.0, '#b08a5a'), y.x - 2 + k * 1.3, 0.2, y.z - 2);
    for (let k = 0; k < 3; k++) add(box(0.8, 0.8, 0.8, '#c9a46a'), y.x - 2 + k * 1.3, 0.65, y.z - 2);
    for (let k = 0; k < 3; k++) add(cyl(0.4, 0.4, 1.0, ['#2f6fb0', '#c8402f', '#3f8a4a'][k], 10), y.x + 1.6 + (k % 2) * 0.9, 0.6, y.z + 1.2 + k * 0.6);
  }
  for (const t of V.trees) autumnTree(g, t.x, 0, t.z, t.s, t.type, 'green', t.k);
  return g;
}
