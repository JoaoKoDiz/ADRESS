// Nível 23 (Cachoeira): desfiladeiro fundo entre as duas margens (colunas 4–5), ponte alta na rua 5, mirantes nas cabeceiras
// e a cachoeira gigante no fim sul do desfiladeiro. buildCanyonScene = parte fixa (fundida em terrain.js);
// createCanyonFx = água correndo, cortina da cachoeira, espuma, névoa e o som (pela distância).
// A colisão (abismo, mirantes, maciço) está em layout.js (rebuildBaseSolids).
import * as THREE from 'three';
import { box, cyl, cone, at, textTexture } from './models/kit.js';
import { CANAL, MAP, HEDGE, ROAD, roadCenter } from './layout.js';

const ROCK = ['#8c7b66', '#7d6d5a', '#9a8a72', '#86745f'], MOSS = '#5f8a3e', LEAF = ['#4f8f3a', '#3f7d34', '#6aa046'];
const CONC = '#b8b2a6', RAILC = '#5b6168', PAVE = '#c9bea8';
export const RIVER_Y = -40;
const rnd = (() => { let k = 23; return () => (k = (k * 16807) % 2147483647) / 2147483647; })();

export function canyonGeo() {
  const C = CANAL, zc = roadCenter(C.bridges[0]), hr = ROAD / 2;
  return { X0: C.x0, X1: C.x1, W: C.x1 - C.x0, cx: (C.x0 + C.x1) / 2, ZN: -320, ZS: MAP + 44, zc, zb0: zc - hr, zb1: zc + hr, TOP: 64 };
}
const inset = k => 0.6 + k * 1.55;            // as paredes vão fechando para baixo (perfil em V)

