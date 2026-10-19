// Nível 24 (Medieval): a vida do burgo. Moradores com pequenas rotinas em lugares concretos do plano (comerciantes nas
// barracas, quem vai ao mercado com o cesto, varredores, quem busca água na bica da fonte, vizinhos conversando, idosos nos
// bancos da praça, carregador entre o depósito e a taverna/padaria, quem rega as floreiras, guardas no portão e no castelo,
// padeiro, ferreiro, tecelã, taverneira e crianças brincando em volta da fonte), 2 carroças (createTractors), nuvens
// cinzentas, fumaça das chaminés, bandeiras/tecidos/água/forja animados, pássaros e os sons do lugar (medievalAudio.js).
// Os moradores andam pelas calçadas (grafo V.walk, filtrado: nada atravessa lotes, sólidos, pontos de entrega ou postes),
// param diante de obstáculos (van, personagem, outros moradores, carroças) e esperam (ou contornam); não ficam parados nos
// pontos de entrega nem perto da casa onde a van está entregando. Casa ou trabalho destruídos: a pessoa some.
// LOD: além de ~90 do ouvinte a pessoa some (a rotina continua barata); membros animados só até ~55.
import * as THREE from 'three';
import { SOLIDS } from './layout.js';
import { HOUSES } from './data.js';
import { createTractors } from './tractors.js';
import { buildMedPerson, animatePerson, buildCart, buildItem } from './models/medievalPeople.js';
import { createMedievalAudio } from './medievalAudio.js';

const FAR = 90, ANIM = 55, SHADOW = 40, TALK_R = 2.2, R_NPC = 0.35;
const WIND = { x: 0.92, z: 0.38 };
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const angTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---- falas (curtas, do dia a dia; preocupações de cada um, nada de pistas) ----
const LINES = {
  food: ['Pão, maçãs e queijo da serra! Tudo fresco hoje.', 'Se o vento parar, eu arrumo as frutas de novo.', 'As maçãs vieram do pomar do moinho. Estão docinhas.',
    'O queijo acaba antes do meio-dia. Sempre.', 'Uma criança levou uma maçã sem pagar. Deixei: era a mais feia.'],
  cloth: ['Esse azul foi tingido com flores do campo.', 'Cuidado ao passar: acabei de dobrar tudo.', 'Tecido bom aguenta muitos invernos.',
    'A chuva de ontem molhou dois rolos. Estão secando lá dentro.', 'Todo mundo pergunta pelo vermelho. Ninguém compra o vermelho.'],
  tools: ['Panela de ferro boa dura a vida inteira.', 'Precisa de um prego? Tenho de todos os tamanhos.', 'O ferreiro me mandou umas facas novas hoje.',
    'Vendi três martelos hoje e nenhuma panela. Semana estranha.'],
  buyer: ['Prometi levar esse cesto antes do almoço.', 'Ainda falta comprar o queijo. Quase esqueci!', 'O pão daqui é o melhor do burgo.',
    'Minha lista tem cinco coisas, e eu só lembro de três.', 'Se eu voltar sem os ovos, nem preciso voltar.'],
  sweeper: ['Tomara que não chova antes de eu recolher as roupas.', 'Folha que o vento traz, a vassoura leva.', 'Gosto da frente da casa bem varrida.',
    'Varro de manhã, varro de tarde. A rua não colabora.', 'Esta vassoura era da minha avó. Ainda varre melhor que as novas.'],
  water: ['A água da fonte é a mais fresca do burgo.', 'Balde cheio pesa, mas faz bem para os braços.', 'Hoje tem sopa. Precisa de muita água!',
    'Já é a terceira viagem. A panela grande bebe muita água.'],
  chat: ['Você soube? A filha do moleiro vai se casar na primavera.', 'Estamos só colocando a conversa em dia.', 'Dizem que vai ter festa no castelo no fim do mês.',
    'O preço do sal subiu de novo. Ninguém sabe por quê.', 'Ela jura que viu um gato na torre. Eu acho que era um corvo.'],
  elder: ['Daqui eu vejo o burgo inteiro passar.', 'No meu tempo, a fonte fazia ainda mais barulho.', 'Sente um pouco. O banco é grande.',
    'Conto as carroças que passam. Hoje já foram onze.', 'Meus joelhos avisam a chuva antes do céu.'],
  porter: ['Mais um caixote para a taverna. Depois eu descanso.', 'Esses caixotes ficam mais pesados depois do meio-dia.', 'Farinha para a padaria, cerveja para a taverna. Assim é o dia.',
    'Se eu derrubar este, a taverneira me põe para lavar canecas.'],
  gardener: ['Essas flores gostam de sol, mas hoje só tem nuvem.', 'Um pouco de água todo dia, e elas ficam felizes.', 'As floreiras são o orgulho da rua.',
    'Os pássaros comem as sementes antes de elas nascerem.'],
  guard: ['Tudo calmo no portão. Do jeito que eu gosto.', 'Cuidado com as carroças na subida.', 'Bom dia! Entregas são sempre bem-vindas no burgo.',
    'Essa sua carroça sem cavalo passou e o portão nem rangeu.', 'Minha lança está mais limpa que as minhas botas.'],
  guard2: ['O castelo está tranquilo hoje.', 'Daqui de cima dá para ver todos os telhados.', 'Ninguém entra sem avisar. Nem as galinhas.',
    'Troca de guarda só ao pôr do sol. Ainda falta muito.'],
  baker: ['Hoje a farinha chegou cedo. Ainda bem.', 'O forno está quente desde antes de o galo cantar.', 'Sinta o cheiro! A próxima fornada sai já, já.',
    'Pão queimado eu dou para os pássaros. Eles nunca reclamam.'],
  smith: ['Estou tentando consertar essa dobradiça desde ontem.', 'Cuidado com as faíscas!', 'Ferro quente não espera. Com licença!',
    'Ferradura nova para o cavalo da carroça. Ele não para quieto para provar.'],
  weaver: ['Dobrar tecido também é uma arte.', 'Esse vermelho vai virar o estandarte de alguém.', 'O vento de hoje está bagunçando meus panos.',
    'Um fio solto, e o tecido inteiro reclama.'],
  keeper: ['Hoje tem sopa de legumes. Passe mais tarde!', 'Caneca limpa, freguês feliz.', 'À noite a taverna fica cheia de histórias.',
    'Alguém esqueceu um chapéu aqui ontem. Ninguém veio buscar.'],
  child: ['Pega! Agora é você!', 'A gente está brincando de pega-pega em volta da fonte!', 'Quando eu crescer, vou ser guarda do castelo!',
    'Sua carroça não tem cavalo! Onde ele está?'],
  walker: ['Vou visitar minha irmã. Ela mora aqui perto.', 'Que dia cinzento! Mas o burgo está animado.', 'Já viu o castelo de perto? Vale a subida.',
    'Esqueci aonde eu ia. Vou andando até lembrar.'],
  browser: ['Só estou olhando. Tudo é tão bonito aqui!', 'Vim ver se chegaram tecidos novos.', 'Adoro o barulho da fonte.',
    'Se eu comprar mais um cesto, não cabe em casa.'],
  local: ['Vou ali na vizinha devolver uma panela.', 'Bom dia! A rua está movimentada hoje.', 'Esqueci o xale na casa da minha tia. De novo!',
    'Levo este pão para a vizinha. Ela me deve um favor, e eu devo dois.'],
  child2: ['Mamãe disse que hoje tem pão doce!', 'Eu ajudo a escolher as maçãs.', 'Olha a fonte! Ela nunca para de jorrar.',
    'Eu sei contar até cem. Quer ver? Um, dois…'],
};

// ---- caminhos a pé: grafo das calçadas sem as arestas que atravessam sólidos ou passam nos pontos de entrega ----
function makeRouter(V) {
  const N = V.walk.nodes, solids = V.solids, lamps = V.lamps;
  const lots = V.spots.map(sp => ({ px: sp.px, pz: sp.pz, c: Math.cos(sp.ry), s: Math.sin(sp.ry), hw: sp.w / 2, hd: sp.d / 2, r: Math.hypot(sp.w, sp.d) / 2 + 1 }));
  // baldes de 8 m: cada consulta só olha os obstáculos (lotes, sólidos, postes) e as arestas por perto
  const CELL = 8, NC = Math.ceil(300 / CELL) + 2, cellOf = (x, z) => (clamp(Math.floor(x / CELL) + 1, 0, NC - 1)) * NC + clamp(Math.floor(z / CELL) + 1, 0, NC - 1);
  const buckets = Array.from({ length: NC * NC }, () => ({ lots: [], solids: [], lamps: [], edges: [] }));
  const put = (x0, z0, x1, z1, key, o) => { for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz++) { const k = clamp(cx + 1, 0, NC - 1) * NC + clamp(cz + 1, 0, NC - 1); if (!buckets[k][key].includes(o)) buckets[k][key].push(o); } };
  for (const L of lots) put(L.px - L.r - 0.6, L.pz - L.r - 0.6, L.px + L.r + 0.6, L.pz + L.r + 0.6, 'lots', L);
  for (const b of solids) put(b.x0 - 0.6, b.z0 - 0.6, b.x1 + 0.6, b.z1 + 0.6, 'solids', b);
  for (const l of lamps) put(l.x - 1, l.z - 1, l.x + 1, l.z + 1, 'lamps', l);
  function inLot(x, z, m) {
    for (const L of buckets[cellOf(x, z)].lots) {
      const dx = x - L.px, dz = z - L.pz; if (dx * dx + dz * dz > (L.r + m) * (L.r + m)) continue;
      const lx = dx * L.c - dz * L.s, lz = dx * L.s + dz * L.c;
      if (Math.abs(lx) < L.hw + m && Math.abs(lz) < L.hd + m) return true;
    }
    return false;
  }
  const inSolid = (x, z, m) => buckets[cellOf(x, z)].solids.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
  const nearLamp = (x, z, m) => buckets[cellOf(x, z)].lamps.some(l => (x - l.x) * (x - l.x) + (z - l.z) * (z - l.z) < (0.28 + m) * (0.28 + m));
  const blocked = (x, z, m = 0.3) => inSolid(x, z, m) || nearLamp(x, z, m) || inLot(x, z, m - 0.02);
  function clear(ax, az, bx, bz, m = 0.3) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.3));
    for (let k = 0; k <= n; k++) if (blocked(ax + (bx - ax) * k / n, az + (bz - az) * k / n, m)) return false;
    return true;
  }
  const segD = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = clamp(((px - a.x) * dx + (pz - a.z) * dz) / L2, 0, 1); return Math.hypot(px - a.x - dx * t, pz - a.z - dz * t); };
  const doors = V.spots.map(sp => sp.door);
  const E = [];
  for (const [i, j] of V.walk.edges) {
    const a = N[i], b = N[j], L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.3));
    let ok = true;
    for (let k = 0; k <= n && ok; k++) if (inSolid(a.x + (b.x - a.x) * k / n, a.z + (b.z - a.z) * k / n, 0.38)) ok = false;
    if (ok && doors.some(d => segD(d.x, d.z, a, b) < 1.3)) ok = false;
    if (ok) E.push([i, j, L]);
  }
  const adj = N.map(() => []);
  E.forEach(([i, j, L], e) => { adj[i].push(j, L, e); adj[j].push(i, L, e); put(Math.min(N[i].x, N[j].x) - 1, Math.min(N[i].z, N[j].z) - 1, Math.max(N[i].x, N[j].x) + 1, Math.max(N[i].z, N[j].z) + 1, 'edges', e); });
  const hitsAvoid = (ax, az, bx, bz, avoid) => avoid.some(o => segD(o[0], o[1], { x: ax, z: az }, { x: bx, z: bz }) < o[2] + 0.45);
  /** Saída de quem está parado junto do obstáculo: vale se não chega mais perto dele. */
  const leavesOk = (ax, az, bx, bz, avoid) => avoid.every(o => {
    const d0 = Math.hypot(ax - o[0], az - o[1]);
    if (d0 >= o[2] + 0.5) return segD(o[0], o[1], { x: ax, z: az }, { x: bx, z: bz }) >= o[2] + 0.45;
    return segD(o[0], o[1], { x: ax, z: az }, { x: bx, z: bz }) > Math.min(d0, o[2] + 0.45) - 0.05;
  });
  /** Ponto mais perto numa aresta (com caminho livre até ela; avoid: círculos [x, z, r] a evitar). */
  function snap(x, z, avoid) {
    const c = [], near = new Set();
    for (let r = 1; r <= 3 && near.size < 6; r++) {                              // arestas dos baldes em volta (mais longe só se precisar)
      near.clear(); const cx = Math.floor(x / CELL) + 1, cz = Math.floor(z / CELL) + 1;
      for (let a = cx - r; a <= cx + r; a++) for (let b = cz - r; b <= cz + r; b++) if (a >= 0 && b >= 0 && a < NC && b < NC) for (const e of buckets[a * NC + b].edges) near.add(e);
    }
    const list = near.size >= 6 ? near : E.keys();
    for (const e of list) {
      const [i, j, L] = E[e], a = N[i], b = N[j], dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (L * L || 1), 0, 1);
      const px = a.x + dx * t, pz = a.z + dz * t; c.push({ e, i, j, t, L, px, pz, d: Math.hypot(x - px, z - pz) });
    }
    c.sort((p, q) => p.d - q.d);
    for (let k = 0; k < Math.min(c.length, avoid ? 40 : 14); k++) {
      if (avoid && (hitsAvoid(N[c[k].i].x, N[c[k].i].z, N[c[k].j].x, N[c[k].j].z, avoid) || !leavesOk(x, z, c[k].px, c[k].pz, avoid))) continue;
      if (c[k].d < 0.05 || clear(x, z, c[k].px, c[k].pz, 0.25)) return c[k];
    }
    return avoid ? null : c[0];
  }
  const cache = new Map();
  /** Caminho a pé de A a B: [{x, z}, …] (Dijkstra pelas calçadas; postes contornados). avoid: obstáculos do momento (sem cache). */
  function path(ax, az, bx, bz, avoid = null) {
    const key = Math.round(ax * 2) + ',' + Math.round(az * 2) + '>' + Math.round(bx * 2) + ',' + Math.round(bz * 2);
    const hit = !avoid && cache.get(key);
    if (hit) { const out = hit.map(p => ({ x: p.x, z: p.z })); out[0] = { x: ax, z: az }; out[out.length - 1] = { x: bx, z: bz }; return out; }
    const A = snap(ax, az, avoid), B = snap(bx, bz, avoid);
    if (!A || !B) return null;
    const pts = [{ x: ax, z: az }, { x: A.px, z: A.pz }];
    if (A.e !== B.e) {
      const n = N.length, dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
      const bad = avoid ? new Uint8Array(E.length) : null;
      if (avoid) E.forEach(([i, j], e) => { if (hitsAvoid(N[i].x, N[i].z, N[j].x, N[j].z, avoid)) bad[e] = 1; });
      dist[A.i] = A.t * A.L; dist[A.j] = (1 - A.t) * A.L;
      for (;;) {
        let u = -1, bd = Infinity; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; u = i; }
        if (u < 0) break; done[u] = 1; if (done[B.i] && done[B.j]) break;
        const a = adj[u]; for (let k = 0; k < a.length; k += 3) { if (bad && bad[a[k + 2]]) continue; const v = a[k], d = dist[u] + a[k + 1]; if (d < dist[v]) { dist[v] = d; prev[v] = u; } }
      }
      const g = dist[B.i] + B.t * B.L <= dist[B.j] + (1 - B.t) * B.L ? B.i : B.j, seq = [];
      if (!isFinite(dist[g])) return avoid ? null : [{ x: ax, z: az }, { x: bx, z: bz }];
      for (let u = g; u >= 0; u = prev[u]) seq.unshift(u);
      for (const u of seq) pts.push({ x: N[u].x, z: N[u].z });
    }
    pts.push({ x: B.px, z: B.pz }, { x: bx, z: bz });
    const out = [pts[0]];
    for (const p of pts) if (Math.hypot(p.x - out[out.length - 1].x, p.z - out[out.length - 1].z) > 0.12) out.push(p);
    if (out.length === 1) out.push({ x: bx, z: bz });
    const det = [out[0]];                                                  // postes no caminho: contorna pelo lado da rua
    for (let k = 1; k < out.length; k++) {
      const a = out[k - 1], b = out[k];
      for (const l of lamps) {
        if (segD(l.x, l.z, a, b) > 0.72 || Math.hypot(l.x - b.x, l.z - b.z) < 0.5) continue;
        const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
        const side = V.roadDist(l.x + nx, l.z + nz) < V.roadDist(l.x - nx, l.z - nz) ? 1 : -1;
        for (const sd of [side, -side]) { const px = l.x + nx * sd * 0.8, pz = l.z + nz * sd * 0.8; if (!blocked(px, pz, 0.2)) { det.push({ x: px, z: pz }); break; } }
      }
      det.push(b);
    }
    if (!avoid) { if (cache.size > 3000) cache.clear(); cache.set(key, det); }
    return det.map(p => ({ x: p.x, z: p.z }));
  }
  return { path, blocked, clear, inLot, snap, E, N };
}

