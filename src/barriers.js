// Bloqueios de rua sorteados a cada partida:
//   Bairro 3 — 3 a 5 cavaletes de obra (amarelos e pretos);
//   Bairro 4 — 4 a 6 bloqueios misturando cavaletes, caminhões parados na diagonal e buracos no asfalto;
//   Bairro 7 — só caminhões na diagonal + 3 a 4 ENGARRAFAMENTOS (fila de carros ocupando um trecho inteiro de rua).
//   O engarrafamento tampa o trecho todo: ninguém passa em frente ao lote do lado norte desse trecho (a casa/prédio dele),
//   por isso `jammedSlots` lista esses lotes e o jogo nunca os sorteia para as entregas.
// Nunca isolam nada: o sorteio só é aceito se, pelo grafo de ruas, TODOS os cruzamentos e TODOS os portões
// continuam alcançáveis a partir da entrada — às vezes só é preciso dar uma volta maior.
//
// Grafo: nós = cruzamentos I(j,i) e o meio de cada trecho horizontal M(j,i) (onde ficam os portões).
//   Trecho horizontal (linha i, entre as colunas j e j+1): I(j,i) — M(j,i) — I(j+1,i). A barreira fica perto de
//   uma das pontas ('L' ou 'R'), cortando só aquela metade: o portão continua acessível pela outra ponta.
//   Trecho vertical (coluna j, entre as linhas i e i+1): I(j,i) — I(j,i+1). A barreira fica no meio e corta o trecho.
import * as THREE from 'three';
import { ROAD, GRID, ENTRANCE, GAS_LIST, roadCenter, SOLIDS } from './layout.js';
import { mat, box, cyl, cone, at } from './models/kit.js';

const START = () => [ENTRANCE.road, 0];   // cruzamento da entrada (rua central, borda norte)
// Por tipo: distância do centro do cruzamento até o bloqueio (trechos horizontais, perto de uma ponta)
// e meia espessura do obstáculo ao longo da rua. Tudo fica fora do cruzamento e longe do portão (meio do trecho).
// cross = meia largura do obstáculo ao longo da largura da rua: não vai de ponta a ponta, mas deixa vãos
// (~1,1 de cada lado) mais estreitos que a van (2,6), então ainda não dá para passar.
const TYPES = {
  barrier: { offset: ROAD / 2 + 1.0, half: 0.35, cross: 2.7 },
  truck: { offset: ROAD / 2 + 3.0, half: 2.9, cross: 2.9 },
  hole: { offset: ROAD / 2 + 1.7, half: 1.5, cross: 2.7 },
};

const BARRIER_W = 5.0;            // largura do cavalete (a rua tem 7,6)
function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffc61a'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#1b1b1b';
  for (let x = -64; x < 320; x += 48) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 24, 64); g.lineTo(x + 88, 0); g.lineTo(x + 64, 0); g.closePath(); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(BARRIER_W / 2.2, 1);
  return t;
}

/** Cavalete de obra atravessando a rua (tábuas listradas ao longo de X, pernas em A, luzinhas). */
function buildBarrier(stripes) {
  const g = new THREE.Group();
  const W = BARRIER_W;
  const boardMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 });
  for (const y of [0.55, 1.05]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(W, 0.34, 0.12), boardMat);
    b.position.y = y; b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // tábua listrada deitada no topo: é ela que aparece na visão de cima
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.9), boardMat);
  top.position.y = 1.25; top.castShadow = true;
  g.add(top);
  // cones laranja nas pontas
  const coneMat = mat('#ff7a1a'), stripeMat = mat('#ffffff');
  for (const x of [-W / 2 - 0.15, W / 2 + 0.15]) for (const s of [1, -1]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10), coneMat);
    c.position.set(x, 0.45, s * 0.75); c.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.14, 10), stripeMat);
    band.position.set(x, 0.5, s * 0.75);
    g.add(c, band);
  }
  const legMat = mat('#2e3036');
  for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) for (const s of [1, -1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35, 0.12), legMat);
    leg.position.set(x, 0.62, s * 0.28); leg.rotation.x = s * 0.35; leg.castShadow = true;
    g.add(leg);
  }
  const lampMat = mat('#ff8a1a', { emissive: '#ff6a00', emissiveIntensity: 0.9 });
  for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lampMat);
    l.position.set(x, 1.32, 0);
    g.add(l);
  }
  return g;
}

