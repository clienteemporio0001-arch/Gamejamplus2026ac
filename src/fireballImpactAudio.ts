import {
  FIREBALL_INTERVAL,FIREBALL_WARNING,FIREBALL_FALL,FIREBALL_IMPACT,
  fireballHazards,type FireWorld,type Fireball
} from './burningForest';

/** Detect the beginning of each *authoritative* fireball impact once per lane
 * and cycle. Uses the same host world clock as the falling sprites and damage.
 * No new gameplay state or peer messages are needed.
 */
export class FireballImpactTracker {
  private initialized=false;
  private heard=new Map<number,string>();

  sample(world:FireWorld,now:number):Fireball[]{
    const impacts:Fireball[]=[];
    for(const ball of fireballHazards(world,now)){
      if(ball.phase!=='impact')continue;
      const delay=1200+(ball.lane*977)%4300;
      const elapsed=now-world.cycleStart-delay;
      if(elapsed<0)continue;
      const cycle=Math.floor(elapsed/FIREBALL_INTERVAL);
      const inCycle=elapsed%FIREBALL_INTERVAL;
      const impactAge=inCycle-FIREBALL_WARNING-FIREBALL_FALL;
      const key=world.cycleStart+':'+cycle;
      if(this.heard.get(ball.lane)===key)continue;
      this.heard.set(ball.lane,key);
      // The first frame can occur during a reconnect, so don't replay an
      // impact already in progress. Likewise ignore late impacts after a tab
      // was suspended: there is no retroactive explosion sound.
      if(this.initialized&&impactAge>=0&&impactAge<Math.min(310,FIREBALL_IMPACT))
        impacts.push(ball);
    }
    this.initialized=true;
    return impacts;
  }
}
