// Seu Galdino (casa fixa do Bairro 1): sentado numa cadeira de balanço de madeira no quintal, lendo jornal
// e balançando bem de leve. Não liga para entregas (main.js não mostra morador na porta; as falas são do narrador).
// Estilo low-poly (sombreamento chapado), como a referência. Frente do personagem/cadeira = +X local.
import * as THREE from 'three';
import { mesh, mat, at, box, sphere, cone, dynamic } from './kit.js';
import { limb, shirtTorso, flatHand } from './driver.js';

const C = {
  skin: '#f3cfa8', hair: '#e3c45c', hairD: '#c9a743', red: '#c01212', white: '#f2f1ec', pants: '#4a0b10',
  shoe: '#f4f4f1', sole: '#260407', frame: '#3a2115', eye: '#1d1210', brow: '#4a2a16', mouth: '#5a2e22',
  wood: '#9a6a3e', woodD: '#74482a',
};
const M = Object.fromEntries(Object.entries(C).map(([k, c]) => [k, mat(c)]));
const JACKET = mat(C.red, { side: THREE.DoubleSide });          // casaco aberto: o lado de dentro aparece na abertura
const lowBall = (r, m, sx = 1, sy = 1, sz = 1) => { const o = mesh(new THREE.SphereGeometry(r, 10, 8), m); o.scale.set(sx, sy, sz); return o; };

/** Jornal: textura de capa (manchete, foto, colunas) e de miolo (só colunas). */
function paperTexture(front) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 280;
  const g = cv.getContext('2d');
  g.fillStyle = '#efece2'; g.fillRect(0, 0, 256, 280);
  g.fillStyle = '#9a978d';
  let y = 14;
  if (front) {
    g.fillStyle = '#222'; g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center';
    g.fillText('DIÁRIO', 128, 40); g.font = 'bold 15px Georgia, serif'; g.fillText('DA VILA ADRESS', 128, 60);
    g.fillRect(14, 70, 228, 3);
    g.fillStyle = '#7d8a96'; g.fillRect(16, 84, 104, 70);           // foto
    g.fillStyle = '#9a978d';
    for (let i = 0; i < 6; i++) g.fillRect(130, 86 + i * 12, 108 - (i % 3) * 14, 6);
    y = 168;
  }
  for (; y < 266; y += 12) for (const x of [16, 134]) g.fillRect(x, y, 104 - ((y / 12) % 4) * 9, 6);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let paperMats = null;
const getPaperMats = () => paperMats || (paperMats = {
  front: new THREE.MeshStandardMaterial({ map: paperTexture(true), roughness: 0.9 }),
  inner: new THREE.MeshStandardMaterial({ map: paperTexture(false), roughness: 0.9 }),
});

/** Cadeira de balanço de madeira (frente +X, base dos balanços em y = 0). */
function rockingChair() {
  const g = new THREE.Group();
  const W = M.wood, D = M.woodD;
  g.add(at(box(0.7, 0.07, 0.78, W), 0.02, 0.33, 0));                            // assento
  for (const z of [-0.36, 0.36]) {
    // balanços: arco de círculo (raio R) com o ponto mais baixo em y = 0
    const R = 2.4, arc = 0.72;
    g.add(at(mesh(new THREE.TorusGeometry(R, 0.045, 5, 18, arc), D), 0, R + 0.045, z, 0, 0, -Math.PI / 2 - arc / 2));
    for (const x of [-0.27, 0.3]) g.add(at(box(0.06, 0.26, 0.06, D), x, 0.19, z));   // pés até os balanços
    g.add(at(box(0.62, 0.05, 0.09, W), 0.0, 0.64, z * 1.12));                     // braço da cadeira
    g.add(at(box(0.05, 0.3, 0.05, D), 0.27, 0.49, z * 1.12));                      // apoio da frente do braço
  }
  const back = new THREE.Group(); back.position.set(-0.33, 0.36, 0); back.rotation.z = 0.2; g.add(back);   // encosto inclinado para trás
  for (const z of [-0.36, 0.36]) back.add(at(box(0.07, 1.05, 0.07, D), 0, 0.52, z));
  back.add(at(box(0.08, 0.12, 0.84, W), 0, 1.04, 0));
  back.add(at(box(0.06, 0.07, 0.76, W), 0, 0.28, 0));
  for (const z of [-0.22, 0, 0.22]) back.add(at(box(0.04, 0.72, 0.1, W), 0.01, 0.66, z));
  return g;
}

