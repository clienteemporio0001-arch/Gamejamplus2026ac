import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {CinematicProgressWatch,CINEMATIC_STALL_MS} from '../src/cinematicHealth';

const base=1000000;
const playing=new CinematicProgressWatch(base);
assert.equal(playing.sample(0,base+1000),false,'initial buffering is allowed');
assert.equal(playing.sample(2.4,base+9000),false,'valid video time resets stall clock');
assert.equal(playing.sample(4.2,base+17000),false,'slow-loading but progressing intro never auto-skips');
assert.equal(playing.sample(4.2,base+17000+CINEMATIC_STALL_MS-1),false,
 'avoid false positives just before the stall threshold');
assert.equal(playing.sample(4.2,base+17000+CINEMATIC_STALL_MS),true,
 'completely stalled MP4 recovers after bounded interval');
const neverStarts=new CinematicProgressWatch(base);
assert.equal(neverStarts.sample(0,base+CINEMATIC_STALL_MS),true,
 'playback that never begins cannot indefinitely lock Stage 01');
const hidden=new CinematicProgressWatch(base);
assert.equal(hidden.sample(0,base+18000,true),false,
 'background tabs do not auto-skip cinema');
assert.equal(hidden.sample(0,base+19000),false,'returning to foreground gets a fresh grace period');
assert.equal(hidden.sample(0,base+19000+CINEMATIC_STALL_MS),true,
 'an unrecoverable visible stall still expires');
const main=readFileSync('src/main.ts','utf8');
const net=readFileSync('src/network.ts','utf8');
const loop=readFileSync('src/forestLoopScene.ts','utf8');
const phases=[
 ['ForestLoopScene','loop'],['TemporalForestScene','temporal'],
 ['TreetopForestScene','treetop'],['BurningForestScene','fire']
];
for(const [className,phase] of phases){
 assert.ok(main.includes('new '+className+'(net,touch,refreshHud)'),
  phase+' still uses original playable Phaser scene');
}
assert.equal(main.split('new Phaser.Game({').length-1,1,
 'single canvas/render context across the four phases');
assert.ok(main.includes('instance.scene.stop(previous)')&&
 main.includes('instance.scene.remove(previous)')&&
 main.includes('instance.scene.add(key,scene,true)'),
 'only scenes, not renderers, are replaced between stages');
assert.ok(main.includes('instance.events.once(Phaser.Core.Events.READY')&&
 main.includes('pendingScene={mode,scene}')&&
 main.includes('if(game!==instance)return'),
 'early media completion waits for renderer boot, stale callbacks cannot revive menu scenes');
assert.ok(main.includes('instance.destroy(true)')&&
 main.includes("game=null;rendererReady=false;activeMode='none'"),
 'menu teardown releases the single renderer and aborts pending stage');
assert.ok(main.includes('if(!game&&retiringGame)return;')&&
 main.includes('instance.events.once(Phaser.Core.Events.DESTROY')&&
 main.includes('retiringGame=null;'),
 'a rapid retry waits for deferred Phaser WebGL destruction before recreating a game');
assert.ok(main.includes('if(instance.isRunning)onRendererReady()')&&
 main.includes('Phaser.Core.Events.READY,onRendererReady'),
 'warm cached renderers cannot lose the READY event race');
const sprite=readFileSync('src/kenneyCharacterSprites.ts','utf8');
assert.ok(sprite.includes('for(const id of activeAvatars)')&&
 !sprite.includes('for(const avatar of AVATAR_CATALOG)'),
 'phase 01 uploads only three chosen atlases instead of six');
assert.ok(main.includes('cinematicWatchTimer=setInterval(')&&
 main.includes('clearInterval(cinematicWatchTimer)')&&
 main.includes('complete(allowSkip?onSkip:onComplete)'),
 'video stalls recover and timers are always cancelled on cleanup');
assert.ok(main.includes("video.addEventListener('ended'")&&
 main.includes("video.addEventListener('error'"),
 'normal movie endings and file errors remain supported');
assert.ok(net.includes("this.setPhase('intro',1")&&
 net.includes("this.setPhase('playing',1)")&&
 net.includes("this.runStartedAt=Date.now()"),
 'first-stage gameplay still begins after the intro with intact timing');
assert.ok(loop.includes('this.off.forEach(off=>off())')&&
 loop.includes('this.scale.off(Phaser.Scale.Events.RESIZE,onResize)'),
 'stage 01 detaches network and resize event handlers on SceneManager removal');
console.log('STARTUP STABILITY: 4 stages, video stalls and renderer lifetime passed');
