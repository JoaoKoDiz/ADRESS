// História secundária no Bairro 24 (Modo Livre), depois do encontro no Grillby's: o K tentando recuperar uma oficina antiga
// ao lado da igreja (fora da muralha). Etapas salvas em adress.med.shop (0..5):
//   0 → conversar (a porta emperra) · 1 → "Ajudar na oficina": ferragens com o ferreiro · 2 → madeira do depósito ·
//   3 → a peça com a senhora do largo oeste · 4 → conversa final · 5 → concluído (o K continua trabalhando ali).
// Coletas e entregas só de van; as conversas, a pé. Uma coleta não entregue se perde ao sair da partida (pode refazer);
// os consertos ficam salvos. A pergunta da etapa: o que acontece com a vontade de fazer o bem quando o reconhecimento não vem.
import * as THREE from 'three';
import { buildWorkshop } from './models/workshop.js';
import { buildStandingReader } from './models/reader.js';
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
const W_BENCH = ['Essa parte não vai aguentar.', 'Eu estava tentando conservar tudo exatamente como era.', '[...] Talvez não precise.', 'Podemos aproveitar o que ainda está bom e substituir o que deixou de servir.',
  'Continuar também exige perceber quando é hora de mudar alguma coisa.'].map(L);
const W_END = ['Agora temos uma porta que abre. [...] Uma bancada que aguenta o trabalho.', 'E alguém que já precisava delas.',
  'Eu passei tanto tempo olhando para o que faltava que quase esqueci de olhar para o que estava conseguindo fazer.', 'Quando alguma coisa dava errado, [...] parecia que tudo tinha dado errado.',
  'Hoje, a porta continuou pronta enquanto resolvíamos a bancada.', 'Uma dificuldade não levou embora o que já tínhamos construído.',
  '[...] Também pensei que, quando esse lugar abrisse, alguém fosse perceber quanto trabalho deu.', 'Talvez percebam. [...] Talvez estejam ocupados com coisas que eu nem conheço.',
  'A cadeira daquele homem precisava de conserto mesmo assim.', 'É difícil continuar quando ninguém parece notar.',
  'Às vezes, dá vontade de deixar tudo como está. [...] Esperar que alguém venha dizer que vale a pena.', 'Mas ele entrou por uma porta que ontem não abria.',
  'Isso aconteceu. [...] Mesmo que ninguém fale sobre isso.', 'Para mim, a **perseverança** começa a fazer sentido aí.',
  'Continuar cuidando do que importa. [...] Aprender com o que não funcionou. [...] Aceitar ajuda.', 'Sem precisar esquecer que também ficamos cansados.',
  'Obrigado por ter dividido esse trabalho comigo.', 'Vou ficar um pouco ali ao lado.', 'Se quiser continuar nossa conversa, [...] pode me encontrar lá.'].map(L);
// pedidos curtos do K (quem procurar) e falas dos fornecedores (onde estava guardado), sem virar uma missão à parte
const TASKS = {
  1: { item: 'ferragens', ask: ['O ferreiro, perto da praça, deve ter dobradiças e um ferrolho que sirvam.'], from: 'smith', give: ['Dobradiças e um ferrolho, como ele pediu.', 'Diga que, se faltar alguma coisa, é só voltar.'], obj: ['Busque as ferragens com o ferreiro (perto da praça).', 'Leve as ferragens até a oficina, ao lado da igreja.'] },
  2: { item: 'madeira', ask: ['No depósito perto da praça há tábuas boas. [...] Vamos precisar delas para a bancada.'], from: 'depot', give: ['Tábuas de carvalho, secas há dois invernos.', 'Aguentam bem uma bancada.'], obj: ['Busque a madeira no depósito (perto da praça).', 'Leve a madeira até a oficina.'] },
  3: { item: 'peça', ask: ['Falta uma travessa firme para a frente da bancada.', 'A senhora do largo, no oeste do bairro, guarda madeira antiga. [...] Talvez tenha uma.'], from: 'elder', give: ['Uma travessa? [...] Guardei uma no celeiro, do tear da minha mãe.', 'Madeira boa. [...] Só estava esperando alguém precisar dela.'], obj: ['Busque a peça com a senhora do largo oeste.', 'Leve a peça até a oficina.'] },
};
const CUSTOMER = ['Bom dia. [...] A perna desta cadeira soltou de novo.', 'Era da minha avó. [...] Será que ainda tem jeito?'].map(L);

