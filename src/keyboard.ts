/**
 * Teclas de ação independentes do foco do canvas Phaser.
 * Captura no window antes dos botões HTML. Um keydown físico = uma ação;
 * não duplicar salto duplo com eventos de repetição do sistema operacional.
 */
export type GameAction = 'jump' | 'slingshot' | 'dash';
export function actionFromKey(code: string): GameAction | null {
  switch (code) {
    case 'Space':
    case 'ArrowUp': return 'jump';
    case 'KeyJ': return 'slingshot';
    case 'ShiftLeft':
    case 'ShiftRight': return 'dash';
    default: return null;
  }
}

export class GameKeys {
  private enabled = false;
  private pressed = new Set<string>();
  private pending = new Set<GameAction>();
  private registered = false;

  setEnabled(enabled: boolean): void {
    if (this.enabled !== enabled) {
      this.enabled = enabled;
      this.clear();
    }
  }
  clear(): void {
    this.pressed.clear();
    this.pending.clear();
  }
  keyDown(code: string, repeat = false): boolean {
    const action = actionFromKey(code);
    if (!this.enabled || !action) return false;
    if (!repeat && !this.pressed.has(code)) this.pending.add(action);
    this.pressed.add(code);
    return true;
  }
  keyUp(code: string): void {
    this.pressed.delete(code);
  }
  consumeJump(): boolean {
    return this.consume('jump');
  }
  consumeSkill(seat: number | null): boolean {
    if (seat === 1) return this.consume('slingshot');
    if (seat === 2) return this.consume('dash');
    return false;
  }
  private consume(action: GameAction): boolean {
    if (!this.enabled || !this.pending.has(action)) return false;
    this.pending.delete(action);
    return true;
  }
  bind(): void {
    if (this.registered) return;
    this.registered = true;
    window.addEventListener('keydown', event => {
      const mapped = this.keyDown(event.code, event.repeat);
      if (mapped) event.preventDefault();
    }, { capture: true });
    window.addEventListener('keyup', event => {
      const mapped = this.enabled && actionFromKey(event.code) !== null;
      this.keyUp(event.code);
      if (mapped) event.preventDefault();
    }, { capture: true });
    window.addEventListener('blur', () => this.clear());
  }
}

export const gameKeys = new GameKeys();
