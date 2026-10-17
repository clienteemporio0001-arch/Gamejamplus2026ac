import Phaser from 'phaser';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { LOOP_WIDTH, LOOP_MARKS, LOOP_TREE, LOOP_FINAL, ROUTES, barriers,
  allDone, windGuide, blackoutActive, warningActive, type LoopWorld, LOOP_START } from './forestLoop';
import { NightArt } from './visuals';
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
  private links:Phaser.GameObjects.Text[]=[];
  private gusts:Phaser.GameObjects.Ellipse[]=[];
  private local!:Phaser.GameObjects.Rectangle;private body!:Phaser.Physics.Arcade.Body;
  private solo?:SoloBodies;
  private remote:Pose[]=LOOP_START.map(p=>({...p}));
  private off:Array<()=>void>=[];
  private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private prompt!:Phaser.GameObjects.Text;private info!:Phaser.GameObjects.Text;
  private wind!:Phaser.GameObjects.Text;private cycle!:Phaser.GameObjects.Text;
  private blackout!:Phaser.GameObjects.Rectangle;private blackoutText!:Phaser.GameObjects.Text;
  private life!:Phaser.GameObjects.Text;
  private shots=0;private dashes=0;private dashUntil=0;private facing:-1|1=1;
  private jumps=0;private paused=false;private previousReset=0;
  private hint='';
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
  private setMessage(message:string):void {
    if(message===this.hint)return;this.hint=message;this.info.setText(message);
  }
  private background():void{
    this.art=new NightArt(this,LOOP_WIDTH,'forest');
    this.art.water(2265,2625,637);
    this.label(410,245,'A · A ENTRADA',23);
    this.label(1310,235,'B · A TRILHA REPETIDA',21);
    this.label(2375,235,'C · O ABISMO',21);
    this.label(3430,230,'D · A SAÍDA REAL',21);
    this.label(710,366,'A FLORESTA MENTE\nMAS O VENTO NÃO.',20,'#c6ead0');
    this.label(2600,526,'CORRENTEZA FATAL · CUIDADO AO SALTAR',14,'#ffd5a5');
    // Three distinguishable memory landmarks. Their positions shift cosmetically with layout.
    const names=['ÁRVORE OCA','PEDRA RACHADA','TRONCO EM ARCO'] as const;
    for(let i=0;i<3;i++){
      const pos=LOOP_MARKS[i];const obj=this.add.container(pos.x,pos.y-85).setDepth(12);
      const g=this.add.graphics();
      if(i===0){
        g.fillStyle(0x4a4335,1);g.fillRoundedRect(-28,-49,56,98,14);
        g.fillStyle(0x091d1b,1);g.fillEllipse(0,14,27,43);
        g.lineStyle(5,0x8d825c,.65);g.strokeEllipse(0,7,40,73);
        g.fillStyle(0x2d5942,1);g.fillEllipse(0,-44,98,55);
      }else if(i===1){
        g.fillStyle(0x687873,.96);g.fillTriangle(-44,45,-17,-43,43,28);
        g.lineStyle(4,0x172a2d,1);g.lineBetween(-15,-16,8,4);g.lineBetween(8,4,-1,34);
        g.lineStyle(2,0xa9beb1,.72);g.lineBetween(-25,20,-4,-20);
      }else{
        g.lineStyle(18,0x503b2e,1);g.beginPath();
        g.moveTo(-53,47);g.lineTo(-48,-7);g.lineTo(-15,-29);g.lineTo(27,-30);g.lineTo(51,-4);g.lineTo(56,47);g.strokePath();
        g.lineStyle(4,0x8b6745,.55);g.lineBetween(-38,-13,0,-26);
      }
      obj.add(g);this.marks.push(obj);
      this.label(pos.x,pos.y-163,names[i],15,'#e3e9b7');
    }
    const pad=(x:number,y:number,color:number,text:string)=>{
      this.add.circle(x,y,16,color,.81).setStrokeStyle(3,0xeafaf0,.77).setDepth(13);
      this.label(x,y-76,text,13);
    };
    pad(LOOP_MARKS[0].x,LOOP_MARKS[0].y,0x8eda9e,'TÉO · E · ÁRVORE OCA');
    pad(LOOP_MARKS[1].x,LOOP_MARKS[1].y,0xf7b074,'LIA · J · PEDRA RACHADA');
    pad(LOOP_MARKS[2].x,LOOP_MARKS[2].y,0x8ec9f4,'NINO · SHIFT + E');
    pad(LOOP_TREE[0].x,LOOP_TREE[0].y,0x8eda9e,'TÉO · E · PRIMEIRA AMARRA');
    pad(LOOP_TREE[1].x,LOOP_TREE[1].y,0xf7b074,'LIA · J · SEGUNDA AMARRA');
    pad(LOOP_TREE[2].x,LOOP_TREE[2].y,0x8ec9f4,'NINO · SHIFT + E · RAIZ');
    pad(LOOP_FINAL[0].x,LOOP_FINAL[0].y,0x8eda9e,'TÉO · E · SAÍDA');
    pad(LOOP_FINAL[1].x,LOOP_FINAL[1].y,0xf7b074,'LIA · J · AMARRA');
    pad(LOOP_FINAL[2].x,LOOP_FINAL[2].y,0x8ec9f4,'NINO · SHIFT + E');
    this.label(3705,485,'A SAÍDA VERDADEIRA',20,'#eaf5cb');
    this.add.rectangle(1340,625,85,7,0x7cbed4,.8).setDepth(11);
    this.label(1350,545,'NINO · SHIFT AQUI',12,'#bee2ff');
    this.add.rectangle(2045,625,85,7,0x7cbed4,.8).setDepth(11);
    this.label(2045,549,'NINO · INICIE O DASH',12,'#bee2ff');
    this.add.rectangle(3400,625,85,7,0x7cbed4,.8).setDepth(11);
    this.label(3400,547,'NINO · SHIFT AQUI',12,'#bee2ff');
    const hollow=this.label(1540,490,'PASSAGEM DA ÁRVORE OCA\nREÚNAM OS TRÊS',15,'#c9edb6');
    const stone=this.label(1700,487,'PASSAGEM DA PEDRA RACHADA\nREÚNAM OS TRÊS',15,'#ebd9b6');
    this.links=[hollow,stone];
    this.label(3090,484,'TRILHA ENGANOSA\nO VENTO REVELA QUANDO PASSAR',14,'#e8c6a7');
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
    this.ground(1060,526,139,20,'wood');
    this.ground(2108,550,141,20,'wood');
    this.ground(3320,548,145,20,'wood');
    this.bridge=this.ground(2445,659,360,36,'wood');
    // Only the host's loop snapshot determines physical blockers.
    this.blockers=[this.ground(840,364,38,540,'stone'),
      this.ground(1650,364,38,540,'wood'),
      this.ground(520,364,38,540,'stone'),
      this.ground(1790,357,44,560,'stone')];
    this.finalBarrier=this.ground(3710,355,40,565,'wood');
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
        this.jumps=0;this.dashUntil=0;
        this.hud?.();
      }));
    }
    this.cameras.main.setBounds(0,0,LOOP_WIDTH,700);
    this.cameras.main.setZoom(this.scale.gameSize.width<900?1:1.13);
    this.cameras.main.startFollow(this.local,false,.09,.1);
    this.cameras.main.setDeadzone(80,90);
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.wind=this.label(12,88,'',14,'#c6ead8').setScrollFactor(0).setOrigin(0,.5);
    this.cycle=this.label(12,53,'',15,'#e6d6a7').setScrollFactor(0).setOrigin(0,.5);
    this.info=this.label(this.scale.gameSize.width/2,150,'',14,'#d7f4cf').setScrollFactor(0);
    this.info.setWordWrapWidth(this.scale.gameSize.width-30);
    this.prompt=this.label(this.scale.gameSize.width/2,200,'',14,'#f0e9b9').setScrollFactor(0);
    this.life=this.label(this.scale.gameSize.width-16,56,'3 AMIGOS · UMA SAÍDA',13).setScrollFactor(0).setOrigin(1,.5);
    this.blackout=this.add.rectangle(this.scale.gameSize.width/2,350,this.scale.gameSize.width+200,800,0x02080e,1)
      .setDepth(190).setScrollFactor(0).setAlpha(0);
    // Wind is readable through moving leaves, and its sign comes exclusively from windGuide().
    for(let i=0;i<11;i++){
      const leaf=this.add.ellipse(200+i*24,370+i%3*24,11,3,i%2?0x9ab994:0xc4d5b0,.55).setDepth(22);
      this.gusts.push(leaf);
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
        this.jumps=0;this.dashUntil=0;
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.off.forEach(off=>off()));
  }
  private sync(w:LoopWorld):void{
    this.w={...w,marks:[...w.marks],tree:[...w.tree],final:[...w.final]};
    const walls=barriers(w);
    this.blockers.forEach((b,i)=>this.active(b,walls[i].enabled));
    this.active(this.finalBarrier,!w.exit);
    this.active(this.bridge,w.bridge);
    this.ropes.forEach((rope,i)=>rope.setVisible(!w.tree[i]));
    this.marks.forEach((mark,i)=>{
      const shift=w.layout===0?0:w.layout===1?[14,-22,17][i]:[-17,18,-10][i];
      mark.setX(LOOP_MARKS[i].x+shift);
      mark.setAlpha(w.marks[i]?.42:1);
    });
  }
  private action(seat:Seat):void{
    const x=this.local.x,y=this.local.y,w=this.w;
    if(seat===0){
      if(w.observed && !w.marks[0]&&Math.abs(x-1080)<90)this.net.act({kind:'lever'});
      else if(allDone(w.marks)&&!w.tree[0]&&Math.abs(x-2130)<95&&Math.abs(y-514)<100)
        this.net.act({kind:'lever'});
      else if(w.bridge&&!w.final[0]&&Math.abs(x-3320)<95)this.net.act({kind:'lever'});
    }else if(seat===2){
      this.net.act({kind:'switch'});
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
      this.solo?.beforeFrame();
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
      this.body.setVelocityX(dir*(seat===2&&time<this.dashUntil?329:235));
      if(jumping&&(grounded||(seat===0&&this.jumps<2))){
        this.body.setVelocityY(-465);this.jumps++;
      }
      if(using)this.action(seat);
      if(special)this.ability(seat,time);
      this.net.report(this.local.x,this.local.y,this.body.velocity.x,this.body.velocity.y);
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
    const elapsed=Math.max(0,now-w.cycleStart);
    const seconds=Math.max(0,Math.ceil((60000-elapsed)/1000));
    this.cycle.setText('FLORESTA '+['A · ORIGINAL','B · REORGANIZADA','C · INVERTIDA'][w.layout]
      +'  |  PRÓXIMA MUDANÇA: '+seconds+'s'
      +'  |  CICLOS '+w.cycle);
    const wind=windGuide(w,seat,this.local.x);
    this.wind.setText('VENTO '+(wind.direction<0?'◀◀':wind.direction>0?'▶▶':'≈≈')
      +'  '+wind.hint);
    if(warningActive(w,now))this.setMessage('O VENTO AUMENTA. A FLORESTA VAI MUDAR EM BREVE...');
    else if(!w.observed)this.setMessage('OBSERVEM OS TRÊS MARCOS. MEMORIZEM ANTES DO PRIMEIRO APAGÃO.');
    else if(w.lastRoute==='wrong'&&now-w.routeAt<5800)
      this.setMessage('ESPERA... A GENTE JÁ PASSOU AQUI! O VENTO AVISOU.');
    else if(!allDone(w.marks))this.setMessage('MARCOS: '+w.marks.filter(Boolean).length+'/3 • '+wind.hint);
    else if(!w.bridge)this.setMessage('AMARRAS DA ÁRVORE: '+w.tree.filter(Boolean).length+'/3 • TÉO E, LIA J, NINO SHIFT + E.');
    else if(!w.exit)this.setMessage('SAÍDA: '+w.final.filter(Boolean).length+'/3 • '+wind.hint);
    else this.setMessage('A SAÍDA VERDADEIRA ESTÁ LIVRE. ATRAVESSEM TODOS JUNTOS.');
    this.prompt.setText(w.observed?'MEMÓRIA '+w.marks.filter(Boolean).length+'/3  •  ÁRVORE '+
      w.tree.filter(Boolean).length+'/3  •  SAÍDA '+w.final.filter(Boolean).length+'/3':'MEMORIZEM: OCA · PEDRA · ARCO');
    const fallProgress=w.treeFallAt>0?Math.min(1,(now-w.treeFallAt)/1900):0;
    const easing=fallProgress*fallProgress*(3-2*fallProgress);
    this.tree.setRotation(-1.16*(1-easing));
    const gust=wind.direction;
    this.gusts.forEach((leaf,i)=>{
      const displacement=(((time/15+i*69)*gust)%520+520)%520;
      leaf.x=this.local.x-240+displacement;
      leaf.y=375+(i%4)*55+Math.sin(time/700+i)*13;
      leaf.rotation=gust<0?Math.PI-.2:.2;
      leaf.alpha=gust===0?.23:.42+(i%3)*.1;
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
