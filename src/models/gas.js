// Posto de gasolina (Bairros 4 e 5): ocupa 2 lotes vizinhos da mesma linha (1×2), incluindo a rua entre eles.
// A van entra nele (os obstáculos estão em GAS_PARTS, layout.js) e abastece embaixo da cobertura.
// Coordenadas locais: origem no canto noroeste do lote da esquerda; frente para o sul (+Z), como as casas.
import * as THREE from 'three';
import { mat, box, cyl, sphere, cone, at, dynamic, bakeStatic, textTexture, mergePlain } from './kit.js';
import { buildFigure, figureItem, animatePerson, reach } from './resident.js';
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

/** Frentista no estilo dos moradores (buildFigure): macacão vermelho com faixas refletivas, crachá, boné do posto e a
 *  flanela no bolso de trás. Animado em updateCanopy: limpa as bombas sem pressa, olha o movimento; com a van perto, vira
 *  para ela; quando ela para junto às bombas, acena. */
function buildAttendant() {
  const P = buildFigure({ k: 3, skin: '#d9a07a', hair: '#2a1f18', top: '#d8312a', suit: true, stripes: true, tag: '#f4f1ea', shoes: '#2a2522', boots: true,
    hat: 'cap', hatColor: '#d8312a', capLogo: '#ffffff', mustache: '#2a1f18', brows: '#2a1f18' });
  const rag = figureItem('rag', { color: '#3d6fb5' });
  return { P, rag };
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
  posto.position.set(cx, G + 4.6, cz + cd / 2 + 0.1);                                   // (4 cm à frente da faixa vermelha)
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
    for (const ez of [-1, 1]) for (let k = 0; k < 2; k++) root.add(at(box(1.46, 0.34, k ? 0.34 : 0.36, k ? '#2a2a2a' : '#f2c23a'), ix, G + 0.15, cz + ez * (2.65 - k * 0.35)));   // pontas listradas (2 cm acima, dos lados e na ponta da ilha)
    for (const pz of [cz - 1.6, cz + 1.6]) {
      root.add(at(box(0.9, 1.7, 0.7, RED), ix, G + 1.15, pz));
      root.add(at(box(0.74, 0.45, 0.76, WHITE), ix, G + 1.6, pz));                         // faixa branca (saltada da caixa vermelha)
      root.add(at(box(0.45, 0.25, 0.8, '#2b4a6e'), ix, G + 1.6, pz));                     // visor (saltado da faixa)
      for (const sx of [-1, 1]) root.add(at(box(0.04, 0.16, 0.36, lcd), ix + sx * 0.465, G + 1.62, pz));   // números acesos nos dois lados (antes ficavam dentro da caixa)
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
    root.add(at(box(0.35, 0.02, 1.8, '#f4f1ea'), x, G + 0.066, 16.0));
    root.add(at(cyl(0.62, 0.62, 0.02, '#f4f1ea', 3), x, G + 0.066, 14.75, 0, Math.PI, 0));   // ponta (triângulo) para o norte
  }
  for (const [x, z, s] of [[GAS_ISLANDS[0] + 1.6, cz - 1.0, 1.1], [GAS_ISLANDS[1] - 1.7, cz + 1.4, 0.9], [GAS_ISLANDS[1] + 1.5, cz - 0.4, 1.0]]) {
    const m = at(cyl(0.45, 0.45, 0.02, '#b3ada1', 10), x, G + 0.04, z); m.scale.set(s * 1.3, 1, s); root.add(m);
  }

  // lojinha de conveniência nos fundos (à esquerda). Fachada em camadas com profundidade de verdade (nada encostado na
  // mesma superfície): parede (z 6,30) → fundo aceso da vitrine (6,30–6,33) → prateleiras e mercadoria, geladeira e
  // garrafas (até 6,46) → vidro (6,485) → moldura (6,30–6,50). Porta de vidro recuada no batente; placas sempre 4 cm à
  // frente do que as segura. A colisão (GAS_PARTS) continua a mesma.
  root.add(at(box(11, 3.0, 5.4, WHITE), 7.5, G + 1.5, 3.6));             // paredes até 3,0 (frente em z 6,30)
  root.add(at(box(11.2, 0.5, 5.6, '#3c9d55'), 7.5, G + 3.25, 3.6));        // teto por cima (3,0–3,5): não atravessa a parede
  root.add(at(box(11.12, 0.3, 5.52, '#d9d4c8'), 7.5, G + 0.15, 3.6));      // rodapé (6 cm para fora da parede)
  const FZ = 6.3, FRAME = '#e9e4da';
  const LIT = mat('#f3e7cc', { emissive: '#5a4628', emissiveIntensity: 0.55 });
  root.add(at(box(6.3, 1.9, 0.03, LIT), 6.4, G + 1.27, FZ + 0.015));       // fundo aceso da vitrine (x 3,25–9,55)
  for (const y of [G + 0.78, G + 1.38]) {                                  // prateleiras com salgadinhos e bebidas (lado esquerdo)
    root.add(at(box(3.6, 0.05, 0.1, '#cbb894'), 5.15, y, FZ + 0.08));
    for (let k = 0; k < 8; k++) root.add(at(box(0.3, 0.3, 0.08, ['#e8402a', '#f2c23a', '#3a8ad8', '#5ab86a', '#ff8a1a', '#a86ad8'][(k + Math.round(y * 4)) % 6]), 3.6 + k * 0.44, y + 0.18, FZ + 0.08));
  }
  root.add(at(box(2.2, 1.75, 0.06, '#dfe9ef'), 8.3, G + 1.24, FZ + 0.06));  // geladeira de bebidas (lado direito)
  for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) root.add(at(cyl(0.045, 0.045, 0.3, ['#3a8a3a', '#d8312a', '#f2c23a'][r], 6), 7.5 + k * 0.32, G + 0.62 + r * 0.5, FZ + 0.13));
  for (const y of [G + 0.27, G + 2.27]) root.add(at(box(6.5, 0.14, 0.2, FRAME), 6.4, y, FZ + 0.1));   // moldura: base e topo
  for (const x of [3.19, 7.0, 9.61]) root.add(at(box(0.12, 2.14, 0.2, FRAME), x, G + 1.27, FZ + 0.1));   // laterais e o montante entre prateleira e geladeira
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 1.86), new THREE.MeshStandardMaterial({ color: '#cfe6f2', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }));
  glass.position.set(6.4, G + 1.27, FZ + 0.185); glass.renderOrder = 2; root.add(dynamic(glass));   // vidro da vitrine (na frente de tudo, dentro da moldura)
  // porta de vidro recuada no batente, com barra de empurrar e chapa embaixo
  for (const x of [10.14, 11.66]) root.add(at(box(0.1, 2.46, 0.16, FRAME), x, G + 1.23, FZ + 0.08));
  root.add(at(box(1.62, 0.12, 0.16, FRAME), 10.9, G + 2.4, FZ + 0.08));
  root.add(at(box(1.42, 2.04, 0.06, '#5a7fa3'), 10.9, G + 1.32, FZ + 0.04));
  root.add(at(box(1.42, 0.34, 0.08, '#c9ced6'), 10.9, G + 0.17, FZ + 0.07));   // chapa embaixo (à frente e acima do rodapé)
  root.add(at(box(0.06, 0.62, 0.05, '#c9ced6'), 11.42, G + 1.2, FZ + 0.115));  // puxador
  root.add(at(box(1.5, 0.36, 0.06, '#2e3036'), 10.9, G + 2.68, FZ + 0.03));    // placa "ABERTO 24H" sobre a porta
  const aberto = textMesh('ABERTO 24H', 1.36, 0.28, '#fbf7ee', '#c8312a', 46);
  aberto.position.set(10.9, G + 2.68, FZ + 0.1); root.add(aberto);
  const promo = textMesh('CAFÉ R$ 3', 0.95, 0.62, '#ffd23a', '#3a2a1a', 64);   // cartaz na parede, à esquerda da vitrine
  promo.position.set(2.6, G + 1.5, FZ + 0.04); root.add(promo);
  root.add(at(box(0.5, 0.18, 0.3, '#fff1bf', { emissive: '#ffe9a0', emissiveIntensity: 0.6 }), 12.35, G + 2.5, 6.42));   // luminária ao lado da porta
  const loja = textMesh('CONVENIÊNCIA', 6, 0.55, '#3c9d55', '#ffffff', 56);
  loja.position.set(7.5, G + 3.25, 6.45);                                 // (4 cm à frente da faixa do teto, que acaba em 6,40)
  root.add(loja);

  // totem de preços na frente (à direita)
  const tx = W - 3, tz = LOT - 2.2;
  root.add(at(box(0.6, 6.4, 0.5, DARK), tx, G + 3.2, tz - 0.3));                          // suporte ATRÁS da placa (não cobre o texto da frente)
  root.add(at(box(3.0, 3.6, 0.4, RED), tx, G + 5.4, tz));
  const precos = textMesh('GASOLINA  5,99', 2.6, 0.6, '#1d1d1f', '#ffd23a', 60);
  precos.position.set(tx, G + 5.0, tz + 0.24);
  root.add(precos);
  const precos2 = textMesh('ETANOL  3,99', 2.6, 0.6, '#1d1d1f', '#7ee08a', 60);
  precos2.position.set(tx, G + 4.2, tz + 0.24);
  root.add(precos2);
  const marca = textMesh('ADRESS', 2.6, 0.8, RED, '#ffffff', 90);
  marca.position.set(tx, G + 6.6, tz + 0.24);                                            // (placas 4 cm à frente do totem)
  root.add(marca);

  // calibrador e lixeira
  root.add(at(box(0.5, 1.2, 0.5, '#3a78d4'), W - 6, G + 0.6, 4));
  root.add(at(cyl(0.35, 0.3, 0.9, '#3c9d55', 10), 14.5, G + 0.45, 7));
  root.add(at(sphere(0.12, '#ffd23a', 6, 4), W - 6, G + 1.3, 4));

  // frentista em pé na ilha da esquerda, entre as bombas: limpa as bombas sem pressa e olha o movimento; com a van perto,
  // vira para ela e olha; quando ela para junto às bombas, acena; depois espera, atento
  const { P: man, rag } = buildAttendant();
  const MX = GAS_ISLANDS[0], MZ = cz, MY = G + 0.3;
  man.root.position.set(MX, MY, MZ); dynamic(man.root);
  root.add(man.root);
  const S = { mode: 'idle', t: 0, ph: 0, amp: 0 };
  let face = Math.PI / 2, look = 0, tt = Math.random() * 9, still = 0, z = 0, task = 'stand', taskT = 4 + Math.random() * 4, goZ = 0, side = 1;
  man.give(rag, 'body'); rag.position.set(0.22, 0.6, -0.36); rag.rotation.set(0.2, 0, 0.1);   // flanela no bolso de trás
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  const prevUpd = root.userData.updateCanopy;
  root.userData.updateCanopy = (lx, lz, dt) => {
    prevUpd(lx, lz, dt);
    dt = Math.min(0.1, dt || 0); tt += dt; S.t = tt;
    const px = MX, pz = MZ + z, dx = lx - px, dz = lz - pz, d = Math.hypot(dx, dz);
    const near = d < 16, close = Math.abs(lz - cz) < 4 && Math.abs(lx - MX) < 7;
    still = close ? still + dt : 0;
    // tarefa: em pé, olhando a rua / limpando a bomba de um dos lados; a van perto interrompe e ele volta ao meio da ilha
    taskT -= dt;
    if (near) { if (task === 'wipe') { task = 'stand'; taskT = 6; } goZ = 0; }
    else if (taskT <= 0) {
      if (task === 'stand') { task = 'wipe'; side = Math.random() < 0.5 ? -1 : 1; goZ = side * 0.78; taskT = 5 + Math.random() * 3; }
      else { task = 'stand'; goZ = 0; taskT = 5 + Math.random() * 6; }
    }
    let mode = 'idle', want;
    const dzz = goZ - z;
    if (Math.abs(dzz) > 0.02) { const v = Math.min(Math.abs(dzz), 0.9 * dt) * Math.sign(dzz); z += v; mode = 'walk'; S.ph += Math.abs(v) * Math.PI / 0.42; want = dzz > 0 ? 0 : Math.PI; }
    else if (near) want = Math.atan2(dx, dz);
    else if (task === 'wipe') want = side > 0 ? 0 : Math.PI;
    else want = Math.PI / 2 + Math.sin(tt * 0.23) * 0.9;
    face += wrapA(want - face) * Math.min(1, dt * (near ? 3 : 2));
    man.root.position.set(MX, MY, MZ + z); man.root.rotation.y = face;
    const wiping = task === 'wipe' && mode === 'idle' && Math.abs(wrapA(want - face)) < 0.3;
    const wave = still > 0.4 && still < 3.4;                                         // a van parou junto às bombas: um aceno
    look += ((near ? THREE.MathUtils.clamp(wrapA(Math.atan2(dx, dz) - face), -1.2, 1.2) : wiping ? 0 : Math.sin(tt * 0.6) * 0.35) - look) * Math.min(1, dt * 3);
    S.mode = mode; S.amp = mode === 'walk' ? 0.6 : 0;
    animatePerson(man, { mode, ph: S.ph, amp: S.amp, t: tt, act: wave ? 'wave' : null, lookYaw: look, lookPitch: wiping ? 0.15 : 0, talk: wave && still < 2 ? 1 : 0 });
    // flanela: no bolso; limpando, na mão direita, esfregando a frente da bomba em círculos
    if (wiping) {
      if (rag.userData.where !== 'R') man.give(rag, 'R');
      const a = tt * 4.2;
      reach(man, 1, 0.12 + 0.13 * Math.cos(a), 1.06 + 0.1 * Math.sin(a), 0.44, 0.9, -0.5, -0.3);
      man.b.waist.rotation.x += 0.08; rag.rotation.set(Math.PI / 2, 0, 0);
    } else if (rag.userData.where !== 'body') { man.give(rag, 'body'); rag.position.set(0.22, 0.6, -0.36); rag.rotation.set(0.2, 0, 0.1); }
  };

  const plain = mergePlain(root);                                  // detalhes de muitas cores (mercadoria, bombas, marcas): 1 desenho
  if (plain) root.add(plain);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  glass.castShadow = false;
  bakeStatic(root);
  return root;
}
