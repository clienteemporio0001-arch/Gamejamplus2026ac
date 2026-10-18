import { LOOP_WIDTH, windGuide, type LoopWorld } from './forestLoop';

/** Deterministic world-space leaves; no character pose or camera offset here. */
export const WIND_LEAVES=25;
export function leafAt(w:LoopWorld,index:number,ms:number):{
  x:number;y:number;direction:-1|0|1;angle:number
}{
  const baseX=110+index*145;
  const direction=windGuide(w,0,baseX).direction;
  const lane=116;
  const speed=direction===0?0:0.038;
  const distance=((ms*speed+index*41)%lane+lane)%lane;
  const delta=direction===1?distance-lane/2:direction===-1?lane/2-distance:
    Math.sin(ms/1900+index*.83)*9;
  return {
    x:Math.min(LOOP_WIDTH-15,Math.max(15,baseX+delta)),
    y:340+(index%5)*43+Math.sin(ms/880+index*1.3)*9,
    direction,angle:direction<0?Math.PI-.25:direction>0?.25:Math.sin(ms/1300+index)*.3,
  };
}
/** Foliage and vines respond to the same public windGuide at their world anchor. */
export function swayAt(w:LoopWorld,worldX:number,ms:number,index:number):number{
  const direction=windGuide(w,0,worldX).direction;
  return Math.sin(ms/1400+index*.73)*(direction===0?.025:.065)+direction*.065;
}
