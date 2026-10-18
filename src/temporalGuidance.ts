import type {Seat,Pose} from './network';
import {TEMP_ECHO,TEMP_TREE,TEMP_ROOTS,type TemporalWorld,tempNear} from './temporalForest';
export const TEMP_MARK_NAMES=[
 'ÁRVORE ENCHARCADA','PEDRA FENDIDA','ARCO DE RAÍZES'
] as const;
export type TemporalHint={label:string;action:string;targetX:number;targetY:number};
/** World-space contextual guidance matched to the actual authoritative action geometry. */
export function temporalHint(w:TemporalWorld,seat:Seat,p:Pose,now:number):TemporalHint|null{
 if(w.completed||w.deadUntil>0||w.blackoutUntil>now)return null;
 if(!w.echo.every(Boolean)){
  if(w.echo[seat])return null;
  const point=TEMP_ECHO[seat], dx=point.x-p.x;
  if(seat===0&&tempNear(p,point.x,point.y,125,120))
   return {label:'ÁRVORE ENCHARCADA',action:'TÉO · E: EXAMINE O MARCO',targetX:point.x,targetY:point.y};
  if(seat===1&&Math.abs(dx)<=380&&Math.abs(p.y-18-point.y)<=80){
   return {label:'PEDRA FENDIDA',action:
    dx>=0&&dx<=360?'LIA · J: ACERTE A FENDA':'LIA · ATIRE PELA ESQUERDA',targetX:point.x,targetY:point.y};
  }
  if(seat===2&&dx<=250&&dx>=-95&&Math.abs(p.y-point.y)<=92){
   const ready=now-w.dashAt<3200&&p.x-w.dashX>=95;
   return {label:'ARCO DE RAÍZES',action:ready?'NINO · E: LIBERE A RAIZ':
    'NINO · PARTA DA ESQUERDA, DASH → E',targetX:point.x,targetY:point.y};
  }
  return null;
 }
 if(!w.bridge){
  if(seat===0&&Math.abs(p.x-TEMP_TREE[0].x)<200){
   return {label:'GALHO DA ÁRVORE-PONTE',action:!w.stacked?'E · NINO APOIA LIA, LIA APOIA TÉO':
    !w.teoLanded?'TÉO · SALTO DUPLO: PRIMEIRO GALHO':
    !w.teoSummitReached?'TÉO · SALTO DUPLO: GALHO SUPERIOR':'TÉO · E: SOLTE A AMARRA',
     targetX:TEMP_TREE[0].x,targetY:TEMP_TREE[0].y};
  }
  if(seat===1&&p.x>=TEMP_TREE[1].x-360&&p.x<TEMP_TREE[1].x-40)
   return {label:'CIPÓ ENCHARCADO',action:'LIA · J: ACERTE O CIPÓ',targetX:TEMP_TREE[1].x,targetY:TEMP_TREE[1].y};
  if(seat===2&&Math.abs(p.x-TEMP_TREE[2].x)<=205)
   return {label:'RAIZ PRESA',action:'NINO · DASH → E: SOLTE A RAIZ',
     targetX:TEMP_TREE[2].x,targetY:TEMP_TREE[2].y};
  return null;
 }
 if(!w.roots[seat]&&Math.abs(p.x-TEMP_ROOTS[seat].x)<=200){
  const action=w.layout!==2?'ESPERE A CONFIGURAÇÃO C':
   seat===0?'TÉO · E: LIBERE A RAIZ ALTA':
   seat===1?'LIA · J: ACERTE A RAIZ':'NINO · DASH → E: ACIONE A RAIZ';
  return {label:'RAÍZES DA TEMPESTADE',action,targetX:TEMP_ROOTS[seat].x,targetY:TEMP_ROOTS[seat].y};
 }
 return null;
}
