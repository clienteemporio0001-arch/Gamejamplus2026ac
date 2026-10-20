import Phaser from 'phaser';
import {BAFOMET_MAX_HP,type BafometState} from './bafometBoss';

/** Animates the 16 authentic frames extracted from the user's satyr spritesheet. */
const KEY='boss-bafomet';
export function preloadBafomet(scene:Phaser.Scene):void{
 if(!scene.textures.exists(KEY))scene.load.spritesheet(KEY,
  import.meta.env.BASE_URL+'assets/enemies/bafomet-sprites.png',
  {frameWidth:32,frameHeight:64});
}
export class BafometVisual {
 private actor:Phaser.GameObjects.Sprite;
 private bar:Phaser.GameObjects.Graphics;
 private name:Phaser.GameObjects.Text;
 constructor(private scene:Phaser.Scene){
  this.actor=scene.add.sprite(3900,570,KEY,0).setScale(1.62).setDepth(39);
  this.actor.setFlipX(true);
  this.bar=scene.add.graphics().setDepth(45);
  this.name=scene.add.text(0,0,'BAFOMET · GUARDIÃO DA PASSAGEM',{
    fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#ffcfb0',
    stroke:'#230b09',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(46);
 }
 update(b:BafometState,now:number,awake:boolean):void{
  const visible=awake||b.hp===0&&b.defeatedAt>0&&now-b.defeatedAt<2500;
  this.actor.setVisible(visible);
  this.bar.clear();
  this.name.setVisible(visible&&b.hp>0);
  if(!visible)return;
  const leaping=b.leapAt>0&&now-b.leapAt<880;
  const striking=b.lastSwingAt>0&&now-b.lastSwingAt<380;
  const frame=b.hp===0?(now-b.defeatedAt<500?14:15):
    striking?10+Math.floor(now/100)%4:
    leaping?7+Math.floor((now-b.leapAt)/170)%3:
    Math.floor(now/125)%7;
  this.actor.setFrame(frame).setPosition(b.x,b.y-31).setFlipX(b.facing<0);
  this.actor.setTint(now<b.hurtUntil?0xff6464:0xffffff);
  this.name.setPosition(b.x,b.y-125);
  if(b.hp===0)return;
  const x=b.x-66,y=b.y-112,width=132;
  this.bar.fillStyle(0x180d15,.9);this.bar.fillRoundedRect(x-4,y-4,width+8,16,4);
  this.bar.fillStyle(0x683a31,1);this.bar.fillRect(x,y,width,8);
  this.bar.fillStyle(b.hp<=4?0xf45850:0xe7a766,1);
  this.bar.fillRect(x,y,width*b.hp/BAFOMET_MAX_HP,8);
  this.bar.lineStyle(1,0xf9d8bc,.88);this.bar.strokeRoundedRect(x-4,y-4,width+8,16,4);
 }
}
