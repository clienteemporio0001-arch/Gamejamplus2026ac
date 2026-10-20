import Phaser from 'phaser';
import {ECLIPSE_MAX_HP,ECLIPSE_NAME,type EclipseBoss} from './eclipseBoss';
const KEY='final-eclipse-sentinel';
export function preloadEclipse(scene:Phaser.Scene):void{
 if(!scene.textures.exists(KEY))scene.load.spritesheet(KEY,
  import.meta.env.BASE_URL+'assets/enemies/eclipsesentinel.webp',
  {frameWidth:36,frameHeight:36});
}
export class EclipseVisual {
 private actor:Phaser.GameObjects.Sprite;
 private bar:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 private bolt:Phaser.GameObjects.Arc;
 constructor(scene:Phaser.Scene){
  this.actor=scene.add.sprite(4850,650,KEY,5).setScale(2.8).setOrigin(.5,1).setDepth(53).setVisible(false);
  this.bar=scene.add.graphics().setDepth(54);
  this.title=scene.add.text(4850,488,ECLIPSE_NAME,{
   fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#e7ddff',
   stroke:'#160d28',strokeThickness:4}).setOrigin(.5).setDepth(55);
  this.bolt=scene.add.circle(0,0,14,0x78eeed,.85)
   .setStrokeStyle(3,0xe6ffff,1).setDepth(51).setVisible(false);
 }
 update(b:EclipseBoss,now:number):void{
  const spawn=b.awakeAt>0&&now-b.awakeAt<900;
  const dead=b.hp===0;
  const dying=dead&&now-b.defeatedAt<1800;
  const active=b.awakeAt>0&&(!dead||dying);
  this.actor.setVisible(active);
  this.title.setVisible(active&&!dead);
  this.bar.clear();this.bolt.setVisible(false);
  if(!active)return;
  const frame=dead?4:spawn?5:now<b.hurtUntil?3:
   b.attackAt>0&&now-b.attackAt<680?1:0;
  const float=dead?Math.min(160,(now-b.defeatedAt)*.10):0;
  this.actor.setFrame(frame).setPosition(b.x,b.y+18-float)
   .setFlipX(b.facing<0).setAlpha(dead?Math.max(0,1-(now-b.defeatedAt)/1800):1);
  this.title.setPosition(b.x,b.y-136);
  if(dead)return;
  const left=b.x-78,top=b.y-118;
  this.bar.fillStyle(0x1b132d,.94).fillRoundedRect(left-4,top-4,164,17,4);
  this.bar.fillStyle(0x57315b,1).fillRect(left,top,156,9);
  this.bar.fillStyle(0xa879ee,1).fillRect(left,top,156*b.hp/ECLIPSE_MAX_HP,9);
  const delta=now-b.attackAt;
  if(b.attackAt>0&&delta>=80&&delta<900){
   this.bolt.setVisible(true).setPosition(b.x+b.facing*delta*.25,b.y-38);
   this.bolt.setScale(1+.15*Math.sin(now*.03));
  }
 }
 destroy():void{
  this.actor.destroy();this.bar.destroy();this.title.destroy();this.bolt.destroy();
 }
}
