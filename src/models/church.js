// Igreja (Bairro 1, Modo Livre, depois das duas conversas com o Seu Galdino): inspirada em Notre-Dame.
// Low-poly, cores sólidas, peças modulares (arcos extrudados, pilares, pináculos, figuras repetidas). No fim, tudo é
// fundido em 1 malha por material (poucas chamadas de desenho).
// Fachada virada para +Z local (z = 0), corpo encurtado para −Z. Unidades ≈ metros (a van tem 4,8).
// Proporção da referência: fachada 46 de largura × 68 de altura (torres).
// Materiais PRÓPRIOS (não usa o cache do kit): a revelação muda a opacidade só da igreja.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildPewReader } from './reader.js';

// pedra bege quente; recuos um pouco mais escuros que as partes salientes
const COL = { stone: '#e8dcbe', stone2: '#ddcfab', stone3: '#c9b994', shade: '#b3a37f', dark: '#2a2622', wood: '#4a3322', roof: '#5d636c', roof2: '#4d525a',
  // interior: mesma pedra bege, mas na penumbra (sem brilho próprio); a luz vem da porta e dos vitrais
  iStone: '#9c8063', iStone2: '#b0937a', iShade: '#6e5845', iFloor: '#7c6450', iLight: '#a08670', iRib: '#c2a689', pew: '#3a2417', carpet: '#6a1626',
  cloth: '#ece7da', cross: '#231c17', lead: '#1c1a18', gR: '#8e2a33', gB: '#2d4f8e', gG: '#b98a35', gV: '#3e6f4a', gP: '#5d4288' };
const GLASS = ['gR', 'gB', 'gG', 'gV', 'gP'];
const EMI = { dark: 0, shade: 0.18, cloth: 0.12, gR: 0.42, gB: 0.42, gG: 0.42, gV: 0.42, gP: 0.42 };   // brilho próprio (o resto da pedra de fora: 0,3)
const NI = 11.8;                                                     // meia-largura interna da igreja
/** Paredes e móveis (coordenadas locais da igreja: frente em z = 0, corpo para −z). main.js converte para o mundo. */
export const CHURCH_SOLIDS = (() => {
  const out = [], b = (x0, x1, z0, z1) => out.push({ x0, x1, z0, z1 }), m = (x0, x1, z0, z1) => { b(x0, x1, z0, z1); b(-x1, -x0, z0, z1); };
  m(4.5, 23.6, -3.2, 2.6);                                // fachada (a porta do meio fica livre: 9 de largura)
  m(NI, 23.6, -13, -3.2);                                  // base das torres
  m(NI, 16.8, -44, -13);                                   // paredes laterais com contrafortes
  b(-13, 13, -57, -44);                                    // parede do fundo + ábside
  for (const z of [-13, -19.2, -25.4, -31.6, -37.8]) m(5.9, 8.1, z - 1.1, z + 1.1);   // pilares
  m(1.35, 4.25, -36.0, -15.6);                             // bancos (o corredor e as passagens laterais ficam livres)
  m(4.25, 4.55, -7.5, -3.0);                               // folhas da porta abertas
  b(-2.1, 2.1, -42.6, -41.0);                              // altar
  return out;
})();
/** Caixas que seguram o braço da câmera (para não atravessar as paredes): [x0, x1, z0, z1, topo]. */
export const CHURCH_CAM = [[-23.6, 23.6, -3.2, 2.6, 70], [-23.6, -NI, -13, -3.2, 70], [NI, 23.6, -13, -3.2, 70],
  [-16.8, -NI, -44, -13, 26], [NI, 16.8, -44, -13, 26], [-13, 13, -57, -44, 30]];

