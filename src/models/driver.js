// O motorista de entregas: mesma fisionomia e estilo do personagem da história paralela (cabeça grande facetada, corpo compacto,
// pernas curtas, mãos simples, tênis um pouco maiores), sombreamento chapado e fosco, cores sólidas. Camisa, calça e tênis têm UM material cada (recolorível no Shop);
// dobras e detalhes são só geometria (mesmo material), nada de cores/estampas fixas nessas peças.
// Rosto olha para +X local. Compartilhado por walker.js (a pé) e titleDriver.js (na janela da van).
import * as THREE from 'three';
import { sphere, mesh, mat, at } from './kit.js';

/** Cores do personagem (Shop): materiais únicos e compartilhados (jogo, tela inicial e Shop). */
export const CHAR_DEFAULT = { skin: '#e8b48a', shirt: '#2a9df4', pants: '#2f3a55', shoes: '#1b1b1f', cap: '#e3262e' };
export const CHAR_MATS = Object.fromEntries(Object.entries(CHAR_DEFAULT).map(([k, c]) => [k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 })]));   // suave (forma simples e coesa, como a referência)
export const setCharColors = c => { for (const k of Object.keys(CHAR_MATS)) if (c && c[k]) CHAR_MATS[k].color.set(c[k]); };

const smooth = { roughness: 0.9 };                        // fosco e facetado (como a referência)
const LIP = mat('#5a2e22', smooth);

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

// ---- forma nova (2025): silhueta simples e coesa, superfícies lisas, poucos detalhes (referência de proporções: PEAK).
// O esqueleto, as medidas e as juntas são os MESMOS do corpo antigo: poses e animações continuam encaixando.
const SOFT = { roughness: 0.85 };
const ballS = (r, m, sx = 1, sy = 1, sz = 1) => { const o = mesh(new THREE.SphereGeometry(r, 32, 22), m); o.scale.set(sx, sy, sz); return o; };
export { ballS };
/** Tronco em feijão: ombros redondos que já são o começo dos braços, cintura quase reta (base em y = 0, topo ≈ 0.72). */
export function torsoS(m, gap = 0) {
  const t = lathe([[0, -0.07], [0.19, -0.06], [0.262, -0.01], [0.27, 0.08], [0.272, 0.2], [0.282, 0.34], [0.29, 0.45], [0.282, 0.54], [0.25, 0.62], [0.19, 0.68], [0.1, 0.715], [0, 0.72]], m, 40, gap);
  t.scale.set(0.9, 1, 1.18); return t;
}
/** Mão de luva: um volume só para os dedos juntos + polegar (sem bolinhas). Punho em y = 0. */
export function mitten(m, k = 1) {
  const g = new THREE.Group();
  const body = at(mesh(new THREE.CapsuleGeometry(0.062 * k, 0.07 * k, 10, 20), m), 0, -0.1 * k, 0); body.scale.set(1.18, 1, 0.66); g.add(body);   // palma + dedos
  g.add(at(mesh(new THREE.CapsuleGeometry(0.026 * k, 0.045 * k, 8, 14), m), 0.07 * k, -0.07 * k, 0, 0, 0, 0.55));   // polegar
  return g;
}
/** Calçado maior e arredondado (bico redondo, sola um pouco mais larga), preso no tornozelo (y = 0), frente +X. */
export function bigShoe(g, mUp, mSole = mUp, k = 1) {
  const up = at(mesh(new THREE.CapsuleGeometry(0.125 * k, 0.2 * k, 10, 22), mUp), 0.085 * k, -0.04 * k, 0, 0, 0, Math.PI / 2); up.scale.set(1.0, 1.12, 1.2); g.add(up);
  const sole = at(mesh(new THREE.CapsuleGeometry(0.14 * k, 0.22 * k, 10, 22), mSole), 0.085 * k, -0.115 * k, 0, 0, 0, Math.PI / 2); sole.scale.set(0.32, 1.12, 1.26); g.add(sole);
}
const HAIRS = mat('#3a2418', { ...SOFT, flatShading: false, side: THREE.DoubleSide }), BROWS = mat('#2e1c12', { ...SOFT, flatShading: false });
const EYES = mat('#16100e', { roughness: 0.4, flatShading: false }), MOUTHS = mat('#5a2e22', { ...SOFT, flatShading: false });
const FRAMES = mat('#1c1c22', { roughness: 0.5, flatShading: false }), LENSS = mat('#101218', { roughness: 0.2, metalness: 0.3, flatShading: false, side: THREE.DoubleSide });
/**
 * Óculos encaixados numa cabeça esférica de raio r (rosto para +X): cada aro fica tangente ao rosto na frente do olho (y = ey, z = ±ez),
 * a ponte desce e encosta no alto do nariz, as hastes contornam as laterais da cabeça até as orelhas (sempre um pouco por fora da pele).
 * octo: aro octogonal (K). lens: material da lente (opcional). Tudo num grupo filho da cabeça: acompanha os movimentos.
 */
