import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {getAudioSettings,setAudioSettings,normalizeAudioSettings,clampVolume,
 DEFAULT_AUDIO_SETTINGS,AUDIO_CHANGE_EVENT} from '../src/audioSettings';
import {stickAxis,JOYSTICK_DEAD_ZONE} from '../src/joystick';
const src=(name:string)=>readFileSync('src/'+name+'.ts','utf8');
const main=src('main'),css=readFileSync('src/style.css','utf8');
const characters=src('sharedCharacterArt'),visuals=src('visuals');
const treetop=src('treetopArt'),fire=src('burningForestArt'),intro=src('intro');
const pad=src('mobileControls'),pipo=src('pipoGuide');
const soundtrack=src('sharedAudio');
const treeAudio=src('treetopWindAudio'),fireAudio=src('burningForestAudio');
const net=src('network');
const workflow=readFileSync('.github/workflows/pages.yml','utf8');
const credits=readFileSync('docs/CREDITOS_E_LICENCAS.md','utf8');
const guide=readFileSync('docs/REVISAO_DAS_FASES.md','utf8');
// The normal player's main actions are obvious, tools remain secondary.
for(const text of ['JOGAR SOZINHO','MULTIPLAYER ONLINE','COMO JOGAR',
 'CONFIGURAÇÕES','CRÉDITOS','FERRAMENTAS DE DESENVOLVIMENTO','ENTRAR COM CÓDIGO'])
 assert.ok(main.includes(text),'menu option '+text);
assert.ok(main.includes('class="panel menu-panel"'),'main menu retains standard panel and cinematic modifier');
assert.ok(main.includes('menu-atmosphere')&&css.includes('@keyframes menu-leaf'));
assert.ok(main.includes('show-how')&&main.includes('show-settings')&&main.includes('show-credits'));
assert.ok(main.includes('function openPanel(kind:PanelKind)'));
assert.ok(main.includes('aria-modal="true"')&&main.includes('aria-labelledby="fm-title"'));
assert.ok(main.includes("document.addEventListener('keydown',overlayKey)"));
assert.ok(main.includes("if(event.key==='Escape')"));
for(const stage of ['dev-loop','dev-temporal','dev-treetop','dev-fire'])
 assert.ok(main.includes(stage),'developer selects '+stage);
for(const starter of ['startLoopSolo','startTemporalSolo','startTreetopSolo','startFireSolo'])
 assert.ok(net.includes(starter));
assert.ok(main.includes("if(kind==='developer'&&(!devSession||!net.isSolo||!net.playing))return;"),
 'dev inspector cannot open in multiplayer or ordinary solo');
assert.ok(main.includes("devSession=true;info='';net.startFireSolo();"));
assert.ok(main.includes("devSession=false;info='';net.startLoopSolo();"));
assert.ok(main.includes("net.isSolo?'<details id=\"loop-dev\""));
assert.ok(main.includes("devSession?'<button id=\"dev-inspect\""));
assert.ok(main.includes("net.level===4?'REINICIAR FASE 04'"));
assert.ok(net.includes("if(!this.isSolo||this.experience!=='loop'||!this.playing)return;"),
 'cycle testing restricted to solo adventure');
assert.ok(net.includes("this.fireAuthority.world.phaseStart=Date.now()-60000;"),
 'stage 4 test advances the visible forest transformation instead of the fire-hazard clock');
assert.ok(main.includes("info='';devSession=false;closeOverlay();"));
// Characters are painted by the SAME method in all new adventure biomes.
assert.ok(characters.includes('export function paintHero('));
assert.ok(characters.includes('CHARACTER_COLORS'));
for(const art of [visuals,treetop,fire,intro])
 assert.ok(art.includes("import {paintHero} from './sharedCharacterArt'"),
 'all biomes and prologue use the same silhouettes');
assert.ok(visuals.includes('paintHero(actor.ink,actor.seat,time'));
assert.ok(treetop.includes('paintHero(g,seat,time,pose.vx,pose.vy)'));
assert.ok(fire.includes('paintHero(ink,seat,ms,pose.vx,pose.vy)'));
assert.ok(intro.includes('paintHero(hero,i as 0|1|2)'));
assert.ok(intro.includes('size.width/1200,size.height/700'),
 'intro maintains cinematic aspect ratio on mobile');
// Pipo retains contextual source from every phase and reduces repeat warnings.
for(let i=1;i<=4;i++)assert.ok(pipo.includes('phase:'+i),'Pipo reads phase '+i);
assert.ok(pipo.includes('lastAlertAt<6500'));
assert.ok(pipo.includes('private hasRequested=false'));
assert.ok(pipo.includes("this.depth=this.hasRequested?"),'first hint must be gentle');
assert.ok(pipo.includes('pipoSpeechLayout(')&&pipo.includes('this.offscreenMarker.setVisible(layout.offscreen)'),
 'dialog follows camera-aware Pipo speech anchor and stays readable on compact screens');
