import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {multiplayerPoseBounds} from '../src/multiplayerPoseBounds';
import {LOOP_START,LOOP_WIDTH} from '../src/forestLoop';
import {TEMP_START,TEMP_WIDTH} from '../src/temporalForest';
import {TREE_START,TREE_WIDTH,TREE_HEIGHT} from '../src/treetopForest';
import {FIRE_START,FIRE_WIDTH,FIRE_HEIGHT} from '../src/burningForest';
import {FOREST_WIDTH} from '../src/forest';
import {RIVER_WIDTH} from '../src/riverJourney';

const worlds=[
 [1,LOOP_START,LOOP_WIDTH],
 [2,TEMP_START,TEMP_WIDTH],
 [3,TREE_START,TREE_WIDTH],
 [4,FIRE_START,FIRE_WIDTH],
] as const;
for(const [level,spawns,width] of worlds){
 const bounds=multiplayerPoseBounds('loop',level);
 assert.equal(bounds.width,width,'same width in both send and receive for level '+level);
 assert.equal(spawns.length,3);
 for(const pose of spawns){
  assert.ok(pose.x>=0&&pose.x<=bounds.width,'network accepts player '+pose.seat+' at start of level '+level);
  assert.ok(pose.y>=0&&pose.y<=bounds.height);
  assert.equal(Math.max(0,Math.min(bounds.width,pose.x)),pose.x,'no invisible guest clamp');
 }
}
assert.ok(LOOP_START[0].x>FOREST_WIDTH,'bug reproduces: new map spawns outside legacy width');
assert.equal(multiplayerPoseBounds('loop',1).width,11400);
assert.ok(multiplayerPoseBounds('loop',3).height>=TREE_HEIGHT);
assert.ok(multiplayerPoseBounds('loop',4).height>=FIRE_HEIGHT);
assert.equal(multiplayerPoseBounds('classic',1).width,FOREST_WIDTH);
assert.equal(multiplayerPoseBounds('classic',2).width,RIVER_WIDTH);
const source=readFileSync('src/network.ts','utf8');
assert.ok(source.includes('const bounds=multiplayerPoseBounds(this.experience,this.level)'));
assert.equal(source.match(/const bounds=multiplayerPoseBounds\(this.experience,this.level\)/g)?.length,2,
 'both guest report and host acceptance share identical bounds');
assert.ok(source.includes("this.broadcast({t:'state',poses:this.poses})"));
assert.ok(source.includes("this.emit('snapshot',this.poses)"));
console.log('MULTIPLAYER: bounds and spawn for 3 players checked across 4 new biomes');
