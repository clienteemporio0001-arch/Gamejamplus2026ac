/** Screen-space geometry only. Never change Arcade gravity, hitboxes or world coordinates. */
export type ViewSize={width:number;height:number};
export const MOBILE_PORTRAIT_LIMIT=720;
export function isMobilePortrait(view:ViewSize,coarse:boolean):boolean{
  return coarse&&view.height>view.width&&view.width<=MOBILE_PORTRAIT_LIMIT;
}
export function cameraZoomFor(view:ViewSize,coarse:boolean):number{
  if(coarse)return Math.max(.62,Math.min(1.12,view.height/545));
  return Math.max(.85,Math.min(1.16,view.height/700));
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
