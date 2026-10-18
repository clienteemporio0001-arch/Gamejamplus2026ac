import Phaser from 'phaser';
import {PipoGuide} from './pipoGuide';
import {SUSPENSION,SUSPENSION_LANDING_Y,LOOP_TERRAIN,LOOP_NATURAL_LEDGES,LOOP_LAYOUT_BRANCHES} from './forestLoop';
import {MissionDirector} from './missionDirector';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { LOOP_WIDTH, LOOP_GEOMETRY, LOOP_MARKS, LOOP_TREE, LOOP_FINAL, ROUTES, barriers,
  allDone, windGuide, blackoutActive, warningActive, type LoopWorld, LOOP_START,
  UPPER_BRANCH,SUMMIT_BRANCH,upperLandingY,summitLandingY,markerBaseY,hasBranchFooting,hasSummitFooting } from './forestLoop';
import { NightArt } from './visuals';
import { loopContext, regionTitle } from './forestLoopUI';
import { leafAt, swayAt, WIND_LEAVES } from './loopWind';
import { SoloBodies } from './soloBodies';
import {consumeTouch,clearTouch} from './mobileControls';
import {cameraZoomFor,isCoarseDevice} from './mobileViewport';
import { gameKeys } from './keyboard';
import type { TouchInput } from './game';
import type { VitalAction } from './loopVitals';

/** One 3800px landscape. All puzzle decisions are made by LoopAuthority in Network. */
export class ForestLoopScene extends Phaser.Scene {
  private net:Network;private touch:TouchInput;private hud?:()=>void;
  private art!:NightArt;private w:LoopWorld;
  private avatars:Phaser.GameObjects.Rectangle[]=[];
  private labels:Phaser.GameObjects.Text[]=[];
  private blocks:Phaser.GameObjects.Rectangle[]=[];
  private blockers:Phaser.GameObjects.Rectangle[]=[];
  private bridge!:Phaser.GameObjects.Rectangle;
  private tree!:Phaser.GameObjects.Container;private ropes:Phaser.GameObjects.Graphics[]=[];
  private finalBarrier!:Phaser.GameObjects.Rectangle;
  private marks:Phaser.GameObjects.Container[]=[];
  private routeCurtains:Phaser.GameObjects.Container[]=[];
  private suspension!:Phaser.GameObjects.Container;
  private suspensionCollider!:Phaser.GameObjects.Rectangle;
  private suspensionCables!:Phaser.GameObjects.Graphics;
  private layoutLedges:Phaser.GameObjects.Rectangle[]=[];
  private contextText!:Phaser.GameObjects.Text;
   private pipo!:PipoGuide;private missions!:MissionDirector;
  private regionToast!:Phaser.GameObjects.Text;
  private regionShown='';private regionUntil=0;
  private gusts:Phaser.GameObjects.Ellipse[]=[];
  private windVines:Phaser.GameObjects.Rectangle[]=[];
  private windFog:Phaser.GameObjects.Ellipse[]=[];
  private upperBranch!:Phaser.GameObjects.Rectangle;
  private clearingTree!:Phaser.GameObjects.Image;
  private shiftShade!:Phaser.GameObjects.Rectangle;
  private movingRoots:Phaser.GameObjects.Ellipse[]=[];
  private local!:Phaser.GameObjects.Rectangle;private body!:Phaser.Physics.Arcade.Body;
  private solo?:SoloBodies;
  private remote:Pose[]=LOOP_START.map(p=>({...p}));
  private off:Array<()=>void>=[];
  private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;

