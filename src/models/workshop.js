// Oficina do Bairro 24 (história secundária): antiga, mas cuidada por alguém que está tentando recuperá-la.
// Coordenadas locais: centro no meio, frente (porta) em z = +7, fundo em z = −7, largura x −6…6. Paredes de pedra até a
// cintura e enxaimel em cima, telhado de duas águas (some quando o jogador entra), lanterna acesa.
// Estados (setStage): 0–1 porta emperrada, bancada antiga e incompleta; 2 porta consertada (dobradiças novas);
// 3 bancada com estrutura nova e a tábua velha que não aguentou encostada de lado; 4+ bancada pronta, ferramentas em cima,
// a cadeira do morador para consertar.
import * as THREE from 'three';
import { box, cyl, sphere, at, mat } from './kit.js';

const STONE = '#8a8276', STONE2 = '#766e63', PLASTER = '#d8ccb0', TIMBER = '#5a3a22', WOOD = '#8a5a34', WOOD_OLD = '#6e5642', WOOD_NEW = '#c08a52',
  ROOF = '#8f5a3a', IRON = '#3a3c42', BRASS = '#b08a3a';

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,230,170,1)'); r.addColorStop(0.4, 'rgba(255,190,110,.4)'); r.addColorStop(1, 'rgba(255,170,80,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function buildWorkshop() {
  const root = new THREE.Group(); root.name = 'workshop';
  const add = (m, x, y, z, rx = 0, ry = 0, rz = 0, p = root) => { p.add(at(m, x, y, z, rx, ry, rz)); return m; };
  // piso de terra batida e tábuas perto da bancada
  add(box(12, 0.06, 14, '#6a5a48'), 0, 0.03, 0); add(box(9, 0.04, 4, '#7a5a3a'), -0.5, 0.07, -4.6);
  // paredes: pedra até 1,2 m, reboco com enxaimel até 3,4 m
  const wall = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    add(box(w, 1.2, d, STONE), cx, 0.6, cz); add(box(w + 0.04, 0.12, d + 0.04, STONE2), cx, 1.2, cz);
    add(box(w, 2.2, d, PLASTER), cx, 2.3, cz);
    const along = w > d, L = along ? w : d;
    for (let u = -L / 2 + 0.1; u <= L / 2; u += 1.6) add(box(along ? 0.16 : w + 0.06, 2.2, along ? d + 0.06 : 0.16, TIMBER), along ? cx + u : cx, 2.3, along ? cz : cz + u);
    add(box(w + 0.06, 0.16, d + 0.06, TIMBER), cx, 3.4, cz);
  };
  wall(-6, 6, -7, -6.6); wall(5.6, 6, -7, 7); wall(-6, -5.6, -7, 7); wall(-6, -1.25, 6.6, 7); wall(1.25, 6, 6.6, 7);
  add(box(2.5, 0.3, 0.4, TIMBER), 0, 3.0, 6.8);                                        // verga da porta
  add(box(2.5, 0.4, 0.4, PLASTER), 0, 3.35, 6.8);
  // janelinhas da frente com luz quente
  const warm = mat('#ffc874', { emissive: '#ff9a3a', emissiveIntensity: 0.8 });
  for (const x of [-3.6, 3.6]) { add(box(1.3, 0.9, 0.08, TIMBER), x, 2.2, 7.03); const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.65, 0.05), warm); add(w, x, 2.2, 7.06); }
  // placa pintada à mão
  add(box(2.2, 0.55, 0.08, '#4a3020'), 0, 3.85, 7.05); add(box(1.9, 0.08, 0.04, '#d9c08a'), 0, 3.85, 7.1);
  // telhado de duas águas (cumeeira ao longo de z); some quando o jogador entra
  const roof = new THREE.Group(); root.add(roof);
  for (const s of [-1, 1]) { const r = box(6.9, 0.22, 15, ROOF); r.position.set(s * 3.1, 4.55, 0); r.rotation.z = -s * 0.42; roof.add(r); }
  for (const z of [-7, 7]) { const tri = new THREE.Shape([new THREE.Vector2(-6, 0), new THREE.Vector2(6, 0), new THREE.Vector2(0, 2.6)]); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), mat(PLASTER)); m.position.set(0, 3.45, z - 0.15); roof.add(m); }
  add(box(0.25, 1.6, 0.25, STONE2), 4.2, 5.3, -3.5, 0, 0, 0, roof);                   // chaminé
  // lanterna acesa (dentro) e na porta
  const gt = glowTex(), glow = (x, y, z, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: '#ffd9a0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(s); sp.position.set(x, y, z); root.add(sp); };
  add(sphere(0.16, '#ffe2a0', 8, 6, { emissive: '#ffb050', emissiveIntensity: 1.6 }), 0, 3.1, -1); glow(0, 3.1, -1, 1.8);
  add(box(0.06, 0.6, 0.06, IRON), 1.6, 3.2, 7.3); add(sphere(0.14, '#ffe2a0', 8, 6, { emissive: '#ffb050', emissiveIntensity: 1.6 }), 1.6, 2.85, 7.35); glow(1.6, 2.85, 7.4, 1.4);
  const light = new THREE.PointLight('#ffc27a', 9, 13, 1.5); light.position.set(0, 3, -1); root.add(light);

  // ---- porta de madeira (dobradiça em x = −1,25): ângulo 0 fechada, + abre para dentro ----
  const doorPivot = new THREE.Group(); doorPivot.position.set(-1.25, 0, 6.8); root.add(doorPivot);
  const leaf = new THREE.Group(); doorPivot.add(leaf);
  for (let i = 0; i < 5; i++) leaf.add(at(box(0.48, 2.75, 0.1, i % 2 ? WOOD : '#7e5230'), 0.25 + i * 0.5, 1.4, 0));
  for (const y of [0.5, 2.3]) leaf.add(at(box(2.45, 0.16, 0.14, TIMBER), 1.25, y, 0));
  leaf.add(at(box(2.3, 0.14, 0.14, TIMBER), 1.25, 1.4, 0, 0, 0, 0.75));                // travessa em diagonal
  leaf.add(at(sphere(0.07, IRON, 6, 4), 2.3, 1.3, 0.1));                                 // puxador (fora)
  leaf.add(at(box(0.06, 0.26, 0.05, IRON), 2.3, 1.3, -0.1)); leaf.add(at(box(0.05, 0.05, 0.1, IRON), 2.3, 1.42, -0.07)); leaf.add(at(box(0.05, 0.05, 0.1, IRON), 2.3, 1.18, -0.07));   // alça (dentro)
  const grip = new THREE.Object3D(); grip.position.set(2.3, 1.3, -0.19); leaf.add(grip);   // onde a mão do K segura (por dentro)
  const oldHinges = new THREE.Group(), newHinges = new THREE.Group(); leaf.add(oldHinges, newHinges);
  for (const y of [0.55, 2.25]) { oldHinges.add(at(box(0.55, 0.1, 0.16, '#6b4a3a'), 0.25, y, 0, 0, 0, 0.08)); newHinges.add(at(box(0.7, 0.12, 0.17, BRASS), 0.33, y, 0)); }
  const bolt = at(box(0.35, 0.08, 0.06, BRASS), 2.2, 1.6, 0.1); newHinges.add(bolt);

  // ---- bancada (fundo) ----
  const bench = new THREE.Group(); root.add(bench);
  const oldBench = new THREE.Group(), newFrame = new THREE.Group(), topNew = new THREE.Group(), oldPlank = new THREE.Group(), lastPlank = new THREE.Group(), tools = new THREE.Group();
  bench.add(oldBench, newFrame, topNew, oldPlank, lastPlank, tools);
  for (const x of [-3.7, 2.7]) oldBench.add(at(box(0.16, 0.9, 0.16, WOOD_OLD), x, 0.45, -6.1));               // pernas antigas
  oldBench.add(at(box(6.6, 0.12, 0.12, WOOD_OLD), -0.5, 0.35, -6.1));
  for (const x of [-3.7, -0.5, 2.7]) newFrame.add(at(box(0.18, 0.92, 0.18, WOOD_NEW), x, 0.46, -5.5));         // estrutura nova (pernas da frente)
  newFrame.add(at(box(6.6, 0.14, 0.14, WOOD_NEW), -0.5, 0.82, -5.5)); newFrame.add(at(box(6.6, 0.12, 0.12, WOOD_NEW), -0.5, 0.3, -5.5));
  for (const z of [-6.35, -6.0]) topNew.add(at(box(7, 0.1, 0.34, WOOD_NEW), -0.5, 0.95, z));                   // tábuas novas
  for (const z of [-5.65]) oldPlank.add(at(box(7, 0.1, 0.34, WOOD_OLD), -0.5, 0.95, z));                       // a tábua velha da frente
  oldPlank.add(at(box(0.05, 0.11, 0.36, '#2a1a10'), 0.6, 0.955, -5.65));                                      // a rachadura
  lastPlank.add(at(box(7, 0.1, 0.36, WOOD_NEW), -0.5, 0.95, -5.65));                                          // a travessa substituta
  // ferramentas sobre a bancada (no fim) e no painel da parede (organizadas desde o começo)
  tools.add(at(box(0.5, 0.06, 0.12, IRON), -2.6, 1.04, -6.1)); tools.add(at(box(0.14, 0.05, 0.4, WOOD), -2.6, 1.03, -5.9));   // martelo
  tools.add(at(box(0.9, 0.03, 0.22, '#9aa0a8'), -1.1, 1.02, -6.2)); tools.add(at(box(0.3, 0.06, 0.12, WOOD), -0.55, 1.04, -6.2));   // serrote
  tools.add(at(box(0.36, 0.2, 0.26, '#5a3a22'), 1.4, 1.1, -6.1)); for (const dx of [-0.08, 0, 0.08]) tools.add(at(box(0.03, 0.14, 0.03, IRON), 1.4 + dx, 1.25, -6.1));   // caixinha de pregos
  add(box(3.2, 1.6, 0.08, '#6b4a30'), -1.2, 2.2, -6.55);                                                    // painel das ferramentas
  for (let i = 0; i < 6; i++) { add(box(0.06, 0.5 + (i % 3) * 0.12, 0.05, i % 2 ? IRON : WOOD), -2.5 + i * 0.5, 2.2, -6.48); add(box(0.22, 0.08, 0.06, IRON), -2.5 + i * 0.5, 2.48 + (i % 3) * 0.06, -6.47); }
  // madeira, ferragens e peças reaproveitadas (encostadas, sem entulhar)
  for (let i = 0; i < 4; i++) add(box(0.22, 2.4 - i * 0.2, 0.12, i % 2 ? WOOD : WOOD_OLD), 5.1 - i * 0.26, 1.2 - i * 0.1, -5.5, 0, 0, 0.12 + i * 0.03);
  add(box(0.6, 0.4, 0.5, '#5a3a22'), 4.6, 0.2, -3.6); for (let i = 0; i < 4; i++) add(box(0.08, 0.06, 0.3, IRON), 4.45 + i * 0.1, 0.43, -3.6);   // caixa de ferragens
  // consertados x inacabados: banquinho consertado, roda de carroça consertada encostada; cadeira sem assento, balde sem alça
  add(box(0.8, 0.08, 0.8, WOOD_NEW), 4.4, 0.55, 2.0); for (const [a, b] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) add(box(0.08, 0.55, 0.08, a < 0 && b < 0 ? WOOD_NEW : WOOD), 4.4 + a, 0.27, 2.0 + b);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 6, 16), mat(WOOD)); add(wheel, 5.5, 0.75, 4.2, 0, Math.PI / 2, 0);
  for (let k = 0; k < 4; k++) add(box(0.05, 1.3, 0.05, k % 2 ? WOOD_NEW : WOOD), 5.5, 0.75, 4.2, k * Math.PI / 4, 0, 0);
  add(box(0.7, 0.06, 0.7, WOOD_OLD), -4.6, 0.6, 3.0, 0, 0, 0.3); for (const [a, b] of [[-0.28, -0.28], [0.28, -0.28], [0.28, 0.28]]) add(box(0.07, 0.6, 0.07, WOOD_OLD), -4.6 + a, 0.3, 3.0 + b);
  add(cyl(0.3, 0.24, 0.45, WOOD_OLD, 10), -4.8, 0.23, 4.6);
  // a cadeira do morador (aparece no fim): cadeira com uma perna solta
  const chair = new THREE.Group(); chair.position.set(1.2, 0, -3.3); chair.rotation.y = 0.5; root.add(chair);
  chair.add(at(box(0.7, 0.08, 0.7, '#7a4a2a'), 0, 0.55, 0)); chair.add(at(box(0.7, 0.8, 0.08, '#7a4a2a'), 0, 1.0, -0.31));
  for (const [a, b, l] of [[-0.28, -0.28, 0.55], [0.28, -0.28, 0.55], [-0.28, 0.28, 0.55]]) chair.add(at(box(0.07, l, 0.07, '#5a3a22'), a, l / 2, b));
  chair.add(at(box(0.07, 0.55, 0.07, '#5a3a22'), 0.55, 0.06, 0.4, 0, 0, Math.PI / 2));   // a perna que soltou, no chão

  // celular do K, deitado sobre a bancada (a tela acende numa chamada; sem som)
  const phone = new THREE.Group(); phone.position.set(0.5, 1.0, -5.95); phone.rotation.y = 0.35; root.add(phone);
  phone.add(at(box(0.17, 0.025, 0.32, '#1b1d22'), 0, 0.013, 0));
  const scr = document.createElement('canvas'); scr.width = 64; scr.height = 128;
  const paintScreen = on => { const g = scr.getContext('2d'); g.fillStyle = on ? '#1e3a5c' : '#08090b'; g.fillRect(0, 0, 64, 128);
    if (on) { g.fillStyle = '#eaf4ff'; g.fillRect(14, 20, 36, 4); g.fillRect(20, 30, 24, 3); g.beginPath(); g.arc(32, 62, 12, 0, Math.PI * 2); g.fillStyle = '#9ec6ff'; g.fill();
      g.beginPath(); g.arc(18, 104, 9, 0, Math.PI * 2); g.fillStyle = '#e24a4a'; g.fill(); g.beginPath(); g.arc(46, 104, 9, 0, Math.PI * 2); g.fillStyle = '#3ccf6a'; g.fill(); } };
  paintScreen(false);
  const scrTex = new THREE.CanvasTexture(scr), scrMat = new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.29), scrMat); screen.rotation.x = -Math.PI / 2; screen.position.y = 0.027; phone.add(screen);
  const phoneGlow = new THREE.PointLight('#8fc0ff', 0, 1.6, 2); phoneGlow.position.y = 0.2; phone.add(phoneGlow);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const api = {
    root, roof, doorPivot, grip, chair, newHinges, oldHinges, phone,
    /** Tela do celular: acesa com a chamada recebida (pisca de leve) ou apagada. */
    setPhone(on, t = 0) { const k = on ? 0.75 + 0.25 * Math.sin(t * 6) : 0; paintScreen(on); scrTex.needsUpdate = true; scrMat.color.setScalar(on ? k : 1); phoneGlow.intensity = on ? 0.6 * k : 0; },
    /** Mostra o que já foi feito (não volta ao estado inicial). */
    setStage(n) {
      oldHinges.visible = n < 2; newHinges.visible = n >= 2;
      doorPivot.rotation.y = n < 2 ? 0.9 : 1.45;                                    // emperrada entreaberta / consertada e aberta
      oldBench.visible = n < 3; newFrame.visible = n >= 3; topNew.visible = n >= 3;
      oldPlank.visible = n < 3 || n === 3; oldPlank.position.set(n === 3 ? 4.0 : 0, 0, 0); oldPlank.rotation.set(0, 0, 0);
      if (n === 3) { oldPlank.position.set(5.8, -0.5, 1.2); oldPlank.rotation.set(0, Math.PI / 2, 1.3); }   // encostada na parede, de lado
      if (n < 3) { topNew.visible = true; topNew.children.forEach((c, i) => { c.material = c.material; }); }
      lastPlank.visible = n >= 4; tools.visible = n >= 4; chair.visible = false;   // (sem o pedido da cadeira)
      // antes do conserto da bancada, o tampo é o antigo (as "novas" tábuas aparecem com a cor velha)
      for (const c of topNew.children) c.material = n >= 3 ? mat(WOOD_NEW) : mat(WOOD_OLD);
    },
    /** Pernas e tábuas novas surgindo (0..1) durante a montagem. */
    growFrame(k) { newFrame.visible = true; newFrame.scale.set(1, Math.max(0.01, k), 1); },
    crack(k) { oldPlank.visible = true; oldPlank.position.set(0, -0.12 * k, 0); oldPlank.rotation.set(0, 0, 0.05 * k); },
    placeLast(k) { lastPlank.visible = true; lastPlank.position.y = 0.6 * (1 - k); },
    showTools(on) { tools.visible = on; },
    world: o => root.localToWorld(o),
  };
  api.setStage(0);
  return api;
}
