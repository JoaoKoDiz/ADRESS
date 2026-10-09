// Estampas da van (Shop → Estampas): 18 desenhos "à mão" nas laterais + "Sem estampa" (padrão).
// Cada estampa é um canvas transparente por lado (direito = +Z, esquerdo = −Z) que cobre a lateral inteira da van (4,8 × 1,8, de x = −2,4 a 2,4 e y = 0,4 a 2,2).
// O logotipo ADRESS nunca é coberto (exceto pelas asas, que podem cobrir mais). Os dois lados são diferentes (exceto asas e faixa xadrez).
// Convenção de desenho: coordenadas de MUNDO (x = frente da van, y = altura). No lado esquerdo o canvas sai espelhado em x, e o texto é desenhado normal.
import * as THREE from 'three';
import { PAINT } from './paint.js';

export const DECAL_W = 1536, DECAL_H = 576, U = 320;              // px por unidade de mundo
const INK = '#3a2a22';
const C = { red: '#ee6352', yellow: '#f7c548', blue: '#59a5d8', green: '#6bbf59', pink: '#f49cbb', purple: '#a58be0', orange: '#f5a04a', cream: '#fff3dc', brown: '#c58f5a', gray: '#cfd4da', white: '#ffffff', sky: '#bfe7f7', gold: '#e8c24a' };
const FONT = '"Segoe Print","Bradley Hand","Chalkboard SE","Comic Sans MS","Marker Felt",cursive';
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** Cores do xadrez (Faixa xadrez), editáveis no Shop. */
export const DECAL_CHECK_DEFAULT = { a: '#1b1b1f', b: '#f2f2f2' };
const check = { ...DECAL_CHECK_DEFAULT };
export const setDecalChecks = (a, b) => { if (a) check.a = a; if (b) check.b = b; };

// área da lateral onde dá para desenhar (um pouco para dentro do contorno da carroceria) e a janela da cabine, que fica de fora
const BODY = [[-2.3, 0.47], [2.3, 0.47], [2.3, 1.12], [2.14, 1.28], [1.5, 1.37], [0.8, 2.12], [-2.3, 2.12]];
const WINDOW = [[0.5, 1.45], [1.46, 1.45], [0.97, 2.12], [0.5, 2.12]];

