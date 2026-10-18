import {strict as assert} from 'node:assert';
import {
 TREE_WIDTH,TREE_HEIGHT,TREE_VOID_Y,TREE_PLATFORMS,TREE_START,TREE_TARGETS,TREE_SHELTERS,
 TREE_GRAVITY,TREE_JUMP,TREE_SPEED,TREE_JUMP_RISE,TREE_JUMP_RANGE,TREE_WIND_PERIOD,
 TREE_GUST_WARNING,TREE_GUST_DURATION,TREE_GUST_OFFSET,TreeAuthority,treeWindSchedule,
 treeWindVelocity,treeExposure,treeFatal,treePlatforms,initTree,validTree,treeCameraZoom,
 treeTowerNearBase,treeTowerNearTop,treeObjective,reconcileTreeSupports
} from '../src/treetopForest';
import type {Pose} from '../src/network';
const base=100000,authority=new TreeAuthority();
authority.reset(base);
const w=authority.world;
assert.equal(TREE_WIDTH,5250);
assert.ok(TREE_HEIGHT>=1400&&TREE_VOID_Y<TREE_HEIGHT);
assert.equal(TREE_START.length,3);
assert.ok(TREE_PLATFORMS.length>=30);
assert.ok(TREE_PLATFORMS.every(p=>p.y<TREE_VOID_Y-100));
assert.ok(TREE_PLATFORMS.every(p=>p.width<650),'never create continuous floor');
assert.ok(TREE_PLATFORMS.some(p=>p.material==='root'));
assert.ok(TREE_PLATFORMS.some(p=>p.material==='canopy'));
assert.ok(TREE_PLATFORMS.some(p=>p.material==='bridge'));
assert.ok(TREE_SHELTERS.length>=7);
assert.ok(treeCameraZoom({width:1280,height:900},false)>=1.0,'desktop zoom remains legible');
assert.ok(TREE_JUMP_RISE>126&&TREE_JUMP_RISE<128);
assert.ok(TREE_JUMP_RANGE>250&&TREE_JUMP_RANGE<260);
assert.ok(TREE_START.every(p=>treePlatforms(w).some(b=>
 Math.abs(p.x-b.x)<b.width/2-20&&
 Math.abs(p.y-(b.y-b.height/2-22))<4)),'spawn safe on an actual branch');
const exposed={x:3400,y:428},sheltered={x:TREE_SHELTERS[0].x,y:TREE_SHELTERS[0].y};
assert.equal(treeExposure(sheltered),0);
assert.equal(treeExposure(exposed),1);
assert.equal(treeExposure({x:TREE_SHELTERS[0].x+TREE_SHELTERS[0].radius+18,
 y:TREE_SHELTERS[0].y}),.35);
assert.equal(treeWindSchedule(w,base+TREE_GUST_OFFSET-10).phase,'calm');
const warning=treeWindSchedule(w,base+TREE_GUST_OFFSET+100);
assert.equal(warning.phase,'warning');
assert.equal(warning.until,base+TREE_GUST_OFFSET+TREE_GUST_WARNING);
const gust=treeWindSchedule(w,warning.until+1);
assert.equal(gust.phase,'gust');
assert.equal(gust.until,warning.until+TREE_GUST_DURATION);
assert.equal(treeWindSchedule(w,gust.until+10).phase,'calm');
assert.ok(TREE_WIND_PERIOD>=TREE_GUST_OFFSET+TREE_GUST_WARNING+TREE_GUST_DURATION);
const calm=treeWindVelocity(w,exposed,false,235);
assert.equal(calm,235+29);
w.windPhase='gust';w.windDirection=1;
assert.ok(treeWindVelocity(w,exposed,false,0)>190,'gust pushes airborne exposed');
assert.ok(treeWindVelocity(w,exposed,true,0)>150,'gust pushes resting exposed');
assert.equal(treeWindVelocity(w,sheltered,true,0),0,'protected character cannot be pushed');
assert.equal(treeWindVelocity(w,sheltered,false,0),0,'protected jumper gets no wind');
assert.ok(Math.abs(treeWindVelocity(w,{x:TREE_SHELTERS[0].x+TREE_SHELTERS[0].radius+18,
 y:TREE_SHELTERS[0].y},true,0))<110,'partial cover weakens gust');
