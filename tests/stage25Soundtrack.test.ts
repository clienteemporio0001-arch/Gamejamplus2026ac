import {strict as assert} from 'node:assert';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {SCORE_CATALOG,scoreForStage,OriginalSoundtrack} from '../src/soundtrack';
import {getAudioSettings,normalizeAudioSettings,setAudioSettings,audioLevel} from '../src/audioSettings';
const SRC=(name:string)=>readFileSync('src/'+name+'.ts','utf8');
const main=SRC('main'),audio=SRC('sharedAudio'),music=SRC('soundtrack');
const workflow=readFileSync('.github/workflows/pages.yml','utf8');
const composer=readFileSync('scripts/compose_soundtrack.py','utf8');
const manifest=JSON.parse(readFileSync('public/audio/manifest.json','utf8'));
assert.equal(Object.keys(SCORE_CATALOG).length,5);
for(const [key,spec] of Object.entries(SCORE_CATALOG)){
 const file='public/audio/'+spec.file;
 assert.ok(existsSync(file),key+' must be an actual MP3, not a placeholder');
 assert.ok(statSync(file).size>100_000,'a real playable audio file is required: '+file);
 const bytes=readFileSync(file);
 assert.ok(bytes.subarray(0,3).toString()==='ID3'||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0),
   'MP3 header: '+file);
 const metadata=manifest[key];
 assert.ok(metadata&&metadata.file===spec.file);
 assert.ok(metadata.durationSeconds>=60&&metadata.durationSeconds<=120);
 assert.ok(Math.abs(metadata.durationSeconds-spec.seconds)<.05);
 assert.ok(metadata.origin.includes('Original'));
 assert.ok(metadata.license.includes('game'));
}
for(const [level,expected] of [[1,'night'],[2,'rain'],[3,'treetop'],[4,'fire']] as const){
 assert.equal(scoreForStage('playing',level,'loop'),expected);
 assert.equal(scoreForStage('transition',level,'loop'),
  ({1:'rain',2:'treetop',3:'fire',4:'ending'} as const)[level]);
}
assert.equal(scoreForStage('final',4,'loop'),'ending');
assert.equal(scoreForStage('lobby',1,'loop'),'menu');
assert.equal(scoreForStage('intro',1,'loop'),'menu');
assert.equal(scoreForStage('playing',1,'classic'),'none');
assert.equal(scoreForStage('playing',4,'loop'),'fire');
assert.ok(audio.includes('new AudioContext()'),'context created after gesture');
assert.ok(audio.includes("window.addEventListener('pointerdown'"));
assert.ok(audio.includes("window.addEventListener('keydown'"));
assert.ok(audio.includes("document.addEventListener('visibilitychange'"));
assert.ok(audio.includes("const music=ctx.createGain(),effects=ctx.createGain(),ambience=ctx.createGain()"));
assert.ok(audio.includes("this.soundtrack=new OriginalSoundtrack(ctx,music,import.meta.env.BASE_URL)"));
assert.ok(audio.includes("this.soundtrack?.setMuted(music===0)"));
assert.ok(audio.includes("audioLevel('ambient')"));
assert.ok(audio.includes('this.soundtrack?.destroy()'));
assert.ok(audio.includes("g.setTargetAtTime(normal*.48"));
assert.ok(music.includes("source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration"));
assert.ok(music.includes("if(this.ended||this.desired===cue)return"),'duplicate stage snapshots do not restart playback');
assert.ok(music.includes("gain.gain.linearRampToValueAtTime(this.target()"));
assert.ok(music.includes("level.setTargetAtTime(0"));
assert.ok(music.includes("this.ctx.decodeAudioData(array)"));
assert.ok(music.includes('cache.size>2'),'lazy bounded memory cache');
assert.ok(main.includes('scoreForStage(net.stage,net.level,net.experience)'));
assert.ok(main.includes("fireVisualTreePhase(net.fire)"));
assert.ok(main.includes("windPhase==='gust'"));
assert.ok(main.includes('audio.setIntensity(tension)'));
assert.ok(main.includes("slider('music');slider('sfx');slider('ambient')"));
assert.ok(main.includes('fm-musicMuted')&&main.includes('fm-muted'));
assert.ok(main.includes("if(data.stage==='final')audio.play('victory')"));
assert.ok(main.includes("net.on('treetop'")&&main.includes("net.on('fire'"));
assert.ok(workflow.includes('npm run build')&&workflow.includes('npm run test'));
assert.ok(composer.includes('libmp3lame')&&composer.includes('HARMONY')&&composer.includes('MOTIFS'));
// End-to-end gain automation with deterministic fake browser AudioContext:
class Param{
 values:Array<{kind:string,value:number}>=[];
 setTargetAtTime(value:number):void{this.values.push({kind:'target',value});}
 setValueAtTime(value:number):void{this.values.push({kind:'value',value});}
 linearRampToValueAtTime(value:number):void{this.values.push({kind:'fadein',value});}
 cancelScheduledValues():void{}
}
class Gain{gain=new Param();connect():void{}disconnect():void{}}
class Source{
 loop=false;loopStart=0;loopEnd=0;
 buffer:any;startCount=0;stopCount=0;onended:(()=>void)|null=null;
 connect():void{}disconnect():void{}
 start():void{this.startCount++;}
 stop():void{this.stopCount++;}
}
class Context{
 currentTime=4;
 sources:Source[]=[];
 createGain():Gain{return new Gain();}
 createBufferSource():Source{const source=new Source();this.sources.push(source);return source;}
 async decodeAudioData():Promise<any>{return {duration:96};}
}
const wait=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const global=globalThis as typeof globalThis & {fetch:typeof fetch};
const originalFetch=global.fetch;
let loads=0,broken=false;
global.fetch=(async(_url:string)=>{
 loads++;
 if(broken)throw new Error('simulated network failure');
 return {ok:true,arrayBuffer:async()=>new ArrayBuffer(6)};
}) as unknown as typeof fetch;
try{
 const ctx=new Context(),bus=new Gain();
 const player=new OriginalSoundtrack(ctx as unknown as AudioContext,bus as unknown as GainNode,'/Gamejamplus2026ac');
 player.select('night');await wait();
 assert.equal(player.cue,'night');assert.equal(ctx.sources.length,1);
 assert.equal(ctx.sources[0].loop,true);
 assert.equal(ctx.sources[0].startCount,1);
 assert.equal(ctx.sources[0].loopEnd,96);
 const before=loads;
 for(let i=0;i<100;i++)player.select('night');
 await wait();assert.equal(ctx.sources.length,1);assert.equal(loads,before,'no duplicate downloads or tracks');
 player.setIntensity(.8);player.setMuted(true);
 assert.ok((ctx.sources.length===1));
 player.select('rain');await wait();
 assert.equal(ctx.sources.length,2);assert.equal(ctx.sources[0].stopCount,1,'old theme fades out');
 assert.equal(ctx.sources[1].startCount,1);
 player.select('menu');await wait();
 assert.equal(ctx.sources.length,3,'menu uses intro of original first-stage theme');
 player.select('ending');await wait();
 assert.equal(ctx.sources.length,4,'final theme is distinct');
 player.select('none');await wait();
 assert.equal(ctx.sources[3].stopCount,1);
 broken=true;
 player.select('treetop');await wait();
 assert.equal(player.cue,'treetop');
 assert.equal(ctx.sources.length,4,'failed download does not create broken audio node');
 player.destroy();
 const solo=new OriginalSoundtrack(ctx as unknown as AudioContext,bus as unknown as GainNode,'/');
 solo.select('none');solo.destroy();
}finally{global.fetch=originalFetch;}
let pref=normalizeAudioSettings({music:70,sfx:30,ambient:20,musicMuted:true,muted:false});
assert.equal(pref.ambient,20);
assert.equal(pref.musicMuted,true);
setAudioSettings(pref);
assert.equal(audioLevel('music'),0);
assert.equal(audioLevel('sfx'),.3);
assert.equal(audioLevel('ambient'),.2);
setAudioSettings({musicMuted:false});
assert.equal(audioLevel('music'),.7);
setAudioSettings({muted:true});
assert.equal(audioLevel('sfx'),0);
assert.equal(audioLevel('ambient'),0);
assert.equal(audioLevel('music'),0);
assert.equal(getAudioSettings().muted,true);
console.log('ETAPA 25: 5 MP3 reais, roteamento 4 fases+final, loops, fades, anti-duplicação, gestos, erro de rede, solo/multi e mixer aprovados');
