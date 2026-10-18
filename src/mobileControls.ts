import type {TouchInput} from './game';
import {stickAxis} from './joystick';
export type TouchKey='left'|'right'|'jump'|'interact'|'ability';
export type PulseKey='jump'|'interact'|'ability';
export const TOUCH_KEYS=['left','right','jump','interact','ability'] as const;
const PULSES:Record<PulseKey,'jumpQueue'|'interactQueue'|'abilityQueue'>={jump:'jumpQueue',interact:'interactQueue',ability:'abilityQueue'};
const isPulse=(key:TouchKey):key is PulseKey=>key==='jump'||key==='interact'||key==='ability';
export function clearTouch(touch:TouchInput):void{
 for(const key of TOUCH_KEYS)touch[key]=false;
 touch.jumpQueue=0;touch.interactQueue=0;touch.abilityQueue=0;touch.moveX=0;
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
   '<div class="thumb-zone thumb-left" aria-label="Movimento analógico">'+
   '<div class="analog-stick" data-joystick role="application" aria-label="Joystick analógico virtual">'+
   '<div class="analog-knob" aria-hidden="true"></div></div></div>'+
   '<div class="thumb-zone thumb-right" aria-label="Ações">'+
   special+
   '<button type="button" class="touch-btn action" data-touch="interact" aria-label="Interagir">E <small>USAR</small></button>'+
   '<button type="button" class="touch-btn jump" data-touch="jump" aria-label="Pular">↑ <small>PULAR</small></button></div>';
}
/** Persistent pad: listeners are delegated to the root and survive button updates. */
export type MobilePadMount={
 update:(seat:0|1|2|null)=>void;
 reset:()=>void;
 ready:()=>boolean;
 destroy:()=>void;
};
export function mountMobilePad(root:HTMLElement,touch:TouchInput,solo:boolean,seat:0|1|2|null,
 onSeat:(seat:0|1|2)=>void):MobilePadMount{
 const pointers=new TouchPointers(touch);
 root.innerHTML=mobilePadMarkup(solo,seat);
 let current=seat,dead=false;
 const pressed=new Map<number,{key:TouchKey;button:HTMLButtonElement}>();
 let analogFinger:number|null=null;
 const keyFrom=(element:EventTarget|null):HTMLButtonElement|null=>
  element instanceof Element?element.closest<HTMLButtonElement>('button[data-touch]'):null;
 const reset=()=>{
  pointers.clear();pressed.clear();analogFinger=null;
  touch.moveX=0;
  const knob=root.querySelector<HTMLElement>('.analog-knob');
  if(knob)knob.style.transform='translate(-50%,-50%)';
  root.querySelectorAll('.pressed').forEach(element=>element.classList.remove('pressed'));
 };
 const ready=()=>{
  if(dead||!root.isConnected)return false;
  return !!root.querySelector('[data-joystick]')&&(['jump','interact'] as TouchKey[]).every(key=>
    !!root.querySelector('[data-touch="'+key+'"]'))&&
    (current===0||current===null||!!root.querySelector('[data-touch="ability"]'))&&
    (!solo||root.querySelectorAll('[data-seat]').length===3);
 };
 const updateStick=(event:PointerEvent)=>{
  const stick=root.querySelector<HTMLElement>('[data-joystick]');
  if(!stick)return;
  const rect=stick.getBoundingClientRect();
  const radius=Math.min(rect.width,rect.height)*.37;
  const axis=stickAxis(event.clientX-rect.left-rect.width/2,
    event.clientY-rect.top-rect.height/2,radius);
  touch.moveX=axis.x;
  touch.left=axis.x<-.01;touch.right=axis.x>.01;
  const knob=stick.querySelector<HTMLElement>('.analog-knob');
  if(knob)knob.style.transform='translate(calc(-50% + '+axis.knobX+'px),calc(-50% + '+axis.knobY+'px))';
 };
 const down=(event:PointerEvent)=>{
  const stick=event.target instanceof Element?
    event.target.closest<HTMLElement>('[data-joystick]'):null;
  if(stick&&root.contains(stick)){
   event.preventDefault();event.stopPropagation();
   if(analogFinger!==null||event.pointerType==='mouse'&&event.button!==0)return;
   analogFinger=event.pointerId;updateStick(event);
   try{stick.setPointerCapture(event.pointerId);}catch{/* WebView */}
   return;
  }
  const button=keyFrom(event.target);
  if(!button||!root.contains(button))return;
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const key=button.dataset.touch as TouchKey;
  event.preventDefault();event.stopPropagation();
  pointers.down(key,event.pointerId);
  pressed.set(event.pointerId,{key,button});
  button.classList.add('pressed');
  try{button.setPointerCapture(event.pointerId);}catch{/* unsupported WebView */}
 };
 const up=(event:PointerEvent)=>{
  if(analogFinger===event.pointerId){
   analogFinger=null;touch.moveX=0;touch.left=false;touch.right=false;
   const stick=root.querySelector<HTMLElement>('[data-joystick]');
   const knob=stick?.querySelector<HTMLElement>('.analog-knob');
   if(knob)knob.style.transform='translate(-50%,-50%)';
   try{if(stick?.hasPointerCapture(event.pointerId))stick.releasePointerCapture(event.pointerId);}catch{/* WebView */}
   return;
  }
  const active=pressed.get(event.pointerId);
  if(!active)return;
  event.preventDefault();
  pointers.up(active.key,event.pointerId);
  pressed.delete(event.pointerId);
  if(!pointers.count(active.key))active.button.classList.remove('pressed');
  try{if(active.button.hasPointerCapture(event.pointerId))
    active.button.releasePointerCapture(event.pointerId);}catch{/* detached */}
 };
 const move=(event:PointerEvent)=>{
  if(analogFinger===event.pointerId){event.preventDefault();updateStick(event);}
 };
 const leave=(event:PointerEvent)=>{
  const active=pressed.get(event.pointerId);
  if(active&&event.target===active.button)up(event);
 };
 const click=(event:MouseEvent)=>{
  if(!solo)return;
  const btn=event.target instanceof Element?
    event.target.closest<HTMLButtonElement>('button[data-seat]'):null;
  if(btn&&root.contains(btn))onSeat(Number(btn.dataset.seat) as 0|1|2);
 };
 const context=(event:Event)=>event.preventDefault();
 const hidden=()=>{if(document.hidden)reset();};
 const update=(next:0|1|2|null)=>{
  if(dead)return;
  if(next!==current){
   reset();current=next;
   const right=root.querySelector('.thumb-right');
   if(right){
    right.querySelector('[data-touch="ability"]')?.remove();
    const special=next===1?
      '<button type="button" class="touch-btn skill" data-touch="ability" aria-label="Atirar com a baladeira">J <small>TIRO</small></button>':
      next===2?
      '<button type="button" class="touch-btn skill" data-touch="ability" aria-label="Dar dash">⇢ <small>DASH</small></button>':'';
    right.insertAdjacentHTML('afterbegin',special);
   }
  }
  if(solo)root.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(button=>{
   const active=Number(button.dataset.seat)===next;
   button.classList.toggle('selected',active);
   button.setAttribute('aria-pressed',String(active));
  });
 };
 root.addEventListener('pointerdown',down);
 root.addEventListener('pointermove',move);
 for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)
  root.addEventListener(name,up);
 root.addEventListener('pointerleave',leave,true);
 root.addEventListener('click',click);
 root.addEventListener('contextmenu',context);
 window.addEventListener('blur',reset);
 window.addEventListener('orientationchange',reset);
 document.addEventListener('visibilitychange',hidden);
 const destroy=()=>{
  if(dead)return;
  reset();dead=true;
  root.removeEventListener('pointerdown',down);
  root.removeEventListener('pointermove',move);
  for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)
   root.removeEventListener(name,up);
  root.removeEventListener('pointerleave',leave,true);
  root.removeEventListener('click',click);
  root.removeEventListener('contextmenu',context);
  window.removeEventListener('blur',reset);
  window.removeEventListener('orientationchange',reset);
  document.removeEventListener('visibilitychange',hidden);
  root.replaceChildren();
 };
 update(seat);
 return{update,reset,ready,destroy};
}
