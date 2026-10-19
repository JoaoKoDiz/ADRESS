// Bairro 11 (Trilhos): bondinho urbano. Trilhos embutidos no asfalto, no eixo das ruas (percurso fixo em RAIL, layout.js),
// duas paradas pequenas nas pontas (cenário; não são entregas) e um bonde de duas cabines que vai e volta sem girar.
// Convivência com a van: o bonde é sólido (a van não atravessa) e, se a van estiver à frente nos trilhos, ele freia e espera.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { box, cyl, at, mat, bakeStatic, textTexture } from './models/kit.js';
import { RAIL, SOLIDS, ensureSolid } from './layout.js';

const STEEL = '#8d949b', GROOVE = '#3f444b', CREAM = '#f3e6c8', RED = '#9e3a26', GLASS = '#2e4a63';
const GAUGE = 0.72, LEN = 8.0, HALF_W = 1.2;

/** Junta caixas orientadas (por cor) numa malha só para cada cor. */
function batcher() {
  const by = new Map();
  const add = (w, h, d, color, x, y, z, ry = 0) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z));
    (by.get(color) || by.set(color, []).get(color)).push(g);
  };
  const flush = parent => { for (const [c, gs] of by) { const m = new THREE.Mesh(mergeGeometries(gs, false), mat(c)); m.receiveShadow = true; parent.add(m); gs.forEach(x => x.dispose()); } };
  return { add, flush };
}

