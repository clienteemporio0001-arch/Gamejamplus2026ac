import type {Seat} from './network';

/** The Phaser scene already adds platform colliders for the local hero.
 * Other solo heroes need independent Arcade colliders—even when the
 * player enters a new stage controlling Lia or Nino instead of Téo.
 */
export function needsSoloPlatformColliders(seat:Seat,initialLocalSeat:Seat|null):boolean {
 return seat!==initialLocalSeat;
}
