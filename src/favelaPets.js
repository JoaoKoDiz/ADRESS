// Nível 13 (Morro): cachorros caramelos e gatos com pequenas rotinas. Cada bicho tem um canto (beira da rua, pracinha,
// estacionamento, frente do mercadinho) e pontos de passeio curtos já testados no plano: livres, no mesmo nível do chão,
// fora de becos, ladeiras e escadarias e longe dos pontos de entrega. Rotinas: em pé olhando em volta, andar um pouco,
// farejar, deitar, sentar e coçar. Van perto: param e olham; no caminho dela, saem de lado (não são sólidos: nunca prendem
// a van nem atrapalham entregas). Alguns gatos vão da laje de uma casa de enchimento para o parapeito do muro de contenção
// e dali para outra laje (trajetos fixos, pulos em arco). Sorteados a cada partida.
// Desenho instanciado: 6 malhas por espécie (corpo, cabeça, pernas, rabo e os detalhes de cor fixa).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FAVELA, SOLIDS, MAP, HEDGE, VAN_START } from './layout.js';
import { FAV } from './favelaPlan.js';
import { FAV_FLOOR } from './models/favela.js';
import { createFavelaLife } from './favelaLife.js';

const N_DOGS = 8, N_CATS = 4, N_CLIMB = 4;
const DOG_COATS = ['#d9a05a', '#e0ac6a', '#cf9450', '#e3b070', '#d49a55', '#c98b48'];
const CAT_COATS = ['#e0893a', '#2a2a2e', '#8e9196', '#ece6da', '#b9814e', '#d9a066'];

