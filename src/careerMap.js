// Carreira: mapa de seleção de fases em 3D com cara de menu 2D.
// Estrada com curvas suaves, miniaturas de bairros (fases) ao lado; a van anda sozinha pela estrada:
// A recua, D avança. Perto de um bairro aparece "E — Jogar". (Todas as fases levam à mesma partida, por enquanto.)
import * as THREE from 'three';
import { createVan } from './van.js';
import { box, cone, sphere, cyl, at, mat, textTexture, bakeStatic } from './models/kit.js';
import { ROOF_COL, WALL_COL } from './data.js';

const ROAD_W = 6;
const SPEED = 14;                 // unidades por segundo ao longo da estrada
const NEAR = 7;                   // distância (na estrada) para mostrar "E — Jogar"
const CAM_OFFSET = new THREE.Vector3(-24, 84, 70);   // câmera distante, ângulo fixo

const CSS = `
.cmap-prompt { position: absolute; left: 0; top: 0; z-index: 4; pointer-events: none; display: none;
  transform: translate(-50%, -100%); padding: .45em .9em; border-radius: 12px; background: #fffaf0; border: 2px solid #e8661a;
  color: #3a2a1a; font: 700 clamp(14px, 1.2vw, 18px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,.25); }
.cmap-prompt.locked { border-color: #8a8a8a; color: #5c5c5c; background: #ececec; }
.cmap-prompt b { color: #fff; background: #e8661a; border-radius: 6px; padding: 0 .4em; margin-right: .3em; }
`;

