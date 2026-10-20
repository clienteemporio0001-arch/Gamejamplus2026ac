import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {CHICKEN_PATHS,chickenPose} from '../src/chickenPatrol';
import {LOOP_TERRAIN,LOOP_START,LOOP_WIDTH} from '../src/forestLoop';
import {TEMP_START,TEMP_WIDTH,TEMP_CHANNEL} from '../src/temporalForest';

const path='public/assets/animals/chicken-run.png';
assert.ok(existsSync(path),'the uploaded chicken sprite is included in the offline build');
const png=readFileSync(path);
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','valid PNG');
assert.equal(png.readUInt32BE(16),176,'four original 44px GIF frames packed horizontally');
assert.equal(png.readUInt32BE(20),44,'original 44px height preserved');
assert.ok(png.includes(Buffer.from('tRNS')),'pink GIF background was removed to transparency');

const src=readFileSync('src/forestChickens.ts','utf8');
const s1=readFileSync('src/forestLoopScene.ts','utf8');
const s2=readFileSync('src/temporalForestScene.ts','utf8');
const s3=readFileSync('src/treetopForestScene.ts','utf8');
const s4=readFileSync('src/burningForestScene.ts','utf8');
assert.ok(src.includes("scene.load.spritesheet(KEY")&&
 src.includes("frameWidth:44,frameHeight:44"),'Phaser uses sprite frames, not unreliable GIF playback');
assert.ok(src.includes('scene.add.sprite(')&&src.includes('scene.add.ellipse('),
 'draws light moving sprite and cosmetic ground shadow');
assert.ok(src.includes('if(!scene.textures.exists(KEY))return;'),
 'absent sprite cannot block gameplay startup');
assert.ok(src.includes('scene.cameras.main.worldView')&&
 src.includes('setVisible(visible)'), 'off-camera sprites are culled');
for(const forbidden of ['physics.add','setInteractive(','net.','damage(','collider(','overlap(']){
 assert.ok(!src.includes(forbidden),'decoration cannot invoke gameplay API '+forbidden);
}
for(const [name,data,phase] of [
 ['Fase 01',s1,1],['Fase 02',s2,2]
] as const){
 assert.ok(data.includes('preloadForestChickens(this)')&&
  data.includes('this.chickens=new ForestChickens(this,'+phase+')')&&
  data.includes('this.chickens?.update(time)'),
  name+' preloads and updates ambient chickens in Phaser scene');
 const paths=CHICKEN_PATHS[phase];
 assert.ok(paths.length>=3&&paths.length<=6,name+' shows a handful of lightweight runners');
 for(const [index,patrol] of paths.entries()){
  assert.ok(patrol.to>patrol.from+30,'each chicken has a real route '+index);
  assert.ok(patrol.speed>=50&&patrol.speed<=130,'movement speed is gentle and natural');
  assert.equal(patrol.groundY,638,'chicken feet remain on actual ground top');
  if(phase===1)assert.ok(LOOP_TERRAIN.some(t=>patrol.from>=t.from+25&&patrol.to<=t.to-25),
   'stage 1 chicken never runs into terrain gap or the suspended bridge');
  else assert.ok(
    (patrol.from>=25&&patrol.to<=TEMP_CHANNEL.start-40)||
    (patrol.from>=TEMP_CHANNEL.end+25&&patrol.to<=TEMP_WIDTH-25),
    'stage 2 chicken does not cross the river or walk outside the world');
  const travel=(patrol.to-patrol.from)*1000/patrol.speed;
  const onset=chickenPose({...patrol,offsetMs:0},0);
  const middle=chickenPose({...patrol,offsetMs:0},travel/2);
  const edge=chickenPose({...patrol,offsetMs:0},travel);
  const returnTrip=chickenPose({...patrol,offsetMs:0},travel*1.5);
  const loop=chickenPose({...patrol,offsetMs:0},travel*2);
  assert.ok(Math.abs(onset.x-patrol.from)<.001);
  assert.ok(Math.abs(edge.x-patrol.to)<.001);
  assert.ok(Math.abs(returnTrip.x-middle.x)<.001);
  assert.ok(Math.abs(loop.x-onset.x)<.001);
  assert.equal(onset.flipX,false);
  assert.equal(edge.flipX,true);
 }
}
assert.ok(!s3.includes('ForestChickens')&&!s4.includes('ForestChickens'),
 'the decorative chickens are restricted to phases 01 and 02');
assert.equal(LOOP_WIDTH,11400);
assert.equal(TEMP_WIDTH,4200);
assert.deepEqual(LOOP_START.map(p=>p.x),[5600,5660,5720],
 'cooperative stage 1 spawn untouched');
assert.deepEqual(TEMP_START.map(p=>p.x),[1920,1984,2048],
 'stage 2 spawn untouched');
const spriteSource=readFileSync('public/assets/animals/README.md','utf8');
assert.ok(spriteSource.includes('Shepardskin')&&spriteSource.includes('CC0')&&
 spriteSource.includes('chickenprofilewalkx4.gif'),'attribution/provenance preserved');
console.log('AMBIENT CHICKENS: alpha, 4 frames, 9 safe patrols, scene scope and no physics passed');
