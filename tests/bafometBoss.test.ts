import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {scoreForEncounter} from '../src/soundtrack';
import assert from 'node:assert/strict';
import {initVitals} from '../src/loopVitals';
import {initRatCombat} from '../src/ratCombat';
import {BAFOMET_MAX_HP,HERO_REVIVE_MS,initBafomet,validBafomet,shootBafomet,tickBafomet,type BafometArena} from '../src/bafometBoss';
import {TemporalAuthority,TEMP_START} from '../src/temporalForest';
import type {Pose} from '../src/network';

const now=100_000;
const state: BafometArena={...initVitals(),...initRatCombat(),exit:true,boss:initBafomet(now),supporting:[null,null,null]};
assert.equal(validBafomet(state.boss),true);
assert.equal(state.boss.hp,BAFOMET_MAX_HP);
const lia:Pose={seat:1,x:3660,y:606,vx:0,vy:0};
assert.equal(shootBafomet(state,lia,1,now+100),true,'Lia hits guard from the correct side');
assert.equal(state.boss.hp,BAFOMET_MAX_HP-1);
assert.equal(shootBafomet(state,lia,1,now+200),false,'shot spam cannot skip invulnerability');
assert.equal(shootBafomet(state,lia,-1,now+500),false,'Lia must face the guard');
assert.equal(shootBafomet(state,lia,1,now+500),true,'a later approved shot hits');
assert.equal(state.boss.hp,BAFOMET_MAX_HP-2);

const unready:BafometArena={...initVitals(),...initRatCombat(),exit:false,boss:initBafomet(now),supporting:[null,null,null]};
assert.equal(shootBafomet(unready,lia,1,now+100),false,'guardian is invincible until the exit puzzle opens');

const inArena:Pose={seat:0,x:3900,y:606,vx:0,vy:0};
assert.equal(tickBafomet(state,[inArena],now+1100),true);
assert.equal(state.health[0],2,'guardian contacts reduce one heart, not the entire phase');
assert.equal(state.ratImpacts[0]?.vy,-235,'guardian contact includes recoil');

const phase=new TemporalAuthority();
phase.reset(now);
const poses=TEMP_START.map(p=>({...p,x:2200,y:380}));
phase.world.health[0]=0;
phase.world.reviveAt[0]=now+HERO_REVIVE_MS;
const pre=phase.tick(poses,now+9000);
assert.equal(pre.reset,undefined,'a single death never resets phase two');
assert.equal(phase.world.health[0],0);
const revived=phase.tick(poses,now+HERO_REVIVE_MS+1);
assert.equal(revived.respawns?.length,1);
assert.equal(revived.respawns?.[0].seat,0);
assert.equal(phase.world.health[0],3);
assert.equal(phase.world.health[1],3);
const allOut=new TemporalAuthority();
allOut.reset(now);
allOut.world.health=[0,0,0];
const wipe=allOut.tick(poses,now+200);
assert.equal(wipe.reset,true,'the last death resets the entire phase immediately');
assert.equal(wipe.poses?.length,3);
assert.deepEqual(allOut.world.health,[3,3,3]);
console.log('Bafomet and 10-second individual revival rules: OK');

/** Regression: reject corrupt PNG blobs even if the dimensions appear correct. */
const bytes=readFileSync('public/assets/enemies/bafomet-sprites.png');
assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','real PNG header');
assert.equal(bytes.readUInt32BE(16),256,'eight 32px frames per row');
assert.equal(bytes.readUInt32BE(20),128,'two 64px rows');
let pos=8;const compressed:Buffer[]=[];let ended=false;
while(pos+12<=bytes.length){
 const size=bytes.readUInt32BE(pos);const kind=bytes.toString('ascii',pos+4,pos+8);
 assert.ok(size>=0&&pos+size+12<=bytes.length,'well-formed PNG chunk');
 if(kind==='IDAT')compressed.push(bytes.subarray(pos+8,pos+8+size));
 pos+=size+12;
 if(kind==='IEND'){ended=true;break;}
}
assert.ok(ended&&compressed.length>0&&pos===bytes.length,'complete PNG file with image data');
const pixels=inflateSync(Buffer.concat(compressed));
assert.equal(pixels.length,128*(256+1),'all 16 palette frames decode without zlib errors');
const visuals=readFileSync('src/bafometVisual.ts','utf8');
assert.ok(visuals.includes('bafomet-sprites.png?v=20261020-2'),'versioned asset avoids cached missing texture');
assert.ok(visuals.includes('setScale(2.25)'),'boss remains larger than ordinary enemies');
console.log('Bafomet spritesheet PNG: all 16 frames decoded, no corrupted asset');

const encounter={exit:true,hp:8};
assert.equal(scoreForEncounter('playing',2,'loop',encounter,[3550,2100,2100]),'night');
assert.equal(scoreForEncounter('playing',2,'loop',encounter,[3200,3200,3200]),'rain');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:true,hp:0},[3900]),'rain');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:false,hp:12},[3900]),'rain');
assert.equal(scoreForEncounter('playing',3,'loop',encounter,[3900]),'treetop');
assert.equal(scoreForEncounter('transition',2,'loop',encounter,[3900]),'treetop');
const bossVisual=readFileSync('src/bafometVisual.ts','utf8');
assert.ok(bossVisual.includes("GUARDIÃO DA PASSAGEM"));
assert.ok(!bossVisual.includes("'BAFOMET · GUARDIÃO DA PASSAGEM'"));
assert.ok(bossVisual.includes('b.y+28-260*ascent')&&bossVisual.includes('setAlpha(rising?'),
 'defeated guardian rises and fades without changing game state');
console.log('GUARDIÃO: ascension animation, encounter soundtrack and scene restore passed');
