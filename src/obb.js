/**
 * Caixa girada (OBB) de um retângulo local x0..x1 × z0..z1 de um lote virado em ry, levado ao mundo por toW(x, z).
 * Devolve a caixa alinhada aos eixos que envolve os 4 cantos (câmera, testes rápidos) + `obb` (colisão exata a pé, em walker.js).
 */
export function obbBox(toW, ry, x0, z0, x1, z1) {
  const p = [toW(x0, z0), toW(x1, z0), toW(x0, z1), toW(x1, z1)], m = toW((x0 + x1) / 2, (z0 + z1) / 2);
  return {
    x0: Math.min(...p.map(q => q.x)), x1: Math.max(...p.map(q => q.x)), z0: Math.min(...p.map(q => q.z)), z1: Math.max(...p.map(q => q.z)),
    obb: { cx: m.x, cz: m.z, c: Math.cos(ry), s: Math.sin(ry), hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 },
  };
}
/** O ponto (x, z) está a menos de r da caixa girada? (mesma convenção de toW: x' = x·c + z·s, z' = −x·s + z·c) */
export function obbHits(o, x, z, r) {
  const dx = x - o.cx, dz = z - o.cz, lx = dx * o.c - dz * o.s, lz = dx * o.s + dz * o.c;
  return Math.abs(lx) < o.hx + r && Math.abs(lz) < o.hz + r;
}
