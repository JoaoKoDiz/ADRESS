// Nevasca (Nível 16): interior do Grillby's — cenário separado (cena própria, sem ligação física com o bairro).
// Disposição da referência: balcão grande no fundo com bancos altos, prateleiras de garrafas atrás, porta de serviço no
// canto superior esquerdo (decorativa), máquina de música no canto superior direito com o letreiro "Grillby's" + copo,
// mesa redonda à esquerda, mesa grande no centro-esquerda, mesas com bancos estofados vermelhos na parede direita,
// mesinha embaixo à esquerda e a entrada do jogador embaixo, no meio. Luz quente; moradores no estilo do jogo.
// Coordenadas: x = leste, z = sul (para a câmera), frente da sala (porta) em z = +10.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, torus } from './models/kit.js';
import { SHIRTS, HAIRS } from './data.js';
import { WINTER } from './models/resident.js';

const W = 13, D = 10, WALL_H = 4.6;                       // sala: x −13…13, z −10…10
const FLOOR = '#9a5a2c', FLOOR2 = '#87491f', WALL = '#6e3a1e', WALL2 = '#5a2d16', TRIM = '#d9782c', WOOD = '#8a4a22', WOOD_D = '#5e3017';
const RED = '#b0402e', RED2 = '#8e2e22', SKIN = '#f0c49a', PANTS = ['#3d4a66', '#4a3a2a', '#2f3b2f', '#5a4a6a'], EYES = '#2a1d14', CHEEK = '#f29a8a';
export const GRILL_DOOR = { x: 0, z: 9.2 };                // onde o jogador aparece / sai (porta da frente, por dentro)

function neonTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 200; const g = c.getContext('2d');
  g.strokeStyle = '#ff6ad5'; g.fillStyle = '#ff9ae6'; g.shadowColor = '#ff3cc8'; g.shadowBlur = 18; g.lineWidth = 5;
  g.font = 'italic bold 92px "Trebuchet MS", sans-serif'; g.textBaseline = 'middle';
  g.fillText("Grillby's", 18, 92);
  g.beginPath(); g.moveTo(410, 60); g.lineTo(480, 60); g.lineTo(445, 110); g.closePath(); g.moveTo(445, 110); g.lineTo(445, 160); g.moveTo(420, 162); g.lineTo(470, 162); g.stroke();   // copo
  g.beginPath(); g.arc(468, 58, 9, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,140,1)'); gr.addColorStop(0.35, 'rgba(255,150,50,0.45)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Morador no estilo do jogo (cabeção, olhos, bochechas, camisa cilíndrica); sentado (seatY) ou em pé; avental opcional. */
