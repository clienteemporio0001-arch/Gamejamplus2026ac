import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {TEMP_WIDTH,TEMP_START,TEMP_CYCLE,TEMP_BLACKOUT,TEMP_CHANNEL,TEMP_UPPER,TEMP_SUMMIT,
 TEMP_LAYOUTS,TEMP_ECHO,TEMP_TREE,TEMP_ROOTS,TemporalAuthority,initTemporal,validTemporal,
 tempWind,tempBlocks,tempSurface,temporalObjective,tempLanding} from '../src/temporalForest';
import {temporalDrop,rainBudget,rippleAt} from '../src/temporalRain';
let checks=0;
const ok=(x:unknown,s:string)=>{if(!x)throw Error('TEMPORAL: '+s);checks++;};
const p:Pose[]=TEMP_START.map(x=>({...x,y:616}));
const set=(i:number,x:number,y=616)=>{p[i].x=x;p[i].y=y;p[i].vx=0;p[i].vy=0;};
const act=(a:TemporalAuthority,i:number,kind:'lever'|'switch'|'support'|'detach',now:number)=>
 a.act(i as Seat,{kind},p,now);
const a=new TemporalAuthority();a.reset(1000);
ok(TEMP_WIDTH>=3800&&TEMP_WIDTH<=4300,'mundo horizontal em dimensão pedida');
ok(TEMP_START.length===3&&TEMP_START.every(q=>q.x>1800&&q.x<2180),
  'spawn central seguro em terreno firme');
ok(TEMP_START[2].x-TEMP_START[0].x===128,'jogadores juntos sem corpos colidindo');
ok(TEMP_START.every(q=>q.x<TEMP_CHANNEL.start-400),'exploração direita antes da correnteza');
ok(TEMP_START[0].x>1000,'exploração esquerda extensa');
ok(TEMP_CYCLE===60000&&TEMP_BLACKOUT===2000,'tempo A/B/C e apagão');
ok(validTemporal(a.world)&&a.world.layout===0,'snapshot inicial válido');
ok(a.world.health.every(x=>x===3)&&a.world.stamina.every(x=>x===100),
  'recursos individuais novos, plenamente restaurados');
ok(!validTemporal({...a.world,layout:9})&&!validTemporal({...a.world,stamina:[200,20,20]}),
  'pacotes inválidos rejeitados');
ok(!validTemporal({...a.world,supporting:[1,2,0]}),'apoios impossíveis rejeitados');
ok(temporalObjective(a.world).title.includes('marcos'),'objetivo inicial progressivo');

const b0=tempBlocks(a.world);
ok(b0.filter(b=>b.active).length>=4,'portão e obstáculos reais no layout A');
ok(tempBlocks({...a.world,layout:1}).some((b,i)=>b.active!==b0[i].active),
  'layout B muda colisões físicas');
ok(tempBlocks({...a.world,layout:2}).some((b,i)=>b.active!==b0[i].active),
  'layout C muda colisões físicas');
ok(TEMP_LAYOUTS[0].obstacles.join()!==TEMP_LAYOUTS[1].obstacles.join()&&
 TEMP_LAYOUTS[1].obstacles.join()!==TEMP_LAYOUTS[2].obstacles.join(),
  'conjuntos predefinidos de obstáculos distintos');
for(const i of [0,1,2] as const){
 const obs=tempBlocks({...a.world,layout:i});
 ok(obs.some(b=>b.active&&b.height>=500),'portões de mundo reais');
 ok(obs.some(b=>b.active&&b.height<=100),'obstáculos saltáveis');
 ok(TEMP_START.every(p=>obs.every(b=>!b.active||Math.abs(p.x-b.x)>50)),
   'respawn fora de obstáculos em '+i);
 ok(TEMP_LAYOUTS[i].puddles.length>=3,'poças variam na mudança '+i);
}
ok(tempSurface(a.world,700)==='mud','lama em zona específica');
ok(tempSurface(a.world,420)==='wet','poça normal atravessável');
ok(tempSurface(a.world,1970)==='normal','clareira inicial possui chão firme');
ok(tempSurface({...a.world,layout:2},3610)==='wet',
  'piscina/poça muda fisicamente de posição');
ok(TEMP_CHANNEL.end-TEMP_CHANNEL.start===360,'correnteza profunda mais larga que pulo simples');
ok(TEMP_UPPER.landing===293,'galho alto requer cooperação');
ok(616-TEMP_UPPER.landing>254,'duplo salto do chão não alcança árvore temporal');
ok(616-88-TEMP_UPPER.landing<254,'duplo salto do topo da equipe alcança galho');
ok(tempLanding({seat:0,x:2440,y:293,vx:0,vy:0}),'pouso estável verificável');
ok(!tempLanding({seat:0,x:2440,y:250,vx:0,vy:0}),'não basta estar passando no ar');

