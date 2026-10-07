// Posto de gasolina (Bairros 4 e 5): ocupa 2 lotes vizinhos da mesma linha (1×2), incluindo a rua entre eles.
// A van entra nele (os obstáculos estão em GAS_PARTS, layout.js) e abastece embaixo da cobertura.
// Coordenadas locais: origem no canto noroeste do lote da esquerda; frente para o sul (+Z), como as casas.
import * as THREE from 'three';
import { mat, box, cyl, sphere, at, dynamic, bakeStatic, textTexture } from './kit.js';
import { LOT, WALK, GAS_W, GAS_CANOPY, GAS_ISLANDS } from '../layout.js';

const G = 0.12, WALK_TOP = 0.17;
const W = GAS_W;                          // largura do posto (os dois lotes + a rua do meio)
const RED = '#d8312a', WHITE = '#f6f3ec', DARK = '#3a3d44';

function textMesh(text, w, h, bg, fg, px) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: textTexture(text, { width: 512, height: Math.round(512 * h / w), bg, fg, font: `bold ${px}px "Trebuchet MS", sans-serif` }), roughness: 0.8 }));
  return dynamic(m);                       // fora do merge (precisa das coordenadas de textura)
}

export function buildGasStation() {
  const root = new THREE.Group();
  root.name = 'gas-station';

  // piso de concreto (cobre os dois lotes e a rua do meio) + calçada em volta
  root.add(at(box(W, 0.16, LOT, '#c9c4b8'), W / 2, G - 0.04, LOT / 2));
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2;
  root.add(at(box(W + 2 * WALK, h, WALK, '#d4cdbb'), W / 2, y, -WALK / 2));
  root.add(at(box(W + 2 * WALK, h, WALK, '#d4cdbb'), W / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), W + WALK / 2, y, LOT / 2));
  for (let x = 3; x < W; x += 4.2) root.add(at(box(0.08, 0.02, LOT - 1, '#b3ad9f'), x, G + 0.05, LOT / 2));   // juntas

  // cobertura sobre as bombas (no meio, junto à rua)
  const { cx, cz, w: cw, d: cd } = GAS_CANOPY;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    root.add(at(cyl(0.3, 0.3, 4.9, '#e9e4da', 10), cx + sx * (cw / 2 - 2), G + 2.45, cz + sz * (cd / 2 - 1.5)));
  }
  // a cobertura fica fora do merge, com materiais próprios: some (fica transparente) quando a van está embaixo
  const canopy = dynamic(new THREE.Group());
  canopy.add(at(box(cw, 0.55, cd, WHITE), cx, G + 5.1, cz));
  canopy.add(at(box(cw + 0.1, 0.5, cd + 0.1, RED), cx, G + 4.6, cz));                     // faixa vermelha
  for (let i = 0; i < 6; i++) canopy.add(at(box(0.9, 0.05, 0.9, '#fff7c2', { emissive: '#fff0a0', emissiveIntensity: 0.5 }),
    cx - 7.5 + i * 3, G + 4.33, cz));                                                     // luzes embaixo
  const posto = textMesh('POSTO', 7, 0.55, RED, '#ffffff', 70);
  posto.position.set(cx, G + 4.6, cz + cd / 2 + 0.07);
  canopy.add(posto);
  const canopyMats = [];
  canopy.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; canopyMats.push(o.material); } });
  root.add(canopy);
  let fade = 1;
  /** Cobertura some quando a van (x, z locais) está embaixo dela. */
  root.userData.updateCanopy = (lx, lz, dt) => {
    const under = Math.abs(lx - cx) < cw / 2 + 1.5 && Math.abs(lz - cz) < cd / 2 + 2.5;
    const target = under ? 0.18 : 1;
    if (fade === target) return;
    fade += Math.sign(target - fade) * Math.min(Math.abs(target - fade), dt * 4);
    for (const m of canopyMats) { m.opacity = fade; m.depthWrite = fade > 0.99; }
  };

  // ilhas com bombas
  for (const ix of GAS_ISLANDS) {
    root.add(at(box(1.4, 0.3, 5.6, '#e0dbd0'), ix, G + 0.15, cz));
    for (const pz of [cz - 1.6, cz + 1.6]) {
      root.add(at(box(0.9, 1.7, 0.7, RED), ix, G + 1.15, pz));
      root.add(at(box(0.7, 0.45, 0.72, WHITE), ix, G + 1.6, pz));
      root.add(at(box(0.45, 0.25, 0.74, '#2b4a6e'), ix, G + 1.6, pz));                    // visor
      root.add(at(cyl(0.05, 0.05, 1.0, DARK, 6), ix + 0.5, G + 1.0, pz, 0, 0, 0.5));     // mangueira
    }
  }

  // lojinha de conveniência nos fundos (à esquerda)
  root.add(at(box(11, 3.4, 5.4, WHITE), 7.5, G + 1.7, 3.6));
  root.add(at(box(11.2, 0.5, 5.6, '#3c9d55'), 7.5, G + 3.15, 3.6));
  root.add(at(box(8, 1.9, 0.1, '#3d5f80'), 7.5, G + 1.2, 6.33));
  root.add(at(box(1.6, 2.3, 0.12, '#5a7fa3'), 10.5, G + 1.15, 6.35));
  const loja = textMesh('CONVENIÊNCIA', 6, 0.45, '#3c9d55', '#ffffff', 56);
  loja.position.set(7.5, G + 3.15, 6.42);
  root.add(loja);

  // totem de preços na frente (à direita)
  const tx = W - 3, tz = LOT - 2.2;
  root.add(at(box(0.6, 6.4, 0.6, DARK), tx, G + 3.2, tz));
  root.add(at(box(3.0, 3.6, 0.4, RED), tx, G + 5.4, tz));
  const precos = textMesh('GASOLINA  5,99', 2.6, 0.6, '#1d1d1f', '#ffd23a', 60);
  precos.position.set(tx, G + 5.0, tz + 0.21);
  root.add(precos);
  const precos2 = textMesh('ETANOL  3,99', 2.6, 0.6, '#1d1d1f', '#7ee08a', 60);
  precos2.position.set(tx, G + 4.2, tz + 0.21);
  root.add(precos2);
  const marca = textMesh('ADRESS', 2.6, 0.8, RED, '#ffffff', 90);
  marca.position.set(tx, G + 6.6, tz + 0.21);
  root.add(marca);

  // calibrador e lixeira
  root.add(at(box(0.5, 1.2, 0.5, '#3a78d4'), W - 6, G + 0.6, 4));
  root.add(at(cyl(0.35, 0.3, 0.9, '#3c9d55', 10), 14.5, G + 0.45, 7));
  root.add(at(sphere(0.12, '#ffd23a', 6, 4), W - 6, G + 1.3, 4));

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  return root;
}
