import {PetMotor} from './PetMotion';
export type Ground = {x:number;z:number};
export type Obstacle = Ground & {r:number};
export type ForestPose = 'idle'|'start'|'walk'|'stop'|'turn'|'attack'|'hit'|'happy'|'sniff'|'sleep'|'wake';
export const FOREST_BOUNDS={minX:-3.05,maxX:3.05,minZ:-3.5,maxZ:3.1};
export const FIRE_POSITION={x:-1.6,z:-.2};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const distance=(a:Ground,b:Ground)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentClear(a:Ground,b:Ground,obstacles:Obstacle[]){
  const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  return obstacles.every(o=>{const t=len?clamp(((o.x-a.x)*dx+(o.z-a.z)*dz)/len,0,1):0;return Math.hypot(a.x+dx*t-o.x,a.z+dz*t-o.z)>=o.r+.18;});
}
export function planPath(start:Ground,end:Ground,obstacles:Obstacle[]):Ground[]{
  const bounds=FOREST_BOUNDS,target={x:clamp(end.x,bounds.minX,bounds.maxX),z:clamp(end.z,bounds.minZ,bounds.maxZ)};
  if(segmentClear(start,target,obstacles))return [target];
  const cell=.25,nx=Math.ceil((bounds.maxX-bounds.minX)/cell)+1,nz=Math.ceil((bounds.maxZ-bounds.minZ)/cell)+1;
  const point=(i:number)=>({x:Math.min(bounds.maxX,bounds.minX+i%nx*cell),z:Math.min(bounds.maxZ,bounds.minZ+Math.floor(i/nx)*cell)});
  const valid=Array.from({length:nx*nz},(_,i)=>segmentClear(point(i),point(i),obstacles));
  const nearest=(p:Ground,from?:Ground)=>{let best=-1,score=Infinity;for(let i=0;i<valid.length;i++){if(!valid[i]||(from&&!segmentClear(from,point(i),obstacles)))continue;const d=distance(p,point(i));if(d<score){score=d;best=i;}}return best;};
  const first=nearest(start,start),last=nearest(target);if(first<0||last<0)return [];
  const open=[first],g=new Map<number,number>([[first,0]]),parent=new Map<number,number>(),closed=new Set<number>();
  while(open.length){open.sort((a,b)=>g.get(a)!+distance(point(a),point(last))-g.get(b)!-distance(point(b),point(last)));const at=open.shift()!;if(at===last)break;closed.add(at);
    const cx=at%nx,cz=Math.floor(at/nx);
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz;if(x<0||z<0||x>=nx||z>=nz)continue;const next=z*nx+x;if(!valid[next]||closed.has(next)||!segmentClear(point(at),point(next),obstacles))continue;const cost=g.get(at)!+distance(point(at),point(next));if(cost<(g.get(next)??Infinity)){g.set(next,cost);parent.set(next,at);if(!open.includes(next))open.push(next);}}
  }
  if(first!==last&&!parent.has(last))return [];
  const chain=[last];while(chain[0]!==first)chain.unshift(parent.get(chain[0])!);
  const raw=chain.map(point);if(segmentClear(raw[raw.length-1],target,obstacles))raw.push(target);
  const result:Ground[]=[];let previous=start,i=0;
  while(i<raw.length){let far=i;while(far+1<raw.length&&segmentClear(previous,raw[far+1],obstacles))far++;if(distance(previous,raw[far])>.015){result.push(raw[far]);previous=raw[far];}i=far+1;}
  return result;
}
export class ForestBrain {
  motor=new PetMotor({x:-.35,z:1.95});state:ForestPose='idle';clock=0;facing=1;back=false;attackId=0;private struck=true;
  get position(){return this.motor.position;}set position(p:Ground){this.motor.position=p;}
  get velocity(){return this.motor.velocity;}set velocity(p:Ground){this.motor.velocity=p;}
  get path(){return this.motor.path;}set path(p:Ground[]){this.motor.setPath(p);}
  get distance(){return this.motor.distance;}
  get expression(){return this.state==='sleep'?'sleep':this.state==='happy'?'happy':this.state==='attack'?'focus':this.state==='hit'?'alert':'calm';}
  private enter(state:ForestPose){this.state=state;this.clock=0;}
  move(point:Ground,obstacles:Obstacle[]){this.path=planPath(this.position,point,obstacles);if(!this.path.length)return false;const first=this.path[0],dx=first.x-this.position.x,dz=first.z-this.position.z;const facing=Math.abs(dx)>.05?(dx<0?-1:1):this.facing,back=Math.abs(dz)>.12?dz<0:this.back;const turned=facing!==this.facing||back!==this.back,moving=['start','walk','turn'].includes(this.state)&&this.motor.speed>.025;this.facing=facing;this.back=back;this.struck=true;if(this.state==='sleep')this.enter('wake');else if(moving&&turned)this.enter('turn');else if(!moving)this.enter('start');return true;}
  attack(){if(this.state==='attack'||this.state==='hit'||this.state==='sleep')return false;this.motor.stop();this.attackId++;this.struck=false;this.enter('attack');return true;}
  strike(id:number){if(this.state!=='attack'||id!==this.attackId||this.struck)return false;this.struck=true;return true;}
  react(pose:'hit'|'happy'|'sniff'){this.motor.stop();this.struck=true;this.enter(pose);}
  sleep(){this.motor.stop();this.struck=true;this.enter('sleep');}
  step(elapsed:number){const dt=clamp(elapsed,0,.08);this.clock+=dt;this.velocity={x:0,z:0};
    if(['start','turn','wake'].includes(this.state)&&this.clock>=({start:.14,turn:.16,wake:.45}[this.state]??0))this.enter(this.path.length?'walk':'idle');
    if(this.state==='walk'||this.state==='start'||this.state==='turn'){
      this.motor.step(dt);const dx=this.velocity.x,dz=this.velocity.z;
      if(Math.abs(dx)>.23)this.facing=dx<0?-1:1;if(Math.abs(dz)>.28)this.back=dz<0;
      if(!this.path.length)this.enter('stop');
    }
    const durations:Partial<Record<ForestPose,number>>={stop:.18,attack:.9,hit:.42,happy:1.2,sniff:1.15};const duration=durations[this.state];if(duration&&this.clock>=duration)this.enter('idle');
    if(this.state==='idle'&&this.clock>7.5)this.enter('sniff');
  }
}
export class GrassSpring {
  bend=0;velocity=0;entries=0;inside=false;x:number;z:number;radius:number;
  constructor(x:number,z:number,radius=.55){this.x=x;this.z=z;this.radius=radius;}
  step(elapsed:number,pet:Ground,speed:number){const d=Math.hypot(pet.x-this.x,pet.z-this.z),enter=d<this.radius,exit=d>this.radius*1.25;
    if(enter&&!this.inside){this.inside=true;this.entries++;this.velocity+=(pet.x>=this.x?1:-1)*3.5;}
    if(exit)this.inside=false;
    const target=this.inside?(pet.x>=this.x?1:-1)*(.18+.12*Math.min(speed,2)):0;
    let remaining=Math.min(Math.max(elapsed,0),.1);while(remaining>0){const dt=Math.min(remaining,1/120);this.velocity+=((target-this.bend)*55-this.velocity*13)*dt;this.bend+=this.velocity*dt;remaining-=dt;}return this.bend;
  }
}
export function lightAt(x:number,z:number,night:number,time:number){const n=clamp(night,0,1),distanceToFire=Math.hypot(x-FIRE_POSITION.x,z-FIRE_POSITION.z),warm=Math.exp(-distanceToFire*distanceToFire/5)*(n*.7+.16)*(1+.045*Math.sin(time*13)+.025*Math.sin(time*21));return {r:1.04-.61*n+warm*.9,g:1.01-.53*n+warm*.42,b:.91-.29*n+warm*.08};}
