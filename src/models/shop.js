// Prédio comercial de 2 andares (Bairro 5). Mesmo desenho para todos; só 3 coisas mudam:
//   1) cor do toldo listrado (shop.awning), 2) cor da fachada (shop.facade), 3) o que há no topo (shop.top:
//   ar-condicionados, outdoor ou antena de rádio). Coordenadas locais do lote (como buildLot das casas).
import * as THREE from 'three';
import { mat, box, cyl, sphere, at, dynamic, bakeStatic, textTexture } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';
import { AWNING_COL, FACADE_COL } from '../data.js';

const G = 0.12, WALK_TOP = 0.17;
const X0 = 3.8, X1 = 13.4, Z0 = 1.5, Z1 = A.house.z1;     // frente alinhada com a das casas (z = 8.5)
const F1 = 3.2, F2 = 2.9, H = F1 + F2;                    // térreo, 1º andar, altura total
const CX = (X0 + X1) / 2, W = X1 - X0, D = Z1 - Z0;
const GLASS = '#3d5f80', FRAME = '#e9e4da', DARK = '#3a3d44';

/** Monta o lote do prédio comercial `shop` (dados de data.js). */
export function buildShopLot(shop) {
  const root = new THREE.Group();
  root.name = 'shop:' + shop.name;
  const facade = FACADE_COL[shop.facade], awning = AWNING_COL[shop.awning];

  // chão: calçamento claro e calçada em volta (mesma do lote das casas)
  root.add(at(box(LOT, 0.14, LOT, '#cdc7bb'), LOT / 2, G - 0.07, LOT / 2));
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2, full = LOT + 2 * WALK;
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, -WALK / 2));
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), LOT + WALK / 2, y, LOT / 2));
  for (let x = 1.5; x < LOT; x += 3) root.add(at(box(0.08, 0.02, LOT - 9.5, '#bdb6a8'), x, G + 0.01, 13));   // juntas do piso

  // corpo do prédio (fachada) + laje e platibanda
  root.add(at(box(W, H, D, facade), CX, G + H / 2, (Z0 + Z1) / 2));
  if (shop.facade === 'brick') {                                   // fachada de tijolinhos: fiadas de argamassa
    for (let yy = G + 0.35; yy < G + H; yy += 0.42) {
      root.add(at(box(W + 0.04, 0.05, D + 0.04, '#d9b49a'), CX, yy, (Z0 + Z1) / 2));
    }
  }
  root.add(at(box(W + 0.3, 0.45, D + 0.3, '#8f8a82'), CX, G + H + 0.22, (Z0 + Z1) / 2));          // platibanda
  root.add(at(box(W - 0.4, 0.06, D - 0.4, '#6f6b65'), CX, G + H + 0.47, (Z0 + Z1) / 2));          // laje

  // térreo: vitrines, porta de vidro e faixa acima
  root.add(at(box(W - 0.2, 0.35, 0.12, '#55524c'), CX, G + F1 - 0.1, Z1 + 0.05));
  for (const [x0, x1] of [[X0 + 0.5, A.doorX - 1.2], [A.doorX + 1.2, X1 - 0.5]]) {
    const w = x1 - x0;
    root.add(at(box(w + 0.16, 2.2, 0.08, FRAME), (x0 + x1) / 2, G + 1.35, Z1 + 0.04));
    root.add(at(box(w, 2.0, 0.1, GLASS), (x0 + x1) / 2, G + 1.35, Z1 + 0.06));
    root.add(at(box(0.08, 2.0, 0.12, FRAME), (x0 + x1) / 2, G + 1.35, Z1 + 0.08));
  }
  root.add(at(box(2.0, 2.5, 0.08, FRAME), A.doorX, G + 1.25, Z1 + 0.04));
  root.add(at(box(1.7, 2.3, 0.1, '#5a7fa3'), A.doorX, G + 1.2, Z1 + 0.07));
  root.add(at(box(0.08, 0.5, 0.06, '#c9ced6'), A.doorX + 0.6, G + 1.2, Z1 + 0.14));            // puxador
  root.add(at(box(2.6, 0.12, 1.0, '#bdb6a8'), A.doorX, G + 0.06, Z1 + 0.55));                   // degrau

  // 1º andar: três janelas
  for (const x of [X0 + 1.7, CX, X1 - 1.7]) {
    root.add(at(box(1.9, 1.5, 0.08, FRAME), x, G + F1 + 1.35, Z1 + 0.04));
    root.add(at(box(1.6, 1.25, 0.1, GLASS), x, G + F1 + 1.35, Z1 + 0.06));
    root.add(at(box(2.1, 0.12, 0.3, FRAME), x, G + F1 + 0.55, Z1 + 0.15));
  }
  // janelas laterais e dos fundos
  for (const s of [-1, 1]) for (const yy of [G + 1.5, G + F1 + 1.35]) {
    root.add(at(box(0.08, 1.2, 1.6, GLASS), CX + s * (W / 2 + 0.03), yy, (Z0 + Z1) / 2));
  }

  // toldo listrado (cor do toldo + branco), inclinado para a rua
  const stripes = 9, sw = (W - 0.4) / stripes, tilt = 0.42;
  for (let i = 0; i < stripes; i++) {
    const x = X0 + 0.2 + sw * (i + 0.5);
    root.add(at(box(sw, 0.08, 1.9, i % 2 ? '#fbf7ef' : awning), x, G + F1 + 0.05, Z1 + 0.85, tilt, 0, 0));
  }
  for (let i = 0; i < stripes; i++) {                                                  // babado na ponta
    const x = X0 + 0.2 + sw * (i + 0.5);
    root.add(at(box(sw, 0.35, 0.06, i % 2 ? '#fbf7ef' : awning), x, G + F1 - 0.48, Z1 + 1.72));
  }

  // placa "COMÉRCIO" (igual em todos) entre o toldo e as janelas de cima
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.75),
    new THREE.MeshStandardMaterial({ map: textTexture('COMÉRCIO', { width: 512, height: 88, bg: '#2f3236', fg: '#fff3d6', font: 'bold 62px "Trebuchet MS", sans-serif' }), roughness: 0.8 }));
  sign.position.set(CX, G + F1 + 0.5, Z1 + 0.11);
  root.add(dynamic(sign));                                       // fora do merge (precisa das coordenadas de textura)

  // o que há no topo
  const top = G + H + 0.5;
  if (shop.top === 'ac') {
    for (const [x, z] of [[X0 + 2, Z0 + 2], [CX + 0.4, Z0 + 3.4], [X1 - 2, Z0 + 2]]) {
      root.add(at(box(1.5, 0.95, 1.2, '#c9ced6'), x, top + 0.48, z));
      root.add(at(cyl(0.42, 0.42, 0.06, '#4a4f58', 14), x, top + 0.98, z));
      root.add(at(box(1.3, 0.5, 0.06, '#8f949c'), x, top + 0.45, z + 0.61));
    }
  } else if (shop.top === 'billboard') {
    for (const x of [CX - 2.2, CX + 2.2]) root.add(at(box(0.25, 2.6, 0.25, DARK), x, top + 1.3, Z0 + 3.5));
    root.add(at(box(6.4, 2.8, 0.25, '#f4f1ea'), CX, top + 3.6, Z0 + 3.5));
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 2.4), new THREE.MeshStandardMaterial({ map: adTexture(), roughness: 0.8 }));
    ad.position.set(CX, top + 3.6, Z0 + 3.64);
    root.add(dynamic(ad));
  } else if (shop.top === 'antenna') {
    for (let k = 0; k < 6; k++) {
      root.add(at(cyl(0.16 - k * 0.015, 0.18 - k * 0.015, 0.95, k % 2 ? '#f4f1ea' : '#d8473a', 8), CX + 1.5, top + 0.48 + k * 0.95, Z0 + 3));
    }
    root.add(at(box(1.6, 0.1, 0.1, DARK), CX + 1.5, top + 4.2, Z0 + 3));
    root.add(at(box(0.1, 0.1, 1.6, DARK), CX + 1.5, top + 3.3, Z0 + 3));
    const blink = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.4 }));
    blink.position.set(CX + 1.5, top + 6.0, Z0 + 3);
    root.add(blink);
  }

  // frente: duas jardineiras e um banco (iguais em todos)
  for (const x of [3.4, 13.8]) {
    root.add(at(box(2.2, 0.6, 1.2, '#8a8f98'), x, G + 0.3, 12.6));
    root.add(at(sphere(0.75, '#3f8f3a', 8, 6), x - 0.4, G + 0.95, 12.6));
    root.add(at(sphere(0.6, '#4fa848', 8, 6), x + 0.5, G + 0.9, 12.6));
  }
  root.add(at(box(2.4, 0.15, 0.6, '#8a5a36'), 13.6, G + 0.5, 15.2));
  for (const x of [12.7, 14.5]) root.add(at(box(0.15, 0.5, 0.5, DARK), x, G + 0.25, 15.2));

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  root.userData.update = () => {};
  return root;
}

/** Anúncio do outdoor (o mesmo em todos os prédios que têm outdoor). */
function adTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 205;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 205);
  g.fillStyle = '#e3262e'; g.beginPath(); g.arc(95, 102, 70, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = 'bold 54px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('%', 95, 104);
  g.fillStyle = '#3a2a1a'; g.font = 'bold 64px "Trebuchet MS", sans-serif'; g.fillText('OFERTA!', 330, 80);
  g.font = 'bold 34px "Trebuchet MS", sans-serif'; g.fillText('é só passar aqui', 330, 145);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
