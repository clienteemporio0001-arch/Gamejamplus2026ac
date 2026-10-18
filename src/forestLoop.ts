import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';
import {VITALS,initVitals,validVitals,spendVital,regenVitals,damageVitals,type VitalAction,type Vitals} from './loopVitals';

export const LOOP_WIDTH = 11400;
export const SUSPENSION={gapStart:8050,gapEnd:8750,lever:{x:7780,y:302},
 branch:{x:7780,y:334,width:145,height:20},lia:{x:7930,y:592},nino:{x:7990,y:590},
 initialX:7700,teoX:7890,liaX:8150,finalX:8400,width:790,height:26,
 moveMs:1900} as const;
export const SUSPENSION_LANDING_Y=SUSPENSION.branch.y-SUSPENSION.branch.height/2-22;
/** Shared static terrain for rendering, fall sampling and traversal tests. */
export const LOOP_TERRAIN=[
 {from:0,to:2000},{from:2260,to:4100},{from:4340,to:6470},
 {from:6700,to:SUSPENSION.gapStart},
 {from:SUSPENSION.gapEnd,to:9465},{from:9825,to:LOOP_WIDTH}
] as const;
export const LOOP_NATURAL_LEDGES=[
 {x:2100,y:625,width:105},{x:4210,y:622,width:98},
 {x:6580,y:625,width:115},{x:2570,y:590,width:155},
 {x:3800,y:587,width:140},{x:6000,y:587,width:125},
 {x:8950,y:590,width:144},{x:10220,y:597,width:155}
] as const;
/** Extra alternate tree branches change with the three 60-second layouts.
 * Every essential path remains reachable using permanent ledges.
 */
export const LOOP_LAYOUT_BRANCHES=[
 {x:1870,y:526,width:155,layout:0},
 {x:2810,y:530,width:155,layout:1},
 {x:3580,y:535,width:148,layout:2},
 {x:6080,y:516,width:145,layout:0},
 {x:7410,y:520,width:152,layout:1},
 {x:9030,y:510,width:143,layout:2},
 {x:10340,y:513,width:153,layout:1}
] as const;
export const LOOP_CYCLE_MS = 60000;
export const LOOP_WARNING_MS = 10000;
export const LOOP_BLACKOUT_MS = 2000;
export type Layout = 0|1|2;
export type Route = 'oca'|'pedra';
export const LOOP_GEOMETRY = {
  clearing:{min:5500,max:5900,groundY:638},
  gate:7200,
  layoutWalls:[5000,3100,1200] as const,
  // Natural trail entrances are SEPARATE from solid landmark hitboxes.
  // Each entrance is on uninterrupted ground, not inside the hollow-tree ledge or stone.
  portal:{oca:1630,pedra:3740} as const,
  portalLanding:7590,
  returnCenter:5680,
  chasm:{start:9465,end:9825},
  bridge:{x:9645,y:659,width:360,height:36},
  finalGate:11010,
} as const;
/** Central clearing, clear of every rotating obstacle; all three face both directions. */
export const LOOP_START: Pose[] = ([0,1,2] as Seat[]).map(seat=>({
  seat,x:5600+seat*60,y:606,vx:0,vy:0,
}));
/** Character 30x44, gravity 850, jump velocity 465; the ledge can only be
 * attained by a real stacked double jump (from body-center height 518). */
export const LOOP_PHYSICS={characterHeight:44,gravity:850,jumpVelocity:465} as const;
export const UPPER_BRANCH={x:9340,centerY:325,width:156,height:20,anchorX:9330} as const;
export const upperLandingY=UPPER_BRANCH.centerY-UPPER_BRANCH.height/2-LOOP_PHYSICS.characterHeight/2;
export const SUMMIT_BRANCH={x:9340,centerY:120,width:135,height:20,anchorX:9340} as const;
export const summitLandingY=SUMMIT_BRANCH.centerY-SUMMIT_BRANCH.height/2-LOOP_PHYSICS.characterHeight/2;
export const hasSummitFooting=(p:Pose):boolean=>
  Math.abs(p.y-summitLandingY)<=6&&
  Math.abs(p.x-SUMMIT_BRANCH.x)<=SUMMIT_BRANCH.width/2-LOOP_PHYSICS.characterHeight/2&&
  Math.abs(p.vy)<=65&&Math.abs(p.vx)<=155;
export const soloJumpRise=LOOP_PHYSICS.jumpVelocity**2/(2*LOOP_PHYSICS.gravity);
export const hasBranchFooting=(p:Pose):boolean=>
  Math.abs(p.y-upperLandingY)<=5 &&
  Math.abs(p.x-UPPER_BRANCH.x)<=UPPER_BRANCH.width/2-LOOP_PHYSICS.characterHeight/2 &&
  Math.abs(p.vy)<=65 && Math.abs(p.vx)<=155;
