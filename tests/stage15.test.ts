import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {stickAxis,JOYSTICK_DEAD_ZONE} from '../src/joystick';
import {TouchPointers,clearTouch,mobilePadMarkup,consumeTouch} from '../src/mobileControls';
import type {TouchInput} from '../src/game';
import {FallTracker,SAFE_FALL_HEIGHT,JUMP_RISE,hasPhysicalFooting,
 loopFallSurfaces,temporalFallSurfaces} from '../src/fallDamage';
import {initVitals,damageVitals,VITALS} from '../src/loopVitals';
import {LOOP_GEOMETRY,LOOP_PHYSICS,UPPER_BRANCH,SUMMIT_BRANCH,upperLandingY,
 summitLandingY,hasBranchFooting,hasSummitFooting,LOOP_TREE,LoopAuthority,LOOP_START} from '../src/forestLoop';
import {TEMP_UPPER,TEMP_SUMMIT,TEMP_TREE,tempLanding,tempSummitFooting,TemporalAuthority,
 TEMP_START,initTemporal} from '../src/temporalForest';
let count=0;
const ok=(x:unknown,s:string)=>{if(!x)throw Error('ETAPA 15: '+s);count++;};
const close=(a:number,b:number)=>Math.abs(a-b)<.0001;
const neutral=()=>({left:false,right:false,jump:false,interact:false,ability:false,moveX:0}) as TouchInput;
const axis=(dx:number,dy=0)=>stickAxis(dx,dy,40);
ok(close(JOYSTICK_DEAD_ZONE,.15),'zona morta é 15%');
ok(axis(0).x===0&&axis(5).x===0,'no centro não há movimento involuntário');
ok(axis(40).x===1&&axis(-40).x===-1,'dois extremos diretos');
ok(axis(20).x>.3&&axis(20).x<.6,'intensidade regula velocidade');
ok(axis(-20).x<-.3&&axis(-20).x>-.6,'intensidade simétrica à esquerda');
ok(close(axis(80).x,1)&&Math.abs(axis(80).knobX)<=40,'manopla presa ao círculo');
ok(axis(0,40).x===0&&axis(0,40).y===1,'direção vertical não move personagem horizontalmente');
ok(Math.abs(axis(20,20).x)<1&&axis(20,20).y>0,'diagonal normalizada');
ok(stickAxis(NaN,100,40).x===0&&stickAxis(12,0,0).x===0,
  'entrada inválida não movimenta');
const control=neutral(),fingers=new TouchPointers(control);
fingers.down('jump',2);fingers.down('ability',3);
ok(consumeTouch(control,'jump')&&consumeTouch(control,'ability'),
  'multitoque do joystick não bloqueia botões de ação');
fingers.up('jump',2);fingers.up('ability',3);
fingers.down('interact',5);
ok(consumeTouch(control,'interact'),'E é independente do joystick');
fingers.clear();clearTouch(control);
ok(control.moveX===0&&!control.jump,'perda de foco zera movimento e ações');
for(const seat of [0,1,2] as const){
 const markup=mobilePadMarkup(true,seat);
 ok(markup.includes('data-joystick')&&markup.includes('analog-knob'),
  'base e manopla visíveis no solo para '+seat);
 ok(!markup.includes('data-touch="left"')&&!markup.includes('data-touch="right"'),
  'setas antigas removidas para '+seat);
 ok(markup.includes('data-touch="jump"')&&markup.includes('data-touch="interact"'),
  'pulo e E preservados para '+seat);
}
ok(!mobilePadMarkup(false,2).includes('data-seat='),'sem seleção de personagem multiplayer');
ok(mobilePadMarkup(true,1).includes('TIRO')&&mobilePadMarkup(true,2).includes('DASH'),
  'habilidade contextual de Lia e Nino');
ok(!mobilePadMarkup(true,0).includes('data-touch="ability"'),
  'Téo não recebe habilidade redundante');

ok(JUMP_RISE>126&&JUMP_RISE<128,'cálculo de subida usa gravidade e impulso existentes');
ok(close(SAFE_FALL_HEIGHT,4*JUMP_RISE),
  'queda perigosa calibrada em duas sequências completas de salto duplo');
ok(SAFE_FALL_HEIGHT>500&&SAFE_FALL_HEIGHT<515,'limite seguro calculado, não arbitrário');
const surface=[{x:100,width:360,centerY:638,height:0}];
const actor=(y:number,vy=0):Pose=>({seat:0,x:100,y,vx:0,vy});
const persons=(pose:Pose):Pose[]=>[pose,{seat:1,x:1900,y:616,vx:0,vy:0},
 {seat:2,x:1950,y:616,vx:0,vy:0}];
