// Makes the painted camp itself move: canopy and cloth sway in the wind (strip warp of the painting),
// grass clumps bend, the egg wiggles, the target wobbles when hit. Pieces are cut from the same camp art,
// laid exactly over it, so at rest the picture is unchanged.
import {Node,UITransform,Sprite,SpriteFrame,Rect} from 'cc';
import {PaperUI} from './PaperUI';

type Fn=(t:number)=>void;
export class CampPaint{
 private fns:Fn[]=[];private t=0;private K:number;private layer:Node;private eggT=6;private anvilK=0;private eggK=0;private hitK=0;private gust=0;
 constructor(private ui:PaperUI,parent:Node,after:Node|null,private base:SpriteFrame){
  this.K=base.rect.width/540;
  this.layer=ui.node(parent,'PaintAnim',270,480,540,960);if(after)this.layer.setSiblingIndex(after.getSiblingIndex()+1);
  this.canopy();this.cloth(668,88,76,140,1.1,2.4,0);this.cloth(1158,268,96,140,.9,2.2,1.3);this.cloth(1098,742,156,138,1.2,2.2,2.1);
  this.grass();this.egg();this.target();this.anvil();}
 /** a piece of the painting, tex px rect -> node at the same place; anchorBottom pivots at the base of the piece */
 private cut(tx:number,ty:number,tw:number,th:number,bottom=false){
  const K=this.K,sf=this.base.clone();sf.rect=new Rect(tx,ty,tw,th);
  const n=this.ui.node(this.layer,'cut',(tx+tw/2)/K,102+(bottom?ty+th:ty+th/2)/K,tw/K,th/K);
  const sp=n.addComponent(Sprite);sp.sizeMode=Sprite.SizeMode.CUSTOM;sp.spriteFrame=sf;n.getComponent(UITransform)!.setContentSize(tw/K,th/K);
  if(bottom)n.getComponent(UITransform)!.setAnchorPoint(.5,0);
  return n;}
 private strips(tx:number,ty:number,tw:number,th:number,step:number){
  const out:{n:Node;x:number;rel:number}[]=[];
  for(let y=0;y<th;y+=step){const h=Math.min(step+1,th-y),n=this.cut(tx,ty+y,tw,h);out.push({n,x:n.position.x,rel:y/th});}
  return out;}
 // ---- wind in the canopy: every strip of the top band shears with a travelling wave
 private canopy(){
  const rows=this.strips(0,0,1254,200,4);
  this.fns.push(t=>{const g=.65+.35*Math.sin(t*.23)+this.gust;
   for(const r of rows){const w=Math.pow(1-r.rel,1.15),a=(Math.sin(t*.95+r.rel*3.2)*.7+Math.sin(t*2.1+r.rel*7)*.3)*g;r.n.setPosition(r.x+a*w*5.2,r.n.position.y,0);}});}
 // ---- cloth (flags, banners, tarps): free corner swings more
 private cloth(tx:number,ty:number,tw:number,th:number,amp:number,spd:number,ph:number){
  const rows=this.strips(tx,ty,tw,th,3);
  this.fns.push(t=>{const g=.7+.3*Math.sin(t*.4+ph)+this.gust*.5;for(const r of rows)r.n.setPosition(r.x+Math.sin(t*spd+r.rel*5+ph)*amp*r.rel*g*1.6,r.n.position.y,0);});}
 private clumps:{n:Node;x:number;y:number;k:number;dir:number;sp:number}[]=[];
 private grass(){
  const L:[number,number,number,number][]=[[185,535,85,60],[560,235,90,75],[790,300,80,70],[870,860,70,55],[1035,645,70,55],[215,1060,100,100],[320,935,70,60],[845,1130,70,55],[675,285,50,45]];
  L.forEach(([x,y,w,h],i)=>{const n=this.cut(x,y,w,h,true);const c={n,x:(x+w/2)/this.K,y:102+(y+h)/this.K,k:0,dir:1,sp:.8+((i*37)%10)/12};this.clumps.push(c);
   this.fns.push(t=>{c.k=Math.max(0,c.k-this.dt*1.7);const wind=Math.sin(t*1.6*c.sp+i*1.7)*2.4*(.6+.4*Math.sin(t*.3))+Math.sin(t*3.1+i)*.6;n.angle=wind+c.dir*Math.sin(t*20)*9*c.k*c.k;});});}
 /** something walks through the grass: clumps close to its feet shake, like a long-grass collision */
 touch(x:number,y:number,dir:number){for(const c of this.clumps)if(Math.abs(c.x-x)<26&&Math.abs(c.y-y)<18&&c.k<.35){c.k=1;c.dir=dir>=0?1:-1;}}
 private egg(){const n=this.cut(245,352,96,74,true);
  this.fns.push((t)=>{this.eggT-=this.dt;if(this.eggT<=0){this.eggT=9+Math.random()*6;this.eggK=1;}this.eggK=Math.max(0,this.eggK-this.dt*1.1);
   n.angle=Math.sin(this.t*24)*7*this.eggK*this.eggK;const s=1+Math.sin(this.t*24)*.02*this.eggK;n.setScale(1/s,s,1);});}
 private target(){const n=this.cut(985,352,140,168,true);
  this.fns.push(()=>{this.hitK=Math.max(0,this.hitK-this.dt*1.6);n.angle=Math.sin(this.t*17)*5.5*this.hitK*this.hitK;});}
 private anvil(){const n=this.cut(1050,893,175,100,true);this.fns.push(()=>{this.anvilK=Math.max(0,this.anvilK-this.dt*5);const k=this.anvilK;n.setScale(1+.04*k,1-.07*k,1);});}
 private dt=0;
 eggWiggle(){if(this.eggK<.3)this.eggK=1;}
 anvilHit(){this.anvilK=1;}
 /** a pet hit the training target */
 hitTarget(){this.hitK=1;}
 /** an extra gust, e.g. when something big happens */
 puff(){this.gust=.9;}
 update(dt:number){this.dt=dt;this.t+=dt;this.gust=Math.max(0,this.gust-dt*.5);for(const f of this.fns)f(this.t);}
}
