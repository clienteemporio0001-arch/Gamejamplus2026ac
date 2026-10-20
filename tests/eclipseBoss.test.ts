import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initVitals} from '../src/loopVitals';
import {initRatCombat} from '../src/ratCombat';
import {initialBatImpacts} from '../src/flyingBats';
import {initFire,FireAuthority,FIRE_START,fireDamageZone,fireFlareActive,fireballHazards} from '../src/burningForest';
import {ECLIPSE_MAX_HP,ECLIPSE_HOME_X,initEclipseBoss,validEclipseBoss,
 tickEclipse,shootEclipse,armEclipse,type EclipseArena} from '../src/eclipseBoss';
import type {Pose} from '../src/network';

const at=100000;
const sample=():EclipseArena=>({
 ...initVitals(),...initRatCombat(),batImpacts:initialBatImpacts(),
 supporting:[null,null,null],boss:initEclipseBoss(at)
});
const sprites=readFileSync('public/assets/enemies/eclipsesentinel.webp');
assert.equal(sprites.subarray(0,4).toString(),'RIFF','original imported sprite is valid WebP');
assert.equal(sprites.subarray(8,12).toString(),'WEBP','sprite sheet uses WebP');
assert.equal(validEclipseBoss(initEclipseBoss(at)),true);
const w=sample();
let p:Pose={seat:1,x:4620,y:637,vx:0,vy:0};
assert.equal(shootEclipse(w,p,1,at+100),false,'boss cannot be hurt before awakening');
tickEclipse(w,[p],at+200);
assert.ok(w.boss.awakeAt>0,'approach triggers boss');
assert.equal(shootEclipse(w,p,1,at+600),true,'Lia slingshot damages boss');
assert.equal(w.boss.hp,ECLIPSE_MAX_HP-1);
const teo=sample();teo.boss.awakeAt=at;teo.boss.x=4700;teo.boss.nextLeapAt=at+10000;
armEclipse(teo,0,'doubleJump',at+100,1);
tickEclipse(teo,[{seat:0,x:4700,y:570,vx:0,vy:200}],at+200);
assert.equal(teo.boss.hp,ECLIPSE_MAX_HP-2);
assert.equal(teo.health[0],3,'Téo strikes without contact damage');
assert.ok(teo.batImpacts[0]?.vy!<0,'Téo receives recoil');
const nino=sample();nino.boss.awakeAt=at;nino.boss.x=4700;nino.boss.nextLeapAt=at+10000;
armEclipse(nino,2,'dash',at+100,1);
tickEclipse(nino,[{seat:2,x:4678,y:640,vx:285,vy:0}],at+200);
assert.equal(nino.boss.hp,ECLIPSE_MAX_HP-2);
assert.equal(nino.health[2],3,'Nino successful Dash causes no self damage');
const stage=initFire(at);
assert.equal(stage.boss.hp,ECLIPSE_MAX_HP,'boss persisted in stage world');
const authority=new FireAuthority();
authority.world.logOpen=true;authority.world.smokeOpen=true;authority.world.treeOpen=true;
const positions=FIRE_START.map(p=>({...p,x:5035,y:637}));
authority.world.boss.hp=ECLIPSE_MAX_HP;
const blocked=authority.tick(positions,at+100);
assert.equal(blocked.won,undefined,'final movie cannot start while guardian lives');
assert.equal(authority.world.completed,false);
assert.ok(readFileSync('src/network.ts','utf8').includes('boss:{...w.boss}'),'boss synchronized to clients');
console.log('SENTINELA DO ECLIPSE: assets, combat, safe attacks, finale gate and sync OK');

const arena=initFire(100000);
for(const x of [4410,4520,4750,4890,5000]){
 assert.equal(fireDamageZone(arena,{x,y:650},100500),false,'safe arena has no fire damage');
 assert.equal(fireFlareActive(arena,100500,x),false,'safe arena displays no active flames');
}
assert.ok(fireballHazards(arena,140000).every(b=>b.x<4400||b.x>5030),
 'fireball spawns stay outside the boss arena');
const retreat=sample();retreat.boss.awakeAt=at;retreat.boss.x=4500;
tickEclipse(retreat,[{seat:0,x:4330,y:640,vx:0,vy:0}],at+100);
assert.ok(retreat.boss.x>4500,'boss walks back when all friends retreat behind sign');
const reviver=new FireAuthority();const friends=FIRE_START.map(p=>({...p,x:4310,y:640}));
reviver.world.health[0]=0;
reviver.world.reviveAt[0]=at+10000;
assert.notEqual(reviver.tick(friends,at+9000).respawn,true,'one death never resets the phase');
const rev=reviver.tick(friends,at+10001);
assert.equal(rev.respawns?.[0].seat,0);
assert.equal(reviver.world.health[0],3);
const wiped=new FireAuthority();wiped.world.health=[0,0,0];
assert.equal(wiped.tick(friends,at+100).respawn,true,'three deaths restart phase');
const music=readFileSync('src/soundtrack.ts','utf8');
assert.ok(music.includes("this.desired==='battle'?1.3:1"),'battle music 30% louder');
console.log('Final boss arena: safe combat zone, 10s revives, retreat and music OK');


const vulnerable=sample();
vulnerable.boss.awakeAt=at;
vulnerable.boss.x=ECLIPSE_HOME_X;
vulnerable.boss.nextLeapAt=at+20000;
const standing:Pose={seat:1,x:ECLIPSE_HOME_X-15,y:638,vx:0,vy:0};
for(const n of [at+200,at+1500,at+2800]){
 tickEclipse(vulnerable,[standing],n);
}
assert.equal(vulnerable.health[1],0,'Boss contact must defeat a hero in three separated hits');
assert.equal(vulnerable.health[0],3,'other heroes retain their health');
const visual=readFileSync('src/eclipseVisual.ts','utf8');
assert.ok(visual.includes('fillRoundedRect')&&visual.includes('0xc079ff'),
  'Sentinel has solid high-contrast Phaser graphics instead of translucent sprite frames');
assert.ok(!visual.includes('setFrame('),'do not crop the boss atlas into invalid 36px frames');
