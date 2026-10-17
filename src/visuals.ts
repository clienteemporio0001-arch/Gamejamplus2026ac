import Phaser from 'phaser';

export type Biome = 'forest' | 'river' | 'eyes' | 'trail';
export type Material = 'earth' | 'wood' | 'stone' | 'root' | 'gate' | 'bridge' | 'log';

export const NIGHT_PALETTE = {
  sky: 0x09121e, deep: 0x0b2028, mist: 0x4c767a, moss: 0x335e4b,
  earth: 0x263b34, wood: 0x574236, moon: 0xd0dfcd, danger: 0xf0a76f,
  teal: 0x81d7c1, light: 0xd8d4a6,
} as const;

import { visualNoise, pick } from './visualMath';
const isLowPower = (): boolean => typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700);

/** Render-only shared art system. Physics geometry is never changed. */
export class NightArt {
  private skins: { target: Phaser.GameObjects.Rectangle; ink: Phaser.GameObjects.Graphics }[] = [];
  private actors: { target: Phaser.GameObjects.Rectangle; ink: Phaser.GameObjects.Graphics;
    shadow: Phaser.GameObjects.Ellipse }[] = [];
  private lights: { dot: Phaser.GameObjects.Arc; originX: number; originY: number; seed: number }[] = [];
  private fog: { shape: Phaser.GameObjects.Ellipse; x: number; seed: number }[] = [];
  private leaves: { shape: Phaser.GameObjects.Ellipse; originX: number; seed: number }[] = [];
  private lowPower = isLowPower();

  constructor(private readonly scene: Phaser.Scene, readonly width: number, readonly biome: Biome) {
    this.drawSky();
    this.drawSilhouettes();
    this.drawAtmosphere();
  }

  private drawSky(): void {
    const g = this.scene.add.graphics().setDepth(-60);
    g.fillGradientStyle(0x071019, 0x101b2b, 0x10252b, 0x0d2227, 1);
    g.fillRect(0, 0, this.width, 700);
    // Narrow cold light shafts disappear into the treetops.
    for (let i = 0; i < Math.ceil(this.width / 550); i++) {
      const x = 280 + i * 610 + pick(i + 88, -65, 65);
      g.fillStyle(0x7aa3a0, 0.028);
      g.fillTriangle(x - 18, 45, x + 18, 45, x + 180, 650);
      g.fillTriangle(x - 18, 45, x + 18, 45, x - 160, 650);
    }
    for (let i = 0; i < Math.ceil(this.width / 31); i++) {
      const x = pick(i + 350, 0, this.width), y = pick(i + 610, 14, 340);
      const alpha = 0.08 + visualNoise(i + 923) * 0.18;
      g.fillStyle(0xb2cad6, alpha);
      g.fillCircle(x, y, visualNoise(i + 213) > .83 ? 1.5 : .7);
    }
    const moonX = this.width > 2000 ? 640 : 965;
    const moonY = 125;
    for (let i = 5; i >= 1; i--) {
      g.fillStyle(0x8aaeb3, 0.014);
      g.fillCircle(moonX, moonY, 53 + i * 25);
    }
    g.fillStyle(0xc6d8d2, .13); g.fillCircle(moonX, moonY, 47);
    g.fillStyle(NIGHT_PALETTE.moon, .67); g.fillCircle(moonX, moonY, 37);
    g.fillStyle(0x9db8b8, .18);
    g.fillCircle(moonX - 13, moonY - 10, 11);
    g.fillCircle(moonX + 13, moonY + 13, 7);
  }

