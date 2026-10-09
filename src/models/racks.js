// Bagageiros da van (Shop → Bagageiro): o padrão (caixas de entrega) + 3 modelos. Nenhum tem cor editável.
// Coordenadas no espaço do corpo da van (frente = +X); a carga fica sobre os trilhos do teto (y ≈ 2,47, x de −2,2 a 0,5, z de −0,85 a 0,85).
import * as THREE from 'three';
import { box, cyl, sphere, cone, torus, at, group, dynamic, textTexture } from './kit.js';

const Y = 2.47;                                    // topo dos trilhos
const CARD = '#c98a4a', TAPE = '#f3d9a6';

/** Etiqueta (plano com texto). Fica fora do merge (precisa das UVs). */
function label(text, w, h, bg, fg, px) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: textTexture(text, { width: 256, height: Math.round(256 * h / w), bg, fg, font: `bold ${px}px "Trebuchet MS", sans-serif` }), roughness: 0.8 }));
  return dynamic(m);
}

/** Caixote de madeira reforçado (origem no centro da base). */
function crate(w, h, d) {
  const WOOD = '#b98b57', DARK = '#6f4a28', g = group();
  g.add(at(box(w, h, d, WOOD), 0, h / 2, 0));
  for (const k of [1, 2]) g.add(at(box(w + 0.012, 0.016, d + 0.012, DARK), 0, (h * k) / 3, 0));                   // juntas das tábuas
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(box(0.09, h + 0.02, 0.09, DARK), sx * w / 2, h / 2, sz * d / 2));   // quinas reforçadas
  for (const yy of [0.04, h - 0.04]) {
    for (const sz of [-1, 1]) g.add(at(box(w + 0.02, 0.08, 0.09, DARK), 0, yy, sz * d / 2));
    for (const sx of [-1, 1]) g.add(at(box(0.09, 0.08, d + 0.02, DARK), sx * w / 2, yy, 0));
  }
  const L = Math.hypot(w, h) * 0.9, a = Math.atan2(h, w);
  for (const sz of [-1, 1]) g.add(at(box(L, 0.07, 0.04, DARK), 0, h / 2, sz * (d / 2 + 0.02), 0, 0, sz * a));   // travessa em X (frente e fundo)
  const L2 = Math.hypot(d, h) * 0.9, a2 = Math.atan2(h, d);
  for (const sx of [-1, 1]) g.add(at(box(0.04, 0.07, L2, DARK), sx * (w / 2 + 0.02), h / 2, 0, sx * a2, 0, 0));    // e nas laterais
  // etiquetas e marcas de transporte
  const f = label('FRÁGIL', Math.min(0.5, w * 0.6), 0.2, '#f4efe3', '#c0281e', 52); f.position.set(0, h * 0.72, d / 2 + 0.05); g.add(f);
  const t = label('↑ ↑', Math.min(0.45, w * 0.5), 0.24, '#f4efe3', '#2b2d33', 70); t.rotation.x = -Math.PI / 2; t.position.set(0, h + 0.005, 0); g.add(t);
  const s = label('ESTE LADO', 0.5, 0.16, '#f4efe3', '#2b2d33', 44); s.rotation.y = Math.PI / 2; s.position.set(w / 2 + 0.05, h * 0.35, 0); g.add(s);
  g.add(at(box(0.16, 0.1, 0.02, '#d8473a'), -w * 0.3, h * 0.35, d / 2 + 0.02));                                   // etiqueta de despacho
  return g;
}


