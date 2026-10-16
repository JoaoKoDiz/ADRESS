// Imagens dos 4 cartões dos níveis extras (seleção do Livre): um objeto 3D só, centralizado no vazio preto.
// 1 Rigidez: estátua feminina de vidro #003EFF · 2 Maledicência: lápide coberta de musgo num torrão de terra e grama ·
// 3 Covardia: sem imagem (área preta) · 4 Sacrifício: vela quase consumida com chama roxa #9B00FF.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildBody } from './models/driver.js';

let rnd = 1;
const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };   // fixo: a imagem é sempre a mesma

function statue() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const B = buildBody(body);
  const glass = new THREE.MeshPhysicalMaterial({ color: '#003EFF', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.9,
    clearcoat: 1, clearcoatRoughness: 0.06, emissive: '#003EFF', emissiveIntensity: 0.22, envMapIntensity: 0.3, flatShading: true, depthWrite: false });
  const cap = g.getObjectByName('cap'); if (cap) cap.visible = false;
  // sem os óculos escuros do personagem (aro, lentes, hastes e ponte): é uma estátua
  const kill = new Set(); B.head.traverse(o => { if (o.isMesh && (o.geometry.type === 'TorusGeometry' || o.geometry.type === 'CircleGeometry')) kill.add(o.material); });
  const gone = []; B.head.traverse(o => { if (o.isMesh && kill.has(o.material)) gone.push(o); }); gone.forEach(o => o.removeFromParent());
  const hr = 0.45;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 10, 7, 0, Math.PI * 2, 0, 1.5), glass); crown.position.y = 0.46; B.head.add(crown);
  const hair = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.78, 0.5, 4, 8), glass); hair.position.set(-0.2, 0.25, 0); hair.scale.set(0.7, 1, 1.15); B.head.add(hair);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.5, 0.36, 10, 1, true), glass); skirt.position.y = -0.1; B.pelvis.add(skirt);   // saia um pouco mais rodada
  // pose de bailarina (como a referência): uma mão erguida, o outro braço aberto para o lado oposto, em diagonal para baixo
  const [down, up] = B.arms;                                    // (o braço erguido é o do lado da câmera)
  up.sh.rotation.set(-2.45, 0, 0.12); up.elbow.rotation.z = 0.18; up.wrist.rotation.z = 0.25;
  down.sh.rotation.set(0.95, 0, 0.12); down.elbow.rotation.z = 0.2; down.wrist.rotation.z = -0.15;
  const [lA, lB] = B.legs;                                      // uma perna levemente à frente, a outra dobrada para trás
  lA.hip.rotation.z = 0.12; lB.hip.rotation.z = -0.18; lB.knee.rotation.z = -0.55;
  B.head.rotation.x = 0.12;                                    // cabeça um pouco inclinada para o lado do braço erguido
  g.traverse(o => { if (o.isMesh) { o.material = glass; o.renderOrder = 1; } });
  g.rotation.y = -Math.PI / 2 + 0.3;                          // de frente, em três quartos: a silhueta inteira contra o preto
  return g;
}

