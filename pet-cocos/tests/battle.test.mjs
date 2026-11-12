import test from 'node:test';import assert from 'node:assert/strict';
import {Battle} from '../assets/scripts/battle/BattleCore.ts';
import {RARITY,PETS,STAGES,TOWER,towerStage} from '../assets/scripts/battle/BattleConfig.ts';
const run=(b,s,strat=()=>{})=>{for(let i=0;i<s*30&&b.state==='running';i++){strat(b);b.step(1/30);b.drain();}return b;};
test('deploy costs gold, starts card cooldown, occupies slot',()=>{const b=new Battle(1);const i=b.cards.findIndex(c=>c.kind==='turtle');const g=b.gold;const p=b.deploy(i,1);
 assert.ok(p);assert.equal(b.gold,g-RARITY.common.cost);assert.equal(b.cards[i].cd,RARITY.common.cd);assert.equal(b.blocked(i,1),'onfield');assert.equal(b.slotPet[1],p.id);});
test('cannot deploy without gold, onto taken slot, or while on cooldown',()=>{const b=new Battle(1);const f=b.cards.findIndex(c=>c.kind==='fox');assert.equal(b.blocked(f,0),null);b.gold=10;assert.equal(b.blocked(f,0),'gold');
 b.gold=999;const t=b.cards.findIndex(c=>c.kind==='turtle'),s=b.cards.findIndex(c=>c.kind==='sparrow');b.deploy(t,0);assert.equal(b.blocked(s,0),'slot');assert.equal(b.deploy(t,1),null);});
test('income arrives every 5 s',()=>{const b=new Battle(1);const g=b.gold;run(b,5.2);assert.ok(b.gold>=g+20);});
test('pets fight on their own and gain team XP',()=>{const b=new Battle(3);b.deploy(b.cards.findIndex(c=>c.kind==='turtle'),1);run(b,40,x=>{const f=x.cards.findIndex(c=>c.kind==='sparrow');if(x.canDeploy(f,4))x.deploy(f,4);});assert.ok(b.kills>0);assert.ok(b.level>1||b.xp>0);});
test('deterministic for same seed',()=>{const f=()=>{const b=new Battle(7);run(b,30,x=>{const i=x.cards.findIndex(c=>c.kind==='turtle');if(x.canDeploy(i,1))x.deploy(i,1);});return [b.kills,b.gold,Math.round(b.myCore.hp)];};assert.deepEqual(f(),f());});
test('idle player loses in 45-100 s',()=>{for(let s=1;s<=5;s++){const b=run(new Battle(s),200);assert.equal(b.state,'lost');assert.ok(b.result.time>45&&b.result.time<100,String(b.result.time));}});
test('captain skill has cooldown and needs target',()=>{const b=new Battle(1);assert.equal(b.castCaptain(),false);assert.equal(b.castCaptain({x:270,y:400}),true);assert.equal(b.captainReady(),false);run(b,26);assert.equal(b.captainReady(),true);});
test('wins with a sensible deck that levels its pets',()=>{const order=['turtle','sparrow','cat','chick','fox'];const b=new Battle(2,{bonus:{turtle:1.4,sparrow:1.4,cat:1.4,chick:1.4,fox:1.4}});run(b,1500,x=>{for(const k of order){const i=x.cards.findIndex(c=>c.kind===k);const s=x.slotPet.findIndex((p,j)=>!p&&(PETS[k].job==='guard'||PETS[k].job==='warrior'?j<3:j>=3));if(s>=0&&x.canDeploy(i,s))x.deploy(i,s);}for(let i=0;i<x.cards.length;i++)if(x.cards[i].petId)x.upgrade(i);});assert.equal(b.state,'won');assert.equal(b.result.segments,SEG.count);});
test('fallen pet frees slot and card re-enters cooldown',()=>{const b=new Battle(1);const i=0;const p=b.deploy(i,0);p.hp=1;(b).damage(p,500,null,{});assert.equal(b.slotPet[0],0);assert.ok(b.cards[i].cd>0);});

test('mechanic monsters: chapters introduce them in order',()=>{
 assert.deepEqual(STAGES[0].specials,[]);
 assert.ok(STAGES[8].specials.includes('armor')&&!STAGES[8].specials.includes('dasher'));
 assert.ok(STAGES[16].specials.includes('dasher')&&STAGES[16].specials.includes('armor'));
 assert.ok(STAGES[31].specials.includes('summoner')&&STAGES[31].specials.includes('stunner')&&STAGES[31].specials.includes('bomber'));});
