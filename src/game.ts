import Phaser from 'phaser';
import { CHARACTERS, SPAWNS, type Network, type Pose, type Seat } from './network';
import { EXIT, LEVER, PEDAL, PICKUPS, SWITCH, TARGET, type WorldState } from './puzzles';
import { SkillVfx } from './skillVfx';
import { configureCamera } from './camera';

export type TouchInput = { left: boolean; right: boolean; jump: boolean; interact: boolean; ability: boolean };

/** Primeira fase cooperativa; Phaser controla apenas o personagem local. */
export class DemoScene extends Phaser.Scene {
  private net: Network;
  private touch: TouchInput;
  private figures = new Map<Seat, Phaser.GameObjects.Rectangle>();
  private vfx = new SkillVfx(this, seat => this.figures.get(seat));
  private labels = new Map<Seat, Phaser.GameObjects.Text>();
  private eyes = new Map<Seat, Phaser.GameObjects.Rectangle>();
  private targets = new Map<Seat, Pose>();
  private collectibles: Phaser.GameObjects.Container[] = [];
  private bridge!: Phaser.GameObjects.Rectangle;
  private vines!: Phaser.GameObjects.Rectangle;
  private gate!: Phaser.GameObjects.Rectangle;
  private lever!: Phaser.GameObjects.Rectangle;
  private target!: Phaser.GameObjects.Arc;
  private switch!: Phaser.GameObjects.Arc;
  private timerText!: Phaser.GameObjects.Text;
  private player!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private unsub: Array<() => void> = [];
  private worldPaused = false;
  private jumps = 0;
  private facing: -1 | 1 = 1;
  private dashUntil = 0;
  private dashReadyAt = 0;
  private shotReadyAt = 0;
  private lastNarration = 0;
  private lastGateOpen = false;
  private currentWorld: WorldState;
  private messageLabel!: Phaser.GameObjects.Text;
  private onHud?: () => void;

