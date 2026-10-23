import type {Pose,Seat} from './network';
import {LOOP_PHYSICS,LOOP_GEOMETRY,UPPER_BRANCH,LOOP_MARKS,LOOP_FINAL,
 LOOP_TERRAIN,LOOP_NATURAL_LEDGES,LOOP_LAYOUT_BRANCHES,SUSPENSION} from './forestLoop';
import {TEMP_CHANNEL,TEMP_ECHO,TEMP_ROOTS,TEMP_UPPER,TEMP_SUMMIT,TEMP_LAYOUTS} from './temporalForest';

export const JUMP_RISE=LOOP_PHYSICS.jumpVelocity**2/(2*LOOP_PHYSICS.gravity);
export const SAFE_FALL_HEIGHT=2*(2*JUMP_RISE);
export const BODY_HALF_HEIGHT=LOOP_PHYSICS.characterHeight/2;
export type FallSurface={x:number;width:number;centerY:number;height:number;active?:boolean};
const surfaceY=(s:FallSurface)=>s.centerY-s.height/2-BODY_HALF_HEIGHT;
export function loopFallSurfaces(layout:0|1|2,bridge:boolean,summit?:{x:number;centerY:number;width:number;height:number},_suspendedOpen=false,suspendedX=SUSPENSION.initialX):FallSurface[]{
 return [
 ...LOOP_TERRAIN.map(t=>({x:(t.from+t.to)/2,width:t.to-t.from,centerY:674,height:72})),
 ...LOOP_NATURAL_LEDGES.map(t=>({x:t.x,width:t.width,centerY:t.y,height:22})),
 ...LOOP_LAYOUT_BRANCHES.map(t=>({x:t.x,width:t.width,centerY:t.y,height:18,active:t.layout===layout})),
 // A física da passarela existe desde o início e acompanha cada snapshot.
 {x:suspendedX,width:SUSPENSION.width,centerY:656,height:SUSPENSION.height,active:true},
 {x:SUSPENSION.branch.x,width:SUSPENSION.branch.width,centerY:SUSPENSION.branch.y,height:SUSPENSION.branch.height},
 {x:LOOP_MARKS[0].x,width:165,centerY:546,height:20},
 {x:UPPER_BRANCH.x,width:UPPER_BRANCH.width,centerY:UPPER_BRANCH.centerY,height:UPPER_BRANCH.height},
 ...(summit?[summit]:[]),
 {x:LOOP_FINAL[0].x,width:145,centerY:548,height:20},
 {x:LOOP_GEOMETRY.bridge.x,width:LOOP_GEOMETRY.bridge.width,centerY:LOOP_GEOMETRY.bridge.y,height:LOOP_GEOMETRY.bridge.height,active:bridge},
 ...LOOP_GEOMETRY.layoutWalls.map((x,i)=>({x,width:45,centerY:LOOP_GEOMETRY.clearing.groundY-48,height:96,active:i===layout}))
 ];
}
export function temporalFallSurfaces(layout:0|1|2,bridge:boolean):FallSurface[]{
 return [
 {x:1305,width:2610,centerY:678,height:80},
 {x:3585,width:1230,centerY:678,height:80},
 {x:TEMP_ECHO[0].x,width:145,centerY:539,height:19},
 {x:TEMP_UPPER.x,width:TEMP_UPPER.width,centerY:TEMP_UPPER.y,height:TEMP_UPPER.height},
 {x:TEMP_SUMMIT.x,width:TEMP_SUMMIT.width,centerY:TEMP_SUMMIT.y,height:TEMP_SUMMIT.height},
 {x:TEMP_ROOTS[0].x,width:155,centerY:543,height:20},
 {x:2790,width:360,centerY:656,height:34,active:bridge},
 {x:3640,width:145,centerY:592,height:18,active:TEMP_LAYOUTS[layout].temporaryBridge},
 ...TEMP_LAYOUTS.map((w,i)=>({x:w.obstacles[0],width:62,centerY:638-98/2,height:98,active:i===layout})),
 ...TEMP_LAYOUTS.map((w,i)=>({x:w.obstacles[1],width:48,centerY:638-100/2,height:100,active:i===layout}))
 ];
}
export function hasPhysicalFooting(p:Pose,surfaces:readonly FallSurface[]):boolean{
 return Math.abs(p.vy)<=110&&surfaces.some(s=>s.active!==false
   &&Math.abs(p.x-s.x)<=s.width/2+5
   &&Math.abs(p.y-surfaceY(s))<=9);
}
type Tracked={ready:boolean;x:number;y:number;apex:number;grounded:boolean;lastAt:number};
const blank=():Tracked=>({ready:false,x:0,y:0,apex:0,grounded:false,lastAt:0});
/** Host-only sampler. No guest-authored "fall height" or damage packets. */
export class FallTracker{
 private suppressUntil=0;
 private states:[Tracked,Tracked,Tracked]=[blank(),blank(),blank()];
 reset(suppressUntil=0):void{this.states=[blank(),blank(),blank()];this.suppressUntil=suppressUntil;}
 resetSeat(seat:Seat):void{this.states[seat]=blank();}
 sample(poses:Pose[],surfaces:readonly FallSurface[],now:number,
   supported:readonly (Seat|null)[]=[null,null,null]):Seat[]{
  const hits:Seat[]=[];
  if(now<this.suppressUntil){this.states=[blank(),blank(),blank()];return hits;}
  for(const seat of [0,1,2] as Seat[]){
   const pose=poses[seat],state=this.states[seat];
   if(!pose||supported[seat]!==null){this.resetSeat(seat);continue;}
   const grounded=hasPhysicalFooting(pose,surfaces);
   if(!state.ready||now-state.lastAt>360||now<=state.lastAt||
      Math.abs(pose.x-state.x)>155||Math.abs(pose.y-state.y)>126){
    this.states[seat]={ready:true,x:pose.x,y:pose.y,
      apex:pose.y,grounded,lastAt:now};
    continue;
   }
   if(state.grounded&&!grounded)state.apex=Math.min(state.y,pose.y);
   if(!grounded)state.apex=Math.min(state.apex,pose.y);
   if(!state.grounded&&grounded){
    const drop=pose.y-state.apex;
    if(drop>SAFE_FALL_HEIGHT+1)hits.push(seat);
    state.apex=pose.y;
   }
   if(grounded)state.apex=pose.y;
   state.grounded=grounded;state.x=pose.x;state.y=pose.y;state.lastAt=now;
  }
  return hits;
 }
}
