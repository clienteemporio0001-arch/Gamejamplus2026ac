import Phaser from 'phaser';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { RIVER, RIVER_SPAWNS, type RiverWorld } from './river';
import type { TouchInput } from './game';

/** Fase 2: rio amazônico, três peças de ponte, ilusão e mecanismo coletivo. */
export class RiverScene extends Phaser.Scene {
  private net: Network;
  private touch: TouchInput;
  private hud?: () => void;
  private blocks: Phaser.GameObjects.Rectangle[] = [];
  private bridge: Phaser.GameObjects.Rectangle[] = [];
  private finalBarrier!: Phaser.GameObjects.Rectangle;
  private actors: Phaser.GameObjects.Rectangle[] = [];
  private names: Phaser.GameObjects.Text[] = [];
  private eyes: Phaser.GameObjects.Rectangle[] = [];
  private targets: Pose[] = RIVER_SPAWNS.map(p => ({ ...p }));
  private body!: Phaser.Physics.Arcade.Body;
  private actor!: Phaser.GameObjects.Rectangle;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private unsub: Array<() => void> = [];
  private jumps = 0;
  private facing: -1 | 1 = 1;
  private dashUntil = 0;
  private dashReady = 0;
  private shotReady = 0;
  private paused = false;
  private world: RiverWorld;
  private tip!: Phaser.GameObjects.Text;
  private tipUntil = 0;
  private gateOpen = false;
  private movedBefore = false;
  private wave!: Phaser.GameObjects.Rectangle;

