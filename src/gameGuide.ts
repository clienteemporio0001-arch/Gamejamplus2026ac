/** Onboarding progressivo: uma mecânica por tela, sem leitura obrigatória longa. */
export const FIRST_PLAY_GUIDE_KEY='afm_tutorial_seen_v4';

const INTRO_STEPS=[
 {icon:'🌿',title:'EXPLORE A FLORESTA',body:'Use A/D ou ←/→ para andar. Espaço ou ↑ para pular.',tip:'No celular, use o joystick e PULAR.'},
 {icon:'👥',title:'TRÊS AMIGOS, TRÊS HABILIDADES',body:'No solo, pressione 1, 2 ou 3 para trocar entre Téo, Lia e Nino.',tip:'Téo: salto duplo · Lia: J (baladeira) · Nino: Shift (dash).'},
 {icon:'✨',title:'SIGA O BRILHO',body:'Aproxime-se das marcas iluminadas. Use E para interagir quando aparecer.',tip:'Alguns alvos usam J ou Shift. A indicação mostrará o comando certo.'},
 {icon:'🦜',title:'NINGUÉM FICA PARA TRÁS',body:'Leia o objetivo e o passo no canto da tela. Conclua os desafios em equipe.',tip:'Ficou perdido? Pipo dá dicas automaticamente ou ao pressionar H.'}
] as const;

/** Consulta rápida, disponível pelo botão COMO JOGAR a qualquer momento. */
export function gameGuideMarkup():string{
 return '<p class="guide-intro">Siga os sinais brilhantes e o objetivo da tela. Aprenda o resto durante a aventura.</p>'+
 '<div class="guide-grid">'+
 '<section class="guide-item guide-teo"><h3>TÉO · VERDE</h3><p>A/D ou ←/→: andar · Espaço: pular duas vezes · E: interagir.</p></section>'+
 '<section class="guide-item guide-lia"><h3>LIA · LARANJA</h3><p>J: baladeira. Acerte os alvos laranjas à distância.</p></section>'+
 '<section class="guide-item guide-nino"><h3>NINO · AZUL</h3><p>Shift: Dash. Alguns mecanismos pedem Shift + E; siga a indicação local.</p></section>'+
 '</div><section class="guide-tip"><h3>COOPERAÇÃO</h3><p>Solo: 1/2/3 alternam personagens. A escada humana usa E e os três devem chegar à saída.</p></section>'+
 '<section class="guide-tip"><h3>MARCAÇÕES E TEMPO</h3><p>Círculos e listras indicam interações. Observe o estado A, B ou C e o tempo: caminhos mudam com o ciclo.</p></section>'+
 '<section class="guide-tip"><h3>AJUDA E CELULAR</h3><p>H ou 🦜 DICA para chamar Pipo. No celular, jogue na horizontal usando joystick e botões.</p></section>';
}

export function hasReadFirstPlayGuide():boolean{
 try{return window.localStorage.getItem(FIRST_PLAY_GUIDE_KEY)==='yes';}
 catch{return false;}
}
function rememberFirstPlayGuide():void{
 try{window.localStorage.setItem(FIRST_PLAY_GUIDE_KEY,'yes');}
 catch{/* A sessão privada só repetirá o tutorial na próxima visita. */}
}

/** Quatro telas compactas, acessíveis e com avanço explícito. Sem rolagem ou checkbox. */
export function beforeFirstPlay(begin:()=>void):void{
 if(hasReadFirstPlayGuide()){begin();return;}
 if(document.getElementById('first-play-guide'))return;
 const modal=document.createElement('div');
 modal.id='first-play-guide';
 modal.className='fm-overlay first-play-guide';
 modal.innerHTML='<div class="overlay-scrim"></div>'+
  '<section class="overlay-sheet first-play-sheet" role="dialog" aria-modal="true" aria-labelledby="first-play-title" tabindex="-1">'+
   '<header><span class="kicker">A FLORESTA MENTE · PRIMEIRA PARTIDA</span>'+
   '<span class="guide-lock" id="first-play-counter"></span></header>'+
   '<div class="first-play-step-icon" id="first-play-icon" aria-hidden="true"></div>'+
   '<h2 id="first-play-title"></h2>'+
   '<p class="first-play-step-copy" id="first-play-copy"></p>'+
   '<p class="first-play-step-tip" id="first-play-tip"></p>'+
   '<div class="first-play-dots" id="first-play-dots" aria-label="Etapas do tutorial"></div>'+
   '<button type="button" id="first-play-continue" class="btn">CONTINUAR</button>'+
  '</section>';
 document.body.appendChild(modal);
 const proceed=modal.querySelector<HTMLButtonElement>('#first-play-continue')!;
 let index=0;
 const update=():void=>{
  const step=INTRO_STEPS[index];
  modal.querySelector<HTMLElement>('#first-play-counter')!.textContent=(index+1)+' / '+INTRO_STEPS.length;
  modal.querySelector<HTMLElement>('#first-play-icon')!.textContent=step.icon;
  modal.querySelector<HTMLElement>('#first-play-title')!.textContent=step.title;
  modal.querySelector<HTMLElement>('#first-play-copy')!.textContent=step.body;
  modal.querySelector<HTMLElement>('#first-play-tip')!.textContent=step.tip;
  modal.querySelector<HTMLElement>('#first-play-dots')!.textContent=INTRO_STEPS.map((_,i)=>i===index?'●':'○').join(' ');
  proceed.textContent=index===INTRO_STEPS.length-1?'OK · COMEÇAR':'CONTINUAR';
 };
 const blockEscape=(ev:KeyboardEvent):void=>{
  if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();}
 };
 document.addEventListener('keydown',blockEscape,true);
 proceed.addEventListener('click',()=>{
  if(index<INTRO_STEPS.length-1){index++;update();return;}
  document.removeEventListener('keydown',blockEscape,true);
  rememberFirstPlayGuide();modal.remove();begin();
 });
 update();
 modal.querySelector<HTMLElement>('.first-play-sheet')?.focus();
}

/** Dicas curtas conforme o grupo de desafio. Cada grupo só aparece uma vez na sessão. */
const shownGroups=new Set<string>();
export function clearContextStep():void{
 document.getElementById('mission-context-step')?.remove();
}
export function showContextStep(phase:number,group:string,command:string):void{
 const key=phase+':'+group;
 if(shownGroups.has(key)||document.getElementById('mission-context-step'))return;
 shownGroups.add(key);
 const card=document.createElement('aside');
 card.id='mission-context-step';
 card.className='mission-context-step';
 card.setAttribute('role','status');
 const heading=document.createElement('strong');
 heading.textContent='✨ NOVO DESAFIO · '+group;
 const description=document.createElement('span');
 description.textContent=command;
 const ok=document.createElement('button');
 ok.type='button';ok.textContent='OK';
 ok.addEventListener('click',()=>card.remove());
 card.append(heading,description,ok);
 document.body.appendChild(card);
}