export function buildGlasses(r, { ey, ez, R, tube, frame, lens = null, octo = false, gap = 0.055, earY = 0.02, earA = 1.66 }) {
  const g = new THREE.Group(); g.name = 'glasses';
  const rh = Math.sqrt(r * r - ey * ey), th = Math.asin(ez / rh), off = r * gap;
  const tubeAlong = (pts, rad = tube) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, rad, 8, false), frame);
  for (const s of [-1, 1]) {
    const a = s * th, cx = (rh + off) * Math.cos(a), cz = (rh + off) * Math.sin(a);
    const ring = new THREE.Group(); ring.position.set(cx, ey, cz); ring.rotation.y = Math.PI / 2 - a; g.add(ring);    // aro tangente ao rosto
    const t = mesh(new THREE.TorusGeometry(R, tube, 8, octo ? 8 : 36), frame); if (octo) t.rotation.z = Math.PI / 8; ring.add(t);
    if (lens) { const l = mesh(new THREE.CircleGeometry(R * 0.97, octo ? 8 : 36), lens); l.rotation.z = t.rotation.z; ring.add(l); }
    // haste: da borda de fora do aro, pela lateral da cabeça, até em cima da orelha
    const ox = cx - R * Math.sin(th), oz = cz + s * R * Math.cos(th);              // ponto do aro mais longe do nariz
    const pts = [new THREE.Vector3(ox, ey, oz)];
    for (const [k, an] of [[0.15, th + 0.62], [0.45, 1.05], [0.75, 1.38], [1, earA]]) {
      const y = ey + (earY - ey) * k, rr = Math.sqrt(Math.max(0, r * r - y * y)) + r * 0.045;
      pts.push(new THREE.Vector3(rr * Math.cos(an), y, s * rr * Math.sin(an)));
    }
    g.add(tubeAlong(pts));
  }
  // ponte: liga as bordas de dentro dos aros e desce até encostar no alto do nariz
  const ix = (rh + off) * Math.cos(th) + Math.sin(th) * R, iz = (rh + off) * Math.sin(th) - Math.cos(th) * R;
  g.add(tubeAlong([new THREE.Vector3(ix, ey + R * 0.15, -iz), new THREE.Vector3(Math.sqrt(r * r - ey * ey) + r * 0.035, ey - R * 0.2, 0), new THREE.Vector3(ix, ey + R * 0.15, iz)], tube * 0.9));
  return g;
}
/** Cabeça nova: grande e redonda, rosto simples (olhos ovais, sobrancelhas, boca pequena), óculos escuros e boné do jogador. */
export function buildHeadS(r) {
  const SKIN = CHAR_MATS.skin, h = new THREE.Group();
  h.add(ballS(r, SKIN, 1, 1.02, 1));
  const face = (y, z) => Math.sqrt(Math.max(0, r * r - y * y - z * z));
  h.add(at(ballS(r * 0.1, SKIN, 0.9, 0.8, 1), face(-0.08 * r, 0) + 0.004, -0.08 * r, 0));        // nariz pequeno e discreto
  for (const s of [-1, 1]) {
    h.add(at(ballS(r * 0.15, SKIN, 0.5, 0.9, 0.62), -0.04 * r, -0.04 * r, s * r * 0.97));        // orelhas lisas
    const ez = s * r * 0.36, ey = r * 0.1;
    h.add(at(ballS(r * 0.085, EYES, 0.3, 1.3, 0.85), face(ey, ez) - 0.004, ey, ez));             // olhos ovais
    const by = r * 0.44, bz = s * r * 0.34;                                                       // sobrancelhas retas (sério)
    h.add(at(mesh(new THREE.CapsuleGeometry(r * 0.045, r * 0.26, 4, 10), BROWS), face(by, bz) + 0.006, by, bz, Math.PI / 2, -s * 0.3, 0));
  }
  h.add(buildGlasses(r, { ey: r * 0.1, ez: r * 0.36, R: r * 0.25, tube: r * 0.032, frame: FRAMES, lens: LENSS }));            // óculos escuros
  h.add(at(mesh(new THREE.CapsuleGeometry(r * 0.022, r * 0.2, 4, 8), MOUTHS), face(-r * 0.42, 0) - 0.004, -r * 0.42, 0, Math.PI / 2, 0, 0));       // boca pequena e reta
  h.add(mesh(new THREE.SphereGeometry(r * 1.04, 28, 16, -1.5, 3.0, 1.0, 0.95), HAIRS));                                                              // cabelo da nuca (liso)
  for (const s of [-1, 1]) h.add(at(ballS(r * 0.2, HAIRS, 0.55, 1.15, 0.5), 0.08 * r, 0.24 * r, s * r * 0.9, 0, 0, 0.2));                       // costeletas
  const slot = new THREE.Group(); slot.name = 'cap'; slot.userData.r = r; capSlots.add(slot); fillCap(slot); h.add(slot);
  return h;
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
  // boné do jogador (modelo escolhido no Shop; trocar o modelo refaz o boné de todas as cabeças)
  const slot = new THREE.Group(); slot.name = 'cap'; slot.userData.r = r; capSlots.add(slot); fillCap(slot); h.add(slot);
  return h;
}