function buildNPC({ shirt, hair, pants, seatY = 0, apron = false, k = 0, winter = null }) {
  const BOOT = winter ? winter.boots : '#2b2522', HAND = winter ? winter.glove : SKIN;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hip = seatY ? seatY + 0.04 : 0.62;                    // altura do quadril
  body.position.y = hip - 0.6;
  if (seatY) {                                               // coxas para a frente, canelas para baixo até o chão
    const shin = Math.max(0.2, seatY - 0.12);
    for (const s of [-1, 1]) {
      body.add(at(box(0.24, 0.22, 0.56, pants), s * 0.14, 0.62, 0.24));
      root.add(at(box(0.2, shin, 0.22, pants), s * 0.14, shin / 2 + 0.1, 0.5));
      root.add(at(box(0.26, 0.12, 0.34, BOOT), s * 0.14, 0.06, 0.56));
    }
  } else for (const s of [-1, 1]) { body.add(at(box(0.22, 0.5, 0.24, pants), s * 0.14, 0.33, 0)); body.add(at(box(0.26, 0.12, 0.34, BOOT), s * 0.14, 0.06, 0.04)); }
  body.add(at(cyl(0.34, 0.37, 0.62, shirt, 10), 0, 0.88, 0));
  body.add(at(cyl(0.375, 0.375, 0.08, pants, 10), 0, 0.6, 0));
  if (winter) {                                               // cliente de inverno: casaco grosso, cachecol (e gorro em alguns)
    body.add(at(cyl(0.41, 0.46, seatY ? 0.62 : 0.76, shirt, 12), 0, seatY ? 0.91 : 0.84, 0));
    body.add(at(box(0.05, 0.56, 0.04, '#2b2b2b'), 0, 0.9, 0.43));
    body.add(at(torus(0.3, 0.09, winter.scarf, 6, 16), 0, 1.19, 0, Math.PI / 2, 0, 0)); body.add(at(box(0.15, 0.32, 0.07, winter.scarf), 0.13, 1.0, 0.42, 0, 0, 0.12));
  }
  if (apron) { body.add(at(box(0.5, 0.66, 0.05, '#f4f1ea'), 0, 0.78, 0.37)); body.add(at(box(0.34, 0.22, 0.05, '#f4f1ea'), 0, 1.07, 0.35)); body.add(at(torus(0.27, 0.05, '#2b2b2b', 6, 14), 0, 1.16, 0, Math.PI / 2, 0, 0)); }
  const head = new THREE.Group(); head.position.set(0, 1.18, 0); body.add(head);
  const hy = 0.34;
  head.add(at(sphere(0.4, SKIN, 12, 9), 0, hy, 0));
  const cap = at(sphere(0.43, hair, 12, 8), 0, hy + 0.12, -0.06); cap.scale.set(1, 0.72, 1); head.add(cap);
  head.add(at(box(0.72, 0.4, 0.22, hair), 0, hy - 0.02, -0.26));
  if (winter && winter.hatOn) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), mat(winter.hat)); b.scale.set(1, 0.85, 1); head.add(at(b, 0, hy + 0.13, -0.03));
    head.add(at(cyl(0.47, 0.47, 0.12, winter.hat, 14), 0, hy + 0.2, -0.03)); head.add(at(sphere(0.13, winter.scarf, 8, 6), 0, hy + 0.56, -0.05));
  }
  for (const s of [-1, 1]) { head.add(at(sphere(0.065, EYES, 6, 4), s * 0.15, hy + 0.05, 0.36)); head.add(at(sphere(0.065, CHEEK, 6, 4), s * 0.25, hy - 0.08, 0.31)); }
  head.add(at(sphere(0.06, SKIN, 6, 4), 0, hy - 0.04, 0.4));
  const mouth = at(box(0.16, 0.045, 0.05, EYES), 0, hy - 0.18, 0.36); head.add(mouth);
  const arm = side => {
    const p = new THREE.Group(); p.position.set(side * 0.4, 1.12, 0);
    p.add(at(sphere(0.13, shirt, 8, 6), 0, 0, 0)); p.add(at(cyl(0.1, 0.09, 0.46, shirt, 8), 0, -0.25, 0)); p.add(at(sphere(0.1, HAND, 8, 6), 0, -0.52, 0));
    body.add(p); return p;
  };
  const armL = arm(-1), armR = arm(1);
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { root, body, head, armL, armR, mouth, k };
}

