import Phaser from 'phaser';
import type {TreePlatform,TreeShelter,TreeWindPhase} from './treetopForest';
import type {Pose,Seat} from './network';

/** Original, deterministic cinematic treetop illustration. No assets or ground colliders. */
const noise=(n:number)=>{const f=Math.sin(n*127.1+6.3)*43758.5453;return f-Math.floor(f);};
const pick=(n:number,a:number,b:number)=>a+noise(n)*(b-a);
type Actor={target:Phaser.GameObjects.Rectangle;ink:Phaser.GameObjects.Graphics;shadow:Phaser.GameObjects.Ellipse;seat:Seat};
export class TreetopArt {
 private actors:Actor[]=[];
 private vines:Phaser.GameObjects.Graphics;
 private weather:Phaser.GameObjects.Graphics;
 private crown:Phaser.GameObjects.Graphics;
 private mist:Phaser.GameObjects.Ellipse[]=[];
 private shelterGlows:Phaser.GameObjects.Ellipse[]=[];
 private lastWeather:TreeWindPhase='calm';
 constructor(private scene:Phaser.Scene,private width:number,private height:number){
  this.paintForest();
  this.vines=scene.add.graphics().setDepth(19);
  this.weather=scene.add.graphics().setDepth(49);
  this.crown=scene.add.graphics().setDepth(22);
 }
 private paintForest():void{
  const sky=this.scene.add.graphics().setDepth(-100);
  sky.fillGradientStyle(0x05141d,0x061b24,0x143746,0x061b2a,1);
  sky.fillRect(0,0,this.width,this.height);
  const moon=this.scene.add.graphics().setDepth(-94).setScrollFactor(.35,.3);
  for(let i=9;i>=1;i--){moon.fillStyle(0x90c4d9,.006);moon.fillCircle(810,180,42+i*31);}
  moon.fillStyle(0xddf4e3,.83);moon.fillCircle(810,180,54);
  moon.fillStyle(0x7fa9a4,.3);moon.fillEllipse(793,166,26,19);
  for(let i=0;i<13;i++){
   const x=pick(i*7+8,0,this.width),y=pick(i*23+5,15,350);
   moon.fillStyle(0xd2efe6,pick(i+6,.15,.56));moon.fillCircle(x,y,pick(i+34,.8,2));
  }
  // Rays filtered by giant boughs, composed once.
  const beams=this.scene.add.graphics().setDepth(-76);
  for(const i of [0,1,2,3,4]){
   beams.fillStyle(0xbadcca,.018);
   const x=450+i*1020;
   beams.fillTriangle(x,-20,x+350,0,x+850,this.height);
  }
  // Multiple true parallax layers, never a ground-colored strip.
  for(let layer=0;layer<4;layer++){
   const ink=this.scene.add.graphics().setDepth(-65+layer*8)
    .setScrollFactor(.27+layer*.19,.42+layer*.1);
   const trunkColor=[0x0a2533,0x0c3437,0x16463e,0x184b3a][layer];
   const foliage=[0x12323e,0x164544,0x1d5449,0x245a49][layer];
   const step=layer===0?400:layer===1?350:layer===2?300:250;
   for(let x=0;x<this.width+400;x+=step){
    const base=x+pick(x+layer,-95,95);
    const wide=pick(x+layer+17,35,83)*(1+layer*.22);
    const top=pick(x+layer+32,-40,195);
    ink.fillStyle(trunkColor,.79);
    ink.fillRoundedRect(base-wide/2,top,wide,this.height-top+330,wide/3);
    for(let branch=0;branch<5;branch++){
     const yy=top+140+branch*165;
     const dx=(branch%2?1:-1)*pick(x+branch*7,130,270);
     ink.lineStyle(pick(branch+x,18,43),trunkColor,.95);
     ink.lineBetween(base,yy,base+dx,yy-92);
     ink.fillStyle(foliage,.66);
     ink.fillEllipse(base+dx,yy-124,240+layer*34,100+layer*24);
     ink.fillEllipse(base+dx+(branch%2?55:-55),yy-145,125,120);
    }
   }
  }
  // Foreground megatrees with irregular bark, giant natural branches and crowns.
  const trees=[1030,1660,2290,2880,3260,3750,4100,4580,5100];
  for(let i=0;i<trees.length;i++){
   const x=trees[i],width=pick(i+28,110,205),lean=Math.sin(i*1.7)*50;
   const ink=this.scene.add.graphics().setDepth(4);
   ink.fillStyle(0x0c292a,.93);
   ink.fillPoints([
    new Phaser.Geom.Point(x-width/2+lean,-160),
    new Phaser.Geom.Point(x+width/2+lean,-160),
    new Phaser.Geom.Point(x+width/2+38,this.height+160),
    new Phaser.Geom.Point(x-width/2-44,this.height+160)],true);
   ink.lineStyle(8,0x42674a,.65);
   for(let line=0;line<5;line++){
    const edge=x-width/2+line*(width/5);
    ink.beginPath();ink.moveTo(edge+lean,-100);
    ink.lineTo(edge+Math.sin(line+i)*26,440);
    ink.lineTo(edge+Math.cos(line+i)*32,this.height+125);ink.strokePath();
   }
   for(let branch=0;branch<7;branch++){
    const yy=135+branch*170+(i%3)*46;
    const dx=(branch%2?1:-1)*(145+(branch%3)*45);
    ink.lineStyle(33+branch%3*7,0x244837,.9);
    ink.beginPath();ink.moveTo(x,yy+62);ink.lineTo(x+dx*.55,yy+12);
    ink.lineTo(x+dx,yy-72);ink.strokePath();
    ink.lineStyle(10,0x4a6d51,.34);
    ink.lineBetween(x+dx*.48,yy+2,x+dx,yy-74);
    ink.fillStyle([0x1c5946,0x17604d,0x287054][(i+branch)%3],.91);
    ink.fillEllipse(x+dx,yy-92,240,119);
    ink.fillEllipse(x+dx+(branch%2?55:-55),yy-113,148,139);
   }
  }
  // Fog is BELOW the playable canopy, reinforcing the height of the abyss.
  for(let i=0;i<7;i++){
   const fog=this.scene.add.ellipse((i+.5)*this.width/7,1020+(i%3)*105,
    610,145,i%2?0x83b7ac:0x5e94a1,.052).setDepth(-2);
   this.mist.push(fog);
  }
  for(let i=0;i<75;i++){
   const x=pick(200+i,0,this.width),y=pick(400+i,120,980);
   const dot=this.scene.add.circle(x,y,pick(600+i,.8,2.2),0xc4df9c,
    pick(i*17,.1,.32)).setDepth(5);
   this.scene.tweens.add({targets:dot,alpha:pick(i+2,.02,.38),
    duration:2400+i%7*380,yoyo:true,repeat:-1});
  }
 }
 branch(platform:TreePlatform):void{
  const g=this.scene.add.graphics().setDepth(platform.puzzle?17:16);
  const {x,y,width,height}=platform;
  const l=x-width/2,r=x+width/2,top=y-height/2;
  const bridge=platform.material==='bridge',canopy=platform.material==='canopy';
  const seed=x*.37+y*.61;
  // Root taper and bark are visually irregular, while the top remains collision-flat.
  if(bridge){
   g.lineStyle(5,0x8b9f7c,.79);
   g.lineBetween(l,top-9,r,top-9);
   g.lineBetween(l,top+15,r,top+15);
   for(let n=0;n<Math.ceil(width/27);n++){
    const xx=l+n*27;
    g.fillStyle(n%2?0x594432:0x70543c,.96);
    g.fillRoundedRect(xx,top-4,25,height+10,4);
    g.lineStyle(1,0xc7a87c,.63);g.lineBetween(xx+4,top,xx+20,top);
    if(n%3===0){g.lineStyle(2,0x4b775b,.62);g.lineBetween(xx,top+height,xx-6,top+46);}
   }
  }else{
   g.fillStyle(0x1a2f2c,.95);
   g.fillPoints([
    new Phaser.Geom.Point(l+5,top+3),new Phaser.Geom.Point(l+width*.28,top-2),
    new Phaser.Geom.Point(r-10,top-3),new Phaser.Geom.Point(r+8,top+height*.8),
    new Phaser.Geom.Point(x+width*.22,top+height+11),
    new Phaser.Geom.Point(x-width*.15,top+height+34),
    new Phaser.Geom.Point(l-6,top+height*.8)],true);
   g.fillStyle(canopy?0x32593d:0x594432,.97);
   g.fillPoints([
    new Phaser.Geom.Point(l,top+3),new Phaser.Geom.Point(l+13,top-4),
    new Phaser.Geom.Point(x,top-5),new Phaser.Geom.Point(r-9,top-6),
    new Phaser.Geom.Point(r,top+4),new Phaser.Geom.Point(r-13,top+17),
    new Phaser.Geom.Point(x,top+height+6),new Phaser.Geom.Point(l+18,top+19)],true);
   g.fillStyle(0x8a6946,.63);g.fillEllipse(x,top+5,width*.94,9);
   g.lineStyle(2,0xc49b6a,.48);g.lineBetween(l+14,top-3,r-10,top-4);
   // Knots, bark rings and bifurcations.
   for(let i=0;i<Math.ceil(width/37);i++){
    const xx=l+19+i*36;
    g.lineStyle(2,i%2?0x2e422e:0x94714b,.53);
    g.lineBetween(xx,top+12,xx+pick(i+seed,-12,13),top+height+9);
    if(i%3===1){g.fillStyle(0x2e2d29,.75);g.fillEllipse(xx,top+12,10,6);}
   }
   const ends=[l+width*.18,r-width*.13];
   for(let i=0;i<2;i++){
    g.lineStyle(12,0x4d4933,.78);
    g.lineBetween(ends[i],top+height,ends[i]+(i?35:-40),top+height+38);
   }
   for(let i=0;i<Math.ceil(width/27);i++){
    const xx=l+10+i*28;
    g.lineStyle(2,i%2?0x79a35e:0x658e5b,.7);
    g.lineBetween(xx,top-5,xx-4,top-12-(i%3)*3);
    g.lineBetween(xx,top-5,xx+4,top-12);
   }
  }
 }
 shelter(zone:TreeShelter):void{
  const {x,y,radius}=zone;
  const g=this.scene.add.graphics().setDepth(20);
  const top=y-82;
  g.fillStyle(0x183a33,.9);
  g.fillEllipse(x,top+23,radius*2+30,112);
  g.lineStyle(15,0x3c6445,.95);
  g.beginPath();g.moveTo(x-radius*.96,y+26);
  g.lineTo(x-radius*.83,top+20);g.lineTo(x-radius*.27,top-14);
  g.lineTo(x+radius*.34,top-16);g.lineTo(x+radius*.78,top+14);
  g.lineTo(x+radius*.94,y+25);g.strokePath();
  if(zone.kind==='hollow'){
   g.fillStyle(0x061e23,.94);g.fillEllipse(x,y-34,radius*1.18,78);
   g.lineStyle(7,0x9c8b54,.78);g.strokeEllipse(x,y-34,radius*1.2,82);
  }else{
   for(let i=-2;i<=2;i++){
    g.lineStyle(9,0x587351,.78);g.lineBetween(x+i*radius*.19,top+18,
     x+i*radius*.31,y+36);
   }
  }
  g.fillStyle(0xc7e99e,.37);g.fillCircle(x,top-27,12);
  const glow=this.scene.add.ellipse(x,y-39,radius*1.6,66,0x8ac896,.035).setDepth(21);
  this.shelterGlows.push(glow);
  // Small environmental pictogram, not a giant gameplay instruction.
  this.scene.add.text(x,top-53,'✦ ABRIGO',{fontFamily:'Arial',fontSize:'11px',
   fontStyle:'bold',color:'#b2d8a0',stroke:'#09221d',strokeThickness:3})
   .setOrigin(.5).setDepth(24);
 }
 character(target:Phaser.GameObjects.Rectangle,seat:Seat):void{
  const ink=this.scene.add.graphics().setDepth(42);
  const shadow=this.scene.add.ellipse(target.x,target.y+22,42,10,0x03150e,.52).setDepth(15);
  target.setFillStyle(0xffffff,.001).setStrokeStyle(1,0xffffff,.001);
  this.actors.push({target,ink,shadow,seat});
 }
 private drawActor(g:Phaser.GameObjects.Graphics,seat:Seat,motion:number,air:boolean):void{
  g.clear();
  const swing=air?4:Math.sin(motion)*5;
  const coats=[0x399d69,0xd78a4b,0x488ec8];
  const trims=[0x9fe4a1,0xf3be77,0x98d9f6];
  const hair=[0x1e3628,0x482b2e,0x1b3949];
  g.fillStyle(0x07151b,.96);
  g.fillRoundedRect(-18,-21,36,44,7);
  g.fillStyle(0x253436);g.fillRoundedRect(-15,7,12,16,3);
  g.fillRoundedRect(4,7,12,16,3);
  g.lineStyle(6,0x122b30,1);g.lineBetween(-8,8,-9+swing,22);
  g.lineBetween(9,8,8-swing,22);
  g.fillStyle(coats[seat],1);g.fillRoundedRect(-13,-12,26,26,5);
  g.lineStyle(5,coats[seat],1);g.lineBetween(-12,-7,-18-swing,-1);
  g.lineBetween(12,-7,17+swing,0);
  g.fillStyle(0xdbaa83);g.fillEllipse(0,-23,26,23);
  g.fillStyle(hair[seat]);g.fillEllipse(0,-32,29,13);
  if(seat===0){
   g.fillStyle(0x275332);g.fillRoundedRect(-19,-35,38,8,3);
   g.fillRoundedRect(-10,-45,20,14,3);
   g.fillStyle(0xe0cc77);g.fillRect(-3,-37,7,3);
  }else if(seat===1){
   g.fillStyle(0x5f342f);g.fillEllipse(11,-21,14,24);
   g.fillEllipse(-3,-33,26,14);
   g.fillStyle(0xe6d389);g.fillEllipse(-4,-8,8,4);
  }else{
   g.fillStyle(0x1c4565);g.fillRoundedRect(-18,-37,36,14,7);
   g.fillStyle(0xa4d8ef);g.fillRoundedRect(-15,-10,30,6,2);
   g.lineStyle(2,0x7fd0fb);g.strokeRoundedRect(-18,-38,36,29,8);
  }
  g.fillStyle(0xffffff);g.fillCircle(5,-24,3.1);
  g.fillStyle(0x192a30);g.fillCircle(5.7,-24,1.3);
  g.lineStyle(2,trims[seat]);g.lineBetween(-10,3,10,3);
  g.lineStyle(2,0x041b1e,.7);g.strokeRoundedRect(-14,-13,28,28,6);
 }
 update(time:number,poses:readonly Pose[],phase:TreeWindPhase,direction:-1|1,
  gustCount:number):void{
  const intensity=phase==='gust'?1:phase==='warning'?.45:.16;
  for(const entry of this.actors){
   const actor=entry.target,pose=poses[entry.seat];
   const moving=Math.abs(pose?.vx??0)>25;
   this.drawActor(entry.ink,entry.seat,time*(moving?.016:.003)+entry.seat,
    Math.abs(pose?.vy??0)>125);
   entry.ink.setPosition(actor.x,actor.y);
   entry.shadow.setPosition(actor.x,actor.y+26);
   entry.shadow.setAlpha(Math.abs(pose?.vy??0)>120?.20:.5);
  }
  this.vines.clear();this.vines.lineStyle(3,0x72a889,.53);
  for(let i=0;i<32;i++){
   const x=160+i*160,y=80+(i%5)*115;
   const sway=Math.sin(time*.0019+i*.71)*(8+intensity*25);
   this.vines.beginPath();this.vines.moveTo(x,y);this.vines.lineTo(x+sway*.4,y+49);
   this.vines.lineTo(x+sway,y+116);this.vines.strokePath();
  }
  this.crown.clear();this.crown.fillStyle(0x397b56,.25);
  for(let i=0;i<32;i++){
   const x=160+i*167,y=80+(i%6)*159;
   this.crown.fillEllipse(x+Math.sin(time*.001+i)*intensity*14,y,90,29);
  }
  this.weather.clear();
  const count=phase==='gust'?95:phase==='warning'?55:27;
  const shift=time*(phase==='gust'?.32:phase==='warning'?.14:.045)*direction;
  for(let i=0;i<count;i++){
   const x=((pick(i*3+44,0,this.width)+shift)%this.width+this.width)%this.width;
   const y=pick(i*7+832,80,this.height-130);
   this.weather.fillStyle(i%3?0xa0cba1:0xc8dca3,phase==='gust'?.55:.24);
   this.weather.fillEllipse(x,y+Math.sin(i*1.7+time*.003)*9,phase==='gust'?12:7,3);
  }
  if(phase==='warning'||phase==='gust'){
   const ink=this.weather;
   ink.lineStyle(phase==='gust'?2:1,0x9bd3cd,phase==='gust'?.30:.18);
   for(let i=0;i<(phase==='gust'?17:7);i++){
    const x=pick(i*17+gustCount,0,this.width);
    const y=pick(i*12+25,60,this.height-160);
    const slide=direction*(phase==='gust'?170:65);
    ink.lineBetween(x,y,x+slide,y+Math.sin(i)*8);
   }
  }
  for(let i=0;i<this.mist.length;i++){
   const fog=this.mist[i];
   fog.x=(i+.5)*this.width/7+Math.sin(time*.00022+i*2)*45;
   fog.alpha=.038+Math.sin(time*.00035+i)*.014+intensity*.013;
  }
  for(let i=0;i<this.shelterGlows.length;i++){
   this.shelterGlows[i].alpha=.03+(.5+.5*Math.sin(time*.002+i))*.055+
    (phase==='gust'?.035:0);
  }
  this.lastWeather=phase;
  void this.lastWeather;
 }
}
