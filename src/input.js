// Teclado: WASD/setas para dirigir, E/Espaço/Enter para interagir, C para alternar a câmera.
export function createInput(onFirstKey) {
  const keys = new Set(), pressed = new Set();
  let unlocked = false;
  addEventListener('keydown', e => {
    if (!unlocked) { unlocked = true; onFirstKey && onFirstKey(); }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  addEventListener('pointerdown', () => onFirstKey && onFirstKey());

  const any = (...codes) => codes.some(c => keys.has(c));
  return {
    /** Direção desejada na tela: x (−1 esquerda … 1 direita), z (−1 para cima/norte … 1 para baixo/sul). */
    axis() {
      return {
        x: (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0),
        z: (any('KeyS', 'ArrowDown') ? 1 : 0) - (any('KeyW', 'ArrowUp') ? 1 : 0),
      };
    },
    action: () => pressed.has('KeyE') || pressed.has('Space') || pressed.has('Enter'),
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
    lift: () => (keys.has('Space') ? 1 : 0) - (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 1 : 0),
    fire: () => pressed.has('KeyF'),
    missions: () => pressed.has('KeyM'),
    endFrame: () => pressed.clear(),
    // usados pelos testes automatizados
    _press(code) { pressed.add(code); },
    _hold(code, on = true) { on ? keys.add(code) : keys.delete(code); },
  };
}
