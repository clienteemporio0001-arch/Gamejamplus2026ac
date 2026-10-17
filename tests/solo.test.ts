import { readFileSync } from 'node:fs';
import { ForestAuthority, FOREST_SPAWNS, CABO_X } from '../src/forest';
import { JourneyAuthority, JOURNEY_SPAWNS } from '../src/riverJourney';
import { ChapterAuthority, LATE_SPAWNS } from '../src/chapters';
import { SOLO_TIMING } from '../src/soloRules';
let count=0;
function ok(x:unknown,label:string){if(!x)throw Error('SOLO: '+label);count++}
const net=readFileSync('src/network.ts','utf8');
const ui=readFileSync('src/main.ts','utf8');
const physics=readFileSync('src/soloBodies.ts','utf8');
ok(net.includes("this.role='solo'"),'sessão independente');
ok(net.includes("this.heartbeat=setInterval(()=>this.hostTick(),50)"),'host local');
const start=net.slice(net.indexOf('  startSolo('),net.indexOf('  selectSoloSeat('));
ok(!start.includes('new Peer(')&&!start.includes('this.peer.connect'),'solo não faz conexão WebRTC');
ok(net.includes("this.emit('solo-seat',seat)"),'troca sincroniza cenas');
ok(net.includes("if(!this.isSolo||!this.playing||this.localSeat===seat)return;"),'troca restrita ao solo');
ok(net.includes("this.poses[p.seat]={...p}"),'três poses de seats reais');
ok(net.includes('this.poses[this.localSeat]'),'report não força seat 0');
ok(net.includes('this.hostAction(this.isSolo ? this.localSeat : 0, action)'), 'ações locais atribuídas à identidade selecionada');
ok(net.includes("this.authority.world.unlocked=[level!==1 || mode==='loop',true,true]"),'desbloqueios por capítulo');
ok(net.includes('  restartSolo():void {'),'recomeçar a fase');
ok(net.includes('if(this.isSolo && result.hits.length>0)'),'onça reinicia todos no solo');
ok(net.includes('if(this.isSolo){this.restartSolo();return;}'),'queda nas fases finais reinicia todos no solo');

ok(physics.includes('scene.physics.add.existing(actor)'),'três corpos Arcade');
ok(physics.includes('scene.physics.add.collider(actor,block)'),'colisões dos inativos');
ok(physics.includes('body.setAllowGravity(true)'),'inativos continuam sob gravidade');
ok(physics.includes('body.setVelocityX(0)'),'inativos não se movem sozinhos');
ok(physics.includes('body.reset(parent.x'),'apoio de amigos');
ok(physics.includes('cameras.main.startFollow'),'câmera acompanha seleção');
for(const path of ['src/forestScene.ts','src/journeyScene.ts','src/lateScene.ts']){
 const s=readFileSync(path,'utf8');
 for(const token of ['new SoloBodies(this,',"this.net.on('solo-seat'",'this.solo?.beforeFrame(', 'this.solo?.report()'])
   ok(s.includes(token),path+' integra '+token);
}
for(const label of ['JOGAR SOZINHO','MULTIPLAYER ONLINE','FERRAMENTAS DE DESENVOLVIMENTO',
  'TESTAR FLORESTA MUTÁVEL','REINICIAR TENTATIVA','VOLTAR AO MENU'])
 ok(ui.includes(label),'interface '+label);
ok(ui.includes("button('dev-classic-'+level"),'seletor clássico dentro do desenvolvimento');
ok(ui.includes('net.startSolo(level)'),'fases antigas continuam testáveis');
for(const digit of ['Digit1','Digit2','Digit3'])ok(ui.includes(digit),'atalho '+digit);
ok(ui.includes('net.selectSoloSeat'),'botões touch / teclado selecionam seat');
ok(ui.includes('Tempos de cooperação adaptados'),'painel indica janelas especiais solo');
ok(SOLO_TIMING.riverTemporary===18000&&SOLO_TIMING.riverFinalShot===23000,'janelas solo estendidas');
const forest=new ForestAuthority();
const poses=FOREST_SPAWNS.map(p=>({...p}));
for(const p of poses){p.x=CABO_X;p.y=590}
ok(forest.tick(poses,1000).changed,'três personagens encontram o Guia');
for(const t of [1500,2100,2700,3300])ok(forest.act(2,{kind:'talk'},poses,t),'Nino pode avançar fala '+t);
ok(forest.world.unlocked,'Téo desbloqueia salto duplo');
for(const p of poses){p.x=1450;p.y=591;p.vx=0}
ok(forest.act(1,{kind:'support'},poses,4000),'Lia sobe no Nino');
forest.tick(poses,4100);
ok(forest.act(0,{kind:'support'},poses,4400),'Téo sobe na Lia');
ok(forest.world.stackMilestone,'marco tríplice');
const solo=new JourneyAuthority();solo.solo=true;
const mp=new JourneyAuthority();
const riverPos=JOURNEY_SPAWNS.map(p=>({...p}));
riverPos[2].x=2260;riverPos[2].y=596;
for(const authority of [solo,mp]){authority.world.materials=[true,true,true];authority.world.anchor=true;authority.world.counterweight=true}
ok(solo.act(2,{kind:'timer'},riverPos,[true,true,true],10000),'Nino inicia janela solo');
ok(mp.act(2,{kind:'timer'},riverPos,[true,true,true],10000),'Nino inicia janela online');
ok(solo.world.tempUntil===28000&&mp.world.tempUntil===19000,'multiplayer mantém dificuldade');
for(const lvl of [3,4] as const){
 const auth=new ChapterAuthority(lvl);auth.solo=true;
 ok(auth.world.level===lvl&&LATE_SPAWNS.length===3,'autoridade solo fase '+lvl);
}

const activity=new ForestAuthority();
activity.world.caboStep=5;activity.world.unlocked=true;activity.world.vines=[true,true,true];
const actors=FOREST_SPAWNS.map(p=>({...p}));
actors[0].x=3310;actors[0].y=390;
ok(!activity.act(1,{kind:'lever'},actors,10000),'Lia não aciona primeira amarra');
ok(activity.act(0,{kind:'lever'},actors,10100),'Téo aciona primeira amarra');
actors[1].x=3300;actors[1].y=592;
ok(!activity.act(2,{kind:'shoot',facing:1},actors,10500),'Nino não usa baladeira');
ok(activity.act(1,{kind:'shoot',facing:1},actors,10600),'Lia acerta segunda amarra');
actors[2].x=3260;actors[2].y=590;
ok(!activity.act(2,{kind:'dash',facing:1},actors,11000),'Nino inicia dash');
actors[2].x=3425;
ok(activity.act(2,{kind:'switch'},actors,11700),'Nino aciona terceira amarra');
ok(activity.world.treeSteps.every(Boolean),'três identidades concluem a árvore');
ok(ui.includes("net.isSolo&&net.playing&&['Digit1'"),'1/2/3 sem interferência online');

console.log('APROVADO: '+count+' verificações do Modo Solo sem IA e das quatro fases.');
