import {readFileSync} from 'node:fs';
import {viewportSize,cameraZoomFor,isMobilePortrait} from '../src/mobileViewport';
import {TouchPointers,consumeTouch,clearTouch,mobilePadMarkup} from '../src/mobileControls';
import type {TouchInput} from '../src/game';
let count=0;
function ok(value:unknown,message:string){if(!value)throw Error('MOBILE 13: '+message);count++;}
function touch():TouchInput{return {left:false,right:false,jump:false,interact:false,ability:false};}
for(const [width,height] of [[844,390],[915,412],[740,360],[1280,720]]){
 const viewport=viewportSize({innerWidth:width,innerHeight:height});
 ok(viewport.width===width&&viewport.height===height,'viewport matches '+width+'x'+height);
 const zoom=cameraZoomFor(viewport,width<1000);
 ok(zoom>=.62&&zoom<=1.16,'bounded camera zoom '+width+'x'+height);
 ok(width/zoom>=width*.85,'does not crop horizontal view excessively');
 ok(height/zoom>=height*.85,'preserves world visibility');
}
ok(isMobilePortrait({width:390,height:844},true),'portrait mobile detected');
ok(!isMobilePortrait({width:844,height:390},true),'landscape mobile enabled');
ok(!isMobilePortrait({width:390,height:844},false),'desktop portrait is not blocked');
ok(!isMobilePortrait({width:915,height:412},true),'wide Android landscape');
ok(cameraZoomFor({width:844,height:390},true)!==cameraZoomFor({width:844,height:600},true),
  'changing orientation/viewport recalculates camera zoom');
ok(cameraZoomFor({width:844,height:390},true)<
   cameraZoomFor({width:1280,height:720},false),'landscape Android keeps obstacles visible');

const state=touch(),pointers=new TouchPointers(state);
pointers.down('right',101);pointers.down('jump',202);
ok(state.right&&state.jump,'move and jump simultaneously with different pointer IDs');
ok(consumeTouch(state,'jump'),'jump edge registered');
ok(!consumeTouch(state,'jump')&&state.right,'holding jump does not auto-repeat');
pointers.up('jump',202);
ok(state.right,'releasing jump does not release movement');
pointers.down('jump',203);pointers.up('jump',203);
pointers.down('jump',204);pointers.up('jump',204);
ok(consumeTouch(state,'jump')&&consumeTouch(state,'jump')&&!consumeTouch(state,'jump'),
  'two quick jump taps survive frame coalescing for Téo double jump');
pointers.down('right',102);pointers.up('right',101);
ok(state.right&&pointers.count('right')===1,'independent right pointers remain held');
pointers.up('right',102);
ok(!state.right,'right released after final pointer');
pointers.down('left',303);pointers.down('ability',304);
ok(state.left&&consumeTouch(state,'ability')&&state.left,'left and dash/shot are simultaneous');
pointers.up('ability',304);pointers.up('left',303);
ok(!state.left,'end of multitouch sequence resets horizontal movement');
pointers.down('left',401);pointers.down('jump',402);pointers.down('interact',403);
ok(state.left&&consumeTouch(state,'jump')&&consumeTouch(state,'interact'),
  'jump + E when supported, with movement held');
pointers.clear();
ok(!state.left&&!state.right&&!state.jump&&!state.interact&&!state.ability,
  'pointercancel/blur/orientation cleanup eliminates stuck keys');
ok(!consumeTouch(state,'jump'),'cancel clears pending jumps');
pointers.down('jump',507);pointers.down('jump',507);
ok(consumeTouch(state,'jump')&&!consumeTouch(state,'jump'),'same pointer ID never duplicates an action');
pointers.up('jump',507);
clearTouch(state);
ok(pointers.count('jump')===0,'no held touch after release');

const teo=mobilePadMarkup(true,0);
const lia=mobilePadMarkup(true,1);
const nino=mobilePadMarkup(true,2);
const guest=mobilePadMarkup(false,1);
ok(teo.includes('data-touch="jump"')&&teo.includes('data-touch="interact"'),
  'pulo e E remain accessible to Téo');
ok(!teo.includes('data-touch="ability"'),'Téo has no redundant special button');
ok(lia.includes('data-touch="ability"')&&lia.includes('TIRO'),'Lia contextual slingshot');
ok(nino.includes('data-touch="ability"')&&nino.includes('DASH'),'Nino contextual dash');
ok(teo.includes('mobile-seat-picker'),'solo selection at edge');
ok(!guest.includes('mobile-seat-picker'),'no multiplayer character selector');
ok(guest.includes('data-touch="left"')&&guest.includes('data-touch="right"'),
  'left and right controls separate');

