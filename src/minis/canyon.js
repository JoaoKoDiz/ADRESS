// Maquete do Bairro 23 (Cachoeira): fatia de terreno com o desfiladeiro norte–sul no meio, o rio lá no alto do maciço do fundo
// caindo numa cachoeira larga, o rio continuando no fundo do vale até a borda da frente (corte com as camadas de pedra),
// a ponte alta em arco ligando as duas margens com as ruas alinhadas a ela, casas viradas para a rua da beira e mata.
// Eixos da maquete: +z = frente (lado da estrada/câmera do mapa), x = lados. Tudo estático (fundido no fim).

const PY = 4.2;                 // topo das margens (grama)
const MY = 7.9;                 // topo do maciço do meio (rio de cima)
const RY = 0.62;                // superfície do rio lá embaixo
const BZ = 2.0;                 // eixo da ponte e das ruas que chegam nela
const FZ = -4.6;                // face do maciço (atrás dela, o fundo)

export const signY = 15;
export const thumb = { dir: [-7, 19, 27], k: 0.86, dy: -0.6 };

export function build(ctx) {
  const { THREE, g, add, G, roof, ROADC, WALL_COL, box, cone, sphere, cyl, mat } = ctx;
  let seed = 23;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const ROCK = [G('#7d6d5a', '#7c7c7c'), G('#8c7b66', '#868686'), G('#a3937a', '#969696'), G('#6a5b4a', '#707070')];
  const SOIL = G('#6e5a40', '#6c6c6c'), GRASS = G('#93c866', '#a3a3a3'), MOSS = G('#5f8a3e', '#8a8a8a');
  const LEAF = [G('#4f8f3a', '#8a8a8a'), G('#3f7d34', '#7e7e7e'), G('#6aa046', '#959595')];
  const PINE = G('#2f6b33', '#767676'), TRUNK = G('#6b4526', '#6a6a6a');
  const WATER = G('#3f97d4', '#9a9a9a'), FOAM = G('#f2fbff', '#d6d6d6');
  const CONC = G('#c4beb2', '#b0b0b0'), CONC2 = G('#a8a296', '#9c9c9c'), RAILC = G('#4f555c', '#727272');
  const HEDGE = G('#3f7d3a', '#7a7a7a'), WOOD = G('#8a5a34', '#6e6e6e');

  /** caixa pelos limites (x0..x1, y0..y1, z0..z1) */
  const slab = (x0, x1, y0, y1, z0, z1, c) => add(box(+(x1 - x0).toFixed(3), +(y1 - y0).toFixed(3), +(z1 - z0).toFixed(3), c), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);

  // ---- base: rodapé claro em volta (mesma linguagem das outras maquetes)
  add(box(15.4, 0.3, 15.4, G('#d4cdbb', '#b9b9b9')), 0, 0.15, 0);

  // ---- margens em camadas, com o paredão em degraus irregulares (fatias de 1,5 ao longo do vale)
  const LAY = [[0.3, 1.5, 0], [1.5, 2.7, 1], [2.7, 3.95, 2]];        // camadas de pedra (y0, y1, cor)
  const segs = [];
  for (let z = FZ; z < 7.5 - 0.01; z += 1.515) segs.push([z, Math.min(7.5, z + 1.515)]);
  const rim = [];                                                     // borda de cima de cada fatia (para a mureta e os arbustos)
  for (const s of [-1, 1]) {
    segs.forEach(([z0, z1], i) => {
      const nearBridge = BZ > z0 - 0.8 && BZ < z1 + 0.8;
      const j = k => (nearBridge && k === 2 ? 0 : (rnd() - 0.5) * 0.3);
      const face = [2.0 + j(0), 2.65 + j(1), 3.3 + j(2)];
      LAY.forEach(([y0, y1, c], k) => slab(s > 0 ? face[k] : -7.5, s > 0 ? 7.5 : -face[k], y0, y1, z0, z1, ROCK[(c + i + (s > 0 ? 1 : 0)) % 3]));
      slab(s > 0 ? face[2] : -7.5, s > 0 ? 7.5 : -face[2], 3.95, 4.08, z0, z1, SOIL);
      slab(s > 0 ? face[2] : -7.5, s > 0 ? 7.5 : -face[2], 4.08, PY, z0, z1, GRASS);
      // degraus do paredão cobertos de musgo e arbustos
      for (const [a, b, y] of [[face[0], face[1], 1.5], [face[1], face[2], 2.7]]) {
        slab(s > 0 ? a : -b - 0.04, s > 0 ? b + 0.04 : -a, y, y + 0.06, z0, z1, MOSS);
        for (let k = 0; k < 2; k++) if (rnd() < 0.75) {
          const r = 0.16 + rnd() * 0.12, x = s * (a + (b - a) * (0.35 + rnd() * 0.3));
          add(sphere(r, LEAF[(i + k) % 3], 7, 5), x, y + 0.06 + r * 0.55, z0 + 0.3 + rnd() * (z1 - z0 - 0.6));
        }
      }
      // pedras salientes na face (quebram a linha reta)
      for (let k = 0; k < 2; k++) {
        const L = (i + k) % 3, [y0, y1] = LAY[L], h = 0.35 + rnd() * 0.5, d = 0.4 + rnd() * 0.6;
        add(box(0.24, h, d, ROCK[3]), s * (face[L] - 0.08), y0 + 0.2 + rnd() * (y1 - y0 - h - 0.25) + h / 2, z0 + 0.3 + rnd() * (z1 - z0 - 0.6) + 0.0);
      }
      rim.push([s, face[2], z0, z1, nearBridge]);
    });
  }

  // ---- fundo do vale: leito e o rio correndo até a borda da frente
  slab(-2.25, 2.25, 0.3, 0.5, FZ, 7.5, ROCK[3]);
  slab(-2.1, 2.1, 0.5, RY, -3.2, 7.5, WATER);
  for (let k = 0; k < 9; k++) {                                       // espuma e pedrinhas no rio
    const z = -2.4 + k * 1.1, x = Math.sin(k * 1.7) * 1.1;
    add(box(0.5 + rnd() * 0.4, 0.04, 0.1, FOAM), x, RY + 0.01, z, 0, (rnd() - 0.5) * 0.4, 0);
    if (k % 3 === 1) add(sphere(0.2, ROCK[2], 6, 4), -x * 0.8, RY - 0.02, z + 0.5);
  }

  // ---- maciço do fundo: ombros mais baixos dos lados, meio alto com o rio
  const SH = 6.4;                                                     // topo dos ombros
  for (const s of [-1, 1]) {
    slab(s > 0 ? 4.4 : -7.5, s > 0 ? 7.5 : -4.4, PY, SH - 0.15, -7.5, FZ, ROCK[1]);
    slab(s > 0 ? 4.4 : -7.5, s > 0 ? 7.5 : -4.4, SH - 0.15, SH, -7.5, FZ, GRASS);
    slab(s > 0 ? 1.65 : -4.4, s > 0 ? 4.4 : -1.65, PY, MY - 0.15, -7.5, FZ + 0.05, ROCK[2]);
    slab(s > 0 ? 1.65 : -4.4, s > 0 ? 4.4 : -1.65, MY - 0.15, MY + 0.1, -7.5, FZ + 0.05, GRASS);
    slab(s > 0 ? 1.65 : -4.4, s > 0 ? 4.4 : -1.65, 0.3, PY, -7.5, FZ + 0.05, ROCK[0]);   // parte de baixo, no vale
    // blocos de pedra na face do maciço (camadas)
    // face do maciço: frisos de camadas irregulares, lascas de pedra e mato agarrado nos frisos
    for (const [y, x0, x1, top] of [[5.15, 1.75, 4.4, MY], [6.55, 1.75, 4.4, MY], [5.3, 4.4, 7.5, SH]]) {
      for (let x = x0; x < x1 - 0.2;) {
        const w = Math.min(x1 - x, 0.5 + rnd() * 0.9), yy = y + (rnd() - 0.5) * 0.18, dz = 0.12 + rnd() * 0.12;
        add(box(+w.toFixed(3), 0.14, +dz.toFixed(3), ROCK[2]), s * (x + w / 2), yy, FZ + 0.05 + dz / 2);
        if (rnd() < 0.55 && yy < top - 0.4) add(sphere(0.15 + rnd() * 0.08, LEAF[(x * 7 | 0) % 3], 7, 5), s * (x + w * 0.5), yy + 0.14, FZ + 0.22);
        x += w + 0.1 + rnd() * 0.35;
      }
    }
    for (let k = 0; k < 4; k++) {                                          // lascas verticais mais escuras
      const x = 1.9 + k * 0.75 + rnd() * 0.3, h = 0.5 + rnd() * 0.6, top = x < 4.4 ? MY : SH;
      const y = PY + 0.35 + rnd() * (top - PY - h - 0.6);
      add(box(0.22, +h.toFixed(3), 0.12, ROCK[3]), s * x, y + h / 2, FZ + 0.08, 0, 0, (rnd() - 0.5) * 0.3);
    }
    for (const x of [5.2, 6.4]) add(box(0.5 + rnd() * 0.4, 0.4, 0.14, ROCK[3]), s * x, PY + 0.6 + rnd() * 0.5, FZ + 0.08);
  }
  slab(-1.65, 1.65, 0.3, MY - 0.32, -7.5, FZ, ROCK[3]);              // meio (atrás da queda)
  slab(-1.66, 1.66, MY - 0.32, MY - 0.06, -7.5, FZ, WATER);            // rio lá em cima, embutido entre as margens
  for (const [x, z, w] of [[-0.8, -7.0, 0.6], [0.5, -6.5, 0.7], [-0.3, -5.8, 0.8], [0.9, -5.4, 0.5], [-1.0, -5.0, 0.5], [0.2, -4.95, 0.9]])
    add(box(w, 0.03, 0.09, FOAM), x, MY - 0.045, z, 0, (rnd() - 0.5) * 0.3, 0);      // correnteza chegando na beira
  for (const [x, z] of [[1.2, -6.9], [-1.25, -6.1]]) add(sphere(0.2, ROCK[2], 6, 4), x, MY - 0.08, z);
  slab(-1.75, 1.75, MY - 0.42, MY - 0.24, FZ - 0.05, FZ + 0.25, ROCK[2]);   // beira da queda

  // ---- cachoeira: lâmina que vira na beira e desce acelerando (perfil curvo), com faixas de espuma
  const prof = [[FZ - 0.4, MY - 0.06], [FZ + 0.05, MY - 0.12], [FZ + 0.35, MY - 0.4], [FZ + 0.55, MY - 1.1], [FZ + 0.68, MY - 2.4], [FZ + 0.74, 3.6], [FZ + 0.77, RY + 0.02]];
  const ribbon = (x0, x1, off, cut = 0) => {
    const pos = [];
    const P = prof.slice(cut);
    for (let k = 0; k < P.length - 1; k++) {
      const [za, ya] = P[k], [zb, yb] = P[k + 1];
      pos.push(x0, ya, za + off, x1, ya, za + off, x1, yb, zb + off, x0, ya, za + off, x1, yb, zb + off, x0, yb, zb + off);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
  };
  const fallMat = G(true, false) ? mat('#8fcaf0', { emissive: '#2f6a94', emissiveIntensity: 0.3, side: THREE.DoubleSide }) : mat('#c8c8c8', { side: THREE.DoubleSide });
  const foamMat = G(true, false) ? mat('#ffffff', { emissive: '#7aa6c4', emissiveIntensity: 0.25, side: THREE.DoubleSide }) : mat('#e2e2e2', { side: THREE.DoubleSide });
  g.add(new THREE.Mesh(ribbon(-1.6, 1.6, 0), fallMat));
  for (let k = 0; k < 7; k++) {
    const x = -1.4 + k * 0.47 + (rnd() - 0.5) * 0.12, w = 0.1 + rnd() * 0.08;
    g.add(new THREE.Mesh(ribbon(x - w / 2, x + w / 2, 0.035, 1), foamMat));
  }
  // poço da queda: água mais larga, espuma e névoa
  slab(-2.1, 2.1, 0.5, RY, FZ, -3.2, WATER);
  const puff = (r, x, y, z, sy = 0.55) => { const m = sphere(r, FOAM, 9, 6); m.scale.set(1, sy, 1); add(m, x, y, z); };
  puff(0.9, 0, RY + 0.12, -3.75); puff(0.7, -0.95, RY + 0.1, -3.6); puff(0.7, 0.95, RY + 0.1, -3.6);
  puff(0.55, -0.4, RY + 0.25, -3.2, 0.7); puff(0.5, 0.55, RY + 0.22, -3.0, 0.7); puff(0.45, 0, RY + 0.1, -2.6);

  // ---- mata no maciço e no alto
  const tree = (x, y, z, r = 0.45, c = 0) => {
    add(cyl(0.07, 0.1, 0.45, TRUNK, 6), x, y + 0.22, z);
    add(sphere(r, LEAF[c % 3], 8, 6), x, y + 0.42 + r * 0.7, z);
  };
  const pine = (x, y, z, h = 1.2) => {
    add(cyl(0.06, 0.08, 0.3, TRUNK, 5), x, y + 0.15, z);
    add(cone(h * 0.36, h, PINE, 7), x, y + 0.3 + h / 2, z);
  };
  for (const s of [-1, 1]) {
    for (const [x, z, k] of [[5.0, -6.9, 0], [6.3, -6.3, 1], [5.6, -5.3, 2], [6.9, -5.1, 0], [4.9, -5.9, 1]]) (k === 1 ? pine(s * x, SH, z, 1.3) : tree(s * x, SH, z, 0.42 + k * 0.05, k));
    for (const [x, z, k] of [[2.4, -6.9, 0], [3.6, -6.2, 1], [3.9, -7.1, 2], [2.6, -5.5, 1]]) (k === 1 ? pine(s * x, MY + 0.1, z, 1.1) : tree(s * x, MY + 0.1, z, 0.4, k + 1));
    // arbustos na beira do rio de cima
    add(sphere(0.2, LEAF[2], 7, 5), s * 1.85, MY + 0.2, -6.6);
  }

  // ---- ponte alta em arco
  slab(-3.5, 3.5, 3.92, PY, BZ - 0.66, BZ + 0.66, CONC);                       // tabuleiro
  slab(-3.55, 3.55, PY, PY + 0.06, BZ - 0.5, BZ + 0.5, ROADC);                 // asfalto
  for (let x = -2.925; x <= 2.93; x += 0.65) add(box(0.22, 0.03, 0.06, G('#f2d45c', '#c4c4c4')), x, PY + 0.075, BZ);
  for (const dz of [-0.6, 0.6]) {                                              // muretas + guarda-corpo
    slab(-3.5, 3.5, PY, PY + 0.16, BZ + dz - 0.05, BZ + dz + 0.05, CONC2);
    slab(-3.5, 3.5, PY + 0.3, PY + 0.35, BZ + dz - 0.03, BZ + dz + 0.03, RAILC);
    for (let x = -3.4; x <= 3.41; x += 0.5) add(box(0.04, 0.2, 0.04, RAILC), x, PY + 0.25, BZ + dz);
  }
  for (const x of [-1.8, 1.8]) {                                               // postes de luz
    add(cyl(0.035, 0.045, 1.18, RAILC, 6), x, 3.92 + 0.59, BZ + 0.71);    // preso por fora do tabuleiro
    add(sphere(0.09, G('#ffe39a', '#dadada'), 7, 5), x, PY + 0.95, BZ + 0.72);
  }
  const A0 = 2.1, AY0 = 1.5, AY1 = 3.68;                                       // arco: nasce no degrau de baixo
  const archY = x => AY0 + (AY1 - AY0) * (1 - (x / A0) ** 2);
  for (let k = -9; k <= 9; k++) {
    const x = k * (A0 / 9.5), x2 = (k + 1) * (A0 / 9.5);
    const ang = Math.atan2(archY(x2) - archY(x), x2 - x);
    add(box(A0 / 9.5 + 0.06, 0.26, 0.86, CONC2), x + A0 / 19, archY(x + A0 / 19) - 0.08, BZ, 0, 0, ang);
  }
  for (const x of [-1.65, -1.1, -0.55, 0.55, 1.1, 1.65]) {                         // pilaretes do arco ao tabuleiro
    const y0 = archY(x);
    if (PY - 0.28 - y0 > 0.05) slab(x - 0.07, x + 0.07, y0, 3.94, BZ - 0.45, BZ + 0.45, CONC);
  }
  for (const s of [-1, 1]) {
    slab(s > 0 ? 1.95 : -2.4, s > 0 ? 2.4 : -1.95, 1.5, 1.95, BZ - 0.55, BZ + 0.55, CONC2);   // apoio do arco no degrau
    slab(s * 1.2 - 0.16, s * 1.2 + 0.16, 0.5, archY(1.2) - 0.1, BZ - 0.3, BZ + 0.3, CONC);     // pilares até o rio
  }

  // ---- ruas no alto: rua da beira (ao longo do vale), a que chega na ponte e a dos fundos
  for (const s of [-1, 1]) {
    const X = v => s * v;
    slab(Math.min(X(3.55), X(4.55)), Math.max(X(3.55), X(4.55)), PY, PY + 0.06, -3.6, 7.5, ROADC);       // beira
    slab(Math.min(X(4.55), X(7.5)), Math.max(X(4.55), X(7.5)), PY, PY + 0.06, BZ - 0.5, BZ + 0.5, ROADC); // ponte → borda
    slab(Math.min(X(4.55), X(7.5)), Math.max(X(4.55), X(7.5)), PY, PY + 0.06, -3.6, -2.7, ROADC);          // fundos
    for (const z of [-1.2, 4.0, 6.4]) add(box(0.06, 0.03, 0.5, G('#f2d45c', '#c4c4c4')), X(4.05), PY + 0.075, z);
    // mureta na beira do paredão (aberta na ponte)
    for (const [ss, f, z0, z1, nb] of rim) if (ss === s) {
      const parts = nb ? [[z0, BZ - 0.66], [BZ + 0.66, z1]] : [[z0, z1]];
      for (const [a, b] of parts) if (b - a > 0.1) slab(Math.min(X(f + 0.02), X(f + 0.14)), Math.max(X(f + 0.02), X(f + 0.14)), PY, PY + 0.2, a, b, CONC2);
    }
    // sebe de fora (lateral e frente, aberta nas ruas)
    slab(Math.min(X(7.05), X(7.45)), Math.max(X(7.05), X(7.45)), PY, PY + 0.5, -4.6, BZ - 0.55, HEDGE);
    slab(Math.min(X(7.05), X(7.45)), Math.max(X(7.05), X(7.45)), PY, PY + 0.5, BZ + 0.55, 7.45, HEDGE);
    slab(Math.min(X(4.6), X(7.05)), Math.max(X(4.6), X(7.05)), PY, PY + 0.5, 7.05, 7.45, HEDGE);
  }

  // ---- casas viradas para a rua da beira (frente para o vale), com sacada de madeira, jardim e árvores
  const house = (x, z, ry, color, w = 1.5, h = 1.05, d = 1.3) => {
    const grp = new THREE.Group(); grp.position.set(x, PY, z); grp.rotation.y = ry; g.add(grp);
    const put = (m, px, py, pz, rx = 0, rY = 0, rz = 0) => { m.position.set(px, py, pz); m.rotation.set(rx, rY, rz); grp.add(m); };
    put(box(w, h, d, G(WALL_COL, '#cfcfcf')), 0, h / 2, 0);
    const r = cone(Math.hypot(w, d) / 2 + 0.12, 0.75, color, 4); r.scale.set(1, 1, d / w); put(r, 0, h + 0.375, 0, 0, Math.PI / 4, 0);
    put(box(0.34, 0.6, 0.06, G('#6b4428', '#5c5c5c')), -w * 0.18, 0.3, d / 2 + 0.03);
    put(box(0.36, 0.3, 0.05, G('#bfe0f2', '#bdbdbd')), w * 0.24, 0.62, d / 2 + 0.03);
    put(box(0.6, 0.06, 0.34, WOOD), w * 0.22, 0.42, d / 2 + 0.17);              // sacada de madeira
    put(box(0.6, 0.16, 0.03, WOOD), w * 0.22, 0.53, d / 2 + 0.33);
    put(box(0.5, 0.04, 0.5, G('#cfc6b0', '#bdbdbd')), -w * 0.18, 0.02, d / 2 + 0.3);   // caminho até a rua
  };
  const lots = [[5.95, -1.4], [5.95, 0.4], [5.95, 3.6], [5.95, 5.6]];
  let ci = 0;
  for (const s of [-1, 1]) {
    lots.forEach(([x, z], k) => house(s * x, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, roof(ci++), 1.5, k % 2 ? 1.25 : 1.0, 1.15));
    for (const [x, z, k] of [[6.75, -2.25, 0], [6.8, 1.2, 1], [6.75, 4.6, 2], [6.75, 6.6, 0], [5.0, 6.75, 1]]) tree(s * x, PY, z, 0.36, k);
    for (const [x, z] of [[5.2, -4.1], [6.4, -4.05]]) tree(s * x, PY, z, 0.34, 2);
    for (const z of [-2.2, 1.0, 2.9, 4.7, 6.6]) add(sphere(0.16, LEAF[1], 7, 5), s * 4.78, PY + 0.12, z);   // arbustos junto à calçada
  }
}
