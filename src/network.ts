import Peer, { type DataConnection } from 'peerjs';
import {multiplayerPoseBounds} from './multiplayerPoseBounds';
import { PuzzleAuthority, initialWorld, validWorld, validAction, CHECKPOINTS, type WorldState, type PuzzleAction } from './puzzles';
import { RiverAuthority, initialRiver, validRiver, RIVER_CHECKPOINTS, RIVER_SPAWNS, type RiverWorld } from './river';
import { SkillFxGate, validSkillFx, type SkillFx } from './effects';
import { ChapterAuthority, initialEyes, initialTrail, defaultJaguar, validChapter, validJaguar, LATE_SPAWNS, LATE_CHECKPOINTS, type ChapterWorld, type Jaguar, type LateLevel } from './chapters';
import { nextPlayableLevel } from './levels';
import { JourneyAuthority, initialJourney, validJourney, floatingLogs, validMotion, journeyDanger, JOURNEY_SPAWNS, JOURNEY_CHECKPOINTS, RIVER_WIDTH, type JourneyWorld, type JourneyMotion } from './riverJourney';
import { ForestAuthority, FOREST_WIDTH, FOREST_SPAWNS, FOREST_CHECKPOINTS, forestDanger, validForest, initialForest, type ForestWorld } from './forest';
import { LoopAuthority, LOOP_START, LOOP_WIDTH, SUSPENSION, validLoop, initLoop, blackoutActive, suspensionLeverStatus, type SuspensionLeverReason, type LoopWorld } from './forestLoop';
import { type VitalAction } from './loopVitals';
import {FallTracker,loopFallSurfaces,temporalFallSurfaces} from './fallDamage';
import {SUMMIT_BRANCH} from './forestLoop';
import {TemporalAuthority,TEMP_WIDTH,TEMP_START,initTemporal,validTemporal,type TemporalWorld} from './temporalForest';
import {TreeAuthority,TREE_START,TREE_WIDTH,TREE_HEIGHT,initTree,validTree,type TreeWorld} from './treetopForest';
import {FireAuthority,FIRE_START,FIRE_WIDTH,FIRE_HEIGHT,initFire,validFire,type FireWorld} from './burningForest';

export type Stage = 'lobby' | 'intro' | 'playing' | 'transition' | 'final';
export type Experience = 'classic' | 'loop';
export type Level = 1 | 2 | 3 | 4;
export type PhaseInfo = { stage: Stage; level: Level; since: number; until: number; mode?: Experience };

export type Seat = 0 | 1 | 2;
/** Safety net for failed or stalled video loads; never the normal end of the cutscene. */
export const INTRO_WATCHDOG_MS=180_000;
export type Slot = { seat: Seat; online: boolean; ready: boolean };
export type Pose = { seat: Seat; x: number; y: number; vx: number; vy: number };
type Wire =
  | { t: 'hello'; token: string }
  | { t: 'ready'; value: boolean }
  | { t: 'pose'; x: number; y: number; vx: number; vy: number }
  | { t: 'welcome'; seat: Seat; code: string; mode?: Experience }
  | { t: 'roster'; players: Slot[]; playing: boolean }
  | { t: 'begin' }
  | { t: 'state'; poses: Pose[] }
  | { t: 'act'; action: PuzzleAction }
  | { t: 'loop-lever-reply'; ok:boolean;reason:SuspensionLeverReason }
  | { t: 'vital-action'; id:number; kind:VitalAction; facing:-1|1 }
  | { t: 'vital-reply'; id:number; kind:VitalAction; ok:boolean; reason:'ok'|'tired'|'cooldown'|'invalid' }
  | { t: 'fx'; fx: SkillFx }
  | { t: 'puzzle'; world: WorldState }
  | { t: 'forest'; world: ForestWorld }
  | { t: 'loop'; world: LoopWorld }
  | { t: 'temporal'; world: TemporalWorld }
  | { t: 'treetop'; world: TreeWorld }
  | { t: 'fire'; world: FireWorld }
  | { t: 'respawn'; pose: Pose }
  | { t: 'river'; world: RiverWorld }
  | { t: 'journey'; world: JourneyWorld }
  | { t: 'journey-motion'; motion: JourneyMotion }
  | { t: 'chapter'; world: ChapterWorld }
  | { t: 'hazard'; jaguar: Jaguar }
  | { t: 'phase'; info: PhaseInfo }
  | { t: 'intro-done' }
  | { t: 'final-done' }
  | { t: 'final-finished' }
  | { t: 'win' }
  | { t: 'reject'; reason: string }
  | { t: 'closed' };

