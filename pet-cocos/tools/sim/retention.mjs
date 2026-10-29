// New-player simulation: a bot plays N days with the real PlayerModel + battle core and logs progress per day,
// to judge pacing and where players stall. usage: node --import ./tests/register-ts.mjs tools/sim/retention.mjs [days] [battlesPerDay]
import {PlayerModel,HATCH,PET_MAX_LEVEL} from '../../assets/scripts/meta/PlayerModel.ts';
import {Battle} from '../../assets/scripts/battle/BattleCore.ts';
import {PETS,STAGES} from '../../assets/scripts/battle/BattleConfig.ts';
import {ONLINE,SUPPLY,DAILY,CHESTS,ACH} from '../../assets/scripts/meta/Welfare.ts';
const DAYS=+(process.argv[2]||7),PER_DAY=+(process.argv[3]||16);
let seed=12345;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
const mem={};const store={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v;}};
const DAY0=new Date(2026,10,2,8,0,0).getTime();
const p=new PlayerModel(store,DAY0);p.agreed=true;p.loggedIn=true;

// a sensible lineup: front liners in the first 3 slots, the rest behind, deploy everything, level cards in battle
function fight(now){const deck=p.deck,bonus={},mods={},skills={};for(const k of deck){bonus[k]=p.petBonus(k);mods[k]=p.petMods(k);skills[k]=p.petSkill(k);}
 const b=new Battle(Math.floor(rand()*1e5),{deck,bonus,mods,skills,startGold:p.startGold,stage:p.stage,captain:p.captain});
 for(let i=0;i<1500*30&&b.state==='running';i++){
  for(const [ci,c] of b.cards.entries()){const front=['guard','warrior'].includes(PETS[c.kind].job);const s=b.slotPet.findIndex((x,j)=>!x&&(front?j<3:j>=3));const s2=s>=0?s:b.slotPet.findIndex(x=>!x);if(s2>=0&&b.canDeploy(ci,s2))b.deploy(ci,s2);}
  for(let ci=0;ci<b.cards.length;ci++)if(b.cards[ci].petId)b.upgrade(ci);
  for(const o of [...b.offers])if(b.gold>o.cost+80)b.buyCard(o.id);
  // captain skill on the densest group of monsters (what an attentive player does)
  if(b.captainReady()){const ms=b.monsters.filter(m=>m.state!=='dead');if(ms.length>=4){let best=ms[0],bn=0;for(const m of ms){const n=ms.filter(o=>Math.hypot(o.x-m.x,o.y-m.y)<90).length;if(n>bn){bn=n;best=m;}}b.castCaptain({x:best.x,y:best.y});}}
  b.step(1/30);b.drain();}
 // a battle still running after 25 minutes counts as a loss (players quit long before that)
 return b.result||{win:false,reason:'timeout',stars:0,time:b.time,kills:b.kills,goldEarned:b.goldEarned,level:b.level,deployed:b.deployed,segments:b.seg,timeout:true,seg:b.seg+1,stage:STAGES[p.stage].name};}
function spend(now){
 // pets: hatch with spare food (keep enough food for levelling), level the lineup, best 6 by power into the deck
 while(p.food>=HATCH.cost+20&&p.hatch(rand,false,now));
 p.hatch(rand,true,now);
 // merge spare copies up the 品级 ladder (raises the level cap)
 for(const k of p.owned)for(let g=0;g<4;g++)while(p.mergeInfo(k,g).can)p.merge(k,g,rand);
 for(let guard=0;guard<200;guard++){const k=[...p.deck].sort((a,b)=>p.petLevel(a)-p.petLevel(b)).find(k=>p.canUpgradePet(k));if(!k)break;p.upgradePet(k);}
 p.deck=[...p.owned].sort((a,b)=>p.petPower(b)-p.petPower(a)).slice(0,6);
 for(const k of p.deck)p.autoEquip(k);
 while(p.claimRoad());
 for(const t of DAILY)p.claimDaily(t.id,now);CHESTS.forEach((_,i)=>p.claimChest(i,now));for(const a of ACH)while(p.claimAch(a.id));}
const log=[];let lossStreak=0;
for(let d=0;d<DAYS;d++){const t0=DAY0+d*86400e3;let now=t0;
 p.sign(now);p.claimAllMail();p.collectTrain(now);p.collectRanch?.(now);
 // two sessions: morning (lunch supply) and evening (dinner supply); online rewards for ~40 min in total
 p.addOnline(40*60,now);ONLINE.forEach((_,i)=>p.claimOnline(i,now));
 const s={day:d+1,battles:0,wins:0,losses:0,startStage:STAGES[p.stage].name};
 for(let i=0;i<PER_DAY;i++){now=t0+(i<PER_DAY/2?4:11)*3600e3+i*60e3;SUPPLY.forEach((_,j)=>p.claimSupply(j,now));spend(now);
  // retry the frontier after a loss, but after 3 losses in a row farm the previous stage once
  const frontier=STAGES.findIndex((_,j)=>!p.stageUnlocked(j+1)||j===STAGES.length-1);p.selectStage(lossStreak>=3?Math.max(0,frontier-1):frontier);
  if(!p.startBattle(now)){s.outOfStamina=true;break;}
  const r=fight(now);p.applyBattle(r,rand);s.battles++;if(r.win){s.wins++;lossStreak=0;}else{s.losses++;lossStreak++;}if(r.timeout)s.timeouts=(s.timeouts||0)+1;s.mins=(s.mins||0)+r.time/60;}
 s.avgMin=+(s.mins/Math.max(1,s.battles)).toFixed(1);delete s.mins;
 spend(now);
 s.reached=STAGES[STAGES.findIndex((_,j)=>!p.stageUnlocked(j+1)||j===STAGES.length-1)].name;s.captain=p.captainLevel;s.coins=p.coins;s.food=p.food;
 s.owned=p.owned.length;s.deckLv=p.deck.map(k=>p.petLevel(k)+'g'+p.grade(k)).join('/');s.power=+(p.deck.reduce((a,k)=>a+p.petBonus(k),0)/p.deck.length).toFixed(2);s.maxed=p.owned.filter(k=>p.petLevel(k)>=PET_MAX_LEVEL).length;s.items=p.items.length;
 log.push(s);console.log(JSON.stringify(s));}
