// História secundária no Bairro 24 (Modo Livre), depois do encontro no Grillby's: o K tentando recuperar uma oficina antiga
// ao lado da igreja (fora da muralha). Etapas salvas em adress.med.shop (0..5):
//   0 → conversar (a porta emperra) · 1 → "Ajudar na oficina": ferragens com o ferreiro · 2 → madeira do depósito ·
//   3 → a peça com a senhora do largo oeste · 4 → conversa final · 5 → concluído (o K continua trabalhando ali).
// Coletas de van ou a pé (o material fica com a atividade); entregas na oficina só de van; as conversas, a pé. Uma coleta não entregue se perde ao sair da partida (pode refazer);
// os consertos ficam salvos. A pergunta da etapa: o que acontece com a vontade de fazer o bem quando o reconhecimento não vem.
import * as THREE from 'three';
import { buildWorkshop } from './models/workshop.js';
import { buildStandingReader, reachArm } from './models/reader.js';
import { buildMedPerson, animatePerson } from './models/medievalPeople.js';

export const SHOP_KEY = 'adress.med.shop';
const L = s => {
  const out = [];
  for (const part of s.split(/(\[\.\.\.\]|\*\*[^*]+\*\*)/)) {
    if (!part) continue;
    if (part === '[...]') out.push({ p: 0.65 });
    else if (part.startsWith('**')) out.push({ b: part.slice(2, -2) });
    else out.push(out.length && out[out.length - 1].p ? part.replace(/^\s+/, '') : part);
  }
  return out;
};
const W1 = ['Você encontrou.', 'Eu queria ter deixado tudo pronto antes de você chegar.', '[...] Ainda não consegui.', 'Este lugar estava fechado há bastante tempo.',
  'Pensei que poderia servir para alguma coisa de novo. [...] Consertar uma cadeira, uma roda, uma porta.', 'Coisas pequenas. [...] Mas que fazem falta quando deixam de funcionar.',
  'Consegui arrumar algumas partes. [...] Outras continuam dando trabalho.', 'Hoje achei que finalmente ia terminar essa porta.', '[...] Acho que vou precisar tentar de outro jeito.',
  'Se quiser ajudar, há algumas peças que precisamos buscar.'].map(L);
const W_DOOR = ['Agora abriu.', '[...] E fechou.', 'Parece pouco quando a gente olha.', 'Mas, ontem, isso ainda não funcionava.', 'Vamos guardar as peças que sobraram. [...] Podem servir para outra coisa.'].map(L);
const W_END = ['Agora temos uma porta que abre. [...] Uma bancada que aguenta o trabalho.', 'Este lugar já pode ser usado de novo.',
  'Eu passei tanto tempo olhando para o que faltava que quase esqueci de olhar para o que estava conseguindo fazer.', 'Quando alguma coisa dava errado, [...] parecia que tudo tinha dado errado.',
  'Hoje, a porta continuou pronta enquanto resolvíamos a bancada.', 'Uma dificuldade não levou embora o que já tínhamos construído.',
  '[...] Também pensei que, quando esse lugar estivesse pronto, alguém fosse perceber quanto trabalho deu.', 'Talvez percebam. [...] Talvez estejam ocupados com coisas que eu nem conheço.',
  'É difícil continuar quando ninguém parece notar.',
  'Às vezes, dá vontade de deixar tudo como está. [...] Esperar que alguém venha dizer que vale a pena.', 'Mas a porta agora abre. [...] A bancada está firme.',
  'O que fizemos continua aqui, mesmo enquanto ninguém está olhando.', 'Eu queria que este lugar pudesse servir às pessoas de novo.', 'Isso ainda importa para mim.',
  'Para mim, a **perseverança** começa a fazer sentido aí.',
  'Continuar cuidando do que importa. [...] Aprender com o que não funcionou. [...] Aceitar ajuda.', 'Sem precisar esquecer que também ficamos cansados.',
  'Obrigado por ter dividido esse trabalho comigo.', 'Bom, [...] acho que já podemos ir.'].map(L);
