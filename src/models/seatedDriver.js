// Motorista sentado na van do menu ("Jogar"): janela aberta de verdade + o MESMO esqueleto do personagem (buildBody)
// sentado dentro da cabine, com o braço apoiado na janela. Tudo preso à carroceria da van (acompanha a suspensão).
import * as THREE from 'three';
import { buildBody, BODY } from './driver.js';

/** Monta a janela "aberta" e o motorista na carroceria `body` (coordenadas da van). Retorna as juntas para animar/testar. */
export function buildSeatedDriver(body) {
  // janela aberta de verdade: o vão escuro marca o stencil e "apaga" a profundidade da lataria só ali,
  // então o motorista DENTRO da cabine aparece pela janela e a porta continua escondendo o resto do corpo
  const win = new THREE.Shape();
  [[0.55, 1.5], [1.42, 1.5], [0.95, 2.06], [0.55, 2.06]].forEach(([x, y], i) => (i ? win.lineTo(x, y) : win.moveTo(x, y)));
  const winGeo = new THREE.ShapeGeometry(win);
  const portal = (m, order) => { const o = new THREE.Mesh(winGeo, m); o.position.z = -1.27; o.rotation.y = Math.PI; o.scale.x = -1; o.renderOrder = order; body.add(o); return o; };   // preso à carroceria (acompanha a suspensão)
  portal(new THREE.MeshBasicMaterial({ color: '#2a2622', side: THREE.DoubleSide, depthWrite: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp }), 1);
  portal(new THREE.ShaderMaterial({
    vertexShader: 'void main(){ vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); p.z = p.w * 0.99999; gl_Position = p; }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.0); }',
    colorWrite: false, depthFunc: THREE.AlwaysDepth, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
  }), 2);

  // motorista sentado: o MESMO esqueleto do personagem (buildBody), menor por igual, girado um pouco para a janela,
  // preso à carroceria (acompanha a suspensão e o bagageiro pesado). Tronco e pescoço atrás da porta; pela janela aparecem
  // cabeça, pescoço e o ombro (atrás e abaixo da cabeça); o braço sai desse ombro, desce para a frente até o cotovelo
  // apoiado no peitoril e o antebraço fica pendurado por fora, rente à porta. Tudo em coordenadas da carroceria.
  const S = 0.4, PSI = 0.5, DOOR_Z = -1.25, SILL_Y = 1.5;
  const driver = new THREE.Group();
  driver.position.set(0.84, 1.35 - BODY.torsoY * S, DOOR_Z + 0.135);      // base do tronco em y = 1,35; lado do tronco um pouco para dentro da porta
  driver.rotation.y = PSI;
  driver.scale.setScalar(S);
  body.add(driver);
  const rig = buildBody(driver, { flatHands: true });
  const head = rig.head;
  head.rotation.order = 'YXZ';
  const HEAD_YAW = 1.15 - PSI;                                     // rosto virado para a câmera (−Z) e um pouco para a frente
  head.rotation.y = HEAD_YAW;
  for (const l of rig.legs) { l.hip.rotation.order = 'YXZ'; l.hip.rotation.set(0, -PSI, Math.PI / 2); l.knee.rotation.z = -Math.PI / 2; }   // sentado, pernas para a frente da van
  const [near, far] = rig.arms;                                    // near = lado −Z (janela)
  far.sh.rotation.z = 0.05; far.elbow.rotation.z = 0.35;           // outro braço caído junto ao corpo (abaixo da janela, atrás do tronco)
  // braço da janela: ombro → cotovelo → punho orientados pelos pontos reais (sem peças soltas)
  body.updateMatrixWorld(true);
  const bodyQ = body.getWorldQuaternion(new THREE.Quaternion());
  const toLocal = (obj, q) => obj.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(bodyQ).multiply(q);   // q no espaço da carroceria
  const aim = down => {                                            // quaternion cujo −Y aponta para `down` e o X fica para a frente (+X)
    const y = down.clone().normalize().negate(), x = new THREE.Vector3(1, 0, 0).addScaledVector(y, -y.x).normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const sh = body.worldToLocal(near.sh.getWorldPosition(new THREE.Vector3()));   // ombro
  const LU = BODY.upperArm * S, RF = 0.074 * S, LF = BODY.foreArm * S, RW = 0.062 * S;   // braço, raio do cotovelo, antebraço, raio do punho (medidas do buildBody)
  const EZ = DOOR_Z - RF - 0.002;                                  // cotovelo logo por fora da porta (antebraço não atravessa a lataria)
  const elbowAt = new THREE.Vector3();
  const place = ey => {                                            // cotovelo na altura ey; o resto do comprimento do braço vai para a frente
    elbowAt.set(sh.x + Math.sqrt(Math.max(0, LU * LU - (EZ - sh.z) ** 2 - (ey - sh.y) ** 2)), ey, EZ);
    near.sh.quaternion.copy(toLocal(near.sh, aim(elbowAt.clone().sub(sh))));
    near.sh.updateMatrixWorld(true);
  };
  // ponto mais baixo da manga/braço que ainda está por dentro da porta (não pode descer do peitoril, senão atravessa a lataria)
  const armMeshes = near.sh.children.filter(o => o.isMesh), v = new THREE.Vector3(), m4 = new THREE.Matrix4(), bodyInv = new THREE.Matrix4().copy(body.matrixWorld).invert();
  const lowestInside = () => {
    let lo = Infinity;
    for (const m of armMeshes) {
      m4.multiplyMatrices(bodyInv, m.matrixWorld);
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m4); if (v.z > DOOR_Z && v.y < lo) lo = v.y; }
    }
    return lo;
  };
  // começa com o cotovelo pousado em cima do peitoril e desce (o braço inclina para baixo) enquanto a manga continuar por cima da borda
  let ey = SILL_Y + RF + 0.002;
  for (let k = 0; k < 8; k++) { place(ey - 0.002); if (lowestInside() < SILL_Y + 0.002) break; ey -= 0.002; }
  place(ey);
  // antebraço pendurado reto para baixo, rente à porta por fora (o punho fica a ~3 mm da lataria)
  const fz = (DOOR_Z - RW - 0.003) - EZ, fx = 0.01;
  near.elbow.quaternion.copy(toLocal(near.elbow, aim(new THREE.Vector3(fx, -Math.sqrt(LF * LF - fz * fz - fx * fx), fz))));
  driver.userData.elbow = elbowAt;
  // o que fica DENTRO da cabine só aparece pelo vão da janela (stencil): a porta esconde o resto, sem pontinhos vazando pela lataria.
  // Materiais próprios do menu, mas com a MESMA cor dos materiais do Shop (o objeto Color é compartilhado).
  const nearArm = new Set(); near.sh.traverse(o => o.isMesh && nearArm.add(o));
  const insideMats = new Map();
  const insideMat = m => {
    let c = insideMats.get(m);
    if (!c) {
      c = m.clone(); c.color = m.color;
      Object.assign(c, { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
      insideMats.set(m, c);
    }
    return c;
  };
  driver.traverse(o => {
    if (!o.isMesh) return;
    o.renderOrder = 3;                                             // desenhado depois do "vão" da janela
    o.castShadow = o.receiveShadow = false;
    if (!nearArm.has(o)) o.material = insideMat(o.material);
  });

  return { driver, rig, head, near, far, elbowAt, S, DOOR_Z, SILL_Y };
}
