/** Six authentic visual-only characters in Kenney Toon Characters 1 (CC0).
 * Gameplay roles and abilities remain fixed: seat 0=Téo, 1=Lia, 2=Nino.
 * Sprite sheets are vendored locally for GitHub Pages / itch.io offline builds.
 */
export const AVATAR_CATALOG=[
 {id:'maleAdventurer',label:'Aventureiro',file:'teo'},
 {id:'femaleAdventurer',label:'Aventureira',file:'lia'},
 {id:'malePerson',label:'Homem',file:'nino'},
 {id:'femalePerson',label:'Mulher',file:'mulher'},
 {id:'robot',label:'Robô',file:'robo'},
 {id:'zombie',label:'Zumbi',file:'zumbi'}
] as const;
export type AvatarId=(typeof AVATAR_CATALOG)[number]['id'];
export type AvatarChoices=[AvatarId,AvatarId,AvatarId];
export const DEFAULT_AVATARS:AvatarChoices=['maleAdventurer','femaleAdventurer','malePerson'];
export const isAvatarId=(value:unknown):value is AvatarId=>
 typeof value==='string'&&AVATAR_CATALOG.some(a=>a.id===value);
export const avatarInfo=(id:AvatarId)=>AVATAR_CATALOG.find(a=>a.id===id)!;
export function uniqueAvatars(ids:readonly unknown[]):ids is AvatarChoices{
 return ids.length===3&&ids.every(isAvatarId)&&new Set(ids).size===3;
}
export function avatarAvailable(
 id:AvatarId,seat:0|1|2,players:readonly {avatar?:AvatarId|null;online:boolean}[]
):boolean{
 return !players.some((player,index)=>index!==seat&&player.online&&player.avatar===id);
}
export function selectSoloAvatar(
 current:AvatarChoices,seat:0|1|2,id:AvatarId
):AvatarChoices|null{
 if(current.some((other,index)=>other===id&&index!==seat))return null;
 const next=[...current] as AvatarChoices;
 next[seat]=id;
 return next;
}
export const AVATAR_STORAGE_KEY='afm-gamejam-solo-skins-v1';
export function loadSoloAvatars(storage:Pick<Storage,'getItem'>|null=
 typeof localStorage!=='undefined'?localStorage:null):AvatarChoices{
 try{
  const found=JSON.parse(storage?.getItem(AVATAR_STORAGE_KEY)||'null') as unknown;
  return Array.isArray(found)&&uniqueAvatars(found)?[...found]:[...DEFAULT_AVATARS];
 }catch{return [...DEFAULT_AVATARS];}
}
export function saveSoloAvatars(avatars:AvatarChoices,storage:Pick<Storage,'setItem'>|null=
 typeof localStorage!=='undefined'?localStorage:null):void{
 if(!uniqueAvatars(avatars))return;
 try{storage?.setItem(AVATAR_STORAGE_KEY,JSON.stringify(avatars));}catch{/* private browsing */}
}
