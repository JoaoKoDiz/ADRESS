// Prédio futurista (Bairro 8): torre em andares recuados (podium + 3 blocos), vidro escuro, faixas de neon e uma "coroa" no topo.
// Variam: cor do neon (fut.glow: cyan/magenta/lime/amber) e a coroa (fut.crown: spire/ring/dish/orb); o tom do corpo (branco/grafite)
// é só enfeite. Mesma pegada e fachada (z = 8.5) do prédio residencial, para encaixar nos lotes. Coordenadas locais do lote.
import * as THREE from 'three';
import { mat, box, cyl, sphere, torus, at, bakeStatic } from './kit.js';
import { LOT, WALK, LOT_ANCHORS as A } from '../layout.js';
import { GLOW_COL } from '../data.js';

const G = 0.12, WALK_TOP = 0.17;
const X0 = 3.4, X1 = 13.8, Z0 = 1.2, Z1 = A.house.z1;
const CX = (X0 + X1) / 2, CZ = (Z0 + Z1) / 2, W = X1 - X0, D = Z1 - Z0;
const P = 3.4, H1 = 12, H3 = 5;                                   // podium, 1º bloco e 3º bloco; o 2º varia de prédio para prédio
const T1 = { w: W - 1.4, d: D - 1.0 }, T2 = { w: W - 3.4, d: D - 2.2 }, T3 = { w: W - 5.2, d: D - 3.4 };
const h2 = f => 7 + ((f.index - 70) % 3) * 2;
const CONCRETE = '#c4c0b8', GLASS = '#173447';

/** Topo do prédio (laje do último bloco), para a seta da dica e para pousar de helicóptero. */
export const futTopY = f => G + P + H1 + h2(f) + H3 + 0.25;
/** Altura do chão no ponto local (lx, lz) do lote: o topo do último bloco; sobre o resto do prédio, um pouco acima do limite de colisão do helicóptero. */
export function futRoofHeight(f, lx, lz) {
  return Math.abs(lx - CX) < T3.w / 2 && Math.abs(lz - CZ) < T3.d / 2 ? futTopY(f) : 6.6;
}

