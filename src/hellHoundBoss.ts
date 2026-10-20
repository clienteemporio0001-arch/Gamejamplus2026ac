import type {Pose,Seat} from './network';
import {damageVitals,type Vitals} from './loopVitals';
import type {RatCombatWorld} from './ratCombat';

export const HOUND_NAME='CÃO DAS CINZAS';
export const HOUND_HP=8;
export const HOUND_HOME=4800;
export const HOUND_LEFT=4430;
export const HOUND_GROUND=651;
export type HoundState={
 hp:number;x:number;y:number;facing:-1|1;active:boolean;
 lastStep:number;leapAt:number;nextLeapAt:number;lastHit:number;
 stompUntil:number;dashUntil:number;dashFacing:-1|1;defeatedAt:number;
};
export type HoundArena=Vitals&RatCombatWorld&{hound:HoundState;treeOpen:boolean};
export function initHound(now=Date.now()):HoundState{
 return{hp:HOUND_HP,x:HOUND_HOME,y:HOUND_GROUND,facing:-1,active:false,
  lastStep:now,leapAt:0,nextLeapAt:now+1600,lastHit:0,stompUntil:0,
  dashUntil:0,dashFacing:1,defeatedAt:0};
}
export function validHound(value:unknown):value is HoundState{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const b=value as Record<string,unknown>;
 const pos=['x','y','lastStep','leapAt','nextLeapAt','lastHit',
  'stompUntil','dashUntil','defeatedAt'];
 return Number.isInteger(b.hp)&&Number(b.hp)>=0&&Number(b.hp)<=HOUND_HP
  &&b.active!==undefined&&typeof b.active==='boolean'
  &&(b.facing===1||b.facing===-1)&&(b.dashFacing===1||b.dashFacing===-1)
  &&pos.every(k=>typeof b[k]==='number'&&Number.isFinite(b[k])&&Number(b[k])>=0)
  &&Number(b.x)>=HOUND_LEFT&&Number(b.x)<=HOUND_HOME&&Number(b.y)>=450&&Number(b.y)<=HOUND_GROUND;
}
export function hitHound(w:HoundArena,now:number,amount=1):boolean{
 const b=w.hound;
 if(!w.treeOpen||!b.active||b.hp<=0||now-b.lastHit<400)return false;
 b.hp=Math.max(0,b.hp-amount);
 b.lastHit=now;
 if(b.hp===0){b.defeatedAt=now;b.active=false;}
 return true;
}
export function armHound(w:HoundArena,seat:Seat,kind:string,now:number,facing:-1|1):void{
 if(seat===0&&kind==='doubleJump')w.hound.stompUntil=now+1500;
 if(seat===2&&kind==='dash'){w.hound.dashUntil=now+800;w.hound.dashFacing=facing;}
}
export function shootHound(w:HoundArena,p:Pose,facing:-1|1,now:number):boolean{
 const b=w.hound,dist=(b.x-p.x)*facing;
 return p.seat===1&&dist>=-10&&dist<=365&&Math.abs(p.y-b.y)<=95
  &&hitHound(w,now);
}
export function tickHound(w:HoundArena,poses:readonly Pose[],now:number):boolean{
 const b=w.hound,dt=Math.min(90,Math.max(0,now-b.lastStep));
 b.lastStep=now;
 if(b.hp<=0||!w.treeOpen)return false;
 const fighters=poses.filter(p=>w.health[p.seat]>0&&p.x>HOUND_LEFT&&p.x<=5050);
 if(fighters.length===0){
  if(!b.active)return false;
  const oldX=b.x,oldY=b.y;
  b.x=Math.min(HOUND_HOME,b.x+dt*.18);
  b.y=HOUND_GROUND;b.facing=1;b.leapAt=0;
  if(b.x===HOUND_HOME)b.active=false;
  return b.x!==oldX||b.y!==oldY||!b.active;
 }
 const waking=!b.active;
 b.active=true;
 let changed=waking;
 const target=fighters.reduce((best,p)=>Math.abs(p.x-b.x)<Math.abs(best.x-b.x)?p:best);
 if(now>b.nextLeapAt){
  b.leapAt=now;b.nextLeapAt=now+(b.hp<=4?1800:2600);changed=true;
 }
 const jumpAge=now-b.leapAt;
 const jump=b.leapAt>0&&jumpAge>=0&&jumpAge<800
  ?Math.sin(jumpAge/800*Math.PI)*115:0;
 const y=HOUND_GROUND-jump;
 if(Math.abs(y-b.y)>.1){b.y=y;changed=true;}
 b.facing=target.x<b.x?-1:1;
 if(Math.abs(target.x-b.x)>30){
  const next=Math.max(HOUND_LEFT,Math.min(HOUND_HOME,
   b.x+b.facing*Math.min(Math.abs(target.x-b.x),(b.hp<=4?180:135)*dt/1000)));
  if(next!==b.x){b.x=next;changed=true;}
 }
 // Successful skills are resolved BEFORE contact damage: no same-hit retaliation.
 for(const p of fighters){
  if(p.seat===0&&b.stompUntil>=now&&p.vy>75&&
   Math.abs(p.x-b.x)<50&&p.y>=b.y-94&&p.y<=b.y-15&&hitHound(w,now,2)){
   b.stompUntil=0;w.safeUntil[0]=Math.max(w.safeUntil[0],now+720);
   w.ratImpacts[0]={at:now,vx:p.x<b.x?-190:190,vy:-250};changed=true;
  }
  if(p.seat===2&&b.dashUntil>=now&&p.vx*b.dashFacing>90&&
   Math.abs(p.x-b.x)<56&&Math.abs(p.y-b.y)<77&&hitHound(w,now,2)){
   b.dashUntil=0;w.safeUntil[2]=Math.max(w.safeUntil[2],now+720);
   w.ratImpacts[2]={at:now,vx:-b.dashFacing*200,vy:-135};changed=true;
  }
 }
 if(b.hp===0)return true;
 for(const p of fighters){
  if(w.safeUntil[p.seat]>now||Math.abs(p.x-b.x)>=42||Math.abs(p.y-b.y)>=68)continue;
  if(damageVitals(w,p.seat,now)){
   w.ratImpacts[p.seat]={at:now,vx:p.x<b.x?-180:180,vy:-185};changed=true;
  }
 }
 return changed;
}
