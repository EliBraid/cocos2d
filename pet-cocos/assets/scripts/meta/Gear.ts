// 装备 / 套装 / 品级 / 天赋 (工坊 + 宠物界面). Pure data and logic, no engine imports.
import type {Job,PetMods,PetSkill} from '../battle/BattleConfig';

export type StatKey='hp'|'atk'|'def'|'aspd'|'crit'|'critDmg'|'skill'|'cdr'|'regen';
export const STAT_KEYS:StatKey[]=['hp','atk','def','aspd','crit','critDmg','skill','cdr','regen'];
/** base = value of one "unit" of the stat; kind decides how it is shown */
export const STAT_INFO:Record<StatKey,{name:string;base:number;kind:'pct'|'flat'|'pctSec'}>={
 hp:{name:'生命',base:.05,kind:'pct'},atk:{name:'攻击',base:.04,kind:'pct'},def:{name:'防御',base:2,kind:'flat'},
 aspd:{name:'攻速',base:.03,kind:'pct'},crit:{name:'暴击率',base:.025,kind:'pct'},critDmg:{name:'暴击伤害',base:.08,kind:'pct'},
 skill:{name:'技能强度',base:.05,kind:'pct'},cdr:{name:'技能冷却',base:.02,kind:'pct'},regen:{name:'回复',base:.002,kind:'pctSec'}};
export function fmtStat(k:StatKey,v:number){const i=STAT_INFO[k];if(i.kind==='flat')return `${i.name} +${Math.round(v)}`;
 if(i.kind==='pctSec')return `${i.name} +${(v*100).toFixed(2).replace(/0$/,'')}%/秒`;
 return `${k==='cdr'?'技能冷却 -':i.name+' +'}${(v*100).toFixed(1).replace(/\.0$/,'')}%`;}
export function addMods(a:PetMods,b:PetMods){for(const k of Object.keys(b) as (keyof PetMods)[]){const v=b[k];if(typeof v==='number'&&v)a[k]=(a[k]||0)+v;}return a;}

// ---------------------------------------------------------------- 品级 (decided by the hatchery)
export const GRADES=[
 {name:'凡品',mul:1,color:[150,152,140]},{name:'良品',mul:1.06,color:[112,184,100]},{name:'上品',mul:1.13,color:[84,152,224]},
 {name:'极品',mul:1.21,color:[164,112,214]},{name:'神品',mul:1.3,color:[244,184,52]}] as const;
export const gradeColor=(g:number):[number,number,number]=>{const c=GRADES[Math.max(0,Math.min(4,g))].color;return [c[0],c[1],c[2]];};

