import {initRatCombat,validRatCombat,activateMonsterSkill,shootMonster,tickMonsters,type RatCombatWorld} from './ratCombat';
import {exitPresence} from './sharedExit';
import {BAFOMET_MAX_HP,HERO_REVIVE_MS,initBafomet,validBafomet,shootBafomet,empowerBafometAttack,tickBafomet,type BafometState} from './bafometBoss';
import type {Pose,Seat} from './network';
import type {PuzzleAction} from './puzzles';
import {VITALS,initVitals,validVitals,spendVital,regenVitals,damageVitals,type VitalAction,type Vitals} from './loopVitals';
export const TEMP_WIDTH=4200, TEMP_CYCLE=60000, TEMP_BLACKOUT=2000;
export const TEMP_START:Pose[]=([0,1,2] as Seat[]).map(seat=>({seat,x:1920+seat*64,y:606,vx:0,vy:0}));
export const TEMP_CHANNEL={start:2610,end:2970,bridgeY:655} as const;
export const TEMP_UPPER={x:2440,y:325,width:165,height:20,landing:293} as const;
export const TEMP_SUMMIT={x:2440,y:120,width:145,height:20,landing:88} as const;
export const tempSummitFooting=(p:Pose):boolean=>
 Math.abs(p.x-TEMP_SUMMIT.x)<=TEMP_SUMMIT.width/2-22&&
 Math.abs(p.y-TEMP_SUMMIT.landing)<=6&&Math.abs(p.vx)<165&&Math.abs(p.vy)<70;
export const TEMP_ECHO=[{x:870,y:515},{x:1300,y:598},{x:1630,y:598}] as const;
export const TEMP_TREE=[{x:2440,y:TEMP_SUMMIT.landing},{x:2700,y:598},{x:2550,y:598}] as const;
export const TEMP_ROOTS=[{x:3240,y:514},{x:3530,y:598},{x:3800,y:598}] as const;
export const TEMP_LAYOUTS=[
  {obstacles:[980,1520,3380],puddles:[420,1730,3180],temporaryBridge:false,wind:-1},
  {obstacles:[1190,1850,3480],puddles:[650,1570,3450],temporaryBridge:false,wind:1},
  {obstacles:[1450,2180,3680],puddles:[770,1890,3610],temporaryBridge:true,wind:1}
] as const;
export type TemporalWorld=Vitals&RatCombatWorld&{
  layout:0|1|2;cycle:number;cycleStart:number;blackoutUntil:number;deadUntil:number;resetId:number;
  echo:[boolean,boolean,boolean];tree:[boolean,boolean,boolean];bridgeAt:number;bridge:boolean;
  roots:[boolean,boolean,boolean];exit:boolean;completed:boolean;
  supporting:[Seat|null,Seat|null,Seat|null];stacked:boolean;climbReady:boolean;teoLanded:boolean;teoSummitReached:boolean;
  dashAt:number;dashX:number;teoJumpAt:number;teoJumpY:number;teoDoubled:boolean;
  skillAt:[number,number,number];resourceAt:number;
  boss:BafometState;reviveAt:[number,number,number];
};
const triple=(v:unknown):v is [boolean,boolean,boolean]=>
  Array.isArray(v)&&v.length===3&&v.every(x=>typeof x==='boolean');
