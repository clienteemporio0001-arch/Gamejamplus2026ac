import type {Pose,Seat} from './network';
import {batAlive,batFlight,batContactImpact,BAT_DOWN_MS,BAT_LAYOUT,
 initialBatImpacts,validBatImpacts,type BatImpact,type BatImpacts,type BatDownState} from './flyingBats';
import {damageVitals,type Vitals} from './loopVitals';

export type RatLevel=1|2|3|4;
export type RatKind='pink'|'black'|'king'|'fire';
export type RatSpot={x:number;y:number;span:number;speed:number;offset:number};
export type RatFlight={x:number;y:number;vx:number;flipX:boolean};
export type RatDownState=[number,number,number];
export const RAT_RESPAWN_MS=12000;
export const RAT_HIT_X=30;
export const RAT_HIT_Y=29;
export const RAT_DOWN_AT=(now:number)=>now+RAT_RESPAWN_MS;
export const RAT_LAYOUT:Readonly<Record<RatLevel,readonly [RatSpot,RatSpot,RatSpot]>>={
 // All floor segments below are traversable; do not patrol across pits.
 1:[
  {x:2690,y:610,span:76,speed:68,offset:120},
  {x:5890,y:610,span:80,speed:75,offset:850},
  {x:10050,y:610,span:70,speed:70,offset:1660}
 ],
 2:[
  {x:600,y:610,span:64,speed:66,offset:430},
  {x:1925,y:610,span:80,speed:72,offset:800},
  {x:3570,y:610,span:76,speed:69,offset:1550}
 ],
 // Tight patrols on existing fixed branches; no invisible platforms.
 3:[
  {x:1980,y:714,span:46,speed:63,offset:350},
  {x:2870,y:482,span:56,speed:68,offset:1260},
  {x:3920,y:388,span:44,speed:65,offset:1970}
 ],
 4:[
  {x:785,y:649,span:72,speed:75,offset:450},
  {x:1900,y:649,span:80,speed:80,offset:1110},
  {x:3380,y:649,span:77,speed:82,offset:1830}
 ]
};
export const RAT_SKIN:Readonly<Record<RatLevel,RatKind>>=
 {1:'pink',2:'black',3:'king',4:'fire'};
export const initialRats=():RatDownState=>[0,0,0];
export type RatCombatWorld={
 ratDownUntil:RatDownState;
 ratImpacts:BatImpacts;
 ratStompUntil:number;
 ratDashUntil:number;
 ratDashFacing:-1|1;
};
export const initRatCombat=():RatCombatWorld=>({
 ratDownUntil:initialRats(),ratImpacts:initialBatImpacts(),
 ratStompUntil:0,ratDashUntil:0,ratDashFacing:1
});
export function validRatCombat(value:unknown):value is RatCombatWorld{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const w=value as Record<string,unknown>;
 return Array.isArray(w.ratDownUntil)&&w.ratDownUntil.length===3&&
 w.ratDownUntil.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)&&
 validBatImpacts(w.ratImpacts)&&
 ['ratStompUntil','ratDashUntil'].every(k=>
  typeof w[k]==='number'&&Number.isFinite(w[k])&&Number(w[k])>=0)&&
 (w.ratDashFacing===1||w.ratDashFacing===-1);
}
export const ratAlive=(down:RatDownState,id:0|1|2,now:number):boolean=>now>=down[id];
export function ratFlight(stage:RatLevel,id:0|1|2,now:number,start:number):RatFlight{
 const spot=RAT_LAYOUT[stage][id];
 const elapsed=Math.max(0,now-start)+spot.offset;
 const distance=spot.span*2;
 const traveled=(elapsed*spot.speed/1000)%(distance*2);
 const vx=traveled<distance?spot.speed:-spot.speed;
 return {x:spot.x+(traveled<distance?traveled-distance/2:3*distance/2-traveled),
  y:spot.y,vx,flipX:vx<0};
}
export function ratTouch(stage:RatLevel,id:0|1|2,p:Pick<Pose,'x'|'y'>,now:number,start:number):boolean{
 const pos=ratFlight(stage,id,now,start);
 return Math.abs(p.x-pos.x)<=RAT_HIT_X&&Math.abs(p.y-pos.y)<=RAT_HIT_Y;
}
export function ratImpact(stage:RatLevel,id:0|1|2,p:Pick<Pose,'x'|'y'>,now:number,start:number):BatImpact|null{
 if(!ratTouch(stage,id,p,now,start))return null;
 const rat=ratFlight(stage,id,now,start);
 const dx=p.x-rat.x;
 return {at:now,vx:(dx>3?1:dx< -3?-1:rat.vx>=0?1:-1)*(stage===4?245:220),vy:-180};
}
type BatCombatWorld={batDownUntil:BatDownState;batImpacts:BatImpacts};
export type MonsterCombatWorld=Vitals&RatCombatWorld&
 Partial<BatCombatWorld>&{supporting:[Seat|null,Seat|null,Seat|null]};
export type MonsterHit='rat'|'bat';
export type CombatTick={changed:boolean;hitType:MonsterHit|null};

/** Approved skill activates a short melee window; never trusts arbitrary
 * client-side claims that a character is dashing or double-jumping.
 */