/** Cabeça (raio r, centro na origem, rosto para +X): loiro, óculos, expressão séria. */
function readerHead(r, { sun = false } = {}) {
  const h = new THREE.Group();
  h.add(lowBall(r, M.skin, 1, 0.98, 1.02));
  const face = (y, z) => Math.sqrt(Math.max(0, r * r - y * y - z * z));            // x da superfície do rosto
  h.add(at(lowBall(r * 0.15, M.skin, 1, 0.9, 1), face(-0.06 * r, 0) + 0.01, -0.06 * r, 0));   // nariz
  for (const s of [-1, 1]) {
    h.add(at(lowBall(r * 0.17, M.skin, 0.55, 1, 0.7), -0.03 * r, -0.02 * r, s * r * 0.97)); // orelha
    const ez = s * r * 0.38, ey = r * 0.12;
    h.add(at(lowBall(r * 0.1, M.eye, 0.35, 1.15, 0.85), face(ey, ez) - 0.005, ey, ez)); // olho
    // óculos: aro octogonal (fino), haste até a orelha
    const ring = mesh(new THREE.TorusGeometry(r * 0.27, r * 0.035, 4, 8), M.frame);
    ring.position.set(face(ey, ez) + r * 0.08, ey, ez); ring.rotation.set(0, Math.PI / 2 + s * 0.35, Math.PI / 8); h.add(ring);
    if (sun) {                                                                    // óculos de sol: lente escura dentro do mesmo aro
      const lens = mesh(new THREE.CircleGeometry(r * 0.27, 8), mat('#141619', { side: THREE.DoubleSide, roughness: 0.2, metalness: 0.3 }));
      lens.position.copy(ring.position); lens.rotation.copy(ring.rotation); h.add(lens);
    }
    h.add(at(box(r * 0.75, r * 0.05, r * 0.05, M.frame), r * 0.45, ey + 0.02 * r, s * r * 0.72, 0, s * 0.55, 0));
    // sobrancelhas grossas, retas e um pouco franzidas (sério)
    const by = r * 0.42, bz = s * r * 0.36;
    h.add(at(box(r * 0.08, r * 0.1, r * 0.36, M.brow), face(by, bz) + 0.01, by, bz, s * 0.22, -s * 0.3, 0));
  }
  h.add(at(box(r * 0.08, r * 0.05, r * 0.3, M.frame), face(r * 0.14, 0) + r * 0.08, r * 0.14, 0));   // ponte dos óculos
  h.add(at(box(r * 0.05, r * 0.04, r * 0.34, M.mouth), face(-r * 0.42, 0) - 0.005, -r * 0.42, 0));  // boca reta
  // cabelo loiro: calota (puxada para trás, testa livre, sem franja) + nuca + mechas nos lados (formas chapadas)
  h.add(at(mesh(new THREE.SphereGeometry(r * 1.07, 10, 6, 0, Math.PI * 2, 0, 1.25), M.hair), -r * 0.04, r * 0.04, 0, 0, 0, 0.42));
  h.add(mesh(new THREE.SphereGeometry(r * 1.05, 10, 7, -1.5, 3.0, 1.0, 0.95), M.hairD));
  for (const s of [-1, 1]) for (const [x, y] of [[0.25, 0.25], [-0.15, 0.2]]) {
    const t = cone(r * 0.2, r * 0.55, M.hairD, 5);
    t.position.set(x * r, y * r, s * r * 0.92); t.rotation.set(s * (Math.PI - 0.4), 0, 0); h.add(t);
  }
  return h;
}