/** Gerador pseudo-aleatório determinístico (a carga remendada sempre sai igual). */
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Caixa amassada e coberta de fita adesiva por todos os lados (origem no centro da base). */
function patchedBox(w, h, d, seed) {
  const r = rng(seed), g = group();
  g.add(at(box(w, h, d, '#b57a3e'), 0, h / 2, 0));
  g.add(at(box(w * 0.45, 0.06, d * 0.45, '#9a6a36'), w * 0.28, h + 0.01, d * 0.28, -0.12, 0.3, -0.35));        // tampa afundada/amassada num canto
  for (const [x, y, z, sx, sy] of [[-w * 0.25, h * 0.55, d / 2 + 0.011, 0.4, 0.35], [w * 0.2, h * 0.3, -d / 2 - 0.011, 0.3, 0.3]]) g.add(at(box(w * sx, h * sy, 0.02, '#8a5a2e'), x, y, z));   // amassados nas faces
  g.add(at(box(0.02, h * 0.4, d * 0.4, '#8a5a2e'), w / 2 + 0.011, h * 0.5, d * 0.1));
  let n = 0;
  const tape = () => (n++ % 3 === 0 ? '#aeb4bb' : n % 3 === 1 ? '#e8d3a0' : '#d9b97a');
  for (let i = 0; i < 13; i++) {                                                                                 // fita demais: tiras cruzadas em cima e dando a volta
    const e = 0.004 * (i + 1), wd = 0.09 + r() * 0.07, c = tape();
    if (i % 3 === 0) {                                                                                           // volta completa em torno da caixa (em X)
      const px = (r() - 0.5) * w * 0.8;
      g.add(at(box(wd, 0.012, d + 0.02, c), px, h + e, 0), at(box(wd, h + 0.02, 0.012, c), px, h / 2, d / 2 + e), at(box(wd, h + 0.02, 0.012, c), px, h / 2, -d / 2 - e));
    } else if (i % 3 === 1) {                                                                                    // volta completa em torno da caixa (em Z)
      const pz = (r() - 0.5) * d * 0.8;
      g.add(at(box(w + 0.02, 0.012, wd, c), 0, h + e, pz), at(box(0.012, h + 0.02, wd, c), w / 2 + e, h / 2, pz), at(box(0.012, h + 0.02, wd, c), -w / 2 - e, h / 2, pz));
    } else {                                                                                                     // tira diagonal torta em cima
      g.add(at(box(Math.max(w, d) * 0.95, 0.012, wd, c), (r() - 0.5) * 0.2, h + e, (r() - 0.5) * 0.2, 0, (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.5), 0));
    }
  }
  for (const [x, z] of [[-w * 0.3, -d * 0.2], [w * 0.25, d * 0.3]]) g.add(at(box(0.22, 0.014, 0.16, '#e3a52a'), x, h + 0.07, z, 0, r() * 2, 0));   // remendos amarelos
  return g;
}

/** Ursinho de pelúcia enorme (origem no chão, sentado). */
function bear() {
  const FUR = '#a8693a', LIGHT = '#d9a56a', g = group();
  const body = sphere(0.55, FUR, 14, 10); body.scale.set(0.95, 1.05, 0.8); body.position.y = 0.55; g.add(body);
  g.add(at(sphere(0.34, LIGHT, 12, 8), 0.12, 0.5, 0.0));                                                          // barriga
  const head = sphere(0.42, FUR, 14, 10); head.position.set(0.05, 1.3, 0); g.add(head);
  g.add(at(sphere(0.17, FUR, 8, 6), -0.05, 1.68, 0.3), at(sphere(0.17, FUR, 8, 6), -0.05, 1.68, -0.3));              // orelhas
  g.add(at(sphere(0.1, LIGHT, 8, 6), -0.05, 1.68, 0.3), at(sphere(0.1, LIGHT, 8, 6), -0.05, 1.68, -0.3));
  const muzzle = sphere(0.19, LIGHT, 10, 8); muzzle.scale.set(1, 0.8, 1.15); muzzle.position.set(0.38, 1.2, 0); g.add(muzzle);
  g.add(at(sphere(0.06, '#2b1a10', 8, 6), 0.55, 1.26, 0), at(sphere(0.045, '#111111', 8, 6), 0.38, 1.4, 0.15), at(sphere(0.045, '#111111', 8, 6), 0.38, 1.4, -0.15));   // nariz e olhos
  for (const s of [-1, 1]) {                                                                                      // braços e pernas espremidos para os lados/frente
    g.add(at(sphere(0.2, FUR, 10, 8), 0.05, 0.85, s * 0.62));
    g.add(at(sphere(0.23, FUR, 10, 8), 0.5, 0.2, s * 0.32), at(sphere(0.13, LIGHT, 8, 6), 0.72, 0.2, s * 0.32));
  }
  g.add(at(box(0.1, 0.14, 0.4, '#d8473a'), 0.05, 1.0, 0, 0, 0, 0.1));                                             // laço no pescoço
  return g;
}