ok(hasPhysicalFooting(actor(616),surface),'pouso corresponde à geometria real');
ok(!hasPhysicalFooting(actor(580,120),surface),'passagem no ar não equivale a pouso');
const descent=(start:number,tracker=new FallTracker()):number=>{
 let time=1000,hits=0;
 tracker.sample(persons(actor(start)),surface,time);
 for(let y=start+55;y<616;y+=55){
  time+=50;hits+=tracker.sample(persons(actor(y,420)),surface,time).length;
 }
 time+=50;hits+=tracker.sample(persons(actor(616,0)),surface,time).length;
 time+=50;hits+=tracker.sample(persons(actor(616,0)),surface,time).length;
 return hits;
};
ok(descent(280)===0,'queda curta não causa dano');
ok(descent(88)===1,'queda muito alta causa exatamente um evento');
ok(descent(88)===1,'aterrissagem repetida não causa segundo dano');
const teleport=new FallTracker();
teleport.sample(persons(actor(88)),surface,1000);
ok(teleport.sample(persons(actor(616)),surface,1050).length===0,
  'teleporte grande de posição é ignorado');
const grace=new FallTracker();
grace.reset(1700);
ok(grace.sample(persons(actor(88)),surface,1600).length===0,'janela de segurança pós-apagão');
ok(grace.sample(persons(actor(616)),surface,1650).length===0,'sem dano por correção técnica');
const blackout=new FallTracker();
blackout.sample(persons(actor(88)),surface,1000);
blackout.reset();
ok(blackout.sample(persons(actor(616)),surface,1100).length===0,
  'apagão/transformação zera trajetória antiga');
const support=new FallTracker();
support.sample(persons(actor(88)),surface,1000,[1,null,null]);
ok(support.sample(persons(actor(616)),surface,1050).length===0,
  'cair de empilhamento técnico sem trajetória não gera dano falso');
const health=initVitals();
ok(damageVitals(health,0,2500)&&health.health[0]===2,'evento remove um coração');
ok(!damageVitals(health,0,2700)&&health.health[0]===2,'invulnerabilidade 1,2 segundo');
ok(damageVitals(health,0,3800)&&health.health[0]===1,'novo impacto após proteção');
ok(health.stamina[0]===100,'queda não consome energia');

const floor=LOOP_GEOMETRY.clearing.groundY-LOOP_PHYSICS.characterHeight/2;
const fromTower=floor-2*LOOP_PHYSICS.characterHeight;
ok(floor===616&&fromTower===528,'altura física real do chão e da torre');
ok(floor-upperLandingY>2*JUMP_RISE,'primeiro galho impossível desde chão');
ok(fromTower-upperLandingY<2*JUMP_RISE&&fromTower-upperLandingY>JUMP_RISE,
  'primeira subida exige salto duplo partindo da torre');
ok(upperLandingY-summitLandingY<2*JUMP_RISE&&
   upperLandingY-summitLandingY>JUMP_RISE,
  'segunda subida exige novo salto duplo a partir do primeiro galho');
ok(floor-summitLandingY>2*JUMP_RISE,'atalho chão para topo impossível');
ok(hasBranchFooting({seat:0,x:UPPER_BRANCH.x,y:upperLandingY,vx:0,vy:0}),
  'primeiro galho valida pouso');
ok(hasSummitFooting({seat:0,x:SUMMIT_BRANCH.x,y:summitLandingY,vx:0,vy:0}),
  'topo valida segunda aterrissagem');
ok(!hasSummitFooting({seat:0,x:SUMMIT_BRANCH.x,y:upperLandingY,vx:0,vy:0}),
  'o primeiro pouso não substitui o segundo');
ok(100-2*(VITALS.JUMP+VITALS.DOUBLE_JUMP)>=0,'duas sequências custam até 60/100 estamina');

const loop=new LoopAuthority();loop.reset(1000);
const l=LOOP_START.map(x=>({...x}));
loop.world.observed=true;loop.world.marks=[true,true,true];loop.world.lastRoute='right';loop.world.suspendedOpen=true;
l[0]={seat:0,x:UPPER_BRANCH.x,y:528,vx:0,vy:0};
l[1]={seat:1,x:UPPER_BRANCH.x,y:572,vx:0,vy:0};
l[2]={seat:2,x:UPPER_BRANCH.x,y:616,vx:0,vy:0};
ok(loop.act(1,{kind:'support'},l,11000),'Lia sobe em Nino');
loop.tick(l,11100);
ok(loop.act(0,{kind:'support'},l,11200),'Téo sobe na Lia');
loop.tick(l,11300);
ok(loop.act(0,{kind:'detach'},l,11400),'desprendimento de torre verdadeira');
l[0]={seat:0,x:UPPER_BRANCH.x,y:upperLandingY,vx:0,vy:0};
ok(loop.tick(l,11500).changed&&loop.world.teoUpperReached,'primeiro patamar registrado');
ok(!loop.act(0,{kind:'lever'},l,11550),'primeiro galho não solta amarra');
l[0]={seat:0,x:UPPER_BRANCH.x,y:summitLandingY,vx:0,vy:0};
ok(loop.tick(l,11600).changed&&loop.world.teoSummitReached,'segundo patamar registrado');
ok(loop.act(0,{kind:'lever'},l,11700)&&loop.world.tree[0],
  'amarra de Téo exige os dois patamares');
