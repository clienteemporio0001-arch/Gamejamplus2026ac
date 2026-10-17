import { PuzzleAuthority, PICKUPS, LEVER, TARGET, PEDAL, SWITCH, TIMER_MS } from '../src/puzzles';
import type { Pose, Seat } from '../src/network';

function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new Error('FALHA: ' + message); }
const start = (): Pose[] => [0, 1, 2].map(seat => ({ seat: seat as Seat, x: 105, y: 600, vx: 0, vy: 0 }));
const poses = start();
const host = new PuzzleAuthority();
assert(!host.hasWon(poses), 'vitória exige todos os desafios');
poses[0].x = LEVER.x; poses[0].y = LEVER.y;
assert(!host.act(0, { kind: 'lever' }, poses, 1000), 'alavanca exige habilidade');
assert(!host.act(1, { kind: 'lever' }, poses, 1000), 'Lia não ativa alavanca');
for (const seat of [0, 1, 2] as Seat[]) {
  poses[seat].x = PICKUPS[seat].x; poses[seat].y = PICKUPS[seat].y;
  assert(host.act(seat, { kind: 'collect' }, poses, 1100), 'coleta exclusiva ' + seat);
  assert(!host.act(seat, { kind: 'collect' }, poses, 1200), 'coleta idempotente ' + seat);
}
assert(host.world.unlocked.every(Boolean), 'três habilidades desbloqueadas');
poses[0].x = LEVER.x; poses[0].y = LEVER.y;
assert(host.act(0, { kind: 'lever' }, poses, 1500), 'Téo ativa a ponte');
assert(!host.act(0, { kind: 'lever' }, poses, 1510), 'ponte só ativa uma vez');
assert(!host.hasWon(poses), 'ponte não finaliza a fase');
poses[1].x = TARGET.x - 55; poses[1].y = TARGET.y + 18;
assert(!host.act(0, { kind: 'shoot', facing: 1 }, poses, 1900), 'Téo não usa estilingue');
assert(!host.act(1, { kind: 'shoot', facing: -1 }, poses, 1900), 'disparo em direção errada');
assert(host.act(1, { kind: 'shoot', facing: 1 }, poses, 2400), 'Lia remove cipós com disparo');
assert(!host.hasWon(poses), 'cipós não finalizam a fase');
poses[2].x = PEDAL.x; poses[2].y = PEDAL.y;
assert(!host.act(0, { kind: 'timer' }, poses, 2600), 'somente Nino ativa porta temporária');
assert(host.act(2, { kind: 'timer' }, poses, 3000), 'Nino abre a porta temporária');
assert(host.world.timerUntil === 3000 + TIMER_MS, 'duração da abertura');
poses[2].x = SWITCH.x; poses[2].y = SWITCH.y;
assert(!host.act(2, { kind: 'switch' }, poses, 3110), 'sem dash não abre passagem final');
poses[2].x = PEDAL.x; poses[2].y = PEDAL.y;
host.act(2, { kind: 'dash', facing: 1 }, poses, 3150);
poses[2].x = SWITCH.x; poses[2].y = SWITCH.y;
assert(host.act(2, { kind: 'switch' }, poses, 3400), 'dash ativa interruptor final');
assert(host.world.finalGate, 'porta permanente liberada');
assert(!host.act(2, { kind: 'switch' }, poses, 3450), 'ativação idempotente');
assert(!host.hasWon(poses), 'sem os 3 na saída não há vitória');
for (const p of poses) { p.x = 1166; p.y = 600; }
assert(host.hasWon(poses), 'todos juntos com 3 desafios liberam vitória');
host.reset();
assert(!host.hasWon(poses), 'reset bloqueia vitória');
assert(!host.world.unlocked.some(Boolean), 'reset bloqueia habilidades');
console.log('APROVADO: 18 verificações de regras cooperativas e autoridade do anfitrião.');
