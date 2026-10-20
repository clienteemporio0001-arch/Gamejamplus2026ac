import Phaser from 'phaser';
import { CHARACTERS, Network } from './network';
import { DemoScene, type TouchInput } from './game';
import { ForestScene } from './forestScene';
import { ForestLoopScene } from './forestLoopScene';
import { TemporalForestScene } from './temporalForestScene';
import { TreetopForestScene } from './treetopForestScene';
import { BurningForestScene } from './burningForestScene';
import { FIRE_COLLAPSE_PERIOD,FIRE_SHIFT_PERIOD,fireObjective,fireHeavySmoke } from './burningForest';
import { TREE_CYCLE,treeObjective,treeWind,treeExposure } from './treetopForest';
import { TEMP_CYCLE,temporalObjective,tempWind } from './temporalForest';
import { IntroScene } from './intro';
import { RiverScene } from './riverScene';
import { JourneyScene } from './journeyScene';
import { LateScene } from './lateScene';
import './style.css';
import { gameKeys } from './keyboard';
import {mountMobilePad,clearTouch,type MobilePadMount} from './mobileControls';
import {viewportSize,isCoarseDevice,isMobilePortrait} from './mobileViewport';
import { GUIDE_DIALOGUES } from './forestPresentation';
import { loopObjective, loopWind } from './forestLoopUI';
import { LOOP_CYCLE_MS } from './forestLoop';
import {getAudioSettings,setAudioSettings} from './audioSettings';
import {GameAudio,type SoundBiome} from './sharedAudio';
import {scoreForStage,scoreForEncounter} from './soundtrack';
import {fireVisualTreePhase} from './burningForest';
import {missionSnapshot} from './missionChapters';
import {elapsedMs,formatTime,cleanName} from './speedrun';
import {profile,captureProfile,nicknameInput,teamInput,rankingSection,recordVictory,victoryScore} from './speedrunUI';
import {AVATAR_CATALOG,DEFAULT_AVATARS,avatarInfo,isAvatarId,uniqueAvatars,
 loadSoloAvatars,saveSoloAvatars,selectSoloAvatar,type AvatarChoices,type AvatarId} from './avatarCatalog';
import {avatarGrid,roleLabel,ROLE_SKILLS} from './avatarSelectionUI';
import {setActiveAvatarSelections} from './kenneyCharacterSprites';
import {CinematicProgressWatch} from './cinematicHealth';
import {gameGuideMarkup,beforeFirstPlay} from './gameGuide';

const net = new Network();
const ui = document.querySelector<HTMLDivElement>('#ui')!;
const controls = document.querySelector<HTMLDivElement>('#mobile-controls')!;
const touch: TouchInput = { left: false, right: false, jump: false, interact: false, ability: false };
let game: Phaser.Game | null = null;
type GameMode='none'|'intro'|'level1'|'level2'|'level3'|'level4'|'loop'|'temporal'|'treetop'|'fire';
let activeMode:GameMode='none';
/** Keep ONE Phaser renderer/WebGL context through all four phases.
 * Creating a new Game immediately after destroy(true) can race Phaser's
 * asynchronous teardown and intermittently leave the next scene frozen.
 */
let rendererReady=false;
let retiringGame:Phaser.Game|null=null;
let activeSceneKey:string|null=null;
let pendingScene:{mode:GameMode;scene:Phaser.Scene}|null=null;
let info = '';
let phaseMapOpen=false;
let rankingsOpen=false;
let soloSelectLevel:1|2|3|4|null=null;
let soloDraft:AvatarChoices=loadSoloAvatars();
let soloFocus:0|1|2=0;
let soloFromPhaseMap=false;
function showSoloSelection(level:1|2|3|4):void{
  soloDraft=loadSoloAvatars();
  soloFocus=0;soloSelectLevel=level;
  soloFromPhaseMap=phaseMapOpen;
  phaseMapOpen=false;
  captureProfile();
  render();
}
let devSession=false;
const audio=new GameAudio();
let lastStepAt=0;
let mobilePad:MobilePadMount|null=null;
function unmountMobileControls():void{
  mobilePad?.destroy();mobilePad=null;
  clearTouch(touch);
}
function ensureMobileControls():void{
  if(!net.playing||net.localSeat===null){unmountMobileControls();return;}
  if(!mobilePad||!mobilePad.ready()){
    mobilePad?.destroy();
    mobilePad=mountMobilePad(controls,touch,net.isSolo,net.localSeat,
      seat=>net.selectSoloSeat(seat));
  }else mobilePad.update(net.localSeat);
}
function updateMobileCharacter(seat:0|1|2):void{
  gameKeys.clear();
  // No DOM destruction: only active avatar and contextual ability button change.
  mobilePad?.update(seat);
  if(!mobilePad?.ready()&&net.playing)ensureMobileControls();
}
const fullscreen=document.querySelector<HTMLButtonElement>('#mobile-fullscreen')!;
const rotate=document.querySelector<HTMLDivElement>('#rotate')!;
function applyViewport():void{
  const view=viewportSize(window),coarse=isCoarseDevice();
  document.body.classList.toggle('mobile-landscape',coarse&&view.width>view.height);
  document.body.classList.toggle('mobile-portrait',isMobilePortrait(view,coarse));
  rotate.setAttribute('aria-hidden',String(!isMobilePortrait(view,coarse)||!net.playing));
  if(game){
    const canvas=game.scale.gameSize;
    if(canvas.width!==view.width||canvas.height!==view.height)
      game.scale.resize(view.width,view.height);
  }
}
async function requestFullscreen():Promise<void>{
  const root=document.documentElement;
  const notify=(text:string)=>{fullscreen.setAttribute('title',text);fullscreen.setAttribute('aria-label',text);const span=fullscreen.querySelector('span');if(span)span.textContent='INDISPONÍVEL';};
  if(!root.requestFullscreen){notify('Tela cheia indisponível; usando layout responsivo.');return;}
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else{
      await root.requestFullscreen();
      // Orientation locking is optional; Chrome/WebView may reject it.
      try{
        const orientation=screen.orientation as ScreenOrientation&{lock?:(value:'landscape')=>Promise<void>};
        await orientation.lock?.('landscape');
      }catch{/* Layout handles rotation independently. */}
    }
    applyViewport();
  }catch{notify('Este navegador não permite tela cheia. O jogo continua responsivo.');}
}
fullscreen.addEventListener('click',()=>{void requestFullscreen();});
window.addEventListener('resize',applyViewport,{passive:true});
window.addEventListener('orientationchange',()=>{mobilePad?.reset();applyViewport();},{passive:true});
window.visualViewport?.addEventListener('resize',applyViewport,{passive:true});
document.addEventListener('fullscreenchange',()=>{
  const label=fullscreen.querySelector('span');
  if(label)label.textContent=document.fullscreenElement?'SAIR DA TELA CHEIA':'TELA CHEIA';
  applyViewport();
});

