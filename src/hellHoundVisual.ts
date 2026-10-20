import Phaser from 'phaser';
import {HOUND_HP,HOUND_NAME,type HoundState} from './hellHoundBoss';

// Single TRUE-COLOR RGBA still frame. The former indexed-color animated sheet
// rendered an opaque black rectangle on some browser/GPU combinations.
const KEY='hellhound-static-v3';
export function preloadHound(scene:Phaser.Scene):void{
 if(!scene.textures.exists(KEY))
  scene.load.image(KEY,import.meta.env.BASE_URL+'assets/enemies/hellhound-static-rgba.png?v=3');
}
export class HoundVisual {
 private dog:Phaser.GameObjects.Image;
 private marker:Phaser.GameObjects.Graphics;
 private health:Phaser.GameObjects.Graphics;
 private title:Phaser.GameObjects.Text;
 constructor(scene:Phaser.Scene){
  this.marker=scene.add.graphics().setDepth(61);
  this.dog=scene.add.image(4800,651,KEY).setOrigin(.5,1).setScale(2)
   .setDepth(63).setVisible(false).setAlpha(1);
  this.health=scene.add.graphics().setDepth(64);
  this.title=scene.add.text(4800,520,HOUND_NAME,{
    fontFamily:'Arial',fontSize:'15px',fontStyle:'bold',color:'#fff1cf',
    stroke:'#180912',strokeThickness:4
  }).setOrigin(.5).setDepth(65).setVisible(false);
 }
 update(state:HoundState,now:number,treeOpen:boolean):void{
  const dead=state.hp===0;
  const opacity=dead?Math.max(0,1-(now-state.defeatedAt)/1300):1;
  const visible=!dead||opacity>0;
  const x=state.x,y=state.y;
  this.marker.clear();this.health.clear();
  this.title.setVisible(visible&&!dead);
  // An unavailable texture must never render Phaser's missing-image square.
  const textureReady=this.dog.scene.textures.exists(KEY);
  this.dog.setVisible(visible&&textureReady).setAlpha(opacity);
  if(!visible)return;
  // Light, transparent world-space marker, not a filled black bounding box.
  this.marker.lineStyle(3,0xffa13b,.94*opacity).strokeEllipse(x,y-24,105,65);
  if(!textureReady){
   // Safe native fallback: small recognizable dog silhouette.
   this.marker.fillStyle(0xa94025,opacity).fillEllipse(x,y-23,74,37);
   this.marker.fillTriangle(x-26,y-36,x-18,y-61,x-7,y-42);
   this.marker.fillTriangle(x+5,y-43,x+20,y-62,x+24,y-39);
   this.marker.fillStyle(0xffd86c,opacity).fillCircle(x+14,y-30,5);
  }
  // Static frame with real per-pixel alpha (not indexed PNG), exact 2x size.
  this.dog.setPosition(x,y+17).setFlipX(state.facing>0).setScale(2);
  this.title.setPosition(x,y-100)
   .setText(treeOpen?HOUND_NAME:HOUND_NAME+' · GUARDA A SAÍDA');
  if(dead)return;
  this.health.fillStyle(0x231018,.96).fillRoundedRect(x-70,y-85,140,15,4);
  this.health.lineStyle(2,0xffb54b,1).strokeRoundedRect(x-70,y-85,140,15,4);
  this.health.fillStyle(0xff642f,1).fillRect(x-67,y-81,134*state.hp/HOUND_HP,7);
 }
 destroy():void{
  this.dog.destroy();this.marker.destroy();this.health.destroy();this.title.destroy();
 }
}
