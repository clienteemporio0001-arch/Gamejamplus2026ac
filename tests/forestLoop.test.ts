import { readFileSync } from 'node:fs';
import { LoopAuthority, LOOP_START, LOOP_WIDTH, LOOP_CYCLE_MS, LOOP_BLACKOUT_MS, ROUTES,
  LOOP_MARKS,LOOP_TREE,LOOP_FINAL,validLoop,warningActive,blackoutActive,windGuide,
  correctRoute,layoutReachable,barriers,safeReposition,LOOP_GEOMETRY } from '../src/forestLoop';
import type { Pose,Seat } from '../src/network';
let count=0;
const ok=(yes:unknown,message:string)=>{if(!yes)throw Error('FALHA LOOP: '+message);count++};
const a=new LoopAuthority(),p:Pose[]=LOOP_START.map(x=>({...x}));
a.reset(0);
const seat=(i:number)=>i as Seat;
const goto=(id:number,x:number,y=604)=>{p[id].x=x;p[id].y=y;p[id].vx=0;p[id].vy=0};
const act=(id:number,kind:'lever'|'shoot'|'dash'|'switch',now:number)=>
 a.act(seat(id),{kind,facing:1},p,now);
ok(LOOP_WIDTH===3800,'mapa em quatro setores com 3800px');
ok(LOOP_START[0].x===1840&&LOOP_START[1].x===1900&&LOOP_START[2].x===1960,
  'nascimento central de três amigos, não na borda esquerda');
ok(LOOP_START.every(v=>v.x>LOOP_GEOMETRY.clearing.min
  &&v.x<LOOP_GEOMETRY.clearing.max&&v.y===606),
  'nascimentos sobre clareira estável');
ok(LOOP_START[0].x>800&&LOOP_START[2].x<LOOP_WIDTH-800,
  'visão da câmera central permite explorar os dois sentidos');
ok(LOOP_GEOMETRY.gate>LOOP_START[2].x+80,
  'barreira permanente não impede andar à direita da clareira');
ok(LOOP_MARKS.every(v=>v.x<LOOP_START[0].x),
  'todos os marcos ambientais estão na floresta à esquerda');
ok(LOOP_TREE.every(v=>v.x>LOOP_START[2].x)
  &&LOOP_FINAL.every(v=>v.x>LOOP_GEOMETRY.chasm.end),
  'árvore e saída ficam nas regiões à direita');

ok(LOOP_CYCLE_MS===60000&&LOOP_BLACKOUT_MS===2000,'60s e blackout de 2s');
ok(a.world.layout===0&&a.world.cycle===0&&validLoop(a.world),'estado A válido');
ok(!warningActive(a.world,49999),'sem aviso antes dos 50 segundos');
ok(warningActive(a.world,51000),'alerta aos 50s');
ok(!act(0,'lever',52000),'marcos dependem de ter observado a mudança');
ok(a.tick(p,60000).changed,'anfitrião inicia apagão aos 60s');
ok(blackoutActive(a.world,60010)&&a.world.layout===0,'física deve pausar no apagão');
ok(!a.tick(p,61000).changed,'apagão não gera mudança prematura');
ok(a.tick(p,62010).changed&&a.world.layout===1&&a.world.observed,'estado B sincronizado');
ok(a.world.cycle===1&&!blackoutActive(a.world,62010),'novo relógio só começa após apagar');
ok(validLoop(a.world),'snapshot B válido');
ok(!barriers(a.world)[1].enabled&&barriers(a.world)[2].enabled,'barreira B altera colisão');
ok(correctRoute(0)==='pedra'&&correctRoute(1)==='oca'&&correctRoute(2)==='pedra',
  'rotas determinísticas variam A/B/C');
