// Tunable numbers for the real-time core battle (rules: 萌宠守卫战 游戏设计文档 · 战斗系统).
// Board coordinates are design pixels of the 540x960 portrait screen (y grows downward); 1 格 = 50 px.
export const GRID=50;
export type Job='guard'|'warrior'|'ranged'|'mage'|'support'|'assassin'|'summoner';
/** gear / talent modifiers a pet brings into battle (fractions unless noted) */
export interface PetMods{hp?:number;atk?:number;def?:number;aspd?:number;crit?:number;critDmg?:number;skill?:number;cdr?:number;regen?:number;
 /** equipment skills (装备技能), fractions: */
 lifesteal?:number;thorns?:number;dodge?:number;killHeal?:number;siege?:number;execute?:number;burnHit?:number;stunHit?:number;startShield?:number;double?:number;revive?:number;
 /** team-wide passives (summed over living pets on the field) */
 auraAtk?:number;auraDef?:number;teamRegen?:number;goldKill?:number;
 /** summoner passives */
 summonPlus?:number;summonLife?:number}
export type Rarity='common'|'fine'|'rare'|'epic'|'legend';
export type CaptainKind='firerain'|'sprout'|'freeze';
export const JOBS:Record<Job,{name:string;icon:string}>={guard:{name:'守卫',icon:'shield'},warrior:{name:'战士',icon:'swords'},ranged:{name:'射手',icon:'target'},mage:{name:'法师',icon:'energy'},support:{name:'辅助',icon:'heart'},assassin:{name:'刺客',icon:'shard'},summoner:{name:'召唤师',icon:'paw'}};
// Deploy price and card cooldown by rarity (设计文档 · 金币、上阵与成长).
export const RARITY:Record<Rarity,{name:string;cost:number;cd:number}>={
 common:{name:'普通',cost:50,cd:6},fine:{name:'优秀',cost:75,cd:8},rare:{name:'稀有',cost:100,cd:10},epic:{name:'史诗',cost:150,cd:14},legend:{name:'传说',cost:200,cd:18}};
// Six fixed slots on our half: three in front, three behind.
export const SLOTS:{x:number;y:number;row:'front'|'back'}[]=[
 {x:150,y:548,row:'front'},{x:270,y:548,row:'front'},{x:390,y:548,row:'front'},
 {x:150,y:636,row:'back'},{x:270,y:636,row:'back'},{x:390,y:636,row:'back'}];
export const BATTLE={
 duration:240,                       // seconds; surviving the timer is a (lesser) victory
 mode:'siege' as 'siege'|'defend',   // siege: warriors push the enemy core when the field is clear
 board:{left:28,right:512,top:150,bottom:780},
 myCore:{x:270,y:722,hp:10000,radius:46},
 enemyCore:{x:270,y:212,hp:9000,radius:46},
 portals:[{x:104,y:262},{x:436,y:262}],
 startGold:150,
 income:{every:5,amount:20},
 goldMul:.75,                         // kill gold = monster gold x goldMul (keeps gold scarce: levels and cards compete)         // our core produces gold ("阳光")
 maxLevel:15,
 xpToNext:(level:number)=>20+10*(level-1),   // team-wide level, shared XP
 skillNodes:[3,5,8,12],              // (legacy, unused by the battle now that pets level on their own)
 captain:{cooldown:25,firerain:{radius:95,dmg:300,perLevel:30,burnRatio:.12,burnTime:3},sprout:{heal:.3},freeze:{radius:110,time:2,bossRatio:.3}},
 spawn:{first:2.2,startInterval:2.6,endInterval:.85,waveEvery:30,waveSize:4,eliteEvery:45,rageBelow:.5,rageMult:1.35},
 monsterGrowth:100,                  // stats x (1 + elapsed/monsterGrowth)
 deadLinger:1,                       // seconds a fallen pet stays visible
};
export interface PetSkill{name:string;cd:number;mult:number;radius?:number;time?:number;targets?:number}
export interface PetDef{id:string;name:string;job:Job;rarity:Rarity;hp:number;atk:number;def:number;aspd:number;reach:number;move:number;dhp:number;datk:number;ddef:number;radius:number;windup:number;
 leash:number;splash?:number;skill:PetSkill;passive:Passive}
