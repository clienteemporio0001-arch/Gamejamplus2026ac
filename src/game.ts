import Phaser from 'phaser';
import { CHARACTERS, SPAWNS, type Network, type Pose, type Seat } from './network';

export type TouchInput = { left: boolean; right: boolean; jump: boolean };

/** Fase demonstrativa. Física local responsiva; estados remotos interpolados. */
export class DemoScene extends Phaser.Scene {
  private net: Network;
  private touch: TouchInput;
  private figures = new Map<Seat, Phaser.GameObjects.Rectangle>();
  private labels = new Map<Seat, Phaser.GameObjects.Text>();
  private eyes = new Map<Seat, Phaser.GameObjects.Rectangle>();
  private targets = new Map<Seat, Pose>();
  private player!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private unsub?: () => void;
  private worldPaused = false;

  constructor(network: Network, touch: TouchInput) {
    super({ key: 'DemoScene' });
    this.net = network;
    this.touch = touch;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 1200, 700);
    this.cameras.main.setBackgroundColor('#091c23');
    this.drawWorld();

    const local = this.net.localSeat;
    if (local === null) return;
    const groundAndPlatforms: Phaser.GameObjects.Rectangle[] = [];
    const platform = (x: number, y: number, width: number, height: number) => {
      const rect = this.add.rectangle(x, y, width, height, 0x45624d).setDepth(3);
      rect.setStrokeStyle(3, 0x88a879);
      this.physics.add.existing(rect, true);
      (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      groundAndPlatforms.push(rect);
      return rect;
    };
    platform(600, 651, 1200, 62);
    platform(336, 546, 166, 20);
    platform(562, 490, 150, 20);
    platform(799, 536, 140, 20);
    platform(986, 467, 140, 20);

    for (const seat of [0, 1, 2] as Seat[]) {
      const spawn = SPAWNS[seat];
      const color = CHARACTERS[seat].color;
      const rectangle = this.add.rectangle(spawn.x, spawn.y, 30, 44, color)
        .setStrokeStyle(3, 0x143528).setDepth(6);
      this.figures.set(seat, rectangle);
      this.eyes.set(seat, this.add.rectangle(spawn.x + 4, spawn.y - 7, 9, 5, 0xf3f7e3).setDepth(7));
      this.labels.set(seat, this.add.text(spawn.x, spawn.y - 43, CHARACTERS[seat].name, {
        fontFamily: 'Nunito, Arial, sans-serif', fontSize: '16px', fontStyle: 'bold',
        color: CHARACTERS[seat].hex, stroke: '#10221b', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(8));
      this.targets.set(seat, { ...spawn });
      if (seat === local) {
        this.player = rectangle;
        this.physics.add.existing(rectangle);
        this.body = rectangle.body as Phaser.Physics.Arcade.Body;
        this.body.setCollideWorldBounds(true).setGravityY(850).setMaxVelocity(280, 900);
        for (const block of groundAndPlatforms) this.physics.add.collider(rectangle, block);
      }
    }
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('A,D,SPACE,W,UP') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.unsub = this.net.on('snapshot', poses => {
      for (const pose of poses) {
        if (pose.seat !== this.net.localSeat) this.targets.set(pose.seat, { ...pose });
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub?.());
  }

  private drawWorld(): void {
    const sky = this.add.graphics().setDepth(-20);
    sky.fillGradientStyle(0x0d2932, 0x0d2932, 0x1e4039, 0x19372d);
    sky.fillRect(0, 0, 1200, 700);
    this.add.circle(995, 102, 57, 0xd7edb0, 0.72).setDepth(-18);
    this.add.circle(985, 108, 50, 0xf4ffd0, 0.18).setDepth(-17);
    for (let i = 0; i < 72; i++) {
      const x = (i * 173 + 31) % 1200;
      const y = 30 + (i * 79) % 355;
      this.add.circle(x, y, i % 4 === 0 ? 2 : 1, 0xf7ffce, 0.25 + (i % 4) * 0.1).setDepth(-17);
    }
    for (let i = 0; i < 24; i++) {
      const x = i * 58 - 25;
      const h = 160 + (i * 53) % 180;
      this.add.rectangle(x, 610 - h / 2, 37, h, 0x153c38, 0.8).setDepth(-13);
      this.add.circle(x, 610 - h + 22, 72, 0x153c38, 0.9).setDepth(-12);
      this.add.circle(x + 18, 610 - h + 5, 50, 0x183d36, 0.9).setDepth(-12);
    }
    for (let i = 0; i < 18; i++) {
      const x = i * 77 - 20;
      const h = 120 + (i * 61) % 140;
      this.add.rectangle(x, 650 - h / 2, 29, h, 0x122b27).setDepth(-7);
      this.add.ellipse(x + 5, 650 - h, 124, 100, 0x1d4d3a).setDepth(-6);
      this.add.ellipse(x - 25, 657 - h, 85, 86, 0x23563c).setDepth(-5);
    }
    this.add.rectangle(600, 676, 1200, 48, 0x203b29).setDepth(2);
    this.add.text(36, 35, 'A BOCA DA NOITE', {
      fontSize: '21px', fontStyle: 'bold', fontFamily: 'Nunito, Arial, sans-serif',
      color: '#dcefa5', stroke: '#051c19', strokeThickness: 4,
    }).setDepth(3);
    this.add.text(36, 66, 'Protótipo cooperativo • 3 amigos, 1 caminho', {
      fontSize: '13px', color: '#c1dcce', fontFamily: 'Nunito, Arial, sans-serif',
    }).setDepth(3);
    this.add.rectangle(1113, 551, 135, 138, 0x9df2a2, 0.12).setStrokeStyle(3, 0xc6f6ad, 0.9).setDepth(1);
    this.add.ellipse(1113, 612, 126, 18, 0xc5fcac, 0.37).setDepth(2);
    this.add.text(1113, 474, 'CASA', {
      fontSize: '20px', fontStyle: 'bold', color: '#dcffc0',
      stroke: '#133123', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(4);
    this.add.text(1113, 500, 'Cheguem os três!', {
      fontSize: '12px', color: '#f2ffe5', stroke: '#133123', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4);
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.body || this.net.localSeat === null) return;
    const paused = !this.net.everyoneConnected || this.net.completed || !this.net.playing;
    if (paused !== this.worldPaused) {
      this.worldPaused = paused;
      if (paused) this.physics.pause();
      else this.physics.resume();
    }
    if (!paused) {
      let dir = 0;
      if (this.cursors?.left.isDown || this.keys?.A?.isDown || this.touch.left) dir--;
      if (this.cursors?.right.isDown || this.keys?.D?.isDown || this.touch.right) dir++;
      this.body.setVelocityX(dir * 235);
      const jumped = Boolean(
        (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space))
        || (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up))
        || (this.keys?.W && Phaser.Input.Keyboard.JustDown(this.keys.W))
        || (this.keys?.SPACE && Phaser.Input.Keyboard.JustDown(this.keys.SPACE))
        || (this.keys?.UP && Phaser.Input.Keyboard.JustDown(this.keys.UP))
        || this.touch.jump
      );
      this.touch.jump = false;
      if (jumped && this.body.blocked.down) this.body.setVelocityY(-465);
      this.net.report(this.player.x, this.player.y, this.body.velocity.x, this.body.velocity.y);
    }
    const alpha = 1 - Math.exp(-Math.min(delta, 80) / 105);
    for (const seat of [0, 1, 2] as Seat[]) {
      const figure = this.figures.get(seat);
      if (!figure) continue;
      if (seat !== this.net.localSeat) {
        const target = this.targets.get(seat);
        if (target) {
          figure.x = Phaser.Math.Linear(figure.x, target.x, alpha);
          figure.y = Phaser.Math.Linear(figure.y, target.y, alpha);
        }
      }
      this.labels.get(seat)?.setPosition(figure.x, figure.y - 43);
      this.eyes.get(seat)?.setPosition(figure.x + 4, figure.y - 7);
      figure.alpha = this.net.players[seat].online ? 1 : 0.33;
    }
  }
}
