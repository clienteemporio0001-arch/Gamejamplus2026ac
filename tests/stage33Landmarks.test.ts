import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
const src=(p:string)=>readFileSync('src/'+p+'.ts','utf8');
const official=src('officialLandmarks');
for(const key of ['hollow-tree.svg','loop-stone.svg','loop-arch.svg'])
 assert.ok(official.includes(key),'official Phase 1 SVG '+key);
for(const kind of ['hollow','stone','arch'])assert.ok(official.includes(kind+':'),'landmark '+kind);
assert.ok(official.includes('scene.add.image('));
assert.ok(official.includes('targetY-footY'));
assert.ok(!official.includes('physics.add'),'art must not add colliders');
const stages=['forestLoopScene','temporalForestScene','treetopForestScene','burningForestScene'];
for(const p of stages){
 const code=src(p);
 assert.ok(code.includes("from './officialLandmarks'"),p+' uses shared module');
 assert.ok(code.includes('preloadOfficialLandmarks(this)'),p+' loads official SVGs');
 assert.ok(code.includes('officialLandmark(this,'),p+' renders shared landmark');
}
assert.ok(src('temporalForestScene').includes("LANDMARK_KEYS[i],'rain'"));
assert.ok(src('forestLoopScene').includes("LANDMARK_KEYS[index],'night'"));
assert.ok(src('treetopForestScene').includes("'hollow','canopy'"));
assert.ok(src('treetopForestScene').includes("'stone','canopy'"));
assert.ok(src('treetopForestScene').includes("'arch','canopy'"));
assert.ok(src('burningForestScene').includes("'hollow','fire'"));
assert.ok(src('burningForestScene').includes("'stone','fire'"));
assert.ok(src('burningForestScene').includes("'arch','fire'"));
for(const p of ['forestLoop','temporalForest','treetopForest','burningForest'])
 assert.ok(!src(p).includes('officialLandmark('),p+' host logic unaffected');
console.log('ETAPA 33: canonical tree/stone/arch artwork, four biomes, host targets, no collision or authority changes');