/** 专属被动: every pet has one; numbers are PetMods merged into the pet's own mods in battle */
export interface Passive{name:string;desc:string;mods:PetMods}
// reach/leash/radius are px. Numbers for the five job pets are prototype values until the 宠物设计表 is final.
export const PETS:Record<string,PetDef>={
 fox:{id:'W04',name:'赤焰小狐',job:'warrior',rarity:'epic',hp:1080,atk:112,def:20,aspd:1.15,reach:14,move:2.8,dhp:95,datk:12,ddef:2,radius:20,windup:.29,leash:150,
  skill:{name:'焰刃',cd:8,mult:1.6,radius:92},passive:{name:'炎心',desc:'击败敌人时回复 6% 生命，攻击使敌人灼烧',mods:{killHeal:.06,burnHit:.08}}},
 turtle:{id:'G01',name:'盾甲龟',job:'guard',rarity:'common',hp:1700,atk:45,def:40,aspd:.8,reach:14,move:2.2,dhp:150,datk:5,ddef:3,radius:22,windup:.35,leash:240,
  skill:{name:'岩盾',cd:12,mult:.45,radius:140,time:4},passive:{name:'龟甲',desc:'受到近战攻击时反弹 25% 伤害',mods:{thorns:.25}}},
 sparrow:{id:'R01',name:'栗栗雀',job:'ranged',rarity:'common',hp:600,atk:85,def:6,aspd:1.2,reach:175,move:2.6,dhp:50,datk:10,ddef:1,radius:16,windup:.3,leash:0,
  skill:{name:'连珠箭',cd:7,mult:1.3,targets:3},passive:{name:'连珠',desc:'普通攻击有 12% 几率连射两次',mods:{double:.12}}},
 chick:{id:'M01',name:'火苗鸡',job:'mage',rarity:'common',hp:540,atk:78,def:5,aspd:.85,reach:150,move:2.6,dhp:48,datk:9,ddef:1,radius:16,windup:.4,leash:0,splash:55,
  skill:{name:'火球',cd:9,mult:2,radius:70},passive:{name:'火苗',desc:'攻击使敌人灼烧，每秒受到 10% 攻击力的伤害',mods:{burnHit:.1}}},
 cat:{id:'S01',name:'芽芽猫',job:'support',rarity:'common',hp:720,atk:40,def:8,aspd:.9,reach:150,move:2.6,dhp:60,datk:4,ddef:1,radius:17,windup:.3,leash:0,
  skill:{name:'治愈之光',cd:10,mult:.18},passive:{name:'芽芽光环',desc:'在场时全队每秒回复 0.2% 生命',mods:{teamRegen:.002}}},
 dog:{id:'W01',name:'团团犬',job:'warrior',rarity:'common',hp:1000,atk:95,def:15,aspd:1.2,reach:14,move:2.8,dhp:85,datk:10,ddef:2,radius:19,windup:.28,leash:150,
  skill:{name:'团团冲击',cd:8,mult:1.4,radius:80},passive:{name:'冲劲',desc:'上场后 5 秒内受到的伤害降低 30%',mods:{startShield:.3}}},
 mossdragon:{id:'G02',name:'苔藓龙',job:'guard',rarity:'fine',hp:1500,atk:55,def:32,aspd:.85,reach:14,move:2.3,dhp:135,datk:6,ddef:3,radius:22,windup:.35,leash:240,
  skill:{name:'苔藓护盾',cd:11,mult:.4,radius:140,time:4},passive:{name:'苔藓甲',desc:'在场时全队受到的伤害降低 5%',mods:{auraDef:.05}}},
 penguin:{id:'R02',name:'冰豆企鹅',job:'ranged',rarity:'fine',hp:560,atk:92,def:6,aspd:1.1,reach:170,move:2.6,dhp:48,datk:11,ddef:1,radius:16,windup:.3,leash:0,
  skill:{name:'冰雪连射',cd:7,mult:1.3,targets:3},passive:{name:'冰豆',desc:'攻击有 8% 几率冻住敌人 0.8 秒',mods:{stunHit:.08}}},
 bunny:{id:'M02',name:'月绒兔',job:'mage',rarity:'rare',hp:520,atk:95,def:5,aspd:.8,reach:155,move:2.6,dhp:46,datk:11,ddef:1,radius:16,windup:.4,leash:0,splash:60,
  skill:{name:'月光术',cd:9,mult:2.2,radius:80},passive:{name:'月光',desc:'技能强度 +15%',mods:{skill:.15}}},
 deer:{id:'S02',name:'铃铛鹿',job:'support',rarity:'rare',hp:760,atk:45,def:8,aspd:.9,reach:150,move:2.6,dhp:62,datk:4,ddef:1,radius:18,windup:.3,leash:0,
  skill:{name:'铃音祝福',cd:9,mult:.2},passive:{name:'铃音',desc:'在场时全队攻击 +5%',mods:{auraAtk:.05}}},
 // ---- 第二批: 20 只新伙伴 (含刺客、召唤师两个新职业)
 hedgehog:{id:'N01',name:'刺刺猬',job:'guard',rarity:'fine',hp:1550,atk:50,def:36,aspd:.85,reach:14,move:2.2,dhp:140,datk:5,ddef:3,radius:21,windup:.35,leash:240,skill:{name:'刺球护盾',cd:11,mult:.42,radius:140,time:4},passive:{name:'满身尖刺',desc:'受到近战攻击时反弹 35% 伤害',mods:{thorns:.35}}},
 bear:{id:'N02',name:'蜂蜜熊',job:'guard',rarity:'epic',hp:2100,atk:62,def:44,aspd:.8,reach:14,move:2.1,dhp:185,datk:6,ddef:4,radius:24,windup:.38,leash:240,skill:{name:'熊抱',cd:12,mult:.5,radius:150,time:4.5},passive:{name:'暖暖熊抱',desc:'在场时全队受到的伤害降低 8%，自身生命 +10%',mods:{auraDef:.08,hp:.1}}},
 tiger:{id:'N03',name:'小虎崽',job:'warrior',rarity:'rare',hp:1050,atk:118,def:17,aspd:1.15,reach:14,move:2.9,dhp:92,datk:13,ddef:2,radius:20,windup:.28,leash:160,skill:{name:'虎扑',cd:8,mult:1.7,radius:90},passive:{name:'虎威',desc:'对生命低于 30% 的敌人伤害 +40%',mods:{execute:.4}}},
 boar:{id:'N04',name:'冲冲猪',job:'warrior',rarity:'common',hp:1150,atk:88,def:18,aspd:1.05,reach:14,move:2.7,dhp:98,datk:9,ddef:2,radius:21,windup:.3,leash:150,skill:{name:'野猪冲撞',cd:9,mult:1.35,radius:85},passive:{name:'横冲直撞',desc:'攻击有 10% 几率撞晕敌人 0.8 秒',mods:{stunHit:.1}}},
 wolf:{id:'N05',name:'银月狼',job:'warrior',rarity:'legend',hp:1250,atk:138,def:22,aspd:1.25,reach:14,move:3,dhp:110,datk:15,ddef:2,radius:21,windup:.26,leash:170,skill:{name:'月牙斩',cd:7,mult:1.9,radius:100},passive:{name:'狼群',desc:'在场时全队攻击 +10%；自身攻击有 15% 几率连击',mods:{auraAtk:.1,double:.15}}},
 squirrel:{id:'N06',name:'松果鼠',job:'ranged',rarity:'common',hp:560,atk:80,def:5,aspd:1.3,reach:165,move:2.7,dhp:46,datk:9,ddef:1,radius:15,windup:.28,leash:0,skill:{name:'松果连发',cd:7,mult:1.2,targets:3},passive:{name:'囤囤松果',desc:'普通攻击有 15% 几率连射两次',mods:{double:.15}}},
 owl:{id:'N07',name:'夜枭',job:'ranged',rarity:'rare',hp:600,atk:100,def:6,aspd:1.05,reach:185,move:2.6,dhp:50,datk:12,ddef:1,radius:16,windup:.32,leash:0,skill:{name:'夜袭箭',cd:8,mult:1.5,targets:2},passive:{name:'夜视',desc:'暴击率 +12%，暴击伤害 +30%',mods:{crit:.12,critDmg:.3}}},
 frog:{id:'N08',name:'跳跳蛙',job:'ranged',rarity:'fine',hp:580,atk:86,def:6,aspd:1.15,reach:160,move:2.8,dhp:48,datk:10,ddef:1,radius:16,windup:.3,leash:0,skill:{name:'毒舌',cd:7,mult:1.3,targets:3},passive:{name:'毒液',desc:'攻击使敌人中毒，每秒受到 14% 攻击力的伤害',mods:{burnHit:.14}}},
 seal:{id:'N09',name:'泡泡海豹',job:'mage',rarity:'fine',hp:560,atk:84,def:6,aspd:.85,reach:150,move:2.5,dhp:47,datk:10,ddef:1,radius:17,windup:.4,leash:0,splash:55,skill:{name:'泡泡雨',cd:9,mult:1.9,radius:80},passive:{name:'冰泡泡',desc:'攻击有 10% 几率把敌人困在泡泡里 0.8 秒',mods:{stunHit:.1}}},
 stardragon:{id:'N10',name:'小星龙',job:'mage',rarity:'legend',hp:620,atk:112,def:7,aspd:.85,reach:165,move:2.6,dhp:52,datk:14,ddef:1,radius:18,windup:.4,leash:0,splash:65,skill:{name:'星陨',cd:9,mult:2.6,radius:90},passive:{name:'星辰之力',desc:'技能强度 +25%，攻击使敌人灼烧',mods:{skill:.25,burnHit:.15}}},
 sheep:{id:'N11',name:'绵绵羊',job:'support',rarity:'common',hp:780,atk:38,def:9,aspd:.9,reach:150,move:2.5,dhp:64,datk:4,ddef:1,radius:18,windup:.3,leash:0,skill:{name:'软绵绵',cd:10,mult:.17},passive:{name:'羊毛毯',desc:'在场时全队每秒回复 0.3% 生命',mods:{teamRegen:.003}}},
 panda:{id:'N12',name:'竹子熊猫',job:'support',rarity:'epic',hp:900,atk:48,def:12,aspd:.9,reach:150,move:2.4,dhp:72,datk:5,ddef:2,radius:20,windup:.32,leash:0,skill:{name:'竹叶茶',cd:9,mult:.24},passive:{name:'悠闲时光',desc:'在场时全队每秒回复 0.4% 生命、受到的伤害降低 5%',mods:{teamRegen:.004,auraDef:.05}}},
 weasel:{id:'N13',name:'影鼬',job:'assassin',rarity:'common',hp:720,atk:98,def:8,aspd:1.3,reach:14,move:3.4,dhp:62,datk:11,ddef:1,radius:16,windup:.22,leash:999,skill:{name:'影袭',cd:7,mult:2,radius:260},passive:{name:'影步',desc:'15% 几率闪避攻击',mods:{dodge:.15}}},
 bat:{id:'N14',name:'蝠蝠',job:'assassin',rarity:'fine',hp:700,atk:102,def:7,aspd:1.3,reach:14,move:3.5,dhp:60,datk:12,ddef:1,radius:16,windup:.22,leash:999,skill:{name:'夜翼突袭',cd:7,mult:2.1,radius:280},passive:{name:'吸血',desc:'造成伤害的 15% 转为自己的生命',mods:{lifesteal:.15}}},
 ninjacat:{id:'N15',name:'忍者猫',job:'assassin',rarity:'rare',hp:740,atk:115,def:8,aspd:1.35,reach:14,move:3.5,dhp:64,datk:13,ddef:1,radius:16,windup:.2,leash:999,skill:{name:'暗影手里剑',cd:6.5,mult:2.3,radius:280},passive:{name:'暗杀',desc:'对生命低于 30% 的敌人伤害 +60%',mods:{execute:.6}}},
 snowfox:{id:'N16',name:'雪狐',job:'assassin',rarity:'epic',hp:800,atk:128,def:9,aspd:1.35,reach:14,move:3.6,dhp:68,datk:14,ddef:1,radius:17,windup:.2,leash:999,skill:{name:'霜刃',cd:6.5,mult:2.5,radius:300},passive:{name:'雪落无声',desc:'暴击率 +20%，击败敌人时回复 10% 生命',mods:{crit:.2,killHeal:.1}}},
 hamster:{id:'N17',name:'仓鼠团长',job:'summoner',rarity:'common',hp:640,atk:52,def:6,aspd:.95,reach:150,move:2.5,dhp:54,datk:6,ddef:1,radius:16,windup:.32,leash:0,skill:{name:'鼠鼠集合',cd:10,mult:.4,time:12,targets:2},passive:{name:'鼠多势众',desc:'每次多召唤 1 只小分身',mods:{summonPlus:1}}},
 mole:{id:'N18',name:'鼹鼠矿工',job:'summoner',rarity:'fine',hp:700,atk:56,def:8,aspd:.9,reach:150,move:2.4,dhp:58,datk:6,ddef:1,radius:17,windup:.34,leash:0,skill:{name:'地道援军',cd:10,mult:.45,time:12,targets:2},passive:{name:'挖得深',desc:'召唤物存在时间 +50%',mods:{summonLife:.5}}},
 butterfly:{id:'N19',name:'蝶仙子',job:'summoner',rarity:'rare',hp:620,atk:60,def:6,aspd:1,reach:155,move:2.7,dhp:52,datk:7,ddef:1,radius:15,windup:.3,leash:0,skill:{name:'花蝶飞舞',cd:9,mult:.45,time:12,targets:2},passive:{name:'花粉',desc:'在场时全队每秒回复 0.2% 生命，技能强度 +10%',mods:{teamRegen:.002,skill:.1}}},
 octopus:{id:'N20',name:'小章鱼',job:'summoner',rarity:'epic',hp:760,atk:66,def:8,aspd:.95,reach:155,move:2.4,dhp:62,datk:8,ddef:1,radius:18,windup:.34,leash:0,skill:{name:'触手召唤',cd:10,mult:.55,time:13,targets:2},passive:{name:'八爪鱼',desc:'每次多召唤 1 只小分身，召唤物存在时间 +25%',mods:{summonPlus:1,summonLife:.25}}}
};
export type PetKind=keyof typeof PETS;
/** 羁绊: when every listed pet is in the lineup, the whole lineup gets the bonus */
export interface Bond{id:string;name:string;pets:string[];desc:string;mods:PetMods}
export const BONDS:Bond[]=[
 {id:'forest',name:'森林守护',pets:['fox','turtle','cat'],desc:'全队生命 +8%',mods:{hp:.08}},
 {id:'charge',name:'冲锋小队',pets:['dog','boar','tiger'],desc:'全队攻击 +8%',mods:{atk:.08}},
 {id:'sky',name:'天空之眼',pets:['sparrow','owl','bat'],desc:'全队暴击率 +8%',mods:{crit:.08}},
 {id:'ice',name:'冰雪伙伴',pets:['penguin','seal','snowfox'],desc:'全队攻速 +8%',mods:{aspd:.08}},
 {id:'moon',name:'月夜',pets:['bunny','wolf','ninjacat'],desc:'全队暴击伤害 +20%',mods:{critDmg:.2}},
 {id:'tea',name:'竹林茶会',pets:['panda','sheep','deer'],desc:'全队每秒回复 0.3% 生命',mods:{regen:.003}},
 {id:'flame',name:'火焰之心',pets:['fox','chick','stardragon'],desc:'全队技能强度 +12%',mods:{skill:.12}},
 {id:'under',name:'地下王国',pets:['mole','hamster','hedgehog'],desc:'全队防御 +6，生命 +5%',mods:{def:6,hp:.05}},
 {id:'garden',name:'花园派对',pets:['butterfly','cat','frog'],desc:'全队技能冷却 -8%',mods:{cdr:.08}},
 {id:'sea',name:'深海来客',pets:['octopus','seal'],desc:'全队吸血 5%',mods:{lifesteal:.05}},
 {id:'bears',name:'熊熊组合',pets:['bear','panda'],desc:'全队生命 +10%',mods:{hp:.1}},
 {id:'hunt',name:'雪原猎手',pets:['wolf','snowfox'],desc:'全队攻击 +10%',mods:{atk:.1}}];
