import Phaser from 'phaser';
import type { Seat } from './network';
import type { SkillFx } from './effects';

/**
 * Renderização compartilhada entre A Boca da Noite e A Ponte Quebrada.
 * Recebe UM evento P2P por disparo/dash e anima tudo localmente, sem spam de rede.
 */
export class SkillVfx {
  private trails = new Map<Seat, { until: number; facing: -1 | 1; last: number }>();
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly figure: (seat: Seat) => Phaser.GameObjects.Rectangle | undefined,
  ) {}
  play(fx: SkillFx): void {
    if (!this.scene.sys.isActive()) return;
    if (fx.kind === 'shoot') {
      const startX = fx.x + fx.facing * 23;
      const startY = fx.y - 18;
      const pebble = this.scene.add.circle(startX, startY, 7, 0xffd78b).setDepth(17);
      const glow = this.scene.add.circle(startX, startY, 14, 0xffca65, .25).setDepth(16);
      this.scene.tweens.add({
        targets: [pebble, glow], x: startX + fx.facing * 340, duration: 460,
        onComplete: () => {
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI * 2 * i / 6;
            const dot = this.scene.add.circle(pebble.x, pebble.y, 3, 0xf6c886).setDepth(18);
            this.scene.tweens.add({
              targets: dot,
              x: pebble.x + Math.cos(angle) * 26, y: pebble.y + Math.sin(angle) * 25,
              alpha: 0, duration: 240, onComplete: () => dot.destroy(),
            });
          }
          pebble.destroy(); glow.destroy();
        },
      });
      return;
    }
    const current = this.figure(fx.seat);
    const x = current?.x ?? fx.x, y = current?.y ?? fx.y;
    const ring = this.scene.add.circle(x, y, 26, 0x86d5ff, .12).setStrokeStyle(3, 0xa1e6ff).setDepth(15);
    this.scene.tweens.add({
      targets: ring, scale: 1.7, alpha: 0, duration: 330, onComplete: () => ring.destroy(),
    });
    this.trails.set(fx.seat, { until: this.scene.time.now + 800, facing: fx.facing, last: -Infinity });
  }
  update(now: number): void {
    for (const [seat, trail] of this.trails) {
      if (now > trail.until) { this.trails.delete(seat); continue; }
      if (now - trail.last < 65) continue;
      trail.last = now;
      const actor = this.figure(seat);
      if (!actor || !actor.active) continue;
      const ghost = this.scene.add.rectangle(
        actor.x - trail.facing * 13, actor.y, 30, 44, 0x8bd5ff, .48
      ).setDepth(5);
      this.scene.tweens.add({
        targets: ghost, alpha: 0, scaleX: .78, duration: 325,
        onComplete: () => ghost.destroy(),
      });
    }
  }
}