function tombstone() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: '#7d7a72', roughness: 0.95, flatShading: true });
  const moss = [new THREE.MeshStandardMaterial({ color: '#2c4a1c', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#36561f', roughness: 1, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: '#223d16', roughness: 1, flatShading: true })];
  const W = 1.0, H = 1.15, T = 0.28;
  const prof = new THREE.Shape(); prof.moveTo(-W / 2, 0); prof.lineTo(W / 2, 0); prof.lineTo(W / 2, H); prof.absarc(0, H, W / 2, 0, Math.PI, false); prof.lineTo(-W / 2, 0);
  const sg = new THREE.ExtrudeGeometry(prof, { depth: T, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 }); sg.translate(0, 0, -T / 2);
  g.add(new THREE.Mesh(sg, stone));
  g.rotation.z = 0.05; g.rotation.y = 0.35;
  // musgo: tufos facetados por toda a superfície, deixando alguns trechos de pedra aparentes
  const surf = (u, v, side) => {                               // ponto na frente/trás/lados da lápide (u 0..1 largura, v 0..1 altura)
    const ang = Math.PI * u, x = -W / 2 + W * u, y = v * (H + W / 2);
    let px = x, py = y;
    if (y > H && Math.hypot(px, py - H) > W / 2 - 0.01) return null;   // topo em arco
    return new THREE.Vector3(px, py, side * T / 2);
  };
  const tuft = new THREE.IcosahedronGeometry(1, 0);
  // densidade irregular: mais na base, nas bordas e em algumas manchas; o meio e o alto ficam com pedra bem aparente
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const blobs = [[0.18, 1.02, 0.16], [0.8, 0.72, 0.13], [0.62, 1.32, 0.1]];
  const dens = (u, v) => Math.min(0.92, 0.04 + 0.85 * sm(0.5, 0.05, v) + 0.6 * sm(0.36, 0.5, Math.abs(u - 0.5)) * sm(1.3, 0.6, v) + blobs.reduce((m, [bu, bv, r]) => Math.max(m, 0.85 * sm(r, 0, Math.hypot(u - bu, (v - bv) * 0.9))), 0));
  for (let i = 0; i < 2600; i++) {
    const side = rand() < 0.8 ? 1 : -1, u = rand(), v = rand() * 1.45;
    if (rand() > dens(u, v)) continue;
    const p = surf(u, v, side); if (!p) continue;
    const m = new THREE.Mesh(tuft, moss[i % 3]), s = 0.04 + rand() * 0.065;
    m.scale.set(s * 1.4, s, s * 0.6); m.position.copy(p); m.position.z += side * s * 0.25; m.rotation.set(rand() * 3, rand() * 3, rand() * 3); g.add(m);
  }
  for (let i = 0; i < 70; i++) {                               // laterais (mais embaixo)
    const sx = rand() < 0.5 ? -1 : 1, y = Math.pow(rand(), 1.8) * H, m = new THREE.Mesh(tuft, moss[i % 3]), s = 0.04 + rand() * 0.05;
    m.scale.set(s * 0.6, s, s * 1.3); m.position.set(sx * W / 2, y, (rand() - 0.5) * T); g.add(m);
  }
  const base = new THREE.Group(); base.add(g);
  // torrão: terra marrom e grama levemente verde (a única base)
  const dirt = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 0.28, 11), new THREE.MeshStandardMaterial({ color: '#5a3d24', roughness: 1, flatShading: true }));
  dirt.position.y = -0.14; dirt.scale.z = 0.8; base.add(dirt);
  const grassTop = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.04, 0.03, 11), new THREE.MeshStandardMaterial({ color: '#6f8a43', roughness: 1, flatShading: true }));
  grassTop.position.y = 0.0; grassTop.scale.z = 0.8; base.add(grassTop);
  const blade = new THREE.ConeGeometry(0.018, 0.16, 3), gm = [new THREE.MeshStandardMaterial({ color: '#7f9b4c', roughness: 1, flatShading: true }), new THREE.MeshStandardMaterial({ color: '#6c8a3e', roughness: 1, flatShading: true })];
  for (let i = 0; i < 260; i++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 1.0, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
    if (Math.abs(x) < 0.55 && Math.abs(z) < 0.2) continue;
    const b = new THREE.Mesh(blade, gm[i % 2]), h = 0.6 + rand() * 0.9; b.scale.y = h; b.position.set(x, 0.08 * h, z); b.rotation.set((rand() - 0.5) * 0.5, rand() * 3, (rand() - 0.5) * 0.5); base.add(b);
  }
  return base;
}

function flameTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 84, 2, 32, 74, 58);
  gr.addColorStop(0, 'rgba(235,190,255,1)'); gr.addColorStop(0.12, 'rgba(190,90,255,1)'); gr.addColorStop(0.4, 'rgba(155,0,255,0.95)'); gr.addColorStop(1, 'rgba(155,0,255,0)');
  x.fillStyle = gr; x.beginPath(); x.moveTo(32, 4); x.bezierCurveTo(52, 50, 58, 92, 32, 124); x.bezierCurveTo(6, 92, 12, 50, 32, 4); x.fill();
  return new THREE.CanvasTexture(c);
}

