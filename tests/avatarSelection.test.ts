import {strict as assert} from 'node:assert';
import {existsSync,readFileSync} from 'node:fs';
import {Network,type Seat} from '../src/network';
import {
 AVATAR_CATALOG,DEFAULT_AVATARS,AVATAR_STORAGE_KEY,avatarInfo,
 isAvatarId,avatarAvailable,uniqueAvatars,selectSoloAvatar,loadSoloAvatars,saveSoloAvatars
} from '../src/avatarCatalog';

assert.equal(AVATAR_CATALOG.length,6,'official Kenney archive has exactly six figures');
assert.deepEqual(AVATAR_CATALOG.map(s=>s.id),[
 'maleAdventurer','femaleAdventurer','malePerson','femalePerson','robot','zombie'
],'real six are adventurers, people, robot and zombie (not two zombies)');
assert.ok(uniqueAvatars(DEFAULT_AVATARS),'legacy trio remains default');
assert.ok(!uniqueAvatars(['robot','robot','zombie']));
assert.equal(isAvatarId('zombie'),true);
assert.equal(isAvatarId('invented-skin'),false);
assert.equal(avatarInfo('robot').file,'robo');
for(const avatar of AVATAR_CATALOG){
 const root='public/characters/kenney/';
 for(const ext of ['png','xml']){
  const file=root+avatar.file+'.'+ext;
  assert.ok(existsSync(file),file+' is committed, not remotely fetched at runtime');
 }
 const png=root+'preview-'+avatar.file+'.png';
 assert.ok(existsSync(png),png+' exists for lobby cards');
 const b=readFileSync(png);
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(b.readUInt32BE(16),96,'idle frame is 96px wide');
 assert.equal(b.readUInt32BE(20),128,'idle frame is 128px high');
 const xml=readFileSync(root+avatar.file+'.xml','utf8');
 for(const frame of ['idle','jump','fall','run0','run1','walk0','walk7'])
  assert.ok(xml.includes('name="'+frame+'"'),avatar.file+' supports '+frame);
}
assert.ok(readFileSync('public/characters/kenney/LICENSE.txt','utf8').includes('CC0'));

const slots=[
 {online:true,avatar:'maleAdventurer' as const},
 {online:true,avatar:'zombie' as const},
 {online:true,avatar:null}
];
assert.equal(avatarAvailable('zombie',2,slots),false,
 'third player must see already-picked zombie unavailable');
assert.equal(avatarAvailable('robot',2,slots),true,'unclaimed robot is available');
assert.equal(avatarAvailable('zombie',1,slots),true,'a player can keep own selection');
const draft=['maleAdventurer','femaleAdventurer','malePerson'] as const;
assert.equal(selectSoloAvatar([...draft],1,'maleAdventurer'),null,
 'solo cannot reuse selected character in another role');
const next=selectSoloAvatar([...draft],1,'robot')!;
assert.deepEqual(next,['maleAdventurer','robot','malePerson']);
assert.deepEqual(draft,['maleAdventurer','femaleAdventurer','malePerson'],
 'solo selection does not mutate the old draft');

let local='';
const storage={
 getItem:(key:string)=>key===AVATAR_STORAGE_KEY?local||null:null,
 setItem:(key:string,value:string)=>{assert.equal(key,AVATAR_STORAGE_KEY);local=value;}
};
assert.deepEqual(loadSoloAvatars(storage),DEFAULT_AVATARS);
saveSoloAvatars(next,storage);
assert.deepEqual(loadSoloAvatars(storage),next);
local='["robot","robot","zombie"]';
assert.deepEqual(loadSoloAvatars(storage),DEFAULT_AVATARS,'corrupted/repeated preset falls back safely');
local='not JSON';
assert.deepEqual(loadSoloAvatars(storage),DEFAULT_AVATARS,'malformed preferences are ignored');

const net=new Network();
net.role='host';net.localSeat=0;net.stage='lobby';
net.players=([0,1,2] as Seat[]).map(seat=>({
 seat,online:true,ready:true,nickname:'Test '+seat,
 avatar:seat===0?'maleAdventurer':seat===1?'zombie':null
}));
assert.equal(net.canStart,false,'no start before all three reserve unique avatars');
net.players[2].avatar='robot';
assert.equal(net.canStart,true,'three ready unique avatars unlock start');
assert.equal(net.avatarForSeat(1),'zombie','avatar is independent of the seat ability');
net.selectAvatar('femalePerson');
assert.equal(net.players[0].avatar,'femalePerson','host owns only their seat skin');
assert.equal(net.players[0].ready,false,'changing avatar clears READY');
assert.equal(net.canStart,false,'host must confirm ready again after change');
net.ready(true);
assert.equal(net.canStart,true);
net.selectAvatar('robot');
assert.equal(net.players[0].avatar,'femalePerson','duplicate claim is rejected');
net.shutdown();

const network=readFileSync('src/network.ts','utf8');
const main=readFileSync('src/main.ts','utf8');
const sprite=readFileSync('src/kenneyCharacterSprites.ts','utf8');
const screen=readFileSync('src/avatarSelectionUI.ts','utf8');
const intro=readFileSync('src/intro.ts','utf8');
assert.ok(network.includes("case 'avatar': return isAvatarId(p.id)")&&
 network.includes("if (msg.t === 'avatar' && this.stage==='lobby')")&&
 network.includes('this.tryAssignAvatar(seat,msg.id)'),
 'only authenticated seat may submit a skin and host validates it');
assert.ok(network.includes("case 'avatar-denied':")&&
 network.includes("this.message(this.conns.get(seat)??null,{t:'avatar-denied'")&&
 network.includes("case 'avatar-denied':\n        this.emit('notice'"),
 'denied claims show feedback but do not disconnect guests');
assert.ok(network.includes('this.players[seat].avatar=null')&&
 network.includes("this.players[seat].ready=false"),
 'vacated multiplayer seat releases the reserved avatar');
assert.ok(main.includes("button('solo-confirm','▶ INICIAR AVENTURA')")&&
 main.includes('showSoloSelection(level)')&&
 main.includes('saveSoloAvatars(chosen)')&&
 main.includes("net.startSolo(level,false,'loop',avatars)")&&
 main.includes("net.startLoopSolo(avatars)"),
 'solo chooses three cosmetics before intro or a selected phase');
assert.ok(main.includes("avatarGrid(isAvatarId(chosenAvatar)?chosenAvatar:null,occupied,'multiplayer')")&&
 main.includes('net.selectAvatar(id)')&&main.includes('!net.canStart'),
 'lobby has live cards and authoritative start lock');
assert.ok(main.includes('setActiveAvatarSelections(')&&
 sprite.includes('kenneyKeyForSeat(seat)')&&
 intro.includes('kenneyKeyForSeat(i as 0|1|2)'),
 'all four phases and intro use chosen skin before creating sprites');
assert.ok(sprite.includes('.setDisplaySize(56,74)')&&
 sprite.includes('target.x,target.y+24')&&screen.includes('aria-pressed')&&
 screen.includes('aria-disabled="true"'),
 'original hitboxes and accessible cosmetic-only controls are preserved');
console.log('SELEÇÃO DE 6 PERSONAGENS: regressões de solo, lobby, WebRTC e sprites aprovadas');
