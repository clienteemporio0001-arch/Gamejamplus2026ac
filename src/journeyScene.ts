import Phaser from 'phaser';
import { gameKeys } from './keyboard';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { JOURNEY, JOURNEY_SPAWNS, MATERIALS, RIVER_WIDTH,
  journeyBranchPhase, type JourneyWorld, type JourneyMotion } from './riverJourney';
import type { TouchInput } from './game';
import { SkillVfx } from './skillVfx';
import { NightArt } from './visuals';
import { SoloBodies } from './soloBodies';

/** Fase 2: mundo contínuo, cooperação real, estruturas sólidas somente após montagem. */
export class JourneyScene extends Phaser.Scene {
  private net:Network;private touch:TouchInput;private hud?:()=>void;
  private world:JourneyWorld;
  private avatars:Phaser.GameObjects.Rectangle[]=[];
  private names:Phaser.GameObjects.Text[]=[];
  private eyes:Phaser.GameObjects.Rectangle[]=[];
  private remote:Pose[]=JOURNEY_SPAWNS.map(p=>({...p}));
  private avatar!:Phaser.GameObjects.Rectangle;
  private body!:Phaser.Physics.Arcade.Body;
  private blocks:Phaser.GameObjects.Rectangle[]=[];
  private bridge!:Phaser.GameObjects.Rectangle;
  private finalBridge!:Phaser.GameObjects.Rectangle;
  private finalWall!:Phaser.GameObjects.Rectangle;
  private temporary:Phaser.GameObjects.Rectangle[]=[];
  private moving:Phaser.GameObjects.Rectangle[]=[];
  private logsTarget:[number,number]=[3086,3224];
  private ropeVisual:Phaser.GameObjects.Rectangle[]=[];
  private finalVisual!:Phaser.GameObjects.Rectangle;
  private items:Phaser.GameObjects.Container[]=[];
  private labelHealth!:Phaser.GameObjects.Text;
  private labelGoal!:Phaser.GameObjects.Text;
  private labelZone!:Phaser.GameObjects.Text;
  private notice!:Phaser.GameObjects.Text;
  private noticeUntil=0;private lastZone=-1;
  private branch!:Phaser.GameObjects.Rectangle;
  private snake:Phaser.GameObjects.Container[]=[];
  private vfx=new SkillVfx(this,seat=>this.avatars[seat]);
  private art!:NightArt;
  private solo?:SoloBodies;
  private branchWarning!:Phaser.GameObjects.Ellipse;
  private subscriptions:Array<()=>void>=[];
  private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private jumps=0;private facing:-1|1=1;
  private dashUntil=0;private dashReady=0;private shotReady=0;
  private paused=false;private pendingJump=false;
  constructor(net:Network,touch:TouchInput,hud?:()=>void){
    super({key:'JourneyScene'});this.net=net;this.touch=touch;this.hud=hud;
    this.world={...net.journey};
  }
  private text(x:number,y:number,label:string,size=14,color='#f4ffe1'):Phaser.GameObjects.Text {
    return this.add.text(x,y,label,{
      fontFamily:'Arial,sans-serif',fontSize:size+'px',fontStyle:'bold',
      color,stroke:'#08242a',strokeThickness:4,align:'center',
      wordWrap:{width:610}
    }).setOrigin(.5).setDepth(21);
  }
  private platform(x:number,y:number,w:number,h:number,color=0x475f49):Phaser.GameObjects.Rectangle {
    const p=this.add.rectangle(x,y,w,h,color).setStrokeStyle(3,0x9db78a).setDepth(6);
    this.physics.add.existing(p,true);
    (p.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.blocks.push(p);
    const wood = [0x806040,0x87684c,0x9b8457,0x8e6d48,0x987652].includes(color);
    this.art.platform(p, h > 120 ? 'gate' : wood ? 'bridge' : h < 25 && w > 100 ? 'stone' : 'earth');
    return p;
  }
  private active(p:Phaser.GameObjects.Rectangle,on:boolean):void {
    p.setVisible(on);
    const body=p.body as Phaser.Physics.Arcade.StaticBody;
    body.enable=on;
    if(on)body.updateFromGameObject();
  }
  private sparkle(x:number,y:number,color=0xacf5bc):void{
    for(let i=0;i<10;i++){
      const a=i*6.283/10;
      const dot=this.add.circle(x,y,4,color,.9).setDepth(25);
      this.tweens.add({targets:dot,x:x+Math.cos(a)*43,y:y+Math.sin(a)*32,
        alpha:0,duration:320+i*31,onComplete:()=>dot.destroy()});
    }
  }
  private message(s:string,ms=2600):void {
    if(!this.notice?.active)return;
    this.notice.setText(s).setVisible(true);this.noticeUntil=this.time.now+ms;
  }
  private background():void {
    this.art=new NightArt(this,RIVER_WIDTH,'river');
    const regions=[
      [320,'A · MARGEM DO RIO'],[1190,'B · ÁRVORE DOS CIPÓS'],
      [2350,'C · PRIMEIRA TRAVESSIA'],[3070,'D · ILHA DAS RAÍZES'],
      [3770,'E · PONTE SUSPENSA'],[4190,'F · A OUTRA MARGEM']
    ] as const;
    for(const [x,title] of regions)this.text(x,234,title,19,'#d9e6d9');
    for(const [start,end] of [[2260,2700],[3000,3320],[3880,4060]])this.art.water(start,end,634);
    this.text(2470,500,'⚠ CORRENTEZA FATAL',15,'#ffc7a0');
    this.text(3120,501,'TRONCOS FLUTUANTES · CALCULE OS SALTOS',13,'#d0eddd');
    this.text(3970,496,'PONTE FINAL · OS TRÊS JUNTOS',15,'#e5cbb2');
    this.text(4180,482,'SAÍDA →',17);
  }
  create():void {
    this.physics.world.setBounds(0,0,RIVER_WIDTH,900);
    this.physics.world.setBoundsCollision(true,true,false,false);
    this.background();
    this.platform(1130,653,2260,62);
    this.platform(2840,653,320,62);
    this.platform(3600,653,560,62);
    this.platform(4180,653,240,62);
    this.platform(1170,432,124,18,0x597753);
    this.platform(1365,349,172,19,0x587550);
    this.platform(2102,534,133,18);
    this.platform(2160,460,130,18);
    this.platform(3700,545,142,18);
    this.platform(3820,468,120,18);
    this.bridge=this.platform(2480,649,440,45,0x806040);
    this.finalBridge=this.platform(3970,649,198,44,0x87684c);
    this.finalWall=this.platform(4090,503,24,237,0x4c8873);
    this.temporary=[
      this.platform(2378,611,104,18,0x9b8457),
      this.platform(2554,611,104,18,0x9b8457)
    ];
    this.moving=[
      this.platform(3086,615,120,17,0x8e6d48),
      this.platform(3224,615,115,17,0x8e6d48)
    ];
    for(let i=0;i<4;i++){
      const r=this.add.rectangle(2320+i*105,565,105,12,0xb0a16e,.5).setDepth(9);
      this.ropeVisual.push(r);
    }
    this.finalVisual=this.add.rectangle(3955,558,180,15,0x987652,.75).setDepth(9);
    this.items=MATERIALS.map((m,i)=>{
      const glow=this.add.circle(0,0,23,0x81e6a7,.16).setStrokeStyle(3,0x94f9ae);
      const rope=this.add.text(0,0,'❧',{fontSize:'29px',color:'#e3ffc2'}).setOrigin(.5);
      const group=this.add.container(m.x,m.y,[glow,rope]).setDepth(18);
      this.tweens.add({targets:group,y:m.y-12,duration:850+i*100,yoyo:true,repeat:-1});
      return group;
    });
    this.text(1380,271,'TÉO · SALTO DUPLO + APOIO',13);
    this.text(1580,511,'LIA · J · CIPÓ',13);
    this.text(2000,518,'NINO · SHIFT DASH · CIPÓ',13);
    this.add.circle(JOURNEY.anchor.x,JOURNEY.anchor.y,15,0xa0ffa5).setDepth(11);
    this.text(2155,379,'TÉO · E · FIXAR A PONTA',13);
    this.add.circle(JOURNEY.counterweight.x,JOURNEY.counterweight.y,15,0xffcf85).setDepth(11);
    this.text(2475,527,'LIA · J · CONTRAPESO',13);
    this.add.circle(JOURNEY.timer.x,JOURNEY.timer.y,17,0x86daff).setDepth(12);
    this.text(2260,534,'NINO · E · PASSAGEM TEMPORÁRIA',12);
    this.add.circle(JOURNEY.farFix.x,JOURNEY.farFix.y,16,0x87d6ef).setDepth(12);
    this.text(2740,530,'NINO · DASH + E · FIXAR',12);
    this.add.ellipse(JOURNEY.plate.x,624,82,15,0x7fffc0).setDepth(12);
    this.text(3575,521,'NINO · SEGURE A PLACA',13);
    this.add.circle(JOURNEY.finalTarget.x,JOURNEY.finalTarget.y,14,0xffc67d).setDepth(12);
    this.text(3790,521,'LIA · J · ALVO',13);
    this.add.circle(JOURNEY.finalLever.x,JOURNEY.finalLever.y,15,0xa8ffac).setDepth(12);
    this.text(3840,383,'TÉO · SALTO DUPLO + E',13);
    for(const x of [760,3450]){
      const snake=this.add.container(x,604).setDepth(14);
      snake.add([
        this.add.ellipse(0,7,54,17,0x4d934b),
        this.add.circle(20,0,10,0x8eb751),
        this.add.circle(25,-3,2,0xffeea2)
      ]);
      const ink=this.add.graphics();
      ink.lineStyle(3,0x142c27,.9);
      ink.lineBetween(-16,8,1,8);
      ink.fillStyle(0xf4c896,.95);ink.fillCircle(24,-4,2);
      ink.lineStyle(2,0xcf937c,1);ink.lineBetween(30,1,38,4);
      snake.add(ink);
      this.snake.push(snake);
      this.tweens.add({targets:snake,x:x+14,duration:840,yoyo:true,repeat:-1});
      this.text(x,549,'⚠ COBRA',12,'#ffddab');
    }
    this.branch=this.add.rectangle(3380,454,108,16,0x725a3d).setAngle(14).setDepth(13);
    this.branchWarning=this.add.ellipse(3380,624,154,18,0xf1ad76,.3).setDepth(11).setVisible(false);
    this.text(3380,416,'⚠ GALHOS INSTÁVEIS',13);
    for(const x of [1120,2120,2780,3430]){
      this.add.rectangle(x,583,13,60,0x7fe2b4,.7).setDepth(8);
      this.text(x,529,'CHECKPOINT',12,'#b3ffdd');
    }
    for(const seat of [0,1,2] as Seat[]){
      const p=this.net.poses[seat]||JOURNEY_SPAWNS[seat];
      const avatar=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color)
        .setStrokeStyle(3,0x12312b).setDepth(16);
      this.avatars[seat]=avatar;this.remote[seat]={...p};
      this.art.character(avatar,seat);
      this.names[seat]=this.text(p.x,p.y-43,CHARACTERS[seat].name,14,CHARACTERS[seat].hex);
      this.eyes[seat]=this.add.rectangle(p.x+4,p.y-7,9,5,0xf5ffe2).setDepth(17);
      if(seat===this.net.localSeat){
        this.avatar=avatar;
        this.physics.add.existing(avatar);
        this.body=avatar.body as Phaser.Physics.Arcade.Body;
        this.body.setGravityY(850).setMaxVelocity(405,950).setCollideWorldBounds(true);
        for(const b of this.blocks)this.physics.add.collider(avatar,b);
      }
    }
    if(this.net.isSolo){
      this.solo=new SoloBodies(this,this.net,this.avatars,this.blocks,405,950);
      this.solo.select(this.net.localSeat??0);
      this.subscriptions.push(this.net.on('solo-seat',seat=>{
        this.solo?.select(seat);this.avatar=this.avatars[seat];
        this.body=this.solo!.body(seat);
        this.jumps=0;this.pendingJump=false;this.dashUntil=0;
        this.hud?.();
      }));
    }
    if(this.avatar){
      const cam=this.cameras.main;
      cam.setBounds(0,0,RIVER_WIDTH,700);
      cam.setZoom(this.scale.gameSize.width<900?1:1.16);
      cam.startFollow(this.avatar,false,.085,.09);
      cam.setDeadzone(75,100);cam.setRoundPixels(true);
    }
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.labelHealth=this.text(12,46,'',14,'#ffe0ce').setScrollFactor(0).setOrigin(0,.5);
    this.labelGoal=this.text(12,76,'',13,'#daffc3').setScrollFactor(0).setOrigin(0,.5);
    this.labelZone=this.text(this.scale.gameSize.width/2,30,'',15).setScrollFactor(0);
    this.notice=this.text(this.scale.gameSize.width/2,113,'',16)
      .setScrollFactor(0).setWordWrapWidth(this.scale.gameSize.width-22);
    this.sync(this.net.journey,false);
    this.setMotion(this.net.journeyMotion);
    this.message('O RIO LEVOU A VELHA PONTE! Coletem 3 cipós e construam uma travessia juntos.',5600);
    this.subscriptions.push(this.net.on('journey',w=>this.sync(w)));
    this.subscriptions.push(this.net.on('journey-motion',m=>this.setMotion(m)));
    this.subscriptions.push(this.net.on('effect',fx=>this.vfx.play(fx)));
    this.subscriptions.push(this.net.on('snapshot',poses=>{
      for(const p of poses)if(p.seat!==this.net.localSeat)this.remote[p.seat]={...p};
    }));
    this.subscriptions.push(this.net.on('respawn',p=>{
      this.remote[p.seat]={...p};
      if(this.net.isSolo)this.solo?.reset(p);
      if(p.seat===this.net.localSeat&&this.body){
        this.avatar.setPosition(p.x,p.y);this.body.reset(p.x,p.y);
        this.body.setAllowGravity(true);this.jumps=0;this.pendingJump=false;this.dashUntil=0;
        this.message('A CORRENTEZA NOS PEGOU! Tentem novamente trabalhando juntos.',3000);
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.subscriptions.forEach(off=>off()));
  }
  private setMotion(m:JourneyMotion):void {
    this.logsTarget=[...m.logs] as [number,number];
  }
  private sync(w:JourneyWorld,announce=true):void {
    const before=this.world;
    this.world={
      ...w,
      materials:[...w.materials] as JourneyWorld['materials'],
      supporting:[...w.supporting] as JourneyWorld['supporting'],
      health:[...w.health] as JourneyWorld['health'],
      safeUntil:[...w.safeUntil] as JourneyWorld['safeUntil']
    };
    this.items.forEach((p,i)=>p.setVisible(!w.materials[i]));
    this.active(this.bridge,w.bridgeReady);
    this.active(this.finalBridge,w.finalReady);
    this.active(this.finalWall,!w.finalReady);
    this.temporary.forEach(p=>this.active(p,w.tempUntil>Date.now()&&!w.bridgeReady));
    if(!this.notice?.active){this.refresh();return;}
    if(announce){
      if(w.resetId!==before.resetId)this.message('UM AMIGO CAIU NA FLORESTA! Três corações restaurados.',3300);
      if(w.restartAt>0&&before.restartAt===0)this.message('UM AMIGO CAIU NA FLORESTA! REINÍCIO EM 3 SEGUNDOS.',4000);
      w.materials.forEach((ok,i)=>{if(ok&&!before.materials[i]){
        this.sparkle(MATERIALS[i].x,MATERIALS[i].y);
        this.message('MATERIAIS DA PONTE: '+w.materials.filter(Boolean).length+'/3',2600);
      }});
      if(!before.stackMilestone&&w.stackMilestone)this.message('ESCALADA COOPERATIVA! Téo, alcance os cipós superiores.');
      if(!before.anchor&&w.anchor)this.message('TÉO FIXOU A PRIMEIRA PONTA!');
      if(!before.counterweight&&w.counterweight)this.message('LIA SOLTOU O CONTRAPESO! NINO, CRUZE A PASSAGEM!');
      if(!before.tempUntil&&w.tempUntil>Date.now())this.message('PASSAGEM TEMPORÁRIA ABERTA! NINO, DASH E DEPOIS E!',2900);
      if(!before.farFix&&w.farFix)this.message('SEGUNDA PONTA FIXADA. A PONTE ESTÁ SENDO CONSTRUÍDA!',3500);
      if(!before.bridgeReady&&w.bridgeReady){this.sparkle(2480,622);this.message('PONTE DE CIPÓS CONSTRUÍDA! A PASSAGEM É SÓLIDA.',3800);}
      if(!before.finalFallAt&&w.finalFallAt)this.message('A ÚLTIMA PONTE ESTÁ DESCENDO! AGUARDEM...',3400);
      if(!before.finalReady&&w.finalReady){this.sparkle(3950,622);this.message('TRAVESSIA LIBERADA! REÚNAM OS TRÊS NA OUTRA MARGEM.',4000);}
      if(w.checkpoint!==before.checkpoint)this.message('Checkpoint compartilhado!');
    }
    this.refresh();
  }
  private refresh():void {
    if(!this.labelHealth)return;
    const w=this.world;
    this.labelHealth.setText(w.health.map((h,i)=>CHARACTERS[i].name+': '+'♥'.repeat(h)+'♡'.repeat(3-h)).join('   '));
    this.labelGoal.setText('MATERIAIS DA PONTE: '+w.materials.filter(Boolean).length+'/3 · '+(
      w.bridgeReady?'PONTE 1 ✓':w.bridgeFallAt?'MONTANDO...':w.anchor&&w.counterweight?'NINO: DASH + E':w.anchor?'LIA: CONTRAPESO':'TÉO: ÂNCORA'
    )+(w.finalReady?' · PONTE FINAL ✓':''));
    this.hud?.();
  }
  private interact(seat:Seat):void {
    const x=this.avatar.x,w=this.world;
    if(x>960&&x<1460&&seat!==2){
      this.net.act({kind:w.supporting[seat]===null?'support':'detach'});return;
    }
    if(seat===0&&(x>1970&&x<2280||x>3660&&x<3930)){this.net.act({kind:'lever'});return;}
    if(seat===2){
      if(x>2170&&x<2350&&!w.farFix){this.net.act({kind:'timer'});return;}
      if(x>2640&&x<2795){this.net.act({kind:'switch'});return;}
    }
  }
  private ability(seat:Seat,now:number):void {
    if(!this.net.puzzle.unlocked[seat])return;
    if(seat===1&&now>=this.shotReady){
      this.shotReady=now+520;
      this.vfx.play({kind:'shoot',seat,level:2,x:this.avatar.x,y:this.avatar.y,facing:this.facing});
      this.net.act({kind:'shoot',facing:this.facing});
      this.hud?.();
    }else if(seat===2&&now>=this.dashReady){
      this.dashReady=now+2000;this.dashUntil=now+800;
      this.vfx.play({kind:'dash',seat,level:2,x:this.avatar.x,y:this.avatar.y,facing:this.facing});
      this.net.act({kind:'dash',facing:this.facing});this.hud?.();
    }
  }
  update(time:number,dt:number):void {
    if(!this.body||!this.avatar||this.net.localSeat===null)return;
    const seat=this.net.localSeat,now=Date.now(),w=this.world;
    const pause=!this.net.playing||!this.net.everyoneConnected||w.restartAt>0;
    if(pause!==this.paused){this.paused=pause;if(pause)this.physics.pause();else this.physics.resume();}
    this.solo?.beforeFrame(w.supporting);
    const support=w.supporting[seat];
    if(support!==null){
      const p=this.remote[support]??this.net.poses[support];
      this.body.setAllowGravity(false);
      this.body.reset(p.x,p.y-44);this.body.setVelocity(0,0);
    }else if(!this.body.allowGravity){
      this.body.setAllowGravity(true);
      if(this.pendingJump){this.body.setVelocityY(-465);this.jumps=1;this.pendingJump=false;}
    }
    if(!pause){
      let dir=0;
      if(this.cursors?.left.isDown||this.keys?.A?.isDown||this.touch.left)dir--;
      if(this.cursors?.right.isDown||this.keys?.D?.isDown||this.touch.right)dir++;
      if(dir!==0)this.facing=dir>0?1:-1;
      const grounded=this.body.blocked.down||this.body.touching.down;
      if(grounded)this.jumps=0;
      const jump=Boolean(gameKeys.consumeJump()||this.touch.jump);
      const use=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||this.touch.interact);
      const special=Boolean(gameKeys.consumeSkill(seat)||this.touch.ability);
      this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
      if(support===null){
        this.body.setVelocityX(dir*(seat===2&&performance.now()<this.dashUntil?329:235));
        if(jump&&(grounded||(seat===0&&this.net.puzzle.unlocked[0]&&this.jumps<2))){
          this.body.setVelocityY(-465);this.jumps++;
          if(this.jumps===2)this.sparkle(this.avatar.x,this.avatar.y,0x8affab);
        }
      }else{
        this.body.setVelocityX(0);
        if(jump){this.pendingJump=true;this.net.act({kind:'detach'});}
      }
      if(use)this.interact(seat);
      if(special)this.ability(seat,performance.now());
      if(seat===0&&!w.materials[0]&&this.avatar.x>1360&&this.avatar.x<1485)
        this.net.act({kind:'collect'});
      if(seat===2&&!w.materials[2]&&this.avatar.x>1940&&this.avatar.x<2070)
        this.net.act({kind:'collect'});
      if(support===null)this.net.report(this.avatar.x,this.avatar.y,this.body.velocity.x,this.body.velocity.y);
    }
    this.temporary.forEach(p=>this.active(p,w.tempUntil>now&&!w.bridgeReady));
    const lerp=1-Math.exp(-Math.min(dt,80)/110);
    this.moving.forEach((log,i)=>{
      const next=Phaser.Math.Linear(log.x,this.logsTarget[i],lerp);
      if(Math.abs(next-log.x)>.1){
        log.x=next;(log.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
    const branchPhase=journeyBranchPhase(w.hazardEpoch,now);
    this.branchWarning.setVisible(branchPhase!=='safe').setAlpha(
      branchPhase==='fall'?.82:.28+Math.abs(Math.sin(time/175))*.52);
    this.branch.y=branchPhase==='fall'?586:
      branchPhase==='warn'?481:454;
    this.branch.setFillStyle(branchPhase==='fall'?0xf0a174:0x73543e);
    const build=w.bridgeFallAt>0?Math.min(1,(now-w.bridgeFallAt)/2100):0;
    this.ropeVisual.forEach((plank,i)=>{
      plank.setVisible(w.bridgeFallAt>0&&!w.bridgeReady);
      if(w.bridgeFallAt>0&&!w.bridgeReady)
        plank.setPosition(2300+i*112,530+(100*build)).setAngle(-40*(1-build));
    });
    const finale=w.finalFallAt>0?Math.min(1,(now-w.finalFallAt)/1800):0;
    this.finalVisual.setVisible(w.finalFallAt>0&&!w.finalReady);
    if(w.finalFallAt>0&&!w.finalReady)this.finalVisual.setPosition(3960,540+103*finale).setAngle(-55*(1-finale));
    const region=this.avatar.x<750?0:this.avatar.x<1750?1:this.avatar.x<2750?2:
      this.avatar.x<3300?3:this.avatar.x<4070?4:5;
    if(region!==this.lastZone){
      this.lastZone=region;
      this.labelZone.setText(['A · MARGEM DO RIO','B · ÁRVORE DOS CIPÓS',
        'C · PRIMEIRA TRAVESSIA','D · ILHA DAS RAÍZES',
        'E · PONTE SUSPENSA','F · A OUTRA MARGEM'][region]);
    }
    if(this.noticeUntil&&time>this.noticeUntil&&this.notice.visible)this.notice.setVisible(false);
    for(const i of [0,1,2] as Seat[]){
      const actor=this.avatars[i],p=this.remote[i];
      if(i!==seat&&!this.net.isSolo){
        actor.x=Phaser.Math.Linear(actor.x,p.x,lerp);
        actor.y=Phaser.Math.Linear(actor.y,p.y,lerp);
      }
      this.names[i]?.setPosition(actor.x,actor.y-44);
      this.eyes[i]?.setPosition(actor.x+4,actor.y-8);
      actor.alpha=now<w.safeUntil[i]&&Math.floor(now/100)%2===0?.35:1;
    }
    this.solo?.report();
    this.art.update(time);
    this.vfx.update(time);
  }
  getCooldown():string {
    const seat=this.net.localSeat;if(seat===null)return '';
    if(seat===0)return '✦ Salto duplo: PULAR novamente no ar';
    const left=(seat===1?this.shotReady:this.dashReady)-performance.now();
    return (seat===1?'🏹 Estilingue ':'⚡ Dash ')+(left>0?(left/1000).toFixed(1)+'s':(seat===1?'J disponível':'SHIFT disponível'));
  }
}
