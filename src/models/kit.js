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
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
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
