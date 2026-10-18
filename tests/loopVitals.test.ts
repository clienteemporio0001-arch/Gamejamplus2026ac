import {readFileSync} from 'node:fs';
import {LoopAuthority,LOOP_START,LOOP_CYCLE_MS,validLoop,LOOP_GEOMETRY} from '../src/forestLoop';
import {VITALS,initVitals,validVitals,spendVital,regenVitals,damageVitals,actionCost} from '../src/loopVitals';
import type {Pose,Seat} from '../src/network';
let count=0;
function ok(v:unknown,msg:string){if(!v)throw Error('ETAPA 11-B: '+msg);count++;}
const approx=(a:number,b:number)=>Math.abs(a-b)<.001;
const clone=():Pose[]=>LOOP_START.map(x=>({...x,y:616,vx:0,vy:0}));
const seat=(n:number)=>n as Seat;
const initial=initVitals();
ok(initial.health.every(x=>x===3),'todos começam com três corações');
ok(initial.stamina.every(x=>x===100),'todos começam com 100 pontos');
ok(validVitals(initial),'esquema inicial válido');
ok(!validVitals({...initial,stamina:[101,100,100]})&&
   !validVitals({...initial,health:[3,4,3]}),'rejeitar recursos forjados fora dos limites');
ok(!validVitals({...initial,stamina:[NaN,50,50]})&&
   !validVitals({...initial,safeUntil:[]}), 'rejeitar NaN e arrays incorretos');
ok(actionCost('jump')===10&&actionCost('doubleJump')===20&&
   actionCost('shoot')===25&&actionCost('dash')===35,'custos centralizados');

const p=clone();
const authority=new LoopAuthority();
authority.reset(1000);
ok(validLoop(authority.world),'snapshot autentica recursos no mesmo LoopWorld');
ok(authority.authorizeEnergy(0,'jump',p,5000).ok,'pulo Téo aceito de corpo parado no chão');
ok(authority.world.stamina[0]===90,'pulo desconta exatamente dez');
ok(!authority.authorizeEnergy(0,'jump',p,5100).ok&&authority.world.stamina[0]===90,
  'tecla repetida não duplica o consumo');
p[0].y=550;p[0].vy=-130;
ok(authority.authorizeEnergy(0,'doubleJump',p,5400).ok,'salto duplo de Téo validado após primeiro');
ok(authority.world.stamina[0]===70,'salto duplo cobra mais vinte');
ok(!authority.authorizeEnergy(0,'doubleJump',p,5550).ok&&
  authority.world.stamina[0]===70,'terceiro salto é rejeitado sem cobrar');
ok(!authority.authorizeEnergy(1,'doubleJump',p,5800).ok,
  'Lia não recebe salto duplo de Téo');
ok(!authority.authorizeEnergy(2,'shoot',p,5800).ok,
  'Nino não pode solicitar baladeira');
p[0].y=616;p[0].vy=0;
ok(authority.authorizeEnergy(0,'jump',p,7500).ok&&authority.world.stamina[0]===60,
  'novo salto depois de aterrissar continua disponível');
ok(authority.world.stamina[1]===100&&authority.world.stamina[2]===100,
  'gasto de Téo não altera energia dos amigos');
ok(authority.authorizeEnergy(1,'shoot',p,10000,-1).ok,
  'Lia dispara mesmo para esquerda sem precisar acertar um puzzle');
ok(authority.world.stamina[1]===75,'baladeira consome 25');
ok(!authority.authorizeEnergy(1,'shoot',p,10200,-1).ok&&
  authority.world.stamina[1]===75,'cooldown do disparo impede cobrança dupla mesmo à esquerda');
ok(authority.authorizeEnergy(2,'dash',p,12000).ok,'Nino executa dash');
ok(authority.world.stamina[2]===65,'dash consome 35');
ok(!authority.authorizeEnergy(2,'dash',p,13000).ok&&
  authority.world.stamina[2]===65,'dash em cooldown não gasta energia');
ok(authority.authorizeEnergy(2,'dash',p,14000).ok&&
  authority.world.stamina[2]===30,'dash depois do cooldown consome uma vez');
const spentNino=authority.world.lastSpent[2];
ok(!authority.authorizeEnergy(2,'dash',p,16000).ok&&
  authority.world.stamina[2]===30&&authority.world.lastSpent[2]===spentNino,
  'dash sem 35 pontos não começa nem cobra/atualiza último gasto');
