import {Node,Scene,Camera,Canvas,UITransform,RenderTexture,SpriteFrame,MeshRenderer,Material,EffectAsset,Vec3,Vec4,Color,geometry,utils,gfx,sp} from 'cc';
import {ForestPetView} from './ForestPetView';
import {ForestBrain,GrassSpring,FIRE_POSITION,Obstacle,Ground} from './ForestLogic';
import {terrainHeight,intersectTerrain} from './ForestTerrain';
import {SupportHeight} from './PetMotion';import {ChibiGait} from './ChibiWalk';import {FOX_RIG} from './ActiveRig';
const WORLD=1<<14,FOX=1<<15,FIRE=1<<16;
type Card={anchor:Node;board:Node;material:Material;w:number;h:number;kind:string;x:number;z:number;phase:number;shadow?:Node;shade?:number;pitch?:number};
type Grass=Card&{spring:GrassSpring};
type Spark={node:Node;phase:number;side:number};
export class ForestWorld {
  gait=new ChibiGait(FOX_RIG.targets.left.ankle.x,FOX_RIG.targets.right.ankle.x);supportHeight=new SupportHeight();private gaitPosition:Ground|null=null;feet:any;
  root:Node;camera:Camera;texture:RenderTexture;frame:SpriteFrame;pet:ForestPetView;petTexture:RenderTexture;fireSkeleton:sp.Skeleton;fireTexture:RenderTexture;fox:Card;grass:Grass[]=[];cards:Card[]=[];shadows:{node:Node;material:Material;x:number;z:number;pet:boolean}[]=[];sparks:Spark[]=[];flies:Spark[]=[];leaves:Spark[]=[];glow:Node;dummy:Card;core:Card;fireCard:Card;
  width=720;height=1280;time=0;night=.2;nightTarget=.2;wind=1;shake=0;grassEntries=0;cameraTarget={x:0,z:0};zoom=0;viewSide=1;viewAngle=.17;cameraDistance=1;private effect:EffectAsset;private art:Record<string,SpriteFrame>;private markerNode:Node;private markerMaterial:Material;private markerLife=0;
  obstacles:Obstacle[]=[{x:FIRE_POSITION.x,z:FIRE_POSITION.z,r:.35},{x:1.8,z:-.65,r:.34},{x:0,z:-5.2,r:.55},{x:-4.05,z:3.2,r:.32},{x:4.05,z:3.25,r:.32}];
  constructor(scene:Scene,foxData:sp.SkeletonData,fireData:sp.SkeletonData,effect:EffectAsset,art:Record<string,SpriteFrame>){
    this.effect=effect;this.art=art;
    const source=FOX_RIG.source,fox=this.source(scene,'Fox',FOX,source.size,source.halfHeight,source.center);this.petTexture=fox.texture;this.pet=new ForestPetView(fox.node,foxData);
    const fire=this.source(scene,'Fire',FIRE,256,128,120);this.fireTexture=fire.texture;const flame=this.node(fire.node,'Flame.NativeSpine',FIRE);flame.addComponent(UITransform).setContentSize(256,256);this.fireSkeleton=flame.addComponent(sp.Skeleton);this.fireSkeleton.setAnimationCacheMode(0);this.fireSkeleton.premultipliedAlpha=false;this.fireSkeleton.skeletonData=fireData;this.fireSkeleton.setAnimation(0,'burn',true);
    this.root=this.node(scene,'Forest.World',WORLD);const cameraNode=this.node(scene,'Forest.Camera',WORLD);this.camera=cameraNode.addComponent(Camera);this.camera.projection=Camera.ProjectionType.PERSPECTIVE;this.camera.fov=43;this.camera.near=.1;this.camera.far=80;this.camera.visibility=WORLD;this.camera.priority=-10;this.camera.clearFlags=gfx.ClearFlagBit.ALL;this.camera.clearColor=new Color(74,89,70,255);cameraNode.setPosition(2.3,9.5,11.2);cameraNode.lookAt(new Vec3(0,.4,-.6));
    this.texture=new RenderTexture();this.texture.initialize({width:this.width,height:this.height,name:'Forest.Stage'});this.camera.targetTexture=this.texture;this.frame=new SpriteFrame();this.frame.texture=this.texture;this.frame.packable=false;
    this.ground();this.terrace();this.markerNode=this.createGroundMarker();this.markerNode.active=false;
    const trees=[[-3.1,-4.7,5.1,'tree-left'],[3.2,-4.5,5.25,'tree-right'],[-4.8,-1.8,5.7,'tree-right'],[4.8,-1.6,5.7,'tree-left'],[-4.05,3.2,5.4,'tree-left'],[4.05,3.25,5.4,'tree-right']] as [number,number,number,string][];
    trees.forEach(([x,z,h,key],i)=>{const c=this.card(art[key].texture,h*.87,h,x,z,'tree');c.phase=i*1.8;this.castShadow(c,.38);});
    for(const [i,x] of [-3.5,-1.2,1.1,3.4].entries()){const c=this.card(art[i%2?'tree-left':'tree-right'].texture,4.4,4.7,x,-8.7,'tree');c.shade=.63;c.phase=i*2.7;}
    const patches=[[-2.6,-3.3],[-1.8,-2.5],[2.5,-3.2],[2.2,-2.1],[-2.7,-1],[-.7,.35],[.7,1.35],[2.6,1.5],[-2.45,1.7],[-1.8,2.9],[1.6,2.9],[-3.4,.7],[3.5,-.3],[-3.9,-3.8],[3.9,-4.1],[-2.0,3.8],[2.7,3.9]];
    patches.forEach(([x,z],i)=>{const h=i%3===0?1.08:.78,c=this.card(art[i%4===0?'fern':'grass'].texture,h*1.48,h,x,z,'grass') as Grass;c.phase=i*1.9;c.spring=new GrassSpring(x,z,.53);this.grass.push(c);});
    for(const [x,z,w] of [[-2.7,-2,1.4],[2.5,-4,1.6],[-2.5,3.8,1.3]])this.card(art.rocks.texture,w,w*.72,x,z,'rock');
    const torch=this.card(art.torch.texture,1.05,1.85,FIRE_POSITION.x,FIRE_POSITION.z,'torch');this.castShadow(torch,.25);
    this.fireCard=this.card(this.fireTexture,1.05,1.25,FIRE_POSITION.x,FIRE_POSITION.z,'fire',true,1.62);this.glow=this.glowAt(FIRE_POSITION.x,1.65,FIRE_POSITION.z,2.4,2.4,new Color(255,150,45,80),true);
    this.core=this.card(art.crystal.texture,1.35,1.65,0,-4.0,'crystal');this.castShadow(this.core,.25);this.glowAt(0,.76,-4,2.3,1.4,new Color(55,217,202,45),false);
    this.dummy=this.card(art.dummy.texture,1.1,1.65,1.8,-.65,'dummy');this.castShadow(this.dummy,.25);
    this.fox=this.card(this.petTexture,source.worldSize,source.worldSize,-.35,1.4,'fox',true,source.bottom);this.castShadow(this.fox,.45,true);this.contactAt(this.fox.anchor,.65,.3,new Color(38,39,27,110));
    for(let i=0;i<12;i++)this.sparks.push({node:this.glowAt(0,0,0,.055,.07,new Color(255,210,104,230),true),phase:i/12,side:Math.sin(i*8.17)});
    for(let i=0;i<18;i++)this.flies.push({node:this.glowAt(0,0,0,.13,.13,new Color(255,235,140,210),true),phase:i*.618,side:Math.sin(i*4.2)});
    for(let i=0;i<7;i++)this.leaves.push({node:this.leafMesh(),phase:i*.8,side:Math.sin(i*3.2)});
    this.glowAt(-1,.2,-5,9,1.2,new Color(194,215,200,20),true);this.glowAt(1,.3,2,8,1.05,new Color(194,215,200,12),true);
  }
  private node(parent:Node,name:string,layer:number){const n=new Node(name);n.layer=layer;parent.addChild(n);return n;}
  private source(scene:Scene,name:string,layer:number,size:number,ortho:number,center:number){const root=this.node(scene,name+'.Source',layer);root.addComponent(UITransform).setContentSize(size,size);const n=this.node(scene,name+'.TextureCamera',layer),c=n.addComponent(Camera);c.projection=Camera.ProjectionType.ORTHO;c.orthoHeight=ortho;c.near=.1;c.far=2000;c.node.setPosition(0,center,1000);c.visibility=layer;c.priority=name==='Fox'?-30:-20;c.clearFlags=gfx.ClearFlagBit.ALL;c.clearColor=new Color(0,0,0,0);const texture=new RenderTexture();texture.initialize({width:size,height:size,name:name+'.NativeSpineTexture'});c.targetTexture=texture;const canvas=root.addComponent(Canvas);canvas.alignCanvasWithScreen=false;canvas.cameraComponent=c;canvas.renderMode=1;return {node:root,texture};}
  private plane(w:number,h:number,columns=1,rows=1){const positions:number[]=[],uvs:number[]=[],indices:number[]=[];for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){positions.push((x/columns-.5)*w,(y/rows-.5)*h,0);uvs.push(x/columns,1-y/rows);if(x<columns&&y<rows){const i=y*(columns+1)+x;indices.push(i,i+1,i+columns+1,i+1,i+columns+2,i+columns+1);}}return utils.createMesh({positions,uvs,indices});}
  private material(texture:SpriteFrame['texture'],height:number,fromRT=false,shadow=false){const m=new Material();m.initialize({effectAsset:this.effect,technique:shadow?1:0,defines:{SAMPLE_FROM_RT:fromRT}});m.setProperty('mainTexture',texture);m.setProperty('shape',new Vec4(height,.035,0,shadow?1:0));return m;}
  private upright(board:Node,h:number,bottom=0,pitch=-12){board.setRotationFromEuler(pitch,this.camera.node.eulerAngles.y,0);const up=new Vec3(0,1,0);Vec3.transformQuat(up,up,board.rotation);board.setPosition(up.multiplyScalar(h/2+bottom));}
  card(texture:SpriteFrame['texture'],w:number,h:number,x:number,z:number,kind:string,rt=false,bottom=0):Card{const anchor=this.node(this.root,'Prop.'+kind,WORLD);anchor.setPosition(x,terrainHeight(x,z),z);const board=this.node(anchor,kind+'.Mesh',WORLD),r=board.addComponent(MeshRenderer);r.mesh=this.plane(w,h,kind==='grass'?5:3,kind==='grass'?8:5);const material=this.material(texture,h,rt);r.setMaterial(material,0);const pitch=kind==='tree'?-6:kind==='grass'?-19:-12;this.upright(board,h,bottom,pitch);const card:Card={anchor,board,material,w,h,kind,x,z,phase:this.cards.length*.9,pitch};if(kind==='fire')material.setProperty('shape',new Vec4(h,.02,1,0));this.cards.push(card);return card;}
  private ground(){const node=this.node(this.root,'Ground.Painting',WORLD),r=node.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions:[-24,0,-32,24,0,-32,-24,0,20,24,0,20],uvs:[-17/14,-21/22,31/14,-21/22,-17/14,31/22,31/14,31/22],indices:[0,2,1,1,2,3]});const m=this.material(this.art.ground.texture,1);r.setMaterial(m,0);this.cards.push({anchor:node,board:node,material:m,w:48,h:52,kind:'ground',x:0,z:0,phase:0});}
  private terrace(){
    const block=(name:string,x0:number,x1:number,z0:number,z1:number,h:number)=>{
      const top=this.node(this.root,name+'.Top',WORLD),r=top.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions:[x0,h,z0,x1,h,z0,x0,h,z1,x1,h,z1],uvs:[(x0+7)/14,(z0+11)/22,(x1+7)/14,(z0+11)/22,(x0+7)/14,(z1+11)/22,(x1+7)/14,(z1+11)/22],indices:[0,2,1,1,2,3]});const m=this.material(this.art.ground.texture,1);r.setMaterial(m,0);this.cards.push({anchor:top,board:top,material:m,w:x1-x0,h:1,kind:'terrain',x:0,z:0,phase:0,shade:.91});
      const edges=[[x0,z0,x1,z0],[x1,z0,x1,z1],[x1,z1,x0,z1],[x0,z1,x0,z0]];
      edges.forEach(([a,b,c,d],i)=>{const n=this.node(this.root,name+'.Face'+i,WORLD),r=n.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions:[a,0,b,c,0,d,a,h,b,c,h,d],uvs:[0,1,1,1,0,0,1,0],indices:[0,1,2,1,3,2]});const m=this.material(this.art.cliff.texture,1);r.setMaterial(m,0);this.cards.push({anchor:n,board:n,material:m,w:1,h:1,kind:'terrain',x:0,z:0,phase:0,shade:i===2?.93:.65});});
    };
    block('Stone.Terrace',-2.7,2.7,-5.1,-2.4,.72);
    for(let i=0;i<6;i++)block('Stone.Step'+i,-1.2,1.2,-1.2-(i+1)*.2,-1.2-i*.2,(i+1)*.12);
    for(const x of [-2.5,-2,-1.5,1.5,2,2.5])this.obstacles.push({x,z:-2.38,r:.27});
    this.obstacles[2]={x:0,z:-4,r:.65};
  }
  private castShadow(card:Card,alpha:number,pet=false){const node=this.node(this.root,'Shadow.Silhouette.'+card.kind,WORLD),r=node.addComponent(MeshRenderer);const w=card.w,h=card.h,bottom=pet?FOX_RIG.source.bottom:0;r.mesh=utils.createMesh({positions:[-w/2,.015,bottom,w/2,.015,bottom,-w/2,.015,h+bottom,w/2,.015,h+bottom],uvs:[0,1,1,1,0,0,1,0],indices:[0,1,2,1,3,2]});const m=this.material((card.board.getComponent(MeshRenderer)!.getSharedMaterial(0)!.getProperty('mainTexture') as any),h,pet,true);m.setProperty('tint',new Vec4(.11,.14,.18,alpha));r.setMaterial(m,0);node.setPosition(card.x,0,card.z);card.shadow=node;this.shadows.push({node,material:m,x:card.x,z:card.z,pet});}
  private contactAt(parent:Node,w:number,h:number,color:Color){const node=this.node(parent,'Shadow.Contact',WORLD);node.setPosition(0,.025,0);this.softMesh(node,w,h,color,false);return node;}
  private softMesh(node:Node,w:number,h:number,color:Color,vertical:boolean){const positions=[0,0,0],colors=[color.r/255,color.g/255,color.b/255,color.a/255],indices=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;positions.push(Math.cos(a)*w/2,vertical?Math.sin(a)*h/2:0,vertical?0:Math.sin(a)*h/2);colors.push(color.r/255,color.g/255,color.b/255,0);if(i<24)indices.push(0,i+1,i+2);}const r=node.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions,colors,indices});const m=new Material();m.initialize({effectName:'builtin-unlit',technique:vertical?2:1,defines:{USE_VERTEX_COLOR:true},states:{rasterizerState:{cullMode:gfx.CullMode.NONE},depthStencilState:{depthTest:true,depthWrite:false}}});r.setMaterial(m,0);if(vertical)node.setRotation(this.camera.node.rotation);}
  private glowAt(x:number,y:number,z:number,w:number,h:number,color:Color,vertical:boolean){const n=this.node(this.root,'Ambient.Glow',WORLD);n.setPosition(x,y,z);this.softMesh(n,w,h,color,vertical);return n;}
  private leafMesh(){const n=this.node(this.root,'Wind.Leaf',WORLD),r=n.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions:[-.07,0,0,0,.04,0,.07,0,0,0,-.04,0],colors:[.22,.3,.12,.8,.45,.54,.25,.8,.22,.3,.12,.8,.45,.54,.25,.8],indices:[0,1,2,0,2,3]});const m=new Material();m.initialize({effectName:'builtin-unlit',technique:1,defines:{USE_VERTEX_COLOR:true},states:{rasterizerState:{cullMode:gfx.CullMode.NONE}}});r.setMaterial(m,0);n.setRotation(this.camera.node.rotation);return n;}
  groundPoint(u:number,v:number){const ray=new geometry.Ray();this.camera.screenPointToRay(u*this.width,v*this.height,ray);const hit=intersectTerrain(ray.o,ray.d);return hit?{x:hit.x,z:hit.z}:{x:0,z:0};}
  project(x:number,z:number,height=0){const p=this.camera.worldToScreen(new Vec3(x,terrainHeight(x,z)+height,z));return {u:p.x/this.width,v:p.y/this.height};}
  hitDummy(){this.shake=.32;}
  private createGroundMarker(){
    const n=this.node(this.root,'Ground.Target',WORLD),r=n.addComponent(MeshRenderer),positions:number[]=[],indices:number[]=[];
    for(const radius of [.23,.12]){const start=positions.length/3;for(let i=0;i<=48;i++){const angle=i/48*Math.PI*2;for(const edge of [radius-.009,radius+.009])positions.push(Math.cos(angle)*edge,0,Math.sin(angle)*edge);if(i<48){const v=start+i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}}}
    r.mesh=utils.createMesh({positions,indices});this.markerMaterial=new Material();this.markerMaterial.initialize({effectName:'builtin-unlit',technique:1,states:{rasterizerState:{cullMode:gfx.CullMode.NONE},depthStencilState:{depthTest:true,depthWrite:false}}});this.markerMaterial.setProperty('mainColor',new Color(61,72,43,175));r.setMaterial(this.markerMaterial,0);return n;
  }
  showMarker(point:Ground){this.markerNode.setPosition(point.x,terrainHeight(point.x,point.z)+.045,point.z);this.markerLife=.6;this.markerNode.active=true;}
  update(dt:number,brain:ForestBrain){
    this.time+=Math.min(dt,.08);this.night+=(this.nightTarget-this.night)*Math.min(1,dt*2.5);const t=this.time,n=this.night;
    if(this.markerLife>0){this.markerLife=Math.max(0,this.markerLife-dt);this.markerNode.active=this.markerLife>0;const scale=1+(.6-this.markerLife)*.5;this.markerNode.setScale(scale,1,scale);this.markerMaterial.setProperty('mainColor',new Color(61,72,43,Math.round(175*this.markerLife/.6)));}
    this.fox.anchor.setPosition(brain.position.x,this.supportHeight.value,brain.position.z);this.fox.x=brain.position.x;this.fox.z=brain.position.z;
    this.cameraTarget.x+=(brain.position.x*(this.zoom?.85:.13)-this.cameraTarget.x)*Math.min(dt*2,1);this.cameraTarget.z+=((this.zoom?brain.position.z:-.6)-this.cameraTarget.z)*Math.min(dt*2,1);this.viewAngle+=((this.viewSide>0?.17:-.22)-this.viewAngle)*Math.min(dt*2.5,1);this.cameraDistance+=((this.zoom?.67:1)-this.cameraDistance)*Math.min(dt*3,1);const cd=this.cameraDistance;this.camera.node.setPosition(this.cameraTarget.x+Math.sin(this.viewAngle)*13*cd,.4+9.1*cd,this.cameraTarget.z+Math.cos(this.viewAngle)*13*cd);this.camera.node.lookAt(new Vec3(this.cameraTarget.x,this.zoom?1:.4,this.cameraTarget.z));
    this.camera.clearColor=new Color(Math.round(74-52*n),Math.round(89-57*n),Math.round(70-34*n),255);
    const ambient=new Vec4(1.04-.61*n,1.01-.53*n,.94-.30*n,1),fire=new Vec4(.95,.45,.10,.18+.82*n),firePosition=new Vec4(FIRE_POSITION.x,.3,FIRE_POSITION.z,2.4);
    for(const c of this.cards){c.material.setProperty('ambientColor',ambient);c.material.setProperty('fireColor',fire);c.material.setProperty('firePosition',firePosition);let bend=0,amplitude=0,opacity=1;
      if(c.kind==='grass'){const g=c as Grass;const before=g.spring.entries;bend=g.spring.step(dt,brain.position,Math.hypot(brain.velocity.x,brain.velocity.z));if(g.spring.entries>before)this.grassEntries++;amplitude=.045*this.wind;}
      else if(c.kind==='tree'){amplitude=.055*this.wind;const p=this.project(c.x,c.z),pet=this.project(brain.position.x,brain.position.z,1.4);if(c.z>brain.position.z+.4&&Math.abs(p.u-pet.u)<.17)opacity=.42;}
      const shade=c.shade??1;c.material.setProperty('motion',new Vec4(t,amplitude,c.phase,bend));c.material.setProperty('tint',new Vec4(shade,shade,shade,opacity));if(c.pitch!==undefined)c.board.setRotationFromEuler(c.pitch,this.camera.node.eulerAngles.y,0);
    }
    this.updateFeet(dt,brain);
    for(const s of this.shadows){const x=s.pet?brain.position.x:s.x,z=s.pet?brain.position.z:s.z;const dx=n>.5?x-FIRE_POSITION.x:-1.1,dz=n>.5?z-FIRE_POSITION.z:-1;const angle=Math.atan2(dx,dz)*180/Math.PI;s.node.setPosition(x,terrainHeight(x,z),z);s.node.setRotationFromEuler(0,angle,0);s.node.setScale(1,1,.3+.2*n);s.material.setProperty('tint',new Vec4(.12,.15,.20,s.pet?.28:.19));}
    let recoil=0;if(this.shake>0){this.shake-=dt;recoil=Math.sin(this.shake*65)*this.shake*45;}this.dummy.board.setRotationFromEuler(-12,this.camera.node.eulerAngles.y,recoil);
    this.core.board.setScale(1+Math.sin(t*1.7)*.012,1+Math.sin(t*1.7)*.018,1);this.glow.setScale(1+Math.sin(t*13)*.04,1+Math.sin(t*17)*.04,1);
    for(const [i,s] of this.sparks.entries()){const p=(t*.5+s.phase)%1;s.node.setPosition(FIRE_POSITION.x+s.side*.23+Math.sin(t*3+i)*p*.08,1.7+p*1.55,FIRE_POSITION.z);s.node.setScale(1-p,1-p,1);}
    for(const [i,s] of this.flies.entries()){s.node.active=n>.12;s.node.setPosition(Math.sin(s.phase*4.8)*3.4+Math.sin(t*.45+i)*.22,.4+(i%5)*.24+Math.sin(t*.8+i)*.15,Math.cos(s.phase*5.1)*3.9);const a=(.5+.5*Math.sin(t*1.6+i))*n;s.node.setScale(a,a,a);}
    for(const [i,s] of this.leaves.entries()){const p=(t*.045+s.phase)%1;s.node.setPosition(-4+p*8,1.2+Math.sin(p*5+i)*.5,-3+(i%4)*1.6+Math.sin(t*.5+i)*.25);s.node.setRotationFromEuler(this.camera.node.eulerAngles.x,this.camera.node.eulerAngles.y,t*50+i*50);}
  }
  private updateFeet(dt:number,brain:ForestBrain){
    if(!this.gaitPosition||Math.hypot(this.gaitPosition.x-brain.position.x,this.gaitPosition.z-brain.position.z)>.25){this.gait.reset(brain.distance);}this.gaitPosition={...brain.position};
    const m=this.fox.board.worldMatrix,unit=FOX_RIG.worldUnitsPerSpineUnit,sign=brain.facing,l=Math.hypot(m.m00,m.m02),right={x:m.m00/l*sign,z:m.m02/l*sign};
    const moving=['start','walk','turn'].includes(brain.state);this.feet=this.gait.update(brain.position,brain.velocity,right,brain.distance,this.pet.walkView(),moving);this.pet.update(brain,this.feet.clock);const footHeight=(side:string)=>{const f=this.feet[side];return terrainHeight(f.point.x,f.point.z);};const bodyY=this.supportHeight.update(footHeight('left'),footHeight('right'),dt);this.fox.anchor.setPosition(brain.position.x,bodyY,brain.position.z);const poseMatrix=this.fox.board.worldMatrix;
    const projected=(x:number,y:number)=>{const p=new Vec3();Vec3.transformMat4(p,new Vec3(x*unit*sign,(y-280)*unit,0),poseMatrix);return this.camera.worldToScreen(p);},o=projected(0,0),px=projected(1,0),py=projected(0,1),ax=px.x-o.x,ay=px.y-o.y,bx=py.x-o.x,by=py.y-o.y,det=ax*by-bx*ay;
    if(Math.abs(det)<1e-8)return;
    // Feet keep the native clip's motion; only the terrain height under each foot
    // (relative to the body's support height) shifts its ground bone.
    for(const side of ['left','right'] as const){const f=this.feet[side],a=this.camera.worldToScreen(new Vec3(f.point.x,terrainHeight(f.point.x,f.point.z),f.point.z)),b=this.camera.worldToScreen(new Vec3(f.point.x,bodyY,f.point.z)),dx=a.x-b.x,dy=a.y-b.y;this.pet.terrainOffset(side,(dx*by-bx*dy)/det,(ax*dy-dx*ay)/det);}
  }
  debug(){return {projection:'perspective',fov:this.camera.fov,viewSide:this.viewSide,cameraX:this.camera.node.position.x,petHeight:this.fox.anchor.position.y,terraceHeight:.72,cards:this.cards.length,grassPatches:this.grass.length,grassEntries:this.grassEntries,night:this.night,nightTarget:this.nightTarget,shadowCount:this.shadows.length,fireAnimation:'burn',fireTip:(this.fireSkeleton.findBone('tip') as any)?.rotation,wind:this.wind,zoom:this.zoom,feet:this.feet};}
}
