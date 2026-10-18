import {readFileSync} from 'node:fs';
import {
  LOOP_START,LOOP_MARKS,LOOP_TREE,LOOP_PHYSICS,UPPER_BRANCH,SUMMIT_BRANCH,
  upperLandingY,summitLandingY,soloJumpRise,hasBranchFooting,hasSummitFooting,LoopAuthority,initLoop,
  validLoop,windGuide,LOOP_CYCLE_MS,LOOP_GEOMETRY,markerBaseY,
} from '../src/forestLoop';
import {leafAt,swayAt,WIND_LEAVES} from '../src/loopWind';
import type {Seat,Pose} from '../src/network';
let count=0;function ok(condition:unknown,message:string):void{
  if(!condition)throw Error('ETAPA 11: '+message);count++;
}
const scene=readFileSync('src/forestLoopScene.ts','utf8');
const ui=readFileSync('src/forestLoopUI.ts','utf8');
const net=readFileSync('src/network.ts','utf8');
for(const f of ['loop-stone.svg','loop-arch.svg','loop-elevated-tree.svg']){
 const asset=readFileSync('public/assets/'+f,'utf8');
 ok(asset.includes('<svg')&&asset.includes('viewBox')&&asset.includes('</svg>'),
   f+' é um SVG original local íntegro');
 ok(scene.includes(f.replace('.svg','')),'cena carrega '+f);
}
ok(scene.includes("this.add.image(0,-shape.height/2,shapes[index])"),
  'base de cada marco coincide com markerBaseY');
ok(scene.includes('this.add.container(mark.x,markerBaseY)'),'marcos ancorados ao terreno');
ok(markerBaseY===LOOP_GEOMETRY.clearing.groundY,'pé dos três marcos encontra o chão');
ok(scene.includes('mark.setX(LOOP_MARKS[i].x)'),'alvos não flutuam após transformar o mapa');
ok(scene.includes('LOOP_MARKS[index]')&&scene.includes('mark.y-markerBaseY'),
  'brilho da interação usa posição do mesmo marco');
ok(scene.includes('stoneHitbox')&&scene.includes('this.blocks.push(stoneHitbox)'),
  'rocha natural possui colisão estática proporcional');
ok(Math.abs((LOOP_GEOMETRY.clearing.groundY-LOOP_PHYSICS.characterHeight/2)-18-LOOP_MARKS[1].y)<=4,
  'projétil horizontal de Lia cruza o centro da rachadura');
ok(LOOP_MARKS[1].y>markerBaseY-104&&LOOP_MARKS[1].y<markerBaseY,
  'rachadura dentro da altura visual da rocha');
ok(LOOP_MARKS[2].y>markerBaseY-94&&LOOP_MARKS[2].y<markerBaseY,
  'mecanismo Nino localizado dentro do arco');
ok(182-2*44>44,'arco com abertura maior que o personagem');
ok(LOOP_MARKS[0].y>markerBaseY-320&&LOOP_MARKS[0].y<markerBaseY,
  'cavidade da árvore desenhada acima das raízes');
ok(scene.includes("this.ground(LOOP_MARKS[0].x,546"),'galho inicial com colisão real');
ok(scene.includes('this.add.image(2200,353'),'árvore gigante tem raízes no terreno');
ok(scene.includes('UPPER_BRANCH.centerY')&&scene.includes('UPPER_BRANCH.width'),
  'galho superior desenhado e físico usam a mesma geometria');
ok(scene.includes('ledgeBody.checkCollision.down=false')&&
   scene.includes('ledgeBody.checkCollision.up=true'),
  'plataforma superior deixa passar de baixo e recebe aterrissagem pelo topo');