// ---------------------------------------------------------------- 天赋 & 技能
// 品级解锁前 (grade+1) 个天赋。天赋里有两个是「技能天赋」：良品解锁第 1 个替代技能，极品解锁第 2 个；
// 每只宠物只能把其中一个设为默认技能（初始技能 / 良品技能 / 极品技能），战斗里自动释放。
export interface SkillAlt{id:string;name:string;icon:string;color:[number,number,number];cdMul:number;multMul:number;radiusMul:number;timeMul:number;targetsAdd:number;desc:string}
export interface Talent{name:string;desc:string;mods:PetMods;skill?:SkillAlt}
const alt=(id:string,name:string,icon:string,color:[number,number,number],desc:string,o:Partial<SkillAlt>):SkillAlt=>({id,name,icon,color,desc,cdMul:1,multMul:1,radiusMul:1,timeMul:1,targetsAdd:0,...o});
export const TALENTS:Record<Job,Talent[]>={
 guard:[{name:'坚韧',desc:'生命 +6%',mods:{hp:.06}},
  {name:'铁壁',desc:'解锁技能「铁壁」：护盾更厚，持续略短；防御 +3',mods:{def:3},skill:alt('g1','铁壁','lock',[196,150,86],'护盾减伤 ×1.5，持续 ×0.85，冷却 ×1.15',{multMul:1.5,timeMul:.85,cdMul:1.15})},
  {name:'厚甲',desc:'生命 +4%，防御 +5',mods:{hp:.04,def:5}},
  {name:'守护光环',desc:'解锁技能「守护光环」：范围与时间大增；每秒回复 0.2% 生命',mods:{regen:.002},skill:alt('g2','守护光环','heart',[110,190,150],'护盾范围 ×1.55，持续 ×1.4，减伤 ×0.85',{radiusMul:1.55,timeMul:1.4,multMul:.85,cdMul:1.1})},
  {name:'磐石之心',desc:'生命 +12%，防御 +6',mods:{hp:.12,def:6}}],
 warrior:[{name:'锋芒',desc:'攻击 +5%',mods:{atk:.05}},
  {name:'旋风斩',desc:'解锁技能「旋风斩」：范围大，伤害略低；攻速 +3%',mods:{aspd:.03},skill:alt('w1','旋风斩','compass',[232,120,80],'范围 ×1.45，伤害 ×0.75，冷却 ×0.9',{radiusMul:1.45,multMul:.75,cdMul:.9})},
  {name:'嗜血',desc:'暴击率 +6%，攻速 +4%',mods:{crit:.06,aspd:.04}},
  {name:'重斩',desc:'解锁技能「重斩」：单点爆发；暴击伤害 +15%',mods:{critDmg:.15},skill:alt('w2','重斩','hammer',[200,70,60],'范围 ×0.85，伤害 ×1.8，冷却 ×1.3',{radiusMul:.85,multMul:1.8,cdMul:1.3})},
  {name:'狂战',desc:'攻击 +10%，攻速 +6%',mods:{atk:.1,aspd:.06}}],
 ranged:[{name:'鹰眼',desc:'暴击率 +5%',mods:{crit:.05}},
  {name:'穿云箭',desc:'解锁技能「穿云箭」：只射 1 个目标，伤害翻倍以上；攻击 +3%',mods:{atk:.03},skill:alt('r1','穿云箭','star',[120,200,110],'目标 1 个，伤害 ×2.5，冷却 ×1.15',{targetsAdd:-2,multMul:2.5,cdMul:1.15})},
  {name:'迅捷',desc:'攻速 +6%，攻击 +5%',mods:{aspd:.06,atk:.05}},
  {name:'箭雨',desc:'解锁技能「箭雨」：多射 2 个目标；暴击伤害 +15%',mods:{critDmg:.15},skill:alt('r2','箭雨','energy',[100,170,230],'目标 +2，伤害 ×0.8',{targetsAdd:2,multMul:.8})},
  {name:'百步穿杨',desc:'攻击 +8%，暴击率 +8%',mods:{atk:.08,crit:.08}}],
 mage:[{name:'聚能',desc:'技能强度 +8%',mods:{skill:.08}},
  {name:'速射法球',desc:'解锁技能「速射法球」：冷却近乎减半，伤害较低；冷却 -3%',mods:{cdr:.03},skill:alt('m1','速射法球','energy',[240,160,70],'伤害 ×0.6，范围 ×0.8，冷却 ×0.55',{multMul:.6,radiusMul:.8,cdMul:.55})},
  {name:'灼烧',desc:'攻击 +6%，技能强度 +4%',mods:{atk:.06,skill:.04}},
  {name:'陨星',desc:'解锁技能「陨星」：大范围重击；技能强度 +5%',mods:{skill:.05},skill:alt('m2','陨星','star',[170,110,230],'范围 ×1.4，伤害 ×1.6，冷却 ×1.45',{radiusMul:1.4,multMul:1.6,cdMul:1.45})},
  {name:'奥术大师',desc:'技能强度 +14%，冷却 -8%',mods:{skill:.14,cdr:.08}}],
 support:[{name:'温柔',desc:'技能强度 +8%',mods:{skill:.08}},
  {name:'急救',desc:'解锁技能「急救」：治疗量小但冷却短；生命 +3%',mods:{hp:.03},skill:alt('s1','急救','heart',[240,130,150],'治疗 ×0.65，冷却 ×0.6',{multMul:.65,cdMul:.6})},
  {name:'灵动',desc:'技能冷却 -6%，生命 +4%',mods:{cdr:.06,hp:.04}},
  {name:'群愈',desc:'解锁技能「群愈」：治疗量大；技能强度 +6%',mods:{skill:.06},skill:alt('s2','群愈','fruit',[120,205,140],'治疗 ×1.55，冷却 ×1.4',{multMul:1.55,cdMul:1.4})},
  {name:'圣愈',desc:'技能强度 +14%，冷却 -8%，每秒回复 0.2%',mods:{skill:.14,cdr:.08,regen:.002}}],
 assassin:[{name:'锐利',desc:'暴击率 +6%',mods:{crit:.06}},
  {name:'连斩',desc:'解锁技能「连斩」：冷却大减、伤害略低；攻速 +3%',mods:{aspd:.03},skill:alt('a1','连斩','swords',[150,90,200],'伤害 ×0.7，冷却 ×0.6',{multMul:.7,cdMul:.6})},
  {name:'隐匿',desc:'闪避 +6%，攻击 +4%',mods:{dodge:.06,atk:.04}},
  {name:'绝杀',desc:'解锁技能「绝杀」：突袭范围更大、伤害极高；暴击伤害 +20%',mods:{critDmg:.2},skill:alt('a2','绝杀','target',[200,50,70],'范围 ×1.3，伤害 ×1.8，冷却 ×1.3',{radiusMul:1.3,multMul:1.8,cdMul:1.3})},
  {name:'影舞者',desc:'攻击 +10%，暴击率 +8%',mods:{atk:.1,crit:.08}}],
 summoner:[{name:'契约',desc:'技能强度 +8%',mods:{skill:.08}},
  {name:'兽群',desc:'解锁技能「兽群」：多召唤 1 只，单只属性降低；生命 +3%',mods:{hp:.03},skill:alt('u1','兽群','team',[120,180,110],'数量 +1，属性 ×0.75',{targetsAdd:1,multMul:.75})},
  {name:'灵魂链接',desc:'生命 +6%，冷却 -5%',mods:{hp:.06,cdr:.05}},
  {name:'巨兽',desc:'解锁技能「巨兽」：只召唤 1 只，但属性 ×2.4、存在更久；技能强度 +6%',mods:{skill:.06},skill:alt('u2','巨兽','paw',[200,140,70],'数量 1，属性 ×2.4，持续 ×1.4，冷却 ×1.2',{targetsAdd:-1,multMul:2.4,timeMul:1.4,cdMul:1.2})},
  {name:'万兽之主',desc:'技能强度 +14%，冷却 -8%',mods:{skill:.14,cdr:.08}}]};
