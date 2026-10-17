import type { Level, Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';

export type SkillFxKind = 'shoot' | 'dash';
export type SkillFx = {
  kind: SkillFxKind;
  seat: Seat;
  level: Level;
  x: number;
  y: number;
  facing: -1 | 1;
};

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Valida antes de enviar e antes de exibir; efeitos nunca alteram estado do jogo. */
export function validSkillFx(value: unknown): value is SkillFx {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const f = value as Record<string, unknown>;
  return (f.kind === 'shoot' && f.seat === 1 || f.kind === 'dash' && f.seat === 2)
    && (f.level === 1 || f.level === 2 || f.level === 3 || f.level === 4)
    && (f.facing === 1 || f.facing === -1)
    && finite(f.x) && f.x >= 0 && f.x <= (f.level === 1 ? 4300 : 1200)
    && finite(f.y) && f.y >= 0 && f.y <= 700;
}

/** Uma única fonte no host limita frequência e autentica o personagem da habilidade. */
export class SkillFxGate {
  private last = new Map<SkillFxKind, number>();
  reset(): void { this.last.clear(); }
  accept(
    seat: Seat, level: Level, action: PuzzleAction, pose: Pose,
    unlocked: readonly boolean[], now: number
  ): SkillFx | null {
    if (!unlocked[seat] || pose.seat !== seat) return null;
    const kind = action.kind;
    if (kind !== 'shoot' && kind !== 'dash') return null;
    if (kind === 'shoot' && seat !== 1 || kind === 'dash' && seat !== 2) return null;
    if (action.facing !== 1 && action.facing !== -1) return null;
    const cooldown = kind === 'shoot' ? 480 : 1900;
    if (now - (this.last.get(kind) ?? -Infinity) < cooldown) return null;
    const fx: SkillFx = { kind, seat, level, x: pose.x, y: pose.y, facing: action.facing };
    if (!validSkillFx(fx)) return null;
    this.last.set(kind, now);
    return fx;
  }
}