class Pen {
  constructor(side, seed) {
    this.side = side; this.flip = side < 0; this.r = rng(seed * 7919 + (side < 0 ? 31 : 17));
    const c = document.createElement('canvas'); c.width = DECAL_W; c.height = DECAL_H;
    this.c = c; this.g = c.getContext('2d');
    this.g.lineCap = 'round'; this.g.lineJoin = 'round';
  }
  X(x) { return (this.flip ? 2.4 - x : x + 2.4) * U; }
  Y(y) { return (2.2 - y) * U; }
  rand(a, b) { return a + this.r() * (b - a); }
  /** Só dentro da lataria (sem a janela). */
  clipBody(g = this.g) {
    g.beginPath();
    BODY.forEach(([x, y], i) => (i ? g.lineTo(this.X(x), this.Y(y)) : g.moveTo(this.X(x), this.Y(y)))); g.closePath();
    WINDOW.forEach(([x, y], i) => (i ? g.lineTo(this.X(x), this.Y(y)) : g.moveTo(this.X(x), this.Y(y)))); g.closePath();
    g.clip('evenodd');
  }
  /** Desenha em coordenadas de MUNDO (x para a frente, y para cima). */
  w(fn) { const g = this.g; g.save(); g.translate(this.X(0), this.Y(0)); g.scale(this.flip ? -U : U, -U); fn(g); g.restore(); }
  /** Desenha em coordenadas locais (y para baixo; +x = para a frente da van) na posição (x, y) do mundo, escala s, giro rot. */
  at(x, y, s, rot, fn) {
    const g = this.g; g.save(); g.translate(this.X(x), this.Y(y)); g.rotate(this.flip ? -rot : rot); g.scale(this.flip ? -s * U : s * U, s * U); fn(g); g.restore();
  }
  j(n = 0.006) { return (this.r() - 0.5) * 2 * n; }
  /** Linha/curva suave à mão (pontos locais). */
  line(pts, { w = 0.02, color = INK, dash = null, close = false } = {}) {
    const g = this.g, p = pts.map(([x, y]) => [x + this.j(), y + this.j()]);
    g.save(); g.strokeStyle = color; g.lineWidth = w; if (dash) g.setLineDash(dash);
    g.beginPath(); g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length - 1; i++) g.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
    if (p.length > 1) g.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
    if (close) g.closePath(); g.stroke(); g.restore();
  }
  /** Polígono à mão: preenchimento levemente fora do contorno (como tinta fora da linha) + contorno tremido. */
  poly(pts, fill, { w = 0.02, color = INK, smooth = true } = {}) {
    const g = this.g, p = pts.map(([x, y]) => [x + this.j(0.005), y + this.j(0.005)]), n = p.length;
    const path = off => {
      g.beginPath();
      if (smooth) {
        g.moveTo((p[0][0] + p[n - 1][0]) / 2 + off, (p[0][1] + p[n - 1][1]) / 2 + off);
        for (let i = 0; i < n; i++) g.quadraticCurveTo(p[i][0] + off, p[i][1] + off, (p[i][0] + p[(i + 1) % n][0]) / 2 + off, (p[i][1] + p[(i + 1) % n][1]) / 2 + off);
      } else { g.moveTo(p[0][0] + off, p[0][1] + off); for (let i = 1; i < n; i++) g.lineTo(p[i][0] + off, p[i][1] + off); g.closePath(); }
    };
    if (fill) { g.save(); g.fillStyle = fill; path(0.012); g.fill(); g.restore(); }
    g.save(); g.strokeStyle = color; g.lineWidth = w; path(0); g.stroke(); g.restore();
  }
  circ(cx, cy, r, fill, o = {}) {
    const pts = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, rr = r * (1 + this.j(0.05)); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    this.poly(pts, fill, o);
  }
  rect(x, y, w, h, fill, o = {}) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, { smooth: false, ...o }); }
  /** Texto à mão no mundo (x, y), tamanho em unidades de mundo, sem espelhar. */
  text(str, x, y, size, { color = INK, rot = 0, bold = true, stroke = null, align = 'center' } = {}) {
    const g = this.g; g.save(); g.translate(this.X(x), this.Y(y)); g.rotate(this.flip ? -rot : rot);
    g.font = `${bold ? 'bold ' : ''}${size * U}px ${FONT}`; g.textAlign = align; g.textBaseline = 'middle';
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * U * 0.18; g.strokeText(str, 0, 0); }
    g.fillStyle = color; g.fillText(str, 0, 0); g.restore();
  }
  star(cx, cy, r, fill = C.yellow, o = {}) {
    const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
    this.poly(p, fill, { smooth: false, w: 0.014, ...o });
  }
  sparkle(cx, cy, r, color = C.yellow) { this.line([[cx - r, cy], [cx + r, cy]], { w: 0.014, color }); this.line([[cx, cy - r], [cx, cy + r]], { w: 0.014, color }); }
  /** Caixa de papelão (vista 3/4). open = com as abas abertas. */
  box(x, y, s, rot = 0, { open = false, color = C.brown, tape = C.cream } = {}) {
    this.at(x, y, s, rot, () => {
      this.poly([[-0.5, -0.1], [0.5, -0.1], [0.5, 0.5], [-0.5, 0.5]], color, { smooth: false, w: 0.045 });                       // frente
      this.poly([[0.5, -0.1], [0.78, -0.3], [0.78, 0.3], [0.5, 0.5]], '#a9774a', { smooth: false, w: 0.045 });                  // lado
      if (open) {
        this.poly([[-0.5, -0.1], [-0.38, -0.55], [0.4, -0.55], [0.5, -0.1]], '#2b1d14', { smooth: false, w: 0.04 });            // buraco escuro
        this.poly([[-0.5, -0.1], [-0.62, -0.4], [-0.38, -0.55], [-0.28, -0.1]], '#d9a46a', { smooth: false, w: 0.04 });         // abas
        this.poly([[0.5, -0.1], [0.78, -0.3], [0.9, -0.55], [0.6, -0.55]], '#d9a46a', { smooth: false, w: 0.04 });
      } else {
        this.poly([[-0.5, -0.1], [-0.22, -0.3], [0.78, -0.3], [0.5, -0.1]], '#d9a46a', { smooth: false, w: 0.045 });             // tampa
        this.line([[-0.05, -0.1], [0.25, -0.3]], { w: 0.1, color: tape }); this.line([[-0.05, -0.1], [-0.05, 0.5]], { w: 0.1, color: tape });
      }
    });
  }
  cloud(x, y, s, fill = C.white, o = {}) {
    this.at(x, y, s, 0, () => {
      const b = [[-0.5, 0.2], [-0.55, 0], [-0.35, -0.12], [-0.25, -0.3], [0, -0.35], [0.2, -0.22], [0.4, -0.25], [0.55, -0.05], [0.5, 0.2]];
      this.poly(b, fill, { w: 0.03, ...o });
    });
  }
  drop(x, y, s, fill = C.blue) { this.at(x, y, s, 0, () => this.poly([[0, -0.5], [0.3, 0.1], [0.2, 0.4], [0, 0.5], [-0.2, 0.4], [-0.3, 0.1]], fill, { w: 0.06 })); }
  pin(x, y, s, rot = 0) {
    this.at(x, y, s, rot, () => {
      this.g.save(); this.g.fillStyle = 'rgba(58,42,34,.25)'; this.g.beginPath(); this.g.ellipse(0.02, 0.62, 0.3, 0.1, 0, 0, 7); this.g.fill(); this.g.restore();
      this.poly([[0, 0.6], [-0.3, 0.05], [-0.36, -0.3], [-0.18, -0.58], [0.18, -0.58], [0.36, -0.3], [0.3, 0.05]], C.red, { w: 0.05 });
      this.circ(0, -0.28, 0.13, C.white, { w: 0.04 });
    });
  }
  crown(x, y, s, rot = 0, fill = C.gold) {
    this.at(x, y, s, rot, () => {
      this.poly([[-0.5, 0.3], [-0.55, -0.35], [-0.25, -0.05], [0, -0.45], [0.25, -0.05], [0.55, -0.35], [0.5, 0.3]], fill, { w: 0.05, smooth: false });
      this.line([[-0.5, 0.18], [0.5, 0.18]], { w: 0.04 });
      for (const px of [-0.55, 0, 0.55]) this.circ(px, px === 0 ? -0.5 : -0.4, 0.08, C.red, { w: 0.03 });
    });
  }
  umbrella(x, y, s, fill, rot = 0) {
    this.at(x, y, s, rot, () => {
      this.poly([[-0.55, 0], [-0.45, -0.3], [-0.2, -0.5], [0.2, -0.5], [0.45, -0.3], [0.55, 0], [0.3, -0.1], [0, 0], [-0.3, -0.1]], fill, { w: 0.05 });
      this.line([[0, 0], [0, 0.5], [0.12, 0.6]], { w: 0.05 });
    });
  }
  parachute(x, y, s, fill, boxRot = 0) {
    this.at(x, y, s, 0, () => {
      this.poly([[-0.5, 0], [-0.45, -0.3], [-0.2, -0.5], [0.2, -0.5], [0.45, -0.3], [0.5, 0], [0.25, -0.08], [0, 0], [-0.25, -0.08]], fill, { w: 0.04 });
      this.line([[-0.5, 0], [-0.12, 0.5]], { w: 0.02 }); this.line([[0, 0], [0, 0.5]], { w: 0.02 }); this.line([[0.5, 0], [0.12, 0.5]], { w: 0.02 });
    });
    this.box(x, y - 0.5 * s - 0.12 * s, s * 0.3, boxRot);
  }
  ghost(x, y, s, rot = 0) {
    this.at(x, y, s, rot, () => {
      this.poly([[-0.4, 0.5], [-0.45, -0.1], [-0.3, -0.45], [0, -0.55], [0.3, -0.45], [0.45, -0.1], [0.4, 0.5], [0.25, 0.38], [0.1, 0.5], [-0.05, 0.38], [-0.2, 0.5]], 'rgba(255,255,255,.96)', { w: 0.04 });
      this.circ(-0.14, -0.15, 0.07, INK, { w: 0.01 }); this.circ(0.12, -0.15, 0.07, INK, { w: 0.01 });
      this.circ(-0.26, 0.0, 0.06, 'rgba(244,156,187,.8)', { w: 0.005 }); this.circ(0.26, 0.0, 0.06, 'rgba(244,156,187,.8)', { w: 0.005 });
      this.line([[-0.08, 0.05], [0, 0.1], [0.08, 0.05]], { w: 0.025 });
    });
  }
  flame(x, y, s, rot = 0, scale = [1, 1]) {
    this.at(x, y, s, rot, () => {
      this.g.scale(scale[0], scale[1]);
      this.poly([[0.5, 0.3], [0.2, 0.4], [-0.3, 0.3], [-0.9, 0.05], [-0.35, 0.0], [-0.6, -0.35], [-0.1, -0.15], [0.1, -0.5], [0.3, -0.1], [0.5, 0.0]], C.red, { w: 0.05 });
      this.poly([[0.35, 0.28], [0.0, 0.33], [-0.45, 0.2], [-0.2, 0.0], [-0.35, -0.2], [0.05, -0.05], [0.2, 0.05]], C.orange, { w: 0.03 });
      this.poly([[0.2, 0.25], [-0.15, 0.25], [-0.05, 0.08], [0.15, 0.1]], C.yellow, { w: 0.02 });
    });
  }
  planet(x, y, s, fill, ring = true) {
    this.at(x, y, s, -0.3, () => {
      if (ring) { this.g.save(); this.g.strokeStyle = INK; this.g.lineWidth = 0.07; this.g.beginPath(); this.g.ellipse(0, 0, 0.78, 0.2, 0, Math.PI, Math.PI * 2); this.g.stroke(); this.g.restore(); }
      this.circ(0, 0, 0.45, fill, { w: 0.05 });
      this.line([[-0.3, -0.12], [0.0, -0.2], [0.3, -0.1]], { w: 0.025, color: 'rgba(58,42,34,.45)' }); this.line([[-0.35, 0.12], [0, 0.04], [0.32, 0.14]], { w: 0.025, color: 'rgba(58,42,34,.45)' });
      if (ring) { this.g.save(); this.g.strokeStyle = INK; this.g.lineWidth = 0.07; this.g.beginPath(); this.g.ellipse(0, 0, 0.78, 0.2, 0, 0, Math.PI); this.g.stroke(); this.g.strokeStyle = C.yellow; this.g.lineWidth = 0.035; this.g.beginPath(); this.g.ellipse(0, 0, 0.78, 0.2, 0, 0, Math.PI); this.g.stroke(); this.g.restore(); }
    });
  }
  /** Tentáculo saindo de (x0, y0) para cima, com ventosas e uma caixinha na ponta. */
  tentacle(x0, y0, len, sway, fill, boxRot = 0) {
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([x0 + Math.sin(t * 5 + sway) * 0.1 * (0.4 + t) + sway * 0.05 * t, y0 + t * len]); }
    const L = [], R = [];
    pts.forEach(([px, py], i) => { const w = 0.11 * (1 - i / 9) + 0.02; L.push([px - w, py]); R.unshift([px + w, py]); });
    this.w(() => {                                                          // coordenadas de mundo (y para cima)
      this.poly([...L, ...R], fill, { w: 0.018 });
      pts.forEach(([px, py], i) => { if (i > 0 && i < 8) this.circ(px + (i % 2 ? 0.02 : -0.02), py, 0.011 * (1 - i / 10) + 0.004, 'rgba(255,255,255,.9)', { w: 0.004, color: 'rgba(58,42,34,.5)' }); });
    });
    const tip = pts[8]; this.box(tip[0], tip[1] + 0.12, 0.27, boxRot);
  }
  /** Selo de correio com desenho simples. */
  stamp(x, y, s, rot, color, glyph) {
    this.at(x, y, s, rot, () => {
      this.rect(-0.45, -0.55, 0.9, 1.1, '#fffaf0', { w: 0.03 });
      for (let i = -4; i <= 4; i++) { this.circ(i * 0.1, -0.55, 0.035, '#fff', { w: 0.005 }); this.circ(i * 0.1, 0.55, 0.035, '#fff', { w: 0.005 }); }
      this.rect(-0.34, -0.42, 0.68, 0.84, color, { w: 0.025 });
      if (glyph === 'house') { this.poly([[-0.2, 0.0], [0, -0.22], [0.2, 0.0], [0.2, 0.22], [-0.2, 0.22]], C.cream, { w: 0.02, smooth: false }); }
      else if (glyph === 'star') this.star(0, 0, 0.2, C.yellow);
      else if (glyph === 'van') { this.rect(-0.22, -0.08, 0.44, 0.22, C.cream, { w: 0.02 }); this.circ(-0.12, 0.16, 0.05, INK, { w: 0.01 }); this.circ(0.12, 0.16, 0.05, INK, { w: 0.01 }); }
      else this.circ(0, 0, 0.16, C.cream, { w: 0.02 });
    });
  }
  barcode(x, y, s, rot) {
    this.at(x, y, s, rot, () => {
      this.rect(-0.55, -0.3, 1.1, 0.6, '#fffaf0', { w: 0.02 });
      for (let i = 0; i < 14; i++) { const w = 0.025 + this.r() * 0.04; this.g.fillStyle = INK; this.g.fillRect(-0.45 + i * 0.065, -0.2, w, 0.34); }
    });
  }
  /** Carimbo redondo de postagem com ondas. */
  postmark(x, y, s, rot, txt, color = '#5a3a8a') {
    this.at(x, y, s, rot, () => {
      this.g.save(); this.g.globalAlpha = 0.85;
      this.circ(0, 0, 0.5, null, { w: 0.04, color }); this.circ(0, 0, 0.36, null, { w: 0.02, color });
      this.line([[0.55, -0.12], [0.85, -0.2], [1.1, -0.1], [1.35, -0.2]], { w: 0.04, color }); this.line([[0.55, 0.05], [0.85, -0.03], [1.1, 0.07], [1.35, -0.03]], { w: 0.04, color }); this.line([[0.55, 0.22], [0.85, 0.14], [1.1, 0.24], [1.35, 0.14]], { w: 0.04, color });
      this.g.restore();
    });
    this.text(txt, x, y, s * 0.2, { color, rot });
  }
}


