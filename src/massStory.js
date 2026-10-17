// História secundária, Bairro 24 (Modo Livre), depois da montagem da igreja: a conversa sobre a oficina, a missa,
// o temporal, a oficina destruída e a queda do sino roxo. Estados próprios em `S.phase`; main.js usa o estado 'mstory'
// nas cenas e volta a 'walk' enquanto o jogador anda livre na igreja (o temporal continua).
//   talk  → sentados no banco do K (câmera das conversas da igreja), falas com E/Espaço
//   mass  → fade, missa com os bancos ocupados em pares, temporal crescendo, o K sai correndo pelo corredor
//   free  → controle de volta (a pé, dentro da igreja); sair pela porta aciona a próxima cena
//   shop  → o K diante da oficina, que continua se desfazendo
//   bell  → corte para o corredor dos sinos: o roxo cai; no impacto, tela preta (5 s, só o temporal) → tela inicial
// Salva MASS_KEY no impacto. Sem falas na missa nem depois da conversa.
import * as THREE from 'three';
import { buildStandingReader, walkK } from './models/reader.js';
import { buildMedPerson, animatePerson } from './models/medievalPeople.js';
import { buildBody } from './models/driver.js';
import { BELL_SPOT } from './models/bell.js';

export const MASS_KEY = 'adress.med.mass';            // a sequência da missa/temporal terminou (libera os 4 níveis extras)
export const BELL3_KEY = 'adress.med.bell3';          // o sino laranja já caiu (montagem)
export const NOTICE_KEY = 'adress.extra.notice';      // aviso "A história continua…" já mostrado

