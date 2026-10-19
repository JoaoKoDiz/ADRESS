// Maquete do Bairro 21 (Operário): vila operária e zona de serviço misturadas, como no bairro real (workPlan.js / models/work.js).
// Avenidinha da entrada (norte → sul) e duas ruas leste–oeste; fileiras de casas geminadas (duas águas com a cumeeira ao longo da
// rua, oitões nas pontas, jardinzinho com cerca branca), oficina com portão de enrolar e pátio, mercadinho de esquina com toldo,
// fábrica de tijolo com telhado em dentes de serra, doca de carga com caminhão de ré, chaminé, transportadora de telhado em arco
// com contêineres, caixa-d'água no alto, pracinha, postes e árvores verdes. Silhuetas diferentes para cada uso.

export const signY = 9;
export const thumb = { dir: [-7, 24, 26], k: 0.84, dy: -0.8 };

export function build(ctx) {
  const { THREE, g, G, box, cyl, cone, sphere, at, mat } = ctx;
  // cor → versão cinza (fase bloqueada) pela luminância
  const C = c => {
    const n = parseInt(c.slice(1), 16), l = (0.3 * (n >> 16 & 255) + 0.59 * (n >> 8 & 255) + 0.11 * (n & 255)) / 255;
    const v = Math.round(90 + l * 140).toString(16).padStart(2, '0');
    return G(c, '#' + v + v + v);
  };
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const geoCache = new Map();
  const geo = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };
  const M = (gm, c) => new THREE.Mesh(gm, mat(C(c)));
  /** grupo local (frente em +z quando ry = 0) */
  const local = (x, z, ry = 0, y = 0) => {
    const gg = new THREE.Group(); gg.position.set(x, y, z); gg.rotation.y = ry; g.add(gg);
    return (m, px, py, pz, rx = 0, ryy = 0, rz = 0) => { gg.add(at(m, px, py, pz, rx, ryy, rz)); return m; };
  };
  /** prisma triangular (oitão/telhado): seção no plano z–y (base d, altura r), comprimento w ao longo de x */
  const prism = (w, d, r, c) => M(geo(`p${w},${d},${r}`, () => {
    const s = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, r)]);
    const e = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); e.translate(0, 0, -w / 2); e.rotateY(Math.PI / 2); return e;
  }), c);
  /** dente de serra: triângulo retângulo (lado vertical em z = −t/2, virado para o norte) */
  const tooth = (w, t, r, c) => M(geo(`t${w},${t},${r}`, () => {
    const s = new THREE.Shape([new THREE.Vector2(-t / 2, 0), new THREE.Vector2(t / 2, 0), new THREE.Vector2(t / 2, r)]);
    const e = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); e.translate(0, 0, -w / 2); e.rotateY(-Math.PI / 2); return e;
  }), c);
  const Y = 0.4;                                                     // topo da grama

  // ---------- base: grama, borda de terra e sebe (com a abertura da entrada no meio do norte) ----------
  add(box(15, 0.3, 15, C('#d4cdbb')), 0, 0.15, 0);
  add(box(14, 0.4, 14, C('#95cc68')), 0, 0.2, 0);
  const HEDGE = C('#3f7d3a');
  for (const [x, z, w, d] of [[-4.0, -7, 6.4, 0.6], [4.0, -7, 6.4, 0.6], [0, 7, 14.4, 0.6], [-7, 0, 0.6, 14.4], [7, 0, 0.6, 14.4]]) add(box(w, 0.9, d, HEDGE), x, 0.65, z);

  // ---------- ruas: avenidinha da entrada e duas ruas leste–oeste (calçada, asfalto, faixa tracejada) ----------
  const SW = C('#cfcac0'), ASPH = C('#5d6470'), DASH = C('#f2d45c');
  const ZA = -2.6, ZB = 3.2;
  for (const z of [ZA, ZB]) {
    add(box(13.4, 0.05, 1.5, SW), 0, Y + 0.025, z); add(box(13.4, 0.06, 1.0, ASPH), 0, Y + 0.04, z);
    for (let x = -6.2; x < 6.4; x += 0.9) if (Math.abs(x) > 0.7) add(box(0.4, 0.02, 0.06, DASH), x, Y + 0.08, z);
  }
  add(box(1.5, 0.05, 10.55, SW), 0, Y + 0.026, -2.03); add(box(1.0, 0.06, 10.9, ASPH), 0, Y + 0.042, -2.15);   // avenidinha (do portão até a 2ª rua)
  for (let z = -6.8; z < 2.6; z += 0.9) if (Math.abs(z - ZA) > 0.7) add(box(0.06, 0.02, 0.4, DASH), 0, Y + 0.08, z);
  add(box(1.0, 0.05, 0.9, C('#c9c3b6')), 0, Y + 0.02, -7.25);                    // entrada (passa pela abertura da sebe)

  // ---------- casas geminadas: fileira de n unidades encostadas, frente para +z local (ry = 0) ou −z (ry = π) ----------
  // (x0, zf) = ponta da fileira e linha da cerca (frente do lote); corpo da casa de zf − 1.4 a zf − 0.45
  const FAC = ['#a5553a', '#efe2c4', '#8fb3d1', '#9cc39a', '#e0b25a', '#e8a8a0', '#c9b89a'], RF = ['#b5502f', '#5f646c', '#7a4a2a', '#97382a'];
  const DOOR = ['#3f8a4a', '#c8402f', '#2f6fb0', '#e8b02a'];
  let n = 0;
  const row = (x0, zf, cnt, ry, two = []) => {
    const a = local(x0, zf, ry, Y);
    for (let k = 0; k < cnt; k++) {
      const i = n++, up = two.includes(k), h = up ? 1.15 : 0.72, x = k + 0.5, fac = FAC[(i * 3) % FAC.length], rc = RF[(i + (up ? 1 : 0)) % RF.length];
      const zc = -0.925, d = 0.95;
      a(box(1.0, h, d, C(fac)), x, h / 2, zc);
      a(box(1.0, 0.07, d + 0.02, C('#cdc2aa')), x, 0.035, zc + 0.005);                                   // barrado
      a(prism(0.98, d, 0.42, C(fac)), x, h, zc);                                                         // oitão (só aparece nas pontas)
      const th = Math.atan2(0.42, d / 2), L = Math.hypot(0.42, d / 2) + 0.08;
      a(box(1.02, 0.05, L, C(rc)), x, h + 0.21, zc + d / 4 + 0.02, th); a(box(1.02, 0.05, L, C(rc)), x, h + 0.21, zc - d / 4 - 0.02, -th);
      a(box(1.04, 0.05, 0.06, C(rc)), x, h + 0.43, zc);                                                 // cumeeira
      a(box(0.06, h, 0.05, C('#ece4d4')), x - 0.5, h / 2, -0.43);                                       // pilastra da divisa
      a(box(0.24, 0.42, 0.04, C(DOOR[i % 4])), x - 0.22, 0.21, -0.43);                                  // porta
      a(box(0.3, 0.26, 0.04, C('#ffffff')), x + 0.2, 0.42, -0.435); a(box(0.22, 0.18, 0.05, C('#8fc6e8')), x + 0.2, 0.42, -0.43);
      if (up) for (const wx of [-0.22, 0.2]) { a(box(0.3, 0.26, 0.04, C('#ffffff')), x + wx, 0.86, -0.435); a(box(0.22, 0.18, 0.05, C('#8fc6e8')), x + wx, 0.86, -0.43); }
      for (const wy of up ? [0.42, 0.86] : [0.42]) { a(box(0.3, 0.24, 0.04, C('#ffffff')), x + 0.12, wy, -1.405); a(box(0.22, 0.17, 0.05, C('#8fc6e8')), x + 0.12, wy, -1.41); }   // janela dos fundos
      a(box(0.22, 0.4, 0.04, C('#6b4428')), x - 0.25, 0.2, -1.405);                                      // porta dos fundos
      if (i % 3 === 0) a(box(0.14, 0.3, 0.14, C('#8a4632')), x + 0.28, h + 0.32, zc - 0.22);           // chaminé
      a(box(1.0, 0.03, 0.42, C('#7fc45c')), x, 0.015, -0.22);                                            // jardinzinho
      a(box(0.12, 0.03, 0.42, C('#e2d9c5')), x - 0.22, 0.03, -0.22);                                    // caminho até a porta
      a(box(0.64, 0.14, 0.04, C('#fbf8f1')), x + 0.15, 0.07, -0.02);                                     // cerca de estacas (portão aberto em frente à porta)
      a(box(0.04, 0.14, 0.42, C('#a57a4c')), x + 0.5, 0.07, -0.22);                                      // divisa de madeira
      if (i % 4 === 1) a(sphere(0.12, C('#e0402a'), 6, 4), x + 0.3, 0.08, -0.15);                        // flores
    }
  };
  // ---------- árvore verde (como as do bairro) ----------
  const tree = (x, z, r = 0.42, c = '#4f9a3e') => { add(cyl(0.07, 0.09, 0.5, C('#6b4526'), 6), x, Y + 0.25, z); add(sphere(r, C(c), 8, 6), x, Y + 0.5 + r * 0.7, z); };
  const backyard = (x0, x1, z0, z1) => {                                                                // quintal dos fundos: grama mais escura e cerca de madeira
    add(box(x1 - x0, 0.02, z1 - z0, C('#86bd5c')), (x0 + x1) / 2, Y + 0.01, (z0 + z1) / 2);
  };

  // NO: fileira virada para a 1ª rua (frente para o sul), quintais atrás
  row(-6.55, -3.38, 5, 0, [1, 3]);
  backyard(-6.55, -1.55, -6.6, -4.85);
  tree(-5.7, -5.8, 0.36); tree(-3.2, -6.0, 0.4); tree(-1.15, -4.2, 0.36);
  for (let x = -6.3; x < -1.6; x += 1.2) add(box(0.04, 0.12, 0.04, C('#a57a4c')), x, Y + 0.06, -5.6);
  add(box(4.9, 0.03, 0.03, C('#a57a4c')), -4.05, Y + 0.1, -5.6);

  // L-centro: fileira virada para a 2ª rua (sul); atrás, junto à 1ª rua, o pátio de serviço e a pracinha
  row(0.85, 2.42, 5, 0, [1, 3]);
  backyard(0.85, 5.85, 0.0, 1.0);
  for (let x = 1.05; x < 5.85; x += 1.0) add(box(0.04, 0.12, 0.04, C('#a57a4c')), x, Y + 0.06, 0.05);
  add(box(5.0, 0.03, 0.03, C('#a57a4c')), 3.35, Y + 0.1, 0.05);
  {                                                        // pátio de serviço: concreto, telheiro, paletes, caixas e tambores
    const x0 = 0.9, x1 = 3.7, z0 = -1.75, z1 = -0.1;
    add(box(x1 - x0, 0.04, z1 - z0, C('#b9b3a6')), (x0 + x1) / 2, Y + 0.02, (z0 + z1) / 2);
    const a = local(1.75, -0.45, 0, Y);                                                                   // telheiro de chapa
    for (const [px, pz] of [[-0.75, -0.3], [0.75, -0.3], [-0.75, 0.3], [0.75, 0.3]]) a(box(0.05, 0.62, 0.05, C('#5a5d63')), px, 0.31, pz);
    a(box(1.7, 0.05, 0.85, C('#c8402f')), 0, 0.66, 0, 0.12);
    for (let k = 0; k < 3; k++) { a(box(0.36, 0.06, 0.3, C('#b08a5a')), -0.45 + k * 0.45, 0.05, 0); a(box(0.3, 0.26, 0.26, C('#c9a46a')), -0.45 + k * 0.45, 0.22, 0); }
    a(box(0.3, 0.22, 0.26, C('#d8b67a')), 0, 0.46, 0);
    for (let k = 0; k < 4; k++) add(cyl(0.1, 0.1, 0.26, C(['#2f6fb0', '#c8402f', '#3f8a4a', '#e8b02a'][k]), 8), 3.0 + (k % 2) * 0.24, Y + 0.17, -1.3 + Math.floor(k / 2) * 0.24);
  }
  {                                                        // pracinha: piso, árvore no meio, bancos e canteiros
    const px = 5.0, pz = -0.75;
    add(cyl(1.0, 1.0, 0.04, C('#d8cfbd'), 18), px, Y + 0.02, pz);
    add(cyl(0.34, 0.34, 0.1, C('#7a5434'), 10), px, Y + 0.07, pz); tree(px, pz, 0.48, '#5aa548');
    for (const a of [0.9, 2.6, 4.4]) {
      const bx = px + Math.cos(a) * 0.74, bz = pz + Math.sin(a) * 0.74, b = local(bx, bz, Math.atan2(-Math.cos(a), -Math.sin(a)), Y);
      b(box(0.42, 0.05, 0.14, C('#8a5a36')), 0, 0.14, 0); b(box(0.42, 0.13, 0.04, C('#8a5a36')), 0, 0.2, -0.07);
      for (const d of [-0.16, 0.16]) b(box(0.04, 0.12, 0.12, C('#5a3a22')), d, 0.06, 0);
    }
    for (const [x, z, c] of [[5.85, -1.45, '#e0402a'], [6.1, -1.3, '#f2c23a'], [6.2, -0.05, '#ff7ab0']]) add(sphere(0.12, C(c), 6, 4), x, Y + 0.08, z);
  }
  tree(6.25, 0.55, 0.36);

  // campinho de terra entre a fileira do SO e a transportadora
  {
    const x = -0.35, z = 5.3;
    add(box(1.6, 0.03, 2.2, C('#c9a46a')), x, Y + 0.015, z);
    for (const [w, d, dx, dz] of [[1.5, 0.03, 0, -1.04], [1.5, 0.03, 0, 1.04], [0.03, 2.1, -0.74, 0], [0.03, 2.1, 0.74, 0], [1.5, 0.03, 0, 0]]) add(box(w, 0.01, d, C('#f4f1ea')), x + dx, Y + 0.035, z + dz);
    for (const s of [-1, 1]) { add(box(0.04, 0.2, 0.04, C('#f4f1ea')), x - 0.22, Y + 0.1, z + s * 1.04); add(box(0.04, 0.2, 0.04, C('#f4f1ea')), x + 0.22, Y + 0.1, z + s * 1.04); add(box(0.48, 0.04, 0.04, C('#f4f1ea')), x, Y + 0.2, z + s * 1.04); }
    add(sphere(0.05, C('#ffffff'), 6, 4), x + 0.2, Y + 0.08, z + 0.3);
  }

  // SO: fileira virada para a 2ª rua (frente para o norte)
  row(-1.45, 3.98, 5, Math.PI, [0, 2, 4]);
  backyard(-6.45, -1.45, 5.6, 6.6);
  tree(-6.1, 6.1, 0.38); tree(-3.4, 6.15, 0.4);

  // ---------- veículos (frente em +x local) ----------
  const wheel = (a, x, z, r) => a(cyl(r, r, 0.08, C('#1f2023'), 8), x, r, z, Math.PI / 2, 0, 0);
  const truck = (x, z, ry, c, flat = false) => {                    // caminhão baú (ou de carroceria com carga)
    const a = local(x, z, ry, Y);
    a(box(1.9, 0.12, 0.42, C('#2e3036')), -0.05, 0.2, 0);
    a(box(0.5, 0.55, 0.62, C(c)), 0.66, 0.5, 0); a(box(0.03, 0.24, 0.5, C('#2b4a6e')), 0.92, 0.6, 0);
    if (!flat) { a(box(1.3, 0.72, 0.64, C('#f4f1ea')), -0.3, 0.62, 0); a(box(1.31, 0.06, 0.65, C(c)), -0.3, 1.0, 0); for (const s of [-1, 1]) a(box(1.0, 0.14, 0.02, C(c)), -0.3, 0.64, s * 0.33); }
    else {
      a(box(1.3, 0.07, 0.64, C('#8a5a36')), -0.3, 0.3, 0);
      for (const s of [-1, 1]) a(box(1.3, 0.16, 0.03, C('#a57a4c')), -0.3, 0.41, s * 0.31);
      for (const [bx, bz, sz, bc] of [[-0.65, -0.13, 0.26, '#c9a46a'], [-0.65, 0.14, 0.24, '#b08a5a'], [-0.28, 0, 0.3, '#d8b67a'], [0.08, -0.12, 0.24, '#c9a46a'], [0.08, 0.13, 0.22, '#b08a5a']]) a(box(sz, sz * 0.85, sz, C(bc)), bx, 0.34 + sz * 0.42, bz);
    }
    for (const wx of [-0.7, -0.4, 0.66]) for (const s of [-1, 1]) wheel(a, wx, s * 0.3, 0.14);
  };
  const fvan = (x, z, ry, c) => {                                    // furgão de entregas
    const a = local(x, z, ry, Y);
    a(box(1.0, 0.56, 0.58, C(c)), -0.12, 0.42, 0); a(box(0.34, 0.32, 0.56, C(c)), 0.55, 0.29, 0);
    a(box(0.2, 0.22, 0.5, C('#2b4a6e')), 0.4, 0.58, 0, 0, 0, -0.5);
    for (const s of [-1, 1]) a(box(0.66, 0.11, 0.02, C('#e8b02a')), -0.15, 0.44, s * 0.3);
    for (const wx of [-0.42, 0.5]) for (const s of [-1, 1]) wheel(a, wx, s * 0.27, 0.12);
  };
  const car = (x, z, ry, c) => {
    const a = local(x, z, ry, Y);
    a(box(0.86, 0.22, 0.44, C(c)), 0, 0.22, 0); a(box(0.48, 0.18, 0.4, C(c)), -0.05, 0.42, 0);
    a(box(0.04, 0.14, 0.36, C('#2b4a6e')), 0.2, 0.42, 0);
    for (const wx of [-0.28, 0.28]) for (const s of [-1, 1]) wheel(a, wx, s * 0.2, 0.1);
  };

  // ---------- NE: mercadinho de esquina (toldo e caixotes de fruta) ----------
  {
    const a = local(1.85, -3.38, 0, Y);                     // frente na linha da calçada da 1ª rua
    a(box(1.8, 0.95, 1.3, C('#efe2c4')), 0, 0.475, -0.65);
    a(box(1.86, 0.18, 1.36, C('#2f6fb0')), 0, 1.04, -0.65);                                               // platibanda
    a(box(1.2, 0.5, 0.04, C('#8fc6e8')), -0.2, 0.42, 0.005);                                              // vitrine
    a(box(0.3, 0.55, 0.04, C('#3f8a4a')), 0.62, 0.275, 0.005);
    for (let k = 0; k < 6; k++) a(box(0.3, 0.04, 0.4, C(k % 2 ? '#f4f1ea' : '#2f6fb0')), -0.75 + k * 0.3, 0.78, 0.17, 0.35);   // toldo listrado
    a(box(1.4, 0.2, 0.03, C('#f4f1ea')), 0, 0.9, 0.01);                                                   // placa
    for (let k = 0; k < 3; k++) { a(box(0.26, 0.14, 0.2, C('#a8743e')), -0.6 + k * 0.32, 0.07, 0.25); a(sphere(0.07, C(['#d22a24', '#f2b43a', '#5ea84e'][k]), 6, 4), -0.6 + k * 0.32, 0.17, 0.25); }
  }
  // ---------- NE: oficina mecânica (portão de enrolar, placa, pátio de concreto com van e pneus) ----------
  {
    const a = local(4.5, -3.38, 0, Y), gw = 2.6;
    a(box(gw, 0.04, 1.0, C('#b9b3a6')), 0, 0.02, -0.5);                                                  // pátio
    a(box(gw, 1.15, 1.6, C('#a5553a')), 0, 0.575, -1.8);
    a(box(gw + 0.06, 0.2, 1.66, C('#ece4d4')), 0, 1.22, -1.8);                                            // platibanda
    a(box(gw - 0.1, 0.05, 1.5, C('#7a7f86')), 0, 1.3, -1.8);
    a(box(1.3, 0.8, 0.04, C('#3b2c1e')), -0.4, 0.42, -0.99); a(box(1.2, 0.74, 0.05, C('#2f6fb0')), -0.4, 0.39, -0.98);   // portão de enrolar
    for (let y = 0.1; y < 0.75; y += 0.1) a(box(1.2, 0.015, 0.02, C('#22507e')), -0.4, y, -0.95);
    a(box(0.28, 0.5, 0.05, C('#e8b02a')), 0.75, 0.25, -0.98);                                             // porta do escritório
    a(box(1.9, 0.24, 0.04, C('#f4f1ea')), 0, 0.98, -0.975);                                              // placa
    for (let k = 0; k < 4; k++) a(box(0.32, 0.03, 0.04, C('#2b2d33')), -0.66 + k * 0.44, 0.98, -0.95);
    for (let k = 0; k < 4; k++) a(cyl(0.11, 0.11, 0.07, C('#1f2023'), 10), 1.05, 0.04 + k * 0.075, -0.75);   // pilha de pneus
    for (let k = 0; k < 2; k++) a(cyl(0.11, 0.11, 0.07, C('#1f2023'), 10), 0.8, 0.04 + k * 0.075, -0.78);
  }
  fvan(4.2, -3.85, Math.PI / 2 + 0.15, '#f4f1ea');                                                        // van entrando na oficina
  // caixa-d'água no alto (fundos da oficina)
  {
    const x = 6.25, z = -6.0, LEG = C('#5a5d63');
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) add(box(0.06, 1.9, 0.06, LEG), x + dx, Y + 0.95, z + dz);
    for (const y of [0.6, 1.3]) { add(box(0.66, 0.04, 0.04, LEG), x, Y + y, z - 0.3); add(box(0.66, 0.04, 0.04, LEG), x, Y + y, z + 0.3); add(box(0.04, 0.04, 0.66, LEG), x - 0.3, Y + y, z); add(box(0.04, 0.04, 0.66, LEG), x + 0.3, Y + y, z); }
    add(cyl(0.5, 0.5, 0.6, C('#c9ccd1'), 14), x, Y + 2.2, z); add(cone(0.55, 0.3, C('#9aa0a8'), 14), x, Y + 2.65, z);
    add(cyl(0.51, 0.51, 0.04, C('#8a9098'), 14), x, Y + 2.05, z);
  }
  tree(2.5, -6.1, 0.4); tree(0.95, -5.6, 0.34);

  // ---------- O-centro: fábrica de tijolo com telhado em dentes de serra, chaminé e doca de carga com caminhão de ré ----------
  {
    const x0 = -6.5, x1 = -3.3, z0 = -1.55, z1 = 2.3, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, H = 1.2, BR = C('#9a4c34');
    add(box(w, H, d, BR), cx, Y + H / 2, cz);
    add(box(w + 0.06, 0.08, d + 0.06, C('#cfc6b4')), cx, Y + H + 0.04, cz);                              // capa do muro
    const nT = 4, tz = d / nT;
    for (let k = 0; k < nT; k++) {
      const zc = z0 + tz * (k + 0.5);
      add(tooth(w - 0.12, tz, 0.55, C(k % 2 ? '#7a7f86' : '#8a9098')), cx, Y + H + 0.08, zc);
      add(box(w - 0.16, 0.42, 0.03, C('#b8d4e6')), cx, Y + H + 0.08 + 0.25, zc + tz / 2 + 0.018);        // vidraça do dente
    }
    for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.62) add(box(0.32, 0.5, 0.03, C('#3a4a5a')), x, Y + 0.6, z0 - 0.01);   // janelões (rua)
    for (let x = x0 + 0.4; x < x1 - 0.2; x += 0.62) add(box(0.32, 0.5, 0.03, C('#3a4a5a')), x, Y + 0.68, z1 + 0.01);   // janelões (sul)
    add(box(2.2, 0.22, 0.03, C('#efe2c4')), cx, Y + 1.05, z1 + 0.02);                                      // letreiro pintado
    for (let k = 0; k < 6; k++) add(box(0.22, 0.05, 0.02, C('#7a3a28')), cx - 0.9 + k * 0.36, Y + 1.05, z1 + 0.035);
    for (let k = 0; k < 2; k++) add(box(0.03, 0.62, 0.7, C('#5a6a72')), x1 + 0.01, Y + 0.33, -0.55 + k * 1.35);      // portões da doca (leste)
    add(box(0.3, 0.2, 2.6, C('#b9b3a6')), x1 + 0.15, Y + 0.1, 0.1);                                       // plataforma da doca
    add(box(0.42, 0.04, 2.9, C('#7a7f86')), x1 + 0.2, Y + H - 0.25, 0.1);                                 // marquise da doca
    // chaminé de tijolo com anéis
    add(cyl(0.2, 0.28, 2.6, BR, 10), -6.05, Y + 1.3, 1.85);
    for (const y of [0.8, 1.6, 2.3]) add(cyl(0.3 - y * 0.03, 0.3 - y * 0.03, 0.06, C('#7a3a28'), 10), -6.05, Y + y, 1.85);
    add(cyl(0.22, 0.2, 0.14, C('#3a3d44'), 10), -6.05, Y + 2.65, 1.85);
    // pátio de carga: concreto, faixas amarelas, paletes, tambores e uma empilhadeira
    add(box(2.45, 0.04, 3.85, C('#b9b3a6')), -2.05, Y + 0.02, cz);
    for (const z of [-0.95, 0.4, 1.75]) add(box(1.6, 0.02, 0.05, DASH), -2.4, Y + 0.05, z);
    truck(-2.05, -0.55, 0, '#c8402f');                                                              // de ré na doca 1
    for (let k = 0; k < 3; k++) { add(box(0.36, 0.06, 0.3, C('#b08a5a')), -2.75 + k * 0.42, Y + 0.07, 1.95); add(box(0.28, 0.24, 0.24, C('#c9a46a')), -2.75 + k * 0.42, Y + 0.22, 1.95); }
    for (let k = 0; k < 3; k++) add(cyl(0.1, 0.1, 0.26, C(['#2f6fb0', '#c8402f', '#3f8a4a'][k]), 8), -1.05 + (k % 2) * 0.22, Y + 0.17, 1.6 + k * 0.2);
    { const a = local(-2.2, 1.05, 0, Y);                                                                   // empilhadeira
      a(box(0.36, 0.2, 0.26, C('#e8b02a')), 0, 0.17, 0); a(box(0.04, 0.4, 0.22, C('#3a3d44')), 0.2, 0.27, 0); a(box(0.2, 0.02, 0.06, C('#3a3d44')), 0.3, 0.1, -0.06); a(box(0.2, 0.02, 0.06, C('#3a3d44')), 0.3, 0.1, 0.06);
      a(box(0.02, 0.2, 0.2, C('#2b2d33')), -0.06, 0.37, 0); for (const wx of [-0.12, 0.12]) for (const s of [-1, 1]) wheel(a, wx, s * 0.13, 0.06); }
  }

  // ---------- SE: transportadora (galpão de telhado em arco), contêineres e caminhão de carroceria ----------
  {
    const x0 = 0.85, x1 = 4.5, z0 = 4.75, z1 = 6.6, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, H = 0.95;
    add(box(w, H, d, C('#d8d2c4')), cx, Y + H / 2, cz);
    add(M(geo(`arc${w},${d}`, () => new THREE.CylinderGeometry(d / 2 + 0.06, d / 2 + 0.06, w + 0.1, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2)), C('#7d8794')), cx, Y + H, cz);
    for (let x = x0 + 0.3; x < x1; x += 0.46) add(box(0.03, 0.03, d + 0.02, C('#5f6873')), x, Y + H + d / 2 + 0.05, cz);   // nervuras do arco
    for (let k = 0; k < 3; k++) add(box(0.66, 0.66, 0.03, C('#5a6a72')), x0 + 0.65 + k * 1.15, Y + 0.34, z0 - 0.01);       // 3 portões de carga
    add(box(w - 0.2, 0.18, 0.06, C('#2f6fb0')), cx, Y + H - 0.12, z0 - 0.02);                                                // faixa com o nome
    add(box(w, 0.04, 0.75, C('#b9b3a6')), cx, Y + 0.02, 4.37);                                                               // pátio
    for (const x of [1.25, 2.4, 3.55]) add(box(0.05, 0.02, 0.6, DASH), x + 0.5, Y + 0.05, 4.37);
    truck(2.6, 4.35, 0, '#3f8a4a', true);
    // contêineres empilhados (nervuras) e van estacionada
    const CT = ['#c8402f', '#2f6fb0', '#e8a23a', '#3f8a4a'];
    for (const [x, z, y, c] of [[5.6, 4.95, 0, 0], [5.6, 5.6, 0, 1], [5.6, 5.27, 1, 2], [5.6, 6.3, 0, 3]]) {
      const a = local(x, z, 0, Y + y * 0.5);
      a(box(1.25, 0.5, 0.6, C(CT[c])), 0, 0.25, 0);
      for (let r = -0.5; r <= 0.51; r += 0.25) a(box(0.03, 0.44, 0.62, C(['#a3342a', '#22507e', '#c28630', '#2f6e3a'][c])), r, 0.25, 0);
    }
    fvan(6.0, 4.15, Math.PI, '#f2c23a');
  }

  // ---------- trânsito, postes e árvores das calçadas ----------
  car(-0.22, -5.2, Math.PI / 2, '#c8402f'); fvan(-4.6, ZB + 0.24, 0, '#2f6fb0'); car(3.6, ZA - 0.22, Math.PI, '#e8e2d4');
  const POLE = C('#3a3d44'), BULB = C('#fff1c8');
  for (const [x, z] of [[-0.68, -5.6], [0.68, -1.0], [-3.0, ZA + 0.68], [3.4, ZB - 0.68], [-3.0, ZB + 0.68]]) {
    add(cyl(0.025, 0.03, 0.85, POLE, 5), x, Y + 0.43, z); add(box(0.22, 0.04, 0.07, POLE), x, Y + 0.85, z); add(box(0.14, 0.02, 0.05, BULB), x, Y + 0.83, z);
  }
  tree(0.68, -6.4, 0.32); tree(-0.68, -0.9, 0.3); tree(0.65, 4.3, 0.3);
}
