import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {
 BAT_KNOCKBACK_MS,BAT_KNOCKBACK_VERTICAL,BAT_LAYOUT,
 batFlight,batContactImpact,initialBats,initialBatImpacts,
 validBatImpacts,hitBatWithSlingshot
} from '../src/flyingBats';
import {TreeAuthority,initTree,validTree} from '../src/treetopForest';
import {FireAuthority,initFire,validFire} from '../src/burningForest';
import type {Pose,Seat} from '../src/network';

const t=123_000;
const t0=t-1200;
assert.ok(BAT_KNOCKBACK_MS>=220&&BAT_KNOCKBACK_MS<=400,
 'knockback is visible but never permanently removes player control');
assert.ok(BAT_KNOCKBACK_VERTICAL<0&&BAT_KNOCKBACK_VERTICAL>=-250,
 'hit lifts the hero briefly without launching above mandatory platforms');
assert.deepEqual(initialBatImpacts(),[null,null,null]);
assert.ok(validBatImpacts(initialBatImpacts()));
assert.equal(validBatImpacts([null,{at:t,vx:-250,vy:-185},null]),true);
for(const v of [
 [null,null], [null,{at:-1,vx:250,vy:-185},null],
 [null,{at:t,vx:900,vy:-185},null],
 [null,{at:t,vx:250,vy:20},null],
 [null,{at:t,vx:Number.NaN,vy:-185},null]
])assert.equal(validBatImpacts(v),false,'invalid knockback cannot be accepted from wire');
for(const stage of [3,4] as const){
 const down=initialBats();
 const flight=batFlight(stage,0,t,t0);
 const right=batContactImpact(stage,down,{x:flight.x+15,y:flight.y},t,t0);
 const left=batContactImpact(stage,down,{x:flight.x-15,y:flight.y},t,t0);
 assert.ok(right&&left,'both sides of bat trigger impact');
 assert.ok(right.vx>0&&left.vx<0,'bat pushes AWAY from contact point');
 assert.equal(right.vy,BAT_KNOCKBACK_VERTICAL);
 assert.equal(left.at,t);
 assert.equal(batContactImpact(stage,down,{x:flight.x+90,y:flight.y},t,t0),null,
  'distant characters cannot be pushed');
 // A one-hit Lia takedown disables both damage and impulse for 12 seconds.
 assert.equal(hitBatWithSlingshot(stage,down,{x:flight.x-100,y:flight.y+18},1,t,t0),0);
 assert.equal(batContactImpact(stage,down,{x:flight.x,y:flight.y},t,t0),null);
}

const poses=():Pose[]=> ([0,1,2] as Seat[]).map(seat=>({
 seat,x:200+seat*64,y:653,vx:0,vy:0
}));
const tree=new TreeAuthority();
tree.world=initTree(t0);
const gray=batFlight(3,0,t,t0);
let heroes=poses();
heroes[2]={seat:2,x:gray.x+12,y:gray.y,vx:0,vy:0};
const treeDamage=tree.tick(heroes,t,0);
assert.ok(treeDamage.changed,'host broadcasts contact');
assert.equal(tree.world.health[2],2,'bat takes one heart from Nino');
assert.ok(tree.world.batImpacts[2],'host publishes physical push vector');
assert.ok(tree.world.batImpacts[2]!.vx>0,'right contact pushes Nino to the right');
assert.equal(tree.world.batImpacts[2]!.at,t);
assert.ok(validTree(tree.world),'new TreeWorld message is valid');
const treeHit=tree.world.batImpacts[2];
tree.tick(heroes,t+100,0);
assert.equal(tree.world.health[2],2,'no additional loss during invulnerability');
assert.deepEqual(tree.world.batImpacts[2],treeHit,'invulnerable contact does not replay push');

const fire=new FireAuthority();
fire.world=initFire(t0);
const red=batFlight(4,1,t,t0);
heroes=poses();
heroes[1]={seat:1,x:red.x-12,y:red.y,vx:0,vy:0};
const fireDamage=fire.tick(heroes,t,0,true);
assert.equal(fireDamage.changed,true);
assert.equal(fire.world.health[1],2,'red bat takes one heart from Lia');
assert.equal(fire.world.damageCause,'bat');
assert.ok(fire.world.batImpacts[1]&&fire.world.batImpacts[1]!.vx<0,
 'the left-side collision pushes Lia away to the left');
assert.ok(validFire(fire.world),'new FireWorld message is valid');
const fireHit=fire.world.batImpacts[1];
fire.tick(heroes,t+100,0,true);
assert.equal(fire.world.health[1],2);
assert.deepEqual(fire.world.batImpacts[1],fireHit,'cooldown prevents continuous stun');

for(const [stage,path] of [[3,'treetopForestScene'],[4,'burningForestScene']] as const){
 const scene=readFileSync('src/'+path+'.ts','utf8');
 assert.ok(scene.includes('private applyBatKnockback(seat:Seat,hit:BatImpact)'),
  'Phaser actors receive real physics velocity from host snapshots in '+path);
 assert.ok(scene.includes('body.setVelocity(hit.vx,hit.vy)'),
  'contact is an impulse, not just visual health reduction');
 assert.ok(scene.includes('this.solo?.body(seat)??this.body'),
  'all three solo bodies and each multiplayer-owned body respond');
 assert.ok(scene.includes('this.net.localSeat!==seat'),
  'a guest never controls another person\'s physics body');
 assert.ok(scene.includes('BAT_KNOCKBACK_MS')&&scene.includes('const stunned=now<this.knockUntil[seat]'),
  'player input is briefly interrupted so recoil cannot be cancelled immediately');
 assert.ok(scene.includes('hit.at!==')&&scene.includes('hit.at>now+1000'),
  'stale/replayed packets cannot cause repeated knockbacks');
 assert.ok(scene.includes('this.knockUntil[p.seat]=0'),
  'respawn clears any remaining movement lock');
 assert.ok(scene.includes('this.bats?.update('),
  'original animated bats are still present');
}
for(const p of ['src/forestLoopScene.ts','src/temporalForestScene.ts']){
 assert.ok(!readFileSync(p,'utf8').includes('BatKnockback'),
  'stages 01 and 02 remain unchanged');
}
const net=readFileSync('src/network.ts','utf8');
for(const v of ["TreeWorld['batImpacts']","FireWorld['batImpacts']"]){
 assert.equal(net.split(v).length-1,2,
  'bat hit vectors copied on both host broadcast and guest receive');
}
console.log('MORCEGOS — EMPURRÃO: 3 jogadores, ambos os mapas, invulnerabilidade e sincronização ✓');
