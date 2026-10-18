import type { Pose, Seat } from './network';

/** New adventure only. All costs and timings are configured in one place. */
export const VITALS={
  MAX_HEALTH:3,MAX_STAMINA:100,
  JUMP:10,DOUBLE_JUMP:20,SHOT:25,DASH:35,
  REGEN_DELAY_MS:800,REGEN_WALK:12,REGEN_REST:22,
  INVULNERABILITY_MS:1200,SHOT_COOLDOWN_MS:510,DASH_COOLDOWN_MS:1900,
} as const;
export type VitalAction='jump'|'doubleJump'|'shoot'|'dash';
export type Vitals={
  health:[number,number,number];
  stamina:[number,number,number];
  safeUntil:[number,number,number];
  lastSpent:[number,number,number];
};
const ints3=(v:unknown,max:number):boolean=>
  Array.isArray(v)&&v.length===3&&v.every((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=max);
const finite3=(v:unknown,max?:number):boolean=>
  Array.isArray(v)&&v.length===3&&v.every((n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&(max===undefined||n<=max));
export function validVitals(v:unknown):v is Vitals{
  if(!v||typeof v!=='object')return false;
  const x=v as Record<string,unknown>;
  return ints3(x.health,VITALS.MAX_HEALTH)&&finite3(x.stamina,VITALS.MAX_STAMINA)
    &&finite3(x.safeUntil)&&finite3(x.lastSpent);
}
export function initVitals():Vitals{
  return {health:[3,3,3],stamina:[100,100,100],
    safeUntil:[0,0,0],lastSpent:[0,0,0]};
}
export const actionCost=(a:VitalAction):number=>
  a==='jump'?VITALS.JUMP:a==='doubleJump'?VITALS.DOUBLE_JUMP:
  a==='shoot'?VITALS.SHOT:VITALS.DASH;
export function spendVital(v:Vitals,seat:Seat,action:VitalAction,now:number):boolean{
  const cost=actionCost(action);
  if(v.stamina[seat]<cost)return false;
  v.stamina[seat]=Math.max(0,Math.round((v.stamina[seat]-cost)*100)/100);
  v.lastSpent[seat]=now;
  return true;
}
/** Delta is host elapsed time, capped by caller to exclude stalled/background tabs. */
export function regenVitals(v:Vitals,poses:readonly Pose[],now:number,dtMs:number):boolean{
  let changed=false;
  if(dtMs<=0)return changed;
  for(const seat of [0,1,2] as Seat[]){
    if(v.health[seat]===0||now-v.lastSpent[seat]<VITALS.REGEN_DELAY_MS
      ||v.stamina[seat]>=VITALS.MAX_STAMINA)continue;
    const walking=Math.abs(poses[seat]?.vx??0)>25;
    const next=Math.min(100,Math.round((v.stamina[seat]+(walking?VITALS.REGEN_WALK:VITALS.REGEN_REST)*dtMs/1000)*100)/100);
    if(next!==v.stamina[seat]){v.stamina[seat]=next;changed=true;}
  }
  return changed;
}
export function damageVitals(v:Vitals,seat:Seat,now:number,fatal=false):boolean{
  if(v.health[seat]===0||(!fatal&&v.safeUntil[seat]>now))return false;
  v.health[seat]=fatal?0:Math.max(0,v.health[seat]-1);
  v.safeUntil[seat]=now+VITALS.INVULNERABILITY_MS;
  return true;
}
