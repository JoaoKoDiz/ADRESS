// Morador que aparece no portão durante o diálogo: bonequinho low-poly, cabeçudo, virado para +Z (câmera).
// userData.setMood('angry' | 'happy') troca pose e balão; userData.update(t) anima.
import * as THREE from 'three';
import { box, cyl, sphere, torus, at, dynamic, bakeStatic } from './kit.js';
import { SHIRTS, HAIRS, HOUSES } from '../data.js';

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

function makeArm(shirt, side, rolled = false) {
  // pivô no ombro; braço pendurado para baixo (−y) em repouso (rolled: manga dobrada, antebraço à mostra)
  const pivot = dynamic(new THREE.Group());
  pivot.position.set(side * 0.4, 1.12, 0);
  pivot.add(at(sphere(0.13, shirt, 8, 6), 0, 0, 0));
  if (rolled) { pivot.add(at(cyl(0.1, 0.1, 0.2, shirt, 8), 0, -0.12, 0)); pivot.add(at(cyl(0.11, 0.11, 0.07, shirt, 8), 0, -0.23, 0)); pivot.add(at(cyl(0.085, 0.08, 0.26, SKIN, 8), 0, -0.36, 0)); }
  else pivot.add(at(cyl(0.1, 0.09, 0.46, shirt, 8), 0, -0.25, 0));
  pivot.add(at(sphere(0.1, SKIN, 8, 6), 0, -0.52, 0));
  return pivot;
}

/** Morador da casa `houseIndex` (camisa e cabelo derivados do índice). */
// Veneza: estilos de roupa (camisa de linho, blusa listrada, avental, lenço, chapéu de palha, gondoleiro) e cores trocáveis
export const VEN_STYLE = {
  linen: ['#efe6d2', '#dfe8ef', '#e9dcc6', '#f3efe6'], stripe: ['#1f3a68', '#b5302a', '#2b2b2b'], apron: ['#f4f1ea', '#e7d3a8', '#cfd8c4'],
  scarf: ['#c8402f', '#2f6fb0', '#d9a441', '#3f7a4a', '#a8432e'], straw: '#f3d98f', ribbon: ['#c8402f', '#1f3a68', '#2b2b2b'],
};
const VEN_LOOKS = ['linen', 'stripe', 'apron', 'scarf', 'straw', 'gondolier', 'linen-scarf', 'apron-straw'];

// Colheita: roupa de roça (xadrez ou lisa, mangas dobradas, jardineira, calça e botas; chapéu de palha ou boné)
export const FARM_STYLE = {
  plaid: ['#c8402f', '#2f6fb0', '#3f8a4a', '#8a5a36', '#d9a441'], plain: ['#f1ece0', '#9fc0de', '#e8d27a', '#c9d8b4', '#e6b8a8'],
  denim: ['#3a5f8f', '#2f4a6e', '#6b7f4a'], pants: ['#5a4a3a', '#3d4a66', '#6b5a3a'], cap: ['#c8402f', '#2f6fb0', '#3f8a4a', '#e8b02a'], boots: '#5a3b22',
};
function buildFarmResident(h) {
  const look = FARM_LOOKS[(h * 3) % FARM_LOOKS.length], F = FARM_STYLE, pk = (a, k = 1) => a[(h * k) % a.length];
  const plaid = look.includes('plaid'), overalls = look.includes('overalls');
  const farm = { plaid, overalls, rolled: look.includes('rolled'), hat: look.includes('straw') ? 'straw' : look.includes('cap') ? 'cap' : null,
    pants: overalls ? pk(F.denim, 5) : pk(F.pants, 7), cap: pk(F.cap, 3) };
  const shirt = plaid ? pk(F.plaid, 2) : pk(F.plain, 3);
  return buildCore(h, { shirt, hair: HAIRS[(h * 3) % HAIRS.length], farm });
}
const FARM_LOOKS = ['plaid-straw', 'plain-cap-rolled', 'overalls-straw', 'plaid-cap', 'overalls-cap-rolled', 'plain-straw-rolled', 'plaid-rolled', 'overalls-plain'];

export function buildResident(houseIndex) {
  const farm = HOUSES[houseIndex] && HOUSES[houseIndex].kind === 'farm';
  if (farm) return buildFarmResident(houseIndex);
  const ven = HOUSES[houseIndex] && HOUSES[houseIndex].kind === 'ven';
  const look = ven ? VEN_LOOKS[(houseIndex * 5) % VEN_LOOKS.length] : null, V = VEN_STYLE, pk = (a, k = 1) => a[(houseIndex * k) % a.length];
  const striped = look === 'stripe' || look === 'gondolier';
  const shirt = !ven ? SHIRTS[houseIndex % SHIRTS.length] : striped ? '#f6f4ee' : look.startsWith('linen') ? pk(V.linen) : SHIRTS[houseIndex % SHIRTS.length];
  const hair = HAIRS[(houseIndex * 3) % HAIRS.length];

  return buildCore(houseIndex, { shirt, hair, ven, look, V, pk, striped });
}

