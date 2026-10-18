import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
const src=(p:string)=>readFileSync('src/'+p+'.ts','utf8');
const art=src('sharedCharacterArt');
assert.ok(art.includes('export function paintHero('));
assert.ok(art.includes('export const CHARACTER_COLORS=[0x369e69,0xcf8545,0x4b95ca]'));
assert.ok(art.includes('ellipse(g,-5,-26,6.5,6.5,0xf8f5e7)'),'left eye white');
assert.ok(art.includes('ellipse(g,5,-26,6.5,6.5,0xf8f5e7)'),'right eye white');
assert.ok(art.includes('ellipse(g,-4.7,-25.8,3,3.8,0x182a30)'),'left pupil');
assert.ok(art.includes('ellipse(g,5.3,-25.8,3,3.8,0x182a30)'),'right pupil');
for(const seat of [0,1,2])assert.ok(art.includes('seat==='+seat),'distinctive seat '+seat);
for(const name of ['visuals','treetopArt','burningForestArt','intro']){
 const scene=src(name);
 assert.ok(scene.includes("from './sharedCharacterArt'"),name+' shared art');
 assert.ok(scene.includes('paintHero('),name+' draws shared art');
}
for(const name of ['forestLoopScene','temporalForestScene','treetopForestScene','burningForestScene']){
 const scene=src(name);
 assert.ok(scene.includes('30,44,'),name+' retains collision-sized actor');
 assert.ok(scene.includes('this.art.character('),name+' renders unified art');
}
assert.ok(art.includes('const running='));
assert.ok(art.includes('const airborne='));
assert.ok(art.includes('const stride='));
assert.ok(art.includes('const armSwing='));
console.log('ETAPA 32: official two-eyed protagonists shared by intro and all four stages; original 30x44 hitboxes retained');