  private drawSilhouettes(): void {
    // Three parallax layers, consolidated as Graphics: no 100s of live sprites.
    const layers = [
      { depth: -50, scroll: .23, spacing: 100, color: 0x0d2934, leaf: 0x112d36, base: 654, size: 1.30 },
      { depth: -42, scroll: .49, spacing: 87, color: 0x123331, leaf: 0x163b37, base: 665, size: 1.12 },
      { depth: -31, scroll: .76, spacing: 68, color: 0x17382f, leaf: 0x20483b, base: 675, size: .92 },
      { depth: -19, scroll: 1, spacing: 69, color: 0x1c3c34, leaf: 0x28533f, base: 650, size: .79 },
    ] as const;
    for (const [layerIndex, layer] of layers.entries()) {
      const ink = this.scene.add.graphics().setDepth(layer.depth).setScrollFactor(layer.scroll);
      const count = Math.ceil(this.width / layer.spacing) + 4;
      for (let i = 0; i < count; i++) {
        const seed = i * 43 + layerIndex * 621;
        const x = i * layer.spacing - 70 + pick(seed + 4, -20, 20);
        const h = pick(seed + 8, 155, 390) * layer.size;
        const trunk = pick(seed + 13, 13, 34) * layer.size;
        const top = layer.base - h;
        ink.fillStyle(layer.color, .95);
        ink.fillRect(x - trunk / 2, top + 40, trunk, h - 10);
        ink.lineStyle(Math.max(2, trunk * .35), layer.color, .9);
        ink.lineBetween(x, top + 110, x - 43 * layer.size, top + 63);
        ink.lineBetween(x + 3, top + 136, x + 51 * layer.size, top + 80);
        // Root buttresses anchor giant trees to the forest floor.
        ink.fillStyle(layer.color, 1);
        ink.fillTriangle(x - trunk / 2, layer.base - 26, x - 42 * layer.size,
          layer.base + 4, x, layer.base - 19);
        ink.fillTriangle(x + trunk / 2, layer.base - 23, x + 43 * layer.size,
          layer.base + 5, x, layer.base - 28);
        ink.fillStyle(layer.leaf, .97);
        ink.fillEllipse(x - 32 * layer.size, top + 56, 82 * layer.size, 86 * layer.size);
        ink.fillEllipse(x + 33 * layer.size, top + 48, 84 * layer.size, 102 * layer.size);
        ink.fillEllipse(x, top + 13, 84 * layer.size, 104 * layer.size);
        if (layerIndex >= 2 && i % 3 === 1) {
          // Thin hanging lianas are decorative, not colliders.
          ink.lineStyle(2, 0x3c6552, .27);
          const end = top + pick(seed + 27, 130, 215);
          ink.beginPath();
          ink.moveTo(x + 24, top + 39);
          ink.lineTo(x + 29, end - 40);
          ink.lineTo(x + 20, end);
          ink.strokePath();
        }
      }
    }
  }

  private drawAtmosphere(): void {
    const ink = this.scene.add.graphics().setDepth(-9);
    for (let i = 0; i < Math.ceil(this.width / 110); i++) {
      const x = i * 114 + pick(i + 1602, -25, 25);
      ink.fillStyle(i % 3 === 0 ? 0x3c654c : 0x2a5545, .87);
      ink.fillEllipse(x, 635 + pick(i + 130, -6, 10), pick(i + 712, 75, 145), 40);
      if (i % 4 === 0) {
        ink.fillStyle(0x152d29, .9);
        ink.fillEllipse(x + 18, 622, 26, 20);
      }
    }
    // Front depth cue. Deliberately behind characters and HUD.
    const front = this.scene.add.graphics().setDepth(13.5);
    front.fillStyle(0x071c19, .24);
    const spacing = this.lowPower ? 390 : 290;
    for (let x = 130; x < this.width; x += spacing) {
      front.fillEllipse(x - 8, 690, 180, 115);
      front.fillEllipse(x + 80, 710, 165, 104);
      front.lineStyle(5, 0x071a16, .23);
      front.lineBetween(x + 55, 0, x + 62, 112);
      front.lineBetween(x + 62, 112, x + 49, 174);
    }
    // Few atmospheric sprites, reused each frame. The rest is static vector art.
    const fogCount = this.lowPower ? 3 : 6;
    for (let i = 0; i < fogCount; i++) {
      const x = (i + .5) * this.width / fogCount;
      const shape = this.scene.add.ellipse(x, 505 + (i % 3) * 33,
        this.lowPower ? 260 : 450, 76, 0x90b3aa, .028).setDepth(12);
      this.fog.push({ shape, x, seed: i * 7.2 });
    }
    const count = this.lowPower ? 10 : 24;
    for (let i = 0; i < count; i++) {
      const x = pick(i + 2201, 0, this.width);
      const y = pick(i + 3501, 210, 615);
      const dot = this.scene.add.circle(x, y, 1.8 + (i % 3) * .55,
        i % 3 === 0 ? 0xbce5b3 : 0x89c7c0, .15).setDepth(14.5);
      this.lights.push({ dot, originX: x, originY: y, seed: i * 37 + 1 });
    }
    // Small, slow falling leaves. Position updates only; no particle emitters or textures.
    for (let i = 0; i < (this.lowPower ? 6 : 14); i++) {
      const x = pick(i + 8300, 0, this.width);
      const leaf = this.scene.add.ellipse(x, -20, 8, 3,
        i % 2 ? 0x58765a : 0x87a07c, .31).setDepth(13.2).setAngle(i * 23);
      this.leaves.push({ shape: leaf, originX: x, seed: i * 11 + 3 });
    }
    // Pair of eyes in shadows, spaced far from objective labels.
    const eyes = this.scene.add.graphics().setDepth(-8);
    for (let x = 390; x < this.width - 60; x += 870) {
      eyes.fillStyle(0xacc886, .35);
      eyes.fillEllipse(x, 450, 5, 2.8);
      eyes.fillEllipse(x + 17, 450, 5, 2.8);
    }
  }

