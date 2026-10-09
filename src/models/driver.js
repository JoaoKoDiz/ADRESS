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
export const capsule = (r, len, m) => mesh(new THREE.CapsuleGeometry(r, len, 6, 16), m);
/** Anel horizontal (dobra/gola/barra) com escala elíptica (sx = frente-trás, sz = lado a lado). */
export const ring = (r, tube, m, sx = 1, sz = 1) => {
  const t = mesh(new THREE.TorusGeometry(r, tube, 8, 28), m); t.rotation.x = Math.PI / 2;
  const g = new THREE.Group(); g.add(t); g.scale.set(sx, 1, sz); return g;
};

/** Cabeça grande de raio r: pele, cabelo curto, boné, óculos escuros, sobrancelhas, nariz redondo e sorriso de canto. Centro na origem. */
export function buildHead(r) {
  const SKIN = CHAR_MATS.skin, h = new THREE.Group();
  h.add(ball(r, SKIN, 1, 0.97, 1.04));                                                   // crânio/rosto
  for (const s of [-1, 1]) h.add(at(ball(r * 0.17, SKIN, 0.6, 1, 0.8), -r * 0.05, -r * 0.02, s * r * 0.98));   // orelhas
  h.add(at(ball(r * 0.15, SKIN), r * 0.98, -r * 0.06, 0));                                // nariz redondo
  // cabelo curto aparecendo embaixo do boné (nuca e laterais)
  h.add(mesh(new THREE.SphereGeometry(r * 1.035, 26, 12, -1.75, 3.5, 1.05, 0.6), HAIR));
  // boné: calota lisa levemente para trás + aba curva + botão
  h.add(at(mesh(new THREE.SphereGeometry(r * 1.07, 28, 14, 0, Math.PI * 2, 0, 1.12), CAP), -r * 0.04, r * 0.06, 0, 0, 0, 0.1));
  h.add(at(ball(r * 0.1, CAP), -r * 0.04, r * 1.12, 0));
  h.add(at(ball(r * 0.62, CAP, 1.15, 0.1, 1.0), r * 0.82, r * 0.48, 0, 0, 0, -0.1));      // aba
  // óculos escuros: lentes arredondadas, ponte e hastes
  for (const s of [-1, 1]) {
    h.add(at(ball(r * 0.3, LENS, 0.3, 0.8, 1), r * 0.88, r * 0.14, s * r * 0.4, 0, s * -0.4, 0));
    h.add(at(mesh(new THREE.BoxGeometry(r * 0.06, r * 0.06, r * 0.62), LENS), r * 0.52, r * 0.2, s * r * 0.8, 0, s * 0.4, 0));
  }
  h.add(at(mesh(new THREE.BoxGeometry(r * 0.08, r * 0.07, r * 0.22), LENS), r * 0.96, r * 0.18, 0));
  // sobrancelhas: uma levantada e arqueada (ar travesso)
  for (const s of [-1, 1]) {
    const y = r * (s > 0 ? 0.53 : 0.45), z = s * r * 0.4, x = Math.sqrt(Math.max(0, r * r - y * y - z * z)) * 1.0;
    const g = at(new THREE.Group(), x, y, z); g.rotation.x = s > 0 ? 0.2 : 0.24 * -s;
    g.add(at(capsule(r * 0.055, r * 0.24, BROW), 0, 0, 0, Math.PI / 2, 0, 0));
    g.rotation.y = -s * 0.5;
    h.add(g);
  }
  // sorriso relaxado, mais alto de um lado: pontinhos sobre a superfície da cabeça
  const N = 9;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1) * 2 - 1, z = u * r * 0.3;
    const y = -r * 0.4 + r * 0.17 * u * u + r * 0.05 * u;
    const x = Math.sqrt(Math.max(0, r * r - y * y - z * z)) * 1.0;
    h.add(at(ball(r * (i === N - 1 ? 0.058 : 0.045), LIP), x, y, z));
  }
  h.add(at(ball(r * 0.04, SKIN), r * 0.93, -r * 0.3, r * 0.38));                          // covinha no canto
  return h;
}

