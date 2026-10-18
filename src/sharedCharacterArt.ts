import Phaser from 'phaser';
import type {Seat} from './network';

/** Official 32px-class procedural protagonists for intro and all four adventure stages.
 * Rendering only: the existing 30x44 Arcade Rectangle, its origin and collisions never change.
 * Faces are front-facing with TWO separate eyes, even while running or airborne.
 */
export const CHARACTER_COLORS=[0x369e69,0xcf8545,0x4b95ca] as const;
const HAIR=[0x263b2b,0x50302c,0x1c354b] as const;
const SKIN=[0xd4a37c,0xd8ac86,0xc89372] as const;
const LIGHT=[0xa2eba5,0xfac382,0x9cdaef] as const;
const OUTLINE=0x15242a;
const ellipse=(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,c:number,a=1)=>{
 g.fillStyle(c,a);g.fillEllipse(x,y,w,h);
};
const rounded=(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,r:number,c:number,a=1)=>{
 g.fillStyle(c,a);g.fillRoundedRect(x,y,w,h,r);
};
export function paintHero(
 g:Phaser.GameObjects.Graphics,seat:Seat,
 time=0,velocityX=0,velocityY=0,injured=false
):void{
 g.clear();
 const airborne=Math.abs(velocityY)>95;
 const running=Math.abs(velocityX)>40&&!airborne;
 const cycle=time*.017+seat*.5;
 const stride=running?Math.sin(cycle)*5.1:airborne?2.8:Math.sin(time*.0025)*.65;
 const armSwing=running?Math.sin(cycle)*3.7:airborne?-3:Math.sin(time*.0025)*.4;
 const lift=running?Math.abs(Math.sin(cycle))*1.2:0;
 const coat=CHARACTER_COLORS[seat],accent=LIGHT[seat],face=SKIN[seat];
 // Feet, trousers and outlined silhouette: remain visually anchored to the old collision box.
 g.lineStyle(8,OUTLINE,1);
 g.lineBetween(-7,10,-7-stride,20-lift);
 g.lineBetween(7,10,7+stride,20-lift);
 g.lineStyle(5,seat===2?0x214b65:0x35403d,1);
 g.lineBetween(-7,11,-7-stride,20-lift);
 g.lineBetween(7,11,7+stride,20-lift);
 rounded(g,-16-stride,17-lift,14,8,3,OUTLINE);
 rounded(g,2+stride,17-lift,14,8,3,OUTLINE);
 rounded(g,-14-stride,18-lift,11,5,2,seat===2?0x6bb4e0:0x53624b);
 rounded(g,3+stride,18-lift,11,5,2,seat===2?0x6bb4e0:0x53624b);
 // Arms behind the torso, with contrasting hands.
 g.lineStyle(9,OUTLINE,1);
 g.lineBetween(-12,-8,-16-armSwing,5);
 g.lineBetween(12,-8,16+armSwing,5);
 g.lineStyle(6,coat,1);
 g.lineBetween(-12,-8,-16-armSwing,4);
 g.lineBetween(12,-8,16+armSwing,4);
 ellipse(g,-16-armSwing,6,7,7,face);
 ellipse(g,16+armSwing,6,7,7,face);
 rounded(g,-15,-16,30,32,7,OUTLINE);
 rounded(g,-12,-13,24,26,5,coat);
 rounded(g,-10,-12,7,20,3,accent,.25);
 rounded(g,-10,0,20,4,2,accent,.9);
 rounded(g,-4,7,8,5,2,OUTLINE);
 rounded(g,-2,8,4,2,1,0xd8c588);
 // Distinctive outfits readable even at mobile scale.
 if(seat===0){
  rounded(g,-11,-11,5,11,2,0x245a3c);
  rounded(g,7,-11,4,11,2,0x245a3c);
  rounded(g,-4,-11,8,7,2,0xb1e6a0,.8);
 }else if(seat===1){
  g.lineStyle(2,0x6b4335,1);g.lineBetween(5,-11,10,6);
  rounded(g,6,2,6,8,2,0x6c4531);
  rounded(g,-9,-11,5,9,2,0xf5c48b,.6);
 }else{
  rounded(g,-12,-11,24,5,2,0x9edaf5,.95);
  rounded(g,-3,-11,6,12,2,0x2b648a);
  rounded(g,7,2,5,8,2,0x204c68);
 }
 // Ears and the face outline. Two eyes always face the player; no side-eye occlusion.
 ellipse(g,-13,-25,7,10,OUTLINE);
 ellipse(g,13,-25,7,10,OUTLINE);
 ellipse(g,0,-26,29,26,OUTLINE);
 ellipse(g,0,-26,25,22,face);
 ellipse(g,-8,-23,5,3,0xf5c9a7,.32);
 ellipse(g,8,-23,5,3,0xf5c9a7,.32);
 // Hair silhouette and individualized headwear stay above, not across, the eye line.
 ellipse(g,0,-36,27,11,HAIR[seat]);
 if(seat===0){
  rounded(g,-17,-41,34,8,3,0x275c3d);
  rounded(g,-11,-47,22,12,4,0x397f4d);
  rounded(g,-8,-45,16,3,1,0x71b576);
  rounded(g,-3,-40,6,3,1,0xe1d07c);
 }else if(seat===1){
  ellipse(g,14,-25,10,26,0x4c2b2a);
  ellipse(g,-12,-33,10,17,0x59332e);
  ellipse(g,-3,-38,25,13,0x59332e);
  ellipse(g,-8,-37,10,6,0x724238);
  rounded(g,9,-32,5,5,2,0xe8bb75);
 }else{
  rounded(g,-17,-42,34,10,5,0x245c7c);
  rounded(g,-14,-45,28,5,2,0x3b7fa7);
  g.lineStyle(2,0xa5d9f4,.95);
  g.lineBetween(-13,-34,13,-34);
 }
 // Explicit left/right sclera and pupils: symmetric and separated by a skin bridge.
 ellipse(g,-5,-26,6.5,6.5,0xf8f5e7);
 ellipse(g,5,-26,6.5,6.5,0xf8f5e7);
 ellipse(g,-4.7,-25.8,3,3.8,0x182a30);
 ellipse(g,5.3,-25.8,3,3.8,0x182a30);
 ellipse(g,-5.4,-27,1.1,1.1,0xffffff);
 ellipse(g,4.6,-27,1.1,1.1,0xffffff);
 // Brows, nose and a small warm smile; no line crosses either eye.
 g.lineStyle(1.6,HAIR[seat],.85);
 g.lineBetween(-8,-31,-3,-31.5);
 g.lineBetween(3,-31.5,8,-31);
 ellipse(g,0,-22,2.6,2.2,0x9d674f,.6);
 g.lineStyle(1.5,0x7d4b42,.95);
 g.beginPath();g.arc(0,-21,3.4,.15,Math.PI-.15,false);g.strokePath();
 if(airborne){
  g.lineStyle(2,accent,.8);g.lineBetween(-11,17,-8,20);
 }else if(!running){
  rounded(g,-6,3,12,2,1,0xe9f7e0,.2);
 }
 if(injured){
  g.lineStyle(2.5,0xff9c93,.8);
  g.strokeRoundedRect(-19,-49,38,76,8);
 }
}
