// Órbita: "mapa local" sobre a lua esférica. A física, as colisões, a câmera e as entregas continuam no plano (x, z);
// esse plano é o plano tangente num ponto O da esfera (o jogador), com a base (E = leste do mapa, S = sul do mapa)
// transportada ao longo do caminho. A cada quadro o ponto O é levado até o jogador (recenter) e a lua inteira é
// desenhada girada por baixo dele (matrix): o jogador fica sempre "em cima", com a gravidade apontando para o centro.
// Coordenadas do mapa ↔ esfera: projeção azimutal equidistante centrada em O (distâncias a partir de O exatas).
import * as THREE from 'three';
import { MOON } from './moonPlan.js';

const R = MOON.R;
const _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();

export function createMoonFrame() {
  const O = new THREE.Vector3(0, 1, 0), E = new THREE.Vector3(1, 0, 0), S = new THREE.Vector3(0, 0, 1);
  let ox = 0, oz = 0;
  const M = new THREE.Matrix4();
  function build(o, e, s, x, z, out) {
    out.makeBasis(e, o, s).transpose();
    return out.setPosition(x, -R, z);
  }
  const api = {
    get O() { return O; }, get E() { return E; }, get S() { return S; }, get ox() { return ox; }, get oz() { return oz; },
    /** Começa com O = p (unitário), E na direção tangente f, e o ponto p nas coordenadas (x, z) do mapa. */
    reset(p, f, x, z) {
      O.copy(p).normalize(); E.copy(f).addScaledVector(O, -f.dot(O)).normalize(); S.copy(E).cross(O);
      ox = x; oz = z; build(O, E, S, ox, oz, M);
    },
    /** Mapa → ponto unitário da esfera. */
    toSphere(x, z, out = new THREE.Vector3()) {
      const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz);
      if (d < 1e-9) return out.copy(O);
      const a = d / R;
      return out.copy(O).multiplyScalar(Math.cos(a)).addScaledVector(E, dx / d * Math.sin(a)).addScaledVector(S, dz / d * Math.sin(a)).normalize();
    },
    /** Ponto unitário da esfera → mapa ({ x, z }). */
    toChart(p, out = { x: 0, z: 0 }) {
      const c = Math.max(-1, Math.min(1, p.dot(O)));
      _v.copy(p).addScaledVector(O, -c);
      const s = _v.length();
      if (s < 1e-9) { out.x = c > 0 ? ox : ox + Math.PI * R; out.z = oz; return out; }
      const a = Math.atan2(s, c) * R;
      out.x = ox + a * _v.dot(E) / s; out.z = oz + a * _v.dot(S) / s;
      return out;
    },
    /** Direção tangente f no ponto p → ângulo no mapa (heading: atan2(dz, dx)). */
    heading(p, f) {
      _q.setFromUnitVectors(p, O); _v.copy(f).applyQuaternion(_q);
      return Math.atan2(_v.dot(S), _v.dot(E));
    },
    /** Ângulo no mapa → direção tangente no ponto p. */
    tangent(p, heading, out = new THREE.Vector3()) {
      out.copy(E).multiplyScalar(Math.cos(heading)).addScaledVector(S, Math.sin(heading));
      _q.setFromUnitVectors(O, p); return out.applyQuaternion(_q).addScaledVector(p, -out.dot(p)).normalize();
    },
    /** Leva O até o ponto (x, z) do mapa (transporte paralelo da base: andar reto continua reto). */
    recenter(x, z) {
      const P = api.toSphere(x, z, new THREE.Vector3());
      _q.setFromUnitVectors(O, P);
      E.applyQuaternion(_q); O.copy(P); E.addScaledVector(O, -E.dot(O)).normalize(); S.copy(E).cross(O);
      ox = x; oz = z; build(O, E, S, ox, oz, M);
    },
    /** Matriz da lua (esfera → mundo) neste quadro. */
    get matrix() { return M; },
    /** Matriz que a lua teria se o mapa fosse recentrado em (x, z) — para fixar efeitos (seta, explosões) num lugar da lua. */
    frameAt(x, z, out = new THREE.Matrix4()) {
      const P = api.toSphere(x, z, new THREE.Vector3());
      _q.setFromUnitVectors(O, P);
      const e = E.clone().applyQuaternion(_q); e.addScaledVector(P, -e.dot(P)).normalize();
      return build(P, e, e.clone().cross(P), x, z, out);
    },
    /** Pose (posição + rotação) de um objeto sobre a esfera: em cima = p, frente (+Z do modelo) = f; lift acima do chão. */
    pose(obj, p, f, lift = 0) {
      obj.position.copy(p).multiplyScalar(R + lift);
      _v.copy(p).cross(f).normalize();                       // +X do modelo = cima × frente
      _m.makeBasis(_v, p, f); obj.quaternion.setFromRotationMatrix(_m);
      return obj;
    },
  };
  return api;
}
/** O referencial único do jogo (só vale no Bairro Órbita). */
export const FRAME = createMoonFrame();
