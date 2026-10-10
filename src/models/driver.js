// O motorista de entregas: mesma fisionomia e estilo do personagem da história paralela (cabeça grande facetada, corpo compacto,
// pernas curtas, mãos simples, tênis um pouco maiores), sombreamento chapado e fosco, cores sólidas. Camisa, calça e tênis têm UM material cada (recolorível no Shop);
// dobras e detalhes são só geometria (mesmo material), nada de cores/estampas fixas nessas peças.
// Rosto olha para +X local. Compartilhado por walker.js (a pé) e titleDriver.js (na janela da van).
import * as THREE from 'three';
import { sphere, mesh, mat, at } from './kit.js';

/** Cores do personagem (Shop): materiais únicos e compartilhados (jogo, tela inicial e Shop). */
export const CHAR_DEFAULT = { skin: '#e8b48a', shirt: '#2a9df4', pants: '#2f3a55', shoes: '#1b1b1f' };
export const CHAR_MATS = Object.fromEntries(Object.entries(CHAR_DEFAULT).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true })]));
export const setCharColors = c => { for (const k of Object.keys(CHAR_MATS)) if (c && c[k]) CHAR_MATS[k].color.set(c[k]); };

const smooth = { roughness: 0.9 };                        // fosco e facetado (como a referência)
const CAP = mat('#e3262e', smooth), LIP = mat('#5a2e22', smooth);

/** Esfera esticada (material pronto). */
export const ball = (r, m, sx = 1, sy = 1, sz = 1) => { const o = sphere(r, m, 22, 16); o.scale.set(sx, sy, sz); return o; };
// gap > 0: deixa uma abertura na frente (+X) de ±gap rad (ex.: casaco aberto)
const lathe = (pts, m, seg = 28, gap = 0) => mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y)), seg,
  gap ? Math.PI / 2 + gap : 0, gap ? Math.PI * 2 - 2 * gap : Math.PI * 2), m);
/** Membro contínuo e afinando: junta de cima na origem (raio r0), junta de baixo em y = −len (raio r1), pontas arredondadas. */
export function limb(r0, r1, len, m) {
  const pts = [], N = 8;
  for (let i = 0; i <= N; i++) { const a = -Math.PI / 2 + i / N * Math.PI / 2; pts.push([r1 * Math.cos(a), -len + r1 * Math.sin(a)]); }
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI / 2; pts.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
  return lathe(pts, m);
}
/** Tronco da camisa (base da barra em y = 0, gola em y ≈ 0.71): peito cheio, cintura leve, ombros caídos. */
export function shirtTorso(m, gap = 0) {
  const t = lathe([[0, -0.06], [0.2, -0.05], [0.27, 0], [0.262, 0.07], [0.25, 0.16], [0.27, 0.3], [0.288, 0.42], [0.288, 0.52], [0.26, 0.6], [0.2, 0.66], [0.12, 0.7], [0, 0.71]], m, 28, gap);
  t.scale.set(0.86, 1, 1.2); return t;
}
/** Mão simples (luva arredondada + polegar), pendurada em y = 0 (punho). */
/** Mão de desenho para a pose da janela: palma achatada, dedos juntos e polegar separado (um pouco mais larga que o punho). */
export function flatHand(m) {
  const g = new THREE.Group();
  g.add(at(ball(0.07, m, 1.15, 1, 0.55), 0, -0.065, 0));                                          // palma achatada
  const f = at(mesh(new THREE.CapsuleGeometry(0.052, 0.04, 6, 14), m), 0, -0.145, 0); f.scale.set(1.3, 1, 0.6); g.add(f);   // dedos juntos
  g.add(at(mesh(new THREE.CapsuleGeometry(0.024, 0.05, 6, 10), m), 0.078, -0.06, 0, 0, 0, 0.5));   // polegar
  return g;
}
export function hand(m, k = 1) {
  const g = new THREE.Group();
  g.add(at(ball(0.085 * k, m, 0.75, 1.1, 1), 0, -0.07 * k, 0), at(ball(0.038 * k, m, 1, 1.4, 1), 0.055 * k, -0.04 * k, 0, 0, 0, -0.4));
  return g;
}

