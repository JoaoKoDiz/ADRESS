// Nível extra 1 (história secundária, depois da queda do 4º sino): só a introdução.
// Vazio quase preto, o jogador a pé (fica branco no 1º passo de verdade), um cubo de céu/campo com o K e a R,
// aproximação travada, câmera de dentro atrás da R, o K sai pela esquerda dela, o cubo se quebra como vidro,
// aparece a figura preta gigante e a cena volta para a tela inicial. Nada é salvo como concluído.
import * as THREE from 'three';
import { whitenFade } from './whiteout.js';
import { buildStandingReader } from './models/reader.js';
import { buildBody } from './models/driver.js';

export const EXTRA_DONE_KEY = 'adress.extra.done';     // os 4 níveis extras concluídos (fim da chuva) — ainda nunca gravado
export const EXTRA1_KEY = 'adress.extra.1';            // extra 1 concluído (gravado no instante da quebra da imagem)
export const EXTRA2_KEY = 'adress.extra.2';            // extra 2 concluído (ainda sem conteúdo)

const BG = new THREE.Color('#0b0b0e');                  // o vazio
const E = 6.3, HALF = E / 2, CZ = -14, FRONT = CZ + HALF, BACK = CZ - HALF;   // cubo: aresta ≈ 3× a altura do jogador
const K0 = new THREE.Vector3(-1.1, 0, -12.3), R0 = new THREE.Vector3(1.0, 0, -14.7);
const FAR_VAN = { x: 1e9, z: 1e9 };
const START_Z = 34;                                       // o jogador começa bem longe do cubo (frente em z ≈ −10,9)
const TRIGGER = 21;                                       // a cena começa ainda longe: a esta distância da frente do cubo
const K_FACE = Math.atan2(-(R0.z - K0.z), R0.x - K0.x);  // o K de frente para a R (despedida)
const FIG_H = 9.5;                                        // altura da figura (para subir de baixo para o quadro)
const T = { hold: 5, kWalk: 5.2, kAfter: 1.1, crack: 0.75, fall: 3.0, empty: 1.4, rise: 0.7, ease: 5, travel: 2, up: 1.1, pull: 1.0 };
// Falas da figura (avanço manual: E/Espaço ou toque no balão; "[…]" = pausa curta na digitação, não aparece).
const P_ = s => { const out = []; for (const part of s.split(/(\[…\])/)) { if (!part) continue; if (part === '[…]') out.push({ p: 0.6 }); else out.push(out.length && out[out.length - 1].p ? part.replace(/^\s+/, '') : part); } return out; };
const TALK2 = [   // diálogo 2: depois que o cubo se quebra e a figura aparece
  'Você está aqui.',
  'Já se foram. […] Ele está longe. […] E você ficou.',
  'Esperando que alguma coisa fosse dita para você também?',
  'Eu vi o que você fez.',
  'A caixa. […] A neve. […] A oficina.',
  'Você fez questão de chegar até o fim.',
  'Agora me diga.',
  'Se ninguém se lembrasse de nenhuma dessas coisas… […] você ainda faria tudo outra vez?',
  'Não responda tão depressa.',
  'Essa é a resposta que você aprendeu a dar.',
  'Eu quero aquela que veio antes.',
  'Aquela que você teve vergonha de pensar.',
  '[…] Você queria fazer o bem.',
  'E queria que alguém olhasse.',
  'Eu estou olhando agora.',
  '[…] E não vejo bem algum.',
  'Ao menos, […] nenhum que seja verdadeiro.',
].map(P_);
const TALK3 = [   // diálogo 3: durante o deslocamento, depois que ela reaparece à frente
  'Você ainda acha que existe alguma coisa boa aí dentro.',
  'Algo que eu não vi.',
  '[…] Eu vi.',
  'Você teve um pensamento do qual se envergonhou.',
  'Engoliu uma resposta.',
  'Fez a coisa certa […] querendo não ter que fazer.',
  'E achou que ninguém perceberia a diferença.',
  'É isso que você chama de integridade?',
  'O que mostra […] ou o que precisa esconder para conseguir mostrar?',
  '[…] Não precisa responder.',
  'Você vai escolher as palavras com cuidado.',
  'Sempre esse cuidado.',
  'Não para ser honesto.',
  'Para sair parecendo alguém que foi.',
  'Até agora, […] está procurando uma maneira de ouvir tudo isso e continuar sendo a pessoa boa da história.',
  'Patético.',
  'Você não suporta a possibilidade de ter feito tudo certo […] e ainda assim não ser quem gostaria.',
  'Então vai procurar outra coisa para fazer.',
  'Outra pessoa para ajudar.',
  'Mais uma oportunidade de não ter que olhar para si.',
  'Mas nenhuma delas vai mudar o que você pensou.',
  'Nem o alívio que sentiu quando deixou de ser sua obrigação.',
  '[…] Essa parte você não conta.',
  'Conta que ficou.',
  'Que ajudou.',
  'Que voltou.',
  'Precisa contar nessa ordem, não é?',
  'Senão, por um instante, […] talvez você escute outra coisa.',
  'Talvez perceba que passou esse tempo inteiro defendendo alguém […] que nem você acredita que existe.',
  'E não há mais ninguém aqui para discordar de mim.',
  '[…] Mas você ainda imagina que alguém discordaria.',
  'Alguém que ficaria do seu lado.',
  'É porque, nessa sua versão, […] eles nunca sabem de tudo.',
  'Se soubessem o que você esconde…',
  'Se ouvissem aquilo que você não teve coragem de dizer…',
  '[…] Não seria você contra mim.',
  'Seria você contra todos.',
  'Eu só fui o primeiro a dizer.',
].map(P_);
const HINT = 'E / Espaço — Continuar';
const VMAX = 240;                                       // velocidade do deslocamento (cenário relativo)

