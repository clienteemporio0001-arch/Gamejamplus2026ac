/** Cosmetic-only chickens from Shepardskin's CC0 Chicken Sprites.
 * These deterministic paths do not interact with game physics, damage,
 * puzzles, checkpoints, rankings or WebRTC state.
 */
export type ChickenPath={
  from:number;to:number;groundY:number;speed:number;offsetMs:number;
};
export type ChickenPose={x:number;groundY:number;flipX:boolean;frame:0|1|2|3};
/** Corridors intentionally avoid the actual terrain gaps. */
export const CHICKEN_PATHS:Readonly<Record<1|2,readonly ChickenPath[]>>={
  1:[
    {from:2620,to:2800,groundY:638,speed:74,offsetMs:600},
    {from:5290,to:5540,groundY:638,speed:88,offsetMs:900},
    {from:5770,to:6010,groundY:638,speed:100,offsetMs:1800},
    {from:6850,to:7050,groundY:638,speed:86,offsetMs:1450},
    {from:9950,to:10150,groundY:638,speed:84,offsetMs:2300}
  ],
  2:[
    {from:330,to:560,groundY:638,speed:80,offsetMs:350},
    {from:1960,to:2130,groundY:638,speed:91,offsetMs:1200},
    {from:3010,to:3210,groundY:638,speed:79,offsetMs:1850},
    {from:3620,to:3820,groundY:638,speed:87,offsetMs:800}
  ]
};
/** Reversible triangle-wave patrol, always on-screen-local, no random timers. */
export function chickenPose(path:ChickenPath,elapsedMs:number):ChickenPose{
  const length=Math.max(1,path.to-path.from);
  const t=Math.max(0,elapsedMs+path.offsetMs);
  const traveled=(t*path.speed/1000)%(2*length);
  // Floating-point rounding at the exact turn must not postpone flipping.
  const right=traveled<length-1e-7;
  const x=path.from+(right?traveled:2*length-traveled);
  return {
    x,groundY:path.groundY,flipX:!right,
    frame:(Math.floor(t/120)%4) as 0|1|2|3
  };
}
