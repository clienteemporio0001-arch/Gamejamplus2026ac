import Phaser from 'phaser';
/** Lightweight non-collidable motion preview during a host-approved 60s layout shift.
 * Collision remains at the OLD safe layout until the authority finishes its cycle.
 */
export type TransformProp={x:number;y:number;width:number;height:number};
export function animateForestProps(scene:Phaser.Scene,changes:ReadonlyArray<{
 from:TransformProp;to:TransformProp;kind:'branch'|'roots'|'trunk';
}>,duration=1900):void{
 for(const change of changes.slice(0,12)){
  const {from,to,kind}=change;
  const tint=kind==='roots'?0x63824c:kind==='trunk'?0x786243:0x71965d;
  const ghost=scene.add.rectangle(from.x,from.y,from.width,from.height,tint,.57)
   .setDepth(30).setStrokeStyle(3,0xb8d8a0,.72);
  const glow=scene.add.ellipse(from.x,from.y,Math.max(65,from.width*1.15),
   Math.max(27,from.height*3),0xb6e5ad,.13).setDepth(29);
  scene.tweens.add({
   targets:ghost,x:to.x,y:to.y,displayWidth:to.width,displayHeight:to.height,
   angle:kind==='trunk'?12:kind==='roots'?-8:5,
   alpha:.18,duration,ease:'Sine.easeInOut',
   onComplete:()=>ghost.destroy()
  });
  scene.tweens.add({targets:glow,x:to.x,y:to.y,alpha:0,duration,
   ease:'Sine.easeInOut',onComplete:()=>glow.destroy()});
 }
}