/** Sentado na cadeira (frente +X). Retorna { group, head, paper } para animar. */
function readerSeated() {
  const g = new THREE.Group();
  // pernas: quadril no assento, coxas para a frente, canelas para baixo, tênis brancos com sola quase preta
  g.add(at(lowBall(0.27, M.pants, 1.05, 0.62, 1.15), -0.04, 0.47, 0));
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(-0.04, 0.47, s * 0.14); thigh.rotation.z = Math.PI / 2 + 0.06; g.add(thigh);
    thigh.add(limb(0.15, 0.13, 0.3, M.pants));
    const knee = new THREE.Group(); knee.position.y = -0.3; knee.rotation.z = -Math.PI / 2 + 0.12; thigh.add(knee);
    knee.add(limb(0.13, 0.12, 0.27, M.pants));
    const foot = new THREE.Group(); foot.position.y = -0.27; foot.rotation.z = -0.18; knee.add(foot);
    const shoe = at(mesh(new THREE.CapsuleGeometry(0.11, 0.16, 4, 8), M.shoe), 0.07, -0.03, 0, 0, 0, Math.PI / 2); shoe.scale.set(0.95, 1, 1.05); foot.add(shoe);
    const sole = at(mesh(new THREE.CapsuleGeometry(0.122, 0.18, 4, 8), M.sole), 0.07, -0.1, 0, 0, 0, Math.PI / 2); sole.scale.set(0.32, 1, 1.1); foot.add(sole);
  }
  // tronco: camisa branca + casaco vermelho aberto no meio (zíper aberto), gola
  const torso = new THREE.Group(); torso.position.set(-0.06, 0.53, 0); torso.rotation.z = 0.14; g.add(torso);   // encostado
  torso.add(shirtTorso(M.white));
  const jacket = shirtTorso(JACKET, 0.32); jacket.scale.multiplyScalar(1.05); jacket.position.y = -0.03; torso.add(jacket);
  for (const s of [-1, 1]) {
    torso.add(at(box(0.05, 0.62, 0.04, M.white), 0.235, 0.32, s * 0.1, 0, 0, 0.05));   // dentes do zíper (claros) nas bordas
    torso.add(at(box(0.12, 0.2, 0.1, M.red), 0.17, 0.63, s * 0.14, s * 0.5, 0, -0.5));  // gola do casaco
  }
  // braços: mangas do casaco puxadas até o meio do antebraço (dobra grossa), segurando o jornal na frente do peito
  const hands = [], arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(0, 0.56, s * 0.31); sh.rotation.set(-s * 0.12, 0, 0.55); torso.add(sh);
    sh.add(limb(0.14, 0.12, 0.27, M.red));
    sh.add(limb(0.085, 0.075, 0.28, M.skin));
    const elbow = new THREE.Group(); elbow.position.y = -0.28; elbow.rotation.set(s * 0.25, 0, 1.25); sh.add(elbow);
    elbow.add(limb(0.12, 0.11, 0.06, M.red));                                      // manga dobrada
    elbow.add(at(mesh(new THREE.TorusGeometry(0.1, 0.04, 5, 10), M.red), 0, -0.08, 0, Math.PI / 2, 0, 0));
    elbow.add(limb(0.072, 0.06, 0.2, M.skin));
    const wrist = new THREE.Group(); wrist.position.y = -0.2; elbow.add(wrist);
    wrist.add(flatHand(M.skin));
    hands.push(wrist); arms.push({ s, sh, elbow });
  }
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  head.add(at(limb(0.095, 0.1, 0.12, M.skin), 0, 0.12, 0));
  const face = readerHead(0.42); face.position.y = 0.44; head.add(face);
  head.rotation.z = -0.34;                                                         // olhando para baixo, para o jornal
  // jornal aberto entre as mãos (duas páginas em V); posto onde as mãos realmente estão
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const hp = hands.map(w => w.localToWorld(new THREE.Vector3(0, -0.07, 0)).applyMatrix4(inv));
  const paper = new THREE.Group();
  paper.position.copy(hp[0]).add(hp[1]).multiplyScalar(0.5);
  paper.rotation.z = 0.3;                                                          // inclinado para ele ler
  paper.position.x += 0.07 * Math.cos(0.3); paper.position.y += 0.07 * Math.sin(0.3);   // as mãos ficam do lado de dentro (seguram o jornal por trás)
  g.add(paper);
  const half = Math.abs(hp[1].z - hp[0].z) / 2 + 0.04, PW = half * 1.6, PH = 0.74;   // jornal maior
  const pm = getPaperMats(), pages = [];
  for (const s of [-1, 1]) {
    const page = new THREE.Group(); page.rotation.y = -s * 0.28; paper.add(page); pages.push(page);  // dobra no meio; as bordas vêm na direção dele (o miolo fica de frente para ele)
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), s > 0 ? pm.front : pm.inner);   // lado de fora: capa (manchete) numa página, contracapa na outra
    outer.rotation.y = Math.PI / 2; outer.position.set(0.004, 0.02, s * PW / 2); page.add(outer);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), pm.inner);       // lado de dentro (ele lê)
    inner.rotation.y = -Math.PI / 2; inner.position.set(-0.004, 0.02, s * PW / 2); page.add(inner);
  }
  // empurra o jornal para a frente até nenhuma parte das mãos atravessar as páginas (as mãos ficam por trás, segurando)
  const handVerts = [], v = new THREE.Vector3(), m = new THREE.Matrix4();
  const outers = pages.map(pg => pg.children[0]);
  const nrm = new THREE.Vector3(Math.cos(paper.rotation.z), Math.sin(paper.rotation.z), 0);
  for (let it = 0; it < 40; it++) {
    g.updateMatrixWorld(true);
    let worst = 0;
    for (const w of hands) w.traverse(o => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      for (const pl of outers) {
        m.copy(pl.matrixWorld).invert().multiply(o.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m);           // no plano da página: z = distância para fora
          if (Math.abs(v.x) < PW / 2 + 0.02 && Math.abs(v.y) < PH / 2 + 0.02) worst = Math.max(worst, v.z + 0.015);
        }
      }
    });
    if (worst <= 0) break;
    paper.position.addScaledVector(nrm, Math.min(0.03, worst + 0.003));
  }
  return { group: g, head, paper, torso, arms, pages, PW };
}

