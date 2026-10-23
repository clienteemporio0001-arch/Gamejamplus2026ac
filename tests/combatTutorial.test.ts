import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {CombatTutorial,COMBAT_TUTORIAL_KEY,contactSnapshot,firstCommonEnemyDamage}
 from '../src/combatTutorial';
import {initRatCombat,ratFlight,tickMonsters,activateMonsterSkill,shootMonster,type MonsterCombatWorld}
 from '../src/ratCombat';
import {initVitals,damageVitals} from '../src/loopVitals';
import type {Pose,Seat} from '../src/network';
const start=100000,now=110000;
const world=():MonsterCombatWorld=>({...initVitals(),...initRatCombat(),
 supporting:[null,null,null]});
const poses=():Pose[]=>([0,1,2] as Seat[]).map(seat=>({
 seat,x:6500+seat*65,y:606,vx:0,vy:0
}));
assert.equal(COMBAT_TUTORIAL_KEY,'afm-combat-tutorial-seen-v1');
assert.equal(firstCommonEnemyDamage(null,world(),now),false,'snapshot inicial não dispara');
for(const stage of [1,2,3,4] as const){
 const w=world(),pos=ratFlight(stage,0,now,start);
 const party=poses();party[1]={seat:1,x:pos.x,y:pos.y,vx:0,vy:0};
 const baseline=contactSnapshot(w);
 const contact=tickMonsters(stage,w,party,now,start);
 assert.equal(contact.hitType,'rat','contato legítimo da fase '+stage);
 assert.equal(w.health[1],2);
 assert.equal(firstCommonEnemyDamage(baseline,w,now),true,
  'primeiro rato detectado na fase '+stage);
 assert.equal(firstCommonEnemyDamage(contactSnapshot(w),w,now+1),false,
  'snapshot repetido não abre tutorial novamente');
 // Dano ambiental tem corações diminuídos, mas não gera impulso de contato.
 const environment=world(),before=contactSnapshot(environment);
 assert.equal(damageVitals(environment,1,now),true);
 assert.equal(firstCommonEnemyDamage(before,environment,now),false,
  'queda/fogo/armadilha não abre combate na fase '+stage);
 // Uma habilidade ofensiva registra impulso, mas não reduz vida.
 const offensive=world(),teo=poses(),enemy=ratFlight(stage,0,now,start);
 teo[0]={seat:0,x:enemy.x,y:enemy.y-45,vx:0,vy:180};
 const previous=contactSnapshot(offensive);
 activateMonsterSkill(offensive,0,'doubleJump',now,1);
 tickMonsters(stage,offensive,teo,now,start);
 assert.equal(offensive.health[0],3,'segundo salto mantém herói seguro');
 assert.ok(offensive.ratDownUntil[0]>now,'Téo elimina inimigo caindo no segundo salto');
 assert.equal(firstCommonEnemyDamage(previous,offensive,now),false,
  'pisada não equivale a tomar dano');
 const nino=world(),dash=poses();const rat=ratFlight(stage,0,now,start);
 dash[2]={seat:2,x:rat.x-12,y:rat.y,vx:270,vy:0};
 activateMonsterSkill(nino,2,'dash',now,1);
 tickMonsters(stage,nino,dash,now,start);
 assert.ok(nino.ratDownUntil[0]>now,'Nino elimina inimigo durante Dash');
 assert.equal(nino.health[2],3,'dash não reduz vida');
 const lia=world();const aim=ratFlight(stage,0,now,start);
 assert.equal(shootMonster(stage,lia,{x:aim.x-60,y:aim.y+18},1,now,start),'rat',
  'Lia elimina inimigo com projétil');
 assert.ok(lia.ratDownUntil[0]>now);
}
// Sem impulso novo, não confundir dano de boss, armadilha ou buraco.
const stale=world();const previous=contactSnapshot(stale);
stale.ratImpacts[0]={at:now-10000,vx:0,vy:0};
stale.health[0]=2;
assert.equal(firstCommonEnemyDamage(previous,stale,now),false,
 'impulso antigo não autoriza popup após outro tipo de dano');
const files=['src/network.ts','src/main.ts','src/combatTutorial.ts','src/combatTutorial.css'];
const sources=files.map(path=>readFileSync(path,'utf8'));
const [network,main,controller,style]=sources;
assert.ok(network.includes('this.isSolo&&this.combatTutorialBlocking')&&
 network.includes('firstCommonEnemyDamage')&&network.includes('now+20000')&&
 network.includes('world.safeUntil[seat]'),'proteção e pausa solo na autoridade');
assert.ok(main.includes("combatTutorial.observe(1,w")&&
 main.includes("combatTutorial.observe(2,w")&&
 main.includes("combatTutorial.observe(3,w")&&
 main.includes("combatTutorial.observe(4,w"),'monitoramento das quatro fases');
assert.ok(controller.includes('COMO DERROTAR OS INIMIGOS')&&
 controller.includes('SEGUNDO SALTO')&&controller.includes("name:'TÉO'")&&
 controller.includes("name:'NINO'")&&controller.includes("name:'LIA'")&&
 controller.includes("skill:'DASH'")&&controller.includes("skill:'PROJÉTIL'"),
 'papéis corretos: Téo pula, Nino dá Dash, Lia dispara');
assert.ok(controller.includes("localStorage.setItem(COMBAT_TUTORIAL_KEY,'yes')")&&
 controller.includes("['Enter',' ','Spacebar']")&&
 controller.includes("this.combatTutorialSeen=true"),
 'apenas uma exibição e confirmação por teclado/touch');
assert.ok(style.includes('@media(pointer:coarse) and (orientation:portrait)')&&
 style.includes('@media(pointer:coarse) and (orientation:landscape)')&&
 style.includes('max-height:100%'),'layout acessível no celular');
console.log('COMBAT TUTORIAL: 4 fases, dano comum, exclusões, proteção, três ataques e teclado/mobile OK');
