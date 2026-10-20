/** Detect an indefinitely stalled HTML5 intro/finale without conflating normal
 * buffering with a dead video. No DOM, no Phaser, easy to regression-test.
 */
export const CINEMATIC_STALL_MS=14000;
export class CinematicProgressWatch{
 private lastProgress:number;
 private lastMediaTime=0;
 constructor(startedAt:number){this.lastProgress=startedAt;}
 /** Return true only after 14s with no playable progress while visible. */
 sample(mediaTime:number,now:number,tabHidden=false):boolean{
   if(tabHidden){
     // Background throttling is not a broken video.
     this.lastProgress=now;return false;
   }
   if(Number.isFinite(mediaTime)&&mediaTime>this.lastMediaTime+.075){
     this.lastMediaTime=mediaTime;this.lastProgress=now;
   }
   return now-this.lastProgress>=CINEMATIC_STALL_MS;
 }
}
