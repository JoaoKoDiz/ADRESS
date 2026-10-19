// Maquete do Bairro 15 (Colheita): sede rural no meio dos talhões.
// Norte (fundo, atrás da placa) = lavouras; sul (frente) = a sede com casa de varanda, celeiro, galpão, silo e pomar.
// Estrada de terra vem da entrada norte, passa pela sede e se divide para os dois lados.
export const signY = 9;
export const thumb = { dir: [-9, 17, 21], k: 0.82, dy: -0.5 };

export function build(ctx) {
  const { THREE, g, add, G, box, cone, sphere, cyl, at, mat } = ctx;
  const Y = 0.4;                                         // topo do gramado
  const C = (c, gc = '#9e9e9e') => G(c, gc);
  const DIRT = C('#c9a170', '#b2b2b2'), WOOD = C('#8a5a34', '#7a7a7a'), WOODL = C('#b98a56', '#9a9a9a');

  // ---- base: barranco de terra, gramado e cerca de madeira na borda (no lugar da sebe)
  add(box(15, 0.3, 15, C('#a07a52', '#a8a8a8')), 0, 0.15, 0);
  add(box(14.4, 0.1, 14.4, C('#8a6a44', '#9c9c9c')), 0, 0.32, 0);
  add(box(14, 0.08, 14, C('#9cc565', '#b0b0b0')), 0, 0.36, 0);
  const fence = (ax, az, bx, bz, h = 0.5) => {
    const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), n = Math.max(1, Math.round(len / 1.0));
    for (let k = 0; k <= n; k++) add(box(0.1, h, 0.1, WOOD), ax + (bx - ax) * k / n, Y + h / 2, az + (bz - az) * k / n);
    for (const y of [h * 0.45, h * 0.85]) add(box(0.05, 0.06, len, WOODL), (ax + bx) / 2, Y + y, (az + bz) / 2, 0, ry, 0);
  };
  const gate = (x, z, ry, w = 1.0) => {                 // porteira aberta pela metade (madeira clara, travessa diagonal)
    const gg = new THREE.Group(); gg.position.set(x, Y, z); gg.rotation.y = ry; g.add(gg);
    for (const sx of [-1, 1]) gg.add(at(box(0.14, 0.62, 0.14, WOOD), sx * w / 2, 0.31, 0));
    const leaf = new THREE.Group(); leaf.position.set(-w / 2, 0, 0); leaf.rotation.y = -0.9; gg.add(leaf);
    for (const y of [0.16, 0.4]) leaf.add(at(box(w * 0.92, 0.06, 0.05, WOODL), w * 0.46, y, 0));
    leaf.add(at(box(Math.hypot(w * 0.92, 0.24), 0.05, 0.05, WOODL), w * 0.46, 0.28, 0, 0, 0, Math.atan2(0.24, w * 0.92)));
  };
  // cerca da borda (com a abertura da estrada de entrada ao norte e as das saídas leste/oeste)
  fence(-6.9, -6.9, -0.4, -6.9); fence(1.4, -6.9, 6.9, -6.9);
  fence(-6.9, 6.9, 6.9, 6.9);
  fence(-6.9, -6.9, -6.9, -2.3); fence(-6.9, -0.7, -6.9, 6.9);
  fence(6.9, -6.9, 6.9, -0.9); fence(6.9, 0.6, 6.9, 6.9);

  // ---- estradas de terra (trechos + juntas redondas = curvas suaves)
  const road = (pts, w = 1.05) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], len = Math.hypot(bx - ax, bz - az);
      add(box(w, 0.05, len, DIRT), (ax + bx) / 2, Y + 0.025, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
    }
    for (const [x, z] of pts) add(cyl(w / 2, w / 2, 0.05, DIRT, 8), x, Y + 0.026, z);
  };
  const F = [0.1, -0.7];                                 // bifurcação, logo acima da sede
  road([[0.5, -7.0], [0.6, -5.0], [0.1, -2.8], F]);                     // entrada (norte)
  road([F, [-2.0, -1.2], [-4.4, -1.4], [-7.0, -1.5]]);                  // ramo oeste
  road([F, [2.4, -0.3], [4.6, -0.5], [7.0, -0.15]]);                    // ramo leste
  road([F, [0.6, 1.4]], 0.9);                                           // acesso à sede
  add(box(5.2, 0.05, 1.8, DIRT), 1.3, Y + 0.03, 2.2);                   // pátio de manobra
  // marcas de pneu (sulcos um pouco mais escuros) no pátio
  for (const dz of [-0.25, 0.25]) add(box(4.2, 0.012, 0.1, C('#b28a5c', '#a5a5a5')), 1.3, Y + 0.061, 2.2 + dz);

  // ---- talhões do norte: milho (oeste) e trigo em colheita (leste)
  // milharal: terra, fileiras altas com espigas
  add(box(5.4, 0.04, 4.6, C('#7a5a36', '#8f8f8f')), -3.9, Y + 0.02, -4.4);
  for (let x = -6.3; x <= -1.5; x += 0.6) {
    add(box(0.32, 0.75, 4.2, C('#6ea43a', '#9c9c9c')), x, Y + 0.415, -4.4);
    for (let z = -6.1; z <= -2.7; z += 0.85) add(box(0.36, 0.12, 0.14, C('#f2cf4a', '#bcbcbc')), x, Y + 0.84, z + (x * 7 % 3) * 0.1);
  }
  fence(-6.6, -2.0, -1.5, -2.0, 0.4);
  // trigal dourado: parte colhida (palha clara listrada) e parte de pé, colheitadeira na divisa
  add(box(5.6, 0.04, 4.8, C('#d9c27a', '#b4b4b4')), 3.9, Y + 0.02, -4.3);
  for (let x = 1.4; x <= 6.4; x += 0.42) add(box(0.14, 0.02, 4.6, C('#c7ad62', '#a9a9a9')), x, Y + 0.05, -4.3);   // restolho
  add(box(3.3, 0.42, 4.6, C('#e8c24a', '#bfbfbf')), 4.85, Y + 0.25, -4.3);                                         // trigo de pé
  for (let x = 3.35; x <= 6.4; x += 0.5) add(box(0.06, 0.03, 4.6, C('#d4a832', '#b0b0b0')), x, Y + 0.475, -4.3);    // sulcos do trigo
  fence(1.6, -1.6, 6.6, -1.6, 0.4);
  { // colheitadeira (verde, plataforma de corte amarela) avançando para o norte na borda do trigo
    const cg = new THREE.Group(); cg.position.set(2.75, Y, -3.4); g.add(cg);
    cg.add(at(box(0.9, 0.62, 1.3, C('#3f9a3a', '#8a8a8a')), 0, 0.55, 0.15));
    cg.add(at(box(0.6, 0.5, 0.55, C('#3f9a3a', '#8a8a8a')), 0.05, 1.1, -0.15));
    cg.add(at(box(0.62, 0.32, 0.5, C('#9fd3f0', '#c4c4c4')), 0.05, 1.12, -0.17));
    cg.add(at(box(0.66, 0.06, 0.6, C('#f2f2ee', '#d8d8d8')), 0.05, 1.38, -0.15));
    cg.add(at(box(1.5, 0.22, 0.42, C('#f2cf4a', '#b5b5b5')), 0, 0.3, -0.75));      // plataforma de corte
    cg.add(at(cyl(0.11, 0.11, 1.4, C('#d9a520', '#a5a5a5'), 8), 0, 0.42, -0.84, 0, 0, Math.PI / 2));   // molinete
    cg.add(at(box(0.12, 0.12, 0.9, C('#3f9a3a', '#8a8a8a')), 0.5, 1.0, 0.25, 0.35, 0, 0));          // tubo de descarga
    for (const sx of [-1, 1]) {
      cg.add(at(cyl(0.3, 0.3, 0.18, C('#222222', '#444444'), 10), sx * 0.52, 0.3, -0.15, 0, 0, Math.PI / 2));
      cg.add(at(cyl(0.2, 0.2, 0.14, C('#222222', '#444444'), 10), sx * 0.48, 0.2, 0.65, 0, 0, Math.PI / 2));
    }
  }

  // ---- talhões do sul-oeste: horta em canteiros e pasto cercado com vacas
  add(box(5.0, 0.04, 2.3, C('#7a5a36', '#8f8f8f')), -4.2, Y + 0.02, 0.85);
  for (let z = 0.05; z <= 1.7; z += 0.4) {
    add(box(4.6, 0.08, 0.24, C('#6b4a2a', '#8a8a8a')), -4.2, Y + 0.08, z);
    for (let x = -6.2; x <= -2.3; x += 0.5) add(box(0.24, 0.16, 0.24, C((Math.round(z * 10) % 3) ? '#4fae4a' : '#2f8a3a', '#a0a0a0')), x, Y + 0.2, z, 0, 0.6, 0);
  }
  // pasto
  add(box(5.2, 0.03, 4.0, C('#86c25a', '#a8a8a8')), -4.1, Y + 0.015, 4.5);
  fence(-6.6, 2.5, -1.5, 2.5); fence(-6.6, 2.5, -6.6, 6.5); fence(-6.6, 6.5, -1.5, 6.5);
  fence(-1.5, 2.5, -1.5, 3.4); fence(-1.5, 4.4, -1.5, 6.5); gate(-1.5, 3.9, Math.PI / 2, 1.0);
  const cow = (x, z, ry) => {
    const cg = new THREE.Group(); cg.position.set(x, Y, z); cg.rotation.y = ry; g.add(cg);
    cg.add(at(box(0.62, 0.32, 0.32, C('#f4f1ea', '#d0d0d0')), 0, 0.42, 0));
    cg.add(at(box(0.22, 0.2, 0.33, C('#2b2b2b', '#6a6a6a')), -0.1, 0.46, 0));
    cg.add(at(box(0.22, 0.22, 0.22, C('#f4f1ea', '#d0d0d0')), 0.38, 0.52, 0));
    cg.add(at(box(0.1, 0.12, 0.18, C('#e8a7a0', '#b5b5b5')), 0.5, 0.46, 0));
    for (const [lx, lz] of [[-0.22, -0.1], [-0.22, 0.1], [0.22, -0.1], [0.22, 0.1]]) cg.add(at(box(0.08, 0.26, 0.08, C('#f4f1ea', '#d0d0d0')), lx, 0.13, lz));
  };
  cow(-5.4, 3.6, 0.4); cow(-3.6, 4.9, 2.6); cow(-5.0, 5.6, -0.9);
  add(box(0.8, 0.22, 0.32, C('#7a5434', '#7a7a7a')), -2.6, Y + 0.11, 5.8);       // cocho
  add(box(0.7, 0.04, 0.24, C('#5aa9e6', '#a5a5a5')), -2.6, Y + 0.23, 5.8);

  // ---- sede (frente, no centro): casa com varanda, celeiro vermelho, galpão, silo e caixa-d'água
  const gable = (w, h, d, c, x, y, z, ry = 0) => {        // telhado de duas águas, cumeeira ao longo de x (antes de girar)
    const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2);
    const m = new THREE.Mesh(geo, mat(c)); m.castShadow = m.receiveShadow = true;
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = ry; m.rotation.y = Math.PI / 2; p.add(m); g.add(p);
  };
  // casa (frente para o pátio, ao norte)
  { const HX = -0.2, HZ = 4.5;
    add(box(2.4, 1.15, 1.7, C('#f3e6c8', '#cfcfcf')), HX, Y + 0.575, HZ);
    gable(2.7, 0.75, 2.1, C('#3f6fb0', '#8c8c8c'), HX, Y + 1.15, HZ);
    add(box(2.4, 0.08, 0.8, WOODL), HX, Y + 0.08, HZ - 1.25);                      // varanda: piso, colunas, cobertura
    for (const dx of [-1.1, 0, 1.1]) add(box(0.09, 0.74, 0.09, C('#ffffff', '#dddddd')), HX + dx, Y + 0.45, HZ - 1.57);
    add(box(2.55, 0.07, 0.95, C('#3f6fb0', '#8c8c8c')), HX, Y + 0.86, HZ - 1.22, 0.14, 0, 0);
    add(box(0.42, 0.7, 0.05, C('#6b4428', '#5c5c5c')), HX + 0.35, Y + 0.35, HZ - 0.86);
    for (const dx of [-0.6]) add(box(0.5, 0.36, 0.05, C('#9fd3f0', '#bdbdbd')), HX + dx, Y + 0.6, HZ - 0.86);
    add(box(0.3, 0.55, 0.3, C('#a5503a', '#8a8a8a')), HX - 0.75, Y + 1.55, HZ + 0.3);   // chaminé
  }
  // celeiro vermelho (porta grande para o pátio)
  { const BX = 3.0, BZ = 4.6;
    add(box(2.2, 1.45, 2.2, C('#b8382e', '#9a9a9a')), BX, Y + 0.725, BZ);
    gable(2.2, 0.95, 2.6, C('#6e737a', '#7a7a7a'), BX, Y + 1.45, BZ, Math.PI / 2);
    add(box(1.1, 1.0, 0.05, C('#f4efe6', '#dddddd')), BX, Y + 0.5, BZ - 1.12);
    add(box(0.95, 0.85, 0.06, C('#8f2a22', '#8a8a8a')), BX, Y + 0.47, BZ - 1.13);
    for (const s of [-1, 1]) add(box(0.06, 1.25, 0.07, C('#f4efe6', '#dddddd')), BX, Y + 0.47, BZ - 1.15, 0, 0, s * 0.85);
    add(box(0.4, 0.4, 0.05, C('#f4efe6', '#dddddd')), BX, Y + 1.72, BZ - 1.12 - 0.12);
    // silo ao lado
    add(cyl(0.5, 0.5, 2.1, C('#c9ccd0', '#b5b5b5'), 12), BX + 1.75, Y + 1.05, BZ + 0.4);
    add(sphere(0.5, C('#9aa0a8', '#9a9a9a'), 12, 6), BX + 1.75, Y + 2.1, BZ + 0.4);
    for (const y of [0.6, 1.2, 1.8]) add(cyl(0.52, 0.52, 0.05, C('#9aa0a8', '#9a9a9a'), 12), BX + 1.75, Y + y, BZ + 0.4);
    // fardos de feno junto ao celeiro
    for (const [x, z] of [[1.6, 3.3], [1.6, 3.85], [1.6, 3.57]]) add(cyl(0.26, 0.26, 0.42, C('#e6c35a', '#b0b0b0'), 10), x, Y + (z === 3.57 ? 0.68 : 0.26), z, 0, 0, Math.PI / 2);
  }
  // caixa-d'água em torre, atrás da casa
  for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) add(box(0.07, 1.2, 0.07, WOOD), -1.9 + dx, Y + 0.6, 5.9 + dz);
  add(cyl(0.42, 0.42, 0.55, C('#5a8fc0', '#8a8a8a'), 12), -1.9, Y + 1.47, 5.9); add(cone(0.46, 0.25, C('#4a6f96', '#7a7a7a'), 12), -1.9, Y + 1.87, 5.9);
  // galinhas no pátio
  for (const [x, z, r] of [[-0.9, 2.1, 0.3], [-1.2, 2.5, 2.1], [-0.6, 2.6, 4.0]]) {
    add(sphere(0.13, C('#ffffff', '#dddddd'), 6, 4), x, Y + 0.15, z);
    add(sphere(0.08, C('#ffffff', '#dddddd'), 5, 3), x + Math.cos(r) * 0.12, Y + 0.27, z + Math.sin(r) * 0.12);
    add(box(0.04, 0.06, 0.06, C('#e0402a', '#9a9a9a')), x + Math.cos(r) * 0.12, Y + 0.36, z + Math.sin(r) * 0.12);
  }

  // ---- pomar (sudeste) e quebra-vento
  const tree = (x, z, r, c = '#3f8f3a', fruit) => {
    add(cyl(0.08, 0.11, 0.5, C('#6b4526', '#6a6a6a'), 6), x, Y + 0.25, z);
    add(sphere(r, C(c, '#8a8a8a'), 6, 4), x, Y + 0.5 + r * 0.8, z);
    if (fruit) for (const [dx, dy, dz] of [[0.6, 0.1, 0.55], [-0.5, 0.0, 0.6], [0.1, 0.45, 0.75]]) add(sphere(0.07, C(fruit, '#a5a5a5'), 4, 3), x + dx * r, Y + 0.5 + r * 0.8 + dy * r, z + dz * r);
  };
  for (const x of [5.0, 6.1]) for (const z of [3.1, 4.3, 5.5]) tree(x, z, 0.42, '#4f9a3c', '#e0402a');
  for (const x of [-6.2, -4.9, -3.6, -2.3, -1.0, 0.3, 1.6, 2.9, 4.2]) tree(x + (x * 3 % 1) * 0.2, 6.2 + ((x * 7) % 2 ? 0 : 0.1), 0.34, '#3f7f3a');

  // ---- trator vermelho na estrada leste, puxando uma carreta de feno
  { const tg = new THREE.Group(); tg.position.set(3.4, Y, -0.38); tg.rotation.y = Math.PI / 2 - 0.05; g.add(tg);
    const RED = C('#c8402f', '#8a8a8a');
    tg.add(at(box(0.5, 0.36, 0.95, RED), 0, 0.4, 0.15));
    tg.add(at(box(0.5, 0.5, 0.45, RED), 0, 0.72, -0.25));
    tg.add(at(box(0.44, 0.3, 0.46, C('#9fd3f0', '#c4c4c4')), 0, 0.85, -0.25));
    tg.add(at(box(0.56, 0.05, 0.56, C('#f2f2ee', '#d8d8d8')), 0, 1.03, -0.25));
    tg.add(at(cyl(0.035, 0.035, 0.32, C('#333333', '#555555'), 6), 0.14, 0.75, 0.42));
    for (const s of [-1, 1]) {
      tg.add(at(cyl(0.27, 0.27, 0.16, C('#222222', '#444444'), 10), s * 0.33, 0.27, -0.28, 0, 0, Math.PI / 2));
      tg.add(at(cyl(0.16, 0.16, 0.12, C('#222222', '#444444'), 8), s * 0.3, 0.16, 0.48, 0, 0, Math.PI / 2));
    }
    tg.add(at(box(0.6, 0.12, 0.85, WOODL), 0, 0.3, -1.25));                     // carreta
    for (const s of [-1, 1]) tg.add(at(cyl(0.13, 0.13, 0.1, C('#222222', '#444444'), 8), s * 0.33, 0.13, -1.25, 0, 0, Math.PI / 2));
    for (const dz of [-1.45, -1.05]) tg.add(at(cyl(0.18, 0.18, 0.45, C('#e6c35a', '#b0b0b0'), 8), 0, 0.54, dz, 0, 0, Math.PI / 2));
  }
}
