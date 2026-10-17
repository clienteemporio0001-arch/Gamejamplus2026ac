import { ForestAuthority, FOREST_WIDTH, FOREST_SPAWNS, FOREST_CHECKPOINTS,
  FOREST_GATES, canAdvanceForest, forestHint,
  CABO_X, FOREST_VINES, TREE_ACTIONS, branchWarning, forestDanger, validForest } from '../src/forest';
import type { Pose, Seat } from '../src/network';
let count=0;
function ok(value:unknown,why:string):void{if(!value)throw Error('FALHA: '+why);count++;}
const f=new ForestAuthority(),poses=FOREST_SPAWNS.map(p=>({...p}));
ok(FOREST_WIDTH===4300&&FOREST_CHECKPOINTS[4]>3000,'mundo ampliado e checkpoints');
ok(validForest(f.world),'estado inicial validável');
ok(!f.hasWon(poses),'não termina sozinho');
ok(!f.world.unlocked&&f.world.health.every(h=>h===3),'Téo bloqueado e três corações');
ok(!f.act(0,{kind:'collect'},poses,1000),'coleta antes do Caboquim bloqueada');
for(const p of poses){p.x=CABO_X;p.y=590;}
ok(f.tick(poses,1000).changed&&f.world.caboStep===1,'encontro coletivo automático');
ok(!f.act(0,{kind:'talk'},poses,1080),'diálogo anti-spam');
for(const t of [1500,2100,2700,3300])ok(f.act(1,{kind:'talk'},poses,t),'continuação conjunta '+t);
ok(f.world.unlocked&&f.world.caboStep===5,'Téo recebe salto duplo');
ok(!f.act(1,{kind:'talk'},poses,3900),'diálogo idempotente');
for(const p of poses){p.x=1470;p.y=591;p.vx=0;}
ok(!f.act(0,{kind:'support'},poses,4000),'Téo só sobe com Lia apoiada');
ok(f.act(1,{kind:'support'},poses,4010),'Lia apoia sobre Nino');
f.tick(poses,4020);
ok(poses[1].y===poses[2].y-44,'vínculo ajusta altura de Lia');
ok(f.act(0,{kind:'support'},poses,4050),'Téo se apoia sobre Lia');
f.tick(poses,4070);
ok(f.world.stackMilestone&&poses[0].y===poses[1].y-44,'três personagens empilhados fisicamente');
ok(f.world.supporting[0]===1&&f.world.supporting[1]===2,'apoios sem ciclos');
ok(f.act(0,{kind:'detach'},poses,4120),'Téo salta ao soltar vínculo');
ok(f.world.supporting[0]===null&&f.world.stackMilestone,'marco cooperativo permanece');
poses[0].x=FOREST_VINES[0].x;poses[0].y=FOREST_VINES[0].y;
ok(f.act(0,{kind:'collect'},poses,4300),'Téo coleta cipó da árvore');
ok(!f.act(0,{kind:'collect'},poses,4310),'cipó coletado uma única vez');
poses[1].x=FOREST_VINES[1].x-195;poses[1].y=FOREST_VINES[1].y+18;
ok(f.act(1,{kind:'shoot',facing:1},poses,4900),'Lia libera segundo cipó');
ok(!f.act(2,{kind:'collect'},poses,5000),'Nino precisa passar pelo percurso');
poses[2].x=2890;poses[2].y=590;
ok(!f.act(2,{kind:'dash',facing:1},poses,5200),'Nino inicia dash');
poses[2].x=FOREST_VINES[2].x;poses[2].y=FOREST_VINES[2].y;
ok(f.act(2,{kind:'collect'},poses,5790),'Nino alcança terceiro cipó com dash');
ok(f.world.vines.every(Boolean),'contador cooperativo completo 3/3');
ok(!f.hasWon(poses),'cipós não bastam para a saída');
poses[0].x=TREE_ACTIONS.teo.x;poses[0].y=TREE_ACTIONS.teo.y;
ok(f.act(0,{kind:'lever'},poses,6000),'Téo libera mecanismo no alto');
poses[1].x=TREE_ACTIONS.lia.x-170;poses[1].y=TREE_ACTIONS.lia.y+18;
ok(f.act(1,{kind:'shoot',facing:1},poses,6100),'Lia corta amarra da árvore');
poses[2].x=3230;poses[2].y=590;
ok(!f.act(2,{kind:'dash',facing:1},poses,6220),'Nino registra arrancada final');
poses[2].x=TREE_ACTIONS.nino.x;poses[2].y=TREE_ACTIONS.nino.y;
ok(f.act(2,{kind:'switch'},poses,6760),'Nino solta última raiz');
ok(f.world.treeSteps.every(Boolean)&&f.world.treeFallAt===6760,'árvore inicia queda autorizada');
f.tick(poses,7000);
ok(!f.world.bridge,'ponte sem colisão enquanto anima');
ok(f.tick(poses,8690).changed&&f.world.bridge,'ponte torna-se sólida após 1.9s');
for(const p of poses){p.x=4160;p.y=590;}
ok(f.hasWon(poses),'três amigos vivos atravessam após todos os puzzles');
ok(forestDanger(990,590,1000,2000)==='snake','cobra sinaliza perigo');
ok(branchWarning(1000,3990)==='warn','galho oferece aviso');
ok(forestDanger(2720,590,1000,4800)==='branch','galho causa dano na janela');
ok(f.damage(1,10000)&&f.world.health[1]===2,'cobra tira um coração');
ok(!f.damage(1,10100)&&f.world.health[1]===2,'invulnerabilidade 1.2s');
ok(f.damage(1,11300)&&f.world.health[1]===1,'segundo contato causa dano');
ok(f.damage(1,12600)&&f.world.health[1]===0&&f.world.restartAt===15800,'terceiro dano encerra rodada');
ok(!f.hasWon(poses),'vitória bloqueada durante reinício');
ok(!f.tick(poses,15100).reset,'contagem regressiva conjunta');
ok(f.tick(poses,15801).reset,'reset autorizado pelo anfitrião');
ok(f.world.health.every(h=>h===3),'três corações restaurados');
ok(!f.world.unlocked&&f.world.vines.every(v=>!v),'Téo reconquista habilidade e puzzles no reinício');
ok(validForest(f.world),'snapshot válido após reinício');

