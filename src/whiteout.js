// Aparência branca temporária (passagens narrativas): troca o material de cada malha por um branco #FFFFFF
// com o mesmo sombreamento (volumes continuam legíveis). Não mexe nos materiais originais nem na customização salva:
// só guarda as referências e devolve tudo em restore(). Reutilizável em qualquer cena (jogador, van, …).
import * as THREE from 'three';

const WHITE = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, metalness: 0, flatShading: true });
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
