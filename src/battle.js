// Batalha depois do 4º nível extra (Sacrifício) — STUB do contrato (será substituído pela implementação completa).
import * as THREE from 'three';

export const BATTLE_CP_KEY = 'adress.dev.battle';   // teste pelo cadeado: libera o cartão Sacrifício para começar a batalha

export function createBattle(ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#000000');
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 300);
  let active = false, fade = 0;
  return {
    scene, camera,
    start() { active = true; fade = 1; },
    stop() { active = false; fade = 0; },
    update(dt, paused) { if (!active || paused) return; fade = Math.max(0, fade - dt); },
    get active() { return active; }, get fade() { return fade; },
    get joystick() { return active; }, get actionLabel() { return null; },
    setFragmentHandler() {}, setFinaleHandler() {},
  };
}
