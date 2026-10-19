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
import { ROAD, GRID, ENTRANCE, GAS_LIST, HOUSE_SLOTS, roadCenter, SOLIDS } from './layout.js';
import { mat, box, cyl, cone, sphere, at, dynamic, bakeStatic, textTexture, vcMerge } from './models/kit.js';

// Pisca-pisca dos cavaletes e o alerta dos caminhões: dois materiais que se alternam (atualizados no desenho, sem laço próprio).
const FLASH_A = new THREE.MeshStandardMaterial({ color: '#ff8a1a', emissive: '#ff6a00', emissiveIntensity: 0.9, roughness: 0.6 });
const FLASH_B = new THREE.MeshStandardMaterial({ color: '#ff8a1a', emissive: '#ff6a00', emissiveIntensity: 0.9, roughness: 0.6 });
const HAZARD = new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff7a00', emissiveIntensity: 1, roughness: 0.6 });
let flashFrame = -1;
function flashTick() {
  const t = performance.now() / 1000;
  if (Math.floor(t * 60) === flashFrame) return;
  flashFrame = Math.floor(t * 60);
  const on = (t % 1) < 0.5;
  FLASH_A.emissiveIntensity = on ? 1.6 : 0.15; FLASH_B.emissiveIntensity = on ? 0.15 : 1.6;
  HAZARD.emissiveIntensity = (t % 0.9) < 0.45 ? 1.5 : 0.1;
}
/** Operário de colete e capacete (frente +Z). pose 'sign': segura a placa PARE/SIGA; 'shovel': apoiado na pá; 'carry': carrega uma caixa. */
function buildWorker(pose) {
  const VEST = '#ff7a1a', SHIRT = '#3a6fb0', PANTS = '#3a3d44', SKIN = '#c98a62', HELM = '#ffd21a';
  const b = new THREE.Group();
  for (const sx of [-1, 1]) { b.add(at(box(0.2, 0.82, 0.22, PANTS), sx * 0.13, 0.41, 0)); b.add(at(box(0.24, 0.14, 0.34, '#4a3322'), sx * 0.13, 0.07, 0.05)); }
  b.add(at(box(0.56, 0.68, 0.32, SHIRT), 0, 1.16, 0));
  b.add(at(box(0.6, 0.5, 0.34, VEST), 0, 1.2, 0));
  for (const y of [1.08, 1.3]) b.add(at(box(0.62, 0.05, 0.36, '#e8eef2'), 0, y, 0));       // faixas refletivas
  b.add(at(box(0.16, 0.1, 0.16, SKIN), 0, 1.54, 0));
  b.add(at(sphere(0.2, SKIN, 10, 8), 0, 1.74, 0));
  b.add(at(sphere(0.23, HELM, 10, 6), 0, 1.84, 0)); b.add(at(cyl(0.27, 0.27, 0.04, HELM, 12), 0, 1.8, 0));
  for (const sx of [-1, 1]) b.add(at(sphere(0.03, '#2a2522', 5, 3), sx * 0.07, 1.76, 0.18));
  if (pose === 'shovel') {                                     // apoiado no cabo da pá, a lâmina no chão
    b.add(at(box(0.05, 1.3, 0.05, '#8a5a36'), 0.32, 0.75, 0.32, -0.25, 0, 0));
    b.add(at(box(0.3, 0.36, 0.04, '#7d8187'), 0.32, 0.12, 0.48, -0.25, 0, 0));
    for (const sx of [-1, 1]) b.add(at(box(0.14, 0.58, 0.16, SHIRT), sx * 0.33, 1.2, 0.12, -0.5, 0, sx * 0.15));
  } else if (pose === 'carry') {                               // caixa nos braços
    for (const sx of [-1, 1]) b.add(at(box(0.14, 0.5, 0.16, SHIRT), sx * 0.33, 1.22, 0.16, -0.9, 0, 0));
    b.add(at(box(0.56, 0.42, 0.42, '#c8955a'), 0, 1.15, 0.42)); b.add(at(box(0.57, 0.06, 0.12, '#e6d3a8'), 0, 1.37, 0.42));
  } else for (const sx of [-1, 1]) b.add(at(box(0.14, 0.58, 0.16, SHIRT), sx * 0.35, 1.17, 0, 0, 0, sx * 0.06));
  const g = new THREE.Group(); g.add(vcMerge(b));
  if (pose === 'sign') {                                       // placa PARE/SIGA girando devagar na mão (só muda o lado de vez em quando)
    const paddle = new THREE.Group(); paddle.position.set(0.42, 0, 0.18);
    paddle.add(at(box(0.05, 1.5, 0.05, '#5a5f66'), 0, 0.75, 0));
    const face = (txt, bg, rot) => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshStandardMaterial({ map: textTexture(txt, { width: 128, height: 128, bg, fg: '#ffffff', font: 'bold 38px "Trebuchet MS", sans-serif' }), roughness: 0.7 })); m.position.set(0, 1.62, rot ? -0.02 : 0.02); m.rotation.y = rot; return m; };
    paddle.add(face('PARE', '#d8312a', 0), face('SIGA', '#2f9a4a', Math.PI));
    g.add(paddle);
    g.userData.paddle = paddle;
  }
  return g;
}

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

