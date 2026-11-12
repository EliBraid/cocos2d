// 福利中心 (签到 / 在线 / 体力 / 兑换码), 任务 (每日活跃 + 成就) and 邮件.
import {IS_XHS} from './Platform';
import {Node,Color,Graphics} from 'cc';
import {C} from './PaperUI';
import {PETS} from './battle/BattleConfig';
import {MATS,MAT_COLOR} from './meta/Gear';
import {signReward,NEWBIE_GOALS,ONLINE,SUPPLY,AD_STAMINA,DAILY,CHESTS,ACH,MAILS,mergeBundles} from './meta/Welfare';
import type {Bundle,DailyKey} from './meta/Welfare';
import {Ads} from './Ads';
import type {GearHost} from './UIHost';
import {Kit} from './Kit';
import {col,mix,deep} from './uiutil';
export interface WelfareHub{openAdventure():void;openHatchery():void;openWorkshop():void;openPet():void}
const W=480;
/** where a 七日目标 goal's 前往 button sends the player */
const GOAL_GO=(id:string)=>id.startsWith('clear')||id.startsWith('stars')||id.startsWith('kill')||id.startsWith('cap')?'adventure':id==='hatch1'||id==='own10'?'hatch':id==='forge1'?'workshop':'pet';
/** text input: WeChat's editable modal, the browser prompt elsewhere */
export function askText(title:string,placeholder:string):Promise<string|null>{const wx=(globalThis as any).wx;
 if(wx?.showModal)return new Promise(ok=>wx.showModal({title,editable:true,placeholderText:placeholder,success:(r:any)=>ok(r.confirm?String(r.content||''):null),fail:()=>ok(null)}));
 if(IS_XHS)return domAsk(title,placeholder);
 const pr=(globalThis as any).prompt;return Promise.resolve(typeof pr==='function'?pr(title,''):null);}
/** a small HTML dialog over the canvas (Xiaohongshu blocks window.prompt) */
function domAsk(title:string,placeholder:string):Promise<string|null>{const d=(globalThis as any).document;if(!d)return Promise.resolve(null);
 return new Promise(ok=>{const wrap=d.createElement('div');wrap.style.cssText='position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;background:rgba(31,32,27,.55);display:flex;align-items:center;justify-content:center';
  const box=d.createElement('div');box.style.cssText='width:80%;max-width:360px;background:#fffaf0;border-radius:14px;padding:18px 16px 14px;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#3a3326';
  const h=d.createElement('div');h.textContent=title;h.style.cssText='font-size:17px;font-weight:bold;margin-bottom:12px;text-align:center';
  const input=d.createElement('input');input.type='text';input.placeholder=placeholder;input.maxLength=500;input.style.cssText='width:100%;box-sizing:border-box;font-size:16px;padding:10px;border:1px solid #d9cfb8;border-radius:8px;background:#fff;outline:none';
  const row=d.createElement('div');row.style.cssText='display:flex;gap:10px;margin-top:14px';
  const mk=(t:string,bg:string,fg:string)=>{const b=d.createElement('button');b.type='button';b.textContent=t;b.style.cssText=`flex:1;font-size:16px;padding:10px 0;border:0;border-radius:8px;background:${bg};color:${fg}`;return b;};
  const cancel=mk('取消','#e8e1d0','#3a3326'),okb=mk('确定','#f46f5e','#fff');
  const done=(v:string|null)=>{if(wrap.parentNode)wrap.parentNode.removeChild(wrap);ok(v);};
  cancel.addEventListener('click',()=>done(null));okb.addEventListener('click',()=>done(String(input.value||'')));
  input.addEventListener('keydown',(e:any)=>{if(e.key==='Enter')done(String(input.value||''));});
  row.appendChild(cancel);row.appendChild(okb);box.appendChild(h);box.appendChild(input);box.appendChild(row);wrap.appendChild(box);d.body.appendChild(wrap);
  setTimeout(()=>{try{input.focus();}catch{}},50);});}