function stop(g, s, li = 0) {                            // parada: cobertura, banco e placa (frente para a rua = +z local) na cor da linha
  const RED = LINE_COL[li % LINE_COL.length];
  const p = new THREE.Group(); p.position.set(s.x, 0, s.z); p.rotation.y = s.ry; g.add(p);
  p.add(at(box(4.2, 0.12, 1.6, '#bdb6a6'), 0, 0.06, 0));
  for (const x of [-1.8, 1.8]) p.add(at(box(0.14, 2.6, 0.14, '#3f4a52'), x, 1.36, -0.55));
  p.add(at(box(4.4, 0.15, 1.7, RED), 0, 2.72, 0));
  p.add(at(box(3.8, 1.6, 0.06, '#cfe3f2'), 0, 1.5, -0.62));
  p.add(at(box(2.6, 0.12, 0.5, '#8a5a36'), 0, 0.55, -0.25));
  for (const x of [-1.1, 1.1]) p.add(at(box(0.1, 0.45, 0.4, '#444'), x, 0.3, -0.25));
  const tex = textTexture(s.name, { width: 640, height: 128, bg: RED, fg: '#fff3d6', font: 'bold 56px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.68), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  sign.position.set(0, 3.15, 0.2); p.add(sign);
  p.add(at(box(0.1, 3.4, 0.1, '#3f4a52'), 2.05, 1.7, 0.4));
  p.add(at(cyl(0.32, 0.32, 0.06, '#f3e6c8', 12), 2.05, 3.1, 0.45, Math.PI / 2, 0, 0));
  const num = new THREE.Mesh(new THREE.CircleGeometry(0.27, 16), new THREE.MeshLambertMaterial({ map: textTexture(String(li + 1), { width: 64, height: 64, bg: '#f3e6c8', fg: RED, font: 'bold 48px "Trebuchet MS", sans-serif' }) }));
  num.position.set(2.05, 3.1, 0.485); p.add(num);                                           // número da linha no disco do poste
}

/** Parte fixa: trilhos rentes ao asfalto (a van passa por cima) e as duas paradas. */
export function buildRail(g) {
  const b = batcher();
  for (const line of RAIL.lines) for (let s = 0; s < line.S; s += 0.8) {
    const p = line.at(s + 0.4), ry = -Math.atan2(p.dz, p.dx), nx = -p.dz, nz = p.dx;
    for (const o of [-GAUGE, GAUGE]) {
      b.add(0.84, 0.03, 0.22, GROOVE, p.x + nx * o, 0.012, p.z + nz * o, ry);
      b.add(0.84, 0.035, 0.1, STEEL, p.x + nx * o, 0.02, p.z + nz * o, ry);
    }
  }
  b.flush(g);
  RAIL.lines.forEach((l, i) => l.stops.forEach(s => stop(g, s, i)));
  return g;
}

// Cada linha do bairro tem a sua cor de saia e o número no letreiro (a parada continua a mesma: as pistas falam das paradas).
const LINE_COL = ['#9e3a26', '#2f6b4a', '#2f5590'];
/** Faixa de janelas vista de fora: vidro com o interior claro e, em algumas, a silhueta de quem vai sentado (cabeça e ombros). */
function windowBand(seed) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d');
  let k = seed * 7919 + 13; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#e9e1cc'; g.fillRect(0, 0, 512, 64);                                     // montantes (creme, como o corpo)
  const SK = ['#e8b98f', '#c98a62', '#8a5a3c', '#f1c9a5'], CL = ['#3a6fb0', '#c8402f', '#3c8f52', '#efbf2a', '#6b4a8a', '#2b2d33', '#e86aa0'], HR = ['#2a1d14', '#5a3a22', '#c9a36a', '#1a1a1a', '#8a8a8a'];
  for (let w = 0; w < 6; w++) {
    const x0 = 6 + w * 84, x1 = x0 + 76;
    g.fillStyle = '#9fb6c6'; g.fillRect(x0, 4, x1 - x0, 56);                              // vidro com o interior iluminado
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x0, 4, x1 - x0, 14);
    for (let p = 0; p < 2; p++) if (r() < 0.55) {                                          // passageiros sentados
      const px = x0 + 20 + p * 36 + (r() - 0.5) * 8;
      g.fillStyle = CL[Math.floor(r() * CL.length)]; g.beginPath(); g.ellipse(px, 66, 16, 20, 0, Math.PI, 0); g.fill();   // ombros
      g.fillStyle = SK[Math.floor(r() * SK.length)]; g.beginPath(); g.arc(px, 34, 9, 0, 7); g.fill();                      // cabeça
      g.fillStyle = HR[Math.floor(r() * HR.length)]; g.beginPath(); g.arc(px, 31, 9.5, Math.PI * 1.05, Math.PI * 1.95); g.fill();   // cabelo
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Bonde de duas cabines (frente e trás iguais): local +x = sentido de s crescente. Sem `opts` é o bonde de sempre (o do
 *  dilema e o do elevado lá fora); com `opts` ({ line, dest }) ganha a cor da linha, o letreiro e passageiros nas janelas. */
export function buildTram(opts = null) {
  const t = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => t.add(at(m, x, y, z, rx, ry, rz));
  const SKIRT = opts ? LINE_COL[opts.line % LINE_COL.length] : RED;
  add(box(LEN - 0.4, 0.9, 2.3, SKIRT), 0, 0.85, 0);                                    // saia (vermelho queimado; nas linhas do bairro, a cor da linha)
  add(box(LEN - 0.4, 1.5, 2.3, CREAM), 0, 2.05, 0);                                   // corpo creme
  add(box(LEN - 0.2, 0.25, 2.45, '#efe9da'), 0, 2.92, 0);                             // teto claro
  add(box(LEN - 2.4, 0.3, 1.6, '#e2dccc'), 0, 3.15, 0);                               // lanternim
  add(box(0.08, 0.6, 0.08, '#333'), 0, 3.55, 0); add(box(1.4, 0.06, 0.06, '#333'), 0, 3.85, 0, 0, 0, 0.3);   // pantógrafo simples
  for (const sx of [-1, 1]) {                                                         // cabines nas duas pontas
    add(box(0.25, 1.6, 2.2, CREAM), sx * (LEN / 2 - 0.1), 1.6, 0);
    add(box(0.06, 0.9, 1.7, GLASS), sx * (LEN / 2 + 0.03), 2.15, 0);
    add(box(0.08, 0.2, 0.2, '#ffe9a0'), sx * (LEN / 2 + 0.04), 0.95, 0.75); add(box(0.08, 0.2, 0.2, '#ffe9a0'), sx * (LEN / 2 + 0.04), 0.95, -0.75);
    add(box(0.12, 0.25, 2.1, '#2b2b2e'), sx * (LEN / 2 + 0.02), 0.45, 0);
  }
  for (const sz of [-1, 1]) {
    for (let x = -LEN / 2 + 1.3; x < LEN / 2 - 1.0; x += 1.15) if (Math.abs(x) > 0.7) add(box(0.9, 0.85, 0.05, GLASS), x, 2.2, sz * 1.16);   // janelas grandes
    add(box(1.0, 1.75, 0.05, '#7a2e20'), 0, 1.4, sz * 1.18);                          // portas laterais (no meio)
    add(box(0.04, 1.7, 0.06, '#e2c98f'), 0, 1.4, sz * 1.2);
    add(box(LEN - 0.4, 0.08, 0.05, '#d9b56a'), 0, 1.33, sz * 1.16);                  // friso dourado
  }
  for (const x of [-LEN / 2 + 1.4, LEN / 2 - 1.4]) for (const z of [-GAUGE, GAUGE]) add(cyl(0.32, 0.32, 0.14, '#202022', 10), x, 0.32, z, Math.PI / 2, 0, 0);   // rodinhas nos trilhos
  if (opts) {
    for (const sz of [-1, 1]) {                                                             // janelas com gente (por cima dos vidros)
      const band = new THREE.Mesh(new THREE.PlaneGeometry(LEN - 2.4, 0.86), new THREE.MeshStandardMaterial({ map: windowBand(opts.line * 2 + (sz > 0 ? 1 : 0)), roughness: 0.4 }));
      band.position.set(0, 2.2, sz * 1.195); band.rotation.y = sz > 0 ? 0 : Math.PI; t.add(band);
    }
    const label = `${opts.line + 1}  ${opts.dest.join(' ⇄ ')}`;
    const tex = textTexture(label, { width: 512, height: 72, bg: '#1d1f22', fg: '#ffd27a', font: 'bold 40px "Trebuchet MS", sans-serif' });
    for (const sx of [-1, 1]) {                                                             // letreiro de destino nas duas cabines
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.27), new THREE.MeshStandardMaterial({ map: tex, emissive: '#3a2a10', roughness: 0.6 }));
      m.position.set(sx * (LEN / 2 + 0.07), 2.74, 0); m.rotation.y = sx * Math.PI / 2; t.add(m);
      add(box(0.06, 0.33, 1.98, '#1d1f22'), sx * (LEN / 2 + 0.03), 2.74, 0);
    }
  }
  return bakeStatic(t);
}

/** Um bondinho num percurso (`line`). `idx` é a prioridade nos cruzamentos (menor passa primeiro). */
function createTram(line, idx) {
  const short = n => n.replace(/^PARADA (DOS |DAS |DO |DA )?/, '');                        // "PARADA DOS GALPÕES" → "GALPÕES"
  const tram = buildTram({ line: idx, dest: line.stops.map(s => short(s.name)) });
  const solid = { x0: 0, x1: 0, z0: 0, z1: 0 };
  const VMAX = 6.5, ACC = 1.4, DEC = 3.5;
  const T = { idx, line, tram, solid, s0: 0, dir: 1, wait: 0, v: 0, waiting: false };
  T.place = () => {
    const a = line.at(T.s0), b = line.at(T.s0 + LEN), m = line.at(T.s0 + LEN / 2);
    tram.position.set(m.x, 0, m.z);
    tram.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    const c = Math.abs(Math.cos(tram.rotation.y)), sn = Math.abs(Math.sin(tram.rotation.y));
    const ex = c * LEN / 2 + sn * HALF_W, ez = sn * LEN / 2 + c * HALF_W;
    Object.assign(solid, { x0: m.x - ex, x1: m.x + ex, z0: m.z - ez, z1: m.z + ez });
  };
  T.reset = () => { T.dir = 1; T.v = 0; T.s0 = (line.S - LEN) * line.start; T.wait = line.start ? 0 : line.wait; T.place(); };
  /** distância (ao longo do percurso, no sentido do movimento) da frente até s; negativa se já passou */
  T.ahead = s => T.dir > 0 ? s - (T.s0 + LEN) : T.s0 - s;
  T.over = (s, m) => s > T.s0 - m && s < T.s0 + LEN + m;
  T.moving = () => T.wait <= 0;
  return T;
}

export function createTrain() {
  const root = new THREE.Group(); root.name = 'trams';
  let trams = [];
  const M = 2.2, NEAR = 16;                               // M: folga do cruzamento (meia largura do outro bonde + sobra)
  const blockedByVan = (T, van) => {
    if (!van) return false;
    const front = T.dir > 0 ? T.s0 + LEN : T.s0;
    const c = Math.cos(van.heading), sn = Math.sin(van.heading);
    for (let k = 0.5; k <= 9; k += 0.75) {
      const p = T.line.at(front + T.dir * k);
      if (Math.hypot(p.x - van.x, p.z - van.z) < 3.0) return true;
      for (const e of [-1.5, 1.5]) if (Math.hypot(p.x - van.x - c * e, p.z - van.z - sn * e) < 2.5) return true;   // traseira/frente da van sobre o trilho
    }
    return false;
  };
  /** Personagem a pé no caminho (não conta para o dilema do bonde, só para não passar por cima dele). */
  const blockedByFoot = (T, w) => {
    if (!w) return false;
    const front = T.dir > 0 ? T.s0 + LEN : T.s0;
    for (let k = 0; k <= 7; k += 0.5) { const p = T.line.at(front + T.dir * k); if (Math.hypot(p.x - w.x, p.z - w.z) < 2.3) return true; }
    return false;
  };
  /** Distância livre até o ponto em que o bonde precisa parar por causa de um cruzamento (Infinity = livre). */
  const crossingLimit = T => {
    let lim = Infinity;
    for (const c of RAIL.crossings) {
      const mine = c.a === T.idx ? c.sa : c.b === T.idx ? c.sb : null;
      if (mine === null) continue;
      const O = trams[c.a === T.idx ? c.b : c.a], other = c.a === T.idx ? c.sb : c.sa;
      if (T.over(mine, M)) continue;                                   // já está no cruzamento: segue
      const d = T.ahead(mine);
      if (d < 0 || d > NEAR) continue;                                 // longe ou já passou
      const oInside = O.over(other, M);
      const oComing = O.moving() && O.ahead(other) >= 0 && O.ahead(other) < NEAR;
      if (oInside || (oComing && O.idx < T.idx)) lim = Math.min(lim, d - M - 0.6);   // espera antes do cruzamento
    }
    return lim;
  };
  return {
    object: root,
    gates: [],
    get trams() { return trams; },
    get length() { return LEN; },
    get s() { return trams[0] ? trams[0].s0 : 0; },
    get moving() { return trams[0] ? trams[0].moving() && trams[0].v > 0.05 : false; },
    get waiting() { return trams.some(t => t.waiting); },
    /** Bonde parado pela van há mais tempo (e quantos segundos). */
    blocked() { let best = null; for (const t of trams) if ((t.vanBlock || 0) > (best ? best.vanBlock : 0)) best = t; return best; },
    /** O bonde avança mesmo com a van na frente (início do dilema); clearCharge volta ao normal e zera as contagens. */
    charge(t) { t.charge = true; },
    /** Folga entre a frente do bonde e a van (círculos de colisão da van: raio 1.25 em -1.5/0/1.5 no eixo). */
    gapToVan(T, van) {
      const front = T.dir > 0 ? T.s0 + LEN : T.s0, p = T.line.at(front), q = T.line.at(front + T.dir * 0.5);
      const fx = q.x - p.x, fz = q.z - p.z, fl = Math.hypot(fx, fz) || 1, lx = -fz / fl * HALF_W, lz = fx / fl * HALF_W;
      const c = Math.cos(van.heading), s = Math.sin(van.heading);
      let g = Infinity;
      for (const k of [-1.5, 0, 1.5]) for (const w of [-1, 0, 1]) g = Math.min(g, Math.hypot(p.x + lx * w - (van.x + c * k), p.z + lz * w - (van.z + s * k)) - 1.25);
      return g;
    },
    clearCharge() { for (const t of trams) { t.charge = false; t.vanBlock = 0; } },
    reset() {
      if (!RAIL) return;
      if (!trams.length) trams = RAIL.lines.map((l, i) => { const t = createTram(l, i); root.add(t.tram); return t; });
      for (const t of trams) { t.reset(); const i = SOLIDS.indexOf(t.solid); if (i >= 0) SOLIDS.splice(i, 1); }
    },
    detach() { for (const t of trams) { const i = SOLIDS.indexOf(t.solid); if (i >= 0) SOLIDS.splice(i, 1); } if (root.parent) root.parent.remove(root); },
    update(dt, van, foot = null) {
      if (!RAIL) return;
      for (const T of trams) {
        const end = T.line.S - LEN;
        T.waiting = false;
        if (T.wait > 0) { T.wait -= dt; T.v = 0; }
        else {
          const left = T.dir > 0 ? end - T.s0 : T.s0;
          const lim = crossingLimit(T), byVan = !T.charge && blockedByVan(T, van);
          T.vanBlock = byVan && T.v < 0.3 ? (T.vanBlock || 0) + dt : 0;          // tempo seguido parado pela van (Nível 12: o dilema)
          T.waiting = byVan || lim < Infinity;
          const room = Math.min(left, Math.max(0, lim));
          const byFoot = !T.charge && blockedByFoot(T, foot);
          if (byFoot) T.waiting = true;
          const want = T.charge ? 8 : byVan || byFoot ? 0 : Math.min(6.5, Math.sqrt(2 * 1.4 * Math.max(0, room)) + (room === left ? 0.3 : 0));
          T.v = T.v < want ? Math.min(want, T.v + (T.charge ? 3.2 : 1.4) * dt) : Math.max(want, T.v - 3.5 * dt);
          T.s0 += T.dir * T.v * dt;
          if (T.dir > 0 && T.s0 >= end) { T.s0 = end; T.dir = -1; T.wait = T.line.wait; T.v = 0; }
          else if (T.dir < 0 && T.s0 <= 0) { T.s0 = 0; T.dir = 1; T.wait = T.line.wait; T.v = 0; }
        }
        T.place();
        ensureSolid(T.solid);
      }
    },
  };
}
