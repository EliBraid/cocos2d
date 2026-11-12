import test from 'node:test';
import assert from 'node:assert/strict';
import {GameModel} from '../assets/scripts/GameModel.ts';
import {PetBrain} from '../assets/scripts/PetBrain.ts';
test('feeding spends food once, raises bond and survives a save round trip',()=>{
 const m=new GameModel();const before=m.food;assert.equal(m.feed(),true);assert.equal(m.food,before-1);assert.equal(m.bond,34);
 const restored=new GameModel(m.serialize());assert.equal(restored.bond,34);assert.equal(restored.food,m.food);
});
test('upgrade rejects insufficient coins without changing permanent stats',()=>{
 const m=new GameModel();m.coins=0;const before=m.stats.attack;assert.equal(m.upgrade(),false);assert.equal(m.level,1);assert.equal(m.stats.attack,before);
});
test('successful upgrade spends the shown cost and increases attack',()=>{
 const m=new GameModel();const coins=m.coins,cost=m.upgradeCost,attack=m.stats.attack;assert.equal(m.upgrade(),true);assert.equal(m.coins,coins-cost);assert.equal(m.level,2);assert.ok(m.stats.attack>attack);
});
test('each battle starts at level one and battle loot is paid on completion only',()=>{
 const m=new GameModel();m.upgrade();const permanent=m.level,coins=m.coins;
 assert.ok(m.beginBattle());for(let i=0;i<3;i++)m.awardKill();assert.equal(m.battle.level,2);assert.equal(m.coins,coins);
 const loot=m.finishBattle(true);assert.equal(m.coins,coins+loot);assert.ok(loot>0);assert.equal(m.level,permanent);
 assert.ok(m.beginBattle());assert.equal(m.battle.level,1);assert.equal(m.battle.kills,0);
});
test('battle entry cannot spend energy twice or enter without enough energy',()=>{
 const m=new GameModel();m.energy=4;assert.equal(m.beginBattle(),false);assert.equal(m.energy,4);
 m.energy=10;assert.ok(m.beginBattle());assert.equal(m.energy,5);assert.equal(m.beginBattle(),false);assert.equal(m.energy,5);
});
test('save data clamps invalid resources and ignores battle state',()=>{
 const m=new GameModel(JSON.stringify({version:1,coins:-2,food:Infinity,level:999,bond:-5,energy:999,battle:{level:99}}));
 assert.equal(m.coins,0);assert.ok(Number.isFinite(m.food));assert.equal(m.level,20);assert.equal(m.bond,0);assert.equal(m.energy,80);assert.equal(m.battle.active,false);
 const broken=new GameModel('{broken');assert.equal(broken.coins,1280);
});
test('strike marker is accepted once per attack and late or interrupted strikes do no damage',()=>{
 const b=new PetBrain();assert.equal(b.beginAttack('dummy'),true);const id=b.attackId;assert.ok(b.strike(id));assert.equal(b.strike(id),false);b.complete();assert.equal(b.strike(id),false);
 assert.ok(b.beginAttack('enemy'));const next=b.attackId;b.react('hit');assert.equal(b.strike(next),false);
});
test('movement reaches target without overshooting at a low frame rate',()=>{
 const b=new PetBrain();b.moveTo(1,0);let p={x:0,z:0};for(let i=0;i<20;i++)p=b.step(.2,p);assert.ok(Math.abs(p.x-1)<.001);assert.equal(b.state,'idle');assert.equal(b.facing,1);
 b.moveTo(-1,0);p=b.step(.1,p);assert.equal(b.facing,-1);
});
test('hit recovery is timed and movement interrupts happy but not hit',()=>{
 const b=new PetBrain();b.react('happy');b.moveTo(2,0);assert.equal(b.state,'walk');b.react('hit');b.moveTo(4,0);assert.equal(b.state,'hit');b.step(.5,{x:0,z:0});assert.equal(b.state,'idle');
});
