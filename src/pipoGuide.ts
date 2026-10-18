import Phaser from 'phaser';
import type {Network,Seat} from './network';
import {pipoHint,type HintSource} from './pipoHints';

/** One decorative bird per Phaser scene; no physics, AI, network packets or external assets. */
export class PipoGuide {
 private bird:Phaser.GameObjects.Container;
 private left:Phaser.GameObjects.Graphics;
 private right:Phaser.GameObjects.Graphics;
 private beak:Phaser.GameObjects.Graphics;
 private bubble:Phaser.GameObjects.Container;
 private panel:Phaser.GameObjects.Graphics;
 private label:Phaser.GameObjects.Text;
 private key?:Phaser.Input.Keyboard.Key;
 private listener=()=>this.ask();
 private previousCycle=-1;
 private objective='';
 private depth:0|1|2=0;
 private lastAsk=-100000;
 private lastProgress=0;
 private talkingUntil=0;
 private fadingUntil=0;
 private targetX=0;private targetY=0;
 private perched=false;
 private seed=0;
 constructor(private scene:Phaser.Scene,private net:Network){
  const add=scene.add;
  const tail=add.graphics().setDepth(128);
  tail.fillStyle(0x239ab4);tail.fillTriangle(-3,12,7,12,23,48);
  tail.fillStyle(0xe5cf54);tail.fillTriangle(-10,8,0,13,4,43);
  const body=add.graphics();
  body.fillStyle(0x08271e);body.fillEllipse(0,0,50,55);
  body.fillStyle(0x50d96a);body.fillEllipse(0,-3,42,50);
  body.fillStyle(0x9ee75e);body.fillEllipse(-4,-6,25,31);
  body.fillStyle(0x215f44);body.fillEllipse(-4,13,26,16);
  body.fillStyle(0xf1d466);body.fillEllipse(17,-15,17,20);
  body.fillStyle(0xffffff);body.fillCircle(19,-18,6);
  body.fillStyle(0x122a2b);body.fillCircle(21,-18,2.7);
  body.lineStyle(2,0x092e2e);body.strokeEllipse(19,-18,12,12);
  const right=add.graphics();
  right.fillStyle(0x1d91bd);right.fillEllipse(0,3,39,17);
  right.fillStyle(0x8cd9ed);right.fillEllipse(-9,0,22,6);
  const left=add.graphics();
  left.fillStyle(0x186a92);left.fillEllipse(-12,4,39,19);
  left.fillStyle(0x70c9eb);left.fillEllipse(-18,1,17,5);
  const beak=add.graphics();
  beak.fillStyle(0xf4b34d);beak.fillTriangle(25,-17,39,-11,26,-2);
  beak.fillStyle(0xc77c30);beak.fillTriangle(26,-2,34,0,25,5);
  const feet=add.graphics();
  feet.lineStyle(3,0xe2b04c);
  feet.lineBetween(-7,18,-11,27);feet.lineBetween(-11,27,-16,29);
  feet.lineBetween(7,19,8,28);feet.lineBetween(8,28,14,30);
  this.left=left;this.right=right;this.beak=beak;
  this.bird=add.container(0,0,[tail,right,body,left,beak,feet]).setDepth(125);
  this.bird.setScale(.82);
  this.panel=add.graphics();
  this.label=add.text(0,0,'',{fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',
   color:'#efffed',align:'center',wordWrap:{width:254}}).setOrigin(.5);
  this.bubble=add.container(0,0,[this.panel,this.label]).setDepth(185)
   .setScrollFactor(0).setVisible(false);
  this.key=scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  window.addEventListener('pipo-help',this.listener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   window.removeEventListener('pipo-help',this.listener);
  });
 }
 private source():HintSource{
  if(this.net.level===3)return {phase:3,world:this.net.treetop};
  if(this.net.level===2)return {phase:2,world:this.net.temporal};
  return {phase:1,world:this.net.loop};
 }
 ask():void{
  if(!this.net.playing||this.net.experience!=='loop')return;
  const now=Date.now();
  if(now-this.lastAsk<2000||now<this.talkingUntil)return;
  this.lastAsk=now;this.depth=Math.min(2,this.depth+1) as 0|1|2;
  this.speak(now);
 }
 private speak(now:number):void{
  const hint=pipoHint(this.source());
  this.label.setText('PIPO  •  '+hint.lines[this.depth]);
  const width=290,height=Math.max(76,this.label.height+31);
  this.panel.clear().fillStyle(0x061d20,.95).fillRoundedRect(-width/2,-height/2,width,height,14)
   .lineStyle(2,0x9bdc91,.92).strokeRoundedRect(-width/2,-height/2,width,height,14);
  this.bubble.setVisible(true).setAlpha(1);
  this.talkingUntil=now+6100;this.fadingUntil=this.talkingUntil+500;
 }
 update(time:number,focusX:number,focusY:number,paused=false):void{
  if(!this.net.playing)return;
  const now=Date.now(),hint=pipoHint(this.source());
  if(hint.objective!==this.objective){
   this.objective=hint.objective;this.depth=0;this.lastProgress=now;
  }
  const source=this.source(),cycle=source.world.cycle;
  if(this.previousCycle<0)this.previousCycle=cycle;
  else if(cycle!==this.previousCycle){
   this.previousCycle=cycle;this.depth=0;this.lastAsk=now;this.speak(now);
  }
  if(!paused&&now-this.lastProgress>90000&&now>this.fadingUntil){
   this.depth=Math.min(2,this.depth+1) as 0|1|2;
   this.lastProgress=now;this.speak(now);
  }
  if(!paused&&this.key&&Phaser.Input.Keyboard.JustDown(this.key))this.ask();
  const poses=this.net.poses;
  let px=focusX,py=focusY;
  if(!this.net.isSolo){
   const xs=poses.map(p=>p.x),ys=poses.map(p=>p.y);
   if(Math.max(...xs)-Math.min(...xs)<550){
    px=xs.reduce((a,b)=>a+b,0)/3;
    py=Math.min(...ys);
   }
  }
  this.targetX=px+80;this.targetY=py-110;
  if(this.seed===0){this.bird.setPosition(this.targetX,this.targetY);this.seed=1;}
  const dx=this.targetX-this.bird.x,dy=this.targetY-this.bird.y;
  const near=Math.abs(dx)<8&&Math.abs(dy)<8;
  this.perched=near&&now>this.fadingUntil&&Math.sin(time*.00045)>.70;
  const eased=this.perched?.024:.045;
  this.bird.x+=dx*eased;this.bird.y+=dy*eased;
  if(!this.perched)this.bird.y+=Math.sin(time*.003)*.35;
  this.bird.setScale(this.targetX<this.bird.x?-.82:.82,.82);
  const flap=this.perched?.20:Math.sin(time*.021)*.75;
  this.left.setRotation(flap);
  this.right.setRotation(-flap*.85);
  this.beak.setRotation(now<this.talkingUntil?Math.sin(time*.028)*.19:0);
  if(now>this.fadingUntil){this.bubble.setVisible(false);return;}
  this.bubble.setVisible(true).setAlpha(now>this.talkingUntil?
   Math.max(0,(this.fadingUntil-now)/500):1);
  const view=this.scene.scale.gameSize,cam=this.scene.cameras.main;
  const screenX=(this.bird.x-cam.scrollX)*cam.zoom;
  const screenY=(this.bird.y-cam.scrollY)*cam.zoom;
  // A dialogue within the viewport always remains readable on mobile.
  const width=Math.min(view.width-12,290);
  this.bubble.setScale(Math.min(1,width/290));
  const margin=width/2+8;
  this.bubble.setPosition(
   Phaser.Math.Clamp(screenX,margin,Math.max(margin,view.width-margin)),
   Phaser.Math.Clamp(screenY-85,64,Math.max(64,view.height-115))
  );
 }
}
