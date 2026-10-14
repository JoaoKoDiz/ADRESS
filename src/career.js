// Carreira: progresso das missões (salvo no navegador), regras de cada missão e desbloqueio das fases.
// Uma fase é liberada quando as 5 missões da fase anterior estão concluídas (ou já foi liberada antes: KEY.unlocks); a 1 começa liberada.
// Objetivo cumprido durante a partida = missão PENDENTE; só é salva quando a mesma partida termina com a entrega certa.
import { MISSIONS, RESERVED } from './missions.js';
import { GRID, ROAD, roadCenter } from './layout.js';

const KEY = 'adress.career.v1';
const LEVELS = MISSIONS.length;

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
  // Antes, guarda os bairros que já estavam desbloqueados pelas regras antigas (metas antigas abaixo), para não trancá-los de novo.
  const UNLOCKS_KEY = KEY + '.unlocks';
  let unlocks = new Set();
  try { const u = JSON.parse(localStorage.getItem(UNLOCKS_KEY) || '[]'); if (Array.isArray(u)) u.forEach(l => unlocks.add(+l)); } catch (e) { /* ignora */ }
  const saveUnlocks = () => { try { localStorage.setItem(UNLOCKS_KEY, JSON.stringify([...unlocks].sort((a, b) => a - b))); } catch (e) { /* ignora */ } };
  try {
    if (!localStorage.getItem(KEY + '.m2')) {
      const OLD_GOALS = [[1, 5, 1, 1, 1], [3, 1, 2, 4, 3], [10, 10, 1, 1, 5], [1, 2, 1, 2, 2]];
      for (let l = 1; l <= 4; l++) if (OLD_GOALS[l - 1].every((g, i) => (progress[l - 1][i] || 0) >= g)) unlocks.add(l);
      for (let l = 0; l < 4; l++) progress[l] = progress[l].map(() => 0);
      save(); saveUnlocks(); localStorage.setItem(KEY + '.m2', '1');
    }
  } catch (e) { /* ignora */ }

  const done = (l, i) => progress[l][i] >= MISSIONS[l][i].goal;
  const levelDone = l => MISSIONS[l].every((m, i) => done(l, i));
  // senha do cadeado no mapa: todos os bairros abertos, mesmo sem as missões (fica salvo)
  let allOpen = false;
  try { allOpen = localStorage.getItem(KEY + '.all') === '1'; } catch (e) { /* ignora */ }
  const prevLevel = l => { let p = l - 1; while (p > 0 && RESERVED.includes(p)) p--; return p; };   // os reservados não contam
  const unlocked = l => !RESERVED.includes(l) && (allOpen || l === 0 || unlocks.has(l) || levelDone(prevLevel(l)));

  /** Confirma as missões cumpridas na partida que acabou de terminar com a entrega certa: salva (só aumenta; o que já estava
   *  concluído não conta de novo), avisa e, com as 5 do bairro salvas, desbloqueia o próximo (e guarda o desbloqueio). */
  function confirm(l, ids) {
    const wasDone = levelDone(l), names = [];
    MISSIONS[l].forEach((m, i) => { if (m.id && ids.has(m.id) && progress[l][i] < m.goal) { progress[l][i] = m.goal; names.push(m.name); } });
    if (!names.length) return;
    save();
    toast(names.length === 1 ? `✔ Missão concluída: ${names[0]}` : `✔ Missões concluídas: ${names.join(', ')}`);
    let nx = l + 1; while (RESERVED.includes(nx)) nx++;
    if (!wasDone && levelDone(l) && nx < LEVELS && !unlocks.has(nx)) {
      const wasOpen = allOpen;                                            // (já aberto pelo cadeado: guarda, mas sem aviso)
      unlocks.add(nx); saveUnlocks();
      if (!wasOpen) setTimeout(() => toast(`🔓 Bairro ${nx + 1} desbloqueado!`), 3400);
    }
  }

  // tentativa atual (Carreira): o que foi cumprido fica PENDENTE e só é salvo se esta partida terminar com a entrega certa
  let level = -1, active = false, pending = new Set(), hintUsed = false;
  // Bairro 1, "Volta no bairro": cada rua externa é dividida em 8 trechos; vale com 6 de 8 em cada lado (folga nas esquinas)
  const LAP_BINS = 8, LAP_NEED = 6;
  let lapBins = null;
  const lapDone = () => lapBins && Object.values(lapBins).every(b => b.filter(Boolean).length >= LAP_NEED);

  return {
    get progress() { return progress; },
    isDone: done,
    isUnlocked: unlocked,
    /** Missão k do nível l cumprida nesta partida, ainda sem a entrega certa (tela de missões). */
    isPending: (l, k) => active && l === level && !!MISSIONS[l][k] && pending.has(MISSIONS[l][k].id),
    get allUnlocked() { return allOpen; },
    /** Senha certa no cadeado: desbloqueia todos os bairros. */
    unlockAll() {
      allOpen = true;
      try { localStorage.setItem(KEY + '.all', '1'); } catch (e) { /* ignora */ }
      toast('🔓 Todos os bairros desbloqueados!');
    },
    completedCount: l => MISSIONS[l].filter((m, i) => done(l, i)).length,

    /** Nova partida da Carreira na fase l: tudo que foi cumprido na tentativa anterior (e não salvo) é descartado. */
    startMatch(l) {
      level = l; active = l >= 0; pending = new Set(); hintUsed = false;
      lapBins = { n: new Array(LAP_BINS).fill(false), s: new Array(LAP_BINS).fill(false), w: new Array(LAP_BINS).fill(false), e: new Array(LAP_BINS).fill(false) };
    },
    /** Fim do acompanhamento (saiu da partida): descarta o que estava pendente. */
    stop() { active = false; pending = new Set(); },

    /** A cada quadro dirigindo (Carreira). */
    tick(x, z) {
      if (!active) return;
      if (level === 0 && !pending.has('lap')) {                          // Volta no bairro: as 4 ruas externas
        const a = roadCenter(0), b = roadCenter(GRID), near = c => (v => Math.abs(v - c) < ROAD / 2 + 1.5);
        const bin = v => Math.floor((v - a) / (b - a) * LAP_BINS);
        const mark = (side, v) => { const k = bin(v); if (k >= 0 && k < LAP_BINS) lapBins[side][k] = true; };
        if (near(a)(z)) mark('n', x); if (near(b)(z)) mark('s', x);
        if (near(a)(x)) mark('w', z); if (near(b)(x)) mark('e', z);
        if (lapDone()) pending.add('lap');
      }
    },
    /** A pé (Carreira): Bairro 2, "Conheça a praça". */
    walk(x, z, plaza) {
      if (!active || level !== 1 || !plaza) return;
      if (x > plaza.x0 + 1 && x < plaza.x1 - 1 && z > plaza.z0 + 1 && z < plaza.z1 - 1) pending.add('plaza');
    },

    /** Depois de cada tentativa de entrega. indicated = era a casa da pista vigente. Na entrega certa (success), confirma
     *  e salva as missões cumpridas nesta partida; ctx = { time (s no cronômetro), bumps (batidas da van) }. */
    visit(h, success, indicated, stepBefore, game, ctx = {}) {
      if (!active) return;
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
      }
      confirm(level, pending);
      active = false; pending = new Set();
    },

    /** A van abasteceu no posto (não é uma entrega). */
    refuel() {},

    /** O jogador usou a DICA (botão ou T). */
    hint() { if (active) hintUsed = true; },
  };
}
