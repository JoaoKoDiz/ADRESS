// Explosões cômicas de casas (entrega errada, se habilitado no menu) e o míssil da van (tecla F).
// Uma casa explodida vira escombros até o fim da rodada; reset() reconstrói tudo.
import * as THREE from 'three';
import { mat, box, cyl, cone, at, dynamic, bakeStatic } from './models/kit.js';
import { HOUSES, ROOF_COL, WALL_COL } from './data.js';
import { LOT, LOT_ANCHORS, slotOrigin } from './layout.js';
import { GROUND_Y } from './models/house.js';

const HS = LOT_ANCHORS.house;
const HX = (HS.x0 + HS.x1) / 2, HZ = (HS.z0 + HS.z1) / 2;
const GRAV = 30;
const rnd = (a, b) => a + Math.random() * (b - a);
const CRATER_GEO = new THREE.CircleGeometry(7, 12);

function basic(color, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  return m;
}

export function createBoom(scene, world, audio) {
  const fx = new THREE.Group();
  scene.add(fx);
  const destroyed = new Set();
  const parts = [];     // cacos com física
  const flames = [];    // bolas de fogo / fumaça temporárias
  const fires = [];     // foguinhos que ficam nos escombros
  let shake = 0, t = 0;

  function own(m) { m.userData.own = true; return m; }

  /** Escombros no lugar da casa (grama queimada, pilha de entulho, paredes quebradas, fogo, fumaça). */
  function buildRubble(h, o) {
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    const roof = ROOF_COL[HOUSES[h].roof];
    g.add(at(box(LOT + 0.8, 0.17, LOT + 0.8, '#cfc8b6'), LOT / 2, 0.085, LOT / 2));          // calçada
    g.add(at(box(LOT, 0.2, LOT, '#6f9a4c'), LOT / 2, 0.1, LOT / 2));                       // grama chamuscada
    const crater = new THREE.Mesh(CRATER_GEO, mat('#2b2119'));
    crater.rotation.x = -Math.PI / 2; crater.position.set(HX, 0.21, HZ + 1);
    g.add(crater);
    for (let i = 0; i < 70; i++) {                                                         // pilha de entulho
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 5.5;
      const col = i % 3 === 0 ? roof : i % 3 === 1 ? WALL_COL : '#8a5a36';
      const s = rnd(0.5, 1.4);
      g.add(at(box(s, s * 0.5, s * 0.8, col), HX + Math.cos(a) * r, 0.3 + (5.5 - r) * 0.25 + Math.random() * 0.5, HZ + Math.sin(a) * r * 0.8,
        rnd(-0.6, 0.6), rnd(0, 3), rnd(-0.6, 0.6)));
    }
    for (const [x, z, w, hgt, ry] of [[HS.x0 + 0.3, HZ, 0.35, 1.8, Math.PI / 2], [HS.x1 - 0.4, HZ - 1, 0.35, 1.2, Math.PI / 2], [HX - 2, HS.z0 + 0.2, 3.2, 1.5, 0], [HX + 2.5, HS.z1 - 0.3, 2.2, 0.9, 0]]) {
      g.add(at(box(w, hgt, 0.35, WALL_COL), x, 0.2 + hgt / 2, z, 0, ry, rnd(-0.15, 0.15)));  // restos de parede
    }
    g.add(at(box(0.3, 0.3, 4.5, '#5e3b20'), HX + 1, 1.3, HZ, 0.5, 0.6, 0.3));             // caibros
    g.add(at(box(0.3, 0.3, 3.8, '#6b4526'), HX - 1.5, 1.1, HZ + 1, -0.4, -0.5, 0.2));
    for (let i = 0; i < 5; i++) {                                                          // foguinhos
      const f = at(cone(0.7, 1.8, '#ff9a1a', 7, { emissive: '#ff6a00', emissiveIntensity: 1 }), HX + rnd(-4, 4), 1.2, HZ + rnd(-3, 3));
      f.castShadow = false;
      g.add(dynamic(f));
      fires.push({ m: f, ph: Math.random() * 6 });
    }
    bakeStatic(g);                                   // ~150 peças viram poucos meshes (desempenho)
    fx.add(g);
  }

  function spawnDebris(cx, cy, cz, h, count, power) {
    const roof = ROOF_COL[HOUSES[h].roof];
    for (let i = 0; i < count; i++) {
      const col = i % 4 === 0 ? WALL_COL : i % 4 === 1 ? '#8a5a36' : roof;
      const s = rnd(0.4, 1.2);
      const m = box(s, s * 0.4, s * 0.7, col);
      m.position.set(cx + rnd(-2, 2), cy, cz + rnd(-2, 2));
      fx.add(m);
      const a = Math.random() * Math.PI * 2, sp = rnd(6, 16) * power;
      parts.push({ m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rnd(10, 26) * power, rx: rnd(-10, 10), rz: rnd(-10, 10), rest: false });
    }
  }

  function spawnFireball(cx, cy, cz, size) {
    const cols = ['#fff3a0', '#ffd23a', '#ff9a1a', '#ff5a14', '#e0301e'];
    for (let i = 0; i < 26; i++) {
      const m = own(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), basic(cols[i % cols.length], 0.95)));
      m.position.set(cx + rnd(-2, 2) * size, cy + rnd(0, 3) * size, cz + rnd(-2, 2) * size);
      fx.add(m);
      flames.push({ m, vx: rnd(-6, 6) * size, vy: rnd(2, 9) * size, vz: rnd(-6, 6) * size, life: 0, max: rnd(0.7, 1.3), grow: rnd(3, 6) * size, fade: true });
    }
    for (let i = 0; i < 18; i++) {                                                         // fumaça escura
      const m = own(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: '#3d3935', roughness: 1, flatShading: true, transparent: true, opacity: 0.8, depthWrite: false })));
      m.position.set(cx + rnd(-3, 3), cy + rnd(0, 4), cz + rnd(-3, 3));
      fx.add(m);
      flames.push({ m, vx: rnd(-2, 2), vy: rnd(3, 7), vz: rnd(-2, 2), life: -rnd(0.1, 0.4), max: rnd(2.5, 3.5), grow: rnd(3, 5), fade: true });
    }
    const ring = own(new THREE.Mesh(new THREE.TorusGeometry(1, 0.35, 6, 32), basic('#fff0c0', 0.8)));
    ring.rotation.x = Math.PI / 2; ring.position.set(cx, 0.6, cz);
    fx.add(ring);
    flames.push({ m: ring, vx: 0, vy: 0, vz: 0, life: 0, max: 0.8, grow: 30 * size, fade: true, ring: true });
  }

  /** Chuva de lascas/folhas quando a van imparável atropela uma árvore ou a sebe. */
  function smash(x, z, colors, count = 24) {
    for (let i = 0; i < count; i++) {
      const s = rnd(0.25, 0.7);
      const m = box(s, s * 0.5, s * 0.8, colors[i % colors.length]);
      m.position.set(x + rnd(-1, 1), rnd(0.8, 3), z + rnd(-1, 1));
      fx.add(m);
      const a = Math.random() * Math.PI * 2, sp = rnd(3, 9);
      parts.push({ m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: rnd(5, 12), rx: rnd(-10, 10), rz: rnd(-10, 10), rest: false });
    }
    shake = Math.max(shake, 0.5);
    audio.crash && audio.crash();
  }

  /** Explode a casa h (que está no lote `slot`). Retorna false se ela já estava destruída. */
  function explode(h, slot) {
    if (destroyed.has(h)) return false;
    destroyed.add(h);
    const o = slotOrigin(slot);
    const cx = o.x + HX, cz = o.z + HZ;
    world.setHidden(h, true);
    buildRubble(h, o);
    spawnFireball(cx, 3, cz, 1);
    spawnDebris(cx, 4, cz, h, 70, 1);
    shake = 1.6;
    audio.boom && audio.boom();
    return true;
  }

  function reset() {
    world.showAll();
    destroyed.clear();
    for (const c of [...fx.children]) {
      fx.remove(c);
      c.traverse(o => {
        if (o.userData.own) { o.geometry.dispose(); o.material.dispose(); }
        else if (o.userData.baked) o.geometry.dispose();
      });
    }
    parts.length = 0; flames.length = 0; fires.length = 0; shake = 0;
  }

  function update(dt) {
    t += dt;
    shake = Math.max(0, shake - dt * 1.6);
    for (const p of parts) {
      if (p.rest) continue;
      p.vy -= GRAV * dt;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.rotation.x += p.rx * dt; p.m.rotation.z += p.rz * dt;
      if (p.vy < 0 && p.m.position.y <= GROUND_Y + 0.2) { p.m.position.y = GROUND_Y + 0.2; p.rest = true; p.restT = 0; }
    }
    // cacos parados afundam no chão e somem depois de alguns segundos (não acumulam draw calls)
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (!p.rest) continue;
      p.restT += dt;
      if (p.restT > 5) p.m.position.y -= dt * 0.35;
      if (p.restT > 7) { fx.remove(p.m); parts.splice(i, 1); }
    }
    for (let i = flames.length - 1; i >= 0; i--) {
      const f = flames[i];
      f.life += dt;
      if (f.life < 0) { f.m.visible = false; continue; }
      f.m.visible = true;
      const k = f.life / f.max;
      f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
      f.m.scale.setScalar(f.ring ? 1 + k * f.grow : 0.6 + k * f.grow);
      f.m.material.opacity = Math.max(0, (f.ring ? 0.8 : 0.95) * (1 - k));
      if (k >= 1) { fx.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); flames.splice(i, 1); }
    }
    for (const f of fires) {
      const s = 0.8 + Math.sin(t * 13 + f.ph) * 0.25 + Math.sin(t * 7.3 + f.ph * 2) * 0.15;
      f.m.scale.set(s, s * 1.2, s);
    }
  }

  // ---------- Míssil ----------
  // Escotilha no teto da van + míssil. Fases: open → rise → fly → boom → done.
  const MISSILE_SPEED = 55;
  const hatch = new THREE.Group();                 // filho da van: dobradiça na borda traseira da escotilha
  const lid = at(box(1.1, 0.1, 1.25, '#ff7a1a'), 0.55, 0, 0);
  hatch.add(lid);
  hatch.visible = false;                           // só aparece enquanto o míssil é disparado (senão ficava flutuando sobre a van)
  const missile = new THREE.Group();
  missile.add(at(cyl(0.22, 0.22, 1.9, '#f2f2f2', 10), 0, 0, 0, 0, 0, -Math.PI / 2));
  missile.add(at(cone(0.22, 0.6, '#e3262e', 10), 1.25, 0, 0, 0, 0, -Math.PI / 2));
  for (let i = 0; i < 4; i++) missile.add(at(box(0.5, 0.05, 0.36, '#e3262e'), -0.75, Math.cos(i * Math.PI / 2) * 0.25, Math.sin(i * Math.PI / 2) * 0.25, i * Math.PI / 2, 0, 0));
  const flameM = at(cone(0.2, 0.9, '#ffb21a', 8, { emissive: '#ff7a00', emissiveIntensity: 1 }), -1.35, 0, 0, 0, 0, Math.PI / 2);
  missile.add(flameM);
  missile.visible = false;
  scene.add(missile);
  let mPhase = 'idle', mT = 0, van = null, target = -1, targetSlot = -1;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), prev = new THREE.Vector3();
  let flyDur = 1;

  function attachHatch(vanObj) {
    hatch.position.set(-0.2, 2.33, 0);              // rente ao teto da van
    vanObj.add(hatch);
  }

  /** Casa para onde a van está "mirando": a mais próxima dentro de um cone à frente; senão, a mais próxima. */
  function aimTarget(v, slotOf) {
    let best = -1, bestScore = Infinity, near = -1, nearD = Infinity;
    const fx0 = Math.cos(v.heading), fz0 = Math.sin(v.heading);
    for (let h = 0; h < slotOf.length; h++) {
      if (slotOf[h] === undefined) continue;          // casa fora deste bairro
      const o = slotOrigin(slotOf[h]);
      const dx = o.x + HX - v.x, dz = o.z + HZ - v.z, d = Math.hypot(dx, dz);
      if (d < nearD) { nearD = d; near = h; }
      const fwd = (dx * fx0 + dz * fz0) / d;
      if (fwd < Math.cos(0.75) || d < 4) continue;
      const score = d * (1 + (1 - fwd) * 6);
      if (score < bestScore) { bestScore = score; best = h; }
    }
    return best >= 0 ? best : near;
  }

  function fire(v, slotOf) {
    van = v; target = aimTarget(v, slotOf); targetSlot = slotOf[target];
    mPhase = 'open'; mT = 0; hatch.visible = true;
    audio.hatch && audio.hatch();
    return target;
  }

  function updateMissile(dt) {
    if (mPhase === 'idle' || mPhase === 'done') return;
    mT += dt;
    if (mPhase === 'open') {
      hatch.rotation.z = Math.min(1, mT / 0.45) * 1.9;
      if (mT > 0.55) {
        mPhase = 'rise'; mT = 0;
        hatch.updateMatrixWorld(true);
        missile.position.copy(hatch.localToWorld(p0.set(0.55, 0, 0)));
        missile.rotation.set(0, 0, Math.PI / 2);   // apontando para cima
        missile.visible = true;
        audio.launch && audio.launch();
      }
    } else if (mPhase === 'rise') {
      missile.position.y += dt * 24;
      smokeTrail(missile.position);
      if (mT > 0.45) {
        mPhase = 'fly'; mT = 0;
        const o = slotOrigin(targetSlot);
        p0.copy(missile.position);
        p2.set(o.x + HX, 4.5, o.z + HZ);
        p1.set((p0.x + p2.x) / 2, Math.max(p0.y, p2.y) + 14, (p0.z + p2.z) / 2);
        flyDur = Math.max(0.6, p0.distanceTo(p2) / MISSILE_SPEED);
        prev.copy(p0);
      }
    } else if (mPhase === 'fly') {
      const k = Math.min(1, mT / flyDur), a = 1 - k;
      missile.position.set(
        a * a * p0.x + 2 * a * k * p1.x + k * k * p2.x,
        a * a * p0.y + 2 * a * k * p1.y + k * k * p2.y,
        a * a * p0.z + 2 * a * k * p1.z + k * k * p2.z);
      const dir = p0.clone().copy(missile.position).sub(prev);
      if (dir.lengthSq() > 1e-6) {
        missile.rotation.set(0, -Math.atan2(dir.z, dir.x), Math.atan2(dir.y, Math.hypot(dir.x, dir.z)));
      }
      prev.copy(missile.position);
      smokeTrail(missile.position);
      if (k >= 1) {
        missile.visible = false;
        mPhase = 'boom'; mT = 0;
        if (!explode(target, targetSlot)) { spawnFireball(p2.x, 3, p2.z, 1); shake = 1.6; audio.boom && audio.boom(); }
      }
    } else if (mPhase === 'boom') {
      hatch.rotation.z = Math.max(0, 1.9 - mT * 3);
      if (mT > 2.4) { mPhase = 'done'; hatch.visible = false; }
    }
    flameM.scale.setScalar(0.8 + Math.random() * 0.5);
  }

  let trailAcc = 0;
  function smokeTrail(pos) {
    trailAcc++;
    if (trailAcc % 2) return;
    const m = own(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), basic('#e8e4dc', 0.8)));
    m.position.copy(pos);
    fx.add(m);
    flames.push({ m, vx: rnd(-0.5, 0.5), vy: rnd(0, 1), vz: rnd(-0.5, 0.5), life: 0, max: 1.1, grow: 2.5, fade: true });
  }

  function resetMissile() {
    mPhase = 'idle'; missile.visible = false; hatch.rotation.z = 0; hatch.visible = false; target = -1;
  }

  return {
    explode, smash, reset() { reset(); resetMissile(); },
    update(dt) { updateMissile(dt); update(dt); },
    isDestroyed: h => destroyed.has(h),
    attachHatch, fire,
    get missileDone() { return mPhase === 'done'; },
    get missileTarget() { return target; },
    get shake() { return shake; },
  };
}