function candle() {
  const g = new THREE.Group();
  const wax = new THREE.MeshStandardMaterial({ color: '#efe5cf', roughness: 0.5, flatShading: true, emissive: '#2a2418', emissiveIntensity: 0.35 });
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.42, 16), wax); stub.position.y = 0.21; g.add(stub);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.05, 6, 14), wax); rim.rotation.x = Math.PI / 2; rim.position.y = 0.42; rim.scale.z = 0.8; g.add(rim);   // borda derretida em volta do pavio
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), new THREE.MeshStandardMaterial({ color: '#f4ecd9', roughness: 0.25, flatShading: true })); pool.position.y = 0.41; g.add(pool);
  for (let i = 0; i < 7; i++) {                                // escorridos
    const a = i / 7 * Math.PI * 2 + rand() * 0.5, l = 0.12 + rand() * 0.25;
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, l, 3, 6), wax); d.scale.z = 0.6; d.rotation.y = -a; d.position.set(Math.cos(a) * 0.345, 0.42 - l / 2 + 0.02, Math.sin(a) * 0.345); g.add(d);
  }
  // cera derretida espalhada em volta (poça irregular)
  const shape = new THREE.Shape(); const N = 22;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = 0.47 + Math.sin(a * 3 + 1) * 0.07 + Math.sin(a * 7) * 0.035 + (i % N ? rand() * 0.03 : 0); const px = Math.cos(a) * r, pz = Math.sin(a) * r; if (!i) shape.moveTo(px, pz); else shape.lineTo(px, pz); }
  const puddle = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.04, bevelSegments: 2 }), wax);
  puddle.rotation.x = Math.PI / 2; puddle.position.y = 0.05; g.add(puddle);
  for (let i = 0; i < 3; i++) { const a = rand() * 6.28, r = 0.55 + rand() * 0.06, b = new THREE.Mesh(new THREE.SphereGeometry(0.05 + rand() * 0.04, 6, 4), wax); b.scale.y = 0.4; b.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); g.add(b); }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.12, 5), new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 1 })); wick.position.y = 0.47; wick.rotation.z = 0.15; g.add(wick);
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flame.scale.set(0.22, 0.44, 1); flame.position.y = 0.72; g.add(flame);
  const glow = new THREE.PointLight('#9B00FF', 0.35, 1.4, 2); glow.position.y = 0.7; g.add(glow);
  // moldura invisível do tamanho da poça antiga: o enquadramento (câmera e tamanho da vela) continua o mesmo
  const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.96, 12)); frame.position.y = 0.46; frame.visible = false; g.add(frame);
  return g;
}

/** Devolve as 4 imagens (data URL; null = área preta, sem imagem). Retrato 3:4, fundo preto. */
export function renderExtraThumbs(w = 360, h = 480) {
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(w, h, false); r.setClearColor('#000000', 1); r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(r), env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  const cam = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
  const shot = (obj, setup, view) => {
    r.toneMapping = view.tone === false ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#000000'); setup(scene); scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj), sph = box.getBoundingSphere(new THREE.Sphere());
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), dist = sph.radius / Math.min(t, t * cam.aspect) * view.k;
    cam.position.copy(sph.center).addScaledVector(view.dir.clone().normalize(), dist); cam.lookAt(sph.center);
    r.render(scene, cam);
    return r.domElement.toDataURL('image/png');
  };
  const urls = [];
  rnd = 7;
  urls.push(shot(statue(), s => {
    s.environment = env;
    s.add(new THREE.HemisphereLight('#8fa8ff', '#000000', 0.25));
    const key = new THREE.DirectionalLight('#ffffff', 1.1); key.position.set(3, 5, 4); s.add(key);
    const rim = new THREE.DirectionalLight('#7f9fff', 2.2); rim.position.set(-4, 3, -4); s.add(rim);
  }, { dir: new THREE.Vector3(0, 0.08, 1), k: 1.18, tone: false }));   // sem tone mapping: o azul fica fiel ao #003EFF
  rnd = 11;
  urls.push(shot(tombstone(), s => {
    s.add(new THREE.HemisphereLight('#e8f0ff', '#1a120a', 1.1));
    const key = new THREE.DirectionalLight('#fff4e0', 2.6); key.position.set(3, 6, 5); s.add(key);
    const rim = new THREE.DirectionalLight('#c8d8ff', 1.2); rim.position.set(-4, 3, -3); s.add(rim);
  }, { dir: new THREE.Vector3(0.15, 0.42, 1), k: 0.82 }));
  urls.push(null);                                              // Covardia: ainda sem imagem (área preta)
  rnd = 3;
  urls.push(shot(candle(), s => {
    s.add(new THREE.HemisphereLight('#fff4e6', '#000000', 0.55));
    const key = new THREE.DirectionalLight('#fff0e0', 1.1); key.position.set(2, 4, 3); s.add(key);
  }, { dir: new THREE.Vector3(0, 0.55, 1), k: 0.8 }));
  pm.dispose(); env.dispose(); r.dispose(); r.forceContextLoss();
  return urls;
}
