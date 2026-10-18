import type {TouchInput} from './game';
export type TouchKey='left'|'right'|'jump'|'interact'|'ability';
export type PulseKey='jump'|'interact'|'ability';
export const TOUCH_KEYS=['left','right','jump','interact','ability'] as const;
const PULSES:Record<PulseKey,'jumpQueue'|'interactQueue'|'abilityQueue'>={jump:'jumpQueue',interact:'interactQueue',ability:'abilityQueue'};
const isPulse=(key:TouchKey):key is PulseKey=>key==='jump'||key==='interact'||key==='ability';
export function clearTouch(touch:TouchInput):void{
 for(const key of TOUCH_KEYS)touch[key]=false;
 touch.jumpQueue=0;touch.interactQueue=0;touch.abilityQueue=0;
}
/** One pulse per fresh pointer press. Supports 2 fast presses between Phaser frames. */
export function consumeTouch(touch:TouchInput,key:PulseKey):boolean{
 const field=PULSES[key];
 if((touch[field]??0)>0){
  touch[field]=Math.max(0,(touch[field]??0)-1);
  touch[key]=(touch[field]??0)>0;
  return true;
 }
 const pressed=touch[key];
 touch[key]=false;
 return pressed;
}
export class TouchPointers {
 private active=new Map<TouchKey,Set<number>>();
 constructor(private touch:TouchInput){
  for(const k of TOUCH_KEYS)this.active.set(k,new Set());
 }
 down(key:TouchKey,id:number):void{
  const pressed=this.active.get(key)!;
  if(pressed.has(id))return;
  pressed.add(id);
  if(isPulse(key)){
    const q=PULSES[key];
    this.touch[q]=Math.min(4,(this.touch[q]??0)+1);
  }
  this.touch[key]=true;
 }
 up(key:TouchKey,id:number):void{
  this.active.get(key)?.delete(id);
  if(!isPulse(key))this.touch[key]=(this.active.get(key)?.size??0)>0;
  // A tapped action remains queued until the frame consumes it.
 }
 count(key:TouchKey):number{return this.active.get(key)?.size??0;}
 clear():void{
  for(const set of this.active.values())set.clear();
  clearTouch(this.touch);
 }
}
export function mobilePadMarkup(solo:boolean,seat:0|1|2|null):string{
 const special=seat===1?'<button type="button" class="touch-btn skill" data-touch="ability" aria-label="Atirar com a baladeira">J <small>TIRO</small></button>':
   seat===2?'<button type="button" class="touch-btn skill" data-touch="ability" aria-label="Dar dash">⇢ <small>DASH</small></button>':'';
 return (solo?'<nav class="mobile-seat-picker" aria-label="Trocar personagem">'+
   [0,1,2].map(i=>'<button type="button" data-seat="'+i+'" '+
    (seat===i?'class="selected" ':'')+'aria-label="Selecionar '+['Téo','Lia','Nino'][i]+'">'+
    ['T','L','N'][i]+'</button>').join('')+'</nav>':'')+
   '<div class="thumb-zone thumb-left" aria-label="Movimento">'+
   '<button type="button" class="touch-btn move" data-touch="left" aria-label="Esquerda">◀</button>'+
   '<button type="button" class="touch-btn move" data-touch="right" aria-label="Direita">▶</button></div>'+
   '<div class="thumb-zone thumb-right" aria-label="Ações">'+
   special+
   '<button type="button" class="touch-btn action" data-touch="interact" aria-label="Interagir">E <small>USAR</small></button>'+
   '<button type="button" class="touch-btn jump" data-touch="jump" aria-label="Pular">↑ <small>PULAR</small></button></div>';
}
/** Pointer capture stays on individual buttons, not on a singleton document pointer. */
export function mountMobilePad(root:HTMLElement,touch:TouchInput,solo:boolean,seat:0|1|2|null,
 onSeat:(seat:0|1|2)=>void):()=>void{
 const pointers=new TouchPointers(touch);
 root.innerHTML=mobilePadMarkup(solo,seat);
 const cleaners:Array<()=>void>=[];
 const listen=<K extends keyof HTMLElementEventMap>(el:HTMLElement,event:K,
  fn:(event:HTMLElementEventMap[K])=>void):void=>{
  el.addEventListener(event,fn as EventListener);
  cleaners.push(()=>el.removeEventListener(event,fn as EventListener));
 };
 for(const key of TOUCH_KEYS){
  const btn=root.querySelector<HTMLButtonElement>('[data-touch="'+key+'"]');
  if(!btn)continue;
  listen(btn,'pointerdown',e=>{
   e.preventDefault();e.stopPropagation();
   if(e.pointerType==='mouse'&&e.button!==0)return;
   pointers.down(key,e.pointerId);
   try{btn.setPointerCapture(e.pointerId);}catch{/* WebView may deny capture */}
   btn.classList.add('pressed');
  });
  const release=(e:PointerEvent)=>{
   e.preventDefault();pointers.up(key,e.pointerId);
   if(pointers.count(key)===0)btn.classList.remove('pressed');
   if(btn.hasPointerCapture(e.pointerId))btn.releasePointerCapture(e.pointerId);
  };
  for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'] as const)
   listen(btn,event,release);
  listen(btn,'contextmenu',e=>e.preventDefault());
 }
 if(solo)root.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(btn=>{
  listen(btn,'click',()=>onSeat(Number(btn.dataset.seat) as 0|1|2));
 });
 const clear=()=>{pointers.clear();root.querySelectorAll('.pressed').forEach(x=>x.classList.remove('pressed'));};
 window.addEventListener('blur',clear);
 document.addEventListener('visibilitychange',clear);
 window.addEventListener('orientationchange',clear);
 cleaners.push(()=>window.removeEventListener('blur',clear),
  ()=>document.removeEventListener('visibilitychange',clear),
  ()=>window.removeEventListener('orientationchange',clear));
 return ()=>{clear();for(const fn of cleaners)fn();};
}
