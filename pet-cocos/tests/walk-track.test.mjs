import test from 'node:test';
import assert from 'node:assert/strict';
import {FootPlantGait} from './fixtures/legacy-foot-gait.ts';
import {sampleFoxWalk} from '../assets/scripts/FoxWalkPose.ts';
test('side walking alternates the leading paw instead of shuffling in two separated standing positions',()=>{
 const g=new FootPlantGait();g.reset(0);const leads=[];
 for(let i=0;i<1500;i++){const d=i*.001,r=g.update({x:d,z:0},{x:.8,z:0},{x:1,z:0},.8,d,.001/.8);if(d>.7)leads.push(r.left.point.x-r.right.point.x);}
 assert.ok(Math.min(...leads)<-.08&&Math.max(...leads)>.08,`paw separation range ${Math.min(...leads)}..${Math.max(...leads)}`);
});
test('a relaxed walk keeps the pelvis over the travel line without an alternating sideways lurch',()=>{
 const xs=Array.from({length:128},(_,i)=>sampleFoxWalk(i/128,'hipX'));
 assert.ok(Math.max(...xs)-Math.min(...xs)<=4);
});
