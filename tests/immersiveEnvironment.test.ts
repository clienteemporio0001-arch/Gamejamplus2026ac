import {strict as assert} from 'node:assert';
import {existsSync,readFileSync} from 'node:fs';
import {IMMERSIVE_SPOTS,type ImmersiveFrame} from '../src/immersiveEnvironmentLayout';
const all=new Set<ImmersiveFrame>();
for(const stage of [1,2] as const){
 const spots=IMMERSIVE_SPOTS[stage];
 assert.ok(spots.length>=12,'ambientação distribuída na fase '+stage);
 for(const p of spots){
  all.add(p.frame);
  assert.ok(p.alpha>0&&p.alpha<=1&&p.depth<12,
    'cenário não pode ocultar marcos de interação');
  assert.ok(p.width>0&&p.height>0&&p.baseY>0);
 }
}
for(const frame of [
 'fern_broad','fern_tall','fern_moss','fern_drape','mushrooms_blue',
 'mushrooms_pink','roots','fallen_log','wood_platform','branch_log',
 'step_tree','hollow_stump','rune_arch','split_rock'
] as const){
 // Hollow stump and the two puzzle objects are placed via officialLandmarks.
 assert.ok(all.has(frame)||['hollow_stump','rune_arch','split_rock'].includes(frame),
  'asset missing from stages 1/2: '+frame);
}
assert.ok(existsSync('public/assets/environment/forest-immersion.webp'),
 'o atlas do autor precisa estar incluído antes de publicar a versão');
const meta=JSON.parse(readFileSync('public/assets/environment/forest-immersion.json','utf8'));
for(const name of [
 'fern_broad','fern_tall','fern_moss','fern_drape','mushrooms_blue','mushrooms_pink',
 'roots','fallen_log','wood_platform','branch_log','step_tree','hollow_stump',
 'rune_arch','split_rock'
])assert.ok(meta.frames[name],'quadro do atlas ausente: '+name);
const sprites=readFileSync('src/immersiveEnvironment.ts','utf8');
assert.ok(sprites.includes('scene.load.atlas')&&
 sprites.includes('setOrigin(.5,1)')&&sprites.includes('setDepth(plan.depth)')&&
 sprites.includes('setVisible(visible)'),'usar atlas, âncoras do solo e culling');
assert.ok(!sprites.includes('physics.add')&&!sprites.includes('createCollider'),
 'ambientação não cria obstáculos ou colisores');
for(const stage of ['forestLoopScene','temporalForestScene']){
 const code=readFileSync('src/'+stage+'.ts','utf8');
 assert.ok(code.includes('preloadImmersiveEnvironment(this)')&&
 code.includes('new ImmersiveEnvironment(this,')&&
 code.includes('this.immersiveEnvironment?.update()'),
 stage+' deve carregar, renderizar e ocultar sprites fora da câmera');
}
const marks=readFileSync('src/officialLandmarks.ts','utf8');
assert.ok(marks.includes("kind==='hollow'?'hollow_stump'")&&
 marks.includes("kind==='stone'?'split_rock':'rune_arch'")&&
 marks.includes("biome==='night'||biome==='rain'")&&
 marks.includes("kind!=='hollow'||biome==='rain'"),
 'marcos da fase 1/2 usam visuais novos sem substituir árvore oca aprovada da Fase 1');
assert.ok(marks.includes('scene.add.container(x,footY)')&&
 marks.includes('targetY-footY')&&!marks.includes('physics.add'),
 'puzzles mantêm posicionamento e não ganham corpos físicos');
console.log('FASES 1-2: 14 assets, ambientação, culling e puzzles sem colisão alterada OK');