export const markerBaseY=638;
export const LOOP_MARKS=[
  {x:1300,y:510,seat:0,name:'ÁRVORE OCA'},
  {x:3450,y:598,seat:1,name:'PEDRA RACHADA'},
  {x:4750,y:589,seat:2,name:'TRONCO EM ARCO'},
] as const;
/** Stable landmark identity; layout chooses a reachable location inside its own sector. */
export const MARK_OFFSETS=[[0,82,-72],[0,-80,76],[0,98,-88]] as const;
export function markPosition(w:Pick<LoopWorld,'layout'>,index:number):{x:number;y:number}{
 const source=LOOP_MARKS[index];
 return {x:source.x+MARK_OFFSETS[index][w.layout],y:source.y};
}
export const LOOP_TREE=[
  {x:SUMMIT_BRANCH.anchorX,y:summitLandingY,seat:0},{x:9760,y:574,seat:1},{x:9442,y:592,seat:2}
] as const;
export const LOOP_FINAL=[
  {x:10520,y:510,seat:0},{x:10670,y:573,seat:1},{x:10795,y:590,seat:2}
] as const;
export const ROUTES:Readonly<Record<Layout,{correct:Route;wrong:Route;barrierX:number;returnTo:number;advanceTo:number}>>={
  0:{correct:'pedra',wrong:'oca',barrierX:LOOP_GEOMETRY.layoutWalls[0],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
  1:{correct:'oca',wrong:'pedra',barrierX:LOOP_GEOMETRY.layoutWalls[1],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
  2:{correct:'pedra',wrong:'oca',barrierX:LOOP_GEOMETRY.layoutWalls[2],
    returnTo:LOOP_GEOMETRY.returnCenter,advanceTo:LOOP_GEOMETRY.portalLanding},
};
export type LoopWorld=Vitals & {
  layout:Layout; cycle:number;cycleStart:number;blackoutUntil:number;observed:boolean;
  marks:[boolean,boolean,boolean];tree:[boolean,boolean,boolean];treeFallAt:number;bridge:boolean;
  suspended:[boolean,boolean,boolean];suspendedOpen:boolean;suspendedX:number;
  suspendedFrom:number;suspendedTo:number;suspendedAt:number;
  suspensionStacked:boolean;suspensionClimbReady:boolean;
  supporting:[Seat|null,Seat|null,Seat|null];stackMilestone:boolean;
  climbReady:boolean;teoUpperReached:boolean;teoSummitReached:boolean;
  final:[boolean,boolean,boolean];exit:boolean;
  lastRoute:'none'|'wrong'|'right'; routeAt:number;routeCount:number;
  deadUntil:number;resetId:number; completed:boolean;
};
const bool3=(value:unknown):value is [boolean,boolean,boolean]=>Array.isArray(value)&&value.length===3&&value.every(x=>typeof x==='boolean');
const nonNegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
export const initLoop=(now=Date.now()):LoopWorld=>({
  layout:0,cycle:0,cycleStart:now,blackoutUntil:0,observed:false,
  marks:[false,false,false],tree:[false,false,false],treeFallAt:0,bridge:false,
  suspended:[false,false,false],suspendedOpen:false,suspendedX:SUSPENSION.initialX,
  suspendedFrom:SUSPENSION.initialX,suspendedTo:SUSPENSION.initialX,suspendedAt:0,
  suspensionStacked:false,suspensionClimbReady:false,
  supporting:[null,null,null],stackMilestone:false,climbReady:false,teoUpperReached:false,teoSummitReached:false,
  final:[false,false,false],exit:false,lastRoute:'none',routeAt:0,routeCount:0,
  deadUntil:0,resetId:0,completed:false,...initVitals()
});
export function validLoop(value:unknown):value is LoopWorld{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const w=value as Record<string,unknown>;
  return (w.layout===0||w.layout===1||w.layout===2)
    &&nonNegative(w.cycle)&&Number.isInteger(w.cycle)
    &&['cycleStart','blackoutUntil','treeFallAt','routeAt','routeCount','deadUntil','resetId',
      'suspendedX','suspendedFrom','suspendedTo','suspendedAt'].every(k=>nonNegative(w[k]))
    &&['observed','bridge','exit','completed','stackMilestone','climbReady','teoUpperReached','teoSummitReached',
      'suspendedOpen','suspensionStacked','suspensionClimbReady'].every(k=>typeof w[k]==='boolean')
    &&Array.isArray(w.supporting)&&w.supporting.length===3
    &&w.supporting.every((b:unknown,i:number)=>b===null||(i===0&&b===1)||(i===1&&b===2))
    &&bool3(w.marks)&&bool3(w.tree)&&bool3(w.final)&&bool3(w.suspended)
    &&[w.suspendedX,w.suspendedFrom,w.suspendedTo].every(x=>typeof x==='number'&&x>=SUSPENSION.initialX-500&&x<=SUSPENSION.finalX+200)
    &&['none','wrong','right'].includes(String(w.lastRoute))&&validVitals(w);
}
export const allDone=(items:readonly boolean[])=>items.every(Boolean);
export const blackoutActive=(w:LoopWorld,now:number)=>w.blackoutUntil>0&&now<w.blackoutUntil;
export const warningActive=(w:LoopWorld,now:number)=>w.blackoutUntil===0 && now-w.cycleStart>=LOOP_CYCLE_MS-LOOP_WARNING_MS;
export const near=(pose:Pose,x:number,y:number,dx=64,dy=88)=>
  Math.abs(pose.x-x)<=dx&&Math.abs(pose.y-y)<=dy;
/** Shared visible assembly zone. World visuals, HUD and authority use these dimensions. */
export const TRAIL_MEET_RADIUS_X=142;
export const TRAIL_MEET_MIN_Y=527,TRAIL_MEET_MAX_Y=652;
export const safeForRoute=(p:Pose)=>p.y>=TRAIL_MEET_MIN_Y&&p.y<=TRAIL_MEET_MAX_Y
  &&Math.abs(p.vy)<180&&Math.abs(p.vx)<305;
export function trailOccupants(poses:readonly Pose[],route:Route):Seat[]{
 const x=LOOP_GEOMETRY.portal[route];
 return poses.filter(p=>Math.abs(p.x-x)<=TRAIL_MEET_RADIUS_X&&safeForRoute(p))
   .map(p=>p.seat);
}
export function trailAssembly(w:Pick<LoopWorld,'marks'|'lastRoute'|'layout'>,
 poses:readonly Pose[],route:Route){
 const count=trailOccupants(poses,route).length;
 return {count,total:3,ready:allDone(w.marks)&&w.lastRoute!=='right'&&count===3,
  correct:correctRoute(w.layout)===route};
}
export function correctRoute(layout:Layout):Route{return ROUTES[layout].correct;}
/** The trustworthy wind points to the NEXT reachable interaction, not the final exit's X. */
export function windGuide(w:LoopWorld,seat:Seat,x:number):{direction:-1|0|1;target:number;hint:string}{
  let target=0,hint='';
  if(!w.observed){
    target=markPosition(w,0).x;
    hint='EXPLOREM À ESQUERDA E MEMORIZEM A ÁRVORE OCA, A PEDRA E O ARCO.';
  }else if(!allDone(w.marks)){
    const next=w.marks.findIndex(value=>!value);
    target=markPosition(w,next).x-(next===1?210:0);
    hint='MARCOS CONHECIDOS: ENCONTREM A NOVA POSIÇÃO DE CADA UM.';
  }else if(w.lastRoute!=='right'&&x<LOOP_GEOMETRY.gate+15){
    target=LOOP_GEOMETRY.portal[ROUTES[w.layout].correct];
    hint='PASSAGEM VERDADEIRA: '+(ROUTES[w.layout].correct==='oca'?'ÁRVORE OCA':'PEDRA RACHADA')+
      '. AS OUTRAS DEVOLVEM À CLAREIRA.';
  }else if(!w.suspendedOpen){
    target=!w.suspended[0]?SUSPENSION.lever.x:
      !w.suspended[1]?SUSPENSION.lia.x-200:SUSPENSION.nino.x-165;
    hint=!w.suspended[0]?'ESCADA HUMANA: NINO NA BASE, LIA NO MEIO, TÉO NO ALTO PARA A ALAVANCA.':
      !w.suspended[1]?'LIA: ACERTE COM J A TRAVA DA PLATAFORMA SUSPENSA.':
      'NINO: USE DASH E E NA FIXAÇÃO DA MARGEM INICIAL.';
  }else if(!w.bridge){
    target=!w.stackMilestone?9360:!w.teoUpperReached?UPPER_BRANCH.x:LOOP_TREE[w.tree.findIndex(value=>!value)]?.x??9310;
    hint=!w.stackMilestone?'APOIO: NINO PARADO, LIA SOBE COM E, TÉO SOBE EM LIA COM E.':
      !w.teoUpperReached?'TÉO: SOLTE-SE, USE SALTO DUPLO E ATERRISSE NO GALHO ALTO.':
      'SOLTEM AS TRÊS AMARRAS PARA A ÁRVORE FORMAR A PONTE.';
  }else if(x<10190){
    target=10110;hint='ATRAVESSEM A ÁRVORE DEITADA PARA A OUTRA MARGEM.';
  }else if(w.layout!==2){
    target=10110;
    hint='CUIDADO: A TRILHA À FRENTE É FALSA. AGUARDEM O ESTADO C NA MARGEM SEGURA.';
  }else if(!allDone(w.final)){
    target=LOOP_FINAL[w.final.findIndex(value=>!value)].x-22;
    hint='CADA PERSONAGEM PRECISA ATIVAR SEU MECANISMO FINAL.';
  }else if(w.layout!==2){
    target=10500;hint='A SAÍDA AINDA MENTE. ESPEREM A FLORESTA INVERTIDA.';
  }else {
    target=11230;hint='AGORA SIGAM O VENTO ATÉ A SAÍDA REAL.';
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
 // Do not teleport the entire team to spawn when one root changes position.
 // Resolve only the individual body overlapping a newly enabled static collision.
 const obstacles=[
  ...barriers(w).filter(b=>b.enabled).map(b=>({x:b.x,width:b.height>200?40:45,height:b.height})),
  {x:markPosition(w,1).x,width:120,height:91}
 ];
 const onGround=(x:number)=>LOOP_TERRAIN.some(t=>x>=t.from+31&&x<=t.to-31);
 let any=false;
 const moved=poses.map(p=>{
  const dangerous=obstacles.filter(b=>Math.abs(p.x-b.x)<b.width/2+18
    &&p.y>LOOP_GEOMETRY.clearing.groundY-b.height-33);
  if(!dangerous.length)return {...p};
  const candidates=dangerous.flatMap(b=>[
   b.x-b.width/2-36,b.x+b.width/2+36
  ]).filter(x=>x>=35&&x<=LOOP_WIDTH-35&&onGround(x)
   &&obstacles.every(b=>Math.abs(x-b.x)>=b.width/2+18))
   .sort((a,b)=>Math.abs(a-p.x)-Math.abs(b-p.x));
  // Rare enclosed configuration: return the trapped seat alone to a safe clearing.
  const safeX=candidates[0]??LOOP_START[p.seat].x;
  any=true;
  return {...p,x:safeX,vx:0,vy:0};
 });
 return any?moved:undefined;
}

/** Reusable safety rules for the co-operative human ladder. Physical access to
 * switches/branches is STILL checked independently by the puzzle authority. */
export function stackFooting(w:LoopWorld,p:Pose):boolean{
 const foot=p.y+LOOP_PHYSICS.characterHeight/2;
 if(Math.abs(p.vy)>80||Math.abs(p.vx)>135)return false;
 const top=(x:number,width:number,y:number)=>Math.abs(p.x-x)<=width/2-18&&
   Math.abs(foot-y)<=16;
 return LOOP_TERRAIN.some(t=>p.x>=t.from+19&&p.x<=t.to-19&&Math.abs(foot-638)<=16)
   ||LOOP_NATURAL_LEDGES.some(l=>top(l.x,l.width,l.y-11))
   ||LOOP_LAYOUT_BRANCHES.some(l=>l.layout===w.layout&&top(l.x,l.width,l.y-9))
   ||top(SUSPENSION.branch.x,SUSPENSION.branch.width,SUSPENSION.branch.y-SUSPENSION.branch.height/2)
   ||top(UPPER_BRANCH.x,UPPER_BRANCH.width,UPPER_BRANCH.centerY-UPPER_BRANCH.height/2)
   ||top(SUMMIT_BRANCH.x,SUMMIT_BRANCH.width,SUMMIT_BRANCH.centerY-SUMMIT_BRANCH.height/2)
   ||(w.suspendedOpen&&top(SUSPENSION.finalX,SUSPENSION.width,656-SUSPENSION.height/2))
   ||(w.bridge&&top(LOOP_GEOMETRY.bridge.x,LOOP_GEOMETRY.bridge.width,
      LOOP_GEOMETRY.bridge.y-LOOP_GEOMETRY.bridge.height/2));
}
/** AABBs of stage-one SOLID actors and rigid props, never magical puzzles. */
export function stackBlockers(w:LoopWorld):ReadonlyArray<{x:number;y:number;width:number;height:number}>{
 return [
   ...barriers(w).filter(b=>b.enabled).map(b=>({
     x:b.x,y:b.height>200?363:LOOP_GEOMETRY.clearing.groundY-48,
     width:b.height>200?40:45,height:b.height
   })),
   {x:markPosition(w,1).x,y:592,width:120,height:91},
   ...LOOP_NATURAL_LEDGES.map(l=>({...l,height:22})),
   ...LOOP_LAYOUT_BRANCHES.filter(l=>l.layout===w.layout).map(l=>({...l,height:18})),
   {x:SUSPENSION.branch.x,y:SUSPENSION.branch.y,
    width:SUSPENSION.branch.width,height:SUSPENSION.branch.height},
   {x:UPPER_BRANCH.x,y:UPPER_BRANCH.centerY,width:UPPER_BRANCH.width,height:UPPER_BRANCH.height},
   {x:SUMMIT_BRANCH.x,y:SUMMIT_BRANCH.centerY,width:SUMMIT_BRANCH.width,height:SUMMIT_BRANCH.height},
   ...(w.suspendedOpen?[{x:SUSPENSION.finalX,y:656,width:SUSPENSION.width,height:SUSPENSION.height}]:[]),
   ...(w.bridge?[{x:LOOP_GEOMETRY.bridge.x,y:LOOP_GEOMETRY.bridge.y,
     width:LOOP_GEOMETRY.bridge.width,height:LOOP_GEOMETRY.bridge.height}]:[])
 ];
}
/** Works at any solid, safe surface; the host checks every seat before mounting. */
export function canStack(w:LoopWorld,seat:Seat,poses:readonly Pose[]):boolean{
 if(seat!==0&&seat!==1)return false;
 const base:Seat=seat===0?1:2,p=poses[seat],other=poses[base],nino=poses[2];
 if(!p||!other||!nino||w.health[seat]<=0||w.health[base]<=0||w.health[2]<=0
    ||w.completed||w.deadUntil>0||w.blackoutUntil>0||w.supporting[seat]!==null)
   return false;
 if(seat===0&&w.supporting[1]!==2 || seat===1&&w.supporting[1]!==null)return false;
 if(!stackFooting(w,nino)||Math.abs(p.vy)>95||Math.abs(other.vy)>95
    ||Math.abs(p.vx)>135||Math.abs(other.vx)>135
    ||Math.abs(p.x-other.x)>45||Math.abs(p.y-other.y)>75)return false;
 const y=other.y-44,x=other.x;
 if(y<55||y>652)return false;
 // Check the swept ascent, not merely the destination: no teleport through a
 // thin shelf when mounting from below it.
 const top=Math.min(y,p.y)-LOOP_PHYSICS.characterHeight/2;
 const bottom=Math.max(y,p.y)+LOOP_PHYSICS.characterHeight/2;
 return stackBlockers(w).every(b=>Math.abs(x-b.x)>=b.width/2+15
    ||bottom<=b.y-b.height/2||top>=b.y+b.height/2);
}

/** Host and local hint UI share the EXACT suspended-lever prerequisites.
 * This never grants a skill; only LoopAuthority.act changes the world state.
 */
export type SuspensionLeverReason=
 'ready'|'route'|'finished'|'moving'|'closer'|'tower'|'detach'|'climb'|'branch'|'steady';
export function suspensionLeverStatus(w:LoopWorld,p:Pose):SuspensionLeverReason{
 if(w.lastRoute!=='right')return 'route';
 if(w.suspended[0]||w.suspendedOpen){
  return w.suspendedX!==w.suspendedTo?'moving':'finished';
 }
 if(Math.abs(p.x-SUSPENSION.lever.x)>125)return 'closer';
 if(!w.suspensionStacked||w.supporting[1]!==2)return 'tower';
 if(w.supporting[0]!==null)return 'detach';
 if(!w.suspensionClimbReady)return 'climb';
 if(Math.abs(p.x-SUSPENSION.lever.x)>42||
    Math.abs(p.y-SUSPENSION.lever.y)>12)return 'branch';
 if(Math.abs(p.vx)>=155||Math.abs(p.vy)>=65)return 'steady';
 return 'ready';
}
export const SUSPENSION_LEVER_FEEDBACK:Record<SuspensionLeverReason,string>={
 ready:'Alavanca acionada! A passarela está se movendo!',
 route:'Atravessem primeiro a trilha verdadeira!',
 finished:'Alavanca liberada! Lia precisa soltar a próxima trava.',
 moving:'Aguarde a plataforma terminar o movimento.',
 closer:'Chegue mais perto da alavanca.',
 tower:'Complete o empilhamento: Nino, Lia e Téo.',
 detach:'Solte o apoio humano e alcance o galho superior.',
 climb:'Suba na escada humana, salte dela e alcance o galho superior.',
 branch:'Alcance o galho superior e fique junto à alavanca.',
 steady:'Pare por um instante no galho para puxar a alavanca.'
};

type Tick={changed:boolean;poses?:Pose[];reset?:boolean;won?:boolean};
export class LoopAuthority{
  world=initLoop();
  private lastShot=[0,0,0];private lastDash=[0,0,0];
  private dashOrigin=[0,0,0]; private lastSwitch=[0,0,0];
  private lastResourceTick=Date.now();
  private lastJumpAt:[number,number,number]=[0,0,0];
  private lastSkillUse:[number,number,number]=[0,0,0];
  private firstJumpY:[number,number,number]=[0,0,0];
  private doubleJumpUsed:[boolean,boolean,boolean]=[false,false,false];
  reset(now=Date.now()):void{
    const id=this.world.resetId+1;
    this.world=initLoop(now);this.world.resetId=id;
    this.lastShot=[0,0,0];this.lastDash=[0,0,0];this.dashOrigin=[0,0,0];
    this.lastSwitch=[0,0,0];this.lastResourceTick=now;
    this.lastJumpAt=[0,0,0];this.firstJumpY=[0,0,0];this.doubleJumpUsed=[false,false,false];
    this.lastSkillUse=[0,0,0];
  }
  /** The host validates cost before any movement, cooldown or puzzle action. */
  authorizeEnergy(seat:Seat,kind:VitalAction,poses:Pose[],now=Date.now(),
    facing:-1|1=1):{ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid'}{
    const w=this.world,p=poses[seat];
    const fail=(reason:'tired'|'cooldown'|'invalid')=>({ok:false,reason} as const);
    if(!p||p.seat!==seat||w.completed||w.deadUntil>0||blackoutActive(w,now)||w.health[seat]===0)
      return fail('invalid');
    if(kind==='shoot'&&seat!==1||kind==='dash'&&seat!==2||kind==='doubleJump'&&seat!==0)
      return fail('invalid');
    if(kind==='shoot'&&now-this.lastSkillUse[1]<VITALS.SHOT_COOLDOWN_MS
       ||kind==='dash'&&now-this.lastSkillUse[2]<VITALS.DASH_COOLDOWN_MS)
      return fail('cooldown');
    if(kind==='jump'){
      if(now-this.lastJumpAt[seat]<220)return fail('cooldown');
      const standing=(Math.abs(p.vy)<120&&(p.y>570&&p.y<643
        ||Math.abs(p.y-upperLandingY)<35 || Math.abs(p.y-summitLandingY)<35
        ||Math.abs(p.y-514)<35
        ||Math.abs(p.y-516)<35));
      if(!standing&&w.supporting[seat]===null)return fail('invalid');
    }
    if(kind==='doubleJump'){
      if(this.lastJumpAt[0]===0||now-this.lastJumpAt[0]<110
        ||now-this.lastJumpAt[0]>1650||this.doubleJumpUsed[0]
        ||p.y>this.firstJumpY[0]+12||p.vy>420)return fail('invalid');
    }
    if(w.stamina[seat]< (kind==='jump'?VITALS.JUMP:kind==='doubleJump'?VITALS.DOUBLE_JUMP:
      kind==='shoot'?VITALS.SHOT:VITALS.DASH))return fail('tired');
    if(!spendVital(w,seat,kind,now))return fail('tired');
    if(kind==='jump'){
      this.lastJumpAt[seat]=now;this.firstJumpY[seat]=p.y;this.doubleJumpUsed[seat]=false;
    }else if(kind==='doubleJump'){
      this.doubleJumpUsed[0]=true;
    }else{
      this.lastSkillUse[seat]=now;
      this.act(seat,{kind:kind==='shoot'?'shoot':'dash',facing},poses,now);
    }
    return {ok:true,reason:'ok'};
  }
  /** Time-step resources only while simulation is active; paused seconds never accumulate. */
  tickResources(poses:Pose[],now=Date.now()):boolean{
    const elapsed=Math.max(0,Math.min(100,now-this.lastResourceTick));
    this.lastResourceTick=now;
    if(this.world.completed||this.world.deadUntil>0||blackoutActive(this.world,now))
      return false;
    return regenVitals(this.world,poses,now,elapsed);
  }
  /** No ordinary hazards are fabricated in the new adventure. */
  damage(seat:Seat,now=Date.now(),fatal=false):boolean{
    if(this.world.deadUntil>0||blackoutActive(this.world,now)||this.world.completed)return false;
    if(!damageVitals(this.world,seat,now,fatal))return false;
    if(this.world.health[seat]===0)this.world.deadUntil=now+2200;
    return true;
  }
  /** Puzzle progress is never discarded by landscape shifts. */
  act(seat:Seat,action:PuzzleAction,poses:Pose[],now=Date.now()):boolean{
    const w=this.world,p=poses[seat];
    if(!p||p.seat!==seat||w.completed||w.deadUntil>0||blackoutActive(w,now))return false;
    if(action.kind==='support'&&(seat===0||seat===1)&&w.supporting[seat]===null){
      const base:Seat=seat===0?1:2,other=poses[base];
      if(!canStack(w,seat,poses))return false;
      w.supporting[seat]=base;
      if(w.supporting[0]===1&&w.supporting[1]===2){
        if(p.x>=7550&&p.x<=8000)w.suspensionStacked=true;
        if(p.x>=9100&&p.x<=9440)w.stackMilestone=true;
      }
      return true;
    }
    if(action.kind==='detach'&&w.supporting[seat]!==null){
      // Detached Téo must actually leave a valid human tower beside the tree.
      if(seat===0&&w.supporting[0]===1&&w.supporting[1]===2){
        if(Math.abs(p.x-UPPER_BRANCH.x)<115&&p.y<=535)w.climbReady=true;
        if(Math.abs(p.x-SUSPENSION.lever.x)<118&&p.y<=540)
          w.suspensionClimbReady=true;
      }
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
      if(w.lastRoute==='right'&&w.suspended[0]&&!w.suspended[1]&&
        w.suspendedTo===w.suspendedX&&shoot(SUSPENSION.lia)){
        w.suspended[1]=true;this.slideSuspension(SUSPENSION.liaX,now);return true;
      }
      if(w.observed&&w.marks[0]&&!w.marks[1]&&shoot(markPosition(w,1))){w.marks[1]=true;return true;}
      if(w.suspendedOpen&&allDone(w.marks)&&!w.tree[1]&&shoot(LOOP_TREE[1])){w.tree[1]=true;this.checkTree(now);return true;}
      if(w.bridge&&!w.final[1]&&shoot(LOOP_FINAL[1])){w.final[1]=true;this.checkExit();return true;}
      return false;
    }
    if(action.kind==='lever'&&seat===0){
      if(suspensionLeverStatus(w,p)==='ready'){
        w.suspended[0]=true;this.slideSuspension(SUSPENSION.teoX,now);return true;
      }
      if(w.observed&&!w.marks[0]&&near(p,markPosition(w,0).x,markPosition(w,0).y,68,87)){
        w.marks[0]=true;return true;
      }
      if(w.suspendedOpen&&w.stackMilestone&&w.teoUpperReached&&w.teoSummitReached&&w.climbReady
        &&allDone(w.marks)&&!w.tree[0]
        &&hasSummitFooting(p)
        &&Math.abs(p.x-LOOP_TREE[0].x)<=37){

        w.tree[0]=true;this.checkTree(now);return true;
      }
      if(w.bridge&&!w.final[0]&&near(p,LOOP_FINAL[0].x,LOOP_FINAL[0].y,70,81)){
        w.final[0]=true;this.checkExit();return true;
      }
    }
    if(action.kind==='switch'&&seat===2 && this.lastDash[2]>0
      &&now-this.lastDash[2] <= 3000 &&p.x-this.dashOrigin[2]>=105){
      if(w.lastRoute==='right'&&w.suspended[0]&&w.suspended[1]&&!w.suspended[2]&&
        w.suspendedTo===w.suspendedX&&near(p,SUSPENSION.nino.x,SUSPENSION.nino.y,55,73)){
        w.suspended[2]=true;this.slideSuspension(SUSPENSION.finalX,now);
        this.lastSwitch[2]=now;return true;
      }
      if(w.observed&&w.marks[0]&&w.marks[1]&&!w.marks[2]&&near(p,markPosition(w,2).x,markPosition(w,2).y,67,85)){
        w.marks[2]=true;this.lastSwitch[2]=now;return true;
      }
      if(w.suspendedOpen&&allDone(w.marks)&&!w.tree[2]&&near(p,LOOP_TREE[2].x,LOOP_TREE[2].y,65,85)){
        w.tree[2]=true;this.checkTree(now);this.lastSwitch[2]=now;return true;
      }
      if(w.bridge&&!w.final[2]&&near(p,LOOP_FINAL[2].x,LOOP_FINAL[2].y,67,85)){
        w.final[2]=true;this.checkExit();this.lastSwitch[2]=now;return true;
      }
    }
    return false;
  }
  private slideSuspension(target:number,now:number):void{
    const w=this.world;
    w.suspendedFrom=w.suspendedX;w.suspendedTo=target;w.suspendedAt=now;
  }
  private checkTree(now:number):void{
    if(allDone(this.world.tree)&&this.world.treeFallAt===0)this.world.treeFallAt=now;
  }
  private checkExit():void{
    if(allDone(this.world.final)&&this.world.layout===2)this.world.exit=true;
  }
  kill(now=Date.now()):boolean{
    return this.damage(0,now,true);
  }
  /** One host clock for all players; secure route teleports are whole-party only. */
  tick(poses:Pose[],now=Date.now()):Tick{
    const w=this.world;
    // A legal ascent is a two-stage event: detach from an actual human tower,
    // then arrive stably on the one-way elevated branch. Proximity alone cannot
    // claim success. The ledge is not reachable with a ground double-jump.
    if(w.climbReady&&!w.teoUpperReached&&w.supporting[0]===null
      &&w.blackoutUntil===0&&w.deadUntil===0&&hasBranchFooting(poses[0])){
      w.teoUpperReached=true;
      return{changed:true};
    }
    if(w.teoUpperReached&&!w.teoSummitReached&&w.supporting[0]===null
      &&w.blackoutUntil===0&&w.deadUntil===0&&hasSummitFooting(poses[0])){
      w.teoSummitReached=true;
      return{changed:true};
    }
    // Pose authority for the two supported players. No ladder passenger may
    // tunnel into a wall or one-way plank while the base moves underneath it.
    let supportChanged=false;
    const solids=w.supporting[1]!==null||w.supporting[0]!==null?stackBlockers(w):[];
    for(const seat of [1,0] as Seat[]){
      const base=w.supporting[seat];
      if(base===null)continue;
      const passenger=poses[seat],carrier=poses[base],x=carrier.x,y=carrier.y-44;
      const intersect=solids.some(b=>Math.abs(x-b.x)<b.width/2+15
        &&Math.abs(y-b.y)<b.height/2+22);
      if(intersect||w.health[seat]<=0||w.health[base]<=0){
        w.supporting[seat]=null;supportChanged=true;
        if(seat===1)w.supporting[0]=null;
        continue;
      }
      passenger.x=x;passenger.y=Math.max(30,y);
      passenger.vx=carrier.vx;passenger.vy=0;
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
      w.climbReady=false;
      const corrected=safeReposition(poses,w);
      return{changed:true,poses:corrected};
    }
    if(now-w.cycleStart>=LOOP_CYCLE_MS){
      w.blackoutUntil=now+LOOP_BLACKOUT_MS;return{changed:true};
    }
    if(w.suspendedX!==w.suspendedTo){
      const fraction=Math.max(0,Math.min(1,(now-w.suspendedAt)/SUSPENSION.moveMs));
      const smooth=fraction*fraction*(3-2*fraction);
      const position=+(w.suspendedFrom+(w.suspendedTo-w.suspendedFrom)*smooth).toFixed(2);
      if(position!==w.suspendedX){w.suspendedX=position;
        if(fraction===1&&allDone(w.suspended))w.suspendedOpen=true;
        return {changed:true};}
    }
    if(w.treeFallAt>0&&!w.bridge&&now-w.treeFallAt>=1900){
      w.bridge=true;return{changed:true};
    }
    if(w.bridge&&allDone(w.final)&&w.layout===2&&!w.exit){w.exit=true;return{changed:true};}
    if(w.exit&&w.suspendedOpen&&poses.every(p=>p.x>=11130&&p.x<=11360&&p.y>=540&&p.y<=660)){
      w.completed=true;return{changed:true,won:true};
    }
    if(w.lastRoute!=='right'&&now-w.routeAt>=3200&&allDone(w.marks)){
      for(const route of ['oca','pedra'] as const){
        if(trailOccupants(poses,route).length!==3)continue;
        const correct=ROUTES[w.layout].correct===route;
        w.lastRoute=correct?'right':'wrong';w.routeAt=now;w.routeCount++;
        const to=correct?ROUTES[w.layout].advanceTo:ROUTES[w.layout].returnTo;
        w.supporting=[null,null,null];w.climbReady=false;
        const moved=poses.map((p,i)=>({...p,x:to+i*39,y:606,vx:0,vy:0}));
        return{changed:true,poses:moved};
      }
    }
    // The false exit at the fourth sector is never a fatal trap.
    if(now-w.routeAt>=3200&&w.bridge&&poses.every(p=>near(p,10270,605,115,53)&&safeForRoute(p))
      &&w.layout!==2){
      w.lastRoute='wrong';w.routeAt=now;w.routeCount++;
      w.supporting=[null,null,null];w.climbReady=false;
      return{changed:true,poses:LOOP_START.map(p=>({...p}))};
    }
    return{changed:supportChanged};
  }
}
