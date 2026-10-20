import {RatEnemyVisuals,preloadRatEnemies} from './ratEnemyVisuals';
import Phaser from 'phaser';
import {preloadKenneyCharacters} from './kenneyCharacterSprites';
import {preloadOfficialLandmarks,officialLandmark} from './officialLandmarks';
import {PipoGuide} from './pipoGuide';
import {CooperativeExitArt} from './cooperativeExitArt';
import {MissionDirector} from './missionDirector';
import {animateForestProps} from './forestTransformFX';
import {TreetopArt} from './treetopArt';
import {ForestTrees,preloadForestTrees} from './forestTrees';
import {FRAGILE_BRANCH_INDICES,fragilePhase} from './jamChallenges';
import {TreetopWindAudio} from './treetopWindAudio';
import {FlyingBatVisuals,preloadBats} from './flyingBatVisuals';
import {BAT_KNOCKBACK_MS,batAlive,batFlight,type BatImpact} from './flyingBats';
import {CHARACTERS,type Network,type Seat} from './network';
import type {TouchInput} from './game';
import {SoloBodies} from './soloBodies';
import {consumeTouch,clearTouch} from './mobileControls';
import {isCoarseDevice} from './mobileViewport';
import {gameKeys} from './keyboard';
import type {VitalAction} from './loopVitals';
import {TREE_WIDTH,TREE_HEIGHT,TREE_START,TREE_PLATFORMS,TREE_SHELTERS,TREE_TARGETS,
 TREE_GRAVITY,TREE_JUMP,TREE_SPEED,treePlatforms,treeWindVelocity,treeExposure,treeCameraZoom,
 treeTowerNearBase,treeTowerNearTop,
 type TreeWindPhase,type TreeWorld} from './treetopForest';

