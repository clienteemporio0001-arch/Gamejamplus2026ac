import Phaser from 'phaser';
import { CHARACTERS, Network } from './network';
import { DemoScene, type TouchInput } from './game';
import { ForestScene } from './forestScene';
import { IntroScene } from './intro';
import { RiverScene } from './riverScene';
import { JourneyScene } from './journeyScene';
import { LateScene } from './lateScene';
import './style.css';
import { gameKeys } from './keyboard';
import { GUIDE_DIALOGUES } from './forestPresentation';

const net = new Network();
const ui = document.querySelector<HTMLDivElement>('#ui')!;
const controls = document.querySelector<HTMLDivElement>('#mobile-controls')!;
const touch: TouchInput = { left: false, right: false, jump: false, interact: false, ability: false };
let game: Phaser.Game | null = null;
let activeMode: 'none' | 'intro' | 'level1' | 'level2' | 'level3' | 'level4' = 'none';
let info = '';
let soloSetup=false;

function safeText(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
function button(id: string, label: string, secondary = false, disabled = false): string {
  return '<button class="btn ' + (secondary ? 'secondary' : '') + '" id="' + id + '" ' + (disabled ? 'disabled' : '') + '>' + label + '</button>';
}
function notice(): string { return info ? '<div class="notice" role="status">' + safeText(info) + '</div>' : ''; }
function banner(): string {
  return '<span class="kicker">GAME JAM PLUS • BETTER TOGETHER / SOMETHING’S OFF</span>' +
    '<h1>A FLORESTA<br>MENTE</h1><div class="subtitle">Ninguém fica para trás.</div>' +
    '<p>Quando chega a boca da noite, a floresta muda de lugar.<br>Três amigos. Uma saída. Ninguém pode ficar para trás.</p>';
}
function enterGame(): void {
  const mode = net.stage === 'intro' ? 'intro' : ('level' + net.level) as 'level1' | 'level2' | 'level3' | 'level4';
  if (game && activeMode === mode) return;
  exitGame();
  activeMode = mode;
  const scene = mode === 'intro' ? new IntroScene() :
    mode === 'level2' ? new JourneyScene(net, touch, refreshHud) :
    net.level >= 3 ? new LateScene(net, touch, refreshHud) : new ForestScene(net, touch, refreshHud);
  // Aspecto variável no canvas: nas janelas altas o mundo é recortado pela câmera,
  // em vez de ficar minúsculo como na captura com três janelas lado a lado.
  const ratio = window.innerWidth / Math.max(1, window.innerHeight);
  const viewWidth = mode === 'intro' ? 1200 : ratio < 1.25 ? Math.max(350, Math.round(700 * ratio)) : 1200;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: viewWidth,
    height: 700,
    backgroundColor: '#091c23',
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [scene],
  });
}
function exitGame(): void {
  if (!game) return;
  game.destroy(true);
  game = null;
  activeMode = 'none';
  touch.left = false; touch.right = false; touch.jump = false; touch.interact = false; touch.ability = false;
  controls.replaceChildren();
}
function refreshHud(): void {
  const scene = game?.scene.keys[net.level >= 3 ? 'LateScene' : net.level === 2 ? 'JourneyScene' : 'ForestScene'] as DemoScene | ForestScene | RiverScene | JourneyScene | LateScene | undefined;
  const skill = document.querySelector<HTMLElement>('#skill-status');
  if (skill && scene?.getCooldown) skill.textContent = scene.getCooldown();
  const team=document.querySelector<HTMLElement>('#team-status');
  if (team && net.localSeat !== null && net.playing) {
    const x = net.poses[net.localSeat].x;
    const names: string[]=[];
    for (const p of net.poses) {
      if (p.seat === net.localSeat || !net.players[p.seat].online) continue;
      const dx=p.x-x;
      if(Math.abs(dx)>185)names.push((dx<0?'◀':'▶')+' '+CHARACTERS[p.seat].name);
    }
    team.textContent=names.join(' · ');
  }
}
setInterval(refreshHud, 150);
function bindMobile(): void {
  const skillLabel = net.localSeat === 1 ? 'J' : net.localSeat === 2 ? 'SHIFT' : '—';
  const skillAria = net.localSeat === 1 ? 'Disparar baladeira' : net.localSeat === 2 ? 'Ativar dash' : 'Sem habilidade nesta tecla';
  controls.innerHTML = (net.isSolo
    ? '<div class="solo-touch-switch"><button data-seat="0">1 TÉO</button><button data-seat="1">2 LIA</button><button data-seat="2">3 NINO</button></div>'
    : '') + '<div class="control-group"><button class="touch-btn" id="left" aria-label="Esquerda">◀</button>' +
    '<button class="touch-btn" id="right" aria-label="Direita">▶</button></div>' +
    '<div class="control-group"><button class="touch-btn" id="interact" aria-label="Interagir">E</button>' +
    '<button class="touch-btn" id="ability" aria-label="' + skillAria + '"' +
    (net.localSeat === 0 ? ' disabled' : '') + '>' + skillLabel + '</button>' +
    '<button class="touch-btn jump" id="jump" aria-label="Pular">PULAR</button></div>';
  if(net.isSolo)controls.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(button=>{
    button.addEventListener('click',()=>net.selectSoloSeat(Number(button.dataset.seat) as 0|1|2));
  });
  for (const key of ['left', 'right', 'jump', 'interact', 'ability'] as const) {
    const el = controls.querySelector<HTMLButtonElement>('#' + key)!;
    if (el.disabled) continue;
    el.addEventListener('pointerdown', event => {
      event.preventDefault();
      el.setPointerCapture(event.pointerId);
      el.classList.add('pressed');
      touch[key] = true;
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      el.addEventListener(type, event => {
        event.preventDefault();
        el.classList.remove('pressed');
        if (key === 'left' || key === 'right') touch[key] = false;
      });
    }
  }
}
function render(): void {
  gameKeys.setEnabled(net.playing);
  const showing = net.stage !== 'lobby' && net.role !== 'idle';
  document.body.classList.toggle('playing', net.playing);
  ui.classList.toggle('in-game', showing);
  if (showing) {
    if (net.stage === 'intro' || net.playing) enterGame();
    if (net.stage === 'intro') {
      ui.innerHTML = '<div class="hud">🌙 PRÓLOGO · A FLORESTA MENTE · Sala ' + safeText(net.code) +
        ' · <span class="text-muted">os três verão o mesmo encerramento</span></div>' +
        '<div class="cinematic-actions">' + button('skip-intro', '⏭ PULAR INTRODUÇÃO', true) + '</div>' +
        (info ? '<div class="game-toast">' + safeText(info) + '</div>' : '');
      ui.querySelector('#skip-intro')?.addEventListener('click', () => net.skipIntro());
      return;
    }
    if (net.stage === 'transition') {
      const titles=['','A BOCA DA NOITE','A PONTE QUEBRADA','OLHOS NA MATA','A TRILHA QUE MENTE'];
      ui.innerHTML = '<div class="interlevel"><h2>🌿 FASE CONCLUÍDA!</h2><p>' +
        (net.level===1?'VOCÊS CONSEGUIRAM ATRAVESSAR!':net.level===2?'VOCÊS VENCERAM A CORRENTEZA!':'VOCÊS SOBREVIVERAM À ESCURIDÃO!') +
        '</p><p>'+(net.level===2?'Mas a noite ainda esconde perigos...':'Os três amigos seguem juntos...')+'</p><strong>FASE 0'+(net.level+1)+' · '+titles[net.level+1]+'</strong></div>';
      return;
    }
    if (net.stage === 'final') {
      ui.innerHTML = '<div class="victory"><h2>🌟 VOCÊS DESCOBRIRAM A VERDADE!</h2>' +
        '<p>Mas ainda existe algo protegendo a saída da floresta...</p><p>O último capítulo chegará em breve.</p>' +
        button('leave-final', 'VOLTAR AO MENU') + '</div>';
      ui.querySelector('#leave-final')?.addEventListener('click', () => net.shutdown());
      return;
    }
    const player = net.localSeat === null ? 'Conectando' : CHARACTERS[net.localSeat].name;
    const online = net.players.filter(p => p.online).length;
    const paused = online < 3;
    ui.innerHTML = (net.isSolo
      ? '<div class="solo-hud"><strong>MODO SOLO DE TESTES · CONTROLANDO: <span style="color:' +
        CHARACTERS[net.localSeat??0].hex + '">' + safeText(player.toUpperCase()) + '</span></strong>' +
        '<div class="solo-actions"><button id="solo-restart">↻ REINICIAR FASE</button>' +
        '<button id="solo-leave">VOLTAR AO MENU</button></div>' +
        '<span class="solo-timing">⏱ Tempos de cooperação adaptados para troca manual.</span>' +
        '<div class="solo-switch"><button data-seat="0">1 · TÉO</button>' +
        '<button data-seat="1">2 · LIA</button><button data-seat="2">3 · NINO</button></div></div>'
      : '') + '<div class="hud">🌳 A FLORESTA MENTE · <span class="text-muted">' +
      safeText(player) + ' · FASE 0' + net.level + ' · Sala ' + safeText(net.code) + ' · ' + online + '/3</span> · <span id="skill-status"></span> ' +
      '<span id="team-status" class="team-status"></span><button id="leave" class="hud-leave" title="Sair da sala">✕</button></div>' +
      (net.level === 1 && net.forest.caboStep >= 1 && net.forest.caboStep < 5
        ? '<div class="forest-dialogue"><p>'+safeText(GUIDE_DIALOGUES[net.forest.caboStep])+'</p>'+button('cabo-next','CONTINUAR · E')+'</div>' : '') +
      (net.completed
        ? '<div class="victory"><h2>🌟 NINGUÉM FICA PARA TRÁS!</h2><p>Os três amigos venceram juntos o primeiro desafio da floresta.</p>' +
          button('leave-win', 'VOLTAR AO MENU') + '</div>'
        : paused
          ? '<div class="game-toast">⚠️ Aguardando reconexão. O avanço cooperativo está pausado.</div>'
          : info ? '<div class="game-toast">' + safeText(info) + '</div>' : '');
    document.querySelector<HTMLButtonElement>('#leave')?.addEventListener('click', () => net.shutdown());
    document.querySelector<HTMLButtonElement>('#solo-restart')?.addEventListener('click',()=>net.restartSolo());
    document.querySelector<HTMLButtonElement>('#solo-leave')?.addEventListener('click',()=>{
      soloSetup=false;net.shutdown();
    });
    ui.querySelectorAll<HTMLButtonElement>('[data-seat]').forEach(button=>{
      button.classList.toggle('active',Number(button.dataset.seat)===net.localSeat);
      button.addEventListener('click',()=>net.selectSoloSeat(Number(button.dataset.seat) as 0|1|2));
    });
    document.querySelector<HTMLButtonElement>('#cabo-next')?.addEventListener('click', () => net.act({kind:'talk'}));
    document.querySelector<HTMLButtonElement>('#leave-win')?.addEventListener('click', () => net.shutdown());
    if (!controls.childElementCount) bindMobile();
    return;
  }
  exitGame();
  const panelStart = '<main class="panel">';
  if (net.role === 'idle' && soloSetup) {
    ui.innerHTML=panelStart+'<div class="kicker">MODO SOLO DE TESTES · SEM CONEXÃO</div>'+
      '<h2>ESCOLHER FASE PARA TESTAR</h2>'+
      '<p>Controle Téo, Lia e Nino alternando entre 1, 2 e 3. Nenhum personagem tem IA.</p>'+
      '<div class="solo-select">'+
      button('solo-1','01 · A BOCA DA NOITE')+
      button('solo-2','02 · A TRAVESSIA DOS CIPÓS')+
      button('solo-3','03 · OLHOS NA MATA')+
      button('solo-4','04 · A TRILHA QUE MENTE')+
      button('solo-intro','▶ ASSISTIR À INTRODUÇÃO',true)+
      button('solo-back','VOLTAR AO MENU',true)+'</div></main>';
    ([1,2,3,4] as const).forEach(level=>
      ui.querySelector('#solo-'+level)?.addEventListener('click',()=>net.startSolo(level)));
    ui.querySelector('#solo-intro')?.addEventListener('click',()=>net.startSolo(1,true));
    ui.querySelector('#solo-back')?.addEventListener('click',()=>{soloSetup=false;render();});
    return;
  }
  if (net.role === 'idle') {
    ui.innerHTML = panelStart + banner() + notice() +
      '<div class="actions">' + button('solo-menu','🎮 MODO SOLO — TESTES') +
      '<div class="kicker">MULTIPLAYER ONLINE</div>' + button('create', '🌿 CRIAR SALA') +
      button('join-menu', '🔑 ENTRAR EM SALA', true) + '</div>' +
      '<div class="rules">👥 Três jogadores em aparelhos diferentes. Um cria a sala; os outros entram com o código.<br>' +
      '🌐 PeerJS Cloud + WebRTC • Conexão P2P depende da compatibilidade das redes.</div></main>';
    ui.querySelector('#create')?.addEventListener('click', () => { info = ''; void net.createRoom(); });
    ui.querySelector('#solo-menu')?.addEventListener('click',()=>{soloSetup=true;render();});
    ui.querySelector('#join-menu')?.addEventListener('click', showJoin);
    return;
  }
  if (net.role === 'guest' && net.localSeat === null) {
    ui.innerHTML = panelStart + '<div class="kicker">ENTRANDO NA FLORESTA</div><h2>Sala ' +
      safeText(net.code) + '</h2><p>Conectando ao anfitrião pelo PeerJS Cloud...</p>' +
      notice() + button('back', 'VOLTAR', true) + '</main>';
    ui.querySelector('#back')?.addEventListener('click', () => net.shutdown());
    return;
  }
  if (net.role === 'host' && !net.code) {
    ui.innerHTML = panelStart + '<div class="kicker">CRIANDO SALA</div><h2>Procurando um código disponível...</h2>' +
      notice() + button('back', 'CANCELAR', true) + '</main>';
    ui.querySelector('#back')?.addEventListener('click', () => net.shutdown());
    return;
  }
  const roster = net.players.map((p, i) => {
    const persona = CHARACTERS[i];
    return '<div class="player"><div class="avatar" style="background:' + persona.hex + '"></div>' +
      '<strong>' + persona.name + '</strong><small><span class="dot ' + (p.online ? 'online' : '') + '"></span>' +
      (p.online ? (p.ready ? 'Pronto ✓' : 'Conectado') : 'Aguardando...') + '</small></div>';
  }).join('');
  const me = net.localSeat;
  const ready = me === null ? false : net.players[me].ready;
  const readyButton = button('ready', ready ? '✓ PRONTO — DESMARCAR' : '✓ ESTOU PRONTO', ready);
  const startButton = net.isHost ? button('start', '▶ INICIAR JOGO', false, !net.canStart) : '';
  ui.innerHTML = panelStart + '<div class="kicker">SALA COOPERATIVA · 3 JOGADORES</div>' +
    '<h2>A equipe está se formando</h2>' +
    '<div class="muted">Código da sala</div><div class="code-row"><div class="code">' + safeText(net.code) +
    '</div>' + button('copy', 'COPIAR', true) + '</div>' +
    '<div class="player-list">' + roster + '</div>' + notice() +
    '<div class="actions">' + readyButton + startButton + button('leave-lobby', 'SAIR', true) + '</div>' +
    '<div class="tip">' + (net.isHost ? 'Você é Téo, anfitrião. Inicie somente com os 3 prontos.' :
      'Você controla ' + (me === null ? 'seu personagem' : CHARACTERS[me].name) + '. Aguarde o anfitrião iniciar.') +
    '</div><div class="rules"><b>COMPUTADOR:</b> A/D ou ←/→ para andar; ESPAÇO ou ↑ para pular e salto duplo; SHIFT = dash de Nino; J = baladeira de Lia; E = interagir.<br>' +
    '<b>CELULAR:</b> setas na esquerda e PULAR na direita. Coloque na horizontal.<br>' +
    '<b>OBJETIVO:</b> encontrem o Guia Indígena, apoiem-se uns nos outros, coletem 3 cipós e derrubem a árvore para atravessar juntos.</div></main>';
  ui.querySelector('#copy')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(net.code).then(() => { info = 'Código copiado!'; render(); })
      .catch(() => { info = 'Copie este código: ' + net.code; render(); });
  });
  ui.querySelector('#ready')?.addEventListener('click', () => { info = ''; net.ready(!ready); });
  ui.querySelector('#start')?.addEventListener('click', () => { info = ''; net.start(); });
  ui.querySelector('#leave-lobby')?.addEventListener('click', () => net.shutdown());
}
function showJoin(): void {
  ui.innerHTML = '<main class="panel"><div class="kicker">REUNIR OS TRÊS AMIGOS</div>' +
    '<h2>Entrar em sala</h2><p>Peça o código de 6 caracteres para o anfitrião.</p>' +
    '<form id="join-form"><input class="code-input" id="code-input" type="text" maxlength="6" ' +
    'autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" ' +
    'placeholder="ABC123" required aria-label="Código da sala"/>' +
    '<div class="actions">' + button('submit', 'ENTRAR') + button('cancel', 'VOLTAR', true) + '</div></form></main>';
  const form = document.querySelector<HTMLFormElement>('#join-form')!;
  document.querySelector<HTMLButtonElement>('#cancel')?.addEventListener('click', event => {
    event.preventDefault(); render();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.querySelector<HTMLInputElement>('#code-input')!;
    const code = input.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) { input.setCustomValidity('Use 6 caracteres.'); input.reportValidity(); return; }
    info = ''; net.joinRoom(code);
  });
  form.querySelector<HTMLInputElement>('#code-input')?.addEventListener('input', event => {
    (event.target as HTMLInputElement).setCustomValidity('');
  });
}
gameKeys.bind();
net.on('solo-seat',()=>{gameKeys.clear();controls.replaceChildren();});
net.on('change', render);
net.on('start', () => { info = ''; render(); });
net.on('phase', () => { info = ''; render(); });
net.on('notice', text => { info = text; render(); });
net.on('win', () => { info = ''; render(); });
window.addEventListener('keydown', event => {
  if(net.isSolo&&net.playing&&['Digit1','Digit2','Digit3','Numpad1','Numpad2','Numpad3'].includes(event.code)){
    event.preventDefault();
    net.selectSoloSeat(Number(event.code.slice(-1))-1 as 0|1|2);
    return;
  }
  if (net.playing && ['ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
});
window.addEventListener('beforeunload', () => net.shutdown());
render();