export function talentMods(job:Job,grade:number){const m:PetMods={};TALENTS[job].slice(0,grade+1).forEach(t=>addMods(m,t.mods));return m;}
/** the 3 skill choices of a job: [初始技能, 良品技能, 极品技能]; `need` is the 品级 that unlocks each */
export const SKILL_NEED=[0,1,3];
export function skillAlts(job:Job):(SkillAlt|undefined)[]{const l=TALENTS[job].filter(t=>t.skill).map(t=>t.skill!);return [undefined,l[0],l[1]];}
export function skillUnlocked(grade:number,i:number){return grade>=SKILL_NEED[i];}
export function applySkillAlt(base:PetSkill,a?:SkillAlt):PetSkill{if(!a)return {...base};
 return {name:a.name,cd:Math.round(base.cd*a.cdMul*100)/100,mult:Math.round(base.mult*a.multMul*1000)/1000,radius:base.radius!==undefined?Math.round(base.radius*a.radiusMul):undefined,time:base.time!==undefined?Math.round(base.time*a.timeMul*100)/100:undefined,targets:base.targets!==undefined?Math.max(1,base.targets+a.targetsAdd):undefined};}
/** one line explaining what a skill does, built from its numbers */
export function skillText(job:Job,s:PetSkill){const p=Math.round(s.mult*100);
 switch(job){case 'warrior':return `对前方半径 ${s.radius} 内的敌人造成 ${p}% 攻击伤害并灼烧`;case 'guard':return `嘲讽周围敌人，为半径 ${s.radius} 内友军加 ${Math.round(Math.min(.7,s.mult)*100)}% 减伤 ${s.time} 秒`;
  case 'ranged':return `向 ${s.targets} 个目标各射出一箭，造成 ${p}% 攻击伤害`;case 'assassin':return `瞬移到 ${s.radius} 范围内最虚弱的敌人（优先后排）身边，造成 ${p}% 攻击伤害；击杀则冷却减半`;
  case 'summoner':return `召唤 ${s.targets} 只小分身助战 ${s.time} 秒，属性为本体的 ${p}%`;case 'mage':return `召唤范围 ${s.radius} 的法球，造成 ${p}% 攻击伤害并灼烧`;default:return `为全队恢复 ${p}% 最大生命`;}}

// ---------------------------------------------------------------- 宝石 (镶嵌在装备的孔里)
export type GemId='ruby'|'emerald'|'sapphire'|'topaz'|'amethyst'|'pearl';
export const GEMS:{id:GemId;name:string;stat:StatKey;color:[number,number,number]}[]=[
 {id:'ruby',name:'红玉',stat:'atk',color:[226,70,70]},{id:'emerald',name:'翠玉',stat:'hp',color:[70,180,100]},{id:'sapphire',name:'蓝晶',stat:'skill',color:[70,130,230]},
 {id:'topaz',name:'黄玉',stat:'def',color:[236,186,60]},{id:'amethyst',name:'紫晶',stat:'crit',color:[160,100,220]},{id:'pearl',name:'白珍珠',stat:'aspd',color:[200,206,214]}];
