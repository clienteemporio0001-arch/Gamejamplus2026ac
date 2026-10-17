import Peer, { type DataConnection } from 'peerjs';
import { PuzzleAuthority, initialWorld, validWorld, validAction, CHECKPOINTS, type WorldState, type PuzzleAction } from './puzzles';
import { RiverAuthority, initialRiver, validRiver, RIVER_CHECKPOINTS, RIVER_SPAWNS, type RiverWorld } from './river';
import { SkillFxGate, validSkillFx, type SkillFx } from './effects';
import { ChapterAuthority, initialEyes, initialTrail, defaultJaguar, validChapter, validJaguar, LATE_SPAWNS, LATE_CHECKPOINTS, type ChapterWorld, type Jaguar, type LateLevel } from './chapters';
import { nextPlayableLevel } from './levels';
import { JourneyAuthority, initialJourney, validJourney, floatingLogs, validMotion, journeyDanger, JOURNEY_SPAWNS, JOURNEY_CHECKPOINTS, RIVER_WIDTH, type JourneyWorld, type JourneyMotion } from './riverJourney';
import { ForestAuthority, FOREST_WIDTH, FOREST_SPAWNS, FOREST_CHECKPOINTS, forestDanger, validForest, initialForest, type ForestWorld } from './forest';

export type Stage = 'lobby' | 'intro' | 'playing' | 'transition' | 'final';
export type Level = 1 | 2 | 3 | 4;
export type PhaseInfo = { stage: Stage; level: Level; since: number; until: number };

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
  | { t: 'act'; action: PuzzleAction }
  | { t: 'fx'; fx: SkillFx }
  | { t: 'puzzle'; world: WorldState }
  | { t: 'forest'; world: ForestWorld }
  | { t: 'respawn'; pose: Pose }
  | { t: 'river'; world: RiverWorld }
  | { t: 'journey'; world: JourneyWorld }
  | { t: 'journey-motion'; motion: JourneyMotion }
  | { t: 'chapter'; world: ChapterWorld }
  | { t: 'hazard'; jaguar: Jaguar }
  | { t: 'phase'; info: PhaseInfo }
  | { t: 'intro-skip' }
  | { t: 'win' }
  | { t: 'reject'; reason: string }
  | { t: 'closed' };

type Events = {
  change: undefined;
  notice: string;
  start: undefined;
  snapshot: Pose[];
  effect: SkillFx;
  puzzle: WorldState;
  forest: ForestWorld;
  respawn: Pose;
  river: RiverWorld;
  journey: JourneyWorld;
  'journey-motion': JourneyMotion;
  chapter: ChapterWorld;
  hazard: Jaguar;
  phase: PhaseInfo;
  win: undefined;
  'solo-seat': Seat;
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
    && p.x >= 0 && p.x <= FOREST_WIDTH && p.y >= 0 && p.y <= 700
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
      && p.x >= 0 && p.x <= FOREST_WIDTH && p.y >= 0 && p.y <= 700
      && Math.abs(p.vx) <= 1200 && Math.abs(p.vy) <= 1500 ? value as Wire : null;
    case 'welcome': return seatValid(p.seat) && typeof p.code === 'string' && /^[A-Z0-9]{6}$/.test(p.code) ? value as Wire : null;
    case 'roster': return Array.isArray(p.players) && p.players.length === 3 && p.players.every(validSlot)
      && p.players.every((s: Slot, i: number) => s.seat === i) && typeof p.playing === 'boolean' ? value as Wire : null;
    case 'state': return Array.isArray(p.poses) && p.poses.length === 3 && p.poses.every(validPose)
      && p.poses.every((pose: Pose, i: number) => pose.seat === i) ? value as Wire : null;
    case 'act': return validAction(p.action) ? value as Wire : null;
    case 'fx': return validSkillFx(p.fx) ? value as Wire : null;
    case 'puzzle': return validWorld(p.world) ? value as Wire : null;
    case 'forest': return validForest(p.world) ? value as Wire : null;
    case 'respawn': return validPose(p.pose) ? value as Wire : null;
    case 'river': return validRiver(p.world) ? value as Wire : null;
    case 'journey': return validJourney(p.world) ? value as Wire : null;
    case 'journey-motion': return validMotion(p.motion) ? value as Wire : null;
    case 'chapter': return validChapter(p.world) ? value as Wire : null;
    case 'hazard': return validJaguar(p.jaguar) ? value as Wire : null;
    case 'phase': {
      const i = p.info as Record<string, unknown> | undefined;
      return i && typeof i === 'object' && ['lobby','intro','playing','transition','final'].includes(String(i.stage))
        && [1,2,3,4].includes(Number(i.level)) && finite(i.since) && finite(i.until)
        && i.since >= 0 && i.until >= 0 ? value as Wire : null;
    }
    case 'intro-skip': return value as Wire;
    case 'reject': return typeof p.reason === 'string' && p.reason.length <= 130 ? value as Wire : null;
    case 'begin': case 'win': case 'closed': return value as Wire;
    default: return null;
  }
}