test('armor monster takes less ranged damage, bomber explodes, stunner stuns, healer heals, summoner summons',()=>{
 const run=(kind,fn)=>{const b=new Battle(3,{deck:['dog','sparrow','cat'],stage:19});b.gold=9999;b.deploy(0,0);b.deploy(1,3);b.deploy(2,4);const m=b.spawnForTest?b.spawnForTest(kind):b.spawn(kind);return fn(b,m);};
 // armor vs ranged
 const dmg=(kind)=>run(kind,(b,m)=>{m.state='move';const sp=b.pets.find(p=>p.kind==='sparrow');const hp=m.hp;b.damage(m,100,sp,{});return hp-m.hp;});
 assert.ok(dmg('armor')<dmg('fuzz')*.8,'armor should shrug off ranged hits');
 // bomber blast hurts nearby pets
 run('bomber',(b,m)=>{const p=b.pets[0];m.x=p.x;m.y=p.y;m.state='move';const hp=p.hp;b.kill(m);assert.ok(p.hp<hp);});
 // stunner stuns
 run('stunner',(b,m)=>{const p=b.pets[0];m.x=p.x+40;m.y=p.y;m.state='move';m.abilityT=0;for(let i=0;i<5;i++)b.step(1/30);assert.ok(b.pets.some(q=>q.stunT>0),'a pet should be stunned');});
 // healer heals neighbours
 run('healer',(b,m)=>{const f=b.spawn('fuzz');f.x=m.x+20;f.y=m.y;f.state='move';m.state='move';f.hp=f.maxHp*.5;m.abilityT=0;b.step(1/30);assert.ok(f.hp>f.maxHp*.5);});
 // summoner adds fuzz
 run('summoner',(b,m)=>{m.state='move';m.abilityT=0;const n=b.monsters.length;b.step(1/30);assert.ok(b.monsters.length>=n+2);});});

// ---- waves, intents, pet levels, battle cards
import {PET_LV,WAVE,INTENTS,BATTLE_CARDS,CARD_Q} from '../assets/scripts/battle/BattleConfig.ts';
test('waves: no spawns during the breather, intent is announced before each wave',()=>{const b=new Battle(5);assert.equal(b.phase,'prep');assert.ok(b.intent&&b.intent.phase==='prep');
 run(b,WAVE.firstPrep-.5);assert.equal(b.monsters.filter(m=>!m.post).length,0,'first breather is quiet');
 let sawPrep=false,announced=0,spawnsInPrep=0;for(let i=0;i<60*30&&b.state==='running';i++){const was=b.phase,n=b.monsters.length;b.step(1/30);for(const e of b.drain()){if(e.type==='intent'&&e.what==='announce')announced++;if(e.type==='spawn'&&was==='prep'&&b.phase==='prep'&&!e.monster.kind.startsWith('boss'))spawnsInPrep++;}if(b.wave>=1&&b.phase==='prep')sawPrep=true;}
 assert.ok(b.wave>=2);assert.ok(sawPrep,'a breather follows a wave');assert.ok(announced>=1);assert.equal(spawnsInPrep,0);});
test('waves: a quickly cleared wave exposes the enemy core',()=>{const b=new Battle(5);run(b,WAVE.firstPrep+.1);while(b.phase==='burst')run(b,.5);for(const m of b.monsters)m.hp=1,b.damage(m,99,null,{});
 b.step(1/30);assert.equal(b.phase,'prep');assert.ok(b.exposed>0);const hp=b.enemyCore.hp;b.damageCore(b.enemyCore,'enemy',100);assert.equal(Math.round(hp-b.enemyCore.hp),Math.round(100*WAVE.exposeMult));});
