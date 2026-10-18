import type {Pose,Seat} from './network';
import {initVitals,type Vitals} from './loopVitals';

/** Fase 03 da NOVA aventura. Independente da terceira fase clássica. */
export const TREE_WIDTH=4400, TREE_HEIGHT=1250, TREE_CYCLE=60000, TREE_BLACKOUT=2000;
export const TREE_VOID_Y=1170;
export type TreeLayout=0|1|2;
export type TreePlatform={x:number;y:number;width:number;height:number;state?:TreeLayout;puzzle?:'bridge'|'rope'|'final'};
export const TREE_PLATFORMS:readonly TreePlatform[]=[
 {x:1080,y:830,width:190,height:24},{x:1250,y:740,width:130,height:20},
 {x:1440,y:670,width:110,height:18},{x:1620,y:620,width:165,height:20},
 {x:1860,y:620,width:510,height:28}, // clareira suspensa inicial
 {x:2150,y:570,width:125,height:20},{x:2330,y:490,width:115,height:20},
 {x:2530,y:420,width:110,height:20},{x:2750,y:420,width:130,height:20},
 {x:2960,y:365,width:120,height:20},{x:3150,y:300,width:140,height:20},
 {x:3370,y:390,width:110,height:18},{x:3540,y:330,width:105,height:18},
 {x:3710,y:250,width:130,height:20},{x:3940,y:180,width:145,height:22},
 {x:4150,y:145,width:200,height:26},
 {x:2270,y:650,width:170,height:18,state:0},{x:2460,y:580,width:145,height:18,state:1},
 {x:2640,y:530,width:130,height:18,state:2},
 {x:3500,y:490,width:260,height:20,puzzle:'bridge'},
 {x:3260,y:375,width:210,height:20,puzzle:'rope'},
 {x:4010,y:250,width:190,height:20,puzzle:'final'}
];
export const TREE_START:Pose[]=([0,1,2] as Seat[]).map(seat=>({seat,x:1740+seat*60,y:584,vx:0,vy:0}));
export type TreeWorld=Vitals&{
 layout:TreeLayout;cycle:number;cycleStart:number;blackoutUntil:number;deadUntil:number;resetId:number;
 bridge:[boolean,boolean,boolean];bridgeOpen:boolean;
 tower:[boolean,boolean,boolean];ropeOpen:boolean;
 time:[boolean,boolean,boolean];finalOpen:boolean;completed:boolean;
 supporting:[Seat|null,Seat|null,Seat|null];dashAt:number;dashX:number;
};
export function initTree(now=Date.now()):TreeWorld{return {
 layout:0,cycle:0,cycleStart:now,blackoutUntil:0,deadUntil:0,resetId:0,
 bridge:[false,false,false],bridgeOpen:false,tower:[false,false,false],ropeOpen:false,
 time:[false,false,false],finalOpen:false,completed:false,supporting:[null,null,null],
 dashAt:0,dashX:0,...initVitals()
};}
export function validTree(value:unknown):value is TreeWorld{
 if(!value||typeof value!=='object')return false;
 const w=value as Record<string,unknown>;
 return [0,1,2].includes(Number(w.layout))
 &&['cycle','cycleStart','blackoutUntil','deadUntil','resetId','dashAt','dashX'].every(k=>typeof w[k]==='number'&&Number.isFinite(w[k])&&Number(w[k])>=0)
 &&['bridgeOpen','ropeOpen','finalOpen','completed'].every(k=>typeof w[k]==='boolean')
 &&['bridge','tower','time'].every(k=>Array.isArray(w[k])&&(w[k] as unknown[]).length===3&&(w[k] as unknown[]).every(v=>typeof v==='boolean'))
 &&Array.isArray(w.supporting)&&w.supporting.length===3;
}
export function treePlatforms(w:TreeWorld):TreePlatform[]{
 return TREE_PLATFORMS.filter(p=>p.state===undefined||p.state===w.layout)
 .filter(p=>p.puzzle!=='bridge'||w.bridgeOpen)
 .filter(p=>p.puzzle!=='rope'||w.ropeOpen)
 .filter(p=>p.puzzle!=='final'||w.finalOpen);
}
export function treeFatal(p:Pose,now:number,w:TreeWorld,protectedUntil=0):boolean{
 return now>=protectedUntil&&w.blackoutUntil<=now&&w.deadUntil===0&&!w.completed
 &&p.y>=TREE_VOID_Y&&p.vy>0;
}
export function treeObjective(w:TreeWorld):{title:string;progress:string}{
 if(!w.bridgeOpen)return {title:'A Ponte dos Três: unam suas habilidades.',progress:w.bridge.filter(Boolean).length+'/3'};
 if(!w.ropeOpen)return {title:'A Escada Humana: alcancem o cipó.',progress:w.tower.filter(Boolean).length+'/3'};
 if(!w.finalOpen)return {title:'Os Galhos do Tempo: sigam o vento.',progress:w.time.filter(Boolean).length+'/3'};
 return {title:'A Última Copa: reúnam os três na saída.',progress:'Saída liberada'};
}
export function treeWind(w:TreeWorld,x:number):-1|0|1{
 const target=!w.bridgeOpen?3200:!w.ropeOpen?3500:!w.finalOpen?3850:4150;
 return target>x+40?1:target<x-40?-1:0;
}
const close=(p:Pose,x:number,y:number,dx=68,dy=65)=>Math.abs(p.x-x)<=dx&&Math.abs(p.y-y)<=dy;
export class TreeAuthority{
 world=initTree();
 reset(now=Date.now()){const id=this.world.resetId+1;this.world=initTree(now);this.world.resetId=id;}
 /** Returns new poses only for authoritative team respawn. */
 tick(poses:Pose[],now=Date.now()):{changed:boolean;poses?:Pose[];reset?:boolean;won?:boolean}{
  const w=this.world;
  if(w.deadUntil){if(now<w.deadUntil)return {changed:false};this.reset(now);return {changed:true,poses:TREE_START.map(p=>({...p})),reset:true};}
  if(w.completed)return {changed:false,won:true};
  if(w.blackoutUntil){if(now<w.blackoutUntil)return {changed:false};
   w.blackoutUntil=0;w.layout=((w.layout+1)%3) as TreeLayout;w.cycle++;w.cycleStart=now;
   // Preserve everyone's progress, but never strand them on a vanished branch.
   const safe=poses.every(p=>treePlatforms(w).some(b=>Math.abs(p.x-b.x)<b.width/2-10&&Math.abs(p.y-(b.y-b.height/2-22))<35));
   return {changed:true,poses:safe?undefined:TREE_START.map(p=>({...p}))};
  }
  if(now-w.cycleStart>=TREE_CYCLE){w.blackoutUntil=now+TREE_BLACKOUT;return {changed:true};}
  if(poses.some(p=>treeFatal(p,now,w))){w.deadUntil=now+1400;w.health=[0,0,0];return {changed:true};}
  if(w.finalOpen&&poses.length===3&&poses.every(p=>close(p,4150,101,110,75))){w.completed=true;return {changed:true,won:true};}
  return {changed:false};
 }
 /** All puzzle actions are character-specific, position-validated and host-authoritative. */
 interact(seat:Seat,kind:'lever'|'switch'|'shoot'|'support'|'detach'|'dash',poses:Pose[],now=Date.now(),facing:-1|1=1):boolean{
  const w=this.world,p=poses[seat];if(!p||w.deadUntil||w.blackoutUntil>now||w.completed)return false;
  if(kind==='dash'&&seat===2){w.dashAt=now;w.dashX=p.x;return true;}
  if(kind==='support'&&seat!==2){const base=(seat===0?1:2) as Seat;
   if(!close(p,poses[base].x,poses[base].y,50,70)||!close(p,3390,390,135,145))return false;
   if(seat===0&&w.supporting[1]!==2)return false;
   w.supporting[seat]=base;return true;
  }
  if(kind==='detach'&&w.supporting[seat]!==null){w.supporting[seat]=null;return true;}
  let changed=false;
  if(!w.bridgeOpen){
   if(seat===2&&kind==='switch'&&now-w.dashAt<=2800&&p.x-w.dashX>90&&close(p,3010,345))changed=w.bridge[2]=true;
   if(seat===1&&kind==='shoot'&&facing===1&&p.x<3200&&p.x>2810&&close(p,2960,343,180,140))changed=w.bridge[1]=true;
   if(seat===0&&kind==='lever'&&close(p,3150,256,64,45))changed=w.bridge[0]=true;
   if(w.bridge.every(Boolean))w.bridgeOpen=true;
  }else if(!w.ropeOpen){
   if(seat===1&&w.supporting[1]===2)changed=w.tower[1]=true;
   if(seat===0&&w.supporting[0]===1)changed=w.tower[0]=true;
   if(seat===0&&kind==='lever'&&w.tower[0]&&w.tower[1]&&close(p,3710,206,65,45))changed=w.tower[2]=true;
   if(w.tower.every(Boolean))w.ropeOpen=true;
  }else if(!w.finalOpen){
   if(seat===1&&w.layout===0&&kind==='shoot'&&facing===1&&close(p,3710,205,145,110))changed=w.time[1]=true;
   if(seat===0&&w.layout===1&&kind==='lever'&&close(p,3940,136,65,45))changed=w.time[0]=true;
   if(seat===2&&w.layout===2&&kind==='switch'&&now-w.dashAt<2800&&p.x-w.dashX>90&&close(p,3940,136,130,130))changed=w.time[2]=true;
   if(w.time.every(Boolean))w.finalOpen=true;
  }
  return changed;
 }
}