// ------------------------------------------------------------------ zonas livres da lateral (fora do logotipo ADRESS e da janela)
const LOW = { x0: -2.3, x1: 2.3, y0: 0.5, y1: 1.0 };          // faixa de baixo, de ponta a ponta
const UP = { x0: -2.3, x1: 0.42, y0: 1.84, y1: 2.1 };         // faixa acima do logotipo
const DOOR = { x0: 0.58, x1: 2.28, y0: 0.76, y1: 1.4 };       // porta/capô, abaixo da janela
const inWheel = (x, y) => Math.hypot(x - 1.5, y - 0.44) < 0.5 || Math.hypot(x + 1.45, y - 0.44) < 0.5;
/** Sorteia n pontos nas zonas, longe das rodas e uns dos outros; chama fn(x, y, i). */
function scatter(p, zones, n, fn, minD = 0.3, wheels = true) {
  const pts = []; let tries = 0;
  while (pts.length < n && tries++ < 400) {
    const z = zones[Math.floor(p.r() * zones.length)], x = p.rand(z.x0, z.x1), y = p.rand(z.y0, z.y1);
    if (wheels && inWheel(x, y)) continue;
    if (pts.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.3) < minD)) continue;
    pts.push([x, y]);
  }
  pts.forEach(([x, y], i) => fn(x, y, i));
}
const pick = (p, a) => a[Math.floor(p.r() * a.length)];

