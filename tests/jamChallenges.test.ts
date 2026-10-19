import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {FireAuthority,initFire,validFire} from '../src/burningForest';
import type {Pose,Seat} from '../src/network';
import {boulderEvent,boulderHit,BOULDER_ZONE,tideSurface,tideHit,
 TIDE_ZONE,FRAGILE_BRANCH_INDICES,fragilePhase,escapeWallX,escapeFireHit,
 ESCAPE_GRACE_MS,ESCAPE_START_X} from '../src/jamChallenges';
import {TREE_PLATFORMS} from '../src/treetopForest';

const base=5_000_000;
assert.equal(boulderEvent(base,base+1200),null,'no sudden boulder near spawn');
assert.equal(boulderEvent(base,base+4300)?.phase,'warning','rolling boulder warns first');
const rolling=boulderEvent(base,base+6550)!;
assert.equal(rolling.phase,'active');
assert.ok(rolling.x>=BOULDER_ZONE.from&&rolling.x<=BOULDER_ZONE.to);
assert.equal(boulderHit({x:rolling.x,y:rolling.y},rolling),true);
assert.equal(boulderHit({x:rolling.x,y:rolling.y-150},rolling),false,
 'jumping avoids boulder');
assert.equal(boulderEvent(base,base+6550,true),null,'pause freezes hazard');
assert.equal(boulderEvent(base,base+9100),null,'boulder dissipates and can be dodged');

assert.equal(tideSurface(base,base+11000,false),null,'bridge puzzle never flooded prematurely');
assert.equal(tideSurface(base,base+8300,true)?.phase,'warning');
const flood=tideSurface(base,base+13600,true)!;
assert.equal(flood.phase,'high');
assert.equal(flood.y,TIDE_ZONE.highY);
assert.equal(tideHit({x:2700,y:620},flood),true);
assert.equal(tideHit({x:2700,y:490},flood),false,'higher refuge remains safe');
assert.equal(tideHit({x:2250,y:650},flood),false,'outside river unaffected');
assert.equal(tideSurface(base,base+13600,true,true),null,'world pause suppresses flood');

assert.deepEqual(FRAGILE_BRANCH_INDICES,[5,8,16]);
for(const index of FRAGILE_BRANCH_INDICES){
 const p=TREE_PLATFORMS[index];
 assert.equal(p.puzzle,undefined,'essential bridge cannot crumble');
 assert.equal(p.state,undefined,'rotating branches stay independent');
 assert.equal(fragilePhase(base,base+18000,index,true),'solid','blackout rescues platforms');
 const phases=new Set(Array.from({length:37},(_,i)=>fragilePhase(base,base+i*500,index)));
 assert.deepEqual([...phases].sort(),['cracking','gone','solid'].sort(),
  'each branch has visible warning, disappear and reappear');
}
assert.equal(fragilePhase(base,base+14000,0),'solid','unselected platforms always solid');
const treeScene=readFileSync('src/treetopForestScene.ts','utf8');
assert.ok(treeScene.includes("this.updateFragileBranches(now,pause)")&&
 treeScene.includes("body.enable=enabled")&&
 treeScene.includes("if(enabled)body.updateFromGameObject()"),
 'only selected platforms change collision, automatically restored');

assert.equal(escapeWallX(0,base,true),null,'no fire wall before final section');
assert.equal(escapeWallX(base,base+1000,true),ESCAPE_START_X,'warning period');
assert.equal(escapeWallX(base,base+ESCAPE_GRACE_MS+10000,true),ESCAPE_START_X+100);
assert.equal(escapeWallX(base,base+ESCAPE_GRACE_MS+10000,false),ESCAPE_START_X+290,
 'co-op challenge can be faster than solo');
assert.equal(escapeFireHit({x:4270,y:620},ESCAPE_START_X,base,base+2000),false,
 'fire wall does not hurt during warning');
assert.equal(escapeFireHit({x:4350,y:620},4500,base,base+20000),true,
 'wall catches trailing player');
const authority=new FireAuthority();authority.reset(base);
const world=authority.world;
assert.ok(validFire(world));
assert.equal(world.escapeAt,0);
world.logOpen=true;world.smokeOpen=true;world.treeOpen=true;
const poses=([0,1,2] as Seat[]).map(seat=>({seat,x:4275+seat*45,y:606,vx:0,vy:0} as Pose));
authority.tick(poses,base+1000,base+100000,true);
assert.equal(world.escapeAt,base+1000,'host starts final chase after team arrives');
assert.ok(validFire(world),'new fire escape field conforms to PeerJS validator');
authority.reset(base+200000);
assert.equal(authority.world.escapeAt,0,'fatal reset clears final chase');

const image=readFileSync('public/assets/fx/explosion-4.png');
assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(image.readUInt32BE(16),1536,'12 128px-wide frames');
assert.equal(image.readUInt32BE(20),128,'128px frame height');
assert.ok(readFileSync('public/assets/fx/LICENSE-ANSIMUZ.txt','utf8').includes('CC0'));
const fireScene=readFileSync('src/burningForestScene.ts','utf8');
const fireArt=readFileSync('src/burningForestArt.ts','utf8');
const net=readFileSync('src/network.ts','utf8');
assert.ok(fireScene.includes("load.spritesheet('jam-explosion'")&&
 fireArt.includes("this.scene.textures.exists('jam-explosion')")&&
 fireArt.includes("setFrame(frame)"),'Explosion 4 is actually rendered on impact');
assert.ok(net.includes('boulderHit(pose,boulder)')&&
 net.includes('tideHit(pose,tide)')&&
 net.includes('this.fireAuthority.tick(this.poses,now,this.fireSafeUntil,this.isSolo)'),
 'only host authority computes hazards while guests use visuals');
console.log('GAME JAM 4 CHALLENGES + EXPLOSION: all regression assertions passed');
