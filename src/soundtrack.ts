import {composeGuardianBattle} from './guardianBattleMusic';
/** Original, file-backed stage soundtracks.
 * Each piece is composed specifically for A FLORESTA MENTE by the repository's
 * scripts/compose_soundtrack.py and stored as REAL playable MP3 in public/audio.
 * No third-party recordings or game/film music is included.
 */
export const SCORE_CATALOG={
 night:{file:'boca_da_noite.mp3',seconds:96,title:'A Boca da Noite'},
 battle:{file:'original-generated',seconds:64,title:'Cerco do Guardião'},
 rain:{file:'floresta_temporal.mp3',seconds:87.273,title:'A Floresta Temporal'},
 treetop:{file:'caminho_das_arvores.mp3',seconds:69.818,title:'Caminho das Árvores'},
 fire:{file:'floresta_em_chamas.mp3',seconds:76.8,title:'Floresta em Chamas'},
 ending:{file:'depois_das_cinzas.mp3',seconds:82.286,title:'Depois das Cinzas'},
} as const;
export type ScoreCue=keyof typeof SCORE_CATALOG|'none'|'menu';

/** Pure router: stages are authoritative, current animation/pose is irrelevant. */
export function scoreForStage(stage:string,level:number,experience:string):ScoreCue{
 // The menu starts before a game mode is chosen; play the existing quiet
 // suspense theme only after a real user gesture unlocks browser audio.
 if(stage==='idle'||stage==='lobby')return 'menu';
 if(experience!=='loop')return 'none';
 if(stage==='final'&&level===4)return 'ending';
 if(stage==='transition')return (['none','rain','treetop','fire','ending'] as const)[level]??'none';
 if(stage==='intro')return 'menu';
 if(stage!=='playing')return 'menu';
 return (['none','night','rain','treetop','fire'] as const)[level]??'none';
}
/** Battle score reuses the original suspense composition with crossfades,
 * not a second AudioContext or an unmanaged looping sound. */
export function scoreForEncounter(stage:string,level:number,experience:string,
 guardian:{exit:boolean;hp:number;aggroAt?:number},partyX:readonly number[]):ScoreCue{
 const regular=scoreForStage(stage,level,experience);
 if(regular==='rain'&&guardian.hp>0&&
    partyX.some(x=>Number.isFinite(x)&&x>=3000&&x<=4200))return 'battle';
 return regular;
}
type Playing={key:keyof typeof SCORE_CATALOG;source:AudioBufferSourceNode;gain:GainNode};
export class OriginalSoundtrack{
 private desired:ScoreCue='none';
 private playing?:Playing;
 private cache=new Map<string,AudioBuffer>();
 private loading=new Map<string,Promise<AudioBuffer>>();
 private generation=0;
 private intensity=0;
 private musicMuted=false;
 private ended=false;
 private readonly fadeSeconds=1.35;
 private readonly filesBase:string;
 constructor(private readonly ctx:AudioContext,private readonly musicBus:GainNode,baseUrl:string){
  this.filesBase=baseUrl.replace(/\/?$/,'/')+'audio/';
 }
 get cue():ScoreCue{return this.desired;}
 /** Do not retrigger playback when authoritative network snapshots arrive. */
 select(cue:ScoreCue):void{
  if(this.ended||this.desired===cue)return;
  this.desired=cue;
  const generation=++this.generation;
  if(cue==='none'){
   this.stopOld();
   return;
  }
  const key=cue==='menu'?'night':cue;
  if(this.playing?.key===key){this.adjust();return;}
  // Reduce old score during download. It never blocks phase progression.
  if(this.playing){
   const g=this.playing.gain.gain,now=this.ctx.currentTime;
   g.cancelScheduledValues(now);g.setTargetAtTime(.22,now,.38);
  }
  void this.load(key).then(buffer=>{
   if(this.ended||generation!==this.generation||this.desired!==cue)return;
   const now=this.ctx.currentTime;
   const gain=this.ctx.createGain();gain.gain.setValueAtTime(0,now);
   gain.connect(this.musicBus);
   const source=this.ctx.createBufferSource();source.buffer=buffer;
   source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
   source.connect(gain);
   this.stopOld(now);
   this.playing={key,source,gain};
   gain.gain.linearRampToValueAtTime(this.target(),now+this.fadeSeconds);
   source.start(now);
  }).catch(()=>{
   // Missing/unsupported audio never breaks controls, multiplayer or puzzles.
   if(generation===this.generation)this.stopOld();
  });
 }
 private async load(key:keyof typeof SCORE_CATALOG):Promise<AudioBuffer>{
  const file=SCORE_CATALOG[key].file;
  const cached=this.cache.get(file);
  if(cached)return cached;
  const pending=this.loading.get(file);
  if(pending)return pending;
  const task=(async()=>{
   if(key==='battle')return composeGuardianBattle();
   const response=await fetch(this.filesBase+file,{cache:'force-cache'});
   if(!response.ok)throw new Error('Unable to load '+file+': '+response.status);
   const array=await response.arrayBuffer();
   const buffer=await this.ctx.decodeAudioData(array);
   if(!Number.isFinite(buffer.duration)||buffer.duration<60)throw new Error('Invalid soundtrack '+file);
   this.cache.delete(file);this.cache.set(file,buffer);
   while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value!);
   return buffer;
  })();
  this.loading.set(file,task);
  try{return await task;}finally{this.loading.delete(file);}
 }
 private target():number{
  if(this.musicMuted)return 0;
  return (this.desired==='menu'?.34:.86)*(1+this.intensity*.20);
 }
 private adjust():void{
  if(!this.playing)return;
  const now=this.ctx.currentTime,g=this.playing.gain.gain;
  g.cancelScheduledValues(now);
  g.setTargetAtTime(this.target(),now,.28);
 }
 /** Intensity fades smoothly and never alters the host's gameplay state. */
 setIntensity(amount:number):void{
  const normalized=Number.isFinite(amount)?Math.max(0,Math.min(1,amount)):0;
  if(Math.abs(normalized-this.intensity)<.07)return;
  this.intensity=normalized;
  this.adjust();
 }
 setMuted(muted:boolean):void{
  if(muted===this.musicMuted)return;
  this.musicMuted=muted;this.adjust();
 }
 private stopOld(now=this.ctx.currentTime):void{
  const previous=this.playing;
  if(!previous)return;
  const level=previous.gain.gain;
  level.cancelScheduledValues(now);
  level.setTargetAtTime(0,now,.32);
  try{previous.source.stop(now+this.fadeSeconds+.2);}catch{}
  previous.source.onended=()=>{
   try{previous.source.disconnect();previous.gain.disconnect();}catch{}
  };
  this.playing=undefined;
 }
 destroy():void{
  if(this.ended)return;
  this.ended=true;this.generation++;
  this.stopOld();
  this.cache.clear();this.loading.clear();
 }
}
