// Lógica das rodadas, independente de renderização.
import { HOUSES, PHRASE, REF, NARRATOR, TALK } from './data.js';
import { GRID, MAP, SPOTS, MOONV, VENICE, CANAL, doorPoint, slotY } from './layout.js';

const rand = n => Math.floor(Math.random() * n);

/** Casas por rodada: 4 entregas erradas + a certa. */
export const ROUTE_LEN = 5;
export const pick = a => a[rand(a.length)];
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function subsets(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); subsets(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
const ALL = [...Array(16).keys()];   // casas do bairro padrão (4×4)
// Etiquetas de lugar (Bairros 9 e 10: 'loc:*', 'side:*'), que dependem do lote da partida: { casa: [etiquetas] }
let PLACE = {};
export const setPlaceTags = m => { PLACE = m || {}; };
const isPlace = t => t.startsWith('loc:') || t.startsWith('side:');
let FORCE_SIDE = false;                            // Cachoeira: toda pista diz o lado (Leste/Oeste)
export const setForceSide = on => { FORCE_SIDE = !!on; };
let DROP = null;                                   // Nevasca: características que não valem neste bairro
let PHR = null;                                    // Nevasca: frases trocadas (ex.: varal congelado)
export const setPhraseOverride = m => { PHR = m || null; };
export const setDroppedTags = list => { DROP = list && list.length ? new Set(list) : null; };
const tagsOf = h => { const t = PLACE[h] ? HOUSES[h].tags.concat(PLACE[h]) : HOUSES[h].tags; return DROP ? t.filter(x => !DROP.has(x)) : t; };
/** true se o conjunto de características `s` descreve apenas a casa `h` entre as casas `pool` do bairro. */
export const isUnique = (h, s, pool = ALL) => pool.every(o => o === h || !s.every(t => tagsOf(o).includes(t)));

/** Menor combinação de características que identifica só a casa h (às vezes cor + objeto, por variedade).
 *  Sempre tem ao menos uma característica visível; as de lugar às vezes entram mesmo sem precisar. */
export function makeClue(h, pool = ALL) {
  const tags = tagsOf(h), visual = s => s.some(t => !isPlace(t)) && (!FORCE_SIDE || !tags.some(t => t.startsWith('side:')) || s.some(t => t.startsWith('side:')));
  for (let k = 1; k <= tags.length; k++) {
    const opts = subsets(tags, k).filter(s => visual(s) && isUnique(h, s, pool));
    if (!opts.length) continue;
    if (!opts.some(s => s.some(isPlace)) && Math.random() < 0.35) {
      const withPlace = subsets(tags, k + 1).filter(s => visual(s) && s.some(isPlace) && isUnique(h, s, pool));
      if (withPlace.length) return pick(withPlace);
    }
    if (k === 1 && Math.random() < 0.4) {
      const withColor = subsets(tags, 2).filter(s => s[0].startsWith('roof:') && isUnique(h, s, pool));
      if (withColor.length) return pick(withColor);
    }
    return pick(opts);
  }
  throw new Error('Casa sem pista única: ' + h);
}

/** Como makeClue, mas a pista sempre inclui a característica `tag` (ex.: 'roof:red'); continua única no bairro. */
export function makeClueWith(h, pool, tag) {
  const tags = tagsOf(h);
  if (!tags.includes(tag)) return makeClue(h, pool);
  for (let k = 1; k <= tags.length; k++) { const opts = subsets(tags, k).filter(s => s.includes(tag) && isUnique(h, s, pool)); if (opts.length) return pick(opts); }
  return makeClue(h, pool);
}

/** Artigos e preposições para falar do destino h (casa ou prédio). */
export const ref = h => { const H = HOUSES[h]; if (H.kind === 'farm') return REF[H.type === 'barn' ? 'barn' : H.type === 'shed' ? 'ware' : 'house'];
  if (H.kind === 'mvs') return REF[{ bakery: 'padaria', smithy: 'ferraria', tavern: 'taverna', textile: 'tecelagem' }[H.shopKey]];   // Medieval
  if (H.kind === 'wsh') return REF[H.wtype === 'mech' ? 'oficina' : H.wtype === 'tire' ? 'borracharia' : H.wtype === 'market' ? 'mercadinho' : 'store'];   // Operário
  if (H.kind === 'moon') return REF.module; if (H.grill) return REF.bar;   // Órbita: "o módulo"   // Colheita: casa, celeiro ou galpão
  return REF[H.kind === 'house' || H.kind === 'ven' || H.kind === 'fav' || H.kind === 'gard' || H.kind === 'mdh' || H.kind === 'row' || H.kind === 'mvh' ? 'house' : H.kind === 'mds' ? 'store' : H.kind === 'ware' ? 'ware' : 'shop']; };   // prédios (comercial ou residencial): "o prédio"

export function phrase(tags) {
  const p = tags.filter(t => !isPlace(t)).map(t => (PHR && PHR[t]) || PHRASE[t]);
  const where = tags.filter(isPlace).map(t => ', ' + PHRASE[t]).join('');   // lugar no fim: "…, no Lado Leste"
  return (p.length === 1 ? p[0] : p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1]) + where;
}

