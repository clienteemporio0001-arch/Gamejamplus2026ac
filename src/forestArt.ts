import Phaser from 'phaser';
import { TREE_ACTIONS, type ForestWorld } from './forest';
import { TREE_BRIDGE, treeFrame, type TreeStage } from './forestPresentation';

/** Original vector sprite, adult human trail guide. No cultural costume caricatures. */
export class IndigenousGuideVisual {
  readonly root: Phaser.GameObjects.Container;
  private readonly arm: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    const shadow = scene.add.ellipse(x, y+12, 65, 15, 0x020b0e, .48).setDepth(15);
    const ink = scene.add.graphics();
    // Distinct, human adult proportions, backpack and practical walking clothing.
    ink.fillStyle(0x091a20,1);
    ink.fillRoundedRect(-23,-53,46,54,11);
    ink.fillStyle(0x445448,1);
    ink.fillRoundedRect(-19,-48,38,46,8);
    ink.fillStyle(0x63755a,1);
    ink.fillRect(-15,-45,30,7);
    ink.fillStyle(0x263d40,1);
    ink.fillRoundedRect(-20,-11,16,21,3);
    ink.fillRoundedRect(4,-11,16,21,3);
    ink.fillStyle(0x1a282a,1);
    ink.fillRoundedRect(-23,3,19,9,3);
    ink.fillRoundedRect(3,3,21,9,3);
    // Shoulder bag and strap read as ordinary travel equipment.
    ink.fillStyle(0x49372b,1);
    ink.fillRoundedRect(14,-40,16,29,5);
    ink.lineStyle(3,0x957f61,1);
    ink.lineBetween(-9,-53,23,-24);
    ink.fillStyle(0xb78360,1);
    ink.fillEllipse(0,-67,32,37);
    ink.fillStyle(0x1c2229,1);
    ink.fillEllipse(0,-82,38,19);
    ink.fillRect(-17,-81,7,22);
    ink.fillRect(11,-80,7,20);
    // Nose, eye highlights, eyebrows and neutral mouth.
    ink.lineStyle(2,0x322b2a,1);
    ink.lineBetween(-10,-67,-3,-67);
    ink.lineBetween(4,-67,11,-67);
    ink.fillStyle(0xf3eee1,1);
    ink.fillEllipse(-7,-65,4,3);
    ink.fillEllipse(8,-65,4,3);
    ink.fillStyle(0x19272a,1);
    ink.fillCircle(-6,-65,1.3);
    ink.fillCircle(8,-65,1.3);
    ink.lineStyle(1.5,0x684536,1);
    ink.lineBetween(-4,-53,6,-53);
    // Hair deliberately simple and contemporary, not folk-costume coding.
    ink.fillStyle(0x151f25,1);
    ink.fillEllipse(0,-84,36,17);
    ink.fillEllipse(-16,-75,10,24);
    const armL = scene.add.rectangle(-25,-33,11,36,0x966b50).setStrokeStyle(2,0x10262a).setAngle(-13);
    this.arm = scene.add.rectangle(25,-33,11,36,0xa47a5b).setStrokeStyle(2,0x10262a).setAngle(14);
    this.root = scene.add.container(x,y,[armL,ink,this.arm]).setDepth(17);
    scene.tweens.add({ targets:this.root,scaleY:1.018,duration:1100,ease:'Sine.easeInOut',yoyo:true,repeat:-1 });
    scene.tweens.add({ targets:this.arm,angle:0,duration:1550,ease:'Sine.easeInOut',yoyo:true,repeat:-1 });
    void shadow;
  }

  /** Two rising arcs depict physical movement training, not magical powers. */
  demonstrate():void {
    const originX=this.root.x-24, originY=this.root.y-28;
    for(let i=0;i<2;i++){
      const dot=this.scene.add.circle(originX,originY,5,0xc1e9b1,.9).setDepth(21);
      this.scene.tweens.add({targets:dot,x:originX+40+i*45,
        y:originY-52-i*35,alpha:0,delay:i*360,duration:710,
        onComplete:()=>dot.destroy()});
    }
  }
}

/** Single always-visible tree. Render-only: existing 'fallen' Arcade body is authoritative. */
export class GiantBridgeTree {
  readonly root: Phaser.GameObjects.Container;
  private readonly ropes: Phaser.GameObjects.Graphics[]=[];
  private readonly caption: Phaser.GameObjects.Text;
  private readonly rootX = TREE_BRIDGE.rootX;
  private readonly rootY = TREE_BRIDGE.rootY;
  private lastStage:TreeStage='presa';

