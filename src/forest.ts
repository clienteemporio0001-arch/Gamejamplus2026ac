import type { Pose, Seat } from './network';
import type { PuzzleAction } from './puzzles';
import { applyDamage } from './survival';

export const FOREST_WIDTH = 4300;
export const FOREST_SPAWNS: Pose[] = ([0,1,2] as Seat[]).map(seat=>({
  seat, x:108+seat*47,y:591,vx:0,vy:0
}));
export const FOREST_CHECKPOINTS = [110,1080,2130,2900,3260] as const;
export const CABO_X = 785;
export const TREE_BASE_X = 3545;
export const FOREST_EXIT = 4160;
/** Barreiras reais que impedem saltar objetivos antes de completar a etapa. */
export const FOREST_GATES = { cabo: 1080, vines: 3140 } as const;
export const FOREST_VINES = [
  {x:1790,y:342,seat:0},
  {x:2570,y:562,seat:1},
  {x:3060,y:582,seat:2}
] as const;
export const TREE_ACTIONS = {
  teo:{x:3310,y:390},
  lia:{x:3460,y:574},
  nino:{x:3425,y:590}
} as const;

export type ForestAction = PuzzleAction | {kind:'talk'|'support'|'detach'};

export type ForestWorld = {
  caboStep:0|1|2|3|4|5;
  unlocked:boolean;
  health:[number,number,number];
  safeUntil:[number,number,number];
  supporting:[Seat|null,Seat|null,Seat|null];
  stackMilestone:boolean;
  vines:[boolean,boolean,boolean];
  treeSteps:[boolean,boolean,boolean];
  treeFallAt:number; bridge:boolean;
  checkpoint:0|1|2|3|4;
  restartAt:number; resetId:number; hazardEpoch:number;
};

const validNum=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const near=(p:Pose,x:number,y:number,dx=58,dy=76):boolean=>
  Math.abs(p.x-x)<=dx&&Math.abs(p.y-y)<=dy;
