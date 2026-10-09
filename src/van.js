// A van de entregas: modelo 3D (laranja, bem visível) + física de direção portada da versão 2D (escala 1/10).
// Espaço local do modelo: frente = +X, lado direito = +Z, cima = +Y. No mundo: object.rotation.y = −heading.
import * as THREE from 'three';
import { SOLIDS, BOUNDS, VAN_START } from './layout.js';
import { mat, mesh, box, cyl, at, group, dynamic, bakeStatic } from './models/kit.js';
import { buildWheel, WHEEL_R, WHEEL_W } from './models/wheels.js';
import { buildRack, tickRack } from './models/racks.js';
import { registerVan } from './models/vanLook.js';
import { PAINT, setVanPaint, getVanPaint, VAN_PAINT_DEFAULT } from './models/paint.js';
import { decalTexture } from './models/decals.js';

// ---------- Física ----------
const MAX = 21, ACC = 2.2, DEC = 3.5, TURN = 4.6;
const MAX_REVERSE = 8, BRAKE = 30, STEER = 2.6;  // controle estilo carro (câmera atrás da van)
// Carro (câmera atrás da van): aceleração e frenagem suaves, constantes (0 → 21 em ~2 s; freio de 21 → 0 em ~1.3 s).
const CAR_ACC = 10, CAR_BRAKE = 16, REV_ACC = 8, CAR_COAST = 1.8, CAR_ROLL = 2.5;
const CORNER_SPEED = 11;                     // virando acima disso a van perde velocidade aos poucos (curvas mais fáceis)
const R = 1.25, OFFS = [-1.5, 0, 1.5];      // círculos de colisão ao longo do eixo da van
const MAX_STEP = 0.5;                        // deslocamento máximo por subpasso (evita atravessar obstáculos)

const angleDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
};

// ---------- Modelo ----------
const ORANGE = '#ff7a1a', ORANGE_DARK = '#d95f0a', CREAM = '#fff3dc', GLASS = '#2b4a6e', GLASS_HI = '#6f9cc8';
const DARK = '#3a3d44', TIRE = '#1f2023', HUB = '#c9ced6', CARD = '#c98a4a', TAPE = '#f3d9a6';
export { setVanPaint, getVanPaint, VAN_PAINT_DEFAULT };
const BODY_W = 2.5, BEVEL = 0.14;
const SIDE_Z = BODY_W / 2;                   // face lateral da carroceria
const WHEELS = [[1.5, 1], [1.5, -1], [-1.45, 1], [-1.45, -1]];

// Perfil lateral da carroceria (x, y): traseira alta, para-brisa inclinado, capô curto.
const PROFILE = [[-2.4, 0.42], [2.4, 0.42], [2.4, 1.16], [2.2, 1.34], [1.55, 1.44], [0.85, 2.22], [-2.4, 2.22]];

/** Logotipo pintado nas laterais: caixinha de papelão + "ADRESS" sobre o laranja da carroceria. */
function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  // (sem fundo: a tinta da carroceria aparece por trás)
  // faixa creme arredondada
  g.fillStyle = CREAM;
  g.beginPath();
  if (g.roundRect) g.roundRect(10, 58, 492, 140, 52); else g.rect(10, 58, 492, 140);
  g.fill();
  // caixinha
  g.fillStyle = CARD; g.fillRect(34, 84, 100, 88);
  g.fillStyle = TAPE; g.fillRect(76, 84, 16, 88); g.fillRect(34, 118, 100, 14);
  g.strokeStyle = '#8a5a2e'; g.lineWidth = 6; g.strokeRect(34, 84, 100, 88);
  // texto (encolhe se a fonte for mais larga que o espaço)
  g.fillStyle = '#e8661a';
  g.font = 'bold 96px "Trebuchet MS", "Segoe UI", sans-serif';
  g.textAlign = 'left'; g.textBaseline = 'middle';
  const w = g.measureText('ADRESS').width, sc = Math.min(1, 340 / w);
  g.save(); g.translate(150, 130); g.scale(sc, 1); g.fillText('ADRESS', 0, 0); g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function bodyGeometry() {
  const s = new THREE.Shape();
  PROFILE.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const depth = BODY_W - 2 * BEVEL;
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: -BEVEL, bevelSegments: 2,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Prisma (perfil em x,y extrudado ao longo de z, centrado), p/ janelas laterais que atravessam a carroceria. */
function prism(points, width) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  g.translate(0, 0, -width / 2);
  return g;
}

