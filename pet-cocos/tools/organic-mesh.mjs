// Anatomy controls add density around ears, shoulders and feet; UVs stay in the
// original drawing's registered coordinates. No individual limb rescaling.
export function organicMesh(region,slotBone,matrices,weightFn,controls=[]){
 const points=[],add=(x,y)=>{if(!points.some(p=>Math.hypot(p[0]-x,p[1]-y)<.003))points.push([x,y]);};
 for(const y of [0,.12,.27,.43,.6,.76,.9,1])for(const x of [0,.13,.28,.45,.62,.8,1])add(x,y);
 controls.forEach(([x,y])=>add(x,y));
 const n=points.length,p=[...points,[-10,-10],[0,20],[20,-10]];let triangles=[[n,n+1,n+2]];
 function inside(t,q){const [a,b,c]=t.map(i=>p[i]),d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-10)return false;const square=v=>v[0]*v[0]+v[1]*v[1],aa=square(a),bb=square(b),cc=square(c),x=(aa*(b[1]-c[1])+bb*(c[1]-a[1])+cc*(a[1]-b[1]))/d,y=(aa*(c[0]-b[0])+bb*(a[0]-c[0])+cc*(b[0]-a[0]))/d;return (q[0]-x)**2+(q[1]-y)**2<=(a[0]-x)**2+(a[1]-y)**2+1e-10;}
 for(let i=0;i<n;i++){const bad=triangles.filter(t=>inside(t,p[i])),edges=new Map();for(const [a,b,c] of bad)for(const [x,y] of [[a,b],[b,c],[c,a]]){const key=[x,y].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}triangles=triangles.filter(t=>!bad.includes(t));for(const [key,count] of edges)if(count===1)triangles.push([...key.split(',').map(Number),i]);}
 triangles=triangles.filter(t=>t.every(i=>i<n));
 const vertices=[],uvs=[],base=matrices[slotBone];
 for(const [u,v] of points){uvs.push(u,v);const lx=region.x+(u-.5)*region.width,ly=region.y+(.5-v)*region.height,wx=base.x+base.a*lx+base.c*ly,wy=base.y+base.b*lx+base.d*ly,weights=weightFn(u,v).filter(([,w])=>w>1e-6),total=weights.reduce((sum,[,w])=>sum+w,0);if(!total)throw Error('Unweighted anatomy vertex');vertices.push(weights.length);for(const [index,w] of weights){const m=matrices[index],dx=wx-m.x,dy=wy-m.y,det=m.a*m.d-m.b*m.c;vertices.push(index,+((m.d*dx-m.c*dy)/det).toFixed(6),+((-m.b*dx+m.a*dy)/det).toFixed(6),+(w/total).toFixed(6));}}
 return {type:'mesh',path:region.path,width:region.width,height:region.height,uvs,triangles:triangles.flat(),vertices};
}
