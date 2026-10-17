import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';

export const LOOP_WIDTH = 3800;
export const LOOP_CYCLE_MS = 60000;
export const LOOP_WARNING_MS = 10000;
export const LOOP_BLACKOUT_MS = 2000;
export type Layout = 0|1|2;
export type Route = 'oca'|'pedra';
export const LOOP_START: Pose[] = ([0,1,2] as Seat[]).map(seat=>({seat,x:125+seat*50,y:606,vx:0,vy:0}));
export const LOOP_MARKS=[
  {x:1080,y:480,seat:0,name:'ÁRVORE OCA'},
  {x:1300,y:574,seat:1,name:'PEDRA RACHADA'},
  {x:1500,y:589,seat:2,name:'TRONCO EM ARCO'},
] as const;
export const LOOP_TREE=[
  {x:2130,y:514,seat:0},{x:2310,y:574,seat:1},{x:2242,y:592,seat:2}
] as const;
export const LOOP_FINAL=[
  {x:3320,y:510,seat:0},{x:3470,y:573,seat:1},{x:3595,y:590,seat:2}
] as const;
export const ROUTES:Readonly<Record<Layout,{correct:Route;wrong:Route;barrierX:number;returnTo:number;advanceTo:number}>>={
  0:{correct:'pedra',wrong:'oca',barrierX:1745,returnTo:975,advanceTo:1880},
  1:{correct:'oca',wrong:'pedra',barrierX:1650,returnTo:975,advanceTo:1880},
  2:{correct:'pedra',wrong:'oca',barrierX:520,returnTo:975,advanceTo:1880},
};
export type LoopWorld={
  layout:Layout; cycle:number;cycleStart:number;blackoutUntil:number;observed:boolean;
  marks:[boolean,boolean,boolean];tree:[boolean,boolean,boolean];treeFallAt:number;bridge:boolean;
  supporting:[Seat|null,Seat|null,Seat|null];stackMilestone:boolean;
  final:[boolean,boolean,boolean];exit:boolean;
  lastRoute:'none'|'wrong'|'right'; routeAt:number;routeCount:number;
  deadUntil:number;resetId:number; completed:boolean;
};
const bool3=(value:unknown):value is [boolean,boolean,boolean]=>Array.isArray(value)&&value.length===3&&value.every(x=>typeof x==='boolean');
const nonNegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export const initLoop=(now=Date.now()):LoopWorld=>({
  layout:0,cycle:0,cycleStart:now,blackoutUntil:0,observed:false,
  marks:[false,false,false],tree:[false,false,false],treeFallAt:0,bridge:false,
  supporting:[null,null,null],stackMilestone:false,
  final:[false,false,false],exit:false,lastRoute:'none',routeAt:0,routeCount:0,
  deadUntil:0,resetId:0,completed:false
});
export function validLoop(value:unknown):value is LoopWorld{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const w=value as Record<string,unknown>;
  return (w.layout===0||w.layout===1||w.layout===2)
    &&nonNegative(w.cycle)&&Number.isInteger(w.cycle)
    &&['cycleStart','blackoutUntil','treeFallAt','routeAt','routeCount','deadUntil','resetId'].every(k=>nonNegative(w[k]))
    &&['observed','bridge','exit','completed','stackMilestone'].every(k=>typeof w[k]==='boolean')
    &&Array.isArray(w.supporting)&&w.supporting.length===3
    &&w.supporting.every((b:unknown,i:number)=>b===null||(i===0&&b===1)||(i===1&&b===2))
    &&bool3(w.marks)&&bool3(w.tree)&&bool3(w.final)
    &&['none','wrong','right'].includes(String(w.lastRoute));
}
export const allDone=(items:readonly boolean[])=>items.every(Boolean);
export const blackoutActive=(w:LoopWorld,now:number)=>w.blackoutUntil>0&&now<w.blackoutUntil;
export const warningActive=(w:LoopWorld,now:number)=>w.blackoutUntil===0 && now-w.cycleStart>=LOOP_CYCLE_MS-LOOP_WARNING_MS;
export const near=(pose:Pose,x:number,y:number,dx=64,dy=88)=>
  Math.abs(pose.x-x)<=dx&&Math.abs(pose.y-y)<=dy;
