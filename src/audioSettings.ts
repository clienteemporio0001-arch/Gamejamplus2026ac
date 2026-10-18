/** Shared, locally persisted audio preferences; no external APIs or licensing. */
export type AudioSettings={music:number;sfx:number;ambient:number;musicMuted:boolean;muted:boolean};
export const AUDIO_STORAGE_KEY='floresta-mente.audio.v1';
export const AUDIO_CHANGE_EVENT='floresta-audio-changed';
export const DEFAULT_AUDIO_SETTINGS:Readonly<AudioSettings>={music:42,sfx:58,ambient:45,musicMuted:false,muted:false};
export function clampVolume(n:unknown,fallback:number):number{
 return typeof n==='number'&&Number.isFinite(n)?
  Math.max(0,Math.min(100,Math.round(n))):fallback;
}
export function normalizeAudioSettings(raw:unknown):AudioSettings{
 const o=raw&&typeof raw==='object'?raw as Partial<AudioSettings>:{};
 return {music:clampVolume(o.music,DEFAULT_AUDIO_SETTINGS.music),
  sfx:clampVolume(o.sfx,DEFAULT_AUDIO_SETTINGS.sfx),
  ambient:clampVolume(o.ambient,DEFAULT_AUDIO_SETTINGS.ambient),
  musicMuted:typeof o.musicMuted==='boolean'?o.musicMuted:DEFAULT_AUDIO_SETTINGS.musicMuted,
  muted:typeof o.muted==='boolean'?o.muted:DEFAULT_AUDIO_SETTINGS.muted};
}
let current:AudioSettings={...DEFAULT_AUDIO_SETTINGS};
if(typeof window!=='undefined'){
 try{
  const stored=window.localStorage.getItem(AUDIO_STORAGE_KEY);
  if(stored)current=normalizeAudioSettings(JSON.parse(stored));
 }catch{/* denied/private browsing: preferences remain in memory */}
}
export function getAudioSettings():Readonly<AudioSettings>{return current;}
export function audioLevel(kind:'music'|'sfx'|'ambient'):number{
 return current.muted||(kind==='music'&&current.musicMuted)?0:current[kind]/100;
}
export function setAudioSettings(settings:Partial<AudioSettings>):AudioSettings{
 current=normalizeAudioSettings({...current,...settings});
 if(typeof window!=='undefined'){
  try{window.localStorage.setItem(AUDIO_STORAGE_KEY,JSON.stringify(current));}
  catch{/* denied storage must not interrupt the game */}
  window.dispatchEvent(new Event(AUDIO_CHANGE_EVENT));
 }
 return {...current};
}