export const activeBonds=(deck:string[])=>BONDS.filter(b=>b.pets.every(k=>deck.includes(k)));
export const bondsOf=(kind:string)=>BONDS.filter(b=>b.pets.includes(kind));
export const DECK:PetKind[]=['turtle','fox','sparrow','chick','cat'];
// monster xp is in team-XP points (设计文档: 普通 10 / 精英 50 / 首领 150)
export const MONSTERS={
 fuzz:{name:'毛球怪',hp:220,atk:38,def:5,aspd:1,speed:34,radius:16,gold:8,xp:10,aggro:60,windup:.25},
 shroom:{name:'蘑菇怪',hp:420,atk:26,def:12,aspd:.8,speed:26,radius:19,gold:12,xp:12,aggro:60,windup:.3},
 elite:{name:'角魔',hp:1600,atk:90,def:20,aspd:.7,speed:24,radius:26,gold:40,xp:50,aggro:120,windup:.35},
 // ---- mechanic monsters, introduced chapter by chapter (see STAGES). skin/tint/scale reuse the three minion skins.
 armor:{name:'铁壳怪',hp:500,atk:30,def:12,aspd:.8,speed:24,radius:20,gold:18,xp:18,aggro:60,windup:.3,skin:'shroom',tint:[175,205,240],scale:1.1,tag:'盾',desc:'硬壳：受到远程攻击的伤害减少 35%，近战更有效'},
 healer:{name:'疗愈菇',hp:340,atk:14,def:4,aspd:.7,speed:24,radius:17,gold:20,xp:20,aggro:50,windup:.3,skin:'shroom',tint:[150,255,165],scale:.9,tag:'疗',desc:'每 3 秒治疗身边的怪物（6%），应优先击杀'},
 dasher:{name:'突袭怪',hp:300,atk:46,def:4,aspd:1.1,speed:44,radius:15,gold:18,xp:18,aggro:60,windup:.22,skin:'fuzz',tint:[255,150,115],scale:.95,tag:'袭',desc:'无视前排，直奔后排的射手、法师和辅助'},
 bomber:{name:'爆裂怪',hp:240,atk:22,def:3,aspd:1,speed:36,radius:16,gold:18,xp:18,aggro:60,windup:.25,skin:'fuzz',tint:[255,85,70],scale:1.1,tag:'爆',desc:'死亡时爆炸，伤害周围宠物，最好在远处击杀'},
 summoner:{name:'召唤怪',hp:440,atk:24,def:8,aspd:.7,speed:22,radius:21,gold:26,xp:26,aggro:60,windup:.3,skin:'shroom',tint:[205,165,255],scale:1.2,tag:'召',desc:'每 9 秒召唤 2 只小毛球（最多 3 次）'},
 warden:{name:'岩盾卫',hp:1200,atk:42,def:30,aspd:.7,speed:20,radius:24,gold:30,xp:40,aggro:150,windup:.35,skin:'elite',tint:[150,175,215],scale:1.25,tag:'护',desc:'守在水晶前。它活着时敌方水晶受到的伤害减半，先打掉它'},
 caster:{name:'暗影法师',hp:420,atk:52,def:4,aspd:.5,speed:24,radius:17,gold:22,xp:22,aggro:185,windup:.5,reach:165,splash:55,skin:'shroom',tint:[175,120,255],scale:1,tag:'法',desc:'躲在后排远程施法，一打一片'},
 archer:{name:'刺球弓手',hp:300,atk:32,def:4,aspd:.9,speed:28,radius:16,gold:14,xp:14,aggro:175,windup:.3,reach:150,skin:'fuzz',tint:[150,220,120],scale:.95,tag:'弓',desc:'远程射击，躲在近战怪后面'},
 stunner:{name:'雷击怪',hp:340,atk:30,def:5,aspd:.8,speed:28,radius:17,gold:24,xp:24,aggro:60,windup:.3,skin:'fuzz',tint:[255,238,110],scale:1,tag:'雷',desc:'每 7 秒电击最近的宠物，使其眩晕 1.1 秒'},

 // ---- 第 5-8 章的机制怪
 splitter:{name:'分裂史莱姆',hp:460,atk:28,def:6,aspd:.9,speed:28,radius:20,gold:18,xp:18,aggro:60,windup:.28,skin:'fuzz',tint:[150,220,150],scale:1.15,tag:'裂',desc:'死亡时分裂成 2 只小史莱姆，用范围伤害一起清掉'},
 frost:{name:'冰霜怪',hp:420,atk:34,def:8,aspd:.8,speed:24,radius:19,gold:22,xp:22,aggro:60,windup:.3,skin:'shroom',tint:[170,225,255],scale:1.05,tag:'冰',desc:'攻击会冻住宠物 0.6 秒，多带治疗和守卫'},
 ghost:{name:'幽灵',hp:360,atk:40,def:4,aspd:1,speed:32,radius:17,gold:22,xp:22,aggro:60,windup:.25,skin:'fuzz',tint:[200,200,235],scale:1,tag:'灵',desc:'35% 几率闪避远程攻击，近战和技能能打中它'},
 starmage:{name:'星术士',hp:500,atk:30,def:6,aspd:.7,speed:22,radius:19,gold:28,xp:28,aggro:180,windup:.4,reach:150,skin:'shroom',tint:[255,214,120],scale:1.15,tag:'星',desc:'每 5 秒给身边怪物套上星光护盾（受伤 -50%，2 秒），优先击杀'},
 // ---- chapter bosses: appear once on the last stage of a chapter; defeating one wins the stage
 boss1:{name:'苔藓巨菇',hp:9000,atk:70,def:18,aspd:.6,speed:19,radius:34,gold:200,xp:150,aggro:170,windup:.55,skin:'elite',tint:[130,230,120],scale:2.1,tag:'王',boss:true,skills:['slam','summon'],desc:'震地砸向前排，并召唤蘑菇小弟'},
 boss2:{name:'铁壳蟹王',hp:10000,atk:76,def:26,aspd:.6,speed:19,radius:34,gold:240,xp:180,aggro:170,windup:.55,skin:'elite',tint:[110,190,255],scale:2.1,tag:'王',boss:true,skills:['armor','slam','summon'],desc:'会缩进硬壳（伤害降 70%），召唤疗愈菇和铁壳怪'},
 boss3:{name:'熔岩魔',hp:11000,atk:84,def:24,aspd:.65,speed:21,radius:36,gold:280,xp:220,aggro:180,windup:.5,skin:'elite',tint:[255,110,70],scale:2.2,tag:'王',boss:true,skills:['charge','bombs','slam'],desc:'突进砸向后排，连环岩浆爆炸'},
 boss5:{name:'沼泽之王',hp:13500,atk:96,def:28,aspd:.6,speed:20,radius:36,gold:400,xp:330,aggro:180,windup:.55,skin:'elite',tint:[120,190,110],scale:2.2,tag:'王',boss:true,skills:['slam','summon','bombs'],desc:'召唤分裂史莱姆，毒泡连环爆炸'},
 boss6:{name:'冰霜巨人',hp:15000,atk:104,def:32,aspd:.55,speed:18,radius:38,gold:460,xp:380,aggro:180,windup:.6,skin:'elite',tint:[160,215,255],scale:2.3,tag:'王',boss:true,skills:['slam','bolts','armor'],desc:'冰锥眩晕宠物，会冰封自己减伤'},
 boss7:{name:'幽影伯爵',hp:16500,atk:112,def:30,aspd:.7,speed:24,radius:36,gold:520,xp:430,aggro:190,windup:.5,skin:'elite',tint:[170,150,220],scale:2.2,tag:'王',boss:true,skills:['charge','summon','bolts'],desc:'瞬移突袭后排，召唤幽灵'},
 boss8:{name:'星辰龙王',hp:18500,atk:120,def:34,aspd:.7,speed:22,radius:40,gold:600,xp:500,aggro:200,windup:.5,skin:'elite',tint:[255,210,110],scale:2.4,tag:'王',boss:true,skills:['bombs','bolts','summon','charge','slam'],desc:'流星雨、落雷、召唤星术士，最终的考验'},
 boss4:{name:'雷鸣王',hp:12000,atk:90,def:26,aspd:.7,speed:22,radius:36,gold:340,xp:280,aggro:190,windup:.5,skin:'elite',tint:[255,225,90],scale:2.2,tag:'王',boss:true,skills:['bolts','summon','bombs','slam'],desc:'落雷眩晕两只宠物，召唤雷击怪，半血后狂暴'},
};
export type MonsterKind=keyof typeof MONSTERS;
export const bossOf=(chapter:number):MonsterKind=>('boss'+chapter) as MonsterKind;
export const MONSTER_VIEW=(k:MonsterKind):{skin:string;tint:number[];scale:number;tag:string}=>{const m=MONSTERS[k] as any;return {skin:m.skin||k,tint:m.tint||[255,255,255],scale:m.scale||1,tag:m.tag||''};};
export const skillNodes=(level:number)=>BATTLE.skillNodes.filter(n=>level>=n).length;