const nonneg=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
export function initTemporal(now=Date.now()):TemporalWorld{
 return {layout:0,cycle:0,cycleStart:now,blackoutUntil:0,deadUntil:0,resetId:0,
  echo:[false,false,false],tree:[false,false,false],bridgeAt:0,bridge:false,
  roots:[false,false,false],exit:false,completed:false,supporting:[null,null,null],
  stacked:false,climbReady:false,teoLanded:false,teoSummitReached:false,dashAt:0,dashX:0,
  teoJumpAt:0,teoJumpY:0,teoDoubled:false,skillAt:[0,0,0],resourceAt:now,
  boss:initBafomet(now),reviveAt:[0,0,0],...initRatCombat(),...initVitals()};
}
export function validTemporal(value:unknown):value is TemporalWorld{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const w=value as Record<string,unknown>;
 return [0,1,2].includes(Number(w.layout))
   &&['cycle','cycleStart','blackoutUntil','deadUntil','resetId','bridgeAt','dashAt','dashX',
   'teoJumpAt','teoJumpY','resourceAt'].every(k=>nonneg(w[k]))
   &&['bridge','exit','completed','stacked','climbReady','teoLanded','teoSummitReached','teoDoubled'].every(k=>typeof w[k]==='boolean')
   &&triple(w.echo)&&triple(w.tree)&&triple(w.roots)
   &&Array.isArray(w.skillAt)&&w.skillAt.length===3&&w.skillAt.every(nonneg)
   &&Array.isArray(w.reviveAt)&&w.reviveAt.length===3&&w.reviveAt.every(nonneg)
   &&validBafomet(w.boss)
   &&Array.isArray(w.supporting)&&w.supporting.length===3
   &&w.supporting.every((s,i)=>s===null||(i===0&&s===1)||(i===1&&s===2))
   &&validRatCombat(w)&&validVitals(w);
}
export function tempWind(w:TemporalWorld,x:number):-1|0|1{
 if(!w.echo.every(Boolean)){
  const pending=w.echo.findIndex(done=>!done);
  const target=TEMP_ECHO[pending].x;
  return target>x+35?1:target<x-35?-1:0;
 }
 if(!w.bridge)return 1;
 if(w.layout!==2&&x>3150)return -1; // Never directs players into false storm gate.
 return 1;
}
export function tempSurface(w:TemporalWorld,x:number):'normal'|'mud'|'wet'{
 if((x>=620&&x<=820)||(x>=1710&&x<=1850)||(x>=3190&&x<=3380))return 'mud';
 if(TEMP_LAYOUTS[w.layout].puddles.some(px=>x>=px-75&&x<=px+75))return 'wet';
 return 'normal';
}
export function tempBlocks(w:TemporalWorld){
 return [/* Keep the original gate before the tree until the three rain landmarks are solved. */
 {x:2310,width:40,height:550,active:!w.echo.every(Boolean)},
 ...TEMP_LAYOUTS.map((config,i)=>({x:config.obstacles[0],width:62,height:98,active:i===w.layout})),
 ...TEMP_LAYOUTS.map((config,i)=>({x:config.obstacles[1],width:48,height:100,active:i===w.layout})),
 /* No wall beside the forward arrow after the fallen-tree crossing. */
 {x:3410,width:44,height:530,active:false},
 {x:4080,width:40,height:530,active:!w.exit||w.boss.hp>0}];
}
export function temporalObjective(w:TemporalWorld):{title:string;progress:string}{
 if(!w.echo.every(Boolean))return {title:'Encontrem os três marcos.',progress:'Marcos '+w.echo.filter(Boolean).length+'/3'};
 if(!w.bridge)return {title:'Derrubem a árvore sobre a correnteza.',progress:'Amarras '+w.tree.filter(Boolean).length+'/3'};
 if(!w.roots.every(Boolean))return {title:'Esperem o estado C e liberem as raízes.',progress:'Raízes '+w.roots.filter(Boolean).length+'/3'};
 if(w.boss.hp>0)return {title:'Derrotem o Guardião da Passagem!',progress:'GUARDIÃO '+w.boss.hp+'/'+BAFOMET_MAX_HP+' ♥'};
 return {title:'Reúnam os três na saída da tempestade.',progress:'Guardião derrotado · Passagem aberta'};
}
export function tempNear(p:Pose,x:number,y:number,dx=73,dy=89):boolean{
 return Math.abs(p.x-x)<=dx&&Math.abs(p.y-y)<=dy;
}
export function tempLanding(p:Pose):boolean{
 return Math.abs(p.x-TEMP_UPPER.x)<=56&&Math.abs(p.y-TEMP_UPPER.landing)<=6
   &&Math.abs(p.vx)<165&&Math.abs(p.vy)<70;
}
export type TemporalTick={changed:boolean;poses?:Pose[];respawns?:Pose[];reset?:boolean;won?:boolean};
export class TemporalAuthority{
 world:TemporalWorld=initTemporal();
 private lastJump:[number,number,number]=[0,0,0];
 private lastJumpY:[number,number,number]=[0,0,0];
 private doubleUsed:[boolean,boolean,boolean]=[false,false,false];
 reset(now=Date.now()):void{
  const id=this.world.resetId+1;
  this.world=initTemporal(now);this.world.resetId=id;
  this.lastJump=[0,0,0];this.lastJumpY=[0,0,0];this.doubleUsed=[false,false,false];
 }
 private playable(now:number):boolean{
  return !this.world.completed&&this.world.deadUntil===0&&
    (this.world.blackoutUntil===0||now>=this.world.blackoutUntil);
 }
 act(seat:Seat,a:PuzzleAction,p:Pose[],now=Date.now()):boolean{
  const w=this.world,actor=p[seat];
  if(!this.playable(now)||!actor||actor.seat!==seat||w.health[seat]===0)return false;
  if(a.kind==='support'&&(seat===0||seat===1)&&w.supporting[seat]===null){
   const base=seat===0?1:2;
   if(actor.x<2320||actor.x>2530||Math.abs(actor.x-p[base].x)>53||
      Math.abs(actor.y-p[base].y)>78||Math.abs(actor.vx)>150||Math.abs(p[base].vx)>150)return false;
   if(seat===0&&w.supporting[1]!==2)return false;
   w.supporting[seat]=base;
   if(w.supporting[0]===1&&w.supporting[1]===2)w.stacked=true;
   return true;
  }
  if(a.kind==='detach'&&w.supporting[seat]!==null){
   if(seat===0&&w.stacked&&Math.abs(actor.x-TEMP_UPPER.x)<95)w.climbReady=true;
   w.supporting[seat]=null;if(seat===1)w.supporting[0]=null;
   return true;
  }
  if(a.kind==='lever'&&seat===0){
   if(!w.echo[0]&&tempNear(actor,TEMP_ECHO[0].x,TEMP_ECHO[0].y,85,94)){w.echo[0]=true;return true;}
   if(w.echo.every(Boolean)&&w.teoLanded&&w.teoSummitReached&&!w.tree[0]&&tempSummitFooting(actor)){w.tree[0]=true;this.maybeFall(now);return true;}
   if(w.bridge&&w.layout===2&&!w.roots[0]&&tempNear(actor,TEMP_ROOTS[0].x,TEMP_ROOTS[0].y,75,80)){
    w.roots[0]=true;this.maybeExit();return true;
   }
  }
  if(a.kind==='switch'&&seat===2&&now-w.dashAt<3200&&actor.x-w.dashX>=95){
   if(!w.echo[2]&&tempNear(actor,TEMP_ECHO[2].x,TEMP_ECHO[2].y,75,85)){w.echo[2]=true;return true;}
   if(w.echo.every(Boolean)&&!w.tree[2]&&tempNear(actor,TEMP_TREE[2].x,TEMP_TREE[2].y,73,85)){
    w.tree[2]=true;this.maybeFall(now);return true;
   }
   if(w.bridge&&w.layout===2&&!w.roots[2]&&tempNear(actor,TEMP_ROOTS[2].x,TEMP_ROOTS[2].y,77,85)){
    w.roots[2]=true;this.maybeExit();return true;
   }
  }
  return false;
 }
 authorizeEnergy(seat:Seat,kind:VitalAction,poses:Pose[],now=Date.now(),facing:-1|1=1):
 {ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid'}{
  const w=this.world,p=poses[seat];
  const fail=(reason:'tired'|'cooldown'|'invalid')=>({ok:false,reason} as const);
  if(!p||p.seat!==seat||!this.playable(now)||w.health[seat]===0)return fail('invalid');
  if(kind==='shoot'&&seat!==1||kind==='dash'&&seat!==2||kind==='doubleJump'&&seat!==0)return fail('invalid');
  const cooldown=kind==='shoot'?510:kind==='dash'?1900:220;
  if(now-w.skillAt[seat]<cooldown&&(kind==='shoot'||kind==='dash'))return fail('cooldown');
  if(kind==='jump'){
   if(now-this.lastJump[seat]<220)return fail('cooldown');
   const grounded=Math.abs(p.vy)<120&&(p.y>=567&&p.y<=645
     ||Math.abs(p.y-TEMP_UPPER.landing)<37||Math.abs(p.y-TEMP_SUMMIT.landing)<37||Math.abs(p.y-516)<35);
   if(!grounded&&w.supporting[seat]===null)return fail('invalid');
  }
  if(kind==='doubleJump'&&(this.lastJump[0]===0||now-this.lastJump[0]<115||
    now-this.lastJump[0]>1650||this.doubleUsed[0]||p.y>this.lastJumpY[0]+12||p.vy>420))
    return fail('invalid');
  const cost=kind==='jump'?VITALS.JUMP:kind==='doubleJump'?VITALS.DOUBLE_JUMP:
    kind==='shoot'?VITALS.SHOT:VITALS.DASH;
  if(w.stamina[seat]<cost||!spendVital(w,seat,kind,now))return fail('tired');
  if(kind==='jump'){this.lastJump[seat]=now;this.lastJumpY[seat]=p.y;this.doubleUsed[seat]=false;}
  if(kind==='doubleJump')this.doubleUsed[0]=true;
  activateMonsterSkill(w,seat,kind,now,facing);
  empowerBafometAttack(w,seat,kind,now,facing);
  if(kind==='shoot'){
   shootMonster(2,w,p,facing,now,w.cycleStart);
   shootBafomet(w,p,facing,now);
  }
  if(kind==='shoot'||kind==='dash'){
   w.skillAt[seat]=now;
   if(kind==='dash'){w.dashAt=now;w.dashX=p.x;}
   else if(facing===1){
    const canShoot=(target:{x:number;y:number})=>target.x>p.x&&target.x-p.x<=360&&
      Math.abs(p.y-18-target.y)<=75;
    if(!w.echo[1]&&canShoot(TEMP_ECHO[1]))w.echo[1]=true;
    else if(w.echo.every(Boolean)&&!w.tree[1]&&canShoot(TEMP_TREE[1])){w.tree[1]=true;this.maybeFall(now);}
    else if(w.bridge&&w.layout===2&&!w.roots[1]&&canShoot(TEMP_ROOTS[1])){
      w.roots[1]=true;this.maybeExit();
    }
   }
  }
  return {ok:true,reason:'ok'};
 }
 private maybeFall(now:number):void{
  if(this.world.tree.every(Boolean)&&!this.world.bridgeAt)this.world.bridgeAt=now;
 }
 private maybeExit():void{if(this.world.roots.every(Boolean)&&this.world.layout===2)this.world.exit=true;}
 damage(seat:Seat,now=Date.now(),fatal=true):boolean{
  if(!this.playable(now)||!damageVitals(this.world,seat,now,fatal))return false;
  if(this.world.health[seat]===0){
   this.world.reviveAt[seat]=now+HERO_REVIVE_MS;
   this.world.supporting[seat]=null;
   if(seat===1)this.world.supporting[0]=null;
  }
  return true;
 }
 tickResources(poses:Pose[],now=Date.now()):boolean{
  const w=this.world,dt=Math.max(0,Math.min(100,now-w.resourceAt));
  w.resourceAt=now;
  return this.playable(now)&&regenVitals(w,poses,now,dt);
 }
 tick(poses:Pose[],now=Date.now()):TemporalTick{
  const w=this.world;
  // No team reset for a single fallen hero. The last death resets immediately.
  if(w.health.every(h=>h===0)){
   this.reset(now);return{changed:true,reset:true,poses:TEMP_START.map(p=>({...p}))};
  }
  const respawns:Pose[]=[];
  for(const seat of [0,1,2] as Seat[]){
   if(w.health[seat]===0&&w.reviveAt[seat]===0)w.reviveAt[seat]=now+HERO_REVIVE_MS;
   if(w.health[seat]===0&&w.reviveAt[seat]>0&&now>=w.reviveAt[seat]){
    w.health[seat]=3;w.stamina[seat]=100;w.safeUntil[seat]=now+1800;
    w.lastSpent[seat]=now;w.reviveAt[seat]=0;
    respawns.push({...TEMP_START[seat]});
   }
  }
  if(respawns.length)return{changed:true,respawns};
  for(const seat of [1,0] as Seat[]){
   const base=w.supporting[seat];
   if(base!==null){poses[seat].x=poses[base].x;poses[seat].y=poses[base].y-44;poses[seat].vx=poses[base].vx;poses[seat].vy=0;}
  }
  if(w.deadUntil){
   if(now<w.deadUntil)return{changed:false};
   this.reset(now);return{changed:true,reset:true,poses:TEMP_START.map(p=>({...p}))};
  }
  if(w.completed)return{changed:false,won:true};
  if(w.blackoutUntil){
   if(now<w.blackoutUntil)return{changed:false};
   w.blackoutUntil=0;w.layout=((w.layout+1)%3) as 0|1|2;w.cycle++;w.cycleStart=now;
   w.supporting=[null,null,null];w.climbReady=false;
   this.maybeExit();
   // Resolve only endangered players; never send the whole team back to spawn.
   const blockers=tempBlocks(w).filter(b=>b.active);
   let rescued=false;
   const corrected=poses.map(p=>{
    const overlap=blockers.find(b=>Math.abs(p.x-b.x)<b.width/2+24&&p.y>638-b.height-18);
    if(!overlap)return {...p};
    rescued=true;
    const left=overlap.x-overlap.width/2-33,right=overlap.x+overlap.width/2+33;
    const candidates=[left,right].filter(x=>x>50&&x<TEMP_WIDTH-50
      &&!(x>=TEMP_CHANNEL.start-22&&x<=TEMP_CHANNEL.end+22)
      &&blockers.every(b=>Math.abs(x-b.x)>=b.width/2+22));
    const x=candidates.sort((a,b)=>Math.abs(a-p.x)-Math.abs(b-p.x))[0]
      ??TEMP_START[p.seat].x;
    return {...p,x,vx:0,vy:0};
   });
   return{changed:true,poses:rescued?corrected:undefined};
  }
  if(now-w.cycleStart>=TEMP_CYCLE){w.blackoutUntil=now+TEMP_BLACKOUT;return{changed:true};}
  // Host checks Nino's traveled dash against the existing targets; no E needed.
  const nino=poses[2];
  const dashSolved=nino&&w.health[2]>0&&w.dashAt>0&&now-w.dashAt<=1700&&
   nino.x-w.dashX>=95&&this.act(2,{kind:'switch'},poses,now);
  const alive=poses.filter(p=>w.health[p.seat]>0);
  const rats=tickMonsters(2,w,alive,now,w.cycleStart);
  const bossChanged=tickBafomet(w,alive,now);
  if(w.health.every(h=>h===0)){
   this.reset(now);return{changed:true,reset:true,poses:TEMP_START.map(p=>({...p}))};
  }
  for(const seat of [0,1,2] as Seat[])if(w.health[seat]===0&&w.reviveAt[seat]===0){
   w.reviveAt[seat]=now+HERO_REVIVE_MS;
   w.supporting[seat]=null;if(seat===1)w.supporting[0]=null;
  }
  if(w.climbReady&&!w.teoLanded&&w.supporting[0]===null&&tempLanding(poses[0])){
   w.teoLanded=true;return{changed:true};
  }
  if(w.teoLanded&&!w.teoSummitReached&&w.supporting[0]===null&&tempSummitFooting(poses[0])){
    w.teoSummitReached=true;return{changed:true};
  }
  if(w.bridgeAt&&!w.bridge&&now-w.bridgeAt>=1900){w.bridge=true;return{changed:true};}
  if(w.bridge&&w.roots.every(Boolean)&&w.layout===2&&!w.exit){w.exit=true;return{changed:true};}
  if(w.bridge&&w.exit&&w.boss.hp===0&&exitPresence(2,poses,w.health).ready){
   w.completed=true;return{changed:true,won:true};
  }
  // A deceptive detour sends the whole party to its known safe clearing.
  if(w.bridge&&w.layout!==2&&poses.every(p=>Math.abs(p.x-3370)<100&&
       p.y>=560&&p.y<=640&&Math.abs(p.vy)<140)){
   w.supporting=[null,null,null];w.climbReady=false;
   return{changed:true,poses:TEMP_START.map(p=>({...p}))};
  }
  return{changed:rats.changed||bossChanged||Boolean(dashSolved)};
 }
}
