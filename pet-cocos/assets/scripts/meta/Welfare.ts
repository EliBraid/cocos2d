// 福利 / 任务 / 邮件 / 图鉴 — pure data. PlayerModel keeps the state; the UI only reads these tables.
import type {MatId} from './Gear';
/** a pack of rewards; every field optional */
export interface Bundle{coins?:number;food?:number;stamina?:number;xp?:number;mats?:Partial<Record<MatId,number>>;gems?:Record<string,number>;pet?:string}
/** local calendar day as a number like 20261027 (daily resets happen at local midnight) */
/** add reward packs together (for "claim all") */
export function mergeBundles(list:(Bundle|null|undefined)[]):Bundle{const o:Bundle={};for(const b of list){if(!b)continue;for(const k of ['coins','food','stamina','xp'] as const)if(b[k])o[k]=(o[k]||0)+b[k]!;if(b.mats){o.mats=o.mats||{};for(const k of Object.keys(b.mats) as MatId[])o.mats[k]=(o.mats[k]||0)+(b.mats[k]||0);}if(b.gems){o.gems=o.gems||{};for(const k of Object.keys(b.gems))o.gems[k]=(o.gems[k]||0)+b.gems[k];}if(b.pet)o.pet=b.pet;}return o;}
export const dayKey=(t:number)=>{const d=new Date(t);return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();};
export const hourOf=(t:number)=>new Date(t).getHours();

// ---- 签到: the first week is the 新手七日 (day 7 gives a pet); afterwards a lighter 7-day loop repeats
export const SIGN_NEWBIE:Bundle[]=[
 {coins:500,food:10},{mats:{wood:12,ore:12}},{food:20,gems:{ruby1:2}},{coins:1000,stamina:30},{mats:{hide:15,crystal:3}},{food:30,gems:{emerald2:1}},{pet:'bunny',coins:2000}];
export const SIGN_LOOP:Bundle[]=[
 {coins:300},{food:8},{mats:{wood:8,ore:8}},{coins:500,stamina:20},{mats:{hide:8,crystal:1}},{food:15},{coins:800,gems:{sapphire2:1}}];
// ---- 新手七日目标: day n opens n-1 days after the account was created; 3 goals a day, each pays on its own,
// and finishing all 3 of a day opens that day's chest. Targets follow the normal pace measured with tools/sim/retention.mjs.
export interface GoalView{stageStars:number[];hatchCount:number;owned:string[];deck:string[];captainLevel:number;mergeCount:number;forgeCount:number;totalStars:number;stats:{kills:number};maxPetLevel:number;maxGrade:number}
export interface GoalDef{id:string;name:string;goal:number;b:Bundle;value:(m:GoalView)=>number}
const cleared=(name:string)=>{const [c,n]=name.split('-').map(Number);const i=(c-1)*8+(n-1);return {id:'clear'+name,name:`通关 ${name}`,goal:1,value:(m:GoalView)=>m.stageStars[i]>0?1:0};};
const goal=(id:string,name:string,goal:number,value:(m:GoalView)=>number)=>({id,name,goal,value});
export const NEWBIE_GOALS:{day:number;goals:GoalDef[];chest:Bundle}[]=[
 {day:1,chest:{coins:800,food:15},goals:[{...cleared('1-3'),b:{coins:300}},{...goal('hatch1','孵化 1 次',1,m=>m.hatchCount),b:{food:10}},{...goal('lv5','任意宠物升到 Lv.5',5,m=>m.maxPetLevel),b:{coins:400}}]},
 {day:2,chest:{food:25,gems:{ruby1:2}},goals:[{...cleared('1-8'),b:{coins:600}},{...goal('deck6','出战阵容放满 6 只',6,m=>m.deck.length),b:{food:10}},{...goal('kill300','累计击败 300 只怪物',300,m=>m.stats.kills),b:{mats:{wood:10,ore:10}}}]},
 {day:3,chest:{coins:1500,mats:{crystal:3}},goals:[{...cleared('2-3'),b:{coins:800}},{...goal('forge1','在工坊锻造 1 件装备',1,m=>m.forgeCount),b:{mats:{hide:10,ore:10}}},{...goal('lv10','任意宠物升到 Lv.10',10,m=>m.maxPetLevel),b:{food:15}}]},
 {day:4,chest:{food:40,gems:{emerald2:1}},goals:[{...cleared('2-6'),b:{coins:1000}},{...goal('own10','拥有 10 种宠物',10,m=>m.owned.length),b:{food:15}},{...goal('cap8','队长升到 Lv.8',8,m=>m.captainLevel),b:{coins:1000}}]},
 {day:5,chest:{coins:3000,stamina:40},goals:[{...cleared('2-8'),b:{coins:1200}},{...goal('merge1','完成 1 次品级合成',1,m=>m.mergeCount),b:{food:20}},{...goal('stars40','累计获得 40 颗星',40,m=>m.totalStars),b:{mats:{crystal:3}}}]},
 {day:6,chest:{food:50,gems:{sapphire2:1}},goals:[{...cleared('3-3'),b:{coins:1500}},{...goal('grade1','拥有 1 只良品宠物',1,m=>m.maxGrade),b:{food:20}},{...goal('lv15','任意宠物升到 Lv.15',15,m=>m.maxPetLevel),b:{coins:1500}}]},
 {day:7,chest:{pet:'stardragon',coins:5000},goals:[{...cleared('3-6'),b:{coins:2000}},{...goal('cap12','队长升到 Lv.12',12,m=>m.captainLevel),b:{food:30}},{...goal('stars60','累计获得 60 颗星',60,m=>m.totalStars),b:{mats:{crystal:5}}}]},
];
/** what signing in on the n-th sign-in (0-based) gives */
export const signReward=(n:number)=>n<7?SIGN_NEWBIE[n]:SIGN_LOOP[(n-7)%7];