// ---- stages: 4 chapters x 5 stages. Numbers scale smoothly; x-5 is a boss stage (defend, more elites).
export interface StageDef{elite:boolean;diff:number;index:number;chapter:number;no:number;name:string;chapterName:string;mode:'siege'|'defend';coreHp:number;hpScale:number;atkScale:number;startInterval:number;endInterval:number;waveSize:number;eliteEvery:number;shroomChance:number;boss:boolean;rewardScale:number;specials:MonsterKind[];specialEvery:number}
export const CHAPTERS=['晨光森林','溪谷水岸','赤岩峡谷','雷鸣高原','迷雾沼泽','冰晶雪原','幽影古堡','星辰之巅'];
export const PER_CHAPTER=8;
export const STAGES:StageDef[]=[];
// which mechanic monsters join each chapter: new ones come in 1-2 at a time, boss stages bring the whole chapter set
const CHAPTER_SPECIALS:MonsterKind[][]=[[],['armor','healer'],['dasher','bomber'],['summoner','stunner'],['splitter','healer'],['frost','armor'],['ghost','dasher'],['starmage','stunner']];
const specialsFor=(c:number,n:number,boss:boolean):MonsterKind[]=>{const out:MonsterKind[]=[];for(let k=Math.max(0,c-3);k<c;k++)out.push(...CHAPTER_SPECIALS[k]);out.push(...CHAPTER_SPECIALS[c].slice(0,boss||n>=2?2:1));if(c===0&&boss)out.push('armor');return out;};
// 8 chapters x 8 stages; `diff` keeps chapters 1-4 on the old 20-stage difficulty curve and continues it. x-4 is an elite stage, x-8 the boss.
for(let c=0;c<CHAPTERS.length;c++)for(let n=0;n<PER_CHAPTER;n++){const idx=c*PER_CHAPTER+n,boss=n===PER_CHAPTER-1,elite=n===3,i=c*5+n*5/PER_CHAPTER+(elite?.6:0);
 STAGES.push({index:idx,diff:i,elite,chapter:c+1,no:n+1,name:`${c+1}-${n+1}`,chapterName:CHAPTERS[c],mode:boss?'defend':'siege',coreHp:Math.round(13000+i*900),hpScale:1.25+i*.13,atkScale:1.15+i*.09,startInterval:Math.max(1.9,2.7-i*.04),endInterval:Math.max(.55,.85-i*.015),waveSize:4+Math.floor(i/4),eliteEvery:boss||elite?28:Math.max(30,46-i),shroomChance:Math.min(.6,.35+i*.02),boss,rewardScale:(1+i*.12)*(elite?1.3:1),specials:specialsFor(c,n,boss),specialEvery:Math.max(10,20-i*.4)-(boss?2:0)});}
