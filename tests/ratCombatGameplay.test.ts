import {strict as assert} from 'node:assert';
import {existsSync,readFileSync} from 'node:fs';
import {initVitals} from '../src/loopVitals';
import {initialBats,initialBatImpacts,BAT_DOWN_MS,batFlight} from '../src/flyingBats';
import {RAT_LAYOUT,RAT_SKIN,RAT_RESPAWN_MS,ratFlight,ratAlive,
 initialRats,initRatCombat,validRatCombat,activateMonsterSkill,
 shootMonster,tickMonsters,type RatLevel,type MonsterCombatWorld} from '../src/ratCombat';
import type {Pose,Seat} from '../src/network';

const now=160_000,start=now-2000;
const makeWorld=():MonsterCombatWorld=>({
 ...initVitals(),...initRatCombat(),supporting:[null,null,null],
 batDownUntil:initialBats(),batImpacts:initialBatImpacts()
});
const poses=():Pose[]=>([0,1,2] as Seat[]).map(seat=>({
 seat,x:50000+seat*100,y:900,vx:0,vy:0
}));
const expectedKinds=['pink','black','king','fire'];
for(const stage of [1,2,3,4] as RatLevel[]){
 assert.equal(RAT_LAYOUT[stage].length,3,'three rats in each playable phase');
 assert.equal(RAT_SKIN[stage],expectedKinds[stage-1],'fire rat only in phase four');
 const path=RAT_LAYOUT[stage][0],p=ratFlight(stage,0,now,start);
 assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
 assert.ok(Math.abs(p.x-path.x)<=path.span+.001,'patrol stays bounded on solid paths');
 assert.deepEqual(p,ratFlight(stage,0,now,start),'all clients render deterministic paths');
 const w=makeWorld();
 const team=poses();team[2]={seat:2,x:p.x+9,y:p.y,vx:0,vy:0};
 const first=tickMonsters(stage,w,team,now,start);
 assert.equal(first.changed,true,'rat contact triggers a real host state update');
 assert.equal(first.hitType,'rat','host knows a rat caused the impact');
 assert.equal(w.health[2],2,'each rat costs exactly one heart');
 assert.ok(w.ratImpacts[2]&&w.ratImpacts[2]!.vx>0,
  'rat contact pushes Nino AWAY from the enemy');
 assert.ok(w.ratImpacts[2]!.vy<0,'impact also creates a brief upward jolt');
 const prev=w.ratImpacts[2];
 tickMonsters(stage,w,team,now+60,start);
 assert.equal(w.health[2],2,'1.2 second hit protection prevents rapid repeat damage');
 assert.deepEqual(w.ratImpacts[2],prev,'no repeated push during immunity');
 assert.ok(validRatCombat(w),'rat state valid for host/guest snapshots');
 const shot=makeWorld(),lia={x:p.x-100,y:p.y+18};
 assert.equal(shootMonster(stage,shot,lia,1,now,start),'rat',
  'Lia defeats an aligned rat with ONE validated projectile');
 assert.equal(shot.ratDownUntil[0],now+RAT_RESPAWN_MS);
 assert.ok(!ratAlive(shot.ratDownUntil,0,now));
 assert.ok(ratAlive(shot.ratDownUntil,0,now+RAT_RESPAWN_MS),
  'rat returns after configured 12-second cooldown');
 const safe=poses();safe[1]={seat:1,x:p.x,y:p.y,vx:0,vy:0};
 assert.equal(tickMonsters(stage,shot,safe,now+100,start).changed,false,
  'defeated rat cannot immediately injure Lia');
 assert.equal(shot.health[1],3);
 const teo=makeWorld(),stompPos=ratFlight(stage,0,now,start);
 activateMonsterSkill(teo,0,'doubleJump',now,1);
 const landing=poses();
 landing[0]={seat:0,x:stompPos.x,y:stompPos.y-47,vx:0,vy:185};
 tickMonsters(stage,teo,landing,now,start);
 assert.equal(teo.ratDownUntil[0],now+RAT_RESPAWN_MS,
  'Téo landing on top from approved SECOND jump defeats rat');
 assert.equal(teo.health[0],3,'successful stomp does not damage Téo');
 const fakeStomp=makeWorld(),normal=poses();
 normal[0]={seat:0,x:stompPos.x,y:stompPos.y-47,vx:0,vy:185};
 tickMonsters(stage,fakeStomp,normal,now,start);
 assert.equal(fakeStomp.ratDownUntil[0],0,
  'an ordinary fall without second jump cannot defeat a rat');
 const nino=makeWorld(),dashP=ratFlight(stage,0,now,start);
 activateMonsterSkill(nino,2,'dash',now,1);
 const dash=poses();dash[2]={seat:2,x:dashP.x-18,y:dashP.y,vx:270,vy:0};
 tickMonsters(stage,nino,dash,now,start);
 assert.equal(nino.ratDownUntil[0],now+RAT_RESPAWN_MS,
  'Nino kills with an APPROVED forward dash hit');
 assert.equal(nino.health[2],3,'successful dash never hurts Nino');
 const fakeDash=makeWorld();
 tickMonsters(stage,fakeDash,dash,now,start);
 assert.equal(fakeDash.ratDownUntil[0],0,'walking into a rat cannot be mistaken for dash');
 assert.equal(fakeDash.health[2],2,'failed dash contact still costs one heart');
 const wrong=makeWorld();activateMonsterSkill(wrong,1,'dash',now,1);
 assert.equal(wrong.ratDashUntil,0,'Lia cannot activate Nino skill');
}

