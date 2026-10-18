import type {TreeWindPhase} from './treetopForest';
import {AUDIO_CHANGE_EVENT,audioLevel} from './audioSettings';
import {getSharedAudioContext} from './sharedAudio';

/** Tiny synthesized wind bed; activated only after the browser's user gesture. */
export class TreetopWindAudio {
 private context?:AudioContext;
 private source?:AudioBufferSourceNode;
 private filter?:BiquadFilterNode;
 private gain?:GainNode;
 private phase:TreeWindPhase='calm';
 private muted=false;
 private readonly activate=()=>{void this.unlock();};
 private readonly settingsChange=()=>this.apply();
 constructor(){
  document.addEventListener('pointerdown',this.activate,{passive:true});
  document.addEventListener('keydown',this.activate);
  window.addEventListener(AUDIO_CHANGE_EVENT,this.settingsChange);
 }
 private async unlock():Promise<void>{
  if(this.context){if(this.context.state==='suspended')await this.context.resume();return;}
  try{
   const context=getSharedAudioContext();
   const length=Math.max(1024,Math.floor(context.sampleRate*.48));
   const buffer=context.createBuffer(1,length,context.sampleRate);
   const data=buffer.getChannelData(0);
   // Noise is synthesized, no external files, and plays through a low-pass filter.
   for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*.35;
   const source=context.createBufferSource();
   source.buffer=buffer;source.loop=true;
   const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=620;
   const gain=context.createGain();gain.gain.value=0;
   source.connect(filter);filter.connect(gain);gain.connect(context.destination);
   source.start();
   this.context=context;this.source=source;this.filter=filter;this.gain=gain;
   this.apply();
  }catch{/* Browsers may deny audio without permission; the visual warning remains. */}
 }
 setPhase(phase:TreeWindPhase,muted=false):void{
  if(this.phase===phase&&this.muted===muted)return;
  this.phase=phase;this.muted=muted;this.apply();
 }
 private apply():void{
  if(!this.context||!this.gain||!this.filter)return;
  const now=this.context.currentTime;
  const amplitude=(this.muted?0:this.phase==='gust'?.105:this.phase==='warning'?.047:.014)*audioLevel('ambient');
  this.gain.gain.setTargetAtTime(amplitude,now,.25);
  this.filter.frequency.setTargetAtTime(this.phase==='gust'?1200:
    this.phase==='warning'?860:430,now,.34);
 }
 destroy():void{
  document.removeEventListener('pointerdown',this.activate);
  document.removeEventListener('keydown',this.activate);
  window.removeEventListener(AUDIO_CHANGE_EVENT,this.settingsChange);
  try{this.source?.stop();this.source?.disconnect();this.filter?.disconnect();this.gain?.disconnect();}catch{/* already stopped */}
  void this.context?.close();
  this.source=undefined;this.context=undefined;
 }
}
