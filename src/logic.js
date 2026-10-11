// Lógica das rodadas, independente de renderização.
import {
  HOUSES, PHRASE, REF, COMPLAINTS, NARRATOR, FEATURE_COMPLAINTS, HINTS, REPEATS, NOHINT, NOHINT_AGAIN, SUCCESS,
} from './data.js';

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
const tagsOf = h => PLACE[h] ? HOUSES[h].tags.concat(PLACE[h]) : HOUSES[h].tags;
/** true se o conjunto de características `s` descreve apenas a casa `h` entre as casas `pool` do bairro. */
export const isUnique = (h, s, pool = ALL) => pool.every(o => o === h || !s.every(t => tagsOf(o).includes(t)));

/** Menor combinação de características que identifica só a casa h (às vezes cor + objeto, por variedade).
 *  Sempre tem ao menos uma característica visível; as de lugar às vezes entram mesmo sem precisar. */
export function makeClue(h, pool = ALL) {
  const tags = tagsOf(h), visual = s => s.some(t => !isPlace(t));
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

/** Artigos e preposições para falar do destino h (casa ou prédio). */
export const ref = h => REF[HOUSES[h].kind === 'house' || HOUSES[h].kind === 'ven' ? 'house' : HOUSES[h].kind === 'ware' ? 'ware' : 'shop'];   // prédios (comercial ou residencial): "o prédio"

export function phrase(tags) {
  const p = tags.filter(t => !isPlace(t)).map(t => PHRASE[t]);
  const where = tags.filter(isPlace).map(t => ', ' + PHRASE[t]).join('');   // lugar no fim: "…, no Lado Leste"
  return (p.length === 1 ? p[0] : p.slice(0, -1).join(', ') + ' e ' + p[p.length - 1]) + where;
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
    this.pool = this.layout.filter(h => h >= 0);    // casas presentes nesta partida (as fixas também entram nas entregas)

    const len = ROUTE_LEN;
    let route;
    for (let tries = 0; tries < 50; tries++) {
      route = shuffle(this.pool.slice()).slice(0, len);
      const p = this.prevRoute;
      if (!p || (route[len - 1] !== p[p.length - 1] && route[0] !== p[0])) break;
    }
    this.route = route;                       // rota planejada; o último é o destinatário
    this.clues = route.map(h => makeClue(h, this.pool));   // clues[i] descreve route[i]
    this.step = 0;                            // índice da casa indicada atualmente
    this.hintByNarrator = false;
    this.noHintVisited = new Set();
    this.usedComplaints = new Set();
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
    this.step = 0;
    this.hintByNarrator = false;
    this.noHintVisited = new Set();
    this.usedComplaints = new Set();
    this.prevRoute = route.slice();
  }

  get recipient() { return this.route[this.route.length - 1]; }

  /** Texto principal do topo durante a direção. */
  mainText() {
    if (this.step === 0) return `Entrega para ${ref(this.route[0]).a} com ${phrase(this.clues[0])}.`;
    const r = ref(this.route[this.step]), p = phrase(this.clues[this.step]);
    return this.hintByNarrator ? `(Talvez seja ${r.a} com ${p}...)` : `Palpite do morador: ${r.n} com ${p}.`;   // palpite do narrador: entre parênteses
  }

  complaintFor(h) {
    const special = HOUSES[h].f.filter(k => FEATURE_COMPLAINTS[k] && !this.usedComplaints.has(FEATURE_COMPLAINTS[k]));
    let c;
    if (special.length && Math.random() < 0.5) c = FEATURE_COMPLAINTS[pick(special)];
    else {
      const pool = COMPLAINTS.filter(x => !this.usedComplaints.has(x));
      c = pick(pool.length ? pool : COMPLAINTS);
    }
    this.usedComplaints.add(c);
    return c;
  }

  /** Casa cujo morador não atende (K): mesma lógica da rota, mas o texto é um pensamento do narrador. */
  narratorVisit(h) {
    let text, success = false;
    if (h === this.recipient) { success = true; text = pick(NARRATOR.success); this.delivered++; }
    else {
      const idx = this.route.indexOf(h);
      if (idx === this.step) { this.step++; this.hintByNarrator = true; text = pick(NARRATOR.hint)(phrase(this.clues[this.step]), ref(this.route[this.step])); }
      else if (idx >= 0 && idx < this.step) text = pick(NARRATOR.repeat)(phrase(this.clues[idx + 1]), ref(this.route[idx + 1]));
      else if (this.noHintVisited.has(h)) text = pick(NARRATOR.nohintAgain);
      else { this.noHintVisited.add(h); text = pick(NARRATOR.nohint); }
    }
    return { h, name: HOUSES[h].name, text, success, narrator: true };
  }

  /** Tentativa de entrega na casa h. Retorna { h, name, text, success }. */
  visit(h) {
    let text, success = false;
    if (HOUSES[h].narrator) return this.narratorVisit(h);
    if (h === this.recipient) {
      success = true; text = pick(SUCCESS); this.delivered++;
    } else {
      const idx = this.route.indexOf(h);
      if (idx === this.step) {                          // casa indicada: reclama e dá o próximo palpite
        this.step++; this.hintByNarrator = false;
        text = this.complaintFor(h) + ' ' + pick(HINTS)(phrase(this.clues[this.step]), ref(this.route[this.step]));
      } else if (idx >= 0 && idx < this.step) {         // já deu palpite: só repete, sem pista nova
        text = pick(REPEATS)(phrase(this.clues[idx + 1]), ref(this.route[idx + 1]));
      } else if (this.noHintVisited.has(h)) {           // fora da indicação, de novo
        text = pick(NOHINT_AGAIN);
      } else {                                          // fora da indicação: não altera a rota
        this.noHintVisited.add(h);
        text = this.complaintFor(h) + ' ' + pick(NOHINT);
      }
    }
    return { h, name: HOUSES[h].name, text, success };
  }
}