// ---- 在线奖励: minutes played today
export const ONLINE:{min:number;b:Bundle}[]=[{min:3,b:{coins:200}},{min:10,b:{food:10}},{min:20,b:{mats:{crystal:2}}},{min:40,b:{stamina:20,coins:300}}];
// ---- 体力补给: free stamina at lunch and dinner (local time), plus rewarded ads
export const SUPPLY:{from:number;to:number;stamina:number;name:string}[]=[{from:12,to:14,stamina:30,name:'午餐'},{from:18,to:20,stamina:30,name:'晚餐'}];
export const AD_STAMINA={amount:25,perDay:3};
// ---- 兑换码 (offline table for the prototype; the release build should verify codes on the server)
export const CODES:Record<string,Bundle>={MENGCHONG:{coins:1000,food:20},SHOUWEI:{stamina:50,gems:{ruby2:1}},PETGUARD:{mats:{crystal:5},food:10}};

// ---- 每日任务 + 活跃度宝箱 (reset at local midnight)
export type DailyKey='sign'|'battle'|'win'|'kill'|'star3'|'hatch'|'forge'|'enhance'|'petup'|'ranch'|'merge';
export const DAILY:{id:DailyKey;name:string;goal:number;pts:number;go:string}[]=[
 {id:'sign',name:'签到 1 次',goal:1,pts:10,go:'welfare'},
 {id:'battle',name:'完成 3 场冒险',goal:3,pts:20,go:'adventure'},
 {id:'kill',name:'击败 100 只怪物',goal:100,pts:15,go:'adventure'},
 {id:'win',name:'取得 2 场胜利',goal:2,pts:15,go:'adventure'},
 {id:'star3',name:'三星通关 1 次',goal:1,pts:10,go:'adventure'},
 {id:'hatch',name:'孵化 1 次',goal:1,pts:10,go:'hatch'},
 {id:'forge',name:'打造装备或开罐子 1 次',goal:1,pts:10,go:'workshop'},
 {id:'enhance',name:'强化装备 2 次',goal:2,pts:10,go:'workshop'},
 {id:'petup',name:'培养宠物 1 次',goal:1,pts:10,go:'pet'},
 {id:'ranch',name:'收取放养或训练收益',goal:1,pts:10,go:'home'}];
export const CHESTS:{pts:number;b:Bundle}[]=[{pts:20,b:{coins:300}},{pts:40,b:{food:15}},{pts:60,b:{mats:{wood:10,ore:10,hide:10}}},{pts:80,b:{stamina:30}},{pts:100,b:{coins:800,gems:{topaz2:1}}}];

