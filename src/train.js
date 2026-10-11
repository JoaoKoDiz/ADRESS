// Bairro 11 (Trilhos): trilhos em L com curva suave, 2 estações fixas (cenário, não são entregas), 2 passagens de nível com
// cancelas e um trem (locomotiva + 2 vagões) que vai e volta entre as estações, parando um pouco em cada uma.
// A geometria do percurso vem de RAIL (layout.js): at(s) dá ponto e direção a `s` do começo (estação da entrada, ao norte).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, at, mat, bakeStatic, textTexture } from './models/kit.js';
import { RAIL, ROAD, LOT, HEDGE, SOLIDS, roadCenter, slotOrigin, lotX, lotZ } from './layout.js';

const hr = ROAD / 2;
const BALLAST = '#8f877c', TIE = '#5a4330', STEEL = '#9aa1a8', CONC = '#c9c2b4', EDGE = '#efc31c', ROOF = '#7a2f2a';
const GAUGE = 0.72;

/** Junta caixas orientadas (por cor) numa malha só para cada cor. */
function batcher() {
  const by = new Map();
  const add = (w, h, d, color, x, y, z, ry = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    (by.get(color) || by.set(color, []).get(color)).push(g);
  };
  const flush = parent => { for (const [c, gs] of by) { const m = new THREE.Mesh(mergeGeometries(gs, false), mat(c)); m.castShadow = m.receiveShadow = true; parent.add(m); gs.forEach(x => x.dispose()); } };
  return { add, flush };
}
const onCrossing = p => RAIL.crossings.some(c => Math.abs(p.x - c.x) < hr + 0.2 && Math.abs(p.z - RAIL.zc) < 3);