export const GEM_MAX=5,GEM_UNITS=[0,.6,1.2,2,3.2,5];
export const gemDef=(id:string)=>GEMS.find(g=>g.id===id);
export const gemKey=(id:GemId,lv:number)=>id+lv;
export function parseGem(k:string):{id:GemId;lv:number}|null{const m=/^([a-z]+)([1-5])$/.exec(k||'');if(!m||!gemDef(m[1]))return null;return {id:m[1] as GemId,lv:+m[2]};}
export function gemValue(id:GemId,lv:number){const g=gemDef(id)!,i=STAT_INFO[g.stat],v=i.base*GEM_UNITS[lv];return i.kind==='flat'?Math.max(1,Math.round(v)):Math.round(v*10000)/10000;}
export function gemLabel(k:string){const g=parseGem(k);if(!g)return '';return `${gemDef(g.id)!.name} Lv.${g.lv}`;}
export function gemStatText(k:string){const g=parseGem(k);if(!g)return '';return fmtStat(gemDef(g.id)!.stat,gemValue(g.id,g.lv));}
/** socket count follows the piece's quality */
export const sockets=(q:number)=>[1,1,2,2,3][Math.max(0,Math.min(4,q))];
export const GEM_COMBINE={need:3,coins:50};

// ---------------------------------------------------------------- 材料
export type MatId='wood'|'ore'|'hide'|'crystal';
export const MATS:{id:MatId;name:string;icon:string}[]=[{id:'wood',name:'木料',icon:'🪵'},{id:'ore',name:'矿石',icon:'⛏'},{id:'hide',name:'兽皮',icon:'🧶'},{id:'crystal',name:'灵晶',icon:'💎'}];
export const MAT_COLOR:Record<MatId,[number,number,number]>={wood:[176,130,78],ore:[130,140,156],hide:[204,150,110],crystal:[120,208,230]};
export type Mats=Record<MatId,number>;
export const emptyMats=():Mats=>({wood:0,ore:0,hide:0,crystal:0});

// ---------------------------------------------------------------- 装备部位
export type SlotId='helmet'|'necklace'|'armor'|'cloak'|'ring'|'charm'|'legs'|'boots';
export interface SlotDef{id:SlotId;name:string;main:StatKey;cost:Partial<Mats>}
export const EQUIP_SLOTS:SlotDef[]=[
 {id:'helmet',name:'头盔',main:'def',cost:{ore:4,hide:2}},{id:'necklace',name:'项链',main:'skill',cost:{ore:3,crystal:1}},
 {id:'armor',name:'护甲',main:'hp',cost:{hide:5,ore:2}},{id:'cloak',name:'披风',main:'critDmg',cost:{hide:4,wood:2}},
 {id:'ring',name:'戒指',main:'atk',cost:{ore:3,crystal:1}},{id:'charm',name:'护符',main:'cdr',cost:{wood:3,crystal:1}},
 {id:'legs',name:'护腿',main:'regen',cost:{hide:4,wood:2}},{id:'boots',name:'靴子',main:'aspd',cost:{hide:3,wood:3}}];
export const slotDef=(id:SlotId)=>EQUIP_SLOTS.find(s=>s.id===id)!;
export const FORGE={coins:600,bagMax:80,weights:[45,30,17,7,1],pityEvery:12,pityGrade:3,startMats:{wood:20,ore:20,hide:20,crystal:3} as Mats};
// ---- 开罐子: pay coins, get a random piece. Better jars skip the low qualities; silver and gold have a pity counter.
export type JarId='copper'|'silver'|'gold';
export interface JarDef{id:JarId;name:string;coins:number;weights:number[];color:[number,number,number];pity?:{every:number;grade:number};desc:string}
export const JARS:JarDef[]=[
 {id:'copper',name:'青铜罐',coins:1500,weights:[40,34,18,7,1],color:[196,124,64],desc:'什么都可能开出来'},
 {id:'silver',name:'白银罐',coins:5000,weights:[0,25,45,24,6],color:[168,180,198],desc:'良品起步',pity:{every:20,grade:3}},
 {id:'gold',name:'黄金罐',coins:15000,weights:[0,0,35,50,15],color:[240,188,56],desc:'上品起步',pity:{every:10,grade:4}}];
