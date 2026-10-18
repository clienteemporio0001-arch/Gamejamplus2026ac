import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {pipoSpeechLayout} from '../src/pipoBubbleLayout';
import {LoopAuthority,LOOP_START,SUSPENSION,suspensionLeverStatus,
 SUSPENSION_LEVER_FEEDBACK,canStack,validLoop} from '../src/forestLoop';
import {TouchPointers,consumeTouch,mobilePadMarkup} from '../src/mobileControls';
import type {Pose,Seat} from '../src/network';
import type {TouchInput} from '../src/game';

const src=(p:string)=>readFileSync('src/'+p+'.ts','utf8');
const pipo=src('pipoGuide'),scene=src('forestLoopScene'),
 authorityCode=src('forestLoop'),network=src('network'),
 pad=src('mobileControls'),solo=src('soloBodies'),ui=src('forestLoopUI');
const app=src('main');
// Zoom-correct camera mapping; scrollX without worldView offsets used to
// detach the old fixed screen balloon from the parrot on small viewports.
for(const view of [{width:360,height:760},{width:280,height:590},
 {width:812,height:375},{width:1280,height:720}]){
 const camera={x:1000,y:350,worldX:800,worldY:70,zoom:.8};
 const layout=pipoSpeechLayout(view,camera,55);
 assert.equal(layout.birdX,160);
 assert.equal(layout.birdY,224);
 assert.equal(layout.offscreen,false);
 assert.ok(layout.x-layout.width/2>=-0.01);
 assert.ok(layout.x+layout.width/2<=view.width+0.01);
 assert.ok(layout.y-layout.height/2>=40);
 assert.ok(layout.y+layout.height/2<=view.height-90);
 assert.ok(layout.width<=view.width-20,'speech word wrap fits mobile');
 assert.ok(layout.tailX<=layout.width/2-18&&layout.tailX>=-layout.width/2+18);
 assert.ok(layout.tailY>=layout.height/2+8);
 const moved=pipoSpeechLayout(view,{...camera,x:1060},55);
 assert.ok(moved.birdX>layout.birdX);
 assert.ok(moved.x>=layout.x||layout.x===view.width-layout.width/2-12,
   'balloon tracks flying bird except viewport clamp');
}
const outside=pipoSpeechLayout({width:360,height:700},
 {x:-240,y:120,worldX:500,worldY:0,zoom:1},44);
assert.equal(outside.offscreen,true);
assert.ok(outside.indicatorX>=34&&outside.indicatorX<=326);
assert.ok(outside.indicatorY>=62&&outside.indicatorY<=700-162);
assert.ok(pipo.includes('this.bird.x+=dx*eased')&&pipo.includes('this.bird.y+=dy*eased'));
assert.ok(pipo.includes('pipoSpeechLayout('));
assert.ok(pipo.includes('cam.worldView.x')&&pipo.includes('cam.worldView.y'));
assert.ok(pipo.includes('setScrollFactor(0)'));
assert.ok(pipo.includes('this.nameLabel=add.text('));
assert.ok(pipo.includes(",'PIPO'"));
assert.ok(pipo.includes('this.panel.fillTriangle(layout.tailX-10'));
assert.ok(pipo.includes('this.label.setWordWrapWidth(width-28)'));
assert.ok(pipo.includes('this.bubble.setPosition(layout.x,layout.y)'));
assert.ok(pipo.includes('this.offscreenMarker.setVisible(layout.offscreen)'));
assert.ok(pipo.includes('this.bubble.setVisible(!layout.offscreen)'));
assert.ok(pipo.includes('this.bubble.setVisible(false)'));
assert.ok(pipo.includes('this.label.setText(message)'),'single text/bubble reused');
assert.ok(pipo.includes('this.fadingUntil'));
assert.ok(pipo.includes("window.addEventListener('pipo-help'"));
assert.ok(pipo.includes("Phaser.Input.Keyboard.JustDown(this.key)"));

// The suspended action still needs the same three-person tower, a real
// detached Téo and physical landing on the branch at y=302.
const auth=new LoopAuthority();auth.reset(1000);
const players:Pose[]=LOOP_START.map(p=>({...p}));
const w=auth.world;w.lastRoute='right';w.marks=[true,true,true];
for(const p of players){p.x=SUSPENSION.lever.x;p.y=606;p.vx=0;p.vy=0;}
assert.equal(suspensionLeverStatus(w,players[0]),'tower');
assert.equal(auth.act(0,{kind:'lever'},players,1100),false,
 'no lever activation from ground');
assert.equal(auth.act(1,{kind:'support'},players,1300),true);
assert.equal(w.supporting[1],2);
auth.tick(players,1350);
assert.equal(players[1].y,562);
assert.equal(canStack(w,0,players),true);
assert.equal(auth.act(0,{kind:'support'},players,1400),true);
auth.tick(players,1500);
assert.equal(w.suspensionStacked,true);
assert.equal(w.supporting[0],1);
assert.equal(suspensionLeverStatus(w,players[0]),'detach');
assert.equal(auth.act(0,{kind:'lever'},players,1550),false);
assert.equal(auth.act(0,{kind:'detach'},players,1600),true);
assert.equal(w.suspensionClimbReady,true);
assert.equal(suspensionLeverStatus(w,players[0]),'branch');
assert.equal(auth.act(0,{kind:'lever'},players,1750),false,
 'detach is not an instant teleport to high lever');