const clamp=(n:number):number=>Math.max(0,Math.min(FOREST_WIDTH,n));
/** Progressão autoritativa — uma região só libera checkpoint após a tarefa anterior. */
export function canAdvanceForest(w:ForestWorld,checkpoint:number):boolean {
  switch(checkpoint){
    case 1:return w.unlocked && w.caboStep===5;
    case 2:return w.vines[0];
    case 3:return w.vines[0]&&w.vines[1];
    case 4:return w.vines.every(Boolean);
    default:return false;
  }
}
/** Dica localizada, sem alterar autoridade de quebra-cabeças. */
export function forestHint(w:ForestWorld,seat:Seat,x:number):string {
  if(!w.unlocked){
    return x>1000?'VOLTE! Reúnam Téo, Lia e Nino no CABOQUIM e terminem o diálogo.'
      :x>590?'CABOQUIM: os 3 amigos devem ficar perto dele. Use E / CONTINUAR.'
      :'OBJETIVO: encontrem CABOQUIM DA MATA, juntos, antes de avançar.';
  }
  if(!w.vines.every(Boolean)){
    if(x>3050 && !w.vines[2] && seat===2)
      return 'NINO: recue até o raio azul e aperte Q + →. Atravesse o cipó durante o DASH.';
    if(x>FOREST_GATES.vines-170)
      return 'BARREIRA DE CIPÓS: faltam materiais ('+w.vines.filter(Boolean).length+'/3). Voltem e coletem.';
    if(seat===0&&!w.vines[0])
      return x<1230?'TÉO: vá até a árvore gigante; os amigos ajudarão você a subir.'
        :'TÉO: Lia sobe em Nino com E, você sobe em Lia com E; pule até o cipó verde alto.';
    if(seat===1&&!w.vines[1])
      return 'LIA: fique À ESQUERDA do cipó laranja e atire Q olhando para a DIREITA.';
    if(seat===2&&!w.vines[2])
      return 'NINO: comece o DASH (Q + →) no raio azul, ANTES do cipó, e atravesse-o.';
    return 'AJUDE SEUS AMIGOS: todos precisam coletar seu cipó antes do grande abismo.';
  }
  if(!w.treeSteps.every(Boolean))return [
    'ÁRVORE-PONTE: Téo ativa a corda elevada com E.',
    'ÁRVORE-PONTE: Lia corta a amarra com Q, olhando para a direita.',
    'ÁRVORE-PONTE: Nino usa DASH vindo da esquerda e E junto à raiz.'
  ][w.treeSteps.findIndex(x=>!x)] ?? 'Concluam os 3 mecanismos.';
  return w.bridge?'PONTE PRONTA! Os três devem cruzar juntos para a CASA.'
    :'A ÁRVORE ESTÁ CAINDO! Aguarde formar uma ponte sólida.';
}
export function initialForest(epoch=Date.now()):ForestWorld {
  return {
    caboStep:0,unlocked:false,health:[3,3,3],safeUntil:[0,0,0],
    supporting:[null,null,null],stackMilestone:false,
    vines:[false,false,false],treeSteps:[false,false,false],
    treeFallAt:0,bridge:false,checkpoint:0,
    restartAt:0,resetId:0,hazardEpoch:epoch,
  };
}
export function validForest(value:unknown):value is ForestWorld {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const f=value as Record<string,unknown>;
  return Number.isInteger(f.caboStep)&&Number(f.caboStep)>=0&&Number(f.caboStep)<=5
    && typeof f.unlocked==='boolean'
    && Array.isArray(f.health)&&f.health.length===3&&f.health.every(x=>Number.isInteger(x)&&x>=0&&x<=3)
    && Array.isArray(f.safeUntil)&&f.safeUntil.length===3&&f.safeUntil.every(validNum)
    && Array.isArray(f.supporting)&&f.supporting.length===3
    && f.supporting.every((x:unknown,i:number)=>
      x===null||(i===0&&x===1)||(i===1&&x===2))
    && typeof f.stackMilestone==='boolean'
    && Array.isArray(f.vines)&&f.vines.length===3&&f.vines.every(x=>typeof x==='boolean')
    && Array.isArray(f.treeSteps)&&f.treeSteps.length===3&&f.treeSteps.every(x=>typeof x==='boolean')
    && validNum(f.treeFallAt)&&typeof f.bridge==='boolean'
    && Number.isInteger(f.checkpoint)&&Number(f.checkpoint)>=0&&Number(f.checkpoint)<=4
    && validNum(f.restartAt)&&Number.isInteger(f.resetId)&&Number(f.resetId)>=0
    && validNum(f.hazardEpoch);
}
/** Retorna a colisão de cobra ou galho somente no instante de perigo definido pelo host. */
export function forestDanger(x:number,y:number,epoch:number,now:number):'snake'|'branch'|null{
  if(y<538)return null;
  if(([990,2390] as const).some(c=>Math.abs(x-c)<=36))return 'snake';
  const elapsed=Math.max(0,now-epoch)%5200;
  if(elapsed>=3600&&elapsed<=4460 && Math.abs(x-2720)<55)return 'branch';
  return null;
}
export function branchWarning(epoch:number,now:number):'safe'|'warn'|'fall'{
  const phase=Math.max(0,now-epoch)%5200;
  return phase>=2750&&phase<3600?'warn':phase>=3600&&phase<=4460?'fall':'safe';
}
export class ForestAuthority {
  world:ForestWorld=initialForest();
  private lastCabo=0;
  private dashOrigin=0;
  private dashAt=0;
  private treeDashOrigin=0;
  private treeDashAt=0;
  private lastShot=0;
  reset(now=Date.now()):void {
    const previousId=this.world.resetId;
    this.world=initialForest(now);
    this.world.resetId=previousId+1;
    this.lastCabo=0;this.dashOrigin=0;this.dashAt=0;
    this.treeDashOrigin=0;this.treeDashAt=0;this.lastShot=0;
  }
  act(seat:Seat,a:ForestAction,poses:Pose[],now=Date.now()):boolean {
    const w=this.world,p=poses[seat];
    if(!p||p.seat!==seat||w.restartAt>0)return false;
    if(a.kind==='talk'){
      if(!poses.every(q=>near(q,CABO_X,590,145,85))||now-this.lastCabo<420||w.caboStep>=5)return false;
      this.lastCabo=now;
      w.caboStep=(w.caboStep+1) as ForestWorld['caboStep'];
      if(w.caboStep===5)w.unlocked=true;
      return true;
    }
    if(a.kind==='support'){
      if(!w.unlocked||p.x<1270||p.x>1900||w.supporting[seat]!==null)return false;
      const base=(seat===0?1:seat===1?2:null) as Seat|null;
      if(base===null||w.supporting[base]===seat)return false;
      const b=poses[base];
      if(!near(p,b.x,b.y,49,58)||Math.abs(p.vx)>115||Math.abs(b.vx)>115)return false;
      if(seat===0&&w.supporting[1]!==2)return false;
      w.supporting[seat]=base;
      if(w.supporting[0]===1&&w.supporting[1]===2)w.stackMilestone=true;
      return true;
    }
    if(a.kind==='detach'){
      if(w.supporting[seat]===null)return false;
      w.supporting[seat]=null;
      if(seat===1)w.supporting[0]=null;
      return true;
    }
    if(a.kind==='dash'){
      if(seat!==2)return false;
      if(p.x>=2840&&p.x<=3020){this.dashOrigin=p.x;this.dashAt=now;}
      if(p.x>3170&&p.x<3335){this.treeDashOrigin=p.x;this.treeDashAt=now;}
      return false;
    }
    if(!w.unlocked)return false;
    if(a.kind==='collect'){
      if(seat===0&&!w.vines[0]&&w.stackMilestone&&near(p,FOREST_VINES[0].x,FOREST_VINES[0].y,74,85)){
        w.vines[0]=true;return true;
      }
      if(seat===2&&!w.vines[2]&&near(p,FOREST_VINES[2].x,FOREST_VINES[2].y,58,85)
        &&this.dashAt>0&&now-this.dashAt<=1750&&p.x-this.dashOrigin>=95){
        w.vines[2]=true;return true;
      }
      return false;
    }
    if(a.kind==='shoot'&&seat===1&&a.facing===1&&now-this.lastShot>=470){
      this.lastShot=now;
      const hit=(x:number,y:number)=>x>p.x&&x-p.x<=350&&Math.abs(p.y-18-y)<65;
      if(!w.vines[1]&&hit(FOREST_VINES[1].x,FOREST_VINES[1].y)){
        w.vines[1]=true;return true;
      }
      if(w.vines.every(Boolean)&&w.treeSteps[0]&&!w.treeSteps[1]
        &&hit(TREE_ACTIONS.lia.x,TREE_ACTIONS.lia.y)){
        w.treeSteps[1]=true;return this.fallTree(now);
      }
      return false;
    }
    if(a.kind==='lever'&&seat===0&&w.vines.every(Boolean)&&!w.treeSteps[0]
      &&near(p,TREE_ACTIONS.teo.x,TREE_ACTIONS.teo.y,62,84)){
      w.treeSteps[0]=true;return true;
    }
    if(a.kind==='switch'&&seat===2&&w.treeSteps[0]&&w.treeSteps[1]
      &&!w.treeSteps[2]&&near(p,TREE_ACTIONS.nino.x,TREE_ACTIONS.nino.y,60,82)
      &&this.treeDashAt>0&&now-this.treeDashAt<1250&&p.x-this.treeDashOrigin>=95){
      w.treeSteps[2]=true;return this.fallTree(now);
    }
    return false;
  }
  private fallTree(now:number):boolean {
    const w=this.world;
    if(w.vines.every(Boolean)&&w.treeSteps.every(Boolean)&&w.treeFallAt===0){
      w.treeFallAt=now;return true;
    }
    return true;
  }
  damage(seat:Seat,now=Date.now(),fatal=false):boolean {
    const w=this.world;
    if(w.restartAt>0||w.safeUntil[seat]>now)return false;
    const applied=applyDamage(w,seat,now,fatal);
    if(applied&&w.restartAt>0)w.supporting=[null,null,null];
    return applied;
  }
  tick(poses:Pose[],now=Date.now()):{changed:boolean;reset:boolean}{
    const w=this.world;let changed=false;
    if(w.caboStep===0 && poses.every(p=>near(p,CABO_X,590,145,85))) {
      w.caboStep=1;changed=true;this.lastCabo=now;
    }
    if(w.restartAt>0){
      if(now<w.restartAt)return{changed:false,reset:false};
      this.reset(now);return{changed:true,reset:true};
    }
    if(w.treeFallAt>0&&!w.bridge&&now-w.treeFallAt>=1900){
      w.bridge=true;changed=true;
    }
    // A vinculação física é autoritativa: clientes renderizam em cima da pose do suporte.
    for(const seat of [1,0] as Seat[]){
      const b=w.supporting[seat];if(b===null)continue;
      const p=poses[seat],base=poses[b];
      p.x=clamp(base.x);p.y=Math.max(30,base.y-44);p.vx=base.vx;p.vy=0;
    }
    const cp=[1080,2130,2900,3260];
    for(let i=cp.length-1;i>=0;i--){
      if(w.checkpoint<i+1 && canAdvanceForest(w,i+1) && poses.every(p=>p.x>=cp[i])){
        w.checkpoint=(i+1) as ForestWorld['checkpoint'];changed=true;break;
      }
    }
    return{changed,reset:false};
  }
  hasWon(poses:Pose[]):boolean {
    const w=this.world;
    return w.caboStep===5&&w.unlocked&&w.vines.every(Boolean)
      &&w.treeSteps.every(Boolean)&&w.bridge&&w.restartAt===0
      &&w.health.every(h=>h>0)
      &&poses.every(p=>p.x>=4090&&p.x<=FOREST_WIDTH&&p.y>=520&&p.y<=675);
  }
}
