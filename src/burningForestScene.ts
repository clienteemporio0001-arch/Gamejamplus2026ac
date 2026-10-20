import {RatEnemyVisuals,preloadRatEnemies} from './ratEnemyVisuals';
import Phaser from 'phaser';
import {preloadKenneyCharacters} from './kenneyCharacterSprites';
import {preloadOfficialLandmarks,officialLandmark} from './officialLandmarks';
import type {Network,Seat,Pose} from './network';
import type {TouchInput} from './game';
import {SoloBodies} from './soloBodies';
import {consumeTouch,clearTouch} from './mobileControls';
import {cameraZoomFor,isCoarseDevice} from './mobileViewport';
import {gameKeys} from './keyboard';
import type {VitalAction} from './loopVitals';
import {PipoGuide} from './pipoGuide';
import {CooperativeExitArt} from './cooperativeExitArt';
import {MissionDirector} from './missionDirector';
import {BurningForestArt} from './burningForestArt';
import {ForestTrees,preloadForestTrees} from './forestTrees';
import {BurningForestAudio} from './burningForestAudio';
import {FlyingBatVisuals,preloadBats} from './flyingBatVisuals';
import {BAT_KNOCKBACK_MS,batAlive,batFlight,type BatImpact} from './flyingBats';
import {
 FIRE_WIDTH,FIRE_HEIGHT,FIRE_FLOOR_Y,FIRE_START,FIRE_PLATFORMS,FIRE_TARGETS,FIRE_SHIFT_ROOTS,
 firePlatforms,fireVisualTreePhase,fireHeavySmoke,fireDamageZone,fireFlareActive,
 fireSheltered,fireballHazards,
 type FireWorld
} from './burningForest';

/** Final act of the new adventure. Separate from classic phase 4. */
export class BurningForestScene extends Phaser.Scene {
 private ratEnemies?:RatEnemyVisuals;
 private net:Network;private touch:TouchInput;private hud?:()=>void;
 private world:FireWorld;
 private art!:BurningForestArt;private forestTrees?:ForestTrees;private pipo!:PipoGuide;private missions!:MissionDirector;
 private exitArt?:CooperativeExitArt;
 private audio!:BurningForestAudio;
 private bats?:FlyingBatVisuals;private batAlertAt=0;
 private platforms:Phaser.GameObjects.Rectangle[]=[];
 private skins:Phaser.GameObjects.Graphics[]=[];
 private shiftingRoots:Phaser.GameObjects.Rectangle[]=[];
 private rootArt:Phaser.GameObjects.Graphics[]=[];
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
 private knockUntil=[0,0,0];private knockVx=[0,0,0];
 private paused=false;private dark!:Phaser.GameObjects.Rectangle;
 private darkText!:Phaser.GameObjects.Text;
 private dangerText!:Phaser.GameObjects.Text;
 private lastTreePhase:'calm'|'warning'|'impact'='calm';
 private lastDanger='';private lastWarningAt=0;private escapeWarned=false;
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
 preload():void{
  preloadOfficialLandmarks(this);preloadKenneyCharacters(this);preloadForestTrees(this);preloadBats(this,4);preloadRatEnemies(this,4);
  if(!this.textures.exists('jam-explosion'))
    this.load.spritesheet('jam-explosion',
      import.meta.env.BASE_URL+'assets/fx/explosion-4.png',
      {frameWidth:128,frameHeight:128});
 }

