import type { Seat,Pose } from './network';
import {exitMessage} from './sharedExit';
import { LOOP_MARKS, LOOP_TREE, LOOP_FINAL, LOOP_GEOMETRY, UPPER_BRANCH, upperLandingY, summitLandingY, allDone, windGuide,
  SUSPENSION,SUSPENSION_LANDING_Y,markPosition,trailOccupants,correctRoute,TRAIL_MEET_RADIUS_X,canStack,suspensionLeverStatus,SUSPENSION_LEVER_FEEDBACK,type LoopWorld } from './forestLoop';

/** UI copy is pure data: no world coordinates are used for the fixed-screen HUD. */
export type LoopObjective={title:string;progress:string};
export function loopObjective(w:LoopWorld,poses:readonly Pose[]=[]):LoopObjective{
  if(w.completed)return {title:'A equipe encontrou a saída.',progress:'3 / 3'};
  if(!w.observed)return {title:'Observe os marcos da floresta.',progress:'Memorize os três'};
  if(!allDone(w.marks))return {title:'Algo mudou. Sigam o vento.',progress:'Marcos '+w.marks.filter(Boolean).length+'/3'};
  if(w.lastRoute!=='right'){
    const route=correctRoute(w.layout),count=trailOccupants(poses,route).length;
    return {title:'TRILHAS LIBERADAS! SIGAM O VENTO.',
      progress:'SIGAM O VENTO · '+count+'/3 AMIGOS'};
  }
  if(!w.suspendedOpen)return {title:'Movam juntos a plataforma suspensa.',
    progress:'Mecanismos '+w.suspended.filter(Boolean).length+'/3'};
  if(!w.bridge)return {title:'Trabalhem juntos para derrubar a árvore.',progress:'Amarras '+w.tree.filter(Boolean).length+'/3'};
  if(!allDone(w.final))return {title:'Destravem a saída juntos.',progress:'Travas '+w.final.filter(Boolean).length+'/3'};
  if(!w.exit)return {title:'As três travas abrirão o caminho.',progress:'Travas 3/3'};
  return {title:'TRILHA PARA A FLORESTA TEMPORAL',progress:exitMessage(1,poses,w.health,true)};
}
export const regionTitle=(x:number):string=>
  x<2050?'BOSQUE DA ÁRVORE OCA':
  x<3950?'VALE DA PEDRA RACHADA':
  x<5100?'ARCO DE MADEIRA':
  x<6500?'CLAREIRA CENTRAL':
  x<LOOP_GEOMETRY.gate?'RAÍZES MUTÁVEIS':
  x<SUSPENSION.gapEnd?'PLATAFORMA SUSPENSA':
  x<LOOP_GEOMETRY.chasm.end?'ÁRVORE-PONTE':
  'TRILHA DA SAÍDA';