const root=initTemporal(1000);
for(let layer of [0,1,2] as const){
 const d=temporalDrop(root,17,15000,layer);
 ok(Number.isFinite(d.x)&&Number.isFinite(d.y)&&d.x<TEMP_WIDTH,
   'chuva ancorada no mundo '+layer);
 ok(temporalDrop(root,17,15000,layer).x===d.x,'chuva sem dependência do jogador '+layer);
 ok(temporalDrop(root,17,16000,layer).y!==d.y,'chuva se move sem caminhar '+layer);
}
ok(rainBudget(true).reduce((a,b)=>a+b,0)<rainBudget(false).reduce((a,b)=>a+b,0),
  'orçamento menor para mobile');
ok(rippleAt(4,14000).alpha<=.27,'ondas leves');
ok(tempWind(root,2000)===-1,'vento inicial aponta aos marcos a oeste');
ok(tempWind({...root,echo:[true,true,true]},2400)===1,
  'chuva indica ir ao puzzle cooperativo');
ok(tempWind({...root,echo:[true,true,true],bridge:true,layout:1},3370)===-1,
  'vento denuncia a trilha falsa');
ok(tempWind({...root,echo:[true,true,true],bridge:true,layout:2},3370)===1,
  'chuva libera caminho verdadeiro apenas no C');

ok(a.tick(p,61000).changed&&a.world.blackoutUntil===63000,'apagão disparado aos 60s');
const pre=a.world.stamina.slice();
ok(!a.tickResources(p,62000),'sem regenerar energia durante apagão');
ok(a.world.stamina.every((x,i)=>x===pre[i]),'energia preservada');
ok(!a.tick(p,62500).changed,'não transforma antes de completar dois segundos');
ok(a.tick(p,63100).changed&&a.world.layout===1,'transforma para B no relógio host');
ok(a.tick(p,123100).changed,'novo ciclo abre blackout B');
ok(a.tick(p,125101).changed&&a.world.layout===2,'estado C alcançado');
ok(a.tick(p,185101).changed&&a.tick(p,187102).changed&&a.world.layout===0,
  'ciclo retorna a A sem conteúdo aleatório');
a.reset(1000);
set(0,TEMP_ECHO[0].x,TEMP_ECHO[0].y);
ok(act(a,0,'lever',10000),'Téo investiga marco molhado elevado');
set(1,1060);
ok(a.authorizeEnergy(1,'shoot',p,11000,1).ok&&a.world.echo[1],
  'Lia acerta marco sob chuva com baladeira autoritativa');
set(2,1490);
ok(a.authorizeEnergy(2,'dash',p,12000,1).ok,'Nino prepara arrancada');
set(2,TEMP_ECHO[2].x);
ok(act(a,2,'switch',12400)&&a.world.echo.every(Boolean),
  'Nino valida terceiro marco depois do dash');
ok(tempBlocks(a.world)[0].active===false,'portão físico do setor direito abre com os três marcos');
ok(temporalObjective(a.world).title.includes('árvore'),'objetivo avança apenas após três');

set(2,2440);set(1,2440);set(0,2440);
ok(!act(a,0,'support',15000),'Téo não sobe se Lia ainda não subiu');
ok(act(a,1,'support',15100),'Lia se apoia no Nino');
a.tick(p,15200);
ok(act(a,0,'support',15300),'Téo sobe na Lia');
a.tick(p,15400);
ok(a.world.stacked&&p[0].y===p[1].y-44,'três corpos ligados pela autoridade');
ok(act(a,0,'detach',15500)&&a.world.climbReady,'Téo inicia salto a partir da torre');
ok(!act(a,0,'lever',15700),'E sem aterrissar não ativa amarra');
set(0,TEMP_UPPER.x,260);ok(!a.tick(p,16000).changed,'no ar não conta como pouso');
set(0,TEMP_UPPER.x,TEMP_UPPER.landing);
ok(a.tick(p,16100).changed&&a.world.teoLanded,'pouso elevado validado pelo host');
ok(!act(a,0,'lever',16200),'primeiro galho não libera a amarra');
set(0,TEMP_SUMMIT.x,TEMP_SUMMIT.landing);
ok(a.tick(p,16250).changed&&a.world.teoSummitReached,'segundo patamar exige pouso');
ok(act(a,0,'lever',16300)&&a.world.tree[0],'amarra superior exige dois pousos e E');

set(1,2440);
ok(a.authorizeEnergy(1,'shoot',p,16500,1).ok&&a.world.tree[1],
  'Lia rompe segunda amarra com J');
set(2,2400);
ok(a.authorizeEnergy(2,'dash',p,17000,1).ok,'Nino prepara dash na raiz');
set(2,2550);
ok(act(a,2,'switch',17700)&&a.world.tree.every(Boolean)&&a.world.bridgeAt===17700,
  'três atos derrubam árvore e iniciam animação');
ok(!a.world.bridge,'ponte não tem colisão durante queda');
ok(!a.tick(p,17800).changed,'sem ponte antes da animação');
ok(a.tick(p,19700).changed&&a.world.bridge,'ponte obtém colisão após 1,9s');
ok(temporalObjective(a.world).title.includes('estado C'),'segunda prova exige o ciclo');
ok(a.world.health.every(x=>x===3),'sucesso não altera vida');
ok(a.world.stamina[1]<100&&a.world.stamina[2]<100,'habilidades cobram estamina real');

