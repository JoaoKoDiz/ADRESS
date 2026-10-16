// Nevasca (Nível 16): interior do Grillby's — cenário separado (cena própria, sem ligação física com o bairro).
// Disposição da referência: balcão grande no fundo com bancos altos, prateleiras de garrafas atrás, porta de serviço no
// canto superior esquerdo (decorativa), máquina de música no canto superior direito com o letreiro "Grillby's" + copo,
// mesa redonda à esquerda, mesa grande no centro-esquerda, mesas com bancos estofados vermelhos na parede direita,
// mesinha embaixo à esquerda e a entrada do jogador embaixo, no meio. Luz quente; moradores no estilo do jogo.
// Coordenadas: x = leste, z = sul (para a câmera), frente da sala (porta) em z = +10.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat, torus, smoothCharacter } from './models/kit.js';
import { SHIRTS, HAIRS } from './data.js';
import { WINTER } from './models/resident.js';
import { buildPewReader } from './models/reader.js';

const W = 13, D = 10, WALL_H = 4.6;                       // sala: x −13…13, z −10…10
const FLOOR = '#9a5a2c', FLOOR2 = '#87491f', WALL = '#6e3a1e', WALL2 = '#5a2d16', TRIM = '#d9782c', WOOD = '#8a4a22', WOOD_D = '#5e3017';
const RED = '#b0402e', RED2 = '#8e2e22', SKIN = '#f0c49a', PANTS = ['#3d4a66', '#4a3a2a', '#2f3b2f', '#5a4a6a'], EYES = '#2a1d14', CHEEK = '#f29a8a';
export const GRILL_DOOR = { x: 0, z: 9.2 };
export const COAT = '#4f6a3e';                             // casaco emprestado (verde-musgo)                // onde o jogador aparece / sai (porta da frente, por dentro)

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
export function buildNPC({ shirt, hair, pants, seatY = 0, apron = false, k = 0, winter = null }) {
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
  }
  const legs = [];                                           // de pé: pernas que giram no quadril (passos)
  if (!seatY) for (const s of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(s * 0.14, 0.58, 0); body.add(lg);
    lg.add(at(box(0.22, 0.5, 0.24, pants), 0, -0.25, 0)); lg.add(at(box(0.26, 0.12, 0.34, BOOT), 0, -0.52, 0.04)); legs.push(lg);
  }
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
  // casaco emprestado (história do Grillby's): por cima de tudo, escondido até ser vestido
  const coat = new THREE.Group(); coat.visible = false; body.add(coat);
  coat.add(at(cyl(0.47, 0.53, seatY ? 0.66 : 0.86, COAT, 12), 0, seatY ? 0.92 : 0.82, 0));
  coat.add(at(torus(0.34, 0.1, COAT, 6, 14), 0, 1.2, 0, Math.PI / 2, 0, 0));
  for (const a of [armL, armR]) { const s = at(cyl(0.135, 0.125, 0.48, COAT, 8), 0, -0.24, 0); a.add(s); s.visible = false; a.userData.coat = s; }
  const wear = on => { coat.visible = on; for (const a of [armL, armR]) a.userData.coat.visible = on; };
  smoothCharacter(root);                                     // superfície lisa (mais segmentos, sem facetas)
  return { root, body, head, armL, armR, mouth, k, wear, legL: legs[0] || null, legR: legs[1] || null };
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
  add(box(0.3, WALL_H, 2 * D + 0.6, WALL), -(W + 0.15), WALL_H / 2, 0);                            // lateral oeste
  // lateral leste com a JANELA (z 4…7.9, altura 1…2.8), ao lado da mesa do canto: dá para a rua e a quadra ao lado
  const WZ0 = 3.6, WZ1 = 9.5, WY0 = 1.0, WY1 = 2.8;   // (até perto da quina da frente: dá para ver a rua da frente)
  add(box(0.3, WALL_H, WZ0 + D + 0.3, WALL), W + 0.15, WALL_H / 2, (-D - 0.3 + WZ0) / 2);
  add(box(0.3, WALL_H, D + 0.3 - WZ1, WALL), W + 0.15, WALL_H / 2, (WZ1 + D + 0.3) / 2);
  add(box(0.3, WY0, WZ1 - WZ0, WALL), W + 0.15, WY0 / 2, (WZ0 + WZ1) / 2);
  add(box(0.3, WALL_H - WY1, WZ1 - WZ0, WALL), W + 0.15, (WALL_H + WY1) / 2, (WZ0 + WZ1) / 2);
  for (const [y, h] of [[WY0, 0.14], [WY1, 0.14]]) add(box(0.42, h, WZ1 - WZ0 + 0.3, TRIM), W + 0.05, y, (WZ0 + WZ1) / 2);
  for (const z of [WZ0, WZ1]) add(box(0.42, WY1 - WY0, 0.14, TRIM), W + 0.05, (WY0 + WY1) / 2, z);
  add(box(0.12, WY1 - WY0, 0.08, TRIM), W + 0.1, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2); add(box(0.12, 0.08, WZ1 - WZ0, TRIM), W + 0.1, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2);
  add(box(0.04, WY1 - WY0, WZ1 - WZ0, '#9fb6c8', { transparent: true, opacity: 0.12, depthWrite: false }), W + 0.2, (WY0 + WY1) / 2, (WZ0 + WZ1) / 2);
  for (let x = -W + 1; x < W; x += 1.2) add(box(0.06, WALL_H - 0.2, 0.05, WALL2), x, WALL_H / 2, -D + 0.02);   // tábuas verticais
  add(box(2 * W, 0.25, 0.1, TRIM), 0, 0.12, -D + 0.05); add(box(2 * W, 0.18, 0.1, TRIM), 0, WALL_H - 0.3, -D + 0.05);
  for (const sx of [-1, 1]) { add(box(0.1, 0.25, 2 * D, TRIM), sx * (W - 0.05), 0.12, 0); for (const z of [-6, 0, 6]) if (!(sx > 0 && z === 6)) lamp(sx * (W - 0.25), 2.6, z, 1.4); }   // (a leste, a janela fica no lugar da 3ª arandela)
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
  const P = (o, x, z, ry, anim) => { const n = buildNPC(o); n.root.position.set(x, 0, z); n.root.rotation.y = ry; g.add(n.root); const e = { ...n, anim, ry }; npcs.push(e); return e; };
  const WN = WINTER, col = i => ({ shirt: WN.coats[(i * 3) % WN.coats.length], hair: HAIRS[(i * 3 + 1) % HAIRS.length], pants: PANTS[i % PANTS.length], k: i,   // clientes de inverno
    winter: { hat: WN.hats[(i * 5) % WN.hats.length], scarf: WN.scarves[(i * 7 + 1) % WN.scarves.length], glove: WN.gloves[(i * 3) % WN.gloves.length], boots: WN.boots[i % WN.boots.length], hatOn: i % 2 === 1 } });
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
  P({ ...col(11) }, 3.6, 1.6, -2.2, 'talkR'); solid(3.2, 1.2, 4.0, 2.0);                          // conversando em pé
  P({ ...col(12) }, 4.8, 0.9, 1.0, 'listen'); solid(4.4, 0.5, 5.2, 1.3);
  P({ ...col(13), seatY: 0.66 }, -11.4, 6.8, Math.PI / 2, 'drink');                                // mesinha

  // ---- história (Nevasca): K na mesa do canto, dono do casaco atrás, lareira, janela para a nevasca ----
  const story = buildStory(g, add, solid, P, col, BX, BOOTHS, W, D, WALL_H, WOOD, WOOD_D, TRIM, glowMat);
  story.patrons = npcs.filter(n => n.anim !== 'wipe' && !n.still && n !== story.guest);   // (o atendente do balcão não)

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
    scene, camera, solids, npcs, door: GRILL_DOOR, story, setFP: on => story.setFP(on),
    nearDoor: (x, z) => Math.hypot(x - GRILL_DOOR.x, z - GRILL_DOOR.z) < 1.9,
    update(dt, px, pz, snap = false) { t += dt; for (const n of npcs) if (!n.still) animNPC(n, dt); story.tick(dt); if (!story.fp) updateCamera(px, pz, dt, snap); },
  };
}

