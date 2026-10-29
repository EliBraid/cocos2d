// 萌宠守卫战 · 登录 + 主城. Built at runtime from the code-drawn UI kit (PaperUI + ui/UISkin);
// account data comes from meta/PlayerModel.
import {_decorator,Component,Node,UITransform,Sprite,SpriteFrame,Label,Graphics,Color,UIOpacity,tween,Vec3,resources,sp,director,view,ResolutionPolicy,sys,EventTouch,HorizontalTextAlignment,Mask} from 'cc';
import {PaperUI,C} from './PaperUI';
import {Guide} from './Guide';
import {Kit} from './Kit';
import {activeEvents} from './meta/Events';
import {initShare} from './Share';
import {CampLife} from './CampLife';
import {GearUI} from './GearUI';
import {WelfareUI} from './WelfareUI';
import {CodexUI} from './CodexUI';
import {RewardPop} from './RewardPop';
import type {GearHost} from './UIHost';
import {HEALTH_TIP,AGE_RATING,AGE_TIP,USER_AGREEMENT,PRIVACY} from './meta/Legal';
import type {BtnColor} from './PaperUI';
import {PetAppearance} from './PetAppearance';
import {FOX_PROFILE,PET_LOOK} from './PetProfile';
import {FOX_RIG,PET_SKELETON} from './ActiveRig';
import {MATS,gemLabel} from './meta/Gear';
import {PET_MAX_LEVEL,HATCH,TRAIN,PlayerModel,STAMINA,TASKS,formatCount} from './meta/PlayerModel';
import {PETS,JOBS,RARITY,STAGES,CHAPTERS,CAPTAINS,stageName,TOWER,towerStage,towerReward} from './battle/BattleConfig';
const {ccclass}=_decorator;
const LINK=new Color(52,120,210),BROWN=new Color(70,44,24),GOLD_TEXT=new Color(214,140,20);
// camp walkable spots (design px, top-left origin) around the crystal ring
const SESSION=globalThis as any;
@ccclass('HomeSlice')
export class HomeSlice extends Component{
 ui=new PaperUI();model!:PlayerModel;ready=false;
 private art:Record<string,SpriteFrame>={};private foxData!:sp.SkeletonData;private minionData!:sp.SkeletonData;
 private root!:Node;private home!:Node;private guide:Guide|null=null;private kit!:Kit;private eventPill:Node|null=null;private eventText:Label|null=null;private login:Node|null=null;private lfx:{t:number;art:Node|null;burst:Graphics;emblem:Node;chars:{n:Node;x:number;y:number;a:number;d:number}[];rib:Node;parts:Graphics;leaves:{x:number;y:number;vx:number;vy:number;r:number;s:number;c:Color;spin:number}[];dot:Node;btn:Node;shine:Graphics;chat:Node;box:Node;guest:Node}|null=null;private modal:Node|null=null;private toastLabel!:Label;private toastT=0;
 private labels:Record<string,Label>={};private xpBar!:(v:number)=>void;private dots:Record<string,Node>={};private stars:Node[]=[];private glow!:Graphics;private time=0;private tick=0;
 private gear!:GearUI;private wf!:WelfareUI;private codex!:CodexUI;private onlineAcc=0;private pop!:RewardPop;private saveAcc=0;private life:CampLife|null=null;private rigs:Record<string,sp.SkeletonData>={};private crystalNode:Node|null=null;private glowNode:Node|null=null;
 async start(){
  try{
   view.setDesignResolutionSize(540,960,ResolutionPolicy.SHOW_ALL);this.node.getComponent(UITransform)!.setContentSize(540,960);
   const load=<T>(name:string,type:any)=>new Promise<T>((ok,fail)=>resources.load(name,type,(e,a)=>e?fail(e):ok(a as T)));
   const frames=['art/camp','art/crystal','battle/ember-avatar','home/emblem','home/ribbon','home/sign','home/chat','home/stage-thumb'];
   await Promise.all([PaperUI.loadSkin(),...frames.map(async n=>{const f=await load<SpriteFrame>(n+'/spriteFrame',SpriteFrame);f.packable=false;this.art[n]=f;})]);
   // paintings made with the Codex batch (tools/imagegen); the screen falls back to the camp art without them
   await Promise.all(['home/login-keyart',...[1,2,3,4,5,6,7,8].map(i=>'stages/ch'+i)].map(async n=>{try{this.art[n]=await load<SpriteFrame>(n+'/spriteFrame',SpriteFrame);}catch{}}));
   await Promise.all(Object.keys(PETS).map(async k=>{try{this.art['pet:'+k]=await load<SpriteFrame>(`pets/portrait/${PETS[k].id}/spriteFrame`,SpriteFrame);}catch{this.art['pet:'+k]=this.art['battle/ember-avatar'];}}));
   [this.foxData,this.minionData]=await Promise.all([load<sp.SkeletonData>(PET_SKELETON,sp.SkeletonData),load<sp.SkeletonData>('battle/minion/minion',sp.SkeletonData)]);
   this.rigs.fox=this.foxData;await Promise.all(Object.keys(PETS).filter(k=>k!=='fox'&&!PET_LOOK[k]?.base).map(async k=>{try{this.rigs[k]=await load<sp.SkeletonData>(`pets/rig/${k}/${k}`,sp.SkeletonData);}catch{}}));for(const k of Object.keys(PETS)){const b=PET_LOOK[k]?.base;if(b&&this.rigs[b])this.rigs[k]=this.rigs[b];}
   // painted layered rigs (tools/layered-rig) replace the fox / base fallbacks wherever a pet has its own
   await Promise.all(Object.keys(PETS).map(async k=>{try{this.rigs[k]=await load<sp.SkeletonData>(`pets/rig/${k}/${k}`,sp.SkeletonData);}catch{}}));
   this.model=new PlayerModel(sys.localStorage);(globalThis as any).__towerFloor=0;initShare();this.model.seedMails();this.build();this.guide=new Guide(this.root,this.ui);this.refresh();this.ready=true;(globalThis as any).__home=this;
   if(!SESSION.__petGuardiansLoggedIn)this.showLogin();else this.showBattleReward();
  }catch(e){console.error(e);this.ui.label(this.node,'主城加载失败',270,450,480,60,26,true);this.ui.label(this.node,String(e),270,510,500,80,14);}
 }
 // ================================================================ helpers
 private sprite(parent:Node,key:string,x:number,y:number,w:number,h:number){const n=this.ui.node(parent,key,x,y,w,h),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.art[key];n.getComponent(UITransform)!.setContentSize(w,h);return n;}
 private text(parent:Node,id:string,s:string,x:number,y:number,w:number,h:number,size=18,bold=true,color=C.ink,align=HorizontalTextAlignment.CENTER){const l=this.ui.label(parent,s,x,y,w,h,size,bold,color,align);if(id)this.labels[id]=l;return l;}
 /** white text with an ink outline, for text sitting on art or coloured bands */
 private bold(parent:Node,s:string,x:number,y:number,w:number,h:number,size=18,color=C.white,outline=C.ink,width=2.5){const l=this.text(parent,'',s,x,y,w,h,size,true,color);l.enableOutline=true;l.outlineColor=outline;l.outlineWidth=width;return l;}
 private tap(n:Node,fn:()=>void){n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;fn();});return n;}
 private hit(parent:Node,name:string,x:number,y:number,w:number,h:number,fn:()=>void){return this.tap(this.ui.node(parent,name,x,y,w,h),fn);}
 private dot(parent:Node,id:string,x:number,y:number){const n=this.ui.img(parent,'dot',x,y,16);this.dots[id]=n;return n;}
 private say(s:string,t=1.6){this.toastLabel.string=s;this.toastT=t;}
 private starRow(parent:Node,x:number,y:number,size:number,count:number,gap=size*1.05){const out:Node[]=[];for(let i=0;i<3;i++)out.push(this.ui.img(parent,i<count?'star':'star-off',x+i*gap,y,size));return out;}
 // ================================================================ home
 private build(){
  this.root=this.ui.node(this.node,'Home',270,480,540,960);this.home=this.ui.node(this.root,'Main',270,480,540,960);const h=this.home,ui=this.ui;
  ui.rect(h,'Paper',270,480,540,960,new Color(239,230,207),false);
  // camp painting + crystal
  const campNode=this.sprite(h,'art/camp',270,372,540,540);
  const glowNode=ui.node(h,'CrystalGlow',263,322,140,90);this.glow=glowNode.addComponent(Graphics);
  const crystalNode=this.sprite(h,'art/crystal',263,300,112,110);this.crystalNode=crystalNode;this.glowNode=glowNode;
  this.hit(h,'CrystalTap',263,300,100,100,()=>this.life?.crystalTap());
  this.sign(h,'孵化屋',112,206,()=>this.openHatchery());
  this.sign(h,'训练场',432,264,()=>this.openTraining());this.hit(h,'TargetTap',455,305,84,92,()=>this.openTraining());this.dot(h,'train',476,246);
  const host:GearHost={ui,model:()=>this.model,art:()=>this.art,text:(p,id,s,x,y,w,hh,size,bold,color,align)=>this.text(p,id,s,x,y,w,hh,size,bold,color,align),bold:(p,s,x,y,w,hh,size,color,outline,width)=>this.bold(p,s,x,y,w,hh,size,color,outline,width),
   sprite:(p,k,x,y,w,hh)=>this.sprite(p,k,x,y,w,hh),tap:(n,fn)=>this.tap(n,fn),modal:(t,b,w)=>this.openModal(t,b,w),page:b=>this.openPage(b),close:()=>this.closeModal(),say:(s,t)=>this.say(s,t),refresh:()=>this.refresh(),startAdventure:()=>this.startAdventure(),settings:()=>this.openSettings(),reward:(t,o)=>this.pop.show(t,o)};this.pop=new RewardPop(host,()=>this.root);this.gear=new GearUI(host);
  this.kit=new Kit(host);
  this.wf=new WelfareUI(host,{openAdventure:()=>this.openAdventure(),openHatchery:()=>this.openHatchery(),openWorkshop:()=>this.gear.openWorkshop(),openPet:()=>this.openPet()});
  this.codex=new CodexUI(host,this.wf,{openPetDetail:k=>this.gear.openPetDetail(k)});
  this.sign(h,'工坊',462,476,()=>this.gear.openWorkshop());
  this.life=new CampLife({ui,parent:h,rigs:this.rigs,crystal:this.crystalNode,glow:this.glowNode,camp:this.art['art/camp'],campNode:campNode,tap:(n,fn)=>this.tap(n,fn),say:t=>this.say(t),getDeck:()=>this.model.deck});
  // side buttons
  const side:[string,string,()=>void][]=[['chest','福利',()=>this.wf.openWelfare()],['mail','邮件',()=>this.openMail()],['task','任务',()=>this.openTasks()],['book','图鉴',()=>this.codex.open()],['trophy','试炼',()=>this.openTower()]];
  side.forEach(([id,name,fn],i)=>{const y=136+i*66;ui.roundBtn(h,'side:'+id,506,y,50,fn,'round',id);this.bold(h,name,506,y+33,60,20,13,C.ink,C.white,3);this.dot(h,id,527,y-20);});
  // 限时活动 pill under the top bar (filled in refresh)
  {const pill=ui.rect(h,'EventPill',220,124,330,32,new Color(46,38,30,210),false);this.eventPill=pill;this.eventText=this.text(pill,'','',165,16,320,26,14,true,C.white);
   this.tap(pill,()=>{const ev=activeEvents();if(ev.length)this.say(ev.map(e=>`${e.name}：${e.desc}`).join('\n'),3);});}
  // top bar
  ui.frame(h,'Top',270,52,532,98,'panel');
  ui.img(h,'avatar-ring',54,52,78);this.sprite(h,'battle/ember-avatar',54,50,60,54);this.hit(h,'Avatar',54,52,78,78,()=>this.openCaptain());this.dot(h,'cap',84,24);
  this.text(h,'name','',150,32,104,30,21,true,C.ink,HorizontalTextAlignment.LEFT);ui.icon(h,'pencil',214,31,22);this.hit(h,'EditName',180,32,90,34,()=>this.say('改名功能下一步接入微信昵称'));
  this.text(h,'level','',150,57,104,22,14,true,C.muted,HorizontalTextAlignment.LEFT);this.xpBar=ui.bar(h,152,77,110,12,0,C.cyan);this.hit(h,'LevelTap',200,66,150,40,()=>this.openCaptain());
  this.counter(h,'coins','coin',322,40,104);this.counter(h,'food','food',430,40,92);
  ui.roundBtn(h,'settings',507,40,36,()=>this.openSettings(),'round','gear');
  this.text(h,'stamina-tip','',380,77,230,20,12,true,C.muted,HorizontalTextAlignment.RIGHT);
  // squad: header (title / power / edit) + six evenly spread cards centred in the panel
  ui.frame(h,'Squad',270,632,532,138,'panel');ui.icon(h,'paw',34,590,24);this.text(h,'','我的出战小队',118,590,150,26,18,true,C.ink,HorizontalTextAlignment.LEFT);
  ui.icon(h,'swords',214,590,26);this.text(h,'','战力',246,590,40,20,13,true,C.muted);const pw=this.bold(h,'',322,590,100,28,22,C.red,C.white,3);this.labels.power=pw;
  ui.btn(h,'edit-team','编辑阵容',468,590,112,34,()=>this.openPet(),'cream',14,'team');
  this.buildSquad();
  // stage card
  ui.frame(h,'Stage',270,780,532,156,'panel');
  const thumb=ui.frame(h,'Thumb',80,744,124,78,'card');this.thumb=this.sprite(thumb,this.art['stages/ch1']?'stages/ch1':'home/stage-thumb',62,37,112,66);
  this.labels.stagename=this.text(h,'','',258,730,228,26,18,true,C.ink,HorizontalTextAlignment.LEFT);
  ui.icon(h,'target',155,758,20);this.labels.goal=this.text(h,'','',220,758,110,22,15,true,C.muted,HorizontalTextAlignment.LEFT);
  this.stars=this.starRow(h,318,757,22,0);
  ui.btn(h,'route','地图',470,732,92,36,()=>this.openAdventure(),'cream',15,'compass');
  ui.btn(h,'adventure','开始冒险',214,820,280,64,()=>this.startAdventure(),'red',27,'swords');
  const st=ui.frame(h,'Stamina',440,818,148,58,'card');ui.icon(st,'energy',24,22,28);this.text(st,'stamina','',72,22,66,26,19,true);ui.roundBtn(st,'stamina-plus',128,22,24,()=>this.wf.openWelfare(2),'plus');
  this.text(st,'',`每次冒险消耗 ${STAMINA.battleCost}`,74,44,128,18,12,true,C.muted);
  // bottom navigation
  ui.frame(h,'Nav',270,918,544,96,'panel');
  const tabs:[string,string][]=[['home','主城'],['paw','宠物'],['bag','背包'],['compass','冒险']];
  tabs.forEach(([icon,name],i)=>{const x=72+i*132,active=i===0;
   const t=active?ui.frame(h,'tab:'+name,x,904,120,90,'btn-gold'):ui.node(h,'tab:'+name,x,914,120,84);
   ui.icon(t,icon,60,active?34:30,active?42:36);if(active)this.bold(t,name,60,68,100,24,19);else this.text(t,'',name,60,66,100,22,16,true,C.muted);
   if(i===1)this.dot(t,'pet',88,16);
   this.tap(t,()=>{if(i===0)return;if(i===1)this.openPet();else if(i===2)this.gear.bag.open(0);else this.openAdventure();});});
  this.toastLabel=this.bold(this.root,'',270,540,460,40,19,C.ink,C.white,4);this.toastLabel.node.addComponent(UIOpacity).opacity=0;
 }
 private counter(parent:Node,id:string,icon:string,x:number,y:number,w:number){const p=this.ui.frame(parent,'counter:'+id,x,y,w,36,'pill');this.ui.icon(parent,icon,x-w/2+4,y,34);
  this.text(p,id,'',w/2+2,18,w-44,28,18,true);this.ui.roundBtn(p,id+'-plus',w-14,18,22,()=>this.say('商店下一步开放'),'plus');return p;}
 private sign(parent:Node,s:string,x:number,y:number,fn:()=>void){const n=this.sprite(parent,'home/sign',x,y,104,58);this.text(n,'',s,52,20,90,26,18,true,new Color(58,34,16));this.tap(n,fn);return n;}
 private squadNode:Node|null=null;private thumb:Node|null=null;
 private buildSquad(){const ui=this.ui;if(this.squadNode?.isValid)this.squadNode.destroy();const h=ui.node(this.home,'SquadSlots',270,480,540,960);this.squadNode=h;
  const cw=76,gap=(500-6*cw)/5;
  for(let i=0;i<6;i++){const x=270-250+cw/2+i*(cw+gap),y=652,k=this.model.deck[i];
   if(k){const d=PETS[k],slot=ui.frame(h,'slot:'+i,x,y,cw,86,'slot-'+d.rarity);this.sprite(slot,'pet:'+k,cw/2,34,60,60);this.bold(slot,JOBS[d.job].name,cw/2,72,cw-8,18,13);this.tap(slot,()=>this.openPet());}
   else{const slot=ui.frame(h,'slot:'+i,x,y,cw,86,'card-empty');ui.img(slot,'plus',cw/2,43,28);this.tap(slot,()=>this.openPet());}}
 }
 private refresh(){const m=this.model;if(this.ready)this.buildSquad();m.regen();this.labels.name.string=m.name;this.labels.level.string=`队长 Lv.${m.captainLevel}`;this.xpBar(m.captainProgress);
  this.labels.coins.string=formatCount(m.coins);this.labels.food.string=formatCount(m.food);this.labels.stamina.string=`${m.stamina}/${m.staminaMax}`;this.labels.power.string=m.teamPower.toLocaleString('en-US');
  const s=m.secondsToNextStamina();this.labels['stamina-tip'].string=s?`体力 +1  ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`:'';
  const cur=STAGES[m.stage];const tf=this.art[`stages/ch${cur.chapter}`]||this.art['stages/ch1']||this.art['home/stage-thumb'];if(this.thumb&&tf)this.thumb.getComponent(Sprite)!.spriteFrame=tf;this.labels.stagename.string=`${cur.chapterName} · ${stageName(m.stage)}`;this.labels.goal.string=cur.boss?'守住核心':'摧毁敌方核心';
  this.stars.forEach((n,i)=>{const want=i<m.stageStars[m.stage]?'star':'star-off',sp=n.getComponentInChildren(Sprite);if(sp&&PaperUI.skin[want])sp.spriteFrame=PaperUI.skin[want];});
  this.dots.train.active=m.trainPending().seconds>=3600;this.dots.mail.active=m.mailPending>0;this.dots.task.active=m.tasksReady()>0;this.dots.book.active=m.codexPending()>0;this.dots.chest.active=m.welfareReady()>0;{const ev=activeEvents();if(this.eventPill)this.eventPill.active=ev.length>0;if(this.eventText)this.eventText.string=ev.length?`今日活动：${ev.map(e=>e.name).join('、')}　点击查看`:'';}this.dots.trophy.active=m.towerOpen&&m.towerTries()>0&&m.towerBest<m.towerNext;this.dots.pet.active=m.owned.some(k=>m.canMergeAny(k));this.dots.cap.active=m.roadReady>0;}
 update(dt:number){if(!this.ready)return;this.time+=dt;this.homeGuide(dt);this.pop?.update(dt);if(this.lfx)this.animateLogin(dt);this.life?.update(dt);this.gear?.update(dt);
  const g=this.glow;g.clear();const k=.5+.5*Math.sin(this.time*2.2);g.fillColor=new Color(76,213,220,Math.round(40+40*k));g.ellipse(0,0,58+6*k,24+3*k);g.fill();
  this.tick-=dt;if(this.tick<=0){this.tick=1;this.refresh();}
  this.onlineAcc+=dt;if(this.onlineAcc>=10){this.model.addOnline(Math.floor(this.onlineAcc));this.onlineAcc%=1;this.saveAcc+=10;if(this.saveAcc>=30){this.saveAcc=0;this.model.save();}}
  if(this.toastT>0){this.toastT-=dt;this.toastLabel.node.getComponent(UIOpacity)!.opacity=Math.round(255*Math.min(1,this.toastT*3));}}
 // ================================================================ actions
 /** 试炼之塔: endless floors, no stamina; losses use one of 3 daily tries, wins keep climbing */
 private openTower(){const m=this.model;if(!m.towerOpen){this.say(`通关 ${STAGES[TOWER.unlockStage].name} 后开放试炼之塔`,1.8);return;}
  this.openModal('试炼之塔',(p,w)=>{const n=m.towerNext,st=towerStage(n),left=m.towerTries();
   this.text(p,'','无尽的挑战：每层更强，首次通关有奖励。不消耗体力，失败才消耗挑战次数。',w/2,82,w-40,40,14,false,C.muted);
   this.bold(p,`最高 ${m.towerBest} 层`,w/2,132,w-40,30,24,C.ink,C.white,3);
   this.text(p,'',`下一层：第 ${n} 层${st.boss?' · 首领层':st.elite?' · 精英层':''}　敌人强度 ×${st.hpScale.toFixed(1)}`,w/2,170,w-40,22,15,true,st.boss?C.red:C.ink);
   this.text(p,'','首通奖励',w/2,200,w-40,18,13,true,C.muted);this.kit.bundleChips(p,w/2,240,towerReward(n),48,8);
   const nb=Math.ceil(n/TOWER.bossEvery)*TOWER.bossEvery;this.text(p,'',`第 ${nb} 层首领奖励宝石`,w/2,290,w-40,18,12,true,C.muted);
   this.text(p,'',`今日剩余挑战机会 ${left}/${TOWER.dailyTries}（胜利不消耗）`,w/2,322,w-40,20,14,true,left>0?C.ink:C.red);
   this.ui.btn(p,'tower-go',left>0?`挑战第 ${n} 层`:'明天再来',w/2,376,220,54,()=>{if(m.towerTries()<=0){this.say('今天的挑战机会用完了，明天再来',1.6);return;}
    (globalThis as any).__towerFloor=n;const cover=this.ui.rect(this.root,'Fade',270,480,540,960,new Color(31,32,27,255),false),op=cover.addComponent(UIOpacity);op.opacity=0;tween(op).to(.25,{opacity:255}).call(()=>director.loadScene('Battle')).start();},left>0?'red':'grey',21,'trophy');
   return 420;});}
 private startAdventure(){(globalThis as any).__towerFloor=0;if(!this.model.startBattle()){this.say(`体力不足（需要 ${STAMINA.battleCost}），${Math.ceil(this.model.secondsToNextStamina()/60)} 分钟后恢复 1 点`,2.2);return;}
  this.model.save();this.refresh();const cover=this.ui.rect(this.root,'Fade',270,480,540,960,new Color(31,32,27,255),false),op=cover.addComponent(UIOpacity);op.opacity=0;tween(op).to(.25,{opacity:255}).call(()=>director.loadScene('Battle')).start();}
 private showBattleReward(){const r=this.model.lastReward;if(!r)return;this.model.lastReward=null;this.model.save();
  this.openModal('冒险归来',(p,w)=>{this.rewardRow(p,w/2,86,[['coin',`+${r.coins}`,'金币'],['food',`+${r.food}`,'食物'],['star',`+${r.xp}`,'队长经验']]);let y=150;
   const mt=r.mats,got=mt?MATS.filter(x=>(mt[x.id]||0)>0):[];
   if(got.length){this.text(p,'','获得材料',w/2,y+4,200,18,13,true,C.muted);this.text(p,'',got.map(x=>`${x.name} ×${mt![x.id]}`).join('　'),w/2,y+26,w-30,22,15,true,C.ink);y+=48;}
   const gm=r.gems?Object.keys(r.gems).filter(k=>r.gems![k]>0):[];if(gm.length){this.text(p,'','获得宝石',w/2,y+4,200,18,13,true,C.muted);this.text(p,'',gm.map(k=>`${gemLabel(k)} ×${r.gems![k]}`).join('　'),w/2,y+26,w-30,22,15,true,C.ink);y+=48;}
   if(r.captainLevelUp){this.bold(p,`队长升到 ${this.model.captainLevel} 级！`,w/2,y+12,300,30,20,C.red,C.white,3);y+=36;}
   this.ui.btn(p,'reward-ok','收下',w/2,y+34,170,52,()=>this.closeModal(),'green',22);return y+70;});}
 /** a row of reward chips: icon above amount, centred on cx */

 private fmtTime(s:number){const h=Math.floor(s/3600),mi=Math.floor(s%3600/60);return h>0?`${h}小时${mi}分`:`${mi}分钟`;}
 private openTraining(){const m=this.model;this.openModal('训练场',(p,w)=>{const pend=m.trainPending(),r=m.trainRates();
  this.text(p,'','阵容里的宠物在这里挂机训练，离开也会产出。',w/2,82,w-40,22,14,false,C.muted);
  m.deck.forEach((k,i)=>{const x=w/2+(i-(m.deck.length-1)/2)*58;const chip=this.ui.frame(p,'tp:'+k,x,132,52,64,'card');this.sprite(chip,'pet:'+k,26,26,44,44);this.bold(chip,'Lv.'+m.petLevel(k),26,54,50,16,12,C.ink,C.white,3);});
  const bw=w-80;this.ui.bar(p,w/2,192,bw,16,pend.seconds/TRAIN.capSeconds,pend.full?C.red:C.cyan);
  this.bold(p,pend.full?'已满仓':`已训练 ${this.fmtTime(pend.seconds)} / ${this.fmtTime(TRAIN.capSeconds)}`,w/2,200,bw,16,12,C.white,C.ink,2.5);
  this.rewardRow(p,w/2,262,[['coin',`+${pend.coins}`,'金币'],['food',`+${pend.food}`,'经验果']]);
  this.text(p,'',`每小时 +${Math.round(r.coins)} 金币　+${r.food.toFixed(1)} 经验果`,w/2,340,w-40,20,14,true,C.ink);
  this.text(p,'','阵容宠物等级越高，产出越快。最多存 8 小时。',w/2,364,w-40,20,12,false,C.muted);
  const ok=pend.coins>0||pend.food>0;
  this.ui.btn(p,'collect-train',ok?'收取':'还没有产出',w/2,414,200,52,()=>{const got=m.collectTrain();if(got){m.save();this.refresh();this.life?.trainCollect();this.openTraining();this.pop.show('训练收益',{b:{coins:got.coins,food:got.food}});}},ok?'green':'grey',21);return 450;});}
 private rewardRow(p:Node,cx:number,y:number,items:([string,string]|[string,string,string])[],gap=96){items.forEach(([icon,s,name],i)=>{const x=cx+(i-(items.length-1)/2)*gap;const chip=this.ui.frame(p,'reward:'+icon,x,y,80,74,'card');this.ui.icon(chip,icon,40,30,40);this.bold(chip,s,40,58,76,22,16,C.ink,C.white,3);
  if(name)this.text(p,'',name,x,y+48,90,18,12,true,C.muted);});}
 // ================================================================ modals
 private openModal(title:string,body:(panel:Node,w:number)=>number,w=420){const had=!!this.modal?.isValid;this.closeModal();const ui=this.ui,m=ui.node(this.root,'Modal',270,480,540,960);this.modal=m;
  const dim=ui.rect(m,'Dim',270,480,540,960,new Color(31,32,27,160),false);this.tap(dim,()=>this.closeModal());
  const tmp=ui.node(m,'measure',0,0,1,1);const h=Math.max(200,body(tmp,w)+24);tmp.destroy();
  const panel=ui.frame(m,'Panel',270,Math.max(474,38+h/2),w,h,'panel');this.tap(panel,()=>{});
  const rib=ui.frame(panel,'Title',w/2,0,Math.min(w-40,Math.max(220,title.length*30+150)),54,'ribbon');const rw=rib.getComponent(UITransform)!.width;this.bold(rib,title,rw/2,23,rw-120,34,24,C.white,C.ink,3);
  ui.roundBtn(panel,'close',w-10,8,40,()=>this.closeModal(),'close');
  const content=ui.node(panel,'Body',w/2,h/2,w,h);body(content,w);if(!had){const op=m.addComponent(UIOpacity);op.opacity=0;tween(op).to(.12,{opacity:255}).start();panel.setScale(.92,.92,1);tween(panel).to(.16,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();}}
 /** 主城引导 after the guided first battle: free hatch -> level a pet -> 七日目标 -> keep adventuring; hidden under any panel */
 private homeGuide(dt:number){const g=this.guide,m=this.model;if(!g)return;
  if(this.modal?.isValid||this.login?.isValid||m.guide.includes('home')){g.hide();return;}
  const lv2=m.owned.some(k=>m.petLevel(k)>=2);
  if(m.stats.battles===0)g.show('go0',214,812,'先去打第一场战斗吧！');
  else if(m.hatchCount===0&&m.freeHatchReady())g.show('hatch',112,214,'孵化屋每天能免费孵化一次，去领一只新伙伴',true);
  else if(!lv2)g.show('pet',204,900,'到「宠物」里给宠物升级，战力会提升');
  else if(m.newbiePending()>0)g.show('welfare',506,144,'七日目标的奖励可以领取了',true);
  else if(m.stats.battles<3)g.show('go',214,812,'继续冒险，推进下一关');
  else{m.guide.push('home');m.save();g.hide();return;}
  g.update(dt);}
 private openPage(body:(p:Node)=>void){this.closeModal();const pg=this.ui.node(this.root,'Page',270,480,540,960);this.modal=pg;this.tap(pg,()=>{});body(pg);}
 private closeModal(){if(this.modal?.isValid)this.modal.destroy();this.modal=null;}
 private openMail(){this.wf.openMail();}
 private openTasks(){this.wf.openTasks();}
 private openPet(){this.gear.openPet();}
 private openHatchery(){this.gear.openHatchery();}
 private openAdventure(){this.gear.adv.open();}
 private openCaptain(){this.gear.cap.open(this.model.roadReady>0?0:this.gear.cap.lastTab);}
 private openSettings(){const m=this.model;this.openModal('设置',(p,w)=>{const card=this.ui.frame(p,'Profile',w/2,94,w-48,74,'card');this.ui.img(card,'avatar-ring',40,37,56);this.sprite(card,'battle/ember-avatar',40,36,44,40);
  this.text(card,'',`${m.name}`,80+90,24,180,24,18,true,C.ink,HorizontalTextAlignment.LEFT);this.text(card,'',`队长 Lv.${m.captainLevel}　冒险 ${m.stats.battles} 场　胜利 ${m.stats.wins} 场`,80+120,50,240,20,12,true,C.muted,HorizontalTextAlignment.LEFT);
  this.ui.btn(p,'reset','重置本地进度',w/2,170,210,48,()=>{const b=this.ui.buttons.get('reset')!;if(b.name!=='button:reset-confirm'){b.name='button:reset-confirm';b.getComponentInChildren(Label)!.string='再点一次确认';return;}
   try{sys.localStorage.removeItem('pet-guardians-player-v1');}catch{}this.model=new PlayerModel(sys.localStorage);this.model.save();this.closeModal();this.refresh();this.say('进度已重置');},'grey',17);
  const docs:[string,string][]=[['用户协议',USER_AGREEMENT],['隐私政策',PRIVACY],['适龄提示',AGE_TIP],['健康游戏忠告',HEALTH_TIP]];
  docs.forEach(([t,b],i)=>this.ui.btn(p,'doc'+i,t,w/2+(i%2?92:-92),236+Math.floor(i/2)*54,170,44,()=>this.openDoc(t,b),'cream',15));
  this.ui.btn(p,'set-code','兑换码',w/2,350,170,44,()=>this.wf.openWelfare(3),'cream',15,'chest');
  this.text(p,'','版本号 0.3.0',w/2,392,w-40,20,12,true,C.muted);return 408;});}
 // ================================================================ login
 private showLogin(){const ui=this.ui,L=ui.node(this.root,'Login',270,480,540,960);this.login=L;this.tap(ui.node(L,'Block',270,480,540,960),()=>{});
  ui.rect(L,'Paper',270,480,540,960,new Color(247,243,231),false);const keyart=!!this.art['home/login-keyart'];
  let artNode:Node|null=null;if(keyart)artNode=this.sprite(L,'home/login-keyart',270,480,540,960);else{const camp=this.sprite(L,'art/camp',270,600,760,760);camp.addComponent(UIOpacity).opacity=70;}
  const fade=ui.node(L,'Fade',270,300,540,600).addComponent(Graphics);for(let i=0;i<12;i++){fade.fillColor=new Color(247,243,231,Math.round((keyart?150:255)*(1-i/12)));fade.rect(-270,300-i*30-30,540,30);fade.fill();}
  // drifting leaves and sparkles over the art; a slow light burst behind the emblem
  const parts=ui.node(L,'Leaves',270,480,540,960).addComponent(Graphics);const burst=ui.node(L,'Burst',270,92,300,300).addComponent(Graphics);
  const emblem=this.sprite(L,'home/emblem',270,92,150,128);
  // title: one label per character so they can drop in and bob one after another
  const chars:{n:Node;x:number;y:number;a:number;d:number}[]=[];
  [...'萌宠'].forEach((ch,i)=>{const l=this.text(L,'',ch,123+i*70,196,80,86,70,true,C.red);l.enableOutline=true;l.outlineColor=C.ink;l.outlineWidth=4;chars.push({n:l.node,x:123+i*70,y:196,a:4,d:.15+i*.1});});
  [...'守卫战'].forEach((ch,i)=>{const l=this.text(L,'',ch,294+i*66,198,76,86,66,true,C.ink);l.enableOutline=true;l.outlineColor=C.white;l.outlineWidth=3;chars.push({n:l.node,x:294+i*66,y:198,a:-3,d:.38+i*.1});});
  const rib=this.sprite(L,'home/ribbon',270,268,400,72);this.text(rib,'','养一队萌宠，守住你的城。',200,32,330,34,22,true);
  if(!keyart)this.sprite(L,'art/crystal',308,448,176,172);
  if(!keyart)for(const [x,y,s,f] of [[46,618,.62,1],[500,560,.55,-1],[470,668,.45,-1]] as number[][]){const n=new Node('Lurker');n.layer=L.layer;L.addChild(n);n.addComponent(UITransform).setContentSize(80,80);const k=n.addComponent(sp.Skeleton);k.premultipliedAlpha=false;k.skeletonData=this.minionData;k.setSkin('fuzz');k.setSlotsToSetupPose();k.setAnimation(0,'idle',true);k.color=new Color(70,60,76,255);n.setPosition(x-270,480-y,0);n.setScale(s*f,s,1);}
  const fx=new Node('LoginFox');fx.layer=L.layer;L.addChild(fx);fx.addComponent(UITransform).setContentSize(200,200);const fk=fx.addComponent(sp.Skeleton);fk.premultipliedAlpha=false;fk.skeletonData=this.rigs.fox||this.foxData; // hand-painted fox (tools/layered-rig)
  new PetAppearance(fk,{...FOX_PROFILE.appearance}).apply(false);
  fk.setAnimation(0,'idle',true);fk.setAnimation(1,'face-focus',true);fk.setAnimation(2,'look-right',true);fx.setPosition(196-270,480-640,0);fx.setScale(.42,.42,1);this.tap(this.ui.node(L,'LoginFoxHit',196,560,160,190),()=>{fk.setAnimation(0,'attack',false);fk.addAnimation(0,'idle',true,0);});
  const server=ui.btn(L,'server','萌宠1服 · 推荐',270,724,320,52,()=>this.say('当前只开放 萌宠1服'),'cream',19);
  const online=ui.node(server.getChildByName('content')!,'Online',62,26,16,16).addComponent(Graphics);online.fillColor=new Color(76,190,110);online.strokeColor=C.ink;online.lineWidth=2;online.circle(0,0,6);online.fill();online.stroke();
  const login=ui.btn(L,'wx-login','微信登录',270,806,380,80,()=>this.doLogin(),'red',34);const chat=this.sprite(login.getChildByName('content')!,'home/chat',78,40,52,48);
  const sm=ui.node(login,'ShineMask',190,38,364,66);sm.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const shine=ui.node(sm,'Shine',182,33,364,66).addComponent(Graphics);
  const agree=ui.node(L,'Agree',270,862,420,34);const box=ui.frame(agree,'Box',40,17,26,26,'card');const check=ui.icon(box,'check',14,12,26);check.active=this.model.agreed;
  const toggle=()=>{this.model.agreed=!this.model.agreed;check.active=this.model.agreed;this.model.save();};this.tap(box,toggle);
  this.text(agree,'','我已阅读并同意',118,17,112,24,15,false,C.ink,HorizontalTextAlignment.LEFT);this.hit(agree,'AgreeText',118,17,112,30,toggle);
  this.tap(this.text(agree,'','《用户协议》',230,17,100,24,15,false,LINK).node,()=>this.openDoc('用户协议',USER_AGREEMENT));
  this.tap(this.text(agree,'','《隐私政策》',332,17,100,24,15,false,LINK).node,()=>this.openDoc('隐私政策',PRIVACY));
  const guest=this.text(L,'','游客体验 ›',270,900,140,30,16,true,C.muted).node;this.tap(guest,()=>this.enter());
  HEALTH_TIP.split('\n').forEach((t,i)=>this.bold(L,t,270,926+i*18,520,18,11,C.ink,C.white,2));
  const leaves=Array.from({length:16},()=>this.newLeaf(true));
  this.lfx={t:0,art:artNode,burst,emblem,chars,rib,parts,leaves,dot:online.node,btn:login,shine,chat,box,guest};
  for(const c of chars){c.n.setScale(0,0,1);}emblem.setScale(.2,.2,1);
  const age=ui.rect(L,'Age',42,40,58,58,new Color(88,170,96),true);this.bold(age,AGE_RATING,29,24,54,28,24,C.white,C.ink,3);this.text(age,'','适龄提示',29,46,56,14,10,true,C.white);this.tap(age,()=>this.openDoc('适龄提示',AGE_TIP));
  this.text(L,'','版本号 0.3.0',492,20,90,16,10,false,C.muted);}
 private docPage=0;
 /** long text: wrapped to the card width and paged */
 private openDoc(title:string,body:string,page=0){this.docPage=page;const per=17,cols=25,lines:string[]=[];for(const para of body.split('\n')){if(!para){lines.push('');continue;}for(let i=0;i<para.length;i+=cols)lines.push(para.slice(i,i+cols));}
  const pages=Math.max(1,Math.ceil(lines.length/per));this.openModal(title,(p,w)=>{const c=this.ui.frame(p,'Doc',w/2,70+per*11+12,w-36,per*22+24,'card');
   lines.slice(page*per,page*per+per).forEach((t,i)=>this.text(c,'',t,(w-36)/2,22+i*22,w-64,20,14,i===0&&page===0,C.ink,HorizontalTextAlignment.LEFT));let y=70+per*22+30;
   if(pages>1){this.ui.btn(p,'dprev','上一页',w/2-110,y+20,110,40,()=>this.openDoc(title,body,Math.max(0,page-1)),'cream',15);this.text(p,'',`${page+1}/${pages}`,w/2,y+20,80,20,14,true,C.muted);this.ui.btn(p,'dnext','下一页',w/2+110,y+20,110,40,()=>this.openDoc(title,body,Math.min(pages-1,page+1)),'cream',15);y+=46;}
   return y;},460);}
 private newLeaf(anywhere=false){const greens=[[126,176,72],[168,200,90],[232,196,80],[240,150,90],[255,250,220]];const c=greens[Math.floor(Math.random()*greens.length)];
  return {x:anywhere?Math.random()*560-10:-20-Math.random()*60,y:anywhere?Math.random()*900:Math.random()*500,vx:18+Math.random()*30,vy:22+Math.random()*30,r:Math.random()*6.28,s:4+Math.random()*5,c:new Color(c[0],c[1],c[2],c[0]===255?200:230),spin:(Math.random()-.5)*3};}
 /** the login screen breathes: the title drops in and bobs, the emblem glows, leaves drift, the login button shines */
 private animateLogin(dt:number){const F=this.lfx;if(!F||!this.login?.isValid){this.lfx=null;return;}F.t+=dt;const t=F.t;
  const back=(k:number)=>{k=Math.max(0,Math.min(1,k));const c=1.70158;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2);};
  // emblem: pop in, then float; light rays turn slowly behind it
  const es=t<.5?back(t/.5):1+.03*Math.sin(t*2.2);F.emblem.setScale(es,es,1);F.emblem.setPosition(0,480-92+4*Math.sin(t*1.6),0);
  const b=F.burst;b.clear();const ba=Math.min(1,t/.6)*(.55+.25*Math.sin(t*2.5));for(let i=0;i<12;i++){const a=t*.25+i*Math.PI/6;b.fillColor=new Color(255,226,130,Math.round(110*ba));b.moveTo(0,0);b.lineTo(Math.cos(a-.09)*140,Math.sin(a-.09)*140);b.lineTo(Math.cos(a+.09)*140,Math.sin(a+.09)*140);b.close();b.fill();}
  b.fillColor=new Color(255,240,190,Math.round(120*ba));b.circle(0,0,62);b.fill();
  // title letters drop in one by one, then each bobs a little out of phase
  for(const [i,c] of F.chars.entries()){const k=(t-c.d)/.35;const sc=k<=0?0:k<1?back(k):1;c.n.setScale(sc,sc,1);c.n.setPosition(c.x-270,480-c.y+(k<1?(1-Math.min(1,Math.max(0,k)))*40:0)+3*Math.sin(t*2.4+i*.8),0);c.n.angle=c.a+2*Math.sin(t*1.8+i);}
  F.rib.angle=1.2*Math.sin(t*1.3);
  if(F.art){const z=1.02+.02*Math.sin(t*.25);F.art.setScale(z,z,1);}
  // leaves
  const g=F.parts;g.clear();for(const l of F.leaves){l.x+=l.vx*dt+Math.sin(t*1.5+l.r)*12*dt;l.y+=l.vy*dt;l.r+=l.spin*dt;if(l.y>980||l.x>580)Object.assign(l,this.newLeaf());
   const cx=l.x-270,cy=480-l.y,ca=Math.cos(l.r),sa=Math.sin(l.r),L2=l.s*1.7,W=l.s*.7;g.fillColor=l.c;
   if(l.c.r===255){g.moveTo(cx,cy+l.s);g.lineTo(cx+l.s*.3,cy+l.s*.3);g.lineTo(cx+l.s,cy);g.lineTo(cx+l.s*.3,cy-l.s*.3);g.lineTo(cx,cy-l.s);g.lineTo(cx-l.s*.3,cy-l.s*.3);g.lineTo(cx-l.s,cy);g.lineTo(cx-l.s*.3,cy+l.s*.3);g.close();g.fill();continue;}
   g.moveTo(cx+ca*L2,cy+sa*L2);g.lineTo(cx-sa*W,cy+ca*W);g.lineTo(cx-ca*L2,cy-sa*L2);g.lineTo(cx+sa*W,cy-ca*W);g.close();g.fill();}
  // server dot pulses; login button breathes, a shine sweeps across it, the WeChat icon hops
  const dp=1+.25*Math.max(0,Math.sin(t*4));F.dot.setScale(dp,dp,1);
  const bs=1+.025*Math.sin(t*3);F.btn.setScale(bs,bs,1);
  const sh=F.shine;sh.clear();const sx=((t%2.6)/1.4)*560-280;if(sx<300){sh.fillColor=new Color(255,255,255,90);sh.moveTo(sx-20,-40);sh.lineTo(sx+20,-40);sh.lineTo(sx-10,40);sh.lineTo(sx-50,40);sh.close();sh.fill();sh.fillColor=new Color(255,255,255,50);sh.moveTo(sx+30,-40);sh.lineTo(sx+42,-40);sh.lineTo(sx+12,40);sh.lineTo(sx,40);sh.close();sh.fill();}
  const hop=(t%3)<.4?Math.sin((t%3)/.4*Math.PI)*8:0;F.chat.setPosition(F.chat.position.x,hop,0);
  // until agreed, the checkbox nudges; the guest link drifts
  const ok=this.model.agreed;const cb=ok?1:1+.12*Math.max(0,Math.sin(t*5));F.box.setScale(cb,cb,1);
  F.guest.setPosition(4*Math.sin(t*3)*(1),F.guest.position.y,0);}
 private doLogin(){if(!this.model.agreed){this.say('请先勾选同意《用户协议》和《隐私政策》');const a=this.login?.getChildByName('Agree');if(a)tween(a).by(.05,{position:new Vec3(8,0,0)}).by(.1,{position:new Vec3(-16,0,0)}).by(.05,{position:new Vec3(8,0,0)}).start();return;}
  // In the WeChat mini-game runtime wx.login gives a code for the game server; the prototype has no server yet, so it simply enters.
  const wx=(globalThis as any).wx;if(wx?.login){wx.login({success:()=>this.enter(),fail:()=>this.enter()});return;}this.enter();}
 private enter(){SESSION.__petGuardiansLoggedIn=true;this.model.loggedIn=true;this.model.save();const L=this.login;if(!L)return;const op=L.addComponent(UIOpacity);tween(op).to(.3,{opacity:0}).call(()=>{L.destroy();this.login=null;if(this.model.lastReward)this.showBattleReward();else if(!this.model.signedToday())this.wf.openWelfare(0);}).start();}
}
