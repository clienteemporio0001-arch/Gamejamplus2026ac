import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {LoopAuthority,LOOP_MARKS,LOOP_START,LOOP_WIDTH,LOOP_CYCLE_MS,
 markPosition,MARK_OFFSETS,safeReposition,barriers,initLoop,validLoop,
 LOOP_GEOMETRY} from '../src/forestLoop';
import {TemporalAuthority,TEMP_START,TEMP_LAYOUTS,tempBlocks} from '../src/temporalForest';
import {TreeAuthority,TREE_START,TREE_CYCLE,TREE_PLATFORMS,TREE_BLACKOUT} from '../src/treetopForest';
import {FireAuthority,FIRE_START,FIRE_SHIFT_ROOTS,FIRE_SHIFT_PERIOD,
 FIRE_SHIFT_DURATION,FIRE_COLLAPSE_PERIOD,validFire} from '../src/burningForest';
import type {Seat,Pose} from '../src/network';
const read=(name:string)=>readFileSync('src/'+name+'.ts','utf8');
const initial=initLoop(0);
assert.equal(LOOP_WIDTH,11400);
assert.equal(LOOP_CYCLE_MS,60000);
assert.equal(MARK_OFFSETS.length,3);
for(let i=0;i<3;i++){
 const positions=([0,1,2] as const).map(layout=>markPosition({...initial,layout},i));
 assert.equal(new Set(positions.map(p=>p.x)).size,3,'marker '+i+' distinct A/B/C');
 assert.ok(positions.every(p=>p.y===LOOP_MARKS[i].y&&p.x>0&&p.x<LOOP_WIDTH));
}
const authority=new LoopAuthority();authority.reset(0);
const poses=LOOP_START.map(p=>({...p}));
authority.world.observed=true;
const a=markPosition(authority.world,0);
poses[0]={...poses[0],x:a.x,y:a.y};
assert.equal(authority.act(0,{kind:'lever'},poses,1000),true);
assert.equal(authority.world.marks[0],true);
const atCycle=authority.tick(poses,60000);
assert.ok(atCycle.changed&&authority.world.blackoutUntil===62000);
const during=authority.tick(poses,61000);
assert.equal(during.changed,false,'host retains previous collisions while scenery animates');
const finished=authority.tick(poses,62020);
assert.equal(finished.changed,true);
assert.equal(authority.world.layout,1);
assert.equal(authority.world.marks[0],true,'completed mark retains identity');
const b=markPosition(authority.world,1);
poses[1]={...poses[1],x:b.x-200,y:606};
assert.equal(authority.act(1,{kind:'shoot',facing:1},poses,63000),true,
 'Lia interaction follows B coordinates');
assert.equal(validLoop(authority.world),true);
// Endangered characters are corrected individually, not all reset.
const bad=initLoop(0);bad.layout=1;
const positions:Pose[]=[
 {...LOOP_START[0],x:LOOP_GEOMETRY.layoutWalls[1],y:606},
 {...LOOP_START[1],x:2000,y:606},
 {...LOOP_START[2],x:4750,y:606}
];
const fixed=safeReposition(positions,bad);
assert.ok(fixed&&fixed[0].x!==positions[0].x);
assert.equal(fixed?.[1].x,positions[1].x);
assert.equal(fixed?.[2].x,positions[2].x);
assert.ok(barriers(bad).some(o=>o.enabled));
const rain=new TemporalAuthority();rain.reset(0);
const rainTeam=TEMP_START.map(p=>({...p}));
rainTeam[0].x=TEMP_LAYOUTS[1].obstacles[0];
rainTeam[1].x=1780;
rainTeam[2].x=2100;
const rainStart=rain.tick(rainTeam,60000);
assert.ok(rainStart.changed);
const rainChanged=rain.tick(rainTeam,62100);
assert.equal(rain.world.layout,1);
assert.ok(rainChanged.poses&&rainChanged.poses[0].x!==rainTeam[0].x,
 'rain shifts trapped character');
assert.equal(rainChanged.poses?.[1].x,rainTeam[1].x,
 'rain preserves the other player position');
