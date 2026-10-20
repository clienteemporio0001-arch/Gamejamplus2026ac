/** Single source of truth for help and the first-play reading gate.
 * No Phaser or multiplayer internals are changed by this module. */
export const FIRST_PLAY_GUIDE_KEY='afm_tutorial_seen_v3';

export function gameGuideMarkup():string{
 return '<p class="guide-intro">Três amigos. Quatro fases. Uma saída. <strong>Ninguém fica para trás.</strong> Observe o cenário, domine as habilidades e acompanhe o tempo.</p>'+
 '<div class="guide-grid">'+
 '<section class="guide-item guide-teo"><h3><span>01</span> TÉO · VERDE</h3><p><b>A/D ou ←/→:</b> andar. <b>Espaço / ↑:</b> pular; pressione novamente no ar para o <b>salto duplo</b>. Acerte inimigos de cima e alcance lugares altos. Use <b>E</b> quando o mecanismo indicar interação.</p></section>'+
 '<section class="guide-item guide-lia"><h3><span>02</span> LIA · LARANJA</h3><p><b>J:</b> disparar a baladeira na direção em que estiver olhando. Acerte alvos à distância e inimigos sem precisar se aproximar.</p></section>'+
 '<section class="guide-item guide-nino"><h3><span>03</span> NINO · AZUL</h3><p><b>Shift:</b> executar o <b>Dash</b>. Para ativar círculos e marcas específicos do Nino, atravesse o alvo com o Dash. <b>Não é necessário apertar E junto com Shift.</b></p></section>'+
 '</div>'+
 '<section class="guide-tip"><h3>◉ SIGA AS CORES</h3><p>Círculos, listras e marcas <b>verdes</b>, <b>laranjas</b> e <b>azuis</b> sinalizam desafios ligados a Téo, Lia e Nino. Aproxime o personagem certo e use sua habilidade. Quando o sinal concluir, passe ao próximo.</p></section>'+
 '<section class="guide-tip"><h3>◷ O TEMPO MUDA TUDO</h3><p>Veja a contagem regressiva e o estado <b>A, B ou C</b> no canto da tela. Algumas pontes, raízes, troncos e interações <b>só funcionam em determinados estados</b>. Se algo não ativar, espere o ciclo mudar e tente novamente.</p></section>'+
 '<section class="guide-tip"><h3>♜ COOPERE PARA AVANÇAR</h3><p>No modo solo, alterne entre <b>1 (Téo), 2 (Lia) e 3 (Nino)</b>. Posicione os amigos, forme a escada humana quando o cenário pedir e reúna <b>os três na saída</b>. No multiplayer, cada pessoa controla um personagem.</p></section>'+
 '<section class="guide-tip"><h3>⚔ PERIGOS E GUARDIÕES</h3><p>Evite fogo, buracos, morcegos e monstros. No combate, use <b>salto duplo de Téo, baladeira de Lia e Dash de Nino</b>. Observe a barra de vida do guardião e só avance quando o objetivo estiver concluído.</p></section>'+
 '<section class="guide-tip"><h3>✦ PIPO E DICAS</h3><p>Pressione <b>H</b> ou toque em <b>🦜 DICA</b> para receber uma orientação. Confira também o objetivo no topo da tela e as placas do caminho.</p></section>'+
 '<section class="guide-tip"><h3>▣ NO CELULAR</h3><p>Jogue com o celular na horizontal. Use o <b>joystick</b>, os botões de <b>pulo/habilidade</b> e a seleção dos três personagens.</p></section>'+
 '<p class="guide-end">Lembre-se: <b>cor + habilidade + momento certo</b>. A floresta muda. O vento mostra o caminho.</p>';
}

export function hasReadFirstPlayGuide():boolean{
 try{return window.localStorage.getItem(FIRST_PLAY_GUIDE_KEY)==='yes';}
 catch{return false;}
}
function rememberFirstPlayGuide():void{
 try{window.localStorage.setItem(FIRST_PLAY_GUIDE_KEY,'yes');}
 catch{/* Private browsing: the next session simply shows the guide again. */}
}

/** Requires reading to the end and an explicit acknowledgement before launching. */
export function beforeFirstPlay(begin:()=>void):void{
 if(hasReadFirstPlayGuide()){begin();return;}
 if(document.querySelector('#first-play-guide'))return;
 const modal=document.createElement('div');
 modal.id='first-play-guide';
 modal.className='fm-overlay first-play-guide';
 modal.innerHTML='<div class="overlay-scrim"></div>'+
  '<section class="overlay-sheet first-play-sheet" role="dialog" aria-modal="true" aria-labelledby="first-play-title" tabindex="-1">'+
   '<header><span class="kicker">A FLORESTA MENTE · PRIMEIRA PARTIDA</span><span class="guide-lock">LEITURA NECESSÁRIA</span></header>'+
   '<h2 id="first-play-title">ANTES DE ENTRAR NA FLORESTA</h2>'+
   '<p>Leia as regras abaixo para aprender os sinais e as habilidades. A partida começará após sua confirmação.</p>'+
   '<div class="first-play-scroll" id="first-play-scroll" role="region" aria-label="Instruções obrigatórias" tabindex="0">'+gameGuideMarkup()+'</div>'+
   '<p class="first-play-scroll-hint" id="first-play-hint">↓ Leia as dicas até o final para continuar.</p>'+
   '<label class="first-play-confirm"><input type="checkbox" id="first-play-checkbox"/> <span>Li e entendi como usar as cores, as habilidades e o tempo da floresta.</span></label>'+
   '<button type="button" id="first-play-continue" class="btn" disabled>ENTENDI · COMEÇAR</button>'+
  '</section>';
 document.body.appendChild(modal);
 const scroll=modal.querySelector<HTMLElement>('#first-play-scroll')!;
 const check=modal.querySelector<HTMLInputElement>('#first-play-checkbox')!;
 const proceed=modal.querySelector<HTMLButtonElement>('#first-play-continue')!;
 const hint=modal.querySelector<HTMLElement>('#first-play-hint')!;
 let sawEnd=false;
 const update=():void=>{
  if(scroll.scrollTop+scroll.clientHeight>=scroll.scrollHeight-12)sawEnd=true;
  hint.textContent=sawEnd?'✓ Você chegou ao fim das instruções.':'↓ Leia as dicas até o final para continuar.';
  proceed.disabled=!sawEnd||!check.checked;
 };
 scroll.addEventListener('scroll',update);
 check.addEventListener('change',update);
 const blockEscape=(ev:KeyboardEvent)=>{if(ev.key==='Escape'){ev.preventDefault();ev.stopImmediatePropagation();}};
 document.addEventListener('keydown',blockEscape,true);
 proceed.addEventListener('click',()=>{
  if(proceed.disabled)return;
  document.removeEventListener('keydown',blockEscape,true);
  rememberFirstPlayGuide();
  modal.remove();
  begin();
 });
 // Short viewports may need a little scrolling; long viewports may fit outright.
 requestAnimationFrame(update);
 modal.querySelector<HTMLElement>('.first-play-sheet')?.focus();
}
