import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {LOOP_GEOMETRY,LOOP_NATURAL_LEDGES,LOOP_START,LOOP_TERRAIN,
 LOOP_LAYOUT_BRANCHES,SUSPENSION,LOOP_WIDTH,canStack,stackFooting,stackBlockers,
 LoopAuthority,LOOP_PHYSICS,blackoutActive,validLoop} from '../src/forestLoop';
import {loopContext} from '../src/forestLoopUI';
import type {Seat,Pose} from '../src/network';
import {FrameProfiler,SCENARIOS} from '../src/performanceDiagnostics';
const src=(f:string)=>readFileSync(f,'utf8');
const auth=new LoopAuthority();auth.reset(0);
const players:Pose[]=LOOP_START.map(p=>({...p}));
const at=(seat:Seat,x:number,y=606,vx=0,vy=0)=>{
 players[seat]={seat,x,y,vx,vy};
};
const use=(seat:Seat,kind:'support'|'detach'|'lever',now:number)=>
 auth.act(seat,{kind},players,now);
// Physics-affecting platform data has exactly TWO removed entries, in the
// segment containing the x7200 tall gate and the suspended-bridge approach.
assert.ok(!LOOP_NATURAL_LEDGES.some(p=>p.x===7200||p.x===7480));
assert.ok(LOOP_NATURAL_LEDGES.some(p=>p.x===6580&&p.width===115),
 'keep the essential mini-gap crossing before the large beam');
assert.ok(LOOP_NATURAL_LEDGES.some(p=>p.x===8950));
assert.ok(LOOP_LAYOUT_BRANCHES.length>=6);
assert.ok(LOOP_TERRAIN.some(t=>t.from<7600&&t.to>=SUSPENSION.gapStart));
assert.ok(LOOP_GEOMETRY.gate===7200);
const gate=stackBlockers(auth.world).find(b=>b.x===LOOP_GEOMETRY.gate);
assert.ok(gate&&gate.height===550&&gate.width===40);
assert.ok(gate!.y-gate!.height/2<95,'high gate not bypassed by ordinary jumps');
assert.ok(SUSPENSION.width>700&&SUSPENSION.branch.width>=100);
assert.ok(LOOP_WIDTH===11400);
// Free mounting in the *central clearing*, outside either mechanism zone.
at(2,5650);at(1,5650);at(0,5650);
assert.ok(stackFooting(auth.world,players[2]));
assert.equal(canStack(auth.world,1,players),true);
assert.equal(canStack(auth.world,0,players),false,'Téo needs Lia already on Nino');
assert.equal(use(1,'support',1000),true);
assert.equal(auth.world.supporting[1],2);
auth.tick(players,1050);
assert.equal(players[1].y,562);
at(0,5650,562);
assert.equal(canStack(auth.world,0,players),true);
assert.equal(use(0,'support',1200),true);
auth.tick(players,1300);
assert.equal(players[0].y,518);
assert.equal(auth.world.supporting[0],1);
assert.equal(auth.world.stackMilestone,false,'stack anywhere does not complete tree puzzle');
assert.equal(auth.world.suspensionStacked,false,'stack anywhere does not complete suspended puzzle');
assert.ok(loopContext(auth.world,0,5650,518,1320,players).includes('Soltar'));
assert.equal(use(0,'detach',1400),true);
assert.equal(auth.world.supporting[0],null);
assert.equal(auth.world.climbReady,false);
assert.equal(auth.world.suspensionClimbReady,false);
assert.equal(use(1,'detach',1500),true);
assert.equal(auth.world.supporting[1],null);
// Movement cannot carry a mounted character through an active wooden shelf.
const moving=new LoopAuthority();moving.reset(0);
const movingTeam:Pose[]=LOOP_START.map(p=>({...p}));
movingTeam[2]={seat:2,x:5650,y:606,vx:0,vy:0};
movingTeam[1]={seat:1,x:5650,y:606,vx:0,vy:0};
assert.equal(moving.act(1,{kind:'support'},movingTeam,1200),true);
moving.tick(movingTeam,1250);
movingTeam[2].x=2570; // the 155x22 physical ledge intersects Lia's path
assert.equal(moving.tick(movingTeam,1300).changed,true);
assert.equal(moving.world.supporting[1],null);
assert.equal(validLoop(moving.world),true);
// A shelf between Lia's starting height and the destination cannot be phased through.
const onLedge=new LoopAuthority();onLedge.reset(0);
const ledgeTeam:Pose[]=LOOP_START.map(p=>({...p}));
ledgeTeam[2]={seat:2,x:2570,y:606,vx:0,vy:0};
ledgeTeam[1]={seat:1,x:2570,y:606,vx:0,vy:0};
assert.equal(canStack(onLedge.world,1,ledgeTeam),false);
// Too far, falling, invalid floor or inside real wall: no climbing.
at(2,5650);at(1,5710);
assert.equal(canStack(auth.world,1,players),false,'no climbing at a distance');
at(1,5650);
at(2,5650,606,0,290);
assert.equal(canStack(auth.world,1,players),false,'base falling fast');
at(2,5650,390,0,0);
assert.equal(canStack(auth.world,1,players),false,'no invisible footing at arbitrary height');
at(2,7200,606);at(1,7200,606);
assert.equal(canStack(auth.world,1,players),false,'cannot mount inside 550px gate');
at(2,5650);at(1,5650,606,210,0);
assert.equal(canStack(auth.world,1,players),false,'mount denied at high walking velocity');
at(1,5650,606,0,0);
auth.world.blackoutUntil=9999;
assert.equal(canStack(auth.world,1,players),false,'mount denied during transformation');
auth.world.blackoutUntil=0;
auth.world.health[1]=0;
assert.equal(canStack(auth.world,1,players),false,'no mounting without life');
auth.world.health[1]=3;
assert.equal(validLoop(auth.world),true);
// Remote guests still need the host's binding and pose checks, no new
// capability can bypass the tall gate with a free-standing human tower.
const rise=LOOP_PHYSICS.jumpVelocity**2/(2*LOOP_PHYSICS.gravity);
assert.ok(gate!.height>2*rise+3*LOOP_PHYSICS.characterHeight);
assert.ok(LOOP_GEOMETRY.gate<SUSPENSION.gapStart);
// No FPS figures are invented: this tests only statistic arithmetic
// over simulated input; real values appear only in the dev browser overlay.
const fps=new FrameProfiler();
const makeFrame=(now:number,vx=0,vy=0,x=5600,cam=0,transforming=false)=>
 ({now,updateMs:3,cameraX:cam,velocityX:vx,velocityY:vy,x,transforming});
