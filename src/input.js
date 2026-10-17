// Teclado: WASD/setas para dirigir, E/Espaço/Enter para interagir, C para alternar a câmera.
export function createInput(onFirstKey) {
  const keys = new Set(), pressed = new Set();
  const vkeys = new Set(), vaxis = { x: 0, z: 0 };   // toque (touch.js): teclas seguradas por botões e o joystick (analógico)
  let unlocked = false;
  addEventListener('keydown', e => {
    if (!unlocked) { unlocked = true; onFirstKey && onFirstKey(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;   // atalhos do navegador (Ctrl+F, Ctrl+C…) não disparam míssil/câmera
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); vkeys.clear(); vaxis.x = vaxis.z = 0; });
  addEventListener('contextmenu', () => keys.clear());   // o menu do navegador engole o keyup: nada fica preso
  addEventListener('pointerdown', () => onFirstKey && onFirstKey());

  const any = (...codes) => codes.some(c => keys.has(c) || vkeys.has(c));
  const clamp1 = v => Math.max(-1, Math.min(1, v));
  return {
    /** Direção desejada na tela: x (−1 esquerda … 1 direita), z (−1 para cima/norte … 1 para baixo/sul). */
    axis() {
      return {
        x: clamp1((any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0) + vaxis.x),
        z: clamp1((any('KeyS', 'ArrowDown') ? 1 : 0) - (any('KeyW', 'ArrowUp') ? 1 : 0) + vaxis.z),
      };
    },
    action: () => pressed.has('KeyE') || pressed.has('Space') || pressed.has('Enter'),
    /** Tecla segurada agora (teclado ou botão de toque segurado). */
    held: code => keys.has(code) || vkeys.has(code),
    /** Navegação em menus: setas/WASD, um passo por toque. */
    nav() {
      const p = (...c) => c.some(k => pressed.has(k));
      return { x: (p('KeyD', 'ArrowRight') ? 1 : 0) - (p('KeyA', 'ArrowLeft') ? 1 : 0), y: (p('KeyS', 'ArrowDown') ? 1 : 0) - (p('KeyW', 'ArrowUp') ? 1 : 0) };
    },
    walk: () => pressed.has('KeyL'),          // sair da van / (E perto dela volta a dirigir)
    toggleCamera: () => pressed.has('KeyC'),
    hint: () => pressed.has('KeyT'),
    heli: () => pressed.has('KeyH'),
    /** Helicóptero: Espaço sobe (+1), Shift desce (−1). */
    lift: () => (any('Space') ? 1 : 0) - (any('ShiftLeft', 'ShiftRight') ? 1 : 0),
    fire: () => pressed.has('KeyF'),
    missions: () => pressed.has('KeyM'),
    endFrame: () => pressed.clear(),
    // usados pelos testes automatizados
    _press(code) { pressed.add(code); },
    _hold(code, on = true) { on ? keys.add(code) : keys.delete(code); },
    // controles de toque (touch.js): separados do teclado (soltar um não solta o outro)
    touchAxis(x, z) { vaxis.x = x; vaxis.z = z; },
    touchHold(code, on) { on ? vkeys.add(code) : vkeys.delete(code); },
    touchReset() { vaxis.x = vaxis.z = 0; vkeys.clear(); },
  };
}
