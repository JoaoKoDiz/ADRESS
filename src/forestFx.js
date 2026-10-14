// Nível 22 (Bosque): clima de outono. setup = céu levemente nublado, luz dourada suave, árvores de fora com copas de outono;
// folhas no chão (InstancedMesh: gramados, calçadas e beiras de rua) e algumas folhas caindo devagar perto do jogador
// (só visual: sem colisão, não mexem na van).
import * as THREE from 'three';
import { AUTUMN } from './models/forest.js';

const LEAF_COLS = ['#e8822a', '#d9701c', '#e8c23a', '#c63a24', '#9a6232', '#d24a2c', '#f0963a'];

export function createForestFx() {
  const root = new THREE.Group(); root.name = 'forest-fx';
  let fall = null, built = false, t = 0;
  const geo = new THREE.PlaneGeometry(0.34, 0.24); geo.rotateX(-Math.PI / 2);
  return {
    object: root,
    /** Uma vez, na criação do mundo do Bosque. */
    setup(w, V, MAP) {
      const sc = w.scene;
      sc.background = new THREE.Color('#d8cdb8'); if (sc.fog) { sc.fog.color.set('#d8cdb8'); sc.fog.near = 260; sc.fog.far = 900; }   // nublado claro, quente
      if (w.sunLight) { w.sunLight.intensity *= 0.85; w.sunLight.color.set('#ffd9a0'); }        // tarde dourada (sombras suaves)
      const hemi = sc.children.find(o => o.isHemisphereLight); if (hemi) { hemi.color.set('#fff0d8'); hemi.groundColor.set('#9a8a5a'); }
      // árvores de fora: copas verdes viram outono (cada cor original → uma cor de outono)
      const OUT = { '4f9a45': AUTUMN.orange[0], '5ea84e': AUTUMN.yellow[0], '3f8a3c': AUTUMN.red[0], '6db256': AUTUMN.yellow[1] };   // LEAVES de world.js
      sc.traverse(o => {
        if (!o.isMesh || !o.material || Array.isArray(o.material) || !o.material.color || o.parent?.name === 'neighborhood') return;
        const to = OUT[o.material.color.getHexString()]; if (!to) return;
        o.material = o.material.clone(); o.material.color.set(to);           // (cópia: o material é compartilhado com os outros bairros)
      });
      // folhas no chão: espalhadas fora das casas (na grama, nas calçadas e na beira das ruas); nada no meio da pista
      let s = 77; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const pts = [];
      for (let k = 0; pts.length < 2600 && k < 40000; k++) {
        const x = 2 + rnd() * (MAP - 4), z = 2 + rnd() * (MAP - 4), d = V.roadDist(x, z);
        if (d < 2.6 || V.spots.some(sp => Math.hypot(sp.px - x, sp.pz - z) < 6.5)) continue;
        if (d < 5.2 && rnd() < 0.3) continue;
        pts.push([x, z]);
        if (rnd() < 0.5) for (let j = 0; j < 3; j++) pts.push([x + (rnd() - 0.5) * 1.6, z + (rnd() - 0.5) * 1.6]);   // montinhos
      }
      const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), pts.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      pts.forEach(([x, z], i) => {
        e.set((rnd() - 0.5) * 0.3, rnd() * 6.3, (rnd() - 0.5) * 0.3); q.setFromEuler(e);
        const sc2 = 0.8 + rnd() * 0.9; m4.compose(new THREE.Vector3(x, V.h(x, z) + 0.13 + rnd() * 0.02, z), q, new THREE.Vector3(sc2, 1, sc2));
        im.setMatrixAt(i, m4); im.setColorAt(i, col.set(LEAF_COLS[Math.floor(rnd() * LEAF_COLS.length)]));
      });
      im.receiveShadow = true; im.frustumCulled = false; root.add(im);
      // folhas caindo: poucas, perto de quem joga
      const N = 60, fg = new THREE.PlaneGeometry(0.3, 0.22);
      fall = new THREE.InstancedMesh(fg, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), N); fall.frustumCulled = false;
      fall.userData.p = Array.from({ length: N }, () => ({ x: 0, z: 0, y: -1, sp: 0.6 + Math.random() * 0.5, ph: Math.random() * 6, rs: 1 + Math.random() * 2 }));
      for (let i = 0; i < N; i++) fall.setColorAt(i, col.set(LEAF_COLS[i % LEAF_COLS.length]));
      root.add(fall); sc.add(root); built = true;
    },
    /** p: posição de quem joga (van ou personagem). */
    update(dt, p) {
      if (!built || !fall) return;
      t += dt;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
      fall.userData.p.forEach((l, i) => {
        if (l.y < 0 || !p || Math.hypot(l.x - p.x, l.z - p.z) > 45) {   // renasce numa copa perto (acima de quem joga)
          if (!p) { l.y = -1; m4.makeScale(0, 0, 0); fall.setMatrixAt(i, m4); return; }
          const a = Math.random() * 6.3, r = 6 + Math.random() * 34; l.x = p.x + Math.cos(a) * r; l.z = p.z + Math.sin(a) * r; l.y = 4 + Math.random() * 6;
        }
        l.y -= l.sp * dt; const sw = Math.sin(t * 1.3 + l.ph);
        l.x += sw * 0.6 * dt; l.z += Math.cos(t * 0.9 + l.ph) * 0.4 * dt;
        e.set(sw * 0.9, t * l.rs + l.ph, Math.cos(t * l.rs + l.ph) * 0.8); q.setFromEuler(e);
        fall.setMatrixAt(i, m4.compose(v.set(l.x, l.y, l.z), q, one));
      });
      fall.instanceMatrix.needsUpdate = true;
    },
  };
}