  constructor(network: Network, touch: TouchInput, onHud?: () => void) {
    super({ key: 'DemoScene' });
    this.net = network; this.touch = touch; this.onHud = onHud;
    this.currentWorld = network.puzzle;
  }
  private platform(x: number, y: number, width: number, height: number, fill = 0x45624d): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, width, height, fill).setDepth(3).setStrokeStyle(3, 0x88a879);
    this.physics.add.existing(rect, true);
    (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    return rect;
  }
  private sceneText(x: number, y: number, content: string, size = 16, color = '#d9efb8'): Phaser.GameObjects.Text {
    return this.add.text(x, y, content, {
      fontFamily: 'Nunito, Arial, sans-serif', fontSize: size + 'px', fontStyle: 'bold',
      color, stroke: '#0a1e19', strokeThickness: 4, align: 'center',
    }).setOrigin(0.5).setDepth(10);
  }
  private flash(x: number, y: number, color: number, count = 9): void {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const dot = this.add.circle(x, y, 3 + (i % 3), color).setDepth(16);
      this.tweens.add({
        targets: dot, x: x + Math.cos(angle) * (25 + i * 3),
        y: y + Math.sin(angle) * (23 + i * 2),
        alpha: 0, scale: .2, duration: 350 + (i % 4) * 80,
        onComplete: () => dot.destroy(),
      });
    }
  }
  private notify(text: string, duration = 2800): void {
    if (!this.messageLabel?.active) return;
    this.messageLabel.setText(text).setVisible(true).setAlpha(1);
    this.lastNarration = this.time.now + duration;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 1200, 900);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.cameras.main.setBackgroundColor('#091c23');
    this.drawWorld();

    const local = this.net.localSeat;
    if (local === null) return;
    const floor = [
      this.platform(197, 651, 394, 62),
      this.platform(863, 651, 674, 62),
    ];
    this.bridge = this.platform(460, 651, 134, 62, 0x80644b);
    this.vines = this.platform(765, 492, 38, 256, 0x327a4b);
    this.gate = this.platform(982, 501, 35, 240, 0x65959c);
    this.platform(351, 419, 132, 17, 0x526e59); // Alto o suficiente para exigir salto duplo.
    this.platform(575, 535, 128, 18, 0x526e59);
    this.platform(681, 497, 110, 18, 0x526e59);
    // Alavanca, alvo e interruptores visíveis em todos os aparelhos.
    this.lever = this.add.rectangle(LEVER.x, LEVER.y, 13, 35, 0xf3b86a).setAngle(-30).setDepth(5);
    this.sceneText(LEVER.x, 331, 'TÉO · E', 13);
    this.target = this.add.circle(TARGET.x, TARGET.y, 17, 0xffcc7b).setStrokeStyle(5, 0x9c5b22).setDepth(6);
    this.sceneText(TARGET.x, TARGET.y - 44, 'LIA · Q', 14);
    this.add.circle(PEDAL.x, 613, 24, 0x6ac5ec, 0.85).setDepth(5);
    this.sceneText(PEDAL.x, 567, 'NINO · E', 14);
    this.switch = this.add.circle(SWITCH.x, SWITCH.y, 13, 0x9aecca).setDepth(6);
    this.sceneText(SWITCH.x, SWITCH.y - 44, 'NINO · E', 13);
    this.timerText = this.sceneText(980, 330, '', 15, '#ffffff');

    PICKUPS.forEach((pickup, seat) => {
      const aura = this.add.circle(0, 0, 23, pickup.color, 0.17).setStrokeStyle(2, pickup.color);
      const gem = this.add.circle(0, 0, 10, pickup.color);
      const glow = this.add.circle(0, -17, 3, 0xffffff, .9);
      const group = this.add.container(pickup.x, pickup.y - 28, [aura, gem, glow]).setDepth(8);
      this.collectibles.push(group);
      this.tweens.add({ targets: group, y: pickup.y - 37, duration: 900 + seat * 100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.sceneText(pickup.x, pickup.y - 75, CHARACTERS[seat].name, 12, CHARACTERS[seat].hex);
    });

    for (const seat of [0, 1, 2] as Seat[]) {
      const spawn = SPAWNS[seat];
      const figure = this.add.rectangle(spawn.x, spawn.y, 30, 44, CHARACTERS[seat].color)
        .setStrokeStyle(3, 0x143528).setDepth(7);
      this.figures.set(seat, figure);
      this.eyes.set(seat, this.add.rectangle(spawn.x + 4, spawn.y - 7, 9, 5, 0xf3f7e3).setDepth(8));
      this.labels.set(seat, this.sceneText(spawn.x, spawn.y - 43, CHARACTERS[seat].name, 16, CHARACTERS[seat].hex));
      this.targets.set(seat, { ...spawn });
      if (seat === local) {
        this.player = figure;
        this.physics.add.existing(figure);
        this.body = figure.body as Phaser.Physics.Arcade.Body;
        this.body.setCollideWorldBounds(true).setGravityY(850).setMaxVelocity(400, 900);
        for (const rect of [...floor, this.bridge, this.vines, this.gate]) this.physics.add.collider(figure, rect);
        const platforms = this.physics.world.staticBodies.getArray().filter((b): b is Phaser.Physics.Arcade.StaticBody =>
          b instanceof Phaser.Physics.Arcade.StaticBody);
        // Inclui as plataformas elevadas desenhadas antes dos personagens.
        for (const body of platforms) {
          const object = body.gameObject;
          if (object instanceof Phaser.GameObjects.Rectangle && ![...floor, this.bridge, this.vines, this.gate].includes(object)) {
            this.physics.add.collider(figure, object);
          }
        }
      }
    }

    configureCamera(this, this.player);
    this.messageLabel = this.sceneText(600, 110, '', 17, '#f1ffcd').setWordWrapWidth(1000);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('A,D,E,Q') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.unsub.push(this.net.on('snapshot', poses => {
      for (const pose of poses) if (pose.seat !== this.net.localSeat) this.targets.set(pose.seat, { ...pose });
    }));
    this.unsub.push(this.net.on('puzzle', world => this.syncPuzzles(world)));
    this.unsub.push(this.net.on('effect', fx => this.vfx.play(fx)));
    this.unsub.push(this.net.on('respawn', pose => {
      if (pose.seat === this.net.localSeat) {
        this.player.setPosition(pose.x, pose.y);
        this.body.reset(pose.x, pose.y);
        this.body.setVelocity(0, 0);
        this.jumps = 0; this.dashUntil = 0;
        this.notify('A floresta mudou o caminho! Voltando ao checkpoint.');
      }
      this.targets.set(pose.seat, { ...pose });
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub.forEach(unsubscribe => unsubscribe()));
    this.syncPuzzles(this.net.puzzle, false);
    this.notify('Os três amigos perderam o caminho de casa quando a boca da noite chegou.\nA floresta já não parecia a mesma...', 5200);
    this.time.addEvent({
      delay: 650, loop: true, callback: () => {
        const x = Phaser.Math.Between(25, 1180), y = Phaser.Math.Between(170, 585);
        const glow = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xd4f98a, .72).setDepth(4);
        this.tweens.add({ targets: glow, y: y - 30, alpha: 0, duration: 1600, onComplete: () => glow.destroy() });
      },
    });
  }

  private setSolid(block: Phaser.GameObjects.Rectangle, enabled: boolean): void {
    block.setVisible(enabled);
    const body = block.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = enabled;
    if (enabled) body.updateFromGameObject();
  }
  private syncPuzzles(world: WorldState, announce = true): void {
    const old = this.currentWorld;
    this.currentWorld = { ...world, unlocked: [...world.unlocked] as WorldState['unlocked'] };
    this.collectibles.forEach((c, i) => c.setVisible(!world.unlocked[i]));
    this.setSolid(this.bridge, world.bridge);
    this.setSolid(this.vines, !world.vines);
    this.setSolid(this.gate, !world.finalGate && world.timerUntil <= Date.now());
    this.lastGateOpen = world.finalGate || world.timerUntil > Date.now();
    this.target.setFillStyle(world.vines ? 0x4adf9a : 0xffcc7b);
    this.lever.setFillStyle(world.bridge ? 0x6cf9a2 : 0xf3b86a);
    this.switch.setFillStyle(world.finalGate ? 0x56ff92 : 0x9aecca);
    if (announce && this.messageLabel?.active) {
      for (let i = 0; i < 3; i++) {
        if (!old.unlocked[i] && world.unlocked[i]) {
          this.flash(PICKUPS[i].x, PICKUPS[i].y - 28, PICKUPS[i].color);
          if (i === this.net.localSeat) this.notify(
            ['Salto duplo desbloqueado! Pressione PULAR de novo no ar.',
              'Estilingue desbloqueado! Pressione Q para disparar.',
              'Dash desbloqueado! Pressione Q para correr mais rápido.'][i]);
        }
      }
      if (!old.bridge && world.bridge) { this.flash(460, 607, 0xc8f9b5, 16); this.notify('PONTE ATIVADA! Atravessem juntos.'); }
      if (!old.vines && world.vines) { this.flash(765, 505, 0x99f4bb, 17); this.notify('Os cipós se recolheram!'); }
      if (!old.finalGate && world.finalGate) { this.flash(985, 535, 0x6debcf, 17); this.notify('O ÚLTIMO CAMINHO ESTÁ LIBERADO!'); }
      if (!old.timerUntil && world.timerUntil > Date.now()) this.notify('PORTA DO TEMPO ABERTA! Nino, use o DASH agora!', 1400);
      if (world.checkpoint !== old.checkpoint) this.notify('Checkpoint cooperativo alcançado!');
    }
    this.onHud?.();
  }
  private drawWorld(): void {
    const graphics = this.add.graphics().setDepth(-20);
    graphics.fillGradientStyle(0x0d2932, 0x0d2932, 0x193b35, 0x163429);
    graphics.fillRect(0, 0, 1200, 700);
    this.add.circle(994, 100, 57, 0xd7edb0, .69).setDepth(-19);
    for (let i = 0; i < 75; i++) {
      const x = (i * 173 + 31) % 1200, y = 32 + (i * 79) % 380;
      this.add.circle(x, y, (i % 4 === 0 ? 2 : 1), 0xf7ffce, .25).setDepth(-18);
    }
    for (let layer = 0; layer < 3; layer++) {
      const color = [0x102c30, 0x153e37, 0x205039][layer];
      for (let i = 0; i < 20; i++) {
        const x = i * (59 + 2 * layer) - 15, height = 145 + (i * 47 + layer * 73) % 175;
        const base = 625 + layer * 12;
        this.add.rectangle(x, base - height / 2, 25 + layer * 3, height, color).setDepth(-16 + layer * 3);
        this.add.ellipse(x - 12, base - height, 95 + layer * 10, 80 + layer * 9, color)
          .setDepth(-15 + layer * 3);
        this.add.ellipse(x + 18, base - height - 10, 70 + layer * 8, 90, color).setDepth(-15 + layer * 3);
      }
    }
    for (let i = 0; i < 12; i++) {
      const x = 55 + i * 100;
      this.add.ellipse(x, 629, 110, 47, 0x234c30, .87).setDepth(0);
      this.add.ellipse(x - 26, 614, 50, 48, 0x2f643e, .8).setDepth(1);
    }
    this.add.rectangle(600, 685, 1200, 52, 0x203b29).setDepth(2);
    this.sceneText(125, 45, 'A BOCA DA NOITE', 21);
    this.sceneText(145, 75, 'Better Together • Something’s Off', 12);
    this.sceneText(365, 290, '1 · A PASSAGEM SUSPENSA', 15);
    this.sceneText(734, 394, '2 · OS CIPÓS', 15);
    this.sceneText(960, 265, '3 · A PORTA DO TEMPO', 15);
    this.add.rectangle(1166, 561, 68, 120, 0x9df2a2, .18).setStrokeStyle(3, 0xc6f6ad, .9).setDepth(1);
    this.sceneText(1166, 471, 'CASA', 19);
    this.sceneText(1166, 495, '3 AMIGOS', 11);
    this.sceneText(469, 570, 'PONTE', 12, '#ffffd9');
    this.sceneText(770, 342, 'CIPÓS', 13, '#f4dca8');
    this.sceneText(980, 348, 'PORTA', 12, '#cbf0fa');
  }
  private abilityPress(now: number, me: Seat): void {
    if (!this.net.puzzle.unlocked[me]) {
      this.notify('Encontre primeiro sua habilidade especial!', 1200);
      return;
    }
    if (me === 1 && now >= this.shotReadyAt) {
      this.shotReadyAt = now + 520;
      this.vfx.play({ kind: 'shoot', seat: me, level: this.net.level,
        x: this.player.x, y: this.player.y, facing: this.facing });
      this.net.act({ kind: 'shoot', facing: this.facing });
      this.onHud?.();
    } else if (me === 2 && now >= this.dashReadyAt) {
      this.dashUntil = now + 800;
      this.dashReadyAt = now + 2000;
      this.vfx.play({ kind: 'dash', seat: me, level: this.net.level,
        x: this.player.x, y: this.player.y, facing: this.facing });
      this.net.act({ kind: 'dash', facing: this.facing });
      this.onHud?.();
    }
  }
  private interact(me: Seat): void {
    if (me === 0) this.net.act({ kind: 'lever' });
    if (me === 2) {
      if (this.player.x < 890) this.net.act({ kind: 'timer' });
      else this.net.act({ kind: 'switch' });
    }
  }
  update(time: number, delta: number): void {
    if (!this.player || !this.body || this.net.localSeat === null) return;
    const me = this.net.localSeat;
    const paused = !this.net.everyoneConnected || this.net.completed || !this.net.playing;
    if (paused !== this.worldPaused) {
      this.worldPaused = paused;
      if (paused) this.physics.pause(); else this.physics.resume();
    }
    if (!paused) {
      let dir = 0;
      if (this.cursors?.left.isDown || this.keys?.A?.isDown || this.touch.left) dir--;
      if (this.cursors?.right.isDown || this.keys?.D?.isDown || this.touch.right) dir++;
      if (dir !== 0) this.facing = dir < 0 ? -1 : 1;
      const now = performance.now();
      this.body.setVelocityX(dir * (me === 2 && now < this.dashUntil ? 329 : 235));
      if (this.body.blocked.down || this.body.touching.down) this.jumps = 0;
      const jump = Boolean(
        (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space)) ||
        this.touch.jump
      );
      this.touch.jump = false;
      if (jump && (this.body.blocked.down || this.body.touching.down || (me === 0 && this.net.puzzle.unlocked[0] && this.jumps < 2))) {
        const double = this.jumps === 1 && !this.body.blocked.down;
        this.body.setVelocityY(-465);
        this.jumps++;
        if (double) this.flash(this.player.x, this.player.y + 20, 0xa3ffa5, 12);
      }
      const use = Boolean((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || this.touch.interact);
      const ability = Boolean((this.keys?.Q && Phaser.Input.Keyboard.JustDown(this.keys.Q)) || this.touch.ability);
      this.touch.interact = false; this.touch.ability = false;
      if (use) this.interact(me);
      if (ability) this.abilityPress(now, me);
      if (!this.net.puzzle.unlocked[me] && Math.abs(this.player.x - PICKUPS[me].x) < 42) this.net.act({ kind: 'collect' });
      this.net.report(this.player.x, this.player.y, this.body.velocity.x, this.body.velocity.y);
    }
    if (this.lastNarration && time >= this.lastNarration && this.messageLabel.visible) this.messageLabel.setVisible(false);
    const gateOpen = this.net.puzzle.finalGate || this.net.puzzle.timerUntil > Date.now();
    if (gateOpen !== this.lastGateOpen) {
      this.lastGateOpen = gateOpen;
      this.setSolid(this.gate, !gateOpen);
    }
    if (this.net.puzzle.timerUntil > Date.now() && !this.net.puzzle.finalGate) {
      this.timerText.setText('⏳ ' + ((this.net.puzzle.timerUntil - Date.now()) / 1000).toFixed(1) + 's');
    } else this.timerText.setText('');
    const alpha = 1 - Math.exp(-Math.min(delta, 80) / 105);
    for (const seat of [0, 1, 2] as Seat[]) {
      const figure = this.figures.get(seat);
      if (!figure) continue;
      if (seat !== me) {
        const target = this.targets.get(seat);
        if (target) {
          figure.x = Phaser.Math.Linear(figure.x, target.x, alpha);
          figure.y = Phaser.Math.Linear(figure.y, target.y, alpha);
        }
      }
      this.labels.get(seat)?.setPosition(figure.x, figure.y - 43);
      this.eyes.get(seat)?.setPosition(figure.x + 4, figure.y - 7);
      figure.alpha = this.net.players[seat].online ? 1 : .33;
    }
    this.vfx.update(time);
    // Região CASA não dá vitória localmente; somente o anfitrião confere os três.
    void EXIT;
  }
  getCooldown(): string {
    const me = this.net.localSeat;
    if (me === null || !this.net.puzzle.unlocked[me]) return '🔒 Habilidade bloqueada';
    if (me === 0) return '✦ Salto duplo: PULAR novamente no ar';
    const remaining = (me === 1 ? this.shotReadyAt : this.dashReadyAt) - performance.now();
    return remaining <= 0
      ? (me === 1 ? '🏹 Estilingue: Q disponível' : '⚡ Dash: Q disponível')
      : (me === 1 ? '🏹 Estilingue: ' : '⚡ Dash: ') + (remaining / 1000).toFixed(1) + 's';
  }
}
