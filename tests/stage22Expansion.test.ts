import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {LoopAuthority,LOOP_WIDTH,LOOP_START,LOOP_MARKS,LOOP_GEOMETRY,
 LOOP_TERRAIN,LOOP_NATURAL_LEDGES,LOOP_LAYOUT_BRANCHES,LOOP_CYCLE_MS,
 SUSPENSION,SUSPENSION_LANDING_Y,LOOP_PHYSICS,soloJumpRise,initLoop,
 validLoop,barriers,windGuide} from '../src/forestLoop';
import {loopFallSurfaces} from '../src/fallDamage';
import {missionSnapshot,newlyCompleted} from '../src/missionChapters';

const world=initLoop(1000);
assert.equal(LOOP_WIDTH,11400,'map extended exactly threefold');
assert.equal(LOOP_START.length,3);
assert.ok(LOOP_START.every(p=>p.x>LOOP_WIDTH*.44&&p.x<LOOP_WIDTH*.56
 &&LOOP_TERRAIN.some(t=>p.x>t.from+30&&p.x<t.to-30)),'safe central spawn');
assert.ok(LOOP_MARKS[1].x-LOOP_MARKS[0].x>1800);
assert.ok(LOOP_MARKS[2].x-LOOP_MARKS[1].x>1000);
assert.ok(LOOP_MARKS.every(m=>m.x<LOOP_START[0].x));
assert.ok(LOOP_TERRAIN.length>=6,'continuous floor broken into real regions');
for(let i=1;i<LOOP_TERRAIN.length;i++)
 assert.ok(LOOP_TERRAIN[i].from>LOOP_TERRAIN[i-1].to,'nonzero gap #'+i);
for(const i of [0,1,2]){
 const left=LOOP_TERRAIN[i],right=LOOP_TERRAIN[i+1];
 const gap=right.from-left.to;
 assert.ok(gap>200&&gap<300,'natural jump gap not empty terrain');
 const mid=(left.to+right.from)/2;
 const ledge=LOOP_NATURAL_LEDGES.find(l=>Math.abs(l.x-mid)<=35);
 assert.ok(ledge,'physical stepping platform in the center of each gap');
 assert.ok(ledge!.width>=95,'platform has real landing width');
 const takeoff=left.to-LOOP_PHYSICS.characterHeight/2;
 const landAt=ledge!.x-ledge!.width/2;
 assert.ok(landAt-takeoff<soloJumpRise*1.5,'reasonable horizontal launch');
 assert.ok(616-(ledge!.y-11-22)<soloJumpRise,'ordinary jump can gain required height');
}
assert.equal(LOOP_LAYOUT_BRANCHES.length,7);
for(const layout of [0,1,2] as const){
 const surfaces=loopFallSurfaces(layout,false,undefined,false);
 const active=LOOP_LAYOUT_BRANCHES.filter(b=>b.layout===layout);
 assert.equal(active.length,surfaces.filter(s=>s.height===18&&s.active===true).length);
 assert.equal(barriers({...world,layout}).filter(b=>b.enabled).length,3);
 for(const ledge of LOOP_NATURAL_LEDGES)
  assert.ok(surfaces.some(s=>s.x===ledge.x&&s.width===ledge.width));
}
const gap=SUSPENSION.gapEnd-SUSPENSION.gapStart;
assert.equal(gap,700);
assert.ok(gap>2*LOOP_PHYSICS.jumpVelocity/LOOP_PHYSICS.gravity*235,
 'gap exceeds the longest ordinary horizontal ballistic jump');
assert.ok(gap>2*2*LOOP_PHYSICS.jumpVelocity/LOOP_PHYSICS.gravity*235,
 'gap exceeds rough double-jump traversal distance');
assert.ok(SUSPENSION.finalX-SUSPENSION.width/2<=SUSPENSION.gapStart);
assert.ok(SUSPENSION.finalX+SUSPENSION.width/2>=SUSPENSION.gapEnd);
const fromGround=616-SUSPENSION_LANDING_Y;
const fromTeam=528-SUSPENSION_LANDING_Y;
assert.ok(fromGround>2*soloJumpRise,
 'Téo cannot reach the lever with a normal ground double jump');
assert.ok(fromTeam>soloJumpRise&&fromTeam<2*soloJumpRise,
 'Téo needs the genuine human tower before double jumping to lever');
assert.ok(SUSPENSION.nino.x<SUSPENSION.gapStart,
 'Nino fixation is reachable from initial shore');
assert.ok(SUSPENSION.lia.x<SUSPENSION.gapStart,
 'Lia shoot angle is also on initial shore');
const host=new LoopAuthority();host.reset(0);
host.world.observed=true;host.world.marks=[true,true,true];
host.world.lastRoute='right';
const team:Pose[]=LOOP_START.map(p=>({...p}));
const go=(seat:Seat,x:number,y=606)=>{team[seat]={seat,x,y,vx:0,vy:0};};
const action=(seat:Seat,kind:'support'|'detach'|'lever'|'shoot'|'dash'|'switch',time:number)=>
 host.act(seat,{kind,facing:1},team,time);