export const JAR_TEN=9; // ten opens cost nine
export const jarDef=(id:string)=>JARS.find(j=>j.id===id);
/** roll a quality from a jar's weights, never below min */
export function rollJarQuality(j:JarDef,rand:()=>number,min=0){const w=j.weights.map((x,i)=>i<min?0:x),t=w.reduce((a,b)=>a+b,0);let r=rand()*t;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return i;}return w.length-1;}
export const QUALITY=GRADES; // item quality uses the same five tiers and colours as pet grades

// ---------------------------------------------------------------- 套装
export interface SetDef{id:string;name:string;color:[number,number,number];pieces:Record<SlotId,string>;bonus:{n:number;desc:string;mods:PetMods}[]}
export const SETS:SetDef[]=[
 {id:'flame',name:'赤焰',color:[232,96,70],pieces:{helmet:'赤焰护额',necklace:'赤焰项坠',armor:'赤焰战甲',cloak:'赤焰披风',ring:'赤焰指环',charm:'赤焰护符',legs:'赤焰护腿',boots:'赤焰战靴'},
  bonus:[{n:2,desc:'攻击 +8%',mods:{atk:.08}},{n:4,desc:'暴击率 +8%，暴击伤害 +15%',mods:{crit:.08,critDmg:.15}},{n:6,desc:'攻击 +12%，技能强度 +15%',mods:{atk:.12,skill:.15}}]},
 {id:'stone',name:'磐石',color:[150,140,120],pieces:{helmet:'磐石头盔',necklace:'磐石项链',armor:'磐石重甲',cloak:'磐石斗篷',ring:'磐石戒',charm:'磐石护符',legs:'磐石护腿',boots:'磐石战靴'},
  bonus:[{n:2,desc:'生命 +10%',mods:{hp:.1}},{n:4,desc:'防御 +6，每秒回复 0.2% 生命',mods:{def:6,regen:.002}},{n:6,desc:'生命 +15%，防御 +8',mods:{hp:.15,def:8}}]},
 {id:'wind',name:'疾风',color:[96,184,150],pieces:{helmet:'疾风头巾',necklace:'疾风项链',armor:'疾风轻甲',cloak:'疾风披风',ring:'疾风指环',charm:'疾风护符',legs:'疾风护腿',boots:'疾风之靴'},
  bonus:[{n:2,desc:'攻速 +8%',mods:{aspd:.08}},{n:4,desc:'技能冷却 -10%',mods:{cdr:.1}},{n:6,desc:'攻速 +10%，暴击率 +8%',mods:{aspd:.1,crit:.08}}]},
 {id:'moon',name:'月华',color:[160,150,226],pieces:{helmet:'月华冠',necklace:'月华项链',armor:'月华长袍',cloak:'月华披风',ring:'月华指环',charm:'月华护符',legs:'月华护腿',boots:'月华之靴'},
  bonus:[{n:2,desc:'技能强度 +10%',mods:{skill:.1}},{n:4,desc:'生命 +8%，每秒回复 0.2% 生命',mods:{hp:.08,regen:.002}},{n:6,desc:'技能强度 +20%，冷却 -10%',mods:{skill:.2,cdr:.1}}]}];
export const setDef=(id:string)=>SETS.find(s=>s.id===id)!;

// ---------------------------------------------------------------- 装备
export interface Affix{k:StatKey;v:number}
export interface ItemSkill{id:ItemSkillId;v:number}
export interface Item{id:number;slot:SlotId;q:number;set:string;main:Affix;subs:Affix[];gems:string[];lv:number;fails:number;skills:ItemSkill[]}
export const baseName=(it:Item)=>setDef(it.set).pieces[it.slot];
/** name with its 强化 level, e.g. "+7 赤焰战甲" */
export const itemName=(it:Item)=>(it.lv?`+${it.lv} `:'')+baseName(it);