/** Cadeira + leitor, com a animação (balanço leve + leitura). Origem no chão, frente +X. */
export function buildReaderSpot() {
  const root = dynamic(new THREE.Group());
  root.name = 'reader-spot';
  const R = 2.4 + 0.045;
  const pivot = new THREE.Group(); pivot.position.y = R; root.add(pivot);         // balança em volta do centro do arco dos balanços
  const content = new THREE.Group(); content.position.y = -R; pivot.add(content);
  content.add(rockingChair());
  const rd = readerSeated();
  content.add(rd.group);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  // pose "lendo" e pose "jornal de lado" (dobrado em cima do braço da cadeira, do lado direito dele, +Z); k = 0..1 entre elas
  const hold = { pos: rd.paper.position.clone(), q: rd.paper.quaternion.clone() };
  const aside = { pos: new THREE.Vector3(0.02, 0.69, 0.47),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, Math.PI / 2)) };   // deitado no braço, por fora da cadeira
  const ARM_HOLD = rd.arms.map(a => ({ sh: a.sh.rotation.clone(), el: a.elbow.rotation.clone() }));
  const ARM_REST = rd.arms.map(a => ({ sh: new THREE.Euler(-a.s * 0.05, 0, 0.3), el: new THREE.Euler(0, 0, 0.95) }));
  let k = 0, goal = 0, lastT = null;
  const ease = x => x * x * (3 - 2 * x);
  /** true: coloca o jornal de lado (para conversar); false: volta a ler. */
  root.userData.setAside = on => { goal = on ? 1 : 0; };
  root.userData.asideDone = () => k === goal;
  root.userData.update = t => {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    k = goal > k ? Math.min(goal, k + dt / 1.1) : Math.max(goal, k - dt / 1.1);
    const e = ease(k), read = 1 - e;
    pivot.rotation.z = 0.035 * Math.sin(t * 1.4);                                  // balanço bem leve
    rd.head.rotation.y = 0.12 * Math.sin(t * 0.55) * read - 0.55 * e;              // lendo: os olhos correm pelas colunas; conversando: olha para quem chegou
    rd.head.rotation.x = 0.03 * Math.sin(t * 0.37);
    rd.head.rotation.z = -0.34 * read - 0.05 * e;
    const turn = Math.max(0, Math.sin(t * 0.21) - 0.96) * 25 * read;               // de vez em quando ajeita o jornal
    // jornal: sai das mãos num arco curto, fecha a dobra e fica deitado no braço da cadeira
    rd.paper.position.lerpVectors(hold.pos, aside.pos, e);
    rd.paper.position.y += (0.01 * Math.sin(t * 1.1) + turn * 0.02) * read + Math.sin(e * Math.PI) * 0.25;
    rd.paper.quaternion.slerpQuaternions(hold.q, aside.q, e);
    if (read > 0.999) rd.paper.rotation.x = turn * 0.08;
    rd.pages[0].rotation.y = 0.28 + (Math.PI - 0.56) * e;                          // a página da esquerda dobra por cima da outra
    rd.arms.forEach((a, i) => {
      const h = ARM_HOLD[i], r = ARM_REST[i];
      a.sh.rotation.set(h.sh.x + (r.sh.x - h.sh.x) * e, 0, h.sh.z + (r.sh.z - h.sh.z) * e);
      a.elbow.rotation.set(h.el.x + (r.el.x - h.el.x) * e, 0, h.el.z + (r.el.z - h.el.z) * e);
    });
    rd.torso.scale.y = 1 + 0.01 * Math.sin(t * 1.9);                               // respiração
  };
  return root;
}

