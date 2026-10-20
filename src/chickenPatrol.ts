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
  // Just one chicken per map, close to the starting area on safe ground.
  1:[{from:5770,to:6010,groundY:638,speed:100,offsetMs:1800}],
  2:[{from:1960,to:2130,groundY:638,speed:91,offsetMs:1200}]
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
    // Original GIF faces left: flip its image while running right.
    x,groundY:path.groundY,flipX:right,
    frame:(Math.floor(t/120)%4) as 0|1|2|3
  };
}
