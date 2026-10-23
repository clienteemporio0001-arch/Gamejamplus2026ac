import {LOOP_PHYSICS,SUSPENSION} from './forestLoop';

/** A tábua é uma superfície física mesmo durante os 3 deslocamentos.
 * O transporte é calculado por snapshot (nunca por FPS) e somente para
 * quem realmente está com os pés sobre a passarela, acima do vão. */
export const SUSPENSION_CENTER_Y=656;
export const SUSPENSION_TOP_Y=SUSPENSION_CENTER_Y-SUSPENSION.height/2;
export const SUSPENSION_RIDER_Y=SUSPENSION_TOP_Y-LOOP_PHYSICS.characterHeight/2;
export type RiderPose={x:number;y:number;vy:number;grounded:boolean};

/** Retorna o deslocamento horizontal a aplicar aos corpos de Arcade. */
export function suspendedRideDelta(previousX:number,nextX:number,p:RiderPose):number{
 const dx=nextX-previousX;
 if(!dx||!Number.isFinite(dx)||Math.abs(dx)>180)return 0;
 // A estrada fixa sobrepõe parte da tábua, mas nunca deve ser arrastada.
 if(p.x<SUSPENSION.gapStart-12||p.x>SUSPENSION.gapEnd+12)return 0;
 if(Math.abs(p.x-previousX)>SUSPENSION.width/2-12)return 0;
 if(Math.abs(p.y-SUSPENSION_RIDER_Y)>5||Math.abs(p.vy)>110)return 0;
 if(!p.grounded)return 0;
 return dx;
}