const L = s => {
  const out = [];
  for (const part of s.split(/(\[\.\.\.\]|\[…\]|\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    if (part === '[...]' || part === '[…]') out.push({ p: 0.65 });
    else if (part.startsWith('**')) out.push({ b: part.slice(2, -2) });
    else out.push(out.length && out[out.length - 1].p ? part.replace(/^\s+/, '') : part);
  }
  return out;
};
const LINES = [
  'Eu continuo pensando naquela oficina.',
  'Mesmo aqui, [...] já estou imaginando o que ainda posso fazer lá.',
  'Quero colocar uma bancada maior perto da janela. [...] A luz chega bem naquele canto.',
  'E prateleiras de verdade. [...] Um lugar certo para cada ferramenta.',
  'Parece que, desde que abrimos aquela porta, [...] eu comecei a enxergar tudo o que esse lugar pode se tornar.',
  'Não quero que seja apenas um cômodo onde consigo fazer alguns consertos.',
  'Quero uma ótima oficina.',
  'Um lugar onde as pessoas tragam alguma coisa quebrada [...] e tenham confiança de que eu vou saber o que fazer.',
  'Talvez, um dia, eu consiga ensinar alguém. [...] Ter mais gente trabalhando comigo.',
  'Imagino a porta aberta de manhã, [...] o trabalho esperando na bancada, [...] alguém chegando com uma ideia que ainda não sabe como realizar.',
  'Tenho vontade de fazer tanta coisa que às vezes nem sei por onde começar.',
  'Passei muito tempo imaginando um lugar assim.',
  'Agora eu sei onde ele fica. [...] Sei como a porta soa quando abre.',
  'E sei que amanhã posso voltar.',
  'Você me ajudou a chegar até essa parte.',
  'Eu ainda quero fazer muito mais.',
  '[...] Acho que posso construir uma vida inteira ali.',
].map(L);
// gesto do K em cada fala: [olhar para o jogador 0..1, inclinar o tronco para a frente 0..1, cabeça baixa/alta −1..1]
const GEST = [[0.2, 0, -0.3], [0.8, 0.2, 0.1], [0.4, 0.5, 0.4], [0.6, 0.4, 0.3], [1, 0.3, 0.5], [0.5, 0.1, -0.1], [1, 0.6, 0.3],
  [0.7, 0.4, 0.2], [0.5, 0.2, 0.6], [0.3, 0.5, 0.7], [0.9, 0.3, 0.1], [0.2, 0, -0.2], [0.6, 0.2, 0.3], [0.8, 0.1, 0.2], [1, 0.2, 0], [1, 0.5, 0.4], [0.4, 0.3, 0.6]];
const HINT = { hint: 'E / Espaço — Continuar' };
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
const K_SEAT = { x: 2.3, z: -23 }, P_SEAT = { x: 3.5, z: -23 };         // banco do K (6º, à direita de quem entra)
const PEW_Z = r => -16 - r * 1.4;
const MASS_T = { stormAt: 6, stormFull: 17, camB: 8.5, look: 15.5, stand: 17.2, run: 17.9 };
const SHOP_T = 12.5, BELL_FALL = 1.7, BLACK_T = 5;

/** Chuva e vento (WebAudio, sem arquivo): chiado da água + rumor grave + trovões. Abafado dentro (cutoff baixo). */
export function createRainAudio(audio) {
  let N = null, lvl = 0, cut = 900, cur = 0, curCut = 900, t = 0, nextThunder = 6;
  let mul = 1, mulTo = 1, mulRate = 0;                   // redução temporária (ex.: 20% antes do sino roxo), relativa ao nível atual
  function build() {
    const ac = audio.ctx; if (!ac) return null;
    const len = ac.sampleRate * 3, wb = ac.createBuffer(1, len, ac.sampleRate), wd = wb.getChannelData(0), bb = ac.createBuffer(1, len, ac.sampleRate), bd = bb.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { wd[i] = Math.random() * 2 - 1; b = 0.99 * b + 0.1 * (Math.random() * 2 - 1); bd[i] = b; }
    for (let i = 0; i < 3000; i++) { const k = i / 3000; wd[i] = wd[i] * k + wd[len - 3000 + i] * (1 - k); bd[i] = bd[i] * k + bd[len - 3000 + i] * (1 - k); }
    const rain = ac.createBufferSource(); rain.buffer = wb; rain.loop = true;
    const wind = ac.createBufferSource(); wind.buffer = bb; wind.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const wlp = ac.createBiquadFilter(); wlp.type = 'lowpass'; wlp.frequency.value = 380;
    const rg = ac.createGain(), wg = ac.createGain(), out = ac.createGain(); rg.gain.value = 0.55; wg.gain.value = 1.4; out.gain.value = 0;
    rain.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(out); wind.connect(wlp); wlp.connect(wg); wg.connect(out); out.connect(audio.out);
    rain.start(); wind.start(0, 1.3);
    return { rain, wind, lp, wlp, rg, wg, out };
  }
  function thunder(k) {
    const ac = audio.ctx; if (!ac || !N) return;
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { b = 0.995 * b + 0.06 * (Math.random() * 2 - 1); d[i] = b * Math.exp(-i / (ac.sampleRate * 1.2)) * (i < 800 ? i / 800 : 1); }
    const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.min(curCut, 260);
    const g = ac.createGain(); g.gain.value = 2.2 * k; s.connect(f); f.connect(g); g.connect(audio.out); s.start();
  }
  return {
    /** level 0..1; inside = abafado (dentro da igreja). */
    set(level, inside) { lvl = level; cut = inside ? 750 : 9000; if (!N && level > 0) N = build(); },
    update(dt, paused) {
      if (!N) return null;
      t += dt; const k = 1 - Math.exp(-dt * 1.6);
      cur += (lvl - cur) * k; curCut += (cut - curCut) * (1 - Math.exp(-dt * 6));
      const gust = 0.75 + 0.18 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 1.9 + 1);
      if (mul !== mulTo) mul = mulTo < mul ? Math.max(mulTo, mul - mulRate * dt) : Math.min(mulTo, mul + mulRate * dt);
      try { N.out.gain.value = paused ? 0 : cur * 0.9 * mul; N.lp.frequency.value = curCut; N.wlp.frequency.value = 220 + 260 * gust * (curCut > 2000 ? 1 : 0.6); N.wg.gain.value = 1.2 * gust; } catch (e) { /* */ }
      let flash = 0;
      if (cur * mul > 0.55 && !paused && (nextThunder -= dt) <= 0) { nextThunder = 7 + Math.random() * 9; flash = cur; setTimeout(() => thunder(cur * mul), 400 + Math.random() * 900); }
      return flash;
    },
    stop() { if (!N) return; try { N.rain.stop(); N.wind.stop(); N.out.disconnect(); } catch (e) { /* */ } N = null; cur = 0; lvl = 0; mul = mulTo = 1; },
    /** Leva o volume a `to` (fração do atual) em `secs` segundos, sem parar o som. */
    duck(to, secs) { mulTo = to; mulRate = Math.abs(mul - to) / Math.max(0.01, secs); },
    /** Já no nível pedido, sem rampa (e sem redução). */
    snap() { cur = lvl; curCut = cut; mul = mulTo = 1; },
  };
}

/** O impacto do sino roxo no piso: um sino grande de verdade — golpe metálico, parciais de sino (hum, prime, terça menor,
 *  quinta, nominal e superiores, com batimento lento), baque grave do bronze no piso e reverberação longa (convolução).
 *  Compressor/limitador no fim: forte e marcante, sem saturar. Pelo barramento de efeitos (volume das Configurações). */
function bellImpact(audio) {
  const ac = audio.ctx; if (!ac) return;
  const now = ac.currentTime + 0.005;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.002; comp.release.value = 0.5;
  const limit = ac.createDynamicsCompressor(); limit.threshold.value = -3; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.001; limit.release.value = 0.2;
  const master = ac.createGain(); master.gain.value = 0.95; master.connect(comp); comp.connect(limit); limit.connect(audio.out);
  // reverberação: resposta ao impulso de ~5,5 s (ruído decaindo, estéreo), mistura generosa
  const irLen = Math.floor(ac.sampleRate * 5.5), ir = ac.createBuffer(2, irLen, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) { const k = i / irLen; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - k, 2.4) * (i < 400 ? i / 400 : 1); } }
  const verb = ac.createConvolver(); verb.buffer = ir; const wet = ac.createGain(); wet.gain.value = 0.55; const dry = ac.createGain(); dry.gain.value = 0.8;
  const bus = ac.createGain(); bus.connect(dry); bus.connect(verb); verb.connect(wet); dry.connect(master); wet.connect(master);
  // parciais de um sino grande (prime ~ 98 Hz): [razão, amplitude, decaimento s]
  const F = 98;
  for (const [r, a, d] of [[0.5, 0.55, 11], [1, 0.7, 9], [1.183, 0.5, 7], [1.506, 0.32, 5.5], [2.0, 0.55, 6], [2.51, 0.3, 4], [2.66, 0.22, 3.5], [3.01, 0.22, 3], [4.07, 0.15, 2.2], [5.4, 0.1, 1.5], [6.7, 0.07, 1.1], [8.2, 0.05, 0.7]]) {
    for (const det of [-0.0018, 0.0018]) {                                                // pares levemente desafinados: o batimento "uóm" do bronze
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = F * r * (1 + det);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(a * 0.32, now + 0.003); g.gain.exponentialRampToValueAtTime(0.0004, now + d);
      o.connect(g); g.connect(bus); o.start(now); o.stop(now + d + 0.1);
    }
  }
  // golpe metálico (clang): ruído com faixas de metal, curtíssimo
  const cl = Math.floor(ac.sampleRate * 0.35), cb = ac.createBuffer(1, cl, ac.sampleRate), cd = cb.getChannelData(0);
  for (let i = 0; i < cl; i++) cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.045));
  for (const [fq, q, gn] of [[1250, 9, 0.9], [2650, 12, 0.6], [4100, 14, 0.4]]) {
    const n = ac.createBufferSource(); n.buffer = cb; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q; const g = ac.createGain(); g.gain.value = gn;
    n.connect(bp); bp.connect(g); g.connect(bus); n.start(now);
  }
  // o peso do bronze batendo no piso: baque grave
  const len = Math.floor(ac.sampleRate * 0.7), buf = ac.createBuffer(1, len, ac.sampleRate), dd = buf.getChannelData(0);
  for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.08));
  const n = ac.createBufferSource(); n.buffer = buf; const nf = ac.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 520; const ng = ac.createGain(); ng.gain.value = 1.1;
  n.connect(nf); nf.connect(ng); ng.connect(bus); n.start(now);
  const sub = ac.createOscillator(), sg = ac.createGain(); sub.frequency.setValueAtTime(62, now); sub.frequency.exponentialRampToValueAtTime(34, now + 1.0);
  sg.gain.setValueAtTime(0.85, now); sg.gain.exponentialRampToValueAtTime(0.001, now + 1.8); sub.connect(sg); sg.connect(bus); sub.start(now); sub.stop(now + 1.9);
  setTimeout(() => { try { master.disconnect(); limit.disconnect(); } catch (e) { /* */ } }, 13000);
}