export const INTRO_KEY = 'adress.med.churchIntro';                    // a montagem da igreja já terminou (não repete)
const introDone = () => { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return false; } };
// pedidos curtos do K (quem procurar) e falas dos fornecedores (onde estava guardado), sem virar uma missão à parte
const TASKS = {
  1: { item: 'ferragens', ask: ['O ferreiro, perto da praça, deve ter dobradiças e um ferrolho que sirvam.'], from: 'smith', give: ['Dobradiças e um ferrolho, como ele pediu.', 'Diga que, se faltar alguma coisa, é só voltar.'], obj: ['Busque as ferragens com o ferreiro (perto da praça).', 'Leve as ferragens até a oficina, ao lado da igreja.'] },
  2: { item: 'madeira', ask: ['No depósito perto da praça há tábuas boas. [...] Vamos precisar delas para a bancada.'], from: 'depot', give: ['Tábuas de carvalho, secas há dois invernos.', 'Aguentam bem uma bancada.'], obj: ['Busque a madeira no depósito (perto da praça).', 'Leve a madeira até a oficina.'] },
  3: { item: 'travessa', ask: ['Falta uma travessa firme para a frente da bancada.', 'A senhora do largo, no oeste do bairro, guarda madeira antiga. [...] Talvez tenha uma.'], from: 'elder', give: ['Uma travessa? [...] Guardei uma no celeiro, do tear da minha mãe.', 'Madeira boa. [...] Só estava esperando alguém precisar dela.'], obj: ['A tábua da frente rachou: busque uma travessa com a senhora do largo oeste.', 'Entregue a travessa a K.'] },
};
const HINT = { hint: 'E / Espaço — Continuar' };   // as conversas da oficina avançam só com E / Espaço