type Events = {
  change: undefined;
  notice: string;
  start: undefined;
  snapshot: Pose[];
  effect: SkillFx;
  'vital-reply': { id:number;kind:VitalAction;ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid' };
  'loop-lever-reply': {ok:boolean;reason:SuspensionLeverReason};
  puzzle: WorldState;
  forest: ForestWorld;
  loop: LoopWorld;
  temporal: TemporalWorld;
  treetop: TreeWorld;
  fire: FireWorld;
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
    && p.x >= 0 && p.x <= Math.max(FOREST_WIDTH,TREE_WIDTH,FIRE_WIDTH,LOOP_WIDTH) && p.y >= 0 && p.y <= TREE_HEIGHT
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
      && p.x >= 0 && p.x <= Math.max(FOREST_WIDTH,TREE_WIDTH,FIRE_WIDTH,LOOP_WIDTH) && p.y >= 0 && p.y <= TREE_HEIGHT
      && Math.abs(p.vx) <= 1200 && Math.abs(p.vy) <= 1500 ? value as Wire : null;
    case 'welcome': return seatValid(p.seat) && typeof p.code === 'string' && /^[A-Z0-9]{6}$/.test(p.code)
      && (p.mode === undefined || p.mode === 'classic' || p.mode === 'loop') ? value as Wire : null;
    case 'roster': return Array.isArray(p.players) && p.players.length === 3 && p.players.every(validSlot)
      && p.players.every((s: Slot, i: number) => s.seat === i) && typeof p.playing === 'boolean' ? value as Wire : null;
    case 'state': return Array.isArray(p.poses) && p.poses.length === 3 && p.poses.every(validPose)
      && p.poses.every((pose: Pose, i: number) => pose.seat === i) ? value as Wire : null;
    case 'act': return validAction(p.action) ? value as Wire : null;
    case 'loop-lever-reply':return typeof p.ok==='boolean'&&
      ['ready','route','finished','moving','closer','tower','detach','climb','branch','steady'].includes(String(p.reason))?value as Wire:null;
    case 'vital-action':return Number.isInteger(p.id)&&Number(p.id)>0&&Number(p.id)<1000000000
      &&['jump','doubleJump','shoot','dash'].includes(String(p.kind))&&[1,-1].includes(Number(p.facing))
      ?value as Wire:null;
    case 'vital-reply':return Number.isInteger(p.id)&&Number(p.id)>0
      &&['jump','doubleJump','shoot','dash'].includes(String(p.kind))&&typeof p.ok==='boolean'
      &&['ok','tired','cooldown','invalid'].includes(String(p.reason))?value as Wire:null;
    case 'fx': return validSkillFx(p.fx) ? value as Wire : null;
    case 'puzzle': return validWorld(p.world) ? value as Wire : null;
    case 'forest': return validForest(p.world) ? value as Wire : null;
    case 'loop': return validLoop(p.world) ? value as Wire : null;
    case 'temporal': return validTemporal(p.world) ? value as Wire : null;
    case 'treetop': return validTree(p.world) ? value as Wire : null;
    case 'fire': return validFire(p.world) ? value as Wire : null;
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
        && i.since >= 0 && i.until >= 0
        && (i.mode === undefined || i.mode === 'classic' || i.mode === 'loop') ? value as Wire : null;
    }
    case 'intro-done': case 'final-done': case 'final-finished': return value as Wire;
    case 'reject': return typeof p.reason === 'string' && p.reason.length <= 130 ? value as Wire : null;
    case 'begin': case 'win': case 'closed': return value as Wire;
    default: return null;
  }
}