// ---- 成就: lifetime goals with tiers
export type AchStat='clear'|'kills'|'pets'|'stars'|'hatch'|'forge'|'captain'|'wins'|'merge';
export const ACH:{id:AchStat;name:string;unit:string;tiers:number[];b:(tier:number)=>Bundle}[]=[
 {id:'clear',name:'冒险推进',unit:'关',tiers:[8,24,40,64],b:t=>({coins:1000*(t+1),gems:{[['ruby2','emerald2','sapphire3','amethyst3'][t]]:1}})},
 {id:'stars',name:'星星收集',unit:'星',tiers:[24,72,120,192],b:t=>({coins:600*(t+1),food:10*(t+1)})},
 {id:'wins',name:'百战百胜',unit:'胜',tiers:[10,50,150,400],b:t=>({coins:500*(t+1),stamina:20})},
 {id:'kills',name:'怪物克星',unit:'只',tiers:[500,2000,8000,20000],b:t=>({coins:400*(t+1),mats:{crystal:2+t*2}})},
 {id:'pets',name:'萌宠收藏家',unit:'只',tiers:[6,12,20,30],b:t=>({food:20+t*20,coins:500*(t+1)})},
 {id:'hatch',name:'孵蛋达人',unit:'次',tiers:[10,50,150,400],b:t=>({food:15+t*15})},
 {id:'forge',name:'工坊匠人',unit:'件',tiers:[10,40,120,300],b:t=>({mats:{wood:10+t*10,ore:10+t*10,hide:10+t*10}})},
 {id:'merge',name:'品级突破',unit:'次',tiers:[1,5,15,40],b:t=>({coins:800*(t+1),gems:{amethyst2:1}})},
 {id:'captain',name:'队长成长',unit:'级',tiers:[5,10,20,30],b:t=>({stamina:20+t*10,coins:500*(t+1)})}];

// ---- 邮件: seeded once per id; attachments claimed per mail
export interface MailDef{id:string;from:string;title:string;body:string;b?:Bundle}
export const MAILS:MailDef[]=[
 {id:'welcome',from:'营地向导',title:'欢迎来到萌宠营地',body:'欢迎你，队长！带上赤焰小狐守住核心，击碎对面的水晶就能推进冒险。附件是一点见面礼。',b:{coins:200,food:10}},
 {id:'launch',from:'萌宠守卫战运营组',title:'开服福利',body:'感谢你参加开服！营地为每位队长准备了开服补给，记得每天来福利中心签到，第 7 天送稀有宠物「月绒兔」。',b:{stamina:50,coins:1000,gems:{ruby1:2,emerald1:2}}},
 {id:'guide',from:'营地向导',title:'新手小贴士',body:'· 战斗中宠物经验满了，点卡牌花金币升级\n· 队伍升级会掉卡牌，选一张买下\n· 敌方水晶右边的图标会预告它下一步\n· 岩盾卫活着时水晶伤害减半，先打掉它'}];