for(const x of [0,1,2] as const){
 const cloned={...a.world,layout:x};
 ok(layoutReachable(cloned),'cada estado tem um acesso coerente');
 ok(ROUTES[x].correct!==ROUTES[x].wrong,'caminho certo distinto do falso');
}
goto(0,LOOP_MARKS[0].x,LOOP_MARKS[0].y);
ok(!act(1,'lever',62500),'Lia não pode ativar marca de Téo');
ok(act(0,'lever',62600),'Téo valida árvore oca');
goto(1,790,604);
ok(!act(2,'shoot',62900),'Nino não usa estilingue');
ok(act(1,'shoot',63000),'Lia valida pedra rachada pelo disparo');
goto(2,1090);
ok(!act(2,'dash',63500),'Nino prepara deslocamento');
goto(2,LOOP_MARKS[2].x,LOOP_MARKS[2].y);
ok(act(2,'switch',63750),'Nino valida arco após dash');
ok(a.world.marks.every(Boolean),'desafio de memória exige três habilidades');
const note=windGuide(a.world,0,1450);
ok(note.direction===-1&&note.hint.includes('ÁRVORE OCA'),'vento aponta o portal correto no estado B');
for(const i of [0,1,2])goto(i,LOOP_GEOMETRY.portal.oca+i*9);
const r=a.tick(p,64900);
ok(r.changed&&r.poses?.length===3,'passagem correta move equipe inteira');
ok(r.poses![0].x===LOOP_GEOMETRY.portalLanding&&a.world.lastRoute==='right','caminho verdadeiro avança setor');
p.splice(0,p.length,...r.poses!);
ok(a.world.marks.every(Boolean),'teleporte não apaga memória');
goto(2,2160,606);goto(1,2160,606);
ok(!a.act(0,{kind:'support'},p,65000),'Téo não pode subir sem Lia se apoiar em Nino');
ok(a.act(1,{kind:'support'},p,65030),'Lia sobe em Nino com E');
a.tick(p,65080);
goto(0,2160,562);
ok(a.act(0,{kind:'support'},p,65150),'Téo sobe em Lia após apoio físico');
a.tick(p,65200);
ok(a.world.stackMilestone&&p[0].y===p[1].y-44,'marco de apoio físico Nino-Lia-Téo');
ok(a.act(0,{kind:'detach'},p,65280),'Téo pode saltar do apoio');
ok(a.act(1,{kind:'detach'},p,65350),'Lia pode soltar Nino');
ok(a.world.supporting.every(x=>x===null),'vínculos soltos sem teleporte dos corpos');

goto(0,LOOP_TREE[0].x,LOOP_TREE[0].y);
ok(act(0,'lever',66000),'Téo solta primeira amarra');
goto(1,2060,604);
ok(act(1,'shoot',66600),'Lia corta segunda amarra');
goto(2,2115);ok(!act(2,'dash',67000),'Nino parte do lado correto');
goto(2,LOOP_TREE[2].x,LOOP_TREE[2].y);
ok(act(2,'switch',67900),'Nino libera raiz da árvore');
ok(a.world.tree.every(Boolean)&&a.world.treeFallAt===67900,'queda só após três identidades');
ok(!a.world.bridge,'ponte ainda sem colisão');
a.tick(p,68200);ok(!a.world.bridge,'não ativa collider durante animação');
ok(a.tick(p,70000).changed&&a.world.bridge,'tronco vira ponte após 1.9s');
ok(!a.world.completed,'ponte não é vitória automática');
goto(0,LOOP_FINAL[0].x,LOOP_FINAL[0].y);
ok(act(0,'lever',70500),'Téo libera primeira trava final');
goto(1,3220,602);ok(act(1,'shoot',71200),'Lia libera segunda trava final');
goto(2,3400);ok(!act(2,'dash',71800),'Nino inicia dash final');
goto(2,LOOP_FINAL[2].x,LOOP_FINAL[2].y);
ok(act(2,'switch',72600),'Nino conclui terceira trava final');
ok(a.world.final.every(Boolean),'três condições concluídas');
ok(!a.world.exit,'saída não abre antes do estado invertido C');
const saves=a.world.tree.slice();
a.world.cycleStart=75000;
ok(a.tick(p,135000).changed,'segundo ciclo A/B para C');
a.tick(p,137100);
ok(a.world.layout===2&&a.world.exit,'estado C libera saída já resolvida');
ok(a.world.tree.every((v,i)=>v===saves[i])&&a.world.bridge&&a.world.marks.every(Boolean),
  'puzzles persistem em transformações');
