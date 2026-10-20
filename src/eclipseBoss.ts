import type {Pose,Seat} from './network';
import type {Vitals} from './loopVitals';
import type {BatImpacts} from './flyingBats';
import {damageVitals} from './loopVitals';

export const ECLIPSE_NAME='SENTINELA DO ECLIPSE';
export const ECLIPSE_MAX_HP=16;
export const ECLIPSE_HOME_X=4850;
export const ECLIPSE_LEFT_X=4430;
export const ECLIPSE_SAFE_LEFT=4400;
export const ECLIPSE_SAFE_RIGHT=5030;
export const ECLIPSE_FLOOR_Y=649;
export type EclipseBoss={
 hp:number;x:number;y:number;facing:-1|1;awakeAt:number;
 lastTick:number;leapAt:number;nextLeapAt:number;hitAt:number;hurtUntil:number;
 attackAt:number;projectileHitAt:number;defeatedAt:number;
 stompUntil:number;dashUntil:number;dashFacing:-1|1;
};
export type EclipseArena=Vitals&{
 boss:EclipseBoss;batImpacts:BatImpacts;ratImpacts:BatImpacts;
 supporting:[Seat|null,Seat|null,Seat|null];
};
export const initEclipseBoss=(now=Date.now()):EclipseBoss=>({
 hp:ECLIPSE_MAX_HP,x:ECLIPSE_HOME_X,y:ECLIPSE_FLOOR_Y,facing:-1,
 awakeAt:0,lastTick:now,leapAt:0,nextLeapAt:now+1300,
 hitAt:0,hurtUntil:0,attackAt:0,projectileHitAt:0,defeatedAt:0,
 stompUntil:0,dashUntil:0,dashFacing:1
});
export function validEclipseBoss(v:unknown):v is EclipseBoss{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const b=v as Record<string,unknown>;
 return Number.isInteger(b.hp)&&Number(b.hp)>=0&&Number(b.hp)<=ECLIPSE_MAX_HP&&
  (b.facing===1||b.facing===-1)&&(b.dashFacing===1||b.dashFacing===-1)&&
  ['x','y','awakeAt','lastTick','leapAt','nextLeapAt','hitAt','hurtUntil',
   'attackAt','projectileHitAt','defeatedAt','stompUntil','dashUntil'].every(k=>
    typeof b[k]==='number'&&Number.isFinite(b[k])&&Number(b[k])>=0)
  &&Number(b.x)>=ECLIPSE_LEFT_X&&Number(b.x)<=5020&&Number(b.y)>=400&&Number(b.y)<=ECLIPSE_FLOOR_Y;
}
export function hurtEclipse(w:EclipseArena,now:number,damage=1):boolean{
 const b=w.boss;
 if(!b.awakeAt||b.hp<=0||now-b.hitAt<350)return false;
 b.hp=Math.max(0,b.hp-damage);b.hitAt=now;b.hurtUntil=now+280;
 if(!b.hp)b.defeatedAt=now;
 return true;
}
export function armEclipse(w:EclipseArena,seat:Seat,kind:string,now:number,facing:-1|1):void{
 if(seat===0&&kind==='doubleJump')w.boss.stompUntil=now+1650;
 if(seat===2&&kind==='dash'){w.boss.dashUntil=now+850;w.boss.dashFacing=facing;}
}
export function shootEclipse(w:EclipseArena,p:Pose,facing:-1|1,now:number):boolean{
 const b=w.boss,dist=(b.x-p.x)*facing;
 return p.seat===1&&dist>=-12&&dist<=355&&
  Math.abs((b.y-26)-(p.y-18))<=80&&hurtEclipse(w,now);
}
function recoil(w:EclipseArena,seat:Seat,now:number,vx:number,vy:number):void{
 w.safeUntil[seat]=Math.max(w.safeUntil[seat],now+750);
 const impulse={at:now,vx,vy};
 w.batImpacts[seat]=impulse;w.ratImpacts[seat]=impulse;
}
export function tickEclipse(w:EclipseArena,poses:Pose[],now:number):boolean{
 const b=w.boss,dt=Math.min(90,Math.max(0,now-b.lastTick));b.lastTick=now;
 if(b.hp===0)return false;
 const living=poses.filter(p=>w.health[p.seat]>0&&p.x>=ECLIPSE_LEFT_X&&p.x<=5060);
 if(!living.length){
  if(!b.awakeAt)return false;
  const old=b.x;b.x=Math.min(ECLIPSE_HOME_X,b.x+155*dt/1000);
  b.y=ECLIPSE_FLOOR_Y;b.leapAt=0;b.facing=1;
  if(b.x>=ECLIPSE_HOME_X)b.awakeAt=0;
  return old!==b.x||b.awakeAt===0;
 }
 const target=living.sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
 if(!target)return false;
 let changed=false;
 if(!b.awakeAt){b.awakeAt=now;changed=true;}
 if(now>=b.nextLeapAt&&now>=b.hurtUntil){
  b.leapAt=now;b.nextLeapAt=now+(b.hp<=8?1750:2550);changed=true;
 }
 const dir:-1|1=target.x<b.x?-1:1;b.facing=dir;
 const speed=now-b.leapAt<850?198:b.hp<=8?170:138;
 if(now>=b.hurtUntil&&Math.abs(target.x-b.x)>34){
  const next=Math.max(ECLIPSE_LEFT_X,Math.min(4980,b.x+dir*speed*dt/1000));
  changed=changed||next!==b.x;b.x=next;
 }
 const jump=b.leapAt>0&&now-b.leapAt<850?Math.sin((now-b.leapAt)/850*Math.PI):0;
 const nextY=ECLIPSE_FLOOR_Y-jump*145;
 changed=changed||Math.abs(nextY-b.y)>.1;b.y=nextY;
 // Skill hits resolve first. Successful hits push heroes away and grant i-frames.
 for(const p of living){
  if(p.seat===0&&b.stompUntil>=now&&p.vy>75&&
    Math.abs(p.x-b.x)<52&&p.y>=b.y-113&&p.y<=b.y-26&&hurtEclipse(w,now,2)){
   b.stompUntil=0;recoil(w,0,now,p.x<b.x?-210:210,-275);changed=true;
  }
  if(p.seat===2&&b.dashUntil>=now&&p.vx*b.dashFacing>90&&
    Math.abs(p.x-b.x)<60&&Math.abs(p.y-b.y)<83&&hurtEclipse(w,now,2)){
   b.dashUntil=0;recoil(w,2,now,-b.dashFacing*235,-155);changed=true;
  }
 }
 if(!b.hp)return true;
 // Original Arclight projectile animation: visible energy bolt, host-only collision.
 if(now-b.attackAt>2400&&Math.abs(target.x-b.x)<370){
  b.attackAt=now;b.projectileHitAt=0;changed=true;
 }
 for(const p of living){
  if(w.safeUntil[p.seat]>now)continue;
  const touching=Math.abs(p.x-b.x)<57&&Math.abs(p.y-b.y)<145;
  const travel=now-b.attackAt;
  const boltX=b.x+b.facing*travel*.25;
  const boltY=Math.max(b.y-38,ECLIPSE_FLOOR_Y-62);
  const projectile=b.attackAt>0&&travel>=80&&travel<900&&
   b.projectileHitAt!==b.attackAt&&Math.abs(p.x-boltX)<46&&Math.abs(p.y-boltY)<84;
  if(!touching&&!projectile)continue;
  if(!damageVitals(w,p.seat,now,false))continue;
  if(projectile)b.projectileHitAt=b.attackAt;
  w.batImpacts[p.seat]={at:now,vx:p.x<b.x?-240:240,vy:-205};
  w.ratImpacts[p.seat]=w.batImpacts[p.seat];
  if(w.supporting[p.seat]!==null){w.supporting[p.seat]=null;if(p.seat===1)w.supporting[0]=null;}
  changed=true;
 }
 return changed;
}