fps.record(makeFrame(1000));
fps.record(makeFrame(1016,0,0));
fps.record(makeFrame(1032,235,0,7500,15));
fps.record(makeFrame(1065,-235,0,7760,29));
fps.record(makeFrame(1082,0,-150,7800,29,true));
let report=fps.snapshot();
assert.equal(report.count,4);
assert.equal(report.maxMs,33);
assert.ok(report.avgMs>16&&report.avgMs<33);
assert.ok(report.fps>30&&report.fps<62);
assert.equal(report.avgUpdateMs,3);
for(const key of SCENARIOS)assert.ok(Object.hasOwn(report.scenarios,key));
assert.ok(report.scenarios['parado'].count>=1);
assert.ok(report.scenarios['direita'].count>=1);
assert.ok(report.scenarios['esquerda'].count>=1);
assert.ok(report.scenarios['pulando'].count>=1);
assert.ok(report.scenarios['câmera seguindo'].count>=2);
assert.ok(report.scenarios['transformação A/B/C'].count>=1);
assert.ok(report.scenarios['plataforma suspensa'].count>=2);
fps.reset();report=fps.snapshot();
assert.equal(report.count,0);
assert.equal(report.fps,0);
const scene=src('src/forestLoopScene.ts'),art=src('src/visuals.ts');
const menu=src('src/main.ts'),solo=src('src/soloBodies.ts');
const net=src('src/network.ts');
const game=src('src/forestLoop.ts');
assert.ok(art.includes('const chunkWidth=1240'));
assert.ok(art.includes('this.parallaxChunks.push('));
assert.ok(art.includes('if(chunk.ink.visible!==visible)'));
assert.ok(art.includes('this.lowPower?38:25'));
assert.ok(art.includes('skin.target'));
assert.ok(art.includes('this.visibleRange()'));
assert.ok(scene.includes('if(body.enable===active&&rect.visible===active)return;'));
assert.ok(scene.includes('if(settled&&(moved||enableChanged))body.updateFromGameObject();'));
assert.ok(scene.includes('if(this.lastSuspensionCableX!==position)'));
assert.ok(scene.includes('this.frameProfiler.record('));
assert.ok(scene.includes('this.performanceLabel.setText('));
assert.ok(scene.includes('DIAGNÓSTICO REAL'));
assert.ok(scene.includes('this.art.update(time);'));
assert.ok(scene.includes("this.net.act({kind:'support'});"));
assert.ok(!scene.includes('x>7550&&x<8000'), 'no per-puzzle restriction on manual E support');
assert.ok(menu.includes('dev-performance')&&menu.includes('dev-quality'));
assert.ok(menu.includes('stage24:metrics-toggle'));
assert.ok(scene.includes('const visible=(!this.reducedGraphics||i%2===0)'));
assert.ok(scene.includes('this.art.setReducedVisuals(this.reducedGraphics)'));
assert.ok(solo.includes('this.net.reportSoloBodies(poses)'));
assert.ok(net.includes('this.loopAuthority.act(seat,action,this.poses)'));
assert.ok(net.includes("this.broadcast({t:'loop',world:this.loop})"));
assert.ok(game.includes('if(!canStack(w,seat,poses))return false;'));
assert.ok(!blackoutActive(auth.world,1500));
console.log('ETAPA 24: stack seguro global, viga preservada, 2 apoios excluídos, culling, perfil móvel e medidor opt-in testados.');
