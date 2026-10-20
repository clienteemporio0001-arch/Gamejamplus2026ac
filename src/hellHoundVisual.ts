import Phaser from 'phaser';
import {HOUND_HP,HOUND_NAME,type HoundState} from './hellHoundBoss';
const KEY='hell-hound-boss';
export function preloadHound(scene:Phaser.Scene):void{
 if(!scene.textures.exists(KEY))scene.load.spritesheet(KEY,
  import.meta.env.BASE_URL+'assets/enemies/hellhound-final.png?v=2',
  {frameWidth:72,frameHeight:48});
}

/**
 * Final guardian is deliberately visible even BEFORE the tree puzzle is cleared.
 * Previously rendering was gated by treeOpen, which could make the ending
 * appear empty. Only the combat logic is gated by treeOpen.
 * Native vector silhouette is a fail-safe if a sprite fails to download.
 */
export class HoundVisual {
 private dog:Phaser.GameObjects.Sprite;
 private aura:Phaser.GameObjects.Graphics;
 private health:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 constructor(scene:Phaser.Scene){
  this.aura=scene.add.graphics().setDepth(60);
  this.dog=scene.add.sprite(4800,651,KEY,0).setOrigin(.5,1)
   .setScale(2).setDepth(63).setVisible(false).setAlpha(1);
  this.health=scene.add.graphics().setDepth(64);
  this.title=scene.add.text(4800,521,HOUND_NAME,{
   fontFamily:'Arial',fontSize:'16px',fontStyle:'bold',color:'#fff1cf',
   stroke:'#180912',strokeThickness:5
  }).setOrigin(.5).setDepth(65).setVisible(false);
 }
 update(state:HoundState,now:number,treeOpen:boolean):void{
  const dead=state.hp===0;
  const vanish=dead?Math.max(0,1-(now-state.defeatedAt)/1300):1;
  // Never hide the live guardian while waiting for a tree transition.
  const show=!dead||vanish>0;
  const x=state.x,y=state.y;
  this.dog.setVisible(show).setAlpha(vanish);
  this.title.setVisible(show&&!dead);
  this.aura.clear();this.health.clear();
  if(!show)return;
  // Vivid native fallback ensures boss remains recognizable on dark red scenery.
  this.aura.fillStyle(0x240c17,.85*vanish).fillEllipse(x,y+14,155,27);
  this.aura.fillStyle(0xff4d12,.25*vanish).fillEllipse(x,y-43,160,96);
  this.aura.lineStyle(4,0xffb048,.94*vanish).strokeEllipse(x,y-43,161,98);
  this.aura.fillStyle(0x42141c,.96*vanish);
  this.aura.fillEllipse(x,y-31,102,49);
  this.aura.fillEllipse(x-43,y-14,17,40);
  this.aura.fillEllipse(x+42,y-14,17,40);
  this.aura.fillStyle(0xff8b43,vanish);
  this.aura.fillCircle(x-15,y-49,7);
  this.aura.fillCircle(x+16,y-49,7);
  // Sprite plays on top of the fallback: exactly 2x the original atlas frame.
  const leaping=state.leapAt>0&&now-state.leapAt<800;
  const running=state.active&&!leaping;
  const frame=leaping?11+Math.min(5,Math.floor((now-state.leapAt)/134)):
   running?6+Math.floor(now/105)%5:Math.floor(now/170)%6;
  if(this.dog.texture.key===KEY&&this.dog.texture.has(String(frame)))
   this.dog.setFrame(frame);
  this.dog.setPosition(x,y+17).setFlipX(state.facing>0).setScale(2);
  this.title.setPosition(x,y-136).setText(treeOpen?HOUND_NAME:HOUND_NAME+' · GUARDA A SAÍDA');
  if(dead)return;
  this.health.fillStyle(0x10080b,.96).fillRoundedRect(x-75,y-116,150,18,5);
  this.health.lineStyle(2,0xffb54b,1).strokeRoundedRect(x-75,y-116,150,18,5);
  this.health.fillStyle(0xff4e20,1).fillRect(x-71,y-111,142*state.hp/HOUND_HP,9);
  this.health.fillStyle(0xffcb69,.9).fillCircle(x-77,y-107,3);
 }
 destroy():void{this.dog.destroy();this.aura.destroy();this.health.destroy();this.title.destroy();}
}
