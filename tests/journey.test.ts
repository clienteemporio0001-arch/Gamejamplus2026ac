import { JourneyAuthority, RIVER_WIDTH, JOURNEY, MATERIALS,
  JOURNEY_SPAWNS, JOURNEY_CHECKPOINTS, validJourney,
  validMotion, floatingLogs, jumpRise, jumpRange, isGapJumpFeasible,
  PHYSICS, journeyDanger, journeyBranchPhase } from '../src/riverJourney';
import { nextPlayableLevel } from '../src/levels';
import type { Pose, Seat } from '../src/network';
import { ForestAuthority } from '../src/forest';

let count=0;function ok(value:unknown,label:string):void{if(!value)throw Error('FALHA: '+label);count++;}
const start=():Pose[]=>JOURNEY_SPAWNS.map(p=>({...p}));
const hero=start(),act=new JourneyAuthority(),unlocked=[true,true,true];
const at=(seat:Seat,x:number,y=591):void=>{hero[seat].x=x;hero[seat].y=y;hero[seat].vx=0;hero[seat].vy=0;};
const call=(seat:Seat,kind:'collect'|'support'|'detach'|'shoot'|'dash'|'lever'|'timer'|'switch',now:number,
 facing?:-1|1)=>act.act(seat,{kind,facing},hero,unlocked,now);

ok(RIVER_WIDTH===4300 && JOURNEY_CHECKPOINTS[4]>3300,'mundo da fase 2 tem 4300px');
ok(nextPlayableLevel(1)===2&&nextPlayableLevel(2)===3,'transição 1→2→3 preservada');
ok(validJourney(act.world),'snapshot da fase 2 válido');
ok(!act.hasWon(hero),'vitória bloqueada no início');
ok(jumpRise()>125&&jumpRise()<130,'salto com gravidade 850 e velocidade 465');
ok(jumpRange()>250&&jumpRange()<260,'alcance horizontal real de pulo simples');
ok(!isGapJumpFeasible(420),'abismo principal impossível sem ponte ou plataformas');
ok(isGapJumpFeasible(180),'saltos entre tábuas temporárias são viáveis');
ok(503-jumpRise()+PHYSICS.playerHalfHeight<424,'Fase 1: Téo empilhado alcança galho intermediário');
ok(424-PHYSICS.playerHalfHeight-jumpRise()+PHYSICS.playerHalfHeight<309,
  'Fase 1: galho intermediário permite segundo salto à copa');
ok(503-jumpRise()+PHYSICS.playerHalfHeight<432,'Fase 2: cooperação permite alcançar primeiro galho');
ok(432-PHYSICS.playerHalfHeight-jumpRise()+PHYSICS.playerHalfHeight<349,
  'Fase 2: segundo salto alcança cipó alto');
ok(!call(0,'collect',1200),'Téo não coleta sem escalada');
[0,1,2].forEach(i=>at(i as Seat,1120));
ok(!call(0,'support',1300),'Téo não pode apoiar sem Lia');
ok(call(1,'support',1320),'Lia usa Nino como base');
act.tick(hero,1340);
ok(hero[1].y===hero[2].y-44,'apoio transforma a posição real de Lia');
ok(call(0,'support',1370),'Téo sobe sobre Lia');
act.tick(hero,1400);
ok(hero[0].y===hero[2].y-88 && act.world.stackMilestone,
  'empilhamento estável dos três jogadores');
ok(!call(2,'support',1450),'Nino não forma ciclo de apoio');
ok(call(0,'detach',1480),'Téo solta apoio para saltar');
at(0,MATERIALS[0].x,MATERIALS[0].y);
ok(call(0,'collect',2000),'Téo obtém conjunto de cipós superior');
ok(!call(0,'collect',2100),'coleta de Téo idempotente');
at(1,1370,590);
ok(!call(0,'shoot',2200,1),'Téo não pode usar estilingue');
ok(call(1,'shoot',2400,1),'Lia desprende segundo conjunto de cipós');
at(2,1810,590);
ok(!call(2,'dash',3100,1),'Nino registra dash');
at(2,MATERIALS[2].x,MATERIALS[2].y);
ok(call(2,'collect',3850),'Nino alcança terceiro conjunto via dash');
ok(act.world.materials.every(Boolean),'materiais 3/3 compartilhados');
ok(!call(2,'collect',3870),'Nino não duplica material');
ok(!act.hasWon(hero),'materiais não declaram vitória');