// ---- teto com cavidade de verdade ("Caixa pesada demais"): a face de cima da carroceria e a chapa creme viram uma malha fina, com a depressão deslocada para baixo
const PIT = { cx: -0.85, cz: 0, rx: 0.9, rz: 0.55, depth: 0.34 };
function pitDisp(x, z) {
  const dx = (x - PIT.cx) / PIT.rx, dz = (z - PIT.cz) / PIT.rz, r = Math.hypot(dx, dz);
  if (r < 1) { const t = 1 - r; return -PIT.depth * t * t * (3 - 2 * t); }
  if (r < 1.35) return 0.03 * Math.sin(((r - 1) / 0.35) * Math.PI);               // bordas da lata, levemente amassadas para cima
  return 0;
}
/** Malha de triângulos virados para cima cobrindo [x0,x1]×[z0,z1] em y (+ deslocamento da cavidade). */
function topGrid(out, x0, x1, z0, z1, y, ox, cell = 0.06) {
  const nx = Math.max(1, Math.round((x1 - x0) / cell)), nz = Math.max(1, Math.round((z1 - z0) / cell));
  const H = (i, j) => { const x = x0 + (x1 - x0) * i / nx, z = z0 + (z1 - z0) * j / nz; return [x, y + pitDisp(x + ox, z), z]; };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const a = H(i, j), b = H(i, j + 1), c = H(i + 1, j + 1), d = H(i + 1, j);
    out.push(...a, ...b, ...c, ...a, ...c, ...d);
  }
}
function makePitBody(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), p = g.attributes.position.array, out = [];
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < p.length; i += 9) {
    if (Math.abs(p[i + 1] - 2.22) < 1e-3 && Math.abs(p[i + 4] - 2.22) < 1e-3 && Math.abs(p[i + 7] - 2.22) < 1e-3) {   // triângulo da face de cima (plana, y = 2,22)
      for (const k of [0, 3, 6]) { x0 = Math.min(x0, p[i + k]); x1 = Math.max(x1, p[i + k]); z0 = Math.min(z0, p[i + k + 2]); z1 = Math.max(z1, p[i + k + 2]); }
    } else for (let k = 0; k < 9; k++) out.push(p[i + k]);
  }
  topGrid(out, x0, x1, z0, z1, 2.22, 0);
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); o.computeVertexNormals(); return o;
}
function makePitRoof() {                          // chapa creme 3,0 × 1,95 × 0,08 (centro em x = −0,85, y = 2,26): lados e fundo originais, topo em malha
  const g = new THREE.BoxGeometry(3.0, 0.08, 1.95).toNonIndexed(), p = g.attributes.position.array, out = [];
  for (let i = 0; i < p.length; i += 9) {
    if (p[i + 1] > 0.039 && p[i + 4] > 0.039 && p[i + 7] > 0.039) continue;          // topo (y = +0,04): refeito em malha
    for (let k = 0; k < 9; k++) out.push(p[i + k]);
  }
  topGrid(out, -1.5, 1.5, -0.975, 0.975, 0.04, -0.85);
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(out, 3)); o.computeVertexNormals(); return o;
}

