import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';
export type LateLevel = 3 | 4;
export type Jaguar = { x: number; y: number; mode: 'patrol' | 'chase' | 'distracted'; facing: -1 | 1; target: Seat | null };
export type EyesWorld = {
  level: 3; roots: boolean; distractedUntil: number; timerUntil: number;
  passage: boolean; pressure: boolean; shotUntil: number; finalGate: boolean;
  checkpoint: 0 | 1 | 2;
};
export type TrailWorld = {
  level: 4; totems: 0 | 1 | 2 | 3; errors: number;
  transformed: boolean; signsChanged: boolean; platformsOn: boolean; nextFlipAt: number;
  pressure: boolean; shotUntil: number; finalGate: boolean; checkpoint: 0 | 1 | 2;
};
export type ChapterWorld = EyesWorld | TrailWorld;
export const EYES = {
  lever: { x: 318, y: 386 },
  distraction: { x: 658, y: 565 },
  timer: { x: 696, y: 597 },
  switch: { x: 939, y: 598 },
  plate: { x: 953, y: 603 },
  finalTarget: { x: 1048, y: 572 },
  finalSwitch: { x: 1090, y: 595 },
} as const;
export const TRAIL = {
  moon: { x: 329, y: 388 },
  leaf: { x: 617, y: 572 },
  star: { x: 837, y: 591 },
  plate: { x: 929, y: 603 },
  movingTargetMin: 1002, movingTargetMax: 1078, movingTargetY: 571,
  finalSwitch: { x: 1108, y: 596 },
} as const;
export const LATE_SPAWNS: Pose[] = [0,1,2].map((seat) => ({
  seat: seat as Seat, x: 86 + seat * 48, y: 594, vx: 0, vy: 0,
}));
export const LATE_CHECKPOINTS = [96, 570, 895] as const;
export const PATROL_LEFT = 595, PATROL_RIGHT = 853, JAGUAR_Y = 596;
const available = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
const near = (p: Pose, x: number, y: number, dx = 55, dy = 78): boolean =>
  Math.abs(p.x - x) <= dx && Math.abs(p.y - y) <= dy;
