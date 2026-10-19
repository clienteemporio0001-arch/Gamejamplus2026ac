import {exitPresence} from './sharedExit';
import type {Pose,Seat} from './network';
import {initVitals,validVitals,spendVital,regenVitals,VITALS,type VitalAction,type Vitals} from './loopVitals';
import {FRAGILE_BRANCH_INDICES} from './jamChallenges';

/** Fase 03 da NOVA aventura. Independente da terceira fase clássica. */
/** Distances obey gravity 850, jump -465, walking 235: 127px rise / 257px flat travel. */
export const TREE_WIDTH=5250,TREE_HEIGHT=1400,TREE_CYCLE=60000,TREE_BLACKOUT=2000;
export const TREE_VOID_Y=1315;
export const TREE_GRAVITY=850,TREE_JUMP=465,TREE_SPEED=235;
export const TREE_JUMP_RISE=TREE_JUMP*TREE_JUMP/(2*TREE_GRAVITY);
export const TREE_JUMP_RANGE=2*TREE_JUMP/TREE_GRAVITY*TREE_SPEED;
/** Keep Téo, Lia and Nino larger on screen without altering world physics. */
export function treeCameraZoom(view:{width:number;height:number},coarse:boolean):number{
 return coarse?Math.max(.72,Math.min(1.02,Math.min(view.height/440,view.width/850))):
  Math.max(.85,Math.min(1.16,view.height/700));
}
export type TreeLayout=0|1|2;
export type TreePlatform={
 x:number;y:number;width:number;height:number;state?:TreeLayout;
 puzzle?:'bridge'|'rope'|'final';material?:'branch'|'root'|'canopy'|'bridge';
};
const p=(x:number,y:number,width:number,material:TreePlatform['material']='branch'):TreePlatform=>({x,y,width,height:22,material});
/** Collidable branches of one continuous climbing adventure, not ground-level terrain. */
export const TREE_PLATFORMS:readonly TreePlatform[]=[
 p(1000,1040,154,'root'),p(1180,951,150),p(1360,855,160),
 p(1430,694,140),p(1680,780,450,'canopy'),
 p(1970,750,178),p(2150,705,162),p(2330,655,172),
 p(2510,606,156),p(2690,558,168),p(2870,520,183),p(3045,490,178),
 p(3205,458,190,'root'),p(3255,315,152,'branch'),
 // Gap impossible for a normal jump, opened by the actual cooperative bridge.
 {...p(3455,462,393,'bridge'),puzzle:'bridge'},
 p(3730,458,205,'canopy'),p(3905,415,170),p(4090,385,220,'root'),
 p(4195,215,135),p(4260,167,180,'branch'),
 {...p(4440,314,300,'bridge'),puzzle:'rope'},
 p(4660,308,205,'canopy'),p(4810,265,196,'root'),
 p(4865,203,134),
 { ...p(4980,259,169),state:2},
 p(5085,226,146),
 {...p(4980,246,260,'bridge'),puzzle:'final'},
 p(5142,191,173,'canopy'),
 // Rotating side branches offer alternate approaches without blocking the spine.
 {...p(2450,767,147,'root'),state:0},
 {...p(2555,731,145,'branch'),state:1},
 {...p(2720,676,152,'branch'),state:2},
 {...p(4550,412,136,'root'),state:0},
 {...p(4740,397,137,'root'),state:1},
 {...p(4830,376,140,'root'),state:2}
];
/** A clearly visible hollow or thick trunk protecting a nearby branch. */
export type TreeShelter={x:number;y:number;radius:number;kind:'hollow'|'roots'|'canopy'};
export const TREE_SHELTERS:readonly TreeShelter[]=[
 {x:1610,y:745,radius:89,kind:'hollow'},
 {x:2300,y:621,radius:65,kind:'roots'},
 {x:2860,y:487,radius:73,kind:'canopy'},
 {x:3170,y:425,radius:55,kind:'hollow'},
 {x:3715,y:425,radius:65,kind:'roots'},
 {x:4060,y:353,radius:65,kind:'hollow'},
 {x:4620,y:274,radius:65,kind:'canopy'},
 {x:4810,y:231,radius:61,kind:'hollow'}
];
export const TREE_START:Pose[]=([0,1,2] as Seat[]).map(seat=>({seat,x:1580+seat*62,y:745,vx:0,vy:0}));
/** Host-approved interaction locations. All linked to visible, reachable branches. */
export const TREE_TARGETS={
 bridge:{teo:{x:3255,y:282},lia:{x:3320,y:436},nino:{x:3220,y:426}},
 tower:{base:{x:4090,y:351},top:{x:4260,y:133}},
 time:{lia:{x:4840,y:215},teo:{x:4865,y:153},nino:{x:5050,y:171}},
 exit:{x:5142,y:157}
} as const;
/** Shared scene/authority interaction bounds. */
export const TREE_TOWER_REACH={baseX:105,baseY:105,topX:72,topY:70} as const;
export function treeTowerNearBase(p:Pick<Pose,'x'|'y'>):boolean{
 return Math.abs(p.x-TREE_TARGETS.tower.base.x)<=TREE_TOWER_REACH.baseX&&Math.abs(p.y-TREE_TARGETS.tower.base.y)<=TREE_TOWER_REACH.baseY;
}
export function treeTowerNearTop(p:Pick<Pose,'x'|'y'>):boolean{
 return Math.abs(p.x-TREE_TARGETS.tower.top.x)<=TREE_TOWER_REACH.topX&&Math.abs(p.y-TREE_TARGETS.tower.top.y)<=TREE_TOWER_REACH.topY;
}
export type TreeWindPhase='calm'|'warning'|'gust';
export const TREE_WIND_PERIOD=18000,TREE_GUST_WARNING=1700,TREE_GUST_DURATION=4400;
export const TREE_GUST_OFFSET=8700;
export type TreeWorld=Vitals&{
 layout:TreeLayout;cycle:number;cycleStart:number;blackoutUntil:number;deadUntil:number;resetId:number;
 bridge:[boolean,boolean,boolean];bridgeOpen:boolean;
 tower:[boolean,boolean,boolean];ropeOpen:boolean;
 time:[boolean,boolean,boolean];finalOpen:boolean;completed:boolean;
 supporting:[Seat|null,Seat|null,Seat|null];dashAt:number;dashX:number;
 fragileAt:[number,number,number];
 windPhase:TreeWindPhase;windDirection:-1|1;windUntil:number;gustCount:number;deathByGust:boolean;
};
export function initTree(now=Date.now()):TreeWorld{return {
 layout:0,cycle:0,cycleStart:now,blackoutUntil:0,deadUntil:0,resetId:0,
 bridge:[false,false,false],bridgeOpen:false,tower:[false,false,false],ropeOpen:false,
 time:[false,false,false],finalOpen:false,completed:false,supporting:[null,null,null],
 dashAt:0,dashX:0,fragileAt:[0,0,0],windPhase:'calm',windDirection:1,windUntil:0,gustCount:0,deathByGust:false,
 ...initVitals()
};}
/** Synchronize host poses of stacked friends with their base, rather than old ground positions. */
export function reconcileTreeSupports(poses:Pose[],supporting:readonly (Seat|null)[]):void{
 for(const seat of [1,0] as Seat[]){
  const baseSeat=supporting[seat];
  if(baseSeat===null||baseSeat===undefined)continue;
  const base=poses[baseSeat],rider=poses[seat];
  if(!base||!rider)continue;
  poses[seat]={seat,x:base.x,y:Math.max(30,base.y-44),vx:0,vy:0};
 }
}
export function validTree(value:unknown):value is TreeWorld{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const w=value as Record<string,unknown>;
 return [0,1,2].includes(Number(w.layout))
 &&['cycle','cycleStart','blackoutUntil','deadUntil','resetId','dashAt','dashX','windUntil','gustCount'].every(k=>typeof w[k]==='number'&&Number.isFinite(w[k])&&Number(w[k])>=0)
 &&['bridgeOpen','ropeOpen','finalOpen','completed','deathByGust'].every(k=>typeof w[k]==='boolean')
 &&['calm','warning','gust'].includes(String(w.windPhase))
 &&(w.windDirection===1||w.windDirection===-1)
 &&['bridge','tower','time'].every(k=>Array.isArray(w[k])&&(w[k] as unknown[]).length===3&&(w[k] as unknown[]).every(v=>typeof v==='boolean'))
 &&Array.isArray(w.fragileAt)&&w.fragileAt.length===3&&w.fragileAt.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0)
 &&Array.isArray(w.supporting)&&w.supporting.length===3
 &&w.supporting.every((v,i)=>v===null||(i===0&&v===1)||(i===1&&v===2))
 &&validVitals(w);
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
/** Physical contact with a rendered shelter; 0 protected, .35 at fringe, 1 exposed. */
export function treeExposure(p:Pick<Pose,'x'|'y'>):number{
 let exposure=1;
 for(const zone of TREE_SHELTERS){
  if(Math.abs(p.y-zone.y)>72)continue;
  const delta=Math.abs(p.x-zone.x);
  if(delta<=zone.radius)return 0;
  if(delta<=zone.radius+32)exposure=Math.min(exposure,.35);
 }
 return exposure;
}
/** Single shared host clock determines the danger; clients render its last broadcast value. */
export function treeWindSchedule(w:TreeWorld,now:number):
 {phase:TreeWindPhase;direction:-1|1;until:number}{
 const elapsed=Math.max(0,now-w.cycleStart);
 const round=Math.floor(elapsed/TREE_WIND_PERIOD);
 const local=elapsed%TREE_WIND_PERIOD;
 const direction:(-1|1)=(round+w.layout)%2===0?1:-1;
 const warnStart=TREE_GUST_OFFSET;
 const gustStart=warnStart+TREE_GUST_WARNING;
 const gustEnd=gustStart+TREE_GUST_DURATION;
 const origin=w.cycleStart+round*TREE_WIND_PERIOD;
 if(w.deadUntil>0||w.blackoutUntil>now||w.completed)
  return {phase:'calm',direction,until:0};
 if(local>=warnStart&&local<gustStart)return {phase:'warning',direction,until:origin+gustStart};
 if(local>=gustStart&&local<gustEnd)return {phase:'gust',direction,until:origin+gustEnd};
 return {phase:'calm',direction,until:origin+(local<warnStart?warnStart:TREE_WIND_PERIOD+warnStart)};
}
/** Velocity is applied to all local Arcade bodies, including unselected solo avatars. */
export function treeWindVelocity(w:TreeWorld,pose:Pick<Pose,'x'|'y'>,
 grounded:boolean,desired:number):number{
 const e=treeExposure(pose);
 if(w.windPhase==='gust'){
  const control=grounded?.72:.64;
  const push=(grounded?175:210)*w.windDirection*e;
  return Math.max(-395,Math.min(395,desired*control+push));
 }
 if(!grounded)return Math.max(-360,Math.min(360,desired+e*w.windDirection*(w.windPhase==='warning'?52:29)));
 return desired;
}
export function treeObjective(w:TreeWorld):{title:string;progress:string}{
 if(!w.bridgeOpen)return {title:'A Ponte dos Três: ativem os três mecanismos.',progress:w.bridge.filter(Boolean).length+'/3'};
 if(!w.ropeOpen)return {title:'Téo: use salto duplo para soltar o cipó.',progress:(w.tower[2]?'1':'0')+'/1'};
 if(!w.finalOpen)return {title:'Os Galhos do Tempo: sigam o vento.',progress:w.time.filter(Boolean).length+'/3'};
 return {title:'A Última Copa: reúnam os três na saída.',progress:'Saída liberada'};
}
export function treeWind(w:TreeWorld,x:number):-1|0|1{
 const target=!w.bridgeOpen?TREE_TARGETS.bridge.nino.x:!w.ropeOpen?TREE_TARGETS.tower.top.x:
  !w.finalOpen?TREE_TARGETS.time.lia.x:TREE_TARGETS.exit.x;
 return target>x+40?1:target<x-40?-1:0;
}
const close=(p:Pose,x:number,y:number,dx=68,dy=65)=>Math.abs(p.x-x)<=dx&&Math.abs(p.y-y)<=dy;
export class TreeAuthority{
 world=initTree();
 private lastJump:[number,number,number]=[0,0,0];
 private firstJumpY=0; private doubled=false;
 private lastSkill:[number,number,number]=[0,0,0];private resourceAt=Date.now();
 private shiftRiders:Array<{seat:Seat;fromX:number;fromY:number;toX:number;toY:number}>=[];
 private carried(poses:Pose[],fraction:number):Pose[]{
  const t=Math.max(0,Math.min(1,fraction)),smooth=t*t*(3-2*t);
  return poses.map(p=>{
   const rider=this.shiftRiders.find(r=>r.seat===p.seat);
   return rider?{...p,x:rider.fromX+(rider.toX-rider.fromX)*smooth,
    y:rider.fromY+(rider.toY-rider.fromY)*smooth,vx:0,vy:0}:{...p};
  });
 }
 reset(now=Date.now()){const id=this.world.resetId+1;this.world=initTree(now);this.world.resetId=id;
  this.lastJump=[0,0,0];this.firstJumpY=0;this.doubled=false;this.lastSkill=[0,0,0];this.resourceAt=now;this.shiftRiders=[];}
 authorizeEnergy(seat:Seat,kind:VitalAction,poses:Pose[],now=Date.now(),facing:-1|1=1):{ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid'}{
  const w=this.world,p=poses[seat];
  const fail=(reason:'tired'|'cooldown'|'invalid')=>({ok:false,reason} as const);
  if(!p||w.deadUntil>0||w.blackoutUntil>now||w.completed||w.health[seat]===0)return fail('invalid');
  if((kind==='doubleJump'&&seat!==0)||(kind==='shoot'&&seat!==1)||(kind==='dash'&&seat!==2))return fail('invalid');
  if(kind==='jump'){
   if(now-this.lastJump[seat]<220)return fail('cooldown');
   const grounded=treePlatforms(w).some(b=>Math.abs(p.x-b.x)<=b.width/2+12 &&
     Math.abs(p.y-(b.y-b.height/2-22))<37&&Math.abs(p.vy)<120);
   if(!grounded&&w.supporting[seat]===null)return fail('invalid');
  }
  if(kind==='doubleJump'&&(this.lastJump[0]===0||now-this.lastJump[0]<110||now-this.lastJump[0]>1650||this.doubled||p.y>this.firstJumpY+12||p.vy>420))return fail('invalid');
  if((kind==='shoot'&&now-this.lastSkill[1]<VITALS.SHOT_COOLDOWN_MS)||
     (kind==='dash'&&now-this.lastSkill[2]<VITALS.DASH_COOLDOWN_MS))return fail('cooldown');
  if(!spendVital(w,seat,kind,now))return fail('tired');
  if(kind==='jump'){this.lastJump[seat]=now;if(seat===0){this.firstJumpY=p.y;this.doubled=false;}}
  else if(kind==='doubleJump')this.doubled=true;
  else {this.lastSkill[seat]=now;this.interact(seat,kind,poses,now,facing);}
  return {ok:true,reason:'ok'};
 }
 tickResources(poses:Pose[],now=Date.now()):boolean{
  const dt=Math.max(0,Math.min(100,now-this.resourceAt));this.resourceAt=now;
  return this.world.deadUntil===0&&this.world.blackoutUntil<=now&&!this.world.completed&&regenVitals(this.world,poses,now,dt);
 }
 /** Returns new poses only for authoritative team respawn. */
 tick(poses:Pose[],now=Date.now(),protectedUntil=0):{changed:boolean;poses?:Pose[];reset?:boolean;won?:boolean}{
  const w=this.world;
  reconcileTreeSupports(poses,w.supporting);
  if(w.deadUntil){if(now<w.deadUntil)return {changed:false};this.reset(now);return {changed:true,poses:TREE_START.map(p=>({...p})),reset:true};}
  if(w.completed)return {changed:false,won:true};
  if(w.blackoutUntil){
   if(now<w.blackoutUntil){
    const nextPoses=this.carried(poses,
      (now-(w.blackoutUntil-TREE_BLACKOUT))/TREE_BLACKOUT);
    return {changed:false,poses:this.shiftRiders.length?nextPoses:undefined};
   }
   poses=this.carried(poses,1);
   w.blackoutUntil=0;w.layout=((w.layout+1)%3) as TreeLayout;w.cycle++;w.cycleStart=now;
   w.windPhase='calm';w.windUntil=0;w.supporting=[null,null,null];
   // Never punish anyone for the world removing a branch mid-jump.
   const active=treePlatforms(w);
   const adjusted=poses.map(p=>{
    const standing=active.some(b=>Math.abs(p.x-b.x)<b.width/2-8
      &&Math.abs(p.y-(b.y-b.height/2-22))<38);
    if(standing)return {...p};
    const nearby=active.filter(b=>Math.abs(p.x-b.x)<170
      &&Math.abs(p.y-(b.y-b.height/2-22))<230)
      .sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)-
        Math.abs(b.x-p.x)-Math.abs(b.y-p.y))[0];
    if(!nearby)return {...TREE_START[p.seat]};
    return {seat:p.seat,x:Math.max(nearby.x-nearby.width/2+20,
      Math.min(nearby.x+nearby.width/2-20,p.x)),
      y:nearby.y-nearby.height/2-22,vx:0,vy:0};
   });
   this.shiftRiders=[];
   return {changed:true,poses:adjusted};
  }
  if(now-w.cycleStart>=TREE_CYCLE){
   const previous=TREE_PLATFORMS.filter(p=>p.state===w.layout);
   const upcoming=TREE_PLATFORMS.filter(p=>p.state===((w.layout+1)%3));
   this.shiftRiders=[];
   for(const pose of poses){
    if(w.supporting[pose.seat]!==null)continue;
    const old=previous.find(p=>Math.abs(p.x-pose.x)<p.width/2-10&&
      Math.abs(pose.y-(p.y-p.height/2-22))<19&&Math.abs(pose.vy)<130);
    if(!old)continue;
    const target=[...upcoming].sort((a,b)=>
      Math.abs(a.x-old.x)+Math.abs(a.y-old.y)-
      Math.abs(b.x-old.x)-Math.abs(b.y-old.y))[0];
    if(!target)continue;
    this.shiftRiders.push({seat:pose.seat,fromX:pose.x,fromY:pose.y,
      toX:target.x+Math.max(-target.width/2+28,Math.min(target.width/2-28,pose.x-old.x)),
      toY:target.y-target.height/2-22});
   }
   w.blackoutUntil=now+TREE_BLACKOUT;w.windPhase='calm';w.windUntil=0;
   return {changed:true};
  }
  // Each of the three optional branches cracks only AFTER a character
  // stands on it. Host timestamps are shared with all WebRTC guests.
  let fragileChanged=false;
  for(const [slot,index] of FRAGILE_BRANCH_INDICES.entries()){
   const branch=TREE_PLATFORMS[index];
   const last=w.fragileAt[slot];
   if(last>0&&now-last<8800)continue;
   const landed=poses.some(p=>w.supporting[p.seat]===null&&
     Math.abs(p.x-branch.x)<branch.width/2-15&&
     Math.abs(p.y-(branch.y-branch.height/2-22))<=11&&
     Math.abs(p.vy)<105);
   if(landed){w.fragileAt[slot]=now;fragileChanged=true;}
  }
  if(poses.some(p=>treeFatal(p,now,w,protectedUntil))){
   w.deathByGust=w.windPhase==='gust';w.deadUntil=now+1500;w.health=[0,0,0];
   return {changed:true};
  }
  if(w.finalOpen&&exitPresence(3,poses,w.health).ready){
   w.completed=true;return {changed:true,won:true};
  }
  const wind=treeWindSchedule(w,now);
  if(w.windPhase!==wind.phase||w.windDirection!==wind.direction||w.windUntil!==wind.until){
   const startedGust=w.windPhase!=='gust'&&wind.phase==='gust';
   w.windPhase=wind.phase;w.windDirection=wind.direction;w.windUntil=wind.until;
   if(startedGust)w.gustCount++;
   return {changed:true};
  }
  return {changed:fragileChanged};
 }
 /** All puzzle actions use the host's validated positions and actual skill events. */
 interact(seat:Seat,kind:'lever'|'switch'|'shoot'|'support'|'detach'|'dash',
  poses:Pose[],now=Date.now(),facing:-1|1=1):boolean{
  const w=this.world;
  reconcileTreeSupports(poses,w.supporting);
  const p=poses[seat];
  if(!p||w.deadUntil||w.blackoutUntil>now||w.completed)return false;
  const windy=w.windPhase==='gust'&&treeExposure(p)>.35;
  if(kind==='dash'&&seat===2){w.dashAt=now;w.dashX=p.x;return true;}
  if(kind==='support'&&(seat===0||seat===1)){
   const base:Seat=seat===0?1:2,b=poses[base];
   if(!b||w.supporting[seat]!==null||!close(p,b.x,b.y,65,86)
    ||!treeTowerNearBase(p)
    ||!w.bridgeOpen||w.ropeOpen)return false;
   if(seat===0&&w.supporting[1]!==2)return false;
   w.supporting[seat]=base;
   if(seat===1)w.tower[1]=true;else w.tower[0]=true;
   reconcileTreeSupports(poses,w.supporting);
   return true;
  }
  if(kind==='detach'&&w.supporting[seat]!==null){
   w.supporting[seat]=null;
   if(seat===1)w.supporting[0]=null;
   return true;
  }
  let changed=false;
  const shot=(target:{x:number;y:number})=>seat===1&&kind==='shoot'
   &&!windy&&(target.x-p.x)*facing>=0&&(target.x-p.x)*facing<=360
   &&Math.abs(p.y-18-target.y)<56;
  if(!w.bridgeOpen){
   // Nino's bridge switch requires only E; dash is a separate optional ability.
   if(seat===2&&kind==='switch'&&!w.bridge[2]
     &&close(p,TREE_TARGETS.bridge.nino.x,TREE_TARGETS.bridge.nino.y,62,75))
     changed=w.bridge[2]=true;
   if(!w.bridge[1]&&shot(TREE_TARGETS.bridge.lia))changed=w.bridge[1]=true;
   if(seat===0&&kind==='lever'&&!windy
     &&close(p,TREE_TARGETS.bridge.teo.x,TREE_TARGETS.bridge.teo.y,48,16)
     &&Math.abs(p.vy)<115)changed=w.bridge[0]=true;
   if(w.bridge.every(Boolean))w.bridgeOpen=true;
  }else if(!w.ropeOpen){
   // Téo can reach the upper rope via the two branches and double jump.
   // Human stacking stays optional, never a hidden prerequisite for this puzzle.
   if(seat===0&&kind==='lever'&&w.supporting[0]===null&&!windy
     &&treeTowerNearTop(p)&&Math.abs(p.vy)<170){
    changed=!w.tower[2];w.tower[2]=true;w.ropeOpen=true;
   }
  }else if(!w.finalOpen){
   // Final three mechanisms can be activated in EVERY forest state; the
   // 60-second shifts remain dangerous, not invisible interaction locks.
   // Lia's short-range shot recognizes a target even when standing beside it.
   const lia=TREE_TARGETS.time.lia;
   if(seat===1&&kind==='shoot'&&!w.time[1]&&
     Math.abs(p.x-lia.x)<=185&&Math.abs(p.y-18-lia.y)<=83&&
     (Math.abs(p.x-lia.x)<=85||(lia.x-p.x)*facing>=0))
    changed=w.time[1]=true;
   if(seat===0&&kind==='lever'&&!w.time[0]
     &&close(p,TREE_TARGETS.time.teo.x,TREE_TARGETS.time.teo.y,82,70)
     &&Math.abs(p.vy)<210)changed=w.time[0]=true;
   // Nino's final Galhos do Tempo circle uses E alone. Dash is optional.
   // Host validates the correct character and proximity, in every layout.
   if(seat===2&&kind==='switch'&&!w.time[2]
     &&close(p,TREE_TARGETS.time.nino.x,TREE_TARGETS.time.nino.y,105,95))
    changed=w.time[2]=true;
   if(w.time.every(Boolean))w.finalOpen=true;
  }
  return changed;
 }
}
