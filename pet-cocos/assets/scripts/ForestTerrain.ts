export type Point3={x:number;y:number;z:number};
export function terrainHeight(x:number,z:number){
 if(Math.abs(x)<2.7&&z<=-2.4)return .72;
 if(Math.abs(x)<1.2&&z<-1.2)return Math.min(6,Math.floor((-z-1.2+1e-6)/.2)+1)*.12;
 return 0;
}
export function intersectTerrain(origin:Point3,direction:Point3):Point3|null{
 if(direction.y>=0)return null;const length=Math.hypot(direction.x,direction.y,direction.z),d={x:direction.x/length,y:direction.y/length,z:direction.z/length};
 const at=(t:number)=>({x:origin.x+d.x*t,y:origin.y+d.y*t,z:origin.z+d.z*t});let previous=0;
 for(let t=.04;t<100;t+=.04){const p=at(t);if(p.y<=terrainHeight(p.x,p.z)){let lo=previous,hi=t;for(let i=0;i<20;i++){const mid=(lo+hi)/2,q=at(mid);if(q.y>terrainHeight(q.x,q.z))lo=mid;else hi=mid;}return at((lo+hi)/2);}previous=t;}
 return null;
}
