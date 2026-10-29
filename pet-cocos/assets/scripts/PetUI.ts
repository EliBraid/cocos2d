// 宠物界面：带筛选/排序的宠物列表，以及宠物详情（装备+宝石 / 技能+天赋 / 已激活套装 / 品级合成）。
import {Node,Color,Graphics,Sprite,UIOpacity,tween,Vec3} from 'cc';
import {C} from './PaperUI';
import {PETS,JOBS,RARITY,BONDS,activeBonds,bondsOf} from './battle/BattleConfig';
import type {Job} from './battle/BattleConfig';
import {PET_MAX_LEVEL,GRADE_LEVEL_CAP} from './meta/PlayerModel';
import {GRADES,gradeColor,EQUIP_SLOTS,SETS,TALENTS,STAT_KEYS,STAT_INFO,fmtStat,itemName,itemPower,slotDef,setCounts,skillAlts,skillUnlocked,SKILL_NEED,skillText,applySkillAlt,parseGem,gemDef,gemLabel,gemStatText,talentMods,itemLines,skillNames,skillTotals,itemSkillDef} from './meta/Gear';
import type {Item,SlotId,StatKey} from './meta/Gear';
import {MERGE} from './meta/Growth';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import {col,mix,deep,LEFT,JOB_COLOR} from './uiutil';

type Sort='power'|'atk'|'hp'|'grade'|'level';
const SORTS:[Sort,string][]=[['power','战力'],['atk','攻击'],['hp','生命'],['grade','品级'],['level','等级']];
const TAGS:[StatKey|'','全部'|string][]=[['','全部'],['atk','攻击'],['hp','生命'],['def','防御'],['aspd','攻速'],['crit','暴击'],['skill','技能'],['cdr','冷却']];
const JOB_LIST:(Job|'all')[]=['all','warrior','guard','ranged','mage','support','assassin','summoner'];
const PER_PAGE=6;

export interface PetHub{openWorkshop():void;openRanch():void;openHatchery():void;openEnhance(id:number):void}