// ---------- modelos (frente para +X) ----------
const lin = hex => new THREE.Color(hex).toArray();
/** Junta peças (caixas/cones) numa geometria com cor por vértice. c: [r, g, b] (multiplica a cor da instância) ou hex. */
function partsGeo(parts) {
  return mergeGeometries(parts.map(p => {
    let g = p.cone ? new THREE.ConeGeometry(p.r, p.h, 4) : new THREE.BoxGeometry(p.w, p.h, p.d);
    if (p.rx || p.ry || p.rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(p.rx || 0, p.ry || 0, p.rz || 0)));
    g.translate(p.x || 0, p.y || 0, p.z || 0);
    g.deleteAttribute('uv'); g = g.toNonIndexed();
    const c = typeof p.c === 'string' ? lin(p.c) : p.c || [1, 1, 1], n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }));
}
const S = k => [k, k, k];
const SPECIES = {
  dog: {   // vira-lata caramelo: porte médio, orelhas meio em pé, rabo enrolado para cima
    bodyY: 0.53, head: [0.46, 0.27, 0], tail: [-0.38, 0.1, 0], hips: [[0.28, -0.1, 0.11], [0.28, -0.1, -0.11], [-0.28, -0.1, 0.11], [-0.28, -0.1, -0.11]],
    sitDrop: 0.18, sitPitch: 0.55, speed: 1.15,
    body: [{ w: 0.78, h: 0.34, d: 0.34 }, { w: 0.24, h: 0.3, d: 0.25, x: 0.36, y: 0.13, rz: -0.5 }],
    bodyFix: [{ w: 0.06, h: 0.24, d: 0.24, x: 0.405, y: -0.02, c: '#f1e3c6' }],
    headG: [{ w: 0.3, h: 0.26, d: 0.27, x: 0.05, y: 0.04 }, { w: 0.25, h: 0.14, d: 0.17, x: 0.27, y: -0.03, c: S(1.12) },
      { w: 0.12, h: 0.19, d: 0.045, x: 0.0, y: 0.1, z: 0.158, rx: -0.42, c: S(0.72) }, { w: 0.12, h: 0.19, d: 0.045, x: 0.0, y: 0.1, z: -0.158, rx: 0.42, c: S(0.72) }],   // orelhas caídas
    headFix: [{ w: 0.07, h: 0.07, d: 0.09, x: 0.4, y: 0.01, c: '#1d1d1d' }, { w: 0.04, h: 0.05, d: 0.05, x: 0.205, y: 0.1, z: 0.08, c: '#1d1d1d' }, { w: 0.04, h: 0.05, d: 0.05, x: 0.205, y: 0.1, z: -0.08, c: '#1d1d1d' }],
    leg: [{ w: 0.11, h: 0.42, d: 0.11, y: -0.21 }, { w: 0.14, h: 0.06, d: 0.13, x: 0.02, y: -0.4, c: S(0.88) }],
    tailG: [{ w: 0.36, h: 0.08, d: 0.08, x: -0.18 }, { w: 0.1, h: 0.09, d: 0.09, x: -0.34, c: S(1.12) }],
  },
  cat: {
    bodyY: 0.3, head: [0.3, 0.15, 0], tail: [-0.25, 0.05, 0], hips: [[0.18, -0.05, 0.06], [0.18, -0.05, -0.06], [-0.18, -0.05, 0.06], [-0.18, -0.05, -0.06]],
    sitDrop: 0.09, sitPitch: 0.6, speed: 0.85,
    body: [{ w: 0.5, h: 0.2, d: 0.19 }, { w: 0.13, h: 0.14, d: 0.14, x: 0.23, y: 0.07, rz: -0.4 }],
    bodyFix: [{ w: 0.05, h: 0.14, d: 0.15, x: 0.265, y: -0.01, c: '#f4f1ea' }],
    headG: [{ w: 0.19, h: 0.17, d: 0.2, x: 0.04, y: 0.02 }, { w: 0.06, h: 0.07, d: 0.1, x: 0.14, y: -0.03, c: S(1.06) },
      { cone: true, r: 0.05, h: 0.1, x: 0.02, y: 0.14, z: 0.06, c: S(0.85) }, { cone: true, r: 0.05, h: 0.1, x: 0.02, y: 0.14, z: -0.06, c: S(0.85) }],
    headFix: [{ w: 0.03, h: 0.045, d: 0.045, x: 0.14, y: 0.045, z: 0.05, c: '#c9d43a' }, { w: 0.03, h: 0.045, d: 0.045, x: 0.14, y: 0.045, z: -0.05, c: '#c9d43a' },
      { w: 0.03, h: 0.025, d: 0.035, x: 0.175, y: -0.005, c: '#e58a9a' }],
    leg: [{ w: 0.065, h: 0.25, d: 0.065, y: -0.125 }],
    tailG: [{ w: 0.42, h: 0.05, d: 0.05, x: -0.21 }, { w: 0.08, h: 0.055, d: 0.055, x: -0.4, c: S(0.85) }],
  },
};

/** Malhas instanciadas de uma espécie para n bichos. */
function speciesMeshes(sp, n, root) {
  const mk = (parts, count, coat) => {
    const m = new THREE.InstancedMesh(partsGeo(parts), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true, vertexColors: true }), Math.max(1, count));
    m.count = count; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
    if (coat) m.setColorAt(0, new THREE.Color('#ffffff'));
    root.add(m); return m;
  };
  return { body: mk(sp.body, n, true), bodyFix: mk(sp.bodyFix, n), head: mk(sp.headG, n, true), headFix: mk(sp.headFix, n), leg: mk(sp.leg, n * 4, true), tail: mk(sp.tailG, n, true) };
}

/** Nós de um bicho (só para compor matrizes; não vão para a cena). */
function rig(sp) {
  const root = new THREE.Object3D(), body = new THREE.Object3D(), head = new THREE.Object3D(), tail = new THREE.Object3D();
  root.add(body); body.add(head, tail); body.position.y = sp.bodyY; head.position.set(...sp.head); tail.position.set(...sp.tail);
  const legs = sp.hips.map(p => { const l = new THREE.Object3D(); l.position.set(...p); body.add(l); return l; });
  return { root, body, head, tail, legs };
}

