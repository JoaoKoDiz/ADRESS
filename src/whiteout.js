// Aparência branca temporária (passagens narrativas): troca o material de cada malha por um branco #FFFFFF
// com o mesmo sombreamento (volumes continuam legíveis). Não mexe nos materiais originais nem na customização salva:
// só guarda as referências e devolve tudo em restore(). Reutilizável em qualquer cena (jogador, van, …).
import * as THREE from 'three';

const WHITE = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0, flatShading: false });
const WHITE2 = WHITE.clone(); WHITE2.side = THREE.DoubleSide;

/** Deixa os objetos inteiramente brancos. Retorna uma função que desfaz exatamente o que foi feito. */
export function whiten(...roots) {
  const saved = [];
  for (const root of roots) root.traverse(o => {
    if (o.isSprite || o.isLine || o.isPoints) { saved.push([o, 'visible', o.visible]); o.visible = false; return; }   // brilhos e linhas somem
    if (!o.isMesh) return;
    const m = o.material, one = Array.isArray(m) ? m[0] : m;
    // decalques/textos transparentes (estampas, letreiro): no branco eles ficariam iguais à lataria; somem
    if (one && one.transparent && one.map) { saved.push([o, 'visible', o.visible]); o.visible = false; return; }
    saved.push([o, 'material', m]);
    const w = one && one.side === THREE.DoubleSide ? WHITE2 : WHITE;
    o.material = Array.isArray(m) ? m.map(() => w) : w;
  });
  return () => { for (let i = saved.length - 1; i >= 0; i--) { const [o, k, v] = saved[i]; o[k] = v; } saved.length = 0; };
}

/** Branco aos poucos (≈ whiten, mas com transição): step(k) com k de 0 a 1; em 1 vira o whiten() de sempre.
 *  Retorna { step, restore }: restore() desfaz tudo (com a transição pela metade ou já completa). */
export function whitenFade(...roots) {
  const saved = [], clones = new Map(), white = new THREE.Color('#ffffff'), black = new THREE.Color('#000000');
  for (const root of roots) root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material; if (Array.isArray(m)) return;
    let c = clones.get(m);
    if (!c) { c = { mat: m.clone(), color: m.color ? m.color.clone() : null, em: m.emissive ? m.emissive.clone() : null, op: m.opacity, rough: m.roughness, metal: m.metalness }; clones.set(m, c); }
    saved.push([o, m]); o.material = c.mat;
  });
  let undoFull = null;
  return {
    step(k) {
      if (undoFull) return;
      k = Math.max(0, Math.min(1, k));
      if (k >= 1) {                                       // completo: os materiais brancos de sempre (mesmo resultado do whiten)
        for (const [o, m] of saved) o.material = m;
        for (const c of clones.values()) c.mat.dispose();
        undoFull = whiten(...roots); return;
      }
      for (const c of clones.values()) {
        const t = c.mat;
        if (c.color) t.color.copy(c.color).lerp(white, k);
        if (c.em) t.emissive.copy(c.em).lerp(black, k);
        if (t.transparent && t.map) t.opacity = c.op * (1 - k);   // estampas e letreiro somem
        if (t.roughness !== undefined && c.rough !== undefined) t.roughness = c.rough + (0.85 - c.rough) * k;
        if (t.metalness !== undefined && c.metal !== undefined) t.metalness = c.metal * (1 - k);
      }
    },
    get done() { return !!undoFull; },
    restore() {
      if (undoFull) { undoFull(); undoFull = null; return; }
      for (const [o, m] of saved) o.material = m;
      for (const c of clones.values()) c.mat.dispose();
      saved.length = 0;
    },
  };
}
