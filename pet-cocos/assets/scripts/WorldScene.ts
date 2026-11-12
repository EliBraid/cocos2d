import {Node,Scene,Camera,Canvas,UITransform,RenderTexture,SpriteFrame,MeshRenderer,Material,Vec3,Color,Quat,geometry,utils,primitives,gfx,sp} from 'cc';
import {PetView} from './PetView';
export const WORLD_LAYER=1<<14,SOURCE_LAYER=1<<15;
export const CORE_Z=.3;
type Art=Record<string,SpriteFrame>;
export class WorldScene {
  root:Node;source:Node;camera:Camera;texture:RenderTexture;frame:SpriteFrame;petTexture:RenderTexture;petFrame:SpriteFrame;pet:PetView;petAnchor:Node;petBoard:Node;shadow:Node;dummy:Node;crystal:Node;crates:Node;
  width=720;height=648;time=0;dummyShake=0;boards:Node[]=[];materials:Material[]=[];
  constructor(scene:Scene,data:sp.SkeletonData,art:Art){
    this.source=this.node(scene,'SpineRenderSource',SOURCE_LAYER);this.source.addComponent(UITransform).setContentSize(800,800);
    const sourceCam=this.node(scene,'SpineTextureCamera',SOURCE_LAYER).addComponent(Camera);sourceCam.projection=Camera.ProjectionType.ORTHO;sourceCam.orthoHeight=400;sourceCam.near=.1;sourceCam.far=2000;sourceCam.node.setPosition(0,400,1000);sourceCam.visibility=SOURCE_LAYER;sourceCam.clearFlags=gfx.ClearFlagBit.ALL;sourceCam.clearColor=new Color(0,0,0,0);
    this.petTexture=new RenderTexture();this.petTexture.initialize({width:800,height:800,name:'FoxSpineTexture'});sourceCam.targetTexture=this.petTexture;
    const canvas=this.source.addComponent(Canvas);canvas.alignCanvasWithScreen=false;canvas.cameraComponent=sourceCam;canvas.renderMode=1;sourceCam.priority=-20;
    this.pet=new PetView(this.source,data);
    this.petFrame=this.spriteFrame(this.petTexture);
    this.root=this.node(scene,'CampWorld',WORLD_LAYER);
    const camNode=this.node(scene,'CampWorldCamera',WORLD_LAYER);this.camera=camNode.addComponent(Camera);this.camera.projection=Camera.ProjectionType.ORTHO;this.camera.orthoHeight=4.4;this.camera.near=.1;this.camera.far=80;this.camera.priority=-10;this.camera.visibility=WORLD_LAYER;this.camera.clearFlags=gfx.ClearFlagBit.ALL;this.camera.clearColor=new Color(0,0,0,0);camNode.setPosition(0,7,9);camNode.lookAt(new Vec3(0,0,.2));
    this.texture=new RenderTexture();this.texture.initialize({width:this.width,height:this.height,name:'CampWorldTexture'});this.camera.targetTexture=this.texture;this.frame=this.spriteFrame(this.texture);
    this.petAnchor=this.node(this.root,'PetAnchor',WORLD_LAYER);this.petBoard=this.board(this.petAnchor,'PetBillboard',this.petTexture,2.65,2.65,true);this.placeUpright(this.petBoard,2.65,-.1);
    this.shadow=this.shadowAt(-1.35,2.4,.8,.4,new Color(36,38,31,68));this.petAnchor.setPosition(-1.35,0,2.4);
    this.dummy=this.board(this.root,'TrainingDummy',art.dummy.texture,1.35,1.8);this.dummy.setPosition(2.15,0,1.75);this.uprightAnchor(this.dummy,1.8);this.shadowAt(2.15,1.75,.65,.4,new Color(36,38,31,50));
    this.crystal=this.board(this.root,'CoreCrystal',art.crystal.texture,1.95,2.2);this.crystal.setPosition(0,0,CORE_Z);this.uprightAnchor(this.crystal,2.2);this.shadowAt(0,CORE_Z,1.25,.75,new Color(79,220,221,53));
    this.crates=this.board(this.root,'ForegroundCrates',art.crates.texture,1.4,1.25);this.crates.setPosition(-2.8,0,3.45);this.uprightAnchor(this.crates,1.25);this.shadowAt(-2.8,3.45,.8,.55,new Color(36,38,31,45));
  }
  private node(parent:Node,name:string,layer:number){const n=new Node(name);n.layer=layer;parent.addChild(n);return n;}
  private spriteFrame(texture:RenderTexture){const frame=new SpriteFrame();frame.texture=texture;frame.packable=false;return frame;}
  board(parent:Node,name:string,texture:SpriteFrame['texture'],w:number,h:number,fromRT=false){
    const n=this.node(parent,name,WORLD_LAYER);const renderer=n.addComponent(MeshRenderer);const quad=primitives.quad();quad.positions=quad.positions.map((v,i)=>v*(i%3===0?w:i%3===1?h:1));quad.uvs=quad.uvs!.map((v,i)=>i%2?1-v:v);quad.minPos={x:-w/2,y:-h/2,z:0};quad.maxPos={x:w/2,y:h/2,z:0};quad.boundingRadius=Math.hypot(w,h)/2;renderer.mesh=utils.createMesh(quad);
    const material=new Material();material.initialize({effectName:'builtin-unlit',technique:0,defines:{USE_TEXTURE:true,USE_ALPHA_TEST:true,SAMPLE_FROM_RT:fromRT},states:{rasterizerState:{cullMode:gfx.CullMode.NONE}}});material.setProperty('mainTexture',texture);material.setProperty('mainColor',Color.WHITE);material.setProperty('alphaThreshold',.025);renderer.setMaterial(material,0);this.materials.push(material);this.boards.push(n);return n;
  }
  private placeUpright(n:Node,height:number,bottom=0){n.setRotation(this.camera.node.rotation);const up=new Vec3(0,1,0);Vec3.transformQuat(up,up,this.camera.node.rotation);n.setPosition(up.x*(height/2+bottom),up.y*(height/2+bottom),up.z*(height/2+bottom));}
  private uprightAnchor(board:Node,height:number){const anchor=this.node(this.root,board.name+'Anchor',WORLD_LAYER);anchor.setPosition(board.position);board.setParent(anchor);this.placeUpright(board,height);}
  private shadowAt(x:number,z:number,w:number,h:number,color:Color){
    const n=this.node(this.root,'GroundContactShadow',WORLD_LAYER),positions=[0,0,0],colors=[color.r/255,color.g/255,color.b/255,color.a/255],indices=[];
    for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;positions.push(Math.cos(a)*w,0,Math.sin(a)*h);colors.push(color.r/255,color.g/255,color.b/255,0);if(i<32)indices.push(0,i+1,i+2);}
    const r=n.addComponent(MeshRenderer);r.mesh=utils.createMesh({positions,colors,indices});const mat=new Material();mat.initialize({effectName:'builtin-unlit',technique:1,defines:{USE_VERTEX_COLOR:true},states:{rasterizerState:{cullMode:gfx.CullMode.NONE}}});r.setMaterial(mat,0);this.materials.push(mat);n.setPosition(x,.012,z);return n;
  }
  groundPoint(u:number,v:number){const ray=new geometry.Ray();this.camera.screenPointToRay(u*this.width,v*this.height,ray);const t=-ray.o.y/ray.d.y;return {x:Math.max(-3.3,Math.min(3.3,ray.o.x+ray.d.x*t)),z:Math.max(-2.8,Math.min(3.3,ray.o.z+ray.d.z*t))};}
  project(x:number,z:number,height=0){const p=this.camera.worldToScreen(new Vec3(x,height,z));return {u:p.x/this.width,v:p.y/this.height};}
  movePet(x:number,z:number){this.petAnchor.setPosition(x,0,z);this.shadow.setPosition(x,.012,z);}
  setMode(battle:boolean){this.dummy.parent.active=!battle;this.crates.parent.active=!battle;this.camera.orthoHeight=battle?4.6:4.4;const height=battle?954:648;if(height!==this.height){this.height=height;this.texture.resize(this.width,this.height);this.frame.destroy();this.frame=this.spriteFrame(this.texture);}}
  createEnemy(frame:SpriteFrame,x:number,z:number){const anchor=this.node(this.root,'ShadowWisp',WORLD_LAYER);anchor.setPosition(x,0,z);const n=this.board(anchor,'EnemyBillboard',frame.texture,1.05,1.05);this.placeUpright(n,1.05,.05);return {anchor,board:n,shadow:this.shadowAt(x,z,.4,.25,new Color(36,38,31,48))};}
  releaseEnemy(enemy:ReturnType<WorldScene['createEnemy']>){
    for(const node of [enemy.board,enemy.shadow]){
      const renderer=node.getComponent(MeshRenderer)!;
      const material=renderer.getSharedMaterial(0);
      renderer.mesh?.destroy();
      if(material){this.materials=this.materials.filter(m=>m!==material);material.destroy();}
      this.boards=this.boards.filter(b=>b!==node);
    }
    enemy.anchor.destroy();enemy.shadow.destroy();
  }
  update(dt:number){this.time+=dt;const pulse=1+.018*Math.sin(this.time*2.1);this.crystal.setScale(pulse,pulse,1);if(this.dummyShake>0){this.dummyShake-=dt;this.dummy.setRotationFromEuler(this.camera.node.eulerAngles.x,this.camera.node.eulerAngles.y,Math.sin(this.dummyShake*70)*this.dummyShake*30);}else this.dummy.setRotation(this.camera.node.rotation);}
}