// ---------- plano: cantos, passeios e trajetos dos gatos ----------
const inBox = (x, z, b, m = 0) => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m;
function planPets(F, rnd) {
  const hw = FAV.RW / 2, doors = F.spots.map(s => s.door), hard = SOLIDS.filter(b => !b.vanOnly && b.x1 > 0 && b.x0 < MAP && b.z1 > 0 && b.z0 < MAP);   // (o entorno fica de fora)
  const slopes = F.ramps.concat(F.stairs);
  const q = F.square, qc = { x: (q.x0 + q.x1) / 2, z: (q.z0 + q.z1) / 2 }, m = F.market, mc = (m.x0 + m.x1) / 2;
  // detalhes da pracinha e do mercadinho que não são sólidos (bancos, árvore, mesa de dominó, poste, caixotes de frutas)
  const props = [[-9, -6, 1.9, 0.8], [9, -6, 1.9, 0.8], [-9, 6, 1.9, 0.8], [9, 6, 1.9, 0.8], [0, -8, 1.9, 0.8], [0, 0, 0.7, 0.7], [5, 1, 2.1, 2.1], [-12, 8, 0.5, 0.5]]
    .map(([x, z, a, b]) => ({ x0: qc.x + x - a, x1: qc.x + x + a, z0: qc.z + z - b, z1: qc.z + z + b }))
    .concat([-4.5, -3.3, 3.3, 4.5].map(x => ({ x0: mc + x - 0.7, x1: mc + x + 0.7, z0: m.z1 + 0.2, z1: m.z1 + 1.4 })))
    .concat(F.poles.flat().map(([x, z]) => ({ x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 })));   // postes dos fios
  const level = z => F.bandY(F.bandOf(z));
  const ok = (x, z, lv, mDoor = 4.5) => x > HEDGE + 1.2 && x < MAP - HEDGE - 1.2 && z > HEDGE + 1.2 && z < MAP - HEDGE - 1.2
    && level(z) === lv && Math.abs(z - FAV.B1) > 1.3 && Math.abs(z - FAV.B2) > 1.3
    && !slopes.some(r => inBox(x, z, r, 1.3)) && !F.alleys.some(a => inBox(x, z, a, 0.9)) && !inBox(x, z, F.court, 0.8)
    && !hard.some(b => inBox(x, z, b, 0.45)) && !props.some(b => inBox(x, z, b, 0.3))
    && doors.every(d => Math.hypot(d.x - x, d.z - z) > mDoor);
  const segOk = (a, b, lv, mDoor = 4.5) => {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.4));
    for (let i = 0; i <= n; i++) if (!ok(a.x + (b.x - a.x) * i / n, a.z + (b.z - a.z) * i / n, lv, mDoor)) return false;
    return true;
  };
  // cantos candidatos
  const cand = [];
  for (const s of F.segs) {                                         // beira das ruas (no cimento, fora do asfalto)
    const [ax, az] = s.a, [bx, bz] = s.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, lv = F.bandY(s.band);
    for (let t = 2; t < L - 2; t += 3) for (const sd of [-1, 1]) {
      const x = ax + ux * t - uz * sd * (hw + 0.8), z = az + uz * t + ux * sd * (hw + 0.8);
      if (ok(x, z, lv, 5.5)) cand.push({ x, z, lv, ux, uz });
    }
  }
  for (let x = q.x0 + 1.5; x < q.x1 - 1; x += 2.5) for (let z = q.z0 + 1.5; z < q.z1 - 1; z += 2.5) if (ok(x, z, q.y, 5.5)) cand.push({ x, z, lv: q.y });   // pracinha
  for (const p of F.pads) for (let x = p.x0 + 1.2; x < p.x1 - 1; x += 2.5) for (let z = p.z0 + 1.2; z < p.z1 - 1; z += 2.5) if (ok(x, z, p.y, 5.5)) cand.push({ x, z, lv: p.y });   // estacionamentos
  for (const x of [m.x0 - 1.6, m.x1 + 1.6, mc - 6.2, mc + 6.2]) if (ok(x, m.z1 + 1.4, 0, 5.5)) cand.push({ x, z: m.z1 + 1.4, lv: 0 });   // frente do mercadinho
  const far = c => Math.hypot(c.x - VAN_START.x, c.z - VAN_START.z) > 16;   // a largada fica livre
  const pool = cand.filter(far).sort(() => rnd() - 0.5);
  const walks = c => {                                              // pontos de passeio (curtos, testados)
    const out = [{ x: c.x, z: c.z }];
    const dirs = c.ux !== undefined ? [[c.ux, c.uz], [-c.ux, -c.uz]] : [...Array(8).keys()].map(k => [Math.cos(k * 0.785 + rnd()), Math.sin(k * 0.785 + rnd())]);
    for (const [dx, dz] of dirs) for (const d of [5.5, 3.5, 2.2]) {
      const p = { x: c.x + dx * d, z: c.z + dz * d };
      if (segOk(c, p, c.lv)) { out.push(p); break; }
    }
    return out.slice(0, 4);
  };
  const homes = [], pets = [];
  const take = (kind, n) => {
    for (const c of pool) {
      if (pets.filter(p => p.kind === kind).length >= n) break;
      if (homes.some(h => Math.hypot(h.x - c.x, h.z - c.z) < 11)) continue;
      homes.push(c);
      const wps = walks(c);
      pets.push({ kind, home: c, lv: c.lv, wps });
      if (kind === 'dog' && wps.length > 1 && rnd() < 0.35 && pets.filter(p => p.kind === kind).length < n) pets.push({ kind, home: wps[1], lv: c.lv, wps: wps.slice(1).concat(wps[0]) });   // às vezes em dupla
    }
  };
  take('dog', N_DOGS); take('cat', N_CATS);
  // gatos que sobem: laje de baixo → parapeito do muro de contenção → laje de cima (casas de enchimento junto ao muro)
  const climbs = [];
  for (const [B, y0, y1] of [[FAV.B1, 0, FAV.H1], [FAV.B2, FAV.H1, FAV.H2]]) {
    const cuts = slopes.filter(r => r.z0 < B && r.z1 > B);
    const onPar = x => x > HEDGE + 2 && x < MAP - HEDGE - 2 && !cuts.some(r => x > r.x0 - 1.8 && x < r.x1 + 1.8);
    const parOk = (a, b) => { for (let x = Math.min(a, b); x <= Math.max(a, b); x += 0.5) if (!onPar(x)) return false; return onPar(b); };
    const roof = f => f.y + f.floors * FAV_FLOOR + 0.14, yp = y1 + 0.9, zp = B + 0.18;
    const lows = F.fillers.filter(f => f.y === y0 && B - f.z1 < 2.8 && f.floors <= 2 && f.x1 - f.x0 > 3.6);
    const highs = F.fillers.filter(f => f.y === y1 && f.z0 - B < 2.8 && f.floors === 1 && f.x1 - f.x0 > 3.6);
    for (const lo of lows) {
      const lx = (lo.x0 + lo.x1) / 2 - (lo.x1 - lo.x0) * 0.2;      // (longe da caixa-d'água, que fica à direita)
      if (!onPar(lx)) continue;
      const hi = highs.map(g => ({ g, x: (g.x0 + g.x1) / 2 - (g.x1 - g.x0) * 0.2 })).filter(o => Math.abs(o.x - lx) > 3.5 && Math.abs(o.x - lx) < 13 && parOk(lx, o.x))
        .sort((a, b) => Math.abs(a.x - lx) - Math.abs(b.x - lx))[0];
      const nodes = [{ x: lx, y: roof(lo), z: (lo.z0 + lo.z1) / 2 + 0.3, rest: true }, { x: lx, y: roof(lo), z: lo.z1 - 0.35 }, { x: lx, y: yp, z: zp, hop: true }];
      if (hi) nodes.push({ x: hi.x, y: yp, z: zp, perch: true }, { x: hi.x, y: roof(hi.g), z: hi.g.z0 + 0.35, hop: true }, { x: hi.x, y: roof(hi.g), z: (hi.g.z0 + hi.g.z1) / 2 - 0.3, rest: true });
      else { const x2 = [lx + 6, lx - 6].find(x => parOk(lx, x)); if (x2 === undefined) continue; nodes.push({ x: x2, y: yp, z: zp, rest: true }); }
      climbs.push(nodes);
    }
  }
  const climbers = climbs.sort(() => rnd() - 0.5).slice(0, N_CLIMB).map(nodes => ({ kind: 'cat', nodes }));
  return { pets: pets.concat(climbers), ok, segOk };
}

