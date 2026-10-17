import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';

export const LOOP_WIDTH = 3800;
export const LOOP_CYCLE_MS = 60000;
export const LOOP_WARNING_MS = 10000;
export const LOOP_BLACKOUT_MS = 2000;
export type Layout = 0|1|2;
export type Route = 'oca'|'pedra';
export const LOOP_GEOMETRY = {
  clearing:{min:1730,max:2000,groundY:638},
  gate:2070,
  layoutWalls:[1360,1540,875] as const,
  portal:{oca:790,pedra:1460} as const,
  portalLanding:2120,
  returnCenter:1840,
  chasm:{start:2265,end:2625},
  bridge:{x:2445,y:659,width:360,height:36},
  finalGate:3710,
} as const;
/** Central clearing, clear of every rotating obstacle; all three face both directions. */
export const LOOP_START: Pose[] = ([0,1,2] as Seat[]).map(seat=>({
  seat,x:1840+seat*60,y:606,vx:0,vy:0,
}));
export const LOOP_MARKS=[
  {x:700,y:480,seat:0,name:'ÁRVORE OCA'},
  {x:1000,y:574,seat:1,name:'PEDRA RACHADA'},
  {x:1260,y:589,seat:2,name:'TRONCO EM ARCO'},
] as const;
export const LOOP_TREE=[
  {x:2130,y:514,seat:0},{x:2310,y:574,seat:1},{x:2242,y:592,seat:2}
] as const;
export const LOOP_FINAL=[
  {x:3320,y:510,seat:0},{x:3470,y:573,seat:1},{x:3595,y:590,seat:2}
] as const;
export const ROUTES:Readonly<Record<Layout,{correct:Route;wrong:Route;barrierX:number;returnTo:number;advanceTo:number}>>={
  0:{correct:'pedra',wrong:'oca',barrierX:LOOP_GEOMETRY.layoutWalls[0],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
  1:{correct:'oca',wrong:'pedra',barrierX:LOOP_GEOMETRY.layoutWalls[1],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
  2:{correct:'pedra',wrong:'oca',barrierX:LOOP_GEOMETRY.layoutWalls[2],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
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
/** The trustworthy wind points to the NEXT reachable interaction, not the final exit's X. */
export function windGuide(w:LoopWorld,seat:Seat,x:number):{direction:-1|0|1;target:number;hint:string}{
  let target=0,hint='';
  if(!w.observed){
    target=LOOP_MARKS[0].x;
    hint='EXPLOREM À ESQUERDA E MEMORIZEM A ÁRVORE OCA, A PEDRA E O ARCO.';
  }else if(!allDone(w.marks)){
    const next=w.marks.findIndex(value=>!value);
    target=LOOP_MARKS[next].x-(next===1?210:0);
    hint='MARCOS CONHECIDOS: OBSERVEM O QUE MUDOU DEPOIS DO APAGÃO.';
  }else if(w.lastRoute!=='right'&&x<LOOP_GEOMETRY.gate+15){
    target=LOOP_GEOMETRY.portal[ROUTES[w.layout].correct];
    hint='PASSAGEM VERDADEIRA: '+(ROUTES[w.layout].correct==='oca'?'ÁRVORE OCA':'PEDRA RACHADA')+
      '. AS OUTRAS DEVOLVEM À CLAREIRA.';
  }else if(!w.bridge){
    target=!w.stackMilestone?2160:LOOP_TREE[w.tree.findIndex(value=>!value)]?.x??2110;
    hint=!w.stackMilestone?'APOIO: NINO PARADO, LIA SOBE COM E, TÉO SOBE EM LIA COM E.':
      'SOLTEM AS TRÊS AMARRAS PARA A ÁRVORE FORMAR A PONTE.';
  }else if(x<2990){
    target=2910;hint='ATRAVESSEM A ÁRVORE DEITADA PARA A OUTRA MARGEM.';
  }else if(!allDone(w.final)){
    target=LOOP_FINAL[w.final.findIndex(value=>!value)].x-22;
    hint='CADA PERSONAGEM PRECISA ATIVAR SEU MECANISMO FINAL.';
  }else if(w.layout!==2){
    target=3300;hint='A SAÍDA AINDA MENTE. ESPEREM A FLORESTA INVERTIDA.';
  }else {
    target=3730;hint='AGORA SIGAM O VENTO ATÉ A SAÍDA REAL.';
  }
  return {direction:target>x+38?1:target<x-38?-1:0,target,
    hint:hint+(seat===0?' · TÉO':seat===1?' · LIA':' · NINO')};
}
/** Permanent gate blocks bypass from clearing; three jumpable obstacles rotate A/B/C. */
export function barriers(w:LoopWorld):ReadonlyArray<{x:number;enabled:boolean;height:number}>{
  return [
    {x:LOOP_GEOMETRY.gate,enabled:true,height:550},
    ...ROUTES_LIST.map((route,i)=>({x:route.barrierX,enabled:w.layout===i,height:96})),
    {x:LOOP_GEOMETRY.finalGate,enabled:!w.exit,height:550},
  ];
}
const ROUTES_LIST=[ROUTES[0],ROUTES[1],ROUTES[2]];
/** Structural checks: every state has a distinct true route and obstacle-free spawn. */
export function layoutReachable(w:LoopWorld):boolean{
  const route=ROUTES[w.layout];
  return route.correct!==route.wrong
    &&route.advanceTo>LOOP_GEOMETRY.gate
    &&LOOP_START.every(p=>p.x<LOOP_GEOMETRY.gate-50
      &&p.x>LOOP_GEOMETRY.layoutWalls[0]+80
      &&p.x<LOOP_GEOMETRY.chasm.start-120);
}
export function safeReposition(poses:Pose[],w:LoopWorld):Pose[]|undefined{
  const obstacles=barriers(w).filter(b=>b.enabled);
  const unsafe=poses.some(p=>obstacles.some(b=>Math.abs(p.x-b.x)<b.height/5+25
    &&p.y>LOOP_GEOMETRY.clearing.groundY-b.height-33));
  if(!unsafe)return undefined;
  // Safest common rendezvous point preserves identity but eliminates collider traps.
  return LOOP_START.map(p=>({...p}));
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
      // Detach temporary human towers before moving collisions; progress stays saved.
      w.supporting=[null,null,null];
      const corrected=safeReposition(poses,w);
      return{changed:true,poses:corrected};
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
      for(const [route,x] of [['oca',LOOP_GEOMETRY.portal.oca],['pedra',LOOP_GEOMETRY.portal.pedra]] as const){
        if(!poses.every(p=>Math.abs(p.x-x)<135&&safeForRoute(p)))continue;
        const correct=ROUTES[w.layout].correct===route;
        w.lastRoute=correct?'right':'wrong';w.routeAt=now;w.routeCount++;
        const to=correct?ROUTES[w.layout].advanceTo:ROUTES[w.layout].returnTo;
        w.supporting=[null,null,null];
        const moved=poses.map((p,i)=>({...p,x:to+i*39,y:606,vx:0,vy:0}));
        return{changed:true,poses:moved};
      }
    }
    // The false exit at the fourth sector is never a fatal trap.
    if(now-w.routeAt>=3200&&w.bridge&&poses.every(p=>near(p,3070,605,115,53)&&safeForRoute(p))
      &&w.layout!==2){
      w.lastRoute='wrong';w.routeAt=now;w.routeCount++;
      w.supporting=[null,null,null];
      return{changed:true,poses:LOOP_START.map(p=>({...p}))};
    }
    return{changed:false};
  }
}
