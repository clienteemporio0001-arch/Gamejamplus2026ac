import {readFileSync} from 'node:fs';
import {initLoop,LOOP_START,LOOP_CYCLE_MS,LOOP_GEOMETRY,LOOP_MARKS} from '../src/forestLoop';
import {loopObjective,loopContext,loopWind,regionTitle} from '../src/forestLoopUI';

let count=0;
const ok=(v:unknown,message:string)=>{if(!v)throw Error('FALHA UI 10: '+message);count++;};
const main=readFileSync('src/main.ts','utf8');
const scene=readFileSync('src/forestLoopScene.ts','utf8');
const network=readFileSync('src/network.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
ok(pkg.scripts.test==='npm run test:logic','npm test executa suíte oficial');
for(const [id,name] of [['loop-solo','JOGAR SOZINHO'],['create','MULTIPLAYER ONLINE']]){
 ok(main.includes("button('"+id+"','"+name+"'"),'menu principal '+name);
}
ok(main.includes("void net.createRoom('loop')"),'multiplayer abre a floresta mutável');
ok(main.includes("net.startLoopSolo()"),'solo abre a mesma aventura');
ok(main.includes("button('dev-loop','TESTAR FLORESTA MUTÁVEL'"),'teste da mutável isolado');
ok(main.includes("([1,2,3,4] as const).map(level=>button('dev-classic-'"),'quatro fases clássicas em desenvolvimento');
ok(main.includes('net.startSolo(level)'),'fase clássica iniciada pela mesma API');
ok(main.includes("net.createRoom('classic')"),'sala clássica mantida como ferramenta');
ok(main.includes('<details id="dev-tools"'),'ferramentas fechadas por padrão');
ok(main.includes('<details id="loop-dev"'),'reiniciar/adiantar ficam em menu de opções');
ok(main.includes("class=\"loop-top-left\""),'estado e tempo no canto esquerdo');
ok(main.includes("class=\"loop-top-right\""),'objetivo no canto direito');
ok(main.includes("class=\"loop-bottom-left\""),'personagem e habilidade no rodapé');
ok(main.includes('class="loop-wind"'),'orientação do vento separada do objetivo');
ok(main.includes("net.isSolo?'<nav class=\"loop-seat-switch\""),'seletor solo de personagens');
ok(main.includes("if(!controls.childElementCount)bindMobile()"),'touch é mantido');
ok(main.includes("net.on('change',()=>{if(net.role==='idle')info=''"),
  'notices eliminados quando retorna ao menu');
ok(main.includes("if(net.role==='idle')return;info=text;render()"),
  'aviso novo só aparece na sessão atual');
ok(!main.includes('soloSetup'),'não mantém dois menus solo conflitantes');
for(const cssToken of ['.loop-top-left','.loop-top-right','.loop-bottom-left','.loop-wind',
  '.loop-menu-options','.dev-tools','.solo-touch-switch','@media (pointer:coarse)'])
 ok(css.includes(cssToken),'CSS '+cssToken);
for(const forbidden of ['I · FLORESTA DAS REPETIÇÕES','II · A CLAREIRA CENTRAL',
  'III · A ÁRVORE SUSPENSA','IV · A SAÍDA REAL','this.prompt','this.cycle',
  'this.info','this.wind=this.label','this.life'])
 ok(!scene.includes(forbidden),'nenhuma legenda gigante ou HUD duplicado: '+forbidden);
ok(scene.includes('this.contextText.setText(hint).setVisible(Boolean(hint))'),
  'uma dica contextual no mundo, não em overlay fixo');
ok(scene.includes('this.regionUntil=time+2000'),'título de região dura dois segundos');
ok(scene.includes('.setScrollFactor(0).setDepth(90)'),'título de região fica ancorado à tela');
ok(scene.includes('this.cameras.main.startFollow(this.local'),'câmera segue jogador local');
ok(scene.includes('this.solo?.select(seat)'),'seleção física de jogador em solo');
ok(scene.includes('this.load.svg')&&scene.includes('this.clearingTree'),'arte SVG original permanece');
ok(scene.includes('this.active(this.bridge,w.bridge)'),'colisão da ponte preservada');
ok(network.includes('private sessionEpoch=0'),'sessões possuem época monotônica');
ok(network.includes('this.sessionEpoch++'),'shutdown invalida tarefas antigas');
ok(network.includes("this.peer!==peer||this.shuttingDown||this.role!=='host'"),
  'callbacks antigos do host ignorados');
ok(network.includes("this.peer!==peer||this.shuttingDown||this.role!=='guest'"),
  'callbacks antigos de guest ignorados');
ok(network.includes("if(this.sessionEpoch!==epoch || this.shuttingDown||this.role!=='host')return;"),
  'falha de createRoom antiga não pode cancelar sessão nova');
ok(network.includes("this.sessionToken='';this.reconnectDeadline=0;"),'limpeza de token e prazo');
ok(network.includes("this.stopReconnect()")&&network.includes("this.grace.clear()"),
  'limpeza de intervalos e reserva de seats');
const solo=network.slice(network.indexOf('  startSolo('),network.indexOf('  selectSoloSeat('));
ok(!solo.includes('new Peer(')&&!solo.includes('this.peer.connect'),'solo não instancia WebRTC');
ok(network.includes("this.poses=(mode==='loop'?LOOP_START:"),'spawn solo correto');
ok(network.includes("this.poses = (this.experience==='loop'?LOOP_START:FOREST_SPAWNS)"),
  'mesmo spawn para host online');
ok(network.includes("this.broadcast({t:'loop',world:this.loop})"),'A/B/C sincronizados pelo host');
ok(LOOP_START[0].x===1840&&LOOP_START[1].x===1900&&LOOP_START[2].x===1960,
  'spawn central inalterado');
ok(LOOP_CYCLE_MS===60000&&LOOP_GEOMETRY.gate===2070,'tempo e geometria preservados');

const w=initLoop(1000);
const expect=(name:string,progress:string)=>{
 const obj=loopObjective(w);ok(obj.title===name&&obj.progress===progress,'objetivo: '+name);
};
expect('Observe os marcos da floresta.','Memorize os três');
ok(loopWind(w,0,1900).startsWith('◀'),'vento inicial aponta para a esquerda');
ok(loopContext(w,0,1900,606,1001)==='','sem legenda ao nascer longe do puzzle');
w.observed=true;
expect('Algo mudou. Sigam o vento.','Marcos 0/3');
ok(loopContext(w,0,LOOP_MARKS[0].x,480,1001).includes('E'),
  'Téo vê comando próximo da árvore');
ok(loopContext(w,0,1900,606,1001)==='','sem comandos de puzzle fora de alcance');
ok(loopContext(w,1,LOOP_MARKS[1].x-160,606,1001).includes('J'),
  'Lia vê comando somente perto da pedra');
ok(loopContext(w,2,LOOP_MARKS[2].x-150,606,1001).includes('SHIFT'),
  'Nino vê comando somente perto da raiz');
w.marks=[true,true,true];
expect('Encontrem a passagem verdadeira.','Três amigos juntos');
w.lastRoute='right';
expect('Trabalhem juntos para derrubar a árvore.','Amarras 0/3');
w.tree=[true,false,true];
expect('Trabalhem juntos para derrubar a árvore.','Amarras 2/3');
w.bridge=true;
expect('Destravem a saída juntos.','Travas 0/3');
w.final=[true,true,true];
expect('Aguardem a floresta C.','Travas 3/3');
w.exit=true;
expect('Reúnam os três na saída.','Equipe 0/3');
w.completed=true;
expect('A equipe encontrou a saída.','3 / 3');
ok(regionTitle(1900)==='CLAREIRA CENTRAL'&&regionTitle(2500)==='ÁRVORE SUSPENSA',
  'regiões etiquetadas por entrada, não legendas permanentes');
console.log('APROVADO: '+count+' verificações da Etapa 10 (HUD, menu, sessões e contexto).');