export function createWorkshopStory(ctx) {
  const { walker, van, talkBox, input } = ctx;
  let ws = null, k = null, cust = null, elder = null, crate = null, E = null;   // objetos do bairro (refeitos a cada mundo)
  let task = null, S = null, prevState = 'walk', t = 0;
  const stage = () => { try { return +(localStorage.getItem(SHOP_KEY) || 0); } catch (e) { return 0; } };
  const setStage = n => { try { localStorage.setItem(SHOP_KEY, String(n)); } catch (e) { /* */ } ws && ws.setStage(n); };
  const on = () => !!ws && ctx.storyOn();
  const _v = new THREE.Vector3();
  const W = (x, y, z) => ws.root.localToWorld(_v.set(x, y, z)).clone();
  const K_DOOR = { x: 0.35, z: 5.5, ry: -Math.PI / 2 }, K_BENCH = { x: -0.2, z: -4.3, ry: Math.PI / 2 };
  const placeK = p => { k.position.set(p.x, 0, p.z); k.rotation.set(0, p.ry, 0); };

  /** Monta a oficina, o K, a senhora do largo e o morador com a cadeira no mundo do Bairro 24. */
  function setup(world, V, game, doorPoint, HOUSES) {
    ws = null; task = null; S = null;
    if (!V || !V.extra) return;
    E = V.extra;
    ws = buildWorkshop(); ws.root.position.set(E.shop.cx, 0, E.shop.cz); ws.root.rotation.y = E.shop.ry; world.scene.add(ws.root); ws.root.updateMatrixWorld(true);
    k = buildStandingReader(); ws.root.add(k);
    cust = buildMedPerson({ role: 'buyer', k: 4 });   // (um homem: "a cadeira daquele homem") cust.root.visible = false; ws.root.add(cust.root);
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
    k.visible = vis; placeK(st >= 2 ? K_BENCH : K_DOOR);
    cust.root.visible = vis && st >= 4; if (st >= 4) { cust.root.position.set(1.9, 0, -2.4); cust.root.rotation.y = Math.PI * 0.9; }
    elder.root.visible = true;
  }

  // ---------- interações ----------
  const nearK = () => on() && k.visible && (Math.hypot(walker.x - E.shop.door.x, walker.z - E.shop.door.z) < 3.4 || W(k.position.x, 0, k.position.z).distanceTo(_v.set(walker.x, 0, walker.z)) < 2.4);
  function walkPrompt() {
    if (!nearK() || task) return '';
    const st = stage();
    return st === 0 || st === 4 ? 'Conversar' : st >= 1 && st <= 3 ? 'Ajudar na oficina' : '';
  }
  function walkAction() {
    const a = walkPrompt(); if (!a) return false;
    const st = stage();
    if (st === 0) startCine('meet');
    else if (st === 4) startCine('end');
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
    ctx.setState('wstory');
    const st = stage();
    if (kind === 'meet') { placeK(K_DOOR); ws.doorPivot.rotation.y = 0.9; }
    if (kind === 'pickup') talkBox.show(TASKS[task.step].give.map(L), () => { task.picked = true; done(); }, { auto: true });
    if (kind === 'ask') { const step = st; talkBox.show(TASKS[step].ask.map(L), () => { task = { step, picked: false }; done(); }, { auto: true }); }
    if (kind === 'end') talkBox.show(W_END, () => { setStage(5); try { localStorage.setItem('adress.med.talk1', '1'); } catch (e) { /* */ } done(); }, { auto: true });
  }
  function done() { S = null; ws.roof.visible = true; ctx.setState(prevState === 'wstory' ? 'walk' : prevState); }
  const cams = {
    door: { pos: [-4.4, 2.9, 2.2], look: [0.6, 1.4, 5.6] },
    bench: { pos: [2.8, 2.8, 1.8], look: [-0.6, 1.0, -5.4] },
  };
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  function update(dt) {
    t += dt;
    if (!ws) return;
    // a oficina viva: o K trabalha na bancada (depois de consertar), o morador espera pela cadeira
    if (k.visible && !S && stage() >= 2) { k.rotation.y = K_BENCH.ry + 0.08 * Math.sin(t * 0.7); k.position.y = 0.01 * Math.sin(t * 2.2); }
    if (cust.root.visible && !(S && S.kind === 'finish')) animatePerson(cust, { mode: 'idle', t, lookYaw: 0.2 * Math.sin(t * 0.4) });
    if (elder.root.visible) animatePerson(elder, { mode: 'idle', t: t + 3 });
    // telhado some com o jogador dentro (ou numa cena lá dentro)
    const inside = walker.object.visible && walker.x > E.shop.box.x0 && walker.x < E.shop.box.x1 && walker.z > E.shop.box.z0 && walker.z < E.shop.box.z1;
    ws.roof.visible = !inside && !(S && S.kind !== 'pickup' && S.kind !== 'ask');
    if (!S) return;
    S.t += dt;
    talkBox.update(dt);
    if (!S) return;                                                  // (a fala acabou e a cena terminou)
    const T = S.t;
    switch (S.kind) {
      case 'meet': {                                                 // fecha a porta, tenta abrir: emperra; ele olha para a ferramenta
        const d = ws.doorPivot;
        if (T < 1.0) d.rotation.y = 0.9 * (1 - ease(T / 1.0));
        else if (T < 1.6) d.rotation.y = 0;
        else if (T < 3.0) d.rotation.y = 0.05 * Math.abs(Math.sin((T - 1.6) * 18)) * (T < 2.6 ? 1 : 0.3);   // puxa e não vem
        else if (T < 3.6) { d.rotation.y = 0.02; k.rotation.y = K_DOOR.ry + 0.9 * ease((T - 3.0) / 0.6); }
        if (T >= 3.6 && S.phase === 0) { S.phase = 1; talkBox.show(W1, () => { setStage(1); ws.doorPivot.rotation.y = 0.9; done(); }, { auto: true }); }
        break;
      }
      case 'door': {                                                 // instala as ferragens: a porta abre e fecha direito
        const d = ws.doorPivot;
        if (S.phase === 0) { placeK(K_DOOR); ws.newHinges.visible = false; S.phase = 1; }
        if (T > 1.4 && S.phase === 1) { ws.oldHinges.visible = false; ws.newHinges.visible = true; S.phase = 2; }   // peças no lugar
        if (T > 1.4 && T < 6.4) { const u = (T - 1.4) / 2.5, c = u < 1 ? u : 2 - u; d.rotation.y = 1.45 * ease(c); }
        if (T >= 6.6 && S.phase === 2) { S.phase = 3; d.rotation.y = 0; talkBox.show(W_DOOR, () => { setStage(2); placeK(K_BENCH); task = null; done(); }, { auto: true }); }
        if (S.phase === 3 && T > 8.2 && T < 9.7) d.rotation.y = 1.45 * ease((T - 8.2) / 1.5);
        break;
      }
      case 'bench': {                                                // monta a estrutura nova; a tábua velha não aguenta; muda o plano
        if (S.phase === 0) { placeK(K_BENCH); ws.setStage(2); S.phase = 1; }
        if (T < 3) ws.growFrame(ease(T / 3));
        else if (T < 4.6) ws.crack(ease((T - 3) / 1.6));
        if (T >= 4.8 && S.phase === 1) { S.phase = 2; talkBox.show(W_BENCH, () => { setStage(3); task = null; done(); }, { auto: true }); }
        break;
      }
      case 'finish': {                                               // a travessa no lugar, ferramentas em cima; chega o morador com a cadeira
        if (S.phase === 0) { placeK(K_BENCH); ws.setStage(3); ws.chair.visible = false; S.phase = 1; }
        if (T < 2.2) ws.placeLast(ease(T / 2.2));
        if (T > 2.4 && S.phase === 1) { ws.showTools(true); S.phase = 2; cust.root.visible = true; }
        if (S.phase >= 2 && T < 8.5) {                               // entra pela porta trazendo a cadeira
          const u = ease((T - 2.6) / 5.5), a = { x: 0, z: 13 }, b = { x: 0, z: 5 }, c = { x: 1.9, z: -2.4 };
          const p = u < 0.55 ? { x: a.x + (b.x - a.x) * u / 0.55, z: a.z + (b.z - a.z) * u / 0.55 } : { x: b.x + (c.x - b.x) * (u - 0.55) / 0.45, z: b.z + (c.z - b.z) * (u - 0.55) / 0.45 };
          cust.root.position.set(p.x, 0, p.z); cust.root.rotation.y = Math.PI + (u > 0.55 ? -0.2 : 0);
          animatePerson(cust, { mode: 'walk', ph: T * 7, t: T });
          ws.chair.visible = true; ws.chair.position.set(p.x - 0.1, 0.25, p.z - 0.7);
        }
        if (T >= 8.5 && S.phase === 2) {
          S.phase = 3; ws.chair.position.set(1.2, 0, -3.3); cust.root.position.set(1.9, 0, -2.4); cust.root.rotation.y = Math.PI * 0.9;
          k.rotation.y = K_BENCH.ry - 1.6;                            // o K se vira para a cadeira e começa a examiná-la
          talkBox.show(CUSTOMER, () => { setStage(4); task = null; done(); }, { auto: true });
        }
        if (S.phase === 3) animatePerson(cust, { mode: 'idle', t: T, talk: talkBox.open });
        break;
      }
      default: break;
    }
  }
  /** Câmera das cenas lá dentro (depois do rig.update). Coleta e pedidos: a câmera do jogo continua. */
  function applyCam(cam) {
    if (!S || S.kind === 'pickup') return;
    const c = S.kind === 'meet' || S.kind === 'door' ? cams.door : cams.bench;
    const p = W(...c.pos), l = W(...c.look); cam.position.copy(p); cam.lookAt(l);
  }
  return {
    setup, refresh, update, applyCam, walkPrompt, walkAction, drivePrompt, driveAction, objective,
    /** Nova partida / saiu do bairro: a coleta não entregue se perde (os consertos ficam). */
    resetTask() { task = null; if (S) { talkBox.hide(); S = null; } refresh(); },
    get busy() { return !!task; }, get stage() { return stage(); }, get cine() { return S && S.kind; }, get task() { return task; },
    get points() { return E && { ...E.from, front: E.shop.front, door: E.shop.door }; },
  };
}