// ---- texturas e efeitos ----
function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  for (const [x, y, r, a] of [[32, 34, 22, 0.9], [22, 30, 14, 0.7], [42, 28, 15, 0.7], [30, 22, 13, 0.6]]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Partículas em billboard numa só malha instanciada, com opacidade por instância. */
function makeParticles(n, map, color, opts = {}) {
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, ...opts });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute float aAlpha;\nvarying float vAlpha;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
    sh.fragmentShader = 'varying float vAlpha;\n' + sh.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vAlpha;');
  };
  mat.customProgramCacheKey = () => 'medParticles';
  const alpha = new THREE.InstancedBufferAttribute(new Float32Array(n), 1); alpha.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aAlpha', alpha);
  const im = new THREE.InstancedMesh(geo, mat, n); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0;
  return { im, alpha };
}

export function createMedievalLife(audio) {
  const root = new THREE.Group(); root.name = 'medieval-life';
  const snd = createMedievalAudio(audio);
  let V = null, W = null, router = null, ready = false, laid = false, t = 0, ctxRef = null;
  const npcs = [];
  let carts = null; const cartObjs = []; let cartIdx = 0;
  const doors = new Map();                         // spot → { obj, ang, target, closeAt }
  const scanCache = new Map();
  let sceneMarks = { flag: [], cloth: [], water: [], forge: [], smoke: [] };
  let lotMarks = { flag: [], cloth: [], water: [], forge: [], smoke: [] };
  let emitters = [];
  const fount = { lock: null };
  let clouds = null, birds = null, smoke = null, sparks = null;
  const destroyed = new Set();
  let destroyT = 0, stepBudget = 0, chirpT = 4;
  const cam = { x: 0, z: 0, rx: 1, rz: 0 };
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _e = new THREE.Euler();

  // ---------- auxiliares de lote ----------
  const LW = (sp, lx, lz) => { const c = Math.cos(sp.ry), s = Math.sin(sp.ry); return { x: sp.px + lx * c + lz * s, z: sp.pz - lx * s + lz * c }; };
  const doorstep = sp => LW(sp, sp.doorX, sp.wallZ + 0.45);
  const indoor = sp => LW(sp, sp.doorX, sp.wallZ - 0.7);
  const SW = (st, lx, lz) => { const c = Math.cos(st.ry), s = Math.sin(st.ry); return { x: st.x + lx * c + lz * s, z: st.z - lx * s + lz * c }; };
  const H = (x, z) => V.h(x, z);
  const busy = () => (ctxRef && ctxRef.busySpot != null ? ctxRef.busySpot : -1);
  let busyVal = -1, busySince = 0;
  const busyStable = () => (busyVal >= 0 && t - busySince > 1.0 ? busyVal : -1);   // a van parou mesmo ali (não só passando)
  const isDead = s => s >= 0 && destroyed.has(s);

  // ---------- passos (macros) ----------
  const exitH = (s, give = []) => { const sp = V.spots[s], ins = indoor(sp); return [{ t: 'hold', spot: s }, { t: 'door', s, open: true, wait: true }, { t: 'place', x: ins.x, z: ins.z, ry: sp.ry, lot: s }, ...give, { t: 'show', spot: s }, { t: 'line', pts: [doorstep(sp), sp.front], nt: true, lot: s }, { t: 'doorClose', s, delay: 0.3 }]; };
  const exitShop = (s, give = []) => { const sp = V.spots[s], ins = indoor(sp); return [{ t: 'hold', spot: s }, { t: 'door', s, open: true, wait: true }, { t: 'place', x: ins.x, z: ins.z, ry: sp.ry, lot: s }, ...give, { t: 'show', spot: s }, { t: 'line', pts: [doorstep(sp)], nt: true, lot: s }, { t: 'doorClose', s, delay: 0.4 }]; };
  const enterLocal = s => { const sp = V.spots[s]; return [{ t: 'line', pts: [doorstep(sp)], nt: true, lot: s }, { t: 'face', ry: sp.ry + Math.PI }, { t: 'door', s, open: true, wait: true }, { t: 'line', pts: [indoor(sp)], nt: true, lot: s }, { t: 'hide', spot: s }, { t: 'doorClose', s, delay: 0.2 }]; };
  const enterH = s => [{ t: 'go', x: V.spots[s].front.x, z: V.spots[s].front.z, spot: s }, ...enterLocal(s)];

  // ---------- rotinas por papel ----------
  const PLANS = {
    guardGate() {
      const G = V.guard, st = [];
      for (const p of [G.a, G.b]) st.push({ t: 'go', x: p.x, z: p.z, slow: 0.8 }, { t: 'face', x: G.look.x, z: G.look.z }, { t: 'idle', dur: rnd(4, 9), look: G.look });
      if (Math.random() < 0.3) st.push({ t: 'act', act: 'stretch', dur: 3 });
      return st;
    },
    guardCastle(n) {
      const c = V.castle, z = c.court.z1 - 2.6, a = { x: c.gateX - 3.6, z }, b = { x: c.gateX - 9.5, z };
      return [{ t: 'line', pts: [a], slow: 0.8 }, { t: 'face', ry: Math.PI }, { t: 'idle', dur: rnd(7, 13), look: 'around' }, { t: 'line', pts: [b], slow: 0.8 }, { t: 'face', ry: Math.PI + 0.4 }, { t: 'idle', dur: rnd(3, 6), look: 'around' }];
    },
    merchant(n) {
      const S = n.stall, st = [];
      for (let k = 0; k < 3; k++) {
        const x = [-0.7, 0, 0.6][Math.floor(Math.random() * 3)], p = SW(S, x, -0.1), w = SW(S, x, 0.55);
        st.push({ t: 'line', pts: [p] }, { t: 'face', ry: S.ry }, { t: 'act', act: 'arrange', dur: rnd(3, 7), work: { x: w.x, y: H(w.x, w.z) + 0.99, z: w.z } }, { t: 'idle', dur: rnd(2, 5), look: 'around' });
        if (Math.random() < 0.35) st.push({ t: 'act', act: 'talk', dur: 2.2, talk: true });
      }
      if (Math.random() < 0.4) { const p = SW(S, 1.4, -0.3); st.push({ t: 'line', pts: [SW(S, 0.9, -0.15), p] }, { t: 'face', ry: S.ry }, { t: 'sit', dur: rnd(6, 12), seat: 0.45 }, { t: 'line', pts: [SW(S, 0.6, -0.1)] }); }   // banquinho do vendedor
      return st;
    },
    buyer(n) {
      const s = n.home, opts = n.foodStalls.filter(S => S.merchant && !S.merchant.dead); const S = opts.length ? opts[Math.floor(Math.random() * opts.length)] : V.stalls[0];
      const cp = SW(S, n.custX, 1.9);
      return [...exitH(s, [{ t: 'give', name: 'basket', where: 'L', full: false }]), { t: 'go', x: cp.x, z: cp.z }, { t: 'face', ry: S.ry + Math.PI },
        { t: 'until', fn: () => !S.serve || S.serve.who === n, max: 25, look: 'around' },
        { t: 'call', fn: () => { S.serve = { who: n, done: false, t0: -1 }; } },
        { t: 'until', fn: () => !S.serve || S.serve.who !== n || S.serve.done, max: 14, act: 'listen' },
        { t: 'call', fn: () => { if (S.serve && S.serve.who === n) S.serve = null; const b = n.P.items.basket; if (b) b.userData.setFull(true); } },
        { t: 'idle', dur: 0.8 }, ...enterH(s), { t: 'inside', dur: rnd(8, 20) }];
    },
    sweeper(n) {
      const s = n.home, sp = V.spots[s], xs = shuffle([-3.4, 0.3, 2.6]), A = LW(sp, xs[0], 6.2), B = LW(sp, xs[1], 6.2), sg = xs[1] > xs[0] ? 1 : -1;
      const sweepAt = (p, x) => [{ t: 'line', pts: [p], spot: s }, { t: 'face', ry: sp.ry + (Math.PI / 2 - 0.35) * sg }, { t: 'call', fn: () => showDirt(n, LW(sp, x + 0.75 * sg, 6.3)) },
        { t: 'act', act: 'sweep', dur: rnd(5, 8), spot: s, body: 'broom' }];
      return [...exitH(s, [{ t: 'give', name: 'broom', where: 'R' }]), ...sweepAt(A, xs[0]), ...sweepAt(B, xs[1]),
        { t: 'give', name: 'broom', where: 'body' }, { t: 'give', name: 'pan', where: 'body' }, { t: 'act', act: 'gather', dur: 3.4, spot: s, gather: true }, { t: 'drop', name: 'pan' },
        { t: 'call', fn: () => hideDirt(n) }, { t: 'give', name: 'broom', where: 'R' }, ...enterLocal(s), { t: 'inside', dur: rnd(15, 35) }];
    },
    water(n) {
      const s = n.home, F = V.F, spout = { x: F.x, z: F.z + 4.85 }, q = { x: F.x + (n.qSide || 1) * 1.75, z: F.z + 4.75 };
      return [...exitH(s, [{ t: 'give', name: 'bucket', where: 'R', full: false }]), { t: 'go', x: q.x, z: q.z },
        { t: 'until', fn: () => !fount.lock || fount.lock === n || fount.lock.dead || fount.lock.inside, max: 40, look: { x: F.x, z: F.z } },
        { t: 'call', fn: () => { fount.lock = n; } }, { t: 'line', pts: [spout] }, { t: 'face', x: F.x, z: F.z },
        { t: 'act', act: 'fill', dur: 4.6, body: 'bucket', fill: true }, { t: 'give', name: 'bucket', where: 'R' },
        { t: 'call', fn: () => { if (fount.lock === n) fount.lock = null; } }, { t: 'line', pts: [q] },
        { t: 'go', x: V.spots[s].front.x, z: V.spots[s].front.z, spot: s, slow: 0.8 }, ...enterLocal(s), { t: 'inside', dur: rnd(10, 25) }];
    },
    chat(n) {
      const pr = n.pair, me = n.pairIdx, other = pr.npcs[1 - me];
      n.cycle = (n.cycle || 0) + 1;
      const M = pr.meets[n.cycle] || (pr.meets[n.cycle] = { D: rnd(18, 30), arrived: [false, false], start: -1, ended: false });
      delete pr.meets[n.cycle - 2];
      const pos = pr.at[me], oth = pr.at[1 - me];
      const st = [...exitH(n.home), { t: 'go', x: pos.x, z: pos.z }, { t: 'face', x: oth.x, z: oth.z }, { t: 'call', fn: () => { M.arrived[me] = true; } },
        { t: 'until', fn: () => M.arrived[1 - me] || other.dead, max: 60, look: oth }, { t: 'converse', M, me, other }, { t: 'act', act: 'wave', dur: 1.5 }];
      if (me === 0 && pr.visit >= 0 && !isDead(pr.visit)) st.push(...visit(pr.visit), ...enterH(n.home), { t: 'inside', dur: rnd(10, 20) });
      else st.push(...enterH(n.home), { t: 'inside', dur: rnd(18, 35) });
      return st;
    },
    elder(n) { return [{ t: 'sit', dur: rnd(25, 50) }, { t: 'act', act: 'stretch', dur: 3, sit: true }]; },
    porter(n) {
      const D = V.depot.door, st = [];
      for (const [key, item] of shuffle([['tavern', 'crate'], ['bakery', 'sack']])) {
        const sp = V.shops[key], s = V.spots.indexOf(sp); if (isDead(s)) continue;
        st.push({ t: 'place', x: D.x + 0.3, z: D.z, ry: -Math.PI / 2 }, { t: 'give', name: item, where: 'body' }, { t: 'show', spot: -1 },
          { t: 'go', x: sp.front.x, z: sp.front.z, spot: s, slow: 0.85 }, { t: 'call', fn: () => { n.curSpot = s; } }, ...enterLocal(s), { t: 'drop' }, { t: 'inside', dur: rnd(4, 7), spot: s },
          ...exitH(s), { t: 'call', fn: () => { n.curSpot = -1; } }, { t: 'go', x: D.x, z: D.z }, { t: 'face', ry: Math.PI / 2 }, { t: 'hide', spot: -1 }, { t: 'inside', dur: rnd(5, 9) });
      }
      if (!st.length) st.push({ t: 'inside', dur: 10 });
      return st;
    },
    gardener(n) {
      const s = n.home, sp = V.spots[s], h = HOUSES[ctxGame.layout[s]] || {};
      let gv = (h.index || 0) % 3; if (h.ivy && gv === 0) gv = 1 + ((h.index || 0) % 2);                  // as janelas da casa (com as floreiras)
      const xs = [[2.3, -3.6], [1.15, 3.4], [2.55]][gv].concat(h.flower ? [] : [-2.7]), st = [...exitH(s, [{ t: 'give', name: 'can', where: 'R' }])];
      for (const x of xs) st.push({ t: 'line', pts: [LW(sp, x, 6.15)], spot: s }, { t: 'face', ry: sp.ry + Math.PI }, { t: 'act', act: 'pour', dur: rnd(3, 5), spot: s });
      st.push(...enterLocal(s), { t: 'inside', dur: rnd(18, 35) });
      return st;
    },
    baker(n) {
      const A = n.anchor, s = n.workSpot, st = [{ t: 'line', pts: [A.p] }, { t: 'face', ry: A.ry }, { t: 'act', act: 'arrange', dur: rnd(5, 9), work: A.work }, { t: 'idle', dur: rnd(1.5, 3), look: 'around' }, { t: 'act', act: 'arrange', dur: rnd(4, 7), work: A.work }];
      if (Math.random() < 0.4) st.push({ t: 'face', ry: A.ry + 0.7 }, { t: 'act', act: 'talk', dur: 2.2, talk: true }, { t: 'face', ry: A.ry });   // anuncia a fornada para a rua
      if (Math.random() < 0.3) st.push({ t: 'face', ry: A.ry - 1.1 }, { t: 'idle', dur: rnd(2, 3.5), look: 'around' }, { t: 'face', ry: A.ry });
      return st;
    },
    smith(n) {
      const A = n.anchor, st = [{ t: 'line', pts: [A.p] }, { t: 'face', ry: A.ry }];
      for (let k = 0; k < 2; k++) st.push({ t: 'act', act: 'hammer', dur: 1.05 * (3 + Math.floor(Math.random() * 4)) - 0.02, work: A.work }, { t: 'act', act: 'inspect', dur: rnd(1.8, 3), work: A.work });
      st.push({ t: 'face', ry: n.forgeRy }, { t: 'idle', dur: rnd(1.5, 2.5), look: 'around' }, { t: 'face', ry: A.ry });   // olha a forja
      return st;
    },
    weaver(n) {
      const A = n.anchor;
      return [{ t: 'line', pts: [A.p] }, { t: 'face', ry: A.ry }, { t: 'act', act: 'fold', dur: 8, work: A.work, body: 'sheet', drop: true }, { t: 'idle', dur: rnd(1, 2), look: 'around' },
        { t: 'act', act: 'arrange', dur: rnd(3, 5), work: A.work }, ...(Math.random() < 0.35 ? [{ t: 'face', ry: A.ry + 2.4 }, { t: 'act', act: 'adjust', dur: rnd(2.5, 4) }, { t: 'face', ry: A.ry }] : [])];
    },
    keeper(n) {
      const A = n.anchor, s = n.workSpot, st = [{ t: 'line', pts: [A.p] }, { t: 'face', ry: A.ry }, { t: 'give', name: 'mug', where: 'L' }, { t: 'give', name: 'rag', where: 'R' }, { t: 'act', act: 'wipe', dur: rnd(5, 9) }, { t: 'drop', name: 'rag' }, { t: 'idle', dur: rnd(2, 4), look: 'around' }];
      if (Math.random() < 0.4) st.push({ t: 'drop' }, ...enterLocal(s), { t: 'inside', dur: rnd(6, 12), spot: s }, ...exitShop(s));
      return st;
    },
    browser(n) {                                                                  // passeia pelas barracas e às vezes senta num banco livre
      const s = n.home, st = [...exitH(s)], side = n.def.lead || n.def.side < 0 ? -0.45 : 0.45;
      for (const S of shuffle(V.stalls.slice()).slice(0, 2 + (Math.random() < 0.5 ? 1 : 0))) { const p = SW(S, rnd(-0.9, 0.9), 2.0); st.push({ t: 'go', x: p.x, z: p.z }, { t: 'face', ry: S.ry + Math.PI }, { t: 'idle', dur: rnd(3, 7), look: 'around' }); }
      if (Math.random() < 0.5) { const F = V.F, a = rnd(0.5, Math.PI * 2 - 0.5), p = { x: F.x + Math.sin(a) * 4.75, z: F.z + Math.cos(a) * 4.75 }; st.push({ t: 'go', x: p.x, z: p.z }, { t: 'face', x: F.x, z: F.z }, { t: 'idle', dur: rnd(4, 8), look: { x: F.x, z: F.z } }); }   // olha a água da fonte (longe da bica)
      if (Math.random() < 0.6) { const B = V.plazaBenches[n.def.bench], p = SW(B, side, 0.17), a = SW(B, side, 1.15); st.push({ t: 'go', x: a.x, z: a.z }, { t: 'line', pts: [p] }, { t: 'face', ry: B.ry }, { t: 'sit', dur: rnd(8, 16), seat: 0.53 }, { t: 'line', pts: [a] }); }
      st.push(...enterH(s), { t: 'inside', dur: rnd(6, 15) });
      return st;
    },
    local(n) {                                                                  // vizinho de passagem (troca de casa só enquanto está dentro, sem ninguém ver)
      const L = ctxRef && ctxRef.listener; if (!L || !ctxGame) return [{ t: 'inside', dur: 3 }];
      const taken = new Set(); for (const o of npcs) if (o !== n && !o.dead) { taken.add(o.home); taken.add(o.curSpot); if (o.visitTo != null) taken.add(o.visitTo); }
      const cands = [];
      for (let s = 0; s < V.spots.length; s++) {
        const sp = V.spots[s]; if (sp.shop || !(ctxGame.layout[s] >= 0) || isDead(s) || taken.has(s) || s === busy()) continue;
        const d = Math.hypot(sp.front.x - L.x, sp.front.z - L.z); if (d > 12 && d < 50) cands.push(s);
      }
      if (!cands.length) return [{ t: 'inside', dur: rnd(3, 6) }];
      const fx = cam.rz, fz = -cam.rx, seen = cands.filter(o => { const q = V.spots[o].front, dx = q.x - cam.x, dz = q.z - cam.z; return (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1) > 0.35; });   // de preferência na frente da câmera
      const pool = seen.length && Math.random() < 0.8 ? seen : cands;
      const s = pool[Math.floor(Math.random() * pool.length)], sp = V.spots[s], lv = V.level(sp.px, sp.pz);
      n.home = s; n.deps = [s]; n.visitTo = null; const p = indoor(sp); place(n, p.x, p.z, sp.ry, false);
      const near = cands.filter(o => o !== s && V.level(V.spots[o].px, V.spots[o].pz) === lv && Math.hypot(V.spots[o].px - sp.px, V.spots[o].pz - sp.pz) < 40);
      const v = near.length ? near[Math.floor(Math.random() * near.length)] : -1;
      const st = [{ t: 'inside', dur: rnd(0.3, 4) }, ...exitH(s, Math.random() < 0.45 ? [{ t: 'give', name: 'basket', where: 'L', full: Math.random() < 0.5 }] : [])];
      if (v >= 0 && Math.random() < 0.35) { n.visitTo = v; st.push(...visit(v), { t: 'call', fn: () => { n.visitTo = null; } }); }
      else if (v >= 0) { const q = V.spots[v]; n.visitTo = v; st.push({ t: 'go', x: q.front.x, z: q.front.z, spot: v }, { t: 'face', ry: q.ry + Math.PI }, { t: 'act', act: 'talk', dur: 2.2, talk: true, spot: v }, { t: 'act', act: 'listen', dur: rnd(1.5, 3.5), spot: v }, { t: 'call', fn: () => { n.visitTo = null; } }); }
      st.push(...enterH(s), { t: 'drop' }, { t: 'inside', dur: rnd(4, 12) });
      return st;
    },
    walker(n) {
      const s = n.home, st = [...exitH(s)];
      if (n.def.castle && Math.random() < 0.7) { const c = V.castle, p = { x: c.gateX - 7 + rnd(-2, 2), z: c.court.z0 + 3.5 }; st.push({ t: 'go', x: p.x, z: p.z }, { t: 'face', x: c.gateX, z: c.z0 }, { t: 'idle', dur: rnd(5, 9), look: { x: c.gateX, z: c.z0 } }); }
      const v = pickVisit(n);
      if (v >= 0) st.push(...visit(v));
      if (Math.random() < 0.4) { const S = V.stalls[Math.floor(Math.random() * V.stalls.length)], p = SW(S, rnd(-1, 1), 2.4); st.push({ t: 'go', x: p.x, z: p.z }, { t: 'face', ry: S.ry + Math.PI }, { t: 'idle', dur: rnd(3, 6), look: 'around' }); }
      st.push(...enterH(s), { t: 'inside', dur: rnd(15, 30) });
      return st;
    },
  };
  /** Visita: vai até a porta, bate, entra, fica um tempo e sai. */
  function visit(v) {
    const sp = V.spots[v];
    return [{ t: 'go', x: sp.front.x, z: sp.front.z, spot: v }, { t: 'line', pts: [doorstep(sp)], spot: v, nt: true, lot: v }, { t: 'face', ry: sp.ry + Math.PI },
      { t: 'act', act: 'knock', dur: 2.2, spot: v }, { t: 'door', s: v, open: true, wait: true }, { t: 'idle', dur: 0.3 },
      { t: 'line', pts: [indoor(sp)], nt: true, lot: v }, { t: 'hide', spot: v }, { t: 'doorClose', s: v, delay: 0.3 }, { t: 'inside', dur: rnd(10, 22), spot: v }, ...exitH(v)];
  }
  function pickVisit(n) {
    const me = V.spots[n.home], c = n.visitable.filter(s => s !== n.home && !isDead(s) && Math.hypot(V.spots[s].px - me.px, V.spots[s].pz - me.pz) < 75);
    return c.length ? c[Math.floor(Math.random() * c.length)] : -1;
  }

  // ---------- sujeira do varredor ----------
  function showDirt(n, p) { const d = n.dirt || (n.dirt = buildItem('dirt', { k: n.k })); if (!d.parent) root.add(d); d.position.set(p.x, H(p.x, p.z) + 0.02, p.z); d.scale.setScalar(1); d.visible = true; }
  function hideDirt(n) { if (n.dirt) n.dirt.visible = false; }

  // ---------- portas ----------
  function doorOf(s) { return doors.get(s) || null; }
  function setDoor(s, open, delay = 0) {
    const d = doorOf(s); if (!d) return;
    if (open) {
      if (d.target < 0.5 && ctxRef) { const k = earK(d.p.x, d.p.z, 24); if (k > 0) snd.creak(k, panOf(d.p.x, d.p.z)); }
      d.target = 1.25; d.closeAt = -1;
    } else d.closeAt = t + delay;
  }

  // ---------- som: distância e lado ----------
  function earK(x, z, R) { if (!ctxRef || !ctxRef.listener) return 0; const d = Math.hypot(x - ctxRef.listener.x, z - ctxRef.listener.z); return d >= R ? 0 : Math.pow(1 - d / R, 1.3); }
  function panOf(x, z) { const dx = x - cam.x, dz = z - cam.z, d = Math.hypot(dx, dz) || 1; return clamp((dx * cam.rx + dz * cam.rz) / d, -1, 1) * 0.75; }

  // ---------- pessoas ----------
  const DEFS = [
    { role: 'guard', plan: 'guardGate', k: 1, lines: 'guard' }, { role: 'guard', plan: 'guardCastle', k: 2, lines: 'guard2' },
    ...[0, 3, 5, 2, 4, 7].map((st, i) => ({ role: 'merchant', plan: 'merchant', k: 10 + i * 3, stallIdx: st })),
    { role: 'buyer', plan: 'buyer', k: 31, custX: -0.7 }, { role: 'buyer', plan: 'buyer', k: 34, custX: 0.7 },
    { role: 'sweeper', plan: 'sweeper', k: 41, homeKind: 'low' }, { role: 'sweeper', plan: 'sweeper', k: 44, homeKind: 'mid' },
    { role: 'water', plan: 'water', k: 51, qSide: 1 }, { role: 'water', plan: 'water', k: 54, qSide: -1 },
    { role: 'walker', plan: 'chat', k: 61, lines: 'chat', pair: 0 }, { role: 'buyer', plan: 'chat', k: 64, lines: 'chat', pair: 1 },
    { role: 'elder', plan: 'elder', k: 71, bench: 0 }, { role: 'elder', plan: 'elder', k: 72, bench: 2 },
    { role: 'porter', plan: 'porter', k: 81 },
    { role: 'gardener', plan: 'gardener', k: 91, homeKind: 'low' }, { role: 'gardener', plan: 'gardener', k: 94, homeKind: 'mid' },
    { role: 'baker', plan: 'baker', k: 2, shop: 'bakery' }, { role: 'smith', plan: 'smith', k: 3, shop: 'smithy' },
    { role: 'weaver', plan: 'weaver', k: 4, shop: 'textile' }, { role: 'keeper', plan: 'keeper', k: 5, shop: 'tavern' },
    { role: 'child', plan: 'kids', k: 101, kid: 0, lines: 'child' }, { role: 'child', plan: 'kids', k: 104, kid: 1, lines: 'child' },
    { role: 'buyer', plan: 'browser', k: 122, bench: 1 }, { role: 'walker', plan: 'browser', k: 130, bench: 1, side: -1 }, { role: 'walker', plan: 'browser', k: 125, bench: 3, lead: true }, { role: 'child', plan: 'follow', k: 127, lines: 'child2' },
    { role: 'walker', plan: 'walker', k: 111, homeKind: 'low' }, { role: 'walker', plan: 'walker', k: 114, homeKind: 'low' }, { role: 'walker', plan: 'walker', k: 117, homeKind: 'mid', castle: true },
    // vizinhos de passagem: saem de uma casa perto de onde o jogador está, vão a outra casa ali perto e voltam (a rua nunca fica vazia)
    ...['walker', 'buyer', 'walker', 'buyer', 'walker', 'buyer', 'walker', 'buyer'].map((role, i) => ({ role, plan: 'local', k: 141 + i * 3, lines: 'local' })),
  ];
  const ITEMS = { guardGate: ['spear'], guardCastle: ['spear'], buyer: ['basket'], sweeper: ['broom', 'pan'], water: ['bucket'], porter: ['crate', 'sack'], gardener: ['can'], baker: ['basket'], smith: ['hammer', 'tongs'], weaver: ['sheet'], keeper: ['mug', 'rag'], local: ['basket'] };
  function makeNpc(def, i) {
    const P = buildMedPerson({ role: def.role, k: def.k });
    for (const nm of ITEMS[def.plan] || []) P.items[nm] = buildItem(nm, { k: def.k });          // objetos prontos (nada é montado durante o jogo)
    P.root.visible = false; root.add(P.root);
    return { i, def, role: def.role, P, k: def.k, x: 0, z: 0, cx: 0, cz: 0, y: 0, ry: 0, v: 0, lat: 0,
      st: { mode: 'idle', ph: Math.random() * 6, amp: 1, act: null, at: 0, t: 0, ev: [], lookYaw: 0 },
      steps: [], si: 0, cur: null, path: null, pi: 0, inside: true, dead: false, talking: false, talkT: 0, talkRy: 0, look: 0,
      solid: { x0: 0, x1: 0, z0: 0, z1: 0 }, inSolid: false, vis: false, near: false, blockT: 0, detourT: 0, lineI: Math.floor(Math.random() * 3),
      speed: P.speed, home: -1, workSpot: -1, curSpot: -1, deps: [], lastStepIdx: 0, dirt: def.plan === 'sweeper' ? buildItem('dirt', { k: def.k }) : null };
  }
  function addSolid(n) { if (!n.inSolid) { SOLIDS.push(n.solid); n.inSolid = true; } }
  function delSolid(n) { if (n.inSolid) { const k = SOLIDS.indexOf(n.solid); if (k >= 0) SOLIDS.splice(k, 1); n.inSolid = false; } }
  function kill(n) {
    n.dead = true; n.inside = true; n.talking = false; n.P.root.visible = false; n.vis = false; delSolid(n); n.P.drop(); hideDirt(n);
    if (fount.lock === n) fount.lock = null;
    if (n.stall) n.stall.merchant = null;
  }

  // ---------- passos: início e tique ----------
  function setPath(n, pts) { n.path = [{ x: n.cx, z: n.cz }, ...pts]; n.pi = 1; n.blockT = 0; }
  function startStep(n, s) {
    const P = n.P;
    switch (s.t) {
      case 'go': setPath(n, router.path(n.cx, n.cz, s.x, s.z).slice(1)); n.stepLot = -1; break;
      case 'line': setPath(n, s.pts); if (s.lot != null) n.stepLot = s.lot; break;
      case 'place': n.x = n.cx = s.x; n.z = n.cz = s.z; n.ry = s.ry ?? n.ry; n.lat = 0; n.stepLot = s.lot ?? -1; break;
      case 'show': n.inside = false; if (s.spot != null) n.curSpot = -1; break;
      case 'hide': n.inside = true; n.v = 0; n.curSpot = s.spot ?? -1; break;
      case 'give': P.give(s.name, s.where, s.full != null ? { full: s.full } : {}); break;
      case 'drop': P.drop(s.name); break;
      case 'door': setDoor(s.s, s.open); break;
      case 'doorClose': setDoor(s.s, false, s.delay || 0); break;
      case 'call': s.fn(n); break;
      case 'act':
        if (s.body) P.give(s.body, 'body');
        if (s.work) { s.local = toLocal(n, s.work); }
        n.st.at = 0; n.st._hit = n.st._sw = n.st._kn = n.st._g = undefined;
        if (s.fill) { const k = earK(n.x, n.z, 20); if (k > 0) setTimeout(() => snd.fill(k, panOf(n.x, n.z), 2.3), 1000); }
        break;
      default: break;
    }
  }
  /** Ponto do mundo → espaço do corpo da pessoa (frente +Z). */
  function toLocal(n, w) {
    const dx = w.x - n.x, dz = w.z - n.z, c = Math.cos(n.ry), s = Math.sin(n.ry), sc = n.P.root.scale.x;
    return new THREE.Vector3((dx * c - dz * s) / sc, (w.y - n.y) / sc, (dx * s + dz * c) / sc);
  }
  /** Devolve true quando o passo terminou. */
  function tickStep(n, s, dt) {
    const st = n.st;
    switch (s.t) {
      case 'go': case 'line': {
        if (s.spot != null && s.spot === busy() && s.t === 'go') {                   // a van está entregando ali: espera longe
          const end = n.path[n.path.length - 1];
          if (Math.hypot(end.x - n.x, end.z - n.z) < 7.5) { idleAnim(n, dt, end); return false; }
        }
        return move(n, dt, s.slow || 1, s.run);
      }
      case 'face': {
        const target = s.ry != null ? s.ry : angTo(n.x, n.z, s.x, s.z);
        st.mode = 'idle'; st.act = null; turn(n, target, dt, 5);
        return Math.abs(wrap(target - n.ry)) < 0.06 || s.el > 1.5;
      }
      case 'idle': idleAnim(n, dt, s.look); return s.el >= s.dur;
      case 'until': { if (s.act) { st.mode = 'idle'; st.act = s.act; st.at += dt; } else idleAnim(n, dt, s.look); return s.fn(n) || s.el >= s.max; }
      case 'act': {
        if (s.spot != null && s.spot === busyStable() && !n.inside) { yieldFrom(n, s); return false; }
        st.mode = s.sit ? 'sit' : 'idle'; st.act = s.act; st.at = s.el; st.work = s.local || null; st.talk = s.talk ? 1 : 0;
        if (s.act === 'fill' && s.el > 3.6) { const b = n.P.items.bucket; if (b && !b.userData.full) b.userData.setFull(true); }
        if (s.gather && n.dirt) n.dirt.scale.setScalar(Math.max(0.2, 1 - s.el / s.dur));
        if (s.el >= s.dur) { st.act = null; st.talk = 0; if (s.drop && s.body) n.P.drop(s.body); return true; }
        return false;
      }
      case 'sit': st.mode = 'sit'; st.act = null; if (s.seat) st.seat = s.seat; sitLook(n, dt); if (s.el >= s.dur && s.seat) st.seat = 0.53; return s.el >= s.dur;
      case 'inside': return s.el >= s.dur;
      case 'hold': return s.spot !== busy();
      case 'door': { const d = doorOf(s.s); return !s.wait || !d || d.ang > 0.95 || s.el > 1.5; }
      case 'converse': {
        const M = s.M, o = s.other;
        if (M.start < 0 && M.arrived[0] && M.arrived[1]) M.start = t;
        if (o.dead || M.ended || (M.start >= 0 && t - M.start > M.D)) { M.ended = true; st.act = null; st.talk = 0; return true; }
        if (M.start < 0) { idleAnim(n, dt, o); return s.el > 60; }
        turn(n, angTo(n.x, n.z, o.x, o.z), dt, 4);
        const mine = Math.floor((t - M.start) / 3.6) % 2 === s.me;
        st.mode = 'idle'; st.act = mine ? 'talk' : 'listen'; st.talk = mine ? 1 : 0; st.at += dt; st.lookYaw = 0;
        return false;
      }
      default: return true;
    }
  }
  let pathBudget = 3;                                                            // caminhos calculados por quadro (sem picos)
  function runStep(n, dt) {
    if (!n.cur) {
      if (n.si >= n.steps.length) { n.steps = (PLANS[n.def.plan] || (() => []))(n) || []; n.si = 0; if (!n.steps.length) n.steps = [{ t: 'idle', dur: 3 }]; }
      n.cur = { ...n.steps[n.si++], el: 0, started: false };
    }
    if (!n.cur.started) {
      if (n.cur.t === 'go') { if (pathBudget <= 0) { idleAnim(n, dt, null); return; } pathBudget--; }
      n.cur.started = true; startStep(n, n.cur);
    }
    n.cur.el += dt;
    if (tickStep(n, n.cur, dt)) { if (n.cur.t === 'act' || n.cur.t === 'until') { n.st.act = null; n.st.talk = 0; } n.cur = null; }
  }
  /** Sai da frente da casa onde a van está entregando e volta depois. */
  function yieldFrom(n, s) {
    const sp = V.spots[s.spot];
    for (const it of n.P.held.slice()) if (it.userData.where === 'body') { if (it.name === 'item:broom') n.P.give('broom', 'R'); else n.P.drop(it.name.slice(5)); }
    hideDirt(n);
    const here = { x: n.cx, z: n.cz }, along = { x: Math.cos(sp.ry), z: -Math.sin(sp.ry) };
    let away = null;
    for (const sg of [1, -1]) for (const dd of [7, 9, 5.5]) { const p = { x: sp.front.x + along.x * sg * dd, z: sp.front.z + along.z * sg * dd }; if (!away && !router.blocked(p.x, p.z, 0.3) && !V.spots.some(o => Math.hypot(o.door.x - p.x, o.door.z - p.z) < 2.5)) away = p; }
    if (!away) away = { x: sp.front.x + along.x * 7, z: sp.front.z + along.z * 7 };
    const back = [...n.steps.slice(n.si)];
    n.steps = [{ t: 'line', pts: [sp.front] }, { t: 'go', x: away.x, z: away.z }, { t: 'face', x: sp.front.x, z: sp.front.z },
      { t: 'until', fn: () => busyStable() !== s.spot, max: 400, look: sp.front }, { t: 'go', x: sp.front.x, z: sp.front.z }, { t: 'line', pts: [here], spot: s.spot },
      { t: 'face', ry: n.ry }, ...(s.act === 'sweep' ? [{ t: 'call', fn: () => n.dirt && (n.dirt.visible = true) }] : []), { ...s, el: 0, local: undefined }, ...back];
    n.si = 0; n.cur = null;
  }
  /** Trabalhador da loja onde a van está entregando: a taverneira entra (a frente dela é livre); os outros param e olham. */
  function workerYield(n) {
    const s = n.workSpot, A = n.anchor, sp = V.spots[s];
    n.P.drop('sheet'); n.P.drop('basket'); n.P.drop('rag');
    n.steps = n.def.plan === 'keeper'
      ? [{ t: 'line', pts: [A.p] }, ...enterLocal(s), { t: 'until', fn: () => busyStable() !== s, max: 600 }, { t: 'inside', dur: rnd(1, 3) }, ...exitShop(s), { t: 'line', pts: [A.p] }, { t: 'face', ry: A.ry }]
      : [{ t: 'line', pts: [A.p] }, { t: 'until', fn: () => busyStable() !== s, max: 600, look: { x: sp.door.x, z: sp.door.z } }];
    n.si = 0; n.cur = null; n.yielding = true; n.st.act = null; n.st.talk = 0;
  }

  // ---------- movimento ----------
  function turn(n, target, dt, rate = 7) { const d = wrap(target - n.ry); n.ry += clamp(d, -rate * dt, rate * dt); }
  function idleAnim(n, dt, look) {
    const st = n.st; st.mode = 'idle'; if (st.act !== 'talk' && st.act !== 'listen') st.act = null; n.v = Math.max(0, n.v - 4 * dt);
    let tgt = null;
    if (look && look !== 'around') tgt = look;
    else if (ctxRef) {                                                           // olha para quem passa perto
      const w = ctxRef.walker, vn = ctxRef.van;
      if (w && w.visible && Math.hypot(w.x - n.x, w.z - n.z) < 7) tgt = w; else if (vn && Math.hypot(vn.x - n.x, vn.z - n.z) < 9 && Math.abs(vn.speed || 0) > 0.5) tgt = vn;
    }
    const want = tgt ? clamp(wrap(angTo(n.x, n.z, tgt.x, tgt.z) - n.ry), -1.1, 1.1) : 0.5 * Math.sin(t * 0.4 + n.k) * Math.sin(t * 0.17 + n.k * 2);
    n.look += (want - n.look) * Math.min(1, 3 * dt); st.lookYaw = n.look;
  }
  function sitLook(n, dt) {
    let best = null, bd = 12;
    const cand = [];
    if (ctxRef) { if (ctxRef.walker && ctxRef.walker.visible) cand.push(ctxRef.walker); if (ctxRef.van) cand.push(ctxRef.van); }
    for (const o of npcs) if (o !== n && o.vis && o.v > 0.3) cand.push(o);
    for (const o of cand) { const d = Math.hypot(o.x - n.x, o.z - n.z), a = wrap(angTo(n.x, n.z, o.x, o.z) - n.ry); if (d < bd && Math.abs(a) < 1.6) { bd = d; best = a; } }
    const want = best != null ? clamp(best, -1.15, 1.15) : 0.3 * Math.sin(t * 0.3 + n.k);
    n.look += (want - n.look) * Math.min(1, 2.5 * dt); n.st.lookYaw = n.look;
  }
  let OBS = [];                                                                  // obstáculos grandes do quadro: [x, z, r, quem]
  function move(n, dt, slow = 1, run = false) {
    const st = n.st, far = !n.near;
    if (n.pi >= n.path.length) { st.mode = 'idle'; return true; }
    const tg = n.path[n.pi];
    let dx = tg.x - n.cx, dz = tg.z - n.cz, d = Math.hypot(dx, dz);
    if (d < 0.06) { n.pi++; if (n.pi >= n.path.length) { n.x = n.cx; n.z = n.cz; n.lat = 0; st.mode = 'idle'; return true; } return false; }
    dx /= d; dz /= d;
    const rx = -dz, rz = dx;                                                     // direita de quem anda
    let want = n.speed * slow * (run ? 2 : 1), latT = 0, stop = false;
    if (!far) {
      const px = n.x + dx * 0.6, pz = n.z + dz * 0.6;
      for (const o of OBS) {                                                     // van, personagem, carroças: para e espera
        const ox = o[0] - n.x, oz = o[1] - n.z;
        if (ox * dx + oz * dz > 0 && Math.hypot(o[0] - px, o[1] - pz) < o[2] + 0.42) { stop = true; break; }
      }
      for (const o of npcs) {                                                    // outros moradores: desvia (cada um pela sua direita) ou espera
        if (o === n || !o.vis || o.dead) continue;
        const ox = o.x - n.x, oz = o.z - n.z; if (ox * ox + oz * oz > 6) continue;
        const ahead = ox * dx + oz * dz, side = ox * rx + oz * rz;
        if (ahead <= 0.05 || ahead > 2.0) continue;
        if (Math.abs(side - n.lat) < 0.72) {
          latT = clamp(side - 0.78 * (side - n.lat >= 0 || (o.v > 0.2 && (o.x - n.x) * Math.cos(o.ry) < 0) ? 1 : -1), -0.9, 0.9);
          if (side > n.lat) latT = Math.min(latT, side - 0.78); else latT = Math.max(latT, side + 0.78);
          if (ahead < 0.75 && !(o.v > 0.2 && Math.sin(o.ry) * dx + Math.cos(o.ry) * dz > 0.5 && o.v >= want * 0.6)) stop = stop || n.i > o.i || o.v < 0.1;
        }
      }
    }
    // desvio lateral só se o lugar estiver livre
    const tryLat = clamp(latT, -0.9, 0.9);
    n.lat += clamp(tryLat - n.lat, -1.6 * dt, 1.6 * dt);
    if (Math.abs(n.lat) > 0.01 && router.blocked(n.cx + rx * n.lat, n.cz + rz * n.lat, 0.28)) n.lat *= Math.max(0, 1 - 6 * dt);
    if (stop) {
      n.blockT += dt; n.detourT -= dt;
      if (n.blockT > 1.8 && n.detourT <= 0) { n.detourT = 2; tryDetour(n, dx, dz); }
      want = 0;
    } else n.blockT = 0;
    n.v += clamp(want - n.v, -6 * dt, 3 * dt);
    const stepLen = Math.min(n.v * dt, d);
    n.cx += dx * stepLen; n.cz += dz * stepLen;
    n.x = n.cx + rx * n.lat; n.z = n.cz + rz * n.lat;
    turn(n, Math.atan2(dx, dz), dt, 7);
    st.act = null; st.talk = 0;
    if (n.v > 0.05 || (want > 0 && n.v > 0)) {                                  // (arrancando: com dt = 1/60 a primeira aceleração dá 0,05 exatos)
      const prev = Math.floor(st.ph / Math.PI);
      st.mode = run ? 'run' : 'walk'; st.amp = clamp(n.v / (n.speed || 1), 0.3, 1.1);
      st.ph += n.v * dt * Math.PI / (n.P.child ? 0.42 : 0.6);
      if (n.near && Math.floor(st.ph / Math.PI) !== prev && stepBudget > 0) { const k = earK(n.x, n.z, 14); if (k > 0) { stepBudget--; snd.step(k, panOf(n.x, n.z)); } }
    } else { st.mode = 'idle'; idleAnim(n, dt, null); }
    return false;
  }
  /** Bloqueado por um obstáculo grande: tenta um ponto de desvio de um dos lados. */
  function tryDetour(n, dx, dz) {
    const rx = -dz, rz = dx;
    for (let k = n.pi; k < Math.min(n.path.length, n.pi + 3); k++) {
      const nxt = n.path[k];
      for (const off of [1.6, 2.4, 3.2]) for (const sd of [1, -1]) {
        const px = n.cx + dx * 1.2 + rx * off * sd, pz = n.cz + dz * 1.2 + rz * off * sd;
        if (router.blocked(px, pz, 0.3) || OBS.some(o => Math.hypot(o[0] - px, o[1] - pz) < o[2] + 0.5)) continue;
        if (!router.clear(n.cx, n.cz, px, pz, 0.25) || !router.clear(px, pz, nxt.x, nxt.z, 0.25)) continue;
        if (OBS.some(o => segHit(n.cx, n.cz, px, pz, o) || segHit(px, pz, nxt.x, nxt.z, o))) continue;
        n.path.splice(n.pi, k - n.pi, { x: px, z: pz }); n.blockT = 0; return true;
      }
    }
    if (n.blockT > 3 && n.path.length) {                                         // refaz o caminho até o destino evitando o que está parado ali
      const end = n.path[n.path.length - 1], avoid = OBS.filter(o => Math.hypot(o[0] - n.cx, o[1] - n.cz) < 25);
      if (avoid.some(o => Math.hypot(o[0] - end.x, o[1] - end.z) < o[2] + 0.5)) return false;
      const p = router.path(n.cx, n.cz, end.x, end.z, avoid);
      if (p && p.length > 1) { n.path = p; n.pi = 1; n.blockT = 0; return true; }
    }
    return false;
  }
  const segHit = (ax, az, bx, bz, o) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, u = clamp(((o[0] - ax) * dx + (o[1] - az) * dz) / L2, 0, 1); return Math.hypot(ax + dx * u - o[0], az + dz * u - o[1]) < o[2] + 0.4; };

  // ---------- crianças em volta da fonte ----------
  const kids = { ang: [0, 0.9], dir: 1, chaser: 0, phase: 'run', t0: 0, until: 18, lat: [0, 0] };
  function kidsUpdate(dt) {
    const K = npcs.filter(n => n.def.plan === 'kids' && !n.dead), F = V.F, R0 = 4.95;
    if (!K.length) return;
    kids.t0 += dt;
    const talking = K.some(n => n.talking);
    if (kids.phase === 'run' && (talking || kids.t0 > kids.until)) { kids.phase = 'rest'; kids.t0 = 0; kids.until = rnd(3.5, 6); }
    else if (kids.phase === 'rest' && !talking && kids.t0 > kids.until) { kids.phase = 'run'; kids.t0 = 0; kids.until = rnd(14, 24); if (Math.random() < 0.4) kids.dir *= -1; }
    else if (kids.phase === 'tag' && kids.t0 > 1.4) { kids.phase = 'run'; kids.t0 = 0; kids.chaser = 1 - kids.chaser; const r = 1 - kids.chaser; kids.ang[r] = kids.ang[kids.chaser] + kids.dir * 0.9; }
    for (const n of K) {
      const j = n.def.kid, me = j === kids.chaser;
      let w = 0;
      if (kids.phase === 'run' && !n.talking) w = (me ? 2.55 : 2.35) / R0;
      // obstáculo à frente (quem busca água na bica, van, personagem): vai mais para fora ou para
      const a1 = kids.ang[j] + kids.dir * 0.25, px = F.x + Math.sin(a1) * (R0 + kids.lat[j]), pz = F.z + Math.cos(a1) * (R0 + kids.lat[j]);
      let latT = 0, stop = false;
      for (const o of npcs) if (o !== n && o.vis && !o.dead && o.def.plan !== 'kids' && Math.hypot(o.x - px, o.z - pz) < 0.95) latT = 0.75;
      for (const o of OBS) if (Math.hypot(o[0] - px, o[1] - pz) < o[2] + 0.4) stop = true;
      kids.lat[j] += clamp(latT - kids.lat[j], -1.5 * dt, 1.5 * dt);
      if (stop) w = 0;
      kids.ang[j] += kids.dir * w * dt;
      n.x = n.cx = F.x + Math.sin(kids.ang[j]) * (R0 + kids.lat[j]); n.z = n.cz = F.z + Math.cos(kids.ang[j]) * (R0 + kids.lat[j]);
      n.v = w * R0;
      if (n.talking) { talkAnim(n, dt); continue; }
      const st = n.st;
      if (w > 0) { n.ry = kids.ang[j] + kids.dir * Math.PI / 2; st.mode = 'run'; st.amp = 1; st.ph += n.v * dt * Math.PI / 0.42; st.act = null; }
      else { st.mode = 'idle'; st.act = kids.phase === 'tag' ? 'talk' : null; st.talk = kids.phase === 'tag' ? 1 : 0; const o = K.find(q => q !== n); if (o) turn(n, angTo(n.x, n.z, o.x, o.z), dt, 5); st.lookYaw = 0; }
    }
    if (kids.phase === 'run' && K.length === 2) {                                 // pegou!
      const c = kids.chaser, r = 1 - c, gap = wrap((kids.ang[r] - kids.ang[c]) * kids.dir);
      if (gap < 0.16 && gap > -0.3) { kids.phase = 'tag'; kids.t0 = 0; }
    }
  }

  // ---------- criança que acompanha a mãe (atrás e ao lado; entra e sai de casa junto) ----------
  function followUpdate(n, dt) {
    const Ld = n.leader;
    if (!Ld || Ld.dead) { kill(n); return; }
    if (Ld.inside) { n.inside = true; n.x = n.cx = Ld.x; n.z = n.cz = Ld.z; n.v = 0; n.stepLot = Ld.stepLot; return; }
    if (n.talking) { talkAnim(n, dt); return; }
    const fx = Math.sin(Ld.ry), fz = Math.cos(Ld.ry), st = n.st;
    if (n.inside) { n.inside = false; n.x = n.cx = Ld.x - fx * 0.5; n.z = n.cz = Ld.z - fz * 0.5; n.ry = Ld.ry; }
    n.stepLot = Ld.stepLot;
    const sitting = Ld.cur && Ld.cur.t === 'sit', back = sitting ? -1.0 : 0.85, lat = sitting ? 1.15 : 0.7;
    let T = null;
    for (const sd of [n.followSide, -n.followSide]) { const x = Ld.x - fx * back - fz * sd * lat, z = Ld.z - fz * back + fx * sd * lat; if (!router.blocked(x, z, 0.2)) { T = { x, z }; n.followSide = sd; break; } }
    if (!T) T = { x: Ld.x - fx * 0.9, z: Ld.z - fz * 0.9 };
    const dx = T.x - n.x, dz = T.z - n.z, d = Math.hypot(dx, dz);
    const want = d > 0.25 ? clamp(d * 1.6, 0.6, 2.4) : 0;
    n.v += clamp(want - n.v, -5 * dt, 4 * dt);
    if (n.v > 0.05 && d > 0.05) {
      const k = Math.min(n.v * dt, d), nx = n.x + dx / d * k, nz = n.z + dz / d * k, nowB = router.blocked(n.x, n.z, 0.2);
      if (nowB || !router.blocked(nx, nz, 0.2)) { n.x = n.cx = nx; n.z = n.cz = nz; }
      turn(n, Math.atan2(dx, dz), dt, 8);
      st.mode = n.v > 1.7 ? 'run' : 'walk'; st.amp = clamp(n.v / 1.4, 0.4, 1.1); st.act = null; st.talk = 0;
      st.ph += n.v * dt * Math.PI / 0.42;
    } else { turn(n, sitting ? angTo(n.x, n.z, V.F.x, V.F.z) : Ld.ry, dt, 4); idleAnim(n, dt, sitting ? { x: V.F.x, z: V.F.z } : null); }
  }

  // ---------- conversa com o jogador ----------
  function talkAnim(n, dt) {
    n.talkT += dt; n.v = 0;
    const st = n.st, sitting = n.def.plan === 'elder';
    if (sitting) { st.mode = 'sit'; n.look += (clamp(wrap(n.talkRy - n.ry), -1.2, 1.2) - n.look) * Math.min(1, 4 * dt); st.lookYaw = n.look; }
    else { turn(n, n.talkRy, dt, 5); st.mode = 'idle'; n.look *= 0.9; st.lookYaw = n.look; }
    const speaking = n.talkT < 3.2;
    st.act = speaking ? 'talk' : 'listen'; st.talk = speaking ? 1 : 0; st.at += dt;
  }
  const linesOf = n => {
    if (n.def.lines) return LINES[n.def.lines];
    if (n.role === 'merchant') return LINES[n.stall && n.stall.kind] || LINES.food;
    return LINES[n.role] || LINES.walker;
  };

  // ---------- serviço na barraca ----------
  function serveUpdate(n, dt) {
    const S = n.stall, sv = S.serve, st = n.st;
    if (sv.t0 < 0) sv.t0 = t;
    const e = t - sv.t0, b = sv.who;
    turn(n, angTo(n.x, n.z, b.x, b.z), dt, 5);
    st.mode = 'idle'; st.at += dt; n.v = 0;
    if (e < 2.4) { st.act = 'talk'; st.talk = 1; }
    else if (e < 4.0) { const w = SW(S, 0, 0.5); st.act = 'arrange'; st.talk = 0; st.work = toLocal(n, { x: w.x, y: H(w.x, w.z) + 0.95, z: w.z }); }
    else if (e < 5.4) { st.act = 'talk'; st.talk = 1; }
    else { sv.done = true; st.act = null; st.talk = 0; }
  }

  // ---------- nuvens, pássaros, fumaça, faíscas ----------
  function buildClouds() {
    const geo = new THREE.IcosahedronGeometry(1, 1), list = [];
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#686d76', flatShading: true, fog: false });
    const C = ['#e6e8ec', '#d6d9de', '#c6cad1', '#b6bbc3'];
    for (let i = 0; i < 34; i++) {                                              // campo largo: as de longe aparecem perto do horizonte
      const cl = { x: rnd(-640, 900), y: rnd(140, 200), z: rnd(-640, 900), sp: rnd(2.2, 3.6), blobs: [] };
      const n = 5 + Math.floor(Math.random() * 4), Wd = rnd(40, 70), S = rnd(1.3, 1.8);
      for (let k = 0; k < n; k++) { const u = k / (n - 1) - 0.5; cl.blobs.push({ dx: u * Wd + rnd(-4, 4), dy: rnd(-2, 4) * (1 - Math.abs(u)) * S, dz: rnd(-10, 10), sx: rnd(9, 16) * (1.1 - Math.abs(u)) * S, sy: rnd(4, 7) * S, sz: rnd(8, 13) * S, c: C[Math.floor(Math.random() * C.length)] }); }
      list.push(cl);
    }
    const count = list.reduce((a, c) => a + c.blobs.length, 0), im = new THREE.InstancedMesh(geo, mat, count);
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.name = 'medieval-clouds';
    let k = 0; const col = new THREE.Color(); for (const cl of list) for (const b of cl.blobs) im.setColorAt(k++, col.set(b.c));
    return { im, list };
  }
  function updateClouds(dt) {
    let k = 0;
    for (const cl of clouds.list) {
      cl.x += WIND.x * cl.sp * dt; cl.z += WIND.z * cl.sp * dt;
      if (cl.x > 900) { cl.x -= 1540; cl.z = rnd(-640, 900); } if (cl.z > 900) cl.z -= 1540;
      for (const b of cl.blobs) clouds.im.setMatrixAt(k++, _m.compose(_v.set(cl.x + b.dx, cl.y + b.dy, cl.z + b.dz), _q.identity(), _s.set(b.sx, b.sy, b.sz)));
    }
    clouds.im.instanceMatrix.needsUpdate = true;
  }
  function buildBirds() {
    const mat = new THREE.MeshLambertMaterial({ color: '#3a3a42', flatShading: true });
    const body = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.16, 0.18), mat, 7), wing = new THREE.InstancedMesh(new THREE.BoxGeometry(0.28, 0.03, 0.62), mat, 14);
    for (const m of [body, wing]) { m.frustumCulled = false; m.castShadow = false; }
    const list = Array.from({ length: 7 }, (_, i) => ({ cx: rnd(40, 220), cz: rnd(40, 220), r: rnd(18, 45), y: rnd(20, 36), w: rnd(0.12, 0.22) * (i % 2 ? 1 : -1), a: rnd(0, 6.3), f: rnd(0, 6) }));
    return { body, wing, list };
  }
  function updateBirds(dt) {
    const B = birds;
    B.list.forEach((b, i) => {
      b.a += b.w * dt; b.cx += WIND.x * 0.6 * dt; if (b.cx > 280) b.cx -= 300;
      const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r, y = b.y + Math.sin(b.a * 3 + i) * 1.5, yaw = -b.a - Math.sign(b.w) * Math.PI / 2;
      const glide = Math.sin(t * 0.5 + b.f) > 0.4, flap = glide ? 0.1 : Math.sin(t * 13 + b.f) * 0.7;
      _q.setFromEuler(_e.set(0, yaw, 0)); B.body.setMatrixAt(i, _m.compose(_v.set(x, y, z), _q, _s.set(1, 1, 1)));
      for (const sd of [-1, 1]) {                                             // asas presas no corpo, batendo em volta do eixo da frente
        _q.setFromEuler(_e.set(sd * flap, yaw, 0, 'YXZ'));
        _v.set(0, 0, sd * 0.32).applyQuaternion(_q); _v.x += x; _v.y += y; _v.z += z;
        B.wing.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), _m.compose(_v, _q, _s.set(1, 1, 1)));
      }
    });
    B.body.instanceMatrix.needsUpdate = true; B.wing.instanceMatrix.needsUpdate = true;
  }
  function buildSmoke() {
    const P = makeParticles(110, puffTexture(), '#ffffff', { fog: true });
    P.im.name = 'medieval-smoke';
    return { ...P, list: [] };
  }
  function emitSmoke(e) {
    if (smoke.list.length >= 110) return;
    smoke.list.push({ x: e.p.x + rnd(-0.15, 0.15), y: e.p.y, z: e.p.z + rnd(-0.15, 0.15), vy: rnd(0.55, 0.85), age: 0, life: rnd(5, 7), s0: rnd(0.5, 0.8), c: e.dark ? 0.42 : 0.56 + Math.random() * 0.1 });
  }
  function updateSmoke(dt, camera) {
    const L = smoke.list, im = smoke.im, col = new THREE.Color();
    if (camera) _q.copy(camera.quaternion); else _q.identity();
    let k = 0;
    for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.age += dt; if (p.age > p.life) L.splice(i, 1); }
    for (const p of L) {
      const u = p.age / p.life;
      p.y += p.vy * dt * (1 - 0.5 * u); p.x += WIND.x * 0.7 * u * dt * 2; p.z += WIND.z * 0.7 * u * dt * 2;
      const s = p.s0 + 2.4 * u;
      im.setMatrixAt(k, _m.compose(_v.set(p.x, p.y, p.z), _q, _s.set(s, s, s)));
      smoke.alpha.array[k] = Math.min(1, p.age / 0.6) * Math.pow(1 - u, 1.3) * 0.75;
      im.setColorAt(k, col.setScalar(p.c)); k++;
    }
    im.count = k; im.instanceMatrix.needsUpdate = true; smoke.alpha.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
  function buildSparks() {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: '#ffb347', toneMapped: false }), 40);
    im.frustumCulled = false; im.castShadow = false; im.count = 0; im.name = 'medieval-sparks';
    return { im, list: [] };
  }
  function burstSparks(p) {
    for (let i = 0; i < 9 && sparks.list.length < 40; i++) { const a = rnd(0, 6.3), sp = rnd(1.2, 3); sparks.list.push({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rnd(1.5, 3.5), age: 0, life: rnd(0.35, 0.7) }); }
  }
  function updateSparks(dt) {
    const L = sparks.list; let k = 0;
    for (let i = L.length - 1; i >= 0; i--) { const p = L[i]; p.age += dt; if (p.age > p.life) L.splice(i, 1); }
    for (const p of L) { p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const s = 1 - p.age / p.life; sparks.im.setMatrixAt(k++, _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s))); }
    sparks.im.count = k; sparks.im.instanceMatrix.needsUpdate = true;
  }

  // ---------- marcadores dos lotes e da cena (portas, fumaça, bandeiras, tecidos, água, forja, âncoras) ----------
  function scan(obj, skipLots) {
    const m = { door: null, smoke: [], flag: [], cloth: [], forge: [], water: [], worker: null, work: null };
    obj.traverse(o => {
      if (skipLots && o !== obj && typeof o.name === 'string' && o.name.startsWith('lot:')) return;
      const u = o.userData; if (!u || o === obj) return;
      if (u.door && !m.door) m.door = o; if (u.smoke) m.smoke.push(o); if (u.flag) m.flag.push(o); if (u.cloth) m.cloth.push(o);
      if (u.forge) m.forge.push(o); if (u.water) m.water.push(o); if (u.anchor === 'worker') m.worker = o; if (u.anchor === 'work') m.work = o;
    });
    return m;
  }
  /** Percorre a cena sem descer nos lotes (eles são lidos um por um no layout). */
  function scanScene(sc) {
    const m = { smoke: [], flag: [], cloth: [], forge: [], water: [] };
    const walk = o => {
      if (o !== sc && typeof o.name === 'string' && o.name.startsWith('lot:')) return;
      if (o === root) return;
      const u = o.userData; if (u) { if (u.smoke) m.smoke.push(o); if (u.flag) m.flag.push(o); if (u.cloth) m.cloth.push(o); if (u.forge) m.forge.push(o); if (u.water) m.water.push(o); }
      for (const c of o.children) walk(c);
    };
    walk(sc);
    return m;
  }
  const base = o => { if (!o.userData._b) o.userData._b = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone(), k: Math.random() * 6 }; return o.userData._b; };
  function prepForge(o) {
    o.traverse(m => { if (!m.isMesh || m.userData._fm) return; m.userData._fm = true; m.material = m.material.clone(); m.userData._ei = m.material.emissiveIntensity ?? 1; });
  }
  function animMarks(M, dt, near) {
    for (const o of M.flag) { const b = base(o); if (!near(o)) continue; o.rotation.set(b.r.x + 0.04 * Math.sin(t * 1.7 + b.k), b.r.y + 0.12 * Math.sin(t * 1.3 + b.k) + 0.05 * Math.sin(t * 3.1 + b.k), b.r.z + 0.05 * Math.sin(t * 2.1 + b.k)); }
    for (const o of M.cloth) { const b = base(o); if (!near(o)) continue; o.rotation.set(b.r.x + 0.035 * Math.sin(t * 1.6 + b.k), b.r.y, b.r.z + 0.02 * Math.sin(t * 2.3 + b.k)); }
    for (const o of M.water) {
      const b = base(o); if (!near(o)) continue;
      if (o.userData.water === 'jet') {
        o.scale.set(b.s.x, b.s.y * (1 + 0.025 * Math.sin(t * 9 + b.k) + 0.012 * Math.sin(t * 14)), b.s.z);
        const m = o.material; if (m && !Array.isArray(m)) { if (b.ei == null) { b.ei = m.emissiveIntensity ?? 0.25; b.op = m.opacity ?? 1; } m.emissiveIntensity = b.ei * (0.85 + 0.3 * Math.abs(Math.sin(t * 5.3 + b.k))); if (m.transparent) m.opacity = b.op * (0.92 + 0.08 * Math.sin(t * 7.1)); }
      }
      else { o.position.y = b.p.y + 0.012 * Math.sin(t * 2.2 + b.k); o.scale.set(b.s.x * (1 + 0.006 * Math.sin(t * 3 + b.k)), b.s.y, b.s.z * (1 + 0.006 * Math.sin(t * 3.4 + b.k))); }
    }
    for (const o of M.forge) {
      const b = base(o); if (!near(o)) continue; prepForge(o);
      const f = 0.78 + 0.16 * Math.sin(t * 7.3 + b.k) + 0.1 * Math.sin(t * 17.1) + 0.06 * Math.random();
      o.scale.set(b.s.x, b.s.y * (0.92 + 0.12 * f), b.s.z);
      o.traverse(m => { if (m.isMesh && m.material && m.material.emissive) m.material.emissiveIntensity = m.userData._ei * f; });
    }
  }

  // ---------- âncoras de trabalho ----------
  function anchorFor(s, kind) {
    const sp = V.spots[s], lot = W && ctxGame ? W.lotGroup(ctxGame.layout[s]) : null;
    const LOC = { bakery: [[3.2, 5.55], [3.2, 0.9, 6.4]], smithy: [[2.4, 5.4], [2.4, 0.87, 6.3]], textile: [[3.2, 5.55], [3.2, 0.9, 6.4]], tavern: [[1.45, 5.95], [1.45, 1.0, 6.9]] };
    const [w, k] = LOC[kind];
    let p = LW(sp, w[0], w[1]), q = LW(sp, k[0], k[2]), wy = sp.y + k[1];
    if (lot && kind !== 'tavern') {
      const m = scanCache.get(lot) || scan(lot); scanCache.set(lot, m); lot.updateWorldMatrix(true, true);
      if (m.worker) { m.worker.getWorldPosition(_v); p = { x: _v.x, z: _v.z }; }
      if (m.work) { m.work.getWorldPosition(_v); q = { x: _v.x, z: _v.z }; wy = _v.y; }
    }
    return { p, ry: angTo(p.x, p.z, q.x, q.z), work: { x: q.x, y: wy, z: q.z } };
  }
  let ctxGame = null;

  // ---------- escolha das casas de cada rotina ----------
  function assignHomes(game) {
    const F = V.F, present = s => game.layout[s] >= 0;
    const houses = V.spots.map((sp, s) => s).filter(s => !V.spots[s].shop && present(s));
    const used = new Set();
    const lvl = s => V.level(V.spots[s].px, V.spots[s].pz), dF = s => Math.hypot(V.spots[s].px - F.x, V.spots[s].pz - F.z);
    const pick = score => { let best = -1, bs = Infinity; for (const s of houses) { if (used.has(s)) continue; const v = score(s) + Math.random() * 8; if (v < bs) { bs = v; best = s; } } if (best >= 0) used.add(best); return best; };
    const mainRoad = s => { const sp = V.spots[s]; return Math.min(...['m1', 'a1', 'b1', 'm2'].map(k => Math.hypot(sp.px - V.N[k][0], sp.pz - V.N[k][1]))); };
    // vizinhos que conversam: mesma altura, 14–30 de distância, ponto de encontro longe das portas
    let pair = null;
    for (let tries = 0; tries < 200 && !pair; tries++) {
      const a = houses[Math.floor(Math.random() * houses.length)], b = houses[Math.floor(Math.random() * houses.length)];
      if (a === b || used.has(a) || used.has(b) || lvl(a) !== lvl(b) || lvl(a) === 2) continue;
      const A = V.spots[a], B = V.spots[b], d = Math.hypot(A.px - B.px, A.pz - B.pz); if (d < 12 || d > 32) continue;
      const pts = router.path(A.front.x, A.front.z, B.front.x, B.front.z), mid = alongPath(pts, 0.5);
      if (!mid) continue;
      const ok = p => !router.blocked(p.x, p.z, 0.35) && !V.spots.some(o => Math.hypot(o.door.x - p.x, o.door.z - p.z) < 3.2 || Math.hypot(o.front.x - p.x, o.front.z - p.z) < 1.8);
      const p0 = { x: mid.x - mid.dx * 0.6, z: mid.z - mid.dz * 0.6 }, p1 = { x: mid.x + mid.dx * 0.6, z: mid.z + mid.dz * 0.6 };
      if (!ok(p0) || !ok(p1)) continue;
      pair = { homes: [a, b], at: [p0, p1] };
    }
    if (pair) pair.homes.forEach(s => used.add(s));
    const out = {};
    out.buyer = [pick(s => Math.abs(dF(s) - 42) + (lvl(s) === 1 ? 0 : 30)), pick(s => Math.abs(dF(s) - 55) + (lvl(s) === 1 ? 0 : 30))];
    out.water = [pick(s => Math.abs(dF(s) - 38) + (lvl(s) === 1 ? 0 : 40)), pick(s => Math.abs(dF(s) - 60) + (lvl(s) === 1 ? 0 : 40))];
    out.sweeper = [pick(s => mainRoad(s) * 0.6 + (lvl(s) === 0 ? 0 : 60)), pick(s => Math.abs(dF(s) - 48) + (lvl(s) === 1 ? 0 : 60))];
    const flower = s => (HOUSES[game.layout[s]] && HOUSES[game.layout[s]].flower ? 0 : 25);
    out.gardener = [pick(s => flower(s) + (lvl(s) === 0 ? 0 : 60) + mainRoad(s) * 0.2), pick(s => flower(s) + (lvl(s) === 1 ? 0 : 60) + Math.abs(dF(s) - 65) * 0.3)];
    out.browser = [pick(s => Math.abs(dF(s) - 40) + (lvl(s) === 1 ? 0 : 40)), pick(s => Math.abs(dF(s) - 45) + (lvl(s) === 1 ? 0 : 40)), pick(s => Math.abs(dF(s) - 50) + (lvl(s) === 1 ? 0 : 40))];
    out.walker = [pick(s => (lvl(s) === 0 ? 0 : 60) + mainRoad(s) * 0.3), pick(s => (lvl(s) === 0 ? 0 : 60)), pick(s => (lvl(s) === 1 ? 0 : 60) + Math.abs(dF(s) - 70) * 0.3)];
    out.pair = pair; out.houses = houses;
    out.visit = pair ? (() => { const A = V.spots[pair.homes[0]]; const c = houses.filter(s => !pair.homes.includes(s) && Math.hypot(V.spots[s].px - A.px, V.spots[s].pz - A.pz) < 40); return c.length ? c[Math.floor(Math.random() * c.length)] : -1; })() : -1;
    return out;
  }
  function alongPath(pts, u) {
    let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].z - pts[k - 1].z);
    let need = L * u;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k], l = Math.hypot(b.x - a.x, b.z - a.z);
      if (need <= l && l > 0.01) return { x: a.x + (b.x - a.x) * need / l, z: a.z + (b.z - a.z) * need / l, dx: (b.x - a.x) / l, dz: (b.z - a.z) / l };
      need -= l;
    }
    return null;
  }

  // ---------- começo de cada partida: quem está onde ----------
  function resetNpc(n) {
    n.steps = []; n.si = 0; n.cur = null; n.path = null; n.pi = 0; n.v = 0; n.lat = 0; n.talking = false; n.dead = false; n.inside = true; n.yielding = false;
    n.curSpot = -1; n.stepLot = -1; n.lift = 0; n.P.drop(); hideDirt(n); n.st.act = null; n.st.talk = 0; n.st.mode = 'idle'; n.look = 0;
    delSolid(n); n.vis = false; n.P.root.visible = false;
  }
  function place(n, x, z, ry, visible = true) { n.x = n.cx = x; n.z = n.cz = z; n.ry = ry; n.inside = !visible; }
  function layoutNpcs(game) {
    const A = assignHomes(game), F = V.F, present = s => s >= 0 && game.layout[s] >= 0;
    let bi = 0, wi = 0, si = 0, gi = 0, ki = 0;
    const pr = A.pair ? { npcs: [], at: A.pair.at, meets: {}, visit: A.visit } : null;
    const foodStalls = V.stalls.filter(S => S.kind === 'food');
    for (const S of V.stalls) { S.merchant = null; S.serve = null; }
    fount.lock = null;
    for (const n of npcs) {
      resetNpc(n);
      const d = n.def; n.deps = []; n.home = -1; n.workSpot = -1;
      const startInside = dur => { n.steps = [{ t: 'inside', dur }]; n.si = 0; n.inside = true; const sp = V.spots[n.home]; if (sp) { const p = indoor(sp); place(n, p.x, p.z, sp.ry, false); } };
      switch (d.plan) {
        case 'guardGate': { const G = V.guard; place(n, G.a.x, G.a.z, angTo(G.a.x, G.a.z, G.look.x, G.look.z)); n.P.give('spear', 'R'); break; }
        case 'guardCastle': { const c = V.castle; place(n, c.gateX - 3.6, c.court.z1 - 2.6, Math.PI); n.P.give('spear', 'R'); break; }
        case 'merchant': { const S = V.stalls[d.stallIdx]; n.stall = S; S.merchant = n; const p = SW(S, 0, -0.55); place(n, p.x, p.z, S.ry); break; }
        case 'buyer': { n.home = A.buyer[bi++]; n.foodStalls = foodStalls; n.custX = d.custX; if (n.home < 0) { kill(n); break; } n.deps = [n.home]; startInside(rnd(0, 12)); break; }
        case 'water': { n.home = A.water[wi++]; n.qSide = d.qSide; if (n.home < 0) { kill(n); break; } n.deps = [n.home]; startInside(rnd(0, 18)); break; }
        case 'sweeper': {
          n.home = A.sweeper[si++]; if (n.home < 0) { kill(n); break; } n.deps = [n.home];
          if (si === 1) { const sp = V.spots[n.home]; place(n, sp.front.x, sp.front.z, sp.ry); n.P.give('broom', 'R'); n.steps = PLANS.sweeper(n).slice(exitH(n.home).length + 1); }   // já está varrendo
          else startInside(rnd(4, 20));
          break;
        }
        case 'gardener': { n.home = A.gardener[gi++]; if (n.home < 0) { kill(n); break; } n.deps = [n.home]; startInside(rnd(0, 25)); break; }
        case 'chat': {
          if (!pr) { kill(n); break; }
          n.pair = pr; n.pairIdx = d.pair; pr.npcs[d.pair] = n; n.home = A.pair.homes[d.pair]; n.deps = [n.home]; n.cycle = 0;
          const p = pr.at[d.pair], o = pr.at[1 - d.pair]; place(n, p.x, p.z, angTo(p.x, p.z, o.x, o.z));   // já começam conversando
          n.cycle = 1; const M = pr.meets[1] || (pr.meets[1] = { D: rnd(14, 24), arrived: [true, true], start: -1, ended: false });
          n.steps = [{ t: 'converse', M, me: d.pair, other: null }, { t: 'act', act: 'wave', dur: 1.5 }, ...(d.pair === 0 && pr.visit >= 0 ? visit(pr.visit) : []), ...enterH(n.home), { t: 'inside', dur: rnd(20, 40) }];
          break;
        }
        case 'elder': { const B = V.plazaBenches[d.bench], p = SW(B, d.bench === 0 ? -0.4 : 0.4, 0.17); place(n, p.x, p.z, B.ry); n.st.seat = 0.53; break; }
        case 'porter': { const D = V.depot.door; place(n, D.x, D.z, -Math.PI / 2, false); n.deps = [V.spots.indexOf(V.shops.tavern), V.spots.indexOf(V.shops.bakery)]; n.steps = [{ t: 'inside', dur: rnd(1, 6) }]; break; }
        case 'baker': case 'smith': case 'weaver': case 'keeper': {
          const s = V.spots.indexOf(V.shops[d.shop]); n.workSpot = s; n.deps = [s];
          if (!present(s)) { kill(n); break; }
          n.anchor = anchorFor(s, d.shop);
          if (d.plan === 'smith') { n.P.give('hammer', 'R'); n.P.give('tongs', 'L'); const f = LW(V.spots[s], -4.1, -1.6); n.forgeRy = angTo(n.anchor.p.x, n.anchor.p.z, f.x, f.z); }
          place(n, n.anchor.p.x, n.anchor.p.z, n.anchor.ry); break;
        }
        case 'kids': { const a = kids.ang[d.kid] = d.kid * 0.9; place(n, F.x + Math.sin(a) * 4.95, F.z + Math.cos(a) * 4.95, a + Math.PI / 2); break; }
        case 'browser': { n.home = A.browser[d.lead ? 1 : d.side < 0 ? 2 : 0]; if (n.home < 0) { kill(n); break; } n.deps = [n.home]; startInside(d.lead ? rnd(0, 4) : rnd(2, 12)); break; }
        case 'follow': { n.leader = npcs.find(q => q.def.plan === 'browser' && q.def.lead); n.inside = true; n.followSide = 1; break; }
        case 'local': { n.visitTo = null; n.steps = [{ t: 'inside', dur: rnd(0.5, 8) }]; n.si = 0; n.inside = true; break; }
        case 'walker': {
          n.home = A.walker[ki++]; if (n.home < 0) { kill(n); break; } n.deps = [n.home]; n.visitable = A.houses;
          if (ki === 1) {                                                         // um já está na rua, indo visitar alguém
            const sp = V.spots[n.home]; place(n, sp.front.x, sp.front.z, sp.ry); const v = pickVisit(n);
            n.steps = [...(v >= 0 ? visit(v) : []), ...enterH(n.home), { t: 'inside', dur: rnd(25, 50) }];
          } else startInside(rnd(2, 30));
          break;
        }
        default: break;
      }
      if (pr && d.plan === 'chat') for (const s of n.steps) if (s.t === 'converse') s.other = pr.npcs[1 - d.pair] || n;
      n.y = H(n.x, n.z);
    }
    if (pr) for (const n of pr.npcs) if (n) for (const s of n.steps) if (s.t === 'converse') s.other = pr.npcs[1 - n.pairIdx] || n;
    kids.phase = 'run'; kids.t0 = 0; kids.until = rnd(14, 22); kids.chaser = 0; kids.lat = [0, 0];
  }

  // ---------- API ----------
  return {
    object: root,
    /** Uma vez, na criação do mundo medieval: nuvens, pássaros, fumaça, faíscas, carroças e pessoas (construídos uma vez). */
    setup(world, plan) {
      V = plan; W = world; router = makeRouter(V);
      clouds = buildClouds(); birds = buildBirds(); smoke = buildSmoke(); sparks = buildSparks();
      root.add(clouds.im, birds.body, birds.wing, smoke.im, sparks.im);
      carts = createTractors(audio); root.add(carts.object);
      cartObjs.length = 0; cartObjs.push(buildCart(0), buildCart(1));
      npcs.length = 0; DEFS.forEach((d, i) => npcs.push(makeNpc(d, i)));
      sceneMarks = world && world.scene ? scanScene(world.scene) : sceneMarks;
      ready = true;
    },
    /** Depois de cada world.setLayout (partida nova). */
    layout(world, game, plan) {
      if (plan && plan !== V) { V = plan; router = makeRouter(V); }
      W = world || W; ctxGame = game; if (!ready) return;
      if (!root.children.includes(carts.object)) root.add(carts.object);
      if (world && world.scene && !sceneMarks.smoke.length && !sceneMarks.flag.length && !sceneMarks.water.length) sceneMarks = scanScene(world.scene);
      destroyed.clear();
      // marcadores dos lotes presentes
      doors.clear(); lotMarks = { flag: [], cloth: [], water: [], forge: [], smoke: [] }; emitters = [];
      V.spots.forEach((sp, s) => {
        const h = game.layout[s]; if (h == null || h < 0) return;
        const lot = W.lotGroup(h); if (!lot) return;
        let m = scanCache.get(lot); if (!m) { m = scan(lot); scanCache.set(lot, m); }
        lot.updateWorldMatrix(true, true);
        if (m.door) { m.door.rotation.y = 0; const dp = doorstep(sp); doors.set(s, { obj: m.door, ang: 0, target: 0, closeAt: -1, p: dp }); }
        for (const k of ['flag', 'cloth', 'water', 'forge']) for (const o of m[k]) lotMarks[k].push(o);
        for (const o of m.smoke) { o.getWorldPosition(_v); emitters.push({ p: _v.clone(), s, next: rnd(0, 1), dark: !!sp.shop && sp.shop === 'smithy' }); }
      });
      for (const o of sceneMarks.smoke) { o.updateWorldMatrix(true, false); o.getWorldPosition(_v); emitters.push({ p: _v.clone(), s: -1, next: rnd(0, 1) }); }
      smoke.list.length = 0; sparks.list.length = 0;
      // carroças (mesmos objetos a cada partida)
      const loops = V.cartLoops.map(l => l.filter((p, i) => { const q = l[(i + 1) % l.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5; }));
      cartIdx = 0; carts.reset({ loops, build: () => cartObjs[cartIdx++ % cartObjs.length], speed: 2.6 });
      layoutNpcs(game); laid = true;
    },
    /** Todo quadro no bairro. */
    update(dt, ctx) {
      if (!ready || !V || !laid) return;                                       // só depois do primeiro layout (casas da partida)
      dt = Math.min(dt, 0.1); t += dt; ctxRef = ctx || {};
      const L = ctxRef.listener || { x: V.F.x, z: V.F.z }, camera = ctxRef.camera;
      if (camera) { camera.updateMatrixWorld(); const e = camera.matrixWorld.elements; const l = Math.hypot(e[0], e[2]) || 1; cam.rx = e[0] / l; cam.rz = e[2] / l; cam.x = e[12]; cam.z = e[14]; } else { cam.x = L.x; cam.z = L.z; }
      stepBudget = Math.min(stepBudget + dt * 10, 3); pathBudget = 3;
      // destruição: casas/trabalhos destruídos levam a pessoa embora
      destroyT -= dt;
      if (destroyT <= 0 && ctxRef.isDestroyed) {
        destroyT = 0.25;
        for (let s = 0; s < V.spots.length; s++) if (!destroyed.has(s) && ctxRef.isDestroyed(s)) {
          destroyed.add(s); const sp = V.spots[s];
          for (const n of npcs) if (!n.dead && (n.deps.includes(s) || n.curSpot === s || (!n.inside && Math.hypot(n.x - sp.px, n.z - sp.pz) < 8))) {
            if (n.def.plan === 'porter' && !n.deps.every(q => destroyed.has(q)) && n.curSpot !== s && Math.hypot(n.x - sp.px, n.z - sp.pz) >= 8) continue;
            kill(n);
          }
          doors.delete(s); emitters = emitters.filter(e => e.s !== s);
        }
      }
      // obstáculos grandes: van, personagem, carroças
      OBS = [];
      const van = ctxRef.van;
      if (van && van.x != null && van.visible !== false) { const c = Math.cos(van.heading || 0), s2 = Math.sin(van.heading || 0); for (const k of [-1.5, 0, 1.5]) OBS.push([van.x + c * k, van.z + s2 * k, 1.25]); }
      if (ctxRef.walker && ctxRef.walker.visible) OBS.push([ctxRef.walker.x, ctxRef.walker.z, 0.5]);
      for (const c of carts.list) for (const k of [1.4, -1.0]) OBS.push([c.x + c.ux * k, c.z + c.uz * k, 1.3]);
      // pessoas
      const b0 = busy(); if (b0 !== busyVal) { busyVal = b0; busySince = t; }
      const b = busyStable();
      for (const n of npcs) {
        if (n.dead) continue;
        const dl = Math.hypot(n.x - L.x, n.z - L.z);
        n.near = dl < FAR;
        if (n.def.plan === 'local' && !n.talking && dl > 70 && n.cur && (n.cur.t === 'inside' || (n.cur.t === 'go' && dl > FAR))) { resetNpc(n); n.home = -1; n.deps = []; n.visitTo = null; }   // ficou longe: passa a "morar" perto do jogador (fora de vista)
        if (n.def.plan === 'follow') followUpdate(n, dt);
        else if (n.def.plan !== 'kids') {
          if (n.workSpot >= 0 && n.workSpot === b && !n.inside && !n.yielding && !n.talking) workerYield(n);
          if (n.yielding && n.workSpot !== b && n.si >= n.steps.length) n.yielding = false;
          if (n.talking) talkAnim(n, dt);
          else if (n.stall && n.stall.serve && n.stall.serve.who && !n.stall.serve.done && n.stall.serve.who.cur && n.stall.serve.who.cur.t === 'until' && Math.hypot(n.stall.serve.who.x - n.x, n.stall.serve.who.z - n.z) < 4.5) serveUpdate(n, dt);
          else runStep(n, dt);
        }
        let lift = 0;                                                            // degrau de pedra na porta das casas
        if (n.stepLot >= 0) { const sp = V.spots[n.stepLot]; if (sp && !sp.shop) { const c = Math.cos(sp.ry), s2 = Math.sin(sp.ry), dx = n.x - sp.px, dz = n.z - sp.pz, lx = dx * c - dz * s2, lz = dx * s2 + dz * c; if (Math.abs(lx - sp.doorX) < 0.85 && lz > 4.6 && lz < 5.78) lift = 0.16; } }
        n.lift = (n.lift || 0) + clamp(lift - (n.lift || 0), -2 * dt, 2 * dt);
        n.y = H(n.x, n.z) + n.lift;
      }
      kidsUpdate(dt);
      // visibilidade, sólidos, animação
      const vanBox = OBS.slice(0, 3);
      for (const n of npcs) {
        if (n.dead) continue;
        const dl = Math.hypot(n.x - L.x, n.z - L.z), show = !n.inside && dl < FAR;
        if (show !== n.vis) { n.vis = show; n.P.root.visible = show; if (!show) delSolid(n); }
        if (!show) continue;
        const R = n.P.root; R.position.set(n.x, n.y + 0.03, n.z); R.rotation.y = n.ry;
        Object.assign(n.solid, { x0: n.x - R_NPC, x1: n.x + R_NPC, z0: n.z - R_NPC, z1: n.z + R_NPC });
        if (!n.inSolid && !vanBox.some(o => Math.hypot(o[0] - n.x, o[1] - n.z) < o[2] + 0.5) && !(ctxRef.walker && ctxRef.walker.visible && Math.hypot(ctxRef.walker.x - n.x, ctxRef.walker.z - n.z) < 0.9)) addSolid(n);
        const sh = dl < SHADOW; if (n.P.mesh.castShadow !== sh) n.P.setShadow(sh);
        if (dl < ANIM) {
          n.st.t = t; n.st.ev.length = 0;
          animatePerson(n.P, n.st);
          for (const e of n.st.ev) {
            if (e === 'strike') { const w = n.cur && n.cur.work; const k = earK(n.x, n.z, 45); if (k > 0) snd.clang(k, panOf(n.x, n.z)); if (w) burstSparks({ x: w.x, y: w.y + 0.06, z: w.z }); }
            else if (e === 'swish') { const k = earK(n.x, n.z, 16); if (k > 0) snd.swish(k, panOf(n.x, n.z)); }
            else if (e === 'knock') { const k = earK(n.x, n.z, 20); if (k > 0) snd.knock(k, panOf(n.x, n.z)); }
          }
        }
      }
      // carroças
      const obs = [{ circles: OBS.filter((o, i) => i < 3 || o[2] < 1) }, { circles: npcs.filter(n => n.vis && !n.dead).map(n => [n.x, n.z, 0.4]) }];
      carts.update(dt, obs, null);
      let cBest = 1e9, cPan = 0, cSpd = 0;
      for (const c of carts.list) {
        const g = c.mesh, d = Math.hypot(c.x - L.x, c.z - L.z), fx = c.x + c.ux * 1.8, fz = c.z + c.uz * 1.8, bx = c.x - c.ux * 1.8, bz = c.z - c.uz * 1.8;
        const pitch = Math.atan2(H(fx, fz) - H(bx, bz), 3.6);
        g.userData.tick(c.s, c.v, t, pitch, d < 70);
        const stp = g.userData.steps(c.s);
        if (stp !== c._stp) { c._stp = stp; if (d < 30 && c.v > 0.3) snd.hoof(earK(c.x, c.z, 30), panOf(c.x, c.z)); }
        if (d < cBest) { cBest = d; cPan = panOf(c.x, c.z); cSpd = c.v / 2.6; }
      }
      // portas
      for (const [, d] of doors) {
        if (d.closeAt >= 0 && t >= d.closeAt) { d.target = 0; d.closeAt = -1; }
        if (d.ang !== d.target) { d.ang += clamp(d.target - d.ang, -2.4 * dt, 2.4 * dt); d.obj.rotation.y = d.ang; }
      }
      // ambiente
      clouds.im.visible = !camera || camera.position.y < 125;                     // visão do bairro inteiro (C): as nuvens não tapam nada
      updateClouds(dt); updateBirds(dt);
      for (const e of emitters) {
        if (Math.hypot(e.p.x - L.x, e.p.z - L.z) > 85) continue;
        e.next -= dt; if (e.next <= 0) { e.next = rnd(0.45, 0.75); emitSmoke(e); }
      }
      updateSmoke(dt, camera); updateSparks(dt);
      const near = o => { o.getWorldPosition(_v); return Math.hypot(_v.x - L.x, _v.z - L.z) < 110; };
      animMarks(sceneMarks, dt, o => (o.userData._near == null || (t * 4 | 0) % 8 === 0 ? (o.userData._near = near(o)) : o.userData._near));
      animMarks(lotMarks, dt, o => (o.userData._near == null || (t * 4 | 0) % 8 === 0 ? (o.userData._near = near(o)) : o.userData._near));
      // sons de ambiente
      chirpT -= dt;
      const Gd = V.garden, gK = clamp(1 - Math.hypot((Gd.x0 + Gd.x1) / 2 - L.x, (Gd.z0 + Gd.z1) / 2 - L.z) / 50, 0, 1);   // no jardim: mais pássaros (e mais perto)
      if (chirpT <= 0) { chirpT = rnd(3, 11) * (1 - 0.72 * gK); const a = rnd(0, 6.3), r = rnd(8, 30) * (1 - 0.5 * gK), x = L.x + Math.cos(a) * r, z = L.z + Math.sin(a) * r; snd.chirp(Math.min(1, 0.5 + Math.random() * 0.5 + 0.3 * gK), panOf(x, z)); }
      const F = V.F, dF = Math.hypot(F.x - L.x, F.z - L.z), lv = V.level(L.x, L.z);
      snd.update(dt, {
        fountain: Math.pow(clamp(1 - dF / 42, 0, 1), 1.5), fountainPan: panOf(F.x, F.z),
        market: Math.pow(clamp((105 - dF) / 80, 0, 1), 1.6),
        wind: clamp(0.25 + clamp((dF - 30) / 120, 0, 0.5) + (lv === 2 ? 0.35 : 0), 0, 1) * (1 - 0.6 * gK),   // o jardim junto da muralha é abrigado e quieto
        cart: cBest < 35 ? Math.pow(1 - cBest / 35, 1.5) * clamp(cSpd, 0, 1) : 0, cartPan: cPan,
      });
    },
    /** Morador "conversável" a até 2,2 de (x, z) e livre → handle (ou null). */
    nearTalk(x, z) {
      let best = null, bd = TALK_R;
      for (const n of npcs) {
        if (n.dead || n.inside || !n.vis || n.yielding) continue;
        if (n.cur && n.cur.nt) continue;                                         // entrando/saindo pela porta
        const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; best = n; }
      }
      return best;
    },
    /** Falas para talkBox.show; o morador para e vira para o jogador. */
    talk(n, px, pz) {
      if (!n) return [];
      n.talking = true; n.talkT = 0; n.talkRy = angTo(n.x, n.z, px, pz); n.v = 0;
      const L = linesOf(n);
      if (!n.heard) { n.heard = true; n.lineI = Math.floor(Math.random() * L.length); } else n.lineI = (n.lineI + 1) % L.length;   // 1ª conversa: qualquer fala; depois, a seguinte
      return [[L[n.lineI]]];
    },
    endTalk(n) { if (n) { n.talking = false; n.st.act = null; n.st.talk = 0; } },
    /** [{x, z, r}] dos moradores e carroças visíveis. */
    obstacles() {
      const out = [];
      for (const n of npcs) if (n.vis && !n.dead) out.push({ x: n.x, z: n.z, r: 0.4 });
      if (carts) for (const c of carts.list) for (const k of [1.4, -1.0]) out.push({ x: c.x + c.ux * k, z: c.z + c.uz * k, r: 1.3 });
      return out;
    },
    silence() { snd.silence(); },
    detach() {
      for (const n of npcs) delSolid(n);
      if (carts) carts.detach();
      snd.silence(); snd.stop();
      if (root.parent) root.parent.remove(root);
    },
    /** Testes: estado interno. */
    _debug: { get npcs() { return npcs; }, get carts() { return carts; }, get router() { return router; }, get doors() { return doors; }, get emitters() { return emitters; }, get smoke() { return smoke; }, kids, fount },
  };
}
