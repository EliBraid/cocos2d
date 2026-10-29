// One pose source drives the native Spine clip and its terrain adapter.
// Units for pose channels are Spine units; travel is in world units.
export const WALK_CYCLE={speed:.8,stride:.672,duration:.84,stance:.58,unit:3.8/640} as const;
const wrap=(p:number)=>((p%1)+1)%1,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
function periodic(values:number[],p:number){const q=wrap(p)*values.length,i=Math.floor(q),t=q-i,n=values.length,a=values[(i+n-1)%n],b=values[i],c=values[(i+1)%n],d=values[(i+2)%n];return .5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
const hip=[0,-5.2,-1.2,4.2,7.2,5.8,3.1,1.1,0,-5.2,-1.2,4.2,7.2,5.8,3.1,1.1];
const arm=[-14,-13,-10,-5,0,5,10,13,14,13,10,5,0,-5,-10,-13];
const nod=[-.8,-1.2,-.2,.6,1,.2,-.3,-.8,-.8,-1.2,-.2,.6,1,.2,-.3,-.8];
export function sampleWalkBody(phase:number){
 const p=wrap(phase),hipY=periodic(hip,p),hipR=periodic(arm,p)*.045,chestR=-1.8-periodic(arm,p)*.07;
 return {
  hipX:periodic(arm,p)*.1,hipY,hipR,chestR,
  headX:periodic(arm,p-.07)*.08,
  headY:-hipY*.42+periodic(hip,p-.09)*.26,
  headR:-hipR*.75-chestR*.7+periodic(nod,p-.05),
  free:periodic(arm,p),fore:periodic(arm,p-.1)*.26,
  carry:-periodic(arm,p)*.25,carryFore:periodic(arm,p-.09)*.14,
  blade:periodic(arm,p-.16)*.12,
  tail:periodic(arm,p-.1)*.32,tailTip:periodic(arm,p-.22)*.64,
  tailY:(periodic(hip,p-.1)-hipY)*.5,
  scarf:-periodic(arm,p-.16)*.34,
  earL:periodic(hip,p-.055)*.4,earR:-periodic(hip,p-.085)*.32
 };
}
export function sampleWalkFoot(phase:number){const p=wrap(phase),stance=p<WALK_CYCLE.stance;let travel:number,lift=0,roll:number;
 if(stance){travel=WALK_CYCLE.stride*(WALK_CYCLE.stance/2-p);roll=p<.1?8*(1-ease(p/.1)):p>.44?-18*ease((p-.44)/.14):0;}
 else{const t=(p-.58)/.42,s=t*t*t*(10+t*(-15+6*t));travel=-WALK_CYCLE.stride*.29-WALK_CYCLE.stride*.42*t+WALK_CYCLE.stride*s;lift=Math.sin(Math.PI*t)**2*22;roll=t<.23?-18-6*ease(t/.23):t<.66?-24+16*ease((t-.23)/.43):-8+16*ease((t-.66)/.34);}
 const a=roll*Math.PI/180,pivot=roll>=0?-20:30,rollX=pivot-(pivot*Math.cos(a)+42*Math.sin(a)),rollY=-42-(pivot*Math.sin(a)-42*Math.cos(a));
 return {travel,lift,roll,rollX,rollY};
}
export function sampleBackBody(phase:number){const b=sampleWalkBody(phase),hipY=b.hipY*.62,hipR=b.hipR*.28,chestR=b.free*.018;return {...b,hipX:b.hipX*.18,hipY,hipR,chestR,headX:b.headX*.2,headY:b.headY*.55,headR:-(hipR+chestR)*.6,tail:b.tail*.55,tailTip:b.tailTip*.55,tailY:b.tailY*.4,scarf:b.scarf*.5,earL:b.earL*.5,earR:b.earR*.5};}
export function nativeWalkFoot(phase:number,restX:number,center:number,back=false){const f=sampleWalkFoot(phase);if(back){const groundY=f.travel/WALK_CYCLE.unit*.42;return {...f,lift:f.lift*.78,roll:0,rollX:0,rollY:0,groundY,dx:(center-restX)*.1+periodic([0,-.6,-1,-.6,0,.6,1,.6],phase),dy:f.lift*.78+groundY};}return {...f,groundY:0,dx:(center-restX)*.85+f.travel/WALK_CYCLE.unit+f.rollX,dy:f.lift+f.rollY};}
type Point={x:number;z:number};
type FootState={point:Point;contact:Point;stance:boolean;lift:number;roll:number;nativeDX:number;nativeGroundDY:number;phase:number};
export class AuthoredGait {
 clock=0;stride:number=WALK_CYCLE.stride;private lastDistance=0;
 private leftX:number;private rightX:number;
 private settling=false;private settleTime=0;private settleFrom:{left:Point;right:Point}|null=null;
 constructor(leftX=-32,rightX=48){this.leftX=leftX;this.rightX=rightX;}
 reset(distance:number){this.clock=0;this.lastDistance=distance;this.settling=false;this.settleTime=0;this.settleFrom=null;}
 update(position:Point,velocity:Point,right:Point,speed:number,distance:number,dt:number,back=false){
  const length=Math.hypot(velocity.x,velocity.z),direction=length>.001?{x:velocity.x/length,z:velocity.z/length}:{x:0,z:0},along=direction.x*right.x+direction.z*right.z,depth=1-Math.min(1,Math.abs(along)),stride=this.stride*(back?1:1-.35*depth),mix=ease(speed/WALK_CYCLE.speed),center=(this.leftX+this.rightX)*.5;
  this.clock+=Math.max(0,distance-this.lastDistance)/stride;this.lastDistance=distance;
  const foot=(restX:number,shift:number):FootState=>{
   const p=wrap(this.clock+shift),f=nativeWalkFoot(p,restX,center,back),side=restX*WALK_CYCLE.unit,compress=(restX-center)*WALK_CYCLE.unit*along*.85*mix;
   // Full travel + nativeDX stay locked to distance-scrubbed Spine feet.
   // Only compress/lift ease with speed so accel no longer skates.
   const travel=f.travel*(stride/WALK_CYCLE.stride);
   const contact={x:position.x+right.x*side-direction.x*compress+direction.x*travel,z:position.z+right.z*side-direction.z*compress+direction.z*travel};
   const point={x:contact.x+right.x*f.rollX*WALK_CYCLE.unit,z:contact.z+right.z*f.rollX*WALK_CYCLE.unit};
   return {point,contact,stance:p<WALK_CYCLE.stance,lift:(f.lift+f.rollY)*WALK_CYCLE.unit*mix,roll:f.roll,nativeDX:f.dx,nativeGroundDY:f.groundY,phase:p};
  };
  let left=foot(this.leftX,0),rightFoot=foot(this.rightX,.5);
  if(speed<.04){
   if(!this.settling){this.settling=true;this.settleTime=0;this.settleFrom={left:{...left.point},right:{...rightFoot.point}};}
   this.settleTime+=Math.max(0,dt);const blend=ease(this.settleTime/.2);
   const rest=(restX:number,from:Point):FootState=>{
    const side=restX*WALK_CYCLE.unit,target={x:position.x+right.x*side,z:position.z+right.z*side};
    const point={x:from.x+(target.x-from.x)*blend,z:from.z+(target.z-from.z)*blend};
    return {point,contact:point,stance:true,lift:0,roll:0,nativeDX:0,nativeGroundDY:0,phase:0};
   };
   left=rest(this.leftX,this.settleFrom!.left);rightFoot=rest(this.rightX,this.settleFrom!.right);
  }else{this.settling=false;this.settleFrom=null;}
  return {left,right:rightFoot,clock:this.clock,stride,depth,mix};
 }
}