/** Etiqueta/adesivo de embalagem (Frágil, Este lado para cima, Manter seco). */
function sticker(p, x, y, rot, kind, sc = 1) {
  p.at(x, y, sc, rot, () => {
    const col = kind === 'frag' ? C.red : kind === 'up' ? C.blue : C.green;
    p.poly([[-0.34, -0.17], [0.34, -0.17], [0.34, 0.17], [-0.34, 0.17]], C.white, { w: 0.022, smooth: false });
    p.poly([[-0.31, -0.14], [0.31, -0.14], [0.31, 0.14], [-0.31, 0.14]], null, { w: 0.01, color: col, smooth: false });
    p.rect(-0.31, -0.14, 0.2, 0.28, col, { w: 0.012, color: col });
    if (kind === 'frag') {                                            // taça trincada
      p.poly([[-0.265, -0.1], [-0.155, -0.1], [-0.19, -0.01], [-0.23, -0.01]], C.white, { w: 0.012 });
      p.line([[-0.21, -0.01], [-0.21, 0.07]], { w: 0.012, color: C.white }); p.line([[-0.25, 0.08], [-0.17, 0.08]], { w: 0.014, color: C.white });
      p.line([[-0.22, -0.1], [-0.2, -0.06], [-0.22, -0.04]], { w: 0.008, color: col });
    } else if (kind === 'up') {                                       // duas setas para cima sobre uma base
      for (const ax of [-0.24, -0.17]) { p.line([[ax, 0.06], [ax, -0.08]], { w: 0.014, color: C.white }); p.line([[ax - 0.03, -0.05], [ax, -0.09], [ax + 0.03, -0.05]], { w: 0.014, color: C.white }); }
      p.line([[-0.28, 0.1], [-0.13, 0.1]], { w: 0.014, color: C.white });
    } else {                                                          // guarda-chuva com gotas
      p.poly([[-0.275, -0.02], [-0.25, -0.1], [-0.18, -0.1], [-0.15, -0.02], [-0.18, -0.04], [-0.21, -0.02], [-0.245, -0.04]], C.white, { w: 0.01 });
      p.line([[-0.213, -0.02], [-0.213, 0.07]], { w: 0.012, color: C.white }); p.circ(-0.26, 0.09, 0.012, C.white, { w: 0.003 }); p.circ(-0.16, 0.08, 0.012, C.white, { w: 0.003 });
    }
  });
  const label = kind === 'frag' ? 'FRÁGIL' : kind === 'up' ? 'ESTE LADO ↑' : 'MANTER SECO';
  p.text(label, x + (p.flip ? -0.08 : 0.08) * sc, y, 0.05 * sc, { color: INK, rot });
}