export const safeForRoute=(p:Pose)=>p.y>=555&&p.y<=640&&Math.abs(p.vy)<145&&Math.abs(p.vx)<270;
export function correctRoute(layout:Layout):Route{return ROUTES[layout].correct;}
export function windGuide(w:LoopWorld,seat:Seat,x:number):{direction:-1|0|1;target:number;hint:string}{
  let target=0,hint='';
  if(!w.observed){target=850;hint='OBSERVEM OS MARCOS. O APAGÃO REVELARÁ OUTRA TRILHA.';}
  else if(!allDone(w.marks)){
    target=LOOP_MARKS[w.marks.findIndex(v=>!v)].x- (w.marks.findIndex(v=>!v)===1?190:0);
    hint='LEMBREM-SE DA ÁRVORE OCA, PEDRA RACHADA E TRONCO EM ARCO.';
  }else if(x<1790){
    target=w.layout===1?1540:1700;
    hint='O VENTO INDICA A PASSAGEM '+(correctRoute(w.layout)==='oca'?'DA ÁRVORE OCA.':'DA PEDRA RACHADA.');
  }else if(!w.bridge){
    target=!w.stackMilestone?2050:LOOP_TREE[w.tree.findIndex(v=>!v)]?.x??2110;
    hint=!w.stackMilestone?'APOIO: NINO FICA PARADO, LIA SOBE COM E, TÉO SOBE EM LIA COM E.':
      'TRÊS AMARRAS PRENDEM A ÁRVORE SOBRE O ABISMO.';
  }else if(x<2930){target=2750;hint='A PONTE ESTÁ PRONTA. ATRAVESSEM JUNTOS.';}
  else if(!allDone(w.final)){target=LOOP_FINAL[w.final.findIndex(v=>!v)].x-20;hint='CADA AMIGO DEVE LIBERAR UMA PARTE DA SAÍDA.';}
  else if(w.layout!==2){target=3320;hint='A ÚLTIMA PASSAGEM SÓ RESPONDE À FLORESTA INVERTIDA. AGUARDEM O VENTO MUDAR.';}
  else {target=3710;hint='AGORA! SIGAM O VENTO ATÉ A SAÍDA VERDADEIRA.';}
  return {direction:target>x+38?1:target<x-38?-1:0,target,hint:hint+(seat===0?' • TÉO':seat===1?' • LIA':' • NINO')};
}
export function barriers(w:LoopWorld):ReadonlyArray<{x:number;enabled:boolean}>{
  return [
    {x:1790,enabled:true}, // must enter C through the marked portal, never run around it
    {x:ROUTES[0].barrierX,enabled:w.layout===0},
    {x:ROUTES[1].barrierX,enabled:w.layout===1},
    {x:ROUTES[2].barrierX,enabled:w.layout===2},
    {x:3710,enabled:!w.exit},
  ];
}
export function layoutReachable(w:LoopWorld):boolean{
  const table=ROUTES[w.layout];
  return table.correct!==table.wrong && table.advanceTo>1790 && (w.bridge || !w.exit || allDone(w.tree));
}
type Tick={changed:boolean;poses?:Pose[];reset?:boolean;won?:boolean};
export class LoopAuthority{
  world=initLoop();
  private lastShot=[0,0,0];private lastDash=[0,0,0];
  private dashOrigin=[0,0,0]; private lastSwitch=[0,0,0];
  reset(now=Date.now()):void{
    const id=this.world.resetId+1;
    this.world=initLoop(now);this.world.resetId=id;
    this.lastShot=[0,0,0];this.lastDash=[0,0,0];this.dashOrigin=[0,0,0];
    this.lastSwitch=[0,0,0];
  }
  /** Puzzle progress is never discarded by landscape shifts. */
  act(seat:Seat,action:PuzzleAction,poses:Pose[],now=Date.now()):boolean{
    const w=this.world,p=poses[seat];
    if(!p||p.seat!==seat||w.completed||w.deadUntil>0||blackoutActive(w,now))return false;
    if(action.kind==='support'&&(seat===0||seat===1)&&w.supporting[seat]===null){
      const base:Seat=seat===0?1:2,other=poses[base];
      if(!other||p.x<1950||p.x>2230||Math.abs(p.x-other.x)>55
        ||Math.abs(p.y-other.y)>75||Math.abs(p.vx)>135||Math.abs(other.vx)>135)return false;
      if(seat===0&&w.supporting[1]!==2)return false;
      w.supporting[seat]=base;
      if(w.supporting[0]===1&&w.supporting[1]===2)w.stackMilestone=true;
      return true;
    }
    if(action.kind==='detach'&&w.supporting[seat]!==null){
      w.supporting[seat]=null;
      if(seat===1)w.supporting[0]=null;
      return true;
    }
    if(action.kind==='dash'&&seat===2){
      if(now-this.lastDash[2]<1750)return false;
      this.lastDash[2]=now;this.dashOrigin[2]=p.x;return false;
    }
    if(action.kind==='shoot'&&seat===1){
      if(now-this.lastShot[1]<490||action.facing!==1)return false;
      this.lastShot[1]=now;
      const shoot=(target:{x:number;y:number})=>target.x>p.x&&target.x-p.x<=365&&Math.abs(p.y-18-target.y)<=65;
      if(w.observed&&!w.marks[1]&&shoot(LOOP_MARKS[1])){w.marks[1]=true;return true;}
      if(allDone(w.marks)&&!w.tree[1]&&shoot(LOOP_TREE[1])){w.tree[1]=true;this.checkTree(now);return true;}
      if(w.bridge&&!w.final[1]&&shoot(LOOP_FINAL[1])){w.final[1]=true;this.checkExit();return true;}
      return false;
    }
    if(action.kind==='lever'&&seat===0){
      if(w.observed&&!w.marks[0]&&near(p,LOOP_MARKS[0].x,LOOP_MARKS[0].y,68,87)){
        w.marks[0]=true;return true;
      }
      if(w.stackMilestone&&allDone(w.marks)&&!w.tree[0]&&near(p,LOOP_TREE[0].x,LOOP_TREE[0].y,70,78)){
        w.tree[0]=true;this.checkTree(now);return true;
      }
      if(w.bridge&&!w.final[0]&&near(p,LOOP_FINAL[0].x,LOOP_FINAL[0].y,70,81)){
        w.final[0]=true;this.checkExit();return true;
      }
    }
    if(action.kind==='switch'&&seat===2 && this.lastDash[2]>0
      &&now-this.lastDash[2] <= 3000 &&p.x-this.dashOrigin[2]>=105){
      if(w.observed&&!w.marks[2]&&near(p,LOOP_MARKS[2].x,LOOP_MARKS[2].y,67,85)){
        w.marks[2]=true;this.lastSwitch[2]=now;return true;
      }
      if(allDone(w.marks)&&!w.tree[2]&&near(p,LOOP_TREE[2].x,LOOP_TREE[2].y,65,85)){
        w.tree[2]=true;this.checkTree(now);this.lastSwitch[2]=now;return true;
      }
      if(w.bridge&&!w.final[2]&&near(p,LOOP_FINAL[2].x,LOOP_FINAL[2].y,67,85)){
        w.final[2]=true;this.checkExit();this.lastSwitch[2]=now;return true;
      }
    }
    return false;
  }
  private checkTree(now:number):void{
    if(allDone(this.world.tree)&&this.world.treeFallAt===0)this.world.treeFallAt=now;
  }
  private checkExit():void{
    if(allDone(this.world.final)&&this.world.layout===2)this.world.exit=true;
  }
  kill(now=Date.now()):boolean{
    if(this.world.deadUntil>0||this.world.completed)return false;
    this.world.deadUntil=now+2200;return true;
  }
  /** One host clock for all players; secure route teleports are whole-party only. */
  tick(poses:Pose[],now=Date.now()):Tick{
    const w=this.world;
    // Pose authority for the two supported players. Their bases retain physics.
    for(const seat of [1,0] as Seat[]){
      const base=w.supporting[seat];
      if(base!==null){
        poses[seat].x=poses[base].x;poses[seat].y=Math.max(30,poses[base].y-44);
        poses[seat].vx=poses[base].vx;poses[seat].vy=0;
      }
    }
    if(w.deadUntil>0){
      if(now<w.deadUntil)return{changed:false};
      this.reset(now);return{changed:true,reset:true,poses:LOOP_START.map(p=>({...p}))};
    }
    if(w.completed)return{changed:false,won:true};
    if(w.blackoutUntil>0){
      if(now<w.blackoutUntil)return{changed:false};
      w.blackoutUntil=0;w.layout=((w.layout+1)%3) as Layout;
      w.cycle++;w.cycleStart=now;w.observed=true;
      this.checkExit();
      // Do not leave a player inside a newly-solid trunk.
      const corrected=poses.map(p=>{
        const blocked=barriers(w).find(b=>b.enabled&&Math.abs(p.x-b.x)<47&&p.y>390);
        return blocked?{...p,x:blocked.x-83,y:602,vx:0,vy:0}:p;
      });
      return{changed:true,poses:corrected.some((p,i)=>p!==poses[i])?corrected:undefined};
    }
    if(now-w.cycleStart>=LOOP_CYCLE_MS){
      w.blackoutUntil=now+LOOP_BLACKOUT_MS;return{changed:true};
    }
    if(w.treeFallAt>0&&!w.bridge&&now-w.treeFallAt>=1900){
      w.bridge=true;return{changed:true};
    }
    if(w.bridge&&allDone(w.final)&&w.layout===2&&!w.exit){w.exit=true;return{changed:true};}
    if(w.exit&&poses.every(p=>p.x>=3680&&p.x<=3798&&p.y>=540&&p.y<=660)){
      w.completed=true;return{changed:true,won:true};
    }
    if(now-w.routeAt>=3200&&allDone(w.marks)){
      for(const [route,x] of [['oca',1540],['pedra',1700]] as const){
        if(!poses.every(p=>Math.abs(p.x-x)<135&&safeForRoute(p)))continue;
        const correct=ROUTES[w.layout].correct===route;
        w.lastRoute=correct?'right':'wrong';w.routeAt=now;w.routeCount++;
        const to=correct?ROUTES[w.layout].advanceTo:ROUTES[w.layout].returnTo;
        const moved=poses.map((p,i)=>({...p,x:to+i*39,y:602,vx:0,vy:0}));
        return{changed:true,poses:moved};
      }
    }
    // The false exit at the fourth sector is never a fatal trap.
    if(now-w.routeAt>=3200&&w.bridge&&poses.every(p=>near(p,3070,605,115,53)&&safeForRoute(p))
      &&w.layout!==2){
      w.lastRoute='wrong';w.routeAt=now;w.routeCount++;
      return{changed:true,poses:poses.map((p,i)=>({...p,x:980+i*39,y:602,vx:0,vy:0}))};
    }
    return{changed:false};
  }
}
