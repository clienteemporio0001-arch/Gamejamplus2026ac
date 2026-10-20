import {initRatCombat,validRatCombat,activateMonsterSkill,shootMonster,tickMonsters,type RatCombatWorld} from './ratCombat';
import {exitPresence} from './sharedExit';
import {HOUND_HP,HOUND_NAME,HOUND_LEFT,initHound,validHound,armHound,shootHound,tickHound,type HoundState} from './hellHoundBoss';
import {initialBats,initialBatImpacts,validBatState,validBatImpacts,type BatDownState,type BatImpacts} from './flyingBats';
import type {Pose,Seat} from './network';
import {initVitals,validVitals,spendVital,regenVitals,damageVitals,VITALS,
 type VitalAction,type Vitals} from './loopVitals';

/** A FLORESTA MENTE • final chapter, independent from classic level 4. */
export const FIRE_WIDTH=5200,FIRE_HEIGHT=850,FIRE_FLOOR_Y=675,FIRE_DEATH_Y=803;
export const FIRE_CLEARING_LEFT=4390,FIRE_CLEARING_RIGHT=5030;
export const FIRE_BOSS_REVIVE_MS=10000;
/** Safe, grounded, just before the boss pursuit sign (x=4430). */
export const FIRE_BOSS_RESPAWNS:readonly Pose[]=([0,1,2] as Seat[]).map(seat=>({seat,x:4290+seat*48,y:653,vx:0,vy:0}));
export const FIRE_START:Pose[]=([0,1,2] as Seat[]).map(seat=>
 ({seat,x:190+seat*64,y:653,vx:0,vy:0}));
export type FirePlatform={x:number;y:number;width:number;height:number;
 material:'earth'|'wood'|'rock'|'bridge';requires?:'log'|'tree'};
export const FIRE_PLATFORMS:readonly FirePlatform[]=[
 {x:625,y:710,width:1250,height:70,material:'earth'},
 {x:2720,y:710,width:2340,height:70,material:'earth'},
 {x:4710,y:710,width:980,height:70,material:'earth'},
 {x:945,y:575,width:170,height:24,material:'wood'},
 {x:2140,y:630,width:170,height:24,material:'rock'},
 {x:2945,y:575,width:170,height:24,material:'wood'},
 {x:3520,y:575,width:175,height:24,material:'wood'},
 {x:4435,y:614,width:160,height:20,material:'rock'},
 {x:4680,y:617,width:156,height:20,material:'rock'},
 {x:4875,y:620,width:160,height:20,material:'wood'},
 {x:1400,y:669,width:345,height:24,material:'bridge',requires:'log'},
 {x:4055,y:665,width:365,height:26,material:'bridge',requires:'tree'},
];
export type FireChallenge='log'|'smoke'|'tree'|'escape';
export const FIRE_TARGETS={
 log:{teo:{x:945,y:540},lia:{x:1115,y:631},nino:{x:1160,y:650}},
 smoke:{lia:{x:2540,y:632},nino:{x:2790,y:650},teo:{x:2945,y:541}},
 tree:{teo:{x:3520,y:541},lia:{x:3750,y:632},nino:{x:3820,y:650}},
 exit:{x:5020,y:648},
} as const;
export const FIRE_BRIDGE_GAPS=[{start:1250,end:1550},{start:3890,end:4220}] as const;
export const FIRE_SMOKE_ZONE={start:2260,end:3090,yMin:490};
/** Shelters protect from falling embers and nearby ground flames, not smoke or falls. */
export const FIRE_SHELTERS= [470,1810,2660,3390,4590].map(x=>({x,halfWidth:72,yMin:560})) as ReadonlyArray<{x:number;halfWidth:number;yMin:number}>;
export function fireSheltered(p:Pick<Pose,'x'|'y'>):boolean{
 return FIRE_SHELTERS.some(s=>Math.abs(p.x-s.x)<=s.halfWidth&&p.y>=s.yMin);
}
/** Lightweight deterministic fireballs; host uses this same schedule for damage. */
export const FIREBALL_INTERVAL=5700,FIREBALL_WARNING=950,FIREBALL_FALL=1450,FIREBALL_IMPACT=520;
export type Fireball={lane:number;x:number;y:number;impactY:number;phase:'warning'|'fall'|'impact'};
const fireballSeed=(n:number)=>{const t=Math.sin(n*127.17+31.7)*43758.5453;return t-Math.floor(t);};
export function fireballHazards(w:FireWorld,now:number):Fireball[]{
 if(w.deadUntil>0||w.completed||w.blackoutUntil>now)return [];
 const elapsed=Math.max(0,now-w.cycleStart),balls:Fireball[]=[];
 for(let lane=0;lane<14;lane++){
  const delay=1200+(lane*977)%4300;
  if(elapsed<delay)continue;
  const local=elapsed-delay,cycle=Math.floor(local/FIREBALL_INTERVAL);
  const phaseMs=local%FIREBALL_INTERVAL;
  if(phaseMs>=FIREBALL_WARNING+FIREBALL_FALL+FIREBALL_IMPACT)continue;
  const impactX=225+lane*360+(fireballSeed(lane*31+cycle*17)-.5)*114;
  if(w.treeOpen&&impactX>=FIRE_CLEARING_LEFT&&impactX<=FIRE_CLEARING_RIGHT)continue;
  const top=firePlatforms(w).filter(p=>Math.abs(impactX-p.x)<=p.width/2-8)
   .reduce((best,p)=>Math.min(best,p.y-p.height/2),675);
  const impactY=top-9;
  let phase:Fireball['phase']='warning',x=impactX,y=-75;
  if(phaseMs>=FIREBALL_WARNING){
   if(phaseMs<FIREBALL_WARNING+FIREBALL_FALL){
    phase='fall';
    const progress=(phaseMs-FIREBALL_WARNING)/FIREBALL_FALL;
    x=impactX+w.windDirection*(1-progress)*32;
    y=-75+(impactY+75)*progress;
   }else{phase='impact';y=impactY;}
  }
  balls.push({lane,x,y,impactY,phase});
 }
 return balls;
}
export function fireballHit(w:FireWorld,p:Pick<Pose,'x'|'y'>,now:number):boolean{
 if(fireSheltered(p))return false;
 return fireballHazards(w,now).some(b=>
  b.phase==='fall'&&Math.abs(p.x-b.x)<=27&&Math.abs(p.y-b.y)<=35||
  b.phase==='impact'&&Math.abs(p.x-b.x)<=45&&Math.abs(p.y-b.impactY)<=65);
}