/** Caminhão baú parado na diagonal da rua (comprimento ao longo do X local). */
const TRUCK_COLORS = ['#f2f2f2', '#3a78d4', '#d8473a', '#efbf2a', '#3c9d55'];
function buildTruck() {
  const g = new THREE.Group();
  const cargo = at(box(4.6, 3.0, 2.6, TRUCK_COLORS[0]), -1.2, 2.0, 0);
  g.add(cargo);
  g.add(at(box(4.62, 0.25, 2.62, '#c9ced6'), -1.2, 3.55, 0));                    // borda do teto do baú
  g.add(at(box(2.3, 2.2, 2.5, '#4a5568'), 2.3, 1.6, 0));                         // cabine
  g.add(at(box(0.08, 1.0, 2.1, '#2b4a6e'), 3.46, 2.1, 0));                       // para-brisa
  g.add(at(box(0.25, 0.4, 2.6, '#2e3036'), 3.5, 0.75, 0));                       // para-choque
  for (const x of [-2.9, -1.4, 2.4]) for (const zz of [1.2, -1.2]) {
    g.add(at(cyl(0.5, 0.5, 0.4, '#1f2023', 12), x, 0.5, zz, Math.PI / 2, 0, 0));
  }
  g.add(at(box(6.6, 0.3, 2.0, '#2e3036'), -0.2, 0.55, 0));                      // chassi
  const lamp = mat('#ff9a1a', { emissive: '#ff7a00', emissiveIntensity: 1 });   // pisca-alerta
  for (const zz of [1.0, -1.0]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), lamp); l.position.set(3.5, 1.2, zz); g.add(l); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.scale.setScalar(0.8);                      // menor: na diagonal não toma a rua de ponta a ponta
  g.userData.cargo = cargo;
  return g;
}

/** Buraco largo no asfalto (atravessa a rua inteira), com pedaços quebrados e cones. */
function buildHole() {
  const g = new THREE.Group();
  const dirt = at(cyl(1, 1, 0.04, '#9a7448', 20), 0, 0.02, 0); dirt.scale.set(3.9, 1, 2.35);   // terra solta: destaca de longe
  g.add(dirt);
  const outer = at(cyl(1, 1, 0.06, '#141518', 20), 0, 0.03, 0); outer.scale.set(3.5, 1, 1.75);
  const inner = at(cyl(1, 1, 0.07, '#070708', 16), 0.2, 0.035, 0); inner.scale.set(2.6, 1, 1.2);
  g.add(outer, inner);
  for (let k = 0; k < 16; k++) {                                                   // asfalto quebrado na borda
    const a = k / 16 * Math.PI * 2;
    const p = at(box(0.7, 0.18, 0.5, k % 2 ? '#5d6470' : '#474c55'), Math.cos(a) * 3.9, 0.08, Math.sin(a) * 2.05,
      (k % 3) * 0.25, a, (k % 4) * 0.2);
    g.add(p);
  }
  for (const x of [-3.4, -1.2, 1.2, 3.4]) for (const zz of [2.55, -2.55]) {      // cones de aviso dos dois lados
    g.add(at(cone(0.3, 0.85, '#ff7a1a', 10), x, 0.43, zz));
    g.add(at(cyl(0.19, 0.23, 0.13, '#ffffff', 10), x, 0.48, zz));
  }
  g.scale.setScalar(0.68);                     // mais estreito que a rua
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return g;
}