at(0,JOURNEY.anchor.x,JOURNEY.anchor.y);
ok(call(0,'lever',4100),'Téo fixa primeira ponta');
at(1,2255,598);
ok(call(1,'shoot',4600,1),'Lia liberta contrapeso com disparo');
at(2,JOURNEY.timer.x,JOURNEY.timer.y);
ok(call(2,'timer',5100),'Nino abre passagem temporária');
ok(act.world.tempUntil===14100,'janela de 9 segundos tolerante à rede');
at(2,2290,590);
ok(!call(2,'dash',5400,1),'dash Nino durante a janela');
at(2,JOURNEY.farFix.x,JOURNEY.farFix.y);
ok(call(2,'switch',6500),'Nino prende a segunda ponta da ponte');
ok(act.world.bridgeFallAt===6500&&!act.world.bridgeReady,'colisão desativada durante queda');
act.tick(hero,6900);
ok(!act.world.bridgeReady,'ponte ainda sem colisão durante a animação');
ok(act.tick(hero,8601).changed && act.world.bridgeReady,
  'colisão só após animação de 2,1 segundos');
ok(!act.hasWon(hero),'ponte 1 pronta ainda não é vitória');

const now=10300,logs=floatingLogs(now,act.world.hazardEpoch);
ok(logs[0]>=3045&&logs[0]<=3125&&logs[1]>=3188&&logs[1]<=3258,
  'troncos dentro do corredor físico');
ok(validMotion({logs,now}),'pacote de troncos validado');
ok(!validMotion({logs:[9999,0],now}),'pacote de tronco forjado rejeitado');

at(2,JOURNEY.plate.x,JOURNEY.plate.y);
ok(act.tick(hero,11000).changed && act.world.pressure,'Nino mantém plataforma ativa');
at(1,3630,590);
ok(call(1,'shoot',12000,1),'Lia atira no mecanismo final');
ok(act.world.finalShotUntil===18800,'janela final de 6,8s');
at(0,JOURNEY.finalLever.x,JOURNEY.finalLever.y);
ok(call(0,'lever',12500),'Téo ativa corda superior');
ok(!act.world.finalReady&&act.world.finalFallAt===12500,'ponte final ainda sem colisão');
ok(act.tick(hero,14350).changed&&act.world.finalReady,'ponte final fisicamente habilitada');
ok(!act.hasWon(hero),'três precisam se reunir na saída');
for(const p of hero){p.x=4190;p.y=592;}
ok(act.hasWon(hero),'vitória com três vivos, todos os puzzles e materiais');
ok(journeyDanger({...hero[0],x:760,y:590},1000,2500)==='snake','cobra causa perigo');
ok(journeyBranchPhase(1000,4000)==='warn','aviso antecipado dos galhos');
ok(journeyDanger({...hero[0],x:3380,y:590},1000,5000)==='branch','galho cai após aviso');
ok(act.damage(1,20000)&&act.world.health[1]===2,'cobra tira um coração');
ok(!act.damage(1,20500)&&act.world.health[1]===2,'invulnerabilidade 1,2s');
ok(act.damage(1,21300)&&act.world.health[1]===1,'novo dano após invulnerabilidade');
ok(act.damage(1,22600,true)&&act.world.health[1]===0,
  'queda na correnteza provoca morte imediata');
ok(act.world.restartAt===25800&&!act.hasWon(hero),'morte suspende vitória');
ok(!act.tick(hero,25000).reset,'contagem de reinício respeitada');
ok(act.tick(hero,25801).reset,'reinício coletivo da fase 2');
ok(act.world.health.every(h=>h===3),'três corações restaurados');
ok(act.world.materials.every(x=>!x)&&!act.world.bridgeReady&&act.world.checkpoint===0,
  'materiais pontes e checkpoints reiniciados');
ok(validJourney(act.world),'snapshot de reconexão após reinício');
ok(!act.hasWon(hero),'reinício não declara vitória');
const f=new ForestAuthority();
ok(f.world.health.every(h=>h===3),'sobrevivência compartilhada preserva Fase 1');
ok(f.damage(0,30000)&&f.world.health[0]===2,'Fase 1 também usa módulo de dano');
console.log('APROVADO: '+count+' verificações de travessia, alcance, construção e sobrevivência.');
