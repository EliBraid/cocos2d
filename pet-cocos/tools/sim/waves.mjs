import {Battle} from '../../assets/scripts/battle/BattleCore.ts';
import {PETS,STAGES} from '../../assets/scripts/battle/BattleConfig.ts';
const deck=['turtle','fox','sparrow','chick','cat','dog'];
function play(stage,seed,{up=true,buy=true,bonus=1}={}){const bo={};for(const k of deck)bo[k]=bonus;const b=new Battle(seed,{deck,stage,bonus:bo});let ups=0,cards=0;const intents={};
 for(let i=0;i<900*30&&b.state==='running';i++){
  for(const [ci,c] of b.cards.entries()){const s=b.slotPet.findIndex((p,j)=>!p&&(PETS[c.kind].job==='guard'||PETS[c.kind].job==='warrior'?j<3:j>=3));if(s>=0&&b.canDeploy(ci,s))b.deploy(ci,s);}
  if(up)for(let ci=0;ci<b.cards.length;ci++)if(b.cards[ci].petId&&b.upgrade(ci))ups++;
  if(buy)for(const o of [...b.offers])if(b.gold>o.cost+60&&b.buyCard(o.id))cards++;
  b.step(1/30);for(const e of b.drain())if(e.type==='intent'&&e.what==='start')intents[e.intent.kind]=(intents[e.intent.kind]||0)+1;}
 const r=b.result;return `st${stage} s${seed} ${r.win?'WIN ':'LOSE'} ${r.reason.padEnd(22)} t=${Math.round(r.time)} seg=${b.seg+1} wave=${b.wave} lv=${b.level} petLv=[${b.cards.map(c=>c.lv)}] ups=${ups} cards=${cards} gold=${b.gold}/${b.goldEarned+b.time/5*15|0} enemyCore=${Math.round(b.enemyCore.hp/b.enemyCore.maxHp*100)}% my=${Math.round(b.myCore.hp/b.myCore.maxHp*100)}% ${Object.entries(intents).map(([k,v])=>k+v).join(',')}`;}
for(const st of [0,5,7,15,23,31,39,47,55,63])for(const s of [1])console.log(play(st,s,{bonus:1+STAGES[st].diff*.08}));