function safeText(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
function button(id: string, label: string, secondary = false, disabled = false): string {
  return '<button class="btn ' + (secondary ? 'secondary' : '') + '" id="' + id + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>';
}
function notice(): string { return info ? '<div class="notice" role="status">' + safeText(info) + '</div>' : ''; }
function banner(): string {
  return '<div class="menu-atmosphere" aria-hidden="true">'+
    Array.from({length:12},(_,i)=>'<i style="--leaf:'+i+'"></i>').join('')+
    '</div>'+
    '<div class="brand-mark" aria-hidden="true"><span>✦</span><b>🌳</b><span>✦</span></div>'+
    '<span class="kicker menu-eyebrow">UMA AVENTURA ALÉM DO QUE OS OLHOS VEEM</span>' +
    '<h1 class="forest-logo"><span>A FLORESTA</span><span>MENTE</span></h1>'+ 
    '<div class="subtitle">O VENTO REVELA O CAMINHO.</div>'+
    '<p class="menu-story">A floresta muda a cada ciclo. Observe os sinais, domine as habilidades e escapem juntos.<br><strong>TRÊS AMIGOS. UMA SAÍDA. NINGUÉM FICA PARA TRÁS.</strong></p>';
}
/** The menu and the in-game options share one accessible, dismissible overlay. */
type PanelKind='how'|'settings'|'credits'|'developer';
function devSnapshot():string{
 if(!net.isSolo||!net.playing||net.experience!=='loop')return 'Disponível somente em teste solo.';
 const p=net.poses[net.localSeat??0];
 const phase=net.level;
 let status='';
 let cycle=0,layout=0;
 if(phase===1){
  const w=net.loop;cycle=w.cycle;layout=w.layout;
  status='Marcos '+w.marks.map(v=>v?'✓':'○').join(' ') +
   ' · Árvore '+w.tree.map(v=>v?'✓':'○').join(' ') +
   ' · Travas '+w.final.map(v=>v?'✓':'○').join(' ');
 }else if(phase===2){
  const w=net.temporal;cycle=w.cycle;layout=w.layout;
  status='Ecos '+w.echo.map(v=>v?'✓':'○').join(' ') +
   ' · Raízes '+w.roots.map(v=>v?'✓':'○').join(' ') +
   ' · Ponte '+(w.bridge?'✓':'○');
 }else if(phase===3){
  const w=net.treetop;cycle=w.cycle;layout=w.layout;
  status='Ponte '+w.bridge.map(v=>v?'✓':'○').join(' ') +
   ' · Torre '+w.tower.map(v=>v?'✓':'○').join(' ') +
   ' · Tempo '+w.time.map(v=>v?'✓':'○').join(' ');
 }else{
  const w=net.fire;cycle=w.cycle;layout=w.layout;
  status='Tronco '+w.log.map(v=>v?'✓':'○').join(' ') +
   ' · Fumaça '+w.smoke.map(v=>v?'✓':'○').join(' ') +
   ' · Árvore '+w.tree.map(v=>v?'✓':'○').join(' ');
 }
 const state=phase===4?'BRASAS '+(layout+1):'ESTADO '+['A','B','C'][layout];
 return 'FASE 0'+phase+' · '+state+' · CICLO '+cycle+
  '\\nPERSONAGEM '+CHARACTERS[p.seat].name.toUpperCase()+
  ' · X '+Math.round(p.x)+' / Y '+Math.round(p.y)+
  '\\n'+status;
}
function closeOverlay():void{
 document.getElementById('fm-overlay')?.remove();
 document.removeEventListener('keydown',overlayKey);
}
function overlayKey(event:KeyboardEvent):void{
 if(event.key==='Escape'){event.preventDefault();closeOverlay();}
}
function openPanel(kind:PanelKind):void{
 closeOverlay();
 if(kind==='developer'&&(!devSession||!net.isSolo||!net.playing))return;
 const prefs=getAudioSettings();
 const title=kind==='how'?'COMO JOGAR':kind==='settings'?'CONFIGURAÇÕES':
   kind==='credits'?'CRÉDITOS':'PAINEL DE TESTES';
 const body=kind==='how'?gameGuideMarkup():
  kind==='settings'?
   '<p>Trilhas sonoras originais em MP3, carregadas conforme a fase. Ajustes aplicados sem reiniciar.</p>'+
   '<div class="settings-control"><label for="fm-music">Música ambiente <output id="fm-music-value">'+prefs.music+'%</output></label>'+
   '<input id="fm-music" type="range" min="0" max="100" step="1" value="'+prefs.music+'"></div>'+
   '<div class="settings-control"><label for="fm-sfx">Efeitos sonoros <output id="fm-sfx-value">'+prefs.sfx+'%</output></label>'+
   '<input id="fm-sfx" type="range" min="0" max="100" step="1" value="'+prefs.sfx+'"></div>'+
   '<div class="settings-control"><label for="fm-ambient">Ambiente · vento, chuva e fogo <output id="fm-ambient-value">'+prefs.ambient+'%</output></label>'+
   '<input id="fm-ambient" type="range" min="0" max="100" step="1" value="'+prefs.ambient+'"></div>'+
   '<label class="settings-mute"><input id="fm-musicMuted" type="checkbox" '+(prefs.musicMuted?'checked':'')+'>'+
   ' Silenciar somente música</label>'+
   '<label class="settings-mute"><input id="fm-muted" type="checkbox" '+(prefs.muted?'checked':'')+'>'+
   ' Silenciar tudo</label>'+
   '<p class="overlay-footnote">Toque ou pressione uma tecla para liberar o áudio. As músicas são originais; controles locais por jogador.</p>':
  kind==='credits'?
   '<p><strong>A FLORESTA MENTE</strong><br>MAS O VENTO NÃO.<br>NINGUÉM FICA PARA TRÁS.</p>'+
   '<div class="overlay-guide">'+
   '<p><b>Desenvolvimento:</b> projeto independente A Floresta Mente, com assistência de inteligência artificial na programação e na criação de recursos.</p>'+
   '<p><b>Tecnologias:</b> Phaser 3 (licença MIT), PeerJS (MIT), TypeScript, Vite e Web Audio API.</p>'+
   '<p><b>Arte e áudio:</b> formas vetoriais, efeitos sintetizados e cinco músicas instrumentais originais criadas para o jogo (licença de distribuição com o projeto). Consulte docs/CREDITOS_E_LICENCAS.md.</p>'+
   '<p><b>Licenças:</b> consulte as licenças e avisos de copyright de cada dependência distribuída no projeto.</p>'+
   '<p>Obrigado por jogar. A floresta sobrevive quando cuidamos dela.</p>'+
   '</div>':
   '<p>Somente no modo solo de desenvolvimento. Os controles abaixo não afetam salas multiplayer.</p>'+
   '<pre class="dev-inspector" id="dev-inspector">'+safeText(devSnapshot())+'</pre>'+
   '<div class="dev-actions">'+
   '<button type="button" id="dev-restart" class="btn secondary">REINICIAR ESTA FASE</button>'+
   '<button type="button" id="dev-cycle" class="btn secondary">'+(net.level===4?'ADIANTAR CICLO DE FOGO':'ADIANTAR TRANSFORMAÇÃO')+'</button>'+
   '<button type="button" id="dev-exit" class="btn secondary">VOLTAR AO MENU</button></div>';
 const wrapper=document.createElement('div');
 wrapper.id='fm-overlay';wrapper.className='fm-overlay';
 wrapper.innerHTML='<div class="overlay-scrim" data-close-overlay></div>'+
  '<section role="dialog" aria-modal="true" aria-labelledby="fm-title" class="overlay-sheet">'+
  '<header><span class="kicker">A FLORESTA MENTE</span>'+
  '<button type="button" id="fm-close" aria-label="Fechar">✕</button></header>'+
  '<h2 id="fm-title">'+title+'</h2>'+body+
  '<button type="button" id="fm-back" class="btn secondary">VOLTAR</button></section>';
 document.body.appendChild(wrapper);
 wrapper.querySelectorAll('[data-close-overlay],#fm-close,#fm-back')
  .forEach(element=>element.addEventListener('click',closeOverlay));
 document.addEventListener('keydown',overlayKey);
 const slider=(id:'music'|'sfx'|'ambient')=>{
  wrapper.querySelector<HTMLInputElement>('#fm-'+id)?.addEventListener('input',e=>{
   const n=Number((e.currentTarget as HTMLInputElement).value);
   setAudioSettings({[id]:n});
   const output=wrapper.querySelector<HTMLOutputElement>('#fm-'+id+'-value');
   if(output)output.textContent=n+'%';
  });
 };
 slider('music');slider('sfx');slider('ambient');
 wrapper.querySelector<HTMLInputElement>('#fm-musicMuted')?.addEventListener('change',e=>
  setAudioSettings({musicMuted:(e.currentTarget as HTMLInputElement).checked}));
 wrapper.querySelector<HTMLInputElement>('#fm-muted')?.addEventListener('change',e=>
  setAudioSettings({muted:(e.currentTarget as HTMLInputElement).checked}));
 wrapper.querySelector('#dev-restart')?.addEventListener('click',()=>{
  closeOverlay();net.restartSolo();
 });
 wrapper.querySelector('#dev-cycle')?.addEventListener('click',()=>net.advanceLoopCycle());
 wrapper.querySelector('#dev-exit')?.addEventListener('click',()=>{
  closeOverlay();net.shutdown();
 });
 (wrapper.querySelector<HTMLElement>('#fm-close')??wrapper).focus();
}

/** HTML5 intro sourced from the committed repository video; no duplicate players. */
let introVideo:HTMLVideoElement|null=null;
let introLayer:HTMLDivElement|null=null;
let cinematicWatchTimer:ReturnType<typeof setInterval>|null=null;
let introStageShown=false;
/** Prevent replay during phase snapshots, Pipo updates and video buffering. */
let finalStageShown=false;
function stopIntroVideo():void{
 if(cinematicWatchTimer!==null){clearInterval(cinematicWatchTimer);cinematicWatchTimer=null;}
 const video=introVideo;
 introVideo=null;
 if(video){
  video.pause();video.removeAttribute('src');video.load();
 }
 introLayer?.remove();introLayer=null;
}
/** Cinematic media only: native seek/pause/PiP controls are never exposed.
 * A guest can report natural completion, but only a host can skip the movie.
 */
function playIntroVideo(onComplete:()=>void,allowSkip=true,onSkip=onComplete,
  file:'introducao.mp4'|'final.mp4'='introducao.mp4'):void{
 stopIntroVideo();
 const holder=document.createElement('div');
 introLayer=holder;
 holder.id='video-intro';holder.className='video-intro';
 const video=document.createElement('video');
 introVideo=video;
 video.src=import.meta.env.BASE_URL+file;
 video.playsInline=true;video.controls=false;video.preload='auto';
 video.autoplay=true;video.tabIndex=-1;
 video.disablePictureInPicture=true;
 video.setAttribute('controlsList','nodownload nofullscreen noplaybackrate noremoteplayback');
 video.setAttribute('aria-label',file==='final.mp4'?'Encerramento cinematográfico A Floresta Mente':'Introdução cinematográfica A Floresta Mente');
 const preferences=getAudioSettings();
 video.volume=preferences.music/100;
 video.muted=preferences.muted||preferences.musicMuted;
 const complete=(callback:()=>void)=>{
  if(introVideo!==video)return;
  stopIntroVideo();
  callback();
 };
 const skip=document.createElement('button');
 if(allowSkip){
  skip.type='button';skip.className='btn secondary video-skip';
  skip.textContent=file==='final.mp4'?'⏭ PULAR ENCERRAMENTO':'⏭ PULAR INTRODUÇÃO';
  skip.addEventListener('click',()=>complete(onSkip));
 }
 video.addEventListener('ended',()=>complete(onComplete),{once:true});
 // Broken/unsupported media must not leave clients trapped behind the intro.
 video.addEventListener('error',()=>complete(onComplete),{once:true});
 holder.appendChild(video);
 if(allowSkip)holder.appendChild(skip);
 document.body.appendChild(holder);
 // Only the movie's soundtrack should be heard during the prologue.
 audio.setScore('none');
 // MP4 may remain stalled without 'ended' or 'error' and otherwise block
 // phase 01 forever. Recover only after 14 seconds of zero video progress.
 const health=new CinematicProgressWatch(Date.now());
 cinematicWatchTimer=setInterval(()=>{
   if(introVideo!==video)return;
   if(health.sample(video.currentTime,Date.now(),document.hidden))
     complete(allowSkip?onSkip:onComplete);
 },1000);
 void video.play().catch(()=>{
  if(introVideo!==video)return;
  // Browsers may require a direct gesture before starting video with sound.
  const prompt=document.createElement('button');
  prompt.type='button';prompt.className='btn video-play';
  prompt.textContent='▶ REPRODUZIR INTRODUÇÃO';
  prompt.addEventListener('click',()=>{
   void video.play().then(()=>prompt.remove()).catch(()=>{});
  });
  holder.appendChild(prompt);
 });
}
/** One safe entry point for both solo menus. The film runs only for phase 01. */
function startSoloAdventure(level:1|2|3|4,avatars:AvatarChoices=loadSoloAvatars()):void{
 phaseMapOpen=false;devSession=false;info='';
 if(level===1){
  playIntroVideo(()=>{net.startLoopSolo(avatars);net.setNickname(profile.nickname);});
  return;
 }
 net.startSolo(level,false,'loop',avatars);net.setNickname(profile.nickname);
}
function activateGameScene(instance:Phaser.Game,mode:GameMode,scene:Phaser.Scene):void{
  if(game!==instance)return; // an old async renderer boot must not revive a left room
  const key=scene.sys.settings.key;
  if(activeSceneKey===key)return;
  // Shutdown unsubscribes each level from Network and Phaser events.
  // Unlike Game.destroy(), SceneManager transitions do NOT lose WebGL context.
  const previous=activeSceneKey;
  activeMode=mode;activeSceneKey=key;
  if(previous){
    instance.scene.stop(previous);
    instance.scene.remove(previous);
  }
  instance.scene.add(key,scene,true);
}
function enterGame():void{
  // Game.destroy(true) is deferred by Phaser to the NEXT renderer frame.
  // Creating a new WebGL context before DESTROY causes intermittent freezes
  // when restarting from the menu, especially on lower-memory browsers.
  if(!game&&retiringGame)return;
  setActiveAvatarSelections(([0,1,2] as const).map(seat=>net.avatarForSeat(seat)));
  const mode=(net.stage==='intro'?'intro':
    net.experience==='loop'?(net.level===4?'fire':net.level===3?'treetop':net.level===2?'temporal':'loop'):
    'level'+net.level) as GameMode;
  if(game&&activeMode===mode)return;
  const scene=mode==='intro'?new IntroScene():
    mode==='loop'?new ForestLoopScene(net,touch,refreshHud):
    mode==='temporal'?new TemporalForestScene(net,touch,refreshHud):
    mode==='treetop'?new TreetopForestScene(net,touch,refreshHud):
    mode==='fire'?new BurningForestScene(net,touch,refreshHud):
    mode==='level2'?new JourneyScene(net,touch,refreshHud):
    net.level>=3?new LateScene(net,touch,refreshHud):new ForestScene(net,touch,refreshHud);
  if(game){
    if(rendererReady)activateGameScene(game,mode,scene);
    else {
      // A movie can finish while the initial renderer is still booting.
      // Keep only the latest phase; activating an outdated scene causes hangs.
      pendingScene={mode,scene};activeMode=mode;
    }
    return;
  }
  activeMode=mode;
  activeSceneKey=scene.sys.settings.key;
  rendererReady=false;pendingScene=null;
  const view=viewportSize(window);
  const instance=new Phaser.Game({
    type:Phaser.AUTO,
    parent:'game',
    width:view.width,height:view.height,
    backgroundColor:'#091c23',
    render:{antialias:true,pixelArt:false},
    scale:{mode: Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.NO_CENTER},
    physics:{default:'arcade',arcade:{debug:false,gravity:{x:0,y:0}}},
    scene:[scene]
  });
  game=instance;
  const onRendererReady=()=>{
    if(game!==instance||rendererReady)return;
    rendererReady=true;
    if(pendingScene){
      const pending=pendingScene;pendingScene=null;
      activateGameScene(instance,pending.mode,pending.scene);
    }
  };
  // Phaser READY may fire within the Game constructor on a warm texture
  // cache. Checking isRunning avoids missing the event and freezing forever.
  if(instance.isRunning)onRendererReady();
  else instance.events.once(Phaser.Core.Events.READY,onRendererReady);
}
function exitGame():void{
  const instance=game;
  if(!instance)return;
  game=null;rendererReady=false;activeMode='none';activeSceneKey=null;pendingScene=null;
  retiringGame=instance;
  instance.events.once(Phaser.Core.Events.DESTROY,()=>{
    if(retiringGame!==instance)return;
    retiringGame=null;
    if(net.role!=='idle'&&(net.playing||net.stage==='intro'))enterGame();
  });
  // Destroy once, on returning to menu. Its WebGL context only becomes
  // available again after Phaser's queued next-frame destruction.
  instance.destroy(true);
  unmountMobileControls();
}
function currentMission(){
 return net.level===4?missionSnapshot(4,net.fire):
   net.level===3?missionSnapshot(3,net.treetop):
   net.level===2?missionSnapshot(2,net.temporal):
   missionSnapshot(1,net.loop);
}
function refreshHud(): void {
  // The shared soundtrack owns the battle crossfade and returns to the rain
  // theme immediately after the guardian falls or the team leaves the arena.
  if(net.playing&&net.experience==='loop'&&net.level===4)
   audio.setScore(net.fire.treeOpen&&net.fire.hound.hp>0&&
     net.poses.some(p=>p.x>=4250)?'battle':'fire');
  if(net.playing&&net.experience==='loop'&&net.level===2)
   audio.setScore(scoreForEncounter(net.stage,net.level,net.experience,
     {exit:net.temporal.exit,hp:net.temporal.boss.hp,aggroAt:net.temporal.boss.aggroAt},net.poses.map(p=>p.x)));
  if(net.playing&&net.experience==='loop'&&net.localSeat!==null){
    const world=net.level===4?net.fire:net.level===3?net.treetop:net.level===2?net.temporal:net.loop;
    const update=(id:string,value:string)=>{
      const el=document.getElementById(id);
      if(el&&el.textContent!==value)el.textContent=value;
    };
    const objective=net.level===4?fireObjective(net.fire):net.level===3?treeObjective(net.treetop):net.level===2?temporalObjective(net.temporal):loopObjective(net.loop,net.poses);
    const remaining=net.level===4?
      (net.fire.blackoutUntil>Date.now()?Math.ceil((net.fire.blackoutUntil-Date.now())/1000):
       Math.max(0,Math.ceil((FIRE_SHIFT_PERIOD-
        Math.max(0,Date.now()-net.fire.phaseStart))/1000))):
      world.blackoutUntil>Date.now()
        ?Math.max(0,Math.ceil((world.blackoutUntil-Date.now())/1000))
        :Math.max(0,Math.ceil(((net.level===3?TREE_CYCLE:net.level===2?TEMP_CYCLE:LOOP_CYCLE_MS)-
           Math.max(0,Date.now()-world.cycleStart))/1000));
    update('loop-state',['A','B','C'][world.layout]);
    update('run-clock',net.runStartedAt?'⏱ '+formatTime(elapsedMs(net.runStartedAt,net.runFinishedAt)):'⏱ TREINO');
    update('loop-timer',net.level===4?(net.fire.blackoutUntil>Date.now()?'FLORESTA SE TRANSFORMANDO · ':'FLORESTA MUDA EM ')+remaining+'s':
      (world.blackoutUntil>Date.now()?'FLORESTA SE TRANSFORMANDO · ':'FLORESTA MUDA EM ')+remaining+'s');
    update('loop-objective',currentMission().objective);
    update('loop-progress',objective.progress);
    update('loop-wind',net.level===4?
      (fireHeavySmoke(net.fire,net.poses[net.localSeat],Date.now())?'⚠ FUMAÇA · ':'')+
       (net.fire.windDirection>0?'FOGO E VENTO ▶':'◀ FOGO E VENTO'):
      net.level===3?
      (net.treetop.windPhase==='gust'?
        (treeExposure(net.poses[net.localSeat])===0?'🛡 ABRIGADO':
          (net.treetop.windDirection>0?'🌪 RAJADA ▶':'◀ RAJADA 🌪')):
       net.treetop.windPhase==='warning'?
        (net.treetop.windDirection>0?'⚠ VENTO FORTE ▶':'◀ VENTO FORTE ⚠'):
       (treeWind(net.treetop,net.poses[net.localSeat].x)<0?'VENTO ◀':
        treeWind(net.treetop,net.poses[net.localSeat].x)>0?'VENTO ▶':'VENTO ↓')):
      net.level===2?
      (tempWind(net.temporal,net.poses[net.localSeat].x)<0?'CHUVA ◀':
       tempWind(net.temporal,net.poses[net.localSeat].x)>0?'CHUVA ▶':'CHUVA ↓'):
      loopWind(net.loop,net.localSeat,net.poses[net.localSeat].x));
    update('loop-character',CHARACTERS[net.localSeat].name.toUpperCase());
    update('loop-skill',net.localSeat===0?'SALTO DUPLO':net.localSeat===1?'J · BALADEIRA':'SHIFT · DASH');
    for(const seat of [0,1,2] as const){
      const hearts=document.getElementById('loop-hearts-'+seat);
      if(hearts){
        for(let h=0;h<3;h++)hearts.children[h]?.classList.toggle('lost',h>=world.health[seat]);
        hearts.setAttribute('aria-label',world.health[seat]+' de 3 corações');
      }
      const percent=world.stamina[seat];
      const track=document.getElementById('loop-energy-track-'+seat);
      track?.setAttribute('aria-valuenow',String(Math.floor(percent)));
      track?.classList.toggle('low-energy',percent<35);
      const bar=document.getElementById('loop-energy-'+seat) as HTMLElement|null;
      if(bar)bar.style.width=percent+'%';
      update('loop-energy-text-'+seat,Math.floor(percent)+'/100');
      document.getElementById('loop-vital-'+seat)?.classList.toggle('selected',
        seat===net.localSeat);
    }
    const inspector=document.getElementById('dev-inspector');
    if(inspector&&devSession&&net.isSolo)inspector.textContent=devSnapshot();
    // Local musical dynamics depend only on authoritative chapter world.
    // Never send music through PeerJS and never restart a loop on pose packets.
    if(net.experience==='loop'){
      const tension=net.level===4?(
        fireVisualTreePhase(net.fire)==='impact'?1:
        fireVisualTreePhase(net.fire)==='warning'?.85:.55):
        net.level===3?(net.treetop.windPhase==='gust'?1:
          net.treetop.windPhase==='warning'?.66:.28):
        net.level===2?.26:
        net.loop.lastRoute==='right'?.62:net.loop.marks.every(Boolean)?.42:.14;
      audio.setIntensity(tension);
    }
    const local=net.poses[net.localSeat];
    const now=Date.now();
    if(Math.abs(local?.vx??0)>75&&Math.abs(local?.vy??0)<65&&now-lastStepAt>390){
      lastStepAt=now;audio.play('step');
    }
  }
  const scene = game?.scene.keys[net.experience==='loop'?(net.level===4?'BurningForestScene':net.level===3?'TreetopForestScene':net.level===2?'TemporalForestScene':'ForestLoopScene'):net.level >= 3 ? 'LateScene' : net.level === 2 ? 'JourneyScene' : 'ForestScene'] as DemoScene | ForestScene | RiverScene | JourneyScene | LateScene | ForestLoopScene | TemporalForestScene | TreetopForestScene | BurningForestScene | undefined;
  const skill = document.querySelector<HTMLElement>('#skill-status');
  if (skill && scene?.getCooldown) skill.textContent = scene.getCooldown();
  const team=document.querySelector<HTMLElement>('#team-status');
  if (team && net.localSeat !== null && net.playing) {
    const x = net.poses[net.localSeat].x;
    const names: string[]=[];
    for (const p of net.poses) {
      if (p.seat === net.localSeat || !net.players[p.seat].online) continue;
      const dx=p.x-x;
      if(Math.abs(dx)>185)names.push((dx<0?'◀':'▶')+' '+CHARACTERS[p.seat].name);
    }
    team.textContent=names.join(' · ');
  }
}
setInterval(refreshHud, 150);

function render(): void {
  if(net.stage!=='intro')introStageShown=false;
  const showingFinalMovie=net.stage==='final'&&net.level===4&&
    net.experience==='loop'&&!net.endingComplete;
  if(!showingFinalMovie)finalStageShown=false;
  if(net.stage!=='intro'&&!showingFinalMovie&&net.role!=='idle')stopIntroVideo();
  gameKeys.setEnabled(net.playing);
  const showing = net.stage !== 'lobby' && net.role !== 'idle';
  document.body.classList.toggle('playing', net.playing);
  if(!net.playing)unmountMobileControls();
  audio.setBiome(net.playing&&net.experience==='loop'?(['none','night','rain','treetop','fire'] as const)[net.level]:
    net.stage==='intro'?'night':'none');
  audio.setScore(introVideo?'none':scoreForStage(net.stage,net.level,net.experience));
  applyViewport();
  ui.classList.toggle('in-game', showing);
  if (showing) {
    if (net.stage === 'intro' || net.playing) enterGame();
    if (net.stage === 'intro') {
      const canSkipIntro=net.isHost;
      ui.innerHTML = '<div class="hud">🌙 PRÓLOGO · A FLORESTA MENTE · Sala ' + safeText(net.code) +
        ' · <span class="text-muted">introdução sincronizada com a sala</span></div>' +
        (canSkipIntro?'<div class="cinematic-actions">'+
          button('skip-intro', '⏭ PULAR INTRODUÇÃO', true)+'</div>':'') +
        (info ? '<div class="game-toast">' + safeText(info) + '</div>' : '');
      if(canSkipIntro)ui.querySelector('#skip-intro')?.addEventListener('click',()=>{
        stopIntroVideo();net.skipIntro();
      });
      if(!introVideo&&!introStageShown){
        introStageShown=true;
        playIntroVideo(()=>net.completeIntro(),canSkipIntro,()=>net.skipIntro());
      }
      return;
    }
    if (net.stage === 'transition'&&net.experience==='loop') {
      ui.innerHTML=net.level===3?
        '<div class="interlevel fire-transition"><h2>FASE 03 CONCLUÍDA</h2>'+ 
        '<p>As copas ficaram para trás... mas o horizonte ficou vermelho.</p>'+ 
        '<div class="fire-horizon">🔥 🌲 🔥</div>'+ 
        '<p><strong>PIPO:</strong> O fogo está chegando! Não podemos abandonar a floresta!</p>'+ 
        '<strong>FASE 04 — FLORESTA EM CHAMAS</strong></div>':
        net.level===2?
        '<div class="interlevel"><h2>FASE 02 CONCLUÍDA</h2>'+
        '<p>Os três sobem por árvores gigantescas que desaparecem na névoa...</p>'+
        '<strong>FASE 03 — CAMINHO DAS ÁRVORES</strong></div>':
        '<div class="interlevel"><h2>FASE 01 CONCLUÍDA</h2>'+
        '<p>Os três entram na névoa. A chuva se aproxima...</p>'+
        '<strong>FASE 02 — A FLORESTA TEMPORAL</strong></div>';
      return;
    }
    if (net.stage === 'transition') {
      const titles=['','A BOCA DA NOITE','A PONTE QUEBRADA','OLHOS NA MATA','A TRILHA QUE MENTE'];
      ui.innerHTML = '<div class="interlevel"><h2>🌿 FASE CONCLUÍDA!</h2><p>' +
        (net.level===1?'VOCÊS CONSEGUIRAM ATRAVESSAR!':net.level===2?'VOCÊS VENCERAM A CORRENTEZA!':'VOCÊS SOBREVIVERAM À ESCURIDÃO!') +
        '</p><p>'+(net.level===2?'Mas a noite ainda esconde perigos...':'Os três amigos seguem juntos...')+'</p><strong>FASE 0'+(net.level+1)+' · '+titles[net.level+1]+'</strong></div>';
      return;
    }
    if (net.stage === 'final' && net.experience==='loop'&&net.level===4) {
      // Do not render the victory buttons until the entire video is finished
      // on every connected player, or the host skips it for the whole room.
      if(!net.endingComplete){
        ui.innerHTML='<div class="interlevel final-cinematic-wait"><h2>AVENTURA CONCLUÍDA!</h2>'+
          '<p>Encerramento da floresta em reprodução.</p>'+
          '<strong>AGUARDANDO OS AMIGOS...</strong></div>';
        if(!finalStageShown){
          finalStageShown=true;
          playIntroVideo(()=>net.completeEndingVideo(),net.isHost,
            ()=>net.skipEndingVideo(),'final.mp4');
        }
        return;
      }
      ui.innerHTML='<div class="victory fire-victory"><div class="fire-finale-symbol">🌱</div>'+ 
        '<h2>A FLORESTA MENTE. MAS O FOGO TAMBÉM.</h2>'+ 
        '<p>Os três chegaram exaustos à margem do rio. Pipo pousou ao lado deles.</p>'+ 
        '<strong>NINGUÉM FICA PARA TRÁS. NEM A FLORESTA.</strong>'+ 
        '<p>A AVENTURA FOI CONCLUÍDA!</p>'+victoryScore(net)+
        button('show-final-credits','VER CRÉDITOS',true)+
        button('leave-final','VOLTAR AO MENU')+'</div>';
      ui.querySelector('#leave-final')?.addEventListener('click',()=>net.shutdown());
      ui.querySelector('#show-final-credits')?.addEventListener('click',()=>openPanel('credits'));
      return;
    }
    if (net.stage === 'final' && net.experience==='loop'&&net.level===3) {
      ui.innerHTML='<div class="victory"><h2>FASE 03 CONCLUÍDA!</h2>'+ 
        '<p>Os três amigos sobreviveram às copas. NINGUÉM FICA PARA TRÁS.</p>'+ 
        button('leave-final','VOLTAR AO MENU')+'</div>';
      ui.querySelector('#leave-final')?.addEventListener('click',()=>net.shutdown());return;
    }
    if (net.stage === 'final' && net.experience==='loop'&&net.level===2) {
      ui.innerHTML='<div class="victory"><h2>VOCÊS VENCERAM A TEMPESTADE!</h2>'+
        '<p>Mas a floresta ainda não revelou todos os seus caminhos...</p>'+
        button('leave-final','VOLTAR AO MENU')+'</div>';
      ui.querySelector('#leave-final')?.addEventListener('click',()=>net.shutdown());
      return;
    }
    if (net.stage === 'final' && net.experience==='loop') {
      ui.innerHTML = '<div class="victory"><h2>NINGUÉM FICA PARA TRÁS!</h2>' +
        '<p>A FLORESTA MENTE. MAS O VENTO NÃO.</p><p>Os três encontraram a saída verdadeira.</p>' +
        button('leave-final','VOLTAR AO MENU')+'</div>';
      ui.querySelector('#leave-final')?.addEventListener('click',()=>net.shutdown());
      return;
    }
    if (net.stage === 'final') {
      ui.innerHTML = '<div class="victory"><h2>🌟 VOCÊS DESCOBRIRAM A VERDADE!</h2>' +
        '<p>Mas ainda existe algo protegendo a saída da floresta...</p><p>O último capítulo chegará em breve.</p>' +
        button('leave-final', 'VOLTAR AO MENU') + '</div>';
      ui.querySelector('#leave-final')?.addEventListener('click', () => net.shutdown());
      return;
    }
    if(net.playing&&net.experience==='loop'){
      const seat=net.localSeat??0;
      const selected=CHARACTERS[seat];
      const object=net.level===4?fireObjective(net.fire):net.level===3?treeObjective(net.treetop):net.level===2?temporalObjective(net.temporal):loopObjective(net.loop);
      ui.innerHTML='<div class="loop-top-left" aria-label="Estado da floresta">'+
        '<span class="loop-state">'+(net.level===4?'FASE 04 · FLORESTA EM CHAMAS':net.level===3?'FASE 03 · CAMINHO DAS ÁRVORES':net.level===2?'FASE 02 · FLORESTA TEMPORAL':'FASE 01 · A BOCA DA NOITE')+' · <strong id="loop-state">'+(['A','B','C'][net.level===4?net.fire.layout:net.level===3?net.treetop.layout:net.level===2?net.temporal.layout:net.loop.layout])+'</strong></span>'+
        '<span id="loop-timer">FLORESTA MUDA EM —</span><span id="run-clock" class="run-clock">⏱ 00:00</span></div>'+
        '<div class="loop-top-right" aria-live="polite"><strong id="loop-objective">'+safeText(currentMission().objective)+'</strong>'+
        '<small id="loop-progress">'+safeText(object.progress)+'</small></div>'+
        '<div class="loop-wind" id="loop-wind" aria-label="Direção do vento"></div>'+
        '<div class="loop-bottom-left">'+
        '<div class="loop-vitals" aria-label="Vida e estamina da equipe">'+
        ([0,1,2] as const).map(i=>'<div class="loop-vital '+(i===seat?'selected':'')+
          '" id="loop-vital-'+i+'"><div class="loop-vital-heading">'+
          '<span style="color:'+CHARACTERS[i].hex+'">'+safeText(CHARACTERS[i].name.toUpperCase())+'</span>'+
          '<span class="loop-hearts" id="loop-hearts-'+i+'" aria-label="3 corações">'+
          '<span>♥</span><span>♥</span><span>♥</span></span></div>'+
          '<div class="loop-energy-track" id="loop-energy-track-'+i+
          '" role="progressbar" aria-label="Estamina de '+safeText(CHARACTERS[i].name)+
          '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">'+
          '<span id="loop-energy-'+i+'" style="width:100%"></span></div>'+
          '<small id="loop-energy-text-'+i+'">100/100</small></div>').join('')+
        '</div><span class="loop-current-skill"><strong id="loop-character">'+
        safeText(selected.name.toUpperCase())+'</strong><small id="loop-skill"></small></span></div>'+
        (net.isSolo?'<nav class="loop-seat-switch" aria-label="Trocar personagem">'+
          ([0,1,2] as const).map(i=>'<button data-seat="'+i+'" '+(i===seat?'class="active" ':'')+
            'aria-label="Controlar '+CHARACTERS[i].name+'">'+(i+1)+' · '+CHARACTERS[i].name+'</button>').join('')+
          '</nav>':'')+
        '<div class="game-tool-strip" role="group" aria-label="Ajuda e opções">'+
        '<button id="pipo-help" type="button" aria-label="Pedir uma dica ao Pipo">🦜 DICA <small>H</small></button>'+
        '<div class="loop-menu">'+
        (net.isSolo?'<details id="loop-dev"><summary>⚙ <span>Opções</span></summary>'+
          '<div class="loop-menu-options">'+
          '<button id="sound-options">CONFIGURAÇÕES</button>'+
          '<button id="solo-restart">'+(net.level===4?'REINICIAR FASE 04':net.level===3?'REINICIAR FASE 03':net.level===2?'REINICIAR FASE 02':'REINICIAR TENTATIVA')+'</button>'+
          (devSession?'<button id="dev-inspect">PAINEL DE TESTES</button>'+
            (net.level===1?'<button id="dev-performance">DIAGNÓSTICO FPS · LIGAR/DESLIGAR</button>'+
            '<button id="dev-quality">PERFIL GRÁFICO · NORMAL/REDUZIDO</button>':'')+
            '<button id="solo-cycle">'+(net.level===4?'ADIANTAR CICLO DE FOGO':'ADIANTAR TRANSFORMAÇÃO')+'</button>':'')+
          '<button id="solo-leave">VOLTAR AO MENU</button></div></details>':
          '<details id="loop-options"><summary>⚙ <span>Opções</span></summary>'+
          '<div class="loop-menu-options">'+
          '<button id="sound-options">CONFIGURAÇÕES</button>'+
          (devSession&&net.level===1?'<button id="dev-performance">DIAGNÓSTICO FPS · LIGAR/DESLIGAR</button>':'')+
          '<button id="leave" title="Sair da sala">SAIR DA SALA</button></div></details>')+
        '</div></div>'+
        (net.players.some(p=>!p.online)?'<div class="loop-offline">Aguardando reconexão da equipe.</div>':'')+
        (info?'<div class="loop-alert" role="status">'+safeText(info)+'</div>':'');
      ui.querySelector('#pipo-help')?.addEventListener('click',()=>window.dispatchEvent(new Event('pipo-help')));
      ui.querySelector('#sound-options')?.addEventListener('click',()=>openPanel('settings'));
      ui.querySelector('#dev-inspect')?.addEventListener('click',()=>openPanel('developer'));
      ui.querySelector('#dev-performance')?.addEventListener('click',()=>window.dispatchEvent(new Event('stage24:metrics-toggle')));
      ui.querySelector('#dev-quality')?.addEventListener('click',()=>window.dispatchEvent(new Event('stage24:quality-toggle')));
      ui.querySelector('#solo-restart')?.addEventListener('click',()=>net.restartSolo());
      ui.querySelector('#solo-cycle')?.addEventListener('click',()=>net.advanceLoopCycle());
      ui.querySelector('#solo-leave')?.addEventListener('click',()=>net.shutdown());
      ui.querySelector('#leave')?.addEventListener('click',()=>net.shutdown());
      ui.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(button=>
        button.addEventListener('click',()=>net.selectSoloSeat(Number(button.dataset.seat) as 0|1|2)));
      ensureMobileControls();
      refreshHud();
      return;
    }
    const player = net.localSeat === null ? 'Conectando' : CHARACTERS[net.localSeat].name;
    const online = net.players.filter(p => p.online).length;
    const paused = online < 3;
    ui.innerHTML = (net.isSolo
      ? '<div class="solo-hud"><strong>CLÁSSICO · <span style="color:' +
        CHARACTERS[net.localSeat??0].hex + '">' + safeText(player.toUpperCase()) + '</span></strong>' +
        '<div class="solo-switch"><button data-seat="0">1 · TÉO</button>' +
        '<button data-seat="1">2 · LIA</button><button data-seat="2">3 · NINO</button></div>' +
        '<details class="classic-dev"><summary>⚙</summary><div class="classic-dev-options">' +
        '<button id="solo-restart">REINICIAR FASE</button>' +
        '<button id="solo-leave">VOLTAR AO MENU</button>' +
        '<small>Tempos de cooperação adaptados para troca manual.</small></div></details></div>'
      : '') + '<div class="hud">🌳 A FLORESTA MENTE · <span class="text-muted">' +
      safeText(player) + (net.experience==='loop'?' · FLORESTA QUE MUDA':' · FASE 0'+net.level) + ' · Sala ' + safeText(net.code) + ' · ' + online + '/3</span> · <span id="skill-status"></span> ' +
      '<span id="team-status" class="team-status"></span><button id="leave" class="hud-leave" title="Sair da sala">✕</button></div>' +
      (net.experience==='classic' && net.level === 1 && net.forest.caboStep >= 1 && net.forest.caboStep < 5
        ? '<div class="forest-dialogue"><p>'+safeText(GUIDE_DIALOGUES[net.forest.caboStep])+'</p>'+button('cabo-next','CONTINUAR · E')+'</div>' : '') +
      (net.completed
        ? '<div class="victory"><h2>🌟 NINGUÉM FICA PARA TRÁS!</h2><p>Os três amigos venceram juntos o primeiro desafio da floresta.</p>' +
          button('leave-win', 'VOLTAR AO MENU') + '</div>'
        : paused
          ? '<div class="game-toast">⚠️ Aguardando reconexão. O avanço cooperativo está pausado.</div>'
          : info ? '<div class="game-toast">' + safeText(info) + '</div>' : '');
    document.querySelector<HTMLButtonElement>('#leave')?.addEventListener('click', () => net.shutdown());
    document.querySelector<HTMLButtonElement>('#solo-restart')?.addEventListener('click',()=>net.restartSolo());
    document.querySelector<HTMLButtonElement>('#solo-cycle')?.addEventListener('click',()=>net.advanceLoopCycle());
    document.querySelector<HTMLButtonElement>('#solo-leave')?.addEventListener('click',()=>{
      net.shutdown();
    });
    ui.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(button=>{
      button.classList.toggle('active',Number(button.dataset.seat)===net.localSeat);
      button.addEventListener('click',()=>net.selectSoloSeat(Number(button.dataset.seat) as 0|1|2));
    });
    document.querySelector<HTMLButtonElement>('#cabo-next')?.addEventListener('click', () => net.act({kind:'talk'}));
    document.querySelector<HTMLButtonElement>('#leave-win')?.addEventListener('click', () => net.shutdown());
    ensureMobileControls();
    return;
  }
  exitGame();
  const panelStart = '<main class="panel">';
  if(net.role==='idle'&&soloSelectLevel!==null){
    const level=soloSelectLevel;
    const occupied=new Map<AvatarId,string>();
    soloDraft.forEach((id,i)=>{if(i!==soloFocus)occupied.set(id,CHARACTERS[i].name);});
    ui.innerHTML='<main class="panel skin-select-panel">'+
      '<span class="kicker">A FLORESTA MENTE · MODO SOLO</span>'+
      '<h2>ESCOLHA SEUS PERSONAGENS</h2>'+
      '<p>Escolha três aparências diferentes. As habilidades dos papéis de Téo, Lia e Nino não mudam.</p>'+
      '<div class="role-picker" role="group" aria-label="Qual papel deseja personalizar?">'+
      ([0,1,2] as const).map(i=>'<button type="button" class="role-chip'+
        (i===soloFocus?' role-chip-active':'')+'" data-role="'+i+'" aria-pressed="'+
        (i===soloFocus)+'"><strong>'+safeText(CHARACTERS[i].name)+'</strong>'+
        '<small>'+ROLE_SKILLS[i]+'</small><em>'+safeText(avatarInfo(soloDraft[i]).label)+'</em></button>').join('')+'</div>'+
      '<p class="skin-selector-caption">PERSONALIZANDO: <strong>'+safeText(roleLabel(soloFocus))+'</strong></p>'+
      avatarGrid(soloDraft[soloFocus],occupied,'solo')+
      '<div class="actions">'+button('solo-confirm','▶ INICIAR AVENTURA')+
      button('solo-back','VOLTAR',true)+'</div>'+
      '<p class="skin-explainer">Só a aparência muda. Salto duplo, baladeira, dash, colisões e puzzles continuam iguais.</p></main>';
    ui.querySelectorAll<HTMLButtonElement>('[data-role]').forEach(item=>
      item.addEventListener('click',()=>{soloFocus=Number(item.dataset.role) as 0|1|2;render();}));
    ui.querySelectorAll<HTMLButtonElement>('[data-solo-avatar]').forEach(item=>
      item.addEventListener('click',()=>{
        const candidate=item.dataset.soloAvatar;
        if(!isAvatarId(candidate))return;
        const next=selectSoloAvatar(soloDraft,soloFocus,candidate);
        if(!next)return;
        soloDraft=next;
        if(soloFocus<2)soloFocus=(soloFocus+1) as 0|1|2;
        render();
      }));
    ui.querySelector('#solo-back')?.addEventListener('click',()=>{
      soloSelectLevel=null;phaseMapOpen=soloFromPhaseMap;render();
    });
    ui.querySelector('#solo-confirm')?.addEventListener('click',()=>{
      if(!uniqueAvatars(soloDraft))return;
      const chosen=[...soloDraft] as AvatarChoices;
      saveSoloAvatars(chosen);
      soloSelectLevel=null;
      beforeFirstPlay(()=>startSoloAdventure(level,chosen));
    });
    return;
  }
  if(net.role==='idle'&&rankingsOpen){
    ui.innerHTML='<main class="panel rank-panel"><span class="kicker">GAME JAM · RECORDES DO NAVEGADOR</span>'+
      '<h2>🏆 MELHORES TEMPOS</h2>'+
      '<p>Ranking local deste dispositivo. Não é uma classificação mundial do itch.io.</p>'+
      rankingSection('solo')+rankingSection('multiplayer')+
      button('ranking-back','VOLTAR AO MENU',true)+'</main>';
    ui.querySelector('#ranking-back')?.addEventListener('click',()=>{rankingsOpen=false;render();});
    return;
  }
  if(net.role==='idle'&&phaseMapOpen){
    const names=['A BOCA DA NOITE','FLORESTA TEMPORAL','CAMINHO DAS ÁRVORES','FLORESTA EM CHAMAS'];
    const icons=['🌙','⛈️','🌳','🔥'];
    ui.innerHTML='<main class="panel phase-map"><span class="kicker">EXPEDIÇÃO AMAZÔNICA</span>'+
      '<h2>SELECIONE SUA FASE</h2><p>Escolha uma região para iniciar uma nova aventura solo.</p>'+
      '<div class="phase-trail">'+names.map((name,i)=>
        '<button class="phase-stop" type="button" data-phase="'+(i+1)+'">'+
        '<span class="phase-icon">'+icons[i]+'</span><strong>0'+(i+1)+' — '+name+
        '</strong><small>INICIAR FASE</small></button>').join('')+'</div>'+
      button('phase-back','VOLTAR AO MENU',true)+'</main>';
    ui.querySelector('#phase-back')?.addEventListener('click',()=>{phaseMapOpen=false;render();});
    ui.querySelectorAll<HTMLButtonElement>('[data-phase]').forEach(item=>
      item.addEventListener('click',()=>{
        const level=Number(item.dataset.phase) as 1|2|3|4;
        showSoloSelection(level);
      }));
    return;
  }
  if (net.role === 'idle') {
    ui.innerHTML = '<main class="panel menu-panel">' + banner() + notice() +
      nicknameInput()+
      '<div class="actions primary-play">'+
      button('loop-solo','JOGAR SOZINHO')+
      button('create','MULTIPLAYER ONLINE')+'</div>'+ 
      '<div class="menu-join">'+button('join-menu','ENTRAR COM CÓDIGO',true)+'</div>'+ 
      '<nav class="menu-secondary" aria-label="Mais opções">'+
      '<button id="show-how" type="button">COMO JOGAR</button>'+
      '<button id="show-settings" type="button">CONFIGURAÇÕES</button>'+
      '<button id="show-credits" type="button">CRÉDITOS</button></nav>'+
      button('select-phase','SELECIONAR FASE',true)+
       button('show-ranking','🏆 MELHORES TEMPOS',true)+
      '<p class="menu-footnote">Multiplayer: três pessoas entram na mesma sala pelo código.</p></main>';
    ui.querySelector('#show-how')?.addEventListener('click',()=>openPanel('how'));
    ui.querySelector('#show-settings')?.addEventListener('click',()=>openPanel('settings'));
    ui.querySelector('#show-credits')?.addEventListener('click',()=>openPanel('credits'));
    ui.querySelector('#show-ranking')?.addEventListener('click',()=>{captureProfile();rankingsOpen=true;render();});
     ui.querySelector('#select-phase')?.addEventListener('click',()=>{
      captureProfile();phaseMapOpen=true;render();
    });
    ui.querySelector('#create')?.addEventListener('click',()=>{captureProfile();devSession=false;info='';void net.createRoom('loop');net.setNickname(profile.nickname);net.setTeamName(profile.teamName);});
    ui.querySelector('#create-classic')?.addEventListener('click',()=>{devSession=false;info='';void net.createRoom('classic');});
    ui.querySelector('#loop-solo')?.addEventListener('click',()=>{captureProfile();showSoloSelection(1);});
    ui.querySelector('#join-menu')?.addEventListener('click',()=>{captureProfile();devSession=false;showJoin();});
    return;
  }
  if (net.role === 'guest' && net.localSeat === null) {
    ui.innerHTML = panelStart + '<div class="kicker">ENTRANDO NA FLORESTA</div><h2>Sala ' +
      safeText(net.code) + '</h2><p>Conectando ao anfitrião pelo PeerJS Cloud...</p>' +
      notice() + button('back', 'VOLTAR', true) + '</main>';
    ui.querySelector('#back')?.addEventListener('click', () => net.shutdown());
    return;
  }
  if (net.role === 'host' && !net.code) {
    ui.innerHTML = panelStart + '<div class="kicker">CRIANDO SALA</div><h2>Procurando um código disponível...</h2>' +
      notice() + button('back', 'CANCELAR', true) + '</main>';
    ui.querySelector('#back')?.addEventListener('click', () => net.shutdown());
    return;
  }
  const roster = net.players.map((p, i) => {
    const persona=CHARACTERS[i],chosen=isAvatarId(p.avatar)?avatarInfo(p.avatar):null;
    const portrait=chosen?
      '<img class="roster-skin" src="'+import.meta.env.BASE_URL+
      'characters/kenney/preview-'+chosen.file+'.png" alt="'+safeText(chosen.label)+'" width="42" height="56"/>':
      '<span class="roster-skin-empty">?</span>';
    return '<div class="player">'+portrait+
      '<strong>'+persona.name+' · '+ROLE_SKILLS[i]+'</strong>'+
      '<small>'+safeText(cleanName(p.nickname,persona.name))+'</small>'+
      '<small>'+(chosen?safeText(chosen.label):'Ainda não escolheu')+'</small>'+
      '<small><span class="dot '+(p.online?'online':'')+'"></span>'+
      (p.online?(p.ready?'PRONTO ✓':'ESCOLHENDO'):'AGUARDANDO...')+'</small></div>';
  }).join('');
  const me = net.localSeat;
  const ready = me === null ? false : net.players[me].ready;
  const chosenAvatar=me===null?null:net.players[me].avatar;
  const occupied=new Map<AvatarId,string>();
  net.players.forEach((p,i)=>{
    if(i!==me&&p.online&&isAvatarId(p.avatar))
      occupied.set(p.avatar,cleanName(p.nickname,CHARACTERS[i].name));
  });
  const selectCards=avatarGrid(isAvatarId(chosenAvatar)?chosenAvatar:null,occupied,'multiplayer');
  const readyButton=button('ready',ready?'✓ PRONTO — DESMARCAR':'✓ ESTOU PRONTO',
    ready,me===null||!isAvatarId(chosenAvatar));
  const startButton = net.isHost ? button('start', '▶ INICIAR JOGO', false, !net.canStart) : '';
  // Compact desktop/mobile layout: profile and three-seat roster share the
  // same row, with the mandatory READY/START controls always visible below.
  ui.innerHTML = '<main class="panel lobby-panel">'+
    '<header class="lobby-header"><div class="kicker">SALA COOPERATIVA · 3 JOGADORES</div>'+
    '<h2>A equipe está se formando</h2></header>'+
    '<div class="lobby-overview">'+
      '<section class="lobby-identity" aria-label="Identificação da equipe">'+
        (net.isHost?teamInput(net.teamName):
          '<p class="rank-team">Equipe: '+safeText(net.teamName)+'</p>')+
        nicknameInput()+
        '<div class="lobby-room"><div class="muted">CÓDIGO DA SALA</div>'+
          '<div class="code-row"><div class="code">'+safeText(net.code)+'</div>'+
          button('copy','COPIAR',true)+'</div></div>'+
        '<div class="jam-profile-save">'+button('save-player','SALVAR NOME(S)',true)+'</div>'+
      '</section>'+
      '<section class="lobby-members" aria-label="Jogadores conectados">'+
        '<div class="player-list">'+roster+'</div></section>'+
    '</div>'+
    '<section class="multiplayer-skins"><h3>ESCOLHA SEU PERSONAGEM</h3>'+
      '<p>Um visual por jogador. A aparência não muda as habilidades.</p>'+
      (me===null?'':selectCards)+'</section>'+
    '<footer class="lobby-footer">'+notice()+
      '<div class="actions">'+readyButton+startButton+button('leave-lobby','SAIR',true)+'</div>'+
      '<div class="tip">'+(net.isHost?
        'Papel: Téo · SALTO DUPLO. Inicie quando todos escolherem e estiverem prontos.':
        'Seu papel: '+(me===null?'aguarde conexão':CHARACTERS[me].name)+
        ' · '+(me===null?'':ROLE_SKILLS[me])+'. Aguarde o anfitrião iniciar.')+'</div>'+
      '<details class="lobby-rules"><summary>CONTROLES E OBJETIVO</summary>'+
        '<div class="rules"><b>COMPUTADOR:</b> A/D ou ←/→ para andar; ESPAÇO ou ↑ para pular; SHIFT = dash de Nino (ativa alvos azuis sem E); J = baladeira de Lia; E = interação indicada.'+
        '<p><b>CELULAR:</b> setas na esquerda e PULAR na direita. Coloque na horizontal.</p>'+
        '<p><b>OBJETIVO:</b> escapem da floresta no menor tempo possível! Joguem em equipe, combinem suas habilidades e sigam os sinais e avisos do Pipo para superar os perigos. Ninguém fica para trás!</p>'+
        '</div></details></footer></main>';
  ui.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach(item=>
    item.addEventListener('click',()=>{
      const id=item.dataset.avatar;
      if(!isAvatarId(id))return;
      captureProfile();
      net.setNickname(profile.nickname);
      if(net.role==='host')net.setTeamName(profile.teamName);
      net.selectAvatar(id);
    }));
  ui.querySelector('#copy')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(net.code).then(() => { info = 'Código copiado!'; render(); })
      .catch(() => { info = 'Copie este código: ' + net.code; render(); });
  });
  ui.querySelector('#save-player')?.addEventListener('click',()=>{captureProfile();net.setNickname(profile.nickname);if(net.role==='host')net.setTeamName(profile.teamName);});
   ui.querySelector('#ready')?.addEventListener('click', () => { captureProfile();net.setNickname(profile.nickname);if(net.role==='host')net.setTeamName(profile.teamName);info = ''; if(ready)net.ready(false);else beforeFirstPlay(()=>net.ready(true)); });
  ui.querySelector('#start')?.addEventListener('click', () => { captureProfile();net.setNickname(profile.nickname);if(net.role==='host')net.setTeamName(profile.teamName);info = ''; beforeFirstPlay(()=>net.start()); });
  ui.querySelector('#leave-lobby')?.addEventListener('click', () => net.shutdown());
}
function showJoin(): void {
  ui.innerHTML = '<main class="panel"><div class="kicker">REUNIR OS TRÊS AMIGOS</div>' +
    '<h2>Entrar em sala</h2><p>Peça o código de 6 caracteres para o anfitrião.</p>' +
    '<form id="join-form"><label class="jam-field">SEU APELIDO <input id="join-nickname" type="text" maxlength="22" value="'+safeText(profile.nickname)+'" autocomplete="nickname"/></label><input class="code-input" id="code-input" type="text" maxlength="6" ' +
    'autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" ' +
    'placeholder="ABC123" required aria-label="Código da sala"/>' +
    '<div class="actions">' + button('submit', 'ENTRAR') + button('cancel', 'VOLTAR', true) + '</div></form></main>';
  const form = document.querySelector<HTMLFormElement>('#join-form')!;
  document.querySelector<HTMLButtonElement>('#cancel')?.addEventListener('click', event => {
    event.preventDefault(); render();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#code-input')!;
    const code = input.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { input.setCustomValidity('Use 6 caracteres.'); input.reportValidity(); return; }
    captureProfile();info = ''; net.joinRoom(code);net.setNickname(profile.nickname);
  });
  form.querySelector<HTMLInputElement>('#code-input')?.addEventListener('input', event => {
    (event.target as HTMLInputElement).setCustomValidity('');
  });
}
/** Mission effects are derived from the already validated chapter snapshots. */
window.addEventListener('mission-audio',event=>{
 const message=(event as CustomEvent<{kind?:string}>).detail;
 if(!net.playing||net.experience!=='loop')return;
 if(message?.kind==='puzzle')audio.play('puzzle');
});
/** Shared audio follows authoritative events, never triggers gameplay rules. */
const soundProgress=new Map<number,{count:number;dead:boolean;blackout:boolean;health:string}>();
function observeSound(phase:1|2|3|4,
 health:readonly number[],count:number,deadUntil:number,blackoutUntil:number):void{
 if(net.experience!=='loop'||net.level!==phase||!net.playing)return;
 const now=Date.now(),key=health.join(',');
 const previous=soundProgress.get(phase);
 const dead=deadUntil>now,blackout=blackoutUntil>now;
 if(previous){
  if(health.some((h,i)=>h<Number(previous.health.split(',')[i])))audio.play('hit');
  if(count>previous.count)audio.play('puzzle');
  if(!previous.blackout&&blackout)audio.play('blackout');
  if(!previous.dead&&dead)audio.play('defeat');
 }
 soundProgress.set(phase,{health:key,count,dead,blackout});
}
net.on('loop',w=>observeSound(1,w.health,
 w.marks.filter(Boolean).length+w.tree.filter(Boolean).length+
 w.final.filter(Boolean).length+(w.exit?1:0),w.deadUntil,w.blackoutUntil));
