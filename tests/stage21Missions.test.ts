import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {LoopAuthority,LOOP_START,LOOP_MARKS,LOOP_GEOMETRY,initLoop,validLoop} from '../src/forestLoop';
import {initTemporal} from '../src/temporalForest';
import {initTree} from '../src/treetopForest';
import {initFire} from '../src/burningForest';
import {missionSnapshot,newlyCompleted} from '../src/missionChapters';
import type {Pose,Seat} from '../src/network';

const now=70000;
const auth=new LoopAuthority();auth.reset(0);
const poses=LOOP_START.map(p=>({...p}));
const go=(seat:Seat,x:number,y=604)=>{
 poses[seat]={seat,x,y,vx:0,vy:0};
};
const act=(seat:Seat,kind:'lever'|'shoot'|'dash'|'switch',at:number)=>
 auth.act(seat,{kind,facing:1},poses,at);
const first=missionSnapshot(1,auth.world);
assert.equal(first.phase,1);
assert.equal(first.objective,'OBSERVEM A FLORESTA ANTES DO APAGÃO.');
assert.equal(first.next,null);
assert.equal(newlyCompleted(null,first).length,0,'initial hydration is silent');
auth.tick(poses,60000);
auth.tick(poses,62050);
assert.equal(auth.world.observed,true);
go(1,LOOP_MARKS[1].x-210);
assert.equal(act(1,'shoot',63000),false,'Lia cannot solve second clue before Téo');
go(2,LOOP_MARKS[2].x-160);
assert.equal(act(2,'dash',63200),false);
go(2,LOOP_MARKS[2].x,LOOP_MARKS[2].y);
assert.equal(act(2,'switch',63300),false,'Nino cannot solve third clue before Lia');
let progress=missionSnapshot(1,auth.world);
assert.equal(progress.next?.id,'mark-tree');
assert.equal(progress.next?.seat,0);
assert.equal(progress.objective,'TÉO: INVESTIGUE A ÁRVORE OCA.');
go(0,LOOP_MARKS[0].x,LOOP_MARKS[0].y);
assert.equal(act(0,'lever',63500),true);
let update=missionSnapshot(1,auth.world);
let earned=newlyCompleted(progress,update);
assert.deepEqual(earned.map(v=>v.id),['mark-tree']);
assert.match(earned[0].hero,/marca escondida/);
assert.match(earned[0].pipo,/Lia/);
assert.equal(update.objective,'LIA: INVESTIGUE A PEDRA RACHADA.');
assert.equal(newlyCompleted(update,update).length,0,'no replay of old achievements');
progress=update;
go(1,LOOP_MARKS[1].x-210,604);
assert.equal(act(1,'shoot',63900),true);
update=missionSnapshot(1,auth.world);
earned=newlyCompleted(progress,update);
assert.deepEqual(earned.map(v=>v.id),['mark-stone']);
assert.match(earned[0].pipo,/Nino/);
assert.equal(update.next?.seat,2);
assert.equal(update.objective,'NINO: ATIVE O ARCO DE MADEIRA.');
progress=update;
go(2,LOOP_MARKS[2].x-160,604);
act(2,'dash',65000);
go(2,LOOP_MARKS[2].x,LOOP_MARKS[2].y);
assert.equal(act(2,'switch',65200),true);
update=missionSnapshot(1,auth.world);
earned=newlyCompleted(progress,update);
assert.deepEqual(earned.map(v=>v.id),['mark-arch']);
assert.match(earned[0].pipo,/TRILHAS LIBERADAS/);
assert.equal(auth.world.marks.every(Boolean),true);
assert.match(update.objective,/REÚNAM OS TRÊS NA PASSAGEM/);
assert.equal(update.next,null,'no premature highlight of tree puzzle before shared route');
assert.equal(validLoop(auth.world),true);
// Three character positions are required to move as a team.
const route=LOOP_GEOMETRY.portal.oca;
for(const seat of [0,1,2] as Seat[])go(seat,route+seat*9,606);
poses[2].x+=500;
const notTogether=auth.tick(poses,65600);
assert.equal(notTogether.poses,undefined,'cannot open passage with teammate absent');
poses[2].x=route+18;
const together=auth.tick(poses,68600);
assert.equal(together.poses?.length,3,'three characters cross only together');
assert.equal(auth.world.lastRoute,'right');
assert.equal(missionSnapshot(1,auth.world).objective,'TÉO: COM A ESCADA HUMANA, ALCANCE A ALAVANCA ELEVADA.');
// A/B/C transformations must never erase discovered marks.
const prior=[...auth.world.marks];
auth.tick(together.poses as Pose[],auth.world.cycleStart+60000);
auth.tick(together.poses as Pose[],auth.world.cycleStart+62100);
assert.deepEqual(auth.world.marks,prior,'blackout preserves permanently completed milestones');
// No premature replay on reconnection: first snapshot is only hydration.
const reconnected=missionSnapshot(1,structuredClone(auth.world));
assert.deepEqual(newlyCompleted(null,reconnected),[]);

