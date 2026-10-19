// Posto de gasolina (Bairros 4 e 5): ocupa 2 lotes vizinhos da mesma linha (1×2), incluindo a rua entre eles.
// A van entra nele (os obstáculos estão em GAS_PARTS, layout.js) e abastece embaixo da cobertura.
// Coordenadas locais: origem no canto noroeste do lote da esquerda; frente para o sul (+Z), como as casas.
import * as THREE from 'three';
import { mat, box, cyl, sphere, cone, at, dynamic, bakeStatic, textTexture, vcMerge, mergePlain } from './kit.js';
import { LOT, WALK, GAS_W, GAS_CANOPY, GAS_ISLANDS } from '../layout.js';

const G = 0.12, WALK_TOP = 0.17;
const W = GAS_W;                          // largura do posto (os dois lotes + a rua do meio)
const RED = '#d8312a', WHITE = '#f6f3ec', DARK = '#3a3d44';

function textMesh(text, w, h, bg, fg, px) {
  // canvas no dobro da resolução e letra limitada à altura da placa (antes o acento de "CONVENIÊNCIA" era cortado)
  const cw = 1024, ch = Math.round(cw * h / w), fs = Math.min(px * 2, Math.round(ch * 0.78));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: textTexture(text, { width: cw, height: ch, bg, fg, font: `bold ${fs}px "Trebuchet MS", sans-serif` }), roughness: 0.8 }));
  return dynamic(m);                       // fora do merge (precisa das coordenadas de textura)
}

