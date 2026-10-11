// Carreira: tela de MISSÕES de um bairro (tecla M perto da maquete no mapa).
// Quase a tela inteira; nas bordas aparece o mapa desfocado. 5 missões por bairro, cada uma com
// nome, descrição, barra de progresso (cinza → verde) e contagem; no canto, quantas das 5 foram concluídas.

// Missões por fase (nível). id liga a missão à regra em career.js; goal = quanto precisa para concluir.
// Fases sem missões definidas usam o modelo (sem id: não avançam ainda).
const PLACEHOLDER = () => Array.from({ length: 5 }, () => ({ id: null, name: 'MISSÃO', desc: 'Descrição breve da missão.', goal: 5 }));
export const LEVEL_NAMES = ['Primeiros Dias', 'Olhos Abertos', 'Entregador Teimoso', 'Péssimo Senso de Direção', '', '', '', '', '', '', '', 'Veneza'];
export const MISSIONS = [
  [
    { id: 'firstShift', name: 'Primeiro Turno', desc: 'Complete uma partida inteira, realizando as 4 entregas erradas e a 5ª entrega correta.', goal: 1 },
    { id: 'streets', name: 'Conhecendo a Vizinhança', desc: 'Passe por pelo menos 5 (das 10) ruas no bairro, antes de concluir a entrega correta.', goal: 5 },
    { id: 'noRepeat', name: 'Sem Voltar Atrás', desc: 'Complete uma partida sem entrar quatro vezes na mesma rua.', goal: 1 },
    { id: 'lap', name: 'Volta no Quarteirão', desc: 'Dê uma volta completa no bairro antes da quinta entrega.', goal: 1 },
    { id: 'wrongWay', name: 'Duplo Erro', desc: 'Faça uma entrega incorreta da forma errada (entregue para a casa errada, mesmo que se trate de uma dica falsa).', goal: 1 },
  ],
  [
    { id: 'blue', name: 'Telhado Azul', desc: 'Faça 3 entregas em casas com telhados azuis (podendo ser ao longo de partidas diferentes).', goal: 3 },
    { id: 'redWrong', name: 'Telhado Vermelho Errado', desc: 'Faça uma entrega falsa em uma casa com telhado vermelho.', goal: 1 },
    { id: 'fountain', name: 'Fonte Pequena', desc: 'Faça duas entregas falsas em uma casa com uma fonte pequena (podendo ser ao longo de partidas diferentes).', goal: 2 },
    { id: 'trampoline', name: 'Insistir no Pulo', desc: 'Insista em fazer uma entrega falsa na mesma casa que tenha um pula-pula, 4 vezes, na mesma partida.', goal: 4 },
    { id: 'hint', name: 'Pequena Dica', desc: 'Use a dica 3 vezes (em partidas diferentes).', goal: 3 },
  ],
  [
    { id: 'tenSame', name: 'Dez Vezes é Demais', desc: 'Faça 10 entregas falsas propositalmente na mesma casa durante uma única partida.', goal: 10 },
    { id: 'tourist', name: 'Turista do Bairro', desc: 'Passe pela mesma rua 10 vezes antes de realizar a entrega correta.', goal: 10 },
    { id: 'nextDoor', name: 'Não Era Aqui?', desc: 'Faça uma entrega em uma das 4 casas imediatamente ao lado daquela indicada pela dica falsa.', goal: 1 },
    { id: 'opposite', name: 'Do Outro Lado', desc: 'Insista 3 vezes na entrega errada, em uma das 4 casas dos cantos do bairro, e repita isso logo em seguida, na casa no canto oposto.', goal: 1 },
    { id: 'dizzy', name: 'Manobras Enjoativas', desc: 'Dê 5 voltas completas em torno de uma mesma casa.', goal: 5 },
  ],
  [
    { id: 'colors', name: 'Confundi as Cores', desc: 'Ao receber uma dica falsa para um prédio comercial ou casa de cor azul, entregue propositalmente em um prédio comercial ou casa de telhado vermelho.', goal: 1 },
    { id: 'roosters', name: 'Viciado em Galos', desc: 'Insista 3 entregas falsas em duas casas diferentes que tenham um galo de metal no telhado, na mesma partida.', goal: 2 },
    { id: 'fountainSwap', name: 'Fonte Errada', desc: 'Quando a dica indicar uma casa com fonte pequena, entregue propositalmente em outra casa que também tenha uma fonte.', goal: 1 },
    { id: 'expensive', name: 'É Muito Caro!', desc: 'Abasteça duas vezes no posto de gasolina na mesma partida (pare embaixo da cobertura, ao lado das bombas, e aperte E).', goal: 2 },
    { id: 'knowHouse', name: 'Eu Conheço Essa Casa', desc: 'Insista 3 entregas incorretas propositalmente em uma casa, na mesma posição, em 2 partidas diferentes (uma em seguida da outra).', goal: 2 },
  ],
  PLACEHOLDER(),   // Bairro 5
  PLACEHOLDER(),   // Bairro 6 (a cidade)
  PLACEHOLDER(),   // Bairro 7 (a cidade com caminhões e engarrafamentos)
  PLACEHOLDER(),   // Bairro 8 (como o 7, em 8×8)
  PLACEHOLDER(),   // Bairro 9 (Encostas)
  PLACEHOLDER(),   // Bairro 10 (Travessia)
  PLACEHOLDER(),   // Bairro 11 (Trilhos)
  PLACEHOLDER(),   // Nível 12 (Veneza)
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
    title.textContent = `MISSÕES · ${i === 11 ? 'NÍVEL' : 'BAIRRO'} ${i + 1}${LEVEL_NAMES[i] ? ' — ' + LEVEL_NAMES[i].toUpperCase() : ''}`;
    count.textContent = `${ms.filter((m, k) => prog[k] >= m.goal).length}/${ms.length}`;
    list.innerHTML = ms.map((m, k) => {
      const p = prog[k] || 0;
      const pct = Math.max(0, Math.min(100, p / m.goal * 100));
      return `<div class="mission">
        <div class="mission-name">${m.name}</div>
        <div class="mission-desc">${m.desc}</div>
        <div class="mission-row"><div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
        <div class="mission-num">${Math.min(p, m.goal)}/${m.goal}</div></div>
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
