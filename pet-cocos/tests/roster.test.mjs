import test from 'node:test';import assert from 'node:assert/strict';
import {Battle} from '../assets/scripts/battle/BattleCore.ts';
import {PETS,STAGES,CHAPTERS,BONDS,activeBonds,MONSTERS,JOBS} from '../assets/scripts/battle/BattleConfig.ts';
import {PlayerModel} from '../assets/scripts/meta/PlayerModel.ts';
import {TALENTS,skillText,CHAPTER_DROPS} from '../assets/scripts/meta/Gear.ts';
import {PET_LORE} from '../assets/scripts/meta/Welfare.ts';
import {PET_LOOK} from '../assets/scripts/PetProfile.ts';
const mem=()=>{const m={};return {getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=v;}};};
const clear=b=>{for(const m of [...b.monsters])b.kill(m);b.drain();};
test('roster: 30 pets, 7 jobs, every pet complete (passive, lore, look, talents)',()=>{const ks=Object.keys(PETS);assert.equal(ks.length,30);
 const jobs=new Set(ks.map(k=>PETS[k].job));assert.equal(jobs.size,7);for(const j of jobs){assert.ok(JOBS[j]);assert.equal(TALENTS[j].length,5);assert.ok(skillText(j,PETS[ks.find(k=>PETS[k].job===j)].skill));}
 for(const k of ks){const d=PETS[k];assert.ok(d.passive&&d.passive.name&&Object.keys(d.passive.mods).length,k);assert.ok(PET_LORE[k],k);assert.ok(PET_LOOK[k],k);if(PET_LOOK[k].base)assert.ok(!PET_LOOK[PET_LOOK[k].base].base);}
 assert.equal(new Set(ks.map(k=>PETS[k].id)).size,30);for(const r of ['common','fine','rare','epic','legend'])assert.ok(ks.some(k=>PETS[k].rarity===r),r);});
test('stages: 8 chapters x 8, boss last, elite 4th, difficulty rises, drops per chapter',()=>{assert.equal(CHAPTERS.length,8);assert.equal(STAGES.length,64);assert.equal(CHAPTER_DROPS.length,8);
 for(let c=0;c<8;c++){assert.ok(STAGES[c*8+7].boss);assert.ok(STAGES[c*8+3].elite);assert.equal(STAGES.filter(s=>s.chapter===c+1).length,8);assert.ok(MONSTERS['boss'+(c+1)]);}
 for(let i=1;i<64;i++)assert.ok(STAGES[i].hpScale>=STAGES[i-1].hpScale-.08*1.3,i);assert.ok(STAGES[63].hpScale>STAGES[31].hpScale);
 for(const s of STAGES)for(const k of s.specials)assert.ok(MONSTERS[k],k);});
test('passives and bonds go into battle mods',()=>{const b=new Battle(1,{deck:['fox','turtle','cat']});assert.ok(b.mods.turtle.thorns>=.25);assert.ok(b.bonds.includes('forest'));for(const k of ['fox','turtle','cat'])assert.ok((b.mods[k].hp||0)>=.08);
 const c=new Battle(1,{deck:['fox','turtle']});assert.equal(c.bonds.includes('forest'),false);assert.deepEqual(activeBonds(['bear','panda']).map(x=>x.id),['bears']);for(const bd of BONDS)for(const k of bd.pets)assert.ok(PETS[k],k);});
test('assassin blinks to the weakest back-line enemy',()=>{const b=new Battle(3,{deck:['weasel']});clear(b);const p=b.deploy(0,1);const near=b.spawn('fuzz'),far=b.spawn('archer');for(const m of [near,far])m.state='move';
 near.x=p.x;near.y=p.y-60;far.x=p.x+150;far.y=p.y-200;p.skillCd=0;for(let i=0;i<30;i++){b.step(1/30);}assert.ok(Math.hypot(p.x-far.x,p.y-far.y)<60||far.hp<far.maxHp,'went for the archer');});
test('summoner calls copies that fight, expire and do not steal XP',()=>{const b=new Battle(3,{deck:['hamster']});clear(b);const p=b.deploy(0,4);b.spawn('fuzz').state='move';p.skillCd=0;
 for(let i=0;i<20;i++)b.step(1/30);const s=b.summonsOf(p);assert.equal(s.length,3,'2 + 鼠多势众');assert.ok(s.every(x=>x.summon&&x.maxHp<p.maxHp));
 b.cards[0].xp=0;const m=b.spawn('fuzz');m.state='move';b.kill(m);assert.equal(b.cards[0].xp,m.xp,'xp once');
 for(const x of s)x.life=.01;b.step(1/30);b.step(1/30);assert.equal(b.summonsOf(p).length,0);assert.equal(b.slotPet[4],p.id,'owner keeps its slot');});
test('new monsters: splitter splits, ghost dodges ranged, frost freezes, starmage shields',()=>{const b=new Battle(3,{deck:['sparrow','dog'],stage:40});clear(b);const sp=b.deploy(0,3);const dg=b.deploy(1,1);
 const alive=()=>b.monsters.filter(m=>m.state!=='dead').length;const s=b.spawn('splitter');const n=alive()-1;s.state='move';b.kill(s);assert.equal(alive(),n+2);
 const g=b.spawn('ghost');g.state='move';let miss=0;for(let i=0;i<80;i++){const h=g.hp;b.damage(g,1,sp,{});if(g.hp===h)miss++;g.hp=g.maxHp;}assert.ok(miss>10&&miss<50,String(miss));
 const f=b.spawn('frost');f.state='move';f.targetId=dg.id;f.x=dg.x;f.y=dg.y-30;b.resolveMonsterAttack(f);assert.ok(dg.stunT>0);
 const st=b.spawn('starmage');st.state='move';const o=b.spawn('fuzz');o.state='move';o.x=st.x+30;o.y=st.y;st.abilityT=0;b.useAbility(st);assert.ok(o.armorT>0);});
test('team auras: 狼群 raises damage, 熊抱 lowers damage taken',()=>{const mk=deck=>{const b=new Battle(2,{deck});clear(b);b.gold=999;const p=b.deploy(0,1);if(deck[1])b.deploy(1,2);b.step(1/30);return {b,p};};
 const a=mk(['dog']),w=mk(['dog','wolf']);assert.ok(w.b.aura.atk>a.b.aura.atk);const br=mk(['dog','bear']);assert.ok(br.b.aura.def>0);});
test('old 20-stage saves map onto the 64-stage layout',()=>{const s=mem();const stars=Array(20).fill(0);for(let i=0;i<7;i++)stars[i]=2;s.setItem('pet-guardians-player-v1',JSON.stringify({version:1,stageStars:stars,stage:6}));
 const p=new PlayerModel(s);assert.equal(p.stageStars.length,64);assert.equal(p.stageStars[0],2);assert.equal(p.stageStars[3],2);assert.equal(p.stageStars[7],2,'old 1-5 boss -> new 1-8');assert.equal(p.stageStars[8],2,'old 2-1 -> new 2-1');assert.equal(p.stageStars[9],2);
 assert.equal(p.stage,9);assert.ok(p.stageUnlocked(4),'new middle stages to play');p.save();const q=new PlayerModel(s);assert.deepEqual(q.stageStars,p.stageStars);assert.equal(q.stage,9);});
test('hatchery can hatch the new pets',()=>{const p=new PlayerModel();p.food=1e6;const got=new Set();for(let i=0;i<3000;i++){const r=p.hatch();got.add(r.kind);}for(const k of ['wolf','weasel','hamster','octopus','stardragon'])assert.ok(got.has(k),k);});
