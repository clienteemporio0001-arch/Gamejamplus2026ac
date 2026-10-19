/** Deterministic Game Jam challenge schedules. No new network authority.
 * Both host and guests derive identical visuals from broadcast world clocks.
 * All damage and victories remain in their original authoritative systems.
 */
export type TimedHazard='warning'|'active';
export const BOULDER_ZONE={from:5800,to:6390,y:604,radius:33} as const;
export function boulderEvent(cycleStart:number,now:number,
 paused=false):{phase:TimedHazard;x:number;y:number}|null{
 if(paused||cycleStart<=0)return null;
 const t=Math.max(0,now-cycleStart);
 if(t<1800)return {phase:'warning',x:BOULDER_ZONE.to,y:BOULDER_ZONE.y};
 if(t>=5350)return null;
 const fraction=Math.max(0,Math.min(1,(t-1800)/3550));
 return {phase:'active',x:BOULDER_ZONE.to-
  fraction*(BOULDER_ZONE.to-BOULDER_ZONE.from),y:BOULDER_ZONE.y};
}
export function boulderHit(p:{x:number;y:number},b:ReturnType<typeof boulderEvent>):boolean{
 return b?.phase==='active'&&Math.abs(p.x-b.x)<=BOULDER_ZONE.radius+14&&
   Math.abs(p.y-b.y)<=57;
}
export const TIDE_ZONE={from:2490,to:3090,restY:677,highY:568} as const;
export function tideSurface(cycleStart:number,now:number,active:boolean,
 paused=false):{phase:'warning'|'rising'|'high'|'falling';y:number}|null{
 if(!active||paused||cycleStart<=0)return null;
 const t=Math.max(0,now-cycleStart)%22500;
 if(t<7200||t>=17300)return null;
 if(t<9500)return {phase:'warning',y:TIDE_ZONE.restY};
 if(t<12700)return {phase:'rising',y:TIDE_ZONE.restY-
  (TIDE_ZONE.restY-TIDE_ZONE.highY)*(t-9500)/3200};
 if(t<14800)return {phase:'high',y:TIDE_ZONE.highY};
 return {phase:'falling',y:TIDE_ZONE.highY+
  (TIDE_ZONE.restY-TIDE_ZONE.highY)*(t-14800)/2500};
}
export function tideHit(p:{x:number;y:number},t:ReturnType<typeof tideSurface>):boolean{
 return !!t&&t.phase!=='warning'&&
  p.x>TIDE_ZONE.from+15&&p.x<TIDE_ZONE.to-15&&p.y>t.y+18;
}
/** Only three normal branches are fragile, all alternates/essential puzzle
 * bridges and branches retain their existing collider and authority behavior.
 */
export const FRAGILE_BRANCH_INDICES=[5,8,16] as const;
export type FragilePhase='solid'|'cracking'|'gone';
export function fragilePhase(cycleStart:number,now:number,index:number,
 paused=false):FragilePhase{
 if(paused||cycleStart<=0||!FRAGILE_BRANCH_INDICES.includes(index as 5|8|16))
  return 'solid';
 const offset=FRAGILE_BRANCH_INDICES.indexOf(index as 5|8|16)*4100;
 const t=(Math.max(0,now-cycleStart)+offset)%17800;
 return t<10400?'solid':t<13300?'cracking':t<15600?'gone':'solid';
}
export const ESCAPE_START_X=4100,ESCAPE_FINISH_X=5140,ESCAPE_GRACE_MS=4500;
export function escapeWallX(chaseAt:number,now:number,isSolo:boolean):number|null{
 if(chaseAt<=0)return null;
 const elapsed=Math.max(0,now-chaseAt-ESCAPE_GRACE_MS);
 return Math.min(ESCAPE_FINISH_X,ESCAPE_START_X+
   elapsed*(isSolo?10:29)/1000);
}
export function escapeFireHit(p:{x:number;y:number},wall:number|null,
 chaseAt:number,now:number):boolean{
 return wall!==null&&now-chaseAt>=ESCAPE_GRACE_MS&&
  p.x>=4250&&p.x<wall+42&&p.y>=145;
}
