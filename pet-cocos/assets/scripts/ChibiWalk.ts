// v0.6 chibi walk. One source of truth for the native Spine clips
// (tools/build-walk-v06.mjs) and the runtime gait clock/foot placement.
//
// Design notes
// - Short, quick steps with a clear two-beats-per-cycle body bounce
//   (down on contact, up on passing) plus squash & stretch on the torso.
// - Planted feet travel linearly at exactly ground speed, so scrubbing the
//   clip by walked distance keeps them locked to the floor (no skating).
// - Head, ears, tail and scarf follow the body with increasing phase lag
//   (overlapping action) instead of moving in lockstep.
// Units: pose channels are Spine units/degrees, speed/stride are world units.
export const WALK_CYCLE={speed:.8,duration:.6,stance:.56,unit:3.8/640,stride:.48} as const;
export type WalkView='side'|'away'|'toward';
const TAU=Math.PI*2;
const wrap=(p:number)=>((p%1)+1)%1,clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
const minJerk=(t:number)=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
/** Spine units a planted foot slides back during stance (== ground travel). */
export const STANCE_TRAVEL=WALK_CYCLE.speed*WALK_CYCLE.stance*WALK_CYCLE.duration/WALK_CYCLE.unit;

/** One leg. phase 0 = heel strike with the foot fully forward. */
export function footPath(phase:number,travel:number=STANCE_TRAVEL,lift=17){
 const p=wrap(phase),S=WALK_CYCLE.stance;let x:number,y=0,roll=0;
 if(p<S){const s=p/S;x=travel*(.5-s);
  if(s<.12)roll=10*(1-ease(s/.12));                                   // heel lands, toes slap down
  else if(s>.72){const k=ease((s-.72)/.28);roll=-22*k;y=4*k;}          // heel peels off
 }else{const t=(p-S)/(1-S);x=travel*(-.5+minJerk(t));
  y=lift*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.08)),1.4)+4*(1-ease(t/.25));
  roll=t<.35?-22+8*ease(t/.35):t<.75?-14+26*ease((t-.35)/.4):12-2*ease((t-.75)/.25);}
 return {x,y,roll,stance:p<S};
}

/** Whole-body channels. Two steps per cycle; q is the per-step phase. */
export function bodyPose(phase:number,view:WalkView='side'){
 const p=wrap(phase),q=wrap(p*2),side=view==='side',k=side?1:.7;
 const c=(f:number,lag=0)=>Math.cos(TAU*(f-lag)),s=(f:number,lag=0)=>Math.sin(TAU*(f-lag));
 const bob=-c(q,.1); // -1 just after contact (weight down), +1 at passing (up)
 return {
  bob,
  hipX:(side?1.8:2.6)*s(p),hipY:6.5*bob*k,hipR:(side?2.2:3.2)*s(p,.05),
  squashX:1-.035*bob,squashY:1+.04*bob,
  lean:side?-4.5-1.5*bob:0,
  headR:(side?1.5:0)-(side?2.2:3.2)*s(p,.05)*.75+1.2*s(p,.2)+1.2*c(q,.28),headY:-2.2*bob-1.8*c(q,.22),headX:side?-1.2*bob:0,
  earL:6*c(q,.3),earR:-5*c(q,.36),
  tail:4*s(p,.1),tailMid:7*s(p,.2)+2*c(q,.3),tailTip:12*s(p,.32)+4*c(q,.42),tailY:-2.5*c(q,.2),
  scarf:side?5:2,scarfMid:4*s(q,.18)+2*s(p,.1),scarfTip:8*s(q,.34)+4*s(p,.22),
  armL:-(side?17:9)*c(p),foreL:-(side?9:4)*c(p,.12)-4,
  armR:(side?3.5:2.5)*c(p)+.6*bob,foreR:-(side?1.5:1)*c(p,.12),
  // the sword hand stays steadier than the body: cancel most of the hip/chest roll
  blade:1.5*c(p,.2)-1.2*c(q,.3)-.7*(side?2.2:3.2)*s(p,.05)+(side?1.4*bob:0)
 };
}

/** Native foot offset (Spine units, relative to the ankle's setup pose). */
export function nativeFoot(phase:number,view:WalkView,tuck:number){
 if(view==='side'){const f=footPath(phase);return {x:tuck+f.x,y:f.y,roll:f.roll,travel:f.x,stance:f.stance};}
 const f=footPath(phase,STANCE_TRAVEL*.32,15),dir=view==='away'?1:-1; // forward foot is farther away (higher) when walking away
 return {x:tuck,y:f.y+dir*f.x,roll:view==='away'?0:f.roll*.3,travel:f.x/.32,stance:f.stance};
}

type Point={x:number;z:number};
export type GaitFoot={point:Point;stance:boolean;phase:number;lift:number};

/**
 * Advances the walk clock by distance actually walked (so the clip never runs
 * faster or slower than the ground) and reports each foot's world position for
 * terrain sampling. Feet are not re-planted in world space: the native clip
 * already moves planted feet at ground speed.
 */
export class ChibiGait {
 clock=0;private lastDistance=0;private leftX:number;private rightX:number;
 constructor(leftX:number,rightX:number){this.leftX=leftX;this.rightX=rightX;}
 reset(distance:number){this.lastDistance=distance;}
 update(position:Point,velocity:Point,right:Point,distance:number,view:WalkView,moving:boolean){
  this.clock+=Math.max(0,distance-this.lastDistance)/WALK_CYCLE.stride;this.lastDistance=distance;
  const len=Math.hypot(velocity.x,velocity.z),dir=len>.001?{x:velocity.x/len,z:velocity.z/len}:{x:right.x,z:right.z};
  const foot=(restX:number,shift:number):GaitFoot=>{
   const p=wrap(this.clock+shift),f=moving?nativeFoot(p,view,0):{x:0,y:0,travel:0,stance:true};
   const side=restX*WALK_CYCLE.unit,along=(moving?f.travel:0)*WALK_CYCLE.unit;
   return {point:{x:position.x+right.x*side+dir.x*along,z:position.z+right.z*side+dir.z*along},stance:f.stance,phase:p,lift:moving?f.y*WALK_CYCLE.unit:0};
  };
  return {left:foot(this.leftX,0),right:foot(this.rightX,.5),clock:this.clock};
 }
}
