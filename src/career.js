// Carreira: progresso das missões (salvo no navegador), regras de cada missão e desbloqueio das fases.
// Uma fase é liberada só quando as 5 missões da fase anterior estão concluídas e salvas; a 1 começa liberada.
// Objetivo cumprido durante a partida = missão PENDENTE; só é salva quando a mesma partida termina com a entrega certa.
import { MISSIONS, RESERVED } from './missions.js';
import { GRID, ROAD, LOT, roadCenter, slotOrigin } from './layout.js';

const KEY = 'adress.career.v1';
const LEVELS = MISSIONS.length;

// ---- ruas da grade (Níveis 3 e 4): cruzamentos I(j, i) no eixo das ruas j (X) e i (Z) ----
const STEP = () => roadCenter(1) - roadCenter(0);
const NODE_HALF = ROAD / 2 + 0.6;                                  // (folga: o centro da van passa por aqui ao virar)
/** Cruzamento em que está o centro da van (ou null). */
function nodeAt(x, z) {
  const j = Math.round((x - roadCenter(0)) / STEP()), i = Math.round((z - roadCenter(0)) / STEP());
  if (j < 0 || i < 0 || j > GRID || i > GRID || Math.abs(x - roadCenter(j)) > NODE_HALF || Math.abs(z - roadCenter(i)) > NODE_HALF) return null;
  return { j, i, k: j + ',' + i };
}
// Barreira (barriers.list): lado A = oeste/norte, lado B = leste/sul. Cada lado tem um cruzamento "de saída" (âncora).
const BAR_ZONE = 9.5, BAR_GAP = 0.6;
function barZone(b, x, z) {
  const H = b.kind === 'H', lat = H ? z - roadCenter(b.i) : x - roadCenter(b.j), u = H ? x - b.x : z - b.z;
  if (Math.abs(lat) > ROAD / 2 + 0.6 || Math.abs(u) < BAR_GAP || Math.abs(u) > BAR_ZONE) return null;
  return u < 0 ? 'A' : 'B';
}
const barAnchor = (b, side) => side === 'A' ? b.j + ',' + b.i : b.kind === 'H' ? (b.j + 1) + ',' + b.i : b.j + ',' + (b.i + 1);
const edgesOf = path => { const e = new Set(); for (let k = 1; k < path.length; k++) if (path[k] !== path[k - 1]) e.add([path[k - 1], path[k]].sort().join('|')); return e; };
const hasOwn = (a, b) => [...a].some(e => !b.has(e));              // a usa algum trecho que b não usa
// Nível 4, "Olhe antes de seguir": a van parada logo antes de um cruzamento, de frente para ele (não no meio dele)
const LOOK_NEAR = ROAD / 2 - 2.0 + 2.4, LOOK_FAR = ROAD / 2 + 8;    // distância do centro da van ao centro do cruzamento
function approachOf(x, z, heading) {
  const j = Math.round((x - roadCenter(0)) / STEP()), i = Math.round((z - roadCenter(0)) / STEP());
  if (j < 0 || i < 0 || j > GRID || i > GRID) return null;
  const dx = x - roadCenter(j), dz = z - roadCenter(i), c = Math.cos(heading), s = Math.sin(heading);
  let side = null;
  if (Math.abs(dx) < ROAD / 2 + 0.6 && Math.abs(dz) >= LOOK_NEAR && Math.abs(dz) <= LOOK_FAR && -Math.sign(dz) * s > 0.5) side = dz < 0 ? 'N' : 'S';
  else if (Math.abs(dz) < ROAD / 2 + 0.6 && Math.abs(dx) >= LOOK_NEAR && Math.abs(dx) <= LOOK_FAR && -Math.sign(dx) * c > 0.5) side = dx < 0 ? 'W' : 'E';
  return side ? { j, i, k: j + ',' + i, side } : null;
}
/** Ainda no trecho de rua que chega ao cruzamento pelo lado a.side (sem exigir estar de frente). */
function inArm(a, x, z) {
  const dx = x - roadCenter(a.j), dz = z - roadCenter(a.i), V = a.side === 'N' || a.side === 'S';
  const lat = V ? dx : dz, u = V ? dz : dx, sg = a.side === 'N' || a.side === 'W' ? -1 : 1;
  return Math.abs(lat) < ROAD / 2 + 0.6 && u * sg > 0 && Math.abs(u) <= LOOK_FAR + 1;
}
// Nível 5: voltas em volta de uma quadra (a pé e de van). Cada quadra (lote) tem LAP_N checkpoints invisíveis ao longo dos
// 4 lados (o ponto mais perto do contorno do lote); a volta é a soma dos passos de um checkpoint ao vizinho, com sinal
// (ir e voltar na mesma esquina se anula). Fecha quando a soma chega a ±LAP_N: deu a volta toda e voltou ao início.
const LAP_N = 16;
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
/** Distância (com sinal: < 0 dentro) ao contorno do lote s e posição no contorno (0..1, sentido horário a partir do canto noroeste). */
function perim(s, x, z) {
  const o = slotOrigin(s), x0 = o.x, z0 = o.z, x1 = o.x + LOT, z1 = o.z + LOT;
  let px = Math.max(x0, Math.min(x, x1)), pz = Math.max(z0, Math.min(z, z1)), d;
  if (px === x && pz === z) {                                       // dentro: o lado mais perto
    const m = Math.min(x - x0, x1 - x, z - z0, z1 - z); d = -m;
    if (m === x - x0) px = x0; else if (m === x1 - x) px = x1; else if (m === z - z0) pz = z0; else pz = z1;
  } else d = Math.hypot(x - px, z - pz);
  const t = pz === z0 ? px - x0 : px === x1 ? LOT + pz - z0 : pz === z1 ? 2 * LOT + x1 - px : 3 * LOT + z1 - pz;
  return { d, t: t / (4 * LOT) };
}
/** Avança as voltas de todas as quadras perto de (x, z); devolve as quadras em que uma volta acabou de fechar. */
function lapStep(map, x, z, inside, jump) {
  const done = [];
  for (let s = 0; s < GRID * GRID; s++) {
    let st = map.get(s);
    if (jump) { if (st) st.sec = null; continue; }
    const p = perim(s, x, z);
    if (p.d < -inside || p.d > ROAD + 3) continue;                    // longe desta quadra: fica como estava
    if (!st) map.set(s, st = { sec: null, w: 0, laps: 0 });
    const sec = Math.floor(p.t * LAP_N) % LAP_N;
    if (st.sec === null) { st.sec = sec; st.w = 0; continue; }
    let d = sec - st.sec; if (d > LAP_N / 2) d -= LAP_N; if (d < -LAP_N / 2) d += LAP_N;
    st.sec = sec;
    if (Math.abs(d) > 2) { st.w = 0; continue; }                     // voltou por outro ponto: a volta recomeça daqui
    st.w += d;
    if (Math.abs(st.w) >= LAP_N) { st.w = 0; st.laps++; done.push(s); }
  }
  return done;
}
const TURN_HALF = NODE_HALF + 2;                                    // zona das manobras no cruzamento (com folga)
const armOf = (j, i, x, z) => { const dx = x - roadCenter(j), dz = z - roadCenter(i); return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : (dz > 0 ? 'S' : 'N'); };

