import Phaser from 'phaser';
import type {Network,Seat} from './network';
import {missionSnapshot,newlyCompleted,type MissionBeat,type MissionPhase,type MissionSnapshot} from './missionChapters';

/** Local presentation only. Reads authenticated host snapshots, never approves puzzles. */
export class MissionDirector {
 private current:MissionSnapshot|null=null;
 private ring:Phaser.GameObjects.Graphics;
 private balloon:Phaser.GameObjects.Text;
 private portrait:Phaser.GameObjects.Graphics;
 private actionPrompt:Phaser.GameObjects.Text;
 private off:()=>void;
 private lastId='';
 private lastAt=0;
 private enabled=true;
 private queued:MissionBeat[]=[];
 private active=false;
 private cancels:Phaser.Time.TimerEvent[]=[];
 constructor(private scene:Phaser.Scene,private net:Network,
  private phase:MissionPhase,private avatars:readonly Phaser.GameObjects.Rectangle[]){
  this.ring=scene.add.graphics().setDepth(62);
  this.portrait=scene.add.graphics().setDepth(63);
  this.balloon=scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',
   fontStyle:'bold',color:'#fff8df',backgroundColor:'#11322be9',
   padding:{left:10,right:10,top:7,bottom:7},align:'center',
   wordWrap:{width:215},stroke:'#081a16',strokeThickness:2})
   .setOrigin(.5,1).setDepth(65).setVisible(false);
  const label=({1:'loop',2:'temporal',3:'treetop',4:'fire'} as const)[phase];
  const update=(w:unknown)=>this.accept(w);
  this.actionPrompt=scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'14px',
   fontStyle:'bold',color:'#ffffff',backgroundColor:'#0c3028ee',
   padding:{left:11,right:11,top:7,bottom:7},stroke:'#03231c',strokeThickness:2})
   .setOrigin(.5,1).setDepth(77).setVisible(false);
  this.off=net.on(label,update as never);
  this.accept(({1:net.loop,2:net.temporal,3:net.treetop,4:net.fire} as const)[phase]);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   this.enabled=false;this.off();this.cancels.forEach(t=>t.remove(false));
   this.queued=[];this.balloon.destroy();this.ring.destroy();this.portrait.destroy();this.actionPrompt.destroy();
  });
 }
 private accept(w:unknown):void{
  if(!this.enabled||!this.net.playing||this.net.level!==this.phase)return;
  const next=this.snapshot(w);if(!next)return;
  const just=newlyCompleted(this.current,next);
  this.current=next;
  // Remote reconnection / late scene creation hydrates silently.
  if(just.length){
   this.queued.push(...just);
   if(!this.active)this.next();
  }
 }
 private snapshot(w:unknown):MissionSnapshot|null{
  try{
   if(this.phase===1)return missionSnapshot(1,w as Network['loop']);
   if(this.phase===2)return missionSnapshot(2,w as Network['temporal']);
   if(this.phase===3)return missionSnapshot(3,w as Network['treetop']);
   return missionSnapshot(4,w as Network['fire']);
  }catch{return null;}
 }
 private next():void{
  if(!this.enabled||!this.queued.length){this.active=false;return;}
  const beat=this.queued.shift()!;
  this.active=true;
  const actor=this.avatars[beat.seat];
  if(!actor){this.active=false;this.next();return;}
  this.lastId=beat.id;this.lastAt=this.scene.time.now;
  this.balloon.setText(['TÉO','LIA','NINO'][beat.seat]+' · '+beat.hero)
   .setVisible(true).setAlpha(1);
  const tint=[0x85e9a7,0xf8bf7d,0x99d7fa][beat.seat];
  this.portrait.clear().lineStyle(3,tint,.9).strokeCircle(beat.target.x,beat.target.y,13);
  const waves=Array.from({length:4},(_,i)=>{
   const a=this.scene.add.circle(beat.target.x,beat.target.y,8+i*3,tint,.42-i*.075)
    .setDepth(58).setStrokeStyle(1,0xfff0bd,.6);
   this.scene.tweens.add({targets:a,scale:2.7,alpha:0,duration:780+i*100,
    delay:i*90,onComplete:()=>a.destroy()});
   return a;
  });
  void waves;
  window.dispatchEvent(new CustomEvent('mission-audio',{detail:{kind:'puzzle'}}));
  const timer=this.scene.time.delayedCall(1350,()=>{
   if(!this.enabled)return;
   this.balloon.setVisible(false);
   // Narration after the hero, never before the authority confirmed success.
   window.dispatchEvent(new CustomEvent('mission-pipo',{
    detail:{line:beat.pipo,priority:2,phase:this.phase}
   }));
   const wait=this.scene.time.delayedCall(2050,()=>this.next());
   this.cancels.push(wait);
  });
  this.cancels.push(timer);
 }
 update(time:number,paused=false):void{
  if(!this.enabled)return;
  const snapshot=this.current;
  this.ring.clear();this.portrait.setVisible(time-this.lastAt<1500);
  this.actionPrompt.setVisible(false);
  // Somente pontos de objetivos realmente desbloqueados. Na Fase 1, não
  // destacar a plataforma antes de descobrir a rota correta.
  const firstReady=this.phase!==1||
   (this.net.loop.observed&&(!this.net.loop.marks.every(Boolean)||
    this.net.loop.lastRoute==='right'));
  if(!paused&&firstReady&&snapshot?.next&&time-this.lastAt>600){
   const next=snapshot.next;
   const pending=snapshot.beats.filter(b=>!b.done&&b.group===next.group);
   const localSeat=this.net.localSeat;
   const pose=localSeat===null?null:this.net.poses[localSeat];
   const shades=[0x90e7a9,0xf4c17f,0x8ccdf6] as const;
   // Marcação de chão, anéis pulsantes e silhueta de posicionamento:
   // TODOS os mecanismos pendentes do puzzle atual, sem alterar colisores.
   for(const beat of pending){
    const tint=shades[beat.seat];
    const wave=.50+.23*Math.sin(time*.005+beat.seat);
    const radius=20+3*Math.sin(time*.004);
    this.ring.lineStyle(3,tint,wave);
    this.ring.strokeCircle(beat.target.x,beat.target.y,radius);
    this.ring.lineStyle(1.5,0xfff5b2,.55).strokeEllipse(beat.target.x,beat.target.y+23,44,13);
    this.ring.lineStyle(1.5,tint,.44).lineBetween(beat.target.x,beat.target.y+17,
     beat.target.x,beat.target.y+36);
    this.ring.fillStyle(tint,.12).fillCircle(beat.target.x,beat.target.y,radius-6);
    // O círculo pequeno e o losango são a posição fantasma para cada herói.
    this.ring.fillStyle(tint,.76).fillCircle(beat.target.x,beat.target.y-32,6);
    this.ring.lineStyle(2,tint,.62).strokeRoundedRect(beat.target.x-9,beat.target.y-25,18,16,6);
   }
   if(pose){
    const own=pending.find(b=>b.seat===localSeat);
    if(own&&Math.abs(own.target.x-pose.x)<195&&Math.abs(own.target.y-pose.y)<155){
     const command=own.action==='E'?'PRESSIONE E PARA INTERAGIR':
       own.action==='J'?'PRESSIONE J PARA ATIRAR':
       own.action.includes('SHIFT')?'USE SHIFT E E NA MARCA':'USE '+own.action;
     this.actionPrompt.setText('✦ '+command)
      .setPosition(pose.x,pose.y-58)
      .setVisible(true);
     this.ring.lineStyle(4,0xffefb8,.86)
      .strokeCircle(own.target.x,own.target.y,25+3*Math.sin(time*.012));
    }else{
     const direction=next.target.x-pose.x;
     if(Math.abs(direction)>260&&localSeat===next.seat){
      this.actionPrompt.setText((direction>0?'▶':'◀')+
       ' SIGA O BRILHO · '+['TÉO','LIA','NINO'][next.seat])
       .setPosition(pose.x,pose.y-65).setVisible(true);
     }
    }
   }
  }
  if(this.balloon.visible&&this.active){
   // Attach the balloon to the completing character even if players switch.
   const seat=this.current?.beats.find(b=>b.id===this.lastId)?.seat??0;
   const actor=this.avatars[seat];
   this.balloon.setPosition(actor.x,actor.y-62);
  }
  this.balloon.setVisible(this.active&&!paused&&time-this.lastAt<1350);
 }
 get currentObjective():string{return this.current?.objective??'';}
}