players[0].y=SUSPENSION.lever.y;
players[0].x=SUSPENSION.lever.x+17;
players[0].vy=120;
assert.equal(suspensionLeverStatus(w,players[0]),'steady');
assert.equal(auth.act(0,{kind:'lever'},players,1800),false);
players[0].vy=0;players[0].vx=0;
assert.equal(suspensionLeverStatus(w,players[0]),'ready');
assert.equal(auth.act(0,{kind:'lever'},players,2000),true);
assert.equal(w.suspended[0],true);
assert.equal(w.suspendedTo,SUSPENSION.teoX);
assert.equal(suspensionLeverStatus(w,players[0]),'moving');
assert.equal(auth.tick(players,2500).changed,true);
assert.ok(w.suspendedX>SUSPENSION.initialX);
auth.tick(players,2000+SUSPENSION.moveMs+40);
assert.equal(w.suspendedX,SUSPENSION.teoX);
assert.equal(suspensionLeverStatus(w,players[0]),'finished');
assert.ok(validLoop(w));
assert.ok(SUSPENSION_LEVER_FEEDBACK.branch.includes('galho'));
assert.ok(SUSPENSION_LEVER_FEEDBACK.tower.includes('empilhamento'));
assert.ok(SUSPENSION_LEVER_FEEDBACK.steady.includes('Pare'));
assert.ok(SUSPENSION_LEVER_FEEDBACK.moving.includes('Aguarde'));
assert.ok(SUSPENSION_LEVER_FEEDBACK.closer.includes('Chegue'));
const missing=new LoopAuthority();missing.reset(0);
missing.world.lastRoute='right';missing.world.marks=[true,true,true];
const wrong=LOOP_START.map(p=>({...p}));
wrong[0]={seat:0,x:SUSPENSION.lever.x,y:SUSPENSION.lever.y,vx:0,vy:0};
assert.equal(missing.act(0,{kind:'lever'},wrong,3000),false,
 'even at lever coordinates the cooperative climbing milestones are mandatory');

// TouchPointers is the SAME queue consumed by keyboard E and mobile USAR.
// A fresh pointerdown produces exactly one action pulse independent of up.
const touch={left:false,right:false,jump:false,interact:false,ability:false,
 jumpQueue:0,interactQueue:0,abilityQueue:0,moveX:0} as TouchInput;
const pointers=new TouchPointers(touch);
pointers.down('interact',7);
pointers.up('interact',7);
assert.equal(consumeTouch(touch,'interact'),true,'first touch survives pointerup');
assert.equal(consumeTouch(touch,'interact'),false,'no double-trigger');
pointers.down('jump',8);pointers.down('interact',9);
pointers.down('interact',10);
assert.equal(consumeTouch(touch,'interact'),true);
assert.equal(consumeTouch(touch,'interact'),true);
assert.equal(consumeTouch(touch,'jump'),true);
assert.equal(consumeTouch(touch,'interact'),false);
pointers.clear();
assert.equal(touch.interactQueue,0);
assert.equal(consumeTouch(touch,'interact'),false);
assert.ok(mobilePadMarkup(true,0).includes('data-touch="interact"'));
assert.ok(mobilePadMarkup(true,1).includes('data-touch="interact"'));
assert.ok(mobilePadMarkup(true,2).includes('data-touch="interact"'));
assert.ok(mobilePadMarkup(false,0).includes('E <small>USAR</small>'));
assert.ok(pad.includes("root.addEventListener('pointerdown',down)"));
assert.ok(pad.includes('pointers.down(key,event.pointerId)'));
assert.ok(pad.includes("button.setPointerCapture(event.pointerId)"));
assert.ok(pad.includes('right.insertAdjacentHTML('));
assert.ok(scene.includes("const touchUse=consumeTouch(this.touch,'interact')"));
assert.ok(scene.includes('if(using)this.action(seat)'));
assert.ok(scene.indexOf('this.solo?.report();\n      if(using)')>0,
 'solo authorities receive current physical body poses BEFORE E action');
assert.ok(scene.includes("this.net.act({kind:'lever'})"));
assert.ok(scene.includes("this.net.on('loop-lever-reply'"));
assert.ok(scene.includes("this.leverArt=lever"));
assert.ok(scene.includes('targets:this.leverArt,angle:-28'));
assert.ok(scene.includes('this.suspension.setX(position)'));
assert.ok(scene.includes('this.notifyUse('));
assert.ok(ui.includes('suspensionLeverStatus('));
assert.ok(solo.includes('this.net.reportSoloBodies(poses)'));
assert.ok(network.includes("case 'loop-lever-reply':"));
assert.ok(network.includes("const accepted=this.loopAuthority.act(seat,action,this.poses)"));
assert.ok(network.includes("this.broadcast({t:'loop',world:this.loop})"));
assert.ok(network.includes("this.message(connection,{t:'loop-lever-reply',...reply})"));
assert.ok(network.includes("this.emit('loop-lever-reply',reply)"));
assert.ok(network.includes("case 'pose'"));
assert.ok(network.includes('this.lastAction.clear()'), 'restart and seat switching reset cooldown');
assert.ok(authorityCode.includes("if(suspensionLeverStatus(w,p)==='ready')"));
console.log('ETAPA 27: Pipo viewport+tail, first mobile USAR, human tower, valid/invalid lever, solo host, multiplayer protocol and phase regressions PASS');
