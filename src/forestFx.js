// Nível 22 (Bosque): clima de outono acolhedor.
//  - setup: céu claro levemente nublado, luz quente e suave (sem filtro: as cores das casas continuam as mesmas);
//    o bosque inteiro instanciado (árvores do plano + floresta densa em volta do bairro), tapetes de folhas sob as árvores,
//    folhas soltas no chão e nas margens das ruas;
//  - update: copas que escondem quem joga ou a casa do destino ficam transparentes; folhas caindo devagar perto do jogador.
// Folhas são só visuais (sem colisão). Troncos do bosque de fora perto do bairro entram em SOLIDS.
import * as THREE from 'three';
import { AUTUMN } from './models/forest.js';
import { SOLIDS, HEDGE } from './layout.js';

const LEAF_COLS = ['#ec7f22', '#de6c18', '#eaa82a', '#f2bb3a', '#c63a24', '#9a6232', '#d24a2c', '#f39236'];
const OUT_COLS = ['orange', 'orange', 'orange', 'gold', 'gold', 'gold', 'red', 'brown', 'yellow', 'orange', 'gold', 'green'];

export function createForestFx() {
  const root = new THREE.Group(); root.name = 'forest-fx';
  let fall = null, built = false, t = 0, crowns = null, ghostT = 0;
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
      root.add(fall); sc.add(root); built = true;
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
