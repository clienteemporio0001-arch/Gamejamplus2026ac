import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';
import { applyDamage, allAlive, type Hearts, type SafeTimes } from './survival';
import { SOLO_TIMING } from './soloRules';

/** Segunda fase extensa; a autoridade vive apenas na instância do anfitrião. */
export const RIVER_WIDTH = 4300;
export const JOURNEY_SPAWNS: Pose[] = ([0,1,2] as Seat[]).map(seat=>({
  seat,x:108+seat*48,y:592,vx:0,vy:0
}));
export const JOURNEY_CHECKPOINTS=[112,1120,2120,2780,3430] as const;
export const MATERIALS=[
  {x:1420,y:339,seat:0},
  {x:1580,y:573,seat:1},
  {x:2015,y:585,seat:2}
] as const;
export const JOURNEY={
  anchor:{x:2155,y:451},
  counterweight:{x:2475,y:581},
  timer:{x:2260,y:596},
  farFix:{x:2740,y:591},
  plate:{x:3575,y:593},
  finalTarget:{x:3790,y:575},
  finalLever:{x:3840,y:445},
  exit:{x:4190,y:594},
} as const;
export type JourneyWorld={
  materials:[boolean,boolean,boolean];
  supporting:[Seat|null,Seat|null,Seat|null];
  stackMilestone:boolean;
  anchor:boolean;
  counterweight:boolean;
  tempUntil:number;
  farFix:boolean;
  bridgeFallAt:number;
  bridgeReady:boolean;
  pressure:boolean;
  finalShotUntil:number;
  finalFallAt:number;
  finalReady:boolean;
  checkpoint:0|1|2|3|4;
  health:Hearts;
  safeUntil:SafeTimes;
  restartAt:number;
  resetId:number;
  hazardEpoch:number;
};
export type JourneyMotion={logs:[number,number];now:number};
const numeric=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const between=(v:number,lo:number,hi:number):boolean=>v>=lo&&v<=hi;
const near=(p:Pose,x:number,y:number,dx=60,dy=80):boolean=>
  Math.abs(p.x-x)<=dx&&Math.abs(p.y-y)<=dy;
export function initialJourney(now=Date.now()):JourneyWorld {
  return {materials:[false,false,false],supporting:[null,null,null],stackMilestone:false,
    anchor:false,counterweight:false,tempUntil:0,farFix:false,
    bridgeFallAt:0,bridgeReady:false,pressure:false,finalShotUntil:0,
    finalFallAt:0,finalReady:false,checkpoint:0,
    health:[3,3,3],safeUntil:[0,0,0],restartAt:0,resetId:0,hazardEpoch:now};
}
export function validJourney(value:unknown):value is JourneyWorld {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const w=value as Record<string,unknown>;
  const tri=(x:unknown):x is unknown[]=>Array.isArray(x)&&x.length===3;
  return tri(w.materials)&&w.materials.every(x=>typeof x==='boolean')
    &&tri(w.supporting)&&w.supporting.every((x:unknown,i:number)=>
      x===null||(i===0&&x===1)||(i===1&&x===2))
    &&tri(w.health)&&w.health.every((x:unknown)=>Number.isInteger(x)&&between(x as number,0,3))
    &&tri(w.safeUntil)&&w.safeUntil.every(numeric)
    &&['stackMilestone','anchor','counterweight','farFix','bridgeReady','pressure','finalReady'].every(k=>typeof w[k]==='boolean')
    &&['tempUntil','bridgeFallAt','finalShotUntil','finalFallAt','restartAt','hazardEpoch'].every(k=>numeric(w[k]))
    &&Number.isInteger(w.resetId)&&(w.resetId as number)>=0
    &&Number.isInteger(w.checkpoint)&&between(w.checkpoint as number,0,4);
}
/** Troncos com posição determinística a partir do relógio do host. */
export function floatingLogs(now:number,epoch:number):[number,number] {
  const t=Math.max(0,now-epoch);
  return [3086+Math.sin(t/840)*37,3224+Math.sin(t/990+1.1)*31];
}
export function validMotion(value:unknown):value is JourneyMotion {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const m=value as Record<string,unknown>;
  return numeric(m.now) && Array.isArray(m.logs)&&m.logs.length===2
    &&typeof m.logs[0]==='number'&&between(m.logs[0],3045,3125)
    &&typeof m.logs[1]==='number'&&between(m.logs[1],3188,3258);
}
export type RiverDanger='snake'|'branch'|null;
export function journeyDanger(p:Pose,epoch:number,now:number):RiverDanger {
  if(p.y<542)return null;
  if([760,3450].some(x=>Math.abs(p.x-x)<34))return 'snake';
  const phase=Math.max(0,now-epoch)%5600;
  return phase>=3720&&phase<4580&&Math.abs(p.x-3380)<48?'branch':null;
}
export function journeyBranchPhase(epoch:number,now:number):'safe'|'warn'|'fall'{
  const phase=Math.max(0,now-epoch)%5600;
  return phase>=2800&&phase<3720?'warn':phase>=3720&&phase<4580?'fall':'safe';
}
/** Modelo de alcance fundamentado nos valores reais do Arcade Body Phaser. */
export const PHYSICS={speed:235,dash:329,dashSeconds:.8,jump:465,gravity:850,playerHalfHeight:22} as const;
export function jumpRise():number {
  return PHYSICS.jump*PHYSICS.jump/(2*PHYSICS.gravity);
}
export function jumpRange(speed=PHYSICS.speed):number {
  return speed*(2*PHYSICS.jump/PHYSICS.gravity);
}
export function isGapJumpFeasible(gap:number,runup=0):boolean {
  return gap<=jumpRange()+runup;
}

