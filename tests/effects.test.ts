import { SkillFxGate, validSkillFx } from '../src/effects';
import type { Pose, Seat } from '../src/network';
import type { PuzzleAction } from '../src/puzzles';

let count = 0;
function expect(test: unknown, message: string): void {
  if (!test) throw Error('FALHA: ' + message);
  count++;
}
const p = (seat: Seat): Pose => ({ seat, x: 500, y: 590, vx: 0, vy: 0 });
const shot: PuzzleAction = { kind: 'shoot', facing: 1 };
const dash: PuzzleAction = { kind: 'dash', facing: -1 };
const gate = new SkillFxGate();
expect(gate.accept(1,1,shot,p(1),[true,false,true],1000) === null,'Lia precisa habilidade');
expect(gate.accept(0,1,shot,p(0),[true,true,true],1000) === null,'Téo não dispara');
expect(gate.accept(2,1,shot,p(2),[true,true,true],1000) === null,'Nino não dispara');
const evt = gate.accept(1,1,shot,p(1),[true,true,true],1000);
expect(evt?.kind === 'shoot' && evt.seat === 1 && evt.facing === 1 && evt.level === 1,'disparo tipado');
expect(validSkillFx(evt),'evento emitido é válido');
expect(gate.accept(1,1,shot,p(1),[true,true,true],1100) === null,'disparo limitado por cooldown');
expect(gate.accept(1,1,shot,p(1),[true,true,true],1481) !== null,'novo disparo após cooldown');
expect(gate.accept(1,2,shot,p(1),[true,true,true],1962)?.level === 2,'efeito também funciona no rio');
expect(gate.accept(2,2,dash,p(2),[true,true,true],2000)?.kind === 'dash','dash exclusivo de Nino');
expect(gate.accept(2,2,dash,p(2),[true,true,true],2800) === null,'dash limitado por cooldown');
expect(gate.accept(2,2,dash,p(2),[true,true,true],3901) !== null,'dash liberado depois do cooldown');
expect(gate.accept(2,2,dash,p(1),[true,true,true],6000) === null,'posição de outro assento rejeitada');
expect(gate.accept(2,2,{kind:'dash'},p(2),[true,true,true],6000) === null,'direção obrigatória');
expect(gate.accept(1,1,{kind:'collect'},p(1),[true,true,true],6000) === null,'ações de puzzle não geram efeito');
expect(!validSkillFx({kind:'dash',seat:1,level:1,x:500,y:500,facing:1}),'pacote com jogador falsificado rejeitado');
expect(!validSkillFx({kind:'shoot',seat:1,level:1,x:Infinity,y:500,facing:1}),'coordenadas inválidas rejeitadas');
expect(!validSkillFx({kind:'shoot',seat:1,level:3,x:500,y:500,facing:1}),'fase desconhecida rejeitada');
expect(!validSkillFx({kind:'shoot',seat:1,level:1,x:500,y:500,facing:0}),'direção inválida rejeitada');
gate.reset();
expect(gate.accept(1,1,shot,p(1),[true,true,true],1000) !== null,'reset permite novo ciclo');
console.log('APROVADO: ' + count + ' verificações de efeitos visuais P2P.');
