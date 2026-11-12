import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const walk=JSON.parse(fs.readFileSync(new URL('../assets/proto/forest/fox/fox.json',import.meta.url),'utf8')).animations.walk;
const D=walk.bones.hips.translate.at(-1).time;
// Phases (fraction of the clip): 0 left contact, ~.3 passing over left, .5 right contact, ~.8 passing over right.
const nearest=(frames,phase)=>frames.reduce((a,b)=>Math.abs(a.time-phase*D)<Math.abs(b.time-phase*D)?a:b);
test('the body absorbs weight at foot contact and rises over the supporting leg',()=>{const y=walk.bones.hips.translate;assert.ok(nearest(y,.05).y<nearest(y,.3).y);assert.ok(nearest(y,.55).y<nearest(y,.8).y);});
test('the head counters the hip and chest roll rather than magnifying it',()=>{for(const p of [.05,.3,.55,.8]){const total=['hips','back-btm','back-top','head'].reduce((sum,name)=>sum+(walk.bones[name].rotate?nearest(walk.bones[name].rotate,p).value:0),0);assert.ok(Math.abs(total)<4,'combined head roll '+total+' at phase '+p);}});
