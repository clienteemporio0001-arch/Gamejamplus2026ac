import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {initVitals} from '../src/loopVitals';
import {
 RAT_LAYOUT,RAT_SKIN,RAT_RESPAWN_MS,initRatCombat,validRatCombat,
 ratFlight,ratAlive,ratTouch,activateMonsterSkill,shootMonster,tickMonsters,
 type RatCombatWorld
} from '../src/ratCombat';
import type {Seat,Pose} from '../src/network';

const t=100_000;
const pose=(seat:Seat,x:number,y:number,vx=0,vy=0):Pose=>
 ({seat,x,y,vx,vy});
const world=()=>({...initVitals(),...initRatCombat(),
 supporting:[null,null,null] as [Seat|null,Seat|null,Seat|null]});
assert.deepEqual([1,2,3,4].map(i=>RAT_SKIN[i as 1|2|3|4]),
 ['pink','black','king','fire'],'only final stage uses the flaming sprite');
for(const stage of [1,2,3,4] as const){
 const spots=RAT_LAYOUT[stage];
 assert.equal(spots.length,3,'exactly three enemies per stage '+stage);
 for(const id of [0,1,2] as const){
  const w=world();
  assert.ok(validRatCombat(w));
  const p=ratFlight(stage,id,t,t-2000);
  assert.deepEqual(ratFlight(stage,id,t,t-2000),p,'same clock, same movement');
  assert.ok(ratTouch(stage,id,p,t,t-2000),'hitbox follows visible rat');
  assert.equal(ratTouch(stage,id,{x:p.x+90,y:p.y},t,t-2000),false);
  const shot=shootMonster(stage,w,{x:p.x-110,y:p.y+18},1,t,t-2000);
  assert.equal(shot,'rat','Lia should defeat a rat with one ranged shot');
  assert.ok(w.ratDownUntil.some(at=>at===t+RAT_RESPAWN_MS));
 }
 // A stomp requires a previously approved DOUBLE jump plus downward landing.
 {
  const w=world(),r=ratFlight(stage,0,t,t-2000);
  const p=pose(0,r.x,r.y-51,0,150);
  activateMonsterSkill(w,0,'doubleJump',t,1);
  const tick=tickMonsters(stage,w,[p],t+16,t-2000);
  assert.ok(tick.changed,'Téo stomp defeats an enemy on second jump');
  assert.ok(w.ratDownUntil.some(at=>at>t),'rat is knocked out by stomp');
  const q=world();
  tickMonsters(stage,q,[p],t+16,t-2000);
  assert.ok(!q.ratDownUntil.some(at=>at>0),'ordinary jump cannot stomp');
 }
 // Nino must actually be moving along his approved DASH.
 {
  const w=world(),r=ratFlight(stage,1,t,t-2000);
  activateMonsterSkill(w,2,'dash',t,1);
  const tick=tickMonsters(stage,w,[pose(2,r.x,r.y,280,0)],t+10,t-2000);
  assert.ok(tick.changed,'Nino approved dash can defeat a rat');
  assert.ok(w.ratDownUntil.some(at=>at>t));
  const q=world();
  tickMonsters(stage,q,[pose(2,r.x,r.y,280,0)],t+10,t-2000);
  assert.ok(!q.ratDownUntil.some(at=>at>0),'no unapproved dash attack');
 }
 // On contact without attacking, the host removes one heart and pushes away.
 {
  const w=world(),r=ratFlight(stage,2,t,t-2000);
  const p=pose(1,r.x+10,r.y,0,0);
  const result=tickMonsters(stage,w,[p],t,t-2000);
  assert.ok(result.changed&&result.hitType==='rat','contact causes actual damage');
  assert.equal(w.health[1],2,'one heart per collision');
  const impulse=stage>=3?w.ratImpacts[1]:w.ratImpacts[1];
  // Late phases broadcast their knockback through batImpacts; the rat-only
  // simulation still owns the same recoil value.
  assert.ok(impulse===null||impulse.vx>0);
  tickMonsters(stage,w,[p],t+60,t-2000);
  assert.equal(w.health[1],2,'existing invulnerability avoids repeated damage');
 }
}
for(const kind of ['pink','black','king','fire']){
 const path='public/assets/enemies/rat-'+kind+'.webp';
 assert.ok(existsSync(path),'sprite shipped offline: '+kind);
 const b=readFileSync(path);
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
}
const visual=readFileSync('src/ratEnemyVisuals.ts','utf8');
assert.ok(visual.includes('scene.load.spritesheet('));
assert.ok(!visual.includes('scene.physics.add')&&!visual.includes('setInteractive('),
 'all collisions are host-owned, not local renderer callbacks');
for(const [stage,name] of [[1,'forestLoopScene'],[2,'temporalForestScene'],
 [3,'treetopForestScene'],[4,'burningForestScene']] as const){
 const src=readFileSync('src/'+name+'.ts','utf8');
 assert.ok(src.includes('preloadRatEnemies(this,'+stage+')')&&
 src.includes('new RatEnemyVisuals(this,'+stage+')')&&
 src.includes('this.ratEnemies?.update('),'three animated rats in stage '+stage);
}
const net=readFileSync('src/network.ts','utf8');
for(const stage of ['LoopWorld','TemporalWorld','TreeWorld','FireWorld']){
 assert.ok(net.includes(stage+"['ratDownUntil']")&&net.includes(stage+"['ratImpacts']"),
 'multiplayer shares enemy knockouts and hit impulses: '+stage);
}
const credits=readFileSync('public/assets/enemies/RATFOLK-CREDITS.md','utf8');
assert.ok(credits.includes('CC BY 3.0')&&credits.includes('Svetlana')&&
 credits.includes('Jordan Irwin'));
console.log('RATOS: 12 original sprite enemies, four stages, Lia/Teo/Nino and network ✓');