function buildModel() {
  const root = new THREE.Group();
  const body = new THREE.Group();            // tudo que balança sobre a suspensão
  root.add(body);

  // carroceria laranja
  // carroceria e chapa do teto são objetos separados (fora do merge) para poder trocar por versões com uma cavidade (Bagageiro "Caixa pesada demais")
  const bodyGeoDefault = bodyGeometry();
  const bodyMesh = dynamic(mesh(bodyGeoDefault, PAINT));
  body.add(bodyMesh);

  // teto creme (deixa uma borda laranja à vista)
  const roofMesh = dynamic(at(box(3.0, 0.08, 1.95, CREAM), -0.85, 2.26, 0));
  const roofGeoDefault = roofMesh.geometry;
  body.add(roofMesh);
  // faixa creme na base das laterais e para-choques
  body.add(at(box(4.5, 0.16, BODY_W + 0.02, CREAM), -0.05, 0.62, 0));
  body.add(at(box(0.3, 0.3, BODY_W - 0.1, DARK), 2.42, 0.56, 0));
  body.add(at(box(0.26, 0.28, BODY_W - 0.1, DARK), -2.42, 0.56, 0));

  // para-brisa (ao longo da rampa do perfil)
  const [x0, y0] = PROFILE[4], [x1, y1] = PROFILE[5];
  const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
  const nx = Math.cos(ang - Math.PI / 2), ny = Math.sin(ang - Math.PI / 2); // normal para fora (frente/cima)
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, ux = Math.cos(ang), uy = Math.sin(ang);
  body.add(at(box(len - 0.12, 0.05, BODY_W - 0.3, GLASS), mx + nx * 0.012, my + ny * 0.012, 0, 0, 0, ang));
  // reflexos no vidro
  body.add(at(box(0.55, 0.05, 0.14, GLASS_HI), mx + ux * 0.1 + nx * 0.03, my + uy * 0.1 + ny * 0.03, 0.5, 0, 0, ang));
  body.add(at(box(0.32, 0.05, 0.1, GLASS_HI), mx + ux * 0.2 + nx * 0.03, my + uy * 0.2 + ny * 0.03, 0.75, 0, 0, ang));

  // janelas laterais da cabine (um prisma que atravessa a carroceria e aparece dos dois lados)
  body.add(mesh(prism([[0.55, 1.5], [1.42, 1.5], [0.95, 2.06], [0.55, 2.06]], BODY_W + 0.03), GLASS));
  // linha da porta e maçaneta
  for (const s of [1, -1]) {
    body.add(at(box(0.05, 1.5, 0.02, ORANGE_DARK), 0.42, 1.3, s * (SIDE_Z + 0.005)));
    body.add(at(box(0.22, 0.07, 0.04, DARK), 0.2, 1.3, s * (SIDE_Z + 0.01)));
  }
  // porta traseira dupla
  body.add(at(box(0.02, 1.45, 0.05, ORANGE_DARK), -2.405, 1.4, 0));

  // faróis, lanternas, grade
  const headMat = mat('#fff7b0', { emissive: '#fff2a0', emissiveIntensity: 0.55 });
  const tailMat = mat('#e0262a', { emissive: '#b0101a', emissiveIntensity: 0.35 });
  for (const s of [1, -1]) {
    body.add(at(mesh(new THREE.BoxGeometry(0.08, 0.3, 0.5), headMat), 2.42, 0.98, s * 0.78));
    body.add(at(mesh(new THREE.BoxGeometry(0.08, 0.5, 0.26), tailMat), -2.42, 1.12, s * 0.98));
  }
  body.add(at(box(0.06, 0.2, 0.9, DARK), 2.42, 0.98, 0));

  // retrovisores
  for (const s of [1, -1]) {
    body.add(at(box(0.08, 0.06, 0.2, DARK), 1.45, 1.52, s * (SIDE_Z + 0.08)));
    body.add(at(mesh(new THREE.BoxGeometry(0.16, 0.34, 0.12), PAINT), 1.42, 1.62, s * (SIDE_Z + 0.2)));
    body.add(at(box(0.04, 0.26, 0.09, GLASS_HI), 1.34, 1.62, s * (SIDE_Z + 0.2)));
  }

  // bagageiro com encomendas (lê bem de cima)
  for (const s of [1, -1]) {
    body.add(at(box(2.7, 0.07, 0.07, DARK), -0.85, 2.44, s * 0.8));
    for (const x of [-2.0, 0.3]) body.add(at(box(0.07, 0.16, 0.07, DARK), x, 2.34, s * 0.8));
  }
  // carga do teto (Shop → Bagageiro): grupo próprio, fora do merge do corpo, para poder trocar de modelo
  const rack = dynamic(new THREE.Group());
  body.add(rack);
  const setRack = i => { while (rack.children.length) rack.remove(rack.children[0]); const m = buildRack(i); m.name = 'rack-model'; rack.add(m); bakeStatic(rack); };
  setRack(0);

  // logotipo nas laterais (textura: fica fora do merge para manter as UVs)
  const logoMat = new THREE.MeshStandardMaterial({ map: logoTexture(), roughness: 0.85, transparent: true });
  const logoGeo = new THREE.PlaneGeometry(2.62, 1.31);
  for (const s of [1, -1]) {
    const p = dynamic(at(new THREE.Mesh(logoGeo, logoMat), -0.93, 1.42, s * (SIDE_Z + 0.006), 0, s > 0 ? 0 : Math.PI, 0));
    p.receiveShadow = true;
    body.add(p);
  }

  // estampas (Shop → Estampas): um plano transparente por lado, por cima do logotipo (que nunca é trocado nem coberto, salvo pelas asas)
  const decals = [1, -1].map(s => {
    const m = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const p = dynamic(at(new THREE.Mesh(new THREE.PlaneGeometry(4.8, 1.8), m), 0, 1.3, s * (SIDE_Z + 0.013), 0, s > 0 ? 0 : Math.PI, 0));
    p.visible = false; p.renderOrder = 2; body.add(p); return p;
  });

  bakeStatic(body);

  // rodas (giram com a distância percorrida)
  const wheels = [];
  for (const [x, s] of WHEELS) {
    const pivot = new THREE.Group();
    pivot.position.set(x, WHEEL_R, s * (SIDE_Z - WHEEL_W / 2 + 0.07));
    pivot.add(buildWheel(0));
    root.add(pivot);
    wheels.push(pivot);
  }
  return { root, body, wheels, setRack, decals, bodyMesh, roofMesh, bodyGeoDefault, roofGeoDefault };
}

