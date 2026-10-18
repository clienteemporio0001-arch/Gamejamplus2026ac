import {TEMP_WIDTH,tempWind,type TemporalWorld} from './temporalForest';
export type Drop={x:number;y:number;dx:number;len:number;opacity:number};
const mod=(n:number,m:number)=>((n%m)+m)%m;
/** Fixed world emitters: never read the player or the camera. */
export function temporalDrop(w:TemporalWorld,index:number,ms:number,layer:0|1|2):Drop{
 const count=layer===0?63:layer===1?98:42;
 const baseX=mod(index*159.7+layer*97.3,TEMP_WIDTH-25)+12;
 const speed=[.28,.50,.76][layer];
 const y=mod(index*109.3+ms*speed+layer*171,680);
 const direction=tempWind(w,baseX);
 const intensity=w.layout===2?1.65:w.layout===1?1.3:1;
 const dx=direction*[5,10,19][layer]*intensity;
 const len=[9,15,25][layer]*intensity;
 void count;
 return {x:baseX,y,dx,len,opacity:[.14,.29,.50][layer]};
}
export function rainBudget(mobile:boolean):readonly [number,number,number]{
 return mobile?[34,52,18]:[63,98,42];
}
export function rippleAt(index:number,time:number):{radius:number;alpha:number}{
 const progress=mod(time*.0023+index*.147,1);
 return {radius:4+progress*24,alpha:.27*(1-progress)};
}
