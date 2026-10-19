import Phaser from 'phaser';
import {preloadKenneyCharacters,KENNEY_KEYS} from './kenneyCharacterSprites';
import {paintHero} from './sharedCharacterArt';
import { CHARACTERS } from './network';

const STORY = [
  'Era mais uma tarde de brincadeiras na beira da mata...',
  'Mas a diversão fez os três perderem a noção do tempo.',
  'Quando a boca da noite chegou, perceberam que a floresta havia mudado.',
  'A FLORESTA MENTE. MAS O VENTO NÃO. NINGUÉM FICA PARA TRÁS.',
] as const;
/** Sequência cinematográfica leve; encerramento e skip são sempre decididos pelo anfitrião. */
export class IntroScene extends Phaser.Scene {
  private caption!: Phaser.GameObjects.Text;
  private captionShadow!: Phaser.GameObjects.Rectangle;
  private night!: Phaser.GameObjects.Rectangle;
  private tree!: Phaser.GameObjects.Container;
  private current = -1;
  private elapsed = 0;
  private characters: Phaser.GameObjects.Container[] = [];
  constructor() { super({ key: 'IntroScene' }); }

  preload():void{preloadKenneyCharacters(this);}
  create(): void {
    this.cameras.main.setBackgroundColor('#203e43');
    const g = this.add.graphics().setDepth(-20);
    g.fillGradientStyle(0xf6a160, 0xedb67a, 0x245565, 0x24413b);
    g.fillRect(0, 0, 1200, 700);
    this.add.circle(975, 134, 61, 0xffe5a5, .8).setDepth(-16);
    for (let depth = 0; depth < 3; depth++) {
      const color = [0x2d6c59, 0x235342, 0x173f36][depth];
      for (let i = 0; i < 20; i++) {
        const x = i * 71 + depth * 27 - 60;
        const h = 220 + ((i * 79 + depth * 41) % 180);
        this.add.rectangle(x, 633 - h / 2, 24, h, color).setDepth(-12 + depth * 3);
        this.add.ellipse(x, 625 - h, 105, 110, color).setDepth(-11 + depth * 3);
      }
    }
    this.add.rectangle(600, 652, 1200, 95, 0x17372b).setDepth(0);
    this.add.rectangle(600, 615, 1200, 28, 0x365b41).setDepth(1);
    this.tree = this.add.container(1010, 475).setDepth(4);
    const trunk = this.add.rectangle(0, -15, 90, 280, 0x30261e);
    const crown = this.add.ellipse(-18, -178, 290, 230, 0x173e30);
    const crown2 = this.add.ellipse(80, -152, 190, 200, 0x245039);
    this.tree.add([trunk, crown, crown2]);
    this.tree.x = 1260;
    for (let i = 0; i < 3; i++) {
      const avatar = this.add.container(270 + i * 90, 583).setDepth(6);
      const hero = this.add.graphics();hero.setPosition(0,-29);
      paintHero(hero,i as 0|1|2);
      const name = this.add.text(0, -98, CHARACTERS[i].name, {
        fontFamily: 'Arial', fontSize: '17px', color: CHARACTERS[i].hex, fontStyle: 'bold'
      }).setOrigin(.5);
      avatar.add([hero,name]);
      if(this.textures.exists(KENNEY_KEYS[i])){
        hero.setVisible(false);
        const sprite=this.add.sprite(0,0,KENNEY_KEYS[i],'idle')
          .setOrigin(.5,1).setDisplaySize(56,74);
        avatar.add(sprite);
      }
      this.characters.push(avatar);
      this.tweens.add({ targets: avatar, y: 580, yoyo: true, repeat: -1, duration: 510 + i * 110, ease: 'Sine.easeInOut' });
    }
    this.night = this.add.rectangle(600, 350, 1200, 700, 0x020d22, 0).setDepth(7);
    this.captionShadow = this.add.rectangle(600, 564, 1060, 100, 0x061812, .83).setDepth(8);
    this.caption = this.add.text(600, 564, '', {
      fontFamily: 'Arial', fontSize: '27px', color: '#edffce', align: 'center',
      stroke: '#081c18', strokeThickness: 5, wordWrap: { width: 950 }
    }).setOrigin(.5).setDepth(9);
    const label = this.add.text(600, 50, 'A FLORESTA MENTE • PRÓLOGO', {
      fontFamily: 'Arial', fontSize: '18px', color: '#edffce', fontStyle: 'bold'
    }).setOrigin(.5).setDepth(10);
    this.tweens.add({ targets: label, alpha: .5, yoyo: true, repeat: -1, duration: 1300 });
    const resize=(size:Phaser.Structs.Size)=>{
      // A 1200 × 700 cinematic is letterboxed, NEVER stretched or cropped.
      const zoom=Math.max(.25,Math.min(1.25,size.width/1200,size.height/700));
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(600,350);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE,resize);
    resize(this.scale.gameSize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>
      this.scale.off(Phaser.Scale.Events.RESIZE,resize));
    this.setPanel(0);
    // A duração é decorativa; quem libera a próxima fase é o host via estado de rede.
  }
  private setPanel(panel: number): void {
    this.current = panel;
    this.caption.setText(STORY[panel]).setAlpha(0);
    this.tweens.add({ targets: this.caption, alpha: 1, duration: 750 });
    this.tweens.add({ targets: this.night, alpha: [0, .21, .48, .75][panel], duration: 1500 });
    if (panel >= 2) {
      this.tweens.add({ targets: this.characters, x: '-=30', duration: 3400 });
    }
    if (panel === 3) {
      this.tweens.add({ targets: this.tree, x: 950, duration: 3000, ease: 'Sine.easeInOut' });
      this.cameras.main.shake(160, .0014);
      this.time.delayedCall(1800, () => {
        this.add.text(600, 220, 'A FLORESTA MENTE', {
          fontFamily: 'Arial', fontSize: '58px', color: '#efffcb', fontStyle: 'bold',
          stroke: '#10221e', strokeThickness: 6,
        }).setOrigin(.5).setDepth(11);
        this.add.text(600, 278, 'Ninguém fica para trás.', {
          fontFamily: 'Arial', fontSize: '23px', color: '#d8f3bd',
        }).setOrigin(.5).setDepth(11);
      });
    }
  }
  update(_time: number, delta: number): void {
    this.elapsed = Math.min(this.elapsed + Math.min(delta, 100), 25000);
    const panel = Math.min(3, Math.floor(this.elapsed / 6000));
    if (panel !== this.current) this.setPanel(panel);
    // Vagalumes visuais, sem efeito na física (aleatoriedade local é permitida).
    if (Math.random() < .025) {
      const dot = this.add.circle(Phaser.Math.Between(25, 1180), Phaser.Math.Between(160, 545), 2, 0xe7ffae, .9).setDepth(6);
      this.tweens.add({ targets: dot, alpha: 0, y: dot.y - 25, duration: 1250, onComplete: () => dot.destroy() });
    }
  }
}