export const FIRE_TREE_DANGER={x:3655,radius:124,yMin:515};
export const FIRE_WIND_PERIOD=14000,FIRE_COLLAPSE_PERIOD=21000;
export const FIRE_SHIFT_PERIOD=60000,FIRE_SHIFT_DURATION=2000;
/** Three low, jumpable burnt roots in each 60s forest layout. */
export const FIRE_SHIFT_ROOTS=[
 [{x:740,y:648},{x:1990,y:648},{x:3280,y:648}],
 [{x:875,y:648},{x:2150,y:648},{x:3400,y:648}],
 [{x:1000,y:648},{x:2320,y:648},{x:3550,y:648}]
] as const;
export function fireShiftLayout(w:FireWorld,now:number):0|1|2{
 return Math.floor(Math.max(0,now-w.phaseStart)/(FIRE_SHIFT_PERIOD+FIRE_SHIFT_DURATION))%3 as 0|1|2;
}
export type FireWind=-1|1;
export type FireWorld=Vitals&RatCombatWorld&{
 cycleStart:number;phaseStart:number;resetId:number;deadUntil:number;escapeAt:number;
 layout:0|1|2;cycle:number;blackoutUntil:number;
 log:[boolean,boolean,boolean];logOpen:boolean;
 smoke:[boolean,boolean,boolean];smokeOpen:boolean;
 tree:[boolean,boolean,boolean];treeOpen:boolean;treeFallAt:number;
 smokeSeconds:[number,number,number];supporting:[Seat|null,Seat|null,Seat|null];
 dashAt:[number,number,number];dashX:[number,number,number];
 flare:number;windDirection:FireWind;treeStatus:'calm'|'warning'|'impact';
 treeWarningUntil:number;treeImpactUntil:number;
 collapseCycle:number;completed:boolean;damageCause:'fire'|'smoke'|'tree'|'fall'|'fireball'|'bat'|'rat'|'none';
 batDownUntil:BatDownState;batImpacts:BatImpacts;hound:HoundState;
 bossEncounterStarted:boolean;reviveAt:[number,number,number];
};
export function initFire(now=Date.now()):FireWorld{return {
 cycleStart:now,phaseStart:now,resetId:0,deadUntil:0,escapeAt:0,
 layout:0,cycle:0,blackoutUntil:0,
 log:[false,false,false],logOpen:false,
 smoke:[false,false,false],smokeOpen:false,
 tree:[false,false,false],treeOpen:false,treeFallAt:0,
 smokeSeconds:[0,0,0],supporting:[null,null,null],
 bossEncounterStarted:false,reviveAt:[0,0,0],
 dashAt:[0,0,0],dashX:[0,0,0],flare:0,windDirection:1,treeStatus:'calm',
 treeWarningUntil:0,treeImpactUntil:0,collapseCycle:-1,
 completed:false,damageCause:'none',batDownUntil:initialBats(),batImpacts:initialBatImpacts(),hound:initHound(now),...initRatCombat(),...initVitals()
};}
export function validFire(value:unknown):value is FireWorld{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const w=value as Record<string,unknown>;
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const bool=(v:unknown)=>typeof v==='boolean';
 return ['cycleStart','phaseStart','resetId','deadUntil','treeFallAt','flare','escapeAt',
   'cycle','blackoutUntil','layout',
   'treeWarningUntil','treeImpactUntil'].every(k=>finite(w[k]))
  &&[0,1,2].includes(Number(w.layout))
  &&typeof w.collapseCycle==='number'&&Number.isInteger(w.collapseCycle)&&w.collapseCycle>=-1
  &&['logOpen','smokeOpen','treeOpen','completed','bossEncounterStarted'].every(k=>bool(w[k]))
  &&(w.windDirection===1||w.windDirection===-1)
  &&['calm','warning','impact'].includes(String(w.treeStatus))
  &&['none','fire','smoke','tree','fall','fireball','bat','rat'].includes(String(w.damageCause))
  &&['log','smoke','tree'].every(k=>Array.isArray(w[k])&&(w[k] as unknown[]).length===3
    &&(w[k] as unknown[]).every(bool))
  &&['smokeSeconds','dashAt','dashX','reviveAt'].every(k=>
    Array.isArray(w[k])&&(w[k] as unknown[]).length===3&&(w[k] as unknown[]).every(finite))
  &&Array.isArray(w.supporting)&&w.supporting.length===3
  &&w.supporting.every((seat:unknown,i:number)=>
    seat===null||(i===0&&seat===1)||(i===1&&seat===2))
  &&validBatState(w.batDownUntil)&&validBatImpacts(w.batImpacts)&&validRatCombat(w)
  &&validVitals(w)&&validHound((w as Record<string,unknown>).hound);
}
export function firePlatforms(w:FireWorld):FirePlatform[]{
 return FIRE_PLATFORMS.filter(p=>!p.requires||
  (p.requires==='log'?w.logOpen:w.treeOpen));
}
export function fireObjective(w:FireWorld):{title:string;progress:string}{
 if(!w.logOpen)return {title:'TRONCO EM CHAMAS · Soltem as três amarras',
  progress:w.log.filter(Boolean).length+'/3'};
 if(!w.smokeOpen)return {title:'CORREDOR DE FUMAÇA · Abram os três respiros',
  progress:w.smoke.filter(Boolean).length+'/3'};
 if(!w.treeOpen)return {title:'ÁRVORES CAINDO · Orientem a queda',
  progress:w.tree.filter(Boolean).length+'/3'};
 if(w.hound.hp>0)return {title:HOUND_NAME+' · Derrotem o guardião',progress:'VIDA '+w.hound.hp+'/'+HOUND_HP};
 return {title:'CORRIDA FINAL · Reúnam os três na margem segura',
  progress:'GUARDIÃO DERROTADO'};
}
export function fireWind(now:number,w:FireWorld):FireWind{
 return Math.floor(Math.max(0,now-w.cycleStart)/FIRE_WIND_PERIOD)%2===0?1:-1;
}
export function fireFlareActive(w:FireWorld,now:number,x:number):boolean{
 // The host broadcasts the active phase; guests must not invent local flame cycles.
 void now;
 if(x<4210||(w.treeOpen&&x>=FIRE_CLEARING_LEFT&&x<=FIRE_CLEARING_RIGHT))return false;
 const frame=w.flare;
 return x<4520?frame!==1:x<4770?frame!==2:x<4930?frame===2:false;
}
export function fireDamageZone(w:FireWorld,p:Pick<Pose,'x'|'y'>,now:number):boolean{
 if(p.y<582||fireSheltered(p))return false;
 if(w.treeOpen&&p.x>=FIRE_CLEARING_LEFT&&p.x<=FIRE_CLEARING_RIGHT)return false;
 if(p.x>=1225&&p.x<=1560&&p.y>(w.logOpen?658:625))return true;
 if(!w.treeOpen&&p.x>=3875&&p.x<=4240&&p.y>632)return true;
 return (p.x>4260&&p.x<4520||p.x>4570&&p.x<4770||
   p.x>4800&&p.x<4930)&&fireFlareActive(w,now,p.x);
}
export function fireHeavySmoke(w:FireWorld,p:Pick<Pose,'x'|'y'>,now:number):boolean{
 // Smoke drift follows the authoritative windDirection snapshot, not each client's clock.
 void now;
 const shift=w.windDirection===1?80:-80;
 const start=FIRE_SMOKE_ZONE.start+shift,end=FIRE_SMOKE_ZONE.end+shift;
 return p.x>=start&&p.x<=end&&p.y>=FIRE_SMOKE_ZONE.yMin&&!w.smokeOpen;
}
export function fireTreePhase(w:FireWorld,now:number):'calm'|'warning'|'impact'{
 if(w.treeOpen||w.deadUntil>0||w.completed)return 'calm';
 const elapsed=Math.max(0,now-w.cycleStart);
 const local=elapsed%FIRE_COLLAPSE_PERIOD;
 if(local>=13200&&local<15000)return 'warning';
 if(local>=15000&&local<16600)return 'impact';
 return 'calm';
}
export function fireVisualTreePhase(w:FireWorld):'calm'|'warning'|'impact'{
 return w.treeOpen?'calm':w.treeStatus;
}
export function fireCheckpoint(w:FireWorld):Pose[]{
 const x=w.treeOpen?4340:w.smokeOpen?3180:w.logOpen?1720:210;
 return ([0,1,2] as Seat[]).map(seat=>({seat,x:x+seat*55,y:653,vx:0,vy:0}));
}
export function fireGrounded(w:FireWorld,p:Pose):boolean{
 return firePlatforms(w).some(b=>
  Math.abs(p.x-b.x)<b.width/2+12&&
  Math.abs(p.y-(b.y-b.height/2-22))<42&&Math.abs(p.vy)<140);
}
const close=(p:Pose,t:{x:number;y:number},dx=64,dy=58)=>
 Math.abs(p.x-t.x)<=dx&&Math.abs(p.y-t.y)<=dy;