assert.equal(rainChanged.poses?.[2].x,rainTeam[2].x);
assert.ok(tempBlocks(rain.world).some(b=>b.active));
// Upper-canopy game still performs the same 60-second host cycle.
const trees=new TreeAuthority();trees.reset(0);
const climbers=TREE_START.map(p=>({...p}));
trees.tick(climbers,TREE_CYCLE);
trees.tick(climbers,TREE_CYCLE+2100);
assert.equal(trees.world.layout,1);
assert.equal(trees.world.windPhase,'calm');
assert.equal(trees.world.bridgeOpen,false);
// A player standing on a state-specific branch rides to the matching next branch.
const transport=new TreeAuthority();transport.reset(0);
const branch=TREE_PLATFORMS.find(p=>p.state===0&&p.x<3000)!;
const passengers=TREE_START.map(p=>({...p}));
passengers[0]={...passengers[0],x:branch.x,y:branch.y-branch.height/2-22,vx:0,vy:0};
transport.tick(passengers,TREE_CYCLE);
const mid=transport.tick(passengers,TREE_CYCLE+TREE_BLACKOUT/2);
assert.ok(mid.poses&&mid.poses[0].x!==passengers[0].x,
 'branch visibly transports its standing passenger at halfway');
assert.equal(mid.poses?.[1].x,passengers[1].x);
assert.equal(mid.poses?.[2].x,passengers[2].x);
const landed=transport.tick(mid.poses!,TREE_CYCLE+TREE_BLACKOUT+50);
assert.equal(transport.world.layout,1);
assert.ok(landed.poses&&landed.poses[0].x>branch.x,
 'rider reaches the incoming B branch without falling');

// The fire has TWO independent clocks: 60-second woodland and 21-second hazards.
const flames=new FireAuthority();flames.reset(0);
const escaping=FIRE_START.map(p=>({...p}));
assert.equal(FIRE_SHIFT_PERIOD,60000);
assert.equal(FIRE_SHIFT_DURATION,2000);
assert.equal(FIRE_COLLAPSE_PERIOD,21000);
let turn=flames.tick(escaping,60000);
assert.ok(turn.changed);
assert.equal(flames.world.layout,0);
assert.equal(flames.world.blackoutUntil,62000);
turn=flames.tick(escaping,62100);
assert.equal(flames.world.layout,1);
assert.equal(flames.world.cycle,1);
assert.equal(flames.world.blackoutUntil,0);
assert.equal(validFire(flames.world),true);
for(let layout=0;layout<3;layout++){
 assert.equal(FIRE_SHIFT_ROOTS[layout].length,3);
 assert.ok(FIRE_SHIFT_ROOTS[layout].every(r=>r.x>=550&&r.x<=3650));
}
// Source checks guarantee no periodic full-screen black rectangle in normal play.
for(const [scene,indicator] of [
 ['forestLoopScene','this.blackout.setAlpha(w.deadUntil>0?fade:0)'],
 ['temporalForestScene','this.dark.setAlpha(w.deadUntil>0?.91:0)'],
 ['treetopForestScene','this.dark.setAlpha(w.deadUntil>0?.91:0)']
]){
 assert.ok(read(scene).includes(indicator),scene+' must not hide the shift under black');
}
assert.ok(read('forestLoopScene').includes("x:markPosition({layout:upcoming},i).x"));
assert.ok(read('forestLoopScene').includes('this.stoneHitbox.setX(stoneX)')&&read('forestLoopScene').includes('stoneX=markPosition(w,1).x'));
assert.ok(read('forestLoopScene').includes('this.hollowLedge.setX(hollowX)')&&read('forestLoopScene').includes('hollowX=markPosition(w,0).x'));
assert.ok(read('forestLoopScene').includes('updateFromGameObject()'));
assert.ok(read('forestLoopUI').includes('markPosition(w,seat)'));
assert.ok(read('missionChapters').includes('markPosition(w,0)'));
assert.ok(read('burningForestScene').includes('FIRE_SHIFT_ROOTS[next][i]'));
assert.ok(read('burningForestScene').includes('body.enable=w.blackoutUntil===0'));
assert.ok(read('network').includes('world.phaseStart=Date.now()-60000'));
assert.ok(read('main').includes('FLORESTA MUDA EM'));
assert.ok(read('main').includes('ADIANTAR TRANSFORMAÇÃO'));
console.log('ETAPA 22-B: clocks, A/B/C, moving landmarks, local rescue, rain, canopy and burning roots PASSED');