// ---- cabeça (mesmo desenho do personagem da história paralela): esfera de poucas faces, nariz e orelhas
// arredondados, olhos simples, sobrancelhas retas, boca pequena e reta (sério e tranquilo). Boné e óculos escuros do jogador.
const lowBall = (r, m, sx = 1, sy = 1, sz = 1) => { const o = mesh(new THREE.SphereGeometry(r, 10, 8), m); o.scale.set(sx, sy, sz); return o; };
const SIDE = { side: THREE.DoubleSide };
const HAIR2 = mat('#3a2418', { roughness: 0.9, ...SIDE }), HAIRD = mat('#2e1c12', { roughness: 0.9 }), EYE = mat('#1d1210'), FRAME = mat('#1c1c22');
const LENS2 = mat('#101218', { roughness: 0.25, metalness: 0.3, ...SIDE });

/** Cabeça grande de raio r (rosto para +X, centro na origem). */
export function buildHead(r) {
  const SKIN = CHAR_MATS.skin, h = new THREE.Group();
  h.add(lowBall(r, SKIN, 1, 0.98, 1.02));                                                   // crânio facetado
  const face = (y, z) => Math.sqrt(Math.max(0, r * r - y * y - z * z));                    // x da superfície do rosto
  h.add(at(lowBall(r * 0.15, SKIN, 1, 0.9, 1), face(-0.06 * r, 0) + 0.01, -0.06 * r, 0));   // nariz
  for (const s of [-1, 1]) {
    h.add(at(lowBall(r * 0.17, SKIN, 0.55, 1, 0.7), -0.03 * r, -0.02 * r, s * r * 0.97));   // orelhas
    const ez = s * r * 0.38, ey = r * 0.12;
    h.add(at(lowBall(r * 0.1, EYE, 0.35, 1.15, 0.85), face(ey, ez) - 0.005, ey, ez));      // olhos simples
    // óculos escuros: aro octogonal fino com lente escura, hastes até a orelha
    const ring = mesh(new THREE.TorusGeometry(r * 0.27, r * 0.035, 4, 8), FRAME);
    ring.position.set(face(ey, ez) + r * 0.08, ey, ez); ring.rotation.set(0, Math.PI / 2 + s * 0.35, Math.PI / 8); h.add(ring);
    const lens = mesh(new THREE.CircleGeometry(r * 0.27, 8), LENS2); lens.position.copy(ring.position); lens.rotation.copy(ring.rotation); h.add(lens);
    h.add(at(box3(r * 0.75, r * 0.05, r * 0.05, FRAME), r * 0.45, ey + 0.02 * r, s * r * 0.72, 0, s * 0.55, 0));
    // sobrancelhas bem definidas, quase retas (sério, sem franzir)
    const by = r * 0.44, bz = s * r * 0.36;
    h.add(at(box3(r * 0.08, r * 0.09, r * 0.34, HAIRD), face(by, bz) + 0.01, by, bz, s * 0.08, -s * 0.3, 0));
  }
  h.add(at(box3(r * 0.08, r * 0.05, r * 0.3, FRAME), face(r * 0.14, 0) + r * 0.08, r * 0.14, 0));   // ponte dos óculos
  h.add(at(box3(r * 0.05, r * 0.04, r * 0.24, LIP), face(-r * 0.42, 0) - 0.005, -r * 0.42, 0));     // boca pequena e reta
  // cabelo: nuca + mechas nos lados (o topo fica embaixo do boné)
  h.add(mesh(new THREE.SphereGeometry(r * 1.05, 10, 7, -1.5, 3.0, 1.0, 0.95), HAIR2));
  for (const s of [-1, 1]) for (const [x, y] of [[0.25, 0.25], [-0.15, 0.2]]) {
    const t = mesh(new THREE.ConeGeometry(r * 0.2, r * 0.55, 5), HAIR2);
    t.position.set(x * r, y * r, s * r * 0.92); t.rotation.set(s * (Math.PI - 0.4), 0, 0); h.add(t);
  }
  // boné justo: calota com espessura + aba ligada na borda da frente + botão
  const R0 = r * 0.99, R1 = r * 1.07, TC = 1.08, pts = [[R0 * Math.sin(TC), R0 * Math.cos(TC)]];
  for (let i = 0; i <= 8; i++) { const t = TC * (1 - i / 8); pts.push([R1 * Math.sin(t), R1 * Math.cos(t)]); }
  h.add(lathe(pts, CAP, 12));
  h.add(at(lowBall(r * 0.08, CAP, 1, 0.6, 1), 0, R1 * 0.99, 0));
  const rc = R0 * Math.sin(TC), E = r * 0.62, A = 1.0, sh = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const t = -A + 2 * A * i / 10; (i ? sh.lineTo.bind(sh) : sh.moveTo.bind(sh))(rc * Math.cos(t), rc * Math.sin(t)); }
  for (let i = 10; i >= 0; i--) { const t = -A + 2 * A * i / 10, e = rc + E * Math.cos(t / A * Math.PI / 2) ** 1.2; sh.lineTo(e * Math.cos(t), e * Math.sin(t)); }
  const brim = mesh(new THREE.ExtrudeGeometry(sh, { depth: r * 0.06, bevelEnabled: false, curveSegments: 4 }), CAP);
  const bg = at(new THREE.Group(), 0, R0 * Math.cos(TC) + r * 0.02, 0, 0, 0, 0.12); brim.rotation.x = Math.PI / 2; bg.add(brim); h.add(bg);
  return h;
}
const box3 = (w, hh, d, m) => mesh(new THREE.BoxGeometry(w, hh, d), m);

