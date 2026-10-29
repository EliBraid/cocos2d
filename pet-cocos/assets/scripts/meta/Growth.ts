// 队长成长路线 + 品级合成规则。纯数据，不依赖引擎。
import type {Mats} from './Gear';

// ---------------------------------------------------------------- 队长成长
export const CAPTAIN={
 maxLevel:30,
 petBonusPerLevel:.015,        // 每级全队生命、攻击 +1.5%
 staminaPerLevel:1,            // 每级体力上限 +1
 goldEvery:5,goldStep:10,      // 每 5 级开局金币 +10
 ranchAt:[1,5,10],             // 放养位 1 / 2 / 3 个
 xpSources:[['完成一场冒险','20 + 击败数'],['每颗星','+15'],['每日任务','金币与食物']] as [string,string][]};
export const captainBonus=(lv:number)=>1+CAPTAIN.petBonusPerLevel*(Math.max(1,lv)-1);
export const staminaMaxFor=(lv:number,base:number)=>base+CAPTAIN.staminaPerLevel*(Math.max(1,lv)-1);
export const startGoldFor=(lv:number)=>Math.floor(Math.max(0,lv)/CAPTAIN.goldEvery)*CAPTAIN.goldStep;
export const ranchSlotsFor=(lv:number)=>CAPTAIN.ranchAt.filter(n=>lv>=n).length;

export interface RoadReward{level:number;coins:number;food:number;mats?:Partial<Mats>;gem?:string;unlock?:string}
/** what each captain level hands out when claimed on the 成长路线 */
export function roadReward(level:number):RoadReward{const r:RoadReward={level,coins:80+level*40,food:2+Math.floor(level/2)};
 if(level%3===0)r.mats={ore:3+Math.floor(level/3),hide:3+Math.floor(level/3)};
 if(level%5===0)r.mats={...(r.mats||{}),crystal:1+Math.floor(level/10)};
 if(level%4===0)r.gem=level>=16?'topaz2':level>=8?'ruby2':'ruby1';
 const u:string[]=[];if(CAPTAIN.ranchAt.includes(level)&&level>1)u.push('放养位 +1');if(level%CAPTAIN.goldEvery===0)u.push(`开局金币 +${CAPTAIN.goldStep}`);
 if(u.length)r.unlock=u.join('，');return r;}
export const ROAD=Array.from({length:CAPTAIN.maxLevel},(_,i)=>roadReward(i+1));

// ---------------------------------------------------------------- 品级合成
// 2 个凡品 -> 良品，3 个良品 -> 上品，4 个上品 -> 极品；每一级都可能失败，品质越高越容易失败。
// 失败会损失 1 个材料个体，其余退回；连续失败会累积「祈福」，下一次成功率提高。
export const MERGE={need:[2,3,4],rate:[.85,.7,.55],pityStep:.1,pityMax:.3};
export const mergeRate=(grade:number,pity:number)=>Math.min(.98,MERGE.rate[grade]+Math.min(MERGE.pityMax,pity*MERGE.pityStep));
