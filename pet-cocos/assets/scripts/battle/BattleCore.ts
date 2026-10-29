// Real-time core battle. Pure logic: no engine imports, deterministic for a given
// seed, so it runs in Node tests and drives the Cocos view (BattleSlice).
// Rules follow 萌宠守卫战 游戏设计文档 · 战斗系统:
//  - the player picks a deck, then spends gold to send pets onto six fixed slots one by one;
//  - on the field every pet acts on its own (role behaviour + auto skill);
//  - all pets share one team level and XP; the captain skill is the only other input.
import {bossOf,BATTLE,STAGES,PETS,MONSTERS,RARITY,SLOTS,DECK,PET_LV,BATTLE_CARDS,CARD_Q,cardQWeights,WAVE,INTENTS,INTENT_NUM,SEG,ANTI_SUMMON,GARRISON,garrisonFor,activeBonds} from './BattleConfig';
import type {BuffKey,IntentKind} from './BattleConfig';
import type {PetSkill} from './BattleConfig';
import type {MonsterKind,PetKind,CaptainKind,Job,PetMods,StageDef} from './BattleConfig';
export type Vec={x:number;y:number};
export type UnitState='spawn'|'idle'|'move'|'attack'|'skill'|'dead';
export interface Unit{id:number;side:'pet'|'enemy';x:number;y:number;hp:number;maxHp:number;atk:number;def:number;aspd:number;speed:number;radius:number;reach:number;cooldown:number;windup:number;
 attackT:number;targetId:number;state:UnitState;facing:1|-1;burnT:number;burnDps:number;freezeT:number}
export interface Pet extends Unit{side:'pet';kind:PetKind;job:Job;slot:number;card:number;summon?:boolean;owner?:number;life?:number;post:Vec;skillCd:number;skillT:number;shieldT:number;shieldRatio:number;stunT:number;deadT:number;targetKind:'monster'|'core'|'ally'|''}
export interface Monster extends Unit{side:'enemy';kind:MonsterKind;tauntId:number;tauntT:number;abilityT:number;bossQ:{t:number;kind:string;x:number;y:number;r:number;mult:number}[];armorT:number;phaseN:number;raged:boolean;charges:number;gold:number;xp:number;aggro:number;spawnT:number;deadT:number;burnAcc:number;post:Vec|null;splash:number}
export interface Core{x:number;y:number;hp:number;maxHp:number;radius:number}
export interface Card{kind:PetKind;cd:number;cdMax:number;petId:number;lv:number;xp:number;revived?:boolean}
/** a battle card waiting in the tray (team level reward); buying applies it */
export interface Offer{id:number;card:string;q:number;cost:number}
/** what the enemy core is about to do / doing. phase: prep = announced with a countdown, active = in effect */
export interface Intent{kind:IntentKind;phase:'prep'|'active'|'done'|'broken';t:number;prepMax:number;left:number;dur:number;prog:number;need:number;shield:number;shieldMax:number}
type WaveMods={speed:number;hp:number;atk:number;aspd:number;gold:number};
export type FxName='tele'|'taunt'|'zap'|'summon'|'blast'|'flame'|'shield'|'arrow'|'fireball'|'heal'|'rain'|'freeze'|'sprout'|'shot';
export type BattleEvent=
 {type:'deploy';pet:Pet}|{type:'spawn';monster:Monster}|{type:'attack';unit:Unit}|{type:'skill';pet:Pet;name:string}|
 {type:'fx';name:FxName;x:number;y:number;x2?:number;y2?:number;r?:number;dir?:number}|
 {type:'hit';x:number;y:number;amount:number;targetId:number;crit?:boolean;burn?:boolean}|{type:'heal';x:number;y:number;amount:number;targetId:number}|{type:'death';unit:Unit}|
 {type:'gold';x:number;y:number;amount:number;income?:boolean}|{type:'levelup';level:number;offer:Offer|null}|{type:'core-hit';side:'pet'|'enemy';amount:number}|
 {type:'captain';kind:CaptainKind;x:number;y:number}|{type:'boss';monster:Monster;msg:string}|{type:'tip';msg:string}|{type:'end';result:BattleResult}|
 {type:'petlevel';card:number;pet:Pet|null;level:number}|{type:'card';offer:Offer;text:string}|{type:'offer';offer:Offer}|
 {type:'intent';intent:Intent;what:'announce'|'start'|'broken'|'end'}|{type:'wave';wave:number}|{type:'expose';time:number}|
 {type:'segment';seg:number;reward:number}|{type:'proc';x:number;y:number;text:string;good:boolean}|{type:'segment-start';seg:number};