function roadGeometry(curve, samples) {
  const pos = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    curve.getPointAt(u, p); curve.getTangentAt(u, t);
    const nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1;
    pos.push(p.x + nx / l * ROAD_W / 2, 0.05, p.z + nz / l * ROAD_W / 2, p.x - nx / l * ROAD_W / 2, 0.05, p.z - nz / l * ROAD_W / 2);
    if (i < samples) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Maquete de cada fase (o que muda em cada bairro):
//   houses   — 4 casinhas e ruas em cruz (Bairro 1)
//   plaza    — 8 casinhas menores em volta de uma pracinha (Bairro 2)
//   barriers — 4 casinhas + 2 cavaletes de obra (Bairro 3)
//   trucks   — 4 casinhas + caminhão na diagonal numa rua e buraco no meio (Bairro 4)
//   gas      — posto de gasolina, prédio comercial e 1 casinha (Bairro 5)
//   city     — 3 prédios altos e 1 casinha (Bairro 6)
const MINI_KINDS = ['houses', 'plaza', 'barriers', 'trucks', 'gas', 'city'];

/** Bairro em miniatura do tipo `kind`: base de grama, sebe, ruas e o que caracteriza o bairro. gray = fase bloqueada. */
function miniNeighborhood(kind, colors, gray = false) {
  const G = (c, gc) => (gray ? gc : c);          // fase bloqueada: tudo em tons de cinza
  const roof = i => G(colors[i % colors.length], '#8c8c8c');
  const g = new THREE.Group();
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  add(box(15, 0.3, 15, G('#d4cdbb', '#b9b9b9')), 0, 0.15, 0);
  add(box(14, 0.4, 14, G('#95cc68', '#a3a3a3')), 0, 0.2, 0);
  for (const [x, z, w, d] of [[0, -7, 14.4, 0.6], [0, 7, 14.4, 0.6], [-7, 0, 0.6, 14.4], [7, 0, 0.6, 14.4]]) {
    add(box(w, 0.9, d, G('#3f7d3a', '#7a7a7a')), x, 0.65, z);
  }
  const ROADC = G('#5d6470', '#6e6e6e');
  /** Casinha com telhado de 4 águas (s = escala). */
  const house = (x, z, color, s = 1) => {
    add(box(3 * s, 2 * s, 2.6 * s, G(WALL_COL, '#cfcfcf')), x, 0.4 + s, z);
    add(cone(2.4 * s, 1.6 * s, color, 4), x, 0.4 + 2.8 * s, z, 0, Math.PI / 4, 0);
    add(box(0.6 * s, 1.1 * s, 0.1, G('#6b4428', '#5c5c5c')), x, 0.4 + 0.55 * s, z + 1.31 * s);
  };
  const tinyTree = (x, z, r = 0.5) => {
    add(cyl(0.09, 0.12, 0.6, G('#6b4526', '#6a6a6a'), 6), x, 0.75, z);
    add(sphere(r, G('#3f8f3a', '#8a8a8a'), 7, 5), x, 1.05 + r * 0.6, z);
  };

  if (kind === 'plaza') {
    // grade 3×3: ruas em volta do quarteirão do meio; 8 casinhas menores e a pracinha no centro
    for (const c of [-2.4, 2.4]) {
      add(box(14, 0.42, 1.2, ROADC), 0, 0.22, c);
      add(box(1.2, 0.42, 14, ROADC), c, 0.22, 0);
    }
    let k = 0;
    for (const z of [-4.75, 0, 4.75]) for (const x of [-4.75, 0, 4.75]) {
      if (x === 0 && z === 0) continue;
      house(x, z, roof(k++), 0.55);
    }
    add(box(3.5, 0.1, 3.5, G('#e3d9c0', '#c4c4c4')), 0, 0.45, 0);                      // piso da praça
    for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]]) {
      add(box(1.25, 0.12, 1.25, G('#7cc25a', '#9c9c9c')), x, 0.5, z);                  // canteiros
    }
    add(cyl(0.62, 0.66, 0.28, G('#cfc6b0', '#b0b0b0'), 14), 0, 0.62, 0);                 // chafariz
    add(cyl(0.5, 0.5, 0.06, G('#5aa9e6', '#9a9a9a'), 14), 0, 0.77, 0);
    add(cyl(0.1, 0.13, 0.55, G('#cfc6b0', '#b0b0b0'), 8), 0, 0.98, 0);
    add(sphere(0.16, G('#8fd0ff', '#a8a8a8'), 8, 6), 0, 1.3, 0);
    tinyTree(-1.1, -1.1, 0.42); tinyTree(1.1, 1.1, 0.42);
    for (const [x, z] of [[1.05, -1.25], [-1.05, 1.25]]) {                              // banquinhos
      add(box(0.75, 0.08, 0.26, G('#8a5a36', '#7a7a7a')), x, 0.78, z);
      add(box(0.75, 0.22, 0.06, G('#8a5a36', '#7a7a7a')), x, 0.9, z - 0.13);
    }
    return bakeStatic(g);
  }

  if (kind === 'gas') {                          // Bairro 5: prédio comercial e casinha atrás, posto na frente
    add(box(14, 0.42, 2.2, ROADC), 0, 0.22, 0);                                         // rua horizontal
    add(box(2.2, 0.42, 6, ROADC), 0, 0.22, -4);                                         // rua vertical (só atrás; o posto cobre a da frente)
    // prédio comercial de 2 andares: fachada, toldo listrado, janelas e ar-condicionado no topo
    add(box(3.4, 3.0, 2.8, G('#b5653f', '#a9a9a9')), -3.5, 1.9, -3.5);
    add(box(3.55, 0.22, 2.95, G('#8f8a82', '#8c8c8c')), -3.5, 3.5, -3.5);
    add(box(2.8, 0.5, 0.06, G('#3d5f80', '#777777')), -3.5, 2.75, -2.08);
    add(box(1.0, 1.0, 0.06, G('#3d5f80', '#777777')), -4.4, 0.95, -2.08);
    for (let k = 0; k < 6; k++) add(box(0.56, 0.08, 0.7, k % 2 ? G('#ffffff', '#d0d0d0') : G('#3a78d4', '#8a8a8a')),
      -3.5 - 1.4 + k * 0.56, 1.72, -1.85, 0.35, 0, 0);
    add(box(0.8, 0.45, 0.6, G('#d9d9d9', '#bdbdbd')), -2.7, 3.83, -4.0);
    house(3.5, -3.5, roof(0));
    // posto de gasolina (ocupa os dois lotes da frente e a rua entre eles)
    add(box(13.6, 0.12, 5.6, G('#c9c4b8', '#b4b4b4')), 0, 0.46, 3.9);
    add(box(3.4, 1.4, 1.7, G('#f6f3ec', '#d6d6d6')), -4.5, 1.2, 2.2);                   // loja de conveniência
    add(box(3.5, 0.25, 1.8, G('#3c9d55', '#8a8a8a')), -4.5, 1.98, 2.2);
    add(box(2.4, 0.6, 0.06, G('#3d5f80', '#777777')), -4.5, 1.0, 3.06);
    const cx = 0.9, cz = 4.0;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(cyl(0.12, 0.12, 1.8, G('#e9e4da', '#cfcfcf'), 8), cx + sx * 2.5, 1.42, cz + sz * 1.1);
    add(box(6.2, 0.22, 3.2, G('#f6f3ec', '#d6d6d6')), cx, 2.45, cz);                    // cobertura
    add(box(6.25, 0.2, 3.25, G('#d8312a', '#8a8a8a')), cx, 2.25, cz);                   // faixa vermelha
    for (const ix of [cx - 1.25, cx + 1.25]) {                                          // ilhas e bombas
      add(box(0.45, 0.12, 1.9, G('#e0dbd0', '#c6c6c6')), ix, 0.58, cz);
      for (const pz of [cz - 0.5, cz + 0.5]) add(box(0.32, 0.62, 0.26, G('#d8312a', '#8a8a8a')), ix, 0.95, pz);
    }
    add(box(0.18, 2.6, 0.18, G('#3a3d44', '#6a6a6a')), 5.7, 1.82, 5.9);                // totem de preços
    add(box(1.1, 1.0, 0.14, G('#d8312a', '#8a8a8a')), 5.7, 3.0, 5.9);
    add(box(0.9, 0.25, 0.16, G('#1d1d1f', '#5a5a5a')), 5.7, 2.85, 5.92);
    return bakeStatic(g);
  }

  // os outros: ruas em cruz
  add(box(14, 0.42, 2.2, ROADC), 0, 0.22, 0);
  add(box(2.2, 0.42, 14, ROADC), 0, 0.22, 0);

  if (kind === 'city') {                         // Bairro 6: 3 prédios altos e acinzentados + 1 casinha
    [[-3.5, -3.5, 9], [3.5, -3.5, 7], [-3.5, 3.5, 6]].forEach(([x, z, hh], i) => {
      add(box(3.6, hh, 3.2, G(['#9ea2a9', '#aeb1b6', '#8f939a'][i], '#9a9a9a')), x, 0.4 + hh / 2, z);
      for (let f = 1; f < hh / 1.4; f++) add(box(3.0, 0.5, 0.06, G('#4a6a8a', '#7a7a7a')), x, 0.4 + f * 1.4, z + 1.62);
      add(box(0.9, 0.5, 0.9, G('#7d8188', '#8a8a8a')), x + 0.8, 0.65 + hh, z - 0.6);      // casinha de máquinas no topo
    });
    house(3.5, 3.5, roof(0));
    return bakeStatic(g);
  }

  [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]].forEach(([x, z], i) => house(x, z, roof(i)));

  if (kind === 'barriers') {                     // Bairro 3: 2 cavaletes de obra (fixos na maquete)
    const sawhorse = (x, z, ry) => {
      const s = new THREE.Group();
      for (let k = 0; k < 5; k++) s.add(at(box(0.52, 0.5, 0.18, k % 2 ? G('#222222', '#555555') : G('#f2c21b', '#d0d0d0')), -1.04 + k * 0.52, 1.35, 0));
      for (const lx of [-1.1, 1.1]) s.add(at(box(0.14, 1.05, 0.5, G('#3a3d44', '#666666')), lx, 0.93, 0));
      s.add(at(sphere(0.15, G('#ff8a1e', '#9a9a9a'), 6, 4), -1.1, 1.75, 0));
      s.add(at(sphere(0.15, G('#ff8a1e', '#9a9a9a'), 6, 4), 1.1, 1.75, 0));
      s.position.set(x, 0, z); s.rotation.y = ry;
      g.add(s);
    };
    sawhorse(-4.6, 0, Math.PI / 2);              // na rua horizontal, à esquerda
    sawhorse(0, 4.6, 0);                         // na rua vertical, na frente
  }

  if (kind === 'trucks') {                       // Bairro 4: caminhão parado numa rua e buraco no meio (fixos)
    const t = new THREE.Group();
    t.add(at(box(2.0, 1.15, 1.25, G('#3a78d4', '#8a8a8a')), -0.45, 1.2, 0));             // baú
    t.add(at(box(0.85, 0.9, 1.15, G('#f4f1ea', '#d0d0d0')), 1.05, 1.07, 0));             // cabine
    t.add(at(box(0.06, 0.4, 0.95, G('#3d5f80', '#777777')), 1.49, 1.25, 0));             // para-brisa
    for (const wx of [-1.0, 0.0, 1.05]) for (const wz of [-0.55, 0.55]) {
      t.add(at(cyl(0.24, 0.24, 0.16, G('#26272b', '#555555'), 10), wx, 0.67, wz, Math.PI / 2, 0, 0));
    }
    t.position.set(0, 0, 4.2); t.rotation.y = -Math.PI / 4;   // na rua da frente, na diagonal
    g.add(t);
    add(cyl(1.05, 1.1, 0.06, G('#7a5a3a', '#7d7d7d'), 16), 0, 0.45, 0);                  // terra em volta
    add(cyl(0.8, 0.8, 0.07, G('#1b1714', '#3c3c3c'), 16), 0, 0.47, 0);                   // buraco
    for (const [x, z] of [[-1.35, 0.2], [0.25, -1.35], [-0.2, 1.35]]) add(cone(0.16, 0.45, G('#ff8a1e', '#9a9a9a'), 8), x, 0.66, z);
  }
  return bakeStatic(g);
}

