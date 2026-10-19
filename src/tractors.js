// Nível 15 (Colheita): poucos tratores circulando devagar em laços pelas estradas de terra, sempre pela direita
// (sobra espaço para a van ultrapassar). Como os carros do Nível 14: mantêm distância de outro trator à frente, param
// diante da van ou do motorista a pé e retomam quando há passagem. São sólidos para a van.
// O mesmo sistema move as carroças (Medieval), os carros do Bosque e o limpa-neve (Nevasca). Um modelo pode pedir um
// trajeto suave em `userData.ride` (o limpa-neve pede): { turnR, tilt, lift } — curvas em arco contínuas (posição e
// rotação sem saltos nas esquinas, mais devagar nas curvas fechadas), carroceria inclinada com o terreno e apoiada na
// superfície desenhada da rua (`lift`). Sem `ride`, o trajeto é o de sempre (linhas com a curva suavizada pela rotação).
import * as THREE from 'three';
import { SOLIDS, FARMLAND, TERRAIN, ensureSolid } from './layout.js';
import { buildTractor } from './models/farm.js';

const SIDE = 2.3, LEN = 3.6;
let SPEED = 3.4;
const COLORS = ['#c8402f', '#3f8a4a', '#2f6fb0', '#e8b02a', '#c8402f', '#5f9a5a'];
const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Caminho fechado deslocado para a direita do sentido de ida (o de sempre: trechos retos). */
function makePath(loop) {
  const pts = loop.concat([loop[0]]), segs = [];
  let S = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    const rx = -uz, rz = ux;                                        // direita de quem anda (X leste, Z sul)
    segs.push({ ax: ax + rx * SIDE, az: az + rz * SIDE, ux, uz, L, s0: S }); S += L;
  }
  return { segs, S, at(s) { s = ((s % S) + S) % S; const g = segs.find(q => s < q.s0 + q.L) || segs[segs.length - 1]; const u = s - g.s0; return { x: g.ax + g.ux * u, z: g.az + g.uz * u, ux: g.ux, uz: g.uz }; } };
}

/**
 * Caminho suave: a linha do meio da rua ganha arcos de raio `R` nas esquinas (menor se o trecho for curto), e o veículo
 * anda deslocado SIDE para a direita dessa linha (o deslocamento de uma curva contínua também é contínuo: nada de saltos).
 * Amostrado a cada ~0,5 de comprimento; a direção é interpolada entre as amostras (rotação contínua) e cada amostra guarda a
 * velocidade máxima da curva que vem pela frente (freia antes de uma esquina fechada).
 */