export function buildChurch() {
  const mats = {};
  // um pouco de brilho próprio: a fachada fica virada para o bairro (de costas para o sol) e não pode ficar apagada
  const M = c => mats[c] || (mats[c] = new THREE.MeshStandardMaterial({ color: COL[c] || c, roughness: 0.9, flatShading: true,
    emissive: COL[c] || c, emissiveIntensity: c in EMI ? EMI[c] : c[0] === 'i' ? 0.06 : c === 'pew' || c === 'carpet' || c === 'cross' || c === 'lead' ? 0 : 0.3 }));
  const root = new THREE.Group();
  root.name = 'church';
  const add = (geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, parent = root) => {
    const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
  };
  const box = (w, h, d, c, x, y, z, parent = root) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, 0, 0, 0, parent);   // y = centro
  const block = (x0, x1, y0, y1, z0, z1, c = 'stone', parent = root) => box(Math.abs(x1 - x0), y1 - y0, z1 - z0, c, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent);
  const cyl = (r, h, c, x, y0, z, seg = 8, parent = root) => add(new THREE.CylinderGeometry(r, r, h, seg), c, x, y0 + h / 2, z, 0, 0, 0, parent);
  const cone = (r, h, c, x, y, z, seg = 4, parent = root) => add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 0, Math.PI / 4, 0, parent);
  const face = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); return g; };   // local +z = para fora

  // ---- contornos ----
  /** Arco ogival: base em y = 0, laterais até `spring`, ponta acima (altura da ponta = 0,866·w·f). */
  function arch(w, spring, f = 0.75, n = 6) {
    const pts = [[-w / 2, 0], [-w / 2, spring]];
    for (let i = 1; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([w / 2 + w * Math.cos(t), spring + w * Math.sin(t) * f]); }
    for (let i = n - 1; i >= 0; i--) { const t = Math.PI - (i / n) * Math.PI / 3; pts.push([-(w / 2 + w * Math.cos(t)), spring + w * Math.sin(t) * f]); }
    pts.push([w / 2, 0]);
    return pts;
  }
  /** Arco abatido (topo levemente curvo): base em y = 0, laterais até `spring`, sobe `rise` no meio. */
  function seg(w, spring, rise, n = 8) {
    const pts = [[-w / 2, 0]];
    for (let i = 0; i <= n; i++) { const t = Math.PI - (i / n) * Math.PI; pts.push([w / 2 * Math.cos(t), spring + rise * Math.sin(t)]); }
    pts.push([w / 2, 0]);
    return pts;
  }
  const shapeOf = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s; };
  const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });
  /** Moldura em U entre dois contornos (externo e interno, mesmo formato): contorno único, sem furos. */
  const ring = (outer, inner) => shapeOf([...outer, ...inner.slice().reverse()]);
  /** Painel acima de um vão: retângulo W×H com o topo do vão (curva `top`, de (−w/2,0) a (w/2,0)) recortado embaixo. */
  function topPanel(W, H, top) {
    const w = top[top.length - 1][0] * 2, pts = [];
    if (W > w + 1e-3) pts.push([-W / 2, 0]);
    pts.push(...top);
    if (W > w + 1e-3) pts.push([W / 2, 0]);
    pts.push([W / 2, H], [-W / 2, H]);
    return shapeOf(pts);
  }
  const archTop = (w, f) => arch(w, 0, f).slice(1, -1);
  const segTop = (w, rise) => seg(w, 0, rise).slice(1, -1);
  /** Peça extrudada: face da frente em z, profundidade para trás. */
  const piece = (shape, depth, c, x, y, z, parent = root) => add(extrude(shape, depth), c, x, y, z - depth, 0, 0, 0, parent);

  /** Janela ogival escura e recuada: placa escura no plano z, duas molduras em degrau e colunetas finas. */
  function lancet(x, y, z, w, sp, f = 0.8, parent = root, cols = true) {
    piece(shapeOf(arch(w, sp, f)), 0.1, 'dark', x, y, z + 0.1, parent);
    piece(ring(arch(w + 0.7, sp, f), arch(w, sp, f)), 0.5, 'stone2', x, y, z + 0.5, parent);
    piece(ring(arch(w + 1.5, sp, f), arch(w + 0.7, sp, f)), 0.9, 'stone', x, y, z + 0.9, parent);
    if (cols) for (const s of [-1, 1]) cyl(0.17, sp, 'stone2', x + s * (w / 2 + 1.0), y, z + 0.95, 6, parent);
  }
  /** Figura de pedra simples (corpo + cabeça), em pé a partir de y. */
  function figure(x, y, z, h = 2.3, r = 0.36, c = 'stone2', parent = root) {
    add(new THREE.CylinderGeometry(r * 0.8, r, h, 6), c, x, y + h / 2, z, 0, 0, 0, parent);
    add(new THREE.IcosahedronGeometry(r * 0.78, 0), c, x, y + h + r * 0.6, z, 0, 0, 0, parent);
  }
  function pinnacle(x, y, z, s = 1, c = 'stone2', parent = root) { box(0.9 * s, 1.4 * s, 0.9 * s, c, x, y + 0.7 * s, z, parent); cone(0.75 * s, 2.6 * s, c, x, y + 1.4 * s, z, 4, parent); }
  /** Balaustrada ao longo de x (de x0 a x1), centrada em z. */
  function balustrade(x0, x1, y, z, h = 1.0, d = 0.5, parent = root) {
    box(x1 - x0, 0.25, d, 'stone2', (x0 + x1) / 2, y + h, z, parent);
    box(x1 - x0, 0.2, d, 'stone2', (x0 + x1) / 2, y + 0.1, z, parent);
    const n = Math.max(1, Math.round((x1 - x0) / 0.6));
    for (let i = 0; i < n; i++) box(0.18, h - 0.2, 0.18, 'stone2', x0 + (i + 0.5) * (x1 - x0) / n, y + h / 2 + 0.05, z, parent);
  }

  // ===== medidas =====
  const W = 46, XH = W / 2, DEPTH = 13;
  const Y_PORT = 18, Y_K1 = 24, Y_G = 40, Y_G1 = 49.5, Y_T0 = Y_G1 + 1.2, Y_TOP = 68;
  const BUTT = [-21.7, -10, 10, 21.7], BW = 2.6;                       // contrafortes da fachada (alinhados com os pilares do corredor)
  const SECT = [[-20.4, -11.3], [-8.7, 8.7], [11.3, 20.4]];              // vãos livres entre contrafortes
  const SECX = s => (s[0] + s[1]) / 2;

  // ===== térreo: três portais largos e fundos =====
  const PD = 3.0;                                                      // profundidade dos portais
  for (const s of [-1, 1]) block(s * XH, s * NI, 0, Y_PORT, -DEPTH, -PD, 'stone');   // massa atrás (no meio fica o vestíbulo)
  const PORT = [[SECT[0], 7.6, 7.0], [SECT[1], 13, 8.2], [SECT[2], 7.6, 7.0]];   // [seção, largura externa, nascença]
  for (const [sec, wo, sp] of PORT) {
    const x = SECX(sec), f = 0.75;
    block(sec[0], x - wo / 2, 0, Y_PORT, -PD, 0);                      // paredes ao lado do portal
    block(x + wo / 2, sec[1], 0, Y_PORT, -PD, 0);
    piece(topPanel(wo, Y_PORT - sp, archTop(wo, f)), PD, 'stone', x, sp, 0);   // parede acima do arco
    piece(ring(arch(wo + 1.4, sp, f), arch(wo, sp, f)), 0.5, 'stone2', x, 0, 0.5);   // moldura saliente em volta
    // arquivoltas: 5 arcos encaixados, cada um mais fundo e mais estreito
    for (let i = 0; i < 5; i++) {
      const o = wo - i * 0.8, n = o - 0.8;
      piece(ring(arch(o, sp, f), arch(n, sp, f)), 0.6, i % 2 ? 'stone2' : 'stone3', x, 0, -i * 0.6);
      for (const s of [-1, 1]) {
        if (i >= 1 && i <= 3) figure(x + s * (o / 2 - 0.2), 0.9, -i * 0.6 + 0.3, 2.3, 0.3);   // estátuas nos batentes
        cyl(0.15, sp - 3.8, 'stone', x + s * (o / 2 - 0.2), 3.8, -i * 0.6 + 0.12, 6);           // colunetas acima delas
      }
    }
    const inner = wo - 4.0, back = -PD;
    piece(shapeOf(arch(inner, 0.5, f)), 0.3, 'shade', x, sp - 0.5, back + 0.4);                 // tímpano
    block(x - inner / 2, x + inner / 2, sp - 1.9, sp - 0.5, back + 0.1, back + 0.55, 'stone2');   // lintel
    for (let j = 0, n = Math.floor(inner / 0.9); j < n; j++) figure(x - inner / 2 + (j + 0.5) * inner / n, sp - 1.75, back + 0.6, 0.75, 0.2);
    // relevo do tímpano: figura central maior + duas fileiras de figurinhas
    figure(x, sp - 0.4, back + 0.45, 1.9, 0.42);
    for (const [yy, frac, h] of [[sp - 0.4, 0.86, 1.1], [sp + 1.6, 0.55, 0.9]]) {
      const n = Math.max(2, Math.floor(inner * frac / 0.8)), span = inner * frac;
      for (let j = 0; j < n; j++) { const xx = x - span / 2 + (j + 0.5) * span / n; if (Math.abs(xx - x) > 0.7) figure(xx, yy, back + 0.45, h, 0.22, 'stone'); }
    }
    if (sec === SECT[1]) {                                                                         // porta do meio ABERTA: folhas encostadas nas laterais, para dentro
      for (const s of [-1, 1]) {
        block(s * (inner / 2 - 0.25), s * inner / 2, 0, sp - 1.9, back - 4.5, back - 0.05, 'wood');
        for (const yy of [1.2, sp - 3.1]) block(s * (inner / 2 - 0.3), s * (inner / 2 - 0.25), yy - 0.09, yy + 0.09, back - 4.3, back - 0.3, 'dark');
      }
      continue;
    }
    block(x - inner / 2, x + inner / 2, 0, sp - 1.9, back, back + 0.15, 'wood');                  // portas de madeira
    block(x - 0.3, x + 0.3, 0, sp - 1.9, back, back + 0.5, 'stone2');                             // pilar central (tremó)
    for (const s of [-1, 1]) for (const yy of [1.2, (sp - 1.9) - 1.2]) block(x + s * inner / 4 - 0.6, x + s * inner / 4 + 0.6, yy - 0.08, yy + 0.08, back + 0.15, back + 0.22, 'dark');   // ferragens
  }
  // contrafortes: salientes, recuando em degraus a cada andar, com estátua num nicho no térreo
  for (const bx of BUTT) {
    block(bx - BW / 2, bx + BW / 2, 0, Y_PORT, -PD, 2.2, 'stone2');
    block(bx - BW / 2 - 0.15, bx + BW / 2 + 0.15, Y_PORT - 0.6, Y_PORT, -PD, 2.5, 'stone3');
    block(bx - BW / 2, bx + BW / 2, Y_PORT, Y_K1, -1.2, 1.6, 'stone2');
    block(bx - BW / 2 + 0.1, bx + BW / 2 - 0.1, Y_K1, Y_G - 1, -0.8, 1.2, 'stone2');
    piece(shapeOf(arch(1.5, 3.2, 0.7)), 0.4, 'shade', bx, 6.0, 2.25);                              // nicho
    figure(bx, 6.0, 2.3, 2.6, 0.36, 'stone');
  }

  // ===== galeria dos reis: figuras individuais em nichos =====
  block(-XH - 0.2, XH + 0.2, Y_PORT - 0.2, Y_PORT + 0.6, -DEPTH + 0.05, 1.3, 'stone2');        // cornija (dá a volta nas laterais)
  block(-XH + 1, XH - 1, Y_PORT + 0.6, Y_K1, -2.5, -1.2, 'shade');                            // fundo recuado (só a face da frente)
  block(-XH, XH, Y_PORT + 0.6, Y_K1, -DEPTH, -2.5, 'stone');
  for (const s of [-1, 1]) block(s * (XH - 1), s * XH, Y_PORT + 0.6, Y_K1, -2.5, -1.2, 'stone');
  for (const sec of SECT) {
    const wdt = sec[1] - sec[0], n = Math.round(wdt / 1.6), p = wdt / n, y0 = Y_PORT + 0.6, yA = Y_K1 - 1.5;
    for (let i = 0; i <= n; i++) cyl(0.16, yA - y0, 'stone2', sec[0] + i * p, y0, -0.3, 6);       // colunetas
    for (let i = 0; i < n; i++) {
      const cx = sec[0] + (i + 0.5) * p;
      piece(topPanel(p, Y_K1 - yA, archTop(p - 0.36, 0.7)), 1.2, 'stone', cx, yA, 0);              // arquinho do nicho
      figure(cx, y0 + 0.1, -0.65, 2.2, 0.34);                                                      // rei
      cyl(0.2, 0.2, 'stone3', cx, y0 + 0.1 + 2.2 + 0.5, -0.65, 5);                                 // coroa
    }
  }
  block(-XH - 0.2, XH + 0.2, Y_K1, Y_K1 + 0.6, -DEPTH + 0.05, 1.5, 'stone2');                   // cornija
  balustrade(-XH, XH, Y_K1 + 0.6, 1.0, 1.1, 0.45);

  // ===== nível da rosácea =====
  block(-XH, XH, Y_K1 + 0.6, Y_G - 1, -DEPTH, -0.8, 'stone');
  {
    const RB = Y_K1 + 0.6, SP = 6.6, RY = RB + SP, f = 0.6;
    piece(ring(arch(14.6, SP, f), arch(13.6, SP, f)), 0.9, 'stone2', 0, RB, 0.1);                 // arco que emoldura a rosácea
    add(new THREE.CylinderGeometry(5.2, 5.2, 0.2, 24), 'dark', 0, RY, -0.7, Math.PI / 2);
    add(new THREE.TorusGeometry(5.5, 0.4, 4, 24), 'stone2', 0, RY, -0.4);                        // aros em degrau (recuo)
    add(new THREE.TorusGeometry(6.05, 0.38, 4, 24), 'stone', 0, RY, 0.0);
    add(new THREE.TorusGeometry(5.2 * 0.48, 0.22, 4, 18), 'stone', 0, RY, -0.5);
    add(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 10), 'stone', 0, RY, -0.5, Math.PI / 2);
    for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.2, 10.2, 0.25), 'stone', 0, RY, -0.5, 0, 0, i * Math.PI / 8);   // 16 raios
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(new THREE.TorusGeometry(1.0, 0.13, 4, 10), 'stone', Math.cos(a) * 3.75, RY + Math.sin(a) * 3.75, -0.5); }
    // janelas em par nas laterais: arco grande envolvendo 2 lancetas + óculo
    for (const sec of [SECT[0], SECT[2]]) {
      const cx = SECX(sec);
      piece(ring(arch(8.4, 6.4, 0.7), arch(7.6, 6.4, 0.7)), 0.8, 'stone2', cx, RB, 0);
      for (const s of [-1, 1]) {
        piece(shapeOf(arch(2.4, 5, 0.8)), 0.1, 'dark', cx + s * 1.75, RB + 0.8, -0.7);
        piece(ring(arch(3.0, 5, 0.8), arch(2.4, 5, 0.8)), 0.45, 'stone2', cx + s * 1.75, RB + 0.8, -0.35);
      }
      cyl(0.2, 5, 'stone2', cx, RB + 0.8, -0.5, 6);
      add(new THREE.CylinderGeometry(0.85, 0.85, 0.2, 12), 'dark', cx, RB + 9.1, -0.7, Math.PI / 2);
      add(new THREE.TorusGeometry(0.95, 0.2, 4, 12), 'stone2', cx, RB + 9.1, -0.45);
      block(sec[0], sec[1], RB, RB + 0.8, -0.8, -0.1, 'stone2');                                     // peitoril
    }
  }

  // laterais da fachada: pilar no canto de trás e janelas recuadas (nada de parede lisa)
  for (const s of [-1, 1]) {
    block(s * (XH - 1.3), s * (XH + 0.4), 0, Y_G - 1, -DEPTH - 0.4, -DEPTH + 1.4, 'stone2');
    const g = face(s * XH, -DEPTH / 2 + 0.5, s * Math.PI / 2);
    lancet(0, 4.0, 0, 2.2, 6.5, 0.8, g, false);
    lancet(0, Y_K1 + 1.6, 0, 2.6, 6.5, 0.8, g, false);
    block(-DEPTH / 2 + 1.4, DEPTH / 2 - 1.0, Y_K1 + 0.6, Y_K1 + 1.0, 0, 0.5, 'stone2', g);
  }

  // ===== CORREDOR ABERTO (prioridade): 4 vãos largos em toda a largura, piso contínuo, fundo real =====
  const OPEN = [[-18.5, -11.5], [-8.5, -1.5], [1.5, 8.5], [11.5, 18.5]];    // vãos (7 de largura)
  const PIL = [[-XH, -18.5], [-11.5, -8.5], [-1.5, 1.5], [8.5, 11.5], [18.5, XH]];   // pilares de pedra
  const SPR = 6.4, RISE = 1.5;                                               // topo levemente curvo
  block(-XH - 0.2, XH + 0.2, Y_G - 1, Y_G, -DEPTH - 0.2, 1.6, 'stone2');     // piso contínuo (com borda na frente)
  for (const [zf, front] of [[0, true], [-DEPTH + 1.4, false]]) {           // arcada da frente e de trás (o céu aparece através)
    for (const [x0, x1] of PIL) block(x0, x1, Y_G, Y_G1, zf - 1.4, zf, 'stone');
    for (const [x0, x1] of OPEN) {
      const cx = (x0 + x1) / 2, w = x1 - x0;
      piece(topPanel(w, Y_G1 - Y_G - SPR, segTop(w, RISE)), 1.4, 'stone', cx, Y_G + SPR, zf);
      if (front) piece(ring(seg(w + 1.0, SPR, RISE + 0.35), seg(w, SPR, RISE)), 0.35, 'stone2', cx, Y_G, zf + 0.35);   // moldura do arco
    }
  }
  for (const [x0, x1] of PIL) {                                              // meias-colunas na frente dos pilares
    const cx = x0 === -XH ? x1 - 1.2 : x1 === XH ? x0 + 1.2 : (x0 + x1) / 2;
    cyl(0.45, SPR, 'stone2', cx, Y_G, 0.3, 8);
    box(1.4, 0.5, 1.1, 'stone2', cx, Y_G + SPR + 0.25, 0.3);
  }
  for (const s of [-1, 1]) {                                                 // laterais do corredor: um vão em cada
    const g = face(s * XH, -DEPTH / 2, s * Math.PI / 2), L = DEPTH - 2.8, w = 6.0;
    for (const sx of [-1, 1]) block(sx * w / 2, sx * L / 2, Y_G, Y_G1, -1.4, 0, 'stone', g);
    piece(topPanel(w, Y_G1 - Y_G - SPR, segTop(w, RISE)), 1.4, 'stone', 0, Y_G + SPR, 0, g);
  }
  balustrade(-XH + 0.3, XH - 0.3, Y_G, 1.0, 1.0, 0.4);                         // balaustrada baixa na frente
  block(-XH - 0.3, XH + 0.3, Y_G1, Y_G1 + 0.9, -1.6, 0.9, 'stone2');           // cornija da frente
  block(-XH - 0.3, XH + 0.3, Y_G1, Y_G1 + 0.9, -DEPTH - 0.6, -DEPTH + 1.6, 'stone2');   // cornija de trás
  const TX0 = 4.5;                                                           // as torres começam a 4,5 do centro: entre elas, céu aberto
  for (const s of [-1, 1]) block(s > 0 ? TX0 : -XH, s > 0 ? XH : -TX0, Y_G1, Y_T0, -DEPTH, 0, 'stone2');   // teto do corredor sob as torres

  // ===== torres (idênticas, espelhadas) =====
  const TW = XH - TX0;                                                       // 18,5
  for (const s of [-1, 1]) {
    const tx = s * (TX0 + TW / 2), x0 = tx - TW / 2, x1 = tx + TW / 2, yT = Y_TOP - 1.2;
    block(x0 + 0.8, x1 - 0.8, Y_T0, yT, -DEPTH + 0.8, -0.8, 'stone');        // núcleo (faces recuadas)
    for (const cx of [x0 + 0.9, x1 - 0.9]) for (const cz of [-0.9, -DEPTH + 0.9]) block(cx - 0.9, cx + 0.9, Y_T0, yT, cz - 0.9, cz + 0.9, 'stone2');   // pilares de canto
    // faces: frente, fundo, lado de fora, lado de dentro — cada uma com 2 aberturas altas emolduradas e um pilar no meio
    const faces = [[tx, -0.8, 0, TW / 2 - 0.8, 3.9, 3.0], [tx, -DEPTH + 0.8, Math.PI, TW / 2 - 0.8, 3.9, 3.0],
      [x1 - 0.8, -DEPTH / 2, Math.PI / 2, DEPTH / 2 - 0.8, 2.65, 2.4], [x0 + 0.8, -DEPTH / 2, -Math.PI / 2, DEPTH / 2 - 0.8, 2.65, 2.4]];
    for (const [fx, fz, ry, half, off, w] of faces) {
      const g = face(fx, fz, ry);
      for (const o of [-off, off]) lancet(o, Y_T0 + 0.9, 0, w, 9.8, 0.8, g, half > 6);
      block(-0.6, 0.6, Y_T0, yT, 0, 0.8, 'stone2', g);                                      // pilar do meio
      block(-half, half, Y_T0, Y_T0 + 0.7, 0, 0.6, 'stone2', g);                             // faixa da base
      block(-half, half, yT - 2.2, yT - 1.7, 0, 0.5, 'stone2', g);                           // friso abaixo da cornija
    }
    block(x0 - 0.3, x1 + 0.3, yT, yT + 0.8, -DEPTH - 0.3, 0.3, 'stone2');                   // cornija do topo
    const yb = yT + 0.8;
    balustrade(x0, x1, yb, 0.0, 1.2, 0.5); balustrade(x0, x1, yb, -DEPTH, 1.2, 0.5);
    for (const sx of [x0, x1]) { const g = face(sx, -DEPTH / 2, Math.PI / 2); balustrade(-DEPTH / 2, DEPTH / 2, yb, 0, 1.2, 0.5, g); }
    for (const cx of [x0 + 0.9, x1 - 0.9]) for (const cz of [-0.9, -DEPTH + 0.9]) pinnacle(cx, yb, cz, 1.0);
  }

  // ===== corpo (encurtado): paredes, contrafortes salientes até o beiral, janelas, telhado escuro, flecha =====
  const BX = 13, B0 = -DEPTH, B1 = -44, BH = 24;
  for (const s of [-1, 1]) block(s * BX, s * NI, 0, BH, B1, B0, 'stone');                 // paredes (o corpo é oco: ver INTERIOR)
  for (const s of [-1, 1]) block(s * (BX + 0.5), s * (NI + 0.1), BH - 0.7, BH, B1, B0, 'stone2');                                // beiral
  { const R = BX + 1, k = 11 / R, t = 1.2;                         // telhado oco (duas águas com espessura): por dentro fica a abóbada
    add(extrude(shapeOf([[-R, 0], [0, 11], [R, 0], [R - t, 0], [0, (R - t) * k], [-(R - t), 0]]), B0 - B1 + 1), 'roof', 0, BH, B1 - 0.5);
    piece(shapeOf([[-R, 0], [R, 0], [0, 11]]), 0.4, 'stone', 0, BH, -44.1); }   // empena do fundo (fechada)
  add(new THREE.CylinderGeometry(BX, BX, BH, 10, 1, false, Math.PI / 2, Math.PI), 'stone', 0, BH / 2, B1);   // ábside
  add(new THREE.ConeGeometry(BX + 0.8, 10, 10, 1, false, Math.PI / 2, Math.PI), 'roof2', 0, BH + 5, B1);
  for (const s of [-1, 1]) {
    const g = face(s * BX, 0, s * Math.PI / 2);                // local x = −z do mundo (lado +) / +z (lado −); local z = para fora
    for (let k = 0; k <= 5; k++) {
      const zz = -(B0 - k * 6.2);                               // distância a partir da frente
      const lx = s > 0 ? zz : -zz;
      block(lx - 0.8, lx + 0.8, 0, BH - 3, 0, 3.6, 'stone2', g);            // contraforte saliente
      block(lx - 0.6, lx + 0.6, BH - 3, BH + 1.6, 0, 2.2, 'stone2', g);     // sobe acima do beiral
      pinnacle(lx, BH + 1.6, 1.1, 0.95, 'stone2', g);
      if (k < 5) lancet(lx + (s > 0 ? 3.1 : -3.1), 6.5, 0, 2.6, 10, 0.8, g, false);   // janela gótica alta entre contrafortes
    }
  }
  // flecha no cruzeiro (fina e escura, mais baixa que as torres)
  const SZ = -30;
  box(3.4, 4, 3.4, 'roof2', 0, BH + 11 + 2, SZ);
  add(new THREE.CylinderGeometry(1.3, 1.7, 5, 8), 'roof2', 0, BH + 11 + 6.5, SZ);
  add(new THREE.ConeGeometry(1.3, 11, 8), 'roof2', 0, BH + 11 + 14.5, SZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cone(0.45, 3.5, 'roof2', sx * 1.6, BH + 11 + 4, SZ + sz * 1.6);

  // ===== INTERIOR: vestíbulo, nave alta com abóbada de nervuras, bancos, tapete, altar e vitrais =====
  {
    const PZ = [-13, -19.2, -25.4, -31.6, -37.8, -44];                   // linhas dos pilares (alinhadas com os contrafortes de fora)
    const PX = 7, YC = 10.3, YV = 19, F = 0.66;                          // pilares em x = ±7; capitel; nascença da abóbada
    const DOOR_H = 8.2 - 1.9;                                            // vão da porta do meio
    // revestimento interno (pedra na penumbra) sobre as faces de dentro
    block(-NI, NI, 0, 0.06, -44, -3, 'iFloor');
    block(-4.5, 4.5, 0.06, 0.07, -9, -3, 'iLight');                     // chão mais claro onde entra a luz da porta
    for (const s of [-1, 1]) {
      block(s * NI, s * (NI - 0.08), 0, 17.8, -44, -3.1, 'iStone');
      block(s * NI, s * 4.5, 0, 17.8, -3.1, -3.0, 'iStone');             // parede da entrada, dos lados da porta
      block(s * NI, s * (PX + 0.6), 15, 15.4, -44, -13, 'iShade');      // teto das naves laterais
      block(s * NI, s * (PX + 0.6), 15.4, 17.8, -13.1, -13, 'iStone');
    }
    block(-4.5, 4.5, DOOR_H, 17.8, -3.1, -3.0, 'iStone');
    block(-NI, NI, 17.7, 17.8, -13, -3, 'iShade');                       // teto do vestíbulo (sob a fachada)
    // parede da entrada vista de dentro, acima do vestíbulo: rosácea com vitral
    block(-PX - 0.6, PX + 0.6, 17.8, YV, -13.1, -13, 'iStone');
    piece(shapeOf(archTop(14.6, F)), 0.1, 'iStone', 0, YV, -13, root);
    const rose = (y, z, r, dir) => {
      add(new THREE.CylinderGeometry(r, r, 0.1, 20), 'lead', 0, y, z, Math.PI / 2);
      for (let i = 0; i < 12; i++) for (const [rr, sz] of [[r * 0.72, r * 0.28], [r * 0.36, r * 0.2]]) {
        const a = (i + (rr < r * 0.5 ? 0.5 : 0)) / 12 * Math.PI * 2;
        if (rr < r * 0.5 && i % 2) continue;
        box(sz, sz, 0.06, GLASS[i % GLASS.length], Math.cos(a) * rr, y + Math.sin(a) * rr, z + dir * 0.06);
      }
      add(new THREE.TorusGeometry(r, 0.22, 4, 20), 'iStone2', 0, y, z + dir * 0.1);
      cyl(0.35, 0.1, 'iStone2', 0, y - 0.05, z + dir * 0.09, 8);
    };
    rose(23.2, -13.15, 3.0, -1);
    // pilares compostos (núcleo + 4 colunas, base larga, capitel) e arcos ogivais repetidos ao longo da nave
    const pillar = (x, z) => {
      block(x - 1.2, x + 1.2, 0, 0.6, z - 1.2, z + 1.2, 'iShade');
      cyl(0.6, YC - 1.3, 'iStone', x, 0.6, z, 8);
      for (const [ox, oz] of [[0.72, 0], [-0.72, 0], [0, 0.72], [0, -0.72]]) cyl(0.28, YC - 1.3, 'iStone2', x + ox, 0.6, z + oz, 6);
      block(x - 1.1, x + 1.1, YC - 0.7, YC, z - 1.1, z + 1.1, 'iStone2');
      block(x - 1.25, x + 1.25, YC - 0.15, YC + 0.05, z - 1.25, z + 1.25, 'iStone');
    };
    for (const s of [-1, 1]) {
      const x = s * PX;
      PZ.forEach(z => pillar(x, z));
      for (let i = 0; i < PZ.length - 1; i++) {
        const zc = (PZ[i] + PZ[i + 1]) / 2, L = PZ[i] - PZ[i + 1];
        const g = face(x, zc, -s * Math.PI / 2);                         // local +z = para o meio da nave
        piece(topPanel(L, YV - YC, archTop(L - 2.2, 0.8)), 1.2, 'iStone', 0, YC, 0.6, g);   // arco ogival + parede alta (trifório)
        piece(ring(arch(L - 1.6, 0, 0.8).slice(1, -1), arch(L - 2.2, 0, 0.8).slice(1, -1)), 0.25, 'iStone2', 0, YC, 0.85, g);   // moldura do arco
        block(-L / 2, L / 2, 14.4, 14.75, 0.6, 1.0, 'iStone2', g);       // frisos
        block(-L / 2, L / 2, 18.4, 18.75, 0.6, 1.0, 'iStone2', g);
        for (const nx of [-1.8, 0, 1.8]) {                               // nichos com figurinhas
          piece(shapeOf(arch(0.9, 1.7, 0.7)), 0.1, 'iShade', nx, 15.4, 0.7, g);
          piece(ring(arch(1.3, 1.7, 0.7), arch(0.9, 1.7, 0.7)), 0.3, 'iStone2', nx, 15.2, 0.95, g);
          figure(nx, 15.45, 0.85, 1.25, 0.2, 'iStone2', g);
        }
        // vitral da nave lateral (na parede de fora, entre os contrafortes)
        const gw = face(s * (NI - 0.08), zc, -s * Math.PI / 2);
        stained(0, 3.4, 0, 1.6, 5.4, 0.8, gw);
      }
      for (const z of PZ) { const g = face(x, z, -s * Math.PI / 2); cyl(0.26, YV - YC, 'iStone2', 0, YC, 0.75, 8, g); }   // colunas que sobem até as nervuras
    }
    // abóbada alta: casca ogival + nervuras transversais, diagonais (em X) e cumeeira
    piece(ring(archTop(14.6, F), archTop(14, F)), 31, 'iShade', 0, YV, -13);
    const vy = x => 14 * F * Math.sqrt(Math.max(0, 1 - ((-Math.abs(x) - 7) / 14) ** 2));
    for (const z of PZ) piece(ring(archTop(14, F), archTop(13.1, F)), 0.5, 'iRib', 0, YV, z + 0.25);
    const beam = (a, b, t, c) => { const v = new THREE.Vector3().subVectors(b, a); const m = add(new THREE.BoxGeometry(t, t, v.length()), c); m.position.copy(a).addScaledVector(v, 0.5); m.lookAt(b); };
    for (let i = 0; i < PZ.length - 1; i++) {
      const za = PZ[i], zb = PZ[i + 1];
      for (const sx of [-1, 1]) {
        let prev = null;
        for (let k = 0; k <= 10; k++) {
          const t = k / 10, xx = sx * (-7 + 14 * t) * 0.97, p = new THREE.Vector3(xx, YV + vy(xx) - 0.2, za + (zb - za) * t);
          if (prev) beam(prev, p, 0.34, 'iRib');
          prev = p;
        }
      }
      cyl(0.45, 0.35, 'iRib', 0, YV + 8 - 0.55, (za + zb) / 2, 8);   // chave da abóbada
    }
    block(-0.16, 0.16, YV + 7.72, YV + 7.95, -44, -13, 'iRib');       // nervura da cumeeira
    // parede do fundo (atrás do altar), com janelas altas e estreitas de vitral
    block(-NI, NI, 0, YV, -44.6, -44, 'iStone');
    piece(shapeOf(archTop(14.6, F)), 0.6, 'iStone', 0, YV, -44);
    stained(0, 6.6, -44, 1.8, 8.4, 0.8, root, 1);
    for (const s of [-1, 1]) stained(s * 3.6, 7.4, -44, 1.3, 6.4, 0.8, root, 1);
    for (const s of [-1, 1]) stained(s * 8.6, 4.0, -44, 1.3, 6.4, 0.8, root, 1);
    rose(23.0, -43.95, 2.2, 1);
    // altar: plataforma com 3 degraus, mesa com toalha branca, cruz escura
    for (let k = 0; k < 3; k++) block(-6.2 + k * 0.5, 6.2 - k * 0.5, k * 0.22, (k + 1) * 0.22, -44, -38.6 - k * 0.9, k % 2 ? 'iStone' : 'iStone2');
    block(-1.9, 1.9, 0.66, 1.66, -42.4, -41.2, 'iStone2');
    block(-2.0, 2.0, 1.66, 1.74, -42.5, -41.1, 'cloth');
    block(-2.0, 2.0, 1.2, 1.74, -41.1, -41.04, 'cloth');
    for (const s of [-1, 1]) block(s * 2.0, s * 2.06, 1.2, 1.74, -42.5, -41.04, 'cloth');
    block(-0.16, 0.16, 0.66, 5.6, -43.7, -43.4, 'cross');
    block(-1.05, 1.05, 4.05, 4.37, -43.7, -43.4, 'cross');
    // tapete vinho contínuo da entrada até os degraus
    block(-1.0, 1.0, 0.06, 0.1, -38.6, -3.2, 'carpet');
    // bancos: duas fileiras alinhadas voltadas para o altar (assento, encosto, apoios laterais e pés)
    const pew = (x0, x1, z) => {
      block(x0, x1, 0.5, 0.62, z - 0.3, z + 0.3, 'pew');
      block(x0, x1, 0.62, 1.2, z + 0.24, z + 0.34, 'pew');
      block(x0, x1, 0.12, 0.2, z - 0.05, z + 0.05, 'pew');                     // travessa entre os pés
      for (const xe of [x0, x1 - 0.12]) block(xe, xe + 0.12, 0, 1.28, z - 0.34, z + 0.36, 'pew');   // apoios laterais
      for (const xl of [x0 + 1.1, x1 - 1.1]) block(xl - 0.06, xl + 0.06, 0, 0.5, z - 0.2, z + 0.2, 'pew');   // pés
    };
    for (let r = 0; r < 15; r++) { const z = -16 - r * 1.4; pew(1.4, 4.2, z); pew(-4.2, -1.4, z); }
  }
  function stained(x, y, z, w, sp, f, parent, dir = 1) {                    // vitral: chumbo escuro + quadradinhos coloridos dentro do arco
    piece(shapeOf(arch(w + 0.5, sp, f)), 0.12, 'iStone2', x, y - 0.25, z + 0.12 * dir, parent);
    piece(shapeOf(arch(w, sp, f)), 0.06, 'lead', x, y, z + 0.18 * dir, parent);
    const c = 0.24, top = sp + 0.866 * w * f;
    for (let yy = c / 2 + 0.06, r = 0; yy < top - 0.15; yy += c + 0.06, r++) {
      let half = w / 2;
      if (yy > sp) { const st = Math.min(1, (yy - sp) / (w * f)); half = Math.max(0, w * Math.sqrt(1 - st * st) - w / 2); }   // largura do arco nessa altura
      for (let xx = -half + c / 2 + 0.06, k = 0; xx < half - c / 2; xx += c + 0.06, k++)
        box(c, c, 0.04, GLASS[(((r * 3 + k * 2 + Math.round(x)) % 5) + 5) % 5], x + xx, y + yy, z + 0.23 * dir, parent);
    }
  }

  // ===== funde tudo em 1 malha por material =====
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld); g.clearGroups();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!buckets.has(o.material)) buckets.set(o.material, []);
    buckets.get(o.material).push(g);
  });
  while (root.children.length) root.remove(root.children[0]);
  for (const [m, geos] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), m);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    geos.forEach(g => g.dispose());
  }
  // Seu Galdino sentado no 6º banco (contando da entrada para o altar), à direita de quem entra (+x), olhando para o altar (−z).
  // Fica fora da fusão (materiais dele são os do personagem); a colisão do banco já cobre ele.
  const pr = buildPewReader(0.62); pr.position.set(2.3, 0, -16 - 5 * 1.4); pr.rotation.y = Math.PI / 2; root.add(pr);
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
