import Phaser from 'phaser';
import type {Pose} from './network';
import {ADVENTURE_EXITS,exitPresence,exitPipoLine,type AdventureExitPhase} from './sharedExit';

/** Decorative natural exit. The real, authoritative exit rectangle is defined
 * in sharedExit.ts; no scenery graphic has a physics body or blocks controls. */
export class CooperativeExitArt{
 private readonly root:Phaser.GameObjects.Container;
 private readonly veil:Phaser.GameObjects.Graphics;
 private readonly sign:Phaser.GameObjects.Text;
 private readonly counter:Phaser.GameObjects.Text;
 private readonly sparks:Phaser.GameObjects.Ellipse[]=[];
 private unlocked=false;
 private lastCount=-1;
 constructor(private readonly scene:Phaser.Scene,readonly phase:AdventureExitPhase,
  private readonly onLine:(line:string)=>void){
  const gate=ADVENTURE_EXITS[phase],x=gate.x,y=gate.y+22;
  const color=phase===1?0x9be5a8:phase===2?0x8fcfc8:phase===3?0xd2dcac:0xf7c48f;
  const ink=scene.add.graphics();
  // Dark route opening with biome-specific water, bark, canopy or river-bank silhouettes.
  ink.fillStyle(phase===4?0x102d33:0x091b1a,.95);
  ink.fillEllipse(0,-72,166,165);
  ink.lineStyle(phase===4?15:18,phase===4?0x645442:phase===2?0x455448:0x52432f,.99);
  ink.beginPath();ink.moveTo(-105,0);ink.lineTo(-98,-62);
  ink.lineTo(-75,-140);ink.lineTo(-34,-170);ink.strokePath();
  ink.beginPath();ink.moveTo(105,0);ink.lineTo(98,-62);
  ink.lineTo(75,-140);ink.lineTo(34,-170);ink.strokePath();
  ink.lineStyle(5,phase===2?0x73b2a3:0x71946c,.66);
  ink.lineBetween(-94,-30,-60,-140);ink.lineBetween(94,-30,58,-140);
  ink.fillStyle(phase===3?0x406148:phase===4?0x537267:0x315542,.93);
  ink.fillEllipse(-63,-166,114,64);ink.fillEllipse(62,-166,114,64);
  ink.fillEllipse(0,-190,142,60);
  ink.fillStyle(color,.14);ink.fillEllipse(0,-40,178,80);
  ink.lineStyle(2,color,.67);ink.strokeEllipse(0,-17,212,42);
  if(phase===2){
   ink.lineStyle(2,0x93c7c5,.55);
   for(let i=0;i<6;i++)ink.lineBetween(-70+i*26,-131,-81+i*26,-97);
  }else if(phase===3){
   ink.lineStyle(8,0x78694d,.88);
   ink.lineBetween(-85,-30,85,-30);
   ink.lineBetween(-45,-52,38,-52);
  }else if(phase===4){
   ink.fillStyle(0x5bafad,.62);ink.fillEllipse(0,-7,184,17);
   ink.lineStyle(3,0xa8dde1,.66);ink.lineBetween(-90,-10,90,-10);
  }
  this.veil=scene.add.graphics();
  this.veil.fillStyle(phase===4?0x534539:0x36503d,.93);
  this.veil.fillEllipse(0,-77,141,118);
  this.veil.fillStyle(0x517652,.86);
  for(let i=0;i<5;i++)this.veil.fillEllipse(-57+i*28,-118+i%2*18,61,52);
  this.sign=scene.add.text(0,-227,gate.title,{
   fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#eef6dd',
   align:'center',stroke:'#061b17',strokeThickness:5,
   wordWrap:{width:280}}).setOrigin(.5).setVisible(false);
  this.counter=scene.add.text(0,-204,'AMIGOS REUNIDOS: 0/3',{
   fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#faf3c9',
   align:'center',stroke:'#081e1b',strokeThickness:4}).setOrigin(.5).setVisible(false);
  this.root=scene.add.container(x,y,[ink,this.veil,this.sign,this.counter]).setDepth(24);
  for(let i=0;i<7;i++){
   const dot=scene.add.ellipse(x-73+i*25,y-86-i%3*25,6+i%2*2,6+i%2*2,color,.44)
    .setDepth(25).setVisible(false);
   this.sparks.push(dot);
  }
 }
 update(unlocked:boolean,poses:readonly Pose[],health:readonly number[],now:number):void{
  const wasOpen=this.unlocked;
  this.unlocked=unlocked;
  if(this.sign.visible!==unlocked)this.sign.setVisible(unlocked);
  if(this.counter.visible!==unlocked)this.counter.setVisible(unlocked);
  const count=unlocked?exitPresence(this.phase,poses,health).count:0;
  this.counter.setText('AMIGOS REUNIDOS: '+count+'/3');
  this.sparks.forEach((dot,i)=>{
   dot.setVisible(unlocked);
   if(unlocked){dot.setAlpha(.24+.22*(1+Math.sin(now*.002+i)));
    dot.y=this.root.y-88-i%3*25+Math.sin(now*.001+i)*9;}
  });
  if(unlocked&&!wasOpen){
   this.scene.tweens.add({targets:this.veil,alpha:0,scaleX:.12,
    duration:1450,ease:'Sine.easeInOut'});
   this.onLine(this.phase===1?'Boa! As três travas foram liberadas! O caminho está aberto!':
    exitPipoLine(this.phase,0));
   this.lastCount=0;
  }else if(!unlocked&&wasOpen){
   this.scene.tweens.killTweensOf(this.veil);this.veil.setAlpha(1).setScale(1);
   this.lastCount=-1;
  }
  // Only announce real changes in player presence; no repeated network chatter.
  if(unlocked&&count!==this.lastCount){
   this.lastCount=count;
   if(count>0)this.onLine(exitPipoLine(this.phase,count));
  }
 }
 destroy():void{
  this.root.destroy(true);this.sparks.forEach(dot=>dot.destroy());
 }
}