 create():void{
  this.physics.world.setBounds(0,0,FIRE_WIDTH,FIRE_HEIGHT+200);
  this.physics.world.setBoundsCollision(true,true,false,false);
  this.art=new BurningForestArt(this);
  this.forestTrees=new ForestTrees(this,4);
  this.bats=new FlyingBatVisuals(this,4);
   this.ratEnemies=new RatEnemyVisuals(this,4);
  // The same silhouettes appear at real cooperation points in the fire biome.
  officialLandmark(this,'hollow','fire',FIRE_TARGETS.log.teo.x,638,
    FIRE_TARGETS.log.teo.y,.55);
  officialLandmark(this,'stone','fire',FIRE_TARGETS.smoke.lia.x,674,
    FIRE_TARGETS.smoke.lia.y,.68);
  officialLandmark(this,'arch','fire',FIRE_TARGETS.tree.nino.x,674,
    FIRE_TARGETS.tree.nino.y,.62);
  this.audio=new BurningForestAudio();
  for(const p of FIRE_PLATFORMS){
   const rect=this.add.rectangle(p.x,p.y,p.width,p.height,0xffffff,.001).setDepth(11);
   this.physics.add.existing(rect,true);
   const body=rect.body as Phaser.Physics.Arcade.StaticBody;
   body.checkCollision.down=false;body.checkCollision.left=false;
   body.checkCollision.right=false;body.checkCollision.up=true;
   this.platforms.push(rect);this.skins.push(this.art.platform(p));
  }
  // Stable ids; moving root collision is disabled while scenery changes.
  for(let i=0;i<3;i++){
   const place=FIRE_SHIFT_ROOTS[this.world.layout][i];
   const root=this.add.rectangle(place.x,place.y,58,58,0x321d1c,.001).setDepth(16);
   this.physics.add.existing(root,true);
   this.shiftingRoots.push(root);
   const ink=this.add.graphics().setDepth(17);
   ink.fillStyle(0x37251f,.95);ink.fillRoundedRect(-28,-28,56,56,7);
   ink.lineStyle(3,0xa96339,.8);ink.lineBetween(-25,-16,20,17);
   ink.lineBetween(-8,-25,12,24);ink.setPosition(place.x,place.y);
   this.rootArt.push(ink);
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
    for(const b of [...this.platforms,this.gate,...this.shiftingRoots])this.physics.add.collider(actor,b);
   }
  }
  if(this.net.isSolo){
   this.solo=new SoloBodies(this,this.net,this.avatars,[...this.platforms,this.gate,...this.shiftingRoots],410,1050);
   this.solo.select(this.net.localSeat??0);
   this.off.push(this.net.on('solo-seat',seat=>{
    this.solo?.select(seat);const active=this.solo!.active(seat);
    this.local=active.actor;this.body=active.body;this.cameras.main.startFollow(this.local,false,.085,.10,0,-24);this.pending.clear();
    this.jumps=0;this.pendingJump=false;this.dashUntil=0;this.hud?.();
   }));
  }
  // Fatal fall space below the floor is not part of the visible camera framing.
  // This prevents the entire desktop scene riding up inside a tall itch iframe.
  this.cameras.main.setBounds(0,0,FIRE_WIDTH,FIRE_FLOOR_Y+35);
  this.cameras.main.setZoom(cameraZoomFor({
   width:this.scale.gameSize.width,height:this.scale.gameSize.height
  },isCoarseDevice()));
  this.cameras.main.startFollow(this.local,false,.085,.10,0,-24);
  this.cameras.main.setDeadzone(Math.min(155,this.scale.gameSize.width*.17),Math.min(100,this.scale.gameSize.height*.18));
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
  this.pipo=new PipoGuide(this,this.net);
  this.exitArt=new CooperativeExitArt(this,4,line=>this.pipo?.warnDanger(line));
   this.missions=new MissionDirector(this,this.net,4,this.avatars);
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
   this.knockUntil[p.seat]=0;this.knockVx[p.seat]=0;
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
   this.cameras.main.setZoom(cameraZoomFor({width:size.width,height:size.height},isCoarseDevice()));
   this.cameras.main.setBounds(0,0,FIRE_WIDTH,FIRE_FLOOR_Y+35);
   this.cameras.main.setDeadzone(Math.min(155,size.width*.17),Math.min(100,size.height*.18));
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
 private applyBatKnockback(seat:Seat,hit:BatImpact):void{
  const now=Date.now();
  if(now-hit.at>900||hit.at>now+1000||!this.net.everyoneConnected||
     this.net.fire.deadUntil>0)return;
  if(!this.net.isSolo&&this.net.localSeat!==seat)return;
  const body=this.solo?.body(seat)??this.body;
  if(!body)return;
  body.setAllowGravity(true);
  body.setVelocity(hit.vx,hit.vy);
  this.knockVx[seat]=hit.vx;
  this.knockUntil[seat]=now+BAT_KNOCKBACK_MS;
  const actor=this.avatars[seat];
  if(actor){
   const flash=this.add.circle(actor.x,actor.y-8,27,0xffaf80,.55).setDepth(66);
   this.tweens.add({targets:flash,scale:1.6,alpha:0,duration:240,
    onComplete:()=>flash.destroy()});
  }
 }
 private sync(w:FireWorld):void{
  for(const seat of [0,1,2] as Seat[]){
   const hit=w.batImpacts[seat];
   if(hit&&hit.at!==(this.world.batImpacts[seat]?.at??0))
    this.applyBatKnockback(seat,hit);
  }
  const old=this.world;
  const shiftingStarts=w.blackoutUntil>0&&old.blackoutUntil!==w.blackoutUntil;
  if(shiftingStarts&&this.shiftingRoots.length){
   const next=((w.layout+1)%3) as 0|1|2;
   this.rootArt.forEach((ink,i)=>{
    const target=FIRE_SHIFT_ROOTS[next][i];
    this.tweens.add({targets:ink,x:target.x,y:target.y,
     duration:1900,ease:'Sine.easeInOut'});
   });
   this.pipo?.warnDanger('As árvores queimadas estão se mexendo! Sigam o vento!');
  }
  this.world={...w,log:[...w.log],smoke:[...w.smoke],tree:[...w.tree],
   supporting:[...w.supporting],dashAt:[...w.dashAt],dashX:[...w.dashX],
   smokeSeconds:[...w.smokeSeconds],health:[...w.health],stamina:[...w.stamina],
   safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent],
   batDownUntil:[...w.batDownUntil],
   batImpacts:w.batImpacts.map(hit=>hit?{...hit}:null) as FireWorld['batImpacts']};
  if(this.shiftingRoots.length){
   this.shiftingRoots.forEach((root,i)=>{
    const target=FIRE_SHIFT_ROOTS[w.layout][i];
    const body=root.body as Phaser.Physics.Arcade.StaticBody;
    body.enable=w.blackoutUntil===0;
    if(w.blackoutUntil===0){
     root.setPosition(target.x,target.y);body.updateFromGameObject();
     this.rootArt[i].setPosition(target.x,target.y);
    }
   });
  }
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
  // Reconcile physical ownership every frame, including rapid mobile switches.
  // Only the selected actor gets movement/jump/dash input; no teleport occurs.
  if(this.solo){
   const active=this.solo.active(this.net.localSeat);
   this.local=active.actor;this.body=active.body;
  }
  const seat=this.net.localSeat,w=this.world,now=Date.now();
  const pause=w.deadUntil>0||!this.net.everyoneConnected;
  this.bats?.update(now,w.cycleStart,w.batDownUntil,pause);
   this.ratEnemies?.update(now,w.cycleStart,w.ratDownUntil,pause);
  if(!pause&&now-this.batAlertAt>8000&&
    ([0,1] as const).some(id=>{
      if(!batAlive(w.batDownUntil,id,now))return false;
      const bat=batFlight(4,id,now,w.cycleStart);
      return Math.abs(this.local.x-bat.x)<215&&Math.abs(this.local.y-bat.y)<120;
    })){
    this.batAlertAt=now;
    this.pipo.warnDanger('Morcegos vermelhos! Lia, use a baladeira!');
  }
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
    w.damageCause==='bat'?'UM MORCEGO ATINGIU UM AMIGO':
    'O FOGO ATINGIU UM AMIGO')+'\nA EQUIPE RECOMEÇARÁ DO INÍCIO DA FASE 04':
   'AGUARDANDO A EQUIPE...');
  if(!pause){
   this.solo?.beforeFrame(w.supporting);
   if(this.solo)for(const other of [0,1,2] as Seat[])
    if(other!==seat&&now<this.knockUntil[other])
     this.solo.body(other).setVelocityX(this.knockVx[other]);
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
   const stunned=now<this.knockUntil[seat];
   this.body.setVelocityX(stunned?this.knockVx[seat]:
    seat===2&&time<this.dashUntil?this.facing*340:dir*236);
   if(!stunned&&jumping&&(grounded||seat===0&&this.jumps<2))
    this.request(grounded?'jump':'doubleJump',seat);
   if(!stunned){
    if(action)this.interact(seat);
    if(ability&&(seat===1&&time>this.shotReadyAt||
      seat===2&&time>this.dashReadyAt))
     this.request(seat===1?'shoot':'dash',seat);
   }
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
  const balls=fireballHazards(w,now);
  if(w.escapeAt>0&&!this.escapeWarned){
    this.escapeWarned=true;
    this.pipo.warnDanger('FUGA FINAL! O FOGO ESTÁ AVANÇANDO! CORRAM JUNTOS!');
  }
  const nearFireball=balls.some(b=>b.phase==='warning'&&
   Math.abs(this.local.x-b.x)<150&&Math.abs(this.local.y-b.impactY)<105);
  const protectedFromFire=fireSheltered(this.local);
  const current=nearFireball&&!protectedFromFire?'fireball':inFire?'fire':inSmoke?'smoke':'';
  if(current!==this.lastDanger&&current&&now-this.lastWarningAt>2300){
   this.lastWarningAt=now;
   this.pipo.warnDanger(current==='fireball'?'Bolas de fogo! Corram para os abrigos de pedra!':
    current==='fire'?'Rápido! Saiam das chamas!':
    'A fumaça está fechando o caminho! Usem o vento!');
  }
  this.lastDanger=current;
  const warning=treePhase!=='calm'&&!w.treeOpen?
   '⚠ ÁRVORE INSTÁVEL':inSmoke?'⚠ FUMAÇA PESADA':
   nearFireball&&!protectedFromFire?'⚠ BOLAS DE FOGO — ABRIGUEM-SE':
   protectedFromFire?'✦ ABRIGADO DO FOGO':
   inFire?'⚠ CHAMAS ATIVAS':'';
  this.dangerText.setText(warning).setVisible(Boolean(warning)&&!pause);
  this.art.update(w,poses,time,now,this.net.isSolo);
  this.forestTrees?.update();
  this.audio.update(w,now,this.local.x);
  this.missions.update(time,pause);
   this.pipo.update(time,this.local.x,this.local.y,pause);
   this.exitArt?.update(w.logOpen&&w.smokeOpen&&w.treeOpen,this.net.poses,w.health,time);
  // Favor the direction of escape without shifting the physics body.
  const camera=this.cameras.main;
  const viewW=this.scale.gameSize.width/Math.max(.6,camera.zoom);
  const lookAhead=Math.min(155,viewW*.23);
  camera.followOffset.x=Phaser.Math.Linear(camera.followOffset.x,
    -this.facing*lookAhead,.055);
  camera.followOffset.y=Phaser.Math.Linear(camera.followOffset.y,
    this.body.velocity.y>170?36:-24,.04);
  this.hud?.();void dt;
 }
 getCooldown():string{return this.net.localSeat===0?'SALTO DUPLO':
  this.net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH';}
}
