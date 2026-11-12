import test from 'node:test';import assert from 'node:assert/strict';
import {PlayerModel} from '../assets/scripts/meta/PlayerModel.ts';
import {Battle} from '../assets/scripts/battle/BattleCore.ts';
import {rollItem,rollItemSkills,itemMods,itemPower,itemName,ENHANCE,enhanceRate,breakChance,ITEM_SKILLS,SKILL_ROLLS,seeded} from '../assets/scripts/meta/Gear.ts';
const mem=()=>{const m={};return {getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=v;}};};
const rich=()=>{const p=new PlayerModel();p.coins=1e7;p.mats={wood:999,ore:999,hide:999,crystal:999};return p;};
test('item skills: count and tier follow quality, values grow with quality',()=>{const r=seeded(3);for(let q=0;q<5;q++)for(let i=0;i<40;i++){const sk=rollItemSkills('ring',q,r);assert.equal(sk.length,SKILL_ROLLS[q].length);
  sk.forEach((s,j)=>{const d=ITEM_SKILLS.find(x=>x.id===s.id);assert.ok(d.tier<=SKILL_ROLLS[q][j]);assert.ok(s.v>0);});assert.equal(new Set(sk.map(s=>s.id)).size,sk.length);}
 const godly=Array.from({length:60},()=>rollItemSkills('armor',4,r)).flat();assert.ok(godly.some(s=>ITEM_SKILLS.find(x=>x.id===s.id).tier===3),'神品 rolls tier-3 skills');
 const it=rollItem(1,'ring',3,r);assert.equal(it.lv,0);assert.equal(it.skills.length,2);const m=itemMods(it);for(const s of it.skills)assert.ok(m[s.id]>=s.v-1e-9);});
test('enhance: safe to +5, costs coins and ore, stats and power grow, name shows +N',()=>{const p=rich();const it=p.forge('ring');const pow=itemPower(it),atk=itemMods(it)[it.main.k],c=p.coins;
 for(let i=0;i<5;i++)assert.ok(p.enhance(it.id,false,()=>.99).ok,'guaranteed below +5');assert.equal(it.lv,5);assert.ok(p.coins<c);assert.ok(itemPower(it)>pow);assert.ok(itemMods(it)[it.main.k]>atk);assert.ok(itemName(it).startsWith('+5 '));
 assert.ok(enhanceRate(it)<1);});
test('enhance: from +6 failure drops a level, from +10 it can shatter; protection prevents both; failures add pity',()=>{const p=rich();const it=p.forge('armor');it.lv=7;
 const r1=p.enhance(it.id,false,()=>.999);assert.equal(r1.ok,false);assert.equal(r1.dropped,true);assert.equal(it.lv,6);assert.equal(it.fails,1);
 const rate=enhanceRate(it);assert.ok(Math.abs(rate-(ENHANCE.rates[6]+ENHANCE.pityStep))<1e-9);
 it.lv=11;const cr=p.mats.crystal;const r2=p.enhance(it.id,true,()=>.999);assert.equal(r2.broke,false);assert.equal(r2.dropped,false);assert.equal(it.lv,11);assert.ok(p.mats.crystal<cr,'protection costs 灵晶');
 p.equipItem('fox',it.id);it.gems[0]='ruby2';const g=p.gemCount('ruby2');assert.ok(breakChance(it)>0);
 const seq=[.999,0];const r3=p.enhance(it.id,false,()=>seq.shift());assert.equal(r3.broke,true);assert.ok(!p.items.includes(it));assert.equal(p.itemOwner(it.id),null);assert.equal(p.gemCount('ruby2'),g+1,'gems come back');
 const it2=p.forge('boots');it2.lv=ENHANCE.max;assert.equal(p.enhance(it2.id),null,'max level');p.coins=0;const it3=p.forge('boots');assert.equal(it3,null);});
test('old saves: items without skills get stable ones, enhancement saved',()=>{const s=mem();const p=rich();p.store=s;const it=p.forge('charm');it.lv=4;p.save();const raw=JSON.parse(s.getItem('pet-guardians-player-v1'));
 for(const i of raw.items){delete i.skills;delete i.lv;}s.setItem('pet-guardians-player-v1',JSON.stringify(raw));const a=new PlayerModel(s),b=new PlayerModel(s);
 assert.deepEqual(a.items[0].skills,b.items[0].skills);assert.equal(a.items[0].lv,0);
 const q=rich();q.store=s;const j=q.forge('charm');j.lv=9;q.save();assert.equal(new PlayerModel(s).items.find(x=>x.id===j.id).lv,9);});
test('battle: item skills fire (lifesteal, dodge, revive, siege, start shield)',()=>{
 const mk=mods=>{const b=new Battle(2,{deck:['boar','sparrow'],mods:{boar:mods}});b.gold=999;for(const m of [...b.monsters])b.kill(m);b.drain();const p=b.deploy(0,1);return {b,p};};
 {const {b,p}=mk({lifesteal:.3});p.hp=p.maxHp/2;const m=b.spawn('shroom');m.state='move';const h=p.hp;b.damage(m,300,p,{});assert.ok(p.hp>h);}
 {const {b,p}=mk({dodge:.4});let dodged=0;for(let i=0;i<60;i++){const h=p.hp;b.damage(p,10,b.spawn('fuzz'),{});if(p.hp===h)dodged++;}assert.ok(dodged>5&&dodged<45,String(dodged));}
 {const {b,p}=mk({revive:.5});b.damage(p,99999,null,{});assert.notEqual(p.state,'dead');assert.ok(p.hp>0);b.damage(p,99999,null,{});assert.equal(p.state,'dead','only once');}
 {const {b,p}=mk({startShield:.5});assert.ok(p.shieldT>0&&p.shieldRatio===.5);}
 {const a=mk({}),s=mk({siege:1});for(const x of [a,s]){x.p.targetKind='core';x.p.x=x.b.enemyCore.x;x.p.y=x.b.enemyCore.y+60;for(const m of [...x.b.monsters])x.b.kill(m);}
  const d=x=>{const h=x.b.enemyCore.hp;x.b.resolvePetAttack(x.p);return h-x.b.enemyCore.hp;};assert.ok(d(s)>d(a)*1.8);}});
import {JARS,JAR_TEN,FORGE} from '../assets/scripts/meta/Gear.ts';
test('jars: price, ten for nine, qualities respect the jar floor, pity guarantees, bag space checked',()=>{const p=new PlayerModel();p.coins=1e7;const c=p.coins;
 const r=p.openJar('silver',10);assert.equal(r.items.length,10);assert.equal(c-p.coins,JARS[1].coins*JAR_TEN);for(const it of r.items)assert.ok(it.q>=1,'silver starts at 良品');
 const g=p.openJar('gold',1,()=>0);assert.ok(g.items[0].q>=2);
 const q=new PlayerModel();q.coins=1e8;let maxGap=0,gap=0;for(let i=0;i<60;i++){const it=q.openJar('gold',1).items[0];if(q.items.length>70)q.items=q.items.slice(-5);gap++;if(it.q>=4){maxGap=Math.max(maxGap,gap);gap=0;}}assert.ok(Math.max(maxGap,gap)<=10,'神品 within 10 gold jars');
 const poor=new PlayerModel();poor.coins=10;assert.equal(poor.openJar('copper').error,'coins');const full=new PlayerModel();full.coins=1e7;while(full.items.length<FORGE.bagMax-3)full.items.push({...full.items[0]??{},id:full.nextItem++});assert.equal(full.openJar('copper',10).error,'bag');});
