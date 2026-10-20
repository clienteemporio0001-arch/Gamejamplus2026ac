import Phaser from 'phaser';
import {HOUND_HP,HOUND_NAME,type HoundState} from './hellHoundBoss';
const KEY='hell-hound-boss';
export function preloadHound(scene:Phaser.Scene):void{
 if(!scene.textures.exists(KEY))scene.load.spritesheet(KEY,
  import.meta.env.BASE_URL+'assets/enemies/hellhound-final.png?v=1',
  {frameWidth:72,frameHeight:48});
}
export class HoundVisual{
 private dog:Phaser.GameObjects.Sprite;
 private health:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 constructor(scene:Phaser.Scene){
  // The artwork is 72x48 per frame, displayed at exactly 2x.
  this.dog=scene.add.sprite(4800,651,KEY,0).setOrigin(.5,1)
   .setScale(2).setDepth(62).setVisible(false);
  this.health=scene.add.graphics().setDepth(64);
  this.title=scene.add.text(4800,530,HOUND_NAME,{
    fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#ffe2b3',
    stroke:'#231018',strokeThickness:4
  }).setOrigin(.5).setDepth(65).setVisible(false);
 }
 update(state:HoundState,now:number,unlocked:boolean):void{
  const dead=state.hp===0;
  const fade=dead?Math.max(0,1-(now-state.defeatedAt)/1200):1;
  const show=unlocked&&(!dead||fade>0);
  this.dog.setVisible(show);
  this.title.setVisible(show&&!dead);
  this.health.clear();
  if(!show)return;
  const jumping=state.leapAt>0&&now-state.leapAt<800;
  const running=state.active&&!jumping;
  const frame=jumping?11+Math.min(5,Math.floor((now-state.leapAt)/134)):
   running?6+Math.floor(now/105)%5:Math.floor(now/170)%6;
  this.dog.setFrame(frame).setPosition(state.x,state.y+17)
   .setFlipX(state.facing>0).setScale(2).setAlpha(fade);
  this.title.setPosition(state.x,state.y-99);
  if(dead)return;
  this.health.fillStyle(0x1d1013,.98).fillRoundedRect(state.x-64,state.y-86,128,14,3);
  this.health.fillStyle(0xff6b39,1).fillRect(state.x-61,state.y-83,122*state.hp/HOUND_HP,8);
 }
 destroy():void{this.dog.destroy();this.health.destroy();this.title.destroy();}
}