  constructor(private readonly scene:Phaser.Scene) {
    const under = scene.add.graphics();
    // Trunk and thick bark silhouette.
    under.fillStyle(0x14221e,1);
    under.fillRoundedRect(-8,-29,TREE_BRIDGE.length+16,61,25);
    under.fillStyle(0x514035,1);
    under.fillRoundedRect(0,-21,TREE_BRIDGE.length,43,15);
    under.fillStyle(0x755744,1);
    under.fillRoundedRect(5,-18,TREE_BRIDGE.length-11,14,8);
    under.lineStyle(3,0x342b28,.92);
    under.lineBetween(12,-1,345,-1);
    under.lineBetween(28,14,354,14);
    for(let i=0;i<17;i++){
      const x=12+i*21;
      under.lineStyle(i%3===0?3:2,0x9c7958,.48);
      under.lineBetween(x,-15,x+11, -10);
      under.lineBetween(x+3,12,x+18,8);
    }
    for(let i=0;i<4;i++){
      under.lineStyle(3,0x2c2b25,.86);
      under.strokeEllipse(63+i*75,1,14,12);
    }
    // Buttress roots anchor the trunk to the left bank.
    under.fillStyle(0x42372d,1);
    under.fillTriangle(0,-15,-38,-22,-7,23);
    under.fillTriangle(0,12,-34,40,34,18);
    under.fillTriangle(20,18,-15,48,47,21);

    const branches = scene.add.graphics();
    branches.lineStyle(13,0x322f27,1);
    branches.beginPath();branches.moveTo(225,-10);branches.lineTo(254,-69);branches.lineTo(287,-88);branches.strokePath();
    branches.lineStyle(10,0x3c392e,1);
    branches.beginPath();branches.moveTo(293,12);branches.lineTo(320,48);branches.lineTo(349,63);branches.strokePath();
    branches.lineStyle(7,0x423829,1);
    branches.lineBetween(156,-15,164,-48);
    branches.lineBetween(111,15,130,38);
    const foliage = scene.add.graphics();
    const leaves=[
      [266,-92,103,81,0x28493b],[325,-75,100,83,0x254537],
      [349,-25,89,85,0x2b5240],[278,-32,89,73,0x37664c],
      [315,-114,69,53,0x315b47],[347,-94,47,49,0x3b6651],
      [247,-66,59,50,0x335a43],[331,20,55,48,0x2c523b],
    ] as const;
    for(const [x,y,w,h,c] of leaves){
      foliage.fillStyle(0x142c29,.83);foliage.fillEllipse(x,y,w+9,h+8);
      foliage.fillStyle(c,.97);foliage.fillEllipse(x,y,w,h);
    }
    foliage.lineStyle(2,0x7e956b,.35);
    for(let i=0;i<25;i++){
      const x=243+(i*37)%139,y=-116+(i*19)%139;
      foliage.lineBetween(x,y,x+5,y-3);
    }
    this.root=scene.add.container(this.rootX,this.rootY,[under,branches,foliage]).setDepth(14);
    this.root.setRotation(TREE_BRIDGE.initialAngle);

    // Three recognizable bindings reaching fixed devices on the left side.
    const tether=[
      {x:TREE_ACTIONS.teo.x,y:TREE_ACTIONS.teo.y,toX:3595,toY:440,color:0x9cdaa0},
      {x:TREE_ACTIONS.lia.x,y:TREE_ACTIONS.lia.y,toX:3569,toY:486,color:0xf0bf8b},
      {x:TREE_ACTIONS.nino.x,y:TREE_ACTIONS.nino.y,toX:3532,toY:613,color:0xa7dbee},
    ] as const;
    for(const [i,t] of tether.entries()){
      const g=scene.add.graphics().setDepth(13);
      g.lineStyle(7,0x102e2b,.95);
      g.lineBetween(t.x,t.y,t.toX,t.toY);
      g.lineStyle(3,t.color,.93);
      g.lineBetween(t.x,t.y,t.toX,t.toY);
      g.fillStyle(t.color,.9);
      g.fillCircle(t.x,t.y,7);
      g.lineStyle(2,0x142723,1);g.strokeCircle(t.x,t.y,11);
      g.fillStyle(0xd9cc9b,.75);g.fillCircle(t.toX,t.toY,5);
      this.ropes[i]=g;
    }
    this.caption=scene.add.text(3650,249,'ÁRVORE GIGANTE\n3 AMARRAS PRENDEM O TRONCO',{
      fontFamily:'Arial,sans-serif',fontSize:'18px',fontStyle:'bold',
      color:'#e9dbc0',stroke:'#071a1e',strokeThickness:5,align:'center'
    }).setOrigin(.5).setDepth(20);
  }

  update(w:Pick<ForestWorld,'treeSteps'|'treeFallAt'|'bridge'>,now:number):void {
    const frame=treeFrame(w,now);
    this.ropes.forEach((r,i)=>r.setVisible(frame.openRopes[i]));
    // Fixed root pivot means the final trunk aligns with the 362x34 collision body.
    const shake=frame.stage==='soltando'?Math.sin(now/190)*.012:0;
    this.root.setRotation(frame.rotation+shake);
    if(frame.stage!==this.lastStage){
      this.lastStage=frame.stage;
      this.caption.setText(frame.stage==='ponte'?'PONTE DE ÁRVORE PRONTA\nATRAVESSEM JUNTOS':
        frame.stage==='caindo'?'ÁRVORE CAINDO!\nAFASTEM-SE DA QUEDA':
        'ÁRVORE GIGANTE\nSOLTEM AS 3 AMARRAS');
    }
  }
}