/** Estrela: convidados conectam somente ao anfitrião; anfitrião retransmite estados a 20Hz. */
export class Network {
  role: 'idle' | 'host' | 'guest' | 'solo' = 'idle';
  code = '';
  localSeat: Seat | null = null;
  players: Slot[] = slots();
  poses: Pose[] = SPAWNS.map(p => ({ ...p }));
  playing = false;
  completed = false;
  puzzle: WorldState = initialWorld();
  forest: ForestWorld = initialForest();
  private forestAuthority = new ForestAuthority();
  river: RiverWorld = initialRiver();
  journey: JourneyWorld = initialJourney();
  journeyMotion: JourneyMotion = {logs:[3086,3224],now:0};
  private journeyAuthority = new JourneyAuthority();
  private lastJourneyMotionBroadcast=0;
  chapter: ChapterWorld = initialEyes();
  jaguar: Jaguar = defaultJaguar();
  private chapterAuthority = new ChapterAuthority(3);
  private lastHazardBroadcast = 0;
  stage: Stage = 'lobby';
  level: Level = 1;
  phaseSince = 0;
  phaseUntil = 0;
  private riverAuthority = new RiverAuthority();
  private authority = new PuzzleAuthority();
  private lastAction = new Map<string, number>();
  private effectGate = new SkillFxGate();
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
  private pendingRestore = false;

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
  get isSolo(): boolean { return this.role === 'solo'; }
  get isHost(): boolean { return this.role === 'host' || this.isSolo; }
  get everyoneConnected(): boolean { return this.players.every(p => p.online); }
  get canStart(): boolean { return this.isHost && this.stage === 'lobby' && this.players.every(p => p.online && p.ready); }
  private message(conn: DataConnection | null, wire: Wire): void {
    if (conn?.open) {
      try { conn.send(wire); } catch { this.emit('notice', 'Falha ao enviar dados pela conexão.'); }
    }
  }
  private broadcast(wire: Wire): void {
    for (const conn of this.conns.values()) this.message(conn, wire);
  }
  /** Local session: three physical players, zero Peer instances / DataChannels. */
  startSolo(level: Level = 1, showIntro = false): void {
    this.shutdown();
    this.shuttingDown=false;
    this.role='solo';this.code='SOLO';this.localSeat=0;
    this.players=([0,1,2] as Seat[]).map(seat=>({seat,online:true,ready:true}));
    this.authority.reset();this.effectGate.reset();
    this.forestAuthority.reset();this.forest=this.forestAuthority.world;
    this.journeyAuthority.reset();this.journey=this.journeyAuthority.world;
    this.chapterAuthority.reset(level>=3?level as LateLevel:3);
    this.chapter={...this.chapterAuthority.world};this.jaguar={...this.chapterAuthority.jaguar};
    this.puzzle=initialWorld();
    this.authority.world.unlocked=[level!==1,true,true];
    this.puzzle={...this.authority.world,unlocked:[...this.authority.world.unlocked] as WorldState['unlocked']};
    this.poses=(level===1?FOREST_SPAWNS:level===2?JOURNEY_SPAWNS:LATE_SPAWNS).map(p=>({...p}));
    this.journeyMotion={logs:floatingLogs(Date.now(),this.journey.hazardEpoch),now:Date.now()};
    this.journeyAuthority.solo=true;this.chapterAuthority.solo=true;
    this.heartbeat=setInterval(()=>this.hostTick(),50);
    this.setPhase(showIntro&&level===1?'intro':'playing',level,
      showIntro&&level===1?Date.now()+24000:0);
  }
  selectSoloSeat(seat: Seat): void {
    if(!this.isSolo||!this.playing||this.localSeat===seat)return;
    this.localSeat=seat;
    this.lastInput=0;this.lastAction.clear();
    this.emit('solo-seat',seat);this.emit('change',undefined);
  }
  /** Physics-owned poses from all three local Arcade bodies. */
  reportSoloBodies(poses: Pose[]):void {
    if(!this.isSolo||!this.playing||poses.length!==3)return;
    for(const input of poses) {
      const p={...input,y:Math.max(0,Math.min(700,input.y))};
      if(!validPose(p))continue;
      const supporting=this.level===1?this.forest.supporting:
        this.level===2?this.journey.supporting:null;
      if(supporting?.[p.seat]!==null && supporting?.[p.seat]!==undefined)continue;
      this.poses[p.seat]={...p};
    }
  }
  restartSolo():void {
    if(!this.isSolo||!this.playing)return;
    this.effectGate.reset();this.lastAction.clear();
    if(this.level===1){
      this.forestAuthority.reset();this.shareForest();
      this.authority.world.unlocked=[false,true,true];this.sharePuzzle();
    }else if(this.level===2){
      this.journeyAuthority.reset();this.shareJourney();
    }else{
      this.chapterAuthority.reset(this.level as LateLevel);this.shareChapter();
      this.jaguar={...this.chapterAuthority.jaguar};this.emit('hazard',this.jaguar);
    }
    this.poses=(this.level===1?FOREST_SPAWNS:this.level===2?JOURNEY_SPAWNS:LATE_SPAWNS)
      .map(p=>({...p}));
    for(const pose of this.poses)this.emit('respawn',pose);
    this.emit('snapshot',this.poses);
    this.emit('notice','FASE REINICIADA: os três personagens retornaram ao início.');
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
        if (newSeat < 1 || (reserved < 0 && this.stage !== 'lobby') || this.players[newSeat].online) {
          this.message(conn, { t: 'reject', reason: this.stage !== 'lobby' ? 'Partida em andamento.' : 'Sala cheia (3 jogadores).' });
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
        this.message(conn, { t: 'puzzle', world: this.puzzle });
        this.message(conn, { t: 'forest', world: this.forest });
        this.message(conn, { t: 'river', world: this.river });
        this.message(conn, { t: 'journey', world: this.journey });
        this.message(conn, { t: 'journey-motion', motion: this.journeyMotion });
        this.message(conn, { t: 'chapter', world: this.chapter });
        this.message(conn, { t: 'hazard', jaguar: this.jaguar });
        this.message(conn, { t: 'phase', info: this.phaseInfo() });
        if (this.stage !== 'lobby') this.message(conn, { t: 'state', poses: this.poses });
        return;
      }
      if (this.conns.get(seat) !== conn) return;
      if (msg.t === 'ready' && !this.playing) {
        this.players[seat].ready = msg.value;
        this.updateRoster();
      }
      if (msg.t === 'intro-skip' && this.stage === 'intro' && this.everyoneConnected) this.finishIntro();
      if (msg.t === 'act' && this.playing && this.everyoneConnected) {
        this.hostAction(seat, msg.action);
      }
      if (msg.t === 'pose' && this.playing && this.everyoneConnected) {
        const now = performance.now();
        if (now - this.lastReceived[seat] < 35) return; // ~28 Hz no máximo por convidado.
        this.lastReceived[seat] = now;
        if (msg.x > (this.level <= 2 ? FOREST_WIDTH : 1200)) return;
        if (this.level === 1 && this.forest.restartAt > 0) return;
        if (this.level === 1 && this.forest.supporting[seat] !== null) return;
        if (this.level === 2 && (this.journey.restartAt>0 || this.journey.supporting[seat]!==null)) return;
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
          if (this.stage !== 'lobby') {
            this.stage = 'lobby'; this.playing = false;
            this.completed = false;
            for (const p of this.players) p.ready = false;
            this.broadcast({ t: 'phase', info: this.phaseInfo() });
            this.emit('phase', this.phaseInfo());
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
        this.pendingRestore = this.playing && this.localSeat === msg.seat;
        this.localSeat = msg.seat;
        this.emit('change', undefined);
        break;
      case 'roster':
        this.players = msg.players.map(p => ({ ...p }));
        this.emit('change', undefined);
        break;
      case 'begin':
        // Mensagem legada da Fase 01, mantida apenas para compatibilidade do parser.
        break;
      case 'phase': {
        if (this.localSeat === null) return;
        const oldStage = this.stage, oldLevel = this.level;
        this.stage = msg.info.stage; this.level = msg.info.level;
        this.phaseSince = msg.info.since; this.phaseUntil = msg.info.until;
        this.playing = this.stage === 'playing'; this.completed = this.stage === 'final';
        if (this.stage === 'playing') this.pendingRestore = true;
        if (oldLevel !== this.level) this.poses = (this.level === 1 ? FOREST_SPAWNS : this.level === 2 ? JOURNEY_SPAWNS : LATE_SPAWNS).map(p => ({ ...p }));
        this.emit('phase', this.phaseInfo());
        if (this.playing && (oldStage !== 'playing' || oldLevel !== this.level)) this.emit('start', undefined);
        this.emit('change', undefined);
        break;
      }
      case 'state':
        if (this.playing) {
          this.poses = msg.poses.map(p => ({ ...p }));
          this.emit('snapshot', this.poses);
          if (this.pendingRestore && this.localSeat !== null) {
            this.pendingRestore = false;
            this.emit('respawn', this.poses[this.localSeat]);
          }
        }
        break;
      case 'chapter':
        // Snapshot de reconexão pode chegar ANTES da mensagem de mudança de fase.
        this.chapter = { ...msg.world };
        this.emit('chapter', this.chapter);
        this.emit('change', undefined);
        break;
      case 'hazard':
        this.jaguar = { ...msg.jaguar };
        this.emit('hazard', this.jaguar);
        break;
      case 'journey':
        this.journey={...msg.world,
          materials:[...msg.world.materials] as JourneyWorld['materials'],
          supporting:[...msg.world.supporting] as JourneyWorld['supporting'],
          health:[...msg.world.health] as JourneyWorld['health'],
          safeUntil:[...msg.world.safeUntil] as JourneyWorld['safeUntil']
        };
        this.emit('journey',this.journey);
        this.emit('change',undefined);
        break;
      case 'journey-motion':
        this.journeyMotion={logs:[...msg.motion.logs] as [number,number],now:msg.motion.now};
        this.emit('journey-motion',this.journeyMotion);
        break;
      case 'river':
        this.river = { ...msg.world };
        this.emit('river', this.river);
        this.emit('change', undefined);
        break;
      case 'fx':
        // Apenas a DataConnection autenticada do anfitrião chega a este handler.
        // O originador não recebe o mesmo efeito, evitando duplicação local.
        if (this.playing && msg.fx.level === this.level && msg.fx.seat !== this.localSeat) {
          this.emit('effect', msg.fx);
        }
        break;
      case 'forest':
        this.forest = { ...msg.world, health:[...msg.world.health] as ForestWorld['health'],
          safeUntil:[...msg.world.safeUntil] as ForestWorld['safeUntil'],
          supporting:[...msg.world.supporting] as ForestWorld['supporting'],
          vines:[...msg.world.vines] as ForestWorld['vines'],
          treeSteps:[...msg.world.treeSteps] as ForestWorld['treeSteps'] };
        this.emit('forest', this.forest);
        this.emit('change', undefined);
        break;
      case 'puzzle':
        this.puzzle = { ...msg.world, unlocked: [...msg.world.unlocked] as WorldState['unlocked'] };
        this.emit('puzzle', this.puzzle);
        this.emit('change', undefined);
        break;
      case 'respawn':
        this.poses[msg.pose.seat] = { ...msg.pose };
        this.emit('respawn', msg.pose);
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
    if (seat === null || this.stage !== 'lobby') return;
    if (this.isHost) {
      this.players[seat].ready = value;
      this.updateRoster();
    } else this.message(this.hostConn, { t: 'ready', value });
  }
  phaseInfo(): PhaseInfo {
    return { stage: this.stage, level: this.level, since: this.phaseSince, until: this.phaseUntil };
  }
  private setPhase(stage: Stage, level: Level, until = 0): void {
    this.stage = stage; this.level = level;
    this.phaseSince = Date.now(); this.phaseUntil = until;
    this.playing = stage === 'playing'; this.completed = stage === 'final';
    this.broadcast({ t: 'phase', info: this.phaseInfo() });
    this.emit('phase', this.phaseInfo());
    if (this.playing) this.emit('start', undefined);
    this.updateRoster();
  }
  start(): void {
    if (!this.canStart) return;
    this.authority.reset(); this.riverAuthority.reset(); this.effectGate.reset();
    this.journeyAuthority.reset();this.journey=this.journeyAuthority.world;
    this.journeyMotion={logs:floatingLogs(Date.now(),this.journey.hazardEpoch),now:Date.now()};
    this.forestAuthority.reset();this.forest=this.forestAuthority.world;
    this.authority.world.unlocked=[false,true,true];
    this.chapterAuthority.reset(3); this.chapter = initialEyes(); this.jaguar = defaultJaguar();
    this.puzzle = initialWorld(); this.river = initialRiver();
    this.poses = FOREST_SPAWNS.map(p => ({ ...p }));
    this.sharePuzzle(); this.shareForest(); this.shareRiver();
    this.setPhase('intro', 1, Date.now() + 24000);
  }
  skipIntro(): void {
    if (this.stage !== 'intro') return;
    if (this.isHost) this.finishIntro();
    else this.message(this.hostConn, { t: 'intro-skip' });
  }
  private finishIntro(): void {
    if (!this.isHost || this.stage !== 'intro' || !this.everyoneConnected) return;
    this.poses = FOREST_SPAWNS.map(p => ({ ...p }));
    this.broadcast({ t: 'state', poses: this.poses });
    this.setPhase('playing', 1);
  }
  private advanceLevel(): void {
    if (!this.isHost || this.stage !== 'transition' || !this.everyoneConnected) return;
    const next = nextPlayableLevel(this.level);
    if (next === null) return;
    this.effectGate.reset();this.lastHazardBroadcast=0;
    if (next === 2) {
      this.riverAuthority.reset();
      this.journeyAuthority.reset();
      this.poses = JOURNEY_SPAWNS.map(p => ({ ...p }));
      this.shareRiver();
      this.shareJourney();
      this.journeyMotion={logs:floatingLogs(Date.now(),this.journey.hazardEpoch),now:Date.now()};
      this.broadcast({t:'journey-motion',motion:this.journeyMotion});
    } else {
      this.chapterAuthority.reset(next as LateLevel);
      this.poses = LATE_SPAWNS.map(p => ({ ...p }));
      this.shareChapter();
      this.jaguar = { ...this.chapterAuthority.jaguar };
      this.broadcast({t:'hazard',jaguar:this.jaguar});
    }
    this.broadcast({ t: 'state', poses: this.poses });
    this.setPhase('playing', next);
  }
  report(x: number, y: number, vx: number, vy: number): void {
    if (!this.playing || this.completed || !this.everyoneConnected || this.localSeat === null) return;
    const now = performance.now();
    if (now - this.lastInput < 50) return;
    this.lastInput = now;
    const msg = { t: 'pose' as const, x: Math.max(0, Math.min(this.level <= 2 ? FOREST_WIDTH : 1200, x)),
      y: Math.max(0, Math.min(700, y)), vx, vy };
    if (!finite(x) || !finite(y) || !finite(vx) || !finite(vy)) return;
    if (this.level === 1 && (this.forest.restartAt > 0 || this.forest.supporting[this.localSeat] !== null)) return;
    if (this.level === 2 && (this.journey.restartAt > 0 || this.journey.supporting[this.localSeat]!==null)) return;
    if (this.isHost) this.poses[this.localSeat] = { seat: this.localSeat, ...msg };
    else this.message(this.hostConn, msg);
  }
  act(action: PuzzleAction): void {
    if (!this.playing || this.completed || !this.everyoneConnected || this.localSeat === null || !validAction(action)) return;
    const now = performance.now();
    const key = action.kind;
    const minInterval = key === 'collect' ? 140 : 90;
    if (now - (this.lastAction.get(key) ?? -10000) < minInterval) return;
    this.lastAction.set(key, now);
    if (this.isHost) this.hostAction(this.isSolo ? this.localSeat : 0, action);
    else this.message(this.hostConn, { t: 'act', action });
  }
  private hostAction(seat: Seat, action: PuzzleAction): void {
    if (!this.isHost || !this.playing || !this.everyoneConnected) return;
    // O puzzle continua na autoridade original. A animação é um evento leve,
    // independente do acerto (a pedra também precisa aparecer quando erra).
    if (this.level === 1) {
      if (this.forestAuthority.act(seat, action, this.poses)) {
        this.shareForest();
        if (this.authority.world.unlocked[0] !== this.forest.unlocked) {
          this.authority.world.unlocked=[this.forest.unlocked,true,true];
          this.sharePuzzle();
        }
      }
    } else if (this.level === 2) {
      if (this.journeyAuthority.act(seat,action,this.poses,this.puzzle.unlocked))this.shareJourney();
    } else if (this.chapterAuthority.act(seat, action, this.poses, this.puzzle.unlocked)) this.shareChapter();

    const effect = this.effectGate.accept(
      seat, this.level, action, this.poses[seat], this.puzzle.unlocked, performance.now()
    );
    if (!effect) return;
    // Não reenvia ao jogador de origem: ele já renderizou localmente sem latência.
    // Atribuímos seat pelo DataConnection do host, nunca pelo pacote recebido.
    for (const [otherSeat, connection] of this.conns) {
      if (otherSeat !== seat) this.message(connection, { t: 'fx', fx: effect });
    }
    // O host já animou suas próprias habilidades; convidados animam no host aqui.
    if (seat !== 0 && !this.isSolo) this.emit('effect', effect);
  }
  private shareForest(): void {
    this.forest={...this.forestAuthority.world,
      health:[...this.forestAuthority.world.health] as ForestWorld['health'],
      safeUntil:[...this.forestAuthority.world.safeUntil] as ForestWorld['safeUntil'],
      supporting:[...this.forestAuthority.world.supporting] as ForestWorld['supporting'],
      vines:[...this.forestAuthority.world.vines] as ForestWorld['vines'],
      treeSteps:[...this.forestAuthority.world.treeSteps] as ForestWorld['treeSteps']
    };
    this.broadcast({t:'forest',world:this.forest});
    this.emit('forest',this.forest);
    this.emit('change',undefined);
  }
  private sharePuzzle(): void {
    this.puzzle = { ...this.authority.world, unlocked: [...this.authority.world.unlocked] as WorldState['unlocked'] };
    this.broadcast({ t: 'puzzle', world: this.puzzle });
    this.emit('puzzle', this.puzzle);
    this.emit('change', undefined);
  }
  private shareJourney(): void {
    const w=this.journeyAuthority.world;
    this.journey={...w,
      materials:[...w.materials] as JourneyWorld['materials'],
      supporting:[...w.supporting] as JourneyWorld['supporting'],
      health:[...w.health] as JourneyWorld['health'],
      safeUntil:[...w.safeUntil] as JourneyWorld['safeUntil']};
    this.broadcast({t:'journey',world:this.journey});
    this.emit('journey',this.journey);
    this.emit('change',undefined);
  }
  private shareRiver(): void {
    this.river = { ...this.riverAuthority.world };
    this.broadcast({ t: 'river', world: this.river });
    this.emit('river', this.river);
    this.emit('change', undefined);
  }
  private shareChapter(): void {
    this.chapter = { ...this.chapterAuthority.world };
    this.broadcast({ t: 'chapter', world: this.chapter });
    this.emit('chapter', this.chapter);
    this.emit('change', undefined);
  }
  private hostTick(): void {
    if (!this.isHost || !this.everyoneConnected) return;
    if (this.stage === 'intro') {
      if (Date.now() >= this.phaseUntil) this.finishIntro();
      return;
    }
    if (this.stage === 'transition') {
      if (Date.now() >= this.phaseUntil) this.advanceLevel();
      return;
    }
    if (!this.playing || this.completed) return;
    if (this.level === 1) {
      const now=Date.now();
      const result=this.forestAuthority.tick(this.poses,now);
      if(result.reset){
        this.authority.world.unlocked=[false,true,true];this.sharePuzzle();
        this.poses=FOREST_SPAWNS.map(p=>({...p}));
        for(const pose of this.poses){this.broadcast({t:'respawn',pose});this.emit('respawn',pose);}
      }
      if(this.forestAuthority.world.restartAt===0){
        for(const pose of this.poses){
          if(pose.y>=690){
            if(this.forestAuthority.damage(pose.seat,now,true))this.shareForest();
          }else{
            const danger=forestDanger(pose.x,pose.y,this.forestAuthority.world.hazardEpoch,now);
            if(danger && this.forestAuthority.damage(pose.seat,now))this.shareForest();
          }
        }
      }
      if(result.changed)this.shareForest();
    } else if (this.level === 2) {
      const now=Date.now();
      const result=this.journeyAuthority.tick(this.poses,now);
      if(result.reset){
        this.poses=JOURNEY_SPAWNS.map(p=>({...p}));
        for(const pose of this.poses){this.broadcast({t:'respawn',pose});this.emit('respawn',pose);}
      }
      if(this.journeyAuthority.world.restartAt===0){
        for(const pose of this.poses){
          if(pose.y>=690){
            if(this.journeyAuthority.damage(pose.seat,now,true))this.shareJourney();
          }else if(journeyDanger(pose,this.journeyAuthority.world.hazardEpoch,now)){
            if(this.journeyAuthority.damage(pose.seat,now))this.shareJourney();
          }
        }
      }
      if(result.changed)this.shareJourney();
      if(now-this.lastJourneyMotionBroadcast>=140){
        this.lastJourneyMotionBroadcast=now;
        this.journeyMotion={logs:floatingLogs(now,this.journeyAuthority.world.hazardEpoch),now};
        this.broadcast({t:'journey-motion',motion:this.journeyMotion});
        this.emit('journey-motion',this.journeyMotion);
      }
    } else {
      const now = Date.now();
      const result = this.chapterAuthority.tick(this.poses, now);
      if (result.changed) this.shareChapter();
      if (this.level === 3) {
        this.jaguar = { ...this.chapterAuthority.jaguar };
        if (now - this.lastHazardBroadcast >= 140) {
          this.lastHazardBroadcast = now;
          this.broadcast({t:'hazard',jaguar:this.jaguar});
          this.emit('hazard',this.jaguar);
        }
        if(this.isSolo && result.hits.length>0){
          this.restartSolo();return;
        }
        for (const seat of result.hits) this.respawn(seat);
      }
      if (this.level === 4) {
        // Caminho falso marcado pela placa VOLTE; salte a trilha enganosa.
        for (const pose of this.poses) {
          if (pose.x >= 425 && pose.x <= 485 && pose.y >= 594 && this.chapterAuthority.world.level === 4
              && this.chapterAuthority.world.checkpoint < 2) {
              if(this.isSolo){this.restartSolo();return;}
              this.respawn(pose.seat);
            }
        }
      }
    }
    if(this.level>=3){
      for(const pose of this.poses){
        if(pose.y>=695){
          if(this.isSolo){this.restartSolo();return;}
          this.respawn(pose.seat);
        }
      }
    }
    this.broadcast({ t: 'state', poses: this.poses });
    this.emit('snapshot', this.poses);
    const passed = this.level === 1 ? this.forestAuthority.hasWon(this.poses)
      : this.level === 2 ? this.journeyAuthority.hasWon(this.poses)
      : this.chapterAuthority.hasWon(this.poses);
    if (passed) {
      if (this.level === 4) this.setPhase('final', 4);
      else this.setPhase('transition', this.level, Date.now() + 2800);
    }
  }
  private respawn(seat: Seat): void {
    const p = this.poses[seat];
    if (!p) return;
    const checkpoints = this.level === 1 ? CHECKPOINTS
      : this.level === 2 ? JOURNEY_CHECKPOINTS : LATE_CHECKPOINTS;
    const index = this.level === 1 ? this.puzzle.checkpoint
      : this.level === 2 ? this.journey.checkpoint : this.chapter.checkpoint;
    const pose: Pose = { seat, x: (checkpoints[index] ?? checkpoints[0]) + seat * 18, y: 567, vx: 0, vy: 0 };
    if (p.x === pose.x && p.y === pose.y) return;
    this.poses[seat] = pose;
    this.broadcast({t:'respawn',pose});
    this.emit('respawn',pose);
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
    this.journeyAuthority.solo=false;this.chapterAuthority.solo=false;
    this.players = slots(); this.poses = SPAWNS.map(p => ({ ...p }));
    this.playing = false; this.completed = false;
    this.stage = 'lobby'; this.level = 1; this.phaseSince = 0; this.phaseUntil = 0;
    this.riverAuthority.reset(); this.river = initialRiver();
    this.journeyAuthority.reset();this.journey=initialJourney();this.journeyMotion={logs:[3086,3224],now:0};this.lastJourneyMotionBroadcast=0;
    this.chapterAuthority.reset(3);this.chapter=initialEyes();this.jaguar=defaultJaguar();this.lastHazardBroadcast=0;
    this.forestAuthority.reset();this.forest=initialForest();
    this.authority.reset(); this.puzzle = initialWorld(); this.lastAction.clear(); this.effectGate.reset(); this.pendingRestore = false;
    this.tokens = [null, null, null]; this.lastInput = 0; this.lastReceived = [0, 0, 0];
    this.emit('change', undefined);
  }
}