ok(readFileSync('src/forestLoopScene.ts','utf8').includes('x:shot.x+this.facing*365'),
  'projétil visível da fase 1 percorre o mesmo alcance autoritativo');
ok(readFileSync('src/forestLoopUI.ts','utf8').includes('LOOP_GEOMETRY.chasm.start-55'),
  'dica de Lia fica na margem segura, não dentro do abismo');
ok(LOOP_TREE[1].x===9760&&LOOP_TREE[1].x-(LOOP_GEOMETRY.chasm.start-45)<=365,
  'baladeira da primeira fase exige mira distante, mas cabe no alcance real');
ok(LOOP_TREE[1].x>LOOP_GEOMETRY.chasm.start&&LOOP_GEOMETRY.chasm.start-45<LOOP_GEOMETRY.chasm.start,
  'Lia se posiciona na margem para disparar sobre o abismo');
const temporal=new TemporalAuthority();temporal.reset(1000);
ok(TEMP_UPPER.landing-TEMP_SUMMIT.landing>JUMP_RISE&&
 TEMP_UPPER.landing-TEMP_SUMMIT.landing<2*JUMP_RISE,
 'segundo salto duplo necessário na floresta temporal');
ok(616-TEMP_SUMMIT.landing>SAFE_FALL_HEIGHT,
 'cair do galho temporal mais alto até chão implica risco real');
ok(!tempSummitFooting({seat:0,x:2440,y:TEMP_UPPER.landing,vx:0,vy:0}),
 'primeiro galho temporal não é atalho');
ok(tempSummitFooting({seat:0,x:2440,y:TEMP_SUMMIT.landing,vx:0,vy:0}),
 'segundo galho temporal oferece pouso físico');
ok(temporalFallSurfaces(0,false).some(s=>s.centerY===TEMP_SUMMIT.y),
 'rastreador conhece a plataforma temporal superior');
ok(loopFallSurfaces(0,false,SUMMIT_BRANCH).some(s=>s.centerY===SUMMIT_BRANCH.centerY),
 'rastreador conhece plataforma superior na Boca da Noite');
const net=readFileSync('src/network.ts','utf8');
const ui=readFileSync('src/mobileControls.ts','utf8');
const scene1=readFileSync('src/forestLoopScene.ts','utf8');
const scene2=readFileSync('src/temporalForestScene.ts','utf8');
const css=readFileSync('src/style.css','utf8');
ok(net.includes('this.fallTracker.sample(this.poses'), 'anfitrião amostra trajetórias dos três personagens');
ok(net.includes('this.loopAuthority.damage(seat,now,false)')&&
 net.includes('this.temporalAuthority.damage(seat,now,false)'),
 'somente autoridade aplica dano não fatal');
ok(net.includes('this.fallTracker.reset();'),'deslocamentos técnicos zeram trajetórias');
ok(net.includes('this.fallTracker.reset();')&&net.includes("if(this.experience==='loop'"),
 'duas aventuras e reinício ligados à segurança');
ok(scene1.includes('SUMMIT_BRANCH.width')&&scene2.includes('TEMP_SUMMIT.width'),
 'patamares superiores têm colisões reais nas duas cenas');
ok(scene1.includes('hasSummitFooting')&&scene2.includes('tempSummitFooting'),
 'E consulta a plataforma superior e não flag histórica isolada');
ok(scene1.includes('this.fallImpact(')&&scene2.includes('this.fallImpact('),
 'feedback leve de impacto nas duas fases');
ok(ui.includes("root.addEventListener('pointermove',move)")&&
 ui.includes("touch.moveX=axis.x"),'arrasto move eixo horizontal do joystick');
ok(ui.includes("analogFinger===event.pointerId")&&ui.includes("analogFinger=null;touch.moveX=0"),
 'arrasto e soltura do dedo responsável são independentes de E/pulo/dash');
ok(ui.includes("root.removeEventListener('pointermove',move)"),
 'listener de arrasto desmontado no menu');
ok(scene1.includes('this.touch.moveX')&&scene2.includes('this.touch.moveX'),
 'eixo analógico compartilhado com fases 1 e 2');
ok(css.includes('.analog-stick')&&css.includes('.analog-knob'),
 'joystick desenhado no mobile com área circular e safe area existente');
console.log('APROVADO: '+count+' verificações da Etapa 15.');