// ---- 图鉴
export const PET_LORE:Record<string,{lore:string;get:string}>={
 fox:{lore:'营地最早的守护者，尾巴尖的火苗会随心情变旺。冲在最前面，也最先回头看同伴。',get:'初始伙伴'},
 turtle:{lore:'背着一块会长青苔的石盾，慢吞吞但从不后退。据说壳上的纹路记着它守过的每一场仗。',get:'初始伙伴'},
 sparrow:{lore:'眼神最好的哨兵，能在三棵树外射中一颗松果。喜欢收集亮晶晶的箭羽。',get:'初始伙伴'},
 chick:{lore:'火苗鸡一着急就会冒火星，于是学会了把火星攒成火球。',get:'初始伙伴'},
 cat:{lore:'头顶的小芽每天浇一次水就会开花，花粉能让受伤的同伴好起来。',get:'孵化屋'},
 dog:{lore:'团团犬最爱的游戏是“冲过去再跑回来”，在战场上也一样。',get:'孵化屋'},
 mossdragon:{lore:'苔藓龙睡了一百年，醒来时身上长满了苔藓护盾。脾气很好，就是有点起床气。',get:'孵化屋'},
 penguin:{lore:'从北边冰原迷路过来的企鹅，发现这里的冰豆特别好吃就留下了。',get:'孵化屋'},
 bunny:{lore:'月光下才会醒来的兔子，耳朵能把月光聚成法术。',get:'孵化屋 · 7 日签到'},
 deer:{lore:'铃铛鹿走到哪里，哪里就响起叮当声，听到的同伴会觉得浑身是劲。',get:'孵化屋'},
 hedgehog:{lore:'刺刺猬胆子小，一紧张就缩成刺球，于是成了营地里最难被打穿的盾。',get:'孵化屋'},
 bear:{lore:'蜂蜜熊抱起谁，谁就觉得暖洋洋的，连怪物都舍不得用力打它。',get:'孵化屋'},
 tiger:{lore:'小虎崽总想证明自己是真正的老虎，专挑快倒下的敌人补上一爪。',get:'孵化屋'},
 boar:{lore:'冲冲猪只会一种战术：低头，冲！撞到谁谁就晕。',get:'孵化屋'},
 wolf:{lore:'银月狼在月圆之夜出现，它一声长嚎，全队都会热血沸腾。',get:'孵化屋（传说）'},
 squirrel:{lore:'松果鼠的腮帮子里永远塞满松果，扔起来又快又准。',get:'孵化屋'},
 owl:{lore:'夜枭白天打瞌睡，可一到战场，任何破绽都逃不过它的眼睛。',get:'孵化屋'},
 frog:{lore:'跳跳蛙的舌头又长又黏，还带着让怪物难受的毒液。',get:'孵化屋'},
 seal:{lore:'泡泡海豹吹的泡泡能把小怪困住，自己也常常被泡泡带着飘走。',get:'孵化屋'},
 stardragon:{lore:'从流星里孵出的小星龙，打个喷嚏都会掉星星。',get:'孵化屋（传说）'},
 sheep:{lore:'绵绵羊的羊毛软得像云，靠着它的伙伴伤口好得特别快。',get:'孵化屋'},
 panda:{lore:'竹子熊猫泡的竹叶茶是营地一绝，喝过的都说浑身舒坦。',get:'孵化屋'},
 weasel:{lore:'影鼬走路没有声音，等你发现它的时候，它已经在你身后了。',get:'孵化屋'},
 bat:{lore:'蝠蝠倒挂着睡觉，醒来就去偷袭怪物的后排，顺便喝点“果汁”。',get:'孵化屋'},
 ninjacat:{lore:'忍者猫说自己是隐世流派的传人，其实只是喜欢戴头巾。',get:'孵化屋'},
 snowfox:{lore:'雪狐来自北方雪原，出手如落雪，一击即退。',get:'孵化屋'},
 hamster:{lore:'仓鼠团长手下有一整支仓鼠队，开饭的时候全员到齐。',get:'孵化屋'},
 mole:{lore:'鼹鼠矿工挖地道从不迷路，援军总是从敌人脚下冒出来。',get:'孵化屋'},
 butterfly:{lore:'蝶仙子走过的地方会开满小花，花蝶会替她去战斗。',get:'孵化屋'},
 octopus:{lore:'小章鱼有八只手，能同时指挥八只小分身——虽然通常只用到三只。',get:'孵化屋'}};
export const CODEX_PET_REWARD:Bundle={coins:300,food:5};
export const CODEX_MON_REWARD:Bundle={coins:80};
export const CODEX_MILESTONES:{n:number;b:Bundle}[]=[{n:8,b:{coins:800}},{n:16,b:{food:30}},{n:25,b:{mats:{crystal:5}}},{n:35,b:{coins:3000,gems:{amethyst2:1}}},{n:45,b:{food:60,gems:{topaz3:1}}},{n:54,b:{coins:10000,gems:{pearl3:1}}}];
/** a short counter-tip for every monster, shown in the 图鉴 */
export const MON_TIP:Record<string,string>={fuzz:'最常见的小怪，成群出现，范围伤害清得快',shroom:'皮厚走得慢，交给战士慢慢啃',elite:'血厚攻高，不吃嘲讽，用队长技能和法师集火',
 armor:'远程打它伤害减少，用战士和守卫近身',healer:'躲在后面给怪回血，射手优先点掉',dasher:'无视前排直扑后排，后排放远一点或用守卫嘲讽',bomber:'死亡会爆炸，用射手和法师在远处击杀',
 summoner:'不处理会越召越多，尽快击杀',stunner:'会电晕宠物，多带治疗',warden:'活着时水晶伤害减半，推塔前先打掉它',caster:'躲在后排一打一片，派战士切进去',archer:'远程消耗，守卫顶在前面',
 splitter:'死后分裂，留着法师的范围伤害收尾',frost:'会冻人，治疗和守卫顶住',ghost:'远程常常打空，派战士和刺客近身',starmage:'给怪物套护盾，刺客优先切掉它',boss5:'毒泡连环爆炸，注意分散站位',boss6:'冰封时减伤，等它解冻再集火',boss7:'会瞬移打后排，守卫要嘲讽住',boss8:'最终首领，带满治疗和输出',boss1:'震地砸前排，召唤蘑菇小弟',boss2:'缩壳时别硬打，先清召唤的疗愈菇',boss3:'会突进砸后排，注意分散',boss4:'落雷会眩晕，半血狂暴后用冰冻'};
