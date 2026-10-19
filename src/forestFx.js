// Nível 22 (Bosque): clima de outono acolhedor.
//  - setup: céu claro levemente nublado, luz quente e suave (sem filtro: as cores das casas continuam as mesmas);
//    o bosque inteiro instanciado (árvores do plano + floresta densa em volta do bairro), tapetes de folhas sob as árvores,
//    folhas soltas no chão e nas margens das ruas;
//  - update: copas que escondem quem joga ou a casa do destino ficam transparentes; folhas caindo devagar perto do jogador.
// Folhas são só visuais (sem colisão). Troncos do bosque de fora perto do bairro entram em SOLIDS.
import * as THREE from 'three';
import { AUTUMN } from './models/forest.js';
import { SOLIDS, HEDGE } from './layout.js';
import { at, box, cyl, mat, vcMerge } from './models/kit.js';
import { createCrowd, crowdWalkTo, crowdStand, crowdTurn } from './models/medievalPeople.js';

const LEAF_COLS = ['#ec7f22', '#de6c18', '#eaa82a', '#f2bb3a', '#c63a24', '#9a6232', '#d24a2c', '#f39236'];
const OUT_COLS = ['orange', 'orange', 'orange', 'gold', 'gold', 'gold', 'red', 'brown', 'yellow', 'orange', 'gold', 'green'];