function makeSmoothPath(loop, R, vmax) {
  const P = loop.filter((p, i) => { const q = loop[(i + 1) % loop.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5; });
  const n = P.length, dir = [], len = [];
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); dir.push([(b[0] - a[0]) / L, (b[1] - a[1]) / L]); len.push(L); }
  // cada vértice: ângulo da curva, comprimento da tangente e raio efetivo (as tangentes de um trecho nunca se cruzam)
  const corner = P.map((p, i) => {
    const d0 = dir[(i - 1 + n) % n], d1 = dir[i], phi = wrapA(Math.atan2(d1[1], d1[0]) - Math.atan2(d0[1], d0[0]));
    if (Math.abs(phi) > 2.8) return { phi, t: 0, r: 0 };               // (meia-volta: fica como esquina; os laços do limpa-neve não têm)
    const ta = Math.tan(Math.abs(phi) / 2);
    let t = R * ta; t = Math.min(t, 0.48 * len[(i - 1 + n) % n], 0.48 * len[i]);
    return { phi, t, r: ta > 1e-4 ? t / ta : 0 };
  });
  const cx = [], cz = [], ch = [];                                    // linha do meio suavizada (pontos e direção)
  const push = (x, z, h) => { cx.push(x); cz.push(z); ch.push(h); };
  for (let i = 0; i < n; i++) {
    const p = P[i], c = corner[i], d0 = dir[(i - 1 + n) % n], d1 = dir[i];
    if (c.r > 0.05 && Math.abs(c.phi) > 0.01) {                       // arco da esquina: de p − d0·t até p + d1·t
      const sg = Math.sign(c.phi), nx = -d0[1] * sg, nz = d0[0] * sg; // centro do lado de dentro da curva
      const ox = p[0] - d0[0] * c.t + nx * c.r, oz = p[1] - d0[1] * c.t + nz * c.r;
      const a0 = Math.atan2(p[1] - d0[1] * c.t - oz, p[0] - d0[0] * c.t - ox), h0 = Math.atan2(d0[1], d0[0]);
      const steps = Math.max(2, Math.ceil(Math.abs(c.phi) * c.r / 0.5));
      for (let k = 0; k <= steps; k++) { const f = k / steps, a = a0 + c.phi * f; push(ox + Math.cos(a) * c.r, oz + Math.sin(a) * c.r, h0 + c.phi * f); }
    } else push(p[0], p[1], Math.atan2(d1[1], d1[0]));
    const e0x = p[0] + d1[0] * c.t, e0z = p[1] + d1[1] * c.t, q = P[(i + 1) % n], c2 = corner[(i + 1) % n];
    const e1x = q[0] - d1[0] * c2.t, e1z = q[1] - d1[1] * c2.t, L = Math.hypot(e1x - e0x, e1z - e0z), hh = Math.atan2(d1[1], d1[0]);
    for (let k = 1, m = Math.max(1, Math.ceil(L / 2)); k < m; k++) push(e0x + (e1x - e0x) * k / m, e0z + (e1z - e0z) * k / m, hh);   // reta até a próxima esquina
  }
  // deslocado para a direita; comprimento acumulado e curvatura (pelo giro da direção por distância)
  const m = cx.length, X = new Float32Array(m + 1), Z = new Float32Array(m + 1), H = new Float32Array(m + 1), S = new Float32Array(m + 1), K = new Float32Array(m + 1);
  for (let k = 0; k <= m; k++) { const j = k % m; X[k] = cx[j] - Math.sin(ch[j]) * SIDE; Z[k] = cz[j] + Math.cos(ch[j]) * SIDE; H[k] = k ? H[k - 1] + wrapA(ch[j] - H[k - 1]) : ch[0]; }
  for (let k = 1; k <= m; k++) { S[k] = S[k - 1] + Math.hypot(X[k] - X[k - 1], Z[k] - Z[k - 1]); K[k - 1] = (H[k] - H[k - 1]) / Math.max(0.05, S[k] - S[k - 1]); }   // (com sinal: + = curva à direita)
  K[m] = K[0];
  const total = S[m];
  // velocidade máxima: a da curva (aceleração lateral ~2,4) e, antes dela, uma rampa de frenagem (~2/s²)
  const cap = new Float32Array(m + 1);
  for (let k = 0; k <= m; k++) cap[k] = Math.min(vmax, Math.sqrt(2.4 / Math.max(1e-3, Math.abs(K[k]))));
  for (let pass = 0; pass < 2; pass++) { for (let k = m - 1; k >= 0; k--) cap[k] = Math.min(cap[k], Math.sqrt(cap[k + 1] * cap[k + 1] + 2 * 2.0 * (S[k + 1] - S[k]))); cap[m] = cap[0]; }
  const find = s => { let lo = 0, hi = m; while (hi - lo > 1) { const md = (lo + hi) >> 1; if (S[md] <= s) lo = md; else hi = md; } return lo; };
  return {
    S: total, smooth: true,
    at(s) {
      s = ((s % total) + total) % total; const k = find(s), f = (s - S[k]) / Math.max(1e-6, S[k + 1] - S[k]), h = H[k] + (H[k + 1] - H[k]) * f;
      return { x: X[k] + (X[k + 1] - X[k]) * f, z: Z[k] + (Z[k + 1] - Z[k]) * f, ux: Math.cos(h), uz: Math.sin(h), k: K[k] + (K[k + 1] - K[k]) * f, cap: cap[k] + (cap[k + 1] - cap[k]) * f };
    },
  };
}

