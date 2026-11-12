import {WALK_CYCLE} from './AuthoredWalk';
export type GroundPoint={x:number;z:number};
export class SupportHeight {
 value=0;private ready=false;
 update(left:number,right:number,dt:number,teleport=false){const target=(left+right)*.5;if(!this.ready||teleport){this.value=target;this.ready=true;}else this.value+=(target-this.value)*(1-Math.exp(-Math.max(0,dt)*18));return this.value;}
}
const dist=(a:GroundPoint,b:GroundPoint)=>Math.hypot(a.x-b.x,a.z-b.z),approach=(a:number,b:number,d:number)=>a<b?Math.min(a+d,b):Math.max(a-d,b);
export class PetMotor {
 position:GroundPoint;velocity:GroundPoint={x:0,z:0};path:GroundPoint[]=[];speed=0;distance=0;maxSpeed:number=WALK_CYCLE.speed;acceleration=3.6;braking=4.8;
 constructor(position:GroundPoint){this.position={...position};}
 setPath(path:GroundPoint[]){this.path=path.map(p=>({...p}));}
 stop(){this.path=[];this.speed=0;this.velocity={x:0,z:0};}
 step(elapsed:number){const dt=Math.min(Math.max(elapsed,0),.08);while(this.path.length&&dist(this.position,this.path[0])<.001){this.position={...this.path.shift()!};}if(!this.path.length){this.speed=0;this.velocity={x:0,z:0};return;}
  let remaining=dist(this.position,this.path[0]);for(let i=1;i<this.path.length;i++)remaining+=dist(this.path[i-1],this.path[i]);const target=Math.min(this.maxSpeed,Math.sqrt(Math.max(0,2*this.braking*remaining))),old=this.speed;this.speed=approach(old,target,(target>old?this.acceleration:this.braking)*dt);let travel=(old+this.speed)*.5*dt;const before={...this.position};
  while(travel>0&&this.path.length){const p=this.path[0],d=dist(this.position,p);if(d<=travel+.001){this.position={...p};travel=Math.max(0,travel-d);this.path.shift();}else{this.position={x:this.position.x+(p.x-this.position.x)*travel/d,z:this.position.z+(p.z-this.position.z)*travel/d};travel=0;}}
  const moved=dist(before,this.position);this.distance+=moved;this.velocity=dt?{x:(this.position.x-before.x)/dt,z:(this.position.z-before.z)/dt}:{x:0,z:0};if(!this.path.length)this.speed=0;
 }
}