// ------------------------------------------------------------------ as estampas
export const DECALS = [
  { name: 'Sem estampa', desc: 'A van limpa, só com o logotipo ADRESS.', draw: null },

  { name: 'Rota pontilhada', desc: 'Um caminho tracejado pelas laterais, terminando em um marcador de localização.',
    draw(p) {
      if (p.side > 0) {                                                  // direito: sai da traseira pela faixa de baixo, sobe pela porta e termina no marcador
        const pts = [[-2.25, 0.62], [-1.7, 0.86], [-1.0, 0.64], [-0.3, 0.88], [0.4, 0.66], [1.0, 0.84], [1.7, 0.7], [2.05, 0.95], [1.85, 1.1], [2.0, 1.15]];
        p.w(() => p.line(pts, { w: 0.05, color: C.red, dash: [0.09, 0.07] }));
        p.w(() => p.circ(-2.25, 0.62, 0.07, C.white, { w: 0.025 })); p.pin(1.9, 1.12, 0.3);
        p.w(() => p.star(-0.6, 0.98, 0.04, C.yellow));
      } else {                                                           // esquerdo: zigue-zague pela frente, com uma laçada, até o marcador na traseira
        const pts = [[2.2, 0.75], [1.7, 0.94], [1.2, 0.62], [0.6, 0.85], [0.1, 0.6], [-0.5, 0.82], [-1.1, 0.6], [-1.6, 0.88], [-2.0, 0.7]];
        p.w(() => p.line(pts, { w: 0.05, color: C.blue, dash: [0.07, 0.08] }));
        p.w(() => p.circ(2.2, 0.75, 0.07, C.white, { w: 0.025 })); p.pin(-2.05, 0.95, 0.3, 0.15);
        p.w(() => { p.star(-0.9, 1.0, 0.04, C.yellow); p.star(0.9, 1.0, 0.035, C.yellow); }); p.text('x', 0.7, 1.1, 0.1, { color: C.red });
      }
    } },

  { name: 'Mapa do bairro', desc: 'Ruas e quarteirões desenhados como um mapa, contornando “ADRESS”.',
    draw(p) {
      for (const z of [LOW, UP, DOOR]) {
        p.w(() => p.rect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0, '#e6e9ee', { w: 0.016 }));                              // "papel" do mapa com as ruas
        const blocks = p.side > 0 ? [0.5, 0.35, 0.6, 0.4] : [0.4, 0.55, 0.3, 0.5, 0.35];
        let x = z.x0 + 0.05, i = 0;
        const rows = z.y1 - z.y0 > 0.4 ? 2 : 1, bh = (z.y1 - z.y0 - 0.05 * (rows + 1)) / rows;
        while (x < z.x1 - 0.2) {
          const bw = Math.min(blocks[i++ % blocks.length] * p.rand(0.8, 1.2), z.x1 - 0.04 - x);
          for (let r = 0; r < rows; r++) {
            const y = z.y0 + 0.05 + r * (bh + 0.05), fill = pick(p, ['#bfe3a5', '#f4e3b8', '#f7d9b8', '#bfe3a5', '#a9d9f0']);
            p.w(() => { p.rect(x, y, bw, bh, fill, { w: 0.01 }); if (fill === '#bfe3a5') { p.circ(x + bw * 0.3, y + bh * 0.5, 0.025, '#5fae56', { w: 0.006 }); p.circ(x + bw * 0.65, y + bh * 0.4, 0.02, '#5fae56', { w: 0.006 }); } else if (fill !== '#a9d9f0') p.rect(x + bw * 0.35, y + bh * 0.3, Math.min(0.08, bw * 0.3), Math.min(0.06, bh * 0.4), '#fffaf0', { w: 0.006 }); });
          }
          x += bw + 0.05;
        }
      }
      p.w(() => p.star(1.95, 1.22, 0.07, C.red, { w: 0.012 }));                                                      // rosa dos ventos
      p.text('N', 1.95, 1.34, 0.07, { color: INK });
      p.pin(p.side > 0 ? 1.0 : 1.6, 1.1, 0.12);
    } },

  { name: 'Etiquetas postais', desc: 'Selos, códigos de barras e carimbos espalhados pela lataria.',
    draw(p) {
      const glyphs = ['house', 'star', 'van', 'circle'], cols = [C.blue, C.pink, C.green, C.purple, C.orange, C.yellow];
      scatter(p, [LOW, UP, DOOR, LOW], 12, (x, y, i) => {
        const k = i % 4, rot = p.rand(-0.4, 0.4);
        if (k === 0) p.stamp(x, y, 0.27, rot, pick(p, cols), pick(p, glyphs));
        else if (k === 1) p.barcode(x, y, 0.27, rot);
        else if (k === 2) p.postmark(x, y, 0.26, rot, pick(p, ['ADRESS', 'CORREIO', 'ENTREGA']));
        else { p.at(x, y, 0.26, rot, () => { p.poly([[-0.55, -0.2], [0.55, -0.2], [0.55, 0.2], [-0.55, 0.2]], C.white, { w: 0.03, smooth: false }); for (let b = -0.5; b < 0.5; b += 0.2) p.line([[b, -0.2], [b + 0.12, 0.2]], { w: 0.07, color: b % 0.4 < 0.1 ? C.red : C.blue }); }); p.text('AIR MAIL', x, y, 0.06, { color: INK, rot }); }
      }, 0.4);
    } },

  { name: 'Símbolos de embalagem', desc: '“Frágil”, “Este lado para cima” e “Manter seco”, com seus respectivos ícones.',
    draw(p) {
      if (p.side > 0) { sticker(p, -1.75, 1.95, 0.04, 'frag', 0.72); sticker(p, -0.85, 1.95, -0.03, 'up', 0.72); sticker(p, 1.45, 1.1, 0.06, 'dry', 1.25); sticker(p, -0.5, 0.76, -0.04, 'frag', 1.15); sticker(p, 0.5, 0.76, 0.04, 'up', 1.15); }
      else { sticker(p, -0.55, 0.76, -0.04, 'dry', 1.15); sticker(p, 0.35, 0.76, 0.05, 'frag', 1.15); sticker(p, 1.5, 1.12, -0.05, 'up', 1.25); sticker(p, -1.7, 1.95, 0.03, 'dry', 0.72); sticker(p, -0.8, 1.95, -0.04, 'frag', 0.72); }
    } },

  { name: 'Caixinhas desenhadas', desc: 'Pequenas caixas abertas e fechadas formando uma estampa.',
    draw(p) {
      scatter(p, [LOW, UP, DOOR, LOW, DOOR], 10, (x, y, i) => {
        const open = i % 3 === 0, s = p.rand(0.28, 0.38), rot = p.rand(-0.35, 0.35);
        p.box(x, y, s, rot, { open, color: pick(p, [C.brown, '#d9a066', '#b98150']) });
        if (open) { p.w(() => { p.star(x + 0.02, y + s * 0.62, 0.05, C.yellow, { w: 0.012 }); p.sparkle(x - 0.1, y + s * 0.7, 0.04, C.orange); }); }
      }, 0.46);
      scatter(p, [LOW, UP, DOOR], 5, (x, y) => p.w(() => p.sparkle(x, y, 0.04, C.yellow)), 0.3);
    } },

  { name: 'Quadrinhos', desc: 'Desenhos de pacotes com efeitos como “VROOM!” e “BONK!”.',
    draw(p) {
      const burst = (x, y, r, fill, txt, rot) => {
        const pts = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, rr = i % 2 ? r * 0.68 : r * (0.95 + p.j(0.08)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]); }
        p.w(() => p.poly(pts, fill, { w: 0.02, smooth: false })); p.text(txt, x, y, r * 0.5, { color: INK, rot, stroke: '#fffaf0' });
      };
      const speed = (x, y, len) => p.w(() => { for (let k = 0; k < 3; k++) p.line([[x, y + k * 0.05], [x - len, y + k * 0.05]], { w: 0.014 }); });
      if (p.side > 0) {
        burst(-1.0, 0.77, 0.36, C.yellow, 'VROOM!', 0.05); speed(-1.35, 0.55, 0.3); burst(1.38, 1.12, 0.4, C.red, 'BONK!', -0.1);
        p.box(0.4, 0.8, 0.28, 0.3); p.box(1.15, 0.82, 0.24, -0.4, { open: true }); p.w(() => p.star(-1.9, 2.0, 0.07, C.yellow)); p.text('POW', -1.0, 1.96, 0.13, { color: C.blue, stroke: INK });
      } else {
        burst(-0.1, 0.77, 0.36, C.red, 'BONK!', -0.08); burst(1.55, 1.1, 0.4, C.yellow, 'VROOM!', 0.08); burst(-1.6, 1.96, 0.17, C.blue, 'ZIP!', 0.05);
        p.box(-1.2, 0.8, 0.2, -0.3, { open: true }); p.box(0.9, 0.9, 0.18, 0.35); speed(1.2, 0.58, 0.28);
      }
      scatter(p, [LOW, DOOR], 8, (x, y) => p.w(() => p.circ(x, y, 0.012, 'rgba(58,42,34,.45)', { w: 0.002 })), 0.1);                  // pontinhos de retícula
    } },

  { name: 'Rabiscos do motorista', desc: 'Desenhos simples de casas, café, caixas e carinhas.',
    draw(p) {
      const pen = '#2b4a9a', o = { w: 0.014, color: pen };
      const doodles = {
        house: () => { p.line([[-0.2, 0.1], [-0.2, -0.1], [0, -0.28], [0.2, -0.1], [0.2, 0.1], [-0.2, 0.1]], o); p.line([[-0.05, 0.1], [-0.05, -0.02], [0.06, -0.02], [0.06, 0.1]], o); p.line([[0.1, -0.1], [0.16, -0.1], [0.16, -0.02], [0.1, -0.02], [0.1, -0.1]], o); },
        cup: () => { p.line([[-0.15, -0.1], [-0.12, 0.12], [0.1, 0.12], [0.13, -0.1], [-0.15, -0.1]], o); p.line([[0.13, -0.05], [0.24, -0.04], [0.24, 0.05], [0.12, 0.06]], o); p.line([[-0.05, -0.16], [-0.02, -0.22], [-0.06, -0.28]], o); p.line([[0.04, -0.16], [0.07, -0.22], [0.03, -0.28]], o); },
        box: () => { p.line([[-0.18, -0.05], [0.12, -0.05], [0.12, 0.17], [-0.18, 0.17], [-0.18, -0.05]], o); p.line([[-0.18, -0.05], [-0.08, -0.17], [0.22, -0.17], [0.12, -0.05]], o); p.line([[0.22, -0.17], [0.22, 0.05], [0.12, 0.17]], o); p.line([[-0.03, -0.05], [-0.03, 0.17]], o); },
        face: () => { p.circ(0, 0, 0.17, null, o); p.circ(-0.06, -0.04, 0.012, pen, o); p.circ(0.06, -0.04, 0.012, pen, o); p.line([[-0.08, 0.05], [0, 0.1], [0.08, 0.05]], o); },
        heart: () => p.line([[0, 0.14], [-0.17, -0.02], [-0.1, -0.15], [0, -0.07], [0.1, -0.15], [0.17, -0.02], [0, 0.14]], o),
        star: () => p.line([[0, -0.17], [0.05, -0.05], [0.17, -0.05], [0.07, 0.03], [0.11, 0.16], [0, 0.08], [-0.11, 0.16], [-0.07, 0.03], [-0.17, -0.05], [-0.05, -0.05], [0, -0.17]], o),
        arrow: () => { p.line([[-0.2, 0.08], [-0.05, -0.1], [0.1, 0.02], [0.2, -0.1]], o); p.line([[0.1, -0.12], [0.2, -0.1], [0.18, 0.0]], o); },
        van: () => { p.line([[-0.22, 0.08], [-0.22, -0.08], [0.08, -0.08], [0.2, 0.0], [0.22, 0.08], [-0.22, 0.08]], o); p.circ(-0.12, 0.1, 0.04, null, o); p.circ(0.12, 0.1, 0.04, null, o); },
      };
      const names = Object.keys(doodles);
      scatter(p, [LOW, UP, DOOR, LOW], 10, (x, y, i) => { const k = names[(i + (p.side > 0 ? 0 : 3)) % names.length]; p.at(x, y, 1.4, p.rand(-0.25, 0.25), doodles[k]); }, 0.42);
    } },

  { name: 'Marcas de pneu', desc: 'Rastros diagonais concentrados na parte inferior.',
    draw(p) {
      const track = (x0, y0, x1, y1, off) => {
        const n = 34, col = 'rgba(48,46,52,.88)';
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * 6 + off) * 0.03;
          p.w(() => { p.line([[x - 0.05, y - 0.03], [x, y + 0.02], [x + 0.05, y - 0.03]], { w: 0.022, color: col }); p.line([[x - 0.07, y + 0.1], [x - 0.02, y + 0.15], [x + 0.03, y + 0.1]], { w: 0.022, color: col }); });
        }
      };
      if (p.side > 0) { track(-2.25, 0.52, 2.2, 0.82, 0); }
      else { track(-2.2, 0.8, 2.2, 0.5, 1.5); track(-2.2, 0.55, 0.3, 0.85, 3); }
      scatter(p, [LOW], 9, (x, y) => p.w(() => p.circ(x, y, p.rand(0.012, 0.03), 'rgba(110,86,60,.6)', { w: 0.003, color: 'rgba(80,60,40,.5)' })), 0.15);
    } },

  { name: 'Chamas', desc: 'Labaredas saindo próximas das rodas dianteiras e seguindo pela parte inferior das laterais.',
    draw(p) {
      const big = p.side > 0 ? [[1.95, 0.7, 0.55, 1.2], [1.45, 0.8, 0.6, 1.4], [0.9, 0.7, 0.5, 1.1]] : [[2.05, 0.72, 0.5, 1.1], [1.55, 0.86, 0.65, 1.5], [0.95, 0.74, 0.5, 1.2]];
      big.forEach(([x, y, s, k], i) => p.flame(x, y, s * 1.25, -0.15 + i * 0.08, [1, k * 0.8]));
      let x = 0.4, s = 0.55;
      while (x > -2.2) { p.flame(x, 0.66 + p.rand(-0.03, 0.05), s, p.rand(-0.1, 0.12), [1, p.rand(0.8, 1.3)]); x -= s * p.rand(0.9, 1.15); s = Math.max(0.26, s * 0.92); }
      scatter(p, [LOW], 5, (x, y) => p.w(() => p.sparkle(x, y + 0.05, 0.035, C.orange)), 0.3);
    } },

  { name: 'Faixa xadrez', desc: 'Uma faixa quadriculada junto à parte inferior da van. As duas cores podem ser escolhidas.',
    draw(p) {
      const sq = 0.11, cols = Math.ceil(4.6 / sq);
      p.w(() => {
        for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
          const x = -2.3 + c * sq, y = 0.47 + r * sq;
          p.rect(x, y, sq, sq, (c + r) % 2 ? check.a : check.b, { w: 0.007, color: 'rgba(58,42,34,.75)' });
        }
        p.line([[-2.3, 0.69], [2.3, 0.69]], { w: 0.012 });
      });
    } },

  { name: 'Montanhas e estrada', desc: 'Uma paisagem contínua na parte de baixo das laterais.',
    draw(p) {
      const far = [], near = [];
      for (let x = -2.4; x <= 2.41; x += 0.1) {
        far.push([x, 0.62 + 0.36 * Math.abs(Math.sin(x * (p.side > 0 ? 1.1 : 0.9) + 0.6)) + 0.1 * Math.sin(x * 3.1) + (x > 0.5 ? 0.12 : 0)]);
        near.push([x, 0.56 + 0.1 * Math.sin(x * 2.3 + (p.side > 0 ? 0 : 2)) + 0.05 * Math.sin(x * 5)]);
      }
      p.w(() => {
        p.poly([[-2.4, 0.47], ...far, [2.4, 0.47]], '#9bb4d8', { w: 0.018, smooth: false });
        for (let i = 2; i < far.length - 2; i++) if (far[i][1] > far[i - 1][1] && far[i][1] > far[i + 1][1] && far[i][1] > 0.92) p.poly([[far[i][0] - 0.1, far[i][1] - 0.1], [far[i][0], far[i][1]], [far[i][0] + 0.1, far[i][1] - 0.1], [far[i][0] + 0.04, far[i][1] - 0.07], [far[i][0], far[i][1] - 0.12], [far[i][0] - 0.05, far[i][1] - 0.07]], C.white, { w: 0.008, smooth: false });
        p.poly([[-2.4, 0.47], ...near, [2.4, 0.47]], '#8fcf7a', { w: 0.018, smooth: false });
        const road = [], road2 = [];
        for (let x = -2.4; x <= 2.41; x += 0.1) { const y = 0.55 + 0.05 * Math.sin(x * 2 + 1); road.push([x, y + 0.08]); road2.unshift([x, y - 0.08]); }
        p.poly([...road, ...road2].map(([x, y]) => [x, Math.max(0.48, y)]), '#6f737c', { w: 0.014, smooth: false });
        p.line(road.map(([x, y]) => [x, y - 0.08]), { w: 0.014, color: C.yellow, dash: [0.07, 0.06] });
        scatter(p, [{ x0: -2.2, x1: 2.2, y0: 0.7, y1: 0.9 }], 7, (x, y) => { p.line([[x, y - 0.05], [x, y]], { w: 0.014, color: '#7a4a2a' }); p.poly([[x - 0.05, y], [x, y + 0.12], [x + 0.05, y]], '#4fa34a', { w: 0.01, smooth: false }); }, 0.3, false);
        p.circ(p.side > 0 ? 2.0 : -2.0, 1.0, 0.06, C.yellow, { w: 0.015 });
      });
    } },

  { name: 'Entrega na chuva', desc: 'Nuvens, gotas e pequenos guarda-chuvas.',
    draw(p) {
      const cl = [[-1.9, 1.97], [-0.9, 1.95], [-0.15, 2.0]].map(([x, y]) => [x + p.rand(-0.15, 0.15), y]);
      cl.forEach(([x, y]) => { p.cloud(x, y, 0.38, '#dfe6ee'); scatter(p, [{ x0: x - 0.18, x1: x + 0.18, y0: 1.8, y1: 1.88 }], 3, (a, b) => p.drop(a, b, 0.09), 0.09, false); });
      p.cloud(1.2 + p.rand(-0.1, 0.1), 1.3, 0.34, '#dfe6ee');
      scatter(p, [DOOR], 4, (x, y) => p.drop(x, y, 0.1), 0.22);
      scatter(p, [LOW, DOOR, LOW], 4, (x, y) => p.umbrella(x, y + 0.04, 0.34, pick(p, [C.red, C.yellow, C.pink, C.blue, C.purple]), p.rand(-0.2, 0.2)), 0.5);
      scatter(p, [LOW], 4, x => { p.at(x, 0.52, 1, 0, () => { p.g.save(); p.g.fillStyle = 'rgba(110,190,235,.8)'; p.g.strokeStyle = INK; p.g.lineWidth = 0.012; p.g.beginPath(); p.g.ellipse(0, 0, 0.2, 0.05, 0, 0, 7); p.g.fill(); p.g.stroke(); p.g.restore(); }); }, 0.5);
    } },

  { name: 'Encomenda aérea', desc: 'Pequenos paraquedas carregando caixas.',
    draw(p) {
      const cols = [C.red, C.yellow, C.blue, C.green, C.pink, C.purple, C.orange];
      scatter(p, [LOW, UP, DOOR, DOOR, LOW], 6, (x, y, i) => p.parachute(x, y + 0.14, p.rand(0.42, 0.55), cols[(i + (p.side > 0 ? 0 : 3)) % cols.length], p.rand(-0.3, 0.3)), 0.5);
      scatter(p, [UP, DOOR], 3, (x, y) => p.cloud(x, y, 0.2, '#eef3f8'), 0.4, false);
    } },

  { name: 'Asas de entrega', desc: 'Asas desenhadas nas laterais, uma de cada lado de “ADRESS”.',
    draw(p) {
      const wing = (x, y, dir, s) => {                                    // dir = +1: aponta para a frente da van; −1: para trás
        for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 6; i++) {
          const ang = (-0.55 + i * 0.28) * (layer ? 0.9 : 1), len = (layer ? 0.55 : 0.85) * s * (1 - i * 0.03), wd = 0.09 * s * (layer ? 0.8 : 1);
          p.w(() => {
            const ax = x + dir * 0.02, ay = y;
            const ux = dir * Math.cos(ang), uy = Math.sin(ang), nx = -uy * dir, ny = ux * dir;
            p.poly([[ax, ay], [ax + ux * len * 0.5 + nx * wd, ay + uy * len * 0.5 + ny * wd], [ax + ux * len, ay + uy * len], [ax + ux * len * 0.5 - nx * wd, ay + uy * len * 0.5 - ny * wd]], layer ? '#ffffff' : '#e8f0f8', { w: 0.014 });
          });
        }
        p.w(() => p.star(x + dir * 0.05, y, 0.06, C.gold, { w: 0.012 }));
      };
      wing(0.42, 1.27, 1, 1.45); wing(-1.5, 1.27, -1, 1.2);
    } },

  { name: 'Encomendas espaciais', desc: 'Pequenas caixas orbitando planetas, com estrelas ao redor.',
    draw(p) {
      const planets = p.side > 0 ? [[-1.65, 0.8, 0.52, C.purple, true], [-0.2, 0.76, 0.4, C.blue, false], [1.3, 1.1, 0.55, C.orange, true]] : [[-0.9, 0.78, 0.5, C.pink, true], [0.55, 0.82, 0.4, C.green, false], [1.8, 1.08, 0.46, C.blue, true], [-1.8, 1.96, 0.22, C.yellow, false]];
      planets.forEach(([x, y, s, c, ring], i) => {
        p.at(x, y, 1, 0, () => { p.g.save(); p.g.strokeStyle = 'rgba(58,42,34,.55)'; p.g.lineWidth = 0.012; p.g.setLineDash([0.04, 0.03]); p.g.beginPath(); p.g.ellipse(0, 0, s * 0.95, s * 0.5, -0.3, 0, 7); p.g.stroke(); p.g.restore(); });
        p.planet(x, y, s * 0.8, c, ring);
        const a = (i * 2.1 + 0.8) * (p.side > 0 ? 1 : -1); p.box(x + Math.cos(a) * s * 0.95, y - Math.sin(a) * s * 0.5, 0.15, a);
      });
      scatter(p, [LOW, UP, DOOR], 12, (x, y, i) => { p.w(() => { if (i % 3 === 0) p.star(x, y, 0.045, C.yellow, { w: 0.01 }); else p.sparkle(x, y, 0.035, i % 2 ? C.yellow : C.orange); }); }, 0.2);
    } },

  { name: 'Entrega fantasma', desc: 'Silhuetas de fantasminhas carregando pacotes.',
    draw(p) {
      scatter(p, [LOW, UP, DOOR, DOOR, LOW], 5, (x, y, i) => {
        const s = p.rand(0.42, 0.55), r = p.rand(-0.15, 0.15), d = p.side > 0 ? 1 : -1;
        p.ghost(x, y, s, r);
        p.box(x + d * 0.17 * s * 1.2, y - 0.12 * s, s * 0.34, r + 0.2, { open: i % 2 === 0 });
        p.w(() => p.line([[x + d * 0.08, y - 0.02], [x + d * 0.17 * s * 1.5, y - 0.1 * s]], { w: 0.014 }));
      }, 0.65);
      scatter(p, [LOW, UP, DOOR], 5, (x, y) => p.w(() => p.sparkle(x, y, 0.04, C.purple)), 0.25);
    } },

  { name: 'Tentáculos', desc: 'Braços de polvo saindo da parte inferior segurando pequenos pacotes.',
    draw(p) {
      const xs = p.side > 0 ? [-1.9, -1.0, -0.2, 0.75, 1.95] : [-2.1, -1.2, -0.45, 0.6, 1.3];
      const cols = [C.purple, C.pink, '#7fd1c4', C.purple, C.pink];
      xs.forEach((x, i) => p.tentacle(x, 0.47, p.rand(0.4, 0.8) + (i === 4 ? 0.3 : 0), p.rand(-1, 1) * (p.side > 0 ? 1 : -1) * 1.5, cols[(i + (p.side > 0 ? 0 : 2)) % cols.length], p.rand(-0.4, 0.4)));
    } },

  { name: 'Entrega real', desc: 'Coroas, arabescos dourados e pequenos selos de cera.',
    draw(p) {
      const swirl = (x, y, s, rot) => p.at(x, y, s, rot, () => {
        const pts = []; for (let i = 0; i < 26; i++) { const a = i * 0.35, r = 0.04 + i * 0.016; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        p.line(pts, { w: 0.05, color: INK }); p.line(pts, { w: 0.032, color: C.gold });
        p.line([[0.35, 0.1], [0.7, 0.0], [1.0, 0.12]], { w: 0.05, color: INK }); p.line([[0.35, 0.1], [0.7, 0.0], [1.0, 0.12]], { w: 0.032, color: C.gold });
      });
      const seal = (x, y, s) => p.at(x, y, s, 0, () => {
        p.circ(0, 0, 0.5, '#c63a3a', { w: 0.06 }); p.circ(0, 0, 0.32, null, { w: 0.035, color: '#8f2323' }); p.star(0, 0, 0.2, '#e98a8a', { w: 0.02, color: '#8f2323' });
        p.line([[0.2, 0.3], [0.45, 0.65], [0.3, 0.8]], { w: 0.1, color: '#c63a3a' }); p.line([[-0.1, 0.4], [-0.2, 0.75], [-0.4, 0.7]], { w: 0.1, color: '#a82f2f' });
      });
      if (p.side > 0) { p.crown(-1.9, 1.95, 0.26, -0.1); p.crown(1.3, 1.15, 0.36, 0.08); swirl(-1.4, 0.7, 0.4, 0); swirl(0.3, 0.86, 0.32, 3.4); seal(-0.5, 0.76, 0.26); seal(1.95, 0.9, 0.2); p.w(() => p.star(-0.9, 1.95, 0.05, C.gold, { w: 0.012 })); }
      else { p.crown(-1.2, 1.96, 0.24, 0.1); p.crown(-2.0, 0.78, 0.28, -0.15); p.crown(1.6, 1.2, 0.3, 0.12); swirl(-0.3, 0.7, 0.36, 3.3); swirl(1.0, 0.9, 0.3, 0.1); seal(0.35, 0.76, 0.24); seal(-0.7, 1.95, 0.17); }
    } },
];