// Regressão: um grupo novo NÃO atravessa a mata sem falar com Caboquim.
const newRun=new ForestAuthority(),team=FOREST_SPAWNS.map(p=>({...p}));
ok(!canAdvanceForest(newRun.world,1),'portão de Caboquim fechado ao criar sala');
ok(!canAdvanceForest(newRun.world,4),'portão dos cipós fechado com 0/3');
for(const p of team){p.x=2000;p.y=590;}
newRun.tick(team,10000);
ok(newRun.world.checkpoint===0,'explorar longe não ignora pré-requisitos de checkpoint');
ok(!newRun.act(2,{kind:'collect'},team,10100),'cipó não reage antes do diálogo');
for(const p of team){p.x=CABO_X;p.y=590;}
ok(newRun.tick(team,10500).changed,'encontro conjunto ativa Caboquim');
for(const ts of [11000,11500,12000,12500]){
  ok(newRun.act(1,{kind:'talk'},team,ts),'diálogo termina cooperativamente');
}
ok(canAdvanceForest(newRun.world,1),'passagem de Caboquim abre com a habilidade liberada');
ok(!canAdvanceForest(newRun.world,4),'portão do abismo permanece fechado sem 3/3');
ok(forestHint(newRun.world,2,3060).includes('SHIFT + →'),
  'Nino recebe dica ao encostar no cipó sem usá-lo');
ok(forestHint(newRun.world,1,2500).includes('J'),
  'Lia recebe instrução do estilingue');
ok(forestHint(newRun.world,0,1750).includes('Lia'),
  'Téo recebe dica sobre empilhamento');
ok(FOREST_GATES.cabo<1200 && FOREST_GATES.vines>3000,
  'duas barreiras em pontos distintos da fase');
ok(690>2*(465*465/(2*850))*2,
  'barreiras altas não são ultrapassadas pelo salto duplo');
const inv=new ForestAuthority(),arr=FOREST_SPAWNS.map(p=>({...p}));
inv.world.caboStep=5;inv.world.unlocked=true;
arr[2]={...arr[2],x:2910,y:590};
ok(!inv.act(2,{kind:'dash',facing:1},arr,30000),
  'Nino inicia dash no marcador anterior ao cipó');
arr[2]={...arr[2],x:3060,y:582};
ok(inv.act(2,{kind:'collect'},arr,31300),
  'Nino coleta passando pelo cipó após 1,3s com tolerância de latência');
ok(!inv.act(2,{kind:'collect'},arr,31400),
  'coleta de Nino é idempotente');
inv.world.vines=[true,true,true];
ok(canAdvanceForest(inv.world,4),
  'portão das raízes abre quando os três cipós foram coletados');
ok(forestHint(inv.world,0,3310).includes('Téo'),
  'depois dos 3 cipós, instruções passam à árvore');

console.log('APROVADO: '+count+' verificações da floresta ampliada, escalada e sobrevivência.');
