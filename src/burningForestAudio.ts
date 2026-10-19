import type {FireWorld} from './burningForest';
import {AUDIO_CHANGE_EVENT,audioLevel} from './audioSettings';
import {getSharedAudioContext} from './sharedAudio';
import {fireVisualTreePhase} from './burningForest';
import {FireballImpactTracker} from './fireballImpactAudio';
/** Lightweight, opt-in-by-interaction procedural soundscape for the final act. */
export class BurningForestAudio {
 private ctx?:AudioContext;
 private hiss?:AudioBufferSourceNode;
 private filter?:BiquadFilterNode;
 private master?:GainNode;
 private explosionNoise?:AudioBuffer;
 private explosionBus?:GainNode;
 private impactTracker=new FireballImpactTracker();
 private phase:'calm'|'warning'|'impact'='calm';
 private wind:-1|1=1;
 private unlockHandler=()=>{void this.unlock();};
 private settingsChange=()=>this.mix(this.phase);
 constructor(){
  document.addEventListener('pointerdown',this.unlockHandler,{passive:true});
  document.addEventListener('keydown',this.unlockHandler);
  window.addEventListener(AUDIO_CHANGE_EVENT,this.settingsChange);
 }
 private async unlock():Promise<void>{
  if(this.ctx){
   try{if(this.ctx.state==='suspended')await this.ctx.resume();}catch{/* browser gesture required */}
   return;
  }
  try{
   const ctx=getSharedAudioContext();
   const len=Math.floor(ctx.sampleRate*.42),buffer=ctx.createBuffer(1,len,ctx.sampleRate);
   const data=buffer.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.25;
   const hiss=ctx.createBufferSource();hiss.buffer=buffer;hiss.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=680;
   const master=ctx.createGain();master.gain.value=0;
   hiss.connect(filter);filter.connect(master);master.connect(ctx.destination);
   hiss.start();this.ctx=ctx;this.hiss=hiss;this.filter=filter;this.master=master;
   // One short reusable noise buffer and an independent low-volume SFX bus.
   // Shared AudioContext stays owned by GameAudio.
   const frames=Math.floor(ctx.sampleRate*.36);
   const noise=ctx.createBuffer(1,frames,ctx.sampleRate);
   const samples=noise.getChannelData(0);
   for(let i=0;i<frames;i++)samples[i]=(Math.random()*2-1);
   this.explosionNoise=noise;
   const sfx=ctx.createGain();sfx.gain.value=.72;
   sfx.connect(ctx.destination);this.explosionBus=sfx;
   this.mix(this.phase);
  }catch{/* browsers can block audio; the visible telegraph is mandatory */}
 }
 private mix(phase:'calm'|'warning'|'impact'):void{
  if(!this.ctx||!this.filter||!this.master)return;
  const now=this.ctx.currentTime;
  const amp=(phase==='impact'?.13:phase==='warning'?.072:.028)*audioLevel('ambient');
  this.master.gain.setTargetAtTime(amp,now,.36);
  this.filter.frequency.setTargetAtTime(phase==='impact'?1250:
   phase==='warning'?960:600,now,.4);
 }
 private crack():void{
  if(!this.ctx||!audioLevel('sfx'))return;
  const ctx=this.ctx;
  const oscillator=ctx.createOscillator();
  const gain=ctx.createGain();
  oscillator.type='sawtooth';
  oscillator.frequency.setValueAtTime(134,ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(41,ctx.currentTime+.23);
  gain.gain.setValueAtTime(.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.08*audioLevel('sfx'),ctx.currentTime+.009);
  gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.24);
  oscillator.connect(gain);gain.connect(ctx.destination);
  oscillator.start();oscillator.stop(ctx.currentTime+.27);
 }
 /** One crunchy burst plus a falling bass thump, spatially attenuated by
  * distance. Runs only on a newly-entered impact, never on each render frame.
  * The Settings SFX / mute control always takes priority.
  */
 private explosion(lane:number,distance:number):void{
  const ctx=this.ctx,bus=this.explosionBus,noise=this.explosionNoise;
  const volume=audioLevel('sfx');
  if(!ctx||ctx.state!=='running'||!bus||!noise||volume<=0)return;
  const proximity=Math.max(0,1-distance/1350);
  if(proximity<=0)return; // out-of-earshot impacts don't crowd the mix
  const strength=volume*Math.max(.08,proximity*proximity);
  const now=ctx.currentTime;
  const source=ctx.createBufferSource();source.buffer=noise;
  source.playbackRate.value=.91+(lane%5)*.035;
  const lowpass=ctx.createBiquadFilter();lowpass.type='lowpass';
  lowpass.Q.value=.58;
  lowpass.frequency.setValueAtTime(2100,now);
  lowpass.frequency.exponentialRampToValueAtTime(270,now+.30);
  const grit=ctx.createGain();
  grit.gain.setValueAtTime(.0001,now);
  grit.gain.exponentialRampToValueAtTime(Math.max(.0002,.15*strength),now+.009);
  grit.gain.exponentialRampToValueAtTime(.0001,now+.33);
  source.connect(lowpass);lowpass.connect(grit);grit.connect(bus);
  source.start(now);source.stop(now+.35);
  const bass=ctx.createOscillator();bass.type='triangle';
  bass.frequency.setValueAtTime(116+(lane%4)*9,now);
  bass.frequency.exponentialRampToValueAtTime(38,now+.27);
  const thump=ctx.createGain();
  thump.gain.setValueAtTime(.0001,now);
  thump.gain.exponentialRampToValueAtTime(Math.max(.0002,.19*strength),now+.014);
  thump.gain.exponentialRampToValueAtTime(.0001,now+.29);
  bass.connect(thump);thump.connect(bus);
  bass.start(now);bass.stop(now+.32);
  // Release one-shot nodes promptly; ambient hiss and shared context persist.
  source.onended=()=>{source.disconnect();lowpass.disconnect();grit.disconnect();};
  bass.onended=()=>{bass.disconnect();thump.disconnect();};
 }
 update(w:FireWorld,now:number,listenerX=0):void{
  // Every visible impact is sampled for both solo and guest clients from the
  // same FireWorld state. The effect never changes game collision or health.
  const impacts=this.impactTracker.sample(w,now);
  for(const impact of impacts)this.explosion(impact.lane,Math.abs(impact.x-listenerX));
  const phase=fireVisualTreePhase(w);
  if(phase!==this.phase){
   this.phase=phase;this.mix(phase);
   if(phase==='warning'||phase==='impact')this.crack();
  }
  this.wind=w.windDirection;
  if(this.ctx&&this.filter&&phase==='calm'){
   this.filter.frequency.setTargetAtTime(this.wind===1?650:580,
    this.ctx.currentTime,.85);
  }
 }
 destroy():void{
  document.removeEventListener('pointerdown',this.unlockHandler);
  document.removeEventListener('keydown',this.unlockHandler);
  window.removeEventListener(AUDIO_CHANGE_EVENT,this.settingsChange);
  try{this.hiss?.stop();this.hiss?.disconnect();this.filter?.disconnect();this.master?.disconnect();}catch{/* already stopped */}
  this.explosionBus?.disconnect();
  this.explosionBus=undefined;this.explosionNoise=undefined;
  // Never close the context shared with music, SFX, and other biomes.
  this.ctx=undefined;
 }
}
