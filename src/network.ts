import Peer, { type DataConnection } from 'peerjs';

export type Seat = 0 | 1 | 2;
export type Slot = { seat: Seat; online: boolean; ready: boolean };
export type Pose = { seat: Seat; x: number; y: number; vx: number; vy: number };
type Wire =
  | { t: 'hello'; token: string }
  | { t: 'ready'; value: boolean }
  | { t: 'pose'; x: number; y: number; vx: number; vy: number }
  | { t: 'welcome'; seat: Seat; code: string }
  | { t: 'roster'; players: Slot[]; playing: boolean }
  | { t: 'begin' }
  | { t: 'state'; poses: Pose[] }
  | { t: 'win' }
  | { t: 'reject'; reason: string }
  | { t: 'closed' };

type Events = {
  change: undefined;
  notice: string;
  start: undefined;
  snapshot: Pose[];
  win: undefined;
};
const names = ['Téo', 'Lia', 'Nino'] as const;
export const CHARACTERS = [
  { name: names[0], color: 0x75da87, hex: '#75da87' },
  { name: names[1], color: 0xf5a45b, hex: '#f5a45b' },
  { name: names[2], color: 0x71bfff, hex: '#71bfff' },
] as const;
export const SPAWNS: Pose[] = [
  { seat: 0, x: 105, y: 600, vx: 0, vy: 0 },
  { seat: 1, x: 159, y: 600, vx: 0, vy: 0 },
  { seat: 2, x: 213, y: 600, vx: 0, vy: 0 },
];
const PREFIX = 'florestamente26-';
const roomId = (code: string) => PREFIX + code.toLowerCase();
const createCode = (): string => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => abc[b % abc.length]).join('');
};
const newToken = () => crypto.randomUUID();
const slots = (): Slot[] => ([0, 1, 2] as Seat[]).map(seat => ({ seat, online: false, ready: false }));
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const seatValid = (v: unknown): v is Seat => v === 0 || v === 1 || v === 2;
const validPose = (v: unknown): v is Pose => {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return seatValid(p.seat) && finite(p.x) && finite(p.y) && finite(p.vx) && finite(p.vy)
    && p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 700
    && Math.abs(p.vx) <= 1200 && Math.abs(p.vy) <= 1500;
};
const validSlot = (v: unknown): v is Slot => {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  return seatValid(p.seat) && typeof p.online === 'boolean' && typeof p.ready === 'boolean';
};
function parseWire(value: unknown): Wire | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  switch (p.t) {
    case 'hello': return typeof p.token === 'string' && /^[a-f0-9-]{20,50}$/.test(p.token) ? value as Wire : null;
    case 'ready': return typeof p.value === 'boolean' ? value as Wire : null;
    case 'pose': return finite(p.x) && finite(p.y) && finite(p.vx) && finite(p.vy)
      && p.x >= 0 && p.x <= 1200 && p.y >= 0 && p.y <= 700
      && Math.abs(p.vx) <= 1200 && Math.abs(p.vy) <= 1500 ? value as Wire : null;
    case 'welcome': return seatValid(p.seat) && typeof p.code === 'string' && /^[A-Z0-9]{6}$/.test(p.code) ? value as Wire : null;
    case 'roster': return Array.isArray(p.players) && p.players.length === 3 && p.players.every(validSlot)
      && p.players.every((s: Slot, i: number) => s.seat === i) && typeof p.playing === 'boolean' ? value as Wire : null;
    case 'state': return Array.isArray(p.poses) && p.poses.length === 3 && p.poses.every(validPose)
      && p.poses.every((pose: Pose, i: number) => pose.seat === i) ? value as Wire : null;
    case 'reject': return typeof p.reason === 'string' && p.reason.length <= 130 ? value as Wire : null;
    case 'begin': case 'win': case 'closed': return value as Wire;
    default: return null;
  }
}