// ---------------------------------------------------------------- 装备技能: better quality, more and stronger skills
export type ItemSkillId='lifesteal'|'thorns'|'dodge'|'killHeal'|'siege'|'execute'|'burnHit'|'stunHit'|'startShield'|'double'|'revive';
const pctTxt=(v:number)=>`${Math.round(v*100)}%`;
export const ITEM_SKILLS:{id:ItemSkillId;name:string;icon:string;color:[number,number,number];tier:1|2|3;base:number;cap:number;slots:SlotId[];text:(v:number)=>string}[]=[
 {id:'lifesteal',name:'吸血',icon:'heart',color:[230,80,90],tier:1,base:.05,cap:.3,slots:['ring','necklace','charm'],text:v=>`造成伤害的 ${pctTxt(v)} 转为自己的生命`},
 {id:'thorns',name:'荆棘',icon:'shield',color:[120,160,90],tier:1,base:.18,cap:1,slots:['armor','cloak','helmet'],text:v=>`受到近战攻击时反弹 ${pctTxt(v)} 伤害`},
 {id:'dodge',name:'灵巧',icon:'energy',color:[90,190,210],tier:1,base:.06,cap:.4,slots:['boots','legs','cloak'],text:v=>`${pctTxt(v)} 几率闪避攻击`},
 {id:'killHeal',name:'饱餐',icon:'food',color:[230,150,60],tier:1,base:.05,cap:.3,slots:['necklace','legs','helmet'],text:v=>`击败敌人时回复 ${pctTxt(v)} 最大生命`},
 {id:'siege',name:'攻城',icon:'hammer',color:[160,120,80],tier:1,base:.2,cap:2,slots:['ring','helmet','boots'],text:v=>`对敌方水晶伤害 +${pctTxt(v)}`},
 {id:'execute',name:'斩杀',icon:'swords',color:[200,60,60],tier:2,base:.3,cap:1.5,slots:['ring','necklace','charm'],text:v=>`对生命低于 30% 的敌人伤害 +${pctTxt(v)}`},
 {id:'burnHit',name:'点燃',icon:'shard',color:[255,120,40],tier:2,base:.12,cap:.6,slots:['ring','charm','necklace'],text:v=>`攻击使敌人灼烧，每秒受到攻击力 ${pctTxt(v)} 的伤害`},
 {id:'stunHit',name:'震慑',icon:'target',color:[240,200,60],tier:2,base:.07,cap:.35,slots:['helmet','armor','legs'],text:v=>`攻击有 ${pctTxt(v)} 几率眩晕敌人 0.8 秒`},
 {id:'startShield',name:'先手护盾',icon:'shield',color:[90,150,255],tier:2,base:.3,cap:.7,slots:['armor','cloak','helmet'],text:v=>`上场后 5 秒内受到的伤害降低 ${pctTxt(v)}`},
 {id:'double',name:'连击',icon:'swords',color:[255,170,40],tier:3,base:.14,cap:.5,slots:['ring','boots','charm'],text:v=>`普通攻击有 ${pctTxt(v)} 几率连打两次`},
 {id:'revive',name:'不屈',icon:'star',color:[250,210,80],tier:3,base:.3,cap:.6,slots:['armor','necklace','charm'],text:v=>`每场战斗第一次倒下时，以 ${pctTxt(v)} 生命原地复活`}];
export const itemSkillDef=(id:string)=>ITEM_SKILLS.find(s=>s.id===id);
export const itemSkillText=(s:ItemSkill)=>{const d=itemSkillDef(s.id);return d?`${d.name}：${d.text(s.v)}`:'';};
/** how many skills and of which tiers each quality rolls: 凡品 none, 良品 1 basic, 上品 1 up to tier 2, 极品 2, 神品 2 with a tier-3 */
export const SKILL_ROLLS:number[][]=[[],[1],[2],[1,2],[2,3]];
export function rollItemSkills(slot:SlotId,q:number,rand:()=>number):ItemSkill[]{const out:ItemSkill[]=[];
 for(const maxTier of SKILL_ROLLS[Math.max(0,Math.min(4,q))]){const pool=ITEM_SKILLS.filter(s=>s.tier<=maxTier&&!out.some(o=>o.id===s.id)),prefer=pool.filter(s=>s.slots.includes(slot)&&s.tier===maxTier),from=prefer.length&&rand()<.7?prefer:pool;
  const d=from[Math.min(from.length-1,Math.floor(rand()*from.length))];if(!d)continue;out.push({id:d.id,v:Math.round(d.base*(.6+.25*q)*(.9+rand()*.2)*1000)/1000});}
 return out;}

// ---------------------------------------------------------------- 强化: +1..+15. Safe up to +5; from +6 a failure drops a level; from +10 a failure can shatter the piece
export const ENHANCE={max:15,mainPer:.08,subPer:.03,dropFrom:6,breakFrom:10,pityStep:.05,
 rates:[1,1,1,1,1,.9,.8,.7,.6,.5,.45,.4,.35,.3,.25] as number[],breaks:[0,0,0,0,0,0,0,0,0,0,.3,.35,.4,.45,.5] as number[]};