/** Chuva visível: riscos caindo em volta da câmera, inclinados pelo vento; nunca dentro da igreja nem da oficina coberta. */
export function createRainFx() {
  const N = 5000, pos = new Float32Array(N * 6), seed = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { seed[i * 3] = Math.random(); seed[i * 3 + 1] = Math.random(); seed[i * 3 + 2] = Math.random(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color: '#c9d2dc', transparent: true, opacity: 0.55, depthWrite: false, fog: true });
  const lines = new THREE.LineSegments(geo, mat); lines.frustumCulled = false; lines.renderOrder = 3;
  const invAll = [], _p = new THREE.Vector3();
  let t = 0;
  return {
    object: lines,
    update(dt, cam, level, church) {
      t += dt; lines.visible = level > 0.02; if (!lines.visible) return;
      mat.opacity = 0.2 + 0.45 * level;
      const BX = 46, BY = 30, BZ = 46, sp = 34, wx = 9 * level, wz = 4 * level, L = 0.9 + 0.8 * level, n = Math.floor(N * Math.min(1, 0.15 + level));
      const chs = Array.isArray(church) ? church.filter(Boolean) : church ? [church] : [];   // (uma ou várias igrejas: nunca chove dentro)
      const invs = chs.map((c, j) => { c.updateMatrixWorld(); return (invAll[j] = invAll[j] || new THREE.Matrix4()).copy(c.matrixWorld).invert(); });
      for (let i = 0; i < N; i++) {
        const o = i * 6;
        if (i >= n) { pos[o + 1] = pos[o + 4] = -999; continue; }
        const fy = (seed[i * 3 + 1] * BY - t * sp) % BY, y = cam.y + BY / 2 + (fy < 0 ? fy + BY : fy) - BY;
        const ky = (cam.y + BY / 2 - y) / sp;
        let x = cam.x + (seed[i * 3] - 0.5) * BX + wx * ky, z = cam.z + (seed[i * 3 + 2] - 0.5) * BZ + wz * ky;
        x = cam.x + ((x - cam.x + BX * 1.5) % BX) - BX / 2; z = cam.z + ((z - cam.z + BZ * 1.5) % BZ) - BZ / 2;
        if (invs.length && invs.some(m => { _p.set(x, y, z).applyMatrix4(m); return _p.x > -24 && _p.x < 24 && _p.z > -58 && _p.z < 2.4 && _p.y < 72; })) { pos[o + 1] = pos[o + 4] = -999; continue; }
        pos[o] = x; pos[o + 1] = y; pos[o + 2] = z;
        pos[o + 3] = x - wx / sp * L * 3; pos[o + 4] = y + L; pos[o + 5] = z - wz / sp * L * 3;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/** Água escorrendo nos vitrais (por dentro): faixas finas descendo devagar sobre o vidro. */
function streakTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  g.clearRect(0, 0, 64, 256);
  for (let i = 0; i < 26; i++) { const x = Math.random() * 64, w = 0.6 + Math.random() * 1.4, y = Math.random() * 256, h = 40 + Math.random() * 140;
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(210,225,240,0)'); gr.addColorStop(0.6, 'rgba(210,225,240,0.5)'); gr.addColorStop(1, 'rgba(230,240,250,0.85)'); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function createMassStory(ctx) {
  const { walker, input, talkBox, audio } = ctx;
  let S = null;
  const rainAudio = createRainAudio(audio), rain = createRainFx();
  const flag = k => { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } };
  const set = k => { try { localStorage.setItem(k, '1'); } catch (e) { /* */ } };
  const church = () => ctx.church();
  const W = (x, y, z) => church().localToWorld(new THREE.Vector3(x, y, z));
  const available = () => ctx.storyOn() && !!church() && flag(ctx.INTRO_KEY) && !flag(MASS_KEY);
  const pewK = () => church().userData.pewK;

  // ---------- conversa ----------
  const nearK = () => { if (!available() || S || !pewK().visible) return false; const k = W(K_SEAT.x, 0, K_SEAT.z); return Math.hypot(walker.x - k.x, walker.z - k.z) < 3.2; };
  function walkPrompt() { return nearK() ? 'Conversar' : ''; }
  function walkAction() { if (!nearK()) return false; startTalk(); return true; }

  let seated = null;                                   // o jogador sentado (corpo do personagem com as cores do Shop)
  function seatedPlayer() {
    if (seated) return seated;
    const g = new THREE.Group(); g.name = 'player-seated';
    const B = buildBody(g);
    B.pelvis.position.y = 0.8;
    for (const l of B.legs) { l.hip.rotation.z = Math.PI / 2 - 0.05; l.knee.rotation.z = -Math.PI / 2 + 0.1; }
    for (const a of B.arms) { a.sh.rotation.z = 0.5; a.elbow.rotation.z = 0.9; }          // mãos sobre as coxas
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const cap = g.getObjectByName('cap'); if (cap) cap.visible = false;   // na igreja, sem boné (a customização salva não muda)
    seated = { g, B };
    return seated;
  }
  function startTalk() {
    S = { phase: 'sitIn', t: 0, line: 0, gest: [0, 0, 0], g: [0, 0, 0] };
    ctx.thirdMusic.fadeOut(3);                          // "The Third Sanctuary" some em ~3 s enquanto a conversa começa
    ctx.setState('mstory'); walker.show(false);
    talkBox.fadeBlack(1, 350, () => {
      const P = seatedPlayer(); P.g.position.set(P_SEAT.x, 0, P_SEAT.z); P.g.rotation.set(0, Math.PI / 2, 0); church().add(P.g); P.g.visible = true;
      if (S) { S.phase = 'talk'; S.t = 0; }
      talkBox.fadeBlack(0, 500);
      talkBox.show(LINES, endTalk, { ...HINT, onAdvance: i => { if (S) S.line = i; } });
    });
  }
  function endTalk() {
    if (!S) return;
    S.phase = 'toMass'; S.t = 0;
    if (ctx.thirdMusic.active) ctx.thirdMusic.fadeOut(2.6);   // (já saiu no começo da conversa)
    talkBox.fadeBlack(1, 1400, () => { setupMass(); if (S) { S.phase = 'mass'; S.t = 0; S.massReady = true; } setTimeout(() => talkBox.fadeBlack(0, 1600), 1200); });
  }

  // ---------- missa ----------
  let crowd = null, kRun = null, priest = null, streaks = null;
  function setupMass() {
    const c = church();
    if (!crowd) {
      crowd = new THREE.Group(); crowd.name = 'mass-crowd'; c.add(crowd); crowd.userData.people = [];
      const roles = ['buyer', 'walker', 'elder', 'water', 'buyer', 'walker', 'gardener', 'elder'];
      let n = 0;
      for (let r = 0; r < 15; r++) for (const [x0, x1] of [[1.4, 4.2], [-4.2, -1.4]]) {
        if (r === 5 && x0 > 0) continue;                                     // o banco do K e do jogador
        for (const x of [x0 + 0.72, x1 - 0.72]) {                            // a dupla: 2 por banco, folga entre um banco e outro
          const P = buildMedPerson({ role: roles[n % roles.length], k: n * 7 + 3, hat: null });   // (dentro da igreja: ninguém de chapéu/capuz)
          P.root.position.set(x, 0, PEW_Z(r) - 0.02); P.root.rotation.y = Math.PI;   // de frente para o altar (−z)
          crowd.add(P.root); crowd.userData.people.push({ P, ph: n * 1.37, s: { mode: 'sit', seat: 0.6, t: 0 } }); n++;
        }
      }
      priest = buildMedPerson({ role: 'elder', k: 11, hat: null }); priest.root.position.set(0, 0.66, -43.0); crowd.add(priest.root);
      crowd.userData.priestS = { mode: 'idle', t: 0 };
      // água escorrendo por dentro dos vitrais das naves laterais
      streaks = new THREE.Group(); c.add(streaks);
      const tex = streakTex(), sm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, fog: false });
      for (const s of [-1, 1]) for (const zc of [-16.1, -22.3, -28.5, -34.7, -40.9]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 6.4), sm); m.position.set(s * 11.55, 6.4, zc); m.rotation.y = -s * Math.PI / 2; streaks.add(m);
      }
      streaks.userData.mat = sm; streaks.userData.tex = tex;
    }
    crowd.visible = true; streaks.visible = true;
    const P = seatedPlayer(); P.g.visible = true;
    pewK().visible = true; const h = pewK().userData.head, tor = pewK().userData.torso; if (h) h.rotation.set(0, 0, -0.1); if (tor) tor.rotation.z = 0.06;
    if (ctx.massMusic) ctx.massMusic.play(2);            // a música da missa (o MP3 ainda vai chegar: ver main.js)
  }
  function updateCrowd(dt, t) {
    if (!crowd || !crowd.visible) return;
    for (const p of crowd.userData.people) {             // respiração e postura (quase parados)
      p.s.t = t + p.ph; p.s.lookYaw = 0.05 * Math.sin(t * 0.13 + p.ph);
      animatePerson(p.P, p.s); p.P.b.body.position.y += 0.006 * Math.sin(t * 1.6 + p.ph);
    }
    crowd.userData.priestS.t = t; animatePerson(priest, crowd.userData.priestS);
  }
  function runK(dt) {                                    // o K sai do banco e corre pelo corredor livre até a porta
    const k = kRun, path = k.path;
    let left = 4.3 * dt; const x0 = k.x, z0 = k.z;
    while (left > 0 && k.i < path.length) {
      const p = path[k.i], dx = p[0] - k.x, dz = p[1] - k.z, d = Math.hypot(dx, dz);
      if (d <= left) { k.x = p[0]; k.z = p[1]; k.i++; left -= d; } else { k.x += dx / d * left; k.z += dz / d * left; left = 0; k.dir = Math.atan2(-dz, dx); }
    }
    k.m.position.set(k.x, 0, k.z); k.m.rotation.y = k.dir;
    walkK(k.m, dt, Math.hypot(k.x - x0, k.z - z0));                     // passos com os pés plantados (gait.js)
    return k.i >= path.length;
  }

  // ---------- oficina destruída e o sino roxo ----------
  let shopK = null;
  function setupShop() {
    const ws = ctx.wsRoot(); if (!ws) return;
    if (kRun) { kRun.m.parent && kRun.m.parent.remove(kRun.m); kRun = null; }   // (o mesmo lugar: em frente à oficina)
    if (!shopK) { shopK = buildStandingReader(); }
    ws.add(shopK); shopK.position.set(0.9, 0, 12.6); shopK.rotation.set(0, Math.PI / 2 + 0.08, 0); shopK.visible = true;
    ctx.wsRuin(0);
    walker.show(false);
  }

  // ---------- atmosfera (céu, névoa, luzes) ----------
  let atm = null;
  function storm(k, inside) {
    const w = ctx.world(), sc = w.scene;
    if (!atm) { const hemi = sc.children.find(o => o.isHemisphereLight); atm = { bg: sc.background && sc.background.clone(), fogC: sc.fog && sc.fog.color.clone(), hemi, h0: hemi && hemi.intensity, hc: hemi && hemi.color.clone(), sun: w.sunLight, s0: w.sunLight && w.sunLight.intensity }; }
    const dark = new THREE.Color('#3a4048'), lerp = (a, b) => a.clone().lerp(b, k);
    if (atm.bg) sc.background.copy(lerp(atm.bg, dark)); if (atm.fogC) sc.fog.color.copy(lerp(atm.fogC, dark));
    if (atm.hemi) { atm.hemi.intensity = atm.h0 * (1 - 0.62 * k) * (inside ? 0.85 : 1); atm.hemi.color.copy(atm.hc).lerp(new THREE.Color('#9aa6b4'), k); }
    if (atm.sun) atm.sun.intensity = atm.s0 * (1 - 0.85 * k);
    S.fog = k > 0.05 ? [THREE.MathUtils.lerp(120, inside ? 16 : 6, k), THREE.MathUtils.lerp(600, inside ? 80 : 70, k)] : null;   // (dentro: a nave inteira fica nítida; lá fora, quase nada)
  }
  function restoreAtm() {
    if (!atm) return; const sc = ctx.world().scene;
    if (atm.bg) sc.background.copy(atm.bg); if (atm.fogC) sc.fog.color.copy(atm.fogC);
    if (atm.hemi) { atm.hemi.intensity = atm.h0; atm.hemi.color.copy(atm.hc); }
    if (atm.sun) atm.sun.intensity = atm.s0; atm = null;
  }
  function flashLight(f) { if (atm && atm.hemi && f > 0) atm.hemi.intensity += 1.6 * f; }

  function cleanupScene() {
    if (crowd) crowd.visible = false; if (streaks) streaks.visible = false; if (seated) seated.g.visible = false;
    if (kRun) { kRun.m.parent && kRun.m.parent.remove(kRun.m); kRun = null; }
    if (shopK && shopK.parent) shopK.parent.remove(shopK);
    if (rain.object.parent) rain.object.parent.remove(rain.object);
    restoreAtm();
  }

  // ---------- quadro a quadro ----------
  function update(dt) {
    if (!S) return;
    const paused = ctx.paused();
    const flash = rainAudio.update(paused ? 0 : dt, paused);
    if (paused) { if (ctx.massMusic && ctx.massMusic.playing) { ctx.massMusic.pause(); S.mp = true; } return; }
    if (S.mp) { S.mp = false; ctx.massMusic && ctx.massMusic.resume(); }
    S.t += dt; const T = S.t;
    if (S.phase === 'talk') {
      talkBox.update(dt);
      if (!S) return;
      if (talkBox.open && T > 0.25 && input.action()) talkBox.press();
      const g = GEST[Math.min(S.line, GEST.length - 1)], k = 1 - Math.exp(-dt * 2.2);
      for (let i = 0; i < 3; i++) S.g[i] += (g[i] - S.g[i]) * k;
      const K = pewK(), h = K.userData.head, tor = K.userData.torso;
      if (h) { h.rotation.y = -0.62 * S.g[0] + 0.05 * Math.sin(T * 0.8); h.rotation.z = -0.1 + 0.12 * S.g[2] + 0.03 * Math.sin(T * 1.3); }
      if (tor) tor.rotation.z = 0.06 - 0.12 * S.g[1];
    }
    if (S.phase === 'mass') {
      updateCrowd(dt, T);
      if (rain.object.parent !== ctx.world().scene) ctx.world().scene.add(rain.object);
      const st = ease((T - MASS_T.stormAt) / (MASS_T.stormFull - MASS_T.stormAt));
      S.storm = st; rainAudio.set(st, true); storm(st * 0.85, true); flashLight(flash);
      if (streaks) { streaks.userData.mat.opacity = 0.55 * st; streaks.userData.tex.offset.y -= dt * (0.15 + 0.5 * st); }
      if (church().userData.matByKey) for (const k of ['gR', 'gB', 'gG', 'gV', 'gP']) { const m = church().userData.matByKey[k]; if (m) { if (m.userData.e0 == null) m.userData.e0 = m.emissiveIntensity; m.emissiveIntensity = m.userData.e0 * (1 - 0.6 * st); } }
      const K = pewK(), h = K.userData.head;
      if (T > MASS_T.look && T < MASS_T.stand && h) { const u = ease((T - MASS_T.look) / 0.9); h.rotation.y = 1.25 * u; h.rotation.z = -0.1 + 0.15 * u; }   // olha para trás, para a saída
      if (T >= MASS_T.stand && !kRun) {                  // levanta e sai do banco pelo vão entre as fileiras, depois o corredor
        K.visible = false;
        const m = buildStandingReader(); church().add(m);
        const z = K_SEAT.z - 0.45;
        // por dentro (o vão entre as fileiras, o corredor central, a porta) e por fora: vira à direita e corre até a oficina
        const L = (x, z) => { const v = church().worldToLocal(new THREE.Vector3(x, 0, z)); return [v.x, v.z]; };
        const a = W(0, 0, 9), f = ctx.wsLocal(0.9, 0, 12.6), sg = Math.sign(f.z - a.z) || 1;
        const outPath = [L(f.x - 0.6, a.z), L(f.x - 0.6, f.z - 2.5 * sg), L(f.x, f.z)];
        kRun = { m, x: K_SEAT.x, z, i: 0, ph: 0, dir: Math.PI, path: [[0.35, z], [0.2, -6], [0, 2.8], [0, 9], ...outPath], door: 3, wait: MASS_T.run - MASS_T.stand };
        m.position.set(kRun.x, 0, z); m.rotation.y = Math.PI / 2 - 0.6;
      }
      if (kRun) {
        if (kRun.wait > 0) { kRun.wait -= dt; kRun.m.rotation.y = Math.PI / 2 - 0.6 + (Math.PI - (Math.PI / 2 - 0.6)) * ease(1 - kRun.wait / 0.7); }
        else { runK(dt); if (kRun.i >= kRun.door) { S.phase = 'free'; S.t = 0; toFree(); } }   // passou pela porta: o jogador pode levantar e segui-lo
      }
    } else if (S.phase === 'free') {
      updateCrowd(dt, T + 40);
      if (kRun && !kRun.done) { if (runK(dt)) { kRun.done = true; kRun.m.rotation.y = Math.PI / 2; kRun.m.position.y = 0; } }
      else if (kRun && kRun.m.userData.gait && kRun.m.userData.gait.amt > 0.003) walkK(kRun.m, dt, 0);   // para de andar suavemente   // chegou: para em frente à oficina, olhando para ela (e espera)
      rainAudio.set(1, insideChurch()); storm(0.85, insideChurch()); flashLight(flash);
      if (streaks) streaks.userData.tex.offset.y -= dt * 0.65;
      const p = church().worldToLocal(new THREE.Vector3(walker.x, 0, walker.z));
      if (ctx.getState() === 'walk' && p.z > 1.2 && Math.abs(p.x) < 6) {   // saiu pela porta: a cena da oficina
        S.phase = 'toShop'; S.t = 0; ctx.setState('mstory');
        if (ctx.massMusic) ctx.massMusic.fadeOut(1.2);
        talkBox.fadeBlack(1, 900, () => { if (!S) return; if (crowd) crowd.visible = false; setupShop(); S.phase = 'shop'; S.t = 0; talkBox.fadeBlack(0, 1100); });
      }
    } else if (S.phase === 'shop') {
      rainAudio.set(1, false); storm(1, false); flashLight(flash);
      ctx.wsRuin(T);
      if (shopK) { shopK.scale.y = 1 + 0.006 * Math.sin(T * 1.7); const h = shopK.userData.head; if (h) h.rotation.z = -0.05 - 0.1 * ease(T / 9) + 0.02 * Math.sin(T * 0.9); }
      if (T >= SHOP_T) { S.phase = 'bell'; S.t = 0; const b = church().userData.newBells[1]; S.bell = b; b.visible = true; b.userData.bell.position.y = 0; b.userData.bell.rotation.set(0, 0, 0); }   // corte seco
    } else if (S.phase === 'bell') {
      rainAudio.set(1, false); storm(1, false);
      if (!S.ducked) { S.ducked = true; rainAudio.duck(0.2, 1.2); }   // chuva de 100% a 20% (pronta antes de o sino começar a cair)
      const b = S.bell.userData.bell, ft = T - BELL_FALL;
      if (ft < 0) { b.rotation.z = 0.025 * Math.sin(T * 9) * ease(T / BELL_FALL); b.position.y = -0.06 * ease((T - 0.9) / 0.8); }   // range e cede
      else {
        const drop = BELL_SPOT.y - S.bell.userData.h - BELL_SPOT.floor;
        b.position.y = -Math.min(drop, 11 * ft * ft); b.rotation.z *= 0.9;
        if (11 * ft * ft >= drop) {                       // impacto: tela preta no mesmo quadro, som do sino
          bellImpact(audio); talkBox.fadeBlack(1, 0); set(MASS_KEY); set(BELL3_KEY);
          b.position.y = -drop; S.phase = 'black'; S.t = 0;
        }
      }
    } else if (S.phase === 'black') {
      rainAudio.set(1, false);
      if (T >= BLACK_T) {
        rainAudio.stop(); cleanupScene(); S = null;
        ctx.toTitle();                                    // corte seco para a tela inicial
        talkBox.fadeBlack(0, 0);
      }
    }
    if (S && (S.phase === 'mass' || S.phase === 'free' || S.phase === 'shop' || S.phase === 'bell')) rain.update(dt, ctx.camera().position, S.phase === 'mass' ? S.storm || 0 : 1, church());
  }
  const insideChurch = () => { const p = church().worldToLocal(new THREE.Vector3(walker.x, 0, walker.z)); return p.z < 1.0 && p.z > -58 && Math.abs(p.x) < 24; };
  function toFree() {                                    // controle de volta: a pé no corredor, ao lado do banco
    const c = church(); if (seated) seated.g.visible = false;
    const a = W(0.9, 0, -23.45), b = W(0.9, 0, -22.45);
    walker.setFloor(0); walker.pose(a.x, a.z, Math.atan2(b.z - a.z, b.x - a.x)); walker.show(true);
    ctx.snapCam(a.x, a.z, Math.atan2(b.z - a.z, b.x - a.x));
    ctx.setState('walk');
    void c;
  }

  /** Câmera das cenas (depois do rig.update). */
  function applyCam(cam) {
    if (!S) return;
    const set2 = (p, l) => { cam.position.copy(p); cam.lookAt(l); };
    if (S.phase === 'talk' || S.phase === 'sitIn' || (S.phase === 'toMass' && !S.massReady)) {    // composição das conversas da igreja: de lado, do corredor, aproximando devagar
      const k = ease(Math.min(1, S.t / 70));
      set2(W(0.2, 2.2, -26.6).lerp(W(1.0, 1.85, -25.3), k), W(2.9, 1.3, -23.0).lerp(W(2.9, 1.45, -23.0), k));   // de 3/4, pela frente: os dois no banco
    } else if (S.phase === 'mass' || S.phase === 'toMass') {
      const T = S.t;
      if (S.phase === 'toMass' || T < MASS_T.camB) set2(W(-5.6, 6.2, -9.5), W(1.2, 1.2, -30));                    // a missa: bancos cheios até o altar
      else if (T < MASS_T.stand + 0.4) set2(W(-0.9, 2.5, -26.2), W(2.95, 1.3, -23.0));                             // ele e o jogador no banco
      else set2(W(1.4, 3.6, -37.5), W(0, 1.3, -10));                                                               // ele corre pelo corredor
    } else if (S.phase === 'shop' || S.phase === 'toShop') {
      if (S.phase === 'toShop') return;
      const T = S.t, u = ease(T / SHOP_T);
      set2(ctx.wsLocal(5.6 - 0.6 * u, 2.2, 20.5 - 1.2 * u), ctx.wsLocal(-0.4, 2.7, 2.5));
    } else if (S.phase === 'bell' || S.phase === 'black') {
      set2(W(8.6, 44.6, 4.2), W(14.6, 43.0, -1.6));
    }
  }
  return {
    walkPrompt, walkAction, update, applyCam,
    get active() { return !!S; }, get phase() { return S && S.phase; }, get t() { return S && S.t; },
    get fog() { return S && S.fog; },
    get inScene() { return !!S && S.phase !== 'free'; },
    /** Nova partida/troca de bairro no meio: desfaz tudo (nada salvo além do que já estava). */
    reset() { if (!S) return; talkBox.hide(); rainAudio.stop(); if (ctx.massMusic) ctx.massMusic.stop(); cleanupScene(); S = null; talkBox.fadeBlack(0, 0); },
    _jump(phase, t = 0) { if (!S) S = { phase, t, line: 0, gest: [0, 0, 0], g: [0, 0, 0] }; if (phase === 'mass') setupMass(); if (phase === 'shop') setupShop(); S.phase = phase; S.t = t; ctx.setState(phase === 'free' ? 'walk' : 'mstory'); if (phase === 'free') toFree(); },
  };
}
