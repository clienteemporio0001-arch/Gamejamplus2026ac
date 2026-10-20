import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {
 FIRE_WIDTH,FIRE_HEIGHT,FIRE_FLOOR_Y,FIRE_DEATH_Y,FIRE_START,FIRE_PLATFORMS,FIRE_TARGETS,
 FIRE_BOSS_REVIVE_MS,FIRE_BOSS_RESPAWNS,FIRE_ABYSS_RESET_Y,
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
assert.equal(authority.interact(2,'dash',characters,start+1300),true);
assert.equal(w.log[2],false,'Nino must still be near the correct circle');
characters[2]={seat:2,x:FIRE_TARGETS.log.nino.x,y:FIRE_TARGETS.log.nino.y,vx:0,vy:0};
assert.equal(w.dashAt[2],start+1300,'Dash is registered by the interaction');
assert.equal(authority.interact(2,'dash',characters,start+1800),true,'Dash alone activates log circle');
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
assert.equal(authority.interact(2,'dash',characters,start+4500),true);
assert.equal(w.smoke[2],true,'Dash alone activates smoke circle');
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
assert.equal(authority.interact(2,'dash',characters,start+8000),true);
assert.equal(w.tree[2],true,'Dash alone activates last fire circle');
assert.equal(w.dashAt[2],start+8000,'the three fire circles require Dash');
assert.equal(w.tree.every(Boolean),true,'third coop puzzle all three');
assert.equal(w.treeOpen,false,'tree must visually fall before its collision bridge appears');
assert.ok(w.treeFallAt>start+8000);
authority.tick(characters,w.treeFallAt+100);
assert.equal(w.treeOpen,true,'tree bridge unlocked after animation delay');
assert.equal(firePlatforms(w).some(p=>p.requires==='tree'),true);
assert.equal(pipoHint({phase:4,world:w}).objective,'corrida final');
const late=fireCheckpoint(w);assert.equal(late.length,3);
assert.ok(late.every(p=>fireGrounded(w,p)));
const beforeFall=initFire(start);
assert.equal(fireFlareActive(beforeFall,start,4390),true,'flames are dangerous before tree falls');
assert.equal(fireFlareActive(w,start,4390),false,'fallen tree clears the final path');
w.flare=1;
assert.equal(fireFlareActive(w,start+4400,4390),false,'flames stay extinguished in state B');
w.flare=0;
assert.equal(fireDamageZone(w,{x:4390,y:652},start),false,'safe final path remains fire-free');
assert.equal(fireDamageZone(w,{x:4390,y:560},start),false,'safe at higher elevations');
w.flare=2;
assert.equal(fireFlareActive(w,start+8800,4860),false,'final path stays clear in state C');
// Victory demands all three living and near the safe river.
const exit=FIRE_TARGETS.exit;
const finishing:Pose[]=([0,1,2] as Seat[]).map(seat=>
 ({seat,x:exit.x,y:exit.y,vx:0,vy:0}));
assert.notEqual(authority.tick([...finishing.slice(0,2),{...finishing[2],x:4400}],
 start+11000).won,true,'cannot win without the third friend');
assert.notEqual(authority.tick(finishing,start+11100).won,true,'boss prevents the final escape');
w.hound.hp=0;w.hound.defeatedAt=start+11100;
assert.equal(authority.tick(finishing,start+11200).won,true,'all three characters escape after the Hound dies');
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
const resumedAt=start+1000;
const respawn=fatal.tick(lost,resumedAt);
assert.equal(respawn.respawn,true,'fall must restart ALL players immediately');
assert.deepEqual(fatal.world.health,[3,3,3],'all teammates must revive together');
assert.equal(fatal.world.deadUntil,0,'no zero-life character can run beneath the map');
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
assert.ok(main.includes('FLORESTA EM CHAMAS')&&main.includes("data-phase"));
assert.ok(main.includes("net.startSolo(level,false,'loop',avatars)"),'Fase 04 selecionável no mapa solo');
assert.ok(!main.includes('FERRAMENTAS DE DESENVOLVIMENTO'),'developer menu removed from public');
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

{
 const clearing=initFire(start);
 clearing.treeOpen=true;
 for(const x of [4390,4500,4700,4850,5020]){
  assert.equal(fireFlareActive(clearing,start+9900,x),false,'no active flames in cleared final passage');
  assert.equal(fireDamageZone(clearing,{x,y:670},start+9900),false,'no fire damage after the tree falls');
 }
 assert.ok(fireballHazards(clearing,start+35000).every(b=>b.x<4390||b.x>5030),
  'meteor impacts cannot land in the clearing after the tree falls');
 const wiped=new FireAuthority();
 wiped.reset(start);
 wiped.world.health[1]=0;
 const reset=wiped.tick(FIRE_START.map(clone),start+900);
 assert.equal(reset.respawn,true,'zero hearts immediately restarts the phase for all three');
 assert.deepEqual(reset.poses,FIRE_START);
 assert.deepEqual(wiped.world.health,[3,3,3]);
}

{
 // Regression: opening the fallen-tree bridge must clear ALL flames across the
 // approach to the final guardian. A tracked escapeAt is NOT a damaging wall.
 const finalArena=initFire(start);
 finalArena.logOpen=true;finalArena.smokeOpen=true;finalArena.treeOpen=true;
 finalArena.escapeAt=start+1500;
 finalArena.flare=0;
 for(const x of [3890,3980,4050,4160,4240,4390,4520,4680,4860,5020]){
  assert.equal(fireDamageZone(finalArena,{x,y:675},start+60000),false,
   'final path must not contain damaging fire barrier at x='+x);
 }
 const art=readFileSync('src/burningForestArt.ts','utf8');
 const logic=readFileSync('src/burningForest.ts','utf8');
 assert.ok(!art.includes('escapeWallX('),'no chase wall is drawn in stage 4');
 assert.ok(!logic.includes('escapeFireHit('),'no invisible moving wall damages heroes');
 assert.ok(art.includes('intensity:w.treeOpen?0:1'),
  'tree bridge extinguishes persistent approach flames');
 assert.equal(finalArena.hound.hp,8,'Boss and combat state remain intact');
}

{
 const bossFight=new FireAuthority();
 bossFight.reset(start);
 bossFight.world.logOpen=true;bossFight.world.smokeOpen=true;bossFight.world.treeOpen=true;
 const arena=FIRE_BOSS_RESPAWNS.map(clone);
 // First player enters the boss area: this persists if everyone retreats later.
 arena[0].x=4480;
 // Isolate the timer test from fire/rat hits, including the arena-entry tick.
 bossFight.world.safeUntil=[start+FIRE_BOSS_REVIVE_MS+15000,start+FIRE_BOSS_REVIVE_MS+15000,start+FIRE_BOSS_REVIVE_MS+15000];
 bossFight.tick(arena,start+100);
 assert.equal(bossFight.world.bossEncounterStarted,true,'boss encounter enables 10s individual revives');
 const formerReset=bossFight.world.resetId;
 const hp=bossFight.world.hound.hp;
 bossFight.world.health[0]=0;
 const first=bossFight.tick(arena,start+200);
 assert.equal(first.respawn,undefined,'one player death must not reset the entire phase');
 assert.equal(bossFight.world.reviveAt[0],start+200+FIRE_BOSS_REVIVE_MS);
 assert.equal(bossFight.world.health[0],0);
 assert.equal(bossFight.world.health[1],3);
 assert.equal(bossFight.world.resetId,formerReset);
 assert.equal(bossFight.world.hound.hp,hp,'boss health persists while Teo is dead');
 const before=bossFight.tick(arena,start+200+FIRE_BOSS_REVIVE_MS-1);
 assert.equal(before.respawns,undefined,'revival cannot occur before ten seconds');
 const restored=bossFight.tick(arena,start+200+FIRE_BOSS_REVIVE_MS+1);
 assert.deepEqual(restored.respawns?.[0],FIRE_BOSS_RESPAWNS[0],
  'hero respawns safely next to the Boss, not at the beginning');
 assert.deepEqual(bossFight.world.health,[3,3,3]);
 assert.equal(bossFight.world.stamina[0],100);
 assert.ok(bossFight.world.safeUntil[0]>start+200+FIRE_BOSS_REVIVE_MS+1000);
 assert.equal(bossFight.world.treeOpen,true,'puzzles remain completed after individual death');
 assert.equal(bossFight.world.resetId,formerReset);
 assert.ok(validFire(bossFight.world),'network snapshot remains valid with revive timers');
 const teamWipe=new FireAuthority();
 teamWipe.reset(start);
 teamWipe.world.treeOpen=true;teamWipe.world.bossEncounterStarted=true;
 teamWipe.world.health=[0,0,0];
 assert.equal(teamWipe.tick(arena,start+350).respawn,true,
  'last teammate death immediately restarts the entire phase');
 assert.equal(teamWipe.world.treeOpen,false);
 const pit=new FireAuthority();
 pit.reset(start);
 pit.world.treeOpen=true;pit.world.bossEncounterStarted=true;
 const fallen=arena.map(clone);fallen[2].y=FIRE_DEATH_Y+10;
 assert.equal(pit.tick(fallen,start+400).respawn,true,
  'falling into abyss still resets all players even when Boss encounter started');
 // Do not reset on a dead body's stale falling location.
 const stopped=new FireAuthority();stopped.reset(start);
 stopped.world.treeOpen=true;stopped.world.bossEncounterStarted=true;
 stopped.world.health[2]=0;
 const corpse=arena.map(clone);corpse[2].y=FIRE_DEATH_Y+12;
 assert.equal(stopped.tick(corpse,start+500).respawn,undefined,
  'a fallen corpse cannot cause repeated team resets');
}

{
 // Regression: the old 803px kill boundary let bodies run far below the
 // visible floor. Death must be recognized right after slipping off it.
 const early=new FireAuthority();early.reset(start);
 early.world.treeOpen=true;early.world.bossEncounterStarted=true;
 const posed=FIRE_BOSS_RESPAWNS.map(clone);
 posed[0]={...posed[0],x:4120,y:FIRE_ABYSS_RESET_Y+1};
 const fall=early.tick(posed,start+200);
 assert.equal(fall.respawn,true,'a hero under floor instantly restarts all three');
 assert.deepEqual(fall.poses,FIRE_START);
 assert.deepEqual(early.world.health,[3,3,3]);
 assert.equal(early.world.bossEncounterStarted,false);

 const pit=new FireAuthority();pit.reset(start);
 const bridge=FIRE_START.map(clone);
 bridge[1]={...bridge[1],x:1400,y:FIRE_FLOOR_Y+35};
 assert.equal(pit.tick(bridge,start+250).respawn,true,
  'falling into the first gap resets the team before the death boundary');
 const timber=new FireAuthority();timber.reset(start);
 const timberPose=FIRE_START.map(clone);
 timberPose[2]={...timberPose[2],x:4050,y:FIRE_FLOOR_Y+35};
 assert.equal(timber.tick(timberPose,start+300).respawn,true,
  'missing final tree bridge cannot trap Nino under the floor');

 const corpse=new FireAuthority();corpse.reset(start);
 corpse.world.treeOpen=true;corpse.world.bossEncounterStarted=true;
 corpse.world.safeUntil=[start+20000,start+20000,start+20000];
 const same=FIRE_BOSS_RESPAWNS.map(clone);
 same[1]={...same[1],y:FIRE_ABYSS_RESET_Y+80};
 corpse.world.health[1]=0;
 assert.equal(corpse.tick(same,start+400).respawn,undefined,
  'an already dead body below screen cannot repeatedly reset the phase');
 assert.equal(corpse.world.reviveAt[1],start+10400);
 const revived=corpse.tick(same,start+10401);
 assert.deepEqual(revived.respawns?.[0],FIRE_BOSS_RESPAWNS[1],
  'dead Lia returns to a safe boss checkpoint after 10 seconds');
 assert.equal(corpse.world.health[1],3);

 const scene=readFileSync('src/burningForestScene.ts','utf8');
 const sprites=readFileSync('src/burningForestArt.ts','utf8');
 assert.ok(scene.includes('this.net.selectSoloSeat(alive)'),
  'solo control switches to a living hero when the selected one dies');
 assert.ok(scene.includes('frozen.setAllowGravity(false).setVelocity(0,0)'),
  'dead actors cannot fall or walk below the world');
 assert.ok(scene.includes('this.reviveText.setVisible(pending.length>0)'),
  'screen shows the 10-second countdown');
 assert.ok(sprites.includes('entry.sprite?.setVisible(alive)'),
  'dead hero character art is hidden until the respawn event');
}