export function buildFutLot(fut) {
  const root = new THREE.Group();
  root.name = 'fut:' + fut.name;
  const gc = GLOW_COL[fut.glow];
  const glow = mat(gc, { emissive: gc, emissiveIntensity: 1.3 });
  const glass = mat(GLASS, { metalness: 0.35, roughness: 0.25, emissive: '#0b2a3a', emissiveIntensity: 0.6 });
  const body = fut.tone ? '#38414d' : '#e9eef2', trim = fut.tone ? '#252b34' : '#c3ccd4';
  const A2 = h2(fut);

  // chão: calçamento, grama, calçada e muro baixo com portão (como o prédio residencial)
  root.add(at(box(LOT, 0.14, LOT, CONCRETE), LOT / 2, G - 0.07, LOT / 2));
  root.add(at(box(LOT - 1, 0.16, 2.2, '#86b35a'), LOT / 2, G - 0.05, 10.2));
  const h = WALK_TOP + 0.02, y = WALK_TOP - h / 2, full = LOT + 2 * WALK;
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, -WALK / 2));
  root.add(at(box(full, h, WALK, '#d4cdbb'), LOT / 2, y, LOT + WALK / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), -WALK / 2, y, LOT / 2));
  root.add(at(box(WALK, h, LOT, '#d4cdbb'), LOT + WALK / 2, y, LOT / 2));
  root.add(at(box(1.6, 0.06, LOT - Z1, '#d9d3c6'), A.doorX, G + 0.02, (Z1 + LOT) / 2));
  for (const [x0, x1] of [[0.3, A.gate.x0], [A.gate.x1, LOT - 0.3]]) root.add(at(box(x1 - x0, 0.8, 0.3, '#8d9097'), (x0 + x1) / 2, G + 0.4, LOT - 0.35));
  for (const dx of [-1.2, 1.2]) {                                                  // balizas de neon ao longo do caminho
    root.add(at(cyl(0.12, 0.14, 0.9, trim, 8), A.doorX + dx, G + 0.45, Z1 + 2.6));
    root.add(at(sphere(0.2, gc, 8, 6, { emissive: gc, emissiveIntensity: 1.3 }), A.doorX + dx, G + 1.0, Z1 + 2.6));
  }

  // blocos: podium escuro (vidro) + 3 blocos recuados; faixas de janelas e linhas de neon
  const tiers = [
    { w: W, d: D, y0: G, h: P, c: GLASS },
    { ...T1, y0: G + P, h: H1, c: body },
    { ...T2, y0: G + P + H1, h: A2, c: body },
    { ...T3, y0: G + P + H1 + A2, h: H3, c: body },
  ];
  tiers.forEach((t, i) => {
    root.add(at(box(t.w, t.h, t.d, t.c), CX, t.y0 + t.h / 2, CZ));
    root.add(at(box(t.w + 0.3, 0.3, t.d + 0.3, trim), CX, t.y0 + t.h + 0.15, CZ));                // borda/laje do bloco
    root.add(at(box(t.w + 0.34, 0.12, t.d + 0.34, glow), CX, t.y0 + t.h + 0.34, CZ));             // fio de neon na borda
    if (i === 0) return;
    for (let yy = t.y0 + 1.2; yy < t.y0 + t.h - 0.8; yy += 2.4) {                                 // janelas em faixa (frente e laterais)
      root.add(at(box(t.w - 0.6, 1.0, 0.1, glass), CX, yy, CZ + t.d / 2 + 0.03));
      for (const s of [-1, 1]) root.add(at(box(0.1, 1.0, t.d - 0.6, glass), CX + s * (t.w / 2 + 0.03), yy, CZ));
    }
    for (const s of [-1, 1]) root.add(at(box(0.16, t.h - 0.4, 0.1, glow), CX + s * (t.w / 2 - 0.45), t.y0 + t.h / 2, CZ + t.d / 2 + 0.06));   // linhas verticais de neon
  });

  // térreo: entrada de vidro com marquise fina e neon
  root.add(at(box(2.6, 2.6, 0.12, glass), A.doorX, G + 1.3, Z1 + 0.06));
  root.add(at(box(4.2, 0.18, 1.8, trim), A.doorX, G + 2.9, Z1 + 0.9));
  root.add(at(box(4.2, 0.1, 0.1, glow), A.doorX, G + 2.82, Z1 + 1.8));
  for (const x of [X0 + 1.4, X1 - 1.4]) root.add(at(box(2.0, 1.8, 0.1, glass), x, G + 1.7, Z1 + 0.05));

  // coroa no topo do último bloco
  const top = futTopY(fut);
  const gm = (c = gc) => ({ emissive: c, emissiveIntensity: 1.3 });
  if (fut.crown === 'spire') {                                                     // antena luminosa
    root.add(at(cyl(0.5, 0.7, 0.8, trim, 8), CX, top + 0.4, CZ));
    root.add(at(cyl(0.1, 0.18, 7, '#cfd6dd', 6), CX, top + 4.3, CZ));
    root.add(at(sphere(0.3, gc, 8, 6, gm()), CX, top + 7.9, CZ));
    for (const k of [3, 5]) root.add(at(torus(0.55, 0.05, gc, 6, 14, gm()), CX, top + k, CZ, Math.PI / 2, 0, 0));
  } else if (fut.crown === 'ring') {                                               // anéis flutuando
    root.add(at(cyl(0.22, 0.3, 5.2, '#cfd6dd', 8), CX, top + 2.6, CZ));
    root.add(at(torus(2.5, 0.14, gc, 6, 28, gm()), CX, top + 5.2, CZ, Math.PI / 2, 0, 0));
    root.add(at(torus(1.8, 0.12, gc, 6, 24, gm()), CX, top + 6.4, CZ, Math.PI / 2, 0, 0));
  } else if (fut.crown === 'dish') {                                               // domo de vidro
    root.add(at(cyl(1.7, 2.0, 0.8, trim, 12), CX, top + 0.4, CZ));
    const dome = sphere(1.7, '#8fe0ff', 14, 8, { transparent: true, opacity: 0.5, metalness: 0.2, roughness: 0.1 });
    dome.scale.set(1, 0.85, 1); dome.position.set(CX, top + 0.8, CZ);
    root.add(dome);
    root.add(at(sphere(0.55, gc, 8, 6, gm()), CX, top + 1.4, CZ));
  } else {                                                                         // esfera brilhante
    root.add(at(cyl(0.2, 0.3, 4.2, '#cfd6dd', 8), CX, top + 2.1, CZ));
    root.add(at(sphere(1.05, gc, 12, 8, gm()), CX, top + 4.9, CZ));
    root.add(at(torus(1.6, 0.07, gc, 6, 24, gm()), CX, top + 4.9, CZ, Math.PI / 2.6, 0, 0));
  }

  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(root);
  root.userData.update = () => {};
  return root;
}
