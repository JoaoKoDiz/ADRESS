// Galpão (Bairro 10): ocupa 2 lotes vizinhos + a rua entre eles (como o posto). Prédio largo, telhado amplo,
// portão grande (em frente ao lote da esquerda, onde fica o ponto de entrega) e área de carga.
// O que varia (e aparece nas pistas): cor do telhado e do portão; caixas/pallets, empilhadeira, caminhão, barris/tubos.
// Origem no canto noroeste do lote da esquerda, frente +Z (como os outros lotes).
import * as THREE from 'three';
import { box, cyl, at, mat, bakeStatic } from './kit.js';
import { LOT, ROAD } from '../layout.js';

export const WROOF_COL = { red: '#c8463a', blue: '#3a6fbf', green: '#3c8f52', gray: '#7d838c' };
export const GATE_COL = { blue: '#2f78d0', red: '#d6402f', yellow: '#efbf2a', green: '#36a05a' };
const W = LOT * 2 + ROAD, G = 0.06;

export function buildWareLot(h) {
  const root = new THREE.Group();
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  // pátio de concreto (cobre os 2 lotes e a rua entre eles) com faixa amarela na frente
  add(box(W + 0.8, 0.12, LOT + 0.8, '#bdb8ad'), W / 2, G, LOT / 2);
  add(box(W + 0.8, 0.13, 0.35, '#e0b43a'), W / 2, G + 0.01, LOT + 0.2);
  // prédio largo: paredes de chapa com nervuras verticais
  const BX0 = 1.5, BX1 = W - 1.5, BZ0 = 0.8, BZ1 = 10.5, BH = 6.4;
  add(box(BX1 - BX0, BH, BZ1 - BZ0, '#d9d4c7'), (BX0 + BX1) / 2, G + BH / 2, (BZ0 + BZ1) / 2);
  for (let x = BX0 + 1.2; x < BX1 - 0.5; x += 1.6) add(box(0.18, BH - 0.4, 0.12, '#c4bfb2'), x, G + BH / 2, BZ1 + 0.06);
  // telhado de duas águas: as duas águas se encontram na cumeeira (ao longo do comprimento, eixo X), apoiadas no topo das
  // paredes, com beiral uniforme; oitões triangulares nas duas pontas preenchem exatamente o vão sob o telhado
  const rc = WROOF_COL[h.wroof] || '#7d838c', zc = (BZ0 + BZ1) / 2, half = (BZ1 - BZ0) / 2, rise = 2.2, O = 0.6, T = 0.3;
  const ang = Math.atan2(rise, half), yTop = G + BH + rise, run = half + O, len = run / Math.cos(ang);
  for (const s of [-1, 1]) {
    // face de baixo da água: reta da cumeeira (zc, yTop) até o beiral; passa exatamente sobre o topo da parede
    const mz = zc + s * run / 2, my = yTop - Math.tan(ang) * run / 2;
    add(box(BX1 - BX0 + 2 * O, T, len, rc), (BX0 + BX1) / 2, my + (T / 2) / Math.cos(ang), mz, s * ang, 0, 0);
  }
  add(box(BX1 - BX0 + 2 * O, 0.32, 0.5, rc), (BX0 + BX1) / 2, yTop + T / Math.cos(ang) - 0.06, zc);   // cumeeira (fecha a junta)
  const gable = new THREE.Shape(); gable.moveTo(-half, 0); gable.lineTo(half, 0); gable.lineTo(0, rise); gable.lineTo(-half, 0);
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 0.3, bevelEnabled: false });
  for (const x of [BX0, BX1 - 0.3]) {                                   // oitões no plano das paredes das pontas
    const m = new THREE.Mesh(gGeo, mat('#d9d4c7'));
    m.position.set(x, G + BH, zc); m.rotation.y = Math.PI / 2; root.add(m);
  }
  // portão grande de enrolar (na frente do lote da esquerda: o ponto de entrega fica ali na rua)
  const gc = GATE_COL[h.gate] || '#2f78d0', GX = 8.6, GW = 6.2, GH = 4.8;
  add(box(GW + 0.8, GH + 0.6, 0.2, '#5b6068'), GX, G + (GH + 0.6) / 2, BZ1 + 0.1);
  add(box(GW, GH, 0.25, gc), GX, G + GH / 2, BZ1 + 0.18);
  for (let y = 0.5; y < GH; y += 0.6) add(box(GW, 0.08, 0.3, '#222831'), GX, G + y, BZ1 + 0.2);
  add(box(GW + 1.6, 0.3, 1.4, gc), GX, G + GH + 0.9, BZ1 + 0.5);    // marquise na cor do portão
  // área de carga: plataforma elevada com borda amarela e portas menores
  add(box(14, 1.2, 2.4, '#a9a49a'), 24, G + 0.6, BZ1 + 1.2);
  add(box(14, 0.15, 0.2, '#efbf2a'), 24, G + 1.2, BZ1 + 2.35);
  for (const x of [19.5, 24, 28.5]) add(box(3, 3.4, 0.2, '#6d737c'), x, G + 1.2 + 1.7, BZ1 + 0.12);
  // letreiro
  add(box(9, 1.2, 0.2, '#2e3a46'), W / 2, G + BH - 0.9, BZ1 + 0.12);
  const it = h.items || [];
  if (it.includes('pallets')) {                                       // caixas e pallets ao lado do portão (longe do caminho)
    for (const [x, z, n] of [[2.8, 13.6, 3], [4.6, 13.8, 2], [2.8, 15.4, 1]]) {
      add(box(1.5, 0.18, 1.5, '#b58a55'), x, G + 0.09, z);
      for (let k = 0; k < n; k++) add(box(1.2, 0.9, 1.2, k % 2 ? '#c8925a' : '#b8844e'), x, G + 0.65 + k * 0.9, z);
    }
  }
  if (it.includes('forklift')) {                                      // empilhadeira amarela estacionada
    const fx = 13.6, fz = 14.2;
    add(box(2.0, 1.1, 1.3, '#efbf2a'), fx, G + 0.95, fz);
    add(box(0.9, 1.1, 1.2, '#2e3036'), fx - 0.4, G + 2.0, fz);
    for (const x of [fx + 1.1, fx + 1.1]) add(box(0.12, 2.6, 1.1, '#3a3d44'), x, G + 1.4, fz);
    for (const z of [fz - 0.35, fz + 0.35]) add(box(1.3, 0.08, 0.15, '#3a3d44'), fx + 1.75, G + 0.15, z);
    for (const [x, z] of [[fx - 0.6, fz - 0.7], [fx - 0.6, fz + 0.7], [fx + 0.6, fz - 0.7], [fx + 0.6, fz + 0.7]]) add(cyl(0.32, 0.32, 0.25, '#1f2023', 10), x, G + 0.32, z, Math.PI / 2, 0, 0);
  }
  if (it.includes('truck')) {                                         // caminhão de ré na plataforma de carga
    const tx = 24, tz = 15.2;
    add(box(7.5, 3.2, 2.6, '#f2f2f2'), tx, G + 2.3, tz - 0.6, 0, 0, 0);
    add(box(2.4, 2.4, 2.5, '#d6402f'), tx + 4.9, G + 1.9, tz - 0.6);
    add(box(0.08, 1.0, 2.1, '#2b4a6e'), tx + 6.12, G + 2.4, tz - 0.6);
    for (const x of [tx - 2.6, tx - 1.2, tx + 4.8]) for (const zz of [-1.25, 1.25]) add(cyl(0.5, 0.5, 0.4, '#1f2023', 12), x, G + 0.5, tz - 0.6 + zz, Math.PI / 2, 0, 0);
  }
  if (it.includes('barrels')) {                                       // barris e tubos empilhados no canto direito
    for (const [x, z] of [[36.5, 13.4], [37.7, 13.4], [36.5, 14.6], [37.7, 14.6]]) add(cyl(0.5, 0.5, 1.3, '#3a6fbf', 12), x, G + 0.65, z);
    add(cyl(0.5, 0.5, 1.3, '#d6402f', 12), 37.1, G + 1.95, 14.0);
    for (let k = 0; k < 3; k++) add(cyl(0.3, 0.3, 4.2, '#9aa0a8', 10), 39.2, G + 0.3 + k * 0.55, 15.6 - k * 0.0 - (k % 2) * 0.3, 0, 0, Math.PI / 2);
  }
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  root.userData.update = () => {};
  return root;
}
