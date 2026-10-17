import type { Pose, Seat } from './network';

export type ActionKind = 'collect' | 'lever' | 'shoot' | 'timer' | 'dash' | 'switch' | 'talk' | 'support' | 'detach';
export type PuzzleAction = { kind: ActionKind; facing?: -1 | 1 };
export type WorldState = {
  unlocked: [boolean, boolean, boolean];
  bridge: boolean;
  vines: boolean;
  timerUntil: number;
  finalGate: boolean;
  checkpoint: 0 | 1 | 2;
};
export const PICKUPS = [
  { x: 145, y: 589, label: 'SALTO DUPLO', color: 0x83f990 },
  { x: 210, y: 589, label: 'ESTILINGUE', color: 0xffb36a },
  { x: 275, y: 589, label: 'DASH', color: 0x79bffc },
] as const;
export const LEVER = { x: 370, y: 385 };
export const TARGET = { x: 716, y: 577 };
export const PEDAL = { x: 817, y: 600 };
export const SWITCH = { x: 1100, y: 592 };
export const EXIT = { minX: 1150, maxX: 1200, minY: 525, maxY: 656 };
export const TIMER_MS = 1350;
export const CHECKPOINTS = [105, 559, 818] as const;
export const initialWorld = (): WorldState => ({
  unlocked: [false, false, false], bridge: false, vines: false, timerUntil: 0,
  finalGate: false, checkpoint: 0,
});
const near = (p: Pose, x: number, y: number, radiusX: number, radiusY: number): boolean =>
  Math.abs(p.x - x) <= radiusX && Math.abs(p.y - y) <= radiusY;
const bool = (x: unknown): x is boolean => typeof x === 'boolean';
export function validWorld(value: unknown): value is WorldState {
  if (value === null || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  return Array.isArray(w.unlocked) && w.unlocked.length === 3 && w.unlocked.every(bool)
    && bool(w.bridge) && bool(w.vines) && bool(w.finalGate)
    && typeof w.timerUntil === 'number' && Number.isFinite(w.timerUntil) && w.timerUntil >= 0
    && (w.checkpoint === 0 || w.checkpoint === 1 || w.checkpoint === 2);
}
export function validAction(value: unknown): value is PuzzleAction {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return ['collect', 'lever', 'shoot', 'timer', 'dash', 'switch', 'talk', 'support', 'detach'].includes(String(v.kind))
    && (v.facing === undefined || v.facing === -1 || v.facing === 1);
}

export class PuzzleAuthority {
  world = initialWorld();
  private lastShot = 0;
  private lastDash = 0;
  private dashOrigin = 0;
  private dashDuringTimer = 0;

  reset(): void {
    this.world = initialWorld();
    this.lastShot = 0; this.lastDash = 0; this.dashOrigin = 0; this.dashDuringTimer = 0;
  }
  /** Apenas o anfitrião chama. O assento deriva da DataConnection autenticada. */
  act(seat: Seat, action: PuzzleAction, poses: Pose[], now = Date.now()): boolean {
    const p = poses[seat];
    if (!p || p.seat !== seat) return false;
    switch (action.kind) {
      case 'collect': {
        if (this.world.unlocked[seat]) return false;
        const item = PICKUPS[seat];
        if (!near(p, item.x, item.y, 37, 48)) return false;
        this.world.unlocked[seat] = true;
        return true;
      }
      case 'lever':
        if (seat !== 0 || !this.world.unlocked[0] || this.world.bridge) return false;
        if (!near(p, LEVER.x, LEVER.y, 61, 68)) return false;
        this.world.bridge = true;
        return true;
      case 'shoot':
        if (seat !== 1 || !this.world.unlocked[1] || this.world.vines) return false;
        if (now - this.lastShot < 470) return false;
        if (action.facing !== 1 && action.facing !== -1) return false;
        this.lastShot = now;
        // O projétil é horizontal, com origem ligeiramente acima do centro da personagem.
        const dy = Math.abs((p.y - 18) - TARGET.y);
        const dx = (TARGET.x - p.x) * action.facing;
        if (dy > 53 || dx < 0 || dx > 325) return false;
        this.world.vines = true;
        return true;
      case 'timer':
        if (seat !== 2 || !this.world.unlocked[2] || this.world.finalGate || !this.world.vines) return false;
        if (!near(p, PEDAL.x, PEDAL.y, 37, 55) || p.x > PEDAL.x + 24) return false;
        if (this.world.timerUntil > now) return false;
        this.world.timerUntil = now + TIMER_MS;
        this.dashDuringTimer = 0;
        return true;
      case 'dash':
        if (seat !== 2 || !this.world.unlocked[2] || now - this.lastDash < 1900) return false;
        this.lastDash = now;
        this.dashOrigin = p.x;
        this.dashDuringTimer = this.world.timerUntil > now && p.x <= 880 ? now : 0;
        // Dash visual e local continua sendo simulado somente pelo Nino.
        return false;
      case 'switch':
        if (seat !== 2 || !this.world.unlocked[2] || this.world.finalGate) return false;
        if (!this.world.bridge || !this.world.vines || now > this.world.timerUntil) return false;
        if (!near(p, SWITCH.x, SWITCH.y, 60, 73)) return false;
        if (this.dashDuringTimer === 0 || this.dashDuringTimer > now ||
            this.dashDuringTimer < this.world.timerUntil - TIMER_MS ||
            this.dashOrigin > 880 || p.x - this.dashOrigin < 175) return false;
        this.world.finalGate = true;
        this.world.timerUntil = 0;
        return true;
      default:
        // Novas interações pertencem ao ForestAuthority, não aos puzzles legados.
        return false;
    }
  }
  tick(poses: Pose[], now = Date.now()): boolean {
    let changed = false;
    if (!this.world.finalGate && this.world.timerUntil > 0 && now >= this.world.timerUntil) {
      this.world.timerUntil = 0;
      this.dashDuringTimer = 0;
      changed = true;
    }
    // Checkpoints cooperativos somente quando os 3 avançaram juntos.
    if (this.world.bridge && this.world.checkpoint < 1 && poses.every(p => p.x >= 545)) {
      this.world.checkpoint = 1;
      changed = true;
    }
    if (this.world.vines && this.world.checkpoint < 2 && poses.every(p => p.x >= 816)) {
      this.world.checkpoint = 2;
      changed = true;
    }
    return changed;
  }
  hasWon(poses: Pose[]): boolean {
    return this.world.bridge && this.world.vines && this.world.finalGate &&
      poses.every(p => p.x >= EXIT.minX && p.x <= EXIT.maxX && p.y >= EXIT.minY && p.y <= EXIT.maxY);
  }
}
