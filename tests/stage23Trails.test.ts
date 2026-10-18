import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import type {Pose,Seat} from '../src/network';
import {LoopAuthority,LOOP_START,LOOP_GEOMETRY,LOOP_MARKS,LOOP_TERRAIN,LOOP_NATURAL_LEDGES,
 TRAIL_MEET_RADIUS_X,TRAIL_MEET_MIN_Y,TRAIL_MEET_MAX_Y,trailOccupants,trailAssembly,
 safeForRoute,correctRoute,windGuide,markPosition,barriers,SUSPENSION,validLoop} from '../src/forestLoop';
import {loopObjective,loopContext} from '../src/forestLoopUI';
import {missionSnapshot} from '../src/missionChapters';
import {pipoHint} from '../src/pipoHints';
import {leafAt} from '../src/loopWind';
const source=(p:string)=>readFileSync(p,'utf8');
const make=()=>new LoopAuthority();
const setPosition=(poses:Pose[],seat:Seat,x:number,y=606)=>{
 poses[seat]={seat,x,y,vx:0,vy:0};
};
const partyAt=(x:number):Pose[]=LOOP_START.map((p,i)=>({
 ...p,x:x+(i-1)*56,y:606,vx:0,vy:0
}));
assert.equal(TRAIL_MEET_RADIUS_X,142);
assert.ok(TRAIL_MEET_MIN_Y<=554&&TRAIL_MEET_MAX_Y>=606,
 'standing on physical ground or short wooden ledge must be accepted');
assert.ok(safeForRoute({...LOOP_START[0],x:3740,y:554,vx:0,vy:0}));
assert.equal(LOOP_GEOMETRY.gate,7200);
assert.equal(LOOP_GEOMETRY.portalLanding,7590);
assert.ok(LOOP_GEOMETRY.portal.oca>LOOP_MARKS[0].x+210);
assert.ok(LOOP_GEOMETRY.portal.pedra>LOOP_MARKS[1].x+220);
assert.ok(LOOP_GEOMETRY.portal.oca+TRAIL_MEET_RADIUS_X<LOOP_TERRAIN[0].to-200);
assert.ok(LOOP_GEOMETRY.portal.pedra+TRAIL_MEET_RADIUS_X<LOOP_TERRAIN[1].to);
assert.ok(LOOP_GEOMETRY.portal.pedra-TRAIL_MEET_RADIUS_X>
 Math.max(...[0,1,2].map(layout=>markPosition({layout:layout as 0|1|2},1).x+60))+10,
 'stone collision cannot overlap the visible three-player gathering zone');
