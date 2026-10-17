import { readFileSync } from 'node:fs';
import { LoopAuthority, LOOP_START, LOOP_WIDTH, LOOP_CYCLE_MS, LOOP_BLACKOUT_MS, ROUTES,
  LOOP_MARKS,LOOP_TREE,LOOP_FINAL,validLoop,warningActive,blackoutActive,windGuide,
  correctRoute,layoutReachable,barriers } from '../src/forestLoop';
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
ok(LOOP_CYCLE_MS===60000&&LOOP_BLACKOUT_MS===2000,'60s e blackout de 2s');
ok(a.world.layout===0&&a.world.cycle===0&&validLoop(a.world),'estado A válido');
ok(!warningActive(a.world,50000),'sem aviso antes dos 50 segundos');
ok(warningActive(a.world,51000),'alerta aos 50s');
ok(!act(0,'lever',52000),'marcos dependem de ter observado a mudança');
ok(a.tick(p,60000).changed,'anfitrião inicia apagão aos 60s');
ok(blackoutActive(a.world,60010)&&a.world.layout===0,'física deve pausar no apagão');
ok(!a.tick(p,61000).changed,'apagão não gera mudança prematura');
ok(a.tick(p,62010).changed&&a.world.layout===1&&a.world.observed,'estado B sincronizado');
ok(a.world.cycle===1&&!blackoutActive(a.world,62010),'novo relógio só começa após apagar');
ok(validLoop(a.world),'snapshot B válido');
ok(barriers(a.world)[2].enabled===false&&barriers(a.world)[1].enabled,'barreira B altera colisão');
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
goto(1,1120,604);
ok(!act(2,'shoot',62900),'Nino não usa estilingue');
ok(act(1,'shoot',63000),'Lia valida pedra rachada pelo disparo');
goto(2,1335);
ok(!act(2,'dash',63500),'Nino prepara deslocamento');
goto(2,LOOP_MARKS[2].x,LOOP_MARKS[2].y);
ok(act(2,'switch',63750),'Nino valida arco após dash');
ok(a.world.marks.every(Boolean),'desafio de memória exige três habilidades');
const note=windGuide(a.world,0,1450);
ok(note.direction===1&&note.hint.includes('ÁRVORE OCA'),'vento aponta o portal correto no estado B');
for(const i of [0,1,2])goto(i,1540+i*10);
const r=a.tick(p,64900);
ok(r.changed&&r.poses?.length===3,'passagem correta move equipe inteira');
ok(r.poses![0].x===1880&&a.world.lastRoute==='right','caminho verdadeiro avança setor');
p.splice(0,p.length,...r.poses!);
ok(a.world.marks.every(Boolean),'teleporte não apaga memória');
goto(0,LOOP_TREE[0].x,LOOP_TREE[0].y);
ok(act(0,'lever',66000),'Téo solta primeira amarra');
goto(1,2060,604);
ok(act(1,'shoot',66600),'Lia corta segunda amarra');
goto(2,2070);ok(!act(2,'dash',67000),'Nino parte do lado correto');
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
for(let i=0;i<3;i++){t[i].x=1540+i*12;t[i].y=600;}
const fail=b.tick(t,6000);
ok(fail.changed&&fail.poses![0].x===975&&b.world.lastRoute==='wrong',
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
console.log('APROVADO: '+count+' verificações do protótipo A/B/C, desorientação, vento e cooperação.');