/** Medidas do corpo usadas por quem monta poses (seatedDriver.js). */
export const BODY = { pelvisY: 0.64, torsoY: 0.64 + 0.06, upperArm: 0.28, foreArm: 0.2 };
/** Corpo articulado (origem nos pés, olhando para +X). Retorna as juntas para animar. */
export function buildBody(parent, opts = {}) {
  const SKIN = CHAR_MATS.skin, SHIRT = CHAR_MATS.shirt, PANTS = CHAR_MATS.pants, SHOES = CHAR_MATS.shoes;
  const pelvis = new THREE.Group(); pelvis.position.y = BODY.pelvisY; parent.add(pelvis);
  const hips = lathe([[0, -0.15], [0.13, -0.14], [0.21, -0.09], [0.25, -0.01], [0.25, 0.08], [0.24, 0.17], [0, 0.18]], PANTS);
  hips.scale.set(0.85, 1, 1.15); pelvis.add(hips);                                                  // quadril (embaixo da camisa)
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso);
  torso.add(shirtTorso(SHIRT));
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0, -0.03, s * 0.14); pelvis.add(hip);
    hip.add(limb(0.16, 0.135, 0.25, PANTS));                                                         // coxa (contínua com a canela; pernas curtas)
    const knee = new THREE.Group(); knee.position.y = -0.25; hip.add(knee);
    knee.add(limb(0.135, 0.13, 0.22, PANTS));                                                        // canela até o tênis
    const foot = new THREE.Group(); foot.position.y = -0.22; knee.add(foot);
    const shoe = at(mesh(new THREE.CapsuleGeometry(0.115, 0.17, 8, 18), SHOES), 0.07, -0.035, 0, 0, 0, Math.PI / 2);
    shoe.scale.set(1.05, 1.12, 1.15); foot.add(shoe);                                                   // tênis: bico redondo e volume
    const sole = at(mesh(new THREE.CapsuleGeometry(0.128, 0.19, 8, 18), SHOES), 0.07, -0.105, 0, 0, 0, Math.PI / 2);
    sole.scale.set(0.34, 1.12, 1.22); foot.add(sole);                                                   // sola mais larga (borda visível)
    legs.push({ hip, knee, foot });
    const sh = new THREE.Group(); sh.position.set(0, 0.53, s * 0.26); torso.add(sh);                 // ombro embutido no tronco (sem bola aparente)
    sh.add(limb(0.125, 0.11, 0.15, SHIRT));                                                          // manga curta
    sh.add(limb(0.085, 0.074, 0.28, SKIN));                                                          // braço
    const elbow = new THREE.Group(); elbow.position.y = -0.28; sh.add(elbow);
    const wrist = new THREE.Group(); wrist.position.y = -0.2; elbow.add(wrist);
    elbow.add(limb(0.074, 0.062, 0.2, SKIN)); wrist.add(flatHand(SKIN));                       // antebraço contínuo + mão simples
    arms.push({ sh, elbow, wrist });
  }
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  head.add(at(limb(0.095, 0.1, 0.12, SKIN), 0, 0.12, 0));                                            // pescoço
  head.add(at(buildHead(0.45), 0, 0.46, 0));
  return { pelvis, torso, legs, arms, head };
}