// The entire team, life, stamina and selected player remain visible in unified HUD.
assert.ok(main.includes('loop-hearts-')&&main.includes('loop-energy-track-'));
assert.ok(main.includes("loop-vital-'+seat")&&main.includes("'selected'"));
assert.ok(main.includes('loop-objective')&&main.includes('loop-progress'));
assert.ok(main.includes('net.fire.windDirection>0'),'fire HUD follows network host');
assert.ok(main.includes('FIRE_COLLAPSE_PERIOD'),'stage 4 cycle is labeled');
assert.ok(css.includes('env(safe-area-inset-left)')&&css.includes('env(safe-area-inset-right)'));
assert.ok(css.includes('safe-area-inset-bottom'));
assert.ok(css.includes('.fm-overlay')&&css.includes('.settings-control'));
// Touch queue and pointers: changing avatar does not destroy mounted pad.
assert.ok(pad.includes('const pressed=new Map<number'));
assert.ok(pad.includes('analogFinger'));
assert.ok(pad.includes("['pointerup','pointercancel','lostpointercapture']"));
assert.ok(pad.includes('document.addEventListener(\'visibilitychange\',hidden)'));
assert.ok(pad.includes("right.insertAdjacentHTML('afterbegin',special)"));
assert.ok(main.includes('mobilePad?.update(seat)'));
const center=stickAxis(2,0,100),full=stickAxis(100,0,100);
assert.ok(JOYSTICK_DEAD_ZONE>0&&center.x===0&&full.x===1);
// Preferences have real bounds and live updates; no network dependency.
assert.equal(clampVolume(175,50),100);
assert.equal(clampVolume(-5,50),0);
assert.equal(clampVolume(Number.NaN,50),50);
assert.deepEqual(normalizeAudioSettings({music:110,sfx:-100,muted:true}),
 {music:100,sfx:0,ambient:DEFAULT_AUDIO_SETTINGS.ambient,musicMuted:false,muted:true});
assert.deepEqual(normalizeAudioSettings(null),DEFAULT_AUDIO_SETTINGS);
setAudioSettings({music:61,sfx:37,muted:true});
assert.equal(getAudioSettings().music,61);
assert.equal(getAudioSettings().sfx,37);
assert.equal(getAudioSettings().muted,true);
assert.ok(soundtrack.includes("new AudioContext()"));
assert.ok(soundtrack.includes("window.addEventListener('pointerdown'"));
assert.ok(soundtrack.includes("window.addEventListener(AUDIO_CHANGE_EVENT"));
assert.ok(soundtrack.includes("audioLevel('music')")&&soundtrack.includes("audioLevel('sfx')"));
assert.ok(main.includes("setAudioSettings({[id]:n})"));
assert.ok(main.includes('setAudioSettings({muted:'));
assert.equal(AUDIO_CHANGE_EVENT,'floresta-audio-changed');
assert.ok(treeAudio.includes('window.addEventListener(AUDIO_CHANGE_EVENT,this.settingsChange)'),
 'treetop audio responds immediately to preference changes');
assert.ok(fireAudio.includes('window.addEventListener(AUDIO_CHANGE_EVENT,this.settingsChange)'),
 'fire audio responds immediately to preference changes');
assert.ok(treeAudio.includes("audioLevel('ambient')")&&fireAudio.includes("audioLevel('ambient')"));
assert.ok(main.includes("net.on('vital-reply'"));
assert.ok(main.includes("if(data.stage==='final')audio.play('victory')"));
// The official chain has four new acts without replacing classic level 4.
assert.ok(net.includes("if(this.experience==='loop'&&this.level===3)"));
assert.ok(net.includes("this.setPhase('playing',4)"));
assert.ok(net.includes("this.setPhase('final',4)"));
assert.ok(main.includes("button('dev-classic-'+level"));
assert.ok(main.includes('NINGUÉM FICA PARA TRÁS. NEM A FLORESTA.'));
assert.ok(main.includes("button('show-final-credits'"));
assert.ok(credits.includes('Phaser')&&credits.includes('PeerJS')&&credits.includes('inteligência artificial'));
for(let i=1;i<=4;i++)assert.ok(guide.includes('0'+i+' —'));
assert.ok(guide.includes('backup/etapa19-estavel-20261018'));
assert.ok(workflow.includes('npm run build')&&workflow.includes('npm run test'));
assert.ok(workflow.includes('actions/deploy-pages@v4'));
console.log('APROVADO: etapa 20 — menu, HUD, personagens, controles, Pipo, configurações, áudio e regressões');
