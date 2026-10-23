/** First contact with a COMMON rat/bat, never an environmental hit or boss.
 * Uses the existing HOST-authorized contact impulses and real heart loss.
 * Ability impacts reuse ratImpacts but do NOT reduce the hero's health.
 */
export type CombatContactFrame={
 health:readonly number[];
 ratImpacts:readonly ({at:number}|null)[];
};
export type CombatContactSnapshot={health:readonly number[];impacts:readonly number[]};
export const COMBAT_TUTORIAL_KEY='afm-combat-tutorial-seen-v1';

export function contactSnapshot(world:CombatContactFrame):CombatContactSnapshot{
 return {health:[...world.health],impacts:world.ratImpacts.map(x=>x?.at??0)};
}
export function firstCommonEnemyDamage(previous:CombatContactSnapshot|null,
 current:CombatContactFrame,now:number):boolean{
 if(!previous)return false;
 return current.health.some((value,seat)=>{
  const impact=current.ratImpacts[seat];
  return value<(previous.health[seat]??value)&&
   !!impact&&impact.at>(previous.impacts[seat]??0)&&
   Math.abs(now-impact.at)<2400;
 });
}

const TRAINING=[
 {icon:'↑ ↑ ↓',name:'TÉO',skill:'SEGUNDO SALTO',tip:'Caia sobre o inimigo no segundo salto.',tone:'teo'},
 {icon:'⚡ ➜',name:'NINO',skill:'DASH',tip:'Acerte o inimigo durante o dash.',tone:'nino'},
 {icon:'🏹 ➜',name:'LIA',skill:'PROJÉTIL',tip:'Ataque o inimigo à distância.',tone:'lia'}
] as const;

/** The campaign has one first-hit tutorial, regardless of which phase or seat was hit. */
export class CombatTutorial{
 private readonly snapshots=new Map<number,CombatContactSnapshot>();
 private combatTutorialSeen=false;
 private opened=false;
 private dialog:HTMLElement|null=null;
 private onKeyDown=(event:KeyboardEvent):void=>{
  if(!this.opened)return;
  if(['Enter',' ','Spacebar'].includes(event.key)){
   event.preventDefault();event.stopImmediatePropagation();
   this.acknowledge();
  }else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape','Tab'].includes(event.key)){
   // Tab may still navigate inside the dialog; gameplay inputs are blocked.
   if(event.key!=='Tab'){event.preventDefault();event.stopImmediatePropagation();}
  }else{
   event.stopImmediatePropagation();
  }
 };
 constructor(private readonly onOpen:()=>void,private readonly onClose:()=>void){
  try{this.combatTutorialSeen=window.localStorage.getItem(COMBAT_TUTORIAL_KEY)==='yes';}
  catch{/* Private browsing still respects the in-memory flag. */}
 }
 seed(phase:number,world:CombatContactFrame):void{
  this.snapshots.set(phase,contactSnapshot(world));
 }
 observe(phase:number,world:CombatContactFrame,active:boolean):void{
  const prev=this.snapshots.get(phase)??null;
  this.snapshots.set(phase,contactSnapshot(world));
  if(!active||this.opened||this.combatTutorialSeen)return;
  if(firstCommonEnemyDamage(prev,world,Date.now()))this.open();
 }
 private open():void{
  if(this.opened||this.combatTutorialSeen)return;
  this.opened=true;
  this.onOpen();
  // Another tutorial's transient tip should never overlap combat instructions.
  document.getElementById('mission-context-step')?.remove();
  const dialog=document.createElement('div');
  dialog.id='combat-tutorial';
  dialog.className='combat-tutorial-overlay';
  dialog.innerHTML='<div class="combat-tutorial-scrim"></div>'+
   '<section class="combat-tutorial-sheet" role="dialog" aria-modal="true" '+
   'aria-labelledby="combat-title" aria-describedby="combat-subtitle">'+
   '<span class="combat-tutorial-kicker">🌿 DICA DE COMBATE</span>'+
   '<h2 id="combat-title">COMO DERROTAR OS INIMIGOS</h2>'+
   '<p id="combat-subtitle">Cada personagem luta de um jeito:</p>'+
   '<div class="combat-tutorial-roles">'+TRAINING.map(item=>
    '<div class="combat-role combat-'+item.tone+'"><span class="combat-role-icon" aria-hidden="true">'+
    item.icon+'</span><div class="combat-role-copy"><strong>'+item.name+
    '</strong><b>'+item.skill+'</b><span>'+item.tip+'</span></div></div>'
   ).join('')+'</div>'+
   '<button id="combat-understood" type="button">ENTENDI ✓</button></section>';
  document.body.appendChild(dialog);
  this.dialog=dialog;
  dialog.querySelector<HTMLButtonElement>('#combat-understood')?.addEventListener('click',()=>this.acknowledge());
  window.addEventListener('keydown',this.onKeyDown,true);
  dialog.querySelector<HTMLButtonElement>('#combat-understood')?.focus();
 }
 acknowledge():void{
  if(!this.opened)return;
  this.opened=false;this.combatTutorialSeen=true;
  this.dialog?.remove();this.dialog=null;
  window.removeEventListener('keydown',this.onKeyDown,true);
  try{window.localStorage.setItem(COMBAT_TUTORIAL_KEY,'yes');}
  catch{/* Session flag remains effective. */}
  this.onClose();
 }
 get isVisible():boolean{return this.opened;}
 get hasSeen():boolean{return this.combatTutorialSeen;}
}