  water(start: number, end: number, y: number): void {
    const g = this.scene.add.graphics().setDepth(-1.6);
    const width = end - start;
    g.fillGradientStyle(0x133d4e, 0x0e344b, 0x071b31, 0x07192d, .98);
    g.fillRect(start, y, width, 700 - y);
    g.lineStyle(2, 0x88c7bd, .32);
    g.lineBetween(start, y + 2, end, y + 2);
    for (let i = 0; i < Math.ceil(width / 33); i++) {
      const x = start + i * 33 + pick(i + start, 1, 18);
      const yy = y + 16 + pick(i * 3 + start, 0, 68);
      g.lineStyle(i % 3 === 0 ? 2 : 1, 0x9bcfc9, i % 3 === 0 ? .22 : .14);
      g.lineBetween(x, yy, Math.min(end, x + 16 + (i % 2) * 16), yy);
    }
    const shore = this.scene.add.graphics().setDepth(5.1);
    shore.lineStyle(3, 0x476d61, .45);
    shore.lineBetween(start, y + 3, start + 15, y + 10);
    shore.lineBetween(end - 15, y + 10, end, y + 3);
  }

  platform(rect: Phaser.GameObjects.Rectangle, material: Material = 'earth'): void {
    const g = this.scene.add.graphics().setDepth(rect.depth + .2);
    this.paintPlatform(g, rect.width, rect.height, material,
      rect.x * .27 + rect.y * .71);
    g.setPosition(rect.x, rect.y);
    this.skins.push({ target: rect, ink: g });
  }

  private paintPlatform(g: Phaser.GameObjects.Graphics, width: number, height: number,
    material: Material, seed: number): void {
    const x = -width / 2, y = -height / 2;
    const wooden = material === 'wood' || material === 'bridge' || material === 'log';
    const barrier = material === 'gate' || material === 'root';
    const colors = wooden ? [0x392e2b, 0x745842, 0x957457] :
      barrier ? [0x1a3736, 0x426657, 0x558679] :
      material === 'stone' ? [0x253a41, 0x56706c, 0x6f8980] :
        [0x1b322c, 0x3c5a46, 0x608060];
    g.fillStyle(colors[0], 1); g.fillRoundedRect(x, y, width, height, Math.min(7, height / 4));
    g.fillStyle(colors[1], .85);
    g.fillRect(x + 3, y + 4, Math.max(1, width - 6), Math.max(2, Math.min(8, height - 4)));
    g.lineStyle(2, colors[2], .84);
    g.lineBetween(x + 2, y + 1, x + width - 2, y + 1);
    if (wooden) {
      for (let i = 0; i < Math.ceil(width / 42); i++) {
        const at = x + i * 42 + 3;
        if (at >= x + width - 3) break;
        g.lineStyle(2, 0x261f21, .59);
        g.lineBetween(at, y + 4, at, y + height - 3);
        g.lineStyle(1, 0xc59a6e, .36);
        g.lineBetween(at + 8, y + 7, Math.min(at + 27, x + width - 6), y + 7);
        g.fillStyle(0x172626, .8); g.fillCircle(at + 5, y + height / 2, 1.5);
      }
      if (height > 27) {
        g.lineStyle(3, 0x493529, .7);
        g.lineBetween(x + 4, y + height - 7, x + width - 4, y + height - 7);
      }
    } else if (barrier) {
      for (let i = 0; i < Math.max(2, Math.ceil(height / 45)); i++) {
        const yy = y + i * 40 + 8;
        if (yy > y + height - 7) break;
        g.lineStyle(3, colors[2], .6);
        g.lineBetween(x + 7, yy, x + width - 7, yy + 11);
      }
    } else {
      const count = Math.min(95, Math.ceil(width / 33));
      for (let i = 0; i < count; i++) {
        const at = x + pick(seed + i * 2.31, 5, Math.max(5, width - 8));
        const yy = y + pick(seed + i * 2.31 + 141, 12, Math.max(13, height - 5));
        g.fillStyle(colors[2], .25 + visualNoise(i + seed) * .17);
        g.fillEllipse(at, yy, pick(seed + i * 7, 6, 21), pick(seed + i * 9, 3, 9));
      }
      // Small moss and roots on the surface; remain purely cosmetic.
      const spots = Math.min(72, Math.ceil(width / 29));
      for (let i = 0; i < spots; i++) {
        const at = x + i * 28 + pick(i + seed, -5, 9);
        g.lineStyle(2, 0x628363, .58);
        g.lineBetween(at, y + 2, at - 4, y - 5 - (i % 3) * 2);
        g.lineBetween(at, y + 2, at + 3, y - 3);
      }
    }
  }