// ---- bonés (Shop → Bonés): 6 formatos, todos com o material único CHAR_MATS.cap (a cor escolhida recolore o boné inteiro);
// as partes se distinguem só por geometria e sombreamento. Cabeça de raio r, rosto para +X.
export const CAP_MODELS = [
  { name: 'Clássico', desc: 'Copa arredondada e aba curva.' },
  { name: 'Aba reta', desc: 'Copa um pouco mais alta e aba plana.' },
  { name: 'Trucker', desc: 'Frente estruturada e traseira de tela.' },
  { name: 'Esportivo', desc: 'Baixo, ajustado à cabeça, com aba curva.' },
  { name: 'Cinco painéis', desc: 'Copa mais baixa e levemente quadrada, aba curta.' },
  { name: 'Virado para trás', desc: 'O clássico com a aba para trás.' },
];
let capModel = 0;
const capSlots = new Set();
function fillCap(slot) {
  while (slot.children.length) { const o = slot.children[0]; slot.remove(o); o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
  slot.add(buildCap(slot.userData.r, capModel));
}
/** Troca o modelo do boné em todas as cabeças do jogador (jogo, tela inicial, van, Shop). */
export function setCapModel(i) { capModel = Math.max(0, Math.min(CAP_MODELS.length - 1, i | 0)); capSlots.forEach(fillCap); }
export const capModelNow = () => capModel;

/** Calota: borda em `TC` (rad a partir do topo) no raio R0, superfície no raio R1; sy estica a copa acima da borda;
 *  sq > 0 deixa a copa levemente quadrada. phi0/phiL: só um pedaço (ex.: metade da frente). */
function dome(r, { R1 = 1.07, TC = 1.08, sy = 1, sq = 0, seg = 36, phi0 = 0, phiL = Math.PI * 2, R0 = 0.99 } = {}) {
  const r0 = r * R0, r1 = r * R1, pts = [new THREE.Vector2(r0 * Math.sin(TC), r0 * Math.cos(TC))];
  for (let i = 0; i <= 10; i++) { const t = TC * (1 - i / 10); pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.sin(t)), r1 * Math.cos(t))); }
  const geo = new THREE.LatheGeometry(pts, seg, phi0, phiL), p = geo.attributes.position, y0 = r0 * Math.cos(TC);
  for (let k = 0; k < p.count; k++) {
    let x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    if (sq) { const a = Math.atan2(z, x), f = 1 + sq * (1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) - 1); x *= f; z *= f; }
    p.setXYZ(k, x, y0 + (y - y0) * sy, z);
  }
  geo.computeVertexNormals();
  return mesh(geo, CHAR_MATS.cap);
}
/** Aba: presa na borda (raio rc, altura y), comprimento E, meia-abertura A; curve dobra as pontas para baixo; tilt inclina (+ = sobe). */
function brimAt(r, { rc, y, E, A = 1.0, curve = 0, tilt = 0.12, thick = 0.06, back = false }) {
  const sh = new THREE.Shape();
  for (let i = 0; i <= 28; i++) { const t = -A + 2 * A * i / 28; (i ? sh.lineTo.bind(sh) : sh.moveTo.bind(sh))(rc * Math.cos(t), rc * Math.sin(t)); }
  for (let i = 28; i >= 0; i--) { const t = -A + 2 * A * i / 28, e = rc + E * Math.cos(t / A * Math.PI / 2) ** 1.2; sh.lineTo(e * Math.cos(t), e * Math.sin(t)); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth: r * thick, bevelEnabled: false, curveSegments: 4 }), p = geo.attributes.position, W = rc + E;
  for (let k = 0; k < p.count; k++) p.setZ(k, p.getZ(k) + curve * r * (p.getY(k) / W) ** 2);   // (depois de girar, z vira "para baixo")
  geo.computeVertexNormals();
  const b = mesh(geo, CHAR_MATS.cap); b.rotation.x = Math.PI / 2;
  const g = at(new THREE.Group(), 0, y, 0, 0, 0, tilt); g.add(b);
  if (!back) return g;
  const o = new THREE.Group(); o.rotation.y = Math.PI; o.add(g); return o;
}
/** Costura/nervura fina sobre a copa: arco do topo até a borda na direção phi. */
function seam(r, R1, TC, phi, sy, y0) {
  const t = mesh(new THREE.TorusGeometry(r * R1 + r * 0.012, r * 0.022, 4, 10, TC), CHAR_MATS.cap);
  t.rotation.z = Math.PI / 2 - TC;
  const g = new THREE.Group(); g.add(t); g.rotation.y = phi;
  const s = new THREE.Group(); s.add(g); s.position.y = y0 * (1 - sy); s.scale.y = sy; return s;
}
function buildCap(r, model) {
  const g = new THREE.Group(), TC = 1.08, rc = r * 0.99 * Math.sin(TC), yb = r * 0.99 * Math.cos(TC) + r * 0.02, y0 = r * 0.99 * Math.cos(TC);
  const button = (R1, sy) => g.add(at(ballS(r * 0.08, CHAR_MATS.cap, 1, 0.6, 1), 0, y0 + (r * R1 - y0) * sy - r * 0.005, 0));
  if (model === 1) {                                    // Aba reta: copa mais alta, aba larga e plana
    g.add(dome(r, { sy: 1.16 })); button(1.07, 1.16);
    g.add(brimAt(r, { rc, y: yb, E: r * 0.7, A: 1.1, curve: 0, tilt: 0.02, thick: 0.07 }));
  } else if (model === 2) {                             // Trucker: frente alta e estruturada (painel saliente); traseira em tela
    const sy = 1.12;
    g.add(dome(r, { sy, phi0: 0, phiL: Math.PI, R1: 1.085 }));                   // metade da frente (+X), mais encorpada
    g.add(dome(r, { sy, phi0: Math.PI, phiL: Math.PI, R1: 1.05 }));              // metade de trás, rebaixada
    for (const t of [0.42, 0.66, 0.9]) {                                          // tela: anéis e nervuras em relevo atrás
      const R = r * 1.05 + r * 0.012, ring = mesh(new THREE.TorusGeometry(R * Math.sin(t), r * 0.018, 4, 12, Math.PI), CHAR_MATS.cap);
      ring.rotation.x = Math.PI / 2; const rg = new THREE.Group(); rg.rotation.y = -Math.PI / 2; rg.add(ring);
      rg.position.y = y0 + (R * Math.cos(t) - y0) * sy; g.add(rg);
    }
    for (let k = 1; k < 8; k++) g.add(seam(r, 1.05, TC, Math.PI / 2 + k * Math.PI / 8, sy, y0));
    button(1.085, sy);
    g.add(brimAt(r, { rc, y: yb, E: r * 0.64, curve: 0.18, tilt: 0.1 }));
  } else if (model === 3) {                             // Esportivo: baixo e justo, aba bem curva e um pouco mais baixa
    g.add(dome(r, { R1: 1.035, sy: 0.97, TC: 1.12 })); button(1.035, 0.97);
    g.add(brimAt(r, { rc: r * 0.99 * Math.sin(1.12), y: r * 0.99 * Math.cos(1.12) + r * 0.02, E: r * 0.56, A: 0.95, curve: 0.38, tilt: 0.05, thick: 0.05 }));
  } else if (model === 4) {                             // Cinco painéis: copa mais baixa e levemente quadrada, costuras, aba curta
    const sy = 0.93;
    g.add(dome(r, { sy, sq: 0.22, seg: 40, R1: 1.08 }));
    for (let k = 0; k < 5; k++) g.add(seam(r, 1.08 * (1 + 0.22 * 0.15), TC, Math.PI / 2 + Math.PI / 5 + k * 2 * Math.PI / 5, sy, y0));
    button(1.08, sy);
    g.add(brimAt(r, { rc, y: yb, E: r * 0.44, A: 0.95, curve: 0.12, tilt: 0.08 }));
  } else if (model === 5) {                             // Virado para trás: o clássico, aba atrás e mais alta (acima do cabelo da nuca)
    g.add(dome(r)); button(1.07, 1);
    const tb = 0.95;
    g.add(brimAt(r, { rc: r * 1.0 * Math.sin(tb), y: r * 1.0 * Math.cos(tb) + r * 0.03, E: r * 0.58, curve: 0.25, tilt: 0.3, back: true }));
  } else {                                              // Clássico: copa arredondada, aba curva
    g.add(dome(r)); button(1.07, 1);
    g.add(brimAt(r, { rc, y: yb, E: r * 0.62, curve: 0.25, tilt: 0.12 }));
  }
  return g;
}
const box3 = (w, hh, d, m) => mesh(new THREE.BoxGeometry(w, hh, d), m);

