import Phaser from 'phaser';
import { gameKeys } from './keyboard';
import { CHARACTERS, type Network, type Pose, type Seat } from './network';
import type { TouchInput } from './game';
import { SkillVfx } from './skillVfx';
import { NightArt } from './visuals';
import { SoloBodies } from './soloBodies';
import { configureCamera } from './camera';
import { EYES, TRAIL, LATE_SPAWNS, movingTarget, type ChapterWorld, type Jaguar } from './chapters';

/** Um renderizador compartilhado para os capítulos 3 e 4, sem duplicar o multiplayer. */
export class LateScene extends Phaser.Scene {
  private net:Network; private touch:TouchInput; private hud?:()=>void;
  private world:ChapterWorld;
  private actors:Phaser.GameObjects.Rectangle[]=[];
  private names:Phaser.GameObjects.Text[]=[];
  private eyes:Phaser.GameObjects.Rectangle[]=[];
  private remote:Pose[]=LATE_SPAWNS.map(p=>({...p}));
  private local!:Phaser.GameObjects.Rectangle;
  private body!:Phaser.Physics.Arcade.Body;
  private allBlocks:Phaser.GameObjects.Rectangle[]=[];
  private bridge!:Phaser.GameObjects.Rectangle;
  private gate!:Phaser.GameObjects.Rectangle;
  private roots!:Phaser.GameObjects.Rectangle;
  private blink!:Phaser.GameObjects.Rectangle;
  private jaguar!:Phaser.GameObjects.Container;
  private jaguarTarget=595;
  private platformTarget=805;
  private mysticTrees:Phaser.GameObjects.Ellipse[]=[];
  private jaguarMode:Jaguar['mode']='patrol';
  private markers:Phaser.GameObjects.Arc[]=[];
  private signs:Phaser.GameObjects.Text[]=[];
  private moving!:Phaser.GameObjects.Arc;
  private info!:Phaser.GameObjects.Text;
  private clue!:Phaser.GameObjects.Text;
  private stageOverlay!:Phaser.GameObjects.Rectangle;
  private overlayUntil=0;
  private infoUntil=0;
  private currentError=0;
  private currentTransformed=false;
  private keys?:Record<string,Phaser.Input.Keyboard.Key>;
  private cursors?:Phaser.Types.Input.Keyboard.CursorKeys;
  private jumps=0; private facing:-1|1=1;private dashUntil=0;
  private dashReady=0; private shotReady=0; private paused=false;
  private vfx=new SkillVfx(this,seat=>this.actors[seat]);
  private art!:NightArt;
  private solo?:SoloBodies;
  private unsubs:Array<()=>void>=[];
  constructor(net:Network,touch:TouchInput,hud?:()=>void){
    super({key:'LateScene'});
    this.net=net;this.touch=touch;this.hud=hud;this.world={...net.chapter};
  }
  private text(x:number,y:number,s:string,size=15,color='#eaffc9'):Phaser.GameObjects.Text {
    return this.add.text(x,y,s,{fontFamily:'Arial,sans-serif',fontSize:size+'px',
      color,fontStyle:'bold',stroke:'#0a2425',strokeThickness:4,
      align:'center',wordWrap:{width:430}}).setOrigin(.5).setDepth(11);
  }
  private block(x:number,y:number,w:number,h:number,c=0x44644b):Phaser.GameObjects.Rectangle {
    const rect=this.add.rectangle(x,y,w,h,c).setStrokeStyle(3,0x93b989).setDepth(5);
    this.physics.add.existing(rect,true);
    (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.allBlocks.push(rect);
    this.art.platform(rect,h>110?'gate':[0x815a3a,0x665641].includes(c)?'bridge':'earth');
    return rect;
  }
  private solid(r:Phaser.GameObjects.Rectangle,enable:boolean):void {
    const b=r.body as Phaser.Physics.Arcade.StaticBody;
    if(b.enable!==enable){
      b.enable=enable;r.setVisible(enable);
      if(enable)b.updateFromGameObject();
    }else r.setVisible(enable);
  }
  private burst(x:number,y:number,color:number,count=12):void {
    for(let i=0;i<count;i++){
      const a=i*6.283/count;
      const dot=this.add.circle(x,y,4,color,.9).setDepth(25);
      this.tweens.add({targets:dot,x:x+Math.cos(a)*42,y:y+Math.sin(a)*42,
        alpha:0,duration:380+(i%4)*40,onComplete:()=>dot.destroy()});
    }
  }
  private alert(msg:string,ms=3400):void {
    this.info.setText(msg).setVisible(true);
    this.infoUntil=this.time.now+ms;
  }
  create():void {
    const late=this.net.level;
    this.physics.world.setBounds(0,0,1200,900);
    this.physics.world.setBoundsCollision(true,true,false,false);
    this.paintForest(late===3);
    if(late===3)this.createEyes();else this.createTrail();
    for(const seat of [0,1,2] as Seat[]){
      const p=this.net.poses[seat]||LATE_SPAWNS[seat];
      const char=this.add.rectangle(p.x,p.y,30,44,CHARACTERS[seat].color)
        .setStrokeStyle(3,0x102f2b).setDepth(15);
      this.actors[seat]=char;
      this.art.character(char,seat);
      this.names[seat]=this.text(p.x,p.y-45,CHARACTERS[seat].name,14,CHARACTERS[seat].hex);
      this.eyes[seat]=this.add.rectangle(p.x+5,p.y-8,8,5,0xffffff).setDepth(16);
      this.remote[seat]={...p};
      if(this.net.localSeat===seat){
        this.local=char;this.physics.add.existing(char);
        this.body=char.body as Phaser.Physics.Arcade.Body;
        this.body.setGravityY(850).setMaxVelocity(390,920).setCollideWorldBounds(true);
        for(const b of this.allBlocks)this.physics.add.collider(char,b);
      }
    }
    if(this.net.isSolo){
      this.solo=new SoloBodies(this,this.net,this.actors,this.allBlocks,390,920);
      this.solo.select(this.net.localSeat??0);
      this.unsubs.push(this.net.on('solo-seat',seat=>{
        this.solo?.select(seat);this.local=this.actors[seat];this.body=this.solo!.body(seat);
        this.jumps=0;this.dashUntil=0;this.setClue();this.hud?.();
      }));
    }
    if(this.local)configureCamera(this,this.local);
    this.keys=this.input.keyboard?.addKeys('A,D,E') as Record<string,Phaser.Input.Keyboard.Key>|undefined;
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.info=this.text(this.scale.gameSize.width/2,104,'',18).setWordWrapWidth(Math.min(850,this.scale.gameSize.width-20));
    this.info.setScrollFactor(0);
    this.clue=this.text(130,157,'',15,'#ffeea7').setDepth(30);
    this.clue.setScrollFactor(0).setOrigin(0,0);
    this.clue.setPosition(15,135);
    this.stageOverlay=this.add.rectangle(600,350,1200,700,0x030d19,0).setDepth(24);
    this.stageOverlay.setScrollFactor(0);
    this.sync(this.net.chapter,false);
    this.setClue();
    this.alert(late===3?
      'Quando a floresta fica em silêncio, é porque alguma coisa está observando.\nA onça protege o caminho. Trabalhem juntos!':
      'Nem todo caminho que parece certo leva para casa.\nContem suas pistas aos outros amigos!',5800);
    this.unsubs.push(this.net.on('chapter',w=>this.sync(w)));
    this.unsubs.push(this.net.on('hazard',h=>{this.jaguarTarget=h.x;this.jaguarMode=h.mode;this.platformTarget=h.platformX;}));
    this.unsubs.push(this.net.on('effect',fx=>this.vfx.play(fx)));
    this.unsubs.push(this.net.on('snapshot',ps=>{
      for(const p of ps)if(p.seat!==this.net.localSeat)this.remote[p.seat]={...p};
    }));
    this.unsubs.push(this.net.on('respawn',p=>{
      this.remote[p.seat]={...p};
      if(this.net.isSolo)this.solo?.reset(p);
      if(p.seat===this.net.localSeat && this.body){
        this.local.setPosition(p.x,p.y);this.body.reset(p.x,p.y);
        this.jumps=0;this.dashUntil=0;
        this.burst(p.x,p.y,0xfcd9a2,15);
        this.alert(this.net.level===3?'A onça ou a floresta levou você ao checkpoint.':'A trilha era falsa! Você voltou ao checkpoint.',2200);
      }
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.unsubs.forEach(off=>off()));
    this.time.addEvent({delay:340,loop:true,callback:()=>{
      const x=Phaser.Math.Between(0,1200),y=Phaser.Math.Between(200,550);
      const glow=this.add.circle(x,y,2.5,0xe5ff9e,.6).setDepth(3);
      this.tweens.add({targets:glow,y:y-22,alpha:0,duration:1350,onComplete:()=>glow.destroy()});
    }});
  }
  private paintForest(eyes:boolean):void {
    this.art=new NightArt(this,1200,eyes?'eyes':'trail');
    if(!eyes){
      for(let i=0;i<5;i++){
        const crown=this.add.ellipse(120+i*218,329+(i%2)*20,89,118,0x29473d,.65).setDepth(-2);
        this.mysticTrees.push(crown);
      }
    }
    this.text(600,57,eyes?'03 · OLHOS NA MATA':'04 · A TRILHA QUE MENTE',23,'#dfebdc');
    this.text(600,84,eyes?'Silêncio. Há olhos na mata.':'A verdade está escondida entre três pistas.',12,'#c0dcd3');
    if(eyes)this.art.water(465,575,642);
    else {this.art.water(403,508,642);this.art.water(885,975,644);}
  }
  private createEyes():void {
    // Buraco entre as duas margens; raízes e plataforma elevada de Téo.
    this.block(232,650,464,60);
    this.block(895,650,610,60);
    this.bridge=this.block(519,650,170,60,0x815a3a);
    this.roots=this.block(529,507,30,226,0x4a7c47);
    this.gate=this.block(1140,497,32,243,0x5d8c87);
    this.blink=this.block(805,502,120,18,0x59745b); // plataforma móvel: posição recebida do anfitrião
    this.platformTarget=this.net.jaguar.platformX;
    this.blink.setPosition(this.platformTarget,502);
    (this.blink.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.block(315,432,126,19,0x526c50);
    this.text(318,320,'TÉO · SALTO DUPLO + E',12);
    this.add.rectangle(EYES.lever.x,EYES.lever.y,13,36,0xf7be78).setAngle(-27).setDepth(9);
    this.markers[0]=this.add.circle(EYES.distraction.x,EYES.distraction.y,15,0xffcb65).setDepth(8);
    this.text(658,515,'LIA · J · DISTRAIA A ONÇA',12);
    this.add.circle(EYES.timer.x,EYES.timer.y,18,0x8edff0,.9).setDepth(7);
    this.text(696,538,'NINO · E · TEMPO',12);
    this.markers[1]=this.add.circle(EYES.switch.x,EYES.switch.y,14,0x82c8eb).setDepth(8);
    this.text(940,543,'NINO · DASH + E',12);
    this.add.ellipse(EYES.plate.x,625,82,15,0x8cf4ae).setDepth(8);
    this.text(952,487,'TÉO · PLACA',12);
    this.markers[2]=this.add.circle(EYES.finalTarget.x,EYES.finalTarget.y,13,0xffd785).setDepth(9);
    this.text(1048,518,'LIA · ALVO FINAL',11);
    this.markers[3]=this.add.circle(EYES.finalSwitch.x,EYES.finalSwitch.y,13,0x90caff).setDepth(9);
    this.text(1094,543,'NINO · E',12);
    this.text(1182,489,'SAÍDA',15);
    this.jaguar=this.add.container(this.net.jaguar.x,this.net.jaguar.y).setDepth(17);
    const body=this.add.ellipse(0,-13,69,34,0x111918);
    const head=this.add.circle(24,-23,17,0x121c16);
    const tail=this.add.ellipse(-41,-14,29,8,0x121c16).setAngle(-25);
    const earLeft=this.add.triangle(13,-39,-8,9,0,-10,7,8,0x111e1d);
    const earRight=this.add.triangle(33,-39,-8,9,0,-10,7,8,0x111e1d);
    const marking=this.add.ellipse(-4,-17,26,8,0x2c3d32,.85);
    const eyes=this.add.circle(32,-27,3,0xe8bc75);
    const muzzle=this.add.circle(34,-17,4,0x8e9270);
    this.jaguar.add([body,tail,marking,head,earLeft,earRight,eyes,muzzle]);
  }
  private createTrail():void {
    this.block(207,650,414,60);
    this.block(708,650,366,60);
    this.block(1095,650,210,60);
    this.bridge=this.block(473,650,116,60,0x665641); // trilha falsa: aparência de apoio, sem colisão
    this.roots=this.block(1128,505,32,244,0x86669f); // só sai após o trio
    this.gate=this.roots;
    this.blink=this.block(940,650,104,60,0x7c9b79); // plataforma alternada
    this.block(331,431,135,19,0x637554);
    this.markers[0]=this.add.circle(TRAIL.moon.x,TRAIL.moon.y,16,0xbedaf9).setDepth(9);
    this.text(330,329,'TÉO · E · ☾ LUA',13);
    this.markers[1]=this.add.circle(TRAIL.leaf.x,TRAIL.leaf.y,16,0x8dff95).setDepth(9);
    this.text(614,511,'LIA · J · FOLHA',13);
    this.markers[2]=this.add.circle(TRAIL.star.x,TRAIL.star.y,16,0xffeb93).setDepth(9);
    this.text(834,526,'NINO · DASH + E · ★',12);
    this.add.ellipse(TRAIL.plate.x,624,78,15,0x8fffba).setDepth(9);
    this.text(931,488,'TÉO · PLACA',12);
    this.moving=this.add.circle(1040,TRAIL.movingTargetY,15,0xffd78a).setDepth(9);
    this.text(1050,510,'LIA · ALVO MÓVEL',11);
    this.markers[3]=this.add.circle(TRAIL.finalSwitch.x,TRAIL.finalSwitch.y,14,0x89d4f2).setDepth(9);
    this.text(1108,537,'NINO · E',12);
    this.text(1186,488,'SAÍDA',15);
    this.signs=[
      this.text(425,540,'CASA →',15,'#ffe8b4'),
      this.text(510,500,'PERIGO',15,'#ffca91'),
      this.text(715,525,'SIGA A LUZ',13,'#d9eeba'),
    ];
  }
  private setClue():void {
    if(this.net.level!==4 || this.net.localSeat===null){this.clue.setVisible(false);return;}
    const clue=[
      'SUA PISTA • TÉO: A LUA revela o primeiro caminho.',
      'SUA PISTA • LIA: A FOLHA guarda a segunda resposta.',
      'SUA PISTA • NINO: A ESTRELA mostra a última saída.',
    ][this.net.localSeat];
    this.clue.setVisible(true).setText(clue);
  }
  private sync(w:ChapterWorld,announce=true):void {
    if(w.level!==this.net.level)return;
    const prev=this.world;this.world={...w};
    if(w.level===3){
      this.solid(this.bridge,w.roots);
      this.solid(this.roots,!w.roots);
      this.solid(this.gate,!w.finalGate);
      this.markers[0]?.setFillStyle(w.distractedUntil>Date.now()?0x78ffc0:0xffcb65);
      this.markers[1]?.setFillStyle(w.passage?0x90ffb0:0x82c8eb);
      if(announce && this.info?.active && prev.level===3){
        if(!prev.roots && w.roots){this.alert('TÉO AFASTOU AS RAÍZES!');this.burst(521,603,0x87efad);}
        if(prev.distractedUntil<=Date.now() && w.distractedUntil>Date.now()){
          this.alert('A ONÇA OUVIU O ESTILINGUE! ATRAVESSEM ENQUANTO ESTÁ DISTRAÍDA!');
          this.burst(EYES.distraction.x,EYES.distraction.y,0xf6d592);
        }
        if(!prev.passage && w.passage){this.alert('NINO ABRIU O CORREDOR. ATIVEM OS TRÊS MECANISMOS!');this.burst(940,598,0x8fdefe);}
        if(!prev.finalGate && w.finalGate)this.celebrate();
      }
    }else{
      this.solid(this.bridge,false); // placa falsa proposital; a lacuna continua pulável.
      this.solid(this.blink,w.transformed && (w.platformsOn || w.finalGate));
      this.solid(this.roots,!w.finalGate);
      this.markers[0]?.setFillStyle(w.totems>=1?0x9dffc5:0xbedaf9);
      this.markers[1]?.setFillStyle(w.totems>=2?0x9dffc5:0x8dff95);
      this.markers[2]?.setFillStyle(w.totems>=3?0x9dffc5:0xffeb93);
      if(this.signs.length && w.signsChanged){
        this.signs[0].setText('VOLTE ←');
        this.signs[1].setText('PERIGO →');
        this.signs[2].setText('SIGA A LUZ ✦');
      }
      if(!announce && w.transformed) this.mysticTrees.forEach((tree,i)=>tree.x+=(i%2===0?38:-38));
      if(announce && this.info?.active && prev.level===4){
        if(w.errors>prev.errors){
          this.alert('ORDEM ERRADA! OS TOTENS APAGARAM. TENTEM NOVAMENTE!',3000);
          this.blackout(520);
        }
        if(w.totems>prev.totems){this.burst([0,TRAIL.moon.x,TRAIL.leaf.x,TRAIL.star.x][w.totems],500,0xbaff9f);}
        if(!prev.transformed && w.transformed){
          this.alert('A FLORESTA ESTAVA MENTINDO!',4000);this.blackout(1100);
          this.burst(943,597,0xe5ffbc,22);
          this.mysticTrees.forEach((tree,i)=>this.tweens.add({
            targets:tree,x:tree.x+(i%2===0?38:-38),duration:950,ease:'Sine.easeInOut'
          }));
        }
        if(!prev.finalGate && w.finalGate)this.celebrate();
      }
    }
    this.hud?.();
  }
  private blackout(duration:number):void {
    this.tweens.add({targets:this.stageOverlay,alpha:.65,duration:200,yoyo:true,
      hold:duration/2,onComplete:()=>this.stageOverlay.setAlpha(0)});
  }
  private celebrate():void {
    this.alert('OS TRÊS AMIGOS LIBERARAM A SAÍDA!',4500);
    this.burst(1135,582,0xccff8f,20);
  }
  private action(me:Seat):void {
    if(this.net.level===3){
      if(me===0)this.net.act({kind:'lever'});
      if(me===2)this.net.act({kind:this.world.level===3 && !this.world.passage && this.local.x<785?'timer':'switch'});
    }else{
      if(me===0)this.net.act({kind:'lever'});
      if(me===2)this.net.act({kind:'switch'});
    }
  }
  private ability(me:Seat,now:number):void {
    if(!this.net.puzzle.unlocked[me])return;
    if(me===1 && now>=this.shotReady){
      this.shotReady=now+520;
      this.vfx.play({kind:'shoot',seat:me,level:this.net.level,x:this.local.x,y:this.local.y,facing:this.facing});
      this.net.act({kind:'shoot',facing:this.facing});this.hud?.();
    }else if(me===2 && now>=this.dashReady){
      this.dashReady=now+2000;this.dashUntil=now+800;
      this.vfx.play({kind:'dash',seat:me,level:this.net.level,x:this.local.x,y:this.local.y,facing:this.facing});
      this.net.act({kind:'dash',facing:this.facing});this.hud?.();
    }
  }
  update(time:number,delta:number):void {
    if(!this.body||!this.local||this.net.localSeat===null)return;
    const seat=this.net.localSeat;
    this.solo?.beforeFrame();
    const pause=!this.net.playing||!this.net.everyoneConnected||this.net.completed;
    if(pause!==this.paused){this.paused=pause;if(pause)this.physics.pause();else this.physics.resume();}
    if(!pause){
      let dir=0;
      if(this.cursors?.left.isDown||this.keys?.A?.isDown||this.touch.left)dir--;
      if(this.cursors?.right.isDown||this.keys?.D?.isDown||this.touch.right)dir++;
      if(dir)this.facing=dir>0?1:-1;
      const now=performance.now();
      this.body.setVelocityX(dir*(seat===2 && now<this.dashUntil?329:235));
      const grounded=this.body.blocked.down||this.body.touching.down;
      if(grounded)this.jumps=0;
      const jump=Boolean(gameKeys.consumeJump()||this.touch.jump);
      this.touch.jump=false;
      if(jump && (grounded || (seat===0 && this.net.puzzle.unlocked[0] && this.jumps<2))){
        const double=this.jumps===1&&!grounded;this.body.setVelocityY(-465);this.jumps++;
        if(double)this.burst(this.local.x,this.local.y+22,0x9affb2,10);
      }
      const use=Boolean((this.keys?.E&&Phaser.Input.Keyboard.JustDown(this.keys.E))||this.touch.interact);
      const special=Boolean(gameKeys.consumeSkill(seat)||this.touch.ability);
      this.touch.interact=false;this.touch.ability=false;
      if(use)this.action(seat);
      if(special)this.ability(seat,now);
      this.net.report(this.local.x,this.local.y,this.body.velocity.x,this.body.velocity.y);
    }
    const now=Date.now();
    if(this.net.level===3 && this.jaguar){
      this.jaguar.x=Phaser.Math.Linear(this.jaguar.x,this.jaguarTarget,1-Math.exp(-Math.min(delta,80)/90));
      const newX=Phaser.Math.Linear(this.blink.x,this.platformTarget,1-Math.exp(-Math.min(delta,80)/110));
      if(Math.abs(newX-this.blink.x)>.15){
        this.blink.x=newX;
        (this.blink.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
      this.jaguar.setAlpha(this.jaguarMode==='distracted'?.5:1);
      const current=this.world;
      if(current.level===3 && current.distractedUntil>now){
        this.markers[0].setFillStyle(0x7cffa8);
      }else this.markers[0].setFillStyle(0xffcb65);
    }else if(this.world.level===4){
      this.moving.setPosition(movingTarget(now).x,TRAIL.movingTargetY);
      const w=this.world;
      // Sinalização anterior ao desaparecimento; colisão vem APENAS do host.
      if(w.transformed && !w.finalGate && w.platformsOn && w.nextFlipAt-now<500)
        this.blink.setAlpha(.4+Math.abs(Math.sin(time/95))*.5);
      else this.blink.setAlpha(1);
    }
    if(time>this.infoUntil && this.info.visible)this.info.setVisible(false);
    const smooth=1-Math.exp(-Math.min(delta,80)/100);
    for(const i of [0,1,2] as Seat[]){
      const actor=this.actors[i];
      if(i!==seat&&!this.net.isSolo){
        const p=this.remote[i];actor.x=Phaser.Math.Linear(actor.x,p.x,smooth);
        actor.y=Phaser.Math.Linear(actor.y,p.y,smooth);
      }
      this.eyes[i]?.setPosition(actor.x+5,actor.y-8);
      this.names[i]?.setPosition(actor.x,actor.y-44);
      actor.setAlpha(this.net.players[i].online?1:.35);
    }
    this.solo?.report();
    this.art.update(time);
    this.vfx.update(time);
  }
  getCooldown():string {
    const seat=this.net.localSeat;if(seat===null)return '';
    if(seat===0)return '✦ Salto duplo (PULAR)';
    const remain=(seat===1?this.shotReady:this.dashReady)-performance.now();
    return (seat===1?'🏹 Estilingue: ':'⚡ Dash: ')+(remain>0?(remain/1000).toFixed(1)+'s':(seat===1?'J disponível':'SHIFT disponível'));
  }
}