// ---- 试炼之塔: endless floors past the campaign curve. Short (2 legs), no stamina, 3 tries a day, every 10th floor a boss.
export const TOWER={segs:2,dailyTries:3,diffBase:3,diffPerFloor:.9,bossEvery:10,unlockStage:15};
export function towerStage(floor:number):StageDef{const f=Math.max(1,Math.floor(floor)),i=TOWER.diffBase+f*TOWER.diffPerFloor,boss=f%TOWER.bossEvery===0,c=Math.min(CHAPTERS.length-1,Math.floor(i/5));
 const chapter=boss?((f/TOWER.bossEvery-1)%CHAPTERS.length)+1:c+1;
 return {index:-f,diff:i,elite:f%5===0&&!boss,chapter,no:f,name:`${f}层`,chapterName:'试炼之塔',mode:boss?'defend':'siege',coreHp:Math.round(13000+i*900),hpScale:1.25+i*.13,atkScale:1.15+i*.09,
  startInterval:Math.max(1.9,2.7-i*.04),endInterval:Math.max(.55,.85-i*.015),waveSize:4+Math.floor(i/4),eliteEvery:boss?28:Math.max(30,46-i),shroomChance:Math.min(.6,.35+i*.02),boss,rewardScale:1+i*.12,
  specials:specialsFor(c,4,boss),specialEvery:Math.max(10,20-i*.4)-(boss?2:0)};}