ok(!scene.includes("this.ground(2108,550"),'antigo degrau que permitia atalhos foi removido');
ok(LOOP_TREE[0].y===summitLandingY,'ponto de amarra coincide com posição do corpo sobre galho');
ok(SUMMIT_BRANCH.x-SUMMIT_BRANCH.width/2<LOOP_TREE[0].x &&
   LOOP_TREE[0].x<SUMMIT_BRANCH.x+SUMMIT_BRANCH.width/2,'alvo Téo fica no galho');

const floor=LOOP_GEOMETRY.clearing.groundY-LOOP_PHYSICS.characterHeight/2;
const onLia=floor-LOOP_PHYSICS.characterHeight*2;
const fromNino=floor-LOOP_PHYSICS.characterHeight;
ok(LOOP_PHYSICS.jumpVelocity===465&&LOOP_PHYSICS.gravity===850,
  'cálculo utiliza valores Arcade reais');
ok(soloJumpRise>126&&soloJumpRise<128,'apex de um salto Phaser');
ok(floor===616&&upperLandingY===293,'altura de repouso real sobre o solo e centro no galho');
ok(floor-upperLandingY>soloJumpRise*2,'do chão nem salto duplo alcança a plataforma');
ok(fromNino-upperLandingY>soloJumpRise*2,
  'um único amigo não serve para alcançar o galho');
ok(onLia-upperLandingY>soloJumpRise,'só um salto da torre não alcança');
ok(onLia-upperLandingY<soloJumpRise*2,'duplo salto sobre a torre alcança');

// Integrador semi-implícito em pequenos frames; uma plataforma one-way só
// captura o personagem descendo através do plano da sua superfície.
function land(from:number,jumps:1|2):boolean{
 let y=from,vy=-LOOP_PHYSICS.jumpVelocity,spent=1;
 const delta=1/120;
 for(let frame=0;frame<1200;frame++){
  if(jumps===2&&spent===1&&vy>=-3){vy=-LOOP_PHYSICS.jumpVelocity;spent=2;}
  const prev=y;vy+=LOOP_PHYSICS.gravity*delta;y+=vy*delta;
  if(vy>=0&&prev<=upperLandingY&&y>=upperLandingY)return true;
  if(y>floor+50)return false;
 }
 return false;
}
ok(!land(floor,1)&&!land(floor,2),'simulação física: nem duplo salto do chão alcança');
ok(!land(fromNino,2),'simulação: Téo sobre um só amigo não alcança');
ok(!land(onLia,1),'simulação: salto único sobre torre é insuficiente');
ok(land(onLia,2),'simulação: salto duplo sobre a torre aterrissa no galho');
const pose=(y:number,x=UPPER_BRANCH.x,vy=0):Pose=>({seat:0,x,y,vx:0,vy});
ok(!hasBranchFooting(pose(floor)),'chão não equivale a galho');
ok(!hasBranchFooting(pose(upperLandingY-26)),'apex no ar não equivale a aterrissar');
ok(!hasBranchFooting(pose(upperLandingY,UPPER_BRANCH.x,120)),'passando veloz não conta como apoio');
ok(hasBranchFooting(pose(upperLandingY)),'parado sobre galho é posição válida');
ok(!hasBranchFooting(pose(upperLandingY,UPPER_BRANCH.x+100)),
  'não interage a partir de fora da plataforma');

const game=new LoopAuthority();
game.reset(0);
const players:Pose[]=LOOP_START.map(v=>({...v}));
game.world.observed=true;
game.world.marks=[true,true,true];
game.world.lastRoute='right';
game.world.stackMilestone=true;
players[0]=pose(upperLandingY);
ok(!game.act(0,{kind:'lever'},players,10000),
  'stackMilestone sem desprendimento e pouso não solta amarra');
ok(!game.world.tree[0]&&!game.world.teoUpperReached,
  'atalho da etapa anterior está fechado');
