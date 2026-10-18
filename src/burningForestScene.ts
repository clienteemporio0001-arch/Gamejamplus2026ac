import Phaser from 'phaser';
import type {Network,Seat,Pose} from './network';
import type {TouchInput} from './game';
import {SoloBodies} from './soloBodies';
import {consumeTouch,clearTouch} from './mobileControls';
import {cameraZoomFor,isCoarseDevice} from './mobileViewport';
import {gameKeys} from './keyboard';
import type {VitalAction} from './loopVitals';
import {PipoGuide} from './pipoGuide';
import {BurningForestArt} from './burningForestArt';
import {BurningForestAudio} from './burningForestAudio';
import {
 FIRE_WIDTH,FIRE_HEIGHT,FIRE_START,FIRE_PLATFORMS,FIRE_TARGETS,
 firePlatforms,fireVisualTreePhase,fireHeavySmoke,fireDamageZone,fireFlareActive,
 type FireWorld
} from './burningForest';

/** Final act of the new adventure. Separate from classic phase 4. */
export class BurningForestScene extends Phaser.Scene {
 private net:Network;private touch:TouchInput;private hud?:()=>void;
 private world:FireWorld;
 private art!:BurningForestArt;private pipo!:PipoGuide;
 private audio!:BurningForestAudio;
 private platforms:Phaser.GameObjects.Rectangle[]=[];
 private skins:Phaser.GameObjects.Graphics[]=[];
 private gate!:Phaser.GameObjects.Rectangle;
 private gateArt!:Phaser.GameObjects.Graphics;
 private avatars:Phaser.GameObjects.Rectangle[]=[];
 private names:Phaser.GameObjects.Text[]=[];
 private local!:Phaser.GameObjects.Rectangle;private body!:Phaser.Physics.Arcade.Body;
 private solo?:SoloBodies;
 private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
 private keys?:Record<string,Phaser.Input.Keyboard.Key>;
 private off:Array<()=>void>=[];
 private pending=new Map<number,{seat:Seat;kind:VitalAction}>();
 private jumps=0;private facing:-1|1=1;private pendingJump=false;
 private dashUntil=0;private shotReadyAt=0;private dashReadyAt=0;
 private paused=false;private dark!:Phaser.GameObjects.Rectangle;
 private darkText!:Phaser.GameObjects.Text;
 private dangerText!:Phaser.GameObjects.Text;
 private lastTreePhase:'calm'|'warning'|'impact'='calm';
 private lastDanger='';private lastWarningAt=0;
 constructor(net:Network,touch:TouchInput,hud?:()=>void){
  super({key:'BurningForestScene'});this.net=net;this.touch=touch;this.hud=hud;
  this.world=net.fire;
 }
 private label(x:number,y:number,content:string,size=13,color='#ffdfa9'):
 Phaser.GameObjects.Text{
  return this.add.text(x,y,content,{fontFamily:'Arial',fontSize:size+'px',
   fontStyle:'bold',color,stroke:'#19161a',strokeThickness:4,align:'center'})
   .setOrigin(.5).setDepth(53);
 }
 create():void{
  this.physics.world.setBounds(0,0,FIRE_WIDTH,FIRE_HEIGHT+200);
  this.physics.world.setBoundsCollision(true,true,false,false);
  this.art=new BurningForestArt(this);
  this.audio=new BurningForestAudio();
  for(const p of FIRE_PLATFORMS){
   const rect=this.add.rectangle(p.x,p.y,p.width,p.height,0xffffff,.001).setDepth(11);
   this.physics.add.existing(rect,true);
   const body=rect.body as Phaser.Physics.Arcade.StaticBody;
   body.checkCollision.down=false;body.checkCollision.left=false;
   body.checkCollision.right=false;body.checkCollision.up=true;
   this.platforms.push(rect);this.skins.push(this.art.platform(p));
  }
  // Collidable smoke gate, opened only after all three vents are unlatched.
  this.gate=this.add.rectangle(3134,607,36,135,0x211e1c,.001).setDepth(28);
  this.physics.add.existing(this.gate,true);
  this.gateArt=this.add.graphics().setDepth(26);
  this.gateArt.fillStyle(0x211f1d,.98);
  this.gateArt.fillRoundedRect(3115,531,37,148,9);
  this.gateArt.lineStyle(4,0x805843,.8);
  this.gateArt.lineBetween(3122,546,3140,666);
  for(const key of [FIRE_TARGETS.log,FIRE_TARGETS.smoke,FIRE_TARGETS.tree]){
   this.art.target(key.teo.x,key.teo.y,0);
   this.art.target(key.lia.x,key.lia.y,1);
   this.art.target(key.nino.x,key.nino.y,2);
  }
  // The fire corridor has patterned warning posts; no invisible damaging tiles.
  for(const x of [4215,4520,4580,4770,4810,4920]){
   const g=this.add.graphics().setDepth(17);
   g.fillStyle(0x392823,.9);g.fillRoundedRect(x-4,616,8,55,2);
   g.fillStyle(0xee9d5a,.57);g.fillTriangle(x-15,615,x+15,615,x,597);
  }
  for(const seat of [0,1,2] as Seat[]){
   const p=this.net.poses[seat]??FIRE_START[seat];
   const actor=this.add.rectangle(p.x,p.y,30,44,0xffffff,.001).setDepth(40);
   this.avatars.push(actor);
   this.names.push(this.label(p.x,p.y-56,['Téo','Lia','Nino'][seat],14,
    ['#a9f5a8','#f5bc85','#94d7ff'][seat]));
   this.art.character(actor,seat);
   if(seat===this.net.localSeat){
    this.local=actor;this.physics.add.existing(actor);
    this.body=actor.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(850).setMaxVelocity(410,1050).setCollideWorldBounds(true);
    for(const b of [...this.platforms,this.gate])this.physics.add.collider(actor,b);
   }
  }
  if(this.net.isSolo){
   this.solo=new SoloBodies(this,this.net,this.avatars,[...this.platforms,this.gate],410,1050);
   this.solo.select(this.net.localSeat??0);
   this.off.push(this.net.on('solo-seat',seat=>{
    this.solo?.select(seat);this.local=this.avatars[seat];
    this.body=this.solo!.body(seat);this.pending.clear();
    this.jumps=0;this.pendingJump=false;this.dashUntil=0;this.hud?.();
   }));
  }
  this.cameras.main.setBounds(0,0,FIRE_WIDTH,FIRE_HEIGHT);
  this.cameras.main.setZoom(Math.max(.84,Math.min(1.3,
   cameraZoomFor({width:this.scale.gameSize.width,height:this.scale.gameSize.height},
    isCoarseDevice())*1.07)));
  this.cameras.main.startFollow(this.local,false,.09,.09,0,-60);
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
  this.pipo=new PipoGuide(this,this.net);
  this.dark=this.add.rectangle(this.scale.gameSize.width/2,this.scale.gameSize.height/2,
   this.scale.gameSize.width+150,this.scale.gameSize.height+150,0x190b0e,1)
   .setScrollFactor(0).setDepth(190).setAlpha(0);
  this.darkText=this.label(this.scale.gameSize.width/2,
   this.scale.gameSize.height/2,'',23,'#ffe2b2')
   .setScrollFactor(0).setDepth(191).setVisible(false);
  this.dangerText=this.label(this.scale.gameSize.width/2,112,'',15,'#ffe3ad')
   .setScrollFactor(0).setDepth(189).setVisible(false);
  this.sync(this.net.fire);
  this.off.push(this.net.on('fire',w=>this.sync(w)));
  this.off.push(this.net.on('snapshot',poses=>{
   if(this.net.isSolo)return;
   for(const p of poses)if(p.seat!==this.net.localSeat){
    this.avatars[p.seat].x=Phaser.Math.Linear(this.avatars[p.seat].x,p.x,.38);
    this.avatars[p.seat].y=Phaser.Math.Linear(this.avatars[p.seat].y,p.y,.38);
   }
  }));
  this.off.push(this.net.on('respawn',p=>{
   this.solo?.reset(p);
   if(this.net.localSeat===p.seat){
    this.body.reset(p.x,p.y);
    this.body.setAllowGravity(true);this.body.setVelocity(0,0);
    this.pending.clear();this.pendingJump=false;this.jumps=0;this.dashUntil=0;
   }else if(!this.net.isSolo)this.avatars[p.seat].setPosition(p.x,p.y);
  }));
  this.off.push(this.net.on('vital-reply',reply=>{
   const item=this.pending.get(reply.id);
   if(!item||item.kind!==reply.kind)return;
   this.pending.delete(reply.id);
   if(!reply.ok||item.seat!==this.net.localSeat||!this.net.playing||this.paused)return;
   if(reply.kind==='jump'||reply.kind==='doubleJump'){
    this.body.setVelocityY(-465);
    this.jumps=reply.kind==='doubleJump'?2:1;
   }else if(reply.kind==='dash'){
    this.dashUntil=this.time.now+740;
    this.dashReadyAt=this.time.now+1950;
   }else if(reply.kind==='shoot'){
    this.shotReadyAt=this.time.now+530;
    const projectile=this.add.circle(this.local.x+12,this.local.y-18,6,0xffd2a1)
     .setDepth(65);
    this.tweens.add({targets:projectile,x:projectile.x+this.facing*340,
     alpha:0,duration:440,onComplete:()=>projectile.destroy()});
   }
  }));
  const onResize=(size:Phaser.Structs.Size)=>{
   this.cameras.main.setZoom(Math.max(.84,Math.min(1.3,
    cameraZoomFor({width:size.width,height:size.height},isCoarseDevice())*1.07)));
   this.cameras.main.setBounds(0,0,FIRE_WIDTH,FIRE_HEIGHT);
   this.dark.setPosition(size.width/2,size.height/2).setSize(size.width+150,size.height+150);
   this.darkText.setPosition(size.width/2,size.height/2);
   this.dangerText.setPosition(size.width/2,Math.min(116,size.height*.22));
  };
  this.scale.on(Phaser.Scale.Events.RESIZE,onResize);onResize(this.scale.gameSize);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   this.audio.destroy();
   this.off.forEach(off=>off());this.scale.off(Phaser.Scale.Events.RESIZE,onResize);
  });
 }
 private sync(w:FireWorld):void{
  const old=this.world;
  this.world={...w,log:[...w.log],smoke:[...w.smoke],tree:[...w.tree],
   supporting:[...w.supporting],dashAt:[...w.dashAt],dashX:[...w.dashX],
   smokeSeconds:[...w.smokeSeconds],health:[...w.health],stamina:[...w.stamina],
   safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent]};
  const active=new Set(firePlatforms(w));
  FIRE_PLATFORMS.forEach((p,i)=>{
   const visible=active.has(p);
   const body=this.platforms[i].body as Phaser.Physics.Arcade.StaticBody;
   body.enable=visible;this.platforms[i].setVisible(visible);
   this.skins[i].setVisible(visible);
   if(visible)body.updateFromGameObject();
  });
  const gateBody=this.gate.body as Phaser.Physics.Arcade.StaticBody;
  gateBody.enable=!w.smokeOpen;this.gate.setVisible(!w.smokeOpen);
  this.gateArt.setVisible(!w.smokeOpen);
  if(!w.smokeOpen)gateBody.updateFromGameObject();
  if(old&&this.pipo){
   if(!old.logOpen&&w.logOpen)
    this.pipo.warnDanger('O tronco virou ponte! Sigam juntos!');
   else if(!old.smokeOpen&&w.smokeOpen)
    this.pipo.warnDanger('Boa! O vento abriu o corredor! Continuem!');
   else if(!old.treeOpen&&w.treeOpen)
    this.pipo.warnDanger('A árvore caiu na direção certa! Corram!');
  }
 }
 private request(kind:VitalAction,seat:Seat):void{
  const id=this.net.requestVital(kind,this.facing);
  if(id!==null)this.pending.set(id,{seat,kind});
 }
 private interact(seat:Seat):void{
  if(seat===0)this.net.act({kind:'lever'});
  if(seat===2)this.net.act({kind:'switch'});
 }
 update(time:number,dt:number):void{
  if(!this.body||!this.net.playing||this.net.localSeat===null)return;
  const seat=this.net.localSeat,w=this.world,now=Date.now();
  const pause=w.deadUntil>0||!this.net.everyoneConnected;
  if(pause!==this.paused){
   this.paused=pause;
   if(pause){this.physics.pause();this.pending.clear();gameKeys.clear();clearTouch(this.touch);}
   else this.physics.resume();
  }
  this.dark.setAlpha(pause?.91:0);
  this.darkText.setVisible(pause).setText(w.deadUntil>0?
   (w.damageCause==='tree'?'A ÁRVORE DESABOU SOBRE A EQUIPE':
    w.damageCause==='smoke'?'A FUMAÇA VENCEU A RESISTÊNCIA':
    w.damageCause==='fall'?'UM AMIGO CAIU NO ABISMO':
    'O FOGO ATINGIU UM AMIGO')+'\nNINGUÉM FICA PARA TRÁS':
   'AGUARDANDO A EQUIPE...');
  if(!pause){
   this.solo?.beforeFrame(w.supporting);
   let dir=0;
   if(this.cursors?.left.isDown||this.keys?.A?.isDown)dir--;
   if(this.cursors?.right.isDown||this.keys?.D?.isDown)dir++;
   if(!dir)dir=Math.max(-1,Math.min(1,this.touch.moveX??
    (this.touch.right?1:this.touch.left?-1:0)));
   if(dir)this.facing=dir>0?1:-1;
   const grounded=this.body.blocked.down||this.body.touching.down;
   if(grounded)this.jumps=0;
   const jumping=gameKeys.consumeJump()||consumeTouch(this.touch,'jump');
   const action=Boolean(this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E)||
    consumeTouch(this.touch,'interact'));
   const ability=gameKeys.consumeSkill(seat)||consumeTouch(this.touch,'ability');
   this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
   this.body.setVelocityX(seat===2&&time<this.dashUntil?
    this.facing*340:dir*236);
   if(jumping&&(grounded||seat===0&&this.jumps<2))
    this.request(grounded?'jump':'doubleJump',seat);
   if(action)this.interact(seat);
   if(ability&&(seat===1&&time>this.shotReadyAt||
    seat===2&&time>this.dashReadyAt))
    this.request(seat===1?'shoot':'dash',seat);
   this.net.report(this.local.x,this.local.y,
    this.body.velocity.x,this.body.velocity.y);
   this.solo?.report();
  }
  const poses:Pose[]=this.net.poses.map((p,i)=>this.net.isSolo?
   {seat:p.seat,x:this.avatars[i].x,y:this.avatars[i].y,
    vx:this.solo?.body(p.seat).velocity.x??p.vx,
    vy:this.solo?.body(p.seat).velocity.y??p.vy}:p);
  for(const seatNo of [0,1,2] as Seat[]){
   const actor=this.avatars[seatNo];
   if(seatNo!==seat&&!this.net.isSolo){
    const p=poses[seatNo];actor.x=Phaser.Math.Linear(actor.x,p.x,.18);
    actor.y=Phaser.Math.Linear(actor.y,p.y,.18);
   }
   this.names[seatNo].setPosition(actor.x,actor.y-56)
    .setColor(seatNo===seat?'#fff4d3':['#a9f5a8','#f5bc85','#94d7ff'][seatNo]);
  }
  const treePhase=fireVisualTreePhase(w);
  if(treePhase!==this.lastTreePhase){
   this.lastTreePhase=treePhase;
   if(treePhase==='warning')this.pipo.warnDanger('Corram! Essa árvore vai cair!');
   if(treePhase==='impact')this.pipo.warnDanger('Afastem-se! A árvore está desabando!');
  }
  const inSmoke=fireHeavySmoke(w,this.local,now);
  const inFire=fireDamageZone(w,this.local,now);
  const current=inFire?'fire':inSmoke?'smoke':'';
  if(current!==this.lastDanger&&current&&now-this.lastWarningAt>2300){
   this.lastWarningAt=now;
   this.pipo.warnDanger(current==='fire'?'Rápido! Saiam das chamas!':
    'A fumaça está fechando o caminho! Usem o vento!');
  }
  this.lastDanger=current;
  const warning=treePhase!=='calm'&&!w.treeOpen?
   '⚠ ÁRVORE INSTÁVEL':inSmoke?'⚠ FUMAÇA PESADA':
   inFire?'⚠ CHAMAS ATIVAS':'';
  this.dangerText.setText(warning).setVisible(Boolean(warning)&&!pause);
  this.art.update(w,poses,time,now);
  this.audio.update(w,now);
  this.pipo.update(time,this.local.x,this.local.y,pause);
  this.cameras.main.followOffset.x=Phaser.Math.Linear(
   this.cameras.main.followOffset.x,this.facing*42,.035);
  this.cameras.main.followOffset.y=Phaser.Math.Linear(
   this.cameras.main.followOffset.y,this.body.velocity.y>100?63:-65,.035);
  this.hud?.();void dt;
 }
 getCooldown():string{return this.net.localSeat===0?'SALTO DUPLO':
  this.net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH';}
}