test('intents: repair heals the enemy core but enough damage breaks it; seal blocks the captain',()=>{const b=new Battle(5);b.enemyCore.hp=b.enemyCore.maxHp*.5;b.intent={kind:'repair',phase:'prep',t:.1,prepMax:1,left:0,dur:0,prog:0,need:0,shield:0,shieldMax:0};b.phaseT=.05;run(b,1);
 assert.equal(b.intent.phase,'active');assert.ok(b.enemyCore.hp>b.enemyCore.maxHp*.5,'repairing');b.damageCore(b.enemyCore,'enemy',b.intent.need*3);assert.equal(b.intent.phase,'broken');
 const c=new Battle(5);c.intent={kind:'seal',phase:'prep',t:.1,prepMax:1,left:0,dur:0,prog:0,need:0,shield:0,shieldMax:0};c.phaseT=.05;run(c,.5);assert.ok(c.sealT>0);assert.equal(c.castCaptain({x:270,y:400}),false);
 const d=new Battle(5);d.intent={kind:'shell',phase:'prep',t:.1,prepMax:1,left:0,dur:0,prog:0,need:0,shield:0,shieldMax:0};d.phaseT=.05;run(d,.5);const hp=d.enemyCore.hp;d.damageCore(d.enemyCore,'enemy',100);assert.equal(d.enemyCore.hp,hp,'shield absorbs');});
test('intents: the enemy reacts to the board and never repeats itself',()=>{const b=new Battle(9,{stage:19});const seen=[];for(let i=0;i<40;i++){b.wave=i+2;seen.push(b.pickIntent());}
 for(let i=1;i<seen.length;i++)assert.notEqual(seen[i],seen[i-1]);assert.ok(new Set(seen).size>=6);for(const k of seen)assert.ok(INTENTS[k]);
 const early=new Battle(9,{stage:0});for(let i=0;i<30;i++){early.wave=i+2;const k=early.pickIntent();assert.equal(INTENTS[k].ch,1,k);}});
test('pet levels: kills fill the bar, gold buys the level, level survives death',()=>{const b=new Battle(3);const i=b.cards.findIndex(c=>c.kind==='turtle');const p=b.deploy(i,1);const atk=p.atk,hp=p.maxHp;
 assert.equal(b.upgrade(i),false);b.cards[i].xp=PET_LV.xpNeed(1);assert.ok(b.upgradeReady(i));b.gold=5;assert.equal(b.upgrade(i),false,'needs gold');b.gold=500;assert.equal(b.upgrade(i),true);
 assert.equal(b.cards[i].lv,2);assert.equal(b.gold,500-PET_LV.cost(1));assert.ok(p.atk>atk&&p.maxHp>hp);
 p.hp=1;b.damage(p,999,null,{});b.cards[i].cd=0;const q=b.deploy(i,1);assert.equal(b.petLevel(q),2);assert.equal(q.maxHp,p.maxHp);
 const m=b.spawn('fuzz');m.state='move';b.kill(m);assert.ok(b.cards[i].xp>0,'on-field pets gain xp from kills');});
test('battle cards: team levels offer cards, buying applies them',()=>{const b=new Battle(3);const p=b.deploy(0,0);b.gainXp(1000);assert.ok(b.level>3);assert.equal(b.offers.length,3,'tray holds three');
 for(const o of b.offers){assert.ok(BATTLE_CARDS.some(c=>c.id===o.card));assert.equal(o.cost,CARD_Q[o.q].cost);}
 b.offers=[{id:999,card:'atk',q:2,cost:150}];const atk=p.atk;b.gold=100;assert.equal(b.buyCard(999),false);b.gold=200;assert.equal(b.buyCard(999),true);assert.equal(b.gold,50);assert.ok(p.atk>atk);assert.equal(b.offers.length,0);
 b.offers=[{id:998,card:'repair',q:4,cost:1}];b.myCore.hp=1000;b.buyCard(998);assert.ok(b.myCore.hp>1000);});

