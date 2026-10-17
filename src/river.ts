import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';

export type RiverWorld = {
  partA: boolean; partB: boolean; partC: boolean;
  moved: boolean; moveAt: number;
  timerUntil: number; pressure: boolean; shotUntil: number;
  finalGate: boolean; checkpoint: 0 | 1 | 2;
};
export const RIVER = {
  lever: { x: 213, y: 377 },
  target: { x: 477, y: 576 },
  timer: { x: 681, y: 597 },
  switch: { x: 917, y: 590 },
  plate: { x: 944, y: 605 },
  finalTarget: { x: 1065, y: 574 },
  finalSwitch: { x: 1098, y: 596 },
  exit: { x: 1180, y: 599 },
} as const;
export const RIVER_SPAWNS: Pose[] = [
  { seat: 0, x: 82, y: 593, vx: 0, vy: 0 },
  { seat: 1, x: 128, y: 593, vx: 0, vy: 0 },
  { seat: 2, x: 174, y: 593, vx: 0, vy: 0 },
];
export const RIVER_CHECKPOINTS = [96, 565, 918] as const;
export const RIVER_TIMER_MS = 3900;
export const FINAL_WINDOW_MS = 4800;
export function initialRiver(): RiverWorld {
  return { partA: false, partB: false, partC: false, moved: false, moveAt: 0,
    timerUntil: 0, pressure: false, shotUntil: 0, finalGate: false, checkpoint: 0 };
}
const near = (pose: Pose, point: {x:number; y:number}, dx = 54, dy = 85): boolean =>
  Math.abs(pose.x - point.x) <= dx && Math.abs(pose.y - point.y) <= dy;
export function validRiver(value: unknown): value is RiverWorld {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  return ['partA','partB','partC','moved','pressure','finalGate'].every(k => typeof r[k] === 'boolean')
    && ['moveAt','timerUntil','shotUntil'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && (r[k] as number) >= 0)
    && (r.checkpoint === 0 || r.checkpoint === 1 || r.checkpoint === 2);
}
/**
 * Autoridade dos puzzles do rio. Mensagens de convidados nunca contêm WorldState,
 * nem podem estabelecer posições, identidade ou vitória por eventos arbitrários.
 */
export class RiverAuthority {
  world = initialRiver();
  private lastShot = 0;
  private lastDash = 0;
  private dashFrom = 0;
  private dashAt = 0;
  private finalDashFrom = 0;
  private finalDashAt = 0;
  reset(): void { this.world = initialRiver(); this.lastShot=0; this.lastDash=0; this.dashFrom=0; this.dashAt=0; this.finalDashFrom=0; this.finalDashAt=0; }
  act(seat: Seat, action: PuzzleAction, poses: Pose[], unlocked: boolean[], now = Date.now()): boolean {
    const p = poses[seat];
    if (!p || p.seat !== seat || !unlocked[seat]) return false;
    const w = this.world;
    const lookRight = action.facing === 1;
    if (action.kind === 'lever') {
      if (seat !== 0 || w.partA || !near(p, RIVER.lever, 64, 60)) return false;
      w.partA = true;
      w.moved = true; w.moveAt = now + 650; // mesmo instante determinístico para todos
      return true;
    }
    if (action.kind === 'shoot') {
      if (seat !== 1 || !lookRight || now - this.lastShot < 450) return false;
      this.lastShot = now;
      const canHit = (target: {x:number;y:number}) =>
        target.x > p.x && target.x - p.x < 345 &&
        Math.abs(target.y - (p.y - 18)) <= 55;
      if (w.partA && !w.partB && canHit(RIVER.target)) {
        w.partB = true; return true;
      }
      if (w.partC && !w.finalGate && w.pressure && canHit(RIVER.finalTarget)) {
        w.shotUntil = now + FINAL_WINDOW_MS; return true;
      }
      return false;
    }
    if (action.kind === 'timer') {
      if (seat !== 2 || !w.partA || !w.partB || w.partC || !near(p, RIVER.timer, 53, 80)) return false;
      if (w.timerUntil > now) return false;
      w.timerUntil = now + RIVER_TIMER_MS;
      this.dashAt = 0; this.dashFrom = 0;
      return true;
    }
    if (action.kind === 'dash') {
      if (seat !== 2 || now - this.lastDash < 1850) return false;
      this.lastDash = now;
      if (w.partB && !w.partC && w.timerUntil > now && p.x >= 605 && p.x <= 755) {
        this.dashFrom = p.x; this.dashAt = now;
      }
      if (w.partC && !w.finalGate && p.x >= 895 && p.x <= 1020) {
        this.finalDashFrom = p.x; this.finalDashAt = now;
      }
      return false; // somente registro de uso; não há broadcast de puzzle.
    }
    if (action.kind === 'switch') {
      if (seat !== 2) return false;
      if (!w.partC && w.timerUntil > now && near(p, RIVER.switch, 57, 78)
        && this.dashAt >= w.timerUntil - RIVER_TIMER_MS && this.dashAt <= now
        && this.dashFrom <= 755 && p.x - this.dashFrom >= 165) {
        w.partC = true; w.timerUntil = 0; return true;
      }
      if (w.partC && !w.finalGate && w.pressure && w.shotUntil > now
        && near(p, RIVER.finalSwitch, 47, 75)
        && this.finalDashAt > 0 && now - this.finalDashAt < 1800
        && this.finalDashFrom < 1020 && p.x - this.finalDashFrom >= 120) {
        w.finalGate = true; w.shotUntil = 0; return true;
      }
    }
    return false;
  }
  tick(poses: Pose[], now = Date.now()): boolean {
    const w = this.world;
    let changed = false;
    const pressure = w.partC && !w.finalGate && near(poses[0], RIVER.plate, 47, 70);
    if (pressure !== w.pressure) {
      w.pressure = pressure; changed = true;
      if (!pressure && w.shotUntil !== 0) { w.shotUntil = 0; changed = true; }
    }
    if (w.timerUntil !== 0 && w.timerUntil <= now) { w.timerUntil = 0; changed = true; }
    if (w.shotUntil !== 0 && w.shotUntil <= now) { w.shotUntil = 0; changed = true; }
    if (w.partB && w.checkpoint < 1 && poses.every(p => p.x >= 545)) { w.checkpoint = 1; changed = true; }
    if (w.partC && w.checkpoint < 2 && poses.every(p => p.x >= 895)) { w.checkpoint = 2; changed = true; }
    return changed;
  }
  hasWon(poses: Pose[]): boolean {
    return this.world.partA && this.world.partB && this.world.partC && this.world.finalGate
      && poses.every(p => p.x >= 1140 && p.x <= 1200 && p.y >= 535 && p.y <= 670);
  }
}
