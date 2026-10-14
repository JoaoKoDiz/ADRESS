// Nível 21 (Operário): caminhões, vans e alguns carros rodando pela grade de ruas, sempre na faixa da direita (a LANE do eixo).
// A cada cruzamento o veículo escolhe a próxima rua (reto é mais provável; nunca volta pela mesma, a não ser sem saída) e faz a
// curva por um arco dentro do cruzamento, então nunca sai do asfalto nem atravessa lotes. Só entra no cruzamento com ele livre
// (reserva: um por vez) e com espaço na saída; se a saída escolhida ficar bloqueada, troca de saída. Freia diante da van, do
// motorista a pé e de outro veículo olhando o PRÓPRIO caminho à frente (inclusive dentro da curva). Ninguém trava de vez: esperando
// outro veículo além do limite, passa assim mesmo por um instante. São sólidos (SOLIDS) para a van e para quem anda.
import * as THREE from 'three';
import { SOLIDS, HEDGE } from './layout.js';
import { WORK } from './workPlan.js';
import { buildWorkVehicle } from './models/work.js';

const FLEET = [['truck', '#c8402f', 4.6], ['van', '#f4f1ea', 5.6], ['truck', '#2f6fb0', 4.6], ['van', '#2f6fb0', 5.6], ['flat', '#3f8a4a', 4.4], ['car', '#efbf2a', 6.2],
  ['van', '#e8b02a', 5.6], ['truck', '#3f8a4a', 4.6], ['van', '#d8473a', 5.6], ['flat', '#e8b02a', 4.4], ['car', '#3a78d4', 6.2], ['van', '#ffffff', 5.6], ['truck', '#8a55c4', 4.6]];
const ACC = 2.4, BRAKE = 6.5;

