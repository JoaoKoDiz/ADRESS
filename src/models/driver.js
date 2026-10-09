// O motorista de entregas: estilo desenho animado, cabeça grande, corpo compacto, membros arredondados, mãos simples,
// tênis grandes. Sombreamento liso, cores sólidas. Camisa, calça e tênis têm UM material cada (recolorível no Shop);
// dobras e detalhes são só geometria (mesmo material), nada de cores/estampas fixas nessas peças.
// Rosto olha para +X local. Compartilhado por walker.js (a pé) e titleDriver.js (na janela da van).
import * as THREE from 'three';
import { sphere, mesh, mat, at } from './kit.js';

/** Cores do personagem (Shop): materiais únicos e compartilhados (jogo, tela inicial e Shop). */
export const CHAR_DEFAULT = { skin: '#e8b48a', shirt: '#2a9df4', pants: '#2f3a55', shoes: '#1b1b1f' };
export const CHAR_MATS = Object.fromEntries(Object.entries(CHAR_DEFAULT).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })]));
export const setCharColors = c => { for (const k of Object.keys(CHAR_MATS)) if (c && c[k]) CHAR_MATS[k].color.set(c[k]); };

const smooth = { flatShading: false, roughness: 0.6 };
const HAIR = mat('#3a2418', smooth), CAP = mat('#e3262e', smooth), BROW = mat('#2b1a12', smooth), LIP = mat('#8a3b2a', smooth);
const LENS = mat('#101218', { flatShading: false, roughness: 0.18, metalness: 0.35 });

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

// ---- cabeça: esfera com mandíbula arredondada (a parte de baixo da frente afina e alonga um pouco)
const JAW = { x: 0.08, z: 0.2, y: 1.07 };
const front = xn => THREE.MathUtils.smoothstep(xn, -0.2, 0.6);
function jaw(xn, yn) { const k = Math.pow(Math.max(0, -yn), 1.5) * front(xn); return { fx: 1 - JAW.x * k, fz: 1 - JAW.z * k, fy: yn < 0 ? 1 + (JAW.y - 1) * front(xn) : 1 }; }
function headGeo(r) {
  const g = new THREE.SphereGeometry(r, 40, 30), p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), f = jaw(x / r, y / r);
    p.setXYZ(i, x * f.fx, y * f.fy, z * f.fz);
    const v = new THREE.Vector3(n.getX(i) / f.fx, n.getY(i) / f.fy, n.getZ(i) / f.fz).normalize(); n.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}
/** Ponto da superfície do rosto (frente, +X) na altura y e lateral z; k > 1 afasta um pouco para fora. */
function onFace(r, y, z, k = 1) {
  const fy = y < 0 ? JAW.y : 1, yn = y / fy / r;
  let x0 = Math.sqrt(Math.max(0, 1 - yn * yn - (z / r) ** 2)) * r;
  for (let i = 0; i < 3; i++) { const f = jaw(x0 / r, yn); x0 = Math.sqrt(Math.max(0, 1 - yn * yn - (z / f.fz / r) ** 2)) * r; }
  const f = jaw(x0 / r, yn);
  return new THREE.Vector3(x0 * f.fx * k, y * k, z * k);
}
const tube = (pts, rad, m) => {
  const g = new THREE.Group(), c = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(c, 24, rad, 8, false), m));
  for (const e of [pts[0], pts[pts.length - 1]]) g.add(at(sphere(rad, m, 10, 8), e.x, e.y, e.z));   // pontas arredondadas
  return g;
};
/** Pedaço de esfera (raio R) entre os ângulos dados — encaixa certinho na cabeça (óculos, cabelo). */
const patch = (R, m, p0, pl, t0, tl) => mesh(new THREE.SphereGeometry(R, 24, 10, p0, pl, t0, tl), m);
const SIDE = { side: THREE.DoubleSide };
const HAIR2 = mat('#3a2418', { ...smooth, ...SIDE }), LENS2 = mat('#101218', { flatShading: false, roughness: 0.18, metalness: 0.35, ...SIDE });

