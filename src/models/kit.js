// Kit de modelagem compartilhado: materiais com cache, primitivas e "assar" (merge) de partes estáticas.
// Estilo: low-poly acolhedor, cores chapadas (flatShading), sombras suaves.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const matCache = new Map();
/** Material padrão (cacheado por cor+opções). Use sempre isto para que o merge por material funcione. */
export function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...opts });
    matCache.set(key, m);
  }
  return m;
}

const geoCache = new Map();
function cachedGeo(key, make) {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

/** Libera geometrias e materiais próprios de um grupo que saiu de cena (os do cache do kit e as texturas ficam). */
export function disposeTree(root) {
  const geos = new Set(geoCache.values()), mats = new Set(matCache.values());
  root.traverse(o => {
    if (o.userData.keep) return;                                  // (geometria/material compartilhados por quem criou)
    if (o.geometry && !o.isSprite && !geos.has(o.geometry)) o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) if (!mats.has(m)) m.dispose();
  });
}

/** Cria um Mesh com sombra. `material` pode ser uma cor (string) ou um THREE.Material. */
export function mesh(geometry, material, opts) {
  const m = new THREE.Mesh(geometry, typeof material === 'string' ? mat(material, opts) : material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// Primitivas centradas na origem (como as geometrias do three.js).
export const box = (w, h, d, color, opts) =>
  mesh(cachedGeo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), color, opts);
export const cyl = (rTop, rBottom, h, color, seg = 12, opts) =>
  mesh(cachedGeo(`c${rTop},${rBottom},${h},${seg}`, () => new THREE.CylinderGeometry(rTop, rBottom, h, seg)), color, opts);
export const sphere = (r, color, wSeg = 12, hSeg = 8, opts) =>
  mesh(cachedGeo(`s${r},${wSeg},${hSeg}`, () => new THREE.SphereGeometry(r, wSeg, hSeg)), color, opts);
export const cone = (r, h, color, seg = 12, opts) =>
  mesh(cachedGeo(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, opts);
export const torus = (r, tube, color, rSeg = 8, tSeg = 20, opts) =>
  mesh(cachedGeo(`t${r},${tube},${rSeg},${tSeg}`, () => new THREE.TorusGeometry(r, tube, rSeg, tSeg)), color, opts);

/** Posiciona (e opcionalmente rotaciona) um objeto; retorna o próprio objeto. */
export function at(obj, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  obj.position.set(x, y, z);
  obj.rotation.set(rx, ry, rz);
  return obj;
}

/** Cria um Group com os filhos informados. */
export function group(...children) {
  const g = new THREE.Group();
  children.forEach(c => c && g.add(c));
  return g;
}

/** Marca um objeto como animado: bakeStatic() não o funde e ele continua acessível para update(). */
export function dynamic(obj) { obj.userData.dynamic = true; return obj; }

/**
 * Funde todos os meshes estáticos de `root` em um mesh por material (reduz draw calls drasticamente).
 * - Objetos marcados com dynamic() (e seus descendentes) são preservados como estão.
 * - Filhos de meshes estáticos são religados ao avô antes da remoção (mantendo a transformação).
 * - Chame depois de montar tudo; a transformação do próprio root é preservada.
 */
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const toRemove = [];
  const isDynamic = o => { for (let p = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true; return false; };
  root.traverse(o => {
    if (o === root || !o.isMesh || isDynamic(o)) return;
    const mtl = o.material;
    if (Array.isArray(mtl) || mtl.transparent) return; // mantém transparentes/multimaterial separados
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const keepUv = !!mtl.map && g.attributes.uv;                  // materiais com textura (pedregulho, placas) mantêm o UV
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(keepUv && k === 'uv')) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.morphAttributes = {};
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!buckets.has(mtl)) buckets.set(mtl, []);
    buckets.get(mtl).push(g);
    toRemove.push(o);
  });
  for (const o of toRemove) {
    const parent = o.parent;
    for (const c of [...o.children]) parent.attach(c);
    parent.remove(o);
  }
  for (const [mtl, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    const m = new THREE.Mesh(merged, mtl);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.baked = true;
    root.add(m);
  }
  return root;
}

/** Textura de texto (placas, letreiros). */
export function textTexture(text, { width = 512, height = 128, bg = '#8a5a36', fg = '#fff3d6', font = 'bold 64px "Trebuchet MS", sans-serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, width, height);
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, width / 2, height / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ---- personagens com superfície suave: mais segmentos nas formas arredondadas e sombreamento suave (sem facetas).
// As caixas continuam caixas (o estilo simples do jogo); só esferas, cilindros, cones, toros, cápsulas e tornos mudam.
const upCache = new WeakMap(), smCache = new WeakMap();
const segUp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n * 2)));
function upGeo(g) {
  if (upCache.has(g)) return upCache.get(g);
  const p = g.parameters; let n = g;
  if (p) switch (g.type) {
    case 'SphereGeometry': n = new THREE.SphereGeometry(p.radius, segUp(p.widthSegments, 18, 32), segUp(p.heightSegments, 12, 22), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength); break;
    case 'CylinderGeometry': n = new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height, segUp(p.radialSegments, 18, 32), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength); break;
    case 'ConeGeometry': n = new THREE.ConeGeometry(p.radius, p.height, segUp(p.radialSegments, 16, 28), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength); break;
    case 'TorusGeometry': n = new THREE.TorusGeometry(p.radius, p.tube, segUp(p.radialSegments, 8, 16), segUp(p.tubularSegments, 20, 40), p.arc); break;
    case 'CapsuleGeometry': n = new THREE.CapsuleGeometry(p.radius, p.length ?? p.height, segUp(p.capSegments, 6, 12), segUp(p.radialSegments, 14, 28)); break;
    case 'LatheGeometry': n = new THREE.LatheGeometry(p.points, segUp(p.segments, 20, 40), p.phiStart, p.phiLength); break;
  }
  upCache.set(g, n); return n;
}
function smoothMat(m) {
  if (!m || Array.isArray(m) || !m.flatShading) return m;
  if (!smCache.has(m)) { const c = m.clone(); c.flatShading = false; c.needsUpdate = true; smCache.set(m, c); }
  return smCache.get(m);
}
/** Deixa um personagem liso: troca geometrias arredondadas por versões com mais segmentos e materiais facetados pela versão suave.
 *  Chamar antes de bakeStatic. Peças com userData.keepFacets ficam como estão. */
export function smoothCharacter(root) {
  root.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.keepFacets) return;
    o.geometry = upGeo(o.geometry); o.material = smoothMat(o.material);
  });
  return root;
}