/** success chance for going from it.lv to it.lv+1 (each failure on this piece adds a little) */
export const enhanceRate=(it:Item)=>it.lv>=ENHANCE.max?0:Math.min(1,ENHANCE.rates[it.lv]+it.fails*ENHANCE.pityStep);
/** chance that a failed attempt shatters the piece */
export const breakChance=(it:Item)=>ENHANCE.breaks[Math.min(ENHANCE.max-1,it.lv)]||0;
export const enhanceCost=(it:Item)=>({coins:Math.round((60+it.lv*45)*(1+it.q*.25)),mats:{ore:2+it.lv,...(it.lv>=7?{crystal:1+Math.floor((it.lv-7)/3)}:{})} as Partial<Mats>});
/** 灵晶 spent to keep the level and the piece safe on failure */
export const protectCost=(it:Item)=>it.lv>=ENHANCE.dropFrom?2+Math.floor((it.lv-ENHANCE.dropFrom)/2):0;
/** every roll is random: quality, set, sub-stats and their values */
export function rollItem(id:number,slot:SlotId,q:number,rand:()=>number):Item{
 const d=slotDef(slot),set=SETS[Math.min(SETS.length-1,Math.floor(rand()*SETS.length))].id;
 const val=(k:StatKey,mul:number,spread:number)=>{const i=STAT_INFO[k];const v=i.base*mul*(1-spread+rand()*spread*2);return i.kind==='flat'?Math.max(1,Math.round(v)):Math.round(v*10000)/10000;};
 const main:Affix={k:d.main,v:val(d.main,1.5*(1+.5*q),.1)};
 const pool=STAT_KEYS.filter(k=>k!==d.main),subs:Affix[]=[];const n=Math.min(4,q+1);
 while(subs.length<n&&pool.length){const k=pool.splice(Math.min(pool.length-1,Math.floor(rand()*pool.length)),1)[0];subs.push({k,v:val(k,.5+.2*q,.4)});}
 return {id,slot,q,set,main,subs,gems:Array(sockets(q)).fill(''),lv:0,fails:0,skills:rollItemSkills(slot,q,rand)};}
/** a small seeded generator, used to give skills to pieces saved before skills existed */
export const seeded=(seed:number)=>{let s=(seed*2654435761)>>>0||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};};
export function rollQuality(rand:()=>number,min=0){const w=FORGE.weights.map((x,i)=>i<min?0:x),t=w.reduce((a,b)=>a+b,0);let r=rand()*t;for(let i=0;i<w.length;i++){r-=w[i];if(r<0)return i;}return w.length-1;}
/** stat lines with the 强化 bonus applied (main first) */
export function itemLines(it:Item){const lv=it.lv||0;return [it.main,...it.subs].map((a,i)=>fmtStat(a.k,a.v*(1+(i?ENHANCE.subPer:ENHANCE.mainPer)*lv)));}
/** all equipment skills of a set of worn pieces, summed per skill and capped, strongest tier first */
export function skillTotals(items:Item[]){const map=new Map<string,{id:ItemSkillId;v:number;from:{name:string;v:number}[]}>();
 for(const it of items)for(const sk of it.skills||[]){const e=map.get(sk.id)||{id:sk.id,v:0,from:[]};e.v+=sk.v;e.from.push({name:itemName(it),v:sk.v});map.set(sk.id,e);}
 return Array.from(map.values()).map(e=>({...e,v:Math.min(e.v,itemSkillDef(e.id)!.cap)})).sort((a,b)=>itemSkillDef(b.id)!.tier-itemSkillDef(a.id)!.tier||b.v-a.v);}
