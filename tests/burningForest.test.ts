import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {
 FIRE_WIDTH,FIRE_HEIGHT,FIRE_FLOOR_Y,FIRE_DEATH_Y,FIRE_START,FIRE_PLATFORMS,FIRE_TARGETS,
 FIRE_SMOKE_ZONE,FIRE_WIND_PERIOD,FIRE_COLLAPSE_PERIOD,
 FireAuthority,initFire,validFire,firePlatforms,fireGrounded,fireObjective,
 fireWind,fireFlareActive,fireDamageZone,fireHeavySmoke,fireTreePhase,fireCheckpoint,
 FIRE_SHELTERS,FIREBALL_INTERVAL,FIREBALL_WARNING,FIREBALL_FALL,
 fireSheltered,fireballHazards,fireballHit
} from '../src/burningForest';
import {pipoHint} from '../src/pipoHints';
const start=3000000;
const clone=(p:Pose):Pose=>({...p});
const authority=new FireAuthority();authority.reset(start);
const w=authority.world;
assert.ok(validFire(w),'initial authority state valid for PeerJS');
assert.equal(FIRE_WIDTH,5200);
assert.equal(FIRE_HEIGHT,850);
assert.equal(FIRE_START.length,3);
assert.ok(FIRE_START.every(p=>fireGrounded(w,p)),'each initial body starts on real floor');
assert.ok(FIRE_DEATH_Y>FIRE_FLOOR_Y);
assert.equal(firePlatforms(w).some(p=>p.requires==='log'),false);
assert.equal(firePlatforms(w).some(p=>p.requires==='tree'),false);
assert.ok(FIRE_PLATFORMS.length>=12);
assert.equal(fireObjective(w).progress,'0/3');
assert.equal(pipoHint({phase:4,world:w}).objective,'tronco em chamas');
// The bridge is longer than the grounded jump range; it overlaps both ledges.
const gap=300;assert.ok(gap>260);
const logPlatform=FIRE_PLATFORMS.find(p=>p.requires==='log')!;
assert.ok(logPlatform.x-logPlatform.width/2<=1250);
assert.ok(logPlatform.x+logPlatform.width/2>=1550);
assert.ok(FIRE_SMOKE_ZONE.start>1550);
const characters=FIRE_START.map(clone);
characters[0]={seat:0,x:FIRE_TARGETS.log.teo.x,y:FIRE_TARGETS.log.teo.y,vx:0,vy:0};
characters[1]={seat:1,x:930,y:652,vx:0,vy:0};
characters[2]={seat:2,x:930,y:652,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',characters,start+800),true);
assert.equal(w.log[0],true,'Téo released first log lever');
assert.equal(authority.authorizeEnergy(1,'shoot',characters,start+1100,1).ok,true);
assert.equal(w.log[1],true,'Lia hit first log target');
assert.equal(authority.interact(2,'switch',characters,start+1300),true);
assert.equal(w.log[2],false,'Nino must still be near the correct circle');
characters[2]={seat:2,x:FIRE_TARGETS.log.nino.x,y:FIRE_TARGETS.log.nino.y,vx:0,vy:0};
assert.equal(w.dashAt[2],0,'no dash is required');
assert.equal(authority.interact(2,'switch',characters,start+1800),true,'E alone activates log circle');
assert.equal(w.log[2],true);
assert.ok(w.logOpen,'burning log opens only with all three actions');
assert.ok(firePlatforms(w).some(p=>p.requires==='log'));
assert.equal(fireObjective(w).progress,'0/3');
assert.equal(pipoHint({phase:4,world:w}).objective,'corredor de fumaça');
assert.equal(fireHeavySmoke(w,{x:2500,y:653},start+2200),true);
assert.equal(fireHeavySmoke(w,{x:1700,y:653},start+2200),false);
assert.equal(fireWind(start,w),1);
assert.equal(fireWind(start+FIRE_WIND_PERIOD,w),-1);
characters[1]={seat:1,x:2310,y:652,vx:0,vy:0};
characters[2]={seat:2,x:2480,y:652,vx:0,vy:0};
characters[0]={seat:0,x:FIRE_TARGETS.smoke.teo.x,y:FIRE_TARGETS.smoke.teo.y,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',characters,start+2800),true);
assert.equal(authority.authorizeEnergy(1,'shoot',characters,start+3000,1).ok,true);
assert.equal(w.smoke[1],true,'Lia shot smoke vent');
characters[2]={seat:2,x:FIRE_TARGETS.smoke.nino.x,y:FIRE_TARGETS.smoke.nino.y,vx:0,vy:0};
assert.equal(authority.interact(2,'switch',characters,start+4500),true);
assert.equal(w.smoke[2],true,'E alone activates smoke circle');
assert.ok(w.smokeOpen,'vent releases smoke corridor');
assert.equal(fireHeavySmoke(w,{x:2500,y:653},start+4700),false);
assert.equal(pipoHint({phase:4,world:w}).objective,'árvores caindo');
// Simulate travel and stamina recovery between the second and third challenges.
for(let t=4700;t<=7400;t+=50)authority.tickResources(characters,start+t);
characters[0]={seat:0,x:FIRE_TARGETS.tree.teo.x,y:FIRE_TARGETS.tree.teo.y,vx:0,vy:0};
characters[1]={seat:1,x:3470,y:652,vx:0,vy:0};
characters[2]={seat:2,x:3520,y:652,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',characters,start+5500),true);
assert.equal(authority.authorizeEnergy(1,'shoot',characters,start+6000,1).ok,true);
characters[2]={seat:2,x:FIRE_TARGETS.tree.nino.x,y:FIRE_TARGETS.tree.nino.y,vx:0,vy:0};
assert.equal(authority.interact(2,'switch',characters,start+8000),true);
assert.equal(w.tree[2],true,'E alone activates last fire circle');
assert.equal(w.dashAt[2],0,'all three fire circles work without dash');
assert.equal(w.tree.every(Boolean),true,'third coop puzzle all three');
assert.equal(w.treeOpen,false,'tree must visually fall before its collision bridge appears');
assert.ok(w.treeFallAt>start+8000);
authority.tick(characters,w.treeFallAt+100);
assert.equal(w.treeOpen,true,'tree bridge unlocked after animation delay');
assert.equal(firePlatforms(w).some(p=>p.requires==='tree'),true);
assert.equal(pipoHint({phase:4,world:w}).objective,'corrida final');
const late=fireCheckpoint(w);assert.equal(late.length,3);
assert.ok(late.every(p=>fireGrounded(w,p)));
assert.equal(fireFlareActive(w,start,4390),true,'first area ignites during first cycle');
w.flare=1; // replay host snapshot after the first fire window
assert.equal(fireFlareActive(w,start+4400,4390),false,'first fire safely subsides');
w.flare=0;
assert.equal(fireDamageZone(w,{x:4390,y:652},start),true,'first active flare damages');
assert.equal(fireDamageZone(w,{x:4390,y:560},start),false,'above fire safe');
w.flare=2; // host-authoritative third active phase
assert.equal(fireFlareActive(w,start+8800,4860),true,'third flare active in phase 2');
// Victory demands all three living and near the safe river.
const exit=FIRE_TARGETS.exit;
const finishing:Pose[]=([0,1,2] as Seat[]).map(seat=>
 ({seat,x:exit.x,y:exit.y,vx:0,vy:0}));
assert.notEqual(authority.tick([...finishing.slice(0,2),{...finishing[2],x:4400}],
 start+11000).won,true,'cannot win without the third friend');
assert.equal(authority.tick(finishing,start+11100).won,true,'all three characters complete final escape');
assert.ok(w.completed);
assert.ok(validFire(w));
// Collapse hazard is telegraphed before a damaging impact.
const storm=new FireAuthority();storm.reset(start);
assert.equal(fireTreePhase(storm.world,start+14000),'warning');
assert.equal(fireTreePhase(storm.world,start+15200),'impact');
const danger=FIRE_START.map(clone);
danger[0]={seat:0,x:3655,y:653,vx:0,vy:0};
storm.tick(danger,start+14000);
assert.ok(storm.world.treeWarningUntil>start+14000);
assert.equal(storm.world.treeStatus,'warning','host announces the falling tree');
storm.tick(danger,start+15200);
assert.equal(storm.world.treeStatus,'impact','host synchronizes tree impact');
assert.ok(storm.world.health[0]<3,'collapse causes real damage');
assert.equal(fireTreePhase(storm.world,start+17000),'calm');
// Heavy smoke drains stamina; standing in it for long is punished.
const choking=new FireAuthority();choking.reset(start);
const group=FIRE_START.map(clone);group[1]={seat:1,x:2530,y:653,vx:0,vy:0};
const initial=choking.world.stamina[1];
for(let i=1;i<=35;i++)choking.tickResources(group,start+i*100);
assert.ok(choking.world.stamina[1]<initial,'heavy smoke consumes stamina');
assert.ok(choking.world.smokeSeconds[1]>2.5);
const refreshed=FIRE_START.map(clone);
choking.tickResources(refreshed,start+4000);
assert.equal(choking.world.smokeSeconds[1],0,'clean air resets accumulated exposure');
// Fire damages with invulnerability. A death RESTARTS THE ENTIRE phase 4.
const fatal=new FireAuthority();fatal.reset(start);
const lost=FIRE_START.map(clone);
// Simulate the last crossing already solved: no progress may survive death.
fatal.world.log=[true,true,true];fatal.world.logOpen=true;
fatal.world.smoke=[true,true,true];fatal.world.smokeOpen=true;
fatal.world.tree=[true,true,true];fatal.world.treeOpen=true;
fatal.world.layout=2;fatal.world.cycle=7;fatal.world.phaseStart=start+500;
fatal.world.stamina=[11,42,75];
fatal.world.supporting=[null,2,null];
const oldResetId=fatal.world.resetId;
lost[2]={seat:2,x:4450,y:FIRE_DEATH_Y+2,vx:0,vy:700};
fatal.tick(lost,start+1000);
assert.equal(fatal.world.health[2],0,'fatal drop must kill Nino even after all puzzles');
assert.ok(fatal.world.deadUntil>start+1000);
assert.equal(fatal.tick(lost,start+1200).respawn,undefined,'no early respawn');
const resumedAt=start+2800;
const respawn=fatal.tick(lost,resumedAt);
assert.equal(respawn.respawn,true,'collective restart after death delay');
assert.deepEqual(respawn.poses,FIRE_START,'all three must return to ORIGINAL entry');
assert.notEqual(respawn.poses?.[0].x,fireCheckpoint({
 ...initFire(start),treeOpen:true
})[0].x,'never use late checkpoint');
assert.deepEqual(fatal.world.health,[3,3,3]);
assert.deepEqual(fatal.world.stamina,[100,100,100]);
assert.equal(fatal.world.logOpen,false,'first bridge locked again');
assert.equal(fatal.world.smokeOpen,false,'smoke passage locked again');
assert.equal(fatal.world.treeOpen,false,'last fallen-tree bridge locked again');
assert.deepEqual(fatal.world.log,[false,false,false]);
assert.deepEqual(fatal.world.smoke,[false,false,false]);
assert.deepEqual(fatal.world.tree,[false,false,false]);
assert.deepEqual(fatal.world.supporting,[null,null,null]);
assert.deepEqual(fatal.world.dashAt,[0,0,0]);
assert.equal(fatal.world.layout,0,'forest state A restored');
assert.equal(fatal.world.cycle,0,'transformation counter reset');
assert.equal(fatal.world.cycleStart,resumedAt,'hazard timers reset');
assert.equal(fatal.world.phaseStart,resumedAt);
assert.equal(fatal.world.deadUntil,0);
assert.equal(fatal.world.completed,false);
assert.equal(fatal.world.resetId,oldResetId+1,'force client reset using resetId');
assert.ok(fatal.world.safeUntil.every(t=>t>=resumedAt+1600),'spawn grace period');
assert.ok(validFire(fatal.world),'fresh state remains valid on network');
// Team can play again from scratch after death.
const restarted=FIRE_START.map(clone);
restarted[0]={seat:0,x:FIRE_TARGETS.log.teo.x,y:FIRE_TARGETS.log.teo.y,vx:0,vy:0};
assert.equal(fatal.interact(0,'lever',restarted,resumedAt+250),true);
assert.equal(fatal.world.log[0],true,'puzzle reacts after full phase reset');
// Stage-specific source checks verify that classic fourth phase was NOT replaced.
const network=readFileSync('src/network.ts','utf8');
const main=readFileSync('src/main.ts','utf8');
const pipo=readFileSync('src/pipoGuide.ts','utf8');
const scene=readFileSync('src/burningForestScene.ts','utf8');
assert.ok(network.includes("this.setPhase('transition',3,Date.now()+6500)"));
assert.ok(network.includes("if(this.experience==='loop'&&this.level===4)"));
assert.ok(network.includes("this.broadcast({t:'fire',world:this.fire})"));
assert.ok(network.includes("this.setPhase('final',4)"));
assert.ok(main.includes("button('dev-fire','TESTAR FASE 04 · FLORESTA EM CHAMAS'"));
assert.ok(main.includes("net.startFireSolo()"));
assert.ok(main.includes("button('dev-classic-'+level"));
assert.ok(main.includes('NINGUÉM FICA PARA TRÁS. NEM A FLORESTA.'));
assert.ok(scene.includes('new SoloBodies(')&&scene.includes("consumeTouch(this.touch,'jump')"));
assert.ok(scene.includes("this.net.on('fire'"));
assert.ok(pipo.includes("phase:4,world:this.net.fire"));
assert.ok(validFire(initFire(start)));
console.log('ETAPA 19: host authority, fire, smoke, timed tree collapse, all 3 puzzles, final victory and regressions PASSED');

// Meteor shower regression: visual schedule, server collision and safety all
// use the same exported functions, without any random client-side damage.
{
 const meteor=new FireAuthority();meteor.reset(start);
 const w=meteor.world;
 assert.equal(FIRE_SHELTERS.length,5);
 assert.ok(fireSheltered({x:FIRE_SHELTERS[0].x,y:653}));
 assert.ok(!fireSheltered({x:FIRE_SHELTERS[0].x+120,y:653}));
 assert.ok(fireDamageZone(w,{x:4590,y:653},start)===false,
  'fire shelters also protect from nearby ground flames');
 const first=1200, lane=0, offset=(lane*977)%4300;
 const warnAt=start+first+offset+200;
 const pending=fireballHazards(w,warnAt).find(b=>b.lane===lane);
 assert.equal(pending?.phase,'warning');
 assert.equal(fireballHit(w,{x:pending!.x,y:pending!.impactY},warnAt),false,
  'the warning never damages a player');
 const landingTime=start+first+offset+FIREBALL_WARNING+FIREBALL_FALL+120;
 const impact=fireballHazards(w,landingTime).find(b=>b.lane===lane);
 assert.equal(impact?.phase,'impact');
 assert.equal(fireballHit(w,{x:impact!.x,y:impact!.impactY},landingTime),true);
 const group=FIRE_START.map(p=>({...p}));
 group[0]={seat:0,x:impact!.x,y:impact!.impactY,vx:0,vy:0};
 meteor.tick(group,landingTime);
 assert.equal(w.health[0],2,'falling fireball removes one heart');
 assert.equal(w.damageCause,'fireball');
 meteor.tick(group,landingTime+100);
 assert.equal(w.health[0],2,'damage i-frames prevent multiple instant hits');
 assert.ok(validFire(w));
 const protect=new FireAuthority();protect.reset(start);
 const shelteredGroup=FIRE_START.map(p=>({...p}));
 shelteredGroup[0]={seat:0,x:FIRE_SHELTERS[0].x,y:653,vx:0,vy:0};
 for(let t=0;t<FIREBALL_INTERVAL*2;t+=100)
  protect.tick(shelteredGroup,start+t);
 assert.equal(protect.world.health[0],3,'fire shelter protects in repeated volleys');
}
