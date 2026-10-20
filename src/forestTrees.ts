import Phaser from 'phaser';
import {FOREST_TREE_LAYOUTS,type ForestTreeStage,type ForestTreeFrame} from './forestTreeLayout';

const TEXTURE_KEY='native-forest-trees';
export function preloadForestTrees(scene:Phaser.Scene):void{
  if(scene.textures.exists(TEXTURE_KEY))return;
  const base=import.meta.env.BASE_URL+'assets/trees/';
  scene.load.atlas(TEXTURE_KEY,base+'forest-trees.webp',base+'forest-trees.json');
}

export class ForestTrees{
  private readonly trees:Array<{sprite:Phaser.GameObjects.Image;x:number;width:number}>=[];
  constructor(private readonly scene:Phaser.Scene,stage:ForestTreeStage){
    // Missing artwork should never prevent gameplay from starting.
    if(!scene.textures.exists(TEXTURE_KEY))return;
    for(const plan of FOREST_TREE_LAYOUTS[stage]){
      const sprite=scene.add.image(plan.x,plan.baseY,TEXTURE_KEY,plan.frame)
        .setOrigin(.5,1)
        .setDisplaySize(plan.height*planAspect(plan.frame),plan.height)
        .setDepth(plan.depth)
        .setAlpha(plan.alpha)
        .setTint(plan.tint)
        .setFlipX(plan.flipX??false);
      this.trees.push({sprite,x:plan.x,width:sprite.displayWidth});
    }
  }
  update():void{
    const camera=this.scene.cameras.main;
    const left=camera.scrollX-230;
    const right=camera.scrollX+camera.width/Math.max(.3,camera.zoom)+230;
    for(const tree of this.trees){
      const visible=tree.x+tree.width/2>=left&&tree.x-tree.width/2<=right;
      if(tree.sprite.visible!==visible)tree.sprite.setVisible(visible);
    }
  }
}
function planAspect(frame:ForestTreeFrame):number{
  return frame==='tree00'?146/188:frame==='tree01'?129/211:89/126;
}