const rain=initTemporal(25000),canopy=initTree(25000),fire=initFire(25000);
for(const [phase,w,firstId] of [
 [2,rain,'echo-0'],[3,canopy,'copas-bridge-0'],[4,fire,'fire-log-0']
] as const){
 const snapshot=phase===2?missionSnapshot(2,w):phase===3?missionSnapshot(3,w):missionSnapshot(4,w);
 assert.equal(snapshot.phase,phase);
 assert.equal(snapshot.next?.id,firstId);
 assert.equal(snapshot.beats.length,9);
 assert.equal(newlyCompleted(null,snapshot).length,0);
}
let rainBefore=missionSnapshot(2,rain);
rain.echo[0]=true;let rainAfter=missionSnapshot(2,rain);
assert.equal(newlyCompleted(rainBefore,rainAfter)[0].seat,0);
assert.equal(rainAfter.next?.seat,1);
rain.echo=[true,true,true];rain.tree=[true,true,true];rain.bridge=true;
assert.equal(missionSnapshot(2,rain).next?.group,'RAÍZES DA TEMPESTADE');
let canopyBefore=missionSnapshot(3,canopy);
canopy.bridge[0]=true;
assert.equal(newlyCompleted(canopyBefore,missionSnapshot(3,canopy))[0].id,'copas-bridge-0');
canopy.bridge=[true,true,true];canopy.bridgeOpen=true;
assert.equal(missionSnapshot(3,canopy).next?.group,'ESCADA HUMANA');
let fireBefore=missionSnapshot(4,fire);
fire.log[0]=true;
assert.equal(newlyCompleted(fireBefore,missionSnapshot(4,fire))[0].id,'fire-log-0');
fire.log=[true,true,true];fire.logOpen=true;
assert.equal(missionSnapshot(4,fire).next?.group,'CORREDOR DE FUMAÇA');
fire.smoke=[true,true,true];fire.smokeOpen=true;
assert.equal(missionSnapshot(4,fire).next?.group,'ÁRVORES CAINDO');
fire.tree=[true,true,true];fire.treeOpen=true;
assert.equal(missionSnapshot(4,fire).next,null);
assert.match(missionSnapshot(4,fire).objective,/MARGEM SEGURA/);

const director=readFileSync('src/missionDirector.ts','utf8');
const pipo=readFileSync('src/pipoGuide.ts','utf8');
const hud=readFileSync('src/main.ts','utf8');
const loopScene=readFileSync('src/forestLoopScene.ts','utf8');
assert.ok(director.includes('newlyCompleted(this.current,next)'));
assert.ok(director.includes("net.on(label,update as never)"));
assert.ok(director.includes("window.dispatchEvent(new CustomEvent('mission-pipo'"));
assert.ok(director.includes('this.balloon.setText('));
assert.ok(director.includes('this.ring.strokeCircle('));
assert.ok(loopScene.includes('routeCurtains')&&loopScene.includes('woodland passages'));
assert.ok(loopScene.includes('new MissionDirector(this,this.net,1,this.avatars)'));
for(const [num,file] of [[2,'temporalForestScene'],[3,'treetopForestScene'],[4,'burningForestScene']] as const)
 assert.ok(readFileSync('src/'+file+'.ts','utf8').includes('new MissionDirector(this,this.net,'+num));
assert.ok(pipo.includes("window.addEventListener('mission-pipo'"));
assert.ok(pipo.includes('this.narrativeQueue.shift()'));
assert.ok(pipo.includes("const blackout="));
assert.ok(hud.includes('currentMission().objective'));
assert.ok(hud.includes("if(net.role==='idle'){info='';devSession=false;closeOverlay();}"));
console.log('ETAPA 21: four authority-derived mission chains, gated first clues, three-person passage, Pipo, reconnection and UI PASSED');
