// Account-level (局外) progress: captain level, coins, food, stamina, tasks.
// Pure logic + a storage adapter, so it is testable in Node and shared by the
// Home and Battle scenes (they hand it off through local storage).
import {PETS,STAGES,TOWER,towerReward} from '../battle/BattleConfig';
import type {PetMods,PetSkill} from '../battle/BattleConfig';
import {GRADES,EQUIP_SLOTS,SETS,STAT_KEYS,FORGE,emptyMats,rollItem,rollQuality,itemMods,setMods,talentMods,dismantleYield,battleDrops,gemDrops,slotDef,addMods,itemPower,parseGem,gemKey,gemDef,GEM_COMBINE,GEM_MAX,sockets,applySkillAlt,skillAlts,skillUnlocked,ENHANCE,itemSkillDef,rollItemSkills,seeded,enhanceRate,breakChance,enhanceCost,protectCost,JARS,JAR_TEN,jarDef,rollJarQuality} from './Gear';
import {CAPTAIN,MERGE,mergeRate,captainBonus,staminaMaxFor,startGoldFor,ranchSlotsFor,ROAD} from './Growth';
import type {Item,Affix,SlotId,Mats,MatId} from './Gear';
import {dayKey,hourOf,signReward,NEWBIE_GOALS,ONLINE,SUPPLY,AD_STAMINA,CODES,DAILY,CHESTS,ACH,MAILS,CODEX_PET_REWARD,CODEX_MON_REWARD,CODEX_MILESTONES} from './Welfare';
import type {Bundle,DailyKey,AchStat,GoalDef} from './Welfare';
import {eventMod} from './Events';
export interface PetInst{id:number;kind:string;grade:number}
/** 放养: spare copies (same pet, any grade) roam the ranch and bring back a little */
export const RANCH={slots:3,capSeconds:8*3600,coinsPerHour:20,coinsPerGrade:15,foodPerHour:.4,foodPerGrade:.2};
// pet level cap grows with its 品级 (凡/良/上/极/神), so merging is how a pet keeps growing; tuned with tools/sim
export const GRADE_LEVEL_CAP=[15,25,35,45,55],PET_MAX_LEVEL=55,DECK_MAX=6;
export const HATCH={cost:10,pityEvery:10,weights:{common:60,fine:25,rare:11,epic:3.5,legend:.5} as Record<string,number>,dupCoins:{common:30,fine:60,rare:120,epic:300,legend:600} as Record<string,number>};
/** 训练场: the lineup trains while you are away; output is capped at 8 hours of storage (设计文档) */
export const TRAIN={capSeconds:8*3600,coinsBase:120,coinsPerLevel:40,foodBase:2.5,foodPerLevel:.5};
export const STARTERS=['fox','turtle','sparrow'];
export interface HatchResult{kind:string;isNew:boolean;coins:number;rarity:string;grade:number;instId:number;upgraded:boolean;spare:boolean}
export interface BattleOutcome{win:boolean;stars:number;kills:number;goldEarned:number;time:number}
export interface Reward{coins:number;food:number;xp:number;captainLevelUp:boolean;mats?:Mats;gems?:Record<string,number>}
export interface MergeResult{ok:boolean;grade:number;rate:number;lost:number;inst:PetInst|null;pity:number}
export interface Storage{getItem(k:string):string|null;setItem(k:string,v:string):void}
export const STAMINA={max:80,regenSeconds:300,battleCost:5};
export const SAVE_KEY='pet-guardians-player-v1';
export const TASKS=[
 {id:'battle1',name:'完成 1 场冒险',goal:1,stat:'battles',coins:100,food:5},
 {id:'kill50',name:'击败 50 只怪物',goal:50,stat:'kills',coins:150,food:5},
 {id:'win3',name:'取得 3 场胜利',goal:3,stat:'wins',coins:300,food:10},
 {id:'star3',name:'拿到一次三星',goal:1,stat:'threeStars',coins:200,food:10},
] as const;
type Stat='battles'|'kills'|'wins'|'threeStars';
const finite=(v:unknown,d:number,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,Math.floor(v))):d;
export class PlayerModel{
 name='森林旅人';captainLevel=1;captainXp=0;coins=1280;food=36;trainAt=0;stamina=STAMINA.max;staminaAt=0;agreed=false;loggedIn=false;
 stats:Record<Stat,number>={battles:0,kills:0,wins:0,threeStars:0};claimed:string[]=[];mailClaimed=false;bestStars=0;lastReward:Reward|null=null;
 captain:'firerain'|'sprout'|'freeze'='firerain';stageStars:number[]=STAGES.map(()=>0);stage=0;
 owned:string[]=STARTERS.slice();hatchCount=0;hatchSinceRare=0;petLevels:Record<string,number>={};deck:string[]=STARTERS.slice();
 // 品级个体 (one per hatched pet), 装备, 材料, 放养
 insts:PetInst[]=[];nextInst=1;mainId:Record<string,number>={};items:Item[]=[];nextItem=1;equip:Record<string,Partial<Record<SlotId,number>>>={};mats:Mats=emptyMats();forgeCount=0;forgeSince=0;
 ranch:number[]=[];ranchAt=0;ranchBank={coins:0,food:0};
 gems:Record<string,number>={ruby1:2,emerald1:2};skillPick:Record<string,number>={};mergePity:Record<string,number>={};roadClaimed=0;
 // 福利 / 任务 / 邮件 / 图鉴
 signCount=0;signDay=0;daily={day:0,c:{} as Record<string,number>,done:[] as string[],chests:[] as number[],online:0,onlineGot:[] as number[],supply:[] as number[],ads:0,free:0};
 ach:Record<string,number>={};mails:{id:string;at:number;read:boolean;got:boolean}[]=[];codes:string[]=[];seenMon:string[]=[];codex:string[]=[];hatchLog:{kind:string;grade:number;at:number}[]=[];readonly layout=8;mergeCount=0;jarPity:Record<string,number>={};jarCount=0;
 private store?:Storage;
 // 新手七日目标: when the account was made, and which goals / day chests were claimed
 born=0;newbie:string[]=[];
 /** 新手引导 steps already done ('battle' = the guided first battle) */
 guide:string[]=[];
 /** 试炼之塔: highest floor cleared, and failed tries used today */
 towerBest=0;towerDay=0;towerUsed=0;
 constructor(store?:Storage,now=Date.now()){this.store=store;this.born=now;this.staminaAt=now;this.trainAt=now;this.ranchAt=now;this.mats={...FORGE.startMats};this.initInsts();if(!store)return;let raw:string|null=null;try{raw=store.getItem(SAVE_KEY);}catch{}if(!raw)return;
  try{const s=JSON.parse(raw);if(s.version!==1)return;if(s.captain==='firerain'||s.captain==='sprout'||s.captain==='freeze')this.captain=s.captain;if(Array.isArray(s.stageStars)){const old=s.layout!==8&&s.stageStars.length<=20;const at=(i:number)=>{if(!old)return s.stageStars[i];const c=Math.floor(i/8),n=i%8;if(c>=4)return 0;return n<4?s.stageStars[c*5+n]:n===7?s.stageStars[c*5+4]:0;};this.stageStars=STAGES.map((_,i)=>finite(at(i),0,0,3));
   this.stage=old?(()=>{const o=finite(s.stage,0,0,19),c=Math.floor(o/5),n=o%5;return c*8+(n<4?n:7);})():finite(s.stage,0,0,STAGES.length-1);}else this.stage=finite(s.stage,0,0,STAGES.length-1);if(!this.stageUnlocked(this.stage))this.stage=0;if(Array.isArray(s.owned)){const o=s.owned.filter((k:unknown,i:number,a:unknown[])=>typeof k==='string'&&!!PETS[k]&&a.indexOf(k)===i);if(o.length)this.owned=o;}this.hatchCount=finite(s.hatchCount,0,0,1e6);this.hatchSinceRare=finite(s.hatchSinceRare,0,0,1e6);if(s.petLevels&&typeof s.petLevels==='object')for(const k of Object.keys(PETS))this.petLevels[k]=finite(s.petLevels[k],1,1,PET_MAX_LEVEL);
   if(Array.isArray(s.deck)){const d=s.deck.filter((k:unknown,i:number,a:unknown[])=>typeof k==='string'&&!!PETS[k]&&this.owned.includes(k)&&a.indexOf(k)===i).slice(0,DECK_MAX);if(d.length)this.deck=d;}this.name=typeof s.name==='string'&&s.name.trim()?s.name.trim().slice(0,12):this.name;this.captainLevel=finite(s.captainLevel,1,1,CAPTAIN.maxLevel);this.captainXp=finite(s.captainXp,0,0,1e7);
   this.coins=finite(s.coins,1280,0,1e9);this.food=finite(s.food,36,0,1e6);this.stamina=finite(s.stamina,STAMINA.max,0,999);this.staminaAt=finite(s.staminaAt,now,0,now);this.agreed=!!s.agreed;this.trainAt=finite(s.trainAt,now,0,now);
   for(const k of Object.keys(this.stats) as Stat[])this.stats[k]=finite(s.stats?.[k],0,0,1e9);this.claimed=Array.isArray(s.claimed)?s.claimed.filter((x:unknown)=>typeof x==='string'):[];this.mailClaimed=!!s.mailClaimed;this.bestStars=finite(s.bestStars,0,0,3);
   if(s.lastReward&&typeof s.lastReward==='object')this.lastReward={coins:finite(s.lastReward.coins,0,0,1e9),food:finite(s.lastReward.food,0,0,1e6),xp:finite(s.lastReward.xp,0,0,1e6),captainLevelUp:!!s.lastReward.captainLevelUp,mats:s.lastReward.mats?this.readMats(s.lastReward.mats):undefined,gems:this.readGems(s.lastReward.gems)};
   this.loadGear(s,now);
  }catch{/* unreadable save: start fresh */}
  this.regen(now);}
 save(){if(!this.store)return;const {name,captainLevel,captainXp,coins,food,stamina,staminaAt,agreed,stats,claimed,mailClaimed,bestStars,lastReward,petLevels,deck,owned,hatchCount,hatchSinceRare,stageStars,stage,captain,trainAt,insts,nextInst,mainId,items,nextItem,equip,mats,forgeCount,forgeSince,ranch,ranchAt,ranchBank,gems,skillPick,mergePity,roadClaimed,layout,signCount,signDay,daily,ach,mails,codes,seenMon,codex,hatchLog,mergeCount,jarPity,jarCount,born,newbie,guide,towerBest,towerDay,towerUsed}=this;try{this.store.setItem(SAVE_KEY,JSON.stringify({version:1,name,captainLevel,captainXp,coins,food,stamina,staminaAt,agreed,stats,claimed,mailClaimed,bestStars,lastReward,petLevels,deck,owned,hatchCount,hatchSinceRare,stageStars,stage,captain,trainAt,insts,nextInst,mainId,items,nextItem,equip,mats,forgeCount,forgeSince,ranch,ranchAt,ranchBank,gems,skillPick,mergePity,roadClaimed,layout,signCount,signDay,daily,ach,mails,codes,seenMon,codex,hatchLog,mergeCount,jarPity,jarCount,born,newbie,guide,towerBest,towerDay,towerUsed}));}catch{}}
 private readMats(o:any):Mats{const m=emptyMats();for(const k of Object.keys(m) as MatId[])m[k]=finite(o?.[k],0,0,1e6);return m;}
 private readGems(o:any):Record<string,number>{const out:Record<string,number>={};if(o&&typeof o==='object')for(const k of Object.keys(o)){const g=parseGem(k);if(g)out[k]=finite(o[k],0,0,9999);}return out;}
 private initInsts(){this.insts=[];this.mainId={};this.nextInst=1;for(const k of this.owned){const id=this.nextInst++;this.insts.push({id,kind:k,grade:0});this.mainId[k]=id;}}
 private loadGear(s:any,now:number){
  if(Array.isArray(s.insts)){const list:PetInst[]=[];for(const i of s.insts){if(i&&typeof i.kind==='string'&&PETS[i.kind]&&this.owned.includes(i.kind)&&typeof i.id==='number')list.push({id:Math.floor(i.id),kind:i.kind,grade:finite(i.grade,0,0,4)});}
   if(list.length){this.insts=list;this.nextInst=Math.max(finite(s.nextInst,1,1,1e9),...list.map(i=>i.id+1));this.mainId={};for(const k of this.owned){const want=s.mainId?.[k];const mine=list.filter(i=>i.kind===k);const pick=mine.find(i=>i.id===want)||mine.sort((a,b)=>b.grade-a.grade)[0];if(pick)this.mainId[k]=pick.id;else{const id=this.nextInst++;this.insts.push({id,kind:k,grade:0});this.mainId[k]=id;}}}}
  const items:Item[]=[];if(Array.isArray(s.items))for(const i of s.items){try{if(i&&EQUIP_SLOTS.some(x=>x.id===i.slot)&&SETS.some(x=>x.id===i.set)&&typeof i.id==='number'){const aff=(a:any):Affix|null=>a&&STAT_KEYS.includes(a.k)&&typeof a.v==='number'&&Number.isFinite(a.v)&&a.v>=0&&a.v<100?{k:a.k,v:a.v}:null;const main=aff(i.main);if(!main)continue;items.push({id:Math.floor(i.id),slot:i.slot,q:finite(i.q,0,0,4),set:i.set,main,subs:(Array.isArray(i.subs)?i.subs:[]).map(aff).filter((x:Affix|null):x is Affix=>!!x).slice(0,4),gems:Array.from({length:sockets(finite(i.q,0,0,4))},(_,n)=>{const k=Array.isArray(i.gems)?i.gems[n]:'';return typeof k==='string'&&parseGem(k)?k:'';}),lv:finite(i.lv,0,0,ENHANCE.max),fails:finite(i.fails,0,0,99),skills:Array.isArray(i.skills)?i.skills.filter((x:any)=>x&&itemSkillDef(x.id)&&typeof x.v==='number'&&Number.isFinite(x.v)&&x.v>0&&x.v<5).slice(0,3).map((x:any)=>({id:x.id,v:x.v})):rollItemSkills(i.slot,finite(i.q,0,0,4),seeded(Math.floor(i.id)))});}}catch{}}
  this.items=items;this.nextItem=Math.max(finite(s.nextItem,1,1,1e9),...items.map(i=>i.id+1),1);
  this.equip={};if(s.equip&&typeof s.equip==='object')for(const k of Object.keys(PETS)){const e=s.equip[k];if(!e||typeof e!=='object')continue;for(const sl of EQUIP_SLOTS){const id=e[sl.id];const it=typeof id==='number'?this.items.find(x=>x.id===id):undefined;if(it&&it.slot===sl.id&&!this.itemOwner(it.id)){(this.equip[k]||(this.equip[k]={}))[sl.id]=it.id;}}}
  if(s.mats)this.mats=this.readMats(s.mats);this.forgeCount=finite(s.forgeCount,0,0,1e6);this.forgeSince=finite(s.forgeSince,0,0,1e6);
  this.ranch=Array.isArray(s.ranch)?s.ranch.filter((id:unknown,i:number,a:unknown[])=>typeof id==='number'&&a.indexOf(id)===i&&this.insts.some(x=>x.id===id)&&!Object.values(this.mainId).includes(id as number)).slice(0,ranchSlotsFor(this.captainLevel)):[];
  this.gems=s.gems?this.readGems(s.gems):this.gems;this.skillPick={};if(s.skillPick&&typeof s.skillPick==='object')for(const k of Object.keys(PETS))this.skillPick[k]=finite(s.skillPick[k],0,0,2);this.mergePity={};if(s.mergePity&&typeof s.mergePity==='object')for(const k of Object.keys(s.mergePity))if(/^[a-z]+:[0-3]$/.test(k))this.mergePity[k]=finite(s.mergePity[k],0,0,99);this.roadClaimed=finite(s.roadClaimed,0,0,CAPTAIN.maxLevel);this.readWelfare(s);
  this.ranchAt=finite(s.ranchAt,now,0,now);this.ranchBank={coins:Math.max(0,Math.min(1e7,Number(s.ranchBank?.coins)||0)),food:Math.max(0,Math.min(1e6,Number(s.ranchBank?.food)||0))};}
 // ------------------------------------------------------------ stamina
 get staminaMax(){return staminaMaxFor(this.captainLevel,STAMINA.max);}
 regen(now=Date.now()){const mx=this.staminaMax;if(this.stamina>=mx){this.staminaAt=now;return;}const gained=Math.floor((now-this.staminaAt)/1000/STAMINA.regenSeconds);if(gained>0){this.stamina=Math.min(mx,this.stamina+gained);this.staminaAt=this.stamina>=mx?now:this.staminaAt+gained*STAMINA.regenSeconds*1000;}}
 secondsToNextStamina(now=Date.now()){if(this.stamina>=this.staminaMax)return 0;return Math.max(0,Math.ceil(STAMINA.regenSeconds-(now-this.staminaAt)/1000));}
 startBattle(now=Date.now()){this.regen(now);if(this.stamina<STAMINA.battleCost)return false;if(this.stamina>=this.staminaMax)this.staminaAt=now;this.stamina-=STAMINA.battleCost;return true;}
 // ------------------------------------------------------------ captain
 static xpToNext(level:number){return Math.round(40+20*Math.pow(level,1.5));} // captain 30 after ~4-5 weeks of daily play
 get captainProgress(){return this.captainLevel>=CAPTAIN.maxLevel?1:this.captainXp/PlayerModel.xpToNext(this.captainLevel);}
 private addXp(xp:number){let up=false;if(this.captainLevel>=CAPTAIN.maxLevel)return false;this.captainXp+=xp;while(this.captainLevel<CAPTAIN.maxLevel&&this.captainXp>=PlayerModel.xpToNext(this.captainLevel)){this.captainXp-=PlayerModel.xpToNext(this.captainLevel);this.captainLevel++;up=true;}if(this.captainLevel>=CAPTAIN.maxLevel)this.captainXp=0;return up;}
 get startGold(){return startGoldFor(this.captainLevel);}
 get ranchSlots(){return ranchSlotsFor(this.captainLevel);}
 get captainMul(){return captainBonus(this.captainLevel);}
 // ------------------------------------------------------------ battle rewards
 applyBattle(o:BattleOutcome,rand:()=>number=Math.random,now=Date.now()):Reward{const drops=battleDrops(STAGES[this.stage].chapter,o.stars,o.win,!!STAGES[this.stage].boss,rand);for(const k of Object.keys(drops) as MatId[])this.mats[k]+=drops[k];const gd=gemDrops(STAGES[this.stage].chapter,o.stars,o.win,!!STAGES[this.stage].boss,rand);for(const k of Object.keys(gd))this.gems[k]=(this.gems[k]||0)+gd[k];const sc=STAGES[this.stage].rewardScale,coins=Math.round((60+o.stars*40+Math.min(o.kills,60))*sc*eventMod('coins',now)),food=o.win?2+o.stars:1,xp=Math.round(20+o.stars*15+Math.min(o.kills,40)/2);
  this.coins+=coins;this.food+=food;const up=this.addXp(xp);this.stats.battles++;this.stats.kills+=o.kills;if(o.win)this.stats.wins++;if(o.stars>=3)this.stats.threeStars++;this.track('battle');this.track('kill',o.kills);if(o.win)this.track('win');if(o.stars>=3)this.track('star3');this.bestStars=Math.max(this.bestStars,o.stars);this.stageStars[this.stage]=Math.max(this.stageStars[this.stage],o.stars);
  this.lastReward={coins,food,xp,captainLevelUp:up,mats:drops,gems:gd};return this.lastReward;}
 // ------------------------------------------------------------ 新手七日目标
 /** 1 on the day the account was made, 2 the next calendar day, ... */
 newbieDay(now=Date.now()){const d=(t:number)=>{const x=new Date(t);return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();};return Math.floor((d(now)-d(this.born))/86400e3+.5)+1;}
 private get goalView(){return {stageStars:this.stageStars,hatchCount:this.hatchCount,owned:this.owned,deck:this.deck,captainLevel:this.captainLevel,mergeCount:this.mergeCount,forgeCount:this.forgeCount,totalStars:this.totalStars,stats:this.stats,
  maxPetLevel:Math.max(1,...this.owned.map(k=>this.petLevel(k))),maxGrade:Math.max(0,...this.owned.map(k=>this.grade(k)))};}
 goalProgress(g:GoalDef){return Math.min(g.goal,g.value(this.goalView));}
 private goalDay(id:string){return NEWBIE_GOALS.find(d=>d.goals.some(g=>g.id===id));}
 goalReady(id:string,now=Date.now()){const d=this.goalDay(id),g=d?.goals.find(g=>g.id===id);return !!d&&!!g&&d.day<=this.newbieDay(now)&&!this.newbie.includes(id)&&this.goalProgress(g)>=g.goal;}
 claimGoal(id:string,now=Date.now()){if(!this.goalReady(id,now))return null;const g=this.goalDay(id)!.goals.find(g=>g.id===id)!;this.newbie.push(id);this.grant(g.b);return g.b;}
 newbieChestReady(day:number,now=Date.now()){const d=NEWBIE_GOALS.find(d=>d.day===day);return !!d&&day<=this.newbieDay(now)&&!this.newbie.includes('chest'+day)&&d.goals.every(g=>this.newbie.includes(g.id));}
 claimNewbieChest(day:number,now=Date.now()){if(!this.newbieChestReady(day,now))return null;const d=NEWBIE_GOALS.find(d=>d.day===day)!;this.newbie.push('chest'+day);this.grant(d.chest);return d.chest;}
 /** the 七日目标 tab stays until every goal and chest is claimed */
 get newbieOpen(){return NEWBIE_GOALS.some(d=>!this.newbie.includes('chest'+d.day));}
 newbiePending(now=Date.now()){return NEWBIE_GOALS.reduce((n,d)=>n+d.goals.filter(g=>this.goalReady(g.id,now)).length+(this.newbieChestReady(d.day,now)?1:0),0);}
 // ------------------------------------------------------------ 试炼之塔
 get towerOpen(){return this.stageStars[TOWER.unlockStage]>0;}
 /** failed tries left today (wins are free, so a good streak can keep climbing) */
 towerTries(now=Date.now()){if(this.towerDay!==dayKey(now)){this.towerDay=dayKey(now);this.towerUsed=0;}return Math.max(0,TOWER.dailyTries+eventMod('towerTries',now)-this.towerUsed);}
 get towerNext(){return this.towerBest+1;}
 canTower(now=Date.now()){return this.towerOpen&&this.towerTries(now)>0;}
 /** settle a tower battle; a win on a new floor pays its first-clear reward, a loss uses up one try */
 finishTower(floor:number,win:boolean,now=Date.now()):Bundle|null{this.towerTries(now);if(!win){this.towerUsed++;return null;}
  if(floor<=this.towerBest)return {};this.towerBest=floor;const b=towerReward(floor);this.grant(b);this.addXp(20+floor*2);return b;}
 // ------------------------------------------------------------ 扫荡
 /** a 3-star stage can be swept: it pays a 3-star win (no new stars) for its stamina, `times` in a row */
 canSweep(i:number,times=1,now=Date.now()){this.regen(now);return this.stageStars[i]>=3&&this.stamina>=STAMINA.battleCost*times;}
 sweep(i:number,times:number,rand:()=>number=Math.random,now=Date.now()):Reward|null{if(times<1||!this.canSweep(i,times,now))return null;
  const keep=this.stage,sum:Reward={coins:0,food:0,xp:0,captainLevelUp:false,mats:emptyMats(),gems:{}};this.stage=i;
  for(let n=0;n<times;n++){this.startBattle(now);const r=this.applyBattle({win:true,stars:3,kills:40,goldEarned:0,time:0},rand,now);
   sum.coins+=r.coins;sum.food+=r.food;sum.xp+=r.xp;sum.captainLevelUp=sum.captainLevelUp||r.captainLevelUp;
   for(const k of Object.keys(r.mats||{}) as MatId[])sum.mats![k]+=r.mats![k];for(const g of Object.keys(r.gems||{}))sum.gems![g]=(sum.gems![g]||0)+r.gems![g];}
  this.stage=keep;this.lastReward=sum;return sum;}
 // ------------------------------------------------------------ 福利 / 任务 / 邮件 / 图鉴
 private readWelfare(s:any){this.signCount=finite(s.signCount,0,0,1e5);this.signDay=finite(s.signDay,0,0,99999999);const d=s.daily;
  if(d&&typeof d==='object'){const nums=(a:unknown,max:number)=>Array.isArray(a)?a.filter((x:unknown)=>typeof x==='number'&&x>=0&&x<max).map((x:number)=>Math.floor(x)):[];
   this.daily={day:finite(d.day,0,0,99999999),c:{},done:Array.isArray(d.done)?d.done.filter((x:unknown)=>typeof x==='string'&&DAILY.some(t=>t.id===x)):[],chests:nums(d.chests,CHESTS.length),online:finite(d.online,0,0,86400),onlineGot:nums(d.onlineGot,ONLINE.length),supply:nums(d.supply,SUPPLY.length),ads:finite(d.ads,0,0,99),free:finite(d.free,0,0,1)};
   if(d.c&&typeof d.c==='object')for(const t of DAILY)this.daily.c[t.id]=finite(d.c[t.id],0,0,1e6);}
  if(s.ach&&typeof s.ach==='object')for(const a of ACH)this.ach[a.id]=finite(s.ach[a.id],0,0,a.tiers.length);
  if(Array.isArray(s.mails))this.mails=s.mails.filter((x:any)=>x&&MAILS.some(m=>m.id===x.id)).map((x:any)=>({id:x.id,at:finite(x.at,0,0,1e15),read:!!x.read,got:!!x.got}));
  const strs=(a:unknown)=>Array.isArray(a)?a.filter((x:unknown):x is string=>typeof x==='string').slice(0,500):[];this.codes=strs(s.codes);this.seenMon=strs(s.seenMon);this.codex=strs(s.codex);
  if(Array.isArray(s.hatchLog))this.hatchLog=s.hatchLog.filter((x:any)=>x&&PETS[x.kind]).slice(0,20).map((x:any)=>({kind:x.kind,grade:finite(x.grade,0,0,4),at:finite(x.at,0,0,1e15)}));this.mergeCount=finite(s.mergeCount,0,0,1e6);this.born=finite(s.born,this.born,0,1e15);this.towerBest=finite(s.towerBest,0,0,9999);this.towerDay=finite(s.towerDay,0,0,99999999);this.towerUsed=finite(s.towerUsed,0,0,99);if(Array.isArray(s.guide))this.guide=s.guide.filter((x:unknown)=>typeof x==='string').slice(0,50);if(Array.isArray(s.newbie))this.newbie=s.newbie.filter((x:unknown)=>typeof x==='string').slice(0,100);this.jarCount=finite(s.jarCount,0,0,1e7);if(s.jarPity&&typeof s.jarPity==='object')for(const j of JARS)this.jarPity[j.id]=finite(s.jarPity[j.id],0,0,999);}
 /** pay out a reward pack. A pet already owned arrives as a spare copy. */
 grant(b:Bundle){if(b.coins)this.coins+=b.coins;if(b.food)this.food+=b.food;if(b.stamina)this.stamina=Math.min(999,this.stamina+b.stamina);if(b.xp)this.addXp(b.xp);
  if(b.mats)for(const k of Object.keys(b.mats) as MatId[])this.mats[k]+=b.mats[k]||0;if(b.gems)for(const k of Object.keys(b.gems))if(parseGem(k))this.gems[k]=this.gemCount(k)+b.gems[k];
  if(b.pet&&PETS[b.pet]){const id=this.nextInst++;this.insts.push({id,kind:b.pet,grade:1});if(!this.has(b.pet)){this.owned.push(b.pet);this.mainId[b.pet]=id;}}}
 private rollDay(now=Date.now()){const d=dayKey(now);if(this.daily.day!==d)this.daily={day:d,c:{},done:[],chests:[],online:0,onlineGot:[],supply:[],ads:0,free:0};}
 /** count progress for today's tasks */
 track(k:DailyKey,n=1,now=Date.now()){this.rollDay(now);this.daily.c[k]=(this.daily.c[k]||0)+n;}
 // 签到
 signedToday(now=Date.now()){return this.signDay===dayKey(now);}
 get nextSign(){return signReward(this.signCount);}
 sign(now=Date.now()):Bundle|null{if(this.signedToday(now))return null;const b=signReward(this.signCount);this.grant(b);this.signCount++;this.signDay=dayKey(now);this.track('sign',1,now);return b;}
 // 在线
 addOnline(sec:number,now=Date.now()){this.rollDay(now);this.daily.online=Math.min(86400,this.daily.online+sec);}
 onlineReady(i:number,now=Date.now()){this.rollDay(now);return !!ONLINE[i]&&!this.daily.onlineGot.includes(i)&&this.daily.online>=ONLINE[i].min*60;}
 claimOnline(i:number,now=Date.now()){if(!this.onlineReady(i,now))return null;this.daily.onlineGot.push(i);this.grant(ONLINE[i].b);return ONLINE[i].b;}
 // 体力补给 & 广告体力
 supplyState(i:number,now=Date.now()):'open'|'done'|'soon'|'missed'{this.rollDay(now);const s=SUPPLY[i],h=hourOf(now);return this.daily.supply.includes(i)?'done':h>=s.from&&h<s.to?'open':h<s.from?'soon':'missed';}
 claimSupply(i:number,now=Date.now()){if(this.supplyState(i,now)!=='open')return 0;this.daily.supply.push(i);this.stamina=Math.min(999,this.stamina+SUPPLY[i].stamina);return SUPPLY[i].stamina;}
 adStaminaLeft(now=Date.now()){this.rollDay(now);return Math.max(0,AD_STAMINA.perDay-this.daily.ads);}
 claimAdStamina(now=Date.now()){if(this.adStaminaLeft(now)<=0)return 0;this.daily.ads++;this.stamina=Math.min(999,this.stamina+AD_STAMINA.amount);return AD_STAMINA.amount;}
 freeHatchReady(now=Date.now()){this.rollDay(now);return this.daily.free===0;}
 // 兑换码
 redeem(raw:string):{ok:boolean;msg:string;b?:Bundle}{const code=String(raw||'').trim().toUpperCase();const b=CODES[code];if(!b)return {ok:false,msg:'兑换码不存在'};if(this.codes.includes(code))return {ok:false,msg:'这个兑换码已经用过了'};this.codes.push(code);this.grant(b);return {ok:true,msg:'兑换成功',b};}
 // 每日任务 + 活跃度
 dailyProgress(id:DailyKey,now=Date.now()){this.rollDay(now);const t=DAILY.find(t=>t.id===id)!;return Math.min(t.goal,this.daily.c[id]||0);}
 dailyReady(id:DailyKey,now=Date.now()){const t=DAILY.find(t=>t.id===id);return !!t&&!this.daily.done.includes(id)&&this.dailyProgress(id,now)>=t.goal;}
 claimDaily(id:DailyKey,now=Date.now()){if(!this.dailyReady(id,now))return 0;this.daily.done.push(id);return DAILY.find(t=>t.id===id)!.pts;}
 activity(now=Date.now()){this.rollDay(now);return DAILY.filter(t=>this.daily.done.includes(t.id)).reduce((a,t)=>a+t.pts,0);}
 chestReady(i:number,now=Date.now()){return !!CHESTS[i]&&!this.daily.chests.includes(i)&&this.activity(now)>=CHESTS[i].pts;}
 claimChest(i:number,now=Date.now()){if(!this.chestReady(i,now))return null;this.daily.chests.push(i);this.grant(CHESTS[i].b);return CHESTS[i].b;}
 // 成就
 achValue(id:AchStat){switch(id){case 'clear':return this.stageStars.filter(x=>x>0).length;case 'stars':return this.totalStars;case 'wins':return this.stats.wins;case 'kills':return this.stats.kills;case 'pets':return this.owned.length;
  case 'hatch':return this.hatchCount;case 'forge':return this.forgeCount;case 'merge':return this.mergeCount;case 'captain':return this.captainLevel;}}
 achTier(id:AchStat){return this.ach[id]||0;}
 achReady(id:AchStat){const a=ACH.find(a=>a.id===id)!,t=this.achTier(id);return t<a.tiers.length&&this.achValue(id)>=a.tiers[t];}
 claimAch(id:AchStat){if(!this.achReady(id))return null;const a=ACH.find(a=>a.id===id)!,t=this.achTier(id),b=a.b(t);this.ach[id]=t+1;this.grant(b);return b;}
 tasksReady(now=Date.now()){return DAILY.filter(t=>this.dailyReady(t.id,now)).length+CHESTS.filter((_,i)=>this.chestReady(i,now)).length+ACH.filter(a=>this.achReady(a.id)).length;}
 // 邮件
 seedMails(now=Date.now()){for(const d of MAILS)if(!this.mails.some(m=>m.id===d.id))this.mails.unshift({id:d.id,at:now,read:false,got:!d.b||(d.id==='welcome'&&this.mailClaimed)});}
 readMail(id:string){const m=this.mails.find(m=>m.id===id);if(m)m.read=true;}
 claimMailId(id:string){const m=this.mails.find(m=>m.id===id),d=MAILS.find(d=>d.id===id);if(!m||!d||m.got||!d.b)return null;m.got=true;m.read=true;if(id==='welcome')this.mailClaimed=true;this.grant(d.b);return d.b;}
 claimAllMail(){let n=0;for(const m of this.mails)if(this.claimMailId(m.id))n++;for(const m of this.mails)m.read=true;return n;}
 get mailPending(){return this.mails.filter(m=>!m.read||!m.got).length;}
 // 图鉴
 markSeen(kinds:string[]){for(const k of kinds)if(!this.seenMon.includes(k))this.seenMon.push(k);}
 codexReady(key:string){if(this.codex.includes(key))return false;const [t,k]=key.split(':');if(t==='pet')return this.has(k);if(t==='mon')return this.seenMon.includes(k);if(t==='col'){const n=Number(k);return this.codexCount>=n;}return false;}
 get codexCount(){return this.owned.length+this.seenMon.length;}
 claimCodex(key:string){if(!this.codexReady(key))return null;const [t,k]=key.split(':');const b=t==='pet'?CODEX_PET_REWARD:t==='mon'?CODEX_MON_REWARD:CODEX_MILESTONES.find(m=>m.n===Number(k))?.b;if(!b)return null;this.codex.push(key);this.grant(b);return b;}
 codexPending(){return this.owned.filter(k=>this.codexReady('pet:'+k)).length+this.seenMon.filter(k=>this.codexReady('mon:'+k)).length+CODEX_MILESTONES.filter(m=>this.codexReady('col:'+m.n)).length;}
 /** something to collect in the 福利 hub */
 welfareReady(now=Date.now()){return this.newbiePending(now)+(!this.signedToday(now)?1:0)+ONLINE.filter((_,i)=>this.onlineReady(i,now)).length+SUPPLY.filter((_,i)=>this.supplyState(i,now)==='open').length;}
 // ------------------------------------------------------------ tasks & mail
 taskProgress(id:string){const t=TASKS.find(t=>t.id===id)!;return Math.min(t.goal,this.stats[t.stat]);}
 canClaim(id:string){const t=TASKS.find(t=>t.id===id);return !!t&&!this.claimed.includes(id)&&this.stats[t.stat]>=t.goal;}
 claim(id:string){if(!this.canClaim(id))return false;const t=TASKS.find(t=>t.id===id)!;this.coins+=t.coins;this.food+=t.food;this.claimed.push(id);return true;}
 get claimableTasks(){return TASKS.filter(t=>this.canClaim(t.id)).length;}
 claimMail(){if(this.mailClaimed)return false;this.mailClaimed=true;this.coins+=200;this.food+=10;return true;}
 // ------------------------------------------------------------ stages
 stageUnlocked(i:number){return i>=0&&i<STAGES.length&&(i===0||this.stageStars[i-1]>=1);}
 selectStage(i:number){if(!this.stageUnlocked(i))return false;this.stage=i;return true;}
 get nextStageOpen(){return this.stage+1<STAGES.length&&this.stageUnlocked(this.stage+1);}
 get totalStars(){return this.stageStars.reduce((a,b)=>a+b,0);}
 // ------------------------------------------------------------ pets (局外养成)
 has(kind:string){return this.owned.includes(kind);}
 /** Hatch one egg: costs food; rarity by weight, a rare-or-better is guaranteed every pityEvery eggs; duplicates turn into coins. */
 /** food per egg; 孵化日 halves it */
 hatchCost(now=Date.now()){return Math.ceil(HATCH.cost*eventMod('hatchCost',now));}
 hatch(rand:()=>number=Math.random,free=false,now=Date.now()):HatchResult|null{if(free){if(!this.freeHatchReady(now))return null;this.daily.free=1;}else{const cost=this.hatchCost(now);if(this.food<cost)return null;this.food-=cost;}this.hatchCount++;this.hatchSinceRare++;this.track('hatch',1,now);
  // the shell's 品级 is rolled first (it is what the player sees spinning past); the pet inside is revealed after
  const order=['common','fine','rare','epic','legend'];const pity=this.hatchSinceRare>=HATCH.pityEvery;
  const gw=order.map((x,i)=>pity&&i<2?0:HATCH.weights[x]),gt=gw.reduce((a,b)=>a+b,0);let gr=rand()*gt,grade=gw.length-1;for(let i=0;i<gw.length;i++){gr-=gw[i];if(gr<0){grade=i;break;}}
  if(grade>=2)this.hatchSinceRare=0;
  const pool=order.filter(x=>Object.keys(PETS).some(k=>PETS[k].rarity===x)),total=pool.reduce((a,x)=>a+HATCH.weights[x],0);let roll=rand()*total,rarity=pool[pool.length-1];for(const x of pool){roll-=HATCH.weights[x];if(roll<0){rarity=x;break;}}
  const kinds=Object.keys(PETS).filter(k=>PETS[k].rarity===rarity),kind=kinds[Math.min(kinds.length-1,Math.floor(rand()*kinds.length))];
  const isNew=!this.has(kind),id=this.nextInst++;this.insts.push({id,kind,grade});let upgraded=false,spare=false;
  if(isNew){this.owned.push(kind);this.mainId[kind]=id;}else{const cur=this.insts.find(i=>i.id===this.mainId[kind]);if(!cur||grade>cur.grade){this.mainId[kind]=id;upgraded=true;this.ranch=this.ranch.filter(x=>x!==id);}else spare=true;}
  this.hatchLog.unshift({kind,grade,at:now});this.hatchLog=this.hatchLog.slice(0,20);
  return {kind,isNew,coins:0,rarity,grade,instId:id,upgraded,spare};}
 // ------------------------------------------------------------ 品级 & 放养
 mainInst(kind:string){return this.insts.find(i=>i.id===this.mainId[kind]);}
 /** 品级 0..4 of the copy that fights for this pet */
 grade(kind:string){return this.mainInst(kind)?.grade||0;}
 copies(kind:string){return this.insts.filter(i=>i.kind===kind).sort((a,b)=>b.grade-a.grade||a.id-b.id);}
 spares(){return this.insts.filter(i=>this.mainId[i.kind]!==i.id).sort((a,b)=>b.grade-a.grade||a.id-b.id);}
 /** choose which copy of a pet fights (the old one becomes a spare); level and gear stay with the pet */
 setMain(kind:string,instId:number){const i=this.insts.find(x=>x.id===instId);if(!i||i.kind!==kind||!this.has(kind))return false;this.settleRanch();this.mainId[kind]=instId;this.ranch=this.ranch.filter(x=>x!==instId);return true;}
 /** turn a spare copy into coins */
 releaseSpare(instId:number){const i=this.insts.find(x=>x.id===instId);if(!i||this.mainId[i.kind]===instId)return 0;this.settleRanch();const c=Math.round(HATCH.dupCoins[PETS[i.kind].rarity]*(1+.5*i.grade));this.coins+=c;this.insts=this.insts.filter(x=>x!==i);this.ranch=this.ranch.filter(x=>x!==instId);return c;}
 ranchRates(){let coins=0,food=0;for(const id of this.ranch){const i=this.insts.find(x=>x.id===id);if(!i)continue;coins+=RANCH.coinsPerHour+RANCH.coinsPerGrade*i.grade;food+=RANCH.foodPerHour+RANCH.foodPerGrade*i.grade;}return {coins,food};}
 ranchPending(now=Date.now()){const seconds=Math.max(0,Math.min(RANCH.capSeconds,(now-this.ranchAt)/1000)),r=this.ranchRates();return {seconds,full:seconds>=RANCH.capSeconds,coins:Math.floor(this.ranchBank.coins+r.coins*seconds/3600),food:Math.floor(this.ranchBank.food+r.food*seconds/3600)};}
 /** bank what has accrued so far, then restart the clock (called before the ranch population changes) */
 private settleRanch(now=Date.now()){const p=this.ranchPending(now),r=this.ranchRates();this.ranchBank={coins:this.ranchBank.coins+r.coins*p.seconds/3600,food:this.ranchBank.food+r.food*p.seconds/3600};this.ranchAt=now;}
 toggleRanch(instId:number){const i=this.insts.find(x=>x.id===instId);if(!i||this.mainId[i.kind]===instId)return false;this.settleRanch();if(this.ranch.includes(instId)){this.ranch=this.ranch.filter(x=>x!==instId);return true;}if(this.ranch.length>=this.ranchSlots)return false;this.ranch.push(instId);return true;}
 collectRanch(now=Date.now()){const p=this.ranchPending(now);if(p.coins<=0&&p.food<=0)return null;this.track('ranch',1,now);this.coins+=p.coins;this.food+=p.food;this.ranchBank={coins:0,food:0};this.ranchAt=now;return p;}
 // ------------------------------------------------------------ 工坊 & 装备
 matsEnough(slot:SlotId){const c=slotDef(slot).cost as Partial<Mats>;return (Object.keys(c) as MatId[]).every(k=>this.mats[k]>=(c[k]||0));}
 canForge(slot:SlotId){return this.items.length<FORGE.bagMax&&this.coins>=FORGE.coins&&this.matsEnough(slot);}
 /** forge one random piece: quality, set and every stat are rolled; a 极品+ is guaranteed every pityEvery forges */
 forge(slot:SlotId,rand:()=>number=Math.random):Item|null{if(!this.canForge(slot))return null;const c=slotDef(slot).cost as Partial<Mats>;for(const k of Object.keys(c) as MatId[])this.mats[k]-=c[k]||0;this.coins-=FORGE.coins;
  this.forgeCount++;this.forgeSince++;this.track('forge');const pity=this.forgeSince>=FORGE.pityEvery,q=rollQuality(rand,pity?FORGE.pityGrade:0);if(q>=FORGE.pityGrade)this.forgeSince=0;
  const it=rollItem(this.nextItem++,slot,q,rand);this.items.push(it);return it;}
 itemOwner(id:number):string|null{for(const k of Object.keys(this.equip)){const e=this.equip[k];if(e&&Object.values(e).includes(id))return k;}return null;}
 equippedItem(kind:string,slot:SlotId){const id=this.equip[kind]?.[slot];return id===undefined?undefined:this.items.find(i=>i.id===id);}
 equippedItems(kind:string){return EQUIP_SLOTS.map(s=>this.equippedItem(kind,s.id)).filter((x):x is Item=>!!x);}
 /** put a piece on a pet (taking it from another pet if needed) */
 equipItem(kind:string,itemId:number){const it=this.items.find(i=>i.id===itemId);if(!it||!this.has(kind))return false;const o=this.itemOwner(itemId);if(o&&this.equip[o])delete this.equip[o]![it.slot];(this.equip[kind]||(this.equip[kind]={}))[it.slot]=itemId;return true;}
 unequip(kind:string,slot:SlotId){const e=this.equip[kind];if(!e||e[slot]===undefined)return false;delete e[slot];return true;}
 // ------------------------------------------------------------ 开罐子
 jarPrice(id:string,n:number){const j=jarDef(id);return j?j.coins*(n>=10?JAR_TEN:n):0;}
 jarPityLeft(id:string){const j=jarDef(id);return j?.pity?Math.max(1,j.pity.every-(this.jarPity[id]||0)):0;}
 /** open n jars (1 or 10). null when coins or bag space are short. */
 openJar(id:string,n=1,rand:()=>number=Math.random):{items:Item[];cost:number}|{error:'coins'|'bag'|'jar'}{const j=jarDef(id);if(!j)return {error:'jar'};const cost=this.jarPrice(id,n);if(this.coins<cost)return {error:'coins'};if(this.items.length+n>FORGE.bagMax)return {error:'bag'};
  this.coins-=cost;const items:Item[]=[];for(let i=0;i<n;i++){let min=0;if(j.pity){this.jarPity[id]=(this.jarPity[id]||0)+1;if(this.jarPity[id]>=j.pity.every)min=j.pity.grade;}const q=rollJarQuality(j,rand,min);if(j.pity&&q>=j.pity.grade)this.jarPity[id]=0;
   const slot=EQUIP_SLOTS[Math.min(EQUIP_SLOTS.length-1,Math.floor(rand()*EQUIP_SLOTS.length))].id,it=rollItem(this.nextItem++,slot,q,rand);this.items.push(it);items.push(it);}
  this.jarCount+=n;this.track('forge',n);return {items,cost};}
 // ------------------------------------------------------------ 强化
 enhanceInfo(id:number,protect=false){const it=this.items.find(i=>i.id===id);if(!it)return null;const cost=enhanceCost(it),pc=protect?protectCost(it):0,max=it.lv>=ENHANCE.max;
  const need:Partial<Mats>={...cost.mats};if(pc)need.crystal=(need.crystal||0)+pc;const short=(Object.keys(need) as MatId[]).filter(k=>this.mats[k]<(need[k]||0));
  return {it,rate:enhanceRate(it),brk:breakChance(it),drop:it.lv>=ENHANCE.dropFrom,cost,protectCost:protectCost(it),need,max,coinsOk:this.coins>=cost.coins,short,can:!max&&this.coins>=cost.coins&&!short.length};}
 /** one attempt. Failure from +6 drops a level, from +10 may shatter the piece (gems and some materials come back). Protection (灵晶) prevents both. */
 enhance(id:number,protect=false,rand:()=>number=Math.random):{ok:boolean;broke:boolean;dropped:boolean;lv:number;refund?:{mats:Partial<Mats>;gems:string[]}}|null{
  const inf=this.enhanceInfo(id,protect);if(!inf||!inf.can)return null;const it=inf.it;this.coins-=inf.cost.coins;for(const k of Object.keys(inf.need) as MatId[])this.mats[k]-=inf.need[k]||0;this.track('enhance');
  if(rand()<inf.rate){it.lv++;it.fails=0;return {ok:true,broke:false,dropped:false,lv:it.lv};}
  it.fails++;
  if(!protect&&inf.brk>0&&rand()<inf.brk){const y=dismantleYield(it);for(const k of Object.keys(y.mats) as MatId[])this.mats[k]+=y.mats[k]||0;for(const g of y.gems)this.gems[g]=this.gemCount(g)+1;
   for(const k of Object.keys(this.equip)){const e=this.equip[k];if(!e)continue;for(const sl of Object.keys(e) as SlotId[])if(e[sl]===it.id)delete e[sl];}this.items=this.items.filter(i=>i!==it);
   return {ok:false,broke:true,dropped:false,lv:it.lv,refund:{mats:y.mats,gems:y.gems}};}
  if(!protect&&inf.drop){it.lv--;return {ok:false,broke:false,dropped:true,lv:it.lv};}
  return {ok:false,broke:false,dropped:false,lv:it.lv};}
 dismantle(itemId:number){const it=this.items.find(i=>i.id===itemId);if(!it||this.itemOwner(itemId))return null;const y=dismantleYield(it);for(const k of Object.keys(y.mats) as MatId[])this.mats[k]+=y.mats[k]||0;this.coins+=y.coins;for(const k of y.gems)this.gems[k]=(this.gems[k]||0)+1;this.items=this.items.filter(i=>i!==it);return y;}
 // ------------------------------------------------------------ 宝石 (镶嵌在装备孔里)
 gemCount(k:string){return this.gems[k]||0;}
 gemList(){return Object.keys(this.gems).filter(k=>this.gems[k]>0&&parseGem(k)).sort((a,b)=>parseGem(b)!.lv-parseGem(a)!.lv||(gemDef(parseGem(a)!.id)!.id<gemDef(parseGem(b)!.id)!.id?-1:1));}
 gemTotal(){return Object.values(this.gems).reduce((a,b)=>a+b,0);}
 socketGem(itemId:number,idx:number,key:string){const it=this.items.find(i=>i.id===itemId);if(!it||idx<0||idx>=it.gems.length||!parseGem(key)||this.gemCount(key)<1)return false;const old=it.gems[idx];if(old)this.gems[old]=this.gemCount(old)+1;this.gems[key]--;it.gems[idx]=key;return true;}
 unsocketGem(itemId:number,idx:number){const it=this.items.find(i=>i.id===itemId);if(!it||!it.gems[idx])return false;const k=it.gems[idx];this.gems[k]=this.gemCount(k)+1;it.gems[idx]='';return true;}
 gemCombineCost(key:string){const g=parseGem(key);return g?GEM_COMBINE.coins*g.lv:0;}
 canCombineGem(key:string){const g=parseGem(key);return !!g&&g.lv<GEM_MAX&&this.gemCount(key)>=GEM_COMBINE.need&&this.coins>=this.gemCombineCost(key);}
 /** three gems of one kind and level become one gem a level higher */
 combineGem(key:string){if(!this.canCombineGem(key))return null;const g=parseGem(key)!;this.coins-=this.gemCombineCost(key);this.gems[key]-=GEM_COMBINE.need;const up=gemKey(g.id,g.lv+1);this.gems[up]=this.gemCount(up)+1;return up;}
 // ------------------------------------------------------------ 品级合成
 mergePityOf(kind:string,grade:number){return this.mergePity[kind+':'+grade]||0;}
 mergeInfo(kind:string,grade:number){const need=MERGE.need[grade]||0,have=this.insts.filter(i=>i.kind===kind&&i.grade===grade).length;return {need,have,rate:grade<MERGE.need.length?mergeRate(grade,this.mergePityOf(kind,grade)):0,pity:this.mergePityOf(kind,grade),can:grade<MERGE.need.length&&have>=need};}
 /** merge `need` copies of one 品级 into one of the next; it can fail (costing one copy) and each failure raises the next chance */
 merge(kind:string,grade:number,rand:()=>number=Math.random):MergeResult|null{if(!this.has(kind))return null;const info=this.mergeInfo(kind,grade);if(!info.can)return null;this.settleRanch();
  const main=this.mainId[kind],score=(i:PetInst)=>i.id===main?2:this.ranch.includes(i.id)?1:0;
  const used=this.insts.filter(i=>i.kind===kind&&i.grade===grade).sort((a,b)=>score(a)-score(b)||a.id-b.id).slice(0,info.need),key=kind+':'+grade;
  let ok=false,inst:PetInst|null=null,lost=0;
  if(rand()<info.rate){ok=true;this.insts=this.insts.filter(i=>!used.includes(i));inst={id:this.nextInst++,kind,grade:grade+1};this.insts.push(inst);this.mergePity[key]=0;lost=used.length;this.mergeCount++;}
  else{const gone=used[0];this.insts=this.insts.filter(i=>i!==gone);this.mergePity[key]=this.mergePityOf(kind,grade)+1;lost=1;}
  const mine=this.copies(kind),cur=mine.find(i=>i.id===this.mainId[kind]),best=mine[0];if(best&&(!cur||best.grade>cur.grade))this.mainId[kind]=best.id;
  this.ranch=this.ranch.filter(id=>this.insts.some(i=>i.id===id)&&!Object.values(this.mainId).includes(id));
  return {ok,grade,rate:info.rate,lost,inst,pity:this.mergePityOf(kind,grade)};}
 // ------------------------------------------------------------ 技能 (来自天赋，三选一做默认)
 skillIndex(kind:string){const pick=this.skillPick[kind]||0;return skillUnlocked(this.grade(kind),pick)?pick:0;}
 setSkill(kind:string,i:number){if(!PETS[kind]||!this.has(kind)||!Number.isInteger(i)||i<0||i>2||!skillUnlocked(this.grade(kind),i))return false;this.skillPick[kind]=i;return true;}
 /** the skill this pet casts in battle */
 petSkill(kind:string):PetSkill{const d=PETS[kind];return applySkillAlt(d.skill,skillAlts(d.job)[this.skillIndex(kind)]);}
 // ------------------------------------------------------------ 队长成长路线
 get roadReady(){return Math.max(0,Math.min(this.captainLevel,CAPTAIN.maxLevel)-this.roadClaimed);}
 /** claim the next unclaimed level reward of the 成长路线 */
 claimRoad(){if(this.roadReady<1)return null;const r=ROAD[this.roadClaimed];this.coins+=r.coins;this.food+=r.food;if(r.mats)for(const k of Object.keys(r.mats) as MatId[])this.mats[k]+=r.mats[k]||0;if(r.gem)this.gems[r.gem]=this.gemCount(r.gem)+1;this.roadClaimed++;return r;}
 /** wear the best free piece (by power) in every slot; pieces on other pets are left alone */
 autoEquip(kind:string){if(!this.has(kind))return 0;let n=0;for(const s of EQUIP_SLOTS){const cur=this.equippedItem(kind,s.id);let best=cur;for(const it of this.items){if(it.slot!==s.id||it===cur)continue;const o=this.itemOwner(it.id);if(o&&o!==kind)continue;if(!best||itemPower(it)>itemPower(best))best=it;}if(best&&best!==cur){this.equipItem(kind,best.id);n++;}}return n;}
 unequipAll(kind:string){const e=this.equip[kind];if(!e)return 0;const n=Object.keys(e).length;delete this.equip[kind];return n;}
 petPower(kind:string){const st=this.petStats(kind);return Math.round((st.hp+st.atk*10+st.def*15)/10);}
 /** can any grade of this pet be merged right now */
 canMergeAny(kind:string){return [0,1,2].some(g=>this.mergeInfo(kind,g).can);}
 /** talents (by 品级) + equipment + set bonuses, as the battle sees them */
 petMods(kind:string):PetMods{const m:PetMods={};if(!PETS[kind])return m;addMods(m,talentMods(PETS[kind].job,this.grade(kind)));const eq=this.equippedItems(kind);for(const it of eq)addMods(m,itemMods(it));addMods(m,setMods(eq));return m;}
 /** hp / atk / def the pet brings into a level-1 fight, with level, grade, talents and gear applied */
 petStats(kind:string){const d=PETS[kind],b=this.petBonus(kind),m=this.petMods(kind);return {hp:Math.round(d.hp*b*(1+(m.hp||0))),atk:Math.round(d.atk*b*(1+(m.atk||0))),def:Math.round(d.def+(m.def||0))};}
 /** sum of the lineup's levels: the 训练场 output scales with it */
 trainPower(){return this.deck.reduce((a,k)=>a+this.petLevel(k),0);}
 trainRates(){const s=this.trainPower();return {coins:TRAIN.coinsBase+TRAIN.coinsPerLevel*s,food:TRAIN.foodBase+TRAIN.foodPerLevel*s};}
 trainPending(now=Date.now()){const seconds=Math.max(0,Math.min(TRAIN.capSeconds,(now-this.trainAt)/1000)),r=this.trainRates();return {seconds,full:seconds>=TRAIN.capSeconds,coins:Math.floor(r.coins*seconds/3600),food:Math.floor(r.food*seconds/3600)};}
 collectTrain(now=Date.now()){const p=this.trainPending(now);if(p.coins<=0&&p.food<=0)return null;this.track('ranch',1,now);this.coins+=p.coins;this.food+=p.food;this.trainAt=now;return p;}
 petLevel(kind:string){return this.petLevels[kind]||1;}
 /** growth bonus applied to hp/atk at the start of every battle: +6% per level above 1 */
 petBonus(kind:string){return (1+.035*(this.petLevel(kind)-1))*GRADES[this.grade(kind)].mul*this.captainMul;}
 petLevelCap(kind:string){return GRADE_LEVEL_CAP[Math.max(0,Math.min(GRADE_LEVEL_CAP.length-1,this.grade(kind)))];}
 petUpCost(kind:string){const lv=this.petLevel(kind);return {coins:Math.round(80+20*Math.pow(lv,1.8)),food:1+Math.floor(lv/4)};}
 canUpgradePet(kind:string){const c=this.petUpCost(kind);return this.petLevel(kind)<this.petLevelCap(kind)&&this.coins>=c.coins&&this.food>=c.food;}
 upgradePet(kind:string){if(!PETS[kind]||!this.has(kind)||!this.canUpgradePet(kind))return false;const c=this.petUpCost(kind);this.coins-=c.coins;this.food-=c.food;this.petLevels[kind]=this.petLevel(kind)+1;this.track('petup');return true;}
 inDeck(kind:string){return this.deck.includes(kind);}
 /** add or remove a pet from the squad; the squad keeps 1..6 pets */
 toggleDeck(kind:string){if(!PETS[kind]||!this.has(kind))return false;if(this.inDeck(kind)){if(this.deck.length<=1)return false;this.deck=this.deck.filter(k=>k!==kind);return true;}if(this.deck.length>=DECK_MAX)return false;this.deck.push(kind);return true;}
 // squad power shown on the home screen (base W04 stats; grows with captain level)
 get teamPower(){let sum=0;for(const k of this.deck){const d=PETS[k];const m=this.petMods(k);sum+=(d.hp+d.atk*10+d.def*15)*this.petBonus(k)*(1+(m.hp||0)*.5+(m.atk||0)*.5);}return Math.round(sum);}
}
export function formatCount(n:number){return n>=1e8?(n/1e8).toFixed(1).replace(/\.0$/,'')+'亿':n>=1e4?(n/1e4).toFixed(1).replace(/\.0$/,'')+'万':String(n);}