ok(!a.world.completed,'três jogadores ainda precisam atravessar');
for(let i=0;i<3;i++)goto(i,3715+i*15);
ok(a.tick(p,138000).won && a.world.completed,'todos três cruzam a saída verdadeira');
ok(validLoop(a.world),'snapshot final válido');
const b=new LoopAuthority(),t:Pose[]=LOOP_START.map(v=>({...v}));
b.world.layout=2;b.world.observed=true;b.world.marks=[true,true,true];
for(let i=0;i<3;i++){t[i].x=LOOP_GEOMETRY.portal.oca+i*12;t[i].y=600;}
const fail=b.tick(t,6000);
ok(fail.changed&&fail.poses![0].x===LOOP_GEOMETRY.returnCenter&&b.world.lastRoute==='wrong',
  'rota falsa retorna à árvore oca, sem matar ninguém');
ok(!b.world.completed&&b.world.deadUntil===0,'erro da rota não é fatal');
ok(windGuide(b.world,0,1400).direction===1,'vento indica caminho certo C');
const c=new LoopAuthority(),actors=LOOP_START.map(v=>({...v}));
ok(c.kill(10000)&&c.world.deadUntil>10000,'queda fatal mata equipe');
ok(!c.tick(actors,11000).reset,'derrota espera transição');
const dead=c.tick(12500);
ok(dead.reset&&dead.poses?.length===3&&c.world.layout===0&&c.world.cycle===0,
  'morte coletiva reinicia estado A e os três');
ok(!c.world.bridge&&c.world.marks.every(v=>!v),'morte limpa progresso da tentativa');
ok(!validLoop({...c.world,layout:9})&&!validLoop({...c.world,marks:[true]}),
  'pacotes inválidos rejeitados');
const net=readFileSync('src/network.ts','utf8');
const main=readFileSync('src/main.ts','utf8');
const scene=readFileSync('src/forestLoopScene.ts','utf8');
ok(net.includes("this.experience==='loop'"),'nova aventura separada da clássica');
ok(net.includes("this.experience=msg.info.mode"),'guest recebe modo do anfitrião');
ok(net.includes("if(this.experience==='loop'){\n      // A client in 'intro' ignores state packets."),
  'troca de fase publicada antes do snapshot inicial no novo multiplayer');
ok(net.includes("oldStage!=='playing'&&this.stage==='playing'"),
  'convidado recebe posições centrais ao deixar a introdução');
ok(net.includes("this.emit('snapshot',this.poses)"),
  'anfitrião emite posições iniciais centralizadas');
ok(net.includes("this.broadcast({t:'loop',world:this.loop})"),'snapshots da transformação para convidados');
ok(net.includes("this.loopAuthority.tick(this.poses,now)"),'um relógio no anfitrião');
ok(net.includes("this.startSolo(1,false,'loop')"),'nova aventura local sem PeerJS');
ok(main.includes("net.createRoom('classic')")&&main.includes("net.createRoom('loop')"),
  'duas experiências no mesmo lobby');
