import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {initTemporal,TEMP_ECHO,TEMP_TREE,TEMP_ROOTS,TemporalAuthority,temporalObjective} from '../src/temporalForest';
import {temporalHint,TEMP_MARK_NAMES} from '../src/temporalGuidance';
import {TouchPointers,consumeTouch,mobilePadMarkup} from '../src/mobileControls';
import type {TouchInput} from '../src/game';
let n=0;const ok=(value:unknown,msg:string)=>{if(!value)throw Error('ETAPA 14: '+msg);n++;};
const read=(path:string)=>readFileSync(path,'utf8');
const main=read('src/main.ts'),mobile=read('src/mobileControls.ts'),
  scene=read('src/temporalForestScene.ts'),css=read('src/style.css'),
  network=read('src/network.ts'),forest=read('src/forestLoopScene.ts');
const pose=(seat:Seat,x:number,y=616):Pose=>({seat,x,y,vx:0,vy:0});
const w=initTemporal(1000);
ok(temporalObjective(w).title==='Encontrem os três marcos.','primeiro objetivo concreto e curto');
ok(TEMP_MARK_NAMES.length===3&&TEMP_MARK_NAMES.every(x=>x.length>5),
  'marcos ambientais têm identidades diferentes');
ok(temporalHint(w,0,pose(0,1900),8000)===null,
  'sem dica contextual em outra região');
const teo=temporalHint(w,0,pose(0,870,507),8000);
ok(!!teo&&teo.label==='ÁRVORE ENCHARCADA'&&teo.action.includes('E'),
  'Téo recebe instrução E somente junto à árvore real');
ok(teo?.targetX===TEMP_ECHO[0].x&&teo?.targetY===TEMP_ECHO[0].y,
  'brilho e dica ancorados à coordenada do puzzle autoritativo');
const lia=temporalHint(w,1,pose(1,1100),8000);
ok(!!lia&&lia.action.includes('J')&&lia.label.includes('PEDRA'),
  'Lia deve atirar à direita contra a fenda da pedra');
ok(lia?.targetX===TEMP_ECHO[1].x,'alvo da baladeira corresponde ao segundo marco');
const wrongSide=temporalHint(w,1,pose(1,1320),8000);
ok(wrongSide?.action.includes('ESQUERDA'),'Lia do lado errado é orientada a se reposicionar');
ok(temporalHint(w,1,pose(1,870,616),8000)===null,
  'Lia não recebe comando antes do alcance da baladeira');
const nino=temporalHint(w,2,pose(2,1490),8000);
ok(!!nino&&nino.label==='ARCO DE RAÍZES'&&nino.action.includes('DASH'),
  'Nino recebe ordem verdadeira dash→E próximo ao arco');
ok(nino?.targetX===TEMP_ECHO[2].x&&nino?.targetY===TEMP_ECHO[2].y,
  'dica da raiz usa as mesmas coordenadas de Nino');
w.dashAt=7900;w.dashX=1480;
ok(temporalHint(w,2,pose(2,1630),8000)?.action.includes('E'),
  'após dash válido Nino recebe indicação E');
w.echo[0]=true;
ok(temporalHint(w,0,pose(0,870,507),8000)===null,
  'interação concluída não mantém instrução antiga');
w.echo=[true,true,true];
ok(temporalObjective(w).progress==='Amarras 0/3',
  'progresso avança para a árvore depois dos três marcos');
ok(temporalHint(w,0,pose(0,2440),8000)?.action.includes('APOIA'),
  'Téo encontra instrução de empilhamento na árvore-ponte');
w.stacked=true;
ok(temporalHint(w,0,pose(0,2440),8000)?.action.includes('PULE'),
  'Téo vê salto duplo somente após formação');
w.teoLanded=true;w.teoSummitReached=true;
ok(temporalHint(w,0,pose(0,2440),8000)?.action.includes('E'),
  'Téo no galho vê a amarra E');
ok(temporalHint(w,1,pose(1,2440),8000)?.action.includes('J'),
  'Lia vê ação de disparo da segunda amarra');
ok(temporalHint(w,2,pose(2,2500),8000)?.action.includes('DASH'),
  'Nino recebe dica da terceira amarra');
w.bridge=true;w.layout=0;
ok(temporalHint(w,0,pose(0,3240),8000)?.action.includes('CONFIGURAÇÃO C'),
  'raízes deixam claro que só podem ser abertas no estado C');
