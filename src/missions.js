// Carreira: tela de MISSÕES de um bairro (tecla M perto da maquete no mapa).
// Quase a tela inteira; nas bordas aparece o mapa desfocado. 5 missões por bairro, cada uma com
// nome, descrição, barra de progresso (cinza → verde) e contagem; no canto, quantas das 5 foram concluídas.

// Missões por fase (nível). id liga a missão à regra em career.js; goal = quanto precisa para concluir.
// Fases sem missões definidas usam o modelo (sem id: não avançam ainda).
const PLACEHOLDER = () => Array.from({ length: 5 }, () => ({ id: null, name: 'MISSÃO', desc: 'Descrição breve da missão.', goal: 5 }));
export const LEVEL_NAMES = ['Raízes', 'Horizontes', 'Entregador Teimoso', 'Péssimo Senso de Direção', '', '', '', '', 'Veneza', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
/** Bairro 18: espaço reservado para níveis futuros (não dá para jogar; não travam o desbloqueio do 20). */
export const RESERVED = [];   // (18 = Modernista, 21 = Operário, 22 = Bosque, 23 = Cachoeira; nenhum reservado agora)   // (o 17 é Jardins, o 19 é o Penumbra)
export const MISSIONS = [
  // Na Carreira, cumprir o objetivo só deixa a missão PENDENTE; ela é salva quando a mesma partida termina com a entrega
  // certa (career.js). Abandonar/reiniciar/fechar descarta o que foi cumprido naquela tentativa.
  [
    { id: 'firstDelivery', name: 'Primeira entrega', desc: 'Faça uma entrega em qualquer casa.', goal: 1 },
    { id: 'rightAddress', name: 'Endereço certo', desc: 'Conclua uma partida entregando na casa correta.', goal: 1 },
    { id: 'lap', name: 'Volta no bairro', desc: 'Contorne todo o bairro pelas ruas externas antes de concluir a partida.', goal: 1 },
    { id: 'wrongAddress', name: 'Endereço errado', desc: 'Faça uma entrega em uma casa diferente da indicada pela dica.', goal: 1 },
    { id: 'noRush', name: 'Sem pressa', desc: 'Passe 10 minutos na mesma partida.', goal: 1 },
  ],
  [
    { id: 'biggerHood', name: 'Bairro maior', desc: 'Conclua uma partida no Bairro 2.', goal: 1 },
    { id: 'plaza', name: 'Conheça a praça', desc: 'Saia da van e entre na praça central.', goal: 1 },
    { id: 'noHint', name: 'Sem ajuda', desc: 'Conclua uma partida sem usar o botão de dica.', goal: 1 },
    { id: 'fast', name: 'Entrega rápida', desc: 'Conclua uma partida em até 3 minutos.', goal: 1 },
    { id: 'noBump', name: 'Sem esbarrar', desc: 'Conclua uma partida sem bater em casas, árvores ou postes.', goal: 1 },
  ],
  PLACEHOLDER(),   // Bairro 3 (aguardando a nova lista)
  PLACEHOLDER(),   // Bairro 4 (aguardando a nova lista)
  PLACEHOLDER(),   // Bairro 5
  PLACEHOLDER(),   // Bairro 6 (a cidade)
  PLACEHOLDER(),   // Bairro 7 (a cidade com caminhões e engarrafamentos)
  PLACEHOLDER(),   // Bairro 8 (como o 7, em 8×8)
  PLACEHOLDER(),   // Bairro 9 (Encostas)
  PLACEHOLDER(),   // Nível 10 (Veneza)
  PLACEHOLDER(),   // Bairro 11 (Travessia)
  PLACEHOLDER(),   // Bairro 12 (Trilhos)
  PLACEHOLDER(),   // Bairro 13 (Morro)
  PLACEHOLDER(),   // Bairro 14 (Fluxo)
  PLACEHOLDER(),   // Bairro 15 (Colheita)
  PLACEHOLDER(),   // Bairro 16 (Nevasca)
  PLACEHOLDER(),   // Bairro 17 (Jardins)
  PLACEHOLDER(),   // Bairro 18 (Modernista)
  PLACEHOLDER(),   // Bairro 19 (Penumbra)
  PLACEHOLDER(),   // Bairro 20 (Lua)
  PLACEHOLDER(),   // Bairro 21 (Operário)
  PLACEHOLDER(),   // Bairro 22 (Bosque)
  PLACEHOLDER(),   // Bairro 23 (Cachoeira)
  PLACEHOLDER(),   // Bairro 24 (Medieval)
];

const CSS = `
.missions { position: fixed; inset: 0; z-index: 25; display: none;
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background: rgba(27,36,24,.3);
  font-family: "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.missions.open { display: block; }
.missions-panel { position: absolute; inset: 6vh 6vw; display: flex; flex-direction: column; gap: clamp(10px, 1.6vh, 18px);
  padding: clamp(16px, 2.4vh, 28px) clamp(18px, 2.4vw, 36px); box-sizing: border-box; overflow: auto;
  background: #fff3d6; border: 4px solid #e6cc98; border-radius: 22px; box-shadow: 0 18px 50px rgba(0,0,0,.35); color: #3a2a1a; }
.missions-head { display: flex; align-items: center; gap: 14px; }
.missions-title { flex: 1; font-weight: 900; font-size: clamp(22px, 2.4vw, 36px); letter-spacing: .06em; color: #e8661a; }
.missions-count { padding: .35em .9em; border-radius: 999px; background: #ffe2b8; font-weight: 800; font-size: clamp(15px, 1.4vw, 21px); color: #5a3c1e; }
.missions-close { padding: .45em 1em; border: 3px solid #fff; border-radius: 999px; background: #3a2a1a; color: #fff3d6; cursor: pointer;
  font: 800 clamp(13px, 1.1vw, 16px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; }
.missions-list { flex: 1; display: flex; flex-direction: column; justify-content: space-around; gap: clamp(8px, 1.4vh, 16px); }
.mission { display: flex; flex-direction: column; gap: 4px; }
.mission-name { font-weight: 900; font-size: clamp(18px, 1.8vw, 26px); }
.mission-desc { font-weight: 400; font-size: clamp(14px, 1.25vw, 18px); color: #6b5a40; }
.mission-row { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.mission-bar { flex: 1; height: clamp(14px, 1.8vh, 20px); border-radius: 999px; background: #bdb6a8; overflow: hidden; }
.mission-fill { height: 100%; width: 0%; background: #3c9d55; border-radius: 999px; }
.mission-num { min-width: 3.2em; text-align: right; font-weight: 800; font-size: clamp(14px, 1.25vw, 18px); color: #5a3c1e; }
.mission-pend { font-weight: 700; font-size: clamp(12px, 1.05vw, 15px); color: #c2570c; }
`;

/** Botão "MISSÕES (x/5)" no canto superior direito da área do jogo (fora da barra do topo). */
export function createMissionsButton(stageEl, onClick) {
  const style = document.createElement('style');
  style.textContent = `
.missions-btn { position: absolute; right: clamp(10px, 1.4vw, 20px); top: clamp(10px, 1.6vh, 18px); z-index: 3; display: none;
  padding: .5em 1.2em; border: 3px solid #fff; border-radius: 999px; background: #e8661a; color: #fff;
  font: 800 clamp(13px, 1.05vw, 17px) "Trebuchet MS","Segoe UI",system-ui,sans-serif; letter-spacing: .05em;
  box-shadow: 0 4px 0 #a8480b, 0 8px 18px rgba(0,0,0,.28); cursor: pointer; user-select: none; }
.missions-btn:hover { filter: brightness(1.08); }
.missions-btn.on { display: block; }`;
  document.head.appendChild(style);
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'missions-btn'; btn.tabIndex = -1;
  btn.addEventListener('mousedown', e => e.preventDefault());   // não rouba o foco do teclado
  btn.addEventListener('click', () => { btn.blur(); onClick(); });
  stageEl.appendChild(btn);
  let shown = false, text = '';
  return {
    set(on, label) {
      if (on !== shown) { shown = on; btn.classList.toggle('on', on); }
      if (on && label !== text) { text = label; btn.textContent = label; }
    },
  };
}

/** store: { progress[nível][missão] } (career.js). */
export function createMissions(store) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'missions';
  el.innerHTML = `
    <div class="missions-panel">
      <div class="missions-head">
        <div class="missions-title">MISSÕES</div>
        <div class="missions-count">0/5</div>
        <button type="button" class="missions-close">✕ Fechar (M)</button>
      </div>
      <div class="missions-list"></div>
    </div>`;
  document.body.appendChild(el);
  const title = el.querySelector('.missions-title'), count = el.querySelector('.missions-count'), list = el.querySelector('.missions-list');
  const closeBtn = el.querySelector('.missions-close');
  closeBtn.tabIndex = -1;
  closeBtn.addEventListener('mousedown', e => e.preventDefault());
  closeBtn.addEventListener('click', () => close());

  let open = false;
  function render(i) {
    const ms = MISSIONS[i], prog = store.progress[i];
    title.textContent = `MISSÕES · ${i === 9 ? 'NÍVEL' : 'BAIRRO'} ${i + 1}${LEVEL_NAMES[i] ? ' — ' + LEVEL_NAMES[i].toUpperCase() : ''}`;
    count.textContent = `${ms.filter((m, k) => prog[k] >= m.goal).length}/${ms.length}`;
    list.innerHTML = ms.map((m, k) => {
      const p = prog[k] || 0;
      const pct = Math.max(0, Math.min(100, p / m.goal * 100));
      const pend = p < m.goal && store.isPending && store.isPending(i, k);   // cumprida nesta partida: falta terminar com a entrega certa
      return `<div class="mission">
        <div class="mission-name">${m.name}</div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-row"><div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
        <div class="mission-num">${Math.min(p, m.goal)}/${m.goal}</div></div>
        ${pend ? '<div class="mission-pend">Pendente: conclua esta partida com a entrega certa para salvar.</div>' : ''}
      </div>`;
    }).join('');
  }
  function close() { open = false; el.classList.remove('open'); }

  return {
    /** Abre as missões do bairro i (0..4). */
    open(i) { render(i); open = true; el.classList.add('open'); },
    close,
    get isOpen() { return open; },
  };
}
