export type PetState='idle'|'walk'|'attack'|'hit'|'happy';
export type GroundPoint={x:number;z:number};
export class PetBrain {
  state:PetState='idle'; facing=1; target:GroundPoint|null=null; targetId=''; attackId=0; elapsed=0; speed=2.4;
  private struck=false;
  private enter(state:PetState){this.state=state;this.elapsed=0;}
  moveTo(x:number,z:number){if(this.state==='hit')return;this.target={x,z};this.targetId='';this.enter('walk');}
  beginAttack(id:string){if(this.state==='attack'||this.state==='hit')return false;this.target=null;this.targetId=id;this.attackId++;this.struck=false;this.enter('attack');return true;}
  strike(id:number){if(this.state!=='attack'||id!==this.attackId||this.struck)return false;this.struck=true;return true;}
  react(state:'hit'|'happy'){this.target=null;this.targetId='';this.struck=true;this.enter(state);}
  complete(){if(this.state==='attack'||this.state==='happy'||this.state==='hit'){this.targetId='';this.enter('idle');}}
  stop(){this.target=null;this.targetId='';this.enter('idle');}
  step(dt:number,position:GroundPoint):GroundPoint{
    this.elapsed+=Math.min(Math.max(dt,0),.5);
    if(this.state==='hit'&&this.elapsed>=.4)this.complete();
    if(this.state==='happy'&&this.elapsed>=1.05)this.complete();
    if(this.state==='attack'&&this.elapsed>=1.1)this.complete();
    if(this.state!=='walk'||!this.target)return position;
    const dx=this.target.x-position.x,dz=this.target.z-position.z,d=Math.hypot(dx,dz),step=this.speed*Math.min(Math.max(dt,0),.1);
    if(Math.abs(dx)>.015)this.facing=dx>0?1:-1;
    if(d<=step+.02){const p={...this.target};this.target=null;this.enter('idle');return p;}
    return {x:position.x+dx/d*step,z:position.z+dz/d*step};
  }
}
