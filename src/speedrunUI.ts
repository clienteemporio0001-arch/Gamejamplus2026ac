import {CHARACTERS,type Network} from './network';
import {cleanName,elapsedMs,formatTime,loadRecords,saveRecord,type RunResult,type ScoreMode} from './speedrun';

/** All profile and record storage is browser-local. No server, login or rank claim. */
const PROFILE_KEY='afm-gamejam-profile-v1';
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
export let profile={nickname:'Explorador',teamName:'Equipe da Mata'};
try{
 const data=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}') as {nickname?:string;teamName?:string};
 profile={nickname:cleanName(data.nickname),teamName:cleanName(data.teamName,'Equipe da Mata',28)};
}catch{/* Browser may disable storage. */}
export function captureProfile():void{
 const nick=document.querySelector<HTMLInputElement>('#player-nickname,#join-nickname');
 const team=document.querySelector<HTMLInputElement>('#team-name');
 if(nick)profile.nickname=cleanName(nick.value);
 if(team)profile.teamName=cleanName(team.value,'Equipe da Mata',28);
 try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* Private mode. */}
}
export function nicknameInput():string{
 return '<label class="jam-field">SEU APELIDO <input id="player-nickname" type="text" maxlength="22" '+
  'autocomplete="nickname" value="'+escape(profile.nickname)+'" placeholder="Explorador"/></label>';
}
export function teamInput(value:string):string{
 return '<label class="jam-field">NOME DA EQUIPE <input id="team-name" type="text" maxlength="28" '+
   'value="'+escape(value)+'" placeholder="Equipe da Mata"/></label>';
}
export function rankingSection(mode:ScoreMode):string{
 const items=loadRecords().filter(r=>r.mode===mode).slice(0,10);
 return '<section class="rank-mode"><h3>'+(mode==='solo'?'JOGADORES SOLO':'EQUIPES MULTIPLAYER')+'</h3>'+
  (items.length?'<ol>'+items.map(r=>'<li><strong>'+escape(r.name)+'</strong>'+
   '<span>'+formatTime(r.durationMs)+'</span>'+
   (mode==='multiplayer'?'<small>'+escape(r.players.join(' · '))+'</small>':'')+
   '</li>').join('')+'</ol>':'<p>Sem tempos registrados neste dispositivo.</p>')+
  '</section>';
}
let recordedId='';
let recordStatus:{rank:number;best:boolean;stored:boolean}|null=null;
export function recordVictory(net:Network):void{
 if(!net.isHost||!net.rankedRun)return;
 const id=net.code+':'+net.runStartedAt;
 if(id===recordedId)return;
 recordedId=id;
 const record:RunResult={
  id,mode:net.isSolo?'solo':'multiplayer',
  name:net.isSolo?profile.nickname:net.teamName,
  players:net.isSolo?[profile.nickname]:
   net.players.map((p,i)=>cleanName(p.nickname,CHARACTERS[i].name)),
  durationMs:elapsedMs(net.runStartedAt,net.runFinishedAt),
  finishedAt:net.runFinishedAt
 };
 recordStatus=saveRecord(record);
}
export function victoryScore(net:Network):string{
 if(!net.rankedRun)return '<p class="run-practice">Treino iniciado em outra fase: não entra no ranking completo.</p>';
 const players=net.players.map((p,i)=>CHARACTERS[i].name+': '+cleanName(p.nickname,CHARACTERS[i].name));
 const name=net.isSolo?profile.nickname:net.teamName;
 return '<section class="run-result" aria-label="Resultado da aventura">'+
  '<span>⏱ TEMPO TOTAL DA AVENTURA</span>'+
  '<strong>'+formatTime(elapsedMs(net.runStartedAt,net.runFinishedAt))+'</strong>'+
  '<p>'+(net.isSolo?'Jogador: ':'Equipe: ')+escape(name)+'</p>'+
  (net.isSolo?'':'<small>'+escape(players.join(' · '))+'</small>'+
   '<small>O recorde da equipe fica salvo apenas no navegador do anfitrião.</small>')+
  (net.isHost&&recordedId===net.code+':'+net.runStartedAt&&recordStatus?.best?
   '<b>🏆 NOVO RECORDE LOCAL!</b>':'')+
  '</section>';
}