const SKY_V = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SKY_F = `uniform float uOp; varying vec3 vW;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec3 d = normalize(vW - cameraPosition);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(vec3(0.70, 0.84, 0.97), vec3(0.18, 0.45, 0.88), smoothstep(-0.02, 0.65, h));
  vec2 q = d.xz / (abs(d.y) + 0.25) * 1.6;
  float cl = n2(q) * 0.55 + n2(q * 2.1 + 3.1) * 0.3 + n2(q * 4.3 + 7.7) * 0.15;
  c = mix(c, vec3(0.97, 0.98, 1.0), smoothstep(0.58, 0.82, cl) * smoothstep(0.02, 0.25, h) * 0.85);
  gl_FragColor = vec4(c, uOp);
}`;

function grassTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#6fae4a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) { const v = Math.random(); g.fillStyle = v < 0.5 ? 'rgba(80,140,50,0.55)' : v < 0.85 ? 'rgba(140,196,96,0.5)' : 'rgba(230,220,120,0.6)'; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Faces do cubo (só as de dentro; a da frente, virada para o jogador, não existe): centro, eixos u/v e normal para dentro. */
const FACES = [
  { name: 'back', c: [0, HALF, BACK], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], div: 5 },
  { name: 'left', c: [-HALF, HALF, CZ], u: [0, 0, -1], v: [0, 1, 0], n: [1, 0, 0], div: 4 },
  { name: 'right', c: [HALF, HALF, CZ], u: [0, 0, 1], v: [0, 1, 0], n: [-1, 0, 0], div: 4 },
  { name: 'top', c: [0, E, CZ], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0], div: 4 },
  { name: 'plain', c: [0, 0.002, CZ], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], div: 5 },
];

