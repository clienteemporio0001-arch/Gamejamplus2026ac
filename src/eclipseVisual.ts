import Phaser from 'phaser';
import {ECLIPSE_MAX_HP,ECLIPSE_NAME,type EclipseBoss} from './eclipseBoss';
// Solid native graphics avoid translucent/incorrectly cropped external sprite frames.
export function preloadEclipse(_scene:Phaser.Scene):void{}
export class EclipseVisual {
 private ink:Phaser.GameObjects.Graphics;
 private bar:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 private bolt:Phaser.GameObjects.Arc;
 constructor(scene:Phaser.Scene){
  this.ink=scene.add.graphics().setDepth(53);
  this.bar=scene.add.graphics().setDepth(54);
  this.title=scene.add.text(4850,475,ECLIPSE_NAME,{
   fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#f7eaff',
   stroke:'#10091e',strokeThickness:5}).setOrigin(.5).setDepth(55);
  this.bolt=scene.add.circle(0,0,15,0x69d7ff,.96)
   .setStrokeStyle(4,0xe0f9ff,1).setDepth(51).setVisible(false);
 }
 update(b:EclipseBoss,now:number):void{
  const dead=b.hp===0,dying=dead&&now-b.defeatedAt<1700;
  const visible=b.awakeAt>0&&(!dead||dying);
  this.ink.clear();this.bar.clear();this.bolt.setVisible(false);
  this.title.setVisible(visible&&!dead);
  if(!visible)return;
  const ascent=dead?Math.min(170,(now-b.defeatedAt)*.10):0;
  const y=b.y-ascent,alpha=dead?Math.max(0,1-(now-b.defeatedAt)/1700):1;
  const x=b.x,jump=Math.sin(now*.008)*3;
  this.ink.fillStyle(0x120d22,.75*alpha).fillEllipse(x,y+17,104,17);
  this.ink.fillStyle(0x342044,alpha).fillRoundedRect(x-35,y-120+jump,70,111,17);
  this.ink.lineStyle(5,0xb778fb,alpha).strokeRoundedRect(x-35,y-120+jump,70,111,17);
  this.ink.fillStyle(0x24142e,alpha).fillTriangle(x-45,y-107+jump,x,y-177+jump,x+45,y-107+jump);
  this.ink.fillStyle(0x765197,alpha).fillCircle(x,y-134+jump,32);
  this.ink.fillStyle(0x140b23,alpha).fillCircle(x,y-134+jump,25);
  this.ink.fillStyle(0x6df3f2,alpha).fillEllipse(x-12,y-137+jump,12,7);
  this.ink.fillStyle(0x6df3f2,alpha).fillEllipse(x+12,y-137+jump,12,7);
  this.ink.lineStyle(7,0x9c73d9,alpha).lineBetween(x-27,y-90+jump,x-58,y-34+jump);
  this.ink.lineBetween(x+27,y-90+jump,x+58,y-34+jump);
  this.ink.fillStyle(0x6b4b88,alpha).fillEllipse(x-17,y-9,30,16);
  this.ink.fillEllipse(x+17,y-9,30,16);
  // Floating core and full-opacity purple armor for high contrast against fire.
  this.ink.fillStyle(0xe1a5ff,alpha).fillCircle(x,y-77+jump,13);
  this.ink.fillStyle(0xffffff,alpha).fillCircle(x-3,y-80+jump,5);
  this.title.setPosition(x,y-195);
  if(dead)return;
  const left=x-82,top=y-184;
  this.bar.fillStyle(0x140d22,1).fillRoundedRect(left-4,top-4,172,20,5);
  this.bar.fillStyle(0x493157,1).fillRect(left,top,164,12);
  this.bar.fillStyle(0xc079ff,1).fillRect(left,top,164*b.hp/ECLIPSE_MAX_HP,12);
  const delta=now-b.attackAt;
  if(b.attackAt>0&&delta>=80&&delta<900){
   this.bolt.setVisible(true).setPosition(b.x+b.facing*delta*.25,b.y-38);
  }
 }
 destroy():void{this.ink.destroy();this.bar.destroy();this.title.destroy();this.bolt.destroy();}
}