/**
 * Seu Galdino reclinado numa espreguiçadeira (terraço do prédio fixo do Bairro 6), de óculos de sol, sem jornal.
 * Origem no tampo da espreguiçadeira (comprimento ao longo de X, cabeceira em −X), frente = +X. Inclui o encosto levantado.
 */
export function buildLoungerReader() {
  const root = dynamic(new THREE.Group());
  root.name = 'lounger-reader';
  const g = new THREE.Group(); g.scale.setScalar(0.9); root.add(g);
  // encosto levantado (almofada branca inclinada na cabeceira)
  g.add(at(box(1.0, 0.09, 0.98, mat('#ffffff')), -0.62, 0.32, 0, 0, 0, -0.62));
  // quadril e pernas esticadas para a frente (pés para cima)
  g.add(at(lowBall(0.27, M.pants, 1.05, 0.62, 1.15), -0.12, 0.17, 0));
  for (const s of [-1, 1]) {
    const thigh = new THREE.Group(); thigh.position.set(-0.12, 0.16, s * 0.14); thigh.rotation.z = Math.PI / 2 + 0.04; g.add(thigh);
    thigh.add(limb(0.15, 0.13, 0.3, M.pants));
    const knee = new THREE.Group(); knee.position.y = -0.3; knee.rotation.z = -0.06; thigh.add(knee);
    knee.add(limb(0.13, 0.12, 0.27, M.pants));
    const foot = new THREE.Group(); foot.position.y = -0.27; knee.add(foot);
    const shoe = at(mesh(new THREE.CapsuleGeometry(0.11, 0.16, 4, 8), M.shoe), 0.07, -0.03, 0, 0, 0, Math.PI / 2); shoe.scale.set(0.95, 1, 1.05); foot.add(shoe);
    const sole = at(mesh(new THREE.CapsuleGeometry(0.122, 0.18, 4, 8), M.sole), 0.07, -0.1, 0, 0, 0, Math.PI / 2); sole.scale.set(0.32, 1, 1.1); foot.add(sole);
  }
  // tronco deitado no encosto: camisa branca + casaco vermelho aberto
  const torso = new THREE.Group(); torso.position.set(-0.16, 0.22, 0); torso.rotation.z = 0.95; g.add(torso);
  torso.add(shirtTorso(M.white));
  const jacket = shirtTorso(JACKET, 0.32); jacket.scale.multiplyScalar(1.05); jacket.position.y = -0.03; torso.add(jacket);
  for (const s of [-1, 1]) {
    torso.add(at(box(0.05, 0.62, 0.04, M.white), 0.235, 0.32, s * 0.1, 0, 0, 0.05));
    torso.add(at(box(0.12, 0.2, 0.1, M.red), 0.17, 0.63, s * 0.14, s * 0.5, 0, -0.5));
    // braços relaxados ao lado do corpo, mangas dobradas
    const sh = new THREE.Group(); sh.position.set(0, 0.56, s * 0.31); sh.rotation.set(-s * 0.2, 0, -0.15); torso.add(sh);
    sh.add(limb(0.14, 0.12, 0.27, M.red));
    sh.add(limb(0.085, 0.075, 0.28, M.skin));
    const elbow = new THREE.Group(); elbow.position.y = -0.28; elbow.rotation.set(-s * 0.1, 0, 0.35); sh.add(elbow);
    elbow.add(limb(0.12, 0.11, 0.06, M.red));
    elbow.add(at(mesh(new THREE.TorusGeometry(0.1, 0.04, 5, 10), M.red), 0, -0.08, 0, Math.PI / 2, 0, 0));
    elbow.add(limb(0.072, 0.06, 0.2, M.skin));
    const wrist = new THREE.Group(); wrist.position.y = -0.2; elbow.add(wrist);
    wrist.add(flatHand(M.skin));
  }
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  head.add(at(limb(0.095, 0.1, 0.12, M.skin), 0, 0.12, 0));
  const face = readerHead(0.42, { sun: true }); face.position.y = 0.44; head.add(face);
  head.rotation.z = -0.55;                                                     // olha para a frente, por cima dos pés (para o sol)
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  root.userData.update = t => {
    torso.scale.y = 1 + 0.012 * Math.sin(t * 1.6);                               // respiração tranquila
    head.rotation.y = 0.05 * Math.sin(t * 0.3);
  };
  return root;
}