  character(target: Phaser.GameObjects.Rectangle, seat: 0 | 1 | 2): void {
    // The original 30x44 rectangle remains the ONLY collision body.
    const ink = this.scene.add.graphics().setDepth(target.depth + .25);
    const shadow = this.scene.add.ellipse(target.x, target.y + 26, 39, 11,
      0x020c0d, .38).setDepth(target.depth - .5);
    const coat = [0x2e9061, 0xc17a42, 0x4589c4][seat];
    const accent = [0x9be5a4, 0xf8b676, 0x95d9f0][seat];
    ink.fillStyle(0x101c20, 1);
    ink.fillRoundedRect(-16, -21, 32, 43, 6);
    ink.fillStyle(coat, 1);
    ink.fillRoundedRect(-12, -12, 24, 28, 5);
    ink.fillStyle(0x18282d, 1);
    ink.fillRoundedRect(-15, 10, 12, 11, 2);
    ink.fillRoundedRect(3, 10, 12, 11, 2);
    ink.fillStyle(0xd0a77c, 1);
    ink.fillEllipse(0, -20, 24, 21);
    ink.fillStyle(0x18252b, 1);
    ink.fillEllipse(0, -28, 29, 13);
    if (seat === 0) {
      ink.fillStyle(0x24462c, 1);
      ink.fillRoundedRect(-18, -31, 36, 7, 2);
      ink.fillRoundedRect(-11, -39, 22, 12, 3);
    } else if (seat === 1) {
      ink.fillStyle(0x4d2d2a, 1);
      ink.fillEllipse(12, -20, 13, 22);
      ink.fillEllipse(-5, -30, 20, 13);
      ink.lineStyle(3, 0x422722, 1); ink.lineBetween(16, -20, 18, -6);
    } else {
      ink.fillStyle(0x19334b, 1);
      ink.lineStyle(4, 0x183348, 1);
      ink.strokeRoundedRect(-15, -35, 30, 26, 8);
      ink.fillStyle(0x8ac7f2, 1);
      ink.fillRect(-12, 0, 24, 4);
    }
    ink.fillStyle(0xeef4e3, 1); ink.fillRect(3, -22, 4, 3);
    ink.lineStyle(2, accent, .95);
    ink.lineBetween(-9, 1, 8, 1);
    this.actors.push({ target, ink, shadow });
  }

  /** Call from each existing scene update. No allocations in the hot path. */
  update(time: number): void {
    for (const skin of this.skins) {
      skin.ink.setPosition(skin.target.x, skin.target.y);
      skin.ink.setVisible(skin.target.visible && skin.target.active);
      skin.ink.setAlpha(skin.target.alpha);
      skin.ink.setAngle(skin.target.angle);
    }
    for (const actor of this.actors) {
      actor.ink.setPosition(actor.target.x, actor.target.y);
      actor.ink.setVisible(actor.target.visible && actor.target.active);
      actor.ink.setAlpha(actor.target.alpha);
      actor.shadow.setPosition(actor.target.x, actor.target.y + 27);
      actor.shadow.setVisible(actor.target.visible && actor.target.active);
    }
    for (const entry of this.fog) {
      entry.shape.x = entry.x + Math.sin(time / 4800 + entry.seed) * 31;
      entry.shape.alpha = .025 + Math.sin(time / 2200 + entry.seed) * .007;
    }
    for (const leaf of this.leaves) {
      const phase = ((time / 14500 + visualNoise(leaf.seed)) % 1);
      leaf.shape.x = leaf.originX + Math.sin(time / 2100 + leaf.seed) * 26;
      leaf.shape.y = 65 + phase * 545;
      leaf.shape.rotation = time / 3200 + leaf.seed;
    }
    for (const entry of this.lights) {
      entry.dot.setPosition(entry.originX + Math.sin(time / 1250 + entry.seed) * 7,
        entry.originY + Math.cos(time / 1600 + entry.seed) * 9);
      entry.dot.setAlpha(.14 + (.5 + .5 * Math.sin(time / 1000 + entry.seed)) * .47);
    }
  }
}
