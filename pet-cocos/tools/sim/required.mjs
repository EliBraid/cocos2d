// For each stage, binary-search the smallest pet power multiplier that wins (2 seeds must both win).
// usage: node --import ./tests/register-ts.mjs tools/sim/required.mjs [stage,stage,...]
import {Battle} from '../../assets/scripts/battle/BattleCore.ts';
import {PETS,STAGES} from '../../assets/scripts/battle/BattleConfig.ts';
const stages=(process.argv[2]||'0,7,8,15,16,23,24,31,32,39,47,55,63').split(',').map(Number),deck=['fox','turtle','sparrow','cat','octopus','frog'];
export function play(st,mul,seed){const bonus={};for(const k of deck)bonus[k]=mul;const b=new Battle(seed,{deck,stage:st,bonus});
 for(let i=0;i<1500*30&&b.state==='running';i++){
  for(const [ci,c] of b.cards.entries()){const front=['guard','warrior'].includes(PETS[c.kind].job);const s=b.slotPet.findIndex((x,j)=>!x&&(front?j<3:j>=3));const s2=s>=0?s:b.slotPet.findIndex(x=>!x);if(s2>=0&&b.canDeploy(ci,s2))b.deploy(ci,s2);}
  for(let ci=0;ci<b.cards.length;ci++)if(b.cards[ci].petId)b.upgrade(ci);
  for(const o of [...b.offers])if(b.gold>o.cost+80)b.buyCard(o.id);
  if(b.captainReady()){const ms=b.monsters.filter(m=>m.state!=='dead');if(ms.length>=4){let best=ms[0],bn=0;for(const m of ms){const n=ms.filter(o=>Math.hypot(o.x-m.x,o.y-m.y)<90).length;if(n>bn){bn=n;best=m;}}b.castCaptain({x:best.x,y:best.y});}}
  b.step(1/30);b.drain();}
 return {win:!!b.result?.win,time:b.time,stars:b.result?.stars||0};}
if(process.argv[1].endsWith('required.mjs'))for(const st of stages){let lo=.5,hi=16;
 const ok=m=>[11,23].every(s=>play(st,m,s).win);if(!ok(hi)){console.log(STAGES[st].name,'>16');continue;}
 for(let k=0;k<6;k++){const mid=Math.sqrt(lo*hi);if(ok(mid))hi=mid;else lo=mid;}
 const r=play(st,hi,11);console.log(`${STAGES[st].name.padEnd(4)} diff=${STAGES[st].diff.toFixed(1).padStart(4)} needs x${hi.toFixed(2)}  (at that power: ${Math.round(r.time)}s, ${r.stars}★)`);}