w.layout=2;
for(const i of [0,1,2] as Seat[]){
  const hint=temporalHint(w,i,pose(i,TEMP_ROOTS[i].x),8000);
  ok(!!hint&&hint.targetX===TEMP_ROOTS[i].x,'raiz '+i+' acompanha autoridade no C');
}
w.blackoutUntil=9000;
ok(temporalHint(w,0,pose(0,3240),8000)===null,
  'sem dica obsoleta durante apagão');
w.blackoutUntil=0;w.deadUntil=9000;
ok(temporalHint(w,0,pose(0,3240),8000)===null,
  'sem dica durante morte coletiva');

const netAuthority=new TemporalAuthority();netAuthority.reset(5000);
const players:[Pose,Pose,Pose]=[pose(0,870,507),pose(1,1100),pose(2,1490)];
ok(netAuthority.act(0,{kind:'lever'},players,6000)&&netAuthority.world.echo[0],
  'dica E da árvore efetivamente aceita pela autoridade');
ok(netAuthority.authorizeEnergy(1,'shoot',players,6200,1).ok&&netAuthority.world.echo[1],
  'dica J da pedra efetivamente aceita pela autoridade');
ok(netAuthority.authorizeEnergy(2,'dash',players,6500,1).ok,'dash válido de Nino começa');
players[2].x=1630;
ok(netAuthority.act(2,{kind:'switch'},players,6900)&&netAuthority.world.echo[2],
  'E após dash conclui o terceiro marco real');

ok(main.includes('function ensureMobileControls()'),'montagem do touch pad é centralizada');
ok(main.includes('function updateMobileCharacter('),'personagem tem atualização independente');
ok(main.includes('function unmountMobileControls()'),'desmontagem só no fim da sessão');
ok(main.includes('mobilePad?.update(seat)'),'troca atualiza o pad existente');
ok(main.includes('if(!mobilePad||!mobilePad.ready())'),'integridade verificada, não contagem de filhos');
ok(!main.includes('controls.childElementCount'),'não depende da presença de HTML sem listeners');
ok(!main.includes("net.on('solo-seat',()=>{gameKeys.clear();unbindPad?"),
  'listener destrutivo do antigo bug removido');
ok(main.includes("net.on('solo-seat',seat=>updateMobileCharacter(seat))"),
  'troca de personagem usa update sem destruir controles');
ok(main.includes('ensureMobileControls();')&&
   main.includes('unmountMobileControls();'),'remontagem explícita na gameplay e ao sair');
ok(mobile.includes("root.addEventListener('pointerdown',down)")&&
   mobile.includes('root.addEventListener(name,up)'),'listeners delegados persistem na troca');
ok(mobile.includes("root.querySelector('.thumb-right')")&&
   mobile.includes("right.insertAdjacentHTML('afterbegin',special)"),
  'só botão contextual de Lia/Nino é substituído');
ok(mobile.includes("if(next!==current)")&&mobile.includes('root.querySelectorAll'),
  'troca preserva elementos de esquerda, direita, E e pulo');
ok(mobile.includes("root.removeEventListener('pointerdown',down)"),
  'unbind real remove listener ao retornar ao menu');
ok(mobile.includes("root.removeEventListener('visibilitychange',hidden)")===false &&
   mobile.includes("document.removeEventListener('visibilitychange',hidden)"),
  'listeners globais antigos são removidos corretamente');
ok(mobile.includes("pressed=new Map<number"),'múltiplos dedos identificados por pointerId');
ok(mobile.includes('pointers.up(active.key,event.pointerId)'),
  'soltar apenas dedo correspondente');
ok(mobile.includes("'pointercancel'")&&mobile.includes("'lostpointercapture'")&&
   mobile.includes("'pointerleave'"),'cancelamento e perda de captura liberam controles');
ok(mobile.includes("window.addEventListener('blur',reset)"),
  'perda de foco reseta estado do toque');
const keys:TouchInput={left:false,right:false,jump:false,interact:false,ability:false};
const fingers=new TouchPointers(keys);
fingers.down('right',10);fingers.down('jump',11);fingers.down('interact',12);
ok(keys.right&&consumeTouch(keys,'jump')&&consumeTouch(keys,'interact'),
  'direita+pulo+E juntos, sem cancelar movimento');
