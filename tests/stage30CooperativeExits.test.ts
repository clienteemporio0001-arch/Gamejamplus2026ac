import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {ADVENTURE_EXITS,exitPresence,exitMessage,exitPipoLine} from '../src/sharedExit';
import {LoopAuthority,LOOP_START,LOOP_GEOMETRY,barriers,allDone,validLoop} from '../src/forestLoop';
import {TemporalAuthority,TEMP_START,initTemporal,validTemporal} from '../src/temporalForest';
import {TreeAuthority,TREE_START,validTree} from '../src/treetopForest';
import {FireAuthority,FIRE_START,validFire} from '../src/burningForest';
import {loopObjective} from '../src/forestLoopUI';
const source=(p:string)=>readFileSync('src/'+p+'.ts','utf8');
const at=(phase:1|2|3|4,count:number):Pose[]=>{
 const def=ADVENTURE_EXITS[phase];
 return ([0,1,2] as Seat[]).map(seat=>({
  seat,x:seat<count?def.x+(seat-1)*12:def.x-500-seat*70,
  y:seat<count?def.y:def.y,
  vx:0,vy:0
 }));
};
for(const phase of [1,2,3,4] as const){
 const conf=ADVENTURE_EXITS[phase];
 assert.ok(conf.title.startsWith('TRILHA PARA'));
 assert.ok(['night','rain','canopy','river'].includes(conf.palette));
 for(let count=0;count<=3;count++){
  const members=exitPresence(phase,at(phase,count),[3,3,3]);
  assert.equal(members.count,count);
  assert.equal(members.ready,count===3);
  assert.equal(exitMessage(phase,at(phase,count),[3,3,3],true),
   'AMIGOS REUNIDOS: '+count+'/3');
  assert.equal(exitMessage(phase,at(phase,count),[3,3,3],false),'');
  if(count>0)assert.ok(exitPipoLine(phase,count).length>20);
 }
 assert.equal(exitPresence(phase,at(phase,3),[3,0,3]).ready,false,
  'three living friends necessary');
 assert.equal(exitPresence(phase,[at(phase,3)[0],at(phase,3)[0],at(phase,3)[2]],[3,3,3]).ready,false,
  'unique seat detection prevents duplicate network poses');
}
assert.ok(exitPipoLine(1,1).includes('Ninguém fica para trás'));
assert.ok(exitPipoLine(1,2).includes('mais um amigo'));
assert.ok(exitPipoLine(4,3).includes('lugar seguro'));
for(const layout of [0,1,2] as const){
 const a=new LoopAuthority();a.reset(1000);
 a.world.layout=layout;a.world.observed=true;
 a.world.lastRoute='right';a.world.marks=[true,true,true];
 a.world.suspended=[true,true,true];a.world.suspendedOpen=true;
 a.world.tree=[true,true,true];a.world.bridge=true;
 a.world.final=[true,true,false];a.world.exit=false;
 assert.equal(barriers(a.world).at(-1)?.enabled,true);
 assert.equal(a.tick(at(1,3),2000).won,undefined,
   'incomplete final lock cannot exit');
 a.world.final=[true,true,true];a.world.exit=false;
 // The third lock authoritatively invokes checkExit, independently of
 // the 60-second cycle and with no C-state comparison.
 const pose=at(1,3);
 a.tick(pose,2001);
 assert.equal(a.world.exit,true,'unlock final trunk immediately in layout '+layout);
 assert.equal(barriers(a.world).at(-1)?.enabled,false);
 assert.equal(loopObjective(a.world,at(1,0)).progress,'AMIGOS REUNIDOS: 0/3');
 assert.equal(loopObjective(a.world,at(1,2)).progress,'AMIGOS REUNIDOS: 2/3');
 const result=a.tick(pose,2010);
 assert.equal(result.won,true);
 assert.equal(a.world.completed,true);
 assert.ok(validLoop(a.world));
 const another=new LoopAuthority();another.reset(1000);
 another.world.layout=layout;another.world.bridge=true;
 another.world.final=[true,true,true];another.world.exit=true;
 another.world.blackoutUntil=2100;
 another.tick(at(1,0),2150);
 assert.equal(another.world.exit,true,'unlocked trunk persists across A/B/C');
}
const temporal=new TemporalAuthority();temporal.reset(1000);
temporal.world.bridge=true;temporal.world.roots=[true,true,true];
temporal.world.exit=true;
assert.equal(temporal.tick(at(2,2),2000).won,undefined);
assert.equal(temporal.tick(at(2,3),2010).won,undefined,'Bafomet ainda guarda a saída');
temporal.world.boss.hp=0;
temporal.world.boss.defeatedAt=2010;
assert.equal(temporal.tick(at(2,3),2020).won,true,'trio só avança após derrotar Bafomet');
assert.ok(validTemporal(temporal.world));
const treetop=new TreeAuthority();treetop.reset(1000);
treetop.world.bridgeOpen=true;treetop.world.ropeOpen=true;
treetop.world.time=[true,true,true];treetop.world.finalOpen=true;
assert.notEqual(treetop.tick(at(3,2),2000).won,true);
assert.equal(treetop.tick(at(3,3),2010).won,true);
assert.ok(validTree(treetop.world));
const fire=new FireAuthority();fire.reset(1000);
fire.world.logOpen=true;fire.world.smokeOpen=true;fire.world.treeOpen=true;
assert.notEqual(fire.tick(at(4,2),2000,999999).won,true);
assert.equal(fire.tick(at(4,3),2010,999999).won,true);
assert.ok(validFire(fire.world));
const loop=source('forestLoop'),scene=source('forestLoopScene');
const shared=source('cooperativeExitArt'),net=source('network');
assert.ok(!loop.includes('allDone(this.world.final)&&this.world.layout===2'));
assert.ok(!loop.includes('allDone(w.final)&&w.layout===2'));
assert.ok(scene.includes('this.active(this.finalBarrier,!w.exit)'));
assert.ok(scene.includes('targets:trunk'));
assert.ok(scene.includes('this.finalBarrierVisual.setVisible(false)'));
assert.ok(scene.includes('new CooperativeExitArt(this,1'));
for(const [name,num] of [['temporalForestScene',2],['treetopForestScene',3],
 ['burningForestScene',4]] as const){
 const txt=source(name);
 assert.ok(txt.includes('new CooperativeExitArt(this,'+num));
 assert.ok(txt.includes('this.exitArt?.update('));
}
assert.ok(shared.includes('AMIGOS REUNIDOS: '));
assert.ok(shared.includes('duration:1450'));
assert.ok(net.includes("this.setPhase('transition',1"));
assert.ok(net.includes("this.setPhase('transition',2"));
assert.ok(net.includes("this.setPhase('transition',3"));
assert.ok(net.includes("this.setPhase('final',4"));
assert.ok(net.includes("this.broadcast({t:'loop',world:this.loop})"));
console.log('ETAPA 30: no C delay, 4 cooperative exits, all counters, 3 living players, host phase transitions and visuals passed');