/** Corpo articulado (origem nos pés, olhando para +X). Retorna as juntas para animar. */
export function buildBody(parent) {
  const SKIN = CHAR_MATS.skin, SHIRT = CHAR_MATS.shirt, PANTS = CHAR_MATS.pants, SHOES = CHAR_MATS.shoes;
  const pelvis = new THREE.Group(); pelvis.position.y = 0.72; parent.add(pelvis);
  pelvis.add(at(ball(0.3, PANTS, 0.95, 0.7, 1.12), 0, 0.02, 0));                                // quadril
  const torso = new THREE.Group(); torso.position.y = 0.06; pelvis.add(torso);
  torso.add(at(mesh(new THREE.CapsuleGeometry(0.3, 0.22, 8, 20), SHIRT), 0, 0.33, 0)); torso.children[0].scale.set(0.86, 1, 1.12);   // tronco arredondado
  torso.add(at(ring(0.285, 0.022, SHIRT, 0.86, 1.12), 0, 0.08, 0));                                 // barra da camisa
  torso.add(at(ring(0.17, 0.045, SHIRT, 1, 1), 0, 0.7, 0));                                       // gola
  torso.add(at(ball(0.1, SHIRT, 0.35, 0.45, 0.9), 0.24, 0.32, 0.1, 0, 0, 0));                      // bolso (relevo)
  for (const [y, z, rz] of [[0.18, -0.12, 0.35], [0.12, 0.14, -0.3]]) torso.add(at(ball(0.1, SHIRT, 0.25, 0.1, 0.9), 0.25, y, z, 0, 0, rz));   // dobras da barriga
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(0, -0.02, s * 0.17); pelvis.add(hip);
    hip.add(at(capsule(0.17, 0.12, PANTS), 0, -0.19, 0));                                        // coxa
    const knee = new THREE.Group(); knee.position.y = -0.36; hip.add(knee);
    knee.add(at(ball(0.155, PANTS), 0, 0, 0), at(capsule(0.14, 0.1, PANTS), 0, -0.2, 0), at(ring(0.15, 0.025, PANTS, 1, 1), 0, -0.05, 0));   // joelho + canela + dobra
    knee.add(at(ring(0.155, 0.04, PANTS, 1, 1), 0, -0.33, 0));                                    // barra da calça
    const foot = new THREE.Group(); foot.position.y = -0.34; knee.add(foot);
    foot.add(at(ball(0.2, SHOES, 1.45, 0.72, 1.0), 0.1, 0.0, 0));                                  // corpo do tênis (grosso)
    foot.add(at(ball(0.2, SHOES, 1.6, 0.3, 1.08), 0.1, -0.1, 0));                                  // sola
    foot.add(at(ball(0.15, SHOES, 1, 0.8, 1), 0.27, 0.0, 0));                                      // biqueira
    foot.add(at(ring(0.115, 0.035, SHOES, 1, 1), -0.02, 0.1, 0));                                  // cano
    for (const dx of [0.06, 0.13, 0.2]) foot.add(at(ball(0.03, SHOES, 0.6, 0.4, 3.2), dx, 0.1 - dx * 0.2, 0));   // cadarço (relevo)
    legs.push({ hip, knee, foot });
    const sh = new THREE.Group(); sh.position.set(0, 0.62, s * 0.4); torso.add(sh);
    sh.add(at(ball(0.15, SHIRT), 0, 0, 0), at(capsule(0.12, 0.06, SHIRT), 0, -0.12, 0), at(ring(0.118, 0.022, SHIRT, 1, 1), 0, -0.18, 0));   // ombro + manga curta + barra
    const elbow = new THREE.Group(); elbow.position.y = -0.3; sh.add(elbow);
    elbow.add(at(ball(0.095, SKIN), 0, -0.01, 0), at(capsule(0.085, 0.1, SKIN), 0, -0.14, 0), at(ball(0.115, SKIN, 1, 1.05, 0.9), 0, -0.3, 0), at(ball(0.05, SKIN), 0.08, -0.26, 0));   // antebraço + mão + polegar
    arms.push({ sh, elbow });
  }
  const head = new THREE.Group(); head.position.y = 0.72; torso.add(head);
  head.add(at(ball(0.1, SKIN, 1, 1.2, 1), 0, 0.02, 0));                                             // pescoço
  head.add(at(buildHead(0.46), 0, 0.42, 0));
  return { pelvis, torso, legs, arms, head };
}
