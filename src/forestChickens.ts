import Phaser from 'phaser';
import {CHICKEN_PATHS,chickenPose,type ChickenPath} from './chickenPatrol';

const KEY='ambient-running-chicken';
/** Original 4-frame GIF converted to transparent 176x44 PNG spritesheet. */
export function preloadForestChickens(scene:Phaser.Scene):void{
 if(scene.textures.exists(KEY))return;
 scene.load.spritesheet(KEY,
  import.meta.env.BASE_URL+'assets/animals/chicken-run.png',
  {frameWidth:44,frameHeight:44});
}

type ChickenVisual={
 sprite:Phaser.GameObjects.Sprite;
 shadow:Phaser.GameObjects.Ellipse;
 path:ChickenPath;
};
/** Pure decoration: no Arcade bodies, hitboxes, interaction or network packets. */
export class ForestChickens{
 private birds:ChickenVisual[]=[];
 constructor(private scene:Phaser.Scene,phase:1|2){
  // Missing art must never prevent a round from starting.
  if(!scene.textures.exists(KEY))return;
  for(const path of CHICKEN_PATHS[phase]){
   const sprite=scene.add.sprite(path.from,path.groundY,KEY,0)
     .setOrigin(.5,1).setDisplaySize(42,42).setDepth(15);
   const shadow=scene.add.ellipse(path.from,path.groundY+1,28,7,0x071711,.27)
     .setDepth(14);
   this.birds.push({sprite,shadow,path});
  }
 }
 update(elapsedMs:number):void{
  const view=this.scene.cameras.main.worldView;
  for(const bird of this.birds){
   const pose=chickenPose(bird.path,elapsedMs);
   const visible=pose.x>=view.left-80&&pose.x<=view.right+80;
   bird.sprite.setVisible(visible);
   bird.shadow.setVisible(visible);
   if(!visible)continue;
   bird.sprite.setPosition(pose.x,pose.groundY)
     .setFlipX(pose.flipX).setFrame(pose.frame);
   bird.shadow.setPosition(pose.x,pose.groundY+1);
  }
 }
}