/** Cavalete de obra atravessando a rua (tábuas listradas ao longo de X, pernas em A, sacos de areia nos pés, placa OBRAS
 *  e pisca-pisca alternado). Tudo dentro da caixa de colisão (meia espessura 0,35 ao longo da rua). Com `obra` (Bairro 3), o
 *  grupo traz também a obra de verdade: vala sob o cavalete, asfalto novo atrás dele e um operário na calçada. */
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
  const top = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, 0.6), boardMat);
  top.position.y = 1.25; top.castShadow = true;
  g.add(top);
  const st = new THREE.Group();                                   // partes fixas (fundidas)
  // cones laranja nas pontas (no meio da espessura: dentro da colisão)
  for (const x of [-W / 2 - 0.25, W / 2 + 0.25]) {
    st.add(at(cone(0.28, 0.85, '#ff7a1a', 10), x, 0.43, 0));
    st.add(at(cyl(0.17, 0.21, 0.13, '#ffffff', 10), x, 0.48, 0));
    st.add(at(box(0.62, 0.05, 0.62, '#2e3036'), x, 0.025, 0));
  }
  for (const x of [-W / 2 + 0.4, W / 2 - 0.4]) for (const s of [1, -1]) {
    st.add(at(box(0.12, 1.35, 0.12, '#2e3036'), x, 0.62, s * 0.2, s * 0.24, 0, 0));
    st.add(at(box(0.42, 0.16, 0.26, '#c2a76e'), x, 0.08, s * 0.3, 0, s * 0.2, 0));   // saco de areia no pé
  }
  // placa OBRAS no meio, dos dois lados
  st.add(at(box(0.08, 0.5, 0.08, '#2e3036'), 0, 1.55, 0));
  st.add(at(box(1.5, 0.56, 0.06, '#2e3036'), 0, 1.98, 0));
  const plate = textTexture('OBRAS', { width: 256, height: 96, bg: '#ff8a1a', fg: '#1b1b1b', font: 'bold 64px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.7 });
  for (const r of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.48), pm); p.position.set(0, 1.98, r ? -0.035 : 0.035); p.rotation.y = r; st.add(p); }
  st.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(st); g.add(st);
  for (const [k, x] of [-W / 2 + 0.4, W / 2 - 0.4].entries()) {   // pisca-pisca alternado
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), k ? FLASH_B : FLASH_A);
    l.position.set(x, 1.38, 0);
    l.onBeforeRender = flashTick;
    g.add(l);
  }
  // a obra (só no Bairro 3): vala e terra sob o cavalete, asfalto novo atrás dele e marcas de spray
  const obra = new THREE.Group(); obra.visible = false;
  const og = new THREE.Group();
  og.add(at(box(W + 0.4, 0.02, 0.62, '#5b4630'), 0, 0.012, 0));
  for (const [x, s] of [[-1.4, 0.55], [0.3, 0.42], [1.7, 0.5]]) { const m = at(sphere(s, '#7a5c3a', 7, 4), x, 0, 0); m.scale.set(1.4, 0.45, 0.5); og.add(m); }   // montinhos de terra
  og.add(at(box(W + 0.6, 0.012, 2.4, '#3c4048'), 0, 0.006, 1.6));                       // asfalto novo (recapeado), atrás do cavalete
  for (const x of [-W / 2 - 0.3, W / 2 + 0.3]) og.add(at(box(0.08, 0.014, 2.4, '#ff8a1a'), x, 0.008, 1.6));   // marcas de spray
  og.add(at(box(1.2, 0.014, 0.08, '#ff8a1a'), -0.8, 0.009, 2.9)); og.add(at(box(0.08, 0.014, 0.5, '#ff8a1a'), -0.2, 0.009, 3.15));
  og.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
  bakeStatic(og); obra.add(og);
  const worker = buildWorker('sign'); obra.add(worker);
  const shovel = buildWorker('shovel'); obra.add(shovel);
  obra.userData = { worker, shovel, og };
  g.add(dynamic(obra));
  g.userData.obra = obra;
  g.children.forEach(o => { if (o.material === FLASH_A || o.material === FLASH_B) dynamic(o); });
  bakeStatic(g);                               // tábuas listradas e partes fixas: poucas malhas
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
  g.add(at(box(6.6, 0.3, 2.0, '#2e3036'), -0.15, 0.55, 0));                      // chassi
  for (const zz of [1.0, -1.0]) {                                                  // pisca-alerta ligado (parado em fila dupla)
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), HAZARD); l.position.set(3.5, 1.2, zz); l.onBeforeRender = flashTick; g.add(l);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.3), HAZARD); r.position.set(-3.52, 0.95, zz * 1.05); g.add(r);
  }
  const st = new THREE.Group();
  for (const zz of [1.35, -1.35]) { st.add(at(box(0.12, 0.42, 0.06, '#2e3036'), 3.0, 2.3, zz)); st.add(at(box(0.06, 0.06, 0.3, '#2e3036'), 3.0, 2.3, zz * 0.92)); }   // retrovisores
  st.add(at(box(2.32, 0.18, 1.6, '#3a3d44'), 2.3, 2.79, 0));                        // teto da cabine
  st.add(at(box(0.08, 0.6, 0.9, '#2b4a6e'), 2.3, 2.05, 1.26));                       // janela lateral
  st.add(at(box(0.08, 0.6, 0.9, '#2b4a6e'), 2.3, 2.05, -1.26));
  // porta de trás do baú aberta (uma folha virada para o lado) e um ajudante descarregando caixas
  st.add(at(box(0.06, 2.8, 2.5, '#2a2c30'), -3.53, 2.0, 0));                         // vão escuro do baú
  st.add(at(box(1.25, 2.8, 0.06, '#c9ced6'), -2.88, 2.0, 1.34));                   // folha aberta, encostada na lateral
  for (const [x, y, z, s] of [[-4.2, 0, -0.6, 0.6], [-4.25, 0.6, -0.55, 0.5], [-4.6, 0, -0.05, 0.5]]) { st.add(at(box(s, s, s, '#c8955a'), x, y + s / 2, z, 0, x * 0.4, 0)); st.add(at(box(s + 0.01, 0.06, s * 0.25, '#e6d3a8'), x, y + s, z, 0, x * 0.4, 0)); }
  st.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  bakeStatic(st); g.add(st);
  const helper = buildWorker('carry'); helper.position.set(-4.0, 0, 0.75); helper.rotation.y = Math.PI / 2 + 0.5; helper.scale.setScalar(1.25); g.add(helper);
  const plateT = textTexture('FRETES', { width: 256, height: 96, bg: '#fbf7ee', fg: '#2f3236', font: 'bold 60px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plateT, roughness: 0.8 });
  for (const zz of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.95), pm); p.position.set(-0.9, 2.2, zz * 1.315); p.rotation.y = zz > 0 ? 0 : Math.PI; g.add(p); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  dynamic(cargo);                              // (a cor do baú muda a cada partida; o resto vira poucas malhas)
  g.children.forEach(o => { if (o.material === HAZARD) dynamic(o); });
  bakeStatic(g);
  g.scale.setScalar(0.8);                      // menor: na diagonal não toma a rua de ponta a ponta
  g.userData.cargo = cargo;
  return g;
}

