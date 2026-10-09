// Tinta da van (Shop → Pintura): material único e compartilhado por todas as vans (jogo, tela inicial, Shop e a mini van do bagageiro).
import * as THREE from 'three';

export const VAN_PAINT_DEFAULT = '#ff7a1a';
export const PAINT = new THREE.MeshStandardMaterial({ color: VAN_PAINT_DEFAULT, roughness: 0.85, flatShading: true });
export const setVanPaint = hex => PAINT.color.set(hex);
export const getVanPaint = () => '#' + PAINT.color.getHexString();
