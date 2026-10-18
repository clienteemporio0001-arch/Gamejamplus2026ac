import Phaser from 'phaser';
import {CHARACTERS,type Network,type Seat,type Pose} from './network';
import type {TouchInput} from './game';
import {SoloBodies} from './soloBodies';
import {gameKeys} from './keyboard';
import {NightArt} from './visuals';
import type {VitalAction} from './loopVitals';
import {temporalDrop,rainBudget,rippleAt} from './temporalRain';
import {
 TEMP_WIDTH,TEMP_START,TEMP_CHANNEL,TEMP_UPPER,TEMP_ECHO,TEMP_TREE,TEMP_ROOTS,
 TEMP_LAYOUTS,tempBlocks,tempSurface,tempWind,temporalObjective,tempNear,tempLanding,
 type TemporalWorld
} from './temporalForest';

/** Entirely independent level-2 Phaser world, sharing characters and controls. */
export class TemporalForestScene extends Phaser.Scene {
 private net:Network;private touch:TouchInput;private hud?:()=>void;
 private w:TemporalWorld;
 private art!:NightArt;
 private blocks:Phaser.GameObjects.Rectangle[]=[];
 private layoutBlocks:Phaser.GameObjects.Rectangle[]=[];
 private bridge!:Phaser.GameObjects.Rectangle;
 private temporary!:Phaser.GameObjects.Rectangle;
 private avatars:Phaser.GameObjects.Rectangle[]=[];
 private names:Phaser.GameObjects.Text[]=[];
 private solo?:SoloBodies;
 private body!:Phaser.Physics.Arcade.Body;private local!:Phaser.GameObjects.Rectangle;
 private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
 private keys?:Record<string,Phaser.Input.Keyboard.Key>;
 private off:Array<()=>void>=[];
 private frontRain!:Phaser.GameObjects.Graphics;
 private midRain!:Phaser.GameObjects.Graphics;
 private backRain!:Phaser.GameObjects.Graphics;
 private ripples!:Phaser.GameObjects.Graphics;
 private pools:Phaser.GameObjects.Ellipse[]=[];
 private branches:Phaser.GameObjects.Container[]=[];
 private tree!:Phaser.GameObjects.Container;
 private roots:Phaser.GameObjects.Graphics[]=[];
 private stormShade!:Phaser.GameObjects.Rectangle;
 private dark!:Phaser.GameObjects.Rectangle;
 private darkText!:Phaser.GameObjects.Text;
 private hint!:Phaser.GameObjects.Text;
 private region!:Phaser.GameObjects.Text;
 private regionId=-1;private regionEnds=0;
 private pending=new Map<number,{seat:Seat;kind:VitalAction}>();
 private tiredUntil=0;private lastShot=0;private lastDash=0;private dashUntil=0;
 private pendingJump=false;private jumps=0;private paused=false;private facing:-1|1=1;
 constructor(net:Network,touch:TouchInput,hud?:()=>void){
  super({key:'TemporalForestScene'});this.net=net;this.touch=touch;this.hud=hud;
  this.w={...net.temporal};
 }
 private text(x:number,y:number,s:string,size=13,color='#daeae5'):Phaser.GameObjects.Text{
  return this.add.text(x,y,s,{fontFamily:'Arial',fontSize:size+'px',fontStyle:'bold',color,
   stroke:'#071923',strokeThickness:3,align:'center'}).setOrigin(.5).setDepth(49);
 }
 private platform(x:number,y:number,width:number,height:number,material:'earth'|'wood'|'stone'='earth'){
  const object=this.add.rectangle(x,y,width,height,0x314c44).setDepth(7);
  this.physics.add.existing(object,true);
  (object.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  this.blocks.push(object);this.art.platform(object,material);
  return object;
 }
 private setActive(rect:Phaser.GameObjects.Rectangle,on:boolean){
  (rect.body as Phaser.Physics.Arcade.StaticBody).enable=on;
  rect.setVisible(on);
  if(on)(rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
 }
 private woodedEnvironment():void{
  this.art=new NightArt(this,TEMP_WIDTH,'river');
  this.stormShade=this.add.rectangle(TEMP_WIDTH/2,350,TEMP_WIDTH,700,0x1f4155,.16)
    .setDepth(-4);
  const g=this.add.graphics().setDepth(-3);
  // Swollen trunks and dark hanging roots create a distinct 5-region silhouette.
  for(let i=0;i<23;i++){
   const x=80+i*187,top=205+(i%3)*35;
   g.fillStyle(i%2?0x1b3638:0x203b43,.85);
   g.fillRoundedRect(x-22,top,45,470-top,18);
   g.fillStyle(0x2c544e,.77);
   g.fillEllipse(x,top+7,136+(i%3)*28,120);
   g.fillStyle(0x2d5756,.33);g.fillEllipse(x-21,top-19,88,58);
   g.lineStyle(5,0x5b7360,.30);
   g.beginPath();g.moveTo(x+19,top+15);g.lineTo(x+31,top+115);
   g.lineTo(x+23,top+199);g.strokePath();
  }
  // Giant waterlogged guardian at the broken bridge.
  const treeG=this.add.graphics();
  treeG.fillStyle(0x29473d,1);treeG.fillRoundedRect(0,-25,385,55,20);
  treeG.fillStyle(0x685546,1);treeG.fillRoundedRect(5,-18,380,40,15);
  treeG.lineStyle(5,0xb59b77,.38);treeG.lineBetween(25,-7,371,-5);
  treeG.lineStyle(14,0x36483b,1);treeG.lineBetween(284,-12,320,-94);
  treeG.lineBetween(342,12,393,-46);
  treeG.fillStyle(0x315748,1);treeG.fillEllipse(320,-102,136,92);
  treeG.fillStyle(0x2b615a,.72);treeG.fillEllipse(360,-51,108,72);
  this.tree=this.add.container(2606,655,[treeG]).setDepth(17).setRotation(-1.13);
  // Origin tree stump anchors the fall to the wet left bank.
  const stump=this.add.graphics().setDepth(11);
  stump.fillStyle(0x69503b);stump.fillRoundedRect(2505,420,83,242,27);
  stump.fillStyle(0x375c4a);stump.fillEllipse(2548,430,178,111);
  stump.lineStyle(13,0x405345);stump.lineBetween(2529,602,2490,655);
  for(const [i,point] of TEMP_TREE.entries()){
    const rope=this.add.graphics().setDepth(14);
    rope.lineStyle(3,[0xb7f4be,0xf8d5a2,0xa9d9ed][i],.72);
    rope.lineBetween(point.x,point.y,2580,420+i*42);
    this.roots.push(rope);
  }
  // Two decoy trail plaques intentionally contradict rain direction in A/B.
  for(const x of [760,3370]){
   const sign=this.add.graphics().setDepth(13);
   sign.fillStyle(0x635342);sign.fillRoundedRect(x-6,520,13,122,4);
   sign.fillStyle(0x927a5c);sign.fillRoundedRect(x-51,506,103,36,6);
   sign.lineStyle(3,0x4b4937);sign.lineBetween(x+16,524,x+41,524);
   sign.lineBetween(x+30,513,x+42,524);sign.lineBetween(x+42,524,x+30,535);
  }
  // Real marks integrate with the same points used by host authority.
  const markColor=[0x8fd9a3,0xf4c293,0x9accea];
  for(const [i,p] of TEMP_ECHO.entries()){
   const detail=this.add.graphics().setDepth(12);
   detail.fillStyle(0x465d4c,.85);detail.fillEllipse(p.x,638,96,25);
   detail.fillStyle(markColor[i],.42);detail.fillCircle(p.x,p.y,12);
   detail.lineStyle(2,markColor[i],.72);detail.strokeCircle(p.x,p.y,15);
  }
  for(const [i,p] of TEMP_ROOTS.entries()){
   this.add.circle(p.x,p.y,12,markColor[i],.52).setDepth(14)
    .setStrokeStyle(2,0xe0e9bc,.55);
  }
  for(let i=0;i<14;i++){
   const x=110+i*290;
   const pool=this.add.ellipse(x,639,126+(i%3)*33,13,0x5aadc0,.25)
     .setDepth(10).setStrokeStyle(2,0xa1d4d1,.32);
   this.pools.push(pool);
  }
  // Regions A-E are not persistent text overlays.
  this.art.water(TEMP_CHANNEL.start,TEMP_CHANNEL.end,638);
  this.text(2800,511,'CORRENTEZA PROFUNDA',14,'#efc6b3').setAlpha(.9);
 }
 create():void{
  this.physics.world.setBounds(0,0,TEMP_WIDTH,900);
  this.physics.world.setBoundsCollision(true,true,false,false);
  this.woodedEnvironment();
  this.platform(1305,678,2610,80);
  this.platform(3585,678,1230,80);
  this.platform(TEMP_ECHO[0].x,539,145,19,'root' as 'wood');
  this.platform(TEMP_UPPER.x,TEMP_UPPER.y,TEMP_UPPER.width,TEMP_UPPER.height,'wood');
  this.platform(TEMP_ROOTS[0].x,543,155,20,'wood');
  this.bridge=this.platform(2790,656,360,34,'wood');
  this.temporary=this.platform(3640,592,145,18,'wood');
  const upper=this.blocks[3].body as Phaser.Physics.Arcade.StaticBody;
  upper.checkCollision.down=false;upper.checkCollision.left=false;
  upper.checkCollision.right=false;upper.checkCollision.up=true;
  const defs=tempBlocks(this.w);
  this.layoutBlocks=defs.map(d=>this.platform(d.x,638-d.height/2,d.width,d.height,'stone'));
  for(const seat of [0,1,2] as Seat[]){
   const p=this.net.poses[seat]??TEMP_START[seat];
   const avatar=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color).setDepth(31)
     .setStrokeStyle(2,0x17342f);
   this.avatars.push(avatar);this.art.character(avatar,seat);
   this.names.push(this.text(p.x,p.y-49,CHARACTERS[seat].name,12,CHARACTERS[seat].hex));
   if(this.net.localSeat===seat){
    this.local=avatar;this.physics.add.existing(avatar);
    this.body=avatar.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(850).setMaxVelocity(410,960).setCollideWorldBounds(true);
    for(const block of this.blocks)this.physics.add.collider(avatar,block);
   }
  }
  if(this.net.isSolo){
   this.solo=new SoloBodies(this,this.net,this.avatars,this.blocks,410,960);
   this.solo.select(this.net.localSeat??0);
   this.off.push(this.net.on('solo-seat',seat=>{
    this.solo?.select(seat);this.local=this.avatars[seat];this.body=this.solo!.body(seat);
    this.jumps=0;this.pending.clear();this.pendingJump=false;this.dashUntil=0;this.hud?.();
   }));
  }
  this.cameras.main.setBounds(0,0,TEMP_WIDTH,700);
  this.cameras.main.setZoom(this.scale.gameSize.width<900?1:1.12);
  this.cameras.main.startFollow(this.local,false,.09,.10);
  this.cameras.main.centerOn(2010,430);
  this.cursors=this.input.keyboard?.createCursorKeys();
  this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
  this.backRain=this.add.graphics().setDepth(-1);
  this.midRain=this.add.graphics().setDepth(26);
  this.frontRain=this.add.graphics().setDepth(55);
  this.ripples=this.add.graphics().setDepth(14);
  this.hint=this.text(0,0,'',12,'#c6e9e0').setVisible(false).setDepth(66);
  this.region=this.text(this.scale.gameSize.width/2,110,'',14,'#d8ebed')
    .setScrollFactor(0).setDepth(100).setVisible(false);
  this.dark=this.add.rectangle(this.scale.gameSize.width/2,350,this.scale.gameSize.width+160,780,0x020d16)
    .setScrollFactor(0).setDepth(190).setAlpha(0);
  this.darkText=this.text(this.scale.gameSize.width/2,320,'',22,'#e6f1e9')
    .setScrollFactor(0).setDepth(191).setVisible(false);
  this.sync(this.net.temporal);
  this.off.push(this.net.on('temporal',w=>this.sync(w)));
  this.off.push(this.net.on('snapshot',poses=>{
   for(const p of poses)if(p.seat!==this.net.localSeat&&!this.net.isSolo){
    this.avatars[p.seat].x=Phaser.Math.Linear(this.avatars[p.seat].x,p.x,.33);
    this.avatars[p.seat].y=Phaser.Math.Linear(this.avatars[p.seat].y,p.y,.33);
   }
  }));
  this.off.push(this.net.on('respawn',p=>{
   this.solo?.reset(p);
   if(this.net.localSeat===p.seat){
    this.body.reset(p.x,p.y);this.body.setAllowGravity(true);
    this.pending.clear();this.dashUntil=0;this.jumps=0;this.pendingJump=false;
   }else if(!this.net.isSolo)this.avatars[p.seat].setPosition(p.x,p.y);
  }));
  this.off.push(this.net.on('vital-reply',result=>{
   const awaiting=this.pending.get(result.id);
   if(!awaiting||awaiting.kind!==result.kind)return;
   this.pending.delete(result.id);
   if(!result.ok){if(result.reason==='tired')this.tiredUntil=this.time.now+750;return;}
   if(awaiting.seat!==this.net.localSeat||!this.net.playing||this.paused)return;
   if(result.kind==='jump'||result.kind==='doubleJump'){
    if(result.kind==='jump'&&this.net.temporal.supporting[awaiting.seat]!==null){
     this.pendingJump=true;this.net.act({kind:'detach'});
    }else{
     this.body.setVelocityY(-465);this.jumps=result.kind==='doubleJump'?2:1;
    }
   }else if(result.kind==='dash'){this.dashUntil=this.time.now+760;this.lastDash=this.time.now+1900;}
   else if(result.kind==='shoot'){
    this.lastShot=this.time.now+510;
    const stone=this.add.circle(this.local.x,this.local.y-18,5,0xf9dfaa,.85).setDepth(56);
    this.tweens.add({targets:stone,x:stone.x+this.facing*290,alpha:0,duration:430,
      onComplete:()=>stone.destroy()});
   }
  }));
  this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.off.forEach(off=>off()));
 }
 private sync(w:TemporalWorld):void{
  this.w={...w,echo:[...w.echo],tree:[...w.tree],roots:[...w.roots],
   supporting:[...w.supporting],health:[...w.health],stamina:[...w.stamina],
   safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent],skillAt:[...w.skillAt]};
  tempBlocks(w).forEach((b,i)=>this.setActive(this.layoutBlocks[i],b.active));
  this.setActive(this.bridge,w.bridge);
  this.setActive(this.temporary,TEMP_LAYOUTS[w.layout].temporaryBridge);
  this.roots.forEach((r,i)=>r.setVisible(!w.tree[i]));
  this.stormShade.setFillStyle([0x1b3b46,0x254d64,0x112639][w.layout])
   .setAlpha([.12,.20,.27][w.layout]);
  this.pools.forEach((p,i)=>p.setScale(w.layout===2?1.7:w.layout===1?1.36:1,1));
 }
 private request(kind:VitalAction,seat:Seat){
  const id=this.net.requestVital(kind,this.facing);
  if(id!==null)this.pending.set(id,{seat,kind});
 }
 private interact(seat:Seat){
  const w=this.w,p=this.local,body=this.body;
  if(seat===0){
   if(!w.echo[0]&&Math.abs(p.x-TEMP_ECHO[0].x)<95)this.net.act({kind:'lever'});
   else if(w.echo.every(Boolean)&&w.teoLanded&&!w.tree[0]&&
      tempLanding({seat,x:p.x,y:p.y,vx:body.velocity.x,vy:body.velocity.y}))this.net.act({kind:'lever'});
   else if(w.bridge&&w.layout===2&&!w.roots[0]&&
      tempNear({seat,x:p.x,y:p.y,vx:0,vy:0},TEMP_ROOTS[0].x,TEMP_ROOTS[0].y))
     this.net.act({kind:'lever'});
  }else if(seat===2)this.net.act({kind:'switch'});
  if((seat===0||seat===1)&&p.x>2310&&p.x<2530)this.net.act({
    kind:w.supporting[seat]===null?'support':'detach'
  });
 }
 private caption(seat:Seat):string{
  const w=this.w,p=this.local;
  if(!w.echo.every(Boolean)){
   const item=TEMP_ECHO[seat];
   if(item&&!w.echo[seat]&&Math.abs(p.x-item.x)<170)
    return seat===0?'E · Investigar marco molhado':seat===1?'J · Alvo na chuva':'SHIFT + E · Tronco alagado';
  }else if(!w.bridge&&p.x>2250&&p.x<2600){
   if(seat===0)return !w.stacked?'E · Apoio Nino → Lia → Téo':
      !w.teoLanded?'ESPAÇO × 2 · Alcance o galho':'E · Solte a amarra';
   return seat===1?'J · Acertar cipó':'SHIFT → E · Raiz encharcada';
  }else if(w.bridge&&p.x>3100&&p.x<3920){
   if(w.layout!==2)return 'A chuva indica esperar o ESTADO C.';
   return seat===0?'E · Raiz elevada':seat===1?'J · Raiz protegida':'SHIFT → E · Plataforma temporária';
  }
  return '';
 }
 private renderRain(time:number):void{
  const budget=rainBudget(this.scale.gameSize.width<760);
  const colors=[0x87afb8,0x96c6d5,0xb7dbe5];
  ([this.backRain,this.midRain,this.frontRain] as const).forEach((graphic,layer)=>{
   graphic.clear();graphic.lineStyle([1,1.4,2][layer],colors[layer],[.16,.31,.50][layer]);
   for(let i=0;i<budget[layer];i++){
    const d=temporalDrop(this.w,i,time,layer as 0|1|2);
    graphic.lineBetween(d.x,d.y,d.x+d.dx,d.y+d.len);
   }
  });
  this.ripples.clear();
  const y=635;
  for(let i=0;i<12;i++){
   const x=160+i*346,r=rippleAt(i,time);
   this.ripples.lineStyle(1.2,0xa0d3df,r.alpha);
   this.ripples.strokeEllipse(x,y,r.radius*2,5);
  }
 }
 update(time:number,dt:number):void{
  if(!this.body||!this.net.playing||this.net.localSeat===null)return;
  const seat=this.net.localSeat,w=this.w,now=Date.now();
  const pause=(w.blackoutUntil>now||w.deadUntil>0||!this.net.everyoneConnected);
  if(pause!==this.paused){
   this.paused=pause;
   if(pause){this.physics.pause();this.pending.clear();gameKeys.clear();
     this.touch.jump=false;this.touch.ability=false;this.touch.interact=false;}
   else this.physics.resume();
  }
  this.dark.setAlpha(pause?(w.deadUntil>0?.91:.93):0);
  this.darkText.setVisible(pause);
  if(pause){
   this.darkText.setText(w.deadUntil>0?
     'UM AMIGO CAIU NA TEMPESTADE\nNINGUÉM FICA PARA TRÁS':
     'A FLORESTA TEMPORAL ESTÁ MUDANDO...');
   this.solo?.report();
  }else{
   this.solo?.beforeFrame(w.supporting);
   const base=w.supporting[seat];
   if(base!==null){
    const parent=this.avatars[base];
    this.body.setAllowGravity(false);this.body.reset(parent.x,parent.y-44);
    this.body.setVelocity(0,0);
   }else if(!this.body.allowGravity){
    this.body.setAllowGravity(true);
    if(this.pendingJump){this.body.setVelocityY(-465);this.jumps=1;this.pendingJump=false;}
   }
   let dir=0;
   if(this.cursors?.left.isDown||this.keys?.A?.isDown||this.touch.left)dir--;
   if(this.cursors?.right.isDown||this.keys?.D?.isDown||this.touch.right)dir++;
   if(dir)this.facing=dir>0?1:-1;
   const grounded=this.body.blocked.down||this.body.touching.down;
   if(grounded)this.jumps=0;
   const jumping=gameKeys.consumeJump()||this.touch.jump;
   const action=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||this.touch.interact);
   const ability=gameKeys.consumeSkill(seat)||this.touch.ability;
   this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
   if(base===null){
    const surface=tempSurface(w,this.local.x);
    const speed=surface==='mud'?145:235;
    const target=(seat===2&&time<this.dashUntil)?this.facing*340:dir*speed;
    this.body.setVelocityX(surface==='wet'?Phaser.Math.Linear(this.body.velocity.x,target,.045):target);
    if(jumping&&(grounded||(seat===0&&this.jumps<2)))
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
  for(const seatIndex of [0,1,2] as Seat[]){
   const actor=this.avatars[seatIndex];
   if(seatIndex!==seat&&!this.net.isSolo){
    actor.x=Phaser.Math.Linear(actor.x,this.net.poses[seatIndex].x,.20);
    actor.y=Phaser.Math.Linear(actor.y,this.net.poses[seatIndex].y,.20);
   }
   this.names[seatIndex].setPosition(actor.x,actor.y-47);
   this.names[seatIndex].setColor(seatIndex===seat?'#fff':CHARACTERS[seatIndex].hex);
   actor.setAlpha(w.safeUntil[seatIndex]>now&&Math.floor(now/125)%2===0?.45:1);
  }
  this.hint.setText(time<this.tiredUntil?'SEM ESTAMINA':this.caption(seat))
   .setColor(time<this.tiredUntil?'#f8cb86':'#c6e9e0');
  this.hint.setVisible(Boolean(this.hint.text)).setPosition(this.local.x,this.local.y-81);
  const regionIndex=this.local.x<700?0:this.local.x<1580?1:
    this.local.x<2560?2:this.local.x<3030?3:4;
  if(regionIndex!==this.regionId){
   this.regionId=regionIndex;this.regionEnds=time+2000;
   this.region.setText(['CLAREIRA ENCHARCADA','MATA ALAGADA','BOSQUE DOS TRONCOS',
    'GRANDE CORRENTEZA','PASSAGEM DA TEMPESTADE'][regionIndex]);
  }
  this.region.setVisible(time<this.regionEnds&&!pause);
  const progress=w.bridgeAt?Math.min(1,Math.max(0,(now-w.bridgeAt)/1900)):0;
  this.tree.setRotation(-1.13*(1-progress*progress*(3-2*progress)));
  this.renderRain(time);
  this.art.update(time);
  this.hud?.();
  void dt;
 }
 getCooldown():string{return this.net.localSeat===0?'SALTO DUPLO':
   this.net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH';}
}