// ---------- API ----------
export function createVan(scene, opts) {
  const { root, body, wheels, setRack, decals, bodyMesh, roofMesh, bodyGeoDefault, roofGeoDefault } = buildModel();
  let decalModel = 0;
  root.name = 'van';
  scene.add(root);

  let x = VAN_START.x, z = VAN_START.z, heading = VAN_START.heading, speed = 0;
  let spin = 0, roll = 0, pitch = 0, prevSpeed = 0;
  // torre de caixas (Bagageiro "Excesso de encomendas"): pêndulo amortecido que balança nas curvas, freadas e arrancadas
  let sway = null, swR = 0, swVR = 0, swP = 0, swVP = 0;
  let squat = 0, rackModel = null, pitBody = null, pitRoof = null;   // bagageiro pesado demais: a van afunda nas rodas e o teto ganha uma cavidade
  const setRoofPit = on => {
    bodyMesh.geometry = on ? (pitBody = pitBody || makePitBody(bodyGeoDefault)) : bodyGeoDefault;
    roofMesh.geometry = on ? (pitRoof = pitRoof || makePitRoof()) : roofGeoDefault;
  };
  const findSway = () => {
    rackModel = body.getObjectByName('rack-model');
    setRoofPit(!!(rackModel && rackModel.userData.pit));
    sway = body.getObjectByName('sway') || null; swR = swVR = swP = swVP = 0;
    const m = body.getObjectByName('rack-model');
    squat = (m && m.userData.squat) || 0; sync();
  };

  function sync() {
    root.position.set(x, 0, z);
    root.rotation.set(0, -heading, 0);
    body.position.y = -squat;
    body.rotation.set(roll, 0, pitch);
    for (let i = 0; i < wheels.length; i++) wheels[i].rotation.z = spin;
  }

  /** Empurra os 3 círculos para fora dos lotes e da sebe (3 iterações). Retorna true se encostou em algo. */
  let ghost = false;                 // "van imparável" (menu): atravessa tudo
  function collide() {
    let hit = false;
    const lo = BOUNDS.min + R, hi = BOUNDS.max - R;
    for (let it = 0; it < 3; it++) {
      for (let k = 0; k < OFFS.length; k++) {
        const c = Math.cos(heading), s = Math.sin(heading);
        let cx = x + c * OFFS[k], cz = z + s * OFFS[k];
        for (let i = 0; !ghost && i < SOLIDS.length; i++) {
          const b = SOLIDS[i];
          if (cx < b.x0 - R || cx > b.x1 + R || cz < b.z0 - R || cz > b.z1 + R) continue;
          const px = Math.max(b.x0, Math.min(cx, b.x1)), pz = Math.max(b.z0, Math.min(cz, b.z1));
          const dx = cx - px, dz = cz - pz, d = Math.hypot(dx, dz);
          let mx = 0, mz = 0;
          if (d > 1e-6) {
            if (d >= R) continue;
            mx = dx / d * (R - d); mz = dz / d * (R - d);
          } else {
            // centro dentro do retângulo: sai pelo lado mais próximo
            const l = cx - b.x0, r = b.x1 - cx, t = cz - b.z0, bt = b.z1 - cz;
            const m = Math.min(l, r, t, bt);
            if (m === l) mx = -(l + R); else if (m === r) mx = r + R; else if (m === t) mz = -(t + R); else mz = bt + R;
          }
          x += mx; z += mz; cx += mx; cz += mz; hit = true;
        }
        if (cx < lo) { x += lo - cx; hit = true; }
        if (cx > hi) { x -= cx - hi; hit = true; }
        if (cz < lo) { z += lo - cz; hit = true; }
        if (cz > hi) { z -= cz - hi; hit = true; }
      }
    }
    return hit;
  }

  /**
   * Controle estilo carro (usado com a câmera atrás da van): W acelera, S freia e depois dá ré,
   * A/D viram o volante (só vira andando; em ré a direção se inverte, como num carro de verdade).
   */
  function driveCar(dt, axis) {
    const throttle = axis ? -axis.z : 0, steer = axis ? axis.x : 0;
    if (throttle > 0) {
      if (speed < 0) speed = Math.min(0, speed + CAR_BRAKE * dt);
      else speed = Math.min(MAX, speed + CAR_ACC * dt);
    } else if (throttle < 0) {
      if (speed > 0.5) speed = Math.max(0, speed - CAR_BRAKE * dt);
      else speed = Math.max(-MAX_REVERSE, speed - REV_ACC * dt);
    } else {
      // solto: desacelera devagar (resistência proporcional + atrito de rolagem)
      const v = Math.max(0, Math.abs(speed) - (Math.abs(speed) * CAR_COAST + CAR_ROLL) * dt);
      speed = v < 0.3 ? 0 : Math.sign(speed) * v;
    }
    if (steer && speed > CORNER_SPEED) speed -= (speed - CORNER_SPEED) * Math.min(1, 2.5 * dt);
    // quanto mais rápido, mais a direção responde (até um limite); parado não gira
    const grip = Math.min(1, Math.abs(speed) / 5) * Math.sign(speed);
    heading = angleDiff(heading + steer * STEER * grip * dt, 0);
  }

  function update(dt, axis, scheme = 'screen') {
    if (dt <= 0) return;
    const oldX = x, oldZ = z, oldHeading = heading;
    if (scheme === 'car') {
      driveCar(dt, axis);
    } else if (speed < 0) {
      // voltou para o controle pela tela no meio de uma ré: primeiro para
      speed = Math.min(0, speed + BRAKE * dt);
    } else if (axis && (axis.x || axis.z)) {
      const d = angleDiff(Math.atan2(axis.z, axis.x), heading);
      heading += Math.sign(d) * Math.min(Math.abs(d), TURN * dt);
      heading = angleDiff(heading, 0);
      const target = MAX * Math.max(0.25, Math.cos(d));
      speed += (target - speed) * Math.min(1, ACC * dt);
    } else {
      speed -= speed * Math.min(1, DEC * dt);
      if (speed < 0.3) speed = 0;
    }

    // movimento em subpassos + colisões (speed < 0 = ré)
    let hit = false;
    const dist = speed * dt;
    const n = Math.max(1, Math.ceil(Math.abs(dist) / MAX_STEP));
    const c = Math.cos(heading), s = Math.sin(heading);
    for (let i = 0; i < n; i++) {
      x += c * dist / n;
      z += s * dist / n;
      if (collide()) hit = true;
    }
    // encostou: a velocidade passa a ser a que sobrou ao longo da frente (independe da taxa de quadros:
    // de frente contra o muro para; raspando de lado quase não perde velocidade)
    if (hit) {
      const along = ((x - oldX) * c + (z - oldZ) * s) / dt, sg = Math.sign(speed);
      speed = sg * Math.min(Math.abs(speed), Math.max(0, sg * along));
    }

    // rodas: giram conforme o deslocamento real ao longo da frente
    const moved = (x - oldX) * c + (z - oldZ) * s;
    spin = (spin - moved / WHEEL_R) % (Math.PI * 2);

    // charme: a carroceria inclina para fora nas curvas e empina/abaixa ao acelerar/frear
    const turnRate = angleDiff(heading, oldHeading) / dt;
    const accel = (speed - prevSpeed) / dt;
    prevSpeed = speed;
    const k = 1 - Math.exp(-10 * dt);
    const rollGoal = THREE.MathUtils.clamp(-turnRate * (speed / MAX) * 0.035, -0.07, 0.07);
    const pitchGoal = THREE.MathUtils.clamp(accel * 0.0035, -0.045, 0.045);
    roll += (rollGoal - roll) * k;
    pitch += (pitchGoal - pitch) * k;
    tickRack(rackModel, performance.now() / 1000);
    if (sway) {
      const inR = THREE.MathUtils.clamp(-turnRate * (speed / MAX), -2.2, 2.2) * 38, inP = THREE.MathUtils.clamp(accel, -22, 22) * 0.6;
      const h = Math.min(dt, 0.03);
      swVR += (inR - 30 * swR - 1.5 * swVR) * h; swR += swVR * h;
      swVP += (inP - 30 * swP - 1.5 * swVP) * h; swP += swVP * h;
      swR = THREE.MathUtils.clamp(swR, -0.3, 0.3); swP = THREE.MathUtils.clamp(swP, -0.3, 0.3);
      sway.rotation.set(swR, 0, swP);
    }
    sync();
  }

  function teleport(nx, nz, nh) {
    x = nx; z = nz; heading = angleDiff(nh, 0);
    speed = 0; prevSpeed = 0; roll = 0; pitch = 0; swR = swVR = swP = swVP = 0; if (sway) sway.rotation.set(0, 0, 0);
    sync();
  }

  teleport(VAN_START.x, VAN_START.z, VAN_START.heading);

  const api = {
    object: root,
    /** Grupo da carroceria (balança na suspensão / afunda com o bagageiro pesado): porta, janelas e cabine. */
    body,
    get x() { return x; },
    get z() { return z; },
    get heading() { return heading; },
    get speed() { return speed; },
    get maxSpeed() { return MAX; },
    reset() { teleport(VAN_START.x, VAN_START.z, VAN_START.heading); },
    stop() { speed = 0; prevSpeed = 0; roll = 0; pitch = 0; sync(); },
    setGhost(v) { ghost = !!v; },
    /** Troca o modelo das rodas (Shop): 0 = padrão. */
    /** Troca a carga do teto (Shop): 0 = caixas. */
    setRackModel(m) { setRack(m); findSway(); },
    /** Estampa da lateral (Shop): 0 = sem estampa. */
    setDecalModel(m) {
      decalModel = m;
      decals.forEach((p, k) => {
        const t = decalTexture(m, k === 0 ? 1 : -1), mt = p.material;
        if (mt.map) mt.map.dispose();
        mt.map = t; mt.needsUpdate = true; p.visible = !!t;
      });
    },
    /** Redesenha a estampa atual (ex.: depois de trocar as cores do xadrez). */
    refreshDecal() { if (decalModel) this.setDecalModel(decalModel); },
    /** Só para a pré-visualização do Shop: balança a torre de caixas sozinha (a van lá não anda). */
    /** Fora da direção (diálogo, a pé, etc.): a torre vai parando sozinha, sem ficar torta. */
    relax(dt) {
      tickRack(rackModel, performance.now() / 1000);
      if (!sway) return;
      const h = Math.min(dt, 0.03);
      swVR += (-30 * swR - 3 * swVR) * h; swR += swVR * h; swVP += (-30 * swP - 3 * swVP) * h; swP += swVP * h;
      sway.rotation.set(swR, 0, swP);
    },
    swayDemo(t) { tickRack(rackModel, t); if (sway) sway.rotation.set(Math.sin(t * 2.1) * 0.13, 0, Math.sin(t * 1.5) * 0.09); },
    setWheelModel(m) { wheels.forEach(p => { while (p.children.length) p.remove(p.children[0]); p.add(buildWheel(m)); }); },
    /** Gira a van (usado no voo de helicóptero, que vira mesmo parado). */
    turn(d) { heading = angleDiff(heading + d, 0); sync(); },
    teleport,
    update,
  };
  if (!(opts && opts.look === false)) registerVan(api);   // recebe o visual salvo no Shop (a van de pré-visualização do Shop não)
  return api;
}
