/** Mantém os painéis de navegação totalmente visíveis em aparelhos touch.
 * CSS resolve os layouts comuns; este ajuste final cobre viewports incomuns
 * de WebView/itch.io (incluindo barras do navegador e rotação).
 */
export function viewportMenuScale(contentHeight:number,availableHeight:number):number{
 if(!Number.isFinite(contentHeight)||!Number.isFinite(availableHeight)||
    contentHeight<=0||availableHeight<=0)return 1;
 return Math.max(.55,Math.min(1,Math.floor((availableHeight-3)/contentHeight*100)/100));
}
export function installMobileMenuFit(ui:HTMLElement):void{
 if(typeof window==='undefined'||typeof MutationObserver==='undefined')return;
 let pending=0;
 const fit=():void=>{
  pending=0;
  const touch=window.matchMedia('(pointer:coarse)').matches;
  const panel=ui.querySelector<HTMLElement>(':scope > .panel');
  if(!touch||ui.classList.contains('in-game')||!panel){
   if(panel)panel.style.removeProperty('zoom');
   return;
  }
  // Resetar antes da leitura impede o cálculo circular após a rotação.
  panel.style.removeProperty('zoom');
  const styles=window.getComputedStyle(ui);
  const verticalPadding=parseFloat(styles.paddingTop||'0')+
   parseFloat(styles.paddingBottom||'0');
  const height=Math.max(0,ui.clientHeight-verticalPadding);
  const natural=panel.scrollHeight;
  const scale=viewportMenuScale(natural,height);
  if(scale<1)panel.style.zoom=String(scale);
 };
 const schedule=():void=>{
  if(pending===0)pending=window.requestAnimationFrame(fit);
 };
 const observer=new MutationObserver(schedule);
 observer.observe(ui,{childList:true,attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('load',schedule,{once:true});
 schedule();
}