w.windDirection=-1;
assert.ok(treeWindVelocity(w,exposed,true,0)<-150);
w.windPhase='calm';w.windDirection=1;
assert.equal(treeFatal({...TREE_START[0],y:TREE_VOID_Y+5,vy:250},base,w),true);
assert.equal(treeFatal({...TREE_START[0],y:TREE_VOID_Y+5,vy:-250},base,w),false);
assert.equal(treeFatal({...TREE_START[0],y:TREE_VOID_Y+5,vy:250},base,w,base+50),false);
// Spaced climb sections are within the ballistic envelope, including upward steps.
const line=[4,5,6,7,8,9,10,11,12,14,15,16,17]; // start and bridge-side branches
for(let i=1;i<line.length;i++){
 const a=TREE_PLATFORMS[line[i-1]],b=TREE_PLATFORMS[line[i]];
 const rise=(a.y-a.height/2-22)-(b.y-b.height/2-22);
 const dist=Math.max(0,Math.abs(a.x-b.x)-(a.width+b.width)/2+34);
 const disc=TREE_JUMP*TREE_JUMP-2*TREE_GRAVITY*rise;
 assert.ok(disc>=0,'step is vertically possible '+i);
 const available=(TREE_JUMP+Math.sqrt(disc))/TREE_GRAVITY*TREE_SPEED;
 assert.ok(dist<=available+3,'step is horizontally possible '+i+': '+dist+' versus '+available);
}
const left=TREE_PLATFORMS.find(p=>p.x===3205)!;
const right=TREE_PLATFORMS.find(p=>p.x===3730)!;
const gulf=right.x-right.width/2-(left.x+left.width/2);
assert.ok(gulf>TREE_JUMP_RANGE,'bridge gap requires actual cooperation');
assert.equal(treePlatforms(w).some(p=>p.puzzle==='bridge'),false);
// All three members participate; the host rejects distant/off-target actions.
const party:Tee[]=TREE_START.map(p=>({...p}));
type Tee=Pose;
party[0]={seat:0,x:TREE_TARGETS.bridge.teo.x,y:TREE_TARGETS.bridge.teo.y,vx:0,vy:0};
party[1]={seat:1,x:3060,y:457,vx:0,vy:0};
party[2]={seat:2,x:3000,y:456,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',party,base+1000),true);
assert.equal(authority.authorizeEnergy(1,'shoot',party,base+1200,1).ok,true);
assert.equal(w.bridge[1],true);
assert.equal(authority.interact(2,'switch',party,base+1300),false,
 'Nino must be near the bridge switch to use E');
assert.equal(w.dashAt,0,'no dash has been activated for the bridge');
party[2]={seat:2,x:TREE_TARGETS.bridge.nino.x,y:TREE_TARGETS.bridge.nino.y,vx:0,vy:0};
assert.equal(authority.interact(2,'switch',party,base+1850),true,
 'Nino presses E without dash to finish the first bridge');
assert.equal(w.dashAt,0,'bridge interaction does not require or trigger dash');
assert.ok(w.bridgeOpen,'bridge is fully unlocked only by three participants');
assert.ok(treePlatforms(w).some(p=>p.puzzle==='bridge'));
party[2]={seat:2,x:TREE_TARGETS.tower.base.x,y:TREE_TARGETS.tower.base.y,vx:0,vy:0};
party[1]={seat:1,x:TREE_TARGETS.tower.base.x,y:TREE_TARGETS.tower.base.y,vx:0,vy:0};
party[0]={seat:0,x:TREE_TARGETS.tower.base.x,y:TREE_TARGETS.tower.base.y,vx:0,vy:0};
assert.equal(treeTowerNearBase(party[1]),true);
assert.equal(treeTowerNearBase({...party[1],x:TREE_TARGETS.tower.base.x-700}),false);
assert.equal(authority.interact(1,'support',party,base+2100),true);
assert.equal(treeObjective(w).progress,'0/1');
party[1].y=party[2].y-44;
party[0].y=party[1].y;
assert.equal(authority.interact(0,'support',party,base+2300),true);
assert.deepEqual(w.tower.slice(0,2),[true,true]);
assert.equal(treeObjective(w).progress,'0/1');
assert.equal(authority.interact(0,'detach',party,base+2500),true);
const upperBranch=TREE_PLATFORMS.find(p=>p.x===TREE_TARGETS.tower.top.x)!;
const landingY=upperBranch.y-upperBranch.height/2-22;
assert.equal(treeTowerNearTop({x:TREE_TARGETS.tower.top.x,y:landingY}),true);
party[0]={seat:0,x:TREE_TARGETS.tower.top.x,y:landingY,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',party,base+2600),true);
assert.ok(w.ropeOpen);
assert.equal(w.tower.filter(Boolean).length,3);
// Optional human ladder participants must detach before walking to the next puzzle.
assert.equal(authority.interact(1,'detach',party,base+2750),true);
party[1]={seat:1,x:4660,y:275,vx:0,vy:0};
assert.equal(authority.authorizeEnergy(1,'shoot',party,base+3000,1).ok,true);
assert.equal(w.time[1],true);
w.layout=1;
party[0]={seat:0,x:TREE_TARGETS.time.teo.x,y:TREE_TARGETS.time.teo.y,vx:0,vy:0};
assert.equal(authority.interact(0,'lever',party,base+3200),true);
w.layout=2;
party[2]={seat:2,x:4840,y:232,vx:0,vy:0};
assert.equal(authority.interact(2,'switch',party,base+5400),false,'E still requires proximity');
party[2]={seat:2,x:TREE_TARGETS.time.nino.x,y:TREE_TARGETS.time.nino.y,vx:0,vy:0};
assert.equal(w.dashAt,0,'Nino has not dashed');
assert.equal(authority.interact(2,'switch',party,base+6000),true,'last circle uses E alone');
assert.ok(w.finalOpen,'all timed branches unlock last crossing');
assert.ok(treePlatforms(w).some(p=>p.puzzle==='final'));
const nearExit=party.map(p=>({...p,x:TREE_TARGETS.exit.x,y:TREE_TARGETS.exit.y,vx:0,vy:0}));
assert.equal(authority.tick(nearExit,base+6100).won,true);
assert.ok(validTree(w));
const windy=new TreeAuthority();windy.reset(base);
windy.tick(TREE_START,base+TREE_GUST_OFFSET+100);
assert.equal(windy.world.windPhase,'warning');
windy.tick(TREE_START,base+TREE_GUST_OFFSET+TREE_GUST_WARNING+100);
assert.equal(windy.world.windPhase,'gust');
assert.equal(windy.world.gustCount,1);
windy.tick(TREE_START,base+TREE_GUST_OFFSET+TREE_GUST_WARNING+TREE_GUST_DURATION+100);
assert.equal(windy.world.windPhase,'calm');
const fallParty=TREE_START.map(p=>({...p}));
fallParty[1].y=TREE_VOID_Y+5;fallParty[1].vy=500;
windy.tick(fallParty,base+15800);
assert.equal(windy.world.health[0],0);
const reset=windy.tick(fallParty,base+17800);
assert.ok(reset.reset&&reset.poses?.length===3);
assert.equal(windy.world.layout,0);
assert.deepEqual(windy.world.health,[3,3,3]);
assert.equal(windy.world.windPhase,'calm');
console.log('APROVADO: Etapa 18 — geometria, rajada, abrigos, multiplayer state e puzzles completos');

// Regression: stacked avatars on the host must follow their base in every frame.
{
 const climb=new TreeAuthority();climb.world.bridgeOpen=true;
 const poses:Pose[]=([0,1,2] as const).map(seat=>({seat,x:TREE_TARGETS.tower.base.x,
  y:TREE_TARGETS.tower.base.y,vx:0,vy:0}));
 assert.equal(climb.interact(1,'support',poses,base+12000),true);
 assert.equal(poses[1].y,poses[2].y-44);
 assert.equal(climb.interact(0,'support',poses,base+12500),true);
 assert.equal(poses[0].y,poses[2].y-88);
 poses[2].x+=32;reconcileTreeSupports(poses,climb.world.supporting);
 assert.equal(poses[1].x,poses[2].x);
 assert.equal(poses[0].x,poses[2].x);
 assert.equal(poses[0].y,poses[2].y-88);
 assert.equal(climb.world.tower.filter(Boolean).length,2);
}

// Shipping regression: Téo may free the rope WITHOUT stacking the team.
{
 const solo=new TreeAuthority();solo.reset(base+30000);
 solo.world.bridgeOpen=true;
 const party= TREE_START.map(p=>({...p}));
 const first=TREE_PLATFORMS.find(p=>p.x===4195)!;
 const baseBranch=TREE_PLATFORMS.find(p=>p.x===4090)!;
 const rise=baseBranch.y-first.y;
 assert.ok(rise>TREE_JUMP_RISE,'revised first upper branch requires double jump');
 const top=TREE_PLATFORMS.find(p=>p.x===TREE_TARGETS.tower.top.x)!;
 const y=top.y-top.height/2-22;
 party[0]={seat:0,x:TREE_TARGETS.tower.top.x,y,vx:0,vy:0};
 assert.equal(solo.world.tower[0],false);
 assert.equal(solo.world.tower[1],false);
 assert.equal(solo.interact(0,'lever',party,base+32000),true);
 assert.equal(solo.world.ropeOpen,true);
 assert.equal(treeObjective(solo.world).title.includes('Galhos do Tempo'),true);
 // Final controls must remain reachable at the actual branch body heights.
 const teoBranch=TREE_PLATFORMS.find(p=>p.x===TREE_TARGETS.time.teo.x)!;
 solo.world.layout=1;
 party[0]={seat:0,x:TREE_TARGETS.time.teo.x,y:teoBranch.y-33,vx:0,vy:0};
 assert.equal(solo.interact(0,'lever',party,base+32300),true);
 assert.equal(solo.world.time[0],true);
 const ninoBranch=TREE_PLATFORMS.find(p=>p.x===5085)!;
 solo.world.layout=2;
 party[2]={seat:2,x:TREE_TARGETS.time.nino.x,y:ninoBranch.y-33,vx:0,vy:0};
 assert.equal(solo.world.dashAt,0);
 assert.equal(solo.interact(2,'switch',party,base+35600),true);
 assert.equal(solo.world.time[2],true);
}

// Endgame regression: Lia and Nino must not be silently blocked by A/B/C.
{
 const final=new TreeAuthority();final.reset(base+70000);
 final.world.bridgeOpen=true;final.world.ropeOpen=true;
 const party:Tee[]=TREE_START.map(p=>({...p}));
 final.world.layout=1;
 party[1]={seat:1,x:TREE_TARGETS.time.lia.x+23,y:TREE_TARGETS.time.lia.y+39,vx:0,vy:0};
 assert.equal(final.authorizeEnergy(1,'shoot',party,base+71000,1).ok,true);
 assert.equal(final.world.time[1],true,'Lia shot succeeds despite state B / close facing');
 assert.ok(treePlatforms(final.world).some(p=>p.x===TREE_TARGETS.time.teo.x));
 final.world.layout=0;
 party[0]={seat:0,x:TREE_TARGETS.time.teo.x,y:TREE_TARGETS.time.teo.y+30,vx:0,vy:0};
 assert.equal(final.interact(0,'lever',party,base+71300),true);
 assert.equal(final.world.time[0],true);
 assert.ok(treePlatforms(final.world).some(p=>p.x===5085));
 party[2]={seat:2,x:TREE_TARGETS.time.nino.x+145,y:TREE_TARGETS.time.nino.y+25,vx:0,vy:0};
 assert.equal(final.interact(2,'switch',party,base+71400),false,'distance still validated');
 party[2]={seat:2,x:TREE_TARGETS.time.nino.x,y:TREE_TARGETS.time.nino.y+25,vx:0,vy:0};
 assert.equal(final.world.dashAt,0);
 assert.equal(final.interact(2,'switch',party,base+77000),true,'E alone in final circle');
 assert.deepEqual(final.world.time,[true,true,true]);
 assert.equal(final.world.finalOpen,true,'last crossing opens immediately');
}