export function buildCanyonScene(g) {
  const { X0, X1, W, cx, ZN, ZS, zc, zb0, zb1, TOP } = canyonGeo(), LAY = 6, LH = (-RIVER_Y + 2) / LAY;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  const bush = (x, y, z, r) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshLambertMaterial({ color: LEAF[Math.floor(rnd() * 3)], flatShading: true })); m.position.set(x, y, z); m.scale.y = 0.75; g.add(m); };
  // paredes de pedra (camadas que avançam para dentro), musgo, arbustos nas saliências e cipós pendurados
  for (let z = ZN; z < ZS; z += 6) for (const s of [-1, 1]) {
    const edge = s < 0 ? X0 : X1;
    for (let k = 0; k < LAY; k++) {
      const i = inset(k) + rnd() * 1.4, w = 8 + i, y = -(k + 0.5) * LH;
      add(box(w, LH + 0.3, 6.3, ROCK[(k + Math.floor(z / 6)) & 3]), edge - s * 8 + s * w / 2, y, z + 3);
      if (rnd() < 0.3) bush(edge + s * (i - 0.6), -k * LH + 0.2 - (k ? 0 : 0.6), z + 1 + rnd() * 4, 0.9 + rnd() * 1.1);
      if (rnd() < 0.18) add(box(0.25, 3 + rnd() * 5, 0.6, MOSS), edge + s * (i + 0.15), -k * LH - 3, z + rnd() * 6);
    }
  }
  // margens fora do bairro (ao norte e ao sul da sebe): cerquinha de madeira na beira e árvores
  for (const s of [-1, 1]) {
    const edge = s < 0 ? X0 : X1;
    for (const [a, b] of [[ZN, -0.5], [MAP + 0.5, ZS]]) {
      add(box(0.12, 0.12, b - a, '#8a6a44'), edge - s * 0.4, 0.9, (a + b) / 2); add(box(0.12, 0.12, b - a, '#8a6a44'), edge - s * 0.4, 0.5, (a + b) / 2);
      for (let z = a; z <= b; z += 3) add(box(0.18, 1.1, 0.18, '#6f5434'), edge - s * 0.4, 0.55, z);
    }
    for (let z = ZN + 10; z < -20; z += 14 + rnd() * 8) { const x = edge - s * (6 + rnd() * 18); add(cyl(0.3, 0.4, 3, '#6b4526', 6), x, 1.5, z); add(cone(2.4, 6, LEAF[Math.floor(rnd() * 3)], 7), x, 5.6, z); }
  }
  // mureta de concreto na beira das ruas (dentro do bairro), aberta na ponte; nos mirantes, balaustrada
  const C = CANAL, [bw, be] = C.bays;
  const wall = (x, a, b) => { if (b - a > 0.2) { add(box(0.6, 0.95, b - a, CONC), x, 0.47, (a + b) / 2); add(box(0.75, 0.12, b - a, '#d6d0c4'), x, 1.0, (a + b) / 2); } };
  wall(X0 + 0.3, HEDGE, bw.z0); wall(X0 + 0.3, zb1, MAP - HEDGE);
  wall(X1 - 0.3, HEDGE, zb0); wall(X1 - 0.3, be.z1, MAP - HEDGE);
  // mirantes: laje sobre mão-francesa, piso de pedra, balaustrada, banco, luneta e placa
  const bay = (b, sx, zEnd, zFar) => {
    const xm = (b.x0 + b.x1) / 2, zm = (b.z0 + b.z1) / 2, wx = b.x1 - b.x0, wz = b.z1 - b.z0;
    add(box(wx, 1.2, wz, CONC), xm, -0.6, zm); add(box(wx - 0.1, 0.06, wz - 0.1, PAVE), xm, 0.03, zm);
    for (let k = 0; k < 3; k++) add(box(0.6, 6, 0.6, CONC), sx > 0 ? b.x1 - 0.5 : b.x0 + 0.5, -4, b.z0 + 1.5 + k * (wz - 3) / 2, 0, 0, sx * 0.5);
    const xo = sx > 0 ? b.x1 - 0.2 : b.x0 + 0.2;
    const bal = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      add(box(ax ? len : 0.3, 0.14, ax ? 0.3 : len, '#e2dacb'), (x0 + x1) / 2, 1.05, (z0 + z1) / 2);
      for (let t = 0; t <= len; t += 0.55) add(box(0.16, 0.95, 0.16, '#e2dacb'), x0 + (x1 - x0) * t / len, 0.5, z0 + (z1 - z0) * t / len); };
    bal(xo, b.z0, xo, b.z1); bal(b.x0, zFar, b.x1, zFar);
    const bx = sx > 0 ? b.x0 + 1.0 : b.x1 - 1.0;
    add(box(0.6, 0.1, 2.4, '#8a5a34'), bx, 0.5, zm + 1.8); add(box(0.1, 0.5, 2.4, '#8a5a34'), bx - sx * 0.3, 0.8, zm + 1.8);   // banco
    for (const d of [-1, 1]) add(box(0.5, 0.45, 0.1, '#4a4d52'), bx, 0.25, zm + 1.8 + d);
    const lx = xo - sx * 0.9;                                                                   // luneta de moedas
    add(cyl(0.08, 0.1, 1.1, RAILC, 6), lx, 0.55, zm - 2); add(box(0.4, 0.35, 0.8, '#2f6fae'), lx, 1.25, zm - 2, 0.2, 0, 0); add(cyl(0.12, 0.12, 0.4, '#1d1d1f', 8), lx, 1.3, zm - 2.5, Math.PI / 2, 0, 0);
    const tex = textTexture('MIRANTE', { width: 512, height: 128, bg: '#5a3a22', fg: '#ffe9c2' });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    p.position.set(bx, 2.2, zEnd); g.add(p); add(box(0.12, 2.1, 0.12, '#5a3a22'), bx, 1.05, zEnd);
  };
  bay(bw, 1, bw.z1 - 0.4, bw.z0); bay(be, -1, be.z0 + 0.4, be.z1);
  // ponte alta: tabuleiro, calçadinhas, mureta + guarda-corpo metálico, postes, arco de concreto com montantes e 2 pilares até o rio
  const hr = ROAD / 2;
  add(box(W + 1.2, 1.6, ROAD + 1.6, '#a7a196'), cx, -0.8, zc);
  add(box(W + 1.2, 0.04, ROAD - 0.3, '#5d6470'), cx, 0.02, zc);
  for (let x = X0 + 1.5; x < X1 - 1; x += 2.6) add(box(1.4, 0.03, 0.22, '#f2d45c'), x, 0.05, zc);
  for (const s of [-1, 1]) {
    const z = zc + s * (hr + 0.35), a = s < 0 ? bw.x1 : X0 - 0.6, b = s < 0 ? X1 + 0.6 : be.x0, L = b - a, m = (a + b) / 2;   // (abertas para os mirantes)
    add(box(L, 1.0, 0.5, CONC), m, 0.5, z);
    add(box(L, 0.1, 0.12, RAILC), m, 1.55, z); add(box(L, 0.08, 0.1, RAILC), m, 1.25, z);
    for (let x = a; x <= b + 0.01; x += 1.4) add(box(0.08, 0.6, 0.08, RAILC), x, 1.28, z);
    for (const x of [X0 + W * 0.2, cx, X0 + W * 0.8]) {
      add(cyl(0.1, 0.12, 4.6, '#3a3d44', 6), x, 3.3, z); add(box(1.0, 0.12, 0.25, '#3a3d44'), x, 5.6, z - s * 0.4);
      add(box(0.5, 0.18, 0.35, '#fff2c0'), x, 5.5, z - s * 0.8);
    }
  }
  const archY = x => -18 + 15.5 * (1 - ((x - cx) / (W / 2 - 1)) ** 2);
  for (let x = X0 - 0.5; x < X1 + 0.5; x += 1.5) {
    const y = archY(x + 0.75);
    add(box(1.6, 1.6, ROAD - 1, '#9d978b'), x + 0.75, y, zc);
    if (Math.round((x - X0) / 1.5) % 3 === 0 && y < -2.6) add(box(0.7, -1.6 - y, ROAD - 2, '#a7a196'), x + 0.75, (y - 1.6) / 2, zc);
  }
  for (const x of [cx - W * 0.2, cx + W * 0.2]) {
    const top = archY(x), h = top - RIVER_Y;
    add(box(3.2, h, ROAD - 0.6, '#9d978b'), x, RIVER_Y + h / 2, zc); add(box(4.4, 3, ROAD + 0.6, '#8f897d'), x, RIVER_Y + 1.5, zc);
  }
  // placas nas cabeceiras: quem sai da ponte para leste vê LADO LESTE; para oeste, LADO OESTE
  const sign = (text, x, z, ry) => {
    const tex = textTexture(text, { width: 512, height: 128, bg: '#2f5f8a', fg: '#ffffff' });
    const p = new THREE.Group(); p.add(at(box(0.16, 2.6, 0.16, '#6b6f76'), 0, 1.3, 0)); p.add(at(box(4.4, 1.25, 0.08, '#e9e9e9'), 0, 3.1, 0));
    for (const ry2 of [0, Math.PI]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshLambertMaterial({ map: tex })); m.position.set(0, 3.1, ry2 ? -0.05 : 0.05); m.rotation.y = ry2; p.add(m); }   // (legível dos dois lados)
    p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
  };
  sign('LADO LESTE', X1 + ROAD + 0.2, zb0 - 0.6, -Math.PI / 2);
  sign('LADO OESTE', X0 - ROAD - 0.2, zb1 + 0.6, Math.PI / 2);
  // maciço da cachoeira: paredão de pedra, degraus nas laterais, rio no alto entre margens de pedra, mata por cima
  const D = -RIVER_Y + 2;
  add(box(W + 92, TOP + D, 90, ROCK[1]), cx, (TOP - D) / 2, ZS + 45);
  for (const s of [-1, 1]) {
    add(box(40, TOP * 0.62, 110, ROCK[0]), cx + s * (W / 2 + 66), TOP * 0.31, ZS + 40);
    add(box(40, TOP * 0.3, 120, ROCK[2]), cx + s * (W / 2 + 100), TOP * 0.15, ZS + 36);
    add(box(10, TOP + 6, 90, ROCK[3]), cx + s * 17, TOP / 2 + 3, ZS + 45);                       // margens do rio lá em cima
  }
  for (let k = 0; k < 140; k++) {                                       // saliências e blocos no paredão (fora da cortina d'água)
    const x = cx + (rnd() - 0.5) * (W + 90); if (Math.abs(x - cx) < 15) continue;
    const y = RIVER_Y + rnd() * (TOP - RIVER_Y), s = 2 + rnd() * 5;
    add(box(s * 1.6, s, s, ROCK[k & 3]), x, y, ZS - s * 0.3, 0, rnd() * 0.4 - 0.2, 0);
    if (rnd() < 0.4) bush(x, y + s * 0.5, ZS - s * 0.2, 1 + rnd() * 1.4);
  }
  add(box(26, 0.4, 90, '#3d8fc4'), cx, TOP + 0.2, ZS + 45);            // rio no alto
  for (let k = 0; k < 60; k++) {                                        // mata no alto do maciço
    const x = cx + (rnd() - 0.5) * (W + 170), z = ZS + 6 + rnd() * 100, top = Math.abs(x - cx) < W / 2 + 46 ? TOP : Math.abs(x - cx) < W / 2 + 86 ? TOP * 0.62 : TOP * 0.3;
    if (Math.abs(x - cx) < 23) continue;
    add(cyl(0.4, 0.5, 3, '#6b4526', 6), x, top + 1.5, z); add(cone(3 + rnd() * 1.5, 8, LEAF[k % 3], 7), x, top + 6.5, z);
  }
  // pedras no rio e na bacia da queda
  for (let k = 0; k < 24; k++) { const z = ZN + rnd() * (ZS - ZN), x = cx + (rnd() - 0.5) * (W - 22); add(box(1.5 + rnd() * 3, 1.0, 1.5 + rnd() * 3, '#9a948a'), x, RIVER_Y + 0.3, z, 0, rnd() * 3, 0); }
  // fundo do desfiladeiro (embaixo da água)
  add(box(W, 1, ZS - ZN, '#4a5248'), cx, RIVER_Y - 1.2, (ZN + ZS) / 2);
}

