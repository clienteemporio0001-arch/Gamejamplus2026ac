import type { Seat } from './network';
import { LOOP_MARKS, LOOP_TREE, LOOP_FINAL, LOOP_GEOMETRY, UPPER_BRANCH, upperLandingY, allDone, windGuide,
  type LoopWorld } from './forestLoop';

/** UI copy is pure data: no world coordinates are used for the fixed-screen HUD. */
export type LoopObjective={title:string;progress:string};
export function loopObjective(w:LoopWorld):LoopObjective{
  if(w.completed)return {title:'A equipe encontrou a saída.',progress:'3 / 3'};
  if(!w.observed)return {title:'Observe os marcos da floresta.',progress:'Memorize os três'};
  if(!allDone(w.marks))return {title:'Algo mudou. Sigam o vento.',progress:'Marcos '+w.marks.filter(Boolean).length+'/3'};
  if(w.lastRoute!=='right')return {title:'Encontrem a passagem verdadeira.',progress:'Três amigos juntos'};
  if(!w.bridge)return {title:'Trabalhem juntos para derrubar a árvore.',progress:'Amarras '+w.tree.filter(Boolean).length+'/3'};
  if(!allDone(w.final))return {title:'Destravem a saída juntos.',progress:'Travas '+w.final.filter(Boolean).length+'/3'};
  if(!w.exit)return {title:'Aguardem a floresta C.',progress:'Travas 3/3'};
  return {title:'Reúnam os três na saída.',progress:'Equipe 0/3'};
}
export const regionTitle=(x:number):string=>
  x<1550?'FLORESTA DAS REPETIÇÕES':
  x<LOOP_GEOMETRY.gate?'CLAREIRA CENTRAL':
  x<2910?'ÁRVORE SUSPENSA':'CAMINHO DA SAÍDA';

/** Only one interaction prompt, within reach, for the currently selected character. */
export function loopContext(w:LoopWorld,seat:Seat,x:number,y:number,now=Date.now()):string{
  if(w.completed||w.deadUntil>0||w.blackoutUntil>now)return '';
  const near=(tx:number,ty:number,radius=100,dy=100)=>
    Math.abs(x-tx)<=radius&&Math.abs(y-ty)<=dy;
  if(w.observed&&!w.marks[seat]){
    const point=LOOP_MARKS[seat];
    if(seat===0&&near(point.x,point.y,90,90))return 'E · Investigar árvore oca';
    if(seat===1&&near(point.x-150,604,125,85))return 'J · Acertar pedra rachada';
    if(seat===2&&near(point.x-155,604,115,85))return 'SHIFT → E · Tronco em arco';
  }
  if(allDone(w.marks)&&w.lastRoute!=='right'){
    if(near(LOOP_GEOMETRY.portal.oca,606,135,85))return 'Passagem da árvore oca · Reúnam os três';
    if(near(LOOP_GEOMETRY.portal.pedra,606,135,85))return 'Passagem da pedra rachada · Reúnam os três';
  }
  if(w.lastRoute==='right'&&!w.bridge){
    if(seat===0&&!w.tree[0]&&w.teoUpperReached
      &&near(LOOP_TREE[0].x,upperLandingY,46,9))return 'E · Soltar amarra no galho alto';
    if(seat===0&&!w.tree[0]&&w.stackMilestone&&!w.teoUpperReached
      &&near(UPPER_BRANCH.x,520,115,66))return 'ESPAÇO → ESPAÇO · Salto duplo até o galho';
    if(seat===1&&!w.tree[1]&&near(LOOP_TREE[1].x-150,606,115,85))return 'J · Acertar amarra';
    if(seat===2&&!w.tree[2]&&near(LOOP_TREE[2].x-143,606,105,85))return 'SHIFT → E · Soltar raiz';
    if(!w.stackMilestone&&near(2090,605,150,110))return 'E · Lia sobe em Nino, depois Téo em Lia';
  }
  if(w.bridge&&!w.final[seat]){
    if(seat===0&&near(LOOP_FINAL[0].x,LOOP_FINAL[0].y,90,95))return 'E · Primeira trava';
    if(seat===1&&near(LOOP_FINAL[1].x-155,606,115,85))return 'J · Segunda trava';
    if(seat===2&&near(LOOP_FINAL[2].x-145,606,105,85))return 'SHIFT → E · Trava final';
  }
  if(w.exit&&x>3600)return 'Saída aberta · Reúnam os três';
  return '';
}
export function loopWind(w:LoopWorld,seat:Seat,x:number):string{
  const guide=windGuide(w,seat,x);
  return guide.direction<0?'◀ VENTO':guide.direction>0?'VENTO ▶':'VENTO ≈';
}
