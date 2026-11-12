// 主城里的养成界面：工坊（打造装备）、宠物界面（装备槽 / 套装 / 天赋 / 品级个体）、放养所、
// 以及老虎机式的孵化屋。HomeSlice 把自己的小工具借给它（GearHost），这里不碰场景本身。
import {Node,Color,Graphics,Label,Sprite,UITransform,HorizontalTextAlignment,Mask,SpriteFrame,tween,Vec3} from 'cc';
import {PaperUI,C} from './PaperUI';
import type {GearHost} from './UIHost';
import {PetUI} from './PetUI';
import {BagUI} from './BagUI';
import {AdventureUI} from './AdventureUI';
import {CaptainUI} from './CaptainUI';
import {PETS,JOBS,RARITY} from './battle/BattleConfig';
import {PlayerModel,HATCH,RANCH,PET_MAX_LEVEL} from './meta/PlayerModel';
import {Ads} from './Ads';
import type {HatchResult} from './meta/PlayerModel';
import {GRADES,gradeColor,EQUIP_SLOTS,SETS,MATS,MAT_COLOR,FORGE,TALENTS,STAT_KEYS,fmtStat,itemName,itemPower,setDef,slotDef,setCounts,gemLabel,itemSkillDef,ENHANCE,SKILL_ROLLS,JARS,JAR_TEN,jarDef,rollJarQuality} from './meta/Gear';
import type {JarDef} from './meta/Gear';
import {Kit} from './Kit';
import type {Item,SlotId,MatId,Mats} from './meta/Gear';

export type {GearHost} from './UIHost';
const col=(c:ArrayLike<number>,a=255)=>new Color(c[0],c[1],c[2],a);
const mix=(c:ArrayLike<number>,k:number,a=255)=>new Color(c[0]+(255-c[0])*k,c[1]+(255-c[1])*k,c[2]+(255-c[2])*k,a); // toward white
const deep=(c:ArrayLike<number>,k:number)=>new Color(c[0]*k,c[1]*k,c[2]*k,255);
const LEFT=HorizontalTextAlignment.LEFT;
const matCost=(c:Partial<Mats>)=>(Object.keys(c) as MatId[]).map(k=>`${MATS.find(m=>m.id===k)!.name}${c[k]}`).join(' ');
const fmtK=(n:number)=>n>=10000?`${(n/10000).toFixed(n%10000?1:0)}万`:String(n);
const pct=(n:number)=>(Math.round(n*10)/10).toString().replace(/\.0$/,'');

interface Reel{cx:number;node:Node|null;tiles:Node[];cellOf:number[];gradeOf:number[];cells:number[];s:number;T:number;delay:number;dur:number;state:'idle'|'spin'|'stopped'|'flip'|'open';stopAt:number;flipT:number;res:HatchResult|null;label:Node|null;tag:Node|null;center:Node|null}
interface Spin{reels:Reel[];t:number;done:boolean;fx:Graphics|null;parts:{x:number;y:number;vx:number;vy:number;life:number;c:Color}[];lamps:Graphics|null}
const PITCH=104,STRIP=30,MW=460;