/** first clear of a floor pays this; every 5th floor adds crystal, every 10th a gem */
export const towerReward=(floor:number)=>({coins:Math.round(300+floor*120),food:3+Math.floor(floor/3),...(floor%5===0?{mats:{crystal:1+Math.floor(floor/10)}}:{}),...(floor%10===0?{gems:{[floor>=40?'topaz2':floor>=20?'ruby2':'ruby1']:1}}:{})});
export const stageName=(i:number)=>{const s=STAGES[Math.max(0,Math.min(STAGES.length-1,i))];return `${s.name} ${s.boss?'首领守卫':s.elite?'精英挑战':'核心攻坚'}`;};
export const CAPTAINS:Record<CaptainKind,{name:string;icon:string;desc:string}>={
 firerain:{name:'烈焰火雨',icon:'energy',desc:'点战场任意位置，降下火雨：范围伤害并灼烧，伤害随队伍等级提升。'},
 sprout:{name:'生机萌芽',icon:'heart',desc:'立刻为全队宠物恢复 30% 生命，不需要指定位置。'},
 freeze:{name:'寒霜冰封',icon:'shield',desc:'点战场任意位置，冻结范围内的敌人 2 秒（首领只冻 0.6 秒）。'}};

// ---- in-battle pet levels. Each pet levels on its own: kills fill its XP bar, then the player pays gold to level it.
// Level and XP stay on the card, so a pet that falls and is redeployed keeps them.
export const PET_LV={max:10,xpNeed:(lv:number)=>30+18*(lv-1),cost:(lv:number)=>40+25*(lv-1),growth:1.4,skillPerLv:.07,heal:.2};

