/** Game Jam speedrun results. Browser-local only: no account or online leaderboard. */
export type ScoreMode='solo'|'multiplayer';
export type RunResult={
 id:string; mode:ScoreMode; name:string; players:string[];
 durationMs:number; finishedAt:number;
};
const STORAGE_KEY='afm-gamejam-records-v1';
const MAX_RECORDS=60;
export const MAX_RUN_MS=24*60*60*1000;
export function cleanName(value:unknown,fallback='Explorador',limit=22):string{
 if(typeof value!=='string')return fallback;
 const cleaned=value.replace(/[<>\x00-\x1f\x7f]/g,'').replace(/\s+/g,' ').trim().slice(0,limit);
 return cleaned||fallback;
}
export function formatTime(durationMs:number):string{
 const total=Math.max(0,Math.floor((Number.isFinite(durationMs)?durationMs:0)/1000));
 const hours=Math.floor(total/3600);
 const mins=Math.floor(total/60)%60;
 const secs=total%60;
 return (hours>0?String(hours).padStart(2,'0')+':':'')+
  String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0');
}
export function elapsedMs(startedAt:number,finishedAt=0,now=Date.now()):number{
 if(!Number.isFinite(startedAt)||startedAt<=0)return 0;
 return Math.max(0,(finishedAt>0?finishedAt:now)-startedAt);
}
export function validRun(data:unknown):data is RunResult{
 if(!data||typeof data!=='object'||Array.isArray(data))return false;
 const r=data as Partial<RunResult>;
 return typeof r.id==='string'&&r.id.length>0&&r.id.length<=100&&
  (r.mode==='solo'||r.mode==='multiplayer')&&
  typeof r.name==='string'&&r.name.length>0&&r.name.length<=32&&
  Array.isArray(r.players)&&r.players.length>=1&&r.players.length<=3&&
  r.players.every(n=>typeof n==='string'&&n.length>0&&n.length<=32)&&
  Number.isFinite(r.durationMs)&&r.durationMs!>=1000&&r.durationMs!<=MAX_RUN_MS&&
  Number.isFinite(r.finishedAt)&&r.finishedAt!>0;
}
export function sortedRecords(records:readonly RunResult[],mode?:ScoreMode):RunResult[]{
 return records.filter(r=>validRun(r)&&(!mode||r.mode===mode))
  .sort((a,b)=>a.durationMs-b.durationMs||a.finishedAt-b.finishedAt)
  .slice(0,MAX_RECORDS);
}
export function addRecord(records:readonly RunResult[],record:RunResult):RunResult[]{
 if(!validRun(record))return sortedRecords(records);
 if(records.some(r=>r.id===record.id))return sortedRecords(records);
 return sortedRecords([...records,record]);
}
export function loadRecords(storage:Pick<Storage,'getItem'>|null=
 typeof localStorage!=='undefined'?localStorage:null):RunResult[]{
 try{
  const value=storage?.getItem(STORAGE_KEY);
  return value?sortedRecords(JSON.parse(value) as RunResult[]):[];
 }catch{return [];}
}
export function saveRecord(record:RunResult,storage:Pick<Storage,'getItem'|'setItem'>|null=
 typeof localStorage!=='undefined'?localStorage:null):{rank:number;best:boolean;stored:boolean}{
 const previous=loadRecords(storage);
 const betterThan=previous.filter(r=>r.mode===record.mode);
 const best=betterThan.length===0||record.durationMs<betterThan[0].durationMs;
 const next=addRecord(previous,record);
 try{storage?.setItem(STORAGE_KEY,JSON.stringify(next));}
 catch{return {rank:next.filter(r=>r.mode===record.mode).findIndex(r=>r.id===record.id)+1,best,stored:false};}
 return {rank:next.filter(r=>r.mode===record.mode).findIndex(r=>r.id===record.id)+1,best,stored:storage!==null};
}