export function createTractors(audio) {
  const root = new THREE.Group(); root.name = 'tractors';
  let list = [];
  return {
    object: root,
    get list() { return list; },
    /** opts (Nevasca): { loops, build, speed } — o limpa-neve usa a mesma lógica. */
    reset(opts = {}) {
      for (const t of list) { root.remove(t.mesh); const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); }
      SPEED = opts.speed || 3.4;
      list = (opts.loops || (FARMLAND ? FARMLAND.tractorLoops : [])).map((loop, i) => {
        const mesh = (opts.build || buildTractor)(COLORS[i % COLORS.length]), ride = mesh.userData.ride || null;
        const path = ride && ride.turnR ? makeSmoothPath(loop, ride.turnR, SPEED) : makePath(loop); root.add(mesh);
        if (ride && ride.tilt) mesh.rotation.order = 'YZX';           // guinada, depois arfagem (nariz) e rolagem (lados)
        return { i, path, ride, s: path.S * ((0.15 + 0.37 * i) % 1), v: 0, mesh, solid: { x0: 0, x1: 0, z0: 0, z1: 0 }, x: 0, z: 0, ux: 1, uz: 0, k: 0, cap: SPEED, roll: 0 };
      });
      for (const t of list) this.place(t);
    },
    place(t) {
      const p = t.path.at(t.s);
      if (t.path.smooth) {                                             // trajeto suave: posição e direção vêm da curva (contínuas)
        t.ux = p.ux; t.uz = p.uz; t.k = p.k; t.cap = p.cap;
      } else {
        const q = t.path.at(t.s + 1.5);
        const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1;
        t.ux += (dx / l - t.ux) * 0.25; t.uz += (dz / l - t.uz) * 0.25;     // curvas suaves
      }
      t.x = p.x; t.z = p.z;
      const ride = t.ride, yaw = -Math.atan2(t.uz, t.ux);
      if (ride && ride.tilt) {                                         // apoiado nas rodas: altura e inclinação do chão + leve inclinação na curva
        const H = TERRAIN.h, a = ride.axle || [1.6, -1.6], w = ride.track || 1.0, rx = -t.uz, rz = t.ux;
        const hf = H(p.x + t.ux * a[0], p.z + t.uz * a[0]), hb = H(p.x + t.ux * a[1], p.z + t.uz * a[1]);
        const hl = H(p.x - rx * w, p.z - rz * w), hr = H(p.x + rx * w, p.z + rz * w);
        const y = Math.max(H(p.x, p.z), hb + (hf - hb) * (-a[1]) / (a[0] - a[1]));
        const lean = t.path.smooth ? Math.max(-0.05, Math.min(0.05, -t.v * t.v * t.k * 0.012)) : 0;   // na curva a carroceria tomba um pouco para fora
        t.roll += (lean - t.roll) * 0.2;
        t.mesh.position.set(p.x, y + (ride.lift || 0), p.z);
        t.mesh.rotation.set(Math.atan2(hl - hr, 2 * w) + t.roll, yaw, Math.atan2(hf - hb, a[0] - a[1]));
      } else {
        t.mesh.position.set(p.x, TERRAIN.h(p.x, p.z) + (ride && ride.lift || 0), p.z); t.mesh.rotation.y = yaw;
      }
      const cx = Math.abs(t.ux), cz = Math.abs(t.uz), ex = cx * 2.0 + cz * 1.3, ez = cz * 2.0 + cx * 1.3;
      Object.assign(t.solid, { x0: p.x - ex, x1: p.x + ex, z0: p.z - ez, z1: p.z + ez });
    },
    detach() { for (const t of list) { const k = SOLIDS.indexOf(t.solid); if (k >= 0) SOLIDS.splice(k, 1); } if (root.parent) root.parent.remove(root); },
    /** obs: [{ circles: [[x, z, r], …] }] (van e motorista a pé). ear: quem ouve. */
    update(dt, obs, ear) {
      for (const t of list) {
        let want = t.path.smooth ? Math.min(SPEED, t.cap) : SPEED;     // (trajeto suave: mais devagar nas curvas fechadas)
        for (let k = 2.6; k <= 8; k += 1.35) {                           // obstáculo à frente: para
          const px = t.x + t.ux * k, pz = t.z + t.uz * k;
          if (obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(px - x, pz - z) < r + 1.4))) { want = 0; break; }
        }
        for (const o of list) {                                          // outro trator logo à frente, no mesmo sentido
          if (o === t) continue;
          const dx = o.x - t.x, dz = o.z - t.z, ahead = dx * t.ux + dz * t.uz, lat = Math.abs(-dx * t.uz + dz * t.ux);
          if (ahead > 0 && ahead < LEN + 5 && lat < 2.6) {
            const mutual = (-dx) * o.ux + (-dz) * o.uz > 0 && Math.abs(dx * o.uz - dz * o.ux) < 2.6;
            if ((!mutual || t.i > o.i) && !(t.pass > 0)) want = 0;       // os dois "se veem": o de índice maior espera
          }
        }
        // esperando outro trator há muito tempo (cruzamento): passa assim mesmo por um instante (nunca trava de vez)
        if (want === 0 && !obs.some(o => o.circles.some(([x, z, r]) => Math.hypot(t.x + t.ux * 4 - x, t.z + t.uz * 4 - z) < r + 4))) t.wait = (t.wait || 0) + dt; else t.wait = 0;
        if (t.wait > 6) { t.pass = 2.5; t.wait = 0; }
        if (t.pass > 0) t.pass -= dt;
        t.v = t.v < want ? Math.min(want, t.v + 2 * dt) : Math.max(want, t.v - 6 * dt);
        t.s += t.v * dt;
        this.place(t);
        if (t.mesh.userData.drive) t.mesh.userData.drive(dt, t.v);   // rodas girando, motorista, giroflex (modelos que têm)
        ensureSolid(t.solid);
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