/** Medidas do corpo usadas por quem monta poses (seatedDriver.js). */
export const BODY = { pelvisY: 0.64, torsoY: 0.64 + 0.06, upperArm: 0.28, foreArm: 0.2 };
/** Corpo articulado (origem nos pés, olhando para +X). Retorna as juntas para animar. */
export function buildBody(parent, opts = {}) {
  if (opts.classic) return buildBodyClassic(parent);
  const SKIN = CHAR_MATS.skin, SHIRT = CHAR_MATS.shirt, PANTS = CHAR_MATS.pants, SHOES = CHAR_MATS.shoes;
  const pelvis = new THREE.Group(); pelvis.position.y = BODY.pelvisY; parent.add(pelvis);
  const hips = lathe([[0, -0.16], [0.14, -0.15], [0.22, -0.1], [0.255, -0.01], [0.258, 0.08], [0.25, 0.17], [0, 0.18]], PANTS, 40);
  hips.scale.set(0.88, 1, 1.15); pelvis.add(hips);
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso);
  torso.add(torsoS(SHIRT));
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0, -0.03, s * 0.14); pelvis.add(hip);
    hip.add(limb(0.158, 0.138, 0.25, PANTS));                                                        // coxa e canela no mesmo volume (sem "bolas")
    const knee = new THREE.Group(); knee.position.y = -0.25; hip.add(knee);
    knee.add(limb(0.138, 0.125, 0.22, PANTS));
    const foot = new THREE.Group(); foot.position.y = -0.22; knee.add(foot);
    bigShoe(foot, SHOES);                                                                            // pés um pouco maiores
    legs.push({ hip, knee, foot });
    const sh = new THREE.Group(); sh.position.set(0, 0.52, s * 0.325); torso.add(sh);               // ombro na borda do tronco (braço por fora do volume)
    sh.add(limb(0.122, 0.108, 0.14, SHIRT));                                                         // manga curta
    sh.add(limb(0.086, 0.078, 0.28, SKIN));
    const elbow = new THREE.Group(); elbow.position.y = -0.28; sh.add(elbow);
    const wrist = new THREE.Group(); wrist.position.y = -0.2; elbow.add(wrist);
    elbow.add(limb(0.078, 0.066, 0.2, SKIN)); wrist.add(mitten(SKIN));                               // antebraço contínuo + mão de luva com polegar
    arms.push({ sh, elbow, wrist, s });
  }
  restArms(arms);
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  head.add(at(limb(0.11, 0.115, 0.1, SKIN), 0, 0.1, 0));                                            // pescoço curto e largo (transição suave)
  head.add(at(buildHeadS(0.5), 0, 0.5, 0));                                                          // cabeça maior e redonda
  return { pelvis, torso, legs, arms, head };
}
/** Pose de repouso dos braços (forma nova): ombros soltos, braços um pouco afastados (mãos fora do quadril e da camisa),
 *  cotovelos levemente dobrados, mãos viradas para as coxas. rotation.x = abertura lateral (−s abre), z = para a frente. */
export const ARM_REST = { open: 0.14, fwd: 0.05, elbow: 0.24, wrist: 0.08 };
export function restArms(arms, k = 1) {
  arms.forEach((a, i) => {
    const s = a.s || (i ? 1 : -1);
    a.sh.rotation.set(-s * ARM_REST.open * k, 0, ARM_REST.fwd * k); a.elbow.rotation.set(0, 0, ARM_REST.elbow * k); a.wrist.rotation.set(0, 0, ARM_REST.wrist * k);
  });
}
/** Corpo antigo (facetado), mantido para a R e a estátua do cartão Rigidez. */
function buildBodyClassic(parent) {
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