ok(!authority.authorizeEnergy(1,'dash',p,17000).ok,
  'Lia não pode executar dash');
ok(authority.world.health.every(x=>x===3),'gasto de energia não causa dano');

const v=initVitals();
v.stamina=[50,40,30];v.lastSpent=[1000,1000,1000];
let changed=regenVitals(v,clone(),1750,50);
ok(!changed&&v.stamina[0]===50,'pausa de regeneração até completar 800ms');
changed=regenVitals(v,clone(),1800,50);
ok(changed&&approx(v.stamina[0],51.1),'parado regenera 22 por segundo com dt de 50ms');
const moving=clone();moving[0].vx=235;
regenVitals(v,moving,1850,50);
ok(approx(v.stamina[0],51.7),'andando regenera 12 por segundo com dt');
ok(approx(v.stamina[1],42.2)&&approx(v.stamina[2],32.2),
  'amigos sem controle continuam regenerando individualmente');
const previous=v.stamina[0];
regenVitals(v,moving,1900,0);
ok(v.stamina[0]===previous,'nenhum ganho com tempo zero');
regenVitals(v,clone(),4000,100000);
ok(v.stamina.every(e=>e<=100),'teto nunca supera 100');
v.stamina[2]=9;
ok(!spendVital(v,2,'jump',4000)&&v.stamina[2]===9,
  'ação bloqueada por energia não desconta o saldo');
v.stamina[2]=10;
ok(spendVital(v,2,'jump',4100)&&v.stamina[2]===0,
  'saldo chega exatamente a zero sem ficar negativo');
ok(!spendVital(v,2,'jump',4200)&&v.stamina[2]===0,
  'sem estamina, não permite saldo negativo');

const h=initVitals();
ok(damageVitals(h,1,2000)&&h.health[1]===2,'dano normal remove um coração de Lia');
ok(!damageVitals(h,1,2200)&&h.health[1]===2,'invulnerabilidade segura colisão contínua');
ok(h.safeUntil[1]===3200,'invulnerabilidade de 1,2 segundo');
ok(damageVitals(h,1,3201)&&h.health[1]===1,'segundo dano após invulnerabilidade');
ok(damageVitals(h,1,4402)&&h.health[1]===0,'terceiro dano mata personagem');
ok(h.health[0]===3&&h.health[2]===3,'vida independente até morte coletiva');
const fatal=initVitals();
ok(damageVitals(fatal,2,10000,true)&&fatal.health[2]===0,'abismo fatal independe de corações');
ok(!damageVitals(fatal,2,10200)&&fatal.health[2]===0,'personagem morto não recebe dano adicional');

const group=new LoopAuthority(),team=clone();
group.reset(1000);
ok(group.damage(1,2000)&&group.world.health[1]===2,'dano não fatal na autoridade');
ok(!group.damage(1,2100),'colisões contínuas não removem múltiplos corações');
ok(group.damage(1,3300)&&group.damage(1,4600),'morte ao chegar a zero');
ok(group.world.deadUntil===6800&&group.world.health[1]===0,'gatilho da morte coletiva e relógio');
ok(!group.tickResources(team,4800),'regeneração suspensa com amigo caído');
ok(!group.tick(team,6700).reset,'transição mantém contagem antes de reiniciar');
const restart=group.tick(team,6801);
ok(restart.reset&&restart.poses?.every((a,i)=>a.x===LOOP_START[i].x),
  'reinício coletivo devolve três à clareira central');
ok(group.world.health.every(h=>h===3)&&group.world.stamina.every(s=>s===100),
  'reinício restaura três corações e toda estamina');
ok(group.world.layout===0&&group.world.cycle===0&&group.world.marks.every(x=>!x)
  &&group.world.tree.every(x=>!x)&&!group.world.bridge,'reinício restaura estado A e puzzles');

const paused=new LoopAuthority();paused.reset(0);paused.world.stamina[0]=30;paused.world.lastSpent[0]=1000;
paused.world.blackoutUntil=5000;
ok(!paused.tickResources(clone(),3000)&&paused.world.stamina[0]===30,
  'apagão mantém 30/100 sem regenerar');
paused.world.blackoutUntil=0;paused.world.cycleStart=5000;
ok(paused.tickResources(clone(),5200)&&paused.world.stamina[0]>30,
  'após apagão regeneração retoma sem restaurar tudo');
