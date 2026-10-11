// Veneza (Nível 12): ilha de pedra por quadra com uma fileira de casas estreitas (a do meio é o destino da entrega),
// cais na frente virado para o canal, degraus, doca de madeira e postes de amarrar barcos. Também a lancha de entregas
// (aparência fixa, cores da van padrão) e os barcos que circulam devagar pelos canais.
import * as THREE from 'three';
import { box, cyl, cone, sphere, at, mat, bakeStatic, dynamic, textTexture } from './kit.js';
import { LOT } from '../layout.js';
import { VEN_FACADE, VEN_SHUTTER, VEN_AWNING } from '../data.js';

const QUAY = '#8d877c', TILE = '#b5532f', WOOD = '#7a5434', WIN = '#2e3a46', FLOOR_H = 3.0;
// chão de pedregulho (textura desenhada uma vez, repetida a cada 4 unidades)
let COBBLE = null;
function cobbleMat() {
  if (COBBLE) return COBBLE;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#a99d88'; x.fillRect(0, 0, 256, 256);
  let k = 3; const r = () => (k = (k * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) {
    const cx = r() * 256, cy = r() * 256, rr = 7 + r() * 7, t = 196 + r() * 34 | 0;
    x.fillStyle = `rgb(${t},${t - 8 | 0},${t - 22 | 0})`;
    for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { x.beginPath(); x.ellipse(cx + dx, cy + dy, rr, rr * (0.75 + r() * 0.25), r() * 3, 0, Math.PI * 2); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return (COBBLE = new THREE.MeshLambertMaterial({ map: t }));
}
/** Piso de pedregulho w × d, centro (x, z), na altura y. */
export function cobble(w, d, x, y, z) {
  const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 4, uv.getY(i) * d / 4);
  const m = new THREE.Mesh(g, cobbleMat()); m.position.set(x, y, z); m.receiveShadow = true; return m;
}
export const VEN_X0 = 1.6, VEN_X1 = 15.6, VEN_Z0 = 2.2, VEN_Z1 = 11.8;   // fileira de casas (as vielas ficam nas laterais e atrás)

/** Uma fachada estreita: largura w, andares n, frente em z = VEN_Z1. */
function narrow(root, x0, w, n, color, sh, opts = {}) {
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  const H = n * FLOOR_H, cx = x0 + w / 2, D = VEN_Z1 - VEN_Z0, cz = (VEN_Z0 + VEN_Z1) / 2;
  add(box(w, H, D, color), cx, 0.15 + H / 2, cz);
  const ww = w - 0.04;                                                                // (não encosta na vizinha: nada de faces sobrepostas)
  add(box(ww, 0.25, D + 0.3, '#e8dfcc'), cx, 0.15 + H + 0.1, cz);                    // cornija
  for (const s of [-1, 1]) add(box(ww, 0.22, D / 2 + 0.6, TILE), cx, 0.15 + H + 0.6, cz + s * D / 4, s * 0.32, 0, 0);   // telhado de telhas
  add(box(ww, 0.3, 0.4, '#9a4127'), cx, 0.15 + H + 1.1, cz);
  if (opts.chimney) add(box(0.6, 1.4, 0.6, '#b8a58a'), cx + w * 0.25, 0.15 + H + 1.2, cz - 1.5);
  const cols = w > 4.6 ? [cx - w * 0.26, cx + w * 0.26] : [cx];
  for (let f = 0; f < n; f++) {
    const y = 0.15 + f * FLOOR_H + 1.5;
    for (const x of cols) {
      if (f === 0 && Math.abs(x - cx) < 0.6 && opts.door) continue;
      if (opts.arch) { add(box(0.9, 1.1, 0.08, WIN), x, y - 0.1, VEN_Z1 + 0.03); add(cyl(0.45, 0.45, 0.08, WIN, 10), x, y + 0.45, VEN_Z1 + 0.03, Math.PI / 2, 0, 0); }
      else add(box(0.9, 1.4, 0.08, WIN), x, y, VEN_Z1 + 0.03);
      if (sh) for (const s of [-1, 1]) add(box(0.42, 1.45, 0.1, sh), x + s * 0.68, y, VEN_Z1 + 0.06);   // persianas
    }
  }
  return H;
}

export function buildVeniceLot(h) {
  const root = new THREE.Group();
  root.name = 'ven:' + h.name;
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => root.add(at(m, x, y, z, rx, ry, rz));
  // ilha: base de pedra com borda de cais
  add(box(LOT + 0.6, 0.9, LOT + 0.6, QUAY), LOT / 2, -0.3, LOT / 2);              // (os pedregulhos ficam por cima: terrain.js)
  // vizinhas (neutras, mais baixas) e o destino no meio, colado nelas
  const W = 5.4, xD = (LOT - W) / 2;
  narrow(root, VEN_X0, xD - VEN_X0, 2, '#d8cfc0', '#8a7f72', { chimney: true });
  narrow(root, xD + W, VEN_X1 - xD - W, 2 + (h.index % 2), '#cbbfae', null, {});
  const col = VEN_FACADE[h.fac], sh = VEN_SHUTTER[h.sh];
  const H = narrow(root, xD, W, h.floors, col, sh, { arch: h.arch, door: true });
  const cx = LOT / 2, fz = VEN_Z1;
  // porta em arco, degraus de pedra até o cais, doca de madeira e postes de amarrar
  add(box(1.3, 2.1, 0.1, '#5b3a22'), cx, 1.2, fz + 0.06); add(cyl(0.65, 0.65, 0.1, '#5b3a22', 10), cx, 2.25, fz + 0.06, Math.PI / 2, 0, 0);
  for (let k = 0; k < 3; k++) add(box(2.4, 0.15, 0.6, '#e2dacb'), cx, 0.22 - k * 0.0, fz + 0.4 + k * 0.6);
  add(box(3.0, 0.18, 2.6, WOOD), cx, 0.12, LOT + 1.0);                                         // doca (sobre a água)
  for (const s of [-1, 1]) add(box(0.25, 1.3, 0.25, '#5a3c22'), cx + s * 1.4, 0.3, LOT + 2.2);
  if (h.items.includes('poles')) for (const s of [-1, 1]) {                                     // postes listrados (bricole)
    for (let k = 0; k < 5; k++) add(cyl(0.18, 0.18, 0.6, k % 2 ? '#ffffff' : '#c8402f', 8), cx + s * 2.3, 0.3 + k * 0.6, LOT + 2.6);
    add(cone(0.22, 0.4, '#c8402f', 8), cx + s * 2.3, 3.3, LOT + 2.6);
  }
  if (h.items.includes('lamp')) {                                                               // lanterna na porta
    add(box(0.08, 0.08, 0.5, '#2b2b2b'), cx + 0.95, 2.6, fz + 0.3);
    add(box(0.32, 0.45, 0.32, '#2b2b2b'), cx + 0.95, 2.35, fz + 0.55);
    add(box(0.22, 0.3, 0.22, '#ffd36b'), cx + 0.95, 2.35, fz + 0.55);
  }
  if (h.awning) {                                                                               // toldo sobre a porta
    const c = VEN_AWNING[h.awning];
    add(box(3.0, 0.12, 1.4, c), cx, 3.0, fz + 0.65, 0.35, 0, 0);
    add(box(3.0, 0.3, 0.06, c), cx, 2.7, fz + 1.3);
  }
  // sacada no 2º andar (todas têm): vasos e flores dependem da casa
  const yB = 0.15 + FLOOR_H + 0.35;
  add(box(W - 1.0, 0.15, 0.9, '#e8dfcc'), cx, yB, fz + 0.45);
  for (let x = cx - W / 2 + 0.6; x <= cx + W / 2 - 0.6; x += 0.42) add(box(0.06, 0.8, 0.06, '#2b2b2b'), x, yB + 0.45, fz + 0.86);
  add(box(W - 1.0, 0.06, 0.06, '#2b2b2b'), cx, yB + 0.85, fz + 0.86);
  if (h.items.includes('pots')) for (const s of [-1, 1]) {
    add(cyl(0.28, 0.2, 0.45, '#b5532f', 8), cx + s * 1.3, yB + 0.3, fz + 0.5);
    add(sphere(0.38, '#3f8f3a', 7, 5), cx + s * 1.3, yB + 0.75, fz + 0.5);
  }
  if (h.items.includes('flowers')) {                                                          // floreiras: nas janelas acima da sacada
    const spots = [];
    for (let f = 2; f < h.floors; f++) for (const sx of [-1, 1]) spots.push([cx + sx * W * 0.26, 0.15 + f * FLOOR_H + 0.7, fz + 0.25, 1.1]);
    if (h.floors === 2) for (const sx of [-1, 1]) spots.push([cx + sx * 0.5, yB + 0.95, fz + 0.86, 0.7]);   // casa baixa: sobre o parapeito da sacada
    spots.forEach(([x, y, z, w], k) => {
      add(box(w, 0.25, 0.35, '#7a5434'), x, y, z);
      for (const dx of w > 1 ? [-0.35, 0, 0.35] : [-0.18, 0.18]) add(sphere(0.17, ['#e8467a', '#ffd84a', '#ffffff'][(k + (dx > 0 ? 1 : 0) + (dx === 0 ? 2 : 0)) % 3], 6, 4), x + dx, y + 0.2, z + 0.05);
    });
  }
  if (h.items.includes('laundry')) {                                                           // varal com roupas entre as janelas do alto
    const y = 0.15 + (h.floors - 1) * FLOOR_H + 2.6;
    add(box(W - 0.4, 0.03, 0.03, '#eeeeee'), cx, y, fz + 0.5);
    ['#ffffff', '#3a78d4', '#e85c4a', '#efbf2a'].forEach((c, k) => add(box(0.6, 0.75, 0.04, c), cx - 1.6 + k * 1.05, y - 0.4, fz + 0.5));
  }
  root.userData.height = H;
  return bakeStatic(root);
}

/** Lancha de entregas (aparência fixa): casco laranja baixo com proa, faixa creme, cabine com vidros azul-escuros,
 *  caixas presas na área de carga e o ADRESS nas laterais. Local: frente = +X (como a van). */
export function buildBoat() {
  const g = new THREE.Group(); g.name = 'boat';
  const ORANGE = '#f07a1d', CREAM = '#fff3d6', GLASS = '#1f3550', DARK = '#3a2a1a';
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => g.add(at(m, x, y, z, rx, ry, rz));
  add(box(4.4, 0.9, 2.4, ORANGE), -0.4, 0.15, 0);                                            // casco
  const bow = new THREE.Shape(); bow.moveTo(0, -1.2); bow.lineTo(1.9, 0); bow.lineTo(0, 1.2); bow.lineTo(0, -1.2);
  const bg = new THREE.ExtrudeGeometry(bow, { depth: 0.9, bevelEnabled: false }); bg.rotateX(-Math.PI / 2); bg.translate(1.8, -0.3, 0);
  g.add(new THREE.Mesh(bg, mat(ORANGE)));
  add(box(4.5, 0.18, 2.46, CREAM), -0.4, 0.62, 0);                                           // faixa creme
  const bs = new THREE.Shape(); bs.moveTo(0, -1.23); bs.lineTo(1.95, 0); bs.lineTo(0, 1.23); bs.lineTo(0, -1.23);
  const bsg = new THREE.ExtrudeGeometry(bs, { depth: 0.18, bevelEnabled: false }); bsg.rotateX(-Math.PI / 2); bsg.translate(1.8, 0.53, 0);
  g.add(new THREE.Mesh(bsg, mat(CREAM)));
  add(box(5.6, 0.06, 2.2, '#d9c7a4'), -0.1, 0.62, 0);                                        // convés
  add(box(1.5, 1.2, 1.9, CREAM), 0.6, 1.25, 0);                                               // cabine
  add(box(0.06, 0.6, 1.6, GLASS), 1.37, 1.45, 0);
  for (const s of [-1, 1]) add(box(1.1, 0.5, 0.06, GLASS), 0.6, 1.5, s * 0.96);
  add(box(1.8, 0.14, 2.2, ORANGE), 0.6, 1.92, 0);
  [[-1.4, -0.45, 0.9], [-1.4, 0.5, 0.75], [-2.2, 0, 0.8], [-1.75, 0.05, 0.6]].forEach(([x, z, sz], k) => {   // caixas de entrega
    add(box(sz, sz, sz, k % 2 ? '#c9925a' : '#b8804a'), x, 0.65 + sz / 2 + (k === 3 ? 0.8 : 0), z);
    add(box(sz + 0.02, 0.1, 0.1, '#f2d9a8'), x, 0.65 + sz + (k === 3 ? 0.8 : 0) - 0.02, z);
  });
  add(box(1.9, 0.08, 0.06, DARK), -1.75, 1.5, 1.0); add(box(1.9, 0.08, 0.06, DARK), -1.75, 1.5, -1.0);   // amarras
  const tex = textTexture('ADRESS', { width: 512, height: 128, bg: '#f07a1d', fg: '#fff3d6' });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshLambertMaterial({ map: tex }));
    m.position.set(-0.9, 0.2, s * 1.215); m.rotation.y = s > 0 ? 0 : Math.PI; g.add(m);
    add(box(0.5, 0.5, 0.04, '#c9925a'), 1.0, 0.2, s * 1.215);                                  // símbolo da encomenda
    add(box(0.5, 0.08, 0.05, CREAM), 1.0, 0.2, s * 1.22);
  }
  // rastro na água (some com a lancha parada)
  const wake = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  wake.rotation.x = -Math.PI / 2; wake.position.set(-4.6, 0.1, 0); wake.name = 'wake'; g.add(wake);
  g.userData.wake = wake;
  return g;
}

