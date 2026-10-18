/** Camera-aware speech bubble layout in CSS/game viewport pixels. No Phaser dependency.
 * Uses camera.worldView (already accounts for camera zoom and origin), not raw
 * scrollX, so a zoomed/mobile camera never pulls the text away from Pipo.
 */
export type PipoViewport={width:number;height:number};
export type PipoCameraView={x:number;y:number;zoom:number;worldX:number;worldY:number};
export type PipoSpeechLayout={
 x:number;y:number;width:number;height:number;scale:number;
 tailX:number;tailY:number;birdX:number;birdY:number;offscreen:boolean;
 indicatorX:number;indicatorY:number;
};
export function pipoSpeechLayout(view:PipoViewport,camera:PipoCameraView,
 textHeight:number):PipoSpeechLayout{
 const width=Math.min(296,Math.max(168,view.width-32));
 const scale=1;
 const height=Math.min(Math.max(90,textHeight+44),Math.max(110,view.height*.38));
 const birdX=(camera.x-camera.worldX)*camera.zoom;
 const birdY=(camera.y-camera.worldY)*camera.zoom;
 const offscreen=birdX< -12||birdX>view.width+12||birdY< -22||birdY>view.height+18;
 const inset=12;
 const minX=width/2+inset,maxX=Math.max(minX,view.width-width/2-inset);
 const x=Math.max(minX,Math.min(maxX,birdX));
 // Reserve mobile HUD above and touch controls below. The bottom of the
 // balloon should stay slightly above the bird's head whenever possible.
 const top=44+height/2;
 const bottom=Math.max(top,view.height-130-height/2);
 const preferred=birdY-32*camera.zoom-16-height/2;
 const y=Math.max(top,Math.min(bottom,preferred));
 const tailX=Math.max(-width/2+19,Math.min(width/2-19,birdX-x));
 const tailY=Math.max(height/2+9,Math.min(height/2+45,
    birdY-29*camera.zoom-y));
 const indicatorX=Math.max(34,Math.min(view.width-34,birdX));
 const indicatorY=Math.max(62,Math.min(view.height-162,birdY));
 return {x,y,width,height,scale,tailX,tailY,birdX,birdY,offscreen,
    indicatorX,indicatorY};
}