const main=readFileSync('src/main.ts','utf8');
const css=readFileSync('src/style.css','utf8');
const html=readFileSync('index.html','utf8');
const forest=readFileSync('src/forestLoopScene.ts','utf8');
const temporal=readFileSync('src/temporalForestScene.ts','utf8');
const game=readFileSync('src/game.ts','utf8');
const network=readFileSync('src/network.ts','utf8');
ok(main.includes('mode: Phaser.Scale.RESIZE'),'canvas uses RESIZE instead of FIT');
ok(!main.includes('Phaser.Scale.FIT'),'old fixed letterboxing removed');
ok(main.includes('viewportSize(window)')&&main.includes('game.scale.resize(view.width,view.height)'),
  'viewport resize recalculates native canvas without reloading scene');
ok(main.includes("document.fullscreenElement")&&main.includes('root.requestFullscreen()'),
  'fullscreen user action requests native API');
ok(main.includes('if(!root.requestFullscreen)')&&main.includes('catch{notify('),
  'fullscreen unsupported/denied produces fallback');
ok(main.includes("orientation.lock?.('landscape')")&&main.includes('applyViewport()'),
  'landscape lock optional and responsive fallback');
ok(main.includes("window.addEventListener('orientationchange'"),
  'orientation change triggers layout update');
ok(main.includes('window.visualViewport?.addEventListener'),
  'visualViewport resize observed');
ok(html.includes('id="mobile-fullscreen"')&&html.includes('GIRE O CELULAR PARA JOGAR'),
  'fullscreen and portrait hint present');
ok(html.includes('viewport-fit=cover')&&!html.includes('user-scalable=no'),
  'safe areas enabled without globally disabling zoom for menu');
ok(css.includes('env(safe-area-inset-left)')&&css.includes('env(safe-area-inset-right)')&&
   css.includes('env(safe-area-inset-bottom)'), 'notch/navigation safe area respected');
ok(css.includes('width:100vw;height:100dvh')&&css.includes('#game canvas{width:100%!important'),
  'game canvas fills landscape viewport');
ok(css.includes('body.playing{overflow:hidden;touch-action:none'),
  'scroll and gestures prevented only while playing');
ok(css.includes('#ui:not(.in-game){height:100dvh;overflow:auto;touch-action:pan-y'),
  'menu preserves vertical scrolling');
ok(css.includes('.mobile-seat-picker{position:fixed')&&
   css.includes('.thumb-zone')&&css.includes('thumb-left')===false,
   'solo switches are anchored and new thumb zones use CSS layout');
ok(css.includes('loop-bottom-left:has(.loop-vitals)')&&css.includes('top:calc('),
  '3 compact vitals moved to top in landscape');
ok(css.includes('.loop-vital.selected')&&css.includes('.loop-energy-track'),
  'selected actor and stamina bar remain visible');
ok(css.includes('.loop-top-left')&&css.includes('.loop-top-right'),
  'state/clock and objective at opposite top corners');
ok(css.includes('.loop-wind'),'wind cue preserved');
ok(main.includes('mountMobilePad(controls,touch,net.isSolo,net.localSeat'),
  'one shared touch controller both forest scenes');
ok(forest.includes("consumeTouch(this.touch,'jump')")&&
   temporal.includes("consumeTouch(this.touch,'jump')"),'Téo quick double-jump works both new maps');
ok(forest.includes("consumeTouch(this.touch,'ability')")&&
   temporal.includes("consumeTouch(this.touch,'ability')"),'stamina-validated dash/shot touch');
ok(forest.includes('onResize(this.scale.gameSize)')&&temporal.includes('onResize(this.scale.gameSize)'),
  'both scenes resize camera and fixed world-independent blackout');
ok(forest.includes('this.scale.off(Phaser.Scale.Events.RESIZE,onResize)')&&
   temporal.includes('this.scale.off(Phaser.Scale.Events.RESIZE,onResize)'),
  'resize listeners cleaned on scene shutdown');
ok(forest.includes('cameraZoomFor(')&&temporal.includes('cameraZoomFor('),
  'same camera zoom policy applied to both main phases');
ok(forest.includes('this.cameras.main.startFollow(this.local')&&
   temporal.includes('this.cameras.main.startFollow(this.local'),
  'camera follows respective player in both phases');
ok(game.includes('jumpQueue?:number'),'legacy TouchInput extended compatibly');
ok(network.includes("this.experience==='loop'")&&
   network.includes("this.message(conn, {t:'temporal',world:this.temporal})"),
  'main multiplayer loop authority/protocol preserved');
ok(temporal.includes('rainBudget(this.scale.gameSize.width<760)'),
  'storm rain still uses adaptive low-cost graphics');
for(const word of ['setGravityY(850)','setVelocityY(-465)'])
 ok(forest.includes(word)&&temporal.includes(word),'physical constant unchanged: '+word);
console.log('APROVADO: '+count+' verificações Etapa 13 — viewport, touch, HUD e regressões.');
