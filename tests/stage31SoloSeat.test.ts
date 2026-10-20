import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {needsSoloPlatformColliders} from '../src/soloColliderOwnership';
const src=(name:string)=>readFileSync('src/'+name+'.ts','utf8');
const physics=src('soloBodies'),net=src('network'),main=src('main');
const scenes=['temporalForestScene','treetopForestScene','burningForestScene'];
assert.ok(physics.includes('active(seat:Seat)'));
assert.ok(physics.includes('this.bodies[this.selected]?.setVelocityX(0)'));
assert.ok(physics.includes('this.scene.cameras.main.startFollow(this.actors[seat]'));
assert.ok(physics.includes('body.setAllowGravity(true)'));
assert.ok(physics.includes('scene.physics.add.collider(actor,block)'));
assert.ok(physics.includes('needsSoloPlatformColliders(seat,this.net.localSeat)'),
  'solo must use the actual selected seat, never assume Téo owns the active Arcade collider');
// Every scene registers one local collider; SoloBodies must register exactly
// the other two, regardless of which hero was selected before changing phases.
for(const current of [0,1,2] as const){
 const assignments=([0,1,2] as const).map(seat=>({
  seat, scene:seat===current, solo:needsSoloPlatformColliders(seat,current)
 }));
 assert.equal(assignments.filter(a=>a.solo).length,2,
  'two unselected heroes always receive real platform colliders');
 assert.ok(assignments.every(a=>Number(a.scene)+Number(a.solo)===1),
  'every hero must have precisely one platform-collider ownership path');
 assert.equal(needsSoloPlatformColliders(0,current),current!==0,
  'Téo must collide in stage 3 even when Lia or Nino is selected');
}

assert.ok(net.includes("this.emit('solo-seat',seat)"));
assert.ok(net.includes("if(!this.isSolo||!this.playing||this.localSeat===seat)return"));
assert.ok(main.includes("net.selectSoloSeat(Number(event.code.slice(-1))-1"));
assert.ok(main.includes("net.selectSoloSeat(Number(button.dataset.seat)"));
assert.ok(main.includes("seat=>net.selectSoloSeat(seat)"));
for(const name of scenes){
 const scene=src(name);
 assert.ok(scene.includes("this.net.on('solo-seat',seat=>"));
 assert.ok(scene.includes('const active=this.solo!.active(seat)'));
 assert.ok(scene.includes('this.local=active.actor;this.body=active.body;'));
 assert.ok(scene.includes('const active=this.solo.active(this.net.localSeat)'));
 assert.ok(scene.includes('this.local=active.actor;this.body=active.body;'));
 assert.ok(scene.includes('this.solo?.beforeFrame('));
 assert.ok(scene.includes('this.solo?.report()'));
 assert.ok(scene.includes('this.body.setVelocityX('));
 assert.ok(scene.includes("this.request(grounded?'jump':'doubleJump',seat)"));
 assert.ok(scene.includes("this.request(seat===1?'shoot':'dash',seat)"));
 assert.ok(scene.includes('if(action)this.interact(seat)'));
 assert.ok(scene.includes('if(!this.net.isSolo)')||scene.includes('&& !this.net.isSolo'));
}
assert.ok(!src('forestLoopScene').includes('this.solo.active('),'Phase 1 unchanged');
console.log('ETAPA 31: all three scenes bind selected actor+Arcade body, controls, skills, gravity, camera and solo/mobile input');
