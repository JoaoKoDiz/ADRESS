// Igreja (Bairro 1, Modo Livre, depois das duas conversas com o Seu Galdino): inspirada em Notre-Dame.
// Low-poly, cores sólidas, peças modulares (arcos ogivais extrudados, pilares, pináculos, figuras repetidas).
// Fachada virada para +Z local (z = 0), corpo encurtado para −Z. Unidades ≈ metros (a van tem 4,8).
// Materiais PRÓPRIOS (não usa o cache do kit): a revelação muda a opacidade só da igreja.
import * as THREE from 'three';

const COL = { stone: '#e8dcbe', stone2: '#d6c7a2', stone3: '#c7b690', dark: '#2a2622', wood: '#4a3322', roof: '#5d636c', roof2: '#4d525a' };

export function buildChurch() {
  const mats = {};
  // um pouco de brilho próprio: a fachada fica virada para o bairro (de costas para o sol) e não pode ficar apagada
  const M = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: COL[c] || c, roughness: 0.9, flatShading: true,
    emissive: COL[c] || c, emissiveIntensity: c === 'dark' ? 0 : 0.3 }));
  const root = new THREE.Group();
  root.name = 'church';
  const add = (geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent = root) => {
    const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, c, x, y, z, rx, ry, rz) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz);   // y = centro
  const block = (x0, x1, y0, y1, z0, z1, c = 'stone') => box(x1 - x0, y1 - y0, z1 - z0, c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const cone = (r, h, c, x, y, z, seg = 4, ry = Math.PI / 4) => add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 0, ry, 0);

  // ---- arco ogival (pointed arch): contorno com base em y = 0, laterais até `spring`, ponta acima ----
  function arch(w, spring, f = 0.75, n = 6) {
    const pts = [[-w / 2, 0], [-w / 2, spring]];
    for (let i = 1; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([w / 2 + w * Math.cos(t), spring + w * Math.sin(t) * f]); }
    for (let i = n - 1; i >= 0; i--) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([-(w / 2 + w * Math.cos(t)), spring + w * Math.sin(t) * f]); }
    pts.push([w / 2, 0]);
    return pts;
  }
  const shapeOf = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s; };
  const pathOf = pts => { const p = new THREE.Path(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); return p; };
  /** Moldura em arco (U): por fora largura wo, por dentro wi; contorno único, sem furos. */
  function archRing(wo, wi, spring, f = 0.8) {
    const o = arch(wo, spring, f).slice(1, -1), i = arch(wi, spring, f).slice(1, -1).reverse();
    return shapeOf([[-wo / 2, 0], ...o, [wo / 2, 0], [wi / 2, 0], ...i, [-wi / 2, 0]]);
  }
  const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  /** Abertura ogival escura (recuada) com moldura de pedra: base em (x, y), face em z. */
  function lancet(x, y, z, w, spring, c = 'dark', frame = 0.35, f = 0.75) {
    add(extrude(shapeOf(arch(w, spring, f)), 0.12), c, x, y, z);
    const ring = shapeOf(arch(w + frame * 2, spring + 0.01, f)); ring.holes.push(pathOf(arch(w, spring, f).map(([a, b]) => [a, b + 0.002])));
    add(extrude(ring, 0.45), 'stone2', x, y - 0.01, z);
  }
  /** Arcada aberta: painel de pedra com furo ogival (o vão fica realmente aberto). */
  function archPanel(x, y, z, W, H, w, spring, depth, c = 'stone') {
    const n = 6, pts = [[-W / 2, 0]];
    for (let i = 1; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([w / 2 + w * Math.cos(t), w * Math.sin(t) * 0.75]); }
    for (let i = n - 1; i >= 1; i--) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([-(w / 2 + w * Math.cos(t)), w * Math.sin(t) * 0.75]); }
    pts.push([W / 2, 0], [W / 2, H], [-W / 2, H]);
    add(extrude(shapeOf(pts), depth), c, x, y, z - depth);
  }
  /** Pináculo: base quadrada + agulha. */
  function pinnacle(x, y, z, s = 1, c = 'stone2') { box(0.9 * s, 1.4 * s, 0.9 * s, c, x, y + 0.7 * s, z); cone(0.75 * s, 2.6 * s, c, x, y + 1.4 * s, z); }
  /** Balaustrada: corrimão + postes. */
  function balustrade(x0, x1, y, z, h = 1.0, d = 0.5) {
    box(x1 - x0, 0.25, d, 'stone2', (x0 + x1) / 2, y + h, z);
    box(x1 - x0, 0.2, d, 'stone2', (x0 + x1) / 2, y + 0.1, z);
    for (let x = x0 + 0.3; x <= x1 - 0.2; x += 0.6) box(0.18, h - 0.2, 0.18, 'stone2', x, y + h / 2 + 0.05, z);
  }

  // ===== medidas da fachada (proporções da referência) =====
  const TW = 12, CW = 16, W = TW * 2 + CW;               // torres 12, centro 16 → 40 de largura
  const XL = -W / 2, XR = W / 2, XC0 = -CW / 2, XC1 = CW / 2;
  const DEPTH = 12;                                       // profundidade das torres
  const Y_PORT = 18, Y_KINGS = 23.5, Y_ROSE = 40, Y_GAL0 = 41.5, Y_GAL1 = 56, Y_TOP = 70;

  // ---- massa principal (até o piso do corredor) e as duas torres ----
  const PORTALS = [[0, 8.5, 9.5], [-14, 6.8, 8.5], [14, 6.8, 8.5]];
  block(XL, XR, 0, Y_PORT, -DEPTH, -1.7);                                  // térreo (atrás dos portais)
  { const s = new THREE.Shape(); s.moveTo(XL, 0); s.lineTo(XR, 0); s.lineTo(XR, Y_PORT); s.lineTo(XL, Y_PORT); s.lineTo(XL, 0);
    for (const [x, w, sp] of PORTALS) s.holes.push(pathOf(arch(w + 2.4, sp, 0.8).map(([a, b]) => [a + x, Math.max(0.02, b)])));
    add(extrude(s, 1.7), 'stone', 0, 0, -1.7); }                         // parede da frente com os vãos dos portais
  block(XL, XR, Y_PORT, Y_GAL0, -DEPTH, 0);
  for (const [x0, x1] of [[XL, XC0], [XC1, XR]]) block(x0, x1, Y_GAL0, Y_TOP, -DEPTH, 0);

  // ---- contrafortes / pilares verticais da fachada ----
  for (const x of [XL + 0.6, XC0 - 0.6, XC1 + 0.6, XR - 0.6]) {
    block(x - 1.0, x + 1.0, 0, Y_GAL1, 0, 1.3, 'stone2');
    block(x - 0.75, x + 0.75, Y_GAL1, Y_TOP - 1, 0, 0.9, 'stone2');
  }
  // ---- faixas horizontais ----
  for (const [y, h] of [[Y_PORT, 0.7], [Y_KINGS + 0.4, 0.6]]) block(XL - 0.2, XR + 0.2, y, y + h, 0, 1.0, 'stone2');
  for (const [x0, x1] of [[XL - 0.2, XC0], [XC1, XR + 0.2]]) for (const [y, h] of [[Y_GAL0 - 0.6, 0.6], [Y_GAL1, 0.7], [Y_TOP - 1.5, 0.6]]) block(x0, x1, y, y + h, 0, 1.0, 'stone2');   // nas torres (o centro fica aberto)

  // ---- três portais profundos (molduras concêntricas, tímpano com relevos, portas de madeira) ----
  for (const [x, w, sp] of PORTALS) {
    for (let i = 0; i < 4; i++) {                          // arquivoltas, cada uma mais funda e menor
      const ww = w + 2.4 - i * 0.8, ring = archRing(ww, ww - 0.8, sp);
      const d = i === 3 ? 1.4 : 0.6;                       // a última arquivolta forra o fundo do vão até o tímpano
      add(extrude(ring, d), i % 2 ? 'stone' : 'stone2', x, 0, 1.1 - i * 0.6 + 0.6 - d);
    }
    const inner = w - 0.8, back = -1.4;
    add(extrude(shapeOf(arch(inner, sp, 0.8)), 0.3), 'stone3', x, 0, back - 0.3);           // fundo do portal (tímpano)
    block(x - inner / 2, x + inner / 2, 0, sp - 0.4, back - 0.05, back + 0.25, 'wood');          // portas de madeira escura
    box(0.25, sp - 0.4, 0.4, 'stone2', x, (sp - 0.4) / 2, back + 0.25);                         // pilar central entre as portas
    for (let k = 0; k < 2; k++)                                                                 // relevos do tímpano (fileiras de figurinhas)
      for (let j = 0; j < 5 - k; j++) box(0.55, 0.9, 0.35, 'stone2', x + (j - (4 - k) / 2) * (inner / 6), sp + 0.7 + k * 1.3, back + 0.2);
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) box(0.55, 2.4, 0.5, 'stone2', x + s * (inner / 2 + 0.55 + j * 0.45), 4.0, 0.9 - j * 0.6);   // estátuas nas laterais
  }

  // ---- galeria dos reis: faixa de figuras esculpidas acima das entradas ----
  block(XL, XR, Y_PORT + 0.7, Y_KINGS + 0.4, 0, 0.5, 'stone3');
  for (let i = 0; i < 28; i++) {
    const x = XL + 1.1 + i * ((W - 2.2) / 27);
    const nich = shapeOf(arch(1.1, 2.6, 0.7)); add(extrude(nich, 0.2), 'stone', x, Y_PORT + 1.0, 0.55);
    box(0.6, 2.2, 0.5, 'stone2', x, Y_PORT + 2.2, 0.9);
    box(0.42, 0.42, 0.42, 'stone2', x, Y_PORT + 3.5, 0.9);
  }

  // ---- rosácea central (fundo escuro, divisões radiais formando uma flor) ----
  const RY = 32.5, RR = 6.2;
  add(new THREE.CylinderGeometry(RR + 0.9, RR + 0.9, 0.8, 24), 'stone2', 0, RY, 0.2, Math.PI / 2);
  add(new THREE.CylinderGeometry(RR, RR, 0.3, 24), 'dark', 0, RY, 0.55, Math.PI / 2);
  add(new THREE.TorusGeometry(RR, 0.35, 4, 24), 'stone', 0, RY, 0.75);
  add(new THREE.TorusGeometry(RR * 0.45, 0.3, 4, 16), 'stone', 0, RY, 0.75);
  add(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 10), 'stone', 0, RY, 0.75, Math.PI / 2);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    box(0.28, RR * 2 - 0.4, 0.4, 'stone', 0, RY, 0.75, 0, 0, a / 2 + (i < 6 ? 0 : 0));
    add(new THREE.TorusGeometry(RR * 0.22, 0.16, 4, 10), 'stone', Math.cos(a) * RR * 0.72, RY + Math.sin(a) * RR * 0.72, 0.75);   // pétalas
  }
  // arco que emoldura a rosácea
  add(extrude(archRing(RR * 2 + 3.2, RR * 2 + 2.0, 6, 0.6), 0.6), 'stone2', 0, RY - 6.5, 0.1);

  // ---- janelas laterais em arco + pequenos círculos (nível da rosácea, nas torres) ----
  for (const tx of [(XL + XC0) / 2, (XC1 + XR) / 2]) {
    for (const s of [-1, 1]) lancet(tx + s * 2.5, 27, 0.5, 2.6, 7, 'dark', 0.4);
    for (const s of [-1, 1, 0]) {
      add(new THREE.TorusGeometry(0.85, 0.22, 4, 10), 'stone2', tx + s * 2.5, 38, 0.55);
      add(new THREE.CylinderGeometry(0.75, 0.75, 0.2, 10), 'dark', tx + s * 2.5, 38, 0.4, Math.PI / 2);
    }
  }
  balustrade(XL, XR, Y_ROSE, 0.9);                                      // balaustrada sob o corredor

  // ===== CORREDOR ABERTO (prioridade): 4 vãos entre as torres, piso contínuo, céu por cima e através =====
  const GD = 7;                                                          // profundidade do piso (espaço real atrás dos pilares)
  block(XC0, XC1, Y_GAL0 - 0.6, Y_GAL0, -GD, 1.0, 'stone2');            // piso contínuo
  const BAYS = 4, PILLAR = 0.9, bay = (CW - PILLAR * (BAYS + 1)) / BAYS, SPRING = 9.6, H_G = Y_GAL1 - Y_GAL0;
  for (const z of [0.6, -GD + 0.6]) {                                    // duas fileiras de arcadas (frente e fundo do corredor)
    for (let i = 0; i <= BAYS; i++) {
      const x = XC0 + PILLAR / 2 + i * (bay + PILLAR);
      box(PILLAR, H_G, 0.9, 'stone', x, Y_GAL0 + H_G / 2, z - 0.45);    // pilares de pedra
    }
    for (let i = 0; i < BAYS; i++) {
      const x = XC0 + PILLAR + bay / 2 + i * (bay + PILLAR);
      archPanel(x, Y_GAL0 + SPRING, z, bay + 0.02, H_G - SPRING, bay, 0, 0.9);   // arco ogival no alto de cada vão
    }
  }
  for (let i = 0; i < BAYS; i++) {                                       // pequena balaustrada na base de cada vão (frente)
    const x0 = XC0 + PILLAR + i * (bay + PILLAR);
    balustrade(x0, x0 + bay, Y_GAL0, 0.75, 1.0, 0.4);
  }
  block(XC0, XC1, Y_GAL1, Y_GAL1 + 0.8, 0.6 - 0.9, 0.6, 'stone2');      // cornija da frente (o alto fica a céu aberto)
  block(XC0, XC1, Y_GAL1, Y_GAL1 + 0.8, -GD - 0.3, -GD + 0.6, 'stone2'); // cornija de trás

  // ===== torres: duas aberturas altas e estreitas por face (interior escuro), pilares, molduras, pináculos, balaustrada =====
  for (const tx of [(XL + XC0) / 2, (XC1 + XR) / 2]) {
    const zc = -DEPTH / 2;
    // frente e lados
    for (const s of [-1, 1]) lancet(tx + s * 2.4, Y_GAL1 + 1.5, 0.1, 2.0, 9.5, 'dark', 0.45, 0.8);
    for (const side of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(tx + side * TW / 2, 0, zc); g.rotation.y = side * Math.PI / 2; root.add(g);
      for (const s of [-1, 1]) {
        const m = new THREE.Mesh(extrude(shapeOf(arch(2.0, 9.5, 0.8)), 0.12), M('dark')); m.position.set(s * 2.4, Y_GAL1 + 1.5, 0.02); g.add(m);
      }
    }
    // pináculos nos cantos do topo + balaustrada em volta
    for (const sx of [-1, 1]) for (const sz of [0, 1]) pinnacle(tx + sx * (TW / 2 - 0.6), Y_TOP, -sz * (DEPTH - 1.2) - 0.6, 1.1);
    balustrade(tx - TW / 2, tx + TW / 2, Y_TOP, 0.1, 1.2, 0.5);
    balustrade(tx - TW / 2, tx + TW / 2, Y_TOP, -DEPTH + 0.2, 1.2, 0.5);
    block(tx - TW / 2 - 0.3, tx + TW / 2 + 0.3, Y_TOP - 0.6, Y_TOP, -DEPTH - 0.3, 0.3, 'stone2');   // cornija do topo
  }

  // ===== corpo (encurtado): paredes, janelas góticas, contrafortes, telhado cinza-escuro, flecha =====
  const BX = 12, B0 = -DEPTH, B1 = -46, BH = 26;
  block(-BX, BX, 0, BH, B1, B0, 'stone');
  // telhado em duas águas
  { const s = new THREE.Shape(); s.moveTo(-BX - 1, 0); s.lineTo(BX + 1, 0); s.lineTo(0, 13); s.lineTo(-BX - 1, 0);
    const g = extrude(s, B0 - B1 + 1); add(g, 'roof', 0, BH, B1 - 0.5); }
  // ábside arredondada no fundo
  add(new THREE.CylinderGeometry(BX, BX, BH, 10, 1, false, Math.PI / 2, Math.PI), 'stone', 0, BH / 2, B1);
  add(new THREE.ConeGeometry(BX + 0.8, 11, 10, 1, false, Math.PI / 2, Math.PI), 'roof2', 0, BH + 5.5, B1);
  for (const side of [-1, 1]) {
    for (let k = 0; k < 5; k++) {
      const z = B0 - 4 - k * 6.4;
      const g = new THREE.Group(); g.position.set(side * BX, 0, z); g.rotation.y = side * Math.PI / 2; root.add(g);
      const m = new THREE.Mesh(extrude(shapeOf(arch(2.6, 11, 0.8)), 0.3), M('dark')); m.position.set(0, 9, 0.05); g.add(m);   // janela gótica alta
      // contraforte + arcobotante + pináculo
      block(side * (BX + 0.2) + (side > 0 ? 0 : -3.2), side * (BX + 0.2) + (side > 0 ? 3.2 : 0), 0, 18, z - 3.9, z - 2.5, 'stone2');
      box(0.7, 7.5, 1.0, 'stone2', side * (BX + 2.2), 21, z - 3.2, 0, 0, side * 0.9);
      pinnacle(side * (BX + 1.6), 18, z - 3.2, 0.9);
    }
  }
  // flecha fina e pontuda mais ao fundo (cruzeiro)
  const SZ = -30;
  box(3.2, 6, 3.2, 'roof2', 0, BH + 13 + 3, SZ);
  add(new THREE.CylinderGeometry(1.4, 1.8, 6, 8), 'roof2', 0, BH + 13 + 9, SZ);
  add(new THREE.ConeGeometry(1.4, 20, 8), 'roof2', 0, BH + 13 + 22, SZ);
  for (const s of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cone(0.5, 4, 'roof2', s[0] * 1.6, BH + 13 + 6, SZ + s[1] * 1.6);

  root.userData.materials = Object.values(mats);
  return root;
}

/** Opacidade de todos os materiais da igreja (0..1). Em 1 volta a ser opaca. */
export function setChurchOpacity(church, a) {
  for (const m of church.userData.materials) {
    const tr = a < 0.999;
    if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
    m.opacity = a; m.depthWrite = true;
  }
}
