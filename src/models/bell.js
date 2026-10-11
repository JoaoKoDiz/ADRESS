// Sino azul da igreja (1ª conversa): pendurado no arco da frente do 1º vão do corredor aberto (da esquerda para a direita,
// olhando a fachada de frente = x local −15). Só aparece na cena de saída; ao cair, fica no piso do corredor, lá em cima
// (atrás da balaustrada, sem encostar nela). Fica fora da fusão de malhas da igreja porque cai.
import * as THREE from 'three';

export const BELL_SPOT = { x: -15, y: 47.6, z: -1.25, floor: 40 };   // ponto de onde pende (local da igreja) e o piso do corredor

const S = 1.7;                                                       // grande o bastante para ser visto lá de baixo

export function buildBell() {
  const g = new THREE.Group();
  const blue = new THREE.MeshStandardMaterial({ color: '#003EFF', roughness: 0.45, metalness: 0.35, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 0.9, flatShading: true });
  // perfil do sino (y para baixo a partir do ponto de pendurar)
  const prof = [[0.01, 0], [0.42, 0.02], [0.62, -0.25], [0.7, -0.9], [0.82, -1.6], [1.12, -2.15], [1.2, -2.3], [1.05, -2.3], [0.9, -2.15]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 14), blue);
  body.material.side = THREE.DoubleSide;
  body.position.y = -0.55; g.add(body);
  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 5, 10), blue); crown.position.y = -0.38; g.add(crown);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), dark); clapper.position.y = -2.5; g.add(clapper);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 5), dark); rod.position.y = -1.6; g.add(rod);
  // corrente presa no arco (fica no lugar quando o sino se solta)
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 5), dark); chain.position.y = 0.05;
  const bell = new THREE.Group(); bell.add(g); g.scale.setScalar(S);
  const root = new THREE.Group(); root.add(chain, bell);
  root.position.set(BELL_SPOT.x, BELL_SPOT.y, BELL_SPOT.z);
  root.userData = { bell, materials: [blue, dark], h: 2.85 * S };
  return root;
}