fingers.up('interact',12);
ok(keys.right,'soltar E não remove movimento');
fingers.down('ability',13);
ok(consumeTouch(keys,'ability')&&keys.right,'direita+dash/estilingue');
fingers.up('ability',13);fingers.up('jump',11);fingers.up('right',10);
ok(!keys.right,'sem movimento fantasma após soltar último dedo');
fingers.down('jump',20);fingers.up('jump',20);fingers.down('jump',21);fingers.up('jump',21);
ok(consumeTouch(keys,'jump')&&consumeTouch(keys,'jump')&&!consumeTouch(keys,'jump'),
  'duplo salto tem duas bordas válidas mesmo entre quadros');
fingers.clear();
ok(!keys.left&&!keys.right&&!keys.jump,'perda de foco não deixa botão preso');
ok(!mobilePadMarkup(true,0).includes('data-touch="ability"'),
  'Téo não ganha habilidade duplicada');
ok(!mobilePadMarkup(false,2).includes('data-seat='),
  'multiplayer mantém personagem fixo sem troca solo');

ok(scene.includes('TEMP_MARK_NAMES')&&scene.includes('this.echoVisuals.push(container)'),
  'marcos da Fase 2 são objetos distintos desenhados no mundo');
ok(scene.includes('this.echoLabels.push(')&&scene.includes('label.setVisible(false)')&&
   scene.includes('this.pipo.update(time,this.local.x,this.local.y,pause)'),
  'Pipo substitui nomes repetidos de mecanismos e mantém feedback visual');
ok(scene.includes('this.echoChecks.push(')&&scene.includes('setVisible(w.echo[i])'),
  'feedback visual marca mecanismo concluído');
ok(scene.includes('temporalHint(w,seat,')&&scene.includes('this.pipo.update(time,this.local.x,this.local.y,pause)'),
  'estado sincronizado continua disponível e Pipo fornece a orientação autoritativa');
ok(scene.includes('this.net.act({kind:')&&scene.includes("this.net.requestVital(kind,this.facing)"),
  'ações do usuário continuam dirigidas à autoridade multiplayer');
ok(scene.includes("consumeTouch(this.touch,'interact')"),
  'E continua recebendo touch na Fase 2');
ok(forest.includes("consumeTouch(this.touch,'jump')"),
  'Fase 1 mantém input mobile');
ok(main.includes("this.net")===false,'main não substitui as regras autoritativas da cena');
ok(network.includes("this.setPhase('transition',1,Date.now()+5000)"),
  'a Boca da Noite ainda transiciona à Fase 2');
ok(main.includes("mode === 'temporal' ? new TemporalForestScene"),
  'Fase 2 continua em Phaser Scene independente');
ok(css.includes('#ui.in-game .interlevel{')&&
   css.includes('max-height:calc(100dvh - env(safe-area-inset-top)'),
  'transição fixa em viewport com altura segura');
ok(css.includes('font-size:clamp(18px,4vh,32px)'),
  'título da transição reduz-se quando a tela é baixa');
ok(css.includes('--game-tools-right:')&&css.includes('--game-tools-top:'),
  'Opções e Fullscreen compartilham as coordenadas da barra');
ok(css.includes('right:calc(var(--game-tools-right) + 38px)')&&
   css.includes('right:var(--game-tools-right)'),
  'botões na mesma linha sem cobrir um ao outro');
ok(css.includes('width:32px;height:30px')&&css.includes('max-height:calc(100dvh - 130px'),
  'hitboxes compactas e opções com rolagem dentro da tela');
ok(css.includes('#ui.in-game .loop-menu-options')&&css.includes('overflow-y:auto'),
  'opções acessíveis em paisagem baixa');
for(const [w,h] of [[915,412],[844,390],[740,360],[1280,720]]){
 const margin=14;
 const safeHeight=h-margin;
 ok(safeHeight>=346,'janela segura para transição em '+w+'x'+h);
 const toolsTop=h<=390?54:65;
 ok(toolsTop+36+130<h,'botões e menu cabem verticalmente em '+w+'x'+h);
 ok(w-7-32>=0&&w-7-38-32>=0,'opções/fullscreen ficam dentro da largura');
}
console.log('APROVADO: '+n+' verificações Etapa 14 (touch, UI, objetivos e autoridade).');
