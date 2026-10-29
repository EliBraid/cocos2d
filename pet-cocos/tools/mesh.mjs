const r=n=>Math.round(n*1e6)/1e6;
export function worldBones(bones){
 const byName=new Map(),result=[];
 for(const b of bones){const parent=b.parent?byName.get(b.parent):null;if(b.parent&&!parent)throw new Error('Missing earlier parent: '+b.parent);const angle=(b.rotation||0)*Math.PI/180,a=Math.cos(angle),bb=Math.sin(angle),c=-bb,d=a;
  const world=parent?{x:parent.x+parent.a*(b.x||0)+parent.c*(b.y||0),y:parent.y+parent.b*(b.x||0)+parent.d*(b.y||0),a:parent.a*a+parent.c*bb,b:parent.b*a+parent.d*bb,c:parent.a*c+parent.c*d,d:parent.b*c+parent.d*d}:{x:b.x||0,y:b.y||0,a,b:bb,c,d};
  result.push(world);byName.set(b.name,world);
 }return result;
}
export function weightedMesh(region,slotBone,matrices,weightFn,segments=10){
 const uvs=[],triangles=[],vertices=[],angle=(region.rotation||0)*Math.PI/180,b=matrices[slotBone];
 for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++){
  const u=col/segments,v=row/segments;uvs.push(u,v);const px=(u-.5)*region.width,py=(.5-v)*region.height,lx=region.x+px*Math.cos(angle)-py*Math.sin(angle),ly=region.y+px*Math.sin(angle)+py*Math.cos(angle);
  const wx=b.x+b.a*lx+b.c*ly,wy=b.y+b.b*lx+b.d*ly;
  const raw=weightFn(u,v).filter(([,w])=>w>1e-5),total=raw.reduce((n,[,w])=>n+w,0);if(!total)throw new Error('Unweighted mesh vertex');
  vertices.push(raw.length);for(const [index,weight] of raw){const m=matrices[index],dx=wx-m.x,dy=wy-m.y,det=m.a*m.d-m.b*m.c;vertices.push(index,r((m.d*dx-m.c*dy)/det),r((-m.b*dx+m.a*dy)/det),r(weight/total));}
  if(row<segments&&col<segments){const i=row*(segments+1)+col;triangles.push(i,i+segments+1,i+1,i+1,i+segments+1,i+segments+2);}
 }
 return {type:'mesh',path:region.path,width:region.width,height:region.height,uvs,triangles,vertices};
}
