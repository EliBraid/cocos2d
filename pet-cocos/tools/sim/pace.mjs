// Battle pacing probe: plays given stages with a given pet power multiplier and prints the time of every segment.
// usage: node --import ./tests/register-ts.mjs tools/sim/pace.mjs <bonus> <stage,stage,...> [seeds]
import {Battle} from '../../assets/scripts/battle/BattleCore.ts';
import {PETS,STAGES} from '../../assets/scripts/battle/BattleConfig.ts';
const bonusMul=+(process.argv[2]||1),stages=(process.argv[3]||'0,4,8,12,16').split(',').map(Number),seeds=+(process.argv[4]||2);
const deck=['fox','turtle','sparrow','cat','octopus','frog'];
for(const st of stages)for(let sd=1;sd<=seeds;sd++){const bonus={};for(const k of deck)bonus[k]=bonusMul;
 const b=new Battle(sd*7919,{deck,stage:st,bonus});const segT=[];let last=0,seg=0;
 for(let i=0;i<1800*30&&b.state==='running';i++){
  for(const [ci,c] of b.cards.entries()){const front=['guard','warrior'].includes(PETS[c.kind].job);const s=b.slotPet.findIndex((x,j)=>!x&&(front?j<3:j>=3));const s2=s>=0?s:b.slotPet.findIndex(x=>!x);if(s2>=0&&b.canDeploy(ci,s2))b.deploy(ci,s2);}
  for(let ci=0;ci<b.cards.length;ci++)if(b.cards[ci].petId)b.upgrade(ci);
  for(const o of [...b.offers])if(b.gold>o.cost+80)b.buyCard(o.id);
  if(b.captainReady()){const ms=b.monsters.filter(m=>m.state!=='dead');if(ms.length>=4){let best=ms[0],bn=0;for(const m of ms){const n=ms.filter(o=>Math.hypot(o.x-m.x,o.y-m.y)<90).length;if(n>bn){bn=n;best=m;}}b.castCaptain({x:best.x,y:best.y});}}
  b.step(1/30);b.drain();if(b.seg!==seg){segT.push(Math.round(b.time-last));last=b.time;seg=b.seg;}}
 const r=b.result;segT.push(Math.round(b.time-last));
 console.log(`${STAGES[st].name.padEnd(4)} x${bonusMul} s${sd} ${r?(r.win?'WIN ':'LOSE')+' '+r.reason.padEnd(20):'TIMEOUT'.padEnd(26)} total=${Math.round(b.time)}s segs=[${segT}] lv=${b.level} cardLv=[${b.cards.map(c=>c.lv)}]`);}