/** Buraco largo no asfalto (atravessa a rua inteira): borda de asfalto quebrado e levantado, terra em volta, a parede de
 *  dentro em degradê (dá profundidade sem furar o chão), água parada no fundo, cones e um cavalete de aviso. */
function buildHole() {
  const g = new THREE.Group();
  const ell = (rx, rz, h, col, y, x = 0, z = 0, seg = 20) => { const m = at(cyl(1, 1, h, col, seg), x, y, z); m.scale.set(rx, 1, rz); g.add(m); return m; };
  ell(4.0, 2.4, 0.04, '#9a7448', 0.02);                                            // terra solta: destaca de longe
  ell(3.55, 1.85, 0.05, '#5a4630', 0.03);                                          // parede de dentro (terra úmida)
  ell(3.15, 1.55, 0.055, '#3a2c1f', 0.035, 0.05, 0.08);
  ell(2.6, 1.22, 0.06, '#1d1712', 0.04, 0.12, 0.14);                               // fundo escuro, um pouco deslocado (parece mais fundo)
  ell(1.4, 0.62, 0.065, '#4d5a63', 0.045, 0.3, 0.22, 14);                          // água parada no fundo
  ell(0.5, 0.18, 0.068, '#8aa0ad', 0.046, 0.0, 0.1, 10);                           // reflexo
  for (let k = 0; k < 18; k++) {                                                   // asfalto quebrado e levantado na borda
    const a = k / 18 * Math.PI * 2;
    g.add(at(box(0.75 + (k % 3) * 0.15, 0.18, 0.5, k % 2 ? '#5d6470' : '#474c55'), Math.cos(a) * 3.85, 0.08, Math.sin(a) * 2.0,
      (k % 3) * 0.25, a, (k % 4) * 0.22));
  }
  for (const [x, z] of [[2.9, 0.9], [-2.6, -0.8], [1.2, -1.9]]) g.add(at(sphere(0.22, '#8f8a80', 6, 4), x, 0.12, z));   // pedras soltas
  for (const x of [-3.2, 0, 3.2]) for (const zz of [2.05, -2.05]) {                // cones dos dois lados (dentro da colisão)
    g.add(at(cone(0.28, 0.85, '#ff7a1a', 10), x, 0.43, zz));
    g.add(at(cyl(0.17, 0.21, 0.13, '#ffffff', 10), x, 0.48, zz));
  }
  // cavalete pequeno de aviso numa ponta
  for (const s of [-1, 1]) g.add(at(box(0.1, 1.2, 0.1, '#2e3036'), 3.9 + s * 0.5, 0.58, -0.6, 0.25, 0, 0));
  const plate = textTexture('BURACO', { width: 256, height: 96, bg: '#ffc61a', fg: '#1b1b1b', font: 'bold 56px "Trebuchet MS", sans-serif' });
  const pm = new THREE.MeshStandardMaterial({ map: plate, roughness: 0.7 });
  for (const r of [0, Math.PI]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), pm); p.position.set(3.9, 1.05, r ? -0.67 : -0.53); p.rotation.y = r; g.add(p); }
  g.add(at(box(1.46, 0.55, 0.1, '#2e3036'), 3.9, 1.05, -0.6));
  g.scale.setScalar(0.68);                     // mais estreito que a rua
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  bakeStatic(g);
  return g;
}

