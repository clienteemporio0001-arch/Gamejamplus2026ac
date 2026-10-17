import Phaser from 'phaser';
import { CHARACTERS, Network } from './network';
import { DemoScene, type TouchInput } from './game';
import './style.css';

const net = new Network();
const ui = document.querySelector<HTMLDivElement>('#ui')!;
const controls = document.querySelector<HTMLDivElement>('#mobile-controls')!;
const touch: TouchInput = { left: false, right: false, jump: false };
let game: Phaser.Game | null = null;
let info = '';

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
  if (game || !net.playing) return;
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1200,
    height: 700,
    backgroundColor: '#091c23',
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [new DemoScene(net, touch)],
  });
}
function exitGame(): void {
  if (!game) return;
  game.destroy(true);
  game = null;
  touch.left = false; touch.right = false; touch.jump = false;
  controls.replaceChildren();
}
function bindMobile(): void {
  controls.innerHTML = '<div class="control-group"><button class="touch-btn" id="left" aria-label="Esquerda">◀</button>' +
    '<button class="touch-btn" id="right" aria-label="Direita">▶</button></div>' +
    '<div class="control-group"><button class="touch-btn reserved" disabled>E</button>' +
    '<button class="touch-btn reserved" disabled>Q</button>' +
    '<button class="touch-btn jump" id="jump" aria-label="Pular">PULAR</button></div>';
  for (const key of ['left', 'right', 'jump'] as const) {
    const el = controls.querySelector<HTMLButtonElement>('#' + key)!;
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
        if (key !== 'jump') touch[key] = false;
      });
    }
  }
}
function render(): void {
  document.body.classList.toggle('playing', net.playing);
  ui.classList.toggle('in-game', net.playing);
  if (net.playing) {
    enterGame();
    const player = net.localSeat === null ? 'Conectando' : CHARACTERS[net.localSeat].name;
    const online = net.players.filter(p => p.online).length;
    const paused = online < 3;
    ui.innerHTML = '<div class="hud">🌳 A FLORESTA MENTE · <span class="text-muted">' +
      safeText(player) + ' · Sala ' + safeText(net.code) + ' · ' + online + '/3</span> ' +
      '<button id="leave" class="hud-leave" title="Sair da sala">✕</button></div>' +
      (net.completed
        ? '<div class="victory"><h2>🌟 TODOS CHEGARAM!</h2><p>Ninguém ficou para trás.</p>' +
          button('leave-win', 'VOLTAR AO MENU') + '</div>'
        : paused
          ? '<div class="game-toast">⚠️ Aguardando reconexão. O avanço cooperativo está pausado.</div>'
          : info ? '<div class="game-toast">' + safeText(info) + '</div>' : '');
    document.querySelector<HTMLButtonElement>('#leave')?.addEventListener('click', () => net.shutdown());
    document.querySelector<HTMLButtonElement>('#leave-win')?.addEventListener('click', () => net.shutdown());
    if (!controls.childElementCount) bindMobile();
    return;
  }
  exitGame();
  const panelStart = '<main class="panel">';
  if (net.role === 'idle') {
    ui.innerHTML = panelStart + banner() + notice() +
      '<div class="actions">' + button('create', '🌿 CRIAR SALA') +
      button('join-menu', '🔑 ENTRAR EM SALA', true) + '</div>' +
      '<div class="rules">👥 Três jogadores em aparelhos diferentes. Um cria a sala; os outros entram com o código.<br>' +
      '🌐 PeerJS Cloud + WebRTC • Conexão P2P depende da compatibilidade das redes.</div></main>';
    ui.querySelector('#create')?.addEventListener('click', () => { info = ''; void net.createRoom(); });
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
    '</div><div class="rules"><b>COMPUTADOR:</b> A/D ou ←/→ para andar; Espaço/↑ para pular.<br>' +
    '<b>CELULAR:</b> setas na esquerda e PULAR na direita. Coloque na horizontal.<br>' +
    '<b>OBJETIVO:</b> os três precisam chegar juntos à área CASA.</div></main>';
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
net.on('change', render);
net.on('start', () => { info = ''; render(); });
net.on('notice', text => { info = text; render(); });
net.on('win', () => { info = ''; render(); });
window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) event.preventDefault();
});
window.addEventListener('beforeunload', () => net.shutdown());
render();
