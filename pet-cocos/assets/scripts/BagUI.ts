// 背包：装备（按部位筛选、镶宝石、分解）/ 材料（在哪里掉）/ 宝石（合成）。
import {Node,Color} from 'cc';
import {C} from './PaperUI';
import {PETS} from './battle/BattleConfig';
import {STAGES,CHAPTERS} from './battle/BattleConfig';
import {GRADES,gradeColor,EQUIP_SLOTS,MATS,MAT_COLOR,FORGE,GEMS,GEM_MAX,GEM_COMBINE,fmtStat,STAT_INFO,itemName,itemPower,setDef,slotDef,gemKey,gemLabel,gemStatText,gemDef,parseGem,CHAPTER_DROPS,itemLines,itemSkillDef} from './meta/Gear';
import type {Item,SlotId,MatId} from './meta/Gear';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import type {PetUI} from './PetUI';
import {col,mix,deep} from './uiutil';

export class BagUI{
 private k:Kit;private tab=0;private slot:SlotId|'all'='all';private page=0;private sel:number|null=null;private gemPage=0;
 constructor(private h:GearHost,private pet:PetUI,private hub:{openWorkshop():void;openEnhance(id:number):void}){this.k=new Kit(h);}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}

 open(tab=this.tab){this.tab=tab;const m=this.m,k=this.k;this.h.modal('背包',(p,w)=>{
  ['装备','材料','宝石'].forEach((t,i)=>k.btn(p,'bt'+i,`${t}${i===0?` ${m.items.length}`:i===2?` ${m.gemTotal()}`:''}`,15+(w-30)/6+i*(w-30)/3,84,(w-30)/3-6,38,()=>{this.tab=i;this.page=0;this.gemPage=0;this.open(i);},this.tab===i?'gold':'cream',16));
  let y=108;y=[()=>this.items(p,w,y),()=>this.mats(p,w,y),()=>this.gems(p,w,y)][this.tab]();return y+14;},480);}

 // ---------------------------------------------------------------- 装备
 private items(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0+8;
  const cw=(w-30)/9;(['all',...EQUIP_SLOTS.map(s=>s.id)] as (SlotId|'all')[]).forEach((s,i)=>k.chip(p,'bs'+s,s==='all'?'全部':slotDef(s).name,15+cw*(i+.5),y+16,cw-3,this.slot===s,()=>{this.slot=s;this.page=0;this.sel=null;this.open();},12,30));y+=40;
  const list=m.items.filter(i=>this.slot==='all'||i.slot===this.slot).sort((a,b)=>b.q-a.q||itemPower(b)-itemPower(a)),per=5,pages=Math.max(1,Math.ceil(list.length/per));this.page=Math.min(this.page,pages-1);
  const it=m.items.find(i=>i.id===this.sel)||null;
  if(it){const q=gradeColor(it.q),ns=(it.skills||[]).length,hh=128+ns*20+(ns?14:0),card=this.ui.rect(p,'sel',w/2,y+hh/2,w-30,hh,mix(q,.78),true);this.ui.rect(card,'qbar',8,hh/2,6,hh-14,col(q),false);
   k.itemIcon(card,w-30-40,44,54,it);k.lt(card,itemName(it),20,16,200,22,17,true,deep(q,.5));k.gradeChip(card,w-30-110,16,it.q,48);k.lt(card,`${slotDef(it.slot).name} · ${setDef(it.set).name}套装 · 战力 ${itemPower(it)}`,20,36,w-60,14,11,true,deep(setDef(it.set).color,.6));
   const lines=itemLines(it);(it.skills||[]).forEach((sk,i)=>{const d=itemSkillDef(sk.id);if(!d)return;k.skillBadge(card,28,112+i*20,16,d.icon,d.color);k.lt(card,`${d.name}：${d.text(sk.v)}`,42,112+i*20,w-140,16,11,true,deep(d.color,.55));});k.lt(card,lines.slice(0,3).join('　'),20,54,w-60,14,12,true,C.ink);k.lt(card,lines.slice(3).join('　'),20,70,w-60,14,12,false,C.ink);
   this.pet.socketRow(card,w-30,92,it,()=>this.open());k.btn(card,'enh','强化',w-30-128,hh-26,70,32,()=>this.hub.openEnhance(it.id),'cream',13,'hammer');
   const o=m.itemOwner(it.id);k.btn(card,'dis',o?'穿戴中':'分解',w-30-44,hh-26,76,32,()=>{if(o){this.h.say(`${PETS[o].name}穿戴中，先卸下`,1.6);return;}const r=m.dismantle(it.id);if(r){m.save();this.h.refresh();this.sel=null;this.h.say(`分解获得 ${r.coins} 金币${r.gems.length?'，宝石已退回':''}`,1.8);this.open();}},o?'grey':'cream',13);
   if(this.pet['gemPick']&&this.pet['gemPick'].item===it.id)this.gemSocketPanel(p,w,y+hh+6,it);
   y+=hh+8;
   if(this.pet['gemPick']&&this.pet['gemPick'].item===it.id)return y+this.gemPanelH+6;}
  list.slice(this.page*per,this.page*per+per).forEach(i=>{const q=gradeColor(i.q),o=m.itemOwner(i.id),r=this.ui.rect(p,'row'+i.id,w/2,y+25,w-30,50,i.id===this.sel?mix(q,.5):mix(q,.84),true);k.itemIcon(r,26,25,42,i);
   k.lt(r,itemName(i),54,14,150,20,15,true,deep(q,.5));k.lt(r,`${GRADES[i.q].name} · 战力 ${itemPower(i)}${o?' · '+PETS[o].name+'穿戴':''}`,54,35,160,14,11,true,o?C.red:C.muted);
   k.lt(r,fmtStat(i.main.k,i.main.v),214,14,130,16,12,true,C.ink);const gc=i.gems.filter(Boolean).length;k.lt(r,`宝石 ${gc}/${i.gems.length}`,214,35,100,14,11,true,gc?C.ink:C.muted);
   this.h.tap(r,()=>{this.sel=i.id;this.pet['gemPick']=null;this.open();});y+=54;});
  if(!list.length){k.ct(p,this.slot==='all'?'背包是空的，去工坊打造装备吧':`没有${slotDef(this.slot as SlotId).name}`,w/2,y+22,w-30,20,14,true,C.muted);y+=48;}
  y+=k.pager(p,w,y,this.page,pages,n=>{this.page=n;},()=>this.open());
  k.btn(p,'bagwork','去工坊',w/2-90,y+26,150,42,()=>this.hub.openWorkshop(),'cream',15,'hammer');
  k.btn(p,'bagclean','一键分解凡品良品',w/2+90,y+26,170,42,()=>{let n=0,c=0;for(const i of [...m.items])if(i.q<=1&&!m.itemOwner(i.id)){const r=m.dismantle(i.id);if(r){n++;c+=r.coins;}}
   if(!n){this.h.say('没有可分解的凡品/良品',1.4);return;}m.save();this.h.refresh();this.sel=null;this.h.say(`分解了 ${n} 件，获得 ${c} 金币`,1.8);this.open();},'cream',14);
  return y+56;}
 private gemPanelH=0;
 private gemSocketPanel(p:Node,w:number,y:number,it:Item){const before=y;const yy=this.pet.gemPanel(p,w,y,it,()=>this.open());this.gemPanelH=yy-before;}

 // ---------------------------------------------------------------- 材料
 private mats(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0+8;
  const use:Record<MatId,string>={wood:'打造披风、护符、护腿、靴子',ore:'打造头盔、项链、护甲、戒指',hide:'打造护甲、披风、护腿、靴子、头盔',crystal:'打造项链、戒指、护符；分解极品以上也会返还'};
  MATS.forEach(mt=>{const r=this.ui.frame(p,'mat'+mt.id,w/2,y+44,w-30,84,'card');this.ui.rect(r,'sw',34,42,36,36,col(MAT_COLOR[mt.id]),true);
   k.lt(r,mt.name,64,18,100,22,17,true,C.ink);k.lt(r,`×${m.mats[mt.id]}`,w-30-110,18,100,26,22,true,C.ink);k.lt(r,`用途：${use[mt.id]}`,64,42,w-100,14,11,true,C.muted);
   const src=CHAPTER_DROPS.map((t,i)=>({i,l:t.mats.find(x=>x.id===mt.id)})).filter(x=>x.l&&x.l.max>0);
   const best=mt.id==='crystal'?'首领关、三星通关必得；其它关卡有几率':src.sort((a,b)=>b.l!.max-a.l!.max).slice(0,2).map(x=>`${CHAPTERS[x.i]} ${x.l!.min}-${x.l!.max}`).join('、');
   k.lt(r,`获取：${best}`,64,62,w-100,14,11,true,deep(MAT_COLOR[mt.id],.6));y+=92;});
  k.btn(p,'matgo','去冒险刷材料',w/2,y+24,200,46,()=>this.h.startAdventure(),'red',18,'swords');return y+56;}

 // ---------------------------------------------------------------- 宝石
 private gems(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0+8;
  k.ct(p,`${GEM_COMBINE.need} 颗同种同级宝石可合成 1 颗更高级（花费金币），镶嵌在装备的宝石孔里`,w/2,y+10,w-30,18,12,true,C.muted);y+=26;
  const list:string[]=[];for(const g of GEMS)for(let lv=1;lv<=GEM_MAX;lv++){const key=gemKey(g.id,lv);if(m.gemCount(key)>0||lv===1)list.push(key);}
  const shown=list.filter(key=>m.gemCount(key)>0),per=6,pages=Math.max(1,Math.ceil(shown.length/per));this.gemPage=Math.min(this.gemPage,pages-1);
  shown.slice(this.gemPage*per,this.gemPage*per+per).forEach(key=>{const gm=parseGem(key)!,n=m.gemCount(key),r=this.ui.rect(p,'g'+key,w/2,y+25,w-30,50,mix(gemDef(gm.id)!.color,.86),true);k.gemIcon(r,32,25,17,key);
   k.lt(r,gemLabel(key),62,14,130,20,16,true,C.ink);k.lt(r,gemStatText(key),62,35,150,14,11,true,C.muted);k.lt(r,`×${n}`,200,24,60,24,18,true,C.ink);
   if(gm.lv<GEM_MAX)k.btn(r,'cmb'+key,`合成 ${m.gemCombineCost(key)}`,w-30-52,25,92,34,()=>{const up=m.combineGem(key);if(up){m.save();this.h.refresh();this.h.say(`合成了 ${gemLabel(up)}`,1.6);this.open();}else this.h.say(n<GEM_COMBINE.need?`需要 ${GEM_COMBINE.need} 颗同级宝石`:`金币不足，需要 ${m.gemCombineCost(key)}`,1.6);},m.canCombineGem(key)?'green':'grey',13,'coin');
   else k.ct(r,'已满级',w-30-46,25,70,18,13,true,C.muted);y+=54;});
  if(!shown.length){k.ct(p,'还没有宝石。冒险获胜会掉落，队长成长路线也有奖励',w/2,y+30,w-40,36,14,true,C.muted);y+=70;}
  y+=k.pager(p,w,y,this.gemPage,pages,n=>{this.gemPage=n;},()=>this.open());
  const t=GEMS.map(g=>`${g.name}：${STAT_INFO[g.stat].name}`).join('　');k.ct(p,t,w/2,y+16,w-24,28,11,false,C.muted);y+=44;return y;}
}