/** Engarrafamento: fila de carros nas duas faixas ao longo de um trecho de rua (ao longo do X local). */
const CAR_COLORS = ['#d8473a', '#3a78d4', '#efbf2a', '#3c9d55', '#f2f2f2', '#8a55c4', '#ff8a1e', '#2b2d33', '#e86aa0'];
function buildCar() {
  const g = new THREE.Group();
  const body = at(box(4.4, 0.9, 1.9, CAR_COLORS[0]), 0, 0.85, 0);
  g.add(body);
  g.add(at(box(2.2, 0.8, 1.7, '#dfe6ee'), -0.3, 1.68, 0));                                   // cabine (vidros)
  g.add(at(box(2.0, 0.08, 1.6, '#7b828c'), -0.3, 2.12, 0));                                  // teto
  for (const x of [-1.4, 1.4]) for (const zz of [0.95, -0.95]) g.add(at(cyl(0.42, 0.42, 0.3, '#1f2023', 10), x, 0.42, zz, Math.PI / 2, 0, 0));
  const brake = mat('#ff3b30', { emissive: '#ff1a1a', emissiveIntensity: 1.1 }), head = mat('#fff3c0', { emissive: '#ffe9a0', emissiveIntensity: 0.4 });
  for (const zz of [0.7, -0.7]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), brake); r.position.set(-2.2, 0.95, zz); g.add(r);   // luzes de freio
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.4), head); f.position.set(2.2, 0.95, zz); g.add(f);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.body = body;
  return g;
}
const JAM_CARS = [-5.4, 0, 5.4];                  // 3 carros por faixa (trecho livre: ~16,8)
function buildJam() {
  const g = new THREE.Group();
  g.userData.cars = [];
  for (const lane of [1, -1]) for (const x of JAM_CARS) {
    const c = buildCar();
    c.position.set(x, 0, lane * ROAD / 4);
    c.rotation.y = lane > 0 ? 0 : Math.PI;       // mão dupla: uma faixa para cada lado
    g.add(c); g.userData.cars.push(c);
  }
  return g;
}

const key = (...a) => a.join(',');

/** O conjunto de barreiras deixa tudo alcançável a partir da entrada? (`skipM`: portões dos trechos engarrafados, que ficam de fora de propósito) */
function allReachable(blocked, skipM = new Set()) {
  const N = GRID;
  const adj = new Map();
  const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) {        // trechos horizontais
    if (!blocked.has(key('H', j, i, 'L'))) link(key('I', j, i), key('M', j, i));
    if (!blocked.has(key('H', j, i, 'R'))) link(key('M', j, i), key('I', j + 1, i));
  }
  for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) {        // trechos verticais
    if (!blocked.has(key('V', j, i))) link(key('I', j, i), key('I', j, i + 1));
  }
  const total = (N + 1) * (N + 1) + N * (N + 1) - skipM.size;
  const seen = new Set([key('I', ...START())]);
  const queue = [key('I', ...START())];
  while (queue.length) for (const n of adj.get(queue.shift()) || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  for (const m of skipM) if (seen.has(m)) return false;      // (um portão engarrafado não deveria ser alcançável: garante que o trecho está mesmo fechado)
  return seen.size === total;
}

