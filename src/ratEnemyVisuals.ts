import Phaser from 'phaser';
import {RAT_LAYOUT,RAT_SKIN,ratAlive,ratFlight,type RatLevel,type RatKind,type RatDownState} from './ratCombat';

/**
 * Original Ratfolk v0.3 pixel art, converted losslessly from user ZIP.
 * Visual ONLY: hitboxes, damage, skills and knockback run on the host.
 */
const textures:Record<RatKind,string>={
 pink:'ratfolk-pink',black:'ratfolk-black',king:'ratfolk-king',fire:'ratfolk-fire'
};
const size:Record<RatKind,{w:number;h:number}>={
 pink:{w:24,h:32},black:{w:24,h:32},
 king:{w:32,h:48},fire:{w:24,h:32}
};
export function preloadRatEnemies(scene:Phaser.Scene,stage:RatLevel):void{
 const kind=RAT_SKIN[stage],key=textures[kind];
 if(scene.textures.exists(key))return;
 scene.load.spritesheet(key,
   import.meta.env.BASE_URL+'assets/enemies/rat-'+kind+'.webp',
   {frameWidth:size[kind].w,frameHeight:size[kind].h});
}
export class RatEnemyVisuals {
 private sprites:Phaser.GameObjects.Sprite[]=[];
 private wasUp=[true,true,true];
 constructor(private scene:Phaser.Scene,private stage:RatLevel){
  const kind=RAT_SKIN[stage],key=textures[kind];
  if(!scene.textures.exists(key))return;
  for(const spot of RAT_LAYOUT[stage]){
   const king=kind==='king';
   const sprite=scene.add.sprite(spot.x,spot.y+27,key,3)
    .setOrigin(.5,1)
    .setDisplaySize(king?61:48,king?80:64)
    .setDepth(20);
   this.sprites.push(sprite);
  }
 }
 update(now:number,start:number,down:RatDownState,paused=false):void{
  const cam=this.scene.cameras.main.worldView;
  for(const id of [0,1,2] as const){
   const sprite=this.sprites[id];if(!sprite)continue;
   const alive=!paused&&ratAlive(down,id,now);
   if(this.wasUp[id]&&!alive&&!paused){
    const pos=ratFlight(this.stage,id,now,start);
    const puff=this.scene.add.circle(pos.x,pos.y-12,13,
      this.stage===4?0xff8238:0xd2c9b9,.65).setDepth(48);
    this.scene.tweens.add({targets:puff,scale:1.5,alpha:0,
      duration:230,onComplete:()=>puff.destroy()});
   }
   this.wasUp[id]=alive;
   if(!alive){sprite.setVisible(false);continue;}
   const p=ratFlight(this.stage,id,now,start);
   const visible=p.x>=cam.left-90&&p.x<=cam.right+90&&
     p.y>=cam.top-90&&p.y<=cam.bottom+90;
   sprite.setVisible(visible);
   if(!visible)continue;
   sprite.setPosition(p.x,p.y+27).setFlipX(false);
   // Each sprite sheet is NESW, with 3 animation frames per direction.
   sprite.setFrame((p.vx<0?9:3)+(Math.floor(now/145)%3));
  }
 }
}
