/** Screen-space geometry only. Never change Arcade gravity, hitboxes or world coordinates. */
export type ViewSize={width:number;height:number};
export const MOBILE_PORTRAIT_LIMIT=720;
export function isMobilePortrait(view:ViewSize,coarse:boolean):boolean{
  return coarse&&view.height>view.width&&view.width<=MOBILE_PORTRAIT_LIMIT;
}
export function cameraZoomFor(view:ViewSize,coarse:boolean):number{
  if(coarse){
   // Landscape phones need more world visible above Téo's stacked climb.
   if(view.width>view.height&&view.height<=650)
    return Math.max(.70,Math.min(.88,Math.min(view.height/650,view.width/1100)));
   return Math.max(.72,Math.min(1.02,Math.min(view.height/440,view.width/850)));
  }
  // Desktop embeds and tall monitors: the old 1.16 zoom cap left a large
  // empty strip below the world ground. Leave the mobile branch unchanged.
  return Math.max(.75,Math.min(1.58,view.height/720));
}
export function viewportSize(win:{innerWidth:number;innerHeight:number;
  visualViewport?:{width:number;height:number}|null}):ViewSize{
  // visualViewport can shrink due to overlays/keyboards; the layout viewport
  // remains the fullscreen game's stable backing size.
  return {width:Math.max(240,Math.round(win.innerWidth)),
    height:Math.max(240,Math.round(win.innerHeight))};
}
export function isCoarseDevice():boolean{
  return typeof window!=='undefined'&&
    (window.matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0);
}
