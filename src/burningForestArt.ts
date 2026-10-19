import Phaser from 'phaser';
import {paintHero} from './sharedCharacterArt';
import {createKenneyCharacter,updateKenneyCharacter} from './kenneyCharacterSprites';
import {escapeWallX} from './jamChallenges';
import type {Seat,Pose} from './network';
import {FIRE_WIDTH,FIRE_HEIGHT,FIRE_SMOKE_ZONE,FIRE_TREE_DANGER,FIRE_TARGETS,
 FIRE_PLATFORMS,FIRE_SHELTERS,fireballHazards,fireFlareActive,fireVisualTreePhase,
 type FirePlatform,type FireWorld} from './burningForest';

const hash=(a:number)=>{const n=Math.sin(a*127.1+14.58)*43758.5453;return n-Math.floor(n)};
type Figure={target:Phaser.GameObjects.Rectangle;ink:Phaser.GameObjects.Graphics;sprite:Phaser.GameObjects.Sprite|null;seat:Seat};
export class BurningForestArt {
 private fire!:Phaser.GameObjects.Graphics;
 private chase!:Phaser.GameObjects.Graphics;
 private impactSprites=new Map<number,Phaser.GameObjects.Sprite>();
 private sparks!:Phaser.GameObjects.Graphics;
 private smokeInk!:Phaser.GameObjects.Graphics;
 private embers!:Phaser.GameObjects.Graphics;
 private fireballs!:Phaser.GameObjects.Graphics;
 private figures:Figure[]=[];
 private tree!:Phaser.GameObjects.Container;
 private shadows:Phaser.GameObjects.Ellipse[]=[];
 private status!:Phaser.GameObjects.Text;
 constructor(private scene:Phaser.Scene){
  this.makeBackground();
  this.chase=scene.add.graphics().setDepth(39);
 }
 private makeBackground():void{
  const back=this.scene.add.graphics().setDepth(-90);
  back.fillGradientStyle(0x1a101a,0x36161b,0x823a20,0x1b1d22,1);
  back.fillRect(0,0,FIRE_WIDTH,FIRE_HEIGHT);
  const horizon=this.scene.add.graphics().setDepth(-80);
  for(let i=0;i<15;i++){
   const x=200+i*360,scale=85+i%4*23;
   horizon.fillStyle(0xee7139,.026);horizon.fillEllipse(x,395,scale*5,260);
   horizon.fillStyle(0xffad59,.025);horizon.fillEllipse(x,428,scale*2,120);
  }
  const moon=this.scene.add.graphics().setDepth(-76).setScrollFactor(.5);
  for(let i=6;i>=1;i--){moon.fillStyle(0xffb261,.008);moon.fillCircle(3750,144,48+i*31);}
  moon.fillStyle(0xffcb80,.54);moon.fillCircle(3750,144,51);
  // Distant trees: several parallax layers with sparse silhouettes.
  for(let layer=0;layer<4;layer++){
   const g=this.scene.add.graphics().setDepth(-65+layer*7)
    .setScrollFactor(.28+layer*.2,.7);
   const colors=[0x241d23,0x2d2322,0x302723,0x302521];
   const spacing=layer===0?190:layer===1?151:layer===2?127:103;
   for(let x=-150;x<FIRE_WIDTH+400;x+=spacing){
    const trunkX=x+(hash(x*1.7+layer)-.5)*65;
    const height=155+hash(x*.36+layer*5)*330+layer*25;
    const y=676-height;
    g.lineStyle(11+layer*6,colors[layer],.83);
    g.beginPath();g.moveTo(trunkX,696);g.lineTo(trunkX-12,y);g.strokePath();
    for(let b=0;b<5;b++){
     const yy=y+45+b*45,dx=(b%2?1:-1)*(28+b*8+layer*5);
     g.lineStyle(4+layer*2,colors[layer],.82);
     g.lineBetween(trunkX-10,yy+20,trunkX+dx,yy-34);
    }
    if((Math.floor(x/spacing)+layer)%4===0){
     g.fillStyle(0xdd582b,.16+layer*.035);
     g.fillEllipse(trunkX,y+105,75+layer*9,145);
    }
   }
  }
  // Drastic burn progression: lively at entrance, devastated near exit.
  for(let i=0;i<32;i++){
   const x=i*165+78,burn=i/32;
   const g=this.scene.add.graphics().setDepth(-5);
   const stem=40+hash(i*9)*43;
   g.lineStyle(stem,0x251e1d,.94);
   g.beginPath();g.moveTo(x,675);g.lineTo(x-24,270+hash(i+15)*130);g.strokePath();
   g.lineStyle(6,0x5f3225,.5);
   g.lineBetween(x-16,610,x-29,350);
   for(let b=0;b<5;b++){
    const yy=318+b*55,dir=b%2?1:-1;
    g.lineStyle(8+b%2*5,0x302321,.96);
    g.lineBetween(x-15,yy+48,x+dir*(45+b*10),yy-30);
    if(burn<.55&&hash(i*4+b)>.53){
     g.fillStyle(b%2?0x57462f:0x4d3e2a,.46);
     g.fillEllipse(x+dir*(50+b*11),yy-44,125,75);
    }
   }
   if(burn>.36||i%3===0){
    g.fillStyle(0xf07634,.28+burn*.24);
    g.fillEllipse(x-21,402,stem*2.2,72);
   }
  }
  const earth=this.scene.add.graphics().setDepth(3);
  for(let i=0;i<100;i++){
   const x=hash(i*3.18)*FIRE_WIDTH,y=694+hash(i*.56)*102;
   earth.lineStyle(2,0x976048,.33);
   earth.lineBetween(x,y,x+hash(i+17)*28,y+3);
  }
  // A safe river is visible far to the right, beyond the fire.
  const river=this.scene.add.graphics().setDepth(-1);
  river.fillGradientStyle(0x123d45,0x24656d,0x163b49,0x163646,.82);
  river.fillRect(4910,645,290,180);
  river.lineStyle(4,0x94bbc5,.69);
  for(let i=0;i<8;i++)river.lineBetween(4910+i*35,660+i%3*9,4935+i*35,660+i%3*9);
  const safety=this.scene.add.graphics().setDepth(6);
  safety.fillStyle(0x233d34,.89);safety.fillEllipse(5070,661,310,50);
  safety.fillStyle(0x6b855b,.45);safety.fillEllipse(5070,655,260,23);
  this.scene.add.text(5010,566,'MARGEM SEGURA',{fontFamily:'Arial',fontSize:'20px',
    fontStyle:'bold',color:'#c5e8d3',stroke:'#132924',strokeThickness:5})
   .setOrigin(.5).setDepth(39);
  this.fire=this.scene.add.graphics().setDepth(14);
  this.sparks=this.scene.add.graphics().setDepth(46);
  this.smokeInk=this.scene.add.graphics().setDepth(35);
  this.embers=this.scene.add.graphics().setDepth(47);
  this.fireballs=this.scene.add.graphics().setDepth(48);
  // Charred-stone shelters: visible roof, warm protected interior, open sides.
  // Art and authority share FIRE_SHELTERS, so protection matches the image.
  for(const spot of FIRE_SHELTERS){
   const g=this.scene.add.graphics().setDepth(32);
   const x=spot.x;
   g.fillStyle(0x141d1e,.68);g.fillRoundedRect(x-68,575,136,99,17);
   g.lineStyle(12,0x514d4c,.95);
   g.lineBetween(x-72,667,x-72,560);g.lineBetween(x+72,667,x+72,560);
   g.fillStyle(0x2a2a29,.98);g.fillRoundedRect(x-89,547,178,25,9);
   g.lineStyle(3,0xd6a36c,.9);g.lineBetween(x-73,551,x+73,551);
   g.fillStyle(0xffb04d,.12);g.fillEllipse(x,608,118,95);
   this.scene.add.text(x,523,'✦ ABRIGO DO FOGO',{fontFamily:'Arial',
    fontSize:'14px',fontStyle:'bold',color:'#ffe4b0',
    stroke:'#201713',strokeThickness:4}).setOrigin(.5).setDepth(36);
  }
  for(let i=0;i<6;i++){
   const x=2350+i*135;
   this.shadows.push(this.scene.add.ellipse(x,545,170,230,0x333038,.11)
     .setDepth(33));
  }
  this.status=this.scene.add.text(0,0,'',{fontFamily:'Arial',fontSize:'15px',
   fontStyle:'bold',color:'#ffdda5',stroke:'#2c1315',strokeThickness:5})
   .setOrigin(.5).setDepth(195).setScrollFactor(0);
  // Above the unstable section, a charred giant trunk visibly shakes, then falls.
  const burnt=this.scene.add.graphics();
  burnt.fillStyle(0x1f2021,.95);burnt.fillRoundedRect(-38,-340,76,450,27);
  burnt.fillStyle(0x553026,.75);burnt.fillRoundedRect(-12,-290,13,345,6);
  burnt.lineStyle(30,0x261c1c,.94);
  burnt.lineBetween(-12,-210,130,-305);burnt.lineBetween(15,-100,-125,-225);
  burnt.fillStyle(0x863723,.64);burnt.fillEllipse(-20,-180,47,65);
  this.tree=this.scene.add.container(3960,585,[burnt]).setDepth(18);
 }
 platform(b:FirePlatform):Phaser.GameObjects.Graphics{
  const g=this.scene.add.graphics().setDepth(12);
  const top=b.y-b.height/2,l=b.x-b.width/2,r=b.x+b.width/2;
  if(b.material==='bridge'){
   g.fillStyle(0x2e2420,.98);
   g.fillRoundedRect(l,top-7,b.width,b.height+18,11);
   g.lineStyle(6,0x663e2a,.86);g.lineBetween(l+15,top+2,r-15,top+2);
   g.lineStyle(3,0xe37b39,.46);g.lineBetween(l+30,top+14,r-30,top+14);
   for(let i=0;i<b.width/49;i++){
    const x=l+i*49;
    g.lineStyle(3,0x241d1c,.67);g.lineBetween(x,top-5,x+8,top+15);
   }
  }else{
   const base=b.material==='earth'?0x292a27:b.material==='rock'?0x37322f:0x4b3227;
   g.fillStyle(0x171c1c,.94);
   g.fillRoundedRect(l-2,top-5,b.width+4,b.height+14,4);
   g.fillStyle(base,.97);g.fillRoundedRect(l,top,b.width,b.height+2,3);
   g.lineStyle(2,b.material==='rock'?0x8c7160:0x75644d,.7);
   g.lineBetween(l+3,top+3,r-3,top+3);
   const patches=Math.min(60,Math.ceil(b.width/45));
   for(let i=0;i<patches;i++){
    const x=l+10+i*b.width/patches;
    g.fillStyle(i%2?0x655146:0x754733,.4);
    g.fillEllipse(x,top+4+(i%3)*6,16+i%4*3,4);
    if(b.material==='wood'){
     g.lineStyle(2,0x261c1a,.68);g.lineBetween(x,top+4,x+7,top+b.height-1);
    }
   }
  }
  return g;
 }
 target(x:number,y:number,seat:Seat):void{
  const ink=this.scene.add.graphics().setDepth(25);
  const tint=[0xb5f2ad,0xe6b077,0x91c7ea][seat];
  ink.fillStyle(tint,.25);ink.fillCircle(x,y,18);
  ink.lineStyle(3,tint,.93);ink.strokeCircle(x,y,11);
  ink.fillStyle(0x241f24,.9);ink.fillCircle(x,y,5);
  ink.lineStyle(3,tint,.8);ink.lineBetween(x-4,y-4,x+4,y+4);
  // No giant instructions; Pipo identifies which person can trigger a target.
 }
 character(target:Phaser.GameObjects.Rectangle,seat:Seat):void{
  target.setFillStyle(0xffffff,.001).setStrokeStyle(1,0xffffff,.001);
  const ink=this.scene.add.graphics().setDepth(42);
  const sprite=createKenneyCharacter(this.scene,target,seat,42.1);
  if(sprite)ink.setVisible(false);
  this.figures.push({target,ink,sprite,seat});
 }
 private drawFigure(ink:Phaser.GameObjects.Graphics,seat:Seat,pose:Pose,ms:number):void{
  paintHero(ink,seat,ms,pose.vx,pose.vy);
 }
 update(w:FireWorld,poses:readonly Pose[],ms:number,now:number,isSolo=false):void{
  this.fire.clear();this.sparks.clear();this.smokeInk.clear();this.embers.clear();
  this.fireballs.clear();
  this.chase.clear();
  const wall=escapeWallX(w.escapeAt,now,isSolo);
  if(wall!==null){
    // Entirely visual wall. Host authority calculates contact separately.
    const active=now-w.escapeAt>=4500;
    const opacity=active?.96:.42;
    this.chase.fillStyle(0xb93318,.16*opacity);
    this.chase.fillRect(4100,190,Math.max(0,wall-4100),520);
    for(let i=0;i<16;i++){
      const y=185+i*33;
      const pulse=10*Math.sin(now*.009+i*2.33);
      this.chase.fillStyle(i%3===0?0xffbd61:i%3===1?0xf56c28:0xd43b20,
        (i%3===0?.89:.7)*opacity);
      this.chase.fillTriangle(wall-40,y+36,wall+13,y+24,wall+pulse+17,y-39);
      this.chase.fillStyle(0xffd38b,.3*opacity);
      this.chase.fillEllipse(wall+5,y,22,65);
    }
    this.chase.lineStyle(4,0xffc56c,.75*opacity);
    this.chase.lineBetween(wall+22,180,wall+22,700);
  }
  for(const sprite of this.impactSprites.values())sprite.setVisible(false);
  const hasExplosion=this.scene.textures.exists('jam-explosion');
  // A soft ground warning precedes every fall, then a glowing projectile
  // and a brief impact burst. One batched Graphics object for performance.
  for(const b of fireballHazards(w,now)){
   if(b.phase==='warning'){
    const pulse=.7+.18*Math.sin(ms*.011+b.lane);
    this.fireballs.lineStyle(3,0xffbb59,pulse);
    this.fireballs.strokeEllipse(b.x,b.impactY+2,68,15);
    this.fireballs.fillStyle(0xff6c30,.12);
    this.fireballs.fillEllipse(b.x,b.impactY+1,59,11);
   }else if(b.phase==='fall'){
    this.fireballs.lineStyle(7,0xf2702d,.53);
    this.fireballs.lineBetween(b.x-w.windDirection*4,b.y-4,b.x-w.windDirection*17,b.y-32);
    this.fireballs.fillStyle(0xee4d21,.47);this.fireballs.fillCircle(b.x,b.y,21);
    this.fireballs.fillStyle(0xffb347,.88);this.fireballs.fillCircle(b.x,b.y,14);
    this.fireballs.fillStyle(0xffeead,1);this.fireballs.fillCircle(b.x-3,b.y-4,7);
   }else if(hasExplosion){
    // Twelve exact frames of Ansimuz Explosion 4 in the existing 520ms
    // damage window; no physics/hitboxes or projectile trajectories changed.
    let sprite=this.impactSprites.get(b.lane);
    if(!sprite){
      sprite=this.scene.add.sprite(b.x,b.y,'jam-explosion',0)
        .setDisplaySize(98,98).setOrigin(.5,.69).setDepth(50);
      this.impactSprites.set(b.lane,sprite);
    }
    const delay=1200+(b.lane*977)%4300;
    const elapsed=Math.max(0,now-w.cycleStart)-delay;
    const phaseMs=((elapsed%5700)+5700)%5700;
    const impactMs=Math.max(0,phaseMs-950-1450);
    const frame=Math.max(0,Math.min(11,Math.floor(impactMs*12/520)));
    sprite.setPosition(b.x,b.y+4).setFrame(frame).setVisible(true);
   }else{
    // Safe procedural fallback while assets are unavailable or loading.
    this.fireballs.fillStyle(0xff7e25,.30);this.fireballs.fillEllipse(b.x,b.y,96,32);
    this.fireballs.lineStyle(4,0xffc36b,.8);this.fireballs.strokeEllipse(b.x,b.y,86,22);
    for(let k=0;k<5;k++){
     const a=k*Math.PI*2/5+ms*.003;
     this.fireballs.lineStyle(3,0xffa34e,.65);
     this.fireballs.lineBetween(b.x,b.y,b.x+Math.cos(a)*34,b.y+Math.sin(a)*22);
    }
   }
  }
  const fireZones=[
   {x:1390,spread:160,y:680,intensity:!w.logOpen?1:.35},
   {x:4050,spread:174,y:678,intensity:!w.treeOpen?1:.35},
   {x:4390,spread:114,y:670,intensity:fireFlareActive(w,now,4380)?1:.13},
   {x:4680,spread:86,y:668,intensity:fireFlareActive(w,now,4650)?1:.13},
   {x:4860,spread:67,y:670,intensity:fireFlareActive(w,now,4840)?1:.13}
  ];
  // Batched fire triangles, capped. Flames visibly quiet down in safe phases.
  for(const [z,zone] of fireZones.entries()){
   const count=zone.intensity>.7?20:8;
   for(let i=0;i<count;i++){
    const x=zone.x+(i/(count-1)-.5)*zone.spread*2;
    const variation=9*Math.sin(ms*.007+i+z),height=22+zone.intensity*(32+i%5*11);
    this.fire.fillStyle(i%3===0?0xe64121:i%3===1?0xf76f22:0xffb048,
     .26+zone.intensity*.65);
    this.fire.fillTriangle(x-9,zone.y+6,x+8,zone.y+6,
     x+variation+w.windDirection*zone.intensity*10,zone.y-height);
   }
  }
  // Host-controlled smoke corridor, transparent enough to see jump surfaces.
  const dir=w.windDirection,opacity=w.smokeOpen?.046:.115;
  for(let i=0;i<17;i++){
   const x=FIRE_SMOKE_ZONE.start+(i/16)*820+
    Math.sin(ms*.00055+i)*45+dir*38;
   const y=490+(i%5)*42+Math.sin(ms*.0009+i)*18;
   this.smokeInk.fillStyle(i%3?0x7d7170:0x99918a,opacity);
   this.smokeInk.fillEllipse(x,y,140+(i%3)*40,115);
  }
  // The falling tree is telegraphed by shaking, then becomes a bridge.
  const phase=fireVisualTreePhase(w);
  if(w.treeOpen){
   this.tree.setRotation(-1.54).setPosition(4050,687).setAlpha(.55);
  }else{
   this.tree.setRotation(phase==='impact'?-1.2:phase==='warning'?Math.sin(ms*.031)*.07:0)
    .setPosition(3960+(phase==='warning'?Math.sin(ms*.06)*8:0),585).setAlpha(1);
  }
  if(phase!=='calm'&&w.treeOpen===false){
   const tone=phase==='impact'?'#ff9c58':'#ffe6ad';
   this.status.setText(phase==='impact'?'⚠ ÁRVORE DESABANDO — AFASTEM-SE!':
    '⚠ MADEIRA ESTALANDO — ÁRVORE VAI CAIR!')
    .setColor(tone).setVisible(true);
  }else this.status.setVisible(false);
  this.status.setPosition(this.scene.scale.gameSize.width/2,
   Math.min(116,this.scene.scale.gameSize.height*.22));
  // Ash and sparks: one GPU graphics batch, never fresh objects per frame.
  for(let i=0;i<75;i++){
   const drift=ms*(.011+hash(i+21)*.021);
   const x=((hash(i+11)*FIRE_WIDTH+drift*dir)%FIRE_WIDTH+FIRE_WIDTH)%FIRE_WIDTH;
   const y=((hash(i+111)*FIRE_HEIGHT-ms*(.004+hash(i+67)*.012))%
     FIRE_HEIGHT+FIRE_HEIGHT)%FIRE_HEIGHT;
   this.embers.fillStyle(i%4===0?0xffaa4b:0xb49e87,i%3===0?.65:.28);
   this.embers.fillEllipse(x,y,2.1,3.3);
  }
  for(const entry of this.figures){
   const pose=poses[entry.seat];
   if(!entry.sprite)this.drawFigure(entry.ink,entry.seat,pose,ms);
   updateKenneyCharacter(entry.sprite,entry.target,ms,pose.vx,pose.vy);
   entry.ink.setPosition(entry.target.x,entry.target.y).setAlpha(entry.target.alpha);
  }
  for(const [i,shadow] of this.shadows.entries()){
   shadow.setAlpha(opacity*(i%2?1.1:.7));
   shadow.x=2350+i*135+Math.sin(ms*.0005+i)*24+dir*31;
  }
 }
}
