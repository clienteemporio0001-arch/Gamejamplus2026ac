import {strict as assert} from 'node:assert';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
 BAT_LAYOUT,BAT_DOWN_MS,BAT_SHOT_RANGE,batAlive,batFlight,
 batTouchesHero,hitBatWithSlingshot,initialBats,validBatState
} from '../src/flyingBats';
import {TreeAuthority,initTree,validTree} from '../src/treetopForest';
import {FireAuthority,initFire,validFire} from '../src/burningForest';
import type {Pose,Seat} from '../src/network';

const expected={
 gray:{path:'public/assets/enemies/bat-gray.png',blob:'933270a9e5171022ad050e7b73e45e7d989360ba'},
 red:{path:'public/assets/enemies/bat-red.png',blob:'6023bd6cd4fa1986850b90cf8bae10366b982441'}
};
for(const [color,sheet] of Object.entries(expected)){
 assert.ok(existsSync(sheet.path),color+' sprite shipped for GitHub Pages and offline itch.io');
 const b=readFileSync(sheet.path);
 assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(b.readUInt32BE(16),144,'three 48px frames per row');
 assert.equal(b.readUInt32BE(20),256,'four 64px directional rows');
 const actual=createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
 assert.equal(actual,sheet.blob,'exact unchanged PNG from creator-uploaded bat zip');
}
const docs=readFileSync('public/assets/enemies/README.md','utf8');
assert.ok(docs.includes('bagzie')&&docs.includes('CC BY 3.0')&&docs.includes('opengameart.org'));
assert.ok(validBatState([0,0])&&!validBatState([0])&&!validBatState([0,-1])&&
 !validBatState([Number.NaN,0])&&!validBatState(['0',0]));
for(const stage of [3,4] as const){
 assert.equal(BAT_LAYOUT[stage].length,2,'two light challenges in each late phase');
 for(const id of [0,1] as const){
  const path=BAT_LAYOUT[stage][id];
  const t=100_000;
  const pos=batFlight(stage,id,t,t-1200);
  const pos2=batFlight(stage,id,t,t-1200);
  assert.deepEqual(pos,pos2,'all players calculate exactly the same flying path');
  assert.ok(Math.abs(pos.x-path.x)<=path.span+.01&&
   Math.abs(pos.y-path.y)<=path.rise+.01,'flight stays in its assigned corridor');
  const down=initialBats();
  assert.ok(batTouchesHero(stage,down,{x:pos.x,y:pos.y},t,t-1200),
   'contact is physically aligned with visible bat pose');
  assert.equal(batTouchesHero(stage,down,{x:pos.x+90,y:pos.y},t,t-1200),false);
  assert.equal(hitBatWithSlingshot(stage,down,{x:pos.x-110,y:pos.y+18},-1,t,t-1200),-1,
   'a backward-facing slingshot cannot hit');
  assert.equal(hitBatWithSlingshot(stage,down,{x:pos.x-BAT_SHOT_RANGE-55,y:pos.y+18},1,t,t-1200),-1,
   'shots outside Lia range never kill');
  assert.equal(hitBatWithSlingshot(stage,down,{x:pos.x-90,y:pos.y+18},1,t,t-1200),id,
   'one valid Lia slingshot hit downs the correct bat');
  assert.equal(down[id],t+BAT_DOWN_MS);
  assert.equal(batAlive(down,id,t),false);
  assert.equal(batTouchesHero(stage,down,{x:pos.x,y:pos.y},t,t-1200),false,
   'defeated bat no longer hurts players');
  assert.equal(hitBatWithSlingshot(stage,down,{x:pos.x-90,y:pos.y+18},1,t,t-1200),-1,
   'cannot repeatedly knock out an already defeated bat');
  assert.equal(batAlive(down,id,t+BAT_DOWN_MS),true,'bat respawns after a short interval');
 }
}
const now=100_000;
const tree=new TreeAuthority();
tree.world=initTree(now-1800);
const treeBat=batFlight(3,0,now,tree.world.cycleStart);
const positions:Pose[]=([0,1,2] as Seat[]).map(seat=>({
 seat,x:1800+seat*60,y:780,vx:0,vy:0
}));
positions[1]={seat:1,x:treeBat.x-100,y:treeBat.y+18,vx:0,vy:0};
let reply=tree.authorizeEnergy(1,'shoot',positions,now,1);
assert.ok(reply.ok,'valid Lia skill remains an approved host action');
assert.equal(tree.world.batDownUntil[0],now+BAT_DOWN_MS);
assert.equal(tree.world.stamina[1],75,'Lia pays the normal slingshot stamina cost');
assert.ok(validTree(tree.world),'multiplayer snapshot validation includes bat knockout');
assert.equal(tree.authorizeEnergy(1,'shoot',positions,now+60,1).ok,false,
 'anti-spam cooldown still protects the host from repeated actions');
tree.world.batDownUntil=initialBats();
positions[2]={seat:2,x:treeBat.x,y:treeBat.y,vx:0,vy:0};
const old=tree.world.health[2];
const tick=tree.tick(positions,now+150,0);
assert.equal(tree.world.health[2],old-1,'gray bat costs exactly one heart on contact');
assert.ok(tick.changed,'damage is broadcast to multiplayer');
tree.tick(positions,now+200,0);
assert.equal(tree.world.health[2],old-1,'existing 1.2-second invulnerability protects again');
const fire=new FireAuthority();
fire.world=initFire(now-1200);
const redBat=batFlight(4,0,now,fire.world.cycleStart);
positions[1]={seat:1,x:redBat.x-110,y:redBat.y+18,vx:0,vy:0};
reply=fire.authorizeEnergy(1,'shoot',positions,now,1);
assert.ok(reply.ok,'red bat can be shot with normal authorized slingshot');
assert.equal(fire.world.batDownUntil[0],now+BAT_DOWN_MS);
assert.ok(validFire(fire.world),'red bat state is accepted in FireWorld snapshots');
const network=readFileSync('src/network.ts','utf8');
for(const key of ["FireWorld['batDownUntil']","TreeWorld['batDownUntil']"]){
 assert.ok(network.includes(key),'network copies bat timers for reconnecting guests: '+key);
}
for(const [stage,name] of [[3,'treetopForestScene'],[4,'burningForestScene']] as const){
 const source=readFileSync('src/'+name+'.ts','utf8');
 assert.ok(source.includes('preloadBats(this,'+stage+')')&&
  source.includes('new FlyingBatVisuals(this,'+stage+')')&&
  source.includes('this.bats?.update(now,w.cycleStart,w.batDownUntil,pause)'),
  'real sprites animate in stage '+stage);
 assert.ok(source.includes('this.pipo.warnDanger('),'Pipo warns about the bat threat');
}
const visuals=readFileSync('src/flyingBatVisuals.ts','utf8');
assert.ok(visuals.includes('frameWidth:48,frameHeight:64')&&
 visuals.includes('setFrame(Math.floor(now/135)%3)'));
assert.ok(!visuals.includes('physics.add')&&!visuals.includes('setInteractive('),
 'bat collision only happens in host-owned pure simulation, not client physics');
const early1=readFileSync('src/forestLoopScene.ts','utf8');
const early2=readFileSync('src/temporalForestScene.ts','utf8');
assert.ok(!early1.includes('FlyingBatVisuals')&&!early2.includes('FlyingBatVisuals'),
 'first two phases remain untouched');
console.log('MORCEGOS: 2 folhas originais, cinza F3, vermelho F4, dano com proteção, 1 hit e rede ✓');