/** Estrela: convidados conectam somente ao anfitrião; anfitrião retransmite estados a 20Hz. */
export class Network {
  role: 'idle' | 'host' | 'guest' | 'solo' = 'idle';
  code = '';
  experience: Experience = 'classic';
  loop:LoopWorld=initLoop();
  private loopAuthority=new LoopAuthority();
  temporal:TemporalWorld=initTemporal();
  private temporalAuthority=new TemporalAuthority();
  treetop:TreeWorld=initTree();
  private treetopAuthority=new TreeAuthority();
  fire:FireWorld=initFire();
  private fireAuthority=new FireAuthority();
  private fireSafeUntil=0;
  private treetopSafeUntil=0;
  localSeat: Seat | null = null;
  players: Slot[] = slots();
  poses: Pose[] = SPAWNS.map(p => ({ ...p }));
  playing = false;
  completed = false;
  /** Final cinematic is presentation state only, separate from gameplay victory. */
  endingComplete = false;
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
  /** Completed playback or manually skipped, per authoritative multiplayer seat. */
  private introDone = new Set<Seat>();
  private endingDone = new Set<Seat>();
  private effectGate = new SkillFxGate();
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private conns = new Map<Seat, DataConnection>();
  private tokens: (string | null)[] = [null, null, null];
  private grace = new Map<Seat, ReturnType<typeof setTimeout>>();
  private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setInterval> | null = null;
  private fallTracker=new FallTracker();
  private vitalityRequestId=0;
  private lastVitalRequestIds:[number,number,number]=[0,0,0];
  private lastInput = 0;
  private lastReceived: number[] = [0, 0, 0];
  private sessionToken = '';
  private reconnectDeadline = 0;
  private shuttingDown = false;
  private sessionEpoch=0;
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
  startSolo(level: Level = 1, showIntro = false, mode:Experience = 'classic'): void {
    this.shutdown();
    this.shuttingDown=false;
    this.role='solo';this.code='SOLO';this.experience=mode;this.localSeat=0;
    this.fallTracker.reset();
    this.loopAuthority.reset();this.loop=this.loopAuthority.world;
    this.temporalAuthority.reset();this.temporal=this.temporalAuthority.world;
    this.treetopAuthority.reset();this.treetop=this.treetopAuthority.world;this.treetopSafeUntil=Date.now()+1300;
    this.fireAuthority.reset();this.fire=this.fireAuthority.world;this.fireSafeUntil=Date.now()+1300;
    this.players=([0,1,2] as Seat[]).map(seat=>({seat,online:true,ready:true}));
    this.authority.reset();this.effectGate.reset();
    this.forestAuthority.reset();this.forest=this.forestAuthority.world;
    this.journeyAuthority.reset();this.journey=this.journeyAuthority.world;
    this.chapterAuthority.reset(level>=3?level as LateLevel:3);
    this.chapter={...this.chapterAuthority.world};this.jaguar={...this.chapterAuthority.jaguar};
    this.puzzle=initialWorld();
    this.authority.world.unlocked=[level!==1 || mode==='loop',true,true];
    this.puzzle={...this.authority.world,unlocked:[...this.authority.world.unlocked] as WorldState['unlocked']};
    this.poses=(mode==='loop'?(level===4?FIRE_START:level===3?TREE_START:level===2?TEMP_START:LOOP_START):level===1?FOREST_SPAWNS:level===2?JOURNEY_SPAWNS:LATE_SPAWNS).map(p=>({...p}));
    this.journeyMotion={logs:floatingLogs(Date.now(),this.journey.hazardEpoch),now:Date.now()};
    this.journeyAuthority.solo=true;this.chapterAuthority.solo=true;
    this.heartbeat=setInterval(()=>this.hostTick(),50);
    this.setPhase(showIntro&&level===1?'intro':'playing',level,
      showIntro&&level===1?Date.now()+INTRO_WATCHDOG_MS:0);
  }
  startLoopSolo():void{this.startSolo(1,false,'loop');}
  startTemporalSolo():void{this.startSolo(2,false,'loop');}
  startTreetopSolo():void{this.startSolo(3,false,'loop');}
  startFireSolo():void{this.startSolo(4,false,'loop');}
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
      const p={...input,y:Math.max(0,Math.min(this.experience==='loop'&&this.level===4?FIRE_HEIGHT:
        this.experience==='loop'&&this.level===3?TREE_HEIGHT:700,input.y))};
      if(!validPose(p))continue;
      const supporting=this.experience==='loop'?(this.level===4?this.fire.supporting:this.level===3?this.treetop.supporting:this.level===2?this.temporal.supporting:this.loop.supporting):this.level===1?this.forest.supporting:
        this.level===2?this.journey.supporting:null;
      if(supporting?.[p.seat]!==null && supporting?.[p.seat]!==undefined)continue;
      this.poses[p.seat]={...p};
    }
  }
  restartSolo():void {
    if(!this.isSolo||!this.playing)return;
    this.fallTracker.reset();
    if(this.experience==='loop'){
      if(this.level===4){
        this.fireAuthority.reset();this.shareFire();this.poses=FIRE_START.map(p=>({...p}));
        this.fireSafeUntil=Date.now()+1300;
        this.emit('notice','FLORESTA EM CHAMAS REINICIADA: A EQUIPE RETORNOU À ENTRADA.');
      }else if(this.level===3){
        this.treetopAuthority.reset();this.shareTreetop();this.poses=TREE_START.map(p=>({...p}));
        this.treetopSafeUntil=Date.now()+1300;
        this.emit('notice','CAMINHO DAS ÁRVORES REINICIADO: OS TRÊS RETORNARAM À COPA INICIAL.');
      }else if(this.level===2){
        this.temporalAuthority.reset();this.shareTemporal();
        this.poses=TEMP_START.map(p=>({...p}));
        this.emit('notice','FLORESTA TEMPORAL REINICIADA: OS TRÊS RETORNARAM À CLAREIRA.');
      }else{
        this.loopAuthority.reset();this.shareLoop();
        this.poses=LOOP_START.map(p=>({...p}));
        this.emit('notice','TENTATIVA REINICIADA. A FLORESTA RETORNOU AO ESTADO A.');
      }
      for(const pose of this.poses)this.emit('respawn',pose);
      this.emit('snapshot',this.poses);
      return;
    }
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
  async createRoom(mode:Experience='classic'): Promise<void> {
    this.shutdown();
    this.experience=mode;
    this.shuttingDown = false;
    const epoch=this.sessionEpoch;
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
        if(this.sessionEpoch!==epoch || this.role!=='host'||this.shuttingDown){peer.destroy();return;}
        this.peer = peer;
        this.code = code; // Somente depois do evento open do servidor de sinalização.
        peer.on('connection',conn=>{
          if(this.sessionEpoch!==epoch||this.peer!==peer||this.shuttingDown||this.role!=='host'){
            conn.close();return;
          }
          this.acceptConnection(conn);
        });
        peer.on('error',err=>{
          if(this.sessionEpoch!==epoch||this.peer!==peer||this.shuttingDown||this.role!=='host')return;
          this.emit('notice',this.peerError(err));
        });
        peer.on('disconnected',()=>{
          if(this.sessionEpoch!==epoch||this.peer!==peer||this.shuttingDown||this.role!=='host')return;
          this.emit('notice','Sinalização interrompida. Tentando reconectar...');
          if(!peer.destroyed)peer.reconnect();
        });
        this.heartbeat = setInterval(() => this.hostTick(), 50);
        this.updateRoster();
        return;
      } catch (e) {
        if(this.sessionEpoch!==epoch || this.shuttingDown||this.role!=='host')return;
        const error = e as Error & { type?: string };
        if (error.type === 'unavailable-id') continue;
        this.emit('notice', this.peerError(error));
        return;
      }
    }
    if(this.sessionEpoch===epoch&&!this.shuttingDown&&this.role==='host')
      this.emit('notice','Não foi possível obter um código livre. Tente novamente.');
  }
  joinRoom(rawCode: string): void {
    const code = rawCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      this.emit('notice', 'Digite os 6 caracteres da sala.'); return;
    }
    this.shutdown();
    this.shuttingDown = false;
    const epoch=this.sessionEpoch;
    this.role = 'guest'; this.code = code;
    try {
      this.sessionToken = sessionStorage.getItem('afm-' + code) || newToken();
      sessionStorage.setItem('afm-' + code, this.sessionToken);
    } catch { this.sessionToken = newToken(); }
    this.emit('change', undefined);
    const peer = new Peer();
    this.peer = peer;
    peer.on('open',()=>{if(this.sessionEpoch===epoch&&this.peer===peer&&!this.shuttingDown&&this.role==='guest')this.connectHost();});
    peer.on('error', err => {
      if(this.sessionEpoch!==epoch||this.peer!==peer||this.shuttingDown||this.role!=='guest')return;
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
      if(this.sessionEpoch!==epoch||this.peer!==peer||this.shuttingDown||this.role!=='guest')return;
      this.emit('notice', 'Sem sinalização. Tentando restabelecer conexão...');
      if (!peer.destroyed) peer.reconnect();
    });
  }
  private connectHost(): void {
    if (!this.peer || this.shuttingDown || this.role !== 'guest') return;
    if (this.hostConn?.open) return;
    const conn = this.peer.connect(roomId(this.code), { reliable: true, serialization: 'json' });
    this.hostConn = conn;
    const epoch=this.sessionEpoch;
    const valid=()=>!this.shuttingDown&&this.role==='guest'&&this.hostConn===conn&&this.sessionEpoch===epoch;
    const timeout = setTimeout(() => {
      if (!valid())return;
      if (!conn.open) {
        conn.close();
        if (this.localSeat === null) this.emit('notice', 'Não foi possível conectar. Sala inexistente, bloqueio WebRTC ou rede indisponível.');
      }
    }, 10000);
    conn.on('open', () => {
      clearTimeout(timeout);
      if(!valid())return;
      this.stopReconnect();
      this.message(conn, { t: 'hello', token: this.sessionToken });
    });
    conn.on('data', raw => this.guestReceive(conn, raw));
    conn.on('close', () => {
      clearTimeout(timeout);
      if (!valid()) return;
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
      if(!valid())return;
      if (this.localSeat === null) this.emit('notice', 'Erro na conexão WebRTC. Confira a rede ou tente outro navegador.');
    });
  }
  private acceptConnection(conn: DataConnection): void {
    if (this.shuttingDown||this.role !== 'host') { conn.close(); return; }
    let seat: Seat | null = null;
    const timeout = setTimeout(() => { if (seat === null) conn.close(); }, 6000);
    conn.on('data', raw => {
      if(this.shuttingDown||this.role!=='host')return;
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
        this.message(conn, { t: 'welcome', seat, code: this.code, mode:this.experience });
        this.updateRoster();
        this.message(conn, { t: 'puzzle', world: this.puzzle });
        this.message(conn, { t: 'forest', world: this.forest });
        this.message(conn, { t: 'loop', world: this.loop });
        this.message(conn, {t:'temporal',world:this.temporal});
        this.message(conn, {t:'treetop',world:this.treetop});
        this.message(conn, {t:'fire',world:this.fire});
        this.message(conn, { t: 'river', world: this.river });
        this.message(conn, { t: 'journey', world: this.journey });
        this.message(conn, { t: 'journey-motion', motion: this.journeyMotion });
        this.message(conn, { t: 'chapter', world: this.chapter });
        this.message(conn, { t: 'hazard', jaguar: this.jaguar });
        this.message(conn, { t: 'phase', info: this.phaseInfo() });
        if(this.stage==='final'&&this.level===4&&this.endingComplete)
          this.message(conn,{t:'final-finished'});
        if (this.stage !== 'lobby') this.message(conn, { t: 'state', poses: this.poses });
        return;
      }
      if (this.conns.get(seat) !== conn) return;
      if (msg.t === 'ready' && !this.playing) {
        this.players[seat].ready = msg.value;
        this.updateRoster();
      }
      // Guests can report that playback naturally ended, but cannot skip
      // the prologue or force the room to enter gameplay.
      if (msg.t === 'intro-done' && this.stage === 'intro' && this.everyoneConnected) {
        this.introDone.add(seat);
        this.tryFinishIntro();
      }
      // A guest may only confirm natural playback; the host owns the skip.
      if (msg.t === 'final-done' && this.stage === 'final' && this.level===4 &&
          this.experience==='loop' && this.everyoneConnected) {
        this.endingDone.add(seat);
        this.tryFinishEndingVideo();
      }
      if (msg.t === 'act' && this.playing && this.everyoneConnected) {
        this.hostAction(seat, msg.action);
      }
      if(msg.t==='vital-action'&&this.experience==='loop'&&this.playing&&this.everyoneConnected){
        const repeat=msg.id<=this.lastVitalRequestIds[seat];
        if(!repeat)this.lastVitalRequestIds[seat]=msg.id;
        const result=repeat?{ok:false as const,reason:'invalid' as const}:
          this.approveVital(seat,msg.kind,msg.facing);
        this.message(conn,{t:'vital-reply',id:msg.id,kind:msg.kind,...result});
      }
      if (msg.t === 'pose' && this.playing && this.everyoneConnected) {
        const now = performance.now();
        if (now - this.lastReceived[seat] < 35) return; // ~28 Hz no máximo por convidado.
        this.lastReceived[seat] = now;
        // The host must use the SAME world limits as the guest. Previously
        // level 1 of the new adventure fell back to FOREST_WIDTH (4300),
        // silently rejecting/clamping guests spawned around x=5600.
        const bounds=multiplayerPoseBounds(this.experience,this.level);
        if(msg.x<0||msg.x>bounds.width||msg.y<0||msg.y>bounds.height)return;
        if (this.experience!=='loop' && this.level === 1 && this.forest.restartAt > 0) return;
        if(this.experience==='loop'&&(this.level===4?this.fire.supporting[seat]:this.level===3?this.treetop.supporting[seat]:this.level===2?this.temporal.supporting[seat]:this.loop.supporting[seat])!==null)return;
        if (this.experience!=='loop' && this.level === 1 && this.forest.supporting[seat] !== null) return;
        if (this.experience!=='loop' && this.level === 2 && (this.journey.restartAt>0 || this.journey.supporting[seat]!==null)) return;
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
      if(this.shuttingDown||this.role!=='host'||seat===null||this.conns.get(seat)!==conn)return;
      this.emit('notice', 'Erro na conexão com um dos convidados.');
    });
  }
  private guestReceive(conn: DataConnection, raw: unknown): void {
    if (conn !== this.hostConn || this.shuttingDown || this.role!=='guest') return;
    const msg = parseWire(raw);
    if (!msg) return;
    switch (msg.t) {
      case 'welcome':
        if (msg.code !== this.code) return;
        this.pendingRestore = this.playing && this.localSeat === msg.seat;
        this.localSeat = msg.seat;
        this.experience=msg.mode??'classic';
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
        this.experience=msg.info.mode??this.experience;
        if(oldStage!==this.stage||oldLevel!==this.level)this.endingComplete=false;
        this.phaseSince = msg.info.since; this.phaseUntil = msg.info.until;
        this.playing = this.stage === 'playing'; this.completed = this.stage === 'final';
        if (this.stage === 'playing') this.pendingRestore = true;
        if (oldLevel !== this.level || (this.experience==='loop'&&oldStage!=='playing'&&this.stage==='playing'))
          this.poses = (this.experience==='loop'?(this.level===4?FIRE_START:this.level===3?TREE_START:this.level===2?TEMP_START:LOOP_START):this.level === 1 ? FOREST_SPAWNS : this.level === 2 ? JOURNEY_SPAWNS : LATE_SPAWNS).map(p => ({ ...p }));
        this.emit('phase', this.phaseInfo());
        if (this.playing && (oldStage !== 'playing' || oldLevel !== this.level)) this.emit('start', undefined);
        this.emit('change', undefined);
        break;
      }
      case 'final-finished':
        if(this.stage==='final'&&this.level===4&&this.experience==='loop'&&!this.endingComplete){
          this.endingComplete=true;
          this.emit('change',undefined);
        }
        break;
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
      case 'loop-lever-reply':
        if(this.playing&&this.experience==='loop'&&this.level===1&&this.localSeat===0)
          this.emit('loop-lever-reply',{ok:msg.ok,reason:msg.reason});
        break;
      case 'vital-reply':
        if(this.playing&&this.experience==='loop')this.emit('vital-reply',{
          id:msg.id,kind:msg.kind,ok:msg.ok,reason:msg.reason
        });
        break;
      case 'fx':
        // Apenas a DataConnection autenticada do anfitrião chega a este handler.
        // O originador não recebe o mesmo efeito, evitando duplicação local.
        if (this.playing && msg.fx.level === this.level && msg.fx.seat !== this.localSeat) {
          this.emit('effect', msg.fx);
        }
        break;
      case 'fire':
        this.fire={...msg.world,log:[...msg.world.log] as FireWorld['log'],
          smoke:[...msg.world.smoke] as FireWorld['smoke'],
          tree:[...msg.world.tree] as FireWorld['tree'],
          smokeSeconds:[...msg.world.smokeSeconds] as FireWorld['smokeSeconds'],
          supporting:[...msg.world.supporting] as FireWorld['supporting'],
          dashAt:[...msg.world.dashAt] as FireWorld['dashAt'],
          dashX:[...msg.world.dashX] as FireWorld['dashX'],
          health:[...msg.world.health] as FireWorld['health'],
          stamina:[...msg.world.stamina] as FireWorld['stamina'],
          safeUntil:[...msg.world.safeUntil] as FireWorld['safeUntil'],
          lastSpent:[...msg.world.lastSpent] as FireWorld['lastSpent']};
        this.emit('fire',this.fire);
        break;
      case 'treetop':
        this.treetop={...msg.world,bridge:[...msg.world.bridge] as TreeWorld['bridge'],
          tower:[...msg.world.tower] as TreeWorld['tower'],time:[...msg.world.time] as TreeWorld['time'],
          supporting:[...msg.world.supporting] as TreeWorld['supporting'],
          health:[...msg.world.health] as TreeWorld['health'],
          stamina:[...msg.world.stamina] as TreeWorld['stamina'],
          safeUntil:[...msg.world.safeUntil] as TreeWorld['safeUntil'],
          lastSpent:[...msg.world.lastSpent] as TreeWorld['lastSpent']};
        this.emit('treetop',this.treetop);
        break;
      case 'temporal':
        this.temporal={...msg.world,echo:[...msg.world.echo] as TemporalWorld['echo'],
          tree:[...msg.world.tree] as TemporalWorld['tree'],
          roots:[...msg.world.roots] as TemporalWorld['roots'],
          supporting:[...msg.world.supporting] as TemporalWorld['supporting'],
          skillAt:[...msg.world.skillAt] as TemporalWorld['skillAt'],
          health:[...msg.world.health] as TemporalWorld['health'],
          stamina:[...msg.world.stamina] as TemporalWorld['stamina'],
          safeUntil:[...msg.world.safeUntil] as TemporalWorld['safeUntil'],
          lastSpent:[...msg.world.lastSpent] as TemporalWorld['lastSpent']};
        this.emit('temporal',this.temporal);
        break;
      case 'loop':
        this.loop={...msg.world,marks:[...msg.world.marks] as LoopWorld['marks'],suspended:[...msg.world.suspended] as LoopWorld['suspended'],tree:[...msg.world.tree] as LoopWorld['tree'],final:[...msg.world.final] as LoopWorld['final'],supporting:[...msg.world.supporting] as LoopWorld['supporting'],health:[...msg.world.health] as LoopWorld['health'],stamina:[...msg.world.stamina] as LoopWorld['stamina'],safeUntil:[...msg.world.safeUntil] as LoopWorld['safeUntil'],lastSpent:[...msg.world.lastSpent] as LoopWorld['lastSpent']};
        this.emit('loop',this.loop);
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
    return { stage: this.stage, level: this.level, since: this.phaseSince, until: this.phaseUntil, mode:this.experience };
  }
  private setPhase(stage: Stage, level: Level, until = 0): void {
    if(stage==='intro')this.introDone.clear();
    // Victory already happened; synchronize only the ending presentation.
    if(stage==='final'&&level===4&&this.experience==='loop'){
      this.endingComplete=false;
      this.endingDone.clear();
    }
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
    if(this.experience==='loop'){
      this.loopAuthority.reset();this.loop=this.loopAuthority.world;
      this.authority.reset();this.authority.world.unlocked=[true,true,true];this.sharePuzzle();
      this.poses=LOOP_START.map(p=>({...p}));
      this.shareLoop();
      this.setPhase('intro',1,Date.now()+INTRO_WATCHDOG_MS);
      return;
    }
    this.authority.reset(); this.riverAuthority.reset(); this.effectGate.reset();
    this.journeyAuthority.reset();this.journey=this.journeyAuthority.world;
    this.journeyMotion={logs:floatingLogs(Date.now(),this.journey.hazardEpoch),now:Date.now()};
    this.forestAuthority.reset();this.forest=this.forestAuthority.world;
    this.authority.world.unlocked=[false,true,true];
    this.chapterAuthority.reset(3); this.chapter = initialEyes(); this.jaguar = defaultJaguar();
    this.puzzle = initialWorld(); this.river = initialRiver();
    this.poses = FOREST_SPAWNS.map(p => ({ ...p }));
    this.sharePuzzle(); this.shareForest(); this.shareRiver();
    this.setPhase('intro', 1, Date.now() + INTRO_WATCHDOG_MS);
  }
  /** Only the room owner (or the local solo player) can skip for EVERYONE.
   * This is enforced here, not merely by hiding the guest's UI button.
   */
  skipIntro():void{
    if(!this.isHost||this.stage!=='intro')return;
    this.finishIntro();
  }
  /** Sent after the media element actually ends. Guests cannot request
   * a skip; their message simply tells the host playback finished.
   */
  completeIntro():void{
    if(this.stage!=='intro'||this.localSeat===null)return;
    if(this.isHost){
      this.introDone.add(this.localSeat);
      this.tryFinishIntro();
    }else this.message(this.hostConn,{t:'intro-done'});
  }
  private tryFinishIntro():void{
    if(this.isHost&&this.stage==='intro'&&this.everyoneConnected&&
      (this.isSolo||this.players.every(p=>this.introDone.has(p.seat))))this.finishIntro();
  }
  private finishIntro(): void {
    if (!this.isHost || this.stage !== 'intro' || !this.everyoneConnected) return;
    this.poses = (this.experience==='loop'?LOOP_START:FOREST_SPAWNS).map(p => ({ ...p }));
    if(this.experience==='loop'){
      // A client in 'intro' ignores state packets. Enter 'playing' first so
      // every authenticated guest accepts the authoritative central spawn.
      this.setPhase('playing',1);
      this.broadcast({t:'state',poses:this.poses});
      this.emit('snapshot',this.poses);
    }else{
      this.broadcast({ t: 'state', poses: this.poses });
      this.setPhase('playing', 1);
    }
  }
  /** Local ending video completed naturally (or media could not load).
   * Guests report only completion. They cannot end the room's cinematic.
   */
  completeEndingVideo():void{
    if(this.stage!=='final'||this.level!==4||this.experience!=='loop'||
       this.endingComplete||this.localSeat===null)return;
    if(this.isHost){
      this.endingDone.add(this.localSeat);
      this.tryFinishEndingVideo();
    }else this.message(this.hostConn,{t:'final-done'});
  }
  /** Only the host or solo player can skip the final cutscene for everyone. */
  skipEndingVideo():void{
    if(!this.isHost||this.stage!=='final'||this.level!==4||
       this.experience!=='loop'||this.endingComplete)return;
    this.finishEndingVideo();
  }
  private tryFinishEndingVideo():void{
    if(this.isHost&&this.stage==='final'&&this.level===4&&
       !this.endingComplete&&this.everyoneConnected&&
       (this.isSolo||this.players.every(p=>this.endingDone.has(p.seat))))
      this.finishEndingVideo();
  }
  private finishEndingVideo():void{
    if(!this.isHost||this.stage!=='final'||this.level!==4||
       this.experience!=='loop'||this.endingComplete||!this.everyoneConnected)return;
    this.endingComplete=true;
    this.broadcast({t:'final-finished'});
    this.emit('change',undefined);
  }
  private advanceLevel(): void {
    if (!this.isHost || this.stage !== 'transition' || !this.everyoneConnected) return;
    if(this.experience==='loop'&&this.level===3){
      this.fireAuthority.reset();this.fire=this.fireAuthority.world;
      this.fireSafeUntil=Date.now()+1800;this.poses=FIRE_START.map(p=>({...p}));
      this.shareFire();this.setPhase('playing',4);
      this.broadcast({t:'state',poses:this.poses});
      for(const pose of this.poses)this.emit('respawn',pose);
      this.emit('snapshot',this.poses);return;
    }
    if(this.experience==='loop'&&this.level===2){
      this.fallTracker.reset();this.treetopAuthority.reset();this.treetop=this.treetopAuthority.world;
      this.treetopSafeUntil=Date.now()+1800;this.poses=TREE_START.map(p=>({...p}));
      this.shareTreetop();this.setPhase('playing',3);
      this.broadcast({t:'state',poses:this.poses});
      for(const pose of this.poses)this.emit('respawn',pose);
      this.emit('snapshot',this.poses);return;
    }
    if(this.experience==='loop'&&this.level===1){
      this.fallTracker.reset();
      this.temporalAuthority.reset();this.temporal=this.temporalAuthority.world;
      this.poses=TEMP_START.map(p=>({...p}));
      this.shareTemporal();
      this.setPhase('playing',2);
      this.broadcast({t:'state',poses:this.poses});
      for(const pose of this.poses)this.emit('respawn',pose);
      this.emit('snapshot',this.poses);
      return;
    }
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
    // Report the real coordinates in each biome; never clamp the new
    // 11,400px forest to the old 4,300px map.
    const bounds=multiplayerPoseBounds(this.experience,this.level);
    const msg = { t: 'pose' as const,
      x: Math.max(0,Math.min(bounds.width,x)),
      y: Math.max(0,Math.min(bounds.height,y)),vx,vy };
    if (!finite(x) || !finite(y) || !finite(vx) || !finite(vy)) return;
    if(this.experience==='loop'&&(this.level===4?this.fire.supporting[this.localSeat]:this.level===3?this.treetop.supporting[this.localSeat]:this.level===2?this.temporal.supporting[this.localSeat]:this.loop.supporting[this.localSeat])!==null)return;
    if (this.experience!=='loop' && this.level === 1 && (this.forest.restartAt > 0 || this.forest.supporting[this.localSeat] !== null)) return;
    if (this.experience!=='loop' && this.level === 2 && (this.journey.restartAt > 0 || this.journey.supporting[this.localSeat]!==null)) return;
    if (this.isHost) this.poses[this.localSeat] = { seat: this.localSeat, ...msg };
    else this.message(this.hostConn, msg);
  }
  act(action: PuzzleAction): void {
    if (!this.playing || this.completed || !this.everyoneConnected || this.localSeat === null || !validAction(action)) return;
    const now = performance.now();
    const key = (this.experience==='loop'?this.localSeat+':':'')+action.kind;
    const minInterval = key === 'collect' ? 140 : 90;
    if (now - (this.lastAction.get(key) ?? -10000) < minInterval) return;
    this.lastAction.set(key, now);
    if (this.isHost) this.hostAction(this.isSolo ? this.localSeat : 0, action);
    else this.message(this.hostConn, { t: 'act', action });
  }
  /** Requests contain a kind, never client-authored life or stamina values. */
  requestVital(kind:VitalAction,facing:-1|1=1):number|null{
    if(this.experience!=='loop'||!this.playing||!this.everyoneConnected||
      this.localSeat===null||(this.level===4?this.fire.deadUntil>0:
      this.level===3?this.treetop.deadUntil>0||this.treetop.blackoutUntil>Date.now():
      this.level===2?this.temporal.deadUntil>0||this.temporal.blackoutUntil>Date.now():
        this.loop.deadUntil>0||blackoutActive(this.loop,Date.now())))return null;
    const id=++this.vitalityRequestId;
    if(this.isHost){
      const result=this.approveVital(this.localSeat,kind,facing);
      const epoch=this.sessionEpoch;
      queueMicrotask(()=>{
        if(this.sessionEpoch===epoch&&this.playing&&this.experience==='loop')
          this.emit('vital-reply',{id,kind,...result});
      });
    }else this.message(this.hostConn,{t:'vital-action',id,kind,facing});
    return id;
  }
  private approveVital(seat:Seat,kind:VitalAction,facing:-1|1):{
    ok:boolean;reason:'ok'|'tired'|'cooldown'|'invalid'
  }{
    const result=this.level===4?this.fireAuthority.authorizeEnergy(seat,kind,this.poses,Date.now(),facing):
      this.level===3?this.treetopAuthority.authorizeEnergy(seat,kind,this.poses,Date.now(),facing):
      this.level===2?this.temporalAuthority.authorizeEnergy(seat,kind,this.poses,Date.now(),facing):
      this.loopAuthority.authorizeEnergy(seat,kind,this.poses,Date.now(),facing);
    if(result.ok){
      if(this.level===4)this.shareFire();else if(this.level===3)this.shareTreetop();else if(this.level===2)this.shareTemporal();else this.shareLoop();
      if(kind==='shoot'||kind==='dash')this.emitSkillFx(seat,{kind:kind==='shoot'?'shoot':'dash',facing});
    }
    return result;
  }
  private emitSkillFx(seat:Seat,action:PuzzleAction):void{
    const effect=this.effectGate.accept(seat,this.level,action,this.poses[seat],
      this.puzzle.unlocked,performance.now());
    if(!effect)return;
    for(const [otherSeat,connection] of this.conns){
      if(otherSeat!==seat)this.message(connection,{t:'fx',fx:effect});
    }
    if(seat!==0&&!this.isSolo)this.emit('effect',effect);
  }
  private hostAction(seat: Seat, action: PuzzleAction): void {
    if (!this.isHost || !this.playing || !this.everyoneConnected) return;
    if(this.experience==='loop'&&(action.kind==='shoot'||action.kind==='dash'))return;
    // O puzzle continua na autoridade original. A animação é um evento leve,
    // independente do acerto (a pedra também precisa aparecer quando erra).
    if(this.experience==='loop'){
      if(this.level===4){
        if(this.fireAuthority.interact(seat,action.kind as 'lever'|'switch'|'shoot'|'dash'|'support'|'detach',
          this.poses,Date.now(),action.facing??1))this.shareFire();
      }else if(this.level===3){
        if(this.treetopAuthority.interact(seat,action.kind as 'lever'|'switch'|'shoot'|'support'|'detach'|'dash',this.poses,Date.now(),action.facing??1))this.shareTreetop();
      }else if(this.level===2){
        if(this.temporalAuthority.act(seat,action,this.poses))this.shareTemporal();
      }else{
        const world=this.loopAuthority.world,pose=this.poses[seat];
        // Only the host determines outcome. Only real Téo near the high
        // lever receives an acknowledgement; clients cannot claim success.
        const isLeverAttempt=seat===0&&action.kind==='lever'&&
          world.lastRoute==='right'&&!world.suspended[0]&&
          Math.abs(pose.x-SUSPENSION.lever.x)<=190;
        const reason=isLeverAttempt?suspensionLeverStatus(world,pose):null;
        const accepted=this.loopAuthority.act(seat,action,this.poses);
        if(accepted)this.shareLoop();
        if(isLeverAttempt&&reason){
          const reply={ok:accepted,reason:accepted?'ready' as const:reason};
          if(this.isSolo||seat===0)this.emit('loop-lever-reply',reply);
          else {
            const connection=this.conns.get(seat);
            if(connection)this.message(connection,{t:'loop-lever-reply',...reply});
          }
        }
      }
    }else if (this.level === 1) {
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

    this.emitSkillFx(seat,action);
  }
  private shareLoop():void{
    const w=this.loopAuthority.world;
    this.loop={...w,marks:[...w.marks] as LoopWorld['marks'],suspended:[...w.suspended] as LoopWorld['suspended'],tree:[...w.tree] as LoopWorld['tree'],final:[...w.final] as LoopWorld['final'],supporting:[...w.supporting] as LoopWorld['supporting'],health:[...w.health] as LoopWorld['health'],stamina:[...w.stamina] as LoopWorld['stamina'],safeUntil:[...w.safeUntil] as LoopWorld['safeUntil'],lastSpent:[...w.lastSpent] as LoopWorld['lastSpent']};
    this.broadcast({t:'loop',world:this.loop});
    this.emit('loop',this.loop);
  }
  advanceLoopCycle():void{
    if(!this.isSolo||this.experience!=='loop'||!this.playing)return;
    if(this.level===4)this.fireAuthority.world.phaseStart=Date.now()-60000; // developer: visible forest transformation
    else if(this.level===3)this.treetopAuthority.world.cycleStart=Date.now()-60000;
    else if(this.level===2)this.temporalAuthority.world.cycleStart=Date.now()-60000;
    else this.loopAuthority.world.cycleStart=Date.now()-60000;
  }
  private shareFire():void{
    const w=this.fireAuthority.world;
    this.fire={...w,log:[...w.log],smoke:[...w.smoke],tree:[...w.tree],
      smokeSeconds:[...w.smokeSeconds],supporting:[...w.supporting],
      dashAt:[...w.dashAt],dashX:[...w.dashX],health:[...w.health],
      stamina:[...w.stamina],safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent]};
    this.broadcast({t:'fire',world:this.fire});this.emit('fire',this.fire);
  }
  private shareTreetop():void{
    const w=this.treetopAuthority.world;
    this.treetop={...w,bridge:[...w.bridge],tower:[...w.tower],time:[...w.time],
      supporting:[...w.supporting],health:[...w.health],stamina:[...w.stamina],
      safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent]};
    this.broadcast({t:'treetop',world:this.treetop});this.emit('treetop',this.treetop);
  }
  private shareTemporal():void{
    const w=this.temporalAuthority.world;
    this.temporal={...w,echo:[...w.echo],tree:[...w.tree],roots:[...w.roots],
      supporting:[...w.supporting],skillAt:[...w.skillAt],health:[...w.health],
      stamina:[...w.stamina],safeUntil:[...w.safeUntil],lastSpent:[...w.lastSpent]};
    this.broadcast({t:'temporal',world:this.temporal});
    this.emit('temporal',this.temporal);
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
    if(this.experience==='loop'&&this.level===4){
      const now=Date.now();
      if(this.fireAuthority.tickResources(this.poses,now))this.shareFire();
      const result=this.fireAuthority.tick(this.poses,now,this.fireSafeUntil);
      if(result.poses){
        this.fireSafeUntil=now+1800;
        this.poses=result.poses.map(p=>({...p}));
        for(const pose of this.poses){this.broadcast({t:'respawn',pose});this.emit('respawn',pose);}
      }
      if(result.changed)this.shareFire();
      this.broadcast({t:'state',poses:this.poses});this.emit('snapshot',this.poses);
      if(result.won&&this.fireAuthority.world.completed)this.setPhase('final',4);
      return;
    }
    if(this.experience==='loop'&&this.level===3){
      const now=Date.now();
      if(this.treetopAuthority.tickResources(this.poses,now))this.shareTreetop();
      // Fatal drops and gusts are resolved by the same host authority.
      const result=this.treetopAuthority.tick(this.poses,now,this.treetopSafeUntil);
      if(result.poses){
        this.treetopSafeUntil=now+1700;
        this.poses=result.poses.map(p=>({...p}));
        for(const pose of this.poses){this.broadcast({t:'respawn',pose});this.emit('respawn',pose);}
      }
      if(result.changed)this.shareTreetop();
      this.broadcast({t:'state',poses:this.poses});this.emit('snapshot',this.poses);
      if(result.won&&this.treetopAuthority.world.completed)this.setPhase('transition',3,Date.now()+6500);
      return;
    }
    if(this.experience==='loop'&&this.level===2){
      const now=Date.now();
      const w=this.temporalAuthority.world;
      if(w.blackoutUntil>now||w.deadUntil>0||w.completed){
        this.fallTracker.reset(w.blackoutUntil>now?now+900:0);
      }else{
        const hits=this.fallTracker.sample(this.poses,
          temporalFallSurfaces(w.layout,w.bridge),now,w.supporting);
        for(const seat of hits)if(this.temporalAuthority.damage(seat,now,false))this.shareTemporal();
      }
      if(w.deadUntil===0&&!(w.blackoutUntil>now)){
        for(const p of this.poses){
          if(p.y>=690||(p.x>=2610&&p.x<=2970&&p.y>=655)){
            if(this.temporalAuthority.damage(p.seat,now,true))this.shareTemporal();
            break;
          }
          if(w.bridgeAt&&!w.bridge&&now-w.bridgeAt>=1100&&p.x>=2710&&p.x<=2860&&p.y>558){
            if(this.temporalAuthority.damage(p.seat,now,true))this.shareTemporal();
            break;
          }
        }
      }
      if(this.temporalAuthority.tickResources(this.poses,now))this.shareTemporal();
      const state=this.temporalAuthority.tick(this.poses,now);
      if(state.poses){
        this.fallTracker.reset(now+900);
        this.poses=state.poses.map(p=>({...p}));
        for(const pose of this.poses){
          this.broadcast({t:'respawn',pose});this.emit('respawn',pose);
        }
      }
      if(state.changed)this.shareTemporal();
      this.broadcast({t:'state',poses:this.poses});this.emit('snapshot',this.poses);
      if(state.won&&this.temporalAuthority.world.completed)this.setPhase('transition',2,Date.now()+6000);
      return;
    }
    if(this.experience==='loop'){
      const now=Date.now();
      const l=this.loopAuthority.world;
      if(blackoutActive(l,now)||l.deadUntil>0||l.completed){
        this.fallTracker.reset(blackoutActive(l,now)?now+900:0);
      }else{
        const hits=this.fallTracker.sample(this.poses,loopFallSurfaces(l.layout,l.bridge,
          SUMMIT_BRANCH,l.suspendedOpen),now,l.supporting);
        for(const seat of hits)if(this.loopAuthority.damage(seat,now,false))this.shareLoop();
      }
      if(!blackoutActive(this.loopAuthority.world,now)
        &&this.loopAuthority.world.deadUntil===0){
        for(const p of this.poses){
          if(p.y>=690){
            if(this.loopAuthority.damage(p.seat,now,true))this.shareLoop();
            break;
          }
        }
        const tree=this.loopAuthority.world;
        if(tree.treeFallAt>0&&!tree.bridge&&now-tree.treeFallAt>=1100
          &&this.poses.some(p=>p.x>9500&&p.x<9630&&p.y>560)){
          const hit=this.poses.find(p=>p.x>9500&&p.x<9630&&p.y>560);
          if(hit&&this.loopAuthority.damage(hit.seat,now,true))this.shareLoop();
        }
      }
      if(this.loopAuthority.tickResources(this.poses,now))this.shareLoop();
      const state=this.loopAuthority.tick(this.poses,now);
      if(state.poses){
        this.fallTracker.reset(now+900);
        this.poses=state.poses.map(p=>({...p}));
        for(const pose of this.poses){
          this.broadcast({t:'respawn',pose});this.emit('respawn',pose);
        }
      }
      if(state.changed)this.shareLoop();
      this.broadcast({t:'state',poses:this.poses});this.emit('snapshot',this.poses);
      if(state.won&&this.loopAuthority.world.completed)this.setPhase('transition',1,Date.now()+5000);
      return;
    }
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
    this.sessionEpoch++;
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
    this.role = 'idle'; this.code = ''; this.localSeat = null;this.experience='classic';
    this.loopAuthority.reset();this.loop=this.loopAuthority.world;
    this.temporalAuthority.reset();this.temporal=this.temporalAuthority.world;
    this.treetopAuthority.reset();this.treetop=this.treetopAuthority.world;this.treetopSafeUntil=0;
    this.fireAuthority.reset();this.fire=this.fireAuthority.world;this.fireSafeUntil=0;
    this.journeyAuthority.solo=false;this.chapterAuthority.solo=false;
    this.players = slots(); this.poses = SPAWNS.map(p => ({ ...p }));
    this.playing = false; this.completed = false;
    this.stage = 'lobby'; this.level = 1; this.phaseSince = 0; this.phaseUntil = 0;
    this.introDone.clear();this.endingDone.clear();this.endingComplete=false;
    this.riverAuthority.reset(); this.river = initialRiver();
    this.journeyAuthority.reset();this.journey=initialJourney();this.journeyMotion={logs:[3086,3224],now:0};this.lastJourneyMotionBroadcast=0;
    this.chapterAuthority.reset(3);this.chapter=initialEyes();this.jaguar=defaultJaguar();this.lastHazardBroadcast=0;
    this.forestAuthority.reset();this.forest=initialForest();
    this.authority.reset(); this.puzzle = initialWorld(); this.lastAction.clear(); this.effectGate.reset(); this.pendingRestore = false;
    this.tokens = [null, null, null]; this.lastInput = 0; this.lastReceived = [0, 0, 0];
    this.fallTracker.reset();
    this.sessionToken='';this.reconnectDeadline=0;this.vitalityRequestId=0;
    this.lastVitalRequestIds=[0,0,0];
    this.emit('change', undefined);
  }
}