function streakTex(fall) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = fall ? 'rgba(200,232,250,0.78)' : '#3f86b4'; x.fillRect(0, 0, 128, 256);
  for (let k = 0; k < (fall ? 140 : 70); k++) {
    const px = Math.random() * 128, len = fall ? 30 + Math.random() * 90 : 6 + Math.random() * 16, py = Math.random() * 256;
    x.fillStyle = fall ? `rgba(255,255,255,${0.35 + Math.random() * 0.6})` : `rgba(190,228,250,${0.25 + Math.random() * 0.45})`;
    if (fall) x.fillRect(px, py, 1 + Math.random() * 3, len); else x.fillRect(px, py, len, 1.5);
    if (py + len > 256 && fall) x.fillRect(px, py - 256, 2, len);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Partes animadas: rio correndo para o norte, cortina da cachoeira, espuma e névoa; som contínuo pela distância. */
export function createCanyonFx(audio) {
  const root = new THREE.Group(); root.name = 'canyon-fx';
  let built = false, river, fall, fall2, lip, foam = [], mist = [], t = 0, src = null;
  function build() {
    const { W, cx, ZN, ZS, TOP } = canyonGeo(), rw = W - 2 * inset(5) - 1.2, len = ZS - ZN;
    const rt = streakTex(false); rt.repeat.set(1, len / 24);
    river = new THREE.Mesh(new THREE.PlaneGeometry(rw, len), new THREE.MeshLambertMaterial({ map: rt, color: '#ffffff' }));
    river.rotation.x = -Math.PI / 2; river.position.set(cx, RIVER_Y, (ZN + ZS) / 2); root.add(river);
    const H = TOP - RIVER_Y;
    const ft = streakTex(true); ft.repeat.set(2, 3);
    fall = new THREE.Mesh(new THREE.PlaneGeometry(26, H), new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    fall.position.set(cx, RIVER_Y + H / 2, ZS - 1.2); root.add(fall);
    const ft2 = streakTex(true); ft2.repeat.set(1.3, 2);
    fall2 = new THREE.Mesh(new THREE.PlaneGeometry(22, H), new THREE.MeshBasicMaterial({ map: ft2, transparent: true, depthWrite: false, opacity: 0.8, side: THREE.DoubleSide }));
    fall2.position.set(cx, RIVER_Y + H / 2, ZS - 2.4); root.add(fall2);
    lip = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 12, 1, true, Math.PI, Math.PI / 2), new THREE.MeshBasicMaterial({ map: ft2, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    lip.rotation.z = Math.PI / 2; lip.position.set(cx, TOP - 2.0, ZS + 1); root.add(lip);
    const pt = puffTex();
    for (let k = 0; k < 26; k++) {                                       // espuma na bacia
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#ffffff', transparent: true, depthWrite: false, opacity: 0.9 }));
      m.userData = { x: cx + (Math.random() - 0.5) * 26, z: ZS - 2 - Math.random() * 12, ph: Math.random() * 6, s: 5 + Math.random() * 6 }; root.add(m); foam.push(m);
    }
    for (let k = 0; k < 18; k++) {                                       // névoa subindo
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: '#eef6ff', transparent: true, depthWrite: false, opacity: 0.4 }));
      m.userData = { x: cx + (Math.random() - 0.5) * 34, z: ZS - 4 - Math.random() * 20, u: Math.random() }; root.add(m); mist.push(m);
    }
    src = { x: cx, z: ZS - 10 };
    built = true;
  }
  return {
    object: root,
    attach(scene) { if (!built) build(); scene.add(root); },
    detach() { if (root.parent) root.parent.remove(root); if (audio && audio.waterfall) audio.waterfall(0); },
    update(dt, ear) {
      if (!built || !root.parent) return;
      t += dt;
      river.material.map.offset.y += dt * 0.35;                        // correnteza (para o norte)
      fall.material.map.offset.y += dt * 1.6; fall2.material.map.offset.y += dt * 2.3; lip.material.map.offset.x += dt * 1.2;
      for (const f of foam) { const u = f.userData, s = u.s * (0.85 + 0.2 * Math.sin(t * 3 + u.ph)); f.scale.set(s, s * 0.55, 1); f.position.set(u.x, RIVER_Y + 1 + 0.4 * Math.sin(t * 2 + u.ph), u.z); }
      for (const m of mist) { const u = m.userData; u.u = (u.u + dt * 0.06) % 1; const s = 10 + u.u * 26; m.scale.set(s, s, 1); m.position.set(u.x + Math.sin(t * 0.3 + u.z) * 3, RIVER_Y + 2 + u.u * 46, u.z - u.u * 6); m.material.opacity = 0.42 * Math.sin(u.u * Math.PI); }
      if (audio && audio.waterfall) {
        if (!ear) audio.waterfall(0);
        else { const d = Math.hypot(ear.x - src.x, ear.z - src.z); audio.waterfall(Math.min(1, Math.pow(60 / Math.max(60, d), 1.3)) * 0.92 + 0.08); }
      }
    },
  };
}
