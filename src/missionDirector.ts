import Phaser from 'phaser';
import type {Network,Seat} from './network';
import {missionSnapshot,newlyCompleted,type MissionBeat,type MissionPhase,type MissionSnapshot} from './missionChapters';

/** Local presentation only. Reads authenticated host snapshots, never approves puzzles. */
export class MissionDirector {
 private current:MissionSnapshot|null=null;
 private ring:Phaser.GameObjects.Graphics;
 private balloon:Phaser.GameObjects.Text;
 private portrait:Phaser.GameObjects.Graphics;
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
  this.off=net.on(label,update as never);
  this.accept(({1:net.loop,2:net.temporal,3:net.treetop,4:net.fire} as const)[phase]);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   this.enabled=false;this.off();this.cancels.forEach(t=>t.remove(false));
   this.queued=[];this.balloon.destroy();this.ring.destroy();this.portrait.destroy();
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
  if(!paused&&snapshot?.next&&time-this.lastAt>600){
   const beat=snapshot.next,glow=.30+.24*Math.sin(time*.004);
   this.ring.lineStyle(2.5,[0x90e7a9,0xf4c17f,0x8ccdf6][beat.seat],glow);
   this.ring.strokeCircle(beat.target.x,beat.target.y,15+Math.sin(time*.003)*2);
   this.ring.fillStyle(0xf4f4b1,.08);
   this.ring.fillCircle(beat.target.x,beat.target.y,10);
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