// ---- team level -> battle cards. Every team level puts one card into the tray (max 3); buying costs gold by quality.
export type BuffKey='atk'|'hp'|'aspd'|'cdr'|'crit'|'siege'|'income';
export const CARD_Q:{name:string;color:number[];cost:number}[]=[
 {name:'普通',color:[150,156,146],cost:80},{name:'优秀',color:[86,176,86],cost:130},{name:'稀有',color:[66,140,230],cost:200},{name:'史诗',color:[168,92,224],cost:290},{name:'传说',color:[240,158,36],cost:420}];
const pc=(v:number)=>`${Math.round(v*100)}%`;
export interface CardDef{id:string;name:string;icon:string;vals:number[];text:(v:number)=>string;buff?:BuffKey}
export const BATTLE_CARDS:CardDef[]=[
 {id:'atk',name:'磨利爪牙',icon:'swords',buff:'atk',vals:[.08,.12,.18,.25,.35],text:v=>`全队攻击 +${pc(v)}`},
 {id:'hp',name:'厚实毛皮',icon:'heart',buff:'hp',vals:[.10,.15,.22,.30,.42],text:v=>`全队生命 +${pc(v)}`},
 {id:'aspd',name:'疾风',icon:'energy',buff:'aspd',vals:[.06,.10,.14,.20,.28],text:v=>`攻击速度 +${pc(v)}`},
 {id:'cdr',name:'专注',icon:'star',buff:'cdr',vals:[.06,.10,.14,.18,.24],text:v=>`技能冷却 -${pc(v)}`},
 {id:'crit',name:'弱点洞察',icon:'target',buff:'crit',vals:[.05,.08,.12,.16,.22],text:v=>`暴击率 +${pc(v)}`},
 {id:'siege',name:'攻城号角',icon:'hammer',buff:'siege',vals:[.15,.25,.40,.60,.90],text:v=>`对敌方核心伤害 +${pc(v)}`},
 {id:'income',name:'招财猫',icon:'coin',buff:'income',vals:[.10,.18,.28,.40,.60],text:v=>`金币产出 +${pc(v)}`},
 {id:'repair',name:'水晶修复',icon:'shard',vals:[.08,.12,.18,.25,.35],text:v=>`修复我方核心 ${pc(v)}`},
 {id:'meteor',name:'流星雨',icon:'diamond',vals:[150,250,400,600,900],text:v=>`全场敌人受到 ${v} 伤害`},
 {id:'xp',name:'特训',icon:'book',vals:[30,50,80,120,180],text:v=>`场上宠物各得 ${v} 经验`}];
/** quality weights for the card offered at a team level: better cards get likelier as the team levels up */
export const cardQWeights=(lv:number)=>[Math.max(14,52-lv*3),30,12+lv*.9,4+lv*.7,1+lv*.35];

// ---- waves. The enemy fights in waves with a breather between them, so a team that clears a wave
// has time to walk up and hit the enemy core. Clearing a wave quickly exposes the core (takes more damage).
export const WAVE={firstPrep:6,prep:6.5,minPrep:4,prepStep:.2,burstBase:3.5,burstPer:.32,fightMax:13,clearAt:1,exposeIn:7,exposeExtra:2,exposeMult:1.4,growth:.15,countStep:1.1,countExtra:1,aliveCap:22,rageCount:1.25,ragePrep:.75};