assert.ok(LOOP_NATURAL_LEDGES.some(ledge=>Math.abs(ledge.x-LOOP_GEOMETRY.portal.pedra)<120));
for(const layout of [0,1,2] as const){
 const auth=make();auth.reset(0);auth.world.layout=layout;
 const w=auth.world;
 w.observed=true;
 w.marks=[true,true,true];
 const correct=correctRoute(layout),wrong=correct==='oca'?'pedra':'oca';
 assert.equal(correct,layout===1?'oca':'pedra','A/C stone, B hollow tree');
 assert.notEqual(LOOP_GEOMETRY.portal.oca,LOOP_GEOMETRY.portal.pedra);
 const guide=windGuide(w,0,LOOP_START[0].x);
 assert.equal(guide.target,LOOP_GEOMETRY.portal[correct]);
 assert.equal(guide.direction,-1);
 assert.ok(guide.hint.includes(correct==='oca'?'ÁRVORE OCA':'PEDRA RACHADA'));
 assert.equal(windGuide(w,0,LOOP_GEOMETRY.portal[correct]).direction,0);
 assert.equal(windGuide(w,0,LOOP_GEOMETRY.portal[wrong]).target,LOOP_GEOMETRY.portal[correct]);
 assert.equal(trailAssembly(w,partyAt(LOOP_GEOMETRY.portal[correct]),correct).ready,true);
 assert.ok(loopObjective(w,partyAt(LOOP_GEOMETRY.portal[correct])).title.includes('TRILHAS LIBERADAS'));
 assert.ok(loopObjective(w,partyAt(LOOP_GEOMETRY.portal[correct])).progress.includes('3/3 AMIGOS'));
 assert.ok(missionSnapshot(1,w).objective.includes('TRILHAS LIBERADAS!'));
 const info=pipoHint({phase:1,world:w});
 assert.equal(info.objective,'rota verdadeira');
 assert.ok(info.lines[0].includes('Trilhas liberadas'));
 assert.ok(info.lines[1].includes('árvore oca')&&info.lines[1].includes('pedra rachada'));
 assert.ok(info.lines[2].includes('Os três'));
 for(const [label,route] of [['falsa',wrong],['verdadeira',correct]] as const){
  const target=LOOP_GEOMETRY.portal[route];
  const actors=partyAt(target);
  assert.equal(trailOccupants(actors,route).length,3);
  actors[2].x=LOOP_START[2].x;
  assert.equal(trailOccupants(actors,route).length,2);
  assert.equal(trailAssembly(w,actors,route).count,2);
  assert.equal(auth.tick(actors,11000).poses,undefined,'two cannot cross '+label);
  actors[1].x=LOOP_START[1].x;
  assert.equal(trailAssembly(w,actors,route).count,1);
  assert.equal(auth.tick(actors,12000).poses,undefined,'one cannot cross '+label);
  actors[1].x=target;actors[2].x=target+59;
  assert.equal(trailAssembly(w,actors,route).count,3);
  // Stop radius must correspond to 284-pixel visible assembly ellipse.
  actors[0].x=target-TRAIL_MEET_RADIUS_X-4;
  assert.equal(trailOccupants(actors,route).length,2);
  assert.equal(auth.tick(actors,12200).poses,undefined);
  actors[0].x=target-TRAIL_MEET_RADIUS_X+6;
  assert.equal(trailOccupants(actors,route).length,3);
  assert.ok(loopContext(w,0,target,606,12200,actors).includes('3/3 AMIGOS'));
  assert.ok(loopContext(w,0,target,606,12200,actors).includes('REÚNAM OS TRÊS AQUI'));
  if(route===wrong){
   const health=[...w.health],stamina=[...w.stamina];
   const result=auth.tick(actors,12500);
   assert.equal(w.lastRoute,'wrong');
   assert.ok(result.poses?.every((p,i)=>p.x===LOOP_GEOMETRY.returnCenter+i*39));
   assert.deepEqual(w.marks,[true,true,true]);
   assert.deepEqual(w.health,health);
   assert.deepEqual(w.stamina,stamina);
   const falseHint=pipoHint({phase:1,world:w});
   assert.equal(falseHint.objective,'trilha enganosa');
   assert.ok(falseHint.lines[0].includes('vento'));
   assert.equal(auth.tick(partyAt(target),13000).poses,undefined,'no loop before cooldown');
   assert.equal(windGuide(w,0,LOOP_START[0].x).target,LOOP_GEOMETRY.portal[correct]);
  }else{
   const before=[...w.health],energy=[...w.stamina];
   const result=auth.tick(actors,16300);
   assert.equal(w.lastRoute,'right');
   assert.equal(result.poses?.length,3);
   const moved=result.poses!;
   assert.deepEqual(moved.map(p=>p.x),[7590,7629,7668]);
   assert.ok(moved.every(p=>p.y===606&&p.vx===0&&p.vy===0));
   assert.deepEqual(w.health,before);
   assert.deepEqual(w.stamina,energy);
   assert.ok(moved.every(p=>barriers(w).filter(b=>b.enabled)
     .every(b=>Math.abs(p.x-b.x)>50)));
   assert.ok(moved.every(p=>p.x>LOOP_GEOMETRY.gate+100&&p.x<SUSPENSION.gapStart));
   assert.ok(missionSnapshot(1,w).objective.includes('ESCADA HUMANA'));
   assert.ok(pipoHint({phase:1,world:w}).lines[0].includes('plataforma'));
   assert.ok(validLoop(w));
  }
 }
 assert.equal(correctRoute(layout),layout===1?'oca':'pedra');
}
const scene=source('src/forestLoopScene.ts');
const main=source('src/main.ts');
const solo=source('src/soloBodies.ts');
const net=source('src/network.ts');
assert.ok(scene.includes('TRILHA DA ÁRVORE OCA')&&scene.includes('TRILHA DA PEDRA RACHADA'));
assert.ok(scene.includes('TRILHAS LIBERADAS!'));
assert.ok(scene.includes('REÚNAM OS TRÊS AQUI · '));
assert.ok(scene.includes('TRAIL_MEET_RADIUS_X*2'));
assert.ok(scene.includes('this.routeCurtainPlants.push(seal)'));
assert.ok(scene.includes('this.routeLabels[i].setText('));
assert.ok(scene.includes('this.routeNames[i].setVisible(unlocked)'));
assert.ok(scene.includes('this.contextText.setText(fatigue?'));
assert.ok(scene.includes('this.avatars[p.seat].setPosition(p.x,p.y)'),'camera and all avatars snap to authorized destination');
assert.ok(scene.includes('consumeTouch(this.touch,\'interact\')'));
assert.ok(scene.includes('this.solo?.reset(p)'));
assert.ok(solo.includes('this.scene.cameras.main.startFollow(this.actors[seat]'));
assert.ok(solo.includes('this.net.reportSoloBodies(poses)'),'solo submits all three individual positions');
assert.ok(net.includes("this.broadcast({t:'respawn',pose})"),'host replicates trio move');
assert.ok(main.includes('loopObjective(net.loop,net.poses)'));
assert.ok(leafAt({...make().world,observed:true,marks:[true,true,true]},30,12500).x>9000,
 'wind particles are present throughout the enlarged map');
console.log('ETAPA 23: natural trail visibility, 1/2/3 players, A/B/C, false route, wind, HUD, solo, networking and safe target PASSED');
