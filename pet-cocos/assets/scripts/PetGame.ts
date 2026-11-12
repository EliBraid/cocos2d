import {_decorator,Component,Node,UITransform,SpriteFrame,resources,sp,view,ResolutionPolicy,sys,Vec3,Color,Graphics,UIOpacity,tween} from 'cc';
import {GameModel} from './GameModel';
import {loadProto} from './ProtoAssets';
import {PetBrain,PetState,GroundPoint} from './PetBrain';
import {WorldScene,CORE_Z} from './WorldScene';
import {GameUI,Screen} from './GameUI';
import {C} from './PaperUI';
const {ccclass}=_decorator;
type Enemy={id:string;x:number;z:number;hp:number;cooldown:number;view:ReturnType<WorldScene['createEnemy']>};
@ccclass('PetGame')
export class PetGame extends Component {
  ready=false;model=new GameModel();brain=new PetBrain();world!:WorldScene;ui!:GameUI;art:Record<string,SpriteFrame>={};position:GroundPoint={x:-1.35,z:2.4};activity:'none'|'training'|'battle'='none';trainingHits=0;lastAttack=-1;lastState='';previewTime=0;time=0;spawnTimer=0;spawned=0;nextId=0;enemies:Enemy[]=[];playerHealth=1080;strikeCount=0;manualUntil=0;ambient:{node:Node;x:number;y:number;phase:number}[]=[];
  async start(){
    view.setDesignResolutionSize(540,960,ResolutionPolicy.SHOW_ALL);this.node.getComponent(UITransform)!.setContentSize(540,960);
    let saved=null;try{saved=sys.localStorage.getItem('pet-guardians-save-v2');}catch{}this.model=new GameModel(saved);
    const sf=(name:string)=>loadProto<SpriteFrame>('art/'+name+'/spriteFrame',SpriteFrame);
    const names=['camp','dummy','crates','crystal','wisp','fox-avatar'];await Promise.all(names.map(async n=>{const f=await sf(n);f.packable=false;this.art[n]=f;}));
    const data=await loadProto<sp.SkeletonData>('fox/fox',sp.SkeletonData);
    this.world=new WorldScene(this.node.scene!,data,this.art);this.world.pet.onStrike=()=>this.strike();this.world.pet.onStep=()=>this.dust();this.world.pet.onComplete=name=>{if(['attack','hit','happy'].includes(name)&&this.brain.state===name)this.brain.complete();};
    this.ui=new GameUI(this.node,this.model,this.art,this.world.frame,this.world.petFrame,{navigate:s=>this.navigate(s),enter:()=>{try{sys.localStorage.setItem('pet-camp-entered','yes');}catch{}this.navigate('home');},feed:()=>this.feed(),upgrade:()=>this.upgrade(),train:()=>this.train(),startBattle:()=>this.startBattle(),exitBattle:()=>this.finishBattle(false),pose:s=>this.pose(s),worldTap:(u,v)=>this.worldTap(u,v)});
    let entered=false;try{entered=sys.localStorage.getItem('pet-camp-entered')==='yes';}catch{}this.ui.agreed=entered;this.navigate(entered?'home':'login');
    (globalThis as any).__petGame=this;this.ready=true;
  }
  save(){try{sys.localStorage.setItem('pet-guardians-save-v2',this.model.serialize());}catch{}this.ui?.refresh();}
  navigate(screen:Screen){if(this.model.battle.active&&screen!=='battle')return;this.activity='none';this.brain.stop();this.previewTime=0;this.world.setMode(screen==='battle');this.ui.worldTexture=this.world.frame;this.world.camera.enabled=['login','home','battle'].includes(screen);this.ui.draw(screen);this.makeAmbient();}
  feed(){if(!this.model.feed()){this.ui.toast(this.model.food<=0?'食物不足':'小狐已经很满足了');return;}this.previewTime=0;this.brain.react('happy');this.ui.toast('默契 +10 · 小狐很开心');this.save();this.hearts();}
  upgrade(){if(!this.model.upgrade()){this.ui.toast(this.model.level>=20?'已达到当前培养上限':'金币不足，去训练或冒险吧');return;}this.previewTime=0;this.brain.react('happy');this.ui.toast('培养成功 · Lv.'+this.model.level);this.save();this.hearts();}
  train(){if(this.model.battle.active)return;this.activity='training';this.trainingHits=0;this.brain.stop();this.ui.toast('去训练靶前练习挥剑，完成可得20金币');}
  pose(state:PetState){if(this.model.battle.active){if(state==='hit')this.brain.react('hit');return;}this.activity='none';this.brain.stop();this.previewTime=state==='idle'?0:state==='walk'?1.65:state==='attack'?.94:state==='hit'?.45:1.1;this.world.pet.play(state,true);if(state==='happy')this.hearts();}
  worldTap(u:number,v:number){const pet=this.world.project(this.position.x,this.position.z,1.05),dummy=this.world.project(2.15,1.75,.8);if(Math.hypot((u-pet.u)*540,(v-pet.v)*this.ui.worldHeight)<57){if(this.brain.state!=='hit'){this.activity=this.model.battle.active?'battle':'none';this.brain.react('happy');this.hearts();}return;}
    if(!this.model.battle.active&&Math.hypot((u-dummy.u)*540,(v-dummy.v)*this.ui.worldHeight)<45){this.train();return;}
    const p=this.world.groundPoint(u,v);if(!this.model.battle.active)this.activity='none';else this.manualUntil=this.time+1.4;this.previewTime=0;this.brain.moveTo(p.x,p.z);this.dust(p.x,p.z);
  }
  startBattle(){if(!this.model.beginBattle()){this.ui.toast(this.model.battle.active?'正在战斗中':'体力不足，需要5点体力');return;}this.save();this.enemies.forEach(e=>{this.world.releaseEnemy(e.view);});this.enemies=[];this.spawned=0;this.spawnTimer=.25;this.position={x:-1.1,z:1.7};this.playerHealth=this.model.stats.health;this.brain.stop();this.world.setMode(true);this.ui.worldTexture=this.world.frame;this.world.camera.enabled=true;this.ui.draw('battle');this.activity='battle';this.previewTime=0;this.makeAmbient();}
  finishBattle(victory:boolean){if(!this.model.battle.active)return;const kills=this.model.battle.kills,loot=this.model.finishBattle(victory);this.enemies.forEach(e=>{this.world.releaseEnemy(e.view);});this.enemies=[];this.activity='none';this.brain.stop();this.save();this.ui.message(victory?'守护成功':'返回营地',`击退 ${kills} 只暗影怪\n获得金币 ${loot}`, '回到营地',()=>{this.position={x:-1.35,z:2.4};this.navigate('home');});}
  private spawn(){const side=this.spawned%2?1:-1,x=side*(2.6+(this.spawned%3)*.15),z=-2.3+(this.spawned%3)*.3,id='enemy-'+(++this.nextId);this.spawned++;this.enemies.push({id,x,z,hp:190+this.spawned*7,cooldown:1.2,view:this.world.createEnemy(this.art.wisp,x,z)});}
  private strike(){if(this.previewTime>0)return;if(!this.brain.strike(this.brain.attackId))return;this.strikeCount++;
    if(this.activity==='training'&&this.brain.targetId==='dummy'){this.trainingHits++;this.world.dummyShake=.28;const p=this.world.project(2.15,1.75,1);this.ui.floating(String(this.model.stats.attack),p.u,p.v);this.slash(p.u,p.v);if(this.trainingHits>=5){this.model.awardTraining();this.activity='none';this.save();this.ui.toast('训练完成 · 金币 +20');}return;}
    if(this.activity==='battle'){const e=this.enemies.find(e=>e.id===this.brain.targetId);if(!e||Math.hypot(e.x-this.position.x,e.z-this.position.z)>1.6)return;const damage=this.model.battleAttack;e.hp-=damage;const p=this.world.project(e.x,e.z,.75);this.ui.floating(String(damage),p.u,p.v);this.slash(p.u,p.v);const renderer=e.view.board.getComponent('cc.MeshRenderer') as any;renderer?.getMaterialInstance(0)?.setProperty('mainColor',new Color(255,182,140));this.scheduleOnce(()=>{if(e.view.board.isValid)renderer?.getMaterialInstance(0)?.setProperty('mainColor',Color.WHITE);},.1);
      if(e.hp<=0){this.world.releaseEnemy(e.view);this.enemies=this.enemies.filter(a=>a.id!==e.id);const oldLevel=this.model.battle.level;this.model.awardKill();this.ui.floating('+8',p.u,p.v+.06,new Color(186,126,36));if(this.model.battle.level>oldLevel)this.ui.toast('战斗等级提升 · Lv.'+this.model.battle.level);if(this.model.battle.kills>=6)this.finishBattle(true);}
    }
  }
  private slash(u:number,v:number){const n=this.ui.ui.node(this.ui.overlay,'SwordTrail',u*540,this.ui.worldTop+(1-v)*this.ui.worldHeight,110,85),g=n.addComponent(Graphics);g.lineWidth=7;g.strokeColor=new Color(255,181,78,220);g.arc(-10,2,45,-.7,1.5,false);g.stroke();g.lineWidth=2;g.strokeColor=C.ink;g.arc(-10,2,51,-.65,1.5,false);g.stroke();const o=n.addComponent(UIOpacity);tween(o).to(.23,{opacity:0}).call(()=>n.destroy()).start();}
  private dust(x=this.position.x,z=this.position.z){if(!this.ui||!['home','battle'].includes(this.ui.screen))return;const p=this.world.project(x,z,.02),n=this.ui.ui.node(this.ui.overlay,'FootDust',p.u*540,this.ui.worldTop+(1-p.v)*this.ui.worldHeight,46,20),g=n.addComponent(Graphics);g.strokeColor=new Color(96,86,65,130);g.lineWidth=1.4;g.arc(-9,1,5,0,Math.PI,false);g.arc(1,4,7,0,Math.PI,false);g.arc(12,0,5,0,Math.PI,false);g.stroke();const opacity=n.addComponent(UIOpacity);tween(n).to(.4,{scale:new Vec3(1.6,1.4,1)}).start();tween(opacity).to(.4,{opacity:0}).call(()=>n.destroy()).start();}
  private hearts(){if(this.ui.screen==='pet'){for(let i=0;i<3;i++){const n=this.ui.ui.icon(this.ui.overlay,'heart',219+i*51,271-i*16,23);const opacity=n.addComponent(UIOpacity);tween(n).by(1,{position:new Vec3((i-1)*20,70,0)}).start();tween(opacity).delay(.35).to(.65,{opacity:0}).call(()=>n.destroy()).start();}}else{const p=this.world.project(this.position.x,this.position.z,1.7);this.ui.floating('♥',p.u,p.v,C.red);}}
  private makeAmbient(){this.ambient=[];if(!['home','battle'].includes(this.ui.screen))return;for(let i=0;i<7;i++){const x=40+(i*83)%470,y=this.ui.worldTop+80+(i*61)%Math.max(100,this.ui.worldHeight-130);const n=this.ui.ui.node(this.ui.content,'WindLeaf',x,y,10,14),g=n.addComponent(Graphics);g.strokeColor=new Color(98,116,78,90);g.fillColor=new Color(174,189,139,100);g.lineWidth=1;g.moveTo(-4,-4);g.bezierCurveTo(-8,5,2,10,4,5);g.bezierCurveTo(9,-2,-1,-7,-4,-4);g.fill();g.stroke();this.ambient.push({node:n,x,y,phase:i*1.7});}}
  update(dt:number){if(!this.ready)return;this.time+=dt;this.world.update(dt);for(const p of this.ambient)if(p.node.isValid){p.node.setPosition(p.x-270+Math.sin(this.time*.7+p.phase)*8,480-p.y+Math.sin(this.time*.45+p.phase)*6);p.node.angle=Math.sin(this.time*.8+p.phase)*20;}
    if(this.previewTime>0){this.previewTime-=dt;if(this.previewTime<=0)this.world.pet.play('idle',true);this.world.movePet(this.position.x,this.position.z);return;}
    if(this.activity==='training'&&this.brain.state!=='hit'&&this.brain.state!=='attack'){if(Math.hypot(2.15-this.position.x,1.75-this.position.z)>1.13)this.brain.moveTo(1.08,1.75);else{this.brain.facing=1;this.brain.beginAttack('dummy');}}
    if(this.model.battle.active)this.updateBattle(dt);
    this.position=this.brain.step(dt,this.position);this.world.movePet(this.position.x,this.position.z);this.world.pet.face(this.brain.facing);
    const force=this.brain.state==='attack'&&this.lastAttack!==this.brain.attackId;if(force)this.lastAttack=this.brain.attackId;this.world.pet.play(this.brain.state,force);this.ui.refresh();
  }
  private updateBattle(dt:number){const b=this.model.battle;b.elapsed+=dt;this.spawnTimer-=dt;if(this.spawnTimer<=0&&this.spawned<6){this.spawn();this.spawnTimer=3.4;}
    for(const e of this.enemies){e.cooldown-=dt;const dx=-e.x,dz=CORE_Z-e.z,d=Math.hypot(dx,dz),nearPet=Math.hypot(e.x-this.position.x,e.z-this.position.z)<.7;if(d>.37&&!nearPet){const step=Math.min(d,dt*.43);e.x+=dx/d*step;e.z+=dz/d*step;}
      e.view.anchor.setPosition(e.x,Math.sin(this.time*3+e.x)*.045,e.z);e.view.shadow.setPosition(e.x,.012,e.z);
      if(e.cooldown<=0){if(nearPet){this.playerHealth-=24;this.brain.react('hit');const p=this.world.project(this.position.x,this.position.z,1);this.ui.floating('-24',p.u,p.v);e.cooldown=1.7;}else if(d<=.43){this.model.damageCore(8);e.cooldown=1.3;}}
    }
    if(b.core<=0||this.playerHealth<=0||b.elapsed>75){this.finishBattle(false);return;}
    if(this.time<this.manualUntil||['attack','hit'].includes(this.brain.state))return;const target=this.enemies.slice().sort((a,b)=>Math.hypot(a.x-this.position.x,a.z-this.position.z)-Math.hypot(b.x-this.position.x,b.z-this.position.z))[0];
    if(target){const distance=Math.hypot(target.x-this.position.x,target.z-this.position.z);if(distance<=1.13){this.brain.facing=target.x>=this.position.x?1:-1;this.brain.beginAttack(target.id);}else this.brain.moveTo(target.x,target.z);}
  }
  debugInfo(){let bone:any=null;try{const b=this.world.pet.skeleton.findBone('tail-tip');bone={rotation:b?.rotation,worldX:b?.worldX,worldY:b?.worldY};}catch{}return {ready:this.ready,screen:this.ui?.screen,state:this.brain.state,animation:this.world?.pet.state,activity:this.activity,position:this.position,coins:this.model.coins,food:this.model.food,bond:this.model.bond,level:this.model.level,battle:{...this.model.battle},strikeCount:this.strikeCount,events:this.world?.pet.events,tail:bone,renderer:'Cocos Creator 3.8.8 / native sp.Skeleton / RenderTexture + MeshRenderer'};}
  buttonPosition(id:string){const n=this.ui.ui.buttons.get(id);if(!n?.isValid)return null;const p=this.node.getComponent(UITransform)!.convertToNodeSpaceAR(n.worldPosition);return {x:p.x+270,y:480-p.y};}
}
