// Dica opcional (pedido explícito do jogador — exceção deliberada à regra "sem marcadores"):
// uma seta vermelha gigante cai do céu sobre a casa indicada e quebra o telhado dela.
// O limite de uso (uma vez por rodada) e a câmera cinematográfica ficam no main.js.
import * as THREE from 'three';
import { mat, cone, cyl, box, at } from './models/kit.js';
import { HOUSES, ROOF_COL } from './data.js';
import { LOT_ANCHORS, slotOrigin } from './layout.js';
import { GROUND_Y } from './models/house.js';
import { TERRAIN } from './layout.js';
import { aptHeight } from './models/apt.js';
import { futTopY } from './models/fut.js';

const A = LOT_ANCHORS, HS = A.house;
const HX = (HS.x0 + HS.x1) / 2, HZ = (HS.z0 + HS.z1) / 2, HALF = (HS.z1 - HS.z0) / 2;
const THETA = Math.atan2(A.roofRise, HALF), TAN = Math.tan(THETA);
const ROOF_SURF = GROUND_Y + A.wallHeight + A.roofRise + 0.24;   // superfície do telhado na cumeeira
const START_Y = 95, GRAVITY = 75, EMBED = 1.4;                   // a ponta afunda no telhado
const HOLE_COL = '#1e140d';

function buildArrow() {
  const g = new THREE.Group();
  const RED = '#e3262e', RED_DARK = '#a3141b', o = { emissive: '#6a080c', emissiveIntensity: 0.4 };
  g.add(at(cone(2.1, 3.8, RED, 16, o), 0, 1.9, 0, Math.PI, 0, 0));          // ponta (para baixo, na origem)
  g.add(at(cyl(0.72, 0.72, 11, RED, 14, o), 0, 3.8 + 5.5, 0));              // haste
  for (const y of [6.2, 9.4, 12.6]) g.add(at(cyl(0.76, 0.76, 0.55, '#ffffff', 14), 0, y, 0)); // faixas brancas
  for (let i = 0; i < 4; i++) {                                              // penas da seta
    g.add(at(box(0.16, 3.2, 1.9, RED_DARK, o), Math.cos(i * Math.PI / 2) * 1.2, 13.4, Math.sin(i * Math.PI / 2) * 1.2, 0, -i * Math.PI / 2, 0));
  }
  return g;
}

