import type { Seat } from './network';

/** Única regra de dano e invulnerabilidade reutilizada nas fases 1 e 2. */
export type Hearts = [number,number,number];
export type SafeTimes = [number,number,number];
export interface Survivor {
  health: Hearts;
  safeUntil: SafeTimes;
  restartAt: number;
}
export function applyDamage(w: Survivor, seat: Seat, now: number, fatal=false): boolean {
  if(w.restartAt>0 || w.safeUntil[seat]>now)return false;
  w.health[seat]=fatal?0:Math.max(0,w.health[seat]-1);
  w.safeUntil[seat]=now+1200;
  if(w.health[seat]===0)w.restartAt=now+3200;
  return true;
}
export const allAlive=(state:Survivor)=>state.restartAt===0&&state.health.every(h=>h>0);