export function createForestFx() {
  const root = new THREE.Group(); root.name = 'forest-fx';
  let fall = null, built = false, t = 0, crowns = null, ghostT = 0, life = null;
  return {
    object: root,
    /** Uma vez, na criação do mundo do Bosque. */
    setup(w, V, MAP) {
      const sc = w.scene;
      sc.background = new THREE.Color('#e3d6bc'); if (sc.fog) { sc.fog.color.set('#e3d6bc'); sc.fog.near = 240; sc.fog.far = 820; }
      if (w.sunLight) { w.sunLight.intensity *= 0.9; w.sunLight.color.set('#ffdcaa'); }          // tarde quente e suave
      const hemi = sc.children.find(o => o.isHemisphereLight); if (hemi) { hemi.color.set('#fff2de'); hemi.groundColor.set('#a08a58'); }
      // árvores de fora que já existiam: copas verdes viram outono
      const OUT = { '4f9a45': AUTUMN.orange[0], '5ea84e': AUTUMN.gold[0], '3f8a3c': AUTUMN.red[0], '6db256': AUTUMN.gold[1], '2f7a45': AUTUMN.brown[0], '3a8a50': AUTUMN.orange[1] };
      sc.traverse(o => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color || o.parent?.name === 'neighborhood') return;
        const to = OUT[o.material.color.getHexString()]; if (!to) return;
        o.material = o.material.clone(); o.material.color.set(to);
      });
      let s = 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const inLot = (x, z, m = 0) => V.spots.some(sp => x > sp.box.x0 - m && x < sp.box.x1 + m && z > sp.box.z0 - m && z < sp.box.z1 + m);
      // ---- floresta densa em volta do bairro (fora da sebe; a estrada de acesso fica livre) ----
      const outTrees = [];
      for (let z = -230; z < MAP + 230; z += 6.5) for (let x = -230; x < MAP + 230; x += 6.5) {
        const px = x + (rnd() - 0.5) * 4, pz = z + (rnd() - 0.5) * 4;
        if (px > -4 && px < MAP + 4 && pz > -4 && pz < MAP + 4) continue;
        if (Math.abs(px - 104.6) < 9 && pz < 0) continue;
        const d = Math.max(-px, px - MAP, -pz, pz - MAP);
        if (rnd() < 0.12 + Math.max(0, d - 150) / 300) continue;
        const r = rnd();
        outTrees.push({ x: px, z: pz, y: 0, s: 1.0 + rnd() * 0.9, type: r < 0.55 ? 'round' : r < 0.78 ? 'wide' : 'tall', color: OUT_COLS[Math.floor(rnd() * OUT_COLS.length)], k: rnd(), out: true });
        if (d < 70) { const b = { x0: px - 0.5, x1: px + 0.5, z0: pz - 0.5, z1: pz + 0.5 }; SOLIDS.push(b); w.extraSolids.push(b); }   // troncos perto: a van bate
      }
      // ---- partes das árvores (tronco + 2–3 copas), como autumnTree em models/forest.js ----
      const trunks = [], cr = [], owner = [];
      for (const T of V.trees.concat(outTrees)) {
        const { x, y, z, s } = T, C = AUTUMN[T.color] || AUTUMN.orange, c = i => C[(i + Math.floor(T.k * 3)) % 3], n0 = cr.length;
        if (T.type === 'tall') {
          trunks.push([x, y + 1.7 * s, z, 0.2 * s, 3.4 * s, '#e6dfcf']);
          cr.push([x, y + 4.4 * s, z, 1.35 * s, 2.1 * s, 1.35 * s, c(0), T.out], [x + 0.5 * s, y + 3.6 * s, z + 0.3 * s, 0.85 * s, 0.85 * s, 0.85 * s, c(1), T.out]);
        } else if (T.type === 'wide') {
          trunks.push([x, y + 1.0 * s, z, 0.38 * s, 2.0 * s, '#6b4526']);
          cr.push([x, y + 2.9 * s, z, 2.6 * s, 1.35 * s, 2.3 * s, c(0), T.out], [x - 1.2 * s, y + 3.3 * s, z + 0.7 * s, 1.35 * s, 1.35 * s, 1.35 * s, c(1), T.out], [x + 1.3 * s, y + 3.2 * s, z - 0.5 * s, 1.25 * s, 1.25 * s, 1.25 * s, c(2), T.out]);
        } else {
          trunks.push([x, y + 1.2 * s, z, 0.32 * s, 2.4 * s, '#6b4526']);
          cr.push([x, y + 3.2 * s, z, 1.9 * s, 1.9 * s, 1.9 * s, c(0), T.out], [x + 1.0 * s, y + 2.8 * s, z + 0.4 * s, 1.25 * s, 1.25 * s, 1.25 * s, c(1), T.out], [x - 0.8 * s, y + 4.0 * s, z - 0.3 * s, 1.15 * s, 1.15 * s, 1.15 * s, c(2), T.out]);
        }
        const mine = []; for (let i = n0; i < cr.length; i++) { owner[i] = mine; mine.push(i); }   // copas da mesma árvore
      }
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3(), col = new THREE.Color();
      const tm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 1, 1, 6), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), trunks.length);
      trunks.forEach(([x, y, z, r, hh, c], i) => { tm.setMatrixAt(i, m4.compose(v.set(x, y, z), q.identity(), sv.set(r, hh, r))); tm.setColorAt(i, col.set(c)); });
      tm.castShadow = true; tm.receiveShadow = true; root.add(tm);
      const blob = new THREE.IcosahedronGeometry(1, 0), N = cr.length;
      const op = new THREE.InstancedMesh(blob, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), N);
      const gh = new THREE.InstancedMesh(blob, new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true, transparent: true, opacity: 0.22, depthWrite: false }), N);
      const mats = [], zero = new THREE.Matrix4().makeScale(0, 0, 0);
      cr.forEach(([x, y, z, a, b, c2, cc], i) => {
        e.set(rnd() * 0.6, rnd() * 6.3, rnd() * 0.6); q.setFromEuler(e);
        const M = new THREE.Matrix4().compose(v.set(x, y, z), q, sv.set(a, b * 0.92, c2)); mats.push(M);
        op.setMatrixAt(i, M); gh.setMatrixAt(i, zero); col.set(cc); op.setColorAt(i, col); gh.setColorAt(i, col);
      });
      gh.count = 0;                                                   // (só as copas transparentes do momento, compactadas no começo)
      op.castShadow = true; op.receiveShadow = true; gh.frustumCulled = false; root.add(op, gh);
      const rr = cr.map(c => Math.max(c[3], c[4], c[5]) * 0.95), maxR = rr.reduce((a, b) => Math.max(a, b), 0);
      crowns = { op, gh, mats, data: cr, owner, ghost: new Set(), zero, rr, maxR, cols: cr.map(c => new THREE.Color(c[6])) };
      // ---- tapetes de folhas sob as árvores (manchas laranja/terrosas no chão; nunca na pista nem nos lotes) ----
      const disc = new THREE.CircleGeometry(1, 9); disc.rotateX(-Math.PI / 2);
      // raio até onde o chão continua no nível do tronco: não passa da borda do patamar, das ladeiras (e do recorte delas)
      // nem da sebe (senão o disco fica no ar, sobrando para fora do alto)
      const cuts = V.ramps.map(r => ({ x0: r.x0 - 0.8, x1: r.x1 + 0.8, z0: r.z0 - 0.8, z1: r.z1 + 0.8 }));
      const solidR = (x, y, z, rMax) => { let m = rMax; for (let a = 0; a < 12; a++) { const c = Math.cos(a * Math.PI / 6), sn = Math.sin(a * Math.PI / 6);
        for (let d = 0.4; d <= m; d += 0.4) { const px = x + c * d, pz = z + sn * d;
          if (px < HEDGE || pz < HEDGE || px > MAP - HEDGE || pz > MAP - HEDGE || Math.abs(V.h(px, pz) - y) > 0.05 || cuts.some(q => px > q.x0 && px < q.x1 && pz > q.z0 && pz < q.z1)) { m = d - 0.4; break; } } }
        return m; };
      const carp = [];
      for (const T of V.trees.concat(outTrees)) {
        let r = (T.type === 'wide' ? 3.0 : 2.4) * T.s;
        if (!T.out) { r = Math.min(r, V.roadDist(T.x, T.z) - 4.3, solidR(T.x, T.y, T.z, r + 0.6) - 0.6); if (r < 0.8 || inLot(T.x, T.z, r)) continue; }
        carp.push([T.x + (rnd() - 0.5), T.y + 0.1 + (carp.length % 6) * 0.012 + rnd() * 0.002, T.z + (rnd() - 0.5), r, ['#c9762a', '#b8692a', '#a8743e', '#d08a34', '#9a6a3a'][Math.floor(rnd() * 5)]]);
      }
      const cm = new THREE.InstancedMesh(disc, new THREE.MeshLambertMaterial(), carp.length);
      carp.forEach(([x, y, z, r, c], i) => { cm.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromEuler(e.set(0, rnd() * 6, 0)), sv.set(r, 1, r * (0.75 + rnd() * 0.3)))); cm.setColorAt(i, col.set(c)); });
      cm.receiveShadow = true; root.add(cm);
      // ---- folhas soltas: sob as árvores, nas margens das ruas e espalhadas (nada no meio da pista nem dentro dos lotes) ----
      const geo = new THREE.PlaneGeometry(0.36, 0.26); geo.rotateX(-Math.PI / 2);
      const pts = [];
      for (let k = 0; pts.length < 7000 && k < 90000; k++) {
        let x, z; const r0 = rnd();
        if (r0 < 0.5) { const T = V.trees[Math.floor(rnd() * V.trees.length)], a = rnd() * 6.3, d = rnd() * 3.4 * T.s; x = T.x + Math.cos(a) * d; z = T.z + Math.sin(a) * d; }
        else { x = 2 + rnd() * (MAP - 4); z = 2 + rnd() * (MAP - 4); }
        const d = V.roadDist(x, z), inQ = q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1;
        if (d < 2.8 || inLot(x, z) || (cuts.some(inQ) && !V.ramps.some(inQ))) continue;   // (nada no vão entre a ladeira e o patamar)
        if (r0 >= 0.5 && d > 6.5 && rnd() < 0.5) continue;                     // mais nas margens das ruas
        pts.push([x, z]);
      }
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), pts.length);
      pts.forEach(([x, z], i) => {
        e.set((rnd() - 0.5) * 0.3, rnd() * 6.3, (rnd() - 0.5) * 0.3); q.setFromEuler(e);
        const k = 0.8 + rnd() * 0.9; im.setMatrixAt(i, m4.compose(v.set(x, V.h(x, z) + 0.13 + rnd() * 0.02, z), q, sv.set(k, 1, k)));
        im.setColorAt(i, col.set(LEAF_COLS[Math.floor(rnd() * LEAF_COLS.length)]));
      });
      im.receiveShadow = true; im.frustumCulled = false; root.add(im);
      // ---- folhas caindo: poucas, perto de quem joga ----
      const NF = 70, fg = new THREE.PlaneGeometry(0.3, 0.22);
      fall = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), NF); fall.frustumCulled = false;
      fall.userData.p = Array.from({ length: NF }, () => ({ x: 0, z: 0, y: -1, sp: 0.6 + Math.random() * 0.5, ph: Math.random() * 6, rs: 1 + Math.random() * 2 }));
      for (let i = 0; i < NF; i++) fall.setColorAt(i, col.set(LEAF_COLS[i % LEAF_COLS.length]));
      root.add(fall);
      life = createForestLife(V); root.add(life.object);
      sc.add(root); built = true;
    },
    /** p: quem joga (x, y, z); cam: posição da câmera; dest: centro da casa do destino ({x, y, z}) ou null. */
    update(dt, p, cam, dest) {
      if (!built || !fall) return;
      t += dt;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      fall.userData.p.forEach((l, i) => {
        if (l.y < 0 || !p || Math.hypot(l.x - p.x, l.z - p.z) > 45) {
          if (!p) { l.y = -1; m4.makeScale(0, 0, 0); fall.setMatrixAt(i, m4); return; }
          const a = Math.random() * 6.3, r = 6 + Math.random() * 34; l.x = p.x + Math.cos(a) * r; l.z = p.z + Math.sin(a) * r; l.y = 4 + Math.random() * 6;
        }
        l.y -= l.sp * dt; const sw = Math.sin(t * 1.3 + l.ph);
        l.x += sw * 0.6 * dt; l.z += Math.cos(t * 0.9 + l.ph) * 0.4 * dt;
        e.set(sw * 0.9, t * l.rs + l.ph, Math.cos(t * l.rs + l.ph) * 0.8); q.setFromEuler(e);
        fall.setMatrixAt(i, m4.compose(v.set(l.x, l.y, l.z), q, one));
      });
      fall.instanceMatrix.needsUpdate = true;
      if (life) life.update(dt, p);
      // copas entre a câmera e quem joga (ou a casa do destino) ficam transparentes
      ghostT -= dt;
      if (!crowns || !cam || ghostT > 0) return;
      ghostT = 0.08;
      const segs = [];
      if (p) segs.push([cam, { x: p.x, y: (p.y || 0) + 1.2, z: p.z }]);
      if (dest) segs.push([cam, dest]);
      // (a árvore inteira: se só a copa do meio sumisse, as copinhas do lado ficariam soltas no ar)
      const now = new Set(), D = crowns.data;
      const mr = crowns.maxR, S2 = segs.map(([A, B]) => ({ A, dx: B.x - A.x, dy: B.y - A.y, dz: B.z - A.z,   // caixa de cada segmento (+ maior raio): pula as copas longe
        x0: Math.min(A.x, B.x) - mr, x1: Math.max(A.x, B.x) + mr, z0: Math.min(A.z, B.z) - mr, z1: Math.max(A.z, B.z) + mr }));
      for (const g of S2) g.L2 = g.dx * g.dx + g.dy * g.dy + g.dz * g.dz || 1;
      for (let i = 0; i < D.length; i++) {
        if (now.has(i)) continue;
        const c = D[i], r = crowns.rr[i];
        for (const g of S2) {
          if (c[0] < g.x0 || c[0] > g.x1 || c[2] < g.z0 || c[2] > g.z1) continue;
          const A = g.A, u = Math.max(0, Math.min(1, ((c[0] - A.x) * g.dx + (c[1] - A.y) * g.dy + (c[2] - A.z) * g.dz) / g.L2));
          const ex = A.x + g.dx * u - c[0], ey = A.y + g.dy * u - c[1], ez = A.z + g.dz * u - c[2];
          if (ex * ex + ey * ey + ez * ez < r * r) { for (const j of crowns.owner[i]) now.add(j); break; }
        }
      }
      let ch = false;
      for (const i of crowns.ghost) if (!now.has(i)) { crowns.op.setMatrixAt(i, crowns.mats[i]); ch = true; }
      for (const i of now) if (!crowns.ghost.has(i)) { crowns.op.setMatrixAt(i, crowns.zero); ch = true; }
      crowns.ghost = now;
      if (ch) {
        let k = 0; for (const i of now) { crowns.gh.setMatrixAt(k, crowns.mats[i]); crowns.gh.setColorAt(k, crowns.cols[i]); k++; }
        crowns.gh.count = k; crowns.op.instanceMatrix.needsUpdate = true; crowns.gh.instanceMatrix.needsUpdate = true; if (crowns.gh.instanceColor) crowns.gh.instanceColor.needsUpdate = true;
      }
    },
  };
}