/** Contorno irregular de um buraco (estrela torta), deitado no plano XZ. */
function holeGeometry(rIn, rOut, n) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = i / (n * 2) * Math.PI * 2, r = (i % 2 ? rIn : rOut) * (0.8 + Math.random() * 0.4);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.closePath();
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function createHintArrow(scene, audio) {
  const arrow = buildArrow();
  arrow.visible = false;
  scene.add(arrow);
  const fx = new THREE.Group();                  // buraco, telhas soltas, cacos e poeira da rodada
  scene.add(fx);

  let phase = 'idle', t = 0, vy = 0, shake = 0, house = -1;
  let cx = 0, cz = 0, roofColor = '#888888';
  let surf = ROOF_SURF, tan = TAN, slope = THETA;   // telhado da casa; prédios têm laje plana e mais alta
  const pieces = [], puffs = [], smoke = [];
  let smokeT = 0;

  /** Altura do "chão" sob (x, z): telhado se estiver sobre a casa, grama caso contrário. */
  function floorAt(x, z) {
    const lx = x - (cx - HX), lz = z - (cz - HZ);
    if (lx > HS.x0 - 0.4 && lx < HS.x1 + 0.4 && lz > HS.z0 - 0.4 && lz < HS.z1 + 0.2) {
      return surf - Math.abs(lz - HZ) * tan + 0.06;
    }
    return GROUND_Y + 0.06;
  }

  function disposeFx() {
    for (const c of [...fx.children]) {
      fx.remove(c);
      c.traverse(o => {
        if (o.userData.ownGeo) o.geometry.dispose();
        if (o.userData.ownMat) o.material.dispose();
      });
    }
    pieces.length = 0; puffs.length = 0; smoke.length = 0;
  }

  function land() {
    phase = 'stuck'; t = 0; shake = 1;
    arrow.position.y = surf - EMBED;
    audio.crash && audio.crash();

    // crateras nas duas águas do telhado (uma grande junto à cumeeira e outra menor ao lado)
    for (const side of [1, -1]) {
      for (const [h, dx, rIn, rOut] of [[1.2, 0, 1.9, 3.3], [2.3, side * 2.6, 1.0, 1.8]]) {
        const g = new THREE.Group();
        g.position.set(cx + dx, surf - h * tan + 0.05, cz + side * h);
        g.rotation.x = side * slope;
        const m = new THREE.Mesh(holeGeometry(rIn, rOut, 8), mat(HOLE_COL));
        m.userData.ownGeo = true;
        g.add(m);
        // marca de queimado em volta
        const burn = new THREE.Mesh(holeGeometry(rOut * 0.95, rOut * 1.35, 10), mat("#3b2a1c"));
        burn.userData.ownGeo = true; burn.position.y = -0.01;
        g.add(burn);
        fx.add(g);
      }
    }
    // caibros quebrados espetados para fora do buraco
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.random() * 0.3;
      fx.add(at(box(0.28, 0.28, 3.4 + Math.random() * 1.6, i % 2 ? "#7a4e2c" : "#5e3b20"),
        cx + Math.cos(a) * 1.1, surf + 0.2, cz + Math.sin(a) * 0.9,
        0.5 + Math.random() * 0.7, a, (Math.random() - 0.5) * 0.8));
    }
    // telhas levantadas e tortas por todo o telhado
    const dark = new THREE.Color(roofColor).multiplyScalar(0.65).getStyle();
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, r = 2.4 + Math.random() * 3.2;
      const x = cx + Math.cos(a) * r * 1.2, z = cz + Math.sin(a) * r * 0.75;
      fx.add(at(box(0.95, 0.13, 0.65, i % 2 ? roofColor : dark), x, floorAt(x, z) + 0.15, z,
        (Math.random() - 0.5) * 1.6, Math.random() * 3, (Math.random() - 0.5) * 1.6));
    }
    // cacos voando: telhas, madeira e pedaços de parede
    for (let i = 0; i < 60; i++) {
      const m = i < 38 ? box(0.6, 0.13, 0.45, i % 3 ? roofColor : dark)
        : i < 50 ? box(1.3, 0.18, 0.22, "#8a5a36") : box(0.5, 0.35, 0.4, "#efe3cc");
      const a = Math.random() * Math.PI * 2, sp = 5 + Math.random() * 10;
      m.position.set(cx, surf + 0.3, cz);
      fx.add(m);
      pieces.push({ m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 8 + Math.random() * 11,
        rx: (Math.random() - 0.5) * 14, rz: (Math.random() - 0.5) * 14, rest: false });
    }
    // nuvem de poeira grande
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 0),
        new THREE.MeshStandardMaterial({ color: "#d8ccb4", roughness: 1, flatShading: true, transparent: true, opacity: 0.85, depthWrite: false }));
      m.userData.ownGeo = true; m.userData.ownMat = true;
      const a = Math.random() * Math.PI * 2;
      m.position.set(cx, surf, cz);
      fx.add(m);
      puffs.push({ m, vx: Math.cos(a) * (3 + Math.random() * 5), vz: Math.sin(a) * (3 + Math.random() * 5), vy: 1.5 + Math.random() * 3, life: 0 });
    }
    // fumaça escura saindo do buraco sem parar (até a próxima rodada)
    smokeT = 0;
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0),
        new THREE.MeshStandardMaterial({ color: "#4a4540", roughness: 1, flatShading: true, transparent: true, opacity: 0.7, depthWrite: false }));
      m.userData.ownGeo = true; m.userData.ownMat = true;
      fx.add(m);
      smoke.push({ m, off: i / 8 });
    }
  }

  return {
    /** Solta a seta sobre a casa `h`, que está no lote `slot`. */
    drop(h, slot) {
      this.clear();
      house = h;
      const o = slotOrigin(slot);
      cx = o.x + HX; cz = o.z + HZ;
      roofColor = ROOF_COL[HOUSES[h].roof] || '#8f8a82';      // prédios: laje cinza
      const kind = HOUSES[h].kind;
      surf = kind === 'apt' ? GROUND_Y + aptHeight(HOUSES[h]) + 0.1 : kind === 'fut' ? GROUND_Y + futTopY(HOUSES[h]) + 0.1 : kind === 'shop' ? GROUND_Y + 6.7 : kind === 'ware' ? GROUND_Y + 8.4 : ROOF_SURF;
      surf += TERRAIN.h(cx, cz);                              // Bairro 9: lotes no alto da encosta
      tan = kind === 'house' ? TAN : 0; slope = kind === 'house' ? THETA : 0;
      arrow.position.set(cx, START_Y, cz);
      arrow.rotation.set(0, 0, 0);
      arrow.visible = true;
      vy = 0; t = 0; phase = 'fall';
      audio.whistle && audio.whistle();
    },

    /** A seta sobe de volta ao céu (o telhado continua quebrado até o fim da rodada). */
    retract() { if (phase === 'stuck' || phase === 'fall') { phase = 'leave'; vy = 0; } },

    /** Remove tudo (início de uma nova rodada). */
    clear() {
      phase = 'idle'; house = -1; shake = 0;
      arrow.visible = false;
      disposeFx();
    },

    update(dt) {
      t += dt;
      if (phase === 'fall') {
        vy += GRAVITY * dt;
        arrow.position.y -= vy * dt;
        arrow.rotation.y += dt * 2.5;
        if (arrow.position.y <= surf - EMBED) land();
      } else if (phase === 'stuck') {
        const k = Math.exp(-t * 2.5);
        arrow.rotation.z = Math.sin(t * 22) * 0.16 * k;
        arrow.rotation.x = Math.cos(t * 19) * 0.09 * k;
      } else if (phase === 'leave') {
        vy += 60 * dt;
        arrow.position.y += vy * dt;
        if (arrow.position.y > START_Y) { phase = 'gone'; arrow.visible = false; }
      }
      shake = Math.max(0, shake - dt * 2.2);

      smokeT += dt;
      for (const p of smoke) {
        const ph = (smokeT * 0.35 + p.off) % 1;
        p.m.position.set(cx + ph * 3 + Math.sin(smokeT + p.off * 9) * 0.6, surf + 0.5 + ph * 12, cz + ph * 1.5);
        p.m.scale.setScalar(0.8 + ph * 2.6);
        p.m.material.opacity = 0.7 * (1 - ph);
      }
      for (const p of pieces) {
        if (p.rest) continue;
        p.vy -= 28 * dt;
        p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.rotation.x += p.rx * dt; p.m.rotation.z += p.rz * dt;
        const f = floorAt(p.m.position.x, p.m.position.z);
        if (p.vy < 0 && p.m.position.y <= f) { p.m.position.y = f; p.rest = true; }
      }
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.life += dt;
        const s = 0.8 + p.life * 2.6;
        p.m.scale.setScalar(s);
        p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
        p.m.material.opacity = Math.max(0, 0.85 * (1 - p.life / 2.2));
        if (p.life > 2.2) {
          fx.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); puffs.splice(i, 1);
        }
      }
    },

    get house() { return house; },
    get landed() { return phase === 'stuck' || phase === 'leave' || phase === 'gone'; },
    get timeSinceLanding() { return phase === 'stuck' ? t : phase === 'leave' || phase === 'gone' ? 99 : 0; },
    get active() { return phase === 'fall' || phase === 'stuck'; },
    get shake() { return shake; },
    arrow,
    /** Leva a seta e os efeitos para a cena do bairro ativo. */
    attach(scene) { scene.add(arrow); scene.add(fx); },
  };
}