export function createWorkTraffic(audio) {
  const root = new THREE.Group(); root.name = 'workTraffic';
  let list = [], nodes = new Map();
  const hw = WORK.RW / 2, LANE = WORK.LANE;
  const right = u => ({ x: -u.z, z: u.x });                       // direita de quem anda (X leste, Z sul)
  /** Grafo das ruas: nós (cruzamentos) e arestas dirigidas; sem o trecho da entrada (fora do bairro). */
  function graph(V) {
    nodes = new Map();
    const nd = (p) => { const k = p[0] + ',' + p[1]; if (!nodes.has(k)) nodes.set(k, { k, x: p[0], z: p[1], out: [], occ: null }); return nodes.get(k); };
    for (const s of V.segs) {
      if (s.a[1] < HEDGE || s.b[1] < HEDGE) continue;
      const a = nd(s.a), b = nd(s.b), L = Math.hypot(b.x - a.x, b.z - a.z), u = { x: (b.x - a.x) / L, z: (b.z - a.z) / L };
      const e1 = { from: a, to: b, u, L }, e2 = { from: b, to: a, u: { x: -u.x, z: -u.z }, L };
      e1.rev = e2; e2.rev = e1; a.out.push(e1); b.out.push(e2);
    }
  }
  // ---- peças do caminho: reta na faixa (lane) e curva (Bézier quadrática) dentro do cruzamento ----
  function lanePiece(e) {
    const r = right(e.u), a = { x: e.from.x + e.u.x * hw + r.x * LANE, z: e.from.z + e.u.z * hw + r.z * LANE };
    return { kind: 'lane', e, a, u: e.u, L: e.L - 2 * hw };
  }
  function turnPiece(e, f) {
    const n = e.to, r0 = right(e.u), r1 = right(f.u);
    const p0 = { x: n.x - e.u.x * hw + r0.x * LANE, z: n.z - e.u.z * hw + r0.z * LANE }, p2 = { x: n.x + f.u.x * hw + r1.x * LANE, z: n.z + f.u.z * hw + r1.z * LANE };
    const dot = e.u.x * f.u.x + e.u.z * f.u.z;
    const p1 = dot > 0.9 ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 } : dot < -0.9 ? { x: n.x + e.u.x * hw * 1.6, z: n.z + e.u.z * hw * 1.6 } : { x: n.x + r0.x * LANE + r1.x * LANE, z: n.z + r0.z * LANE + r1.z * LANE };
    const pt = t => ({ x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x, z: (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z });
    const tab = [0]; let L = 0, prev = p0;                        // tabela comprimento → t (12 trechos)
    for (let i = 1; i <= 12; i++) { const q = pt(i / 12); L += Math.hypot(q.x - prev.x, q.z - prev.z); tab.push(L); prev = q; }
    return { kind: 'turn', e, f, node: n, pt, tab, L };
  }
  /** Ponto e direção a `s` metros dentro de uma peça. */
  function pieceAt(pc, s) {
    if (pc.kind === 'lane') { s = Math.max(0, Math.min(pc.L, s)); return { x: pc.a.x + pc.u.x * s, z: pc.a.z + pc.u.z * s, ux: pc.u.x, uz: pc.u.z }; }
    s = Math.max(0, Math.min(pc.L, s));
    let i = 1; while (i < 12 && pc.tab[i] < s) i++;
    const t = (i - 1 + (s - pc.tab[i - 1]) / Math.max(1e-6, pc.tab[i] - pc.tab[i - 1])) / 12, p = pc.pt(t), q = pc.pt(Math.min(1, t + 0.02)), o = pc.pt(Math.max(0, t - 0.02));
    const dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1;
    return { x: p.x, z: p.z, ux: dx / l, uz: dz / l };
  }
  /** Próxima rua num cruzamento: reto mais provável; evita a volta; `avoid` = saída recusada (bloqueada). */
  function chooseNext(e, avoid) {
    let opts = e.to.out.filter(f => f !== e.rev && f !== avoid);
    if (!opts.length) opts = e.to.out.filter(f => f !== e.rev);
    if (!opts.length) return e.rev;
    const w = opts.map(f => (f.u.x * e.u.x + f.u.z * e.u.z > 0.9 ? 2 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i]; }
    return opts[opts.length - 1];
  }
  /** Peças à frente do veículo (a atual e as próximas duas), para olhar o caminho. */
  function ahead(t) {
    if (t.pc.kind === 'lane') return [t.pc, turnPiece(t.pc.e, t.next), lanePiece(t.next)];
    return [t.pc, lanePiece(t.pc.f)];
  }
  /** Ponto a `d` metros à frente do centro do veículo, seguindo as peças. */
  function along(t, pcs, d) {
    let s = t.s + d;
    for (const pc of pcs) { if (s <= pc.L || pc === pcs[pcs.length - 1]) return pieceAt(pc, s); s -= pc.L; }
  }
  const inBox = (o, x, z, m) => {                                  // ponto dentro da caixa (girada) de outro veículo
    const dx = x - o.x, dz = z - o.z, a = dx * o.ux + dz * o.uz, b = -dx * o.uz + dz * o.ux;
    return Math.abs(a) < o.len / 2 + m && Math.abs(b) < o.wid / 2 + m;
  };
  /** Distância livre à frente (até o primeiro ponto do caminho ocupado). who: 'veh' | 'player' | null. */
  function clearance(t, pcs, obs, max, ignoreVeh) {
    for (let d = t.len / 2 + 0.4; d <= t.len / 2 + max; d += 0.7) {
      const p = along(t, pcs, d);
      if (obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(p.x - x, p.z - z) < r + t.wid / 2 + 0.25))) return { d: d - t.len / 2 - 0.4, who: 'player' };
      if (!ignoreVeh) for (const o of list) if (o !== t && inBox(o, p.x, p.z, 0.35)) return { d: d - t.len / 2 - 0.4, who: 'veh', o };
    }
    return { d: max, who: null };
  }
  /** Saída livre: o começo da rua depois da curva sem veículo nem jogador (cabe o veículo inteiro). */
  function exitFree(t, f, obs) {
    const pc = lanePiece(f);
    for (let s = 0; s <= t.len + 4; s += 0.8) {
      const p = pieceAt(pc, s);
      if (obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(p.x - x, p.z - z) < r + t.wid / 2 + 0.25))) return false;
      for (const o of list) if (o !== t && inBox(o, p.x, p.z, 0.3)) return false;
    }
    return true;
  }
  function place(t) {
    const p = pieceAt(t.pc, t.s);
    t.ux += (p.ux - t.ux) * 0.35; t.uz += (p.uz - t.uz) * 0.35; const l = Math.hypot(t.ux, t.uz) || 1; t.ux /= l; t.uz /= l;
    t.x = p.x; t.z = p.z;
    t.mesh.position.set(p.x, 0.12, p.z); t.mesh.rotation.y = -Math.atan2(t.uz, t.ux);
    const cx = Math.abs(t.ux), cz = Math.abs(t.uz), ex = cx * t.len / 2 + cz * t.wid / 2, ez = cz * t.len / 2 + cx * t.wid / 2;
    Object.assign(t.solid, { x0: p.x - ex, x1: p.x + ex, z0: p.z - ez, z1: p.z + ez });
  }
  return {
    object: root,
    get list() { return list; },
    get nodes() { return nodes; },
    /** Monta a frota espalhada pelas ruas (longe da entrada e uns dos outros). */
    reset(V, start) {
      for (const t of list) { root.remove(t.mesh); const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); }
      graph(V);
      const edges = [...nodes.values()].flatMap(n => n.out).filter(e => e.L > 30);
      list = [];
      for (let i = 0; i < FLEET.length; i++) {
        const [type, color, vmax] = FLEET[i], mesh = buildWorkVehicle(type, color); root.add(mesh);
        const t = { i, type, mesh, len: mesh.userData.len, wid: mesh.userData.wid, vmax, v: 0, s: 0, pc: null, next: null, x: 0, z: 0, ux: 1, uz: 0, wait: 0, stuck: 0, ghost: 0, pass: 0, solid: { x0: 0, x1: 0, z0: 0, z1: 0 } };
        for (let k = 0; k < 60; k++) {                            // lugar livre: longe dos outros e do começo da van
          const e = edges[Math.floor(Math.random() * edges.length)], pc = lanePiece(e), s = t.len / 2 + 1 + Math.random() * Math.max(0, pc.L - t.len - 2), p = pieceAt(pc, s);
          if (list.some(o => Math.hypot(o.x - p.x, o.z - p.z) < 14) || (start && Math.hypot(p.x - start.x, p.z - start.z) < 30)) continue;
          Object.assign(t, { pc, s, x: p.x, z: p.z, ux: p.ux, uz: p.uz }); break;
        }
        if (!t.pc) { root.remove(mesh); continue; }
        t.next = chooseNext(t.pc.e);
        list.push(t); place(t);
      }
      for (const t of list) SOLIDS.push(t.solid);
    },
    detach() { for (const t of list) { const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); } for (const n of nodes.values()) n.occ = null; if (root.parent) root.parent.remove(root); },
    /** obs: [{ circles: [[x, z, r], …] }] (van e motorista a pé). ear: quem ouve. */
    update(dt, obs, ear) {
      for (const t of list) {
        // caminho à frente: van, motorista a pé ou outro veículo
        const c = clearance(t, ahead(t), obs, 9, t.ghost > 0);
        let stop = c.who ? c.d : 1e9, why = c.who;
        // cruzamento à frente: o primeiro da fila só entra com reserva (cruzamento livre e espaço na saída)
        if (t.pc.kind === 'lane' && !(t.pass > 0)) {
          const n = t.pc.e.to, toLine = t.pc.L - t.s - t.len / 2 - 0.3;
          if (n.occ !== t && toLine < 7 && !(c.who && c.d < toLine)) {
            if (!n.occ && exitFree(t, t.next, obs)) { n.occ = t; t.wait = 0; }
            else {
              t.wait += dt;
              if (toLine < stop) { stop = Math.max(0, toLine); why = 'node'; }
              if (!n.occ) { if (t.wait > 3) { t.next = chooseNext(t.pc.e, t.next); t.wait = 0; } }   // a saída escolhida está bloqueada: troca
              else if (t.wait > 6 && (n.occ.v < 0.1 || t.wait > 9)) {   // dono da reserva parado: passa se o caminho estiver livre; senão tenta outra saída
                if (!clearance(t, ahead(t), obs, 14, false).who) { stop = c.who ? c.d : 1e9; why = c.who; t.wait = 0; t.pass = 3; }
                else if (t.wait > 8) { t.next = chooseNext(t.pc.e, t.next); t.wait = 6; }
              }
            }
          }
        }
        if (t.pass > 0) t.pass -= dt;
        if (why === 'veh' && t.v < 0.2) t.stuck += dt; else t.stuck = 0;
        if (t.stuck > 8) { t.ghost = 2.5; t.stuck = 0; }           // nunca trava de vez
        if (t.ghost > 0) t.ghost -= dt;
        const want = Math.min(t.vmax, Math.sqrt(2 * BRAKE * Math.max(0, stop - 0.2)));
        t.v = t.v < want ? Math.min(want, t.v + ACC * dt) : Math.max(want, t.v - BRAKE * 1.6 * dt);
        if (stop < 0.05) t.v = 0;
        t.s += t.v * dt;
        while (t.s > t.pc.L) {                                     // próxima peça
          t.s -= t.pc.L;
          if (t.pc.kind === 'lane') { const n = t.pc.e.to; if (n.occ !== t && !n.occ) n.occ = t; t.pc = turnPiece(t.pc.e, t.next); }
          else { t.pc = lanePiece(t.pc.f); t.next = chooseNext(t.pc.e); }
        }
        if (t.pc.kind === 'lane' && t.s > t.len / 2 + 0.5) { const n = t.pc.e.from; if (n.occ === t) n.occ = null; }   // saiu do cruzamento
        place(t);
        if (SOLIDS.indexOf(t.solid) < 0) SOLIDS.push(t.solid);
      }
      if (ear && audio && audio.traffic) {
        let best = 1e9;
        for (const t of list) best = Math.min(best, Math.hypot(t.x - ear.x, t.z - ear.z));
        audio.traffic(Math.max(0, 1 - best / 30) * 0.8, 0.15);
      }
    },
    silence() { if (audio && audio.traffic) audio.traffic(0); },
  };
}
