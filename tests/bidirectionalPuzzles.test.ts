import {strict as assert} from 'node:assert';
import type {Pose,Seat} from '../src/network';
import {puzzleShotInRange,dashCanActivate} from '../src/puzzleInteraction';
import {LoopAuthority,markPosition,LOOP_START} from '../src/forestLoop';
import {TemporalAuthority,TEMP_ECHO} from '../src/temporalForest';
import {TreeAuthority,TREE_TARGETS} from '../src/treetopForest';
import {FireAuthority,FIRE_TARGETS} from '../src/burningForest';
import {ForestAuthority,FOREST_VINES,FOREST_SPAWNS} from '../src/forest';
import {RiverAuthority,RIVER,RIVER_SPAWNS} from '../src/river';
import {ChapterAuthority,EYES,LATE_SPAWNS} from '../src/chapters';

const start=100_000;
const actors=():Pose[]=>([0,1,2] as Seat[]).map(seat=>({seat,x:120+seat*42,y:606,vx:0,vy:0}));
const move=(poses:Pose[],seat:Seat,point:{x:number;y:number},offset=0):void=>{
 poses[seat]={seat,x:point.x+offset,y:point.y+18,vx:0,vy:0};
};
const target={x:500,y:590};
assert.ok(puzzleShotInRange({x:300,y:608},target,1));
assert.ok(puzzleShotInRange({x:700,y:608},target,-1));
assert.ok(puzzleShotInRange({x:530,y:608},target,1),
 'dentro do círculo aceita J mesmo olhando para o lado oposto');
assert.equal(puzzleShotInRange({x:700,y:608},target,1),false,
 'fora do círculo não pode acertar olhando para o lado errado');
assert.equal(puzzleShotInRange({x:1200,y:608},target,-1),false,
 'o disparo não alcança alvos fora do alcance');
assert.ok(dashCanActivate(510,510,500,105));
assert.ok(dashCanActivate(690,520,500,105));
assert.ok(dashCanActivate(320,490,500,105));
assert.equal(dashCanActivate(1000,990,500,105),false);

const loop=new LoopAuthority(),l=LOOP_START.map(p=>({...p}));
loop.reset(start);loop.world.observed=true;
const mark0=markPosition(loop.world,0);
move(l,0,mark0,44);l[0].y=mark0.y;
assert.equal(loop.act(0,{kind:'lever'},l,start+1000),true,'E de Téo pelo lado direito');
loop.world.marks[0]=true;
const mark1=markPosition(loop.world,1);
move(l,1,mark1,70);l[1].y=606;
assert.equal(loop.act(1,{kind:'shoot',facing:-1},l,start+1800),true,'J da direita para esquerda na pedra');
const mark2=markPosition(loop.world,2);
move(l,2,mark2,30);l[2].y=606;
loop.act(2,{kind:'dash',facing:-1},l,start+4000);
assert.equal(loop.act(2,{kind:'switch'},l,start+4070),true,
 'Shift no arco da direita sem precisar percorrer 105 px');

const rain=new TemporalAuthority(),r=actors();
rain.reset(start);
rain.world.echo[0]=true;
move(r,1,TEMP_ECHO[1],75);r[1].y=TEMP_ECHO[1].y+18;
assert.equal(rain.authorizeEnergy(1,'shoot',r,start+2000,-1).ok,true);
assert.equal(rain.world.echo[1],true,'J da direita na pedra molhada');
move(r,2,TEMP_ECHO[2],28);r[2].y=TEMP_ECHO[2].y;
assert.equal(rain.authorizeEnergy(2,'dash',r,start+4500,-1).ok,true);
assert.equal(rain.act(2,{kind:'switch'},r,start+4580),true,
 'Shift já dentro do terceiro círculo funciona sem posição esquerda obrigatória');

const tree=new TreeAuthority(),t=actors();
tree.reset(start);
move(t,1,TREE_TARGETS.bridge.lia,70);
t[1].y=TREE_TARGETS.bridge.lia.y+18;
assert.equal(tree.interact(1,'shoot',t,start+1800,-1),true,'Lia acerta ponte pela direita');

const fire=new FireAuthority(),f=actors();
fire.reset(start);
move(f,1,FIRE_TARGETS.log.lia,74);f[1].y=FIRE_TARGETS.log.lia.y+18;
assert.equal(fire.interact(1,'shoot',f,start+1900,-1),true,'Lia acerta tronco pela direita');

const classic=new ForestAuthority(),fo=FOREST_SPAWNS.map(p=>({...p}));
classic.reset();
classic.world.unlocked=true;
move(fo,1,FOREST_VINES[1],68);
assert.equal(classic.act(1,{kind:'shoot',facing:-1},fo,start+2200),true,
 'modo clássico aceita J pelo lado direito');

const river=new RiverAuthority(),rv=RIVER_SPAWNS.map(p=>({...p}));
river.world.partA=true;
move(rv,1,RIVER.target,60);
assert.equal(river.act(1,{kind:'shoot',facing:-1},rv,[true,true,true],start+2100),true,
 'fase clássica do rio aceita J pelo lado direito');

const chapter=new ChapterAuthority(3),cp=LATE_SPAWNS.map(p=>({...p}));
chapter.world.level===3&&(chapter.world.roots=true);
move(cp,1,EYES.distraction,58);
assert.equal(chapter.act(1,{kind:'shoot',facing:-1},cp,[true,true,true],start+2700),true,
 'capítulo clássico com guardião aceita J pela direita');

console.log('Interações pelos dois lados: círculo, Dash, J, E, quatro fases principais e clássicas OK');