export class PetUI{
 private k:Kit;
 // list filters
 private fJob:Job|'all'='all';private fGrade=-1;private fTag:StatKey|''='';private sort:Sort='power';private page=0;
 // detail state
 private tab=0;private selSlot:SlotId='helmet';private candPage=0;private gemPick:{item:number;idx:number}|null=null;private gemPage=0;
 // level-up feedback
 private lvFx:{kind:string;before:Record<string,number>;t:number}|null=null;private parts:{x:number;y:number;vx:number;vy:number;life:number;c:Color}[]=[];
 private fxG:Graphics|null=null;private banner:Node|null=null;private portrait:Node|null=null;private deltaNodes:Node[]=[];
 constructor(private h:GearHost,private hub:PetHub){this.k=new Kit(h);}
 private arrange=false;private pickSlot=-1;
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}

 // ================================================================ 列表
 openPet(){const m=this.m,k=this.k,all=Object.keys(PETS);this.h.modal('我的宠物',(p,w)=>{
  let y=66;
  // --- 出战阵容 on top: the six pets that fight, tap one for its details
  const dw=(w-30-5*6)/6,dh=96;k.lt(p,`出战阵容 ${m.deck.length}/6`,18,y+10,140,20,16,true,C.ink);k.lt(p,`队伍战力 ${m.teamPower.toLocaleString('en-US')}`,150,y+10,180,20,13,true,C.red);k.btn(p,'arrange',this.arrange?'完成':'调整顺序',w-70,y+10,100,28,()=>{this.arrange=!this.arrange;this.pickSlot=-1;this.openPet();},this.arrange?'green':'cream',13);y+=24;
  if(this.arrange){k.ct(p,this.pickSlot<0?'点一只宠物，再点要换到的位置':'再点一个位置，和它交换',w/2,y+dh+12,w-30,16,12,true,C.red);}
  for(let i=0;i<6;i++){const x=15+dw/2+i*(dw+6),cy=y+dh/2,kd=m.deck[i];
   if(kd){const d=PETS[kd],c=gradeColor(m.grade(kd)),cell=this.ui.frame(p,'dk'+i,x,cy,dw,dh,'slot-'+d.rarity);this.h.sprite(cell,'pet:'+kd,dw/2,38,dw-12,dw-12);
    const g=this.ui.rect(cell,'g',dw/2,8,dw-10,15,col(c),false);k.ct(g,GRADES[m.grade(kd)].name,(dw-10)/2,7.5,dw-10,13,10,true,C.white);
    this.h.bold(cell,`Lv.${m.petLevel(kd)} ${JOBS[d.job].name}`,dw/2,dh-14,dw+6,16,11,C.ink,C.white,2.5);this.h.tap(cell,()=>{if(this.arrange)this.slotTap(i);else this.openPetDetail(kd);});
    if(this.arrange){const sel=this.pickSlot===i,g2=this.ui.node(cell,'pick',dw/2,dh/2,dw,dh).addComponent(Graphics);g2.strokeColor=sel?C.red:new Color(255,196,64,200);g2.lineWidth=sel?4:2;g2.roundRect(-dw/2+2,-dh/2+2,dw-4,dh-4,8);g2.stroke();if(sel){cell.setScale(1.08,1.08,1);}k.ct(cell,String(i+1),12,dh-30,20,16,13,true,C.ink);}
    if(!this.arrange){const off=this.ui.rect(cell,'off',dw-6,6,24,24,col([232,90,76]),true);k.ct(off,'×',12,11,24,22,18,true,C.white);this.h.tap(off,()=>{if(m.toggleDeck(kd)){m.save();this.h.refresh();this.h.say(`${d.name}下阵了`,1.2);this.openPet();}else this.h.say('阵容至少要保留 1 只宠物',1.4);});}}
   else{const cell=this.ui.frame(p,'dk'+i,x,cy,dw,dh,'card-empty');this.ui.img(cell,'plus',dw/2,dh/2-6,24);k.ct(cell,'空位',dw/2,dh-14,dw,14,11,true,C.muted);this.h.tap(cell,()=>{if(this.arrange&&this.pickSlot>=0)this.slotTap(i);else this.h.say('在下面的宠物大全里点「出战」',1.4);});}}
  y+=dh+6+(this.arrange?20:0);
  {const on=activeBonds(m.deck);k.lt(p,'羁绊',18,y+10,40,18,13,true,C.ink);if(!on.length)k.lt(p,'阵容里凑齐特定宠物可激活羁绊（详见宠物详情）',58,y+10,w-80,16,11,true,C.muted);
   let bx=58;for(const b of on){const bw=Math.min(150,b.name.length*14+b.desc.length*10+24),chip=this.ui.rect(p,'bond'+b.id,bx+bw/2,y+10,bw,22,col([255,226,150]),true);k.ct(chip,`${b.name} ${b.desc}`,bw/2,11,bw-6,18,11,true,C.ink);this.h.tap(chip,()=>this.h.say(`羁绊「${b.name}」：${b.pets.map(x=>PETS[x].name).join('+')} → ${b.desc}`,2.4));bx+=bw+6;if(bx>w-40)break;}
   y+=26;}
  // --- 宠物大全 below, with filters
  const band=this.ui.rect(p,'band',w/2,y+12,w-30,26,col([236,224,196]),true);k.lt(band,'宠物大全',10,13,120,20,15,true,C.ink);k.lt(band,`已收集 ${m.owned.length}/${all.length}`,w-30-110,13,100,18,12,true,C.muted);y+=42;
  const jw=(w-30)/8;JOB_LIST.forEach((j,i)=>k.chip(p,'fj'+j,j==='all'?'全部':JOBS[j].name,15+jw*(i+.5),y+4,jw-3,this.fJob===j,()=>{this.fJob=j;this.page=0;this.openPet();},j==='summoner'?11:13,30));y+=36;const cw=(w-30)/6;
  [-1,0,1,2,3,4].forEach((g,i)=>k.chip(p,'fg'+g,g<0?'全部':GRADES[g].name,15+cw*(i+.5),y+4,cw-4,this.fGrade===g,()=>{this.fGrade=g;this.page=0;this.openPet();},14,30));y+=36;
  const si=SORTS.findIndex(([s])=>s===this.sort),ti=TAGS.findIndex(([t])=>t===this.fTag),hw=(w-30-8)/2;
  k.chip(p,'fsort',`排序：${SORTS[si][1]} ▾`,15+hw/2,y+4,hw,true,()=>{this.sort=SORTS[(si+1)%SORTS.length][0];this.page=0;this.openPet();},14,30);
  k.chip(p,'ftag',`天赋：${TAGS[ti][1]} ▾`,15+hw*1.5+8,y+4,hw,!!this.fTag,()=>{this.fTag=TAGS[(ti+1)%TAGS.length][0] as StatKey|'';this.page=0;this.openPet();},14,30);y+=30;
  // --- list
  const mine=all.filter(x=>m.has(x)).filter(x=>(this.fJob==='all'||PETS[x].job===this.fJob)&&(this.fGrade<0||m.grade(x)===this.fGrade)&&(!this.fTag||(talentMods(PETS[x].job,m.grade(x))[this.fTag]||0)>0));
  const val=(x:string)=>this.sort==='power'?m.petPower(x):this.sort==='atk'?m.petStats(x).atk:this.sort==='hp'?m.petStats(x).hp:this.sort==='grade'?m.grade(x)*1000+m.petPower(x)/100:m.petLevel(x)*1000+m.petPower(x)/100;
  mine.sort((a,b)=>val(b)-val(a)||PETS[a].name.localeCompare(PETS[b].name));
  const locked=this.fGrade<0&&!this.fTag?all.filter(x=>!m.has(x)&&(this.fJob==='all'||PETS[x].job===this.fJob)):[];
  const items=[...mine,...locked],pages=Math.max(1,Math.ceil(items.length/PER_PAGE));this.page=Math.min(this.page,pages-1);
  const what=`${this.fGrade>=0?GRADES[this.fGrade].name:''}${this.fJob!=='all'?JOBS[this.fJob].name:'宠物'}`;
  k.ct(p,`${what}：${mine.length} 只`,w/2,y+10,w-30,18,13,true,C.muted);y+=24;
  const cardW=(w-36-8)/2,cardH=92;
  items.slice(this.page*PER_PAGE,this.page*PER_PAGE+PER_PAGE).forEach((x,i)=>{const cx=18+cardW/2+(i%2)*(cardW+8),cy=y+cardH/2+Math.floor(i/2)*(cardH+6);this.petCard(p,cx,cy,cardW,cardH,x);});
  if(!items.length)k.ct(p,'没有符合条件的宠物，换个筛选试试',w/2,y+50,w-30,20,15,true,C.muted);
  y+=Math.max(1,Math.ceil(Math.min(PER_PAGE,items.length)/2))*(cardH+6)+2;
  y+=k.pager(p,w,y,this.page,pages,n=>{this.page=n;},()=>this.openPet());
  const sp=m.spares().length;k.btn(p,'tohatch','孵化屋',w/2-150,y+26,130,44,()=>this.hub.openHatchery(),'cream',15,'egg');k.btn(p,'ranch',`放养所 ${sp}`,w/2,y+26,140,44,()=>this.hub.openRanch(),'cream',15,'paw');k.btn(p,'to-work','工坊',w/2+150,y+26,130,44,()=>this.hub.openWorkshop(),'cream',15,'hammer');
  return y+58;},480);}

 /** arrange mode: first tap picks a pet, second tap swaps it with that slot (an empty slot moves it to the end) */
 private slotTap(i:number){const m=this.m;if(this.pickSlot<0){if(m.deck[i])this.pickSlot=i;this.openPet();return;}
  const a=this.pickSlot;this.pickSlot=-1;if(a!==i){const d=[...m.deck];if(i>=d.length){const [x]=d.splice(a,1);d.push(x);}else{[d[a],d[i]]=[d[i],d[a]];}m.deck=d;m.save();this.h.refresh();}this.openPet();}
 private petCard(p:Node,cx:number,cy:number,w:number,h:number,kind:string){const m=this.m,k=this.k,d=PETS[kind],have=m.has(kind);
  const card=this.ui.frame(p,'pet:'+kind,cx,cy,w,h,!have?'card-empty':m.inDeck(kind)?'card-gold':'card');
  const slot=this.ui.frame(card,'Portrait',38,h/2,58,h-16,'slot-'+d.rarity);const av=this.h.sprite(slot,'pet:'+kind,29,(h-16)/2,48,48);if(!have){const s=av.getComponent(Sprite);if(s)s.color=new Color(40,40,40,255);}
  if(!have){k.lt(card,'？？？',74,24,100,22,16,true,C.muted);k.lt(card,`${RARITY[d.rarity].name} · ${JOBS[d.job].name}`,74,48,130,16,12,true,C.muted);k.lt(card,'孵化屋可获得',74,68,130,16,12,false,C.muted);return card;}
  const gr=m.grade(kind),lv=m.petLevel(kind),jc=JOB_COLOR[d.job];
  k.lt(card,d.name,74,18,110,22,16,true,C.ink);
  k.gradeChip(card,100,40,gr,44);k.lt(card,`Lv.${lv}${lv>=m.petLevelCap(kind)?' 满':''}`,128,40,50,16,12,true,C.muted);
  const jb=this.ui.rect(card,'job',w-30,16,44,18,mix(jc,.55),true);k.ct(jb,JOBS[d.job].name,22,9,44,16,11,true,deep(jc,.6));
  k.lt(card,`战力 ${m.petPower(kind).toLocaleString('en-US')}`,74,60,110,16,12,true,C.red);
  const g=this.ui.node(card,'talentDots',92,h-12,90,10).addComponent(Graphics);g.node.setPosition(g.node.position.x-45+4,g.node.position.y,0);
  for(let i=0;i<5;i++){g.fillColor=i<=gr?col(gradeColor(gr)):new Color(210,205,188,255);g.circle(i*13,0,4);g.fill();}
  if(m.canMergeAny(kind)){const b=this.ui.rect(card,'mergeTag',w-34,40,48,18,col([120,200,120]),true);k.ct(b,'可合成',24,9,48,16,11,true,C.ink);}
  k.btn(card,'deck:'+kind,m.inDeck(kind)?'下阵':'出战',w-38,h-22,58,28,()=>{if(m.toggleDeck(kind)){m.save();this.h.refresh();this.openPet();}else this.h.say(m.inDeck(kind)?'阵容至少要保留 1 只宠物':'阵容最多 6 只',1.4);},m.inDeck(kind)?'grey':'green',13);
  this.h.tap(card,()=>{this.tab=0;this.gemPick=null;this.candPage=0;this.openPetDetail(kind);});return card;}

 // ================================================================ 详情
 /** the whole detail screen. tab 0 equipment+gems, 1 skills+talents, 2 active sets, 3 grade copies + merge */
 openPetDetail(kind:string){const m=this.m,d=PETS[kind],k=this.k;this.h.modal(d.name,(p,w)=>{
  const gr=m.grade(kind),gc=gradeColor(gr),lv=m.petLevel(kind),cap=m.petLevelCap(kind),mods=m.petMods(kind),st=m.petStats(kind),max=lv>=cap,top=lv>=PET_MAX_LEVEL;
  const fx=this.lvFx&&this.lvFx.kind===kind&&this.lvFx.t<3?this.lvFx:null;this.deltaNodes=[];
  // ---- portrait
  const fr=this.ui.rect(p,'Portrait',100,160,160,176,mix(gc,.7),true);this.ui.rect(fr,'glow',80,88,134,150,mix(gc,.88),false);this.h.sprite(fr,'pet:'+kind,80,84,140,140);this.portrait=fr;
  const fxn=this.ui.node(p,'LvFX',100,160,160,176);this.fxG=fxn.addComponent(Graphics);
  if(fx){const b=this.ui.node(p,'LvBanner',100,92,150,30);this.banner=b;b.addComponent(UIOpacity);this.h.bold(b,'LEVEL UP!',75,15,150,30,22,col([255,236,120]),C.ink,3);}else this.banner=null;
  k.gradeChip(p,52,262,gr,56);k.ct(p,`Lv.${lv}${max?' 满级':''}　${JOBS[d.job].name}`,138,262,100,18,13,true,C.ink);
  // ---- numbers (left edge x0)
  const x0=196,base=this.m.petBonus(kind),baseHp=Math.round(d.hp*base),baseAtk=Math.round(d.atk*base);
  const stat=(i:number,name:string,val:number,gear:number,lvKey:string)=>{const x=x0+(i%2)*134,y=84+Math.floor(i/2)*48;k.lt(p,name,x,y,60,14,12,true,C.muted);k.lt(p,String(val),x,y+19,84,24,21,true,C.ink);
   const up=fx?Math.max(0,val-fx.before[lvKey]):0;if(up>0){const n=k.lt(p,`▲${up}`,x+Math.min(80,String(val).length*12+4),y+20,60,18,13,true,col([46,160,70]));this.deltaNodes.push(n.node);}else if(gear>0)k.lt(p,`+${gear}`,x+Math.min(80,String(val).length*12+4),y+20,60,16,12,true,C.red);};
  stat(0,'生命',st.hp,st.hp-baseHp,'hp');stat(1,'攻击',st.atk,st.atk-baseAtk,'atk');stat(2,'防御',st.def,Math.round(mods.def||0),'def');stat(3,'战力',m.petPower(kind),0,'pow');
  const extra=STAT_KEYS.filter(s=>s!=='hp'&&s!=='atk'&&s!=='def'&&(mods[s]||0)>0).map(s=>fmtStat(s,mods[s]!));
  const half=Math.ceil(extra.length/2);k.lt(p,extra.slice(0,half).join('　')||'穿装备、解锁天赋后出现额外属性',x0,184,268,14,11,true,extra.length?C.ink:C.muted);if(extra.length>1)k.lt(p,extra.slice(half).join('　'),x0,200,268,14,11,true,C.ink);
  // level pips
  // level bar up to the cap of the current 品级; the cap rises when the pet is merged to a higher grade
  k.lt(p,`等级`,x0,222,40,16,12,true,C.muted);const bw=150,pg=this.ui.node(p,'lvbar',x0+44+bw/2,222,bw,12).addComponent(Graphics);
  pg.fillColor=new Color(214,208,190,255);pg.roundRect(-bw/2,-5,bw,10,5);pg.fill();pg.fillColor=col([244,184,52]);pg.roundRect(-bw/2,-5,Math.max(10,bw*lv/cap),10,5);pg.fill();
  k.lt(p,`${lv}/${cap}`,x0+52+bw,222,60,16,12,true,C.ink);
  const c=m.petUpCost(kind);
  k.btn(p,'lvup',top?'已满级':max?'提升品级':`升级 ${c.coins}`,x0+80,262,160,44,()=>{if(top){this.h.say('已经是满级了',1.2);return;}if(max){this.h.say(`已到 ${GRADES[gr].name}上限 Lv.${cap}，去「品级合成」提升品级可继续升级`,2.6);return;}
    const pow0=m.petPower(kind);if(m.upgradePet(kind)){m.save();this.h.refresh();this.startLevelFx(kind,{hp:st.hp,atk:st.atk,def:st.def,pow:pow0});this.openPetDetail(kind);this.bounce();this.h.say(`${d.name} 升到 Lv.${m.petLevel(kind)}！生命 ${st.hp}→${m.petStats(kind).hp}  攻击 ${st.atk}→${m.petStats(kind).atk}`,2.4);}
    else this.h.say(m.coins<c.coins?`金币不足，需要 ${c.coins}`:`经验果不足，需要 ${c.food}`,1.8);},max?'grey':m.canUpgradePet(kind)?'red':'cream',17,max?undefined:'coin');
  k.ct(p,top?'':max?`下一品级上限 Lv.${GRADE_LEVEL_CAP[Math.min(4,gr+1)]}`:`还需 ${c.food} 经验果`,x0+80,292,160,14,11,true,m.food>=c.food?C.muted:C.red);
  k.btn(p,'deck',m.inDeck(kind)?'下阵':'出战',x0+222,262,96,44,()=>{if(m.toggleDeck(kind)){m.save();this.h.refresh();this.openPetDetail(kind);}else this.h.say(m.inDeck(kind)?'阵容至少要保留 1 只宠物':'阵容最多 6 只',1.4);},m.inDeck(kind)?'grey':'green',16);
  // ---- tabs
  const names=['装备','技能天赋','套装羁绊','品级合成'];names.forEach((t,i)=>k.btn(p,'tab'+i,t+(i===3&&m.canMergeAny(kind)?' ●':''),60+i*120,322,114,38,()=>{this.tab=i;this.gemPick=null;this.openPetDetail(kind);},this.tab===i?'gold':'cream',15));
  let y=346;
  y=[()=>this.tabEquip(p,w,y,kind),()=>this.tabSkill(p,w,y,kind),()=>this.tabSets(p,w,y,kind),()=>this.tabGrade(p,w,y,kind)][this.tab]();
  return y+14;},480);}

 // ---------------------------------------------------------------- 装备 + 宝石
 private slotCell(p:Node,x:number,y:number,w:number,h:number,kind:string,s:{id:SlotId;name:string}){const m=this.m,it=m.equippedItem(kind,s.id),q=it?gradeColor(it.q):null,on=this.selSlot===s.id;
  const cell=this.ui.frame(p,'eq:'+s.id,x,y,w,h,on?'card-gold':'card');
  const tx=26+(w-26)/2+4,tw=w-52;this.k.ct(cell,s.name,tx,12,tw,14,11,true,C.muted);
  if(it&&q){this.k.itemIcon(cell,26,h/2,42,it);this.k.ct(cell,itemName(it),tx,31,tw,18,12,true,deep(q,.5));const g=this.ui.node(cell,'dots',tx,h-11,60,10).addComponent(Graphics);it.gems.forEach((gk,i)=>{const gm=gk?parseGem(gk):null;g.fillColor=gm?col(gemDef(gm.id)!.color):new Color(200,194,176,255);g.circle((i-(it.gems.length-1)/2)*14,0,4.5);g.fill();});
   this.ui.rect(cell,'qbar',w/2,h-4,w-24,3,col(q),false);}
  else{this.k.slotIcon(cell,26,h/2,40,s.id);this.k.ct(cell,'空',tx,34,tw,18,14,true,C.muted);}
  this.h.tap(cell,()=>{this.selSlot=s.id;this.candPage=0;this.gemPick=null;this.openPetDetail(kind);});return cell;}

 private tabEquip(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k;let y=y0;
  const cw=(w-30-18)/4,ch=58;EQUIP_SLOTS.forEach((s,i)=>this.slotCell(p,15+cw/2+(i%4)*(cw+6),y+ch/2+Math.floor(i/4)*(ch+6),cw,ch,kind,s));y+=2*(ch+6)+2;
  // every equipment skill this pet has, summed up — tap one to see which pieces give it
  const tot=skillTotals(m.equippedItems(kind)),spr=3,bw=(w-30-16)/spr,rows=Math.max(1,Math.ceil(tot.length/spr)),bh=26+rows*31,sbox=this.ui.frame(p,'skills',w/2,y+bh/2,w-30,bh,'card');
  k.lt(sbox,`装备技能 ${tot.length}`,12,14,120,18,13,true,C.ink);k.lt(sbox,tot.length?'点技能看来源':'穿上良品以上的装备就有技能',w-30-190,14,180,16,11,true,C.muted);
  tot.forEach((t,i)=>{const d=itemSkillDef(t.id)!,x=8+bw/2+(i%spr)*bw,yy=26+15+Math.floor(i/spr)*31,chip=this.ui.rect(sbox,'sk'+t.id,x,yy,bw-6,28,mix(d.color,.82),true);
   k.skillBadge(chip,15,14,22,d.icon,d.color);k.lt(chip,d.name,30,14,60,18,13,true,deep(d.color,.5));k.lt(chip,`${Math.round(t.v*100)}%`,bw-6-46,14,40,18,13,true,C.ink);
   if(d.tier===3)this.ui.rect(chip,'leg',bw-12,5,8,8,col([240,180,40]),false);
   this.h.tap(chip,()=>this.h.say(`${d.name}：${d.text(t.v)}　来自 ${t.from.map(f=>f.name).join('、')}`,2.6));});
  y+=bh+8;
  k.btn(p,'auto','一键最佳',w/2-110,y+20,150,38,()=>{const n=m.autoEquip(kind);m.save();this.h.refresh();this.h.say(n?`替换了 ${n} 件装备，换上最强的组合`:'已经是最强的组合了',1.8);this.openPetDetail(kind);},'green',15,'star');
  k.btn(p,'offall','全部卸下',w/2+70,y+20,130,38,()=>{const n=m.unequipAll(kind);m.save();this.h.refresh();this.h.say(n?`卸下了 ${n} 件装备`:'身上没有装备',1.4);this.openPetDetail(kind);},'cream',15);y+=48;
  const sd=slotDef(this.selSlot),cur=m.equippedItem(kind,this.selSlot);
  // current piece
  const hh=cur?90:44,box=this.ui.rect(p,'cur',w/2,y+hh/2,w-30,hh,cur?mix(gradeColor(cur.q),.8):col([240,234,214]),true);
  if(cur){const q=gradeColor(cur.q);this.ui.rect(box,'qbar',8,hh/2,6,hh-14,col(q),false);k.lt(box,itemName(cur),20,14,160,22,17,true,deep(q,.5));k.gradeChip(box,w-30-150,14,cur.q,48);k.lt(box,`${sd.name} · 战力 ${itemPower(cur)}${cur.skills?.length?' · 技能 '+skillNames(cur):''}`,20,32,w-150,14,11,true,cur.skills?.length?col([190,110,30]):C.muted);
   const lines=itemLines(cur);k.lt(box,lines.slice(0,2).join('　'),20,48,w-60,14,12,true,C.ink);k.lt(box,lines.slice(2).join('　'),20,63,w-60,14,12,false,C.ink);
   this.socketRow(box,w-30,78,cur,()=>this.openPetDetail(kind));
   k.btn(box,'enh','强化',w-30-96,34,56,28,()=>this.hub.openEnhance(cur.id),'cream',13);k.btn(box,'off','卸下',w-30-36,34,56,28,()=>{m.unequip(kind,this.selSlot);m.save();this.h.refresh();this.gemPick=null;this.openPetDetail(kind);},'cream',13);}
  else k.ct(box,`${sd.name}：还没有穿戴`,(w-30)/2,23,w-40,20,14,true,C.muted);
  y+=hh+8;
  if(this.gemPick&&cur&&cur.id===this.gemPick.item)return this.gemPanel(p,w,y,cur,()=>this.openPetDetail(kind));
  // candidates
  const list=m.items.filter(i=>i.slot===this.selSlot&&i.id!==cur?.id).sort((a,b)=>itemPower(b)-itemPower(a)),per=rows>1?2:3,pages=Math.max(1,Math.ceil(list.length/per));this.candPage=Math.min(this.candPage,pages-1);
  k.lt(p,list.length?`可换上的${sd.name}（${list.length}）`:`没有其它${sd.name}`,22,y+8,260,18,13,true,C.ink);y+=22;
  list.slice(this.candPage*per,this.candPage*per+per).forEach(it=>{const q=gradeColor(it.q),dp=itemPower(it)-(cur?itemPower(cur):0),owner=m.itemOwner(it.id),o=owner?PETS[owner].name:'';
   const r=this.ui.rect(p,'cand'+it.id,w/2,y+24,w-30,48,mix(q,.84),true);k.itemIcon(r,26,24,40,it);
   k.lt(r,itemName(it),52,13,110,20,14,true,deep(q,.5));k.lt(r,`${GRADES[it.q].name}${o?' · '+o+'穿戴中':''}`,52,33,110,14,11,true,o?C.red:C.muted);
   const sub=itemLines(it)[0]+(it.skills?.length?' '+skillNames(it):' '+(itemLines(it)[1]||''));k.lt(r,sub,160,13,170,14,11,false,it.skills?.length?col([170,95,20]):C.ink);
   k.lt(r,`战力 ${dp>=0?'+':''}${dp}`,160,33,100,16,13,true,dp>0?col([46,160,70]):dp<0?C.red:C.muted);
   k.btn(r,'wear'+it.id,o?'换穿':'穿上',w-30-44,24,70,34,()=>{m.equipItem(kind,it.id);m.save();this.h.refresh();this.h.say(`穿上了${itemName(it)}${dp>0?`，战力 +${dp}`:''}`,1.4);this.gemPick=null;this.openPetDetail(kind);},dp>0?'green':'cream',14);y+=52;});
  y+=k.pager(p,w,y,this.candPage,pages,n=>{this.candPage=n;},()=>this.openPetDetail(kind));
  if(!list.length&&!cur){k.btn(p,'gowork','去工坊打造',w/2,y+22,160,40,()=>this.hub.openWorkshop(),'cream',15,'hammer');y+=48;}
  return y;}

 /** the socket strip under a piece: tap a socket to pick / replace a gem */
 socketRow(p:Node,w:number,y:number,it:Item,again:()=>void){const k=this.k;k.lt(p,'宝石孔',20,y,50,16,11,true,C.muted);
  it.gems.forEach((gk,i)=>{const x=86+i*38,sel=this.gemPick&&this.gemPick.item===it.id&&this.gemPick.idx===i;if(sel)this.ui.rect(p,'sel',x,y,32,32,col([255,226,120]),true);const n=k.gemIcon(p,x,y,15,gk||null);this.h.tap(n,()=>{this.gemPick={item:it.id,idx:i};this.gemPage=0;again();});});
  if(it.gems.some(g=>g)){const g0=it.gems.filter(Boolean).map(gemStatText).join('　');k.lt(p,g0,86+it.gems.length*38+4,y,Math.max(60,w-(86+it.gems.length*38+14)),14,10,true,C.ink);}}

 /** pick a gem from the bag for the chosen socket */
 gemPanel(p:Node,w:number,y0:number,it:Item,again:()=>void){const m=this.m,k=this.k,gp=this.gemPick!;let y=y0;const cur=it.gems[gp.idx];
  k.lt(p,`第 ${gp.idx+1} 个宝石孔：选一颗宝石镶嵌`,22,y+8,300,18,13,true,C.ink);k.btn(p,'gemclose','返回',w-62,y+10,70,28,()=>{this.gemPick=null;again();},'cream',13);y+=26;
  if(cur){const r=this.ui.rect(p,'curgem',w/2,y+24,w-30,44,mix(gemDef(parseGem(cur)!.id)!.color,.8),true);k.gemIcon(r,30,22,15,cur);k.lt(r,gemLabel(cur),56,14,120,18,14,true,C.ink);k.lt(r,gemStatText(cur),56,32,150,14,11,true,C.muted);
   k.btn(r,'ungem','卸下',w-30-44,22,64,30,()=>{m.unsocketGem(it.id,gp.idx);m.save();this.h.say('宝石已退回背包',1.2);again();},'cream',13);y+=50;}
  const gl=m.gemList(),per=3,pages=Math.max(1,Math.ceil(gl.length/per));this.gemPage=Math.min(this.gemPage,pages-1);
  gl.slice(this.gemPage*per,this.gemPage*per+per).forEach(gk=>{const gm=parseGem(gk)!,r=this.ui.rect(p,'g'+gk,w/2,y+24,w-30,44,mix(gemDef(gm.id)!.color,.86),true);k.gemIcon(r,30,22,15,gk);k.lt(r,`${gemLabel(gk)}　×${m.gemCount(gk)}`,56,14,170,18,14,true,C.ink);k.lt(r,gemStatText(gk),56,32,150,14,11,true,C.muted);
   k.btn(r,'put'+gk,cur?'替换':'镶嵌',w-30-44,22,64,30,()=>{if(m.socketGem(it.id,gp.idx,gk)){m.save();this.h.refresh();this.h.say(`镶嵌了${gemLabel(gk)}：${gemStatText(gk)}`,1.6);again();}},'green',13);y+=48;});
  if(!gl.length){k.ct(p,'没有宝石了。冒险获胜、队长成长路线会掉落宝石，3 颗同级可在背包合成更高级',w/2,y+22,w-40,34,12,true,C.muted);y+=48;}
  y+=k.pager(p,w,y,this.gemPage,pages,n=>{this.gemPage=n;},again);return y;}

 // ---------------------------------------------------------------- 技能 + 天赋
 private tabSkill(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k,d=PETS[kind],gr=m.grade(kind),alts=skillAlts(d.job),sel=m.skillIndex(kind);let y=y0;
  {const ps=d.passive,pr=this.ui.frame(p,'passive',w/2,y+26,w-30,52,'card-gold');k.skillBadge(pr,28,26,36,'star',[240,180,60]);
   k.lt(pr,`专属被动 · ${ps.name}`,54,16,w-110,20,15,true,col([170,100,20]));k.lt(pr,ps.desc,54,36,w-110,16,12,true,C.ink);y+=58;}
  k.lt(p,'技能（战斗中自动释放，点选一个作为默认技能）',22,y+8,w-40,18,13,true,C.ink);y+=22;
  for(let i=0;i<3;i++){const un=skillUnlocked(gr,i),sk=applySkillAlt(d.skill,alts[i]),icon=alts[i]?.icon||JOBS[d.job].icon,color=alts[i]?.color||JOB_COLOR[d.job],on=sel===i;
   const r=this.ui.frame(p,'skill'+i,w/2,y+36,w-30,72,on?'card-gold':un?'card':'card-empty');
   k.skillBadge(r,42,36,56,icon,color,!un);
   k.lt(r,un?sk.name:'？？？',84,16,150,22,17,true,un?C.ink:C.muted);k.lt(r,`冷却 ${sk.cd} 秒${i===0?' · 初始':i===1?' · 良品天赋':' · 极品天赋'}`,84,37,200,14,11,true,C.muted);
   k.lt(r,un?skillText(d.job,sk):`${GRADES[SKILL_NEED[i]].name}解锁`,84,56,w-30-84-84,14,11,false,un?C.ink:C.muted);
   if(un)k.btn(r,'pick'+i,on?'默认中':'设为默认',w-30-46,36,80,36,()=>{if(!on&&m.setSkill(kind,i)){m.save();this.h.say(`默认技能：${sk.name}`,1.4);this.openPetDetail(kind);}},on?'grey':'green',13);
   else k.gradeChip(r,w-30-40,36,SKILL_NEED[i],52);
   if(i>0&&un&&!on)this.h.tap(r,()=>{if(m.setSkill(kind,i)){m.save();this.openPetDetail(kind);}});y+=78;}
  y+=2;k.lt(p,`天赋（${GRADES[gr].name}：已解锁 ${gr+1}/5，技能天赋会带来新技能）`,22,y+8,w-40,18,13,true,C.ink);y+=24;
  TALENTS[d.job].forEach((t,i)=>{const on=i<=gr,r=this.ui.frame(p,'tal'+i,w/2,y+19,w-30,38,on?'card':'card-empty');
   k.lt(r,on?t.name:'？？？',14,12,100,18,14,true,on?C.ink:C.muted);k.lt(r,on?t.desc:`${GRADES[i].name}解锁`,14,28,w-30-90,12,10,false,on?C.ink:C.muted);
   if(t.skill){const b=this.ui.rect(r,'skilltag',w-30-90,12,52,16,on?col([240,200,90]):col([210,206,192]),true);k.ct(b,'技能天赋',26,8,52,14,10,true,C.ink);}
   k.gradeChip(r,w-30-34,19,i,46);y+=42;});
  return y;}

 // ---------------------------------------------------------------- 套装：只显示已激活
 private tabSets(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k;let y=y0;const eq=m.equippedItems(kind),cnt=setCounts(eq);let any=false;
  for(const s of SETS){const n=cnt[s.id]||0;if(n<2)continue;any=true;const on=s.bonus.filter(b=>n>=b.n),hh=40+on.length*20;
   const r=this.ui.rect(p,'set'+s.id,w/2,y+hh/2,w-30,hh,mix(s.color,.8),true);this.ui.rect(r,'bar',8,hh/2,6,hh-14,col(s.color),false);
   k.lt(r,`${s.name}套装`,22,18,200,22,17,true,deep(s.color,.5));k.ct(r,`${n} 件`,w-30-40,18,60,20,15,true,C.red);
   on.forEach((b,i)=>k.lt(r,`● ${b.n} 件：${b.desc}`,26,42+i*20,w-70,16,13,true,C.ink));y+=hh+8;}
  if(!any){const r=this.ui.frame(p,'noset',w/2,y+40,w-30,80,'card-empty');k.ct(r,'还没有激活的套装',(w-30)/2,26,w-40,20,16,true,C.muted);k.ct(r,'给宠物穿上 2 件同一套装的装备，即可激活套装效果',(w-30)/2,52,w-50,18,12,false,C.muted);y+=88;}
  const bs=bondsOf(kind);if(bs.length){y+=8;k.lt(p,'羁绊（这些伙伴同时出战时激活）',22,y+8,w-40,18,13,true,C.ink);y+=22;
   for(const b of bs){const on=b.pets.every(x=>m.inDeck(x)),r=this.ui.frame(p,'bd'+b.id,w/2,y+19,w-30,38,on?'card-gold':'card');
    k.lt(r,b.name,14,12,100,18,14,true,on?col([170,100,20]):C.ink);k.lt(r,b.pets.map(x=>(m.has(x)?'':'?')+PETS[x].name).join(' + '),14,28,w-150,12,10,true,C.muted);k.lt(r,b.desc,w-30-150,19,140,16,12,true,on?C.red:C.ink);y+=42;}}
  return y;}

 // ---------------------------------------------------------------- 品级个体 + 合成
 private tabGrade(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k,d=PETS[kind];let y=y0;
  k.lt(p,'合成：同种同品级的个体合成更高品级，可能失败',22,y+8,w-40,18,13,true,C.ink);y+=24;
  for(let g=0;g<3;g++){const f=m.mergeInfo(kind,g),gc=gradeColor(g),nc=gradeColor(g+1);
   const r=this.ui.rect(p,'merge'+g,w/2,y+34,w-30,68,mix(nc,.86),true);
   k.gradeChip(r,44,18,g,56);k.lt(r,`×${f.need}`,76,18,30,18,15,true,C.ink);k.ct(r,'→',128,18,24,20,18,true,C.muted);k.gradeChip(r,172,18,g+1,56);
   k.lt(r,`持有 ${f.have}/${f.need}`,22,46,80,16,12,true,f.can?C.ink:C.red);
   k.lt(r,`成功率 ${Math.round(f.rate*100)}%${f.pity?`（祈福 +${Math.round(Math.min(MERGE.pityMax,f.pity*MERGE.pityStep)*100)}%）`:''}`,104,46,170,16,12,true,deep(nc,.55));
   k.btn(r,'domerge'+g,'合成',w-30-46,34,78,44,()=>{const res=m.merge(kind,g);if(!res)return;m.save();this.h.refresh();
     if(res.ok)this.h.say(`合成成功！获得 ${GRADES[g+1].name}${d.name}（成功率 ${Math.round(res.rate*100)}%）`,2.6);else this.h.say(`合成失败…损失 1 个个体，下次成功率 +${Math.round(MERGE.pityStep*100)}%`,2.6);
     this.openPetDetail(kind);},f.can?'green':'grey',16);y+=74;}
  k.ct(p,`失败率：凡品 ${Math.round((1-MERGE.rate[0])*100)}% · 良品 ${Math.round((1-MERGE.rate[1])*100)}% · 上品 ${Math.round((1-MERGE.rate[2])*100)}%。失败只损失 1 个，优先消耗备用个体`,w/2,y+14,w-34,30,11,false,C.muted);y+=38;
  const cp=m.copies(kind);k.lt(p,`持有的个体（${cp.length}）`,22,y+8,200,18,13,true,C.ink);y+=24;
  cp.slice(0,5).forEach(c=>{const gcol=gradeColor(c.grade),main=m.mainId[kind]===c.id,r=this.ui.rect(p,'copy'+c.id,w/2,y+22,w-30,44,main?mix(gcol,.5):mix(gcol,.85),true);
   this.h.sprite(r,'pet:'+kind,30,22,34,34);k.lt(r,GRADES[c.grade].name,56,14,70,18,15,true,deep(gcol,.55));k.lt(r,main?'出战中':m.ranch.includes(c.id)?'放养中':'备用',56,32,70,12,10,true,main?C.red:C.muted);
   k.lt(r,`基础 ×${GRADES[c.grade].mul}　天赋 ${c.grade+1} 个`,136,22,160,16,12,true,C.ink);
   if(!main)k.btn(r,'main'+c.id,'设为主力',w-30-46,22,76,32,()=>{if(m.setMain(kind,c.id)){m.save();this.h.refresh();this.h.say(`${GRADES[c.grade].name}${d.name}成为主力`,1.6);this.openPetDetail(kind);}},'green',12);y+=48;});
  if(cp.length>5){k.ct(p,`……还有 ${cp.length-5} 个较低品级的个体`,w/2,y+8,w-30,16,11,false,C.muted);y+=22;}
  return y;}

 // ================================================================ 升级反馈
 private startLevelFx(kind:string,before:Record<string,number>){this.lvFx={kind,before,t:0};this.parts=[];for(let i=0;i<46;i++){const a=Math.random()*Math.PI*2,v=70+Math.random()*130;this.parts.push({x:(Math.random()-.5)*110,y:(Math.random()-.5)*120,vx:Math.cos(a)*v*.5,vy:-Math.abs(Math.sin(a))*v-30,life:.8+Math.random()*.9,c:i%3===0?col([255,240,150]):i%3===1?col([120,230,150]):col([255,200,90])});}}
 private bounce(){const n=this.portrait;if(n&&n.isValid){n.setScale(.9,.9,1);tween(n).to(.14,{scale:new Vec3(1.1,1.1,1)}).to(.2,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();}}
 update(dt:number){const f=this.lvFx;if(!f)return;f.t+=dt;
  const g=this.fxG;if(g&&g.node.isValid){g.clear();for(const q of this.parts){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=150*dt;if(q.life<=0)continue;g.fillColor=new Color(q.c.r,q.c.g,q.c.b,Math.max(0,Math.min(255,q.life*400)));g.circle(q.x,q.y,2.5+q.life*3);g.fill();}}
  const b=this.banner;if(b&&b.isValid){const op=b.getComponent(UIOpacity);if(op)op.opacity=Math.round(255*Math.max(0,Math.min(1,(2.4-f.t)*2.5,f.t*8)));b.setPosition(b.position.x,b.position.y+dt*8,0);}
  if(f.t>3){this.lvFx=null;for(const n of this.deltaNodes)if(n.isValid)n.destroy();this.deltaNodes=[];this.banner=null;}}
}