  constructor(net: Network, touch: TouchInput, hud?: () => void) {
    super({ key: 'RiverScene' });
    this.net = net; this.touch = touch; this.hud = hud;
    this.world = { ...net.river };
  }
  private title(x: number, y: number, value: string, size = 14, color = '#e8ffc6'): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, {
      fontFamily: 'Nunito, Arial, sans-serif', color, fontSize: size + 'px',
      fontStyle: 'bold', stroke: '#102522', strokeThickness: 4, align: 'center'
    }).setOrigin(.5).setDepth(10);
  }
  private block(x: number, y: number, w: number, h: number, color = 0x4a6846): Phaser.GameObjects.Rectangle {
    const r = this.add.rectangle(x, y, w, h, color).setStrokeStyle(3, 0xa0b887).setDepth(4);
    this.physics.add.existing(r, true);
    (r.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.blocks.push(r);
    return r;
  }
  private solid(rect: Phaser.GameObjects.Rectangle, active: boolean): void {
    rect.setVisible(active);
    const body = rect.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = active;
    if (active) body.updateFromGameObject();
  }
  private burst(x: number, y: number, color: number, size = 10): void {
    for (let i = 0; i < size; i++) {
      const a = i * Math.PI * 2 / size;
      const dot = this.add.circle(x, y, 4, color).setDepth(17);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * 44, y: y + Math.sin(a) * 44,
        scale: .2, alpha: 0, duration: 450 + i * 23, onComplete: () => dot.destroy() });
    }
  }
  private inform(text: string, ms = 2800): void {
    if (!this.tip?.active) return;
    this.tip.setText(text).setVisible(true).setAlpha(1);
    this.tipUntil = this.time.now + ms;
  }

  create(): void {
    this.physics.world.setBounds(0, 0, 1200, 900);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.drawRiver();
    this.block(167, 645, 334, 52);
    this.block(1040, 645, 320, 52);
    // Segmentos do rio: cada um aparece após a ação do seu personagem.
    this.bridge = [
      this.block(431, 645, 194, 52, 0x8b6040),
      this.block(628, 645, 200, 52, 0x8b6040),
      this.block(803, 645, 150, 52, 0x8b6040)
    ];
    this.finalBarrier = this.block(1134, 512, 28, 211, 0x5d9b88);
    this.block(213, 417, 136, 19, 0x4a7158); // salto duplo de Téo
    this.title(221, 331, 'TÉO: E · ALAVANCA', 14);
    this.add.rectangle(RIVER.lever.x, RIVER.lever.y, 12, 35, 0xeac672).setAngle(-27).setDepth(5);
    this.title(481, 519, 'LIA: Q · ALVO', 14);
    this.add.circle(RIVER.target.x, RIVER.target.y, 17, 0xffd47e).setStrokeStyle(4, 0x955a25).setDepth(7);
    this.title(688, 535, 'NINO: E · TEMPO', 14);
    this.add.circle(RIVER.timer.x, RIVER.timer.y, 16, 0x87d5ef).setStrokeStyle(3, 0xddfaff).setDepth(6);
    this.title(912, 532, 'NINO: E · TRAVA', 14);
    this.add.circle(RIVER.switch.x, RIVER.switch.y, 13, 0x87d5ef).setDepth(6);
    this.title(953, 516, 'TÉO: SEGURE A PLACA', 13);
    this.add.ellipse(RIVER.plate.x, 624, 77, 16, 0x80ecab).setDepth(5);
    this.title(1073, 480, 'LIA: Q · ALVO FINAL', 12);
    this.add.circle(RIVER.finalTarget.x, RIVER.finalTarget.y, 13, 0xffce79).setDepth(6);
    this.title(1096, 523, 'NINO: DASH + E', 12);
    this.add.circle(RIVER.finalSwitch.x, RIVER.finalSwitch.y, 14, 0x7bbdf7).setDepth(6);
    this.title(1180, 481, 'SAÍDA', 15);

    for (const seat of [0, 1, 2] as Seat[]) {
      const pose = this.net.poses[seat] || RIVER_SPAWNS[seat];
      const actor = this.add.rectangle(pose.x, pose.y, 30, 44, CHARACTERS[seat].color)
        .setStrokeStyle(3, 0x123329).setDepth(7);
      this.actors[seat] = actor;
      this.eyes[seat] = this.add.rectangle(pose.x + 5, pose.y - 8, 8, 5, 0xe9ffdd).setDepth(8);
      this.names[seat] = this.title(pose.x, pose.y - 45, CHARACTERS[seat].name, 16, CHARACTERS[seat].hex);
      this.targets[seat] = { ...pose };
      if (seat === this.net.localSeat) {
        this.actor = actor;
        this.physics.add.existing(actor);
        this.body = actor.body as Phaser.Physics.Arcade.Body;
        this.body.setGravityY(850).setMaxVelocity(390, 900).setCollideWorldBounds(true);
        for (const block of this.blocks) this.physics.add.collider(actor, block);
      }
    }
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard?.addKeys('A,D,W,E,Q') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.tip = this.title(600, 120, '', 18).setWordWrapWidth(1050);
    this.sync(this.net.river, false);
    this.inform('O RIO ESCONDE A PASSAGEM...\nCada amigo precisa usar sua habilidade para reconstruir a ponte.', 6000);
    this.unsub.push(this.net.on('snapshot', poses => {
      for (const p of poses) if (p.seat !== this.net.localSeat) this.targets[p.seat] = { ...p };
    }));
    this.unsub.push(this.net.on('river', w => this.sync(w)));
    this.unsub.push(this.net.on('respawn', p => {
      this.targets[p.seat] = { ...p };
      if (p.seat === this.net.localSeat && this.body) {
        this.actor.setPosition(p.x, p.y);
        this.body.reset(p.x, p.y);
        this.jumps = 0; this.dashUntil = 0;
        this.inform('A correnteza levou você! Voltando ao checkpoint.');
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub.forEach(off => off()));
    this.time.addEvent({ delay: 400, loop: true, callback: () => {
      const dot = this.add.circle(Phaser.Math.Between(30, 1180), Phaser.Math.Between(100, 500), 2, 0xe5ffaa, .7).setDepth(2);
      this.tweens.add({ targets: dot, alpha: 0, y: dot.y - 32, duration: 1300, onComplete: () => dot.destroy() });
    }});
  }
  private drawRiver(): void {
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0x081b35, 0x101d31, 0x183d3e, 0x102b2e);
    g.fillRect(0, 0, 1200, 700);
    this.add.circle(1014, 95, 58, 0xf0f3ca, .78).setDepth(-18);
    for (let depth = 0; depth < 3; depth++) {
      const c = [0x163837, 0x19513e, 0x25593d][depth];
      for (let i = 0; i < 21; i++) {
        const x = i * 69 + depth * 23 - 32;
        const h = 170 + ((i * 73 + depth * 61) % 155);
        this.add.rectangle(x, 623 - h / 2, 26, h, c).setDepth(-15 + depth * 3);
        this.add.ellipse(x, 616 - h, 115, 90, c).setDepth(-14 + depth * 3);
      }
    }
    this.add.rectangle(608, 663, 547, 77, 0x1e6983, .8).setDepth(0);
    this.wave = this.add.rectangle(603, 677, 530, 7, 0x7bc4c9, .25).setDepth(1);
    this.tweens.add({ targets: this.wave, alpha: .45, x: 619, duration: 1100, yoyo: true, repeat: -1 });
    this.add.rectangle(600, 692, 1200, 16, 0x102f30).setDepth(1);
    this.title(600, 42, 'FASE 02 — A PONTE QUEBRADA', 22, '#ecffcb');
    this.title(601, 71, 'O rio mudou. Reconstruam a ponte e atravessem juntos.', 12);
    this.title(422, 465, 'I · ALAVANCA', 12);
    this.title(625, 465, 'II · ESTILINGUE', 12);
    this.title(815, 465, 'III · DASH', 12);
  }
  private sync(w: RiverWorld, announce = true): void {
    const old = this.world;
    this.world = { ...w };
    this.bridge.forEach((b, i) => this.solid(b, [w.partA, w.partB, w.partC][i]));
    this.gateOpen = w.finalGate;
    this.solid(this.finalBarrier, !w.finalGate);
    if (!announce || !this.tip?.active) return;
    if (!old.partA && w.partA) { this.inform('TÉO LIBEROU A PRIMEIRA PARTE DA PONTE!'); this.burst(431, 612, 0xa3f4aa); }
    if (!old.partB && w.partB) { this.inform('LIA LIBEROU A SEGUNDA PARTE DA PONTE!'); this.burst(628, 610, 0xf6ce83); }
    if (!old.partC && w.partC) { this.inform('NINO FIXOU A ESTRUTURA! A TRAVESSIA ESTÁ QUASE PRONTA.'); this.burst(805, 610, 0x91ddfa); }
    if (!old.finalGate && w.finalGate) { this.inform('JUNTOS! A TRAVESSIA FINAL FOI LIBERADA!', 4500); this.burst(1133, 550, 0xc5ffbd, 18); }
    if (!old.shotUntil && w.shotUntil > Date.now()) this.inform('ALVO ACERTADO! NINO, USE DASH E ATIVE E!', 2400);
    if (!old.timerUntil && w.timerUntil > Date.now()) this.inform('PORTA DO TEMPO! NINO, PULE E USE O DASH!', 2500);
    if (!old.pressure && w.pressure) this.inform('TÉO PRESSIONA A PLACA! LIA, ATIRE NO ALVO FINAL!', 2500);
    if (w.checkpoint !== old.checkpoint) this.inform('Checkpoint compartilhado ativado!');
    if (!this.movedBefore && w.moved) {
      this.movedBefore = true;
      const wait = Math.max(0, w.moveAt - Date.now());
      if (wait < 1800) this.time.delayedCall(wait, () => this.mystery());
    }
    this.hud?.();
  }
  private mystery(): void {
    const veil = this.add.rectangle(600, 350, 1200, 700, 0x091023, 0).setDepth(14);
    this.tweens.add({ targets: veil, alpha: .63, duration: 600, yoyo: true, onComplete: () => veil.destroy() });
    const illusion = this.add.rectangle(431, 612, 190, 18, 0x82bfa0, .6).setDepth(13);
    this.tweens.add({ targets: illusion, x: 465, duration: 550, yoyo: true, onComplete: () => illusion.destroy() });
    this.cameras.main.shake(420, .002);
    this.time.delayedCall(750, () => this.inform('Essa ponte não estava ali antes...', 3500));
  }
  private ability(now: number, me: Seat): void {
    if (!this.net.puzzle.unlocked[me]) return;
    if (me === 1 && now >= this.shotReady) {
      this.shotReady = now + 520;
      const x = this.actor.x + this.facing * 23, y = this.actor.y - 18;
      const pellet = this.add.circle(x, y, 7, 0xffd78b).setDepth(17);
      this.tweens.add({ targets: pellet, x: x + this.facing * 330, duration: 440,
        onComplete: () => { this.burst(pellet.x, pellet.y, 0xffd78b, 4); pellet.destroy(); } });
      this.net.act({ kind: 'shoot', facing: this.facing }); this.hud?.();
    }
    if (me === 2 && now >= this.dashReady) {
      this.dashReady = now + 2000;
      this.dashUntil = now + 800;
      this.net.act({ kind: 'dash', facing: this.facing }); this.hud?.();
    }
  }
  update(time: number, dt: number): void {
    if (!this.actor || !this.body || this.net.localSeat === null) return;
    const me = this.net.localSeat;
    const pause = !this.net.playing || !this.net.everyoneConnected || this.net.completed;
    if (pause !== this.paused) {
      this.paused = pause;
      if (pause) this.physics.pause(); else this.physics.resume();
    }
    if (!pause) {
      let dir = 0;
      if (this.cursors?.left.isDown || this.keys?.A?.isDown || this.touch.left) dir--;
      if (this.cursors?.right.isDown || this.keys?.D?.isDown || this.touch.right) dir++;
      if (dir) this.facing = dir > 0 ? 1 : -1;
      const now = performance.now();
      this.body.setVelocityX(dir * (me === 2 && now < this.dashUntil ? 329 : 235));
      const grounded = this.body.blocked.down || this.body.touching.down;
      if (grounded) this.jumps = 0;
      const jump = Boolean((this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space))
        || (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up))
        || (this.keys?.W && Phaser.Input.Keyboard.JustDown(this.keys.W)) || this.touch.jump);
      this.touch.jump = false;
      if (jump && (grounded || (me === 0 && this.net.puzzle.unlocked[0] && this.jumps < 2))) {
        const double = this.jumps === 1 && !grounded;
        this.body.setVelocityY(-465); this.jumps++;
        if (double) this.burst(this.actor.x, this.actor.y + 18, 0x9bf8bb, 9);
      }
      const use = Boolean((this.keys?.E && Phaser.Input.Keyboard.JustDown(this.keys.E)) || this.touch.interact);
      const special = Boolean((this.keys?.Q && Phaser.Input.Keyboard.JustDown(this.keys.Q)) || this.touch.ability);
      this.touch.interact = false; this.touch.ability = false;
      if (use) this.net.act({ kind: me === 0 ? 'lever' : me === 2 && !this.world.partC && this.actor.x < 770 ? 'timer' : 'switch' });
      if (special) this.ability(now, me);
      if (me === 2 && now < this.dashUntil && dir !== 0 && Math.floor(time / 65) !== Math.floor((time - dt) / 65)) {
        const trace = this.add.rectangle(this.actor.x - this.facing * 11, this.actor.y, 27, 40, 0x88d4ff, .5).setDepth(5);
        this.tweens.add({ targets: trace, alpha: 0, duration: 340, onComplete: () => trace.destroy() });
      }
      this.net.report(this.actor.x, this.actor.y, this.body.velocity.x, this.body.velocity.y);
    }
    if (this.tipUntil && time > this.tipUntil && this.tip.visible) this.tip.setVisible(false);
    const smoothing = 1 - Math.exp(-Math.min(dt, 80) / 100);
    for (const seat of [0, 1, 2] as Seat[]) {
      const actor = this.actors[seat];
      if (!actor) continue;
      if (seat !== me) {
        const pose = this.targets[seat];
        if (pose) {
          actor.x = Phaser.Math.Linear(actor.x, pose.x, smoothing);
          actor.y = Phaser.Math.Linear(actor.y, pose.y, smoothing);
        }
      }
      this.names[seat]?.setPosition(actor.x, actor.y - 45);
      this.eyes[seat]?.setPosition(actor.x + 5, actor.y - 8);
      actor.setAlpha(this.net.players[seat].online ? 1 : .3);
    }
    void this.gateOpen;
  }
  getCooldown(): string {
    const seat = this.net.localSeat;
    if (seat === null) return '';
    if (seat === 0) return '✦ Salto duplo (PULAR)';
    const rest = (seat === 1 ? this.shotReady : this.dashReady) - performance.now();
    return seat === 1 ? ('🏹 Estilingue ' + (rest > 0 ? (rest / 1000).toFixed(1) + 's' : 'Q')) :
      ('⚡ Dash ' + (rest > 0 ? (rest / 1000).toFixed(1) + 's' : 'Q'));
  }
}