ok(paused.world.health[0]===3,'apagão preserva saúde');
paused.world.stamina[0]=22;
paused.world.cycleStart=5200;
const beforeShift=paused.world.stamina[0];
paused.tick(clone(),65200);
paused.tick(clone(),67210);
ok(paused.world.stamina[0]===beforeShift,'troca A/B/C não altera estamina');
ok(LOOP_CYCLE_MS===60000&&LOOP_GEOMETRY.clearing.groundY===638,
  'tempo e geometria da aventura não mudaram');
const ascentCost=VITALS.JUMP+VITALS.DOUBLE_JUMP;
ok(100-ascentCost===70,'torre e salto duplo deixam energia para prosseguir');
ok(VITALS.SHOT<=100&&VITALS.DASH<=100,'amarras obrigatórias cabem na capacidade máxima');

const sourceNetwork=readFileSync('src/network.ts','utf8');
const sourceScene=readFileSync('src/forestLoopScene.ts','utf8');
const sourceHud=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/style.css','utf8');
ok(sourceNetwork.includes("case 'vital-action'")&&sourceNetwork.includes("case 'vital-reply'"),
  'mensagens de solicitação e resposta de energia são validadas');
ok(sourceNetwork.includes("this.loopAuthority.authorizeEnergy(seat,kind,this.poses"),
  'anfitrião decide consumo e cooldown, não o cliente');
ok(sourceNetwork.includes("this.lastVitalRequestIds[seat]"),
  'replay do mesmo pedido de ação é rejeitado');
ok(sourceNetwork.includes("this.message(conn,{t:'vital-reply'"),
  'convidado recebe confirmação individual');
ok(sourceNetwork.includes("this.message(conn, { t: 'loop', world: this.loop })"),
  'convidado reconectado recebe recursos atuais');
ok(sourceNetwork.includes('health:[...msg.world.health]')&&
   sourceNetwork.includes('stamina:[...msg.world.stamina]'),
  'guest copia campos de vida e estamina do snapshot autorizado');
ok(sourceNetwork.includes("this.broadcast({t:'loop',world:this.loop})"),
  'estado de vida e energia é compartilhado entre os três navegadores');
ok(sourceNetwork.includes("this.loopAuthority.tickResources(this.poses,now)"),
  'anfitrião regenera independentemente dos quadros Phaser');
ok(sourceNetwork.includes("this.loopAuthority.damage(p.seat,now,true)"),
  'abismo causa morte fatal real');
ok(!sourceScene.includes("this.net.act({kind:'shoot'")&&
   !sourceScene.includes("this.net.act({kind:'dash'"),'habilidades não burlam validação de estamina');
ok(sourceScene.includes("this.net.requestVital(kind,this.facing)")&&
   sourceScene.includes("this.net.on('vital-reply'"),'física só executa após autorização');
ok(sourceScene.includes("grounded?'jump':'doubleJump'"),
  'pulo normal e duplo são pedidos separadamente');
ok(sourceScene.includes("w.safeUntil[i]>now"),'piscar pós-dano para cada personagem');
ok(sourceScene.includes('UM AMIGO CAIU NA FLORESTA')&&
   sourceScene.includes('NINGUÉM FICA PARA TRÁS'),'aviso de morte coletiva');
ok(sourceHud.includes('id="loop-vital-')&&sourceHud.includes('id="loop-hearts-')&&
   sourceHud.includes('id="loop-energy-'),'HUD mostra vida/estamina de todos');
ok(sourceHud.includes('h>=world.health[seat]')&&
   sourceHud.includes("bar.style.width=percent+'%'"),'barras e corações reagem aos recursos');
ok(sourceHud.includes("seat===net.localSeat"),'personagem selecionado destacado no painel');
ok(css.includes('.loop-energy-track.low-energy')&&css.includes('@media(pointer:coarse)'),
  'cor âmbar e adaptação touch preservadas');
const legacy=readFileSync('src/survival.ts','utf8');
ok(legacy.includes('applyDamage')&&!sourceNetwork.includes("this.forestAuthority.damage= "),
  'regras de dano das fases clássicas preservadas');
console.log('APROVADO: '+count+' verificações da Etapa 11-B (vida, estamina, morte, HUD e rede).');
