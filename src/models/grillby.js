// Nevasca (Nível 16): o Grillby's — bar de madeira térreo, fixo num ponto do bairro (destino comercial).
// Fachada marrom com molduras alaranjadas, placa "GRILLBY'S" no alto, janelas acesas à esquerda (uma com "OPEN"),
// porta à direita com coberturinha nevada, barril entre as janelas e a porta, telhado com neve e um caminho limpo até a rua.
// Origem = centro do lote (17,2 × 17,2), frente para +Z, chão em y = 0 (como os outros lotes do Nevasca).
import * as THREE from 'three';
import { box, cyl, sphere, cone, at, textTexture } from './kit.js';

const SNOWC = '#eef3f7', SNOW2 = '#dfe7ee', WOOD = '#7a4526', WOOD2 = '#5c321b', TRIM = '#e8822c', ROOF = '#4e2c18';

function warmTexture() {                       // vidro aceso: amarelo no meio, laranja nas bordas
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 36, 4, 32, 32, 44); gr.addColorStop(0, '#fff2b0'); gr.addColorStop(0.55, '#ffc24a'); gr.addColorStop(1, '#ff8a24');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function spillTexture() {                      // luz quente derramada na neve
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,190,90,0.75)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildGrillbyLot() {
  const g = new THREE.Group(), add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { g.add(at(m, x, y, z, rx, ry, rz)); return m; };
  const W = 12, D = 8, H = 3.8, Z0 = -5, ZF = Z0 + D;                          // corpo: x −6…6, z −5…3, frente em z = 3
  // chão nevado do lote + caminho limpo da porta até a rua
  add(box(17.2, 0.12, 17.2, SNOWC), 0, 0.06, 0);
  add(box(1.9, 0.04, 15.5 - ZF, '#b7c1ca'), 3.3, 0.14, (ZF + 15.5) / 2);            // até a beira da rua (passa da borda do lote)
  for (const [x, z, s] of [[-7.2, 6.8, 1.2], [-5.4, 7.6, 0.9], [7.4, 6.4, 1.0], [-7.4, -6.6, 1.4], [7.3, -6.9, 1.3]]) { const m = sphere(s, SNOW2, 8, 5); m.scale.y = 0.45; add(m, x, 0.1, z); }
  // pinheiros atrás, nas laterais (como na referência)
  for (const [x, z, s] of [[-7.4, -3.8, 1], [7.5, -4.2, 0.9], [-6.9, -7.4, 0.8]]) {
    add(cyl(0.18 * s, 0.22 * s, 0.8 * s, '#5a3a22', 6), x, 0.5 * s, z);
    for (let k = 0; k < 3; k++) { add(cone((1.5 - k * 0.38) * s, 1.3 * s, '#2f6b4a', 8), x, (1.3 + k * 0.85) * s, z); add(cone((1.1 - k * 0.3) * s, 0.5 * s, SNOWC, 8), x, (1.75 + k * 0.85) * s, z); }
  }
  // corpo de madeira: paredes + tábuas horizontais na frente e nas laterais
  add(box(W, H, D, WOOD), 0, 0.12 + H / 2, Z0 + D / 2);
  for (let y = 0.55; y < H; y += 0.48) {
    add(box(W + 0.02, 0.06, 0.04, WOOD2), 0, 0.12 + y, ZF + 0.02);
    for (const sx of [-1, 1]) add(box(0.04, 0.06, D + 0.02, WOOD2), sx * (W / 2 + 0.02), 0.12 + y, Z0 + D / 2);
  }
  // molduras alaranjadas: cantos, rodapé, viga do alto
  for (const sx of [-1, 1]) add(box(0.35, H + 0.1, 0.35, TRIM), sx * (W / 2 - 0.05), 0.12 + H / 2, ZF - 0.05);
  add(box(W + 0.2, 0.3, 0.3, TRIM), 0, 0.12 + H - 0.1, ZF + 0.05);
  add(box(W + 0.1, 0.22, 0.22, '#3e2212'), 0, 0.23, ZF + 0.05);
  // telhado de duas águas (cumeeira paralela à frente) com bastante neve
  const RISE = 1.5, half = D / 2 + 0.6, th = Math.atan2(RISE, half), sl = Math.hypot(RISE, half), ytop = 0.12 + H, zc = Z0 + D / 2;
  for (const sg of [1, -1]) {
    add(box(W + 1.0, 0.22, sl, ROOF), 0, ytop + RISE / 2, zc + sg * half / 2, sg * th, 0, 0);
    add(box(W + 1.1, 0.34, sl + 0.05, SNOWC), 0, ytop + RISE / 2 + 0.26, zc + sg * half / 2, sg * th, 0, 0);
  }
  for (const sx of [-1, 1]) {                                                   // oitões de madeira nas pontas
    const s = new THREE.Shape(); s.moveTo(-D / 2, 0); s.lineTo(D / 2, 0); s.lineTo(0, RISE); s.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.9, side: THREE.DoubleSide }));
    add(m, sx * (W / 2 + 0.01), ytop, zc, 0, Math.PI / 2, 0);
  }
  const lip = cyl(0.26, 0.26, W + 1.2, SNOWC, 10); add(lip, 0, ytop - 0.05, ZF + 0.65, 0, 0, Math.PI / 2);   // neve pendendo do beiral da frente
  // placa GRILLBY'S: fundo escuro, letras claras alaranjadas, moldura laranja
  const signTex = textTexture("GRILLBY'S", { width: 1024, height: 160, bg: '#22130b', fg: '#ffc98a', font: 'bold 124px "Trebuchet MS", sans-serif' });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 1.5), new THREE.MeshBasicMaterial({ map: signTex }));
  add(box(10.1, 1.9, 0.25, TRIM), 0, ytop + 0.55, ZF + 0.55);
  add(sign, 0, ytop + 0.55, ZF + 0.69);
  for (const sx of [-1, 1]) add(box(0.14, 0.8, 0.14, '#3e2212'), sx * 4.2, ytop - 0.05, ZF + 0.5);
  // janelas acesas à esquerda (moldura laranja, caixilho em cruz) + "OPEN" + brilho na neve
  const warm = new THREE.MeshBasicMaterial({ map: warmTexture(), toneMapped: false });
  const spill = new THREE.MeshBasicMaterial({ map: spillTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  for (const wx of [-4.1, -1.5]) {
    add(box(2.3, 1.95, 0.18, TRIM), wx, 2.2, ZF + 0.06);
    add(new THREE.Mesh(new THREE.PlaneGeometry(1.95, 1.6), warm), wx, 2.2, ZF + 0.16);
    add(box(0.1, 1.6, 0.06, '#8a4a1c'), wx, 2.2, ZF + 0.19); add(box(1.95, 0.1, 0.06, '#8a4a1c'), wx, 2.2, ZF + 0.19);
    add(box(2.6, 0.16, 0.45, TRIM), wx, 1.18, ZF + 0.2);                          // peitoril
    add(box(2.5, 0.12, 0.4, SNOWC), wx, 1.31, ZF + 0.22);
    add(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.2), spill), wx, 0.17, ZF + 1.7, -Math.PI / 2, 0, 0);
  }
  const open = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.4), new THREE.MeshBasicMaterial({ map: textTexture('OPEN', { width: 256, height: 108, bg: '#3a160a', fg: '#ff7a2a', font: 'bold 78px "Trebuchet MS", sans-serif' }), toneMapped: false }));
  add(open, -4.55, 2.55, ZF + 0.24);
  // porta à direita: madeira escura com vidro aceso no alto, moldura laranja, maçaneta
  const DX = 3.3;
  add(box(1.9, 2.9, 0.16, TRIM), DX, 0.12 + 1.45, ZF + 0.05);
  add(box(1.5, 2.6, 0.12, '#4a2814'), DX, 0.12 + 1.3, ZF + 0.12);
  add(new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), warm), DX, 2.1, ZF + 0.19);
  add(sphere(0.08, '#f2c14a', 6, 4), DX + 0.5, 1.3, ZF + 0.22);
  add(box(1.9, 0.12, 0.6, '#9aa3ab'), DX, 0.16, ZF + 0.35);                        // degrau
  // coberturinha da porta, carregada de neve
  add(box(2.6, 0.16, 1.35, ROOF), DX, 3.3, ZF + 0.62, 0.18, 0, 0);
  add(box(2.7, 0.32, 1.4, SNOWC), DX, 3.52, ZF + 0.6, 0.18, 0, 0);
  add(cyl(0.2, 0.2, 2.7, SNOWC, 8), DX, 3.24, ZF + 1.28, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) add(box(0.1, 0.6, 0.1, '#3e2212'), DX + sx * 1.05, 3.0, ZF + 0.95);
  // barril entre as janelas e a porta, com neve em cima
  const bx = 1.15, bz = ZF + 0.75;
  add(cyl(0.55, 0.5, 1.05, '#8a5226', 14), bx, 0.12 + 0.53, bz);
  for (const y of [0.32, 0.92]) add(cyl(0.57, 0.57, 0.08, '#3a2414', 14), bx, 0.12 + y, bz);
  const cap = sphere(0.5, SNOWC, 10, 6); cap.scale.y = 0.45; add(cap, bx, 1.2, bz);
  g.traverse(o => { if (o.isMesh) { o.castShadow = o.material && !o.material.transparent && o.position.y > 0.2; o.receiveShadow = true; } });
  g.name = 'grillby';
  return g;
}