export const initialEyes = (): EyesWorld => ({
  level:3, roots:false, distractedUntil:0, timerUntil:0, passage:false,
  pressure:false, shotUntil:0, finalGate:false, checkpoint:0
});
export const initialTrail = (): TrailWorld => ({
  level:4, totems:0, errors:0, transformed:false, signsChanged:false,
  platformsOn:true, nextFlipAt:0, pressure:false, shotUntil:0, finalGate:false, checkpoint:0
});
export const defaultJaguar = (): Jaguar => ({x: PATROL_LEFT, y: JAGUAR_Y, mode:'patrol', facing:1, target:null});
export function validChapter(value: unknown): value is ChapterWorld {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const w=value as Record<string, unknown>;
  if (![0,1,2].includes(w.checkpoint as number)) return false;
  if (w.level===3) return ['roots','passage','pressure','finalGate'].every(k=>bool(w[k]))
    && ['distractedUntil','timerUntil','shotUntil'].every(k=>available(w[k]));
  if (w.level===4) return ['transformed','signsChanged','platformsOn','pressure','finalGate'].every(k=>bool(w[k]))
    && Number.isInteger(w.totems) && (w.totems as number)>=0 && (w.totems as number)<=3
    && Number.isInteger(w.errors) && (w.errors as number)>=0 && (w.errors as number)<=100000
    && ['nextFlipAt','shotUntil'].every(k=>available(w[k]));
  return false;
}
export function validJaguar(value: unknown): value is Jaguar {
  if(!value || typeof value!=='object' || Array.isArray(value)) return false;
  const j=value as Record<string,unknown>;
  return available(j.x) && (j.x as number)<=1200 && available(j.y) && (j.y as number)<=700
    && ['patrol','chase','distracted'].includes(String(j.mode))
    && (j.facing===1 || j.facing===-1)
    && (j.target===null || j.target===0 || j.target===1 || j.target===2);
}
export function movingTarget(now: number): {x:number;y:number} {
  // Posição determinística: todos os aparelhos recebem o mesmo tempo-base do host.
  return {x: 1040 + Math.sin(now/650)*38, y: TRAIL.movingTargetY};
}
export class ChapterAuthority {
  world: ChapterWorld;
  jaguar=defaultJaguar();
  private lastTick=0;
  private lastShot=0;
  private lastDash=0;
  private dashAt=0;
  private dashX=0;
  private lateDashAt=0;
  private lateDashX=0;
  private invulnerable=[0,0,0];
  constructor(level:LateLevel){this.world=level===3?initialEyes():initialTrail();}
  reset(level:LateLevel):void {
    this.world=level===3?initialEyes():initialTrail();this.jaguar=defaultJaguar();
    this.lastTick=0;this.lastShot=0;this.lastDash=0;this.dashAt=0;this.dashX=0;
    this.lateDashAt=0;this.lateDashX=0;this.invulnerable=[0,0,0];
  }
  act(seat:Seat,a:PuzzleAction,poses:Pose[],unlocked:readonly boolean[],now=Date.now()):boolean {
    const p=poses[seat];
    if(!p || p.seat!==seat || !unlocked[seat])return false;
    const w=this.world;
    if(a.kind==='dash'){
      if(seat!==2 || now-this.lastDash<1900)return false;
      this.lastDash=now;
      if(w.level===3 && w.roots && p.x>=645 && p.x<=780){this.dashAt=now;this.dashX=p.x;}
      if(w.level===4 && w.totems===2 && p.x>=670 && p.x<=765){this.dashAt=now;this.dashX=p.x;}
      if((w.level===3 || w.level===4) && p.x>=880 && p.x<=1040){
        this.lateDashAt=now;this.lateDashX=p.x;
      }
      return false;
    }
    if(w.level===3){
      if(a.kind==='lever' && seat===0 && !w.roots && near(p,EYES.lever.x,EYES.lever.y,62,63)){
        w.roots=true;return true;
      }
      if(a.kind==='shoot' && seat===1 && a.facing===1 && now-this.lastShot>=470){
        this.lastShot=now;
        const hit=(x:number,y:number)=> x>p.x && x-p.x<=345 && Math.abs(p.y-18-y)<=57;
        if(w.roots && hit(EYES.distraction.x,EYES.distraction.y)){
          w.distractedUntil=now+6700;return true;
        }
        if(w.passage && w.pressure && !w.finalGate && hit(EYES.finalTarget.x,EYES.finalTarget.y)){
          w.shotUntil=now+5000;return true;
        }
      }
      if(a.kind==='timer' && seat===2 && w.roots && !w.passage && near(p,EYES.timer.x,EYES.timer.y,53,70)){
        if(w.timerUntil>now)return false;
        w.timerUntil=now+3900;this.dashAt=0;return true;
      }
      if(a.kind==='switch' && seat===2){
        if(!w.passage && w.timerUntil>now && near(p,EYES.switch.x,EYES.switch.y,52,74)
          && this.dashAt>=w.timerUntil-3900 && this.dashAt<=now
          && this.dashX<780 && p.x-this.dashX>=160){
          w.passage=true;w.timerUntil=0;return true;
        }
        if(w.passage && w.pressure && w.shotUntil>now && !w.finalGate
          && near(p,EYES.finalSwitch.x,EYES.finalSwitch.y,50,74)
          && this.lateDashAt>0 && now-this.lateDashAt<=2000
          && p.x-this.lateDashX>=55){
          w.finalGate=true;w.shotUntil=0;return true;
        }
      }
      return false;
    }
    if(a.kind==='lever' && seat===0 && near(p,TRAIL.moon.x,TRAIL.moon.y,60,70)) {
      if(w.totems!==0){this.wrongTotem();return true;}
      w.totems=1;w.signsChanged=true;return true;
    }
    if(a.kind==='shoot' && seat===1 && a.facing===1 && now-this.lastShot>=470) {
      this.lastShot=now;
      const hit=(x:number,y:number)=>x>p.x && x-p.x<=340 && Math.abs(p.y-18-y)<=55;
      if(!w.finalGate && w.totems<3 && hit(TRAIL.leaf.x,TRAIL.leaf.y)){
        if(w.totems===1)w.totems=2;else this.wrongTotem();
        return true;
      }
      const target=movingTarget(now);
      if(w.transformed && w.pressure && !w.finalGate && hit(target.x,target.y)){
        w.shotUntil=now+5000;return true;
      }
    }
    if(a.kind==='switch' && seat===2 && !w.finalGate){
      if(w.totems<3 && near(p,TRAIL.star.x,TRAIL.star.y,50,77)){
        if(w.totems===2 && this.dashAt>0 && now-this.dashAt<2100 && p.x-this.dashX>=75){
          w.totems=3;w.transformed=true;w.signsChanged=true;w.nextFlipAt=now+2000;
        }else this.wrongTotem();
        return true;
      }
      if(w.transformed && w.pressure && w.shotUntil>now
        && near(p,TRAIL.finalSwitch.x,TRAIL.finalSwitch.y,47,77)
        && this.lateDashAt>0 && now-this.lateDashAt<=2000
        && p.x-this.lateDashX>=65){
        w.finalGate=true;w.platformsOn=true;w.shotUntil=0;return true;
      }
    }
    return false;
  }
  private wrongTotem():void {
    if(this.world.level!==4)return;
    this.world.totems=0;
    this.world.errors=Math.min(100000,this.world.errors+1);
  }
  tick(poses:Pose[],now=Date.now()):{changed:boolean;hits:Seat[];hazardChanged:boolean} {
    const w=this.world;let changed=false;
    const hits:Seat[]=[];
    if(w.level===3){
      const dt=this.lastTick?Math.max(0,Math.min(120,now-this.lastTick)):50;
      this.lastTick=now;
      const prev=this.jaguar.x,prevMode=this.jaguar.mode;
      if(w.distractedUntil>now){
        this.jaguar.mode='distracted';this.jaguar.target=null;
        this.jaguar.x=Math.min(PATROL_RIGHT,Math.max(PATROL_LEFT,this.jaguar.x-0.19*dt));
      }else{
        const visible=poses.find(p=>p.x>540 && p.x<940 && Math.abs(p.x-this.jaguar.x)<145 && Math.abs(p.y-JAGUAR_Y)<83);
        if(visible){this.jaguar.mode='chase';this.jaguar.target=visible.seat;}
        else {this.jaguar.mode='patrol';this.jaguar.target=null;}
        if(this.jaguar.mode==='chase' && visible){
          this.jaguar.facing=visible.x>=this.jaguar.x?1:-1;
          this.jaguar.x+=this.jaguar.facing*0.22*dt;
        }else{
          if(this.jaguar.x>=PATROL_RIGHT)this.jaguar.facing=-1;
          if(this.jaguar.x<=PATROL_LEFT)this.jaguar.facing=1;
          this.jaguar.x+=this.jaguar.facing*0.115*dt;
        }
        this.jaguar.x=Math.max(PATROL_LEFT,Math.min(PATROL_RIGHT,this.jaguar.x));
        for(const pose of poses){
          if(now>=this.invulnerable[pose.seat] && Math.abs(pose.x-this.jaguar.x)<36 &&
            Math.abs(pose.y-JAGUAR_Y)<62) {
            hits.push(pose.seat);this.invulnerable[pose.seat]=now+2500;
          }
        }
      }
      if(w.timerUntil!==0 && w.timerUntil<=now){w.timerUntil=0;changed=true;}
      if(w.distractedUntil!==0 && w.distractedUntil<=now){w.distractedUntil=0;changed=true;}
      if(w.shotUntil!==0 && w.shotUntil<=now){w.shotUntil=0;changed=true;}
      const pressure=w.passage && !w.finalGate && near(poses[0],EYES.plate.x,EYES.plate.y,49,75);
      if(pressure!==w.pressure){w.pressure=pressure;changed=true;if(!pressure)w.shotUntil=0;}
      if(w.roots && w.checkpoint<1 && poses.every(p=>p.x>=545)){w.checkpoint=1;changed=true;}
      if(w.passage && w.checkpoint<2 && poses.every(p=>p.x>=885)){w.checkpoint=2;changed=true;}
      return {changed,hits,hazardChanged:Math.abs(this.jaguar.x-prev)>0.5 || prevMode!==this.jaguar.mode};
    }
    const pressure=w.transformed && !w.finalGate && near(poses[0],TRAIL.plate.x,TRAIL.plate.y,46,75);
    if(pressure!==w.pressure){w.pressure=pressure;changed=true;if(!pressure)w.shotUntil=0;}
    if(w.shotUntil!==0 && w.shotUntil<=now){w.shotUntil=0;changed=true;}
    if(w.transformed && !w.finalGate && now>=w.nextFlipAt){
      w.platformsOn=!w.platformsOn;w.nextFlipAt=now+2000;changed=true;
    }
    if(w.totems>=1 && w.checkpoint<1 && poses.every(p=>p.x>=550)){w.checkpoint=1;changed=true;}
    if(w.transformed && w.checkpoint<2 && poses.every(p=>p.x>=890)){w.checkpoint=2;changed=true;}
    return {changed,hits,hazardChanged:false};
  }
  hasWon(poses:Pose[]):boolean {
    return this.world.finalGate && poses.every(p=>p.x>=1140 && p.x<=1200 && p.y>=526 && p.y<=670);
  }
}