const CSS = `
.career-toast { position: fixed; left: 50%; top: 128px; z-index: 26; transform: translate(-50%, -10px); opacity: 0;
  padding: .55em 1.2em; border-radius: 999px; background: #1f7a3a; color: #fff; pointer-events: none;
  font: 800 clamp(14px, 1.3vw, 19px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.3);
  transition: opacity .25s, transform .25s; }
.career-toast.on { opacity: 1; transform: translate(-50%, 0); }
`;

export function createCareer() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  const toastEl = document.createElement('div');
  toastEl.className = 'career-toast';
  document.body.appendChild(toastEl);
  let toastTimer = 0;
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 3200);
  }

  // progresso salvo: progress[nível][missão]
  let progress = MISSIONS.map(ms => ms.map(() => 0));
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved)) saved.forEach((row, l) => Array.isArray(row) && progress[l] && row.forEach((v, i) => { if (i < progress[l].length) progress[l][i] = +v || 0; }));
  } catch (e) { /* ignora */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignora */ } };
  // Nível 4: "Viciado em Galos" mudou e "Deu a Volta Errada" virou "É Muito Caro!" — zera o progresso antigo delas uma vez
  try {
    if (!localStorage.getItem(KEY + '.l4v2')) { progress[3][1] = 0; progress[3][3] = 0; save(); localStorage.setItem(KEY + '.l4v2', '1'); }
  } catch (e) { /* ignora */ }
  // níveis reordenados (Veneza 12 → 10, Travessia 10 → 11, Trilhos 11 → 12): o progresso salvo acompanha o cenário, uma vez
  try {
    if (!localStorage.getItem(KEY + '.reorder10') && progress[11]) {
      const [tra, tri, ven] = [progress[9], progress[10], progress[11]].map(r => r.slice());
      progress[9] = ven; progress[10] = tra; progress[11] = tri; save(); localStorage.setItem(KEY + '.reorder10', '1');
    }
  } catch (e) { /* ignora */ }
  // a lua passou do Bairro 17 para o 20 (17–19 ficam reservados): o progresso salvo acompanha o cenário, uma vez
  try {
    if (!localStorage.getItem(KEY + '.lua20')) {
      progress[19] = progress[16].slice(); progress[16] = progress[16].map(() => 0); save(); localStorage.setItem(KEY + '.lua20', '1');
    }
  } catch (e) { /* ignora */ }
  // a 5ª missão do Nível 3 mudou ("Uma Última Volta" → "Manobras Enjoativas"): zera o progresso antigo dela uma vez
  try {
    if (!localStorage.getItem(KEY + '.dizzy')) { progress[2][4] = 0; save(); localStorage.setItem(KEY + '.dizzy', '1'); }
  } catch (e) { /* ignora */ }

  // Missões dos Níveis 1 e 2 trocadas (e as dos Níveis 3 e 4 removidas): zera só o progresso dessas 4 linhas, uma vez.
  try {
    if (!localStorage.getItem(KEY + '.m2')) {
      for (let l = 0; l < 4; l++) progress[l] = progress[l].map(() => 0);
      save(); localStorage.setItem(KEY + '.m2', '1');
    }
  } catch (e) { /* ignora */ }
  // Desbloqueio estrito (uma vez): apaga os desbloqueios guardados antes (KEY.unlocks) e a liberação de teste ligada pela senha
  // antiga (KEY.all); a partir daqui o acesso vem só das missões salvas.
  try {
    if (!localStorage.getItem(KEY + '.m3')) {
      localStorage.removeItem(KEY + '.unlocks'); localStorage.removeItem(KEY + '.all'); localStorage.setItem(KEY + '.m3', '1');
    }
  } catch (e) { /* ignora */ }

  // Missões novas dos Níveis 3 e 4: começam incompletas (zera essas 2 linhas uma vez).
  try {
    if (!localStorage.getItem(KEY + '.m4')) {
      for (const l of [2, 3]) progress[l] = progress[l].map(() => 0);
      save(); localStorage.setItem(KEY + '.m4', '1');
    }
  } catch (e) { /* ignora */ }

  const done = (l, i) => progress[l][i] >= MISSIONS[l][i].goal;
  const levelDone = l => MISSIONS[l].some(m => m.id) && MISSIONS[l].every((m, i) => done(l, i));   // sem missões cadastradas = nunca
  // liberação de desenvolvimento (caixa no painel do cadeado): todos os bairros abertos, mesmo sem as missões (fica salvo)
  let allOpen = false;
  try { allOpen = localStorage.getItem(KEY + '.all') === '1'; } catch (e) { /* ignora */ }
  const prevLevel = l => { let p = l - 1; while (p > 0 && RESERVED.includes(p)) p--; return p; };   // os reservados não contam
  const unlocked = l => !RESERVED.includes(l) && (allOpen || l === 0 || levelDone(prevLevel(l)));

  /** Confirma as missões cumpridas na partida que acabou de terminar com a entrega certa: salva (só aumenta; o que já estava
   *  concluído não conta de novo), avisa e, com as 5 do bairro salvas, o próximo fica desbloqueado (vem do progresso salvo). */
  function confirm(l, ids) {
    const wasDone = levelDone(l), names = [];
    MISSIONS[l].forEach((m, i) => { if (m.id && ids.has(m.id) && progress[l][i] < m.goal) { progress[l][i] = m.goal; names.push(m.name); } });
    if (!names.length) return;
    save();
    toast(names.length === 1 ? `✔ Missão concluída: ${names[0]}` : `✔ Missões concluídas: ${names.join(', ')}`);
    let nx = l + 1; while (RESERVED.includes(nx)) nx++;
    if (!wasDone && levelDone(l) && nx < LEVELS && !allOpen) setTimeout(() => toast(`🔓 Bairro ${nx + 1} desbloqueado!`), 3400);
  }

  // tentativa atual (Carreira): o que foi cumprido fica PENDENTE e só é salvo se esta partida terminar com a entrega certa
  let level = -1, active = false, pending = new Set(), hintUsed = false;
  // Bairro 1, "Volta no bairro": cada rua externa é dividida em 8 trechos; vale com 6 de 8 em cada lado (folga nas esquinas)
  const LAP_BINS = 8, LAP_NEED = 6;
  let lapBins = null;
  const lapDone = () => lapBins && Object.values(lapBins).every(b => b.filter(Boolean).length >= LAP_NEED);
  // Bairro 3: desvios em volta de cada barreira, batidas por barreira, entregas fora da indicação
  let legs = new Map(), barHits = new Map(), barHitN = 0, offRoute = new Set();
  // Bairro 4: entregas/abastecer, intervalo entre entregas, marcha à ré, paradas antes dos cruzamentos
  let deliveries = 0, fueled = false, fuelStops = 0, lastDelT = null, rev = null, look = null, stopAt = null, lookSet = new Set(), prevPos = null;
  // Bairro 5: manobra no cruzamento em andamento, voltas de van por quadra, voltas a pé (recomeça a cada vez que desce da van)
  let man = null, vanLaps = new Map(), footLaps = new Map(), prevFoot = null;

  return {
    get progress() { return progress; },
    isDone: done,
    isUnlocked: unlocked,
    /** Missão k do nível l cumprida nesta partida, ainda sem a entrega certa (tela de missões). */
    isPending: (l, k) => active && l === level && !!MISSIONS[l][k] && pending.has(MISSIONS[l][k].id),
    get allUnlocked() { return allOpen; },
    completedCount: l => MISSIONS[l].filter((m, i) => done(l, i)).length,
    /** O bairro l tem missões cadastradas? (os modelos vazios não têm id) */
    hasMissions: l => MISSIONS[l].some(m => m.id),
    /** Bairro l com todas as missões concluídas (sem missões cadastradas = não). */
    levelComplete: l => levelDone(l),

    // ---- painel de desenvolvimento (cadeado): só missões e progressão da Carreira ----
    /** Liberação de desenvolvimento (todos os bairros abertos), independente das missões. */
    setAllOpen(on) {
      allOpen = !!on;
      try { if (allOpen) localStorage.setItem(KEY + '.all', '1'); else localStorage.removeItem(KEY + '.all'); } catch (e) { /* ignora */ }
    },
    /** Todas as missões de todos os bairros voltam a ficar incompletas (inclusive o que estava pendente nesta partida) e a
     *  liberação de teste é desligada: só o Bairro 1 fica aberto. */
    resetAll() {
      this.setCompleted(new Set()); this.setAllOpen(false);
      try { localStorage.removeItem(KEY + '.unlocks'); } catch (e) { /* ignora */ }
    },
    /** Os bairros em sel ficam com todas as missões concluídas; os outros (com missões), todas incompletas; sem missões
     *  cadastradas nunca contam como concluídos. Os desbloqueios saem daí pela regra de sempre (5 missões salvas de um bairro
     *  liberam o próximo). */
    setCompleted(sel) {
      progress = MISSIONS.map((ms, l) => ms.map(m => (m.id && sel.has(l) ? m.goal : 0)));
      pending = new Set();
      save();
    },

    /** Nova partida da Carreira na fase l: tudo que foi cumprido na tentativa anterior (e não salvo) é descartado. */
    startMatch(l) {
      level = l; active = l >= 0; pending = new Set(); hintUsed = false;
      legs = new Map(); barHits = new Map(); barHitN = 0; offRoute = new Set();
      deliveries = 0; fueled = false; fuelStops = 0; lastDelT = null; rev = null; look = null; stopAt = null; lookSet = new Set(); prevPos = null;
      man = null; vanLaps = new Map(); footLaps = new Map(); prevFoot = null;
      lapBins = { n: new Array(LAP_BINS).fill(false), s: new Array(LAP_BINS).fill(false), w: new Array(LAP_BINS).fill(false), e: new Array(LAP_BINS).fill(false) };
    },
    /** Fim do acompanhamento (saiu da partida): descarta o que estava pendente. */
    stop() { active = false; pending = new Set(); },

    /** A cada quadro dirigindo (Carreira). ctx = { speed (da van; < 0 = ré), time (s no cronômetro), bars (barriers.list) }. */
    tick(x, z, heading = 0, ctx = {}) {
      if (!active) return;
      const jump = prevPos && Math.hypot(x - prevPos.x, z - prevPos.z) > 6;   // teletransporte (não é movimento da van)
      if (level === 2 && ctx.bars && !pending.has('twoDetours')) {         // Dois desvios
        const n = nodeAt(x, z);
        for (const b of ctx.bars) {
          let st = legs.get(b.id);
          if (!st) legs.set(b.id, st = { zone: null, leg: null, last: null });
          const zone = jump ? null : barZone(b, x, z);
          if (jump) { st.zone = null; st.leg = null; continue; }
          if (zone) {
            if (st.leg && st.leg.from !== zone) {                          // chegou ao outro lado da barreira
              const path = st.leg.path.slice(), anc = barAnchor(b, zone);
              if (path[path.length - 1] !== anc) path.push(anc);
              const leg = { from: st.leg.from, to: zone, edges: edgesOf(path) };
              if (leg.edges.size >= 2) {                                   // (um desvio de verdade: dá a volta pela quadra)
                const o = st.last;                                         // voltou por um caminho diferente do da ida?
                if (o && o.from === leg.to && o.to === leg.from && hasOwn(leg.edges, o.edges) && hasOwn(o.edges, leg.edges)) pending.add('twoDetours');
                st.last = leg;
              }
            }
            st.leg = null; st.zone = zone;
          } else {
            if (st.zone && !st.leg) st.leg = { from: st.zone, path: [barAnchor(b, st.zone)] };
            st.zone = null;
            if (st.leg && n && st.leg.path[st.leg.path.length - 1] !== n.k) st.leg.path.push(n.k);
          }
        }
      }
      if (level === 3) {
        const t = ctx.time || 0, sp = Math.abs(ctx.speed || 0), n = nodeAt(x, z);
        // Marcha à ré: de um cruzamento ao seguinte andando de ré de verdade (o deslocamento, não a tecla)
        if (jump) rev = null;
        else if (!pending.has('reverse') && prevPos) {
          const along = (x - prevPos.x) * Math.cos(heading) + (z - prevPos.z) * Math.sin(heading);
          if (rev) { if (along < 0) rev.dist += -along; else rev.fwd += along; }
          if (rev && rev.fwd > 0.6) rev = null;                            // andou para a frente: a ré recomeça
          if (n) {
            if (rev && rev.node !== n.k) {
              const [aj, ai] = rev.node.split(',').map(Number);
              if (Math.abs(aj - n.j) + Math.abs(ai - n.i) === 1 && rev.dist >= STEP() - 2 * NODE_HALF - 2) pending.add('reverse');
              rev = null;
            }
            if (!rev && along <= 0.001) rev = { node: n.k, dist: 0, fwd: 0 };
            else if (rev) { rev.dist = 0; rev.fwd = 0; }                    // ainda no cruzamento de partida
          }
        }
        // Olhe antes de seguir: 3 s parada logo antes do cruzamento e depois atravessa (sai por outro lado)
        if (jump) { look = null; stopAt = null; }
        else if (look) {
          const dx = x - roadCenter(look.j), dz = z - roadCenter(look.i);
          if (Math.abs(dx) < ROAD / 2 && Math.abs(dz) < ROAD / 2) look.inside = true;
          else if (look.inside && (Math.abs(dx) > ROAD / 2 + 1 || Math.abs(dz) > ROAD / 2 + 1)) {
            if (armOf(look.j, look.i, x, z) !== look.side) { lookSet.add(look.k); if (lookSet.size >= 3) pending.add('lookStop'); }
            look = null; stopAt = null;
          } else if (!look.inside && !inArm(look, x, z)) { look = null; stopAt = null; }   // foi embora sem atravessar
        }
        if (!look && !jump) {
          const a = sp < 0.5 ? approachOf(x, z, heading) : null;
          if (!a) stopAt = null;
          else if (!stopAt || stopAt.k !== a.k || stopAt.side !== a.side) stopAt = { ...a, t0: t };
          else if (t - stopAt.t0 >= 3) look = { ...a, inside: false };
        }
      }
      if (level === 4) {
        // Curva de ré / Meia-volta: o que a van fez dentro de um cruzamento (do momento em que entra até sair)
        const zj = Math.round((x - roadCenter(0)) / STEP()), zi = Math.round((z - roadCenter(0)) / STEP());
        const inZone = !jump && zj >= 0 && zi >= 0 && zj <= GRID && zi <= GRID && Math.abs(x - roadCenter(zj)) <= TURN_HALF && Math.abs(z - roadCenter(zi)) <= TURN_HALF;
        const zk = inZone ? zj + ',' + zi : null;
        if (man && man.k !== zk) {                                        // saiu do cruzamento: avalia a manobra
          if (!jump) {
            const out = armOf(man.j, man.i, x, z), V = a => a === 'N' || a === 'S';
            if (man.bwd <= 0.3 && Math.abs(angDiff(heading, man.h0)) >= 150 * Math.PI / 180) pending.add('uTurn');   // só para a frente
            if (V(out) !== V(man.arm) && man.bwd >= 3 && Math.abs(man.bwdTurn) >= 50 * Math.PI / 180 && man.last < 0) pending.add('revTurn');
          }
          man = null;
        }
        if (zk && !man) man = { k: zk, j: zj, i: zi, arm: armOf(zj, zi, prevPos ? prevPos.x : x, prevPos ? prevPos.z : z), h0: prevPos ? prevPos.h : heading, bwd: 0, bwdTurn: 0, last: 0 };
        else if (man && prevPos) {
          const along = (x - prevPos.x) * Math.cos(heading) + (z - prevPos.z) * Math.sin(heading), dh = angDiff(heading, prevPos.h);
          if (along < -0.002 && (ctx.speed || 0) < 0) { man.bwd += -along; man.bwdTurn += dh; man.last = -1; }   // de ré de verdade
          else if (along > 0.002) man.last = 1;
        }
        // Cinco voltas: 5 circuitos da van em volta da MESMA quadra (em qualquer sentido, não precisam ser seguidos)
        for (const q of lapStep(vanLaps, x, z, 0.5, jump)) if (vanLaps.get(q).laps >= 5) pending.add('fiveLaps');
      }
      prevPos = { x, z, h: heading };
      if (level === 0 && !pending.has('lap')) {                          // Volta no bairro: as 4 ruas externas
        const a = roadCenter(0), b = roadCenter(GRID), near = c => (v => Math.abs(v - c) < ROAD / 2 + 1.5);
        const bin = v => Math.floor((v - a) / (b - a) * LAP_BINS);
        const mark = (side, v) => { const k = bin(v); if (k >= 0 && k < LAP_BINS) lapBins[side][k] = true; };
        if (near(a)(z)) mark('n', x); if (near(b)(z)) mark('s', x);
        if (near(a)(x)) mark('w', z); if (near(b)(x)) mark('e', z);
        if (lapDone()) pending.add('lap');
      }
    },
    /** A pé (Carreira): Bairro 2, "Conheça a praça"; Bairro 5, "Uma volta a pé" (contornar uma quadra inteira). */
    walk(x, z, plaza) {
      if (!active) return;
      if (level === 4) {
        const jump = prevFoot && Math.hypot(x - prevFoot.x, z - prevFoot.z) > 4;
        if (lapStep(footLaps, x, z, 1.2, jump).length) pending.add('walkLap');
        prevFoot = { x, z };
      }
      if (level !== 1 || !plaza) return;
      if (x > plaza.x0 + 1 && x < plaza.x1 - 1 && z > plaza.z0 + 1 && z < plaza.z1 - 1) pending.add('plaza');
    },

    /** Depois de cada tentativa de entrega. indicated = era a casa da pista vigente. Na entrega certa (success), confirma
     *  e salva as missões cumpridas nesta partida; ctx = { time (s no cronômetro), bumps (batidas da van) }. */
    visit(h, success, indicated, stepBefore, game, ctx = {}) {
      if (!active) return;
      if (level === 2 && !success && !indicated) {                        // Fora da rota: 2 casas diferentes fora da indicação
        offRoute.add(h); if (offRoute.size >= 2) pending.add('offRoute');
      }
      if (fueled) { fuelStops++; fueled = false; }                         // abasteceu entre a entrega anterior e esta (1× por intervalo)
      deliveries++;
      if (level === 3) {
        const t = ctx.time || 0;
        if (fuelStops >= 1) pending.add('fuelStop');                      // Parada para abastecer: entrega → posto → entrega
        if (lastDelT !== null && t - lastDelT <= 45) pending.add('quick'); // Entrega próxima: até 45 s desde a anterior
        lastDelT = t;
      }
      if (level === 4 && fuelStops >= 2) pending.add('twoStops');         // Duas paradas: em 2 intervalos diferentes
      if (level === 0) {
        pending.add('firstDelivery');                                    // Primeira entrega: qualquer entrega (certa ou falsa)
        if (!success && !indicated) pending.add('wrongAddress');         // Endereço errado: numa casa diferente da indicada
      }
      if (!success) return;
      if (level === 0) {
        pending.add('rightAddress');
        if ((ctx.time || 0) >= 600) pending.add('noRush');               // Sem pressa: 10 min no cronômetro
      } else if (level === 1) {
        pending.add('biggerHood');
        if (!hintUsed) pending.add('noHint');                            // Sem ajuda: sem o botão DICA (T)
        if (Math.floor(ctx.time || 0) <= 180) pending.add('fast');       // Entrega rápida: até 03:00
        if ((ctx.bumps || 0) === 0) pending.add('noBump');               // Sem esbarrar
      } else if (level === 2) {
        if (barHitN === 0) pending.add('careful');                       // Cuidado com as barreiras
      }
      confirm(level, pending);
      active = false; pending = new Set();
    },

    /** A van abasteceu no posto (não é uma entrega). Depois da 1ª entrega, marca o intervalo atual (Bairros 4 e 5): conta
     *  quando a próxima entrega acontecer; abastecer de novo no mesmo intervalo não conta outra vez. */
    refuel() { if (active && deliveries > 0) fueled = true; },

    /** Batida contada pelo contador (uma por contato; main.js). Bairro 3: batidas nas barreiras (b.bar = índice). */
    bump(b, total) {
      if (!active || level !== 2 || !b || b.bar == null) return;
      barHitN++;
      const n = (barHits.get(b.bar) || 0) + 1; barHits.set(b.bar, n);
      if (n >= 3) pending.add('stubborn');                               // Barreira teimosa: 3 batidas na mesma
      if (total > 0 && barHits.size >= total) pending.add('allBars');    // Teste de resistência: todas as da partida
    },

    /** O motorista desceu da van (L). Bairro 4, "Estacione de ré": parada diante da entrada de um prédio comercial, com a
     *  traseira voltada para ela. shops = [{ x (porta), z (frente do lote) }]; as fachadas dão para o sul (+Z). */
    exitVan(x, z, heading, speed, shops = []) {
      if (!active) return;
      footLaps = new Map(); prevFoot = null;                             // Bairro 5: cada descida é uma tentativa nova da volta a pé
      if (level !== 3 || Math.abs(speed) > 0.5) return;
      if (Math.sin(heading) < Math.cos(40 * Math.PI / 180)) return;     // frente para o sul (±40°): traseira para a fachada
      if (shops.some(p => Math.abs(x - p.x) <= 4.5 && z - p.z >= 1.2 && z - p.z <= ROAD - 1.2)) pending.add('reversePark');
    },

    /** O jogador usou a DICA (botão ou T). */
    hint() { if (active) hintUsed = true; },
  };
}