/** Caixa colorida de brinquedo com fita (origem no centro da base). */
function toyBox(w, h, d, color, ribbon = '#ffffff') {
  return group(at(box(w, h, d, color), 0, h / 2, 0), at(box(w + 0.02, 0.012, 0.1, ribbon), 0, h + 0.005, 0), at(box(0.1, 0.012, d + 0.02, ribbon), 0, h + 0.006, 0),
    at(box(w + 0.02, h + 0.02, 0.1, ribbon), 0, h / 2, 0), at(sphere(0.07, ribbon, 8, 6), 0.06, h + 0.08, 0), at(sphere(0.07, ribbon, 8, 6), -0.06, h + 0.08, 0));
}

export const RACK_MODELS = [
  { name: 'Caixas', desc: 'As caixas de entrega de sempre.',
    build() {
      const pkg = group(at(box(1.35, 0.62, 1.25, CARD), 0, 0.31, 0), at(box(1.37, 0.02, 0.24, TAPE), 0, 0.625, 0), at(box(0.24, 0.02, 1.27, TAPE), 0, 0.625, 0), at(box(1.37, 0.62, 0.24, TAPE), 0, 0.31, 0));
      const pkg2 = group(at(box(0.8, 0.5, 0.75, '#d9a066'), 0, 0.25, 0), at(box(0.82, 0.02, 0.18, TAPE), 0, 0.505, 0), at(box(0.82, 0.5, 0.18, TAPE), 0, 0.25, 0));
      return group(at(pkg, -1.25, Y, 0.05, 0, 0.12, 0), at(pkg2, -0.05, Y, -0.25, 0, -0.25, 0));
    } },
  { name: 'Caixotes de madeira', desc: 'Embalagens reforçadas, com etiquetas e marcas de transporte.',
    build() {
      return group(at(crate(1.2, 0.75, 1.1), -1.45, Y, 0.02, 0, 0.08, 0), at(crate(0.85, 0.65, 0.85), -0.15, Y, -0.28, 0, -0.2, 0), at(crate(0.6, 0.45, 0.6), -1.5, Y + 0.75, 0.1, 0, 0.35, 0));
    } },
  { name: 'Mudança', desc: 'Uma poltrona, um abajur e uma caixa com uma planta saindo.',
    build() {
      const chair = group(
        at(box(0.9, 0.26, 0.85, '#9b3d2e'), 0, 0.24, 0), at(box(0.62, 0.14, 0.7, '#b34a38'), 0.06, 0.43, 0), at(box(0.18, 0.66, 0.85, '#9b3d2e'), -0.36, 0.6, 0),
        at(box(0.78, 0.3, 0.14, '#8a3326'), 0.02, 0.5, 0.36), at(box(0.78, 0.3, 0.14, '#8a3326'), 0.02, 0.5, -0.36));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) chair.add(at(cyl(0.05, 0.04, 0.12, '#3a2a1a', 6), sx * 0.38, 0.06, sz * 0.34));
      const lamp = group(at(cyl(0.2, 0.22, 0.05, '#3a3d44', 12), 0, 0.025, 0), at(cyl(0.03, 0.03, 1.0, '#cfd6dd', 6), 0, 0.55, 0), at(cyl(0.2, 0.31, 0.36, '#f6e7c0', 14), 0, 1.15, 0));
      lamp.rotation.z = -Math.PI / 2;                                                                  // abajur deitado
      const plant = group(at(box(0.75, 0.5, 0.7, CARD), 0, 0.25, 0), at(box(0.77, 0.02, 0.18, TAPE), 0, 0.505, 0));
      for (const [px, pz, ph] of [[0, 0, 0.7], [-0.15, 0.1, 0.5], [0.15, -0.1, 0.55]]) {
        plant.add(at(cyl(0.025, 0.03, ph, '#3f8f3a', 5), px, 0.5 + ph / 2, pz));
        const leaf = sphere(0.22, '#4fa848', 8, 6); leaf.scale.set(1, 0.45, 1); leaf.position.set(px, 0.5 + ph, pz); plant.add(leaf);
      }
      return group(at(chair, -1.45, Y, 0.08, 0, 0.18, 0), at(lamp, -0.75, Y + 0.31, 0.62, 0, 0.1, 0), at(plant, -0.05, Y, -0.22, 0, -0.15, 0));
    } },
  { name: 'Eletrodoméstico', desc: 'Uma geladeira embalada, deitada e presa no teto.',
    build() {
      const fr = group(at(box(1.95, 0.78, 0.82, '#d9c29a'), 0, 0.39, 0));
      for (const sx of [-1, 1]) fr.add(at(box(0.12, 0.72, 0.78, '#f4f1ea'), sx * 0.99, 0.39, 0));       // cantoneiras de isopor
      for (const x of [-0.5, 0.5]) {                                                                   // cintas de fixação
        fr.add(at(box(0.08, 0.03, 0.86, '#e3262e'), x, 0.8, 0));
        for (const sz of [-1, 1]) fr.add(at(box(0.08, 0.82, 0.03, '#e3262e'), x, 0.39, sz * 0.43));
        fr.add(at(box(0.14, 0.05, 0.1, '#2b2d33'), x, 0.82, 0.2));                                     // catraca
      }
      fr.add(at(box(0.5, 0.012, 0.22, '#f4efe3'), 0.1, 0.785, -0.22));
      const l1 = label('GELADEIRA', 0.62, 0.2, '#f4efe3', '#2b2d33', 46); l1.rotation.x = -Math.PI / 2; l1.position.set(0.05, 0.792, -0.2); fr.add(l1);
      const l2 = label('↑ ESTE LADO', 0.5, 0.16, '#f4efe3', '#c0281e', 40); l2.rotation.x = -Math.PI / 2; l2.position.set(-0.62, 0.792, 0.16); fr.add(l2);
      return group(at(fr, -0.9, Y, 0, 0, 0.04, 0));
    } },
  { name: 'Carga toda remendada', desc: 'Caixas amassadas, cobertas por quantidades exageradas de fita adesiva.',
    build() {
      return group(at(patchedBox(1.25, 0.62, 1.1, 11), -1.4, Y, 0.0, 0, 0.1, 0), at(patchedBox(0.85, 0.56, 0.8, 23), -0.25, Y, -0.25, 0, -0.3, 0),
        at(patchedBox(0.6, 0.42, 0.6, 37), -1.35, Y + 0.62, 0.05, -0.1, 0.4, 0.12));
    } },
  { name: 'Pneus novos', desc: 'Quatro pneus empilhados, com etiquetas de entrega.',
    build() {
      const st = group();
      for (let i = 0; i < 4; i++) {
        const t = at(torus(0.33, 0.17, '#1f2023', 10, 24), 0, 0.17 + i * 0.34, 0, Math.PI / 2, 0, 0);
        st.add(t, at(torus(0.38, 0.022, '#e9e6df', 6, 24), 0, 0.17 + i * 0.34 + 0.165, 0, Math.PI / 2, 0, 0));        // faixa branca da marca
      }
      for (const x of [-0.2, 0.2]) {                                                                                  // cintas laranja segurando a pilha
        st.add(at(box(0.07, 1.4, 0.03, '#ff7a1a'), x, 0.68, 0.51), at(box(0.07, 1.4, 0.03, '#ff7a1a'), x, 0.68, -0.51));
      }
      const l1 = label('ENTREGA', 0.34, 0.2, '#f4efe3', '#c0281e', 44); l1.position.set(0, 0.85, 0.53); st.add(l1);
      const l2 = label('NOVOS ×4', 0.34, 0.2, '#f4efe3', '#2b2d33', 40); l2.rotation.y = Math.PI / 2; l2.position.set(0.53, 0.5, 0); st.add(l2);
      const l3 = label('PNEU', 0.3, 0.16, '#f4efe3', '#2b2d33', 44); l3.rotation.x = -Math.PI / 2; l3.position.set(0.33, 1.375, 0); st.add(l3);
      return group(at(st, -0.9, Y, 0.0, 0, 0.3, 0));
    } },
  { name: 'Entrega de brinquedos', desc: 'Caixas coloridas, com um ursinho enorme espremido entre elas.',
    build() {
      return group(at(toyBox(0.7, 0.55, 0.7, '#e3262e'), -1.75, Y, -0.3, 0, 0.1, 0), at(toyBox(0.7, 0.7, 0.7, '#3a78d4'), -1.7, Y, 0.45, 0, -0.1, 0),
        at(toyBox(0.62, 0.5, 0.7, '#efbf2a'), 0.05, Y, -0.38, 0, -0.15, 0), at(toyBox(0.6, 0.62, 0.6, '#3c9d55'), 0.05, Y, 0.38, 0, 0.12, 0),
        at(toyBox(0.5, 0.4, 0.5, '#8a55c4'), -1.72, Y + 0.7, 0.45, 0, 0.5, 0.06), at(bear(), -0.85, Y, 0.02, 0, -0.1, 0));
    } },
  { name: 'Jardim portátil', desc: 'Vasos de flores, folhagens e uma pequena árvore.',
    build() {
      const g = group();
      const pot = (x, z, r, h) => {
        const p = group(at(cyl(r, r * 0.72, h, '#b8582f', 10), 0, h / 2, 0), at(cyl(r * 1.1, r * 1.05, 0.07, '#c9683a', 10), 0, h, 0), at(cyl(r * 0.95, r * 0.95, 0.02, '#4b3320', 10), 0, h + 0.03, 0));
        p.position.set(x, Y, z); g.add(p); return h + 0.04;
      };
      const flowers = (x, z, r, h, color, n = 4) => {
        const base = Y + pot(x, z, r, h);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2, fx = x + Math.cos(a) * r * 0.45, fz = z + Math.sin(a) * r * 0.45, fh = 0.35 + (i % 3) * 0.1;
          g.add(at(cyl(0.015, 0.018, fh, '#3f8f3a', 5), fx, base + fh / 2, fz), at(sphere(0.1, color, 8, 6), fx, base + fh + 0.04, fz), at(sphere(0.05, '#ffd23a', 6, 4), fx, base + fh + 0.1, fz));
          g.add(at(sphere(0.07, '#4fa848', 6, 4), fx + 0.07, base + 0.12, fz), at(sphere(0.07, '#4fa848', 6, 4), fx - 0.07, base + 0.1, fz));
        }
      };
      const leaves = (x, z, r, h, color) => {
        const base = Y + pot(x, z, r, h);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(at(cone(0.1, 0.55 + (i % 2) * 0.15, color, 5), x + Math.cos(a) * r * 0.4, base + 0.3, z + Math.sin(a) * r * 0.4, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35)); }
      };
      // pequena árvore num vaso grande
      pot(-1.65, 0.05, 0.36, 0.42);
      g.add(at(cyl(0.05, 0.08, 0.95, '#6b4526', 7), -1.65, Y + 0.9, 0.05), at(sphere(0.5, '#3f8f3a', 10, 8), -1.65, Y + 1.55, 0.05), at(sphere(0.34, '#57a84a', 9, 7), -1.45, Y + 1.8, 0.2), at(sphere(0.3, '#4fa848', 9, 7), -1.9, Y + 1.7, -0.1));
      flowers(-0.95, 0.5, 0.26, 0.3, '#e3262e');
      flowers(-0.95, -0.5, 0.24, 0.28, '#efbf2a');
      leaves(-0.4, 0.55, 0.25, 0.3, '#2f8a3a');
      flowers(-0.35, -0.5, 0.25, 0.3, '#e86aa0', 5);
      flowers(0.1, 0.05, 0.3, 0.34, '#8a55c4', 5);
      leaves(-0.95, 0.0, 0.22, 0.26, '#4fa848');
      return g;
    } },
  { name: 'Encomenda suspeita', desc: 'Uma caixa maior, única, marcada “NÃO ABRIR”, com dois olhos espiando por buracos.',
    build() {
      const b = group(at(box(1.5, 1.0, 1.25, '#a56a36'), 0, 0.5, 0));
      for (const x of [-0.45, 0.2]) b.add(at(box(0.1, 1.02, 1.27, '#e8d3a0'), x, 0.5, 0), at(box(0.1, 0.012, 1.27, '#e8d3a0'), x, 1.005, 0));    // fitas
      b.add(at(box(1.52, 0.012, 0.12, '#e8d3a0'), 0, 1.008, 0));
      const top = label('NÃO ABRIR', 1.15, 0.42, '#f4efe3', '#c0281e', 40); top.rotation.x = -Math.PI / 2; top.position.set(-0.1, 1.012, 0.25); b.add(top);
      const side = label('NÃO ABRIR', 0.95, 0.34, '#f4efe3', '#c0281e', 36); side.position.set(-0.1, 0.38, 0.635); b.add(side);
      const side2 = label('NÃO ABRIR', 0.95, 0.34, '#f4efe3', '#c0281e', 36); side2.rotation.y = Math.PI; side2.position.set(0.1, 0.38, -0.635); b.add(side2);
      for (const z of [-0.28, 0.28]) {                                                                 // dois buracos na frente, com olhos espiando
        b.add(at(cyl(0.19, 0.19, 0.04, '#0a0a0a', 18), 0.76, 0.68, z, 0, 0, Math.PI / 2));
        b.add(at(sphere(0.14, '#fbfbf7', 12, 10), 0.74, 0.68, z), at(sphere(0.065, '#111111', 8, 6), 0.86, 0.68, z + 0.05), at(sphere(0.02, '#ffffff', 6, 4), 0.9, 0.71, z + 0.07));
        b.add(at(box(0.04, 0.05, 0.3, '#2b2d33'), 0.77, 0.9, z + (z < 0 ? 0.03 : -0.03), (z < 0 ? 1 : -1) * 0.35, 0, 0));   // sobrancelha desconfiada
      }
      return group(at(b, -1.0, Y, 0, 0, 0.04, 0));
    } },
  { name: 'Excesso de encomendas', desc: 'Uma torre absurda de caixas, balançando nas curvas.',
    build() {
      const tower = dynamic(group());                                  // pivô na base: a van o balança nas curvas, freadas e arrancadas
      tower.name = 'sway';
      const cols = ['#c98a4a', '#d9a066', '#b57a3e', '#e0b27a', '#c98a4a', '#d9a066', '#b57a3e', '#e0b27a', '#c98a4a', '#d9a066'];
      const dims = [[1.4, 0.55, 1.2], [1.2, 0.5, 1.1], [1.3, 0.55, 1.0], [1.0, 0.5, 1.0], [1.1, 0.55, 0.9], [0.9, 0.5, 0.85], [0.8, 0.5, 0.8], [0.7, 0.45, 0.7], [0.6, 0.42, 0.6], [0.45, 0.4, 0.45]];
      let y = 0;
      dims.forEach(([w, h, d], i) => {
        const c = group(at(box(w, h, d, cols[i]), 0, h / 2, 0), at(box(w + 0.02, h + 0.02, 0.1, TAPE), 0, h / 2, 0), at(box(0.1, 0.012, d + 0.02, TAPE), 0, h + 0.006, 0));
        c.position.set(Math.sin(i * 1.7) * 0.1, y, Math.cos(i * 2.3) * 0.08); c.rotation.y = Math.sin(i * 2.9) * 0.22;
        tower.add(c); y += h;
      });
      tower.add(at(box(0.05, y * 0.98, 0.03, '#3a3d44'), 0.0, y / 2, 0.62 - 0.0));                         // corda esticada na frente
      tower.position.set(-1.0, Y, 0);
      return group(tower);
    } },
];

/** Bagageiro `i` (0 = padrão): grupo no espaço do corpo da van. */
export function buildRack(i = 0) {
  const g = RACK_MODELS[i].build();
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