export function activateMonsterSkill(w:RatCombatWorld,seat:Seat,
 kind:'jump'|'doubleJump'|'shoot'|'dash',now:number,facing:-1|1):void{
 if(kind==='doubleJump'&&seat===0)w.ratStompUntil=now+1750;
 if(kind==='dash'&&seat===2){
  w.ratDashUntil=now+720;
  w.ratDashFacing=facing;
 }
}
type Target={kind:MonsterHit;id:0|1|2;range:number};
function nearestTarget(stage:RatLevel,w:MonsterCombatWorld,
 predicate:(p:RatFlight|ReturnType<typeof batFlight>,kind:MonsterHit)=>boolean,
 now:number,start:number):Target|null{
 const found:Target[]=[];
 for(const id of [0,1,2] as const){
  if(ratAlive(w.ratDownUntil,id,now)){
   const pos=ratFlight(stage,id,now,start);
   if(predicate(pos,'rat'))found.push({kind:'rat',id,range:pos.x});
  }
 }
 if(stage>=3&&w.batDownUntil){
  for(const id of [0,1] as const){
   if(!batAlive(w.batDownUntil,id,now))continue;
   const pos=batFlight(stage as 3|4,id,now,start);
   if(predicate(pos,'bat'))found.push({kind:'bat',id,range:pos.x});
  }
 }
 return found[0]??null;
}
function defeat(w:MonsterCombatWorld,kind:MonsterHit,id:number,now:number):void{
 if(kind==='rat')w.ratDownUntil[id as 0|1|2]=RAT_DOWN_AT(now);
 else if(w.batDownUntil)w.batDownUntil[id as 0|1]=now+BAT_DOWN_MS;
}
/** One projectile defeats the first aligned monster, whichever is closer. */
export function shootMonster(stage:RatLevel,w:MonsterCombatWorld,
 shooter:Pick<Pose,'x'|'y'>,facing:-1|1,now:number,start:number):MonsterHit|null{
 const choices:Target[]=[];
 for(const id of [0,1,2] as const)if(ratAlive(w.ratDownUntil,id,now)){
  const pos=ratFlight(stage,id,now,start),dist=(pos.x-shooter.x)*facing;
  if(dist>=-12&&dist<=355&&Math.abs(pos.y-(shooter.y-18))<=65)
   choices.push({kind:'rat',id,range:dist});
 }
 if(stage>=3&&w.batDownUntil)
 for(const id of [0,1] as const)if(batAlive(w.batDownUntil,id,now)){
  const pos=batFlight(stage as 3|4,id,now,start),dist=(pos.x-shooter.x)*facing;
  if(dist>=-12&&dist<=355&&Math.abs(pos.y-(shooter.y-18))<=61)
   choices.push({kind:'bat',id,range:dist});
 }
 choices.sort((a,b)=>a.range-b.range);
 if(!choices.length)return null;
 defeat(w,choices[0].kind,choices[0].id,now);return choices[0].kind;
}
function activeMelee(stage:RatLevel,w:MonsterCombatWorld,pose:Pose,now:number,start:number):boolean{
 if(pose.seat===0&&w.ratStompUntil>=now&&pose.vy>65){
  // The second jump must end ON TOP of a monster, not beside it.
  const target=nearestTarget(stage,w,pos=>Math.abs(pose.x-pos.x)<32&&
    pose.y-pos.y>=-72&&pose.y-pos.y<=-34,now,start);
  if(target){
   defeat(w,target.kind,target.id,now);
   w.safeUntil[0]=Math.max(w.safeUntil[0],now+700);
   const impulse={at:now,vx:pose.x<target.range?-170:170,vy:-255};
   w.ratImpacts[0]=impulse;
   if(stage>=3&&w.batImpacts)w.batImpacts[0]=impulse;
   w.ratStompUntil=0;
   return true;
  }
 }
 if(pose.seat===2&&w.ratDashUntil>=now&&
    pose.vx*w.ratDashFacing>80){
  const target=nearestTarget(stage,w,pos=>
    Math.abs(pose.x-pos.x)<=43&&Math.abs(pose.y-pos.y)<=42,
    now,start);
  if(target){
   defeat(w,target.kind,target.id,now);
   w.safeUntil[2]=Math.max(w.safeUntil[2],now+700);
   const impulse={at:now,vx:-w.ratDashFacing*205,vy:-135};
   w.ratImpacts[2]=impulse;
   if(stage>=3&&w.batImpacts)w.batImpacts[2]=impulse;
   w.ratDashUntil=0;
   return true;
  }
 }
 return false;
}
/** Host-only contact processing. Invulnerable heroes never receive repeated
 * recoil, and enemies defeated by stomp/dash cannot inflict contact damage.
 * Bat state is optional in the first two maps.
 */
export function tickMonsters(stage:RatLevel,w:MonsterCombatWorld,
 poses:Pose[],now:number,start:number,protectedUntil=0):CombatTick{
 let changed=false;
 // Resolve attack FIRST so Téo/Nino can safely ram monsters with their power.
 for(const p of poses)if(activeMelee(stage,w,p,now,start))changed=true;
 if(now<protectedUntil)return {changed,hitType:null};
 let hitType:MonsterHit|null=null;
 for(const p of poses){
  let impact:BatImpact|null=null;
  let kind:MonsterHit|null=null;
  for(const id of [0,1,2] as const){
   if(!ratAlive(w.ratDownUntil,id,now))continue;
   impact=ratImpact(stage,id,p,now,start);
   if(impact){kind='rat';break;}
  }
  if(!impact&&stage>=3&&w.batDownUntil)
   impact=batContactImpact(stage as 3|4,w.batDownUntil,p,now,start);
  if(impact&&!kind)kind='bat';
  if(!impact||!damageVitals(w,p.seat,now))continue;
  // Always record the rat-combat impulse; on the final two maps the
  // existing bat channel additionally drives the shared visible recoil.
  // This keeps reconnect snapshots and all four stage tests consistent.
  w.ratImpacts[p.seat]=impact;
  if(stage>=3&&w.batImpacts)w.batImpacts[p.seat]=impact;
  if(w.supporting[p.seat]!==null){
   w.supporting[p.seat]=null;
   if(p.seat===1)w.supporting[0]=null;
  }
  changed=true;hitType=kind;
 }
 return {changed,hitType};
}