export interface BattleResult{win:boolean;reason:'destroyed-enemy-core'|'survived'|'core-lost'|'boss-slain';stars:number;time:number;kills:number;goldEarned:number;level:number;deployed:number;segments:number}
export type DeployBlock='state'|'card'|'cooldown'|'onfield'|'slot'|'gold';
export interface BattleOptions{deck?:PetKind[];captain?:CaptainKind;mode?:'siege'|'defend';stage?:number;bonus?:Record<string,number>;mods?:Record<string,PetMods>;skills?:Record<string,PetSkill>;startGold?:number;/** 试炼之塔 etc.: play this stage definition instead of a campaign index */stageDef?:StageDef;segs?:number}
const TANK_FORWARD=95;   // px a guard stands ahead of its slot while waiting
const TAUNT_AURA=190;    // monsters this close to a guard prefer to hit it
const TAUNT_SKILL=230,TAUNT_TIME=4;
const CORE_ID=-1; // targetId for a core
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Battle{
 time=0;gold=BATTLE.startGold;goldEarned=0;kills=0;level=1;xp=0;captainCd=0;captain:CaptainKind;mode:'siege'|'defend';deployed=0;stage=STAGES[0];bonus:Record<string,number>;mods:Record<string,PetMods>;skills:Record<string,PetSkill>;
 state:'running'|'won'|'lost'='running';result:BattleResult|null=null;paused=false;
 pets:Pet[]=[];monsters:Monster[]=[];events:BattleEvent[]=[];cards:Card[];slotPet:number[]=SLOTS.map(()=>0);
 myCore:Core={...BATTLE.myCore,maxHp:BATTLE.myCore.hp};enemyCore:Core={...BATTLE.enemyCore,maxHp:BATTLE.enemyCore.hp};
 bonds:string[]=[];aura={atk:0,def:0,regen:0,gold:0};seg=0;segWave=0;segs:number=SEG.count;transT=0;segStart=0;private from:Record<number,Vec>={};
 wave=0;phase:'prep'|'burst'|'fight'='prep';phaseT:number=WAVE.firstPrep;intent:Intent|null=null;exposed=0;sealT=0;offers:Offer[]=[];
 buffs:Record<BuffKey,number>={atk:0,hp:0,aspd:0,cdr:0,crit:0,siege:0,income:0};
 coreQ:{t:number;x:number;y:number;r:number;dmg:number}[]=[];
 private queue:MonsterKind[]=[];private gap=1;private burstT=0;private fightStart=0;private mods0:WaveMods={speed:1,hp:1,atk:1,aspd:1,gold:1};private lastIntent:IntentKind='plain';private lastRepair=-9;
 private nextId=1;private seed:number;private bossT=22;private bossOut=false;private bossDown=false;private portal=0;private acc=0;private incomeT=BATTLE.income.every;
 constructor(seed=1,opts:BattleOptions={}){this.seed=seed>>>0||1;this.captain=opts.captain||'firerain';this.mode=opts.mode||BATTLE.mode;this.bonus=opts.bonus||{};this.skills=opts.skills||{};this.gold=BATTLE.startGold+Math.max(0,opts.startGold||0);this.stage=opts.stageDef||STAGES[Math.max(0,Math.min(STAGES.length-1,opts.stage||0))];if(opts.segs)this.segs=opts.segs;this.mode=opts.mode||this.modeOf(0);this.enemyCore.hp=this.enemyCore.maxHp=this.segHp(0);
  this.cards=(opts.deck||DECK).slice(0,6).map(kind=>({kind,cd:0,cdMax:RARITY[PETS[kind].rarity].cd,petId:0,lv:1,xp:0}));
  // each pet's mods = gear/talents (from the account) + its 专属被动 + every active 羁绊
  const deck=this.cards.map(c=>c.kind as string);this.bonds=activeBonds(deck).map(b=>b.id);const bondMods=activeBonds(deck).map(b=>b.mods);this.mods={};
  for(const k of new Set([...deck,...Object.keys(opts.mods||{})])){const m:PetMods={...(opts.mods?.[k]||{})};const add=(x:PetMods)=>{for(const key of Object.keys(x) as (keyof PetMods)[])m[key]=(m[key]||0)+(x[key]||0);};
   if(PETS[k]?.passive)add(PETS[k].passive.mods);if(deck.includes(k))for(const b of bondMods)add(b);this.mods[k]=m;}
  this.intent=this.newIntent('plain',WAVE.firstPrep);
  this.garrison=garrisonFor(this.stage,0,this.segs,this.stage.boss) as MonsterKind[];this.spawnGarrison();}
 rand(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
 // ------------------------------------------------------------- player API
 cardCost(i:number){return RARITY[PETS[this.cards[i].kind].rarity].cost;}
 /** why a card cannot go to a slot right now (null = it can). slot omitted = only check the card. */
 blocked(card:number,slot?:number):DeployBlock|null{const c=this.cards[card];if(this.state!=='running')return 'state';if(!c)return 'card';if(c.petId)return 'onfield';if(c.cd>0)return 'cooldown';if(this.transT>0)return 'state';
  if(slot!==undefined&&this.slotPet[slot])return 'slot';if(this.gold<this.cardCost(card))return 'gold';return null;}
 /** the skill a pet kind casts: the player's chosen talent skill, or the species default */
 skillOf(kind:string):PetSkill{return this.skills[kind]||PETS[kind].skill;}
 canDeploy(card:number,slot?:number){return this.blocked(card,slot)===null;}
 deploy(card:number,slot:number):Pet|null{if(!SLOTS[slot]||this.blocked(card,slot))return null;const c=this.cards[card],d=PETS[c.kind],s=SLOTS[slot];this.gold-=this.cardCost(card);
  const pet:Pet={id:this.nextId++,side:'pet',kind:c.kind,job:d.job,slot,card,post:{x:s.x,y:s.y},x:s.x,y:s.y+34,hp:0,maxHp:0,atk:0,def:0,aspd:d.aspd*(1+(this.mods[c.kind]?.aspd||0)),speed:d.move*17,radius:d.radius,reach:d.reach,cooldown:.3,windup:d.windup,attackT:-1,targetId:0,state:'idle',facing:1,
   burnT:0,burnDps:0,freezeT:0,skillCd:this.skillOf(c.kind).cd/2,skillT:-1,shieldT:0,shieldRatio:0,stunT:0,deadT:0,targetKind:''};
  this.applyLevel(pet,true);{const md=this.mods[c.kind];if(md?.startShield){pet.shieldT=5;pet.shieldRatio=Math.min(.7,md.startShield);}}this.pets.push(pet);this.slotPet[slot]=pet.id;c.petId=pet.id;c.cd=c.cdMax;this.deployed++;this.events.push({type:'deploy',pet});return pet;}
 captainReady(){return this.state==='running'&&this.captainCd<=0&&this.sealT<=0&&this.transT<=0;}
 captainNeedsTarget(){return this.captain!=='sprout';}
 /** Cast the captain skill. firerain / freeze need a ground point on the board. */
 castCaptain(at?:Vec):boolean{if(!this.captainReady())return false;const C=BATTLE.captain,k=this.captain;
  if(k==='sprout'){for(const p of this.pets)if(p.state!=='dead')this.heal(p,p.maxHp*C.sprout.heal);this.events.push({type:'captain',kind:k,x:this.myCore.x,y:this.myCore.y});}
  else{if(!at)return false;const b=BATTLE.board;at={x:Math.max(b.left,Math.min(b.right,at.x)),y:Math.max(b.top,Math.min(b.bottom,at.y))};
   if(k==='firerain'){const f=C.firerain,raw=f.dmg+f.perLevel*this.level;for(const m of this.live())if(dist(m,at)<=f.radius+m.radius){this.damage(m,raw,null,{});if(m.hp>0){m.burnDps=Math.max(m.burnT>0?m.burnDps:0,raw*f.burnRatio);m.burnT=f.burnTime;}}
    if(dist(this.enemyCore,at)<=f.radius+this.enemyCore.radius)this.damageCore(this.enemyCore,'enemy',raw*.6);this.events.push({type:'fx',name:'rain',x:at.x,y:at.y,r:f.radius});}
   else{const f=C.freeze;for(const m of this.live())if(dist(m,at)<=f.radius+m.radius)m.freezeT=Math.max(m.freezeT,(m.kind==='elite'||MONSTERS[m.kind]&&(MONSTERS[m.kind] as any).boss)?f.time*f.bossRatio:f.time);this.events.push({type:'fx',name:'freeze',x:at.x,y:at.y,r:f.radius});}
   this.events.push({type:'captain',kind:k,x:at.x,y:at.y});}
  this.captainCd=C.cooldown;return true;}
 // ------------------------------------------------------------ pet levels
 petXpNeed(i:number){const c=this.cards[i];return c&&c.lv<PET_LV.max?PET_LV.xpNeed(c.lv):0;}
 upgradeCost(i:number){return PET_LV.cost(this.cards[i]?.lv||1);}
 /** the XP bar is full (gold may still be missing) */
 upgradeReady(i:number){const c=this.cards[i];return !!c&&c.lv<PET_LV.max&&c.xp>=PET_LV.xpNeed(c.lv);}
 canUpgrade(i:number){return this.state==='running'&&this.upgradeReady(i)&&this.gold>=this.upgradeCost(i);}
 upgrade(i:number):boolean{if(!this.canUpgrade(i))return false;const c=this.cards[i];this.gold-=this.upgradeCost(i);c.xp-=PET_LV.xpNeed(c.lv);c.lv++;if(c.lv>=PET_LV.max)c.xp=0;
  const pet=c.petId?this.pets.find(p=>p.id===c.petId&&p.state!=='dead')||null:null;if(pet)this.applyLevel(pet,false,PET_LV.heal);
  this.events.push({type:'petlevel',card:i,pet,level:c.lv});return true;}
 private giveXp(c:Card,xp:number){if(c.lv>=PET_LV.max)return;c.xp=Math.min(PET_LV.xpNeed(c.lv),c.xp+xp);}
 // ------------------------------------------------------------ battle cards
 offerText(o:Offer){const d=BATTLE_CARDS.find(c=>c.id===o.card)!;return d.text(d.vals[o.q]);}
 canBuy(id:number){const o=this.offers.find(o=>o.id===id);return this.state==='running'&&!!o&&this.gold>=o.cost;}
 buyCard(id:number):boolean{const o=this.offers.find(o=>o.id===id);if(!o||!this.canBuy(id))return false;this.gold-=o.cost;this.offers=this.offers.filter(x=>x!==o);
  const d=BATTLE_CARDS.find(c=>c.id===o.card)!,v=d.vals[o.q];
  if(d.buff){this.buffs[d.buff]+=v;if(d.buff==='atk'||d.buff==='hp'||d.buff==='aspd')for(const p of this.allies())this.applyLevel(p,false,0);}
  else if(d.id==='repair'){const a=Math.round(this.myCore.maxHp*v);this.myCore.hp=Math.min(this.myCore.maxHp,this.myCore.hp+a);this.events.push({type:'fx',name:'heal',x:this.myCore.x,y:this.myCore.y,r:70});this.events.push({type:'heal',x:this.myCore.x,y:this.myCore.y-60,amount:a,targetId:CORE_ID});}
  else if(d.id==='meteor'){const dmg=v*(1+.08*(this.level-1));this.events.push({type:'fx',name:'rain',x:270,y:420,r:230});for(const m of this.live())this.damage(m,dmg,null,{});}
  else if(d.id==='xp'){for(const p of this.crew())this.giveXp(this.cards[p.card],v);}
  this.events.push({type:'card',offer:o,text:d.text(v)});return true;}
 private offerCard():Offer{const w=cardQWeights(this.level),sum=w.reduce((a,b)=>a+b,0);let x=this.rand()*sum,q=0;for(;q<4;q++){x-=w[q];if(x<0)break;}
  const pool=BATTLE_CARDS.filter(c=>!this.offers.some(o=>o.card===c.id)),d=pool[Math.floor(this.rand()*pool.length)];
  const o:Offer={id:this.nextId++,card:d.id,q,cost:CARD_Q[q].cost};if(this.offers.length>=3)this.offers.shift();this.offers.push(o);this.events.push({type:'offer',offer:o});return o;}
 // ---------------------------------------------------------------- stepping
 step(dt:number){if(this.state!=='running'||this.paused)return;this.acc+=Math.min(dt,.25);const h=1/30;while(this.acc>=h&&this.state==='running'){this.acc-=h;this.tick(h);}}
 private tick(dt:number){this.time+=dt;if(this.transT>0){this.transition(dt);return;}this.updateAura();this.captainCd=Math.max(0,this.captainCd-dt);this.sealT=Math.max(0,this.sealT-dt);for(const c of this.cards)c.cd=Math.max(0,c.cd-dt);
  this.incomeT-=dt;if(this.incomeT<=0){this.incomeT+=BATTLE.income.every;const a=Math.round(BATTLE.income.amount*(1+this.buffs.income));this.gold+=a;this.events.push({type:'gold',x:this.myCore.x,y:this.myCore.y-40,amount:a,income:true});}
  // 总攻: a leg that drags past the soft limit makes the enemy crystal crumble on its own, so no battle stalls forever
  if(this.overtime&&this.mode==='siege'&&this.enemyCore.hp>0){if(!this.tipped.has('overtime'))this.tip('overtime','总攻！敌方水晶开始崩裂，坚持住');this.enemyCore.hp=Math.max(0,this.enemyCore.hp-this.enemyCore.maxHp*SEG.overtimeDrain*dt);}
  this.spawner(dt);this.intentTick(dt);this.coreShots(dt);for(const p of this.pets)this.petTick(p,dt);for(const m of this.monsters)this.monsterTick(m,dt);this.separate();
  this.monsters=this.monsters.filter(m=>m.state!=='dead'||(m.deadT-=dt)>0);this.pets=this.pets.filter(p=>p.state!=='dead'||p.deadT>0);
  if(this.bossDown)this.finish(true,'boss-slain');else if(this.myCore.hp<=0)this.finish(false,'core-lost');else if(this.enemyCore.hp<=0&&this.mode==='siege'){if(this.seg<this.segs-1)this.clearSegment();else this.finish(true,'destroyed-enemy-core');}
  else if(this.mode==='defend'&&this.time-this.segStart>=SEG.bossHold)this.finish(true,'survived');}
 private finish(win:boolean,reason:BattleResult['reason']){this.state=win?'won':'lost';const r=this.myCore.hp/this.myCore.maxHp;
  const stars=!win?0:reason==='survived'?1:r>.6?3:r>.3?2:1;
  this.result={win,reason,stars,time:this.time,kills:this.kills,goldEarned:this.goldEarned,level:this.level,deployed:this.deployed,segments:this.seg+(win?1:0)};this.events.push({type:'end',result:this.result});}
 // ---------------------------------------------------------------- waves
 /** prep (breather + intent countdown) -> burst (the wave walks out) -> fight (until it is mostly cleared) -> prep ... */
 private spawner(dt:number){const st=this.stage;if(this.exposed>0)this.exposed=Math.max(0,this.exposed-dt);
  if(st.boss&&!this.bossOut&&this.seg===this.segs-1){this.bossT-=dt;if(this.bossT<=0){this.bossOut=true;const bm=this.spawn(bossOf(st.chapter));bm.x=270;bm.y=BATTLE.portals[0].y+10;this.events.push({type:'boss',monster:bm,msg:`${MONSTERS[bm.kind].name} 登场！${(MONSTERS[bm.kind] as any).desc}`});}}
  this.phaseT-=dt;
  if(this.phase==='prep'){if(this.intent&&this.intent.phase==='prep')this.intent.t=Math.max(0,this.phaseT);if(this.phaseT<=0)this.startWave();return;}
  const alive=this.monsters.filter(m=>m.state!=='dead'&&!m.post&&!(MONSTERS[m.kind] as any).boss).length;
  if(this.phase==='burst'){this.burstT-=dt;while(this.queue.length&&this.burstT<=0){if(alive>=WAVE.aliveCap){this.burstT=.3;break;}this.spawnWave(this.queue.shift()!);this.burstT+=this.gap;}
   if(!this.queue.length){this.phase='fight';this.phaseT=WAVE.fightMax;this.fightStart=this.time;}return;}
  if(alive<=WAVE.clearAt||this.phaseT<=0)this.beginPrep(alive<=WAVE.clearAt&&this.time-this.fightStart<=WAVE.exposeIn);}
 get raging(){return (this.mode==='siege'&&this.enemyCore.hp/this.enemyCore.maxHp<BATTLE.spawn.rageBelow)||this.overtime;}
 /** lingering in one leg past the soft limit enrages the enemy (bigger waves, shorter breathers) */
 get overtime(){return this.time-this.segStart>SEG.softLimit;}
 /** seconds until the next wave walks out (0 while one is coming) */
 get nextWaveIn(){return this.phase==='prep'?Math.max(0,this.phaseT):0;}
 private prepTime(){return Math.max(WAVE.minPrep,WAVE.prep-this.wave*WAVE.prepStep)*(this.raging?WAVE.ragePrep:1);}
 private beginPrep(quick:boolean){this.phase='prep';const t=this.prepTime();this.phaseT=t;
  if(this.intent&&this.intent.phase==='active'&&this.intent.left>=1e8){this.intent.phase='done';this.events.push({type:'intent',intent:this.intent,what:'end'});}
  if(quick){this.exposed=t+WAVE.exposeExtra;this.events.push({type:'expose',time:this.exposed});}
  this.intent=this.newIntent(this.pickIntent(),t);this.events.push({type:'intent',intent:this.intent,what:'announce'});}
 private newIntent(kind:IntentKind,t:number):Intent{return {kind,phase:'prep',t,prepMax:t,left:0,dur:0,prog:0,need:0,shield:0,shieldMax:0};}
 /** the enemy reads the board: a hurt core repairs or shields, a crowded back line gets flanked, a ready captain gets sealed */
 private pickIntent():IntentKind{const ch=this.stage.chapter,core=this.enemyCore.hp/this.enemyCore.maxHp,on=this.allies(),back=on.filter(p=>p.job==='ranged'||p.job==='mage'||p.job==='support').length,guards=on.filter(p=>p.job==='guard').length;
  const w:Partial<Record<IntentKind,number>>={rush:12,horde:guards?10:18,elite:this.wave>=2?14:0,repair:core<.8&&this.wave-this.lastRepair>=3?10+50*(1-core):0,shell:core<.9?8+30*(1-core):3,
   greed:this.gold>200?4:11,reinforce:this.garrison.length>this.guards.length&&this.segWave>=2?6+8*(this.garrison.length-this.guards.length):0,frenzy:12,seal:this.captainCd<=3?16:4,flank:6+back*7,bombard:6+on.length*3};
  const keys=(Object.keys(w) as IntentKind[]).filter(k=>INTENTS[k].ch<=ch&&k!==this.lastIntent&&(w[k]||0)>0);let sum=0;for(const k of keys)sum+=w[k]!;
  let x=this.rand()*sum,pick:IntentKind='rush';for(const k of keys){x-=w[k]!;if(x<0){pick=k;break;}}
  this.lastIntent=pick;if(pick==='repair')this.lastRepair=this.wave;return pick;}
 private startWave(){const st=this.stage;++this.wave;const n=++this.segWave+this.seg*SEG.waveCarry,it=this.intent,kind:IntentKind=it?.kind||'plain';this.phase='burst';this.events.push({type:'wave',wave:this.segWave});
  let count=st.waveSize+WAVE.countExtra+Math.floor((n-1)*WAVE.countStep);if(this.raging)count=Math.round(count*WAVE.rageCount);
  const m:WaveMods={speed:1,hp:1,atk:1,aspd:1,gold:1};
  if(kind==='rush')m.speed=1.5;else if(kind==='horde'){count=Math.round(count*1.6);m.hp=.7;}else if(kind==='frenzy'){m.atk=1.35;m.aspd=1.2;}else if(kind==='greed'){m.hp=1.2;m.gold=2;}
  this.mods0=m;const q:MonsterKind[]=[];for(let i=0;i<count;i++)q.push(n>=3&&this.rand()<st.shroomChance?'shroom':'fuzz');
  if(st.specials.length&&n>=2){const k=1+Math.floor(n/3);for(let i=0;i<k;i++)q[Math.floor(this.rand()*q.length)]=st.specials[Math.floor(this.rand()*st.specials.length)];}
  if(n>=3&&n%3===0)q.push('elite');
  if(n>=3)for(let i=0;i<Math.floor(q.length/5);i++)q.push((st.index>=3||st.index<0)&&i%2===1?'caster':'archer');
  if(kind==='elite'){q.push('elite','shroom','shroom');if(n>=6)q.push('elite');}
  if(kind==='flank')for(let i=0;i<q.length;i+=2)if(q[i]==='fuzz'||q[i]==='shroom')q[i]='dasher';
  this.queue=q;const dur=WAVE.burstBase+q.length*WAVE.burstPer;this.gap=dur/q.length;this.burstT=0;
  if(it){it.phase='active';it.t=0;const N=INTENT_NUM;
   if(kind==='repair'){it.left=it.dur=N.repairTime;it.need=Math.round(this.enemyCore.maxHp*N.repairBreak);}
   else if(kind==='shell'){it.left=it.dur=N.shellTime;it.shield=it.shieldMax=Math.round(this.enemyCore.maxHp*N.shellPct);}
   else if(kind==='seal'){it.left=it.dur=N.sealTime;this.sealT=N.sealTime;}
   else if(kind==='reinforce'){it.left=it.dur=1.5;this.spawnGarrison(true);}
   else if(kind==='bombard'){it.left=it.dur=N.bombLead+N.bombGap*(N.bombShots-1)+.4;const pets=this.allies();
    for(let i=0;i<N.bombShots;i++){const t=pets.length?pets[Math.floor(this.rand()*pets.length)]:SLOTS[Math.floor(this.rand()*SLOTS.length)];const x=t.x+(this.rand()-.5)*30,y=t.y+(this.rand()-.5)*24,lead=N.bombLead+i*N.bombGap;
     this.coreQ.push({t:lead,x,y,r:N.bombR,dmg:N.bombDmg*st.atkScale*this.growth()});this.events.push({type:'fx',name:'tele',x,y,r:N.bombR,x2:lead});}}
   else it.left=it.dur=1e9; // lasts for the whole wave
   this.events.push({type:'intent',intent:it,what:'start'});}}
 private intentTick(dt:number){const it=this.intent;if(!it||it.phase!=='active'||it.left>=1e8)return;it.left-=dt;
  if(it.kind==='repair'){this.enemyCore.hp=Math.min(this.enemyCore.maxHp,this.enemyCore.hp+this.enemyCore.maxHp*INTENT_NUM.repairPct/INTENT_NUM.repairTime*dt);}
  if(it.left<=0||(it.kind==='shell'&&it.shield<=0)){it.phase='done';it.shield=0;this.events.push({type:'intent',intent:it,what:'end'});}}
 private coreShots(dt:number){if(!this.coreQ.length)return;for(const q of this.coreQ)q.t-=dt;const due=this.coreQ.filter(q=>q.t<=0);this.coreQ=this.coreQ.filter(q=>q.t>0);
  for(const q of due){this.events.push({type:'fx',name:'fireball',x:this.enemyCore.x,y:this.enemyCore.y-40,x2:q.x,y2:q.y,r:q.r});this.events.push({type:'fx',name:'blast',x:q.x,y:q.y,r:q.r});
   for(const p of this.allies())if(dist(p,q)<=q.r+p.radius)this.damage(p,q.dmg,null,{});}}
 // ---------------------------------------------------------------- segments
 modeOf(seg:number):'siege'|'defend'{return this.stage.boss&&seg>=this.segs-1?'defend':'siege';}
 segHp(seg:number){return Math.round(this.stage.coreHp*SEG.hp[Math.min(seg,SEG.hp.length-1)]);}
 /** 0..1 progress through the leg-change cutscene (0 when none is playing) */
 get transK(){return this.transT>0?1-this.transT/SEG.trans:0;}
 private clearSegment(){const reward=Math.round((SEG.rewardBase+SEG.rewardPer*this.seg)*(1+this.buffs.income));this.gold+=reward;this.goldEarned+=reward;
  for(const m of this.monsters)if(m.state!=='dead'){m.state='dead';m.deadT=.6;m.hp=0;m.attackT=-1;this.events.push({type:'death',unit:m});}
  this.queue=[];this.coreQ=[];if(this.intent&&this.intent.phase!=='done'){this.intent.phase='done';}this.intent=null;this.exposed=0;this.sealT=0;
  this.from={};for(const p of this.allies()){p.attackT=-1;p.stunT=0;p.targetId=0;p.targetKind='';p.state='idle';this.from[p.id]={x:p.x,y:p.y};}
  this.transT=SEG.trans;this.events.push({type:'segment',seg:this.seg,reward});}
 /** the cutscene: crystal shatters (boom), the ground scrolls while the team regroups on its slots, then the next leg starts */
 private transition(dt:number){this.transT-=dt;const e=SEG.trans-this.transT,k=Math.max(0,Math.min(1,(e-SEG.boom)/SEG.scroll)),ease=k*k*(3-2*k);
  this.monsters=this.monsters.filter(m=>(m.deadT-=dt)>0);this.pets=this.pets.filter(p=>p.state!=='dead'||(p.deadT-=dt)>0);
  for(const p of this.allies()){p.hp=Math.min(p.maxHp,p.hp+p.maxHp*SEG.heal*dt);const f=this.from[p.id];if(f&&e>=SEG.boom){p.x=f.x+(p.post.x-f.x)*ease;p.y=f.y+(p.post.y-f.y)*ease;p.state=k<1?'move':'idle';p.facing=1;}}
  if(this.transT<=0)this.startSegment(this.seg+1);}
 private startSegment(n:number){this.transT=0;this.seg=n;this.mode=this.modeOf(n);this.enemyCore.hp=this.enemyCore.maxHp=this.segHp(n);this.segStart=this.time;this.segWave=0;this.from={};
  this.garrison=garrisonFor(this.stage,n,this.segs,this.stage.boss) as MonsterKind[];this.spawnGarrison();
  for(const p of this.allies()){p.x=p.post.x;p.y=p.post.y;p.state='idle';p.skillCd=Math.min(p.skillCd,2);}
  if(this.stage.boss&&n===this.segs-1)this.bossT=SEG.bossDelay;
  this.phase='prep';this.phaseT=WAVE.firstPrep;this.intent=this.newIntent(this.wave?this.pickIntent():'plain',WAVE.firstPrep);this.events.push({type:'segment-start',seg:n});this.events.push({type:'intent',intent:this.intent,what:'announce'});}
 // ---------------------------------------------------------------- garrison
 garrison:MonsterKind[]=[];
 /** a living 岩盾卫 of the garrison shields the crystal */
 get warded(){return this.monsters.some(m=>m.kind==='warden'&&m.post&&m.state!=='dead');}
 get guards(){return this.monsters.filter(m=>m.post&&m.state!=='dead');}
 private spawnGarrison(onlyMissing=false){const alive:Record<string,number>={};if(onlyMissing)for(const m of this.guards)alive[m.kind]=(alive[m.kind]||0)+1;const used:Record<string,number>={};let n=0;
  for(const k of this.garrison){const i=used[k]=(used[k]||0)+1;if(onlyMissing&&(alive[k]||0)>=i)continue;const posts=GARRISON.posts[k]||[{x:270,y:290}],post=posts[(i-1)%posts.length];
   const m=this.spawn(k);m.x=post.x;m.y=post.y-30;m.post={x:post.x,y:post.y};m.spawnT=.6;n++;}return n;}
 private growth(){return 1+Math.max(0,this.segWave-1)*WAVE.growth+this.seg*SEG.segGrowth;}
 private spawnWave(kind:MonsterKind){const m=this.spawn(kind),k=this.mods0;m.hp=m.maxHp=Math.round(m.maxHp*k.hp);m.atk=Math.round(m.atk*k.atk);m.aspd*=k.aspd;m.speed*=k.speed;m.gold=Math.round(m.gold*k.gold);return m;}
 private spawn(kind:MonsterKind,i=0){const d=MONSTERS[kind],g=this.growth(),p=BATTLE.portals[this.portal++%BATTLE.portals.length],a=this.rand()*Math.PI*2,r=6+i*7;
  const m:Monster={id:this.nextId++,side:'enemy',kind,x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.6,hp:Math.round(d.hp*g*this.stage.hpScale),maxHp:Math.round(d.hp*g*this.stage.hpScale),atk:Math.round(d.atk*g*this.stage.atkScale),def:d.def,aspd:d.aspd,speed:d.speed*(.92+this.rand()*.16),radius:d.radius,reach:(d as any).reach||10,cooldown:.4,post:null,splash:(d as any).splash||0,windup:d.windup,attackT:-1,targetId:0,state:'spawn',facing:1,burnT:0,burnDps:0,freezeT:0,gold:Math.max(1,Math.round(d.gold*BATTLE.goldMul)),xp:d.xp,aggro:d.aggro,spawnT:.45,deadT:0,burnAcc:0,charges:kind==='summoner'?3:0,tauntId:0,tauntT:0,bossQ:[],armorT:0,phaseN:0,raged:false,abilityT:kind.startsWith('boss')?4:kind==='summoner'?3:kind==='stunner'?2.5:kind==='healer'?1.5:kind==='starmage'?2:0};
  this.monsters.push(m);this.events.push({type:'spawn',monster:m});return m;}
 // ------------------------------------------------------------------ levels
 /** pet stats from its own level, gear bonus and bought battle cards. heal: share of max hp restored on top */
 private applyLevel(p:Pet,fill=false,heal=0){if(p.summon)return;const d=PETS[p.kind],L=(this.cards[p.card].lv-1)*PET_LV.growth,old=p.maxHp,k=this.bonus[p.kind]||1,md=this.mods[p.kind]||{},b=this.buffs;
  p.maxHp=Math.round((d.hp+d.dhp*L)*k*(1+(md.hp||0)+b.hp));p.atk=Math.round((d.atk+d.datk*L)*k*(1+(md.atk||0)+b.atk));p.def=d.def+d.ddef*L+(md.def||0);p.aspd=d.aspd*(1+(md.aspd||0)+b.aspd);
  p.hp=fill?p.maxHp:Math.min(p.maxHp,p.hp+Math.max(0,p.maxHp-old)+p.maxHp*heal);}
 /** team XP: every team level puts a battle card into the tray */
 private gainXp(xp:number){if(this.level>=BATTLE.maxLevel)return;this.xp+=xp;while(this.level<BATTLE.maxLevel&&this.xp>=BATTLE.xpToNext(this.level)){this.xp-=BATTLE.xpToNext(this.level);this.level++;
  const offer=this.offerCard();this.events.push({type:'levelup',level:this.level,offer});}}
 get xpNeed(){return this.level>=BATTLE.maxLevel?1:BATTLE.xpToNext(this.level);}
 petLevel(p:Pet){return this.cards[p.card]?.lv||1;}
 skillPower(p:Pet){return 1+PET_LV.skillPerLv*(this.petLevel(p)-1);}
 // ------------------------------------------------------------------ helpers
 private live(){return this.monsters.filter(m=>m.state!=='dead'&&m.state!=='spawn');}
 private allies(){return this.pets.filter(p=>p.state!=='dead');}
 /** pets that really fight (not summons) */
 private crew(){return this.pets.filter(p=>p.state!=='dead'&&!p.summon);}
 /** team-wide passives of the pets on the field */
 private updateAura(){const a={atk:0,def:0,regen:0,gold:0};for(const p of this.crew()){const m=this.mods[p.kind];if(!m)continue;a.atk+=m.auraAtk||0;a.def+=m.auraDef||0;a.regen+=m.teamRegen||0;a.gold+=m.goldKill||0;}
  a.atk=Math.min(.4,a.atk);a.def=Math.min(.3,a.def);a.regen=Math.min(.012,a.regen);this.aura=a;}
 summonsOf(p:Pet){return this.pets.filter(x=>x.summon&&x.owner===p.id&&x.state!=='dead');}
 /** 召唤师: small copies of the summoner that fight in melee and vanish after a while */
 private summonPets(p:Pet,count:number,mult:number,life:number){const max=4+(this.mods[p.kind]?.summonPlus||0);let n=Math.min(count+(this.mods[p.kind]?.summonPlus||0),max-this.summonsOf(p).length);
  for(let i=0;i<n;i++){const a=this.rand()*Math.PI*2,x=p.x+Math.cos(a)*30,y=p.y-20+Math.sin(a)*14;
   const s:Pet={id:this.nextId++,side:'pet',kind:p.kind,job:'warrior',slot:-1,card:p.card,summon:true,owner:p.id,life:life*(1+(this.mods[p.kind]?.summonLife||0)),post:{x,y:y-40},x,y,hp:Math.round(p.maxHp*mult),maxHp:Math.round(p.maxHp*mult),atk:Math.round(p.atk*mult*1.6),def:p.def,aspd:1.1,speed:2.9*17,radius:Math.round(p.radius*.7),reach:14,cooldown:.3,windup:.25,attackT:-1,targetId:0,state:'idle',facing:1,
    burnT:0,burnDps:0,freezeT:0,skillCd:1e9,skillT:-1,shieldT:0,shieldRatio:0,stunT:0,deadT:0,targetKind:''};this.pets.push(s);this.events.push({type:'deploy',pet:s});}
  this.events.push({type:'fx',name:'summon',x:p.x,y:p.y,r:60});return n;}
 private heal(p:Pet,amount:number,silent=false){const a=Math.min(Math.round(amount),Math.round(p.maxHp-p.hp));if(a<=0)return;p.hp+=a;if(!silent)this.events.push({type:'heal',x:p.x,y:p.y-p.radius*2,amount:a,targetId:p.id});}
 private nearest(list:Monster[],from:Vec,within=Infinity){let best:Monster|null=null,bd=within;for(const m of list){const d=dist(m,from);if(d<=bd){bd=d;best=m;}}return best;}
 // ------------------------------------------------------------------ pets
 private petTick(p:Pet,dt:number){
  if(p.state==='dead'){p.deadT-=dt;return;}
  if(p.summon){p.life=(p.life||0)-dt;if(p.life<=0){p.hp=0;this.petDown(p);return;}}
  p.cooldown-=dt;p.skillCd-=dt;if(p.shieldT>0)p.shieldT-=dt;{const rg=(p.summon?0:this.mods[p.kind]?.regen||0)+this.aura.regen;if(rg&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*rg*dt);}
  if(p.burnT>0){p.burnT-=dt;p.hp-=p.burnDps*dt;}
  if(p.stunT>0){p.stunT-=dt;p.attackT=-1;p.state='idle';return;}
  if(p.state==='skill'){p.skillT-=dt;if(p.skillT<=0){this.resolveSkill(p);if((p.state as UnitState)!=='dead')p.state='idle';p.cooldown=Math.max(p.cooldown,.35);}return;}
  if(p.attackT>=0){p.attackT-=dt;if(p.attackT<0)this.resolvePetAttack(p);return;}
  const d=PETS[p.kind];
  if(p.skillCd<=0&&this.skillWanted(p)){p.skillCd=this.skillOf(p.kind).cd*(1-Math.min(.6,(this.mods[p.kind]?.cdr||0)+this.buffs.cdr));p.state='skill';p.skillT=d.windup;p.attackT=-1;this.events.push({type:'skill',pet:p,name:this.skillOf(p.kind).name});return;}
  const goal=this.chooseGoal(p);
  if(!goal){p.targetId=0;p.targetKind='';const home=p.job==='guard'?{x:p.post.x,y:p.post.y-TANK_FORWARD}:p.post; // tanks hold a line in front of the squad
   if(dist(p,home)>4)this.moveToward(p,home,p.speed*dt);else p.state='idle';return;}
  p.targetId=goal.id;p.targetKind=goal.kind;const need=goal.kind==='ally'?p.reach:p.radius+goal.r+p.reach,dd=dist(p,goal);p.facing=goal.x<p.x?-1:goal.x>p.x?1:p.facing;
  if(dd>need){ // melee pets are held by their leash when picking targets; everyone else walks all the way in
   if(d.leash>0||p.job!=='guard')this.moveToward(p,goal,Math.min(p.speed*dt,dd-need));else if(dist(p,p.post)>4)this.moveToward(p,p.post,p.speed*dt);
   return;}
  p.state='idle';if(p.cooldown<=0){p.cooldown=1/p.aspd;p.attackT=p.windup;p.state='attack';this.events.push({type:'attack',unit:p});}}
 /** each role picks its own target; nothing here is player-controlled */
 private chooseGoal(p:Pet):{x:number;y:number;r:number;id:number;kind:'monster'|'core'|'ally'}|null{const d=PETS[p.kind],mons=this.live();let t:Monster|null=null;
  const asGoal=(m:Monster)=>({x:m.x,y:m.y,r:m.radius,id:m.id,kind:'monster' as const});
  switch(p.job){
   case 'guard':{let bd=Infinity;for(const m of mons){if(dist(m,p.post)>d.leash+d.reach+m.radius+p.radius+20)continue;const c=dist(m,p);if(c<bd){bd=c;t=m;}}return t?asGoal(t):null;} // tanks step out to meet the nearest enemy
   case 'warrior':{t=this.nearest(mons.filter(m=>dist(m,p.post)<=d.leash||dist(m,p)<=110),p);if(t)return asGoal(t);
    if(this.mode==='siege'&&!mons.some(m=>dist(m,this.myCore)<200))return {x:this.enemyCore.x,y:this.enemyCore.y,r:this.enemyCore.radius,id:CORE_ID,kind:'core'};return null;}
   case 'support':{let low:Pet|null=null,lr=.9;for(const a of this.allies()){const r=a.hp/a.maxHp;if(r<lr&&dist(a,p)<=p.reach+60){lr=r;low=a;}}if(low)return {x:low.x,y:low.y,r:low.radius,id:low.id,kind:'ally'};
    t=this.nearest(mons,p);if(t)return asGoal(t);if(this.mode==='siege'&&!mons.some(m=>dist(m,this.myCore)<200))return {x:this.enemyCore.x,y:this.enemyCore.y,r:this.enemyCore.radius,id:CORE_ID,kind:'core'};return null;}
   case 'assassin':{const back=mons.filter(m=>m.reach>30||m.kind==='healer'||m.kind==='summoner'||m.kind==='starmage');t=this.nearest(back.length?back:mons,p);if(t)return asGoal(t);
    if(this.mode==='siege'&&!mons.some(m=>dist(m,this.myCore)<200))return {x:this.enemyCore.x,y:this.enemyCore.y,r:this.enemyCore.radius,id:CORE_ID,kind:'core'};return null;}
   default:t=this.nearest(mons,p);if(t)return asGoal(t);if(this.mode==='siege'&&!mons.some(m=>dist(m,this.myCore)<200))return {x:this.enemyCore.x,y:this.enemyCore.y,r:this.enemyCore.radius,id:CORE_ID,kind:'core'};return null;}}
 private skillWanted(p:Pet){const d={skill:this.skillOf(p.kind)},mons=this.live();
  switch(p.job){
   case 'warrior':return mons.some(m=>dist(m,p)<=d.skill.radius!+m.radius)||(this.mode==='siege'&&dist(p,this.enemyCore)<=d.skill.radius!+this.enemyCore.radius);
   case 'guard':return mons.some(m=>dist(m,p)<=TAUNT_SKILL);
   case 'support':return this.allies().some(a=>a.hp<=a.maxHp*.85);
   case 'assassin':return mons.some(m=>dist(m,p)<=d.skill.radius!);
   case 'summoner':return this.summonsOf(p).length<4+(this.mods[p.kind]?.summonPlus||0)&&(mons.length>0||this.mode==='siege');
   default:return mons.some(m=>dist(m,p)<=p.reach+m.radius);}}
 private resolveSkill(p:Pet){const s=this.skillOf(p.kind),pow=this.skillPower(p)*(1+(this.mods[p.kind]?.skill||0)),mons=this.live();
  switch(p.job){
   case 'warrior':{const t=this.nearest(mons,p,s.radius!+30);if(t)p.facing=t.x<p.x?-1:1;this.events.push({type:'fx',name:'flame',x:p.x,y:p.y-20,r:s.radius,dir:p.facing});
    for(const m of mons){const dx=m.x-p.x,dy=m.y-p.y,dd=Math.hypot(dx,dy);if(dd>s.radius!+m.radius)continue;const ang=Math.abs(Math.atan2(dy,dx*p.facing))*180/Math.PI;if(dd>p.radius+m.radius&&ang>75)continue;
     this.damage(m,p.atk*s.mult*pow,p,{});if(m.hp>0){m.burnDps=Math.max(m.burnT>0?m.burnDps:0,p.atk*.2);m.burnT=3;}}
    if(dist(p,this.enemyCore)<=s.radius!+this.enemyCore.radius)this.damageCore(this.enemyCore,'enemy',p.atk*s.mult*pow*(1+(this.mods[p.kind]?.siege||0)));break;}
   case 'guard':{for(const m of mons)if(dist(m,p)<=TAUNT_SKILL&&m.kind!=='elite'&&!m.kind.startsWith('boss')){m.tauntId=p.id;m.tauntT=TAUNT_TIME;if(m.attackT>=0&&m.targetId!==p.id){m.attackT=-1;m.state='idle';}}this.events.push({type:'fx',name:'taunt',x:p.x,y:p.y,r:TAUNT_SKILL});const ratio=Math.min(.7,s.mult*pow);for(const a of this.allies())if(dist(a,p)<=s.radius!){a.shieldT=s.time!;a.shieldRatio=Math.max(a.shieldT>0?a.shieldRatio:0,ratio);this.events.push({type:'fx',name:'shield',x:a.x,y:a.y,r:a.radius*1.6});}break;}
   case 'ranged':{const list=[...mons].filter(m=>dist(m,p)<=p.reach+m.radius).sort((a,c)=>dist(a,p)-dist(c,p)).slice(0,s.targets);for(const m of list){this.events.push({type:'fx',name:'arrow',x:p.x,y:p.y-26,x2:m.x,y2:m.y-m.radius});this.damage(m,p.atk*s.mult*pow,p,{});}break;}
   case 'mage':{const t=this.nearest(mons,p,p.reach+30);if(!t)break;this.events.push({type:'fx',name:'fireball',x:p.x,y:p.y-26,x2:t.x,y2:t.y,r:s.radius});
    for(const m of mons)if(dist(m,t)<=s.radius!+m.radius){this.damage(m,p.atk*s.mult*pow,p,{});if(m.hp>0){m.burnDps=Math.max(m.burnT>0?m.burnDps:0,p.atk*.15);m.burnT=3;}}break;}
 case 'assassin':{const near=mons.filter(m=>dist(m,p)<=s.radius!);if(!near.length)break;const back=near.filter(m=>m.reach>30||m.kind==='healer'||m.kind==='summoner'||m.kind==='starmage');
    const t=(back.length?back:near).sort((a,c)=>a.hp/a.maxHp-c.hp/c.maxHp||a.hp-c.hp)[0],side=p.x<t.x?-1:1,ox=p.x,oy=p.y;p.x=t.x+side*(t.radius+p.radius);p.y=t.y;p.facing=side>0?-1:1;
    this.events.push({type:'fx',name:'zap',x:ox,y:oy-20,x2:p.x,y2:p.y-20});this.events.push({type:'fx',name:'blast',x:t.x,y:t.y,r:40});
    p.shieldT=Math.max(p.shieldT,1);p.shieldRatio=Math.max(p.shieldRatio,.5);this.damage(t,p.atk*s.mult*pow,p,{crit:true});if(t.hp<=0)p.skillCd*=.5;break;}
   case 'summoner':{this.summonPets(p,s.targets||2,Math.min(3,s.mult*pow),s.time||12);break;}
   case 'support':{for(const a of this.allies()){this.heal(a,a.maxHp*s.mult*pow);this.events.push({type:'fx',name:'heal',x:a.x,y:a.y,r:a.radius*1.5});}break;}}}
 private resolvePetAttack(p:Pet){p.state='idle';
  if(p.targetKind==='core'){if(dist(p,this.enemyCore)<=p.radius+this.enemyCore.radius+p.reach+12){if(p.reach>30)this.events.push({type:'fx',name:'shot',x:p.x,y:p.y-24,x2:this.enemyCore.x,y2:this.enemyCore.y-this.enemyCore.radius});this.damageCore(this.enemyCore,'enemy',p.atk*(1+(this.mods[p.kind]?.siege||0)));}return;}
  if(p.targetKind==='ally'){const a=this.pets.find(a=>a.id===p.targetId);if(a&&a.state!=='dead'&&dist(a,p)<=p.reach+8){this.heal(a,p.atk*1.5);this.events.push({type:'fx',name:'heal',x:a.x,y:a.y,r:a.radius*1.3});}return;}
  const m=this.monsters.find(m=>m.id===p.targetId);if(!m||m.state==='dead')return;const ranged=p.reach>30,max=p.radius+m.radius+p.reach+(ranged?20:14);if(dist(p,m)>max)return;
  const md=this.mods[p.kind]||{},crit=this.rand()<.12+(md.crit||0)+this.buffs.crit,d=PETS[p.kind];
  if(ranged)this.events.push({type:'fx',name:'shot',x:p.x,y:p.y-24,x2:m.x,y2:m.y-m.radius});
  this.damage(m,p.atk*(crit?1.8+(md.critDmg||0):1),p,{crit});
  const boss=!!(MONSTERS[m.kind] as any).boss;
  if(m.hp>0&&md.burnHit){m.burnDps=Math.max(m.burnT>0?m.burnDps:0,p.atk*md.burnHit);m.burnT=3;}
  if(m.hp>0&&md.stunHit&&!boss&&this.rand()<Math.min(.35,md.stunHit)){m.freezeT=Math.max(m.freezeT,.8);m.attackT=-1;}
  if(m.hp>0&&md.double&&this.rand()<Math.min(.5,md.double)){this.events.push({type:'proc',x:p.x,y:p.y-70,text:'连击',good:true});this.damage(m,p.atk,p,{});}
  if(d.splash)for(const o of this.live())if(o!==m&&dist(o,m)<=d.splash+o.radius)this.damage(o,p.atk*.6,p,{});}
 // -------------------------------------------------------------- monsters
 private monsterTick(m:Monster,dt:number){if(m.state==='dead')return;
  if(m.burnT>0){m.burnT-=dt;const a=m.burnDps*dt;m.hp-=a;m.burnAcc+=a;if(m.burnAcc>=m.burnDps*.5){this.events.push({type:'hit',x:m.x,y:m.y-m.radius*2,amount:Math.round(m.burnAcc),targetId:m.id,burn:true});m.burnAcc=0;}if(m.hp<=0){this.kill(m);return;}}
  if(m.state==='spawn'){m.spawnT-=dt;if(m.spawnT<=0)m.state='move';return;}
  if(m.armorT>0)m.armorT-=dt;if(m.bossQ.length)this.bossQueue(m,dt);
  if(m.freezeT>0){m.freezeT-=dt;m.attackT=-1;m.state='idle';return;}
  m.cooldown-=dt;if(m.attackT>=0){m.attackT-=dt;if(m.attackT<0)this.resolveMonsterAttack(m);return;}
  if(m.tauntT>0&&(m.kind==='elite'||m.kind.startsWith('boss')))m.tauntT=0; // 角魔 shrugs off taunts
  if(m.abilityT>0)m.abilityT-=dt;else if(this.useAbility(m))return;
  // nearest living pet within aggro, else the player's core. 突袭怪 hunts the back line from anywhere.
  let target:Pet|null=null,bd=m.aggro;for(const p of this.pets){if(p.state==='dead')continue;const d=dist(p,m)-p.radius;if(d<bd){bd=d;target=p;}}
  if(m.tauntT>0){m.tauntT-=dt;const g=this.pets.find(p=>p.id===m.tauntId&&p.state!=='dead');if(g)target=g;}
  else if(m.kind!=='dasher'){let gd=TAUNT_AURA,gt:Pet|null=null;for(const p of this.pets){if(p.state==='dead'||p.job!=='guard')continue;const d=dist(p,m)-p.radius;if(d<gd){gd=d;gt=p;}}if(gt)target=gt;}
  if(m.kind==='dasher'&&m.tauntT<=0){let best=Infinity;for(const p of this.pets){if(p.state==='dead'||!(p.job==='ranged'||p.job==='mage'||p.job==='support'||p.job==='summoner'))continue;const d=dist(p,m);if(d<best){best=d;target=p;}}}
  if(m.post&&m.tauntT<=0&&target&&dist(target,m.post)>GARRISON.leash+m.aggro)target=null; // the garrison does not chase far from its crystal
  if(m.post&&!target){m.targetId=0;if(dist(m,m.post)>4){this.moveToward(m,m.post,m.speed*dt);m.state='move';}else m.state='idle';return;}
  const goal=target?{x:target.x,y:target.y,r:target.radius,id:target.id}:{x:this.myCore.x,y:this.myCore.y,r:this.myCore.radius,id:CORE_ID};m.targetId=goal.id;
  const need=m.radius+goal.r+m.reach,d=dist(m,goal);m.facing=goal.x<m.x?-1:goal.x>m.x?1:m.facing;
  if(d>need){this.moveToward(m,goal,Math.min(m.speed*dt,d-need));m.state='move';return;}
  m.state='idle';if(m.cooldown<=0){m.cooldown=1/m.aspd;m.attackT=m.windup;m.state='attack';this.events.push({type:'attack',unit:m});}}
 /** timed abilities of the mechanic monsters; returns true when the monster spent this tick on one */
 private useAbility(m:Monster):boolean{
  if(m.kind.startsWith('boss'))return this.bossAct(m);
  switch(m.kind){
   case 'healer':{m.abilityT=3;let any=false;for(const o of this.monsters)if(o!==m&&o.state!=='dead'&&o.state!=='spawn'&&o.hp<o.maxHp&&dist(o,m)<=85){o.hp=Math.min(o.maxHp,o.hp+o.maxHp*.06);any=true;}if(any)this.events.push({type:'fx',name:'heal',x:m.x,y:m.y,r:85});return false;}
   case 'summoner':{m.abilityT=9;if(m.charges<=0)return false;if(this.monsters.filter(o=>o.state!=='dead').length<44){m.charges--;for(let i=0;i<2;i++){const f=this.spawn('fuzz',0);f.x=m.x+(i?24:-24);f.y=m.y+10;f.spawnT=.35;f.hp=f.maxHp=Math.round(f.maxHp*.6);f.gold=2;f.xp=3;}this.events.push({type:'fx',name:'summon',x:m.x,y:m.y,r:50});}return false;}
   case 'starmage':{m.abilityT=5;let any=false;for(const o of this.monsters)if(o!==m&&o.state!=='dead'&&o.state!=='spawn'&&dist(o,m)<=110&&!(MONSTERS[o.kind] as any).boss){o.armorT=Math.max(o.armorT,2);any=true;}if(any)this.events.push({type:'fx',name:'shield',x:m.x,y:m.y,r:110});return false;}
   case 'stunner':{let t:Pet|null=null,bd=170;for(const p of this.pets){if(p.state==='dead')continue;const d=dist(p,m);if(d<bd){bd=d;t=p;}}if(!t){m.abilityT=.8;return false;}m.abilityT=7;this.events.push({type:'fx',name:'zap',x:m.x,y:m.y-20,x2:t.x,y2:t.y-t.radius});this.damage(t,m.atk*1.5,m,{});if(t.state!=='dead'){t.stunT=1.1;t.attackT=-1;}m.cooldown=Math.max(m.cooldown,.6);return true;}
  }
  return false;}
 // ------------------------------------------------------------------ bosses
 private telegraph(m:Monster,kind:string,x:number,y:number,r:number,t:number,mult:number){m.bossQ.push({t,kind,x,y,r,mult});this.events.push({type:'fx',name:'tele',x,y,r,x2:t});}
 private bossAct(m:Monster):boolean{
  const def=MONSTERS[m.kind] as any,skills:string[]=def.skills;if(!m.raged&&m.hp<m.maxHp*.5){m.raged=true;m.atk=Math.round(m.atk*1.3);m.speed*=1.25;this.events.push({type:'boss',monster:m,msg:`${def.name} 狂暴了！`});}
  m.abilityT=(m.raged?4.6:6.5);const pets=this.pets.filter(p=>p.state!=='dead');if(!pets.length)return false;
  const skill=skills[m.phaseN++%skills.length],nearest=[...pets].sort((a,c)=>dist(a,m)-dist(c,m)),back=pets.filter(p=>p.job==='ranged'||p.job==='mage'||p.job==='support');
  const pickBack=()=>(back.length?back:pets)[Math.floor(this.rand()*(back.length||pets.length))];
  switch(skill){
   case 'slam':{const t=nearest.find(p=>p.job==='guard')||nearest[0];this.telegraph(m,'slam',t.x,t.y,105,1.2,2.4);this.events.push({type:'attack',unit:m});break;}
   case 'summon':{const set=({boss1:['shroom','shroom','shroom'],boss2:['healer','armor'],boss3:['bomber','bomber'],boss4:['stunner','dasher'],boss5:['splitter','splitter'],boss6:['frost','frost'],boss7:['ghost','ghost','ghost'],boss8:['starmage','elite']} as Record<string,MonsterKind[]>)[m.kind]||['fuzz'];
    set.forEach((k,i)=>{const f=this.spawn(k);f.x=m.x+(i-(set.length-1)/2)*40;f.y=m.y+26;f.spawnT=.4;});this.events.push({type:'fx',name:'summon',x:m.x,y:m.y,r:70});break;}
   case 'armor':{m.armorT=4;this.events.push({type:'fx',name:'shield',x:m.x,y:m.y,r:70});this.events.push({type:'boss',monster:m,msg:`${def.name} 缩进硬壳，伤害大幅降低！`});break;}
   case 'charge':{const t=pickBack();this.telegraph(m,'dash',t.x,t.y,70,1,2.6);break;}
   case 'bombs':{const picks=[...pets].sort(()=>this.rand()-.5).slice(0,3);for(const p of picks)this.telegraph(m,'slam',p.x+(this.rand()-.5)*30,p.y+(this.rand()-.5)*30,72,1.5,1.8);break;}
   case 'bolts':{const picks=[...pets].sort(()=>this.rand()-.5).slice(0,2);for(const p of picks)this.telegraph(m,'bolt',p.x,p.y,60,1,1.7);break;}
  }
  return false;}
 private bossQueue(m:Monster,dt:number){
  for(const q of m.bossQ)q.t-=dt;
  const due=m.bossQ.filter(q=>q.t<=0);m.bossQ=m.bossQ.filter(q=>q.t>0);
  for(const q of due){
   if(q.kind==='dash'){m.x=q.x+(m.x<q.x?-30:30);m.y=q.y-10;this.events.push({type:'fx',name:'blast',x:q.x,y:q.y,r:q.r});}
   else if(q.kind==='bolt')this.events.push({type:'fx',name:'zap',x:q.x,y:q.y-190,x2:q.x,y2:q.y});
   else this.events.push({type:'fx',name:'blast',x:q.x,y:q.y,r:q.r});
   for(const p of this.pets){if(p.state==='dead'||dist(p,q)>q.r+p.radius)continue;this.damage(p,m.atk*q.mult,m,{});if((p.state as UnitState)!=='dead'&&(q.kind==='bolt'||q.kind==='dash')){p.stunT=Math.max(p.stunT,q.kind==='bolt'?1.4:.9);p.attackT=-1;}}}}
 private resolveMonsterAttack(m:Monster){m.state='idle';if(m.targetId===CORE_ID){if(dist(m,this.myCore)<=m.radius+this.myCore.radius+m.reach+12){if(m.reach>30)this.events.push({type:'fx',name:'shot',x:m.x,y:m.y-m.radius,x2:this.myCore.x,y2:this.myCore.y-40,dir:-1});this.damageCore(this.myCore,'pet',m.atk);}return;}
  const p=this.pets.find(p=>p.id===m.targetId);if(!p||p.state==='dead'||dist(m,p)>m.radius+p.radius+m.reach+14)return;
  if(m.kind==='frost'&&p.stunT<=0){p.stunT=.6;p.attackT=-1;this.events.push({type:'fx',name:'freeze',x:p.x,y:p.y,r:30});}
  if(m.reach>30)this.events.push({type:'fx',name:m.splash?'fireball':'shot',x:m.x,y:m.y-m.radius,x2:p.x,y2:p.y-p.radius,r:m.splash||0,dir:-1});
  this.damage(p,m.atk*this.vsSummon(m,p),m,{});if(m.splash)for(const o of this.allies())if(o!==p&&dist(o,p)<=m.splash+o.radius)this.damage(o,m.atk*.6*this.vsSummon(m,o),m,{});
  this.antiSummon(m,p);}
 private tipped=new Set<string>();private tip(key:string,msg:string){if(this.tipped.has(key))return;this.tipped.add(key);this.events.push({type:'tip',msg});}
 /** 破召: elites, wardens and bosses deal extra damage to summons */
 private vsSummon(m:Monster,p:Pet){const A=ANTI_SUMMON;if(!p.summon||this.stage.chapter<A.breaker.from||!(A.breakerKinds.includes(m.kind)||(MONSTERS[m.kind] as any).boss))return 1;
  this.tip('breaker',`${MONSTERS[m.kind].name}：破召，对召唤物伤害翻倍`);return A.breaker.mult;}
 /** 横扫 (melee) and 驱散 (casters) aimed at the crowd of summons around the target */
 private antiSummon(m:Monster,p:Pet){const A=ANTI_SUMMON,ch=this.stage.chapter;
  if(m.reach<=30&&ch>=A.cleave.from){let hit=false;for(const o of this.pets)if(o!==p&&o.summon&&o.state!=='dead'&&dist(o,p)<=A.cleave.radius+o.radius){this.damage(o,m.atk*A.cleave.mult*this.vsSummon(m,o),m,{});hit=true;}
   if(hit){this.events.push({type:'fx',name:'blast',x:p.x,y:p.y,r:A.cleave.radius});this.tip('cleave','怪物学会了横扫：近战攻击会波及挤在一起的召唤物');}}
  if((m.kind==='caster'||m.kind==='starmage')&&ch>=A.dispel.from){let hit=false;for(const o of this.pets)if(o.summon&&o.state!=='dead'&&dist(o,p)<=A.dispel.radius){o.life=(o.life||0)-A.dispel.life;hit=true;}
   if(hit){this.events.push({type:'fx',name:'zap',x:p.x,y:p.y,r:A.dispel.radius});this.tip('dispel',`${MONSTERS[m.kind].name}：驱散，召唤物存在时间缩短`);}}}
 // ---------------------------------------------------------------- combat
 private damage(target:Unit,raw:number,from:Unit|null,{crit=false}:{crit?:boolean}){
  const tm=target.side==='pet'?this.mods[(target as Pet).kind]:undefined,fm=from&&from.side==='pet'?this.mods[(from as Pet).kind]:undefined;
  if(tm?.dodge&&from&&this.rand()<Math.min(.4,tm.dodge)){this.events.push({type:'proc',x:target.x,y:target.y-target.radius*2,text:'闪避',good:true});return;}
  if(target.side==='enemy'&&(target as Monster).kind==='ghost'&&from&&from.reach>30&&this.rand()<.35){this.events.push({type:'proc',x:target.x,y:target.y-target.radius*2,text:'闪避',good:false});return;}
  if(fm?.execute&&target.hp<target.maxHp*.3)raw*=1+Math.min(1.5,fm.execute);
  if(from&&from.side==='pet')raw*=1+this.aura.atk;if(target.side==='pet')raw*=1-this.aura.def;
  const shield=target.side==='pet'&&(target as Pet).shieldT>0?1-(target as Pet).shieldRatio:1;
  const shell=target.side==='enemy'&&(target as Monster).kind==='armor'&&from&&from.side==='pet'&&from.reach>30?.65:1; // 铁壳怪 shrugs off ranged hits
  const phase=target.side==='enemy'&&(target as Monster).armorT>0?((MONSTERS[(target as Monster).kind] as any).boss?.3:.5):1;
  const amount=Math.max(1,Math.round(raw*100/(100+target.def)*(.92+this.rand()*.16)*shield*shell*phase));target.hp-=amount;
  this.events.push({type:'hit',x:target.x,y:target.y-target.radius*2,amount,targetId:target.id,crit});
  if(fm?.lifesteal&&from!.hp>0)this.heal(from as Pet,amount*Math.min(.3,fm.lifesteal),true);
  if(tm?.thorns&&from&&from.side==='enemy'&&from.reach<=30&&from.hp>0)this.damage(from,amount*Math.min(1,tm.thorns),null,{});
  if(target.side==='enemy'){if(target.hp<=0)this.kill(target as Monster,from);}
  else if(target.hp<=0)this.petDown(target as Pet);}
 private petDown(p:Pet){if(p.state==='dead')return;if(p.summon){p.hp=0;p.state='dead';p.deadT=.4;p.attackT=-1;this.events.push({type:'death',unit:p});return;}{const md=this.mods[p.kind],c=this.cards[p.card];if(md?.revive&&c&&!c.revived){c.revived=true;p.hp=Math.round(p.maxHp*Math.min(.6,md.revive));p.stunT=0;p.burnT=0;this.events.push({type:'fx',name:'heal',x:p.x,y:p.y,r:50});this.events.push({type:'proc',x:p.x,y:p.y-60,text:'不屈！',good:true});return;}}p.hp=0;p.state='dead';p.deadT=BATTLE.deadLinger;p.attackT=-1;p.burnT=0;this.slotPet[p.slot]=0;
  const c=this.cards.find(c=>c.petId===p.id);if(c){c.petId=0;c.cd=c.cdMax;}this.events.push({type:'death',unit:p});}
 private kill(m:Monster,by:Unit|null=null){if(m.state==='dead')return;{const bm=by&&by.side==='pet'?this.mods[(by as Pet).kind]:undefined;if(bm?.killHeal&&by!.hp>0)this.heal(by as Pet,by!.maxHp*Math.min(.3,bm.killHeal));}m.state='dead';m.deadT=.6;m.hp=0;m.attackT=-1;this.kills++;const gold=Math.round(m.gold*(1+this.buffs.income+this.aura.gold));this.gold+=gold;this.goldEarned+=gold;
  this.events.push({type:'death',unit:m});this.events.push({type:'gold',x:m.x,y:m.y,amount:gold});this.gainXp(m.xp);for(const p of this.crew())this.giveXp(this.cards[p.card],m.xp);
  if(m.kind==='splitter')for(let i=0;i<2;i++){const f=this.spawn('fuzz',0);f.x=m.x+(i?18:-18);f.y=m.y;f.spawnT=.25;f.hp=f.maxHp=Math.round(m.maxHp*.35);f.gold=2;f.xp=4;}
  if(MONSTERS[m.kind]&&(MONSTERS[m.kind] as any).boss)this.bossDown=true;
  if(m.kind==='bomber'){this.events.push({type:'fx',name:'blast',x:m.x,y:m.y,r:78});for(const p of this.pets)if(p.state!=='dead'&&dist(p,m)<=78+p.radius)this.damage(p,m.atk*3.2,m,{});}}
 private damageCore(core:Core,side:'pet'|'enemy',raw:number){let amount=Math.round(raw);const it=this.intent;
  if(side==='enemy'){amount=Math.round(raw*(1+this.buffs.siege)*(this.exposed>0?WAVE.exposeMult:1)*(this.warded?GARRISON.ward:1));
   if(it&&it.phase==='active'&&it.kind==='shell'&&it.shield>0){const a=Math.min(it.shield,amount);it.shield-=a;amount-=a;if(a>0)this.events.push({type:'fx',name:'shield',x:core.x,y:core.y-30,r:70});if(amount<=0)return;}
   if(it&&it.phase==='active'&&it.kind==='repair'){it.prog+=amount;if(it.prog>=it.need){it.phase='broken';this.events.push({type:'intent',intent:it,what:'broken'});}}}core.hp=Math.max(0,core.hp-amount);this.events.push({type:'core-hit',side,amount});this.events.push({type:'hit',x:core.x,y:core.y-core.radius,amount,targetId:CORE_ID});}
 private moveToward(u:Unit,goal:Vec,step:number){const dx=goal.x-u.x,dy=goal.y-u.y,d=Math.hypot(dx,dy);if(d<1e-6)return;const k=Math.min(1,step/d);u.x+=dx*k;u.y+=dy*k;u.state='move';if(Math.abs(dx)>1)u.facing=dx<0?-1:1;}
 private separate(){const all:Unit[]=[...this.pets.filter(p=>p.state!=='dead'),...this.monsters.filter(m=>m.state!=='dead')];const b=BATTLE.board;
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){const a=all[i],c=all[j],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy)||.01,min=(a.radius+c.radius)*.85;if(d>=min)continue;const push=(min-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;c.x+=nx*push;c.y+=ny*push;}
  for(const u of all){u.x=Math.max(b.left,Math.min(b.right,u.x));u.y=Math.max(b.top,Math.min(b.bottom,u.y));
   for(const core of [this.myCore,this.enemyCore]){const dx=u.x-core.x,dy=u.y-core.y,d=Math.hypot(dx,dy)||.01,min=core.radius+u.radius*.6;if(d<min){u.x=core.x+dx/d*min;u.y=core.y+dy/d*min;}}}}
 drain(){const e=this.events;this.events=[];return e;}
}
