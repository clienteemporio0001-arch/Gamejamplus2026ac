import Phaser from 'phaser';
import {PipoGuide} from './pipoGuide';
import {CHARACTERS,type Network,type Seat} from './network';
import type {TouchInput} from './game';
import {SoloBodies} from './soloBodies';
import {consumeTouch,clearTouch} from './mobileControls';
import {cameraZoomFor,isCoarseDevice} from './mobileViewport';
import {gameKeys} from './keyboard';
import type {VitalAction} from './loopVitals';
import {TREE_WIDTH,TREE_HEIGHT,TREE_START,TREE_PLATFORMS,treePlatforms,
 treeObjective,treeWind,type TreeWorld} from './treetopForest';

/** Fase 3 da aventura principal. Nenhum chão é criado abaixo dos galhos. */
export class TreetopForestScene extends Phaser.Scene {
 private net:Network;private touch:TouchInput;private hud?:()=>void;
 private w:TreeWorld;
 private platforms:Phaser.GameObjects.Rectangle[]=[];
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
 private dark!:Phaser.GameObjects.Rectangle;private darkText!:Phaser.GameObjects.Text;
 private hint!:Phaser.GameObjects.Text;private guide!:Phaser.GameObjects.Text;
 private pipo!:PipoGuide;
 private canopy!:Phaser.GameObjects.Graphics;private leafParticles:{x:number;y:number;speed:number;phase:number}[]=[];
 constructor(net:Network,touch:TouchInput,hud?:()=>void){
  super({key:'TreetopForestScene'});this.net=net;this.touch=touch;this.hud=hud;
  this.w={...net.treetop};
 }
 private caption(x:number,y:number,value:string,size=15,color='#b7f0d1'):Phaser.GameObjects.Text{
  return this.add.text(x,y,value,{fontFamily:'Arial',fontSize:size+'px',fontStyle:'bold',
   color,stroke:'#071c1b',strokeThickness:4,align:'center'}).setOrigin(.5).setDepth(55);
 }
 private makeEnvironment():void{
  const backdrop=this.add.graphics().setDepth(-30);
  backdrop.fillGradientStyle(0x07151d,0x07151d,0x0b343b,0x071e33,1);
  backdrop.fillRect(0,0,TREE_WIDTH,TREE_HEIGHT);
  // Far below the canopy only fog, distant forests and open air are visible.
  for(let layer=0;layer<5;layer++){
   const parallax=this.add.graphics().setDepth(-24+layer).setAlpha(.28+layer*.07);
   const color=[0x0b2636,0x153e49,0x1b5655,0x1b4947,0x14362c][layer];
   parallax.fillStyle(color);
   for(let x=-200;x<TREE_WIDTH+300;x+=260){
    const h=115+(Math.sin(x*.013+layer)*45)+layer*25;
    const base=TREE_HEIGHT-65+layer*10;
    parallax.fillTriangle(x,base,x+125,base-h,x+250,base);
   }
  }
  const haze=this.add.graphics().setDepth(-15);
  for(let row=0;row<6;row++){
   haze.fillStyle(row%2?0x6db9bb:0x3f7c92,.035+row*.017);
   haze.fillRect(0,850+row*62,TREE_WIDTH,52);
  }
  // Monumental trees with distinct silhouettes, original procedural scenery.
  for(let x=180;x<TREE_WIDTH+200;x+=430){
   const trunk=this.add.graphics().setDepth(-10);
   const sway=Math.sin(x*.037)*35;
   trunk.fillStyle(0x19392c,.93);
   trunk.fillRoundedRect(x-57+sway,85,114,1100,42);
   trunk.fillStyle(0x2b5540,.45);
   trunk.fillRect(x-25+sway,92,10,1000);
   for(let b=0;b<7;b++){
    const y=135+b*138;
    trunk.lineStyle(28+(b%2)*6,0x224b38,.9);
    trunk.lineBetween(x+sway,y,x+(b%2?150:-165)+sway,y-85);
    trunk.fillStyle(b%2?0x163f35:0x1b523f,.83);
    trunk.fillEllipse(x+(b%2?135:-125)+sway,y-120,270,132);
   }
   const canopy=this.add.graphics().setDepth(-8);
   for(let c=0;c<4;c++){
    canopy.fillStyle([0x144e3b,0x226d50,0x1a5548,0x28755a][c],.73);
    canopy.fillEllipse(x-120+c*78+sway,90+Math.sin(c+x)*20,260,160);
   }
  }
  this.canopy=this.add.graphics().setDepth(11);
  for(let i=0;i<75;i++)this.leafParticles.push({
   x:(i*233)%TREE_WIDTH,y:(i*83)%TREE_HEIGHT,speed:13+i%7*5,phase:i*1.91});
  // Floating landmarks explain each cooperative obstacle.
  const markers=[
   [2960,240,'1 · PONTE DOS TRÊS'],[3540,135,'2 · ESCADA HUMANA'],
   [3890,55,'3 · GALHOS DO TEMPO'],[4170,55,'A ÚLTIMA COPA']
  ] as const;
  for(const [x,y,title] of markers){
   // Subtle glow remains; Pipo explains the puzzle instead of a large title.
   void title;
   const aura=this.add.circle(x,y+27,8,0xffe7a8,.8).setDepth(12);
   this.tweens.add({targets:aura,alpha:.2,scale:1.5,duration:1450,yoyo:true,repeat:-1});
  }
 }
 create():void{
  this.physics.world.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT+250);
  this.physics.world.setBoundsCollision(true,true,false,false);
  this.makeEnvironment();
  for(const p of TREE_PLATFORMS){
   const platform=this.add.rectangle(p.x,p.y,p.width,p.height,0x396b4b)
    .setStrokeStyle(2,0x8fbd83).setDepth(15);
   this.add.rectangle(p.x,p.y-p.height/2-3,p.width,6,0x73996d,.85).setDepth(16);
   this.physics.add.existing(platform,true);
   const staticBody=platform.body as Phaser.Physics.Arcade.StaticBody;
   staticBody.checkCollision.down=false;staticBody.checkCollision.left=false;
   staticBody.checkCollision.right=false;staticBody.checkCollision.up=true;
   this.platforms.push(platform);
  }
  const scenery=this.add.graphics().setDepth(14);
  for(let i=0;i<24;i++){
   const x=960+i*140,y=780-Math.sin(i*.8)*150;
   scenery.lineStyle(2,0x347b5d,.5);
   scenery.lineBetween(x,y-135,x+Math.sin(i)*20,y);
  }
  for(const seat of [0,1,2] as Seat[]){
   const p=this.net.poses[seat]??TREE_START[seat];
   const actor=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color)
    .setDepth(30).setStrokeStyle(3,seat===0?0x17342f:0x21423d);
   this.avatars.push(actor);
   this.names.push(this.caption(p.x,p.y-48,CHARACTERS[seat].name,12,CHARACTERS[seat].hex));
   if(this.net.localSeat===seat){
    this.local=actor;this.physics.add.existing(actor);
    this.body=actor.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(850).setMaxVelocity(410,960).setCollideWorldBounds(true);
    for(const b of this.platforms)this.physics.add.collider(actor,b);
   }
  }
  if(this.net.isSolo){
   this.solo=new SoloBodies(this,this.net,this.avatars,this.platforms,410,960);
   this.solo.select(this.net.localSeat??0);
   this.off.push(this.net.on('solo-seat',seat=>{
    this.solo?.select(seat);this.local=this.avatars[seat];this.body=this.solo!.body(seat);
    this.pending.clear();this.jumps=0;this.pendingJump=false;this.dashUntil=0;this.hud?.();
   }));
  }
  this.cameras.main.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT);
  this.cameras.main.setZoom(cameraZoomFor({width:this.scale.gameSize.width,
    height:this.scale.gameSize.height},isCoarseDevice()));
  this.cameras.main.startFollow(this.local,false,.095,.075,0,-65);
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
  this.pipo=new PipoGuide(this,this.net);
  this.hint=this.caption(0,0,'',13,'#f0dfb1');
  this.guide=this.caption(this.scale.gameSize.width/2,92,'',14,'#c3f6da')
   .setScrollFactor(0).setDepth(150);
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
    }else{this.body.setVelocityY(-465);this.jumps=reply.kind==='doubleJump'?2:1;}
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
   this.cameras.main.setZoom(cameraZoomFor({width:size.width,height:size.height},isCoarseDevice()));
   this.cameras.main.setBounds(0,0,TREE_WIDTH,TREE_HEIGHT);
   this.guide.setPosition(size.width/2,Math.min(92,size.height*.18));
   this.dark.setPosition(size.width/2,size.height/2).setSize(size.width+150,size.height+150);
   this.darkText.setPosition(size.width/2,size.height/2);
  };
  this.scale.on(Phaser.Scale.Events.RESIZE,resize);resize(this.scale.gameSize);
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   this.off.forEach(off=>off());this.scale.off(Phaser.Scale.Events.RESIZE,resize);
  });
 }
 private sync(w:TreeWorld):void{
  this.w={...w,bridge:[...w.bridge],tower:[...w.tower],time:[...w.time],
   supporting:[...w.supporting],health:[...w.health],stamina:[...w.stamina],
   safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent]};
  const active=new Set(treePlatforms(w));
  TREE_PLATFORMS.forEach((p,i)=>{
   const body=this.platforms[i].body as Phaser.Physics.Arcade.StaticBody;
   body.enable=active.has(p);this.platforms[i].setVisible(active.has(p));
   if(active.has(p))body.updateFromGameObject();
  });
 }
 private request(kind:VitalAction,seat:Seat):void{
  const id=this.net.requestVital(kind,this.facing);
  if(id!==null)this.pending.set(id,{seat,kind});
 }
 private interact(seat:Seat):void{
  const p=this.local;
  if(seat===0){
   if(this.w.supporting[0]!==null)this.net.act({kind:'detach'});
   else if(Math.abs(p.x-3390)<125&&Math.abs(p.y-this.avatars[1].y)<75
     &&!this.w.ropeOpen)this.net.act({kind:'support'});
   else this.net.act({kind:'lever'});
  }
  if(seat===1){
   if(this.w.supporting[1]!==null)this.net.act({kind:'detach'});
   else if(Math.abs(p.x-3390)<125&&Math.abs(p.y-this.avatars[2].y)<75
     &&!this.w.ropeOpen)this.net.act({kind:'support'});
  }
  if(seat===2)this.net.act({kind:'switch'});
 }
 update(time:number,dt:number):void{
  if(!this.body||!this.net.playing||this.net.localSeat===null)return;
  const seat=this.net.localSeat,w=this.w,now=Date.now();
  const pause=w.blackoutUntil>now||w.deadUntil>0||!this.net.everyoneConnected;
  if(pause!==this.paused){
   this.paused=pause;
   if(pause){this.physics.pause();this.pending.clear();gameKeys.clear();clearTouch(this.touch);}
   else this.physics.resume();
  }
  this.dark.setAlpha(pause?.91:0);
  this.darkText.setVisible(pause);
  if(pause){
   this.darkText.setText(w.deadUntil>0?'UM AMIGO CAIU NO VAZIO\nNINGUÉM FICA PARA TRÁS':
    w.blackoutUntil>now?'A FLORESTA MENTE...\nMAS O VENTO NÃO.':
    'AGUARDANDO A EQUIPE...');
   this.solo?.report();
  }else{
   this.solo?.beforeFrame(w.supporting);
   const base=w.supporting[seat];
   if(base!==null){
    const parent=this.avatars[base];
    this.body.setAllowGravity(false);this.body.reset(parent.x,parent.y-44);this.body.setVelocity(0,0);
   }else if(!this.body.allowGravity){
    this.body.setAllowGravity(true);
    if(this.pendingJump){this.body.setVelocityY(-465);this.jumps=1;this.pendingJump=false;}
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
   if(base===null){
    this.body.setVelocityX(seat===2&&time<this.dashUntil?this.facing*345:dir*235);
    if(jumping&&(grounded||seat===0&&this.jumps<2))
     this.request(grounded?'jump':'doubleJump',seat);
   }else{
    this.body.setVelocityX(0);
    if(jumping&&!this.pendingJump)this.request('jump',seat);
   }
   if(action)this.interact(seat);
   if(ability&&(seat===1&&time>this.lastShot||seat===2&&time>this.lastDash))
    this.request(seat===1?'shoot':'dash',seat);
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
  const objectives=treeObjective(w);
  this.guide.setText('');
  const guidance=(!w.bridgeOpen?'NINO: DASH + E   ·   LIA: DISPARO   ·   TÉO: E':
    !w.ropeOpen?'NINO → LIA → TÉO: SUBAM COM E E LIBEREM O CIPÓ':
    !w.finalOpen?'OBSERVEM OS ESTADOS A / B / C':'REÚNAM OS TRÊS NO ÚLTIMO GALHO');
  const wind=treeWind(w,this.local.x);
  this.hint.setText('')
   .setPosition(this.local.x,this.local.y-86).setVisible(false);
  this.pipo.update(time,this.local.x,this.local.y,pause);
  void objectives;void guidance;void wind;
  this.canopy.clear();this.canopy.fillStyle(0xa4d5b0,.58);
  for(const leaf of this.leafParticles){
   const x=(leaf.x+time*.001*leaf.speed)%TREE_WIDTH;
   const y=leaf.y+Math.sin(time*.0016+leaf.phase)*12;
   this.canopy.fillEllipse(x,y,5,2.5);
  }
  this.hud?.();
  void dt;
 }
 getCooldown():string{return this.net.localSeat===0?'SALTO DUPLO':
  this.net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH';}
}