function station(g, name, x, z, ry) {                     // plataforma, cobertura, bancos e placa (local: trilho em -x, plataforma em +x)
  const s = new THREE.Group(); s.position.set(x, 0, z); s.rotation.y = ry; g.add(s);
  const L = 15;
  s.add(at(box(4.2, 0.9, L, CONC), 2.1, 0.45, 0));
  s.add(at(box(0.35, 0.92, L, EDGE), 0.3, 0.46, 0));
  for (const zz of [-L / 2 + 1.2, 0, L / 2 - 1.2]) s.add(at(box(0.25, 3.0, 0.25, '#5e646c'), 3.6, 0.9 + 1.5, zz));
  s.add(at(box(4.8, 0.25, L + 0.6, ROOF), 2.0, 4.0, 0, 0, 0, -0.12));
  for (const zz of [-3.5, 2.5]) {                                        // bancos
    s.add(at(box(0.6, 0.12, 2.2, '#8a5a36'), 3.0, 1.4, zz));
    s.add(at(box(0.12, 0.5, 2.2, '#8a5a36'), 3.3, 1.7, zz));
    for (const dz of [-0.9, 0.9]) s.add(at(box(0.5, 0.5, 0.1, '#444'), 3.0, 1.15, zz + dz));
  }
  const tex = textTexture(name, { width: 768, height: 128, bg: '#1f4f8a', fg: '#ffffff', font: 'bold 60px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.9), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  sign.position.set(3.0, 3.3, 0); sign.rotation.y = -Math.PI / 2; s.add(sign);
  s.add(at(box(0.1, 1.05, 5.6, '#e9e9e9'), 3.06, 3.3, 0));
  return s;
}

/** Parte fixa (trilhos, faixa de brita, estações, cercas): entra na cena do bairro, uma vez. */
export function buildRail(g) {
  const b = batcher(), S = RAIL.S;
  for (let s = 0; s <= S + 0.01; s += 0.9) {                               // brita e dormentes
    const p = RAIL.at(Math.min(s, S)), ry = -Math.atan2(p.dz, p.dx);
    if (onCrossing(p)) { b.add(1.0, 0.06, 3.4, '#6b6f75', p.x, 0.03, p.z, ry); continue; }   // passagem de nível: piso liso
    b.add(1.0, 0.14, 3.4, BALLAST, p.x, 0.07, p.z, ry);
    b.add(0.32, 0.12, 2.5, TIE, p.x, 0.2, p.z, ry);
  }
  for (let s = 0; s < S; s += 1.0) {                                       // trilhos (pedaços curtos acompanham a curva)
    const p = RAIL.at(s + 0.5), ry = -Math.atan2(p.dz, p.dx), nx = -p.dz, nz = p.dx;
    for (const o of [-GAUGE, GAUGE]) b.add(1.05, 0.14, 0.12, STEEL, p.x + nx * o, 0.32, p.z + nz * o, ry);
  }
  for (const s of [-0.3, S + 0.3]) {                                       // para-choques nas pontas
    const p = RAIL.at(Math.max(0, Math.min(S, s))), ry = -Math.atan2(p.dz, p.dx), sg = s < 0 ? -1 : 1;
    b.add(0.5, 1.0, 2.4, '#c8402f', p.x + p.dx * sg * 0.6, 0.6, p.z + p.dz * sg * 0.6, ry);
  }
  // cercas baixas onde as ruas que chegavam na rua 0 terminam (agora é a ferrovia)
  for (let i = 0; i <= 6; i++) { const z = roadCenter(i); b.add(0.3, 1.0, ROAD, '#e8e2d4', roadCenter(0) + hr + 0.15, 0.5, z); }
  // lotes dos trilhos: chão de brita e cercas dos dois lados (menos nas ruas)
  for (const s of [48, 49, 50]) {
    const o = slotOrigin(s);
    b.add(LOT, 0.06, LOT, '#9fb07a', o.x + LOT / 2, 0.03, o.z + LOT / 2);
    for (const sz of [-1, 1]) {
      if (s === 50 && sz < 0) continue;                                   // a estação fica do lado norte
      if (s === 48 && sz < 0) continue;                                   // (curva)
      b.add(LOT - 0.4, 0.8, 0.12, '#e8e2d4', o.x + LOT / 2, 0.4, RAIL.zc + sz * 2.6);
    }
  }
  b.add(LOT, 0.06, LOT, CONC, lotX(0) + LOT / 2, 0.03, lotZ(0) + LOT / 2);   // praça da estação da entrada
  b.flush(g);
  // estação da entrada (lote 0, ao lado dos trilhos da rua 0) e estação dos galpões (lote 50, ao norte dos trilhos)
  const sA = RAIL.at(10);
  station(g, 'ESTAÇÃO ENTRADA', sA.x + 1.6, lotZ(0) + 7, 0);
  station(g, 'ESTAÇÃO DOS GALPÕES', RAIL.xE - 7.6, RAIL.zc - 1.6, Math.PI / 2);
  // bilheteria na praça da estação da entrada
  const o = slotOrigin(0);
  g.add(at(box(6, 3.2, 5, '#e9dcc3'), o.x + 12, 1.6, o.z + 7));
  g.add(at(box(6.8, 0.4, 5.8, ROOF), o.x + 12, 3.4, o.z + 7));
  g.add(at(box(1.4, 1.0, 0.1, '#3a4b5c'), o.x + 12, 1.6, o.z + 9.55));
  return g;
}

// ---------- parte que se mexe: trem e cancelas ----------
function trainUnit(len, color, loco) {
  const u = new THREE.Group();
  u.add(at(box(len - 0.2, 0.35, 2.0, '#2b2b2e'), 0, 0.75, 0));
  if (loco) {
    u.add(at(box(len * 0.62, 1.7, 2.1, color), -len * 0.15, 1.8, 0));
    u.add(at(box(len * 0.34, 2.3, 2.2, '#f2efe6'), len * 0.31, 2.1, 0));
    u.add(at(box(0.06, 0.8, 1.6, '#3a5a7a'), len * 0.48 + 0.02, 2.5, 0));
    u.add(at(cyl(0.3, 0.35, 0.8, '#2b2b2e', 8), -len * 0.3, 3.0, 0));
    u.add(at(box(0.1, 0.35, 0.8, '#ffe9a0'), len / 2 - 0.05, 1.3, 0));
  } else {
    u.add(at(box(len - 0.3, 2.0, 2.1, color), 0, 2.0, 0));
    u.add(at(box(len - 0.2, 0.2, 2.2, '#f2efe6'), 0, 3.1, 0));
    for (let x = -len / 2 + 0.9; x < len / 2 - 0.5; x += 1.2) for (const z of [-1.06, 1.06]) u.add(at(box(0.7, 0.6, 0.04, '#cfe3f2'), x, 2.3, z));
  }
  for (const x of [-len / 2 + 0.8, len / 2 - 0.8]) for (const z of [-0.75, 0.75]) u.add(at(cyl(0.38, 0.38, 0.18, '#202022', 10), x, 0.5, z, Math.PI / 2, 0, 0));
  return bakeStatic(u);
}

export function createTrain() {
  const root = new THREE.Group(); root.name = 'train';
  const UNITS = [{ len: 4.6, color: '#2f6fb0' }, { len: 4.6, color: '#e0a526' }, { len: 5.2, color: '#c8402f', loco: true }];   // da cauda (sul/leste) …
  const GAP = 0.6, L = UNITS.reduce((t, u) => t + u.len, 0) + GAP * (UNITS.length - 1);
  const units = UNITS.map(u => { const m = trainUnit(u.len, u.color, u.loco); root.add(m); return m; });
  // cancelas: uma de cada lado dos trilhos, nas duas passagens de nível
  const gates = [];
  const lampOn = new THREE.MeshBasicMaterial({ color: '#ff2a1a' }), lampOff = new THREE.MeshBasicMaterial({ color: '#4a1a16' });
  function buildGates() {                               // (na primeira vez que o Bairro 11 é jogado: RAIL já existe)
  for (const c of RAIL.crossings) {
    const arms = [];
    for (const sz of [-1, 1]) {
      const px = c.x + sz * (hr - 0.35), pz = RAIL.zc + sz * 3.0;
      const post = new THREE.Group(); post.position.set(px, 0, pz); root.add(post);
      post.add(at(box(0.3, 1.4, 0.3, '#e8e8e8'), 0, 0.7, 0));
      post.add(at(box(0.18, 2.6, 0.18, '#d0d0d0'), 0, 1.3, sz * 0.5));
      const lamps = [new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lampOff), new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lampOff)];
      lamps[0].position.set(-0.3, 2.4, sz * 0.62); lamps[1].position.set(0.3, 2.4, sz * 0.62); lamps.forEach(l => post.add(l));
      const piv = new THREE.Group(); piv.position.set(0, 1.25, 0); piv.rotation.y = sz < 0 ? 0 : Math.PI; post.add(piv);
      const len = ROAD - 0.8;
      for (let k = 0; k < 6; k++) piv.add(at(box(len / 6, 0.18, 0.14, k % 2 ? '#d6302a' : '#f4f4f4'), (k + 0.5) * len / 6, 0, 0));
      arms.push({ piv, lamps });
    }
    gates.push({ c, arms, k: 0, closed: false, solid: { x0: c.x - hr, x1: c.x + hr, z0: RAIL.zc - 3.3, z1: RAIL.zc + 3.3 } });
  }
  }
  // movimento: s0 = cauda; para em cada ponta, acelera/freia suave
  const VMAX = 13, ACC = 3.2, STOP = 4.5;
  let s0 = 0, dir = 1, wait = STOP, v = 0, t = 0;
  const place = () => {
    let off = 0;
    UNITS.forEach((u, i) => {
      const a = RAIL.at(s0 + off), b = RAIL.at(s0 + off + u.len), m = units[i];
      m.position.set((a.x + b.x) / 2, 0.25, (a.z + b.z) / 2);
      m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      off += u.len + GAP;
    });
  };
  function removeSolid(g) { const i = SOLIDS.indexOf(g.solid); if (i >= 0) SOLIDS.splice(i, 1); }
  return {
    object: root,
    get length() { return L; },
    get s() { return s0; },
    get moving() { return wait <= 0; },
    gates,
    reset() { if (RAIL && !gates.length) buildGates(); s0 = 0; dir = 1; wait = STOP; v = 0; for (const g of gates) { g.k = 0; g.closed = false; removeSolid(g); } if (RAIL) place(); },
    detach() { for (const g of gates) removeSolid(g); if (root.parent) root.parent.remove(root); },
    update(dt) {
      if (!RAIL) return;
      t += dt;
      const end = RAIL.S - L;
      if (wait > 0) { wait -= dt; v = 0; }
      else {
        const left = dir > 0 ? end - s0 : s0;
        v = Math.min(VMAX, v + ACC * dt, Math.sqrt(2 * ACC * Math.max(0, left)) + 0.4);
        s0 += dir * v * dt;
        if (dir > 0 && s0 >= end) { s0 = end; dir = -1; wait = STOP; }
        else if (dir < 0 && s0 <= 0) { s0 = 0; dir = 1; wait = STOP; }
      }
      place();
      // cancelas: fecham com a frente a ~32 da passagem; abrem quando o último vagão sai (com folga de 1)
      const moving = wait <= 0, AHEAD = 32, OUT = hr + 1.2;
      for (const g of gates) {
        const cs = g.c.s;
        const busy = cs > s0 - OUT && cs < s0 + L + OUT;                       // algum vagão sobre a passagem
        const coming = moving && (dir > 0 ? cs >= s0 + L && cs - (s0 + L) < AHEAD : cs <= s0 && s0 - cs < AHEAD);
        g.closed = busy || coming;
        g.k += ((g.closed ? 1 : 0) - g.k) * Math.min(1, dt * 2.6);
        for (const a of g.arms) {
          a.piv.rotation.z = (1 - g.k) * 1.45;                               // aberta: braço levantado
          const blink = g.closed && Math.sin(t * 7) > 0;
          a.lamps[0].material = g.closed && blink ? lampOn : lampOff;
          a.lamps[1].material = g.closed && !blink ? lampOn : lampOff;
        }
        const has = SOLIDS.indexOf(g.solid) >= 0;
        if (g.closed && !has) SOLIDS.push(g.solid);
        if (!g.closed && has) removeSolid(g);
      }
    },
  };
}
