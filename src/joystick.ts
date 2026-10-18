/** Pure virtual-stick math, independent from Phaser and DOM. */
export const JOYSTICK_DEAD_ZONE=.15;
export function clampAxis(value:number):number{
 return Number.isFinite(value)?Math.max(-1,Math.min(1,value)):0;
}
export function stickAxis(dx:number,dy:number,radius:number):{x:number;y:number;knobX:number;knobY:number}{
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||radius<=0)return{x:0,y:0,knobX:0,knobY:0};
 const distance=Math.hypot(dx,dy), scale=Math.min(1,radius/Math.max(.01,distance));
 const nx=dx*scale/radius,ny=dy*scale/radius;
 const length=Math.hypot(nx,ny);
 const response=length<=JOYSTICK_DEAD_ZONE?0:
   (length-JOYSTICK_DEAD_ZONE)/(1-JOYSTICK_DEAD_ZONE);
 return{x:clampAxis(nx/Math.max(length,.00001)*response),
   y:clampAxis(ny/Math.max(length,.00001)*response),
   knobX:dx*scale,knobY:dy*scale};
}
