// v0.5.3 regression fixture; never imported by product code.
import {FOX_RIG} from '../../assets/scripts/FoxRig';
import {FOX_LOCOMOTION} from '../../assets/scripts/FoxWalkPose';
type GroundPoint={x:number;z:number};
type Foot={point:GroundPoint;from:GroundPoint;to:GroundPoint;stance:boolean;lift:number;roll:number;initialized:boolean;swingStart:number;swingHeight:number;settling:boolean;settleTime:number;settleLift:number;settleRoll:number};
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
export class FootPlantGait {
 stride:number=FOX_LOCOMOTION.stride;stanceFraction:number=FOX_LOCOMOTION.stance;clock=.29;private lastDistance=0;private left:Foot=this.foot();private right:Foot=this.foot();
 private foot():Foot{return {point:{x:0,z:0},from:{x:0,z:0},to:{x:0,z:0},stance:true,lift:0,roll:0,initialized:false,swingStart:.58,swingHeight:.038,settling:false,settleTime:0,settleLift:0,settleRoll:0};}
 reset(distance:number){this.clock=.29;this.lastDistance=distance;this.left=this.foot();this.right=this.foot();}
 update(position:GroundPoint,velocity:GroundPoint,right:GroundPoint,speed:number,distance:number,dt:number){const direction=speed>.015?{x:velocity.x/Math.max(.001,Math.hypot(velocity.x,velocity.z)),z:velocity.z/Math.max(.001,Math.hypot(velocity.x,velocity.z))}:{x:0,z:0},depth=speed>.015?1-Math.min(1,Math.abs(direction.x*right.x+direction.z*right.z)):0,stepLength=this.stride*(1-.35*depth);this.clock+=Math.max(0,distance-this.lastDistance)/stepLength;this.lastDistance=distance;
  for(const [foot,side,phase] of [[this.left,-1,0],[this.right,1,.5]] as [Foot,number,number][]){const lateral=FOX_RIG.targets[side<0?'left':'right'].ankle.x*FOX_RIG.worldUnitsPerSpineUnit,along=right.x*direction.x+right.z*direction.z,center=(FOX_RIG.targets.left.ankle.x+FOX_RIG.targets.right.ankle.x)*.5*FOX_RIG.worldUnitsPerSpineUnit,compression=(lateral-center)*along*.85,nominal={x:position.x+right.x*lateral-direction.x*compression,z:position.z+right.z*lateral-direction.z*compression},p=((this.clock+phase)%1+1)%1,stance=p<this.stanceFraction;
   if(!foot.initialized){foot.point={...nominal};foot.from={...nominal};foot.to={...nominal};foot.initialized=true;foot.stance=true;}
   if(speed<.025){if(!foot.settling){foot.from={...foot.point};foot.settleLift=foot.lift;foot.settleRoll=foot.roll;foot.settleTime=0;foot.settling=true;}foot.settleTime+=dt;const blend=smooth(foot.settleTime/.22);foot.point={x:foot.from.x+(nominal.x-foot.from.x)*blend,z:foot.from.z+(nominal.z-foot.from.z)*blend};foot.lift=foot.settleLift*(1-blend);foot.roll=foot.settleRoll*(1-blend);foot.stance=foot.lift<.001;continue;}
   foot.settling=false;
   if(!stance&&foot.stance){foot.from={...foot.point};foot.swingStart=p;const remaining=1-p,lead=stepLength*(remaining+this.stanceFraction*.5);foot.to={x:nominal.x+direction.x*lead,z:nominal.z+direction.z*lead};foot.swingHeight=.038*(1-.18*depth)*Math.sqrt(remaining/(1-this.stanceFraction));}
   if(!stance){const t=Math.max(0,Math.min(1,(p-foot.swingStart)/(1-foot.swingStart))),ease=smooth(t),arc=Math.sin(Math.PI*t)**2;foot.point={x:foot.from.x+(foot.to.x-foot.from.x)*ease,z:foot.from.z+(foot.to.z-foot.from.z)*ease};foot.lift=arc*foot.swingHeight;foot.roll=Math.sin(2*Math.PI*t)*arc*6;}else{if(!foot.stance)foot.point={...foot.to};foot.lift=0;foot.roll=0;}
   foot.stance=stance;
  }
  return {left:this.left,right:this.right,clock:this.clock,stride:stepLength,depth};
 }
}