/** Engarrafamento: fila de carros nas duas faixas ao longo de um trecho de rua (ao longo do X local). */
export const CAR_COLORS = ['#d8473a', '#3a78d4', '#efbf2a', '#3c9d55', '#f2f2f2', '#8a55c4', '#ff8a1e', '#2b2d33', '#e86aa0'];
export function buildCar() {
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
    dynamic(c.userData.body);                     // (a carroceria troca de cor a cada partida: fica separada)
    g.add(c); g.userData.cars.push(c);
  }
  bakeStatic(g);                                  // rodas, vidros, faróis… dos 6 carros viram poucas malhas
  return g;
}

const key = (...a) => a.join(',');

/** Bairro 3: liga a obra do cavalete e põe os operários na calçada do lado de um lote (fora da pista e da colisão da van). */
function placeObra(b, c, on) {
  const o = b.userData.obra; if (!o) return;
  o.visible = on; if (!on) return;
  const N = GRID, { worker, shovel, og } = o.userData, SW = ROAD / 2 - 0.15;
  let lx, along;
  if (c[0] === 'H') {                                          // rua leste–oeste: local +z = +x do mundo, local −x = +z do mundo
    const [, , i, side] = c, s = i < N ? 1 : -1;                // calçada do lote ao sul (ou ao norte na última rua)
    lx = -s * SW; along = side === 'L' ? 1 : -1;               // do lado do trecho sem saída
  } else {
    const [, j] = c; lx = j < N ? SW : -SW; along = 1;
  }
  og.rotation.y = along > 0 ? 0 : Math.PI;                     // asfalto novo do lado do trecho sem saída (não no cruzamento)
  worker.position.set(lx, 0.17, along * 1.3); worker.rotation.y = lx > 0 ? -Math.PI / 2 : Math.PI / 2;
  shovel.position.set(lx, 0.17, along * 2.6); shovel.rotation.y = (lx > 0 ? -Math.PI / 2 : Math.PI / 2) + along * 0.4;
  worker.userData.t0 = Math.random() * 10;
  const p = worker.userData.paddle;
  if (p && !p.userData.hooked) {                               // a placa vira de PARE para SIGA de tempos em tempos
    p.userData.hooked = true;
    p.children[0].onBeforeRender = () => { const t = performance.now() / 1000 + worker.userData.t0; const k = Math.min(1, Math.max(0, (Math.sin(t * 0.35) + 0.15) * 4)); p.rotation.y = k * Math.PI; };
  }
}