// ---------------------------------------------------------------------------------------------------------------------
// Falas dos moradores na entrega. Cada morador ganha, na partida, um temperamento (direto, distraído, falante,
// brincalhão, ocupado ou desconfiado) e uma atividade do cotidiano (o que ele estava fazendo quando a campainha tocou;
// de preferência ligada a algo que o quintal/fachada dele realmente tem). Tudo o que ele diz na partida combina com os
// dois. A fala = reação pessoal curta + a informação, que vem SEMPRE de phrase(pista) e ref(destino). Relação de lugar
// (quadra da frente, outro lado do canal, longe…) só entra quando é calculada das posições reais dos lotes.
// ---------------------------------------------------------------------------------------------------------------------
// nome + fala: até 2 linhas no computador e no celular deitado; no celular em pé (tela estreita), mais curta
const limit = () => (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 600 ? 126 : 150);
const FEM = /^(Dona|Signora|Dra\.|Mestra|Taverneira|Porteira|Padeira|Florista|Atendente da|Balconista)\b/;
const SMALL = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'em']);
const titleCase = s => s.toLowerCase().split(' ').map((w, i) => (/\d/.test(w) ? w.toUpperCase() : i && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
const WSH_ROLE = { mech: 'Mecânico', tire: 'Borracheiro', tools: 'Balconista', market: 'Atendente' };
const MDS_ROLE = { cafe: 'Barista do café', bakery: 'Padeira', flowers: 'Florista', books: 'Livreiro', optic: 'Atendente da ótica', market: 'Atendente do mercado' };
/** Quem atende a porta (prédios contemporâneos: a portaria; oficinas e lojas: quem está no balcão). */
export function speaker(h) {
  const H = HOUSES[h];
  if (H.kind === 'mod') return (h % 2 ? 'Porteira do ' : 'Porteiro do ') + H.name;
  if (H.kind === 'wsh') { const t = titleCase(H.sign || H.name), w = `${WSH_ROLE[H.wtype] || 'Atendente'} (${t})`, who = t.match(/\b(Dona|Seu) \S+/); return w.length <= 28 ? w : who ? who[0] : WSH_ROLE[H.wtype] || 'Atendente'; }   // (nome longo: a pessoa da placa, senão a função)
  if (H.kind === 'mds') return MDS_ROLE[H.shopKey] || H.name;
  return H.name;
}
const voiceOf = h => { const k = HOUSES[h].kind; return k === 'ven' ? 'ven' : k === 'moon' ? 'moon' : k === 'mvh' || k === 'mvs' ? 'med' : 'base'; };
/** Grupos de atividades do morador da casa h no bairro lv (o 1º é o geral; os outros dão o jeito do bairro). */
function actGroups(h, lv) {
  const H = HOUSES[h], L = TALK.LEVEL[lv] || {};
  switch (H.kind) {
    case 'house': return L.house || ['home'];
    case 'apt': case 'fut': return L.apt || ['apt'];
    case 'shop': return L.shop || ['shop'];
    case 'ware': return L.ware || ['ware'];
    case 'mod': return L.mod || ['portaria'];
    case 'farm': return [H.type === 'house' ? 'farm' : 'celeiro'];
    case 'mds': return ['mds:' + H.shopKey];
    case 'wsh': return ['wsh:' + H.wtype];
    case 'mvs': return ['mvs:' + H.shopKey];
    case 'mvh': return ['med'];
    default: return [H.kind];                       // ven, fav, moon, gard, mdh, row
  }
}
/** Atividade ligada a uma característica real da casa (ex.: girassóis → regando os girassóis). */
function featAct(tag, lv) {
  const own = (TALK.LEVEL[lv] || {}).feat, F = TALK.FEAT;
  for (const set of own ? [F[own], F.base] : [F.base]) {
    if (!set) continue;
    if (set[tag]) return set[tag];
    for (let k = tag.lastIndexOf(':'); k > 0; k = tag.lastIndexOf(':', k - 1)) {   // chaves de prefixo: 'gflow:' vale para 'gflow:red'
      const key = tag.slice(0, k + 1);
      if (key !== tag && set[key]) return set[key];
    }
  }
  return null;
}
const sideOf = h => { const t = (PLACE[h] || []).find(x => x.startsWith('side:')); return t ? t.slice(5) : null; };
/** Par da casa gêmea (Travessia), se o outro estiver no bairro desta partida. */
function twinOf(h, layout, slotOf) {
  const H = HOUSES[h], o = H.twin != null ? H.twin : HOUSES.findIndex(x => x.twin === h);
  return o >= 0 && slotOf[o] != null && layout[slotOf[o]] === o ? o : -1;
}

/** Relação de lugar entre a casa visitada a e o próximo destino b, calculada dos lotes reais (ou null). */
function whereIs(game, a, b) {
  if (MOONV || a == null || b == null) return null;                     // Lua: a esfera gira por baixo; sem relação
  const sa = game.slotOf[a], sb = game.slotOf[b];
  if (sa == null || sb == null || sa < 0 || sb < 0) return null;
  const A = sideOf(a), B = sideOf(b);
  if (CANAL && A && B && A !== B) return CANAL.canyon ? 'bridge' : 'cross';
  const pa = doorPoint(sa), pb = doorPoint(sb), d = Math.hypot(pa.x - pb.x, pa.z - pb.z);
  const flat = Math.abs(slotY(sa) - slotY(sb)) < 0.5;
  if (!SPOTS && !VENICE) {                                                // grade: cada lote é uma quadra; a frente das casas dá para o sul (+Z)
    const ra = Math.floor(sa / GRID), ca = sa % GRID, rb = Math.floor(sb / GRID), cb = sb % GRID;
    if (flat && ca === cb && rb === ra + 1) return 'front';
    if (flat && ca === cb && rb === ra - 1) return 'back';
    if (flat && ra === rb && Math.abs(ca - cb) === 1) return 'beside';
  } else if (SPOTS && flat && d < 11) return 'near';
  if (CANAL && !CANAL.canyon && A && A === B) return 'same';
  if (d > 0.6 * MAP) return 'far';
  return null;
}
const REL_P = { front: 0.85, back: 0.85, beside: 0.85, near: 0.85, cross: 0.8, bridge: 0.8, same: 0.5, far: 0.45 };

/** Escolhe uma alternativa ainda não usada por este morador (se todas já foram, qualquer uma menos a última dita). */
function choose(alts, used) {
  if (!alts || !alts.length) return null;
  let pool = used ? alts.filter(a => !used.has(a)) : alts;
  if (!pool.length) { let last = null; for (const u of used) if (alts.includes(u)) last = u; pool = alts.length > 1 ? alts.filter(a => a !== last) : alts; }
  const s = pick(pool);
  if (used) { used.delete(s); used.add(s); }   // (o Set guarda a ordem: a última dita fica no fim)
  return s;
}
const OPENERS = ['Desculpa a demora, tava ', 'Atendi correndo: tava ', 'Atendi pingando: tava ', 'Você me pegou ', 'Eu estava '];
/** Versão curta de uma reação ("Desculpa a demora, tava regando…" → "Tava regando…"), usada só quando falta espaço. */
const shortReact = x => { const o = OPENERS.find(q => x.startsWith(q)); return o ? 'Tava ' + x.slice(o.length) : x; };
/** Junta as partes da fala; se passar do limite, troca pelas alternativas mais curtas e depois tira as opcionais. */
function fit(name, parts, used) {
  const max = limit() - name.length - 4;
  const P = parts.filter(p => p && p.alts && p.alts.length);
  const ch = P.map(p => choose(p.alts, used));   // (nem a reação nem o modelo se repetem logo em seguida no mesmo morador)
  const total = () => ch.reduce((s, c) => s + (c ? c.length + 1 : 0), 0) - 1;
  const idx = pri => P.map((p, i) => i).filter(i => P[i].pri === pri);
  for (const i of [2, 0, 1].flatMap(idx)) { if (total() <= max) break; const s = P[i].alts.map(P[i].pri === 1 ? shortReact : x => x).reduce((m, x) => (x.length < m.length ? x : m)); if (s.length < ch[i].length) ch[i] = s; }   // 1º encurta: lugar, informação, reação
  for (const i of [2, 1].flatMap(idx)) { if (total() <= max) break; ch[i] = null; }                                                                 // depois tira: lugar, reação
  return ch.filter(Boolean).join(' ');
}

export class Game {
  constructor() {
    this.delivered = 0;
    this.setNeighborhood(ALL, ALL, 16);
  }

  /**
   * Define o bairro: `pool` = casas presentes, `slots` = lotes que recebem casa, `slotCount` = total de lotes
   * (lotes sem casa, como os da praça, ficam com -1 em layout). Começa uma rodada nova.
   */
  setNeighborhood(pool, slots, slotCount, fixed = null) {
    this.candidates = pool.slice();           // casas que podem entrar no bairro
    this.fixed = fixed || {};                 // { lote: casa } que nunca mudam (ex.: a casa do canto do Bairro 1)
    this.slots = slots.slice();
    this.slotCount = slotCount;
    this.prevRoute = null;
    this.prevPerm = null;
    this.newRound();
  }

  /** Embaralha as casas nos lotes e sorteia uma nova rota de ROUTE_LEN casas (4 erradas + a certa). */
  newRound() {
    const fixedHouses = Object.values(this.fixed);
    const free = this.slots.filter(s => !(s in this.fixed));
    let perm;
    do { perm = shuffle(this.candidates.filter(h => !fixedHouses.includes(h))).slice(0, free.length); }
    while (this.prevPerm && perm.every((v, i) => v === this.prevPerm[i]));
    this.layout = Array(this.slotCount).fill(-1);   // layout[lote] = índice da casa (-1 = sem casa)
    this.slotOf = [];                               // slotOf[casa] = lote
    for (const s in this.fixed) { this.layout[s] = this.fixed[s]; this.slotOf[this.fixed[s]] = +s; }
    free.forEach((s, i) => { this.layout[s] = perm[i]; this.slotOf[perm[i]] = s; });
    if (this.arrange) this.arrange(this.layout, free);   // ex.: Bairro 10 põe as casas gêmeas em lados opostos do canal
    this.layout.forEach((h, s) => { if (h >= 0) this.slotOf[h] = s; });
    setPlaceTags(this.placeTags ? this.placeTags(this.layout) : null);
    this.pool = this.layout.filter(h => h >= 0 && !HOUSES[h].noDelivery);   // destinos desta partida (as fixas também entram; o Grillby's não é destino)

    const len = ROUTE_LEN;
    let route;
    for (let tries = 0; tries < 50; tries++) {
      route = shuffle(this.pool.slice()).slice(0, len);
      const p = this.prevRoute;
      if (!p || (route[len - 1] !== p[p.length - 1] && route[0] !== p[0])) break;
    }
    this.route = route;                       // rota planejada; o último é o destinatário
    this.clues = route.map(h => makeClue(h, this.pool));   // clues[i] descreve route[i]
    if (this.ensure) this.ensure(this, this.pool);           // garantias do bairro (ex.: Bairro 6)
    this.step = 0;                            // índice da casa indicada atualmente
    this.hintByNarrator = false;
    this.visits = new Map();                  // visitas a cada casa nesta entrega
    this.people = new Map();                  // moradores desta partida: temperamento, atividade, falas já usadas
    this.usedActs = new Set();
    this.tempers = [];
    this.prevPerm = perm;
    this.prevRoute = route.slice();
  }

  /**
   * Modo Livre: nova encomenda no MESMO mapa (sem embaralhar as casas), com rota sorteada
   * só entre as casas disponíveis (`available`, ex.: as que não foram destruídas).
   */
  newDelivery(available) {
    const pool = available.slice();
    const len = Math.min(pool.length, ROUTE_LEN);
    let route;
    for (let tries = 0; tries < 50; tries++) {
      route = shuffle(pool.slice()).slice(0, len);
      const p = this.prevRoute;
      if (!p || (route[len - 1] !== p[p.length - 1] && route[0] !== p[0])) break;
    }
    this.route = route;
    this.clues = route.map(h => makeClue(h, this.pool));
    if (this.ensure) this.ensure(this, pool);
    this.step = 0;
    this.hintByNarrator = false;
    this.visits = new Map();                  // (os moradores continuam os mesmos: lembram de você)
    this.prevRoute = route.slice();
  }

  get recipient() { return this.route[this.route.length - 1]; }

  /** Texto principal do topo durante a direção. */
  mainText() {
    if (this.step === 0) return `Entrega para ${ref(this.route[0]).a} com ${phrase(this.clues[0])}.`;
    const r = ref(this.route[this.step]), p = phrase(this.clues[this.step]);
    return this.hintByNarrator ? `(Talvez seja ${r.a} com ${p}…)` : `Palpite do morador: ${r.n} com ${p}.`;   // palpite do narrador: entre parênteses
  }

  /** Morador da casa h nesta partida (criado na 1ª visita): temperamento e atividade ficam até a partida acabar. */
  persona(h, lv = 0) {
    let P = this.people.get(h);
    if (P) return P;
    if (!this.tempers.length) this.tempers = shuffle(TALK.TEMPERS.slice());   // baralho: moradores seguidos têm jeitos diferentes
    const name = speaker(h);
    P = { t: this.tempers.pop(), name, fem: FEM.test(name), voice: voiceOf(h), used: new Set(), met: false, act: null, twin: -1 };
    // o que estava fazendo: de preferência algo do próprio quintal/fachada; depois o cotidiano do bairro
    const tw = lv === 10 ? twinOf(h, this.layout, this.slotOf) : -1;
    if (tw >= 0 && sideOf(h) && sideOf(tw) && sideOf(h) !== sideOf(tw) && Math.random() < 0.6) { P.act = TALK.TWIN; P.twin = tw; }
    if (!P.act) {
      const feats = [...new Set(tagsOf(h).map(t => featAct(t, lv)).filter(Boolean))];
      const freeF = feats.filter(a => !this.usedActs.has(a));
      if (freeF.length && Math.random() < ((TALK.LEVEL[lv] || {}).featP ?? 0.5)) P.act = pick(freeF);
    }
    if (!P.act) {
      const gs = actGroups(h, lv), main = TALK.ACTS[gs[0]] || TALK.ACTS.home, extra = gs.slice(1).flatMap(g => TALK.ACTS[g] || []);
      const fresh = a => a.filter(x => !this.usedActs.has(x));
      const pool = extra.length && Math.random() < 0.4 ? (fresh(extra).length ? fresh(extra) : fresh(main)) : (fresh(main).length ? fresh(main) : fresh(extra));
      P.act = pick(pool.length ? pool : main);
    }
    this.usedActs.add(P.act);
    this.people.set(h, P);
    return P;
  }

  /** Casa cujo morador não atende (K): mesma lógica da rota, mas o texto é um pensamento do narrador. */
  narratorVisit(h) {
    let text, success = false;
    const n = (this.visits.get(h) || 0) + 1; this.visits.set(h, n);
    if (h === this.recipient) { success = true; text = pick(NARRATOR.success); this.delivered++; }
    else {
      const idx = this.route.indexOf(h);
      if (idx === this.step) { this.step++; this.hintByNarrator = true; text = pick(NARRATOR.hint)(phrase(this.clues[this.step]), ref(this.route[this.step])); }
      else if (idx >= 0 && idx < this.step) text = choose(NARRATOR.repeat, this.narrUsed ||= new Set())(phrase(this.clues[idx + 1]), ref(this.route[idx + 1]));
      else if (n > 1) text = choose(NARRATOR.nohintAgain, this.narrUsed ||= new Set());   // (sem repetir a última)
      else text = pick(NARRATOR.nohint);
    }
    return { h, name: HOUSES[h].name, text, success, narrator: true };
  }

  /** Tentativa de entrega na casa h (lv = bairro, índice 0–23). Retorna { h, name, text, success }. */
  visit(h, lv = 0) {
    if (HOUSES[h].narrator) return this.narratorVisit(h);
    const P = this.persona(h, lv), V = TALK.VOICE[P.voice] || TALK.VOICE.base, T = V[P.t] || TALK.VOICE.base[P.t];
    const B = TALK.VOICE.base[P.t], get = k => { const t = T[k] && T[k].length ? T[k] : B[k]; return t.length < 2 && T !== B && /^(rep|nohint)/.test(k) ? t.concat(B[k] || []) : t; };   // (voz temática com uma só opção: soma as da base para a insistência não repetir igual)
    const n = (this.visits.get(h) || 0) + 1; this.visits.set(h, n);
    const [actFirst, actBack, actOk] = P.act;
    const facts = [];
    let text, success = false, info = null;
    const infoOf = i => { const r0 = ref(this.route[i]), r = { ...r0, A: r0.a.charAt(0).toUpperCase() + r0.a.slice(1) }; return { p: phrase(this.clues[i]), r, h: this.route[i] }; };
    const relPart = target => {
      const w = whereIs(this, h, target);
      return !w || Math.random() > REL_P[w] ? null : { alts: TALK.REL[w], pri: 2 };
    };
    const tpl = (k, I) => ({ alts: get(k).map(f => f(I.p, I.r)), pri: 0 });
    if (h === this.recipient) {                                   // entrega certa
      success = true; this.delivered++;
      text = fit(P.name, [{ alts: P.met ? get('okAgain') : actOk, pri: 1 }, { alts: get('ok'), pri: 0 }], P.used);
    } else {
      const idx = this.route.indexOf(h);
      if (idx === this.step) {                                    // casa indicada: reação + o próximo palpite
        this.step++; this.hintByNarrator = false;
        info = infoOf(this.step);
        const react = n > 1 ? { alts: actBack, pri: 1 } : P.met ? { alts: get('again'), pri: 1 } : { alts: actFirst, pri: 1 };
        text = fit(P.name, [react, tpl(n > 1 ? 'late' : 'hint', info), relPart(info.h)], P.used);
      } else if (idx >= 0 && idx < this.step) {                   // já deu palpite: repete o mesmo, reconhecendo a insistência
        info = infoOf(idx + 1);
        const parts = n === 2 ? [{ alts: actBack, pri: 1 }, tpl('rep2', info)] : n === 3 ? [tpl('rep3', info)] : [tpl('repN', info)];
        text = fit(P.name, [...parts, relPart(info.h)], P.used);
      } else if (n === 1) {                                       // fora da indicação: não altera a rota
        text = fit(P.name, [{ alts: P.met ? get('again') : actFirst, pri: 1 }, { alts: get('nohint'), pri: 0 }], P.used);
      } else if (n === 2) text = fit(P.name, [{ alts: actBack, pri: 1 }, { alts: get('nohint2'), pri: 0 }], P.used);
      else text = fit(P.name, [{ alts: get('nohintN'), pri: 0 }], P.used);
    }
    for (const k in TALK.REL) if (TALK.REL[k].some(x => text.includes(x))) facts.push(k);   // (para os testes: relações de lugar que entraram na fala)
    if (P.act === TALK.TWIN && TALK.TWIN.flat().some(x => text.includes(x))) facts.push('twin:' + P.twin);
    P.met = true;
    text = text.replace(/\{o\}/g, P.fem ? 'a' : 'o');
    return { h, name: P.name, text, success, info: info && { p: info.p, n: info.r.n, h: info.h }, facts, temper: P.t };
  }
}