export class WelfareUI{
 private k:Kit;private wtab=0;private ttab=0;private mailSel:string|null=null;
 constructor(private h:GearHost,private hub:WelfareHub){this.k=new Kit(h);}
 private get m(){return this.h.model();}
 private get ui(){return this.h.ui;}
 // ------------------------------------------------------------------ shared bits
 /** reward chips in a row centred on cx; returns nothing */
 chips(p:Node,cx:number,y:number,b:Bundle,size=44,gap=6){return this.k.bundleChips(p,cx,y,b,size,gap);}
 private tabs(p:Node,w:number,names:string[],cur:number,dots:boolean[],go:(i:number)=>void){const n=names.length,cw=(w-30)/n;
  names.forEach((t,i)=>{this.k.btn(p,'tab'+t,t,15+cw*(i+.5),84,cw-6,38,()=>go(i),cur===i?'gold':'cream',16);if(dots[i])this.ui.img(p,'dot',15+cw*(i+1)-14,70,14);});}
 // ================================================================== 福利
 openWelfare(tab=this.wtab){this.wtab=tab;const m=this.m;m.addOnline(0);
  this.h.modal('福利',(p,w)=>{const now=Date.now();
   // 七日目标 leads the tabs until every goal and chest of the first week is claimed
   const names=['签到','在线奖励','体力补给','兑换码'],dots=[!m.signedToday(now),ONLINE.some((_,i)=>m.onlineReady(i,now)),SUPPLY.some((_,i)=>m.supplyState(i,now)==='open')||m.adStaminaLeft(now)>0,false];
   const pages=[()=>this.sign(p,w,112),()=>this.online(p,w,112),()=>this.supply(p,w,112),()=>this.code(p,w,112)];
   if(m.newbieOpen){names.unshift('七日目标');dots.unshift(m.newbiePending(now)>0);pages.unshift(()=>this.newbie(p,w,112));}
   this.wtab=Math.min(this.wtab,names.length-1);this.tabs(p,w,names,this.wtab,dots,i=>this.openWelfare(i));
   const y=pages[this.wtab]();return y+14;},W);}
 private nday=0;
 private newbie(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui,now=Date.now(),today=Math.min(7,m.newbieDay(now));let y=y0;
  if(!this.nday)this.nday=NEWBIE_GOALS.find(d=>d.day<=today&&(d.goals.some(g=>!m.newbie.includes(g.id))||!m.newbie.includes('chest'+d.day)))?.day||today;
  k.ct(p,'新手七日目标 · 第 7 天宝箱送稀有宠物「小星龙」',w/2,y+12,w-30,20,14,true,C.red);y+=34;
  if(m.newbiePending(now)>0){k.btn(p,'claim-all-newbie','一键领取',w/2,y+20,220,42,()=>{const b=m.claimAllNewbie(now);if(b){m.save();this.h.refresh();this.openWelfare(this.wtab);this.h.reward('七日目标',{b});}},'gold',16,'check');y+=50;}
  // day selector: future days are locked, a dot marks days with something to claim
  const dw=(w-30)/7;for(const d of NEWBIE_GOALS){const open=d.day<=today,x=15+dw*(d.day-.5),pend=d.goals.some(g=>m.goalReady(g.id,now))||m.newbieChestReady(d.day,now);
   k.btn(p,'nd'+d.day,`第${d.day}天`,x,y+20,dw-4,38,()=>{if(!open){this.h.say(`第 ${d.day} 天开放`,1.2);return;}this.nday=d.day;this.openWelfare(this.wtab);},d.day===this.nday?'gold':open?'cream':'grey',13);if(pend)ui.img(p,'dot',x+dw/2-10,y+4,12);}
  y+=50;const day=NEWBIE_GOALS.find(d=>d.day===this.nday)!;
  for(const g of day.goals){const prog=m.goalProgress(g),ready=m.goalReady(g.id,now),done=m.newbie.includes(g.id),row=ui.frame(p,'g'+g.id,w/2,y+30,w-30,58,ready?'card-gold':done?'card-empty':'card');
   k.lt(row,g.name,14,17,220,20,15,true,done?C.muted:C.ink);ui.bar(row,14+60,40,120,9,prog/g.goal,ready||done?C.sage:C.cyan);k.lt(row,`${prog}/${g.goal}`,142,40,70,14,11,true,C.muted);
   this.chips(row,262,29,g.b,34,3);
   k.btn(row,'gc'+g.id,done?'已领取':ready?'领取':'前往',w-30-44,29,74,34,()=>{if(ready){const b=m.claimGoal(g.id,now);m.save();this.h.refresh();this.openWelfare(this.wtab);if(b)this.h.reward('目标达成',{b,sub:g.name});}else if(!done)this.go(GOAL_GO(g.id));},done?'grey':ready?'green':'cream',14);y+=64;}
  // the day chest opens when all three goals of the day are claimed
  const cr=m.newbieChestReady(day.day,now),cg=m.newbie.includes('chest'+day.day),box=ui.frame(p,'nchest',w/2,y+44,w-30,84,cr?'card-gold':cg?'card-empty':'card');
  k.lt(box,`第 ${day.day} 天宝箱`,14,20,200,20,15,true,C.ink);k.lt(box,cg?'已领取':cr?'三个目标都完成了！':'完成当天 3 个目标后开启',14,48,220,16,12,true,cr?col([46,150,70]):C.muted);
  this.chips(box,300,42,day.chest,40,4);
  k.btn(box,'nchestbtn',cg?'已领取':'开启',w-30-44,42,74,36,()=>{const b=m.claimNewbieChest(day.day,now);if(b){m.save();this.h.refresh();this.openWelfare(this.wtab);this.h.reward(`第 ${day.day} 天宝箱`,{b});}else if(!cg)this.h.say('先完成当天的 3 个目标',1.4);},cg?'grey':cr?'gold':'cream',15,'chest');
  return y+92;}
 private sign(p:Node,w:number,y0:number){const m=this.m,k=this.k,now=Date.now(),today=m.signedToday(now),newbie=m.signCount<7||(today&&m.signCount===7);
  const base=newbie?0:7+Math.floor((m.signCount-(today?1:0)-7)/7)*7,cur=today?m.signCount-1:m.signCount;let y=y0;
  k.ct(p,newbie?'新手七日签到 · 第 7 天送稀有宠物「月绒兔」':'每日签到 · 七天一轮，第 7 天奖励最丰厚',w/2,y+12,w-30,20,14,true,newbie?C.red:C.ink);y+=34;
  const cw=(w-30-18)/4,ch=118;
  for(let i=0;i<7;i++){const n=base+i,row=i<4?0:1,col4=i<4?i:i-4,wide=i===6,x=wide?15+cw*2.5+6*2+cw/2+3:15+cw/2+col4*(cw+6),cy=y+ch/2+row*(ch+8),ww=wide?cw*2+6:cw;
   const done=n<m.signCount,isToday=n===cur,card=this.ui.frame(p,'day'+i,x,cy,ww,ch,isToday&&!today?'card-gold':done?'card-empty':'card');
   k.ct(card,`第 ${i+1} 天`,ww/2,16,ww,18,13,true,isToday?C.red:C.muted);this.chips(card,ww/2,64,signReward(n),wide?50:38,4);
   if(done){const g=this.ui.node(card,'done',ww/2,ch/2,ww,ch).addComponent(Graphics);g.fillColor=new Color(255,255,255,120);g.roundRect(-ww/2,-ch/2,ww,ch,10);g.fill();this.ui.icon(card,'check',ww-20,ch-20,28);}
   else if(isToday)k.ct(card,'今天',ww/2,ch-14,ww,16,12,true,C.red);}
  y+=ch*2+8+14;
  if(today&&Ads.available('sign2x')&&m.adLeft('sign2x',now)>0)k.btn(p,'sign2x','看广告再领一份',w/2,y+24,240,52,()=>{this.h.say('广告播放中…',1.2);Ads.rewarded('sign2x').then(ok=>{if(!ok){this.h.say('广告没有看完，奖励未发放',1.6);return;}const b=m.adDoubleSign();if(b){m.save();this.h.refresh();this.openWelfare(this.wtab);this.h.reward('签到翻倍',{b});}});},'gold',20,'energy');
  else if(today)k.ct(p,'今天已经签到啦，明天再来',w/2,y+22,w-40,22,16,true,C.muted);
  else k.btn(p,'do-sign','签到',w/2,y+24,220,52,()=>{const b=m.sign();if(b){m.save();this.h.refresh();this.openWelfare(0);this.h.reward(b.pet?'获得新伙伴！':'签到成功',{b,sub:`累计签到 ${m.signCount} 天`});}},'green',22,'check');
  return y+56;}
 private online(p:Node,w:number,y0:number){const m=this.m,k=this.k,now=Date.now(),mins=Math.floor(m.daily.online/60);let y=y0;
  k.ct(p,`今天已在线 ${mins} 分钟　每天 0 点重置`,w/2,y+12,w-30,20,15,true,C.ink);y+=34;
  if(ONLINE.some((_,i)=>m.onlineReady(i,now))){k.btn(p,'claim-all-online','一键领取',w/2,y+20,220,42,()=>{const b=m.claimAllOnline(now);if(b){m.save();this.h.refresh();this.openWelfare(this.wtab);this.h.reward('在线奖励',{b});}},'gold',16,'check');y+=50;}
  ONLINE.forEach((o,i)=>{const got=m.daily.onlineGot.includes(i),ready=m.onlineReady(i,now),row=this.ui.frame(p,'on'+i,w/2,y+40,w-30,76,ready?'card-gold':'card');
   this.ui.icon(row,'chest',38,38,40);k.lt(row,`在线 ${o.min} 分钟`,66,24,140,20,16,true);this.ui.bar(row,66+70,52,140,10,Math.min(1,m.daily.online/(o.min*60)),ready||got?C.sage:C.cyan);
   this.chips(row,(w-30)/2+70,38,o.b,40);
   k.btn(row,'onc'+i,got?'已领':ready?'领取':`差${Math.max(1,Math.ceil(o.min-m.daily.online/60))}分`,w-30-46,38,76,38,()=>{const b=m.claimOnline(i);if(b){m.save();this.h.refresh();this.openWelfare(1);this.h.reward('在线奖励',{b,sub:`在线 ${o.min} 分钟`});}},got?'grey':ready?'green':'cream',14);y+=84;});
  return y;}
 private supply(p:Node,w:number,y0:number){const m=this.m,k=this.k,now=Date.now();let y=y0;
  k.ct(p,`每天两顿体力补给，错过就没有了　当前体力 ${m.stamina}/${m.staminaMax}`,w/2,y+12,w-30,20,13,true,C.muted);y+=32;
  SUPPLY.forEach((s,i)=>{const st=m.supplyState(i,now),row=this.ui.frame(p,'sp'+i,w/2,y+46,w-30,88,st==='open'?'card-gold':'card');
   this.ui.icon(row,'food',44,44,48);k.lt(row,`${s.name}补给`,84,28,160,22,18,true);k.lt(row,`${String(s.from).padStart(2,'0')}:00 - ${String(s.to).padStart(2,'0')}:00　体力 +${s.stamina}`,84,56,220,18,13,true,C.muted);
   k.btn(row,'spc'+i,st==='done'?'已领':st==='open'?'领取':st==='soon'?'未到时间':'已错过',w-30-56,44,96,40,()=>{const n=m.claimSupply(i);if(n){m.save();this.h.refresh();this.openWelfare(2);this.h.reward(`${s.name}补给`,{b:{stamina:n}});}},st==='open'?'green':'grey',15);y+=96;});
  if(!Ads.available('stamina'))return y;
  const left=m.adStaminaLeft(now),row=this.ui.frame(p,'ad',w/2,y+46,w-30,88,'card');this.ui.icon(row,'energy',44,44,46);
  k.lt(row,`看广告领体力`,84,28,160,22,18,true);k.lt(row,`每次 +${AD_STAMINA.amount}　今天还剩 ${left}/${AD_STAMINA.perDay} 次`,84,56,220,18,13,true,C.muted);
  k.btn(row,'adst',left?'看广告':'明天再来',w-30-56,44,96,40,()=>{if(!left)return;this.h.say('广告播放中…',1.2);Ads.rewarded('stamina').then(ok=>{if(ok){const n=m.claimAdStamina();m.save();this.h.refresh();this.openWelfare(2);this.h.reward('广告奖励',{b:{stamina:n}});}else{this.h.say('广告没看完，没有奖励',1.4);this.openWelfare(2);}});},left?'red':'grey',15);y+=96;
  return y;}
 private code(p:Node,w:number,y0:number){const m=this.m,k=this.k;let y=y0;
  const card=this.ui.frame(p,'codebox',w/2,y+70,w-30,124,'card');this.ui.icon(card,'chest',50,52,56);
  k.lt(card,'兑换码',96,30,200,24,20,true);k.lt(card,'关注官方公众号、社群或活动，获取兑换码',96,60,w-150,18,13,true,C.muted);k.lt(card,'每个兑换码每个账号只能用一次',96,84,w-150,18,12,false,C.muted);y+=142;
  k.btn(p,'redeem','输入兑换码',w/2,y+28,240,54,()=>{askText('输入兑换码','例如 MENGCHONG').then(s=>{if(s===null)return;const r=m.redeem(s);if(r.ok){m.save();this.h.refresh();}this.openWelfare(3);if(r.ok&&r.b)this.h.reward('兑换成功',{b:r.b});else this.h.say(r.msg,1.8);});},'green',20);y+=66;
  if(m.codes.length){k.ct(p,`已使用：${m.codes.join('、')}`,w/2,y+10,w-30,18,12,true,C.muted);y+=24;}
  return y;}
 // ================================================================== 任务
 openTasks(tab=this.ttab){this.ttab=tab;const m=this.m;this.h.modal('任务',(p,w)=>{const now=Date.now();
  this.tabs(p,w,['每日任务','成就'],this.ttab,[DAILY.some(t=>m.dailyReady(t.id,now))||CHESTS.some((_,i)=>m.chestReady(i,now)),ACH.some(a=>m.achReady(a.id))],i=>this.openTasks(i));
  const any=this.ttab===0?DAILY.some(t=>m.dailyReady(t.id,now))||CHESTS.some((_,i)=>m.chestReady(i,now)):ACH.some(a=>m.achReady(a.id));let y0=112;
  if(any){this.k.btn(p,'claim-all-tasks','一键领取',w/2,y0+22,220,44,()=>{const r=m.claimAllTasks(now);m.save();this.h.refresh();this.openTasks(this.ttab);
   this.h.reward('一键领取',{b:r.b,...(r.pts?{extra:[{icon:'star',label:`活跃+${r.pts}`}]}:{})});},'gold',17,'check');y0+=54;}
  return (this.ttab===0?this.daily(p,w,y0):this.achievements(p,w,y0))+14;},W);}
 private daily(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui,now=Date.now(),act=m.activity(now);let y=y0;
  // activity bar with five chests
  const card=ui.frame(p,'act',w/2,y+50,w-30,100,'card');k.lt(card,`今日活跃度 ${act}`,16,20,200,22,17,true);k.lt(card,'每天 0 点刷新',w-30-110,20,100,18,12,true,C.muted);
  const bx=30,bw=w-30-60;ui.bar(card,bx+bw/2,56,bw,12,Math.min(1,act/100),col([255,196,64]));
  CHESTS.forEach((c,i)=>{const x=bx+bw*c.pts/100,ready=m.chestReady(i,now),got=m.daily.chests.includes(i);const b=ui.roundBtn(card,'chest'+i,x,56,36,()=>{const r=m.claimChest(i,now);if(r){m.save();this.h.refresh();this.openTasks(0);this.h.reward('活跃宝箱',{b:r,sub:`活跃度 ${c.pts}`});}else this.h.say(got?'已经领过了':`活跃度 ${c.pts} 可领`,1.2);},'round',got?'check':'chest');
   if(ready){const g=ui.node(b,'glow',18,18,40,40).addComponent(Graphics);g.strokeColor=new Color(255,196,64,255);g.lineWidth=3;g.circle(0,0,20);g.stroke();ui.img(b,'dot',32,4,12);}
   k.ct(card,String(c.pts),x,84,40,14,11,true,C.muted);});y+=110;
  DAILY.forEach(t=>{const prog=m.dailyProgress(t.id,now),ready=m.dailyReady(t.id,now),done=m.daily.done.includes(t.id),row=ui.frame(p,'d'+t.id,w/2,y+26,w-30,50,ready?'card-gold':done?'card-empty':'card');
   k.lt(row,t.name,14,16,200,20,15,true,done?C.muted:C.ink);ui.bar(row,14+60,36,120,9,prog/t.goal,ready||done?C.sage:C.cyan);k.lt(row,`${prog}/${t.goal}`,142,36,60,14,11,true,C.muted);
   k.lt(row,`活跃 +${t.pts}`,210,25,80,18,13,true,col([200,130,20]));
   k.btn(row,'dc'+t.id,done?'已完成':ready?'领取':'前往',w-30-44,25,74,34,()=>{if(ready){const pts=m.claimDaily(t.id as DailyKey,now);m.save();this.h.refresh();this.openTasks(0);this.h.reward('任务完成',{extra:[{icon:'star',label:`活跃+${pts}`}],sub:t.name});}else if(!done)this.go(t.go);},done?'grey':ready?'green':'cream',14);y+=54;});
  return y;}
 private go(where:string){this.h.close();if(where==='adventure')this.hub.openAdventure();else if(where==='hatch')this.hub.openHatchery();else if(where==='workshop')this.hub.openWorkshop();else if(where==='pet')this.hub.openPet();else if(where==='welfare')this.openWelfare(0);else this.h.say('去主城收取训练场或放养所的收益',1.6);}
 private achievements(p:Node,w:number,y0:number){const m=this.m,k=this.k,ui=this.ui;let y=y0;
  for(const a of ACH){const t=m.achTier(a.id),max=t>=a.tiers.length,goal=a.tiers[Math.min(t,a.tiers.length-1)],v=m.achValue(a.id),ready=m.achReady(a.id),row=ui.frame(p,'a'+a.id,w/2,y+32,w-30,62,ready?'card-gold':'card');
   ui.icon(row,'trophy',28,31,32);k.lt(row,a.name,52,18,140,20,16,true);
   for(let i=0;i<a.tiers.length;i++)ui.img(row,i<t?'star':'star-off',156+i*16,18,15);
   ui.bar(row,52+60,42,120,9,Math.min(1,v/goal),ready||max?C.sage:C.cyan);k.lt(row,max?'全部完成':`${Math.min(v,goal)}/${goal} ${a.unit}`,180,42,110,14,11,true,C.muted);
   if(!max)this.chips(row,w-30-150,31,a.b(t),38,3);
   k.btn(row,'ac'+a.id,max?'完成':ready?'领取':'未达成',w-30-42,31,70,34,()=>{const b=m.claimAch(a.id);if(b){m.save();this.h.refresh();this.openTasks(1);this.h.reward('成就达成',{b,sub:`${a.name} · 第 ${t+1} 阶`});}},ready?'green':'grey',14);y+=68;}
  return y;}
 // ================================================================== 邮件
 openMail(){const m=this.m;m.seedMails();this.h.modal('邮件',(p,w)=>{const k=this.k,ui=this.ui;let y=70;
  const sel=this.mailSel?m.mails.find(x=>x.id===this.mailSel):null,def=sel?MAILS.find(d=>d.id===sel.id):null;
  if(sel&&def){m.readMail(sel.id);const card=ui.frame(p,'mail',w/2,y+150,w-30,300,'card');k.lt(card,def.title,16,24,w-60,24,19,true);k.lt(card,`来自：${def.from}　${date(sel.at)}`,16,50,w-60,16,12,true,C.muted);
   const lines=def.body.split('\n');let ly=86;for(const ln of lines){for(let i=0;i<ln.length;i+=24){k.lt(card,ln.slice(i,i+24),16,ly,w-60,20,15,false,C.ink);ly+=24;}}
   if(def.b){k.ct(card,sel.got?'附件（已领取）':'附件',(w-30)/2,236,200,16,12,true,C.muted);this.chips(card,(w-30)/2,270,def.b,44);}y+=312;
   k.btn(p,'mback','返回',w/2-100,y+26,150,46,()=>{this.mailSel=null;this.openMail();},'cream',17);
   if(def.b)k.btn(p,'mget',sel.got?'已领取':'领取附件',w/2+90,y+26,170,46,()=>{const b=m.claimMailId(sel.id);if(b){m.save();this.h.refresh();this.openMail();this.h.reward('邮件附件',{b,sub:def.title});}},sel.got?'grey':'green',17);
   m.save();this.h.refresh();return y+60;}
  if(!m.mails.length){k.ct(p,'暂时没有邮件',w/2,y+40,w-40,22,16,true,C.muted);return y+80;}
  for(const x of m.mails){const d=MAILS.find(dd=>dd.id===x.id)!,row=ui.frame(p,'mr'+x.id,w/2,y+34,w-30,64,x.read?'card-empty':'card');ui.icon(row,'mail',32,32,34);if(!x.read)ui.img(row,'dot',46,16,14);
   k.lt(row,d.title,60,22,w-200,20,16,true,x.read?C.muted:C.ink);k.lt(row,`${d.from}　${date(x.at)}`,60,44,w-200,16,12,true,C.muted);
   if(d.b){ui.icon(row,'chest',w-30-70,32,28);k.ct(row,x.got?'已领':'有附件',w-30-30,32,56,16,11,true,x.got?C.muted:C.red);}
   this.h.tap(row,()=>{this.mailSel=x.id;this.openMail();});y+=70;}
  k.btn(p,'mall','一键领取',w/2,y+28,200,48,()=>{const got=mergeBundles(m.mails.filter(x=>!x.got).map(x=>MAILS.find(d=>d.id===x.id)?.b));const n=m.claimAllMail();m.save();this.h.refresh();this.openMail();if(n)this.h.reward('邮件附件',{b:got,sub:`领取了 ${n} 封邮件`});else this.h.say('没有可领取的附件',1.4);},m.mails.some(x=>!x.got)?'green':'grey',18);return y+64;},W);}
}
const fmt=(n:number)=>n>=10000?(n/10000).toFixed(n>=100000?0:1)+'万':String(n);
const date=(t:number)=>{const d=new Date(t);return `${d.getMonth()+1}月${d.getDate()}日`;};
