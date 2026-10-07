// Morador que aparece no portão durante o diálogo: bonequinho low-poly, cabeçudo, virado para +Z (câmera).
// userData.setMood('angry' | 'happy') troca pose e balão; userData.update(t) anima.
import * as THREE from 'three';
import { box, cyl, sphere, at, dynamic, bakeStatic } from './kit.js';
import { SHIRTS, HAIRS } from '../data.js';

const SKIN = '#f0c49a', PANTS = '#3d4a66', SHOES = '#2b2522', EYES = '#2a1d14', CHEEK = '#f29a8a';
const CARDBOARD = '#c98a4a', TAPE = '#f3d9a6';
const LIFT = 0.18;      // o morador fica sobre o caminho de pedras (grama + laje), acima de y = 0 do lote
const BUBBLE_SIZE = 1.7;

// Texturas dos balões (criadas uma vez, compartilhadas por todos os moradores)
const bubbleCache = {};
function bubbleMaterial(kind) {
  if (bubbleCache[kind]) return bubbleCache[kind];
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  const r = 46, x0 = 14, y0 = 12, w = S - 28, h = S - 66;
  const shape = () => {
    x.beginPath();
    x.moveTo(x0 + r, y0);
    x.arcTo(x0 + w, y0, x0 + w, y0 + h, r); x.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
    x.lineTo(x0 + 92, y0 + h); x.lineTo(x0 + 34, S - 8); x.lineTo(x0 + 58, y0 + h); // rabinho do balão
    x.arcTo(x0, y0 + h, x0, y0, r); x.arcTo(x0, y0, x0 + w, y0, r);
    x.closePath();
  };
  shape();
  x.fillStyle = '#ffffff'; x.fill();
  x.lineWidth = 12; x.strokeStyle = kind === 'happy' ? '#1f7a3a' : '#8a2a1a'; x.lineJoin = 'round'; x.stroke();
  x.fillStyle = kind === 'happy' ? '#2a9d4b' : '#e0402a';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = kind === 'happy' ? 'bold 150px "Segoe UI Symbol", "Trebuchet MS", sans-serif' : '900 138px "Trebuchet MS", "Segoe UI", sans-serif';
  x.fillText(kind === 'happy' ? '♥' : '?!', S / 2, y0 + h / 2 + (kind === 'happy' ? 10 : 6));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, transparent: true, toneMapped: false });
  bubbleCache[kind] = m;
  return m;
}

function makeArm(shirt, side) {
  // pivô no ombro; braço pendurado para baixo (−y) em repouso
  const pivot = dynamic(new THREE.Group());
  pivot.position.set(side * 0.4, 1.12, 0);
  pivot.add(at(sphere(0.13, shirt, 8, 6), 0, 0, 0));
  pivot.add(at(cyl(0.1, 0.09, 0.46, shirt, 8), 0, -0.25, 0));
  pivot.add(at(sphere(0.1, SKIN, 8, 6), 0, -0.52, 0));
  return pivot;
}

