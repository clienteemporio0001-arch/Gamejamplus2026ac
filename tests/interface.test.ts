import {readFileSync} from 'node:fs';
import {initLoop,LOOP_START,LOOP_CYCLE_MS,LOOP_GEOMETRY,LOOP_MARKS,markPosition} from '../src/forestLoop';
import {loopObjective,loopContext,loopWind,regionTitle} from '../src/forestLoopUI';

let count=0;
const ok=(v:unknown,message:string)=>{if(!v)throw Error('FALHA UI 10: '+message);count++;};
const main=readFileSync('src/main.ts','utf8');
const scene=readFileSync('src/forestLoopScene.ts','utf8');
const network=readFileSync('src/network.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
ok(pkg.scripts.test==='npm run test:logic','npm test executa suíte oficial');

/** 27s cutscene regression: never advance the multiplayer room at 24 seconds. */
ok(network.includes('export const INTRO_WATCHDOG_MS=180_000'),
  'introdução tem watchdog de segurança, não temporizador de 24 segundos');
ok(!network.includes('Date.now()+24000')&&!network.includes('Date.now() + 24000'),
  'timer antigo não pode cortar o vídeo');
ok(network.includes("this.introDone.add(seat)")&&
   network.includes("this.introDone.add(this.localSeat)")&&
   network.includes("this.players.every(p=>this.introDone.has(p.seat))"),
   'anfitrião aguarda vídeo concluído ou pulado de cada convidado');
ok(network.includes("this.isSolo||this.players.every"),
   'o modo solo não aguarda três confirmações remotas');
ok(network.includes("if(stage==='intro')this.introDone.clear()")&&
   network.includes('this.introDone.clear();'),
   'confirmações antigas não vazam entre sessões');
ok(main.includes("video.addEventListener('ended',()=>complete(onComplete)")&&
   main.includes("skip.addEventListener('click',()=>complete(onSkip))"),
   'fim natural e PULAR possuem transições explícitas e independentes');
ok(main.includes("video.controls=false")&&
   main.includes("video.tabIndex=-1")&&
   main.includes("video.disablePictureInPicture=true"),
   'filme não oferece barra de progresso, seek ou controles nativos');
ok(main.includes("if(allowSkip)holder.appendChild(skip);")&&
   main.includes("playIntroVideo(()=>net.completeIntro(),canSkipIntro,()=>net.skipIntro())"),
   'botão PULAR só é renderizado para anfitrião; convidado relata conclusão');
ok(main.includes("if(canSkipIntro)ui.querySelector('#skip-intro')"),
   'HUD do convidado também não exibe botão de pular');
ok(network.includes("if(!this.isHost||this.stage!=='intro')return;")&&
   network.includes("this.finishIntro();"),
   'regra de autorização do PULAR fica no Network e afeta toda a sala');
ok(network.includes("case 'intro-done': return value as Wire;")&&
   network.includes("msg.t === 'intro-done'")&&
   network.includes("this.message(this.hostConn,{t:'intro-done'})"),
   'cliente remoto informa apenas fim natural, não solicita pular');
ok(!network.includes("intro-skip"),
   'não existe mais mensagem multiplayer que permita convidado pular');
ok(main.includes("video.src=import.meta.env.BASE_URL+file")&&
   main.includes("file:'introducao.mp4'|'final.mp4'='introducao.mp4'"),
   'vídeos usam caminho relativo do GitHub Pages e itch.io');

for(const [id,name] of [['loop-solo','JOGAR SOZINHO'],['create','MULTIPLAYER ONLINE']]){
 ok(main.includes("button('"+id+"','"+name+"'"),'menu principal '+name);
}
ok(main.includes("void net.createRoom('loop')"),'multiplayer abre a floresta mutável');
ok(main.includes("net.startLoopSolo()"),'solo abre a mesma aventura');
ok(main.includes("button('select-phase','SELECIONAR FASE'"),'acesso à seleção de fases');
ok(main.includes('class="phase-trail"')&&main.includes('data-phase'),'mapa visual de quatro regiões');
ok(main.includes("net.startSolo(level,false,'loop')"),'fase escolhida abre a aventura atual');
ok(main.includes("ui.querySelector('#loop-solo')?.addEventListener('click',()=>startSoloAdventure(1))"),
  'jogar sozinho usa o fluxo compartilhado com prólogo');
ok(main.includes('startSoloAdventure(level);')&&
   main.includes('if(level===1){')&&
   main.includes('playIntroVideo(()=>net.startLoopSolo());'),
   'selecionar Fase 01 também reproduz a introdução');
ok(main.includes("net.startSolo(level,false,'loop')"),
   'fases 02 a 04 mantêm acesso direto');
ok(main.includes("'⏭ PULAR INTRODUÇÃO'")&&
   main.includes("video.addEventListener('ended',()=>complete(onComplete)"),
   'modo solo mantém PULAR e início automático ao final');
ok(main.includes('introLayer?.remove();introLayer=null;')&&
   main.includes("if(introVideo!==video)return;"),
   'vídeo descarta a camada e ignora callbacks antigos');
ok(main.includes('introStageShown=true;')&&main.includes('if(!introVideo&&!introStageShown)'),
   're-render não reinicia intro multiplayer após conclusão');
ok(main.includes("audio.setScore('none');")&&
   main.includes("video.muted=preferences.muted||preferences.musicMuted"),
   'trilha do menu não sobrepõe áudio do filme e preferências são respeitadas');
ok(readFileSync('.github/workflows/pages.yml','utf8').includes('cp introducao.mp4 dist/introducao.mp4'),
   'build inclui o MP4 na raiz do pacote publicado');
ok(readFileSync('introducao.mp4').subarray(4,8).toString()==='ftyp',
   'vídeo MP4 real está versionado no repositório');

/** Final scene is presentation-only; the authoritative stage-04 victory is untouched. */
ok(readFileSync('final.mp4').subarray(4,8).toString()==='ftyp',
   'final.mp4 é um vídeo MP4 real na branch main');
ok(readFileSync('.github/workflows/pages.yml','utf8').includes('cp final.mp4 dist/final.mp4'),
   'GitHub Pages e artefato itch.io incluem o vídeo de encerramento');
ok(main.includes("net.stage==='final'&&net.level===4&&")&&
   main.includes("net.experience==='loop'&&!net.endingComplete"),
   'vídeo final é exclusivo da vitória na quarta fase');
ok(main.includes("playIntroVideo(()=>net.completeEndingVideo(),net.isHost,")&&
   main.includes("()=>net.skipEndingVideo(),'final.mp4')"),
   'encerramento usa reprodução cinematográfica sem seek, salto só pelo host');
ok(main.includes("if(!finalStageShown)")&&main.includes("finalStageShown=true;"),
   'redesenhos de HUD e rede não reiniciam o vídeo final');
ok(main.includes("if(!net.endingComplete)")&&
   main.includes("button('show-final-credits','VER CRÉDITOS'"),
   'vitória e créditos são exibidos após o encerramento');
ok(network.includes("case 'final-done': case 'final-finished': return value as Wire;"),
   'mensagens de vídeo final são validadas pelo parser de rede');
ok(network.includes("msg.t === 'final-done'")&&
   network.includes("this.endingDone.add(seat)")&&
   network.includes("this.players.every(p=>this.endingDone.has(p.seat))"),
   'anfitrião aguarda todos terminarem o vídeo');
ok(network.includes("if(!this.isHost||this.stage!=='final'||this.level!==4")&&
   network.includes("this.broadcast({t:'final-finished'})"),
   'somente anfitrião pode dispensar o vídeo para todos');
ok(network.includes("case 'final-finished':")&&
   network.includes("this.endingComplete=true;"),
   'convidados recebem confirmação sincronizada do encerramento');
ok(network.includes("this.endingDone.clear();this.endingComplete=false;"),
   'estado do vídeo final não vaza ao iniciar outra sessão');


ok(main.includes("net.createRoom('loop')"),'multiplayer mantém a aventura principal');
ok(!main.includes('<details id="dev-tools"'),'ferramentas não visíveis no menu público');
ok(main.includes('<details id="loop-dev"'),'reiniciar/adiantar ficam em menu de opções');
ok(main.includes("class=\"loop-top-left\""),'estado e tempo no canto esquerdo');
ok(main.includes("class=\"loop-top-right\""),'objetivo no canto direito');
ok(main.includes("class=\"loop-bottom-left\""),'personagem e habilidade no rodapé');
ok(main.includes('class="loop-wind"'),'orientação do vento separada do objetivo');
ok(main.includes("net.isSolo?'<nav class=\"loop-seat-switch\""),'seletor solo de personagens');
ok(main.includes('ensureMobileControls();')&&
   main.includes("net.on('solo-seat',seat=>updateMobileCharacter(seat))"),
   'touch permanece montado e é atualizado na troca de personagem');
ok(main.includes("if(net.role==='idle'){info='';devSession=false;closeOverlay();}"),
  'notices e painel de teste eliminados quando retorna ao menu');
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
ok(scene.includes("this.contextText.setText(fatigue?'SEM ESTAMINA':hint)") &&
   scene.includes("this.pipo.update(time,this.local.x,this.local.y,pause)"),
   'dicas redundantes do cenário substituídas por Pipo, mantendo fadiga');
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
ok(network.includes("this.poses=(mode==='loop'?(level===4?FIRE_START:level===3?TREE_START:level===2?TEMP_START:LOOP_START):"),
  'spawn solo preserva fases 1 a 3 e adiciona fase 4');
ok(network.includes("this.poses = (this.experience==='loop'?LOOP_START:FOREST_SPAWNS)"),
  'mesmo spawn para host online');
ok(network.includes("this.broadcast({t:'loop',world:this.loop})"),'A/B/C sincronizados pelo host');
ok(LOOP_START[0].x===5600&&LOOP_START[1].x===5660&&LOOP_START[2].x===5720,
  'spawn central inalterado');
ok(LOOP_CYCLE_MS===60000&&LOOP_GEOMETRY.gate===7200,'tempo e geometria preservados');

const w=initLoop(1000);
const expect=(name:string,progress:string)=>{
 const obj=loopObjective(w);ok(obj.title===name&&obj.progress===progress,'objetivo: '+name);
};
expect('Observe os marcos da floresta.','Memorize os três');
ok(loopWind(w,0,5660).startsWith('◀'),'vento inicial aponta para a esquerda');
ok(loopContext(w,0,5660,606,1001)==='','sem legenda ao nascer longe do puzzle');
w.observed=true;
expect('Algo mudou. Sigam o vento.','Marcos 0/3');
ok(loopContext(w,0,markPosition(w,0).x,480,1001).includes('E'),
  'Téo vê comando próximo da árvore');
ok(loopContext(w,0,5660,606,1001)==='','sem comandos de puzzle fora de alcance');
ok(loopContext(w,1,markPosition(w,1).x-160,606,1001)==='',
  'Lia não vê comando de ação bloqueada antes de Téo');
w.marks[0]=true;
ok(loopContext(w,1,markPosition(w,1).x-160,606,1001).includes('J'),
  'Lia vê comando após Téo concluir a árvore');
ok(loopContext(w,2,markPosition(w,2).x-150,606,1001)==='',
  'Nino não recebe comando antes de Lia');
w.marks[1]=true;
ok(loopContext(w,2,markPosition(w,2).x-150,606,1001).includes('SHIFT'),
  'Nino recebe comando depois dos dois marcos anteriores');
w.marks=[true,true,true];
expect('TRILHAS LIBERADAS! SIGAM O VENTO.','SIGAM O VENTO · 0/3 AMIGOS');
w.lastRoute='right';
expect('Movam juntos a plataforma suspensa.','Mecanismos 0/3');
w.suspended=[true,true,true];w.suspendedOpen=true;
expect('Trabalhem juntos para derrubar a árvore.','Amarras 0/3');
w.tree=[true,false,true];
expect('Trabalhem juntos para derrubar a árvore.','Amarras 2/3');
w.bridge=true;
expect('Destravem a saída juntos.','Travas 0/3');
w.final=[true,true,true];
expect('As três travas abrirão o caminho.','Travas 3/3');
w.exit=true;
expect('TRILHA PARA A FLORESTA TEMPORAL','AMIGOS REUNIDOS: 0/3');
w.completed=true;
expect('A equipe encontrou a saída.','3 / 3');
ok(regionTitle(5660)==='CLAREIRA CENTRAL'&&regionTitle(8150)==='PLATAFORMA SUSPENSA',
  'regiões etiquetadas por entrada, não legendas permanentes');
console.log('APROVADO: '+count+' verificações da Etapa 10 (HUD, menu, sessões e contexto).');