function tree(x, z, s) {
  const g = new THREE.Group();
  g.add(at(cyl(0.3 * s, 0.4 * s, 1.6 * s, '#6b4526', 6), x, 0.8 * s, z));
  g.add(at(sphere(1.6 * s, '#3f8f3a', 7, 5), x, 2.6 * s, z));
  return g;
}

/** Quadro 2D "MISSÕES" (moldura de madeira, fundo creme). */
function boardTexture(gray = false) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 200;
  const g = c.getContext('2d');
  g.fillStyle = gray ? '#7d7d7d' : '#8a5a36'; g.fillRect(0, 0, 512, 200);
  g.fillStyle = gray ? '#d6d6d6' : '#fff3d6'; g.fillRect(14, 14, 484, 172);
  g.fillStyle = gray ? '#6a6a6a' : '#3a2a1a'; g.font = 'bold 96px "Trebuchet MS", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('MISSÕES', 256, 106);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const PALETTES = [['red', 'blue', 'yellow', 'green'], ['purple', 'red', 'gray', 'yellow', 'blue', 'green', 'red', 'yellow'], ['blue', 'green', 'red', 'purple'],
  ['yellow', 'gray', 'blue', 'red'], ['green', 'purple', 'yellow', 'blue'], ['red']];

/** Miniaturas (data URL) dos 6 bairros, desenhadas uma vez num renderizador próprio. Usadas na seleção do modo Livre. */
export function renderMiniThumbnails(w = 480, h = 360) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(w, h, false);
  const cam = new THREE.PerspectiveCamera(30, w / h, 1, 200);
  const urls = MINI_KINDS.map((kind, i) => {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e0', '#7aa35a', 1.5));
    const sun = new THREE.DirectionalLight('#ffffff', 2.0);
    sun.position.set(-30, 60, 40);
    scene.add(sun);
    scene.add(miniNeighborhood(kind, PALETTES[i].map(c => ROOF_COL[c])));
    cam.position.set(-6, 24, 27);
    cam.lookAt(0, 1.5, 0);
    r.render(scene, cam);
    return r.domElement.toDataURL('image/png');
  });
  r.dispose(); r.forceContextLoss();
  return urls;
}