export class GearUI{
 private kit:Kit;private wtab=0;private enhId:number|null=null;private protect=false;private enhPage=0;private disPage=0;
 private enhFx:{kind:'ok'|'fail'|'drop'|'break';t:number;g:Graphics|null;label:Node|null;parts:{x:number;y:number;vx:number;vy:number;c:Color;s:number}[]}|null=null;
 private jar:{id:string;items:Item[];t:number;strip:Node|null;tiles:Node[];fx:Graphics|null;shown:number;card:Node|null;done:boolean}|null=null;
 private selSlot:SlotId='helmet';private focus:number|null=null;private bagPage=0;private detailTab=0;private ranchPage=0;private slotPage=0;
 private spin:Spin|null=null;private lampT=0;
 readonly pet:PetUI;readonly bag:BagUI;readonly adv:AdventureUI;readonly cap:CaptainUI;
 constructor(private h:GearHost){this.kit=new Kit(h);const hub={openWorkshop:()=>this.openWorkshop(0),openEnhance:(id:number)=>{this.enhId=id;this.enhFx=null;this.openWorkshop(1);},openRanch:()=>{this.ranchPage=0;this.openRanch();},openHatchery:()=>this.openHatchery()};this.pet=new PetUI(h,hub);this.bag=new BagUI(h,this.pet,hub);this.adv=new AdventureUI(h);this.cap=new CaptainUI(h,()=>h.settings());}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}
 /** left-aligned text whose left edge is x0 */
 private lt(p:Node,s:string,x0:number,y:number,w:number,h:number,size=14,bold=true,color=C.ink){return this.h.text(p,'',s,x0+w/2,y,w,h,size,bold,color,LEFT);}
 private ct(p:Node,s:string,x:number,y:number,w:number,h:number,size=14,bold=true,color=C.ink){return this.h.text(p,'',s,x,y,w,h,size,bold,color);}

 // ================================================================ shared bits
 private gradeChip(p:Node,x:number,y:number,grade:number,w=52){const c=gradeColor(grade);const n=this.ui.rect(p,'grade',x,y,w,20,mix(c,.55),true);this.ct(n,GRADES[grade].name,w/2,10,w,18,12,true,deep(c,.62));return n;}
 private dots(g:Graphics,n:number,y:number,fill:Color){const gap=12,x0=-(n-1)*gap/2;g.fillColor=fill;for(let i=0;i<n;i++){g.circle(x0+i*gap,y,4);g.fill();}}
 private statText(it:Item){const lv=it.lv||0;return [it.main,...it.subs].map((a,i)=>fmtStat(a.k,a.v*(1+(i?ENHANCE.subPer:ENHANCE.mainPer)*lv)));}
 private ownerOf(id:number){const o=this.m.itemOwner(id);return o?PETS[o].name:'';}
 /** one equipment card: name, quality, main stat and every random sub-stat. Returns its height. */
 private itemCard(p:Node,cx:number,y:number,w:number,it:Item){const q=gradeColor(it.q),lines=this.statText(it),gl=it.gems.length?[`◇ 宝石孔 ${it.gems.filter(Boolean).length}/${it.gems.length}${it.gems.some(Boolean)?'：'+it.gems.filter(Boolean).map(gemLabel).join('、'):''}`]:[],h=70+(lines.length+gl.length)*20+(it.skills||[]).length*24+((it.skills||[]).length?6:0),set=setDef(it.set);
  const card=this.ui.rect(p,'item:'+it.id,cx,y+h/2,w,h,mix(q,.78),true);
  this.ui.rect(card,'qbar',9,h/2,8,h-14,col(q),false);this.kit.itemIcon(card,w-44,70,60,it);
  this.lt(card,itemName(it),24,22,230,28,20,true,deep(q,.55));
  this.gradeChip(card,w-44,22,it.q);
  this.lt(card,`${slotDef(it.slot).name} · ${set.name}套装 · 战力 ${itemPower(it)}`,24,46,w-40,18,12,true,deep(set.color,.6));
  lines.forEach((s,i)=>this.lt(card,(i?'· ':'◆ ')+s,24,72+i*20,w-50,18,i?13:14,i===0,i?C.ink:deep(q,.5)));
  gl.forEach((s,i)=>this.lt(card,s,24,72+(lines.length+i)*20,w-50,18,12,true,C.muted));
  this.skillRows(card,24,72+(lines.length+gl.length)*20+4,w-40,it);
  const o=this.ownerOf(it.id);if(o)this.ct(card,`${o}穿戴中`,w-64,h-12,110,16,11,true,C.red);
  return h;}
 /** equipment skills as icon badges with their text; returns the height used */
 skillRows(p:Node,x0:number,y:number,w:number,it:Item){(it.skills||[]).forEach((sk,i)=>{const d=itemSkillDef(sk.id);if(!d)return;const yy=y+i*24;this.kit.skillBadge(p,x0+9,yy,20,d.icon,d.color);
   this.lt(p,`${d.name}${d.tier===3?'·传说':''}`,x0+24,yy,60,18,13,true,deep(d.color,.6));this.lt(p,d.text(sk.v),x0+84,yy,w-90,18,12,false,C.ink);});return (it.skills||[]).length*24;}
 private compactRow(p:Node,cx:number,y:number,w:number,it:Item,sel:boolean,fn:()=>void){const q=gradeColor(it.q),r=this.ui.rect(p,'row:'+it.id,cx,y+22,w,44,sel?mix(q,.55):mix(q,.84),true);
  this.kit.itemIcon(r,22,22,38,it);
  this.lt(r,itemName(it),46,14,140,20,15,true,deep(q,.55));
  this.lt(r,`${GRADES[it.q].name} · 战力 ${itemPower(it)}`,46,32,150,16,11,true,C.muted);
  const o=this.ownerOf(it.id);this.ct(r,fmtStat(it.main.k,it.main.v),w-96,14,160,18,12,true,C.ink);
  this.ct(r,o?`${o}穿戴`:(it.skills||[]).length?(it.skills||[]).map(x=>itemSkillDef(x.id)?.name).join('·'):`+${it.subs.length} 词条`,w-96,32,160,16,11,true,o?C.red:(it.skills||[]).length?col([200,120,30]):C.muted);this.h.tap(r,fn);return 48;}
 private matsBar(p:Node,w:number,y:number){MATS.forEach((mt,i)=>{const cw=(w-36-18)/4,x=18+cw/2+i*(cw+6);const chip=this.ui.frame(p,'mat:'+mt.id,x,y+22,cw,44,'card');
   this.ui.rect(chip,'sw',18,22,14,14,col(MAT_COLOR[mt.id]),true);this.ct(chip,mt.name,cw/2+14,13,60,16,12,true,C.muted);this.ct(chip,String(this.m.mats[mt.id]),cw/2+14,30,60,18,15,true,C.ink);});return 48;}
 private pager(p:Node,w:number,y:number,page:number,pages:number,set:(n:number)=>void,again:()=>void){if(pages<=1)return 0;
  this.ui.btn(p,'prev','‹',w/2-70,y+20,52,38,()=>{set((page+pages-1)%pages);again();},'cream',22);this.ct(p,`${page+1} / ${pages}`,w/2,y+20,70,20,14,true,C.muted);
  this.ui.btn(p,'next','›',w/2+70,y+20,52,38,()=>{set((page+1)%pages);again();},'cream',22);return 44;}

 // ================================================================ 工坊: 打造 / 强化 / 分解
 openWorkshop(tab=this.wtab){this.wtab=tab;this.h.modal('工坊',(p,w)=>{let y=64;
  ['打造','开罐子','强化','分解'].forEach((t,i)=>{const tab=[0,3,1,2][i];this.ui.btn(p,'wt'+i,t,15+(w-30)/8+i*(w-30)/4,y+20,(w-30)/4-6,38,()=>{this.enhFx=null;this.jar=null;this.openWorkshop(tab);},this.wtab===tab?'gold':'cream',16);});y+=46;
  if(this.wtab!==3)y+=this.matsBar(p,w,y)+8;
  y=[()=>this.forgeTab(p,w,y),()=>this.enhanceTab(p,w,y),()=>this.dismantleTab(p,w,y),()=>this.jarTab(p,w,y)][this.wtab]();return y+8;},480);}
 private forgeTab(p:Node,w:number,y:number){const m=this.m;
  const cw=(w-36-18)/4;EQUIP_SLOTS.forEach((s,i)=>{const x=18+cw/2+(i%4)*(cw+6),yy=y+34+Math.floor(i/4)*72,sel=s.id===this.selSlot,ok=m.matsEnough(s.id);
   const cell=this.ui.frame(p,'slot:'+s.id,x,yy,cw,66,sel?'card-gold':'card');this.kit.slotIcon(cell,24,26,36,s.id);this.ct(cell,s.name,cw/2+16,22,cw-40,22,16,true,C.ink);
   this.ct(cell,matCost(s.cost),cw/2,50,cw,16,11,true,ok?C.muted:C.red);this.h.tap(cell,()=>{this.selSlot=s.id;this.openWorkshop(0);});});
  y+=2*72+6;const sd=slotDef(this.selSlot);
  this.ui.btn(p,'forge',`打造${sd.name}　${FORGE.coins}`,w/2,y+28,260,56,()=>{
   if(m.items.length>=FORGE.bagMax){this.h.say('背包已满，先分解一些装备',1.8);return;}
   if(m.coins<FORGE.coins){this.h.say(`金币不足，需要 ${FORGE.coins}`,1.6);return;}
   if(!m.matsEnough(this.selSlot)){this.h.say('材料不足，冒险获胜或分解装备可获得',1.8);return;}
   const it=m.forge(this.selSlot);if(!it)return;m.save();this.h.refresh();this.focus=it.id;
   this.h.say(`打造出 ${GRADES[it.q].name}「${itemName(it)}」${it.skills.length?`，带 ${it.skills.length} 个技能`:''}`,1.8);this.openWorkshop(0);},m.canForge(this.selSlot)?'green':'grey',21,'coin');y+=62;
  this.ct(p,`品质：凡 ${FORGE.weights[0]}%　良 ${FORGE.weights[1]}%　上 ${FORGE.weights[2]}%　极 ${FORGE.weights[3]}%　神 ${FORGE.weights[4]}%`,w/2,y+6,w-24,16,11,true,C.muted);
  this.ct(p,`技能：良品 1 个 · 上品 1 个(更强) · 极品 2 个 · 神品 2 个含传说技能　再打造 ${Math.max(0,FORGE.pityEvery-m.forgeSince)} 次内必出极品`,w/2,y+24,w-24,16,11,true,C.muted);y+=44;
  const it=m.items.find(i=>i.id===this.focus);
  if(it){const ch=this.itemCard(p,w/2,y,w-36,it);y+=ch+6;
   this.ui.btn(p,'to-enh','去强化',62,y+22,90,40,()=>{this.enhId=it.id;this.openWorkshop(1);},'cream',15,'hammer');
   this.lt(p,'穿戴给：',118,y+22,64,18,12,true,C.muted);
   m.deck.forEach((k,i)=>{const x=196+i*46,chip=this.ui.frame(p,'eqto:'+k,x,y+22,40,44,m.equip[k]?.[it.slot]===it.id?'card-gold':'card');this.h.sprite(chip,'pet:'+k,20,22,34,34);
    this.h.tap(chip,()=>{m.equipItem(k,it.id);m.save();this.h.say(`${PETS[k].name}穿上了${itemName(it)}`,1.6);this.openWorkshop(0);});});y+=50;}
  else{this.ct(p,'选一个部位，打造一件装备吧',w/2,y+24,w-30,20,14,true,C.muted);y+=52;}
  return y;}
 // ---------------------------------------------------------------- 强化
 private enhanceTab(p:Node,w:number,y:number){const m=this.m,it=m.items.find(i=>i.id===this.enhId)||null;
  const fx=this.enhFx;
  if(!it){ // pick a piece (or show the shattered one)
   if(fx&&fx.kind==='break'){const hh=96,card=this.ui.rect(p,'broken',w/2,y+hh/2,w-36,hh,col([90,84,80]),true);this.ct(card,'装备碎裂了…',(w-36)/2,hh/2-10,w-60,30,24,true,C.white);this.ct(card,'镶嵌的宝石已退回背包，返还了部分材料',(w-36)/2,hh/2+22,w-60,18,12,true,mix([90,84,80],.6));this.fxNode(p,w/2,y+hh/2);y+=hh+10;}
   this.ct(p,'选择要强化的装备（穿戴中的也可以）',w/2,y+10,w-30,18,13,true,C.muted);y+=26;
   const list=[...m.items].sort((a,b)=>(m.itemOwner(b.id)?1:0)-(m.itemOwner(a.id)?1:0)||b.q-a.q||(b.lv||0)-(a.lv||0)||itemPower(b)-itemPower(a)),per=6,pages=Math.max(1,Math.ceil(list.length/per));this.enhPage=Math.min(this.enhPage,pages-1);
   list.slice(this.enhPage*per,this.enhPage*per+per).forEach(i=>{y+=this.compactRow(p,w/2,y,w-36,i,false,()=>{this.enhId=i.id;this.enhFx=null;this.openWorkshop(1);});});
   if(!list.length){this.ct(p,'背包里没有装备，先去打造一件',w/2,y+14,w-30,18,14,true,C.muted);y+=36;}
   y+=this.pager(p,w,y,this.enhPage,pages,n=>{this.enhPage=n;},()=>this.openWorkshop(1));return y;}
  const inf=m.enhanceInfo(it.id,this.protect)!,q=gradeColor(it.q),lv=it.lv||0,max=lv>=ENHANCE.max;
  // the piece: name, level pips, main stat now -> next
  const hh=118,card=this.ui.rect(p,'enh',w/2,y+hh/2,w-36,hh,mix(q,.78),true);this.ui.rect(card,'qbar',9,hh/2,8,hh-14,col(q),false);this.kit.itemIcon(card,48,62,62,it);
  this.lt(card,itemName(it),86,22,w-200,28,21,true,deep(q,.55));this.gradeChip(card,w-36-44,22,it.q);
  const pg=this.ui.node(card,'pips',(w-36)/2+40,48,w-140,14).addComponent(Graphics);for(let i=0;i<ENHANCE.max;i++){const x=-(ENHANCE.max-1)*8+i*16;pg.fillColor=i<lv?(i>=9?new Color(240,120,60):new Color(255,196,64)):new Color(220,214,196);pg.circle(x,0,6);pg.fill();pg.strokeColor=new Color(42,26,18,160);pg.lineWidth=1.2;pg.circle(x,0,6);pg.stroke();}
  const now=it.main.v*(1+ENHANCE.mainPer*lv),next=it.main.v*(1+ENHANCE.mainPer*(lv+1));
  this.lt(card,`主属性 ${fmtStat(it.main.k,now)}`,86,76,170,20,15,true,C.ink);if(!max)this.lt(card,`→ ${fmtStat(it.main.k,next).replace(/^\S+ /,'')}（+${Math.round(ENHANCE.mainPer*100)}%）`,256,76,140,20,14,true,col([46,150,70]));
  this.lt(card,`副属性每级 +${Math.round(ENHANCE.subPer*100)}%　战力 ${itemPower(it)}${m.itemOwner(it.id)?'　'+this.ownerOf(it.id)+'穿戴中':''}`,86,98,w-140,16,12,true,C.muted);
  this.fxNode(p,w/2,y+hh/2);y+=hh+8;
  if(max){this.ct(p,'已经强化到满级 +15！',w/2,y+20,w-30,24,18,true,C.red);y+=44;}
  else{ // odds and risk
   const box=this.ui.frame(p,'odds',w/2,y+44,w-36,88,'card'),rate=Math.round(inf.rate*100),risk=this.protect?'失败无损失（已保护）':inf.brk>0?`失败会降 1 级，且有 ${Math.round(inf.brk*100)}% 几率碎裂！`:inf.drop?'失败会降 1 级':'失败没有损失';
   this.lt(box,'成功率',16,22,80,20,14,true,C.muted);this.h.bold(box,`${rate}%`,130,22,90,30,26,rate>=80?col([46,150,70]):rate>=50?col([220,140,30]):C.red,C.white,3);
   if(it.fails)this.lt(box,`（连续失败 ${it.fails} 次，+${Math.round(it.fails*ENHANCE.pityStep*100)}%）`,180,22,200,18,12,true,C.muted);
   this.lt(box,risk,16,48,w-70,18,13,true,inf.brk>0&&!this.protect?C.red:inf.drop&&!this.protect?col([200,120,30]):C.muted);
   const cost=[`金币 ${inf.cost.coins}`,...(Object.keys(inf.need) as MatId[]).map(k=>`${MATS.find(x=>x.id===k)!.name} ${inf.need[k]}/${m.mats[k]}`)].join('　');
   this.lt(box,`消耗：${cost}`,16,70,w-70,16,12,true,inf.coinsOk&&!inf.short.length?C.ink:C.red);y+=96;
   // protection
   if(inf.protectCost>0){const pr=this.ui.frame(p,'prot',w/2,y+22,w-36,44,this.protect?'card-gold':'card');const b=this.ui.frame(pr,'chk',24,22,26,26,'card');const ck=this.ui.icon(b,'check',13,11,24);ck.active=this.protect;
    this.lt(pr,`保护：额外消耗 灵晶 ${inf.protectCost}，失败不降级、不碎裂`,46,22,w-100,18,13,true,C.ink);this.h.tap(pr,()=>{this.protect=!this.protect;this.enhFx=null;this.openWorkshop(1);});y+=50;}
   this.ui.btn(p,'enh-go',`强化到 +${lv+1}`,w/2+60,y+30,220,58,()=>this.doEnhance(it.id),inf.can?'red':'grey',22,'hammer');}
  this.ui.btn(p,'enh-pick','换一件',max?w/2:76,y+30,110,48,()=>{this.enhId=null;this.enhFx=null;this.openWorkshop(1);},'cream',16);y+=66;
  this.ct(p,`+1~+5 必定成功　+6 起失败降级　+10 起失败可能碎裂　每级主属性 +${Math.round(ENHANCE.mainPer*100)}%`,w/2,y+6,w-24,16,11,true,C.muted);return y+22;}
 private doEnhance(id:number){const m=this.m,inf=m.enhanceInfo(id,this.protect);if(!inf)return;
  if(!inf.can){this.h.say(!inf.coinsOk?`金币不足，需要 ${inf.cost.coins}`:`材料不足：${inf.short.map(k=>MATS.find(x=>x.id===k)!.name).join('、')}`,1.6);return;}
  const name=itemName(inf.it),r=m.enhance(id,this.protect);if(!r)return;m.save();this.h.refresh();
  if(r.ok){this.enhFx={kind:'ok',t:0,g:null,label:null,parts:[]};this.h.say(`强化成功！${itemName(inf.it)}`,1.4);}
  else if(r.broke){this.enhId=null;this.enhFx={kind:'break',t:0,g:null,label:null,parts:[]};this.h.say(`${name} 碎裂了…`,2);}
  else if(r.dropped){this.enhFx={kind:'drop',t:0,g:null,label:null,parts:[]};this.h.say(`强化失败，降为 +${r.lv}`,1.6);}
  else{this.enhFx={kind:'fail',t:0,g:null,label:null,parts:[]};this.h.say('强化失败',1.2);}
  this.openWorkshop(1);}
 /** the result effect sits over the item card and is animated by update() */
 private fxNode(p:Node,x:number,y:number){const fx=this.enhFx;if(!fx||fx.t>1.6)return;const n=this.ui.node(p,'enhfx',x,y,400,200);fx.g=n.addComponent(Graphics);
  const txt={ok:'强化成功！',fail:'失败',drop:'失败 · 降级',break:'碎裂！'}[fx.kind],c={ok:new Color(255,200,60),fail:new Color(150,150,140),drop:new Color(240,140,50),break:new Color(230,70,60)}[fx.kind];
  const l=this.h.bold(n,txt,200,100,360,50,fx.kind==='ok'?36:30,c,C.white,4) as Label;fx.label=l.node;
  if(!fx.parts.length){const k=fx.kind==='ok'?26:fx.kind==='break'?22:0;for(let i=0;i<k;i++){const a=Math.random()*Math.PI*2,v=120+Math.random()*220;fx.parts.push({x:0,y:0,vx:Math.cos(a)*v,vy:Math.sin(a)*v+(fx.kind==='break'?-80:60),c:fx.kind==='ok'?(i%3?new Color(255,214,80):new Color(255,255,255)):new Color(120+Math.random()*60,110,100),s:fx.kind==='break'?6+Math.random()*8:3+Math.random()*4});}}}
 private updateEnhFx(dt:number){const fx=this.enhFx;if(!fx||!fx.g||!fx.g.node?.isValid)return;fx.t+=dt;const g=fx.g,t=fx.t;g.clear();
  if(t>1.6){if(fx.label?.isValid)fx.label.active=false;return;}
  const a=Math.max(0,1-t/1.6);
  if(fx.kind==='ok'){g.fillColor=new Color(255,236,150,Math.round(140*Math.max(0,1-t*2)));g.roundRect(-200,-60,400,120,16);g.fill();g.strokeColor=new Color(255,200,60,Math.round(255*a));g.lineWidth=4;g.circle(0,0,40+t*160);g.stroke();}
  if(fx.kind==='break'){g.strokeColor=new Color(42,26,18,Math.round(255*a));g.lineWidth=3;const cr=[[-60,-30,0,10],[0,10,50,-40],[0,10,20,50],[-30,-5,-80,30]];for(const [x1,y1,x2,y2] of cr){g.moveTo(x1,y1);g.lineTo(x2,y2);}g.stroke();}
  if(fx.kind==='fail'||fx.kind==='drop'){g.fillColor=new Color(60,56,52,Math.round(90*a));g.roundRect(-200,-60,400,120,16);g.fill();}
  for(const q of fx.parts){const px=q.vx*t,py=q.vy*t-260*t*t;g.fillColor=new Color(q.c.r,q.c.g,q.c.b,Math.round(255*a));if(fx.kind==='break'){g.moveTo(px,py+q.s);g.lineTo(px+q.s*.7,py);g.lineTo(px,py-q.s);g.lineTo(px-q.s*.6,py);g.close();g.fill();}else{g.circle(px,py,q.s);g.fill();}}
  if(fx.label?.isValid){const k=t<.15?.6+t/.15*.5:t<.3?1.1-(t-.15)/.15*.1:1;fx.label.setScale(k,k,1);fx.label.setPosition(fx.kind==='fail'||fx.kind==='drop'?Math.sin(t*40)*Math.max(0,6-t*12):0,t*20,0);}}
 // ---------------------------------------------------------------- 开罐子 (DNF 式: 罐子抖一抖，装备滚动停下)
 private drawJar(g:Graphics,c:ArrayLike<number>,s:number,glow=0){const u=s/2,ink=new Color(42,26,18,255),base=col(c),dark=deep(c,.62),light=mix(c,.45);
  if(glow>0){g.fillColor=new Color(255,236,150,Math.round(90*glow));g.circle(0,0,u*1.05);g.fill();}
  const body:[number,number][]=[];for(let i=0;i<=20;i++){const a=Math.PI*(.25+1.5*i/20)+Math.PI/2;body.push([Math.cos(a)*u*.72,-u*.12+Math.sin(a)*u*.62]);}
  const pts:[number,number][]=[[-u*.3,u*.42],...body.reverse(),[u*.3,u*.42]];
  g.fillColor=base;g.moveTo(pts[0][0],pts[0][1]);for(const q of pts.slice(1))g.lineTo(q[0],q[1]);g.close();g.fill();
  g.fillColor=dark;g.ellipse(0,-u*.62,u*.5,u*.12);g.fill();
  g.strokeColor=ink;g.lineWidth=2.5;g.moveTo(pts[0][0],pts[0][1]);for(const q of pts.slice(1))g.lineTo(q[0],q[1]);g.close();g.stroke();
  g.fillColor=light;g.ellipse(-u*.3,-u*.02,u*.12,u*.26);g.fill();
  g.strokeColor=dark;g.lineWidth=3;g.moveTo(-u*.66,-u*.1);g.lineTo(u*.66,-u*.1);g.stroke();
  g.fillColor=dark;g.roundRect(-u*.38,u*.4,u*.76,u*.16,u*.06);g.fill();g.strokeColor=ink;g.lineWidth=2.5;g.roundRect(-u*.38,u*.4,u*.76,u*.16,u*.06);g.stroke();
  g.fillColor=base;g.ellipse(0,u*.62,u*.32,u*.1);g.fill();g.strokeColor=ink;g.ellipse(0,u*.62,u*.32,u*.1);g.stroke();g.fillColor=mix(c,.2);g.circle(0,u*.74,u*.08);g.fill();g.strokeColor=ink;g.circle(0,u*.74,u*.08);g.stroke();}
 private jarTab(p:Node,w:number,y:number){const m=this.m,J=this.jar;
  if(J){y=this.jarResult(p,w,y);return y;}
  this.ct(p,`当前金币 ${m.coins.toLocaleString('en-US')}　背包 ${m.items.length}/${FORGE.bagMax}`,w/2,y+10,w-30,18,13,true,C.ink);y+=26;
  const cw=(w-30-12)/3,ch=268;
  JARS.forEach((j,i)=>{const x=15+cw/2+i*(cw+6),card=this.ui.frame(p,'jar'+j.id,x,y+ch/2,cw,ch,i===2?'card-gold':'card');
   const g=this.ui.node(card,'pot',cw/2,72,110,110).addComponent(Graphics);this.drawJar(g,j.color,100,i===2?1:0);
   this.h.bold(card,j.name,cw/2,138,cw,26,19,deep(j.color,.55),C.white,3);this.ct(card,j.desc,cw/2,160,cw-8,16,11,true,C.muted);
   this.ct(card,j.pity?`再开 ${m.jarPityLeft(j.id)} 次必出${GRADES[j.pity.grade].name}`:'无保底',cw/2,178,cw-6,16,11,true,j.pity?C.red:C.muted);
   const can1=m.coins>=m.jarPrice(j.id,1),can10=m.coins>=m.jarPrice(j.id,10);
   this.ui.btn(card,'j1'+j.id,`开1次 ${fmtK(j.coins)}`,cw/2,206,cw-12,38,()=>this.openJar(j.id,1),can1?'green':'grey',13,'coin');
   this.ui.btn(card,'j10'+j.id,`开10次 ${fmtK(j.coins*JAR_TEN)}`,cw/2,248,cw-12,38,()=>this.openJar(j.id,10),can10?'gold':'grey',13);});
  y+=ch+8;
  this.ct(p,'罐子随机开出 8 个部位的装备，品质越高技能越多　10 连只收 9 次的钱',w/2,y+8,w-24,16,11,true,C.muted);y+=22;
  this.ui.btn(p,'jarodds','概率公示',w/2,y+22,150,40,()=>this.jarOdds(),'cream',15);return y+48;}
 private openJar(id:string,n:number){const m=this.m,r=m.openJar(id,n);
  if('error' in r){this.h.say(r.error==='coins'?`金币不足，需要 ${m.jarPrice(id,n).toLocaleString('en-US')}`:r.error==='bag'?`背包放不下（还剩 ${FORGE.bagMax-m.items.length} 格），先分解一些装备`:'',1.8);return;}
  m.save();this.h.refresh();this.jar={id,items:r.items,t:0,strip:null,tiles:[],fx:null,shown:0,card:null,done:false};this.openWorkshop(3);}
 private jarResult(p:Node,w:number,y:number){const J=this.jar!,j=jarDef(J.id)!,m=this.m,single=J.items.length===1;
  this.h.bold(p,`${j.name} · ${single?'开 1 次':'开 10 次'}`,w/2,y+14,w-30,26,19,deep(j.color,.55),C.white,3);y+=34;
  if(single){const it=J.items[0],SP=84,N=34,FIN=28,sw=w-40;
   const win=this.ui.rect(p,'win',w/2,y+52,sw+8,104,col([70,46,28]),true);const mask=this.ui.node(p,'mask',w/2,y+52,sw,96);mask.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
   this.ui.rect(p,'winbg',w/2,y+52,sw,96,col([255,246,222]),false).setSiblingIndex(mask.getSiblingIndex());
   const strip=this.ui.node(mask,'strip',sw/2,48,SP*N,96);for(let i=0;i<N;i++){const fake=i===FIN?it:{slot:EQUIP_SLOTS[Math.floor(Math.random()*8)].id,set:SETS[Math.floor(Math.random()*SETS.length)].id,q:rollJarQuality(j,Math.random),lv:0};this.kit.itemIcon(strip,SP*N/2+(i-N/2)*SP+SP/2,48,72,fake as any);}
   J.strip=strip;(strip as any).__x0=SP*N/2-SP/2-(0)*SP;(strip as any).__fin=FIN;(strip as any).__sp=SP;(strip as any).__n=N;
   const mk=this.ui.node(p,'marker',w/2,y+52,sw,110).addComponent(Graphics);mk.strokeColor=C.red;mk.lineWidth=3;mk.moveTo(-42,-50);mk.lineTo(-42,50);mk.moveTo(42,-50);mk.lineTo(42,50);mk.stroke();mk.fillColor=C.red;mk.moveTo(-8,58);mk.lineTo(8,58);mk.lineTo(0,46);mk.close();mk.fill();
   J.fx=this.ui.node(p,'jfx',w/2,y+52,sw,110).addComponent(Graphics);y+=112;
   const card=this.ui.node(p,'res',w/2,y,w,10);J.card=card;const ch=this.itemCard(card,w/2,0,w-36,it);card.active=J.done;y+=ch+8;}
  else{const cols=5,ts=74,gap=10;J.tiles=[];J.items.forEach((it,i)=>{const x=w/2+(i%cols-(cols-1)/2)*(ts+gap),yy=y+ts/2+Math.floor(i/cols)*(ts+28);
    const hide=this.ui.rect(p,'q'+i,x,yy,ts,ts,col([126,88,54]),true);this.ct(hide,'?',ts/2,ts/2,ts,ts,34,true,col([255,236,190]));
    const ic=this.kit.itemIcon(p,x,yy,ts,it);const nm=this.ct(p,itemName(it),x,yy+ts/2+11,ts+10,16,10,true,deep(gradeColor(it.q),.55)).node;
    const show=i<J.shown;hide.active=!show;ic.active=show;nm.active=show;J.tiles.push(hide,ic,nm);});
   J.fx=this.ui.node(p,'jfx',w/2,y+80,w,200).addComponent(Graphics);y+=2*(ts+28)+6;
   const cnt=[0,0,0,0,0];for(const it of J.items)cnt[it.q]++;const sum=cnt.map((n,q)=>n?`${GRADES[q].name}×${n}`:'').filter(Boolean).join('　');const sl=this.ct(p,sum,w/2,y+8,w-30,18,14,true,C.ink);sl.node.active=J.done;J.card=sl.node;y+=26;}
  const again=()=>{this.jar=null;this.openJar(J.id,J.items.length);};
  this.ui.btn(p,'jagain',single?`再开 1 次`:`再开 10 次`,w/2-120,y+26,150,46,again,m.coins>=m.jarPrice(J.id,J.items.length)?'green':'grey',16);
  this.ui.btn(p,'jenh','去强化',w/2+40,y+26,110,46,()=>{const best=[...J.items].sort((a,b)=>b.q-a.q)[0];this.jar=null;this.enhId=best?.id??null;this.openWorkshop(1);},'cream',16,'hammer');
  this.ui.btn(p,'jback','返回',w/2+160,y+26,90,46,()=>{this.jar=null;this.openWorkshop(3);},'cream',16);
  this.h.tap(this.ui.node(p,'skip',w/2,y-120,w,200),()=>{if(this.jar&&!this.jar.done)this.jar.t+=9;});
  return y+56;}
 private updateJar(dt:number){const J=this.jar;if(!J||J.done||!J.fx||!J.fx.node?.isValid)return;J.t+=dt;const g=J.fx;g.clear();
  if(J.items.length===1){const s=J.strip!,T=2.6,k=Math.min(1,J.t/T),e=1-Math.pow(1-k,3),sp=(s as any).__sp,fin=(s as any).__fin,n=(s as any).__n;
   // icon i sits at local x = (i-n/2)*sp+sp/2 (strip centred); bring icon fin to the centre
   const target=-((fin-n/2)*sp+sp/2);s.setPosition(target*e+(1-e)*(sp*6),0,0);
   if(k>=1){J.done=true;const q=J.items[0].q;g.fillColor=new Color(...(gradeColor(q) as [number,number,number]),120);g.circle(0,0,60);g.fill();if(J.card)J.card.active=true;if(q>=3)this.h.say(q>=4?'神品出货！':'极品！',1.6);}}
  else{const step=.22,n=Math.min(J.items.length,Math.floor(J.t/step)+1);while(J.shown<n){const i=J.shown++;J.tiles[i*3].active=false;J.tiles[i*3+1].active=true;J.tiles[i*3+2].active=true;const ic=J.tiles[i*3+1];ic.setScale(.3,.3,1);tween(ic).to(.15,{scale:new Vec3(1.15,1.15,1)}).to(.08,{scale:new Vec3(1,1,1)}).start();}
   if(J.shown>=J.items.length&&J.t>J.items.length*step+.3){J.done=true;if(J.card)J.card.active=true;const best=Math.max(...J.items.map(i=>i.q));if(best>=3)this.h.say(best>=4?'神品出货！':'出了极品！',1.6);}}}
 private jarOdds(){this.h.modal('罐子概率公示',(p,w)=>{let y=70;
  JARS.forEach(j=>{const t=j.weights.reduce((a,b)=>a+b,0);this.h.bold(p,`${j.name}　${j.coins.toLocaleString('en-US')} 金币`,w/2,y+10,w-30,24,17,deep(j.color,.55),C.white,3);y+=30;
   const cells=j.weights.map((v,q)=>v?`${GRADES[q].name} ${(v/t*100).toFixed(1)}%`:'').filter(Boolean);this.ct(p,cells.join('　'),w/2,y+8,w-24,18,13,true,C.ink);y+=22;
   this.ct(p,j.pity?`保底：连续 ${j.pity.every} 次没出${GRADES[j.pity.grade].name}或以上，第 ${j.pity.every} 次必出`:'无保底',w/2,y+8,w-24,16,11,true,C.muted);y+=28;});
  this.ct(p,'部位在 8 个部位中等概率随机；套装、属性和技能随机生成，规则与工坊打造相同',w/2,y+8,w-24,30,11,false,C.muted);y+=36;
  this.ui.btn(p,'oback','返回',w/2,y+24,140,44,()=>this.openWorkshop(3),'cream',16);return y+56;},460);}
 // ---------------------------------------------------------------- 分解
 private dismantleTab(p:Node,w:number,y:number){const m=this.m;
  this.ct(p,'分解返还材料和金币；镶嵌的宝石退回背包；穿戴中的装备不能分解',w/2,y+10,w-24,16,12,true,C.muted);y+=26;
  const list=[...m.items].sort((a,b)=>a.q-b.q||(a.lv||0)-(b.lv||0)||itemPower(a)-itemPower(b)),per=7,pages=Math.max(1,Math.ceil(list.length/per));this.disPage=Math.min(this.disPage,pages-1);
  this.lt(p,`背包 ${m.items.length}/${FORGE.bagMax}`,24,y+14,140,20,14,true,C.ink);y+=30;
  list.slice(this.disPage*per,this.disPage*per+per).forEach(i=>{const o=this.ownerOf(i.id);y+=this.compactRow(p,w/2-40,y,w-116,i,false,()=>{this.focus=i.id;this.openWorkshop(0);});
   this.ui.btn(p,'dz'+i.id,o?'穿戴中':'分解',w-58,y-22,76,38,()=>{const r=m.dismantle(i.id);if(!r){this.h.say('穿戴中的装备不能分解',1.4);return;}m.save();this.h.refresh();this.h.say(`分解获得 ${r.coins} 金币${r.gems.length?'，宝石已退回':''}`,1.6);this.openWorkshop(2);},o?'grey':'cream',15);});
  if(!list.length){this.ct(p,'（背包是空的）',w/2,y+12,160,18,13,false,C.muted);y+=28;}
  y+=this.pager(p,w,y,this.disPage,pages,n=>{this.disPage=n;},()=>this.openWorkshop(2));
  const bulk=(maxQ:number,label:string)=>{let n=0,c=0;for(const i of [...m.items])if(i.q<=maxQ&&!(i.lv>0)&&!m.itemOwner(i.id)){const r=m.dismantle(i.id);if(r){n++;c+=r.coins;}}
   if(!n){this.h.say(`没有可分解的${label}`,1.4);return;}m.save();this.h.refresh();this.h.say(`分解了 ${n} 件，获得 ${c} 金币和材料`,1.8);this.openWorkshop(2);};
  this.ui.btn(p,'bulk1','一键分解凡品·良品',w/2-110,y+26,200,44,()=>bulk(1,'凡品/良品'),'cream',14);
  this.ui.btn(p,'bulk2','一键分解上品及以下',w/2+110,y+26,200,44,()=>bulk(2,'上品及以下'),'cream',14);
  this.ct(p,'一键分解会跳过已强化或穿戴中的装备',w/2,y+58,w-24,16,11,true,C.muted);return y+70;}

 // ================================================================ 宠物界面 (PetUI)
 openPet(){this.pet.openPet();}
 openPetDetail(kind:string){this.pet.openPetDetail(kind);}

 // ================================================================ 放养所
 openRanch(){const m=this.m;this.h.modal('放养所',(p,w)=>{const pend=m.ranchPending(),rate=m.ranchRates();
  this.ct(p,`把备用的同种宠物放出去玩，最多 ${RANCH.slots} 只，品级越高带回越多（上限 8 小时）`,w/2,86,w-40,36,13,false,C.muted);
  const bw=w-80;this.ui.bar(p,w/2,134,bw,16,pend.seconds/RANCH.capSeconds,pend.full?C.red:C.cyan);
  this.h.bold(p,m.ranch.length?(pend.full?'已满仓':`已放养 ${Math.floor(pend.seconds/3600)}小时${Math.floor(pend.seconds%3600/60)}分`):'还没有放养的宠物',w/2,142,bw,16,12,C.white,C.ink,2.5);
  this.ct(p,`+${pend.coins} 金币　+${pend.food} 经验果　（每小时 ${Math.round(rate.coins)} / ${rate.food.toFixed(1)}）`,w/2,176,w-30,20,14,true,C.ink);
  const ok=pend.coins>0||pend.food>0;
  this.ui.btn(p,'collect',ok?'收取':'还没有产出',w/2,222,200,48,()=>{const got=m.collectRanch();if(got){m.save();this.h.refresh();this.openRanch();this.h.reward('放养收益',{b:{coins:got.coins,food:got.food}});}},ok?'green':'grey',19);
  let y=258;const sp=m.spares(),per=5,pages=Math.max(1,Math.ceil(sp.length/per));this.ranchPage=Math.min(this.ranchPage,pages-1);
  this.lt(p,`备用个体 ${sp.length}`,26,y+12,200,20,14,true,C.ink);y+=28;
  sp.slice(this.ranchPage*per,this.ranchPage*per+per).forEach(c=>{const gcol=gradeColor(c.grade),on=m.ranch.includes(c.id),r=this.ui.rect(p,'sp'+c.id,w/2,y+28,w-36,56,on?mix(gcol,.45):mix(gcol,.85),true);
   this.h.sprite(r,'pet:'+c.kind,36,28,44,44);this.lt(r,PETS[c.kind].name,68,16,110,20,15,true,C.ink);this.gradeChip(r,92,40,c.grade,48);
   const rel=Math.round(HATCH.dupCoins[PETS[c.kind].rarity]*(1+.5*c.grade));
   this.ui.btn(r,'rn'+c.id,on?'召回':'放养',w-36-142,28,62,34,()=>{if(m.toggleRanch(c.id)){m.save();this.openRanch();}else this.h.say(`放养位已满（${RANCH.slots} 只）`,1.4);},on?'grey':'green',14);
   this.ui.btn(r,'rl'+c.id,`放生 ${rel}`,w-36-52,28,88,34,()=>{const g=m.releaseSpare(c.id);m.save();this.h.refresh();this.h.say(`放生了，换得 ${g} 金币`,1.6);this.openRanch();},'cream',12);y+=60;});
  if(!sp.length){this.ct(p,'孵出同一只宠物的第二个个体，就能放养了',w/2,y+14,w-30,20,13,true,C.muted);y+=40;}
  y+=this.pager(p,w,y,this.ranchPage,pages,n=>{this.ranchPage=n;},()=>this.openRanch());
  this.ui.btn(p,'back','返回宠物',w/2,y+26,160,42,()=>this.openPet(),'cream',16);return y+58;},460);}

 // ================================================================ 孵化屋：老虎机
 private shell(g:Graphics,grade:number){g.clear();const c=grade<0?[96,96,92]:gradeColor(grade),base=col(c),dark=deep(c,.55),light=mix(c,.4);
  g.fillColor=dark;g.roundRect(-46,-52,92,104,18);g.fill();g.fillColor=base;g.roundRect(-42,-48,84,96,14);g.fill();
  g.fillColor=light;g.roundRect(-42,10,84,38,14);g.fill();g.fillColor=base;g.rect(-42,10,84,6);g.fill();
  g.strokeColor=dark;g.lineWidth=3;g.moveTo(-42,10);g.lineTo(42,10);g.stroke();
  g.fillColor=new Color(255,250,228);g.circle(0,10,7);g.fill();g.strokeColor=dark;g.lineWidth=2.5;g.circle(0,10,7);g.stroke();
  g.fillColor=new Color(255,255,255,70);g.ellipse(-22,32,9,5);g.fill();
  if(grade>=0)this.dots(g,grade+1,-38,new Color(255,236,150));}
 private front(g:Graphics,grade:number){g.clear();const c=gradeColor(grade);g.fillColor=mix(c,.2);g.roundRect(-50,-56,100,112,18);g.fill();g.fillColor=new Color(255,252,238);g.roundRect(-44,-50,88,100,14);g.fill();
  g.strokeColor=col(c);g.lineWidth=5;g.roundRect(-44,-50,88,100,14);g.stroke();this.dots(g,grade+1,-40,col(c));}

 /** results (already rolled and saved by the model) are played back as slot reels: closed shells with a visible 品级 scroll by, stop, then open */
 openHatchery(results?:HatchResult[]){const m=this.m;this.spin=null;this.h.modal('孵化屋',(p,w)=>{this.spin=null;
  const mt=64,mh=250,cy=mt+mh/2,wy=cy+8,ww=118,wh=150,n=results?.length||0;
  this.ui.rect(p,'Machine',w/2,cy,w-30,mh,col([104,70,42]),true);this.ui.rect(p,'MachineIn',w/2,cy,w-48,mh-16,col([126,88,54]),false);
  this.h.bold(p,'宠物蛋抽奖机',w/2,mt+22,220,26,20,C.white,C.ink,3);
  const used=n===1?[1]:n===3?[0,1,2]:[];const reels:Reel[]=[];
  for(let i=0;i<3;i++){const cx=w/2+(i-1)*134;this.ui.rect(p,'Win'+i,cx,wy,ww+8,wh+8,col([70,46,28]),false);this.ui.rect(p,'WinBg'+i,cx,wy,ww,wh,col([255,246,222]),false);
   const node=this.ui.node(p,'Reel'+i,cx,wy,ww,wh);node.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
   const r:Reel={cx,node,tiles:[],cellOf:[],gradeOf:[],cells:[],s:0,T:0,delay:0,dur:0,state:'idle',stopAt:0,flipT:0,res:null,label:null,tag:null,center:null};
   for(let c=0;c<STRIP;c++){const rr=Math.random();r.cells.push(rr<.5?0:rr<.78?1:rr<.92?2:rr<.98?3:4);}
   const locked=n>0&&!used.includes(i);
   for(let k=0;k<5;k++){const t=new Node('tile'+k);node.addChild(t);t.layer=node.layer;t.addComponent(UITransform).setContentSize(92,104);t.addComponent(Graphics);r.tiles.push(t);r.cellOf.push(-999);r.gradeOf.push(-2);
    const q=this.ui.label(t,'?',46,52,60,60,40,true,col([255,250,228]));q.name='qm';}
   const ui=used.indexOf(i);
   if(ui>=0&&results){const res=results[ui];r.res=res;r.T=18+ui*3;r.cells[r.T%STRIP]=res.grade;r.delay=.25*ui;r.dur=2.1+.75*ui;r.state='spin';}
   this.layoutReel(r,locked);reels.push(r);}
  const fx=this.ui.node(p,'FX',w/2,wy,w,mh);const fxg=fx.addComponent(Graphics);
  const lamps=this.ui.node(p,'Lamps',w/2,cy,w,mh);const lg=lamps.addComponent(Graphics);
  this.ui.rect(p,'PayL',31,wy,12,24,col([244,200,60]),true);this.ui.rect(p,'PayR',w-31,wy,12,24,col([244,200,60]),true);
  // names appear under each reel once its shell has opened
  const ry=mt+mh+24;
  for(const [ri,r] of reels.entries()){if(!r.res)continue;
   const nm=this.ui.node(p,'Name'+ri,r.cx,ry,130,24);this.ct(nm,PETS[r.res.kind].name,65,12,130,24,17,true,deep(gradeColor(r.res.grade),.62));nm.active=false;r.label=nm;
   const tg=r.res.isNew?'新伙伴加入！':r.res.upgraded?'品级更高，成为主力':'备用个体·可放养';const tn=this.ui.node(p,'Tag'+ri,r.cx,ry+22,130,20);this.ct(tn,tg,65,10,130,20,12,true,r.res.isNew||r.res.upgraded?C.red:C.muted);tn.active=false;r.tag=tn;}
  if(results&&results.length){this.spin={reels,t:0,done:false,fx:fxg,parts:[],lamps:lg};
   this.h.tap(this.ui.node(p,'SkipArea',w/2,wy,w-30,wh),()=>{if(this.spin&&!this.spin.done)this.spin.t+=3;});}
  else this.spin={reels,t:0,done:true,fx:fxg,parts:[],lamps:lg};
  let y=ry+(results?.length?52:4);
  const pull=(k:number,free=false)=>{if(this.spin&&!this.spin.done){this.h.say('抽奖进行中…点击机器可加速',1.2);return;}if(!free&&m.food<m.hatchCost()*k){this.h.say(`食物不足，需要 ${m.hatchCost()*k}`,1.6);return;}
   const out:HatchResult[]=[];for(let i=0;i<k;i++){const r=m.hatch(Math.random,free);if(r)out.push(r);}m.save();this.h.refresh();this.openHatchery(out);};
  const free=m.freeHatchReady();
  if(free)this.ui.btn(p,'hatch1','今日免费',w/2-100,y+28,190,54,()=>pull(1,true),'green',20,'egg');
  else this.ui.btn(p,'hatch1',`单抽　${m.hatchCost()}`,w/2-100,y+28,190,54,()=>pull(1),m.food>=m.hatchCost()?'green':'grey',20,'food');
  this.ui.btn(p,'hatch3',`三连　${m.hatchCost()*3}`,w/2+100,y+28,190,54,()=>pull(3),m.food>=m.hatchCost()*3?'gold':'grey',20,'food');y+=66;
  // 看广告免费孵化 (a couple a day)
  if(Ads.available('hatch')&&m.adLeft('hatch')>0){this.ui.btn(p,'hatch-ad',`看广告免费孵化（今日剩 ${m.adLeft('hatch')} 次）`,w/2,y+22,300,42,()=>{if(this.spin&&!this.spin.done)return;this.h.say('广告播放中…',1.2);
   Ads.rewarded('hatch').then(ok=>{if(!ok){this.h.say('广告没有看完',1.4);return;}const r=m.adHatch();if(r){m.save();this.h.refresh();this.openHatchery([r]);}});},'gold',16,'egg');y+=52;}
  this.ct(p,`现有食物 ${m.food}　已孵化 ${m.hatchCount} 次　再孵 ${Math.max(0,HATCH.pityEvery-m.hatchSinceRare)} 次内必出上品以上`,w/2,y+4,w-24,18,12,true,C.muted);y+=24;
  ['common','fine','rare','epic','legend'].forEach((k,i)=>{const x=w/2+(i-2)*84,c=gradeColor(i);const chip=this.ui.rect(p,'lg'+i,x,y+14,76,26,mix(c,.55),true);this.ct(chip,`${GRADES[i].name} ${pct(HATCH.weights[k])}%`,38,13,76,22,11,true,deep(c,.55));});y+=38;
  this.ct(p,'品级决定宠物的基础强度和天赋数量；同种宠物多出的个体可以去放养所挂机',w/2,y+4,w-24,16,11,false,C.muted);y+=24;
  this.ui.btn(p,'odds','概率公示',w/2-90,y+22,150,40,()=>this.openHatchInfo(0),'cream',15);this.ui.btn(p,'hlog','孵化记录',w/2+90,y+22,150,40,()=>this.openHatchInfo(1),'cream',15);y+=50;
  return y;},MW);}
 /** 概率公示 (required for any random draw before release) and the last 20 hatches */
 openHatchInfo(tab:number){const m=this.m;this.h.modal(tab===0?'概率公示':'孵化记录',(p,w)=>{let y=70;
  if(tab===0){const order=['common','fine','rare','epic','legend'],gt=order.reduce((a,k)=>a+HATCH.weights[k],0);
   this.ct(p,'宠物蛋品级概率（每次孵化独立计算）',w/2,y+8,w-30,18,14,true,C.ink);y+=26;
   order.forEach((k,i)=>{const c=gradeColor(i),row=this.ui.rect(p,'g'+i,w/2,y+14,w-40,26,mix(c,.8),true);this.ct(row,GRADES[i].name,60,13,100,20,14,true,deep(c,.55));this.ct(row,`${(HATCH.weights[k]/gt*100).toFixed(2)}%`,w-40-70,13,100,20,14,true,C.ink);y+=30;});
   this.ct(p,`保底：连续 ${HATCH.pityEvery} 次没有出上品或更高，第 ${HATCH.pityEvery} 次必出上品及以上（凡品、良品概率归零后按比例分配）`,w/2,y+14,w-30,30,11,false,C.muted);y+=40;
   this.ct(p,'宠物种类概率',w/2,y+8,w-30,18,14,true,C.ink);y+=26;
   const pool=order.filter(x=>Object.keys(PETS).some(k=>PETS[k].rarity===x)),pt=pool.reduce((a,x)=>a+HATCH.weights[x],0);
   const kinds=Object.keys(PETS).sort((a,b)=>pool.indexOf(PETS[a].rarity)-pool.indexOf(PETS[b].rarity));
   kinds.forEach((k,i)=>{const n=Object.keys(PETS).filter(x=>PETS[x].rarity===PETS[k].rarity).length,pr=HATCH.weights[PETS[k].rarity]/pt/n*100,cx=i%2?w*3/4:w/4,row=this.ui.rect(p,'pk'+k,cx,y+14+Math.floor(i/2)*30,w/2-24,26,col([250,244,228]),true);
    this.ct(row,PETS[k].name,60,13,110,20,13,true);this.ct(row,`${pr.toFixed(2)}%`,(w/2-24)-46,13,80,20,13,true,C.muted);});y+=Math.ceil(kinds.length/2)*30+8;
   this.ct(p,'品级与宠物种类分别独立抽取。重复获得的宠物成为备用个体，可放养或合成更高品级。',w/2,y+14,w-30,30,11,false,C.muted);y+=36;}
  else{if(!m.hatchLog.length){this.ct(p,'还没有孵化记录',w/2,y+30,w-30,20,15,true,C.muted);y+=60;}
   m.hatchLog.slice(0,14).forEach((r,i)=>{const c=gradeColor(r.grade),row=this.ui.rect(p,'hl'+i,w/2,y+16,w-40,30,mix(c,.82),true);this.h.sprite(row,'pet:'+r.kind,22,15,26,26);this.ct(row,PETS[r.kind].name,100,15,110,20,14,true);
    this.ct(row,GRADES[r.grade].name,220,15,80,20,14,true,deep(c,.55));const d=new Date(r.at);this.ct(row,`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,w-40-70,15,120,18,12,true,C.muted);y+=34;});}
  this.ui.btn(p,'hback','返回孵化屋',w/2,y+28,180,46,()=>this.openHatchery(),'cream',17);return y+62;},MW);}

 private layoutReel(r:Reel,locked=false){const n=Math.floor(r.s);r.tiles.forEach((t,k)=>{const c=n-1+k;t.setPosition(0,(c-r.s)*PITCH,0);
  const g=locked?-1:r.cells[((c%STRIP)+STRIP)%STRIP];if(r.cellOf[k]!==c||r.gradeOf[k]!==g){r.cellOf[k]=c;r.gradeOf[k]=g;this.shell(t.getComponent(Graphics)!,g);const q=t.getChildByName('qm');if(q)q.active=true;}});}

 update(dt:number){this.pet.update(dt);this.adv.update(dt);this.updateEnhFx(dt);this.updateJar(dt);const sp=this.spin;if(!sp)return;this.lampT+=dt;
  // marquee lamps
  const rate=sp.done?2:8,lg=sp.lamps;if(lg&&lg.node?.isValid&&Math.floor(this.lampT*rate)!==Math.floor((this.lampT-dt)*rate)){lg.clear();const ph=Math.floor(this.lampT*rate),W=430,Hh=250;
   for(let i=0;i<14;i++){const x=-W/2+14+i*(W-28)/13;for(const yy of [Hh/2-9,-Hh/2+9]){lg.fillColor=(i+ph)%2?new Color(255,226,120):new Color(150,100,60);lg.circle(x,yy,4);lg.fill();}}}
  if(sp.done&&!sp.parts.length)return;
  sp.t+=dt;let allOpen=true;
  for(const r of sp.reels){const res=r.res;if(!res||!r.node?.isValid)continue;
   if(r.state==='spin'){const u=Math.max(0,Math.min(1,(sp.t-r.delay)/r.dur));let s:number;if(u<.88){const v=u/.88;s=(r.T+.2)*(1-Math.pow(1-v,3));}else{const v=(u-.88)/.12;s=r.T+.2-.2*(v*v*(3-2*v));}
    r.s=u>=1?r.T:s;this.layoutReel(r);if(u>=1){r.state='stopped';r.stopAt=sp.t;}}
   if(r.state==='stopped'&&sp.t-r.stopAt>.4){r.state='flip';r.flipT=0;r.center=r.tiles.find((_,k)=>r.cellOf[k]===r.T)||null;}
   if(r.state==='flip'){const c=r.center;if(!c||!c.isValid){r.state='open';}else{const f=r.flipT+dt;const before=r.flipT;r.flipT=f;
    if(f<.14)c.setScale(1-f/.14,1,1);
    else{if(before<.14){this.front(c.getComponent(Graphics)!,res.grade);const q=c.getChildByName('qm');if(q)q.active=false;
      const pic=this.h.sprite(c,'pet:'+res.kind,46,52,76,76);pic.name='pic';
      if(r.label)r.label.active=true;if(r.tag)r.tag.active=true;this.burst(sp,r.cx,res.grade);}
     const v=Math.min(1,(f-.14)/.26),e=1+2.7*Math.pow(v-1,3)+1.7*Math.pow(v-1,2);c.setScale(Math.max(0,e),1,1);if(v>=1){c.setScale(1,1,1);r.state='open';}}}}
   if(r.state!=='open')allOpen=false;}
  if(!sp.done&&allOpen){sp.done=true;const res=sp.reels.map(r=>r.res).filter((x):x is HatchResult=>!!x);if(res.length)setTimeout(()=>this.h.reward(res.some(x=>x.grade>=3)?'大成功！':'孵化结果',{pets:res.map(x=>({kind:x.kind,grade:x.grade,tag:x.isNew?'新伙伴加入！':x.upgraded?'品级提升，成为主力':'备用个体 · 可放养/合成',hot:x.isNew||x.upgraded})),sub:res.some(x=>x.isNew)?'有新伙伴加入营地':undefined}),700);}
  const g=sp.fx;if(g&&g.node?.isValid){g.clear();for(const q of sp.parts){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy-=260*dt;g.fillColor=new Color(q.c.r,q.c.g,q.c.b,Math.max(0,Math.min(255,q.life*330)));g.circle(q.x,q.y,3+q.life*4);g.fill();}}
  sp.parts=sp.parts.filter(q=>q.life>0);}
 private burst(sp:Spin,cx:number,grade:number){const c=gradeColor(grade),n=14+grade*8;
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=90+Math.random()*(120+grade*40);sp.parts.push({x:cx-MW/2,y:0,vx:Math.cos(a)*v,vy:Math.sin(a)*v+60,life:.5+Math.random()*.5,c:i%3===0?new Color(255,236,150,255):col(c)});}}
}
