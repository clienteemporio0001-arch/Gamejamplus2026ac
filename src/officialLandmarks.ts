import Phaser from 'phaser';

/** The Fase 1 SVGs are the sole official source of landmark silhouettes.
 * Decoration only: never adds collision bodies, modifies authoritative targets,
 * or changes the character who can perform each stage's actual puzzle action.
 */
export type LandmarkKind='hollow'|'stone'|'arch';
export type LandmarkBiome='night'|'rain'|'canopy'|'fire';
export const LANDMARK_SPRITES={
 hollow:'loop-hollow-tree',stone:'loop-stone',arch:'loop-arch'
} as const;
export const LANDMARK_SIZES={
 hollow:{width:235,height:320},stone:{width:155,height:104},arch:{width:244,height:182}
} as const;
export const LANDMARK_KEYS=['hollow','stone','arch'] as const;
export const LANDMARK_ACCENTS={hollow:0xc7f5a5,stone:0xf3dfa8,arch:0x9bd3f3} as const;
export function preloadOfficialLandmarks(scene:Phaser.Scene):void{
 for(const [kind,path] of [
  ['hollow','hollow-tree.svg'],['stone','loop-stone.svg'],['arch','loop-arch.svg']
 ] as const){
  const key=LANDMARK_SPRITES[kind];
  if(!scene.textures.exists(key))scene.load.svg(key,import.meta.env.BASE_URL+'assets/'+path);
 }
}
/** Coordinates are ground-foot anchors. targetY is the real host-authority interaction point. */
export function officialLandmark(
 scene:Phaser.Scene,kind:LandmarkKind,biome:LandmarkBiome,
 x:number,footY:number,targetY:number,scale=1
):Phaser.GameObjects.Container{
 const size=LANDMARK_SIZES[kind];
 const root=scene.add.container(x,footY).setDepth(12);
 const image=scene.add.image(0,-size.height*scale/2,LANDMARK_SPRITES[kind])
  .setDisplaySize(size.width*scale,size.height*scale);
 root.add(image);
 const tint=biome==='rain'?0xa7c9cf:biome==='fire'?0xd4a68a:0xffffff;
 image.setTint(tint);
 const detail=scene.add.graphics();
 detail.fillStyle(biome==='fire'?0x4b392f:0x31563e,.65);
 for(let j=0;j<4;j++)detail.fillEllipse((j-1.5)*31*scale,-4*scale,58*scale,10*scale);
 detail.lineStyle(2.5,LANDMARK_ACCENTS[kind],.62);
 detail.strokeCircle(0,targetY-footY,9);
 detail.fillStyle(LANDMARK_ACCENTS[kind],.48);
 detail.fillCircle(0,targetY-footY,5);
 if(biome==='rain'){
  detail.lineStyle(2,0xb5d8d9,.38);
  for(let i=-1;i<=1;i++)detail.lineBetween(i*20,-size.height*scale*.57,i*20-5,-size.height*scale*.57+15);
 }else if(biome==='fire'){
  detail.fillStyle(0x292a2b,.18);
  detail.fillEllipse(-size.width*scale*.22,-size.height*scale*.34,size.width*scale*.25,19);
 }
 root.add(detail);
 return root;
}