/** Fase 3 da aventura principal. Nenhum chão é criado abaixo dos galhos. */
export class TreetopForestScene extends Phaser.Scene {
 private ratEnemies?:RatEnemyVisuals;
 private net:Network;private touch:TouchInput;private hud?:()=>void;
 private w:TreeWorld;
 private markers:Array<{ring:Phaser.GameObjects.Arc;label?:Phaser.GameObjects.Text;stage:'bridge'|'tower'|'time';seat:Seat}>=[];
 private platforms:Phaser.GameObjects.Rectangle[]=[];
 private skins:Phaser.GameObjects.Graphics[]=[];
 private art!:TreetopArt;
 private forestTrees?:ForestTrees;
 private windAudio!:TreetopWindAudio;
 private bats?:FlyingBatVisuals;private batAlertAt=0;
 private avatars:Phaser.GameObjects.Rectangle[]=[];
 private names:Phaser.GameObjects.Text[]=[];
 private local!:Phaser.GameObjects.Rectangle;private body!:Phaser.Physics.Arcade.Body;
 private solo?:SoloBodies;
 private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
 private keys?:Record<string,Phaser.Input.Keyboard.Key>;
 private off:Array<()=>void>=[];
 private pending=new Map<number,{seat:Seat;kind:VitalAction}>();
 private jumps=0;private facing:-1|1=1;private lastShot=0;private lastDash=0;
 private dashUntil=0;private pendingJump=false;private paused=false;
 private knockUntil=[0,0,0];private knockVx=[0,0,0];
 private dark!:Phaser.GameObjects.Rectangle;private darkText!:Phaser.GameObjects.Text;
 private hint!:Phaser.GameObjects.Text;private guide!:Phaser.GameObjects.Text;
 private pipo!:PipoGuide;private missions!:MissionDirector;
 private exitArt?:CooperativeExitArt;
 private lastWindPhase:TreeWindPhase='calm';
 private windStatus!:Phaser.GameObjects.Text;
 private windDirectionShown:-1|1=1;
 constructor(net:Network,touch:TouchInput,hud?:()=>void){
  super({key:'TreetopForestScene'});this.net=net;this.touch=touch;this.hud=hud;
  this.w={...net.treetop};
 }
 private caption(x:number,y:number,value:string,size=15,color='#b7f0d1'):Phaser.GameObjects.Text{
  return this.add.text(x,y,value,{fontFamily:'Arial',fontSize:size+'px',fontStyle:'bold',
   color,stroke:'#071c1b',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(55);
 }
 preload():void{preloadOfficialLandmarks(this);preloadKenneyCharacters(this);preloadForestTrees(this);preloadBats(this,3);preloadRatEnemies(this,3);}

 private makeEnvironment():void{
  this.art=new TreetopArt(this,TREE_WIDTH,TREE_HEIGHT);
  this.forestTrees=new ForestTrees(this,3);
  for(const zone of TREE_SHELTERS)this.art.shelter(zone);
  // Familiar landmark family beside host-approved challenge targets.
  // Visual only; authority, collisions and puzzle positions are unchanged.
  officialLandmark(this,'hollow','canopy',TREE_TARGETS.bridge.teo.x,463,
    TREE_TARGETS.bridge.teo.y,.54);
  officialLandmark(this,'stone','canopy',TREE_TARGETS.time.lia.x,283,
    TREE_TARGETS.time.lia.y,.67);
  officialLandmark(this,'arch','canopy',TREE_TARGETS.time.nino.x,239,
    TREE_TARGETS.time.nino.y,.57);
  for(const [target,stage,owner] of [
   [TREE_TARGETS.bridge.teo,'bridge',0],[TREE_TARGETS.bridge.lia,'bridge',1],
   [TREE_TARGETS.bridge.nino,'bridge',2],
   [TREE_TARGETS.tower.top,'tower',0],[TREE_TARGETS.time.lia,'time',1],
   [TREE_TARGETS.time.teo,'time',0],[TREE_TARGETS.time.nino,'time',2]
  ] as const){
   const ring=this.add.circle(target.x,target.y-12,11,0xf2d899,.2)
    .setStrokeStyle(2,0xe1d59e,.82).setDepth(24);
   const names=stage==='tower'?'TÉO: E • CIPÓ':
    stage==='bridge'&&owner===2?'NINO: APERTE E':
    owner===1?'LIA: J • ACERTE O ALVO':owner===0?'TÉO: APERTE E':'NINO: APERTE E';
   const label=stage==='tower'||stage==='time'||stage==='bridge'&&owner===2?
    this.caption(target.x,target.y-49,names,12,'#f7e5aa').setDepth(57):undefined;
   label?.setVisible(false);
   this.markers.push({ring,label,stage,seat:owner});
   this.tweens.add({targets:ring,alpha:.32,scale:1.16,duration:1450,yoyo:true,repeat:-1});
  }
 }
 create():void{
  this.physics.world.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT+250);
  this.physics.world.setBoundsCollision(true,true,false,false);
  this.makeEnvironment();
  this.bats=new FlyingBatVisuals(this,3);
   this.ratEnemies=new RatEnemyVisuals(this,3);
  this.windAudio=new TreetopWindAudio();
  for(const p of TREE_PLATFORMS){
   const platform=this.add.rectangle(p.x,p.y,p.width,p.height,0xffffff,0.001).setDepth(15);
   this.skins.push(this.art.branch(p));
   this.physics.add.existing(platform,true);
   const staticBody=platform.body as Phaser.Physics.Arcade.StaticBody;
   staticBody.checkCollision.down=false;staticBody.checkCollision.left=false;
   staticBody.checkCollision.right=false;staticBody.checkCollision.up=true;
   this.platforms.push(platform);
  }
  for(const seat of [0,1,2] as Seat[]){
   const p=this.net.poses[seat]??TREE_START[seat];
   const actor=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color)
    .setDepth(30).setStrokeStyle(3,seat===0?0x17342f:0x21423d);
   this.avatars.push(actor);this.art.character(actor,seat);
   this.names.push(this.caption(p.x,p.y-48,CHARACTERS[seat].name,12,CHARACTERS[seat].hex));
   if(this.net.localSeat===seat){
    this.local=actor;this.physics.add.existing(actor);
    this.body=actor.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(TREE_GRAVITY).setMaxVelocity(410,1000).setCollideWorldBounds(true);
    for(const b of this.platforms)this.physics.add.collider(actor,b);
   }
  }
  if(this.net.isSolo){
   this.solo=new SoloBodies(this,this.net,this.avatars,this.platforms,410,1000);
   this.solo.select(this.net.localSeat??0);
   this.off.push(this.net.on('solo-seat',seat=>{
    this.solo?.select(seat);const active=this.solo!.active(seat);this.local=active.actor;this.body=active.body;
    this.cameras.main.startFollow(this.local,false,.085,.10,0,-35);
    this.pending.clear();this.jumps=0;this.pendingJump=false;this.dashUntil=0;this.hud?.();
   }));
  }
  this.cameras.main.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT);
  this.cameras.main.setZoom(treeCameraZoom({width:this.scale.gameSize.width,
    height:this.scale.gameSize.height},isCoarseDevice()));
  this.cameras.main.startFollow(this.local,false,.085,.10,0,-35);
  this.cameras.main.setDeadzone(Math.min(160,this.scale.gameSize.width*.18),Math.min(105,this.scale.gameSize.height*.18));
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
  this.pipo=new PipoGuide(this,this.net);
  this.exitArt=new CooperativeExitArt(this,3,line=>this.pipo?.warnDanger(line));
   this.missions=new MissionDirector(this,this.net,3,this.avatars);
  this.hint=this.caption(0,0,'',13,'#f0dfb1');
  this.guide=this.caption(this.scale.gameSize.width/2,92,'',14,'#c3f6da')
   .setScrollFactor(0).setDepth(150);
  this.windStatus=this.caption(this.scale.gameSize.width/2,130,'',15,'#e3f0b8')
   .setScrollFactor(0).setDepth(152).setVisible(false);
  this.dark=this.add.rectangle(this.scale.gameSize.width/2,this.scale.gameSize.height/2,
   this.scale.gameSize.width+150,this.scale.gameSize.height+150,0x041119)
   .setScrollFactor(0).setDepth(190).setAlpha(0);
  this.darkText=this.caption(this.scale.gameSize.width/2,this.scale.gameSize.height/2,
   '',22,'#e5f5e7').setScrollFactor(0).setDepth(191).setVisible(false);
  this.sync(this.net.treetop);
  this.off.push(this.net.on('treetop',w=>this.sync(w)));
  this.off.push(this.net.on('snapshot',poses=>{
   for(const p of poses)if(p.seat!==this.net.localSeat&&!this.net.isSolo){
    this.avatars[p.seat].x=Phaser.Math.Linear(this.avatars[p.seat].x,p.x,.35);
    this.avatars[p.seat].y=Phaser.Math.Linear(this.avatars[p.seat].y,p.y,.35);
   }
  }));
  this.off.push(this.net.on('respawn',p=>{
   this.knockUntil[p.seat]=0;this.knockVx[p.seat]=0;
   this.solo?.reset(p);
   if(this.net.localSeat===p.seat){
    this.body.reset(p.x,p.y);this.body.setAllowGravity(true);
    this.pending.clear();this.pendingJump=false;this.jumps=0;this.dashUntil=0;
   }else if(!this.net.isSolo)this.avatars[p.seat].setPosition(p.x,p.y);
  }));
  this.off.push(this.net.on('vital-reply',reply=>{
   const awaiting=this.pending.get(reply.id);
   if(!awaiting||awaiting.kind!==reply.kind)return;
   this.pending.delete(reply.id);
   if(!reply.ok||awaiting.seat!==this.net.localSeat||!this.net.playing||this.paused)return;
   if(reply.kind==='jump'||reply.kind==='doubleJump'){
    if(reply.kind==='jump'&&this.net.treetop.supporting[awaiting.seat]!==null){
     this.pendingJump=true;this.net.act({kind:'detach'});
    }else{
     const headwind=this.w.windPhase==='gust'&&treeExposure(this.local)>.35
       &&this.facing!==this.w.windDirection;
     this.body.setVelocityY(headwind?-425:-TREE_JUMP);
     this.jumps=reply.kind==='doubleJump'?2:1;
    }
   }else if(reply.kind==='dash'){
    this.dashUntil=this.time.now+650;this.lastDash=this.time.now+1900;
   }else if(reply.kind==='shoot'){
    this.lastShot=this.time.now+510;
    const stone=this.add.circle(this.local.x,this.local.y-18,5,0xffd497,.95).setDepth(60);
    this.tweens.add({targets:stone,x:stone.x+this.facing*360,alpha:0,duration:420,
      onComplete:()=>stone.destroy()});
   }
  }));
  const resize=(size:Phaser.Structs.Size)=>{
   this.cameras.main.setZoom(treeCameraZoom({width:size.width,height:size.height},isCoarseDevice()));
   this.cameras.main.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT);
   this.cameras.main.setDeadzone(Math.min(155,size.width*.17),Math.min(100,size.height*.18));
   this.guide.setPosition(size.width/2,Math.min(92,size.height*.18));
   this.windStatus.setPosition(size.width/2,Math.min(124,size.height*.31));
   this.dark.setPosition(size.width/2,size.height/2).setSize(size.width+150,size.height+150);
   this.darkText.setPosition(size.width/2,size.height/2);
  };
  this.scale.on(Phaser.Scale.Events.RESIZE,resize);resize(this.scale.gameSize);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   this.windAudio.destroy();
   this.off.forEach(off=>off());this.scale.off(Phaser.Scale.Events.RESIZE,resize);
  });
 }
 private applyBatKnockback(seat:Seat,hit:BatImpact):void{
  const now=Date.now();
  // A reconnection must never replay a stale hit from a previous snapshot.
  if(now-hit.at>900||hit.at>now+1000||!this.net.everyoneConnected||
     this.net.treetop.deadUntil>0)return;
  if(!this.net.isSolo&&this.net.localSeat!==seat)return;
  const body=this.solo?.body(seat)??this.body;
  if(!body)return;
  body.setAllowGravity(true);
  body.setVelocity(hit.vx,hit.vy);
  this.knockVx[seat]=hit.vx;
  this.knockUntil[seat]=now+BAT_KNOCKBACK_MS;
  const actor=this.avatars[seat];
  if(actor){
   const flash=this.add.circle(actor.x,actor.y-8,25,0xffdbaa,.50).setDepth(65);
   this.tweens.add({targets:flash,scale:1.7,alpha:0,duration:240,
    onComplete:()=>flash.destroy()});
  }
 }
 private sync(w:TreeWorld):void{
  for(const seat of [0,1,2] as Seat[]){
   const hit=w.batImpacts[seat];
   if(hit&&hit.at!==(this.w.batImpacts[seat]?.at??0))
    this.applyBatKnockback(seat,hit);
  }
   if(w.blackoutUntil>0&&w.blackoutUntil!==this.w.blackoutUntil){
    const old=TREE_PLATFORMS.filter(p=>p.state===w.layout);
    const next=TREE_PLATFORMS.filter(p=>p.state===((w.layout+1)%3));
    animateForestProps(this,old.map(p=>{
     const destination=[...next].sort((a,b)=>
       Math.abs(a.x-p.x)+Math.abs(a.y-p.y)-
       Math.abs(b.x-p.x)-Math.abs(b.y-p.y))[0]??p;
     return {from:{x:p.x,y:p.y,width:p.width,height:p.height},
       to:{x:destination.x,y:destination.y,width:destination.width,height:destination.height},
       kind:'branch' as const};
    }));
   }
   const layoutChanged=this.w.layout!==w.layout;
   if(layoutChanged)this.pipo?.warnDanger('Os galhos trocaram de lugar! Procurem abrigo!');
  this.w={...w,bridge:[...w.bridge],tower:[...w.tower],time:[...w.time],
   fragileAt:[...w.fragileAt],
   supporting:[...w.supporting],health:[...w.health],stamina:[...w.stamina],
   safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent],
   batDownUntil:[...w.batDownUntil],
   batImpacts:w.batImpacts.map(hit=>hit?{...hit}:null) as TreeWorld['batImpacts']};
  const active=new Set(treePlatforms(w));
  TREE_PLATFORMS.forEach((p,i)=>{
   const body=this.platforms[i].body as Phaser.Physics.Arcade.StaticBody;
   body.enable=active.has(p);this.platforms[i].setVisible(active.has(p));
   this.skins[i].setVisible(active.has(p));
   if(active.has(p))body.updateFromGameObject();
  });
 }
 private fragileInk?:Phaser.GameObjects.Graphics;
 /** Only three named ordinary branches crumble; mandatory puzzles stay solid.
  * Host and guests derive the same phase from the broadcast cycle clock.
  */
 private updateFragileBranches(now:number,paused:boolean):void{
   const ink=this.fragileInk??(this.fragileInk=this.add.graphics().setDepth(25));
   ink.clear();
   const active=new Set(treePlatforms(this.w));
   for(const index of FRAGILE_BRANCH_INDICES){
     const branch=TREE_PLATFORMS[index];
     const phase=fragilePhase(this.w.fragileAt[FRAGILE_BRANCH_INDICES.indexOf(index)],now,index,paused);
     const enabled=active.has(branch)&&phase!=='gone';
     const actor=this.platforms[index],body=actor.body as Phaser.Physics.Arcade.StaticBody;
     if(body.enable!==enabled){body.enable=enabled;if(enabled)body.updateFromGameObject();}
     actor.setVisible(enabled);this.skins[index].setVisible(enabled);
     if(!active.has(branch)||phase==='solid')continue;
     const pulse=.53+.4*Math.abs(Math.sin(now*.012));
     ink.lineStyle(phase==='cracking'?3:2,
       phase==='cracking'?0xffc17b:0xff9e63,phase==='cracking'?pulse:.33);
     ink.strokeRoundedRect(branch.x-branch.width/2,branch.y-12,branch.width,24,6);
     if(phase==='cracking'){
       ink.lineBetween(branch.x-branch.width/2+12,branch.y-5,branch.x-9,branch.y+4);
       ink.lineBetween(branch.x-9,branch.y+4,branch.x+12,branch.y-7);
       ink.lineBetween(branch.x+12,branch.y-7,branch.x+branch.width/2-12,branch.y+5);
     }
   }
 }
 private request(kind:VitalAction,seat:Seat):void{
  const id=this.net.requestVital(kind,this.facing);
  if(id!==null)this.pending.set(id,{seat,kind});
 }
 private interact(seat:Seat):void{
  const p=this.local,w=this.w;
  const nearBase=treeTowerNearBase(p),nearTop=treeTowerNearTop(p);
  if(seat===0){
   // The actual upper mechanism takes priority when Téo has reached it.
   if(w.bridgeOpen&&!w.ropeOpen&&nearTop&&w.supporting[0]===null){
    this.net.act({kind:'lever'});return;
   }
   if(w.supporting[0]!==null){this.net.act({kind:'detach'});return;}
   // Optional human stacking remains available through other systems,
   // but Téo never needs it to activate the upper rope.
   if(w.bridgeOpen&&!w.ropeOpen&&nearBase&&w.supporting[1]===2
     &&Math.abs(p.x-this.avatars[1].x)<=65
     &&Math.abs(p.y-this.avatars[1].y)<=86){
    this.net.act({kind:'support'});return;
   }
   this.net.act({kind:'lever'});return;
  }
  if(seat===1){
   if(w.supporting[1]!==null){this.net.act({kind:'detach'});return;}
   if(w.bridgeOpen&&!w.ropeOpen&&nearBase
     &&Math.abs(p.x-this.avatars[2].x)<=65
     &&Math.abs(p.y-this.avatars[2].y)<=86){
    this.net.act({kind:'support'});return;
   }
  }
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
  const seat=this.net.localSeat,w=this.w,now=Date.now();
  const pause=w.blackoutUntil>now||w.deadUntil>0||!this.net.everyoneConnected;
  this.bats?.update(now,w.cycleStart,w.batDownUntil,pause);
   this.ratEnemies?.update(now,w.cycleStart,w.ratDownUntil,pause);
  if(!pause&&now-this.batAlertAt>8500&&
    ([0,1] as const).some(id=>{
      if(!batAlive(w.batDownUntil,id,now))return false;
      const bat=batFlight(3,id,now,w.cycleStart);
      return Math.abs(this.local.x-bat.x)<215&&Math.abs(this.local.y-bat.y)<135;
    })){
    this.batAlertAt=now;
    this.pipo.warnDanger('Morcegos nas copas! Lia pode derrubá-los com a baladeira!');
  }
  this.updateFragileBranches(now,pause);
  if(pause!==this.paused){
   this.paused=pause;
   if(pause){this.physics.pause();this.pending.clear();gameKeys.clear();clearTouch(this.touch);}
   else this.physics.resume();
  }
  this.dark.setAlpha(w.deadUntil>0?.91:0);
  this.darkText.setVisible(pause&&w.deadUntil>0);
  if(pause){
   this.darkText.setText(w.deadUntil>0?(w.deathByGust?'A RAJADA DERRUBOU UM AMIGO\nNINGUÉM FICA PARA TRÁS':
    'UM AMIGO CAIU NO VAZIO\nNINGUÉM FICA PARA TRÁS'):
    w.blackoutUntil>now?'A FLORESTA MENTE...\nMAS O VENTO NÃO.':
    'AGUARDANDO A EQUIPE...');
   this.solo?.report();
  }else{
   this.solo?.beforeFrame(w.supporting);
   // Every solo avatar has real Arcade physics. Wind also affects unattended friends.
   if(this.solo){
    for(const other of [0,1,2] as Seat[]){
     if(other===seat||w.supporting[other]!==null)continue;
     const b=this.solo.body(other),avatar=this.avatars[other];
     const standing=b.blocked.down||b.touching.down;
     b.setVelocityX(now<this.knockUntil[other]?this.knockVx[other]:
      treeWindVelocity(w,{x:avatar.x,y:avatar.y},standing,0));
    }
   }
   const base=w.supporting[seat];
   if(base!==null){
    const parent=this.avatars[base];
    this.body.setAllowGravity(false);this.body.reset(parent.x,parent.y-44);this.body.setVelocity(0,0);
   }else if(!this.body.allowGravity){
    this.body.setAllowGravity(true);
    if(this.pendingJump){this.body.setVelocityY(-TREE_JUMP);this.jumps=1;this.pendingJump=false;}
   }
   let dir=0;
   if(this.cursors?.left.isDown||this.keys?.A?.isDown)dir--;
   if(this.cursors?.right.isDown||this.keys?.D?.isDown)dir++;
   if(!dir)dir=Math.max(-1,Math.min(1,this.touch.moveX??(this.touch.right?1:this.touch.left?-1:0)));
   if(dir)this.facing=dir>0?1:-1;
   const grounded=this.body.blocked.down||this.body.touching.down;
   if(grounded)this.jumps=0;
   const jumping=gameKeys.consumeJump()||consumeTouch(this.touch,'jump');
   const action=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))
     ||consumeTouch(this.touch,'interact'));
   const ability=gameKeys.consumeSkill(seat)||consumeTouch(this.touch,'ability');
   this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
   const stunned=now<this.knockUntil[seat];
   if(base===null){
    const desired=seat===2&&time<this.dashUntil?this.facing*345:dir*TREE_SPEED;
    this.body.setVelocityX(stunned?this.knockVx[seat]:
      treeWindVelocity(w,this.local,grounded,desired));
    if(!stunned&&jumping&&(grounded||seat===0&&this.jumps<2))
     this.request(grounded?'jump':'doubleJump',seat);
   }else{
    this.body.setVelocityX(0);
    if(!stunned&&jumping&&!this.pendingJump)this.request('jump',seat);
   }
   if(!stunned){
    if(action)this.interact(seat);
    if(ability&&(seat===1&&time>this.lastShot||seat===2&&time>this.lastDash))
     this.request(seat===1?'shoot':'dash',seat);
   }
   if(base===null)this.net.report(this.local.x,this.local.y,this.body.velocity.x,this.body.velocity.y);
   this.solo?.report();
  }
  for(const i of [0,1,2] as Seat[]){
   const avatar=this.avatars[i];
   if(i!==seat&&!this.net.isSolo){
    avatar.x=Phaser.Math.Linear(avatar.x,this.net.poses[i].x,.24);
    avatar.y=Phaser.Math.Linear(avatar.y,this.net.poses[i].y,.24);
   }
   this.names[i].setPosition(avatar.x,avatar.y-48)
    .setColor(i===seat?'#ffffff':CHARACTERS[i].hex);
  }
  if(this.lastWindPhase!==w.windPhase){
   const older=this.lastWindPhase;
   this.lastWindPhase=w.windPhase;
   if(w.windPhase==='warning')this.pipo.warnWind('O vento vai apertar! Procurem os abrigos!');
   else if(w.windPhase==='gust'&&older!=='warning')
    this.pipo.warnWind('Abriguem-se! A rajada está chegando!');
  }
  this.windDirectionShown=w.windDirection;
  this.windAudio.setPhase(w.windPhase,pause);
  this.windStatus.setText(w.windPhase==='warning'?
    '⚠ RAJADA EM BREVE — PROCURE UM ABRIGO':
    w.windPhase==='gust'?
      (w.windDirection===1?'🌪 RAJADA FORTE ▶':'◀ RAJADA FORTE 🌪'):'');
  this.windStatus.setVisible(w.windPhase!=='calm'&&!pause);
  this.windStatus.setColor(w.windPhase==='gust'?'#ffe4a0':'#dff5bd');
  this.markers.forEach(({ring,label,stage,seat:owner})=>{
   const pending=stage==='bridge'?!w.bridgeOpen&&!w.bridge[owner]:
    stage==='tower'?w.bridgeOpen&&!w.ropeOpen:
    w.ropeOpen&&!w.finalOpen&&!w.time[owner];
   // Final targets stay actionable regardless of the current A/B/C cycle.
   ring.setVisible(pending);
   label?.setVisible(pending);
   if(stage==='time'&&pending){
    ring.setStrokeStyle(3,0x9df6c2,1);
    label?.setColor('#b3ffdb');
   }
  });
  const byTower=w.bridgeOpen&&!w.ropeOpen&&
   Math.abs(this.local.x-TREE_TARGETS.tower.top.x)<300;
  if(byTower){
   this.hint.setText('TÉO: SUBA OS GALHOS COM SALTO DUPLO E USE E NO CIPÓ')
    .setPosition(TREE_TARGETS.tower.top.x,TREE_TARGETS.tower.top.y-86)
    .setVisible(true);
  }else this.hint.setVisible(false);
  this.missions.update(time,pause);
   this.pipo.update(time,this.local.x,this.local.y,pause);
   this.exitArt?.update(w.bridgeOpen&&w.ropeOpen&&w.time.every(Boolean)&&w.finalOpen,this.net.poses,w.health,time);
  const localPose=this.net.poses.map((p,i)=>this.net.isSolo?
   {seat:p.seat,x:this.avatars[i].x,y:this.avatars[i].y,
    vx:this.solo?.body(p.seat).velocity.x??p.vx,
    vy:this.solo?.body(p.seat).velocity.y??p.vy}:p);
  this.art.update(time,localPose,w.windPhase,w.windDirection,w.gustCount);
  this.forestTrees?.update();
  // Physical velocity drives vertical look-ahead; no character/world movement.
  const camera=this.cameras.main;
  const viewH=this.scale.gameSize.height/Math.max(.6,camera.zoom);
  const vy=this.body.velocity.y;
  const targetY=vy< -110?-Math.min(viewH*.24,125):
    vy>130?Math.min(viewH*.20,105):-Math.min(viewH*.10,48);
  camera.followOffset.y=Phaser.Math.Linear(camera.followOffset.y,targetY,.045);
  camera.followOffset.x=Phaser.Math.Linear(camera.followOffset.x,
    this.facing*Math.min(65,this.scale.gameSize.width/Math.max(.6,camera.zoom)*.10),.035);
  this.hud?.();
  void dt;
 }
 getCooldown():string{return this.net.localSeat===0?'SALTO DUPLO':
  this.net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH';}
}