function buildCore(houseIndex, { shirt, hair, ven = false, look = null, V = VEN_STYLE, pk = a => a[0], striped = false, farm = null }) {
  const root = new THREE.Group();
  root.name = 'resident:' + houseIndex;
  const PANTS_ = farm ? farm.pants : PANTS, SHOES_ = farm ? FARM_STYLE.boots : SHOES;
  const body = new THREE.Group();          // quica sem mexer na posição que o mundo define para root
  body.position.y = LIFT;
  root.add(body);

  // pernas e sapatos
  for (const s of [-1, 1]) {
    body.add(at(box(0.22, 0.5, 0.24, PANTS_), s * 0.14, 0.33, 0));
    body.add(at(box(0.26, farm ? 0.26 : 0.12, 0.34, SHOES_), s * 0.14, farm ? 0.13 : 0.06, 0.04));   // Colheita: botas
  }
  // tronco (camisa) + cinto
  body.add(at(cyl(0.34, 0.37, 0.62, shirt, 10), 0, 0.88, 0));
  body.add(at(cyl(0.375, 0.375, 0.08, PANTS_, 10), 0, 0.6, 0));
  if (farm) {                                                          // xadrez (faixas nos dois sentidos) e jardineira (peito + alças)
    if (farm.plaid) { for (let k = 0; k < 3; k++) body.add(at(cyl(0.377, 0.38, 0.05, '#2b2b2b', 10), 0, 0.72 + k * 0.17, 0)); for (const x of [-0.18, 0, 0.18]) body.add(at(box(0.05, 0.6, 0.05, '#2b2b2b'), x, 0.88, 0.355)); }
    if (farm.overalls) { body.add(at(box(0.44, 0.4, 0.06, PANTS_), 0, 0.82, 0.36)); body.add(at(box(0.14, 0.08, 0.07, '#d9b23a'), 0, 0.98, 0.39)); for (const sd of [-1, 1]) body.add(at(box(0.08, 0.5, 0.75, PANTS_), sd * 0.17, 1.02, 0, 0.0, 0, 0)); }
  }
  if (ven) {                                                           // Veneza: listras, avental, gola de linho
    if (striped) for (let k = 0; k < 4; k++) body.add(at(cyl(0.375 - k * 0.008, 0.38 - k * 0.008, 0.07, look === 'gondolier' ? '#1f3a68' : pk(V.stripe, 3), 10), 0, 0.7 + k * 0.12, 0));
    if (look.startsWith('apron')) { const c = pk(V.apron, 7); body.add(at(box(0.5, 0.62, 0.05, c), 0, 0.72, 0.37)); body.add(at(box(0.36, 0.22, 0.05, c), 0, 1.06, 0.35)); }
    if (look.startsWith('linen')) for (const sd of [-1, 1]) body.add(at(box(0.16, 0.05, 0.12, '#ffffff'), sd * 0.1, 1.17, 0.27, 0.3, 0, sd * 0.4));
    if (look.includes('scarf')) { const c = pk(V.scarf, 11); body.add(at(torus(0.27, 0.07, c, 6, 14), 0, 1.16, 0, Math.PI / 2, 0, 0)); body.add(at(box(0.12, 0.26, 0.05, c), 0.09, 1.0, 0.34, 0, 0, 0.2)); }
  }
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
  if (farm && farm.hat === 'straw') {                                 // chapéu de palha com fita marrom
    head.add(at(cyl(0.66, 0.66, 0.04, V.straw, 14), 0, hy + 0.38, -0.03)); head.add(at(cyl(0.36, 0.4, 0.26, V.straw, 12), 0, hy + 0.5, -0.03));
    head.add(at(cyl(0.405, 0.405, 0.06, '#6b4428', 12), 0, hy + 0.42, -0.03));
  } else if (farm && farm.hat === 'cap') {                             // boné com aba para a frente
    const c = cyl(0.44, 0.46, 0.22, farm.cap, 12); head.add(at(c, 0, hy + 0.4, -0.02)); head.add(at(box(0.5, 0.05, 0.36, farm.cap), 0, hy + 0.31, 0.38, -0.15, 0, 0));
  }
  if (ven && (look === 'gondolier' || look.endsWith('straw') || look === 'straw')) {   // chapéu de palha (gondoleiro: com fita)
    head.add(at(cyl(0.62, 0.62, 0.04, V.straw, 14), 0, hy + 0.38, -0.03));
    head.add(at(cyl(0.36, 0.38, 0.24, V.straw, 12), 0, hy + 0.5, -0.03));
    head.add(at(cyl(0.385, 0.385, 0.07, look === 'gondolier' ? '#c8402f' : pk(V.ribbon, 2), 12), 0, hy + 0.43, -0.03));
  }
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
  const armL = makeArm(shirt, -1, !!(farm && farm.rolled)), armR = makeArm(shirt, 1, !!(farm && farm.rolled));
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