// ---------- Vida do Bosque ----------
// Fora dos quintais (nada que se confunda com as pistas de outono das casas: pilha de folhas, ancinho, cesto, lenha): no
// trecho de mata do meio do bairro, um pai junta as folhas num monte com o ancinho e o filho pula no monte (as folhas voam,
// o pai põe as mãos na cintura e junta de novo); um vizinho com o soprador de folhas limpando a beira da rua da entrada;
// alguém passeando com o cachorro pela estrada da mata; uma fotógrafa agachando para fotografar as árvores; e esquilos
// correndo entre os troncos e subindo neles perto de quem joga. Multidão instanciada (6 desenhos) + poucos objetos.
function createForestLife(V) {
  const root = new THREE.Group(); root.name = 'forest-life';
  const crowd = createCrowd(5, { name: 'forest-crowd' }); root.add(crowd.object);
  const P = crowd.people;
  [
    { shirt: '#8a3a2a', pants: '#3d4a66', shoes: '#4a3022', skin: '#e8b48a', hair: '#6b3e26', hat: '#3f6a4a' },     // 0 pai com o ancinho (gorro)
    { shirt: '#e8c03a', pants: '#2f4a6e', shoes: '#d8312a', skin: '#f0c49a', hair: '#a0522d' },                     // 1 criança
    { shirt: '#5a7a4a', pants: '#5a4a3a', shoes: '#3a2a20', skin: '#c08560', hair: '#222222', hat: '#e8a23a' },     // 2 soprador (boné)
    { shirt: '#c9762a', pants: '#4a4a52', shoes: '#3a2a20', skin: '#f5d2b0', hair: '#d8d4cc', long: true },         // 3 passeio com o cachorro
    { shirt: '#7a5a8a', pants: '#3a3d44', shoes: '#2b2522', skin: '#d9a074', hair: '#3b2a1a', long: true },         // 4 fotógrafa
  ].forEach((o, i) => { crowd.look(i, o); P[i].on = true; });
  P[1].scale = 0.7;
  const segOf = (a, b) => V.segs.find(s => (s.na === a && s.nb === b) || (s.na === b && s.nb === a));
  const side = (sg, t, off) => { const [ax, az] = sg.a, [bx, bz] = sg.b, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L; return { x: ax + ux * t * L - uz * off, z: az + uz * t * L + ux * off, ux, uz, L }; };
  const H = (x, z) => V.h(x, z);
  // ---- objetos ----
  const held = (grp, grip) => { const o = vcMerge(grp); o.castShadow = false; o.matrixAutoUpdate = false; o.userData.grip = grip; root.add(o); return o; };
  const rake = held(new THREE.Group().add(at(cyl(0.03, 0.03, 1.7, '#8a5a36', 5), 0, 0.2, 0), at(box(0.55, 0.05, 0.07, '#5a5d63'), 0, -0.66, 0.02)), new THREE.Matrix4().makeRotationX(0.75).setPosition(0, -0.55, 0.05));
  const blower = held(new THREE.Group().add(at(box(0.32, 0.32, 0.4, '#d8312a'), 0, 0, 0), at(cyl(0.06, 0.07, 1.1, '#3a3d44', 6), 0, -0.25, 0.55, 1.1, 0, 0)), new THREE.Matrix4().makeRotationX(0.6).setPosition(0, -0.55, 0.12));
  const camP = held(new THREE.Group().add(at(box(0.26, 0.18, 0.14, '#2b2d33'), 0, 0, 0), at(cyl(0.06, 0.06, 0.12, '#1c1c1c', 8), 0, 0, 0.12, Math.PI / 2, 0, 0)), new THREE.Matrix4().makeRotationX(1.4).setPosition(0.12, -0.55, 0.05));
  const pileG = new THREE.Group(); for (const [x, y, z, r, c] of [[0, 0.1, 0, 1.0, '#e0841e'], [0.55, 0, 0.25, 0.7, '#f2c23a'], [-0.5, 0, -0.25, 0.75, '#c63a24'], [0.1, 0, -0.55, 0.6, '#9a6232'], [-0.25, 0, 0.55, 0.62, '#f39236'], [0.05, 0.55, 0.05, 0.5, '#eaa82a']]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat(c)); b.position.set(x, y, z); b.scale.set(r, r * 0.7, r); b.rotation.set(x * 2, z * 3, 0); pileG.add(b); }
  const pile = vcMerge(pileG); pile.castShadow = false; root.add(pile);
  const NB = 40, burst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), NB); burst.frustumCulled = false; root.add(burst);
  const LC = ['#ec7f22', '#de6c18', '#eaa82a', '#f2bb3a', '#c63a24', '#9a6232'], col = new THREE.Color();
  for (let i = 0; i < NB; i++) burst.setColorAt(i, col.set(LC[i % LC.length]));
  const bl = Array.from({ length: NB }, () => ({ x: 0, y: -5, z: 0, vx: 0, vy: 0, vz: 0, r: Math.random() * 6 }));
  const dogG = new THREE.Group(), DC = '#3a2a20', DL = '#f2efe6';
  dogG.add(at(box(0.32, 0.3, 0.7, DC), 0, 0.45, 0), at(box(0.28, 0.28, 0.32, DC), 0, 0.66, 0.44), at(box(0.18, 0.16, 0.18, DL), 0, 0.6, 0.64), at(box(0.06, 0.06, 0.04, '#1c1c1c'), 0, 0.64, 0.74), at(box(0.3, 0.24, 0.4, DL), 0, 0.4, 0.1));
  for (const sx of [-1, 1]) dogG.add(at(box(0.08, 0.2, 0.12, DC), sx * 0.14, 0.82, 0.4));
  for (const [x, z] of [[-0.1, 0.26], [0.1, 0.26], [-0.1, -0.26], [0.1, -0.26]]) dogG.add(at(box(0.09, 0.32, 0.09, DL), x, 0.16, z));
  dogG.add(at(box(0.06, 0.06, 0.3, DC), 0, 0.62, -0.44, 0.8, 0, 0));
  const dog = vcMerge(dogG); dog.castShadow = false; root.add(dog);
  const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#2b2d33' })); leash.frustumCulled = false; root.add(leash);
  // esquilos: corpo + cabeça + rabo peludo numa malha instanciada
  const sqG = new THREE.Group(), SQ = '#a8582a';
  sqG.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mat(SQ)), 0, 0.14, 0)); sqG.children[0].scale.set(1, 0.9, 1.5);
  sqG.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(SQ)), 0, 0.22, 0.19), at(box(0.04, 0.06, 0.03, '#7a3a1a'), -0.05, 0.31, 0.18), at(box(0.04, 0.06, 0.03, '#7a3a1a'), 0.05, 0.31, 0.18), at(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), mat('#f2efe6')), 0, 0.2, 0.28));
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat('#c8743a')); tail.scale.set(0.8, 2.0, 0.8); tail.position.set(0, 0.32, -0.2); tail.rotation.x = -0.35; sqG.add(tail);
  const NSQ = 4, squirrels = new THREE.InstancedMesh(vcMerge(sqG).geometry, mat('#ffffff', { vertexColors: true }), NSQ); squirrels.frustumCulled = false; root.add(squirrels);
  const sq = Array.from({ length: NSQ }, (_, i) => ({ x: 0, y: 0, z: 0, ry: 0, mode: 'reset', t: 0, tree: null, h: 0, k: i }));
  // ---- lugares ----
  const wood = segOf('n26', 'n32') || V.segs.find(s => s.type === 'wood');
  // monte de folhas numa clareira da mata perto da estrada (os troncos ficam longe da roda do ancinho e do pulo), longe das
  // casas (as pilhas de folhas dos quintais são pistas); a criança espera ao lado, na beira da estrada
  const clr = (x, z) => { let m = 99; for (const t of V.trees) m = Math.min(m, Math.hypot(t.x - x, t.z - z) - 0.6 * t.s); for (const l of V.lamps) m = Math.min(m, Math.hypot(l.x - x, l.z - z) - 0.45); for (const b of V.benches || []) m = Math.min(m, Math.hypot(b.x - x, b.z - z) - 1.1); return m; };
  const lotD = (x, z) => V.spots.reduce((m, o) => Math.min(m, Math.hypot(Math.max(o.box.x0 - x, 0, x - o.box.x1), Math.max(o.box.z0 - z, 0, z - o.box.z1))), 1e9);
  const flat = (x, z, r) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([a, b]) => Math.abs(H(x + a, z + b) - H(x, z)) < 0.02);
  const site = (() => {
    let best = null;
    for (const sg of [wood, ...V.segs.filter(q => q.type === 'wood' && q !== wood)]) {
      for (let t = 0.25; t <= 0.75; t += 0.025) for (let off = 6.5; off <= 11; off += 0.5) for (const sd of [1, -1]) {
        const q = side(sg, t, off * sd); if (V.roadDist(q.x, q.z) < 6.4 || lotD(q.x, q.z) < 7 || !flat(q.x, q.z, 3)) continue;
        const c = clr(q.x, q.z); if (c < 3.1) continue;
        // a criança: ao lado do monte, mais perto da estrada
        let kid = null; for (const [a, b] of [[4.2, 1.6], [-4.2, 1.6], [4.2, 0.6], [-4.2, 0.6], [3.2, 2.4], [-3.2, 2.4]]) {
          const kx = q.x + q.ux * a + q.uz * b * sd, kz = q.z + q.uz * a - q.ux * b * sd;
          if (clr(kx, kz) > 1.0 && V.roadDist(kx, kz) > 4.8 && Math.abs(H(kx, kz) - H(q.x, q.z)) < 0.02) { kid = { x: kx, z: kz }; break; } }
        if (!kid) continue;
        const score = c + (sg === wood ? 2 : 0) - Math.abs(t - 0.5) * 2;
        if (!best || score > best.score) best = { x: q.x, z: q.z, kid, score };
      }
      if (best) break;
    }
    return best || { x: side(wood, 0.5, 9.5).x, z: side(wood, 0.5, 9.5).z, kid: { x: side(wood, 0.5, 9.5).x + 5, z: side(wood, 0.5, 9.5).z + 2 } };
  })();
  const pileAt = { x: site.x, z: site.z }, kidAt = site.kid, dadSt = { mode: 'rake', t: 0, size: 1, a: 0 }, kidSt = { mode: 'wait', t: 6 };
  const ent = segOf('n1', 'n2') || V.segs[1], blowSt = { u: 0.25, dir: 1 };
  const dogSeg = segOf('n28', 'n6') || V.segs.find(s => s.type === 'wood'), dogSt = { u: 0.2, dir: 1, pause: 0, d: { x: 0, z: 0, ry: 0 } };
  const photoSeg = segOf('n14', 'n15') || V.segs.find(s => s.type === 'wood'), photoSt = { k: 0, t: 0, mode: 'walk' };
  P[0].x = pileAt.x + 1.6; P[0].z = pileAt.z; P[1].x = kidAt.x; P[1].z = kidAt.z;
  { const q = side(ent, blowSt.u, 5.0); P[2].x = q.x; P[2].z = q.z; }
  { const q = side(dogSeg, dogSt.u, 4.7); P[3].x = q.x; P[3].z = q.z; dogSt.d.x = q.x; dogSt.d.z = q.z; }
  { const q = side(photoSeg, 0.3, 4.9); P[4].x = q.x; P[4].z = q.z; }
  P[0].hold = [null, rake]; P[2].hold = [null, blower]; P[4].hold = [camP, null];
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  let T = 0;
  function blowLeaves(x, z, n, up, spread, px = 0, pz = 0) { let k = 0; const gy = H(x, z); for (const l of bl) { if (l.y > -1) continue; l.x = x + (Math.random() - 0.5) * 0.6; l.z = z + (Math.random() - 0.5) * 0.6; l.y = gy + 0.3; l.vx = (Math.random() - 0.5) * spread + px; l.vz = (Math.random() - 0.5) * spread + pz; l.vy = up * (0.6 + Math.random() * 0.6); if (++k >= n) break; } }
  function update(dt, pl) {
    T += dt; const t = T;
    for (const p of P) p.y = H(p.x, p.z);
    // pai e filho no monte de folhas
    { const d = P[0], k = P[1], ds = dadSt, ks = kidSt;
      if (ds.mode === 'rake') { ds.t += dt; const a = ds.a += dt * 0.35, x = pileAt.x + Math.cos(a) * 1.7, z = pileAt.z + Math.sin(a) * 1.7;
        crowdWalkTo(d, x, z, 0.4, dt); if (d.amp < 0.5) crowdTurn(d, Math.atan2(pileAt.x - d.x, pileAt.z - d.z), dt, 3);
        d.arms[2] = -0.7 + Math.sin(t * 2.6) * 0.35; d.arms[0] = -0.5 + Math.sin(t * 2.6) * 0.3; d.arms[1] = d.arms[3] = -0.12; d.pitch = 0.35; d.lean = 0.12;
        ds.size = Math.min(1, ds.size + dt * 0.05); }
      else if (ds.mode === 'hips') { ds.t += dt; crowdStand(d, dt); crowdTurn(d, Math.atan2(k.x - d.x, k.z - d.z), dt, 3); d.arms[0] = d.arms[2] = 0.35; d.arms[1] = d.arms[3] = 0.75; d.lean = -0.05; d.pitch = Math.sin(t * 3) * 0.08; if (ds.t > 3.2) { ds.mode = 'rake'; ds.t = 0; d.lean = 0; } }
      // criança: espera o monte crescer, corre e pula; depois se levanta rindo e volta para o lugar dela
      ks.t -= dt;
      if (ks.mode === 'wait') { crowdStand(k, dt, Math.sin(t * 0.8) * 0.6); crowdTurn(k, Math.atan2(pileAt.x - k.x, pileAt.z - k.z), dt, 3); k.bob = Math.max(0, Math.sin(t * 5)) * 0.06; if (ks.t <= 0 && ds.size > 0.85) { ks.mode = 'run'; } }
      else if (ks.mode === 'run') { k.bob = 0; if (crowdWalkTo(k, pileAt.x + 0.9, pileAt.z + 0.9, 3.2, dt, true) || Math.hypot(k.x - pileAt.x, k.z - pileAt.z) < 1.4) { ks.mode = 'jump'; ks.t = 0.7; ks.x0 = k.x; ks.z0 = k.z; } }
      else if (ks.mode === 'jump') { const u = 1 - ks.t / 0.7; k.x = ks.x0 + (pileAt.x - ks.x0) * u; k.z = ks.z0 + (pileAt.z - ks.z0) * u; k.bob = Math.sin(u * Math.PI) * 1.0; k.arms[0] = k.arms[2] = -2.6; k.amp = 0;
        if (ks.t <= 0) { ks.mode = 'in'; ks.t = 2.2; blowLeaves(pileAt.x, pileAt.z, 34, 4.2, 4.5); ds.size = 0.25; ds.mode = 'hips'; ds.t = 0; } }
      else if (ks.mode === 'in') { k.bob = -0.45 + Math.sin(t * 6) * 0.05; k.arms[0] = -2.2 + Math.sin(t * 7) * 0.4; k.arms[2] = -2.2 - Math.sin(t * 7) * 0.4; if (ks.t <= 0) { ks.mode = 'back'; k.bob = 0; k.arms[0] = k.arms[2] = 0; } }
      else if (ks.mode === 'back') { if (crowdWalkTo(k, kidAt.x, kidAt.z, 1.6, dt, true)) { ks.mode = 'wait'; ks.t = 14 + Math.random() * 10; } }
      pile.position.set(pileAt.x, H(pileAt.x, pileAt.z) + 0.05, pileAt.z); pile.scale.set(0.8 + ds.size * 0.7, 0.45 + ds.size * 1.0, 0.8 + ds.size * 0.7); }
    // soprador de folhas na beira da rua da entrada (vai e volta devagar; as folhas voam na frente do bocal)
    { const p = P[2], s = blowSt; s.u += s.dir * dt * 0.012; if (s.u > 0.8 || s.u < 0.2) s.dir = -s.dir;
      const q = side(ent, s.u, 5.0); crowdWalkTo(p, q.x, q.z, 0.5, dt); if (p.amp < 0.3) crowdTurn(p, Math.atan2(q.ux * s.dir, q.uz * s.dir) + 0.5, dt, 2);
      p.arms[2] = -0.75 + Math.sin(t * 1.3) * 0.25; p.arms[3] = 0.05;
      if (Math.random() < dt * 9) { const fx = Math.sin(p.ry), fz = Math.cos(p.ry); blowLeaves(p.x + fx * 1.3, p.z + fz * 1.3, 1, 1.4, 1.2, fx * 2.5, fz * 2.5); } }
    // folhas soltas no ar (do pulo e do soprador)
    for (let i = 0; i < NB; i++) { const l = bl[i];
      if (l.y <= -1) { burst.setMatrixAt(i, ZERO); continue; }
      l.vy -= 3.2 * dt; l.vx *= Math.pow(0.6, dt); l.vz *= Math.pow(0.6, dt); l.x += l.vx * dt; l.z += l.vz * dt; l.y += Math.max(l.vy, -0.9) * dt; l.r += dt * 4;
      const gy = H(l.x, l.z); if (l.y < gy + 0.12) { l.y = -5; burst.setMatrixAt(i, ZERO); continue; }
      burst.setMatrixAt(i, M4.compose(V3.set(l.x, l.y, l.z), Q.setFromEuler(E.set(Math.sin(l.r) * 1.2, l.r, Math.cos(l.r * 0.7))), ONE)); }
    burst.instanceMatrix.needsUpdate = true;
    // passeio com o cachorro pela estrada da mata (o cachorro para para cheirar as folhas)
    { const p = P[3], s = dogSt, q = side(dogSeg, s.u, 4.7);   // (na beira da estrada: os troncos ficam a mais de 6 m do eixo)
      if (s.pause > 0) { s.pause -= dt; crowdStand(p, dt, -0.5); }
      else { s.u += s.dir * dt * 0.9 / q.L; if (s.u > 0.85 || s.u < 0.15) { s.dir = -s.dir; s.pause = 2; } crowdWalkTo(p, q.x, q.z, 1.2, dt); if (Math.random() < dt * 0.08) s.pause = 3 + Math.random() * 2; }
      p.arms[2] = -0.5;
      const fx = Math.sin(p.ry), fz = Math.cos(p.ry), gx = p.x + fx * 1.3 + fz * 0.5, gz = p.z + fz * 1.3 - fx * 0.5, D = s.d;
      const dd = Math.hypot(gx - D.x, gz - D.z); if (dd > 0.02) { D.x += (gx - D.x) * Math.min(1, dt * 3.5); D.z += (gz - D.z) * Math.min(1, dt * 3.5); if (dd > 0.12) D.ry += Math.atan2(Math.sin(Math.atan2(gx - D.x, gz - D.z) - D.ry), Math.cos(Math.atan2(gx - D.x, gz - D.z) - D.ry)) * Math.min(1, dt * 5); }
      const sniff = s.pause > 0;
      dog.position.set(D.x, H(D.x, D.z) + (dd > 0.12 && !sniff ? Math.abs(Math.sin(t * 11)) * 0.04 : 0), D.z); dog.rotation.set(sniff ? 0.3 : 0, D.ry + (sniff ? Math.sin(t * 3) * 0.3 : 0), 0);
      const la = leash.geometry.attributes.position; la.setXYZ(0, p.x + fx * 0.25 + fz * 0.5, p.y + 0.72, p.z + fz * 0.25 - fx * 0.5); la.setXYZ(1, D.x + Math.sin(D.ry) * 0.32, dog.position.y + 0.66, D.z + Math.cos(D.ry) * 0.32); la.needsUpdate = true; }
    // fotógrafa: anda pela beira da estrada da mata, para, agacha e fotografa as copas (de pé, apontando para cima)
    { const p = P[4], s = photoSt, spots = [0.25, 0.5, 0.75];
      if (s.mode === 'walk') { const q = side(photoSeg, spots[s.k], 4.9); p.kneel = Math.max(0, p.kneel - dt * 2); p.arms[0] = 0; p.pitch = 0; if (crowdWalkTo(p, q.x, q.z, 0.8, dt)) { s.mode = 'shoot'; s.t = 0; s.low = Math.random() < 0.5; s.face = Math.atan2(-q.uz, q.ux) + (Math.random() - 0.5) * 0.7; } }   // (na beira da estrada, virada para a mata)
      else { s.t += dt; crowdTurn(p, s.face, dt, 2); p.kneel = s.low ? Math.min(1, p.kneel + dt * 2) : 0; p.arms[0] = -1.55; p.arms[1] = -0.35; p.arms[2] = -1.3; p.arms[3] = -0.4; p.pitch = s.low ? -0.35 : -0.2;
        if (s.t > 5.5) { s.mode = 'walk'; s.k = (s.k + 1 + Math.floor(Math.random() * 2)) % 3; p.arms[2] = 0; p.arms[3] = 0.16; p.arms[1] = 0.16; } } }
    crowd.update();
    // esquilos: perto de quem joga — correm até uma árvore, sobem um pouco o tronco, olham e descem
    for (const a of sq) {
      if (!pl) { squirrels.setMatrixAt(a.k, ZERO); continue; }
      if (a.mode === 'reset' || Math.hypot(a.x - pl.x, a.z - pl.z) > 50) {
        const near = V.trees.filter(tr => { const d = Math.hypot(tr.x - pl.x, tr.z - pl.z); return d > 10 && d < 34 && V.roadDist(tr.x, tr.z) > 5; });
        if (!near.length) { squirrels.setMatrixAt(a.k, ZERO); continue; }
        a.tree = near[Math.floor(Math.random() * near.length)]; const r = 4 + Math.random() * 3, an = Math.random() * 6.3; a.x = a.tree.x + Math.cos(an) * r; a.z = a.tree.z + Math.sin(an) * r; a.h = 0; a.mode = 'run'; a.t = 0;
      }
      const tr = a.tree, ty = tr.y || 0, trunkR = (tr.type === 'wide' ? 0.38 : tr.type === 'tall' ? 0.2 : 0.32) * tr.s + 0.08;
      if (a.mode === 'run') { const dx = tr.x - a.x, dz = tr.z - a.z, d = Math.hypot(dx, dz); a.ry = Math.atan2(dx, dz); const st = Math.min(d - trunkR, 3.4 * dt * (0.6 + Math.abs(Math.sin(T * 7 + a.k)))); a.x += dx / d * st; a.z += dz / d * st; if (d - trunkR < 0.05) { a.mode = 'up'; a.t = 0; a.top = 1.2 + Math.random() * 1.4; } }
      else if (a.mode === 'up') { a.h = Math.min(a.top, a.h + dt * 1.6); if (a.h >= a.top) { a.mode = 'look'; a.t = 1.5 + Math.random() * 2.5; } }
      else if (a.mode === 'look') { a.t -= dt; if (a.t <= 0) a.mode = 'down'; }
      else if (a.mode === 'down') { a.h = Math.max(0, a.h - dt * 1.8); if (a.h <= 0) { a.mode = 'pause'; a.t = 0.5 + Math.random(); } }
      else if (a.mode === 'pause') { a.t -= dt; if (a.t <= 0) { const nx = V.trees.filter(o => o !== tr && Math.hypot(o.x - tr.x, o.z - tr.z) < 10 && V.roadDist(o.x, o.z) > 5); if (nx.length) { a.tree = nx[Math.floor(Math.random() * nx.length)]; a.mode = 'run'; } else a.mode = 'reset'; } }
      const climbing = a.h > 0.02, gy = climbing ? ty : H(a.x, a.z);
      M4.compose(V3.set(a.x, gy + a.h + (a.mode === 'run' ? Math.abs(Math.sin(T * 14 + a.k)) * 0.06 : 0), a.z), Q.setFromEuler(E.set(climbing ? -Math.PI / 2 : 0, a.ry, 0, 'YXZ')), S3.set(1.2, 1.2, 1.2));
      squirrels.setMatrixAt(a.k, M4);
    }
    squirrels.instanceMatrix.needsUpdate = true;
  }
  root.userData.api = { people: P };
  return { object: root, update };
}
