import type {Pose} from './network';

/** Kenney scenery is purely visual; bats are ACTUAL stage 03/04 host-owned
 * enemies. Their flight is deterministic from the synchronized phase clock.
 * The host owns damage, shot approvals and temporary knockouts.
 */
export type BatStage=3|4;
export type BatSpot={x:number;y:number;span:number;rise:number;period:number;offset:number};
export type BatFlight={x:number;y:number;vx:number;flipX:boolean};
export const BAT_DOWN_MS=12000;
export const BAT_SHOT_RANGE=355;
export const BAT_SHOT_HEIGHT=61;
export const BAT_TOUCH_HALF_WIDTH=31;
export const BAT_TOUCH_HALF_HEIGHT=33;
export const BAT_LAYOUT:Readonly<Record<BatStage,readonly [BatSpot,BatSpot]>>={
  // Up the canopy route: one near the branch gauntlet and one after the bridge.
  3:[
    {x:2790,y:452,span:117,rise:28,period:4700,offset:0},
    {x:3780,y:365,span:125,rise:26,period:5300,offset:1150}
  ],
  // On the solid paths between fire challenges, never over collapsing bridges.
  4:[
    {x:1880,y:625,span:114,rise:20,period:4350,offset:700},
    {x:3460,y:618,span:120,rise:24,period:4950,offset:1950}
  ]
};
export type BatDownState=[number,number];
export const initialBats=():BatDownState=>[0,0];
export const validBatState=(value:unknown):value is BatDownState=>
 Array.isArray(value)&&value.length===2&&value.every(t=>typeof t==='number'&&
 Number.isFinite(t)&&t>=0);

/** Endless, gentle side-to-side motion and wing bobbing. No random state. */
export function batFlight(stage:BatStage,id:0|1,now:number,startedAt:number):BatFlight{
 const cfg=BAT_LAYOUT[stage][id];
 const elapsed=Math.max(0,now-startedAt)+cfg.offset;
 const theta=(elapsed%cfg.period)/cfg.period*Math.PI*2;
 const x=cfg.x+Math.sin(theta)*cfg.span;
 const y=cfg.y+Math.sin(theta*2+.6)*cfg.rise;
 const vx=Math.cos(theta)*cfg.span*(Math.PI*2/cfg.period);
 return {x,y,vx,flipX:vx<0};
}
export const batAlive=(down:BatDownState,id:0|1,now:number):boolean=>
 now>=down[id];

/** Slingshot collision resolves on the HOST from real Lia pose + facing,
 * only after authorizeEnergy('shoot') has approved the shot/stamina/cooldown.
 * The nearest eligible flying bat along the 355px ray is downed in ONE hit.
 */
export function hitBatWithSlingshot(
 stage:BatStage,down:BatDownState,pose:Pick<Pose,'x'|'y'>,
 facing:-1|1,now:number,startedAt:number
):number{
 const candidates=([0,1] as const).filter(id=>{
  if(!batAlive(down,id,now))return false;
  const bat=batFlight(stage,id,now,startedAt);
  const forward=(bat.x-pose.x)*facing;
  return forward>=-12&&forward<=BAT_SHOT_RANGE&&
   Math.abs(bat.y-(pose.y-18))<=BAT_SHOT_HEIGHT;
 }).sort((a,b)=>
  Math.abs(batFlight(stage,a,now,startedAt).x-pose.x)-
  Math.abs(batFlight(stage,b,now,startedAt).x-pose.x));
 if(candidates.length===0)return -1;
 const id=candidates[0];down[id]=now+BAT_DOWN_MS;return id;
}
export function batTouchesHero(
 stage:BatStage,down:BatDownState,pose:Pick<Pose,'x'|'y'>,
 now:number,startedAt:number
):boolean{
 return ([0,1] as const).some(id=>{
  if(!batAlive(down,id,now))return false;
  const bat=batFlight(stage,id,now,startedAt);
  return Math.abs(pose.x-bat.x)<=BAT_TOUCH_HALF_WIDTH&&
    Math.abs(pose.y-bat.y)<=BAT_TOUCH_HALF_HEIGHT;
 });
}
