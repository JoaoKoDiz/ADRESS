// Maquetes do mapa da Carreira com arquivo próprio (as outras continuam em careerMap.js).
// Cada módulo exporta { build(ctx), signY?, thumb? }:
//   build(ctx): monta a maquete em ctx.g (ctx: g, add, G, roof, gray, base(), ROADC, house, tinyTree e as peças de kit.js).
//     Chame ctx.base() para a base padrão (grama + sebe 15×15); sem ela, a maquete faz a própria base.
//   signY: altura da placa "BAIRRO N" no mapa (o quadro MISSÕES fica 6 acima).
//   thumb: enquadramento da miniatura da seleção do Livre { dir: [x, y, z], k (zoom, menor = mais perto), dy (desloca o centro) }.
import * as farm from './farm.js';
import * as garden from './garden.js';
import * as modern from './modern.js';
import * as work from './work.js';
import * as forest from './forest.js';
import * as canyon from './canyon.js';
import * as medieval from './medieval.js';
export const MINI_MODULES = { farm, garden, modern, work, forest, canyon, medieval };
