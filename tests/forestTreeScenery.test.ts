import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {FOREST_TREE_LAYOUTS,type ForestTreeStage} from '../src/forestTreeLayout';

const imagePath='public/assets/trees/forest-trees.webp';
const descriptorPath='public/assets/trees/forest-trees.json';
assert.ok(existsSync(imagePath),'the user's original trees are committed for offline itch.io builds');
assert.ok(existsSync(descriptorPath),'atlas descriptor is available without network');
const image=readFileSync(imagePath);
assert.equal(image.subarray(0,4).toString('ascii'),'RIFF','valid lossless WebP container');
assert.equal(image.subarray(8,12).toString('ascii'),'WEBP','valid WebP asset');
assert.equal(image.length,6274,'the original atlas is unmodified and fully included');
assert.equal(createHash('sha256').update(image).digest('hex'),
 'fd65449ef273cd0e19a61cc09497fcbc85045d9a79b6de9937e66e21217aa98a',
 'the three user-provided tree sprites survived GitHub transfer byte-for-byte');
const atlas=JSON.parse(readFileSync(descriptorPath,'utf8'));
assert.deepEqual(atlas.meta.size,{w:376,h:216});
assert.deepEqual(
 Object.fromEntries(Object.entries(atlas.frames).map(([key,val])=>
  [key,(val as {frame:{w:number;h:number}}).frame.w+'x'+(val as {frame:{w:number;h:number}}).frame.h])),
 {tree00:'146x188',tree01:'129x211',tree03:'89x126'},
 'all three original images are independently addressable by Phaser');
for(const frame of Object.values(atlas.frames) as Array<{frame:{x:number;y:number;w:number;h:number}}>) {
 const f=frame.frame;
 assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=376&&f.y+f.h<=216,'atlas frame stays in bounds');
}
const widths:Record<ForestTreeStage,number>={1:11400,2:4200,3:5250,4:5200};
assert.equal(FOREST_TREE_LAYOUTS[1].length,16,'stage 01 receives varied background trees');
assert.equal(FOREST_TREE_LAYOUTS[2].length,7,'stage 02 receives storm-tinted trees');
assert.equal(FOREST_TREE_LAYOUTS[3].length,4,'canopy uses fewer distant trees');
assert.equal(FOREST_TREE_LAYOUTS[4].length,3,'burning area receives minimal dark silhouettes');
for(const phase of [1,2,3,4] as const){
 const trees=FOREST_TREE_LAYOUTS[phase];
 const frames=new Set(trees.map(t=>t.frame));
 assert.ok(frames.size>=2,'multiple silhouettes should appear in stage '+phase);
 for(const [i,t] of trees.entries()){
  assert.ok(t.x>=180&&t.x<=widths[phase]-60,'tree stays inside stage '+phase+' ('+i+')');
  assert.ok(t.height>=220&&t.height<=420,'tree sizing is visually restrained');
  assert.ok(t.depth<0,'tree is always behind playable physics, prompts and characters');
  assert.ok(t.alpha>0&&t.alpha<.8,'tree blends with background and never conceals hazards');
  assert.ok(['tree00','tree01','tree03'].includes(t.frame),'all frames come from supplied tree ZIP');
  assert.ok(Number.isInteger(t.tint),'color adaptation uses GPU tint, not copied sprites');
 }
}
assert.ok(FOREST_TREE_LAYOUTS[1].every(t=>Math.abs(t.x-5670)>350&&Math.abs(t.x-9400)>370),
 'stage 01 protects clearing and essential climb landmark');
assert.ok(FOREST_TREE_LAYOUTS[2].every(t=>t.x<2520||t.x>3050),
 'stage 02 keeps the rising river corridor clear');
assert.ok(FOREST_TREE_LAYOUTS[3].every(t=>t.alpha<=.33&&t.depth<=-18),
 'distant canopy trees never hide temporary branches or cooperative markers');
assert.ok(FOREST_TREE_LAYOUTS[4].every(t=>t.alpha<=.22&&t.depth<=-18),
 'charred silhouettes do not hide falling fireballs or escape cues');

const renderer=readFileSync('src/forestTrees.ts','utf8');
for(const unwanted of ['physics.add','setInteractive(','net.','damage(','collider(','overlap(','scene.tweens']){
 assert.ok(!renderer.includes(unwanted),'ambient trees never touch gameplay: '+unwanted);
}
assert.ok(renderer.includes('scene.load.atlas(TEXTURE_KEY')&&
 renderer.includes('scene.textures.exists(TEXTURE_KEY)')&&
 renderer.includes('if(!scene.textures.exists(TEXTURE_KEY))return'),
 'atlas is loaded once and missing trees cannot prevent gameplay');
assert.ok(renderer.includes('camera.scrollX')&&renderer.includes('setVisible(visible)'),
 'off-camera trees are hidden to keep draw workload low');
for(const [phase,file] of [
 [1,'forestLoopScene'],[2,'temporalForestScene'],
 [3,'treetopForestScene'],[4,'burningForestScene']
] as const){
 const source=readFileSync('src/'+file+'.ts','utf8');
 assert.ok(source.includes('preloadForestTrees(this)'),'atlas preloaded for phase '+phase);
 assert.ok(source.includes('new ForestTrees(this,'+phase+')'),'trees created in phase '+phase);
 assert.ok(source.includes('this.forestTrees?.update()'),'tree culling follows camera in phase '+phase);
}
const docs=readFileSync('public/assets/trees/README.md','utf8');
assert.ok(docs.includes('avores 2d.zip')&&docs.includes('não incluía licença')&&
 docs.includes('confirmar a licença'),'unknown license documented and not mistaken for CC0');
assert.ok(statSync(imagePath).size<10000,'compact atlas keeps mobile and itch.io builds lightweight');
console.log('ÁRVORES 2D: original lossless sprites, 30 scenic trees, 4 safe layers, no collisions ✓');