// ---------- história do Grillby's (Nevasca) ----------
// Mesa do canto inferior direito (a do fundo das 3 da parede leste): K no banco junto à parede da frente, olhando para o
// norte; o jogador senta no banco oposto (olhando para o sul, para ele); a janela fica à esquerda do jogador, na parede leste.
// Lá fora (só aparece pela janela): calçada, rua, a quadra ao lado com o poste aceso e a nevasca.
function buildStory(g, add, solid, P, col, BX, BOOTHS, W, D, WALL_H, WOOD, WOOD_D, TRIM, glowMat) {
  const TZ = BOOTHS[2], seatZ = TZ - 1.35, kZ = TZ + 1.35, SX = 11.0;
  // K (mesmo modelo da igreja), sentado de frente para o jogador
  const k = buildPewReader(0.8); k.position.set(SX, 0, kZ + 0.05); k.rotation.y = Math.PI / 2; k.visible = false; g.add(k);
  k.updateMatrixWorld(true);
  const kTop = new THREE.Box3().setFromObject(k).max.y;
  // dono do casaco: na mesa atrás do jogador (a do meio), de costas para ele; o casaco no encosto
  const owner = P({ ...col(10), seatY: 0.74 }, BX + 0.6, BOOTHS[1] + 1.35, Math.PI, 'drink');
  const coatOnChair = new THREE.Group(); coatOnChair.visible = false; g.add(coatOnChair);   // (não usado: qualquer cliente empresta)
  coatOnChair.add(at(box(1.1, 0.95, 0.16, COAT), BX - 1.0, 1.25, BOOTHS[1] + 2.08, 0.12, 0, 0));
  coatOnChair.add(at(box(1.15, 0.2, 0.42, COAT), BX - 1.0, 1.78, BOOTHS[1] + 1.95));
  for (const dx of [-0.42, 0.42]) coatOnChair.add(at(box(0.24, 0.7, 0.14, COAT), BX - 1.0 + dx, 1.05, BOOTHS[1] + 2.2, 0.2, 0, 0));
  // lareira (parede oeste)
  const FZ = 1.8, stone = '#857a6c', stone2 = '#6a6056';
  add(box(1.3, 1.7, 2.8, stone), -W + 0.65, 0.85, FZ); add(box(1.0, 3.0, 2.2, stone2), -W + 0.5, 3.1, FZ);
  add(box(0.5, 0.95, 1.6, '#1b120c'), -W + 1.1, 0.6, FZ); add(box(1.6, 0.16, 3.2, '#6e4426'), -W + 0.8, 1.75, FZ);
  add(box(0.7, 0.1, 3.0, '#5d5249'), -W + 1.5, 0.05, FZ);
  const fire = new THREE.Group(); fire.position.set(-W + 1.15, 0.2, FZ); g.add(fire);
  const flames = [];
  for (const [dz, h, c] of [[-0.35, 0.55, '#ff7a1a'], [0.05, 0.75, '#ffb03a'], [0.4, 0.5, '#ff5a1a'], [0, 0.4, '#ffe08a']]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1, 6), new THREE.MeshBasicMaterial({ color: c, toneMapped: false })); f.position.set(0, h / 2, dz); f.scale.y = h; fire.add(f); flames.push({ f, h, ph: dz * 7 });
  }
  for (const dz of [-0.3, 0.3]) fire.add(at(cyl(0.08, 0.08, 0.9, '#4a2a14', 6), 0, 0.05, dz * 0.4, Math.PI / 2, 0.4, 0));
  const fl = new THREE.PointLight('#ff8a3a', 14, 9, 1.6); fl.position.set(-W + 1.9, 1.0, FZ); g.add(fl);
  const fsp = new THREE.Sprite(glowMat); fsp.scale.setScalar(2.4); fsp.position.set(-W + 1.3, 0.7, FZ); g.add(fsp);
  solid(-W, FZ - 1.45, -W + 1.35, FZ + 1.45);
  add(box(0.9, 0.42, 0.9, WOOD), -W + 2.6, 0.21, FZ); solid(-W + 2.15, FZ - 0.45, -W + 3.05, FZ + 0.45);   // banquinho perto do fogo
  // quem foi resgatado: sentado no banquinho de frente para o fogo (escondido até o fim do resgate)
  const look = col(15);                                            // o vizinho resgatado (o mesmo pela janela, lá fora e aqui dentro)
  const guest = P({ ...look, seatY: 0.45 }, -W + 2.6, FZ, -Math.PI / 2, 'listen'); guest.root.visible = false; guest.wear(true);
  const guestWalk = P({ ...look }, 0, 8, Math.PI, 'still'); guestWalk.still = true; guestWalk.root.visible = false; guestWalk.wear(true);
  // ---- paredes de verdade só em primeira pessoa (vista de cima a frente é baixa e não há teto) ----
  const fp = new THREE.Group(); fp.visible = false; g.add(fp);
  for (const sx of [-1, 1]) fp.add(at(box(W - 1.4, WALL_H - 0.8, 0.3, '#6e3a1e'), sx * (W + 1.4) / 2, 0.8 + (WALL_H - 0.8) / 2, D + 0.15));
  fp.add(at(box(3, WALL_H - 2.95, 0.3, '#6e3a1e'), 0, 2.95 + (WALL_H - 2.95) / 2, D + 0.15));
  fp.add(at(box(2 * W + 0.6, 0.2, 2 * D + 0.6, '#3e2212'), 0, WALL_H + 0.1, 0));
  for (let z = -D + 2; z < D; z += 3) fp.add(at(box(2 * W, 0.22, 0.3, '#2c170b'), 0, WALL_H - 0.1, z));
  // ---- lá fora, visto pela janela ----
  const out = new THREE.Group(); g.add(out);
  const basic = (c, o = {}) => new THREE.MeshBasicMaterial({ color: c, ...o });
  const plane = (w, h, m) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  // lá fora: a rua da frente do Grillby's corre de oeste para leste (z 11,5…19,5); do outro lado, a calçada com o poste, logo
  // à esquerda de quem sai (a leste da porta) — o mesmo lugar onde o jogador o encontra ao sair; casas da quadra da frente atrás
  const RZ0 = D + 1.5, RZ1 = D + 9.5;
  const ground = plane(120, 110, basic('#7c858f')); ground.rotation.x = -Math.PI / 2; ground.position.set(W + 40, 0.01, 10); out.add(ground);
  const road = plane(120, RZ1 - RZ0, basic('#565d66')); road.rotation.x = -Math.PI / 2; road.position.set(W + 40, 0.02, (RZ0 + RZ1) / 2); out.add(road);
  for (let x = W - 20; x < W + 90; x += 6) { const s = plane(2.4, 0.25, basic('#9aa2ac')); s.rotation.x = -Math.PI / 2; s.position.set(x, 0.03, (RZ0 + RZ1) / 2); out.add(s); }
  for (const [x0, x1, h] of [[W + 2, W + 16, 7], [W + 18, W + 30, 9], [W + 33, W + 47, 6.5], [W + 50, W + 70, 8]]) {   // a quadra da frente (do outro lado da rua)
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 12), basic('#2a3038')); b.position.set((x0 + x1) / 2, h / 2, RZ1 + 3.6 + 6); out.add(b);
    for (let x = x0 + 1.5; x < x1 - 1; x += 3) for (let y = 1.6; y < h - 1; y += 2.4) if ((x * 7 + y * 3) % 5 > 2) { const w = plane(1.1, 1.2, basic('#e8b860')); w.rotation.y = Math.PI; w.position.set(x, y, RZ1 + 3.55); out.add(w); }
  }
  for (const [x0, x1, h] of [[W + 3, W + 15, 6], [W + 20, W + 34, 7.5]]) {   // e as casas do nosso lado, a leste
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, h, 12), basic('#2c323a')); b.position.set((x0 + x1) / 2, h / 2, D - 7.5); out.add(b);
  }
  const PX = W + 11.6, PZ = RZ1 + 1.5;                              // o poste: na calçada de lá, logo à esquerda de quem sai
  out.add(at(cyl(0.09, 0.12, 4.4, '#20242a', 8), PX, 2.2, PZ)); out.add(at(box(0.08, 0.08, 0.9, '#20242a'), PX, 4.35, PZ - 0.4));   // braço para o lado da rua
  out.add(at(sphere(0.2, '#fff1c0', 8, 6), PX, 4.2, PZ - 0.8));
  const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMat.map, color: '#ffd9a0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
  pg.scale.setScalar(5.5); pg.position.set(PX, 4.1, PZ - 0.8); pg.renderOrder = 10; out.add(pg);
  const pool = plane(6, 6, new THREE.MeshBasicMaterial({ map: glowMat.map, color: '#ffcf8a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(PX, 0.05, PZ - 0.6); pool.renderOrder = 9; out.add(pool);
  const pl = new THREE.PointLight('#ffd08a', 34, 11, 1.4); pl.position.set(PX, 3.8, PZ - 0.9); out.add(pl);
  const pl2 = new THREE.PointLight('#ffe2b0', 10, 5, 1.2); pl2.position.set(PX - 0.6, 2.2, PZ - 2.2); out.add(pl2);   // contorno do vizinho (do lado da janela)
  // o vizinho de passagem (morador do Nevasca, com roupa de inverno): chega do norte pela calçada e para no poste
  const walker = P({ ...look }, PX + 20, PZ, -Math.PI / 2, 'still'); walker.still = true; walker.root.visible = false; out.add(walker.root);
  // névoa de neve em camadas (a rua some) e flocos voando com o vento
  const veil = new THREE.MeshBasicMaterial({ color: '#cfd6de', transparent: true, opacity: 0.17, depthWrite: false });
  for (const x of [1.6, 3.4, 5.2, 7.0, 9.0, 11.0, 14, 18, 24]) { const v = plane(120, 26, veil); v.rotation.y = -Math.PI / 2; v.position.set(W + x, 10, 10); out.add(v); }
  out.visible = false;                                             // (só em 1ª pessoa: vista de cima não aparece)
  const N = 2600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = W + 0.6 + Math.random() * 34; pos[i * 3 + 1] = Math.random() * 11; pos[i * 3 + 2] = -10 + Math.random() * 45; }
  const pg2 = new THREE.BufferGeometry(); pg2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const flakes = new THREE.Points(pg2, new THREE.PointsMaterial({ color: '#f4f8ff', size: 0.09, transparent: true, opacity: 0.95, depthWrite: false }));
  out.add(flakes);
  let t = 0, walkT = -1; const W2 = { z: 0, ph: 0 };
  const st = {
    patrons: [], k, kHead: { x: SX, y: kTop - 0.28, z: kZ }, seat: { x: SX, y: 1.6, z: seatZ }, owner, coatOnChair, guest, guestWalk, look, walkerNPC: walker,
    coatPoint: { x: BX - 2.3, z: BOOTHS[1] + 1.4 }, kPoint: { x: BX - 2.3, z: TZ }, fire: { x: -W + 2.6, z: FZ }, window: { x: W, z: 5.95 },
    fp: false,
    setFP(on) { st.fp = on; fp.visible = on; out.visible = on; },
    /** O vizinho começa a chegar (cena da janela). */
    startWalker() { walkT = 0; W2.z = PX + 20; W2.ph = 0; walker.root.visible = true; },
    resetWalker() { walkT = -1; walker.root.visible = false; },
    tick(dt) {
      t += dt;
      for (const { f, h, ph } of flames) { f.scale.y = h * (0.8 + 0.25 * Math.sin(t * 11 + ph) + 0.1 * Math.sin(t * 23 + ph)); }
      fl.intensity = 13 + 3 * Math.sin(t * 9) + 2 * Math.sin(t * 17);
      const p = flakes.geometry.attributes.position.array;
      for (let i = 0; i < N; i++) {
        p[i * 3 + 2] += dt * (11 + (i % 7)); p[i * 3 + 1] -= dt * (2 + (i % 5) * 0.4); p[i * 3] += Math.sin(t * 2 + i) * dt * 0.8;
        if (p[i * 3 + 2] > 35 || p[i * 3 + 1] < 0) { p[i * 3 + 2] = -10 + Math.random() * 10; p[i * 3 + 1] = Math.random() * 11; }
      }
      flakes.geometry.attributes.position.needsUpdate = true;
      if (walkT >= 0) {                                              // anda com dificuldade até o poste e se segura ali
        walkT += dt;
        const n = walker, z1 = PX + 0.75, left = W2.z - z1;   // vem do leste pela calçada de lá (sempre à vista da janela); W2.z = posição em x
        if (left > 0.01) {
          // ritmo irregular; perto do poste, mais devagar; 2 tropeços leves (perde o equilíbrio e se recupera)
          let rate = 1.25 * (0.8 + 0.22 * Math.sin(walkT * 0.9) + 0.14 * Math.sin(walkT * 2.3 + 1)) * Math.min(1, 0.35 + left / 3);
          const stum = [3.0, 6.4].map(s => walkT - s).find(d => d > 0 && d < 0.9);
          if (stum !== undefined) rate *= 0.15;
          W2.ph += rate * dt * Math.PI * 2;
          W2.z = Math.max(z1, W2.z - rate * 1.0 * dt * (0.55 + 0.9 * Math.abs(Math.sin(W2.ph))));   // avança junto com o passo (pés não deslizam)
          const sw = Math.sin(W2.ph) * 0.42;
          n.legL.rotation.x = sw; n.legR.rotation.x = -sw;                                        // passos curtos
          n.body.position.y = -0.03 * Math.abs(Math.cos(W2.ph));
          n.body.rotation.x = 0.3 + 0.04 * Math.sin(W2.ph * 2);                                   // inclinado contra o vento
          n.body.rotation.z = 0.05 * Math.sin(W2.ph) + (stum !== undefined ? 0.16 * Math.sin(stum / 0.9 * Math.PI) : 0);
          n.root.position.set(W2.z, 0, PZ - 0.3 + 0.12 * Math.sin(walkT * 0.7)); n.root.rotation.y = -Math.PI / 2 + 0.08 * Math.sin(walkT * 0.5);
          n.armR.rotation.set(-2.25, 0, 0.55); n.armL.rotation.set(-1.0 + 0.25 * Math.sin(W2.ph), 0, -0.35);   // um braço no rosto, o outro equilibrando
          n.head.rotation.set(0.32, 0, 0);
        } else {                                                      // no poste: para, se segura e treme
          n.legL.rotation.x = n.legR.rotation.x = 0; n.body.position.y = 0;
          n.root.rotation.y = -Math.PI / 2 - 0.5;
          n.body.rotation.set(0.24 + 0.03 * Math.sin(walkT * 1.1), 0, 0.025 * Math.sin(walkT * 23) + 0.03 * Math.sin(walkT * 0.9));
          n.armL.rotation.set(-1.3, 0, -0.95); n.armR.rotation.set(-2.25 + 0.04 * Math.sin(walkT * 19), 0, 0.55); n.head.rotation.set(0.3, 0.08 * Math.sin(walkT * 0.6), 0);
        }
      }
    },
  };
  return st;
}