/** Frentista de macacão e boné, com os braços separados (acena para a van que chega). */
function buildAttendant() {
  const UNI = '#d8312a', UNI2 = '#a8221d', PANTS = '#2f3e5c', SKIN = '#d9a07a', CAP = '#d8312a';
  const body = new THREE.Group();
  for (const s of [-1, 1]) {
    body.add(at(box(0.2, 0.82, 0.22, PANTS), s * 0.13, 0.41, 0));
    body.add(at(box(0.24, 0.12, 0.34, '#2a2522'), s * 0.13, 0.06, 0.05));
  }
  body.add(at(box(0.56, 0.68, 0.32, UNI), 0, 1.16, 0));
  body.add(at(box(0.58, 0.08, 0.34, '#f4f1ea'), 0, 1.08, 0));                 // faixa refletiva
  body.add(at(box(0.18, 0.12, 0.02, '#f4f1ea'), 0.12, 1.36, 0.17));          // crachá
  body.add(at(box(0.16, 0.1, 0.16, SKIN), 0, 1.54, 0));
  const head = new THREE.Group();                                             // (na origem: o mesh fundido é posto no pescoço)
  head.add(at(sphere(0.2, SKIN, 10, 8), 0, 0, 0));
  head.add(at(cyl(0.21, 0.21, 0.12, CAP, 12), 0, 0.12, 0));
  head.add(at(box(0.26, 0.04, 0.22, UNI2), 0, 0.08, 0.18));                 // aba do boné
  for (const s of [-1, 1]) head.add(at(sphere(0.03, '#2a2522', 5, 3), s * 0.07, 0.02, 0.18));
  const torso = vcMerge(body), headM = vcMerge(head);
  headM.position.set(0, 1.74, 0);
  const arm = side => {
    const a = new THREE.Group(); a.add(at(box(0.14, 0.58, 0.16, UNI), 0, -0.27, 0)); a.add(at(sphere(0.08, SKIN, 6, 4), 0, -0.6, 0));
    const m = vcMerge(a); const pivot = new THREE.Group(); pivot.position.set(side * 0.35, 1.44, 0); pivot.add(m); return pivot;
  };
  const g = dynamic(new THREE.Group()), armL = arm(-1), armR = arm(1);
  g.add(torso, headM, armL, armR);
  g.userData = { dynamic: true, head: headM, armL, armR };
  return g;
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

  // ilhas com bombas (meio-fio amarelo e preto, bicos no suporte, mangueiras, balde do rodo, prateleira de óleo)
  const lcd = mat('#9fe8b8', { emissive: '#3a9a5a', emissiveIntensity: 0.8 });
  for (const ix of GAS_ISLANDS) {
    root.add(at(box(1.4, 0.3, 5.6, '#e0dbd0'), ix, G + 0.15, cz));
    for (const ez of [-1, 1]) for (let k = 0; k < 2; k++) root.add(at(box(1.42, 0.31, 0.35, k ? '#2a2a2a' : '#f2c23a'), ix, G + 0.15, cz + ez * (2.8 - 0.175 - k * 0.35)));   // pontas listradas
    for (const pz of [cz - 1.6, cz + 1.6]) {
      root.add(at(box(0.9, 1.7, 0.7, RED), ix, G + 1.15, pz));
      root.add(at(box(0.7, 0.45, 0.72, WHITE), ix, G + 1.6, pz));
      root.add(at(box(0.45, 0.25, 0.74, '#2b4a6e'), ix, G + 1.6, pz));                    // visor
      for (const sx of [-1, 1]) root.add(at(box(0.02, 0.16, 0.36, lcd), ix + sx * 0.37, G + 1.62, pz));   // números acesos nos dois lados
      root.add(at(box(0.92, 0.12, 0.72, '#f4f1ea'), ix, G + 2.06, pz));                    // tampa com a faixa branca
      for (const sx of [-1, 1]) {                                                          // bico no suporte + mangueira caída
        root.add(at(box(0.08, 0.3, 0.14, '#2a2a2a'), ix + sx * 0.5, G + 1.2, pz + 0.15));
        root.add(at(cyl(0.04, 0.04, 0.9, DARK, 6), ix + sx * 0.52, G + 0.72, pz - 0.05, 0.35, 0, sx * 0.15));
      }
    }
    root.add(at(cyl(0.2, 0.17, 0.4, '#3a78d4', 8), ix + 0.3, G + 0.5, cz + 2.35));        // balde do rodo (na ponta da ilha)
    root.add(at(box(0.04, 0.9, 0.04, '#7a5230'), ix + 0.3, G + 0.85, cz + 2.35, 0.2, 0, 0));
    root.add(at(box(0.4, 0.06, 0.12, '#2a2a2a'), ix + 0.3, G + 1.3, cz + 2.44, 0.2, 0, 0));
    root.add(at(box(0.6, 0.5, 0.4, '#8f949c'), ix - 0.3, G + 0.55, cz - 2.35));           // prateleira de óleo (na outra ponta)
    for (let k = 0; k < 3; k++) root.add(at(box(0.14, 0.24, 0.1, ['#f2c23a', '#2f5fb0', '#5ab86a'][k]), ix - 0.48 + k * 0.18, G + 0.92, cz - 2.35));
  }
  // marcas no piso: setas de entrada e manchas de óleo junto às bombas (as setas ficam acima das juntas do piso)
  for (const x of [13.4, cx, 28.6]) {                                                      // da rua para as bombas
    root.add(at(box(0.35, 0.02, 1.8, '#f4f1ea'), x, G + 0.056, 16.0));
    root.add(at(cyl(0.62, 0.62, 0.02, '#f4f1ea', 3), x, G + 0.056, 14.75, 0, Math.PI, 0));   // ponta (triângulo) para o norte
  }
  for (const [x, z, s] of [[GAS_ISLANDS[0] + 1.6, cz - 1.0, 1.1], [GAS_ISLANDS[1] - 1.7, cz + 1.4, 0.9], [GAS_ISLANDS[1] + 1.5, cz - 0.4, 1.0]]) {
    const m = at(cyl(0.45, 0.45, 0.02, '#b3ada1', 10), x, G + 0.04, z); m.scale.set(s * 1.3, 1, s); root.add(m);
  }

  // lojinha de conveniência nos fundos (à esquerda): vitrine acesa com prateleiras, geladeira de bebidas e porta de vidro
  root.add(at(box(11, 3.0, 5.4, WHITE), 7.5, G + 1.5, 3.6));             // paredes até 3,0
  root.add(at(box(11.2, 0.5, 5.6, '#3c9d55'), 7.5, G + 3.25, 3.6));        // teto por cima (3,0–3,5): não atravessa a parede
  root.add(at(box(11.04, 0.3, 5.44, '#d9d4c8'), 7.5, G + 0.15, 3.6));      // rodapé
  const LIT = mat('#f3e7cc', { emissive: '#5a4628', emissiveIntensity: 0.55 });
  root.add(at(box(8, 1.9, 0.06, LIT), 7.5, G + 1.2, 6.32));
  for (const y of [G + 0.75, G + 1.35]) {                                  // prateleiras com salgadinhos e bebidas
    root.add(at(box(5.2, 0.05, 0.12, '#cbb894'), 5.6, y, 6.38));
    for (let k = 0; k < 12; k++) root.add(at(box(0.3, 0.3, 0.08, ['#e8402a', '#f2c23a', '#3a8ad8', '#5ab86a', '#ff8a1a', '#a86ad8'][(k + Math.round(y * 4)) % 6]), 3.25 + k * 0.42, y + 0.18, 6.38));
  }
  root.add(at(box(2.2, 1.8, 0.1, '#dfe9ef'), 9.85 - 0.1 - 1.6, G + 1.15, 6.37));   // geladeira de bebidas
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) root.add(at(cyl(0.06, 0.06, 0.32, ['#3a8a3a', '#d8312a', '#f2c23a'][r], 6), 7.25 + k * 0.32, G + 0.55 + r * 0.5, 6.42));
  root.add(at(box(8.16, 0.1, 0.18, '#e9e4da'), 7.5, G + 2.2, 6.4));         // moldura da vitrine
  root.add(at(box(8.16, 0.1, 0.18, '#e9e4da'), 7.5, G + 0.25, 6.4));
  for (const x of [3.46, 7.5, 11.54]) root.add(at(box(0.1, 2.0, 0.16, '#e9e4da'), x, G + 1.22, 6.4));
  root.add(at(box(1.6, 2.3, 0.12, '#5a7fa3'), 10.5, G + 1.15, 6.35));
  root.add(at(box(0.07, 0.6, 0.06, '#c9ced6'), 11.05, G + 1.15, 6.43));                   // puxador
  const aberto = textMesh('ABERTO 24H', 1.3, 0.3, '#fbf7ee', '#c8312a', 46);
  aberto.position.set(10.5, G + 1.85, 6.42); root.add(aberto);
  const promo = textMesh('CAFÉ R$ 3', 1.5, 0.75, '#ffd23a', '#3a2a1a', 64);
  promo.position.set(4.5, G + 1.85, 6.44); root.add(promo);
  root.add(at(box(0.5, 0.18, 0.3, '#fff1bf', { emissive: '#ffe9a0', emissiveIntensity: 0.6 }), 12.5, G + 2.5, 6.42));   // luminária da porta
  const loja = textMesh('CONVENIÊNCIA', 6, 0.55, '#3c9d55', '#ffffff', 56);
  loja.position.set(7.5, G + 3.25, 6.42);
  root.add(loja);

  // totem de preços na frente (à direita)
  const tx = W - 3, tz = LOT - 2.2;
  root.add(at(box(0.6, 6.4, 0.5, DARK), tx, G + 3.2, tz - 0.3));                          // suporte ATRÁS da placa (não cobre o texto da frente)
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

  // frentista em pé na ilha da esquerda, entre as bombas: olha para quem chega e acena quando a van encosta
  const man = buildAttendant();
  const MX = GAS_ISLANDS[0], MZ = cz;
  man.position.set(MX, G + 0.3, MZ); man.rotation.y = Math.PI / 2;
  root.add(man);
  const ud = man.userData;
  let face = Math.PI / 2, look = 0, wave = 0, tt = 0, still = 0;
  const prevUpd = root.userData.updateCanopy;
  root.userData.updateCanopy = (lx, lz, dt) => {
    prevUpd(lx, lz, dt);
    tt += dt;
    const dx = lx - MX, dz = lz - MZ, d = Math.hypot(dx, dz);
    const near = d < 16, close = Math.abs(lz - cz) < 4 && Math.abs(lx - MX) < 7;
    still = close ? still + dt : 0;
    // de frente para a van quando ela está perto; senão olha a rua e as bombas, devagar
    const want = near ? Math.atan2(dx, dz) : Math.PI / 2 + Math.sin(tt * 0.23) * 0.9;
    let dd = want - face; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
    face += dd * Math.min(1, dt * (near ? 3 : 0.8));
    man.rotation.y = face;
    look += ((near ? 0 : Math.sin(tt * 0.6) * 0.35) - look) * Math.min(1, dt * 3);
    ud.head.rotation.y = look; ud.head.rotation.x = Math.sin(tt * 0.9) * 0.04;
    wave += ((still > 0.4 && still < 3.4 ? 1 : 0) - wave) * Math.min(1, dt * 5);          // a van parou junto às bombas: um aceno
    ud.armR.rotation.z = wave * 2.5 + (1 - wave) * 0.07; ud.armR.rotation.x = wave * Math.sin(tt * 9) * 0.35;
    ud.armL.rotation.z = -0.07 - Math.sin(tt * 1.1) * 0.03;
    man.position.y = G + 0.3 + Math.abs(Math.sin(tt * 0.8)) * 0.01;
  };

  const plain = mergePlain(root);                                  // detalhes de muitas cores (mercadoria, bombas, marcas): 1 desenho
  if (plain) root.add(plain);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  return root;
}
