// REFLETIR aprimorado (só depois do 2º fragmento azul): a parte da grade entre o K e a figura se ergue até a vertical
// (dobradiça em WP.zp) e vira a superfície de jogo. O jogador e o K não se movem; o círculo, o traço, as barreiras e os
// avisos ficam presos a ela (u = lado, v = altura). W/S sobe/desce, A/D para os lados, diagonal corrigida.
// Os projéteis voam em 3D: saem da mão da figura, cruzam a grade num ponto marcado (retículo) e seguem até o K ou o
// jogador. Cruzar a grade onde há uma barreira = rebatida: a barreira some (como sempre), o jogador faz o gesto no
// instante do contato, há um brilho no ponto e um som curto; o projétil volta para a mão da figura. Nas trocas
// (rallies) ela o rebate de novo, com um gesto, para outro ponto da grade e um pouco mais rápido; no fim de uma troca
// bem-sucedida ela o desvia para o vazio, irritada. Nada fere a figura. Barreiras: sem tempo, no máximo 2, a nova tira
// a posicionada por último (igual ao REFLETIR comum); criadas ao soltar (começar a desenhar não remove nada).
import * as THREE from 'three';

export const WP = {
  zp: -1, L: 8, half: 7,                       // dobradiça (z), altura da grade erguida, meia-largura
  u0: -6.5, u1: 6.5, v0: 0.7, v1: 7.4,         // área do círculo (meio do círculo fica dentro, com o raio)
  liftT: 1.6, lowerT: 1.0,
  hw: 0.17, step: 0.25, eps: 0.12, maxLen: 6.0, minLen: 0.5,
  hand: { x: 1.7, y: 4.4, z: -8.6 },           // onde a figura "pega" e rebate (x com o lado)
  warn: 0.8, windup: 0.38, hitR: 0.45,
};
// Roteiros (sem nada durante a rotação; uma coisa por vez nas primeiras trocas). [u, v] = ponto da grade.
export const PLUS_SCRIPTS = {
  A: [                                                                // 1º trecho: trocas curtas, sem nada junto
    { wait: 0.4 },
    { shot: [-2.6, 4.2], to: 'K', v: 6.6 },
    { wait: 0.5 },
    { rally: [[2.6, 5.0], [-1.6, 3.0]], to: ['K', 'P'], v0: 6.8, v1: 7.2 },
    { wait: 0.5 },
    { rally: [[-3.2, 5.6], [2.2, 2.6], [-0.6, 6.2]], to: ['P', 'K', 'K'], v0: 7.0, v1: 7.8 },
  ],
  B: [                                                                // 2º: mais rápido, pontos mais espalhados
    { wait: 0.4 },
    { rally: [[3.0, 3.4], [-2.6, 5.8]], to: ['K', 'P'], v0: 7.6, v1: 8.0 },
    { wait: 0.4 },
    { shot: [-4.0, 3.0], to: 'P', v: 7.8 },
    { wait: 0.4 },
    { rally: [[0.8, 6.4], [-3.8, 2.4], [1.8, 5.2]], to: ['K', 'P', 'K'], v0: 8.2, v1: 9.0 },
  ],
};

const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

// grade erguida: as mesmas linhas finas da do chão (inteiros, sem moldura), em coordenadas locais (u, v)
const LG_V = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LG_F = `uniform float uAlpha; uniform float uFill; uniform vec2 uSize; varying vec2 vP;
void main(){
  vec2 w = max(fwidth(vP), vec2(1e-4)); vec2 g = abs(fract(vP - 0.5) - 0.5) / w; vec2 n = floor(vP + 0.5);
  if (abs(abs(n.x) - uSize.x) < 0.01) g.x = 1e4;
  if (n.y > uSize.y - 0.01 || n.y < 0.01) g.y = 1e4;
  float line = 1.0 - min(min(g.x, g.y) / 1.3, 1.0);
  float a = max(line * uAlpha, uFill);
  if (a < 0.004) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, a); }`;

