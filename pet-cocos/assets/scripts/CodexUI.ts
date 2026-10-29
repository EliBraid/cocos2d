// 图鉴: pets (档案 / 获取途径 / 技能), monsters (discovered in battle, with counter-tips) and gear sets.
// First time a pet is owned or a monster is met, its entry pays a small reward; collection milestones pay more.
import {Node,Color,Graphics,Sprite,SpriteFrame,UITransform,resources} from 'cc';
import {C} from './PaperUI';
import {PETS,JOBS,MONSTERS,RARITY} from './battle/BattleConfig';
import type {Job,MonsterKind} from './battle/BattleConfig';
import {GRADES,gradeColor,SETS,skillAlts,applySkillAlt,skillText,SKILL_NEED} from './meta/Gear';
import {PET_LORE,MON_TIP,CODEX_PET_REWARD,CODEX_MON_REWARD,CODEX_MILESTONES} from './meta/Welfare';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import type {WelfareUI} from './WelfareUI';
import {col,mix,deep} from './uiutil';
const W=480;
const MON_WHERE:Record<string,string>={fuzz:'1-1 起',shroom:'1-1 起',elite:'1-1 起',warden:'1-1 水晶守军',archer:'1-2 起',caster:'1-4 起',healer:'1-3 守军 · 第 2 章',armor:'第 2 章',dasher:'第 3 章',bomber:'第 3 章',summoner:'第 4 章',stunner:'第 4 章',boss1:'1-8 首领',boss2:'2-8 首领',boss3:'3-8 首领',boss4:'4-8 首领',boss5:'5-8 首领',boss6:'6-8 首领',boss7:'7-8 首领',boss8:'8-8 首领',splitter:'第 5 章',frost:'第 6 章',ghost:'第 7 章',starmage:'第 8 章'};
export class CodexUI{
 private k:Kit;private tab=0;private pg=[0,0];private sel:string|null=null;
 constructor(private h:GearHost,private wf:WelfareUI,private hub:{openPetDetail(kind:string):void}){this.k=new Kit(h);}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}
 private get monKinds(){return Object.keys(MONSTERS) as MonsterKind[];}
 open(tab=this.tab,sel:string|null=null){this.tab=tab;this.sel=sel;const m=this.m;this.h.modal('图鉴',(p,w)=>{const k=this.k,ui=this.ui;
  const total=Object.keys(PETS).length+this.monKinds.length,n=m.codexCount;
  // collection progress + milestones
  const card=ui.frame(p,'col',w/2,104,w-30,78,'card');k.lt(card,`收集进度 ${n}/${total}`,14,18,200,20,16,true);ui.bar(card,(w-30)/2,44,w-60,12,n/total,col([255,196,64]));
  CODEX_MILESTONES.forEach((ms,i)=>{const x=30+(w-100)*ms.n/total,key='col:'+ms.n,got=m.codex.includes(key),ready=m.codexReady(key);
   const b=ui.roundBtn(card,'ms'+i,x,44,30,()=>{const r=m.claimCodex(key);if(r){m.save();this.h.refresh();this.open(this.tab,this.sel);this.h.reward('收集奖励',{b:r,sub:`图鉴收集 ${ms.n} 个`});}else this.h.say(got?'已领取':`收集 ${ms.n} 个可领`,1.2);},'round',got?'check':'chest');if(ready)ui.img(b,'dot',26,4,12);
   k.ct(card,String(ms.n),x,66,30,14,11,true,C.muted);});
  ['宠物','怪物','套装'].forEach((t,i)=>{const dot=i===0?m.owned.some(x=>m.codexReady('pet:'+x)):i===1?m.seenMon.some(x=>m.codexReady('mon:'+x)):false;
   k.btn(p,'ctab'+i,t,15+(w-30)/6+i*(w-30)/3,166,(w-30)/3-6,38,()=>this.open(i,null),this.tab===i?'gold':'cream',16);if(dot)ui.img(p,'dot',15+(w-30)/3*(i+1)-14,152,14);});
  const y0=194;const y=this.tab===0?(this.sel?this.petPage(p,w,y0,this.sel):this.petGrid(p,w,y0)):this.tab===1?(this.sel?this.monPage(p,w,y0,this.sel):this.monGrid(p,w,y0)):this.sets(p,w,y0);return y+14;},W);}
 // ------------------------------------------------------------------ pets
 private petGrid(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui,all=Object.keys(PETS),per=15,pages=Math.ceil(all.length/per),pg=Math.min(this.pg[0],pages-1),kinds=all.slice(pg*per,pg*per+per),cw=(w-30-4*8)/5,ch=112;let y=y0+6;
  kinds.forEach((kind,i)=>{const d=PETS[kind],own=m.has(kind),r=Math.floor(i/5),c=i%5,x=15+cw/2+c*(cw+8),cy=y+ch/2+r*(ch+6);
   const cell=ui.frame(p,'pc'+kind,x,cy,cw,ch,own?'slot-'+d.rarity:'card-empty');const s=this.h.sprite(cell,'pet:'+kind,cw/2,42,cw-18,cw-18);
   if(!own){const sp=s.getComponent(Sprite);if(sp)sp.color=new Color(60,52,46,255);k.ct(cell,'?',cw/2,46,40,40,30,true,C.white);}
   k.ct(cell,own?d.name:'？？？',cw/2,86,cw,18,13,true,own?C.ink:C.muted);k.ct(cell,own?GRADES[m.grade(kind)].name:JOBS[d.job].name,cw/2,102,cw,14,10,true,own?deep(gradeColor(m.grade(kind)),.6):C.muted);
   if(m.codexReady('pet:'+kind))ui.img(cell,'dot',cw-8,8,14);
   this.h.tap(cell,()=>this.open(0,kind));});
  y+=Math.ceil(kinds.length/5)*(ch+6)+2;y+=this.k.pager(p,w,y,pg,pages,n=>{this.pg[0]=n;},()=>this.open(0,null));k.ct(p,`首次获得宠物：图鉴奖励 ${CODEX_PET_REWARD.coins} 金币`,w/2,y+10,w-30,18,12,true,C.muted);return y+24;}
 private petPage(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k,ui=this.ui,d=PETS[kind],own=m.has(kind),lore=PET_LORE[kind];let y=y0+6;
  const top=ui.frame(p,'pt',w/2,y+80,w-30,160,own?'slot-'+d.rarity:'card');const s=this.h.sprite(top,'pet:'+kind,80,80,130,130);
  if(!own){const sp=s.getComponent(Sprite);if(sp)sp.color=new Color(60,52,46,255);}
  k.lt(top,own?d.name:'？？？',160,28,200,26,22,true);k.lt(top,`${JOBS[d.job].name} · ${RARITY[d.rarity].name}`,160,58,200,18,14,true,C.muted);
  k.lt(top,own?`当前品级：${GRADES[m.grade(kind)].name}　Lv.${m.petLevel(kind)}`:`获取途径：${lore?.get||'孵化屋'}`,160,84,w-200,18,13,true,own?deep(gradeColor(m.grade(kind)),.6):C.red);
  k.lt(top,`生命 ${d.hp}　攻击 ${d.atk}　防御 ${d.def}`,160,108,w-200,18,13,true,C.ink);k.lt(top,`射程 ${d.reach>30?'远程':'近战'}　攻速 ${d.aspd}`,160,130,w-200,18,13,true,C.muted);y+=170;
  {const pr=ui.frame(p,'passive',w/2,y+24,w-30,48,'card-gold');k.lt(pr,`专属被动 · ${d.passive.name}`,14,14,w-60,18,14,true,col([170,100,20]));k.lt(pr,d.passive.desc,14,33,w-60,16,12,true,C.ink);y+=54;}
  // lore
  const lc=ui.frame(p,'lore',w/2,y+44,w-30,84,'card');k.lt(lc,'档案',14,16,80,18,13,true,C.muted);const t=lore?.lore||'';for(let i=0,ly=40;i<t.length;i+=26,ly+=20)k.lt(lc,t.slice(i,i+26),14,ly,w-60,18,13,false,C.ink);y+=94;
  // skills
  const alts=skillAlts(d.job as Job);k.lt(p,'技能（天赋解锁，三选一做默认）',15,y+10,w-30,18,13,true,C.muted);y+=24;
  alts.forEach((a,i)=>{const sk=applySkillAlt(d.skill,a),row=ui.frame(p,'sk'+i,w/2,y+24,w-30,46,'card'),lock=own?m.grade(kind)<SKILL_NEED[i]:true;
   k.skillBadge(row,24,23,34,a?.icon||JOBS[d.job].icon,a?.color||[255,196,64],lock&&i>0);k.lt(row,`${sk.name}${i?` · ${GRADES[SKILL_NEED[i]].name}解锁`:' · 初始'}`,48,14,w-90,16,13,true,C.ink);k.lt(row,skillText(d.job as Job,sk),48,32,w-90,14,11,false,C.muted);y+=50;});
  y+=6;const key='pet:'+kind,ready=m.codexReady(key),got=m.codex.includes(key);
  k.btn(p,'pback','返回',w/2-120,y+24,120,44,()=>this.open(0,null),'cream',16);
  if(own)k.btn(p,'pgo','培养',w/2,y+24,110,44,()=>{this.h.close();this.hub.openPetDetail(kind);},'cream',16,'paw');
  k.btn(p,'pget',got?'已领取':ready?`领奖 ${CODEX_PET_REWARD.coins}`:'未获得',w/2+125,y+24,130,44,()=>{const b=m.claimCodex(key);if(b){m.save();this.h.refresh();this.open(0,kind);this.h.reward('图鉴奖励',{b,sub:`新收录：${PETS[kind].name}`});}},ready?'green':'grey',15);
  return y+52;}
 // ------------------------------------------------------------------ monsters
 private monIcon(p:Node,x:number,y:number,r:number,kind:MonsterKind,seen:boolean){const n=this.ui.node(p,'mi',x,y,r*2,r*2),g=n.addComponent(Graphics),boss=!!(MONSTERS[kind] as any).boss;
  g.fillColor=seen?new Color(250,240,218,255):new Color(214,204,188,255);g.circle(0,0,r);g.fill();g.strokeColor=boss?new Color(214,120,40,255):new Color(42,26,18,255);g.lineWidth=boss?4:2.5;g.circle(0,0,r);g.stroke();
  // the monster as it looks in battle (tools/monster-icons); undiscovered ones are a dark silhouette
  const a=this.ui.node(n,'art',r,r,r*2,r*2),sp=a.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;a.getComponent(UITransform)!.setContentSize(r*1.9,r*1.9);if(!seen)sp.color=new Color(60,48,44,255);
  resources.load(`battle/mon/${kind}/spriteFrame`,SpriteFrame,(e,f)=>{if(!e&&a.isValid)sp.spriteFrame=f;});
  if(!seen)this.k.ct(n,'?',r,r+r*.45,r*1.4,r*.8,r*.55,true,C.white);return n;}
 private monGrid(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui,all=this.monKinds,per=12,pages=Math.ceil(all.length/per),pg=Math.min(this.pg[1],pages-1),kinds=all.slice(pg*per,pg*per+per),cols=4,cw=(w-30-3*8)/cols,ch=96;let y=y0+6;
  kinds.forEach((kind,i)=>{const seen=m.seenMon.includes(kind),r=Math.floor(i/cols),c=i%cols,x=15+cw/2+c*(cw+8),cy=y+ch/2+r*(ch+6),cell=ui.frame(p,'mc'+kind,x,cy,cw,ch,seen?'card':'card-empty');
   this.monIcon(cell,cw/2,36,24,kind,seen);k.ct(cell,seen?MONSTERS[kind].name:'未发现',cw/2,76,cw-6,18,13,true,seen?C.ink:C.muted);if(m.codexReady('mon:'+kind))ui.img(cell,'dot',cw-8,8,14);
   this.h.tap(cell,()=>this.open(1,kind));});
  y+=Math.ceil(kinds.length/cols)*(ch+6)+4;y+=this.k.pager(p,w,y,pg,pages,n=>{this.pg[1]=n;},()=>this.open(1,null));k.ct(p,`战斗中遇到新怪物就会记录　首次发现奖励 ${CODEX_MON_REWARD.coins} 金币`,w/2,y+10,w-30,18,12,true,C.muted);return y+24;}
 private monPage(p:Node,w:number,y0:number,kind:string){const m=this.m,k=this.k,ui=this.ui,d=MONSTERS[kind as MonsterKind] as any,seen=m.seenMon.includes(kind);let y=y0+6;
  const top=ui.frame(p,'mt',w/2,y+80,w-30,160,'card');this.monIcon(top,80,80,56,kind as MonsterKind,seen);
  k.lt(top,seen?d.name:'未发现',160,28,w-200,26,22,true,d.boss?C.red:C.ink);k.lt(top,`出没：${MON_WHERE[kind]||'冒险'}`,160,58,w-200,18,13,true,C.muted);
  if(seen){k.lt(top,`生命 ${d.hp}　攻击 ${d.atk}　防御 ${d.def}`,160,84,w-200,18,13,true);k.lt(top,`${d.reach?'远程':'近战'}　移速 ${d.speed}${d.boss?'　首领':''}`,160,108,w-200,18,13,true,C.muted);}
  else k.lt(top,'在冒险中遇到它后解锁详细信息',160,90,w-200,18,13,true,C.muted);y+=170;
  if(seen){const c=ui.frame(p,'md',w/2,y+56,w-30,108,'card');k.lt(c,'特点',14,16,80,18,13,true,C.muted);const t=d.desc||(kind==='fuzz'?'成群结队的小毛球，单个很弱':kind==='shroom'?'皮厚走得慢的蘑菇怪':'头上长角的精英怪，血厚攻高');
   for(let i=0,ly=38;i<t.length&&ly<60;i+=26,ly+=20)k.lt(c,t.slice(i,i+26),14,ly,w-60,18,13,false,C.ink);k.lt(c,'应对：'+(MON_TIP[kind]||''),14,84,w-60,18,13,true,col([46,130,70]));y+=118;}
  const key='mon:'+kind,ready=m.codexReady(key),got=m.codex.includes(key);
  k.btn(p,'mback','返回',w/2-80,y+24,130,44,()=>this.open(1,null),'cream',16);
  k.btn(p,'mget',got?'已领取':ready?`领奖 ${CODEX_MON_REWARD.coins}`:'未发现',w/2+80,y+24,140,44,()=>{const b=m.claimCodex(key);if(b){m.save();this.h.refresh();this.open(1,kind);this.h.reward('图鉴奖励',{b,sub:`新发现：${d.name}`});}},ready?'green':'grey',15);return y+52;}
 // ------------------------------------------------------------------ sets
 private sets(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui;let y=y0+6;
  for(const s of SETS){const have=new Set(m.items.filter(i=>i.set===s.id).map(i=>i.slot)).size,row=ui.frame(p,'set'+s.id,w/2,y+58,w-30,112,'card');
   ui.rect(row,'band',8,56,8,96,col(s.color),false);k.lt(row,`${s.name}套装`,22,18,160,22,18,true,deep(s.color,.6));k.lt(row,`已收集部位 ${have}/8`,w-30-130,18,120,18,12,true,C.muted);
   s.bonus.forEach((b,i)=>k.lt(row,`${b.n} 件：${b.desc}`,22,44+i*20,w-60,18,13,true,C.ink));y+=118;}
  k.ct(p,'在工坊打造装备，同一套装穿够件数即可激活效果',w/2,y+8,w-30,18,12,true,C.muted);return y+24;}
}