export function createWorkshopStory(ctx) {
  const { walker, van, talkBox, input } = ctx;
  let ws = null, k = null, elder = null, crate = null, E = null;   // objetos do bairro (refeitos a cada mundo)
  let task = null, S = null, prevState = 'walk', t = 0;
  const stage = () => { try { return +(localStorage.getItem(SHOP_KEY) || 0); } catch (e) { return 0; } };
  const setStage = n => { try { localStorage.setItem(SHOP_KEY, String(n)); } catch (e) { /* */ } ws && ws.setStage(n); };
  const on = () => !!ws && ctx.storyOn();
  const _v = new THREE.Vector3();
  const W = (x, y, z) => ws.root.localToWorld(_v.set(x, y, z)).clone();
  // junto à porta: do lado do trinco e FORA do arco da folha (dobradiça em x −1,25, folha de 2,5): a mão direita alcança a alça
  const K_DOOR = { x: 1.72, z: 6.3, ry: -1.24 }, K_BENCH = { x: -0.2, z: -4.3, ry: Math.PI / 2 };
  const placeK = p => { k.position.set(p.x, 0, p.z); k.rotation.set(0, p.ry, 0); reachArm(k, 1, null, 0); };
  const _g = new THREE.Vector3();
  /** Mão direita do K na alça da porta (k = 0 solta). */
  const holdDoor = (kk) => { if (kk <= 0.001) { reachArm(k, 1, null, 0); return; } ws.root.updateMatrixWorld(true); ws.grip.getWorldPosition(_g); reachArm(k, 1, _g, kk); };

  /** Monta a oficina, o K e a senhora do largo no mundo do Bairro 24. */
  function setup(world, V, game, doorPoint, HOUSES) {
    if (ws) ws.root.removeFromParent(); if (elder) elder.root.removeFromParent(); if (crate) crate.removeFromParent();   // (refeita: oficina intacta de novo)
    ws = null; task = null; S = null;
    if (!V || !V.extra) return;
    E = V.extra;
    ws = buildWorkshop(); ws.root.position.set(E.shop.cx, 0, E.shop.cz); ws.root.rotation.y = E.shop.ry; world.scene.add(ws.root); ws.root.updateMatrixWorld(true);
    k = buildStandingReader(); ws.root.add(k);
    elder = buildMedPerson({ role: 'elder', k: 2 }); world.scene.add(elder.root);
    const lg = V.largos[2]; elder.root.position.set(lg.x0 - 1.2, V.h(lg.x0, lg.z0) || 0, (lg.z0 + lg.z1) / 2); elder.root.rotation.y = Math.PI / 2;
    crate = new THREE.Group(); crate.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: '#7a5532', roughness: 0.9 })));
    crate.children[0].position.y = 0.3; crate.position.set(lg.x0 - 1.4, elder.root.position.y, (lg.z0 + lg.z1) / 2 + 1.3); world.scene.add(crate);
    // fornecedores fixos (pontos onde a van para): ferreiro (porta da ferraria), depósito, largo oeste
    const smithH = game.pool.concat(game.layout).find(h => h >= 0 && HOUSES[h] && HOUSES[h].shopKey === 'smithy');
    const sp = smithH != null && game.slotOf[smithH] != null ? doorPoint(game.slotOf[smithH]) : { x: 157, z: 104 };
    E.from = { smith: sp, depot: { x: V.depot.door.x - 3.4, z: V.depot.door.z }, elder: { x: (lg.x0 + lg.x1) / 2, z: (lg.z0 + lg.z1) / 2 } };
    refresh();
  }
  function refresh() {
    if (!ws) return;
    const st = stage(), vis = ctx.storyOn();
    ws.setStage(Math.min(st, 4));
    k.visible = vis && !(st >= 5 && introDone()); placeK(st >= 2 ? K_BENCH : K_DOOR);   // depois da montagem, o K está na igreja
    ws.setPhone(false);
    elder.root.visible = true;
  }

  // ---------- interações ----------
  const nearK = () => on() && k.visible && (Math.hypot(walker.x - E.shop.door.x, walker.z - E.shop.door.z) < 3.4 || W(k.position.x, 0, k.position.z).distanceTo(_v.set(walker.x, 0, walker.z)) < 2.4);
  // coleta também a pé (perto do fornecedor); o material fica com a atividade, a pé ou na van (a entrega continua de van)
  const footNear = p => Math.hypot(walker.x - p.x, walker.z - p.z) < (p === E.from.elder ? 5.5 : 4);
  function walkPrompt() {
    if (on() && task && !task.picked && footNear(E.from[TASKS[task.step].from])) return 'Buscar ' + TASKS[task.step].item;
    if (on() && task && task.picked && nearK()) return 'Entregar ' + TASKS[task.step].item;   // a pé também: entregar ao K na oficina
    if (!nearK() || task) return '';
    const st = stage();
    return st === 0 || st === 4 || (st >= 5 && !introDone()) ? 'Conversar' : st >= 1 && st <= 3 ? 'Ajudar na oficina' : '';
  }
  function walkAction() {
    const a = walkPrompt(); if (!a) return false;
    const st = stage();
    if (a.startsWith('Buscar')) startCine('pickup');
    else if (a.startsWith('Entregar')) startCine(task.step === 1 ? 'door' : task.step === 2 ? 'bench' : 'finish');
    else if (st === 0) startCine('meet');
    else if (st === 4) startCine('end');
    else if (st >= 5) startCine('again');                      // (o jogo fechou durante a montagem: só a última fala e a montagem de novo)
    else startCine('ask');
    return true;
  }
  const vanNear = (p, r = 7) => Math.hypot(van.x - p.x, van.z - p.z) < r && Math.abs(van.speed) < 3.5;
  function drivePrompt() {
    if (!on() || !task) return '';
    const T = TASKS[task.step];
    if (!task.picked && vanNear(E.from[T.from])) return 'Buscar ' + T.item;
    if (task.picked && vanNear(E.shop.front, 7.5)) return 'Entregar ' + T.item;
    return '';
  }
  function driveAction() {
    const a = drivePrompt(); if (!a || !input.action()) return false;
    van.stop();
    if (!task.picked) startCine('pickup'); else startCine(task.step === 1 ? 'door' : task.step === 2 ? 'bench' : 'finish');
    return true;
  }
  /** Objetivo na tela durante uma atividade (no lugar da pista da entrega normal). */
  const objective = () => on() && task ? '🔧 Oficina: ' + TASKS[task.step].obj[task.picked ? 1 : 0] : '';

  // ---------- cenas (estado 'wstory'; câmera fixa dentro da oficina, menos na coleta) ----------
  function startCine(kind) {
    prevState = ctx.getState();
    S = { kind, t: 0, phase: 0 };
    ws.root.updateMatrixWorld(true);
    ctx.setState('wstory');
    const st = stage();
    if (kind === 'meet') { placeK(K_DOOR); ws.doorPivot.rotation.y = 0.9; }
    if (kind === 'pickup') talkBox.show(TASKS[task.step].give.map(L), () => { task.picked = true; done(); }, HINT);
    if (kind === 'ask') { const step = st; talkBox.show(TASKS[step].ask.map(L), () => { task = { step, picked: false }; done(); }, HINT); }
    if (kind === 'end' || kind === 'again') {
      if (ctx.preload) ctx.preload();                                // a faixa da montagem fica pronta antes do tempo zero
      talkBox.show(kind === 'end' ? W_END : W_END.slice(-1), () => {
        setStage(5); try { localStorage.setItem('adress.med.talk1', '1'); } catch (e) { /* */ }   // oficina concluída (salva antes da montagem)
        S = { kind: 'call', t: 0, phase: 0 }; ctx.onEnding();          // tempo zero: a chamada no celular (main.js conduz a montagem)
      }, HINT);
    }
  }
  function done() { if (S && (S.kind === 'meet' || S.kind === 'door')) holdDoor(0); S = null; ws.roof.visible = true; ctx.setState(prevState === 'wstory' ? 'walk' : prevState); }
  const cams = {
    door: { pos: [-4.4, 2.9, 2.2], look: [0.6, 1.4, 5.6] },
    open: { pos: [4.0, 2.7, 1.6], look: [0.0, 1.3, 6.0] },          // teste depois do conserto: do lado do trinco (a folha abre para o outro lado)
    bench: { pos: [2.8, 2.8, 1.8], look: [-0.6, 1.0, -5.4] },
  };
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  function update(dt) {
    t += dt;
    if (!ws) return;
    // a oficina viva: o K trabalha na bancada (depois de consertar), o morador espera pela cadeira
    if (k.visible && !S && stage() >= 2) { k.rotation.y = K_BENCH.ry + 0.08 * Math.sin(t * 0.7); k.position.y = 0.01 * Math.sin(t * 2.2); }
    if (elder.root.visible) animatePerson(elder, { mode: 'idle', t: t + 3 });
    // telhado some com o jogador dentro (ou numa cena lá dentro)
    const inside = walker.object.visible && walker.x > E.shop.box.x0 && walker.x < E.shop.box.x1 && walker.z > E.shop.box.z0 && walker.z < E.shop.box.z1;
    ws.roof.visible = !inside && !(S && S.kind !== 'pickup' && S.kind !== 'ask');
    if (!S) return;
    S.t += dt;
    if (S.kind !== 'call') talkBox.update(dt);                       // (na montagem, main.js conduz a fala pelo tempo da música)
    if (S.kind !== 'call' && talkBox.open && S.t > 0.2 && input.action()) talkBox.press();   // E / Espaço: completa a fala; com ela completa, avança
    if (!S) return;                                                  // (a fala acabou e a cena terminou)
    const T = S.t;
    switch (S.kind) {
      case 'meet': {                                                 // fecha a porta, tenta abrir: emperra; ele olha para a ferramenta
        const d = ws.doorPivot;
        if (T < 1.0) d.rotation.y = 0.9 * (1 - ease(T / 1.0));             // empurra a porta até fechar (a mão segue a alça só no fim)
        else if (T < 1.6) d.rotation.y = 0;
        else if (T < 3.0) d.rotation.y = 0.05 * Math.abs(Math.sin((T - 1.6) * 18)) * (T < 2.6 ? 1 : 0.3);   // puxa e não vem
        else if (T < 3.6) { d.rotation.y = 0.02; k.rotation.y = K_DOOR.ry + 0.9 * ease((T - 3.0) / 0.6); }
        // a mão na alça: chega quando a porta está quase fechada, segura nos puxões, solta para olhar a ferramenta
        holdDoor(T < 0.7 ? 0 : T < 1.0 ? ease((T - 0.7) / 0.3) : T < 3.0 ? 1 : T < 3.4 ? 1 - ease((T - 3.0) / 0.4) : 0);
        if (T >= 3.6 && S.phase === 0) { S.phase = 1; talkBox.show(W1, () => { setStage(1); ws.doorPivot.rotation.y = 0.9; done(); }, HINT); }
        break;
      }
      case 'door': {                                                 // instala as ferragens: a porta abre e fecha direito
        const d = ws.doorPivot;
        if (S.phase === 0) { placeK(K_DOOR); ws.newHinges.visible = false; d.rotation.y = 0; S.phase = 1; }
        if (T > 1.4 && S.phase === 1) { ws.oldHinges.visible = false; ws.newHinges.visible = true; S.phase = 2; }   // peças no lugar
        // abre (ele puxa pela alça até ~0,35 e solta; a porta segue sozinha no arco, longe dele) e fecha (ele a recebe de volta)
        let ang = 0;
        if (T > 1.4 && T < 6.4) { const u = (T - 1.4) / 2.5, c = u < 1 ? u : 2 - u; ang = 1.45 * ease(c); }
        if (S.phase === 3 && T > 8.2) { const u = Math.min(1, (T - 8.2) / 1.5); ang = 1.45 * ease(u); }   // abre de novo e fica aberta
        d.rotation.y = ang;
        const hold = ang < 0.3 ? 1 : ang < 0.42 ? 1 - (ang - 0.3) / 0.12 : 0;
        holdDoor(T < 0.9 ? 0 : T < 1.3 ? ease((T - 0.9) / 0.4) * hold : hold);
        if (T >= 6.6 && S.phase === 2) { S.phase = 3; talkBox.show(W_DOOR, () => { setStage(2); placeK(K_BENCH); task = null; done(); }, HINT); }
        break;
      }
      case 'bench': {                                                // monta a estrutura nova; a tábua velha não aguenta: precisa de uma travessa
        if (S.phase === 0) { placeK(K_BENCH); ws.setStage(2); S.phase = 1; }
        if (T < 3) ws.growFrame(ease(T / 3));
        else if (T < 4.6) ws.crack(ease((T - 3) / 1.6));
        if (T > 4.6 && T < 6) k.rotation.y = K_BENCH.ry + 0.25 * Math.sin((T - 4.6) * 2.2);   // ele olha a tábua rachada
        if (T >= 6.2 && S.phase === 1) { S.phase = 2; setStage(3); task = { step: 3, picked: false }; done(); }   // (sem conversa: o objetivo já mostra a senhora do largo)
        break;
      }
      case 'finish': {                                               // a travessa no lugar, ferramentas em cima; o K confere a bancada
        if (S.phase === 0) { placeK(K_BENCH); ws.setStage(3); S.phase = 1; }
        if (T < 2.2) ws.placeLast(ease(T / 2.2));
        if (T > 2.4 && S.phase === 1) { ws.showTools(true); S.phase = 2; }
        if (S.phase === 2 && T > 2.4 && T < 4.6) k.position.y = 0.02 * Math.sin((T - 2.4) * 9);   // apoia as mãos e testa a firmeza
        if (S.phase === 2 && T >= 4.8) { S.phase = 3; k.position.y = 0; setStage(4); task = null; done(); }
        break;
      }
      case 'call': break;                                            // (montagem: main.js chama call() com o tempo da música)
      default: break;
    }
  }
  /** Câmera das cenas lá dentro (depois do rig.update). Coleta e pedidos: a câmera do jogo continua. */
  function applyCam(cam) {
    if (!S || S.kind === 'pickup' || S.kind === 'call') return;
    const c = S.kind === 'meet' ? cams.door : S.kind === 'door' ? cams.open : cams.bench;
    const p = W(...c.pos), l = W(...c.look); cam.position.copy(p); cam.lookAt(l);
  }
  return {
    setup, refresh, update, applyCam, walkPrompt, walkAction, drivePrompt, driveAction, objective,
    /** Nova partida / saiu do bairro: a coleta não entregue se perde (os consertos ficam). */
    resetTask() { task = null; if (S) { talkBox.hide(); S = null; } refresh(); },
    /** Checkpoint de teste: põe a atividade num ponto (ex.: { step: 3, picked: true } = travessa já buscada). */
    devTask(t) { task = t; S = null; refresh(); },
    get _ws() { return ws; }, get _k() { return k; },
    /** Montagem: chamada no celular (T = tempo desde o início da chamada). O K olha o aparelho e volta. */
    call(T) { if (!ws) return; ws.setPhone(T < 8.9, T); const u = T < 0.5 ? 0 : T < 1.2 ? (T - 0.5) / 0.7 : T < 2.6 ? 1 : T < 3.2 ? 1 - (T - 2.6) / 0.6 : 0;
      k.rotation.y = K_BENCH.ry - 0.35 * u * u * (3 - 2 * u); },
    /** Fim da montagem: a oficina fica sem o K (ele está na igreja). */
    endCall() { S = null; if (ws) { ws.setPhone(false); ws.roof.visible = true; } refresh(); },
    /** Ponto local da oficina → mundo. */
    local: (x, y, z) => W(x, y, z),
    get busy() { return !!task; }, get stage() { return stage(); }, get cine() { return S && S.kind; }, get task() { return task; },
    get points() { return E && { ...E.from, front: E.shop.front, door: E.shop.door }; },
  };
}