import {SEG} from '../assets/scripts/battle/BattleConfig.ts';
test('segments: smashing a crystal plays a cutscene, then the next leg starts with everything carried over',()=>{const b=new Battle(4);const p=b.deploy(0,0);b.cards[0].lv=4;b.gold=300;b.level=5;b.offers=[{id:77,card:'atk',q:0,cost:60}];
 assert.equal(b.enemyCore.maxHp,Math.round(b.stage.coreHp*SEG.hp[0]));b.spawn('fuzz');b.enemyCore.hp=0;b.step(1/30);const ev=b.drain();
 assert.ok(ev.some(e=>e.type==='segment'));assert.equal(b.state,'running');assert.ok(b.transT>0);assert.ok(b.gold>=300+SEG.rewardBase);assert.equal(b.monsters.filter(m=>m.state!=='dead').length,0);
 assert.equal(b.blocked(1,3),'state','no deploying during the cutscene');run(b,SEG.trans+.2);
 assert.equal(b.seg,1);assert.equal(b.transT,0);assert.equal(b.enemyCore.maxHp,Math.round(b.stage.coreHp*SEG.hp[1]));assert.equal(b.enemyCore.hp,b.enemyCore.maxHp);
 assert.equal(b.cards[0].lv,4);assert.equal(b.level,5);assert.equal(b.offers.length,1);assert.ok(Math.hypot(p.x-p.post.x,p.y-p.post.y)<30,'regrouped on its slot');assert.equal(b.phase,'prep');
 b.seg=b.segs-1;b.enemyCore.hp=0;b.step(1/30);assert.equal(b.state,'won');assert.equal(b.result.segments,SEG.count);});
test('segments: boss stages end with a boss leg',()=>{const b=new Battle(4,{stage:7});assert.equal(b.mode,'siege');for(let i=0;i<SEG.count-1;i++){b.enemyCore.hp=0;b.step(1/30);run(b,SEG.trans+.2);}
 assert.equal(b.seg,SEG.count-1);assert.equal(b.mode,'defend');run(b,SEG.bossDelay+.5);assert.ok(b.monsters.some(m=>m.kind==='boss1'));});

test('garrison: a warden guards the crystal and halves its damage; the garrison holds its post',()=>{const b=new Battle(4,{stage:3});const g=b.monsters.filter(m=>m.post);assert.ok(g.some(m=>m.kind==='warden'));assert.ok(b.warded);
 for(const m of g)m.state='move';run(b,3);for(const m of g)assert.ok(Math.hypot(m.x-m.post.x,m.y-m.post.y)<40,'holds post with no pets around');
 const hp=b.enemyCore.hp;b.damageCore(b.enemyCore,'enemy',100);const warded=hp-b.enemyCore.hp;for(const m of b.monsters)if(m.kind==='warden')b.kill(m);assert.ok(!b.warded);const hp2=b.enemyCore.hp;b.damageCore(b.enemyCore,'enemy',100);assert.ok(hp2-b.enemyCore.hp>warded*1.8);});
test('garrison: ranged monsters shoot from range',()=>{const b=new Battle(4,{stage:3});const p=b.deploy(b.cards.findIndex(c=>c.kind==='sparrow'),4);for(const m of [...b.monsters])b.kill(m);b.drain();const a=b.spawn('archer');a.state='move';a.x=p.x;a.y=p.y-140;
 let shots=0;for(let i=0;i<90;i++){b.step(1/30);for(const e of b.drain())if(e.type==='fx'&&e.name==='shot'&&e.dir===-1)shots++;}assert.ok(shots>0);assert.ok(Math.hypot(a.x-p.x,a.y-p.y)>100,'keeps its distance');});
test('anti-summon: later-chapter melee monsters cleave crowded summons, elites hit them harder',()=>{
 const setup=stage=>{const b=new Battle(5,{stage});b.gold=9999;const p=b.deploy(0,0);b['summonPets'](p,2,.5,20);const ss=b.summonsOf(p);for(const s of ss){s.x=p.x+12;s.y=p.y;}
  const m=b.spawn('elite');m.state='idle';m.x=p.x+m.radius+p.radius;m.y=p.y;m.targetId=p.id;return {b,p,ss,m,hp:ss.map(s=>s.hp)};};
 const early=setup(0);early.b['resolveMonsterAttack'](early.m);assert.deepEqual(early.ss.map(s=>s.hp),early.hp,'chapter 1: no cleave');
 const late=setup(16);late.b['resolveMonsterAttack'](late.m);assert.ok(late.ss.every((s,i)=>s.hp<late.hp[i]),'chapter 3: summons next to the target are hit');
 assert.ok(late.b.drain().some(e=>e.type==='tip'));});
test('试炼之塔 floors: 2 legs, harder every floor, boss every 10th',()=>{const a=towerStage(1),b=towerStage(25),c=towerStage(30);assert.ok(b.hpScale>a.hpScale);assert.equal(c.boss,true);assert.equal(c.mode,'defend');
 const x=new Battle(3,{stageDef:a,segs:TOWER.segs});assert.equal(x.segs,2);assert.equal(x.stage.name,'1层');});