export class FireAuthority {
 world=initFire();
 private lastJump:[number,number,number]=[0,0,0];
 private doubleUsed=false;private jumpStartY=0;
 private lastSkill:[number,number,number]=[0,0,0];
 private resourceAt=Date.now();
 reset(now=Date.now()):void{
  const id=this.world.resetId+1;this.world=initFire(now);this.world.resetId=id;
  this.lastJump=[0,0,0];this.doubleUsed=false;this.jumpStartY=0;
  this.lastSkill=[0,0,0];this.resourceAt=now;
 }
 authorizeEnergy(seat:Seat,kind:VitalAction,poses:Pose[],now=Date.now(),facing:-1|1=1):
 {ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid'}{
  const w=this.world,p=poses[seat];
  const fail=(reason:'invalid'|'tired'|'cooldown')=>({ok:false,reason} as const);
  if(!p||w.deadUntil||w.completed||w.health[seat]===0)return fail('invalid');
  if(kind==='doubleJump'&&seat!==0||kind==='shoot'&&seat!==1||
    kind==='dash'&&seat!==2)return fail('invalid');
  if(kind==='jump'){
   if(now-this.lastJump[seat]<220)return fail('cooldown');
   if(!fireGrounded(w,p)&&w.supporting[seat]===null)return fail('invalid');
  }
  if(kind==='doubleJump'&&
    (!this.lastJump[0]||now-this.lastJump[0]<110||
     now-this.lastJump[0]>1550||this.doubleUsed||
     p.y>this.jumpStartY+18||p.vy>480))return fail('invalid');
  if(kind==='shoot'&&now-this.lastSkill[1]<VITALS.SHOT_COOLDOWN_MS||
     kind==='dash'&&now-this.lastSkill[2]<VITALS.DASH_COOLDOWN_MS)
    return fail('cooldown');
  if(!spendVital(w,seat,kind,now))return fail('tired');
  if(kind==='jump'){
   this.lastJump[seat]=now;
   if(seat===0){this.jumpStartY=p.y;this.doubleUsed=false;}
  }else if(kind==='doubleJump')this.doubleUsed=true;
  else{
   this.lastSkill[seat]=now;
   if(kind!=='dash')this.interact(seat,kind,poses,now,facing);
   else {w.dashAt[2]=now;w.dashX[2]=p.x;}
   if(kind==='shoot'&&seat===1){
     shootMonster(4,w,p,facing,now,w.cycleStart);
     shootHound(w,p,facing,now);
   }
  }
  activateMonsterSkill(w,seat,kind,now,facing);
  armHound(w,seat,kind,now,facing);
  return {ok:true,reason:'ok'};
 }
 interact(seat:Seat,kind:'lever'|'switch'|'shoot'|'dash'|'support'|'detach',
  poses:Pose[],now=Date.now(),facing:-1|1=1):boolean{
  const w=this.world,p=poses[seat];if(!p||w.deadUntil||w.completed||w.health[seat]===0)return false;
  if(kind==='dash'&&seat===2){w.dashAt[2]=now;w.dashX[2]=p.x;}
  // Nino can release his mechanism only by dashing into range.
  const nino=seat===2&&kind==='dash';
  const teo=seat===0&&kind==='lever'&&Math.abs(p.vy)<175;
  const lia=seat===1&&kind==='shoot';
  const shot=(t:{x:number;y:number})=>lia&&facing===1&&t.x>=p.x&&t.x-p.x<=360
   &&Math.abs(p.y-18-t.y)<=65;
  const t=FIRE_TARGETS;
  if(!w.logOpen){
   if(teo&&close(p,t.log.teo,54,34))w.log[0]=true;
   if(shot(t.log.lia))w.log[1]=true;
   if(nino&&close(p,t.log.nino,65,55))w.log[2]=true;
   if(w.log.every(Boolean))w.logOpen=true;
  }else if(!w.smokeOpen){
   if(teo&&close(p,t.smoke.teo,55,38))w.smoke[0]=true;
   if(shot(t.smoke.lia))w.smoke[1]=true;
   if(nino&&close(p,t.smoke.nino,70,55))w.smoke[2]=true;
   if(w.smoke.every(Boolean))w.smokeOpen=true;
  }else if(!w.treeOpen){
   if(teo&&close(p,t.tree.teo,55,40))w.tree[0]=true;
   if(shot(t.tree.lia))w.tree[1]=true;
   if(nino&&close(p,t.tree.nino,70,58))w.tree[2]=true;
   if(w.tree.every(Boolean)&&!w.treeFallAt)w.treeFallAt=now+2200;
  }
  return true;
 }
 tickResources(poses:Pose[],now=Date.now()):boolean{
  const dt=Math.max(0,Math.min(120,now-this.resourceAt));this.resourceAt=now;
  if(this.world.deadUntil||this.world.completed)return false;
  let changed=regenVitals(this.world,poses,now,dt);
  for(const p of poses){
   const seat=p.seat;
   if(this.world.health[seat]===0)continue;
   const inside=fireHeavySmoke(this.world,p,now);
   if(!inside){if(this.world.smokeSeconds[seat]!==0){
     this.world.smokeSeconds[seat]=0;changed=true;}continue;}
   this.world.smokeSeconds[seat]=Math.min(30,this.world.smokeSeconds[seat]+dt/1000);
   const old=this.world.stamina[seat];
   this.world.stamina[seat]=Math.max(0,Math.round((old-14*dt/1000)*100)/100);
   if(this.world.stamina[seat]!==old)changed=true;
   if(this.world.smokeSeconds[seat]>=5&&this.world.stamina[seat]<5&&
     damageVitals(this.world,seat,now)){
    this.world.damageCause='smoke';changed=true;
   }
  }
  return changed;
 }
 tick(poses:Pose[],now=Date.now(),safeUntil=0,isSolo=false):
 {changed:boolean;poses?:Pose[];respawns?:Pose[];won?:boolean;respawn?:boolean}{
  const w=this.world;
  if(w.deadUntil){
   if(now<w.deadUntil)return {changed:false};
   // Fatal rule for the FINAL LEVEL: any teammate's death restarts the
   // ENTIRE biome, not the most recent checkpoint. Reset all puzzles, hazards,
   // timers, lives, stamina, temporary boosts and human-stack state together.
   this.reset(now);
   this.world.safeUntil=[now+1600,now+1600,now+1600];
   return {changed:true,poses:FIRE_START.map(p=>({...p})),respawn:true};
  }
  if(w.completed)return {changed:false,won:true};
  // Falling into the abyss is always fatal for the entire team, even in the arena.
  // Never inspect dead/frozen poses here, or a corpse can create a reset loop.
  if(poses.some(p=>w.health[p.seat]>0&&p.y>=FIRE_DEATH_Y)){
   this.reset(now);
   this.world.safeUntil=[now+1600,now+1600,now+1600];
   return {changed:true,poses:FIRE_START.map(p=>({...p})),respawn:true};
  }
  if(w.treeOpen&&!w.bossEncounterStarted&&poses.some(p=>
     w.health[p.seat]>0&&p.x>=HOUND_LEFT-115)){
   w.bossEncounterStarted=true;
  }
  if(w.health.every(h=>h===0)||w.health.some(h=>h===0)&&!w.bossEncounterStarted){
   this.reset(now);
   this.world.safeUntil=[now+1600,now+1600,now+1600];
   return {changed:true,poses:FIRE_START.map(p=>({...p})),respawn:true};
  }
  let changed=false;
  const respawns:Pose[]=[];
  for(const seat of [0,1,2] as Seat[]){
   if(w.health[seat]>0)continue;
   if(!w.reviveAt[seat]){
    w.reviveAt[seat]=now+FIRE_BOSS_REVIVE_MS;
    w.supporting[seat]=null;
    if(seat===1)w.supporting[0]=null;
    changed=true;
   }else if(now>=w.reviveAt[seat]){
    w.reviveAt[seat]=0;
    w.health[seat]=VITALS.MAX_HEALTH;
    w.stamina[seat]=VITALS.MAX_STAMINA;
    w.safeUntil[seat]=now+1800;
    w.lastSpent[seat]=now;
    w.smokeSeconds[seat]=0;
    respawns.push({...FIRE_BOSS_RESPAWNS[seat]});
    changed=true;
   }
  }
  if(respawns.length)return {changed:true,respawns};
  const direction=fireWind(now,w);
  if(direction!==w.windDirection){w.windDirection=direction;changed=true;}
  const flare=Math.floor(Math.max(0,now-w.cycleStart)/4400)%3;
  if(flare!==w.flare){w.flare=flare;changed=true;}
  const cycle=Math.floor(Math.max(0,now-w.cycleStart)/FIRE_COLLAPSE_PERIOD);
  if(cycle!==w.collapseCycle){w.collapseCycle=cycle;changed=true;}
  // The hazard cycle stays at 21s; landscape layout changes every 60s.
  const phaseElapsed=Math.max(0,now-w.phaseStart);
  if(w.blackoutUntil===0&&phaseElapsed>=FIRE_SHIFT_PERIOD){
   w.blackoutUntil=now+FIRE_SHIFT_DURATION;
   w.safeUntil=[now+FIRE_SHIFT_DURATION+1200,now+FIRE_SHIFT_DURATION+1200,
     now+FIRE_SHIFT_DURATION+1200];
   changed=true;
  }
  if(w.blackoutUntil>0&&now>=w.blackoutUntil){
   w.blackoutUntil=0;
   w.phaseStart=now;w.layout=((w.layout+1)%3) as 0|1|2;w.cycle++;
   const roots=FIRE_SHIFT_ROOTS[w.layout];
   const adjusted=poses.map(p=>{
    const overlap=roots.find(root=>Math.abs(p.x-root.x)<59&&p.y>578);
    if(!overlap)return {...p};
    const x=p.x<overlap.x?overlap.x-83:overlap.x+83;
    return {...p,x,vx:0,vy:0};
   });
   changed=true;
   if(adjusted.some((p,i)=>p.x!==poses[i].x))return {changed:true,poses:adjusted};
  }
  // The server approves the moving dash and checks Nino's marker proximity.
  const nino=poses[2];
  if(nino&&w.dashAt[2]>0&&now-w.dashAt[2]<900&&
    Math.abs(nino.x-w.dashX[2])>=38){
   const before=w.log[2]||w.smoke[2]||w.tree[2];
   this.interact(2,'dash',poses,now);
   if(!before&&(w.log[2]||w.smoke[2]||w.tree[2]))changed=true;
  }
  // Trigger only after all players have crossed the completed cooperative
  // puzzles. Timing is broadcast in the existing FireWorld snapshot.
  if(w.escapeAt===0&&w.logOpen&&w.smokeOpen&&w.treeOpen&&
     poses.every(p=>p.x>=4270)){
    w.escapeAt=now;changed=true;
  }
  // Final guardian fight: no advancing fire wall may close off the arena.
  void isSolo;
  const treePhase=fireTreePhase(w,now);
  if(treePhase!==w.treeStatus){w.treeStatus=treePhase;changed=true;}
  const remaining=Math.max(0,now-w.cycleStart)%FIRE_COLLAPSE_PERIOD;
  const warn=treePhase==='warning'?now+(15000-remaining):0;
  const impact=treePhase==='impact'?now+(16600-remaining):0;
  // only send changed state at phase boundaries, not for a countdown at 20Hz
  if(Boolean(w.treeWarningUntil)!==Boolean(warn)){
   w.treeWarningUntil=warn;changed=true;
  }
  if(Boolean(w.treeImpactUntil)!==Boolean(impact)){
   w.treeImpactUntil=impact;changed=true;
  }
  if(w.treeFallAt&&now>=w.treeFallAt&&!w.treeOpen){
   w.treeOpen=true;w.treeFallAt=0;changed=true;
  }
  if(now>=safeUntil&&w.blackoutUntil<=now){
   if(tickHound(w,poses,now))changed=true;
   const living=poses.filter(p=>w.health[p.seat]>0);
   const monsters=tickMonsters(4,w,living,now,w.cycleStart,safeUntil);
   if(monsters.changed){
    changed=true;
    if(monsters.hitType)w.damageCause=monsters.hitType;
   }
   for(const p of poses){
    if(w.health[p.seat]===0)continue;
    let cause:FireWorld['damageCause']='none';
    if(p.y>=FIRE_DEATH_Y)cause='fall';
    else if(fireballHit(w,p,now))cause='fireball';
    else if(fireDamageZone(w,p,now))cause='fire';
    else if(treePhase==='impact'&&Math.abs(p.x-FIRE_TREE_DANGER.x)<FIRE_TREE_DANGER.radius
      &&p.y>FIRE_TREE_DANGER.yMin)cause='tree';
    if(cause!=='none'&&damageVitals(w,p.seat,now,cause==='fall')){
     w.damageCause=cause;changed=true;
    }
   }
  }
  if(w.health.some(h=>h===0)){
   if(w.health.every(h=>h===0)||!w.bossEncounterStarted){
    this.reset(now);
    this.world.safeUntil=[now+1600,now+1600,now+1600];
    return {changed:true,poses:FIRE_START.map(p=>({...p})),respawn:true};
   }
   for(const seat of [0,1,2] as Seat[])if(w.health[seat]===0&&!w.reviveAt[seat]){
    w.reviveAt[seat]=now+FIRE_BOSS_REVIVE_MS;
    w.supporting[seat]=null;
    if(seat===1)w.supporting[0]=null;
    changed=true;
   }
  }
  if(!w.deadUntil&&w.treeOpen&&w.smokeOpen&&w.logOpen&&w.hound.hp===0&&exitPresence(4,poses,w.health).ready){
   w.completed=true;return {changed:true,won:true};
  }
  return {changed};
 }
}