// ------------------------------------------------------------------ texturas e miniaturas
/** Canvas transparente com a estampa `i` para o lado `side` (+1 direito, −1 esquerdo); null se for "Sem estampa". */
export function drawDecal(i, side) {
  const d = DECALS[i]; if (!d || !d.draw) return null;
  const p = new Pen(side, i + 1);
  p.g.save(); p.clipBody(); d.draw(p); p.g.restore();
  return p.c;
}
export const decalTexture = (i, side) => { const c = drawDecal(i, side); if (!c) return null; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

/** A lateral da van (silhueta, logotipo, rodas) com a estampa por cima — para miniaturas e para o item "sozinho". 1536 × 704. */
export function decalSheet(i, side, w = DECAL_W) {
  const c = document.createElement('canvas'); c.width = DECAL_W; c.height = Math.round(2.2 * U);
  const g = c.getContext('2d'), flip = side < 0, X = x => (flip ? 2.4 - x : x + 2.4) * U, Y = y => (2.2 - y) * U;
  const path = pts => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); };
  g.fillStyle = '#' + PAINT.color.getHexString(); path([[-2.4, 0.42], [2.4, 0.42], [2.4, 1.16], [2.2, 1.34], [1.55, 1.44], [0.85, 2.22], [-2.4, 2.22]]); g.fill();
  g.fillStyle = '#fff3dc'; path([[-2.3, 0.54], [2.2, 0.54], [2.2, 0.7], [-2.3, 0.7]]); g.fill();
  g.fillStyle = '#2b4a6e'; path([[0.55, 1.5], [1.42, 1.5], [0.95, 2.06], [0.55, 2.06]]); g.fill();
  g.fillStyle = '#fff3dc'; path([[-2.2, 1.06], [0.34, 1.06], [0.34, 1.78], [-2.2, 1.78]]); g.fill();
  g.fillStyle = '#e8661a'; g.font = `bold ${0.5 * U}px "Trebuchet MS",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ADRESS', X(-0.55), Y(1.42));
  const d = drawDecal(i, side); if (d) g.drawImage(d, 0, 0);
  for (const wx of [1.5, -1.45]) { g.fillStyle = '#1f2023'; g.beginPath(); g.arc(X(wx), Y(0.44), 0.44 * U, 0, 7); g.fill(); g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(X(wx), Y(0.44), 0.2 * U, 0, 7); g.fill(); }
  if (w === DECAL_W) return c;
  const o = document.createElement('canvas'); o.width = w; o.height = Math.round(w * c.height / c.width); o.getContext('2d').drawImage(c, 0, 0, o.width, o.height); return o;
}