/** Estrela: convidados conectam somente ao anfitrião; anfitrião retransmite estados a 20Hz. */
export class Network {
  role: 'idle' | 'host' | 'guest' = 'idle';
  code = '';
  localSeat: Seat | null = null;
  players: Slot[] = slots();
  poses: Pose[] = SPAWNS.map(p => ({ ...p }));
  playing = false;
  completed = false;
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private conns = new Map<Seat, DataConnection>();
  private tokens: (string | null)[] = [null, null, null];
  private grace = new Map<Seat, ReturnType<typeof setTimeout>>();
  private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private lastInput = 0;
  private lastReceived: number[] = [0, 0, 0];
  private sessionToken = '';
  private reconnectDeadline = 0;
  private shuttingDown = false;

  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void): () => void {
    const listeners = (this.listeners[event] ?? []) as Array<(payload: Events[K]) => void>;
    listeners.push(fn);
    this.listeners[event] = listeners as typeof this.listeners[K];
    return () => { const index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); };
  }
  private emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const callbacks = this.listeners[event] as Array<(v: Events[K]) => void> | undefined;
    callbacks?.forEach(fn => fn(payload));
  }
  get isHost(): boolean { return this.role === 'host'; }
  get everyoneConnected(): boolean { return this.players.every(p => p.online); }
  get canStart(): boolean { return this.isHost && !this.playing && this.players.every(p => p.online && p.ready); }
  private message(conn: DataConnection | null, wire: Wire): void {
    if (conn?.open) {
      try { conn.send(wire); } catch { this.emit('notice', 'Falha ao enviar dados pela conexão.'); }
    }
  }
  private broadcast(wire: Wire): void {
    for (const conn of this.conns.values()) this.message(conn, wire);
  }
  private updateRoster(): void {
    this.broadcast({ t: 'roster', players: this.players, playing: this.playing });
    this.emit('change', undefined);
  }
  async createRoom(): Promise<void> {
    this.shutdown();
    this.shuttingDown = false;
    this.role = 'host';
    this.localSeat = 0;
    this.players[0] = { seat: 0, online: true, ready: false };
    this.emit('change', undefined);
    for (let i = 0; i < 8; i++) {
      const code = createCode();
      try {
        const peer = await new Promise<Peer>((resolve, reject) => {
          const candidate = new Peer(roomId(code));
          const timeout = setTimeout(() => { candidate.destroy(); reject(new Error('Tempo esgotado ao criar sala.')); }, 10000);
          candidate.on('open', () => { clearTimeout(timeout); resolve(candidate); });
          candidate.on('error', (err) => { clearTimeout(timeout); candidate.destroy(); reject(err); });
        });
        this.peer = peer;
        this.code = code; // Somente depois do evento open do servidor de sinalização.
        peer.on('connection', conn => this.acceptConnection(conn));
        peer.on('error', err => this.emit('notice', this.peerError(err)));
        peer.on('disconnected', () => {
          this.emit('notice', 'Sinalização interrompida. Tentando reconectar...');
          if (!peer.destroyed) peer.reconnect();
        });
        this.heartbeat = setInterval(() => this.hostTick(), 50);
        this.updateRoster();
        return;
      } catch (e) {
        const error = e as Error & { type?: string };
        if (error.type === 'unavailable-id') continue;
        this.emit('notice', this.peerError(error));
        this.shutdown(); return;
      }
    }
    this.emit('notice', 'Não foi possível obter um código livre. Tente novamente.');
    this.shutdown();
  }
  joinRoom(rawCode: string): void {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      this.emit('notice', 'Digite os 6 caracteres da sala.'); return;
    }
    this.shutdown();
    this.shuttingDown = false;
    this.role = 'guest'; this.code = code;
    try {
      this.sessionToken = sessionStorage.getItem('afm-' + code) || newToken();
      sessionStorage.setItem('afm-' + code, this.sessionToken);
    } catch { this.sessionToken = newToken(); }
    this.emit('change', undefined);
    const peer = new Peer();
    this.peer = peer;
    peer.on('open', () => this.connectHost());
    peer.on('error', err => {
      const type = (err as Error & { type?: string }).type;
      if (type === 'peer-unavailable' && this.localSeat === null) {
        this.emit('notice', 'Sala não encontrada. Confira o código e tente novamente.');
      } else if (this.localSeat !== null) {
        this.emit('notice', 'Conexão com a sala interrompida. Tentando reconectar...');
      } else {
        this.emit('notice', this.peerError(err));
      }
    });
    peer.on('disconnected', () => {
      this.emit('notice', 'Sem sinalização. Tentando restabelecer conexão...');
      if (!peer.destroyed) peer.reconnect();
    });
  }
  private connectHost(): void {
    if (!this.peer || this.shuttingDown || this.role !== 'guest') return;
    if (this.hostConn?.open) return;
    const conn = this.peer.connect(roomId(this.code), { reliable: true, serialization: 'json' });
    this.hostConn = conn;
    const timeout = setTimeout(() => {
      if (!conn.open) {
        conn.close();
        if (this.localSeat === null) this.emit('notice', 'Não foi possível conectar. Sala inexistente, bloqueio WebRTC ou rede indisponível.');
      }
    }, 10000);
    conn.on('open', () => {
      clearTimeout(timeout);
      this.stopReconnect();
      this.message(conn, { t: 'hello', token: this.sessionToken });
    });
    conn.on('data', raw => this.guestReceive(conn, raw));
    conn.on('close', () => {
      clearTimeout(timeout);
      if (this.shuttingDown || conn !== this.hostConn) return;
      if (this.localSeat === null) {
        this.emit('notice', 'Não foi possível entrar na sala.');
      } else {
        this.players[this.localSeat].online = false;
        this.emit('change', undefined);
        this.emit('notice', 'Anfitrião desconectado. Tentando recuperar a sala por até 30 segundos...');
        this.startReconnect();
      }
    });
    conn.on('error', () => {
      if (this.localSeat === null) this.emit('notice', 'Erro na conexão WebRTC. Confira a rede ou tente outro navegador.');
    });
  }
  private acceptConnection(conn: DataConnection): void {
    if (this.role !== 'host') { conn.close(); return; }
    let seat: Seat | null = null;
    const timeout = setTimeout(() => { if (seat === null) conn.close(); }, 6000);
    conn.on('data', raw => {
      const msg = parseWire(raw);
      if (!msg) return;
      if (seat === null) {
        if (msg.t !== 'hello') return;
        const reserved = this.tokens.findIndex(t => t === msg.token);
        const newSeat = reserved >= 1 ? reserved : this.tokens.findIndex((t, i) => i > 0 && t === null);
        if (newSeat < 1 || (reserved < 0 && this.playing) || this.players[newSeat].online) {
          this.message(conn, { t: 'reject', reason: this.playing ? 'Partida em andamento.' : 'Sala cheia (3 jogadores).' });
          setTimeout(() => conn.close(), 250);
          return;
        }
        seat = newSeat as Seat;
        clearTimeout(timeout);
        const oldGrace = this.grace.get(seat);
        if (oldGrace) clearTimeout(oldGrace);
        this.grace.delete(seat);
        this.tokens[seat] = msg.token;
        this.conns.set(seat, conn);
        this.players[seat] = { seat, online: true, ready: reserved >= 1 ? this.players[seat].ready : false };
        this.message(conn, { t: 'welcome', seat, code: this.code });
        this.updateRoster();
        if (this.playing) {
          this.message(conn, { t: 'begin' });
          this.message(conn, { t: 'state', poses: this.poses });
        }
        return;
      }
      if (this.conns.get(seat) !== conn) return;
      if (msg.t === 'ready' && !this.playing) {
        this.players[seat].ready = msg.value;
        this.updateRoster();
      }
      if (msg.t === 'pose' && this.playing && this.everyoneConnected) {
        const now = performance.now();
        if (now - this.lastReceived[seat] < 35) return; // ~28 Hz no máximo por convidado.
        this.lastReceived[seat] = now;
        this.poses[seat] = { seat, x: msg.x, y: msg.y, vx: msg.vx, vy: msg.vy };
      }
    });
    conn.on('close', () => {
      clearTimeout(timeout);
      if (seat === null || this.conns.get(seat) !== conn || this.shuttingDown) return;
      this.conns.delete(seat);
      this.players[seat].online = false;
      this.players[seat].ready = false;
      this.emit('notice', CHARACTERS[seat].name + ' desconectou. Vaga reservada por 30 segundos.');
      this.updateRoster();
      const timer = setTimeout(() => {
        this.grace.delete(seat!);
        if (!this.players[seat!].online) {
          this.tokens[seat!] = null;
          if (this.playing) {
            this.playing = false;
            this.completed = false;
            for (const p of this.players) p.ready = false;
            this.emit('notice', 'Tempo de reconexão esgotado. Aguardando jogadores no lobby.');
          }
          this.updateRoster();
        }
      }, 30000);
      this.grace.set(seat, timer);
    });
    conn.on('error', () => {
      this.emit('notice', 'Erro na conexão com um dos convidados.');
    });
  }
  private guestReceive(conn: DataConnection, raw: unknown): void {
    if (conn !== this.hostConn) return;
    const msg = parseWire(raw);
    if (!msg) return;
    switch (msg.t) {
      case 'welcome':
        if (msg.code !== this.code) return;
        this.localSeat = msg.seat;
        this.emit('change', undefined);
        break;
      case 'roster':
        this.players = msg.players.map(p => ({ ...p }));
        if (this.playing && !msg.playing) {
          this.playing = false; this.completed = false;
        }
        this.emit('change', undefined);
        break;
      case 'begin':
        if (this.localSeat === null) return;
        this.playing = true; this.completed = false;
        this.poses = SPAWNS.map(p => ({ ...p }));
        this.emit('start', undefined);
        this.emit('change', undefined);
        break;
      case 'state':
        if (this.playing) {
          this.poses = msg.poses.map(p => ({ ...p }));
          this.emit('snapshot', this.poses);
        }
        break;
      case 'win':
        this.completed = true; this.emit('win', undefined); this.emit('change', undefined);
        break;
      case 'reject':
        this.emit('notice', msg.reason);
        this.shutdown();
        break;
      case 'closed':
        this.emit('notice', 'O anfitrião encerrou a sala.');
        this.shutdown();
        break;
      default: break;
    }
  }
  ready(value: boolean): void {
    const seat = this.localSeat;
    if (seat === null || this.playing) return;
    if (this.isHost) {
      this.players[seat].ready = value;
      this.updateRoster();
    } else this.message(this.hostConn, { t: 'ready', value });
  }
  start(): void {
    if (!this.canStart) return;
    this.playing = true; this.completed = false;
    this.poses = SPAWNS.map(p => ({ ...p }));
    this.broadcast({ t: 'begin' });
    this.updateRoster();
    this.emit('start', undefined);
  }
  report(x: number, y: number, vx: number, vy: number): void {
    if (!this.playing || this.completed || !this.everyoneConnected || this.localSeat === null) return;
    const now = performance.now();
    if (now - this.lastInput < 50) return;
    this.lastInput = now;
    const msg = { t: 'pose' as const, x: Math.max(0, Math.min(1200, x)),
      y: Math.max(0, Math.min(700, y)), vx, vy };
    if (!finite(x) || !finite(y) || !finite(vx) || !finite(vy)) return;
    if (this.isHost) this.poses[0] = { seat: 0, ...msg };
    else this.message(this.hostConn, msg);
  }
  private hostTick(): void {
    if (!this.isHost || !this.playing || this.completed || !this.everyoneConnected) return;
    this.broadcast({ t: 'state', poses: this.poses });
    this.emit('snapshot', this.poses);
    if (this.poses.every(p => p.x >= 1050 && p.x <= 1185 && p.y >= 540 && p.y <= 655)) {
      this.completed = true;
      this.broadcast({ t: 'win' });
      this.emit('win', undefined);
      this.emit('change', undefined);
    }
  }
  private startReconnect(): void {
    if (this.reconnectTimer || this.shuttingDown) return;
    this.reconnectDeadline = Date.now() + 30000;
    this.reconnectTimer = setInterval(() => {
      if (Date.now() > this.reconnectDeadline) {
        this.stopReconnect();
        this.emit('notice', 'Não foi possível reconectar. A sala pode ter sido encerrada.');
        this.shutdown();
        return;
      }
      if (this.peer && !this.peer.destroyed && !this.peer.disconnected && !this.hostConn?.open) this.connectHost();
    }, 3000);
  }
  private stopReconnect(): void {
    if (this.reconnectTimer) clearInterval(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  private peerError(err: unknown): string {
    const type = (err as { type?: string })?.type;
    if (type === 'peer-unavailable') return 'Sala não encontrada no PeerJS Cloud.';
    if (type === 'unavailable-id') return 'Esse código já está em uso.';
    if (type === 'network' || type === 'server-error' || type === 'socket-error') return 'PeerJS Cloud indisponível ou bloqueado nesta rede.';
    if (type === 'browser-incompatible') return 'Este navegador não oferece suporte ao WebRTC.';
    return 'Erro de conexão: ' + String((err as Error)?.message || type || 'desconhecido');
  }
  shutdown(): void {
    this.shuttingDown = true;
    if (this.isHost) this.broadcast({ t: 'closed' });
    this.stopReconnect();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    for (const timer of this.grace.values()) clearTimeout(timer);
    this.grace.clear();
    for (const conn of this.conns.values()) conn.close();
    this.conns.clear();
    this.hostConn?.close(); this.hostConn = null;
    this.peer?.destroy(); this.peer = null;
    this.role = 'idle'; this.code = ''; this.localSeat = null;
    this.players = slots(); this.poses = SPAWNS.map(p => ({ ...p }));
    this.playing = false; this.completed = false;
    this.tokens = [null, null, null]; this.lastInput = 0; this.lastReceived = [0, 0, 0];
    this.emit('change', undefined);
  }
}