a.world.layout=2;
set(0,TEMP_ROOTS[0].x,TEMP_ROOTS[0].y);
ok(act(a,0,'lever',20000)&&a.world.roots[0],'Téo solta raiz elevada');
set(1,3350);
ok(a.authorizeEnergy(1,'shoot',p,21000,1).ok&&a.world.roots[1],
  'Lia atinge raiz protegida sob chuva');
for(let time=21100;time<=21900;time+=100)a.tickResources(p,time);
set(2,3620);
ok(a.authorizeEnergy(2,'dash',p,22000,1).ok,'Nino prepara corrida final após recuperar energia');
set(2,TEMP_ROOTS[2].x);
ok(act(a,2,'switch',22700)&&a.world.roots.every(Boolean)&&a.world.exit,
  'Nino conclui último mecanismo somente em C');
for(const i of [0,1,2])set(i,4110+i*15);
ok(a.tick(p,23000).won&&a.world.completed,'vitória exige os três vivos na saída');
const doomed=new TemporalAuthority();doomed.reset(1000);
doomed.world.echo=[true,true,true];doomed.world.tree=[true,true,true];
doomed.world.bridge=true;doomed.world.layout=2;
ok(doomed.damage(1,30000,true)&&doomed.world.health[1]===0,'água profunda causa morte fatal');
ok(!doomed.tick(p,31200).reset,'derrota espera transição');
const retry=doomed.tick(p,32201);
ok(retry.reset&&retry.poses?.every((p,i)=>p.x===TEMP_START[i].x),
  'morte na fase 2 reinicia apenas fase 2');
ok(doomed.world.health.every(h=>h===3)&&doomed.world.stamina.every(e=>e===100),
  'vida e energia restauradas no checkpoint da Fase 2');
ok(!doomed.world.bridge&&doomed.world.echo.every(x=>!x)&&doomed.world.layout===0,
  'puzzles e layout da Fase 2 resetados');
const net=readFileSync('src/network.ts','utf8'),main=readFileSync('src/main.ts','utf8');
const scene=readFileSync('src/temporalForestScene.ts','utf8');
ok(net.includes("this.setPhase('transition',1,Date.now()+5000)"),
  'conclusão da Boca da Noite não é vitória definitiva');
ok(net.includes("this.setPhase('playing',2)"),
  'host sincroniza começo da fase temporal');
ok(net.includes("this.message(conn, {t:'temporal',world:this.temporal})"),
  'reconexão recebe snapshot do novo mapa');
ok(net.includes("this.broadcast({t:'temporal',world:this.temporal})"),
  'estado, estamina e puzzles da fase 2 são replicados');
ok(net.includes("startTemporalSolo():void{this.startSolo(2,false,'loop');}"),
  'modo solo pode iniciar diretamente Fase 2');
ok(main.includes("data-phase")&&main.includes("net.startSolo(level,false,'loop',avatars)"),
  'seletor de fases carrega Floresta Temporal sem a antiga aba clássica');
ok(main.includes("new TemporalForestScene(net,touch,refreshHud)")&&
   main.includes("instance.scene.add(key,scene,true)")&&
   main.includes("instance.scene.remove(previous)"),
  'Phaser carrega a Floresta Temporal como cena independente, mantendo o mesmo renderizador');
ok(main.includes('VOCÊS VENCERAM A TEMPESTADE!'),'fim da Fase 2 tem tela própria');
ok(scene.includes('this.solo=new SoloBodies')&&scene.includes("net.on('solo-seat'"),
  'três corpos sem IA e mudança manual no solo');
ok(scene.includes("tempSurface(w,this.local.x)")&&scene.includes("surface==='wet'")&&
   scene.includes("surface==='mud'"),'lama reduz velocidade e poça altera frenagem');
ok(scene.includes('targets:p,x:TEMP_LAYOUTS[w.layout].puddles[i]'),
  'poças desenhadas exatamente nas áreas de atrito molhado de cada layout');
ok(scene.includes('for(const [x,width] of [[720,200],[1780,140],[3285,190]]'),
  'lama possui indicação visual nos três trechos lentos');
ok(scene.includes("this.setActive(this.bridge,w.bridge)"),
  'colisão da ponte acompanha árvore encharcada');
ok(scene.includes("this.setActive(this.temporary,TEMP_LAYOUTS[w.layout].temporaryBridge)"),
  'plataforma temporária muda de colisão no estado C');
ok(scene.includes("temporalDrop(this.w,i,time,layer as 0|1|2)"),
  'chuva não lê posição ou direção do personagem');
ok(scene.includes('this.physics.pause()')&&scene.includes('this.physics.resume()'),
  'física pausa e retoma durante apagão');
ok(scene.includes("this.renderRain(time)")&&scene.includes('this.art.update(time)'),
  'chuva, poças e parallax com atualização por quadro');
console.log('APROVADO: '+checks+' verificações da Fase 02 — Floresta Temporal.');