  private blackout!:Phaser.GameObjects.Rectangle;private blackoutText!:Phaser.GameObjects.Text;
  private shots=0;private dashes=0;private dashUntil=0;private facing:-1|1=1;
  private jumps=0;private paused=false;private pendingJump=false;
  private pendingVitals=new Map<number,{seat:Seat;kind:VitalAction}>();
  private tiredUntil=0;
  constructor(net:Network,touch:TouchInput,hud?:()=>void){
    super({key:'ForestLoopScene'});this.net=net;this.touch=touch;this.hud=hud;
    this.w={...net.loop,marks:[...net.loop.marks],tree:[...net.loop.tree],final:[...net.loop.final]};
  }
  private label(x:number,y:number,message:string,size=15,color='#d8ede1'):Phaser.GameObjects.Text{
    return this.add.text(x,y,message,{
      fontFamily:'Arial,sans-serif',fontStyle:'bold',fontSize:size+'px',
      color,stroke:'#04141a',strokeThickness:4,align:'center',
      wordWrap:{width:550},
    }).setDepth(25).setOrigin(.5);
  }
  private ground(x:number,y:number,width:number,height:number,material:'earth'|'wood'|'stone'='earth'):Phaser.GameObjects.Rectangle{
    const rect=this.add.rectangle(x,y,width,height,0x304c3d).setStrokeStyle(2,0x4b6752).setDepth(6);
    this.physics.add.existing(rect,true);(rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.blocks.push(rect);this.art.platform(rect,material);return rect;
  }
  private active(rect:Phaser.GameObjects.Rectangle,active:boolean):void{
    (rect.body as Phaser.Physics.Arcade.StaticBody).enable=active;
    rect.setVisible(active);
    if(active)(rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }
  preload():void{
    this.load.svg('loop-clearing-tree',import.meta.env.BASE_URL+'assets/clearing-tree.svg');
    this.load.svg('loop-hollow-tree',import.meta.env.BASE_URL+'assets/hollow-tree.svg');
    this.load.svg('loop-stone',import.meta.env.BASE_URL+'assets/loop-stone.svg');
    this.load.svg('loop-arch',import.meta.env.BASE_URL+'assets/loop-arch.svg');
    this.load.svg('loop-elevated-tree',import.meta.env.BASE_URL+'assets/loop-elevated-tree.svg');
  }
  private background():void{
    this.art=new NightArt(this,LOOP_WIDTH,'forest');
    this.art.water(LOOP_GEOMETRY.chasm.start,LOOP_GEOMETRY.chasm.end,637);
    this.art.water(SUSPENSION.gapStart,SUSPENSION.gapEnd,637);
    for(const [start,end] of [[2000,2260],[4100,4340],[6470,6700]])this.art.water(start,end,637);
    this.clearingTree=this.add.image(5670,333,'loop-clearing-tree')
      .setDisplaySize(560,625).setDepth(-7).setAlpha(.91);
    const light=this.add.graphics().setDepth(-6);
    for(let i=7;i>=1;i--){
      light.fillStyle(0x83c5ad,.014);
      light.fillEllipse(5670,330,145+i*45,190+i*45);
    }
    this.shiftShade=this.add.rectangle(LOOP_WIDTH/2,350,LOOP_WIDTH,700,0x142c38,.03).setDepth(-5);
    for(let i=0;i<4;i++){
      const root=this.add.ellipse(5250+i*100,632,135,29,0x224234,.30).setDepth(-2);
      this.movingRoots.push(root);
    }
    // All landmark sprites are rooted at the exact collision-ground level.
    // Their luminous targets use the same coordinates as LoopAuthority.
    const shapes=['loop-hollow-tree','loop-stone','loop-arch'] as const;
    const sizing=[{width:235,height:320},{width:155,height:104},{width:244,height:182}];
    for(const index of [0,1,2] as const){
      const mark=LOOP_MARKS[index],shape=sizing[index];
      const holder=this.add.container(mark.x,markerBaseY).setDepth(12);
      const sprite=this.add.image(0,-shape.height/2,shapes[index])
        .setDisplaySize(shape.width,shape.height);
      holder.add(sprite);
      const detail=this.add.graphics();
      detail.fillStyle(0x31563e,.75);
      for(let j=0;j<4;j++){
        const dx=(j-1.5)*31;
        detail.fillEllipse(dx,-4,58,10);
      }
      detail.lineStyle(3,0x9dcb91,.6);
      detail.strokeCircle(0,mark.y-markerBaseY,9);
      detail.fillStyle([0xc7f5a5,0xf3dfa8,0x9bd3f3][index],.5);
      detail.fillCircle(0,mark.y-markerBaseY,5);
      holder.add(detail);
      this.marks.push(holder);
    }
    // Towering chasm tree is attached to its roots, while the narrow branch
    // at UPPER_BRANCH.centerY is the ONLY solid high landing for Téo.
    this.add.image(9400,353,'loop-elevated-tree')
      .setDisplaySize(500,590).setDepth(5);
    const root=this.add.graphics().setDepth(6);
    root.lineStyle(16,0x534937,.9);
    root.beginPath();root.moveTo(9452,637);root.lineTo(9401,565);root.lineTo(9390,484);root.strokePath();
    root.lineStyle(7,0x8d7755,.56);
    root.beginPath();root.moveTo(9429,535);root.lineTo(9385,410);root.lineTo(9352,315);root.strokePath();
    const ring=this.add.graphics().setDepth(14);
    ring.lineStyle(3,0xcfe9a8,.75);
    ring.strokeCircle(LOOP_TREE[0].x,LOOP_TREE[0].y-9,10);
    ring.fillStyle(0xe7efb5,.55);
    ring.fillEllipse(LOOP_TREE[0].x,LOOP_TREE[0].y-9,8,13);
    // Colored markers remain compact and coincide with host action coordinates.
    const pad=(x:number,y:number,color:number)=>{
      this.add.circle(x,y,8,color,.56).setStrokeStyle(2,0xeafaf0,.38).setDepth(13);
    };
    for(const [index,point] of LOOP_TREE.entries())
      pad(point.x,point.y,[0x8eda9e,0xf7b074,0x8ec9f4][index]);
    for(const [index,point] of LOOP_FINAL.entries())
      pad(point.x,point.y,[0x8eda9e,0xf7b074,0x8ec9f4][index]);
    // Physical-looking woodland passages: roots & dangling foliage, never a magic portal.
    // Host still decides whether a route is true or false in each A/B/C state.
    for(const x of [LOOP_GEOMETRY.portal.oca,LOOP_GEOMETRY.portal.pedra]){
      const roots=this.add.graphics();
      roots.lineStyle(10,0x453c2b,.96);
      roots.lineBetween(-73,1,-37,-91);roots.lineBetween(74,1,37,-92);
      roots.lineStyle(6,0x5a5b37,.84);
      roots.lineBetween(-39,-93,-12,-111);roots.lineBetween(38,-93,12,-111);
      for(let i=0;i<7;i++){
        const vx=-52+i*17,leaf=roots;
        leaf.lineStyle(3,0x466a3e,.7);leaf.lineBetween(vx,-96,vx-4,-55+(i%3)*7);
        leaf.fillStyle(i%2?0x63834d:0x386548,.78);
        leaf.fillEllipse(vx-6,-52+(i%3)*7,19,11);
      }
      const warning=this.add.graphics();
      warning.lineStyle(3,0xc0e3a0,.43);
      warning.beginPath();warning.moveTo(-36,-106);
      warning.lineTo(0,-118);warning.lineTo(36,-106);warning.strokePath();
      this.routeCurtains.push(this.add.container(x,638,[roots,warning]).setDepth(14));
    }
    for(const x of [1300,7590,10600])
      this.add.rectangle(x,625,72,5,0x7cbed4,.7).setDepth(11);
  }
  private createTree():void{
    const ink=this.add.graphics();
    ink.fillStyle(0x2a342a,1);ink.fillRoundedRect(-6,-27,366,57,19);
    ink.fillStyle(0x69503a,1);ink.fillRoundedRect(0,-19,360,39,14);
    ink.lineStyle(3,0xb09266,.6);ink.lineBetween(20,-9,345,-9);
    ink.lineBetween(10,13,328,13);
    ink.lineStyle(10,0x3d3a2d,1);
    ink.lineBetween(235,-13,279,-63);ink.lineBetween(299,8,346,54);
    for(const [x,y,w,h] of [[280,-90,98,74],[327,-57,107,81],[347,-13,84,79]]){
      ink.fillStyle(0x2c543e,.96);ink.fillEllipse(x,y,w,h);
      ink.lineStyle(2,0x6d9365,.25);ink.strokeEllipse(x,y,w,h);
    }
    this.tree=this.add.container(9465,637,[ink]).setDepth(16);
    this.tree.setRotation(-1.16);
    for(let i=0;i<3;i++){
      const r=this.add.graphics().setDepth(15);
      r.lineStyle(4,[0x9febac,0xffd6a6,0x9ecdeb][i],.88);
      r.lineBetween(LOOP_TREE[i].x,LOOP_TREE[i].y,9500,465+i*35);
      this.ropes.push(r);
    }
  }
  create():void{
    this.physics.world.setBounds(0,0,LOOP_WIDTH,900);
    this.physics.world.setBoundsCollision(true,true,false,false);
    this.background();
    // Five genuine traversal gaps before the original tree bridge, not an enlarged empty floor.
    for(const terrain of LOOP_TERRAIN){
      this.ground((terrain.from+terrain.to)/2,674,terrain.to-terrain.from,72);
    }
    // Natural stepping stones have identical coordinates in physics and fall tracking.
    for(const {x,y,width} of LOOP_NATURAL_LEDGES){
      const ledge=this.ground(x,y,width,22,'wood');
      const body=ledge.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down=false;body.checkCollision.left=false;
      body.checkCollision.right=false;body.checkCollision.up=true;
    }
    // Hollow-tree cavity is served by an actual branch, not a floating plank.
    this.ground(LOOP_MARKS[0].x,546,165,20,'wood');
    // Physical stone collider matches the artwork's 155x104 silhouette;
    // its top can be cleared by normal jumps. The arch has a free central gap.
    const stoneHitbox=this.add.rectangle(LOOP_MARKS[1].x,592,120,91,0x1b3741,0)
      .setDepth(10);
    this.physics.add.existing(stoneHitbox,true);
    this.blocks.push(stoneHitbox);
    const upperSummit=this.ground(SUMMIT_BRANCH.x,SUMMIT_BRANCH.centerY,
      SUMMIT_BRANCH.width,SUMMIT_BRANCH.height,'wood');
    const summitBody=upperSummit.body as Phaser.Physics.Arcade.StaticBody;
    summitBody.checkCollision.down=false;
    summitBody.checkCollision.left=false;
    summitBody.checkCollision.right=false;
    summitBody.checkCollision.up=true;
    this.upperBranch=this.ground(UPPER_BRANCH.x,UPPER_BRANCH.centerY,
      UPPER_BRANCH.width,UPPER_BRANCH.height,'wood');
    const ledgeBody=this.upperBranch.body as Phaser.Physics.Arcade.StaticBody;
    ledgeBody.checkCollision.down=false;
    ledgeBody.checkCollision.left=false;
    ledgeBody.checkCollision.right=false;
    ledgeBody.checkCollision.up=true;
    this.ground(10520,548,145,20,'wood');
    // A/B/C create optional elevated passages without removing the permanent route.
    for(const branch of LOOP_LAYOUT_BRANCHES){
      const ledge=this.ground(branch.x,branch.y,branch.width,18,'wood');
      const body=ledge.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down=false;body.checkCollision.left=false;
      body.checkCollision.right=false;body.checkCollision.up=true;
      this.layoutLedges.push(ledge);
    }
    // The first suspended puzzle is separate from the original falling tree at x9465.
    const high=this.ground(SUSPENSION.branch.x,SUSPENSION.branch.y,
      SUSPENSION.branch.width,SUSPENSION.branch.height,'wood');
    const oneWay=high.body as Phaser.Physics.Arcade.StaticBody;
    oneWay.checkCollision.left=false;oneWay.checkCollision.right=false;
    oneWay.checkCollision.down=false;oneWay.checkCollision.up=true;
    const lever=this.add.graphics().setDepth(23);
    lever.lineStyle(7,0x8fae77,1);lever.lineBetween(
      SUSPENSION.lever.x,SUSPENSION.lever.y+23,
      SUSPENSION.lever.x,SUSPENSION.lever.y-10);
    lever.fillStyle(0xffd38b,.95);
    lever.fillCircle(SUSPENSION.lever.x,SUSPENSION.lever.y-12,9);
    for(const spot of [SUSPENSION.lia,SUSPENSION.nino]){
      this.add.circle(spot.x,spot.y-15,11,0xb7edac,.28)
        .setStrokeStyle(2,0xc8e1b1,.8).setDepth(22);
    }
    const timber=this.add.graphics().setDepth(20);
    timber.fillStyle(0x493d2d,1);timber.fillRoundedRect(
      -SUSPENSION.width/2,-SUSPENSION.height/2,SUSPENSION.width,SUSPENSION.height,9);
    timber.lineStyle(4,0x927653,.95);timber.lineBetween(
      -SUSPENSION.width/2+9,-5,SUSPENSION.width/2-9,-5);
    for(let x=-SUSPENSION.width/2+20;x<SUSPENSION.width/2-10;x+=43){
      timber.lineStyle(3,0x271e1a,.8);timber.lineBetween(x,-11,x+7,9);
    }
    this.suspension=this.add.container(SUSPENSION.initialX,656,[timber]).setDepth(20);
    this.suspensionCables=this.add.graphics().setDepth(19);
    // Collider stays disabled during motion; scenery and physics agree when stable.
    this.suspensionCollider=this.add.rectangle(SUSPENSION.initialX,656,
      SUSPENSION.width,SUSPENSION.height,0xffffff,.001).setDepth(19);
    this.physics.add.existing(this.suspensionCollider,true);
    this.blocks.push(this.suspensionCollider);
    this.bridge=this.ground(LOOP_GEOMETRY.bridge.x,LOOP_GEOMETRY.bridge.y,
      LOOP_GEOMETRY.bridge.width,LOOP_GEOMETRY.bridge.height,'wood');
    // Only the host's loop snapshot determines physical blockers.
    this.blockers=[
      this.ground(LOOP_GEOMETRY.gate,363,40,550,'stone'),
      ...LOOP_GEOMETRY.layoutWalls.map((x,i)=>
        this.ground(x,LOOP_GEOMETRY.clearing.groundY-48,45,96,i===1?'wood':'stone'))
    ];
    this.finalBarrier=this.ground(LOOP_GEOMETRY.finalGate,363,40,550,'wood');
    this.createTree();
    for(const seat of [0,1,2] as Seat[]){
      const p=this.net.poses[seat]||LOOP_START[seat];
      const actor=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color).setDepth(19).setStrokeStyle(2,0x142923);
      this.avatars.push(actor);this.remote[seat]={...p};
      this.art.character(actor,seat);
      this.labels.push(this.label(p.x,p.y-46,CHARACTERS[seat].name,13,CHARACTERS[seat].hex));
      if(seat===this.net.localSeat){
        this.local=actor;this.physics.add.existing(actor);
        this.body=actor.body as Phaser.Physics.Arcade.Body;
        this.body.setGravityY(850).setMaxVelocity(400,960).setCollideWorldBounds(true);
        for(const block of this.blocks)this.physics.add.collider(actor,block);
      }
    }
    if(this.net.isSolo){
      this.solo=new SoloBodies(this,this.net,this.avatars,this.blocks,400,960);
      this.solo.select(this.net.localSeat??0);
      this.off.push(this.net.on('solo-seat',seat=>{
        this.solo?.select(seat);
        this.local=this.avatars[seat];this.body=this.solo!.body(seat);
        this.jumps=0;this.dashUntil=0;this.pendingJump=false;this.pendingVitals.clear();
        this.hud?.();
      }));
    }
    this.cameras.main.setBounds(0,0,LOOP_WIDTH,700);
    this.cameras.main.setZoom(cameraZoomFor({width:this.scale.gameSize.width,height:this.scale.gameSize.height},isCoarseDevice()));
    this.cameras.main.startFollow(this.local,false,.09,.1);
    this.cameras.main.centerOn(LOOP_START[1].x,420);
    this.cameras.main.setDeadzone(80,90);
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.pipo=new PipoGuide(this,this.net);
   this.missions=new MissionDirector(this,this.net,1,this.avatars);
    this.contextText=this.label(0,0,'',12,'#e7f4d6')
      .setDepth(70).setVisible(false).setWordWrapWidth(230);
    this.regionToast=this.label(this.scale.gameSize.width/2,111,'',13,'#cbe7c8')
      .setScrollFactor(0).setDepth(90).setVisible(false);
    this.blackout=this.add.rectangle(this.scale.gameSize.width/2,350,this.scale.gameSize.width+200,800,0x02080e,1)
      .setDepth(190).setScrollFactor(0).setAlpha(0);
    // Wind is readable through moving leaves, and its sign comes exclusively from windGuide().
    for(let i=0;i<WIND_LEAVES;i++){
      const leaf=this.add.ellipse(0,0,11,4,i%2?0x9ab994:0xc4d5b0,.5).setDepth(17);
      this.gusts.push(leaf);
    }
    for(let i=0;i<10;i++){
      const x=200+i*355;
      this.windVines.push(this.add.rectangle(x,157+(i%3)*40,4,96+(i%3)*18,0x668b6d,.55)
        .setDepth(9).setOrigin(.5,0));
    }
    for(let i=0;i<7;i++){
      this.windFog.push(this.add.ellipse(210+i*535,400+(i%3)*50,340,73,0x93c5bc,.07)
        .setDepth(4));
    }
    this.blackoutText=this.label(this.scale.gameSize.width/2,330,'A FLORESTA ESTÁ MUDANDO...',24,'#eef2db')
      .setScrollFactor(0).setDepth(191).setVisible(false);
    this.sync(this.net.loop);
    this.off.push(this.net.on('loop',w=>this.sync(w)));
    this.off.push(this.net.on('effect',fx=>{
      if(fx.level!==1 || fx.kind!=='shoot')return;
      const p=this.avatars[fx.seat];if(!p)return;
      const stone=this.add.circle(p.x,p.y-18,5,0xe9c38d,.94).setDepth(30);
      this.tweens.add({targets:stone,x:stone.x+fx.facing*270,alpha:0,
        duration:400,onComplete:()=>stone.destroy()});
    }));
    this.off.push(this.net.on('vital-reply',reply=>{
      const requested=this.pendingVitals.get(reply.id);
      if(!requested||requested.kind!==reply.kind)return;
      this.pendingVitals.delete(reply.id);
      if(!reply.ok){
        if(reply.reason==='tired')this.tiredUntil=this.time.now+800;
        return;
      }
      const seat=requested.seat;
      if(seat!==this.net.localSeat||!this.net.playing||this.paused)return;
      if(reply.kind==='jump'||reply.kind==='doubleJump'){
        if(reply.kind==='jump'&&this.net.loop.supporting[seat]!==null){
          this.pendingJump=true;this.net.act({kind:'detach'});
        }else{
          this.body.setVelocityY(-465);
          this.jumps=reply.kind==='doubleJump'?2:1;
        }
      }else if(reply.kind==='shoot'){
        this.shots=this.time.now+510;
        const shot=this.add.circle(this.local.x+15,this.local.y-18,5,0xf0c184,.9).setDepth(25);
        this.tweens.add({targets:shot,x:shot.x+this.facing*365,alpha:0,
          duration:420,onComplete:()=>shot.destroy()});
      }else if(reply.kind==='dash'){
        this.dashes=this.time.now+1900;
        this.dashUntil=this.time.now+760;
        this.body.setVelocityX(this.facing*340);
      }
    }));
    this.off.push(this.net.on('snapshot',poses=>{
      for(const p of poses)if(p.seat!==this.net.localSeat)this.remote[p.seat]={...p};
    }));
    this.off.push(this.net.on('respawn',p=>{
      this.remote[p.seat]={...p};
      if(this.net.isSolo)this.solo?.reset(p);
      if(p.seat===this.net.localSeat){
        this.body.reset(p.x,p.y);this.body.setAllowGravity(true);
        this.jumps=0;this.dashUntil=0;this.pendingJump=false;this.pendingVitals.clear();
      }
    }));
    const onResize=(size:Phaser.Structs.Size)=>{
      this.cameras.main.setZoom(cameraZoomFor({width:size.width,height:size.height},isCoarseDevice()));
      this.cameras.main.setBounds(0,0,LOOP_WIDTH,700);
      this.regionToast.setX(size.width/2).setY(Math.min(108,size.height*.22));
      this.blackout.setPosition(size.width/2,size.height/2).setSize(size.width+200,size.height+120);
      this.blackoutText.setPosition(size.width/2,size.height/2);
    };
    this.scale.on(Phaser.Scale.Events.RESIZE,onResize);
    onResize(this.scale.gameSize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
      this.scale.off(Phaser.Scale.Events.RESIZE,onResize);
      this.off.forEach(off=>off());
    });
  }
  private fallImpact(seat:Seat,wet:boolean):void{
    const actor=this.avatars[seat];if(!actor)return;
    const cloud=this.add.ellipse(actor.x,actor.y+22,54,12,wet?0x8ed8e7:0xc7b49a,.65).setDepth(65);
    this.tweens.add({targets:cloud,scaleX:1.6,alpha:0,duration:450,onComplete:()=>cloud.destroy()});
    const label=this.add.text(actor.x,actor.y-43,'−1 ♥',{
      fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#ffabab',
      stroke:'#132020',strokeThickness:3
    }).setOrigin(.5).setDepth(70);
    this.tweens.add({targets:label,y:label.y-17,alpha:0,duration:700,onComplete:()=>label.destroy()});
  }
  private sync(w:LoopWorld):void{    if(this.avatars.length===3)for(const seat of [0,1,2] as Seat[]){
      if(w.health[seat]<this.w.health[seat])this.fallImpact(seat,false);
    }

    this.w={...w,marks:[...w.marks],tree:[...w.tree],final:[...w.final],
      suspended:[...w.suspended],supporting:[...w.supporting]};
    if(this.suspensionCollider){
      const settled=w.suspendedX===w.suspendedTo&&w.suspendedOpen;
      const position=w.suspendedX;
      this.suspension.setX(position);
      this.suspensionCollider.setX(position);
      this.suspensionCollider.setVisible(settled);
      const body=this.suspensionCollider.body as Phaser.Physics.Arcade.StaticBody;
      body.enable=settled;
      if(settled)body.updateFromGameObject();
      this.suspensionCables.clear();
      for(const x of [position-SUSPENSION.width/2+45,position+SUSPENSION.width/2-45]){
        this.suspensionCables.lineStyle(5,0x558f6b,.91);
        this.suspensionCables.lineBetween(x,260,x,643);
        this.suspensionCables.lineStyle(1,0xccf5ac,.65);
        this.suspensionCables.lineBetween(x+3,260,x+3,643);
      }
    }
    const walls=barriers(w);
    this.blockers.forEach((b,i)=>this.active(b,walls[i].enabled));
    this.layoutLedges.forEach((ledge,i)=>this.active(ledge,LOOP_LAYOUT_BRANCHES[i].layout===w.layout));
    this.active(this.finalBarrier,!w.exit);
    this.active(this.bridge,w.bridge);
    this.ropes.forEach((rope,i)=>rope.setVisible(!w.tree[i]));
    const tint=[0x0c3f46,0x082d3c,0x2c3f60][w.layout];
    this.shiftShade.setFillStyle(tint).setAlpha([.035,.13,.10][w.layout]);
    this.clearingTree.setTint([0xffffff,0xc9e0d7,0xb4dfff][w.layout]);
    this.movingRoots.forEach((root,i)=>{
      root.x=5250+i*105+[0,-34,43][w.layout];
      root.setAlpha([.28,.45,.4][w.layout]);
    });
    this.marks.forEach((mark,i)=>{
      // Static targets must never drift away from host collision coordinates.
      mark.setX(LOOP_MARKS[i].x);
      mark.setAlpha(w.marks[i]?.56:1);
      const image=mark.list[0] as Phaser.GameObjects.Image;
      image.setTint(w.marks[i]?[0xa9e5b4,0xe6d69e,0xa4dded][i]:0xffffff);
      image.setScale(w.marks[i]?1.018:1);
    });
    this.routeCurtains.forEach((curtain,i)=>{
      const unlocked=allDone(w.marks);
      const correct=ROUTES[w.layout].correct===(i===0?'oca':'pedra');
      const target=unlocked&&correct?.40:1;
      if(Math.abs(curtain.alpha-target)>.08)
        this.tweens.add({targets:curtain,alpha:target,duration:380,ease:'Sine.easeOut'});
      else curtain.setAlpha(target);
    });
  }
  private action(seat:Seat):void{
    const x=this.local.x,y=this.local.y,w=this.w;
    if(seat===0){
      if(w.lastRoute==='right'&&!w.suspended[0]&&
        Math.abs(x-SUSPENSION.lever.x)<65&&Math.abs(y-SUSPENSION_LANDING_Y)<22)
        this.net.act({kind:'lever'});
      else if(w.observed && !w.marks[0]&&Math.abs(x-LOOP_MARKS[0].x)<90)
        this.net.act({kind:'lever'});
      else if(allDone(w.marks)&&w.teoSummitReached&&!w.tree[0]
        &&hasSummitFooting({seat,x,y,vx:this.body.velocity.x,vy:this.body.velocity.y})
        &&Math.abs(x-LOOP_TREE[0].x)<=37)
        this.net.act({kind:'lever'});
      else if(w.bridge&&!w.final[0]&&Math.abs(x-LOOP_FINAL[0].x)<95)this.net.act({kind:'lever'});
    }else if(seat===2){
      this.net.act({kind:'switch'});
    }
    // Physical co-op: Lia mounts stationary Nino, then Téo mounts Lia.
    if((seat===0||seat===1)&&((x>7550&&x<8000)||(x>9110&&x<9440))
      &&(seat!==0||!(allDone(w.marks)&&!w.tree[0]&&Math.abs(x-LOOP_TREE[0].x)<83&&Math.abs(y-LOOP_TREE[0].y)<86))){
      this.net.act({kind:w.supporting[seat]===null?'support':'detach'});
    }
  }
  private requestVital(kind:VitalAction,seat:Seat):void{
    const id=this.net.requestVital(kind,this.facing);
    if(id!==null)this.pendingVitals.set(id,{seat,kind});
  }
  private ability(seat:Seat,time:number):void{
    if(seat===1&&time>this.shots)this.requestVital('shoot',seat);
    else if(seat===2&&time>this.dashes)this.requestVital('dash',seat);
  }
  update(time:number,dt:number):void{
    if(!this.body||!this.net.playing||this.net.localSeat===null)return;
    const seat=this.net.localSeat,w=this.w,now=Date.now();
    const pause=blackoutActive(w,now)||w.deadUntil>0||!this.net.everyoneConnected;
    if(pause!==this.paused){
      this.paused=pause;
      if(pause){this.physics.pause();this.pendingVitals.clear();gameKeys.clear();clearTouch(this.touch);}
      else this.physics.resume();
    }
    const fade=pause&&w.deadUntil===0?(w.blackoutUntil-now>1000?.94:.86):w.deadUntil>0?.89:0;
    this.blackout.setAlpha(fade);
    this.blackoutText.setVisible(pause);
    if(pause){
      this.blackoutText.setText(w.deadUntil>0?
        'UM AMIGO CAIU NA FLORESTA\nNINGUÉM FICA PARA TRÁS\nREINICIANDO EM '+Math.max(1,Math.ceil((w.deadUntil-now)/1000))+'...':
        'A FLORESTA ESTÁ MUDANDO\nO VENTO NÃO MENTE');
      this.solo?.report();
    }else{
      this.solo?.beforeFrame(w.supporting);
      const base=w.supporting[seat];
      if(base!==null){
        const parent=this.avatars[base];
        this.body.setAllowGravity(false);
        this.body.reset(parent.x,parent.y-44);this.body.setVelocity(0,0);
      }else if(!this.body.allowGravity){
        this.body.setAllowGravity(true);
        if(this.pendingJump){this.body.setVelocityY(-465);this.jumps=1;this.pendingJump=false;}
      }
      let dir=0;
      if(this.cursors?.left.isDown||this.keys?.A?.isDown)dir--;
    if(this.cursors?.right.isDown||this.keys?.D?.isDown)dir++;
    // Teclado conserva prioridade; eixo analógico varia a velocidade sem exceder 235.
    if(!dir)dir=Math.max(-1,Math.min(1,this.touch.moveX??(this.touch.right?1:this.touch.left?-1:0)));
      if(dir)this.facing=dir>0?1:-1;
      const grounded=this.body.blocked.down||this.body.touching.down;
      if(grounded)this.jumps=0;
      const jumping=gameKeys.consumeJump()||consumeTouch(this.touch,'jump');
      const using=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||consumeTouch(this.touch,'interact'));
      const special=gameKeys.consumeSkill(seat)||consumeTouch(this.touch,'ability');
      this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
      if(base===null){
        const dashing=seat===2&&time<this.dashUntil;
        this.body.setVelocityX(dashing?this.facing*340:dir*235);
        if(jumping&&(grounded||(seat===0&&this.jumps<2))){
          this.requestVital(grounded?'jump':'doubleJump',seat);
        }
      }else{
        this.body.setVelocityX(0);
        if(jumping&&!this.pendingJump)this.requestVital('jump',seat);
      }
      if(using)this.action(seat);
      if(special)this.ability(seat,time);
      if(base===null)this.net.report(this.local.x,this.local.y,this.body.velocity.x,this.body.velocity.y);
      this.solo?.report();
    }
    const v=this.net.poses;
    for(const i of [0,1,2] as Seat[]){
      const a=this.avatars[i];
      if(i!==seat&&!this.net.isSolo){
        a.x=Phaser.Math.Linear(a.x,v[i].x,.20);
        a.y=Phaser.Math.Linear(a.y,v[i].y,.20);
      }
      this.labels[i].setPosition(a.x,a.y-47);
      this.labels[i].setColor(i===seat?'#ffffff':CHARACTERS[i].hex);
    }
    // Context is the only gameplay instruction rendered in world coordinates.
    const hint=loopContext(w,seat,this.local.x,this.local.y,now);
    const fatigue=time<this.tiredUntil;
    this.contextText.setText(fatigue?'SEM ESTAMINA':'')
      .setVisible(fatigue).setColor(fatigue?'#ffd28e':'#e7f4d6')
      .setPosition(this.local.x,this.local.y-87);
    this.avatars.forEach((actor,i)=>{
      const blink=w.safeUntil[i]>now&&Math.floor(now/120)%2===0;
      actor.setAlpha(blink?.42:1);
    });
    const region=regionTitle(this.local.x);
    if(region!==this.regionShown){
      this.regionShown=region;this.regionUntil=time+2000;
      this.regionToast.setText(region);
    }
    this.regionToast.setVisible(time<this.regionUntil&&!pause);
    this.missions.update(time,pause);
   this.pipo.update(time,this.local.x,this.local.y,pause);
    void hint;
    const fallProgress=w.treeFallAt>0?Math.min(1,(now-w.treeFallAt)/1900):0;
    const easing=fallProgress*fallProgress*(3-2*fallProgress);
    this.tree.setRotation(-1.16*(1-easing));
    // World-space wind: fixed emitters sampled by shared windGuide, not by
    // actor facing, camera offset or local actor position.
    this.gusts.forEach((leaf,i)=>{
      const field=leafAt(w,i,time);
      leaf.setPosition(field.x,field.y).setRotation(field.angle);
      leaf.alpha=field.direction===0?.28:.44+(i%3)*.08;
    });
    this.windVines.forEach((vine,i)=>{vine.rotation=swayAt(w,vine.x,time,i);});
    this.windFog.forEach((mist,i)=>{
      const anchorX=210+i*535;
      mist.x=anchorX+swayAt(w,anchorX,time,i)*65;
    });
    this.art.update(time);
    this.hud?.();
    void dt;
  }
  getCooldown():string{
    if(this.net.localSeat===0)return '✦ SALTO DUPLO';
    if(this.net.localSeat===1)return 'J · BALADEIRA';
    return 'SHIFT · DASH';
  }
}