export class JourneyAuthority {
  solo=false;
  world:JourneyWorld=initialJourney();
  private lastShot=0;
  private lastDash=0;
  private materialDashFrom=0;private materialDashAt=0;
  private bridgeDashFrom=0;private bridgeDashAt=0;
  reset(now=Date.now()):void {
    const id=this.world.resetId+1;
    this.world=initialJourney(now);
    this.world.resetId=id;
    this.lastShot=0;this.lastDash=0;
    this.materialDashAt=0;this.materialDashFrom=0;
    this.bridgeDashAt=0;this.bridgeDashFrom=0;
  }
  act(seat:Seat,action:PuzzleAction,poses:Pose[],unlocked:readonly boolean[],now=Date.now()):boolean {
    const p=poses[seat],w=this.world;
    if(!p||p.seat!==seat||!unlocked[seat]||w.restartAt>0)return false;
    if(action.kind==='support'){
      if(!between(p.x,970,1450)||w.supporting[seat]!==null)return false;
      const base=seat===0?1:seat===1?2:null;
      if(base===null)return false;
      const other=poses[base];
      if(!near(p,other.x,other.y,47,56)||Math.abs(p.vx)>120||Math.abs(other.vx)>120)return false;
      if(seat===0&&w.supporting[1]!==2)return false;
      w.supporting[seat]=base;
      if(w.supporting[0]===1&&w.supporting[1]===2)w.stackMilestone=true;
      return true;
    }
    if(action.kind==='detach'){
      if(w.supporting[seat]===null)return false;
      w.supporting[seat]=null;
      if(seat===1)w.supporting[0]=null;
      return true;
    }
    if(action.kind==='dash'){
      if(seat!==2||now-this.lastDash<1850)return false;
      this.lastDash=now;
      if(between(p.x,1740,1870)){this.materialDashFrom=p.x;this.materialDashAt=now;}
      if(w.anchor&&w.counterweight&&between(p.x,2240,2430)){
        this.bridgeDashFrom=p.x;this.bridgeDashAt=now;
      }
      return false; // Apenas registra a arrancada; efeitos P2P trafegam separadamente.
    }
    if(action.kind==='collect'){
      if(seat===0&&!w.materials[0]&&w.stackMilestone
        &&near(p,MATERIALS[0].x,MATERIALS[0].y,67,74)){
        w.materials[0]=true;return true;
      }
      if(seat===2&&!w.materials[2]&&near(p,MATERIALS[2].x,MATERIALS[2].y,52,83)
        &&this.materialDashAt>0&&now-this.materialDashAt<1250
        &&p.x-this.materialDashFrom>=135){
        w.materials[2]=true;return true;
      }
      return false;
    }
    if(action.kind==='shoot'&&seat===1&&action.facing===1&&now-this.lastShot>=480) {
      this.lastShot=now;
      const hit=(x:number,y:number,range=340)=>
        x>p.x&&x-p.x<=range&&Math.abs(p.y-18-y)<=58;
      if(!w.materials[1]&&hit(MATERIALS[1].x,MATERIALS[1].y)){
        w.materials[1]=true;return true;
      }
      if(w.anchor&&!w.counterweight&&w.materials.every(Boolean)&&hit(JOURNEY.counterweight.x,JOURNEY.counterweight.y)){
        w.counterweight=true;return true;
      }
      if(w.bridgeReady&&w.pressure&&!w.finalReady&&hit(JOURNEY.finalTarget.x,JOURNEY.finalTarget.y)){
        w.finalShotUntil=now+(this.solo?SOLO_TIMING.riverFinalShot:6800);return true;
      }
      return false;
    }
    if(action.kind==='lever'&&seat===0){
      if(w.materials.every(Boolean)&&!w.anchor
        &&near(p,JOURNEY.anchor.x,JOURNEY.anchor.y,63,80)){
        w.anchor=true;return true;
      }
      if(w.bridgeReady&&w.pressure&&w.finalShotUntil>now&&!w.finalFallAt
        &&near(p,JOURNEY.finalLever.x,JOURNEY.finalLever.y,65,79)){
        w.finalFallAt=now;return true;
      }
      return false;
    }
    if(action.kind==='timer'&&seat===2&&w.anchor&&w.counterweight&&!w.farFix
      &&near(p,JOURNEY.timer.x,JOURNEY.timer.y,60,74)&&w.tempUntil<=now){
      w.tempUntil=now+(this.solo?SOLO_TIMING.riverTemporary:9000);
      this.bridgeDashAt=0;this.bridgeDashFrom=0;
      return true;
    }
    if(action.kind==='switch'&&seat===2&&w.anchor&&w.counterweight&&!w.farFix
      &&w.tempUntil>now&&near(p,JOURNEY.farFix.x,JOURNEY.farFix.y,54,80)
      &&this.bridgeDashAt>=w.tempUntil-(this.solo?SOLO_TIMING.riverTemporary:9000)&&this.bridgeDashAt<now
      &&p.x-this.bridgeDashFrom>=240){
      w.farFix=true;w.tempUntil=0;w.bridgeFallAt=now;return true;
    }
    return false;
  }
  tick(poses:Pose[],now=Date.now()):{changed:boolean;reset:boolean}{
    const w=this.world;let changed=false;
    if(w.restartAt>0){
      if(now<w.restartAt)return{changed:false,reset:false};
      this.reset(now);return{changed:true,reset:true};
    }
    for(const seat of [1,0] as Seat[]){
      const base=w.supporting[seat];
      if(base===null)continue;
      const parent=poses[base],p=poses[seat];
      p.x=parent.x;p.y=Math.max(32,parent.y-44);p.vx=parent.vx;p.vy=0;
    }
    if(w.tempUntil>0&&now>=w.tempUntil){w.tempUntil=0;changed=true;}
    if(w.finalShotUntil>0&&now>=w.finalShotUntil){w.finalShotUntil=0;changed=true;}
    if(w.bridgeFallAt>0&&!w.bridgeReady&&now-w.bridgeFallAt>=2100){
      w.bridgeReady=true;changed=true;
    }
    if(w.finalFallAt>0&&!w.finalReady&&now-w.finalFallAt>=1800){
      w.finalReady=true;changed=true;
    }
    const pressure=w.bridgeReady&&!w.finalReady&&near(poses[2],JOURNEY.plate.x,JOURNEY.plate.y,44,74);
    if(pressure!==w.pressure){
      w.pressure=pressure;changed=true;
      if(!pressure&&w.finalShotUntil>0)w.finalShotUntil=0;
    }
    const cps=[1080,2070,2800,3390];
    for(let i=cps.length-1;i>=0;i--){
      if(w.checkpoint<i+1 && poses.every(p=>p.x>=cps[i])
        && (i<2 || w.bridgeReady)){
        w.checkpoint=(i+1) as JourneyWorld['checkpoint'];changed=true;break;
      }
    }
    return{changed,reset:false};
  }
  damage(seat:Seat,now=Date.now(),fatal=false):boolean {
    const hit=applyDamage(this.world,seat,now,fatal);
    if(hit&&this.world.restartAt>0)this.world.supporting=[null,null,null];
    return hit;
  }
  hasWon(poses:Pose[]):boolean {
    const w=this.world;
    return w.materials.every(Boolean)&&w.stackMilestone&&w.anchor&&w.counterweight&&w.farFix
      &&w.bridgeReady&&w.finalReady&&allAlive(w)
      &&poses.every(p=>p.x>=4120&&p.x<=RIVER_WIDTH&&p.y>=515&&p.y<=670);
  }
}
