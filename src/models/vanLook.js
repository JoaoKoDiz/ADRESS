// Visual da van que o jogador escolheu no Shop (rodas, bagageiro, estampa), salvo no navegador (adress.shop.equip.v1).
// Todas as vans do jogo (partida, tela inicial, mapa da Carreira) se registram aqui e recebem o visual salvo; as cores (pintura, roda padrão,
// xadrez) ficam em adress.shop.v1 e já valem para todas as vans porque seus materiais são compartilhados.
import { WHEEL_MODELS } from './wheels.js';
import { RACK_MODELS } from './racks.js';
import { DECALS } from './decals.js';

const KEY = 'adress.shop.equip.v1';
const LIMIT = { wheel: WHEEL_MODELS.length, rack: RACK_MODELS.length, decal: DECALS.length };
export const look = { wheel: 0, rack: 0, decal: 0 };
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s) for (const k of Object.keys(look)) if (Number.isInteger(s[k]) && s[k] >= 0 && s[k] < LIMIT[k]) look[k] = s[k];
} catch (e) { /* ignora */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(look)); } catch (e) { /* ignora */ } };
const vans = new Set();

/** Aplica o visual salvo a uma van (0 = padrão: não precisa fazer nada). */
export function applyLook(v) {
  if (look.wheel) v.setWheelModel(look.wheel);
  if (look.rack) v.setRackModel(look.rack);
  if (look.decal) v.setDecalModel(look.decal);
}
export function registerVan(v) { vans.add(v); applyLook(v); }
/** Equipa e salva: kind = 'wheel' | 'rack' | 'decal'; i = índice do modelo. Vale na hora para todas as vans registradas. */
export function equip(kind, i) {
  look[kind] = i; save();
  const fn = { wheel: 'setWheelModel', rack: 'setRackModel', decal: 'setDecalModel' }[kind];
  vans.forEach(v => v[fn](i));
}
/** As cores do xadrez mudaram: redesenha a estampa equipada nas vans. */
export function refreshDecals() { vans.forEach(v => v.refreshDecal()); }