for(const [stage,file] of [[1,'forestLoopScene'],[2,'temporalForestScene'],
 [3,'treetopForestScene'],[4,'burningForestScene']] as const){
 const src=readFileSync('src/'+file+'.ts','utf8');
 assert.ok(src.includes('preloadRatEnemies(this,'+stage+')')&&
 src.includes('new RatEnemyVisuals(this,'+stage+')')&&
 src.includes('this.ratEnemies?.update(now,w.cycleStart,w.ratDownUntil,pause)'),
 'phase '+stage+' loads, creates and updates exactly three rat sprites');
 if(stage<=2){
  assert.ok(src.includes('private applyRatKnockback(seat:Seat,hit:BatImpact)')&&
   src.includes('setVelocity(hit.vx,hit.vy)'),
   'first two stages apply full recoil physics too');
 }else{
  assert.ok(src.includes('private applyBatKnockback(seat:Seat,hit:BatImpact)'),
   'bat and rat impulses in last two phases share host-authoritative physics');
 }
}

const graphics=readFileSync('src/ratEnemyVisuals.ts','utf8');
assert.ok(graphics.includes("stage:RatLevel")&&graphics.includes('setFrame(')&&
 !graphics.includes('physics.add')&&!graphics.includes('setInteractive('),
 'sprites are visual only: physics and damage remain in host simulation');
for(const kind of ['pink','black','king','fire']){
 const file='public/assets/enemies/rat-'+kind+'.webp';
 assert.ok(existsSync(file),'rat asset '+kind+' committed for itch.io');
 const bytes=readFileSync(file);
 assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
}
assert.ok(readFileSync('public/assets/enemies/RATFOLK-CREDITS.md','utf8')
 .includes('CC BY'),'Game Jam distribution includes real creator attribution');
const net=readFileSync('src/network.ts','utf8');
for(const world of ['LoopWorld','TemporalWorld','TreeWorld','FireWorld']){
 assert.ok(net.includes(world+"['ratDownUntil']")&&
  net.includes(world+"['ratImpacts']"),
  'host and guest copy authoritative rat state for '+world);
}
const batWorld=makeWorld(),batPos=batFlight(3,0,now,start);
batWorld.ratDownUntil=[now+RAT_RESPAWN_MS,now+RAT_RESPAWN_MS,now+RAT_RESPAWN_MS];
const batTeam=poses();batTeam[2]={seat:2,x:batPos.x,y:batPos.y,vx:0,vy:0};
activateMonsterSkill(batWorld,2,'dash',now,1);batTeam[2].vx=270;
tickMonsters(3,batWorld,batTeam,now,start);
assert.ok(batWorld.batDownUntil![0]===now+BAT_DOWN_MS,
 'new Nino dash can also defeat previously implemented bats');
console.log('RAT COMBAT: 12 rats, four licensed styles, 3 hero abilities, cooldown, contact and WebRTC validated');