// ---------- comportamento ----------
export function createFavelaPets() {
  const root = new THREE.Group(); root.name = 'favela-pets';
  const meshes = { dog: speciesMeshes(SPECIES.dog, N_DOGS, root), cat: speciesMeshes(SPECIES.cat, N_CATS + N_CLIMB, root) };
  const life = createFavelaLife(); root.add(life.object);           // gente: pelada no campinho, dominó na pracinha, mercadinho (favelaLife.js)
  let pets = [], plan = null, t = 0;
  const C = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const groundY = (x, z) => FAVELA.h(x, z) + (inBox(x, z, FAVELA.square) ? 0.16 : FAVELA.pads.some(p => inBox(x, z, p)) ? 0.07 : 0.01);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function next(p) {                                               // próxima rotina (em terra)
    const r = Math.random(), cat = p.kind === 'cat';
    if (r < 0.34 && p.wps.length > 1) { const w = pick(p.wps.filter(w => Math.hypot(w.x - p.x, w.z - p.z) > 0.8)) || p.wps[0]; go(p, 'walk', w.x, w.z); }
    else if (r < 0.52) set(p, 'sniff', 2.5 + Math.random() * 3);
    else if (r < (cat ? 0.82 : 0.76)) set(p, 'lie', (cat ? 14 : 9) + Math.random() * 16);
    else if (r < 0.9) set(p, 'scratch', 1.8 + Math.random() * 1.8);
    else set(p, 'stand', 2 + Math.random() * 3);
  }
  const set = (p, st, tm) => { p.st = st; p.tm = tm; p.scratchSide = Math.random() < 0.5 ? 0 : 1; };
  const go = (p, st, x, z, spd) => { p.st = st; p.tx = x; p.tz = z; p.spd = spd || SPECIES[p.kind].speed; p.tm = 30; };

  /** Saída de lado: um ponto livre fora do corredor da van (perpendicular a ela), no mesmo nível e longe das portas. */
  function flee(p, van) {
    const c = Math.cos(van.hd), s = Math.sin(van.hd), dx = p.x - van.x, dz = p.z - van.z, along = dx * c + dz * s, lat = -dx * s + dz * c;
    const side = lat >= 0 ? 1 : -1;
    for (const sd of [side, -side]) for (const k of [3.6, 4.6, 5.8]) for (const fw of [0, 2.5, -2.5]) {
      const x = van.x + c * (along + fw) - s * sd * k, z = van.z + s * (along + fw) + c * sd * k;
      if (plan.ok(x, z, p.lv, 4.0) && plan.segOk({ x: p.x, z: p.z }, { x, z }, p.lv, 0)) { go(p, 'flee', x, z, 4.4); return true; }
    }
    return false;
  }

  function stepGround(p, dt, van, walker) {
    const sp = SPECIES[p.kind];
    // a van: parar e olhar; no caminho dela, sair de lado
    if (van) {
      const c = Math.cos(van.hd), s = Math.sin(van.hd), dx = p.x - van.x, dz = p.z - van.z, along = dx * c + dz * s, lat = -dx * s + dz * c;
      const ahead = 3.4 + Math.abs(van.speed) * 0.9, d = Math.hypot(dx, dz);
      const inPath = Math.abs(lat) < 2.0 && (van.speed >= -0.3 ? along > -2.9 && along < ahead : along < 2.9 && along > -ahead);
      if (inPath && p.st !== 'flee' && !(p.blocked > 0)) { if (!flee(p, van)) p.blocked = 1.5; }
      else if (d < 9 && (p.st === 'walk' || p.st === 'stand' || p.st === 'sniff' || p.st === 'scratch' || p.st === 'back')) { p.st = 'watch'; p.tm = 1.5; }
      if (d < 11 && (p.st === 'watch' || p.st === 'lie')) { p.lookX = van.x; p.lookZ = van.z; if (p.st === 'watch') p.tm = Math.max(p.tm, 1.2); }
    }
    if (p.blocked > 0) p.blocked -= dt;
    if (walker && (p.st === 'walk' || p.st === 'stand' || p.st === 'sniff') && Math.hypot(walker.x - p.x, walker.z - p.z) < 2.6) { p.st = 'watch'; p.tm = 1.2; p.lookX = walker.x; p.lookZ = walker.z; }
    else if (walker && p.st === 'watch' && Math.hypot(walker.x - p.x, walker.z - p.z) < 3) { p.lookX = walker.x; p.lookZ = walker.z; p.tm = Math.max(p.tm, 0.8); }
    let moving = 0;
    if (p.st === 'walk' || p.st === 'flee' || p.st === 'back') {
      const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz), step = Math.min(d, p.spd * dt);
      if (d > 0.05) { p.x += dx / d * step; p.z += dz / d * step; turn(p, Math.atan2(dz, dx), dt * 6); moving = p.spd; }
      p.tm -= dt;
      if (d <= 0.05 || p.tm <= 0) {
        if (p.st === 'flee') { p.st = 'watch'; p.tm = 2; }
        else if (p.st === 'back') { set(p, 'stand', 1.5); }
        else Math.random() < 0.5 ? set(p, 'sniff', 2 + Math.random() * 2.5) : set(p, 'stand', 1.5 + Math.random() * 2.5);
      }
      p.y = groundY(p.x, p.z);
    } else {
      p.tm -= dt;
      if (p.st === 'watch' && p.lookX !== undefined) turn(p, Math.atan2(p.lookZ - p.z, p.lookX - p.x), dt * 2.5);
      if (p.tm <= 0) {
        if (p.st === 'watch') {                                    // a van foi embora: volta para o canto (ou segue a rotina)
          const h = p.wps.reduce((a, w) => (Math.hypot(w.x - p.x, w.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? w : a), p.wps[0]);
          if (Math.hypot(h.x - p.x, h.z - p.z) > 0.6 && plan.segOk({ x: p.x, z: p.z }, h, p.lv, 0)) go(p, 'back', h.x, h.z);
          else next(p);
          p.lookX = undefined;
        } else next(p);
      }
    }
    pose(p, sp, dt, moving);
  }

  function turn(p, want, k) { let d = want - p.hd; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; p.hd += d * Math.min(1, k); }

  /** Gato dos telhados: descansa numa ponta, atravessa (andando no parapeito, pulando entre laje e muro) e descansa na outra. */
  function stepClimb(p, dt) {
    const sp = SPECIES.cat, N = p.nodes;
    let moving = 0;
    if (p.st === 'rest' || p.st === 'perch') {
      p.tm -= dt;
      if (p.tm <= 0) {
        if (p.st === 'rest') p.dir = p.at === 0 ? 1 : -1;
        p.st = 'move'; p.seg = 0;
      }
    } else if (p.st === 'move') {
      const a = N[p.at], b = N[p.at + p.dir], hop = (p.dir > 0 ? b : a).hop;
      const L = Math.hypot(b.x - a.x, b.z - a.z), dur = hop ? 0.55 + Math.abs(b.y - a.y) * 0.08 : Math.max(0.2, L / 0.75);
      p.seg += dt / dur; turn(p, Math.atan2(b.z - a.z, b.x - a.x), dt * 12);
      const k = Math.min(1, p.seg);
      p.x = a.x + (b.x - a.x) * k; p.z = a.z + (b.z - a.z) * k;
      p.y = a.y + (b.y - a.y) * k + (hop ? (Math.max(0, b.y - a.y) * 0.5 + 0.4) * 4 * k * (1 - k) : 0);   // arco: ~0,5 acima da ponta mais alta
      p.jump = hop ? 1 : 0; moving = hop ? 0 : 0.75;
      if (p.seg >= 1) {
        p.at += p.dir; p.seg = 0; p.jump = 0;
        const n = N[p.at];
        if (n.rest) { p.st = 'rest'; p.tm = (Math.random() < 0.7 ? 14 : 5) + Math.random() * 18; p.restLie = Math.random() < 0.75; }
        else if (n.perch && Math.random() < 0.4) { p.st = 'perch'; p.tm = 2.5 + Math.random() * 4; }
      }
    }
    const lie = p.st === 'rest' && p.restLie, sit = (p.st === 'rest' && !p.restLie) || p.st === 'perch';
    p.forceSt = lie ? 'lie' : sit ? 'sit' : 'walk';
    pose(p, sp, dt, moving);
  }

  /** Pose (deitar, sentar, coçar, farejar, andar) aplicada aos nós. */
  function pose(p, sp, dt, moving) {
    const st = p.forceSt || p.st, g = p.g, cat = p.kind === 'cat';
    const ease = (v, to, r) => v + (to - v) * Math.min(1, dt * r);
    p.lieK = ease(p.lieK, st === 'lie' ? 1 : 0, 3); p.sitK = ease(p.sitK, st === 'scratch' || st === 'sit' ? 1 : 0, 4); p.sniffK = ease(p.sniffK, st === 'sniff' ? 1 : 0, 3);
    p.ph += dt * (moving > 2 ? 17 : moving > 0 ? 9.5 : 0);
    const amp = moving > 2 ? 0.85 : moving > 0 ? 0.55 : 0, sw = Math.sin(p.ph) * amp, L = p.lieK, Si = p.sitK, Sn = p.sniffK;
    g.root.position.set(p.x, p.y, p.z); g.root.rotation.y = -p.hd; g.root.scale.setScalar(p.size);
    g.body.position.y = sp.bodyY * (1 - 0.62 * L) - sp.sitDrop * Si + (moving ? Math.abs(Math.sin(p.ph)) * 0.025 : 0);
    g.body.rotation.z = sp.sitPitch * Si - 0.08 * Sn + (p.jump ? 0.25 : 0);
    const [fl, fr, rl, rr] = g.legs;
    fl.rotation.z = sw + 1.45 * L - sp.sitPitch * Si + (p.jump ? 0.9 : 0); rr.rotation.z = sw - 1.35 * L + 0.85 * Si - (p.jump ? 0.7 : 0);
    fr.rotation.z = -sw + 1.45 * L - sp.sitPitch * Si + (p.jump ? 0.9 : 0); rl.rotation.z = -sw - 1.35 * L + 0.85 * Si - (p.jump ? 0.7 : 0);
    if (st === 'scratch') { const leg = p.scratchSide ? rl : rr; leg.rotation.z = 1.75 + Math.sin(t * 26 + p.ph) * 0.35; }
    // cabeça: olha em volta / para a van; farejando, nariz no chão; deitado, apoiada
    let yaw = Math.sin(t * 0.6 + p.seed * 7) * 0.5 * (st === 'stand' || st === 'perch' ? 1 : 0.3);
    if (st === 'watch' && p.lookX !== undefined) { let d = Math.atan2(p.lookZ - p.z, p.lookX - p.x) - p.hd; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; yaw = -Math.max(-1, Math.min(1, d)); }
    g.head.rotation.set(st === 'scratch' ? 0.35 * (p.scratchSide ? 1 : -1) : 0, yaw * (1 - Sn) + Math.sin(t * 2.6 + p.seed) * 0.35 * Sn, -0.75 * Sn - 0.22 * L - 0.35 * Si + (moving && !cat ? Math.sin(p.ph * 2) * 0.05 : 0));
    // rabo: o do cachorro abana (mais quando olha a van/o motorista); o do gato fica em pé andando e enrola deitado
    if (!cat) { const wag = st === 'watch' ? 1 : st === 'lie' ? 0.15 : 0.45; g.tail.rotation.set(0, Math.sin(t * 13 + p.seed * 3) * 0.55 * wag + 0.5 * L, -0.75 * (1 - L) + 0.15 * L); }
    else g.tail.rotation.set(0, 1.1 * L + 0.8 * Si + Math.sin(t * 1.3 + p.seed) * 0.2, (moving ? -1.2 : -0.5 + Math.sin(t * 0.9 + p.seed) * 0.15) * (1 - L) * (1 - Si) + 0.15 * L + 0.35 * Si);
  }

  function write() {
    const k = { dog: 0, cat: 0 };
    for (const p of pets) {
      const m = meshes[p.kind], i = k[p.kind]++, g = p.g;
      g.root.updateMatrixWorld(true);
      m.body.setMatrixAt(i, g.body.matrixWorld); m.head.setMatrixAt(i, g.head.matrixWorld); m.tail.setMatrixAt(i, g.tail.matrixWorld);
      m.bodyFix.setMatrixAt(i, p.bib ? g.body.matrixWorld : ZERO); m.headFix.setMatrixAt(i, g.head.matrixWorld);
      g.legs.forEach((l, j) => m.leg.setMatrixAt(i * 4 + j, l.matrixWorld));
    }
    for (const sp of ['dog', 'cat']) {
      const m = meshes[sp];
      for (const key in m) { m[key].count = key === 'leg' ? k[sp] * 4 : k[sp]; m[key].instanceMatrix.needsUpdate = true; }
    }
  }

  const api = {
    object: root,
    get pets() { return pets; },
    life,
    /** Sorteia os bichos da partida (o plano do Morro precisa estar ativo). */
    reset() {
      pets = [];
      if (!FAVELA) { write(); return; }
      const hard = SOLIDS.filter(b => !b.vanOnly && b.x1 > 0 && b.x0 < MAP && b.z1 > 0 && b.z0 < MAP);
      life.reset(FAVELA, (x, z) => hard.some(b => x > b.x0 - 0.45 && x < b.x1 + 0.45 && z > b.z0 - 0.45 && z < b.z1 + 0.45));
      plan = planPets(FAVELA, Math.random);
      const k = { dog: 0, cat: 0 };
      for (const d of plan.pets) {
        const sp = SPECIES[d.kind], i = k[d.kind]++, m = meshes[d.kind];
        const coat = d.kind === 'dog' ? pick(DOG_COATS) : pick(CAT_COATS);
        for (const key of ['body', 'head', 'tail']) m[key].setColorAt(i, C.set(coat));
        for (let j = 0; j < 4; j++) m.leg.setColorAt(i * 4 + j, C.set(coat));
        const p = { kind: d.kind, g: rig(sp), wps: d.wps, lv: d.lv, nodes: d.nodes, size: d.kind === 'dog' ? 0.88 + Math.random() * 0.3 : 0.9 + Math.random() * 0.2,
          bib: d.kind === 'dog' ? Math.random() < 0.6 : coat !== '#ece6da' && Math.random() < 0.55, seed: Math.random() * 10,
          hd: Math.random() * 6.28, ph: Math.random() * 6, lieK: 0, sitK: 0, sniffK: 0, tm: 0, st: 'stand' };
        if (d.nodes) { const a = Math.random() < 0.5 ? 0 : d.nodes.length - 1, n = d.nodes[a]; Object.assign(p, { x: n.x, y: n.y, z: n.z, at: a, dir: a ? -1 : 1, st: 'rest', tm: 3 + Math.random() * 20, restLie: Math.random() < 0.6 }); }
        else { Object.assign(p, { x: d.home.x, z: d.home.z, y: groundY(d.home.x, d.home.z) }); next(p); if (p.st === 'walk') p.tm = 30; else p.tm *= Math.random(); }
        pets.push(p);
      }
      for (const sp of ['dog', 'cat']) for (const key of ['body', 'head', 'tail', 'leg']) if (meshes[sp][key].instanceColor) meshes[sp][key].instanceColor.needsUpdate = true;
      api.update(0, null, null);
    },
    detach() { if (root.parent) root.parent.remove(root); },
    /** van: { x, z, hd, speed } (ou null: helicóptero/escondida); walker: { x, z } (ou null). */
    update(dt, van, walker) {
      life.update(dt, walker || van, walker, van);
      if (!pets.length) return;
      t += dt;
      for (const p of pets) { p.forceSt = null; if (p.nodes) stepClimb(p, dt); else stepGround(p, dt, van, walker); }
      write();
    },
  };
  root.userData.api = api;
  return api;
}
