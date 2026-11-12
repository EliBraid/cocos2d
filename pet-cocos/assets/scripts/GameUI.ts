import {Node,Sprite,SpriteFrame,UITransform,UIOpacity,Graphics,Color,Label,HorizontalTextAlignment,EventTouch,BlockInputEvents,tween,Vec3} from 'cc';
import {PaperUI,C} from './PaperUI';
import {GameModel} from './GameModel';
import type {PetState} from './PetBrain';
export type Screen='login'|'home'|'pet'|'team'|'bag'|'route'|'battle';
export type UIActions={navigate:(screen:Screen)=>void;enter:()=>void;feed:()=>void;upgrade:()=>void;train:()=>void;startBattle:()=>void;exitBattle:()=>void;pose:(state:PetState)=>void;worldTap:(u:number,v:number)=>void};
export class GameUI {
  ui=new PaperUI();content:Node;overlay:Node;screen:Screen='login';agreed=false;labels=new Map<string,Label>();worldFrame:Node|null=null;worldTop=106;worldHeight=486;modal:Node|null=null;toastNode:Node|null=null;bondBar:((n:number)=>void)|null=null;coreBar:((n:number)=>void)|null=null;
  constructor(public root:Node,public model:GameModel,public art:Record<string,SpriteFrame>,public worldTexture:SpriteFrame,public petTexture:SpriteFrame,public actions:UIActions){
    this.content=this.ui.node(root,'Content',270,480,540,960);this.overlay=this.ui.node(root,'Overlay',270,480,540,960);
  }
  image(parent:Node,frame:SpriteFrame,x:number,y:number,w:number,h:number,name='art'){const n=this.ui.node(parent,name,x,y,w,h),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=frame;n.getComponent(UITransform)!.setContentSize(w,h);return n;}
  private text(id:string,value:string,x:number,y:number,w:number,h:number,size=20,bold=false,color=C.ink,align=HorizontalTextAlignment.CENTER){const l=this.ui.label(this.content,value,x,y,w,h,size,bold,color,align);this.labels.set(id,l);return l;}
  draw(screen:Screen){this.closeModal();if(this.toastNode?.isValid)this.toastNode.destroy();this.toastNode=null;this.content.destroyAllChildren();this.ui.buttons.clear();this.labels.clear();this.worldFrame=null;this.bondBar=null;this.coreBar=null;this.screen=screen;this.ui.rect(this.content,'Paper',270,480,540,960,C.paper,false);
    if(screen==='login'){this.login();return;}
    if(screen==='battle'){this.battle();return;}
    if(screen==='home'){this.hud();this.home();}
    else if(screen==='pet')this.pet();
    else if(screen==='team')this.team();
    else if(screen==='bag')this.bag();
    else this.route();
    this.navigation(screen);this.refresh();
    const opacity=this.content.getComponent(UIOpacity)||this.content.addComponent(UIOpacity);opacity.opacity=0;tween(opacity).to(.16,{opacity:255}).start();
  }
  private login(){
    const bg=this.image(this.content,this.art.camp,270,480,540,660,'LoginCamp');bg.addComponent(UIOpacity).opacity=160;
    this.ui.rect(this.content,'HeaderPaper',270,117,540,246,new Color(249,247,236,244),false);
    this.ui.icon(this.content,'paw',270,62,53);const brand=this.text('brand-red','萌宠',163,149,190,88,66,true,C.red);brand.enableOutline=true;brand.outlineColor=C.ink;brand.outlineWidth=2;
    this.text('brand-black','守卫战',355,149,240,88,62,true);this.ui.rect(this.content,'tagline',270,226,432,46);this.text('tagline','养一队萌宠，守住你的城',270,226,412,38,23,true);
    this.image(this.content,this.art.crystal,346,532,172,220,'LoginCrystal');this.image(this.content,this.petTexture,194,548,330,330,'LoginFox');
    this.ui.button(this.content,'server','● 萌宠1服 · 推荐',270,740,362,46,()=>this.message('萌宠1服','欢迎来到小伙伴们的营地。','继续旅程'),C.paper,20);
    this.ui.button(this.content,'enter','开始旅程',270,811,410,72,()=>{if(!this.agreed){this.toast('请先阅读并同意下方说明');return;}this.actions.enter();},C.red,32,'paw');
    const checkbox=this.ui.button(this.content,'agreement',this.agreed?'✓':'',91,875,25,25,()=>{this.agreed=!this.agreed;this.draw('login');},C.paper,22);checkbox.name='AgreementCheckbox';
    this.ui.button(this.content,'privacy','同意用户协议与隐私说明',294,875,348,30,()=>this.message('体验说明','培养进度保存在当前设备。此体验无需账号，不会上传你的个人信息。'),new Color(249,247,236,0),16);
    this.text('local','本地体验 · 与小伙伴一起出发',270,927,400,28,14,false,C.muted);
  }
  private hud(){
    this.ui.rect(this.content,'PlayerHeader',270,52,516,88);this.image(this.content,this.art['fox-avatar'],55,50,60,60,'Avatar');
    this.text('name',this.model.name,171,35,164,31,22,true,C.ink,HorizontalTextAlignment.LEFT);this.text('leader','队长等级 1',165,63,152,26,16,false,C.ink,HorizontalTextAlignment.LEFT);this.ui.bar(this.content,160,80,142,6,.28,C.cyan);
    this.ui.rect(this.content,'Coins',335,35,122,34);this.ui.icon(this.content,'coin',291,35,25);this.text('coins','',344,35,87,30,19,true);
    this.ui.rect(this.content,'Food',452,35,100,34);this.ui.icon(this.content,'food',420,35,24);this.text('food','',464,35,64,30,19,true);
    this.ui.button(this.content,'settings','',505,73,35,34,()=>this.message('营地说明','点击地面移动，点击狐狸互动。训练可获得金币；喂食提升默契，升级提高宠物属性。'));this.ui.icon(this.content,'gear',505,73,25);
  }
  private stage(top=106,height=486){this.worldTop=top;this.worldHeight=height;const background=this.image(this.content,this.art.camp,270,top+height/2,540,height,'CampPainting');
    this.worldFrame=this.image(this.content,this.worldTexture,270,top+height/2,540,height,'WorldViewport');
    this.worldFrame.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{e.propagationStopped=true;const p=e.getUILocation(),local=this.worldFrame!.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));this.actions.worldTap((local.x+270)/540,(local.y+height/2)/height);});return background;
  }
  private home(){
    this.stage();this.ui.button(this.content,'hatchery','孵化屋',103,190,102,32,()=>this.message('孵化屋','第一位伙伴已加入营地。先和赤焰小狐熟悉彼此，训练它的守护本领。'),C.paper,19);
    this.ui.button(this.content,'training','训练场',451,242,104,34,()=>this.actions.train(),C.paper,19);
    for(const [i,icon] of ['mail','book'].entries()){this.ui.button(this.content,'side-'+icon,'',509,151+i*73,37,42,()=>this.message(icon==='mail'?'营地来信':'伙伴图鉴',icon==='mail'?'欢迎来到萌宠营地！照顾好你的第一位伙伴，一起守护核心。':'赤焰小狐 · 火焰战士\n擅长近战挥剑，尾巴和围巾会跟随动作摆动。'));this.ui.icon(this.content,icon,509,151+i*73,28);}
    this.ui.rect(this.content,'CampHint',270,579,298,25,new Color(249,247,236,225),false);this.text('hint','点地面移动 · 点狐狸互动',270,579,320,26,15,false,C.ink);
    this.ui.rect(this.content,'Squad',270,672,512,139);this.ui.icon(this.content,'paw',34,625,25);this.text('squad-title','我的出战小队',159,625,216,32,22,true,C.ink,HorizontalTextAlignment.LEFT);
    this.ui.button(this.content,'edit-team','编辑阵容 ›',448,625,128,32,()=>this.actions.navigate('team'),C.paper,17);
    for(let i=0;i<5;i++){const x=67+i*99;this.ui.rect(this.content,'slot-'+i,x,685,76,78,i?new Color(239,237,224):C.white);if(i===0){this.image(this.content,this.art['fox-avatar'],x,677,65,61,'FoxPortrait');this.ui.label(this.content,'战士',x,717,75,25,16,true);const hit=this.ui.node(this.content,'OpenFox',x,685,76,78);hit.on(Node.EventType.TOUCH_END,()=>this.actions.navigate('pet'));}else{this.ui.icon(this.content,'lock',x,680,24,C.muted);this.ui.label(this.content,['','守卫','法师','射手','辅助'][i],x,717,75,25,15,false,C.muted);}}
    this.ui.rect(this.content,'Adventure',270,813,512,121);this.text('chapter','晨光森林 · 核心守卫',260,777,453,32,23,true,C.ink,HorizontalTextAlignment.LEFT);this.text('objective','击退暗影怪，守住营地核心',249,805,432,27,16,false,C.muted,HorizontalTextAlignment.LEFT);
    this.ui.icon(this.content,'energy',38,847,29);this.text('energy','',98,845,99,34,22,true);this.ui.button(this.content,'start-adventure','开始冒险',352,843,300,53,()=>this.actions.startBattle(),C.red,26,'sword');
  }
  private title(value:string,subtitle=''){this.ui.button(this.content,'back','',35,42,42,44,()=>this.actions.navigate('home'));this.ui.icon(this.content,'back',35,42,25);this.text('page-title',value,270,43,365,45,30,true);if(subtitle)this.text('subtitle',subtitle,270,89,490,30,17,false,C.muted);}
  private pet(){
    this.title('我的伙伴');this.text('pet-name','赤焰小狐',270,126,360,48,34,true);this.text('pet-level','',270,164,330,28,18,false,C.muted);
    this.ui.icon(this.content,'star',178,125,20);this.ui.icon(this.content,'star',361,125,20);
    const g=this.ui.node(this.content,'PetFloor',270,476,330,56).addComponent(Graphics);g.fillColor=new Color(39,45,34,20);g.ellipse(0,0,117,20);g.fill();
    this.image(this.content,this.petTexture,270,333,368,368,'PetPortraitLive');
    for(const [i,state] of (['idle','walk','attack','hit','happy'] as PetState[]).entries())this.ui.button(this.content,'pose-'+state,['待机','小跑','挥剑','受击','开心'][i],66+i*102,532,91,39,()=>this.actions.pose(state),i===0?new Color(228,237,214):C.paper,18);
    this.ui.rect(this.content,'Stats',270,614,508,98);for(const [i,name] of ['生命','攻击','防御'].entries()){const x=103+i*168;this.text('stat-label-'+i,name,x,590,140,28,17,false,C.muted);this.text('stat-'+i,'',x,628,145,42,29,true);}
    this.ui.icon(this.content,'heart',44,696,27);this.text('bond-label','',199,695,278,28,19,true,C.ink,HorizontalTextAlignment.LEFT);this.bondBar=this.ui.bar(this.content,270,727,459,15,this.model.bond/100,C.red);
    this.text('skill','焰刃 · 前摇蓄力后向前挥出一剑',270,766,485,35,18,false,C.muted);
    this.ui.button(this.content,'feed','喂食 · 1',141,818,237,62,()=>this.actions.feed(),C.paper,24,'food');this.ui.button(this.content,'upgrade','',399,818,237,62,()=>this.actions.upgrade(),C.red,23,'plus');
    this.text('evolution','赤焰小狐 → 赤焰剑狐 → 焚锋狐王',270,867,495,28,16,false,C.muted);
  }
  private team(){this.title('出战阵容','当前出战伙伴 1 / 5');this.ui.rect(this.content,'ActivePartner',270,269,492,285);this.image(this.content,this.petTexture,270,260,250,250);this.text('team-fox','赤焰小狐 · 战士',270,393,420,35,24,true);
    for(let i=0;i<4;i++){const x=83+i*125;this.ui.rect(this.content,'empty-team',x,492,102,113);this.ui.icon(this.content,'lock',x,474,31,C.muted);this.text('empty-'+i,['守卫','法师','射手','辅助'][i],x,527,90,25,17,false,C.muted);}
    this.ui.rect(this.content,'Synergy',270,646,492,128);this.text('synergy-title','战士羁绊  1 / 2',270,614,450,35,23,true);this.text('synergy','再加入一位战士可激活阵容加成',270,659,450,34,17,false,C.muted);this.ui.button(this.content,'team-train','训练赤焰小狐',270,780,390,60,()=>{this.actions.navigate('home');this.actions.train();},C.red,24,'sword');}
  private bag(){this.title('营地背包','照顾伙伴，准备下一次冒险');const list=[{name:'金币',icon:'coin',count:String(this.model.coins),desc:'训练与冒险获得，用于培养升级'},{name:'伙伴食物',icon:'food',count:String(this.model.food),desc:'喂食消耗一份，提升10点默契'},{name:'体力',icon:'energy',count:this.model.energy+' / 80',desc:'每次冒险消耗5点体力'}];for(const [i,p] of list.entries()){const y=206+i*181;this.ui.rect(this.content,'item-'+i,270,y,496,146);this.ui.icon(this.content,p.icon,75,y-15,47);this.text('item-name-'+i,p.name,232,y-30,240,38,25,true,C.ink,HorizontalTextAlignment.LEFT);this.text('item-count-'+i,p.count,431,y-25,115,38,26,true);this.text('item-desc-'+i,p.desc,270,y+35,450,34,17,false,C.muted);}this.ui.button(this.content,'bag-feed','去照顾伙伴',270,803,390,60,()=>this.actions.navigate('pet'),C.red,24,'heart');}
  private route(){this.title('冒险地图','晨光森林');const bg=this.image(this.content,this.art.camp,270,419,506,555);bg.addComponent(UIOpacity).opacity=110;const path=this.ui.node(this.content,'RoutePath',270,418,480,540).addComponent(Graphics);path.strokeColor=C.ink;path.lineWidth=4;path.moveTo(-145,-171);path.bezierCurveTo(140,-90,-130,18,80,111);path.bezierCurveTo(150,143,38,175,50,225);path.stroke();
    const marks=[[122,600],[305,477],[216,346],[351,226]];marks.forEach((p,i)=>{this.ui.button(this.content,'route-'+i,i?'':'1-1',p[0],p[1],i?57:82,i?57:68,()=>i?this.toast('前方路线尚未开启'):this.actions.startBattle(),i?C.paper:C.red,20);if(i)this.ui.icon(this.content,'lock',p[0],p[1],25,C.muted);});this.ui.rect(this.content,'RouteChapter',270,744,498,107);this.text('route-name','晨光森林 · 核心守卫',270,723,460,40,25,true);this.text('route-goal','击退6只暗影怪 · 战斗等级从1级开始',270,766,465,32,17,false,C.muted);this.ui.button(this.content,'route-start','进入森林 · 体力5',270,843,398,60,()=>this.actions.startBattle(),C.red,24,'sword');}
  private battle(){this.stage(118,715);this.ui.rect(this.content,'BattleHeader',270,55,514,91);this.text('battle-title','守住营地核心',194,34,326,32,24,true,C.ink,HorizontalTextAlignment.LEFT);this.coreBar=this.ui.bar(this.content,204,76,340,17,this.model.battle.core/100,C.cyan);this.text('core','',204,76,322,22,14,true);this.ui.button(this.content,'leave-battle','撤退',459,47,101,47,()=>this.actions.exitBattle(),C.paper,20);
    this.ui.rect(this.content,'BattleBottom',270,885,514,114);this.text('battle-level','',83,859,126,34,24,true);this.text('battle-kills','',287,859,250,32,22,true);this.text('battle-gold','',290,906,442,32,20,false,C.muted);this.ui.icon(this.content,'coin',44,905,26);this.ui.button(this.content,'battle-hit','受到攻击',463,776,120,36,()=>this.actions.pose('hit'),C.paper,16);}
  private navigation(screen:Screen){const tabs:[Screen,string,string][]=[['home','home','主城'],['pet','pet','宠物'],['team','team','阵容'],['bag','bag','背包'],['route','compass','冒险']];tabs.forEach(([key,icon,label],i)=>{const x=56+i*107;const n=this.ui.button(this.content,'nav-'+key,'',x,924,99,66,()=>this.actions.navigate(key),screen===key?C.red:C.paper);this.ui.icon(n,icon,49.5,22,28);this.ui.label(n,label,49.5,51,86,24,19,true);});}
  refresh(){const set=(id:string,value:string)=>{const l=this.labels.get(id);if(l&&l.string!==value)l.string=value;};const m=this.model;set('coins',String(m.coins));set('food',String(m.food));set('energy',m.energy+'/80');set('pet-level','火焰战士  ·  Lv.'+m.level);set('bond-label','默契度  '+m.bond+' / 100');set('stat-0',String(m.stats.health));set('stat-1',String(m.stats.attack));set('stat-2',String(m.stats.defense));const upgrade=this.ui.buttons.get('upgrade');if(upgrade){const label=upgrade.getComponentsInChildren(Label)[0];if(label)label.string=m.level>=20?'已满级':'升级 · '+m.upgradeCost;}
    this.bondBar?.(m.bond/100);if(m.battle.active){this.coreBar?.(m.battle.core/100);set('core','核心 '+Math.ceil(m.battle.core)+' / 100');set('battle-level','Lv.'+m.battle.level);set('battle-kills','击退 '+m.battle.kills+' / 6');set('battle-gold','战斗金币 '+m.battle.gold+'    自动寻敌中');}
  }
  floating(value:string,u:number,v:number,color=C.red){const x=u*540,y=this.worldTop+(1-v)*this.worldHeight;const label=this.ui.label(this.overlay,value,x,y,180,52,25,true,color);const opacity=label.node.addComponent(UIOpacity);tween(label.node).by(.9,{position:new Vec3(0,45,0)}).start();tween(opacity).delay(.35).to(.5,{opacity:0}).call(()=>label.node.destroy()).start();}
  toast(value:string){if(this.toastNode?.isValid)this.toastNode.destroy();const n=this.ui.rect(this.overlay,'Toast',270,113,Math.min(510,Math.max(270,value.length*18+35)),45,new Color(37,43,33,240),false);this.toastNode=n;this.ui.label(n,value,n.getComponent(UITransform)!.width/2,22,490,38,17,false,C.paper);const opacity=n.addComponent(UIOpacity);tween(opacity).delay(2).to(.25,{opacity:0}).call(()=>n.destroy()).start();}
  message(title:string,body:string,button='知道了',callback?:()=>void){this.closeModal();const shade=this.ui.rect(this.overlay,'ModalShade',270,480,540,960,new Color(23,27,20,120),false);shade.addComponent(BlockInputEvents);this.modal=shade;const box=this.ui.rect(shade,'Message',270,462,458,324);this.ui.label(box,title,229,50,400,46,29,true);const l=this.ui.label(box,body,229,148,399,126,20,false,C.muted);l.enableWrapText=true;this.ui.button(box,'modal-ok',button,229,266,342,51,()=>{this.closeModal();callback?.();},C.red,23);}
  closeModal(){if(this.modal?.isValid)this.modal.destroy();this.modal=null;}
}
