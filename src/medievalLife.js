// STUB TEMPORÁRIO da integração (para o jogo compilar enquanto o Agente B escreve este módulo).
// O Agente B substitui este arquivo inteiro pela versão real (mesma API).
import * as THREE from 'three';
export function createMedievalLife() {
  const object = new THREE.Group();
  return { object, setup() {}, layout() {}, update() {}, nearTalk() { return null; }, talk() { return [['…']]; }, endTalk() {}, obstacles() { return []; }, silence() {}, detach() { if (object.parent) object.parent.remove(object); } };
}