export function createBarriers() {
  const stripes = stripeTexture();
  const group = new THREE.Group();
  group.name = 'barriers';
  const pools = { barrier: [], truck: [], hole: [], jam: [] };   // modelos reaproveitados entre partidas
  const build = { barrier: () => buildBarrier(stripes), truck: buildTruck, hole: buildHole };
  let solids = [];
  let current = [];
  let jamRects = [];
  let jammed = [];                               // lotes (índices) que ficam sem acesso por causa de um engarrafamento

  function clear() {
    for (const s of solids) { const i = SOLIDS.indexOf(s); if (i >= 0) SOLIDS.splice(i, 1); }
    solids = []; current = []; jammed = []; jamRects = [];
    Object.values(pools).forEach(p => p.forEach(b => { b.visible = false; }));
  }

  /** Sorteia de `min` a `max` bloqueios válidos (dos tipos `types`) e os coloca na cena `scene`. */
  function randomize(scene, { min = 3, max = 5, types = ['barrier'], jams = null } = {}) {
    clear();
    scene.add(group);
    const N = GRID;
    const cands = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) cands.push(['H', j, i, 'L'], ['H', j, i, 'R']);
    const gasSegs = new Set(GAS_LIST.map(g => key('V', g.slots[0] % N + 1, Math.floor(g.slots[0] / N))));   // ruas por dentro dos postos
    for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) if (!gasSegs.has(key('V', j, i))) cands.push(['V', j, i]);
    const want = min + Math.floor(Math.random() * (max - min + 1));
    const wantJams = jams ? jams.min + Math.floor(Math.random() * (jams.max - jams.min + 1)) : 0;
    // engarrafamentos: trechos horizontais de rua com lotes ao norte (i ≥ 1); tampam o trecho inteiro
    const jamCands = [];
    for (let i = 1; i <= N; i++) for (let j = 0; j < N; j++) jamCands.push([j, i]);
    const shuf = a => { for (let k = a.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [a[k], a[r]] = [a[r], a[k]]; } };
    let chosen, jamSegs;
    for (let tries = 0; tries < 60; tries++) {
      shuf(cands); shuf(jamCands);
      chosen = []; jamSegs = [];
      const blocked = new Set(), segs = new Set(), skipM = new Set();
      for (const [j, i] of jamCands) {
        if (jamSegs.length === wantJams) break;
        blocked.add(key('H', j, i, 'L')); blocked.add(key('H', j, i, 'R')); skipM.add(key('M', j, i));
        if (allReachable(blocked, skipM)) { jamSegs.push([j, i]); segs.add(key('H', j, i)); }
        else { blocked.delete(key('H', j, i, 'L')); blocked.delete(key('H', j, i, 'R')); skipM.delete(key('M', j, i)); }
      }
      for (const c of cands) {
        if (chosen.length === want) break;
        const seg = key(c[0], c[1], c[2]);
        if (segs.has(seg)) continue;               // no máximo uma barreira por trecho
        blocked.add(key(...c));
        if (allReachable(blocked, skipM)) { chosen.push(c); segs.add(seg); } else blocked.delete(key(...c));
      }
      if (chosen.length === want && jamSegs.length === wantJams) break;
    }
    const jamPool = pools.jam;
    jamSegs.forEach(([j, i], n) => {
      let b = jamPool[n];
      if (!b) { b = jamPool[n] = buildJam(); group.add(b); }
      b.visible = true;
      b.userData.cars.forEach(c => { c.userData.body.material = mat(CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]); });
      const x0 = roadCenter(j) + ROAD / 2 + 0.2, x1 = roadCenter(j + 1) - ROAD / 2 - 0.2, z = roadCenter(i);
      b.position.set((x0 + x1) / 2, 0, z);
      const s = { x0, x1, z0: z - ROAD / 2 - 0.1, z1: z + ROAD / 2 + 0.1 };
      SOLIDS.push(s); solids.push(s); jamRects.push(s);
      jammed.push((i - 1) * N + j);                // o lote ao norte do trecho (sua porta dá para este trecho)
    });
    const used = { barrier: 0, truck: 0, hole: 0 };
    chosen.forEach((c, n) => {
      const type = types[(n + Math.floor(Math.random() * types.length)) % types.length];
      const T = TYPES[type];
      let b = pools[type][used[type]];
      if (!b) { b = pools[type][used[type]] = build[type](); group.add(b); }
      used[type]++;
      b.visible = true;
      c.push(type);
      let x, z, alongX;                           // alongX: a rua corre em X (barreira atravessa em Z)
      if (c[0] === 'H') {
        const [, j, i, side] = c;
        x = side === 'L' ? roadCenter(j) + T.offset : roadCenter(j + 1) - T.offset;
        z = roadCenter(i); alongX = true;
      } else {
        const [, j, i] = c;
        x = roadCenter(j); z = (roadCenter(i) + roadCenter(i + 1)) / 2; alongX = false;
      }
      b.position.set(x, 0, z);
      b.rotation.y = type === 'truck'
        ? (Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4) + (Math.random() < 0.5 ? Math.PI : 0)   // caminhão parado na diagonal
        : alongX ? Math.PI / 2 : 0;
      if (type === 'truck') b.userData.cargo.material = mat(TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)]);
      const s = alongX ? { x0: x - T.half, x1: x + T.half, z0: z - T.cross, z1: z + T.cross }
                       : { x0: x - T.cross, x1: x + T.cross, z0: z - T.half, z1: z + T.half };
      SOLIDS.push(s); solids.push(s);
    });
    current = chosen;
  }

  return { randomize, clear, get current() { return current; }, get count() { return current.length + jammed.length; }, get jammedSlots() { return jammed; }, get jamRects() { return jamRects; } };
}