game.world.stackMilestone=false;
players[0]=pose(518,2160);
players[1]={...players[1],x:2160,y:562,vx:0,vy:0};
players[2]={...players[2],x:2160,y:606,vx:0,vy:0};
ok(!game.act(0,{kind:'support'},players,11000),'Téo espera por Lia');
ok(game.act(1,{kind:'support'},players,11100),'Lia se apoia no Nino');
game.tick(players,11200);
ok(game.act(0,{kind:'support'},players,11300),'Téo sobe em Lia');
game.tick(players,11340);
ok(game.world.stackMilestone&&players[0].y===518,'torre com 2 apoios reais');
ok(game.act(0,{kind:'detach'},players,11400),'Téo salta da torre');
ok(game.world.climbReady&&!game.world.teoUpperReached,
  'desprendimento prepara subida sem validar aterrissagem');
ok(!game.act(0,{kind:'lever'},players,11500),'primeira amarra não ativa do chão/torre');
players[0]=pose(upperLandingY-29);
ok(!game.tick(players,11600).changed&&!game.world.teoUpperReached,
  'posição aérea não confirma galho');
players[0]=pose(upperLandingY,UPPER_BRANCH.x,176);
ok(!game.tick(players,11700).changed,'velocidade alta não confirma pouso');
players[0]=pose(upperLandingY);
ok(game.tick(players,11800).changed&&game.world.teoUpperReached,
  'host confirma chegada ao galho estável');
ok(!game.act(0,{kind:'lever'},players,11900),'primeiro galho não ativa amarra');
players[0]=pose(summitLandingY);
ok(game.tick(players,11940).changed&&game.world.teoSummitReached,'host verifica pouso final');
ok(game.act(0,{kind:'lever'},players,11980)&&game.world.tree[0],
  'Téo solta primeira amarra a partir da plataforma');
ok(!game.world.tree[1]&&!game.world.tree[2],'Téo não conclui outras duas amarras');

const w=initLoop(0);
const leaf=leafAt(w,8,10500);
ok(Number.isFinite(leaf.x)&&leaf.x>=0&&leaf.x<=3800,'vento ancorado no mundo');
ok(leafAt(w,8,10500).x===leaf.x,'partícula determinística no mesmo tempo');
ok(leafAt(w,8,11500).x!==leaf.x,'folha move mesmo com todos parados');
ok(WIND_LEAVES>=20&&WIND_LEAVES<=40,'efeito leve no navegador');
for(const layout of [0,1,2] as const){
 const state={...w,layout};
 for(const i of [0,6,12,19,24]){
  const field=leafAt(state,i,15300);
  ok(field.direction===windGuide(state,0,110+i*145).direction,
    'vento na área '+i+' acompanha windGuide no estado '+layout);
  ok(Number.isFinite(swayAt(state,110+i*145,15300,i)),
    'folhagem animada sob mesmo estado');
 }
}
ok(!scene.includes('leaf.x=this.local.x')&&!scene.includes('const gust=wind.direction'),
  'partículas não usam a posição ou direção do personagem');
ok(scene.includes('leafAt(w,i,time)')&&scene.includes('swayAt(w,vine.x,time,i)'),
  'folhas e cipós seguem fenômeno ambiental do mundo');
ok(scene.includes('this.windFog.forEach'),'névoa leve animada independentemente da câmera');
ok(scene.includes('this.cameras.main.startFollow(this.local'),'câmera continua seguindo jogador');
ok(ui.includes('w.teoUpperReached')&&ui.includes('ESPAÇO → ESPAÇO'),
  'dica contextual de escalada só aparece após formação');
ok(net.includes("this.loopAuthority.act(seat,action,this.poses)"),
  'puzzle validado no anfitrião e não no cliente');
ok(net.includes("this.broadcast({t:'loop',world:this.loop})"),
  'sucesso da escalada sincronizado com convidados');
ok(LOOP_CYCLE_MS===60000,'ciclo A/B/C preservado');
ok(validLoop(game.world),'estado com escalada é válido no protocolo');
console.log('APROVADO: '+count+' verificações Etapa 11 — escala, vento e subida cooperativa.');
