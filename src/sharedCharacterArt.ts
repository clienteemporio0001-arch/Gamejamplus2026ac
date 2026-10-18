import Phaser from 'phaser';
import type {Seat} from './network';

/** One shared hand-drawn procedural character style for all four adventure biomes.
 * No collision body is generated: scenes preserve their original Rectangle bodies.
 */
export const CHARACTER_COLORS=[0x369e69,0xcf8545,0x4b95ca] as const;
export function paintHero(
 g:Phaser.GameObjects.Graphics,seat:Seat,
 time=0,velocityX=0,velocityY=0,injured=false
):void{
 g.clear();
 const airborne=Math.abs(velocityY)>95;
 const running=Math.abs(velocityX)>40&&!airborne;
 const stride=running?Math.sin(time*.017+seat*.8)*5:airborne?3:Math.sin(time*.0025)*.75;
 const lift=running?Math.abs(Math.sin(time*.017))*1.4:0;
 const coat=CHARACTER_COLORS[seat],accent=[0xa2eba5,0xfac382,0x9cdaef][seat];
 const face=[0xd4a37c,0xd8ac86,0xc89372][seat];
 // Common silhouette & outline, leg separation communicates running and jumps.
 g.fillStyle(0x101b23,1);g.fillRoundedRect(-17,-21,34,45,7);
 g.lineStyle(6,0x1b2930);
 g.lineBetween(-8,11,-8-stride,24-lift);
 g.lineBetween(9,11,9+stride,24-lift);
 g.fillStyle(0x22343a,1);
 g.fillRoundedRect(-15-stride,18-lift,12,8,3);
 g.fillRoundedRect(4+stride,18-lift,12,8,3);
 g.fillStyle(coat,1);g.fillRoundedRect(-13,-14,26,28,5);
 g.lineStyle(6,coat,1);
 g.lineBetween(-12,-7,-18+stride*.65,4+Math.abs(stride)*.7);
 g.lineBetween(12,-7,17-stride*.65,4-Math.abs(stride)*.7);
 // Shoulder accents, buckle and colored character identity.
 g.fillStyle(accent,.85);g.fillRoundedRect(-10,0,20,4,2);
 g.fillStyle(0x2c3a36,.96);g.fillRoundedRect(-4,8,8,5,2);
 g.fillStyle(face,1);g.fillEllipse(0,-25,25,22);
 g.fillStyle([0x203a29,0x4a2927,0x1c364a][seat],1);
 g.fillEllipse(-2,-35,29,14);
 if(seat===0){
  g.fillStyle(0x2a5c38,1);g.fillRoundedRect(-19,-39,38,9,3);
  g.fillRoundedRect(-11,-47,22,13,4);
  g.fillStyle(0xe1d07c,.9);g.fillRoundedRect(-2,-40,6,3,1);
 }else if(seat===1){
  g.fillStyle(0x59332e,1);g.fillEllipse(12,-25,14,27);
  g.fillEllipse(-5,-36,26,15);
  g.fillStyle(0xe5c782,1);g.fillEllipse(-5,-12,8,4);
 }else{
  g.fillStyle(0x235676,1);g.fillRoundedRect(-18,-42,36,14,6);
  g.lineStyle(3,0x9dd9f5,1);g.strokeRoundedRect(-18,-43,36,28,7);
  g.fillStyle(0xa5e4ff,.82);g.fillRoundedRect(-12,-8,24,5,2);
 }
 g.fillStyle(0xf4fff3);g.fillCircle(5,-26,3.3);
 g.fillStyle(0x152832);g.fillCircle(5.8,-26,1.5);
 if(airborne){
  g.lineStyle(2,accent,.8);g.lineBetween(-11,18,-8,21);
 }else if(!running){
  g.fillStyle(0xe9f7e0,.25);g.fillRoundedRect(-7,3,14,3,1);
 }
 if(injured){
  g.lineStyle(3,0xff9c93,.8);
  g.strokeRoundedRect(-19,-48,38,76,8);
 }
}
