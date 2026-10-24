import Phaser from 'phaser';
import {IMMERSIVE_SPOTS,type ImmersiveStage} from './immersiveEnvironmentLayout';

export const IMMERSIVE_TEXTURE='forest-immersion-atlas';
export function preloadImmersiveEnvironment(scene:Phaser.Scene):void{
 if(scene.textures.exists(IMMERSIVE_TEXTURE))return;
 const base=import.meta.env.BASE_URL+'assets/environment/';
 scene.load.atlas(IMMERSIVE_TEXTURE,base+'forest-immersion.webp',base+'forest-immersion.json');
}
/** Static render-only environment. No Arcade bodies, no gameplay triggers,
 * no fake collision surfaces. All 14 author-provided graphics are in the atlas.
 * Culling reuses the same viewport strategy as ForestTrees, including mobile. */
export class ImmersiveEnvironment{
 private readonly items:Array<{image:Phaser.GameObjects.Image;x:number;width:number}>=[];
 constructor(private readonly scene:Phaser.Scene,stage:ImmersiveStage){
  if(!scene.textures.exists(IMMERSIVE_TEXTURE))return;
  for(const plan of IMMERSIVE_SPOTS[stage]){
   if(!scene.textures.get(IMMERSIVE_TEXTURE).has(plan.frame))continue;
   const image=scene.add.image(plan.x,plan.baseY,IMMERSIVE_TEXTURE,plan.frame)
    .setOrigin(.5,1)
    .setDisplaySize(plan.width,plan.height)
    .setDepth(plan.depth)
    .setAlpha(plan.alpha)
    .setTint(plan.tint)
    .setFlipX(plan.flipX??false);
   this.items.push({image,x:plan.x,width:plan.width});
  }
 }
 update():void{
  const camera=this.scene.cameras.main;
  const left=camera.scrollX-240;
  const right=camera.scrollX+camera.width/Math.max(.3,camera.zoom)+240;
  for(const item of this.items){
   const visible=item.x+item.width/2>=left&&item.x-item.width/2<=right;
   if(item.image.visible!==visible)item.image.setVisible(visible);
  }
 }
}
