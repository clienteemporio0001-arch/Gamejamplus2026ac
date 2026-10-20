import type {Pose,Seat} from './network';
import {damageVitals,type Vitals} from './loopVitals';
import type {BatImpacts} from './flyingBats';

/** Fase 02: Bafomet is simulated ONLY by the host, never by each client. */
export const BAFOMET_MAX_HP=12;
export const BAFOMET_SPAWN_X=3900;
export const BAFOMET_GROUND_Y=610;
export const BAFOMET_ARENA_LEFT=3370; // forward arrow sign: hard left pursuit limit
export const BAFOMET_RETREAT_SPEED=175;
export const HERO_REVIVE_MS=10000;
export type BafometState={
 hp:number;x:number;y:number;facing:-1|1;aggroAt:number;
 lastStepAt:number;leapAt:number;nextLeapAt:number;
 hurtUntil:number;lastHitAt:number;lastSwingAt:number;defeatedAt:number;
 stompUntil:number;dashUntil:number;dashFacing:-1|1;
};
export type BafometArena=Vitals&{
 boss:BafometState;exit:boolean;
 ratImpacts:BatImpacts;
 supporting:[Seat|null,Seat|null,Seat|null];
};
export function initBafomet(now=Date.now()):BafometState{
 return {hp:BAFOMET_MAX_HP,x:BAFOMET_SPAWN_X,y:BAFOMET_GROUND_Y,facing:-1,aggroAt:0,
  lastStepAt:now,leapAt:0,nextLeapAt:now+1600,hurtUntil:0,
  lastHitAt:0,lastSwingAt:0,defeatedAt:0,stompUntil:0,dashUntil:0,dashFacing:1};
}
export function validBafomet(value:unknown):value is BafometState{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const b=value as Record<string,unknown>;
 return typeof b.hp==='number'&&Number.isInteger(b.hp)&&Number(b.hp)>=0&&Number(b.hp)<=BAFOMET_MAX_HP
  &&b.facing!==undefined&&(b.facing===1||b.facing===-1)
  &&(b.dashFacing===1||b.dashFacing===-1)
  &&['aggroAt','x','y','lastStepAt','leapAt','nextLeapAt','hurtUntil','lastHitAt',
      'lastSwingAt','defeatedAt','stompUntil','dashUntil'].every(k=>
      typeof b[k]==='number'&&Number.isFinite(b[k])&&Number(b[k])>=0)
  &&Number(b.x)>=BAFOMET_ARENA_LEFT&&Number(b.x)<=4070
  &&Number(b.y)>=405&&Number(b.y)<=BAFOMET_GROUND_Y;
}
export function bafometAwake(w:BafometArena):boolean{
 // Crossing the arrow awakens the guardian, independently of the vine puzzles.
 return w.boss.aggroAt>0&&w.boss.hp>0;
}
export function hurtBafomet(w:BafometArena,now:number,damage=1):boolean{
 const b=w.boss;
 if(!bafometAwake(w)||now-b.lastHitAt<350)return false;
 b.hp=Math.max(0,b.hp-damage);
 b.lastHitAt=now;
 b.hurtUntil=now+260;
 if(b.hp===0)b.defeatedAt=now;
 return true;
}
/** The approved projectile uses Lia's real position and authoritative facing. */
export function shootBafomet(w:BafometArena,pose:Pose,facing:-1|1,now:number):boolean{
 const b=w.boss,dist=(b.x-pose.x)*facing;
 return pose.seat===1&&dist>=-12&&dist<=355
  &&Math.abs(b.y-22-(pose.y-18))<=68&&hurtBafomet(w,now);
}
export function empowerBafometAttack(w:BafometArena,seat:Seat,kind:string,now:number,facing:-1|1):void{
 if(seat===0&&kind==='doubleJump')w.boss.stompUntil=now+1500;
 if(seat===2&&kind==='dash'){w.boss.dashUntil=now+760;w.boss.dashFacing=facing;}
}
function tryMelee(w:BafometArena,p:Pose,now:number):boolean{
 const b=w.boss;
 if(p.seat===0&&b.stompUntil>=now&&p.vy>80&&
   Math.abs(p.x-b.x)<45&&p.y>=b.y-105&&p.y<=b.y-32){
   if(hurtBafomet(w,now,2)){b.stompUntil=0;return true;}
 }
 if(p.seat===2&&b.dashUntil>=now&&p.vx*b.dashFacing>90&&
   Math.abs(p.x-b.x)<53&&Math.abs(p.y-b.y)<67){
   if(hurtBafomet(w,now,2)){b.dashUntil=0;return true;}
 }
 return false;
}
export function tickBafomet(w:BafometArena,poses:Pose[],now:number):boolean{
 const b=w.boss;
 const dt=Math.min(90,Math.max(0,now-b.lastStepAt));
 b.lastStepAt=now;
 // The host is authoritative: crossing the sign starts pursuit, retreating
 // to the near-exit guard post resets aggro without healing or resetting puzzles.
 const active=poses.filter(p=>w.health[p.seat]>0);
 const beyond=active.some(p=>p.x>BAFOMET_ARENA_LEFT);
 if(b.hp<=0)return false;
 if(!beyond&&b.aggroAt>0){
  const oldX=b.x,oldY=b.y;
  b.x=Math.min(BAFOMET_SPAWN_X,b.x+BAFOMET_RETREAT_SPEED*dt/1000);
  b.y=BAFOMET_GROUND_Y;
  b.facing=1;b.leapAt=0;
  if(b.x>=BAFOMET_SPAWN_X-0.01){
   b.x=BAFOMET_SPAWN_X;b.aggroAt=0;b.nextLeapAt=now+1400;
  }
  return b.x!==oldX||b.y!==oldY||b.aggroAt===0;
 }
 if(b.aggroAt===0&&beyond)b.aggroAt=now;
 if(!bafometAwake(w))return false;
 // Only living heroes in the final arena can aggro the guard.
 const living=poses.filter(p=>w.health[p.seat]>0&&p.x>=BAFOMET_ARENA_LEFT&&p.x<=4095);
 const target=living.sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
 let changed=b.aggroAt===now;
 if(target){
  if(now>=b.nextLeapAt&&now>=b.hurtUntil){
   b.leapAt=now;
   b.nextLeapAt=now+(b.hp<=BAFOMET_MAX_HP/2?1780:2520);
   changed=true;
  }
  const direction: -1|1=target.x<b.x?-1:1;
  b.facing=direction;
  const speed=b.leapAt&&now-b.leapAt<880?195:b.hp<=6?156:128;
  if(Math.abs(target.x-b.x)>28&&now>=b.hurtUntil){
   const nx=Math.max(BAFOMET_ARENA_LEFT,Math.min(4032,
     b.x+direction*Math.min(Math.abs(target.x-b.x),speed*dt/1000)));
   changed=changed||nx!==b.x;b.x=nx;
  }
 }
 const elapsed=now-b.leapAt;
 const progress=b.leapAt>0&&elapsed<880?elapsed/880:0;
 const y=BAFOMET_GROUND_Y-Math.sin(Math.PI*progress)*146;
 if(Math.abs(y-b.y)>.1){b.y=y;changed=true;}
 // Stomp and dash resolve BEFORE contact, so a successful skill avoids retaliation.
 if(target){
  for(const p of living)if(tryMelee(w,p,now))changed=true;
  if(b.hp===0)return true;
  for(const p of living){
   const touching=Math.abs(p.x-b.x)<40&&Math.abs(p.y-b.y)<59;
   if(!touching||w.safeUntil[p.seat]>now)continue;
   if(!damageVitals(w,p.seat,now,false))continue;
   w.ratImpacts[p.seat]={at:now,vx:p.x<b.x?-245:245,vy:-235};
   if(w.supporting[p.seat]!==null){
    w.supporting[p.seat]=null;
    if(p.seat===1)w.supporting[0]=null;
   }
   b.lastSwingAt=now;
   changed=true;
  }
 }
 return changed;
}
