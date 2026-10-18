/** Opt-in runtime profiler: metrics come exclusively from actual browser frames.
 * Never substitute synthetic estimates for live FPS on the user device. */
export type PerformanceFrame={
 now:number;updateMs:number;cameraX:number;velocityX:number;velocityY:number;
 x:number;transforming:boolean;
};
type Sample=PerformanceFrame&{frameMs:number;cameraDelta:number};
export type PerformanceSummary={count:number;fps:number;avgMs:number;maxMs:number;
 avgUpdateMs:number;maxUpdateMs:number;cameraMoving:number;
 scenarios:Record<string,{count:number;fps:number;avgMs:number;maxMs:number}>};
export const SCENARIOS=[
 'parado','direita','esquerda','pulando','câmera seguindo',
 'transformação A/B/C','plataforma suspensa'
] as const;
export class FrameProfiler{
 private history:Sample[]=[];
 private lastNow=0;private lastCamera=0;
 reset():void{this.history=[];this.lastNow=0;this.lastCamera=0;}
 record(frame:PerformanceFrame):void{
  if(this.lastNow!==0){
   const frameMs=Math.max(.1,Math.min(1000,frame.now-this.lastNow));
   const cameraDelta=Math.abs(frame.cameraX-this.lastCamera);
   this.history.push({...frame,frameMs,cameraDelta});
   if(this.history.length>180)this.history.shift();
  }
  this.lastNow=frame.now;this.lastCamera=frame.cameraX;
 }
 private numbers(items:Sample[]):{count:number;fps:number;avgMs:number;maxMs:number}{
  if(!items.length)return{count:0,fps:0,avgMs:0,maxMs:0};
  const sum=items.reduce((s,p)=>s+p.frameMs,0);
  const avg=sum/items.length;
  return {count:items.length,fps:1000/avg,avgMs:avg,
    maxMs:Math.max(...items.map(i=>i.frameMs))};
 }
 snapshot():PerformanceSummary{
  const base=this.numbers(this.history);
  const by=(condition:(s:Sample)=>boolean)=>this.numbers(this.history.filter(condition));
  return {...base,
   avgUpdateMs:this.history.length
     ?this.history.reduce((s,p)=>s+p.updateMs,0)/this.history.length:0,
   maxUpdateMs:this.history.length?Math.max(...this.history.map(p=>p.updateMs)):0,
   cameraMoving:this.history.filter(p=>p.cameraDelta>.4).length,
   scenarios:{
    'parado':by(p=>Math.abs(p.velocityX)<35&&Math.abs(p.velocityY)<80),
    'direita':by(p=>p.velocityX>35&&Math.abs(p.velocityY)<80),
    'esquerda':by(p=>p.velocityX< -35&&Math.abs(p.velocityY)<80),
    'pulando':by(p=>Math.abs(p.velocityY)>=80),
    'câmera seguindo':by(p=>p.cameraDelta>.4),
    'transformação A/B/C':by(p=>p.transforming),
    'plataforma suspensa':by(p=>p.x>=7350&&p.x<=8860)
   }};
 }
}
