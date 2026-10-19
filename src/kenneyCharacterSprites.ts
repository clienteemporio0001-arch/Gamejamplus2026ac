import Phaser from 'phaser';
import type {Seat} from './network';

/**
 * Licensed CC0 visual overlays from Kenney Toon Characters 1.
 * The source asset is vendored in public/characters/kenney; no remote runtime calls.
 * 30x44 Arcade rectangles, snapshots, host authority and world geometry stay untouched.
 */
export const KENNEY_KEYS=['kenney-teo','kenney-lia','kenney-nino'] as const;
const KENNEY_FILES=['teo','lia','nino'] as const;
const BASE='characters/kenney/';

export function preloadKenneyCharacters(scene:Phaser.Scene):void{
 for(const seat of [0,1,2] as const){
  const key=KENNEY_KEYS[seat];
  if(scene.textures.exists(key))continue;
  scene.load.atlasXML(key,
    import.meta.env.BASE_URL+BASE+KENNEY_FILES[seat]+'.png',
    import.meta.env.BASE_URL+BASE+KENNEY_FILES[seat]+'.xml');
 }
}

/** All figures are decorative and have NO physics body. */
export function createKenneyCharacter(
 scene:Phaser.Scene,target:Phaser.GameObjects.Rectangle,seat:Seat,
 depth=target.depth+.25
):Phaser.GameObjects.Sprite|null{
 const key=KENNEY_KEYS[seat];
 if(!scene.textures.exists(key))return null; // fallback to existing vector art
 return scene.add.sprite(target.x,target.y+24,key,'idle')
  .setOrigin(.5,1).setDisplaySize(56,74).setDepth(depth);
}

export function updateKenneyCharacter(
 sprite:Phaser.GameObjects.Sprite|null,
 target:Phaser.GameObjects.Rectangle,
 time:number,vx:number,vy:number
):void{
 if(!sprite)return;
 const speed=Math.abs(vx);
 let frame='idle';
 if(vy < -85)frame='jump';
 else if(vy > 85)frame='fall';
 else if(speed>125)frame='run'+(Math.floor(time/105)%3);
 else if(speed>24)frame='walk'+(Math.floor(time/100)%8);
 if(sprite.frame.name!==frame)sprite.setFrame(frame);
 if(vx < -35)sprite.setFlipX(true);
 else if(vx > 35)sprite.setFlipX(false);
 sprite.setPosition(target.x,target.y+24)
  .setAlpha(target.alpha)
  .setVisible(target.active&&target.visible);
}