ok(main.includes("net.startLoopSolo()"),'modo solo novo no menu');
ok(scene.includes('new SoloBodies(this'), 'três corpos Arcade no modo solo');
ok(scene.includes('this.active(this.bridge,w.bridge)'), 'ponte física controlada pelo host');
ok(scene.includes('this.blackout.setAlpha(fade)'), 'apagão visível sem flashes');
ok(scene.includes('this.gusts.forEach'), 'vento orientado pelo estado lógico');
ok(scene.includes('this.cameras.main.centerOn(1900,420)'), 'câmera começa enquadrando a clareira');
ok(scene.includes("this.ground(LOOP_MARKS[0].x,546"),'árvore oca tem plataforma real alcançável');
ok(scene.includes("this.ground(LOOP_GEOMETRY.gate,363"),'entrada do desafio direito bloqueada por corpo físico');
ok(scene.includes('...LOOP_GEOMETRY.layoutWalls.map'), 'rochas mudam fisicamente nos estados A/B/C');
ok(scene.includes("this.load.svg('loop-clearing-tree'"), 'ilustração central original carregada localmente');
ok(scene.includes('this.movingRoots.forEach'), 'raízes se deslocam com estados do terreno');
const gravity=850,impulse=465,rise=impulse*impulse/(2*gravity);
for(const layout of [0,1,2] as const){
 const x=barriers({...a.world,layout});
 ok(x.length===5 &&x[0].enabled&&x[0].height===550,
   'portão cooperativo permanente não é ignorado em '+layout);
 ok(x.filter((barrier,i)=>i>0&&i<4&&barrier.enabled).length===1,
   'exatamente uma barreira de layout a cada estado '+layout);
 ok(x.filter((wall,i)=>i>0&&i<4&&wall.enabled).every(wall=>wall.height<rise),
   'salto supera barreiras físicas temporárias no estado '+layout);
 ok(LOOP_START.every(pose=>x.every(wall=>!wall.enabled||Math.abs(pose.x-wall.x)>50)),
   'nenhum nascimento intercepta colisões no estado '+layout);
 ok(layoutReachable({...a.world,layout}), 'puzzle de rotas possui continuidade em '+layout);
}
const trio=LOOP_START.map(q=>({...q}));
ok(safeReposition(trio,{...a.world,layout:0})===undefined,
  'posição da clareira mantida no apagão sem colisões');
trio[1].x=LOOP_GEOMETRY.layoutWalls[1];
const recovered=safeReposition(trio,{...a.world,layout:1});
ok(recovered?.every((pose,i)=>pose.x===LOOP_START[i].x),
  'apagão recupera equipe inteira quando membro está dentro de obstáculo novo');
ok(recovered?.every(pose=>pose.vx===0&&pose.vy===0),
  'reposicionamento não mantém impulsos perigosos');
const leftY=LOOP_GEOMETRY.clearing.groundY;
const treePlatformCenter=546-10-22;
ok(606-treePlatformCenter<rise,'salto alcança plataforma do marco na esquerda');
ok(LOOP_GEOMETRY.portalLanding>LOOP_GEOMETRY.gate+35,
  'ponto de teleporte seguro além da parede direita');
ok(LOOP_GEOMETRY.portalLanding+2*39<LOOP_GEOMETRY.chasm.start-30,
  'os três desembarcam sobre terreno antes do abismo');
const falseExitWind=windGuide({...a.world,layout:1,bridge:true},0,3070);
ok(falseExitWind.direction===-1&&falseExitWind.hint.includes('FALSA'),
  'vento afasta o grupo do falso acesso ao setor D no estado B');
const safeExitWind=windGuide({...a.world,layout:2,bridge:true,
  final:[false,false,false]},0,3070);
ok(safeExitWind.direction===1&&safeExitWind.hint.includes('MECANISMO'),
  'vento aponta mecanismos finais quando o layout C libera a passagem');
ok(LOOP_GEOMETRY.bridge.x-LOOP_GEOMETRY.bridge.width/2===LOOP_GEOMETRY.chasm.start &&
  LOOP_GEOMETRY.bridge.x+LOOP_GEOMETRY.bridge.width/2===LOOP_GEOMETRY.chasm.end,
  'ponte possui comprimento que fecha precisamente o abismo');
void leftY;

console.log('APROVADO: '+count+' verificações do protótipo A/B/C, desorientação, vento e cooperação.');
