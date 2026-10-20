import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initVitals} from '../src/loopVitals';
import {initRatCombat} from '../src/ratCombat';
import {initialBatImpacts} from '../src/flyingBats';
import {initFire,FireAuthority,FIRE_START} from '../src/burningForest';
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
