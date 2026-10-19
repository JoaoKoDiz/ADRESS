// Nível 15 (Colheita): o entorno do bairro vira hectares de plantação (só cenário; nada aqui é sólido, destino ou pista).
//  - talhões grandes em grade em volta do mapa (fora de uma margem e da estrada de acesso), até perto do horizonte:
//    milho (fileiras altas), trigo, hortaliças e soja (fileiras baixas de cores diferentes), pomares e alguns pastos;
//    estradas de terra entre os talhões e cercas em volta de alguns. Tudo em InstancedMesh (poucas chamadas de desenho).
//  - tratores (modelo do jogo) rodando devagar pelas estradas de terra em volta de blocos de talhões;
//  - colheitadeiras passando pelos milharais mais próximos: as fileiras atrás delas encurtam (faixa colhida); quando o
//    talhão acaba, ele "cresce" de novo e a máquina recomeça.
import * as THREE from 'three';
import { buildTractor } from './models/farm.js';

const TW = 74, TD = 58, GAP = 7;                   // talhão (x × z) e a estrada de terra entre eles
const EXT = 560;                                    // até onde vão as plantações (além da borda do mapa)
const ROW = 1.5;                                    // espaçamento das fileiras
const CROPS = {
  corn: { h: 2.1, w: 0.7, c: '#6aa03a', soil: '#7a5a3a' }, wheat: { h: 0.75, w: 1.0, c: '#d8b84a', soil: '#9a7a4a' },
  greens: { h: 0.45, w: 0.8, c: '#4f9a3a', soil: '#6a4a2e' }, soy: { h: 0.6, w: 0.9, c: '#86b43a', soil: '#7a5a3a' },
};

function hash(i, j) { let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

/** Colheitadeira (frente para +X): corpo, cabine, plataforma de corte com molinete, tubo de descarga e rodas. */
function buildCombine() {
  const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
  const B = (w, h, d, c, x, y, z, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); o.position.set(x, y, z); o.rotation.z = rz; g.add(o); return o; };
  B(5.2, 2.6, 3.0, '#3f8a3a', 0, 2.1, 0); B(2.0, 1.6, 2.2, '#2b3d52', 1.6, 3.9, 0); B(2.2, 0.15, 2.4, '#f4f1ea', 1.6, 4.75, 0);   // cabine envidraçada
  for (const [x, z] of [[0.62, -1.08], [0.62, 1.08], [2.58, -1.08], [2.58, 1.08]]) B(0.12, 1.6, 0.12, '#3f8a3a', x, 3.9, z);
  B(1.2, 0.8, 6.4, '#e8c23a', 3.4, 0.9, 0);                                   // plataforma de corte
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 6.0, 8), m('#c8402f')); reel.rotation.x = Math.PI / 2; reel.position.set(3.9, 1.6, 0); g.add(reel);
  B(4.2, 0.35, 0.35, '#3f8a3a', -0.6, 4.0, 1.9, 0.15);                        // tubo de descarga
  for (const [x, r, s] of [[1.4, 1.1, 1], [-1.8, 0.75, 1]]) for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.6, 12), m('#1f2023')); w.rotation.x = Math.PI / 2; w.position.set(x, r, sd * 1.7 * s); g.add(w); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  g.userData.reel = reel;
  return g;
}

