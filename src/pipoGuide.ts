import Phaser from 'phaser';
import type {Network,Seat} from './network';
import {pipoHint,type HintSource} from './pipoHints';
import {pipoSpeechLayout,pipoHudCoords,PIPO_FOLLOW_HEIGHT} from './pipoBubbleLayout';

/** One decorative bird per Phaser scene; no physics, AI, network packets or external assets. */
export class PipoGuide {
 private bird:Phaser.GameObjects.Container;
 private left:Phaser.GameObjects.Graphics;
 private right:Phaser.GameObjects.Graphics;
 private beak:Phaser.GameObjects.Graphics;
 private bubble:Phaser.GameObjects.Container;
 private panel:Phaser.GameObjects.Graphics;
 private label:Phaser.GameObjects.Text;
 private nameLabel:Phaser.GameObjects.Text;
 private offscreenMarker:Phaser.GameObjects.Text;
 private panelWidth=0;private panelHeight=0;
 private lastTailX=Number.NaN;private lastTailY=Number.NaN;
 private key?:Phaser.Input.Keyboard.Key;
 private listener=()=>this.ask();
 private narrativeQueue:string[]=[];
 private currentPriority=5;
 private readonly narrativeListener=(event:Event)=>{
  const e=event as CustomEvent<{line:string;phase:number;priority:number}>;
  if(!e.detail||e.detail.phase!==this.net.level||!this.net.playing)return;
  const line=e.detail.line.trim();
  if(!line||this.narrativeQueue.includes(line))return;
  this.lastProgress=Date.now();this.depth=0;this.hasRequested=false;
  this.narrativeQueue.push(line);
  if(this.narrativeQueue.length>4)this.narrativeQueue.shift();
 };
 private previousCycle=-1;
 private objective='';
 private depth:0|1|2=0;
 private lastAsk=-100000;
 private hasRequested=false;
 private lastAlert='';private lastAlertAt=0;
 private lastProgress=0;
 private lastMovedAt=0;
 private lastHelpAt=0;
 private movementAnchor:{x:number;y:number}|null=null;
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
  this.label=add.text(0,10,'',{fontFamily:'Arial',fontSize:'14px',
   fontStyle:'bold',color:'#efffed',align:'center',wordWrap:{width:254}})
   .setOrigin(.5);
  this.nameLabel=add.text(0,-36,'PIPO',{fontFamily:'Arial',fontSize:'12px',
   fontStyle:'bold',color:'#c7ef9c',align:'center'}).setOrigin(.5);
  this.bubble=add.container(0,0,[this.panel,this.nameLabel,this.label])
   .setDepth(185).setScrollFactor(0).setVisible(false);
  this.offscreenMarker=add.text(0,0,'PIPO • DICA',{fontFamily:'Arial',
   fontSize:'12px',fontStyle:'bold',color:'#e0f8d7',
   backgroundColor:'#061d20e0',padding:{left:10,right:10,top:6,bottom:6},
   wordWrap:{width:230}}).setOrigin(.5).setScrollFactor(0)
   .setDepth(185).setVisible(false);
  this.key=scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  window.addEventListener('pipo-help',this.listener);
  window.addEventListener('mission-pipo',this.narrativeListener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   window.removeEventListener('pipo-help',this.listener);
   window.removeEventListener('mission-pipo',this.narrativeListener);
  });
 }
 private source():HintSource{
  if(this.net.level===4)return {phase:4,world:this.net.fire};
  if(this.net.level===3)return {phase:3,world:this.net.treetop};
  if(this.net.level===2)return {phase:2,world:this.net.temporal};
  return {phase:1,world:this.net.loop};
 }
 ask():void{
  if(!this.net.playing||this.net.experience!=='loop')return;
  const now=Date.now();
  if(now-this.lastAsk<2000||now<this.talkingUntil)return;
  this.lastAsk=now;
  this.depth=this.hasRequested?Math.min(2,this.depth+1) as 0|1|2:0;
  this.hasRequested=true;this.speak(now);
 }
 /** Warnings are high-priority, short and do not change hint progression. */
 warnDanger(message:string):void{
  if(this.net.experience!=='loop'||!this.net.playing)return;
  const now=Date.now();
  if(message===this.lastAlert&&now-this.lastAlertAt<6500)return;
  this.lastAlert=message;this.lastAlertAt=now;
  this.currentPriority=0;
  this.speak(now,message,2300);
 }
 warnWind(message:string):void{
  if(this.net.experience!=='loop'||this.net.level!==3||!this.net.playing)return;
  this.warnDanger(message);
 }
 private speak(now:number,urgent?:string,duration=6100):void{
  const hint=pipoHint(this.source());
  const message=urgent??hint.lines[this.depth];
  const view=this.scene.scale.gameSize;
  const compact=view.width>view.height&&view.height<=650;
  this.label.setFontSize(compact?11:14);
  this.nameLabel.setFontSize(compact?10:12);
  const width=compact?Math.min(220,Math.max(168,view.width-32)):
    Math.min(296,Math.max(168,view.width-32));
  this.label.setWordWrapWidth(width-28);
  this.label.setText(message);
  this.offscreenMarker.setWordWrapWidth(Math.min(230,view.width-40));
  this.offscreenMarker.setText('PIPO • '+message);
  this.panelWidth=width;
  this.panelHeight=compact?Math.min(102,Math.max(68,this.label.height+24)):
    Math.min(Math.max(90,this.label.height+44),Math.max(110,view.height*.38));
  this.nameLabel.setY(-this.panelHeight/2+17);
  this.label.setY(10);
  if(urgent===undefined)this.currentPriority=4;
  this.lastTailX=Number.NaN;this.lastTailY=Number.NaN;
  this.bubble.setVisible(true).setAlpha(1);
  this.offscreenMarker.setVisible(false);
  this.talkingUntil=now+(compact?Math.min(duration,2600):duration);
  this.fadingUntil=this.talkingUntil+350;
 }
 update(time:number,focusX:number,focusY:number,paused=false):void{
  if(!this.net.playing)return;
  const now=Date.now(),hint=pipoHint(this.source());
  if(!this.lastHelpAt)this.lastHelpAt=now;
  const local=this.net.poses[this.net.localSeat??0];
  if(local){
   if(!this.movementAnchor){
    this.movementAnchor={x:local.x,y:local.y};this.lastMovedAt=now;
   }else if(Math.hypot(local.x-this.movementAnchor.x,local.y-this.movementAnchor.y)>52){
    this.lastMovedAt=now;
    this.movementAnchor={x:local.x,y:local.y};
   }
  }
  if(hint.objective!==this.objective){
   this.objective=hint.objective;this.depth=0;this.hasRequested=false;
   this.lastProgress=now;this.lastHelpAt=now;
  }
  const source=this.source(),cycle=source.world.cycle;
  const blackout=source.world.blackoutUntil>now||source.world.deadUntil>now;
  if(!paused&&!blackout&&this.narrativeQueue.length&&now>=this.talkingUntil){
   const next=this.narrativeQueue.shift()!;
   this.currentPriority=2;
   this.speak(now,next,3100);
  }
  if(this.previousCycle<0)this.previousCycle=cycle;
  else if(cycle!==this.previousCycle){
   this.previousCycle=cycle;this.depth=0;this.hasRequested=false;
   this.lastAsk=now;
   if(!paused&&!blackout&&now>=this.talkingUntil)this.speak(now);
  }
  // Dica automática: 19s parado OU 38s sem concluir objetivo.
  // Intervalo de 25s evita repetição durante exploração lenta.
  const needsHelp=(now-this.lastMovedAt>19000||now-this.lastProgress>38000);
  if(!paused&&!blackout&&!this.narrativeQueue.length&&needsHelp&&
    now-this.lastHelpAt>25000&&now>this.fadingUntil){
   this.depth=Math.min(2,this.depth+1) as 0|1|2;
   this.lastHelpAt=now;this.speak(now);
  }
  if(!paused&&!blackout&&this.key&&Phaser.Input.Keyboard.JustDown(this.key))this.ask();
  const poses=this.net.poses;
  let px=focusX,py=focusY;
  if(!this.net.isSolo){
   const xs=poses.map(p=>p.x),ys=poses.map(p=>p.y);
   if(Math.max(...xs)-Math.min(...xs)<550){
    px=xs.reduce((a,b)=>a+b,0)/3;
    py=Math.min(...ys);
   }
  }
  // Voa mais alto para não encobrir o texto de interação e os nomes do grupo.
  this.targetX=px+80;this.targetY=py-PIPO_FOLLOW_HEIGHT;
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
  if(now>this.fadingUntil){
   this.bubble.setVisible(false);
   this.offscreenMarker.setVisible(false);
   return;
  }
  const fade=now>this.talkingUntil?
   Math.max(0,(this.fadingUntil-now)/500):1;
  const view=this.scene.scale.gameSize,cam=this.scene.cameras.main;
  // Camera.worldView includes the true zoom-adjusted world origin. ScrollX
  // alone is insufficient with Phaser's centered zoom on narrow devices.
  const layout=pipoSpeechLayout(
   {width:view.width,height:view.height},
   {x:this.bird.x,y:this.bird.y,worldX:cam.worldView.x,
    worldY:cam.worldView.y,zoom:cam.zoom},this.label.height);
  this.bubble.setVisible(!layout.offscreen).setAlpha(fade);
  this.offscreenMarker.setVisible(layout.offscreen).setAlpha(fade);
  if(layout.offscreen){
   const fixed=pipoHudCoords(layout.indicatorX,layout.indicatorY,
    {width:view.width,height:view.height},cam.zoom);
   this.offscreenMarker.setPosition(fixed.x,fixed.y).setScale(fixed.scale);
   return;
  }
  const width=layout.width,height=layout.height;
  if(width!==this.panelWidth||height!==this.panelHeight){
   this.panelWidth=width;this.panelHeight=height;
   this.label.setWordWrapWidth(width-28);
   this.nameLabel.setY(-height/2+17);
   this.lastTailX=Number.NaN;
  }
  if(!Number.isFinite(this.lastTailX)||
    Math.abs(layout.tailX-this.lastTailX)>2||
    Math.abs(layout.tailY-this.lastTailY)>2){
   this.lastTailX=layout.tailX;this.lastTailY=layout.tailY;
   this.panel.clear().fillStyle(0x061d20,.96)
    .fillRoundedRect(-width/2,-height/2,width,height,13)
    .lineStyle(2,0x9bdc91,.94)
    .strokeRoundedRect(-width/2,-height/2,width,height,13);
   // The pointer follows the visible head above OR below the text,
   // depending on mobile safe area and the current flying height.
   const edge=layout.tailSide==='top'?-height/2:height/2;
   const inside=layout.tailSide==='top'?edge+2:edge-2;
   this.panel.fillStyle(0x061d20,.96);
   this.panel.fillTriangle(layout.tailX-10,inside,
    layout.tailX+10,inside,layout.tailX,layout.tailY);
   this.panel.lineStyle(2,0x9bdc91,.94);
   this.panel.lineBetween(layout.tailX-10,edge,
    layout.tailX,layout.tailY);
   this.panel.lineBetween(layout.tailX,layout.tailY,
    layout.tailX+10,edge);
  }
  const fixed=pipoHudCoords(layout.x,layout.y,
   {width:view.width,height:view.height},cam.zoom);
  this.bubble.setPosition(fixed.x,fixed.y).setScale(fixed.scale);
 }
}