export function createExtraStory(ctx) {
  const { walker, input, audio, talkBox } = ctx;
  const scene = new THREE.Scene(); scene.background = BG.clone();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#2a3020', 1.1));
  const sun = new THREE.DirectionalLight('#fff6e6', 1.7); sun.position.set(6, 12, 9); scene.add(sun);

  // ---- o cubo: céu (shader pela direção do olhar) e campo, cortados nos limites ----
  const skyMat = new THREE.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, uniforms: { uOp: { value: 1 } }, transparent: true, depthWrite: true });
  const grass = grassTex();
  const plainMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: grass, roughness: 1, transparent: true });
  const shardSky = skyMat.clone(); shardSky.side = THREE.DoubleSide; shardSky.uniforms = { uOp: { value: 1 } };
  const shardPlain = plainMat.clone(); shardPlain.side = THREE.DoubleSide;
  const cube = new THREE.Group(); scene.add(cube);
  const V3 = a => new THREE.Vector3(...a);
  // malha de cada face (pontos internos levemente deslocados): a mesma divisão vira as rachaduras e os cacos
  const faceTris = [];
  for (const f of FACES) {
    const c = V3(f.c), u = V3(f.u), v = V3(f.v), n = f.div, pts = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      let a = i / n - 0.5, b = j / n - 0.5;
      if (i > 0 && i < n) a += (Math.random() - 0.5) * 0.6 / n;
      if (j > 0 && j < n) b += (Math.random() - 0.5) * 0.6 / n;
      pts.push(c.clone().addScaledVector(u, a * E).addScaledVector(v, b * E));
    }
    const P = (i, j) => pts[j * (n + 1) + i], tris = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const d = Math.random() < 0.5;
      tris.push(d ? [P(i, j), P(i + 1, j), P(i + 1, j + 1)] : [P(i, j), P(i + 1, j), P(i, j + 1)]);
      tris.push(d ? [P(i, j), P(i + 1, j + 1), P(i, j + 1)] : [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]);
    }
    // face inteira (antes de quebrar): virada para dentro (de fora, só se vê o interior pela frente aberta)
    const geo = new THREE.BufferGeometry(), pos = [], uv = [], N = V3(f.n);
    for (const t of tris) {
      const e1 = t[1].clone().sub(t[0]), e2 = t[2].clone().sub(t[0]), flip = e1.cross(e2).dot(N) < 0;
      for (const p of flip ? [t[0], t[2], t[1]] : t) { pos.push(p.x, p.y, p.z); uv.push(p.x / E + 0.5, p.z / E + 0.5); }
      if (flip) { const s = t[1]; t[1] = t[2]; t[2] = s; }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
    cube.add(new THREE.Mesh(geo, f.name === 'plain' ? plainMat : skyMat));
    for (const t of tris) faceTris.push({ t, plain: f.name === 'plain', n: N });
  }
  // rachaduras: as arestas dos cacos, um tiquinho para dentro
  const crackPos = [];
  for (const { t, n } of faceTris) for (let k = 0; k < 3; k++) { const a = t[k].clone().addScaledVector(n, 0.01), b = t[(k + 1) % 3].clone().addScaledVector(n, 0.01); crackPos.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  const crackGeo = new THREE.BufferGeometry(); crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPos, 3));
  const crackMat = new THREE.LineBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0, depthWrite: false });
  const cracks = new THREE.LineSegments(crackGeo, crackMat); cracks.renderOrder = 2; cube.add(cracks);
  // cacos (montados na hora da quebra)
  const shards = new THREE.Group(); scene.add(shards);

  // ---- K e R (cortados nos limites do cubo) ----
  const clip = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), HALF), new THREE.Plane(new THREE.Vector3(1, 0, 0), HALF),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -BACK), new THREE.Plane(new THREE.Vector3(0, 0, -1), FRONT), new THREE.Plane(new THREE.Vector3(0, -1, 0), E)];
  const K = buildStandingReader();
  K.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.clippingPlanes = clip; o.castShadow = false; } });
  scene.add(K);
  const R = new THREE.Group(); const rBody = new THREE.Group(); rBody.scale.setScalar(0.86); R.add(rBody);
  const RB = buildBody(rBody);
  const rMat = new THREE.MeshStandardMaterial({ color: '#003EFF', roughness: 0.85, flatShading: true, clippingPlanes: clip, transparent: true });
  const capSlot = R.getObjectByName('cap'); if (capSlot) capSlot.visible = false;
  // cabelo comprido e saia (mesmo estilo facetado), tudo da mesma cor
  const hr = 0.45;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 10, 7, 0, Math.PI * 2, 0, 1.5), rMat); crown.position.y = 0.46; RB.head.add(crown);
  const back = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.78, 0.5, 4, 8), rMat); back.position.set(-0.2, 0.25, 0); back.scale.set(0.7, 1, 1.15); RB.head.add(back);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 0.42, 9, 1, true), rMat); skirt.position.y = -0.12; RB.pelvis.add(skirt);
  R.traverse(o => { if (o.isMesh) { o.material = rMat; o.castShadow = false; } });
  RB.arms.forEach((a, i) => { a.sh.rotation.z = 0.05; a.sh.rotation.x = (i ? 1 : -1) * 0.06; a.elbow.rotation.z = 0.12; });
  scene.add(R);

  // ---- a figura: humanoide inteiro preto, bem maior ----
  const figMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0 });
  const fig = buildStandingReader(); fig.traverse(o => { if (o.isMesh) { o.material = figMat; o.castShadow = false; } });
  fig.scale.set(4.6, 5.0, 4.6); fig.rotation.y = -Math.PI / 2; fig.position.set(0.4, 0, -19.5); fig.visible = false;
  const fh = fig.userData.head; scene.add(fig);

  // ---- som (efeitos): estalos do vidro e a quebra ----
  function glass(kind) {
    const ac = audio.ctx; if (!ac || !audio.out) return;
    const now = ac.currentTime + 0.01, out = ac.createGain(); out.gain.value = kind === 'crack' ? 0.35 : 0.8; out.connect(audio.out);
    const len = Math.floor(ac.sampleRate * (kind === 'crack' ? 0.5 : 1.6)), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { const tt = i / ac.sampleRate; d[i] = (Math.random() * 2 - 1) * (kind === 'crack' ? (Math.random() < 0.004 ? 1 : 0.05) * Math.exp(-tt * 5) : Math.exp(-tt * 3.2) * (0.6 + 0.4 * Math.random())); }
    const s = ac.createBufferSource(); s.buffer = buf; const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = kind === 'crack' ? 1800 : 2600;
    s.connect(hp); hp.connect(out); s.start(now);
    if (kind === 'crack') return;
    for (let i = 0; i < 14; i++) {                                          // tilintar dos cacos
      const o = ac.createOscillator(), g = ac.createGain(), t0 = now + Math.random() * 1.2;
      o.type = 'sine'; o.frequency.value = 2400 + Math.random() * 4200;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.06, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.25 + Math.random() * 0.4);
      o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.8);
    }
  }

  // ---- câmera em 3ª pessoa (botão direito gira/inclina e fica onde o jogador deixou) ----
  const C = { yaw: 0, pitch: 0.28, oy: 0, op: 0, hold: false, dist: 6.2 };
  addEventListener('mousedown', e => { if (S && S.phase === 'walk' && e.button === 2) { C.hold = true; e.preventDefault(); } });
  addEventListener('mouseup', e => { if (e.button === 2) C.hold = false; });
  addEventListener('mousemove', e => { if (C.hold && S && S.phase === 'walk' && (e.buttons & 2)) { C.oy -= e.movementX * 0.005; C.op = Math.max(-0.2, Math.min(1.0, C.op + e.movementY * 0.004)); } });
  addEventListener('contextmenu', e => { if (S) e.preventDefault(); });
  const _l = new THREE.Vector3();
  function chaseCam(dt, snap) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 6);
    let d = walker.heading - C.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; C.yaw += d * k;
    const yaw = C.yaw + C.oy, p = C.pitch + C.op;
    camera.position.set(walker.x - Math.cos(yaw) * Math.cos(p) * C.dist, 1.5 + Math.sin(p) * C.dist, walker.z - Math.sin(yaw) * Math.cos(p) * C.dist);
    camera.lookAt(_l.set(walker.x, 1.35, walker.z));
  }
  const shot = (p, l) => { camera.position.set(...p); camera.lookAt(_l.set(...l)); };
  // câmeras de fora do cubo, presas a onde o jogador parou (u: do cubo para ele; sd: lateral). O FOV fecha com a distância,
  // para o cubo/figura terem no quadro o mesmo tamanho de antes (ref = distância da tomada original) sem mover ninguém.
  const view = { px: 0, pz: 0, ux: 0, uz: 1 };
  function setView() { view.px = walker.x; view.pz = walker.z; const dx = walker.x, dz = walker.z - CZ, l = Math.hypot(dx, dz) || 1; view.ux = dx / l; view.uz = dz / l; }
  function outShot(side, y, back, look, fov) {             // atrás do jogador, um pouco de lado: ele em primeiro plano, o cubo/figura ao fundo
    const sx = view.uz, sz = -view.ux;
    camera.position.set(view.px + sx * side + view.ux * back, y, view.pz + sz * side + view.uz * back);
    camera.lookAt(_l.set(...look));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  let S = null;
  function reset() {
    for (const m of cube.children) if (m !== cracks) m.visible = true;
    cube.visible = true; cracks.visible = false; crackMat.opacity = 0;
    skyMat.uniforms.uOp.value = 1; plainMat.opacity = 1; rMat.opacity = 1; rMat.transparent = false; rMat.needsUpdate = true;
    while (shards.children.length) { const s = shards.children.pop(); s.geometry.dispose(); }
    K.position.copy(K0); K.rotation.y = K_FACE; K.visible = true; K.userData.legs.forEach(l => { l.rotation.z = 0; l.userData.knee.rotation.z = 0; });
    R.position.copy(R0); R.rotation.y = -Math.PI / 2; R.visible = true;
    fig.visible = false; figMat.color.copy(BLACK); figMat.opacity = 0; if (fh) fh.rotation.set(0, 0, 0);
    fig.position.set(0.4, 0, -19.5); fig.rotation.y = -Math.PI / 2; streaks.visible = false;
    camera.fov = 50; camera.updateProjectionMatrix();
  }
  function breakCube() {
    for (const m of cube.children) m.visible = false;
    shardSky.uniforms.uOp.value = 1; shardPlain.opacity = 1;
    const c0 = new THREE.Vector3(0, HALF, CZ);
    for (const { t, plain, n } of faceTris) {
      const ctr = t[0].clone().add(t[1]).add(t[2]).multiplyScalar(1 / 3), geo = new THREE.BufferGeometry(), pos = [], uv = [];
      for (const p of t) { pos.push(p.x - ctr.x, p.y - ctr.y, p.z - ctr.z); uv.push(p.x / E + 0.5, p.z / E + 0.5); }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, plain ? shardPlain : shardSky); m.position.copy(ctr);
      const out = ctr.clone().sub(c0).normalize();
      m.userData = { v: out.multiplyScalar(0.6 + Math.random() * 1.2).add(new THREE.Vector3(0, plain ? -0.5 : 0.4 * Math.random(), 0)), w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5), delay: (plain ? 0.25 : 0) + Math.random() * 0.35 + (E - ctr.y) * 0.02 };
      shards.add(m);
    }
  }

  /** Começa a cena (o jogador já foi passado para cá pelo main). */
  function start() {
    reset();
    scene.add(walker.object); walker.setFloor(0); walker.pose(0, START_Z, -Math.PI / 2); walker.show(true);
    C.yaw = walker.heading; C.oy = 0; C.op = 0; C.hold = false;
    S = { phase: 'walk', t: 0, white: null, wk: 0, fade: 1, stopK: 1, ph: 0 };
    chaseCam(0, true);
    ctx.renderer.localClippingEnabled = true;
  }
  function stop() {
    if (!S) return;
    if (S.white) S.white.restore();                     // a customização nunca foi tocada: só devolve os materiais
    walker.setSpeedMul(1); walker.setFloor(0); stopWhoosh();
    if (S.phase === 'talk2' || S.phase === 'talk3') talkBox.hide();
    S = null; ctx.renderer.localClippingEnabled = false;
  }
  const go = (p) => { S.phase = p; S.t = 0; };

  function update(dt, paused) {
    if (!S || paused) return;
    S.t += dt;
    const ax = S.phase === 'walk' ? input.axis() : { x: 0, z: 0 };
    // aproximação: perto do cubo (antes de entrar), o passo para suave e trava
    if (S.phase === 'walk') {
      S.fade = Math.max(0, S.fade - dt / 1.0);
      const bx = Math.max(0, Math.abs(walker.x) - HALF), bz = Math.max(0, walker.z - FRONT, BACK - walker.z);
      if (Math.hypot(bx, bz) < TRIGGER) { go('stop'); S.stopAx = { x: ax.x, z: ax.z || -1 }; }
    }
    const box = [{ x0: -HALF, x1: HALF, z0: BACK, z1: FRONT }];
    if (S.phase === 'stop') { S.stopK = Math.max(0, 1 - S.t / 0.7); walker.setSpeedMul(S.stopK); walker.update(dt, S.stopK > 0.02 ? S.stopAx : { x: 0, z: 0 }, 'car', box, FAR_VAN); }
    else walker.update(dt, ax, 'car', box, FAR_VAN);
    // branco: só depois do 1º deslocamento de verdade (girar a câmera não conta)
    if (!S.white && Math.hypot(walker.x, walker.z - START_Z) > 0.05) S.white = whitenFade(walker.object);
    if (S.white && !S.white.done) { S.wk = Math.min(1, S.wk + dt / 1.6); S.white.step(S.wk * S.wk * (3 - 2 * S.wk)); }
    // R: respira; K: parado olhando para fora, depois sai andando
    if (talkBox.open && (S.phase === 'talk2' || S.phase === 'talk3')) {   // E/Espaço (ou toque no balão): completa a fala; com ela completa, avança
      talkBox.update(dt); if (S.t > 0.2 && input.action()) talkBox.press();
    }
    const t = S.t;
    RB.torso.scale.y = 1 + 0.01 * Math.sin(performance.now() * 0.002);
    switch (S.phase) {
      case 'walk': chaseCam(dt); break;
      case 'stop':
        chaseCam(dt);
        if (S.t >= 0.95) { walker.setSpeedMul(1); setView(); go('hold'); }   // (o jogador fica onde parou)
        break;
      case 'hold':                                         // câmera de dentro, atrás da R, um pouco à esquerda dela
        shot([2.35 + t * 0.01, 2.55, BACK + 0.25], [-0.7, 1.0, FRONT + 2.5]);
        if (t >= T.hold) go('kexit');
        break;
      case 'kexit': {                                     // o K sai andando pela esquerda da R e some no corte do cubo
        shot([2.4, 2.55, BACK + 0.25], [-0.7, 1.0, FRONT + 2.5]);
        const want = 0.25, tr = Math.min(1, t / 0.7);
        K.rotation.y = K_FACE + (want - K_FACE) * (tr * tr * (3 - 2 * tr));
        if (t > 0.5) {
          const v = 1.25 * Math.min(1, (t - 0.5) / 0.4), hd = -K.rotation.y;
          K.position.x += Math.cos(hd) * v * dt; K.position.z += Math.sin(hd) * v * dt;
          S.ph += dt * 6.2;
          K.userData.legs.forEach((l, i) => { const a = Math.sin(S.ph + i * Math.PI); l.rotation.z = 0.45 * a; l.userData.knee.rotation.z = -0.55 * Math.max(0, -a) - 0.08; });
        }
        if (K.position.x > HALF + 0.9) { K.visible = false; if (!S.kGone) S.kGone = t; }
        if (S.kGone && t - S.kGone > T.kAfter) { go('crack'); glass('crack'); }
        break;
      }
      case 'crack':                                        // fora do cubo: o jogador (branco) e o cubo inteiro; a imagem racha
        outShot(-1.7, 1.95, 9, [0.2, 2.4, CZ], 30);
        cracks.visible = true; crackMat.opacity = Math.min(0.85, t / T.crack);
        if (t >= T.crack) { breakCube(); glass('shatter'); go('fall'); }
        break;
      case 'fall': {                                       // os cacos caem no vazio e somem (sem chão)
        outShot(-1.7, 1.95, 9, [0.2, 2.4 - t * 0.2, CZ], 30);
        rMat.transparent = true; rMat.opacity = Math.max(0, 1 - t / 1.1); R.visible = rMat.opacity > 0.01;
        for (const m of shards.children) {
          const ud = m.userData, tt = t - ud.delay; if (tt <= 0) continue;
          ud.v.y -= 9.8 * dt; m.position.addScaledVector(ud.v, dt);
          m.rotation.x += ud.w.x * dt; m.rotation.y += ud.w.y * dt; m.rotation.z += ud.w.z * dt;
        }
        const op = Math.max(0, 1 - Math.max(0, t - 1.2) / 1.5);
        shardSky.uniforms.uOp.value = op; shardPlain.opacity = op;
        if (t >= T.fall) { shards.visible = true; while (shards.children.length) { const s = shards.children.pop(); s.geometry.dispose(); } go('empty'); }
        break;
      }
      case 'empty':
        outShot(-1.7, 1.95, 9, [0.2, 2.2, CZ], 30);
        if (t >= T.empty) { fig.visible = true; go('rise'); }
        break;
      case 'rise':                                         // a figura aparece (sem brilho, só um preto mais fundo que o vazio)
      case 'talk2': {                                      // diálogo 2 (manual); o movimento só começa depois da última fala
        const k = S.phase === 'rise' ? Math.min(1, t / T.rise) : 1;   // fade-in rápido (≈0,7 s) só na figura: de invisível ao preto
        figMat.opacity = k * k * (3 - 2 * k);
        const u = Math.min(1, S.phase === 'rise' ? t / (T.rise + T.ease) : (T.rise + t) / (T.rise + T.ease));
        const ue = u * u * (3 - 2 * u);
        outShot(-1.7 + 0.5 * ue, 1.25 + 0.15 * ue, 9 - 1.2 * ue, [0.3, 3.2, -18], 34);   // (a figura acima da caixa de fala, o jogador à frente)   // (a figura fica acima da caixa de fala)
        if (fh && S.phase === 'talk2') fh.rotation.y = -0.18 * Math.min(1, t / 2.5);   // a cabeça se inclina de leve para o jogador
        if (S.phase === 'rise' && t >= T.rise) { go('talk2'); talkBox.show(TALK2, () => { if (S && S.phase === 'talk2') startTravel(); }, { hint: HINT }); }
        break;
      }
      case 'travel':                                       // levado para trás por uma força de fora; a figura fica para trás
      case 'talk3':                                        // diálogo 3 (manual): o deslocamento continua o tempo que for
      case 'pull': {
        const tt = (S.tt += dt);
        const a = Math.min(1, tt / 1.6), v = VMAX * a * a * (3 - 2 * a);      // aceleração inicial perceptível
        S.dist += v * dt;
        walker.update(dt, { x: 0, z: 0 }, 'car', [], FAR_VAN);                // parado na pose (só a respiração)
        updateStreaks(dt, v);
        whoosh(0.2 * Math.min(1, tt / 0.8));                  // vento a 40% do anterior (0,5 → 0,2), pelo volume de efeitos
        const F = S.f, P = S.p;
        if (S.phase === 'travel') {                        // a figura original se afasta (continuidade: ela estava ali à frente)
          const o = S.fig0; fig.position.set(o.x + F.x * S.dist, 0, o.z + F.z * S.dist);
          if (t >= T.travel) {                             // exatamente 2 s depois: ela reaparece à frente, subindo de baixo para o quadro
            const k = Math.min(1, (t - T.travel) / T.up), e = 1 - Math.pow(1 - k, 3);
            fig.position.set(P.x + F.x * 14, -FIG_H * 1.15 * (1 - e), P.z + F.z * 14); fig.rotation.y = -Math.atan2(-F.z, -F.x); figMat.opacity = 1;
            if (fh) fh.rotation.y = 0;
          }
          if (t >= T.travel + T.up) {                      // chegou: começa o diálogo 3 (o deslocamento continua)
            go('talk3');
            talkBox.show(TALK3, () => { if (S && S.phase === 'talk3') { go('pull'); S.pullFrom = { x: walker.x, z: walker.z }; } }, { hint: HINT });   // a última fala → o puxão
          }
        }
        // câmera atrás do jogador (costas), olhando para onde ele está virado; tremor leve com a velocidade
        const sh = 0.025 * (v / VMAX) * (S.phase === 'pull' ? 3 : 1), C0 = S.cam;
        camera.position.set(C0.x + (Math.random() - 0.5) * sh, C0.y + (Math.random() - 0.5) * sh, C0.z + (Math.random() - 0.5) * sh);
        camera.lookAt(_l.set(P.x + F.x * 12, 2.6, P.z + F.z * 12));
        const fov = 50 + 7 * (v / VMAX); if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
        if (S.phase === 'pull') {                          // vem de costas, rápido, até atingir a câmera (sem virar nem se preparar)
          const k = Math.min(1, S.t / T.pull), e = k * k * k;   // (S.t: na troca de fase t ainda é o da fase anterior)
          const tx = C0.x + F.x * 0.25, tz = C0.z + F.z * 0.25;
          walker.pose(S.pullFrom.x + (tx - S.pullFrom.x) * e, S.pullFrom.z + (tz - S.pullFrom.z) * e, S.h);
          walker.setFloor((C0.y - 1.25) * e);
          if (k >= 0.97) { impact(); return; }
        }
        break;
      }
    }
  }

  // ---- deslocamento: poucos rastros finos e apagados passando (cauda some no preto) ----
  const SN = 46, sPos = new Float32Array(SN * 6), sCol = new Float32Array(SN * 6), sSeed = [];
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const streaks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  streaks.frustumCulled = false; streaks.visible = false; scene.add(streaks);
  const BLACK = new THREE.Color(0, 0, 0);
  function seedStreak(i, s0) { const r = 2.2 + Math.pow(Math.random(), 0.7) * 24, a = Math.random() * Math.PI * 2; sSeed[i] = { r, a, s: s0, b: 0.22 + Math.random() * 0.25 }; }
  function updateStreaks(dt, v) {
    const F = S.f, P = S.p, sx = -F.z, sz = F.x;
    streaks.visible = true;
    for (let i = 0; i < SN; i++) {
      const q = sSeed[i]; q.s += v * dt;                    // o cenário vai para a frente (o jogador é levado para trás)
      if (q.s > 260) seedStreak(i, -12 - Math.random() * 30);
      const L = Math.min(22, 0.4 + v * 0.06), ox = Math.cos(q.a) * q.r, oy = 1.4 + Math.sin(q.a) * q.r * 0.7;
      const hx = P.x + F.x * q.s + sx * ox, hz = P.z + F.z * q.s + sz * ox, o = i * 6;
      sPos[o] = hx; sPos[o + 1] = oy; sPos[o + 2] = hz;
      sPos[o + 3] = hx - F.x * L; sPos[o + 4] = oy; sPos[o + 5] = hz - F.z * L;
      const c = q.b * Math.min(1, v / 60);
      sCol[o] = sCol[o + 1] = sCol[o + 2] = c * 0.95 + 0.04; sCol[o + 4] = BG.g; sCol[o + 3] = BG.r; sCol[o + 5] = BG.b;
    }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
  }
  function startTravel() {
    const h = walker.heading, F = new THREE.Vector3(Math.cos(h), 0, Math.sin(h));
    S.f = F; S.h = h; S.p = { x: walker.x, z: walker.z }; S.dist = 0; S.tt = 0;
    S.cam = new THREE.Vector3(walker.x - F.x * 5.6, 2.15, walker.z - F.z * 5.6);
    S.fig0 = fig.position.clone();
    for (let i = 0; i < SN; i++) seedStreak(i, -40 + Math.random() * 300);
    go('travel');
    ctx.onTravel && ctx.onTravel();                     // a música do deslocamento começa neste instante
  }
  // vento abafado do deslocamento (efeitos; WebAudio, sem arquivo)
  let W = null;
  function whoosh(level) {
    const ac = audio.ctx; if (!ac || !audio.out) return;
    if (!W) {
      const len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let b = 0;
      for (let i = 0; i < len; i++) { b = 0.97 * b + 0.03 * (Math.random() * 2 - 1); d[i] = b * 3; }
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 0.7;
      const g = ac.createGain(); g.gain.value = 0; src.connect(f); f.connect(g); g.connect(audio.out); src.start(); W = { src, f, g };
    }
    try { W.g.gain.setTargetAtTime(level, ac.currentTime, 0.15); W.f.frequency.setTargetAtTime(200 + 260 * level, ac.currentTime, 0.3); } catch (e) { /* */ }
  }
  function stopWhoosh() { if (!W) return; try { W.src.stop(); W.g.disconnect(); } catch (e) { /* */ } W = null; }
  /** Impacto: tira a foto desta imagem, salva o extra 1 e entrega a foto para a quebra da tela (main → tela inicial por trás). */
  function impact() {
    ctx.renderer.render(scene, camera);
    const dom = ctx.renderer.domElement, snap = document.createElement('canvas'); snap.width = dom.width; snap.height = dom.height;
    try { snap.getContext('2d').drawImage(dom, 0, 0); } catch (e) { /* */ }
    try { localStorage.setItem(EXTRA1_KEY, '1'); } catch (e) { /* */ }
    stopWhoosh(); glass('shatter'); thud();
    const cb = ctx.onShatter; stop(); cb && cb(snap, dom.getBoundingClientRect());
  }
  function thud() {
    const ac = audio.ctx; if (!ac || !audio.out) return;
    const now = ac.currentTime + 0.005, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(90, now); o.frequency.exponentialRampToValueAtTime(35, now + 0.5);
    g.gain.setValueAtTime(0.9, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.9); o.connect(g); g.connect(audio.out); o.start(now); o.stop(now + 1);
  }

  return {
    scene, camera, start, stop, update,
    get active() { return !!S; }, get phase() { return S ? S.phase : ''; }, get t() { return S ? S.t : 0; },
    get fade() { return S ? S.fade : 0; }, get white() { return S ? S.wk : 0; },
    get locked() { return !!S && S.phase !== 'walk'; },
    get figPos() { return fig.position.clone(); }, get camPos() { return camera.position.clone(); },
    _K: K, _R: R, _fig: fig, _shards: shards, _cube: cube,
    _jump(p) { if (!S) return; if (p !== 'walk' && !S.white) { S.white = whitenFade(walker.object); S.wk = 1; S.white.step(1); } if (p === 'travel') { fig.visible = true; figMat.opacity = 1; startTravel(); } else go(p); S.fade = 0; },
  };
}

