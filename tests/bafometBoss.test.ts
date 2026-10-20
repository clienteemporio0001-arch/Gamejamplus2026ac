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
state.boss.aggroAt=now;
const lia:Pose={seat:1,x:3660,y:606,vx:0,vy:0};
assert.equal(shootBafomet(state,lia,1,now+100),true,'Lia hits guard from the correct side');
assert.equal(state.boss.hp,BAFOMET_MAX_HP-1);
assert.equal(shootBafomet(state,lia,1,now+200),false,'shot spam cannot skip invulnerability');
assert.equal(shootBafomet(state,lia,-1,now+500),false,'Lia must face the guard');
assert.equal(shootBafomet(state,lia,1,now+500),true,'a later approved shot hits');
assert.equal(state.boss.hp,BAFOMET_MAX_HP-2);

const unready:BafometArena={...initVitals(),...initRatCombat(),exit:false,boss:initBafomet(now),supporting:[null,null,null]};
assert.equal(shootBafomet(unready,lia,1,now+100),false,'guardian cannot be damaged before crossing the arrow');
tickBafomet(unready,[{seat:2,x:3371,y:608,vx:0,vy:0}],now+150);
assert.equal(unready.boss.aggroAt,now+150,'crossing sign initiates battle without solving the roots');
assert.equal(shootBafomet(unready,lia,1,now+500),true,'boss is vulnerable during encounter before puzzle completion');
assert.ok(unready.boss.x>=3370,'guardian cannot move left of sign');

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
assert.equal(scoreForEncounter('playing',2,'loop',encounter,[3550,2100,2100]),'battle');
assert.equal(scoreForEncounter('playing',2,'loop',encounter,[3200,3200,3200]),'battle');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:true,hp:0},[3900]),'rain');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:false,hp:12},[3900]),'battle');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:false,hp:12,aggroAt:now},[3250]),'battle');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:false,hp:12},[3250]),'battle');
assert.equal(scoreForEncounter('playing',2,'loop',{exit:false,hp:12},[2900]),'rain');
assert.equal(scoreForEncounter('playing',3,'loop',encounter,[3900]),'treetop');
assert.equal(scoreForEncounter('transition',2,'loop',encounter,[3900]),'treetop');
const bossVisual=readFileSync('src/bafometVisual.ts','utf8');
assert.ok(bossVisual.includes("GUARDIÃO DA PASSAGEM"));
assert.ok(!bossVisual.includes("'BAFOMET · GUARDIÃO DA PASSAGEM'"));
assert.ok(bossVisual.includes('b.y+28-260*ascent')&&bossVisual.includes('setAlpha(rising?'),
 'defeated guardian rises and fades without changing game state');
console.log('GUARDIÃO: ascension animation, encounter soundtrack and scene restore passed');

const retreat:BafometArena={...initVitals(),...initRatCombat(),exit:false,boss:initBafomet(now),supporting:[null,null,null]};
const hero=(x:number):Pose=>({seat:0,x,y:606,vx:0,vy:0});
tickBafomet(retreat,[hero(3500)],now+100);
assert.ok(retreat.boss.aggroAt>0,'arrow starts pursuit');
for(let t=now+200;t<now+3800;t+=90)tickBafomet(retreat,[hero(3420)],t);
assert.ok(retreat.boss.x<3900,'guard advances toward sign');
const approached=retreat.boss.x;
tickBafomet(retreat,[hero(3350)],now+3900);
assert.ok(retreat.boss.x>approached,'when all heroes retreat, guardian walks back');
for(let t=now+4000;t<now+8000;t+=90)tickBafomet(retreat,[hero(3300)],t);
assert.equal(retreat.boss.x,3900,'guardian returns to passage without teleporting');
assert.equal(retreat.boss.aggroAt,0,'guardian resets pursuit on returning');
tickBafomet(retreat,[hero(3400)],now+8100);
assert.ok(retreat.boss.aggroAt>0,'crossing arrow again starts new chase');
assert.equal(retreat.boss.hp,12,'retreat does not heal or alter combat health');

const skillBoss:BafometArena={...initVitals(),...initRatCombat(),exit:false,boss:initBafomet(now),supporting:[null,null,null]};
skillBoss.boss.aggroAt=now;
skillBoss.boss.x=3700;
skillBoss.boss.stompUntil=now+900;
tickBafomet(skillBoss,[{seat:0,x:3700,y:535,vx:0,vy:220}],now+200);
assert.equal(skillBoss.health[0],3,'successful double-jump stomp cannot harm Teo');
assert.equal(skillBoss.boss.hp,10);
assert.ok(skillBoss.ratImpacts[0]?.vy!<0,'boss hit launches Teo away');
const skillDash:BafometArena={...initVitals(),...initRatCombat(),exit:false,boss:initBafomet(now),supporting:[null,null,null]};
skillDash.boss.aggroAt=now;
skillDash.boss.x=3700;
skillDash.boss.dashUntil=now+800;
skillDash.boss.dashFacing=1;
tickBafomet(skillDash,[{seat:2,x:3680,y:605,vx:280,vy:0}],now+250);
assert.equal(skillDash.health[2],3,'successful Dash cannot harm Nino');
assert.equal(skillDash.boss.hp,10);
assert.ok(skillDash.ratImpacts[2]?.vx!<0,'Dash recoils away from Boss');
