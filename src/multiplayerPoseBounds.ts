import {FOREST_WIDTH} from './forest';
import {RIVER_WIDTH} from './riverJourney';
import {LOOP_WIDTH} from './forestLoop';
import {TEMP_WIDTH} from './temporalForest';
import {TREE_WIDTH,TREE_HEIGHT} from './treetopForest';
import {FIRE_WIDTH,FIRE_HEIGHT} from './burningForest';

/** Shared room-coordinate limits. Never confuse the 4,300px legacy map
 * with the 11,400px main adventure: doing so moves remote players offscreen.
 * Client reporting and host validation MUST use this same calculation. */
export function multiplayerPoseBounds(mode:'classic'|'loop',level:1|2|3|4):
 {width:number;height:number}{
 if(mode==='loop'){
  switch(level){
   case 1:return {width:LOOP_WIDTH,height:900};
   case 2:return {width:TEMP_WIDTH,height:900};
   case 3:return {width:TREE_WIDTH,height:TREE_HEIGHT+250};
   case 4:return {width:FIRE_WIDTH,height:FIRE_HEIGHT+200};
  }
 }
 return {width:level===1?FOREST_WIDTH:level===2?RIVER_WIDTH:1200,height:700};
}
