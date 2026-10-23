import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {LOOP_PHYSICS,SUSPENSION} from '../src/forestLoop';
import {loopFallSurfaces,hasPhysicalFooting} from '../src/fallDamage';
import {suspendedRideDelta,SUSPENSION_RIDER_Y,SUSPENSION_TOP_Y}
 from '../src/suspensionPlatform';

const poses=[SUSPENSION.initialX,SUSPENSION.teoX,SUSPENSION.liaX,SUSPENSION.finalX];
assert.equal(SUSPENSION_TOP_Y,643);
assert.equal(SUSPENSION_RIDER_Y,643-LOOP_PHYSICS.characterHeight/2);
for(const x of poses){
 const all=loopFallSurfaces(0,false,undefined,false,x);
 const deck=all.find(s=>s.x===x&&s.width===SUSPENSION.width);
 assert.ok(deck&&deck.active!==false,'colisão/queda da passarela ativa em x='+x);
 const walker={seat:0 as const,x:Math.max(SUSPENSION.gapStart+60,
   Math.min(x+50,SUSPENSION.gapEnd-60)),y:SUSPENSION_RIDER_Y,vx:0,vy:0};
 assert.ok(hasPhysicalFooting(walker,all),
  'anfitrião reconhece personagem apoiado durante movimento/paradas em '+x);
}
const rider={x:8100,y:SUSPENSION_RIDER_Y,vy:0,grounded:true};
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+80,rider),80,
 'carrega o personagem apoiado na madeira');
assert.equal(suspendedRideDelta(SUSPENSION.liaX,SUSPENSION.liaX-60,
 {...rider,x:8250}),-60,'também funciona com movimento para esquerda');
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+80,
 {...rider,grounded:false}),0,'não transporta quem está no ar');
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+80,
 {...rider,x:7910,y:616}),0,'não arrasta personagens sobre terreno firme');
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+80,
 {...rider,x:8400}),0,'não carrega personagem fora da tábua');
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+80,
 {...rider,vy:310}),0,'queda em curso não é transformada em carona');
assert.equal(suspendedRideDelta(SUSPENSION.teoX,SUSPENSION.teoX+200,rider),0,
 'teleporte ou snapshot distante não lança personagem para fora');

const scene=readFileSync('src/forestLoopScene.ts','utf8');
const net=readFileSync('src/network.ts','utf8');
const world=readFileSync('src/forestLoop.ts','utf8');
assert.ok(scene.includes('deck.checkCollision.up=true;deck.checkCollision.down=false'),
 'passarela permite aterrissar por cima sem bloquear por baixo');
assert.ok(scene.includes('const dx=suspendedRideDelta(oldX,position'),
 'sincronização transporta personagens com o snapshot');
assert.ok(scene.includes('if(!body.enable)body.enable=true')&&
 !scene.includes('body.enable=settled'),
 'colisão permanece ativa enquanto a passarela desliza');
assert.ok(scene.includes('if(moved)body.updateFromGameObject()'),
 'corpo estático acompanha posição visual no broadphase');
assert.ok(net.includes('SUMMIT_BRANCH,l.suspendedOpen,l.suspendedX'),
 'host detecta quedas usando a posição real móvel, não a final');
assert.ok(world.includes('top(w.suspendedX,SUSPENSION.width')&&
 world.includes('x:w.suspendedX,y:656'),
 'apoios cooperativos usam mesma geometria do cenário');
console.log('PASSARELA FASE 1: suportes, transporte, colisão e proteção contra quedas OK');