/** Morador da casa `houseIndex` (camisa e cabelo derivados do índice). */
export function buildResident(houseIndex) {
  const shirt = SHIRTS[houseIndex % SHIRTS.length];
  const hair = HAIRS[(houseIndex * 3) % HAIRS.length];

  const root = new THREE.Group();
  root.name = 'resident:' + houseIndex;
  const body = new THREE.Group();          // quica sem mexer na posição que o mundo define para root
  body.position.y = LIFT;
  root.add(body);

  // pernas e sapatos
  for (const s of [-1, 1]) {
    body.add(at(box(0.22, 0.5, 0.24, PANTS), s * 0.14, 0.33, 0));
    body.add(at(box(0.26, 0.12, 0.34, SHOES), s * 0.14, 0.06, 0.04));
  }
  // tronco (camisa) + cinto
  body.add(at(cyl(0.34, 0.37, 0.62, shirt, 10), 0, 0.88, 0));
  body.add(at(cyl(0.375, 0.375, 0.08, PANTS, 10), 0, 0.6, 0));
  // cabeça grande, levemente inclinada para trás: o rosto aparece para a câmera, que olha de cima
  const head = new THREE.Group();
  head.position.set(0, 1.18, 0);
  head.rotation.x = -0.42;
  body.add(head);
  const hy = 0.34;                          // centro da cabeça acima do pescoço
  head.add(at(sphere(0.4, SKIN, 12, 9), 0, hy, 0));
  // cabelo: calota + nuca
  const cap = at(sphere(0.43, hair, 12, 8), 0, hy + 0.12, -0.06);
  cap.scale.set(1, 0.72, 1);
  head.add(cap);
  head.add(at(box(0.72, 0.4, 0.22, hair), 0, hy - 0.02, -0.26));
  // rosto: olhos, bochechas, nariz
  for (const s of [-1, 1]) {
    head.add(at(sphere(0.065, EYES, 6, 4), s * 0.15, hy + 0.05, 0.36));
    head.add(at(sphere(0.065, CHEEK, 6, 4), s * 0.25, hy - 0.08, 0.31));
  }
  head.add(at(sphere(0.06, SKIN, 6, 4), 0, hy - 0.04, 0.4));

  // expressões (trocadas por setMood)
  const brows = dynamic(new THREE.Group());   // sobrancelhas franzidas
  for (const s of [-1, 1]) brows.add(at(box(0.18, 0.05, 0.05, EYES), s * 0.15, hy + 0.17, 0.35, 0, 0, s * 0.5));
  const frown = dynamic(at(box(0.2, 0.045, 0.05, EYES), 0, hy - 0.17, 0.36, 0, 0, 0.12));
  const smile = dynamic(new THREE.Group());
  smile.add(at(box(0.14, 0.045, 0.05, EYES), 0, hy - 0.19, 0.36));
  for (const s of [-1, 1]) smile.add(at(box(0.09, 0.045, 0.05, EYES), s * 0.1, hy - 0.165, 0.35, 0, 0, s * 0.6));
  head.add(brows, frown, smile);

  // braços
  const armL = makeArm(shirt, -1), armR = makeArm(shirt, 1);
  body.add(armL, armR);

  // pacote (só quando feliz)
  const pkg = dynamic(new THREE.Group());
  pkg.position.set(0, 0.98, 0.5);
  pkg.add(box(0.72, 0.5, 0.5, CARDBOARD));
  pkg.add(at(box(0.12, 0.505, 0.51, TAPE), 0, 0, 0));
  pkg.add(at(box(0.73, 0.06, 0.51, TAPE), 0, 0.12, 0));
  body.add(pkg);

  // balões
  const bubbles = {};
  for (const kind of ['angry', 'happy']) {
    const sp = new THREE.Sprite(bubbleMaterial(kind));
    sp.scale.set(BUBBLE_SIZE, BUBBLE_SIZE, 1);
    sp.center.set(0.2, 0.02);            // o rabinho aponta para a cabeça
    sp.position.set(0.25, 2.2, 0);
    sp.renderOrder = 20;
    sp.visible = false;
    bubbles[kind] = sp;
    root.add(sp);
  }

  // cada parte animada vira poucos meshes; o resto do corpo é fundido por material
  for (const part of [armL, armR, pkg, brows, smile]) bakeStatic(part);
  bakeStatic(body);

  let mood = 'angry';
  function setMood(m) {
    mood = m === 'happy' ? 'happy' : 'angry';
    const happy = mood === 'happy';
    bubbles.angry.visible = !happy;
    bubbles.happy.visible = happy;
    pkg.visible = happy;
    smile.visible = happy;
    brows.visible = frown.visible = !happy;
  }

  function update(t) {
    if (mood === 'happy') {
      // segura a caixa na frente do peito e dá pulinhos
      body.position.y = LIFT + Math.abs(Math.sin(t * 6)) * 0.14;
      armL.rotation.set(-1.25, 0, -0.25);
      armR.rotation.set(-1.25, 0, 0.25);
      pkg.rotation.z = Math.sin(t * 6) * 0.05;
      body.rotation.y = 0;
      bubbles.happy.position.y = 2.2 + body.position.y - LIFT;
    } else {
      // braços para cima, sacudindo de irritação
      body.position.y = LIFT + Math.abs(Math.sin(t * 9)) * 0.04;
      armL.rotation.set(0, 0, -2.3 - Math.sin(t * 13) * 0.45);
      armR.rotation.set(0, 0, 2.3 + Math.sin(t * 13 + 1.3) * 0.45);
      body.rotation.y = Math.sin(t * 4.5) * 0.12;
      bubbles.angry.position.y = 2.2 + Math.sin(t * 9) * 0.04;
    }
  }

  root.userData.setMood = setMood;
  root.userData.update = update;
  setMood('angry');
  update(0);
  return root;
}