export function createFarmOutside() {
  let root = null, machines = [], combines = [], t = 0;
  return {
    /** Monta o entorno (uma vez por mundo da Colheita). MAPW: lado do bairro; cx: x da estrada de acesso (norte). */
    build(scene, MAPW, cx) {
      root = new THREE.Group(); root.name = 'farm-outside'; scene.add(root);
      const tiles = [];
      const x0 = -EXT, z0 = -EXT, nx = Math.ceil((MAPW + 2 * EXT) / (TW + GAP)), nz = Math.ceil((MAPW + 2 * EXT) / (TD + GAP));
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const ax = x0 + i * (TW + GAP), az = z0 + j * (TD + GAP), bx = ax + TW, bz = az + TD;
        if (bx > -24 && ax < MAPW + 24 && bz > -24 && az < MAPW + 24) continue;             // o bairro (com folga)
        if (bz < 0 && ax < cx + 12 && bx > cx - 12) continue;                               // a estrada de acesso
        const r = hash(i, j), type = r < 0.32 ? 'corn' : r < 0.52 ? 'wheat' : r < 0.66 ? 'greens' : r < 0.8 ? 'soy' : r < 0.93 ? 'orchard' : 'pasture';
        tiles.push({ i, j, ax, az, bx, bz, type, fence: hash(j, i) < 0.3 });
      }
      // solo dos talhões (caixas finas instanciadas) e estradas de terra (o chão em volta: um plano marrom-claro grande)
      const dirtMat = new THREE.MeshStandardMaterial({ color: '#b8956a', roughness: 1 }), E0 = -EXT, E1 = MAPW + EXT, I0 = -24, I1 = MAPW + 24;
      for (const [xa, xb, za, zb] of [[E0, I0, E0, E1], [I1, E1, E0, E1], [I0, I1, I1, E1], [I0, cx - 12, E0, I0], [cx + 12, I1, E0, I0]]) {   // (sem cobrir o bairro nem a estrada)
        const d = new THREE.Mesh(new THREE.PlaneGeometry(xb - xa, zb - za), dirtMat); d.rotation.x = -Math.PI / 2; d.position.set((xa + xb) / 2, 0.012, (za + zb) / 2); d.receiveShadow = false; root.add(d);
      }
      const box = new THREE.BoxGeometry(1, 1, 1), M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3();
      const inst = (n, color) => { const im = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ color, roughness: 0.95, flatShading: true }), Math.max(1, n)); im.count = 0; im.frustumCulled = false; root.add(im); return im; };
      const put = (im, x, y, z, sx, sy, sz) => { M.compose(V.set(x, y, z), q, S.set(sx, sy, sz)); im.setMatrixAt(im.count++, M); };
      const soilCol = { corn: '#7a5a3a', wheat: '#9a7a4a', greens: '#6a4a2e', soy: '#7a5a3a', orchard: '#6f9a4a', pasture: '#8fbf5a' };
      const soils = {}; for (const k in soilCol) soils[k] = inst(tiles.filter(tl => tl.type === k).length, soilCol[k]);
      for (const tl of tiles) put(soils[tl.type], (tl.ax + tl.bx) / 2, 0.03, (tl.az + tl.bz) / 2, TW, 0.04, TD);
      // fileiras (os milharais que as colheitadeiras usam ficam à parte)
      const near = tiles.filter(tl => tl.type === 'corn').map(tl => ({ tl, d: Math.hypot((tl.ax + tl.bx) / 2 - MAPW / 2, (tl.az + tl.bz) / 2 - MAPW / 2) })).sort((a, b) => a.d - b.d).slice(0, 2).map(o => o.tl);
      const nRows = Math.floor((TD - 2) / ROW);
      const siteSet = new Set(tiles.filter(tl => tl.type !== 'pasture' && !near.includes(tl) && hash(tl.j * 7 + 3, tl.i * 5 + 1) < 0.16));   // talhões com sítio no canto
      const inSite = (tl, x, z) => siteSet.has(tl) && x < tl.ax + 34 && z < tl.az + 17;
      const rows = {}; for (const k in CROPS) rows[k] = inst(tiles.filter(tl => tl.type === k && !near.includes(tl)).length * nRows, CROPS[k].c);
      for (const tl of tiles) {
        if (!CROPS[tl.type] || near.includes(tl)) continue; const C = CROPS[tl.type];
        for (let k = 0; k < nRows; k++) {
          const z = tl.az + 1.5 + k * ROW;
          if (inSite(tl, tl.ax, z)) put(rows[tl.type], (tl.ax + 34 + tl.bx - 1.5) / 2, 0.05 + C.h / 2, z, TW - 35.5, C.h, C.w);   // as fileiras começam depois do sítio
          else put(rows[tl.type], (tl.ax + tl.bx) / 2, 0.05 + C.h / 2, z, TW - 3, C.h, C.w);
        }
      }
      // pomares: tronco + copa (algumas com frutas)
      const orch = tiles.filter(tl => tl.type === 'orchard'), per = Math.floor((TW - 6) / 7) * Math.floor((TD - 6) / 7);
      const trunks = inst(orch.length * per, '#6b4526'), crowns = inst(orch.length * per, '#3f8f3a'), fruitC = inst(orch.length * per, '#e0402a');
      for (const tl of orch) for (let x = tl.ax + 4; x < tl.bx - 3; x += 7) for (let z = tl.az + 4; z < tl.bz - 3; z += 7) {
        if (inSite(tl, x, z)) continue;
        put(trunks, x, 0.8, z, 0.4, 1.6, 0.4); put(crowns, x, 2.6, z, 3.2, 2.6, 3.2); if (hash(x | 0, z | 0) < 0.5) put(fruitC, x + 0.9, 2.5, z + 1.2, 0.5, 0.5, 0.5);
      }
      // pastos: alguns fardos e vacas (caixas)
      const past = tiles.filter(tl => tl.type === 'pasture'), hay = inst(past.length * 6, '#e6c35a'), cows = inst(past.length * 5, '#f4f1ea');
      for (const tl of past) for (let k = 0; k < 6; k++) { const x = tl.ax + 8 + hash(k, tl.i) * (TW - 16), z = tl.az + 8 + hash(tl.j, k) * (TD - 16); if (k < 5) put(cows, x + 6, 1.0, z, 2.2, 1.2, 1.0); put(hay, x, 0.8, z, 1.6, 1.6, 1.6); }
      // cercas (postes + 2 travessas) em volta de alguns talhões
      const fenced = tiles.filter(tl => tl.fence), posts = inst(fenced.length * 46, '#7a5434'), rails = inst(fenced.length * 8, '#8a6a44');
      for (const tl of fenced) {
        for (let x = tl.ax; x <= tl.bx + 0.01; x += 6) for (const z of [tl.az - 1, tl.bz + 1]) put(posts, x, 0.6, z, 0.25, 1.2, 0.25);
        for (let z = tl.az; z <= tl.bz + 0.01; z += 6) for (const x of [tl.ax - 1, tl.bx + 1]) put(posts, x, 0.6, z, 0.25, 1.2, 0.25);
        for (const y of [0.5, 0.95]) { put(rails, (tl.ax + tl.bx) / 2, y, tl.az - 1, TW + 2, 0.12, 0.12); put(rails, (tl.ax + tl.bx) / 2, y, tl.bz + 1, TW + 2, 0.12, 0.12);
          put(rails, tl.ax - 1, y, (tl.az + tl.bz) / 2, 0.12, 0.12, TD + 2); put(rails, tl.bx + 1, y, (tl.az + tl.bz) / 2, 0.12, 0.12, TD + 2); }
      }
      // sítios espalhados pelas lavouras: casa e celeiro de telhado de duas águas, silo e um grupo de árvores (dão escala e
      // dizem que ali também se mora e trabalha). Ficam num canto do talhão, perto da estrada de terra.
      const sites = [...siteSet];
      const prism = new THREE.BufferGeometry().setFromPoints([]);
      { const sh = new THREE.Shape(); sh.moveTo(-0.5, 0); sh.lineTo(0.5, 0); sh.lineTo(0, 1); sh.closePath();
        const eg = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); eg.translate(0, 0, -0.5); prism.copy(eg); }
      const instG = (geo, n, color) => { const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }), Math.max(1, n)); im.count = 0; im.frustumCulled = false; root.add(im); return im; };
      const putR = (im, x, y, z, sx, sy, sz, ry) => { M.compose(V.set(x, y, z), q.setFromAxisAngle(V2.set(0, 1, 0), ry), S.set(sx, sy, sz)); im.setMatrixAt(im.count++, M); };
      const V2 = new THREE.Vector3(), n = sites.length;
      const walls = inst(n, '#efe6d2'), roofs = instG(prism, n, '#b5532f'), barnW = inst(n, '#a8382c'), barnR = instG(prism, n, '#6b6f76'), trim = inst(n * 2, '#f4f1ea');
      const silo = instG(new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0), n, '#c9cdd2'), dome = instG(new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), n, '#9aa3ab');
      const tTr = inst(n * 4, '#6b4526'), tCr = instG(new THREE.IcosahedronGeometry(1, 0), n * 4, '#3f8a3c');
      for (const tl of sites) {
        const cx = tl.ax + 9, cz = tl.az + 8, ry = hash(tl.i, tl.j * 3) < 0.5 ? 0 : Math.PI / 2;
        put(walls, cx, 1.7, cz, 9, 3.4, 7); putR(roofs, cx, 3.4, cz, 7.6, 2.4, 9.8, Math.PI / 2);   // casa
        put(barnW, cx + 14, 2.8, cz + 2, 10, 5.6, 9); putR(barnR, cx + 14, 5.6, cz + 2, 9.6, 3.6, 10.6, Math.PI / 2);   // celeiro
        put(trim, cx + 14, 2.0, cz + 6.55, 4, 4, 0.1); put(trim, cx, 1.1, cz + 3.55, 1.2, 2.2, 0.1);
        putR(silo, cx + 22, 0, cz - 2, 2.6, 11, 2.6, 0); putR(dome, cx + 22, 11, cz - 2, 2.6, 1.6, 2.6, 0);
        for (let k = 0; k < 4; k++) { const tx = cx - 6 + (k % 2) * 3.5, tz = cz - 7 + Math.floor(k / 2) * 3.2, sc = 1.2 + hash(k, tl.i) * 0.6;
          put(tTr, tx, 1.1 * sc, tz, 0.45 * sc, 2.2 * sc, 0.45 * sc); putR(tCr, tx, 3.1 * sc, tz, 1.9 * sc, 1.7 * sc, 1.9 * sc, k); }
      }
      for (const im of root.children) if (im.isInstancedMesh) { im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = false; }
      // colheitadeiras: cada uma num milharal perto do bairro; as fileiras dele são instâncias próprias (encurtam ao colher)
      combines = near.map((tl, n) => {
        const im = inst(nRows, CROPS.corn.c), mach = buildCombine(); root.add(mach);
        return { tl, im, mach, pass: 0, x: tl.ax, dir: 1, wait: n * 6, cut: new Float32Array(nRows).fill(0) };   // cut[k]: até onde a fileira k já foi colhida (0 = nada; 1 = toda)
      });
      for (const c of combines) this._rows(c);
      // tratores: laços pelas estradas de terra em volta de blocos de 2×2 talhões (perto do bairro), devagar e defasados
      const gx = i => x0 + i * (TW + GAP) - GAP / 2, gz = j => z0 + j * (TD + GAP) - GAP / 2;   // eixos das estradas de terra
      const iL = Math.floor((-24 - x0) / (TW + GAP)), iR = Math.ceil((MAPW + 24 - x0) / (TW + GAP)) + 1, jT = Math.floor((-24 - z0) / (TD + GAP)), jB = Math.ceil((MAPW + 24 - z0) / (TD + GAP)) + 1;
      const loops = [[iL - 2, jT - 2], [iR, jT - 1], [iL - 1, jB]];
      machines = loops.map(([i, j], n) => {
        const pts = [[gx(i), gz(j)], [gx(i + 2), gz(j)], [gx(i + 2), gz(j + 2)], [gx(i), gz(j + 2)]], W = gx(i + 2) - gx(i), D = gz(j + 2) - gz(j);
        const mesh = buildTractor(['#c8402f', '#2f6fb0', '#3f8a3a'][n]); mesh.traverse(o => { if (o.isMesh) o.castShadow = false; }); root.add(mesh);
        const L = 2 * (W + D);
        return { mesh, pts, L, s: n * 0.33 * L, v: 3 + n * 0.5 };
      });
    },
    /** Atualiza as fileiras do talhão da colheitadeira c (comprimento restante de cada uma). */
    _rows(c) {
      const M = new THREE.Matrix4(), q = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(), tl = c.tl, C = CROPS.corn, L = TW - 3;
      c.im.count = c.cut.length;
      for (let k = 0; k < c.cut.length; k++) {
        const left = 1 - c.cut[k], len = Math.max(0.01, L * left);   // (passadas pares: da esquerda para a direita; ímpares: ao contrário)
        const x = Math.floor(k / 4) % 2 === 0 ? tl.ax + 1.5 + L - len / 2 : tl.ax + 1.5 + len / 2;
        M.compose(V.set(x, left > 0.001 ? 0.05 + C.h / 2 : -5, tl.az + 1.5 + k * ROW), q, S.set(len, C.h, C.w)); c.im.setMatrixAt(k, M);
      }
      c.im.instanceMatrix.needsUpdate = true;
    },
    update(dt) {
      if (!root) return;
      t += dt;
      for (const m of machines) {                                   // trator: anda pelo laço, vira nas esquinas
        m.s = (m.s + m.v * dt) % m.L;
        let s = m.s; const P = m.pts;
        for (let k = 0; k < 4; k++) {
          const a = P[k], b = P[(k + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (s <= len) { const f = s / len; m.mesh.position.set(a[0] + (b[0] - a[0]) * f, 0, a[1] + (b[1] - a[1]) * f); m.mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); break; }
          s -= len;
        }
        if (m.mesh.userData.drive) m.mesh.userData.drive(dt, m.v);
      }
      for (const c of combines) {                                   // colheitadeira: passadas de 4 fileiras, ida e volta
        const tl = c.tl, n = c.cut.length, passes = Math.ceil(n / 4), L = TW - 3;
        if (c.wait > 0) { c.wait -= dt; continue; }
        if (c.pass >= passes) { c.cut.fill(0); c.pass = 0; c.wait = 4; this._rows(c); continue; }   // talhão colhido: cresce de novo
        const even = c.pass % 2 === 0, prog = Math.min(1, (c.prog = (c.prog || 0) + 2.4 * dt / L));
        for (let k = c.pass * 4; k < Math.min(n, c.pass * 4 + 4); k++) c.cut[k] = prog;
        const x = even ? tl.ax + 1.5 + prog * L : tl.ax + 1.5 + L - prog * L;
        c.mach.position.set(x + (even ? -2.4 : 2.4), 0, tl.az + 1.5 + (c.pass * 4 + 1.5) * ROW);
        c.mach.rotation.y = even ? 0 : Math.PI;
        c.mach.userData.reel.rotation.y += dt * 3;
        this._rows(c);
        if (prog >= 1) { c.pass++; c.prog = 0; }
      }
    },
    detach() { if (root && root.parent) root.parent.remove(root); },
    get machines() { return machines; },
  };
}
