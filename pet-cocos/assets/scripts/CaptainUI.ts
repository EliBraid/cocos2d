// 队长：成长路线（等级、加成、逐级奖励）和队长技能选择。
import {Node} from 'cc';
import {C} from './PaperUI';
import {CAPTAINS} from './battle/BattleConfig';
import type {CaptainKind} from './battle/BattleConfig';
import {PlayerModel} from './meta/PlayerModel';
import {CAPTAIN,ROAD,captainBonus,staminaMaxFor,ranchSlotsFor,startGoldFor} from './meta/Growth';
import {MATS,gemLabel,gemDef,parseGem} from './meta/Gear';
import {mergeBundles} from './meta/Welfare';
import type {Bundle} from './meta/Welfare';
const roadB=(r:{coins:number;food:number;mats?:any;gem?:string}):Bundle=>({coins:r.coins,food:r.food,mats:r.mats,gems:r.gem?{[r.gem]:1}:undefined});
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import {col,mix,deep,LEFT} from './uiutil';

export class CaptainUI{
 private k:Kit;private tab=0;private page=-1;get lastTab(){return this.tab;}
 constructor(private h:GearHost,private openSettings:()=>void){this.k=new Kit(h);}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}
 open(tab=this.tab){this.tab=tab;const m=this.m,k=this.k;this.h.modal('队长',(p,w)=>{
  const card=this.ui.frame(p,'Profile',w/2,114,w-30,92,'card');this.ui.img(card,'avatar-ring',44,46,64);this.h.sprite(card,'home/avatar-fox',44,46,52,52);
  k.lt(card,m.name,86,20,200,24,19,true,C.ink);const max=m.captainLevel>=CAPTAIN.maxLevel;k.lt(card,`队长 Lv.${m.captainLevel}${max?'（满级）':` / ${CAPTAIN.maxLevel}`}`,86,44,160,18,14,true,C.red);
  this.ui.bar(card,86+95,68,190,12,m.captainProgress,col([76,213,220]));k.lt(card,max?'已满级':`${m.captainXp} / ${PlayerModel.xpToNext(m.captainLevel)} 经验`,86+210,68,100,14,11,true,C.muted);
  k.lt(card,`冒险 ${m.stats.battles} 场　胜利 ${m.stats.wins} 场`,w-30-150,20,140,14,11,true,C.muted);
  ['成长路线','队长技能'].forEach((t,i)=>k.btn(p,'ct'+i,t+(i===0&&m.roadReady>0?' ●':''),15+(w-30)/4+i*(w-30)/2,180,(w-30)/2-6,38,()=>{this.tab=i;this.open(i);},this.tab===i?'gold':'cream',16));
  const y=this.tab===0?this.road(p,w,208):this.skills(p,w,208);return y+14;},480);}

 // ---------------------------------------------------------------- 成长路线
 private road(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0+6;
  // current passive bonuses
  const lv=m.captainLevel,items:[string,string][]=[['全队生命·攻击',`+${Math.round((captainBonus(lv)-1)*1000)/10}%`],['体力上限',`${staminaMaxFor(lv,80)}`],['放养位',`${ranchSlotsFor(lv)} 个`],['开局金币',`+${startGoldFor(lv)}`]];
  const cw=(w-30-18)/4;items.forEach(([n,v],i)=>{const c=this.ui.frame(p,'pas'+i,15+cw/2+i*(cw+6),y+28,cw,56,'card');k.ct(c,n,cw/2,16,cw,14,11,true,C.muted);k.ct(c,v,cw/2,38,cw,22,17,true,C.ink);});y+=64;
  k.ct(p,`经验来源：${CAPTAIN.xpSources.map(([a,b])=>`${a} ${b}`).join('　')}`,w/2,y+8,w-24,16,11,true,C.muted);y+=24;
  if(m.roadReady>0)k.btn(p,'roadall',`一键领取 ${m.roadReady} 级奖励`,w/2,y+22,240,42,()=>{const got:Bundle[]=[];let r;while((r=m.claimRoad()))got.push(roadB(r));m.save();this.h.refresh();this.page=-1;this.open();this.h.reward('成长奖励',{b:mergeBundles(got),sub:`领取了 ${got.length} 级奖励`});},'green',17,'chest');
  else k.ct(p,lv>=CAPTAIN.maxLevel?'所有等级奖励已领取':`下一级 Lv.${lv+1} 奖励：升级后领取`,w/2,y+22,w-40,20,14,true,C.muted);y+=50;
  const per=6,pages=CAPTAIN.maxLevel/per;if(this.page<0)this.page=Math.min(pages-1,Math.floor(m.roadClaimed/per));
  for(let i=this.page*per;i<this.page*per+per;i++){const r=ROAD[i],n=i+1,done=n<=m.roadClaimed,ready=n===m.roadClaimed+1&&n<=lv,reach=n<=lv;
   const row=this.ui.frame(p,'road'+n,w/2,y+30,w-30,60,ready?'card-gold':done?'card-empty':'card');
   const b=this.ui.rect(row,'lv',30,30,44,36,done?col([196,200,186]):reach?col([244,184,52]):col([226,222,206]),true);k.ct(b,`${n}`,22,18,44,26,19,true,done?C.muted:C.ink);
   // reward chips
   let x=64;this.ui.icon(row,'coin',x+8,20,20);k.lt(row,String(r.coins),x+22,20,50,16,12,true,C.ink);this.ui.icon(row,'food',x+82,20,18);k.lt(row,String(r.food),x+96,20,36,16,12,true,C.ink);
   const ex:string[]=[];if(r.mats)for(const mt of MATS)if(r.mats[mt.id])ex.push(`${mt.name}${r.mats[mt.id]}`);if(r.gem)ex.unshift(gemLabel(r.gem));
   k.lt(row,ex.join(' '),x+(r.gem?16:0),42,230,14,11,true,C.ink);if(r.gem)k.gemIcon(row,x+7,43,7,r.gem);
   
   if(r.unlock)k.lt(row,r.unlock,x+150,20,150,16,11,true,col([200,90,40]));
   if(ready)k.btn(row,'rc'+n,'领取',w-30-44,30,70,38,()=>{const got=m.claimRoad();if(got){m.save();this.h.refresh();this.open();this.h.reward('成长奖励',{b:roadB(got),sub:`队长 Lv.${n}${r.unlock?' · '+r.unlock:''}`});}},'green',15);
   else if(done)k.ct(row,'已领',w-30-40,30,60,20,14,true,C.muted);else k.ct(row,reach?'':`Lv.${n} 解锁`,w-30-44,30,76,20,12,true,C.muted);y+=64;}
  y+=k.pager(p,w,y,this.page,pages,n=>{this.page=n;},()=>this.open());return y;}

 // ---------------------------------------------------------------- 队长技能
 private skills(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0+6;
  k.ct(p,'队长技能（每局只能带一个，战斗中手动释放）',w/2,y+8,w-40,18,13,true,C.muted);y+=24;
  (Object.keys(CAPTAINS) as CaptainKind[]).forEach(key=>{const c=CAPTAINS[key],on=m.captain===key,row=this.ui.frame(p,'cap:'+key,w/2,y+35,w-30,70,on?'card-gold':'card');this.ui.icon(row,c.icon,34,35,36);
   k.lt(row,c.name,64,18,150,22,17,true,on?C.red:C.ink);k.lt(row,c.desc,64,44,w-30-150,30,12,false,C.ink);
   k.btn(row,'pick:'+key,on?'已选':'选择',w-30-46,35,72,34,()=>{if(!on){m.captain=key;m.save();this.h.say(`队长技能：${c.name}`);this.open();}},on?'grey':'green',15);y+=76;});
  k.btn(p,'to-settings','设置',w/2,y+26,150,44,()=>this.openSettings(),'cream',18,'gear');return y+56;}
}