/** Cabeça grande de raio r: pele, cabelo curto, boné, óculos escuros, sobrancelhas, nariz redondo e sorriso de canto. Centro na origem. */
export function buildHead(r) {
  const SKIN = CHAR_MATS.skin, h = new THREE.Group();
  h.add(mesh(headGeo(r), SKIN));                                                           // crânio + mandíbula
  for (const s of [-1, 1]) h.add(at(ball(r * 0.16, SKIN, 0.55, 1, 0.7), -r * 0.04, r * 0.0, s * r * 0.97));   // orelhas
  h.add(at(ball(r * 0.14, SKIN, 1, 0.95, 1), ...onFace(r, -r * 0.06, 0, 0.99).toArray()));  // nariz redondo
  // cabelo: nuca + costeletas acima das orelhas (formas lisas embaixo do boné)
  h.add(patch(r * 1.025, HAIR2, -1.15, 2.3, 0.95, 0.95));
  for (const s of [-1, 1]) h.add(patch(r * 1.025, HAIR2, s > 0 ? 1.1 : -1.88, 0.78, 0.95, 0.4));
  // boné justo: calota com espessura + aba ligada na borda da frente + botão
  const R0 = r * 0.99, R1 = r * 1.05, TC = 1.08, pts = [[R0 * Math.sin(TC), R0 * Math.cos(TC)]];
  for (let i = 0; i <= 14; i++) { const t = TC * (1 - i / 14); pts.push([R1 * Math.sin(t), R1 * Math.cos(t)]); }
  h.add(lathe(pts, CAP, 36));
  h.add(at(ball(r * 0.08, CAP, 1, 0.6, 1), 0, R1 * 0.99, 0));
  const rc = R0 * Math.sin(TC), E = r * 0.62, A = 1.0, sh = new THREE.Shape();
  for (let i = 0; i <= 20; i++) { const t = -A + 2 * A * i / 20; (i ? sh.lineTo.bind(sh) : sh.moveTo.bind(sh))(rc * Math.cos(t), rc * Math.sin(t)); }
  for (let i = 20; i >= 0; i--) { const t = -A + 2 * A * i / 20, e = rc + E * Math.cos(t / A * Math.PI / 2) ** 1.2; sh.lineTo(e * Math.cos(t), e * Math.sin(t)); }
  const brim = mesh(new THREE.ExtrudeGeometry(sh, { depth: r * 0.05, bevelEnabled: true, bevelSize: r * 0.02, bevelThickness: r * 0.02, bevelSegments: 2, curveSegments: 8 }), CAP);
  const bg = at(new THREE.Group(), 0, R0 * Math.cos(TC) + r * 0.02, 0, 0, 0, 0.16); brim.rotation.x = Math.PI / 2; bg.add(brim); h.add(bg);
  // óculos escuros: lentes curvas coladas no rosto, ponte e hastes até as orelhas
  const RG = r * 1.03, T0 = 1.27, TL = 0.36;
  for (const s of [-1, 1]) {
    const pc = Math.PI - s * 0.4;
    h.add(patch(RG, LENS2, pc - 0.27, 0.54, T0, TL));
    h.add(patch(RG, LENS2, s > 0 ? Math.PI / 2 + 0.05 : Math.PI + 0.67, 0.86, T0 + 0.02, 0.06));
  }
  h.add(patch(RG, LENS2, Math.PI - 0.14, 0.28, T0 + 0.02, 0.07));
  // sobrancelhas: uma mais alta e arqueada (ar travesso)
  for (const s of [-1, 1]) {
    const base = s > 0 ? 0.37 : 0.34, pts = [];
    for (let i = 0; i <= 6; i++) { const u = i / 6, z = s * r * (0.16 + 0.4 * u); pts.push(onFace(r, r * (base + 0.035 * Math.sin(u * Math.PI) - (s > 0 ? 0 : 0.02 * u)), z, 1.01)); }
    h.add(tube(pts, r * 0.045, BROW));
  }
  // boca: uma curva limpa, mais alta de um lado
  const mp = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8 * 2 - 1; mp.push(onFace(r, r * (-0.42 + 0.1 * u * u + 0.05 * u + 0.03 * Math.max(0, u) ** 2), u * r * 0.26, 1.005)); }
  h.add(tube(mp, r * 0.028, LIP));
  return h;
}

/** Corpo articulado (origem nos pés, olhando para +X). Retorna as juntas para animar. */
export function buildBody(parent, opts = {}) {
  const SKIN = CHAR_MATS.skin, SHIRT = CHAR_MATS.shirt, PANTS = CHAR_MATS.pants, SHOES = CHAR_MATS.shoes;
  const pelvis = new THREE.Group(); pelvis.position.y = 0.72; parent.add(pelvis);
  const hips = lathe([[0, -0.15], [0.13, -0.14], [0.21, -0.09], [0.25, -0.01], [0.25, 0.08], [0.24, 0.17], [0, 0.18]], PANTS);
  hips.scale.set(0.85, 1, 1.15); pelvis.add(hips);                                                  // quadril (embaixo da camisa)
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso);
  torso.add(shirtTorso(SHIRT));
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0, -0.03, s * 0.14); pelvis.add(hip);
    hip.add(limb(0.16, 0.135, 0.29, PANTS));                                                         // coxa (contínua com a canela)
    const knee = new THREE.Group(); knee.position.y = -0.29; hip.add(knee);
    knee.add(limb(0.135, 0.13, 0.26, PANTS));                                                        // canela até o tênis
    const foot = new THREE.Group(); foot.position.y = -0.26; knee.add(foot);
    const shoe = at(mesh(new THREE.CapsuleGeometry(0.115, 0.17, 8, 18), SHOES), 0.07, -0.035, 0, 0, 0, Math.PI / 2);
    shoe.scale.set(0.95, 1, 1.05); foot.add(shoe);                                                   // tênis: bico redondo e volume
    const sole = at(mesh(new THREE.CapsuleGeometry(0.128, 0.19, 8, 18), SHOES), 0.07, -0.105, 0, 0, 0, Math.PI / 2);
    sole.scale.set(0.34, 1, 1.12); foot.add(sole);                                                   // sola mais larga (borda visível)
    legs.push({ hip, knee, foot });
    const sh = new THREE.Group(); sh.position.set(0, 0.56, s * 0.31); torso.add(sh);
    sh.add(limb(0.135, 0.118, 0.13, SHIRT));                                                         // manga curta arredondada
    sh.add(limb(0.085, 0.074, 0.28, SKIN));                                                          // braço
    const elbow = new THREE.Group(); elbow.position.y = -0.28; sh.add(elbow);
    const wrist = new THREE.Group(); wrist.position.y = -0.2; elbow.add(wrist);
    elbow.add(limb(0.072, 0.06, 0.2, SKIN)); wrist.add(opts.flatHands ? flatHand(SKIN) : hand(SKIN));   // antebraço + mão
    arms.push({ sh, elbow, wrist });
  }
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  head.add(at(limb(0.095, 0.1, 0.12, SKIN), 0, 0.12, 0));                                            // pescoço
  head.add(at(buildHead(0.42), 0, 0.44, 0));
  return { pelvis, torso, legs, arms, head };
}
