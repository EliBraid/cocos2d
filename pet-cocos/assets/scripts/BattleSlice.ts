// 灵爪守望 · 实时核心战. Builds the whole battle screen at runtime:
// board, cores, portals, Spine units, HUD, deck cards and result panel.
// Rules live in battle/BattleCore.ts (pure, tested); this file only presents them.
// Player input: pick a card -> tap one of the six slots; captain skill. Everything else is automatic.
import {_decorator,Component,Node,UITransform,Sprite,SpriteFrame,Label,Graphics,Color,UIOpacity,tween,Vec3,resources,sp,director,view,ResolutionPolicy,sys,EventTouch,HorizontalTextAlignment} from 'cc';
import {Battle,Pet,Monster,BattleEvent,Unit} from './battle/BattleCore';
import type {Offer,Intent,BattleResult} from './battle/BattleCore';
import {Ads} from './Ads';
import {TOWER,towerStage,BATTLE,PETS,JOBS,RARITY,SLOTS,STAGES,CAPTAINS,stageName,MONSTER_VIEW,MONSTERS,PET_LV,BATTLE_CARDS,CARD_Q,INTENTS,WAVE,SPEEDS,SEG,segName} from './battle/BattleConfig';
import type {CaptainKind,PetKind,PetMods,PetSkill} from './battle/BattleConfig';
import {Guide} from './Guide';
import {fitScreen,placeBox,dockTop,FIT} from './Screen';
import {shareNow,canShare} from './Share';
import './Platform';
import {towerRank} from './Cloud';
import {PaperUI,C} from './PaperUI';
import {PetAppearance} from './PetAppearance';
import {PET_LOOK} from './PetProfile';
import {FOX_RIG,PET_SKELETON} from './ActiveRig';
import {PlayerModel,STAMINA} from './meta/PlayerModel';
const {ccclass}=_decorator;
const MINION_SCALE=.5;
const FOX_STRIDE_PX=FOX_RIG.stride/FOX_RIG.worldUnitsPerSpineUnit*.19; // ground covered by one walk cycle at fox scale
const GOLD=new Color(255,196,64),DARK=new Color(42,26,18);
const CAPTAIN_NAME:Record<CaptainKind,string>={firerain:CAPTAINS.firerain.name,sprout:CAPTAINS.sprout.name,freeze:CAPTAINS.freeze.name};
type View={tint?:number[];node:Node;skel:sp.Skeleton;anim:string;hitT:number;dying:number;label?:Label;scale:number;top?:number};
/** painted effect sprite (tools/fx-art): 'fly' travels x,y -> x2,y2 on an arc facing its motion, 'pop' grows, settles and fades */
type SFx={n:Node;op:UIOpacity;kind:'fly'|'pop';x:number;y:number;x2:number;y2:number;t:number;life:number;arc:number;then?:()=>void;rise:number;flat:number;dir:number;spin:number;alpha:number};
const FX_ART=['arrow','star','fireball','thorn','orb','spark','slash','boom','heal','shield','ice','bolt','circle','meteor','shout','vines'];
/** stands in for a Graphics whose drawing is skipped this frame (dirty() said nothing changed) */
const NOOP:any=new Proxy({},{get:()=>()=>{},set:()=>true});
/** pulsing / blinking overlays are redrawn this many times a second instead of every frame */
const ANIM_HZ=15;
type Fx={kind:'fan'|'ring'|'flash'|'line'|'rain'|'tele'|'shard';vx?:number;vy?:number;top?:boolean;x:number;y:number;t:number;life:number;dir?:number;color:Color;r:number;x2?:number;y2?:number};
const SPEED_KEY='pet-guardians-speed';
@ccclass('BattleSlice')
export class BattleSlice extends Component {
 battle!:Battle;ui=new PaperUI();ready=false;speed=SPEEDS[0];private x5=false;private adPanel:Node|null=null;
 private art:Record<string,SpriteFrame>={};private painted:Record<string,sp.SkeletonData>={};private monRigs:Record<string,sp.SkeletonData>={};private petData!:sp.SkeletonData;private minionData!:sp.SkeletonData;
 private board!:Node;private topG!:Graphics;private topText!:Node;private root!:Node;private scenery!:Node;private aheadCrystal!:Node;private shakeT=0;private realDt=0;private enemyName!:Label;private lastTrans=false;private units!:Node;private shadows!:Graphics;private bars!:Graphics;private fxG!:Graphics;private fxLayer!:Node;private hud!:Node;
 private views=new Map<number,View>();private fx:Fx[]=[];private sfx:SFx[]=[];private sfxLayer!:Node;private guide:Guide|null=null;private fxDrawn=false;private gk=new Map<Graphics,string>();
 /** Graphics are re-tessellated and re-uploaded on every clear(); only redraw when the drawn state's key changes */
 private dirty(g:Graphics,key:string){if(this.gk.get(g)===key)return false;this.gk.set(g,key);g.clear();return true;}private towerFloor=0;private guided={captain:false,up:false};private portals:Node[]=[];private cores:{node:Node;x:number;base:number;shake:number}[]=[];
 private selected=-1;private aiming=false;private toast!:Label;private toastT=0;private clock=0;
 private goldLabel!:Label;private timeLabel!:Label;private killLabel!:Label;private enemyBar!:(v:number)=>void;private myBar!:(v:number)=>void;private enemyHp!:Label;private myHp!:Label;
 private cards:{node:Node;cost:Label;costIcon:Node;state:Label;cd:Label;shade:Graphics;avatar:Node;frame:Node;lv:Label}[]=[];
 private tray!:Node;private trayKey='';private intentUI!:{node:Node;g:Graphics;icon:Node|null;name:Label;sub:Label;head:Label;kind:string};private exposeUI!:{node:Node;label:Label};private capLock!:Node;private deployLabel!:Label;
 private levelLabel!:Label;private xpBar!:(v:number)=>void;private capShade!:Graphics;private capLabel!:Label;private capRing!:Graphics;private pauseLayer!:Node;private resultLayer:Node|null=null;
 async start(){
  try{
   fitScreen(this.node);
   const load=<T>(name:string,type:any)=>new Promise<T>((ok,fail)=>resources.load(name,type,(e,a)=>e?fail(e):ok(a as T)));
   const frames=['battle/board','battle/portal-ring','battle/crystal-red','battle/ember-avatar','art/crystal'];
   await Promise.all(FX_ART.map(async n=>{try{this.art['fx:'+n]=await load<SpriteFrame>(`battle/fx/${n}/spriteFrame`,SpriteFrame);}catch{}}));
   await Promise.all([PaperUI.loadSkin(),...frames.map(async n=>{const f=await load<SpriteFrame>(n+'/spriteFrame',SpriteFrame);f.packable=false;this.art[n]=f;})]);
   await Promise.all(Object.keys(PETS).map(async k=>{try{this.art['pet:'+k]=await load<SpriteFrame>(`pets/portrait/${PETS[k].id}/spriteFrame`,SpriteFrame);}catch{this.art['pet:'+k]=this.art['battle/ember-avatar'];}}));
   // painted layered rigs (tools/layered-rig) for every pet, fox included; pets without one fall back to a tinted base rig
   await Promise.all(Object.keys(PETS).map(async k=>{try{this.painted[k]=await load<sp.SkeletonData>(`pets/rig/${k}/${k}`,sp.SkeletonData);}catch{}}));
   // painted monster rigs (tools/monster-rig); monsters without one use the tinted minion skin
   await Promise.all(Object.keys(MONSTERS).map(async k=>{try{this.monRigs[k]=await load<sp.SkeletonData>(`battle/mon-rig/${k}/${k}`,sp.SkeletonData);}catch{}}));
   [this.petData,this.minionData]=await Promise.all([load<sp.SkeletonData>(PET_SKELETON,sp.SkeletonData),load<sp.SkeletonData>('battle/minion/minion',sp.SkeletonData)]);
   const player=new PlayerModel(sys.localStorage),bonus:Record<string,number>={},mods:Record<string,PetMods>={},skills:Record<string,PetSkill>={};for(const k of player.deck){bonus[k]=player.petBonus(k);mods[k]=player.petMods(k);skills[k]=player.petSkill(k);}
   // 试炼之塔: HomeSlice / the result screen put the floor in a session flag before loading this scene
   const tf=(globalThis as any).__towerFloor;this.towerFloor=typeof tf==='number'&&tf>0?tf:0;
   this.battle=new Battle(Date.now()%100000,{deck:player.deck as PetKind[],bonus,mods,skills,startGold:player.startGold,stage:player.stage,captain:player.captain,...(this.towerFloor?{stageDef:towerStage(this.towerFloor),segs:TOWER.segs}:{})});
   this.build();this.ready=true;(globalThis as any).__battle=this;
   // the very first battle (1-1, guide not done yet) is guided step by step
   if(!this.towerFloor&&!player.guide.includes('battle')&&player.stage===0)this.guide=new Guide(this.hud,this.ui);
  }catch(e){console.error(e);this.ui.label(this.node,'战斗加载失败',270,450,480,60,26,true);this.ui.label(this.node,String(e),270,510,500,80,14);}
 }
 // ================================================================== layout
 private sprite(parent:Node,key:string,x:number,y:number,w:number,h:number){const n=this.ui.node(parent,key,x,y,w,h),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.art[key];n.getComponent(UITransform)!.setContentSize(w,h);return n;}
 private build(){
  const root=this.ui.node(this.node,'Battle',270,480,540,960);this.root=root;placeBox(root);this.ui.rect(root,'Backdrop',270,480,540,960,new Color(240,231,208),false);
  // scenery scrolls during the leg-change cutscene; "Ahead" is the stretch of ground just above the screen
  const sc=this.ui.node(root,'Scenery',270,480,540,960);this.scenery=sc;
  this.board=this.sprite(sc,'battle/board',270,480,540,960);const ahead=this.ui.node(sc,'Ahead',270,-480,540,960);this.sprite(ahead,'battle/board',270,480,540,960);
  this.board.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{const loc=e.getUILocation(),p=this.board.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(loc.x,loc.y,0));this.tap(p.x+270,480-p.y);});
  const shadowNode=this.ui.node(root,'Shadows',270,480,540,960);this.shadows=shadowNode.addComponent(Graphics);
  for(const layer of [sc,ahead])for(const p of BATTLE.portals){const n=this.sprite(layer,'battle/portal-ring',p.x,p.y+4,140,88);n.getComponent(Sprite)!.trim=false;this.portals.push(n);}
  const ec=BATTLE.enemyCore,mc=BATTLE.myCore;
  this.cores.push({node:this.sprite(sc,'battle/crystal-red',ec.x,ec.y-30,118,116),x:ec.x,base:ec.y-30,shake:0});this.aheadCrystal=this.sprite(ahead,'battle/crystal-red',ec.x,ec.y-30,118,116);
  this.cores.push({node:this.sprite(root,'art/crystal',mc.x,mc.y-30,118,116),x:mc.x,base:mc.y-30,shake:0});
  this.units=this.ui.node(root,'Units',270,480,540,960);
  const barNode=this.ui.node(root,'Bars',270,480,540,960);this.bars=barNode.addComponent(Graphics);
  const fxNode=this.ui.node(root,'Fx',270,480,540,960);this.fxG=fxNode.addComponent(Graphics);this.sfxLayer=this.ui.node(root,'FxSprites',270,480,540,960);this.fxLayer=this.ui.node(root,'FxText',270,480,540,960);
  this.hud=this.ui.node(root,'HUD',270,480,540,960);this.buildHud();dockTop(this.hud,120);this.buildDeck();
  const tf=this.ui.node(this.hud,'TopFx',270,480,540,960);this.topG=tf.addComponent(Graphics);this.topText=tf;
  this.toast=this.ui.label(this.hud,'',270,430,460,36,20,true);this.toast.node.addComponent(UIOpacity).opacity=0;
  this.say('点下方的宠物卡，再点一个站位把它派上场',4);
 }
 private buildHud(){const h=this.hud,ui=this.ui;
  ui.frame(h,'Top',270,36,532,62,'panel');ui.icon(h,'paw',38,36,30);ui.label(h,'灵爪守望',122,36,130,40,24,true,C.ink,HorizontalTextAlignment.LEFT);
  ui.frame(h,'GoldBox',334,36,112,38,'pill');ui.icon(h,'coin',292,36,24);this.goldLabel=ui.label(h,'0',345,36,80,32,22,true);
  try{const v=Number(sys.localStorage.getItem(SPEED_KEY));if(v===2||v===3)this.speed=v;}catch{}
  ui.button(h,'speed','x'+this.speed,426,36,52,40,()=>this.speedTap(),C.white,18);
  ui.button(h,'pause','II',490,36,52,40,()=>this.pause(true),C.white,20);
  ui.frame(h,'Stage',100,90,180,36,'card');ui.label(h,this.towerFloor?`试炼之塔 ${this.towerFloor}层`:stageName(this.battle.stage.index),100,88,170,30,17,true);
  ui.frame(h,'Timer',284,90,170,36,'card');this.timeLabel=ui.label(h,'准备 04:00',284,88,160,30,17,true);
  ui.frame(h,'Kills',445,90,150,36,'card');this.killLabel=ui.label(h,'击败 0',445,88,140,30,17,true,C.red);
  const ec=BATTLE.enemyCore,mc=BATTLE.myCore;
  this.enemyName=ui.label(h,'敌方核心',ec.x,128,230,22,15,true);this.enemyBar=ui.bar(h,ec.x,146,190,16,1,C.red);this.enemyHp=ui.label(h,'',ec.x,146,190,16,11,true,C.white);
  ui.label(h,'我方核心',mc.x,mc.y+34,120,22,15,true);this.myBar=ui.bar(h,mc.x,mc.y+52,190,16,1,C.cyan);this.myHp=ui.label(h,'',mc.x,mc.y+52,190,16,11,true,C.white);
  // team level (all pets share it) bottom-left of the board, captain skill bottom-right
  ui.frame(h,'Team',104,748,170,50,'card');this.levelLabel=ui.label(h,'队伍 Lv.1',104,737,150,22,16,true);this.xpBar=ui.bar(h,104,760,142,10,0,GOLD);
  this.tray=ui.node(h,'Tray',270,480,540,960);this.buildIntent();
  const cap=ui.roundBtn(h,'captain',470,742,66,()=>this.captainTap(),'round',CAPTAINS[this.battle.captain].icon);
  const sh=ui.node(cap,'Shade',33,33,66,66);this.capShade=sh.addComponent(Graphics);this.capRing=ui.node(cap,'Ring',33,33,66,66).addComponent(Graphics);
  this.capLock=ui.icon(cap,'lock',33,33,34);this.capLock.active=false;
  this.capLabel=ui.label(h,CAPTAIN_NAME[this.battle.captain],470,785,100,20,13,true);this.capLabel.enableOutline=true;this.capLabel.outlineColor=C.white;this.capLabel.outlineWidth=3;
  this.pauseLayer=ui.node(h,'Pause',270,480,540,960);ui.rect(this.pauseLayer,'Dim',270,480,540,960,new Color(31,32,27,150),false);ui.frame(this.pauseLayer,'Box',270,450,300,250,'panel');ui.label(this.pauseLayer,'暂停',270,360,200,40,28,true);
  ui.button(this.pauseLayer,'resume','继续战斗',270,420,200,48,()=>this.pause(false),C.red,21);ui.button(this.pauseLayer,'restart','重新开始',270,478,200,44,()=>director.loadScene('Battle'),C.paper,19);ui.button(this.pauseLayer,'home','放弃并返回主城',270,530,200,44,()=>{this.recordMet();director.loadScene('Home');},C.paper,19);this.pauseLayer.active=false;}
 private buildDeck(){const h=this.hud,ui=this.ui,b=this.battle;ui.frame(h,'Deck',270,884,536,152,'panel');
  ui.icon(h,'paw',30,822,20);ui.label(h,'出战阵容',84,822,90,24,17,true,C.ink,HorizontalTextAlignment.LEFT);ui.label(h,'逐只上阵，上阵后自动战斗',230,823,200,20,12,false,C.muted,HorizontalTextAlignment.LEFT);this.deployLabel=ui.label(h,'场上 0/6',476,822,90,24,16,true);
  b.cards.forEach((c,i)=>{const d=PETS[c.kind],n=b.cards.length,step=n>5?90:106,x=270-(n-1)*step/2+i*step,card=ui.node(h,'Card'+i,x,892,96,112),look=PET_LOOK[c.kind];
   if(n>5)card.setScale(.9,.9,1);
   const frame=ui.img(card,'slot-'+d.rarity,48,56,96,112);
   const real=this.art['pet:'+c.kind]!==this.art['battle/ember-avatar'],av=this.sprite(card,'pet:'+c.kind,48,48,real?62:66,real?62:58);if(!real)av.getComponent(Sprite)!.color=new Color(look.tint[0],look.tint[1],look.tint[2],255);
   ui.icon(card,JOBS[d.job].icon,17,17,18);const lvb=ui.rect(card,'lvb',76,15,36,18,new Color(42,26,18,210),false),lv=ui.label(lvb,'Lv1',18,9,34,16,11,true,C.white);const nm=ui.label(card,d.name,48,72,92,18,12,true);nm.enableOutline=true;nm.outlineColor=C.white;nm.outlineWidth=2;
   const costIcon=ui.icon(card,'coin',32,96,16);const cost=ui.label(card,String(RARITY[d.rarity].cost),56,96,50,20,15,true);
   const shade=ui.node(card,'Shade',48,56,96,112).addComponent(Graphics);const state=ui.label(card,'',48,96,88,20,13,true,C.muted);
   const cd=ui.label(card,'',48,50,80,34,26,true,C.white);cd.enableOutline=true;cd.outlineColor=DARK;cd.outlineWidth=3;
   card.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;this.cardTap(i);});this.cards.push({node:card,cost,costIcon,state,cd,shade,avatar:av,frame,lv});});}
 private labelOf(id:string){return this.ui.buttons.get(id)!.getComponentInChildren(Label)!;}
 private setText(id:string,s:string){this.labelOf(id).string=s;}
 // =================================================================== input
 private reason(r:string){return ({state:'',card:'',cooldown:'还在冷却中',onfield:'这只宠物已经在场上了',slot:'这个站位有宠物了',gold:'金币不足'} as Record<string,string>)[r]||'';}
 private cardTap(i:number){const b=this.battle;if(b.state!=='running')return;this.aiming=false;
  if(b.cards[i].petId){this.selected=-1;this.tryUpgrade(i);return;}
  const why=b.blocked(i);if(why){this.selected=-1;this.say(why==='gold'?`金币不足，需要 ${b.cardCost(i)}`:this.reason(why),1.5);return;}
  this.selected=this.selected===i?-1:i;if(this.selected>=0)this.say('点一个发光的站位派它上场（前排挡刀，后排输出）',2.2);}
 private slotAt(x:number,y:number){let best=-1,bd=44;SLOTS.forEach((s,i)=>{const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=i;}});return best;}
 private tap(x:number,y:number){const b=this.battle;if(b.state!=='running')return;
  if(this.aiming){if(b.castCaptain({x,y}))this.aiming=false;return;}
  if(this.selected<0){let best:Pet|null=null,bd=46;for(const p of b.pets){if(p.state==='dead'||p.summon)continue;const d=Math.hypot(p.x-x,p.y-30-y);if(d<bd&&b.upgradeReady(p.card)){bd=d;best=p;}}if(best){this.tryUpgrade(best.card);return;}}
  if(this.selected>=0){const s=this.slotAt(x,y);if(s>=0){const why=b.blocked(this.selected,s);if(why){this.say(why==='gold'?`金币不足，需要 ${b.cardCost(this.selected)}`:this.reason(why),1.4);return;}b.deploy(this.selected,s);this.selected=-1;return;}
   this.selected=-1;}}
 private captainTap(){const b=this.battle;if(b.state!=='running')return;this.selected=-1;
  if(b.sealT>0){this.say(`队长技能被封印，还有 ${Math.ceil(b.sealT)} 秒`,1.4);return;}
  if(!b.captainReady()){this.say(`${CAPTAIN_NAME[b.captain]}冷却中`,1.2);return;}
  if(!b.captainNeedsTarget()){b.castCaptain();return;}
  this.aiming=!this.aiming;if(this.aiming)this.say('点战场上的位置释放'+CAPTAIN_NAME[b.captain],2.5);}
 private pause(on:boolean){this.battle.paused=on;this.pauseLayer.active=on;}
 private tryUpgrade(i:number){const b=this.battle,c=b.cards[i];if(c.lv>=PET_LV.max){this.say(`${PETS[c.kind].name}已满级`,1.2);return;}
  if(!b.upgradeReady(i)){this.say(`${PETS[c.kind].name}经验 ${c.xp}/${b.petXpNeed(i)}，击败怪物积累经验`,1.4);return;}
  if(!b.upgrade(i))this.say(`金币不足，升级需要 ${b.upgradeCost(i)}`,1.4);else this.guided.up=true;}
 // ------------------------------------------------------------- speed / ads
 private speedTap(){const order=this.x5||Ads.available('x5')?[2,3,5]:[2,3],next=order[(order.indexOf(this.speed)+1)%order.length];
  if(next===5&&!this.x5){this.openAdPanel();return;}this.setSpeed(next);}
 private setSpeed(v:number){this.speed=v;this.setText('speed','x'+v);if(v!==5)try{sys.localStorage.setItem(SPEED_KEY,String(v));}catch{}}
 private openAdPanel(){if(this.adPanel)return;const ui=this.ui,P=ui.node(this.hud,'AdPanel',270,480,540,960);this.adPanel=P;this.battle.paused=true;
  ui.rect(P,'Dim',270,480,540,960,new Color(31,32,27,110),false);ui.frame(P,'Box',380,170,300,168,'panel');
  ui.label(P,'x5 极速',380,112,240,30,22,true,C.red);ui.label(P,'看一段广告，本局解锁 x5 速度',380,146,270,22,14,true);
  const close=()=>{P.destroy();this.adPanel=null;this.battle.paused=this.pauseLayer.active;};
  ui.button(P,'ad-no','不用了',304,206,110,44,()=>{this.setSpeed(2);close();},C.paper,16);
  ui.button(P,'ad-yes','看广告',446,206,130,44,()=>{this.setText('ad-yes','播放中…');Ads.rewarded('x5').then(ok=>{close();if(ok){this.x5=true;this.setSpeed(5);this.say('本局已解锁 x5 速度',1.4);}else{this.setSpeed(2);this.say('广告没看完，没有解锁',1.4);}});},C.red,17);}
 private say(s:string,t=1.5){this.toast.string=s;this.toastT=t;}
 // ================================================================== frame
 update(dt:number){if(!this.ready)return;this.realDt=dt;const b=this.battle;b.step(dt*this.speed);for(const e of b.drain())this.onEvent(e);this.render(dt*(b.paused?0:this.speed));}
 private onEvent(e:BattleEvent){
  if(e.type==='deploy'){const v=this.viewOf(e.pet);v.dying=0;v.anim='';v.skel.color=new Color(255,255,255,255);v.skel.setAnimation(1,this.faceOf(e.pet),true);this.fx.push({kind:'ring',x:e.pet.x,y:e.pet.y,t:0,life:.5,color:GOLD,r:30});}
  else if(e.type==='spawn'){this.viewOf(e.monster);this.met.add(e.monster.kind);}
  else if(e.type==='attack'){const v=this.views.get(e.unit.id);if(v){v.anim='';this.play(v,'attack',false);}}
  else if(e.type==='skill'){if(e.pet.job==='guard')this.floatText('嘲讽！',e.pet.x,e.pet.y-112,new Color(255,110,60),20);const v=this.views.get(e.pet.id);if(v){v.anim='';this.play(v,'attack',false);v.skel.setAnimation(1,this.faceOf(e.pet),true);}this.floatText(e.name,e.pet.x,e.pet.y-90,GOLD,15);}
  else if(e.type==='fx'){const col=({flame:new Color(255,122,28),shield:new Color(90,170,255),arrow:new Color(120,90,50),shot:new Color(120,90,50),fireball:new Color(255,110,30),heal:new Color(110,220,120),tele:new Color(255,60,50),taunt:new Color(255,170,60),zap:new Color(255,225,70),summon:new Color(190,130,255),blast:new Color(255,90,60),rain:new Color(255,100,40),freeze:new Color(130,220,255),sprout:new Color(110,220,120)} as Record<string,Color>)[e.name];
   const R=e.r||0,has=(k:string)=>!!this.art['fx:'+k];
   if(e.name==='flame'&&has('slash'))this.pop('slash',e.x,e.y-30,(R||90)*1.7,.32,{dir:e.dir||1});
   else if((e.name==='arrow'||e.name==='shot'||e.name==='fireball')&&has('arrow')){const enemy=e.dir===-1,fire=e.name==='fireball';
    const key=enemy?(fire?'orb':'thorn'):(fire?'fireball':e.name==='arrow'?'arrow':'star'),d=Math.hypot(e.x2!-e.x,e.y2!-e.y);
    this.fly(key,e.x,e.y,e.x2!,e.y2!,(fire?.3:.2)+d/2600,fire?46:key==='arrow'?46:34,key==='arrow'||key==='thorn'?Math.min(40,d*.12):d*.04,()=>{
     if(fire)this.pop('boom',e.x2!,e.y2!,(R||60)*1.5,.4,{tint:enemy?new Color(200,150,255):undefined});else this.pop('spark',e.x2!,e.y2!,30,.22,{spin:90});});}
   else if(e.name==='tele')this.fx.push({kind:'tele',x:e.x,y:e.y,t:0,life:e.x2||1,color:col,r:e.r||80});
   else if(e.name==='zap'&&has('bolt')){const tx=e.x2??e.x,ty=e.y2??e.y;this.pop('bolt',tx,ty-50,100,.32,{});this.pop('spark',tx,ty,46,.3,{spin:120});}
   else if(e.name==='blast'&&has('boom'))this.pop('boom',e.x,e.y-10,(R||70)*1.7,.45,{});
   else if(e.name==='rain'&&has('meteor')){const r=R||90;for(let i=0;i<6;i++){const ang=i*2.4,rr=r*.75*((i*37%10)/10+.15),tx=e.x+Math.cos(ang)*rr,ty=e.y+Math.sin(ang)*rr*.6;
    this.fly('meteor',tx+110,ty-230,tx,ty,.42,44,0,()=>this.pop('boom',tx,ty,56,.32,{}),-i*.09);}}
   else{const pk=({heal:'heal',shield:'shield',freeze:'ice',summon:'circle',taunt:'shout',sprout:'vines'} as Record<string,string>)[e.name];
    if(pk&&has(pk)){const sz=(R||40)*({circle:2,shield:1.6,shout:1.8,heal:1.6,vines:1.8,ice:1.7} as Record<string,number>)[pk];
     this.pop(pk,e.x,e.y-(pk==='circle'?0:pk==='shield'?34:24),Math.max(56,sz),pk==='circle'?.7:pk==='shield'?.6:.5,{flat:pk==='circle'?.55:1,rise:pk==='heal'?28:0,alpha:pk==='shield'?190:255});}
    else this.fx.push({kind:'ring',x:e.x,y:e.y,t:0,life:.5,color:col,r:e.r||30});}}
  else if(e.type==='hit'){const onPet=this.battle.pets.some(p=>p.id===e.targetId);this.floatText(e.crit?`${e.amount}!`:`${e.amount}`,e.x,e.y,onPet?new Color(255,107,91):e.burn?new Color(255,140,40):e.crit?new Color(255,214,64):C.white,e.crit?21:15);const v=this.views.get(e.targetId);if(v&&this.battle.monsters.some(m=>m.id===e.targetId)){v.skel.setAnimation(1,'hit',false);v.hitT=.25;}}
  else if(e.type==='proc')this.floatText(e.text,e.x,e.y,e.good?new Color(255,214,90):C.red,e.text.length>2?22:17);
  else if(e.type==='heal')this.floatText('+'+e.amount,e.x,e.y,new Color(110,220,120),e.targetId===-1?20:15);
  else if(e.type==='death'){const v=this.views.get(e.unit.id);if(!v)return;if(e.unit.side==='enemy'){v.anim='';this.play(v,'die',false);v.dying=.6;}else{v.skel.setAnimation(1,'face-alert',true);this.play(v,'hit',false);v.dying=.8;if(!(e.unit as Pet).summon)this.say(`${PETS[(e.unit as Pet).kind].name}倒下了，冷却后可再次上阵`,1.8);}}
  else if(e.type==='gold'){if(e.income)this.floatText('+'+e.amount,e.x,e.y,GOLD,18);else this.coin(e.x,e.y,e.amount);}
  else if(e.type==='levelup'){this.floatText(`队伍 Lv.${e.level}　新卡牌！`,120,700,GOLD,17);}
  else if(e.type==='petlevel'){if(e.pet){this.fx.push({kind:'ring',x:e.pet.x,y:e.pet.y,t:0,life:.6,color:new Color(90,220,110),r:40});this.floatText(`升级！Lv.${e.level}`,e.pet.x,e.pet.y-100,new Color(110,230,120),19);}this.cardBurst(e.card,e.level);}
  else if(e.type==='card'){this.floatText(e.text,270,450,GOLD,19);}
  else if(e.type==='intent'){if(e.what==='broken')this.floatText('打断！',BATTLE.enemyCore.x,BATTLE.enemyCore.y-80,new Color(110,230,120),24);else if(e.what==='start')this.floatText(INTENTS[e.intent.kind].name+'！',BATTLE.enemyCore.x,BATTLE.enemyCore.y-84,C.red,22);}
  else if(e.type==='expose')this.floatText('破绽！核心受伤 +40%',BATTLE.enemyCore.x,BATTLE.enemyCore.y-84,new Color(255,170,50),18);
  else if(e.type==='segment'){const x=BATTLE.enemyCore.x,y=BATTLE.enemyCore.y-34;this.shakeT=.5;
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2+Math.random()*.3,v=180+Math.random()*200;this.fx.push({kind:'shard',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-160,t:0,life:1.1+Math.random()*.3,color:new Color(200,130,255),r:6+Math.random()*7});}
   this.fx.push({kind:'flash',x,y,t:0,life:.45,color:C.white,r:220});this.fx.push({kind:'ring',x,y:y+30,t:0,life:.7,color:new Color(200,130,255),r:150});
   this.floatText(`击碎水晶！+${e.reward} 金币`,270,330,GOLD,22);}
  else if(e.type==='segment-start'){const b=this.battle,last=e.seg>=b.segs-1,t=last?(b.stage.boss?'首领来袭':'最终水晶'):`第 ${e.seg+1} 段`;
   const n=this.ui.label(this.fxLayer,t,270,300,320,48,34,true,last?new Color(255,120,90):C.white);n.enableOutline=true;n.outlineColor=DARK;n.outlineWidth=5;const sub=this.ui.label(this.fxLayer,`推进 ${e.seg+1}/${b.segs}　金币、等级、卡牌都保留`,270,342,360,24,15,true,C.white);sub.enableOutline=true;sub.outlineColor=DARK;sub.outlineWidth=3;
   for(const l of [n,sub]){const op=l.node.addComponent(UIOpacity);l.node.setScale(.6,.6,1);tween(l.node).to(.2,{scale:new Vec3(1,1,1)}).start();tween(op).delay(1.3).to(.5,{opacity:0}).call(()=>l.node.destroy()).start();}}
  else if(e.type==='wave'){const n=this.ui.label(this.fxLayer,`第 ${e.wave} 波`,270,300,200,40,30,true,C.white);n.enableOutline=true;n.outlineColor=DARK;n.outlineWidth=4;const op=n.node.addComponent(UIOpacity);tween(op).delay(.6).to(.5,{opacity:0}).call(()=>n.node.destroy()).start();}
  else if(e.type==='boss')this.say(e.msg,2.6);
  else if(e.type==='tip')this.say(e.msg,2.4);
  else if(e.type==='captain'){this.say(CAPTAIN_NAME[e.kind]+'！',1.2);this.guided.captain=true;}
  else if(e.type==='core-hit'){const c=this.cores[e.side==='enemy'?0:1];c.shake=.18;this.fx.push({kind:'flash',x:e.side==='enemy'?BATTLE.enemyCore.x:BATTLE.myCore.x,y:(e.side==='enemy'?BATTLE.enemyCore.y:BATTLE.myCore.y)-30,t:0,life:.18,color:e.side==='enemy'?C.red:C.cyan,r:50});}
  else if(e.type==='end')this.scheduleOnce(()=>this.showResult(),1.2);}
 /** first-battle guide: deploy, deploy more, captain skill, level a card; each step ends when it has been done */
 private guideStep(dt:number){const g=this.guide!,b=this.battle,deployed=b.pets.filter(p=>!p.summon).length,cx=(i:number)=>this.cards[i].node.position.x+270;
  if(b.state!=='running'||b.transT>0){g.hide();return;}
  const free=b.cards.findIndex((c,i)=>!c.petId&&!b.blocked(i));
  if(this.selected>=0){const s=SLOTS.findIndex((sl,j)=>!b.slotPet[j]&&sl.row===(['guard','warrior'].includes(PETS[b.cards[this.selected].kind].job)?'front':'back'));const t=SLOTS[s>=0?s:b.slotPet.findIndex(x=>!x)];
   if(t)g.show('slot',t.x,t.y,'点这个格子，让它上场\n前排挡刀，后排输出');}
  else if(deployed===0&&free>=0)g.show('card',cx(free),868,'点一张卡牌，选择要上场的宠物');
  else if(b.captainReady()&&!this.guided.captain&&deployed>=2)g.show('captain',470,712,b.captain==='firerain'||b.captain==='freeze'?'队长技能好了！点它，再点怪物最多的地方':'队长技能好了！点它为全队回血');
  else if(deployed<3&&free>=0)g.show('more',cx(free),868,'金币会自动增长，继续派宠物上场');
  else if(!this.guided.up){const up=b.cards.findIndex((c,i)=>c.petId&&b.gold>=b.upgradeCost(i));if(up>=0)g.show('up',cx(up),868,'点已上场的卡牌给它升级，越打越强');else g.hide();}
  else g.hide();
  g.update(dt);}
 private fxNode(key:string,size:number,alpha=255){const f=this.art['fx:'+key],n=new Node(key);n.layer=this.sfxLayer.layer;this.sfxLayer.addChild(n);
  const o=f?.originalSize,m=o?Math.max(o.width,o.height):1;n.addComponent(UITransform).setContentSize(o?size*o.width/m:size,o?size*o.height/m:size);
  const sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.trim=false;sp.spriteFrame=f;n.active=false;const op=n.addComponent(UIOpacity);op.opacity=alpha;return {n,op};}
 private fly(key:string,x:number,y:number,x2:number,y2:number,life:number,size:number,arc:number,then?:()=>void,delay=0){const {n,op}=this.fxNode(key,size);
  this.sfx.push({n,op,kind:'fly',x,y,x2,y2,t:delay,life,arc,then,rise:0,flat:1,dir:1,spin:0,alpha:255});}
 private pop(key:string,x:number,y:number,size:number,life:number,o:{dir?:number;flat?:number;rise?:number;spin?:number;alpha?:number;tint?:Color}){const {n,op}=this.fxNode(key,size,o.alpha??255);if(o.tint)n.getComponent(Sprite)!.color=o.tint;
  this.sfx.push({n,op,kind:'pop',x,y,x2:x,y2:y,t:0,life,arc:0,rise:o.rise||0,flat:o.flat||1,dir:o.dir||1,spin:o.spin||0,alpha:o.alpha??255});}
 private renderSfx(dt:number){const done:SFx[]=[];
  for(const s of this.sfx){s.t+=dt;if(s.t<0)continue;const k=Math.min(1,s.t/s.life);s.n.active=true;
   if(s.kind==='fly'){const px=s.x+(s.x2-s.x)*k,py=s.y+(s.y2-s.y)*k-s.arc*4*k*(1-k),vx=s.x2-s.x,vy=(s.y2-s.y)-s.arc*4*(1-2*k);
    s.n.setPosition(px-270,480-py,0);if(s.n.name!=='meteor')s.n.angle=Math.atan2(-vy,vx)*180/Math.PI;} // projectiles are painted pointing right; the meteor is painted already falling
   else{const sc=(k<.22?.45+.7*k/.22:1.15-.15*Math.min(1,(k-.22)/.2));s.n.setPosition(s.x-270,480-(s.y-s.rise*k),0);s.n.setScale(sc*s.dir,sc*s.flat,1);s.n.angle=s.spin*k;
    s.op.opacity=Math.round(s.alpha*(k>.55?1-(k-.55)/.45:1));}
   if(s.t>=s.life)done.push(s);}
  for(const s of done){this.sfx.splice(this.sfx.indexOf(s),1);s.n.destroy();s.then?.();}}
 private viewOf(u:Pet|Monster):View{let v=this.views.get(u.id);if(v)return v;const node=new Node((u.side==='pet'?'Pet':'Monster')+u.id);node.layer=this.units.layer;this.units.addChild(node);node.addComponent(UITransform).setContentSize(200,200);
  const skel=node.addComponent(sp.Skeleton);skel.premultipliedAlpha=false;
  if(u.side==='pet'){const look=PET_LOOK[(u as Pet).kind],rk=look.base||(u as Pet).kind,mine=this.painted[(u as Pet).kind];const own=mine||(rk==='fox'?null:this.painted[rk]);skel.skeletonData=own||this.petData;if(look.base&&!mine)skel.color=new Color(look.tint[0],look.tint[1],look.tint[2],255);new PetAppearance(skel,{scarf:look.scarf,weapon:'sword'}).apply(false);if(own)for(const n of ['scarf','scarf-tail']){const sl=skel.findSlot(n) as any;if(sl){sl.color.r=1;sl.color.g=1;sl.color.b=1;}}skel.setAnimation(1,this.faceOf(u as Pet),true);skel.setAnimation(2,'look-center',true);
   const label=(u as Pet).summon?undefined:this.ui.label(this.fxLayer,'',0,0,90,20,13,true,DARK);v={node,skel,anim:'',hitT:0,dying:0,label,scale:look.scale*((u as Pet).summon?.6:1)};}
  else{const kind=(u as Monster).kind,mv=MONSTER_VIEW(kind),own=this.monRigs[kind];skel.skeletonData=own||this.minionData;skel.setSkin(own?'main':mv.skin);skel.setSlotsToSetupPose();
   const tag=mv.tag?this.ui.label(this.fxLayer,mv.tag,0,0,26,24,15,true,C.white):undefined;if(tag){tag.enableOutline=true;tag.outlineColor=DARK;tag.outlineWidth=3;}
   v={node,skel,anim:'',hitT:0,dying:0,label:tag,tint:own?[255,255,255]:mv.tint,scale:MINION_SCALE*(kind==='elite'?1.4:mv.scale)};this.play(v,'spawn',false);
   if(mv.tag&&!this.seenKinds.has(kind)){this.seenKinds.add(kind);this.say(`${(MONSTERS as any)[kind].name}：${(MONSTERS as any)[kind].desc}`,2.6);}}
  for(const a of ['idle','walk','attack'])for(const b of ['idle','walk','attack'])if(a!==b)skel.setMix(a,b,.08);
  this.views.set(u.id,v);return v;}
 private seenKinds=new Set<string>();private met=new Set<string>();
 /** remember the monsters met in this battle for the 图鉴 */
 private recordMet(){try{const p=new PlayerModel(sys.localStorage);p.markSeen(Array.from(this.met));p.save();}catch{}}
 private faceOf(p:Pet){return p.job==='warrior'||p.job==='guard'?'face-focus':'face-calm';}
 private play(v:View,anim:string,loop=true,timeScale=1){if(v.anim===anim){const e=v.skel.getCurrent(0);if(e)e.timeScale=timeScale;return;}v.anim=anim;const e=v.skel.setAnimation(0,anim,loop);if(e)e.timeScale=timeScale;}
 private render(dt:number){const b=this.battle;this.clock+=dt;
  this.goldLabel.string=String(b.gold);this.killLabel.string='击败 '+b.kills;this.timeLabel.string=b.transT>0?'推进中…':`${b.seg+1}/${b.segs}段 · ${b.segWave?`第${b.segWave}波`:'准备'}${b.overtime?' 总攻':''}`;this.timeLabel.color=b.overtime?C.red:C.ink;this.renderLeg(dt);
  {const boss=b.mode==='defend'?b.monsters.find(m=>m.state!=='dead'&&(MONSTERS[m.kind] as any).boss):null;this.enemyName.string=segName(b.seg,b.segs,b.stage.boss)+(b.warded&&b.mode==='siege'?' · 护核 -50%':'');this.enemyName.color=b.warded&&b.mode==='siege'?new Color(60,110,200):C.ink;
   if(b.mode==='defend'){this.enemyBar(boss?boss.hp/boss.maxHp:1);this.enemyHp.string=boss?`${Math.ceil(boss.hp)} / ${boss.maxHp}`:'即将登场';}else{this.enemyBar(b.transT>0?0:b.enemyCore.hp/b.enemyCore.maxHp);}}this.myBar(b.myCore.hp/b.myCore.maxHp);if(b.mode!=='defend')this.enemyHp.string=`${Math.ceil(b.enemyCore.hp)} / ${b.enemyCore.maxHp}`;this.myHp.string=`${Math.ceil(b.myCore.hp)} / ${b.myCore.maxHp}`;
  this.levelLabel.string=`队伍 Lv.${b.level}${b.level>=BATTLE.maxLevel?' 满级':' · 升级得卡'}`;this.xpBar(b.level>=BATTLE.maxLevel?1:b.xp/b.xpNeed);
  {const k=1+.035*Math.sin(this.clock*3);for(const p of this.portals)p.setScale(k,k,1);}
  for(const c of this.cores){c.shake=Math.max(0,c.shake-dt);const k=c.shake>0?Math.sin(c.shake*90)*3:0;c.node.setPosition(c.x-270+k,480-c.base,0);}this.crystalLook();
  // units
  const alive:{u:Unit;v:View}[]=[];
  for(const p of b.pets){const v=this.views.get(p.id);if(!v)continue;
   if(p.state==='dead'){if(v.dying>0){v.dying-=dt;v.skel.color=new Color(255,255,255,Math.max(0,Math.round(255*v.dying/.8)));}v.node.active=v.dying>0;if(v.label)v.label.node.active=false;continue;}
   v.node.active=true;if(v.label)v.label.node.active=true;{const tt=PET_LOOK[p.kind]?.base&&!this.painted[p.kind]?PET_LOOK[p.kind].tint:[255,255,255];v.skel.color=p.stunT>0?new Color(255,240,130,255):new Color(tt[0],tt[1],tt[2],p.summon?215:255);}
   if(p.state==='move')this.play(v,'walk',true,p.speed/(FOX_STRIDE_PX/FOX_RIG.walkDuration)*.19/v.scale);else if(p.state==='idle'&&(v.anim!=='attack'||!v.skel.getCurrent(0)||v.skel.getCurrent(0)!.isComplete()))this.play(v,'idle');
   alive.push({u:p,v});}
  for(const m of b.monsters){const v=this.views.get(m.id);if(!v)continue;if(v.hitT>0){v.hitT-=dt;if(v.hitT<=0)v.skel.clearTrack(1);}
   if(m.state==='dead'){if(v.label)v.label.node.active=false;v.dying-=dt;if(v.dying<=0){v.node.active=false;}continue;}
   {const t=v.tint||[255,255,255];v.skel.color=m.freezeT>0?new Color(150,210,255,255):new Color(t[0],t[1],t[2],255);}
   if(m.state==='move')this.play(v,'walk',true,m.speed/34);else if(m.state==='idle'&&(v.anim==='spawn'||v.anim==='walk'||(v.skel.getCurrent(0)?.isComplete()??true)))this.play(v,'idle');alive.push({u:m,v});}
  for(const [id,v] of this.views)if(!b.monsters.some(m=>m.id===id)&&!b.pets.some(p=>p.id===id)){v.node.destroy();v.label?.node.destroy();this.views.delete(id);}
  alive.sort((a,c)=>a.u.y-c.u.y);alive.forEach(({u,v},i)=>{const s=v.scale;v.node.setScale(u.facing*s,s,1);v.node.setPosition(u.x-270,480-u.y,0);v.node.setSiblingIndex(i);});
  // ground layer: slot markers, shadows, shields
  const g=this.shadows;g.clear();
  SLOTS.forEach((s,i)=>{const free=!b.slotPet[i],pick=this.selected>=0&&free,pulse=pick?.6+.4*Math.sin(this.clock*6):0;
   if(pick){g.fillColor=new Color(76,213,220,Math.round(40+60*pulse));g.ellipse(s.x-270,480-s.y,38,15);g.fill();}
   g.strokeColor=pick?new Color(40,150,160,230):new Color(64,120,110,free?90:30);g.lineWidth=pick?3:2;g.ellipse(s.x-270,480-s.y,pick?36+3*pulse:32,pick?14:12);g.stroke();});
  for(const {u} of alive){g.fillColor=new Color(42,26,18,48);g.ellipse(u.x-270,480-u.y,u.radius*1.25,u.radius*.45);g.fill();
   if(u.side==='pet'&&(u as Pet).shieldT>0){g.strokeColor=new Color(90,170,255,200);g.lineWidth=3;g.ellipse(u.x-270,480-u.y,u.radius*1.6,u.radius*.62);g.stroke();}}
  if(this.aiming){g.strokeColor=new Color(244,111,94,160);g.lineWidth=3;g.rect(BATTLE.board.left-270,480-BATTLE.board.bottom,BATTLE.board.right-BATTLE.board.left,BATTLE.board.bottom-BATTLE.board.top);g.stroke();}
  // bars + name labels
  const bar=this.bars;bar.clear();for(const {u,v} of alive){const top=u.side==='pet'?(v.top??v.scale/.19*96):u.radius*2.6+14,w=u.side==='pet'?46:u.radius*2.2,x=u.x-270-w/2,y=480-u.y+top;
   bar.fillColor=DARK;bar.rect(x-1.5,y-1.5,w+3,9);bar.fill();bar.fillColor=u.side==='pet'?new Color(108,196,88):new Color(229,64,52);bar.rect(x,y,w*Math.max(0,u.hp/u.maxHp),6);bar.fill();
   if(u.side==='pet'&&v.label){const p=u as Pet;v.label.string=`Lv.${b.petLevel(p)} ${PETS[p.kind].name}`;v.label.node.setPosition(u.x-270,480-u.y+top+15,0);}
   else if(u.side==='enemy'&&v.label){v.label.node.active=true;v.label.node.setPosition(u.x-270,480-u.y+top+16,0);}}
  // taunted monsters: red lines to the tank that holds them
  for(const m of b.monsters){if(m.state==='dead'||m.tauntT<=0)continue;const t=b.pets.find(p=>p.id===m.tauntId&&p.state!=='dead');if(!t)continue;bar.strokeColor=new Color(255,70,50,Math.round(190*Math.min(1,m.tauntT)));bar.lineWidth=2;bar.moveTo(m.x-270,480-m.y+m.radius);bar.lineTo(t.x-270,480-t.y+t.radius);bar.stroke();bar.fillColor=new Color(255,70,50,230);const hx=m.x-270,hy=480-m.y+m.radius*2.6+34;bar.moveTo(hx-6,hy+9);bar.lineTo(hx+6,hy+9);bar.lineTo(hx,hy);bar.close();bar.fill();}
  // pets whose XP bar is full: a bouncing green arrow, tap the pet (or its card) to level it
  for(const {u,v} of alive){if(u.side!=='pet'||(u as Pet).summon||!b.upgradeReady((u as Pet).card))continue;const ok=b.canUpgrade((u as Pet).card),top=v.top??v.scale/.19*96,hx=u.x-270+30,hy=480-u.y+top+8+Math.abs(Math.sin(this.clock*5))*6;
   bar.fillColor=ok?new Color(80,200,90,255):new Color(160,160,150,230);bar.strokeColor=DARK;bar.lineWidth=2;bar.moveTo(hx,hy+16);bar.lineTo(hx+11,hy+4);bar.lineTo(hx+5,hy+4);bar.lineTo(hx+5,hy-6);bar.lineTo(hx-5,hy-6);bar.lineTo(hx-5,hy+4);bar.lineTo(hx-11,hy+4);bar.close();bar.fill();bar.stroke();}
  if(b.warded&&b.transT<=0){for(const m of b.guards){if(m.kind!=='warden')continue;bar.strokeColor=new Color(110,170,255,Math.round(140+80*Math.sin(this.clock*5)));bar.lineWidth=3;const x1=m.x-270,y1=480-m.y+m.radius,x2=BATTLE.enemyCore.x-270,y2=480-(BATTLE.enemyCore.y-30);for(let t=0;t<1;t+=.12){bar.moveTo(x1+(x2-x1)*t,y1+(y2-y1)*t);bar.lineTo(x1+(x2-x1)*Math.min(1,t+.07),y1+(y2-y1)*Math.min(1,t+.07));}bar.stroke();}
   bar.strokeColor=new Color(110,170,255,200);bar.lineWidth=3;bar.ellipse(BATTLE.enemyCore.x-270,480-(BATTLE.enemyCore.y-30),66,72);bar.stroke();}
  this.renderIntent();this.renderTray();
  // fx
  if(this.fx.length||this.fxDrawn){this.fxG.clear();this.topG.clear();}this.fxDrawn=this.fx.length>0;this.fx=this.fx.filter(x=>(x.t+=x.top?this.realDt:dt)<x.life);for(const x of this.fx){if(x.t<0)continue;const k=x.t/x.life,a=Math.round(255*(1-k)),f=x.top?this.topG:this.fxG;
   if(x.kind==='ring'){f.strokeColor=new Color(x.color.r,x.color.g,x.color.b,a);f.lineWidth=4;f.ellipse(x.x-270,480-x.y,x.r*(.6+k),x.r*(.6+k)*.42);f.stroke();}
   else if(x.kind==='tele'){const cx=x.x-270,cy=480-x.y;f.fillColor=new Color(255,60,50,Math.round(36+34*Math.sin(x.t*14)*Math.sin(x.t*14)));f.ellipse(cx,cy,x.r,x.r*.5);f.fill();f.fillColor=new Color(255,60,50,Math.round(110*k));f.ellipse(cx,cy,x.r*k,x.r*k*.5);f.fill();f.strokeColor=new Color(255,60,50,230);f.lineWidth=3;f.ellipse(cx,cy,x.r,x.r*.5);f.stroke();}
   else if(x.kind==='shard'){const px=x.x+x.vx!*x.t,py=x.y+x.vy!*x.t+260*x.t*x.t,cx=px-270,cy=480-py,s=x.r,ang=x.t*9;f.fillColor=new Color(x.color.r,x.color.g,x.color.b,a);f.moveTo(cx+Math.cos(ang)*s,cy+Math.sin(ang)*s);f.lineTo(cx+Math.cos(ang+1.9)*s*.5,cy+Math.sin(ang+1.9)*s*.5);f.lineTo(cx+Math.cos(ang+Math.PI)*s,cy+Math.sin(ang+Math.PI)*s);f.lineTo(cx+Math.cos(ang-1.2)*s*.5,cy+Math.sin(ang-1.2)*s*.5);f.close();f.fill();}
   else if(x.kind==='flash'){f.fillColor=new Color(x.color.r,x.color.g,x.color.b,Math.round(a*.45));f.circle(x.x-270,480-x.y,x.r*(.8+k*.4));f.fill();}
   else if(x.kind==='line'){const px=x.x+(x.x2!-x.x)*Math.min(1,k*1.4),py=x.y+(x.y2!-x.y)*Math.min(1,k*1.4);f.strokeColor=new Color(x.color.r,x.color.g,x.color.b,255);f.lineWidth=x.r>6?3:3;f.moveTo(x.x-270+(px-x.x)*.5,480-(x.y+(py-x.y)*.5));f.lineTo(px-270,480-py);f.stroke();if(x.r>6){f.fillColor=new Color(255,150,40,255);f.circle(px-270,480-py,x.r);f.fill();}}
   else if(x.kind==='rain'){f.fillColor=new Color(x.color.r,x.color.g,x.color.b,Math.round(a*.25));f.ellipse(x.x-270,480-x.y,x.r,x.r*.6);f.fill();for(let i=0;i<9;i++){const ang=i*2.4,rr=x.r*.7*((i*37%10)/10+.2),fall=Math.min(1,k*2.2-i*.08);if(fall<=0||fall>=1)continue;const ex=x.x+Math.cos(ang)*rr,ey=x.y+Math.sin(ang)*rr*.6;f.fillColor=new Color(255,150+i*8,50,255);f.circle(ex-270,480-(ey-90*(1-fall)),6);f.fill();}}
   else{const d=x.dir||1,r=x.r*(.55+.45*k),cx=x.x-270,cy=480-x.y;f.fillColor=new Color(255,122,28,Math.round(a*.55));f.moveTo(cx,cy);for(let i=0;i<=16;i++){const an=(-75+150*i/16)*Math.PI/180;f.lineTo(cx+Math.cos(an)*r*d,cy+Math.sin(an)*r*.6);}f.close();f.fill();f.strokeColor=new Color(255,214,74,a);f.lineWidth=4;for(let i=0;i<=16;i++){const an=(-75+150*i/16)*Math.PI/180,px=cx+Math.cos(an)*r*d,py=cy+Math.sin(an)*r*.6;if(i)f.lineTo(px,py);else f.moveTo(px,py);}f.stroke();}}
  this.renderSfx(dt);if(this.guide)this.guideStep(dt);
  // deck cards
  this.deployLabel.string=`场上 ${b.pets.filter(p=>p.state!=='dead'&&!p.summon).length}/6`;
  this.cards.forEach((c,i)=>{const card=b.cards[i],pet=card.petId?b.pets.find(p=>p.id===card.petId):undefined,why=b.blocked(i),sel=this.selected===i;
   c.node.setPosition(c.node.position.x,480-(892-(sel?10:0)),0);
   c.avatar.getComponent(Sprite)!.color=pet?new Color(150,150,150,255):why==='cooldown'?new Color(170,170,170,255):C.white;
   const ready=b.upgradeReady(i),max=card.lv>=PET_LV.max;c.lv.string=max?'MAX':'Lv'+card.lv;
   c.cost.node.active=c.costIcon.active=!pet;c.cost.color=why==='gold'?C.red:C.ink;
   const ok=b.canUpgrade(i),pulse=.5+.5*Math.sin(this.clock*7);
   // redraw the card overlay only when it changes; animated states at 15 Hz (see dirty())
   const anim=(pet&&ready&&ok)||(!sel&&!why&&!pet),xpq=max?0:Math.round(Math.min(1,card.xp/PET_LV.xpNeed(card.lv))*40);
   const sh:any=this.dirty(c.shade,[+!!pet,+ready,+ok,+max,xpq,Math.ceil(card.cd*4),+sel,why||'',anim?Math.floor(this.clock*ANIM_HZ):''].join('|'))?c.shade:NOOP;
   if(pet&&ready){sh.fillColor=ok?new Color(60,185,80,255):new Color(232,142,48,245);sh.roundRect(-44,-51,88,23,9);sh.fill();if(ok){sh.strokeColor=new Color(255,255,255,Math.round(120+120*pulse));sh.lineWidth=2;sh.roundRect(-44,-51,88,23,9);sh.stroke();}
    c.state.string=ok?`升级 ${b.upgradeCost(i)}`:`缺 ${b.upgradeCost(i)-b.gold} 金币`;c.state.color=C.white;}
   else{c.state.string=pet?(max?'满级':'出战中'):'';c.state.color=C.muted;}
   // XP bar: blue while filling, flashing green when it can level now, orange when only gold is missing
   if(!max){const need=PET_LV.xpNeed(card.lv),fr=Math.min(1,card.xp/need),y0=-32,bw=78;sh.fillColor=new Color(42,26,18,200);sh.roundRect(-bw/2-1,y0-1,bw+2,8,4);sh.fill();
    sh.fillColor=!ready?new Color(70,170,250):ok?new Color(Math.round(70+60*pulse),Math.round(200+40*pulse),90):new Color(240,150,50);sh.roundRect(-bw/2,y0,Math.max(6,bw*fr),6,3);sh.fill();
    if(ready&&ok){const hx=-bw/2+((this.clock*90)%(bw+20))-10;sh.fillColor=new Color(255,255,255,170);sh.rect(Math.max(-bw/2,hx),y0,Math.min(8,bw/2-hx),6);sh.fill();
     sh.fillColor=new Color(60,185,80,255);sh.strokeColor=DARK;sh.lineWidth=1.5;const ay=y0+16+pulse*3;sh.moveTo(36,ay+10);sh.lineTo(44,ay);sh.lineTo(28,ay);sh.close();sh.fill();sh.stroke();}}
   if(card.cd>0){const fr=card.cd/card.cdMax;sh.fillColor=new Color(31,32,27,140);sh.rect(-46,54-108*fr,92,108*fr);sh.fill();c.cd.string=String(Math.ceil(card.cd));}else c.cd.string='';
   if(sel){sh.strokeColor=C.red;sh.lineWidth=4;sh.rect(-47,-55,94,110);sh.stroke();}
   else if(!why&&!pet){sh.strokeColor=new Color(255,196,64,Math.round(110+90*Math.sin(this.clock*5)));sh.lineWidth=3;sh.rect(-47,-55,94,110);sh.stroke();}});
  // captain button
  const frac=b.captainCd/BATTLE.captain.cooldown,sr:any=this.dirty(this.capShade,String(Math.round(frac*48)))?this.capShade:NOOP;
  if(frac>0){sr.fillColor=new Color(31,32,27,140);sr.moveTo(0,0);for(let i=0;i<=24;i++){const an=Math.PI/2-frac*Math.PI*2*i/24;sr.lineTo(Math.cos(an)*30,Math.sin(an)*30);}sr.close();sr.fill();}
  const rgOn=this.aiming||b.captainReady(),rg:any=this.dirty(this.capRing,rgOn?`${this.aiming}|${Math.floor(this.clock*ANIM_HZ)}`:'off')?this.capRing:NOOP;if(rgOn){rg.strokeColor=this.aiming?C.red:new Color(255,196,64,Math.round(150+100*Math.sin(this.clock*5)));rg.lineWidth=4;rg.circle(0,0,33);rg.stroke();}
  this.capLock.active=b.sealT>0;this.capLabel.string=b.sealT>0?`封印 ${Math.ceil(b.sealT)}`:frac>0?`${Math.ceil(b.captainCd)}秒`:CAPTAIN_NAME[b.captain];
  if(this.toastT>0){this.toastT-=dt;this.toast.node.getComponent(UIOpacity)!.opacity=Math.round(255*Math.min(1,this.toastT*3));}
 }
 /** a pet levelled: the card pops, flashes and throws sparks; "Lv.N!" rises above it */
 private cardBurst(i:number,level:number){const c=this.cards[i];if(!c)return;const x=c.node.position.x+270,y=892,gold=new Color(255,206,72);
  tween(c.node).to(.1,{scale:new Vec3(1.25,1.25,1)}).to(.18,{scale:new Vec3(.95,.95,1)}).to(.1,{scale:new Vec3(1,1,1)}).start();
  // gold glow redrawn with fading alpha every frame (a white rect + UIOpacity could stay stuck fully white)
  const fl=this.ui.node(c.node,'flash',48,56,110,126),g=fl.addComponent(Graphics),glow={a:1};
  const draw=()=>{const k=glow.a;g.clear();g.fillColor=new Color(255,236,150,Math.round(110*k));g.roundRect(-50,-58,100,116,12);g.fill();g.lineWidth=5;g.strokeColor=new Color(255,206,72,Math.round(255*k));g.roundRect(-52,-60,104,120,13);g.stroke();};
  draw();tween(glow).to(.45,{a:0},{onUpdate:draw}).call(()=>fl.destroy()).start();
  for(let k=0;k<14;k++){const a=-Math.PI/2+(k/13-.5)*Math.PI*1.3,v=160+Math.random()*140;this.fx.push({kind:'shard',x,y:y-20,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,life:.7+Math.random()*.3,color:k%3?gold:new Color(120,235,130),r:4+Math.random()*4,top:true});}
  this.fx.push({kind:'ring',x,y,t:0,life:.5,color:gold,r:70,top:true});
  const l=this.ui.label(this.topText,`Lv.${level}!`,x,y-70,120,34,26,true,gold);l.enableOutline=true;l.outlineColor=DARK;l.outlineWidth=4;const n=l.node,o2=n.addComponent(UIOpacity);n.setScale(.5,.5,1);
  tween(n).to(.15,{scale:new Vec3(1.15,1.15,1)}).by(.6,{position:new Vec3(0,36,0)}).start();tween(o2).delay(.55).to(.3,{opacity:0}).call(()=>n.destroy()).start();}
 // ------------------------------------------------------------- legs (segments)
 private segTint(seg:number){return seg>=this.battle.segs-1?new Color(255,255,255,255):new Color(196,128,255,255);}
 /** cutscene timeline: 0..boom the crystal shatters, then the ground scrolls one screen, then the next crystal pops in */
 private renderLeg(dt:number){const b=this.battle;this.shakeT=Math.max(0,this.shakeT-dt);const sh=this.shakeT>0?Math.sin(this.shakeT*80)*7*this.shakeT:0;this.root.setPosition(sh,FIT.off,0);
  let sy=0;if(b.transT>0){const e=SEG.trans-b.transT;if(e>=SEG.boom&&e<SEG.boom+SEG.scroll){const k=(e-SEG.boom)/SEG.scroll;sy=-960*k*k*(3-2*k);}}this.scenery.setPosition(0,sy,0);
  if(b.transT>0&&!this.lastTrans){this.selected=-1;this.aiming=false;}this.lastTrans=b.transT>0;}
 private crystalLook(){const b=this.battle,c=this.cores[0],sp=c.node.getComponent(Sprite)!;let sc=1,tint=this.segTint(b.seg),alpha=255;
  if(b.transT>0){const e=SEG.trans-b.transT;
   if(e<SEG.boom){sc=1+e*.35;alpha=Math.max(0,Math.round(255*(1-e/(SEG.boom*.6))));c.node.setPosition(c.x-270+Math.sin(e*70)*5,480-c.base,0);}
   else if(e<SEG.boom+SEG.scroll)alpha=0;
   else{const k=Math.min(1,(e-SEG.boom-SEG.scroll)/.35);sc=.4+.6*k+Math.sin(k*Math.PI)*.15;tint=this.segTint(b.seg+1);}}
  const big=b.seg>=b.segs-1&&!(b.transT>0&&SEG.trans-b.transT<SEG.boom)?1.15:1;c.node.setScale(sc*big,sc*big,1);sp.color=new Color(tint.r,tint.g,tint.b,alpha);
  this.aheadCrystal.getComponent(Sprite)!.color=this.segTint(Math.min(b.seg+1,b.segs-1));const ab=b.seg+1>=b.segs-1?1.15:1;this.aheadCrystal.setScale(ab,ab,1);}
 // ------------------------------------------------------------- enemy intent (shown on the enemy core, never a popup)
 private buildIntent(){const ui=this.ui,h=this.hud,X=382,Y=206;const node=ui.node(h,'Intent',X,Y,64,64),g=ui.node(node,'G',32,32,64,64).addComponent(Graphics);
  const head=ui.label(h,'下一波',X,168,90,18,12,true,C.muted),name=ui.label(h,'',X,248,150,22,16,true,C.ink),sub=ui.label(h,'',X,267,180,18,12,true,C.muted);
  for(const l of [head,name,sub]){l.enableOutline=true;l.outlineColor=new Color(255,250,236);l.outlineWidth=3;}
  node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;const it=this.battle.intent;if(it)this.say(`${INTENTS[it.kind].name}：${INTENTS[it.kind].desc}`,2.2);});
  this.intentUI={node,g,icon:null,name,sub,head,kind:''};
  const ex=ui.rect(h,'Expose',158,206,96,30,new Color(255,176,60),true);const el=ui.label(ex,'',48,15,90,24,14,true,C.white);el.enableOutline=true;el.outlineColor=new Color(150,70,10);el.outlineWidth=2;this.exposeUI={node:ex,label:el};ex.active=false;}
 private renderIntent(){const b=this.battle,it=b.intent,U=this.intentUI,g:any=this.dirty(U.g,String(Math.floor(this.clock*ANIM_HZ)))?U.g:NOOP;
  this.exposeUI.node.active=b.exposed>0;if(b.exposed>0){this.exposeUI.label.string=`破绽 ${Math.ceil(b.exposed)}s`;const k=1+.06*Math.sin(this.clock*8);this.exposeUI.node.setScale(k,k,1);}
  // core effects, drawn relative to the badge (core sprite centre is 112 px left, 24 px up)
  const cx=BATTLE.enemyCore.x-382,cy=206-(BATTLE.enemyCore.y-30),pulse=.5+.5*Math.sin(this.clock*6);
  if(b.exposed>0){g.strokeColor=new Color(255,170,50,Math.round(120+120*pulse));g.lineWidth=3;for(let i=0;i<10;i++){const a0=i*Math.PI/5+this.clock;g.moveTo(cx+Math.cos(a0)*58,cy+Math.sin(a0)*50);g.lineTo(cx+Math.cos(a0+.25)*66,cy+Math.sin(a0+.25)*58);}g.stroke();}
  if(!it){U.node.active=U.name.node.active=U.sub.node.active=U.head.node.active=false;return;}U.node.active=U.name.node.active=U.sub.node.active=U.head.node.active=true;
  const d=INTENTS[it.kind],col=new Color(d.color[0],d.color[1],d.color[2],255),off=it.phase==='done'||it.phase==='broken';
  if(U.kind!==it.kind){U.icon?.destroy();U.icon=this.ui.icon(U.node,d.icon,32,32,30);U.kind=it.kind;}
  if(it.phase==='active'&&it.kind==='shell'&&it.shield>0){g.fillColor=new Color(90,160,255,Math.round(40+30*pulse));g.ellipse(cx,cy,64,70);g.fill();g.strokeColor=new Color(90,160,255,230);g.lineWidth=3;g.ellipse(cx,cy,64,70);g.stroke();}
  if(it.phase==='active'&&it.kind==='repair'){g.fillColor=new Color(90,220,120,Math.round(40+50*pulse));g.circle(cx,cy,60);g.fill();g.fillColor=new Color(90,220,120,230);for(let i=0;i<3;i++){const t=(this.clock*.8+i/3)%1,px=cx-30+i*30,py=cy+t*70;g.rect(px-2,py-7,4,14);g.rect(px-7,py-2,14,4);g.fill();}}
  // badge: disc + ring; while announced the ring is a countdown that empties toward the wave
  const sc=it.phase==='prep'&&it.t<2?1+.1*pulse:1;U.node.setScale(sc,sc,1);
  g.fillColor=off?new Color(222,218,204,235):new Color(255,250,236,250);g.circle(0,0,27);g.fill();g.strokeColor=new Color(42,26,18,255);g.lineWidth=2;g.circle(0,0,27);g.stroke();
  g.lineWidth=5;g.strokeColor=off?new Color(170,165,150,255):col;
  if(it.phase==='prep'){const k=it.prepMax>0?it.t/it.prepMax:0,a0=Math.PI/2;g.moveTo(Math.cos(a0)*31,Math.sin(a0)*31);g.arc(0,0,31,a0,a0-Math.PI*2*k,true);g.stroke();}
  else if(it.phase==='active'&&it.dur>0&&it.left<1e8){const k=Math.max(0,it.left/it.dur),a0=Math.PI/2;g.moveTo(Math.cos(a0)*31,Math.sin(a0)*31);g.arc(0,0,31,a0,a0-Math.PI*2*k,true);g.stroke();}
  else{g.circle(0,0,31);g.stroke();}
  if(U.icon)U.icon.getComponent(Sprite)?(U.icon.getComponent(Sprite)!.color=off?new Color(160,160,150,255):C.white):0;
  U.head.string=it.phase==='prep'?'敌方准备':it.phase==='active'?'生效中':it.phase==='broken'?'已打断':'已结束';U.head.color=it.phase==='active'?C.red:C.muted;
  U.name.string=it.phase==='prep'?`${d.name}  ${Math.ceil(it.t)}`:d.name;U.name.color=off?C.muted:new Color(Math.round(d.color[0]*.7),Math.round(d.color[1]*.55),Math.round(d.color[2]*.5),255);
  let sub=d.short;
  if(it.phase==='active'&&it.kind==='repair'){sub=`打断 ${Math.min(it.prog,it.need)}/${it.need}`;const w=84,k=Math.min(1,it.prog/it.need);g.fillColor=new Color(42,26,18,200);g.rect(-w/2,-86,w,7);g.fill();g.fillColor=new Color(110,230,120);g.rect(-w/2,-86,w*k,7);g.fill();}
  else if(it.phase==='active'&&it.kind==='shell'){sub=`护盾 ${Math.ceil(it.shield)}`;const w=84,k=Math.max(0,it.shield/it.shieldMax);g.fillColor=new Color(42,26,18,200);g.rect(-w/2,-86,w,7);g.fill();g.fillColor=new Color(90,160,255);g.rect(-w/2,-86,w*k,7);g.fill();}
  else if(it.phase==='active'&&it.kind==='seal')sub=`队长技能封印 ${Math.ceil(b.sealT)}s`;
  else if(it.phase==='broken')sub='修复被打断了';
  U.sub.string=sub;}
 // ------------------------------------------------------------- card tray (team level rewards)
 private trayCards:{o:Offer;cost:Label;g:Graphics}[]=[];private seenOffers=new Set<number>();
 private renderTray(){const b=this.battle,key=b.offers.map(o=>o.id).join(',');if(key!==this.trayKey){this.trayKey=key;this.buildTray();}
  for(const t of this.trayCards){const ok=b.gold>=t.o.cost;t.cost.color=ok?C.ink:C.red;const tg:any=this.dirty(t.g,ok?String(Math.floor(this.clock*ANIM_HZ)):'off')?t.g:NOOP;if(ok){tg.strokeColor=new Color(255,196,64,Math.round(130+110*Math.sin(this.clock*5)));tg.lineWidth=3;tg.roundRect(-50,-42,100,84,10);tg.stroke();}}}
 private buildTray(){for(const c of [...this.tray.children])c.destroy();this.trayCards=[];const b=this.battle,ui=this.ui;
  if(b.offers.length){const l=ui.label(this.tray,'点卡牌购买',56,680-(b.offers.length-1)*86-52,100,18,12,true,C.ink);l.enableOutline=true;l.outlineColor=new Color(255,250,236);l.outlineWidth=3;}
  b.offers.forEach((o,i)=>{const d=BATTLE_CARDS.find(c=>c.id===o.card)!,q=CARD_Q[o.q],qc=new Color(q.color[0],q.color[1],q.color[2],255),y=680-i*86;
   const n=ui.rect(this.tray,'offer'+o.id,56,y,96,80,new Color(255,250,236),true);ui.rect(n,'q',48,10,90,16,qc,false);ui.label(n,q.name,48,10,88,15,11,true,C.white);
   ui.icon(n,d.icon,18,33,24);ui.label(n,d.name,58,33,70,18,13,true);ui.label(n,b.offerText(o),48,52,92,16,10,true,new Color(Math.round(q.color[0]*.6),Math.round(q.color[1]*.6),Math.round(q.color[2]*.6),255));
   ui.icon(n,'coin',30,68,15);const cost=ui.label(n,String(o.cost),56,68,50,16,13,true);
   const g=ui.node(n,'glow',48,40,96,80).addComponent(Graphics);this.trayCards.push({o,cost,g});
   n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;if(!this.battle.buyCard(o.id))this.say(`金币不足，需要 ${o.cost}`,1.2);});
   if(!this.seenOffers.has(o.id)){this.seenOffers.add(o.id);n.setScale(.2,.2,1);tween(n).to(.25,{scale:new Vec3(1.08,1.08,1)}).to(.1,{scale:new Vec3(1,1,1)}).start();}});}
 private floatText(s:string,x:number,y:number,color:Color,size=18){const l=this.ui.label(this.fxLayer,s,x,y,110,26,size,true,color);l.enableOutline=true;l.outlineColor=DARK;l.outlineWidth=3;const n=l.node,op=n.addComponent(UIOpacity);
  tween(n).by(.7,{position:new Vec3((Math.random()-.5)*16,30,0)}).start();tween(op).delay(.35).to(.35,{opacity:0}).call(()=>n.destroy()).start();}
 private coin(x:number,y:number,amount:number){const n=this.ui.icon(this.fxLayer,'coin',x,y,22);const target=new Vec3(292-270,480-36,0);
  tween(n).by(.18,{position:new Vec3(0,18,0)}).to(.5,{position:target},{easing:'quadIn'}).call(()=>n.destroy()).start();this.floatText('+'+amount,x+12,y-10,GOLD,16);}
 /** 试炼之塔 settlement: first clear pays the floor reward, a loss uses one of today's tries; climb on or go home */
 private towerResult(L:Node,r:BattleResult){const ui=this.ui,f=this.towerFloor,player=new PlayerModel(sys.localStorage);player.markSeen(Array.from(this.met));
  const b=player.finishTower(f,r.win);player.save();if(r.win&&b&&Object.keys(b).length)towerRank(player.towerBest,player.name); /* new best floor -> leaderboard */const left=player.towerTries();
  ui.label(L,r.win?(b&&Object.keys(b).length?`首次通关 ${f}层　金币 +${b.coins}　食物 +${b.food}`:`${f}层已通关过，没有首通奖励`):`今天还剩 ${left} 次挑战机会`,270,500,340,26,16,true,C.red);
  const climb=(n:number)=>{(globalThis as any).__towerFloor=n;director.loadScene('Battle');},home=()=>{(globalThis as any).__towerFloor=0;director.loadScene('Home');};
  if(r.win)ui.button(L,'next',`挑战 ${f+1}层`,180,560,170,50,()=>climb(f+1),C.red,18);else if(left>0)ui.button(L,'again',`再试一次 (剩${left}次)`,180,560,170,50,()=>climb(f),C.red,16);
  else if(Ads.available('tower')&&player.adLeft('tower')>0)ui.button(L,'adtry','看广告 再试一次',180,560,170,50,()=>{this.setText('adtry','广告播放中…');Ads.rewarded('tower').then(ok=>{const p2=new PlayerModel(sys.localStorage);if(ok&&p2.adTowerTry()){p2.save();climb(f);}else this.setText('adtry',ok?'今日次数已用完':'广告没有看完');});},GOLD,16);
  ui.button(L,'camp','返回主城',r.win||left>0?380:270,560,150,50,home,C.paper,18);this.cheer(r);if(r.win)this.shareBtn(L,`我在《灵爪守望》试炼之塔爬到了第 ${f} 层，你能到几层？`);}
 /** 分享战绩 (no reward: WeChat forbids rewarded sharing) */
 private shareBtn(L:Node,title:string){if(!canShare())return;this.ui.button(L,'share','分享战绩',270,676,150,40,()=>{if(!shareNow(title))this.say('在微信里打开才能分享',1.4);},C.paper,15);}
 private showResult(){if(this.resultLayer)return;const r=this.battle.result!,ui=this.ui,L=ui.node(this.hud,'Result',270,480,540,960);this.resultLayer=L;
  ui.rect(L,'Dim',270,480,540,960,new Color(31,32,27,150),false);ui.frame(L,'Box',270,450,380,360,'panel');
  ui.label(L,r.win?'胜利！':'核心失守',270,320,300,50,36,true,r.win?C.red:C.ink);
  ui.label(L,(r.reason==='destroyed-enemy-core'?'击碎了全部水晶':r.reason==='boss-slain'?'击败了首领':r.reason==='survived'?'守住了我方核心':'我方核心被摧毁')+`　推进 ${Math.min(r.segments,this.battle.segs)}/${this.battle.segs} 段`,270,365,340,28,18,false,C.muted);
  for(let i=0;i<3;i++)ui.img(L,i<r.stars?'star':'star-off',214+i*56,412,46);
  ui.label(L,`击败 ${r.kills}　金币 +${r.goldEarned}　用时 ${Math.floor(r.time/60)}:${String(Math.floor(r.time%60)).padStart(2,'0')}`,270,465,340,28,17,true);
  if(this.towerFloor){this.towerResult(L,r);return;}
  // account rewards (局外): coins from stars and kills, plus food and captain xp
  const player=new PlayerModel(sys.localStorage);player.markSeen(Array.from(this.met));if(this.guide&&!player.guide.includes('battle'))player.guide.push('battle');this.guide?.hide();const reward=player.applyBattle(r);player.save();
  const rl=ui.label(L,`奖励　金币 +${reward.coins}　食物 +${reward.food}　经验 +${reward.xp}`,270,500,340,26,16,true,C.red);
  // 看广告结算翻倍 (capped per day in PlayerModel.useAd)
  if(Ads.available('battle2x')&&player.adLeft('battle2x')>0&&reward.coins>0){const btn=ui.button(L,'ad2x',`看广告 奖励翻倍（今日剩 ${player.adLeft('battle2x')} 次）`,270,610,300,40,()=>{this.setText('ad2x','广告播放中…');
   Ads.rewarded('battle2x').then(ok=>{const p2=new PlayerModel(sys.localStorage);const b=ok?p2.adDoubleBattle(reward):null;if(b){p2.save();rl.string=`奖励　金币 +${reward.coins*2}　食物 +${reward.food*2}　经验 +${reward.xp}（已翻倍）`;btn.active=false;}else this.setText('ad2x',ok?'今日次数已用完':'广告没有看完，奖励未翻倍');});},GOLD,15);}
  const go=(stage:number)=>{const p=new PlayerModel(sys.localStorage);p.selectStage(stage);if(!p.startBattle()){this.say('体力不足，回主城休息一下',1.6);return;}p.save();director.loadScene('Battle');};
  const next=player.nextStageOpen&&r.win;
  ui.button(L,'again',`再战 (体力${STAMINA.battleCost})`,next?112:180,560,next?136:160,50,()=>go(player.stage),next?C.paper:C.red,16);
  if(next)ui.button(L,'next',`下一关 ${STAGES[player.stage+1].name}`,270,560,126,50,()=>go(player.stage+1),C.red,16);
  ui.button(L,'camp','返回主城',next?428:360,560,next?112:150,50,()=>director.loadScene('Home'),C.paper,next?16:20);
  this.cheer(r);if(r.win)this.shareBtn(L,`我在《灵爪守望》${this.battle.stage.chapterName} ${this.battle.stage.name} 拿到了 ${r.stars} 星，来比比？`);}
 private cheer(r:BattleResult){
  for(const p of this.battle.pets){const v=this.views.get(p.id);if(v&&p.state!=='dead'){v.anim='';this.play(v,r.win?'happy':'hit',true);v.skel.setAnimation(1,r.win?'face-happy':'face-alert',true);}}}
}