net.on('temporal',w=>observeSound(2,w.health,
 w.echo.filter(Boolean).length+w.tree.filter(Boolean).length+
 w.roots.filter(Boolean).length,w.deadUntil,w.blackoutUntil));
net.on('treetop',w=>observeSound(3,w.health,
 w.bridge.filter(Boolean).length+w.tower.filter(Boolean).length+
 w.time.filter(Boolean).length,w.deadUntil,w.blackoutUntil));
net.on('fire',w=>observeSound(4,w.health,
 w.log.filter(Boolean).length+w.smoke.filter(Boolean).length+
 w.tree.filter(Boolean).length,w.deadUntil,w.blackoutUntil));
net.on('vital-reply',reply=>{
 if(!reply.ok)return;
 audio.play(reply.kind==='doubleJump'?'doubleJump':
  reply.kind==='jump'?'jump':reply.kind==='shoot'?'shoot':'dash');
});
gameKeys.bind();
net.on('solo-seat',seat=>updateMobileCharacter(seat));
net.on('change',()=>{
 if(net.role==='idle'){info='';devSession=false;closeOverlay();}
 if(net.role==='idle')stopIntroVideo();
 render();
});
net.on('start', () => { info = ''; render(); });
net.on('phase', data => {
 info='';closeOverlay();
 if(data.stage==='final'&&data.level===4)recordVictory(net);
 if(data.stage==='transition')audio.play('transition');
 if(data.stage==='final')audio.play('victory');
 render();
});
net.on('notice', text => {if(net.role==='idle')return;info=text;render();});
net.on('win', () => { info = ''; render(); });
window.addEventListener('keydown', event => {
  if(net.isSolo&&net.playing&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)){
    event.preventDefault();
    net.selectSoloSeat(Number(event.code.slice(-1))-1 as 0|1|2);
    return;
  }
  if (net.playing && ['ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('beforeunload', () => {stopIntroVideo();audio.destroy();net.shutdown();});
render();