// ---- enemy intents: before each wave the enemy core shows what it is about to do (icon + countdown), never a popup.
export type IntentKind='plain'|'rush'|'horde'|'elite'|'repair'|'shell'|'greed'|'frenzy'|'seal'|'flank'|'bombard'|'reinforce';
export const INTENTS:Record<IntentKind,{name:string;icon:string;color:number[];desc:string;ch:number;short:string}>={
 plain:{name:'进攻',icon:'swords',color:[196,184,160],desc:'一波普通的进攻',ch:1,short:'普通进攻'},
 rush:{name:'冲锋',icon:'energy',color:[255,150,40],desc:'下一波怪物移动速度 +50%',ch:1,short:'怪物移速+50%'},
 horde:{name:'人海',icon:'team',color:[230,120,90],desc:'下一波怪物数量 +60%，但血量 -30%',ch:1,short:'数量+60%'},
 elite:{name:'精英出击',icon:'swords',color:[220,60,60],desc:'下一波派出角魔和护卫',ch:1,short:'角魔来袭'},
 repair:{name:'修复核心',icon:'heart',color:[80,200,110],desc:'敌方核心 6 秒内回复 12% 生命——攻击核心能打断它',ch:1,short:'打核心可打断'},
 shell:{name:'水晶护盾',icon:'shield',color:[90,160,255],desc:'敌方核心获得护盾，12 秒内吸收伤害',ch:1,short:'核心护盾'},
 greed:{name:'悬赏',icon:'coin',color:[240,190,50],desc:'下一波怪物血量 +20%，但掉落金币翻倍',ch:1,short:'金币×2 血量+20%'},
 frenzy:{name:'狂暴',icon:'shard',color:[255,70,60],desc:'下一波怪物攻击 +35%、攻速 +20%',ch:2,short:'攻击+35%'},
 seal:{name:'封印',icon:'lock',color:[160,110,220],desc:'封印你的队长技能 10 秒',ch:2,short:'封印队长技能'},
 flank:{name:'偷袭',icon:'target',color:[255,110,90],desc:'下一波一半怪物变成突袭怪，直扑后排',ch:3,short:'突袭后排'},
 reinforce:{name:'增援守军',icon:'shield',color:[120,150,200],desc:'把倒下的水晶守军重新派回来',ch:1,short:'守军复活'},
 bombard:{name:'水晶炮击',icon:'diamond',color:[255,80,60],desc:'敌方核心向你的宠物发射 3 发炮弹，看红圈',ch:3,short:'3 发炮弹'}};
export const INTENT_NUM={repairPct:.12,repairTime:6,repairBreak:.04,shellPct:.08,shellTime:12,sealTime:10,bombShots:3,bombDmg:170,bombR:70,bombLead:1.4,bombGap:.6};
// ---- battle speed: x2 is the default pace, x3 free, x5 is unlocked per battle by a rewarded ad
export const SPEEDS=[2,3,5];
// ---- segments: a stage is fought in 3 legs. Smashing a purple crystal ends a leg: the crystal shatters, the camera
// advances and the team regroups in front of the next crystal. Gold, pet levels, cards and team level carry over.
// On a boss stage the last leg is the boss (defend: beat the boss, or hold out). Lingering too long in a leg enrages the enemy.
// ---- monster counters to summons (召唤物), unlocked by chapter (1-based) so summoners stop trivialising later stages
//  breaker: elites / wardens / bosses hit summons much harder; cleave: melee hits also splash onto summons near the target;
//  dispel: casters' and star mages' attacks shorten the life of summons around the impact
export const ANTI_SUMMON={breaker:{from:1,mult:2},cleave:{from:2,radius:48,mult:.6},dispel:{from:3,radius:72,life:3},breakerKinds:['elite','warden'] as string[]};
export const SEG={count:4,hp:[.42,.56,.72,.9],trans:4.5,boom:1.2,scroll:2.2,rewardBase:60,rewardPer:40,heal:.35,softLimit:90,overtimeDrain:.01,bossHold:180,bossDelay:8,segGrowth:.2,waveCarry:2};
export const segName=(seg:number,count:number,boss:boolean)=>seg>=count-1?(boss?'首领':'敌方核心'):`紫水晶 ${seg+1}/${count}`;
// ---- garrison: each crystal is defended by monsters that hold their post instead of marching:
// a 岩盾卫 in front (while alive the crystal takes -60% damage), casters/archers behind, a healer at the side.
export const GARRISON={ward:.5,leash:110,
 posts:{warden:[{x:270,y:300},{x:215,y:292},{x:325,y:292}],caster:[{x:190,y:222},{x:350,y:222}],healer:[{x:340,y:250},{x:200,y:250}],archer:[{x:150,y:310},{x:390,y:310}]} as Record<string,{x:number;y:number}[]>};
/** who guards the crystal of a leg; harder stages and later legs bring more */
export const garrisonFor=(stage:number|StageDef,seg:number,count:number,boss:boolean):string[]=>{if(boss&&seg>=count-1)return [];const last=seg>=count-1,st=typeof stage==='number'?STAGES[Math.max(0,Math.min(STAGES.length-1,stage))]:stage;stage=st.diff;const ch=Math.floor(stage/5);
 const g:string[]=['warden'];if(st.elite)g.push('warden');if(stage>=1||seg>=1)g.push('archer');if(seg>=1||stage>=3)g.push('caster');if((seg>=1&&stage>=2)||last)g.push('healer');if(last&&stage>=4)g.push('warden');if(ch>=2&&seg>=1)g.push('archer');if(ch>=3&&last)g.push('caster');if(ch>=4)g.push(ch>=6?'starmage':'healer');if(ch>=6&&last)g.push('warden');return g;};
