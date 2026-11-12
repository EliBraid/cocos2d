// 限时活动: weekly rotating events (always something on, no server needed) plus dated ones for festivals.
// Each event only scales a few numbers the economy already uses; add a dated entry to run a holiday event.
export type EventMod='coins'|'hatchCost'|'towerTries';
export interface GameEvent{id:string;name:string;desc:string;icon:string;mods:Partial<Record<EventMod,number>>;
 /** weekly: days of the week it runs (0 = Sunday); dated: local dates 'YYYY-MM-DD' (inclusive) */
 weekdays?:number[];from?:string;to?:string}
export const EVENTS:GameEvent[]=[
 {id:'weekend-coins',name:'周末金币节',desc:'周六、周日冒险和扫荡的金币 ×1.5',icon:'coin',mods:{coins:1.5},weekdays:[6,0]},
 {id:'hatch-day',name:'孵化日',desc:'每周三孵化消耗减半',icon:'egg',mods:{hatchCost:.5},weekdays:[3]},
 {id:'tower-friday',name:'试炼加赛',desc:'每周五试炼之塔挑战机会 +2',icon:'trophy',mods:{towerTries:2},weekdays:[5]},
 // example of a dated festival event; edit the dates and numbers for real operations
 {id:'newyear-2027',name:'新春庆典',desc:'活动期间冒险金币 ×2，孵化消耗减半',icon:'star',mods:{coins:2,hatchCost:.5},from:'2027-02-05',to:'2027-02-12'},
];
const ymd=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function activeEvents(now=Date.now()):GameEvent[]{const d=new Date(now),day=ymd(d);
 return EVENTS.filter(e=>e.from&&e.to?day>=e.from&&day<=e.to:!!e.weekdays?.includes(d.getDay()));}
/** multiplier (coins, hatchCost) or bonus (towerTries) from today's events; coin multipliers take the largest, not the product */
export function eventMod(mod:EventMod,now=Date.now()){const list=activeEvents(now).map(e=>e.mods[mod]).filter((v):v is number=>v!==undefined);
 if(mod==='towerTries')return list.reduce((a,b)=>a+b,0);if(!list.length)return 1;return mod==='hatchCost'?Math.min(...list):Math.max(...list);}