export const skillNames=(it:Item)=>(it.skills||[]).map(x=>itemSkillDef(x.id)?.name||'').join('、');
export function itemMods(it:Item){const m:PetMods={},lv=it.lv||0;addMods(m,{[it.main.k]:it.main.v*(1+ENHANCE.mainPer*lv)});for(const s of it.subs)addMods(m,{[s.k]:s.v*(1+ENHANCE.subPer*lv)});for(const sk of it.skills||[])addMods(m,{[sk.id]:sk.v});for(const k of it.gems){const g=parseGem(k);if(g)addMods(m,{[gemDef(g.id)!.stat]:gemValue(g.id,g.lv)});}return m;}
export function itemPower(it:Item){let p=(it.lv||0)*.9;p+=it.main.v/STAT_INFO[it.main.k].base*ENHANCE.mainPer*(it.lv||0);for(const sk of it.skills||[])p+=(itemSkillDef(sk.id)?.tier||1)*2.5;for(const a of [it.main,...it.subs])p+=a.v/STAT_INFO[a.k].base;for(const k of it.gems){const g=parseGem(k);if(g)p+=GEM_UNITS[g.lv]*.8;}return Math.round(p*10);}
export function setCounts(items:Item[]){const c:Record<string,number>={};for(const it of items)c[it.set]=(c[it.set]||0)+1;return c;}
export function setMods(items:Item[]){const m:PetMods={},c=setCounts(items);for(const s of SETS)for(const b of s.bonus)if((c[s.id]||0)>=b.n)addMods(m,b.mods);return m;}
export function dismantleYield(it:Item):{mats:Partial<Mats>;coins:number;gems:string[]}{const mats:Partial<Mats>={};for(const [k,v] of Object.entries(slotDef(it.slot).cost) as [MatId,number][])mats[k]=Math.max(1,Math.floor(v*.5));if(it.q>=3)mats.crystal=(mats.crystal||0)+it.q-2;return {mats,coins:20*(it.q+1),gems:it.gems.filter(Boolean)};}
// ---------------------------------------------------------------- 冒险掉落: 每章主打不同的材料和宝石
export interface DropLine{id:MatId;min:number;max:number}
export const CHAPTER_DROPS:{mats:DropLine[];gems:GemId[];note:string}[]=[
 {mats:[{id:'wood',min:2,max:4},{id:'hide',min:1,max:2},{id:'ore',min:0,max:1}],gems:['ruby','emerald'],note:'木料为主'},
 {mats:[{id:'hide',min:2,max:4},{id:'wood',min:1,max:2},{id:'ore',min:1,max:2}],gems:['emerald','sapphire'],note:'兽皮为主'},
 {mats:[{id:'ore',min:2,max:4},{id:'hide',min:1,max:2},{id:'wood',min:0,max:1}],gems:['topaz','ruby'],note:'矿石为主'},
 {mats:[{id:'ore',min:2,max:3},{id:'hide',min:2,max:3},{id:'wood',min:1,max:2}],gems:['amethyst','pearl','sapphire'],note:'矿石、兽皮'},
 {mats:[{id:'wood',min:3,max:5},{id:'hide',min:2,max:3},{id:'crystal',min:0,max:1}],gems:['emerald','pearl'],note:'木料、灵晶'},
 {mats:[{id:'ore',min:3,max:5},{id:'crystal',min:0,max:1},{id:'hide',min:1,max:2}],gems:['sapphire','pearl'],note:'矿石、灵晶'},
 {mats:[{id:'hide',min:3,max:5},{id:'ore',min:2,max:3},{id:'crystal',min:0,max:1}],gems:['amethyst','ruby'],note:'兽皮、灵晶'},
 {mats:[{id:'ore',min:3,max:4},{id:'hide',min:3,max:4},{id:'wood',min:2,max:3},{id:'crystal',min:1,max:1}],gems:['topaz','amethyst','pearl'],note:'全材料'}];
/** materials dropped by a battle: chapter decides which ones; boss stages and 3-star clears give 灵晶; a lost fight pays 40% */
export function battleDrops(chapter:number,stars:number,win:boolean,boss:boolean,rand:()=>number):Mats{const m=emptyMats(),t=CHAPTER_DROPS[Math.max(0,Math.min(CHAPTER_DROPS.length-1,chapter-1))];
 for(const l of t.mats){const n=l.min+Math.floor(rand()*(l.max-l.min+1));m[l.id]=win?n+(stars>=3?1:0):Math.floor(n*.4);}
 if(win&&(boss||stars>=3||rand()<.2))m.crystal=boss?2:1;return m;}
/** gems dropped by a battle: {gemKey: count}. only wins drop them; bosses always, 3 stars more often, later chapters can drop Lv.2 */
export function gemDrops(chapter:number,stars:number,win:boolean,boss:boolean,rand:()=>number):Record<string,number>{const out:Record<string,number>={};if(!win)return out;
 const t=CHAPTER_DROPS[Math.max(0,Math.min(CHAPTER_DROPS.length-1,chapter-1))],n=(boss?1:0)+(rand()<.3+(stars>=3?.25:0)?1:0);
 for(let i=0;i<n;i++){const id=t.gems[Math.min(t.gems.length-1,Math.floor(rand()*t.gems.length))],lv=Math.min(5,(boss?2:1)+(chapter>=3&&rand()<.15?1:0)+(chapter>=5?1:0)+(chapter>=7&&rand()<.3?1:0));const k=gemKey(id,lv);out[k]=(out[k]||0)+1;}return out;}
