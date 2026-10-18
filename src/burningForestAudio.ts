import type {FireWorld} from './burningForest';
import {fireTreePhase} from './burningForest';
/** Lightweight, opt-in-by-interaction procedural soundscape for the final act. */
export class BurningForestAudio {
 private ctx?:AudioContext;
 private hiss?:AudioBufferSourceNode;
 private filter?:BiquadFilterNode;
 private master?:GainNode;
 private phase:'calm'|'warning'|'impact'='calm';
 private wind:-1|1=1;
 private unlockHandler=()=>{void this.unlock();};
 constructor(){
  document.addEventListener('pointerdown',this.unlockHandler,{passive:true});
  document.addEventListener('keydown',this.unlockHandler);
 }
 private async unlock():Promise<void>{
  if(this.ctx){
   if(this.ctx.state==='suspended')await this.ctx.resume();
   return;
  }
  try{
   const ctx=new AudioContext();
   const len=Math.floor(ctx.sampleRate*.42),buffer=ctx.createBuffer(1,len,ctx.sampleRate);
   const data=buffer.getChannelData(0);
   for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*.25;
   const hiss=ctx.createBufferSource();hiss.buffer=buffer;hiss.loop=true;
   const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=680;
   const master=ctx.createGain();master.gain.value=0;
   hiss.connect(filter);filter.connect(master);master.connect(ctx.destination);
   hiss.start();this.ctx=ctx;this.hiss=hiss;this.filter=filter;this.master=master;
   this.mix(this.phase);
  }catch{/* browsers can block audio; the visible telegraph is mandatory */}
 }
 private mix(phase:'calm'|'warning'|'impact'):void{
  if(!this.ctx||!this.filter||!this.master)return;
  const now=this.ctx.currentTime;
  const amp=phase==='impact'?.13:phase==='warning'?.072:.028;
  this.master.gain.setTargetAtTime(amp,now,.36);
  this.filter.frequency.setTargetAtTime(phase==='impact'?1250:
   phase==='warning'?960:600,now,.4);
 }
 private crack():void{
  if(!this.ctx)return;
  const ctx=this.ctx;
  const oscillator=ctx.createOscillator();
  const gain=ctx.createGain();
  oscillator.type='sawtooth';
  oscillator.frequency.setValueAtTime(134,ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(41,ctx.currentTime+.23);
  gain.gain.setValueAtTime(.0001,ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.08,ctx.currentTime+.009);
  gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.24);
  oscillator.connect(gain);gain.connect(ctx.destination);
  oscillator.start();oscillator.stop(ctx.currentTime+.27);
 }
 update(w:FireWorld,now:number):void{
  const phase=fireTreePhase(w,now);
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
  try{this.hiss?.stop();}catch{/* already stopped */}
  void this.ctx?.close();this.ctx=undefined;
 }
}
