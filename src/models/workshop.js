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
  const warm = mat('#ffc874', { emissive: '#ff9a3a', emissiveIntensity: 0.8 }), wins = [], lamps = [];
  for (const x of [-3.6, 3.6]) { add(box(1.3, 0.9, 0.08, TIMBER), x, 2.2, 7.03); const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.65, 0.05), warm); add(w, x, 2.2, 7.06); wins.push(w); }
  // placa pintada à mão
  add(box(2.2, 0.55, 0.08, '#4a3020'), 0, 3.85, 7.05); add(box(1.9, 0.08, 0.04, '#d9c08a'), 0, 3.85, 7.1);
  // telhado de duas águas (cumeeira ao longo de z); some quando o jogador entra
  const roof = new THREE.Group(); root.add(roof);
  for (const s of [-1, 1]) { const r = box(6.9, 0.22, 15, ROOF); r.position.set(s * 3.1, 4.55, 0); r.rotation.z = -s * 0.42; roof.add(r); }
  for (const z of [-7, 7]) { const tri = new THREE.Shape([new THREE.Vector2(-6, 0), new THREE.Vector2(6, 0), new THREE.Vector2(0, 2.6)]); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.3, bevelEnabled: false }), mat(PLASTER)); m.position.set(0, 3.45, z - 0.15); roof.add(m); }
  add(box(0.25, 1.6, 0.25, STONE2), 4.2, 5.3, -3.5, 0, 0, 0, roof);                   // chaminé
  // lanterna acesa (dentro) e na porta
  const gt = glowTex(), glow = (x, y, z, s) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gt, color: '#ffd9a0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); sp.scale.setScalar(s); sp.position.set(x, y, z); root.add(sp); lamps.push(sp); };
  lamps.push(add(sphere(0.16, '#ffe2a0', 8, 6, { emissive: '#ffb050', emissiveIntensity: 1.6 }), 0, 3.1, -1)); glow(0, 3.1, -1, 1.8);
  add(box(0.06, 0.6, 0.06, IRON), 1.6, 3.2, 7.3); lamps.push(add(sphere(0.14, '#ffe2a0', 8, 6, { emissive: '#ffb050', emissiveIntensity: 1.6 }), 1.6, 2.85, 7.35)); glow(1.6, 2.85, 7.4, 1.4);
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
    root, roof, doorPivot, grip, chair, newHinges, oldHinges, phone, bench, ruinGroup: null,
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
    /** Temporal (história): estragos localizados que continuam acontecendo. t = segundos da cena (ou Infinity = estado final). */
    ruin(t) { if (!R) R = buildRuin(); R.update(t); },
    get ruined() { return !!R; },
  };
  // ---------- estragos do temporal ----------
  // Já no 1º quadro: metade do telhado sem cobertura (caibros e terças à mostra), um painel desabado para dentro
  // (ponta no chão), cumeeira partida e cedendo, oitões quebrados, reboco caído na fachada, entulho e telhas espalhadas
  // em volta e lá dentro. Durante a cena (o K olhando): um painel que restava cede (3 s), telhas se soltam e escorregam
  // pelos lados, o vento arranca outro painel (6,3 s) e um caibro despenca (8,4 s). Nada vai para a frente (onde o K está).
  let R = null;
  function buildRuin() {
    roof.visible = false; light.intensity = 0; for (const l of lamps) l.visible = false;
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 1 });
    for (const w of wins) w.material = dark;
    const g = new THREE.Group(); root.add(g); api.ruinGroup = g;
    const rm = mat(ROOF), pl = mat(PLASTER), tm = mat(TIMBER), raw = mat('#4a3f35'), st2 = mat(STONE2);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // oitões quebrados (a ponta caiu) e chaminé torta
    for (const [z, pts] of [[-7, [[-6, 0], [6, 0], [4.2, 0.35], [2.1, 1.05], [0.6, 0.55], [-0.9, 1.25], [-3.4, 0.7]]], [7, [[-6, 0], [6, 0], [4.6, 0.2], [2.4, 0.55], [-1.2, 0.3], [-3.6, 0.85]]]]) {   // oitões partidos: só os cacos de baixo
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.3, bevelEnabled: false }), pl); m.position.set(0, 3.45, z - 0.15); g.add(m);
    }
    g.add(at(box(0.25, 1.1, 0.25, STONE2), 4.2, 4.9, -3.5, 0, 0, 0.35));
    // cumeeira partida: a metade de trás ficou; a da frente cedeu e pende
    g.add(at(box(0.2, 0.2, 7.2, TIMBER), 0, 5.6, -3.5));
    const ridge = at(box(0.2, 0.2, 7.0, TIMBER), 0, 5.05, 3.4, -0.17, 0.04, 0.05); g.add(ridge);
    // terças (ao longo da oficina) e caibros: o esqueleto do telhado à mostra
    for (const s of [-1, 1]) for (const f of [0.3, 0.62]) { const x = s * 6 * (1 - f), y = 3.4 + 2.2 * f; g.add(at(box(0.16, 0.16, 14.2, TIMBER), x, y, f > 0.5 && s > 0 ? -1.8 : 0, 0, 0, 0)); }
    for (const z of [-6.8, -4.2, -1.4, 1.4, 4.2, 6.8]) for (const s of [-1, 1]) {
      if (s > 0 && z === 1.4) continue;                                                  // (esse cai durante a cena)
      const broken = (s > 0 && z === 4.2) || (s < 0 && z === -4.2);
      g.add(at(box(0.14, 0.14, broken ? 4.2 : 7.3, TIMBER), s * (broken ? 4.4 : 3.0), broken ? 3.9 : 4.6, z, 0, Math.PI / 2, -s * (broken ? 0.75 : 0.42)));
    }
    const beam = new THREE.Group(); beam.position.set(5.9, 3.38, 1.4); g.add(beam);       // caibro que despenca (pivô no beiral direito)
    beam.add(at(box(7.3, 0.14, 0.14, TIMBER), -3.4, 0, 0)); beam.rotation.z = 0.42;
    // painéis do telhado (5 por água), presos no beiral: o pivô gira e a ponta de dentro cai
    // água esquerda (s −1): 0 foi, 1 fica, 2 foi, 3 (o vento leva, 6,3 s), 4 foi · direita (s +1): 5 fica, 6 cede (3 s),
    // 7 foi, 8 desabou (ponta no chão), 9 foi
    const panels = [];
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
      const id = (s < 0 ? 0 : 5) + i, z = -5.6 + i * 2.8;
      if ([0, 2, 4, 7, 9].includes(id)) continue;
      const pv = new THREE.Group(); pv.position.set(s * 6.15, 3.35, z); g.add(pv);
      const m = box(6.9, 0.22, 2.7, ROOF); m.material = rm; m.position.set(-s * 3.45, 0, 0); pv.add(m);
      const kind = id === 8 ? 'down' : id === 6 ? 'cede' : id === 3 ? 'wind' : 'shake';
      pv.rotation.z = kind === 'down' ? s * 0.46 : -s * 0.42;
      panels.push({ pv, m, s, id, kind, p0: pv.position.clone() });
    }
    // telhas que ainda vão se soltar (escorregam pelas laterais e caem do lado de fora, nunca na frente)
    const loose = [];
    for (const [s, z, t0] of [[1, -5.4, 1.2], [-1, -1.6, 2.0], [1, -4.9, 3.6], [-1, -6.2, 4.6], [1, -6.0, 5.4], [-1, -1.0, 7.2], [1, -5.2, 7.9], [-1, -2.2, 9.1], [1, -6.3, 10.4], [-1, -6.0, 11.4]]) {
      const m = box(0.6, 0.07, 0.42, ROOF); m.material = rm; m.position.set(s * 4.2, 4.15, z); m.rotation.set(0, 0, -s * 0.42); g.add(m);
      loose.push({ m, s, t0, p0: m.position.clone(), vx: s * (1.6 + rnd()), spin: (rnd() - 0.5) * 9 });
    }
    // no chão: telhas, tábuas e caibros espalhados em volta e lá dentro (fora do caminho do K, na frente)
    const tileGeo = new THREE.BoxGeometry(0.6, 0.06, 0.42);
    const outside = 46, inside = 22, tiles = new THREE.InstancedMesh(tileGeo, rm, outside + inside), _o = new THREE.Object3D();
    for (let n = 0; n < outside + inside; n++) {
      let x, z;
      if (n < outside) { const side = n % 3; if (side === 0) { x = 6.4 + rnd() * 3.2; z = -8 + rnd() * 15; } else if (side === 1) { x = -6.4 - rnd() * 3.2; z = -8 + rnd() * 15; } else { x = -5.8 + rnd() * 4.6; z = 7.3 + rnd() * 2.6; } }
      else { x = -5 + rnd() * 10; z = -5.5 + rnd() * 11; }
      _o.position.set(x, 0.04 + rnd() * 0.05, z); _o.rotation.set((rnd() - 0.5) * 0.4, rnd() * 6.3, (rnd() - 0.5) * 0.4); _o.scale.setScalar(0.6 + rnd() * 0.7); _o.updateMatrix(); tiles.setMatrixAt(n, _o.matrix);
    }
    g.add(tiles);
    for (const [x, z, ry, rz] of [[-2.4, -1.6, 0.4, 0.15], [2.6, 3.4, -0.7, 0.2], [-3.4, 8.3, 1.1, 0.05], [7.6, -2.0, 0.3, 0.1], [-7.8, 3.6, -0.5, 0.12]]) { const d = box(2.6, 0.16, 1.4, ROOF); d.material = rm; d.position.set(x, 0.2, z); d.rotation.set(0.1, ry, rz); g.add(d); }
    for (const [x, z, ry, rz] of [[-4.4, 8.9, 0.6, 0], [-3.6, 10.0, -0.3, 0], [1.0, -2.6, 1.3, 0], [7.4, 1.5, 0.2, 0.3], [-7.2, -4.0, 1.4, 0.2], [3.0, -4.8, 0.9, 0.4]]) g.add(at(box(0.16, 0.12, 2.6, TIMBER), x, 0.1, z, rz, ry, 0));
    // fachada: reboco caído (manchas escuras com tijolo à mostra), viga tombada encostada, janela sem veneziana, entulho na quina
    for (const [x, y, w, h] of [[-3.6, 2.6, 1.6, 1.0], [3.4, 3.0, 1.1, 0.7], [-1.9, 1.7, 0.7, 0.5]]) { const d = box(w, h, 0.05, '#4a3f35'); d.material = raw; d.position.set(x, y, 7.05); g.add(d); }
    g.add(at(box(0.22, 4.4, 0.22, TIMBER), -4.6, 1.9, 7.5, -0.12, 0, 0.62));
    g.add(at(box(0.9, 0.06, 1.2, WOOD_OLD), 4.6, 0.05, 8.1, 0, 0.5, 0));
    for (let n = 0; n < 12; n++) { const r = box(0.3 + rnd() * 0.4, 0.2 + rnd() * 0.3, 0.3 + rnd() * 0.4, STONE2); r.material = st2; r.position.set(-5.8 + rnd() * 1.4, 0.12 + rnd() * 0.25, 6.4 + rnd() * 1.6); r.rotation.set(rnd(), rnd(), rnd()); g.add(r); }
    // tábuas encostadas que tombam (10 s)
    const lean = new THREE.Group(); lean.position.set(-5.2, 0, 1.0); g.add(lean); lean.add(at(box(0.22, 2.6, 0.12, WOOD_NEW), 0, 1.3, 0)); lean.rotation.z = -0.18;
    const st = { panels, loose, beam, ridge, lean, door: doorPivot, leaf: doorPivot.children[0] };
    const e3 = u => u * u * u;
    R = {
      update(t) {
        const T = Number.isFinite(t) ? t : 99;
        st.door.rotation.y = 0.75 + 0.18 * Math.sin(T * 1.7) * Math.sin(T * 0.6 + 1);   // presa só pela dobradiça de baixo, batendo
        st.leaf.rotation.z = -0.07; st.leaf.position.y = -0.05;
        st.ridge.rotation.x = -0.17 - 0.015 * Math.sin(T * 2.3) - (T > 3 ? 0.06 * Math.min(1, (T - 3) / 0.8) : 0);   // cede mais quando o painel cai
        for (const p of st.panels) {
          const s = p.s;
          if (p.kind === 'shake') p.pv.rotation.z = -s * 0.42 + 0.012 * Math.sin(T * 6.5 + p.id);
          else if (p.kind === 'down') p.pv.rotation.z = s * 0.46 + 0.01 * Math.sin(T * 4 + 1);
          else if (p.kind === 'cede') {                                                  // treme, cede no beiral e desaba para dentro
            const u = T - 3.0;
            p.pv.rotation.z = u <= 0 ? -s * 0.42 + 0.03 * Math.sin(T * 9) : -s * 0.42 + s * 0.88 * Math.min(1, e3(Math.min(1, u / 0.75)) * 1.0);
          } else if (p.kind === 'wind') {                                                // o vento arranca e leva para o lado (oeste), longe do K
            const u = T - 6.3;
            if (u <= 0) p.pv.rotation.z = -s * 0.42 + 0.04 * Math.sin(T * 8);
            else { p.pv.position.set(p.p0.x - 5.5 * u, p.p0.y + 3.0 * u - 1.6 * u * u, p.p0.z - 1.5 * u); p.pv.rotation.set(1.8 * u, 0.9 * u, -s * 0.42 + 1.4 * u); if (u > 3.2) p.pv.visible = false; }
          }
        }
        const b = T - 8.4;                                                               // o caibro despenca para dentro
        st.beam.rotation.z = b <= 0 ? 0.42 + 0.02 * Math.sin(T * 11) : 0.42 + 0.95 * Math.min(1, e3(Math.min(1, b / 0.6)));
        for (const L of st.loose) {                                                      // telhas: escorregam pela água e caem do lado de fora
          const u = T - L.t0; if (u <= 0) continue;
          const slide = Math.min(u, 0.5), fly = Math.max(0, u - 0.5);
          const x = L.p0.x + L.s * 2.0 * (slide / 0.5) + L.vx * fly, y = Math.max(0.05, L.p0.y - 1.0 * (slide / 0.5) - 4.9 * fly * fly);
          L.m.position.set(x, y, L.p0.z); if (y > 0.05) L.m.rotation.set(L.spin * fly, 0, -L.s * 0.42 + L.spin * fly * 0.5);
        }
        st.lean.rotation.z = T < 10 ? -0.18 : -0.18 - Math.min(1.35, (T - 10) * (T - 10) * 6);
        st.lean.position.y = T < 10 ? 0 : Math.min(1, (T - 10) * 2) * 0.1;
        const v = Math.max(0, Math.min(1, (T - 7.6) / 0.6));                              // a travessa nova escorrega; as ferramentas se espalham
        lastPlank.position.set(0, -0.85 * v * v, 0.55 * v); lastPlank.rotation.set(-0.5 * v, 0, 0.12 * v);
        tools.position.set(0.2 * v, -0.9 * v * v, 0.5 * v); tools.rotation.set(0, 0.3 * v, 0.6 * v);
      },
    };
    return R;
  }
  api.setStage(0);
  return api;
}
