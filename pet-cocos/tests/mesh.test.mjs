import test from 'node:test';
import assert from 'node:assert/strict';
import {weightedMesh,worldBones} from '../tools/mesh.mjs';
const bones=[{name:'root'},{name:'body',parent:'root',x:10,y:20,rotation:30},{name:'tip',parent:'body',x:20,y:0,rotation:45}];
test('weighted mesh reconstructs the original setup position and normalized weights',()=>{
 const matrices=worldBones(bones);const mesh=weightedMesh({x:5,y:10,width:100,height:50,rotation:15},1,matrices,()=>[[1,.3],[2,.7]],4);
 assert.equal(mesh.type,'mesh');assert.equal(mesh.uvs.length,50);assert.equal(mesh.triangles.length,96);
 let cursor=0;for(let i=0;i<25;i++){const count=mesh.vertices[cursor++];let x=0,y=0,sum=0;for(let j=0;j<count;j++){const index=mesh.vertices[cursor++],lx=mesh.vertices[cursor++],ly=mesh.vertices[cursor++],w=mesh.vertices[cursor++],b=matrices[index];x+=(b.x+b.a*lx+b.c*ly)*w;y+=(b.y+b.b*lx+b.d*ly)*w;sum+=w;}
  assert.ok(Math.abs(sum-1)<1e-5);const u=i%5/4,v=Math.floor(i/5)/4,rad=15*Math.PI/180,lx=5+(u-.5)*100*Math.cos(rad)-(.5-v)*50*Math.sin(rad),ly=10+(u-.5)*100*Math.sin(rad)+(.5-v)*50*Math.cos(rad);const b=matrices[1];assert.ok(Math.abs(x-(b.x+b.a*lx+b.c*ly))<.01);assert.ok(Math.abs(y-(b.y+b.b*lx+b.d*ly))<.01);
 }
});
