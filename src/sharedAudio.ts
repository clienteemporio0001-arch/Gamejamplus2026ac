import {AUDIO_CHANGE_EVENT,audioLevel} from './audioSettings';
import {OriginalSoundtrack,type ScoreCue} from './soundtrack';
/** All stages share one AudioContext. Never created before a user gesture. */
let sharedContext:AudioContext|undefined;
export function getSharedAudioContext():AudioContext{
 return sharedContext??(sharedContext=new AudioContext());
}
export type SoundBiome='none'|'night'|'rain'|'treetop'|'fire';
export type SoundCue='step'|'jump'|'doubleJump'|'dash'|'shoot'|'hit'|
 'interact'|'blackout'|'puzzle'|'transition'|'victory'|'defeat';

/** One shared browser AudioContext for file-backed music, ambient and SFX.
 * Music files are lazy-loaded after the first valid user gesture.
 */
export class GameAudio {
 private context?:AudioContext;
 private musicBus?:GainNode;private effectBus?:GainNode;
 private ambientBus?:GainNode;private noiseFilter?:BiquadFilterNode;
 private source?:AudioBufferSourceNode;
 private soundtrack?:OriginalSoundtrack;
 private score:ScoreCue='none';
 private intensity=0;

 private biome:SoundBiome='none';
 private lastStep=0;private lastHit=0;
 private onUnlock=()=>{void this.unlock();};
 private onSettings=()=>this.apply();
 private onVisibility=()=>{if(document.hidden){void this.context?.suspend().catch(()=>{});}else if(this.context){void this.unlock();}};
 constructor(){
  window.addEventListener('pointerdown',this.onUnlock,{passive:true});
  window.addEventListener('keydown',this.onUnlock);
  window.addEventListener(AUDIO_CHANGE_EVENT,this.onSettings);
  document.addEventListener('visibilitychange',this.onVisibility);
 }
 setBiome(next:SoundBiome):void{
  if(this.biome===next)return;
  this.biome=next;this.apply();
 }
 setScore(next:ScoreCue):void{
  if(this.score===next)return;
  this.score=next;this.soundtrack?.select(next);
 }
 setIntensity(value:number):void{
  this.intensity=value;this.soundtrack?.setIntensity(value);
 }
 private async unlock():Promise<void>{
  if(this.context){
   try{if(this.context.state==='suspended')await this.context.resume();}
   catch{/* autoplay gate is browser-defined */}
   return;
  }
  try{
   const ctx=getSharedAudioContext();
   const music=ctx.createGain(),effects=ctx.createGain(),ambience=ctx.createGain();
   music.gain.value=0;effects.gain.value=0;ambience.gain.value=0;
   music.connect(ctx.destination);effects.connect(ctx.destination);
   ambience.connect(ctx.destination);
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;
   const len=Math.floor(ctx.sampleRate*.41),buffer=ctx.createBuffer(1,len,ctx.sampleRate);
   const data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.2;
   const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
   source.connect(filter);filter.connect(ambience);source.start();
   this.context=ctx;this.musicBus=music;this.effectBus=effects;
   this.ambientBus=ambience;this.noiseFilter=filter;
   this.source=source;
   this.soundtrack=new OriginalSoundtrack(ctx,music,import.meta.env.BASE_URL);
   this.soundtrack.setIntensity(this.intensity);
   this.soundtrack.select(this.score);
   this.apply();
  }catch{/* Audio unavailable does not affect playability */}
 }
 private apply():void{
  if(!this.context)return;
  const now=this.context.currentTime;
  const open=this.biome!=='none';
  const lowpass:Record<SoundBiome,number>={
   none:280,night:450,rain:950,treetop:720,fire:1450};
  const bed:Record<SoundBiome,number>={
   none:0,night:.12,rain:.22,treetop:.16,fire:.22};
  const music=audioLevel('music'),sfx=audioLevel('sfx');
  this.soundtrack?.setMuted(music===0);
  this.musicBus?.gain.setTargetAtTime(music*.52,now,.22);
  this.effectBus?.gain.setTargetAtTime(sfx*.8,now,.15);
  this.ambientBus?.gain.setTargetAtTime(open?bed[this.biome]*audioLevel('ambient')*.65:0,now,.6);
  this.noiseFilter?.frequency.setTargetAtTime(lowpass[this.biome],now,.6);

 }
 /** Tiny original synthesizer envelopes. Does not edit gameplay events or timers. */
 play(cue:SoundCue):void{
  if(!this.context||!this.effectBus||this.context.state!=='running'||
    !audioLevel('sfx'))return;
  const ctx=this.context,now=ctx.currentTime;
  if(cue==='step'&&now-this.lastStep<.23)return;
  if(cue==='hit'&&now-this.lastHit<.34)return;
  if(cue==='step')this.lastStep=now;
  if(cue==='hit')this.lastHit=now;
  const table:Record<SoundCue,[number,number,number,OscillatorType]>={
   step:[140,86,.065,'triangle'],
   jump:[285,480,.17,'sine'],doubleJump:[365,650,.22,'triangle'],
   dash:[110,260,.21,'sawtooth'],shoot:[630,190,.15,'triangle'],
   hit:[160,64,.26,'sawtooth'],interact:[460,570,.16,'sine'],
   blackout:[180,48,.48,'triangle'],puzzle:[470,830,.41,'sine'],
   transition:[250,540,.70,'sine'],victory:[390,790,.90,'sine'],
   defeat:[175,54,.59,'triangle']
  };
  if(['hit','blackout','transition','defeat','victory'].includes(cue)&&this.musicBus){
    const now=this.context.currentTime,g=this.musicBus.gain;
    const normal=audioLevel('music')*.52;
    g.cancelScheduledValues(now);g.setTargetAtTime(normal*.48,now,.055);
    g.setTargetAtTime(normal,now+.72,.3);
  }
  const [begin,end,length,type]=table[cue];
  const oscillator=ctx.createOscillator(),envelope=ctx.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(begin,now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(25,end),now+length);
  envelope.gain.setValueAtTime(.0001,now);
  envelope.gain.exponentialRampToValueAtTime(cue==='step'?.045:.105,now+.009);
  envelope.gain.exponentialRampToValueAtTime(.0001,now+length);
  oscillator.connect(envelope);envelope.connect(this.effectBus);
  oscillator.start(now);oscillator.stop(now+length+.025);
 }
 destroy():void{
  window.removeEventListener('pointerdown',this.onUnlock);
  window.removeEventListener('keydown',this.onUnlock);
  window.removeEventListener(AUDIO_CHANGE_EVENT,this.onSettings);
  document.removeEventListener('visibilitychange',this.onVisibility);
  this.soundtrack?.destroy();
  try{this.source?.stop();}catch{}
  if(this.context){void this.context.close();if(sharedContext===this.context)sharedContext=undefined;}
 }
}
