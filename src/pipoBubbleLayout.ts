/** Camera-aware speech bubble layout in CSS/game viewport pixels. No Phaser dependency.
 * Uses camera.worldView (already accounts for camera zoom and origin), not raw
 * scrollX, so a zoomed/mobile camera never pulls the text away from Pipo.
 */
export type PipoViewport={width:number;height:number};
export type PipoCameraView={x:number;y:number;zoom:number;worldX:number;worldY:number};
export type PipoSpeechLayout={
 x:number;y:number;width:number;height:number;scale:number;
 tailX:number;tailY:number;tailSide:'top'|'bottom';birdX:number;birdY:number;offscreen:boolean;
 indicatorX:number;indicatorY:number;
};
/** Phaser scrollFactor(0) prevents scrolling, NOT zooming. Invert the
 * camera's center-zoom transform for fixed-width HUD balloons so Pipo's
 * bubble never drifts or stretches on mobile at camera zoom != 1.
 */
export function pipoHudCoords(x:number,y:number,view:PipoViewport,zoom:number){
 const z=Math.max(.2,zoom);
 return {x:view.width/2+(x-view.width/2)/z,
   y:view.height/2+(y-view.height/2)/z,scale:1/z};
}
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
 // Candidate positions beside the bird, away from the avatar directly below it.
 const top=44+height/2;
 const bottom=Math.max(top,view.height-130-height/2);
 const headY=birdY-29*camera.zoom;
 const gap=22;
 const candidates=[
  {x:birdX+width/2+gap,y:headY-height/2-gap},
  {x:birdX-width/2-gap,y:headY-height/2-gap},
  {x:birdX+width/2+gap,y:headY},
  {x:birdX-width/2-gap,y:headY},
  {x:birdX+width/2+gap,y:headY+height/2+gap},
  {x:birdX-width/2-gap,y:headY+height/2+gap}
 ];
 const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
 const scored=candidates.map(c=>{
  const x=clamp(c.x,minX,maxX),y=clamp(c.y,top,bottom);
  const overlapX=Math.max(0,width/2+38-Math.abs(x-birdX));
  const overlapY=Math.max(0,height/2+35-Math.abs(y-birdY));
  const avatarX=birdX-80*camera.zoom,avatarY=birdY+110*camera.zoom;
  const actorOverlapX=Math.max(0,width/2+28-Math.abs(x-avatarX));
  const actorOverlapY=Math.max(0,height/2+48-Math.abs(y-avatarY));
  return {x,y,score:overlapX*overlapY*8+actorOverlapX*actorOverlapY*5+
    Math.abs(c.x-x)*2+Math.abs(c.y-y)*2};
 }).sort((a,b)=>a.score-b.score);
 const {x,y}=scored[0];
 const tailSide:'top'|'bottom'=y>headY?'top':'bottom';
 const tailX=Math.max(-width/2+19,Math.min(width/2-19,birdX-x));
 const tailBase=tailSide==='top'?-height/2:height/2;
 const tailY=tailSide==='top'
  ?Math.min(-height/2-9,Math.max(-height/2-48,headY-y))
  :Math.max(height/2+9,Math.min(height/2+48,headY-y));
 const indicatorX=Math.max(34,Math.min(view.width-34,birdX));
 const indicatorY=Math.max(62,Math.min(view.height-162,birdY));
 return {x,y,width,height,scale,tailX,tailY,tailSide,birdX,birdY,offscreen,
    indicatorX,indicatorY};
}
