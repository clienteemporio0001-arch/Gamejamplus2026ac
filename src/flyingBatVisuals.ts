import Phaser from 'phaser';
import {BAT_LAYOUT,batAlive,batFlight,type BatDownState,type BatStage} from './flyingBats';

/** Two tiny authentic 48x64 sprite sheets from the uploaded Bat (Rework)
 * package, 3 frames x 4 directions. See assets/enemies/README.md for
 * attribution under CC BY 3.0 / OGA BY 3.0.
 */
const BAT_TEXTURES:Record<BatStage,string>={3:'gamejam-gray-bat',4:'gamejam-red-bat'};
export function preloadBats(scene:Phaser.Scene,stage:BatStage):void{
 const key=BAT_TEXTURES[stage];
 if(scene.textures.exists(key))return;
 const file=stage===3?'bat-gray.png':'bat-red.png';
 scene.load.spritesheet(key,import.meta.env.BASE_URL+'assets/enemies/'+file,
   {frameWidth:48,frameHeight:64});
}

/** Rendering only. No local physics, collision callbacks or network writes.
 * Hit confirmation comes exclusively from the host's world snapshot.
 */
export class FlyingBatVisuals{
 private sprites:Phaser.GameObjects.Sprite[]=[];
 private lastAlive=[true,true];
 constructor(private scene:Phaser.Scene,private stage:BatStage){
  const key=BAT_TEXTURES[stage];
  if(!scene.textures.exists(key))return;
  for(const spot of BAT_LAYOUT[stage]){
   const sprite=scene.add.sprite(spot.x,spot.y,key,0)
     .setDisplaySize(stage===3?69:75,stage===3?92:100)
     .setDepth(stage===3?26:33);
   this.sprites.push(sprite);
  }
 }
 update(now:number,startedAt:number,down:BatDownState,paused=false):void{
  const cam=this.scene.cameras.main;
  for(const id of [0,1] as const){
   const sprite=this.sprites[id];if(!sprite)continue;
   const alive=!paused&&batAlive(down,id,now);
   if(this.lastAlive[id]&&!alive&&!paused){
    const flight=batFlight(this.stage,id,now,startedAt);
    // Very small impact puff when Lia knocks it down; no world mutation.
    const puff=this.scene.add.circle(flight.x,flight.y,18,
      this.stage===4?0xff7855:0x9b89c8,.55).setDepth(35);
    this.scene.tweens.add({targets:puff,scale:1.8,alpha:0,duration:250,
      onComplete:()=>puff.destroy()});
   }
   this.lastAlive[id]=alive;
   if(!alive){sprite.setVisible(false);continue;}
   const spot=batFlight(this.stage,id,now,startedAt);
   const inside=spot.x>cam.worldView.left-100&&spot.x<cam.worldView.right+100&&
     spot.y>cam.worldView.top-100&&spot.y<cam.worldView.bottom+100;
   sprite.setVisible(inside);
   if(!inside)continue;
   // First row = frontal wing-flap cycle. Mirror it when flying left.
   sprite.setPosition(spot.x,spot.y)
     .setFlipX(spot.flipX)
     .setFrame(Math.floor(now/135)%3);
  }
 }
}
