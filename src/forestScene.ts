import Phaser from 'phaser';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import { FOREST_WIDTH, FOREST_SPAWNS, FOREST_VINES, CABO_X, TREE_ACTIONS,
  forestDanger, branchWarning, forestHint, FOREST_GATES, type ForestWorld } from './forest';
import type { TouchInput } from './game';
import { SkillVfx } from './skillVfx';

const story=[
  '',
  'CABOQUIM: "Ocês se perderam na mata, foi?"',
  'TÉO: "A gente só quer voltar pra casa!"',
  'CABOQUIM: "Essa floresta num mostra o mesmo caminho duas vezes..."',
  'CABOQUIM: "Mas se ficarem juntos, talvez consigam encontrar a saída."',
  '✦ TÉO RECEBEU O SALTO DUPLO! Pule novamente durante um salto.'
];
export class ForestScene extends Phaser.Scene {
  private net:Network;private touch:TouchInput;private hud?:()=>void;
  private world:ForestWorld;
  private players:Phaser.GameObjects.Rectangle[]=[];
  private names:Phaser.GameObjects.Text[]=[];
  private eyes:Phaser.GameObjects.Rectangle[]=[];
  private poses:Pose[]=FOREST_SPAWNS.map(p=>({...p}));
  private me!:Phaser.GameObjects.Rectangle;private body!:Phaser.Physics.Arcade.Body;
  private blocks:Phaser.GameObjects.Rectangle[]=[];
  private fallen!:Phaser.GameObjects.Rectangle;
  private caboGate!:Phaser.GameObjects.Rectangle;
  private vinesGate!:Phaser.GameObjects.Rectangle;
  private caboGateNote!:Phaser.GameObjects.Text;
  private vinesGateNote!:Phaser.GameObjects.Text;
  private hintLabel!:Phaser.GameObjects.Text;
  private treeTrunk!:Phaser.GameObjects.Rectangle;
  private cabo!:Phaser.GameObjects.Container;
  private vines:Phaser.GameObjects.Container[]=[];
  private heartLabel!:Phaser.GameObjects.Text;
  private goalLabel!:Phaser.GameObjects.Text;
  private textLabel!:Phaser.GameObjects.Text;
  private zoneLabel!:Phaser.GameObjects.Text;
  private branches:Phaser.GameObjects.Rectangle[]=[];
  private snake:Phaser.GameObjects.Container[]=[];
  private vfx=new SkillVfx(this,seat=>this.players[seat]);
  private off:Array<()=>void>=[];
  private arrows?:Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private jumps=0;private facing:-1|1=1;private dashUntil=0;
  private dashReady=0;private shotReady=0;private pendingJump=false;
  private paused=false;private oldBridge=false;private oldFallAt=0;private oldReset=0;
  private narrativeUntil=0;
  private lastRegion=-1;
  constructor(net:Network,touch:TouchInput,hud?:()=>void) {
    super({key:'ForestScene'});this.net=net;this.touch=touch;this.hud=hud;
    this.world={...net.forest};
  }
  private label(x:number,y:number,word:string,size=14,color='#edffd3'):Phaser.GameObjects.Text {
    return this.add.text(x,y,word,{fontFamily:'Arial',fontSize:size+'px',color,
      fontStyle:'bold',stroke:'#0b2825',strokeThickness:4,align:'center',
      wordWrap:{width:610}}).setOrigin(.5).setDepth(20);
  }
  private ground(x:number,y:number,width:number,height:number,color=0x405d46):Phaser.GameObjects.Rectangle {
    const r=this.add.rectangle(x,y,width,height,color).setStrokeStyle(3,0x99af8a).setDepth(6);
    this.physics.add.existing(r,true);
    (r.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.blocks.push(r);return r;
  }
  private solid(r:Phaser.GameObjects.Rectangle,active:boolean):void {
    r.visible=active;const b=r.body as Phaser.Physics.Arcade.StaticBody;
    b.enable=active;if(active)b.updateFromGameObject();
  }
  private burst(x:number,y:number,color=0x9dffa0):void {
    for(let i=0;i<13;i++){
      const a=i*Math.PI*2/13,particle=this.add.circle(x,y,3+i%3,color,.9).setDepth(27);
      this.tweens.add({targets:particle,x:x+Math.cos(a)*38,y:y+Math.sin(a)*35,
        alpha:0,duration:400+i*20,onComplete:()=>particle.destroy()});
    }
  }
  private notify(message:string,duration=2800):void {
    if(!this.textLabel?.active)return;
    this.textLabel.setText(message).setVisible(true);
    this.narrativeUntil=this.time.now+duration;
  }
  private setHud():void {
    if(!this.heartLabel)return;
    const w=this.world;
    this.heartLabel.setText(w.health.map((n,i)=>CHARACTERS[i].name+': '+'♥'.repeat(n)+'♡'.repeat(3-n)).join('   '));
    this.goalLabel.setText('CIPÓS '+w.vines.filter(Boolean).length+'/3  •  ÁRVORE '+w.treeSteps.filter(Boolean).length+'/3' +
      (w.bridge?'  •  PONTE PRONTA!':''));
    this.hud?.();
  }
  private paint():void {
    const g=this.add.graphics().setDepth(-35);
    g.fillGradientStyle(0x0a1d30,0x172b32,0x204c3d,0x14372d);
    g.fillRect(0,0,FOREST_WIDTH,700);
    for(let x=0;x<FOREST_WIDTH;x+=1250)
      this.add.circle(x+850,90,54,0xdaf0bb,.55).setDepth(-33);
    for(let d=0;d<4;d++){
      const col=[0x102832,0x173b36,0x1b463a,0x27523b][d];
      for(let i=0;i<65;i++){
        const x=i*69+d*24-60,height=210+(i*43+d*85)%182;
        this.add.rectangle(x,618-height/2,23+d*2,height,col).setDepth(-29+d*4);
        this.add.ellipse(x,613-height,98+d*12,95+d*7,col).setDepth(-28+d*4);
      }
    }
    for(let x=0;x<FOREST_WIDTH;x+=96){
      this.add.ellipse(x+18,624,93,42,0x30683e,.75).setDepth(3);
      if(x%3===0)this.add.circle(x,440+(x%90),3,0xdcfda3,.75).setDepth(4);
    }
    const zones=[
      [330,'A · ENTRADA DA FLORESTA'],[835,'B · CABOQUIM DA MATA'],
      [1540,'C · A ÁRVORE GIGANTE'],[2400,'D · OS CIPÓS SUSPENSOS'],
      [3450,'E · O GRANDE ABISMO'],[4100,'F · A SAÍDA COOPERATIVA']
    ] as const;
    for(const [x,title] of zones) this.label(x,210,title,21);
    this.add.rectangle(3720,673,374,70,0x163b61,.9).setDepth(-2);
    for(let x=3545;x<3890;x+=45){
      const wave=this.add.rectangle(x,685+(x%3)*3,36,5,0x6acbd0,.25).setDepth(-1);
      this.tweens.add({targets:wave,alpha:.65,x:wave.x+8,duration:900+x%350,
        yoyo:true,repeat:-1});
    }
    this.label(3700,495,'ABISMO · PRECISAMOS DERRUBAR A ÁRVORE',17,'#fce7a9');
    this.label(4190,515,'CASA  ◀  REÚNAM OS TRÊS',17);
  }
  create():void {
    this.physics.world.setBounds(0,0,FOREST_WIDTH,900);
    this.physics.world.setBoundsCollision(true,true,false,false);
    this.paint();
    // Terreno contínuo, exceto o abismo que requer ponte com colisão REAL.
    this.ground(1765,653,3530,64);
    this.ground(4086,653,428,64);
    // Paredes físicas bem sinalizadas: os personagens não podem simplesmente
    // ignorar Caboquim e os 3 cipós, alcançando o abismo sem meios de vencer.
    this.caboGate=this.ground(FOREST_GATES.cabo,300,44,690,0x35674b);
    this.vinesGate=this.ground(FOREST_GATES.vines,300,44,690,0x54764a);
    this.solid(this.caboGate,!this.world.unlocked);
    this.solid(this.vinesGate,!this.world.vines.every(Boolean));
    this.caboGateNote=this.label(FOREST_GATES.cabo-12,290,'OS 3 AMIGOS\nDEVEM FALAR COM CABOQUIM',12,'#fbeab8');
    this.vinesGateNote=this.label(FOREST_GATES.vines-35,265,'PRECISA DOS\n3 CIPÓS',12,'#fbeab8');
    this.ground(1190,570,145,19,0x4d7654);
    this.ground(1460,424,148,18,0x607d58); // degrau alcançável após empilhar 3 amigos
    this.ground(1540,309,220,18,0x566e4c); // altura inacessível sem a coluna de amigos
    this.ground(1760,309,255,18,0x536e4c);
    this.ground(2090,551,140,18,0x4d7158);
    this.ground(2940,545,143,18,0x4e6d51);
    this.ground(3298,428,141,18,0x536a4a);
    this.ground(3415,521,120,18,0x47674b);
    this.fallen=this.ground(3709,645,362,34,0x825737);
    this.solid(this.fallen,this.world.bridge);
    this.treeTrunk=this.add.rectangle(3508,470,363,28,0x966b45)
      .setAngle(-69).setStrokeStyle(3,0x443524).setDepth(14);
    this.treeTrunk.setVisible(false);
    // Caboquim criado com formas procedurais originais.
    const hat=this.add.triangle(0,-64,-38,16,4,-39,35,16,0x3baa5c);
    const face=this.add.circle(0,-27,19,0xa37348);
    const robe=this.add.ellipse(0,2,47,57,0x337e47);
    const faceEye=this.add.circle(7,-29,3,0xf9eecb);
    this.cabo=this.add.container(CABO_X,598,[robe,face,hat,faceEye]).setDepth(15);
    this.tweens.add({targets:this.cabo,y:590,duration:980,yoyo:true,repeat:-1});
    this.label(CABO_X,490,'CABOQUIM DA MATA',15,'#c2f7ac');
    this.vines=FOREST_VINES.map((v,i)=>{
      const ring=this.add.circle(0,0,24,CHARACTERS[i].color,.20).setStrokeStyle(3,CHARACTERS[i].color);
      const glyph=this.add.text(0,0,'❧',{fontSize:'31px',color:CHARACTERS[i].hex}).setOrigin(.5);
      const container=this.add.container(v.x,v.y,[ring,glyph]).setDepth(16);
      this.tweens.add({targets:container,y:v.y-11,duration:850+i*160,
        repeat:-1,yoyo:true,ease:'Sine.easeInOut'});
      return container;
    });
    this.label(1790,225,'TÉO · CIPÓ ALTO',14);
    this.label(2570,490,'LIA · Q · AMARRA',14);
    this.label(3060,492,'NINO · DASH PELO CIPÓ',14);
    // Ponto de partida necessário para realizar a corrida com Nino.
    this.add.rectangle(2898,622,82,10,0x4bbef7,.78).setDepth(9);
    this.label(2898,519,'NINO: INICIE Q + → AQUI',13,'#a4e9ff');
    this.label(3310,321,'TÉO · E · SOLTE A CORDA',14);
    this.add.circle(TREE_ACTIONS.teo.x,TREE_ACTIONS.teo.y,14,0x8ef2b0).setDepth(17);
    this.add.circle(TREE_ACTIONS.lia.x,TREE_ACTIONS.lia.y,13,0xffcc79).setDepth(17);
    this.label(3460,512,'LIA · Q · AMARRA',13);
    this.add.circle(TREE_ACTIONS.nino.x,TREE_ACTIONS.nino.y,13,0x85c9fc).setDepth(17);
    this.label(3360,540,'NINO · DASH + E',13);
    for(const x of [990,2390]){
      const snake=this.add.container(x,601).setDepth(14);
      const coil=this.add.ellipse(0,9,64,18,0x4a904b).setStrokeStyle(3,0x1f582d);
      const head=this.add.circle(23,1,11,0x69b456);
      const eye=this.add.circle(28,-2,2,0xfaf09c);
      snake.add([coil,head,eye]);this.snake.push(snake);
      this.tweens.add({targets:snake,x:x+19,yoyo:true,repeat:-1,duration:740});
      this.label(x,548,'⚠ COBRA',12,'#f9d38c');
    }
    for(const x of [2720]){
      const branch=this.add.rectangle(x,465,108,14,0x6a5237).setAngle(21).setDepth(11);
      this.branches.push(branch);this.label(x,416,'⚠ GALHOS INSTÁVEIS',12,'#f9dd9a');
    }
    for(const x of [1080,2130,2900,3260]){
      this.add.rectangle(x,581,12,68,0x76d4ad,.65).setDepth(6);
      this.label(x,523,'CHECKPOINT',12,'#a7ffc8');
    }
    for(const seat of [0,1,2] as Seat[]){
      const p=this.net.poses[seat]||FOREST_SPAWNS[seat];
      const body=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color)
        .setStrokeStyle(3,0x123424).setDepth(19);
      this.players[seat]=body;this.poses[seat]={...p};
      this.names[seat]=this.label(p.x,p.y-42,CHARACTERS[seat].name,13,CHARACTERS[seat].hex);
      this.eyes[seat]=this.add.rectangle(p.x+5,p.y-8,9,5,0xfaffdf).setDepth(20);
      if(seat===this.net.localSeat){
        this.me=body;this.physics.add.existing(body);
        this.body=body.body as Phaser.Physics.Arcade.Body;
        this.body.setGravityY(850).setMaxVelocity(400,960).setCollideWorldBounds(true);
        for(const plat of this.blocks)this.physics.add.collider(body,plat);
      }
    }
    if(this.me){
      const cam=this.cameras.main;
      cam.setBounds(0,0,FOREST_WIDTH,700);
      cam.setZoom(this.scale.gameSize.width<900?1:1.18);
      cam.startFollow(this.me,false,.085,.1);
      cam.setDeadzone(70,90);cam.setRoundPixels(true);
    }
    this.arrows=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('A,D,W,E,Q') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.heartLabel=this.label(13,48,'',14,'#f9e9c6').setScrollFactor(0).setOrigin(0,.5);
    this.goalLabel=this.label(13,76,'',14,'#e8ffae').setScrollFactor(0).setOrigin(0,.5);
    this.textLabel=this.label(this.scale.gameSize.width/2,125,'',16,'#e7ffdc').setScrollFactor(0)
      .setWordWrapWidth(this.scale.gameSize.width-24);
    this.zoneLabel=this.label(this.scale.gameSize.width/2,32,'',14).setScrollFactor(0);
    this.hintLabel=this.label(this.scale.gameSize.width/2,166,'',13,'#f5e9aa')
      .setScrollFactor(0).setWordWrapWidth(Math.max(290,this.scale.gameSize.width-38));
    this.sync(this.net.forest,false);
    this.notify('Entrem na mata juntos. Lia tem estilingue, Nino tem dash.\nEncontrem Caboquim para Téo aprender o salto duplo!',5400);
    this.off.push(this.net.on('snapshot',ps=>{
      for(const p of ps)this.poses[p.seat]={...p};
    }));
    this.off.push(this.net.on('forest',w=>this.sync(w)));
    this.off.push(this.net.on('effect',fx=>this.vfx.play(fx)));
    this.off.push(this.net.on('respawn',p=>{
      this.poses[p.seat]={...p};
      if(p.seat===this.net.localSeat && this.body){
        this.body.reset(p.x,p.y);this.me.setPosition(p.x,p.y);
        this.body.setAllowGravity(true);this.jumps=0;this.pendingJump=false;
        this.notify('Voltamos juntos à entrada. Novas tentativas, novos caminhos!',3100);
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.off.forEach(off=>off()));
  }
  private sync(w:ForestWorld,announce=true):void {
    const was=this.world;this.world={...w,
      health:[...w.health] as ForestWorld['health'],
      safeUntil:[...w.safeUntil] as ForestWorld['safeUntil'],
      supporting:[...w.supporting] as ForestWorld['supporting'],
      vines:[...w.vines] as ForestWorld['vines'],
      treeSteps:[...w.treeSteps] as ForestWorld['treeSteps']};
    this.vines.forEach((v,i)=>v.setVisible(!w.vines[i]));
    this.solid(this.caboGate,!w.unlocked);
    this.solid(this.vinesGate,!w.vines.every(Boolean));
    this.caboGateNote.setVisible(!w.unlocked);
    this.vinesGateNote.setVisible(!w.vines.every(Boolean));
    this.solid(this.fallen,w.bridge);
    this.treeTrunk.setVisible(w.treeFallAt>0&&!w.bridge);
    if(!announce||!this.textLabel?.active){this.setHud();return;}
    if(w.resetId!==was.resetId)this.notify('UM AMIGO CAIU NA FLORESTA. RECOMEÇANDO JUNTOS!',3000);
    if(w.caboStep>was.caboStep&&w.caboStep>0){
      this.notify(story[w.caboStep]+'   [E ou CONTINUAR]',4000);
      if(w.caboStep===5)this.burst(CABO_X,567,0x9fffac);
    }
    w.vines.forEach((found,i)=>{if(found&&!was.vines[i]){
      this.burst(FOREST_VINES[i].x,FOREST_VINES[i].y);
      this.notify('CIPÓ COLETADO! '+w.vines.filter(Boolean).length+'/3',2500);
    }});
    w.treeSteps.forEach((done,i)=>{if(done&&!was.treeSteps[i]){
      this.notify(['TÉO SOLTOU O PRIMEIRO CIPÓ!','LIA LIBEROU A AMARRA!','NINO SOLTOU A ÚLTIMA RAIZ!'][i]);
      this.burst([3310,3460,3425][i],550);
    }});
    if(!was.bridge&&w.bridge){this.notify('A ÁRVORE VIROU UMA PONTE! ATRAVESSEM JUNTOS!',4000);this.burst(3690,610,0xdec68a);}
    if(w.restartAt>0&&was.restartAt===0)this.notify('UM AMIGO CAIU NA FLORESTA! REINÍCIO EM 3 SEGUNDOS',4200);
    if(!was.stackMilestone&&w.stackMilestone)this.notify('ESCALADA COOPERATIVA REALIZADA! TÉO, SALTE ATÉ A ÁRVORE!',4100);
    this.setHud();
  }
  private interact(seat:Seat):void {
    const x=this.me.x;
    if(seat===0&&!this.world.vines[0] &&
      Math.abs(x-FOREST_VINES[0].x)<=75 &&
      Math.abs(this.me.y-FOREST_VINES[0].y)<=90){
      this.net.act({kind:'collect'});return;
    }
    if(seat===2&&!this.world.vines[2] &&
      Math.abs(x-FOREST_VINES[2].x)<=72){
      this.net.act({kind:'collect'});return;
    }
    if(x>630&&x<935&&this.world.caboStep<5){this.net.act({kind:'talk'});return;}
    if(x>1240&&x<1880){this.net.act({kind:this.world.supporting[seat]===null?'support':'detach'});return;}
    if(x>3140&&seat===0){this.net.act({kind:'lever'});return;}
    if(x>3140&&seat===2){this.net.act({kind:'switch'});return;}
  }
  private ability(seat:Seat,now:number):void {
    if(!this.net.puzzle.unlocked[seat])return;
    if(seat===1&&now>=this.shotReady){
      this.shotReady=now+520;
      this.vfx.play({kind:'shoot',seat,level:1,x:this.me.x,y:this.me.y,facing:this.facing});
      this.net.act({kind:'shoot',facing:this.facing});this.hud?.();
    }else if(seat===2&&now>=this.dashReady){
      this.dashReady=now+2000;this.dashUntil=now+800;
      this.vfx.play({kind:'dash',seat,level:1,x:this.me.x,y:this.me.y,facing:this.facing});
      this.net.act({kind:'dash',facing:this.facing});this.hud?.();
    }
  }
  update(time:number,dt:number):void {
    if(!this.me||!this.body||this.net.localSeat===null)return;
    const seat=this.net.localSeat,now=Date.now(),w=this.world;
    const pause=!this.net.playing||!this.net.everyoneConnected||w.restartAt>0;
    if(pause!==this.paused){this.paused=pause;if(pause)this.physics.pause();else this.physics.resume();}
    const base=w.supporting[seat];
    if(base!==null){
      const p=this.poses[base];if(p){
        this.body.setAllowGravity(false);
        this.body.reset(p.x,p.y-44);this.body.setVelocity(0,0);
      }
    }else if(!this.body.allowGravity){
      this.body.setAllowGravity(true);
      if(this.pendingJump){this.body.setVelocityY(-465);this.jumps=1;this.pendingJump=false;}
    }
    if(!pause){
      let dir=0;
      if(this.arrows?.left.isDown||this.keys?.A?.isDown||this.touch.left)dir--;
      if(this.arrows?.right.isDown||this.keys?.D?.isDown||this.touch.right)dir++;
      if(dir)this.facing=dir>0?1:-1;
      const grounded=this.body.blocked.down||this.body.touching.down;
      if(grounded)this.jumps=0;
      const jump=Boolean((this.arrows&&Phaser.Input.Keyboard.JustDown(this.arrows.space))||
        (this.arrows&&Phaser.Input.Keyboard.JustDown(this.arrows.up))||
        (this.keys?.W&&Phaser.Input.Keyboard.JustDown(this.keys.W))||this.touch.jump);
      const interact=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||this.touch.interact);
      const ability=Boolean((this.keys?.Q&&Phaser.Input.Keyboard.JustDown(this.keys.Q))||this.touch.ability);
      this.touch.jump=false;this.touch.interact=false;this.touch.ability=false;
      if(base===null){
        this.body.setVelocityX(dir*(seat===2&&performance.now()<this.dashUntil?329:235));
        if(jump&&(grounded||(seat===0&&w.unlocked&&this.jumps<2))){
          const dbl=this.jumps===1&&!grounded;
          this.body.setVelocityY(-465);this.jumps++;
          if(dbl)this.burst(this.me.x,this.me.y+20);
        }
      }else{
        this.body.setVelocityX(0);
        if(jump){this.pendingJump=true;this.net.act({kind:'detach'});}
      }
      if(interact)this.interact(seat);
      if(ability)this.ability(seat,performance.now());
      if(seat===0&&!w.vines[0]&&this.me.x>1710&&this.me.x<1870)this.net.act({kind:'collect'});
      if(seat===2&&!w.vines[2]&&this.me.x>2980&&this.me.x<3130)this.net.act({kind:'collect'});
      if(base===null)this.net.report(this.me.x,this.me.y,this.body.velocity.x,this.body.velocity.y);
    }
    // Relógio do anfitrião define quando os galhos oferecem risco.
    const branchState=branchWarning(w.hazardEpoch,now);
    this.branches.forEach(b=>{
      b.y=branchState==='fall'?583:branchState==='warn'?478:465;
      b.setFillStyle(branchState==='fall'?0xf0a068:0x75583a);
    });
    const guidance=forestHint(w,seat,this.me.x);
    if(this.hintLabel.text!==guidance)this.hintLabel.setText(guidance);
    const region=Math.min(5,Math.floor(this.me.x/720));
    if(region!==this.lastRegion){
      this.lastRegion=region;
      this.zoneLabel.setText([
        'ENTRADA DA FLORESTA','ENCONTRE CABOQUIM','AJUDEM TÉO A SUBIR [E]',
        'CIPÓS SUSPENSOS','O GRANDE ABISMO','A SAÍDA COOPERATIVA'
      ][region]);
    }
    const progress=w.treeFallAt>0?Math.min(1,(now-w.treeFallAt)/1900):0;
    if(w.treeFallAt>0&&!w.bridge){
      this.treeTrunk.setVisible(true).setAngle(-69+69*progress).setPosition(3709,470+174*progress);
    }else if(w.bridge)this.treeTrunk.setVisible(false);
    if(time>this.narrativeUntil&&this.textLabel.visible)this.textLabel.setVisible(false);
    const smooth=1-Math.exp(-Math.min(dt,80)/110);
    for(const i of [0,1,2] as Seat[]){
      const actor=this.players[i];
      if(i!==seat){
        const p=this.poses[i];actor.x=Phaser.Math.Linear(actor.x,p.x,smooth);
        actor.y=Phaser.Math.Linear(actor.y,p.y,smooth);
      }
      this.names[i]?.setPosition(actor.x,actor.y-43);
      this.eyes[i]?.setPosition(actor.x+5,actor.y-8);
      actor.alpha=now<w.safeUntil[i]&&Math.floor(now/100)%2===0?.35:1;
    }
    this.vfx.update(time);
    void forestDanger;
  }
  getCooldown():string {
    const seat=this.net.localSeat;
    if(seat===null)return '';
    if(seat===0)return this.net.puzzle.unlocked[0]?'✦ Salto duplo (PULAR)':'🔒 Procure Caboquim';
    const remain=(seat===1?this.shotReady:this.dashReady)-performance.now();
    return (seat===1?'🏹 Estilingue ':'⚡ Dash ')+(remain>0?(remain/1000).toFixed(1)+'s':'Q disponível');
  }
}