export function createCareerMap(stageEl, audio) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const prompt = document.createElement('div');
  prompt.className = 'cmap-prompt';
  const PROMPT_OPEN = '<b>E</b> Jogar &nbsp; <b>M</b> Missões';
  prompt.innerHTML = PROMPT_OPEN;
  let promptLocked = false;
  stageEl.appendChild(prompt);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bfe3f5');
  scene.add(new THREE.HemisphereLight('#fff6e0', '#7aa35a', 1.5));
  const sun = new THREE.DirectionalLight('#ffffff', 2.0);
  sun.position.set(-30, 60, 40);
  scene.add(sun);

  // chão
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), mat('#8fc865'));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // estrada com curvas suaves
  const pts = [[0, 0], [30, -14], [62, 6], [94, -10], [126, 10], [158, -6], [190, 8], [222, -4]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const length = curve.getLength();
  scene.add(new THREE.Mesh(roadGeometry(curve, 400), mat('#5d6470', { side: THREE.DoubleSide })));
  // faixa amarela tracejada
  const dashes = new THREE.Group();
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let d = 2; d < length; d += 5) {
    curve.getPointAt(d / length, p); curve.getTangentAt(d / length, tg);
    dashes.add(at(box(2.2, 0.06, 0.3, '#f2d45c'), p.x, 0.08, p.z, 0, -Math.atan2(tg.z, tg.x), 0));
  }
  scene.add(bakeStatic(dashes));

  // fases: bairros em miniatura alternando os lados da estrada, com placa numerada
  const stops = [], boards = [];
  let clock = 0;
  [0.08, 0.25, 0.42, 0.58, 0.75, 0.92].forEach((u, i) => {
    curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    const side = i % 2 ? 1 : -1;
    const nx = -tg.z * side, nz = tg.x * side;
    const kind = MINI_KINDS[i], city = kind === 'city';   // Bairro 6: maquete com prédios altos
    const hood = miniNeighborhood(kind, PALETTES[i].map(c => ROOF_COL[c]));
    const hoodGray = miniNeighborhood(kind, [], true);
    for (const h of [hood, hoodGray]) {
      h.position.set(p.x + nx * 14, 0, p.z + nz * 14);
      h.rotation.y = -Math.atan2(tg.z, tg.x);
      scene.add(h);
    }
    // placa com o número da fase (sprite: sempre de frente para a câmera)
    const signFont = 'bold 92px "Trebuchet MS", sans-serif';
    const signTex = textTexture(`BAIRRO ${i + 1}`, { width: 512, height: 160, bg: '#e8661a', fg: '#ffffff', font: signFont });
    const signTexGray = textTexture(`BAIRRO ${i + 1}`, { width: 512, height: 160, bg: '#8a8a8a', fg: '#e6e6e6', font: signFont });
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTex }));
    sign.scale.set(9, 2.8, 1);
    sign.position.set(p.x + nx * 14, city ? 12.5 : 9, p.z + nz * 14);   // na cidade, acima dos prédios da maquete
    scene.add(sign);
    // quadro "MISSÕES" flutuando acima da maquete (M perto dela abre a lista)
    const boardTex = boardTexture(), boardTexGray = boardTexture(true);
    const board = new THREE.Sprite(new THREE.SpriteMaterial({ map: boardTex }));
    board.scale.set(10, 4, 1);
    board.position.set(p.x + nx * 14, city ? 18.5 : 15, p.z + nz * 14);
    board.userData.baseY = board.position.y;
    scene.add(board);
    boards.push(board);
    stops.push({ u, d: u * length, hood, hoodGray, sign, board, tex: [signTex, signTexGray, boardTex, boardTexGray], locked: false });
  });

  // algumas árvores longe da estrada
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const trees = new THREE.Group();
  const samples = curve.getSpacedPoints(120);
  for (let k = 0; k < 140; k++) {
    const x = -40 + rnd() * 300, z = -70 + rnd() * 140;
    if (samples.some(s => Math.hypot(s.x - x, s.z - z) < 24)) continue;
    trees.add(tree(x, z, 0.8 + rnd() * 0.7));
  }
  scene.add(bakeStatic(trees));

  // a van do jogo, levada pela estrada
  const van = createVan(scene);
  van.setGhost(true);
  let dist = stops[0].d - 10;             // começa um pouco antes do primeiro bairro
  let moving = 0, near = -1, nearLocked = -1, entered = false;

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
  const camTarget = new THREE.Vector3();

  function placeVan() {
    const u = THREE.MathUtils.clamp(dist / length, 0, 1);
    curve.getPointAt(u, p); curve.getTangentAt(u, tg);
    van.teleport(p.x, p.z, Math.atan2(tg.z, tg.x));
  }

  function updateCamera(dt) {
    const k = dt ? 1 - Math.exp(-4 * dt) : 1;
    camTarget.lerp(van.object.position, k);
    camera.position.copy(camTarget).add(CAM_OFFSET);
    camera.lookAt(camTarget);
  }

  const proj = new THREE.Vector3();
  return {
    scene, camera,
    /** startAt: índice da fase ao lado da qual a van começa (vindo do menu). Sem ele, a van fica onde estava. */
    enter(startAt) {
      if (startAt !== undefined) dist = stops[Math.max(0, Math.min(stops.length - 1, startAt))].d;
      else if (!entered) dist = stops[0].d - 10;
      entered = true;
      placeVan();
      camTarget.copy(van.object.position);
      updateCamera(0);
    },
    leave() { prompt.style.display = 'none'; },
    resize(w, h) { camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); },
    /** dir: −1 (A, recua), 0, +1 (D, avança). Retorna true se E foi pedido perto de um bairro. */
    update(dt, dir, play) {
      moving = dir;
      clock += dt;
      boards.forEach((b, i) => { b.position.y = b.userData.baseY + Math.sin(clock * 2 + i) * 0.5; });   // flutua
      dist = THREE.MathUtils.clamp(dist + dir * SPEED * dt, 0, length);
      placeVan();
      updateCamera(dt);
      near = -1; nearLocked = -1;
      for (let i = 0; i < stops.length; i++) if (Math.abs(stops[i].d - dist) < NEAR) { if (stops[i].locked) nearLocked = i; else near = i; }
      const shown = near >= 0 ? near : nearLocked;
      if (shown >= 0) {
        const lockedNow = near < 0;
        if (lockedNow !== promptLocked) {
          promptLocked = lockedNow;
          prompt.classList.toggle('locked', lockedNow);
        }
        if (lockedNow) prompt.textContent = `🔒 Bloqueado — conclua as 5 missões do Bairro ${shown}`;
        else if (prompt.innerHTML !== PROMPT_OPEN) prompt.innerHTML = PROMPT_OPEN;
        proj.copy(van.object.position); proj.y += 4;
        proj.project(camera);
        prompt.style.display = 'block';
        prompt.style.left = ((proj.x + 1) / 2 * stageEl.clientWidth) + 'px';
        prompt.style.top = ((1 - proj.y) / 2 * stageEl.clientHeight) + 'px';
      } else prompt.style.display = 'none';
      return near >= 0 && play;
    },
    get moving() { return moving !== 0; },
    get near() { return near; },
    /** Marca quais fases estão bloqueadas (cinza, sem interação). */
    setLocked(isLocked) {
      stops.forEach((s, i) => {
        s.locked = isLocked(i);
        s.hood.visible = !s.locked; s.hoodGray.visible = s.locked;
        s.sign.material.map = s.tex[s.locked ? 1 : 0];        // placa e quadro em cinza quando bloqueada
        s.board.material.map = s.tex[s.locked ? 3 : 2];
      });
    },
    get progress() { return dist / length; },
  };
}