function segDist(px, py, a, b) {                                     // distância de (px,py) ao segmento a→b; devolve também o ponto
  const dx = b.u - a.u, dy = b.v - a.v, L = dx * dx + dy * dy;
  let t = L > 1e-9 ? ((px - a.u) * dx + (py - a.v) * dy) / L : 0; t = clamp(t, 0, 1);
  const x = a.u + dx * t, y = a.v + dy * t; return { d: Math.hypot(px - x, py - y), x, y };
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0], b = pts[pts.length - 1]; let im = 0, dm = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i].u, pts[i].v, a, b).d; if (d > dm) { dm = d; im = i; } }
  if (dm <= eps) return [a, b];
  return rdp(pts.slice(0, im + 1), eps).slice(0, -1).concat(rdp(pts.slice(im), eps));
}
const glowTex = (() => {                                             // brilho redondo do contato
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

/**
 * api: { scene, floorRect (Vector4 do chão: z0 = .z), circleR, speed, sfx(kind, k), L(msg), impact(who), shards(x,y,z,n,dark,speed),
 *        projGet(), projPut(o), pose, figGest(g), charPos(who) }
 */
export function createReflectPlus(api) {
  const { scene } = api;
  const lift = new THREE.Group(); lift.position.set(0, 0, WP.zp); scene.add(lift);       // girar x: −π/2 = deitada (para a figura), 0 = em pé
  const face = new THREE.Group(); lift.add(face);
  const gGeo = new THREE.PlaneGeometry(WP.half * 2 + 0.2, WP.L); gGeo.translate(0, WP.L / 2, 0);
  const gMat = new THREE.ShaderMaterial({ vertexShader: LG_V, fragmentShader: LG_F, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uAlpha: { value: 0.5 }, uFill: { value: 0 }, uSize: { value: new THREE.Vector2(WP.half, WP.L) } } });
  const gMesh = new THREE.Mesh(gGeo, gMat); gMesh.renderOrder = -1; face.add(gMesh);
  lift.visible = false;

  // círculo de controle (disco branco cheio, como no chão)
  const disc = new THREE.Mesh(new THREE.CircleGeometry(api.circleR, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, side: THREE.DoubleSide }));
  disc.position.z = 0.03; face.add(disc);
  // prévia do traço
  const PREV = 96, prevGeo = new THREE.BufferGeometry(); prevGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(PREV * 3), 3));
  const prev = new THREE.Line(prevGeo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false })); prev.visible = false; face.add(prev);
  const wallMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const haloMat = () => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, toneMapped: false });
  const ringGeo = new THREE.RingGeometry(0.42, 0.5, 40), dotGeo = new THREE.CircleGeometry(0.07, 16);
  const flashMat = () => new THREE.SpriteMaterial({ map: glowTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });

  const S = { k: 0, want: 0, cu: 0, cv: 3.6, drawing: null, walls: [], projs: [], rets: [], flashes: [], n: 0,
    script: null, ev: 0, evT: 0, wait: 0, done: false, armed: false, camW: 0, rallyN: 0, plusT: 0 };
  const W = (u, v, out = new THREE.Vector3()) => out.set(u, v, 0).applyMatrix4(face.matrixWorld);   // ponto da grade → mundo

  // ---------- barreiras ----------
  function ribbon(pts, hw, mat) {
    const pos = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b.u - a.u, dy = b.v - a.v, l = Math.hypot(dx, dy) || 1, nx = -dy / l * hw, ny = dx / l * hw;
      pos.push(a.u - nx, a.v - ny, 0, b.u - nx, b.v - ny, 0, b.u + nx, b.v + ny, 0, a.u - nx, a.v - ny, 0, b.u + nx, b.v + ny, 0, a.u + nx, a.v + ny, 0);
    }
    for (const p of pts) for (let k = 0; k < 10; k++) {                                // pontas arredondadas
      const a0 = k / 10 * Math.PI * 2, a1 = (k + 1) / 10 * Math.PI * 2;
      pos.push(p.u, p.v, 0, p.u + Math.cos(a0) * hw, p.v + Math.sin(a0) * hw, 0, p.u + Math.cos(a1) * hw, p.v + Math.sin(a1) * hw, 0);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return new THREE.Mesh(g, mat);
  }
  function addWall(pts) {
    // no máximo 2: a nova tira a POSICIONADA POR ÚLTIMO (A, B → C: fica A, C)
    for (;;) { const live = S.walls.filter(w => w.alive); if (live.length < 2) break; killWall(live.reduce((a, w) => w.n > a.n ? w : a)); api.L('replace'); }
    const g = new THREE.Group(); g.position.z = 0.05;
    const body = ribbon(pts, WP.hw, wallMat()), halo = ribbon(pts, WP.hw + 0.2, haloMat()); halo.position.z = -0.01;
    g.add(halo, body); face.add(g);
    S.walls.push({ pts, n: ++S.n, alive: true, age: 0, die: -1, g, body, halo });
    api.sfx('barrier'); api.L('wall');
  }
  function killWall(w) { if (w.alive) { w.alive = false; w.die = 0; } }
  function disposeWall(w) { face.remove(w.g); for (const m of [w.body, w.halo]) { m.geometry.dispose(); m.material.dispose(); } }

  // ---------- retículos (onde vai cruzar) ----------
  function addRet(u, v) {
    const g = new THREE.Group(); g.position.set(u, v, 0.06);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const dot = new THREE.Mesh(dotGeo, ring.material); g.add(ring, dot); face.add(g);
    const r = { u, v, g, ring, t: 0, alive: true }; S.rets.push(r); return r;
  }
  function killRet(r) { if (!r || !r.alive) return; r.alive = false; face.remove(r.g); r.ring.material.dispose(); }
  function flash(p, power) {
    const s = new THREE.Sprite(flashMat()); s.position.copy(p); scene.add(s);
    S.flashes.push({ s, t: 0, k: 1.1 + 0.9 * power });
  }

  // ---------- projéteis em 3D ----------
  const handPos = (side, out = new THREE.Vector3()) => out.set(side * WP.hand.x, WP.hand.y, WP.hand.z);
  const charPt = (who, out = new THREE.Vector3()) => { const c = api.charPos(who); return out.set(c.x, 1.0, c.z); };
  /** Lança da mão (lado do ponto) em direção ao ponto (u, v) da grade e depois ao alvo. */
  function launch(p) {
    p.state = 'in'; p.target.set(p.T.u, p.T.v, WP.zp);
    p.pos.copy(handPos(p.T.u < 0 ? -1 : 1)); aim(p, p.target);
    if (!p.obj) { p.obj = api.projGet(); p.obj.visible = true; p.obj.userData.claim.visible = false; scene.add(p.obj); }
    api.sfx('launch'); api.L('p:launch');
  }
  function aim(p, to) { p.vel.copy(to).sub(p.pos).normalize().multiplyScalar(p.speed); }
  function newProj(o) {
    const p = Object.assign({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), target: new THREE.Vector3(), state: 'warn', t: 0, obj: null, alive: true, ret: null, hits: 0 }, o);
    p.ret = addRet(p.T.u, p.T.v); S.projs.push(p);
    // gesto da figura enquanto o aviso cresce (braço do lado do ponto)
    const side = p.T.u < 0 ? -1 : 1;
    api.figGest({ s: side < 0 ? 1 : -1, pt: W(p.T.u, p.T.v).lerp(handPos(side), 0.55), t: 0, dur: (o.lead || WP.warn) + 0.4 });
    return p;
  }
  function killProj(p, burst = 0) {
    if (!p.alive) return; p.alive = false; killRet(p.ret);
    if (burst) api.shards(p.pos.x, p.pos.y, p.pos.z, burst, 0.3);
    if (p.obj) { p.obj.scale.setScalar(1); api.projPut(p.obj); p.obj = null; }
  }
  /** Cruzou a grade: barreira no ponto? (contato reconhecível: o ponto onde ele atravessa) */
  function cross(p, x, y) {
    for (const w of S.walls) {
      if (!w.alive || w.age < 0.08) continue;
      for (let i = 0; i < w.pts.length - 1; i++) {
        const r = segDist(x, y, w.pts[i], w.pts[i + 1]);
        if (r.d <= WP.hw + 0.2) return { w, x, y };
      }
    }
    return null;
  }
  function rebound(p, hit) {
    killWall(hit.w); killRet(p.ret); p.ret = null;
    const power = clamp(p.idx / 3, 0, 1);                                              // trocas seguidas: um pouco mais forte
    const c = W(hit.x, hit.y); flash(c, power);
    api.shards(c.x, c.y, c.z + 0.1, 5 + Math.round(4 * power), 0, 2.2 + power);
    api.sfx('rhit', power); api.pose.sweep(c.x, c.z + 6, power);                     // o gesto começa no próprio contato
    p.hits++; p.state = 'back'; p.pos.set(c.x, c.y, WP.zp - 0.05);
    const side = p.next ? (p.next.T.u < 0 ? -1 : 1) : (hit.x < 0 ? -1 : 1);
    p.backSide = side; aim(p, handPos(side)); api.L('p:reflect');
  }
  /** Chegou à mão da figura: rebate para o próximo ponto (troca) ou desvia para o vazio (fim). */
  function caught(p) {
    if (p.next) {
      const n = p.next; p.state = 'windup'; p.t = 0; p.T = n.T; p.to = n.to; p.speed = n.v; p.idx = n.idx; p.next = n.rest;
      p.ret = addRet(p.T.u, p.T.v);
      const side = p.T.u < 0 ? -1 : 1;
      api.figGest({ s: side < 0 ? 1 : -1, pt: W(p.T.u, p.T.v).lerp(handPos(side), 0.5), t: 0, dur: WP.windup + 0.45 });
      api.sfx('frebound'); api.L('p:figRebound');
    } else {
      p.state = 'void'; p.t = 0; const s = p.backSide || 1;
      p.vel.set(s * 9, 7, -6).normalize().multiplyScalar(13);                         // para o vazio, para longe de todos
      api.figGest({ s: s < 0 ? 1 : -1, pt: new THREE.Vector3(s * 6.5, 7.5, -7.5), t: 0, dur: 0.75 });   // tapa irritado
      api.sfx('void'); api.L('p:void');
    }
  }
  function updateProjs(dt, play) {
    for (const p of S.projs) {
      if (!p.alive) continue;
      p.t += dt;
      if (p.state === 'warn') {
        const k = Math.min(1, p.t / p.lead); if (p.ret) { p.ret.ring.material.opacity = 0.35 + 0.6 * k; p.ret.g.scale.setScalar(1.7 - 0.7 * k + 0.06 * Math.sin(p.t * 16)); }
        if (play && p.t >= p.lead) launch(p);
        continue;
      }
      if (p.state === 'windup') {                                                      // segurado na mão, brilhando
        p.pos.lerp(handPos(p.T.u < 0 ? -1 : 1), Math.min(1, dt * 10));
        const k = Math.min(1, p.t / WP.windup); if (p.ret) { p.ret.ring.material.opacity = 0.4 + 0.55 * k; p.ret.g.scale.setScalar(1.5 - 0.5 * k); }
        if (play && p.t >= WP.windup) launch(p);
      } else if (play) {
        const x0 = p.pos.z; p.pos.addScaledVector(p.vel, dt);
        if (p.state === 'in' && x0 < WP.zp && p.pos.z >= WP.zp) {                     // atravessou a grade
          const f = (WP.zp - x0) / (p.pos.z - x0 || 1), cx = p.pos.x - p.vel.x * dt * (1 - f), cy = p.pos.y - p.vel.y * dt * (1 - f);
          const hit = cross(p, cx, cy);
          if (hit) rebound(p, hit);
          else { p.state = 'out'; killRet(p.ret); p.ret = null; aim(p, charPt(p.to)); api.L('p:miss'); }
        } else if (p.state === 'out') {
          if (p.pos.distanceTo(charPt(p.to)) < WP.hitR) { killProj(p, 10); api.impact(p.to); continue; }
        } else if (p.state === 'back') {
          if (p.pos.distanceTo(handPos(p.backSide)) < 0.5 || p.pos.z < WP.hand.z) caught(p);
        } else if (p.state === 'void') {
          if (p.t > 1.2) { killProj(p); continue; }
        }
        if (p.ret && p.state === 'in') p.ret.ring.material.opacity = 0.75 + 0.25 * Math.sin(p.t * 18);
      }
      if (p.obj) {
        const o = p.obj; o.position.copy(p.pos); if (p.vel.lengthSq() > 1e-6) o.lookAt(_l.copy(p.pos).add(p.vel));
        o.userData.spin.rotation.z += dt * 2.2; o.scale.setScalar(1.6 * (p.state === 'void' ? Math.max(0.01, 1 - p.t / 1.2) : 1));   // maior: é visto de longe
      }
    }
    S.projs = S.projs.filter(p => p.alive);
  }
  const _l = new THREE.Vector3();

  // ---------- roteiro ----------
  function startEvent(e) {
    if (e.wait != null) { S.wait = e.wait; return; }
    if (e.shot) { newProj({ T: { u: e.shot[0], v: e.shot[1] }, to: e.to, speed: e.v, lead: WP.warn, idx: 0, next: null }); return; }
    if (e.rally) {
      const n = e.rally.length; S.rallyN++;
      const legs = e.rally.map((pt, i) => ({ T: { u: pt[0], v: pt[1] }, to: e.to[i], v: e.v0 + (e.v1 - e.v0) * (n > 1 ? i / (n - 1) : 0), idx: i, rest: null }));
      for (let i = 0; i < n - 1; i++) legs[i].rest = legs[i + 1];                   // cadeia: cada perna sabe a próxima
      newProj({ T: legs[0].T, to: legs[0].to, speed: legs[0].v, lead: WP.warn, idx: 0, next: legs[1] || null });
    }
  }
  function stepScript(dt) {
    if (!S.script || S.done) return;
    if (S.k < 0.999) return;                                                         // nada durante a rotação
    S.plusT += dt;
    if (S.wait > 0) { S.wait -= dt; return; }
    if (S.projs.some(p => p.state !== 'void' && !(p.state === 'back' && !p.next))) return;   // uma coisa por vez (a volta final e o desvio para o vazio são só visuais)
    if (S.ev >= S.script.length) { S.done = true; api.L('p:done'); return; }
    startEvent(S.script[S.ev++]);
  }

  // ---------- desenho ----------
  function action(act) {
    if (S.k < 0.999) { if (!act) S.drawing = null; return; }
    if (act && !S.drawing) S.drawing = { pts: [{ u: S.cu, v: S.cv }], len: 0, atLimit: false };   // começar não remove nada
    else if (act && S.drawing) {
      const d = S.drawing, last = d.pts[d.pts.length - 1], l = Math.hypot(S.cu - last.u, S.cv - last.v);
      if (l >= WP.step) {
        if (d.len + l <= WP.maxLen) { d.pts.push({ u: S.cu, v: S.cv }); d.len += l; }
        else if (!d.atLimit) { const r = WP.maxLen - d.len; if (r > 0.05) { d.pts.push({ u: last.u + (S.cu - last.u) * r / l, v: last.v + (S.cv - last.v) * r / l }); d.len = WP.maxLen; } d.atLimit = true; }
      }
    } else if (!act && S.drawing) {
      const d = S.drawing, last = d.pts[d.pts.length - 1], l = Math.hypot(S.cu - last.u, S.cv - last.v);
      if (!d.atLimit && l > 0.05) { const r = Math.min(l, WP.maxLen - d.len); if (r > 0.05) { d.pts.push({ u: last.u + (S.cu - last.u) * r / l, v: last.v + (S.cv - last.v) * r / l }); d.len += r; } }
      if (d.len < WP.minLen) {                                                       // toque curto: um traço mínimo pelo círculo (fácil de interceptar)
        const c = d.pts[0]; d.pts = [{ u: c.u - WP.minLen / 2, v: c.v }, { u: c.u + WP.minLen / 2, v: c.v }]; d.len = WP.minLen;
      }
      addWall(rdp(d.pts, WP.eps)); S.drawing = null;
    }
  }
  function move(dt, ax) {
    if (S.k < 0.999) return;
    let x = ax.x, y = -ax.z; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }   // W = sobe, S = desce, A/D = lados
    const r = api.circleR;
    S.cu = clamp(S.cu + x * api.speed * dt, WP.u0 + r, WP.u1 - r);
    S.cv = clamp(S.cv + y * api.speed * dt, WP.v0 + r, WP.v1 - r);
  }

  // ---------- quadro a quadro ----------
  function update(dt, play) {
    // ergue/abaixa
    const want = S.want;
    S.k = want ? Math.min(1, S.k + dt / WP.liftT) : Math.max(0, S.k - dt / WP.lowerT);
    lift.visible = S.k > 0.001 || want > 0;
    lift.rotation.x = -Math.PI / 2 * (1 - ease(S.k));
    api.floorRect.z = lift.visible ? WP.zp : api.floorZ0;                            // a parte que se ergue sai do chão
    gMat.uniforms.uFill.value = 0.025 * ease(S.k);
    lift.updateMatrixWorld(true);
    // câmera: segue a grade erguida (sem alternar sozinha)
    S.camW = want ? Math.min(1, S.camW + dt / 1.2) : Math.max(0, S.camW - dt / 1.0);
    disc.visible = S.k > 0.999 && want > 0;
    disc.position.set(S.cu, S.cv, 0.03);
    // prévia
    if (S.drawing && disc.visible) {
      const pa = prevGeo.attributes.position, pts = S.drawing.pts.concat(S.drawing.atLimit ? [] : [{ u: S.cu, v: S.cv }]); const n = Math.min(PREV, pts.length);
      for (let i = 0; i < n; i++) pa.setXYZ(i, pts[i].u, pts[i].v, 0.07);
      pa.needsUpdate = true; prevGeo.setDrawRange(0, n); prev.visible = true;
    } else prev.visible = false;
    // barreiras
    S.walls = S.walls.filter(w => {
      w.age += dt;
      if (w.alive) { const pu = Math.max(0, 1 - w.age / 0.3); w.body.material.opacity = 0.62 + 0.35 * pu; w.halo.material.opacity = 0.22 + 0.5 * pu; w.g.scale.setScalar(1); return true; }
      w.die += dt; const k = w.die / 0.15; w.body.material.opacity = 0.9 * (1 - k); w.halo.material.opacity = 0.6 * (1 - k);
      if (k >= 1) { disposeWall(w); return false; } return true;
    });
    updateProjs(dt, play);
    // brilhos de contato
    S.flashes = S.flashes.filter(f => { f.t += dt; const k = f.t / 0.28; f.s.material.opacity = Math.max(0, 1 - k); f.s.scale.setScalar(f.k * (0.6 + 0.9 * k)); if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); return false; } return true; });
  }

  return {
    /** Arma o trecho aprimorado: a grade se ergue (se ainda não estiver) e o roteiro espera o fim da rotação. */
    setup(name) {
      clearAttacks(); S.want = 1; S.script = PLUS_SCRIPTS[name] || PLUS_SCRIPTS.A; S.ev = 0; S.wait = 0; S.done = false; S.plusT = 0; S.rallyN = 0;
      S.cu = 0; S.cv = 3.6; S.drawing = null; api.L('p:setup ' + name);
    },
    lower() { S.want = 0; clearAttacks(); },
    /** Começo/fim da batalha: deitada na hora, sem animação. */
    reset() { clearAttacks(); for (const w of S.walls) disposeWall(w); S.walls = []; S.want = 0; S.k = 0; S.camW = 0; S.script = null; update(0, false); },
    clearAttacks,
    cancelDraw() { S.drawing = null; },
    update, move, action, step: stepScript,
    get active() { return S.want > 0; }, get lifted() { return S.k >= 0.999; }, get k() { return S.k; }, get camW() { return ease(S.camW); },
    get done() { return S.done; },
    /** Pontos interativos (para a transparência de quem cobre). */
    points() { const out = []; if (disc.visible) { const c = W(S.cu, S.cv); out.push([c.x, c.y, c.z]); } for (const p of S.projs) if (p.obj) out.push([p.pos.x, p.pos.y, p.pos.z]); for (const r of S.rets) if (r.alive) { const c = W(r.u, r.v); out.push([c.x, c.y, c.z]); } return out; },
    // testes
    get circle() { return { u: S.cu, v: S.cv }; }, _setCircle(u, v) { S.cu = u; S.cv = v; },
    get walls() { return S.walls.filter(w => w.alive).map(w => ({ n: w.n, pts: w.pts.map(p => ({ u: +p.u.toFixed(2), v: +p.v.toFixed(2) })) })); },
    get projs() { return S.projs.map(p => ({ state: p.state, u: p.T.u, v: p.T.v, to: p.to, speed: p.speed, idx: p.idx, z: +p.pos.z.toFixed(2), next: !!p.next })); },
    get ev() { return S.ev; }, get t() { return S.plusT; }, WP, toWorld: (u, v) => W(u, v).clone(),
  };
  function clearAttacks() {
    for (const p of S.projs) killProj(p); S.projs = [];
    for (const r of S.rets) killRet(r); S.rets = [];
    for (const w of S.walls) killWall(w);
    S.drawing = null;
  }
}