export function createGrillbyInside() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a0d07');
  const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 200);
  const solids = [];                                         // caixas (AABB) para o personagem a pé
  const solid = (x0, z0, x1, z1) => solids.push({ x0, z0, x1, z1 });
  const g = new THREE.Group(); scene.add(g);
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };

  // ---- luz quente ----
  scene.add(new THREE.HemisphereLight('#ffcf94', '#5a2a12', 1.25));
  const key = new THREE.DirectionalLight('#ffd7a0', 1.2); key.position.set(-6, 14, 10); scene.add(key);
  for (const [x, z, i] of [[-6, -2, 26], [6, -3, 22], [-4, 4, 24], [9, 4, 24], [0, -7, 18]]) { const l = new THREE.PointLight('#ffb25a', i, 16, 1.4); l.position.set(x, 3.6, z); scene.add(l); }
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const lamp = (x, y, z, s = 1.6) => { const sp = new THREE.Sprite(glowMat); sp.scale.setScalar(s); sp.position.set(x, y, z); g.add(sp); add(sphere(0.16, '#ffe2a0', 8, 6, { emissive: '#ffb050', emissiveIntensity: 1.5 }), x, y, z); };

  // ---- piso de tábuas, paredes, rodapé ----
  for (let i = 0; i < 2 * D / 1.0; i++) add(box(2 * W, 0.1, 0.98, i % 2 ? FLOOR : FLOOR2), 0, -0.05, -D + 0.5 + i);
  for (let i = 0; i < 9; i++) add(box(0.04, 0.02, 2 * D, '#6e3818'), -W + 2.9 * i + 1.3, 0.01, 0);   // juntas
  add(box(2 * W + 0.6, WALL_H, 0.3, WALL), 0, WALL_H / 2, -D - 0.15);                               // fundo
  for (const sx of [-1, 1]) add(box(0.3, WALL_H, 2 * D + 0.6, WALL), sx * (W + 0.15), WALL_H / 2, 0);   // laterais
  for (let x = -W + 1; x < W; x += 1.2) add(box(0.06, WALL_H - 0.2, 0.05, WALL2), x, WALL_H / 2, -D + 0.02);   // tábuas verticais
  add(box(2 * W, 0.25, 0.1, TRIM), 0, 0.12, -D + 0.05); add(box(2 * W, 0.18, 0.1, TRIM), 0, WALL_H - 0.3, -D + 0.05);
  for (const sx of [-1, 1]) { add(box(0.1, 0.25, 2 * D, TRIM), sx * (W - 0.05), 0.12, 0); for (const z of [-6, 0, 6]) lamp(sx * (W - 0.25), 2.6, z, 1.4); }
  // frente baixa (não esconde nada da câmera) com a porta de entrada no meio
  for (const sx of [-1, 1]) add(box(W - 1.4, 0.8, 0.3, WALL), sx * (W + 1.4) / 2, 0.4, D + 0.15);
  add(box(2.8, 0.08, 0.6, '#3a1d0c'), 0, 0.02, D - 0.1);                                             // capacho
  add(box(0.2, 2.8, 0.3, TRIM), -1.4, 1.4, D + 0.15); add(box(0.2, 2.8, 0.3, TRIM), 1.4, 1.4, D + 0.15); add(box(3, 0.24, 0.3, TRIM), 0, 2.85, D + 0.15);
  add(box(2.5, 2.7, 0.1, '#4a2814'), 0, 1.35, D + 0.25); add(box(1.2, 0.8, 0.04, '#ffd27a', { emissive: '#ff9a3a', emissiveIntensity: 0.8 }), 0, 2.0, D + 0.19);
  solid(-W - 1, -D - 1, -W, D + 1); solid(W, -D - 1, W + 1, D + 1); solid(-W - 1, -D - 1, W + 1, -D); solid(-W - 1, D, -1.2, D + 1); solid(1.2, D, W + 1, D + 1);
  solid(-1.3, D + 0.6, 1.3, D + 1.2);

  // ---- porta de serviço (canto superior esquerdo, decorativa) ----
  add(box(2.2, 3.2, 0.12, TRIM), -9.5, 1.6, -D + 0.08); add(box(1.8, 3.0, 0.1, '#5a2e16'), -9.5, 1.5, -D + 0.16);
  add(box(1.0, 0.9, 0.04, '#ffcf6a', { emissive: '#ff9a3a', emissiveIntensity: 0.7 }), -9.5, 2.3, -D + 0.23); add(sphere(0.08, '#f2c14a', 6, 4), -8.9, 1.4, -D + 0.25);
  lamp(-7.6, 2.9, -D + 0.35);

  // ---- balcão (fundo) com bancos altos; prateleiras com garrafas e copos atrás ----
  const CZ = -5.0, CX0 = -6.5, CX1 = 5.2;
  add(box(CX1 - CX0, 1.1, 1.1, WOOD), (CX0 + CX1) / 2, 0.55, CZ); add(box(CX1 - CX0 + 0.3, 0.12, 1.35, '#b0602a'), (CX0 + CX1) / 2, 1.16, CZ);
  add(box(1.2, 1.1, 3.4, WOOD), CX1 + 0.6, 0.55, CZ - 1.15); add(box(1.45, 0.12, 3.6, '#b0602a'), CX1 + 0.6, 1.16, CZ - 1.15);   // a curva do balcão (desce à direita)
  for (let x = CX0 + 0.6; x < CX1; x += 1.1) add(box(0.06, 0.9, 0.04, WOOD_D), x, 0.55, CZ + 0.57);
  add(box(CX1 - CX0, 0.12, 0.14, TRIM), (CX0 + CX1) / 2, 0.2, CZ + 0.6);                            // apoio dos pés
  solid(CX0 - 0.1, -D, CX1 + 1.3, CZ + 0.62);
  const STOOLS = [-5.0, -3.0, -1.0, 1.0, 3.0];
  for (const x of STOOLS) { add(cyl(0.08, 0.08, 1.0, '#3a2414', 8), x, 0.5, CZ + 1.35); add(cyl(0.42, 0.42, 0.14, RED, 14), x, 1.05, CZ + 1.35); add(torus(0.28, 0.04, '#3a2414', 6, 12), x, 0.4, CZ + 1.35, Math.PI / 2, 0, 0); solid(x - 0.35, CZ + 1.0, x + 0.35, CZ + 1.7); }
  // prateleiras
  add(box(10.5, 3.2, 0.5, WOOD_D), -0.6, 2.1, -D + 0.3);
  const BCOL = ['#3f8f3a', '#8a2a1a', '#d9a441', '#2f6fb0', '#e8e0c8', '#6b3a8a', '#c8602a', '#2a6a5a'];
  for (const [y, n] of [[1.05, 14], [2.05, 13], [3.05, 14]]) {
    add(box(10.2, 0.1, 0.62, '#a85a26'), -0.6, y - 0.05, -D + 0.6);
    for (let i = 0; i < n; i++) {
      const x = -5.4 + i * (9.6 / (n - 1)) + Math.sin(i * 7.3 + y) * 0.1, c = BCOL[(i * 3 + Math.round(y)) % BCOL.length], kind = (i + Math.round(y * 3)) % 4;
      if (kind === 3) { add(cyl(0.1, 0.08, 0.26, '#cfe8f0', 8, { transparent: true, opacity: 0.6 }), x, y + 0.13, -D + 0.62); continue; }   // copo
      const h = kind === 0 ? 0.55 : kind === 1 ? 0.4 : 0.48, r = kind === 1 ? 0.15 : 0.11;
      add(cyl(r, r, h, c, 8, { emissive: c, emissiveIntensity: 0.15 }), x, y + h / 2, -D + 0.62);
      add(cyl(0.04, 0.05, 0.2, c, 6), x, y + h + 0.1, -D + 0.62);
    }
  }
  for (const x of [-4, -0.6, 2.8]) add(box(0.6, 0.12, 0.3, '#c9c2b0'), x, 1.3, CZ - 0.25);   // panos/copos no balcão
  for (const x of [-2.6, 1.8]) { add(cyl(0.11, 0.09, 0.28, '#cfe8f0', 8, { transparent: true, opacity: 0.65 }), x, 1.36, CZ + 0.1); }
  lamp(-5.8, 3.9, -D + 0.6, 1.8); lamp(4.4, 3.9, -D + 0.6, 1.8);

  // ---- máquina de música + letreiro neon (canto superior direito) ----
  const JX = 10.6, JZ = -D + 1.0;
  add(box(2.2, 2.6, 1.2, '#7a2a16'), JX, 1.3, JZ); add(cyl(1.1, 1.1, 1.2, '#7a2a16', 16), JX, 2.6, JZ, Math.PI / 2, 0, 0);
  add(box(1.6, 1.4, 0.06, '#ffb03a', { emissive: '#ff8a1a', emissiveIntensity: 1.1 }), JX, 1.7, JZ + 0.62);
  for (const [dx, c] of [[-0.5, '#ff4a6a'], [0, '#5ad0ff'], [0.5, '#7aff7a']]) add(box(0.2, 1.2, 0.04, c, { emissive: c, emissiveIntensity: 1.2 }), JX + dx, 1.7, JZ + 0.66);
  add(box(1.9, 0.3, 0.1, '#f2c14a'), JX, 0.5, JZ + 0.62); lamp(JX, 2.5, JZ + 0.9, 3.2);
  solid(JX - 1.25, -D, JX + 1.25, JZ + 0.7);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.8), new THREE.MeshBasicMaterial({ map: neonTexture(), transparent: true, toneMapped: false, depthWrite: false }));
  add(neon, 8.1, 3.6, -D + 0.05);
  // homem/planta decorativa entre o balcão e a máquina: vaso
  add(cyl(0.45, 0.35, 0.8, '#7a3a1c', 10), 7.6, 0.4, -D + 0.8); add(sphere(0.75, '#3f7a3a', 8, 6), 7.6, 1.25, -D + 0.8); solid(7.1, -D, 8.1, -D + 1.3);

  // ---- mesa redonda (esquerda) ----
  const table = (x, z, r, chairs) => {
    add(cyl(r, r, 0.12, WOOD, 18), x, 1.0, z); add(cyl(0.12, 0.15, 0.95, WOOD_D, 8), x, 0.48, z); add(cyl(0.5, 0.6, 0.08, WOOD_D, 10), x, 0.04, z);
    solid(x - r, z - r, x + r, z + r);
  };
  table(-10.2, -3.2, 1.35);
  add(cyl(0.35, 0.35, 0.03, '#e8d8b0', 12), -10.2, 1.08, -3.2); add(cyl(0.12, 0.1, 0.24, '#cfe8f0', 8, { transparent: true, opacity: 0.6 }), -9.8, 1.2, -3.0);
  const chair = (x, z, ry, h = 0.6) => {
    const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c);
    c.add(at(box(0.8, 0.1, 0.8, WOOD), 0, h, 0)); for (const [a, b] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) c.add(at(box(0.08, h, 0.08, WOOD_D), a, h / 2, b));
    c.add(at(box(0.8, 0.8, 0.08, WOOD), 0, h + 0.45, -0.36));
    solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
  };
  chair(-11.7, -3.2, Math.PI / 2); chair(-10.2, -1.5, Math.PI);

  // ---- mesa grande (centro-esquerda) com cartas e copos ----
  const TX = -4.2, TZ = 3.2;
  add(box(5.2, 0.14, 3.0, WOOD), TX, 1.0, TZ); for (const [a, b] of [[-2.3, -1.3], [2.3, -1.3], [-2.3, 1.3], [2.3, 1.3]]) add(box(0.16, 1.0, 0.16, WOOD_D), TX + a, 0.5, TZ + b);
  for (let i = 0; i < 9; i++) add(box(0.32, 0.02, 0.44, '#f2e6c8'), TX - 1.6 + (i % 5) * 0.8, 1.08, TZ - 0.6 + Math.floor(i / 5) * 1.0, 0, i * 0.7, 0);
  for (const [a, b] of [[-1.2, 0.8], [1.4, -0.7], [0.3, 0.9]]) add(cyl(0.12, 0.1, 0.26, '#cfe8f0', 8, { transparent: true, opacity: 0.6 }), TX + a, 1.2, TZ + b);
  solid(TX - 2.7, TZ - 1.6, TX + 2.7, TZ + 1.6);
  chair(TX, TZ - 2.2, 0); chair(TX - 1.6, TZ + 2.2, Math.PI); chair(TX + 1.6, TZ + 2.2, Math.PI); chair(TX - 3.4, TZ, Math.PI / 2);

  // ---- mesas com bancos estofados (parede direita) ----
  const BOOTHS = [-2.2, 2.6, 7.2], BX = 10.4;
  for (const z of BOOTHS) {
    add(box(3.6, 0.14, 1.6, WOOD), BX, 1.0, z); add(box(0.3, 1.0, 0.3, WOOD_D), BX, 0.5, z);
    for (const s of [-1, 1]) {
      add(box(4.0, 0.5, 0.9, RED), BX + 0.1, 0.42, z + s * 1.35); add(box(4.0, 0.16, 0.9, RED2), BX + 0.1, 0.72, z + s * 1.35);   // assento
      add(box(4.0, 1.1, 0.3, RED), BX + 0.1, 1.2, z + s * 1.9);                                                                // encosto
      for (let k = -1; k <= 1; k++) add(box(0.06, 0.9, 0.04, RED2), BX + 0.1 + k * 1.2, 1.2, z + s * 1.74);
    }
    add(cyl(0.1, 0.12, 0.42, '#3f8f3a', 8), BX + 1.2, 1.28, z + 0.2); add(cyl(0.11, 0.09, 0.26, '#cfe8f0', 8, { transparent: true, opacity: 0.6 }), BX - 0.6, 1.2, z - 0.3);
    solid(BX - 1.9, z - 2.1, W, z + 2.1);
  }
  lamp(W - 0.25, 2.6, -4.6, 1.2);

  // ---- mesinha (embaixo, à esquerda) ----
  add(box(1.8, 0.12, 1.4, WOOD), -10.0, 0.85, 6.8); add(box(0.2, 0.85, 0.2, WOOD_D), -10.0, 0.42, 6.8); solid(-10.95, 6.05, -9.05, 7.55);
  add(cyl(0.12, 0.1, 0.28, '#c8602a', 8), -9.6, 1.05, 6.6);
  for (const x of [-11.4, -8.6]) { add(cyl(0.34, 0.34, 0.1, RED, 12), x, 0.6, 6.8); add(cyl(0.07, 0.07, 0.6, '#3a2414', 6), x, 0.3, 6.8); solid(x - 0.35, 6.45, x + 0.35, 7.15); }

  // ---- moradores ----
  const npcs = [];
  const P = (o, x, z, ry, anim) => { const n = buildNPC(o); n.root.position.set(x, 0, z); n.root.rotation.y = ry; g.add(n.root); npcs.push({ ...n, anim, ry }); return n; };
  const W = WINTER, col = i => ({ shirt: W.coats[(i * 3) % W.coats.length], hair: HAIRS[(i * 3 + 1) % HAIRS.length], pants: PANTS[i % PANTS.length], k: i,   // clientes de inverno
    winter: { hat: W.hats[(i * 5) % W.hats.length], scarf: W.scarves[(i * 7 + 1) % W.scarves.length], glove: W.gloves[(i * 3) % W.gloves.length], boots: W.boots[i % W.boots.length], hatOn: i % 2 === 1 } });
  P({ ...col(0), winter: null, apron: true, shirt: '#2b2b2b' }, -0.8, CZ - 1.2, 0, 'wipe');                      // atendente atrás do balcão
  P({ ...col(1), seatY: 1.12 }, STOOLS[0], CZ + 1.35, Math.PI, 'talkL');                            // no balcão (de costas para a sala)
  P({ ...col(2), seatY: 1.12 }, STOOLS[1], CZ + 1.35, Math.PI, 'listen');
  P({ ...col(3), seatY: 1.12 }, STOOLS[4], CZ + 1.35, Math.PI, 'drink');
  P({ ...col(4), seatY: 0.66 }, -11.7, -3.2, Math.PI / 2, 'drink');                                 // mesa redonda
  P({ ...col(5), seatY: 0.66 }, TX, TZ - 2.2, 0, 'talkR');                                          // mesa grande
  P({ ...col(6), seatY: 0.66 }, TX - 1.6, TZ + 2.2, Math.PI, 'listen');
  P({ ...col(7), seatY: 0.66 }, TX - 3.4, TZ, Math.PI / 2, 'talkL');
  P({ ...col(8), seatY: 0.74 }, BX - 0.4, BOOTHS[0] - 1.35, 0, 'drink');                          // estofados
  P({ ...col(9), seatY: 0.74 }, BX + 0.6, BOOTHS[0] + 1.35, Math.PI, 'talkR');
  P({ ...col(10), seatY: 0.74 }, BX - 0.2, BOOTHS[2] - 1.35, 0, 'listen');
  P({ ...col(11) }, 3.6, 1.6, -2.2, 'talkR'); solid(3.2, 1.2, 4.0, 2.0);                          // conversando em pé
  P({ ...col(12) }, 4.8, 0.9, 1.0, 'listen'); solid(4.4, 0.5, 5.2, 1.3);
  P({ ...col(13), seatY: 0.66 }, -11.4, 6.8, Math.PI / 2, 'drink');                                // mesinha

  let t = 0;
  function animNPC(n, dt) {
    const k = n.k * 1.37, h = n.head, s = Math.sin;
    h.rotation.y = 0.35 * s(t * 0.5 + k) * s(t * 0.23 + k * 2);                // olha em volta devagar
    h.rotation.x = -0.15 + 0.06 * s(t * 1.3 + k);
    n.body.rotation.z = 0.02 * s(t * 0.9 + k);
    n.armL.rotation.set(0, 0, -0.08); n.armR.rotation.set(0, 0, 0.08);
    if (n.anim === 'talkL' || n.anim === 'talkR') {                           // gesticula com uma mão, fala (boca abre)
      const a = n.anim === 'talkL' ? n.armL : n.armR, sg = n.anim === 'talkL' ? -1 : 1, g2 = Math.max(0, s(t * 1.7 + k));
      a.rotation.set(-0.9 - 0.5 * g2, 0, sg * (0.3 + 0.25 * s(t * 3.1 + k)));
      n.mouth.scale.y = 1 + 2.2 * Math.max(0, s(t * 11 + k)) * (0.5 + 0.5 * s(t * 0.9 + k));
      h.rotation.x += 0.08 * s(t * 4 + k);
    } else if (n.anim === 'listen') { h.rotation.x += 0.12 * Math.max(0, s(t * 2.2 + k)); n.mouth.scale.y = 1; }   // concorda com a cabeça
    else if (n.anim === 'drink') {                                             // leva o copo à boca de vez em quando
      const c = Math.max(0, s(t * 0.6 + k)); n.armR.rotation.set(-1.2 - 0.9 * c * c, 0, 0.25); h.rotation.x -= 0.2 * c * c;
    } else if (n.anim === 'wipe') { n.armR.rotation.set(-1.0, 0, 0.3 + 0.35 * s(t * 3)); n.armL.rotation.set(-0.6, 0, -0.2); n.root.position.x = -0.8 + 1.2 * s(t * 0.25); }
  }

  // ---- câmera elevada e levemente inclinada, acompanhando o jogador ----
  const look = new THREE.Vector3(0, 0, 4), camPos = new THREE.Vector3();
  function updateCamera(px, pz, dt, snap) {
    const tx = THREE.MathUtils.clamp(px * 0.55, -5, 5), tz = THREE.MathUtils.clamp(pz * 0.5 + 0.5, -3.5, 4.5);
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    look.x += (tx - look.x) * k; look.z += (tz - look.z) * k;
    camPos.set(look.x, 19, look.z + 12.5);
    camera.position.copy(camPos); camera.lookAt(look.x, 0, look.z - 0.5);
  }
  return {
    scene, camera, solids, door: GRILL_DOOR,
    nearDoor: (x, z) => Math.hypot(x - GRILL_DOOR.x, z - GRILL_DOOR.z) < 1.9,
    update(dt, px, pz, snap = false) { t += dt; for (const n of npcs) animNPC(n, dt); updateCamera(px, pz, dt, snap); },
  };
}
