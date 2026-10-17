import Phaser from 'phaser';
import type { Network, Pose, Seat } from './network';

/** Three actual Arcade bodies; no bots, no virtual peers or scripted companions. */
export class SoloBodies {
  readonly bodies: Phaser.Physics.Arcade.Body[] = [];
  private selected: Seat = 0;
  constructor(
    private scene: Phaser.Scene,
    private net: Network,
    private actors: Phaser.GameObjects.Rectangle[],
    blocks: Phaser.GameObjects.Rectangle[],
    maxX=400,maxY=960
  ){
    for(const seat of [0,1,2] as Seat[]){
      const actor=actors[seat];
      if(!actor.body)scene.physics.add.existing(actor);
      const body=actor.body as Phaser.Physics.Arcade.Body;
      body.setGravityY(850).setMaxVelocity(maxX,maxY).setCollideWorldBounds(true);
      if(seat!==0)for(const block of blocks)scene.physics.add.collider(actor,block);
      this.bodies[seat]=body;
    }
  }
  body(seat:Seat):Phaser.Physics.Arcade.Body { return this.bodies[seat]; }
  select(seat:Seat):void {
    if(!this.net.isSolo)return;
    this.bodies[this.selected]?.setVelocityX(0);
    this.selected=seat;
    for(const i of [0,1,2] as Seat[]){
      this.actors[i].setStrokeStyle(i===seat?4:2,i===seat?0xfffac4:0x12312b);
    }
    this.scene.cameras.main.startFollow(this.actors[seat],false,.095,.1);
  }
  /** Unselected players are simulated by Arcade; supported ones follow their bases. */
  beforeFrame(supporting?:[Seat|null,Seat|null,Seat|null]):void {
    for(const seat of [0,1,2] as Seat[]){
      if(seat===this.selected)continue;
      const body=this.bodies[seat];
      const base=supporting?.[seat]??null;
      if(base!==null){
        const parent=this.actors[base];
        body.setAllowGravity(false);
        body.reset(parent.x,Math.max(30,parent.y-44));
        body.setVelocity(0,0);
      }else{
        if(!body.allowGravity)body.setAllowGravity(true);
        body.setVelocityX(0); // stops walking; keeps gravity and vertical momentum.
      }
    }
  }
  report():void {
    if(!this.net.isSolo)return;
    const poses:Pose[]=([0,1,2] as Seat[]).map(seat=>{
      const actor=this.actors[seat],body=this.bodies[seat];
      return {seat,x:actor.x,y:actor.y,vx:body.velocity.x,vy:body.velocity.y};
    });
    this.net.reportSoloBodies(poses);
  }
  reset(p:Pose):void {
    const body=this.bodies[p.seat];
    if(!body)return;
    body.setAllowGravity(true);
    body.reset(p.x,p.y);
    body.setVelocity(0,0);
  }
}