/** Only one interaction prompt, within reach, for the currently selected character. */
export function loopContext(w:LoopWorld,seat:Seat,x:number,y:number,now=Date.now(),poses:readonly Pose[]=[]):string{
  if(w.completed||w.deadUntil>0||w.blackoutUntil>now)return '';
  const near=(tx:number,ty:number,radius=100,dy=100)=>
    Math.abs(x-tx)<=radius&&Math.abs(y-ty)<=dy;
  if(w.observed&&!w.marks[seat]&&w.marks.slice(0,seat).every(Boolean)){
    const point=markPosition(w,seat);
    if(seat===0&&near(point.x,point.y,90,90))return 'E · Investigar árvore oca';
    if(seat===1&&near(point.x-150,604,125,85))return 'J · Acertar pedra rachada';
    if(seat===2&&near(point.x-155,604,115,85))return 'SHIFT → E · Tronco em arco';
  }
  if(allDone(w.marks)&&w.lastRoute!=='right'){
    for(const route of ['oca','pedra'] as const){
      const center=LOOP_GEOMETRY.portal[route];
      if(!near(center,606,TRAIL_MEET_RADIUS_X,86))continue;
      const count=trailOccupants(poses,route).length;
      const name=route==='oca'?'ÁRVORE OCA':'PEDRA RACHADA';
      return 'REÚNAM OS TRÊS AQUI · '+name+' · '+count+'/3 AMIGOS';
    }
  }
  if(w.lastRoute==='right'&&!w.suspendedOpen){
    if(seat===0&&!w.suspended[0]&&
      Math.abs(x-SUSPENSION.lever.x)<=190){
      const current=poses[seat]??{seat,x,y,vx:0,vy:0};
      if(canStack(w,seat,poses))return 'E · Téo sobe em Lia, sobre Nino';
      const status=suspensionLeverStatus(w,{...current,x,y});
      return status==='ready'?'E / USAR · Puxar cipós da passarela':
        SUSPENSION_LEVER_FEEDBACK[status];
    }
    if(seat===1&&w.suspended[0]&&!w.suspended[1]&&
      near(SUSPENSION.lia.x-165,606,125,90))return 'J · Soltar trava suspensa';
    if(seat===2&&w.suspended[0]&&w.suspended[1]&&!w.suspended[2]&&
      near(SUSPENSION.nino.x-137,606,110,85))return 'SHIFT → E · Fixar plataforma';
    if(!w.suspensionStacked&&near(SUSPENSION.lever.x-50,606,155,85))
      return 'E · Lia sobe em Nino, depois Téo em Lia';
    if(w.suspended.every(Boolean)&&!w.suspendedOpen)
      return 'AGUARDEM · Cipós movendo a plataforma';
  }
  if(w.lastRoute==='right'&&w.suspendedOpen&&!w.bridge){
    if(seat===0&&!w.tree[0]&&w.teoSummitReached
      &&near(LOOP_TREE[0].x,summitLandingY,46,9))return 'E · Soltar amarra no galho alto';
    if(seat===0&&!w.tree[0]&&w.teoUpperReached&&!w.teoSummitReached&&near(UPPER_BRANCH.x,upperLandingY,100,20))return 'SALTO DUPLO NOVAMENTE · Galho superior';
    if(seat===0&&!w.tree[0]&&w.stackMilestone&&!w.teoUpperReached
      &&near(UPPER_BRANCH.x,520,115,66))return 'ESPAÇO → ESPAÇO · Salto duplo até o galho';
    if(seat===1&&!w.tree[1]&&near(LOOP_GEOMETRY.chasm.start-55,606,115,85))return 'J · Acertar amarra';
    if(seat===2&&!w.tree[2]&&near(LOOP_TREE[2].x-143,606,105,85))return 'SHIFT → E · Soltar raiz';
    if(!w.stackMilestone&&near(9290,605,150,110))return 'E · Lia sobe em Nino, depois Téo em Lia';
  }
  if(w.bridge&&!w.final[seat]){
    if(seat===0&&near(LOOP_FINAL[0].x,LOOP_FINAL[0].y,90,95))return 'E · Primeira trava';
    if(seat===1&&near(LOOP_FINAL[1].x-155,606,115,85))return 'J · Segunda trava';
    if(seat===2&&near(LOOP_FINAL[2].x-145,606,105,85))return 'SHIFT → E · Trava final';
  }
  if(w.exit&&x>11000)return 'Saída aberta · Reúnam os três';
  if((seat===0||seat===1)&&w.supporting[seat]!==null)return 'E · Soltar do apoio humano';
  if((seat===0||seat===1)&&poses.length===3&&canStack(w,seat,poses))
    return seat===1?'E · Lia sobe em Nino':'E · Téo sobe em Lia';
  return '';
}
export function loopWind(w:LoopWorld,seat:Seat,x:number):string{
  const guide=windGuide(w,seat,x);
  return guide.direction<0?'◀ VENTO':guide.direction>0?'VENTO ▶':'VENTO ≈';
}
