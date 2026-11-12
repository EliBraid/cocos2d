import {director,_decorator,Component,Node,UITransform,SpriteFrame,Sprite,Label,Graphics,Color,UIOpacity,EffectAsset,resources,sp,view,ResolutionPolicy,Vec3,EventTouch,tween,HorizontalTextAlignment} from 'cc';
import {ForestBrain,ForestPose,FIRE_POSITION,Ground} from './ForestLogic';
import {ForestWorld} from './ForestWorld';
import {PaperUI,C} from './PaperUI';
import {PET_SKELETON} from './ActiveRig';
import {loadProto} from './ProtoAssets';
const {ccclass}=_decorator;
@ccclass('ForestSlice')
export class ForestSlice extends Component {
  ready=false;brain=new ForestBrain();world!:ForestWorld;ui=new PaperUI();overlay!:Node;content!:Node;status!:Label;emotions!:Node;pending:''|'train'|'warm'='';trainingHits=0;hits=0;petTouches=0;time=0;lastGrass=0;feedbackUntil=0;feedback='';bootError='';
  async start(){
    try{
      view.setDesignResolutionSize(540,960,ResolutionPolicy.SHOW_ALL);this.node.getComponent(UITransform)!.setContentSize(540,960);
      const load=loadProto; // prototype art lives in the proto bundle
      const names=['ground','tree-left','tree-right','grass','fern','torch','rocks','cliff'];const art:Record<string,SpriteFrame>={};await Promise.all(names.map(async name=>{const f=await load<SpriteFrame>('forest/art/'+name+'/spriteFrame',SpriteFrame);f.packable=false;art[name]=f;}));
      for(const name of ['dummy','crystal']){const f=await load<SpriteFrame>('art/'+name+'/spriteFrame',SpriteFrame);f.packable=false;art[name]=f;}
      const [fox,fire,effect]=await Promise.all([load<sp.SkeletonData>(PET_SKELETON,sp.SkeletonData),load<sp.SkeletonData>('forest/fire/fire',sp.SkeletonData),load<EffectAsset>('forest/ink-light',EffectAsset)]);
      this.world=new ForestWorld(this.node.scene!,fox,fire,effect,art);this.world.pet.onStrike=()=>this.onStrike();this.world.pet.onStep=()=>this.dust();
      this.buildUI();this.world.update(0,this.brain);this.ready=true;(globalThis as any).__forest=this;
    }catch(error){this.bootError=String(error);console.error(error);this.ui.label(this.node,'营地加载失败',270,450,480,70,27,true);this.ui.label(this.node,this.bootError,270,510,500,70,15,false);}
  }
  private buildUI(){
    this.content=this.ui.node(this.node,'Forest.UI',270,480,540,960);const frame=this.ui.node(this.content,'Forest.Viewport',270,480,540,960),sprite=frame.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=this.world.frame;frame.getComponent(UITransform)!.setContentSize(540,960);
    frame.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{const loc=event.getUILocation(),p=frame.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(loc.x,loc.y,0));this.tap((p.x+270)/540,(p.y+480)/960);});
    this.overlay=this.ui.node(this.content,'Forest.Overlay',270,480,540,960);
    this.ui.rect(this.overlay,'Header.Paper',270,43,540,86,new Color(249,247,236,235),false);this.ui.label(this.overlay,'微光林地',136,32,214,41,30,true,C.ink,HorizontalTextAlignment.LEFT);this.ui.label(this.overlay,'赤焰小狐的营地',137,65,215,24,15,false,C.muted,HorizontalTextAlignment.LEFT);
    this.ui.button(this.overlay,'night','入夜',467,43,94,39,()=>this.toggleNight(),C.paper,18);
    this.ui.button(this.overlay,'battle','冒险',363,43,94,39,()=>director.loadScene('Battle'),C.red,18);
    this.ui.button(this.overlay,'zoom','＋',504,118,42,42,()=>{this.world.zoom=this.world.zoom?0:1;this.setButton('zoom',this.world.zoom?'－':'＋');},new Color(249,247,236,235),25);
    this.ui.button(this.overlay,'emotions','表情',417,118,96,38,()=>{this.emotions.active=!this.emotions.active;},new Color(249,247,236,235),17);
    this.ui.button(this.overlay,'view','视角',309,118,96,38,()=>{this.world.viewSide*=-1;},new Color(249,247,236,235),17);
    this.ui.button(this.overlay,'scarf','围巾',201,118,96,38,()=>{const name=this.world.pet.appearance.cycle();this.say('换上'+name+'围巾');},new Color(249,247,236,235),17);
    this.emotions=this.ui.node(this.overlay,'Expression.Menu',417,208,118,138);
    for(const [i,p] of [['curious','好奇','sniff'],['surprise','受惊','hit'],['joy','开心','happy']].entries())this.ui.button(this.emotions,p[0],p[1],59,21+i*45,112,39,()=>{this.emotions.active=false;this.pending='';this.brain.react(p[2] as 'hit'|'happy'|'sniff');},C.paper,18);
    this.emotions.active=false;
    this.ui.rect(this.overlay,'Footer.Paper',270,900,540,120,new Color(249,247,236,244),false);
    this.status=this.ui.label(this.overlay,'点地面移动 · 点小狐互动',270,861,495,30,17,false,C.muted);
    this.ui.button(this.overlay,'pet','摸摸',72,913,116,51,()=>this.pet(),C.red,22,'heart');
    this.ui.button(this.overlay,'train','练剑',204,913,116,51,()=>this.train(),C.paper,22,'sword');
    this.ui.button(this.overlay,'sleep','小憩',336,913,116,51,()=>this.sleep(),C.paper,22);
    this.ui.button(this.overlay,'fire','篝火',468,913,116,51,()=>this.warm(),C.paper,22);
    const opacity=this.content.addComponent(UIOpacity);opacity.opacity=0;tween(opacity).to(.7,{opacity:255}).start();
  }
  private setButton(id:string,text:string){const label=this.ui.buttons.get(id)?.getComponentsInChildren(Label)[0];if(label)label.string=text;}
  private say(text:string,duration=2){this.feedback=text;this.feedbackUntil=this.time+duration;}
  private pet(){this.pending='';this.brain.react('happy');this.petTouches++;this.say('小狐开心地摇了摇尾巴');const p=this.world.project(this.brain.position.x,this.brain.position.z,2.7);for(let i=0;i<3;i++){const n=this.ui.icon(this.overlay,'heart',p.u*540+(i-1)*27,960-p.v*960-i*13,17);const opacity=n.addComponent(UIOpacity);tween(n).by(1,{position:new Vec3((i-1)*12,56,0)}).start();tween(opacity).delay(.35).to(.65,{opacity:0}).call(()=>n.destroy()).start();}}
  private train(){this.pending='train';this.trainingHits=0;this.brain.move({x:.92,z:-.65},this.world.obstacles);this.say('小狐去训练靶前练剑',2.5);}
  private sleep(){this.pending='';if(this.brain.state==='sleep'){this.brain.move({...this.brain.position},this.world.obstacles);this.say('伸个懒腰，继续出发');}else{this.brain.sleep();this.say('小狐在草地上打起了盹',2.5);}}
  private warm(){this.pending='warm';this.brain.move({x:FIRE_POSITION.x+.86,z:FIRE_POSITION.z+.75},this.world.obstacles);this.say('去篝火旁暖暖身子');}
  private toggleNight(){this.world.nightTarget=this.world.nightTarget>.5?.05:1;this.setButton('night',this.world.nightTarget>.5?'晨光':'入夜');this.say(this.world.nightTarget>.5?'暮色降临，萤火虫亮起来了':'晨光洒进林地');}
  private tap(u:number,v:number){
    this.emotions.active=false;
    const pet=this.world.project(this.brain.position.x,this.brain.position.z,1.5);if(Math.hypot((u-pet.u)*540,(v-pet.v)*960)<70){this.pet();return;}
    const fire=this.world.project(FIRE_POSITION.x,FIRE_POSITION.z,1.1),dummy=this.world.project(1.8,-.65,.8);
    if(Math.hypot((u-fire.u)*540,(v-fire.v)*960)<38){this.warm();return;}if(Math.hypot((u-dummy.u)*540,(v-dummy.v)*960)<35){this.train();return;}
    const point=this.world.groundPoint(u,v);this.pending='';if(this.brain.move(point,this.world.obstacles)){this.world.pet.look(point.x-this.brain.position.x);this.marker(this.brain.path[this.brain.path.length-1]);}else this.say('换一处空地试试');
  }
  private marker(point:Ground){this.world.showMarker(point);}
  private onStrike(){if(!this.brain.strike(this.brain.attackId))return;if(Math.hypot(this.brain.position.x-1.8,this.brain.position.z+.65)>1.5)return;this.world.hitDummy();this.hits++;this.trainingHits++;const p=this.world.project(1.8,-.65,1),n=this.ui.node(this.overlay,'Hit.Slash',p.u*540,(1-p.v)*960,100,100),g=n.addComponent(Graphics);g.lineWidth=9;g.strokeColor=new Color(255,214,109,240);g.arc(0,0,37,-.8,1.65,false);g.stroke();g.lineWidth=1.8;g.strokeColor=C.ink;g.arc(0,0,44,-.8,1.65,false);g.stroke();const o=n.addComponent(UIOpacity);tween(o).to(.27,{opacity:0}).call(()=>n.destroy()).start();if(this.trainingHits>=5){this.pending='';this.brain.react('happy');this.say('练习完成！小狐得意地扬起了头',3);} }
  private dust(){const p=this.world.project(this.brain.position.x,this.brain.position.z,.03),n=this.ui.node(this.overlay,'Footstep.Dust',p.u*540,(1-p.v)*960,54,30),g=n.addComponent(Graphics);g.strokeColor=new Color(101,88,59,115);g.lineWidth=1.2;for(let i=0;i<3;i++){g.arc((i-1)*9,i%2*3,4+i,0,Math.PI,false);g.stroke();}const o=n.addComponent(UIOpacity);tween(n).to(.4,{scale:new Vec3(1.7,1.3,1)}).start();tween(o).to(.4,{opacity:0}).call(()=>n.destroy()).start();}
  update(dt:number){if(!this.ready)return;this.time+=Math.min(dt,.08);this.brain.step(dt);
    if(this.pending==='train'&&this.brain.state==='idle'){if(Math.hypot(this.brain.position.x-.92,this.brain.position.z+.65)<.16){this.brain.back=false;this.brain.facing=1;this.brain.attack();}}
    if(this.pending==='warm'&&this.brain.state==='idle'){this.pending='';this.brain.facing=-1;this.brain.back=false;this.brain.react('sniff');this.say('篝火暖暖的',2.5);}
    this.world.update(dt,this.brain);
    const poses:Record<string,string>={idle:'点地面移动 · 点小狐互动',start:'准备出发',walk:'轻快地穿过林地',stop:'停下脚步',turn:'转过身来',attack:'挥剑练习 · '+this.trainingHits+' / 5',hit:'抖抖身上的灰尘',happy:'今天也是开心的一天',sniff:'好奇地闻了闻',sleep:'小狐睡着了，轻轻一点就能叫醒',wake:'伸个懒腰'};
    const text=this.time<this.feedbackUntil?this.feedback:poses[this.brain.state];if(this.status.string!==text)this.status.string=text;this.setButton('sleep',this.brain.state==='sleep'?'唤醒':'小憩');
  }
  debugInfo(){return {ready:this.ready,bootError:this.bootError,state:this.brain.state,position:{...this.brain.position},velocity:{...this.brain.velocity},back:this.brain.back,facing:this.brain.facing,pending:this.pending,hits:this.hits,trainingHits:this.trainingHits,petTouches:this.petTouches,world:this.world?.debug(),spine:this.world?.pet.debug()};}
  buttonPosition(id:string){const n=this.ui.buttons.get(id);if(!n)return null;const p=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(n.worldPosition);return {x:p.x+270,y:480-p.y};}
  groundPosition(point:Ground){const p=this.world.project(point.x,point.z);return {x:p.u*540,y:(1-p.v)*960};}
}
