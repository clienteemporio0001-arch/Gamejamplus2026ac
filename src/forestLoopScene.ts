import Phaser from 'phaser';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { LOOP_WIDTH, LOOP_GEOMETRY, LOOP_MARKS, LOOP_TREE, LOOP_FINAL, ROUTES, barriers,
  allDone, windGuide, blackoutActive, warningActive, type LoopWorld, LOOP_START,
  UPPER_BRANCH,upperLandingY,markerBaseY,hasBranchFooting } from './forestLoop';
import { NightArt } from './visuals';
import { loopContext, regionTitle } from './forestLoopUI';
import { leafAt, swayAt, WIND_LEAVES } from './loopWind';
import { SoloBodies } from './soloBodies';
import { gameKeys } from './keyboard';
import type { TouchInput } from './game';

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
  private contextText!:Phaser.GameObjects.Text;
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
    this.clearingTree=this.add.image(1790,333,'loop-clearing-tree')
      .setDisplaySize(560,625).setDepth(-7).setAlpha(.91);
    const light=this.add.graphics().setDepth(-6);
    for(let i=7;i>=1;i--){
      light.fillStyle(0x83c5ad,.014);
      light.fillEllipse(1850,330,145+i*45,190+i*45);
    }
    this.shiftShade=this.add.rectangle(LOOP_WIDTH/2,350,LOOP_WIDTH,700,0x142c38,.03).setDepth(-5);
    for(let i=0;i<4;i++){
      const root=this.add.ellipse(1450+i*100,632,135,29,0x224234,.30).setDepth(-2);
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
    this.add.image(2200,353,'loop-elevated-tree')
      .setDisplaySize(500,590).setDepth(5);
    const root=this.add.graphics().setDepth(6);
    root.lineStyle(16,0x534937,.9);
    root.beginPath();root.moveTo(2252,637);root.lineTo(2201,565);root.lineTo(2190,484);root.strokePath();
    root.lineStyle(7,0x8d7755,.56);
    root.beginPath();root.moveTo(2229,535);root.lineTo(2185,410);root.lineTo(2152,315);root.strokePath();
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
    // Subtle route cues: world objects stay anchored, captions only appear nearby.
    for(const x of [LOOP_GEOMETRY.portal.oca,LOOP_GEOMETRY.portal.pedra]){
      this.add.circle(x,625,19,0x88bd97,.14).setStrokeStyle(2,0xb2d8af,.55).setDepth(12);
    }
    for(const x of [1080,2122,3400])
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
    this.tree=this.add.container(2265,637,[ink]).setDepth(16);
    this.tree.setRotation(-1.16);
    for(let i=0;i<3;i++){
      const r=this.add.graphics().setDepth(15);
      r.lineStyle(4,[0x9febac,0xffd6a6,0x9ecdeb][i],.88);
      r.lineBetween(LOOP_TREE[i].x,LOOP_TREE[i].y,2300,465+i*35);
      this.ropes.push(r);
    }
  }
  create():void{
    this.physics.world.setBounds(0,0,LOOP_WIDTH,900);
    this.physics.world.setBoundsCollision(true,true,false,false);
    this.background();
    this.ground(1132,674,2265,72);
    this.ground(3212,674,1175,72);
    // Hollow-tree cavity is served by an actual branch, not a floating plank.
    this.ground(LOOP_MARKS[0].x,546,165,20,'wood');
    // Physical stone collider matches the artwork's 155x104 silhouette;
    // its top can be cleared by normal jumps. The arch has a free central gap.
    const stoneHitbox=this.add.rectangle(LOOP_MARKS[1].x,592,120,91,0x1b3741,0)
      .setDepth(10);
    this.physics.add.existing(stoneHitbox,true);
    this.blocks.push(stoneHitbox);
    this.upperBranch=this.ground(UPPER_BRANCH.x,UPPER_BRANCH.centerY,
      UPPER_BRANCH.width,UPPER_BRANCH.height,'wood');
    const ledgeBody=this.upperBranch.body as Phaser.Physics.Arcade.StaticBody;
    ledgeBody.checkCollision.down=false;
    ledgeBody.checkCollision.left=false;
    ledgeBody.checkCollision.right=false;
    ledgeBody.checkCollision.up=true;
    this.ground(3320,548,145,20,'wood');
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
        this.jumps=0;this.dashUntil=0;this.pendingJump=false;
        this.hud?.();
      }));
    }
    this.cameras.main.setBounds(0,0,LOOP_WIDTH,700);
    this.cameras.main.setZoom(this.scale.gameSize.width<900?1:1.13);
    this.cameras.main.startFollow(this.local,false,.09,.1);
    this.cameras.main.centerOn(1900,420);
    this.cameras.main.setDeadzone(80,90);
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
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
    this.off.push(this.net.on('snapshot',poses=>{
      for(const p of poses)if(p.seat!==this.net.localSeat)this.remote[p.seat]={...p};
    }));
    this.off.push(this.net.on('respawn',p=>{
      this.remote[p.seat]={...p};
      if(this.net.isSolo)this.solo?.reset(p);
      if(p.seat===this.net.localSeat){
        this.body.reset(p.x,p.y);this.body.setAllowGravity(true);
        this.jumps=0;this.dashUntil=0;this.pendingJump=false;
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.off.forEach(off=>off()));
  }
  private sync(w:LoopWorld):void{
    this.w={...w,marks:[...w.marks],tree:[...w.tree],final:[...w.final],supporting:[...w.supporting]};
    const walls=barriers(w);
    this.blockers.forEach((b,i)=>this.active(b,walls[i].enabled));
    this.active(this.finalBarrier,!w.exit);
    this.active(this.bridge,w.bridge);
    this.ropes.forEach((rope,i)=>rope.setVisible(!w.tree[i]));
    const tint=[0x0c3f46,0x082d3c,0x2c3f60][w.layout];
    this.shiftShade.setFillStyle(tint).setAlpha([.035,.13,.10][w.layout]);
    this.clearingTree.setTint([0xffffff,0xc9e0d7,0xb4dfff][w.layout]);
    this.movingRoots.forEach((root,i)=>{
      root.x=1430+i*105+[0,-34,43][w.layout];
      root.setAlpha([.28,.45,.4][w.layout]);
    });
    this.marks.forEach((mark,i)=>{
      // Static targets must never drift away from host collision coordinates.
      mark.setX(LOOP_MARKS[i].x);
      mark.setAlpha(w.marks[i]?.56:1);
    });
  }
  private action(seat:Seat):void{
    const x=this.local.x,y=this.local.y,w=this.w;
    if(seat===0){
      if(w.observed && !w.marks[0]&&Math.abs(x-LOOP_MARKS[0].x)<90)this.net.act({kind:'lever'});
      else if(allDone(w.marks)&&w.teoUpperReached&&!w.tree[0]
        &&hasBranchFooting({seat,x,y,vx:this.body.velocity.x,vy:this.body.velocity.y})
        &&Math.abs(x-LOOP_TREE[0].x)<=37)
        this.net.act({kind:'lever'});
      else if(w.bridge&&!w.final[0]&&Math.abs(x-LOOP_FINAL[0].x)<95)this.net.act({kind:'lever'});
    }else if(seat===2){
      this.net.act({kind:'switch'});
    }
    // Physical co-op: Lia mounts stationary Nino, then Téo mounts Lia.
    if((seat===0||seat===1)&&x>1930&&x<2230
      &&(seat!==0||!(allDone(w.marks)&&!w.tree[0]&&Math.abs(x-LOOP_TREE[0].x)<83&&Math.abs(y-LOOP_TREE[0].y)<86))){
      this.net.act({kind:w.supporting[seat]===null?'support':'detach'});
    }
  }
  private ability(seat:Seat,time:number):void{
    if(seat===1&&time>this.shots){
      this.shots=time+510;
      this.net.act({kind:'shoot',facing:this.facing});
      // Lightweight local projectile feedback; logic stays on host.
      const shot=this.add.circle(this.local.x+15,this.local.y-18,5,0xf0c184,.9).setDepth(25);
      this.tweens.add({targets:shot,x:shot.x+this.facing*260,alpha:0,
        duration:420,onComplete:()=>shot.destroy()});
    }else if(seat===2&&time>this.dashes){
      this.dashes=time+1900;this.dashUntil=time+760;
      this.net.act({kind:'dash',facing:this.facing});
    }
  }
  update(time:number,dt:number):void{
    if(!this.body||!this.net.playing||this.net.localSeat===null)return;
    const seat=this.net.localSeat,w=this.w,now=Date.now();
    const pause=blackoutActive(w,now)||w.deadUntil>0||!this.net.everyoneConnected;
    if(pause!==this.paused){
      this.paused=pause;
      if(pause){this.physics.pause();gameKeys.clear();this.touch.jump=false;this.touch.ability=false;this.touch.interact=false;}
      else this.physics.resume();
    }
    const fade=pause&&w.deadUntil===0?(w.blackoutUntil-now>1000?.94:.86):w.deadUntil>0?.89:0;
    this.blackout.setAlpha(fade);
    this.blackoutText.setVisible(pause);
    if(pause){
      this.blackoutText.setText(w.deadUntil>0?'NINGUÉM FICA PARA TRÁS\nREINICIANDO A AVENTURA...':
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
      if(this.cursors?.left.isDown||this.keys?.A?.isDown||this.touch.left)dir--;
      if(this.cursors?.right.isDown||this.keys?.D?.isDown||this.touch.right)dir++;
      if(dir)this.facing=dir>0?1:-1;
      const grounded=this.body.blocked.down||this.body.touching.down;
      if(grounded)this.jumps=0;
      const jumping=gameKeys.consumeJump()||this.touch.jump;
      const using=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||this.touch.interact);
      const special=gameKeys.consumeSkill(seat)||this.touch.ability;
      this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
      if(base===null){
        this.body.setVelocityX(dir*(seat===2&&time<this.dashUntil?329:235));
        if(jumping&&(grounded||(seat===0&&this.jumps<2))){
          this.body.setVelocityY(-465);this.jumps++;
        }
      }else{
        this.body.setVelocityX(0);
        if(jumping){this.pendingJump=true;this.net.act({kind:'detach'});}
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
    this.contextText.setText(hint).setVisible(Boolean(hint))
      .setPosition(this.local.x,this.local.y-87);
    const region=regionTitle(this.local.x);
    if(region!==this.regionShown){
      this.regionShown=region;this.regionUntil=time+2000;
      this.regionToast.setText(region);
    }
    this.regionToast.setVisible(time<this.regionUntil&&!pause);
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
