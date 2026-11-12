import test from 'node:test';import assert from 'node:assert/strict';import {ForestBrain} from '../assets/scripts/ForestLogic.ts';
function walking(){const b=new ForestBrain();b.position={x:0,z:0};b.move({x:2,z:0},[]);for(let i=0;i<60;i++)b.step(1/60);return b;}
test('retargeting along the same direction does not replay the start pose',()=>{const b=walking(),speed=b.motor.speed;b.move({x:2.5,z:.05},[]);assert.equal(b.state,'walk');assert.equal(b.motor.speed,speed);});
test('the turn pose does not insert a stationary pause into an existing walk',()=>{const b=walking();b.move({x:-2,z:0},[]);assert.equal(b.state,'turn');const before={...b.position};b.step(1/60);assert.ok(Math.hypot(b.position.x-before.x,b.position.z-before.z)>.001);});
