// Ciclo de caminhada compartilhado (jogador e K): pés plantados no chão por IK de 2 ossos (quadril → joelho → tornozelo),
// joelhos dobrando, pés levantando no balanço (calcanhar sobe antes, ponta sobe antes de apoiar), braços em oposição às pernas,
// pequeno giro/inclinação do tronco e transições suaves entre parado e andando. O ritmo sai da distância percorrida:
// durante o apoio o pé recua exatamente o que o corpo avança (não desliza). Em velocidade alta vira um trote leve (tempo no ar).
// Medidas em unidades LOCAIS do corpo (antes da escala do personagem). Modelos olhando para +X; rotation.z = para a frente.
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sstep = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/**
 * rig: { legs: [{ hip, knee, foot }], arms: [{ sh, elbow, wrist?, s }] } (mesma ordem de lados).
 * o: { L1 (coxa), L2 (canela), hip (altura da junta do quadril), ankle (altura do tornozelo em pé),
 *      stride (passo máximo), open/fwd/elbow/wrist (pose de repouso dos braços) }
 */
export function createGait(rig, o) {
  const { L1, L2, hip, ankle, stride = 0.5, open = 0.14, fwd = 0.05, elbow = 0.24, wrist = 0.08 } = o;
  let u = 0, amt = 0, vS = 0, dir = 1;
  const out = { bob: 0, lean: 0, twist: 0, sway: 0, amt: 0, u: 0 };

  function legIK(tx, ty) {                                       // alvo do tornozelo relativo ao quadril → (coxa, dobra do joelho)
    const d = clamp(Math.hypot(tx, ty), 0.05, L1 + L2 - 1e-4);
    const gam = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const alp = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    return [Math.atan2(tx, -ty) + alp, Math.PI - gam];
  }

  /** travel: distância andada neste quadro (local, + para a frente, − de ré). */
  function update(dt, travel) {
    dt = Math.max(dt, 1e-4);
    const v = travel / dt;
    vS += (v - vS) * Math.min(1, dt * 10);
    const av = Math.abs(vS);
    amt += ((av > 0.12 ? 1 : 0) - amt) * Math.min(1, dt * (av > 0.12 ? 7 : 5));
    if (Math.abs(vS) > 0.05) dir = vS > 0 ? 1 : -1;
    const sf = Math.min(1, av / 6);                               // 0 devagar … 1 trote
    const f = 1.2 + 0.33 * av;                                     // passos por segundo (ciclo completo) acompanham a velocidade
    const duty = clamp(stride * f / Math.max(av, 1e-3), 0.24, 0.62);
    const S = Math.min(stride, av * duty / f);                     // quanto o pé recua durante o apoio = quanto o corpo anda
    if (amt > 0.002) u = (u + dir * f * dt + 1) % 1;
    const drop = (0.02 + 0.04 * sf) * amt;                       // joelhos levemente dobrados ao andar (peso)
    const bob = -0.022 * sf * Math.cos(4 * Math.PI * (u - 0.08)) * amt;
    const hipY = hip - drop + bob, h = 0.055 + 0.075 * sf;
    const xs = [];
    rig.legs.forEach((l, i) => {
      const ui = (u + i * 0.5) % 1;
      let x, lift = 0, pitch = 0;
      if (ui < duty) {                                             // apoio: pé parado no chão, calcanhar sobe no fim
        const p = ui / duty; x = S / 2 - S * p;
        const e = sstep((p - 0.62) / 0.38); lift = 0.045 * e * e * (0.4 + sf); pitch = -0.45 * e * (0.4 + 0.6 * sf);
      } else {                                                     // balanço: levanta, leva à frente, ponta sobe e apoia
        const q = (ui - duty) / (1 - duty);
        x = -S / 2 + S * sstep(q);
        lift = h * Math.pow(Math.sin(Math.PI * q), 0.85) + 0.045 * (0.4 + sf) * Math.max(0, 1 - q * 4);
        pitch = (q < 0.75 ? -0.45 + 0.65 * sstep(q / 0.75) : 0.2 * (1 - sstep((q - 0.75) / 0.25))) * (0.4 + 0.6 * sf);
      }
      if (dir < 0) pitch *= 0.4;
      xs.push(x);
      const [th, bend] = legIK(x, ankle + lift - hipY);
      l.hip.rotation.z = th * amt;
      l.knee.rotation.z = -bend * amt;
      if (l.foot) l.foot.rotation.z = (pitch - th + bend) * amt;
    });
    const half = Math.max(S / 2, 1e-4), sk = Math.min(1, S / 0.18);
    rig.arms.forEach((a, i) => {
      const s = a.s || (i ? 1 : -1), n = clamp(xs[i] / half, -1, 1) * sk;
      const sw = -(0.22 + 0.3 * sf) * n * amt;                   // braço vai para trás quando a perna do mesmo lado vai à frente
      a.sh.rotation.set(-s * (open + 0.04 * sf * amt), 0, fwd + sw + 0.05 * sf * amt);
      a.elbow.rotation.set(0, 0, elbow + (0.18 + 0.4 * sf + 0.25 * Math.max(0, -n)) * amt);
      if (a.wrist) a.wrist.rotation.set(0, 0, wrist);
    });
    const n0 = clamp(xs[0] / half, -1, 1) * sk;
    out.bob = bob - drop; out.lean = (0.04 + 0.08 * sf) * amt * (dir < 0 ? 0.3 : 1);
    out.twist = -0.11 * (0.3 + sf) * n0 * amt;                    // quadril acompanha a perna da frente; o tronco contra-gira
    out.sway = -0.018 * Math.sin(2 * Math.PI * u) * amt * (1 - 0.5 * sf);
    out.amt = amt; out.u = u;
    return out;
  }
  return { update, get amt() { return amt; } };
}