/** Barco que circula (gôndola ou barquinho a motor). Local: frente = +X. */
export function buildBoatNpc(k) {
  const g = new THREE.Group();
  if (k % 2 === 0) {                                                                          // gôndola
    g.add(at(box(6.0, 0.6, 1.3, '#1d1d22'), 0, 0.1, 0));
    g.add(at(box(1.0, 1.0, 0.3, '#1d1d22'), 3.1, 0.6, 0, 0, 0, 0.6));
    g.add(at(box(0.8, 0.3, 1.0, '#8a2a2a'), -0.5, 0.5, 0));
    g.add(at(box(0.4, 1.4, 0.4, '#f2f2f2'), -2.3, 1.1, 0)); g.add(at(box(0.3, 0.3, 0.3, '#2b2b2b'), -2.3, 1.95, 0));
    g.add(at(box(0.08, 0.08, 3.0, '#7a5434'), -2.3, 1.4, 0.5, 0.9, 0, 0));
  } else {                                                                                    // barquinho a motor
    g.add(at(box(4.4, 0.7, 2.0, '#e8e2d4'), 0, 0.1, 0));
    g.add(at(box(1.2, 0.9, 1.6, '#3a6688'), 0.3, 0.9, 0));
    g.add(at(box(2.0, 0.6, 1.6, '#8a5a36'), -1.2, 0.6, 0));
  }
  return bakeStatic(g);
}