/** O conjunto de barreiras deixa tudo alcançável a partir da entrada? (`skipM`: portões dos trechos engarrafados, que ficam de fora de propósito) */
let TOPO = { blocked: new Set(), skip: new Set(), exclude: new Set(), heightAt: () => 0 };   // ver layout.roadTopology()
function allReachable(blocked0, skipM = new Set()) {
  const blocked = new Set([...TOPO.blocked, ...blocked0]);
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
  const total = (N + 1) * (N + 1) + N * (N + 1) - skipM.size - TOPO.skip.size;
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
  let list = [];                                 // bloqueios da partida (missões do Bairro 3): { id, kind 'H'|'V', j, i, side, x, z, type }

  function clear() {
    for (const s of solids) { const i = SOLIDS.indexOf(s); if (i >= 0) SOLIDS.splice(i, 1); }
    solids = []; current = []; jammed = []; jamRects = []; list = [];
    Object.values(pools).forEach(p => p.forEach(b => { b.visible = false; }));
  }

  /** Sorteia de `min` a `max` bloqueios válidos (dos tipos `types`) e os coloca na cena `scene`. */
  function randomize(scene, { min = 3, max = 5, types = ['barrier'], jams = null, topo = null } = {}) {
    clear();
    const obraMode = types.length === 1 && types[0] === 'barrier';   // Bairro 3: as obras de verdade
    if (topo) TOPO = topo;
    scene.add(group);
    const N = GRID;
    const cands = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j < N; j++) if (!TOPO.exclude.has(key('H', j, i))) cands.push(['H', j, i, 'L'], ['H', j, i, 'R']);
    const gasSegs = new Set(GAS_LIST.map(g => key('V', g.slots[0] % N + 1, Math.floor(g.slots[0] / N))));   // ruas por dentro dos postos
    for (let j = 0; j <= N; j++) for (let i = 0; i < N; i++) if (!gasSegs.has(key('V', j, i)) && !TOPO.exclude.has(key('V', j, i)) && !TOPO.blocked.has(key('V', j, i))) cands.push(['V', j, i]);
    const want = min + Math.floor(Math.random() * (max - min + 1));
    const wantJams = jams ? jams.min + Math.floor(Math.random() * (jams.max - jams.min + 1)) : 0;
    // engarrafamentos: trechos horizontais de rua com lotes ao norte (i ≥ 1); tampam o trecho inteiro
    const jamCands = [];
    const gasSlots = new Set(GAS_LIST.flatMap(g => g.slots));          // lote de posto não é destino de entrega: engarrafar ali não adiantaria
    for (let i = 1; i <= N; i++) for (let j = 0; j < N; j++) if (!gasSlots.has((i - 1) * N + j) && HOUSE_SLOTS.includes((i - 1) * N + j) && !TOPO.exclude.has(key('H', j, i))) jamCands.push([j, i]);
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
      b.position.set((x0 + x1) / 2, TOPO.heightAt((x0 + x1) / 2, z), z);
      const s = { x0, x1, z0: z - ROAD / 2 - 0.1, z1: z + ROAD / 2 + 0.1 };
      s.jam = true;                                // (contador de batidas: carro do engarrafamento)
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
      b.position.set(x, TOPO.heightAt(x, z), z);
      if (type === 'barrier') placeObra(b, c, obraMode);
      b.rotation.y = type === 'truck'
        ? (Math.random() < 0.5 ? Math.PI / 4 : -Math.PI / 4) + (Math.random() < 0.5 ? Math.PI : 0)   // caminhão parado na diagonal
        : alongX ? Math.PI / 2 : 0;
      if (type === 'truck') b.userData.cargo.material = mat(TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)]);
      const s = alongX ? { x0: x - T.half, x1: x + T.half, z0: z - T.cross, z1: z + T.cross }
                       : { x0: x - T.cross, x1: x + T.cross, z0: z - T.half, z1: z + T.half };
      s.bar = n;                                   // (contador de batidas e missões das barreiras)
      SOLIDS.push(s); solids.push(s);
      list.push({ id: n, kind: c[0], j: c[1], i: c[2], side: c[0] === 'H' ? c[3] : null, x, z, type });
    });
    current = chosen;
  }

  return { randomize, clear, get current() { return current; }, get count() { return current.length + jammed.length; }, get jammedSlots() { return jammed; }, get jamRects() { return jamRects; }, get list() { return list; } };
}
