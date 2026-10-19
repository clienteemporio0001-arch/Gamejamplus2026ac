import {AVATAR_CATALOG,type AvatarId} from './avatarCatalog';
import type {Seat} from './network';

const escape=(value:string):string=>value.replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]??c));
const BASE='characters/kenney/';
export const ROLE_NAMES=['Téo','Lia','Nino'] as const;
export const ROLE_SKILLS=['SALTO DUPLO','BALADEIRA','DASH'] as const;

/** Same six portraits work in compact host/client lobby and solo selector. */
export function avatarGrid(
 selected:AvatarId|null,occupied:ReadonlyMap<AvatarId,string>,
 mode:'solo'|'multiplayer'
):string{
 return '<div class="avatar-grid" role="group" aria-label="Escolha um dos seis personagens">'+
 AVATAR_CATALOG.map(a=>{
  const owner=occupied.get(a.id);
  const chosen=selected===a.id;
  const locked=!!owner&&!chosen;
  const state=chosen?'SELECIONADO':locked?'OCUPADO · '+escape(owner):'DISPONÍVEL';
  return '<button type="button" class="skin-card'+(chosen?' skin-selected':'')+
   (locked?' skin-occupied':'')+'" data-'+(mode==='solo'?'solo-avatar':'avatar')+'="'+a.id+'"'+
   (locked?' disabled aria-disabled="true"':'')+' aria-pressed="'+chosen+'"'+
   ' aria-label="'+escape(a.label)+' — '+state+'">'+
   '<span class="skin-img-box"><img src="'+import.meta.env.BASE_URL+BASE+'preview-'+a.file+
   '.png" loading="lazy" alt="'+escape(a.label)+'" width="72" height="96"/></span>'+
   '<strong>'+escape(a.label)+'</strong><small>'+state+'</small></button>';
 }).join('')+'</div>';
}

/** Explicitly distinguish cosmetic identity from the fixed cooperative role. */
export function roleLabel(seat:Seat):string{
 return ROLE_NAMES[seat]+' · '+ROLE_SKILLS[seat];
}