/** A própria visão se quebra: a foto da última imagem vira estilhaços (raios + anéis a partir do ponto do impacto) que voam
 *  na direção de quem olha, giram, caem e somem, revelando o que já está por trás (o menu). Canvas 2D por cima de tudo. */
export function screenShatter(snap, rect, done, at = null) {   // (at: testes — desenha só aquele instante, parado)
  const cv = document.createElement('canvas'), dpr = snap.width / Math.max(1, rect.width);
  cv.width = snap.width; cv.height = snap.height;
  cv.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:9999;pointer-events:none`;
  document.body.appendChild(cv);
  const g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W * 0.5, cy = H * 0.47, D = Math.hypot(W, H);
  const SP = 15, RINGS = [0, 0.045, 0.12, 0.24, 0.42, 0.75];
  const ang = Array.from({ length: SP }, (_, i) => (i + 0.5 + (Math.random() - 0.5) * 0.7) / SP * Math.PI * 2);
  const pt = (ri, si) => { if (ri === 0) return [cx, cy]; const r = RINGS[ri] * D * (1 + (Math.random() - 0.5) * 0.25), a = ang[si % SP]; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const grid = RINGS.map((_, ri) => Array.from({ length: SP }, (_, si) => pt(ri, si)));
  const shards = [];
  for (let ri = 0; ri < RINGS.length - 1; ri++) for (let si = 0; si < SP; si++) {
    const a = grid[ri][si], b = grid[ri][(si + 1) % SP], c = grid[ri + 1][(si + 1) % SP], d = grid[ri + 1][si];
    const poly = ri === 0 ? [a, c, d] : [a, b, c, d];
    const mx = poly.reduce((s, p) => s + p[0], 0) / poly.length, my = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1, sp = (0.25 + Math.random() * 0.5) * H;
    shards.push({ poly: poly.map(p => [p[0] - mx, p[1] - my]), x: mx, y: my, vx: dx / dl * sp, vy: dy / dl * sp - H * 0.15 * Math.random(), r: 0, w: (Math.random() - 0.5) * 5, s: 1, ws: 0.5 + Math.random() * 0.9, delay: ri * 0.025 + Math.random() * 0.03 });
  }
  const t0 = performance.now(), CRACK = 0.11, END = 1.45;
  function frame() {
    const t = at != null ? at : (performance.now() - t0) / 1000;
    g.clearRect(0, 0, W, H);
    if (t < CRACK) {                                   // o instante do impacto: a imagem inteira, rachada
      g.drawImage(snap, 0, 0);
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5 * dpr;
      for (const s of shards) { g.beginPath(); s.poly.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, s.x + p[0], s.y + p[1])); g.closePath(); g.stroke(); }
    } else {
      const tt = t - CRACK;
      for (const s of shards) {
        const k = Math.max(0, tt - s.delay);
        const x = s.x + s.vx * k, y = s.y + s.vy * k + 0.5 * H * 2.2 * k * k, sc = 1 + s.ws * k, rot = s.w * k;
        const op = Math.max(0, 1 - Math.max(0, k - 0.3) / 0.85); if (op <= 0) continue;
        g.save(); g.globalAlpha = op; g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
        g.beginPath(); s.poly.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, p[0], p[1])); g.closePath();
        g.save(); g.clip(); g.drawImage(snap, -s.x, -s.y); g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1.2 * dpr / sc; g.stroke();
        g.restore();
      }
    }
    if (at != null) return cv;
    if (t < CRACK + END) requestAnimationFrame(frame); else { cv.remove(); done && done(); }
  }
  return frame();
}
