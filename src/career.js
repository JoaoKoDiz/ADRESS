// Carreira: progresso das missões (salvo no navegador), regras de cada missão e desbloqueio das fases.
// Uma fase é liberada quando as 5 missões da fase anterior estão concluídas; a fase 1 começa liberada.
import { HOUSES } from './data.js';
import { MISSIONS } from './missions.js';
import { MAP, GRID, HEDGE, ROAD, LOT, WALK, HOUSE_SLOTS, roadCenter, slotOrigin } from './layout.js';

const KEY = 'adress.career.v1';
const LEVELS = MISSIONS.length;

const CSS = `
.career-toast { position: fixed; left: 50%; top: 128px; z-index: 26; transform: translate(-50%, -10px); opacity: 0;
  padding: .55em 1.2em; border-radius: 999px; background: #1f7a3a; color: #fff; pointer-events: none;
  font: 800 clamp(14px, 1.3vw, 19px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.3);
  transition: opacity .25s, transform .25s; }
.career-toast.on { opacity: 1; transform: translate(-50%, 0); }
`;

// ruas do bairro: GRID+1 horizontais (h0..) e GRID+1 verticais (v0..)
const IN_MAP = v => v > HEDGE && v < MAP - HEDGE;
function streetsAt(x, z) {
  const out = [];
  for (let i = 0; i <= GRID; i++) {
    const c = roadCenter(i);
    if (Math.abs(z - c) < ROAD / 2 && IN_MAP(x)) out.push('h' + i);
    if (Math.abs(x - c) < ROAD / 2 && IN_MAP(z)) out.push('v' + i);
  }
  return out;
}
const corners4 = () => [[0, 0], [GRID, 0], [0, GRID], [GRID, GRID]].map(([a, b]) => [roadCenter(a), roadCenter(b)]);   // esquinas externas

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
  // a 5ª missão do Nível 3 mudou ("Uma Última Volta" → "Manobras Enjoativas"): zera o progresso antigo dela uma vez
  try {
    if (!localStorage.getItem(KEY + '.dizzy')) { progress[2][4] = 0; save(); localStorage.setItem(KEY + '.dizzy', '1'); }
  } catch (e) { /* ignora */ }

  const done = (l, i) => progress[l][i] >= MISSIONS[l][i].goal;
  const levelDone = l => MISSIONS[l].every((m, i) => done(l, i));
  // senha do cadeado no mapa: todos os bairros abertos, mesmo sem as missões (fica salvo)
  let allOpen = false;
  try { allOpen = localStorage.getItem(KEY + '.all') === '1'; } catch (e) { /* ignora */ }
  const unlocked = l => allOpen || l === 0 || levelDone(l - 1);

  /** Atualiza o progresso (só aumenta). Avisa quando a missão é concluída e quando a próxima fase abre. */
  function setProgress(l, i, value) {
    const m = MISSIONS[l][i];
    if (!m || !m.id) return;
    const v = Math.min(m.goal, value);
    if (v <= progress[l][i]) return;
    const wasDone = levelDone(l);
    progress[l][i] = v;
    save();
    if (v >= m.goal) {
      toast(`✔ Missão concluída: ${m.name}`);
      if (!wasDone && levelDone(l) && l + 1 < LEVELS) setTimeout(() => toast(`🔓 Bairro ${l + 2} desbloqueado!`), 3400);
    }
  }
  const add = (l, i, n = 1) => setProgress(l, i, progress[l][i] + n);
  const idx = (l, id) => MISSIONS[l].findIndex(m => m.id === id);

  // estatísticas da partida atual
  let level = -1, active = false;
  let seen, entries, lastStreet, corners, wrongAt, hintCounted;
  let roosters, fuels;
  let passes, prevHere, sinceDelivery, streaks, wind, slotWrong, prevSlots = new Set(), thisSlots = new Set(), slotsLevel = -1;

  return {
    get progress() { return progress; },
    isDone: done,
    isUnlocked: unlocked,
    get allUnlocked() { return allOpen; },
    /** Senha certa no cadeado: desbloqueia todos os bairros. */
    unlockAll() {
      allOpen = true;
      try { localStorage.setItem(KEY + '.all', '1'); } catch (e) { /* ignora */ }
      toast('🔓 Todos os bairros desbloqueados!');
    },
    completedCount: l => MISSIONS[l].filter((m, i) => done(l, i)).length,

    /** Nova partida da Carreira na fase l (ou fim do acompanhamento com l < 0). */
    startMatch(l) {
      level = l; active = l >= 0;
      seen = new Set(); entries = new Map(); lastStreet = null; corners = new Set(); wrongAt = new Map(); hintCounted = false;
      passes = new Map(); prevHere = []; sinceDelivery = new Set(); streaks = []; wind = new Map(); slotWrong = new Map();
      roosters = new Set(); fuels = 0;
      // "Eu Conheço Essa Casa": lotes com 3+ entregas erradas na partida anterior (da mesma fase)
      prevSlots = slotsLevel === l ? thisSlots : new Set();
      thisSlots = new Set(); slotsLevel = l;
    },
    stop() { active = false; },

    /** A cada quadro dirigindo: ruas percorridas, entradas em ruas e esquinas do contorno. */
    tick(x, z, heading) {
      if (!active) return;
      const here = streetsAt(x, z);
      here.forEach(s => { seen.add(s); sinceDelivery.add(s); if (!prevHere.includes(s)) passes.set(s, (passes.get(s) || 0) + 1); });
      prevHere = here;
      // "entrar" numa rua = estar nela andando ao longo dela (cruzar uma rua não conta)
      const c = Math.abs(Math.cos(heading)), s = Math.abs(Math.sin(heading));
      const aligned = here.find(id => (id[0] === 'h' && c >= 0.7) || (id[0] === 'v' && s >= 0.7));
      if (aligned && aligned !== lastStreet) { entries.set(aligned, (entries.get(aligned) || 0) + 1); lastStreet = aligned; }
      const CORNERS = corners4();
      CORNERS.forEach(([cx, cz], k) => { if (Math.hypot(x - cx, z - cz) < ROAD / 2 + 1) corners.add(k); });
      if (level === 0 && corners.size === 4) setProgress(0, idx(0, 'lap'), 1);      // Volta no Quarteirão
      // Manobras Enjoativas (Nível 3): voltas em torno de um mesmo lote, contadas pelo ângulo acumulado da van
      // em volta do centro do lote enquanto ela está nas ruas ao redor dele (afastar-se zera a contagem daquele lote)
      if (level === 2) {
        const ring = LOT / 2 + WALK + ROAD;
        for (const s of HOUSE_SLOTS) {
          const o = slotOrigin(s), lcx = o.x + LOT / 2, lcz = o.z + LOT / 2;
          if (Math.max(Math.abs(x - lcx), Math.abs(z - lcz)) > ring) { wind.delete(s); continue; }
          const a = Math.atan2(z - lcz, x - lcx);
          const w = wind.get(s);
          if (!w) { wind.set(s, { acc: 0, prev: a }); continue; }
          let d = a - w.prev;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          w.acc += d; w.prev = a;
          const laps = Math.floor(Math.abs(w.acc) / (2 * Math.PI));
          if (laps > 0) setProgress(2, idx(2, 'dizzy'), laps);
        }
      }
    },

    /** Depois de cada tentativa de entrega. indicated = era a casa da pista atual; stepBefore = pistas seguidas antes. */
    visit(h, success, indicated, stepBefore, game) {
      if (!active) return;
      const house = HOUSES[h];
      const slot = game.slotOf[h], target = game.route[stepBefore];      // casa que a pista apontava
      const falseHint = stepBefore < game.route.length - 1;              // a pista apontava uma casa errada
      if (!success) wrongAt.set(h, (wrongAt.get(h) || 0) + 1);
      // sequências de entregas erradas seguidas na mesma casa (uma entrega certa interrompe)
      if (!success && streaks.length && streaks[streaks.length - 1].h === h) streaks[streaks.length - 1].n++;
      else streaks.push({ h, slot, n: success ? 0 : 1 });
      const detour = sinceDelivery.size;                                  // ruas diferentes desde a última entrega
      sinceDelivery = new Set();
      if (level === 0) {
        if (!success && !indicated) setProgress(0, idx(0, 'wrongWay'), 1);       // Duplo Erro
        if (success) {
          if (stepBefore >= 4) setProgress(0, idx(0, 'firstShift'), 1);           // Primeiro Turno
          setProgress(0, idx(0, 'streets'), seen.size);                           // Conhecendo a Vizinhança
          if (Math.max(0, ...entries.values()) < 4) setProgress(0, idx(0, 'noRepeat'), 1);   // Sem Voltar Atrás
        }
      } else if (level === 1) {
        if (house.roof === 'blue') add(1, idx(1, 'blue'));                        // Telhado Azul
        if (!success && house.roof === 'red') setProgress(1, idx(1, 'redWrong'), 1);
        if (!success && house.f.includes('fountain')) add(1, idx(1, 'fountain'));
        if (!success && house.f.includes('trampoline')) setProgress(1, idx(1, 'trampoline'), wrongAt.get(h));   // Insistir no Pulo
      } else if (level === 2) {
        if (!success) setProgress(2, idx(2, 'tenSame'), wrongAt.get(h));      // Dez Vezes é Demais
        if (success) setProgress(2, idx(2, 'tourist'), Math.max(0, ...passes.values()));   // Turista do Bairro
        if (falseHint && h !== target) {                                       // Não Era Aqui? (lote vizinho do indicado)
          const t = game.slotOf[target];
          const row = s => Math.floor(s / GRID), col = s => s % GRID;
          if (Math.abs(row(t) - row(slot)) + Math.abs(col(t) - col(slot)) === 1) setProgress(2, idx(2, 'nextDoor'), 1);
        }
        const OPP = { 0: 15, 15: 0, 3: 12, 12: 3 };                             // Do Outro Lado
        const a = streaks[streaks.length - 2], b = streaks[streaks.length - 1];
        if (a && b && a.n >= 3 && b.n >= 3 && OPP[a.slot] === b.slot) setProgress(2, idx(2, 'opposite'), 1);
      } else if (level === 3) {
        const tHouse = HOUSES[target];
        const color = x => x.kind === 'shop' ? x.awning : x.roof;                                           // toldo do prédio / telhado
        if (falseHint && color(tHouse) === 'blue' && color(house) === 'red') setProgress(3, idx(3, 'colors'), 1);   // Confundi as Cores
        if (!success && house.f.includes('rooster') && wrongAt.get(h) >= 3) {                                // Viciado em Galos
          roosters.add(h);
          setProgress(3, idx(3, 'roosters'), roosters.size);
        }
        if (h !== target && tHouse.f.includes('fountain') && house.f.includes('fountain')) setProgress(3, idx(3, 'fountainSwap'), 1);
        if (!success) {                                                                                       // Eu Conheço Essa Casa
          const n = (slotWrong.get(slot) || 0) + 1;
          slotWrong.set(slot, n);
          if (n >= 3) { thisSlots.add(slot); setProgress(3, idx(3, 'knowHouse'), prevSlots.has(slot) ? 2 : 1); }
        }
      }

    },

    /** A van abasteceu no posto (não é uma entrega). */
    refuel() {
      if (!active) return;
      fuels++;
      if (level === 3) setProgress(3, idx(3, 'expensive'), fuels);                                       // É Muito Caro!
    },

    /** O jogador usou a dica (conta no máximo uma vez por partida). */
    hint() {
      if (!active || hintCounted) return;
      hintCounted = true;
      if (level === 1) add(1, idx(1, 'hint'));
    },
  };
}