go(2,SUSPENSION.lever.x);
go(1,SUSPENSION.lever.x);
go(0,SUSPENSION.lever.x);
assert.equal(action(0,'lever',3000),false,'lever rejects ground position');
assert.equal(action(0,'support',3200),false,'cannot stack on unsupported Lia');
assert.equal(action(1,'support',3400),true);
host.tick(team,3500);
go(0,SUSPENSION.lever.x,562);
assert.equal(action(0,'support',3600),true);
host.tick(team,3700);
assert.equal(host.world.suspensionStacked,true);
assert.equal(action(0,'detach',3900),true);
go(0,SUSPENSION.lever.x,SUSPENSION_LANDING_Y);
assert.equal(action(0,'lever',4200),true);
assert.ok(!host.world.suspendedOpen);
let previous=missionSnapshot(1,{...host.world,suspended:[false,false,false]});
let current=missionSnapshot(1,host.world);
assert.deepEqual(newlyCompleted(previous,current).map(b=>b.id),['suspended-teo']);
assert.equal(current.next?.id,'suspended-lia');
host.tick(team,5000);
assert.ok(host.world.suspendedX>SUSPENSION.initialX&&host.world.suspendedX<SUSPENSION.teoX,
 'actual intermediate motion position is broadcast');
host.tick(team,6200);
assert.equal(host.world.suspendedX,SUSPENSION.teoX);
go(1,SUSPENSION.lia.x-220);
assert.equal(action(1,'shoot',7000),true);
host.tick(team,8000);
assert.ok(host.world.suspendedX>SUSPENSION.teoX&&host.world.suspendedX<SUSPENSION.liaX);
host.tick(team,9200);
assert.equal(host.world.suspendedX,SUSPENSION.liaX);
go(2,SUSPENSION.nino.x-170);
action(2,'dash',10000);
go(2,SUSPENSION.nino.x,SUSPENSION.nino.y);
assert.equal(action(2,'switch',10600),true);
assert.equal(host.world.suspendedOpen,false,'not ready during movement');
host.tick(team,11400);
assert.ok(host.world.suspendedX>SUSPENSION.liaX&&host.world.suspendedX<SUSPENSION.finalX);
host.tick(team,12550);
assert.equal(host.world.suspendedOpen,true);
assert.equal(host.world.suspendedX,SUSPENSION.finalX);
assert.ok(loopFallSurfaces(0,false,undefined,host.world.suspendedOpen)
 .some(s=>s.active===true&&s.width===SUSPENSION.width&&s.x===SUSPENSION.finalX),
 'collision and authoritative visible final position coincide');
assert.equal(validLoop(host.world),true);
assert.equal(validLoop({...host.world,suspended:[true,false]}),false);
assert.equal(validLoop({...host.world,suspendedX:LOOP_WIDTH+300}),false);
previous=current;current=missionSnapshot(1,host.world);
assert.deepEqual(newlyCompleted(previous,current).map(b=>b.id),
 ['suspended-lia','suspended-nino']);
assert.equal(current.next?.group,'ÁRVORE-PONTE');
// A/B/C can rotate without resetting permanent suspension.
for(let i=0;i<3;i++){
 const start=host.world.cycleStart;
 host.tick(team,start+LOOP_CYCLE_MS);
 host.tick(team,start+LOOP_CYCLE_MS+2200);
 assert.ok(host.world.suspendedOpen&&host.world.suspended.every(Boolean));
}
const direction=windGuide({...host.world,suspendedOpen:false,suspended:[true,false,false]},1,7600);
assert.ok(direction.target>7600&&direction.target<SUSPENSION.gapStart,'wind guides Lia to safe shot position');
const scene=readFileSync('src/forestLoopScene.ts','utf8');
const network=readFileSync('src/network.ts','utf8');
const ui=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const pipo=readFileSync('src/pipoHints.ts','utf8');
assert.ok(scene.includes('if(collider.visible!==settled)collider.setVisible(settled)'));
assert.ok(scene.includes('if(enableChanged)body.enable=settled'));
assert.ok(scene.includes('this.suspension.setX(position)'));
assert.ok(scene.includes('LOOP_LAYOUT_BRANCHES[i].layout===w.layout'));
assert.ok(network.includes('LOOP_WIDTH)'), 'network must accept entire expanded map');
assert.ok(network.includes('SUMMIT_BRANCH,l.suspendedOpen)'), 'fall tracker sees completed deck');
assert.ok(network.includes('x>9500&&p.x<9630'),'tree hazard moved with original puzzle');
assert.ok(ui.includes('class="game-tool-strip"'));
assert.ok(css.includes('.game-tool-strip #pipo-help'));
assert.ok(css.includes('safe-area-inset-right'));
assert.ok(pipo.includes("guidance('plataforma suspensa'"));
assert.ok(network.includes("this.setPhase('transition',1,Date.now()+5000)"));
console.log('ETAPA 22: geometrias, alcance, puzzle em 3 ações, plataforma móvel, sync e regressões PASSED');
